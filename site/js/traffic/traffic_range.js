/**
 * The Traffic Explorer's day range: its days within the trace's, the period buttons' ranges, and the two sliders under
 * the bars, From and To, that set it. A range is `{ from, to }`, as a choice holds it (`traffic/traffic_filter.js`):
 * the first and last chosen day, "YYYY-MM-DD", each "" for the trace's end on its side. `days` are the trace's days in
 * order, the distinct days of the daily answer by family; a slider stands on a day's index in them.
 *
 * A slider moved past the other pushes it along, so From is never after To. While a slider moves, the explorer is
 * handed the range to draw at most once an animation frame; on its release, the range to keep in the URL.
 */

import { textElement } from "../shared/charts.js";

// The sliders' names, and the ids that tie each name to its slider.
const FROM_NAME = "From";
const TO_NAME = "To";
const FROM_ID = "traffic-range-from";
const TO_ID = "traffic-range-to";

/**
 * The period buttons, in their order: All, then the calendar quarters the trace spans, each by its label and its first
 * and last calendar day ("YYYY-MM-DD"), null for no bound. A button sets the day range to its days within the trace
 * (`periodRange`): the trace starts on April 11, 2025, so Q2 '25 holds its days from then; the trace's last twelve
 * days, April 1 to 12, 2026, begin a quarter the trace does not finish, so no button but All holds them.
 */
export const PERIODS = Object.freeze([
  Object.freeze({ label: "All", firstDay: null, lastDay: null }),
  Object.freeze({ label: "Q2 '25", firstDay: "2025-04-01", lastDay: "2025-06-30" }),
  Object.freeze({ label: "Q3 '25", firstDay: "2025-07-01", lastDay: "2025-09-30" }),
  Object.freeze({ label: "Q4 '25", firstDay: "2025-10-01", lastDay: "2025-12-31" }),
  Object.freeze({ label: "Q1 '26", firstDay: "2026-01-01", lastDay: "2026-03-31" }),
]);

/**
 * The first day of a range that a `from` of `day` gives over the trace's `days`: the first trace day at or after
 * `day`, the trace's last day for a day after it; and "" (the trace's first day) for "" and where that is the trace's
 * first day, as it is for a day before it. Days are compared as text, which for "YYYY-MM-DD" is their order in time.
 */
export function clippedFrom(day, days) {
  if (day === "") {
    return "";
  }
  // A day after the trace's last has no trace day at or after it, and is clamped to the last.
  const first = days.find((traceDay) => traceDay >= day) ?? days.at(-1);
  return first === days[0] ? "" : first;
}

/**
 * The last day of a range that a `to` of `day` gives over the trace's `days`: the last trace day at or before `day`,
 * the trace's first day for a day before it; and "" (the trace's last day) for "" and where that is the trace's last
 * day, as it is for a day after it.
 */
export function clippedTo(day, days) {
  if (day === "") {
    return "";
  }
  // A day before the trace's first has no trace day at or before it, and is clamped to the first.
  const last = days.findLast((traceDay) => traceDay <= day) ?? days[0];
  return last === days.at(-1) ? "" : last;
}

/**
 * The range `{ from, to }` that a `from` and a `to` give over the trace's `days`: each clipped (`clippedFrom`,
 * `clippedTo`), and both "", the whole trace, where the clipped `from` is after the clipped `to`.
 */
export function clippedRange(from, to, days) {
  const range = { from: clippedFrom(from, days), to: clippedTo(to, days) };
  if (range.from !== "" && range.to !== "" && range.from > range.to) {
    return { from: "", to: "" };
  }
  return range;
}

/** The range `{ from, to }` of the period `period` (one of `PERIODS`) within the trace's `days`. */
export function periodRange(period, days) {
  return {
    from: period.firstDay === null ? "" : clippedFrom(period.firstDay, days),
    to: period.lastDay === null ? "" : clippedTo(period.lastDay, days),
  };
}

/** The period of `PERIODS` whose range (`periodRange`) is the range of `choice`, or null when none's is. */
export function pressedPeriod(choice, days) {
  for (const period of PERIODS) {
    const range = periodRange(period, days);
    if (range.from === choice.from && range.to === choice.to) {
      return period;
    }
  }
  return null;
}

