/**
 * The Plot options every chart kind starts from: a chart's frame (its margins, its height and the width of its body)
 * and ink, the styles of its grid and axes, the dash of a dashed line, its reference rules, and its colour scales,
 * ordinal, sequential and diverging; and the draw contract every kind keeps. The kinds of `js/charts/` draw with them
 * and `plot/axes.js` takes its styles from here; the legend takes the dash for its swatches, and the Traffic
 * Explorer's bars their width for their month ticks. The colours themselves come from `theme/colours.js`. Plain
 * functions, tested with `node --test`.
 */

/** A chart's height in pixels where its card gives none, so a grid of figures lines up. */
export const CHART_HEIGHT = 240;
const FALLBACK_WIDTH = 480; // the width drawn when the body has not been laid out yet
const UNTITLED_MARGIN_TOP = 12; // pixels above a chart whose y axis has no title: room for half its top tick's label
/** Pixels taken off each side of a bar: a 2px gap between neighbouring bars and segments. */
export const BAR_INSET = 1;
/**
 * The dash and the gap, in pixels, of every dashed line: a series drawn dashed, its swatch in a legend, and the line
 * where y equals x.
 */
export const DASH = Object.freeze([4, 3]);
/** The card's own colour, for a mark that parts or rings others: a raster's row rules, a label's halo. */
export const SURFACE_INK = "var(--color-surface)";
/**
 * The options of a reference line, the line where y equals x or a level a card marks: dashed by `DASH`, in the chart's
 * label ink, so it reads as part of the frame and not as a series. A level drawn over cells differs only in lying on a
 * halo (`REFERENCE_HALO`), since dashes of that ink fade into a fill of like lightness.
 */
export const REFERENCE_STYLE = Object.freeze({ stroke: "currentColor", strokeDasharray: DASH.join(",") });
/** The halo under a level drawn over cells: a solid rule in the card's colour, 4 px wide, framing the dashes. */
export const REFERENCE_HALO = Object.freeze({ stroke: SURFACE_INK, strokeWidth: 4 });

// The Plot options every chart shares, so every chart has the same ink, in the page's own face: Plot's default face
// draws a name's punctuation otherwise than the page's text does.
const PLOT_STYLE = Object.freeze({
  color: "var(--chart-label)", background: "transparent", fontFamily: "var(--font-sans)",
});
const PLOT_MARGINS = Object.freeze({ marginTop: 32, marginRight: 32, marginBottom: 48, marginLeft: 72 });
/** The options of every chart's grid lines. */
export const GRID_STYLE = Object.freeze({ stroke: "var(--chart-grid)", strokeOpacity: 1 });
/** The options of every chart's axes and its zero line: the axis ink, and an axis title with no arrow. */
export const AXIS_STYLE = Object.freeze({ stroke: "var(--chart-axis)", labelArrow: "none" });
const DEFAULT_DIVERGING_SCHEME = "RdBu"; // a diverging colour scale's scheme when the card names none

/**
 * The Plot options every chart starts from: its margins, its height (`height` pixels, `CHART_HEIGHT` when not given),
 * the width of `body`, and its ink.
 */
export function chartFrame(body, height = CHART_HEIGHT) {
  return { ...PLOT_MARGINS, width: chartWidth(body), height, style: PLOT_STYLE };
}

/**
 * The frame of a chart whose y axis is titled `yLabel` (null for none): `chartFrame` at `height` pixels (a kind's
 * `height` parameter, `CHART_HEIGHT` when not given), then `margins` where given, and a small top margin where the y
 * axis has no title.
 */
export function titledFrame(body, yLabel, margins, height = CHART_HEIGHT) {
  const frame = { ...chartFrame(body, height), ...margins };
  if (yLabel === null) {
    frame.marginTop = UNTITLED_MARGIN_TOP;
  }
  return frame;
}

/**
 * A dashed horizontal rule across the plot at the y value `value` (`REFERENCE_STYLE`), made with `Plot.ruleY`, drawn
 * under the marks that follow it; a rule of no values, which draws nothing, where `value` is not given.
 */
