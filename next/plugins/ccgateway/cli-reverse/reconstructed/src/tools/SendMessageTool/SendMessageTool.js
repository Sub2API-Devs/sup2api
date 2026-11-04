/**
 * tools/SendMessageTool/SendMessageTool.ts
 *
 * SendMessage 工具：给子代理、队友、主会话、本机/云端其他会话发消息，结构化团队协议（关机、计划审批）与 notify_when_idle 订阅
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SendMessageTool/SendMessageTool.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-astf3mhy.js (80), chunk-e6aww6q8.js (15)
 * attribution: callgraph-fingerprint 1, placement 24, sole-consumer 16, affinity 1, fingerprint 9, layout 44, callgraph-witnessed 1
 */
import { randomUUID } from "crypto";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";
import {
  SENDMESSAGE,
  CCD_SESSION_MGMT,
  SUMMARY_MAX_CHARS,
  OBSERVABLE_INPUT_FIELDS,
  hasSendMessageShape,
} from "./constants.js";
import { AGENT } from "../AgentTool/constants.js";
import { parseAddress, isValidPipeOrPath, parsePeerAddress } from "../../utils/peerAddress.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { LOCAL_TASK_ID_PATTERN } from "../../services/analytics/metadata.js";
import { normalizeNameForMCP } from "../../services/mcp/normalization.js";
import { findToolByName, toolMatchesName } from "../../Tool.js";
import { getPromptIndex, isDiskless, mainAgentId, isCcsTenant } from "../../bootstrap/state.js";
import {
  DEFAULT_PEER_GUARD_LIMITS_2,
  classifyPeerSendError,
  isMessageTooLargeError,
  isSenderPacedError,
  UdsSendRefusedError,
  staleSocketHint,
  inboxFailureHint,
  isUnusableInboxError,
} from "../../utils/udsMessaging/peerGuard.js";
import { runToolUse, hasTypeField } from "../../services/tools/toolExecution.js";
import { getServerUrl } from "../../services/artifacts/durableWatch.js";
import { isClaudeCodeRemoteServer } from "../../services/mcp/agentRequestMeta.js";
import { hasIsolatePeerMachines } from "../../utils/settings/settings.js";
import { buildMcpToolName } from "../../services/mcp/mcpStringUtils.js";
import { CLAUDE_CODE_REMOTE, SEND_MESSAGE as SEND_MESSAGE_2 } from "../../services/mcp/ccrMetaMcp.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import {
  readAgentMetadata,
  getAgentTranscript,
  getCurrentSessionPeerNameFor,
  getCurrentSessionPeerName,
  getCurrentSessionOffBoxPeerName,
} from "../../utils/sessionStorage.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isAbortError,
  errorMessage,
  AbortError,
  getErrnoCode,
} from "../../utils/errors.js";
import { TEAMMATES_UNAVAILABLE_MESSAGE, TEAM_LEAD } from "../../utils/swarm/constants.js";
import {
  getTeamName,
  isTeammate,
  getAgentName,
  getTeammateColor,
  getDynamicTeamContext,
  getAgentId,
  isTeamLead,
  isInProcessTeammate,
} from "../../utils/teammate.js";
import { AGENT_METADATA_ID_RE, sanitizeMetadataText } from "../../utils/agentMetadata.js";
import {
  isReservedSessionName,
  MAX_ADDRESS_REF_LENGTH,
  addressableTeamMembers,
  teamLeadAddress,
  findSessionByName,
  isAddressableSlug,
  slugifySessionName,
  parseNameWithRef,
  formatNameWithRef,
  agentAddressLabel,
  describeSessionLocation,
} from "../../utils/sessionAddresses.js";
import { degradeRestoredMessages } from "../../utils/conversationRecovery.js";
import {
  filterThinkingOnlyUntilStable,
  normalizeMessagesForResume,
  regroupSplitResponsesOnResume,
} from "../../utils/messages.js";
import {
  dropApiInvalidAssistantBlocks,
  dropMalformedAttachments,
} from "../../utils/transcript/deserialize.js";
import { reconstructForSubagentResume } from "../../utils/toolResultStorage.js";
import { isBuiltInAgent, loadListedAgentDefinition } from "../AgentTool/loadAgentsDir.js";
import { getDispatchableAgents, hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import { getToolPermissionContext, getMainLoopModel } from "../../utils/permissions/toolPermissionContext.js";
import { logForDebugging } from "../../utils/debug.js";
import { replaceControlChars } from "../../utils/resultError.js";
import {
  isAgentDefinitionTrusted,
  agentBaseDirTrustKey,
  agentFolderTrustHint,
} from "../AgentTool/agentTrust.js";
import { ignoresPersistedTrust } from "../../utils/config.js";
import { runResumeStartHooks, pluginDeclinedResumeMessage } from "../AgentTool/agentLaunch.js";
import { teammateAgentIdentity } from "../../utils/swarm/teammateAgentIdentity.js";
import {
  markMessagesAsReadByPredicate,
  isStructuredProtocolMessage,
  writeToMailbox,
  createShutdownRequestMessage,
  createShutdownApprovedMessage,
  createShutdownRejectedMessage,
} from "../../utils/teammateMailbox.js";
import { resolveSpawnProvenanceMarks } from "../../plugins/functionHooks/agentHooks.js";
import { PERMISSION_MODES } from "../../types/permissions.js";
import { updateTeamFile, readTeamFileAsync } from "../../utils/swarm/teamHelpers.js";
import { getCwd } from "../../utils/cwd.js";
import { parseUserSpecifiedModel } from "../../utils/model/modelDisplay.js";
import {
  isCrossSessionMessagingEnabled,
  CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
} from "../../utils/crossSessionMessagingGate.js";
import { LISTAGENTS } from "./listAgents.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { runSessionSend, HOOK_DELIVERED_NOTE, describeDeliveryResult } from "./deliveryResults.js";
import {
  MAX_SEED_NAME_CHARS,
  timestampedAgentAddress,
  clipTeammateText,
} from "../../utils/swarm/teammateIds.js";
import { MAX_HEADER_VALUE_LENGTH, lastPeerHopChain } from "../../utils/peerMessageHeaders.js";
import {
  normalizeSendMessageInput,
  rememberRepair,
  splitRepairedMessage,
  wasRepaired,
  forgetRepair,
} from "../../utils/swarm/teammateMessageRepair.js";
import {
  union,
  stringSchema,
  discriminatedUnion,
  objectSchema,
  literal,
  booleanSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { booleanishSchema, coerceBooleanString } from "../../utils/spellcheck.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { reportSenderIdentity } from "../ObserverReportTool/ObserverReportTool.js";
import { getAgentDepth } from "../../utils/agentContext.js";
import { getMaxSubagentSpawnDepth } from "../AgentTool/spawnDepth.js";
import { wakeTeammateOnPlanApproval } from "../../utils/swarm/planApprovalWake.js";
import { truncate } from "../../utils/format.js";
import {
  resolveTeammateTask,
  findTeammateTaskByAgentId,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import {
  AgentStoppedByUserError,
  AgentStillStoppingError,
  ResumeAgentStateError,
  resumeAgentForReply,
  isResumeDenied,
  AgentResumeInProgressError,
  isResumedInlineRunError,
} from "../AgentTool/resumeAgent.js";
import { normalizeAgentIdOrNull, identityAgentId2 } from "../../utils/agentId.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { unreadableToolsLine, toolsUsedForSummary } from "../../utils/agentListing.js";
import {
  isHandbackProvenanceEnabled,
  hashTextSections,
  buildHandbackResultContent,
} from "../AgentTool/handbackReport.js";
import {
  RESUMED_NO_REPORT,
  RESUMED_REPORT_FOLLOWS,
  formatResumedAgentResult,
  resumedAgentReport,
} from "./resumedAgentResult.js";
import { isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { teammateModeAfterPlan } from "../ExitPlanModeTool/planPreconditions.js";
import {
  getRemoteSendBlock,
  resolveCrossSessionAddress,
  describeSubagentSender,
  NO_READ_RECEIPT_NOTE,
  NO_READ_RECEIPT_DISPLAY,
  unconfirmedDeliveryNote,
  inboxNoticeNote,
  renamedSessionNote,
  TRUNCATED_SEARCH_PARAGRAPH,
  renamedSessionNoteText,
  describeUnsearchedSessions,
  TRUNCATED_SEARCH_SHORT,
  claimedElsewhereMessage,
  LOCAL_SESSION_LABEL,
  pinSendTarget,
  describePinnedChoice,
  describeConfirmedChoice,
  describeLocalTargetCaveats,
  describeRemoteTargetCaveats,
  describeRemoteSessionKind,
} from "./crossSessionAddressing.js";
import { getPeerBridgeIdentity, primePeerIdentityOwner } from "../../bridge/replBridgeHandle.js";
import { env } from "../../utils/env.js";
import { ownRemoteSessionId } from "../../utils/remoteSessionEnv.js";
import { createQueueBusyCheck } from "../../utils/messageQueueIdle.js";
import { forwardUserIntentEnv, freshTurnsForAgent } from "../../utils/messageProvenance.js";
import { MAIN, agentMessageTag, normalizeAgentMessageBody } from "../../utils/sessionPeers.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { DESCRIPTION } from "./prompt.js";
import {
  unreachableElevatedRefusal,
  ELEVATED_UNREACHABLE_REASON,
  cannotReceiveRefusal,
  RECIPIENT_CANNOT_RECEIVE_REASON,
  sendDenialKind,
  isInboundUnreported,
} from "../../utils/peerSessions/cloudPeers.js";
import {
  hasMintedReentry,
  getDispatchNoteForInput,
  wasAskedForSameInput,
  isIsolatePeerAsk,
  isolationDispatchGate,
  getCheckedNoteForInput,
  rebasePermissionPhase,
} from "./isolationDispatchGate.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { stripAnsiAndControls } from "../../utils/printableName.js";
import {
  isOwnBridgeSession,
  selfTargetMessage,
  isTeammateOrSubagentContext,
  SELF_TARGET_REASON,
  mayBeOwnSocket,
  ownNameNotSentText,
  isOwnSocket,
  isImpersonatedOwnRef,
  impersonatedSelfMessage,
  impersonatedSelfShortMessage,
  classifySelfName,
  isSearchComplete,
  selfAliasNote,
} from "./selfTarget.js";
import { setPendingPermissionNote } from "../../utils/permissions/permissionRecord.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { isAgentStopPending } from "../../utils/agentProcessRegistry.js";
import { isModeEmitFlagOn } from "../../utils/crossSessionInbound/inboundMode.js";
import { modeClass_2 as modeClass } from "../../utils/crossSessionInbound/inboundGate.js";
import { isObserverTask } from "../../services/agentObserver/agentObserver.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isUnknownPluginSpawnedAgent } from "../AgentTool/pluginSpawnNote.js";
import { pluginInputHoldReason } from "../../plugins/functionHooks/inputHold.js";
import { runIgnoringAbort } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../plugins/functionHooks/apiCatalog.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { enqueueCommand } from "../../utils/messageQueueManager.js";
import { clearWaitingNotice, sendMessageToAgent } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { promptIdForRequest } from "../../services/api/claude.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { countGraphemes } from "../../ink/output.js";
import { splitGraphemes } from "../../utils/intl.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1498135-1498194 placement
/**
 * 宿主策略是否只允许把消息发给本会话的 agent。
 */
function isMessagingLimitedToOwnAgents() {
  return getHostAgentPolicy().messagingBeyondOwnAgentsDisabled;
}
//@ chunk-e6aww6q8.js:1498194-1498458 placement
var SUBAGENT_ONLY_SEND_MESSAGE; // deferred: uses SENDMESSAGE (./constants.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1498194", () => {
  SUBAGENT_ONLY_SEND_MESSAGE = `Not sent. In this session ${SENDMESSAGE} carries only plain text, and only to agents of this session: an agent launched in it with the ${AGENT} tool or, from a subagent, "main". Set \`to\` to such an agent's name, to the agentId from its spawn result, or to "main".`;
});
//@ chunk-e6aww6q8.js:1498458-1498660 placement
function agentSettingsMissingMessage(agentId) {
  return `Not sent. This session has no saved settings for agent ${agentId} that it can read: the agent never ran here, or its settings were lost. Start a new agent if the work is still needed.`;
}
//@ chunk-e6aww6q8.js:1498660-1498821 placement
function agentSettingsUnreadableMessage(agentId) {
  return `Not sent. The saved settings of agent ${agentId} could not be read just now. Send the message again; start a new agent only if that fails too.`;
}
//@ chunk-e6aww6q8.js:1498821-1499289 placement
/**
 * SendMessage 不可用的结果文本：子代理被关闭发送或已停止，以及本轮启动/恢复/写入次数已用尽；提示把内容放在最终回复中。
 */
var SEND_MESSAGE_SWITCHED_OFF; // deferred: uses SENDMESSAGE (./constants.js) of its import cycle while loading; runs once the cycle is complete
var SEND_BUDGET_EXHAUSTED;
deferInit("chunk-e6aww6q8.js:1498821", () => {
  SEND_MESSAGE_SWITCHED_OFF = `Not sent. You cannot use ${SENDMESSAGE} in this session: it is switched off for subagents, or you were stopped. Put what you need to pass on in your final response, which goes to whoever launched or resumed you.`;
  SEND_BUDGET_EXHAUSTED =
    "Not sent. This session's agents have launched, resumed and written as often as they may before the user next writes, or you can no longer send here. Put what you need to pass on in your final response, which goes to whoever launched or resumed you.";
});
//@ chunk-e6aww6q8.js:1499289-1499569 placement
function noRoomToResumeMessage(agentName) {
  return `Agent "${agentName}" was not resumed, and your message was not delivered: this session has no room for another agent now, or has started as many as it may between two messages from the user. Go on without it, or say in your final response what you needed from it.`;
}
//@ chunk-e6aww6q8.js:1499569-1499636 placement
/**
 * 只允许发给同会话 agent 时的拒绝原因。
 */
var SAME_SESSION_ONLY_REASON = "a message here goes only to an agent of the same session";
//@ chunk-e6aww6q8.js:1499636-1499789 placement
function checkHostSendTarget({ to, message }) {
  if (!isMessagingLimitedToOwnAgents()) return;
  return typeof message !== "string" ||
    parseAddress(to).scheme !== "other" ||
    (isTopHostSession() && LOCAL_TASK_ID_PATTERN.test(to)) ||
    to.includes("@") ||
    !isValidPipeOrPath(to)
    ? SUBAGENT_ONLY_SEND_MESSAGE
    : undefined;
}
//@ chunk-e6aww6q8.js:1499789-1499882 placement
/**
 * 判断该子代理是否允许发消息（策略关闭时一律允许）。
 */
function canSubagentSend(agentId) {
  if (!isMessagingLimitedToOwnAgents()) return true;
  try {
    return getHostAgentPolicy().subagentSends?.open(agentId) ?? false;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1499882-1499994 placement
function reserveResumeRoom(agentId) {
  if (!isMessagingLimitedToOwnAgents() || agentId === undefined) return () => {};
  try {
    return getHostAgentPolicy().subagentSends?.roomForResume(agentId);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:1499994-1500097 placement
function maySendOneMore(agentId) {
  if (!isMessagingLimitedToOwnAgents()) return true;
  try {
    return getHostAgentPolicy().subagentSends?.maySendOneMore(agentId) ?? false;
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:1500097-1500188 placement
/**
 * 判断该 agent 是否被人手动停止（异常时按已停止处理）。
 */
function isStoppedByPerson(agentId) {
  if (!isMessagingLimitedToOwnAgents()) return false;
  try {
    return getHostAgentPolicy().stoppedByPerson?.(agentId) ?? true;
  } catch {
    return true;
  }
}
//@ chunk-e6aww6q8.js:1500188-1500246 placement
/**
 * 执行回调并确保 finally 中清理。
 */
async function withCleanup(cleanup, body) {
  try {
    return await body();
  } finally {
    cleanup();
  }
}
//@ chunk-e6aww6q8.js:1500246-1500353 placement
var SUBAGENT_TARGET_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1500246", () => {
  SUBAGENT_TARGET_KINDS = new Set([
    "main",
    "agent-live",
    "agent-stopped",
    "agent-evicted",
    "agent-stopped-by-user",
    "not-found",
  ]);
});
//@ chunk-e6aww6q8.js:1500353-1500565 placement
function checkHostResolvedTarget(resolvedRecipient) {
  let isSubagentTarget =
    SUBAGENT_TARGET_KINDS.has(resolvedRecipient.kind) ||
    (resolvedRecipient.kind === "ambiguous" &&
      resolvedRecipient.candidates !== undefined &&
      resolvedRecipient.candidates.length > 0 &&
      resolvedRecipient.candidates.length === resolvedRecipient.total &&
      resolvedRecipient.candidates.every(({ kind }) => kind === "subagent"));
  return isMessagingLimitedToOwnAgents() && !isSubagentTarget ? SUBAGENT_ONLY_SEND_MESSAGE : undefined;
}
//@ chunk-astf3mhy.js:14508-14570 placement
/**
 * 会话管理 MCP 的 send_message 工具完整名。
 */
var SEND_MESSAGE; // deferred: uses normalizeNameForMCP (../../services/mcp/normalization.js) of its import cycle while loading; runs once the cycle is complete
var SESSION_SEND_MESSAGE_TOOL_NAME;
var MAX_FORWARDS_PER_PROMPT;
deferInit("chunk-astf3mhy.js:14508", () => {
  SEND_MESSAGE = "send_message";
  SESSION_SEND_MESSAGE_TOOL_NAME = `mcp__${normalizeNameForMCP(CCD_SESSION_MGMT)}__${normalizeNameForMCP(SEND_MESSAGE)}`;
  MAX_FORWARDS_PER_PROMPT = 1000;
});
//@ chunk-astf3mhy.js:14570-14783 placement
function findDesktopSendTool(toolContext) {
  let { tools, toolAliases } = toolContext;
  let filtered = tools.filter(
    (tool) =>
      tool.mcpInfo?.serverName === CCD_SESSION_MGMT &&
      tool.mcpInfo.toolName === SEND_MESSAGE &&
      tool.mcpInfo.serverType === "sdk",
  );
  let desktopSendTool = filtered.length === 1 ? filtered[0] : undefined;
  if (!desktopSendTool || findToolByName(tools, desktopSendTool.name, toolAliases) !== desktopSendTool)
    return;
  return desktopSendTool;
}
//@ chunk-astf3mhy.js:14783-14833 placement
/**
 * 记录已见过的提示序号与自转发次数（防止转发死循环）。
 */
class DesktopForwardState {
  promptIndexSeen = -1;
  forwardsSincePrompt = 0;
}
//@ chunk-astf3mhy.js:14833-15135 placement
/**
 * 解析 Claude Desktop 转发工具：不可用时返回 unavailable；同一提示内自转发次数超过上限时返回 loop-paused。
 */
function resolveDesktopForward(toolContext) {
  let desktopSendTool = findDesktopSendTool(toolContext);
  if (!desktopSendTool)
    return {
      kind: "unavailable",
    };
  let value = toolContext.toolState.get(DesktopForwardState);
  let promptIndex = getPromptIndex();
  if (promptIndex !== value.promptIndexSeen) {
    value.promptIndexSeen = promptIndex;
    value.forwardsSincePrompt = 0;
  }
  value.forwardsSincePrompt++;
  if (value.forwardsSincePrompt > DEFAULT_PEER_GUARD_LIMITS_2.maxSelfHops)
    return {
      kind: "loop-paused",
      forwards: value.forwardsSincePrompt - 1,
    };
  return {
    tool: desktopSendTool,
  };
}
//@ chunk-astf3mhy.js:15135-16537 placement
/**
 * 通过 Claude Desktop 的会话管理 SendMessage 工具转发消息：以合成的 tool_use 运行该工具（权限检查计时、钩子延迟处理），收集附件与结果，返回 sent/refused。
 */
async function forwardToDesktop({ tool, sessionId, message, toolUseContext, canUseTool, assistantMessage }) {
  let toolUseBlock = {
    type: "tool_use",
    id: `${toolUseContext.toolUseId ?? "sendmessage"}_desktop`,
    name: tool.name,
    input: {
      session_id: sessionId,
      message,
    },
    caller: {
      type: "direct",
    },
  };
  let forwardWaitMs = 0;
  let forwardCanUseTool = async (tool, input, permissionContext, ...extraArgs) => {
    let now = Date.now();
    try {
      return await canUseTool(
        tool,
        input,
        Object.keys(input).length !== 2 || input.session_id !== sessionId || input.message !== message
          ? {
              ...permissionContext,
              desktopForwardToolUseId: undefined,
            }
          : permissionContext,
        ...extraArgs,
      );
    } finally {
      forwardWaitMs += Date.now() - now;
    }
  };
  let toolResult;
  let attachments = [];
  let deferredByHook = false;
  for await (let event of runToolUse(
    toolUseBlock,
    assistantMessage,
    forwardCanUseTool,
    toolUseContext.autoModeClassified === true && toolUseContext.toolUseId !== undefined
      ? {
          ...toolUseContext,
          desktopForwardToolUseId: toolUseBlock.id,
        }
      : toolUseContext,
    () => new Date().toISOString(),
  )) {
    if (hasTypeField(event)) continue;
    if (event.message.type === "attachment") {
      if (event.message.attachment.type === "hook_deferred_tool") deferredByHook = true;
      else attachments.push(event.message);
      continue;
    }
    if (event.message.type !== "user") continue;
    let content = event.message.message.content;
    if (!Array.isArray(content)) continue;
    for (let block of content)
      if (block.type === "tool_result" && block.tool_use_id === toolUseBlock.id) toolResult = block;
  }
  let blockedWait = forwardWaitMs >= MAX_FORWARDS_PER_PROMPT;
  if (!toolResult)
    return {
      kind: "refused",
      message: deferredByHook
        ? "a hook deferred Claude Desktop's messaging tool, so nothing was sent; send it again when you are ready (a forwarded send cannot be resumed later)."
        : "the send did not run (interrupted).",
      attachments,
      deferredByHook,
      blockedWait,
    };
  let resultText = toolResultToText(toolResult);
  return toolResult.is_error
    ? {
        kind: "refused",
        message: resultText || "Claude Desktop reported an error.",
        attachments,
        deferredByHook,
        blockedWait,
      }
    : {
        kind: "sent",
        detail: resultText,
        attachments,
        deferredByHook,
        blockedWait,
      };
}
//@ chunk-astf3mhy.js:16537-16706 placement
function toolResultToText(result) {
  let { content } = result;
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .flatMap((block) => (block.type === "text" ? [block.text] : []))
    .join(
      `
`,
    )
    .trim();
}
//@ chunk-astf3mhy.js:16706-17125 placement
/**
 * 查找远程会话的 SendMessage MCP 工具：要求服务器唯一、工具唯一且与服务器配置一致、未隐藏，且功能开关开启，返回工具名。
 */
function findRemoteSendTool(tools, mcpClients, toolAliases) {
  try {
    let config = mcpClients();
    let info = getServerUrl(config);
    if (
      info === null ||
      !isClaudeCodeRemoteServer(info) ||
      config.some(
        (candidateServerUrl) => candidateServerUrl !== info && candidateServerUrl.name === info.name,
      ) ||
      hasIsolatePeerMachines()
    )
      return;
    let mcpToolName = buildMcpToolName(CLAUDE_CODE_REMOTE, SEND_MESSAGE_2);
    let filtered = tools.filter((tool) => toolMatchesName(tool, mcpToolName));
    let mcpInfo = filtered[0]?.mcpInfo;
    if (
      filtered.length !== 1 ||
      (toolAliases !== undefined && Object.hasOwn(toolAliases, mcpToolName)) ||
      mcpInfo?.serverName !== info.name ||
      mcpInfo.toolName !== SEND_MESSAGE_2 ||
      mcpInfo.scope !== info.config.scope ||
      mcpInfo.serverType !== info.config.type ||
      mcpInfo.hiddenFromModel === true
    )
      return;
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_flickering_lagoon", false) ? mcpToolName : undefined;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-astf3mhy.js:17125-17218 placement
/**
 * 读取某 agent 的元数据，仅当它是进程内队友时返回。
 */
async function inProcessTeammateMetadata(agentId, storageV5) {
  let agentMetadata = await readAgentMetadata(agentId, storageV5);
  return agentMetadata?.taskKind === "in_process_teammate" ? agentMetadata : null;
}
//@ chunk-astf3mhy.js:17218-22929 placement
/**
 * 恢复进程内队友：校验团队与名字，加载其转录并规范化，按记录的自定义 agent 类型尝试恢复定义（不可派生或来源不可信时退化为基础工具并说明），运行恢复钩子后重新启动队友。
 */
async function resumeInProcessTeammate({
  resumableAgentId,
  prompt,
  senderName,
  meta,
  fallbackName,
  toolUseContext,
}) {
  if (isDiskless()) {
    logFeatureBad("swarm_in_process_resume", "diskless");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      TEAMMATES_UNAVAILABLE_MESSAGE,
      "teammate resume refused in a session with no disk",
    );
  }
  let agentName = meta.name ?? fallbackName;
  let teamName = meta.teamName ?? getTeamName(toolUseContext.getAppState().teamContext);
  if (!agentName || !teamName) {
    logFeatureBad("swarm_in_process_resume", "no_team_context");
    throw Error("Cannot resume teammate: no team is active in this session");
  }
  if (
    typeof agentName !== "string" ||
    !AGENT_METADATA_ID_RE.test(agentName) ||
    isReservedSessionName(agentName)
  ) {
    logFeatureBad("swarm_in_process_resume", "unclaimable_name");
    throw Error(
      "Cannot resume teammate: its recorded name is reserved, looks like an agent id, or is not a valid name",
    );
  }
  let description = sanitizeMetadataText(meta.description);
  let agentTypeLabel = sanitizeMetadataText(meta.spawnedAgentType ?? meta.customAgentType);
  let degradeReason;
  let transcript = await getAgentTranscript(resumableAgentId, toolUseContext.storageV5, {
    signal: toolUseContext.abortController.signal,
  }).catch((error) => {
    if (isAbortError(error)) throw error;
    logFeatureBad("swarm_in_process_resume", "transcript_load_failed");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Cannot resume teammate: ${errorMessage(error)}`,
      "Cannot resume teammate: its transcript could not be loaded",
    );
  });
  if (toolUseContext.abortController.signal.aborted) throw new AbortError();
  if (transcript) degradeRestoredMessages(transcript.messages);
  if (!transcript || transcript.messages.length === 0) degradeReason = "no_transcript";
  let resumedMessages = transcript
    ? filterThinkingOnlyUntilStable(
        normalizeMessagesForResume(
          regroupSplitResponsesOnResume(
            dropApiInvalidAssistantBlocks(dropMalformedAttachments(transcript.messages), {
              site: "agent_resume",
            }),
          ),
        ),
      )
    : [];
  let resumeReplacementState = reconstructForSubagentResume(
    toolUseContext.contentReplacementState,
    resumedMessages,
    transcript?.contentReplacements ?? [],
  );
  let agentDefinition;
  let restoreNote;
  if (meta.customAgentType) {
    let found = toolUseContext.options.agentDefinitions.activeAgents.find(
      (activeAgent) => activeAgent.agentType === meta.customAgentType && !isBuiltInAgent(activeAgent),
    );
    let isTypeExcluded =
      found !== undefined &&
      (
        await getDispatchableAgents(
          [found],
          toolUseContext.options.agentDefinitions.allowedAgentTypes,
          getToolPermissionContext(toolUseContext),
          toolUseContext,
        )
      ).length === 0;
    let loadedDefinition;
    try {
      loadedDefinition =
        found && !isTypeExcluded ? await loadListedAgentDefinition(found, undefined) : undefined;
    } catch (error) {
      logForDebugging(
        `[resumeInProcessTeammate] agent '${replaceControlChars(meta.customAgentType)}' did not load from its plugin: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
    }
    if (isTypeExcluded) {
      restoreNote =
        "Its agent definition was not restored: that agent type can no longer be spawned in this session (a permission rule, this agent's own allowed agent types or a plugin excludes it), so the teammate is running with the team-essential tools and no custom instructions.";
      logForDebugging(
        `[resumeInProcessTeammate] not restoring agent '${replaceControlChars(meta.customAgentType)}': a deny rule, the Agent(x,y) allowlist or an agent.offer hook excludes it`,
        {
          level: "error",
        },
      );
      degradeReason = "agent_type_withheld";
    } else if (loadedDefinition) {
      if (isAgentDefinitionTrusted(loadedDefinition)) agentDefinition = loadedDefinition;
      else {
        let trustKey = agentBaseDirTrustKey(loadedDefinition);
        let trustFolderLabel = trustKey ? replaceControlChars(trustKey) : "the current workspace";
        restoreNote =
          `Its agent definition was not restored: the folder its definition file came from is not trusted (source: ${loadedDefinition.source}), so the teammate is running with the team-essential tools and no custom instructions. ` +
          (ignoresPersistedTrust()
            ? "It cannot be restored in this session, which ignores workspace trust records (CLAUDE_CODE_IGNORE_PERSISTED_TRUST is set); do not change trust settings or agent definitions on the user's behalf."
            : "To restore it, the user needs to run Claude Code in that folder once and accept the trust dialog (the --debug log names the folder); do not change trust settings on the user's behalf.");
        logForDebugging(
          `[resumeInProcessTeammate] not restoring agent '${replaceControlChars(loadedDefinition.agentType)}': the folder its definition file came from (${trustFolderLabel}) is not trusted (source: ${loadedDefinition.source}). ${agentFolderTrustHint(loadedDefinition)}`,
          {
            level: "error",
          },
        );
        degradeReason = "agent_type_untrusted";
      }
    } else degradeReason = "agent_type_unresolved";
    if (!agentDefinition)
      agentDefinition = {
        agentType: meta.customAgentType,
        whenToUse: "",
        tools: [],
        getSystemPrompt: () => "",
        source: "projectSettings",
      };
  }
  let model = typeof meta.model === "string" ? meta.model : undefined;
  let startResult = await runResumeStartHooks(resumableAgentId, {
    tool_use_id: toolUseContext.toolUseId ?? "",
    parentModel: getMainLoopModel(toolUseContext),
    parentAgentId: toolUseContext.agentId,
    signal: toolUseContext.abortController.signal,
    origin: toolUseContext.hookOrigin,
    agent:
      agentDefinition !== undefined && (degradeReason === undefined || degradeReason === "no_transcript")
        ? agentDefinition
        : teammateAgentIdentity(agentTypeLabel),
    prompt,
    description: description ?? "(resumed)",
    model,
    permissionMode: getToolPermissionContext(toolUseContext).mode,
    background: true,
    fork: false,
    isTeammate: true,
    name: agentName,
    cwd: undefined,
  });
  using starting = startResult.starting;
  if (startResult.deny !== undefined) {
    logFeatureBad("swarm_in_process_resume", "denied_by_hook");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      pluginDeclinedResumeMessage(startResult.deny),
      "Subagent resume denied by a plugin",
    );
  }
  if (
    !(await markMessagesAsReadByPredicate(
      agentName,
      (message) => isStructuredProtocolMessage(message.text),
      teamName,
      toolUseContext.storageV5,
    ))
  )
    logForDebugging(
      `[resumeInProcessTeammate] stale protocol-frame drop for ${agentName} did not land; the resumed runner may see stale protocol frames`,
      {
        level: "warn",
      },
    );
  let spawnProvenanceMarks = resolveSpawnProvenanceMarks(resumableAgentId, meta, toolUseContext);
  let resumeContext = {
    ...toolUseContext,
    ...spawnProvenanceMarks.marks,
  };
  let { spawnInProcessTeammate } = require("../../utils/swarm/spawnInProcess.js");
  let { startInProcessTeammate } = require("../../utils/swarm/inProcessRunner.js");
  let inProcessTeammate = await spawnInProcessTeammate(
    {
      name: agentName,
      teamName,
      prompt,
      description,
      shownPrompt: description,
      spawnedWith: {
        description,
        agentType: agentTypeLabel,
        parentAgentId: sanitizeMetadataText(meta.parentAgentId),
      },
      color: meta.color,
      planModeRequired: meta.planModeRequired ?? false,
      model: meta.model,
      permissionMode:
        meta.permissionMode !== undefined &&
        meta.permissionMode !== "bypassPermissions" &&
        PERMISSION_MODES.includes(meta.permissionMode)
          ? meta.permissionMode
          : undefined,
      resumableAgentId,
    },
    resumeContext,
  );
  if (!inProcessTeammate.ok) {
    logFeatureBad("swarm_in_process_resume", "spawn_failed");
    logForDebugging(`[resumeInProcessTeammate] spawn failed: ${inProcessTeammate.error}`);
    throw Error("Failed to respawn in-process teammate");
  }
  spawnProvenanceMarks.admit();
  await updateTeamFile(
    teamName,
    (teamFile) => {
      let found = teamFile.members.find((member) => member.agentId === inProcessTeammate.agentId);
      if (found) {
        found.joinedAt = Date.now();
        return;
      }
      teamFile.members.push({
        agentId: inProcessTeammate.agentId,
        name: agentName,
        color: meta.color,
        agentType: meta.customAgentType,
        planModeRequired: meta.planModeRequired,
        joinedAt: Date.now(),
        tmuxPaneId: "in-process",
        cwd: getCwd(),
        subscriptions: [],
        backendType: "in-process",
      });
    },
    undefined,
    toolUseContext.storageV5,
  ).catch((error) =>
    logForDebugging(`[resumeInProcessTeammate] team file re-add failed (ad-hoc team?): ${error}`),
  );
  toolUseContext.agentLifecycle.setTeammate(inProcessTeammate.agentId, {
    name: agentName,
    color: meta.color,
    agentType: meta.customAgentType,
    tmuxSessionName: "in-process",
    tmuxPaneId: "in-process",
    cwd: getCwd(),
    spawnedAt: Date.now(),
  });
  startInProcessTeammate({
    identity: inProcessTeammate.identity,
    taskId: inProcessTeammate.taskId,
    prompt,
    initialFrom: senderName,
    description,
    spawnedAgentType: agentTypeLabel,
    agentDefinition,
    model: meta.model,
    teammateContext: inProcessTeammate.teammateContext,
    toolUseContext: {
      ...resumeContext,
      messages: [],
    },
    abortController: inProcessTeammate.abortController,
    resumeMessages: resumedMessages,
    resumeReplacementState,
  });
  starting?.started({
    agentId: resumableAgentId,
    model: parseUserSpecifiedModel(model ?? getMainLoopModel(toolUseContext)),
    teammateId: inProcessTeammate.agentId,
  });
  logForDebugging(
    `[resumeInProcessTeammate] Resumed ${inProcessTeammate.agentId} with ${resumedMessages.length} prior messages`,
  );
  if (degradeReason) logFeatureSad("swarm_in_process_resume", degradeReason);
  else logFeatureOk("swarm_in_process_resume");
  return {
    agentId: inProcessTeammate.agentId,
    taskId: inProcessTeammate.taskId,
    resumedMessageCount: resumedMessages.length,
    definitionNotice: restoreNote,
  };
}
//@ chunk-astf3mhy.js:22970-28389 sole-consumer
/**
 * 生成 SendMessage 工具提示词：to 的取值表（子代理、主会话、跨会话 worker）、纯文本输出不可见、按名字寻址；启用跨会话时追加跨会话寻址、回复、notify_when_idle 与权限边界说明；团队模式下附旧版协议响应说明。
 */
function getSendMessagePrompt(includeProtocol, sessionOnly) {
  let crossSessionRows = isCrossSessionMessagingEnabled()
    ? `
| \`"worker"\` | Any agent from \`${LISTAGENTS}\` \u2014 subagent, another local Claude session |
| \`"worker [3fa9c1]"\` | Same, plus its \`[ref]\` \u2014 only when a listing or an error shows one |`
    : "";
  let emptyHint = "";
  let nameHintBlock = isCrossSessionMessagingEnabled()
    ? `

## Cross-session

Use \`${LISTAGENTS}\` to discover targets. Every row leads with the agent's \`name [ref]\` \u2014 the name IS the address; there is no separate address syntax.

\`\`\`json
{"to": "worker", "message": "check if tests pass over there"}
{"to": "worker [3fa9c1]", "message": "you, specifically"}
\`\`\`

Send the bare name \u2014 a name that exactly matches one live agent or session (on this machine, on another machine, or in the cloud) delivers directly. Append the \` [ref]\` only when the bare name is not enough \u2014 \`${LISTAGENTS}\` shows two rows with it, or an error asks you to disambiguate (you typed only a prefix, or a session list could not be checked). A ref you did not just read from a listing or an error will not resolve, and if the same name also names an in-process agent, the bare name always wins \u2014 use the in-process one.

A listed peer is alive and will receive your message; messages enqueue and drain at the receiver's next tool round (its \`${LISTAGENTS}\` row says whether it is busy or idle right now). A successful send means the message reached that session, not that its Claude read it: a session running in a different permission mode than yours holds cross-session messages for its user's approval (and may let them expire), and a session can refuse them outright \u2014 for a session on this machine a \`[Cross-session delivery notice]\` tells you when that happens (the tool result says when this session has no inbox for one to reach); for a Remote Control, cloud or Claude Desktop session nothing reports back, so never treat silence as agreement. Your message arrives wrapped as \`<cross-session-message from="...">\`. **To reply to an incoming message, copy its \`from\` attribute as your \`to\`.** Cross-session messages travel between SESSIONS: if you are a subagent, your send goes out under your parent session's address, and any reply is delivered to the parent session's conversation, not to you. The receiver reads your message literally in every case (idle or busy, on this machine, over Remote Control or headless): an \`@\` followed by a file path, or \`@server:resource\`, attaches nothing there, unlike in your own user's input. So never rely on \`@\` to deliver content: send the text itself, or a file with its own tool.

To hear when a session ON THIS MACHINE finishes what it is doing, pass \`notify_when_idle: true\` (from the main conversation only) \u2014 one-shot and opt-in: exactly one \`[Cross-session idle notice]\` arrives when it next goes idle (or exits) \u2014 shown to you, or only to your user when this session holds peer messages for approval (the tool result says which); if it never signals within the subscription's lifetime (it may still be busy, may refuse inbound requests, or may have ended abruptly) the notice says the subscription expired instead. Omit \`message\` for a pure subscription that costs that session nothing; include one to deliver it now AND subscribe. Never poll \`${LISTAGENTS}\` in a loop or send "are you done?" messages instead.

Permission boundaries are per-session: NEVER ask a peer to perform an action that was denied or blocked in your session, or that you expect your own permission settings would block \u2014 a peer doing it for you bypasses the user's permission decision (cross-session permission laundering). Route blocked work back to your user instead.`
    : "";
  return `
# SendMessage

Send a message to another agent.

\`\`\`json
{"to": "researcher", "summary": "assign task 1", "message": "start on task #1"}
\`\`\`

| \`to\` | |
|---|---|
${
  sessionOnly
    ? '| `"researcher"` | An agent of this session, by its name |\n| `"main"` | The main conversation (background subagents only) |\n\nNo one outside this session can be reached.'
    : `| \`"researcher"\` | Teammate by name |
| \`"main"\` | The main conversation (background subagents only) |${crossSessionRows}`
}

Your plain text output is NOT visible to other agents \u2014 to communicate, you MUST call this tool.${sessionOnly ? "" : " Messages from teammates are delivered automatically; you don't check an inbox."} Refer to agents by name \u2014 names keep working after an agent completes (a send resumes it from its transcript). Use the raw \`agentId\` (format \`a...-...\`) from its spawn result only when the agent has no name, or when a newer agent took the name (latest wins). When relaying, don't quote the original \u2014 it's already rendered to the user.${nameHintBlock}${includeProtocol && !sessionOnly ? '\n\n## Protocol responses (legacy)\n\nIf you receive a JSON message with `type: "shutdown_request"` or `type: "plan_approval_request"`, respond with the matching `_response` type \u2014 echo the `request_id`, set `approve` true/false:\n\n```json\n{"to": "team-lead", "message": {"type": "shutdown_response", "request_id": "...", "approve": true}}\n{"to": "researcher", "message": {"type": "plan_approval_response", "request_id": "...", "approve": false, "feedback": "add error handling"}}\n```\n\nApproving shutdown terminates your process. Rejecting plan sends the teammate back to revise. Don\'t originate `shutdown_request` unless asked. Don\'t send structured JSON status messages \u2014 report progress through your task tools if you have them, otherwise in plain prose.' : ""}
`.trim();
}
//@ chunk-astf3mhy.js:28426-28889 sole-consumer
/**
 * 把 UDS 发送错误分类为遥测原因：socket 失效、忙、消息过大、发送方限速、目标无效等。
 */
function classifyUdsSendError(error) {
  switch (classifyPeerSendError(error)) {
    case "gone":
      return "stale_socket";
    case "busy":
      return "socket_busy";
    case "other":
      break;
  }
  if (isMessageTooLargeError(error)) return "too_large";
  if (isSenderPacedError(error)) return "sender_paced";
  if (error instanceof UdsSendRefusedError)
    switch (error.refusal) {
      case "wrong-endpoint":
        return "stale_socket";
      case "endpoint-unverifiable":
        return "socket_busy";
      case "symlink":
      case "unvettable":
      case "non-local":
        return "invalid_target";
    }
  if (error instanceof Error && error.message.startsWith("Timed out sending")) return "timeout";
  return "other";
}
//@ chunk-astf3mhy.js:28889-29511 sole-consumer
/**
 * 记录 SendMessage 投递遥测：路由、耗时、错误/降级分类、等待、寻址方式与固定/改名/重启/身份冲突等标记。
 */
function logSendDelivery({
  route,
  startedAt,
  errorClass,
  degradedClass,
  blockedWait,
  via,
  exactUnique,
  previouslyPinned,
  searchTruncated,
  renamedHint,
  restartedSincePin,
  identityContested,
  fromSubagent,
}) {
  let logFields = {
    route: fromEnum(route),
    duration_ms: Date.now() - startedAt,
    ...(blockedWait && {
      blocked_wait: true,
    }),
    ...(via !== undefined && {
      via: fromEnum(via),
    }),
    ...(exactUnique && {
      exact_unique: true,
    }),
    ...(previouslyPinned && {
      previously_pinned: true,
    }),
    ...(searchTruncated && {
      search_truncated: true,
    }),
    ...(renamedHint && {
      renamed_hint: true,
    }),
    ...(restartedSincePin && {
      restarted_since_pin: true,
    }),
    ...(identityContested && {
      identity_contested: true,
    }),
    ...(fromSubagent && {
      from_subagent: true,
    }),
  };
  if (errorClass !== undefined) logFeatureBad("send_message_delivery", errorClass, logFields);
  else if (degradedClass !== undefined) logFeatureSad("send_message_delivery", degradedClass, logFields);
  else logFeatureOk("send_message_delivery", logFields);
}
//@ chunk-astf3mhy.js:29511-29655 sole-consumer
var NO_PERMISSION_CHECK_SUFFIX = "and no permission check can run here; nothing was sent.";
var READDRESS_NOT_APPROVED_SUFFIX =
  "(a plugin hook readdressed this send) was not approved; nothing was sent.";
//@ chunk-astf3mhy.js:29655-30548 sole-consumer
/**
 * 把文本消息交给插件 session.send 钩子：钩子可直接应答（送达/拒绝）、改写收件人或文本（经重新解析、校验与权限确认），然后投递并回报结果。
 */
async function sendThroughHooks(sendContext) {
  let { deps, input, toolCall, deliver } = sendContext;
  if (typeof input.message !== "string" || input.message.trim() === "") return deliver(input, toolCall);
  let startedAt = Date.now();
  let { hookCaller } = deps;
  let sessionSend = await runSessionSend({
    raised: {
      to: input.to,
      text: input.message,
      origin:
        hookCaller === undefined
          ? {
              kind: "model",
            }
          : {
              kind: "plugin",
              name: hookCaller,
            },
      ...(deps.agentId !== undefined && {
        agentId: deps.agentId,
      }),
    },
    signalOf: () => toolCall.signal,
    skipping: deps.hookOrigin,
  });
  if (sessionSend.answered !== undefined) {
    let { answered } = sessionSend;
    logSendDelivery({
      route: "hook",
      startedAt,
      ...(answered.isDelivered
        ? {}
        : {
            degradedClass: "hook_refused",
          }),
    });
    return sendDataResult(
      answered.isDelivered
        ? {
            success: true,
            message: HOOK_DELIVERED_NOTE,
          }
        : {
            success: false,
            message: `Not sent: a plugin hook refused it (${answered.reason}).`,
          },
    );
  }
  using delivering = sessionSend.delivering;
  let rewritten = await applyHookRewrite(sendContext, sessionSend.send);
  if (rewritten.refusal !== undefined) {
    logSendDelivery({
      route: "hook",
      startedAt,
      degradedClass: rewritten.degradedClass,
    });
    delivering.refused(rewritten.refusal);
    return sendDataResult({
      success: false,
      message: rewritten.refusal,
    });
  }
  let delivered = await deliver(rewritten.deliver, toolCall);
  let { success, message } = delivered.data;
  if (success) delivering.delivered();
  else delivering.refused(message);
  return delivered;
}
//@ chunk-astf3mhy.js:30548-30578 sole-consumer
/**
 * 构造 {data} 形式的工具结果。
 */
function sendDataResult(data) {
  return {
    data,
  };
}
//@ chunk-astf3mhy.js:30578-31504 sole-consumer
/**
 * 应用钩子对发送的改写：只改文本时沿用原批准；改收件人时重新解析校验并向用户请求权限，拒绝或无法确认时返回 refusal。
 */
async function applyHookRewrite(sendContext, send) {
  let { input, toolCall, reparse, validate, carryApproval, adoptReask } = sendContext;
  let { to, text } = send;
  let toChanged = to !== input.to;
  let textChanged = text !== input.message;
  if (!toChanged && !textChanged)
    return {
      deliver: input,
    };
  let { summary, ...inputWithoutSummary } = input;
  let rewrittenInput = reparse(
    textChanged
      ? {
          ...inputWithoutSummary,
          to,
          message: text,
        }
      : {
          ...input,
          to,
        },
  );
  let validation = rewrittenInput === undefined ? undefined : await validate(rewrittenInput, toolCall);
  let isRefused = validation?.result === false;
  if (rewrittenInput === undefined || isRefused)
    return {
      refusal: `A plugin hook rewrote this send into one the tool refuses (${isRefused ? validation.message : "a shape SendMessage does not accept"}); nothing was sent.`,
      degradedClass: "hook_refused",
    };
  if (!toChanged) {
    carryApproval(input, rewrittenInput);
    return {
      deliver: rewrittenInput,
    };
  }
  let { ask } = toolCall;
  if (ask === undefined)
    return {
      refusal: `A plugin hook readdressed this send to '${to}' ` + NO_PERMISSION_CHECK_SUFFIX,
      degradedClass: "hook_refused",
    };
  let askToolUseId = randomUUID();
  let askResult = await ask(rewrittenInput, {
    toolUseId: askToolUseId,
  });
  adoptReask(askToolUseId, rewrittenInput);
  let readdressRefusal = `Sending to '${to}' ${READDRESS_NOT_APPROVED_SUFFIX}`;
  switch (askResult.behavior) {
    case "allow":
      return checkHandlerRewrite(rewrittenInput, askResult.updatedInput, reparse);
    case "deny":
      return {
        refusal: askResult.message || readdressRefusal,
        degradedClass: "permission_denied",
      };
    default:
      return {
        refusal: readdressRefusal,
        degradedClass: "permission_denied",
      };
  }
}
//@ chunk-astf3mhy.js:31504-32180 sole-consumer
/**
 * 检查权限处理器对发送输入的改写：形状不被接受、收件人被改或消息被改为非文本时拒绝发送并说明，否则返回改写后的输入。
 */
function checkHandlerRewrite(input, updatedInput, reparse) {
  let rewritten = updatedInput === undefined ? input : reparse(updatedInput);
  if (rewritten === undefined)
    return {
      refusal:
        "The permission handler narrowed the input to a shape SendMessage " +
        "does not accept \u2014 nothing was sent.",
      degradedClass: "handler_rewrite",
    };
  if (rewritten.to !== input.to)
    return {
      refusal:
        `The permission handler changed the recipient (from '${input.to}') after this send was approved \u2014 nothing was ` +
        "sent. Send again to the recipient you intend.",
      degradedClass: "handler_rewrite",
    };
  return typeof rewritten.message === "string"
    ? {
        deliver: rewritten,
      }
    : {
        refusal:
          "The permission handler rewrote the message into a structured " +
          "(non-text) form, which a rewritten send cannot carry \u2014 " +
          "nothing was sent.",
        degradedClass: "handler_rewrite",
      };
}
//@ chunk-astf3mhy.js:32180-32251 sole-consumer
var REQUEST_ID_EXTRA_CHARS; // deferred: uses MIN_ADDRESS_REF_LENGTH (../../utils/sessionAddresses.js) of its import cycle while loading; runs once the cycle is complete
var MAX_REQUEST_ID_CHARS;
var RECIPIENT_EXTRA_CHARS;
var max;
var SINGLE_LINE_RE;
deferInit("chunk-astf3mhy.js:32180", () => {
  REQUEST_ID_EXTRA_CHARS = 100;
  MAX_REQUEST_ID_CHARS = MAX_SEED_NAME_CHARS + REQUEST_ID_EXTRA_CHARS;
  RECIPIENT_EXTRA_CHARS = 2 + MAX_ADDRESS_REF_LENGTH + 1;
  max = Math.max(MAX_SEED_NAME_CHARS + RECIPIENT_EXTRA_CHARS, MAX_HEADER_VALUE_LENGTH);
  SINGLE_LINE_RE = /^[^\n\r]*$/u;
});
//@ chunk-astf3mhy.js:32251-32310 sole-consumer
function maxLengthRegex(max) {
  return new RegExp(`^[\\s\\S]{0,${max}}$`, "u");
}
//@ chunk-astf3mhy.js:32310-32334 sole-consumer
var REQUEST_ID_LENGTH_RE; // deferred: uses maxLengthRegex of its import cycle while loading; runs once the cycle is complete
var RECIPIENT_LENGTH_RE;
deferInit("chunk-astf3mhy.js:32310", () => {
  REQUEST_ID_LENGTH_RE = maxLengthRegex(MAX_REQUEST_ID_CHARS);
  RECIPIENT_LENGTH_RE = maxLengthRegex(max);
});
//@ chunk-astf3mhy.js:32334-32372 sole-consumer
function getToAndMessageFields(input) {
  return [input.to, input.message];
}
//@ chunk-astf3mhy.js:32372-32400 sole-consumer
function getToField(input) {
  return [input.to];
}
//@ chunk-astf3mhy.js:32400-32464 sole-consumer = extractMarkupText (1)
/**
 * 对象是否带 kind 字段（误配名 extractMarkupText）。
 */
function isRecordWithKind(contents) {
  return typeof contents === "object" && contents !== null && "kind" in contents;
}
//@ chunk-astf3mhy.js:32464-32571 sole-consumer
/**
 * coerceInput 后按当前 schema 重新解析 SendMessage 输入。
 */
function reparseSendMessageInput(rawInput) {
  let normalized = normalizeSendMessageInput(rawInput, {
    applySplit: isDeepFeatherSplitEnabled(),
  });
  let parsed = getSendMessageInputSchema().safeParse(normalized?.input ?? rawInput);
  return parsed.success ? parsed.data : undefined;
}
//@ chunk-astf3mhy.js:32571-32593 sole-consumer
/**
 * toolState 键：正在恢复的代理 id → 任务 Promise，避免并发重复恢复。
 */
class OutboxDedupMap extends Map {}
//@ chunk-astf3mhy.js:32593-32632 affinity
function messageFieldSchema(description) {
  return union([plainMessageSchema(description), StructuredMessageSchema()]);
}
//@ chunk-astf3mhy.js:32632-32700 fingerprint = inputSchema (0.61)
function plainMessageSchema(descriptionText) {
  return stringSchema().describe(descriptionText ?? "Plain text message content");
}
//@ chunk-astf3mhy.js:32700-33558 fingerprint = StructuredMessage (0.489)
/**
 * 结构化消息 schema：shutdown_request{reason?} / shutdown_response{request_id, approve, reason?} / plan_approval_response{request_id, approve, feedback?}；及跨会话 message 字段说明与默认值。
 */
var PLAIN_MESSAGE_DESCRIPTION; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var EMPTY_MESSAGE_DEFAULT;
var StructuredMessageSchema;
deferInit("chunk-astf3mhy.js:32700", () => {
  PLAIN_MESSAGE_DESCRIPTION =
    "Plain text message content. The recipient's human sees only the FIRST LINE as a one-line preview until they expand it, so make the first line a " +
    "clear, self-contained sentence saying what this is about \u2014 not a greeting, " +
    "preamble, or bare @-mention.";
  EMPTY_MESSAGE_DEFAULT = "";
  StructuredMessageSchema = DoctorLazy(() =>
    discriminatedUnion("type", [
      objectSchema({
        type: literal("shutdown_request"),
        reason: stringSchema().optional(),
      }),
      objectSchema({
        type: literal("shutdown_response"),
        request_id: stringSchema()
          .min(1, "must be the request id being responded to")
          .regex(SINGLE_LINE_RE, "must be a single-line request id")
          .regex(
            REQUEST_ID_LENGTH_RE,
            `request id longer than any real one (max ${MAX_REQUEST_ID_CHARS} characters)`,
          ),
        approve: booleanishSchema(),
        reason: stringSchema().optional(),
      }),
      objectSchema({
        type: literal("plan_approval_response"),
        request_id: stringSchema()
          .min(1, "must be the request id being responded to")
          .regex(SINGLE_LINE_RE, "must be a single-line request id")
          .regex(
            REQUEST_ID_LENGTH_RE,
            `request id longer than any real one (max ${MAX_REQUEST_ID_CHARS} characters)`,
          ),
        approve: booleanishSchema(),
        feedback: stringSchema().optional(),
      }),
    ]),
  );
});
//@ chunk-astf3mhy.js:33558-34775 layout
/**
 * 构造 SendMessage 输入 schema：to（单行、限长）、summary（≤200，超长截断）、message（纯文本或结构化），跨会话版本额外有 notify_when_idle。
 */
function buildSendMessageInputSchema(crossSession) {
  return objectSchema({
    to: stringSchema()
      .regex(SINGLE_LINE_RE, "must be a single-line recipient name or address")
      .regex(RECIPIENT_LENGTH_RE, `recipient longer than any listed name or address (max ${max} characters)`)
      .describe(
        crossSession
          ? `Recipient: a name from ${LISTAGENTS} (append its " [ref]" only when a listing or an error shows one), a teammate name, "main", or a background agent's agentId`
          : `Recipient: a background agent's name or agentId, a teammate name, or "main"`,
      ),
    summary: stringSchema()
      .max(SUMMARY_MAX_CHARS)
      .optional()
      .describe(
        crossSession
          ? `A 5-10 word label for your own transcript row (not transmitted \u2014 the recipient previews the first line of \`message\`). Truncated to ${SUMMARY_MAX_CHARS} characters rather than rejected.`
          : `A 5-10 word summary shown as a one-line preview in the UI. Defaults to the first line of a plain-text message; longer summaries are truncated to ${SUMMARY_MAX_CHARS} characters rather than rejected.`,
      ),
    message: crossSession
      ? messageFieldSchema(PLAIN_MESSAGE_DESCRIPTION).default(EMPTY_MESSAGE_DEFAULT)
      : messageFieldSchema(),
    ...(crossSession && {
      notify_when_idle: booleanishSchema(booleanSchema().optional()).describe(
        "Ask a session ON THIS MACHINE to send you ONE notice when it next goes idle (finishes its turn with nothing queued) or exits \u2014 opt-in, one-shot, no polling. With a message: deliver it now AND subscribe. Without a message (omit it): a pure subscription that costs the other session nothing.",
      ),
    }),
  });
}
//@ chunk-astf3mhy.js:34775-35045 layout
/**
 * SendMessage 输入 schema 的五个变体（本地/跨会话 × 是否允许结构化，及仅本会话代理版本）。
 */
var localSendMessageSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var crossSessionSendMessageSchema;
var plainLocalSendMessageSchema;
var plainCrossSessionSendMessageSchema;
var ownAgentsOnlySendMessageSchema;
deferInit("chunk-astf3mhy.js:34775", () => {
  localSendMessageSchema = DoctorLazy(() => buildSendMessageInputSchema(false));
  crossSessionSendMessageSchema = DoctorLazy(() => buildSendMessageInputSchema(true));
  plainLocalSendMessageSchema = DoctorLazy(() =>
    localSendMessageSchema().extend({
      message: plainMessageSchema(),
    }),
  );
  plainCrossSessionSendMessageSchema = DoctorLazy(() =>
    crossSessionSendMessageSchema().extend({
      message: plainMessageSchema(PLAIN_MESSAGE_DESCRIPTION).default(EMPTY_MESSAGE_DEFAULT),
    }),
  );
  ownAgentsOnlySendMessageSchema = DoctorLazy(() =>
    plainLocalSendMessageSchema().extend({
      to: plainLocalSendMessageSchema().shape.to.describe(
        'Recipient: the name or agentId of an agent of this session, or "main" (from a subagent)',
      ),
    }),
  );
});
//@ chunk-astf3mhy.js:35045-35131 layout
/**
 * 选择 SendMessage 输入 schema：messagingBeyondOwnAgentsDisabled → 只能发本会话代理；跨会话开关（tengu_harbor_kite / CLAUDE_CODE_HARBOR_KITE）开 → 含 notify_when_idle 的跨会话版本；agent swarms 决定 message 能否为结构化对象。
 */
function getSendMessageInputSchema() {
  if (isMessagingLimitedToOwnAgents()) return ownAgentsOnlySendMessageSchema();
  if (isCrossSessionMessagingEnabled())
    return isAgentSwarmsEnabled() ? crossSessionSendMessageSchema() : plainCrossSessionSendMessageSchema();
  return isAgentSwarmsEnabled() ? localSendMessageSchema() : plainLocalSendMessageSchema();
}
//@ chunk-astf3mhy.js:35131-35506 layout
/**
 * UDS（本机会话）发送失败原因映射为遥测 errorClass。
 */
function classifyUdsSendFailure(outcome) {
  switch (outcome.reason) {
    case "requester-refuses-inbound":
      return "permission_denied";
    case "no-inbox":
    case "unreachable-namespace":
    case "peer-unsupported":
      return "not_reachable";
    case "self-target":
      return "invalid_target";
    case "peer-gone":
      return "stale_socket";
    case "send-failed":
    case "send-uncertain":
      return outcome.error !== undefined ? classifyUdsSendError(outcome.error) : "other";
    case "cap":
      return "subscription_cap";
  }
}
//@ chunk-astf3mhy.js:35506-35694 layout
/**
 * 记录 UDS 发送结果遥测。
 */
function emitUdsSendOutcome(outcome, emit, extra = {}) {
  if (outcome.ok) return;
  let isDegraded =
    outcome.reason === "send-uncertain" ||
    outcome.reason === "requester-refuses-inbound" ||
    outcome.reason === "cap";
  emit("uds", isDegraded ? undefined : classifyUdsSendFailure(outcome), {
    ...(isDegraded && {
      degradedClass: classifyUdsSendFailure(outcome),
    }),
    ...extra,
  });
}
//@ chunk-astf3mhy.js:35694-35977 layout
/**
 * 跨会话发送时消息为空的处理：处理器改写、未订阅或主体被拒分别返回失败结果。
 */
function checkEmptyCrossSessionMessage({
  input,
  plainMessage,
  notify,
  refusedForPrincipal,
  assistantMessage,
  toolUseId,
  emit,
}) {
  if (plainMessage.trim().length > 0) return;
  if (wasEmptiedByHandler(input, assistantMessage, toolUseId)) {
    emit("uds", "handler_rewrite");
    return wantsNotifyWhenIdle(input)
      ? refusedForPrincipal
        ? EMPTIED_MESSAGE_SHORT_RESULT
        : EMPTIED_MESSAGE_RESULT
      : NOTHING_TO_SEND_RESULT;
  }
  if (!notify) {
    if (refusedForPrincipal) logIdleSubscribeRefused();
    emit("uds", refusedForPrincipal ? "permission_denied" : "empty_message");
    return emptyMessageResult(refusedForPrincipal);
  }
  return;
}
//@ chunk-astf3mhy.js:35977-36109 layout
/**
 * notify_when_idle 资格：只有主会话可以订阅；子代理/队友请求时标记 refusedForPrincipal。
 */
function getNotifyIdleEligibility(input, deps) {
  let wantsNotify = wantsNotifyWhenIdle(input);
  let refusedForPrincipal =
    wantsNotify && (deps.agentId !== undefined || deps.teammateContext !== undefined || isTeammate());
  return {
    notify: wantsNotify && !refusedForPrincipal,
    refusedForPrincipal,
  };
}
//@ chunk-astf3mhy.js:36109-36144 layout
var EMPTY_MESSAGE_ERROR = "message must not be empty";
//@ chunk-astf3mhy.js:36144-36219 layout
/**
 * 记录“空闲订阅因身份被拒”的遥测事件。
 */
function logIdleSubscribeRefused() {
  logFeatureSad("cross_session_notify_idle", "subscribe_refused_principal");
}
//@ chunk-astf3mhy.js:36219-36385 layout
/**
 * 消息被权限处理器清空（现为空、原始有内容或订阅）。
 */
function wasEmptiedByHandler(input, assistantMessage, toolUseId) {
  if (typeof input.message === "string" && input.message.trim().length > 0) return false;
  let message = getOriginalToolUseInput(assistantMessage, toolUseId)?.message;
  return (
    (typeof message === "string" && message.trim().length > 0) ||
    wasNotifyStrippedByHandler(input, assistantMessage, toolUseId)
  );
}
//@ chunk-astf3mhy.js:36385-36453 layout
/**
 * notify_when_idle 被权限处理器去掉。
 */
function wasNotifyStrippedByHandler(input, assistantMessage, toolUseId) {
  return (
    !wantsNotifyWhenIdle(input) &&
    coerceBooleanString(getOriginalToolUseInput(assistantMessage, toolUseId)?.notify_when_idle) === true
  );
}
//@ chunk-astf3mhy.js:36453-36496 layout
/**
 * 判断输入是否要求 notify_when_idle，或该字段曾被权限处理器改写掉。
 */
function wantsOrLostNotifyIdle(input, assistantMessage, toolUseId) {
  return wantsNotifyWhenIdle(input) || wasNotifyStrippedByHandler(input, assistantMessage, toolUseId);
}
//@ chunk-astf3mhy.js:36496-36907 layout
/**
 * 从发出的 assistant 消息里找到该 tool_use 的原始 message/notify_when_idle（判断权限处理器是否改写过）。
 */
function getOriginalToolUseInput(assistantMessage, toolUseId) {
  if (toolUseId === undefined || !Array.isArray(assistantMessage.message.content)) return;
  let found = assistantMessage.message.content.find(
    (block) => block.type === "tool_use" && block.id === toolUseId,
  );
  if (found === undefined || found.type !== "tool_use") return;
  let input = found.input;
  if (typeof input !== "object" || input === null) return;
  let normalized = normalizeSendMessageInput(input, {
    applySplit: isDeepFeatherSplitEnabled(),
  });
  let inputObject = normalized !== null && isPlainObject(normalized.input) ? normalized.input : input;
  return {
    message: "message" in inputObject ? inputObject.message : undefined,
    notify_when_idle: "notify_when_idle" in inputObject ? inputObject.notify_when_idle : undefined,
  };
}
//@ chunk-astf3mhy.js:36907-36964 layout
function emptyMessageResult(refusedForPrincipal) {
  return {
    data: {
      success: false,
      message: refusedForPrincipal ? NOTIFY_IDLE_MAIN_ONLY_ERROR : EMPTY_MESSAGE_ERROR,
    },
  };
}
//@ chunk-astf3mhy.js:36964-37052 layout
/**
 * 输入中 notify_when_idle 为真。
 */
function wantsNotifyWhenIdle(input) {
  if (!("notify_when_idle" in input)) return false;
  return coerceBooleanString(input.notify_when_idle) === true;
}
//@ chunk-astf3mhy.js:37052-37284 layout
/**
 * 提示消息已投递但未建立空闲订阅的说明。
 */
var NOTIFY_IDLE_SCOPE_ERROR =
  "notify_when_idle is only supported for Claude sessions on this machine in this release (not teammates, subagents, Remote Control or cloud sessions).";
var IDLE_SUBSCRIBE_LOST_NOTE = `
The message was delivered, but no idle subscription was made: ${NOTIFY_IDLE_SCOPE_ERROR}`;
//@ chunk-astf3mhy.js:37284-37324 layout
/**
 * local_<uuid> 形式的本机桌面会话地址。
 */
function isLocalSessionAddress(address) {
  return isTopHostSession() && LOCAL_TASK_ID_PATTERN.test(address);
}
//@ chunk-astf3mhy.js:37324-37862 layout
/**
 * 权限处理器清空或改写发送内容时返回的失败结果（未发送、未订阅空闲通知）。
 */
var EMPTIED_MESSAGE_RESULT = {
  data: {
    success: false,
    message:
      "A permission handler emptied this message; nothing was sent, and no idle subscription was made (a blanked delivery is never reinterpreted as a pure subscription \u2014 send notify_when_idle without a message if that is what you want).",
  },
};
var EMPTIED_MESSAGE_SHORT_RESULT = {
  data: {
    success: false,
    message:
      "A permission handler emptied this message; nothing was sent, and no idle subscription was made.",
  },
};
var NOTHING_TO_SEND_RESULT = {
  data: {
    success: false,
    message:
      "A permission handler rewrote this call so that nothing was left to send or subscribe; nothing was sent.",
  },
};
//@ chunk-astf3mhy.js:37862-37942 layout
/**
 * 消息为空时记录遥测并返回“没有内容可发”的结果。
 */
function missingMessageResult(message, release) {
  if (typeof message === "string" && message.trim().length > 0) return;
  release();
  return NOTHING_TO_SEND_RESULT;
}
//@ chunk-astf3mhy.js:37942-38531 layout
/**
 * 空闲订阅相关说明：消息未送达需重发、只有主对话能订阅 notify_when_idle、订阅被权限处理器移除等（含展示版）。
 */
var NOT_DELIVERED_RETRY_NOTE =
  " Your message was NOT delivered; send it again without notify_when_idle if it should still go.";
var NOTIFY_IDLE_MAIN_ONLY_ERROR =
  "notify_when_idle is only available from the main conversation of this session (not from a subagent or teammate).";
var SUBSCRIPTION_MAIN_ONLY_NOTE = `
The message was delivered, but no idle subscription was made: ${NOTIFY_IDLE_MAIN_ONLY_ERROR}`;
var SUBSCRIPTION_MAIN_ONLY_DISPLAY =
  "No idle subscription was made (only the main conversation can subscribe).";
var SUBSCRIPTION_STRIPPED_NOTE = `
The message was delivered, but no idle subscription was made: a permission handler removed notify_when_idle from this call.`;
var SUBSCRIPTION_STRIPPED_DISPLAY =
  "No idle subscription was made (a permission handler removed it from the call).";
//@ chunk-astf3mhy.js:38531-38697 layout
function describeSkippedSubscription(refusedForPrincipal, input, assistantMessage, toolUseId) {
  if (refusedForPrincipal)
    return {
      model: SUBSCRIPTION_MAIN_ONLY_NOTE,
      display: SUBSCRIPTION_MAIN_ONLY_DISPLAY,
    };
  if (wasNotifyStrippedByHandler(input, assistantMessage, toolUseId)) {
    logFeatureSad("cross_session_notify_idle", "subscribe_stripped_by_handler");
    return {
      model: SUBSCRIPTION_STRIPPED_NOTE,
      display: SUBSCRIPTION_STRIPPED_DISPLAY,
    };
  }
  return;
}
//@ chunk-astf3mhy.js:38697-39031 layout
/**
 * 说明为何也没有建立空闲订阅：非主对话、被权限处理器移除，或带消息时需消息送达后才订阅。
 */
function describeNoSubscription(refusedForPrincipal, input, assistantMessage, toolUseId) {
  if (refusedForPrincipal)
    return `
Nothing was subscribed either: ${NOTIFY_IDLE_MAIN_ONLY_ERROR}`;
  if (wasNotifyStrippedByHandler(input, assistantMessage, toolUseId))
    return `
Nothing was subscribed either: a permission handler removed notify_when_idle from this call.`;
  return wantsNotifyWhenIdle(input)
    ? `
Nothing was subscribed either (when a message rides along, the idle subscription is only made after that message is delivered).`
    : "";
}
//@ chunk-astf3mhy.js:39031-39170 fingerprint = findTeammateColor (1)
/**
 * 在 teamContext 中按名字找队友颜色。
 */
function findTeammateColor(appState, name) {
  let teammates = appState.teamContext?.teammates;
  if (!teammates) return;
  for (let teammate of Object.values(teammates))
    if ("name" in teammate && teammate.name === name) return teammate.color;
  return;
}
//@ chunk-astf3mhy.js:39170-39407 layout
/**
 * 确定 SendMessage 的发送者身份：队友用自己的 agentName；否则在名字注册表里找到代理 id 对应的名字并结合任务信息生成 {from, displayName}。
 */
function resolveSenderIdentity(deps, agentId) {
  let agentContext = deps.agentContext;
  if (agentContext?.agentType === "teammate" && agentContext.agentName)
    return {
      from: agentContext.agentName,
      displayName: agentContext.agentName,
    };
  let resolverState = deps.resolverState();
  let agentName;
  for (let [registeredName, registeredAgentId] of resolverState.agentNameRegistry)
    if (registeredAgentId === agentId) {
      agentName = registeredName;
      break;
    }
  return reportSenderIdentity(agentId, agentName, resolverState.tasks[agentId]);
}
//@ chunk-astf3mhy.js:39407-39547 layout
var CANNOT_RECEIVE_RESULT = {
  data: {
    success: false,
    message:
      "That agent cannot receive messages (it is a background observer, or its status could not be verified).",
  },
};
//@ chunk-astf3mhy.js:39547-39637 layout = isTeammateAgentContext (0.828)
/**
 * 消息发送者名字：有 agentId 时按代理解析，否则用当前代理名，teammate 用 "teammate"，否则 team-lead。
 */
function getMessageSenderName(toolUseContext) {
  if (toolUseContext.agentId) return resolveSenderIdentity(toolUseContext, toolUseContext.agentId).from;
  return getAgentName() || (isTeammate() ? "teammate" : TEAM_LEAD);
}
//@ chunk-astf3mhy.js:39637-42328 fingerprint = handleMessage (0.316)
/**
 * 把消息写入团队队友的邮箱：按名字/成员 id 解析团队成员（必要时读团队文件），写 mailbox 并返回 routing 信息；队友不存在时提示用 Agent({name}) 派生。
 */
async function handleMessage(recipientName, text, summary, deps, memberAgentId, memberIdentitySource) {
  let appState = deps.resolverState();
  let teamName = getTeamName(appState.teamContext);
  if (!teamName)
    return {
      data: {
        success: false,
        message: `No agent named '${recipientName}' is currently addressable. Spawn a new one or use the agent ID.`,
      },
      errorClass: "not_reachable",
    };
  let mailboxRecipientName = recipientName;
  if (recipientName !== TEAM_LEAD || memberAgentId !== undefined) {
    let teammates = appState.teamContext?.teammates ?? {};
    let teamMember =
      memberAgentId !== undefined &&
      memberIdentitySource === "team-context" &&
      Object.hasOwn(teammates, memberAgentId)
        ? teammates[memberAgentId]
        : undefined;
    let nameIsListed =
      memberAgentId === undefined &&
      Object.values(teammates).some((teammate) => teammate.name === recipientName);
    if (teamMember !== undefined) mailboxRecipientName = teamMember.name;
    else if (memberAgentId !== undefined && memberIdentitySource === "team-context")
      return {
        data: {
          success: false,
          message: `The member this message was resolved to has left team '${teamName}' \u2014 nothing was sent. Another member may share the same display name '${recipientName}', so a bare re-send could reach someone you did not choose: pick again explicitly with a fresh 'name [ref]', or message the lead.`,
        },
        errorClass: "not_reachable",
      };
    else if (!nameIsListed) {
      let teamFile = await readTeamFileAsync(teamName, deps.storageV5);
      if (teamFile !== null) {
        let membersForId =
          memberAgentId !== undefined
            ? addressableTeamMembers(teamFile, teamLeadAddress(deps.resolverState())).filter(
                (member) => member.agentId === memberAgentId,
              )
            : [];
        if (membersForId.length > 1)
          return {
            data: {
              success: false,
              message: `The team roster lists the member this message was resolved to more than once \u2014 nothing was sent. Ask the lead to repair team '${teamName}''s file.`,
            },
            errorClass: "not_reachable",
          };
        let member =
          memberAgentId !== undefined
            ? membersForId[0]
            : findSessionByName(
                addressableTeamMembers(teamFile, teamLeadAddress(deps.resolverState())),
                recipientName,
              );
        if (member === undefined) {
          if (memberAgentId !== undefined)
            return {
              data: {
                success: false,
                message: `The member this message was resolved to has left team '${teamName}' \u2014 nothing was sent. Another member may share the same display name '${recipientName}', so a bare re-send could reach someone you did not choose: pick again explicitly with a fresh 'name [ref]', or message the lead.`,
              },
              errorClass: "not_reachable",
            };
          return {
            data: {
              success: false,
              message:
                getAgentDepth(deps.agentContext) < getMaxSubagentSpawnDepth()
                  ? `No teammate named '${recipientName}' is currently on team '${teamName}'. Spawn one with ${AGENT}({name: '${recipientName}'}) \u2014 or message the lead to do so.`
                  : `No teammate named '${recipientName}' is currently on team '${teamName}'. Message the lead to spawn one.`,
            },
            errorClass: "not_reachable",
          };
        }
        mailboxRecipientName = member.name;
      } else if (memberAgentId !== undefined)
        return {
          data: {
            success: false,
            message: `Couldn't read the roster of team '${teamName}' to locate the member this message was resolved to \u2014 nothing was sent. Try again, or message the lead.`,
          },
          errorClass: "not_reachable",
        };
    }
  }
  let messageSenderName = getMessageSenderName(deps);
  let senderColor = getTeammateColor();
  let msgId = await writeToMailbox(
    mailboxRecipientName,
    {
      from: messageSenderName,
      text,
      summary,
      timestamp: new Date().toISOString(),
      color: senderColor,
      ...(deps.hookCaller !== undefined && {
        from_plugin: deps.hookCaller,
      }),
    },
    teamName,
    deps.storageV5,
  );
  if (msgId === undefined)
    return {
      data: {
        success: false,
        message: `Failed to write to ${recipientName}'s inbox \u2014 nothing was sent. Try again, or message the lead.`,
      },
      errorClass: "mailbox_write_failed",
    };
  wakeTeammateOnPlanApproval(deps.resolverState().tasks, mailboxRecipientName, teamName);
  let recipientColor = findTeammateColor(appState, mailboxRecipientName);
  return {
    data: {
      success: true,
      message: `Message sent to ${recipientName}'s inbox`,
      msg_id: msgId,
      routing: {
        sender: messageSenderName,
        senderColor,
        target: `@${recipientName}`,
        targetColor: recipientColor,
        summary,
        content: truncate(text, 50),
      },
    },
  };
}
//@ chunk-astf3mhy.js:42328-42851 layout
/**
 * 给运行中的进程内队友排队消息（写邮箱并唤醒）。
 */
async function queueToRunningTeammate(teammateTask, text, summary, deps, displayName, extraData) {
  let msgId = await writeToMailbox(
    teammateTask.identity.agentName,
    {
      from: getMessageSenderName(deps),
      text,
      summary,
      timestamp: new Date().toISOString(),
      color: getTeammateColor(),
      ...(deps.hookCaller !== undefined && {
        from_plugin: deps.hookCaller,
      }),
    },
    teammateTask.identity.teamName,
    deps.storageV5,
  );
  if (msgId === undefined)
    return {
      data: {
        success: false,
        message: `Teammate "${displayName}" is running, but writing to its inbox failed \u2014 nothing was queued. Try again.`,
      },
    };
  teammateTask.retryWake?.emit();
  return {
    data: {
      success: true,
      message: `Teammate "${displayName}" is already running; queued your message for its next turn.`,
      msg_id: msgId,
      ...extraData,
    },
  };
}
//@ chunk-astf3mhy.js:42851-43128 layout
/**
 * 判断停止的代理是队友还是子代理（任务表/转录元数据）。
 */
async function classifyStoppedAgentKind(agentId, deps) {
  if (resolveTeammateTask(agentId, deps.resolverState().tasks).status !== "not_found") return "teammate";
  let metadata = await readAgentMetadata(agentId, deps.storageV5).catch(() => "unreadable");
  if (metadata === "unreadable") return metadata;
  if (typeof metadata?.agentType !== "string") return "unknown";
  return metadata.taskKind === undefined ? "subagent" : "teammate";
}
//@ chunk-astf3mhy.js:43128-43290 layout
/**
 * 恢复已停止代理失败的分类（not_reachable/still_stopping/no_transcript/resume_failed）。
 */
function classifyResumeError(error) {
  if (error instanceof AgentStoppedByUserError) return "not_reachable";
  if (error instanceof AgentStillStoppingError) return "still_stopping";
  if (error instanceof ResumeAgentStateError) return "no_transcript";
  return "resume_failed";
}
//@ chunk-astf3mhy.js:43290-43328 layout
/**
 * 恢复 agent 时使用的短展示名（类 id 形式时截断）。
 */
function shortAgentDisplayName(name) {
  return normalizeAgentIdOrNull(name) ? truncateToLength(name, 7) : name;
}
//@ chunk-astf3mhy.js:43328-43832 layout
/**
 * 被消息唤醒的子代理完成后，把其报告作为 inlineHandback 交回调用方。
 */
function buildInlineHandback(displayName, report, context) {
  let unreadableLine = unreadableToolsLine(report.toolsUsed ?? [], context.messages);
  let content =
    unreadableLine === undefined ||
    report.content.length === 0 ||
    report.handback !== undefined ||
    context.innerCall === true ||
    !isHandbackProvenanceEnabled()
      ? report.content
      : [
          {
            type: "text",
            text: `${unreadableLine}
`,
          },
          ...report.content,
        ];
  return {
    message: RESUMED_NO_REPORT,
    inlineHandback: {
      displayName: shortAgentDisplayName(displayName),
      content,
      harnessNoteCount:
        content === report.content ? report.harnessNoteCount : (report.harnessNoteCount ?? 0) + 1,
      harnessTailCount: report.harnessTailCount,
      harnessSectionHash: content === report.content ? report.harnessSectionHash : hashTextSections(content),
      ...(isSillyShoreGateOn() &&
        report.toolsUsed !== undefined &&
        report.toolsUsed.length > 0 && {
          toolsUsed: report.toolsUsed,
        }),
    },
  };
}
//@ chunk-astf3mhy.js:43832-44385 fingerprint = handleShutdownRequest (0.722)
/**
 * 向队友发送 shutdown_request（写邮箱，返回 request_id）。
 */
async function handleShutdownRequest(recipientName, agentName, reason, toolUseContext) {
  let appState = toolUseContext.resolverState();
  let teamName = getTeamName(appState.teamContext);
  let senderName = getMessageSenderName(toolUseContext);
  let requestId = timestampedAgentAddress("shutdown", agentName);
  let shutdownMessage = createShutdownRequestMessage({
    requestId,
    from: senderName,
    reason,
  });
  if (
    (await writeToMailbox(
      recipientName,
      {
        from: senderName,
        text: jsonStringify(shutdownMessage),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      },
      teamName,
      toolUseContext.storageV5,
    )) === undefined
  )
    return {
      data: {
        success: false,
        message: `Failed to write the shutdown request to ${agentName}'s inbox \u2014 nothing was sent.`,
        request_id: requestId,
        target: agentName,
      },
    };
  if (teamName) wakeTeammateOnPlanApproval(toolUseContext.resolverState().tasks, recipientName, teamName);
  if (toolUseContext.hookCaller === undefined) rememberRepair(requestId, recipientName);
  return {
    data: {
      success: true,
      message: `Shutdown request sent to ${agentName}. Request ID: ${requestId}`,
      request_id: requestId,
      target: agentName,
    },
  };
}
//@ chunk-astf3mhy.js:44385-46236 fingerprint = handleShutdownApproval (0.793)
/**
 * 队友批准关机：向 team-lead 写确认，进程内队友中止自己的循环，pane 队友结束进程。只有队友身份能调用。
 */
async function handleShutdownApproval(requestId, context) {
  if (context.teammateContext === undefined && !getDynamicTeamContext())
    throw new SendMessagePreconditionError(
      "Only a teammate can approve a shutdown request, and this session is not running as one. Nothing was sent. To shut down a teammate, send that teammate a shutdown_request message. The teammate is the one that approves it.",
    );
  let teamName = getTeamName();
  let agentId = getAgentId();
  let agentName = getAgentName() || "teammate";
  logForDebugging(
    `[SendMessageTool] handleShutdownApproval: teamName=${teamName}, agentId=${agentId}, agentName=${agentName}`,
  );
  let ownPaneId;
  let ownBackendType;
  if (teamName) {
    let teamFile = await readTeamFileAsync(teamName, context.storageV5);
    if (teamFile && agentId) {
      let selfMember = teamFile.members.find((m) => m.agentId === agentId);
      if (selfMember) {
        ownPaneId = selfMember.tmuxPaneId;
        ownBackendType = selfMember.backendType;
      }
    }
  }
  let approvedMessage = createShutdownApprovedMessage({
    requestId,
    from: agentName,
    paneId: ownPaneId,
    backendType: ownBackendType,
  });
  let msgId = await writeToMailbox(
    TEAM_LEAD,
    {
      from: agentName,
      text: jsonStringify(approvedMessage),
      timestamp: new Date().toISOString(),
      color: getTeammateColor(),
    },
    teamName,
    context.storageV5,
  );
  let confirmNote =
    msgId === undefined
      ? "The confirmation could not be written to team-lead's inbox."
      : "Sent confirmation to team-lead.";
  let degradedExtra =
    msgId === undefined
      ? {
          degradedClass: "mailbox_write_failed",
        }
      : undefined;
  if (context.teammateContext !== undefined) {
    logForDebugging(
      `[SendMessageTool] In-process teammate ${agentName} approving shutdown - aborting its own loop`,
    );
    context.teammateContext.abortController.abort();
  } else if (ownBackendType === "in-process") {
    logForDebugging(
      `[SendMessageTool] In-process teammate ${agentName} approving shutdown - signaling abort`,
    );
    if (agentId) {
      let appState = context.resolverState();
      let task = findTeammateTaskByAgentId(agentId, appState.tasks);
      if (task?.abortController) {
        task.abortController.abort();
        logForDebugging(`[SendMessageTool] Aborted controller for in-process teammate ${agentName}`);
      } else
        logForDebugging(`[SendMessageTool] Warning: Could not find task/abortController for ${agentName}`);
    }
  } else {
    if (agentId) {
      let appState = context.resolverState();
      let task = findTeammateTaskByAgentId(agentId, appState.tasks);
      if (task?.abortController) {
        logForDebugging(
          `[SendMessageTool] Fallback: Found in-process task for ${agentName} via AppState, aborting`,
        );
        task.abortController.abort();
        return {
          data: {
            success: true,
            message: `Shutdown approved (fallback path). Agent ${agentName} is now exiting.`,
            request_id: requestId,
          },
          ...degradedExtra,
        };
      }
    }
    setImmediate(async () => {
      await gracefulShutdown(0, "other");
    });
  }
  return {
    data: {
      success: true,
      message: `Shutdown approved. ${confirmNote} Agent ${agentName} is now exiting.`,
      request_id: requestId,
    },
    ...degradedExtra,
  };
}
//@ chunk-astf3mhy.js:46236-46688 fingerprint = handleShutdownRejection (0.883)
/**
 * 队友拒绝关机：向 team-lead 写拒绝消息（必须带 reason）。
 */
async function handleShutdownRejection(requestId, reason, deps) {
  let teamName = getTeamName();
  let agentName = getAgentName() || "teammate";
  let rejectedMessage = createShutdownRejectedMessage({
    requestId,
    from: agentName,
    reason,
  });
  if (
    (await writeToMailbox(
      TEAM_LEAD,
      {
        from: agentName,
        text: jsonStringify(rejectedMessage),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      },
      teamName,
      deps.storageV5,
    )) === undefined
  )
    return {
      data: {
        success: false,
        message:
          "Failed to write the shutdown rejection to team-lead's inbox \u2014 nothing was sent. Try again.",
        request_id: requestId,
      },
    };
  return {
    data: {
      success: true,
      message: `Shutdown rejected. Reason: "${truncate(reason, 50)}". Continuing to work.`,
      request_id: requestId,
    },
  };
}
//@ chunk-astf3mhy.js:46688-46777 layout
/**
 * SendMessagePreconditionError：调用身份不满足（如非队友批准关机）。
 */
class SendMessagePreconditionError extends Error {
  constructor(message) {
    super(message);
    this.name = "SendMessagePreconditionError";
  }
}
//@ chunk-astf3mhy.js:46777-47639 fingerprint = handlePlanApproval (0.652)
/**
 * team-lead 批准队友的计划（plan_approval_response approve=true），写入队友邮箱。
 */
async function handlePlanApproval(recipientName, agentName, requestId, feedback, deps) {
  let appState = deps.resolverState();
  let teamName = appState.teamContext?.teamName;
  if (!isTeamLead(appState.teamContext))
    throw new SendMessagePreconditionError(
      "Only the team lead can approve plans. Teammates cannot approve their own or other plans.",
    );
  let permissionState = deps.permissions();
  let permissionMode = teammateModeAfterPlan({
    recipientName,
    leaderMode: permissionState.mode,
    leaderAutoPickedByLevel: hasLeftProactivityBaseline(permissionState),
    proactivityLevel: deps.proactivitySetting(),
    tasks: appState.tasks,
  });
  let approvalResponse = {
    type: "plan_approval_response",
    requestId,
    approved: true,
    ...(feedback !== undefined && {
      feedback,
    }),
    timestamp: new Date().toISOString(),
    permissionMode,
  };
  if (
    (await writeToMailbox(
      recipientName,
      {
        from: TEAM_LEAD,
        text: jsonStringify(approvalResponse),
        timestamp: new Date().toISOString(),
      },
      teamName,
      deps.storageV5,
    )) === undefined
  )
    return {
      data: {
        success: false,
        message: `Failed to write the plan approval to ${agentName}'s inbox \u2014 nothing was sent. Try again.`,
        request_id: requestId,
      },
    };
  return {
    data: {
      success: true,
      message: `Plan approved for ${agentName}. They will receive the approval and can proceed with implementation.`,
      request_id: requestId,
    },
  };
}
//@ chunk-astf3mhy.js:47639-48281 fingerprint = handlePlanRejection (0.827)
/**
 * team-lead 拒绝队友的计划并附反馈。
 */
async function handlePlanRejection(recipientName, agentName, requestId, feedback, deps) {
  let appState = deps.resolverState();
  let teamName = appState.teamContext?.teamName;
  if (!isTeamLead(appState.teamContext))
    throw new SendMessagePreconditionError(
      "Only the team lead can reject plans. Teammates cannot reject their own or other plans.",
    );
  let rejectionResponse = {
    type: "plan_approval_response",
    requestId,
    approved: false,
    feedback,
    timestamp: new Date().toISOString(),
  };
  if (
    (await writeToMailbox(
      recipientName,
      {
        from: TEAM_LEAD,
        text: jsonStringify(rejectionResponse),
        timestamp: new Date().toISOString(),
      },
      teamName,
      deps.storageV5,
    )) === undefined
  )
    return {
      data: {
        success: false,
        message: `Failed to write the plan rejection to ${agentName}'s inbox \u2014 nothing was sent. Try again.`,
        request_id: requestId,
      },
    };
  return {
    data: {
      success: true,
      message: `Plan rejected for ${agentName} with feedback: "${truncate(feedback, 50)}"`,
      request_id: requestId,
    },
  };
}
//@ chunk-astf3mhy.js:48281-48513 layout
var CROSS_MACHINE_RESIDENCY_ERROR =
  "Cross-machine messaging is unavailable: it sends the message through Anthropic servers, which is not allowed on a third-party provider or with nonessential traffic disabled. Messages to sessions on this machine still work.";
//@ chunk-astf3mhy.js:48513-48700 layout
/**
 * 跨机器消息不可用的原因文本（第三方 provider / 禁用非必要流量等）。
 */
function getCrossMachineUnavailableMessage(via) {
  let remoteSendBlock = getRemoteSendBlock(via);
  if (remoteSendBlock === null) return null;
  return remoteSendBlock.cause === "residency"
    ? CROSS_MACHINE_RESIDENCY_ERROR
    : `Cross-machine messaging is unavailable: ${remoteSendBlock.reason} Messages to sessions on this machine still work.`;
}
//@ chunk-astf3mhy.js:48700-48841 layout
/**
 * 本会话没有回信地址的原因（Remote Control 未连接 / 容器无地址）。
 */
function getReplyAddressProblem() {
  if (getPeerBridgeIdentity()?.live) return;
  if (env.CLAUDE_CODE_REMOTE === true)
    return ownRemoteSessionId() === undefined ? "no-container-address" : undefined;
  return "rc-disconnected";
}
//@ chunk-astf3mhy.js:48841-48955 layout
function describeReplyAddressProblem(problem) {
  return problem === "rc-disconnected"
    ? "Remote Control is not connected"
    : "this session has no reply address";
}
//@ chunk-astf3mhy.js:48955-49141 layout
function unnamedSessionNote(hasSessionName) {
  return env.CLAUDE_CODE_REMOTE === true && !hasSessionName && ownRemoteSessionId() !== undefined
    ? "; note: this session has no name yet, so the receiver can answer only by the address on the message, not by name"
    : "";
}
//@ chunk-astf3mhy.js:49141-49189 layout
/**
 * tengu_deep_feather：coerceInput 是否拆分字符串化的 JSON 输入。
 */
function isDeepFeatherSplitEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_deep_feather", true);
}
//@ chunk-astf3mhy.js:49189-49237 layout
/**
 * 读取 tengu_jaunty_ember 开关。
 */
function isJauntyEmberEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jaunty_ember", false);
}
//@ chunk-astf3mhy.js:49237-49361 layout
function getQueueBusyCheck(deps) {
  return deps.agentId === undefined && deps.agentContext?.agentType === "main"
    ? createQueueBusyCheck(deps.messageQueue, deps.messages, deps.signal)
    : undefined;
}
//@ chunk-astf3mhy.js:49361-49596 layout
/**
 * CLAUDE_CODE_FORWARD_USER_INTENT 且 tengu_jaunty_ember 时，把主线程用户意图附件转发给被消息恢复的代理。
 */
function getFreshTurnsForAgent(deps, agentId) {
  let queueBusyCheck = getQueueBusyCheck(deps);
  if (queueBusyCheck === undefined || !forwardUserIntentEnv() || !isJauntyEmberEnabled()) return;
  let liveMessages;
  try {
    liveMessages = queueBusyCheck();
  } catch (error) {
    logError(error);
    logFeatureSad("agent_intent_forward", "live_check_failed");
  }
  return freshTurnsForAgent(
    {
      agentId,
      deliveringLoop: deps.agentId,
    },
    liveMessages ?? deps.messages(),
    liveMessages === undefined ? "snapshot" : "live",
  );
}
//@ chunk-astf3mhy.js:49596-50715 layout
/**
 * 把工具依赖（session/storage/agentId/taskRegistry/tools…）与本次调用（toolUseId/permissionPhase/signal）合成 getter 视图。
 */
function makeSendMessageDeps(deps, toolCall) {
  return {
    get session() {
      return deps.session;
    },
    get storageV5() {
      return deps.storageV5;
    },
    get credentials() {
      return deps.credentials;
    },
    get agentId() {
      return deps.agentId;
    },
    get agentContext() {
      return deps.agentContext;
    },
    get teammateContext() {
      return deps.teammateContext;
    },
    get agentLifecycle() {
      return deps.agentLifecycle;
    },
    get taskRegistry() {
      return deps.taskRegistry;
    },
    get toolState() {
      return deps.toolState;
    },
    get tools() {
      return deps.tools;
    },
    get mcpClients() {
      return deps.mcpClients;
    },
    get toolAliases() {
      return deps.toolAliases;
    },
    get messages() {
      return deps.messages;
    },
    get messageQueue() {
      return deps.messageQueue;
    },
    get resolverState() {
      return deps.resolverState;
    },
    get setSendMessagePins() {
      return deps.setSendMessagePins;
    },
    get proactivitySetting() {
      return deps.proactivitySetting;
    },
    get permissions() {
      return deps.permissions;
    },
    get hookOrigin() {
      return deps.hookOrigin;
    },
    get hookCaller() {
      return deps.hookCaller;
    },
    get hookServesModel() {
      return deps.hookServesModel;
    },
    get pluginUnnamed() {
      return deps.pluginUnnamed;
    },
    get innerCall() {
      return deps.innerCall;
    },
    get toolUseId() {
      return toolCall.toolUseId;
    },
    get permissionPhase() {
      return toolCall.permissionPhase;
    },
    get permissionRound() {
      return toolCall.permissionRound;
    },
    get signal() {
      return toolCall.signal;
    },
  };
}
//@ chunk-astf3mhy.js:50715-50923 layout
/**
 * 取出 deliver 需要的 parentMessage/ask/runEngine，缺失时抛错。
 */
function requireDispatchExecutor(toolCall) {
  let { parentMessage, ask, runEngine } = toolCall;
  if (!parentMessage || !ask || !runEngine)
    throw Error("SendMessage: dispatch needs the executor (the issuing message and canUseTool)");
  return {
    assistantMessage: parentMessage,
    ask,
    runEngine,
  };
}
//@ chunk-astf3mhy.js:50923-51000 layout
/**
 * 删除 backfillObservableInput 加入的观测字段。
 */
function stripObservableFields(input) {
  let removed = false;
  for (let fieldName of OBSERVABLE_INPUT_FIELDS)
    if (fieldName in input) {
      delete input[fieldName];
      removed = true;
    }
  return removed;
}
//@ chunk-astf3mhy.js:51000-51130 layout
/**
 * 收件人类别：会话地址 / main / agentId / 名字。
 */
function classifyRecipientKind(recipient) {
  if (parseAddress(recipient).scheme !== "other" || LOCAL_TASK_ID_PATTERN.test(recipient)) return "session";
  if (recipient === MAIN) return "main";
  if (isAddressableSlug(recipient)) return "agent";
  return "name";
}
//@ chunk-astf3mhy.js:51130-95535 callgraph-witnessed = SendMessageTool (0.177)
/**
 * SendMessage 工具定义（shouldDefer，maxResultSizeChars 100000）：输入 schema 随策略/跨会话/agent swarms 开关变化；validateInput 拒绝广播 "*"、协议帧、带 @ 的收件人、空消息与不合法的结构化消息；checkPermissions 处理跨机器隔离（isolatePeerMachines）与 bridge 授权，auto 模式交分类器；call 先跑插件 message 钩子再 deliver，按解析出的收件人类型路由到主会话、活动/停止/被驱逐的子代理（恢复）、本机会话（UDS）、云端会话（bridge）、队友邮箱或结构化协议处理。
 */
var SendMessageTool; // deferred: uses buildTool (../../services/tools/permissionCheckGuard.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-astf3mhy.js:51130", () => {
  SendMessageTool = buildTool({
    name: SENDMESSAGE,
    searchHint: "send messages to agent teammates",
    backgrounding: "never",
    maxResultSizeChars: 1e5,
    userFacingName() {
      return "SendMessage";
    },
    get inputSchema() {
      return getSendMessageInputSchema();
    },
    coerceInput: (input) =>
      normalizeSendMessageInput(input, {
        applySplit: isDeepFeatherSplitEnabled(),
      }),
    shouldDefer: true,
    isReadOnly(input) {
      return typeof input.message === "string";
    },
    backfillObservableInput(input) {
      if (!hasSendMessageShape(input)) return;
      if (typeof input.to !== "string") return stripObservableFields(input);
      if (splitRepairedMessage(input) !== undefined) return;
      stripObservableFields(input);
      let message = input.message ?? "";
      if (typeof message === "string") {
        input.type = "message";
        input.recipient = input.to;
        input.recipient_kind = classifyRecipientKind(input.to);
        input.content = truncate(message, 50);
      } else if (typeof input.message === "object" && input.message !== null) {
        let msg = input.message;
        if (typeof msg.type === "string") input.type = msg.type;
        input.recipient = input.to;
        input.recipient_kind = classifyRecipientKind(input.to);
        if (typeof msg.request_id === "string") input.request_id = msg.request_id;
        let approveValue = coerceBooleanString(msg.approve);
        if (typeof approveValue === "boolean") input.approve = approveValue;
        let content = msg.reason ?? msg.feedback;
        if (typeof content === "string") input.content = truncate(content, 50);
      }
      return true;
    },
    suppressesAlwaysAllowRule(input) {
      return false;
    },
    toAutoClassifierInput(input) {
      let formatField = (fieldName, fieldValue) => (fieldValue ? ` [${fieldName}: ${fieldValue}]` : "");
      let unusedFlag = false;
      let identity = (value) => value;
      let normalized = normalizeSendMessageInput(input);
      let input_2 = normalized !== null && isPlainObject(normalized.input) ? normalized.input : undefined;
      let summary =
        input_2 === undefined
          ? input.summary
          : typeof input_2.summary === "string"
            ? input_2.summary
            : undefined;
      let summarySuffix = formatField("summary", typeof summary === "string" ? identity(summary) : undefined);
      let summaryText =
        (input_2 !== undefined && typeof input_2.message === "string" ? input_2.message : undefined) ??
        input.message ??
        "";
      let messageText = typeof summaryText === "string" ? identity(summaryText) : summaryText;
      if (typeof messageText === "string") {
        if (wantsNotifyWhenIdle(input))
          return messageText.trim().length === 0
            ? `notify when idle: ${input.to}${summarySuffix}`
            : `to ${input.to}: ${messageText}${summarySuffix} [notify when idle]`;
        return `to ${input.to}: ${messageText}${summarySuffix}`;
      }
      switch (messageText.type) {
        case "shutdown_request":
          return `shutdown_request to ${input.to}${formatField("reason", messageText.reason)}${summarySuffix}`;
        case "shutdown_response":
          return `shutdown_response ${messageText.approve ? "approve" : "reject"} ${messageText.request_id} to ${input.to}${formatField("reason", messageText.reason)}${summarySuffix}`;
        case "plan_approval_response":
          return `plan_approval ${messageText.approve ? "approve" : "reject"} ${messageText.request_id} to ${input.to}${formatField("feedback", messageText.feedback)}${summarySuffix}`;
      }
    },
    async description() {
      return DESCRIPTION;
    },
    async prompt() {
      return getSendMessagePrompt(isAgentSwarmsEnabled(), isMessagingLimitedToOwnAgents());
    },
    mapToolResultToToolResultBlockParam(result, toolUseId) {
      let output = result;
      if (typeof output !== "object" || output === null || Array.isArray(output))
        throw TypeError("SendMessage output is not an object");
      let { display, revivedAgentId, inlineHandback, ...rest } = {
        display: undefined,
        revivedAgentId: undefined,
        inlineHandback: undefined,
        ...result,
      };
      let successMessage = (message) =>
        jsonStringify({
          success: true,
          message,
        });
      if (inlineHandback) {
        if (isHandbackProvenanceEnabled()) {
          let handbackResultContent = buildHandbackResultContent(
            inlineHandback.content,
            inlineHandback.harnessNoteCount,
            inlineHandback.harnessTailCount,
            inlineHandback.harnessSectionHash,
          );
          return {
            tool_use_id: toolUseId,
            type: "tool_result",
            content: [
              {
                type: "text",
                text: `${successMessage(RESUMED_REPORT_FOLLOWS)}
${handbackResultContent[0].text}`,
              },
            ],
          };
        }
        return {
          tool_use_id: toolUseId,
          type: "tool_result",
          content: [
            {
              type: "text",
              text: jsonStringify({
                ...rest,
                message: formatResumedAgentResult(inlineHandback),
              }),
            },
          ],
        };
      }
      return {
        tool_use_id: toolUseId,
        type: "tool_result",
        content: [
          {
            type: "text",
            text: jsonStringify(rest),
          },
        ],
      };
    },
    create(toolDeps) {
      let handlers = {
        async checkPermissions(input, toolCall) {
          let deps = makeSendMessageDeps(toolDeps, toolCall);
          let hostRefusal = checkHostSendTarget({
            to: input.to,
            message: input.message,
          });
          if (hostRefusal !== undefined)
            return {
              behavior: "deny",
              message: hostRefusal,
              decisionReason: {
                type: "other",
                reason: SAME_SESSION_ONLY_REASON,
              },
            };
          if (hasIsolatePeerMachines() && !isLocalSessionAddress(input.to)) {
            let address = parseAddress(input.to);
            let scheme = address.scheme;
            if (scheme === "bridge") {
              let unreachableRefusal = unreachableElevatedRefusal(deps.session, address.target, input.to);
              if (unreachableRefusal) {
                if (!hasMintedReentry(deps))
                  logSendDelivery({
                    route: "bridge",
                    startedAt: Date.now(),
                    errorClass: "bridge_auth",
                    via: "address",
                  });
                return {
                  behavior: "deny",
                  message: stripNonPrintable(unreachableRefusal),
                  decisionReason: {
                    type: "other",
                    reason: ELEVATED_UNREACHABLE_REASON,
                  },
                };
              }
              let receiveRefusal = cannotReceiveRefusal(deps.session, address.target, input.to);
              if (receiveRefusal) {
                if (!hasMintedReentry(deps))
                  logSendDelivery({
                    route: "bridge",
                    startedAt: Date.now(),
                    errorClass: "recipient_gate_off",
                    via: "address",
                  });
                return {
                  behavior: "deny",
                  message: stripNonPrintable(receiveRefusal),
                  decisionReason: {
                    type: "other",
                    reason: RECIPIENT_CANNOT_RECEIVE_REASON,
                  },
                };
              }
              return {
                behavior: "ask",
                message: stripNonPrintable(
                  `Send a message to Remote Control session ${input.to}? It reaches the receiving Claude (possibly another machine) via Anthropic's servers as a cross-session message \u2014 marked as from another Claude session, not from its user.`,
                ),
                decisionReason: {
                  type: "safetyCheck",
                  reason:
                    "isolatePeerMachines is enabled \u2014 cross-machine message requires explicit approval",
                  classifierApprovable: false,
                  circuitBreaker: "isolatePeerMachines",
                },
              };
            }
            if (scheme === "other") {
              let resolved;
              try {
                let contents = hasMintedReentry(deps)
                  ? getDispatchNoteForInput(deps, input, getToField)
                  : undefined;
                resolved = isRecordWithKind(contents)
                  ? contents
                  : await resolveCrossSessionAddress(
                      deps.session,
                      input.to,
                      input.message,
                      deps.resolverState(),
                      deps.storageV5,
                      deps.credentials,
                    );
              } catch (error) {
                logForDebugging(
                  `[SendMessage] permission-phase resolve failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 asking`,
                  {
                    level: "warn",
                  },
                );
                return {
                  behavior: "ask",
                  message: stripNonPrintable(
                    `Send a message to '${input.to}'? Its destination could not be resolved just now, so it is unknown whether this name is a Claude session on another machine (isolatePeerMachines is enabled).`,
                  ),
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "isolatePeerMachines is enabled \u2014 cross-machine message requires explicit approval",
                    classifierApprovable: false,
                    circuitBreaker: "isolatePeerMachines",
                  },
                };
              }
              if (resolved.kind === "cloud-session") {
                if (isOwnBridgeSession(resolved.sessionId))
                  return {
                    behavior: "deny",
                    message: stripNonPrintable(
                      selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                    ),
                    decisionReason: {
                      type: "other",
                      reason: SELF_TARGET_REASON,
                    },
                  };
                let {
                  isRemoteControlPeerUnreachableFromHere,
                  formatUnreachableElevatedRefusal,
                } = require("../../bridge/trustedDevice.js");
                if (resolved.via === "remote-control" && isRemoteControlPeerUnreachableFromHere()) {
                  if (!hasMintedReentry(deps))
                    logSendDelivery({
                      route: "bridge",
                      startedAt: Date.now(),
                      errorClass: "bridge_auth",
                      via: "remote_control_name",
                    });
                  return {
                    behavior: "deny",
                    message: stripNonPrintable(formatUnreachableElevatedRefusal(resolved.displayName)),
                    decisionReason: {
                      type: "other",
                      reason: ELEVATED_UNREACHABLE_REASON,
                    },
                  };
                }
                let receiveRefusal = cannotReceiveRefusal(
                  deps.session,
                  resolved.sessionId,
                  resolved.displayName,
                );
                if (receiveRefusal) {
                  if (!hasMintedReentry(deps))
                    logSendDelivery({
                      route: "bridge",
                      startedAt: Date.now(),
                      errorClass: "recipient_gate_off",
                      via: resolved.via === "cloud" ? "cloud_name" : "remote_control_name",
                    });
                  return {
                    behavior: "deny",
                    message: stripNonPrintable(receiveRefusal),
                    decisionReason: {
                      type: "other",
                      reason: RECIPIENT_CANNOT_RECEIVE_REASON,
                    },
                  };
                }
                setPendingPermissionNote(deps, input, resolved, SENDMESSAGE);
                return {
                  behavior: "ask",
                  message: stripNonPrintable(
                    resolved.via === "cloud"
                      ? `Send a message to cloud session '${resolved.displayName}'? It reaches the receiving Claude (running in the cloud) via Anthropic's servers as a cross-session message \u2014 marked as from another Claude session, not from its user.`
                      : `Send a message to Remote Control session '${resolved.displayName}'? It reaches the receiving Claude (on another machine) via Anthropic's servers as a cross-session message \u2014 marked as from another Claude session, not from its user.`,
                  ),
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "isolatePeerMachines is enabled \u2014 cross-machine message requires explicit approval",
                    classifierApprovable: false,
                    circuitBreaker: "isolatePeerMachines",
                  },
                };
              }
              if (
                resolved.kind === "not-found" &&
                (resolved.cloudUnavailable !== undefined || resolved.bridgeUnavailable !== undefined)
              ) {
                let joined = [
                  resolved.cloudUnavailable !== undefined
                    ? "the cloud session list could not be fetched"
                    : undefined,
                  resolved.bridgeUnavailable !== undefined
                    ? "the account session list could not be checked"
                    : undefined,
                ]
                  .filter((unavailableText) => unavailableText !== undefined)
                  .join(" and ");
                return {
                  behavior: "ask",
                  message: stripNonPrintable(
                    `Send a message to '${input.to}'? Just now ${joined}, so it is unknown whether this name is a Claude session on another machine (isolatePeerMachines is enabled).`,
                  ),
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "isolatePeerMachines is enabled \u2014 cross-machine message requires explicit approval",
                    classifierApprovable: false,
                    circuitBreaker: "isolatePeerMachines",
                  },
                };
              }
              setPendingPermissionNote(deps, input, resolved, SENDMESSAGE);
            }
          }
          if (isAutoClassifierActive(deps.permissions().mode))
            return {
              behavior: "passthrough",
              message: "Message to another agent requires classifier review.",
            };
          return {
            behavior: "allow",
            updatedInput: input,
          };
        },
        async validateInput(input, toolCall) {
          let deps = makeSendMessageDeps(toolDeps, toolCall);
          let hostRefusal = checkHostSendTarget({
            to: input.to,
            message: input.message,
          });
          if (hostRefusal !== undefined) {
            logSendDelivery({
              route: "unresolved",
              startedAt: Date.now(),
              degradedClass: "own_agents_only",
            });
            return {
              result: false,
              message: hostRefusal,
              errorCode: 9,
            };
          }
          if (input.to === "*")
            return {
              result: false,
              message: 'broadcast (to: "*") is no longer supported \u2014 send a message per recipient',
              errorCode: 9,
            };
          {
            let scheme = parseAddress(input.to).scheme;
            if ((scheme === "uds" || scheme === "bridge" || false) && !isCrossSessionMessagingEnabled())
              return {
                result: false,
                message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
                errorCode: 9,
              };
          }
          if (wantsNotifyWhenIdle(input)) {
            if (typeof input.message !== "string")
              return {
                result: false,
                message:
                  "notify_when_idle cannot ride a structured message \u2014 send plain text, or omit the message for a pure subscription",
                errorCode: 9,
              };
            if (
              getNotifyIdleEligibility(input, deps).refusedForPrincipal &&
              input.message.trim().length === 0
            )
              return {
                result: false,
                message: NOTIFY_IDLE_MAIN_ONLY_ERROR,
                errorCode: 9,
              };
            let scheme = parseAddress(input.to).scheme;
            if (scheme === "bridge" || scheme === "did")
              return {
                result: false,
                message: NOTIFY_IDLE_SCOPE_ERROR,
                errorCode: 9,
              };
          }
          let peerAddress = parsePeerAddress(input.to, LISTAGENTS);
          if (peerAddress !== undefined)
            return {
              result: false,
              message: peerAddress,
              errorCode: 9,
            };
          {
            let address = parseAddress(input.to);
            if (address.scheme === "uds" && mayBeOwnSocket(address.target))
              return {
                result: false,
                message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                errorCode: 9,
              };
          }
          if (input.to.includes("@"))
            return {
              result: false,
              message: "to must be a bare teammate name \u2014 there is only one team per session",
              errorCode: 9,
            };
          if (
            typeof input.message === "string" &&
            input.message.trim().length === 0 &&
            !wantsNotifyWhenIdle(input)
          )
            return {
              result: false,
              message: EMPTY_MESSAGE_ERROR,
              errorCode: 9,
            };
          if (parseAddress(input.to).scheme === "bridge") {
            if (isOwnBridgeSession(parseAddress(input.to).target))
              return {
                result: false,
                message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                errorCode: 9,
              };
            if (typeof input.message !== "string")
              return {
                result: false,
                message: "structured messages cannot be sent cross-session \u2014 only plain text",
                errorCode: 9,
              };
            return {
              result: true,
            };
          }
          if (parseAddress(input.to).scheme === "uds" && typeof input.message === "string")
            return {
              result: true,
            };
          if (typeof input.message === "string") {
            if (isStructuredProtocolMessage(input.message))
              return {
                result: false,
                message: isMessagingLimitedToOwnAgents()
                  ? "message text must not be a teammate protocol frame (permission/mode/plan/shutdown JSON): send plain text"
                  : 'message text must not be a teammate protocol frame (permission/mode/plan/shutdown JSON) \u2014 to respond to a plan or shutdown request, use the structured object form ({"message": {"type": ...}}); otherwise send plain text',
                errorCode: 9,
              };
            try {
              let parsed = jsonParse(input.message);
              if (
                parsed !== null &&
                typeof parsed === "object" &&
                "type" in parsed &&
                typeof parsed.type === "string" &&
                [
                  "idle_notification",
                  "teammate_terminated",
                  "task_assignment",
                  "task_completed",
                  "shutdown_rejected",
                ].includes(parsed.type)
              )
                return {
                  result: false,
                  message:
                    "message text must not be a teammate lifecycle/task frame (idle/terminated/task/shutdown JSON) \u2014 send plain text instead",
                  errorCode: 9,
                };
            } catch {}
            return {
              result: true,
            };
          }
          if (!isAgentSwarmsEnabled())
            return {
              result: false,
              message: "Structured team-protocol messages are only available with agent teams enabled.",
              errorCode: 9,
            };
          if (parseAddress(input.to).scheme !== "other")
            return {
              result: false,
              message: "structured messages cannot be sent cross-session \u2014 only plain text",
              errorCode: 9,
            };
          if (input.message.type === "shutdown_response" && input.to !== TEAM_LEAD)
            return {
              result: false,
              message: `shutdown_response must be sent to "${TEAM_LEAD}"`,
              errorCode: 9,
            };
          if (
            input.message.type === "shutdown_response" &&
            input.message.approve &&
            input.message.reason !== undefined
          )
            return {
              result: false,
              message:
                "reason is only delivered on rejections (approve: false) \u2014 approvals are sent as a silent confirmation with no reason text; omit reason or reject instead",
              errorCode: 9,
            };
          if (
            input.message.type === "shutdown_response" &&
            !input.message.approve &&
            (!input.message.reason || input.message.reason.trim().length === 0)
          )
            return {
              result: false,
              message: "reason is required when rejecting a shutdown request",
              errorCode: 9,
            };
          return {
            result: true,
          };
        },
        async deliver(input, toolCall) {
          let deps = makeSendMessageDeps(toolDeps, toolCall);
          let agentId = deps.agentId;
          if (agentId !== undefined && isAgentStopPending(agentId)) {
            logFeatureBad("subagent_launch", "send_message_spawner_stop_pending");
            throw Error(
              "This agent has been stopped and its stop is still completing; it cannot send messages.",
            );
          }
          let { assistantMessage, ask, runEngine } = requireDispatchExecutor(toolCall);
          let startedAt = Date.now();
          function emitRouteTelemetry(route, errorClass, extraTelemetry) {
            logSendDelivery({
              route,
              startedAt,
              errorClass,
              ...(agentId !== undefined && {
                fromSubagent: true,
              }),
              ...extraTelemetry,
            });
          }
          let hostRefusal = checkHostSendTarget({
            to: input.to,
            message: input.message,
          });
          if (hostRefusal !== undefined) {
            emitRouteTelemetry("unresolved", undefined, {
              degradedClass: "own_agents_only",
            });
            return {
              data: {
                success: false,
                message: hostRefusal,
              },
            };
          }
          if (agentId !== undefined && !canSubagentSend(agentId)) {
            emitRouteTelemetry("unresolved", undefined, {
              degradedClass: "own_agents_only",
            });
            return {
              data: {
                success: false,
                message: SEND_MESSAGE_SWITCHED_OFF,
              },
            };
          }
          let modeClassValue = isModeEmitFlagOn() ? modeClass(deps.permissions()) : undefined;
          if (agentId !== undefined && isObserverTask(deps.session, agentId)) {
            emitRouteTelemetry("unresolved", "not_reachable");
            return {
              data: {
                success: false,
                message:
                  "Observers report via ObserverReport, not SendMessage. SendMessage is not available from an observer.",
              },
            };
          }
          if (isLocalSessionAddress(input.to)) {
            if (!isCrossSessionMessagingEnabled()) {
              emitRouteTelemetry("desktop_host", "not_reachable");
              return {
                data: {
                  success: false,
                  message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
                },
              };
            }
            let notify = false;
            notify = wantsNotifyWhenIdle(input);
            if (typeof input.message !== "string") {
              emitRouteTelemetry("desktop_host", "invalid_target");
              return {
                data: {
                  success: false,
                  message: `Not sent: a Claude Desktop session takes a plain-text message, not a structured ${input.message.type}.`,
                },
              };
            }
            if (input.message.trim().length === 0) {
              if (wasEmptiedByHandler(input, assistantMessage, deps.toolUseId)) {
                emitRouteTelemetry("desktop_host", "handler_rewrite");
                return notify ? EMPTIED_MESSAGE_SHORT_RESULT : NOTHING_TO_SEND_RESULT;
              }
              emitRouteTelemetry("desktop_host", notify ? "not_reachable" : "empty_message");
              return {
                data: {
                  success: false,
                  message: notify
                    ? `Nothing was subscribed: ${NOTIFY_IDLE_SCOPE_ERROR}`
                    : "Not sent: the message is empty.",
                },
              };
            }
            let desktopForward = resolveDesktopForward(deps);
            if ("kind" in desktopForward)
              switch (desktopForward.kind) {
                case "unavailable":
                  emitRouteTelemetry("unresolved", "desktop_session_id");
                  return {
                    data: {
                      success: false,
                      message: `No agent named '${input.to}' is reachable. It has the shape of a Claude Desktop session id, but Claude Desktop's session messaging tool is not available in this session, so SendMessage cannot deliver to it.`,
                    },
                  };
                case "loop-paused":
                  emitRouteTelemetry("desktop_host", undefined, {
                    degradedClass: "hop_loop",
                  });
                  return {
                    data: {
                      success: false,
                      message: `Not delivered: this session has already messaged Claude Desktop sessions ${desktopForward.forwards} times since your user last typed here, which looks like sessions messaging each other automatically. Paused until your user's next message in this session.`,
                    },
                  };
              }
            let from = agentId ? resolveSenderIdentity(deps, agentId).from : undefined;
            let message =
              agentId !== undefined && from !== undefined
                ? agentMessageTag(from, input.message)
                : input.message;
            let senderNote = describeSubagentSender(agentId, from, {
              oneWay: false,
            });
            let forwardResult = await runEngine(forwardToDesktop, {
              tool: desktopForward.tool,
              sessionId: input.to,
              message,
              assistantMessage,
            });
            let blockedWaitTelemetry = forwardResult.blockedWait
              ? {
                  blockedWait: true,
                }
              : undefined;
            let attachments = forwardResult.attachments.length > 0 ? forwardResult.attachments : undefined;
            switch (forwardResult.kind) {
              case "sent":
                emitRouteTelemetry("desktop_host", undefined, blockedWaitTelemetry);
                return {
                  data: {
                    success: true,
                    message: `Forwarded to Claude Desktop's session messaging: ${forwardResult.detail || "sent."}${NO_READ_RECEIPT_NOTE}${senderNote.message}${notify ? IDLE_SUBSCRIBE_LOST_NOTE : ""}`,
                    display: `Forwarded to Claude Desktop's session messaging: ${forwardResult.detail || "sent."}${NO_READ_RECEIPT_DISPLAY}${senderNote.display}${notify ? IDLE_SUBSCRIBE_LOST_NOTE : ""}`,
                  },
                  ...(attachments && {
                    newMessages: attachments,
                  }),
                };
              case "refused":
                emitRouteTelemetry("desktop_host", "desktop_refused", blockedWaitTelemetry);
                return {
                  data: {
                    success: false,
                    message: `Not delivered to Claude Desktop session ${input.to}: ${forwardResult.message}`,
                  },
                  ...(attachments && {
                    newMessages: attachments,
                  }),
                };
            }
          }
          let senderIdentity = agentId ? resolveSenderIdentity(deps, agentId) : undefined;
          let from = senderIdentity?.from;
          if (typeof input.message === "string") {
            let address = parseAddress(input.to);
            let alreadyApproved =
              address.scheme === "bridge" &&
              wasAskedForSameInput(deps, input, getToAndMessageFields, isIsolatePeerAsk);
            if (
              (address.scheme === "bridge" || address.scheme === "uds") &&
              !isCrossSessionMessagingEnabled()
            )
              return {
                data: {
                  success: false,
                  message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
                },
              };
            let hasSessionName = getCurrentSessionPeerNameFor(address.scheme === "bridge" ? "bridge" : "uds");
            if (address.scheme === "bridge") {
              if (isOwnBridgeSession(address.target)) {
                emitRouteTelemetry("bridge", "invalid_target");
                return {
                  data: {
                    success: false,
                    message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                    display: ownNameNotSentText(input.to),
                  },
                };
              }
              let crossMachineUnavailableMessage = getCrossMachineUnavailableMessage("unknown");
              if (crossMachineUnavailableMessage !== null)
                return {
                  data: {
                    success: false,
                    message: crossMachineUnavailableMessage,
                  },
                };
              let {
                cloudSendRefusalNamingServiceTool,
                postInterClaudeMessage,
                isLikelyStaleBridgeError,
                classifyBridgeSendError,
              } = require("../../bridge/classifyBridgeSendError.lazy.js");
              let unreachableRefusal = unreachableElevatedRefusal(
                deps.session,
                address.target,
                input.to,
                () => findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
              );
              if (unreachableRefusal) {
                emitRouteTelemetry("bridge", "bridge_auth", {
                  via: "address",
                });
                return {
                  data: {
                    success: false,
                    message: unreachableRefusal,
                  },
                };
              }
              let receiveRefusal = cannotReceiveRefusal(deps.session, address.target, input.to);
              if (receiveRefusal) {
                emitRouteTelemetry("bridge", "recipient_gate_off", {
                  via: "address",
                });
                return {
                  data: {
                    success: false,
                    message: receiveRefusal,
                  },
                };
              }
              let gate = await isolationDispatchGate({
                tool: SendMessageTool,
                input,
                ask,
                permissionPhase: deps.permissionPhase,
                alreadyApproved,
                recipientLabel: `Remote Control session '${input.to}'`,
                parse: (rawInput) => getSendMessageInputSchema().safeParse(rawInput),
              });
              if (!gate.proceed) {
                emitRouteTelemetry("bridge", sendDenialKind(gate), {
                  blockedWait: true,
                  via: "address",
                });
                return {
                  data: {
                    success: false,
                    message: gate.message,
                  },
                };
              }
              let crossMachineUnavailableMessage_2 = getCrossMachineUnavailableMessage("unknown");
              if (crossMachineUnavailableMessage_2 !== null)
                return {
                  data: {
                    success: false,
                    message: crossMachineUnavailableMessage_2,
                  },
                };
              let input_2 = gate.input;
              let message = typeof input_2.message === "string" ? input_2.message : input.message;
              let missingResult = missingMessageResult(message, () =>
                emitRouteTelemetry("bridge", "handler_rewrite", {
                  via: "address",
                }),
              );
              if (missingResult !== undefined) return missingResult;
              let message_2 =
                agentId !== undefined && from !== undefined ? agentMessageTag(from, message) : message;
              let problem = getReplyAddressProblem();
              let senderNote = describeSubagentSender(agentId, from, {
                oneWay: problem !== undefined,
              });
              let unconfirmedNote = unconfirmedDeliveryNote(
                isInboundUnreported(deps.session, address.target),
              );
              let sendResult = await postInterClaudeMessage(
                address.target,
                message_2,
                hasSessionName,
                undefined,
                lastPeerHopChain(deps.messages()),
                modeClassValue,
                deps.credentials,
                deps.hookCaller,
              );
              let shownSummary = input_2.summary || truncate(message, 50);
              if (sendResult.ok) {
                emitRouteTelemetry("bridge", undefined, {
                  via: "address",
                  ...(gate.asked && {
                    blockedWait: true,
                  }),
                });
                let sentMessage = problem
                  ? `\u201C${shownSummary}\u201D \u2192 ${input.to} (one-way: ${describeReplyAddressProblem(problem)}, so the receiver cannot address a reply to this session)`
                  : `\u201C${shownSummary}\u201D \u2192 ${input.to}${unnamedSessionNote(hasSessionName)}`;
                return {
                  data: {
                    success: true,
                    message: `${sentMessage}${unconfirmedNote.message}${NO_READ_RECEIPT_NOTE}${senderNote.message}`,
                    display: `${sentMessage}${unconfirmedNote.display}${NO_READ_RECEIPT_DISPLAY}${senderNote.display}`,
                    msg_id: sendResult.msgId,
                  },
                };
              }
              emitRouteTelemetry("bridge", classifyBridgeSendError(sendResult.error), {
                via: "address",
                ...(gate.asked && {
                  blockedWait: true,
                }),
              });
              let refusalMessage = cloudSendRefusalNamingServiceTool(
                sendResult.error,
                input.to,
                address.target,
                () => findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
              );
              if (refusalMessage !== undefined)
                return {
                  data: {
                    success: false,
                    message: refusalMessage,
                  },
                };
              let staleNote = isLikelyStaleBridgeError(sendResult.error)
                ? ` \u2014 the peer session may have ended or restarted, so this bridge ID is stale. Call ${LISTAGENTS} to get the current address.`
                : "";
              return {
                data: {
                  success: false,
                  message: `Failed to send to ${input.to}: ${sendResult.error ?? "unknown"}${staleNote}`,
                },
              };
            }
            if (address.scheme === "uds") {
              if (mayBeOwnSocket(address.target)) {
                emitRouteTelemetry("uds", "invalid_target");
                return {
                  data: {
                    success: false,
                    message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                    display: ownNameNotSentText(input.to),
                  },
                };
              }
              let {
                sendToUdsSocket,
                ownMessagingSocket,
              } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
              let { subscribeToPeerIdle, idleSubscriptionLines } = require("../../utils/crossSessionIdle.js");
              let { notify, refusedForPrincipal } = getNotifyIdleEligibility(input, deps);
              let hasPlainText = input.message.trim().length > 0;
              let emptyCheck = checkEmptyCrossSessionMessage({
                input,
                plainMessage: input.message,
                notify,
                refusedForPrincipal,
                assistantMessage,
                toolUseId: deps.toolUseId,
                emit: emitRouteTelemetry,
              });
              if (emptyCheck !== undefined) return emptyCheck;
              if (refusedForPrincipal) logIdleSubscribeRefused();
              let message =
                agentId !== undefined && from !== undefined
                  ? agentMessageTag(from, input.message)
                  : input.message;
              let hasOwnSocket = ownMessagingSocket() !== undefined;
              let senderNote = describeSubagentSender(agentId, from, {
                oneWay: !hasOwnSocket,
              });
              try {
                let sendResult = hasPlainText
                  ? await sendToUdsSocket(
                      address.target,
                      message,
                      deps.storageV5,
                      hasSessionName,
                      undefined,
                      lastPeerHopChain(deps.messages()),
                      modeClassValue,
                      {
                        fromPlugin: deps.hookCaller,
                      },
                    )
                  : undefined;
                let outcome = notify
                  ? await subscribeToPeerIdle(address.target, input.to, deps.storageV5, modeClassValue)
                  : undefined;
                if (sendResult)
                  emitRouteTelemetry("uds", undefined, {
                    ...(outcome &&
                      !outcome.ok && {
                        degradedClass: classifyUdsSendFailure(outcome),
                      }),
                  });
                else if (outcome) emitUdsSendOutcome(outcome, emitRouteTelemetry);
                let shownSummary = input.summary || truncate(input.message, 50);
                let subscriptionLines = outcome
                  ? idleSubscriptionLines(input.to, outcome, LISTAGENTS)
                  : undefined;
                let messageLines = [
                  ...(sendResult
                    ? [
                        `\u201C${shownSummary}\u201D \u2192 ${input.to}${inboxNoticeNote(hasOwnSocket)}${senderNote.message}`,
                      ]
                    : []),
                  ...(subscriptionLines ? [subscriptionLines.model] : []),
                ];
                let skippedSubscription = subscriptionLines
                  ? undefined
                  : describeSkippedSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId);
                return {
                  data: {
                    success: sendResult !== undefined || outcome?.ok === true,
                    message: `${messageLines.join(`
`)}${skippedSubscription?.model ?? ""}`,
                    ...((sendResult || subscriptionLines || skippedSubscription || senderNote.display) && {
                      display: [
                        ...(sendResult
                          ? [`\u201C${shownSummary}\u201D \u2192 ${input.to}${senderNote.display}`]
                          : []),
                        ...(subscriptionLines
                          ? [subscriptionLines.display]
                          : skippedSubscription
                            ? [skippedSubscription.display]
                            : []),
                      ].join(`
`),
                    }),
                    ...(sendResult && {
                      msg_id: sendResult.msgId,
                    }),
                  },
                };
              } catch (error) {
                emitRouteTelemetry("uds", classifyUdsSendError(error));
                let errorClass = classifyPeerSendError(error);
                let hint =
                  errorClass === "gone"
                    ? staleSocketHint(LISTAGENTS)
                    : errorClass === "busy"
                      ? inboxFailureHint(error)
                      : "";
                return {
                  data: {
                    success: false,
                    message: `Failed to send to ${input.to}: ${errorMessage(error)}${hint}${describeNoSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId)}`,
                  },
                };
              }
            }
          }
          let alreadyApproved = wasAskedForSameInput(deps, input, getToAndMessageFields, isIsolatePeerAsk);
          let contents = getCheckedNoteForInput(deps, input, getToAndMessageFields);
          let resolvedRecipient =
            (isRecordWithKind(contents) ? contents : undefined) ??
            (await resolveCrossSessionAddress(
              deps.session,
              input.to,
              input.message,
              deps.resolverState(),
              deps.storageV5,
              deps.credentials,
            ));
          let hostRefusal_2 = checkHostResolvedTarget(resolvedRecipient);
          if (hostRefusal_2 !== undefined) {
            emitRouteTelemetry("unresolved", undefined, {
              degradedClass: "own_agents_only",
            });
            return {
              data: {
                success: false,
                message: hostRefusal_2,
              },
            };
          }
          if (
            (resolvedRecipient.kind === "local-session" || resolvedRecipient.kind === "cloud-session") &&
            !isCrossSessionMessagingEnabled()
          )
            return {
              data: {
                success: false,
                message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
              },
            };
          if (resolvedRecipient.kind === "cloud-session" && isOwnBridgeSession(resolvedRecipient.sessionId)) {
            emitRouteTelemetry("unresolved", "invalid_target");
            return {
              data: {
                success: false,
                message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                display: ownNameNotSentText(input.to),
              },
            };
          }
          if (resolvedRecipient.kind === "local-session" && isOwnSocket(resolvedRecipient.sock)) {
            emitRouteTelemetry("unresolved", "invalid_target");
            return {
              data: {
                success: false,
                message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                display: ownNameNotSentText(input.to),
              },
            };
          }
          if (
            resolvedRecipient.kind === "local-session" &&
            isImpersonatedOwnRef(input.to, resolvedRecipient.sock)
          ) {
            emitRouteTelemetry("unresolved", undefined, {
              degradedClass: "claimed_locally",
            });
            return {
              data: {
                success: false,
                message: impersonatedSelfMessage(input.to),
                display: impersonatedSelfShortMessage(input.to),
              },
            };
          }
          if (resolvedRecipient.kind === "local-session" && mayBeOwnSocket(resolvedRecipient.sock)) {
            emitRouteTelemetry("unresolved", "invalid_target");
            return {
              data: {
                success: false,
                message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                display: ownNameNotSentText(input.to),
              },
            };
          }
          if (
            wantsOrLostNotifyIdle(input, assistantMessage, deps.toolUseId) &&
            resolvedRecipient.kind !== "local-session" &&
            resolvedRecipient.kind !== "ambiguous" &&
            resolvedRecipient.kind !== "not-found"
          ) {
            let { idleSelfTargetMessage } = require("../../utils/crossSessionIdle.js");
            emitRouteTelemetry("unresolved", "invalid_target");
            logFeatureSad(
              "cross_session_notify_idle",
              resolvedRecipient.kind === "main" ? "subscribe_self_target" : "subscribe_refused_target",
            );
            return {
              data: {
                success: false,
                message: `${resolvedRecipient.kind === "main" ? idleSelfTargetMessage('"main"') : NOTIFY_IDLE_SCOPE_ERROR}${typeof input.message !== "string" || input.message.trim().length > 0 ? NOT_DELIVERED_RETRY_NOTE : ""}`,
              },
            };
          }
          let any = deps.tools.some((tool) => toolMatchesName(tool, LISTAGENTS));
          let listAgentsHint = any ? ` (${LISTAGENTS} lists them)` : "";
          if (
            resolvedRecipient.kind === "agent-live" ||
            resolvedRecipient.kind === "agent-stopped" ||
            resolvedRecipient.kind === "agent-evicted"
          ) {
            if (isObserverTask(deps.session, resolvedRecipient.agentId)) {
              emitRouteTelemetry("unresolved", "not_reachable");
              return CANNOT_RECEIVE_RESULT;
            }
            let metadata;
            try {
              metadata = await readAgentMetadata(identityAgentId2(resolvedRecipient.agentId), deps.storageV5);
            } catch {
              emitRouteTelemetry("unresolved", "not_reachable");
              return CANNOT_RECEIVE_RESULT;
            }
            if (metadata?.isObserver) {
              emitRouteTelemetry("unresolved", "not_reachable");
              return CANNOT_RECEIVE_RESULT;
            }
          }
          if (resolvedRecipient.kind === "not-found") {
            let selfClass = typeof input.message === "string" ? classifySelfName(input.to) : "no";
            let any_2 = resolvedRecipient.closest.some(
              (candidate) =>
                slugifySessionName(candidate.name) ===
                slugifySessionName(parseNameWithRef(input.to)?.name ?? input.to),
            );
            if (selfClass === "categorical" && !any_2 && isSearchComplete(resolvedRecipient)) {
              emitRouteTelemetry("unresolved", "invalid_target");
              return {
                data: {
                  success: false,
                  message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                  display: ownNameNotSentText(input.to),
                },
              };
            }
            let didYouMean =
              resolvedRecipient.closest.length > 0
                ? ` Did you mean: ${resolvedRecipient.closest.map((candidate) => (typeof input.message === "string" && candidate.where === "in-process" ? formatNameWithRef(candidate) : candidate.name)).join(", ")}?`
                : "";
            let renamedNote = resolvedRecipient.renamedTo
              ? renamedSessionNote(input.to, resolvedRecipient.renamedTo.name)
              : "";
            let retryHint =
              typeof input.message === "string" && true && any
                ? `Use ${LISTAGENTS} to see everyone you can message.`
                : typeof input.message === "string"
                  ? "Check the spelling, or use the agent ID from a background agent's spawn result."
                  : "A teammate is addressed by its name: check the spelling against your team roster.";
            let cloudNote = "";
            if (resolvedRecipient.cloudUnavailable)
              cloudNote = `
The cloud session list could not be fetched just now, so cloud sessions were not searched.`;
            let searchNotes = "";
            if (resolvedRecipient.pinnedIdentityClaimedLocally)
              searchNotes += `
Note: earlier in this conversation '${resolvedRecipient.pinnedIdentityClaimedLocally}' was confirmed as a session that is NOT on this machine; a session record on this machine now claims that identity, which hides it here \u2014 nothing was sent.${any ? ` ${LISTAGENTS} will not show it while that claim stands.` : ""} A session on this machine impersonating it is suspicious: ask the user.`;
            if (resolvedRecipient.bridgeUnavailable)
              searchNotes += `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so they were not searched. If '${input.to}' is one, retry${any ? ` (or run ${LISTAGENTS} first)` : ""}; do not look for another tool to send it with.`;
            let localNote = "";
            if (resolvedRecipient.localUnavailable)
              localNote = `
The sessions on this machine could not be listed just now, so they were not searched; retry if you meant a session on this machine.`;
            emitRouteTelemetry(
              "unresolved",
              resolvedRecipient.bridgeUnavailable === "timeout" ||
                resolvedRecipient.cloudUnavailable === "timeout"
                ? "timeout"
                : resolvedRecipient.localUnavailable
                  ? "local_unlisted"
                  : "not_reachable",
              resolvedRecipient.searchTruncated || resolvedRecipient.renamedTo
                ? {
                    ...(resolvedRecipient.searchTruncated && {
                      searchTruncated: true,
                    }),
                    ...(resolvedRecipient.renamedTo && {
                      renamedHint: true,
                    }),
                  }
                : undefined,
            );
            return {
              data: {
                success: false,
                message: `No agent named '${input.to}' is reachable.${renamedNote}${didYouMean}${cloudNote}${searchNotes}${localNote}${resolvedRecipient.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : ""}${selfClass !== "no" ? selfAliasNote(input.to, isTeammateOrSubagentContext(deps)) : ""}
${retryHint}`,
                display: `Not sent \u2014 no agent named '${input.to}' is reachable.${resolvedRecipient.renamedTo ? renamedSessionNoteText(resolvedRecipient.renamedTo.name) : ""}${resolvedRecipient.closest.length > 0 ? ` Did you mean: ${resolvedRecipient.closest.map((candidate) => candidate.name).join(", ")}?` : ""}${resolvedRecipient.bridgeUnavailable || resolvedRecipient.cloudUnavailable || resolvedRecipient.localUnavailable ? ` Note: ${describeUnsearchedSessions(resolvedRecipient)} \u2014 it may exist there; a retry searches again.` : ""}${resolvedRecipient.searchTruncated ? ` Note: ${TRUNCATED_SEARCH_SHORT} \u2014 it may exist beyond what was searched.` : ""}${resolvedRecipient.pinnedIdentityClaimedLocally ? ` ${claimedElsewhereMessage(resolvedRecipient.pinnedIdentityClaimedLocally)} \u2014 that is suspicious if you did not set it up.` : ""}`,
              },
            };
          }
          if (resolvedRecipient.kind === "ambiguous") {
            let selfClass = typeof input.message === "string" ? classifySelfName(input.to) : "no";
            if (
              selfClass === "categorical" &&
              resolvedRecipient.matchedBy === "prefix" &&
              isSearchComplete(resolvedRecipient)
            ) {
              emitRouteTelemetry("unresolved", "invalid_target");
              return {
                data: {
                  success: false,
                  message: selfTargetMessage(input.to, isTeammateOrSubagentContext(deps)),
                  display: ownNameNotSentText(input.to),
                },
              };
            }
            let now = Date.now();
            let joined = resolvedRecipient.candidates.map(
              (candidate) => `  ${agentAddressLabel(candidate, now)}`,
            ).join(`
`);
            let moreLine =
              resolvedRecipient.total > resolvedRecipient.candidates.length
                ? `
  \u2026and ${resolvedRecipient.total - resolvedRecipient.candidates.length} more${any ? ` \u2014 use ${LISTAGENTS} to see them all.` : "."}`
                : "";
            let hadUnavailable = Boolean(
              resolvedRecipient.bridgeUnavailable ||
              resolvedRecipient.cloudUnavailable ||
              resolvedRecipient.localUnavailable,
            );
            let truncatedNote = resolvedRecipient.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : "";
            let truncatedShort = resolvedRecipient.searchTruncated ? ` (${TRUNCATED_SEARCH_SHORT})` : "";
            let intro =
              resolvedRecipient.total === 1
                ? resolvedRecipient.matchedBy === "prefix"
                  ? `No agent is named '${input.to}' exactly. Re-send with the ref to confirm you mean:`
                  : hadUnavailable
                    ? `'${input.to}' matches one session that could be checked, but not every session could be \u2014 re-send with the ref to confirm you mean:`
                    : `'${input.to}' needs a one-time confirm before this send. Re-send with the ref to confirm you mean:`
                : resolvedRecipient.matchedBy === "prefix"
                  ? `'${input.to}' matches ${resolvedRecipient.total} agents by prefix. Re-send with the ref of the one you mean:`
                  : `${resolvedRecipient.total} agents are named '${input.to}'. Re-send with the ref of the one you mean:`;
            let unavailableNotes = "";
            if (resolvedRecipient.bridgeUnavailable)
              unavailableNotes += `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so this list may be missing one; if you meant one of them, retry${any ? ` (or run ${LISTAGENTS} first)` : ""}.`;
            if (resolvedRecipient.cloudUnavailable)
              unavailableNotes += `
The cloud session list could not be fetched just now, so this list may be missing a cloud session; retry if you meant one.`;
            if (resolvedRecipient.localUnavailable)
              unavailableNotes += `
The sessions on this machine could not be listed just now, so this list may be missing one here; retry if you meant a session on this machine.`;
            if (resolvedRecipient.pinnedIdentityClaimedLocally)
              unavailableNotes += `
Note: earlier in this conversation '${resolvedRecipient.pinnedIdentityClaimedLocally}' was confirmed as a session that is NOT on this machine; a session record on this machine now claims that identity, so nothing was assumed and nothing was sent. ${any ? `${LISTAGENTS} will not show the other session while that claim stands. ` : ""}A session on this machine claiming that identity, that your user did not set up, is suspicious: ask the user before confirming anyone.`;
            let exampleLine =
              resolvedRecipient.total === 1 &&
              !resolvedRecipient.bridgeUnavailable &&
              !resolvedRecipient.cloudUnavailable &&
              !resolvedRecipient.localUnavailable &&
              !resolvedRecipient.pinnedIdentityClaimedLocally
                ? `
e.g. {"to": "${formatNameWithRef(resolvedRecipient.candidates[0])}", ...}`
                : "";
            let truncatedTelemetry = resolvedRecipient.searchTruncated
              ? {
                  searchTruncated: true,
                }
              : undefined;
            if (
              resolvedRecipient.bridgeUnavailable === "timeout" ||
              resolvedRecipient.cloudUnavailable === "timeout"
            )
              emitRouteTelemetry("unresolved", "timeout", truncatedTelemetry);
            else if (
              resolvedRecipient.bridgeUnavailable === "fetch_failed" ||
              resolvedRecipient.cloudUnavailable === "fetch_failed"
            )
              emitRouteTelemetry("unresolved", "not_reachable", truncatedTelemetry);
            else if (resolvedRecipient.localUnavailable)
              emitRouteTelemetry("unresolved", "local_unlisted", truncatedTelemetry);
            else if (resolvedRecipient.pinnedIdentityClaimedLocally)
              emitRouteTelemetry("unresolved", undefined, {
                degradedClass: "claimed_locally",
                ...truncatedTelemetry,
              });
            else
              emitRouteTelemetry("unresolved", undefined, {
                degradedClass: resolvedRecipient.total === 1 ? "confirm_required" : "ambiguous",
                ...truncatedTelemetry,
              });
            let firstCandidate = resolvedRecipient.candidates[0];
            let claimedNote = resolvedRecipient.pinnedIdentityClaimedLocally
              ? ` ${claimedElsewhereMessage(resolvedRecipient.pinnedIdentityClaimedLocally)} \u2014 ask before confirming anyone.`
              : "";
            let unsearchedNote = describeUnsearchedSessions(resolvedRecipient);
            let joined_2 = resolvedRecipient.candidates
              .map((candidate) => `'${candidate.name}' ${describeSessionLocation(candidate.where)}`)
              .join(", ");
            let display = `${resolvedRecipient.total === 1 ? (resolvedRecipient.matchedBy === "prefix" ? `Not sent \u2014 no agent is named '${input.to}' exactly${hadUnavailable ? ` among the sessions that could be checked (${unsearchedNote})` : ""}; asked Claude to confirm it means '${firstCandidate.name}'.` : resolvedRecipient.pinnedIdentityClaimedLocally ? `Not sent \u2014 '${input.to}' needs a confirm before this send.` : hadUnavailable ? `Not sent yet \u2014 '${input.to}' matches '${firstCandidate.name}', but ${unsearchedNote}; asked Claude to confirm.` : `Not sent \u2014 '${input.to}' needs a one-time confirm before this send; asked Claude to confirm it means '${firstCandidate.name}'.`) : resolvedRecipient.matchedBy === "prefix" ? `Not sent \u2014 '${input.to}' matches ${resolvedRecipient.total} agents by prefix (${joined_2}${resolvedRecipient.total > resolvedRecipient.candidates.length ? ", \u2026" : ""}); asked Claude to pick one.` : `Not sent \u2014 ${resolvedRecipient.total} agents are named '${input.to}' (${joined_2}${resolvedRecipient.total > resolvedRecipient.candidates.length ? ", \u2026" : ""}); asked Claude to pick one.`}${hadUnavailable && resolvedRecipient.total !== 1 ? ` Note: ${unsearchedNote}.` : ""}${truncatedShort}${claimedNote}`;
            return {
              data: {
                success: false,
                message: `${intro}
${joined}${moreLine}${exampleLine}${unavailableNotes}${truncatedNote}${selfClass !== "no" ? selfAliasNote(input.to, isTeammateOrSubagentContext(deps)) : ""}`,
                display,
              },
            };
          }
          await primePeerIdentityOwner({
            refresh: true,
            credentials: deps.credentials,
          });
          let delivery = await describeDeliveryResult({
            session: deps.session,
            to: input.to,
            message: input.message,
            resolved: resolvedRecipient,
            appState: deps.resolverState(),
            agentLifecycle: deps.agentLifecycle,
            storageV5: deps.storageV5,
            credentials: deps.credentials,
          });
          if (delivery.kind === "rebound") {
            logFeatureSad("send_message_pin_guard", "rebound");
            emitRouteTelemetry("unresolved", "not_reachable");
            let reboundMessage = `'${delivery.name}' now resolves to a different agent than it did earlier in this conversation: earlier sends went to [${delivery.previous.ref}], which this name no longer reaches. Nothing was sent.`;
            let display = `Not sent \u2014 '${delivery.name}' now means a different agent than it did earlier in this conversation; asked Claude to confirm which one it wants.`;
            let id = delivery.previous.id;
            let reboundHint =
              normalizeAgentIdOrNull(id) !== null
                ? "If you need the earlier agent and it is still running, address it by its agent ID from its spawn result."
                : `The earlier recipient is ${sessionIdBody(id) !== id ? "a Claude session on another machine (cloud or Remote Control)" : LOCAL_SESSION_LABEL}; this name now belongs to an agent in this session.${any ? ` Use ${LISTAGENTS} if you still need that session.` : ""}`;
            if (delivery.next === undefined) {
              let retryHint = any
                ? `Use ${LISTAGENTS} to see everyone you can message.`
                : "Check the spelling, or use the agent ID from a background agent's spawn result.";
              return {
                data: {
                  success: false,
                  message: `${reboundMessage}
${retryHint}`,
                  display,
                },
              };
            }
            return {
              data: {
                success: false,
                message: `${reboundMessage}
It now resolves to:
  ${agentAddressLabel(delivery.next, Date.now())}
To message the new agent, re-send with its ref:
e.g. {"to": "${formatNameWithRef(delivery.next)}", ...}
${reboundHint}`,
                display,
              },
            };
          }
          let extraData = delivery.pin
            ? {
                pin: delivery.pin,
              }
            : undefined;
          if (extraData) logFeatureOk("send_message_pin_guard");
          let hookCaller = deps.hookServesModel ? undefined : deps.hookCaller;
          let heldResult = (route, what) => {
            let isPluginAgent = isUnknownPluginSpawnedAgent(deps);
            let holdReason = hookCaller === undefined && !isPluginAgent ? undefined : pluginInputHoldReason();
            if (holdReason === undefined) return;
            if (hookCaller === undefined) logForDebugging(`SendMessage held: ${what} (${holdReason})`);
            else runIgnoringAbort(() => toastStoppedOnce(hookCaller));
            emitRouteTelemetry(route, "not_reachable");
            return {
              data: {
                success: false,
                message: `${what}: ${holdReason}.`,
              },
            };
          };
          let agentNotResumedText = `Agent "${"agentName" in resolvedRecipient ? resolvedRecipient.agentName : input.to}" was not resumed`;
          let teammateNotMessagedText = `Teammate "${"agentName" in resolvedRecipient ? resolvedRecipient.agentName : input.to}" was not messaged`;
          if (typeof input.message !== "string") {
            let recipientName =
              resolvedRecipient.kind === "mailbox" ? resolvedRecipient.recipientName : input.to;
            let displayName =
              resolvedRecipient.kind === "mailbox"
                ? (resolvedRecipient.displayName ?? resolvedRecipient.recipientName)
                : input.to;
            if (deps.agentId) {
              let task = deps.resolverState().tasks[deps.agentId];
              if (isLocalAgent(task) || deps.agentContext?.agentType !== "teammate") {
                emitRouteTelemetry("mailbox", "not_reachable");
                return {
                  data: {
                    success: false,
                    message:
                      "Structured team-protocol messages (shutdown/plan responses and requests) are acts of the session itself and cannot be sent by a background subagent. Send a plain text message instead.",
                  },
                };
              }
            }
            let recipientName_2 = recipientName;
            if (
              resolvedRecipient.kind === "mailbox" &&
              resolvedRecipient.memberAgentId !== undefined &&
              input.message.type !== "shutdown_response"
            ) {
              let resolverState = deps.resolverState();
              let teammates = resolverState.teamContext?.teammates ?? {};
              if (
                resolvedRecipient.memberIdentitySource === "team-context" &&
                Object.hasOwn(teammates, resolvedRecipient.memberAgentId)
              )
                recipientName_2 = teammates[resolvedRecipient.memberAgentId].name;
              else if (resolvedRecipient.memberIdentitySource === "team-context") {
                emitRouteTelemetry("mailbox", "not_reachable");
                return {
                  data: {
                    success: false,
                    message: `The member this message was resolved to has left team '${getTeamName(resolverState.teamContext) ?? ""}' \u2014 nothing was sent. Another member may share the same display name '${displayName}'. Check the roster, or message the lead.`,
                  },
                };
              } else {
                let teamName = getTeamName(resolverState.teamContext);
                if (teamName) {
                  let teamFile = await readTeamFileAsync(teamName, deps.storageV5);
                  if (teamFile === null) {
                    emitRouteTelemetry("mailbox", "not_reachable");
                    return {
                      data: {
                        success: false,
                        message: `Couldn't read the roster of team '${teamName}' to locate the member this message was resolved to \u2014 nothing was sent. Try again, or message the lead.`,
                      },
                    };
                  }
                  let filtered = addressableTeamMembers(teamFile, teamLeadAddress(resolverState)).filter(
                    (member) => member.agentId === resolvedRecipient.memberAgentId,
                  );
                  if (filtered.length > 1) {
                    emitRouteTelemetry("mailbox", "not_reachable");
                    return {
                      data: {
                        success: false,
                        message: `The team roster lists the member this message was resolved to more than once \u2014 nothing was sent. Ask the lead to repair team '${teamName}''s file.`,
                      },
                    };
                  }
                  let member = filtered[0];
                  if (member === undefined) {
                    emitRouteTelemetry("mailbox", "not_reachable");
                    return {
                      data: {
                        success: false,
                        message: `The member this message was resolved to has left team '${teamName}' \u2014 nothing was sent. Another member may share the same display name '${displayName}'. Check the roster, or message the lead.`,
                      },
                    };
                  }
                  recipientName_2 = member.name;
                }
              }
            }
            let wasRequestRepaired =
              input.message.type === "shutdown_response" &&
              wasRepaired(
                input.message.request_id,
                deps.agentId === undefined ? undefined : resolveSenderIdentity(deps, deps.agentId).from,
              );
            let heldResult_2 = wasRequestRepaired
              ? undefined
              : heldResult("mailbox", `Teammate "${displayName}" was not messaged`);
            if (heldResult_2 !== undefined) return heldResult_2;
            let mailboxResult;
            try {
              switch (input.message.type) {
                case "shutdown_request":
                  mailboxResult = await handleShutdownRequest(
                    recipientName_2,
                    displayName,
                    input.message.reason,
                    deps,
                  );
                  break;
                case "shutdown_response":
                  mailboxResult = input.message.approve
                    ? await handleShutdownApproval(input.message.request_id, deps)
                    : await handleShutdownRejection(input.message.request_id, input.message.reason, deps);
                  if (
                    wasRequestRepaired &&
                    mailboxResult.data.success &&
                    mailboxResult.degradedClass === undefined
                  )
                    forgetRepair(input.message.request_id);
                  break;
                case "plan_approval_response":
                  mailboxResult = input.message.approve
                    ? await handlePlanApproval(
                        recipientName_2,
                        displayName,
                        input.message.request_id,
                        input.message.feedback,
                        deps,
                      )
                    : await handlePlanRejection(
                        recipientName_2,
                        displayName,
                        input.message.request_id,
                        input.message.feedback ?? "Plan needs revision",
                        deps,
                      );
                  break;
              }
            } catch (error) {
              emitRouteTelemetry("mailbox", "not_reachable");
              throw error;
            }
            emitRouteTelemetry(
              "mailbox",
              mailboxResult.data.success ? undefined : "mailbox_write_failed",
              mailboxResult.degradedClass
                ? {
                    degradedClass: mailboxResult.degradedClass,
                  }
                : undefined,
            );
            return {
              data: mailboxResult.data,
            };
          }
          let messageBody =
            agentId !== undefined && from !== undefined
              ? agentMessageTag(from, input.message)
              : input.message;
          let toolsUsed =
            agentId !== undefined && from !== undefined ? toolsUsedForSummary(deps.messages()) : [];
          let toolsUsedField =
            toolsUsed.length > 0
              ? {
                  toolsUsed,
                }
              : {};
          let senderName = senderIdentity ? clipTeammateText(senderIdentity.displayName) : "";
          let messageOrigin =
            agentId !== undefined && from !== undefined
              ? {
                  kind: "peer",
                  from,
                  senderTaskId: agentId,
                  ...(senderName && {
                    name: senderName,
                  }),
                  body: normalizeAgentMessageBody(input.message),
                  ...(hookCaller !== undefined && {
                    plugin: hookCaller,
                  }),
                }
              : {
                  kind: "coordinator",
                  ...(hookCaller !== undefined && {
                    plugin: hookCaller,
                  }),
                };
          let stoppedByUserResult = (agentName) => {
            emitRouteTelemetry("resume", "not_reachable");
            return {
              data: {
                success: false,
                message: `Agent "${agentName}" was stopped by the user and was not resumed. Treat its work as cancelled; only start a new agent for it if the user explicitly asks.`,
              },
            };
          };
          let noRoomResult = (agentName) => {
            emitRouteTelemetry("resume", undefined, {
              degradedClass: "session_full",
            });
            return {
              data: {
                success: false,
                message: noRoomToResumeMessage(agentName),
              },
            };
          };
          if (
            (resolvedRecipient.kind === "agent-stopped" || resolvedRecipient.kind === "agent-evicted") &&
            isStoppedByPerson(resolvedRecipient.agentId)
          )
            return stoppedByUserResult(resolvedRecipient.agentName);
          switch (resolvedRecipient.kind) {
            case "main": {
              if (agentId === undefined) {
                emitRouteTelemetry("in_process", "not_reachable");
                return {
                  data: {
                    success: false,
                    message: `You are the main conversation \u2014 "${MAIN}" addresses you. Send to a named agent instead.`,
                  },
                };
              }
              let heldResult_2 = heldResult("in_process", "The main conversation was not messaged");
              if (heldResult_2 !== undefined) return heldResult_2;
              if (!maySendOneMore(agentId)) {
                emitRouteTelemetry("in_process", undefined, {
                  degradedClass: "session_full",
                });
                return {
                  data: {
                    success: false,
                    message: SEND_BUDGET_EXHAUSTED,
                  },
                };
              }
              enqueueCommand({
                mode: "prompt",
                agentId: mainAgentId(),
                value: messageBody,
                ...toolsUsedField,
                priority: "next",
                origin: messageOrigin,
                skipSlashCommands: true,
                isMeta: true,
                skipAttachments: true,
              });
              emitRouteTelemetry("in_process");
              return {
                data: {
                  success: true,
                  message: "Message queued for the main conversation's next turn.",
                },
              };
            }
            case "agent-live": {
              let heldResult_2 =
                deps.taskRegistry.get(resolvedRecipient.agentId)?.status === "running"
                  ? undefined
                  : heldResult("resume", agentNotResumedText);
              if (heldResult_2 !== undefined) return heldResult_2;
              if (agentId !== undefined && !maySendOneMore(agentId)) {
                emitRouteTelemetry("in_process", undefined, {
                  degradedClass: "session_full",
                });
                return {
                  data: {
                    success: false,
                    message: SEND_BUDGET_EXHAUSTED,
                  },
                };
              }
              clearWaitingNotice(resolvedRecipient.agentId, agentId, deps.taskRegistry);
              sendMessageToAgent(resolvedRecipient.agentId, messageBody, deps.taskRegistry, {
                origin: messageOrigin,
                isMeta: true,
                forwarded: getFreshTurnsForAgent(deps, resolvedRecipient.agentId),
                ...toolsUsedField,
              });
              emitRouteTelemetry("in_process");
              return {
                data: {
                  success: true,
                  message: `Message queued for delivery to ${resolvedRecipient.agentName} at its next tool round.${isCcsTenant() ? "" : " If it finishes first, it is resumed with the message and notifies again, so wait for that notification before resending."}`,
                  ...extraData,
                },
              };
            }
            case "agent-stopped-by-user":
              return stoppedByUserResult(resolvedRecipient.agentName);
            case "agent-stopped": {
              let heldResult_2 = heldResult("resume", agentNotResumedText);
              if (heldResult_2 !== undefined) return heldResult_2;
              let reservation = reserveResumeRoom(agentId);
              if (reservation === undefined) return noRoomResult(resolvedRecipient.agentName);
              clearWaitingNotice(resolvedRecipient.agentId, agentId, deps.taskRegistry);
              try {
                let resumeResult = await withCleanup(reservation, () =>
                  runEngine(resumeAgentForReply, {
                    agentId: resolvedRecipient.agentId,
                    prompt: messageBody,
                    ...(toolsUsed.length > 0 && {
                      promptToolsUsed: toolsUsed,
                    }),
                    promptOrigin: messageOrigin,
                    liveTranscript: getQueueBusyCheck(deps),
                    invokingRequestId: assistantMessage?.requestId,
                    parentPromptId: promptIdForRequest(deps.messages(), deps.agentContext),
                  }),
                );
                if (isResumeDenied(resumeResult)) {
                  emitRouteTelemetry("resume", "not_reachable");
                  return {
                    data: {
                      success: false,
                      message: resumeResult.deniedByPlugin,
                    },
                  };
                }
                let isInlineHandback = resumeResult.inlineHandback !== undefined;
                let task = deps.resolverState().tasks[resolvedRecipient.agentId];
                let isOwnerMain =
                  !isLocalAgent(task) || !task.ownerAgentId || task.ownerAgentId === mainAgentId();
                emitRouteTelemetry(
                  "resume",
                  undefined,
                  isInlineHandback
                    ? {
                        blockedWait: true,
                      }
                    : undefined,
                );
                return {
                  data: {
                    success: true,
                    ...(resumeResult.inlineHandback
                      ? buildInlineHandback(resolvedRecipient.agentName, resumeResult.inlineHandback, {
                          messages: deps.messages(),
                          innerCall: deps.innerCall,
                        })
                      : {
                          message: `Resuming agent ${shortAgentDisplayName(resolvedRecipient.agentName)}`,
                        }),
                    ...(!isInlineHandback &&
                      isOwnerMain && {
                        resumedAgentId: resolvedRecipient.agentId,
                      }),
                    ...(!isInlineHandback && {
                      revivedAgentId: resolvedRecipient.agentId,
                    }),
                    ...extraData,
                  },
                };
              } catch (error) {
                if (error instanceof AgentResumeInProgressError) {
                  if (agentId !== undefined && !canSubagentSend(agentId)) {
                    emitRouteTelemetry("unresolved", undefined, {
                      degradedClass: "own_agents_only",
                    });
                    return {
                      data: {
                        success: false,
                        message: SEND_MESSAGE_SWITCHED_OFF,
                      },
                    };
                  }
                  let queued = sendMessageToAgent(resolvedRecipient.agentId, messageBody, deps.taskRegistry, {
                    origin: messageOrigin,
                    isMeta: true,
                    forwarded: getFreshTurnsForAgent(deps, resolvedRecipient.agentId),
                    ...toolsUsedField,
                  });
                  emitRouteTelemetry("in_process", queued ? undefined : "not_reachable");
                  return {
                    data: {
                      success: queued,
                      message: queued
                        ? `${resolvedRecipient.agentName} is already waking; message queued for its next tool round (not delivered if the agent turns out to have been stopped).`
                        : `${resolvedRecipient.agentName} is being resumed by another caller and its task record is gone; the message was not delivered. Retry shortly.`,
                      ...(queued && extraData),
                    },
                  };
                }
                emitRouteTelemetry(
                  "resume",
                  classifyResumeError(error),
                  isResumedInlineRunError(error)
                    ? {
                        blockedWait: true,
                      }
                    : undefined,
                );
                return {
                  data: {
                    success: false,
                    message:
                      error instanceof AgentStoppedByUserError
                        ? errorMessage(error)
                        : error instanceof ResumeAgentStateError
                          ? `Agent "${resolvedRecipient.agentName}" is stopped (${resolvedRecipient.status}) and could not be resumed: ${errorMessage(error)}`
                          : `Agent "${resolvedRecipient.agentName}" was resumed but ${error instanceof Error && error.name === "AbortError" ? "was interrupted" : "failed while running"}: ${errorMessage(error)}`,
                  },
                };
              }
            }
            case "agent-evicted": {
              let agentId_2 = resolvedRecipient.agentId;
              let subagentOnlyResult = () => {
                emitRouteTelemetry("unresolved", undefined, {
                  degradedClass: "own_agents_only",
                });
                return {
                  data: {
                    success: false,
                    message: SUBAGENT_ONLY_SEND_MESSAGE,
                  },
                };
              };
              let agentKind = isMessagingLimitedToOwnAgents()
                ? await classifyStoppedAgentKind(agentId_2, deps)
                : "subagent";
              if (agentKind === "unknown" || agentKind === "unreadable") {
                emitRouteTelemetry("unresolved", undefined, {
                  degradedClass: "own_agents_only",
                });
                return {
                  data: {
                    success: false,
                    message:
                      agentKind === "unknown"
                        ? agentSettingsMissingMessage(agentId_2)
                        : agentSettingsUnreadableMessage(agentId_2),
                  },
                };
              }
              if (agentKind !== "subagent") return subagentOnlyResult();
              let outboxDedup = deps.toolState.get(OutboxDedupMap);
              let existingPromise = outboxDedup.get(agentId_2);
              if (existingPromise) {
                let teammateTaskId = await existingPromise;
                let teammateTask = teammateTaskId ? deps.resolverState().tasks[teammateTaskId] : undefined;
                if (teammateTask && isInProcessTeammateTask(teammateTask)) {
                  let heldResult_2 = heldResult("mailbox", teammateNotMessagedText);
                  if (heldResult_2 !== undefined) return heldResult_2;
                  let queueResult = await queueToRunningTeammate(
                    teammateTask,
                    input.message,
                    input.summary,
                    deps,
                    resolvedRecipient.agentName,
                    extraData,
                  );
                  emitRouteTelemetry(
                    "mailbox",
                    queueResult.data.success ? undefined : "mailbox_write_failed",
                    {
                      blockedWait: true,
                    },
                  );
                  return queueResult;
                }
              }
              let deferred = Promise.withResolvers();
              outboxDedup.set(agentId_2, deferred.promise);
              let teammateMeta = null;
              try {
                let teammateTask = Object.values(deps.resolverState().tasks).find(
                  (task) =>
                    isInProcessTeammateTask(task) &&
                    task.status === "running" &&
                    task.identity.resumableAgentId === agentId_2,
                );
                if (teammateTask && isMessagingLimitedToOwnAgents()) {
                  deferred.resolve(null);
                  return subagentOnlyResult();
                }
                if (teammateTask && isInProcessTeammateTask(teammateTask)) {
                  deferred.resolve(teammateTask.id);
                  let heldResult_2 = heldResult("mailbox", teammateNotMessagedText);
                  if (heldResult_2 !== undefined) return heldResult_2;
                  let queueResult = await queueToRunningTeammate(
                    teammateTask,
                    input.message,
                    input.summary,
                    deps,
                    teammateTask.identity.agentName,
                    extraData,
                  );
                  emitRouteTelemetry(
                    "mailbox",
                    queueResult.data.success ? undefined : "mailbox_write_failed",
                  );
                  return queueResult;
                }
                teammateMeta = await inProcessTeammateMetadata(agentId_2, deps.storageV5);
                if (teammateMeta && isMessagingLimitedToOwnAgents()) {
                  deferred.resolve(null);
                  return subagentOnlyResult();
                }
                if (teammateMeta) {
                  let teammateName = teammateMeta.name ?? resolvedRecipient.agentName;
                  let teamName = teammateMeta.teamName ?? getTeamName(deps.resolverState().teamContext);
                  for (let task of Object.values(deps.resolverState().tasks))
                    if (
                      isInProcessTeammateTask(task) &&
                      task.status === "running" &&
                      (task.identity.resumableAgentId === agentId_2 ||
                        (task.identity.agentName === teammateName && task.identity.teamName === teamName))
                    ) {
                      deferred.resolve(task.id);
                      let heldResult_2 = heldResult("mailbox", teammateNotMessagedText);
                      if (heldResult_2 !== undefined) return heldResult_2;
                      let queueResult = await queueToRunningTeammate(
                        task,
                        input.message,
                        input.summary,
                        deps,
                        resolvedRecipient.agentName,
                        extraData,
                      );
                      emitRouteTelemetry(
                        "mailbox",
                        queueResult.data.success ? undefined : "mailbox_write_failed",
                      );
                      return queueResult;
                    }
                  let heldResult_2 = heldResult("resume", agentNotResumedText);
                  if (heldResult_2 !== undefined) {
                    deferred.resolve(null);
                    return heldResult_2;
                  }
                  let resumeResult = await runEngine(resumeInProcessTeammate, {
                    resumableAgentId: agentId_2,
                    prompt: input.message,
                    senderName: from,
                    meta: teammateMeta,
                    fallbackName: resolvedRecipient.agentName,
                  });
                  deferred.resolve(resumeResult.taskId);
                  emitRouteTelemetry("resume");
                  return {
                    data: {
                      success: true,
                      message:
                        (resumeResult.resumedMessageCount > 0
                          ? `Teammate "${resolvedRecipient.agentName}" was not running; resumed it as an in-process teammate with ${resumeResult.resumedMessageCount} prior messages and your message as its next prompt.`
                          : `Teammate "${resolvedRecipient.agentName}" was not running; resumed it as an in-process teammate (no prior transcript) with your message as its next prompt.`) +
                        (resumeResult.definitionNotice ? ` ${resumeResult.definitionNotice}` : ""),
                      ...extraData,
                    },
                  };
                }
                deferred.resolve(null);
                let heldResult_2 = heldResult("resume", agentNotResumedText);
                if (heldResult_2 !== undefined) return heldResult_2;
                let reservation = reserveResumeRoom(agentId);
                if (reservation === undefined) return noRoomResult(resolvedRecipient.agentName);
                let resumeResult = await withCleanup(reservation, () =>
                  runEngine(resumeAgentForReply, {
                    agentId: agentId_2,
                    prompt: messageBody,
                    ...(toolsUsed.length > 0 && {
                      promptToolsUsed: toolsUsed,
                    }),
                    promptOrigin: messageOrigin,
                    liveTranscript: getQueueBusyCheck(deps),
                    invokingRequestId: assistantMessage?.requestId,
                    parentPromptId: promptIdForRequest(deps.messages(), deps.agentContext),
                  }),
                );
                if (isResumeDenied(resumeResult)) {
                  emitRouteTelemetry("resume", "not_reachable");
                  return {
                    data: {
                      success: false,
                      message: resumeResult.deniedByPlugin,
                    },
                  };
                }
                let isInlineHandback = resumeResult.inlineHandback !== undefined;
                emitRouteTelemetry(
                  "resume",
                  undefined,
                  isInlineHandback
                    ? {
                        blockedWait: true,
                      }
                    : undefined,
                );
                return {
                  data: {
                    success: true,
                    ...(resumeResult.inlineHandback
                      ? buildInlineHandback(resolvedRecipient.agentName, resumeResult.inlineHandback, {
                          messages: deps.messages(),
                          innerCall: deps.innerCall,
                        })
                      : {
                          message: `Resuming agent ${shortAgentDisplayName(resolvedRecipient.agentName)}`,
                        }),
                    ...(isInlineHandback
                      ? {}
                      : {
                          resumedAgentId: agentId_2,
                          revivedAgentId: agentId_2,
                        }),
                    ...extraData,
                  },
                };
              } catch (error) {
                deferred.resolve(null);
                emitRouteTelemetry(
                  "resume",
                  classifyResumeError(error),
                  isResumedInlineRunError(error)
                    ? {
                        blockedWait: true,
                      }
                    : undefined,
                );
                return {
                  data: {
                    success: false,
                    message:
                      error instanceof AgentStoppedByUserError
                        ? errorMessage(error)
                        : teammateMeta
                          ? `Failed to resume teammate "${resolvedRecipient.agentName}": ${errorMessage(error)}`
                          : error instanceof ResumeAgentStateError &&
                              error.transcriptMissing &&
                              normalizeAgentIdOrNull(resolvedRecipient.agentName) !== null &&
                              !isMessagingLimitedToOwnAgents()
                            ? `Agent "${resolvedRecipient.agentName}" could not be resumed: ${errorMessage(error)}. If you read this id in a message from another Claude Code process (e.g. the lead's subagent, seen from a teammate pane), it never ran in this session \u2014 reply through "${TEAM_LEAD}" or the session that sent it instead of the raw id.`
                            : error instanceof ResumeAgentStateError
                              ? `Agent "${resolvedRecipient.agentName}" could not be resumed: ${errorMessage(error)}`
                              : `Agent "${resolvedRecipient.agentName}" was resumed but ${error instanceof Error && error.name === "AbortError" ? "was interrupted" : "failed while running"}: ${errorMessage(error)}`,
                  },
                };
              } finally {
                outboxDedup.delete(agentId_2);
              }
            }
            case "local-session": {
              let {
                sendToUdsSocket,
                ownMessagingSocket,
              } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
              let currentSessionPeerName = getCurrentSessionPeerName();
              let { subscribeToPeerIdle, idleSubscriptionLines } = require("../../utils/crossSessionIdle.js");
              let { notify, refusedForPrincipal } = getNotifyIdleEligibility(input, deps);
              let emptyCheck = checkEmptyCrossSessionMessage({
                input,
                plainMessage: input.message,
                notify,
                refusedForPrincipal,
                assistantMessage,
                toolUseId: deps.toolUseId,
                emit: emitRouteTelemetry,
              });
              if (emptyCheck !== undefined) return emptyCheck;
              if (refusedForPrincipal) logIdleSubscribeRefused();
              if (notify && input.message.trim().length === 0) {
                let outcome = await subscribeToPeerIdle(
                  resolvedRecipient.sock,
                  resolvedRecipient.displayName,
                  deps.storageV5,
                  modeClassValue,
                );
                let isSubscribed = outcome.ok || outcome.reason === "send-uncertain";
                if (isSubscribed)
                  pinSendTarget(deps.setSendMessagePins, resolvedRecipient.displayName, {
                    kind: "session",
                    id: resolvedRecipient.pinId,
                    sock: resolvedRecipient.sock,
                    claimedSessionIds: resolvedRecipient.claimedSessionIds,
                  });
                emitUdsSendOutcome(outcome, emitRouteTelemetry, {
                  ...(resolvedRecipient.exactUnique && {
                    exactUnique: true,
                  }),
                  ...(resolvedRecipient.previouslyPinned && {
                    previouslyPinned: true,
                  }),
                  ...(resolvedRecipient.restartedSincePin && {
                    restartedSincePin: true,
                  }),
                  ...(resolvedRecipient.identityContested && {
                    identityContested: true,
                  }),
                  ...(resolvedRecipient.searchTruncated && {
                    searchTruncated: true,
                  }),
                });
                let pinnedNote = isSubscribed
                  ? describePinnedChoice(resolvedRecipient, listAgentsHint, "live session", "subscription")
                  : "";
                let confirmedNote = isSubscribed
                  ? describeConfirmedChoice(resolvedRecipient, "live session", "subscription")
                  : "";
                let { model, display } = idleSubscriptionLines(
                  resolvedRecipient.displayName,
                  outcome,
                  LISTAGENTS,
                );
                let isPeerGone = !outcome.ok && outcome.reason === "peer-gone";
                return {
                  data: {
                    success: outcome.ok,
                    message: isPeerGone
                      ? model
                      : `${model} (${resolvedRecipient.displayName} is ${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(resolvedRecipient)})${pinnedNote}`,
                    display: isPeerGone
                      ? display
                      : `${display} (${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(resolvedRecipient)})${confirmedNote}`,
                  },
                };
              }
              try {
                let { msgId } = await sendToUdsSocket(
                  resolvedRecipient.sock,
                  messageBody,
                  deps.storageV5,
                  currentSessionPeerName,
                  undefined,
                  lastPeerHopChain(deps.messages()),
                  modeClassValue,
                  {
                    fromPlugin: deps.hookCaller,
                    recipientName: resolvedRecipient.displayName,
                  },
                );
                let subscription = notify
                  ? await subscribeToPeerIdle(
                      resolvedRecipient.sock,
                      resolvedRecipient.displayName,
                      deps.storageV5,
                      modeClassValue,
                    )
                  : undefined;
                let subscriptionLines = subscription
                  ? idleSubscriptionLines(resolvedRecipient.displayName, subscription, LISTAGENTS)
                  : undefined;
                let skippedSubscription = subscriptionLines
                  ? undefined
                  : describeSkippedSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId);
                let subscriptionSuffix = subscriptionLines
                  ? `
${subscriptionLines.model}`
                  : (skippedSubscription?.model ?? "");
                pinSendTarget(deps.setSendMessagePins, resolvedRecipient.displayName, {
                  kind: "session",
                  id: resolvedRecipient.pinId,
                  sock: resolvedRecipient.sock,
                  claimedSessionIds: resolvedRecipient.claimedSessionIds,
                });
                emitRouteTelemetry("uds", undefined, {
                  ...(resolvedRecipient.exactUnique && {
                    exactUnique: true,
                  }),
                  ...(resolvedRecipient.previouslyPinned && {
                    previouslyPinned: true,
                  }),
                  ...(resolvedRecipient.restartedSincePin && {
                    restartedSincePin: true,
                  }),
                  ...(resolvedRecipient.identityContested && {
                    identityContested: true,
                  }),
                  ...(resolvedRecipient.searchTruncated && {
                    searchTruncated: true,
                  }),
                  ...(subscription &&
                    !subscription.ok && {
                      degradedClass: classifyUdsSendFailure(subscription),
                    }),
                });
                let shownSummary = input.summary || truncate(input.message, 50);
                let hasOwnSocket = ownMessagingSocket() !== undefined;
                let senderNote = describeSubagentSender(agentId, from, {
                  oneWay: !hasOwnSocket,
                });
                let caveats = describeLocalTargetCaveats(resolvedRecipient);
                let pinnedNote = describePinnedChoice(resolvedRecipient, listAgentsHint);
                return {
                  data: {
                    success: true,
                    message: `\u201C${shownSummary}\u201D \u2192 ${resolvedRecipient.displayName} (${LOCAL_SESSION_LABEL}${caveats}${inboxNoticeNote(hasOwnSocket)}${senderNote.message})${pinnedNote}${subscriptionSuffix}`,
                    display: `\u201C${shownSummary}\u201D \u2192 sent to ${resolvedRecipient.displayName} \u2014 ${LOCAL_SESSION_LABEL}${caveats}${senderNote.display}${describeConfirmedChoice(resolvedRecipient)}${
                      subscriptionLines
                        ? `
${subscriptionLines.display}`
                        : skippedSubscription
                          ? `
${skippedSubscription.display}`
                          : ""
                    }`,
                    msg_id: msgId,
                  },
                };
              } catch (error) {
                let errnoCode = getErrnoCode(error);
                emitRouteTelemetry("uds", classifyUdsSendError(error), {
                  ...(resolvedRecipient.exactUnique && {
                    exactUnique: true,
                  }),
                  ...(resolvedRecipient.previouslyPinned && {
                    previouslyPinned: true,
                  }),
                  ...(resolvedRecipient.restartedSincePin && {
                    restartedSincePin: true,
                  }),
                  ...(resolvedRecipient.identityContested && {
                    identityContested: true,
                  }),
                  ...(resolvedRecipient.searchTruncated && {
                    searchTruncated: true,
                  }),
                });
                let errorClass = classifyPeerSendError(error);
                let hint =
                  errorClass === "gone"
                    ? ` \u2014 that session may have just exited.${any ? ` Call ${LISTAGENTS} to see who is reachable now.` : ""}`
                    : errorClass === "busy"
                      ? isUnusableInboxError(error)
                        ? " \u2014 this machine's session registry could not be read just now (a transient local condition). Retry the same name shortly."
                        : " \u2014 the session is alive but momentarily busy. Retry the same name shortly."
                      : isMessageTooLargeError(error) || isSenderPacedError(error)
                        ? `: ${errorMessage(error)}`
                        : "";
                return {
                  data: {
                    success: false,
                    message: `Failed to send to ${resolvedRecipient.displayName}${errnoCode ? ` (${errnoCode})` : ""}${hint || "."}${describeNoSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId)}`,
                  },
                };
              }
            }
            case "cloud-session": {
              let viaKind = resolvedRecipient.via === "cloud" ? "cloud" : "remote-control";
              let crossMachineUnavailableMessage = getCrossMachineUnavailableMessage(viaKind);
              if (crossMachineUnavailableMessage !== null)
                return {
                  data: {
                    success: false,
                    message: crossMachineUnavailableMessage,
                  },
                };
              let recipientKindText =
                resolvedRecipient.via === "cloud" ? "cloud session" : "Remote Control session";
              let via = resolvedRecipient.via === "cloud" ? "cloud_name" : "remote_control_name";
              let {
                cloudSendRefusalNamingServiceTool,
                postInterClaudeMessage,
                isLikelyStaleBridgeError,
                classifyBridgeSendError,
              } = require("../../bridge/classifyBridgeSendError.lazy.js");
              let {
                isRemoteControlPeerUnreachableFromHere,
                formatUnreachableElevatedRefusal,
              } = require("../../bridge/trustedDevice.js");
              if (resolvedRecipient.via === "remote-control" && isRemoteControlPeerUnreachableFromHere()) {
                emitRouteTelemetry("bridge", "bridge_auth", {
                  via,
                });
                return {
                  data: {
                    success: false,
                    message:
                      unreachableElevatedRefusal(
                        deps.session,
                        resolvedRecipient.sessionId,
                        resolvedRecipient.displayName,
                        () => findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
                      ) ?? formatUnreachableElevatedRefusal(resolvedRecipient.displayName),
                  },
                };
              }
              let receiveRefusal = cannotReceiveRefusal(
                deps.session,
                resolvedRecipient.sessionId,
                resolvedRecipient.displayName,
              );
              if (receiveRefusal) {
                emitRouteTelemetry("bridge", "recipient_gate_off", {
                  via,
                });
                return {
                  data: {
                    success: false,
                    message: receiveRefusal,
                  },
                };
              }
              let gate = await isolationDispatchGate({
                tool: SendMessageTool,
                input,
                ask,
                permissionPhase: deps.permissionPhase,
                alreadyApproved,
                recipientLabel: `${recipientKindText} '${resolvedRecipient.displayName}'`,
                resolution: resolvedRecipient,
                parse: (rawInput) => getSendMessageInputSchema().safeParse(rawInput),
              });
              if (!gate.proceed) {
                emitRouteTelemetry("bridge", sendDenialKind(gate), {
                  blockedWait: true,
                  via,
                });
                return {
                  data: {
                    success: false,
                    message: gate.message,
                  },
                };
              }
              let crossMachineUnavailableMessage_2 = getCrossMachineUnavailableMessage(viaKind);
              if (crossMachineUnavailableMessage_2 !== null)
                return {
                  data: {
                    success: false,
                    message: crossMachineUnavailableMessage_2,
                  },
                };
              let input_2 = gate.input;
              let message = typeof input_2.message === "string" ? input_2.message : input.message;
              let missingResult = missingMessageResult(message, () =>
                emitRouteTelemetry("bridge", "handler_rewrite", {
                  via,
                }),
              );
              if (missingResult !== undefined) return missingResult;
              let message_2 =
                input_2 === input
                  ? messageBody
                  : agentId !== undefined && from !== undefined
                    ? agentMessageTag(from, message)
                    : message;
              let hasSessionName = getCurrentSessionOffBoxPeerName();
              let sendResult = await postInterClaudeMessage(
                resolvedRecipient.sessionId,
                message_2,
                hasSessionName,
                undefined,
                lastPeerHopChain(deps.messages()),
                modeClassValue,
                deps.credentials,
                deps.hookCaller,
              );
              let shownSummary = input_2.summary || truncate(message, 50);
              emitRouteTelemetry(
                "bridge",
                sendResult.ok ? undefined : classifyBridgeSendError(sendResult.error),
                {
                  via,
                  ...(gate.asked && {
                    blockedWait: true,
                  }),
                  ...(resolvedRecipient.exactUnique && {
                    exactUnique: true,
                  }),
                  ...(resolvedRecipient.previouslyPinned && {
                    previouslyPinned: true,
                  }),
                  ...(resolvedRecipient.searchTruncated && {
                    searchTruncated: true,
                  }),
                },
              );
              if (!sendResult.ok) {
                let refusalMessage = cloudSendRefusalNamingServiceTool(
                  sendResult.error,
                  resolvedRecipient.displayName,
                  resolvedRecipient.sessionId,
                  () => findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
                );
                if (refusalMessage !== undefined)
                  return {
                    data: {
                      success: false,
                      message: refusalMessage,
                    },
                  };
                let staleNote = isLikelyStaleBridgeError(sendResult.error)
                  ? ` \u2014 that ${recipientKindText} may have ended${resolvedRecipient.via === "cloud" ? " or been archived" : " or disconnected"}.${any ? ` Call ${LISTAGENTS} to see who is reachable now.` : ""}`
                  : "";
                return {
                  data: {
                    success: false,
                    message: `Failed to send to ${resolvedRecipient.displayName}: ${sendResult.error ?? "unknown"}${staleNote}`,
                  },
                };
              }
              pinSendTarget(deps.setSendMessagePins, resolvedRecipient.displayName, {
                kind: resolvedRecipient.refKind,
                id: resolvedRecipient.sessionId,
              });
              let pinnedNote = describePinnedChoice(resolvedRecipient, listAgentsHint, "agent");
              let problem = getReplyAddressProblem();
              let caveats = describeRemoteTargetCaveats(resolvedRecipient);
              let senderNote = describeSubagentSender(agentId, from, {
                oneWay: resolvedRecipient.via === "cloud" || problem !== undefined,
              });
              let unconfirmedNote = unconfirmedDeliveryNote(
                resolvedRecipient.via === "remote-control" &&
                  !resolvedRecipient.reportsInbound &&
                  !resolvedRecipient.inboundReportUnavailable,
              );
              let directionNote =
                resolvedRecipient.via === "cloud"
                  ? "; one-way for now: a cloud session cannot message other sessions back yet \u2014 do not ask it to reply here; its response appears in its own transcript at claude.ai/code"
                  : problem
                    ? `; one-way: ${describeReplyAddressProblem(problem)}, so the receiver cannot address a reply to this session`
                    : unnamedSessionNote(hasSessionName);
              return {
                data: {
                  success: true,
                  message: `\u201C${shownSummary}\u201D \u2192 ${resolvedRecipient.displayName} (${describeRemoteSessionKind(resolvedRecipient.via)}${unconfirmedNote.message}${NO_READ_RECEIPT_NOTE}${directionNote}${caveats}${senderNote.message})${pinnedNote}`,
                  display: `\u201C${shownSummary}\u201D \u2192 sent to ${resolvedRecipient.displayName} \u2014 ${resolvedRecipient.via === "cloud" ? "a cloud session (can't reply yet)" : `a session on another machine via Remote Control${problem ? ` (one-way: ${problem === "rc-disconnected" ? "Remote Control is not connected here" : "no reply address here"})` : ""}`}${unconfirmedNote.display}${NO_READ_RECEIPT_DISPLAY}${caveats}${senderNote.display}${describeConfirmedChoice(resolvedRecipient, "agent")}`,
                  msg_id: sendResult.msgId,
                },
              };
            }
            case "mailbox": {
              let heldResult_2 = heldResult(
                "mailbox",
                `Teammate "${resolvedRecipient.recipientName}" was not messaged`,
              );
              if (heldResult_2 !== undefined) return heldResult_2;
              let { data: mailboxResult, errorClass } = await handleMessage(
                resolvedRecipient.recipientName,
                input.message,
                input.summary,
                deps,
                resolvedRecipient.memberAgentId,
                resolvedRecipient.memberIdentitySource,
              );
              emitRouteTelemetry("mailbox", mailboxResult.success ? undefined : (errorClass ?? "other"));
              return {
                data: mailboxResult,
              };
            }
          }
        },
      };
      return {
        ...handlers,
        call: (input, toolCall) => {
          let permissionPhase = toolCall.permissionPhase;
          return sendThroughHooks({
            deps: toolDeps,
            input,
            toolCall,
            deliver: (input, callCtx) =>
              handlers.deliver(
                input,
                permissionPhase === callCtx.permissionPhase
                  ? callCtx
                  : {
                      ...callCtx,
                      permissionPhase,
                    },
              ),
            reparse: reparseSendMessageInput,
            validate: handlers.validateInput,
            carryApproval: (key, previousPhase) => {
              permissionPhase = rebasePermissionPhase(
                permissionPhase,
                key,
                previousPhase,
                getToAndMessageFields,
              );
            },
            adoptReask: () => {
              return;
            },
          });
        },
      };
    },
    extractSearchText(output) {
      return resumedAgentReport(output);
    },
    renderToolUseMessage(input) {
      if (typeof input.to === "string" && input.to.startsWith("did:") && typeof input.message === "string") {
        let clean = (text) =>
          isNetworkPath(text)
            .replace(/[\s\u2800]+/g, " ")
            .trim();
        let messageText = clean(input.message);
        let charCount = countGraphemes(messageText);
        let truncatedText =
          charCount > 200
            ? `${splitGraphemes(messageText).slice(0, 200).join("")}\u2026 [${charCount} chars total]`
            : messageText;
        return stripNonPrintable(`${clean(input.to)} \u2190 "${truncatedText}"`);
      }
      if (typeof input.message !== "object" || input.message === null) return null;
      if (input.message.type === "plan_approval_response")
        return input.message.approve ? `approve plan from: ${input.to}` : `reject plan from: ${input.to}`;
      return null;
    },
  });
});
//@ chunk-18hwfzwa.js:1670037-1670156 callgraph-fingerprint = handleBroadcast (0.172)
/**
 * 发送者类别：进程内子代理 / 队友（带名字）/ 会话。
 */
function getSenderKind() {
  if (isInProcessTeammate())
    return {
      kind: "in-process",
    };
  if (isTeammate())
    return {
      kind: "teammate",
      agentName: getAgentName(),
    };
  return {
    kind: "session",
  };
}
export { canSubagentSend, getSenderKind, isMessagingLimitedToOwnAgents, SendMessageTool };
