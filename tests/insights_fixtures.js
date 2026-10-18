/**
 * The Insights' tests' fixtures: every card and every group of the topics as `page/topics.js` lists them, and the card
 * that draws a figure.
 */

import { TOPICS, topicCards } from "../site/js/page/topics.js";

/** Every card of every topic, in the topics' order. */
export function everyCard() {
  return TOPICS.flatMap(topicCards);
}

/** Every group of every topic, in the topics' order. */
export function everyGroup() {
  return TOPICS.flatMap((topic) => topic.groups);
}

/** The card that draws `figure`, as its topic lists it. */
export function cardOf(figure) {
  return everyCard().find((card) => card.figure === figure);
}
