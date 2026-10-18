/**
 * The fake page (`fake_page.js`): the document, window, fetch and animation frames `useFakePage` sets for one test and
 * removes after it, the files its fetch answers and the order it read them in, and an answer the page ships.
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { deferred, FakeElement, PAGE_ADDRESS, runFrames, shippedAnswer, useFakePage } from "./fake_page.js";

test("a file of the answers is fetched with its rows, any other a 404, and one added later is", async (context) => {
  const answers = { "data/all/a.json": [{ requests: 1 }] };
  useFakePage(context, { answers });
  const found = await fetch("data/all/a.json");
  assert.equal(found.ok, true);
  assert.deepEqual(await found.json(), [{ requests: 1 }]);
  const missing = await fetch("data/all/b.json");
  assert.deepEqual([missing.ok, missing.status, missing.statusText], [false, 404, "Not Found"]);
  answers["data/all/b.json"] = [];
  assert.equal((await fetch("data/all/b.json")).ok, true, "the answers are read at each fetch");
});

test("an answer given as a promise arrives as it resolves; one that rejects rejects the fetch", async (context) => {
  const arriving = deferred();
  const failing = deferred();
  useFakePage(context, { answers: { "a.json": arriving.promise, "b.json": failing.promise } });
  const reading = fetch("a.json");
  arriving.resolve([{ requests: 2 }]);
  assert.deepEqual(await (await reading).json(), [{ requests: 2 }]);
  const failed = fetch("b.json");
  failing.reject(new Error("the network failed"));
  await assert.rejects(failed, /the network failed/);
});

test("reads lists the files fetched, in order, and onRead is told of each before its answer", async (context) => {
  const arriving = deferred();
  const toldWhileWaiting = [];
  const page = useFakePage(context, {
    answers: { "a.json": arriving.promise, "b.json": [] },
    onRead: (file) => toldWhileWaiting.push(file),
  });
  const reading = fetch("a.json");
  assert.deepEqual(toldWhileWaiting, ["a.json"], "told before the answer has arrived");
  arriving.resolve([]);
  await reading;
  await fetch("b.json");
  await fetch("c.json");
  assert.deepEqual(page.reads, ["a.json", "b.json", "c.json"]);
  assert.deepEqual(toldWhileWaiting, page.reads);
});

test("the animation frames asked for wait in frames until runFrames runs them", (context) => {
  const page = useFakePage(context);
  const ran = [];
  requestAnimationFrame(() => ran.push("first"));
  requestAnimationFrame(() => ran.push("second"));
  assert.deepEqual(ran, []);
  assert.equal(page.frames.length, 2);
  runFrames(page.frames);
  assert.deepEqual(ran, ["first", "second"]);
  assert.deepEqual(page.frames, []);
});

test("the document finds the elements given and their descendants, and makes new elements", (context) => {
  const explorer = new FakeElement("section", "traffic-explorer");
  const row = new FakeElement("div");
  row.className = "controls-row";
  explorer.append(row);
  useFakePage(context, { elements: [new FakeElement("header"), explorer] });
  assert.equal(document.getElementById("traffic-explorer"), explorer);
  assert.equal(document.querySelector("#traffic-explorer .controls-row"), row);
  assert.deepEqual(document.querySelectorAll("section"), [explorer]);
  assert.equal(explorer.parentElement, null, "an element given keeps its own parent");
  assert.equal(document.createElement("p").tag, "p");
  assert.equal(document.activeElement, null);
  row.focus();
  assert.equal(document.activeElement, row);
});

test("the window is opened at the page's address and query, and its history moves its location", (context) => {
  const page = useFakePage(context, { query: "?family=kin#caching" });
  assert.equal(window.location.href, `${PAGE_ADDRESS}?family=kin#caching`);
  assert.equal(window.history, page.history);
  const popped = [];
  window.addEventListener("popstate", (event) => popped.push(event.state));
  page.history.pushState({ topic: "users" }, "", "#users");
  page.history.back();
  assert.equal(window.location.hash, "#caching");
  assert.deepEqual(popped, [null]);
});

test("the page's globals are removed after its test, and fetch is node's own again", async (context) => {
  const nodeFetch = globalThis.fetch;
  await context.test("a test on the fake page", (inner) => {
    useFakePage(inner);
    assert.notEqual(globalThis.fetch, nodeFetch);
    assert.equal(typeof new ResizeObserver(() => undefined).observe, "function");
  });
  for (const name of ["document", "window", "requestAnimationFrame", "ResizeObserver"]) {
    assert.equal(Object.hasOwn(globalThis, name), false, name);
  }
  assert.equal(globalThis.fetch, nodeFetch);
});

test("a shipped answer is the rows of its file under site/data/all, named as readAnswer names it", () => {
  const families = shippedAnswer("explore/daily_by_family");
  assert.ok(Array.isArray(families) && families.length > 0);
  assert.equal(typeof shippedAnswer("figures"), "object", "the figure answers' index");
});
