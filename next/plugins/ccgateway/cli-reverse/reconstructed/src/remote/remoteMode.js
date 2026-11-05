/**
 * remote/remoteMode.ts
 *
 * 2.1.316 新增：远程模式状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sbrfdm61.js (16)
 * attribution: placement 16
 */
import { AsyncLocalStorage } from "async_hooks";
import { getCaps, getIsRemoteMode } from "../bootstrap/state.js";
import { identity as identity_2 } from "../utils/pathClassification.js";
import { getCwdOrNull, getCurrentCallFrame, realPathOutcomeSync } from "../utils/cwd.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-sbrfdm61.js:499-1023 placement
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
//@ chunk-sbrfdm61.js:1023-1049 placement
/**
 * 远程模式句柄的判定与回退：远程能力表、是否可控制通道、能力探测，以及本地模式下的固定句柄。
 */
var LOCAL_MODE_HANDLE = {
  isRemoteMode: false,
};
//@ chunk-sbrfdm61.js:1049-1082 placement
/**
 * 导出函数 `getRemoteCaps`：返回 getCaps().remote。
 */
function getRemoteCaps() {
  return getCaps().remote;
}
//@ chunk-sbrfdm61.js:1082-1167 placement
/**
 * 导出常量或表 `REMOTE_STOPPED_WAITING_NOTICE`：值为 "Stopped waiting for the remote \u2014 the command may still complete there"。
 */
var REMOTE_STOPPED_WAITING_NOTICE =
  "Stopped waiting for the remote \u2014 the command may still complete there";
//@ chunk-sbrfdm61.js:1167-1206 placement
/**
 * 导出函数 `isRemoteSessionAvailable`：返回 getIsRemoteMode() || Jn() !== null。
 */
function isRemoteSessionAvailable() {
  return getIsRemoteMode() || getRemoteCaps() !== null;
}
//@ chunk-sbrfdm61.js:1206-1240 placement
/**
 * 导出函数 `preferRemoteValue`：参数 e, n，返回 wt() ? n : e。
 */
function preferRemoteValue(cwd, originalCwd) {
  return isRemoteSessionAvailable() ? originalCwd : cwd;
}
//@ chunk-sbrfdm61.js:1240-1271 placement
/**
 * 导出函数 `isRemoteControlChannelAvailable`：返回 r_s(Jn())。
 */
function isRemoteControlChannelAvailable() {
  return hasRemoteControlChannel(getRemoteCaps());
}
//@ chunk-sbrfdm61.js:1271-1338 placement
/**
 * 导出函数 `hasRemoteControlChannel`：参数 e，返回 e?.caps?.controlChannel === !0 && !e.viewerOnly。
 */
function hasRemoteControlChannel(handle) {
  return handle?.caps?.controlChannel === true && !handle.viewerOnly;
}
//@ chunk-sbrfdm61.js:1338-1362 placement
/**
 * 导出函数 `alwaysFalseRemoteMode`：返回 !1。
 */
function alwaysFalseRemoteMode() {
  return false;
}
//@ chunk-sbrfdm61.js:1362-1405 placement
/**
 * 导出函数 `hasRemoteCap`：参数 e，返回 Jn()?.caps?.[e] === !0。
 */
function hasRemoteCap(cap) {
  return getRemoteCaps()?.caps?.[cap] === true;
}
//@ chunk-sbrfdm61.js:1405-1465 placement
/**
 * 导出函数 `canUseRemoteFeature`：参数 e, n，返回 n && !(e.isRemoteMode && e.viewerOnly)。
 */
function canUseRemoteFeature(handle, enabled) {
  return enabled && !(handle.isRemoteMode && handle.viewerOnly);
}
//@ chunk-sbrfdm61.js:1465-1563 placement
function rejectUnwiredTransport(transport) {
  return Promise.reject(Error(`sendControlRequest not yet wired for ${transport} transport`));
}
//@ chunk-sbrfdm61.js:1563-2090 placement
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
//@ chunk-sbrfdm61.js:2090-2116 placement
var remoteCallFrameStorage; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WALKED;
deferInit("chunk-sbrfdm61.js:2090", () => {
  remoteCallFrameStorage = new AsyncLocalStorage();
  WALKED = "walked:";
});
//@ chunk-sbrfdm61.js:2116-2161 placement
/**
 * 导出函数 `runInRemoteCallFrameMain`：参数 e, n，返回 s.run({ cwd: Mn(e) }, n)。
 */
function runInRemoteCallFrameMain(cwd, fn) {
  return remoteCallFrameStorage.run(
    {
      cwd: identity_2(cwd),
    },
    fn,
  );
}
//@ chunk-sbrfdm61.js:2161-2441 placement
/**
 * 在远程工作目录存在时，把回调放进新的调用帧（记录外层帧、物理路径、是否可在目录消失后恢复）中执行，结束后标记帧已结束。
 */
async function runInRemoteCallFrame(
  fn,
  { recoversIfAlreadyGone } = {
    recoversIfAlreadyGone: false,
  },
) {
  let cwdOrNull = getCwdOrNull();
  if (cwdOrNull === null) return fn();
  let currentCallFrame = getCurrentCallFrame();
  let call = {
    outer: currentCallFrame,
    isOver: false,
    physical: realPathOutcomeSync(cwdOrNull),
    recoversIfAlreadyGone: recoversIfAlreadyGone && currentCallFrame?.call?.recoversIfAlreadyGone !== false,
  };
  try {
    return await remoteCallFrameStorage.run(
      {
        cwd: cwdOrNull,
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
  isRemoteSessionAvailable,
  remoteCallFrameStorage,
  runInRemoteCallFrameMain,
  isRemoteControlChannelAvailable,
  hasRemoteCap,
  preferRemoteValue,
  alwaysFalseRemoteMode,
  runInRemoteCallFrame,
  WALKED,
  REMOTE_STOPPED_WAITING_NOTICE,
  createRemoteModeHandle,
  LOCAL_MODE_HANDLE,
  canUseRemoteFeature,
  hasRemoteControlChannel,
};
