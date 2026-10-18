import assert from "node:assert/strict";
import { test } from "node:test";

import { trafficSummary } from "../site/js/traffic/traffic_filter.js";
import { NO_PERCENTILES, placeTiles, renderTiles, tileTexts } from "../site/js/traffic/traffic_tiles.js";
import { FakeElement, useFakeDocument } from "./fake_page.js";

// The whole trace's numbers, as the tiles take them.
const SUMMARY = Object.freeze({
  requests: 6_122_413_756, inputAverage: 5846.6, outputAverage: 412.2, ttftAverage: 2.31, ttftShare: 0.49,
});

// Percentiles as `choicePercentiles` gives them: a bin's middle each, the TTFT's p90 of no request.
const PERCENTILES = Object.freeze({
  input: { p50: 1116.7, p90: 4210 },
  output: { p50: 98.7, p90: 1490 },
  ttft: { p50: 0.8374, p90: null },
});

test("the tiles write the requests as the stats strip does and each average over the requests that record it", () => {
  assert.deepEqual(tileTexts(SUMMARY, NO_PERCENTILES), [
    { key: "requests", label: "Requests", value: "6.12B", notes: [] },
    { key: "input", label: "Avg input tokens", value: "5,847", notes: [] },
    { key: "output", label: "Avg output tokens", value: "412", notes: [] },
    { key: "ttft", label: "Avg TTFT", value: "2.3 s", notes: ["49% record it"] },
  ]);
});

test("under each average its percentiles to two significant figures, the TTFT's after its share", () => {
  const notes = tileTexts(SUMMARY, PERCENTILES).map((tile) => tile.notes);
  assert.deepEqual(notes, [
    [],
    ["≈1,100 p50 · ≈4,200 p90"],
    ["≈99 p50 · ≈1,500 p90"],
    ["49% record it", "≈0.84 s p50 · — p90"],
  ]);
});

test("while the percentiles have not arrived, each average's note is the loading text", () => {
  const notes = tileTexts(SUMMARY, null).map((tile) => tile.notes);
  assert.deepEqual(notes, [[], ["…"], ["…"], ["49% record it", "…"]]);
});

test("the tiles of a choice with no requests write no average and no share", () => {
  const texts = tileTexts(trafficSummary([]), NO_PERCENTILES);
  assert.deepEqual(texts.map((tile) => tile.value), ["0", "—", "—", "—"]);
  assert.deepEqual(texts[3].notes, ["— record it"]);
});

// A choice's numbers, small enough to read.
const SMALL_SUMMARY = Object.freeze({
  requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49,
});

// The parts of each tile's text, in the order of the tiles of `list`: its value, its label and its notes.
function tileTextParts(list) {
  return list.querySelectorAll("li").map((tile) => tile.querySelector(".tile-text").children);
}

// True when `places` are the very elements the input, output and TTFT tiles of `list` hold as their chart's place.
function areTheTilesPlaces(list, places) {
  const input = list.querySelector('[data-tile="input"] .tile-chart');
  const output = list.querySelector('[data-tile="output"] .tile-chart');
  const ttft = list.querySelector('[data-tile="ttft"] .tile-chart');
  return Object.keys(places).join() === "input,output,ttft"
    && places.input === input && places.output === output && places.ttft === ttft;
}

test("the tiles are placed once, the input, output and TTFT tiles each holding a chart's place, loading", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  const places = placeTiles(list);
  const names = list.children.map((tile) => tile.getAttribute("data-tile"));
  assert.deepEqual(names, ["requests", "input", "output", "ttft"]);
  assert.deepEqual(list.children.map((tile) => tile.children.length), [1, 2, 2, 2]);
  assert.ok(areTheTilesPlaces(list, places));
  assert.deepEqual(Object.values(places).map((place) => place.className), Array(3).fill("tile-chart figure-body"));
  const loading = Object.values(places).map((place) => place.querySelector(".loading").className);
  assert.deepEqual(loading, Array(3).fill("loading"));
  for (const tile of list.querySelectorAll("li")) {
    const [first] = tile.children; // the tile's text comes first, before its chart
    assert.equal(first.className, "tile-text");
  }
});

test("each tile shows its value, its label and its notes, each on a line, if any", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  placeTiles(list);
  renderTiles(list, SMALL_SUMMARY, PERCENTILES);
  const texts = tileTextParts(list).map((parts) => parts.map((part) => part.textContent));
  assert.deepEqual(texts, [
    ["1.0k", "Requests"],
    ["8", "Avg input tokens", "≈1,100 p50 · ≈4,200 p90"],
    ["3", "Avg output tokens", "≈99 p50 · ≈1,500 p90"],
    ["0.2 s", "Avg TTFT", "49% record it", "≈0.84 s p50 · — p90"],
  ]);
  assert.deepEqual(tileTextParts(list)[3].map((part) => part.className), ["", "", "tile-note", "tile-note"]);
});

test("each tile's text is written into the tile its data-tile names, wherever the tile stands", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  placeTiles(list);
  list.replaceChildren(...[...list.children].reverse());
  renderTiles(list, SMALL_SUMMARY, PERCENTILES);
  const labels = list.children.map((tile) => {
    const label = tile.querySelector(".tile-text span"); // the label is the text's first line under its value
    return [tile.getAttribute("data-tile"), label.textContent];
  });
  assert.deepEqual(labels, [
    ["ttft", "Avg TTFT"], ["output", "Avg output tokens"], ["input", "Avg input tokens"], ["requests", "Requests"],
  ]);
});

test("writing the tiles again leaves their charts' places as they are", (context) => {
  useFakeDocument(context);
  const list = new FakeElement("ul");
  const places = placeTiles(list);
  const drawn = new FakeElement("svg");
  places.input.replaceChildren(drawn);
  renderTiles(list, SMALL_SUMMARY, null);
  renderTiles(list, SMALL_SUMMARY, PERCENTILES);
  assert.ok(areTheTilesPlaces(list, places), "the same elements");
  assert.equal(places.input.querySelector("svg"), drawn);
  assert.equal(places.input.children.length, 1);
  const loading = [places.output, places.ttft].map((place) => place.querySelector(".loading").className);
  assert.deepEqual(loading, ["loading", "loading"]);
  assert.equal(tileTextParts(list)[1][2].textContent, "≈1,100 p50 · ≈4,200 p90", "the latest notes, once");
  assert.equal(tileTextParts(list)[1].length, 3);
});
