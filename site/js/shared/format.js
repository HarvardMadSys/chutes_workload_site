/**
 * Numbers and dates as the page shows them, a value with one decimal kept and an axis's tick with none it does not
 * need: counts, compact counts and their ticks (a count given in thousands, or rounded to a whole one, among them),
 * durations in seconds and their ticks (milliseconds to hours among them), minutes as hours and minutes or as whole
 * hours, shares, whole percentages and values already in percent, a value to two significant figures, a span of days,
 * and a day of the trace with its date.
 */

// A compact count is shown in the largest of these units it reaches.
const BILLION = 1e9;
const TRILLION = 1e12;
const COMPACT_UNITS = [
  [TRILLION, "T"],
  [BILLION, "B"],
  [1e6, "M"],
  [1e3, "k"],
];

// A count in billions or trillions under this many of its unit keeps two decimals, so it shows three figures: "2.04B".
const THREE_FIGURE_BOUND = 10;

const TWO_DECIMALS_BELOW = 0.1; // a duration under a tenth of a second keeps two decimals, so 0.04 s is not written 0 s

const MINUTES_PER_HOUR = 60; // how a time in minutes is split into hours and minutes
const MINUTES_PER_DAY = 24 * MINUTES_PER_HOUR; // how a trace day's fraction is read as a time of day
// The units a duration is converted between.
const MILLISECONDS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const SECONDS_PER_HOUR = 3600;
const MILLISECONDS_PER_MINUTE = SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

const MILLISECONDS_BELOW = 0.1; // a duration tick under a tenth of a second is written in milliseconds, "50 ms"

// A date as "Sep 8, 2025", read in UTC, as the trace's days are, so no machine's time zone moves a date.
const SHORT_DATE = Object.freeze({ month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });

/**
 * The trace's first day, its day 0, as "YYYY-MM-DD". It is `TRACE_START` of `site_data/months.py`, which dates every
 * answer; a test checks it against the shipped `trace_totals` answer's `first_day`, so the two cannot drift.
 */
export const TRACE_FIRST_DAY = "2025-04-11";

/** The text of a value that has none, such as an average over no requests. */
export const MISSING_TEXT = "—";

// The characters of a date's year, "YYYY".
const YEAR_LENGTH = "YYYY".length;

/** A count with thousands separators: 1186582 → "1,186,582". */
export function formatCount(count) {
  return count.toLocaleString("en-US");
}

/** A count rounded to a whole one, as an average count of tokens is written: 368.4 → "368", 5040 → "5,040". */
export function formatWholeCount(count) {
  return formatCount(Math.round(count));
}

/** A count and its noun, singular for one: (1, "user", "users") → "1 user"; (1186582, …) → "1,186,582 users". */
export function formatQuantity(count, singular, plural) {
  return `${formatCount(count)} ${count === 1 ? singular : plural}`;
}

/**
 * A count in T, B, M or k with one decimal kept, and three figures at least in billions and trillions: 129087 →
 * "129.1k", 1000 → "1.0k", 2036000000 → "2.04B", 35795761356238 → "35.8T"; under a thousand, the count itself.
 */
export function formatCompactCount(count) {
  for (const [size, suffix] of COMPACT_UNITS) {
    if (count >= size) {
      // Under ten billions or ten trillions, two decimals, so the count shows three figures.
      const decimals = size >= BILLION && count < THREE_FIGURE_BOUND * size ? 2 : 1;
      return `${(count / size).toFixed(decimals)}${suffix}`;
    }
  }
  return formatCount(count);
}

/** A count as an axis writes it, in T, B, M or k with one decimal at most: 129087 → "129.1k", 1000 → "1k". */
export function formatCountTick(count) {
  for (const [size, suffix] of COMPACT_UNITS) {
    if (count >= size) {
      return withoutTrailingZero((count / size).toFixed(1)) + suffix;
    }
  }
  return formatCount(count);
}

/**
 * A count as an axis writes it, rounded to a whole count first, for an axis whose cells' edges fall between whole
 * counts: 696.658 → "697", 1286.5 → "1.3k".
 */
export function formatWholeCountTick(count) {
  return formatCountTick(Math.round(count));
}

/** A count given in thousands as an axis writes it, an input-token bucket's edge: 0 → "0", 10 → "10k", 0.5 → "500". */
export function formatThousandsTick(thousands) {
  return formatCountTick(thousands * 1000);
}

/** A duration in seconds with one decimal kept, "4.3 s", "42.0 s"; under a tenth of a second, two, "0.04 s". */
export function formatSeconds(seconds) {
  return `${oneDecimal(seconds)} s`;
}

/** A duration in seconds as an axis writes it, with no decimal it does not need: 0.1 → "0.1 s", 10 → "10 s". */
export function formatSecondsTick(seconds) {
  return `${withoutTrailingZero(oneDecimal(seconds))} s`;
}

