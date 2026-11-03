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
import { xle, HEARTHBOT } from "../services/mcp/ccrMetaMcp.js";
import { buildMcpToolName } from "../services/mcp/mcpStringUtils.js";
import { DoctorLazy } from "../cli/handlers/util.js";
import { u, A, o, tc, oe } from "../../vendor/zod/v4/classic/schemas.js";
import { Zl } from "../services/mcp/cliOwnedClients.js";
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
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_RC_THREAD_REPLY_GATE, !0);
}
//@ chunk-ggn294th.js:710-1163 placement
var PROJECTS_MOUNT_FIRST_COMMAND_WAIT_MS = 5000,
  PROJECTS_MOUNT_FIRST_COMMAND_WAIT_FLOOR_MS = 1000,
  mapped = xle(["reply", "no_reply_needed", "post_message", "react", "update_message", "update_status"]).map(
    (e) => buildMcpToolName(HEARTHBOT, e),
  ),
  x = buildMcpToolName(HEARTHBOT, "no_reply_needed"),
  NO_REPLY_TOOL_SUFFIX = "__no_reply_needed",
  RC_OWNER = "rc_owner",
  k = 4,
  K = DoctorLazy(() =>
    u({
      terminal_tools: A(o().min(1).max(256)).min(1).max(64),
      ask_text: o().trim().min(1).max(4096),
      max_asks_after_person: tc().min(0).max(k),
      max_asks_after_server_event: tc().min(0).max(k),
      status_nudge: oe().optional(),
      prompt_reminder: oe().optional(),
    }),
  );
/**
 * 回复闸门等待参数的 zod schema
 */
//@ chunk-ggn294th.js:1163-1334 placement
var waitInputSchema = DoctorLazy(() =>
    u({
      seconds: tc().min(1).max(86400),
      visible_tools: A(o().min(1).max(128)).min(1).max(32),
      text: o().trim().min(1).max(2048),
    }),
  ),
  Z = DoctorLazy(() => o().trim().min(1).max(2048));
//@ chunk-ggn294th.js:1334-1419 placement
var P = new Set(["max_tokens", "model_context_window_exceeded", "pause_turn", "refusal"]);
//@ chunk-ggn294th.js:1419-1532 placement
function isProjectsReplyMountConnected(e) {
  let found = e.mcp.clients.find((client) => client.name === HEARTHBOT);
  return found !== void 0 && found.type === "connected" && Zl(found.config);
}
//@ chunk-ggn294th.js:1532-1744 placement
async function joinProjectsMountBeforeFirstCommand(e, t, n) {
  if (!isProjectsReplyGateEnabled()) return;
  let startTime = performance.now(),
    d = await withDeadline(
      e.then(() => !0),
      n,
    );
  logEvent("tengu_bridge_projects_mount_wait", {
    waited_ms: Math.round(performance.now() - startTime),
    settled: d === !0,
    connected: isProjectsReplyMountConnected(t()),
  });
}
//@ chunk-ggn294th.js:1744-1918 placement
function isUnansweredProjectsRun(e) {
  let decider = analyzeTurnTail(e).decider,
    n = decider === null ? void 0 : e[decider.index];
  if (decider === null || n === void 0) return !1;
  return (
    (getMetaUserText(n)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === !0 || isPersonAuthoredTurn(n)) &&
    !findErroredReplyCall(e.slice(decider.index + 1), mapped).answered
  );
}
/**
 * Projects 线程回复闸门：本回合没回复项目线程时要求模型补回复或声明无需回复。
 */
//@ chunk-ggn294th.js:1918-2820 placement
function evaluateProjectsReplyGate(e, t, n) {
  let decider = analyzeTurnTail(e).decider,
    d = 0,
    r = decider;
  while (r !== null) {
    let m = e[r.index];
    if (getMetaUserText(m)?.startsWith(PROJECTS_REPLY_GATE_PREFIX) === !0) d++;
    else if (n.kind !== "policy" || m === void 0 || !isHarnessMetaMessage(m)) break;
    r = analyzeTurnTail(e.slice(0, r.index)).decider;
  }
  let i = r === null ? void 0 : e[r.index],
    l = i !== void 0 && (r?.userDriven === !0 || isProjectsUserTurn(i)),
    f = maxAsksForReplyGate(n, i, l);
  if (d === 0 && f === 0) return { kind: "skip" };
  let c = [...e.slice(decider === null ? 0 : decider.index + 1), ...t];
  if (!c.some(T)) return { kind: "skip" };
  let {
    answered: answered,
    noReplyOnly: noReplyOnly,
    erroredTerminalTool: erroredTerminalTool,
  } = n.kind === "policy"
    ? findErroredReplyCall([...e.slice(r === null ? 0 : r.index + 1), ...t], n.policy.terminalTools)
    : findErroredReplyCall(c, mapped);
  if (answered) return { kind: "answered", noReplyOnly: noReplyOnly, personOpened: l };
  if (
    n.kind === "policy" &&
    (getLastAssistantMessage(t)?.isApiErrorMessage === !0 ||
      P.has(c.findLast(T)?.message.stop_reason ?? null))
  )
    return { kind: "skip" };
  let g = erroredTerminalTool !== void 0 ? "reply_errored" : "silent_turn";
  if (d >= f) return { kind: "still_silent", reason: g, personOpened: l };
  return {
    kind: "bounce",
    reason: g,
    text: `${PROJECTS_REPLY_GATE_PREFIX} ${replyGateBounceText(n, erroredTerminalTool)}`,
    personOpened: l,
  };
}
/**
 * 回复闸门允许的追问次数
 */
