// The routing policies' colours (`insights/routing_panels.js`): one per policy, the same for every model.
import assert from "node:assert/strict";
import { test } from "node:test";

import { policyColours, seriesPolicy } from "../site/js/insights/routing_panels.js";
import { OTHER_SERIES, SERIES_SLOTS } from "../site/js/theme/colours.js";

test("a routing series takes its policy's colour, the same for every model, the cache-blind baseline grey", () => {
  const policies = ["Round-robin", "Load-first", "Cache-first", "Sticky"];
  const names = [...policies.map((policy) => `DeepSeek, ${policy}`), ...policies.map((policy) => `MiniMax, ${policy}`)];
  const colours = [OTHER_SERIES, SERIES_SLOTS[0], SERIES_SLOTS[7], SERIES_SLOTS[2]];
  assert.deepEqual([...policyColours(names).values()], [...colours, ...colours]);
  assert.equal(seriesPolicy("MiniMax M2.5, Cache-first"), "Cache-first");
  assert.throws(() => policyColours(["Sticky"]), /"Sticky"/);
  assert.throws(() => policyColours(["DeepSeek, Random"]), /"Random"/);
});
