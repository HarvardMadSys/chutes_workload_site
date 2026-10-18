import assert from "node:assert/strict";
import { test } from "node:test";

import { runTraffic } from "../site/js/traffic/traffic.js";
import { controlsOf, deferred, FakeElement, fetchedAnswer, PAGE_ADDRESS, runFrames, settled } from "./fake_page.js";

// The answer files the explorer reads: every family's rows, and the family Kin's by model.
const FAMILY_FILE = "data/all/explore/daily_by_family.json";
const KIN_FILE = "data/all/explore/daily_by_model/kin.json";

// A row of an answer of the explorer on 2025-07-01, its counts zero but its requests.
function dayRow(fields) {
  return {
    day: "2025-07-01", endpoint_group: "chat", requests: 10, input_tokens: null, input_counted: 0,
    output_tokens: null, output_counted: 0, ttft_sum: null, ttft_counted: 0, ...fields,
  };
}

// One family, Kin, on one day of 2025's third quarter; and its one named model.
const FAMILY_ROWS = [dayRow({ family: "Kin", family_slug: "kin" })];
const KIN_ROWS = [dayRow({ chute_id: "id-a", model: "A" })];

// A stand-in element of the tag `tag`. A `details` one, the figure's Definition control, finds a new element for any
// selector: the control looks its text up in the markup it was written with, which the fake page does not read.
function fakeElement(tag) {
  const element = new FakeElement(tag);
  if (tag === "details") {
    element.querySelector = () => new FakeElement();
  }
  return element;
}

/**
 * Run the explorer into a new container for the test of `context`, opened at `query`, each file of `answers` (a map
 * from file to its promised rows) fetched as its rows, any other answering 404; errors are not logged. Returns `{
 * container, running, replaced, frames, reads, returns }`: the container, the explorer's promise, the queries written
 * to the URL, the animation frames not yet run, the files read, each `[file, bars]` with what the bars' body held then
 * (`barsState`), and the functions given to `onReturn`, which Back and Forward call; each list in order.
 */
function runExplorer(context, query, answers) {
  const page = { container: new FakeElement("div"), replaced: [], frames: [], reads: [], returns: [] };
  globalThis.document = { createElement: fakeElement };
  globalThis.window = { location: new URL(`${PAGE_ADDRESS}${query}`) };
  globalThis.requestAnimationFrame = (callback) => page.frames.push(callback);
  context.after(() => {
    delete globalThis.document;
    delete globalThis.window;
    delete globalThis.requestAnimationFrame;
  });
  context.mock.method(console, "error", () => undefined);
  context.mock.method(globalThis, "fetch", async (file) => {
    page.reads.push([file, barsState(page.container)]);
    return fetchedAnswer(await answers[file]);
  });
  const explorerContext = {
    orders: { endpoints: Promise.resolve([{ endpoint_group: "chat", requests: 10 }]) },
    replaceQuery: (params) => page.replaced.push(params.toString()),
    onReturn: (redraw) => page.returns.push(redraw),
  };
  return { ...page, running: runTraffic(page.container, explorerContext) };
}

// What the bars' body in the explorer's `container` holds: the class of its paragraph, "note" once bars of no
// request are drawn, or "none" before the bars' figure is placed or while its body is empty.
function barsState(container) {
  return container.querySelector(".traffic-bars .figure-body p")?.className ?? "none";
}

// Choose the family `slug` in the family drop-down of the explorer in `container`, as a visitor does; return it.
function chooseFamily(container, slug) {
  const family = controlsOf(container.querySelector(".traffic-controls")).family;
  family.value = slug;
  family.dispatch("change");
  return family;
}

