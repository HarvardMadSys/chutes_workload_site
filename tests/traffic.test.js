import assert from "node:assert/strict";
import { test } from "node:test";

import { runTraffic } from "../site/js/traffic/traffic.js";
import { FakeElement, PAGE_ADDRESS, runFrames, settled } from "./fake_page.js";

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

/** A promise with its `resolve` and `reject`, `{ promise, resolve, reject }`, for an answer the test lets arrive. */
function deferred() {
  const parts = {};
  parts.promise = new Promise((resolve, reject) => Object.assign(parts, { resolve, reject }));
  return parts;
}

// A stand-in element whose `querySelector` finds a new element, as the figure's Definition control asks for its parts.
function fakeElement(tag) {
  const element = new FakeElement(tag);
  element.querySelector = () => new FakeElement();
  return element;
}

/**
 * Run the explorer into a new container for the test of `context`, the page opened at `query` and each file of
 * `answers` (a map from file to its promised rows) fetched as its rows, any other answering 404; errors are not
 * logged. Returns `{ container, running, replaced, frames, reads, returns }`, the container, the explorer's promise,
 * the queries written to the URL, in order, the animation frames asked for and not yet run, the files read, in order,
 * each `[file, bars]` with what the bars' body held then (`barsState`), and the functions given to `onReturn`, which
 * Back and Forward call.
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

// The response to fetching an answer whose promised rows are `rows`, or a 404 where there are none.
function fetchedAnswer(rows) {
  if (rows === undefined) {
    return { ok: false, status: 404, statusText: "Not Found" };
  }
  return { ok: true, json: () => rows };
}

// What the bars' body in the explorer's `container` holds: the class of its first part, "note" once bars of no
// request are drawn, or "none" before the bars' figure is placed or while its body is empty.
function barsState(container) {
  const figure = container.children[1]?.children[1]?.children[0];
  return figure?.children[3]?.children[0]?.className ?? "none";
}

test("the explorer loads until the URL's family is read; a family that cannot be, shows its error in the chart's place",
  async (context) => {
    const kin = deferred();
    const page = runExplorer(context, "?family=kin", { [FAMILY_FILE]: FAMILY_ROWS, [KIN_FILE]: kin.promise });
    await settled();
    assert.deepEqual(page.container.children.map((child) => child.className), ["loading"]);
    kin.reject(new Error("Could not fetch kin"));
    await page.running;
    const [controls, card] = page.container.children;
    assert.equal(controls.className, "controls traffic-controls");
    assert.equal(controls.children[0].children[1].value, "", "the controls show the choice without the family");
    const figure = card.children[1];
    assert.deepEqual(figure.children.map((child) => [child.className, child.textContent]), [
      ["note is-error", "Could not fetch kin"],
    ]);
    const cards = card.children[3].children.map((place) => place.children[0].className);
    assert.deepEqual(cards, ["note is-error", "note is-error", "note is-error"], "no card loads for ever");
  });

test("choosing a family not read before shows the chart loading until its answer arrives", async (context) => {
  const kin = deferred();
  // No row is of the endpoint group chosen, so the bars, which node cannot draw without Plot, are a note.
  const page = runExplorer(context, "?endpoint=completion", { [FAMILY_FILE]: FAMILY_ROWS, [KIN_FILE]: kin.promise });
  await page.running;
  const [controls, card] = page.container.children;
  const figure = card.children[1];
  const familySelect = controls.children[0].children[1];
  familySelect.value = "kin";
  familySelect.dispatch("change");
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

// The explorer's parts in the fake page: `{ tiles, rangeFields, periodButtons }`, the tiles' list, the From and To
// sliders' fields (each its name, slider and day) and the period buttons.
function explorerParts(container) {
  const [controls, card] = container.children;
  const [tiles, , rangeRow] = card.children;
  return { tiles, rangeFields: rangeRow.children, periodButtons: controls.children[4].children[1].children };
}

// The value of the requests' tile.
function requestsTile(tiles) {
  return tiles.children[0].children[0].textContent;
}

// Opened on the completions of the trace's first two days, which hold none, the bars are a note node can draw.
const NO_COMPLETION_QUERY = "?endpoint=completion&to=2025-07-01";

test("the sliders sit under the bars on the URL's range and draw the tiles as they move, writing it once released",
  async (context) => {
    const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS });
    await page.running;
    const { tiles, rangeFields } = explorerParts(page.container);
    const [, toSlider, toDay] = rangeFields[1].children;
    assert.deepEqual([requestsTile(tiles), toSlider.value, toDay.textContent], ["0", "1", "2025-07-01"]);
    toSlider.value = "2";
    toSlider.dispatch("input");
    runFrames(page.frames);
    await settled();
    assert.equal(requestsTile(tiles), "5");
    assert.deepEqual(page.replaced, [], "a slider moving does not write the URL");
    toSlider.dispatch("change");
    assert.deepEqual(page.replaced, ["endpoint=completion"]);
  });

test("a period button stands the sliders on its days and draws them", async (context) => {
  const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS });
  await page.running;
  const { tiles, rangeFields, periodButtons } = explorerParts(page.container);
  const pressed = () => periodButtons.map((button) => button.getAttribute("aria-pressed"));
  assert.deepEqual(pressed(), ["false", "false", "false", "false", "false"]);
  periodButtons[2].dispatch("click");
  await settled();
  const sliderValues = rangeFields.map((field) => field.children[1].value);
  assert.deepEqual(sliderValues, ["1", "2"], "Q3 '25 is the trace's days from July 1");
  assert.deepEqual(pressed(), ["false", "false", "true", "false", "false"]);
  assert.equal(requestsTile(tiles), "5");
  assert.deepEqual(page.replaced, ["endpoint=completion&from=2025-07-01"]);
});

// The value of each tile, in order.
function tileValues(tiles) {
  return tiles.children.map((tile) => tile.children[0].textContent);
}

test("a token metric titles the bars and closes their caption with the token note; the tiles stay the requests'",
  async (context) => {
    const completions = { endpoint_group: "completion", requests: 5, input_tokens: 700, input_counted: 5 };
    const rows = [...THREE_DAY_ROWS.slice(0, 2), { ...THREE_DAY_ROWS[2], ...completions }];
    const page = runExplorer(context, `${NO_COMPLETION_QUERY}&metric=input_tokens`, { [FAMILY_FILE]: rows });
    await page.running;
    const [title, caption] = page.container.children[1].children[1].children[0].children;
    assert.equal(title.textContent, "Input tokens per day");
    assert.match(caption.textContent, /^Input tokens each day, /);
    assert.match(caption.textContent, / Tokens are summed over the requests that record them\.$/);
    const { tiles, rangeFields } = explorerParts(page.container);
    rangeFields[1].children[1].value = "2";
    rangeFields[1].children[1].dispatch("input");
    runFrames(page.frames);
    await settled();
    assert.deepEqual(tileValues(tiles), ["5", "140", "—", "—"]);
  });

test("Back to an entry of another range stands the sliders on it and draws it", async (context) => {
  const page = runExplorer(context, NO_COMPLETION_QUERY, { [FAMILY_FILE]: THREE_DAY_ROWS });
  await page.running;
  const { tiles, rangeFields } = explorerParts(page.container);
  globalThis.window.location = new URL(`${PAGE_ADDRESS}?endpoint=completion&from=2025-07-01`);
  await page.returns[0]();
  await settled();
  assert.deepEqual(rangeFields.map((field) => field.children[2].textContent), ["2025-07-01", "2025-07-02"]);
  assert.equal(requestsTile(tiles), "5");
  assert.deepEqual(page.replaced, [], "Back writes nothing");
});

// The histogram answers the explorer reads, once the bars are drawn: every family's, and the family Kin's by model.
const HISTOGRAMS_FILE = "data/all/explore/histograms_by_family.json";
const KIN_HISTOGRAMS_FILE = "data/all/explore/histograms_by_model/kin.json";

// The explorer's distribution cards' places, in the fake page.
function cardPlaces(container) {
  return container.children[1].children[3].children;
}

// The first part of each card's place: its loading line, or its figure once drawn.
function cardStates(container) {
  return cardPlaces(container).map((place) => place.children[0].className);
}

test("the histogram answer is read once the bars are drawn, the cards and the notes loading until it arrives",
  async (context) => {
    const histograms = deferred();
    const answers = { [FAMILY_FILE]: THREE_DAY_ROWS, [HISTOGRAMS_FILE]: histograms.promise };
    const page = runExplorer(context, NO_COMPLETION_QUERY, answers);
    await settled();
    assert.deepEqual(page.reads, [[FAMILY_FILE, "none"], [HISTOGRAMS_FILE, "note"]], "read once the bars are drawn");
    assert.deepEqual(cardStates(page.container), ["loading", "loading", "loading"]);
    const { tiles } = explorerParts(page.container);
    assert.equal(tiles.children[1].children[2].textContent, "…");
    histograms.resolve([]);
    await page.running;
    assert.deepEqual(cardStates(page.container), ["figure", "figure", "figure"]);
    assert.equal(tiles.children[1].children[2].textContent, "— p50 · — p90");
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
  const familySelect = page.container.children[0].children[0].children[1];
  familySelect.value = "kin";
  familySelect.dispatch("change");
  await settled();
  everyFamily.resolve([]);
  await settled();
  assert.deepEqual(cardStates(page.container), ["loading", "loading", "loading"], "every family's answer is stale");
  kin.resolve([]);
  await settled();
  assert.deepEqual(cardStates(page.container), ["figure", "figure", "figure"]);
});

test("a failed histogram read shows its error in the cards, logged once, the notes empty; the next draw reads again",
  async (context) => {
    const answers = { [FAMILY_FILE]: THREE_DAY_ROWS };
    const page = runExplorer(context, NO_COMPLETION_QUERY, answers);
    await page.running;
    assert.deepEqual(cardStates(page.container), ["note is-error", "note is-error", "note is-error"]);
    assert.equal(console.error.mock.callCount(), 1);
    const { tiles, rangeFields } = explorerParts(page.container);
    assert.deepEqual(tiles.children.map((tile) => tile.children.length), [2, 2, 2, 3], "only the TTFT's share");
    answers[HISTOGRAMS_FILE] = [];
    rangeFields[1].children[1].dispatch("input");
    runFrames(page.frames);
    await settled();
    assert.deepEqual(page.reads.map(([file]) => file), [FAMILY_FILE, HISTOGRAMS_FILE, HISTOGRAMS_FILE]);
    assert.deepEqual(cardStates(page.container), ["figure", "figure", "figure"]);
  });
