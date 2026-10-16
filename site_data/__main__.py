"""Build the site's data folder: `python -m site_data --artifact <dir> --out <dir> --figures <dir>`.

The artifact is a checkout of the paper's artifact repository, whose caches and figures the step reads. A missing
artifact folder stops the run with its message and exit status 1, before anything is written.
"""

import argparse
import pathlib
import sys


def main(arguments: list[str] | None = None) -> None:
    """Stop with exit status 1, naming the folder, unless the artifact folder exists."""
    options = parsed_arguments(arguments)
    if not options.artifact.is_dir():
        print(f"the artifact folder {options.artifact} does not exist; pass a checkout of the paper's artifact "
              "repository as --artifact", file=sys.stderr)
        raise SystemExit(1)


def parsed_arguments(arguments: list[str] | None) -> argparse.Namespace:
    """The artifact, data and figures folders named on the command line."""
    parser = argparse.ArgumentParser(prog="python -m site_data", description="Build the site's data folder.")
    parser.add_argument("--artifact", type=pathlib.Path, required=True,
                        help="a checkout of the paper's artifact repository")
    parser.add_argument("--out", type=pathlib.Path, required=True, help="the data folder to write")
    parser.add_argument("--figures", type=pathlib.Path, required=True, help="the folder of figure images to write")
    return parser.parse_args(arguments)


if __name__ == "__main__":
    main()
