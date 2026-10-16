import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FIGURE_SECTIONS } from "../site/js/insights/figure_sections.js";

// The figure answers the data step wrote, as their index lists them: each figure's row count, by name.
const INDEX = JSON.parse(readFileSync(new URL("../site/data/all/figures.json", import.meta.url), "utf8"));

// The topics' sections, in the order of their tabs.
const SELECTORS = [
  "#insights-overview", "#insights-tokens", "#insights-users", "#insights-evolution", "#insights-caching",
  "#insights-balancing",
];

// How many cards each topic holds: a card for each panel of the paper's figures of its section.
const CARD_COUNTS = [5, 8, 10, 6, 9, 9];

// The fields of a topic, and of a card: its words, each a string, then its kind and its chart's parameters; a card
// may also have the optional ones.
const TOPIC_FIELDS = ["selector", "takeaway", "cards"];
const CARD_FIELDS = ["figure", "title", "insight", "caption", "definition", "kind"];
const OPTIONAL_CARD_FIELDS = ["panels", "legend", "series", "palette", "isWide"];

// The legend answer whose order the two monthly share cards' series take, and those cards.
const SHARE_LEGEND = "fig_top10_model_monthly_share_legend";
const SHARE_PANELS = ["fig_top10_model_monthly_request_share", "fig_top10_model_monthly_token_share"];

// The one wide card: the routing simulation's panels.
const WIDE_CARDS = ["fig_routing_tradeoff"];

// Every card of every topic.
function everyCard() {
  return FIGURE_SECTIONS.flatMap((topic) => topic.cards);
}

// How many times each figure is used: once for a card's figure, once more for each card it is the legend of.
function figureUses() {
  const uses = new Map();
  for (const card of everyCard()) {
    for (const name of [card.figure, card.legend]) {
      if (name !== undefined) {
        uses.set(name, (uses.get(name) ?? 0) + 1);
      }
    }
  }
  return uses;
}

test("the six topics are in the order of their tabs, with a card for each panel of their section", () => {
  assert.deepEqual(FIGURE_SECTIONS.map((topic) => topic.selector), SELECTORS);
  assert.deepEqual(FIGURE_SECTIONS.map((topic) => topic.cards.length), CARD_COUNTS);
  assert.equal(everyCard().length, 47);
});

test("a topic has its selector, takeaway and cards, and no other field", () => {
  for (const topic of FIGURE_SECTIONS) {
    assert.deepEqual(Object.keys(topic), TOPIC_FIELDS, topic.selector);
    assert.equal(typeof topic.takeaway, "string", topic.selector);
  }
});

test("a card has every field, each a string, its chart's parameters, and no field but the optional ones", () => {
  for (const card of everyCard()) {
    for (const field of CARD_FIELDS) {
      assert.equal(typeof card[field], "string", `${card.figure}: ${field}`);
    }
    assert.equal(typeof card.chart, "object", `${card.figure}: chart`);
    const others = Object.keys(card).filter((field) => !CARD_FIELDS.includes(field) && field !== "chart");
    assert.ok(others.every((field) => OPTIONAL_CARD_FIELDS.includes(field)), `${card.figure}: ${others}`);
    assert.ok(card.title.length > 0, card.figure);
  }
});

test("every figure answer of the index is drawn once, but the share legend, which orders both share cards", () => {
  const uses = figureUses();
  assert.deepEqual([...uses.keys()].sort(), Object.keys(INDEX).sort());
  for (const [name, count] of uses) {
    assert.equal(count, name === SHARE_LEGEND ? 2 : 1, name);
  }
});

test("only the two share cards name the legend, and only the routing simulation is wide", () => {
  const withLegend = everyCard().filter((card) => card.legend !== undefined).map((card) => card.figure);
  assert.deepEqual(withLegend, SHARE_PANELS);
  const wide = everyCard().filter((card) => card.isWide === true).map((card) => card.figure);
  assert.deepEqual(wide, WIDE_CARDS);
});

// The objects and lists `value` holds, itself among them, all the way down; functions and plain values left out.
function heldObjects(value) {
  if (typeof value !== "object" || value === null) {
    return [];
  }
  const objects = [value];
  for (const part of Object.values(value)) {
    objects.push(...heldObjects(part));
  }
  return objects;
}

test("the topics and their cards cannot be changed, nor their charts, panels and the panels' charts", () => {
  assert.ok(Object.isFrozen(FIGURE_SECTIONS));
  for (const topic of FIGURE_SECTIONS) {
    assert.ok(Object.isFrozen(topic) && Object.isFrozen(topic.cards), topic.selector);
    for (const card of topic.cards) {
      const unfrozen = heldObjects(card).filter((part) => !Object.isFrozen(part));
      assert.deepEqual(unfrozen, [], `${card.figure} holds an object that can be changed`);
    }
  }
});
