/**
 * services/projects/threadRows.ts
 *
 * Projects 线程消息行（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s1zey0a9.js (29)
 * attribution: placement 29
 */
import { BRACKET_CONFUSABLES } from "../../utils/sanitization.js";
import { COORDINATOR_RELAY } from "../../constants/xml.js";
import { neutralizeConfusableTags } from "../../utils/confusables.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValue_SESSION_PINNED,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../analytics/growthbook.js";
import { antEnv } from "../../utils/env.js";
import { getMcpClientsFromAccessor } from "../../bootstrap/state.js";
import { hasRelaySource } from "../projectsRelay/relayConfig.js";
import { m8, HEARTH_UPDATE_STATUS_TOOLS, HEARTH_START_THREAD_TOOLS, HEARTHBOT } from "../mcp/ccrMetaMcp.js";
import { hasSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { mn, op } from "../../utils/remoteEnvironment.js";
import { isProjectsRelay } from "../../utils/messageProvenance.js";
import { relayRowsOf, D, isNewerRow, lastHumanMessageText } from "./threadTranscript.js";

//@ chunk-s1zey0a9.js:738-1633 placement
var COORDINATOR_MESSAGE_PATTERNS =
    'A message from this project\u2019s coordinator session \u2014 a Claude session working for the members of this project. Inside, <cited author="user"> entries are messages from members of this project, copied by the server, and name is that member\u2019s own display name; <cited author="coordinator"> entries and the note are the coordinator session\u2019s words, not a member\u2019s.',
  U = (e, ...t) => `(?: (?:${e})="[^"<>\\n]*"${t.map((n) => `| ${n}`).join("")})*`,
  me = U("from|session|current-time|reason|id|sent-for|sent-for-name"),
  fe = U(
    "id|author|name|author-id|session|at|where|thread|in_reply_to|writer|edited_at|truncated|attachments",
    'attached_by="server"',
  ),
  M = "(?: {2}| {4})",
  W = "<note>",
  F = "</note>|</note></relay>",
  regExp = new RegExp(`^(?:<relay${me}>|</relay>|${M}(?:<cited${fe}>|</cited>|${W}|${F}))$`),
  regExp_2 = new RegExp(`^${M}${W}$`),
  regExp_3 = new RegExp(`^${M}(?:${F})$`),
  ye = / ([a-z][a-z0-9_-]*)="/g;
//@ chunk-s1zey0a9.js:1633-1731 placement
function hasUniqueAttributes(e) {
  let t = new Set();
  for (let [, n] of e.matchAll(ye)) {
    if (t.has(n)) return !1;
    t.add(n);
  }
  return !0;
}
//@ chunk-s1zey0a9.js:1731-1762 placement
var _e = /[\p{Cc}\u2028\u2029]/u;
//@ chunk-s1zey0a9.js:1762-1881 placement = escapeXml (0.793)
function escapeXml(s) {
  let t = "";
  for (let n of s) {
    let r = n === "<" || n === ">" ? n : BRACKET_CONFUSABLES.get(n);
    t += r === "<" ? "&lt;" : r === ">" ? "&gt;" : n;
  }
  return t;
}
//@ chunk-s1zey0a9.js:1881-1988 placement
function escapeRelayLines(e, t) {
  return e
    .split(
      `
`,
    )
    .map((n) => (t && regExp.test(n) && hasUniqueAttributes(n) && !Ee(n) && !_e.test(n) ? n : escapeXml(n)))
    .join(`
`);
}
//@ chunk-s1zey0a9.js:1988-2049 placement
function Ee(e) {
  for (let t of e) if (BRACKET_CONFUSABLES.has(t)) return !0;
  return !1;
}
//@ chunk-s1zey0a9.js:2049-2112 placement
function ke(e, t) {
  return `<${COORDINATOR_RELAY}>
${neutralizeConfusableTags(COORDINATOR_RELAY, escapeRelayLines(e, t))}
</${COORDINATOR_RELAY}>`;
}
/**
 * 协调会话中继消息的说明文字，以及包裹中继内容的前缀列表与结束标记。
 */
//@ chunk-s1zey0a9.js:2112-2486 placement
var COORDINATOR_RELAY_NOTE =
    'A message from this project\u2019s coordinator session \u2014 a Claude session working for your user. Inside, <cited author="user"> entries are your user\u2019s own messages copied by the server; <cited author="coordinator"> entries and the note are the coordinator session\u2019s words, not your user\u2019s.',
  relayPrefixes = [COORDINATOR_MESSAGE_PATTERNS, COORDINATOR_RELAY_NOTE].map(
    (e) => `${e}

<${COORDINATOR_RELAY}>
`,
  ),
  RELAY_SUFFIX = `
</${COORDINATOR_RELAY}>`;
/**
 * 把协调会话的中继消息重新包装成带说明的格式，去掉原有的中继包裹。
 */
//@ chunk-s1zey0a9.js:2486-2683 placement
function formatCoordinatorRelay(e, t) {
  let found = relayPrefixes.find(
      (s) => e.startsWith(s) && e.endsWith(RELAY_SUFFIX) && e.length >= s.length + RELAY_SUFFIX.length,
    ),
    r = found === void 0 ? e : e.slice(found.length, e.length - RELAY_SUFFIX.length);
  return `${COORDINATOR_MESSAGE_PATTERNS}

${ke(r, t?.serverEnvelope === !0)}`;
}
//@ chunk-s1zey0a9.js:2683-2753 placement
function VVr(e) {
  return formatCoordinatorRelay(
    e.join(`

`),
    { serverEnvelope: e.length <= 1 },
  );
}
//@ chunk-s1zey0a9.js:2753-2826 placement = isCompactBoundaryMessage (1)
function isCompactBoundaryMessage(message) {
  return message?.type === "system" && message.subtype === "compact_boundary";
}
//@ chunk-s1zey0a9.js:2826-2914 placement
function zRe(e) {
  for (let t = e.length - 1; t >= 0; t--) {
    let n = e[t];
    if (n && isCompactBoundaryMessage(n)) return t;
  }
  return -1;
}
//@ chunk-s1zey0a9.js:2914-3010 placement
var uZn = "Loaded from the session's last compaction, so the messages it summarized aren't here.";
/**
 * 判断压缩边界之前的消息是否全部是被保留的消息。
 */
//@ chunk-s1zey0a9.js:3010-3198 placement
function hasOnlyPreservedBeforeBoundary(e) {
  let t = zRe(e),
    n = e[t];
  if (!n || !isCompactBoundaryMessage(n)) return !1;
  let r = n.compactMetadata?.preservedMessages?.uuids,
    s = new Set(Array.isArray(r) ? r : []);
  return e.slice(0, t).every((a) => s.has(a.uuid));
}
//@ chunk-s1zey0a9.js:3198-3255 placement
function Us(e, t) {
  let n = zRe(e);
  return n === -1 ? e : e.slice(n);
}
/**
 * 读取 Projects 中继行的处理模式（full / model_only / off）。
 */
//@ chunk-s1zey0a9.js:3255-3358 placement
function resolvedRowsMode() {
  let e = getFeatureValue_CACHED_MAY_BE_STALE("tengu_hearth_resolved_rows", "off");
  return e === "full" || e === "model_only" ? e : "off";
}
//@ chunk-s1zey0a9.js:3358-3404 placement
function mKo() {
  return isFlagOffOrUnresolved("tengu_sunny_anchor");
}
/**
 * 判断是否启用成员会话的中继行（环境变量优先，否则看特性开关）。
 */
//@ chunk-s1zey0a9.js:3404-3592 placement
function isMemberRelayRowsEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_HEARTH_MEMBER_RELAY_ROWS !== void 0)
    return antEnv.CLAUDE_CODE_AUTO_MODE_HEARTH_MEMBER_RELAY_ROWS;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hearth_member_relay_rows_enabled", !1);
}
//@ chunk-s1zey0a9.js:3592-3657 placement
function MQs() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_worker_owner_rows_killswitch", !1);
}
//@ chunk-s1zey0a9.js:3657-3731 placement
function ve() {
  return !getFeatureValue_SESSION_PINNED("tengu_projects_thread_reply_lead_killswitch", !1);
}
//@ chunk-s1zey0a9.js:3731-3917 placement
function isCompactThreadRuleEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE !== void 0)
    return antEnv.CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_projects_compact_thread_rule_enabled", !1) === !0;
}
/**
 * 决定分类器转录对 Projects 线程的规则模式：unmarked、original、compact 或 compact-held。
 */
