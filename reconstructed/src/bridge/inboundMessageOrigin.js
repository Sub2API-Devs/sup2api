/**
 * bridge/inboundMessageOrigin.ts
 *
 * 2.1.316 新增：入站消息（Remote Control/桥）的来源与内联粘贴解析：client_platform、inbound_origin、触发器类型、唤醒信封
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-mketzrwm.js (57)
 * attribution: placement 57
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { A, Ue, o, u, T } from "../../vendor/zod/v4/classic/schemas.js";
import {
  SLACK_BOT,
  HEARTH_HUMAN,
  HEARTH_AGENT,
  SLACK_HUMAN,
  TEAMS_HUMAN,
  OWNER_RELAY,
  AMB_HUMAN,
  DISCORD_HUMAN,
  SLACK_OWNER_PING,
  WEB_HUMAN,
  RELAY_SOURCE_KINDS,
} from "../services/projectsRelay/relayConfig.js";
import { isChatHostEntrypoint, isClaudeInTeams } from "../utils/entrypointKinds.js";
import { peerMessageInfo, regExp_2 } from "../utils/peerMessageHeaders.js";
import { logForDebugging } from "../utils/debug.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum } from "../services/analytics/safeMetadata.js";
import { logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { stripSystemReminders } from "../components/messageActions.js";
import { extractInboundAttachments } from "./inboundAttachments.js";
import { sanitizeAddressPart } from "../utils/swarm/teammateIds.js";
import { normalizeImageBlocks } from "./inboundMessages.js";
import { isAbnormalTerminalReason } from "../entrypoints/sdk/coreSchemas.js";

//@ chunk-mketzrwm.js:684-769 placement
var v = DoctorLazy(() => A(Ue([o(), A(Ue([u({ type: T("text"), text: o() }), u({ type: o() })]))]))),
  h = 1000;
//@ chunk-mketzrwm.js:769-1319 placement
function parseInboundContent(e) {
  if (e == null) return { texts: [] };
  if (Array.isArray(e)) {
    let s = e.length;
    for (let d = 0; d < e.length && s <= h; d++) {
      let l = e[d];
      if (Array.isArray(l)) s += l.length;
    }
    if (s > h) return { texts: [], problem: "too_many_items" };
  }
  let safeParse = v().safeParse(e);
  if (!safeParse.success) return { texts: [], problem: "malformed" };
  let r = !1,
    filtered = safeParse.data
      .map((s) => {
        if (typeof s === "string") return s;
        let d = [];
        for (let l of s)
          if (l.type === "text" && "text" in l && typeof l.text === "string") d.push(l.text);
          else r = !0;
        return d.join(`
`);
      })
      .filter((s) => s.trim() !== "");
  return r ? { texts: filtered, problem: "non_text_ignored" } : { texts: filtered };
}
//@ chunk-mketzrwm.js:1319-1329 placement
var H = 100;
//@ chunk-mketzrwm.js:1329-1679 placement
function parseInlinePastes(e) {
  if (e == null) return { texts: [] };
  if (!Array.isArray(e)) return { texts: [], problem: "malformed_inline_pastes" };
  let n = [];
  for (let r = 0; r < e.length; r++) {
    let i = e[r];
    if (typeof i !== "string") return { texts: [], problem: "malformed_inline_pastes" };
    if (i.trim() === "") continue;
    if (n.length === H) return { texts: n, problem: "inline_pastes_cut" };
    n.push(i);
  }
  return { texts: n };
}
//@ chunk-mketzrwm.js:1679-1742 placement
var P = new Set(["ios", "android", "web_claude_ai", "desktop_app"]);
//@ chunk-mketzrwm.js:1742-1776 placement
function R(e) {
  return P.has(e) || !1;
}
//@ chunk-mketzrwm.js:1776-1820 placement
function Die(e) {
  return e !== void 0 && P.has(e);
}
//@ chunk-mketzrwm.js:1820-1891 placement
function Ksr(e) {
  return e === "claude_code_cli" || e === "claude_code_vscode";
}
//@ chunk-mketzrwm.js:1891-1957 placement
function S9o(e, n) {
  if (n) return;
  return Ksr(e) ? { kind: "human" } : void 0;
}
/**
 * 定时/强制运行/GitHub webhook/例程/PR steward 等触发器来源。
 */
