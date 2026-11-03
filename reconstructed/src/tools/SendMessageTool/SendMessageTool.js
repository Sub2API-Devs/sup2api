/**
 * tools/SendMessageTool/SendMessageTool.ts
 *
 * SendMessage 工具：给子代理、队友、主会话、本机/云端其他会话发消息，结构化团队协议（关机、计划审批）与 notify_when_idle 订阅
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/SendMessageTool/SendMessageTool.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-astf3mhy.js (71), chunk-e6aww6q8.js (15)
 * attribution: callgraph-fingerprint 1, sole-consumer 16, affinity 1, fingerprint 9, layout 44, callgraph-witnessed 1, placement 15
 */
import { randomUUID } from "crypto";
import {
  isCrossSessionMessagingEnabled,
  CROSS_SESSION_MESSAGING_DISABLED_MESSAGE,
} from "../../utils/crossSessionMessagingGate.js";
import { LISTAGENTS } from "./listAgents.js";
import {
  classifyPeerSendError,
  kTt,
  TTt,
  UdsSendRefusedError,
  staleSocketHint,
  tsr,
  x3r,
} from "../../utils/udsMessaging/peerGuard.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { runSessionSend, VHi, describeDeliveryResult } from "./deliveryResults.js";
import { ND, Fhr, Hb } from "../../utils/swarm/teammateIds.js";
import {
  uds,
  fdt,
  teamLeadAddress,
  Lhr,
  MAi,
  slugifySessionName,
  d8,
  bOe,
  agentAddressLabel,
  describeSessionLocation,
} from "../../utils/sessionAddresses.js";
import { MAX_HEADER_VALUE_LENGTH, lastPeerHopChain } from "../../utils/peerMessageHeaders.js";
import {
  normalizeSendMessageInput,
  rememberRepair,
  splitRepairedMessage,
  wasRepaired,
  forgetRepair,
} from "../../utils/swarm/teammateMessageRepair.js";
import { Ue, o, Ir, u, T, M } from "../../../vendor/zod/v4/classic/schemas.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { booleanishSchema, coerceBooleanString } from "../../utils/spellcheck.js";
import { SUMMARY_MAX_CHARS, OBSERVABLE_INPUT_FIELDS, SENDMESSAGE, jcs } from "./constants.js";
import { isAgentSwarmsEnabled } from "../../utils/agentSwarmsEnabled.js";
import {
  isTeammate,
  getAgentName,
  getTeamName,
  getTeammateColor,
  getDynamicTeamContext,
  getAgentId,
  isTeamLead,
  isInProcessTeammate,
} from "../../utils/teammate.js";
import { isPlainObject } from "../../utils/isPlainObject.js";
import { isTopHostSession } from "../../utils/sessionShape.js";
import { LOCAL_TASK_ID_PATTERN } from "../../services/analytics/metadata.js";
import { reportSenderIdentity } from "../ObserverReportTool/ObserverReportTool.js";
import { TEAM_LEAD } from "../../utils/swarm/constants.js";
import { readTeamFileAsync } from "../../utils/swarm/teamHelpers.js";
import { getAgentDepth } from "../../utils/agentContext.js";
import { getMaxSubagentSpawnDepth } from "../AgentTool/spawnDepth.js";
import { AGENT } from "../AgentTool/constants.js";
import {
  writeToMailbox,
  createShutdownRequestMessage,
  createShutdownApprovedMessage,
  createShutdownRejectedMessage,
  isStructuredProtocolMessage,
} from "../../utils/teammateMailbox.js";
import { rTo } from "../../utils/swarm/planApprovalWake.js";
import { truncate } from "../../utils/format.js";
import {
  resolveTeammateTask,
  findTeammateTaskByAgentId,
} from "../../tasks/InProcessTeammateTask/InProcessTeammateTask.js";
import {
  readAgentMetadata,
  getCurrentSessionPeerNameFor,
  getCurrentSessionPeerName,
  getCurrentSessionOffBoxPeerName,
} from "../../utils/sessionStorage.js";
import {
  AgentStoppedByUserError,
  AgentStillStoppingError,
  ResumeAgentStateError,
  resumeAgentForReply,
  isResumeDenied,
  AgentResumeInProgressError,
  isResumedInlineRunError,
} from "../AgentTool/resumeAgent.js";
import { Um, Mr } from "../../utils/agentId.js";
import { truncateToLength } from "../../utils/stringUtils.js";
import { TZ, fq } from "../../utils/agentListing.js";
import {
  isHandbackProvenanceEnabled,
  hashTextSections,
  buildHandbackResultContent,
} from "../AgentTool/handbackReport.js";
import {
  RESUMED_NO_REPORT,
  RESUMED_REPORT_FOLLOWS,
  formatResumedAgentResult,
  bHs,
} from "./resumedAgentResult.js";
import { isSillyShoreGateOn } from "../../utils/messages/untrustedArtifactContent.js";
import { jsonStringify, jsonParse } from "../../utils/slowOperations.js";
import { logForDebugging } from "../../utils/debug.js";
import { gracefulShutdown } from "../../utils/gracefulShutdown.js";
import { teammateModeAfterPlan } from "../ExitPlanModeTool/planPreconditions.js";
import { hasLeftProactivityBaseline } from "../../utils/permissions/permissions.js";
import {
  getRemoteSendBlock,
  resolveCrossSessionAddress,
  describeSubagentSender,
  NO_READ_RECEIPT_NOTE,
  NO_READ_RECEIPT_DISPLAY,
  Ivo,
  Pvo,
  renamedSessionNote,
  TRUNCATED_SEARCH_PARAGRAPH,
  EHs,
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
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { createQueueBusyCheck } from "../../utils/messageQueueIdle.js";
import { x8t, freshTurnsForAgent } from "../../utils/messageProvenance.js";
import { logError } from "../../utils/log.js";
import { parseAddress, parsePeerAddress, isValidPipeOrPath } from "../../utils/peerAddress.js";
import { MAIN, xBe, lIt } from "../../utils/sessionPeers.js";
import { buildTool } from "../../services/tools/permissionCheckGuard.js";
import { DESCRIPTION } from "./prompt.js";
import { hasIsolatePeerMachines } from "../../utils/settings/settings.js";
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
import { errorMessage, getErrnoCode } from "../../utils/errors.js";
import {
  isOwnBridgeSession,
  selfTargetMessage,
  WL,
  SELF_TARGET_REASON,
  mayBeOwnSocket,
  $ht,
  isOwnSocket,
  Zsn,
  impersonatedSelfMessage,
  impersonatedSelfShortMessage,
  classifySelfName,
  isSearchComplete,
  selfAliasNote,
} from "./selfTarget.js";
import { setPendingPermissionNote } from "../../utils/permissions/permissionRecord.js";
import { isAutoClassifierActive } from "../../utils/permissions/autoModeState.js";
import { hW } from "../../utils/agentProcessRegistry.js";
import { r$t } from "../../utils/crossSessionInbound/inboundMode.js";
import { s$t } from "../../utils/crossSessionInbound/inboundGate.js";
import { isObserverTask } from "../../services/agentObserver/agentObserver.js";
import {
  resolveDesktopForward,
  forwardToDesktop,
  findRemoteSendTool,
  fs,
  resumeInProcessTeammate,
} from "./_new/resumeInProcessTeammate.js";
import { toolMatchesName } from "../../Tool.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { isUnknownPluginSpawnedAgent } from "../AgentTool/pluginSpawnNote.js";
import { pluginInputHoldReason } from "../../plugins/functionHooks/inputHold.js";
import { Km } from "../../plugins/functionHooks/dispatch/dispatchScope.js";
import { toastStoppedOnce } from "../../plugins/functionHooks/apiCatalog.js";
import { isLocalAgent } from "../../state/teammateViewHelpers.js";
import { enqueueCommand } from "../../utils/messageQueueManager.js";
import { mainAgentId, isCcsTenant } from "../../bootstrap/state.js";
import { clearWaitingNotice, sendMessageToAgent } from "../../tasks/LocalAgentTask/pendingMessages.js";
import { promptIdForRequest } from "../../services/api/claude.js";
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import { isNetworkPath } from "../../utils/fsSafety/networkPathCheck.js";
import { countGraphemes } from "../../ink/output.js";
import { splitGraphemes } from "../../utils/intl.js";
import { getHostAgentPolicy } from "../../utils/hostAgentPolicy.js";

/**
 * 生成 SendMessage 工具提示词：to 的取值表（子代理、主会话、跨会话 worker）、纯文本输出不可见、按名字寻址；启用跨会话时追加跨会话寻址、回复、notify_when_idle 与权限边界说明；团队模式下附旧版协议响应说明。
 */
//@ chunk-astf3mhy.js:22970-28389 sole-consumer
function getSendMessagePrompt(includeProtocol, sessionOnly) {
  let e = isCrossSessionMessagingEnabled()
      ? `
| \`"worker"\` | Any agent from \`${LISTAGENTS}\` \u2014 subagent, another local Claude session |
| \`"worker [3fa9c1]"\` | Same, plus its \`[ref]\` \u2014 only when a listing or an error shows one |`
      : "",
    r = "",
    a = isCrossSessionMessagingEnabled()
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
| \`"main"\` | The main conversation (background subagents only) |${e}`
}

Your plain text output is NOT visible to other agents \u2014 to communicate, you MUST call this tool.${sessionOnly ? "" : " Messages from teammates are delivered automatically; you don't check an inbox."} Refer to agents by name \u2014 names keep working after an agent completes (a send resumes it from its transcript). Use the raw \`agentId\` (format \`a...-...\`) from its spawn result only when the agent has no name, or when a newer agent took the name (latest wins). When relaying, don't quote the original \u2014 it's already rendered to the user.${a}${includeProtocol && !sessionOnly ? '\n\n## Protocol responses (legacy)\n\nIf you receive a JSON message with `type: "shutdown_request"` or `type: "plan_approval_request"`, respond with the matching `_response` type \u2014 echo the `request_id`, set `approve` true/false:\n\n```json\n{"to": "team-lead", "message": {"type": "shutdown_response", "request_id": "...", "approve": true}}\n{"to": "researcher", "message": {"type": "plan_approval_response", "request_id": "...", "approve": false, "feedback": "add error handling"}}\n```\n\nApproving shutdown terminates your process. Rejecting plan sends the teammate back to revise. Don\'t originate `shutdown_request` unless asked. Don\'t send structured JSON status messages \u2014 report progress through your task tools if you have them, otherwise in plain prose.' : ""}
`.trim();
}
/**
 * 把 UDS 发送错误分类为遥测原因：socket 失效、忙、消息过大、发送方限速、目标无效等。
 */
//@ chunk-astf3mhy.js:28426-28889 sole-consumer
function classifyUdsSendError(s) {
  switch (classifyPeerSendError(s)) {
    case "gone":
      return "stale_socket";
    case "busy":
      return "socket_busy";
    case "other":
      break;
  }
  if (kTt(s)) return "too_large";
  if (TTt(s)) return "sender_paced";
  if (s instanceof UdsSendRefusedError)
    switch (s.refusal) {
      case "wrong-endpoint":
        return "stale_socket";
      case "endpoint-unverifiable":
        return "socket_busy";
      case "symlink":
      case "unvettable":
      case "non-local":
        return "invalid_target";
    }
  if (s instanceof Error && s.message.startsWith("Timed out sending")) return "timeout";
  return "other";
}
/**
 * 记录 SendMessage 投递遥测：路由、耗时、错误/降级分类、等待、寻址方式与固定/改名/重启/身份冲突等标记。
 */
//@ chunk-astf3mhy.js:28889-29511 sole-consumer
function logSendDelivery({
  route: route,
  startedAt: startedAt,
  errorClass: errorClass,
  degradedClass: degradedClass,
  blockedWait: blockedWait,
  via: via,
  exactUnique: exactUnique,
  previouslyPinned: previouslyPinned,
  searchTruncated: searchTruncated,
  renamedHint: renamedHint,
  restartedSincePin: restartedSincePin,
  identityContested: identityContested,
  fromSubagent: fromSubagent,
}) {
  let ee = {
    route: fromEnum(route),
    duration_ms: Date.now() - startedAt,
    ...(blockedWait && { blocked_wait: !0 }),
    ...(via !== void 0 && { via: fromEnum(via) }),
    ...(exactUnique && { exact_unique: !0 }),
    ...(previouslyPinned && { previously_pinned: !0 }),
    ...(searchTruncated && { search_truncated: !0 }),
    ...(renamedHint && { renamed_hint: !0 }),
    ...(restartedSincePin && { restarted_since_pin: !0 }),
    ...(identityContested && { identity_contested: !0 }),
    ...(fromSubagent && { from_subagent: !0 }),
  };
  if (errorClass !== void 0) logFeatureBad("send_message_delivery", errorClass, ee);
  else if (degradedClass !== void 0) logFeatureSad("send_message_delivery", degradedClass, ee);
  else logFeatureOk("send_message_delivery", ee);
}
//@ chunk-astf3mhy.js:29511-29655 sole-consumer
var NO_PERMISSION_CHECK_SUFFIX = "and no permission check can run here; nothing was sent.",
  READDRESS_NOT_APPROVED_SUFFIX = "(a plugin hook readdressed this send) was not approved; nothing was sent.";
/**
 * 把文本消息交给插件 session.send 钩子：钩子可直接应答（送达/拒绝）、改写收件人或文本（经重新解析、校验与权限确认），然后投递并回报结果。
 */
//@ chunk-astf3mhy.js:29655-30548 sole-consumer
async function sendThroughHooks(s) {
  let { deps: deps, input: input, toolCall: toolCall, deliver: deliver } = s;
  if (typeof input.message !== "string" || input.message.trim() === "") return deliver(input, toolCall);
  let now = Date.now(),
    { hookCaller: hookCaller } = deps,
    S = await runSessionSend({
      raised: {
        to: input.to,
        text: input.message,
        origin: hookCaller === void 0 ? { kind: "model" } : { kind: "plugin", name: hookCaller },
        ...(deps.agentId !== void 0 && { agentId: deps.agentId }),
      },
      signalOf: () => toolCall.signal,
      skipping: deps.hookOrigin,
    });
  if (S.answered !== void 0) {
    let { answered: answered } = S;
    return (
      logSendDelivery({
        route: "hook",
        startedAt: now,
        ...(answered.isDelivered ? {} : { degradedClass: "hook_refused" }),
      }),
      _s(
        answered.isDelivered
          ? { success: !0, message: VHi }
          : { success: !1, message: `Not sent: a plugin hook refused it (${answered.reason}).` },
      )
    );
  }
  using delivering = S.delivering;
  let P = await applyHookRewrite(s, S.send);
  if (P.refusal !== void 0)
    return (
      logSendDelivery({ route: "hook", startedAt: now, degradedClass: P.degradedClass }),
      delivering.refused(P.refusal),
      _s({ success: !1, message: P.refusal })
    );
  let w = await deliver(P.deliver, toolCall),
    { success: success, message: message } = w.data;
  return (success ? delivering.delivered() : delivering.refused(message), w);
}
//@ chunk-astf3mhy.js:30548-30578 sole-consumer
function _s(s) {
  return { data: s };
}
/**
 * 应用钩子对发送的改写：只改文本时沿用原批准；改收件人时重新解析校验并向用户请求权限，拒绝或无法确认时返回 refusal。
 */
//@ chunk-astf3mhy.js:30578-31504 sole-consumer
async function applyHookRewrite(s, h) {
  let {
      input: input,
      toolCall: toolCall,
      reparse: reparse,
      validate: validate,
      carryApproval: carryApproval,
      adoptReask: adoptReask,
    } = s,
    { to: to, text: text } = h,
    w = to !== input.to,
    F = text !== input.message;
  if (!w && !F) return { deliver: input };
  let { summary: summary, ...ee } = input,
    x = reparse(F ? { ...ee, to: to, message: text } : { ...input, to: to }),
    re = x === void 0 ? void 0 : await validate(x, toolCall),
    se = re?.result === !1;
  if (x === void 0 || se)
    return {
      refusal: `A plugin hook rewrote this send into one the tool refuses (${se ? re.message : "a shape SendMessage does not accept"}); nothing was sent.`,
      degradedClass: "hook_refused",
    };
  if (!w) return (carryApproval(input, x), { deliver: x });
  let { ask: ask } = toolCall;
  if (ask === void 0)
    return {
      refusal: `A plugin hook readdressed this send to '${to}' ` + NO_PERMISSION_CHECK_SUFFIX,
      degradedClass: "hook_refused",
    };
  let n = randomUUID(),
    we = await ask(x, { toolUseId: n });
  adoptReask(n, x);
  let ie = `Sending to '${to}' ${READDRESS_NOT_APPROVED_SUFFIX}`;
  switch (we.behavior) {
    case "allow":
      return checkHandlerRewrite(x, we.updatedInput, reparse);
    case "deny":
      return { refusal: we.message || ie, degradedClass: "permission_denied" };
    default:
      return { refusal: ie, degradedClass: "permission_denied" };
  }
}
/**
 * 检查权限处理器对发送输入的改写：形状不被接受、收件人被改或消息被改为非文本时拒绝发送并说明，否则返回改写后的输入。
 */
//@ chunk-astf3mhy.js:31504-32180 sole-consumer
function checkHandlerRewrite(s, h, e) {
  let r = h === void 0 ? s : e(h);
  if (r === void 0)
    return {
      refusal:
        "The permission handler narrowed the input to a shape SendMessage " +
        "does not accept \u2014 nothing was sent.",
      degradedClass: "handler_rewrite",
    };
  if (r.to !== s.to)
    return {
      refusal:
        `The permission handler changed the recipient (from '${s.to}') after this send was approved \u2014 nothing was ` +
        "sent. Send again to the recipient you intend.",
      degradedClass: "handler_rewrite",
    };
  return typeof r.message === "string"
    ? { deliver: r }
    : {
        refusal:
          "The permission handler rewrote the message into a structured " +
          "(non-text) form, which a rewritten send cannot carry \u2014 " +
          "nothing was sent.",
        degradedClass: "handler_rewrite",
      };
}
//@ chunk-astf3mhy.js:32180-32251 sole-consumer
var REQUEST_ID_EXTRA_CHARS = 100,
  MAX_REQUEST_ID_CHARS = ND + REQUEST_ID_EXTRA_CHARS,
  RECIPIENT_EXTRA_CHARS = 2 + uds + 1,
  max = Math.max(ND + RECIPIENT_EXTRA_CHARS, MAX_HEADER_VALUE_LENGTH),
  SINGLE_LINE_RE = /^[^\n\r]*$/u;
