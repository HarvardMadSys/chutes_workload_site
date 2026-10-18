/**
 * The fake page's selectors (`fake_page.js`): an element found under another by a tag, a class, an id or a data
 * attribute, or by a chain of them; null or an empty list where none matches; an unread form failing.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { FakeElement } from "./fake_page.js";

// A new element of the tag `tag` holding `children`, its class `className`.
function element(tag, className, ...children) {
  const made = new FakeElement(tag);
  made.className = className;
  made.append(...children);
  return made;
}

test("a tag finds the elements of that tag, in document order", () => {
  const first = element("input", "");
  const second = element("input", "");
  const root = element("div", "", element("span", "", first), element("select", ""), second);
  assert.deepEqual(root.querySelectorAll("input"), [first, second]);
  assert.equal(root.querySelector("input"), first);
  assert.ok(first.matches("input"));
  assert.ok(!first.matches("span"));
});

test("a class finds a word of the element's className or a class set through classList", () => {
  const written = element("div", "place figure-body");
  const toggled = element("div", "");
  toggled.classList.toggle("is-hidden", true);
  const root = element("div", "", written, toggled);
  assert.equal(root.querySelector(".figure-body"), written);
  assert.equal(root.querySelector(".is-hidden"), toggled);
  assert.equal(root.querySelector(".figure"), null, "a part of a word is not the word");
  toggled.classList.toggle("is-hidden", false);
  assert.equal(root.querySelector(".is-hidden"), null);
});

test("an id finds the element of that id", () => {
  const explorer = new FakeElement("section", "traffic-explorer");
  const root = element("main", "", new FakeElement("section", "insights"), explorer);
  assert.equal(root.querySelector("#traffic-explorer"), explorer);
  assert.ok(!explorer.matches("#insights"));
});

test("a data attribute finds the elements that have it, or that have it with the value given", () => {
  const first = element("li", "");
  first.setAttribute("data-key", "first");
  const second = element("li", "");
  second.setAttribute("data-key", "second");
  const root = element("ul", "", element("li", ""), first, second);
  assert.deepEqual(root.querySelectorAll("[data-key]"), [first, second]);
  assert.equal(root.querySelector('[data-key="second"]'), second);
  assert.equal(root.querySelector('[data-key="third"]'), null, "a wrong value misses");
});

test("a chain finds each next selector under a match of the one before", () => {
  const inTrack = element("input", "");
  const track = element("div", "range-track", element("div", "range-span"), inTrack);
  const elsewhere = element("input", "");
  const root = element("div", "", element("div", "range-days", elsewhere), track);
  assert.deepEqual(root.querySelectorAll(".range-track input"), [inTrack]);
  assert.equal(root.querySelector(".range-days .range-track"), null);
});

test("a chain whose matches nest finds each element once, in document order", () => {
  const inner = element("span", "b");
  const outer = element("div", "b", inner);
  const root = element("div", "", element("div", "a", element("div", "a", outer)), element("p", "b"));
  assert.deepEqual(root.querySelectorAll(".a .b"), [outer, inner], "found under both .a, listed once");
});

test("a selector that finds nothing gives null or an empty list", () => {
  const root = element("div", "", element("p", "loading"));
  assert.equal(root.querySelector(".note"), null);
  assert.deepEqual(root.querySelectorAll("button"), []);
  assert.equal(root.querySelector("p p"), null, "an element is not under itself");
});

test("a selector of a form the fake does not read throws, naming it", () => {
  const root = element("div", "", element("p", "loading"));
  assert.throws(() => root.querySelector("p.loading"), /"p\.loading"/);
  assert.throws(() => root.querySelector(".a > .b"), /">"/);
  assert.throws(() => root.querySelectorAll("[aria-label]"), /"\[aria-label\]"/);
});
