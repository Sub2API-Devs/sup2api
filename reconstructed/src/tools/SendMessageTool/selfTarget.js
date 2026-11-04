/**
 * tools/SendMessageTool/selfTarget.ts
 *
 * 2.1.316 新增：SendMessage 发给自己时的处理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gx686msx.js (15)
 * attribution: placement 15
 */
import { MAIN } from "../../utils/sessionPeers.js";
import { isSamePath, mayBeSamePath, parseAddress } from "../../utils/peerAddress.js";
import {
  parseNameWithRef,
  isSessionAddressUnder,
  plainSessionName,
  slugifySessionName,
} from "../../utils/sessionAddresses.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { getPeerBridgeIdentity } from "../../bridge/replBridgeHandle.js";
import { ownRemoteSessionId } from "../../utils/remoteSessionEnv.js";
import { isNonMainSessionSubagent } from "../../utils/agentContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gx686msx.js:432-556 placement
/**
 * 目标是本会话自身时的原因，以及"用 main 联系主对话"的提示。
 */
var SELF_TARGET_REASON; // deferred: uses MAIN (../../utils/sessionPeers.js) of its import cycle while loading; runs once the cycle is complete
var ADDRESS_MAIN_HINT;
deferInit("chunk-gx686msx.js:432", () => {
  SELF_TARGET_REASON = "target is this session itself \u2014 there is no one else to send to";
  ADDRESS_MAIN_HINT = `address the main conversation as "${MAIN}"`;
});
//@ chunk-gx686msx.js:556-663 placement
/**
 * 判断 socket 路径是否为本会话的消息 socket。
 */
function isOwnSocket(sock) {
  let { ownMessagingSocket } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
  let ownSocket = ownMessagingSocket();
  return ownSocket !== undefined && isSamePath(sock, ownSocket);
}
//@ chunk-gx686msx.js:663-770 placement
/**
 * 判断 socket 路径是否可能是本会话的消息 socket（宽松比较）。
 */
function mayBeOwnSocket(sock) {
  let { ownMessagingSocket } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
  let ownSocket = ownMessagingSocket();
  return ownSocket !== undefined && mayBeSamePath(sock, ownSocket);
}
//@ chunk-gx686msx.js:770-897 placement
function isOwnRefToken(addressText) {
  let { ownMessagingSocket } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
  let ownSocket = ownMessagingSocket();
  let nameWithRef = parseNameWithRef(addressText);
  return ownSocket !== undefined && nameWithRef !== null && isSessionAddressUnder(nameWithRef.ref, ownSocket);
}
//@ chunk-gx686msx.js:897-936 placement
/**
 * 判断本会话的 ref 是否被另一会话的记录冒用。
 */
function isImpersonatedOwnRef(addressText, sock) {
  return isOwnRefToken(addressText) && !isOwnSocket(sock);
}
//@ chunk-gx686msx.js:936-1221 placement
/**
 * 本会话的名字与 ref 被另一会话记录冒用时的拒绝说明。
 */
function impersonatedSelfMessage(addressText) {
  return `'${addressText}' is the name-and-ref token this session advertises for ITSELF, yet a different session record on this machine claims it \u2014 not sent. A record impersonating this session is suspicious: ask the user. (If you meant yourself, there is no one to send to.)`;
}
//@ chunk-gx686msx.js:1221-1358 placement
/**
 * 上述冒用情况的简短拒绝说明。
 */
function impersonatedSelfShortMessage(addressText) {
  return `Not sent \u2014 '${addressText}' is this session's own name and ref, but another session record on this machine claims it.`;
}
//@ chunk-gx686msx.js:1358-1547 placement
/**
 * 目标是本会话自身地址时的拒绝说明。
 */
function ownAddressMessage(addressText) {
  return `'${addressText}' is this session's own address \u2014 a message or file sent there would only come back to this conversation; there is no one else at that address to send to.`;
}
//@ chunk-gx686msx.js:1547-1654 placement
/**
 * 判断会话 id 是否为本会话的 bridge 会话。
 */
function isOwnBridgeSession(sessionId) {
  let body = sessionIdBody(sessionId);
  return [getPeerBridgeIdentity()?.bridgeSessionId, ownRemoteSessionId()].some(
    (ownId) => typeof ownId === "string" && sessionIdBody(ownId) === body,
  );
}
//@ chunk-gx686msx.js:1654-1749 placement
/**
 * 判断是否为队友上下文，或非主会话的子代理上下文。
 */
function isTeammateOrSubagentContext(context) {
  return (
    context.teammateContext !== undefined ||
    (context.agentContext !== undefined && isNonMainSessionSubagent(context.agentContext))
  );
}
//@ chunk-gx686msx.js:1749-1824 placement
/**
 * 生成“该名字是本会话自己的名字，故未发送”的说明。
 */
