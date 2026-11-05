/**
 * services/mcp/appToolServerErrors.ts
 *
 * 2.1.316 新增：应用工具服务器错误。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-23q3t14y.js (4)
 * attribution: placement 4
 */
import { HEARTHBOT } from "./ccrMetaMcp.js";
import { env } from "../../utils/env.js";

//@ chunk-23q3t14y.js:262-329 placement
/**
 * 判断是否为需要隐藏名字的 hearthbot 回复服务器。
 */
function isHiddenReplyServer(serverName) {
  return serverName === HEARTHBOT && env.CLAUDE_CODE_HIDE_REPLY_SERVER_NAME;
}
//@ chunk-23q3t14y.js:329-2994 placement
/**
 * 应用自带工具服务器不可用时给模型的说明（按 needs_auth/failed/failed_for_session/failed_retrying/disconnected 区分），要求不要向用户提及该服务器、尽量继续完成请求。
 */
function appToolServerUnavailableText(kind) {
  switch (kind) {
    case "needs_auth":
      return "The app's own tool server could not sign in, so its tools, including the ones you reply with, are unavailable. This is a problem on the app's side that the user cannot fix, so do not name this server or describe its failure, and do not ask them to reconnect, sign in to, authorize or retry it. Carry on with the request as far as you can. If the problem keeps you from doing what they asked, say in plain words that something went wrong on our end, and nothing more about it.";
    case "failed":
      return "The app's own tool server failed to connect, so its tools, including the ones you reply with, are unavailable. This is a problem on the app's side that the user cannot fix, so do not name this server or describe its failure, and do not ask them to reconnect, sign in to, authorize or retry it. Carry on with the request as far as you can. If the problem keeps you from doing what they asked, say in plain words that something went wrong on our end, and nothing more about it.";
    case "failed_for_session":
      return "The app's own tool server failed to connect, so its tools, including the ones you reply with, are unavailable for this session. This is a problem on the app's side that the user cannot fix, so do not name this server or describe its failure, and do not ask them to reconnect, sign in to, authorize or retry it. Carry on with the request as far as you can. If the problem keeps you from doing what they asked, say in plain words that something went wrong on our end, and nothing more about it.";
    case "failed_retrying":
      return "The app's own tool server failed to connect, so its tools, including the ones you reply with, are unavailable for now. The session retries the server on its own, so its tools may come back later. This is a problem on the app's side that the user cannot fix, so do not name this server or describe its failure, and do not ask them to reconnect, sign in to, authorize or retry it. Carry on with the request as far as you can. If the problem keeps you from doing what they asked, say in plain words that something went wrong on our end, and nothing more about it.";
    case "disconnected":
      return "The app's own tool server has disconnected, so its tools, including the ones you reply with, are unavailable unless it reconnects. This is a problem on the app's side that the user cannot fix, so do not name this server or describe its failure, and do not ask them to reconnect, sign in to, authorize or retry it. Carry on with the request as far as you can. If the problem keeps you from doing what they asked, say in plain words that something went wrong on our end, and nothing more about it.";
  }
}
//@ chunk-23q3t14y.js:2994-3133 placement
/**
 * 应用自身工具服务器无法访问时的提示文案（应用侧问题，无需登录或重连）。
 */
var APP_TOOL_ACCESS_FAILED_TEXT =
  "The app could not get access to one of its own tools. This is a problem on the app's side. No sign-in or reconnection is needed.";
//@ chunk-23q3t14y.js:3133-3347 placement
/**
 * 应用自身工具服务器需要认证或断开时附加到工具错误后的说明。
 */
function appToolServerErrorSuffix(availability, hiddenReply) {
  if (
    (availability.kind !== "needs_auth" && availability.kind !== "disconnected") ||
    !isHiddenReplyServer(availability.serverName)
  )
    return;
  return hiddenReply
    ? ". The app's own tool server is not available in this context. Continue without this tool."
    : `. ${appToolServerUnavailableText(availability.kind)}`;
}
export {
  isHiddenReplyServer,
  appToolServerUnavailableText,
  appToolServerErrorSuffix,
  APP_TOOL_ACCESS_FAILED_TEXT,
};
