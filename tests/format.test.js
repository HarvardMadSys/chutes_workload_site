import assert from "node:assert/strict";
import { test } from "node:test";

import {
  formatCount, formatDurationTick, formatMultiple, formatOptionalShare, formatQuantity, formatSeconds, formatShare,
  monthName, formatBinaryThousands, formatCompactCount, formatPercent, monthAndDay, dateSpanText, formatCountTick,
  formatMultipleTick, shortMonth, formatWholeCount,
} from "../site/js/shared/format.js";

test("a count gets thousands separators", () => {
  assert.equal(formatCount(1186582), "1,186,582");
});

test("a duration keeps one decimal, in seconds only under a minute", () => {
  assert.equal(formatSeconds(4.25), "4.3 s");
  assert.equal(formatSeconds(42), "42.0 s");
  assert.equal(formatSeconds(61), "1.0 min");
  assert.equal(formatSeconds(724), "12.1 min");
  assert.equal(formatSeconds(3780), "63.0 min");
  assert.equal(formatSeconds(6480), "1.8 h");
  assert.equal(formatSeconds(328000), "3.8 d");
  assert.equal(formatSeconds(0.04), "0.04 s");
  assert.equal(formatSeconds(0), "0.0 s");
});

test("a duration tick is in the largest unit it reaches, to one decimal at most", () => {
  assert.equal(formatDurationTick(0), "0 s");
  assert.equal(formatDurationTick(0.1), "0.1 s");
  assert.equal(formatDurationTick(50), "50 s");
  assert.equal(formatDurationTick(60), "1 min");
  assert.equal(formatDurationTick(80), "1.3 min");
  assert.equal(formatDurationTick(90), "1.5 min");
  assert.equal(formatDurationTick(120), "2 min");
  assert.equal(formatDurationTick(3600), "1 h");
  assert.equal(formatDurationTick(86400), "1 d");
  assert.equal(formatDurationTick(604800), "7 d");
});

test("a multiple has a times sign and the decimals asked for, or is written as it is", () => {
  assert.equal(formatMultiple(1.3757185, 2), "1.38×");
  assert.equal(formatMultiple(3.1066, 1), "3.1×");
  assert.equal(formatMultiple(1, 2), "1.00×");
  assert.equal(formatMultiple(2), "2×");
  assert.equal(formatMultiple(0.4), "0.4×");
});

test("a share is a percentage with one decimal kept", () => {
  assert.equal(formatShare(0.632), "63.2%");
  assert.equal(formatShare(0.94), "94.0%");
  assert.equal(formatShare(1), "100.0%");
});

test("a percentile of counts is written as a whole count", () => {
  assert.equal(formatWholeCount(368.4), "368");
  assert.equal(formatWholeCount(5040), "5,040");
});

test("an optional share is a percentage, or a dash when it is missing", () => {
  assert.equal(formatOptionalShare(0.632), "63.2%");
  assert.equal(formatOptionalShare(0), "0.0%");
  assert.equal(formatOptionalShare(null), "—");
});

test("a quantity names its noun, singular for exactly one", () => {
  assert.equal(formatQuantity(1, "user", "users"), "1 user");
  assert.equal(formatQuantity(0, "user", "users"), "0 users");
  assert.equal(formatQuantity(5040, "request", "requests"), "5,040 requests");
});

test("a month is written as its name and year", () => {
  assert.equal(monthName("2026-07"), "July 2026");
});

test("a compact count is in its largest unit, lower-case k, one decimal kept", () => {
  assert.equal(formatCompactCount(300000), "300.0k");
  assert.equal(formatCompactCount(1000), "1.0k");
  assert.equal(formatCompactCount(1_800_000), "1.8M");
  assert.equal(formatCompactCount(129087), "129.1k");
  assert.equal(formatCompactCount(2_000_000_000), "2.00B");
  assert.equal(formatCompactCount(2_036_000_000), "2.04B");
  assert.equal(formatCompactCount(209_000_000_000), "209.0B");
  assert.equal(formatCompactCount(2_522_394_591_477), "2.52T");
  assert.equal(formatCompactCount(35_795_761_356_238), "35.8T");
  assert.equal(formatCompactCount(250), "250");
});

test("a count on an axis has no decimal it does not need", () => {
  assert.equal(formatCountTick(300000), "300k");
  assert.equal(formatCountTick(1500), "1.5k");
  assert.equal(formatCountTick(4_000_000_000_000), "4T");
  assert.equal(formatCountTick(250), "250");
});

test("a power-of-two token count is written in units of 1,024", () => {
  assert.equal(formatBinaryThousands(4096), "4k");
  assert.equal(formatBinaryThousands(262144), "256k");
  assert.equal(formatBinaryThousands(512), "512");
});

test("an axis's percentage has no decimals", () => {
  assert.equal(formatPercent(1), "100%");
  assert.equal(formatPercent(0), "0%");
  assert.equal(formatPercent(0.632), "63%");
});

test("a multiple on an axis is written as it is, whatever else Plot passes", () => {
  assert.equal(formatMultipleTick(2, 3), "2×");
  assert.equal(formatMultipleTick(0.5), "0.5×");
});

test("a date is written as its short month and day, or its month alone", () => {
  assert.equal(monthAndDay("2026-08-09"), "Aug 9");
  assert.equal(shortMonth("2026-05-17"), "May");
});

test("a span of days names the year once when both share it", () => {
  assert.equal(dateSpanText("2026-05-17", "2026-09-05"), "May 17 – September 5, 2026");
  assert.equal(dateSpanText("2025-12-28", "2026-01-03"), "December 28, 2025 – January 3, 2026");
});
