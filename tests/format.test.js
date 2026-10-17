import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  dateSpanText, formatCompactCount, formatCount, formatCountTick, formatDurationTick, formatHoursTick,
  formatMinutesTick, formatPercent, formatPercentage, formatQuantity, formatSeconds, formatSecondsTick, formatShare,
  formatSignificant, formatSignificantSeconds, formatThousandsTick, formatTraceDay, formatWholeCount,
  formatWholeCountTick, TRACE_FIRST_DAY,
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

test("an axis of cells between whole counts writes an edge rounded to a whole count", () => {
  assert.equal(formatWholeCountTick(696.658), "697");
  assert.equal(formatWholeCountTick(1286.5), "1.3k");
  assert.equal(formatWholeCountTick(101.00000000000001), "101");
});

test("an axis writes a count given in thousands as the count itself", () => {
  assert.equal(formatThousandsTick(0), "0");
  assert.equal(formatThousandsTick(10), "10k");
  assert.equal(formatThousandsTick(0.5), "500");
  assert.equal(formatThousandsTick(2000), "2M");
});

test("an axis writes minutes from a window's start as hours and minutes", () => {
  assert.equal(formatMinutesTick(832), "13:52");
  assert.equal(formatMinutesTick(240), "4:00");
  assert.equal(formatMinutesTick(1440), "24:00");
});

test("a value already in percent is written with one decimal kept", () => {
  assert.equal(formatPercentage(8.564), "8.6%");
  assert.equal(formatPercentage(100), "100.0%");
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

test("a value to two significant figures keeps the zeros it needs and no more", () => {
  assert.equal(formatSignificant(0.000471), "0.00047");
  assert.equal(formatSignificant(0.4712), "0.47");
  assert.equal(formatSignificant(12.3), "12");
  assert.equal(formatSignificant(0.5), "0.5");
  assert.equal(formatSignificant(1234), "1,200");
});

test("a duration to two significant figures is written in seconds", () => {
  assert.equal(formatSignificantSeconds(0.8374), "0.84 s");
  assert.equal(formatSignificantSeconds(4.21), "4.2 s");
  assert.equal(formatSignificantSeconds(0.00116), "0.0012 s");
  assert.equal(formatSignificantSeconds(1116.7), "1,100 s");
});

test("a duration tick is written in milliseconds, seconds, minutes or hours, the largest it reaches", () => {
  assert.equal(formatDurationTick(0.001), "1 ms");
  assert.equal(formatDurationTick(0.05), "50 ms");
  assert.equal(formatDurationTick(0.1), "0.1 s");
  assert.equal(formatDurationTick(10), "10 s");
  assert.equal(formatDurationTick(60), "1 min");
  assert.equal(formatDurationTick(900), "15 min");
  assert.equal(formatDurationTick(3600), "1 h");
});

test("minutes into a window are written as hours on an axis", () => {
  assert.equal(formatHoursTick(360), "6 h");
  assert.equal(formatHoursTick(0), "0 h");
  assert.equal(formatHoursTick(90), "1.5 h");
});

test("a trace day is written with its date, and an hour's start with its time in UTC", () => {
  assert.equal(formatTraceDay(0), "Day 0 · Apr 11, 2025");
  assert.equal(formatTraceDay(150), "Day 150 · Sep 8, 2025");
  assert.equal(formatTraceDay(305.875), "Day 305 · Feb 10, 2026, 21:00 UTC");
  assert.equal(formatTraceDay(366), "Day 366 · Apr 12, 2026");
});

test("a trace day's date does not move with the machine's time zone", (context) => {
  const zone = process.env.TZ;
  context.after(() => {
    if (zone === undefined) {
      delete process.env.TZ;
    } else {
      process.env.TZ = zone;
    }
  });
  for (const timeZone of ["Pacific/Kiritimati", "Pacific/Pago_Pago"]) {
    process.env.TZ = timeZone;
    assert.equal(formatTraceDay(150), "Day 150 · Sep 8, 2025", timeZone);
  }
});

test("the trace's first day is the shipped trace totals' first day", () => {
  const totalsFile = new URL("../site/data/all/explore/trace_totals.json", import.meta.url);
  const [totals] = JSON.parse(readFileSync(totalsFile, "utf8"));
  assert.equal(TRACE_FIRST_DAY, totals.first_day);
});
