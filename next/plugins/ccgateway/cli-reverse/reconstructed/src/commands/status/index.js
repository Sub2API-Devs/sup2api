/**
 * commands/status/index.ts
 *
 * /status 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/status/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:1811458-1811647 fingerprint (2.1.88 match: status, 0.833)
/**
 * /status 命令对象（local-jsx）；描述：Show Claude Code status including version, model, account, API connectivity, and tool statuses；实现 chunk-gwbvvmmk.js 的 o。
 */
var statusCommandDefinition = {
  type: "local-jsx",
  name: "status",
  description:
    "Show Claude Code status including version, model, account, API connectivity, and tool statuses",
  immediate: true,
  requires: {
    ink: true,
  },
};
var statusCommandAlias = statusCommandDefinition;
export { statusCommandAlias };
