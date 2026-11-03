/**
 * commands/branch/index.ts
 *
 * /branch 命令对象（require chunk-khj4kcw5）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/branch/index.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * /branch 命令对象（local-jsx）；描述：Create a branch of the current conversation at this point；实现 chunk-khj4kcw5.js 的 _e。
 */
//@ chunk-e6aww6q8.js:2028446-2028628 fingerprint = branch (0.801)
var branchCommandDefinition = {
    type: "local-jsx",
    name: "branch",
    description: "Create a branch of the current conversation at this point",
    argumentHint: "[name]",
    load: () => import("./chunk-khj4kcw5.js"),
  },
  branchCommand = branchCommandDefinition;

export { branchCommand };
