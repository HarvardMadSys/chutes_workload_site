"""The repository's rules, checked on every commit: short units, small folders, no aliased imports, one home for library
URLs and for SQL, libraries loaded only where they are drawn with, one page, each exported name exported by one module,
node test files named after a folder; and the files git tracks: the expected set by folder (no rows, no PDFs, no
installed packages), no machine path, none too large to host. The built data's own checks are `test_built_data.py`'s."""

import ast
import pathlib
import re

from repository_root import ROOT

MAX_FUNCTION_LINES = 50  # a longer function does two jobs
MAX_MODULE_LINES = 300  # a longer module holds two purposes
MAX_MODULES_PER_FOLDER = 9  # a folder holds one purpose and about eight modules
JAVASCRIPT_FOLDER = ROOT / "site" / "js"
LIBRARIES_MODULE = ROOT / "site" / "js" / "shared" / "libraries.js"  # the only file that names a library URL
QUERIES_FOLDER = ROOT / "site" / "queries"  # the only place SQL is written
ANSWERS_MODULE = JAVASCRIPT_FOLDER / "shared" / "answers.js"  # the page's answers
PAGES = ("index.html",)  # the site's pages: index.html alone
PAGE_SCRIPT = '<script type="module" src="js/page/main.js"></script>'  # how index.html loads the page's module
CDN_HOSTS = ("cdn.jsdelivr.net", "unpkg.com", "cdnjs.cloudflare.com", "esm.sh")
MAX_FILE_BYTES = 25 * 1024 * 1024  # the largest file Cloudflare serves as a static asset

# The files at the top of the repository: its documents, its build and test commands, its package and deploy settings.
ROOT_FILES = {
    "CLAUDE.md", "CONTRIBUTING.md", "README.md", "Makefile", ".gitignore", ".nvmrc", "package.json",
    "package-lock.json", "pyproject.toml", "wrangler.jsonc",
}

# The suffixes the files of each folder may have; a file takes its deepest listed folder's. A file in no listed folder,
# or of another suffix (a Parquet file of rows, a figure's PDF or image), is not part of the site.
TRACKED_SUFFIXES_BY_FOLDER = {
    ".github/workflows": {".yml"},
    "openspec": {".md", ".yaml"},
    "site": {".html", ".css", ".svg"},
    "site/js": {".js"},
    "site/queries": {".sql"},
    "site/data": {".json"},
    "site_data": {".py"},
    "tables": {".parquet", ".json"},
    "tests": {".py", ".js"},
    "tests/snapshots": {".txt"},
}

# Folders that are installed or generated on a machine, never part of the repository, wherever they sit.
NEVER_TRACKED_FOLDERS = {"node_modules", ".venv", "__pycache__", ".wrangler"}

# A static import of the libraries module, by any relative path: the `from` clause, or an import for its side effects.
# A dynamic `await import("./libraries.js")` is the allowed way and does not match.
STATIC_LIBRARIES_IMPORT = re.compile(r"""(\bfrom\s+|^\s*import\s+)["'][^"']*libraries\.js["']""")

# A static import's module, a relative path in the `from` clause: `import { thing } from "./module.js";`.
RELATIVE_IMPORT = re.compile(r"""\bfrom\s+["'](\.{1,2}/[^"']+)["']""")

# The node test files named after what they check, not after a folder: the palette's contrast and the module headers.
NAMED_NODE_CHECKS = ("palette_contrast", "module_headers")

# A name a JavaScript module exports: the name after `export function`, `export async function` or `export const`.
EXPORTED_NAME = re.compile(r"^export\s+(?:async\s+function|function|const)\s+(\w+)", re.MULTILINE)

# An absolute path on a maintainer's machine: a home, project or scratch folder.
MACHINE_PATH = re.compile(r"/(home|madsys|scratch)/")

# A line of SQL: a statement keyword followed by the clause that names its table.
SQL_STATEMENT = re.compile(r"\b(SELECT|INSERT|CREATE|UPDATE|DELETE)\b.*\b(FROM|INTO|TABLE|VIEW)\b", re.IGNORECASE)

