/**
 * The ticks of a chart's axes: how many a linear axis asks Plot for, and an axis mark that labels each tick it is given,
 * a plain function tested with `node --test`. The chart kinds give both to Plot.
 */

/**
 * The tick count a linear axis asks Plot for: Plot rounds a count to steps of 1, 2 or 5, which gives up to about twice
 * as many ticks, so asking for four gives at most six or seven, few enough that their labels do not run into one another
 * on a phone.
 */
export const TICK_COUNT = 4;

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
  // As `text` every tick is labelled; as `tickFormat` a log axis blanks a tick not 1, 2 or 5 times 10^k, such as 60.
  return makeAxis(ticks, { ...options, text: (tick) => tickFormat(tick) });
}
