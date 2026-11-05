/**
 * services/api/emptyUsage.ts
 *
 * 全零的 usage 对象常量（service_tier standard、缓存细分为 0）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/emptyUsage.ts
 * pieces: chunk-0a7cfwp8.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-0a7cfwp8.js:263-628 fingerprint (2.1.88 match: EMPTY_USAGE, 0.906)
/**
 * 空 usage：所有 token 计数为 0，server_tool_use 为 0，service_tier=standard，speed/fallback_credit 为 null 一类默认值。
 */
var EMPTY_USAGE = {
  output_tokens_details: {
    thinking_tokens: 0,
  },
  input_tokens: 0,
  cache_creation_input_tokens: 0,
  cache_read_input_tokens: 0,
  output_tokens: 0,
  server_tool_use: {
    web_search_requests: 0,
    web_fetch_requests: 0,
  },
  service_tier: "standard",
  cache_creation: {
    ephemeral_1h_input_tokens: 0,
    ephemeral_5m_input_tokens: 0,
  },
  inference_geo: "",
  iterations: [],
  speed: "standard",
  fallback_credit: null,
};
export { EMPTY_USAGE };
