"""The names of the folders and files the data step writes into the site's data folder, and the JSON form they are
written in.

The answers of the queries are at `all/<folder>/<query>.json`, with the hash of each query's text in
`all/queries.json`.
"""

ANSWERS_FOLDER = "all"  # the answers of every Explore query, over the whole trace
QUERY_HASHES_FILE = "queries.json"  # in the answers folder: the hash of the text of each query the answers come from
# Commas and colons without spaces: every byte is fetched by the visitors.
JSON_SEPARATORS = (",", ":")


def answer_file(query_name: str) -> str:
    """The path of a query's answer, relative to the data folder: `all/<folder>/<query>.json`."""
    return f"{ANSWERS_FOLDER}/{answer_file_in_folder(query_name)}"


def answer_file_in_folder(query_name: str) -> str:
    """The path of a query's answer, relative to the answers folder: `<folder>/<query>.json`."""
    return f"{query_name}.json"
