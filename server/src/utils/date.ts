/** Date helpers. All "daily" logic is UTC so it does not drift per user. */

/** Returns the current UTC calendar day as YYYY-MM-DD. */
export const utcDateKey = (date: Date = new Date()): string => {
  const iso = date.toISOString();
  return iso.slice(0, 10);
};

export const toIso = (value: Date | null | undefined): string | null =>
  value ? value.toISOString() : null;