test("the explorer loads until the URL's family is read; one that cannot be shows its error in the bars and the charts",
  async (context) => {
    const kin = deferred();
    const page = runExplorer(context, "?family=kin", { [FAMILY_FILE]: FAMILY_ROWS, [KIN_FILE]: kin.promise });
    await settled();
    assert.deepEqual(page.container.children.map((child) => child.className), ["loading"]);
    kin.reject(new Error("Could not fetch kin"));
    await page.running;
    const controls = page.container.querySelector(".traffic-controls");
    assert.equal(controlsOf(controls).family.value, "", "the controls show the choice without the family");
    const barsNote = page.container.querySelector(".traffic-bars p");
    assert.deepEqual([barsNote.className, barsNote.textContent], ["note is-error", "Could not fetch kin"]);
    assert.deepEqual(chartStates(page.container), ERROR_STATES, "no chart loads for ever");
    assert.deepEqual(tileNotes(explorerParts(page.container).tiles), [], "no tile, so no percentile, loads for ever");
  });

test("the card holds, in order, the tiles, the bars, the day range and the row of three charts", async (context) => {
  const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS, [HISTOGRAMS_FILE]: [] });
  await page.running;
  const parts = page.container.querySelector(".traffic-card").children.map((child) => child.className);
  assert.deepEqual(parts, ["traffic-tiles", "traffic-bars", "traffic-range", "traffic-distributions"]);
});

test("choosing a family not read before shows the chart loading until its answer arrives", async (context) => {
  const kin = deferred();
  // No row is of the endpoint group chosen, so the bars, which node cannot draw without Plot, are a note.
  const page = runExplorer(context, "?endpoint=completion", { [FAMILY_FILE]: FAMILY_ROWS, [KIN_FILE]: kin.promise });
  await page.running;
  const figure = page.container.querySelector(".traffic-bars");
  chooseFamily(page.container, "kin");
  await settled();
  assert.deepEqual(figure.children.map((child) => child.className), ["loading"]);
  kin.resolve(KIN_ROWS);
  await settled();
  assert.deepEqual(figure.children.map((child) => child.className), ["figure"]);
});

// Kin's requests on three days, the last of the endpoint group completion.
const THREE_DAY_ROWS = [
  dayRow({ day: "2025-06-30", family: "Kin", family_slug: "kin", requests: 10 }),
  dayRow({ day: "2025-07-01", family: "Kin", family_slug: "kin", requests: 20 }),
  dayRow({ day: "2025-07-02", family: "Kin", family_slug: "kin", endpoint_group: "completion", requests: 5 }),
];

// The explorer's parts in the fake page: `{ tiles, chartPlaces, handles, rangeDays, periodButtons }`, the tiles'
// list, the places of the input tokens, output tokens and TTFT charts, the day range's From and To inputs, the From
// and To days under the track's ends, and the period buttons.
function explorerParts(container) {
  return {
    tiles: container.querySelector(".traffic-tiles"),
    chartPlaces: container.querySelectorAll(".traffic-distributions .distribution-chart .figure-body"),
    handles: container.querySelectorAll(".range-track input"),
    rangeDays: container.querySelectorAll(".range-days .range-day"),
    periodButtons: container.querySelectorAll(".period-button"),
  };
}

// The value of each tile, in order: the requests', the average input tokens', output tokens' and TTFT's.
function tileValues(tiles) {
  return tiles.querySelectorAll("strong").map((value) => value.textContent);
}

// Opened on the completions of the trace's first two days, which hold none, the bars are a note node can draw.
const NO_COMPLETION_QUERY = "?endpoint=completion&to=2025-07-01";

test("the handles sit under the bars on the URL's range and draw the tiles as they move, writing it once released",
  async (context) => {
    const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS });
    await page.running;
    const { tiles, handles, rangeDays } = explorerParts(page.container);
    const [, toHandle] = handles;
    const [, toDay] = rangeDays;
    assert.deepEqual([tileValues(tiles)[0], toHandle.value, toDay.textContent], ["0", "1", "2025-07-01"]);
    toHandle.value = "2";
    toHandle.dispatch("input");
    runFrames(page.frames);
    await settled();
    assert.equal(tileValues(tiles)[0], "5");
    assert.deepEqual(page.replaced, [], "a handle moving does not write the URL");
    toHandle.dispatch("change");
    assert.deepEqual(page.replaced, ["endpoint=completion"]);
  });

