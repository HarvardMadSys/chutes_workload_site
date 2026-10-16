/**
 * The Explore page's data, read from files, with no query run in the browser: the answers of the queries. `make data`
 * runs every query under `site/queries/explore/` and writes each one's rows to `data/all/<name>.json`, `name` being the
 * query's path under `site/queries/` without `.sql`: `readAnswer("explore/trace_totals")` reads
 * `data/all/explore/trace_totals.json`.
 */

// The folder of the answers, relative to a page: the query `name`'s answer is `<folder><name>.json`.
const ANSWERS_FOLDER = "data/all/";

/** The rows of the query `name`'s answer, read from its file: each an object from column name to value. */
export async function readAnswer(name) {
  return (await fetchFile(`${ANSWERS_FOLDER}${name}.json`)).json();
}

/** The response to fetching `file` relative to the page; throws naming the file if it cannot be fetched. */
async function fetchFile(file) {
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Could not fetch ${file}: ${response.status} ${response.statusText}`);
  }
  return response;
}