//@ chunk-mketzrwm.js:1957-2095 placement
var SCHEDULED_TRIGGER_ORIGINS = new Set([
    "scheduled_trigger",
    "force_run_trigger",
    "github_webhook_trigger",
    "fire_routine",
    "pr_steward",
  ]),
  TRIGGER_FIRE_ORIGINS = new Set(["trigger_fire"]);
//@ chunk-mketzrwm.js:2095-2139 placement
function Zwn(e) {
  return e !== void 0 && TRIGGER_FIRE_ORIGINS.has(e);
}
//@ chunk-mketzrwm.js:2139-2228 placement
var SESSION_INBOX = "session_inbox",
  b = new Set(["github_webhook", "pr_steward", "signal_subscription"]);
//@ chunk-mketzrwm.js:2228-2283 placement
function ydi(e) {
  return e !== void 0 && (b.has(e) || e === SESSION_INBOX);
}
//@ chunk-mketzrwm.js:2283-2306 placement
var PROJECTS_RELAY = "projects-relay";
//@ chunk-mketzrwm.js:2306-2401 placement
function w9o({
  relayMessageIds: relayMessageIds,
  isSynthetic: isSynthetic,
  coordinatorNote: coordinatorNote,
}) {
  return relayMessageIds !== void 0 || isSynthetic !== !0 || coordinatorNote;
}
//@ chunk-mketzrwm.js:2401-2427 placement
var TRIGGERFIREREASON = "triggerFireReason";
/**
 * 定时触发的 task-notification 来源补上 fireReason。
 */
//@ chunk-mketzrwm.js:2427-2573 placement
function withScheduledTriggerFireReason(e, n) {
  if (e?.kind !== "task-notification" || e.subkind !== "scheduled-trigger") return e;
  let r = Zqt(n);
  return r === void 0 ? e : { ...e, fireReason: r };
}
/**
 * 按触发器类型生成 task-notification 来源（scheduled-trigger / session-inbox / 普通）。
 */
//@ chunk-mketzrwm.js:2573-2759 placement
function taskNotificationOrigin(e) {
  if (Zwn(e)) return { kind: "task-notification", subkind: "scheduled-trigger" };
  if (e === SESSION_INBOX) return { kind: "task-notification", subkind: "session-inbox" };
  return { kind: "task-notification" };
}
//@ chunk-mketzrwm.js:2759-2831 placement
var W = new Set(["scheduled_trigger", "force_run_trigger", "fire_routine"]);
//@ chunk-mketzrwm.js:2831-2861 placement
function Zqt(e) {
  return I(e, TRIGGERFIREREASON);
}
/**
 * 入站消息优先级：不是 now 时，来自触发器或特定平台的消息降为 later。
 */
//@ chunk-mketzrwm.js:2861-2998 placement
function adjustInboundPriority(e, n, r, i) {
  if (e === "now") return e;
  let s = r !== void 0 && V.has(r) && (r !== "trigger_fire" || i !== void 0);
  return (n && W.has(n)) || s ? "later" : e;
}
/**
 * Slack 相关 client_platform 常量组（含 Teams、邮件）。
 */
//@ chunk-mketzrwm.js:2998-3159 placement
var SLACK_PLATFORMS = new Set(["claude-in-slack", "claude_in_slack"]),
  SLACK_BOT_PLATFORMS = new Set([SLACK_BOT]),
  CLAUDE_IN_TEAMS = "claude-in-teams",
  EMAIL_HUMAN = "email_human",
  EMAIL_TURN_TEXT = "email_turn_text",
  EMAIL_SENDER_MODES = ["sender_only", "sender_reply"];
//@ chunk-mketzrwm.js:3159-3247 placement
function tEn(e) {
  if (e.inbound_origin !== EMAIL_HUMAN) return;
  let n = I(e, EMAIL_TURN_TEXT);
  return EMAIL_SENDER_MODES.find((r) => r === n);
}
//@ chunk-mketzrwm.js:3247-3278 placement
function Vsr(e) {
  return e === HEARTH_HUMAN;
}
//@ chunk-mketzrwm.js:3278-3318 placement
function nEn(e) {
  return e === HEARTH_HUMAN || e === HEARTH_AGENT;
}
//@ chunk-mketzrwm.js:3318-3403 placement
function Q(e) {
  if (e === HEARTH_HUMAN || e === HEARTH_AGENT) return !0;
  return e !== void 0 && e.startsWith("hearth");
}
//@ chunk-mketzrwm.js:3403-3474 placement
var V = new Set(["trigger_fire", "plugin_fire"]),
  RECEIVER_GROUPING_ID = "receiver_grouping_id";
