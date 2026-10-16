"""The deployment settings: `wrangler.jsonc` names the Worker and serves `site/` as its static assets, and every path
the deploy workflow asks the published site for is a file of `site/`, among them the page, the daily by-family answer
and one figure image."""

import json
import pathlib
import re

from repository_root import ROOT

WRANGLER_SETTINGS = ROOT / "wrangler.jsonc"
DEPLOY_WORKFLOW = ROOT / ".github" / "workflows" / "deploy.yml"
WORKER_NAME = "chutes-trace-site"  # the Worker the site is deployed to, and its workers.dev hostname
ASSETS_DIRECTORY = "./site"  # the folder deployed as is, its data and figures included
PAGE_FILE = "index.html"  # the file `/` answers with

# The paths the deploy workflow must check after each deploy: the page, the daily by-family answer and one figure image.
REQUIRED_CHECKED_PATHS = {"/", "/data/all/explore/daily_by_family.json", "/figures/fig_request_rate_day.png"}

# A check of the workflow's last step: `check_answer "<path>" "<content type>"`.
CHECK_ANSWER_LINE = re.compile(r'^\s*check_answer\s+"(?P<path>/[^"]*)"\s+"(?P<content_type>[^"]+)"\s*$')

# The content type each checked file's suffix is served with.
CONTENT_TYPE_BY_SUFFIX = {".html": "text/html", ".json": "application/json", ".png": "image/png"}


def wrangler_settings() -> dict:
    """`wrangler.jsonc` read as JSON, its whole-line `//` comments dropped."""
    lines = WRANGLER_SETTINGS.read_text().splitlines()
    kept = [line for line in lines if not line.lstrip().startswith("//")]
    return json.loads("\n".join(kept))


def checked_answers() -> dict[str, str]:
    """The workflow's checks: the content type each checked path must answer with, by path."""
    answers = {}
    for line in DEPLOY_WORKFLOW.read_text().splitlines():
        match = CHECK_ANSWER_LINE.match(line)
        if match:
            answers[match["path"]] = match["content_type"]
    return answers


def site_file(path: str) -> pathlib.Path:
    """The file of `site/` that a request for `path` is answered with."""
    if path.endswith("/"):
        return ROOT / "site" / path.lstrip("/") / PAGE_FILE
    return ROOT / "site" / path.lstrip("/")


def test_wrangler_names_the_worker_and_its_assets() -> None:
    settings = wrangler_settings()
    assert settings["name"] == WORKER_NAME
    assert settings["assets"]["directory"] == ASSETS_DIRECTORY
    assert settings["workers_dev"] is True


def test_the_workflow_checks_the_worker_s_hostname() -> None:
    assert f'host="{WORKER_NAME}.' in DEPLOY_WORKFLOW.read_text()


def test_the_workflow_checks_the_page_the_family_answer_and_a_figure() -> None:
    assert REQUIRED_CHECKED_PATHS <= set(checked_answers())


def test_every_checked_path_is_a_file_of_the_site() -> None:
    for path in checked_answers():
        assert site_file(path).is_file(), f"the deploy workflow checks {path}, which site/ does not hold"


def test_every_checked_content_type_is_its_file_s() -> None:
    for path, content_type in checked_answers().items():
        suffix = site_file(path).suffix
        assert CONTENT_TYPE_BY_SUFFIX[suffix] == content_type, f"{path} is checked for {content_type}"
