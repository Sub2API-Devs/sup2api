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
//@ chunk-e6aww6q8.js:1736007-1736196 fingerprint (2.1.88 match: status, 0.833)
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
var statusCommand = statusCommandDefinition;
export { statusCommand };
