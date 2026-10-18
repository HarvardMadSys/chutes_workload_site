// The answers (`shared/answers.js`): an answer read from its file under data/all/, a missing file's error naming it, a
// figure's answer, and the head's preload of the explorer's first answer.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import { readAnswer } from "../site/js/shared/answers.js";
import { FAMILY_QUERY } from "../site/js/traffic/traffic.js";
import { useFakePage } from "./fake_page.js";

// The trace totals' answer: whole numbers, and a ratio.
const TOTALS_ROWS = [{ requests: 10967, input_tokens: 207377727534, hit_ratio: 0.63, month: "2025-04" }];

test("an answer is read from its file under data/all/, and nothing else is fetched", async (context) => {
  const page = useFakePage(context, { answers: { "data/all/explore/trace_totals.json": TOTALS_ROWS } });
  assert.deepEqual(await readAnswer("explore/trace_totals"), TOTALS_ROWS);
  assert.deepEqual(page.reads, ["data/all/explore/trace_totals.json"]);
});

test("a missing answer file is an error naming the file", async (context) => {
  useFakePage(context);
  await assert.rejects(readAnswer("explore/no_such_query"), /data\/all\/explore\/no_such_query\.json: 404/);
});

test("a figure's answer is read from its file under data/all/figures/", async (context) => {
  const rows = [{ series: "Requests", x: 0, y: 1638068 }];
  const page = useFakePage(context, { answers: { "data/all/figures/fig_request_rate_day.json": rows } });
  assert.deepEqual(await readAnswer("figures/fig_request_rate_day"), rows);
  assert.deepEqual(page.reads, ["data/all/figures/fig_request_rate_day.json"]);
});

/** The `href` of every `<link rel="preload">` in the page's head, in order. */
function preloadedFiles() {
  const page = readFileSync(new URL("../site/index.html", import.meta.url), "utf8");
  return [...page.matchAll(/<link rel="preload" href="([^"]+)"/g)].map((match) => match[1]);
}

test("the page's head preloads the file of the answer the explorer reads first, and nothing else", async (context) => {
  const page = useFakePage(context);
  await assert.rejects(readAnswer(FAMILY_QUERY));
  assert.deepEqual(preloadedFiles(), page.reads);
});
