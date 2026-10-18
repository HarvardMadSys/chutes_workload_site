/**
 * The page's module: the hero with its stats strip, the family mix and the endpoint mix, the Traffic Explorer, the
 * paper's figures in the topics of `TOPICS`, and the citation and the team. `page/start.js` draws and runs them.
 */

import { startPage } from "./start.js";
import { runTraffic } from "../traffic/traffic.js";
import { runMixes } from "../sections/mixes.js";
import { mountCopyButtons, renderCiteLine } from "../sections/cite.js";
import { renderHero } from "../sections/hero.js";
import { runStats } from "../sections/stats.js";
import { renderTeam } from "../sections/team.js";

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
