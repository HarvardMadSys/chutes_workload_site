/**
 * The `shared/` modules' tests' fixtures: a legend of two series and the words of a figure, for a body that
 * `renderFigure` lays out, whose legend's place is above it.
 */

/** A legend of two series, as a figure's `legend` function or the Traffic Explorer's bars give one. */
export const LEGEND = Object.freeze({
  series: [{ name: "hermes", label: "hermes" }, { name: "pi", label: "Pi" }],
  colours: new Map([["hermes", "var(--series-1)"], ["pi", "var(--series-2)"]]),
});

/** A figure's words, for a body that `renderFigure` lays out, whose legend's place is above it. */
export const FIGURE = Object.freeze({
  title: "Requests per family", caption: "Each family's requests.", definition: "Rows.",
});
