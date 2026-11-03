/**
 * services/projectsRelay/relayConfig.ts
 *
 * 2.1.316 新增：提取消息的中继回合标记（Slack 人工、项目用户、邮件发件人等）；中继消息行 schema（作者类型、角色等）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (16)
 * attribution: placement 16
 */
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, _enum, M, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { HEARTHBOT } from "../mcp/ccrMetaMcp.js";
import { isCliOwnedConfig } from "../mcp/cliOwnedClients.js";
import { isCcrUrlWithoutCredentials } from "../mcp/ccrMcpUrls.js";

//@ chunk-aepeg2w5.js:597533-597971 placement
/**
 * 提取消息的中继回合标记（Slack 人工、项目用户、邮件发件人等）。
 */
function relayTurnFlags(message) {
  let n = {};
  if (message.verifiedSlackHumanTurn === true) n.verifiedSlackHumanTurn = true;
  if (message.projectsUserTurn === true) n.projectsUserTurn = true;
  if (message.emailSenderTurn !== undefined) n.emailSenderTurn = message.emailSenderTurn;
  if (message.hearthRelayMessageIds !== undefined) n.hearthRelayMessageIds = message.hearthRelayMessageIds;
  if (message.hearthRelayRows !== undefined) n.hearthRelayRows = message.hearthRelayRows;
  if (message.hearthRelayThreadTs !== undefined) n.hearthRelayThreadTs = message.hearthRelayThreadTs;
  return n;
}
//@ chunk-aepeg2w5.js:597971-598023 placement
/**
 * 属于中继来源的种类名（projects-relay、session-inbox）。
 */
var RELAY_SOURCE_KINDS = new Set(["projects-relay", "session-inbox"]);
//@ chunk-aepeg2w5.js:598023-598121 placement
/**
 * 给指定 uuid 的用户消息打上中继回合标记。
 */
function attachRelayTurnFlags(e, n, r) {
  let s = relayTurnFlags(r);
  for (let h of e) if (h.type === "user" && h.uuid === n) Object.assign(h, s);
}
//@ chunk-aepeg2w5.js:598121-598192 placement
/**
 * 中继消息 id 的格式与批量上限。
 */
var ANTHROPIC_HEARTH_ROWS = "anthropic/hearth.rows";
var RELAY_MESSAGE_ID_REGEX = /^cmsg_[A-Za-z0-9_-]{1,128}$/;
var MAX_RELAY_MESSAGE_IDS = 8;
//@ chunk-aepeg2w5.js:598192-598406 placement
/**
 * 解析 relay_message_ids。
 */
function parseRelayMessageIds(e) {
  let relayMessageIds = e.relay_message_ids;
  if (
    !Array.isArray(relayMessageIds) ||
    relayMessageIds.length === 0 ||
    relayMessageIds.length > MAX_RELAY_MESSAGE_IDS
  )
    return;
  let r = [];
  let s = new Set();
  for (let relayMessageId of relayMessageIds) {
    if (
      typeof relayMessageId !== "string" ||
      !RELAY_MESSAGE_ID_REGEX.test(relayMessageId) ||
      s.has(relayMessageId)
    )
      return;
    s.add(relayMessageId);
    r.push(relayMessageId);
  }
  return r;
}
//@ chunk-aepeg2w5.js:598406-598811 placement
/**
 * 中继消息行 schema（作者类型、角色等）。
 */
var RelayRowSchema = DoctorLazy(() =>
  u({
    id: string().regex(RELAY_MESSAGE_ID_REGEX),
    in_reply_to: string().regex(RELAY_MESSAGE_ID_REGEX).optional(),
    attached_by: _enum(["server"]).optional().catch(undefined),
    author_kind: _enum(["owner", "member", "agent", "system"]),
    author_id: string(),
    author_live: M().optional(),
    author_role: string().optional(),
    where: _enum(["timeline", "thread"]),
    thread_ts: string().optional(),
    written_at: string(),
    edited_at: string().optional(),
    within_window: M().optional(),
    truncated: M().optional(),
    text: string(),
  }),
);
//@ chunk-aepeg2w5.js:598811-599005 placement
/**
 * 中继作者是否为在场的人（owner/member）。
 */
function isHumanRelayAuthor(e) {
  if (e.author_role === "former_member") return false;
  switch (e.author_kind) {
    case "owner":
      return e.author_live !== false;
    case "member":
      return e.author_live === true;
    case "agent":
    case "system":
      return false;
  }
}
//@ chunk-aepeg2w5.js:599005-599043 placement
var relayRowsSchema = DoctorLazy(() => array(RelayRowSchema()).min(1).max(MAX_RELAY_MESSAGE_IDS));
//@ chunk-aepeg2w5.js:599043-599221 placement
/**
 * 解析消息的 relay_rows：id 必须在给定集合内且不重复，否则返回 undefined。
 */
