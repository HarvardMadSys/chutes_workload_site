"""The site's database for the tests: `site_data.site_database`, which sets the database up as the data step does,
under the names the tests use, a query's rows as a frame, and the list of every query.

A test opens the database over a few rows of its own and runs a query by name, exactly as the data step runs it.
"""

import duckdb
import pandas

import site_data.site_database

QUERIES_FOLDER = site_data.site_database.QUERIES_FOLDER  # every query file, under its page's folder

open_site_database = site_data.site_database.open_site_database
statement_text = site_data.site_database.statement_text


def run_query(connection: duckdb.DuckDBPyConnection, name: str) -> pandas.DataFrame:
    """The rows of the query `name`, as a frame with the query's columns."""
    return connection.execute(statement_text(name)).df()


def query_names() -> list[str]:
    """The name of every query a page reads: each `.sql` file under `site/queries/`, sorted."""
    names = []
    for path in sorted(QUERIES_FOLDER.rglob("*.sql")):
        names.append(path.relative_to(QUERIES_FOLDER).with_suffix("").as_posix())
    return names