# Where a JavaScript function starts: a declaration, an arrow function given a name, or a method.
JS_FUNCTION_STARTS = (
    re.compile(r"^\s*(export\s+)?(async\s+)?function\b.*\{\s*$"),
    re.compile(r"^\s*(export\s+)?(const|let)\s+\w+\s*=\s*(async\s*)?\(.*\)\s*=>\s*\{\s*$"),
    re.compile(r"^\s*(async\s+)?(?!if\b|for\b|while\b|switch\b|catch\b)\w+\s*\(.*\)\s*\{\s*$"),
)


def python_files() -> list[pathlib.Path]:
    return sorted((ROOT / "site_data").rglob("*.py")) + sorted((ROOT / "tests").glob("*.py"))


def javascript_files() -> list[pathlib.Path]:
    return sorted((ROOT / "site" / "js").rglob("*.js")) + sorted((ROOT / "tests").glob("*.js"))


def line_count(path: pathlib.Path) -> int:
    return len(path.read_text().splitlines())


def javascript_function_lengths(lines: list[str]) -> list[tuple[int, int]]:
    """(first line, length) of each function: from its opening line to the closing brace at the same indent."""
    lengths = []
    for start, line in enumerate(lines):
        if not any(pattern.match(line) for pattern in JS_FUNCTION_STARTS):
            continue
        indent = line[: len(line) - len(line.lstrip())]
        closers = {indent + "}", indent + "};", indent + "})", indent + "});"}
        for end in range(start + 1, len(lines)):
            if lines[end].rstrip() in closers:
                lengths.append((start + 1, end - start + 1))
                break
    return lengths


def test_python_functions_are_short() -> None:
    for path in python_files():
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                length = node.end_lineno - node.lineno + 1
                assert length <= MAX_FUNCTION_LINES, f"{path.relative_to(ROOT)}:{node.lineno} {node.name} is {length} lines"


def test_javascript_functions_are_short() -> None:
    for path in javascript_files():
        for first_line, length in javascript_function_lengths(path.read_text().splitlines()):
            assert length <= MAX_FUNCTION_LINES, f"{path.relative_to(ROOT)}:{first_line} is a {length}-line function"


def test_modules_are_short() -> None:
    for path in python_files() + javascript_files():
        assert line_count(path) <= MAX_MODULE_LINES, f"{path.relative_to(ROOT)} is {line_count(path)} lines"


def test_python_imports_are_not_aliased() -> None:
    for path in python_files():
        for node in ast.walk(ast.parse(path.read_text())):
            if isinstance(node, (ast.Import, ast.ImportFrom)):
                for alias in node.names:
                    assert alias.asname is None, f"{path.relative_to(ROOT)}:{node.lineno} imports {alias.name} as {alias.asname}"


def test_library_urls_live_in_one_module() -> None:
    for path in javascript_files() + sorted((ROOT / "site").glob("*.html")):
        if path == LIBRARIES_MODULE:
            continue
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            assert not any(host in line for host in CDN_HOSTS), f"{path.relative_to(ROOT)}:{number} names a library URL"


def test_sql_lives_in_query_files() -> None:
    for path in javascript_files():
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            assert not SQL_STATEMENT.search(line), f"{path.relative_to(ROOT)}:{number} holds SQL; it belongs in {QUERIES_FOLDER.name}/"


def test_javascript_folders_are_small() -> None:
    for folder in sorted(path for path in JAVASCRIPT_FOLDER.rglob("*") if path.is_dir()):
        modules = sorted(folder.glob("*.js"))
        assert len(modules) <= MAX_MODULES_PER_FOLDER, f"{folder.relative_to(ROOT)} holds {len(modules)} modules"


def test_only_a_dynamic_import_loads_the_libraries() -> None:
    # node cannot load the CDN's modules, so a module that imported them statically could not be tested.
    for path in javascript_files():
        if path == LIBRARIES_MODULE:
            continue
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            assert not STATIC_LIBRARIES_IMPORT.search(line), f"{path.relative_to(ROOT)}:{number} imports {LIBRARIES_MODULE.name} statically"


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
    return [f"{name}: {', '.join(modules)}" for name, modules in sorted(modules_by_name.items()) if len(modules) > 1]


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


