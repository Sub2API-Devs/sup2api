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
import { BRACKET_CONFUSABLES_2 } from "../../utils/sanitization.js";
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
import {
  serverHasAnyTool,
  HEARTH_UPDATE_STATUS_TOOLS,
  HEARTH_START_THREAD_TOOLS,
  HEARTHBOT,
} from "../mcp/ccrMetaMcp.js";
import { hasSessionIngressAuthToken } from "../../utils/sessionIngressAuth.js";
import { isRemoteManagedEnvironment, isByocEnvironment } from "../../utils/remoteEnvironment.js";
import { isProjectsRelay } from "../../utils/messageProvenance.js";
import { relayRowsOf, isTimelineHumanRow, isNewerRow, lastHumanMessageText } from "./threadTranscript.js";

//@ chunk-s1zey0a9.js:738-1633 placement
/**
 * 协调会话中继消息的固定说明文字，以及识别整段中继文本（relay/cited/note 标签、缩进）用的正则集合。
 */
var COORDINATOR_MESSAGE_PATTERNS =
  'A message from this project\u2019s coordinator session \u2014 a Claude session working for the members of this project. Inside, <cited author="user"> entries are messages from members of this project, copied by the server, and name is that member\u2019s own display name; <cited author="coordinator"> entries and the note are the coordinator session\u2019s words, not a member\u2019s.';
