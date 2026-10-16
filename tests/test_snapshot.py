"""The snapshot test's comparison report: a unit whose text changed, one that is new, and one no longer shown, each
named by its path in the snapshots folder; and nothing for files that match. And its reading of a figure answer's
address."""

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
