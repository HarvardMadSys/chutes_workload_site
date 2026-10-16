import assert from "node:assert/strict";
import { test } from "node:test";

import {
  dateSpanText, formatCompactCount, formatCount, formatCountTick, formatPercent, formatQuantity, formatSeconds,
  formatSecondsTick, formatShare, formatWholeCount,
} from "../site/js/shared/format.js";

test("a count gets thousands separators", () => {
  assert.equal(formatCount(1186582), "1,186,582");
});

test("a duration is written in seconds with one decimal kept, two under a tenth of a second", () => {
  assert.equal(formatSeconds(4.25), "4.3 s");
  assert.equal(formatSeconds(42), "42.0 s");
  assert.equal(formatSeconds(0.04), "0.04 s");
  assert.equal(formatSeconds(0), "0.0 s");
});

test("an axis writes a duration in seconds without a decimal it does not need", () => {
  assert.equal(formatSecondsTick(0.1), "0.1 s");
  assert.equal(formatSecondsTick(1), "1 s");
  assert.equal(formatSecondsTick(100), "100 s");
  assert.equal(formatSecondsTick(2.5), "2.5 s");
  assert.equal(formatSecondsTick(0.05), "0.05 s");
});

test("a share is a percentage with one decimal kept", () => {
  assert.equal(formatShare(0.632), "63.2%");
  assert.equal(formatShare(0.94), "94.0%");
  assert.equal(formatShare(1), "100.0%");
});

test("an average count is written as a whole count", () => {
  assert.equal(formatWholeCount(368.4), "368");
  assert.equal(formatWholeCount(5040), "5,040");
});

test("a quantity names its noun, singular for exactly one", () => {
  assert.equal(formatQuantity(1, "user", "users"), "1 user");
  assert.equal(formatQuantity(0, "user", "users"), "0 users");
  assert.equal(formatQuantity(5040, "request", "requests"), "5,040 requests");
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

test("an axis's percentage has no decimals", () => {
  assert.equal(formatPercent(1), "100%");
  assert.equal(formatPercent(0), "0%");
  assert.equal(formatPercent(0.632), "63%");
});

test("a span of days names the year once when both share it", () => {
  assert.equal(dateSpanText("2026-05-17", "2026-09-05"), "May 17 – September 5, 2026");
  assert.equal(dateSpanText("2025-12-28", "2026-01-03"), "December 28, 2025 – January 3, 2026");
});
