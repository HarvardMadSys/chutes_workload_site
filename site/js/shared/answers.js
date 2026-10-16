/**
 * The Explore page's data, read from files, with no query run in the browser: the answers of the queries and the index
 * of the figure images. `make data` runs every query under `site/queries/explore/` and writes each one's rows to
 * `data/all/<name>.json`, `name` being the query's path under `site/queries/` without `.sql`:
 * `readAnswer("explore/trace_totals")` reads `data/all/explore/trace_totals.json`. It also renders each of the paper's
 * figures to `figures/<name>.png` and lists their sizes in `figures/index.json`, which `readFigureIndex` reads.
 */

// The folder of the answers, relative to a page: the query `name`'s answer is `<folder><name>.json`.
const ANSWERS_FOLDER = "data/all/";

// The index of the figure images, relative to a page.
const FIGURE_INDEX_FILE = "figures/index.json";

/** The rows of the query `name`'s answer, read from its file: each an object from column name to value. */
export async function readAnswer(name) {
  return (await fetchFile(`${ANSWERS_FOLDER}${name}.json`)).json();
}

/**
 * The size of every figure image, read from the index: a Map from the image's name (`fig_request_rate_day`) to its
 * `{ width, height }` in pixels.
 */
export async function readFigureIndex() {
  const images = await (await fetchFile(FIGURE_INDEX_FILE)).json();
  const sizes = new Map();
  for (const image of images) {
    sizes.set(image.name, { width: image.width, height: image.height });
  }
  return sizes;
}

/** The response to fetching `file` relative to the page; throws naming the file if it cannot be fetched. */
async function fetchFile(file) {
  const response = await fetch(file);
  if (!response.ok) {
    throw new Error(`Could not fetch ${file}: ${response.status} ${response.statusText}`);
  }
  return response;
}