var attrPattern = (e, ...t) => `(?: (?:${e})="[^"<>\\n]*"${t.map((n) => `| ${n}`).join("")})*`;
var RELAY_TAG_ATTRS_PATTERN = attrPattern("from|session|current-time|reason|id|sent-for|sent-for-name");
var CITED_TAG_ATTRS_PATTERN = attrPattern(
  "id|author|name|author-id|session|at|where|thread|in_reply_to|writer|edited_at|truncated|attachments",
  'attached_by="server"',
);
var RELAY_INDENT_PATTERN = "(?: {2}| {4})";
var NOTE_OPEN_TAG = "<note>";
var NOTE_CLOSE_TAGS_PATTERN = "</note>|</note></relay>";
var regExp = new RegExp(
  `^(?:<relay${RELAY_TAG_ATTRS_PATTERN}>|</relay>|${RELAY_INDENT_PATTERN}(?:<cited${CITED_TAG_ATTRS_PATTERN}>|</cited>|${NOTE_OPEN_TAG}|${NOTE_CLOSE_TAGS_PATTERN}))$`,
);
var regExp_2 = new RegExp(`^${RELAY_INDENT_PATTERN}${NOTE_OPEN_TAG}$`);
var regExp_3 = new RegExp(`^${RELAY_INDENT_PATTERN}(?:${NOTE_CLOSE_TAGS_PATTERN})$`);
var ATTRIBUTE_NAME_REGEX = / ([a-z][a-z0-9_-]*)="/g;
//@ chunk-s1zey0a9.js:1633-1731 placement
function hasUniqueAttributes(line) {
  let t = new Set();
  for (let [, n] of line.matchAll(ATTRIBUTE_NAME_REGEX)) {
    if (t.has(n)) return false;
    t.add(n);
  }
  return true;
}
//@ chunk-s1zey0a9.js:1731-1762 placement
var CONTROL_OR_LINEBREAK_REGEX = /[\p{Cc}\u2028\u2029]/u;
//@ chunk-s1zey0a9.js:1762-1881 placement = escapeXml (0.793)
function escapeXml(s) {
  let t = "";
  for (let n of s) {
    let r = n === "<" || n === ">" ? n : BRACKET_CONFUSABLES_2.get(n);
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
    .map((line) =>
      t &&
      regExp.test(line) &&
      hasUniqueAttributes(line) &&
      !hasBracketConfusables(line) &&
      !CONTROL_OR_LINEBREAK_REGEX.test(line)
        ? line
        : escapeXml(line),
    ).join(`
`);
}
//@ chunk-s1zey0a9.js:1988-2049 placement
function hasBracketConfusables(line) {
  for (let t of line) if (BRACKET_CONFUSABLES_2.has(t)) return true;
  return false;
}
//@ chunk-s1zey0a9.js:2049-2112 placement
/**
 * 把协调会话中继内容包进带说明的 <relay> 块，逐行转义标签、中和易混字符。
 */
function wrapCoordinatorRelay(e, t) {
  return `<${COORDINATOR_RELAY}>
${neutralizeConfusableTags(COORDINATOR_RELAY, escapeRelayLines(e, t))}
</${COORDINATOR_RELAY}>`;
}
//@ chunk-s1zey0a9.js:2112-2486 placement
/**
 * 协调会话中继消息的说明文字，以及包裹中继内容的前缀列表与结束标记。
 */
var COORDINATOR_RELAY_NOTE =
  'A message from this project\u2019s coordinator session \u2014 a Claude session working for your user. Inside, <cited author="user"> entries are your user\u2019s own messages copied by the server; <cited author="coordinator"> entries and the note are the coordinator session\u2019s words, not your user\u2019s.';
var relayPrefixes = [COORDINATOR_MESSAGE_PATTERNS, COORDINATOR_RELAY_NOTE].map(
  (e) => `${e}

<${COORDINATOR_RELAY}>
`,
);
var RELAY_SUFFIX = `
</${COORDINATOR_RELAY}>`;
//@ chunk-s1zey0a9.js:2486-2683 placement
/**
 * 把协调会话的中继消息重新包装成带说明的格式，去掉原有的中继包裹。
 */
function formatCoordinatorRelay(e, t) {
  let found = relayPrefixes.find(
    (relayPrefix) =>
      e.startsWith(relayPrefix) &&
      e.endsWith(RELAY_SUFFIX) &&
      e.length >= relayPrefix.length + RELAY_SUFFIX.length,
  );
  let r = found === undefined ? e : e.slice(found.length, e.length - RELAY_SUFFIX.length);
  return `${COORDINATOR_MESSAGE_PATTERNS}

${wrapCoordinatorRelay(r, t?.serverEnvelope === true)}`;
}
//@ chunk-s1zey0a9.js:2683-2753 placement
/**
 * 把多行协调会话中继文本合并并用 formatCoordinatorRelay 统一包装。
 */
function formatCoordinatorRelayMessages(textBlocks) {
  return formatCoordinatorRelay(
    textBlocks.join(`

`),
    {
      serverEnvelope: textBlocks.length <= 1,
    },
  );
}
//@ chunk-s1zey0a9.js:2753-2826 placement = isCompactBoundaryMessage (1)
function isCompactBoundaryMessage(message) {
  return message?.type === "system" && message.subtype === "compact_boundary";
}
//@ chunk-s1zey0a9.js:2826-2914 placement
/**
 * 从后往前找最后一条 compact_boundary 系统消息的下标，找不到返回 -1。
 */
function findCompactBoundaryIndex(e) {
  for (let i = e.length - 1; i >= 0; i--) {
    let n = e[i];
    if (n && isCompactBoundaryMessage(n)) return i;
  }
  return -1;
}
//@ chunk-s1zey0a9.js:2914-3010 placement
/**
 * 提示：历史从上次压缩开始加载，被压缩掉的消息不在此处。
 */
var COMPACTED_AWAY_NOTICE =
  "Loaded from the session's last compaction, so the messages it summarized aren't here.";
//@ chunk-s1zey0a9.js:3010-3198 placement
/**
 * 判断压缩边界之前的消息是否全部是被保留的消息。
 */
function hasOnlyPreservedBeforeBoundary(e) {
  let compactBoundaryIndex = findCompactBoundaryIndex(e);
  let n = e[compactBoundaryIndex];
  if (!n || !isCompactBoundaryMessage(n)) return false;
  let uuids = n.compactMetadata?.preservedMessages?.uuids;
  let s = new Set(Array.isArray(uuids) ? uuids : []);
  return e.slice(0, compactBoundaryIndex).every((a) => s.has(a.uuid));
}
//@ chunk-s1zey0a9.js:3198-3255 placement
/**
 * 丢弃最后一条压缩边界之前的消息（压缩后只保留边界起的部分）。
 */
function messagesSinceCompactBoundary(e, t) {
  let compactBoundaryIndex = findCompactBoundaryIndex(e);
  return compactBoundaryIndex === -1 ? e : e.slice(compactBoundaryIndex);
}
//@ chunk-s1zey0a9.js:3255-3358 placement
/**
 * 读取 Projects 中继行的处理模式（full / model_only / off）。
 */
function resolvedRowsMode() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_hearth_resolved_rows",
    "off",
  );
  return featureValue_CACHED_MAY_BE_STALE === "full" || featureValue_CACHED_MAY_BE_STALE === "model_only"
    ? featureValue_CACHED_MAY_BE_STALE
    : "off";
}
//@ chunk-s1zey0a9.js:3358-3404 placement
/**
 * 读开关 tengu_sunny_anchor。
 */
