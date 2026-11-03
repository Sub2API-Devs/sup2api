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
import { u, array, string, int, unknown } from "../../vendor/zod/v4/classic/schemas.js";
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
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = 5000;
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS = 1000;
var mapped = aliasCanonicalNames([
  "reply",
  "no_reply_needed",
  "post_message",
  "react",
  "update_message",
  "update_status",
]).map((e) => buildMcpToolName(HEARTHBOT, e));
var NO_REPLY_NEEDED_TOOL_NAME = buildMcpToolName(HEARTHBOT, "no_reply_needed");
var NO_REPLY_TOOL_SUFFIX = "__no_reply_needed";
var RC_OWNER = "rc_owner";
var MAX_ASKS_AFTER_PERSON = 4;
var projectsReplyGateParamsSchema = DoctorLazy(() =>
  u({
    terminal_tools: array(string().min(1).max(256)).min(1).max(64),
    ask_text: string().trim().min(1).max(4096),
    max_asks_after_person: int().min(0).max(MAX_ASKS_AFTER_PERSON),
    max_asks_after_server_event: int().min(0).max(MAX_ASKS_AFTER_PERSON),
    status_nudge: unknown().optional(),
    prompt_reminder: unknown().optional(),
  }),
);
//@ chunk-ggn294th.js:1163-1334 placement
/**
 * 回复闸门等待参数的 zod schema
 */
var waitInputSchema = DoctorLazy(() =>
  u({
    seconds: int().min(1).max(86400),
    visible_tools: array(string().min(1).max(128)).min(1).max(32),
    text: string().trim().min(1).max(2048),
  }),
);
var trimmedPromptSchema = DoctorLazy(() => string().trim().min(1).max(2048));
//@ chunk-ggn294th.js:1334-1419 placement
var TURN_ENDING_STOP_REASONS = new Set([
  "max_tokens",
  "model_context_window_exceeded",
  "pause_turn",
  "refusal",
]);
//@ chunk-ggn294th.js:1419-1532 placement
function isProjectsReplyMountConnected(e) {
  let found = e.mcp.clients.find((client) => client.name === HEARTHBOT);
  return found !== undefined && found.type === "connected" && isCliOwnedConfig(found.config);
}
//@ chunk-ggn294th.js:1532-1744 placement
async function joinProjectsMountBeforeFirstCommand(e, t, n) {
  if (!isProjectsReplyGateEnabled()) return;
  let startTime = performance.now();
  let d = await withDeadline(
    e.then(() => true),
    n,
  );
  logEvent("tengu_bridge_projects_mount_wait", {
    waited_ms: Math.round(performance.now() - startTime),
    settled: d === true,
    connected: isProjectsReplyMountConnected(t()),
  });
}
//@ chunk-ggn294th.js:1744-1918 placement
function isUnansweredProjectsRun(messages) {
  let decider = analyzeTurnTail(messages).decider;
  let n = decider === null ? undefined : messages[decider.index];
  if (decider === null || n === undefined) return false;
  return (
    (getMetaUserText(n)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true || isPersonAuthoredTurn(n)) &&
    !findErroredReplyCall(messages.slice(decider.index + 1), mapped).answered
  );
}
//@ chunk-ggn294th.js:1918-2820 placement
/**
 * Projects 线程回复闸门：本回合没回复项目线程时要求模型补回复或声明无需回复。
 */
function evaluateProjectsReplyGate(e, t, n) {
  let decider = analyzeTurnTail(e).decider;
  let d = 0;
  let r = decider;
  while (r !== null) {
    let m = e[r.index];
    if (getMetaUserText(m)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === true) d++;
    else if (n.kind !== "policy" || m === undefined || !isHarnessMetaMessage(m)) break;
    r = analyzeTurnTail(e.slice(0, r.index)).decider;
  }
  let i = r === null ? undefined : e[r.index];
  let l = i !== undefined && (r?.userDriven === true || isProjectsUserTurn(i));
  let f = maxAsksForReplyGate(n, i, l);
  if (d === 0 && f === 0)
    return {
      kind: "skip",
    };
  let c = [...e.slice(decider === null ? 0 : decider.index + 1), ...t];
  if (!c.some(isRealAssistantMessage))
    return {
      kind: "skip",
    };
  let { answered, noReplyOnly, erroredTerminalTool } =
    n.kind === "policy"
      ? findErroredReplyCall([...e.slice(r === null ? 0 : r.index + 1), ...t], n.policy.terminalTools)
      : findErroredReplyCall(c, mapped);
  if (answered)
    return {
      kind: "answered",
      noReplyOnly,
      personOpened: l,
    };
  if (
    n.kind === "policy" &&
    (getLastAssistantMessage(t)?.isApiErrorMessage === true ||
      TURN_ENDING_STOP_REASONS.has(c.findLast(isRealAssistantMessage)?.message.stop_reason ?? null))
  )
    return {
      kind: "skip",
    };
  let reason = erroredTerminalTool !== undefined ? "reply_errored" : "silent_turn";
  if (d >= f)
    return {
      kind: "still_silent",
      reason,
      personOpened: l,
    };
  return {
    kind: "bounce",
    reason,
    text: `${PROJECTS_REPLY_GATE_PREFIX} ${replyGateBounceText(n, erroredTerminalTool)}`,
    personOpened: l,
  };
}
//@ chunk-ggn294th.js:2820-2986 placement
/**
 * 回复闸门允许的追问次数
 */
