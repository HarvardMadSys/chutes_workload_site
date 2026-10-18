"""The name rules, checked on every commit: a name is exported by one module of `site/js/`, a node test file's name
starts with the folder of the module it tests, and no module of `tests/` imports a test module by its name (a Python
module named `test_*`, a `*.test.js` file). Each check is a function over a folder, so that its planted case can point
it at a tree of its own."""

import ast
import pathlib
import re

from repository_root import JAVASCRIPT_FOLDER, ROOT

# A name a JavaScript module exports: the name after `export function`, `export async function` or `export const`.
EXPORTED_NAME = re.compile(r"^export\s+(?:async\s+function|function|const)\s+(\w+)", re.MULTILINE)

# The node test files named after what they check, not after a folder: the palette's contrast and the module headers.
NAMED_NODE_CHECKS = ("palette_contrast", "module_headers")

# A JavaScript import of a node test file, static or dynamic, its braces spanning lines or not: the file's path.
NODE_TEST_FILE_IMPORT = re.compile(r"""\bimport\b[^;]*?["']([^"']*\.test\.js)["']""")


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


def test_no_test_module_imports_a_test_module() -> None:
    found = imports_of_test_modules(ROOT / "tests")
    listed = "\n".join(found)
    assert found == [], f"test modules import a test module; move what they share into a module of its own:\n{listed}"


def test_a_test_module_importing_a_test_module_is_named(tmp_path: pathlib.Path) -> None:
    (tmp_path / "test_built_data.py").write_text("import json\n\nimport test_tables\n")
    (tmp_path / "test_site_database.py").write_text("import counted_requests\nfrom test_queries import SITE_TABLES\n")
    (tmp_path / "counted_requests.py").write_text("import typing\n")
    (tmp_path / "traffic.test.js").write_text(
        'import { test } from "node:test";\n\nimport {\n  EVERYTHING,\n} from "./traffic_filter.test.js";\n')
    (tmp_path / "fake_page.js").write_text('import { readFile } from "node:fs/promises";\n')
    assert imports_of_test_modules(tmp_path) == [
        "test_built_data.py:3 imports test_tables",
        "test_site_database.py:2 imports test_queries",
        "traffic.test.js:3 imports ./traffic_filter.test.js",
    ]


def imports_of_test_modules(tests: pathlib.Path) -> list[str]:
    """Each import of a test module in a module of `tests`, Python's then JavaScript's, each sorted by file, written
    as "<file>:<line> imports <module>"."""
    return python_imports_of_test_modules(tests) + node_imports_of_test_files(tests)


def python_imports_of_test_modules(tests: pathlib.Path) -> list[str]:
    """Each `import test_x` or `from test_x import ...` in a Python module of `tests`."""
    found = []
    for path in sorted(tests.glob("*.py")):
        for node in ast.walk(ast.parse(path.read_text())):
            for module in imported_modules(node):
                if module.startswith("test_"):
                    found.append(f"{path.name}:{node.lineno} imports {module}")
    return found


def imported_modules(node: ast.AST) -> list[str]:
    """The modules an import statement names: each of `import a, b`, the one of `from a import x`; none for any other
    node, nor for a relative `from . import x`."""
    if isinstance(node, ast.Import):
        return [alias.name for alias in node.names]
    if isinstance(node, ast.ImportFrom) and node.module is not None:
        return [node.module]
    return []


def node_imports_of_test_files(tests: pathlib.Path) -> list[str]:
    """Each import of a `*.test.js` file in a JavaScript file of `tests` (`NODE_TEST_FILE_IMPORT`), at the line where
    the import starts."""
    found = []
    for path in sorted(tests.glob("*.js")):
        text = path.read_text()
        for match in NODE_TEST_FILE_IMPORT.finditer(text):
            line = text.count("\n", 0, match.start()) + 1
            found.append(f"{path.name}:{line} imports {match.group(1)}")
    return found
