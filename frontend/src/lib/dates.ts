/** Normalize a Date to noon UTC of the same local date.
 *  This prevents timezone-related date shifts when storing due dates. */
export function toNoonUTC(date: Date): string {
  return new Date(
    Date.UTC(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0),
  ).toISOString();
}
