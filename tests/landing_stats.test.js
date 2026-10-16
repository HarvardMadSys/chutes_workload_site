import assert from "node:assert/strict";
import { test } from "node:test";

import { statsRows } from "../site/js/landing/stats.js";

test("the strip writes the totals' requests and input tokens compactly, each with its noun", () => {
  assert.deepEqual(statsRows({ requests: 1_186_582_000, input_tokens: 209_000_000_000 }), [
    { value: "1.19B", label: "requests" },
    { value: "209.0B", label: "input tokens" },
  ]);
});
