/**
 * The page's tests' fixtures: the Insights section holding a section per topic, for a test that mounts the topic tabs
 * without the page's start, and which of the topic sections are shown.
 */

import { TOPICS } from "../site/js/page/topics.js";
import { FakeElement } from "./fake_page.js";

/**
 * The Insights section as far as the topic tabs read it, `section#insights` holding one `section#<id>` per topic of
 * `TOPICS`, in their order: what the page's start writes before it mounts the tabs. A test that runs the start gives
 * `section#insights` alone, and the page writes the topics into it.
 */
export function topicSections() {
  const insights = new FakeElement("section", "insights");
  for (const topic of TOPICS) {
    insights.append(new FakeElement("section", topic.id));
  }
  return insights;
}

/** The ids of the sections of `sections` that are shown. */
export function shownIds(sections) {
  return sections.filter((section) => !section.hidden).map((section) => section.id);
}
