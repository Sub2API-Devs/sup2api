/**
 * @anthropic-ai/sdk/tools/agent-toolset/sync-interval.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (2)
 * attribution: esm-fingerprint 2
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-hwmsct5x.js:71076-71098 esm-fingerprint
var DEFAULT_MEMORY_SYNC_INTERVAL_MS = 15000;
var MIN_MEMORY_SYNC_INTERVAL_MS = 5000;
//@ chunk-hwmsct5x.js:71098-71272 esm-fingerprint
function M8r(ms, option) {
  if (!(ms >= MIN_MEMORY_SYNC_INTERVAL_MS))
    throw new AnthropicError(
      `${option} must be at least ${MIN_MEMORY_SYNC_INTERVAL_MS}ms (got ${ms}); to run without memory sync, pass \`memorySyncIntervalMs: null\` to the worker instead`,
    );
}
export { DEFAULT_MEMORY_SYNC_INTERVAL_MS, M8r };
