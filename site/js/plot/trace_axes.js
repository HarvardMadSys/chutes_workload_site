/**
 * The trace's axes, as a card hands them to a chart kind: its days, day 0 being its first, and its months 1 to 13,
 * each named by the calendar month its first day falls in, the partial last month starred. A month counts from the
 * trace's first day, not the calendar's. Plain constants and one function, tested with `node --test`.
 */

import { formatTraceDay } from "../shared/format.js";

/** A card's x axis of the trace's days, day 0 being its first; a tooltip gives the day's date (`formatTraceDay`). */
export const TRACE_DAY_AXIS = Object.freeze({
  label: "Day of the trace", tipFormat: formatTraceDay,
});

/**
 * The trace's months an axis of its months 1 to 13 labels: every sixth from the first, the first, the middle and the
 * last; five month names run together on a phone, and a name says which month it is, so fewer are needed.
 */
export const TRACE_MONTH_TICKS = Object.freeze([1, 7, 13]);

/**
 * The names of the trace's months 1 to 13, in order: each is named by the calendar month its first day falls in, as
 * `trace_calendar`'s `calendar_month` labels it (`site_data/months.py`).
 */
export const TRACE_MONTH_NAMES = Object.freeze([
  "Apr '25", "May '25", "Jun '25", "Jul '25", "Aug '25", "Sep '25", "Oct '25", "Nov '25", "Dec '25", "Jan '26",
  "Feb '26", "Mar '26", "Apr '26",
]);

/** The trace month that holds only the trace's last two days, its name starred so a reader does not compare it. */
export const PARTIAL_TRACE_MONTH = 13;

// Pixels between the plot's edges and the first and last months, so that "Apr '25" clears the y axis's lowest label.
const TRACE_MONTH_INSET = 20;

/**
 * A card's x axis of the trace's months, 1 to 13, ticked by their names (`traceMonthName`), its ends inset
 * `TRACE_MONTH_INSET` pixels from the plot's.
 */
export const TRACE_MONTH_AXIS = Object.freeze({
  label: "Month", ticks: TRACE_MONTH_TICKS, tickFormat: traceMonthName, inset: TRACE_MONTH_INSET,
});

/**
 * The name of the trace month `month` (1 to 13), from `TRACE_MONTH_NAMES`, with a star for `PARTIAL_TRACE_MONTH`: 1 →
 * "Apr '25", 13 → "Apr '26*".
 */
export function traceMonthName(month) {
  const name = TRACE_MONTH_NAMES[month - 1];
  return month === PARTIAL_TRACE_MONTH ? `${name}*` : name;
}
