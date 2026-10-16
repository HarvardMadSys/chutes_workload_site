"""The Insights' cards against the artifact's figure list: every figure `config/figures.json` names is shown by the cards,
as a card's image or as a legend, and the cards show no other. It reads the artifact the environment variable
`ARTIFACT` names, as `make test` passes it, and skips, saying why, without one."""

import json
import os
import pathlib
import subprocess

import pytest

from site_data import figure_images

ROOT = pathlib.Path(__file__).resolve().parent.parent
FIGURE_SECTIONS_MODULE = ROOT / "site" / "js" / "explore" / "figure_sections.js"

# A node script that prints the name of every image the cards show, a card's image and its legend's, as JSON.
SHOWN_IMAGES_SCRIPT = """
const { FIGURE_SECTIONS } = await import(process.argv[1]);
const names = FIGURE_SECTIONS.flatMap((topic) => topic.cards.flatMap((card) => [card.image, card.legendImage]));
console.log(JSON.stringify(names.filter((name) => name !== undefined)));
"""


def artifact_checkout() -> pathlib.Path:
    """The artifact's checkout `ARTIFACT` names, relative to the repository; skips the test when it names none."""
    named = os.environ.get("ARTIFACT", "")
    if named == "":
        pytest.skip("ARTIFACT is not set; run `make test`, or set it to the artifact's checkout, to compare the lists")
    checkout = ROOT / named
    if not (checkout / figure_images.FIGURE_LIST_FILE).is_file():
        pytest.skip(f"no {figure_images.FIGURE_LIST_FILE} under ARTIFACT={named}; set it to the artifact's checkout")
    return checkout


def shown_images() -> set[str]:
    """The name of every image the Insights' cards show, as their module lists them."""
    shown = subprocess.run(
        ["node", "--input-type=module", "--eval", SHOWN_IMAGES_SCRIPT, FIGURE_SECTIONS_MODULE.as_uri()],
        capture_output=True, text=True, check=True,
    )
    return set(json.loads(shown.stdout))


def test_the_cards_show_every_figure_the_artifact_lists_and_no_other() -> None:
    listed = {name.removesuffix(".pdf") for name in figure_images.listed_figure_names(artifact_checkout())}
    shown = shown_images()
    assert sorted(listed - shown) == [], "the artifact lists figures no card shows"
    assert sorted(shown - listed) == [], "cards show figures the artifact does not list"