test("a period button stands the handles on its days and draws them", async (context) => {
  const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS });
  await page.running;
  const { tiles, handles, periodButtons } = explorerParts(page.container);
  const pressed = () => periodButtons.map((button) => button.getAttribute("aria-pressed"));
  assert.deepEqual(pressed(), ["false", "false", "false", "false", "false"]);
  periodButtons[2].dispatch("click");
  await settled();
  const handleValues = handles.map((handle) => handle.value);
  assert.deepEqual(handleValues, ["1", "2"], "Q3 '25 is the trace's days from July 1");
  assert.deepEqual(pressed(), ["false", "false", "true", "false", "false"]);
  assert.equal(tileValues(tiles)[0], "5");
  assert.deepEqual(page.replaced, ["endpoint=completion&from=2025-07-01"]);
});

test("a token metric titles the bars and closes their caption with the token note; the tiles stay the requests'",
  async (context) => {
    const completions = { endpoint_group: "completion", requests: 5, input_tokens: 700, input_counted: 5 };
    const rows = [...THREE_DAY_ROWS.slice(0, 2), { ...THREE_DAY_ROWS[2], ...completions }];
    const page = runExplorer(context, `${NO_COMPLETION_QUERY}&metric=input_tokens`, { [FAMILY_FILE]: rows });
    await page.running;
    const title = page.container.querySelector(".traffic-bars .figure-title");
    const caption = page.container.querySelector(".traffic-bars .figure-caption");
    assert.equal(title.textContent, "Input tokens per day");
    assert.match(caption.textContent, /^Input tokens each day, /);
    assert.match(caption.textContent, / Tokens are summed over the requests that record them\.$/);
    const { tiles, handles } = explorerParts(page.container);
    handles[1].value = "2";
    handles[1].dispatch("input");
    runFrames(page.frames);
    await settled();
    assert.deepEqual(tileValues(tiles), ["5", "140", "—", "—"]);
  });

