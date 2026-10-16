/**
 * Numbers and names as every page shows them, a value with one decimal kept and an axis's tick with none it does not
 * need: counts, compact counts and their ticks, power-of-two bins of tokens, durations and duration ticks, shares and
 * whole percentages, multiples, a day's month and day, a month's name and a span of days.
 */

// A compact count is shown in the largest of these units it reaches.
const BILLION = 1e9;
const SMALL_BILLIONS = 10 * BILLION; // under ten billion, a count keeps two decimals, so it shows three figures
const COMPACT_UNITS = [
  [BILLION, "B"],
  [1e6, "M"],
  [1e3, "k"],
];

// A duration's text is in the first unit it is below the bound of: seconds under a minute, minutes under 100 minutes,
// hours under two days, else days, so a value keeps two or three figures.
const SECONDS_PER_DAY = 86400;
const DURATION_TEXT_UNITS = Object.freeze([
  Object.freeze({ below: 60, size: 1, unit: "s" }),
  Object.freeze({ below: 6000, size: 60, unit: "min" }),
  Object.freeze({ below: 2 * SECONDS_PER_DAY, size: 3600, unit: "h" }),
]);
const TWO_DECIMALS_BELOW = 0.1; // a value under a tenth of its unit keeps two decimals, so 0.04 s is not written 0 s

// A duration tick is written in the largest of these units it reaches, else in seconds.
const DURATION_TICK_UNITS = [
  [86400, "d"],
  [3600, "h"],
  [60, "min"],
];

// A power-of-two bin of tokens is named in these, as 4k or 256k.
const TOKENS_PER_BINARY_THOUSAND = 1024;

/** A multiple in a tooltip or a callout, with two decimals: 0.65×. */
export const MULTIPLE_DECIMALS = 2;

/** The text of a value that has none, such as a share of nothing or a median over no rows. */
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
 * A count in B, M or k with one decimal kept, and three figures at least in billions: 129087 → "129.1k", 1000 →
 * "1.0k", 2036000000 → "2.04B"; under a thousand, the count itself.
 */
export function formatCompactCount(count) {
  for (const [size, suffix] of COMPACT_UNITS) {
    if (count >= size) {
      const decimals = size === BILLION && count < SMALL_BILLIONS ? 2 : 1;
      return `${(count / size).toFixed(decimals)}${suffix}`;
    }
  }
  return formatCount(count);
}

/** A count as an axis writes it, in B, M or k with one decimal at most: 129087 → "129.1k", 1000 → "1k". */
export function formatCountTick(count) {
  for (const [size, suffix] of COMPACT_UNITS) {
    if (count >= size) {
      return withoutTrailingZero((count / size).toFixed(1)) + suffix;
    }
  }
  return formatCount(count);
}

/** A power-of-two count of tokens as such bins are named: 4096 → "4k", 262144 → "256k"; under 1,024, the count. */
export function formatBinaryThousands(tokens) {
  return tokens < TOKENS_PER_BINARY_THOUSAND ? formatCount(tokens) : `${tokens / TOKENS_PER_BINARY_THOUSAND}k`;
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

/** A duration as an axis writes it: "30 s" under a minute, then "2 min", "1.3 min", "1 h" or "7 d", one decimal at most. */
export function formatDurationTick(seconds) {
  for (const [size, unit] of DURATION_TICK_UNITS) {
    if (seconds >= size) {
      return `${Number((seconds / size).toFixed(1))} ${unit}`;
    }
  }
  return `${seconds} s`;
}

/** A share of one as a whole percentage, as an axis writes it: 0.632 → "63%", 1 → "100%". */
export function formatPercent(share) {
  return `${Math.round(share * 100)}%`;
}

/** A share of one as a percentage with one decimal kept: 0.632 → "63.2%", 0.94 → "94.0%", 1 → "100.0%". */
export function formatShare(share) {
  return `${(share * 100).toFixed(1)}%`;
}

/** A multiple and a times sign, with `decimals` decimals when given, else as it is: (1.3757, 2) → "1.38×"; 2 → "2×". */
export function formatMultiple(multiple, decimals) {
  const digits = decimals === undefined ? String(multiple) : multiple.toFixed(decimals);
  return `${digits}×`;
}

/** A multiple as an axis writes it, as it is: "2×"; Plot also passes a tick's index, which is no number of decimals. */
export function formatMultipleTick(multiple) {
  return formatMultiple(multiple);
}

/** A share as `formatShare` writes it, or "—" for a missing share (null), such as a share of nothing. */
export function formatOptionalShare(share) {
  return share === null ? MISSING_TEXT : formatShare(share);
}

/** A day as its month and day, as an axis writes it: "2026-08-09" → "Aug 9". */
export function monthAndDay(date) {
  const day = new Date(`${date}T00:00:00Z`);
  return day.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

/** The month of a date, short, as an axis writes it: "2026-08-09" → "Aug". */
export function shortMonth(date) {
  const day = new Date(`${date}T00:00:00Z`);
  return day.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
}

/** A month as its name and year: "2026-05" → "May 2026". */
export function monthName(month) {
  const firstDay = new Date(`${month}-01T00:00:00Z`);
  return firstDay.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
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
