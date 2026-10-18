/**
 * The page's tests' fixtures: the topics' anchors and titles in the order of their tabs, the topic sections the tabs
 * show, and which of them are shown.
 */

import { TOPICS } from "../site/js/page/topics.js";
import { FakeElement } from "./fake_page.js";

/** The topics' anchors on the page, their ids, in the order of their tabs. */
export const TOPIC_ANCHORS = Object.freeze(TOPICS.map((topic) => topic.id));

/** The topics' titles, as their headings and tabs write them after the number, in the order of their tabs. */
export const TOPIC_TITLES = Object.freeze(TOPICS.map((topic) => topic.title));

/** The six topic sections as the page writes them, as far as the tabs read them: each an element of its topic's id. */
export function topicSections() {
  return TOPIC_ANCHORS.map((anchor) => new FakeElement("section", anchor));
}

/** The ids of the sections of `sections` that are shown. */
export function shownIds(sections) {
  return sections.filter((section) => !section.hidden).map((section) => section.id);
}
