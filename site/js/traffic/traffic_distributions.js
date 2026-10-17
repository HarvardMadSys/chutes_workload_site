/**
 * The distributions of the Traffic Explorer's chosen requests, plain functions tested with `node --test`: the histogram
 * rows of the trace weeks holding a chosen day, folded into bin maps (a Map from bin to requests), their CDF rows,
 * their percentiles and the texts these are written in. The rows are `explore/histograms_by_family`'s, `{ week,
 * first_day, family, endpoint_group, metric, bins, requests }`, or a family's `explore/histograms_by_model/<slug>`'s,
 * with `chute_id` and `model` for `family`: `metric` is `input_tokens`, `output_tokens` or `ttft`, and `bins` and
 * `requests` are parallel lists in bin order. A bin `b` holds the values `v` with `floor(BINS_PER_DOUBLING · log2(v))
 * = b`, a token count at or below 1 in bin 0; a TTFT is in seconds, and its bins can be negative.
 */

import { formatSignificant, MISSING_TEXT } from "../shared/format.js";
import { OTHER_NAME } from "../theme/colours.js";
import { isOfModelAndEndpoint } from "./traffic_filter.js";

/**
 * The bins in each doubling of a value. A quarter-doubling bin puts a percentile read at its geometric middle within
 * 2^(1/8), about 9%, of the true one; the CDF at its upper edge is exact.
 */
export const BINS_PER_DOUBLING = 4;

// A trace week is seven trace days, the trace's first week starting on its first day.
const DAYS_PER_WEEK = 7;

// The characters of a calendar day, "YYYY-MM-DD".
const DAY_LENGTH = "YYYY-MM-DD".length;

// The shares of the requests the tiles' percentiles are read at: the median and the 90th percentile.
const P50_SHARE = 0.5;
const P90_SHARE = 0.9;

// The mark before a percentile, which is read at its bin's middle and so is near the true one, not it.
const NEAR = "≈";

/** The last day of the trace week whose first day is `firstDay` ("YYYY-MM-DD"): six days after it. */
export function weekLastDay(firstDay) {
  return addDays(firstDay, DAYS_PER_WEEK - 1);
}

/**
 * The rows of `rows` whose trace week holds a day from `from` to `to` ("YYYY-MM-DD", each "" for the trace's end on
 * its side): a week whose `first_day` is at most `to` and whose last day is at least `from`.
 */
export function weeksInRange(rows, from, to) {
  const kept = [];
  for (const row of rows) {
    const startsByTo = to === "" || row.first_day <= to;
    const endsByFrom = from === "" || weekLastDay(row.first_day) >= from;
    if (startsByTo && endsByFrom) {
      kept.push(row);
    }
  }
  return kept;
}

/**
 * The rows of `rows`, a histogram answer of the choice's family (or of every family), that `choice` keeps: of its
 * model and endpoint group, in the trace weeks that hold a day of its range.
 */
export function histogramRowsInChoice(rows, choice) {
  const kept = [];
  for (const row of weeksInRange(rows, choice.from, choice.to)) {
    if (isOfModelAndEndpoint(row, choice)) {
      kept.push(row);
    }
  }
  return kept;
}

/**
 * The bin maps of the rows of `rows` of the metric `metric`, by series: a Map from series name, the row's
 * `seriesColumn`, to a bin map of its requests summed over the rows; a series `colours` (a Map from series name to
 * colour) does not name is folded into "Other", as the bars fold it.
 */
export function binTotals(rows, seriesColumn, metric, colours) {
  const totals = new Map();
  for (const row of rows) {
    if (row.metric === metric) {
      const series = colours.has(row[seriesColumn]) ? row[seriesColumn] : OTHER_NAME;
      if (!totals.has(series)) {
        totals.set(series, new Map());
      }
      addRowBins(totals.get(series), row);
    }
  }
  return totals;
}

