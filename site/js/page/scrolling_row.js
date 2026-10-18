/**
 * A row that scrolls sideways, such as the Insights' row of tabs: the fade at its right edge while more lies beyond
 * it, and the scroll that brings one of its items into view. Each function takes the row's element and keeps no state.
 */

// The room, in pixels, kept before an item that a row scrolls sideways to bring into view.
const ROW_EDGE_ROOM = 16;

/** Keep `row`, which scrolls sideways, marked while more lies beyond its right edge: now, on scroll and on resize. */
export function mountScrollingRow(row) {
  markMoreBeyondEdge(row);
  row.addEventListener("scroll", () => markMoreBeyondEdge(row));
  new ResizeObserver(() => markMoreBeyondEdge(row)).observe(row);
}

/**
 * Mark `element` with the class `has-more-beyond-edge` while its content lies beyond its right edge, so the page fades
 * that edge to say it scrolls sideways.
 */
export function markMoreBeyondEdge(element) {
  const isMoreBeyond = element.scrollLeft + element.clientWidth < element.scrollWidth - 1;
  element.classList.toggle("has-more-beyond-edge", isMoreBeyond);
}

/**
 * Scroll `row` sideways, where it scrolls, so that `item`, one of its elements, lies wholly in it with a little room
 * before it; an item already wholly in the row leaves it where it is.
 */
export function bringIntoRow(row, item) {
  const rowBox = row.getBoundingClientRect();
  const itemBox = item.getBoundingClientRect();
  if (itemBox.left < rowBox.left || itemBox.right > rowBox.right) {
    row.scrollLeft += itemBox.left - rowBox.left - ROW_EDGE_ROOM;
  }
}
