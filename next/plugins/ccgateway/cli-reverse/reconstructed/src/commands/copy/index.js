/**
 * commands/copy/index.ts
 *
 * /copy 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/copy/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:1762902-1763054 fingerprint (2.1.88 match: copy, 0.818)
/**
 * /copy 命令对象（local-jsx）；描述：Copy Claude's last response to clipboard (or /copy N for the Nth-latest)；实现 chunk-0knprqgt.js 的 xn。
 */
var copyCommandDefinition = {
  type: "local-jsx",
  name: "copy",
  description: "Copy Claude's last response to clipboard (or /copy N for the Nth-latest)",
  requires: {
    ink: true,
  },
};
var copyCommand = copyCommandDefinition;
export { copyCommand };
