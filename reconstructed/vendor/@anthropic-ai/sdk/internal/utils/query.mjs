/**
 * @anthropic-ai/sdk/internal/utils/query.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { stringify } from "../qs/stringify.mjs";

//@ chunk-hwmsct5x.js:25478-25531 esm-fingerprint
function stringifyQuery(query) {
  return stringify(query, {
    arrayFormat: "brackets",
  });
}
export { stringifyQuery };
