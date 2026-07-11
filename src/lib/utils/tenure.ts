/** A calendar month in a job's tenure, as stored in the jobs collection. */
export interface Month {
  month: number;
  year: number;
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
