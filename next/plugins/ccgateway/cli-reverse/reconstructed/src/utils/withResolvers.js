/**
 * utils/withResolvers.ts
 *
 * Promise.withResolvers 兼容实现
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/withResolvers.ts
 * pieces: chunk-n51jggtb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-n51jggtb.js:209800-209871 fingerprint (2.1.88 match: withResolvers, 1)
function withResolvers() {
  let reject;
  return {
    promise: new Promise((res, rej) => {
      reject = rej;
    }),
    reject,
  };
}
export { withResolvers };
