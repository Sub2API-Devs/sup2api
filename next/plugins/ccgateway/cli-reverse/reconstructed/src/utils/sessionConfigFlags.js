/**
 * utils/sessionConfigFlags.ts
 *
 * 2.1.316 新增。命令行是否带会话级配置（自定义系统提示、工具白名单、受限设置），分叉时需拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kqfm73k5.js (4)
 * attribution: placement 4
 */
import { isSafeMode, isRestrictedMode } from "./envUtils.js";

//@ chunk-kqfm73k5.js:231-296 placement
function foldRestricted(options, restricted) {
  return restricted && !options.restricted
    ? {
        ...options,
        restricted: true,
      }
    : options;
}
//@ chunk-kqfm73k5.js:296-1164 placement
/**
 * 命令行是否带会话级配置（自定义系统提示、工具白名单、受限设置），分叉时需拒绝。
 */
function cliCarriesSessionConfig(options) {
  return (
    isSafeMode() ||
    isRestrictedMode() ||
    [
      options.permissionMode,
      options.inheritPermissionMode,
      options.model,
      options.fallbackModel,
      options.clientDataUrl,
      options.allowOtherModels,
      options.effort,
      options.agent,
      options.agents,
      options.settings,
      options.projectConfigRoot,
      options.appendSystemPrompt,
      options.appendSystemPromptFile,
      options.systemPrompt,
      options.systemPromptFile,
      options.systemPromptSnapshot,
      options.replyOnResume,
      options.permissionPromptTool,
      options.settingSources,
      options.managedSettings,
    ].some((value) => value !== undefined) ||
    Boolean(options.disableSlashCommands) ||
    Boolean(options.includeUnsupportedModels) ||
    options.sessionPersistence === false ||
    Boolean(options.dangerouslySkipPermissions) ||
    Boolean(options.allowDangerouslySkipPermissions) ||
    Boolean(options.allowBypass) ||
    Boolean(options.restricted) ||
    Boolean(options.ide) ||
    Boolean(options.strictMcpConfig) ||
    (options.allowedTools ?? []).length > 0 ||
    (options.disallowedTools ?? []).length > 0 ||
    (options.tools ?? []).length > 0 ||
    (options.mcpConfig ?? []).length > 0 ||
    (options.addDir ?? []).length > 0 ||
    (options.pluginDir ?? []).length > 0 ||
    (options.pluginDirNoMcp ?? []).length > 0
  );
}
//@ chunk-kqfm73k5.js:1164-1387 placement
function cliCarriesForkRestrictedConfig(options) {
  return (
    [
      options.systemPrompt,
      options.systemPromptFile,
      options.appendSystemPromptFile,
      options.permissionPromptTool,
      options.settingSources,
      options.managedSettings,
      options.projectConfigRoot,
    ].some((value) => value !== undefined) || (options.tools ?? []).some((toolName) => toolName !== "default")
  );
}
//@ chunk-kqfm73k5.js:1387-1462 placement
var FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION =
  "a custom system prompt, a tool allowlist, or restricted settings";
export {
  foldRestricted,
  cliCarriesSessionConfig,
  cliCarriesForkRestrictedConfig,
  FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION,
};