function maxAsksForReplyGate(e, t, n) {
  switch (e.kind) {
    case "remote_control":
      return t !== undefined && isPersonAuthoredTurn(t) ? 1 : 0;
    case "policy":
      return n ? e.policy.maxAsksAfterPerson : e.policy.maxAsksAfterServerEvent;
  }
}
//@ chunk-ggn294th.js:2986-3614 placement
/**
 * 回复闸门要求模型重新回复时的提示文本
 */
function replyGateBounceText(e, erroredTerminalTool) {
  switch (e.kind) {
    case "remote_control":
      return erroredTerminalTool !== undefined
        ? `Your \`${erroredTerminalTool}\` call this turn returned an error, so nothing reached the project thread. Call \`${e.toolNames.reply}\` again with what the thread should see, or \`${NO_REPLY_NEEDED_TOOL_NAME}\` if no reply is warranted.`
        : `Your last turn ended without a terminal \`mcp__${HEARTHBOT}__*\` tool call, so nothing reached the project thread: plain text is not delivered there. Call \`${e.toolNames.reply}\` now with what the thread should see, \`${e.toolNames.status}\` if you dispatched work that reports back later, or \`${NO_REPLY_NEEDED_TOOL_NAME}\` if no reply is warranted.`;
    case "policy":
      return e.policy.askText;
  }
}
//@ chunk-ggn294th.js:3614-3678 placement
function isRealAssistantMessage(e) {
  return e.type === "assistant" && e.message.model !== SYNTHETIC_MODEL;
}
//@ chunk-ggn294th.js:3678-3793 placement
function getMetaUserText(e) {
  return e?.type === "user" && e.isMeta === true && typeof e.message.content === "string"
    ? e.message.content
    : undefined;
}
//@ chunk-ggn294th.js:3793-4021 placement
/**
 * 是否为人发起的 Projects 回合或 rc_owner 发送者
 */
function isPersonAuthoredTurn(e) {
  if (isProjectsUserTurn(e)) return true;
  if (e.type !== "user") return false;
  let content = e.message.content;
  let n = typeof content === "string" ? content : content[0]?.type === "text" ? content[0].text : undefined;
  if (n === undefined) return false;
  let externalEventWake = parseExternalEventWake(n);
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
function isProjectsUserTurn(e) {
  return e.type === "attachment"
    ? e.attachment.type === "queued_command" && e.attachment.projectsUserTurn === true
    : e.type === "user" && e.projectsUserTurn === true;
}
//@ chunk-ggn294th.js:4178-4718 placement
/**
 * 找本回合返回错误的回复工具调用
 */
function findErroredReplyCall(e, t) {
  let n = new Set();
  for (let r of e) {
    if (r.type !== "user" || !Array.isArray(r.message.content)) continue;
    for (let i of r.message.content)
      if (i.type === "tool_result" && i.is_error === true) n.add(i.tool_use_id);
  }
  let s = false;
  let d;
  for (let r of e) {
    if (r.type !== "assistant") continue;
    for (let i of r.message.content) {
      if (i.type !== "tool_use" || !t.includes(i.name)) continue;
      if (n.has(i.id)) {
        d = i.name;
        continue;
      }
      if (!i.name.endsWith(NO_REPLY_TOOL_SUFFIX))
        return {
          answered: true,
          noReplyOnly: false,
          erroredTerminalTool: undefined,
        };
      s = true;
    }
  }
  return {
    answered: s,
    noReplyOnly: s,
    erroredTerminalTool: s ? undefined : d,
  };
}
export {
  NO_REPLY_TOOL_SUFFIX,
  isProjectsReplyGateEnabled,
  isProjectsReplyMountConnected,
  isUnansweredProjectsRun,
};
