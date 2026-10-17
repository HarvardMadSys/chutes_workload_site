import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

import {
  choiceSeries, dailyRequests, endpointChoices, familyChoices, familyOrder, isSameChoice, modelChoices, modelOrder,
  OTHER_MODEL, PERIODS, periodDays, readTrafficChoice, rowsInChoice, trafficSummary, writeTrafficChoice,
} from "../site/js/traffic/traffic_filter.js";
import { ENDPOINT_SERIES, FAMILY_SERIES, MODEL_SERIES } from "../site/js/shared/series.js";
import { familyColours, modelColours } from "../site/js/theme/colours.js";

/** The rows of the shipped answer of the query `name`, as the page reads them. */
function shippedAnswer(name) {
  return JSON.parse(readFileSync(new URL(`../site/data/all/${name}.json`, import.meta.url), "utf8"));
}

// The rows of the shipped daily answer by family.
const SHIPPED_ROWS = shippedAnswer("explore/daily_by_family");

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

// The choice of everything: every family, every model, every endpoint group, every day.
const EVERYTHING = Object.freeze({ family: "", model: "", endpoint: "", period: "" });

test("the default choice writes no key and leaves every other key as it is", () => {
  const written = writeTrafficChoice(new URLSearchParams("tab=x&family=kin&model=id-a"), EVERYTHING);
  assert.equal(written.toString(), "tab=x");
});

test("a choice written to the URL reads back the same", () => {
  const choice = { family: "kin", model: "id-b", endpoint: "chat_stream", period: "2026-q1" };
  const written = writeTrafficChoice(new URLSearchParams("tab=x"), choice);
  assert.equal(written.toString(), "tab=x&family=kin&model=id-b&endpoint=chat_stream&period=2026-q1");
  assert.deepEqual(readTrafficChoice(written, FAMILY_VALUES, MODEL_VALUES), choice);
  const family = { ...EVERYTHING, family: "kin" };
  assert.equal(writeTrafficChoice(new URLSearchParams(""), family).toString(), "family=kin");
});

test("a URL value the explorer does not know falls back to the default, the others kept", () => {
  const params = new URLSearchParams("family=nope&model=id-a&endpoint=fax&period=2027-q1");
  assert.deepEqual(readTrafficChoice(params, FAMILY_VALUES, MODEL_VALUES), EVERYTHING);
  const mixed = new URLSearchParams("family=kin&model=other&endpoint=fax&period=2025-q3");
  assert.deepEqual(readTrafficChoice(mixed, FAMILY_VALUES, MODEL_VALUES), {
    family: "kin", model: OTHER_MODEL, endpoint: "", period: "2025-q3",
  });
});

test("a model key without its family, or not among the family's models, is dropped", () => {
  const withoutFamily = new URLSearchParams("model=id-a&endpoint=chat");
  assert.deepEqual(readTrafficChoice(withoutFamily, FAMILY_VALUES, MODEL_VALUES), { ...EVERYTHING, endpoint: "chat" });
  const outsideFamily = new URLSearchParams("family=kin&model=id-z");
  assert.deepEqual(readTrafficChoice(outsideFamily, FAMILY_VALUES, MODEL_VALUES), { ...EVERYTHING, family: "kin" });
});

test("two choices are the same when their family, model, endpoint group and period all are", () => {
  assert.equal(isSameChoice(EVERYTHING, { family: "", model: "", endpoint: "", period: "" }), true);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, family: "kin" }), false);
  assert.equal(isSameChoice({ ...EVERYTHING, model: "id-a" }, { ...EVERYTHING, model: "id-a" }), true);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, model: "id-a" }), false);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, endpoint: "chat" }), false);
  assert.equal(isSameChoice(EVERYTHING, { ...EVERYTHING, period: "2025-q3" }), false);
});

test("the periods are All and the four calendar quarters, by their keys and labels", () => {
  assert.deepEqual(PERIODS.map((period) => [period.value, period.label]), [
    ["", "All"], ["2025-q2", "Q2 '25"], ["2025-q3", "Q3 '25"], ["2025-q4", "Q4 '25"], ["2026-q1", "Q1 '26"],
  ]);
});