//@ chunk-s1zey0a9.js:3917-4105 placement
function threadRuleMode() {
  if (!ve()) return "unmarked";
  if (!isCompactThreadRuleEnabled()) return "original";
  return (antEnv.CLAUDE_CODE_AUTO_MODE_THREAD_ASK_HELD ??
    isFlagOffOrUnresolved("tengu_projects_thread_ask_held_killswitch"))
    ? "compact-held"
    : "compact";
}
//@ chunk-s1zey0a9.js:4105-4255 placement
function isFlagOffOrUnresolved(e) {
  let t = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, void 0);
  switch (t.source) {
    case "payload":
    case "disk":
    case "override":
      return t.value === !1;
    case "disabled":
    case "fallback":
      return !0;
  }
}
//@ chunk-s1zey0a9.js:4255-4324 placement
function Y() {
  return isFlagOffOrUnresolved("tengu_projects_other_thread_rows_killswitch");
}
//@ chunk-s1zey0a9.js:4324-4359 placement
function Qbe(e = getMcpClientsFromAccessor()) {
  return hasRelaySource(e);
}
//@ chunk-s1zey0a9.js:4359-4404 placement
function Kfe(e) {
  return m8(e, HEARTH_UPDATE_STATUS_TOOLS) && !m8(e, HEARTH_START_THREAD_TOOLS);
}
//@ chunk-s1zey0a9.js:4404-4449 placement
function mZn(e) {
  return m8(e, HEARTH_START_THREAD_TOOLS) && !m8(e, HEARTH_UPDATE_STATUS_TOOLS);
}
/**
 * 判断是否需要向分类器转发 Projects 中继行：会话入口令牌存在、处于 Projects 会话、未连接 hearthbot，且有带中继行的用户消息。
 */