//@ chunk-ggn294th.js:2820-2986 placement
function maxAsksForReplyGate(e, t, n) {
  switch (e.kind) {
    case "remote_control":
      return t !== void 0 && isPersonAuthoredTurn(t) ? 1 : 0;
    case "policy":
      return n ? e.policy.maxAsksAfterPerson : e.policy.maxAsksAfterServerEvent;
  }
}
/**
 * 回复闸门要求模型重新回复时的提示文本
 */
//@ chunk-ggn294th.js:2986-3614 placement
function replyGateBounceText(e, t) {
  switch (e.kind) {
    case "remote_control":
      return t !== void 0
        ? `Your \`${t}\` call this turn returned an error, so nothing reached the project thread. Call \`${e.toolNames.reply}\` again with what the thread should see, or \`${x}\` if no reply is warranted.`
        : `Your last turn ended without a terminal \`mcp__${HEARTHBOT}__*\` tool call, so nothing reached the project thread: plain text is not delivered there. Call \`${e.toolNames.reply}\` now with what the thread should see, \`${e.toolNames.status}\` if you dispatched work that reports back later, or \`${x}\` if no reply is warranted.`;
    case "policy":
      return e.policy.askText;
  }
}
//@ chunk-ggn294th.js:3614-3678 placement
function T(e) {
  return e.type === "assistant" && e.message.model !== SYNTHETIC_MODEL;
}
//@ chunk-ggn294th.js:3678-3793 placement
function getMetaUserText(e) {
  return e?.type === "user" && e.isMeta === !0 && typeof e.message.content === "string"
    ? e.message.content
    : void 0;
}
/**
 * 是否为人发起的 Projects 回合或 rc_owner 发送者
 */
//@ chunk-ggn294th.js:3793-4021 placement
function isPersonAuthoredTurn(e) {
  if (isProjectsUserTurn(e)) return !0;
  if (e.type !== "user") return !1;
  let content = e.message.content,
    n = typeof content === "string" ? content : content[0]?.type === "text" ? content[0].text : void 0;
  if (n === void 0) return !1;
  let s = parseExternalEventWake(n);
  return s !== null && isSessionInboxWake(s) && s.data.sender_kind === RC_OWNER;
}
/**
 * 消息或排队命令是否标为 projectsUserTurn
 */
//@ chunk-ggn294th.js:4021-4178 placement
function isProjectsUserTurn(e) {
  return e.type === "attachment"
    ? e.attachment.type === "queued_command" && e.attachment.projectsUserTurn === !0
    : e.type === "user" && e.projectsUserTurn === !0;
}
/**
 * 找本回合返回错误的回复工具调用
 */
//@ chunk-ggn294th.js:4178-4718 placement
function findErroredReplyCall(e, t) {
  let n = new Set();
  for (let r of e) {
    if (r.type !== "user" || !Array.isArray(r.message.content)) continue;
    for (let i of r.message.content) if (i.type === "tool_result" && i.is_error === !0) n.add(i.tool_use_id);
  }
  let s = !1,
    d;
  for (let r of e) {
    if (r.type !== "assistant") continue;
    for (let i of r.message.content) {
      if (i.type !== "tool_use" || !t.includes(i.name)) continue;
      if (n.has(i.id)) {
        d = i.name;
        continue;
      }
      if (!i.name.endsWith(NO_REPLY_TOOL_SUFFIX))
        return { answered: !0, noReplyOnly: !1, erroredTerminalTool: void 0 };
      s = !0;
    }
  }
  return { answered: s, noReplyOnly: s, erroredTerminalTool: s ? void 0 : d };
}

export {
  NO_REPLY_TOOL_SUFFIX,
  isProjectsReplyGateEnabled,
  isProjectsReplyMountConnected,
  isUnansweredProjectsRun,
};
