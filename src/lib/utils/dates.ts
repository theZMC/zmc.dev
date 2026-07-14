/** Anything shaped like a content-collection entry with a YYYY-MM-DD date. */
interface Dated {
  data: { date: string };
}

/**
 * Parses a YYYY-MM-DD content date at local noon, so the calendar date
 * survives every timezone (midnight would render as the previous day for
 * viewers west of the build's zone).
 */
export function parsePostDate(date: string): Date {
  return new Date(date + "T12:00:00");
}

/** Formats a YYYY-MM-DD content date as e.g. "March 2026". */
export function formatPostDate(date: string): string {
  return parsePostDate(date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

/**
 * A YYYY-MM-DD content date as the ISO 8601 instant article:published_time
 * wants. Anchored at noon UTC rather than parsePostDate's local noon: this is
 * a fixed point in time, so it must not shift with the timezone of whatever
 * machine ran the build. Noon carries parsePostDate's reasoning — it reads as
 * the authored calendar date either side of UTC.
 */
export function toIsoTimestamp(date: string): string {
  return `${date}T12:00:00Z`;
}

/** Sorts date-stamped entries newest first (listings, feeds). */
export function byDateDesc(a: Dated, b: Dated): number {
  return new Date(b.data.date).getTime() - new Date(a.data.date).getTime();
}

/** Sorts date-stamped entries oldest first (prev/next chains). */
export function byDateAsc(a: Dated, b: Dated): number {
  return byDateDesc(b, a);
}
