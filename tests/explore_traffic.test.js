import assert from "node:assert/strict";
import { test } from "node:test";

import { dayMonth, monthTicks, renderTiles, runTraffic, tileTexts } from "../site/js/explore/traffic.js";
import { trafficSummary } from "../site/js/explore/traffic_filter.js";
import { FakeElement, PAGE_ADDRESS } from "./fake_page.js";

/** Make a stand-in the global document for the test of `context`; node has none of its own. */
function useFakeDocument(context) {
  globalThis.document = { createElement: (tag) => new FakeElement(tag) };
  context.after(() => delete globalThis.document);
}

test("the tiles write the requests as the stats strip does and each average over the requests that record it", () => {
  const summary = {
    requests: 6_122_413_756, inputAverage: 5846.6, outputAverage: 412.2, ttftAverage: 2.31, ttftShare: 0.49,
  };
  assert.deepEqual(tileTexts(summary), [
    { label: "Requests", value: "6.12B", note: "" },
    { label: "Avg input tokens", value: "5,847", note: "" },
    { label: "Avg output tokens", value: "412", note: "" },
    { label: "Avg TTFT", value: "2.3 s", note: "49% record it" },
  ]);
});

test("the tiles of a choice with no requests write no average and no share", () => {
  const texts = tileTexts(trafficSummary([]));
  assert.deepEqual(texts.map((tile) => tile.value), ["0", "—", "—", "—"]);
  assert.equal(texts[3].note, "— record it");
});

test("each tile shows its value, its label and its note, if any", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  renderTiles(list, { requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49 });
  const texts = list.children.map((tile) => tile.children.map((part) => part.textContent));
  assert.deepEqual(texts, [
    ["1.0k", "Requests"],
    ["8", "Avg input tokens"],
    ["3", "Avg output tokens"],
    ["0.2 s", "Avg TTFT", "49% record it"],
  ]);
});

// Plot widths, in pixels: a desktop card's, and a phone's at 360 px.
const WIDE_PLOT = 1200;
const PHONE_PLOT = 286;

test("the bars' axis writes the month at each first of a month, and at a quarter's first day", () => {
  const days = ["2025-04-29", "2025-04-30", "2025-05-01", "2025-05-02", "2025-06-01"];
  assert.deepEqual(monthTicks(days, "", WIDE_PLOT), ["2025-05-01", "2025-06-01"]);
  assert.deepEqual(monthTicks(days, "2025-q2", WIDE_PLOT).map(dayMonth), ["2025-04", "2025-05", "2025-06"]);
  const quarter = ["2025-07-01", "2025-07-02", "2025-08-01"];
  assert.deepEqual(monthTicks(quarter, "2025-q3", WIDE_PLOT), ["2025-07-01", "2025-08-01"]);
});

// The first day of each month of the whole trace's days, from 2025-04-11 to 2026-04-12.
const TRACE_MONTH_STARTS = [
  "2025-05-01", "2025-06-01", "2025-07-01", "2025-08-01", "2025-09-01", "2025-10-01", "2025-11-01", "2025-12-01",
  "2026-01-01", "2026-02-01", "2026-03-01", "2026-04-01",
];

test("the whole trace's bars write every month on a wide plot and every other month on a phone's", () => {
  const days = ["2025-04-11", ...TRACE_MONTH_STARTS, "2026-04-12"];
  assert.deepEqual(monthTicks(days, "", WIDE_PLOT), TRACE_MONTH_STARTS);
  assert.deepEqual(monthTicks(days, "", PHONE_PLOT).map(dayMonth), [
    "2025-05", "2025-07", "2025-09", "2025-11", "2026-01", "2026-03",
  ]);
});

test("a quarter's bars write every month on a phone's plot too", () => {
  const days = ["2025-04-11", "2025-05-01", "2025-06-01", "2025-06-30"];
  assert.deepEqual(monthTicks(days, "2025-q2", PHONE_PLOT), ["2025-04-11", "2025-05-01", "2025-06-01"]);
});

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
 * logged. Returns `{ container, running }`, the container and the explorer's promise.
 */
function runExplorer(context, query, answers) {
  globalThis.document = { createElement: fakeElement };
  globalThis.window = { location: new URL(`${PAGE_ADDRESS}${query}`) };
  context.after(() => {
    delete globalThis.document;
    delete globalThis.window;
  });
  context.mock.method(console, "error", () => undefined);
  context.mock.method(globalThis, "fetch", async (file) => fetchedAnswer(answers[file]));
  const explorerContext = {
    orders: { endpoints: Promise.resolve([{ endpoint_group: "chat", requests: 10 }]) },
    replaceQuery: () => undefined,
    onReturn: () => undefined,
  };
  const container = new FakeElement("div");
  return { container, running: runTraffic(container, explorerContext) };
}

// The response to fetching an answer whose promised rows are `rows`, or a 404 where there are none.
function fetchedAnswer(rows) {
  if (rows === undefined) {
    return { ok: false, status: 404, statusText: "Not Found" };
  }
  return { ok: true, json: () => rows };
}

// Wait until every promise of the explorer that can settle has.
function settled() {
  return new Promise((resolve) => setImmediate(resolve));
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
  });

test("choosing a family not read before shows the chart loading until its answer arrives", async (context) => {
  const kin = deferred();
  const page = runExplorer(context, "?period=2026-q1", { [FAMILY_FILE]: FAMILY_ROWS, [KIN_FILE]: kin.promise });
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