test("Back to an entry of another range stands the handles on it and draws it", async (context) => {
  const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS });
  await page.running;
  const { tiles, rangeDays } = explorerParts(page.container);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?endpoint=completion&from=2025-07-01`);
  await page.returns[0]();
  await settled();
  assert.deepEqual(rangeDays.map((day) => day.textContent), ["2025-07-01", "2025-07-02"]);
  assert.equal(tileValues(tiles)[0], "5");
  assert.deepEqual(page.replaced, [], "Back writes nothing");
});

// The histogram answers the explorer reads, once the bars are drawn: every family's, and the family Kin's by model.
const HISTOGRAMS_FILE = "data/all/explore/histograms_by_family.json";
const KIN_HISTOGRAMS_FILE = "data/all/explore/histograms_by_model/kin.json";

// The class of each chart's place's paragraph: its loading line, its error, or its note once drawn with no request.
function chartStates(container) {
  return explorerParts(container).chartPlaces.map((place) => place.querySelector("p").className);
}

// The three charts each showing the note where no chosen request records its value (the histogram answers here are
// empty), or each showing an error.
const NO_VALUE_STATES = ["note", "note", "note"];
const ERROR_STATES = ["note is-error", "note is-error", "note is-error"];

// The notes under the tiles, in order: under the input and output tokens' averages, then under the TTFT's.
function tileNotes(tiles) {
  return tiles.querySelectorAll(".tile-note").map((note) => note.textContent);
}

test("the histogram answer is read once the bars are drawn, the charts and the notes loading until it arrives",
  async (context) => {
    const histograms = deferred();
    const answers = { [FAMILY_FILE]: THREE_DAY_ROWS, [HISTOGRAMS_FILE]: histograms.promise };
    const page = runExplorer(context, NO_COMPLETION_QUERY, answers);
    await settled();
    assert.deepEqual(page.reads, [[FAMILY_FILE, "none"], [HISTOGRAMS_FILE, "note"]], "read once the bars are drawn");
    assert.deepEqual(chartStates(page.container), ["loading", "loading", "loading"]);
    const { tiles } = explorerParts(page.container);
    assert.deepEqual(tileNotes(tiles), ["…", "…", "— record it", "…"]);
    histograms.resolve([]);
    await page.running;
    assert.deepEqual(chartStates(page.container), NO_VALUE_STATES);
    assert.deepEqual(tileNotes(tiles), ["— p50 · — p90", "— p50 · — p90", "— record it", "— p50 · — p90"]);
  });

test("a choice the explorer has moved on from draws nothing when its histogram answer lands", async (context) => {
  const everyFamily = deferred();
  const kin = deferred();
  const answers = {
    [FAMILY_FILE]: FAMILY_ROWS, [KIN_FILE]: KIN_ROWS, [HISTOGRAMS_FILE]: everyFamily.promise,
    [KIN_HISTOGRAMS_FILE]: kin.promise,
  };
  // No row is of the endpoint group chosen, so the bars, which node cannot draw without Plot, are a note.
  const page = runExplorer(context, "?endpoint=completion", answers);
  await settled();
  chooseFamily(page.container, "kin");
  await settled();
  everyFamily.resolve([]);
  await settled();
  assert.deepEqual(chartStates(page.container), ["loading", "loading", "loading"], "every family's answer is stale");
  kin.resolve([]);
  await settled();
  assert.deepEqual(chartStates(page.container), NO_VALUE_STATES);
});

test("a failed histogram read shows its error in the charts, logged once, the notes empty; the next draw reads again",
  async (context) => {
    const answers = { [FAMILY_FILE]: THREE_DAY_ROWS };
    const page = runExplorer(context, NO_COMPLETION_QUERY, answers);
    await page.running;
    assert.deepEqual(chartStates(page.container), ERROR_STATES);
    assert.equal(console.error.mock.callCount(), 1);
    const { tiles, handles } = explorerParts(page.container);
    assert.deepEqual(tileNotes(tiles), ["— record it"], "only the TTFT's share");
    answers[HISTOGRAMS_FILE] = [];
    handles[1].dispatch("input");
    runFrames(page.frames);
    await settled();
    assert.deepEqual(page.reads.map(([file]) => file), [FAMILY_FILE, HISTOGRAMS_FILE, HISTOGRAMS_FILE]);
    assert.deepEqual(chartStates(page.container), NO_VALUE_STATES);
  });

test("a family that cannot be read on a choice shows its error in the bars and charts, the tiles without percentiles",
  async (context) => {
    // The opening's histogram answer lands after the failed choice, and draws nothing over its error.
    const histograms = deferred();
    const answers = { [FAMILY_FILE]: FAMILY_ROWS, [HISTOGRAMS_FILE]: histograms.promise };
    // No row is of the endpoint group chosen, so the bars, which node cannot draw without Plot, are a note.
    const page = runExplorer(context, "?endpoint=completion", answers);
    await settled();
    const { tiles } = explorerParts(page.container);
    const family = chooseFamily(page.container, "kin");
    await settled();
    histograms.resolve([]);
    await page.running;
    assert.equal(page.container.querySelector(".traffic-bars p").className, "note is-error");
    assert.deepEqual(chartStates(page.container), ERROR_STATES);
    assert.deepEqual(tileValues(tiles), ["0", "—", "—", "—"], "the tiles keep their numbers");
    assert.deepEqual(tileNotes(tiles), ["— record it"], "and lose their percentiles");
    assert.equal(family.value, "", "the drop-down shows the family drawn last");
  });