//@ chunk-mketzrwm.js:3474-3504 placement
function E9o(e) {
  return I(e, RECEIVER_GROUPING_ID);
}
//@ chunk-mketzrwm.js:3504-3567 placement
function I(e, n) {
  let r = e[n];
  return typeof r === "string" ? r : void 0;
}
//@ chunk-mketzrwm.js:3567-3596 placement
var ACTIVITY_OBSERVATION = "activity_observation";
//@ chunk-mketzrwm.js:3596-3626 placement
function v9o(e) {
  return I(e, ACTIVITY_OBSERVATION);
}
//@ chunk-mketzrwm.js:3626-3651 placement
function U() {
  return isChatHostEntrypoint();
}
//@ chunk-mketzrwm.js:3651-3677 placement
function J() {
  return isClaudeInTeams();
}
//@ chunk-mketzrwm.js:3677-3735 placement
function Z(e, n) {
  return e !== void 0 && SLACK_PLATFORMS.has(e) && n === SLACK_HUMAN && U();
}
//@ chunk-mketzrwm.js:3735-3779 placement
function ee(e, n) {
  return e === CLAUDE_IN_TEAMS && n === TEAMS_HUMAN && J();
}
//@ chunk-mketzrwm.js:3779-3820 placement
function awe(e, n) {
  return Z(e, n) || ee(e, n);
}
//@ chunk-mketzrwm.js:3820-3882 placement
function C(e, n) {
  return (n === void 0 && e !== void 0 && R(e)) || awe(e, n);
}
//@ chunk-mketzrwm.js:3882-3935 placement
function qsr(e, n, r) {
  return e ? e.kind === "human" : C(n, r);
}
//@ chunk-mketzrwm.js:3935-4034 placement
function bdi(e, n, r, i) {
  if (e) return e.kind === "human";
  if (!n) return !0;
  return C(r, i) || S9o(r, i) !== void 0;
}
/**
 * 判断入站消息是否来自人类客户端：解析入站元数据，排除队友消息，再按 inbound_origin 或 client_platform 判定。
 */
//@ chunk-mketzrwm.js:4034-4262 placement
function isHumanInboundMessage(e, n, r = !1) {
  let i;
  try {
    i = extractInboundMetadata(e);
  } catch {
    return !1;
  }
  if (!i || getTeammateMessageSender(i.content)) return !1;
  let { clientPlatform: clientPlatform, inboundOrigin: inboundOrigin } = i;
  if (inboundOrigin !== void 0)
    return n === "bridge" ? awe(clientPlatform, inboundOrigin) : ost(inboundOrigin, r);
  return C(clientPlatform, void 0) || (n === "remote-worker" && Ksr(clientPlatform));
}
//@ chunk-mketzrwm.js:4262-4345 placement
function ost(e, n = !1, r = !1) {
  return (
    e === SLACK_HUMAN ||
    e === TEAMS_HUMAN ||
    e === OWNER_RELAY ||
    (n && e === HEARTH_HUMAN) ||
    (r && e === EMAIL_HUMAN)
  );
}
//@ chunk-mketzrwm.js:4345-4379 placement
var ne = new Set([AMB_HUMAN, DISCORD_HUMAN, SLACK_OWNER_PING, WEB_HUMAN]);
//@ chunk-mketzrwm.js:4379-4426 placement
function Sdi(e) {
  return ost(e, !0, !0) || ne.has(e);
}
//@ chunk-mketzrwm.js:4426-4679 placement
function isPeerOrigin({
  isRelayHuman: isRelayHuman,
  isSynthetic: isSynthetic,
  ccrTurnId: ccrTurnId,
  isProjectsUser: isProjectsUser = !1,
  emailSenderTurn: emailSenderTurn,
}) {
  if (!isRelayHuman) return {};
  return {
    ...(!isSynthetic && { verifiedSlackHumanTurn: !0 }),
    ...(!isSynthetic && isProjectsUser && { projectsUserTurn: !0 }),
    ...(!isSynthetic && emailSenderTurn !== void 0 && { emailSenderTurn: emailSenderTurn }),
    ...(ccrTurnId !== void 0 && { ccrTurnId: ccrTurnId }),
  };
}
/**
 * 判断入站消息来源（人、对等会话、任务通知、触发器）。
 */
