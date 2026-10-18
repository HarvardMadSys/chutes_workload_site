/**
 * The Load balancing topic's routing simulation figure, as its card's `series` and `panels` (`FigureCard` of
 * `insights/figure_card.js`): two rows, one per model, of four panels each, every panel drawing the model's four
 * routing policies; and the policies' colours and legend, each policy in one colour for every model and listed once
 * (the card's `palette: "policies"`, `insights/card_series.js`). The words are the figure's own; a line marked
 * "placeholder" is not the paper's own, for the authors to review.
 */

import { formatCountTick } from "../shared/format.js";
import { OTHER_SERIES, SERIES_SLOTS } from "../theme/colours.js";

// The routing figure's two models, as its answer's series and its panel titles name them.
const ROUTING_DEEPSEEK = "DeepSeek V3.2";
const ROUTING_MINIMAX = "MiniMax M2.5";
// The routing figure's four policies, in the paper's legend order, each in its colour of `POLICY_COLOURS`
// (`palette: "policies"`), whose legend lists each policy once for both models.
const ROUTING_POLICIES = Object.freeze(["Round-robin", "Load-first", "Cache-first", "Sticky"]);

// Between a routing series' model and its policy: "MiniMax M2.5, Sticky".
const POLICY_SEPARATOR = ", ";

// Each routing policy's colour. Round-robin, the cache-blind baseline, is the Other grey, so the three policies that
// route by load or by cache stand out against it; those take the slots 1, 8 and 3, blue, red and green, far apart in
// hue.
const POLICY_COLOURS = Object.freeze({
  "Round-robin": OTHER_SERIES,
  "Load-first": SERIES_SLOTS[0],
  "Cache-first": SERIES_SLOTS[7],
  Sticky: SERIES_SLOTS[2],
});

// The routing panels' x axes: the cache size of an instance, on the paper's 10³ to past 10⁶, and the instances.
const CACHE_SIZE_AXIS = Object.freeze({
  label: "Instance cache size", log: true, domain: [1e3, 6e6], tickFormat: formatCountTick,
});
const INSTANCES_AXIS = Object.freeze({ label: "Instances", ticks: [5, 10, 15, 20], tickFormat: String });

// DeepSeek V3.2's y domains in the routing panels, each a little past its lines' ends, so that no line lies on the
// axis line: the hit ratio (a) and the load imbalance (d) from zero, the hit ratio's as the paper's, and the
// replication (b, c) from a little under 1, the least a replication can be.
const DEEPSEEK_ROUTING_DOMAINS = Object.freeze({
  hitRatio: [0, 0.55],
  replication: [0.9, 2.0],
  imbalance: [0, 2.5],
});

// MiniMax M2.5's y domains in the routing panels, as DeepSeek V3.2's.
const MINIMAX_ROUTING_DOMAINS = Object.freeze({
  hitRatio: [0, 0.7],
  replication: [0.9, 2.7],
  imbalance: [0, 4.5],
});

/**
 * The policy of a routing series named "<model>, <policy>": what follows its last ", ". Throws a RangeError naming a
 * series with no policy in its name.
 */
export function seriesPolicy(name) {
  const separator = name.lastIndexOf(POLICY_SEPARATOR);
  if (separator === -1) {
    throw new RangeError(`the series "${name}" names no policy after "${POLICY_SEPARATOR}"`);
  }
  return name.slice(separator + POLICY_SEPARATOR.length);
}

/**
 * A figure card's colours where its series are named "<model>, <policy>", as the routing figure's: a Map from each of
 * `names`, in order, to its policy's colour of `POLICY_COLOURS`, so that one policy has one colour for every model.
 * Throws a RangeError naming a series with no policy in its name, or a policy with no colour.
 */
export function policyColours(names) {
  const colours = new Map();
  for (const name of names) {
    const policy = seriesPolicy(name);
    if (!Object.hasOwn(POLICY_COLOURS, policy)) {
      throw new RangeError(`the series "${name}" names the policy "${policy}", which has no colour`);
    }
    colours.set(name, POLICY_COLOURS[policy]);
  }
  return colours;
}

/**
 * The legend of routing series named "<model>, <policy>" (`series`, `[{ name }]`, coloured by `colours`, a Map from
 * series name to colour): one entry per policy, in the order the policies first appear, `{ name, label, names }`, the
 * policy as name and label and `names` the series of that policy, one per model, which its button hides and shows
 * together; its colours, a Map from policy to the colour its series share; and no series dashed.
 */
export function policyLegend(series, colours) {
  const entries = new Map();
  for (const { name } of series) {
    const policy = seriesPolicy(name);
    if (!entries.has(policy)) {
      entries.set(policy, { name: policy, label: policy, names: [] });
    }
    entries.get(policy).names.push(name);
  }
  const entryColours = new Map();
  for (const entry of entries.values()) {
    entryColours.set(entry.name, colours.get(entry.names[0]));
  }
  return { series: [...entries.values()], colours: entryColours, dashed: [] };
}

/**
 * The routing figure's series, in the order drawn and listed: DeepSeek V3.2's four policies, then MiniMax M2.5's, each
 * "<model>, <policy>" as the answer names it.
 */
export function routingFigureSeries() {
  return [...routingSeries(ROUTING_DEEPSEEK), ...routingSeries(ROUTING_MINIMAX)];
}

/** The routing figure's eight panels: DeepSeek V3.2's row of four, then MiniMax M2.5's. */
export function routingFigurePanels() {
  return [
    ...routingRow(ROUTING_DEEPSEEK, DEEPSEEK_ROUTING_DOMAINS),
    ...routingRow(ROUTING_MINIMAX, MINIMAX_ROUTING_DOMAINS),
  ];
}

// The routing figure's row of one model, its four panels: hit ratio (a) and replication (b) against cache size,
// replication (c) and load imbalance (d) against the instances, each drawing only the model's four series, titled
// with `model` and on the y domains of `domains`.
// placeholder: the panel titles are the figure's own subcaptions, for the authors to confirm.
function routingRow(model, domains) {
  const series = routingSeries(model);
  const hitRatio = { label: "Token hit ratio", domain: domains.hitRatio };
  const replication = { label: "Replication ratio", domain: domains.replication };
  const imbalance = { label: "Load imbalance (%)", domain: domains.imbalance };
  const name = unbrokenName(model);
  return [
    {
      panel: "a",
      title: `(a) Hit ratio vs cache size · ${name}`,
      chart: { series, x: CACHE_SIZE_AXIS, y: hitRatio, valueLabel: "Token hit ratio" },
    },
    {
      panel: "b",
      title: `(b) Replication vs cache size · ${name}`,
      chart: { series, x: CACHE_SIZE_AXIS, y: replication, valueLabel: "Replication ratio" },
    },
    {
      panel: "c",
      title: `(c) Replication vs instance count · ${name}`,
      chart: { series, x: INSTANCES_AXIS, y: replication, valueLabel: "Replication ratio" },
    },
    {
      panel: "d",
      title: `(d) Imbalance vs instance count · ${name}`,
      chart: { series, x: INSTANCES_AXIS, y: imbalance, valueLabel: "Load imbalance (%)" },
    },
  ];
}

// The routing figure's series of `model`, one per policy, named as its answer names them: "<model>, <policy>".
function routingSeries(model) {
  return ROUTING_POLICIES.map((policy) => `${model}${POLICY_SEPARATOR}${policy}`);
}

// `model` as a panel title writes it, its words joined by non-breaking spaces, so that a title that wraps keeps the
// name whole, the one part of it that tells the two rows apart.
function unbrokenName(model) {
  return model.replaceAll(" ", " ");
}
