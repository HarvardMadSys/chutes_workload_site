import assert from "node:assert/strict";
import { test } from "node:test";

import { TOPICS, topicCards } from "../site/js/page/topics.js";

// Every card of every topic.
function everyCard() {
  return TOPICS.flatMap(topicCards);
}

// Every group of every topic.
function everyGroup() {
  return TOPICS.flatMap((topic) => topic.groups);
}

// A sentence ends at a full stop, a question mark or an exclamation mark followed by a space; a line break also
// starts a new one.
const SENTENCE_BREAK = /[.?!] |\n/;

const MAX_INSIGHT_WORDS = 20; // an insight states one finding or implication before the figure
const MAX_CAPTION_WORDS = 40; // a caption gives evidence for the insight in up to three short sentences
const MAX_DEFINITION_WORDS = 60; // short sentences leave room to explain units and essential assumptions
const MAX_TAKEAWAY_WORDS = 30; // a topic's takeaway is the paper's finding for its section, more than a lead-in
const MAX_GROUP_HEADING_WORDS = 6; // a group's heading names what its figures show, at a glance
// A group's takeaway says what its figures show and, where the paper draws one, what it means for a serving system.
const MAX_GROUP_TAKEAWAY_WORDS = 40;
const MAX_GROUP_TAKEAWAY_SENTENCES = 2; // what the figures show, then what it means where the paper draws one
const MAX_SENTENCES = 3; // a caption's or a definition's sentences

// The sentences of `text`, split at each sentence break.
function sentenceCount(text) {
  return text.split(SENTENCE_BREAK).length;
}

// The words of `text`: its whitespace-separated tokens.
function wordCount(text) {
  return text.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Check that `text`, the `field` of `name`, says something, ends with a full stop and holds at most `sentences`
 * sentences and `words` words.
 */
function assertWords(text, name, field, { sentences, words }) {
  assert.equal(typeof text, "string", `${name} has a ${field}`);
  assert.ok(text.length > 0, `${name}: a ${field} that says something`);
  assert.ok(text.endsWith("."), `${name}: its ${field} ends with a full stop`);
  assert.ok(sentenceCount(text) <= sentences, `${name}: a ${field} of ${sentenceCount(text)} sentences`);
  assert.ok(wordCount(text) <= words, `${name}: a ${field} of ${wordCount(text)} words`);
}

test("a second sentence is found after a full stop, a question or an exclamation, or a line break", () => {
  assert.equal(sentenceCount("One sentence, at 4.5 s."), 1);
  for (const text of ["One. Two.", "One? Two.", "One! Two.", "One\nTwo."]) {
    assert.equal(sentenceCount(text), 2, text);
  }
});

test("a word is a whitespace-separated token", () => {
  assert.equal(wordCount("Token hit ratio CDF: Global and <1K / >8K input tokens."), 11);
  assert.equal(wordCount("  two\n words "), 2);
});

test("every card has an insight of one sentence, at most twenty words", () => {
  for (const card of everyCard()) {
    assertWords(card.insight, card.figure, "insight", { sentences: 1, words: MAX_INSIGHT_WORDS });
  }
});

test("every card has a caption of at most three sentences and forty words", () => {
  for (const card of everyCard()) {
    assertWords(card.caption, card.figure, "caption", { sentences: MAX_SENTENCES, words: MAX_CAPTION_WORDS });
  }
});

test("every card has a definition of at most three sentences and sixty words", () => {
  for (const card of everyCard()) {
    assertWords(card.definition, card.figure, "definition", { sentences: MAX_SENTENCES, words: MAX_DEFINITION_WORDS });
  }
});

test("every topic has a takeaway of one sentence, at most thirty words", () => {
  for (const topic of TOPICS) {
    assertWords(topic.takeaway, topic.selector, "takeaway", { sentences: 1, words: MAX_TAKEAWAY_WORDS });
  }
});

test("every group has a heading of at most six words, with no full stop", () => {
  for (const group of everyGroup()) {
    assert.ok(group.heading.length > 0, "a group's heading says something");
    assert.ok(!group.heading.endsWith("."), `${group.heading}: a heading ends with no full stop`);
    const words = wordCount(group.heading);
    assert.ok(words <= MAX_GROUP_HEADING_WORDS, `${group.heading}: a heading of ${words} words`);
  }
});

test("every group has a takeaway of at most two sentences and forty words", () => {
  const limits = { sentences: MAX_GROUP_TAKEAWAY_SENTENCES, words: MAX_GROUP_TAKEAWAY_WORDS };
  for (const group of everyGroup()) {
    assertWords(group.takeaway, group.heading, "takeaway", limits);
  }
});
