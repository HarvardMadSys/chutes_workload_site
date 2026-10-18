import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { TOPICS, topicCards } from "../site/js/page/topics.js";
import { CHART_HEIGHT } from "../site/js/shared/charts.js";

// The figure answers the data step wrote, as their index lists them: each figure's row count, by name.
const INDEX = JSON.parse(readFileSync(new URL("../site/data/all/figures.json", import.meta.url), "utf8"));

// The topics' sections, in the order of their tabs.
const SELECTORS = [
  "#insights-overview", "#insights-tokens", "#insights-users", "#insights-evolution", "#insights-caching",
  "#insights-balancing",
];

// How many cards each group of each topic holds, in the order of the topics and of their groups: a card for each panel
// of the paper's figures of the topic's section.
const GROUP_CARD_COUNTS = [[4, 1], [3, 2, 3], [4, 4, 2], [2, 2, 2], [4, 3, 2], [6, 2, 1]];

// The fields of a topic, of a group, and of a card: its words, each a string, then its kind and its chart's
// parameters; a card may also have the optional ones.
const TOPIC_FIELDS = ["selector", "takeaway", "groups"];
const GROUP_FIELDS = ["heading", "takeaway", "cards"];
const CARD_FIELDS = ["figure", "title", "insight", "caption", "definition", "kind"];
const OPTIONAL_CARD_FIELDS = ["panels", "legend", "series", "palette", "isWide"];

// The legend answer whose order the two monthly share cards' series take, and those cards.
const SHARE_LEGEND = "fig_top10_model_monthly_share_legend";
const SHARE_PANELS = ["fig_top10_model_monthly_request_share", "fig_top10_model_monthly_token_share"];

// The wide cards, in the topics' order, as the spec's table marks them: the output-to-input ratio and the TTL
// coverage, each a log axis of many decades, and the routing simulation's eight panels.
const WIDE_CARDS = ["fig_output_input_ratio_cdf_by_model", "fig_iat_pair_ttl_coverage", "fig_routing_tradeoff"];

// Every card of every topic.
function everyCard() {
  return TOPICS.flatMap(topicCards);
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

test("the six topics are in the order of their tabs", () => {
  assert.deepEqual(TOPICS.map((topic) => topic.selector), SELECTORS);
});

test("a topic has its selector, takeaway and groups, and a group its heading, takeaway and cards, and no other", () => {
  for (const topic of TOPICS) {
    assert.deepEqual(Object.keys(topic), TOPIC_FIELDS, topic.selector);
    assert.equal(typeof topic.takeaway, "string", topic.selector);
    for (const group of topic.groups) {
      assert.deepEqual(Object.keys(group), GROUP_FIELDS, `${topic.selector}: ${group.heading}`);
      assert.equal(typeof group.heading, "string", topic.selector);
      assert.equal(typeof group.takeaway, "string", `${topic.selector}: ${group.heading}`);
    }
  }
});

test("every topic holds its cards in groups of the paper's runs", () => {
  const groupCardCounts = TOPICS.map((topic) => topic.groups.map((group) => group.cards.length));
  assert.deepEqual(groupCardCounts, GROUP_CARD_COUNTS);
});

test("no group is empty", () => {
  for (const topic of TOPICS) {
    for (const group of topic.groups) {
      assert.ok(group.cards.length > 0, `${topic.selector}: ${group.heading}`);
    }
  }
});

test("topicCards lists a topic's cards group by group, each group's in its order", () => {
  const topic = { groups: [{ cards: ["first", "second"] }, { cards: ["third"] }] };
  assert.deepEqual(topicCards(topic), ["first", "second", "third"]);
});

test("no card object is held by two groups", () => {
  const groups = TOPICS.flatMap((topic) => topic.groups);
  for (const card of everyCard()) {
    const holding = groups.filter((group) => group.cards.includes(card));
    assert.equal(holding.length, 1, card.figure);
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

test("only the two share cards name the legend, and only the ratio, the TTL coverage and the routing are wide", () => {
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

test("the topics, their groups and cards cannot be changed, nor the cards' charts, panels and panels' charts", () => {
  assert.ok(Object.isFrozen(TOPICS));
  for (const topic of TOPICS) {
    assert.ok(Object.isFrozen(topic) && Object.isFrozen(topic.groups), topic.selector);
    for (const group of topic.groups) {
      assert.ok(Object.isFrozen(group) && Object.isFrozen(group.cards), `${topic.selector}: ${group.heading}`);
    }
    for (const card of topicCards(topic)) {
      const unfrozen = heldObjects(card).filter((part) => !Object.isFrozen(part));
      assert.deepEqual(unfrozen, [], `${card.figure} holds an object that can be changed`);
    }
  }
});

// The rows of a group's two-column grid, in the group's order: the others two by two, a wide card alone on a row of
// its own, after a card left alone on the row before it.
function gridRows(cards) {
  const rows = [];
  let open = [];
  for (const card of cards) {
    if (card.isWide === true) {
      if (open.length > 0) {
        rows.push(open);
        open = [];
      }
      rows.push([card]);
    } else {
      open.push(card);
      if (open.length === 2) {
        rows.push(open);
        open = [];
      }
    }
  }
  if (open.length > 0) {
    rows.push(open);
  }
  return rows;
}

test("the two cards of a grid row draw their charts at one height, so the row stays level", () => {
  for (const group of TOPICS.flatMap((topic) => topic.groups)) {
    for (const row of gridRows(group.cards)) {
      // A card that gives no height draws at the frame's, so it is compared as that.
      const heights = row.map((card) => card.chart.height ?? CHART_HEIGHT);
      assert.ok(heights.every((height) => height === heights[0]), `${row.map((card) => card.figure)}: ${heights}`);
    }
  }
});
