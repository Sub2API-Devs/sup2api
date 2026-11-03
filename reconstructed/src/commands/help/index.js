/**
 * commands/help/index.ts
 *
 * /help 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/help/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /help 命令对象（local-jsx）；描述：Show help and available commands；实现 chunk-yxcx2jtr.js 的 as。
 */
//@ chunk-e6aww6q8.js:1696260-1696406 fingerprint = help (0.7)
var helpCommandDefinition = {
    type: "local-jsx",
    name: "help",
    description: "Show help and available commands",
    immediate: (args, presentation) => presentation === "fullscreen",
    requires: { ink: !0 },
  },
  helpCommand = helpCommandDefinition;

export { helpCommand };
