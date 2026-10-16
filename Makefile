PYTHON = .venv/bin/python

# The paper's artifact repository, a sibling folder: the caches and plot-ready tables the data step reads. Override to
# build from another checkout:  make data ARTIFACT=~/chutes_workload
ARTIFACT ?= ../2027_chutes_repo_artifact

.PHONY: setup setup-browser data serve test snapshots deploy

# Create the virtual environment and install this package with its test tools; the artifact is read, not installed.
setup:
	python3.12 -m venv .venv
	$(PYTHON) -m pip install --upgrade pip
	$(PYTHON) -m pip install -e '.[test]'

# The headless Chromium the snapshot test opens the pages in, also for checking pages by hand; without it the snapshot
# test skips, saying so.
setup-browser:
	$(PYTHON) -m playwright install chromium

# Build site/data from the artifact.
data:
	$(PYTHON) -m site_data --artifact $(ARTIFACT) --out site/data

# Serve the site locally at http://localhost:8000 with Python's own file server.
serve:
	python3 -m http.server -d site -b 127.0.0.1 8000

# The Python tests, the JavaScript modules' tests, then the snapshot test. The Python tests are given the artifact's
# checkout, against whose figure list they compare the Insights' cards; without it that test skips, saying so.
test:
	ARTIFACT=$(ARTIFACT) $(PYTHON) -m pytest
	node --test "tests/*.test.js"
	$(PYTHON) tests/snapshot.py

# Rewrite tests/snapshots/ from the pages as they are now, when a change is meant to alter what a page shows.
snapshots:
	$(PYTHON) tests/snapshot.py --write

# Publish site/, with its data, to Cloudflare as the static assets of the Worker wrangler.jsonc names. Needs
# `npm ci` once and a Cloudflare API token (see README); a push to main deploys the same way through
# .github/workflows/deploy.yml.
deploy:
	npx wrangler deploy