/** The bin map of every row of `rows` of the metric `metric`: their requests per bin, summed over the rows. */
export function metricBins(rows, metric) {
  const bins = new Map();
  for (const row of rows) {
    if (row.metric === metric) {
      addRowBins(bins, row);
    }
  }
  return bins;
}

/** The requests of the bin map `bins`: the sum of its bins'. */
export function requestTotal(bins) {
  let total = 0;
  for (const requests of bins.values()) {
    total += requests;
  }
  return total;
}

/** The upper edge of the bin `bin`: `2^((bin + 1) / BINS_PER_DOUBLING)`, the least value above the bin. */
export function binUpperEdge(bin) {
  return 2 ** ((bin + 1) / BINS_PER_DOUBLING);
}

/** The geometric middle of the bin `bin`: `2^((bin + 0.5) / BINS_PER_DOUBLING)`. */
export function binMiddle(bin) {
  return 2 ** ((bin + 0.5) / BINS_PER_DOUBLING);
}

/**
 * The CDF rows of `totals` (as `binTotals` gives them) for the lines kind: `[{ series, x, cdf }]`, per series and in
 * bin order, `x` a bin's upper edge and `cdf` the share of the series' requests in that bin and the bins below it, the
 * last 1. A series with no request has no row.
 */
export function cdfRows(totals) {
  const rows = [];
  for (const [series, bins] of totals) {
    const total = requestTotal(bins);
    let below = 0;
    for (const bin of binOrder(bins)) {
      below += bins.get(bin);
      rows.push({ series, x: binUpperEdge(bin), cdf: below / total });
    }
  }
  return rows;
}

/**
 * The value at which `share` (0.5 for the median) of the requests of the bin map `bins` lie: the geometric middle of
 * the first bin, in bin order, at which the share of the requests in it and below it reaches `share`; null for a map
 * of no request.
 */
export function percentile(bins, share) {
  const total = requestTotal(bins);
  let below = 0;
  for (const bin of binOrder(bins)) {
    below += bins.get(bin);
    if (below / total >= share) {
      return binMiddle(bin);
    }
  }
  return null;
}

/**
 * The tiles' percentiles of `rows`, the histogram rows of a choice: `{ input, output, ttft }`, each `{ p50, p90 }`
 * of the input tokens, output tokens and TTFT in seconds over every series, each null where no request records it.
 */
export function choicePercentiles(rows) {
  return {
    input: medianAndP90(metricBins(rows, "input_tokens")),
    output: medianAndP90(metricBins(rows, "output_tokens")),
    ttft: medianAndP90(metricBins(rows, "ttft")),
  };
}

/**
 * A percentile as the tiles write it: "≈" and the value by `format`, to two significant figures by default ("≈1,100",
 * "≈0.84 s" with `formatSignificantSeconds`); "—" for null.
 */
export function percentileText(value, format = formatSignificant) {
  return value === null ? MISSING_TEXT : `${NEAR}${format(value)}`;
}

// The day `count` days after `day` ("YYYY-MM-DD"), counted in UTC, as the trace's days are.
function addDays(day, count) {
  const [year, month, dayOfMonth] = day.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, dayOfMonth + count)).toISOString().slice(0, DAY_LENGTH);
}

// Add the requests of `row` to the bin map `bins`, bin by bin.
function addRowBins(bins, row) {
  for (const [index, bin] of row.bins.entries()) {
    bins.set(bin, (bins.get(bin) ?? 0) + row.requests[index]);
  }
}

// The bins of the bin map `bins` from the lowest: rows of several weeks add their bins in no one order.
function binOrder(bins) {
  return [...bins.keys()].sort((first, second) => first - second);
}

// The median and the 90th percentile of the bin map `bins`, `{ p50, p90 }`, each null for a map of no request.
function medianAndP90(bins) {
  return { p50: percentile(bins, P50_SHARE), p90: percentile(bins, P90_SHARE) };
}
