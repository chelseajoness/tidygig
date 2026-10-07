export type Role = "host" | "cleaner";

export type Profile = {
  id: string;
  role: Role;
  full_name: string;
  phone: string | null;
  bio: string | null;
  city: string | null;
  lat: number | null;
  lng: number | null;
  hourly_rate_cents: number | null;
  radius_miles: number;
};

export type NearbyCleaner = Profile & { distance_miles: number };

export type Availability = {
  weekday: number; // 0 = Sunday
  start_hour: number;
  end_hour: number;
};

export type JobStatus = "requested" | "accepted" | "declined" | "cancelled" | "completed";

export type Job = {
  id: string;
  host_id: string;
  cleaner_id: string;
  title: string;
  address: string;
  notes: string | null;
  scheduled_at: string;
  hours: number;
  price_cents: number;
  platform_fee_cents: number;
  status: JobStatus;
  payment_status: "unpaid" | "paid";
  host?: { full_name: string; phone: string | null } | null;
  cleaner?: { full_name: string; phone: string | null } | null;
};
