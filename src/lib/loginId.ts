// The admin, lecturer and student schemas all store `id` as a Number, so a
// non-numeric value coming off the login form (a typo like "12a45") makes
// Mongoose throw a CastError. That surfaced to the user as a 500 and
// "Something went wrong on our end" instead of a plain wrong-credentials
// message. Normalise the value here: anything that isn't a plain positive
// integer is simply an id that cannot exist, and callers report it the same
// way they report an id that wasn't found.
export function parseLoginId(value: unknown): number | null {
  if (typeof value === 'number') {
    return Number.isSafeInteger(value) && value >= 0 ? value : null;
  }
  if (typeof value !== 'string') return null;

  const trimmed = value.trim();
  // Digits only — this still accepts leading zeros ("0123456"), which users do
  // type for ids that are printed with them.
  if (!/^\d+$/.test(trimmed)) return null;

  const parsed = Number(trimmed);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
