/**
 * remote/startRefusalNotice.ts
 *
 * 云端会话启动被拒（start_refusal_notice）的解析与文案，含 GitHub 连接修正链接（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h29vk4wn.js (5)
 * attribution: placement 5
 */
import { getOauthConfig } from "../constants/oauth.js";
import { agentId } from "../utils/agentId.js";

//@ chunk-h29vk4wn.js:2000-2078 placement
/**
 * start_refusal_notice 事件类型与 no_github_link 原因、连接器设置路径常量。
 */
var START_REFUSAL_NOTICE = "start_refusal_notice";
var NO_GITHUB_LINK = "no_github_link";
var CONNECTORS_PATH = "/customize/connectors";
//@ chunk-h29vk4wn.js:2078-2249 placement
/**
 * 解析 start_refusal_notice 事件（校验 cause 形态）并规范化 action_url。
 */
function parseStartRefusal(attachment) {
  if (attachment.type !== START_REFUSAL_NOTICE) return null;
  let cause = attachment.cause;
  if (typeof cause !== "string" || !/^[a-z][a-z0-9_]{0,63}$/.test(cause)) return null;
  return {
    cause,
    actionUrl: parseActionUrl(attachment.action_url),
  };
}
//@ chunk-h29vk4wn.js:2249-2444 placement
function parseActionUrl(actionUrl) {
  if (typeof actionUrl !== "string" || actionUrl === "") return;
  let parsed;
  try {
    parsed = new URL(actionUrl);
  } catch {
    return;
  }
  return parsed.protocol === "https:" &&
    parsed.origin === getOauthConfig().CLAUDE_AI_ORIGIN &&
    parsed.username === "" &&
    parsed.password === ""
    ? parsed
    : undefined;
}
//@ chunk-h29vk4wn.js:2444-2675 placement
function githubAuthUrl(actionUrl, org) {
  if (actionUrl?.pathname !== CONNECTORS_PATH) return;
  let url = new URL(CONNECTORS_PATH, actionUrl.origin);
  url.searchParams.set("auth_start", "github");
  url.searchParams.set("auth_start_force", "1");
  if (org !== undefined && agentId(org)) url.searchParams.set("auth_start_org", org);
  return url.href;
}
//@ chunk-h29vk4wn.js:2675-3354 placement
/**
 * 云端会话启动被拒时的完整说明；缺 GitHub 连接时附一键连接链接。
 */
function describeStartRefusal(refusal, sessionUrl, orgUuid) {
  if (refusal.cause === NO_GITHUB_LINK) {
    let connectUrl = githubAuthUrl(refusal.actionUrl, orgUuid);
    let connectHint = connectUrl === undefined ? "" : ` Connect GitHub: ${connectUrl}`;
    return `The cloud session couldn't start (${NO_GITHUB_LINK}). Its owner has no working GitHub connection in Claude. If that's you, connect or reconnect GitHub in Customize \u2192 Connectors, then send the session a new message. The session can take about 10 minutes to start. If it still hasn't started, archive it and start a new one. If it isn't your session, let its owner know.${connectHint}`;
  }
  return sessionUrl === undefined
    ? `The cloud session couldn't start (${refusal.cause}). To see why, open this session from ${getOauthConfig().CLAUDE_AI_ORIGIN}/code`
    : `The cloud session couldn't start (${refusal.cause}). To see why, open: ${sessionUrl}`;
}
export { parseStartRefusal, describeStartRefusal, START_REFUSAL_NOTICE };
