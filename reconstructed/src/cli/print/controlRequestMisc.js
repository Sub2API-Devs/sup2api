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
function mcpCallRefusalFor(e) {
  return isComputerUseTool(e) ? HOSTED_DESKTOP_ONLY_MESSAGE : remoteBrowserRefusal(e.serverName);
}
//@ chunk-tyg7f3ek.js:503506-503546 placement
function remoteBrowserRefusal(tool) {
  return refusesRemoteBrowserCallOutsideChecks(tool) ? REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED : undefined;
}
//@ chunk-tyg7f3ek.js:503546-503686 placement
function guardRemoteBrowserMcpCall(callMCPTool, n) {
  let r = remoteBrowserRefusal(n.client.name);
  return r === undefined
    ? callMCPTool(n)
    : Promise.reject(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          r,
          "cloud browser mcp_call refused before an attempt",
        ),
      );
}
//@ chunk-tyg7f3ek.js:503723-504247 placement
/**
 * 为跨会话 inbox 消息创建权限判定器：按权限模式与缓存判定是否可自动处理。
 */
function createInboxPermissionChecker(e, n, r, s, storageV5, credentials) {
  let S = new InboxVerdictCache();
  let R;
  let w;
  return async (P) => {
    if (settingsGrantsConfined()) return false;
    let L = n();
    if (R !== L) {
      S.clear();
      R = L;
    }
    switch (getModeBaseBehavior(L.mode, L.isBypassPermissionsModeAvailable)) {
      case "allow":
        return true;
      case "deny":
        return false;
      case "classify": {
        if (areCommandNetworkListsOffered()) return commandDomainDenyReason();
        let x = sandboxHostDenyReason();
        if (x !== undefined) return x;
        let G = r();
        let Z = lastRealUserUuid(G);
        if (Z !== w) {
          S.clear();
          w = Z;
        }
        return S.getOrClassify(P.host, P.port, conversationSnapshot(G), () =>
          classifySandboxNetworkHost(P.host, P.port, G, s(), L, new AbortController().signal, {
            isSubagentLoop: isModelDrivenSession(undefined),
            recordPresumed: true,
            storageV5,
            credentials,
          }),
        );
      }
      case "ask":
        return e(P);
    }
  };
}
//@ chunk-tyg7f3ek.js:504247-504394 placement
function createSandboxNetworkAsker(headlessIO) {
  return async (n) => {
    headlessIO.emitPermissionDenied(
      SANDBOX_NETWORK_ACCESS_TOOL_NAME,
      randomUUID(),
      undefined,
      buildNoApprovalSurfaceDenial({
        behavior: "ask",
        message: `Allow network connection to ${n.host}?`,
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