test("each period holds the shipped answer's days of its quarter; All holds every day, April 2026's twelve too", () => {
  const days = [...new Set(SHIPPED_ROWS.map((row) => row.day))];
  const spans = PERIODS.map((period) => {
    const held = periodDays(days, period.value);
    return [period.value, held[0], held.at(-1), held.length];
  });
  assert.deepEqual(spans, [
    ["", "2025-04-11", "2026-04-12", 367],
    ["2025-q2", "2025-04-11", "2025-06-30", 81],
    ["2025-q3", "2025-07-01", "2025-09-30", 92],
    ["2025-q4", "2025-10-01", "2025-12-31", 92],
    ["2026-q1", "2026-01-01", "2026-03-31", 90],
  ]);
});

test("a choice keeps the rows of its model, its endpoint group and its period's days", () => {
  const requests = (choice) => rowsInChoice(ROWS, { ...EVERYTHING, ...choice }).map((row) => row.requests);
  assert.deepEqual(requests({}), [10, 30, 50, 5, 20]);
  assert.deepEqual(requests({ family: "kin", model: "id-a" }), [10, 30]);
  assert.deepEqual(requests({ family: "kin", model: OTHER_MODEL }), [5]);
  assert.deepEqual(requests({ endpoint: "chat_stream" }), [30, 20]);
  assert.deepEqual(requests({ period: "2025-q3" }), [30, 50, 5]);
  assert.deepEqual(requests({ family: "kin", model: "id-b", period: "2025-q4" }), [20]);
});

test("an average divides by the requests that have the value: 490 of 1,000 recording a TTFT is 49%", () => {
  const rows = [
    modelRow({ requests: 600, input_tokens: 6000, input_counted: 600, ttft_sum: 98, ttft_counted: 490 }),
    modelRow({ requests: 400, input_tokens: 2000, input_counted: 400, output_tokens: 900, output_counted: 300 }),
  ];
  assert.deepEqual(trafficSummary(rows), {
    requests: 1000, inputAverage: 8, outputAverage: 3, ttftAverage: 0.2, ttftShare: 0.49,
  });
});

test("a summary of no requests has no averages and no share", () => {
  assert.deepEqual(trafficSummary([]), {
    requests: 0, inputAverage: null, outputAverage: null, ttftAverage: null, ttftShare: null,
  });
});

test("the bars are by family with no family chosen, by model with one, and by endpoint group with a model", () => {
  assert.equal(choiceSeries(EVERYTHING, undefined), FAMILY_SERIES);
  assert.equal(choiceSeries({ ...EVERYTHING, endpoint: "chat" }, undefined).column, "family");
  const byModel = choiceSeries({ ...EVERYTHING, family: "kin" }, "Kin");
  assert.deepEqual([byModel.column, byModel.order, byModel.colours], ["model", "models", MODEL_SERIES.colours]);
  assert.deepEqual(byModel.labels, { Other: "Other Kin" });
  assert.equal(choiceSeries({ ...EVERYTHING, family: "kin", model: "id-a" }, "Kin"), ENDPOINT_SERIES);
  assert.equal(choiceSeries({ ...EVERYTHING, family: "kin", model: OTHER_MODEL }, "Kin"), ENDPOINT_SERIES);
});

test("a family's other models fold into Other in the bars, summed per day", () => {
  const colours = modelColours(modelOrder(ROWS));
  assert.deepEqual(dailyRequests(ROWS, "model", colours), [
    { day: "2025-06-30", model: "A", requests: 10 },
    { day: "2025-07-01", model: "A", requests: 30 },
    { day: "2025-07-01", model: "B", requests: 50 },
    { day: "2025-07-01", model: "Other", requests: 5 },
    { day: "2025-10-01", model: "B", requests: 20 },
  ]);
});

test("the shipped answer by family adds up to the trace totals', so the tile equals the stats strip", () => {
  const [totals] = shippedAnswer("explore/trace_totals");
  assert.equal(trafficSummary(SHIPPED_ROWS).requests, totals.requests);
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

test("the family Other's other models are Rest of Other, in its drop-down and on its bars", () => {
  const texts = modelChoices(ROWS, "Other").map((choice) => choice.text);
  assert.deepEqual(texts, ["All Other models", "B", "A", "Rest of Other"]);
  assert.deepEqual(choiceSeries({ ...EVERYTHING, family: "other" }, "Other").labels, { Other: "Rest of Other" });
});

test("the shipped DeepSeek drop-down offers its eight models and Other DeepSeek", () => {
  const choices = modelChoices(shippedAnswer("explore/daily_by_model/deepseek"), "DeepSeek");
  assert.equal(choices.length, 10);
  assert.deepEqual([choices[0].text, choices.at(-1).text], ["All DeepSeek models", "Other DeepSeek"]);
  assert.equal(choices.at(-1).value, OTHER_MODEL);
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
