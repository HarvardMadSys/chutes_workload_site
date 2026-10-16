/**
 * Numbers and dates as the page shows them, a value with one decimal kept and an axis's tick with none it does not
 * need: counts, compact counts and their ticks, durations, shares and whole percentages, and a span of days.
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

// A duration's text is in the first unit it is below the bound of: seconds under a minute, minutes under 100 minutes,
// hours under two days, else days, so a value keeps two or three figures.
const SECONDS_PER_DAY = 86400;
const DURATION_TEXT_UNITS = Object.freeze([
  Object.freeze({ below: 60, size: 1, unit: "s" }),
  Object.freeze({ below: 6000, size: 60, unit: "min" }),
  Object.freeze({ below: 2 * SECONDS_PER_DAY, size: 3600, unit: "h" }),
]);
const TWO_DECIMALS_BELOW = 0.1; // a value under a tenth of its unit keeps two decimals, so 0.04 s is not written 0 s

/** The text of a value that has none, such as an average over no requests. */
export const MISSING_TEXT = "—";

// The characters of a date's year, "YYYY".
const YEAR_LENGTH = "YYYY".length;

/** A count with thousands separators: 1186582 → "1,186,582". */
export function formatCount(count) {
  return count.toLocaleString("en-US");
}

/** A count rounded to a whole one, as a percentile of counts is written: 368.4 → "368", 5040 → "5,040". */
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
 * A duration with one decimal kept: "4.3 s" and "42.0 s" under a minute, "1.0 min" and "63.0 min" under 100 minutes,
 * "1.8 h" under two days, then "3.8 d"; a duration under a tenth of a second keeps two decimals, "0.04 s".
 */
export function formatSeconds(seconds) {
  for (const { below, size, unit } of DURATION_TEXT_UNITS) {
    if (seconds < below) {
      return `${oneDecimal(seconds / size)} ${unit}`;
    }
  }
  return `${oneDecimal(seconds / SECONDS_PER_DAY)} d`;
}

/** A share of one as a whole percentage, as an axis writes it: 0.632 → "63%", 1 → "100%". */
export function formatPercent(share) {
  return `${Math.round(share * 100)}%`;
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
