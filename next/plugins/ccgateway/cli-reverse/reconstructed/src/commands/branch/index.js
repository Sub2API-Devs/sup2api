/**
 * commands/branch/index.ts
 *
 * /branch 命令对象（require chunk-khj4kcw5）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/branch/index.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
//@ chunk-5xgkngpb.js:2084263-2084445 fingerprint (2.1.88 match: branch, 0.801)
/**
 * /branch 命令对象（local-jsx）；描述：Create a branch of the current conversation at this point；实现 chunk-khj4kcw5.js 的 _e。
 */
var branchCommandDefinition = {
  type: "local-jsx",
  name: "branch",
  description: "Create a branch of the current conversation at this point",
  argumentHint: "[name]",
  load: () => import("./branch.js"),
};
var branchCommand = branchCommandDefinition;
export { branchCommand };
