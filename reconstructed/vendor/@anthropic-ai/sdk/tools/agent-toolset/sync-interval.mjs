/**
 * @anthropic-ai/sdk/tools/agent-toolset/sync-interval.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */
import { pr } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:71076-71098 esm-fingerprint
var gXo = 15000,
  td = 5000;
//@ chunk-hwmsct5x.js:71098-71272 esm-fingerprint
function M8r(e, n) {
  if (!(e >= td))
    throw new pr(
      `${n} must be at least ${td}ms (got ${e}); to run without memory sync, pass \`memorySyncIntervalMs: null\` to the worker instead`,
    );
}

export { gXo, M8r };
