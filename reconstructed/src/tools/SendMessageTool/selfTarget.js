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

//@ chunk-gx686msx.js:432-556 placement
/**
 * 目标是本会话自身时的原因，以及"用 main 联系主对话"的提示。
 */
var SELF_TARGET_REASON = "target is this session itself \u2014 there is no one else to send to";
var ADDRESS_MAIN_HINT = `address the main conversation as "${MAIN}"`;
//@ chunk-gx686msx.js:556-663 placement
/**
 * 判断 socket 路径是否为本会话的消息 socket。
 */
function isOwnSocket(sock) {
  let { ownMessagingSocket } = require("./chunk-ewxn4535.js");
  let n = ownMessagingSocket();
  return n !== undefined && isSamePath(sock, n);
}
//@ chunk-gx686msx.js:663-770 placement
/**
 * 判断 socket 路径是否可能是本会话的消息 socket（宽松比较）。
 */
function mayBeOwnSocket(e) {
  let { ownMessagingSocket } = require("./chunk-ewxn4535.js");
  let n = ownMessagingSocket();
  return n !== undefined && mayBeSamePath(e, n);
}
//@ chunk-gx686msx.js:770-897 placement
function isOwnRefToken(e) {
  let { ownMessagingSocket } = require("./chunk-ewxn4535.js");
  let n = ownMessagingSocket();
  let nameWithRef = parseNameWithRef(e);
  return n !== undefined && nameWithRef !== null && isSessionAddressUnder(nameWithRef.ref, n);
}
//@ chunk-gx686msx.js:897-936 placement
/**
 * 判断本会话的 ref 是否被另一会话的记录冒用。
 */
function isImpersonatedOwnRef(e, sock) {
  return isOwnRefToken(e) && !isOwnSocket(sock);
}
//@ chunk-gx686msx.js:936-1221 placement
/**
 * 本会话的名字与 ref 被另一会话记录冒用时的拒绝说明。
 */
function impersonatedSelfMessage(e) {
  return `'${e}' is the name-and-ref token this session advertises for ITSELF, yet a different session record on this machine claims it \u2014 not sent. A record impersonating this session is suspicious: ask the user. (If you meant yourself, there is no one to send to.)`;
}
//@ chunk-gx686msx.js:1221-1358 placement
/**
 * 上述冒用情况的简短拒绝说明。
 */
function impersonatedSelfShortMessage(e) {
  return `Not sent \u2014 '${e}' is this session's own name and ref, but another session record on this machine claims it.`;
}
//@ chunk-gx686msx.js:1358-1547 placement
/**
 * 目标是本会话自身地址时的拒绝说明。
 */
function ownAddressMessage(e) {
  return `'${e}' is this session's own address \u2014 a message or file sent there would only come back to this conversation; there is no one else at that address to send to.`;
}
//@ chunk-gx686msx.js:1547-1654 placement
/**
 * 判断会话 id 是否为本会话的 bridge 会话。
 */
function isOwnBridgeSession(e) {
  let s = sessionIdBody(e);
  return [getPeerBridgeIdentity()?.bridgeSessionId, ownRemoteSessionId()].some(
    (n) => typeof n === "string" && sessionIdBody(n) === s,
  );
}
//@ chunk-gx686msx.js:1654-1749 placement
/**
 * 判断是否为队友上下文，或非主会话的子代理上下文。
 */
function isTeammateOrSubagentContext(deps) {
  return (
    deps.teammateContext !== undefined ||
    (deps.agentContext !== undefined && isNonMainSessionSubagent(deps.agentContext))
  );
}
//@ chunk-gx686msx.js:1749-1824 placement
/**
 * 生成“该名字是本会话自己的名字，故未发送”的说明。
 */
function ownNameNotSentText(e) {
  return `Not sent \u2014 '${e}' is this session's own name.`;
}
//@ chunk-gx686msx.js:1824-2203 placement
/**
 * 生成"该名字也指向本会话"的附加说明：主会话中提示如何联系主对话，否则说明没有其他收件人。
 */
function selfAliasNote(e, s, n = ADDRESS_MAIN_HINT) {
  let { getRegisteredSessionName } = require("./chunk-gtq2y7h2.js");
  let o = plainSessionName(getRegisteredSessionName()?.name);
  let i = o === null ? "this session" : `this session ("${o}")`;
  return s
    ? `
('${e}' also addresses ${i} \u2014 this process's main session; to reach the main conversation from inside it, ${n}.)`
    : `
('${e}' also addresses ${i} itself \u2014 if you meant yourself, there is no one to send to.)`;
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
function classifySelfName(e) {
  let { getRegisteredSessionName, getHeldSessionNames } = require("./chunk-gtq2y7h2.js");
  let { ownMessagingSocket } = require("./chunk-ewxn4535.js");
  let registeredSessionName = getRegisteredSessionName();
  let i = ownMessagingSocket();
  if (registeredSessionName === undefined || i === undefined || parseAddress(e).scheme !== "other")
    return "no";
  let nameWithRef = parseNameWithRef(e);
  if (nameWithRef !== null) {
    let a = slugifySessionName(nameWithRef.name);
    if (!isSessionAddressUnder(nameWithRef.ref, i)) return "no";
    if (a !== slugifySessionName(registeredSessionName.name)) {
      let c = getHeldSessionNames().get(a);
      if (c === undefined) return "no";
      return c === "derived" ? "categorical" : "note";
    }
  } else if (slugifySessionName(e) !== slugifySessionName(registeredSessionName.name)) return "no";
  let { getSessionNamingState } = require("./chunk-e0m6m52p.js");
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
function selfTargetMessage(e, s, n = ADDRESS_MAIN_HINT) {
  let { getRegisteredSessionName } = require("./chunk-gtq2y7h2.js");
  let o = plainSessionName(getRegisteredSessionName()?.name);
  if (s) {
    let i = o !== null ? ` ("${o}" is the name OTHER sessions use for it)` : "";
    return `'${e}' is this process's own main session${i} \u2014 from inside it, ${n} instead.`;
  }
  return o !== null
    ? `'${e}' is this session itself \u2014 "${o}" is the name other sessions use to message YOU; there is no one else by that name to send to.`
    : `'${e}' is this session itself \u2014 there is no one else at that address to send to.`;
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
