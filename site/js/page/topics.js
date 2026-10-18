/**
 * The Insights' topics (`Topic` of `insights/figure_card.js`), in the order of their tabs, each declared here once and
 * written, with its words, as a module of `js/insights/`; a topic's number; and a topic's cards in order.
 */

import { BALANCING_TOPIC } from "../insights/balancing.js";
import { CACHING_TOPIC } from "../insights/caching.js";
import { EVOLUTION_TOPIC } from "../insights/evolution.js";
import { TOKENS_TOPIC } from "../insights/tokens.js";
import { USERS_TOPIC } from "../insights/users.js";
import { WORKLOAD_TOPIC } from "../insights/workload.js";

/** The topics of the Insights, in the order of their tabs. */
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
