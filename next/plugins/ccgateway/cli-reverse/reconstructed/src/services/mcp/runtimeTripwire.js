/**
 * services/mcp/runtimeTripwire.ts
 *
 * 2.1.316 新增：MCP 运行时绊线检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9hx1mne2.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { claimOnce } from "../api/verificationRequired.js";
import { registerPreFlushTask } from "../analytics/flushSinks.js";
import { logEventAsync } from "../analytics/index.js";
import { fromEnum, lit } from "../analytics/safeMetadata.js";
import { mcpSdkGeneration } from "./mcpSdkGeneration.js";

//@ chunk-9hx1mne2.js:3705-3869 placement
/**
 * 上报 MCP 运行时模块不一致的绊线事件（只报一次）。
 */
function emitTripwireEvent(expected, loaded) {
  if (!claimOnce().claim("mcp_tree_id_tripwire")) return;
  registerPreFlushTask(
    logEventAsync("tengu_mcp_tripwire", {
      expected: fromEnum(expected),
      loaded: loaded === "v1" || loaded === "v2" ? fromEnum(loaded) : lit("other"),
    }).catch(() => {}),
  );
}
//@ chunk-9hx1mne2.js:3869-4328 placement
/**
 * 按选定的 MCP SDK 代加载客户端模块，并校验模块的 MCP_TREE_ID 一致，否则上报并抛错。
 */
function mcpClientModule() {
  if (mcpSdkGeneration() === "v2") {
    let v2Module = require("./ClaudeAiProxyBearerRejectedError.lazy.js");
    let MCP_TREE_ID = v2Module.MCP_TREE_ID;
    if (MCP_TREE_ID !== "v2") {
      emitTripwireEvent("v2", MCP_TREE_ID);
      throw Error(
        "MCP runtime accessor tripwire: resolved generation is v2 but the loaded client module does not carry MCP_TREE_ID v2",
      );
    }
    return v2Module;
  }
  let v1Module = require("./ClaudeAiProxyBearerRejectedError_2.lazy.js");
  let MCP_TREE_ID = v1Module.MCP_TREE_ID;
  if (MCP_TREE_ID !== "v1") {
    emitTripwireEvent("v1", MCP_TREE_ID);
    throw Error(
      "MCP runtime accessor tripwire: resolved generation is v1 but the loaded client module does not carry MCP_TREE_ID v1",
    );
  }
  return v1Module;
}
//@ chunk-9hx1mne2.js:4328-4372 placement
/**
 * 触发加载 v2 客户端模块（副作用加载）。
 */
function loadV2ClientModule() {
  require("./ClaudeAiProxyBearerRejectedError.lazy.js");
}
//@ chunk-9hx1mne2.js:4372-4470 placement
/**
 * 按 SDK 代返回 SEP-2663 任务绑定实现。
 */
function loadSep2663TaskBinding() {
  if (mcpSdkGeneration() === "v2")
    return require("./ClaudeAiProxyBearerRejectedError.lazy.js").createSep2663TaskBinding;
  return;
}
//@ chunk-9hx1mne2.js:4470-4574 placement
/**
 * 按 MCP SDK 代加载 auth 模块。
 */
function mcpAuthModule() {
  if (mcpSdkGeneration() === "v2") return require("./auth.lazy.js");
  return require("./auth.js");
}
//@ chunk-9hx1mne2.js:4574-4678 placement
/**
 * 按 MCP SDK 代加载 elicitation 处理模块。
 */
function mcpElicitationHandlerModule() {
  if (mcpSdkGeneration() === "v2") return require("./elicitationHandler.js");
  return require("./elicitationHandler.lazy.js");
}
//@ chunk-9hx1mne2.js:4678-4782 placement
/**
 * 按 MCP SDK 代加载任务监视/持久化模块。
 */
function mcpTaskWatcherModule() {
  if (mcpSdkGeneration() === "v2") return require("./mcpTaskPersistence.js");
  return require("../../tasks/McpTask/mcpTaskNotifications.js");
}
//@ chunk-9hx1mne2.js:4782-4886 placement
/**
 * 按 MCP SDK 代加载 SDK 错误分类模块。
 */
function mcpSdkErrorClassificationModule() {
  if (mcpSdkGeneration() === "v2") return require("./getMcpErrorCode.lazy.js");
  return require("./getMcpErrorCode_2.lazy.js");
}
//@ chunk-9hx1mne2.js:4886-4990 placement
/**
 * 按 MCP SDK 代加载目录读取模块。
 */
function mcpDirectoryReadModule() {
  if (mcpSdkGeneration() === "v2") return require("./readMcpDirectory.lazy.js");
  return require("./readMcpDirectory_2.lazy.js");
}
//@ chunk-9hx1mne2.js:4990-5094 placement
/**
 * 按 MCP SDK 代加载列表认证错误判断模块。
 */
function mcpIsListAuthErrorModule() {
  if (mcpSdkGeneration() === "v2") return require("./isClaudeAiBearerRejectedError.lazy.js");
  return require("./listAuthError.js");
}
//@ chunk-9hx1mne2.js:5094-5198 placement
/**
 * 按 MCP SDK 代加载 XAA IdP 登录模块。
 */
function mcpXaaIdpLoginModule() {
  if (mcpSdkGeneration() === "v2") return require("./xaaIdpLogin.lazy.js");
  return require("./xaaIdpLogin.js");
}
//@ chunk-9hx1mne2.js:5198-5249 placement
/**
 * 加载 MCP 技能模块。
 */
function loadSkillsModule() {
  return require("./mcpSkills.js");
}
export {
  emitTripwireEvent,
  loadV2ClientModule,
  mcpAuthModule,
  mcpClientModule,
  mcpDirectoryReadModule,
  mcpElicitationHandlerModule,
  mcpIsListAuthErrorModule,
  mcpSdkErrorClassificationModule,
  loadSep2663TaskBinding,
  loadSkillsModule,
  mcpTaskWatcherModule,
  mcpXaaIdpLoginModule,
};
