/**
 * services/projects/threadRows.ts
 *
 * Projects 线程消息行（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-fazwv9v4.js (30)
 * attribution: placement 28, layout 2
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
import { getMcpClientsFromAccessorOrTenant, getMcpClientsFromAccessor } from "../../bootstrap/state.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fazwv9v4.js:744-1639 placement
/**
 * 协调会话中继消息的固定说明文字，以及识别整段中继文本（relay/cited/note 标签、缩进）用的正则集合。
 */
var COORDINATOR_MESSAGE_PATTERNS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var attrPattern;
var RELAY_TAG_ATTRS_PATTERN;
var CITED_TAG_ATTRS_PATTERN;
var RELAY_INDENT_PATTERN;
var NOTE_OPEN_TAG;
var NOTE_CLOSE_TAGS_PATTERN;
var regExp;
var regExp_2;
var regExp_3;
var ATTRIBUTE_NAME_REGEX;
deferInit("chunk-fazwv9v4.js:744", () => {
  COORDINATOR_MESSAGE_PATTERNS =
    'A message from this project\u2019s coordinator session \u2014 a Claude session working for the members of this project. Inside, <cited author="user"> entries are messages from members of this project, copied by the server, and name is that member\u2019s own display name; <cited author="coordinator"> entries and the note are the coordinator session\u2019s words, not a member\u2019s.';
  attrPattern = (names, ...extraAttrs) =>
    `(?: (?:${names})="[^"<>\\n]*"${extraAttrs.map((attr) => `| ${attr}`).join("")})*`;
  RELAY_TAG_ATTRS_PATTERN = attrPattern("from|session|current-time|reason|id|sent-for|sent-for-name");
  CITED_TAG_ATTRS_PATTERN = attrPattern(
    "id|author|name|author-id|session|at|where|thread|in_reply_to|writer|edited_at|truncated|attachments",
    'attached_by="server"',
  );
  RELAY_INDENT_PATTERN = "(?: {2}| {4})";
  NOTE_OPEN_TAG = "<note>";
  NOTE_CLOSE_TAGS_PATTERN = "</note>|</note></relay>";
  regExp = new RegExp(
    `^(?:<relay${RELAY_TAG_ATTRS_PATTERN}>|</relay>|${RELAY_INDENT_PATTERN}(?:<cited${CITED_TAG_ATTRS_PATTERN}>|</cited>|${NOTE_OPEN_TAG}|${NOTE_CLOSE_TAGS_PATTERN}))$`,
  );
  regExp_2 = new RegExp(`^${RELAY_INDENT_PATTERN}${NOTE_OPEN_TAG}$`);
  regExp_3 = new RegExp(`^${RELAY_INDENT_PATTERN}(?:${NOTE_CLOSE_TAGS_PATTERN})$`);
  ATTRIBUTE_NAME_REGEX = / ([a-z][a-z0-9_-]*)="/g;
});
//@ chunk-fazwv9v4.js:1639-1737 placement
function hasUniqueAttributes(line) {
  let seen = new Set();
  for (let [, attrName] of line.matchAll(ATTRIBUTE_NAME_REGEX)) {
    if (seen.has(attrName)) return false;
    seen.add(attrName);
  }
  return true;
}
//@ chunk-fazwv9v4.js:1737-1768 placement
var CONTROL_OR_LINEBREAK_REGEX = /[\p{Cc}\u2028\u2029]/u;
//@ chunk-fazwv9v4.js:1768-1887 placement (2.1.88 match: escapeXml, 0.794)
function escapeXml(s) {
  let escaped = "";
  for (let char of s) {
    let replaced = char === "<" || char === ">" ? char : BRACKET_CONFUSABLES_2.get(char);
    escaped += replaced === "<" ? "&lt;" : replaced === ">" ? "&gt;" : char;
  }
  return escaped;
}
//@ chunk-fazwv9v4.js:1887-1994 placement
function escapeRelayLines(text, allowEnvelope) {
  return text
    .split(
      `
`,
    )
    .map((line) =>
      allowEnvelope &&
      regExp.test(line) &&
      hasUniqueAttributes(line) &&
      !hasBracketConfusables(line) &&
      !CONTROL_OR_LINEBREAK_REGEX.test(line)
        ? line
        : escapeXml(line),
    ).join(`
`);
}
//@ chunk-fazwv9v4.js:1994-2055 placement
function hasBracketConfusables(line) {
  for (let char of line) if (BRACKET_CONFUSABLES_2.has(char)) return true;
  return false;
}
//@ chunk-fazwv9v4.js:2055-2118 placement
/**
 * 把协调会话中继内容包进带说明的 <relay> 块，逐行转义标签、中和易混字符。
 */
