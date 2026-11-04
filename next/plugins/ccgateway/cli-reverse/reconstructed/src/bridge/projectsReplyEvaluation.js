/**
 * bridge/projectsReplyEvaluation.ts
 *
 * 2.1.316 新增。Projects 线程回复闸门：本回合没回复项目线程时要求模型补回复或声明无需回复。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ggn294th.js (16)
 * attribution: placement 16
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { aliasCanonicalNames, HEARTHBOT } from "../services/mcp/ccrMetaMcp.js";
import { buildMcpToolName } from "../services/mcp/mcpStringUtils.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { objectSchema, array, stringSchema, int, unknown } from "../../vendor/zod/v4/classic/schemas.js";
import { isCliOwnedConfig } from "../services/mcp/cliOwnedClients.js";
import { withDeadline } from "../utils/sleep.js";
import { logEvent } from "../services/analytics/index.js";
import { analyzeTurnTail } from "../utils/turnOrigin.js";
import {
  PROJECTS_REPLY_GATE_PREFIX,
  isHarnessMetaMessage,
  getLastAssistantMessage,
} from "../utils/messages.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";
import { parseExternalEventWake, isSessionInboxWake } from "../utils/externalEventWake.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ggn294th.js:645-680 placement
var TENGU_RC_THREAD_REPLY_GATE = "tengu_rc_thread_reply_gate";
//@ chunk-ggn294th.js:680-710 placement
function isProjectsReplyGateEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RC_THREAD_REPLY_GATE, true);
}
//@ chunk-ggn294th.js:710-1163 placement
/**
 * Projects 回复闸门的常量与参数 schema：no_reply_needed 工具名、每类追问上限 4、以及 terminal_tools/ask_text/status_nudge 等字段的 zod 校验。
 */
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS; // deferred: uses buildMcpToolName (../services/mcp/mcpStringUtils.js) of its import cycle while loading; runs once the cycle is complete
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS;
var mapped;
var NO_REPLY_NEEDED_TOOL_NAME;
var NO_REPLY_TOOL_SUFFIX;
var RC_OWNER;
var MAX_ASKS_AFTER_PERSON;
var projectsReplyGateParamsSchema;
deferInit("chunk-ggn294th.js:710", () => {
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = 5000;
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS = 1000;
  mapped = aliasCanonicalNames([
    "reply",
    "no_reply_needed",
    "post_message",
    "react",
    "update_message",
    "update_status",
  ]).map((toolName) => buildMcpToolName(HEARTHBOT, toolName));
  NO_REPLY_NEEDED_TOOL_NAME = buildMcpToolName(HEARTHBOT, "no_reply_needed");
  NO_REPLY_TOOL_SUFFIX = "__no_reply_needed";
  RC_OWNER = "rc_owner";
  MAX_ASKS_AFTER_PERSON = 4;
  projectsReplyGateParamsSchema = DoctorLazy(() =>
    objectSchema({
      terminal_tools: array(stringSchema().min(1).max(256)).min(1).max(64),
      ask_text: stringSchema().trim().min(1).max(4096),
      max_asks_after_person: int().min(0).max(MAX_ASKS_AFTER_PERSON),
      max_asks_after_server_event: int().min(0).max(MAX_ASKS_AFTER_PERSON),
      status_nudge: unknown().optional(),
      prompt_reminder: unknown().optional(),
    }),
  );
});
//@ chunk-ggn294th.js:1163-1334 placement
/**
 * 回复闸门等待参数的 zod schema
 */
var waitInputSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var trimmedPromptSchema;
deferInit("chunk-ggn294th.js:1163", () => {
  waitInputSchema = DoctorLazy(() =>
    objectSchema({
      seconds: int().min(1).max(86400),
      visible_tools: array(stringSchema().min(1).max(128)).min(1).max(32),
      text: stringSchema().trim().min(1).max(2048),
    }),
  );
  trimmedPromptSchema = DoctorLazy(() => stringSchema().trim().min(1).max(2048));
});
//@ chunk-ggn294th.js:1334-1419 placement
var TURN_ENDING_STOP_REASONS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ggn294th.js:1334", () => {
  TURN_ENDING_STOP_REASONS = new Set([
    "max_tokens",
    "model_context_window_exceeded",
    "pause_turn",
    "refusal",
  ]);
});
//@ chunk-ggn294th.js:1419-1532 placement
function isProjectsReplyMountConnected(appState) {
  let found = appState.mcp.clients.find((client) => client.name === HEARTHBOT);
  return found !== undefined && found.type === "connected" && isCliOwnedConfig(found.config);
}
//@ chunk-ggn294th.js:1532-1744 placement
async function joinProjectsMountBeforeFirstCommand(mountJoined, getAppState, waitMs) {
  if (!isProjectsReplyGateEnabled()) return;
  let startTime = performance.now();
  let settled = await withDeadline(
    mountJoined.then(() => true),
    waitMs,
  );
  logEvent("tengu_bridge_projects_mount_wait", {
    waited_ms: Math.round(performance.now() - startTime),
    settled: settled === true,
    connected: isProjectsReplyMountConnected(getAppState()),
  });
}
//@ chunk-ggn294th.js:1744-1918 placement
function isUnansweredProjectsRun(messages) {
  let decider = analyzeTurnTail(messages).decider;
  let deciderMessage = decider === null ? undefined : messages[decider.index];
  if (decider === null || deciderMessage === undefined) return false;
  return (
    (getMetaUserText(deciderMessage)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true ||
      isPersonAuthoredTurn(deciderMessage)) &&
    !findErroredReplyCall(messages.slice(decider.index + 1), mapped).answered
  );
}
//@ chunk-ggn294th.js:1918-2820 placement
/**
 * Projects 线程回复闸门：本回合没回复项目线程时要求模型补回复或声明无需回复。
 */
function evaluateProjectsReplyGate(messages, pending, policy) {
  let decider = analyzeTurnTail(messages).decider;
  let gateAskCount = 0;
  let cursor = decider;
  while (cursor !== null) {
    let message = messages[cursor.index];
    if (getMetaUserText(message)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true) gateAskCount++;
    else if (policy.kind !== "policy" || message === undefined || !isHarnessMetaMessage(message)) break;
    cursor = analyzeTurnTail(messages.slice(0, cursor.index)).decider;
  }
  let openingMessage = cursor === null ? undefined : messages[cursor.index];
  let personOpened =
    openingMessage !== undefined && (cursor?.userDriven === true || isProjectsUserTurn(openingMessage));
  let maxAsks = maxAsksForReplyGate(policy, openingMessage, personOpened);
  if (gateAskCount === 0 && maxAsks === 0)
    return {
      kind: "skip",
    };
  let turnMessages = [...messages.slice(decider === null ? 0 : decider.index + 1), ...pending];
  if (!turnMessages.some(isRealAssistantMessage))
    return {
      kind: "skip",
    };
  let { answered, noReplyOnly, erroredTerminalTool } =
    policy.kind === "policy"
      ? findErroredReplyCall(
          [...messages.slice(cursor === null ? 0 : cursor.index + 1), ...pending],
          policy.policy.terminalTools,
        )
      : findErroredReplyCall(turnMessages, mapped);
  if (answered)
    return {
      kind: "answered",
      noReplyOnly,
      personOpened,
    };
  if (
    policy.kind === "policy" &&
    (getLastAssistantMessage(pending)?.isApiErrorMessage === true ||
      TURN_ENDING_STOP_REASONS.has(
        turnMessages.findLast(isRealAssistantMessage)?.message.stop_reason ?? null,
      ))
  )
    return {
      kind: "skip",
    };
  let reason = erroredTerminalTool !== undefined ? "reply_errored" : "silent_turn";
  if (gateAskCount >= maxAsks)
    return {
      kind: "still_silent",
      reason,
      personOpened,
    };
  return {
    kind: "bounce",
    reason,
    text: `${PROJECTS_REPLY_GATE_PREFIX} ${replyGateBounceText(policy, erroredTerminalTool)}`,
    personOpened,
  };
}
//@ chunk-ggn294th.js:2820-2986 placement
/**
 * 回复闸门允许的追问次数
 */
