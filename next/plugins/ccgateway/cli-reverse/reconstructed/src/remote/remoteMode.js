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
import { identity } from "../utils/pathClassification.js";
import { getCwdOrNull, getCurrentCallFrame, realPathOutcomeSync } from "../utils/cwd.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-fnk5kvbf.js:345-869 placement
/**
 * 各远程传输方式（ccr / ssh / direct）支持的能力表：控制通道、模型目录、设置权限模式、会话记录、扇出、在线状态、追赶回放、bash 执行、文件读取、立即发送、送达回执。
 */
var REMOTE_TRANSPORT_CAPS = {
  ccr: {
    controlChannel: true,
    modelCatalog: true,
    setPermissionMode: true,
    sessionRecord: true,
    fanout: true,
    presence: true,
    catchupReplay: true,
    bashExec: true,
    fileRead: true,
    sendNow: true,
    deliveryReports: true,
  },
  ssh: {
    controlChannel: true,
    modelCatalog: true,
    setPermissionMode: true,
    sessionRecord: false,
    fanout: false,
    presence: false,
    catchupReplay: false,
    bashExec: false,
    fileRead: true,
    sendNow: false,
    deliveryReports: false,
  },
  direct: {
    controlChannel: false,
    modelCatalog: false,
    setPermissionMode: false,
    sessionRecord: false,
    fanout: false,
    presence: false,
    catchupReplay: false,
    bashExec: false,
    fileRead: false,
    sendNow: false,
    deliveryReports: false,
  },
};
//@ chunk-fnk5kvbf.js:869-895 placement
/**
 * 远程模式句柄的判定与回退：远程能力表、是否可控制通道、能力探测，以及本地模式下的固定句柄。
 */
var LOCAL_MODE_HANDLE = {
  isRemoteMode: false,
};
//@ chunk-fnk5kvbf.js:895-928 placement
/**
 * 导出函数 `getRemoteCaps`：返回 getCaps().remote。
 */
function getRemoteCaps() {
  return getCaps().remote;
}
//@ chunk-fnk5kvbf.js:928-1013 placement
/**
 * 导出常量或表 `REMOTE_STOPPED_WAITING_NOTICE`：值为 "Stopped waiting for the remote \u2014 the command may still complete there"。
 */
var REMOTE_STOPPED_WAITING_NOTICE =
  "Stopped waiting for the remote \u2014 the command may still complete there";
//@ chunk-fnk5kvbf.js:1013-1052 placement
/**
 * 导出函数 `isRemoteSessionAvailable`：返回 getIsRemoteMode() || Jn() !== null。
 */
function isRemoteSessionAvailable() {
  return getIsRemoteMode() || getRemoteCaps() !== null;
}
//@ chunk-fnk5kvbf.js:1052-1086 placement
/**
 * 导出函数 `preferRemoteValue`：参数 e, n，返回 wt() ? n : e。
 */
function preferRemoteValue(cwd, originalCwd) {
  return isRemoteSessionAvailable() ? originalCwd : cwd;
}
//@ chunk-fnk5kvbf.js:1086-1117 placement
/**
 * 导出函数 `isRemoteControlChannelAvailable`：返回 r_s(Jn())。
 */
function isRemoteControlChannelAvailable() {
  return hasRemoteControlChannel(getRemoteCaps());
}
//@ chunk-fnk5kvbf.js:1117-1184 placement
/**
 * 导出函数 `hasRemoteControlChannel`：参数 e，返回 e?.caps?.controlChannel === !0 && !e.viewerOnly。
 */
function hasRemoteControlChannel(handle) {
  return handle?.caps?.controlChannel === true && !handle.viewerOnly;
}
//@ chunk-fnk5kvbf.js:1184-1208 placement
/**
 * 导出函数 `alwaysFalseRemoteMode`：返回 !1。
 */
function alwaysFalseRemoteMode() {
  return false;
}
//@ chunk-fnk5kvbf.js:1208-1251 placement
/**
 * 导出函数 `hasRemoteCap`：参数 e，返回 Jn()?.caps?.[e] === !0。
 */
