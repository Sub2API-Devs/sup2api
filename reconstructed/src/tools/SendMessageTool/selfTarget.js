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
import { d8, pds, Zxn, slugifySessionName } from "../../utils/sessionAddresses.js";
import { sessionIdBody } from "../../bridge/sessionIdCompat.js";
import { getPeerBridgeIdentity } from "../../bridge/replBridgeHandle.js";
import { ownRemoteSessionId } from "../../utils/remoteSessionEnv.js";
import { isNonMainSessionSubagent } from "../../utils/agentContext.js";

/**
 * 目标是本会话自身时的原因，以及"用 main 联系主对话"的提示。
 */
//@ chunk-gx686msx.js:432-556 placement
var SELF_TARGET_REASON = "target is this session itself \u2014 there is no one else to send to",
  ADDRESS_MAIN_HINT = `address the main conversation as "${MAIN}"`;
/**
 * 判断 socket 路径是否为本会话的消息 socket。
 */
//@ chunk-gx686msx.js:556-663 placement
function isOwnSocket(e) {
  let { ownMessagingSocket: ownMessagingSocket } = require("./chunk-ewxn4535.js"),
    n = ownMessagingSocket();
  return n !== void 0 && isSamePath(e, n);
}
/**
 * 判断 socket 路径是否可能是本会话的消息 socket（宽松比较）。
 */
//@ chunk-gx686msx.js:663-770 placement
function mayBeOwnSocket(e) {
  let { ownMessagingSocket: ownMessagingSocket } = require("./chunk-ewxn4535.js"),
    n = ownMessagingSocket();
  return n !== void 0 && mayBeSamePath(e, n);
}
//@ chunk-gx686msx.js:770-897 placement
function isOwnRefToken(e) {
  let { ownMessagingSocket: ownMessagingSocket } = require("./chunk-ewxn4535.js"),
    n = ownMessagingSocket(),
    t = d8(e);
  return n !== void 0 && t !== null && pds(t.ref, n);
}
//@ chunk-gx686msx.js:897-936 placement
function Zsn(e, s) {
  return isOwnRefToken(e) && !isOwnSocket(s);
}
/**
 * 本会话的名字与 ref 被另一会话记录冒用时的拒绝说明。
 */
//@ chunk-gx686msx.js:936-1221 placement
function impersonatedSelfMessage(e) {
  return `'${e}' is the name-and-ref token this session advertises for ITSELF, yet a different session record on this machine claims it \u2014 not sent. A record impersonating this session is suspicious: ask the user. (If you meant yourself, there is no one to send to.)`;
}
/**
 * 上述冒用情况的简短拒绝说明。
 */
//@ chunk-gx686msx.js:1221-1358 placement
function impersonatedSelfShortMessage(e) {
  return `Not sent \u2014 '${e}' is this session's own name and ref, but another session record on this machine claims it.`;
}
/**
 * 目标是本会话自身地址时的拒绝说明。
 */
//@ chunk-gx686msx.js:1358-1547 placement
function ownAddressMessage(e) {
  return `'${e}' is this session's own address \u2014 a message or file sent there would only come back to this conversation; there is no one else at that address to send to.`;
}
/**
 * 判断会话 id 是否为本会话的 bridge 会话。
 */
//@ chunk-gx686msx.js:1547-1654 placement
function isOwnBridgeSession(e) {
  let s = sessionIdBody(e);
  return [getPeerBridgeIdentity()?.bridgeSessionId, ownRemoteSessionId()].some(
    (n) => typeof n === "string" && sessionIdBody(n) === s,
  );
}
//@ chunk-gx686msx.js:1654-1749 placement
function WL(e) {
  return (
    e.teammateContext !== void 0 || (e.agentContext !== void 0 && isNonMainSessionSubagent(e.agentContext))
  );
}
//@ chunk-gx686msx.js:1749-1824 placement
function $ht(e) {
  return `Not sent \u2014 '${e}' is this session's own name.`;
}
/**
 * 生成"该名字也指向本会话"的附加说明：主会话中提示如何联系主对话，否则说明没有其他收件人。
 */
//@ chunk-gx686msx.js:1824-2203 placement
function selfAliasNote(e, s, n = ADDRESS_MAIN_HINT) {
  let { getRegisteredSessionName: getRegisteredSessionName } = require("./chunk-gtq2y7h2.js"),
    o = Zxn(getRegisteredSessionName()?.name),
    i = o === null ? "this session" : `this session ("${o}")`;
  return s
    ? `
('${e}' also addresses ${i} \u2014 this process's main session; to reach the main conversation from inside it, ${n}.)`
    : `
('${e}' also addresses ${i} itself \u2014 if you meant yourself, there is no one to send to.)`;
}
/**
 * 判断会话搜索是否完整（各来源可用、未截断、固定身份未被本地认领）。
 */
//@ chunk-gx686msx.js:2203-2341 placement
function isSearchComplete(e) {
  return (
    !e.cloudUnavailable &&
    !e.bridgeUnavailable &&
    !e.localUnavailable &&
    !e.searchTruncated &&
    !e.pinnedIdentityClaimedLocally
  );
}
/**
 * 判断目标名是否指向本会话自身：比较注册名、持有的旧名与 name [ref] 中的 ref，返回 no / note（仅提示）/ categorical（视为自身，拒绝发送）。
 */
//@ chunk-gx686msx.js:2341-2963 placement
function classifySelfName(e) {
  let {
      getRegisteredSessionName: getRegisteredSessionName,
      getHeldSessionNames: getHeldSessionNames,
    } = require("./chunk-gtq2y7h2.js"),
    { ownMessagingSocket: ownMessagingSocket } = require("./chunk-ewxn4535.js"),
    o = getRegisteredSessionName(),
    i = ownMessagingSocket();
  if (o === void 0 || i === void 0 || parseAddress(e).scheme !== "other") return "no";
  let r = d8(e);
  if (r !== null) {
    let a = slugifySessionName(r.name);
    if (!pds(r.ref, i)) return "no";
    if (a !== slugifySessionName(o.name)) {
      let c = getHeldSessionNames().get(a);
      if (c === void 0) return "no";
      return c === "derived" ? "categorical" : "note";
    }
  } else if (slugifySessionName(e) !== slugifySessionName(o.name)) return "no";
  let { getSessionNamingState: getSessionNamingState } = require("./chunk-e0m6m52p.js");
  return o.source === "derived" ||
    ((o.source === "user" || o.source === "collision") && getSessionNamingState().userTypedName === o.name)
    ? "categorical"
    : "note";
}
/**
 * 生成目标就是本会话自身时的拒绝说明（区分本进程主会话与会话自身，附带其他会话使用的名字）。
 */
//@ chunk-gx686msx.js:2963-3473 placement
function selfTargetMessage(e, s, n = ADDRESS_MAIN_HINT) {
  let { getRegisteredSessionName: getRegisteredSessionName } = require("./chunk-gtq2y7h2.js"),
    o = Zxn(getRegisteredSessionName()?.name);
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
  WL,
  SELF_TARGET_REASON,
  mayBeOwnSocket,
  $ht,
  isOwnSocket,
  Zsn,
  impersonatedSelfMessage,
  impersonatedSelfShortMessage,
  classifySelfName,
  isSearchComplete,
  selfAliasNote,
  ownAddressMessage,
};
