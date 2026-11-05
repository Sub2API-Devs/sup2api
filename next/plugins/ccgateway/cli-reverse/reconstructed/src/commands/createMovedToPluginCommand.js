/**
 * commands/createMovedToPluginCommand.ts
 *
 * createMovedToPluginCommand：生成"已迁到插件"的提示词命令（/security-review 使用）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/createMovedToPluginCommand.ts
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-5xgkngpb.js:1827138-1827452 fingerprint (2.1.88 match: createMovedToPluginCommand, 0.828)
/**
 * createMovedToPluginCommand：同旧版。
 */
function createMovedToPluginCommand({
  name,
  description,
  progressMessage,
  pluginName,
  pluginCommand,
  getPromptWhileMarketplaceIsPrivate,
}) {
  return {
    type: "prompt",
    name,
    description,
    progressMessage,
    contentLength: 0,
    userFacingName() {
      return name;
    },
    source: "builtin",
    disableModelInvocation: false,
    async getPromptForCommand(args, context) {
      return getPromptWhileMarketplaceIsPrivate(args, context);
    },
  };
}
export { createMovedToPluginCommand };
