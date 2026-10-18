"""The snapshot test's normalising of what it reads: markup one element per line with Plot's numbered ids unnumbered,
whitespace collapsed, and a card's title made a file name; its states, the topics the tab row controls; and its naming
of an answer the page requested for a topic not shown."""

import snapshot_units


def test_markup_is_written_one_element_per_line() -> None:
    html = '<svg class="plot-d6a7b5"><g><text>12\n  months</text></g></svg>'
    assert snapshot_units.markup_lines(html) == '<svg class="plot-d6a7b5">\n<g>\n<text>12 months</text>\n</g>\n</svg>'


def test_whitespace_between_elements_still_splits_them() -> None:
    html = '<g>\n  <line x1="0">  </line>\n</g>'
    assert snapshot_units.markup_lines(html) == '<g>\n<line x1="0">\n</line>\n</g>'


def test_plot_clip_ids_are_unnumbered() -> None:
    html = '<clipPath id="plot-clip-7"></clipPath><g clip-path="url(#plot-clip-12)"></g>'
    expected = '<clipPath id="plot-clip">\n</clipPath>\n<g clip-path="url(#plot-clip)">\n</g>'
    assert snapshot_units.markup_lines(html) == expected


def test_plot_marker_and_pattern_ids_are_unnumbered() -> None:
    html = '<marker id="plot-marker-3"></marker><pattern id="plot-pattern-14"></pattern>'
    expected = '<marker id="plot-marker">\n</marker>\n<pattern id="plot-pattern">\n</pattern>'
    assert snapshot_units.markup_lines(html) == expected


def test_a_word_that_ends_in_plot_is_left_as_it_is() -> None:
    assert snapshot_units.markup_lines('<g class="subplot-clip-2"></g>') == '<g class="subplot-clip-2">\n</g>'


def test_plain_text_collapses_whitespace() -> None:
    assert snapshot_units.plain_text("  97.8%\n 13.9M\tcached ") == "97.8% 13.9M cached"


def test_a_card_title_is_a_file_name() -> None:
    assert snapshot_units.unit_name("Load balancing: TTFT p90 (s)") == "load_balancing_ttft_p90_s"


class FakeCard:
    """A stand-in for a Playwright locator of one card's article: its `data-figure` attribute."""

    def __init__(self, figure: str) -> None:
        self.figure = figure

    def get_attribute(self, name: str) -> str | None:
        return self.figure if name == snapshot_units.CARD_FIGURE else None


class FakeCards:
    """A stand-in for a Playwright locator of cards' articles: the cards it matched."""

    def __init__(self, figures: list[str]) -> None:
        self.figures = figures

    def all(self) -> list[FakeCard]:
        return [FakeCard(figure) for figure in self.figures]


class FakeTab:
    """A stand-in for a Playwright locator of one topic tab: its `aria-controls`, its topic's anchor."""

    def __init__(self, anchor: str) -> None:
        self.anchor = anchor

    def get_attribute(self, name: str) -> str | None:
        return self.anchor if name == "aria-controls" else None


class FakeTabs:
    """A stand-in for a Playwright locator of the topic tabs: the tabs it matched."""

    def __init__(self, anchors: list[str]) -> None:
        self.anchors = anchors

    def all(self) -> list[FakeTab]:
        return [FakeTab(anchor) for anchor in self.anchors]


class FakeTopicsPage:
    """A stand-in for a Playwright page holding a tab and cards for each topic, by the topic's id, in order: `locator`
    finds the tabs, as `snapshot_units.topic_anchors` asks for them, and the articles of a topic's cards, as
    `snapshot_units.topic_figures` does."""

    def __init__(self, figures_by_topic: dict[str, list[str]]) -> None:
        self.figures_by_topic = figures_by_topic

    def locator(self, selector: str) -> FakeTabs | FakeCards:
        if selector == snapshot_units.TOPIC_TABS:
            return FakeTabs(list(self.figures_by_topic))
        topic = selector.split(" ", 1)[0].removeprefix("#")
        return FakeCards(self.figures_by_topic.get(topic, []))


def test_the_states_are_the_topics_the_tab_row_controls_in_its_order() -> None:
    page = FakeTopicsPage({"insights-overview": [], "insights-tokens": [], "insights-balancing": []})
    assert snapshot_units.topic_anchors(page) == ["insights-overview", "insights-tokens", "insights-balancing"]


def test_another_topic_s_answer_requested_is_named_and_the_topic_s_own_are_not() -> None:
    page = FakeTopicsPage({
        "insights-overview": ["fig_request_rate_day"],
        "insights-users": ["fig_user_raster_explore"],
    })
    assert snapshot_units.topic_figures(page, "insights-overview") == {"fig_request_rate_day"}
    requested = ["fig_request_rate_day", "fig_top10_model_monthly_share_legend"]
    assert snapshot_units.other_topics_answers(page, "insights-overview", requested) == []
    requested.append("fig_user_raster_explore")
    assert snapshot_units.other_topics_answers(page, "insights-overview", requested) == ["fig_user_raster_explore"]
