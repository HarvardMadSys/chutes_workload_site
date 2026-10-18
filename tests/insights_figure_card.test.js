// A figure card (`insights/figure_card.js`): the parameters every card's and panel's chart names, a card's element, its
// words placed in order and its Definition control, the answers it reads, a frozen topic, its chart's parameters, and
// an answer's error. Every card against its shipped answer is `insights_cards_answers.test.js`'s.
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  CHART_KINDS, chartParameters, drawFigureChart, frozenTopic, newCardElement, renderFigureCard,
} from "../site/js/insights/figure_card.js";
import { AXIS_OPTION_NAMES } from "../site/js/plot/axes.js";
import { FakeElement, useFakePage } from "./fake_page.js";
import { everyCard } from "./insights_fixtures.js";

// The page's mixes as `page/start.js` promises them, the endpoint mix of one group.
const MIXES = Object.freeze({ endpoints: Promise.resolve([{ endpoint_group: "chat", requests: 1 }]) });

// A card as a topic lists it.
const CARD = Object.freeze({
  figure: "fig_a",
  title: "Daily request rate",
  insight: "Aggregate demand is non-stationary.",
  caption: "Requests rise, peak and decline.",
  definition: "Requests per day.",
  kind: "lines",
  chart: { valueLabel: "Requests" },
});

// The names among the keys of `object` that are not in `allowed`.
function unknownNames(object, allowed) {
  return Object.keys(object).filter((name) => !allowed.includes(name));
}

test("every card's and panel's chart names only parameters its kind reads, its axes only axis options", () => {
  for (const card of everyCard()) {
    const kind = CHART_KINDS[card.kind];
    const charts = [kind.defaults, card.chart];
    for (const entry of card.panels ?? []) {
      charts.push(entry.chart);
    }
    for (const chart of charts) {
      const unread = unknownNames(chart, kind.parameterNames);
      assert.deepEqual(unread, [], `${card.figure}: the kind ${card.kind} reads no parameter ${unread}`);
      for (const axis of [chart.x, chart.y]) {
        if (axis !== undefined) {
          const unknown = unknownNames(axis, AXIS_OPTION_NAMES);
          assert.deepEqual(unknown, [], `${card.figure}: no axis option is named ${unknown}`);
        }
      }
    }
  }
});

test("a card is an article carrying its figure's name, and a wide card is marked wide", (context) => {
  useFakePage(context);
  const element = newCardElement(CARD);
  assert.equal(element.tag, "article");
  assert.equal(element.className, "card");
  assert.equal(element.dataset.figure, "fig_a");
  assert.equal(newCardElement({ ...CARD, isWide: true }).className, "card is-wide");
});

test("a card shows its title, insight, legend place, chart place, caption and Definition control in order", (context) => {
  useFakePage(context);
  const container = new FakeElement("article");
  const body = renderFigureCard(container, CARD);
  const [figure] = container.children;
  assert.deepEqual(figure.children.map((part) => part.className), [
    "figure-title", "figure-insight", "figure-legend legend", "figure-body", "figure-caption", "figure-definition",
  ]);
  const [title, insight, , place, caption] = figure.children;
  assert.deepEqual([title.tag, title.textContent], ["h4", CARD.title]);
  assert.equal(insight.textContent, CARD.insight);
  assert.equal(caption.textContent, CARD.caption);
  assert.equal(place, body);
  assert.equal(body.children[0].className, "loading");
});

test("the Definition control opens on the definition alone, with no link and no line of rows", (context) => {
  useFakePage(context);
  const container = new FakeElement("article");
  renderFigureCard(container, CARD);
  const details = container.children[0].children[5];
  assert.equal(details.tag, "details");
  assert.deepEqual(details.children.map((part) => part.tag), ["summary", "p"]);
  assert.equal(details.querySelector(".figure-definition-text").textContent, CARD.definition);
  assert.equal(details.querySelector(".figure-rows"), null);
});

test("a card of the endpoints' palette takes their order from the page's mixes and reads its answer alone",
  async (context) => {
    const page = useFakePage(context);
    context.mock.method(console, "error", () => undefined); // the answer is missing, and its error is logged
    await drawFigureChart(new FakeElement("div"), { ...CARD, palette: "endpoints" }, MIXES);
    assert.deepEqual(page.reads, ["data/all/figures/fig_a.json"]);
  });

test("a frozen topic holds only frozen objects and lists, its cards' too, and its functions as they were", () => {
  const tickFormat = (value) => `${value}`;
  const topic = frozenTopic({
    id: "insights-a",
    title: "A",
    takeaway: "A takeaway.",
    groups: [{
      heading: "A group",
      takeaway: "Its takeaway.",
      cards: [{
        ...CARD,
        series: ["Global"],
        chart: { x: { label: "Day", domain: [0, 1], tickFormat }, dashed: ["Global"] },
        panels: [{ panel: "a", title: "(a)", chart: { y: { log: true } } }],
      }],
    }],
  });
  const [group] = topic.groups;
  const [card] = group.cards;
  const parts = [topic, topic.groups, group, group.cards];
  parts.push(card, card.series, card.chart, card.chart.x, card.chart.x.domain, card.chart.dashed, card.panels);
  parts.push(card.panels[0], card.panels[0].chart, card.panels[0].chart.y);
  assert.ok(parts.every((part) => Object.isFrozen(part)));
  assert.equal(card.chart.x.tickFormat, tickFormat);
  assert.ok(!Object.isFrozen(tickFormat));
});

test("a chart's parameters are its kind's, then the card's, then a panel's with the panel's name", () => {
  const card = { ...CARD, kind: "cdf", chart: { valueLabel: "Tokens", markers: true } };
  assert.deepEqual(chartParameters(card), { cdf: true, valueLabel: "Tokens", markers: true });
  const entry = { panel: "a", title: "(a)", chart: { valueLabel: "Hit ratio" } };
  assert.deepEqual(chartParameters(card, entry), { cdf: true, valueLabel: "Hit ratio", markers: true, panel: "a" });
  const shares = chartParameters({ ...CARD, kind: "stacked_bars" });
  assert.deepEqual([shares.xColumn, shares.seriesColumn, shares.valueColumn], ["x", "series", "value"]);
});

test("an answer that cannot be read shows its error in the chart's place", async (context) => {
  useFakePage(context); // the fake page answers no file, so the card's answer is a 404
  context.mock.method(console, "error", () => undefined); // the error is logged as well as shown; keep the run quiet
  const body = new FakeElement("div");
  await drawFigureChart(body, CARD, MIXES);
  const [note] = body.children;
  assert.equal(note.className, "note is-error");
  assert.match(note.textContent, /data\/all\/figures\/fig_a\.json: 404/);
});
