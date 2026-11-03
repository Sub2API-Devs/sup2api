/**
 * commands/clear/index.ts
 *
 * /clear（别名 reset、new）命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/clear/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /clear 命令对象（local）；描述：Start a new session with empty context; previous session stays on disk (resumable with /resume)；别名 ["reset","new"]；实现 chunk-4mtxrwhe.js 的 D。
 */
//@ chunk-e6aww6q8.js:1686839-1687135 fingerprint = clear (0.601)
var clearCommandDefinition = {
    type: "local",
    name: "clear",
    description:
      "Start a new session with empty context; previous session stays on disk (resumable with /resume)",
    argumentHint: "[name]",
    aliases: ["reset", "new"],
    supportsNonInteractive: !0,
    thinClientDispatch: "post-text",
    load: () => import("./chunk-4mtxrwhe.js"),
  },
  clearCommand = clearCommandDefinition;

export { clearCommand };
