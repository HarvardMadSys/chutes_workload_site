"""Build the site's data folder: `python -m site_data --artifact <dir> --out <dir> --figures <dir>`.

The artifact is a checkout of the paper's artifact repository, whose caches and figures the step reads. It writes the
answer of every Explore query under the data folder (`answers.py`) and an image of every listed figure into the
figures folder (`figure_images.py`), and prints each file written with its size, then the totals. A missing artifact
folder or file stops the run with its message and exit status 1, before anything is written.
"""

import argparse
import pathlib
import sys

from site_data import answers, figure_images, loading, site_database


def main(arguments: list[str] | None = None) -> None:
    """Read the artifact named on the command line and write the site's answers and figure images from it."""
    options = parsed_arguments(arguments)
    if not options.artifact.is_dir():
        print(f"the artifact folder {options.artifact} does not exist; pass a checkout of the paper's artifact "
              "repository as --artifact", file=sys.stderr)
        raise SystemExit(1)
    frames = loading.load_artifact(options.artifact)
    figures = figure_images.listed_figures(options.artifact)
    connection = site_database.open_database(frames)
    print_sizes("answers", answers.write_answers(connection, options.out))
    print_sizes("figure images", figure_images.write_figure_images(figures, options.figures))


def parsed_arguments(arguments: list[str] | None) -> argparse.Namespace:
    """The artifact, data and figures folders named on the command line."""
    parser = argparse.ArgumentParser(prog="python -m site_data", description="Build the site's data folder.")
    parser.add_argument("--artifact", type=pathlib.Path, required=True,
                        help="a checkout of the paper's artifact repository")
    parser.add_argument("--out", type=pathlib.Path, required=True, help="the data folder to write")
    parser.add_argument("--figures", type=pathlib.Path, required=True, help="the folder of figure images to write")
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
