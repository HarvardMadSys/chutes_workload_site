/**
 * The Insights' six topics, in the order of their tabs, each the paper's figures of one of its sections, and the cards
 * of a topic in order. A topic is `{ selector, takeaway, groups }`: the selector of its section in `index.html`, whose
 * id is the topic's anchor; its finding in one sentence, written under its heading; and its groups in the paper's
 * order. A group is `{ heading, takeaway, cards }`: its heading, what its figures show and mean for a serving system
 * in one or two sentences, and its cards in the paper's order, each one of the paper's figures as
 * `insights/figure_card.js` defines a card. Each topic, with its words, is a module of `js/insights/`.
 */

import { BALANCING_TOPIC } from "../insights/balancing.js";
import { CACHING_TOPIC } from "../insights/caching.js";
import { EVOLUTION_TOPIC } from "../insights/evolution.js";
import { OVERVIEW_TOPIC } from "../insights/overview.js";
import { TOKENS_TOPIC } from "../insights/tokens.js";
import { USERS_TOPIC } from "../insights/users.js";

/** The six topics of the Insights, in the order of their tabs. */
export const FIGURE_SECTIONS = Object.freeze([
  OVERVIEW_TOPIC,
  TOKENS_TOPIC,
  USERS_TOPIC,
  EVOLUTION_TOPIC,
  CACHING_TOPIC,
  BALANCING_TOPIC,
]);

/** Every card of `topic`, a topic of `FIGURE_SECTIONS`: its first group's cards in order, then its second's, and on. */
export function topicCards(topic) {
  const cards = [];
  for (const group of topic.groups) {
    cards.push(...group.cards);
  }
  return cards;
}
