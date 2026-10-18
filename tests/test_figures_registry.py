"""The Insights' cards against the artifact's figure list: every figure `config/figures.json` names is the figure of
exactly one card, or the legend named by the two share cards, and the cards name no other. It reads the artifact the
environment variable `ARTIFACT` names, as `make test` passes it (the fixture `artifact_checkout`), and skips, saying
why, without one."""

import collections
import json
import pathlib
import subprocess

from repository_root import ROOT
from site_data import figure_answers

TOPICS_MODULE = ROOT / "site" / "js" / "page" / "topics.js"
SHARE_LEGEND = "fig_top10_model_monthly_share_legend"  # the legend answer whose order the two share cards take
SHARE_CARD_COUNT = 2  # the monthly request share and the monthly token share

# A node script that prints, as JSON, `{"figures": [...], "legends": [...]}`: every card's figure, and the legend each
# card naming one names.
CARD_FIGURES_SCRIPT = """
const { TOPICS, topicCards } = await import(process.argv[1]);
const cards = TOPICS.flatMap(topicCards);
const legends = cards.filter((card) => card.legend !== undefined).map((card) => card.legend);
console.log(JSON.stringify({ figures: cards.map((card) => card.figure), legends }));
"""


def card_figures() -> dict[str, list[str]]:
    """Every card's figure and every legend a card names, as the cards' module lists them."""
    shown = subprocess.run(
        ["node", "--input-type=module", "--eval", CARD_FIGURES_SCRIPT, TOPICS_MODULE.as_uri()],
        capture_output=True, text=True, check=True,
    )
    return json.loads(shown.stdout)


def test_every_listed_figure_is_one_card_s_figure_or_the_share_legend(artifact_checkout: pathlib.Path) -> None:
    listed = set(figure_answers.listed_figures(artifact_checkout))
    named = card_figures()
    figure_counts = collections.Counter(named["figures"])
    assert [name for name, count in figure_counts.items() if count > 1] == [], "two cards draw one figure"
    assert named["legends"] == [SHARE_LEGEND] * SHARE_CARD_COUNT, "only the two share cards name the share legend"
    shown = set(figure_counts) | set(named["legends"])
    assert sorted(listed - shown) == [], "the artifact lists figures no card draws"
    assert sorted(shown - listed) == [], "cards draw figures the artifact does not list"