//@ chunk-mketzrwm.js:4679-5498 placement
function classifyInboundOrigin(e, n, r, i, s, d, l) {
  let m = getTeammateMessageSender(e);
  if (m)
    return {
      kind: "peer",
      from: m,
      inbound_origin: r,
      ...(l !== void 0 && { plugin: l }),
      ...peerMessageInfo(e),
    };
  if (r === SESSION_INBOX) return taskNotificationOrigin(r);
  if (r && b.has(r)) return taskNotificationOrigin(r);
  let _ = Q(r);
  if (!_ && r === void 0 && n && R(n)) return { kind: "human" };
  if (!_ && awe(n, r)) return { kind: "human" };
  if (!_ && n && SCHEDULED_TRIGGER_ORIGINS.has(n)) return taskNotificationOrigin(r);
  if (r === RELAY_SOURCE_KINDS && i) return { kind: "task-notification", subkind: "peer-send-message" };
  logForDebugging(
    `[bridge] demoting unwrapped inbound message to peer origin: client_platform=${n || "(absent)"}`,
    { level: "warn" },
  );
  let y = !n
    ? "absent"
    : n.startsWith("claude_code")
      ? "claude_code"
      : SLACK_PLATFORMS.has(n)
        ? r === SLACK_BOT && U()
          ? "slack_bot_observation"
          : "slack_relay"
        : n === CLAUDE_IN_TEAMS
          ? "teams_relay"
          : "other";
  return (
    logEvent("tengu_bridge_ingress_demoted", { platform_class: fromEnum(y) }),
    {
      kind: "peer",
      from: "unknown",
      inbound_origin: r,
      ...peerMessageInfo(e),
      ...(d !== void 0 && r !== void 0 && SLACK_BOT_PLATFORMS.has(r) && { activityObservation: d }),
    }
  );
}
/**
 * 补全/改写入站来源：peer 和 slack-ping 之外的保持；触发器转 task-notification，人类平台转 human。
 */
//@ chunk-mketzrwm.js:5498-5638 placement
function refineInboundOrigin(e, n, r) {
  if (e && e.kind !== "peer" && e.kind !== "slack-ping") return e;
  if (n && SCHEDULED_TRIGGER_ORIGINS.has(n)) return taskNotificationOrigin(r);
  if (n && R(n)) return { kind: "human" };
  return;
}
//@ chunk-mketzrwm.js:5638-6182 placement
function describeProjectsHumanOrigin(e, n, r, i, s, d = !1, l = !1, m, _ = !1) {
  let y = getTeammateMessageSender(e);
  if (y)
    return {
      kind: "peer",
      from: y,
      inbound_origin: r,
      ...peerMessageInfo(e),
      ...(m !== void 0 && { plugin: m }),
    };
  if (r && !SLACK_BOT_PLATFORMS.has(r)) {
    if (r === HEARTH_HUMAN)
      if (d) logFeatureOk("bridge_projects_human_origin");
      else logFeatureSad("bridge_projects_human_origin", "disabled_by_flag");
    if (ost(r, d, _)) return { kind: "human" };
    if (r === HEARTH_AGENT && l) return { kind: "task-notification", subkind: PROJECTS_RELAY };
    if (r === RELAY_SOURCE_KINDS && i) return { kind: "task-notification", subkind: "peer-send-message" };
    return taskNotificationOrigin(r);
  }
  if (Ksr(n)) return { kind: "human" };
  if (n?.startsWith("claude_code")) return;
  return classifyInboundOrigin(e, n, r, i, void 0, s, m);
}
//@ chunk-mketzrwm.js:6182-6255 placement
function ist(e) {
  return e.verifiedSlackHumanTurn === !0 && e.priority !== "now";
}
//@ chunk-mketzrwm.js:6255-6314 placement
function wdi(e, n) {
  if (e === "now") return e;
  return n ? "later" : e;
}
/**
 * 对 text 块逐个清洗，只有变化时才复制数组
 */
