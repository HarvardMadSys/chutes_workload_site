"""The snapshot test's comparison report: a unit whose text changed, one that is new, and one no longer shown, each
named by its path in the snapshots folder; and nothing for files that match. And its reading of a figure answer's
address, and its naming of an answer the page requested for a topic not shown."""

import pathlib

import pytest

pytest.importorskip("playwright.sync_api")  # the snapshot module drives the browser; without Playwright it is skipped

import snapshot


def kept_snapshots(folder: pathlib.Path) -> None:
    """A snapshots folder of one state with two units."""
    (folder / "explore-overview").mkdir(parents=True)
    (folder / "explore-overview" / "stats.txt").write_text("13 months\n1.2B requests\n")
    (folder / "explore-overview" / "hero.txt").write_text("Chutes Production Trace\n")


def test_matching_files_report_nothing(tmp_path: pathlib.Path) -> None:
    kept_snapshots(tmp_path)
    shown = {
        tmp_path / "explore-overview" / "stats.txt": "13 months\n1.2B requests\n",
        tmp_path / "explore-overview" / "hero.txt": "Chutes Production Trace\n",
    }
    assert snapshot.changed_units(shown, tmp_path) == []


def test_changed_new_and_no_longer_shown_units_are_named(tmp_path: pathlib.Path) -> None:
    kept_snapshots(tmp_path)
    shown = {
        tmp_path / "explore-overview" / "stats.txt": "14 months\n1.2B requests\n",
        tmp_path / "explore-overview" / "team.txt": "William Nixon\n",
    }
    assert snapshot.changed_units(shown, tmp_path) == [
        "changed: explore-overview/stats.txt\n    @@ -1 +1 @@\n    -13 months\n    +14 months",
        "new: explore-overview/team.txt",
        "no longer shown: explore-overview/hero.txt",
    ]


def test_a_figure_answer_s_address_names_its_figure() -> None:
    assert snapshot.answered_figure("http://127.0.0.1:8000/data/all/figures/fig_seasonality.json") == "fig_seasonality"
    assert snapshot.answered_figure("http://127.0.0.1:8000/data/all/figures.json") is None
    assert snapshot.answered_figure("http://127.0.0.1:8000/data/all/explore/trace_totals.json") is None


class FakeTables:
    """A stand-in for a Playwright locator of cards' plot-ready tables: the texts it matched."""

    def __init__(self, texts: list[str]) -> None:
        self.texts = texts

    def all_text_contents(self) -> list[str]:
        return self.texts


class FakeTopicsPage:
    """A stand-in for a Playwright page holding each topic's cards, by the topic's id: `locator` finds the tables a
    topic's Definition controls name, as `snapshot.topic_figures` asks for them."""

    def __init__(self, figures_by_topic: dict[str, list[str]]) -> None:
        self.figures_by_topic = figures_by_topic

    def locator(self, selector: str) -> FakeTables:
        topic = selector.split(" ", 1)[0].removeprefix("#")
        figures = self.figures_by_topic.get(topic, [])
        return FakeTables([f"data/paper/plotdata/{figure}.parquet" for figure in figures])


def test_another_topic_s_answer_requested_is_named_and_the_topic_s_own_are_not() -> None:
    page = FakeTopicsPage({
        "insights-overview": ["fig_request_rate_day"],
        "insights-users": ["fig_user_raster_explore"],
    })
    assert snapshot.topic_figures(page, "insights-overview") == {"fig_request_rate_day"}
    requested = ["fig_request_rate_day", "fig_top10_model_monthly_share_legend"]
    assert snapshot.other_topics_answers(page, "insights-overview", requested) == []
    requested.append("fig_user_raster_explore")
    assert snapshot.other_topics_answers(page, "insights-overview", requested) == ["fig_user_raster_explore"]
