"""The repository's root folder, from which the tests and the snapshot script find the site's files."""

import pathlib

ROOT = pathlib.Path(__file__).resolve().parent.parent  # this module sits in tests/, at the top of the repository
JAVASCRIPT_FOLDER = ROOT / "site" / "js"  # the site's JavaScript modules, a folder per purpose