function wrapCoordinatorRelay(text, serverEnvelope) {
  return `<${COORDINATOR_RELAY}>
${neutralizeConfusableTags(COORDINATOR_RELAY, escapeRelayLines(text, serverEnvelope))}
</${COORDINATOR_RELAY}>`;
}
//@ chunk-fazwv9v4.js:2118-2492 placement
/**
 * 协调会话中继消息的说明文字，以及包裹中继内容的前缀列表与结束标记。
 */
var COORDINATOR_RELAY_NOTE; // deferred: uses AGENT_NOTIFICATION_PREFIX (../../constants/xml.js) of its import cycle while loading; runs once the cycle is complete
var relayPrefixes;
var RELAY_SUFFIX;
deferInit("chunk-fazwv9v4.js:2118", () => {
  COORDINATOR_RELAY_NOTE =
    'A message from this project\u2019s coordinator session \u2014 a Claude session working for your user. Inside, <cited author="user"> entries are your user\u2019s own messages copied by the server; <cited author="coordinator"> entries and the note are the coordinator session\u2019s words, not your user\u2019s.';
  relayPrefixes = [COORDINATOR_MESSAGE_PATTERNS, COORDINATOR_RELAY_NOTE].map(
    (pattern) => `${pattern}

<${COORDINATOR_RELAY}>
`,
  );
  RELAY_SUFFIX = `
</${COORDINATOR_RELAY}>`;
});
//@ chunk-fazwv9v4.js:2492-2689 placement
/**
 * 把协调会话的中继消息重新包装成带说明的格式，去掉原有的中继包裹。
 */
function formatCoordinatorRelay(text, options) {
  let found = relayPrefixes.find(
    (relayPrefix) =>
      text.startsWith(relayPrefix) &&
      text.endsWith(RELAY_SUFFIX) &&
      text.length >= relayPrefix.length + RELAY_SUFFIX.length,
  );
  let envelopeBody = found === undefined ? text : text.slice(found.length, text.length - RELAY_SUFFIX.length);
  return `${COORDINATOR_MESSAGE_PATTERNS}

${wrapCoordinatorRelay(envelopeBody, options?.serverEnvelope === true)}`;
}
//@ chunk-fazwv9v4.js:2689-2759 placement
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
//@ chunk-fazwv9v4.js:2759-2832 placement (2.1.88 match: isCompactBoundaryMessage, 1)
function isCompactBoundaryMessage(message) {
  return message?.type === "system" && message.subtype === "compact_boundary";
}
//@ chunk-fazwv9v4.js:2832-2920 placement
/**
 * 从后往前找最后一条 compact_boundary 系统消息的下标，找不到返回 -1。
 */
function findCompactBoundaryIndex(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    let message = messages[i];
    if (message && isCompactBoundaryMessage(message)) return i;
  }
  return -1;
}
//@ chunk-fazwv9v4.js:2920-3016 placement
/**
 * 提示：历史从上次压缩开始加载，被压缩掉的消息不在此处。
 */
var COMPACTED_AWAY_NOTICE =
  "Loaded from the session's last compaction, so the messages it summarized aren't here.";
//@ chunk-fazwv9v4.js:3016-3204 placement
/**
 * 判断压缩边界之前的消息是否全部是被保留的消息。
 */
function hasOnlyPreservedBeforeBoundary(messages) {
  let compactBoundaryIndex = findCompactBoundaryIndex(messages);
  let boundaryMessage = messages[compactBoundaryIndex];
  if (!boundaryMessage || !isCompactBoundaryMessage(boundaryMessage)) return false;
  let uuids = boundaryMessage.compactMetadata?.preservedMessages?.uuids;
  let preservedUuids = new Set(Array.isArray(uuids) ? uuids : []);
  return messages.slice(0, compactBoundaryIndex).every((message) => preservedUuids.has(message.uuid));
}
//@ chunk-fazwv9v4.js:3204-3261 placement
/**
 * 丢弃最后一条压缩边界之前的消息（压缩后只保留边界起的部分）。
 */
