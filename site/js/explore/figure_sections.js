/**
 * The Insights' six topics, in the order of their tabs, each the paper's figures of one of its sections. A topic is
 * `{ selector, takeaway, cards }`: the selector of its section in `index.html`, whose id is the topic's anchor; its
 * finding in one sentence, written under its heading; and its cards in the paper's order, each one panel of a paper
 * figure as `explore/figure_card.js` defines a card. Each topic, with its words, is a module of `js/insights/`.
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
