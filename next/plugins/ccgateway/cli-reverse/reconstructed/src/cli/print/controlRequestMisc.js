/**
 * cli/print/controlRequestMisc.ts
 *
 * 2.1.316 新增：收件箱权限检查、沙箱网络询问与远程浏览器 MCP 调用拦截
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tyg7f3ek.js (6)
 * attribution: placement 6
 */
import { randomUUID } from "crypto";
import { isComputerUseTool } from "../../utils/permissions/browserToolNames.js";
import { HOSTED_DESKTOP_ONLY_MESSAGE } from "../../utils/computerUse/toolRendering.js";
import { refusesRemoteBrowserCallOutsideChecks } from "../../utils/permissions/remoteBrowser.js";
import { REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED } from "../../services/mcp/mcpStringUtils.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../../utils/errors.js";
import {
  InboxVerdictCache,
  lastRealUserUuid,
  conversationSnapshot,
} from "../../utils/inboxClassification.js";
import { settingsGrantsConfined } from "../../utils/permissions/permissionsLoader.js";
import { getModeBaseBehavior } from "../../utils/permissions/PermissionMode.js";
import {
  areCommandNetworkListsOffered,
  commandDomainDenyReason,
  sandboxHostDenyReason,
} from "../../tools/BashTool/sandboxNetwork.js";
import { classifySandboxNetworkHost } from "../../utils/permissions/sandboxNetworkClassifier.js";
import { isModelDrivenSession } from "../../utils/teammate.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../structuredIO.js";
import { buildNoApprovalSurfaceDenial } from "../../services/pushNotifications/permissionPush.js";

//@ chunk-tyg7f3ek.js:503378-503456 placement
var SESSION_NOT_FOUND_MESSAGE = "No conversation found with session ID:";
var FAILED_TO_RESUME_SESSION_TEXT = "Failed to resume session";
//@ chunk-tyg7f3ek.js:503456-503506 placement
function mcpCallRefusalFor(server) {
  return isComputerUseTool(server) ? HOSTED_DESKTOP_ONLY_MESSAGE : remoteBrowserRefusal(server.serverName);
}
//@ chunk-tyg7f3ek.js:503506-503546 placement
function remoteBrowserRefusal(tool) {
  return refusesRemoteBrowserCallOutsideChecks(tool) ? REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED : undefined;
}
//@ chunk-tyg7f3ek.js:503546-503686 placement
function guardRemoteBrowserMcpCall(callMCPTool, request) {
  let refusal = remoteBrowserRefusal(request.client.name);
  return refusal === undefined
    ? callMCPTool(request)
    : Promise.reject(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          refusal,
          "cloud browser mcp_call refused before an attempt",
        ),
      );
}
//@ chunk-tyg7f3ek.js:503723-504247 placement
/**
 * 为跨会话 inbox 消息创建权限判定器：按权限模式与缓存判定是否可自动处理。
 */
function createInboxPermissionChecker(
  askHandler,
  getAppState,
  getConversation,
  getToolContext,
  storageV5,
  credentials,
) {
  let verdictCache = new InboxVerdictCache();
  let lastState;
  let lastUserUuid;
  return async (request) => {
    if (settingsGrantsConfined()) return false;
    let appState = getAppState();
    if (lastState !== appState) {
      verdictCache.clear();
      lastState = appState;
    }
    switch (getModeBaseBehavior(appState.mode, appState.isBypassPermissionsModeAvailable)) {
      case "allow":
        return true;
      case "deny":
        return false;
      case "classify": {
        if (areCommandNetworkListsOffered()) return commandDomainDenyReason();
        let hostDenyReason = sandboxHostDenyReason();
        if (hostDenyReason !== undefined) return hostDenyReason;
        let conversation = getConversation();
        let userUuid = lastRealUserUuid(conversation);
        if (userUuid !== lastUserUuid) {
          verdictCache.clear();
          lastUserUuid = userUuid;
        }
        return verdictCache.getOrClassify(
          request.host,
          request.port,
          conversationSnapshot(conversation),
          () =>
            classifySandboxNetworkHost(
              request.host,
              request.port,
              conversation,
              getToolContext(),
              appState,
              new AbortController().signal,
              {
                isSubagentLoop: isModelDrivenSession(undefined),
                recordPresumed: true,
                storageV5,
                credentials,
              },
            ),
        );
      }
      case "ask":
        return askHandler(request);
    }
  };
}
//@ chunk-tyg7f3ek.js:504247-504394 placement
function createSandboxNetworkAsker(headlessIO) {
  return async (request) => {
    headlessIO.emitPermissionDenied(
      SANDBOX_NETWORK_ACCESS_TOOL_NAME,
      randomUUID(),
      undefined,
      buildNoApprovalSurfaceDenial({
        behavior: "ask",
        message: `Allow network connection to ${request.host}?`,
      }),
    );
    return false;
  };
}
export {
  createInboxPermissionChecker,
  createSandboxNetworkAsker,
  mcpCallRefusalFor,
  remoteBrowserRefusal,
  guardRemoteBrowserMcpCall,
  FAILED_TO_RESUME_SESSION_TEXT,
  SESSION_NOT_FOUND_MESSAGE,
};