//@ chunk-astf3mhy.js:32251-32310 sole-consumer
function maxLengthRegex(s) {
  return new RegExp(`^[\\s\\S]{0,${s}}$`, "u");
}
//@ chunk-astf3mhy.js:32310-32334 sole-consumer
var REQUEST_ID_LENGTH_RE = maxLengthRegex(MAX_REQUEST_ID_CHARS),
  RECIPIENT_LENGTH_RE = maxLengthRegex(max);
//@ chunk-astf3mhy.js:32334-32372 sole-consumer
function getToAndMessageFields(s) {
  return [s.to, s.message];
}
//@ chunk-astf3mhy.js:32372-32400 sole-consumer
function getToField(s) {
  return [s.to];
}
/**
 * 对象是否带 kind 字段（误配名 extractMarkupText）。
 */
//@ chunk-astf3mhy.js:32400-32464 sole-consumer = extractMarkupText (1)
function extractMarkupText(contents) {
  return typeof contents === "object" && contents !== null && "kind" in contents;
}
/**
 * coerceInput 后按当前 schema 重新解析 SendMessage 输入。
 */
//@ chunk-astf3mhy.js:32464-32571 sole-consumer
function reparseSendMessageInput(rawInput) {
  let h = normalizeSendMessageInput(rawInput, { applySplit: os() }),
    safeParse = getSendMessageInputSchema().safeParse(h?.input ?? rawInput);
  return safeParse.success ? safeParse.data : void 0;
}
/**
 * toolState 键：正在恢复的代理 id → 任务 Promise，避免并发重复恢复。
 */
//@ chunk-astf3mhy.js:32571-32593 sole-consumer
class qs extends Map {}
//@ chunk-astf3mhy.js:32593-32632 affinity
function messageFieldSchema(description) {
  return Ue([plainMessageSchema(description), StructuredMessageSchema()]);
}
//@ chunk-astf3mhy.js:32632-32700 fingerprint = inputSchema (0.61)
function plainMessageSchema(s) {
  return o().describe(s ?? "Plain text message content");
}
/**
 * 结构化消息 schema：shutdown_request{reason?} / shutdown_response{request_id, approve, reason?} / plan_approval_response{request_id, approve, feedback?}；及跨会话 message 字段说明与默认值。
 */
//@ chunk-astf3mhy.js:32700-33558 fingerprint = StructuredMessage (0.489)
var PLAIN_MESSAGE_DESCRIPTION =
    "Plain text message content. The recipient's human sees only the FIRST LINE as a one-line preview until they expand it, so make the first line a " +
    "clear, self-contained sentence saying what this is about \u2014 not a greeting, " +
    "preamble, or bare @-mention.",
  EMPTY_MESSAGE_DEFAULT = "",
  StructuredMessageSchema = DoctorLazy(() =>
    Ir("type", [
      u({ type: T("shutdown_request"), reason: o().optional() }),
      u({
        type: T("shutdown_response"),
        request_id: o()
          .min(1, "must be the request id being responded to")
          .regex(SINGLE_LINE_RE, "must be a single-line request id")
          .regex(
            REQUEST_ID_LENGTH_RE,
            `request id longer than any real one (max ${MAX_REQUEST_ID_CHARS} characters)`,
          ),
        approve: booleanishSchema(),
        reason: o().optional(),
      }),
      u({
        type: T("plan_approval_response"),
        request_id: o()
          .min(1, "must be the request id being responded to")
          .regex(SINGLE_LINE_RE, "must be a single-line request id")
          .regex(
            REQUEST_ID_LENGTH_RE,
            `request id longer than any real one (max ${MAX_REQUEST_ID_CHARS} characters)`,
          ),
        approve: booleanishSchema(),
        feedback: o().optional(),
      }),
    ]),
  );
/**
 * 构造 SendMessage 输入 schema：to（单行、限长）、summary（≤200，超长截断）、message（纯文本或结构化），跨会话版本额外有 notify_when_idle。
 */
//@ chunk-astf3mhy.js:33558-34775 layout
function buildSendMessageInputSchema(crossSession) {
  return u({
    to: o()
      .regex(SINGLE_LINE_RE, "must be a single-line recipient name or address")
      .regex(RECIPIENT_LENGTH_RE, `recipient longer than any listed name or address (max ${max} characters)`)
      .describe(
        crossSession
          ? `Recipient: a name from ${LISTAGENTS} (append its " [ref]" only when a listing or an error shows one), a teammate name, "main", or a background agent's agentId`
          : `Recipient: a background agent's name or agentId, a teammate name, or "main"`,
      ),
    summary: o()
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
      notify_when_idle: booleanishSchema(M().optional()).describe(
        "Ask a session ON THIS MACHINE to send you ONE notice when it next goes idle (finishes its turn with nothing queued) or exits \u2014 opt-in, one-shot, no polling. With a message: deliver it now AND subscribe. Without a message (omit it): a pure subscription that costs the other session nothing.",
      ),
    }),
  });
}
/**
 * SendMessage 输入 schema 的五个变体（本地/跨会话 × 是否允许结构化，及仅本会话代理版本）。
 */
//@ chunk-astf3mhy.js:34775-35045 layout
var localSendMessageSchema = DoctorLazy(() => buildSendMessageInputSchema(!1)),
  crossSessionSendMessageSchema = DoctorLazy(() => buildSendMessageInputSchema(!0)),
  plainLocalSendMessageSchema = DoctorLazy(() =>
    localSendMessageSchema().extend({ message: plainMessageSchema() }),
  ),
  plainCrossSessionSendMessageSchema = DoctorLazy(() =>
    crossSessionSendMessageSchema().extend({
      message: plainMessageSchema(PLAIN_MESSAGE_DESCRIPTION).default(EMPTY_MESSAGE_DEFAULT),
    }),
  ),
  ownAgentsOnlySendMessageSchema = DoctorLazy(() =>
    plainLocalSendMessageSchema().extend({
      to: plainLocalSendMessageSchema().shape.to.describe(
        'Recipient: the name or agentId of an agent of this session, or "main" (from a subagent)',
      ),
    }),
  );
/**
 * 选择 SendMessage 输入 schema：messagingBeyondOwnAgentsDisabled → 只能发本会话代理；跨会话开关（tengu_harbor_kite / CLAUDE_CODE_HARBOR_KITE）开 → 含 notify_when_idle 的跨会话版本；agent swarms 决定 message 能否为结构化对象。
 */
//@ chunk-astf3mhy.js:35045-35131 layout
function getSendMessageInputSchema() {
  if (e6()) return ownAgentsOnlySendMessageSchema();
  if (isCrossSessionMessagingEnabled())
    return isAgentSwarmsEnabled() ? crossSessionSendMessageSchema() : plainCrossSessionSendMessageSchema();
  return isAgentSwarmsEnabled() ? localSendMessageSchema() : plainLocalSendMessageSchema();
}
/**
 * UDS（本机会话）发送失败原因映射为遥测 errorClass。
 */
//@ chunk-astf3mhy.js:35131-35506 layout
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
      return outcome.error !== void 0 ? classifyUdsSendError(outcome.error) : "other";
    case "cap":
      return "subscription_cap";
  }
}
/**
 * 记录 UDS 发送结果遥测。
 */
//@ chunk-astf3mhy.js:35506-35694 layout
function emitUdsSendOutcome(outcome, emit, extra = {}) {
  if (outcome.ok) return;
  let r =
    outcome.reason === "send-uncertain" ||
    outcome.reason === "requester-refuses-inbound" ||
    outcome.reason === "cap";
  emit("uds", r ? void 0 : classifyUdsSendFailure(outcome), {
    ...(r && { degradedClass: classifyUdsSendFailure(outcome) }),
    ...extra,
  });
}
/**
 * 跨会话发送时消息为空的处理：处理器改写、未订阅或主体被拒分别返回失败结果。
 */
//@ chunk-astf3mhy.js:35694-35977 layout
function checkEmptyCrossSessionMessage({
  input: input,
  plainMessage: plainMessage,
  notify: notify,
  refusedForPrincipal: refusedForPrincipal,
  assistantMessage: assistantMessage,
  toolUseId: toolUseId,
  emit: emit,
}) {
  if (plainMessage.trim().length > 0) return;
  if (wasEmptiedByHandler(input, assistantMessage, toolUseId))
    return (
      emit("uds", "handler_rewrite"),
      wantsNotifyWhenIdle(input)
        ? refusedForPrincipal
          ? EMPTIED_MESSAGE_SHORT_RESULT
          : EMPTIED_MESSAGE_RESULT
        : NOTHING_TO_SEND_RESULT
    );
  if (!notify) {
    if (refusedForPrincipal) Je();
    return (
      emit("uds", refusedForPrincipal ? "permission_denied" : "empty_message"),
      emptyMessageResult(refusedForPrincipal)
    );
  }
  return;
}
/**
 * notify_when_idle 资格：只有主会话可以订阅；子代理/队友请求时标记 refusedForPrincipal。
 */
//@ chunk-astf3mhy.js:35977-36109 layout
function getNotifyIdleEligibility(input, deps) {
  let e = wantsNotifyWhenIdle(input),
    r = e && (deps.agentId !== void 0 || deps.teammateContext !== void 0 || isTeammate());
  return { notify: e && !r, refusedForPrincipal: r };
}
//@ chunk-astf3mhy.js:36109-36144 layout
var EMPTY_MESSAGE_ERROR = "message must not be empty";
//@ chunk-astf3mhy.js:36144-36219 layout
function Je() {
  logFeatureSad("cross_session_notify_idle", "subscribe_refused_principal");
}
/**
 * 消息被权限处理器清空（现为空、原始有内容或订阅）。
 */
//@ chunk-astf3mhy.js:36219-36385 layout
function wasEmptiedByHandler(input, assistantMessage, toolUseId) {
  if (typeof input.message === "string" && input.message.trim().length > 0) return !1;
  let r = getOriginalToolUseInput(assistantMessage, toolUseId)?.message;
  return (
    (typeof r === "string" && r.trim().length > 0) ||
    wasNotifyStrippedByHandler(input, assistantMessage, toolUseId)
  );
}
/**
 * notify_when_idle 被权限处理器去掉。
 */
//@ chunk-astf3mhy.js:36385-36453 layout
function wasNotifyStrippedByHandler(input, assistantMessage, toolUseId) {
  return (
    !wantsNotifyWhenIdle(input) &&
    coerceBooleanString(getOriginalToolUseInput(assistantMessage, toolUseId)?.notify_when_idle) === !0
  );
}
//@ chunk-astf3mhy.js:36453-36496 layout
function _t(input, assistantMessage, toolUseId) {
  return wantsNotifyWhenIdle(input) || wasNotifyStrippedByHandler(input, assistantMessage, toolUseId);
}
/**
 * 从发出的 assistant 消息里找到该 tool_use 的原始 message/notify_when_idle（判断权限处理器是否改写过）。
 */
//@ chunk-astf3mhy.js:36496-36907 layout
function getOriginalToolUseInput(assistantMessage, toolUseId) {
  if (toolUseId === void 0 || !Array.isArray(assistantMessage.message.content)) return;
  let found = assistantMessage.message.content.find((b) => b.type === "tool_use" && b.id === toolUseId);
  if (found === void 0 || found.type !== "tool_use") return;
  let input = found.input;
  if (typeof input !== "object" || input === null) return;
  let a = normalizeSendMessageInput(input, { applySplit: os() }),
    y = a !== null && isPlainObject(a.input) ? a.input : input;
  return {
    message: "message" in y ? y.message : void 0,
    notify_when_idle: "notify_when_idle" in y ? y.notify_when_idle : void 0,
  };
}
//@ chunk-astf3mhy.js:36907-36964 layout
function emptyMessageResult(refusedForPrincipal) {
  return {
    data: { success: !1, message: refusedForPrincipal ? NOTIFY_IDLE_MAIN_ONLY_ERROR : EMPTY_MESSAGE_ERROR },
  };
}
/**
 * 输入中 notify_when_idle 为真。
 */
//@ chunk-astf3mhy.js:36964-37052 layout
function wantsNotifyWhenIdle(input) {
  if (!("notify_when_idle" in input)) return !1;
  return coerceBooleanString(input.notify_when_idle) === !0;
}
//@ chunk-astf3mhy.js:37052-37284 layout
var NOTIFY_IDLE_SCOPE_ERROR =
    "notify_when_idle is only supported for Claude sessions on this machine in this release (not teammates, subagents, Remote Control or cloud sessions).",
  Ts = `
The message was delivered, but no idle subscription was made: ${NOTIFY_IDLE_SCOPE_ERROR}`;
/**
 * local_<uuid> 形式的本机桌面会话地址。
 */
//@ chunk-astf3mhy.js:37284-37324 layout
function isLocalSessionAddress(address) {
  return isTopHostSession() && LOCAL_TASK_ID_PATTERN.test(address);
}
/**
 * 权限处理器清空或改写发送内容时返回的失败结果（未发送、未订阅空闲通知）。
 */
//@ chunk-astf3mhy.js:37324-37862 layout
var EMPTIED_MESSAGE_RESULT = {
    data: {
      success: !1,
      message:
        "A permission handler emptied this message; nothing was sent, and no idle subscription was made (a blanked delivery is never reinterpreted as a pure subscription \u2014 send notify_when_idle without a message if that is what you want).",
    },
  },
  EMPTIED_MESSAGE_SHORT_RESULT = {
    data: {
      success: !1,
      message:
        "A permission handler emptied this message; nothing was sent, and no idle subscription was made.",
    },
  },
  NOTHING_TO_SEND_RESULT = {
    data: {
      success: !1,
      message:
        "A permission handler rewrote this call so that nothing was left to send or subscribe; nothing was sent.",
    },
  };
//@ chunk-astf3mhy.js:37862-37942 layout
function Ns(s, h) {
  if (typeof s === "string" && s.trim().length > 0) return;
  return (h(), NOTHING_TO_SEND_RESULT);
}
/**
 * 空闲订阅相关说明：消息未送达需重发、只有主对话能订阅 notify_when_idle、订阅被权限处理器移除等（含展示版）。
 */
//@ chunk-astf3mhy.js:37942-38531 layout
var NOT_DELIVERED_RETRY_NOTE =
    " Your message was NOT delivered; send it again without notify_when_idle if it should still go.",
  NOTIFY_IDLE_MAIN_ONLY_ERROR =
    "notify_when_idle is only available from the main conversation of this session (not from a subagent or teammate).",
  SUBSCRIPTION_MAIN_ONLY_NOTE = `
The message was delivered, but no idle subscription was made: ${NOTIFY_IDLE_MAIN_ONLY_ERROR}`,
  SUBSCRIPTION_MAIN_ONLY_DISPLAY =
    "No idle subscription was made (only the main conversation can subscribe).",
  SUBSCRIPTION_STRIPPED_NOTE = `
The message was delivered, but no idle subscription was made: a permission handler removed notify_when_idle from this call.`,
  SUBSCRIPTION_STRIPPED_DISPLAY =
    "No idle subscription was made (a permission handler removed it from the call).";
//@ chunk-astf3mhy.js:38531-38697 layout
function describeSkippedSubscription(s, h, e, r) {
  if (s) return { model: SUBSCRIPTION_MAIN_ONLY_NOTE, display: SUBSCRIPTION_MAIN_ONLY_DISPLAY };
  if (wasNotifyStrippedByHandler(h, e, r))
    return (
      logFeatureSad("cross_session_notify_idle", "subscribe_stripped_by_handler"),
      { model: SUBSCRIPTION_STRIPPED_NOTE, display: SUBSCRIPTION_STRIPPED_DISPLAY }
    );
  return;
}
/**
 * 说明为何也没有建立空闲订阅：非主对话、被权限处理器移除，或带消息时需消息送达后才订阅。
 */
//@ chunk-astf3mhy.js:38697-39031 layout
function describeNoSubscription(s, h, e, r) {
  if (s)
    return `
Nothing was subscribed either: ${NOTIFY_IDLE_MAIN_ONLY_ERROR}`;
  if (wasNotifyStrippedByHandler(h, e, r))
    return `
Nothing was subscribed either: a permission handler removed notify_when_idle from this call.`;
  return wantsNotifyWhenIdle(h)
    ? `
Nothing was subscribed either (when a message rides along, the idle subscription is only made after that message is delivered).`
    : "";
}
/**
 * 在 teamContext 中按名字找队友颜色。
 */
//@ chunk-astf3mhy.js:39031-39170 fingerprint = findTeammateColor (1)
function findTeammateColor(appState, name) {
  let teammates = appState.teamContext?.teammates;
  if (!teammates) return;
  for (let teammate of Object.values(teammates))
    if ("name" in teammate && teammate.name === name) return teammate.color;
  return;
}
/**
 * 确定 SendMessage 的发送者身份：队友用自己的 agentName；否则在名字注册表里找到代理 id 对应的名字并结合任务信息生成 {from, displayName}。
 */
