import assert from "node:assert/strict";
import { test } from "node:test";

import { renderHero } from "../site/js/landing/hero.js";
import { monthCountText } from "../site/js/shared/layout.js";

test("the lede's first words count the months in digits, one month in the singular, and say One year unknown", () => {
  assert.equal(monthCountText(13), "13 months");
  assert.equal(monthCountText(1), "1 month");
  assert.equal(monthCountText(null), "One year");
});

test("with no count the lede reads as one year of the trace", () => {
  const container = { innerHTML: "" };
  renderHero(container, null);
  assert.match(container.innerHTML, /<p class="hero-lede">One year of production LLM serving on Chutes: every request's timing, tokens, model, user and instance\.<\/p>/);
});

test("the title is the page's h1, the hero section's label, and the five buttons and the lab's name lead to their addresses", () => {
  const container = { innerHTML: "" };
  renderHero(container, 13);
  assert.match(container.innerHTML, /<h1 id="hero-title">Chutes <em>Production Trace<\/em><\/h1>/);
  const buttons = [...container.innerHTML.matchAll(/<a class="button[^"]*" href="([^"]*)"[^>]*>([^<]*)<\/a>/g)];
  assert.deepEqual(buttons.map((match) => [match[2], match[1]]), [
    ["Traffic Explorer", "#traffic"],
    ["Insights", "#insights"],
    ["Dataset", "https://huggingface.co/datasets/harvardMadsys/chutes_metadata"],
    ["Paper", "https://arxiv.org/abs/2608.13573"],
    ["Code", "https://github.com/HarvardMadSys/chutes_workload"],
  ]);
  assert.match(container.innerHTML, /<a class="affiliation" href="https:\/\/madsys\.seas\.harvard\.edu\/" target="_blank" rel="noopener">/);
});

test("the two site buttons come first, the Traffic Explorer's the primary one, and open on this tab", () => {
  const container = { innerHTML: "" };
  renderHero(container, 13);
  const buttons = [...container.innerHTML.matchAll(/<a class="([^"]*)" href="[^"]*"([^>]*)>([^<]*)<\/a>/g)];
  assert.deepEqual(buttons.slice(0, 2).map((match) => [match[3], match[1], match[2]]), [
    ["Traffic Explorer", "button button--primary", ""],
    ["Insights", "button", ""],
  ]);
  assert.equal(container.innerHTML.split("button--primary").length - 1, 1);
});
