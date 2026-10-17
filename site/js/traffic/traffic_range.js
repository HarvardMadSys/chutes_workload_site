/**
 * The Traffic Explorer's day range: its days within the trace's, the period buttons' ranges, and the slider under the
 * bars, one track with two handles, From and To, that sets it. A range is `{ from, to }`, as a choice holds it
 * (`traffic/traffic_filter.js`): the first and last chosen day, "YYYY-MM-DD", each "" for the trace's end on its side.
 * `days` are the trace's days in order, the distinct days of the daily answer by family; a handle stands on a day's
 * index in them. Each handle is a native range input, the two laid over one track, so the browser gives each its
 * dragging, its Tab stop and its arrow keys. A handle moved past the other pushes it along, so From is never after To.
 * While a handle moves, the explorer is handed the range to draw at most once an animation frame; on its release, the
 * range to keep in the URL.
 */

import { textElement } from "../shared/charts.js";

// The handles' names, read out by a screen reader, and their inputs' ids.
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

/** The handles' indices in `days` for the range of `choice`, `{ fromIndex, toIndex }`: the trace's ends for "". */
export function sliderIndices(days, choice) {
  return {
    fromIndex: choice.from === "" ? 0 : days.indexOf(choice.from),
    toIndex: choice.to === "" ? days.length - 1 : days.indexOf(choice.to),
  };
}

/**
 * The handles' indices `{ fromIndex, toIndex }` once the handle `moved` ("from" or "to") stands at its index: as they
 * are while From is at or before To, and else the other handle pushed along to the moved one's index.
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

/** The range `{ from, to }` of the handles standing at `fromIndex` and `toIndex` of `days`, "" at the trace's ends. */
export function rangeOfIndices(days, fromIndex, toIndex) {
  return {
    from: fromIndex === 0 ? "" : days[fromIndex],
    to: toIndex === days.length - 1 ? "" : days[toIndex],
  };
}

/**
 * Fill `container` with the day range's slider over the trace's `days`, standing on the range of `choice`: one track
 * holding the bar between the handles and the From and To inputs laid over each other, and under it the From day at
 * its left end and the To day at its right. Moving a handle calls `onInput(range)` with the range shown, once at the
 * next animation frame however often it moves before then; releasing it calls `onChange(range)`. Returns
 * `{ show(choice) }`, which moves the handles to the range of a choice set elsewhere, by a period button or Back and
 * Forward, calling neither.
 */
export function mountRange(container, days, choice, { onInput, onChange }) {
  const slider = {
    days,
    track: textElement("div", "range-track", ""),
    span: textElement("div", "range-span", ""),
    from: rangeHandle(FROM_NAME, FROM_ID, days),
    to: rangeHandle(TO_NAME, TO_ID, days),
    isInputPending: false, // a frame is asked for, which will hand on the range shown then
  };
  showIndices(slider, sliderIndices(days, choice));
  for (const moved of ["from", "to"]) {
    const { input } = slider[moved];
    input.addEventListener("input", () => moveHandle(slider, moved, onInput));
    input.addEventListener("change", () => onChange(shownRange(slider)));
  }
  slider.track.append(slider.span, slider.from.input, slider.to.input);
  const dayRow = textElement("div", "range-days", "");
  dayRow.append(slider.from.day, slider.to.day);
  container.replaceChildren(slider.track, dayRow);
  return { show: (shown) => showIndices(slider, sliderIndices(days, shown)) };
}

// One handle of the track over the indices of `days`, named `name` for a screen reader, and the text of the day it
// stands on: `{ input, day }`.
function rangeHandle(name, id, days) {
  const input = document.createElement("input");
  input.id = id;
  input.type = "range";
  input.setAttribute("aria-label", name);
  // The bounds come before a value is set, since a range input clamps its value to them.
  input.setAttribute("min", "0");
  input.setAttribute("max", String(days.length - 1));
  input.setAttribute("step", "1");
  return { input, day: textElement("span", "range-day", "") };
}

// The handle `moved` has moved: push the other along if passed, write both days, and hand the range on at the next
// frame.
function moveHandle(slider, moved, onInput) {
  const fromIndex = Number(slider.from.input.value);
  const toIndex = Number(slider.to.input.value);
  showIndices(slider, pushedIndices(fromIndex, toIndex, moved));
  if (slider.isInputPending) {
    return; // the frame asked for will hand on the range shown then, this move's
  }
  slider.isInputPending = true;
  requestAnimationFrame(() => {
    slider.isInputPending = false;
    onInput(shownRange(slider));
  });
}

// Stand the handles at `fromIndex` and `toIndex`, each writing its day under the track and for a screen reader, the
// bar between them spanning the two.
function showIndices(slider, { fromIndex, toIndex }) {
  const lastIndex = slider.days.length - 1;
  showIndex(slider.from, slider.days[fromIndex], fromIndex);
  showIndex(slider.to, slider.days[toIndex], toIndex);
  slider.span.style.left = `${(fromIndex / lastIndex) * 100}%`;
  slider.span.style.right = `${100 - (toIndex / lastIndex) * 100}%`;
  // The To input is drawn above the From, so that handles standing together part when dragged right. Both on the last
  // day, only From can move away, so From is drawn on top there; were To on top, it would drag From along with it.
  slider.track.classList.toggle("from-on-top", fromIndex === toIndex && toIndex === lastIndex);
}

function showIndex(handle, day, index) {
  handle.input.value = String(index);
  handle.input.setAttribute("aria-valuetext", day);
  handle.day.textContent = day;
}

// The range the handles stand on.
function shownRange(slider) {
  return rangeOfIndices(slider.days, Number(slider.from.input.value), Number(slider.to.input.value));
}