//@ chunk-mketzrwm.js:6704-6876 placement
function sanitizeTextBlocks(e) {
  let n;
  for (let r = 0; r < e.length; r++) {
    let i = e[r];
    if (i.type !== "text") continue;
    let s = stripSystemReminders(i.text);
    if (s === i.text) continue;
    ((n ??= [...e]), (n[r] = { ...i, text: s }));
  }
  return n ?? e;
}
/**
 * 提取入站消息的 pasted_content、client_platform、inbound_origin、wake_envelope 等。
 */
//@ chunk-mketzrwm.js:6876-7619 placement
function extractInboundMetadata(e) {
  if (e.type !== "user") return;
  let n = "pasted_content" in e ? e.pasted_content : void 0,
    r = "inline_pastes" in e ? e.inline_pastes : void 0,
    i = extractInboundAttachments(e).length > 0 || parseInboundContent(n).texts.length > 0,
    s = e.message?.content;
  if (!s && !i) return;
  if (Array.isArray(s) && s.length === 0 && !i) return;
  let d = "uuid" in e && typeof e.uuid === "string" ? e.uuid : void 0,
    l = I(e, "client_platform"),
    m = I(e, "inbound_origin"),
    _ = "wake_envelope" in e ? e.wake_envelope : void 0,
    y = E9o(e),
    E = v9o(e),
    D = sanitizeAddressPart("from_plugin" in e ? e.from_plugin : void 0),
    G,
    S = Array.isArray(s) ? A9o(sanitizeTextBlocks(normalizeImageBlocks(s))) : stripSystemReminders(s ?? "");
  if (Array.isArray(S) && S.length === 0 && !i) return;
  return {
    content: S,
    uuid: d,
    clientPlatform: l,
    inboundOrigin: m,
    wakeEnvelope: _,
    receiverGroupingId: y,
    slackOrigin: G,
    activityObservation: E,
    pastedContent: n,
    inlinePastes: r,
    fromPlugin: D,
  };
}
/**
 * 从文本开头的 <teammate-message from="…"> 取发送者。
 */
//@ chunk-mketzrwm.js:7619-7690 placement
function getTeammateMessageSender(text) {
  if (typeof text !== "string") return;
  return text.match(regExp_2)?.[1];
}
/**
 * 内容（字符串或文本块）中是否带 teammate 消息信封。
 */
//@ chunk-mketzrwm.js:7690-7925 placement = extractErrorTypeFromData (1)
function hasTeammateMessageEnvelope(content) {
  if (typeof content === "string") return getTeammateMessageSender(content) !== void 0;
  if (!Array.isArray(content)) return !1;
  return content.some(
    (n) =>
      typeof n === "object" &&
      n !== null &&
      "type" in n &&
      n.type === "text" &&
      "text" in n &&
      typeof n.text === "string" &&
      getTeammateMessageSender(n.text) !== void 0,
  );
}
//@ chunk-mketzrwm.js:7925-7992 placement
function A9o(e) {
  if (!e.some(x)) return e;
  return e.filter((n) => !x(n));
}
//@ chunk-mketzrwm.js:7992-8086 placement
function x(e) {
  if (e.type !== "text") return !1;
  return typeof e.text !== "string" || e.text.trim() === "";
}
//@ chunk-mketzrwm.js:8419-8513 placement
function rPe(e, n) {
  let onCommandLifecycle = e.onCommandLifecycle;
  e.onCommandLifecycle = (...i) => {
    (onCommandLifecycle?.(...i), n(...i));
  };
}
//@ chunk-mketzrwm.js:8513-8572 placement
function zsr(e, n) {
  return n || isAbnormalTerminalReason(e) ? "cancelled" : "completed";
}

export {
  ist,
  extractInboundMetadata,
  nEn,
  classifyInboundOrigin,
  refineInboundOrigin,
  qsr,
  hasTeammateMessageEnvelope,
  adjustInboundPriority,
  awe,
  Die,
  ost,
  wdi,
  Zqt,
  isPeerOrigin,
  Vsr,
  tEn,
  A9o,
  isHumanInboundMessage,
  Sdi,
  Zwn,
  SESSION_INBOX,
  rPe,
  zsr,
  parseInboundContent,
  parseInlinePastes,
  sanitizeTextBlocks,
  ydi,
  describeProjectsHumanOrigin,
  E9o,
  v9o,
  w9o,
  withScheduledTriggerFireReason,
  getTeammateMessageSender,
  bdi,
  S9o,
  Ksr,
  EMAIL_HUMAN,
};