//@ chunk-astf3mhy.js:39170-39407 layout
function resolveSenderIdentity(s, h) {
  let agentContext = s.agentContext;
  if (agentContext?.agentType === "teammate" && agentContext.agentName)
    return { from: agentContext.agentName, displayName: agentContext.agentName };
  let resolverState = s.resolverState(),
    a;
  for (let [y, b] of resolverState.agentNameRegistry)
    if (b === h) {
      a = y;
      break;
    }
  return reportSenderIdentity(h, a, resolverState.tasks[h]);
}
//@ chunk-astf3mhy.js:39407-39547 layout
var CANNOT_RECEIVE_RESULT = {
  data: {
    success: !1,
    message:
      "That agent cannot receive messages (it is a background observer, or its status could not be verified).",
  },
};
/**
 * 消息发送者名字：有 agentId 时按代理解析，否则用当前代理名，teammate 用 "teammate"，否则 team-lead。
 */
//@ chunk-astf3mhy.js:39547-39637 layout = isTeammateAgentContext (0.828)
function getMessageSenderName(toolUseContext) {
  if (toolUseContext.agentId) return resolveSenderIdentity(toolUseContext, toolUseContext.agentId).from;
  return getAgentName() || (isTeammate() ? "teammate" : TEAM_LEAD);
}
/**
 * 把消息写入团队队友的邮箱：按名字/成员 id 解析团队成员（必要时读团队文件），写 mailbox 并返回 routing 信息；队友不存在时提示用 Agent({name}) 派生。
 */
//@ chunk-astf3mhy.js:39637-42328 fingerprint = handleMessage (0.316)
async function handleMessage(recipientName, text, summary, deps, memberAgentId, memberIdentitySource) {
  let resolverState = deps.resolverState(),
    teamName = getTeamName(resolverState.teamContext);
  if (!teamName)
    return {
      data: {
        success: !1,
        message: `No agent named '${recipientName}' is currently addressable. Spawn a new one or use the agent ID.`,
      },
      errorClass: "not_reachable",
    };
  let N = recipientName;
  if (recipientName !== TEAM_LEAD || memberAgentId !== void 0) {
    let ee = resolverState.teamContext?.teammates ?? {},
      x =
        memberAgentId !== void 0 &&
        memberIdentitySource === "team-context" &&
        Object.hasOwn(ee, memberAgentId)
          ? ee[memberAgentId]
          : void 0,
      re = memberAgentId === void 0 && Object.values(ee).some((se) => se.name === recipientName);
    if (x !== void 0) N = x.name;
    else if (memberAgentId !== void 0 && memberIdentitySource === "team-context")
      return {
        data: {
          success: !1,
          message: `The member this message was resolved to has left team '${teamName}' \u2014 nothing was sent. Another member may share the same display name '${recipientName}', so a bare re-send could reach someone you did not choose: pick again explicitly with a fresh 'name [ref]', or message the lead.`,
        },
        errorClass: "not_reachable",
      };
    else if (!re) {
      let se = await readTeamFileAsync(teamName, deps.storageV5);
      if (se !== null) {
        let ge =
          memberAgentId !== void 0
            ? fdt(se, teamLeadAddress(deps.resolverState())).filter((we) => we.agentId === memberAgentId)
            : [];
        if (ge.length > 1)
          return {
            data: {
              success: !1,
              message: `The team roster lists the member this message was resolved to more than once \u2014 nothing was sent. Ask the lead to repair team '${teamName}''s file.`,
            },
            errorClass: "not_reachable",
          };
        let n =
          memberAgentId !== void 0
            ? ge[0]
            : Lhr(fdt(se, teamLeadAddress(deps.resolverState())), recipientName);
        if (n === void 0) {
          if (memberAgentId !== void 0)
            return {
              data: {
                success: !1,
                message: `The member this message was resolved to has left team '${teamName}' \u2014 nothing was sent. Another member may share the same display name '${recipientName}', so a bare re-send could reach someone you did not choose: pick again explicitly with a fresh 'name [ref]', or message the lead.`,
              },
              errorClass: "not_reachable",
            };
          return {
            data: {
              success: !1,
              message:
                getAgentDepth(deps.agentContext) < getMaxSubagentSpawnDepth()
                  ? `No teammate named '${recipientName}' is currently on team '${teamName}'. Spawn one with ${AGENT}({name: '${recipientName}'}) \u2014 or message the lead to do so.`
                  : `No teammate named '${recipientName}' is currently on team '${teamName}'. Message the lead to spawn one.`,
            },
            errorClass: "not_reachable",
          };
        }
        N = n.name;
      } else if (memberAgentId !== void 0)
        return {
          data: {
            success: !1,
            message: `Couldn't read the roster of team '${teamName}' to locate the member this message was resolved to \u2014 nothing was sent. Try again, or message the lead.`,
          },
          errorClass: "not_reachable",
        };
    }
  }
  let P = getMessageSenderName(deps),
    senderColor = getTeammateColor(),
    F = await writeToMailbox(
      N,
      {
        from: P,
        text: text,
        summary: summary,
        timestamp: new Date().toISOString(),
        color: senderColor,
        ...(deps.hookCaller !== void 0 && { from_plugin: deps.hookCaller }),
      },
      teamName,
      deps.storageV5,
    );
  if (F === void 0)
    return {
      data: {
        success: !1,
        message: `Failed to write to ${recipientName}'s inbox \u2014 nothing was sent. Try again, or message the lead.`,
      },
      errorClass: "mailbox_write_failed",
    };
  rTo(deps.resolverState().tasks, N, teamName);
  let recipientColor = findTeammateColor(resolverState, N);
  return {
    data: {
      success: !0,
      message: `Message sent to ${recipientName}'s inbox`,
      msg_id: F,
      routing: {
        sender: P,
        senderColor: senderColor,
        target: `@${recipientName}`,
        targetColor: recipientColor,
        summary: summary,
        content: truncate(text, 50),
      },
    },
  };
}
/**
 * 给运行中的进程内队友排队消息（写邮箱并唤醒）。
 */
//@ chunk-astf3mhy.js:42328-42851 layout
async function queueToRunningTeammate(teammateTask, text, summary, deps, displayName, extraData) {
  let b = await writeToMailbox(
    teammateTask.identity.agentName,
    {
      from: getMessageSenderName(deps),
      text: text,
      summary: summary,
      timestamp: new Date().toISOString(),
      color: getTeammateColor(),
      ...(deps.hookCaller !== void 0 && { from_plugin: deps.hookCaller }),
    },
    teammateTask.identity.teamName,
    deps.storageV5,
  );
  if (b === void 0)
    return {
      data: {
        success: !1,
        message: `Teammate "${displayName}" is running, but writing to its inbox failed \u2014 nothing was queued. Try again.`,
      },
    };
  return (
    teammateTask.retryWake?.emit(),
    {
      data: {
        success: !0,
        message: `Teammate "${displayName}" is already running; queued your message for its next turn.`,
        msg_id: b,
        ...extraData,
      },
    }
  );
}
/**
 * 判断停止的代理是队友还是子代理（任务表/转录元数据）。
 */
//@ chunk-astf3mhy.js:42851-43128 layout
async function classifyStoppedAgentKind(agentId, deps) {
  if (resolveTeammateTask(agentId, deps.resolverState().tasks).status !== "not_found") return "teammate";
  let e = await readAgentMetadata(agentId, deps.storageV5).catch(() => "unreadable");
  if (e === "unreadable") return e;
  if (typeof e?.agentType !== "string") return "unknown";
  return e.taskKind === void 0 ? "subagent" : "teammate";
}
/**
 * 恢复已停止代理失败的分类（not_reachable/still_stopping/no_transcript/resume_failed）。
 */
//@ chunk-astf3mhy.js:43128-43290 layout
function classifyResumeError(error) {
  if (error instanceof AgentStoppedByUserError) return "not_reachable";
  if (error instanceof AgentStillStoppingError) return "still_stopping";
  if (error instanceof ResumeAgentStateError) return "no_transcript";
  return "resume_failed";
}
//@ chunk-astf3mhy.js:43290-43328 layout
function Ze(name) {
  return Um(name) ? truncateToLength(name, 7) : name;
}
/**
 * 被消息唤醒的子代理完成后，把其报告作为 inlineHandback 交回调用方。
 */
//@ chunk-astf3mhy.js:43328-43832 layout
function buildInlineHandback(displayName, report, context) {
  let r = TZ(report.toolsUsed ?? [], context.messages),
    a =
      r === void 0 ||
      report.content.length === 0 ||
      report.handback !== void 0 ||
      context.innerCall === !0 ||
      !isHandbackProvenanceEnabled()
        ? report.content
        : [
            {
              type: "text",
              text: `${r}
`,
            },
            ...report.content,
          ];
  return {
    message: RESUMED_NO_REPORT,
    inlineHandback: {
      displayName: Ze(displayName),
      content: a,
      harnessNoteCount: a === report.content ? report.harnessNoteCount : (report.harnessNoteCount ?? 0) + 1,
      harnessTailCount: report.harnessTailCount,
      harnessSectionHash: a === report.content ? report.harnessSectionHash : hashTextSections(a),
      ...(isSillyShoreGateOn() &&
        report.toolsUsed !== void 0 &&
        report.toolsUsed.length > 0 && { toolsUsed: report.toolsUsed }),
    },
  };
}
/**
 * 向队友发送 shutdown_request（写邮箱，返回 request_id）。
 */
//@ chunk-astf3mhy.js:43832-44385 fingerprint = handleShutdownRequest (0.722)
async function handleShutdownRequest(s, h, e, r) {
  let resolverState = r.resolverState(),
    y = getTeamName(resolverState.teamContext),
    teamName = getMessageSenderName(r),
    requestId = Fhr("shutdown", h),
    shutdownMessage = createShutdownRequestMessage({ requestId: requestId, from: teamName, reason: e });
  if (
    (await writeToMailbox(
      s,
      {
        from: teamName,
        text: jsonStringify(shutdownMessage),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      },
      y,
      r.storageV5,
    )) === void 0
  )
    return {
      data: {
        success: !1,
        message: `Failed to write the shutdown request to ${h}'s inbox \u2014 nothing was sent.`,
        request_id: requestId,
        target: h,
      },
    };
  if (y) rTo(r.resolverState().tasks, s, y);
  if (r.hookCaller === void 0) rememberRepair(requestId, s);
  return {
    data: {
      success: !0,
      message: `Shutdown request sent to ${h}. Request ID: ${requestId}`,
      request_id: requestId,
      target: h,
    },
  };
}
/**
 * 队友批准关机：向 team-lead 写确认，进程内队友中止自己的循环，pane 队友结束进程。只有队友身份能调用。
 */
//@ chunk-astf3mhy.js:44385-46236 fingerprint = handleShutdownApproval (0.793)
async function handleShutdownApproval(requestId, context) {
  if (context.teammateContext === void 0 && !getDynamicTeamContext())
    throw new SendMessagePreconditionError(
      "Only a teammate can approve a shutdown request, and this session is not running as one. Nothing was sent. To shut down a teammate, send that teammate a shutdown_request message. The teammate is the one that approves it.",
    );
  let teamName = getTeamName(),
    agentId = getAgentId(),
    agentName = getAgentName() || "teammate";
  logForDebugging(
    `[SendMessageTool] handleShutdownApproval: teamName=${teamName}, agentId=${agentId}, agentName=${agentName}`,
  );
  let y, b;
  if (teamName) {
    let F = await readTeamFileAsync(teamName, context.storageV5);
    if (F && agentId) {
      let selfMember = F.members.find((member) => member.agentId === agentId);
      if (selfMember) ((y = selfMember.tmuxPaneId), (b = selfMember.backendType));
    }
  }
  let approvedMessage = createShutdownApprovedMessage({
      requestId: requestId,
      from: agentName,
      paneId: y,
      backendType: b,
    }),
    N = await writeToMailbox(
      TEAM_LEAD,
      {
        from: agentName,
        text: jsonStringify(approvedMessage),
        timestamp: new Date().toISOString(),
        color: getTeammateColor(),
      },
      teamName,
      context.storageV5,
    ),
    P =
      N === void 0
        ? "The confirmation could not be written to team-lead's inbox."
        : "Sent confirmation to team-lead.",
    w = N === void 0 ? { degradedClass: "mailbox_write_failed" } : void 0;
  if (context.teammateContext !== void 0)
    (logForDebugging(
      `[SendMessageTool] In-process teammate ${agentName} approving shutdown - aborting its own loop`,
    ),
      context.teammateContext.abortController.abort());
  else if (b === "in-process") {
    if (
      (logForDebugging(
        `[SendMessageTool] In-process teammate ${agentName} approving shutdown - signaling abort`,
      ),
      agentId)
    ) {
      let resolverState = context.resolverState(),
        task = findTeammateTaskByAgentId(agentId, resolverState.tasks);
      if (task?.abortController)
        (task.abortController.abort(),
          logForDebugging(`[SendMessageTool] Aborted controller for in-process teammate ${agentName}`));
      else logForDebugging(`[SendMessageTool] Warning: Could not find task/abortController for ${agentName}`);
    }
  } else {
    if (agentId) {
      let resolverState = context.resolverState(),
        task = findTeammateTaskByAgentId(agentId, resolverState.tasks);
      if (task?.abortController)
        return (
          logForDebugging(
            `[SendMessageTool] Fallback: Found in-process task for ${agentName} via AppState, aborting`,
          ),
          task.abortController.abort(),
          {
            data: {
              success: !0,
              message: `Shutdown approved (fallback path). Agent ${agentName} is now exiting.`,
              request_id: requestId,
            },
            ...w,
          }
        );
    }
    setImmediate(async () => {
      await gracefulShutdown(0, "other");
    });
  }
  return {
    data: {
      success: !0,
      message: `Shutdown approved. ${P} Agent ${agentName} is now exiting.`,
      request_id: requestId,
    },
    ...w,
  };
}
/**
 * 队友拒绝关机：向 team-lead 写拒绝消息（必须带 reason）。
 */
//@ chunk-astf3mhy.js:46236-46688 fingerprint = handleShutdownRejection (0.883)
async function handleShutdownRejection(s, h, e) {
  let teamName = getTeamName(),
    agentName = getAgentName() || "teammate",
    rejectedMessage = createShutdownRejectedMessage({ requestId: s, from: agentName, reason: h });
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
      e.storageV5,
    )) === void 0
  )
    return {
      data: {
        success: !1,
        message:
          "Failed to write the shutdown rejection to team-lead's inbox \u2014 nothing was sent. Try again.",
        request_id: s,
      },
    };
  return {
    data: {
      success: !0,
      message: `Shutdown rejected. Reason: "${truncate(h, 50)}". Continuing to work.`,
      request_id: s,
    },
  };
}
/**
 * SendMessagePreconditionError：调用身份不满足（如非队友批准关机）。
 */
//@ chunk-astf3mhy.js:46688-46777 layout
class SendMessagePreconditionError extends Error {
  constructor(s) {
    super(s);
    this.name = "SendMessagePreconditionError";
  }
}
/**
 * team-lead 批准队友的计划（plan_approval_response approve=true），写入队友邮箱。
 */
//@ chunk-astf3mhy.js:46777-47639 fingerprint = handlePlanApproval (0.652)
async function handlePlanApproval(s, h, e, r, a) {
  let resolverState = a.resolverState(),
    teamName = resolverState.teamContext?.teamName;
  if (!isTeamLead(resolverState.teamContext))
    throw new SendMessagePreconditionError(
      "Only the team lead can approve plans. Teammates cannot approve their own or other plans.",
    );
  let permissions = a.permissions(),
    N = teammateModeAfterPlan({
      recipientName: s,
      leaderMode: permissions.mode,
      leaderAutoPickedByLevel: hasLeftProactivityBaseline(permissions),
      proactivityLevel: a.proactivitySetting(),
      tasks: resolverState.tasks,
    }),
    P = {
      type: "plan_approval_response",
      requestId: e,
      approved: !0,
      ...(r !== void 0 && { feedback: r }),
      timestamp: new Date().toISOString(),
      permissionMode: N,
    };
  if (
    (await writeToMailbox(
      s,
      { from: TEAM_LEAD, text: jsonStringify(P), timestamp: new Date().toISOString() },
      teamName,
      a.storageV5,
    )) === void 0
  )
    return {
      data: {
        success: !1,
        message: `Failed to write the plan approval to ${h}'s inbox \u2014 nothing was sent. Try again.`,
        request_id: e,
      },
    };
  return {
    data: {
      success: !0,
      message: `Plan approved for ${h}. They will receive the approval and can proceed with implementation.`,
      request_id: e,
    },
  };
}
/**
 * team-lead 拒绝队友的计划并附反馈。
 */
//@ chunk-astf3mhy.js:47639-48281 fingerprint = handlePlanRejection (0.827)
async function handlePlanRejection(s, h, e, r, a) {
  let resolverState = a.resolverState(),
    teamName = resolverState.teamContext?.teamName;
  if (!isTeamLead(resolverState.teamContext))
    throw new SendMessagePreconditionError(
      "Only the team lead can reject plans. Teammates cannot reject their own or other plans.",
    );
  let rejectionResponse = {
    type: "plan_approval_response",
    requestId: e,
    approved: !1,
    feedback: r,
    timestamp: new Date().toISOString(),
  };
  if (
    (await writeToMailbox(
      s,
      { from: TEAM_LEAD, text: jsonStringify(rejectionResponse), timestamp: new Date().toISOString() },
      teamName,
      a.storageV5,
    )) === void 0
  )
    return {
      data: {
        success: !1,
        message: `Failed to write the plan rejection to ${h}'s inbox \u2014 nothing was sent. Try again.`,
        request_id: e,
      },
    };
  return {
    data: {
      success: !0,
      message: `Plan rejected for ${h} with feedback: "${truncate(r, 50)}"`,
      request_id: e,
    },
  };
}
//@ chunk-astf3mhy.js:48281-48513 layout
var CROSS_MACHINE_RESIDENCY_ERROR =
  "Cross-machine messaging is unavailable: it sends the message through Anthropic servers, which is not allowed on a third-party provider or with nonessential traffic disabled. Messages to sessions on this machine still work.";
/**
 * 跨机器消息不可用的原因文本（第三方 provider / 禁用非必要流量等）。
 */