/** The sliders' indices in `days` for the range of `choice`, `{ fromIndex, toIndex }`: the trace's ends for "". */
export function sliderIndices(days, choice) {
  return {
    fromIndex: choice.from === "" ? 0 : days.indexOf(choice.from),
    toIndex: choice.to === "" ? days.length - 1 : days.indexOf(choice.to),
  };
}

/**
 * The sliders' indices `{ fromIndex, toIndex }` once the slider `moved` ("from" or "to") stands at its index: as they
 * are while From is at or before To, and else the other slider pushed along to the moved one's index.
 */
export function pushedIndices(fromIndex, toIndex, moved) {
  if (fromIndex <= toIndex) {
    return { fromIndex, toIndex };
  }
  if (moved === "from") {
    return { fromIndex, toIndex: fromIndex };
  }
  return { fromIndex: toIndex, toIndex };
}

/** The range `{ from, to }` of the sliders standing at `fromIndex` and `toIndex` of `days`, "" at the trace's ends. */
export function rangeOfIndices(days, fromIndex, toIndex) {
  return {
    from: fromIndex === 0 ? "" : days[fromIndex],
    to: toIndex === days.length - 1 ? "" : days[toIndex],
  };
}

/**
 * Fill `container` with the From and To sliders over the trace's `days`, standing on the range of `choice`, each
 * between its name and its day. Moving a slider calls `onInput(range)` with the range shown, once at the next animation
 * frame however often it moves before then; releasing it calls `onChange(range)`. Returns `{ show(choice) }`, which
 * moves the sliders to the range of a choice set elsewhere, by a period button or Back and Forward, calling neither.
 */
export function mountRange(container, days, choice, { onInput, onChange }) {
  const sliders = {
    days,
    from: rangeSlider(FROM_NAME, FROM_ID, days),
    to: rangeSlider(TO_NAME, TO_ID, days),
    isInputPending: false, // a frame is asked for, which will hand on the range shown then
  };
  showIndices(sliders, sliderIndices(days, choice));
  for (const moved of ["from", "to"]) {
    const { input } = sliders[moved];
    input.addEventListener("input", () => moveSlider(sliders, moved, onInput));
    input.addEventListener("change", () => onChange(shownRange(sliders)));
  }
  container.replaceChildren(sliders.from.field, sliders.to.field);
  return { show: (shown) => showIndices(sliders, sliderIndices(days, shown)) };
}

// A slider over the indices of `days`, under the name `name` that labels it, with the day it stands on beside it:
// `{ field, input, day }`, the field holding the three, the slider and the day's text.
function rangeSlider(name, id, days) {
  const label = textElement("label", "control-field-name", name);
  label.htmlFor = id;
  const input = document.createElement("input");
  input.id = id;
  input.type = "range";
  // The bounds come before a value is set, since a range input clamps its value to them.
  input.setAttribute("min", "0");
  input.setAttribute("max", String(days.length - 1));
  input.setAttribute("step", "1");
  const day = textElement("span", "range-day", "");
  const field = textElement("div", "range-field", "");
  field.append(label, input, day);
  return { field, input, day };
}

// The slider `moved` has moved: push the other along if passed, write both days, and hand the range on at the next
// frame.
function moveSlider(sliders, moved, onInput) {
  const fromIndex = Number(sliders.from.input.value);
  const toIndex = Number(sliders.to.input.value);
  showIndices(sliders, pushedIndices(fromIndex, toIndex, moved));
  if (sliders.isInputPending) {
    return; // the frame asked for will hand on the range shown then, this move's
  }
  sliders.isInputPending = true;
  requestAnimationFrame(() => {
    sliders.isInputPending = false;
    onInput(shownRange(sliders));
  });
}

// Stand the sliders at `fromIndex` and `toIndex`, each writing its day beside it and for a screen reader.
function showIndices(sliders, { fromIndex, toIndex }) {
  showIndex(sliders.from, sliders.days[fromIndex], fromIndex);
  showIndex(sliders.to, sliders.days[toIndex], toIndex);
}

function showIndex(slider, day, index) {
  slider.input.value = String(index);
  slider.input.setAttribute("aria-valuetext", day);
  slider.day.textContent = day;
}

// The range the sliders stand on.
function shownRange(sliders) {
  return rangeOfIndices(sliders.days, Number(sliders.from.input.value), Number(sliders.to.input.value));
}
