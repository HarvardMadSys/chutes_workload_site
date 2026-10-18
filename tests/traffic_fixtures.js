/**
 * The Traffic Explorer's tests' fixtures: the choice of everything, the response to fetching an answer, and the
 * controls of a controls row.
 */

/** The Traffic Explorer's choice of everything: every family, every model, every endpoint group, requests, every day. */
export const EVERYTHING = Object.freeze({ family: "", model: "", endpoint: "", metric: "", from: "", to: "" });

/** The response to fetching an answer whose promised rows are `rows`, or a 404 where there are none. */
export function fetchedAnswer(rows) {
  if (rows === undefined) {
    return { ok: false, status: 404, statusText: "Not Found" };
  }
  return { ok: true, json: () => rows };
}

/**
 * The Traffic Explorer's controls in its controls row `row`: `{ family, model, endpoint, metric, periods }`, the
 * family, model, endpoint and metric drop-downs, in the row's order, and the group of period buttons.
 */
export function controlsOf(row) {
  const [family, model, endpoint, metric] = row.querySelectorAll(".control-field select");
  return { family, model, endpoint, metric, periods: row.querySelector(".period-buttons") };
}
