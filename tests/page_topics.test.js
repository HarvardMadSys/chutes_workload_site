// The topic list (`page/topics.js`): the topics' ids and numbers, their groups and cards, every field of a card, the
// figure answers they draw, and their being frozen.
import assert from "node:assert/strict";
import { test } from "node:test";

import { TOPICS, topicCards, topicNumber } from "../site/js/page/topics.js";
import { CHART_HEIGHT } from "../site/js/plot/frame.js";
import { shippedAnswer } from "./fake_page.js";
import { everyCard, everyGroup } from "./insights_fixtures.js";

// The figure answers the data step wrote, as their index lists them: each figure's row count, by name.
const INDEX = shippedAnswer("figures");

// The fields of a topic, of a group, and of a card: its words, each a string, then its kind and its chart's
// parameters; a card may also have the optional ones.
const TOPIC_FIELDS = ["id", "title", "takeaway", "groups"];
const GROUP_FIELDS = ["heading", "takeaway", "cards"];
const CARD_FIELDS = ["figure", "title", "insight", "caption", "definition", "kind"];
const OPTIONAL_CARD_FIELDS = ["panels", "legend", "series", "palette", "isWide"];

test("each topic has an id of its own, an anchor under the Insights' own", () => {
  const ids = TOPICS.map((topic) => topic.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const id of ids) {
    assert.match(id, /^insights-[a-z]+$/);
  }
});

test("a topic's number is its place in the list, in two digits", () => {
  assert.deepEqual([0, 5, 9].map(topicNumber), ["01", "06", "10"]);
});

test("a topic has its id, title, takeaway and groups, a group its heading, takeaway and cards, and no other", () => {
  for (const topic of TOPICS) {
    assert.deepEqual(Object.keys(topic), TOPIC_FIELDS, topic.id);
    assert.ok(typeof topic.title === "string" && topic.title.length > 0, topic.id);
    assert.equal(typeof topic.takeaway, "string", topic.id);
    for (const group of topic.groups) {
      assert.deepEqual(Object.keys(group), GROUP_FIELDS, `${topic.id}: ${group.heading}`);
      assert.equal(typeof group.heading, "string", topic.id);
      assert.equal(typeof group.takeaway, "string", `${topic.id}: ${group.heading}`);
    }
  }
});

test("no group is empty", () => {
  for (const topic of TOPICS) {
    for (const group of topic.groups) {
      assert.ok(group.cards.length > 0, `${topic.id}: ${group.heading}`);
    }
  }
});

test("topicCards lists a topic's cards group by group, each group's in its order", () => {
  const topic = { groups: [{ cards: ["first", "second"] }, { cards: ["third"] }] };
  assert.deepEqual(topicCards(topic), ["first", "second", "third"]);
});

test("no card object is held by two groups", () => {
  const groups = everyGroup();
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

test("every figure answer of the index is one card's figure, or the legend of the cards that name it", () => {
  const figures = everyCard().map((card) => card.figure);
  const legends = new Set();
  for (const card of everyCard()) {
    if (card.legend !== undefined) {
      legends.add(card.legend);
    }
  }
  assert.deepEqual([...new Set([...figures, ...legends])].sort(), Object.keys(INDEX).sort());
  for (const name of Object.keys(INDEX)) {
    const drawingCards = figures.filter((figure) => figure === name).length;
    assert.equal(drawingCards, legends.has(name) ? 0 : 1, name);
  }
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
    assert.ok(Object.isFrozen(topic) && Object.isFrozen(topic.groups), topic.id);
    for (const group of topic.groups) {
      assert.ok(Object.isFrozen(group) && Object.isFrozen(group.cards), `${topic.id}: ${group.heading}`);
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
  for (const group of everyGroup()) {
    for (const row of gridRows(group.cards)) {
      // A card that gives no height draws at the frame's, so it is compared as that.
      const heights = row.map((card) => card.chart.height ?? CHART_HEIGHT);
      assert.ok(heights.every((height) => height === heights[0]), `${row.map((card) => card.figure)}: ${heights}`);
    }
  }
});
