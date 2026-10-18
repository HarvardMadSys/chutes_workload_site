// The Team section (`sections/team.js`): each author one list item, with their name and their affiliation.
import assert from "node:assert/strict";
import { test } from "node:test";

import { renderTeam } from "../site/js/sections/team.js";

// The list items of the Team section's markup `html`, each as its markup between `<li>` and `</li>`.
function listItems(html) {
  return [...html.matchAll(/<li>(.*?)<\/li>/g)].map((match) => match[1]);
}

test("the Team section writes each author as one list item holding a name and an affiliation, neither empty", () => {
  const container = { innerHTML: "" };
  renderTeam(container);
  const items = listItems(container.innerHTML);
  assert.ok(items.length > 0);
  for (const item of items) {
    assert.match(item, /^<strong>[^<]+<\/strong><span>[^<]+<\/span>$/, item);
  }
});
