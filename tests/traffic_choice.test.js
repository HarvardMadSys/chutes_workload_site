/**
 * The Traffic Explorer's choice (`traffic/traffic_choice.js`): its URL keys read and written, its metrics, and the
 * drop-downs' entries.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  endpointChoices, familyChoices, familyOrder, isSameChoice, metricChoices, metricOf, METRICS, modelChoices,
  OTHER_MODEL, readTrafficChoice, writeTrafficChoice,
} from "../site/js/traffic/traffic_choice.js";
import { familyColours } from "../site/js/theme/colours.js";

/** The rows of the shipped answer of the query `name`, as the page reads them. */
function shippedAnswer(name) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/${name}.json`, import.meta.url), "utf8"));
}

// The rows of the shipped daily answer by family, and the trace's days, theirs.
const SHIPPED_ROWS = shippedAnswer("explore/daily_by_family");
const TRACE_DAYS = [...new Set(SHIPPED_ROWS.map((row) => row.day))];

// A row of the family Kin's daily answer by model, with every count zero but those given.
function modelRow(fields) {
  return {
    day: "2025-07-01", chute_id: null, model: "Other Kin", endpoint_group: "chat", requests: 0,
    input_tokens: null, input_counted: 0, output_tokens: null, output_counted: 0, ttft_sum: null, ttft_counted: 0,
    ...fields,
  };
}

// A family's two named models and its Other over three days and two endpoint groups.
const ROWS = [
  modelRow({ day: "2025-06-30", chute_id: "id-a", model: "A", requests: 10 }),
  modelRow({ day: "2025-07-01", chute_id: "id-a", model: "A", endpoint_group: "chat_stream", requests: 30 }),
  modelRow({ day: "2025-07-01", chute_id: "id-b", model: "B", requests: 50 }),
  modelRow({ day: "2025-07-01", requests: 5 }),
  modelRow({ day: "2025-10-01", chute_id: "id-b", model: "B", endpoint_group: "chat_stream", requests: 20 }),
];

// The family drop-down's values, and the model drop-down's for the family `kin`.
const FAMILY_VALUES = ["", "kin", "other"];
const MODEL_VALUES = ["", "id-a", "id-b", OTHER_MODEL];

// The choice of everything: every family, every model, every endpoint group, requests, every day.
const EVERYTHING = Object.freeze({ family: "", model: "", endpoint: "", metric: "", from: "", to: "" });

/** The choice the URL query `query` names over the trace's days, for the family `kin` and its models. */
function readQuery(query) {
  return readTrafficChoice(new URLSearchParams(query), FAMILY_VALUES, MODEL_VALUES, TRACE_DAYS);
}

test("the default choice writes no key and leaves every other key as it is", () => {
  const params = new URLSearchParams("tab=x&family=kin&model=id-a&metric=input_tokens&from=2025-07-01");
  assert.equal(writeTrafficChoice(params, EVERYTHING).toString(), "tab=x");
});

test("a choice written to the URL reads back the same, its metric and days too", () => {
  const choice = {
    family: "kin", model: "id-b", endpoint: "chat_stream", metric: "input_tokens", from: "2025-07-01", to: "2025-09-30",
  };
  const written = writeTrafficChoice(new URLSearchParams("tab=x"), choice);
  assert.equal(
    written.toString(),
    "tab=x&family=kin&model=id-b&endpoint=chat_stream&metric=input_tokens&from=2025-07-01&to=2025-09-30",
  );
  assert.deepEqual(readQuery(written.toString()), choice);
  const family = { ...EVERYTHING, family: "kin" };
  assert.equal(writeTrafficChoice(new URLSearchParams(""), family).toString(), "family=kin");
  const tokens = { ...EVERYTHING, metric: "output_tokens", to: "2026-01-15" };
  assert.deepEqual(readQuery("metric=output_tokens&to=2026-01-15"), tokens);
});

test("a URL value the explorer does not know falls back to the default, the others kept", () => {
  assert.deepEqual(readQuery("family=nope&model=id-a&endpoint=fax&metric=requests"), EVERYTHING);
  assert.deepEqual(readQuery("family=kin&model=other&endpoint=fax&metric=ttft&from=2025-07-01"), {
    ...EVERYTHING, family: "kin", model: OTHER_MODEL, from: "2025-07-01",
  });
});

test("a key the choice does not hold, such as a period, is neither read nor written", () => {
  assert.deepEqual(readQuery("period=2025-q3"), EVERYTHING);
  assert.equal(writeTrafficChoice(new URLSearchParams("period=2025-q3"), EVERYTHING).toString(), "period=2025-q3");
});

test("a model key without its family, or not among the family's models, is dropped", () => {
  assert.deepEqual(readQuery("model=id-a&endpoint=chat"), { ...EVERYTHING, endpoint: "chat" });
  assert.deepEqual(readQuery("family=kin&model=id-z"), { ...EVERYTHING, family: "kin" });
});

test("days outside the trace's, or at its ends, are clipped to them; a from after its to drops both", () => {
  assert.deepEqual(readQuery("from=2024-01-01&to=2025-05-01"), { ...EVERYTHING, to: "2025-05-01" });
  assert.deepEqual(readQuery("from=2025-04-11&to=2026-04-12"), EVERYTHING);
  assert.deepEqual(readQuery("from=2027-01-01&to=2024-01-01"), EVERYTHING);
  assert.deepEqual(readQuery("from=2027-01-01"), { ...EVERYTHING, from: "2026-04-12" });
  assert.deepEqual(readQuery("to=2024-01-01"), { ...EVERYTHING, to: "2025-04-11" });
  assert.deepEqual(readQuery("from=2025-09-30&to=2025-07-01"), EVERYTHING);
  const oneDay = { ...EVERYTHING, from: "2025-07-01", to: "2025-07-01" };
  assert.deepEqual(readQuery("from=2025-07-01&to=2025-07-01"), oneDay);
});

test("two choices are the same when their family, model, endpoint group, metric and days all are", () => {
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING }), true);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, family: "kin" }), false);
  assert.equal(isSameChoice({ ...EVERYTHING, model: "id-a" }, { ...EVERYTHING, model: "id-a" }), true);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, model: "id-a" }), false);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, endpoint: "chat" }), false);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, metric: "input_tokens" }), false);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, from: "2025-07-01" }), false);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, to: "2025-07-01" }), false);
});

test("the families are ordered by their requests, Other last, whatever its requests", () => {
  const rows = [
    { family: "Other", family_slug: "other", requests: 50 },
    { family: "Kin", family_slug: "kin", requests: 10 },
    { family: "Clan", family_slug: "clan", requests: 20 },
    { family: "Kin", family_slug: "kin", requests: 15 },
  ];
  assert.deepEqual(familyOrder(rows), [
    { family: "Kin", family_slug: "kin", requests: 25 },
    { family: "Clan", family_slug: "clan", requests: 20 },
    { family: "Other", family_slug: "other", requests: 50 },
  ]);
  assert.deepEqual(familyChoices(familyOrder(rows)), [
    { value: "", text: "All families" }, { value: "kin", text: "Kin" }, { value: "clan", text: "Clan" },
    { value: "other", text: "Other" },
  ]);
});

test("the shipped family drop-down offers All families, the ten named families by requests, then Other", () => {
  const texts = familyChoices(familyOrder(SHIPPED_ROWS)).map((choice) => choice.text);
  assert.equal(texts.length, 12);
  assert.deepEqual([texts[0], texts[1], texts.at(-1)], ["All families", "DeepSeek", "Other"]);
  assert.equal(familyColours(familyOrder(SHIPPED_ROWS)).size, 11, "every family has a colour of its own");
});

test("a family's model drop-down offers its named models by requests, then Other <family> where it has a rest", () => {
  assert.deepEqual(modelChoices(ROWS, "Kin"), [
    { value: "", text: "All Kin models" },
    { value: "id-b", text: "B" },
    { value: "id-a", text: "A" },
    { value: OTHER_MODEL, text: "Other Kin" },
  ]);
  const named = ROWS.filter((row) => row.chute_id !== null);
  assert.deepEqual(modelChoices(named, "Kin").map((choice) => choice.text), ["All Kin models", "B", "A"]);
});

test("the family Other's other models are Rest of Other in its drop-down", () => {
  const texts = modelChoices(ROWS, "Other").map((choice) => choice.text);
  assert.deepEqual(texts, ["All Other models", "B", "A", "Rest of Other"]);
});

test("the shipped DeepSeek drop-down offers its eight models and Other DeepSeek", () => {
  const choices = modelChoices(shippedAnswer("explore/daily_by_model/deepseek"), "DeepSeek");
  assert.equal(choices.length, 10);
  assert.deepEqual([choices[0].text, choices.at(-1).text], ["All DeepSeek models", "Other DeepSeek"]);
  assert.equal(choices.at(-1).value, OTHER_MODEL);
});

test("the metric drop-down offers requests, the default, then input and output tokens", () => {
  assert.deepEqual(metricChoices().map((choice) => [choice.value, choice.text]), [
    ["", "Requests"], ["input_tokens", "Input tokens"], ["output_tokens", "Output tokens"],
  ]);
});

test("the endpoint drop-down offers every endpoint group by its label", () => {
  assert.deepEqual(endpointChoices().map((choice) => [choice.value, choice.text]), [
    ["", "All endpoints"],
    ["chat", "Chat"],
    ["chat_stream", "Chat stream"],
    ["completion", "Completion"],
    ["completion_stream", "Completion stream"],
    ["other", "Other"],
  ]);
});

test("each metric is found by its value, with the column it sums and the bars' words for it", () => {
  for (const metric of METRICS) {
    assert.equal(metricOf(metric.value), metric);
  }
  assert.deepEqual(metricOf("input_tokens"), {
    value: "input_tokens", text: "Input tokens", column: "input_tokens", title: "Input tokens per day",
    valueLabel: "Input tokens", note: " Tokens are summed over the requests that record them.",
  });
  assert.equal(metricOf("ttft"), undefined);
});
