/**
 * remote/remoteMode.ts
 *
 * 2.1.316 新增：远程模式状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fnk5kvbf.js (16)
 * attribution: placement 16
 */
import { AsyncLocalStorage } from "async_hooks";
import { getCaps, getIsRemoteMode } from "../bootstrap/state.js";
import { Mn } from "../utils/pathClassification.js";
import { gl, getCurrentCallFrame, Ido } from "../utils/cwd.js";

/**
 * 各远程传输方式（ccr / ssh / direct）支持的能力表：控制通道、模型目录、设置权限模式、会话记录、扇出、在线状态、追赶回放、bash 执行、文件读取、立即发送、送达回执。
 */
//@ chunk-fnk5kvbf.js:345-869 placement
var REMOTE_TRANSPORT_CAPS = {
  ccr: {
    controlChannel: !0,
    modelCatalog: !0,
    setPermissionMode: !0,
    sessionRecord: !0,
    fanout: !0,
    presence: !0,
    catchupReplay: !0,
    bashExec: !0,
    fileRead: !0,
    sendNow: !0,
    deliveryReports: !0,
  },
  ssh: {
    controlChannel: !0,
    modelCatalog: !0,
    setPermissionMode: !0,
    sessionRecord: !1,
    fanout: !1,
    presence: !1,
    catchupReplay: !1,
    bashExec: !1,
    fileRead: !0,
    sendNow: !1,
    deliveryReports: !1,
  },
  direct: {
    controlChannel: !1,
    modelCatalog: !1,
    setPermissionMode: !1,
    sessionRecord: !1,
    fanout: !1,
    presence: !1,
    catchupReplay: !1,
    bashExec: !1,
    fileRead: !1,
    sendNow: !1,
    deliveryReports: !1,
  },
};
//@ chunk-fnk5kvbf.js:869-895 placement
var Rdo = { isRemoteMode: !1 };
//@ chunk-fnk5kvbf.js:895-928 placement
function Jn() {
  return getCaps().remote;
}
//@ chunk-fnk5kvbf.js:928-1013 placement
var cwr = "Stopped waiting for the remote \u2014 the command may still complete there";
//@ chunk-fnk5kvbf.js:1013-1052 placement
function wt() {
  return getIsRemoteMode() || Jn() !== null;
}
//@ chunk-fnk5kvbf.js:1052-1086 placement
function IMe(e, n) {
  return wt() ? n : e;
}
//@ chunk-fnk5kvbf.js:1086-1117 placement
function ml() {
  return r_s(Jn());
}
//@ chunk-fnk5kvbf.js:1117-1184 placement
function r_s(e) {
  return e?.caps?.controlChannel === !0 && !e.viewerOnly;
}
//@ chunk-fnk5kvbf.js:1184-1208 placement
function uwr() {
  return !1;
}
//@ chunk-fnk5kvbf.js:1208-1251 placement
function _C(e) {
  return Jn()?.caps?.[e] === !0;
}
//@ chunk-fnk5kvbf.js:1251-1311 placement
function xdo(e, n) {
  return n && !(e.isRemoteMode && e.viewerOnly);
}
//@ chunk-fnk5kvbf.js:1311-1409 placement
function m(e) {
  return Promise.reject(Error(`sendControlRequest not yet wired for ${e} transport`));
}
/**
 * 构造远程模式句柄：kind、只读查看、能力表、会话 id，并把传输的 send/cancel/disconnect 等方法带上默认实现；非远程模式返回固定的本地句柄。
 */
//@ chunk-fnk5kvbf.js:1409-1936 placement
function createRemoteModeHandle(e, n, o, r, l = !1) {
  if (!n.isRemoteMode) return Rdo;
  return {
    kind: e,
    isRemoteMode: !0,
    viewerOnly: o,
    caps: REMOTE_TRANSPORT_CAPS[e],
    sessionId: r,
    ...(l && { consoleProfileBearer: l }),
    sendMessage: n.sendMessage,
    cancelRequest: n.cancelRequest,
    cancelHeldMessages: n.cancelHeldMessages ?? (() => !1),
    sendQueuedNow: n.sendQueuedNow ?? (() => Promise.resolve("failed")),
    workerSendsNow: n.workerSendsNow ?? (() => !1),
    serviceTimeMs:
      n.serviceTimeMs ??
      (() => {
        return;
      }),
    holdsSends: n.holdsSends ?? (() => !1),
    disconnect: n.disconnect,
    sendControlRequest: n.sendControlRequest ?? (() => m(e)),
    ...!1,
  };
}
//@ chunk-fnk5kvbf.js:1936-1948 placement
var s = new AsyncLocalStorage();
//@ chunk-fnk5kvbf.js:1948-1993 placement
function Yg(e, n) {
  return s.run({ cwd: Mn(e) }, n);
}
/**
 * 在远程工作目录存在时，把回调放进新的调用帧（记录外层帧、物理路径、是否可在目录消失后恢复）中执行，结束后标记帧已结束。
 */
//@ chunk-fnk5kvbf.js:1993-2273 placement
async function runInRemoteCallFrame(e, { recoversIfAlreadyGone: n } = { recoversIfAlreadyGone: !1 }) {
  let o = gl();
  if (o === null) return e();
  let r = getCurrentCallFrame(),
    l = {
      outer: r,
      isOver: !1,
      physical: Ido(o),
      recoversIfAlreadyGone: n && r?.call?.recoversIfAlreadyGone !== !1,
    };
  try {
    return await s.run({ cwd: o, call: l }, e);
  } finally {
    l.isOver = !0;
  }
}

export { Jn, ml, wt, _C, cwr, createRemoteModeHandle, Rdo, xdo, uwr, r_s, Yg, s, IMe, runInRemoteCallFrame };
