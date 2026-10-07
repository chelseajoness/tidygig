export const PLATFORM_FEE_RATE = 0.05;

export const calcFee = (priceCents: number) => Math.round(priceCents * PLATFORM_FEE_RATE);

export const money = (cents: number) => `$${(cents / 100).toFixed(2)}`;

export const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const fmtHour = (h: number) => {
  const suffix = h >= 12 && h < 24 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr} ${suffix}`;
};

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
