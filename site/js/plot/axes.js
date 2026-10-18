/**
 * A card's axes as Plot takes them: Plot's scale options for a card's axis options (`AxisOptions`, below), its axis and
 * grid marks (a band axis's among them), a value as its axis writes it, alone or in a tooltip's text, the tick count a
 * linear axis asks for, a log axis's powers of ten and a log colour legend's ticks; and the y axis of a CDF of
 * requests, which the Insights' topics and the Traffic Explorer's distributions share. The chart kinds use it, in the
 * styles of `plot/frame.js`; plain functions, a mark's given Plot.
 */

import { AXIS_STYLE, GRID_STYLE } from "./frame.js";
import { formatCount } from "../shared/format.js";

/**
 * The options of one axis of a chart. Every key is optional.
 * @typedef {object} AxisOptions
 * @property {string|null} [label]  the axis's title; none when null or not given
 * @property {boolean} [log]  true for a log axis
 * @property {Array} [domain]  [low, high]; on a band axis, every band in order
 * @property {Array} [ticks]  the values ticked; on a category axis, the indices of the categories labelled
 * @property {function} [tickFormat]  how a tick is written, and a value in a tooltip unless tipFormat is given
 * @property {function} [tipFormat]  how a value is written in a tooltip, alone, without the axis's title
 * @property {number} [inset]  pixels between the plot's edges and the axis's first and last values
 * @property {number} [tickRotate]  degrees a band axis's tick labels are slanted, 0 (level) when not given
 * @property {Array} [categories]  the cells' category names, the cell from i to i + 1 named by the i-th
 */

/** The names of the axis options, for the test that checks every card's axes against them. */
export const AXIS_OPTION_NAMES = Object.freeze([
  "label", "log", "domain", "ticks", "tickFormat", "tipFormat", "inset", "tickRotate", "categories",
]);

/**
 * The tick count a linear axis asks Plot for: Plot rounds a count to steps of 1, 2 or 5, which gives up to about twice
 * as many ticks, so asking for four gives at most six or seven, few enough that their labels do not run into one another
 * on a phone.
 */
export const TICK_COUNT = 4;

/** The most powers of ten a log axis labels: over a wider range it labels every second, third or more. */
export const MAX_LOG_TICKS = 6;

// The y axis of every CDF of requests on the page, an Insights card's or the Traffic Explorer's: the share of the
// requests at or below a value, in percent.
// placeholder: its label, for the authors.
export const SHARE_OF_REQUESTS_AXIS = Object.freeze({ label: "Share of requests" });

/**
 * An axis mark made by `makeAxis` (`Plot.axisX` or `Plot.axisY`) with `options`, labelling each of `ticks` when given,
 * else the ticks Plot chooses, each written by `options.tickFormat` when it has one.
 */
export function axisWithTicks(makeAxis, ticks, { tickFormat, ...options }) {
  if (ticks === undefined) {
    return makeAxis({ ...options, tickFormat });
  }
  if (tickFormat === undefined) {
    return makeAxis(ticks, options);
  }
  // Through `text`, each given tick is written by `tickFormat` itself, whatever Plot's scale would make of it.
  return makeAxis(ticks, { ...options, text: (tick) => tickFormat(tick) });
}

/**
 * The powers of ten from `low` to `high`, both included where they are powers of ten. Throws a RangeError when `low`
 * is not above zero: a log axis has no place for it, and no power of ten is the first one above it.
 */
export function decadeTicks([low, high]) {
  if (!(low > 0)) {
    throw new RangeError(`a log axis's range must start above zero, not at ${low} (range [${low}, ${high}])`);
  }
  const ticks = [];
  for (let exponent = Math.ceil(Math.log10(low)); 10 ** exponent <= high; exponent += 1) {
    ticks.push(10 ** exponent);
  }
  return ticks;
}

/**
 * The ticks of a log axis over `[low, high]`: its powers of ten, every second, third or more of them when there are
 * more than `MAX_LOG_TICKS`, so the labels never crowd; undefined, for Plot's own, when the
 * range holds fewer than two.
 */
export function logAxisTicks([low, high]) {
  const powers = decadeTicks([low, high]);
  if (powers.length < 2) {
    return undefined;
  }
  const step = Math.ceil(powers.length / MAX_LOG_TICKS);
  return powers.filter((power, index) => index % step === 0);
}

/** The smallest and largest of `values`: `[low, high]`. */
export function extent(values) {
  let low = Infinity;
  let high = -Infinity;
  for (const value of values) {
    low = Math.min(low, value);
    high = Math.max(high, value);
  }
  return [low, high];
}