//@ chunk-astf3mhy.js:48513-48700 layout
function getCrossMachineUnavailableMessage(s) {
  let h = getRemoteSendBlock(s);
  if (h === null) return null;
  return h.cause === "residency"
    ? CROSS_MACHINE_RESIDENCY_ERROR
    : `Cross-machine messaging is unavailable: ${h.reason} Messages to sessions on this machine still work.`;
}
/**
 * 本会话没有回信地址的原因（Remote Control 未连接 / 容器无地址）。
 */
//@ chunk-astf3mhy.js:48700-48841 layout
function getReplyAddressProblem() {
  if (getPeerBridgeIdentity()?.live) return;
  if (env.CLAUDE_CODE_REMOTE === !0) return ownRemoteSessionId() === void 0 ? "no-container-address" : void 0;
  return "rc-disconnected";
}
//@ chunk-astf3mhy.js:48841-48955 layout
function describeReplyAddressProblem(problem) {
  return problem === "rc-disconnected"
    ? "Remote Control is not connected"
    : "this session has no reply address";
}
//@ chunk-astf3mhy.js:48955-49141 layout
function unnamedSessionNote(s) {
  return env.CLAUDE_CODE_REMOTE === !0 && !s && ownRemoteSessionId() !== void 0
    ? "; note: this session has no name yet, so the receiver can answer only by the address on the message, not by name"
    : "";
}
/**
 * tengu_deep_feather：coerceInput 是否拆分字符串化的 JSON 输入。
 */
//@ chunk-astf3mhy.js:49141-49189 layout
function os() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_deep_feather", !0);
}
//@ chunk-astf3mhy.js:49189-49237 layout
function xt() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_jaunty_ember", !1);
}
//@ chunk-astf3mhy.js:49237-49361 layout
function getQueueBusyCheck(deps) {
  return deps.agentId === void 0 && deps.agentContext?.agentType === "main"
    ? createQueueBusyCheck(deps.messageQueue, deps.messages, deps.signal)
    : void 0;
}
/**
 * CLAUDE_CODE_FORWARD_USER_INTENT 且 tengu_jaunty_ember 时，把主线程用户意图附件转发给被消息恢复的代理。
 */
//@ chunk-astf3mhy.js:49361-49596 layout
function getFreshTurnsForAgent(deps, agentId) {
  let e = getQueueBusyCheck(deps);
  if (e === void 0 || !x8t() || !xt()) return;
  let r;
  try {
    r = e();
  } catch (error) {
    (logError(error), logFeatureSad("agent_intent_forward", "live_check_failed"));
  }
  return freshTurnsForAgent(
    { agentId: agentId, deliveringLoop: deps.agentId },
    r ?? deps.messages(),
    r === void 0 ? "snapshot" : "live",
  );
}
/**
 * 把工具依赖（session/storage/agentId/taskRegistry/tools…）与本次调用（toolUseId/permissionPhase/signal）合成 getter 视图。
 */
//@ chunk-astf3mhy.js:49596-50715 layout
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
/**
 * 取出 deliver 需要的 parentMessage/ask/runEngine，缺失时抛错。
 */
//@ chunk-astf3mhy.js:50715-50923 layout
function requireDispatchExecutor(toolCall) {
  let { parentMessage: parentMessage, ask: ask, runEngine: runEngine } = toolCall;
  if (!parentMessage || !ask || !runEngine)
    throw Error("SendMessage: dispatch needs the executor (the issuing message and canUseTool)");
  return { assistantMessage: parentMessage, ask: ask, runEngine: runEngine };
}
/**
 * 删除 backfillObservableInput 加入的观测字段。
 */
//@ chunk-astf3mhy.js:50923-51000 layout
function stripObservableFields(input) {
  let h = !1;
  for (let e of OBSERVABLE_INPUT_FIELDS) if (e in input) (delete input[e], (h = !0));
  return h;
}
/**
 * 收件人类别：会话地址 / main / agentId / 名字。
 */
//@ chunk-astf3mhy.js:51000-51130 layout
function classifyRecipientKind(recipient) {
  if (parseAddress(recipient).scheme !== "other" || LOCAL_TASK_ID_PATTERN.test(recipient)) return "session";
  if (recipient === MAIN) return "main";
  if (MAi(recipient)) return "agent";
  return "name";
}
/**
 * SendMessage 工具定义（shouldDefer，maxResultSizeChars 100000）：输入 schema 随策略/跨会话/agent swarms 开关变化；validateInput 拒绝广播 "*"、协议帧、带 @ 的收件人、空消息与不合法的结构化消息；checkPermissions 处理跨机器隔离（isolatePeerMachines）与 bridge 授权，auto 模式交分类器；call 先跑插件 message 钩子再 deliver，按解析出的收件人类型路由到主会话、活动/停止/被驱逐的子代理（恢复）、本机会话（UDS）、云端会话（bridge）、队友邮箱或结构化协议处理。
 */
