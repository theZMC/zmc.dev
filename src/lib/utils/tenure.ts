import { toRoman } from "./roman";

/** A calendar month in a job's tenure, as stored in the resume source. */
export interface Month {
  month: number;
  year: number;
}

/** A job's tenure; an open `end` means the role is current. */
export interface Tenure {
  start: Month;
  end?: Month;
}

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

/** Orders months chronologically; an open end date sorts after everything. */
export function monthKey(m?: Month): number {
  return m ? m.year * 12 + m.month : Number.POSITIVE_INFINITY;
}

/** Formats a tenure month as e.g. "Aug 2024". */
export function shortDate(m: Month): string {
  return `${MONTHS[m.month - 1]} ${m.year}`;
}

/** Roman-numeral year span for the site's service records. */
export function romanSpan(tenure: Tenure): string {
  const end = tenure.end ? toRoman(tenure.end.year) : "Present";
  return `${toRoman(tenure.start.year)} — ${end}`;
}

/** Sorts jobs newest-first: by end date (open end first), then by start. */
export function byTenureDesc(
  a: { tenure: Tenure },
  b: { tenure: Tenure },
): number {
  return (
    monthKey(b.tenure.end) - monthKey(a.tenure.end) ||
    monthKey(b.tenure.start) - monthKey(a.tenure.start)
  );
}