function messagesSinceCompactBoundary(messages, unused) {
  let compactBoundaryIndex = findCompactBoundaryIndex(messages);
  return compactBoundaryIndex === -1 ? messages : messages.slice(compactBoundaryIndex);
}
//@ chunk-fazwv9v4.js:3261-3364 placement
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
//@ chunk-fazwv9v4.js:3364-3410 placement
/**
 * 读开关 tengu_sunny_anchor。
 */
function isSunnyAnchorOff() {
  return isFlagOffOrUnresolved("tengu_sunny_anchor");
}
//@ chunk-fazwv9v4.js:3410-3598 placement
/**
 * 判断是否启用成员会话的中继行（环境变量优先，否则看特性开关）。
 */
function isMemberRelayRowsEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_HEARTH_MEMBER_RELAY_ROWS !== undefined)
    return antEnv.CLAUDE_CODE_AUTO_MODE_HEARTH_MEMBER_RELAY_ROWS;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hearth_member_relay_rows_enabled", false);
}
//@ chunk-fazwv9v4.js:3598-3663 placement
/**
 * 判断是否启用 worker 自身的行。
 */
function isWorkerOwnerRowsEnabled() {
  return !getFeatureValue_CACHED_MAY_BE_STALE("tengu_worker_owner_rows_killswitch", false);
}
//@ chunk-fazwv9v4.js:3663-3737 placement
function isThreadReplyLeadEnabled() {
  return !getFeatureValue_SESSION_PINNED("tengu_projects_thread_reply_lead_killswitch", false);
}
//@ chunk-fazwv9v4.js:3737-3923 placement
function isCompactThreadRuleEnabled() {
  if (antEnv.CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE !== undefined)
    return antEnv.CLAUDE_CODE_AUTO_MODE_COMPACT_THREAD_RULE;
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_projects_compact_thread_rule_enabled", false) === true;
}
//@ chunk-fazwv9v4.js:3923-4244 layout
function getThreadRuleMode() {
  if (!isThreadReplyLeadEnabled()) return "unmarked";
  if (!isCompactThreadRuleEnabled()) return "original";
  if (!(
    antEnv.CLAUDE_CODE_AUTO_MODE_THREAD_ASK_HELD ??
    isFlagOffOrUnresolved("tengu_projects_thread_ask_held_killswitch")
  ))
    return "compact";
  return (antEnv.CLAUDE_CODE_AUTO_MODE_THREAD_ASK_OWN_WORK ??
    isFlagOffOrUnresolved("tengu_projects_thread_ask_own_work_killswitch"))
    ? "compact-held-own-work"
    : "compact-held";
}
//@ chunk-fazwv9v4.js:4244-4315 layout
function isHeldRuleMode(turnMarkMode) {
  return turnMarkMode === "compact-held" || turnMarkMode === "compact-held-own-work";
}
//@ chunk-fazwv9v4.js:4315-4465 placement
function isFlagOffOrUnresolved(flagKey) {
  let resolved = getFeatureValueWithSource_CACHED_MAY_BE_STALE(flagKey, undefined);
  switch (resolved.source) {
    case "payload":
    case "disk":
    case "override":
      return resolved.value === false;
    case "disabled":
    case "fallback":
      return true;
  }
}
//@ chunk-fazwv9v4.js:4465-4534 placement
function isOtherThreadRowsOff() {
  return isFlagOffOrUnresolved("tengu_projects_other_thread_rows_killswitch");
}
//@ chunk-fazwv9v4.js:4534-4570 placement
/**
 * 当前 MCP 客户端里是否有项目中继来源（有则可接受协调会话中继行）。
 */
function hasRelaySourceForClients(clients = getMcpClientsFromAccessorOrTenant()) {
  return hasRelaySource(clients);
}
//@ chunk-fazwv9v4.js:4570-4615 placement
/**
 * 只提供更新状态工具、没有建线程工具的 MCP 客户端：需要转发中继行。
 */