/**
 * A duration in seconds as an axis writes it, in the largest unit it reaches, with no decimal it does not need: under a
 * tenth of a second in milliseconds, 0.001 → "1 ms"; under a minute in seconds, 0.1 → "0.1 s", 10 → "10 s"; under an
 * hour in minutes, 900 → "15 min"; else in hours, 3600 → "1 h".
 */
export function formatDurationTick(seconds) {
  if (seconds < MILLISECONDS_BELOW) {
    return `${formatCount(seconds * MILLISECONDS_PER_SECOND)} ms`;
  }
  if (seconds < SECONDS_PER_MINUTE) {
    return formatSecondsTick(seconds);
  }
  if (seconds < SECONDS_PER_HOUR) {
    return `${formatCount(seconds / SECONDS_PER_MINUTE)} min`;
  }
  return `${formatCount(seconds / SECONDS_PER_HOUR)} h`;
}

/** A time in minutes from a window's start as hours, as an axis writes it: 360 → "6 h", 90 → "1.5 h". */
export function formatHoursTick(minutes) {
  return `${formatCount(minutes / MINUTES_PER_HOUR)} h`;
}

/** A value to two significant figures, with separators: 0.000471 → "0.00047", 0.4712 → "0.47", 12.3 → "12". */
export function formatSignificant(value) {
  return value.toLocaleString("en-US", { maximumSignificantDigits: 2 });
}

/** The calendar date of the whole trace day `day`, counted from `TRACE_FIRST_DAY` as day 0: 0 → "Apr 11, 2025". */
export function formatTraceDate(day) {
  return calendarDate(day * MINUTES_PER_DAY);
}

/**
 * A day of the trace, counted from `TRACE_FIRST_DAY` as day 0, with its calendar date: 150 → "Day 150 · Sep 8, 2025".
 * A day with a fraction, an hour's start, also gives its time of day in UTC, to the minute: 305.875 → "Day 305 · Feb
 * 10, 2026, 21:00 UTC".
 */
export function formatTraceDay(day) {
  const minutes = Math.round(day * MINUTES_PER_DAY);
  const wholeDay = Math.floor(minutes / MINUTES_PER_DAY);
  const minuteOfDay = minutes - wholeDay * MINUTES_PER_DAY;
  const dateText = calendarDate(minutes);
  if (minuteOfDay === 0) {
    return `Day ${wholeDay} · ${dateText}`;
  }
  return `Day ${wholeDay} · ${dateText}, ${formatMinutesTick(minuteOfDay)} UTC`;
}

/** A share of one as a whole percentage, as an axis writes it: 0.632 → "63%", 1 → "100%". */
export function formatPercent(share) {
  return `${Math.round(share * 100)}%`;
}

/** A time in minutes from a window's start as hours and minutes, as an axis writes it: 832 → "13:52", 240 → "4:00". */
export function formatMinutesTick(minutes) {
  const wholeMinutes = Math.round(minutes);
  const hours = Math.floor(wholeMinutes / MINUTES_PER_HOUR);
  const minutesPastHour = String(wholeMinutes % MINUTES_PER_HOUR).padStart(2, "0");
  return `${hours}:${minutesPastHour}`;
}

/** A value already in percent with one decimal kept: 8.564 → "8.6%", 100 → "100.0%". */
export function formatPercentage(percent) {
  return `${percent.toFixed(1)}%`;
}

/** A share of one as a percentage with one decimal kept: 0.632 → "63.2%", 0.94 → "94.0%", 1 → "100.0%". */
export function formatShare(share) {
  return `${(share * 100).toFixed(1)}%`;
}

/**
 * The days from `firstDay` to `lastDay` ("YYYY-MM-DD"), the year written once when both share it: "May 17 – September
 * 5, 2026", "December 28, 2025 – January 3, 2026".
 */
export function dateSpanText(firstDay, lastDay) {
  const sameYear = firstDay.slice(0, YEAR_LENGTH) === lastDay.slice(0, YEAR_LENGTH);
  return `${longDate(firstDay, !sameYear)} – ${longDate(lastDay, true)}`;
}

// A day as "September 5, 2026", or "September 5" without its year.
function longDate(day, withYear) {
  const date = new Date(`${day}T00:00:00Z`);
  const parts = { month: "long", day: "numeric", timeZone: "UTC" };
  return date.toLocaleDateString("en-US", withYear ? { ...parts, year: "numeric" } : parts);
}

// The calendar date, as "Sep 8, 2025", of the moment `minutes` minutes after the start of `TRACE_FIRST_DAY`.
function calendarDate(minutes) {
  const date = new Date(Date.parse(`${TRACE_FIRST_DAY}T00:00:00Z`) + minutes * MILLISECONDS_PER_MINUTE);
  return date.toLocaleDateString("en-US", SHORT_DATE);
}

function oneDecimal(value) {
  const decimals = value > 0 && value < TWO_DECIMALS_BELOW ? 2 : 1;
  return value.toFixed(decimals);
}

function withoutTrailingZero(text) {
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}