function isSunnyAnchorOff() {
  return isFlagOffOrUnresolved("tengu_sunny_anchor");
}
//@ chunk-s1zey0a9.js:3404-3592 placement
/**
 * 判断是否启用成员会话的中继行（环境变量优先，否则看特性开关）。
 */
function isMemberRelayRowsEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_HEARTH_MEMBER_RELAY_ROWS !== undefined)
    return antEnv.CLAUDE_CODE_AUTO_MODE_HEARTH_MEMBER_RELAY_ROWS;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hearth_member_relay_rows_enabled", false);
}
//@ chunk-s1zey0a9.js:3592-3657 placement
/**
 * 判断是否启用 worker 自身的行。
 */
function isWorkerOwnerRowsEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_worker_owner_rows_killswitch", false);
}
//@ chunk-s1zey0a9.js:3657-3731 placement
function isThreadReplyLeadEnabled() {
  return !getFeatureValue_SESSION_PINNED("tengu_projects_thread_reply_lead_killswitch", false);
}
//@ chunk-s1zey0a9.js:3731-3917 placement
function isCompactThreadRuleEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE !== undefined)
    return antEnv.CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_projects_compact_thread_rule_enabled", false) === true;
}
//@ chunk-s1zey0a9.js:3917-4105 placement
/**
 * 决定分类器转录对 Projects 线程的规则模式：unmarked、original、compact 或 compact-held。
 */
function threadRuleMode() {
  if (!isThreadReplyLeadEnabled()) return "unmarked";
  if (!isCompactThreadRuleEnabled()) return "original";
  return (antEnv.CLAUDE_CODE_AUTO_MODE_THREAD_ASK_HELD ??
    isFlagOffOrUnresolved("tengu_projects_thread_ask_held_killswitch"))
    ? "compact-held"
    : "compact";
}
//@ chunk-s1zey0a9.js:4105-4255 placement
function isFlagOffOrUnresolved(e) {
  let t = getFeatureValueWithSource_CACHED_MAY_BE_STALE(e, undefined);
  switch (t.source) {
    case "payload":
    case "disk":
    case "override":
      return t.value === false;
    case "disabled":
    case "fallback":
      return true;
  }
}
//@ chunk-s1zey0a9.js:4255-4324 placement
function isOtherThreadRowsOff() {
  return isFlagOffOrUnresolved("tengu_projects_other_thread_rows_killswitch");
}
//@ chunk-s1zey0a9.js:4324-4359 placement
/**
 * 当前 MCP 客户端里是否有项目中继来源（有则可接受协调会话中继行）。
 */
function hasRelaySourceForClients(e = getMcpClientsFromAccessor()) {
  return hasRelaySource(e);
}
//@ chunk-s1zey0a9.js:4359-4404 placement
/**
 * 只提供更新状态工具、没有建线程工具的 MCP 客户端：需要转发中继行。
 */