function parseRelayRows(e, relayMessageIds) {
  let r = relayRowsSchema().safeParse(e.relay_rows);
  if (!r.success) return;
  let s = new Set(relayMessageIds);
  let h = new Set();
  for (let { id } of r.data) {
    if (!s.has(id) || h.has(id)) return;
    h.add(id);
  }
  return r.data;
}
//@ chunk-aepeg2w5.js:599221-599310 placement
/**
 * 取合法的中继线程时间戳，非法返回 undefined。
 */
function relayThreadTsOf(e) {
  let relayThreadTs = e.relay_thread_ts;
  return typeof relayThreadTs === "string" && RELAY_MESSAGE_ID_REGEX.test(relayThreadTs)
    ? relayThreadTs
    : undefined;
}
//@ chunk-aepeg2w5.js:599310-599346 placement
var COORDINATOR_RELAY_PREFIX = '<relay from="coordinator" ';
//@ chunk-aepeg2w5.js:599346-599519 placement
/**
 * 是否为中继注入的提示。
 */
function isRelayPrompt(e) {
  let content = e.message?.content;
  return (
    e.isSynthetic === true &&
    e.shouldQuery !== false &&
    e.relay_message_ids === undefined &&
    relayThreadTsOf(e) !== undefined &&
    typeof content === "string" &&
    content.startsWith(COORDINATOR_RELAY_PREFIX)
  );
}
//@ chunk-aepeg2w5.js:599519-599645 placement
/**
 * 为消息设置 Hearth 中继元数据（消息 id、行、线程 ts）。
 */
function setHearthRelayMetadata(e, turnId, { messageIds, rows, threadTs }) {
  attachRelayTurnFlags(e, turnId, {
    hearthRelayMessageIds: messageIds,
    hearthRelayRows: rows,
    hearthRelayThreadTs: threadTs,
  });
}
//@ chunk-aepeg2w5.js:599645-599792 placement
/**
 * 判断 MCP 服务器是否为 Hearthbot 中继（动态作用域、不带凭据的 CCR URL）。
 */
function isHearthbotRelayServer(e) {
  return (
    e.name === HEARTHBOT &&
    e.config.scope === "dynamic" &&
    !isCliOwnedConfig(e.config) &&
    "url" in e.config &&
    typeof e.config.url === "string" &&
    isCcrUrlWithoutCredentials(e.config.url)
  );
}
//@ chunk-aepeg2w5.js:599792-599832 placement
/**
 * 是否有中继来源。
 */
function hasRelaySource(e) {
  return (e ?? []).some(isHearthbotRelayServer);
}
//@ chunk-aepeg2w5.js:599832-600042 placement
/**
 * 中继来源类型名（mcp_send_message、slack、teams、hearth 等）。
 */
var RELAY_SOURCE_KINDS_2 = "mcp_send_message";
var SLACK_BOT = "slack_bot";
var HEARTH_AGENT = "hearth_agent";
var SLACK_HUMAN = "slack_human";
var TEAMS_HUMAN = "teams_human";
var OWNER_RELAY = "owner_relay";
var HEARTH_HUMAN = "hearth_human";
var AMB_HUMAN = "amb_human";
var DISCORD_HUMAN = "discord_human";
var SLACK_OWNER_PING = "slack_owner_ping";
var WEB_HUMAN = "web_human";
export {
  isHearthbotRelayServer,
  HEARTH_AGENT,
  setHearthRelayMetadata,
  relayTurnFlags,
  RELAY_SOURCE_KINDS_2,
  isHumanRelayAuthor,
  SLACK_BOT,
  RelayRowSchema,
  hasRelaySource,
  OWNER_RELAY,
  HEARTH_HUMAN,
  attachRelayTurnFlags,
  WEB_HUMAN,
  RELAY_SOURCE_KINDS,
  SLACK_HUMAN,
  TEAMS_HUMAN,
  AMB_HUMAN,
  DISCORD_HUMAN,
  SLACK_OWNER_PING,
  RELAY_MESSAGE_ID_REGEX,
  ANTHROPIC_HEARTH_ROWS,
  relayThreadTsOf,
  parseRelayMessageIds,
  isRelayPrompt,
  parseRelayRows,
};
