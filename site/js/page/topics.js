/**
 * The Insights' six topics, in the order of their tabs, each the paper's figures of one of its sections; a topic's
 * number; and the cards of a topic in order. A topic is `{ id, title, takeaway, groups }`: its id, the anchor of the
 * section the page writes for it (`page/start.js`) and of its tab; its title, written after its number in its heading
 * and its tab; its finding in one sentence, written under its heading; and its groups in the paper's order. A group is
 * `{ heading, takeaway, cards }`: its heading, what its figures show and mean for a serving system in one or two
 * sentences, and its cards in the paper's order, each one of the paper's figures as `insights/figure_card.js` defines
 * a card. Each topic, with its words, is a module of `js/insights/`; this list is the one place a topic is declared.
 */

import { BALANCING_TOPIC } from "../insights/balancing.js";
import { CACHING_TOPIC } from "../insights/caching.js";
import { EVOLUTION_TOPIC } from "../insights/evolution.js";
import { TOKENS_TOPIC } from "../insights/tokens.js";
import { USERS_TOPIC } from "../insights/users.js";
import { WORKLOAD_TOPIC } from "../insights/workload.js";

/** The six topics of the Insights, in the order of their tabs. */
export const TOPICS = Object.freeze([
  WORKLOAD_TOPIC,
  TOKENS_TOPIC,
  USERS_TOPIC,
  EVOLUTION_TOPIC,
  CACHING_TOPIC,
  BALANCING_TOPIC,
]);

// The digits of a topic's number: "01" for the first.
const TOPIC_NUMBER_DIGITS = 2;

/** The number of the topic at `index` of `TOPICS`, as its heading and its tab write it: "01" for the first. */
export function topicNumber(index) {
  return String(index + 1).padStart(TOPIC_NUMBER_DIGITS, "0");
}

/** Every card of `topic`, a topic of `TOPICS`: its first group's cards in order, then its second's, and on. */
export function topicCards(topic) {
  const cards = [];
  for (const group of topic.groups) {
    cards.push(...group.cards);
  }
  return cards;
}
