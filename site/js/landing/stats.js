/**
 * The stats strip beside the hero: the whole trace as the paper's summary table counts it, its requests and input
 * tokens. The counts come from the `explore/trace_totals` answer; none is typed.
 *
 * A section's `context` is what the page gives every section; see `explore/start.js`.
 */

import { showError, showLoading } from "../shared/charts.js";
import { readAnswer } from "../shared/answers.js";
import { formatCompactCount } from "../shared/format.js";

/** Show the loading state in `container`, then draw the stats strip into it from the trace totals, or the error. */
export async function runStats(container) {
  showLoading(container);
  await drawStats(container).catch((error) => showError(container, error));
}

/** The strip's numbers `[{ value, label }]`: the totals row's requests and input tokens, written compactly. */
export function statsRows(totalsRow) {
  return [
    { value: formatCompactCount(totalsRow.requests), label: "requests" },
    { value: formatCompactCount(totalsRow.input_tokens), label: "input tokens" },
  ];
}

async function drawStats(container) {
  const rows = await readAnswer("explore/trace_totals");
  const items = statsRows(rows[0]).map(
    (stat) => `<li><strong>${stat.value}</strong><span>${stat.label}</span></li>`,
  );
  container.innerHTML = `<ul class="stats-grid" aria-label="The trace in numbers">${items.join("")}</ul>`;
}
