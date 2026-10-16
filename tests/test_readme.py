"""README's Layout block against the repository: every file and folder it names exists, and every module of the site
and of the data step is named there.

The block is the first fenced block after the `## Layout` heading. An entry line holds one name, or several joined by
", ", then two spaces or more and its description; it is indented two spaces per level under the folder entry above
it, a name ending in "/" being a folder. A line indented to the description column or further continues the
description above. A name may hold a `*`, and then names every file it matches, at least one.
"""

import re

from repository_root import ROOT

README = ROOT / "README.md"
LAYOUT_HEADING = "## Layout"
FENCE = "```"
DESCRIPTION_COLUMN = 21  # a line indented this far continues the description of the entry above
NAMES_END = re.compile(r" {2,}")  # two spaces or more end an entry's names and start its description
NAME_SEPARATOR = ", "
MODULE_FOLDERS = ("site/js/", "site_data/")  # every tracked module under these is named in the block
MODULE_SUFFIXES = (".js", ".py")


def layout_lines(readme_text: str) -> list[str]:
    """The lines of the first fenced block after the Layout heading."""
    after_heading = readme_text.split(f"\n{LAYOUT_HEADING}\n", 1)[1]
    block = after_heading.split(FENCE, 2)[1]
    return block.splitlines()[1:]  # the fence's own line ends where the block starts


def layout_names(lines: list[str]) -> list[str]:
    """Every name the block's entry lines give, as a path from the repository's root; a folder's ends in "/"."""
    folders = []  # the folder entries the current line may sit under: `(indent, path)`, shallowest first
    names = []
    for line in lines:
        indent = len(line) - len(line.lstrip(" "))
        if line.strip() == "" or indent >= DESCRIPTION_COLUMN:
            continue
        while folders and folders[-1][0] >= indent:
            folders.pop()
        parent = folders[-1][1] if folders else ""
        entry_names = NAMES_END.split(line.strip(), maxsplit=1)[0]
        for name in entry_names.split(NAME_SEPARATOR):
            names.append(parent + name)
            if name.endswith("/"):
                folders.append((indent, parent + name))
    return names


def is_present(name: str) -> bool:
    """Whether the name is a folder of the repository (ending in "/"), a file, or a pattern matching a file."""
    if "*" in name:
        return any(path.is_file() for path in ROOT.glob(name))
    if name.endswith("/"):
        return (ROOT / name).is_dir()
    return (ROOT / name).is_file()


def test_every_path_the_layout_names_exists() -> None:
    names = layout_names(layout_lines(README.read_text()))
    assert len(names) > 50, "the Layout block names too few paths to be read as an entry list"
    missing = [name for name in names if not is_present(name)]
    assert missing == [], "README's Layout names paths that do not exist:\n" + "\n".join(missing)


def test_every_module_of_the_site_and_the_data_step_is_named(tracked_files: set[str]) -> None:
    names = set(layout_names(layout_lines(README.read_text())))
    modules = []
    for name in sorted(tracked_files):
        if name.startswith(MODULE_FOLDERS) and name.endswith(MODULE_SUFFIXES):
            modules.append(name)
    assert modules, "no module of the site or the data step is tracked"
    unnamed = [module for module in modules if module not in names]
    assert unnamed == [], "README's Layout does not name these modules:\n" + "\n".join(unnamed)


def test_an_entry_sits_under_the_folder_above_it_and_a_description_s_next_line_is_no_entry() -> None:
    lines = [
        "site/                deployed",
        "  js/shared/         shared",
        "    answers.js, format.js",
        "                     two modules",
        "  index.html         the page",
        "tests/               tests",
        "  *.test.js          node",
    ]
    assert layout_names(lines) == [
        "site/", "site/js/shared/", "site/js/shared/answers.js", "site/js/shared/format.js", "site/index.html",
        "tests/", "tests/*.test.js",
    ]


def test_a_missing_path_or_an_unmatched_pattern_is_not_present() -> None:
    assert is_present("site/js/shared/")
    assert is_present("tests/*.test.js")
    assert not is_present("site/about.html")
    assert not is_present("site/js/tables/")
    assert not is_present("tests/*.test.ts")
