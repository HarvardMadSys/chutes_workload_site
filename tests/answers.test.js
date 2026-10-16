import assert from "node:assert/strict";
import { test } from "node:test";

import { readAnswer } from "../site/js/shared/answers.js";

// The trace totals' answer as the data step writes it: whole numbers as JSON numbers, a ratio as a float.
const ANSWER_TEXT = '[{"requests":10967,"input_tokens":207377727534,"hit_ratio":0.63,"month":"2025-04"}]';

/**
 * A stand-in for the page's `fetch` that answers each file of `files` (a map from path to text) and 404s any other,
 * recording every path asked for in `asked`.
 */
function fakeFetch(files, asked) {
  async function fetchFile(file) {
    asked.push(file);
    const text = files[file];
    if (text === undefined) {
      return { ok: false, status: 404, statusText: "Not Found" };
    }
    return { ok: true, json: async () => JSON.parse(text) };
  }
  return fetchFile;
}

test("an answer is read from its file under data/all/, and nothing else is fetched", async (context) => {
  const asked = [];
  context.mock.method(globalThis, "fetch", fakeFetch({ "data/all/explore/trace_totals.json": ANSWER_TEXT }, asked));
  assert.deepEqual(await readAnswer("explore/trace_totals"), JSON.parse(ANSWER_TEXT));
  assert.deepEqual(asked, ["data/all/explore/trace_totals.json"]);
});

test("a missing answer file is an error naming the file", async (context) => {
  context.mock.method(globalThis, "fetch", fakeFetch({}, []));
  await assert.rejects(readAnswer("explore/model_mix"), /data\/all\/explore\/model_mix\.json: 404/);
});

test("a figure's answer is read from its file under data/all/figures/", async (context) => {
  const asked = [];
  const rows = '[{"series":"Requests","x":0,"y":1638068}]';
  context.mock.method(globalThis, "fetch", fakeFetch({ "data/all/figures/fig_request_rate_day.json": rows }, asked));
  assert.deepEqual(await readAnswer("figures/fig_request_rate_day"), JSON.parse(rows));
  assert.deepEqual(asked, ["data/all/figures/fig_request_rate_day.json"]);
});