//@ chunk-s1zey0a9.js:4449-4770 placement
function shouldForwardRelayRows(e, t = getMcpClientsFromAccessor(), n = !1) {
  if (!hasSessionIngressAuthToken() || !(mn() || op()) || t === void 0 || t.some((r) => r.name === HEARTHBOT))
    return !1;
  if (n) return !0;
  return e.some((r) => {
    let s =
      r.type === "user"
        ? r
        : r.type === "attachment" && r.attachment.type === "queued_command"
          ? r.attachment
          : void 0;
    return (
      s !== void 0 &&
      isProjectsRelay(s.origin) &&
      relayRowsOf(s) !== void 0 &&
      s.hearthRelayThreadTs === void 0
    );
  });
}
//@ chunk-s1zey0a9.js:4770-5442 placement
function collectThreadRows(e) {
  let t,
    n,
    r = resolvedRowsMode() === "full";
  for (let [s, a] of e.entries()) {
    let i =
      a.type === "user"
        ? a
        : a.type === "attachment" && a.attachment.type === "queued_command"
          ? a.attachment
          : void 0;
    if (i === void 0) continue;
    if (r && isProjectsRelay(i.origin))
      for (let c of relayRowsOf(i)?.rows ?? []) {
        if (!D(c) || c.text.trim() === "") continue;
        let parse = Date.parse(c.written_at);
        if (isNewerRow({ at: parse, index: s }, t)) t = { text: c.text, at: parse, index: s };
      }
    if (i.verifiedSlackHumanTurn === !0) {
      let c = i.type === "user" ? i.message.content : i.prompt,
        l = typeof c === "string" ? lastHumanMessageText(c) : void 0;
      if (l !== void 0) {
        let parse = Date.parse((i.type === "user" ? void 0 : i.timestamp) ?? a.timestamp);
        if (isNewerRow({ at: parse, index: s }, n)) n = { text: l, at: parse, index: s };
      }
    }
  }
  if (t && n) return isNewerRow(n, t) ? n.text : t.text;
  return (t ?? n)?.text;
}

export {
  COORDINATOR_MESSAGE_PATTERNS,
  VVr,
  isCompactBoundaryMessage,
  zRe,
  Us,
  Qbe,
  threadRuleMode,
  Kfe,
  mZn,
  hasOnlyPreservedBeforeBoundary,
  uZn,
  resolvedRowsMode,
  shouldForwardRelayRows,
  isMemberRelayRowsEnabled,
  MQs,
  formatCoordinatorRelay,
  collectThreadRows,
  Y,
  regExp_2,
  regExp_3,
  mKo,
};
