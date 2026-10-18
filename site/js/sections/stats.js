/**
 * The stats strip beside the hero: the whole trace as the paper's summary table counts it, its months, requests, input
 * and output tokens, user ids, models and serving instances, and a line naming its first and last day. The counts come
 * from the one row of the `explore/trace_totals` answer, given as `context.totals`; none is typed.
 *
 * The strip says "User ids", not users: the release's anonymous user ids rotate every quarter, so one person can hold
 * several, and the strip's count of ids exceeds the paper's count of people.
 *
 * A section's `context` is what the page gives every section; see `page/start.js`.
 */

import { showError, showLoading } from "../shared/figure.js";
import { dateSpanText, formatCompactCount, formatCount } from "../shared/format.js";

/** Show the loading state in `container`, then draw the stats strip into it from the trace totals, or the error. */
export async function runStats(container, context) {
  showLoading(container);
  await drawStats(container, context).catch((error) => showError(container, error));
}

/**
 * The strip's numbers `[{ value, label }]` for the one row of the trace totals: its months, requests, input and output
 * tokens, user ids, models and instances. The months and the models are written in full, the rest compactly.
 */
export function statsRows(totalsRow) {
  return [
    { value: formatCount(totalsRow.months), label: "Months" },
    { value: formatCompactCount(totalsRow.requests), label: "Requests" },
    { value: formatCompactCount(totalsRow.input_tokens), label: "Input tokens" },
    { value: formatCompactCount(totalsRow.output_tokens), label: "Output tokens" },
    { value: formatCompactCount(totalsRow.users), label: "User ids" },
    { value: formatCount(totalsRow.models), label: "Models" },
    { value: formatCompactCount(totalsRow.instances), label: "Instances" },
  ];
}

/** The line under the numbers, the trace's first and last day: "April 11, 2025 – April 12, 2026". */
export function datesLine(totalsRow) {
  return dateSpanText(totalsRow.first_day, totalsRow.last_day);
}

async function drawStats(container, context) {
  const [totalsRow] = await context.totals;
  const items = statsRows(totalsRow).map(
    (stat) => `<li><strong>${stat.value}</strong><span>${stat.label}</span></li>`,
  );
  container.innerHTML = `
    <ul class="stats-grid" aria-label="The trace in numbers">${items.join("")}</ul>
    <p class="stats-dates">${datesLine(totalsRow)}</p>`;
}