export function referenceRule(Plot, value) {
  return Plot.ruleY(value === undefined ? [] : [value], REFERENCE_STYLE);
}

/**
 * A reference rule drawn over cells: `referenceRule` at the y value `value`, on its halo, a rule in the card's colour
 * under it (`REFERENCE_HALO`), so the dashes read over a fill of any colour; marks that draw nothing where `value` is
 * not given.
 */
export function haloedReferenceRule(Plot, value) {
  return [Plot.ruleY(value === undefined ? [] : [value], REFERENCE_HALO), referenceRule(Plot, value)];
}

/** The width in pixels of a chart drawn into `body`: the body's width as laid out, or `FALLBACK_WIDTH` before it is. */
export function chartWidth(body) {
  return body.clientWidth || FALLBACK_WIDTH;
}

// The draw contract. Every chart kind of `js/charts/` is drawn by one function of five arguments,
// `draw<Kind>(rows, body, seriesColours, parameters, hidden)`: `rows`, the answer's rows the chart is drawn from;
// `body`, the element whose content the chart replaces; `seriesColours`, a Map from series name to colour, in legend
// order; `parameters`, the kind's named parameters, which its JSDoc lists; and `hidden`, the Set of the series names
// the legend hides. A kind without series declares `seriesColours` and `hidden` too, and does not read them. The
// function is `async` and returns nothing, so every kind is called and awaited the same way. Its last step names the
// chart it drew for a screen reader, `nameChart(body, parameters.name)` of `shared/figure.js`: by `parameters.name`
// where given, else by its figure's title and insight or caption (`chartName`); so no caller, a legend's redrawing
// among them, names a chart.

/**
 * Plot's colour scale for the `shown` names, each in its colour from the map `colours`. It draws no legend: a chart of
 * more than one series has the legend of buttons (`shared/legend.js`) instead.
 */
export function colourScale(colours, shown) {
  return {
    type: "ordinal",
    domain: shown,
    range: shown.map((name) => colours.get(name)),
  };
}

/**
 * Plot's colour scale of a chart shading a value on a sequential scheme, with its legend titled `valueLabel`: the
 * scheme `scheme`, else `defaultScheme`, from the point `schemeStart` of it (0 to 1, its first colour when not given)
 * to its last colour, over the values `colourDomain` (`[low, high]`, a value beyond either taking that end's colour)
 * or else the values' own; a log scale where `colourLog`, its legend's ticks written as Plot writes a power of ten;
 * else the scale type `colourScale`, else linear, its ticks written by `valueFormat`. The legend ticks `legendTicks`
 * where given (`colourLegendTicks` of `plot/axes.js`), else Plot's own.
 */
export function sequentialColour(parameters, defaultScheme, legendTicks = undefined) {
  const { scheme = defaultScheme, colourScale: scaleType = "linear", colourLog = false, valueLabel } = parameters;
  const colour = {
    type: colourLog ? "log" : scaleType,
    scheme,
    legend: true,
    label: valueLabel,
    tickFormat: colourLog ? undefined : parameters.valueFormat,
  };
  if (parameters.schemeStart !== undefined) {
    // With a scheme, Plot reads a range of two numbers as the part of the scheme the values span.
    colour.range = [parameters.schemeStart, 1];
  }
  if (parameters.colourDomain !== undefined) {
    colour.domain = parameters.colourDomain;
    colour.clamp = true;
  }
  if (legendTicks !== undefined) {
    colour.ticks = legendTicks;
  }
  return colour;
}

/**
 * Plot's diverging colour scale for the card's parameters: the scheme `scheme` ("RdBu" when not given) centred on
 * zero, from `colourDomain` where given, with its legend titled `valueLabel` and its ticks written by `valueFormat`.
 */
export function divergingColour({ scheme = DEFAULT_DIVERGING_SCHEME, colourDomain, valueLabel, valueFormat }) {
  return {
    type: "diverging",
    scheme,
    pivot: 0,
    domain: colourDomain,
    legend: true,
    label: valueLabel,
    tickFormat: valueFormat,
  };
}
