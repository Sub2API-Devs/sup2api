/**
 * commands/createMovedToPluginCommand.ts
 *
 * createMovedToPluginCommand：生成"已迁到插件"的提示词命令（/security-review 使用）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/createMovedToPluginCommand.ts
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: fingerprint 1
 */

/**
 * createMovedToPluginCommand：同旧版。
 */
//@ chunk-e6aww6q8.js:1750424-1750738 fingerprint = createMovedToPluginCommand (0.828)
function createMovedToPluginCommand({
  name: e,
  description: description,
  progressMessage: progressMessage,
  pluginName: pluginName,
  pluginCommand: pluginCommand,
  getPromptWhileMarketplaceIsPrivate: getPromptWhileMarketplaceIsPrivate,
}) {
  return {
    type: "prompt",
    name: e,
    description: description,
    progressMessage: progressMessage,
    contentLength: 0,
    userFacingName() {
      return e;
    },
    source: "builtin",
    disableModelInvocation: !1,
    async getPromptForCommand(args, context) {
      return getPromptWhileMarketplaceIsPrivate(args, context);
    },
  };
}

export { createMovedToPluginCommand };
