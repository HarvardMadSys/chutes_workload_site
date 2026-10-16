import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { FIGURE_SECTIONS } from "../site/js/explore/figure_sections.js";
import { URLS } from "../site/js/shared/layout.js";

// The images the data step rendered, as its index lists them.
const INDEX = JSON.parse(readFileSync(new URL("../site/figures/index.json", import.meta.url), "utf8"));

// The topics' sections, in the order of their tabs.
const SELECTORS = [
  "#insights-overview", "#insights-tokens", "#insights-users", "#insights-evolution", "#insights-caching",
  "#insights-balancing",
];

// How many cards each topic holds: a card for each panel of the paper's figures of its section.
const CARD_COUNTS = [5, 8, 10, 6, 9, 9];

// The fields of a topic, and of a card; a card may also have the optional ones.
const TOPIC_FIELDS = ["selector", "takeaway", "cards"];
const CARD_FIELDS = ["image", "title", "insight", "caption", "definition", "source"];
const OPTIONAL_CARD_FIELDS = ["legendImage", "isWide"];

// The legend shown above the two monthly share panels, and those panels.
const SHARE_LEGEND = "fig_top10_model_monthly_share_legend";
const SHARE_PANELS = ["fig_top10_model_monthly_request_share", "fig_top10_model_monthly_token_share"];

// The one wide card: the routing simulation's eight panels.
const WIDE_CARDS = ["fig_routing_tradeoff"];

// A card's source: a section README of the artifact's paper folder, or one of its simulation folders.
const SOURCE = new RegExp(`^${URLS.code}/(blob/main/paper/\\d\\d_\\w+/README\\.md|tree/main/pipeline/(caching|routing))$`);

// Every card of every topic.
function everyCard() {
  return FIGURE_SECTIONS.flatMap((topic) => topic.cards);
}

// How many times each image is shown: once for a card's image, once more for each card it is the legend of.
function imageUses() {
  const uses = new Map();
  for (const card of everyCard()) {
    for (const name of [card.image, card.legendImage]) {
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

test("a card has every field, each a string, and no field but the optional ones", () => {
  for (const card of everyCard()) {
    for (const field of CARD_FIELDS) {
      assert.equal(typeof card[field], "string", `${card.image}: ${field}`);
    }
    const others = Object.keys(card).filter((field) => !CARD_FIELDS.includes(field));
    assert.ok(others.every((field) => OPTIONAL_CARD_FIELDS.includes(field)), `${card.image}: ${others}`);
    assert.ok(card.title.length > 0, card.image);
  }
});

test("every image of the index is shown once, but the share legend, shown above both share panels", () => {
  const uses = imageUses();
  assert.deepEqual([...uses.keys()].sort(), INDEX.map((image) => image.name).sort());
  for (const [name, count] of uses) {
    assert.equal(count, name === SHARE_LEGEND ? 2 : 1, name);
  }
});

test("only the two share panels have the legend, and only the routing simulation is wide", () => {
  const withLegend = everyCard().filter((card) => card.legendImage !== undefined).map((card) => card.image);
  assert.deepEqual(withLegend, SHARE_PANELS);
  const wide = everyCard().filter((card) => card.isWide === true).map((card) => card.image);
  assert.deepEqual(wide, WIDE_CARDS);
});

test("every card links the artifact's README or simulation folder of its figure", () => {
  for (const card of everyCard()) {
    assert.match(card.source, SOURCE, card.image);
  }
});

test("the topics and their cards cannot be changed", () => {
  assert.ok(Object.isFrozen(FIGURE_SECTIONS));
  for (const topic of FIGURE_SECTIONS) {
    assert.ok(Object.isFrozen(topic) && Object.isFrozen(topic.cards), topic.selector);
    assert.ok(topic.cards.every((card) => Object.isFrozen(card)), topic.selector);
  }
});
