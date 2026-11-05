/**
 * commands/export/index.ts
 *
 * /export 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/export/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:2096327-2096489 fingerprint (2.1.88 match: exportCommand, 0.877)
/**
 * /export 命令对象（local-jsx）；描述：Export the current conversation to a file or clipboard；实现 chunk-am3vy82s.js 的 ho。
 */
var exportCommandDefinition = {
  type: "local-jsx",
  name: "export",
  description: "Export the current conversation to a file or clipboard",
  argumentHint: "[filename]",
  requires: {
    ink: true,
  },
};
var exportCommand = exportCommandDefinition;
export { exportCommand };
