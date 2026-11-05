/**
 * commands/clear/index.ts
 *
 * /clear（别名 reset、new）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/clear/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:1762048-1762344 fingerprint (2.1.88 match: clear, 0.601)
/**
 * /clear 命令对象（local）；描述：Start a new session with empty context; previous session stays on disk (resumable with /resume)；别名 ["reset","new"]；实现 chunk-4mtxrwhe.js 的 D。
 */
var clearCommandDefinition = {
  type: "local",
  name: "clear",
  description:
    "Start a new session with empty context; previous session stays on disk (resumable with /resume)",
  argumentHint: "[name]",
  aliases: ["reset", "new"],
  supportsNonInteractive: true,
  thinClientDispatch: "post-text",
  load: () => import("./call.lazy.js"),
};
var clearCommandAlias = clearCommandDefinition;
export { clearCommandAlias };
