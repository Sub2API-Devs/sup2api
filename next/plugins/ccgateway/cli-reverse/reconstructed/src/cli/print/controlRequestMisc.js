/**
 * cli/print/controlRequestMisc.ts
 *
 * 2.1.316 新增：收件箱权限检查、沙箱网络询问与远程浏览器 MCP 调用拦截
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0yw3taqg.js (7)
 * attribution: placement 6, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import {
  clearStatesWhenTrellisOff,
  isRemoteNonInteractiveNonCcsSession,
  isAmberTrellisOff,
} from "../../utils/widgetContext.js";
import { logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { parseWidgetStates, setWidgetStates } from "../../tools/ReadWidgetContextTool/widgetState.js";
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
  isNetworkSandboxRestricted,
  makeSandboxNetworkDecider,
  denyUnapprovedHost,
} from "../../tools/BashTool/sandboxNetwork.js";
import { classifySandboxNetworkHost } from "../../utils/permissions/sandboxNetworkClassifier.js";
import { isModelDrivenSession } from "../../utils/teammate.js";
import { SANDBOX_NETWORK_ACCESS_TOOL_NAME } from "../structuredIO.js";
import { buildNoApprovalSurfaceDenial } from "../../services/pushNotifications/permissionPush.js";

//@ chunk-0yw3taqg.js:535005-535083 placement
var SESSION_NOT_FOUND_MESSAGE = "No conversation found with session ID:";
var FAILED_TO_RESUME_SESSION_TEXT = "Failed to resume session";
//@ chunk-0yw3taqg.js:535083-535876 layout
function applyWidgetToolStates(sessionRoot, toolStates, flags) {
  if (flags.namesViews) clearStatesWhenTrellisOff(sessionRoot);
  if (!("tool_states" in toolStates)) return;
  if (!flags.holdsStates) {
    if (!flags.namesViews && isRemoteNonInteractiveNonCcsSession() && !isAmberTrellisOff())
      logFeatureSad("widget_context_tool_states", "sender_refused");
    logForDebugging(
      "[widget] tool_states ignored: not a headless cloud worker, tengu_amber_trellis is known to be off, or the message is not from the person using the session",
    );
    return;
  }
  let extracted = parseWidgetStates(toolStates);
  if (extracted === undefined) {
    logForDebugging("[widget] tool_states ignored: it is not a list");
    logFeatureSad("widget_context_tool_states", "not_a_list");
    return;
  }
  if (extracted.overBounds) {
    logForDebugging("[widget] tool_states over 256 states or 1 MiB: held views cleared");
    logFeatureSad("widget_context_tool_states", "over_bounds");
  } else if (extracted.dropped > 0) {
    logForDebugging(`[widget] tool_states: ${extracted.dropped} malformed states left out`);
    logFeatureSad("widget_context_tool_states", "states_dropped");
  } else logFeatureOk("widget_context_tool_states");
  setWidgetStates(sessionRoot, extracted.states);
}
//@ chunk-0yw3taqg.js:535876-535926 placement
function mcpCallRefusalFor(server) {
  return isComputerUseTool(server) ? HOSTED_DESKTOP_ONLY_MESSAGE : remoteBrowserRefusal(server.serverName);
}
//@ chunk-0yw3taqg.js:535926-535966 placement
function remoteBrowserRefusal(tool) {
  return refusesRemoteBrowserCallOutsideChecks(tool) ? REMOTE_BROWSER_OUTSIDE_CHECKS_REFUSED : undefined;
}
//@ chunk-0yw3taqg.js:535966-536106 placement
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
//@ chunk-0yw3taqg.js:536143-536776 placement
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
        if (isNetworkSandboxRestricted(appState.mode))
          return (
            (await verdictCache.getOrClassify(
              request.host,
              request.port,
              conversationSnapshot(conversation),
              async () => makeSandboxNetworkDecider((await askHandler(request)) === true, false),
            )) || denyUnapprovedHost()
          );
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
//@ chunk-0yw3taqg.js:536776-536924 placement
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
  applyWidgetToolStates,
  FAILED_TO_RESUME_SESSION_TEXT,
  SESSION_NOT_FOUND_MESSAGE,
};
