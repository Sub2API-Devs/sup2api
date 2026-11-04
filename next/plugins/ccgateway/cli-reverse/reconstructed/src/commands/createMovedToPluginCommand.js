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

//@ chunk-e6aww6q8.js:1750424-1750738 fingerprint (2.1.88 match: createMovedToPluginCommand, 0.828)
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
