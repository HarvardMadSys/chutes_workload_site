/**
 * Numbers and dates as the page shows them, a value with one decimal kept and an axis's tick with none it does not
 * need: counts, compact counts and their ticks (a count given in thousands, or rounded to a whole one, among them),
 * durations in seconds and their ticks, minutes as hours and minutes, shares, whole percentages and values already in
 * percent, and a span of days.
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

/** A share of one as a whole percentage, as an axis writes it: 0.632 → "63%", 1 → "100%". */
export function formatPercent(share) {
  return `${Math.round(share * 100)}%`;
}

/** A time in minutes from the start of a window as hours and minutes, as an axis writes it: 832 → "13:52", 240 → "4:00". */
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

function oneDecimal(value) {
  const decimals = value > 0 && value < TWO_DECIMALS_BELOW ? 2 : 1;
  return value.toFixed(decimals);
}

function withoutTrailingZero(text) {
  return text.endsWith(".0") ? text.slice(0, -2) : text;
}
