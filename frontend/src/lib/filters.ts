export const PRICE_RANGE_ERROR = "Min price must not be higher than max price.";

/** The message to show when both prices are set and the range is empty; otherwise null. */
export function priceRangeError(min: string, max: string): string | null {
  if (min.trim() === "" || max.trim() === "") return null;
  const low = Number(min);
  const high = Number(max);
  if (Number.isNaN(low) || Number.isNaN(high)) return null;
  return low > high ? PRICE_RANGE_ERROR : null;
}
