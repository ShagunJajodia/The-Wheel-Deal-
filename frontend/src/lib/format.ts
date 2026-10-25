const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0,
});

/** Formats an API decimal string (or number) as whole rupees, e.g. "1250000.00" -> "₹12,50,000". */
export function formatINR(value: string | number): string {
  const amount = typeof value === "number" ? value : Number(value);
  return Number.isFinite(amount) ? inr.format(amount) : String(value);
}
