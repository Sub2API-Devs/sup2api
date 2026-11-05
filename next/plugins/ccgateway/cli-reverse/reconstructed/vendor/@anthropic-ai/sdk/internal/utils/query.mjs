/**
 * @anthropic-ai/sdk/internal/utils/query.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stringify } from "../qs/stringify.mjs";

//@ chunk-vn3g7zt8.js:25849-25902 esm-fingerprint
function stringifyQuery(query) {
  return stringify(query, {
    arrayFormat: "brackets",
  });
}
export { stringifyQuery };