function hasRemoteCap(cap) {
  return getRemoteCaps()?.caps?.[cap] === true;
}
//@ chunk-fnk5kvbf.js:1251-1311 placement
/**
 * 导出函数 `canUseRemoteFeature`：参数 e, n，返回 n && !(e.isRemoteMode && e.viewerOnly)。
 */
function canUseRemoteFeature(handle, enabled) {
  return enabled && !(handle.isRemoteMode && handle.viewerOnly);
}
//@ chunk-fnk5kvbf.js:1311-1409 placement
function rejectUnwiredTransport(transport) {
  return Promise.reject(Error(`sendControlRequest not yet wired for ${transport} transport`));
}
//@ chunk-fnk5kvbf.js:1409-1936 placement
/**
 * 构造远程模式句柄：kind、只读查看、能力表、会话 id，并把传输的 send/cancel/disconnect 等方法带上默认实现；非远程模式返回固定的本地句柄。
 */
function createRemoteModeHandle(kind, transport, viewerOnly, sessionId, ccrConsoleProfileBearer = false) {
  if (!transport.isRemoteMode) return LOCAL_MODE_HANDLE;
  return {
    kind,
    isRemoteMode: true,
    viewerOnly,
    caps: REMOTE_TRANSPORT_CAPS[kind],
    sessionId,
    ...(ccrConsoleProfileBearer && {
      consoleProfileBearer: ccrConsoleProfileBearer,
    }),
    sendMessage: transport.sendMessage,
    cancelRequest: transport.cancelRequest,
    cancelHeldMessages: transport.cancelHeldMessages ?? (() => false),
    sendQueuedNow: transport.sendQueuedNow ?? (() => Promise.resolve("failed")),
    workerSendsNow: transport.workerSendsNow ?? (() => false),
    serviceTimeMs:
      transport.serviceTimeMs ??
      (() => {
        return;
      }),
    holdsSends: transport.holdsSends ?? (() => false),
    disconnect: transport.disconnect,
    sendControlRequest: transport.sendControlRequest ?? (() => rejectUnwiredTransport(kind)),
    ...false,
  };
}
//@ chunk-fnk5kvbf.js:1936-1948 placement
var remoteCallFrameStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fnk5kvbf.js:1936", () => {
  remoteCallFrameStorage = new AsyncLocalStorage();
});
//@ chunk-fnk5kvbf.js:1948-1993 placement
/**
 * 导出函数 `runInRemoteCallFrameMain`：参数 e, n，返回 s.run({ cwd: Mn(e) }, n)。
 */
function runInRemoteCallFrameMain(cwd, fn) {
  return remoteCallFrameStorage.run(
    {
      cwd: identity(cwd),
    },
    fn,
  );
}
//@ chunk-fnk5kvbf.js:1993-2273 placement
/**
 * 在远程工作目录存在时，把回调放进新的调用帧（记录外层帧、物理路径、是否可在目录消失后恢复）中执行，结束后标记帧已结束。
 */
async function runInRemoteCallFrame(
  fn,
  { recoversIfAlreadyGone } = {
    recoversIfAlreadyGone: false,
  },
) {
  let path = getCwdOrNull();
  if (path === null) return fn();
  let currentCallFrame = getCurrentCallFrame();
  let call = {
    outer: currentCallFrame,
    isOver: false,
    physical: realPathOutcomeSync(path),
    recoversIfAlreadyGone: recoversIfAlreadyGone && currentCallFrame?.call?.recoversIfAlreadyGone !== false,
  };
  try {
    return await remoteCallFrameStorage.run(
      {
        cwd: path,
        call,
      },
      fn,
    );
  } finally {
    call.isOver = true;
  }
}
export {
  getRemoteCaps,
  isRemoteControlChannelAvailable,
  isRemoteSessionAvailable,
  hasRemoteCap,
  REMOTE_STOPPED_WAITING_NOTICE,
  createRemoteModeHandle,
  LOCAL_MODE_HANDLE,
  canUseRemoteFeature,
  alwaysFalseRemoteMode,
  hasRemoteControlChannel,
  runInRemoteCallFrameMain,
  remoteCallFrameStorage,
  preferRemoteValue,
  runInRemoteCallFrame,
};