function hasUpdateStatusToolOnly(e) {
  return serverHasAnyTool(e, HEARTH_UPDATE_STATUS_TOOLS) && !serverHasAnyTool(e, HEARTH_START_THREAD_TOOLS);
}
//@ chunk-s1zey0a9.js:4404-4449 placement
/**
 * 只提供建线程工具、没有更新状态工具的 MCP 客户端。
 */
function hasStartThreadToolOnly(e) {
  return serverHasAnyTool(e, HEARTH_START_THREAD_TOOLS) && !serverHasAnyTool(e, HEARTH_UPDATE_STATUS_TOOLS);
}
//@ chunk-s1zey0a9.js:4449-4770 placement
/**
 * 判断是否需要向分类器转发 Projects 中继行：会话入口令牌存在、处于 Projects 会话、未连接 hearthbot，且有带中继行的用户消息。
 */
function shouldForwardRelayRows(e, t = getMcpClientsFromAccessor(), projectsMemberRelaySeen = false) {
  if (
    !hasSessionIngressAuthToken() ||
    !(isRemoteManagedEnvironment() || isByocEnvironment()) ||
    t === undefined ||
    t.some((r) => r.name === HEARTHBOT)
  )
    return false;
  if (projectsMemberRelaySeen) return true;
  return e.some((r) => {
    let s =
      r.type === "user"
        ? r
        : r.type === "attachment" && r.attachment.type === "queued_command"
          ? r.attachment
          : undefined;
    return (
      s !== undefined &&
      isProjectsRelay(s.origin) &&
      relayRowsOf(s) !== undefined &&
      s.hearthRelayThreadTs === undefined
    );
  });
}
//@ chunk-s1zey0a9.js:4770-5442 placement
function collectThreadRows(e) {
  let t;
  let n;
  let r = resolvedRowsMode() === "full";
  for (let [s, a] of e.entries()) {
    let i =
      a.type === "user"
        ? a
        : a.type === "attachment" && a.attachment.type === "queued_command"
          ? a.attachment
          : undefined;
    if (i === undefined) continue;
    if (r && isProjectsRelay(i.origin))
      for (let c of relayRowsOf(i)?.rows ?? []) {
        if (!isTimelineHumanRow(c) || c.text.trim() === "") continue;
        let at = Date.parse(c.written_at);
        if (
          isNewerRow(
            {
              at,
              index: s,
            },
            t,
          )
        )
          t = {
            text: c.text,
            at,
            index: s,
          };
      }
    if (i.verifiedSlackHumanTurn === true) {
      let c = i.type === "user" ? i.message.content : i.prompt;
      let l = typeof c === "string" ? lastHumanMessageText(c) : undefined;
      if (l !== undefined) {
        let at = Date.parse((i.type === "user" ? undefined : i.timestamp) ?? a.timestamp);
        if (
          isNewerRow(
            {
              at,
              index: s,
            },
            n,
          )
        )
          n = {
            text: l,
            at,
            index: s,
          };
      }
    }
  }
  if (t && n) return isNewerRow(n, t) ? n.text : t.text;
  return (t ?? n)?.text;
}
export {
  COORDINATOR_MESSAGE_PATTERNS,
  formatCoordinatorRelayMessages,
  isCompactBoundaryMessage,
  findCompactBoundaryIndex,
  messagesSinceCompactBoundary,
  hasRelaySourceForClients,
  threadRuleMode,
  hasUpdateStatusToolOnly,
  hasStartThreadToolOnly,
  hasOnlyPreservedBeforeBoundary,
  COMPACTED_AWAY_NOTICE,
  resolvedRowsMode,
  shouldForwardRelayRows,
  isMemberRelayRowsEnabled,
  isWorkerOwnerRowsEnabled,
  formatCoordinatorRelay,
  collectThreadRows,
  isOtherThreadRowsOff,
  regExp_2,
  regExp_3,
  isSunnyAnchorOff,
};
