-- TidyGig schema. Run in the Supabase SQL editor.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('host', 'cleaner')),
  full_name text not null default '',
  phone text,
  bio text,
  city text,
  lat double precision,
  lng double precision,
  hourly_rate_cents int check (hourly_rate_cents is null or hourly_rate_cents > 0),
  radius_miles int not null default 15 check (radius_miles between 1 and 200),
  created_at timestamptz not null default now()
);

-- Kept separate so other users can never read payout account ids.
create table public.cleaner_payout_accounts (
  cleaner_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text not null,
  payouts_enabled boolean not null default false
);

create table public.availability (
  id bigint generated always as identity primary key,
  cleaner_id uuid not null references public.profiles(id) on delete cascade,
  weekday int not null check (weekday between 0 and 6),
  start_hour int not null check (start_hour between 0 and 23),
  end_hour int not null check (end_hour between 1 and 24),
  check (end_hour > start_hour),
  unique (cleaner_id, weekday)
);

create table public.jobs (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id),
  cleaner_id uuid not null references public.profiles(id),
  title text not null,
  address text not null,
  notes text,
  scheduled_at timestamptz not null,
  hours numeric(4,1) not null check (hours > 0 and hours <= 24),
  price_cents int not null default 0,
  platform_fee_cents int not null default 0,
  status text not null default 'requested'
    check (status in ('requested', 'accepted', 'declined', 'cancelled', 'completed')),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid', 'paid')),
  payment_intent_id text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);
create index jobs_host_idx on public.jobs(host_id);
create index jobs_cleaner_idx on public.jobs(cleaner_id);

-- Create a profile when a user signs up (role and name come from signup metadata).
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, role, full_name)
  values (
    new.id,
    case when new.raw_user_meta_data->>'role' = 'cleaner' then 'cleaner' else 'host' end,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Price and the 5% platform fee are computed server-side so clients cannot tamper with them.
create function public.jobs_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
declare rate int;
begin
  select hourly_rate_cents into rate from profiles where id = new.cleaner_id and role = 'cleaner';
  if rate is null then raise exception 'Cleaner has not set an hourly rate'; end if;
  if new.scheduled_at <= now() then raise exception 'Job must be scheduled in the future'; end if;
  new.price_cents := round(rate * new.hours);
  new.platform_fee_cents := round(new.price_cents * 0.05);
  new.status := 'requested';
  new.payment_status := 'unpaid';
  new.payment_intent_id := null;
  new.paid_at := null;
  return new;
end $$;
create trigger jobs_before_insert before insert on public.jobs
  for each row execute function public.jobs_before_insert();

-- Clients may only move status along allowed transitions; payment fields are service-role only.
create function public.jobs_before_update() returns trigger
language plpgsql as $$
begin
  if auth.role() = 'service_role' then return new; end if;
  if new.host_id <> old.host_id or new.cleaner_id <> old.cleaner_id
     or new.price_cents <> old.price_cents or new.platform_fee_cents <> old.platform_fee_cents
     or new.hours <> old.hours or new.scheduled_at <> old.scheduled_at
     or new.payment_status <> old.payment_status
     or new.payment_intent_id is distinct from old.payment_intent_id
     or new.paid_at is distinct from old.paid_at then
    raise exception 'Protected job fields cannot be changed';
  end if;
  if new.status <> old.status then
    if auth.uid() = old.cleaner_id and (
         (old.status = 'requested' and new.status in ('accepted', 'declined'))
      or (old.status = 'accepted' and new.status in ('completed', 'cancelled'))) then
      return new;
    end if;
    if auth.uid() = old.host_id and old.status in ('requested', 'accepted') and new.status = 'cancelled' then
      return new;
    end if;
    raise exception 'Invalid status change';
  end if;
  return new;
end $$;
create trigger jobs_before_update before update on public.jobs
  for each row execute function public.jobs_before_update();

-- Cleaners within their own service radius of (p_lat, p_lng), optionally open on a weekday.
create function public.nearby_cleaners(p_lat double precision, p_lng double precision, p_weekday int default null)
returns table (
  id uuid, role text, full_name text, phone text, bio text, city text,
  lat double precision, lng double precision, hourly_rate_cents int,
  radius_miles int, distance_miles double precision
)
language sql stable as $$
  select * from (
    select p.id, p.role, p.full_name, p.phone, p.bio, p.city, p.lat, p.lng,
           p.hourly_rate_cents, p.radius_miles,
           3958.8 * 2 * asin(sqrt(
             power(sin(radians(p.lat - p_lat) / 2), 2) +
             cos(radians(p_lat)) * cos(radians(p.lat)) * power(sin(radians(p.lng - p_lng) / 2), 2)
           )) as distance_miles
    from profiles p
    where p.role = 'cleaner' and p.lat is not null and p.lng is not null
      and p.hourly_rate_cents is not null
      and (p_weekday is null or exists (
        select 1 from availability a where a.cleaner_id = p.id and a.weekday = p_weekday))
  ) c
  where c.distance_miles <= c.radius_miles
  order by c.distance_miles;
$$;

alter table public.profiles enable row level security;
alter table public.cleaner_payout_accounts enable row level security;
alter table public.availability enable row level security;
alter table public.jobs enable row level security;

create policy "profiles readable by signed-in users" on public.profiles
  for select to authenticated using (true);
create policy "update own profile" on public.profiles
  for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create policy "own payout status" on public.cleaner_payout_accounts
  for select to authenticated using (cleaner_id = auth.uid());

create policy "availability readable" on public.availability
  for select to authenticated using (true);
create policy "manage own availability" on public.availability
  for all to authenticated using (cleaner_id = auth.uid()) with check (cleaner_id = auth.uid());

create policy "participants read jobs" on public.jobs
  for select to authenticated using (host_id = auth.uid() or cleaner_id = auth.uid());
create policy "hosts create jobs" on public.jobs
  for insert to authenticated with check (
    host_id = auth.uid() and exists (select 1 from profiles where id = auth.uid() and role = 'host'));
create policy "participants update jobs" on public.jobs
  for update to authenticated using (host_id = auth.uid() or cleaner_id = auth.uid());

-- Users must not change their own role after signup.
create function public.profiles_lock_role() returns trigger
language plpgsql as $$
begin
  if new.role <> old.role then raise exception 'Role cannot be changed'; end if;
  return new;
end $$;
create trigger profiles_lock_role before update on public.profiles
  for each row execute function public.profiles_lock_role();