//@ chunk-astf3mhy.js:51130-95535 callgraph-witnessed = SendMessageTool (0.177)
var SendMessageTool = buildTool({
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
  coerceInput: (s) => normalizeSendMessageInput(s, { applySplit: os() }),
  shouldDefer: !0,
  isReadOnly(s) {
    return typeof s.message === "string";
  },
  backfillObservableInput(input) {
    if (!jcs(input)) return;
    if (typeof input.to !== "string") return stripObservableFields(input);
    if (splitRepairedMessage(input) !== void 0) return;
    stripObservableFields(input);
    let h = input.message ?? "";
    if (typeof h === "string")
      ((input.type = "message"),
        (input.recipient = input.to),
        (input.recipient_kind = classifyRecipientKind(input.to)),
        (input.content = truncate(h, 50)));
    else if (typeof input.message === "object" && input.message !== null) {
      let message = input.message;
      if (typeof message.type === "string") input.type = message.type;
      if (
        ((input.recipient = input.to),
        (input.recipient_kind = classifyRecipientKind(input.to)),
        typeof message.request_id === "string")
      )
        input.request_id = message.request_id;
      let r = coerceBooleanString(message.approve);
      if (typeof r === "boolean") input.approve = r;
      let a = message.reason ?? message.feedback;
      if (typeof a === "string") input.content = truncate(a, 50);
    }
    return !0;
  },
  suppressesAlwaysAllowRule(s) {
    return !1;
  },
  toAutoClassifierInput(input) {
    let h = (F, q) => (q ? ` [${F}: ${q}]` : ""),
      e = !1,
      r = (F) => F,
      a = normalizeSendMessageInput(input),
      y = a !== null && isPlainObject(a.input) ? a.input : void 0,
      b = y === void 0 ? input.summary : typeof y.summary === "string" ? y.summary : void 0,
      S = h("summary", typeof b === "string" ? r(b) : void 0),
      P = (y !== void 0 && typeof y.message === "string" ? y.message : void 0) ?? input.message ?? "",
      w = typeof P === "string" ? r(P) : P;
    if (typeof w === "string") {
      if (wantsNotifyWhenIdle(input))
        return w.trim().length === 0
          ? `notify when idle: ${input.to}${S}`
          : `to ${input.to}: ${w}${S} [notify when idle]`;
      return `to ${input.to}: ${w}${S}`;
    }
    switch (w.type) {
      case "shutdown_request":
        return `shutdown_request to ${input.to}${h("reason", w.reason)}${S}`;
      case "shutdown_response":
        return `shutdown_response ${w.approve ? "approve" : "reject"} ${w.request_id} to ${input.to}${h("reason", w.reason)}${S}`;
      case "plan_approval_response":
        return `plan_approval ${w.approve ? "approve" : "reject"} ${w.request_id} to ${input.to}${h("feedback", w.feedback)}${S}`;
    }
  },
  async description() {
    return DESCRIPTION;
  },
  async prompt() {
    return getSendMessagePrompt(isAgentSwarmsEnabled(), e6());
  },
  mapToolResultToToolResultBlockParam(s, h) {
    let e = s;
    if (typeof e !== "object" || e === null || Array.isArray(e))
      throw TypeError("SendMessage output is not an object");
    let {
        display: display,
        revivedAgentId: revivedAgentId,
        inlineHandback: inlineHandback,
        ...b
      } = { display: void 0, revivedAgentId: void 0, inlineHandback: void 0, ...s },
      S = (N) => jsonStringify({ success: !0, message: N });
    if (inlineHandback) {
      if (isHandbackProvenanceEnabled()) {
        let N = buildHandbackResultContent(
          inlineHandback.content,
          inlineHandback.harnessNoteCount,
          inlineHandback.harnessTailCount,
          inlineHandback.harnessSectionHash,
        );
        return {
          tool_use_id: h,
          type: "tool_result",
          content: [
            {
              type: "text",
              text: `${S(RESUMED_REPORT_FOLLOWS)}
${N[0].text}`,
            },
          ],
        };
      }
      return {
        tool_use_id: h,
        type: "tool_result",
        content: [
          { type: "text", text: jsonStringify({ ...b, message: formatResumedAgentResult(inlineHandback) }) },
        ],
      };
    }
    return { tool_use_id: h, type: "tool_result", content: [{ type: "text", text: jsonStringify(b) }] };
  },
  create(toolDeps) {
    let h = {
      async checkPermissions(input, r) {
        let deps = makeSendMessageDeps(toolDeps, r),
          y = checkHostSendTarget({ to: input.to, message: input.message });
        if (y !== void 0)
          return { behavior: "deny", message: y, decisionReason: { type: "other", reason: v4s } };
        if (hasIsolatePeerMachines() && !isLocalSessionAddress(input.to)) {
          let b = parseAddress(input.to),
            scheme = b.scheme;
          if (scheme === "bridge") {
            let N = unreachableElevatedRefusal(deps.session, b.target, input.to);
            if (N) {
              if (!hasMintedReentry(deps))
                logSendDelivery({
                  route: "bridge",
                  startedAt: Date.now(),
                  errorClass: "bridge_auth",
                  via: "address",
                });
              return {
                behavior: "deny",
                message: stripNonPrintable(N),
                decisionReason: { type: "other", reason: ELEVATED_UNREACHABLE_REASON },
              };
            }
            let P = cannotReceiveRefusal(deps.session, b.target, input.to);
            if (P) {
              if (!hasMintedReentry(deps))
                logSendDelivery({
                  route: "bridge",
                  startedAt: Date.now(),
                  errorClass: "recipient_gate_off",
                  via: "address",
                });
              return {
                behavior: "deny",
                message: stripNonPrintable(P),
                decisionReason: { type: "other", reason: RECIPIENT_CANNOT_RECEIVE_REASON },
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
                classifierApprovable: !1,
                circuitBreaker: "isolatePeerMachines",
              },
            };
          }
          if (scheme === "other") {
            let N;
            try {
              let P = hasMintedReentry(deps) ? getDispatchNoteForInput(deps, input, getToField) : void 0;
              N = extractMarkupText(P)
                ? P
                : await resolveCrossSessionAddress(
                    deps.session,
                    input.to,
                    input.message,
                    deps.resolverState(),
                    deps.storageV5,
                    deps.credentials,
                  );
            } catch (error) {
              return (
                logForDebugging(
                  `[SendMessage] permission-phase resolve failed (${stripAnsiAndControls(errorMessage(error))}) \u2014 asking`,
                  { level: "warn" },
                ),
                {
                  behavior: "ask",
                  message: stripNonPrintable(
                    `Send a message to '${input.to}'? Its destination could not be resolved just now, so it is unknown whether this name is a Claude session on another machine (isolatePeerMachines is enabled).`,
                  ),
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "isolatePeerMachines is enabled \u2014 cross-machine message requires explicit approval",
                    classifierApprovable: !1,
                    circuitBreaker: "isolatePeerMachines",
                  },
                }
              );
            }
            if (N.kind === "cloud-session") {
              if (isOwnBridgeSession(N.sessionId))
                return {
                  behavior: "deny",
                  message: stripNonPrintable(selfTargetMessage(input.to, WL(deps))),
                  decisionReason: { type: "other", reason: SELF_TARGET_REASON },
                };
              let {
                isRemoteControlPeerUnreachableFromHere: isRemoteControlPeerUnreachableFromHere,
                formatUnreachableElevatedRefusal: formatUnreachableElevatedRefusal,
              } = require("./chunk-3kb57csj.js");
              if (N.via === "remote-control" && isRemoteControlPeerUnreachableFromHere()) {
                if (!hasMintedReentry(deps))
                  logSendDelivery({
                    route: "bridge",
                    startedAt: Date.now(),
                    errorClass: "bridge_auth",
                    via: "remote_control_name",
                  });
                return {
                  behavior: "deny",
                  message: stripNonPrintable(formatUnreachableElevatedRefusal(N.displayName)),
                  decisionReason: { type: "other", reason: ELEVATED_UNREACHABLE_REASON },
                };
              }
              let F = cannotReceiveRefusal(deps.session, N.sessionId, N.displayName);
              if (F) {
                if (!hasMintedReentry(deps))
                  logSendDelivery({
                    route: "bridge",
                    startedAt: Date.now(),
                    errorClass: "recipient_gate_off",
                    via: N.via === "cloud" ? "cloud_name" : "remote_control_name",
                  });
                return {
                  behavior: "deny",
                  message: stripNonPrintable(F),
                  decisionReason: { type: "other", reason: RECIPIENT_CANNOT_RECEIVE_REASON },
                };
              }
              return (
                setPendingPermissionNote(deps, input, N, SENDMESSAGE),
                {
                  behavior: "ask",
                  message: stripNonPrintable(
                    N.via === "cloud"
                      ? `Send a message to cloud session '${N.displayName}'? It reaches the receiving Claude (running in the cloud) via Anthropic's servers as a cross-session message \u2014 marked as from another Claude session, not from its user.`
                      : `Send a message to Remote Control session '${N.displayName}'? It reaches the receiving Claude (on another machine) via Anthropic's servers as a cross-session message \u2014 marked as from another Claude session, not from its user.`,
                  ),
                  decisionReason: {
                    type: "safetyCheck",
                    reason:
                      "isolatePeerMachines is enabled \u2014 cross-machine message requires explicit approval",
                    classifierApprovable: !1,
                    circuitBreaker: "isolatePeerMachines",
                  },
                }
              );
            }
            if (N.kind === "not-found" && (N.cloudUnavailable !== void 0 || N.bridgeUnavailable !== void 0)) {
              let joined = [
                N.cloudUnavailable !== void 0 ? "the cloud session list could not be fetched" : void 0,
                N.bridgeUnavailable !== void 0 ? "the account session list could not be checked" : void 0,
              ]
                .filter((w) => w !== void 0)
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
                  classifierApprovable: !1,
                  circuitBreaker: "isolatePeerMachines",
                },
              };
            }
            setPendingPermissionNote(deps, input, N, SENDMESSAGE);
          }
        }
        if (isAutoClassifierActive(deps.permissions().mode))
          return { behavior: "passthrough", message: "Message to another agent requires classifier review." };
        return { behavior: "allow", updatedInput: input };
      },
      async validateInput(input, r) {
        let a = makeSendMessageDeps(toolDeps, r),
          y = checkHostSendTarget({ to: input.to, message: input.message });
        if (y !== void 0)
          return (
            logSendDelivery({ route: "unresolved", startedAt: Date.now(), degradedClass: "own_agents_only" }),
            { result: !1, message: y, errorCode: 9 }
          );
        if (input.to === "*")
          return {
            result: !1,
            message: 'broadcast (to: "*") is no longer supported \u2014 send a message per recipient',
            errorCode: 9,
          };
        {
          let scheme = parseAddress(input.to).scheme;
          if ((scheme === "uds" || scheme === "bridge" || !1) && !isCrossSessionMessagingEnabled())
            return { result: !1, message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE, errorCode: 9 };
        }
        if (wantsNotifyWhenIdle(input)) {
          if (typeof input.message !== "string")
            return {
              result: !1,
              message:
                "notify_when_idle cannot ride a structured message \u2014 send plain text, or omit the message for a pure subscription",
              errorCode: 9,
            };
          if (getNotifyIdleEligibility(input, a).refusedForPrincipal && input.message.trim().length === 0)
            return { result: !1, message: NOTIFY_IDLE_MAIN_ONLY_ERROR, errorCode: 9 };
          let scheme = parseAddress(input.to).scheme;
          if (scheme === "bridge" || scheme === "did")
            return { result: !1, message: NOTIFY_IDLE_SCOPE_ERROR, errorCode: 9 };
        }
        let b = parsePeerAddress(input.to, LISTAGENTS);
        if (b !== void 0) return { result: !1, message: b, errorCode: 9 };
        {
          let S = parseAddress(input.to);
          if (S.scheme === "uds" && mayBeOwnSocket(S.target))
            return { result: !1, message: selfTargetMessage(input.to, WL(a)), errorCode: 9 };
        }
        if (input.to.includes("@"))
          return {
            result: !1,
            message: "to must be a bare teammate name \u2014 there is only one team per session",
            errorCode: 9,
          };
        if (
          typeof input.message === "string" &&
          input.message.trim().length === 0 &&
          !wantsNotifyWhenIdle(input)
        )
          return { result: !1, message: EMPTY_MESSAGE_ERROR, errorCode: 9 };
        if (parseAddress(input.to).scheme === "bridge") {
          if (isOwnBridgeSession(parseAddress(input.to).target))
            return { result: !1, message: selfTargetMessage(input.to, WL(a)), errorCode: 9 };
          if (typeof input.message !== "string")
            return {
              result: !1,
              message: "structured messages cannot be sent cross-session \u2014 only plain text",
              errorCode: 9,
            };
          return { result: !0 };
        }
        if (parseAddress(input.to).scheme === "uds" && typeof input.message === "string")
          return { result: !0 };
        if (typeof input.message === "string") {
          if (isStructuredProtocolMessage(input.message))
            return {
              result: !1,
              message: e6()
                ? "message text must not be a teammate protocol frame (permission/mode/plan/shutdown JSON): send plain text"
                : 'message text must not be a teammate protocol frame (permission/mode/plan/shutdown JSON) \u2014 to respond to a plan or shutdown request, use the structured object form ({"message": {"type": ...}}); otherwise send plain text',
              errorCode: 9,
            };
          try {
            let S = jsonParse(input.message);
            if (
              S !== null &&
              typeof S === "object" &&
              "type" in S &&
              typeof S.type === "string" &&
              [
                "idle_notification",
                "teammate_terminated",
                "task_assignment",
                "task_completed",
                "shutdown_rejected",
              ].includes(S.type)
            )
              return {
                result: !1,
                message:
                  "message text must not be a teammate lifecycle/task frame (idle/terminated/task/shutdown JSON) \u2014 send plain text instead",
                errorCode: 9,
              };
          } catch {}
          return { result: !0 };
        }
        if (!isAgentSwarmsEnabled())
          return {
            result: !1,
            message: "Structured team-protocol messages are only available with agent teams enabled.",
            errorCode: 9,
          };
        if (parseAddress(input.to).scheme !== "other")
          return {
            result: !1,
            message: "structured messages cannot be sent cross-session \u2014 only plain text",
            errorCode: 9,
          };
        if (input.message.type === "shutdown_response" && input.to !== TEAM_LEAD)
          return { result: !1, message: `shutdown_response must be sent to "${TEAM_LEAD}"`, errorCode: 9 };
        if (
          input.message.type === "shutdown_response" &&
          input.message.approve &&
          input.message.reason !== void 0
        )
          return {
            result: !1,
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
            result: !1,
            message: "reason is required when rejecting a shutdown request",
            errorCode: 9,
          };
        return { result: !0 };
      },
      async deliver(input, r) {
        let deps = makeSendMessageDeps(toolDeps, r),
          agentId = deps.agentId;
        if (agentId !== void 0 && hW(agentId))
          throw (
            logFeatureBad("subagent_launch", "send_message_spawner_stop_pending"),
            Error("This agent has been stopped and its stop is still completing; it cannot send messages.")
          );
        let {
            assistantMessage: assistantMessage,
            ask: ask,
            runEngine: runEngine,
          } = requireDispatchExecutor(r),
          now = Date.now();
        function emitRouteTelemetry(I, B, A) {
          logSendDelivery({
            route: I,
            startedAt: now,
            errorClass: B,
            ...(agentId !== void 0 && { fromSubagent: !0 }),
            ...A,
          });
        }
        let F = checkHostSendTarget({ to: input.to, message: input.message });
        if (F !== void 0)
          return (
            emitRouteTelemetry("unresolved", void 0, { degradedClass: "own_agents_only" }),
            { data: { success: !1, message: F } }
          );
        if (agentId !== void 0 && !xfn(agentId))
          return (
            emitRouteTelemetry("unresolved", void 0, { degradedClass: "own_agents_only" }),
            { data: { success: !1, message: SEND_MESSAGE_SWITCHED_OFF } }
          );
        let q = r$t() ? s$t(deps.permissions()) : void 0;
        if (agentId !== void 0 && isObserverTask(deps.session, agentId))
          return (
            emitRouteTelemetry("unresolved", "not_reachable"),
            {
              data: {
                success: !1,
                message:
                  "Observers report via ObserverReport, not SendMessage. SendMessage is not available from an observer.",
              },
            }
          );
        if (isLocalSessionAddress(input.to)) {
          if (!isCrossSessionMessagingEnabled())
            return (
              emitRouteTelemetry("desktop_host", "not_reachable"),
              { data: { success: !1, message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE } }
            );
          let I = !1;
          if (((I = wantsNotifyWhenIdle(input)), typeof input.message !== "string"))
            return (
              emitRouteTelemetry("desktop_host", "invalid_target"),
              {
                data: {
                  success: !1,
                  message: `Not sent: a Claude Desktop session takes a plain-text message, not a structured ${input.message.type}.`,
                },
              }
            );
          if (input.message.trim().length === 0) {
            if (wasEmptiedByHandler(input, assistantMessage, deps.toolUseId))
              return (
                emitRouteTelemetry("desktop_host", "handler_rewrite"),
                I ? EMPTIED_MESSAGE_SHORT_RESULT : NOTHING_TO_SEND_RESULT
              );
            return (
              emitRouteTelemetry("desktop_host", I ? "not_reachable" : "empty_message"),
              {
                data: {
                  success: !1,
                  message: I
                    ? `Nothing was subscribed: ${NOTIFY_IDLE_SCOPE_ERROR}`
                    : "Not sent: the message is empty.",
                },
              }
            );
          }
          let B = resolveDesktopForward(deps);
          if ("kind" in B)
            switch (B.kind) {
              case "unavailable":
                return (
                  emitRouteTelemetry("unresolved", "desktop_session_id"),
                  {
                    data: {
                      success: !1,
                      message: `No agent named '${input.to}' is reachable. It has the shape of a Claude Desktop session id, but Claude Desktop's session messaging tool is not available in this session, so SendMessage cannot deliver to it.`,
                    },
                  }
                );
              case "loop-paused":
                return (
                  emitRouteTelemetry("desktop_host", void 0, { degradedClass: "hop_loop" }),
                  {
                    data: {
                      success: !1,
                      message: `Not delivered: this session has already messaged Claude Desktop sessions ${B.forwards} times since your user last typed here, which looks like sessions messaging each other automatically. Paused until your user's next message in this session.`,
                    },
                  }
                );
            }
          let A = agentId ? resolveSenderIdentity(deps, agentId).from : void 0,
            L = agentId !== void 0 && A !== void 0 ? xBe(A, input.message) : input.message,
            G = describeSubagentSender(agentId, A, { oneWay: !1 }),
            U = await runEngine(forwardToDesktop, {
              tool: B.tool,
              sessionId: input.to,
              message: L,
              assistantMessage: assistantMessage,
            }),
            H = U.blockedWait ? { blockedWait: !0 } : void 0,
            R = U.attachments.length > 0 ? U.attachments : void 0;
          switch (U.kind) {
            case "sent":
              return (
                emitRouteTelemetry("desktop_host", void 0, H),
                {
                  data: {
                    success: !0,
                    message: `Forwarded to Claude Desktop's session messaging: ${U.detail || "sent."}${NO_READ_RECEIPT_NOTE}${G.message}${I ? Ts : ""}`,
                    display: `Forwarded to Claude Desktop's session messaging: ${U.detail || "sent."}${NO_READ_RECEIPT_DISPLAY}${G.display}${I ? Ts : ""}`,
                  },
                  ...(R && { newMessages: R }),
                }
              );
            case "refused":
              return (
                emitRouteTelemetry("desktop_host", "desktop_refused", H),
                {
                  data: {
                    success: !1,
                    message: `Not delivered to Claude Desktop session ${input.to}: ${U.message}`,
                  },
                  ...(R && { newMessages: R }),
                }
              );
          }
        }
        let ee = agentId ? resolveSenderIdentity(deps, agentId) : void 0,
          x = ee?.from;
        if (typeof input.message === "string") {
          let I = parseAddress(input.to),
            B =
              I.scheme === "bridge" &&
              wasAskedForSameInput(deps, input, getToAndMessageFields, isIsolatePeerAsk);
          if ((I.scheme === "bridge" || I.scheme === "uds") && !isCrossSessionMessagingEnabled())
            return { data: { success: !1, message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE } };
          let A = getCurrentSessionPeerNameFor(I.scheme === "bridge" ? "bridge" : "uds");
          if (I.scheme === "bridge") {
            if (isOwnBridgeSession(I.target))
              return (
                emitRouteTelemetry("bridge", "invalid_target"),
                {
                  data: {
                    success: !1,
                    message: selfTargetMessage(input.to, WL(deps)),
                    display: $ht(input.to),
                  },
                }
              );
            let L = getCrossMachineUnavailableMessage("unknown");
            if (L !== null) return { data: { success: !1, message: L } };
            let {
                cloudSendRefusalNamingServiceTool: cloudSendRefusalNamingServiceTool,
                postInterClaudeMessage: postInterClaudeMessage,
                isLikelyStaleBridgeError: isLikelyStaleBridgeError,
                classifyBridgeSendError: classifyBridgeSendError,
              } = require("./chunk-ypjxapg8.js"),
              E = unreachableElevatedRefusal(deps.session, I.target, input.to, () =>
                findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
              );
            if (E)
              return (
                emitRouteTelemetry("bridge", "bridge_auth", { via: "address" }),
                { data: { success: !1, message: E } }
              );
            let W = cannotReceiveRefusal(deps.session, I.target, input.to);
            if (W)
              return (
                emitRouteTelemetry("bridge", "recipient_gate_off", { via: "address" }),
                { data: { success: !1, message: W } }
              );
            let j = await isolationDispatchGate({
              tool: SendMessageTool,
              input: input,
              ask: ask,
              permissionPhase: deps.permissionPhase,
              alreadyApproved: B,
              recipientLabel: `Remote Control session '${input.to}'`,
              parse: (Ie) => getSendMessageInputSchema().safeParse(Ie),
            });
            if (!j.proceed)
              return (
                emitRouteTelemetry("bridge", sendDenialKind(j), { blockedWait: !0, via: "address" }),
                { data: { success: !1, message: j.message } }
              );
            let Y = getCrossMachineUnavailableMessage("unknown");
            if (Y !== null) return { data: { success: !1, message: Y } };
            let input_2 = j.input,
              K = typeof input_2.message === "string" ? input_2.message : input.message,
              V = Ns(K, () => emitRouteTelemetry("bridge", "handler_rewrite", { via: "address" }));
            if (V !== void 0) return V;
            let Q = agentId !== void 0 && x !== void 0 ? xBe(x, K) : K,
              Z = getReplyAddressProblem(),
              de = describeSubagentSender(agentId, x, { oneWay: Z !== void 0 }),
              ue = Ivo(isInboundUnreported(deps.session, I.target)),
              ce = await postInterClaudeMessage(
                I.target,
                Q,
                A,
                void 0,
                lastPeerHopChain(deps.messages()),
                q,
                deps.credentials,
                deps.hookCaller,
              ),
              Ne = input_2.summary || truncate(K, 50);
            if (ce.ok) {
              emitRouteTelemetry("bridge", void 0, { via: "address", ...(j.asked && { blockedWait: !0 }) });
              let Ie = Z
                ? `\u201C${Ne}\u201D \u2192 ${input.to} (one-way: ${describeReplyAddressProblem(Z)}, so the receiver cannot address a reply to this session)`
                : `\u201C${Ne}\u201D \u2192 ${input.to}${unnamedSessionNote(A)}`;
              return {
                data: {
                  success: !0,
                  message: `${Ie}${ue.message}${NO_READ_RECEIPT_NOTE}${de.message}`,
                  display: `${Ie}${ue.display}${NO_READ_RECEIPT_DISPLAY}${de.display}`,
                  msg_id: ce.msgId,
                },
              };
            }
            emitRouteTelemetry("bridge", classifyBridgeSendError(ce.error), {
              via: "address",
              ...(j.asked && { blockedWait: !0 }),
            });
            let ve = cloudSendRefusalNamingServiceTool(ce.error, input.to, I.target, () =>
              findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
            );
            if (ve !== void 0) return { data: { success: !1, message: ve } };
            let Ee = isLikelyStaleBridgeError(ce.error)
              ? ` \u2014 the peer session may have ended or restarted, so this bridge ID is stale. Call ${LISTAGENTS} to get the current address.`
              : "";
            return {
              data: { success: !1, message: `Failed to send to ${input.to}: ${ce.error ?? "unknown"}${Ee}` },
            };
          }
          if (I.scheme === "uds") {
            if (mayBeOwnSocket(I.target))
              return (
                emitRouteTelemetry("uds", "invalid_target"),
                {
                  data: {
                    success: !1,
                    message: selfTargetMessage(input.to, WL(deps)),
                    display: $ht(input.to),
                  },
                }
              );
            let {
                sendToUdsSocket: sendToUdsSocket,
                ownMessagingSocket: ownMessagingSocket,
              } = require("./chunk-ewxn4535.js"),
              {
                subscribeToPeerIdle: subscribeToPeerIdle,
                idleSubscriptionLines: idleSubscriptionLines,
              } = require("./chunk-7bvr1kd2.js"),
              { notify: notify, refusedForPrincipal: refusedForPrincipal } = getNotifyIdleEligibility(
                input,
                deps,
              ),
              W = input.message.trim().length > 0,
              j = checkEmptyCrossSessionMessage({
                input: input,
                plainMessage: input.message,
                notify: notify,
                refusedForPrincipal: refusedForPrincipal,
                assistantMessage: assistantMessage,
                toolUseId: deps.toolUseId,
                emit: emitRouteTelemetry,
              });
            if (j !== void 0) return j;
            if (refusedForPrincipal) Je();
            let Y = agentId !== void 0 && x !== void 0 ? xBe(x, input.message) : input.message,
              z = ownMessagingSocket() !== void 0,
              K = describeSubagentSender(agentId, x, { oneWay: !z });
            try {
              let V = W
                  ? await sendToUdsSocket(
                      I.target,
                      Y,
                      deps.storageV5,
                      A,
                      void 0,
                      lastPeerHopChain(deps.messages()),
                      q,
                      { fromPlugin: deps.hookCaller },
                    )
                  : void 0,
                Q = notify ? await subscribeToPeerIdle(I.target, input.to, deps.storageV5, q) : void 0;
              if (V)
                emitRouteTelemetry("uds", void 0, {
                  ...(Q && !Q.ok && { degradedClass: classifyUdsSendFailure(Q) }),
                });
              else if (Q) emitUdsSendOutcome(Q, emitRouteTelemetry);
              let Z = input.summary || truncate(input.message, 50),
                de = Q ? idleSubscriptionLines(input.to, Q, LISTAGENTS) : void 0,
                ue = [
                  ...(V ? [`\u201C${Z}\u201D \u2192 ${input.to}${Pvo(z)}${K.message}`] : []),
                  ...(de ? [de.model] : []),
                ],
                ce = de
                  ? void 0
                  : describeSkippedSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId);
              return {
                data: {
                  success: V !== void 0 || Q?.ok === !0,
                  message: `${ue.join(`
`)}${ce?.model ?? ""}`,
                  ...((V || de || ce || K.display) && {
                    display: [
                      ...(V ? [`\u201C${Z}\u201D \u2192 ${input.to}${K.display}`] : []),
                      ...(de ? [de.display] : ce ? [ce.display] : []),
                    ].join(`
`),
                  }),
                  ...(V && { msg_id: V.msgId }),
                },
              };
            } catch (error) {
              emitRouteTelemetry("uds", classifyUdsSendError(error));
              let Q = classifyPeerSendError(error),
                Z = Q === "gone" ? staleSocketHint(LISTAGENTS) : Q === "busy" ? tsr(error) : "";
              return {
                data: {
                  success: !1,
                  message: `Failed to send to ${input.to}: ${errorMessage(error)}${Z}${describeNoSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId)}`,
                },
              };
            }
          }
        }
        let re = wasAskedForSameInput(deps, input, getToAndMessageFields, isIsolatePeerAsk),
          se = getCheckedNoteForInput(deps, input, getToAndMessageFields),
          resolvedRecipient =
            (extractMarkupText(se) ? se : void 0) ??
            (await resolveCrossSessionAddress(
              deps.session,
              input.to,
              input.message,
              deps.resolverState(),
              deps.storageV5,
              deps.credentials,
            )),
          we = checkHostResolvedTarget(resolvedRecipient);
        if (we !== void 0)
          return (
            emitRouteTelemetry("unresolved", void 0, { degradedClass: "own_agents_only" }),
            { data: { success: !1, message: we } }
          );
        if (
          (resolvedRecipient.kind === "local-session" || resolvedRecipient.kind === "cloud-session") &&
          !isCrossSessionMessagingEnabled()
        )
          return { data: { success: !1, message: CROSS_SESSION_MESSAGING_DISABLED_MESSAGE } };
        if (resolvedRecipient.kind === "cloud-session" && isOwnBridgeSession(resolvedRecipient.sessionId))
          return (
            emitRouteTelemetry("unresolved", "invalid_target"),
            { data: { success: !1, message: selfTargetMessage(input.to, WL(deps)), display: $ht(input.to) } }
          );
        if (resolvedRecipient.kind === "local-session" && isOwnSocket(resolvedRecipient.sock))
          return (
            emitRouteTelemetry("unresolved", "invalid_target"),
            { data: { success: !1, message: selfTargetMessage(input.to, WL(deps)), display: $ht(input.to) } }
          );
        if (resolvedRecipient.kind === "local-session" && Zsn(input.to, resolvedRecipient.sock))
          return (
            emitRouteTelemetry("unresolved", void 0, { degradedClass: "claimed_locally" }),
            {
              data: {
                success: !1,
                message: impersonatedSelfMessage(input.to),
                display: impersonatedSelfShortMessage(input.to),
              },
            }
          );
        if (resolvedRecipient.kind === "local-session" && mayBeOwnSocket(resolvedRecipient.sock))
          return (
            emitRouteTelemetry("unresolved", "invalid_target"),
            { data: { success: !1, message: selfTargetMessage(input.to, WL(deps)), display: $ht(input.to) } }
          );
        if (
          _t(input, assistantMessage, deps.toolUseId) &&
          resolvedRecipient.kind !== "local-session" &&
          resolvedRecipient.kind !== "ambiguous" &&
          resolvedRecipient.kind !== "not-found"
        ) {
          let { idleSelfTargetMessage: idleSelfTargetMessage } = require("./chunk-7bvr1kd2.js");
          return (
            emitRouteTelemetry("unresolved", "invalid_target"),
            logFeatureSad(
              "cross_session_notify_idle",
              resolvedRecipient.kind === "main" ? "subscribe_self_target" : "subscribe_refused_target",
            ),
            {
              data: {
                success: !1,
                message: `${resolvedRecipient.kind === "main" ? idleSelfTargetMessage('"main"') : NOTIFY_IDLE_SCOPE_ERROR}${typeof input.message !== "string" || input.message.trim().length > 0 ? NOT_DELIVERED_RETRY_NOTE : ""}`,
              },
            }
          );
        }
        let any = deps.tools.some((tool) => toolMatchesName(tool, LISTAGENTS)),
          ke = any ? ` (${LISTAGENTS} lists them)` : "";
        if (
          resolvedRecipient.kind === "agent-live" ||
          resolvedRecipient.kind === "agent-stopped" ||
          resolvedRecipient.kind === "agent-evicted"
        ) {
          if (isObserverTask(deps.session, resolvedRecipient.agentId))
            return (emitRouteTelemetry("unresolved", "not_reachable"), CANNOT_RECEIVE_RESULT);
          let I;
          try {
            I = await readAgentMetadata(Mr(resolvedRecipient.agentId), deps.storageV5);
          } catch {
            return (emitRouteTelemetry("unresolved", "not_reachable"), CANNOT_RECEIVE_RESULT);
          }
          if (I?.isObserver)
            return (emitRouteTelemetry("unresolved", "not_reachable"), CANNOT_RECEIVE_RESULT);
        }
        if (resolvedRecipient.kind === "not-found") {
          let I = typeof input.message === "string" ? classifySelfName(input.to) : "no",
            any_2 = resolvedRecipient.closest.some(
              (E) => slugifySessionName(E.name) === slugifySessionName(d8(input.to)?.name ?? input.to),
            );
          if (I === "categorical" && !any_2 && isSearchComplete(resolvedRecipient))
            return (
              emitRouteTelemetry("unresolved", "invalid_target"),
              {
                data: { success: !1, message: selfTargetMessage(input.to, WL(deps)), display: $ht(input.to) },
              }
            );
          let A =
              resolvedRecipient.closest.length > 0
                ? ` Did you mean: ${resolvedRecipient.closest.map((E) => (typeof input.message === "string" && E.where === "in-process" ? bOe(E) : E.name)).join(", ")}?`
                : "",
            L = resolvedRecipient.renamedTo
              ? renamedSessionNote(input.to, resolvedRecipient.renamedTo.name)
              : "",
            G =
              typeof input.message === "string" && !0 && any
                ? `Use ${LISTAGENTS} to see everyone you can message.`
                : typeof input.message === "string"
                  ? "Check the spelling, or use the agent ID from a background agent's spawn result."
                  : "A teammate is addressed by its name: check the spelling against your team roster.",
            U = "";
          if (resolvedRecipient.cloudUnavailable)
            U = `
The cloud session list could not be fetched just now, so cloud sessions were not searched.`;
          let H = "";
          if (resolvedRecipient.pinnedIdentityClaimedLocally)
            H += `
Note: earlier in this conversation '${resolvedRecipient.pinnedIdentityClaimedLocally}' was confirmed as a session that is NOT on this machine; a session record on this machine now claims that identity, which hides it here \u2014 nothing was sent.${any ? ` ${LISTAGENTS} will not show it while that claim stands.` : ""} A session on this machine impersonating it is suspicious: ask the user.`;
          if (resolvedRecipient.bridgeUnavailable)
            H += `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so they were not searched. If '${input.to}' is one, retry${any ? ` (or run ${LISTAGENTS} first)` : ""}; do not look for another tool to send it with.`;
          let R = "";
          if (resolvedRecipient.localUnavailable)
            R = `
The sessions on this machine could not be listed just now, so they were not searched; retry if you meant a session on this machine.`;
          return (
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
                    ...(resolvedRecipient.searchTruncated && { searchTruncated: !0 }),
                    ...(resolvedRecipient.renamedTo && { renamedHint: !0 }),
                  }
                : void 0,
            ),
            {
              data: {
                success: !1,
                message: `No agent named '${input.to}' is reachable.${L}${A}${U}${H}${R}${resolvedRecipient.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : ""}${I !== "no" ? selfAliasNote(input.to, WL(deps)) : ""}
${G}`,
                display: `Not sent \u2014 no agent named '${input.to}' is reachable.${resolvedRecipient.renamedTo ? EHs(resolvedRecipient.renamedTo.name) : ""}${resolvedRecipient.closest.length > 0 ? ` Did you mean: ${resolvedRecipient.closest.map((E) => E.name).join(", ")}?` : ""}${resolvedRecipient.bridgeUnavailable || resolvedRecipient.cloudUnavailable || resolvedRecipient.localUnavailable ? ` Note: ${describeUnsearchedSessions(resolvedRecipient)} \u2014 it may exist there; a retry searches again.` : ""}${resolvedRecipient.searchTruncated ? ` Note: ${TRUNCATED_SEARCH_SHORT} \u2014 it may exist beyond what was searched.` : ""}${resolvedRecipient.pinnedIdentityClaimedLocally ? ` ${claimedElsewhereMessage(resolvedRecipient.pinnedIdentityClaimedLocally)} \u2014 that is suspicious if you did not set it up.` : ""}`,
              },
            }
          );
        }
        if (resolvedRecipient.kind === "ambiguous") {
          let I = typeof input.message === "string" ? classifySelfName(input.to) : "no";
          if (
            I === "categorical" &&
            resolvedRecipient.matchedBy === "prefix" &&
            isSearchComplete(resolvedRecipient)
          )
            return (
              emitRouteTelemetry("unresolved", "invalid_target"),
              {
                data: { success: !1, message: selfTargetMessage(input.to, WL(deps)), display: $ht(input.to) },
              }
            );
          let now = Date.now(),
            joined = resolvedRecipient.candidates.map((candidate) => `  ${agentAddressLabel(candidate, now)}`)
              .join(`
`),
            L =
              resolvedRecipient.total > resolvedRecipient.candidates.length
                ? `
  \u2026and ${resolvedRecipient.total - resolvedRecipient.candidates.length} more${any ? ` \u2014 use ${LISTAGENTS} to see them all.` : "."}`
                : "",
            G = Boolean(
              resolvedRecipient.bridgeUnavailable ||
              resolvedRecipient.cloudUnavailable ||
              resolvedRecipient.localUnavailable,
            ),
            U = resolvedRecipient.searchTruncated ? TRUNCATED_SEARCH_PARAGRAPH : "",
            H = resolvedRecipient.searchTruncated ? ` (${TRUNCATED_SEARCH_SHORT})` : "",
            R =
              resolvedRecipient.total === 1
                ? resolvedRecipient.matchedBy === "prefix"
                  ? `No agent is named '${input.to}' exactly. Re-send with the ref to confirm you mean:`
                  : G
                    ? `'${input.to}' matches one session that could be checked, but not every session could be \u2014 re-send with the ref to confirm you mean:`
                    : `'${input.to}' needs a one-time confirm before this send. Re-send with the ref to confirm you mean:`
                : resolvedRecipient.matchedBy === "prefix"
                  ? `'${input.to}' matches ${resolvedRecipient.total} agents by prefix. Re-send with the ref of the one you mean:`
                  : `${resolvedRecipient.total} agents are named '${input.to}'. Re-send with the ref of the one you mean:`,
            E = "";
          if (resolvedRecipient.bridgeUnavailable)
            E += `
Your account's other sessions (Remote Control and cloud) could not be checked just now, so this list may be missing one; if you meant one of them, retry${any ? ` (or run ${LISTAGENTS} first)` : ""}.`;
          if (resolvedRecipient.cloudUnavailable)
            E += `
The cloud session list could not be fetched just now, so this list may be missing a cloud session; retry if you meant one.`;
          if (resolvedRecipient.localUnavailable)
            E += `
The sessions on this machine could not be listed just now, so this list may be missing one here; retry if you meant a session on this machine.`;
          if (resolvedRecipient.pinnedIdentityClaimedLocally)
            E += `
Note: earlier in this conversation '${resolvedRecipient.pinnedIdentityClaimedLocally}' was confirmed as a session that is NOT on this machine; a session record on this machine now claims that identity, so nothing was assumed and nothing was sent. ${any ? `${LISTAGENTS} will not show the other session while that claim stands. ` : ""}A session on this machine claiming that identity, that your user did not set up, is suspicious: ask the user before confirming anyone.`;
          let W =
              resolvedRecipient.total === 1 &&
              !resolvedRecipient.bridgeUnavailable &&
              !resolvedRecipient.cloudUnavailable &&
              !resolvedRecipient.localUnavailable &&
              !resolvedRecipient.pinnedIdentityClaimedLocally
                ? `
e.g. {"to": "${bOe(resolvedRecipient.candidates[0])}", ...}`
                : "",
            j = resolvedRecipient.searchTruncated ? { searchTruncated: !0 } : void 0;
          if (
            resolvedRecipient.bridgeUnavailable === "timeout" ||
            resolvedRecipient.cloudUnavailable === "timeout"
          )
            emitRouteTelemetry("unresolved", "timeout", j);
          else if (
            resolvedRecipient.bridgeUnavailable === "fetch_failed" ||
            resolvedRecipient.cloudUnavailable === "fetch_failed"
          )
            emitRouteTelemetry("unresolved", "not_reachable", j);
          else if (resolvedRecipient.localUnavailable) emitRouteTelemetry("unresolved", "local_unlisted", j);
          else if (resolvedRecipient.pinnedIdentityClaimedLocally)
            emitRouteTelemetry("unresolved", void 0, { degradedClass: "claimed_locally", ...j });
          else
            emitRouteTelemetry("unresolved", void 0, {
              degradedClass: resolvedRecipient.total === 1 ? "confirm_required" : "ambiguous",
              ...j,
            });
          let Y = resolvedRecipient.candidates[0],
            z = resolvedRecipient.pinnedIdentityClaimedLocally
              ? ` ${claimedElsewhereMessage(resolvedRecipient.pinnedIdentityClaimedLocally)} \u2014 ask before confirming anyone.`
              : "",
            K = describeUnsearchedSessions(resolvedRecipient),
            joined_2 = resolvedRecipient.candidates
              .map((candidate) => `'${candidate.name}' ${describeSessionLocation(candidate.where)}`)
              .join(", "),
            Q = `${resolvedRecipient.total === 1 ? (resolvedRecipient.matchedBy === "prefix" ? `Not sent \u2014 no agent is named '${input.to}' exactly${G ? ` among the sessions that could be checked (${K})` : ""}; asked Claude to confirm it means '${Y.name}'.` : resolvedRecipient.pinnedIdentityClaimedLocally ? `Not sent \u2014 '${input.to}' needs a confirm before this send.` : G ? `Not sent yet \u2014 '${input.to}' matches '${Y.name}', but ${K}; asked Claude to confirm.` : `Not sent \u2014 '${input.to}' needs a one-time confirm before this send; asked Claude to confirm it means '${Y.name}'.`) : resolvedRecipient.matchedBy === "prefix" ? `Not sent \u2014 '${input.to}' matches ${resolvedRecipient.total} agents by prefix (${joined_2}${resolvedRecipient.total > resolvedRecipient.candidates.length ? ", \u2026" : ""}); asked Claude to pick one.` : `Not sent \u2014 ${resolvedRecipient.total} agents are named '${input.to}' (${joined_2}${resolvedRecipient.total > resolvedRecipient.candidates.length ? ", \u2026" : ""}); asked Claude to pick one.`}${G && resolvedRecipient.total !== 1 ? ` Note: ${K}.` : ""}${H}${z}`;
          return {
            data: {
              success: !1,
              message: `${R}
${joined}${L}${W}${E}${U}${I !== "no" ? selfAliasNote(input.to, WL(deps)) : ""}`,
              display: Q,
            },
          };
        }
        await primePeerIdentityOwner({ refresh: !0, credentials: deps.credentials });
        let pe = await describeDeliveryResult({
          session: deps.session,
          to: input.to,
          message: input.message,
          resolved: resolvedRecipient,
          appState: deps.resolverState(),
          agentLifecycle: deps.agentLifecycle,
          storageV5: deps.storageV5,
          credentials: deps.credentials,
        });
        if (pe.kind === "rebound") {
          (logFeatureSad("send_message_pin_guard", "rebound"),
            emitRouteTelemetry("unresolved", "not_reachable"));
          let I = `'${pe.name}' now resolves to a different agent than it did earlier in this conversation: earlier sends went to [${pe.previous.ref}], which this name no longer reaches. Nothing was sent.`,
            B = `Not sent \u2014 '${pe.name}' now means a different agent than it did earlier in this conversation; asked Claude to confirm which one it wants.`,
            id = pe.previous.id,
            L =
              Um(id) !== null
                ? "If you need the earlier agent and it is still running, address it by its agent ID from its spawn result."
                : `The earlier recipient is ${sessionIdBody(id) !== id ? "a Claude session on another machine (cloud or Remote Control)" : LOCAL_SESSION_LABEL}; this name now belongs to an agent in this session.${any ? ` Use ${LISTAGENTS} if you still need that session.` : ""}`;
          if (pe.next === void 0) {
            let G = any
              ? `Use ${LISTAGENTS} to see everyone you can message.`
              : "Check the spelling, or use the agent ID from a background agent's spawn result.";
            return {
              data: {
                success: !1,
                message: `${I}
${G}`,
                display: B,
              },
            };
          }
          return {
            data: {
              success: !1,
              message: `${I}
It now resolves to:
  ${agentAddressLabel(pe.next, Date.now())}
To message the new agent, re-send with its ref:
e.g. {"to": "${bOe(pe.next)}", ...}
${L}`,
              display: B,
            },
          };
        }
        let he = pe.pin ? { pin: pe.pin } : void 0;
        if (he) logFeatureOk("send_message_pin_guard");
        let oe = deps.hookServesModel ? void 0 : deps.hookCaller,
          J = (I, B) => {
            let A = isUnknownPluginSpawnedAgent(deps),
              L = oe === void 0 && !A ? void 0 : pluginInputHoldReason();
            if (L === void 0) return;
            if (oe === void 0) logForDebugging(`SendMessage held: ${B} (${L})`);
            else Km(() => toastStoppedOnce(oe));
            return (
              emitRouteTelemetry(I, "not_reachable"),
              { data: { success: !1, message: `${B}: ${L}.` } }
            );
          },
          ye = `Agent "${"agentName" in resolvedRecipient ? resolvedRecipient.agentName : input.to}" was not resumed`,
          le = `Teammate "${"agentName" in resolvedRecipient ? resolvedRecipient.agentName : input.to}" was not messaged`;
        if (typeof input.message !== "string") {
          let I = resolvedRecipient.kind === "mailbox" ? resolvedRecipient.recipientName : input.to,
            B =
              resolvedRecipient.kind === "mailbox"
                ? (resolvedRecipient.displayName ?? resolvedRecipient.recipientName)
                : input.to;
          if (deps.agentId) {
            let H = deps.resolverState().tasks[deps.agentId];
            if (isLocalAgent(H) || deps.agentContext?.agentType !== "teammate")
              return (
                emitRouteTelemetry("mailbox", "not_reachable"),
                {
                  data: {
                    success: !1,
                    message:
                      "Structured team-protocol messages (shutdown/plan responses and requests) are acts of the session itself and cannot be sent by a background subagent. Send a plain text message instead.",
                  },
                }
              );
          }
          let A = I;
          if (
            resolvedRecipient.kind === "mailbox" &&
            resolvedRecipient.memberAgentId !== void 0 &&
            input.message.type !== "shutdown_response"
          ) {
            let resolverState = deps.resolverState(),
              R = resolverState.teamContext?.teammates ?? {};
            if (
              resolvedRecipient.memberIdentitySource === "team-context" &&
              Object.hasOwn(R, resolvedRecipient.memberAgentId)
            )
              A = R[resolvedRecipient.memberAgentId].name;
            else if (resolvedRecipient.memberIdentitySource === "team-context")
              return (
                emitRouteTelemetry("mailbox", "not_reachable"),
                {
                  data: {
                    success: !1,
                    message: `The member this message was resolved to has left team '${getTeamName(resolverState.teamContext) ?? ""}' \u2014 nothing was sent. Another member may share the same display name '${B}'. Check the roster, or message the lead.`,
                  },
                }
              );
            else {
              let E = getTeamName(resolverState.teamContext);
              if (E) {
                let W = await readTeamFileAsync(E, deps.storageV5);
                if (W === null)
                  return (
                    emitRouteTelemetry("mailbox", "not_reachable"),
                    {
                      data: {
                        success: !1,
                        message: `Couldn't read the roster of team '${E}' to locate the member this message was resolved to \u2014 nothing was sent. Try again, or message the lead.`,
                      },
                    }
                  );
                let filtered = fdt(W, teamLeadAddress(resolverState)).filter(
                  (z) => z.agentId === resolvedRecipient.memberAgentId,
                );
                if (filtered.length > 1)
                  return (
                    emitRouteTelemetry("mailbox", "not_reachable"),
                    {
                      data: {
                        success: !1,
                        message: `The team roster lists the member this message was resolved to more than once \u2014 nothing was sent. Ask the lead to repair team '${E}''s file.`,
                      },
                    }
                  );
                let Y = filtered[0];
                if (Y === void 0)
                  return (
                    emitRouteTelemetry("mailbox", "not_reachable"),
                    {
                      data: {
                        success: !1,
                        message: `The member this message was resolved to has left team '${E}' \u2014 nothing was sent. Another member may share the same display name '${B}'. Check the roster, or message the lead.`,
                      },
                    }
                  );
                A = Y.name;
              }
            }
          }
          let L =
              input.message.type === "shutdown_response" &&
              wasRepaired(
                input.message.request_id,
                deps.agentId === void 0 ? void 0 : resolveSenderIdentity(deps, deps.agentId).from,
              ),
            G = L ? void 0 : J("mailbox", `Teammate "${B}" was not messaged`);
          if (G !== void 0) return G;
          let U;
          try {
            switch (input.message.type) {
              case "shutdown_request":
                U = await handleShutdownRequest(A, B, input.message.reason, deps);
                break;
              case "shutdown_response":
                if (
                  ((U = input.message.approve
                    ? await handleShutdownApproval(input.message.request_id, deps)
                    : await handleShutdownRejection(input.message.request_id, input.message.reason, deps)),
                  L && U.data.success && U.degradedClass === void 0)
                )
                  forgetRepair(input.message.request_id);
                break;
              case "plan_approval_response":
                U = input.message.approve
                  ? await handlePlanApproval(A, B, input.message.request_id, input.message.feedback, deps)
                  : await handlePlanRejection(
                      A,
                      B,
                      input.message.request_id,
                      input.message.feedback ?? "Plan needs revision",
                      deps,
                    );
                break;
            }
          } catch (error) {
            throw (emitRouteTelemetry("mailbox", "not_reachable"), error);
          }
          return (
            emitRouteTelemetry(
              "mailbox",
              U.data.success ? void 0 : "mailbox_write_failed",
              U.degradedClass ? { degradedClass: U.degradedClass } : void 0,
            ),
            { data: U.data }
          );
        }
        let me = agentId !== void 0 && x !== void 0 ? xBe(x, input.message) : input.message,
          Se = agentId !== void 0 && x !== void 0 ? fq(deps.messages()) : [],
          Fe = Se.length > 0 ? { toolsUsed: Se } : {},
          rs = ee ? Hb(ee.displayName) : "",
          Te =
            agentId !== void 0 && x !== void 0
              ? {
                  kind: "peer",
                  from: x,
                  senderTaskId: agentId,
                  ...(rs && { name: rs }),
                  body: lIt(input.message),
                  ...(oe !== void 0 && { plugin: oe }),
                }
              : { kind: "coordinator", ...(oe !== void 0 && { plugin: oe }) },
          is = (I) => (
            emitRouteTelemetry("resume", "not_reachable"),
            {
              data: {
                success: !1,
                message: `Agent "${I}" was stopped by the user and was not resumed. Treat its work as cancelled; only start a new agent for it if the user explicitly asks.`,
              },
            }
          ),
          ds = (I) => (
            emitRouteTelemetry("resume", void 0, { degradedClass: "session_full" }),
            { data: { success: !1, message: noRoomToResumeMessage(I) } }
          );
        if (
          (resolvedRecipient.kind === "agent-stopped" || resolvedRecipient.kind === "agent-evicted") &&
          k4s(resolvedRecipient.agentId)
        )
          return is(resolvedRecipient.agentName);
        switch (resolvedRecipient.kind) {
          case "main": {
            if (agentId === void 0)
              return (
                emitRouteTelemetry("in_process", "not_reachable"),
                {
                  data: {
                    success: !1,
                    message: `You are the main conversation \u2014 "${MAIN}" addresses you. Send to a named agent instead.`,
                  },
                }
              );
            let I = J("in_process", "The main conversation was not messaged");
            if (I !== void 0) return I;
            if (!maySendOneMore(agentId))
              return (
                emitRouteTelemetry("in_process", void 0, { degradedClass: "session_full" }),
                { data: { success: !1, message: SEND_BUDGET_EXHAUSTED } }
              );
            return (
              enqueueCommand({
                mode: "prompt",
                agentId: mainAgentId(),
                value: me,
                ...Fe,
                priority: "next",
                origin: Te,
                skipSlashCommands: !0,
                isMeta: !0,
                skipAttachments: !0,
              }),
              emitRouteTelemetry("in_process"),
              { data: { success: !0, message: "Message queued for the main conversation's next turn." } }
            );
          }
          case "agent-live": {
            let B =
              deps.taskRegistry.get(resolvedRecipient.agentId)?.status === "running"
                ? void 0
                : J("resume", ye);
            if (B !== void 0) return B;
            if (agentId !== void 0 && !maySendOneMore(agentId))
              return (
                emitRouteTelemetry("in_process", void 0, { degradedClass: "session_full" }),
                { data: { success: !1, message: SEND_BUDGET_EXHAUSTED } }
              );
            return (
              clearWaitingNotice(resolvedRecipient.agentId, agentId, deps.taskRegistry),
              sendMessageToAgent(resolvedRecipient.agentId, me, deps.taskRegistry, {
                origin: Te,
                isMeta: !0,
                forwarded: getFreshTurnsForAgent(deps, resolvedRecipient.agentId),
                ...Fe,
              }),
              emitRouteTelemetry("in_process"),
              {
                data: {
                  success: !0,
                  message: `Message queued for delivery to ${resolvedRecipient.agentName} at its next tool round.${isCcsTenant() ? "" : " If it finishes first, it is resumed with the message and notifies again, so wait for that notification before resending."}`,
                  ...he,
                },
              }
            );
          }
          case "agent-stopped-by-user":
            return is(resolvedRecipient.agentName);
          case "agent-stopped": {
            let I = J("resume", ye);
            if (I !== void 0) return I;
            let B = reserveResumeRoom(agentId);
            if (B === void 0) return ds(resolvedRecipient.agentName);
            clearWaitingNotice(resolvedRecipient.agentId, agentId, deps.taskRegistry);
            try {
              let A = await RFo(B, () =>
                runEngine(resumeAgentForReply, {
                  agentId: resolvedRecipient.agentId,
                  prompt: me,
                  ...(Se.length > 0 && { promptToolsUsed: Se }),
                  promptOrigin: Te,
                  liveTranscript: getQueueBusyCheck(deps),
                  invokingRequestId: assistantMessage?.requestId,
                  parentPromptId: promptIdForRequest(deps.messages(), deps.agentContext),
                }),
              );
              if (isResumeDenied(A))
                return (
                  emitRouteTelemetry("resume", "not_reachable"),
                  { data: { success: !1, message: A.deniedByPlugin } }
                );
              let L = A.inlineHandback !== void 0,
                G = deps.resolverState().tasks[resolvedRecipient.agentId],
                U = !isLocalAgent(G) || !G.ownerAgentId || G.ownerAgentId === mainAgentId();
              return (
                emitRouteTelemetry("resume", void 0, L ? { blockedWait: !0 } : void 0),
                {
                  data: {
                    success: !0,
                    ...(A.inlineHandback
                      ? buildInlineHandback(resolvedRecipient.agentName, A.inlineHandback, {
                          messages: deps.messages(),
                          innerCall: deps.innerCall,
                        })
                      : { message: `Resuming agent ${Ze(resolvedRecipient.agentName)}` }),
                    ...(!L && U && { resumedAgentId: resolvedRecipient.agentId }),
                    ...(!L && { revivedAgentId: resolvedRecipient.agentId }),
                    ...he,
                  },
                }
              );
            } catch (error) {
              if (error instanceof AgentResumeInProgressError) {
                if (agentId !== void 0 && !xfn(agentId))
                  return (
                    emitRouteTelemetry("unresolved", void 0, { degradedClass: "own_agents_only" }),
                    { data: { success: !1, message: SEND_MESSAGE_SWITCHED_OFF } }
                  );
                let L = sendMessageToAgent(resolvedRecipient.agentId, me, deps.taskRegistry, {
                  origin: Te,
                  isMeta: !0,
                  forwarded: getFreshTurnsForAgent(deps, resolvedRecipient.agentId),
                  ...Fe,
                });
                return (
                  emitRouteTelemetry("in_process", L ? void 0 : "not_reachable"),
                  {
                    data: {
                      success: L,
                      message: L
                        ? `${resolvedRecipient.agentName} is already waking; message queued for its next tool round (not delivered if the agent turns out to have been stopped).`
                        : `${resolvedRecipient.agentName} is being resumed by another caller and its task record is gone; the message was not delivered. Retry shortly.`,
                      ...(L && he),
                    },
                  }
                );
              }
              return (
                emitRouteTelemetry(
                  "resume",
                  classifyResumeError(error),
                  isResumedInlineRunError(error) ? { blockedWait: !0 } : void 0,
                ),
                {
                  data: {
                    success: !1,
                    message:
                      error instanceof AgentStoppedByUserError
                        ? errorMessage(error)
                        : error instanceof ResumeAgentStateError
                          ? `Agent "${resolvedRecipient.agentName}" is stopped (${resolvedRecipient.status}) and could not be resumed: ${errorMessage(error)}`
                          : `Agent "${resolvedRecipient.agentName}" was resumed but ${error instanceof Error && error.name === "AbortError" ? "was interrupted" : "failed while running"}: ${errorMessage(error)}`,
                  },
                }
              );
            }
          }
          case "agent-evicted": {
            let agentId_2 = resolvedRecipient.agentId,
              B = () => (
                emitRouteTelemetry("unresolved", void 0, { degradedClass: "own_agents_only" }),
                { data: { success: !1, message: SUBAGENT_ONLY_SEND_MESSAGE } }
              ),
              A = e6() ? await classifyStoppedAgentKind(agentId_2, deps) : "subagent";
            if (A === "unknown" || A === "unreadable")
              return (
                emitRouteTelemetry("unresolved", void 0, { degradedClass: "own_agents_only" }),
                {
                  data: {
                    success: !1,
                    message:
                      A === "unknown"
                        ? agentSettingsMissingMessage(agentId_2)
                        : agentSettingsUnreadableMessage(agentId_2),
                  },
                }
              );
            if (A !== "subagent") return B();
            let L = deps.toolState.get(qs),
              G = L.get(agentId_2);
            if (G) {
              let R = await G,
                E = R ? deps.resolverState().tasks[R] : void 0;
              if (E && isInProcessTeammateTask(E)) {
                let W = J("mailbox", le);
                if (W !== void 0) return W;
                let j = await queueToRunningTeammate(
                  E,
                  input.message,
                  input.summary,
                  deps,
                  resolvedRecipient.agentName,
                  he,
                );
                return (
                  emitRouteTelemetry("mailbox", j.data.success ? void 0 : "mailbox_write_failed", {
                    blockedWait: !0,
                  }),
                  j
                );
              }
            }
            let withResolvers = Promise.withResolvers();
            L.set(agentId_2, withResolvers.promise);
            let H = null;
            try {
              let found = Object.values(deps.resolverState().tasks).find(
                (z) =>
                  isInProcessTeammateTask(z) &&
                  z.status === "running" &&
                  z.identity.resumableAgentId === agentId_2,
              );
              if (found && e6()) return (withResolvers.resolve(null), B());
              if (found && isInProcessTeammateTask(found)) {
                withResolvers.resolve(found.id);
                let z = J("mailbox", le);
                if (z !== void 0) return z;
                let K = await queueToRunningTeammate(
                  found,
                  input.message,
                  input.summary,
                  deps,
                  found.identity.agentName,
                  he,
                );
                return (emitRouteTelemetry("mailbox", K.data.success ? void 0 : "mailbox_write_failed"), K);
              }
              if (((H = await fs(agentId_2, deps.storageV5)), H && e6()))
                return (withResolvers.resolve(null), B());
              if (H) {
                let z = H.name ?? resolvedRecipient.agentName,
                  K = H.teamName ?? getTeamName(deps.resolverState().teamContext);
                for (let Z of Object.values(deps.resolverState().tasks))
                  if (
                    isInProcessTeammateTask(Z) &&
                    Z.status === "running" &&
                    (Z.identity.resumableAgentId === agentId_2 ||
                      (Z.identity.agentName === z && Z.identity.teamName === K))
                  ) {
                    withResolvers.resolve(Z.id);
                    let de = J("mailbox", le);
                    if (de !== void 0) return de;
                    let ue = await queueToRunningTeammate(
                      Z,
                      input.message,
                      input.summary,
                      deps,
                      resolvedRecipient.agentName,
                      he,
                    );
                    return (
                      emitRouteTelemetry("mailbox", ue.data.success ? void 0 : "mailbox_write_failed"),
                      ue
                    );
                  }
                let V = J("resume", ye);
                if (V !== void 0) return (withResolvers.resolve(null), V);
                let Q = await runEngine(resumeInProcessTeammate, {
                  resumableAgentId: agentId_2,
                  prompt: input.message,
                  senderName: x,
                  meta: H,
                  fallbackName: resolvedRecipient.agentName,
                });
                return (
                  withResolvers.resolve(Q.taskId),
                  emitRouteTelemetry("resume"),
                  {
                    data: {
                      success: !0,
                      message:
                        (Q.resumedMessageCount > 0
                          ? `Teammate "${resolvedRecipient.agentName}" was not running; resumed it as an in-process teammate with ${Q.resumedMessageCount} prior messages and your message as its next prompt.`
                          : `Teammate "${resolvedRecipient.agentName}" was not running; resumed it as an in-process teammate (no prior transcript) with your message as its next prompt.`) +
                        (Q.definitionNotice ? ` ${Q.definitionNotice}` : ""),
                      ...he,
                    },
                  }
                );
              }
              withResolvers.resolve(null);
              let E = J("resume", ye);
              if (E !== void 0) return E;
              let W = reserveResumeRoom(agentId);
              if (W === void 0) return ds(resolvedRecipient.agentName);
              let j = await RFo(W, () =>
                runEngine(resumeAgentForReply, {
                  agentId: agentId_2,
                  prompt: me,
                  ...(Se.length > 0 && { promptToolsUsed: Se }),
                  promptOrigin: Te,
                  liveTranscript: getQueueBusyCheck(deps),
                  invokingRequestId: assistantMessage?.requestId,
                  parentPromptId: promptIdForRequest(deps.messages(), deps.agentContext),
                }),
              );
              if (isResumeDenied(j))
                return (
                  emitRouteTelemetry("resume", "not_reachable"),
                  { data: { success: !1, message: j.deniedByPlugin } }
                );
              let Y = j.inlineHandback !== void 0;
              return (
                emitRouteTelemetry("resume", void 0, Y ? { blockedWait: !0 } : void 0),
                {
                  data: {
                    success: !0,
                    ...(j.inlineHandback
                      ? buildInlineHandback(resolvedRecipient.agentName, j.inlineHandback, {
                          messages: deps.messages(),
                          innerCall: deps.innerCall,
                        })
                      : { message: `Resuming agent ${Ze(resolvedRecipient.agentName)}` }),
                    ...(Y ? {} : { resumedAgentId: agentId_2, revivedAgentId: agentId_2 }),
                    ...he,
                  },
                }
              );
            } catch (error) {
              return (
                withResolvers.resolve(null),
                emitRouteTelemetry(
                  "resume",
                  classifyResumeError(error),
                  isResumedInlineRunError(error) ? { blockedWait: !0 } : void 0,
                ),
                {
                  data: {
                    success: !1,
                    message:
                      error instanceof AgentStoppedByUserError
                        ? errorMessage(error)
                        : H
                          ? `Failed to resume teammate "${resolvedRecipient.agentName}": ${errorMessage(error)}`
                          : error instanceof ResumeAgentStateError &&
                              error.transcriptMissing &&
                              Um(resolvedRecipient.agentName) !== null &&
                              !e6()
                            ? `Agent "${resolvedRecipient.agentName}" could not be resumed: ${errorMessage(error)}. If you read this id in a message from another Claude Code process (e.g. the lead's subagent, seen from a teammate pane), it never ran in this session \u2014 reply through "${TEAM_LEAD}" or the session that sent it instead of the raw id.`
                            : error instanceof ResumeAgentStateError
                              ? `Agent "${resolvedRecipient.agentName}" could not be resumed: ${errorMessage(error)}`
                              : `Agent "${resolvedRecipient.agentName}" was resumed but ${error instanceof Error && error.name === "AbortError" ? "was interrupted" : "failed while running"}: ${errorMessage(error)}`,
                  },
                }
              );
            } finally {
              L.delete(agentId_2);
            }
          }
          case "local-session": {
            let {
                sendToUdsSocket: sendToUdsSocket,
                ownMessagingSocket: ownMessagingSocket,
              } = require("./chunk-ewxn4535.js"),
              A = getCurrentSessionPeerName(),
              {
                subscribeToPeerIdle: subscribeToPeerIdle,
                idleSubscriptionLines: idleSubscriptionLines,
              } = require("./chunk-7bvr1kd2.js"),
              { notify: notify, refusedForPrincipal: refusedForPrincipal } = getNotifyIdleEligibility(
                input,
                deps,
              ),
              R = checkEmptyCrossSessionMessage({
                input: input,
                plainMessage: input.message,
                notify: notify,
                refusedForPrincipal: refusedForPrincipal,
                assistantMessage: assistantMessage,
                toolUseId: deps.toolUseId,
                emit: emitRouteTelemetry,
              });
            if (R !== void 0) return R;
            if (refusedForPrincipal) Je();
            if (notify && input.message.trim().length === 0) {
              let E = await subscribeToPeerIdle(
                  resolvedRecipient.sock,
                  resolvedRecipient.displayName,
                  deps.storageV5,
                  q,
                ),
                W = E.ok || E.reason === "send-uncertain";
              if (W)
                pinSendTarget(deps.setSendMessagePins, resolvedRecipient.displayName, {
                  kind: "session",
                  id: resolvedRecipient.pinId,
                  sock: resolvedRecipient.sock,
                  claimedSessionIds: resolvedRecipient.claimedSessionIds,
                });
              emitUdsSendOutcome(E, emitRouteTelemetry, {
                ...(resolvedRecipient.exactUnique && { exactUnique: !0 }),
                ...(resolvedRecipient.previouslyPinned && { previouslyPinned: !0 }),
                ...(resolvedRecipient.restartedSincePin && { restartedSincePin: !0 }),
                ...(resolvedRecipient.identityContested && { identityContested: !0 }),
                ...(resolvedRecipient.searchTruncated && { searchTruncated: !0 }),
              });
              let j = W ? describePinnedChoice(resolvedRecipient, ke, "live session", "subscription") : "",
                Y = W ? describeConfirmedChoice(resolvedRecipient, "live session", "subscription") : "",
                { model: model, display: display } = idleSubscriptionLines(
                  resolvedRecipient.displayName,
                  E,
                  LISTAGENTS,
                ),
                V = !E.ok && E.reason === "peer-gone";
              return {
                data: {
                  success: E.ok,
                  message: V
                    ? model
                    : `${model} (${resolvedRecipient.displayName} is ${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(resolvedRecipient)})${j}`,
                  display: V
                    ? display
                    : `${display} (${LOCAL_SESSION_LABEL}${describeLocalTargetCaveats(resolvedRecipient)})${Y}`,
                },
              };
            }
            try {
              let { msgId: msgId } = await sendToUdsSocket(
                  resolvedRecipient.sock,
                  me,
                  deps.storageV5,
                  A,
                  void 0,
                  lastPeerHopChain(deps.messages()),
                  q,
                  { fromPlugin: deps.hookCaller, recipientName: resolvedRecipient.displayName },
                ),
                W = notify
                  ? await subscribeToPeerIdle(
                      resolvedRecipient.sock,
                      resolvedRecipient.displayName,
                      deps.storageV5,
                      q,
                    )
                  : void 0,
                j = W ? idleSubscriptionLines(resolvedRecipient.displayName, W, LISTAGENTS) : void 0,
                Y = j
                  ? void 0
                  : describeSkippedSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId),
                z = j
                  ? `
${j.model}`
                  : (Y?.model ?? "");
              (pinSendTarget(deps.setSendMessagePins, resolvedRecipient.displayName, {
                kind: "session",
                id: resolvedRecipient.pinId,
                sock: resolvedRecipient.sock,
                claimedSessionIds: resolvedRecipient.claimedSessionIds,
              }),
                emitRouteTelemetry("uds", void 0, {
                  ...(resolvedRecipient.exactUnique && { exactUnique: !0 }),
                  ...(resolvedRecipient.previouslyPinned && { previouslyPinned: !0 }),
                  ...(resolvedRecipient.restartedSincePin && { restartedSincePin: !0 }),
                  ...(resolvedRecipient.identityContested && { identityContested: !0 }),
                  ...(resolvedRecipient.searchTruncated && { searchTruncated: !0 }),
                  ...(W && !W.ok && { degradedClass: classifyUdsSendFailure(W) }),
                }));
              let K = input.summary || truncate(input.message, 50),
                V = ownMessagingSocket() !== void 0,
                Q = describeSubagentSender(agentId, x, { oneWay: !V }),
                Z = describeLocalTargetCaveats(resolvedRecipient),
                de = describePinnedChoice(resolvedRecipient, ke);
              return {
                data: {
                  success: !0,
                  message: `\u201C${K}\u201D \u2192 ${resolvedRecipient.displayName} (${LOCAL_SESSION_LABEL}${Z}${Pvo(V)}${Q.message})${de}${z}`,
                  display: `\u201C${K}\u201D \u2192 sent to ${resolvedRecipient.displayName} \u2014 ${LOCAL_SESSION_LABEL}${Z}${Q.display}${describeConfirmedChoice(resolvedRecipient)}${
                    j
                      ? `
${j.display}`
                      : Y
                        ? `
${Y.display}`
                        : ""
                  }`,
                  msg_id: msgId,
                },
              };
            } catch (error) {
              let W = getErrnoCode(error);
              emitRouteTelemetry("uds", classifyUdsSendError(error), {
                ...(resolvedRecipient.exactUnique && { exactUnique: !0 }),
                ...(resolvedRecipient.previouslyPinned && { previouslyPinned: !0 }),
                ...(resolvedRecipient.restartedSincePin && { restartedSincePin: !0 }),
                ...(resolvedRecipient.identityContested && { identityContested: !0 }),
                ...(resolvedRecipient.searchTruncated && { searchTruncated: !0 }),
              });
              let j = classifyPeerSendError(error),
                Y =
                  j === "gone"
                    ? ` \u2014 that session may have just exited.${any ? ` Call ${LISTAGENTS} to see who is reachable now.` : ""}`
                    : j === "busy"
                      ? x3r(error)
                        ? " \u2014 this machine's session registry could not be read just now (a transient local condition). Retry the same name shortly."
                        : " \u2014 the session is alive but momentarily busy. Retry the same name shortly."
                      : kTt(error) || TTt(error)
                        ? `: ${errorMessage(error)}`
                        : "";
              return {
                data: {
                  success: !1,
                  message: `Failed to send to ${resolvedRecipient.displayName}${W ? ` (${W})` : ""}${Y || "."}${describeNoSubscription(refusedForPrincipal, input, assistantMessage, deps.toolUseId)}`,
                },
              };
            }
          }
          case "cloud-session": {
            let I = resolvedRecipient.via === "cloud" ? "cloud" : "remote-control",
              B = getCrossMachineUnavailableMessage(I);
            if (B !== null) return { data: { success: !1, message: B } };
            let A = resolvedRecipient.via === "cloud" ? "cloud session" : "Remote Control session",
              L = resolvedRecipient.via === "cloud" ? "cloud_name" : "remote_control_name",
              {
                cloudSendRefusalNamingServiceTool: cloudSendRefusalNamingServiceTool,
                postInterClaudeMessage: postInterClaudeMessage,
                isLikelyStaleBridgeError: isLikelyStaleBridgeError,
                classifyBridgeSendError: classifyBridgeSendError,
              } = require("./chunk-ypjxapg8.js"),
              {
                isRemoteControlPeerUnreachableFromHere: isRemoteControlPeerUnreachableFromHere,
                formatUnreachableElevatedRefusal: formatUnreachableElevatedRefusal,
              } = require("./chunk-3kb57csj.js");
            if (resolvedRecipient.via === "remote-control" && isRemoteControlPeerUnreachableFromHere())
              return (
                emitRouteTelemetry("bridge", "bridge_auth", { via: L }),
                {
                  data: {
                    success: !1,
                    message:
                      unreachableElevatedRefusal(
                        deps.session,
                        resolvedRecipient.sessionId,
                        resolvedRecipient.displayName,
                        () => findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
                      ) ?? formatUnreachableElevatedRefusal(resolvedRecipient.displayName),
                  },
                }
              );
            let j = cannotReceiveRefusal(
              deps.session,
              resolvedRecipient.sessionId,
              resolvedRecipient.displayName,
            );
            if (j)
              return (
                emitRouteTelemetry("bridge", "recipient_gate_off", { via: L }),
                { data: { success: !1, message: j } }
              );
            let Y = await isolationDispatchGate({
              tool: SendMessageTool,
              input: input,
              ask: ask,
              permissionPhase: deps.permissionPhase,
              alreadyApproved: re,
              recipientLabel: `${A} '${resolvedRecipient.displayName}'`,
              resolution: resolvedRecipient,
              parse: ($e) => getSendMessageInputSchema().safeParse($e),
            });
            if (!Y.proceed)
              return (
                emitRouteTelemetry("bridge", sendDenialKind(Y), { blockedWait: !0, via: L }),
                { data: { success: !1, message: Y.message } }
              );
            let z = getCrossMachineUnavailableMessage(I);
            if (z !== null) return { data: { success: !1, message: z } };
            let input_2 = Y.input,
              V = typeof input_2.message === "string" ? input_2.message : input.message,
              Q = Ns(V, () => emitRouteTelemetry("bridge", "handler_rewrite", { via: L }));
            if (Q !== void 0) return Q;
            let Z = input_2 === input ? me : agentId !== void 0 && x !== void 0 ? xBe(x, V) : V,
              de = getCurrentSessionOffBoxPeerName(),
              ue = await postInterClaudeMessage(
                resolvedRecipient.sessionId,
                Z,
                de,
                void 0,
                lastPeerHopChain(deps.messages()),
                q,
                deps.credentials,
                deps.hookCaller,
              ),
              ce = input_2.summary || truncate(V, 50);
            if (
              (emitRouteTelemetry("bridge", ue.ok ? void 0 : classifyBridgeSendError(ue.error), {
                via: L,
                ...(Y.asked && { blockedWait: !0 }),
                ...(resolvedRecipient.exactUnique && { exactUnique: !0 }),
                ...(resolvedRecipient.previouslyPinned && { previouslyPinned: !0 }),
                ...(resolvedRecipient.searchTruncated && { searchTruncated: !0 }),
              }),
              !ue.ok)
            ) {
              let $e = cloudSendRefusalNamingServiceTool(
                ue.error,
                resolvedRecipient.displayName,
                resolvedRecipient.sessionId,
                () => findRemoteSendTool(deps.tools, deps.mcpClients, deps.toolAliases),
              );
              if ($e !== void 0) return { data: { success: !1, message: $e } };
              let Zs = isLikelyStaleBridgeError(ue.error)
                ? ` \u2014 that ${A} may have ended${resolvedRecipient.via === "cloud" ? " or been archived" : " or disconnected"}.${any ? ` Call ${LISTAGENTS} to see who is reachable now.` : ""}`
                : "";
              return {
                data: {
                  success: !1,
                  message: `Failed to send to ${resolvedRecipient.displayName}: ${ue.error ?? "unknown"}${Zs}`,
                },
              };
            }
            pinSendTarget(deps.setSendMessagePins, resolvedRecipient.displayName, {
              kind: resolvedRecipient.refKind,
              id: resolvedRecipient.sessionId,
            });
            let Ne = describePinnedChoice(resolvedRecipient, ke, "agent"),
              ve = getReplyAddressProblem(),
              Ee = describeRemoteTargetCaveats(resolvedRecipient),
              Ie = describeSubagentSender(agentId, x, {
                oneWay: resolvedRecipient.via === "cloud" || ve !== void 0,
              }),
              ls = Ivo(
                resolvedRecipient.via === "remote-control" &&
                  !resolvedRecipient.reportsInbound &&
                  !resolvedRecipient.inboundReportUnavailable,
              ),
              Js =
                resolvedRecipient.via === "cloud"
                  ? "; one-way for now: a cloud session cannot message other sessions back yet \u2014 do not ask it to reply here; its response appears in its own transcript at claude.ai/code"
                  : ve
                    ? `; one-way: ${describeReplyAddressProblem(ve)}, so the receiver cannot address a reply to this session`
                    : unnamedSessionNote(de);
            return {
              data: {
                success: !0,
                message: `\u201C${ce}\u201D \u2192 ${resolvedRecipient.displayName} (${describeRemoteSessionKind(resolvedRecipient.via)}${ls.message}${NO_READ_RECEIPT_NOTE}${Js}${Ee}${Ie.message})${Ne}`,
                display: `\u201C${ce}\u201D \u2192 sent to ${resolvedRecipient.displayName} \u2014 ${resolvedRecipient.via === "cloud" ? "a cloud session (can't reply yet)" : `a session on another machine via Remote Control${ve ? ` (one-way: ${ve === "rc-disconnected" ? "Remote Control is not connected here" : "no reply address here"})` : ""}`}${ls.display}${NO_READ_RECEIPT_DISPLAY}${Ee}${Ie.display}${describeConfirmedChoice(resolvedRecipient, "agent")}`,
                msg_id: ue.msgId,
              },
            };
          }
          case "mailbox": {
            let I = J("mailbox", `Teammate "${resolvedRecipient.recipientName}" was not messaged`);
            if (I !== void 0) return I;
            let { data: B, errorClass: errorClass } = await handleMessage(
              resolvedRecipient.recipientName,
              input.message,
              input.summary,
              deps,
              resolvedRecipient.memberAgentId,
              resolvedRecipient.memberIdentitySource,
            );
            return (emitRouteTelemetry("mailbox", B.success ? void 0 : (errorClass ?? "other")), { data: B });
          }
        }
      },
    };
    return {
      ...h,
      call: (e, r) => {
        let permissionPhase = r.permissionPhase;
        return sendThroughHooks({
          deps: toolDeps,
          input: e,
          toolCall: r,
          deliver: (y, b) =>
            h.deliver(
              y,
              permissionPhase === b.permissionPhase ? b : { ...b, permissionPhase: permissionPhase },
            ),
          reparse: reparseSendMessageInput,
          validate: h.validateInput,
          carryApproval: (y, b) => {
            permissionPhase = rebasePermissionPhase(permissionPhase, y, b, getToAndMessageFields);
          },
          adoptReask: () => {
            return;
          },
        });
      },
    };
  },
  extractSearchText(s) {
    return bHs(s);
  },
  renderToolUseMessage(input) {
    if (typeof input.to === "string" && input.to.startsWith("did:") && typeof input.message === "string") {
      let h = (y) =>
          isNetworkPath(y)
            .replace(/[\s\u2800]+/g, " ")
            .trim(),
        e = h(input.message),
        r = countGraphemes(e),
        a = r > 200 ? `${splitGraphemes(e).slice(0, 200).join("")}\u2026 [${r} chars total]` : e;
      return stripNonPrintable(`${h(input.to)} \u2190 "${a}"`);
    }
    if (typeof input.message !== "object" || input.message === null) return null;
    if (input.message.type === "plan_approval_response")
      return input.message.approve ? `approve plan from: ${input.to}` : `reject plan from: ${input.to}`;
    return null;
  },
});
//@ chunk-e6aww6q8.js:1498135-1498194 placement
function e6() {
  return getHostAgentPolicy().messagingBeyondOwnAgentsDisabled;
}
//@ chunk-e6aww6q8.js:1498194-1498458 placement
var SUBAGENT_ONLY_SEND_MESSAGE = `Not sent. In this session ${SENDMESSAGE} carries only plain text, and only to agents of this session: an agent launched in it with the ${AGENT} tool or, from a subagent, "main". Set \`to\` to such an agent's name, to the agentId from its spawn result, or to "main".`;
//@ chunk-e6aww6q8.js:1498458-1498660 placement
function agentSettingsMissingMessage(e) {
  return `Not sent. This session has no saved settings for agent ${e} that it can read: the agent never ran here, or its settings were lost. Start a new agent if the work is still needed.`;
}
//@ chunk-e6aww6q8.js:1498660-1498821 placement
function agentSettingsUnreadableMessage(e) {
  return `Not sent. The saved settings of agent ${e} could not be read just now. Send the message again; start a new agent only if that fails too.`;
}
/**
 * SendMessage 不可用的结果文本：子代理被关闭发送或已停止，以及本轮启动/恢复/写入次数已用尽；提示把内容放在最终回复中。
 */