function maxAsksForReplyGate(policy, openingMessage, personOpened) {
  switch (policy.kind) {
    case "remote_control":
      return openingMessage !== undefined && isPersonAuthoredTurn(openingMessage) ? 1 : 0;
    case "policy":
      return personOpened ? policy.policy.maxAsksAfterPerson : policy.policy.maxAsksAfterServerEvent;
  }
}
//@ chunk-ggn294th.js:2986-3614 placement
/**
 * 回复闸门要求模型重新回复时的提示文本
 */
function replyGateBounceText(policy, erroredTerminalTool) {
  switch (policy.kind) {
    case "remote_control":
      return erroredTerminalTool !== undefined
        ? `Your \`${erroredTerminalTool}\` call this turn returned an error, so nothing reached the project thread. Call \`${policy.toolNames.reply}\` again with what the thread should see, or \`${NO_REPLY_NEEDED_TOOL_NAME}\` if no reply is warranted.`
        : `Your last turn ended without a terminal \`mcp__${HEARTHBOT}__*\` tool call, so nothing reached the project thread: plain text is not delivered there. Call \`${policy.toolNames.reply}\` now with what the thread should see, \`${policy.toolNames.status}\` if you dispatched work that reports back later, or \`${NO_REPLY_NEEDED_TOOL_NAME}\` if no reply is warranted.`;
    case "policy":
      return policy.policy.askText;
  }
}
//@ chunk-ggn294th.js:3614-3678 placement
function isRealAssistantMessage(message) {
  return message.type === "assistant" && message.message.model !== SYNTHETIC_MODEL;
}
//@ chunk-ggn294th.js:3678-3793 placement
function getMetaUserText(message) {
  return message?.type === "user" && message.isMeta === true && typeof message.message.content === "string"
    ? message.message.content
    : undefined;
}
//@ chunk-ggn294th.js:3793-4021 placement
/**
 * 是否为人发起的 Projects 回合或 rc_owner 发送者
 */
function isPersonAuthoredTurn(message) {
  if (isProjectsUserTurn(message)) return true;
  if (message.type !== "user") return false;
  let content = message.message.content;
  let text =
    typeof content === "string" ? content : content[0]?.type === "text" ? content[0].text : undefined;
  if (text === undefined) return false;
  let externalEventWake = parseExternalEventWake(text);
  return (
    externalEventWake !== null &&
    isSessionInboxWake(externalEventWake) &&
    externalEventWake.data.sender_kind === RC_OWNER
  );
}
//@ chunk-ggn294th.js:4021-4178 placement
/**
 * 消息或排队命令是否标为 projectsUserTurn
 */
function isProjectsUserTurn(message) {
  return message.type === "attachment"
    ? message.attachment.type === "queued_command" && message.attachment.projectsUserTurn === true
    : message.type === "user" && message.projectsUserTurn === true;
}
//@ chunk-ggn294th.js:4178-4718 placement
/**
 * 找本回合返回错误的回复工具调用
 */
function findErroredReplyCall(messages, terminalTools) {
  let erroredToolUseIds = new Set();
  for (let message of messages) {
    if (message.type !== "user" || !Array.isArray(message.message.content)) continue;
    for (let block of message.message.content)
      if (block.type === "tool_result" && block.is_error === true) erroredToolUseIds.add(block.tool_use_id);
  }
  let noReplyOnly = false;
  let erroredTool;
  for (let message of messages) {
    if (message.type !== "assistant") continue;
    for (let block of message.message.content) {
      if (block.type !== "tool_use" || !terminalTools.includes(block.name)) continue;
      if (erroredToolUseIds.has(block.id)) {
        erroredTool = block.name;
        continue;
      }
      if (!block.name.endsWith(NO_REPLY_TOOL_SUFFIX))
        return {
          answered: true,
          noReplyOnly: false,
          erroredTerminalTool: undefined,
        };
      noReplyOnly = true;
    }
  }
  return {
    answered: noReplyOnly,
    noReplyOnly,
    erroredTerminalTool: noReplyOnly ? undefined : erroredTool,
  };
}
export {
  NO_REPLY_TOOL_SUFFIX,
  isProjectsReplyGateEnabled,
  isProjectsReplyMountConnected,
  isUnansweredProjectsRun,
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS,
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS,
  evaluateProjectsReplyGate,
  joinProjectsMountBeforeFirstCommand,
};