/**
 * The ticks an axis of the card's options `axis` labels over the drawn `values`: `axis.ticks` when given; else, on a
 * log axis, the powers of ten over `axis.domain` or the values' extent; else undefined, for Plot's own. Throws a
 * RangeError naming the axis when a log axis's domain does not start above zero, a card's mistake.
 */
export function axisTicks(axis, values) {
  if (axis.log && axis.domain !== undefined && !(axis.domain[0] > 0)) {
    const name = axis.label ?? "untitled";
    const domain = `[${axis.domain.join(", ")}]`;
    throw new RangeError(`the log axis "${name}" has the domain ${domain}, which must start above 0`);
  }
  if (axis.ticks !== undefined) {
    return axis.ticks;
  }
  if (axis.log) {
    return logAxisTicks(axis.domain ?? extent(values));
  }
  return undefined;
}

/**
 * Plot's options for the scale of the card's axis options `axis` over the drawn `values`: a log scale where `axis.log`,
 * a point scale where the values are labels (text, such as a month, "2025-06"), and `axis.domain` and `axis.inset`
 * where given.
 */
export function axisScale(axis, values = []) {
  const scale = {};
  if (axis.log) {
    scale.type = "log";
  } else if (values.some((value) => typeof value === "string")) {
    // Plot would read a month's label as a date; it is a label, its points evenly apart.
    scale.type = "point";
  }
  if (axis.domain !== undefined) {
    scale.domain = axis.domain;
  }
  if (axis.inset !== undefined) {
    scale.inset = axis.inset;
  }
  return scale;
}

/** A value as the card's axis options `axis` write it: by `axis.tickFormat` where given, else with separators. */
export function axisText(axis, value) {
  return axis.tickFormat === undefined ? formatCount(value) : axis.tickFormat(value);
}

/** `text`, a value of the card's axis options `axis`, after the axis's title where it has one: "Requests: 1.2k". */
export function afterAxisTitle(axis, text) {
  return axis.label ? `${axis.label}: ${text}` : text;
}

/**
 * A value of the card's axis options `axis` as a tooltip writes it: by `axis.tipFormat` where given, "Day 120 · Aug 9,
 * 2025"; else as the axis writes it (`axisText`), after the axis's title where it has one, "Instances: 12".
 */
export function axisValueText(axis, value) {
  if (axis.tipFormat !== undefined) {
    // The tooltip's text names the value itself, so the axis's title, written for the ticks, is not repeated.
    return axis.tipFormat(value);
  }
  return afterAxisTitle(axis, axisText(axis, value));
}

/**
 * The values a colour legend ticks for the card's parameters over the shaded `values`: on a log colour scale
 * (`colourLog`), the powers of ten over `colourDomain` or the values' extent, as a log axis's (`logAxisTicks`), so
 * the legend shows no comb of unlabelled ticks between them; else, or where fewer than two powers fall in the range,
 * undefined, for Plot's own.
 */
export function colourLegendTicks({ colourLog = false, colourDomain }, values) {
  if (!colourLog) {
    return undefined;
  }
  return logAxisTicks(colourDomain ?? extent(values));
}

/**
 * The axis mark of `dimension` ("x" or "y") for the card's axis options `axis`: ticked at `ticks`, or at Plot's own
 * `TICK_COUNT` when undefined, titled by `axis.label` (none when not given) and written by `axis.tickFormat`.
 */
export function axisMark(Plot, dimension, axis, ticks) {
  const makeAxis = dimension === "x" ? Plot.axisX : Plot.axisY;
  const options = { ...AXIS_STYLE, label: axis.label ?? null, tickFormat: axis.tickFormat };
  if (ticks === undefined) {
    options.ticks = TICK_COUNT;
  }
  return axisWithTicks(makeAxis, ticks, options);
}

/** The grid lines across `dimension` ("x" or "y"), at `ticks`, or at Plot's own `TICK_COUNT` when undefined. */
export function gridMark(Plot, dimension, ticks) {
  const makeGrid = dimension === "x" ? Plot.gridX : Plot.gridY;
  if (ticks === undefined) {
    return makeGrid({ ...GRID_STYLE, ticks: TICK_COUNT });
  }
  return makeGrid(ticks, GRID_STYLE);
}

/**
 * The axis mark of a band x axis, a box's or a bar's, for the card's axis options `axis`: a tick at each band, or at
 * `axis.ticks` where given, written by `tickFormat` (the card's `axis.tickFormat` when not given), its labels slanted
 * by `axis.tickRotate` degrees (level when not given), so that long names keep clear of one another, and titled by
 * `axis.label`, none when not given.
 */
export function bandAxisMark(Plot, axis, tickFormat = axis.tickFormat) {
  const { label = null, tickRotate = 0 } = axis;
  return axisWithTicks(Plot.axisX, axis.ticks, { ...AXIS_STYLE, label, tickRotate, tickFormat });
}