def statically_imported_modules(page_module: pathlib.Path) -> set[pathlib.Path]:
    """The page module and every module it imports statically, directly or through another, as resolved paths."""
    found = set()
    to_read = [page_module.resolve()]
    while to_read:
        module = to_read.pop()
        if module in found:
            continue
        found.add(module)
        for name in RELATIVE_IMPORT.findall(module.read_text()):
            to_read.append((module.parent / name).resolve())
    return found


def test_the_page_s_start_imports_the_answers_module() -> None:
    assert ANSWERS_MODULE.resolve() in statically_imported_modules(JAVASCRIPT_FOLDER / "page" / "start.js")


def test_the_site_has_one_page_with_its_module() -> None:
    assert tuple(sorted(path.name for path in (ROOT / "site").glob("*.html"))) == PAGES
    assert (JAVASCRIPT_FOLDER / "page" / "main.js").is_file()
    assert PAGE_SCRIPT in (ROOT / "site" / "index.html").read_text()


def tracked_text_files(tracked_files: set[str]) -> list[pathlib.Path]:
    """Every file of `tracked_files` that reads as UTF-8 text."""
    text_files = []
    for name in sorted(tracked_files):
        path = ROOT / name
        if not path.is_file():  # a tracked file deleted but not yet staged, or a symbolic link to a folder
            continue
        try:
            path.read_text()
        except UnicodeDecodeError:
            continue
        text_files.append(path)
    return text_files


def test_no_tracked_file_names_a_machine_path(tracked_files: set[str]) -> None:
    for path in tracked_text_files(tracked_files):
        for number, line in enumerate(path.read_text().splitlines(), start=1):
            assert not MACHINE_PATH.search(line), f"{path.relative_to(ROOT)}:{number} names a machine path"


def test_tracked_files_are_the_expected_set(tracked_files: set[str]) -> None:
    unexpected = unexpected_files(tracked_files)
    assert unexpected == [], "tracked files that are no file of the site:\n" + "\n".join(unexpected)


def test_a_file_outside_the_expected_set_is_named() -> None:
    planted = {
        "README.md", "site/js/start.js", "site/figures/a.png", "site/data/rows.parquet", "notes.txt",
        "tests/node_modules/x.js", "site/data/all/figures/fig_seasonality.json", "site/data/all/figures.json",
        "tables/weekly_histograms.parquet",
    }
    expected = ["notes.txt", "site/data/rows.parquet", "site/figures/a.png", "tests/node_modules/x.js"]
    assert unexpected_files(planted) == expected


def unexpected_files(names: set[str]) -> list[str]:
    """The names, sorted, that are no file of the site: a top-level file not in `ROOT_FILES`, a file whose suffix its
    folder does not take (`TRACKED_SUFFIXES_BY_FOLDER`), or one inside a folder of `NEVER_TRACKED_FOLDERS`."""
    unexpected = []
    for name in sorted(names):
        path = pathlib.PurePosixPath(name)
        if any(part in NEVER_TRACKED_FOLDERS for part in path.parts):
            unexpected.append(name)
        elif len(path.parts) == 1:
            if name not in ROOT_FILES:
                unexpected.append(name)
        elif path.suffix not in suffixes_of_folder(path.parent):
            unexpected.append(name)
    return unexpected


def suffixes_of_folder(folder: pathlib.PurePosixPath) -> set[str]:
    """The suffixes a file in `folder` may have: those of the deepest folder of `TRACKED_SUFFIXES_BY_FOLDER` that holds
    it; none for a folder outside every one."""
    for holder in [folder, *folder.parents]:
        if holder.as_posix() in TRACKED_SUFFIXES_BY_FOLDER:
            return TRACKED_SUFFIXES_BY_FOLDER[holder.as_posix()]
    return set()


def test_no_tracked_file_is_too_large_to_host(tracked_files: set[str]) -> None:
    for name in sorted(tracked_files):
        path = ROOT / name
        if path.is_file():
            assert path.stat().st_size <= MAX_FILE_BYTES, f"{name} is {path.stat().st_size:,} bytes"
