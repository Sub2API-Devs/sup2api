/**
 * commands/status/index.ts
 *
 * /status 命令对象
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/status/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /status 命令对象（local-jsx）；描述：Show Claude Code status including version, model, account, API connectivity, and tool statuses；实现 chunk-gwbvvmmk.js 的 o。
 */
//@ chunk-e6aww6q8.js:1736007-1736196 fingerprint = status (0.833)
var statusCommandDefinition = {
    type: "local-jsx",
    name: "status",
    description:
      "Show Claude Code status including version, model, account, API connectivity, and tool statuses",
    immediate: !0,
    requires: { ink: !0 },
  },
  statusCommand = statusCommandDefinition;

export { statusCommand };
