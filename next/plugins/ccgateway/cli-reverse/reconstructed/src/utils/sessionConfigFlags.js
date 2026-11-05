/**
 * utils/sessionConfigFlags.ts
 *
 * 2.1.316 新增。命令行是否带会话级配置（自定义系统提示、工具白名单、受限设置），分叉时需拒绝。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-tww5chgf.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isSafeMode, isRestrictedMode } from "./envUtils.js";
import { POWERSHELL_TOOL_NAME } from "../tools/PowerShellTool/toolName.js";

//@ chunk-tww5chgf.js:267-332 placement
function foldRestricted(options, restricted) {
  return restricted && !options.restricted
    ? {
        ...options,
        restricted: true,
      }
    : options;
}
//@ chunk-tww5chgf.js:332-1200 placement
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
//@ chunk-tww5chgf.js:1200-1480 placement (2.1.88 match: _pendingSSH, 0.356)
/**
 * 剥掉 CLI 不再携带的会话配置字段（权限模式、模型、effort、工具白名单等）。
 */
function cliCarriesConfigBeyondSessionState(config) {
  return cliCarriesSessionConfig({
    ...config,
    permissionMode: undefined,
    inheritPermissionMode: undefined,
    dangerouslySkipPermissions: undefined,
    allowDangerouslySkipPermissions: undefined,
    allowBypass: undefined,
    model: undefined,
    effort: undefined,
    allowedTools: undefined,
    disallowedTools: config.disallowedTools?.filter(
      (disallowedTool) => disallowedTool !== POWERSHELL_TOOL_NAME,
    ),
  });
}
//@ chunk-tww5chgf.js:1480-1703 placement
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
//@ chunk-tww5chgf.js:1703-1778 placement
var FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION =
  "a custom system prompt, a tool allowlist, or restricted settings";
export {
  foldRestricted,
  cliCarriesSessionConfig,
  FORK_RESTRICTED_LAUNCH_FLAGS_DESCRIPTION,
  cliCarriesConfigBeyondSessionState,
  cliCarriesForkRestrictedConfig,
};