function hasUpdateStatusToolOnly(server) {
  return (
    serverHasAnyTool(server, HEARTH_UPDATE_STATUS_TOOLS) &&
    !serverHasAnyTool(server, HEARTH_START_THREAD_TOOLS)
  );
}
//@ chunk-fazwv9v4.js:4615-4660 placement
/**
 * 只提供建线程工具、没有更新状态工具的 MCP 客户端。
 */
function hasStartThreadToolOnly(server) {
  return (
    serverHasAnyTool(server, HEARTH_START_THREAD_TOOLS) &&
    !serverHasAnyTool(server, HEARTH_UPDATE_STATUS_TOOLS)
  );
}
//@ chunk-fazwv9v4.js:4660-4981 placement (2.1.88 match: buildTranscriptEntries, 0.785)
/**
 * 判断是否需要向分类器转发 Projects 中继行：会话入口令牌存在、处于 Projects 会话、未连接 hearthbot，且有带中继行的用户消息。
 */
function shouldForwardRelayRows(
  messages,
  clients = getMcpClientsFromAccessor(),
  projectsMemberRelaySeen = false,
) {
  if (
    !hasSessionIngressAuthToken() ||
    !(isRemoteManagedEnvironment() || isByocEnvironment()) ||
    clients === undefined ||
    clients.some((client) => client.name === HEARTHBOT)
  )
    return false;
  if (projectsMemberRelaySeen) return true;
  return messages.some((message) => {
    let relayHost =
      message.type === "user"
        ? message
        : message.type === "attachment" && message.attachment.type === "queued_command"
          ? message.attachment
          : undefined;
    return (
      relayHost !== undefined &&
      isProjectsRelay(relayHost.origin) &&
      relayRowsOf(relayHost) !== undefined &&
      relayHost.hearthRelayThreadTs === undefined
    );
  });
}
//@ chunk-fazwv9v4.js:4981-5653 placement
function collectThreadRows(messages) {
  let latestRelayRow;
  let latestSlackRow;
  let isFullMode = resolvedRowsMode() === "full";
  for (let [index, message] of messages.entries()) {
    let relayHost =
      message.type === "user"
        ? message
        : message.type === "attachment" && message.attachment.type === "queued_command"
          ? message.attachment
          : undefined;
    if (relayHost === undefined) continue;
    if (isFullMode && isProjectsRelay(relayHost.origin))
      for (let row of relayRowsOf(relayHost)?.rows ?? []) {
        if (!isTimelineHumanRow(row) || row.text.trim() === "") continue;
        let at = Date.parse(row.written_at);
        if (
          isNewerRow(
            {
              at,
              index,
            },
            latestRelayRow,
          )
        )
          latestRelayRow = {
            text: row.text,
            at,
            index,
          };
      }
    if (relayHost.verifiedSlackHumanTurn === true) {
      let content = relayHost.type === "user" ? relayHost.message.content : relayHost.prompt;
      let text = typeof content === "string" ? lastHumanMessageText(content) : undefined;
      if (text !== undefined) {
        let at = Date.parse(
          (relayHost.type === "user" ? undefined : relayHost.timestamp) ?? message.timestamp,
        );
        if (
          isNewerRow(
            {
              at,
              index,
            },
            latestSlackRow,
          )
        )
          latestSlackRow = {
            text,
            at,
            index,
          };
      }
    }
  }
  if (latestRelayRow && latestSlackRow)
    return isNewerRow(latestSlackRow, latestRelayRow) ? latestSlackRow.text : latestRelayRow.text;
  return (latestRelayRow ?? latestSlackRow)?.text;
}
export {
  hasRelaySourceForClients,
  isCompactBoundaryMessage,
  messagesSinceCompactBoundary,
  hasUpdateStatusToolOnly,
  hasStartThreadToolOnly,
  COORDINATOR_MESSAGE_PATTERNS,
  formatCoordinatorRelayMessages,
  findCompactBoundaryIndex,
  resolvedRowsMode,
  isSunnyAnchorOff,
  shouldForwardRelayRows,
  isMemberRelayRowsEnabled,
  isWorkerOwnerRowsEnabled,
  isHeldRuleMode,
  getThreadRuleMode,
  hasOnlyPreservedBeforeBoundary,
  COMPACTED_AWAY_NOTICE,
  formatCoordinatorRelay,
  isOtherThreadRowsOff,
  regExp_2,
  regExp_3,
  collectThreadRows,
};
