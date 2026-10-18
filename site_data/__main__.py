"""Build the site's data folder: `python -m site_data --artifact <dir> --out <dir> [--tables <dir>]`.

The artifact is a checkout of the paper's artifact repository, whose caches, figure list and plot-ready tables the step
reads; the tables folder, by default this repository's `tables/`, holds the trace table `make tables` built. It writes
the answer of every query of `queries/explore/` under the data folder (`answers.py`), then the answer of every listed
figure there (`figure_answers.py`), and prints each file written with its size, then the totals. Every cache, the
trace table and every plot-ready table are read in memory first: a missing artifact folder or file stops the run with
its message and exit status 1, before anything is written.
"""

import argparse
import pathlib
import sys

from site_data import answers, figure_answers, loading, site_database


def main(arguments: list[str] | None = None) -> None:
    """Read the artifact named on the command line and write the site's answers and figure answers from it."""
    options = parsed_arguments(arguments)
    if not options.artifact.is_dir():
        print(f"the artifact folder {options.artifact} does not exist; pass a checkout of the paper's artifact "
              "repository as --artifact", file=sys.stderr)
        raise SystemExit(1)
    frames = loading.load_artifact(options.artifact)
    weekly_histograms = loading.load_trace_table(options.tables)
    figure_tables = figure_answers.read_figure_tables(options.artifact)
    connection = site_database.open_database(frames, weekly_histograms)
    # The figure answers come second: writing the query answers replaces the whole answers folder.
    print_sizes("answers", answers.write_answers(connection, options.out))
    print_sizes("figure answers", figure_answers.write_figure_answers(figure_tables, options.out))


def parsed_arguments(arguments: list[str] | None) -> argparse.Namespace:
    """The artifact, data and tables folders named on the command line, the tables folder by default this
    repository's."""
    parser = argparse.ArgumentParser(prog="python -m site_data", description="Build the site's data folder.")
    parser.add_argument("--artifact", type=pathlib.Path, required=True,
                        help="a checkout of the paper's artifact repository")
    parser.add_argument("--out", type=pathlib.Path, required=True, help="the data folder to write")
    parser.add_argument("--tables", type=pathlib.Path, default=loading.TABLES_FOLDER,
                        help="the folder holding the trace table make tables built (default: this repository's)")
    return parser.parse_args(arguments)


def print_sizes(kind: str, files: list[pathlib.Path]) -> None:
    """Print each file with its size in bytes, then how many there are of `kind` and their total size."""
    total = 0
    for path in files:
        size = path.stat().st_size
        total += size
        print(f"{path}  {size:,} bytes")
    print(f"{len(files)} {kind}, {total:,} bytes")


if __name__ == "__main__":
    main()
