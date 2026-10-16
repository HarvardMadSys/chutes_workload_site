/**
 * The Explore page, the landing page: the hero with its stats strip, the model mix and monthly trends, the Traffic
 * Explorer, the paper's figures in six topics, and the citation and the team. `explore/start.js` draws and runs them.
 */

import { startPage } from "../explore/start.js";
import { runTrends } from "../explore/trends.js";
import { runMixes } from "../landing/donuts.js";
import { mountCopyButtons, renderCiteLine } from "../landing/cite.js";
import { renderHero } from "../landing/hero.js";
import { runStats } from "../landing/stats.js";
import { renderTeam } from "../landing/team.js";

// Each section: the id of its place in index.html, and the function that runs it.
const SECTIONS = Object.freeze([
  Object.freeze({ id: "stats", run: runStats }),
  Object.freeze({ id: "mixes", run: runMixes }),
  Object.freeze({ id: "trends", run: runTrends }),
]);

renderTeam(document.querySelector("#team"));
renderCiteLine(document.querySelector("#cite-line"));
mountCopyButtons(document, navigator.clipboard);
startPage({
  sections: SECTIONS,
  showMonthCount: (monthCount) => renderHero(document.querySelector("#hero"), monthCount),
});
