/**
 * The Explore page's hero: the dataset's name as its title, a lede saying what the trace holds and counting its months
 * (the `months` of the `explore/trace_totals` answer, which the page gives once it is read), the buttons to the page's
 * Traffic Explorer and Insights, the dataset, the paper and the code, and the lab's name under them.
 */

import { AFFILIATION, monthCountText, TRAFFIC_EXPLORER_ANCHOR, URLS } from "../shared/layout.js";
import { LINK_MARKS } from "../shared/link_marks.js";

// The title, the dataset's name: its first phrase, and its second, drawn in the accent.
const TITLE = "Chutes";
const TITLE_ACCENT = "Production Trace";

// The lede, before and after the words that count the months.
const LEDE_OPENING = "One year of production LLM serving on Chutes:";
const LEDE_HOLDINGS = "every request's timing, tokens, model, user and instance.";

// The buttons under the lede: the first two scroll to the page's own sections, the first of them the primary one; the
// others leave the site, each with the mark of `LINK_MARKS` it names before its text.
const SITE_BUTTONS = Object.freeze([
  Object.freeze({ title: "Traffic Explorer", href: TRAFFIC_EXPLORER_ANCHOR, className: "button button--primary" }),
  Object.freeze({ title: "Insights", href: "#insights", className: "button" }),
]);
const EXTERNAL_BUTTONS = Object.freeze([
  Object.freeze({ title: "Dataset", url: URLS.dataset, mark: "huggingface" }),
  Object.freeze({ title: "Paper", url: URLS.paper, mark: "document" }),
  Object.freeze({ title: "Code", url: URLS.code, mark: "github" }),
]);

/** Fill `container` with the hero's copy for the `monthCount` months the trace spans (null when not known). */
export function renderHero(container, monthCount) {
  const siteButtons = SITE_BUTTONS.map(
    (button) => `<a class="${button.className}" href="${button.href}">${button.title}</a>`,
  );
  const externalButtons = EXTERNAL_BUTTONS.map(
    (button) =>
      `<a class="button" href="${button.url}" target="_blank" rel="noopener">${LINK_MARKS[button.mark]}${button.title}</a>`,
  );
  container.innerHTML = `
    <h1 id="hero-title">${TITLE} <em>${TITLE_ACCENT}</em></h1>
    <p class="hero-lede">${ledeText(monthCount)}</p>
    <div class="hero-actions">
      ${siteButtons.join("")}
      ${externalButtons.join("")}
    </div>
    <p class="hero-affiliation"><a class="affiliation" href="${URLS.lab}" target="_blank" rel="noopener">${AFFILIATION}</a></p>`;
}

/**
 * The lede for the `monthCount` months the trace spans: "One year of production LLM serving on Chutes: 13 months of
 * every request's …"; while the count is not known (null), the same words without "13 months of".
 */
export function ledeText(monthCount) {
  if (monthCount === null) {
    return `${LEDE_OPENING} ${LEDE_HOLDINGS}`;
  }
  return `${LEDE_OPENING} ${monthCountText(monthCount)} of ${LEDE_HOLDINGS}`;
}
