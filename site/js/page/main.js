/**
 * The page's module: the hero with its stats strip, the family mix and the endpoint mix, the Traffic Explorer, the
 * paper's figures in six topics, and the citation and the team. `page/start.js` draws and runs them.
 */

import { startPage } from "./start.js";
import { runTraffic } from "../traffic/traffic.js";
import { runMixes } from "../landing/donuts.js";
import { mountCopyButtons, renderCiteLine } from "../landing/cite.js";
import { renderHero } from "../landing/hero.js";
import { runStats } from "../landing/stats.js";
import { renderTeam } from "../landing/team.js";

// Each section: the id of its place in index.html, and the function that runs it.
const SECTIONS = Object.freeze([
  Object.freeze({ id: "stats", run: runStats }),
  Object.freeze({ id: "mixes", run: runMixes }),
  Object.freeze({ id: "traffic-explorer", run: runTraffic }),
]);

// The charting library is needed for the first chart, the explorer's bars: started here, it loads beside the daily
// answer rather than after it. A failure is shown by each chart in its own place, as each chart imports it too.
import("../shared/libraries.js").catch(() => undefined);
renderTeam(document.querySelector("#team"));
renderCiteLine(document.querySelector("#cite-line"));
mountCopyButtons(document, navigator.clipboard);
startPage({
  sections: SECTIONS,
  showMonthCount: (monthCount) => renderHero(document.querySelector("#hero"), monthCount),
});
