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
function foldRestricted(n, e) {
  return e && !n.restricted ? { ...n, restricted: !0 } : n;
}
/**
 * 命令行是否带会话级配置（自定义系统提示、工具白名单、受限设置），分叉时需拒绝。
 */
//@ chunk-kqfm73k5.js:296-1164 placement
function cliCarriesSessionConfig(n) {
  return (
    isSafeMode() ||
    isRestrictedMode() ||
    [
      n.permissionMode,
      n.inheritPermissionMode,
      n.model,
      n.fallbackModel,
      n.clientDataUrl,
      n.allowOtherModels,
      n.effort,
      n.agent,
      n.agents,
      n.settings,
      n.projectConfigRoot,
      n.appendSystemPrompt,
      n.appendSystemPromptFile,
      n.systemPrompt,
      n.systemPromptFile,
      n.systemPromptSnapshot,
      n.replyOnResume,
      n.permissionPromptTool,
      n.settingSources,
      n.managedSettings,
    ].some((e) => e !== void 0) ||
    Boolean(n.disableSlashCommands) ||
    Boolean(n.includeUnsupportedModels) ||
    n.sessionPersistence === !1 ||
    Boolean(n.dangerouslySkipPermissions) ||
    Boolean(n.allowDangerouslySkipPermissions) ||
    Boolean(n.allowBypass) ||
    Boolean(n.restricted) ||
    Boolean(n.ide) ||
    Boolean(n.strictMcpConfig) ||
    (n.allowedTools ?? []).length > 0 ||
    (n.disallowedTools ?? []).length > 0 ||
    (n.tools ?? []).length > 0 ||
    (n.mcpConfig ?? []).length > 0 ||
    (n.addDir ?? []).length > 0 ||
    (n.pluginDir ?? []).length > 0 ||
    (n.pluginDirNoMcp ?? []).length > 0
  );
}
//@ chunk-kqfm73k5.js:1164-1387 placement
function cliCarriesForkRestrictedConfig(n) {
  return (
    [
      n.systemPrompt,
      n.systemPromptFile,
      n.appendSystemPromptFile,
      n.permissionPromptTool,
      n.settingSources,
      n.managedSettings,
      n.projectConfigRoot,
    ].some((e) => e !== void 0) || (n.tools ?? []).some((e) => e !== "default")
  );
}
//@ chunk-kqfm73k5.js:1387-1462 placement
var FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION =
  "a custom system prompt, a tool allowlist, or restricted settings";

export {
  cliCarriesSessionConfig,
  foldRestricted,
  cliCarriesForkRestrictedConfig,
  FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION,
};