function ownNameNotSentText(addressText) {
  return `Not sent \u2014 '${addressText}' is this session's own name.`;
}
//@ chunk-gx686msx.js:1824-2203 placement
/**
 * 生成"该名字也指向本会话"的附加说明：主会话中提示如何联系主对话，否则说明没有其他收件人。
 */
function selfAliasNote(addressText, isMainSession, mainHint = ADDRESS_MAIN_HINT) {
  let { getRegisteredSessionName } = require("../../utils/concurrentSessions.js");
  let registeredName = plainSessionName(getRegisteredSessionName()?.name);
  let sessionLabel = registeredName === null ? "this session" : `this session ("${registeredName}")`;
  return isMainSession
    ? `
('${addressText}' also addresses ${sessionLabel} \u2014 this process's main session; to reach the main conversation from inside it, ${mainHint}.)`
    : `
('${addressText}' also addresses ${sessionLabel} itself \u2014 if you meant yourself, there is no one to send to.)`;
}
//@ chunk-gx686msx.js:2203-2341 placement
/**
 * 判断会话搜索是否完整（各来源可用、未截断、固定身份未被本地认领）。
 */
function isSearchComplete(resolvedRecipient) {
  return (
    !resolvedRecipient.cloudUnavailable &&
    !resolvedRecipient.bridgeUnavailable &&
    !resolvedRecipient.localUnavailable &&
    !resolvedRecipient.searchTruncated &&
    !resolvedRecipient.pinnedIdentityClaimedLocally
  );
}
//@ chunk-gx686msx.js:2341-2963 placement
/**
 * 判断目标名是否指向本会话自身：比较注册名、持有的旧名与 name [ref] 中的 ref，返回 no / note（仅提示）/ categorical（视为自身，拒绝发送）。
 */
function classifySelfName(nameText) {
  let { getRegisteredSessionName, getHeldSessionNames } = require("../../utils/concurrentSessions.js");
  let { ownMessagingSocket } = require("../../utils/udsMessaging/SessionRecordsUnreadableError.lazy.js");
  let registeredSessionName = getRegisteredSessionName();
  let ownSocket = ownMessagingSocket();
  if (
    registeredSessionName === undefined ||
    ownSocket === undefined ||
    parseAddress(nameText).scheme !== "other"
  )
    return "no";
  let nameWithRef = parseNameWithRef(nameText);
  if (nameWithRef !== null) {
    let refSlug = slugifySessionName(nameWithRef.name);
    if (!isSessionAddressUnder(nameWithRef.ref, ownSocket)) return "no";
    if (refSlug !== slugifySessionName(registeredSessionName.name)) {
      let heldKind = getHeldSessionNames().get(refSlug);
      if (heldKind === undefined) return "no";
      return heldKind === "derived" ? "categorical" : "note";
    }
  } else if (slugifySessionName(nameText) !== slugifySessionName(registeredSessionName.name)) return "no";
  let { getSessionNamingState } = require("../../utils/sessionNameUniqueness.js");
  return registeredSessionName.source === "derived" ||
    ((registeredSessionName.source === "user" || registeredSessionName.source === "collision") &&
      getSessionNamingState().userTypedName === registeredSessionName.name)
    ? "categorical"
    : "note";
}
//@ chunk-gx686msx.js:2963-3473 placement
/**
 * 生成目标就是本会话自身时的拒绝说明（区分本进程主会话与会话自身，附带其他会话使用的名字）。
 */
function selfTargetMessage(nameText, isMainSession, mainHint = ADDRESS_MAIN_HINT) {
  let { getRegisteredSessionName } = require("../../utils/concurrentSessions.js");
  let registeredName = plainSessionName(getRegisteredSessionName()?.name);
  if (isMainSession) {
    let nameNote =
      registeredName !== null ? ` ("${registeredName}" is the name OTHER sessions use for it)` : "";
    return `'${nameText}' is this process's own main session${nameNote} \u2014 from inside it, ${mainHint} instead.`;
  }
  return registeredName !== null
    ? `'${nameText}' is this session itself \u2014 "${registeredName}" is the name other sessions use to message YOU; there is no one else by that name to send to.`
    : `'${nameText}' is this session itself \u2014 there is no one else at that address to send to.`;
}
export {
  isOwnBridgeSession,
  selfTargetMessage,
  isTeammateOrSubagentContext,
  SELF_TARGET_REASON,
  mayBeOwnSocket,
  ownNameNotSentText,
  isOwnSocket,
  isImpersonatedOwnRef,
  impersonatedSelfMessage,
  impersonatedSelfShortMessage,
  classifySelfName,
  isSearchComplete,
  selfAliasNote,
  ownAddressMessage,
};
