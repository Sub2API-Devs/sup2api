/**
 * @anthropic-ai/sdk/tools/agent-toolset/sync-interval.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (2)
 * attribution: esm-fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { AnthropicError } from "../../core/error.mjs";

//@ chunk-vn3g7zt8.js:71447-71469 esm-fingerprint
var DEFAULT_MEMORY_SYNC_INTERVAL_MS = 15000;
var MIN_MEMORY_SYNC_INTERVAL_MS = 5000;
//@ chunk-vn3g7zt8.js:71469-71643 esm-fingerprint
function checkMemorySyncInterval(ms, option) {
  if (!(ms >= MIN_MEMORY_SYNC_INTERVAL_MS))
    throw new AnthropicError(
      `${option} must be at least ${MIN_MEMORY_SYNC_INTERVAL_MS}ms (got ${ms}); to run without memory sync, pass \`memorySyncIntervalMs: null\` to the worker instead`,
    );
}
export { DEFAULT_MEMORY_SYNC_INTERVAL_MS, checkMemorySyncInterval };
