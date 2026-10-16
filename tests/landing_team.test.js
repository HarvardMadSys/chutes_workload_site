import assert from "node:assert/strict";
import { test } from "node:test";

import { renderTeam } from "../site/js/landing/team.js";

// The authors' names and affiliations as the Team section writes them, in the order it writes them.
function authorsOf(html) {
  const authors = [];
  for (const match of html.matchAll(/<li><strong>([^<]+)<\/strong><span>([^<]+)<\/span><\/li>/g)) {
    authors.push([match[1], match[2]]);
  }
  return authors;
}

test("the Team section lists the paper's five authors in its order, each with their affiliation", () => {
  const container = { innerHTML: "" };
  renderTeam(container);
  assert.deepEqual(authorsOf(container.innerHTML), [
    ["William Nixon", "UChicago & Harvard"],
    ["Jon Durbin", "Chutes"],
    ["Florian Standhartinger", "Chutes"],
    ["Haryadi S. Gunawi", "UChicago"],
    ["Juncheng Yang", "Harvard"],
  ]);
});
