/**
 * The Insights' tests' fixtures: every card and every group of the topics as `page/topics.js` lists them, the card
 * that draws a figure, and the tick labels of its chart's axis.
 */

import { chartParameters } from "../site/js/insights/figure_card.js";
import { TOPICS, topicCards } from "../site/js/page/topics.js";
import { axisTicks } from "../site/js/plot/axes.js";

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

/** The tick labels of the axis `axis` ("x" or "y") of the chart of `figure`, as the axis writes them. */
export function tickLabels(figure, axis) {
  const options = chartParameters(cardOf(figure))[axis];
  return axisTicks(options, []).map(options.tickFormat);
}
