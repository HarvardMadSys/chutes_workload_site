/**
 * The fake element (`fake_element.js`): an element found under another by a tag, a class, an id or a data attribute,
 * or by a chain of them; null or an empty list where none matches; an unread form failing; its parent set when it is
 * appended, its nearest ancestor that a selector matches, and the elements of the markup written into it.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { FakeElement } from "./fake_element.js";

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

test("the selectors the browser reads and the fake does not, a :not(), a comma or a class's end, throw", () => {
  const root = element("div", "", element("svg", ""));
  assert.throws(() => root.querySelectorAll('svg:not(svg svg):not([class$="-ramp"])'), /"svg:not\(svg"/);
  assert.throws(() => root.querySelector(".a, .b"), /"\.a,"/);
  assert.throws(() => root.querySelector('[class$="-ramp"]'), /"\[class\$="-ramp"\]"/);
  assert.throws(() => root.closest(".a > .b"), /"\.a > \.b"/);
});

test("an element has no parent until it is appended, and append and replaceChildren set its parent", () => {
  const first = new FakeElement("p");
  const second = new FakeElement("p");
  assert.equal(first.parentElement, null);
  const place = new FakeElement("div");
  place.append(first, "a text, which has no parent");
  assert.equal(first.parentElement, place);
  const other = new FakeElement("div");
  other.replaceChildren(second);
  assert.equal(second.parentElement, other);
  assert.deepEqual(other.children, [second]);
});

test("closest finds the element itself or its nearest ancestor that matches, or null", () => {
  const body = element("div", "figure-body");
  const figure = element("div", "figure", element("div", "figure-legend"), body);
  const card = element("article", "card figure", figure);
  assert.equal(body.closest(".figure"), figure, "the nearest, not the card further up");
  assert.equal(figure.closest(".figure"), figure, "an element is its own closest");
  assert.equal(body.closest("article"), card);
  assert.equal(body.closest(".note"), null);
  assert.equal(body.closest(".figure").querySelector(".figure-legend").className, "figure-legend");
});

test("markup written as innerHTML is read back, its elements of a tag, a class and text the children", () => {
  const details = new FakeElement("details");
  const markup = `
    <summary>Definition</summary>
    <p class="figure-definition-text"></p>`;
  details.innerHTML = markup;
  assert.equal(details.innerHTML, markup);
  assert.deepEqual(details.children.map((child) => [child.tag, child.className, child.textContent]), [
    ["summary", "", "Definition"], ["p", "figure-definition-text", ""],
  ]);
  assert.equal(details.querySelector(".figure-definition-text"), details.children[1]);
  assert.equal(details.children[1].parentElement, details);
});

test("markup of another form stays only in the string, and writing markup again replaces the children", () => {
  const place = new FakeElement("div");
  place.innerHTML = '<p class="a">One</p>';
  place.innerHTML = '<a href="index.html">Home</a><p id="b">Two</p><div class="c"><p>Three</p></div>';
  assert.deepEqual(place.children.map((child) => [child.tag, child.textContent]), [["p", "Three"]]);
  assert.match(place.innerHTML, /href="index\.html"/);
});
