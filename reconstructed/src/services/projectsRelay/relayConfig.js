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
import { u, o, U, M, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { HEARTHBOT } from "../mcp/ccrMetaMcp.js";
import { Zl } from "../mcp/cliOwnedClients.js";
import { isCcrUrlWithoutCredentials } from "../mcp/ccrMcpUrls.js";

/**
 * 提取消息的中继回合标记（Slack 人工、项目用户、邮件发件人等）。
 */
//@ chunk-aepeg2w5.js:597533-597971 placement
function relayTurnFlags(e) {
  let n = {};
  if (e.verifiedSlackHumanTurn === !0) n.verifiedSlackHumanTurn = !0;
  if (e.projectsUserTurn === !0) n.projectsUserTurn = !0;
  if (e.emailSenderTurn !== void 0) n.emailSenderTurn = e.emailSenderTurn;
  if (e.hearthRelayMessageIds !== void 0) n.hearthRelayMessageIds = e.hearthRelayMessageIds;
  if (e.hearthRelayRows !== void 0) n.hearthRelayRows = e.hearthRelayRows;
  if (e.hearthRelayThreadTs !== void 0) n.hearthRelayThreadTs = e.hearthRelayThreadTs;
  return n;
}
//@ chunk-aepeg2w5.js:597971-598023 placement
var Jvi = new Set(["projects-relay", "session-inbox"]);
//@ chunk-aepeg2w5.js:598023-598121 placement
function qno(e, n, r) {
  let s = relayTurnFlags(r);
  for (let h of e) if (h.type === "user" && h.uuid === n) Object.assign(h, s);
}
//@ chunk-aepeg2w5.js:598121-598192 placement
var ANTHROPIC_HEARTH_ROWS = "anthropic/hearth.rows",
  F6e = /^cmsg_[A-Za-z0-9_-]{1,128}$/,
  fC = 8;
/**
 * 解析 relay_message_ids。
 */
//@ chunk-aepeg2w5.js:598192-598406 placement
function parseRelayMessageIds(e) {
  let relay_message_ids = e.relay_message_ids;
  if (!Array.isArray(relay_message_ids) || relay_message_ids.length === 0 || relay_message_ids.length > fC)
    return;
  let r = [],
    s = new Set();
  for (let h of relay_message_ids) {
    if (typeof h !== "string" || !F6e.test(h) || s.has(h)) return;
    (s.add(h), r.push(h));
  }
  return r;
}
/**
 * 中继消息行 schema（作者类型、角色等）。
 */
//@ chunk-aepeg2w5.js:598406-598811 placement
var RelayRowSchema = DoctorLazy(() =>
  u({
    id: o().regex(F6e),
    in_reply_to: o().regex(F6e).optional(),
    attached_by: U(["server"])
      .optional()
      .catch(void 0),
    author_kind: U(["owner", "member", "agent", "system"]),
    author_id: o(),
    author_live: M().optional(),
    author_role: o().optional(),
    where: U(["timeline", "thread"]),
    thread_ts: o().optional(),
    written_at: o(),
    edited_at: o().optional(),
    within_window: M().optional(),
    truncated: M().optional(),
    text: o(),
  }),
);
/**
 * 中继作者是否为在场的人（owner/member）。
 */
//@ chunk-aepeg2w5.js:598811-599005 placement
function isHumanRelayAuthor(e) {
  if (e.author_role === "former_member") return !1;
  switch (e.author_kind) {
    case "owner":
      return e.author_live !== !1;
    case "member":
      return e.author_live === !0;
    case "agent":
    case "system":
      return !1;
  }
}
//@ chunk-aepeg2w5.js:599005-599043 placement
var uW = DoctorLazy(() => A(RelayRowSchema()).min(1).max(fC));
/**
 * 解析消息的 relay_rows：id 必须在给定集合内且不重复，否则返回 undefined。
 */
//@ chunk-aepeg2w5.js:599043-599221 placement
function parseRelayRows(e, n) {
  let safeParse = uW().safeParse(e.relay_rows);
  if (!safeParse.success) return;
  let s = new Set(n),
    h = new Set();
  for (let { id: id } of safeParse.data) {
    if (!s.has(id) || h.has(id)) return;
    h.add(id);
  }
  return safeParse.data;
}
//@ chunk-aepeg2w5.js:599221-599310 placement
function Eis(e) {
  let relay_thread_ts = e.relay_thread_ts;
  return typeof relay_thread_ts === "string" && F6e.test(relay_thread_ts) ? relay_thread_ts : void 0;
}
//@ chunk-aepeg2w5.js:599310-599346 placement
var lW = '<relay from="coordinator" ';
/**
 * 是否为中继注入的提示。
 */
//@ chunk-aepeg2w5.js:599346-599519 placement
function isRelayPrompt(e) {
  let n = e.message?.content;
  return (
    e.isSynthetic === !0 &&
    e.shouldQuery !== !1 &&
    e.relay_message_ids === void 0 &&
    Eis(e) !== void 0 &&
    typeof n === "string" &&
    n.startsWith(lW)
  );
}
/**
 * 为消息设置 Hearth 中继元数据（消息 id、行、线程 ts）。
 */
//@ chunk-aepeg2w5.js:599519-599645 placement
function setHearthRelayMetadata(e, n, { messageIds: messageIds, rows: rows, threadTs: threadTs }) {
  qno(e, n, { hearthRelayMessageIds: messageIds, hearthRelayRows: rows, hearthRelayThreadTs: threadTs });
}
/**
 * 判断 MCP 服务器是否为 Hearthbot 中继（动态作用域、不带凭据的 CCR URL）。
 */
//@ chunk-aepeg2w5.js:599645-599792 placement
function isHearthbotRelayServer(e) {
  return (
    e.name === HEARTHBOT &&
    e.config.scope === "dynamic" &&
    !Zl(e.config) &&
    "url" in e.config &&
    typeof e.config.url === "string" &&
    isCcrUrlWithoutCredentials(e.config.url)
  );
}
/**
 * 是否有中继来源。
 */
//@ chunk-aepeg2w5.js:599792-599832 placement
function hasRelaySource(e) {
  return (e ?? []).some(isHearthbotRelayServer);
}
/**
 * 中继来源类型名（mcp_send_message、slack、teams、hearth 等）。
 */
//@ chunk-aepeg2w5.js:599832-600042 placement
var RELAY_SOURCE_KINDS = "mcp_send_message",
  SLACK_BOT = "slack_bot",
  HEARTH_AGENT = "hearth_agent",
  SLACK_HUMAN = "slack_human",
  TEAMS_HUMAN = "teams_human",
  OWNER_RELAY = "owner_relay",
  HEARTH_HUMAN = "hearth_human",
  AMB_HUMAN = "amb_human",
  DISCORD_HUMAN = "discord_human",
  SLACK_OWNER_PING = "slack_owner_ping",
  WEB_HUMAN = "web_human";

export {
  isHearthbotRelayServer,
  HEARTH_AGENT,
  setHearthRelayMetadata,
  relayTurnFlags,
  RELAY_SOURCE_KINDS,
  isHumanRelayAuthor,
  SLACK_BOT,
  RelayRowSchema,
  hasRelaySource,
  OWNER_RELAY,
  HEARTH_HUMAN,
  qno,
  WEB_HUMAN,
  Jvi,
  SLACK_HUMAN,
  TEAMS_HUMAN,
  AMB_HUMAN,
  DISCORD_HUMAN,
  SLACK_OWNER_PING,
  F6e,
  ANTHROPIC_HEARTH_ROWS,
  Eis,
  parseRelayMessageIds,
  isRelayPrompt,
  parseRelayRows,
};
