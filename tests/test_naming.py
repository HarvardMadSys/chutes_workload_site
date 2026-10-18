"""The name rules, checked on every commit: a name is exported by one module of `site/js/`, and a node test file's name
starts with the folder of the module it tests. Each check is a function over a folder, so that its planted case can
point it at a tree of its own."""

import pathlib
import re

from repository_root import JAVASCRIPT_FOLDER, ROOT

# A name a JavaScript module exports: the name after `export function`, `export async function` or `export const`.
EXPORTED_NAME = re.compile(r"^export\s+(?:async\s+function|function|const)\s+(\w+)", re.MULTILINE)

# The node test files named after what they check, not after a folder: the palette's contrast and the module headers.
NAMED_NODE_CHECKS = ("palette_contrast", "module_headers")


def test_no_two_modules_export_one_name() -> None:
    twice = names_exported_twice(JAVASCRIPT_FOLDER)
    assert twice == [], "names exported by more than one module of site/js/:\n" + "\n".join(twice)


def test_a_name_exported_by_two_modules_is_named(tmp_path: pathlib.Path) -> None:
    (tmp_path / "charts").mkdir()
    (tmp_path / "traffic").mkdir()
    (tmp_path / "charts" / "bars.js").write_text("export async function drawBars(rows) {}\nexport const KIND = 1;\n")
    (tmp_path / "traffic" / "traffic_bars.js").write_text("export async function drawBars(place) {}\n")
    assert names_exported_twice(tmp_path) == ["drawBars: charts/bars.js, traffic/traffic_bars.js"]


def names_exported_twice(folder: pathlib.Path) -> list[str]:
    """Each name that more than one module under `folder` exports (`EXPORTED_NAME`), sorted, written with the modules
    that export it, as paths from `folder`: "drawBars: charts/bars.js, traffic/traffic_bars.js"."""
    modules_by_name = {}
    for path in sorted(folder.rglob("*.js")):
        for name in EXPORTED_NAME.findall(path.read_text()):
            modules_by_name.setdefault(name, []).append(path.relative_to(folder).as_posix())
    twice = []
    for name, modules in sorted(modules_by_name.items()):
        if len(modules) > 1:
            twice.append(f"{name}: {', '.join(modules)}")
    return twice


def test_node_test_files_start_with_a_folder() -> None:
    misnamed = misnamed_node_test_files(ROOT / "tests", JAVASCRIPT_FOLDER)
    assert misnamed == [], "node test files whose name starts with no folder of site/js/:\n" + "\n".join(misnamed)


def test_a_node_test_file_named_for_no_folder_is_named(tmp_path: pathlib.Path) -> None:
    (tmp_path / "js" / "shared").mkdir(parents=True)
    (tmp_path / "js" / "traffic").mkdir()
    for name in ("shared_format", "traffic", "fake_page", "palette_contrast", "format", "helper"):
        (tmp_path / f"{name}.test.js").write_text("")
    (tmp_path / "fake_page.js").write_text("")
    assert misnamed_node_test_files(tmp_path, tmp_path / "js") == ["format.test.js", "helper.test.js"]


def misnamed_node_test_files(tests: pathlib.Path, javascript: pathlib.Path) -> list[str]:
    """The node test files of `tests`, sorted, whose name's word before the first "_", or whole name before ".test.js",
    is no folder of `javascript`; but for `NAMED_NODE_CHECKS` and a test helper's test, a `<name>.test.js` whose
    `<name>.js` is in `tests`."""
    folders = {path.name for path in javascript.iterdir() if path.is_dir()}
    misnamed = []
    for path in sorted(tests.glob("*.test.js")):
        name = path.name.removesuffix(".test.js")
        is_helper_test = (tests / f"{name}.js").is_file()
        if name not in NAMED_NODE_CHECKS and not is_helper_test and name.split("_")[0] not in folders:
            misnamed.append(path.name)
    return misnamed
