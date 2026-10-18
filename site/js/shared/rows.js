/**
 * The rows a chart or a sum is taken from: a column's total, the distinct values of a list, a panel's rows, and the
 * columns of a log axis with the rows it has a place for. The chart kinds, the series, a card's series, the Overview's
 * mixes and the Traffic Explorer use them; plain functions, tested with `node --test`.
 */

/** The sum of `row[column]` over `rows`. */
export function columnTotal(rows, column) {
  let total = 0;
  for (const row of rows) {
    total += row[column];
  }
  return total;
}

/** The distinct values, in the order of their first appearance. */
export function distinct(values) {
  return [...new Set(values)];
}

/** The rows of the panel `panel`, by their `panel` column; every row when `panel` is not given. */
export function panelRows(rows, panel) {
  if (panel === undefined) {
    return rows;
  }
  return rows.filter((row) => row.panel === panel);
}

/**
 * The columns a chart draws on a log axis: `xColumns` where the card's `x.log`, `yColumns` where its `y.log`; none
 * where neither axis is a log one.
 */
export function logColumns({ x: xAxis = {}, y: yAxis = {} }, xColumns, yColumns) {
  const columns = [];
  if (xAxis.log) {
    columns.push(...xColumns);
  }
  if (yAxis.log) {
    columns.push(...yColumns);
  }
  return columns;
}

/** The rows whose value in each of `columns` is above zero: the rows a log axis over those columns has a place for. */
export function positiveRows(rows, columns) {
  return rows.filter((row) => columns.every((column) => row[column] > 0));
}