//@ chunk-e6aww6q8.js:1498821-1499289 placement
var SEND_MESSAGE_SWITCHED_OFF = `Not sent. You cannot use ${SENDMESSAGE} in this session: it is switched off for subagents, or you were stopped. Put what you need to pass on in your final response, which goes to whoever launched or resumed you.`,
  SEND_BUDGET_EXHAUSTED =
    "Not sent. This session's agents have launched, resumed and written as often as they may before the user next writes, or you can no longer send here. Put what you need to pass on in your final response, which goes to whoever launched or resumed you.";
//@ chunk-e6aww6q8.js:1499289-1499569 placement
function noRoomToResumeMessage(e) {
  return `Agent "${e}" was not resumed, and your message was not delivered: this session has no room for another agent now, or has started as many as it may between two messages from the user. Go on without it, or say in your final response what you needed from it.`;
}
//@ chunk-e6aww6q8.js:1499569-1499636 placement
var v4s = "a message here goes only to an agent of the same session";
//@ chunk-e6aww6q8.js:1499636-1499789 placement
function checkHostSendTarget({ to: to, message: message }) {
  if (!e6()) return;
  return typeof message !== "string" ||
    parseAddress(to).scheme !== "other" ||
    (isTopHostSession() && LOCAL_TASK_ID_PATTERN.test(to)) ||
    to.includes("@") ||
    !isValidPipeOrPath(to)
    ? SUBAGENT_ONLY_SEND_MESSAGE
    : void 0;
}
//@ chunk-e6aww6q8.js:1499789-1499882 placement
function xfn(e) {
  if (!e6()) return !0;
  try {
    return getHostAgentPolicy().subagentSends?.open(e) ?? !1;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1499882-1499994 placement
function reserveResumeRoom(e) {
  if (!e6() || e === void 0) return () => {};
  try {
    return getHostAgentPolicy().subagentSends?.roomForResume(e);
  } catch {
    return;
  }
}
//@ chunk-e6aww6q8.js:1499994-1500097 placement
function maySendOneMore(e) {
  if (!e6()) return !0;
  try {
    return getHostAgentPolicy().subagentSends?.maySendOneMore(e) ?? !1;
  } catch {
    return !1;
  }
}
//@ chunk-e6aww6q8.js:1500097-1500188 placement
function k4s(e) {
  if (!e6()) return !1;
  try {
    return getHostAgentPolicy().stoppedByPerson?.(e) ?? !0;
  } catch {
    return !0;
  }
}
//@ chunk-e6aww6q8.js:1500188-1500246 placement
async function RFo(e, n) {
  try {
    return await n();
  } finally {
    e();
  }
}
//@ chunk-e6aww6q8.js:1500246-1500353 placement
var SUBAGENT_TARGET_KINDS = new Set([
  "main",
  "agent-live",
  "agent-stopped",
  "agent-evicted",
  "agent-stopped-by-user",
  "not-found",
]);
//@ chunk-e6aww6q8.js:1500353-1500565 placement
function checkHostResolvedTarget(e) {
  let n =
    SUBAGENT_TARGET_KINDS.has(e.kind) ||
    (e.kind === "ambiguous" &&
      e.candidates !== void 0 &&
      e.candidates.length > 0 &&
      e.candidates.length === e.total &&
      e.candidates.every(({ kind: kind }) => kind === "subagent"));
  return e6() && !n ? SUBAGENT_ONLY_SEND_MESSAGE : void 0;
}
/**
 * 发送者类别：进程内子代理 / 队友（带名字）/ 会话。
 */
//@ chunk-18hwfzwa.js:1670037-1670156 callgraph-fingerprint = handleBroadcast (0.172)
function getSenderKind() {
  if (isInProcessTeammate()) return { kind: "in-process" };
  if (isTeammate()) return { kind: "teammate", agentName: getAgentName() };
  return { kind: "session" };
}

export { xfn, getSenderKind, e6 };
