/**
 * remote/remotePermissionModeSync.ts
 *
 * 2.1.316 新增。本地与远端权限模式同步。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (37)
 * attribution: placement 37
 */
import { randomUUID } from "crypto";
import { init_react_production, R, P, zt } from "../../vendor/react/cjs/react.production.js";
import { ControlRequestNotDeliveredError, classifyControlRequestError } from "./controlRequestErrors.js";
import { sleep } from "../utils/sleep.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumOpt, lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useSession } from "../context/session.js";
import { useAppState, useSetAppState, useAppStoreDirect } from "../state/AppState.js";
import { useNotifications } from "../context/notifications.js";
import { isAutoModeActive } from "../utils/permissions/autoModeState.js";
import { isDeviceIdentityEnabledCached } from "../services/analytics/violinGates.js";
import {
  setPermissionModeWithGuards,
  guardPermissionModeChange,
  undonePermissionContext,
  applyPermissionModeRevertEffects,
} from "../utils/permissions/permissionSetup.js";
import { logForDebugging } from "../utils/debug.js";
import { logFeatureOk, logFeatureBad } from "../services/analytics/featureTelemetry.js";
import { toError, errorMessage } from "../utils/errors.js";
import { permissionModeTitle } from "../utils/permissions/PermissionMode.js";

//@ chunk-18hwfzwa.js:238716-238720 placement
init_react_production();
//@ chunk-18hwfzwa.js:238758-238783 placement
var MODE_PUSH_RETRY_DELAYS_MS = [1000, 3000, 9000];
//@ chunk-18hwfzwa.js:238783-239052 placement
/**
 * 把权限模式发给远端：控制请求未送达时按退避延迟重试，被取代则放弃，延迟用尽调用 onGaveUp；其他错误交给 onNotTaken。
 */
function sendModeWithRetry({
  mode,
  send,
  superseded,
  onGaveUp,
  onNotTaken,
  onTaken,
  delaysMs = MODE_PUSH_RETRY_DELAYS_MS,
}) {
  let Be = (He) => {
    send(mode).then(onTaken, (error) => {
      if (!(error instanceof ControlRequestNotDeliveredError)) {
        onNotTaken?.(error);
        return;
      }
      if (superseded()) return;
      let ze = delaysMs[He];
      if (ze === undefined) {
        onGaveUp();
        return;
      }
      sleep(ze).then(() => {
        if (!superseded()) Be(He + 1);
      });
    });
  };
  Be(0);
}
//@ chunk-18hwfzwa.js:239052-239183 placement
class ModePushTimeoutError extends Error {
  constructor() {
    super("set_permission_mode push not acknowledged in time");
    this.name = "ModePushTimeoutError";
  }
}
//@ chunk-18hwfzwa.js:239183-239565 placement
class PendingModeAcks {
  pending = [];
  register(mode, x) {
    let { promise, resolve, reject } = Promise.withResolvers();
    let ke = {
      mode,
      resolve,
      reject,
      timer: undefined,
    };
    ke.timer = setTimeout(rejectPendingModePush, x, this, ke);
    this.pending.push(ke);
    return promise;
  }
  settle(h, x) {
    let filtered = this.pending.filter((L) => L.mode === h);
    this.pending = this.pending.filter((L) => L.mode !== h);
    for (let L of filtered) {
      clearTimeout(L.timer);
      if (x) L.reject(x);
      else L.resolve();
    }
  }
}
//@ chunk-18hwfzwa.js:239565-239593 placement
var pendingModeAcksBySession = new SessionRootSlot(() => new PendingModeAcks());
//@ chunk-18hwfzwa.js:239593-239634 placement
function settlePendingModeAck(session, x, error) {
  pendingModeAcksBySession.of(session).settle(x, error);
}
//@ chunk-18hwfzwa.js:239634-239685 placement
/**
 * 导出函数 `registerPendingModeAck`：参数 h, x, D，返回 cUe.of(h).register(x, D)。
 */
function registerPendingModeAck(session, x, D) {
  return pendingModeAcksBySession.of(session).register(x, D);
}
//@ chunk-18hwfzwa.js:239685-239760 placement
function rejectPendingModePush(h, x) {
  h.pending = h.pending.filter((D) => D !== x);
  x.reject(new ModePushTimeoutError());
}
//@ chunk-18hwfzwa.js:239760-239936 placement
/**
 * 更新 remoteModeSessions 中某会话的记录并把它移到末尾，同时按上限裁剪旧记录（优先删除无未决请求的）；值未变返回原对象。
 */
function updateSessionEntry(remoteModeSessions, x, D) {
  let L = remoteModeSessions[x];
  let ee = D(L);
  if (ee === undefined || ee === L) return remoteModeSessions;
  let filtered = Object.entries(remoteModeSessions).filter(([key]) => key !== x);
  let Re = [x, ee];
  return Object.fromEntries(trimSessionEntries(filtered).concat([Re]));
}
//@ chunk-18hwfzwa.js:239936-240164 placement
function trimSessionEntries(h) {
  let x = h.length - 3;
  if (x <= 0) return h;
  let filtered = h.filter(([, ke]) => ke.outstanding === null);
  let filtered_2 = h.filter(([, ke]) => ke.outstanding !== null);
  let ee = new Set(
    filtered
      .concat(filtered_2)
      .slice(0, x)
      .map(([ke]) => ke),
  );
  return h.filter(([ke]) => !ee.has(ke));
}
//@ chunk-18hwfzwa.js:240164-240320 placement
/**
 * 创建远程权限模式同步的初始状态（已应用/广播/序号/自身发送与确认）。
 */
function createModeSyncState() {
  return {
    applied: null,
    lastApplied: null,
    lastBroadcast: null,
    lastSeq: 0,
    lastChangeSeq: 0,
    ownSends: 0,
    ownSent: null,
    ownAnswerPending: null,
    ownAck: null,
  };
}
//@ chunk-18hwfzwa.js:240320-240407 placement
var PERMISSION_MODE_RANKS = {
  default: 0,
  dontAsk: 0,
  bubble: 0,
  acceptEdits: 1,
  plan: 2,
  auto: 3,
  bypassPermissions: 4,
};
//@ chunk-18hwfzwa.js:240407-240490 placement
function isModeMorePermissiveThan(mode, x) {
  return (
    PERMISSION_MODE_RANKS[mode] > PERMISSION_MODE_RANKS[x] ||
    (mode === "acceptEdits" && (x === "auto" || x === "plan"))
  );
}
//@ chunk-18hwfzwa.js:240490-240707 placement
function resolveOutgoingMode(h, mode, modeOrigin, L) {
  if (!L)
    return {
      mode,
      origin: modeOrigin,
      push: true,
    };
  if (!isModeMorePermissiveThan(h, mode))
    return {
      mode,
      origin: modeOrigin,
      push: false,
    };
  return modeOrigin === "person" || PERMISSION_MODE_RANKS[mode] === 0
    ? {
        mode,
        origin: modeOrigin,
        push: true,
      }
    : {
        mode: "default",
        origin: "person",
        push: true,
        workerHolds: mode,
      };
}
//@ chunk-18hwfzwa.js:240707-240882 placement
/**
 * 记录一次权限模式广播，更新序号与最近变化序号。
 */
function recordModeBroadcast(modeWire, x) {
  let lastBroadcast = modeWire.lastBroadcast;
  let L = modeWire.lastSeq + 1;
  modeWire.lastSeq = L;
  if (x === null || lastBroadcast?.mode !== x || modeWire.lastChangeSeq > lastBroadcast.seq)
    modeWire.lastChangeSeq = L;
  if (x !== null)
    modeWire.lastBroadcast = {
      mode: x,
      seq: L,
    };
}
//@ chunk-18hwfzwa.js:240882-240960 placement
function recordAppliedMode(modeWire, x, own = false) {
  modeWire.applied = x;
  modeWire.lastApplied = {
    mode: x,
    seq: modeWire.lastSeq,
    own,
  };
}
//@ chunk-18hwfzwa.js:240960-241028 placement
function noteOwnModeAnswerPending(modeWire, mode) {
  modeWire.ownAnswerPending = {
    mode,
    sent: recordOwnSend(modeWire, mode, "person"),
  };
}
//@ chunk-18hwfzwa.js:241028-241248 placement
/**
 * 若收到的模式与自己等待确认的答复一致，则消费该等待并记录确认。
 */
function consumeOwnAnswer(modeWire, x) {
  let ownAnswerPending = modeWire.ownAnswerPending;
  if (ownAnswerPending === null) return false;
  if (ownAnswerPending.mode !== x) {
    if (modeWire.lastChangeSeq === modeWire.lastSeq) modeWire.ownAnswerPending = null;
    return false;
  }
  modeWire.ownAnswerPending = null;
  recordOwnAck(modeWire, {
    mode: x,
    origin: "person",
    sent: ownAnswerPending.sent,
  });
  return true;
}
//@ chunk-18hwfzwa.js:241248-241278 placement
function nextOwnSendSeq(modeWire) {
  modeWire.ownSends += 1;
}
//@ chunk-18hwfzwa.js:241278-241397 placement
/**
 * 记录本端发送的模式变更（递增发送计数），返回发送序号。
 */
function recordOwnSend(modeWire, mode, origin) {
  modeWire.ownSends += 1;
  modeWire.ownSent = {
    mode,
    origin,
    sent: modeWire.ownSends,
  };
  modeWire.ownAnswerPending = null;
  return modeWire.ownSends;
}
//@ chunk-18hwfzwa.js:241397-241512 placement
function getLatestOwnSend(modeWire) {
  return modeWire.ownSends === (modeWire.ownSent?.sent ?? 0)
    ? modeWire.ownSent
    : {
        mode: "default",
        origin: "person",
        sent: modeWire.ownSends,
      };
}
//@ chunk-18hwfzwa.js:241512-241621 placement
/**
 * 记录本端发送得到的确认（忽略比已有确认更旧的）。
 */
function recordOwnAck(modeWire, x) {
  if (modeWire.ownAck !== null && x.sent < modeWire.ownAck.sent) return;
  modeWire.ownAck = {
    ...x,
    afterBroadcastSeq: modeWire.lastSeq,
  };
}
//@ chunk-18hwfzwa.js:241621-241951 placement
/**
 * 用 updater 更新某远程会话的模式记录（不存在时以默认记录起步），可选择忽略来自旧屏幕的更新。
 */
function updateRemoteModeSession(setAppState, x, D, L = false) {
  if (x === null) return;
  setAppState((ee) => {
    let ke = updateSessionEntry(ee.remoteModeSessions, x.id, (Re) => {
      if (!L && Re !== undefined && Re.screen > x.screen) return;
      let Be = Re ?? {
        screen: x.screen,
        label: null,
        outstanding: null,
        applied: null,
      };
      let He = D(Be);
      return Re === undefined && He === Be ? undefined : He;
    });
    return ke === ee.remoteModeSessions
      ? ee
      : {
          ...ee,
          remoteModeSessions: ke,
        };
  });
}
//@ chunk-18hwfzwa.js:241951-242170 placement
function resolveModeOrigin({ fallback, label, acked, confirmedByAck, sentBefore, inCloudSession }) {
  if (confirmedByAck && acked !== null && acked.mode === fallback) return acked.origin;
  if (
    inCloudSession &&
    sentBefore !== null &&
    sentBefore.mode === fallback &&
    (acked === null || acked.sent < sentBefore.sent)
  )
    return sentBefore.origin;
  return label;
}
//@ chunk-18hwfzwa.js:242170-242281 placement
function setSessionModeLabel(setAppState, x, mode, origin) {
  updateRemoteModeSession(setAppState, x, (ee) =>
    ee.label?.mode === mode && ee.label.origin === origin
      ? ee
      : {
          ...ee,
          label: {
            mode,
            origin,
          },
        },
  );
}
//@ chunk-18hwfzwa.js:242281-242806 placement
/**
 * 远端确认新模式时，把未决请求改为 landing 状态（来源为本人），已与目标一致则清除。
 */
function landOutstandingMode(setAppState, sessionId, D) {
  setAppState((L) => {
    let ee = updateSessionEntry(L.remoteModeSessions, sessionId, (ke) => {
      let outstanding = ke?.outstanding;
      if (ke === undefined || outstanding === null || outstanding === undefined) return ke;
      let Be = outstanding.kind === "landing" ? outstanding.from : outstanding.mode;
      let He = outstanding.kind === "landing" ? (outstanding.was ?? outstanding.mode) : outstanding.mode;
      if (
        outstanding.kind === "landing" &&
        outstanding.mode === D &&
        outstanding.origin === "person" &&
        outstanding.was === He &&
        outstanding.workerHolds === undefined
      )
        return ke;
      return {
        ...ke,
        outstanding:
          Be === D
            ? null
            : {
                id: outstanding.id,
                kind: "landing",
                mode: D,
                origin: "person",
                from: Be,
                workerHolds: undefined,
                was: He,
              },
      };
    });
    return ee === L.remoteModeSessions
      ? L
      : {
          ...L,
          remoteModeSessions: ee,
        };
  });
}
//@ chunk-18hwfzwa.js:242806-242983 placement
function retargetToDefault(outstanding) {
  return isModeMorePermissiveThan(outstanding.mode, "default")
    ? {
        id: outstanding.id,
        kind: "landing",
        mode: "default",
        origin: "person",
        from: outstanding.mode,
        workerHolds: undefined,
        was: outstanding.kind === "landing" ? (outstanding.was ?? outstanding.mode) : outstanding.mode,
      }
    : outstanding;
}
//@ chunk-18hwfzwa.js:242983-243407 placement
/**
 * 处理没有记录的模式应答：上报 tengu_remote_mode_unrecorded_answer，必要时把未决请求改指向 default。
 */
function handleUnrecordedAnswer(modeWire, store, setAppState, sessionId) {
  let outstanding = store.getSnapshot().remoteModeSessions[sessionId]?.outstanding;
  let ke = outstanding != null && retargetToDefault(outstanding) !== outstanding;
  logEvent("tengu_remote_mode_unrecorded_answer", {
    made_stale: fromEnumOpt(modeWire.ownSent?.mode) ?? lit_2("none"),
    retargeted: ke ? fromEnum(outstanding.kind) : lit_2("none"),
  });
  if (!ke) return;
  setAppState((Re) => {
    let Be = updateSessionEntry(Re.remoteModeSessions, sessionId, (He) =>
      He?.outstanding == null
        ? He
        : {
            ...He,
            outstanding: retargetToDefault(He.outstanding),
          },
    );
    return Be === Re.remoteModeSessions
      ? Re
      : {
          ...Re,
          remoteModeSessions: Be,
        };
  });
}
//@ chunk-18hwfzwa.js:243407-243848 placement
/**
 * 远端已应用某模式时更新会话记录的 applied，并清除已完成的 landing 未决请求。
 */
function applyRemoteMode(setAppState, sessionId, D, L) {
  setAppState((ee) => {
    let ke = updateSessionEntry(ee.remoteModeSessions, sessionId, (Re) => {
      if (Re === undefined) return Re;
      let outstanding = Re.outstanding;
      let He =
        outstanding?.kind === "landing" && outstanding.was !== undefined
          ? L === "person" && outstanding.mode === D
            ? null
            : {
                ...outstanding,
                was: undefined,
              }
          : outstanding;
      let We =
        Re.applied?.mode === D && Re.applied.origin === L
          ? Re.applied
          : {
              mode: D,
              origin: L,
            };
      return He === Re.outstanding && We === Re.applied
        ? Re
        : {
            ...Re,
            outstanding: He,
            applied: We,
          };
    });
    return ke === ee.remoteModeSessions
      ? ee
      : {
          ...ee,
          remoteModeSessions: ke,
        };
  });
}
//@ chunk-18hwfzwa.js:243848-244123 placement
/**
 * 开始在远程会话中落地一次模式切换：生成 id 并记为该会话的待处理切换。
 */
function beginModeLanding(h, sessionId, mode, from) {
  let ee = randomUUID();
  h((ke) => {
    let Re = updateSessionEntry(ke.remoteModeSessions, sessionId, (Be) =>
      Be === undefined
        ? undefined
        : {
            ...Be,
            outstanding: {
              id: ee,
              kind: "landing",
              mode,
              origin: "person",
              from,
              workerHolds: undefined,
            },
          },
    );
    return Re === ke.remoteModeSessions
      ? ke
      : {
          ...ke,
          remoteModeSessions: Re,
        };
  });
  return ee;
}
//@ chunk-18hwfzwa.js:244123-244308 placement
/**
 * 清除远程会话中指定 id 的待处理模式切换。
 */
function clearOutstandingMode(h, sessionId, convergeEntry) {
  h((L) => {
    let ee = updateSessionEntry(L.remoteModeSessions, sessionId, (ke) =>
      ke?.outstanding?.id === convergeEntry
        ? {
            ...ke,
            outstanding: null,
          }
        : ke,
    );
    return ee === L.remoteModeSessions
      ? L
      : {
          ...L,
          remoteModeSessions: ee,
        };
  });
}
//@ chunk-18hwfzwa.js:244308-244448 placement
function setOutstandingMode(setAppState, x, D, L) {
  updateRemoteModeSession(
    setAppState,
    x,
    (ee) =>
      ee.outstanding === D || (L !== undefined && ee.outstanding?.id !== L.id)
        ? ee
        : {
            ...ee,
            outstanding: D,
          },
    D === null && L !== undefined,
  );
}
//@ chunk-18hwfzwa.js:244448-254618 placement
/**
 * 云会话权限模式同步：本地按 shift+tab 改模式时推送 set_permission_mode 并等待 ack，远端广播模式变化时落地到本地，冲突/超时时回退并通知（remote-permission-mode-unsynced/rejected）。
 */
function useRemotePermissionModeSync(h, x = MODE_PUSH_RETRY_DELAYS_MS) {
  let D = useStoreSelector(h, (bo) => bo.activeRemote);
  let modeWire = h.modeWire;
  let session = useSession();
  let ke = useAppState((bo) => bo.toolPermissionContext);
  let mode = ke.mode;
  let lastApplied = modeWire.lastApplied;
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let { addNotification } = useNotifications();
  let Xe = R(false);
  let rt = R({
    mode,
    context: ke,
    origin: "person",
    autoModeActive: isAutoModeActive(),
  });
  let kt = R(false);
  let At = R(null);
  let It = R(null);
  let Ot = It.current;
  let Et = R(null);
  let lastAppliedRef = R(null);
  let Lt = R(0);
  let oo = R(0);
  let labelRef = R(null);
  let io = R(false);
  let so = R(true);
  P(
    () => () => {
      so.current = false;
      Et.current = null;
    },
    [],
  );
  let po = R(0);
  let sessionIdRef = R(undefined);
  let sessionId = D.isRemoteMode ? D.sessionId : undefined;
  zt(() => {
    let activeRemote = h.getSnapshot().activeRemote;
    let sessionId = activeRemote.isRemoteMode ? activeRemote.sessionId : undefined;
    if (sessionId === undefined || sessionId === sessionIdRef.current) return;
    sessionIdRef.current = sessionId;
    let Bo = (appStoreDirect.getState().remoteModeSessions[sessionId]?.screen ?? 0) + 1;
    po.current = Bo;
    updateRemoteModeSession(
      setAppState,
      {
        id: sessionId,
        screen: Bo,
      },
      (Ro) => ({
        ...Ro,
        screen: Bo,
      }),
    );
  }, [h, sessionId, appStoreDirect, setAppState]);
  P(() => {
    if (!D.isRemoteMode || !D.caps.controlChannel || D.viewerOnly) {
      Et.current = null;
      return;
    }
    let bo = () => isDeviceIdentityEnabledCached() && D.caps.sessionRecord;
    let Ao = bo();
    let Bo =
      D.sessionId === undefined
        ? null
        : {
            id: D.sessionId,
            screen: po.current,
          };
    let Ro = () =>
      bo() &&
      (!so.current ||
        (Bo !== null &&
          (appStoreDirect.getState().remoteModeSessions[Bo.id]?.screen ?? Bo.screen) !== Bo.screen));
    if (!Xe.current) {
      Xe.current = true;
      let Wn = Bo === null ? undefined : appStoreDirect.getState().remoteModeSessions[Bo.id];
      if (Wn?.label) {
        kt.current = true;
        let mode = rt.current.mode;
        rt.current = {
          ...rt.current,
          origin: Wn.label.mode === mode ? Wn.label.origin : "wire",
        };
        if (mode === "bubble" && Wn.label.mode !== "bubble") labelRef.current = Wn.label;
        let outstanding = Wn.outstanding;
        if (outstanding !== null) setOutstandingMode(setAppState, Bo, null);
        let Un = (mode_2) =>
          mode_2 === mode && appStoreDirect.getState().toolPermissionContext.mode === mode_2;
        let dr =
          outstanding?.kind === "landing" &&
          Ao &&
          outstanding.from !== outstanding.mode &&
          (Wn.applied === null || Wn.applied.mode === outstanding.mode) &&
          (Wn.label.mode === outstanding.mode ||
            (outstanding.was !== undefined && Wn.label.mode === outstanding.was));
        if (outstanding?.kind === "press" && Ao && Un(outstanding.mode) && mode !== "bubble")
          rt.current = {
            mode: outstanding.fallback,
            origin: outstanding.fallbackOrigin,
            context: {
              ...rt.current.context,
              mode: outstanding.fallback,
            },
            autoModeActive: isAutoModeActive(),
            carried: true,
          };
        else if (outstanding?.kind === "landing" && dr && Un(outstanding.mode)) {
          rt.current = {
            ...rt.current,
            mode: outstanding.from,
            origin: "wire",
          };
          At.current = {
            mode: outstanding.mode,
            origin: outstanding.origin,
            push: true,
            workerHolds: outstanding.workerHolds,
          };
        } else if (outstanding?.kind === "landing" && dr && mode !== "bubble") {
          let or = {
            mode: outstanding.mode,
            origin: outstanding.origin,
            push: true,
            workerHolds: outstanding.workerHolds,
            from: outstanding.from,
          };
          setPermissionModeWithGuards(
            outstanding.mode,
            appStoreDirect.getState().toolPermissionContext,
            (pr) => {
              setAppState((Qn) => {
                if (Qn.toolPermissionContext.mode !== mode) return Qn;
                At.current = or;
                It.current = or;
                return {
                  ...Qn,
                  toolPermissionContext: pr(Qn.toolPermissionContext),
                };
              });
            },
          );
        }
      } else {
        rt.current = {
          ...rt.current,
          origin: "wire",
        };
        io.current = rt.current.mode === "bubble";
      }
    }
    let Ho = rt.current;
    let applied = modeWire.applied;
    modeWire.applied = null;
    let Wo = lastApplied !== lastAppliedRef.current ? lastApplied : undefined;
    lastAppliedRef.current = lastApplied;
    let mn = Ao ? Wo?.mode === mode : applied === mode;
    let Cn =
      Ao && Bo !== null ? (appStoreDirect.getState().remoteModeSessions[Bo.id]?.applied ?? null) : null;
    let No = !mn && Cn?.mode === mode ? Cn : null;
    if (Cn !== null && (Cn.mode === mode || Cn.mode !== appStoreDirect.getState().toolPermissionContext.mode))
      updateRemoteModeSession(setAppState, Bo, (Wn) =>
        Wn.applied === null
          ? Wn
          : {
              ...Wn,
              applied: null,
            },
      );
    let vo = mn || No !== null;
    let Yo = No !== null ? No.origin : Ao && Wo?.own === true ? "person" : "wire";
    if (vo && Yo === "person")
      updateRemoteModeSession(setAppState, Bo, (Wn) =>
        Wn.outstanding?.kind === "landing" && Wn.outstanding.was !== undefined && Wn.outstanding.mode === mode
          ? {
              ...Wn,
              outstanding: null,
            }
          : Wn,
      );
    if (Ho.mode === mode || mode === "bubble") {
      if (mode === "bubble" && Ho.mode !== "bubble")
        labelRef.current =
          Ao && Wo
            ? {
                mode: Wo.mode,
                origin: Yo,
              }
            : {
                mode: Ho.mode,
                origin: Ho.origin,
              };
      if (Ao && mode !== "bubble" && Ot && At.current === Ot) At.current = null;
      rt.current = {
        mode,
        context: ke,
        origin: Ao && vo ? Yo : Ho.origin,
        autoModeActive: isAutoModeActive(),
      };
      if (mode !== "bubble") setSessionModeLabel(setAppState, Bo, mode, rt.current.origin);
      return;
    }
    let kn = At.current;
    At.current = null;
    let Fn = labelRef.current;
    labelRef.current = null;
    let bn = io.current;
    io.current = false;
    let Go =
      Ho.mode !== "bubble"
        ? undefined
        : Fn?.mode === mode
          ? Fn.origin
          : bn && isModeMorePermissiveThan(mode, "default")
            ? "wire"
            : undefined;
    let hn = kn?.mode === mode;
    let Mn = !(Ao && hn) && (vo || (Ao && Go === "wire"));
    oo.current += 1;
    let Xo = oo.current;
    rt.current = {
      mode,
      context: ke,
      origin: Mn ? (vo ? Yo : "wire") : kn?.mode === mode ? kn.origin : (Go ?? "person"),
      autoModeActive: isAutoModeActive(),
    };
    setSessionModeLabel(setAppState, Bo, mode, rt.current.origin);
    if (Et.current !== null)
      updateRemoteModeSession(setAppState, Bo, (Wn) =>
        Wn.outstanding?.kind === "landing"
          ? {
              ...Wn,
              outstanding: null,
            }
          : Wn,
      );
    Et.current = null;
    if (Mn) {
      settlePendingModeAck(session, mode);
      return;
    }
    let mode_2 = mode;
    let origin = Ao ? rt.current.origin : "wire";
    if (Ao && hn && kn?.push === false) {
      logForDebugging(`[remote] reverted to ${mode_2}; nothing re-sent`);
      return;
    }
    let workerHolds = Ao && hn ? kn?.workerHolds : undefined;
    let from = Ao && hn ? (kn?.from ?? Ho.mode) : Ho.mode;
    let cn = (Wn) => {
      At.current = Wn;
      It.current = Wn;
    };
    let seq = modeWire.lastBroadcast?.seq ?? 0;
    let wn = (Wn, Fr = false) => {
      if (
        Ro() ||
        workerHolds === undefined ||
        oo.current !== Xo ||
        appStoreDirect.getState().toolPermissionContext.mode !== mode_2
      )
        return;
      if ((modeWire.lastBroadcast?.seq ?? 0) !== seq) {
        if (!Fr && modeWire.lastBroadcast?.mode !== mode_2) addNotification(Wn);
        return;
      }
      if (!Fr) addNotification(Wn);
      if (
        setPermissionModeWithGuards(workerHolds, appStoreDirect.getState().toolPermissionContext, (Un) => {
          setAppState((dr) => {
            if (dr.toolPermissionContext.mode !== mode_2) return dr;
            let toolPermissionContext = Un(dr.toolPermissionContext);
            cn({
              mode: workerHolds,
              origin: "wire",
              push: false,
            });
            return {
              ...dr,
              toolPermissionContext,
            };
          });
        }).ok
      )
        logForDebugging(
          `[remote] the cloud session did not take ${mode_2} after the landing; chip back on ${workerHolds}, which it still holds`,
        );
    };
    let mr = (Wn, Fr) => {
      let lastSeq = modeWire.lastSeq;
      let latestOwnSend = getLatestOwnSend(modeWire);
      let dr = latestOwnSend !== modeWire.ownSent;
      let or = recordOwnSend(modeWire, mode_2, origin);
      if (!Fr) Lt.current += 1;
      let pr = Lt.current;
      let Qn = !Ao
        ? null
        : Fr
          ? {
              id: randomUUID(),
              kind: "landing",
              mode: mode_2,
              origin,
              from,
              workerHolds,
            }
          : {
              id: randomUUID(),
              kind: "press",
              mode: mode_2,
              fallback: Ho.mode,
              fallbackOrigin: Ho.origin,
            };
      let ur = () => {
        if (Qn !== null) setOutstandingMode(setAppState, Bo, null, Qn);
      };
      if (Qn !== null) setOutstandingMode(setAppState, Bo, Qn);
      D.sendControlRequest({
        subtype: "set_permission_mode",
        mode: mode_2,
      })
        .then(() => {
          ur();
          recordOwnAck(modeWire, {
            mode: mode_2,
            origin,
            sent: Ao ? or : modeWire.ownSends,
          });
          settlePendingModeAck(session, mode_2);
          if (!Fr) logFeatureOk("mode_switch");
        })
        .catch((error) => {
          settlePendingModeAck(session, mode_2, toError(error));
          logForDebugging(`[remote] set_permission_mode rejected: ${errorMessage(error)}`);
          let Pr = error instanceof ControlRequestNotDeliveredError;
          let ts = classifyControlRequestError(error);
          if (Ro()) {
            if (!Fr) logFeatureBad("mode_switch", ts);
            return;
          }
          if (!(Fr && Pr)) ur();
          let Gn =
            (ts === "disconnected" || ts === "not_connected") &&
            appStoreDirect.getState().remoteConnectionStatus !== "connected";
          if (Fr) {
            if (Pr) Kn(Wn, pr, or, ur);
            else wn(notifyRemoteModeRejected(mode_2), Gn);
            return;
          }
          let Ur = bo();
          let mode = appStoreDirect.getState().toolPermissionContext.mode;
          let wr = mode !== mode_2;
          let lastBroadcast = modeWire.lastBroadcast;
          let _r = lastBroadcast?.mode === mode_2 && lastBroadcast.seq > lastSeq;
          let fr = Ur ? getLatestOwnSend(modeWire) : null;
          let $r = fr !== null && fr === modeWire.ownSent && fr.mode === mode_2 && fr.sent > or;
          let Yr =
            Ur &&
            wr &&
            (mode === rt.current.mode ||
              (modeWire.lastApplied !== lastAppliedRef.current && modeWire.lastApplied?.mode === mode)) &&
            pr === Lt.current &&
            !Gn &&
            !_r &&
            !$r;
          let Er =
            dr || getLatestOwnSend(modeWire) !== modeWire.ownSent ? `${ts}_after_unrecorded_answer` : ts;
          if (Yr) {
            let oi = !Pr && isModeMorePermissiveThan(modeWire.ownSent?.mode ?? mode_2, mode);
            logFeatureBad("mode_switch", `${Er}_chip_moved${oi ? "_sent_wider" : ""}`, {
              pressed: fromEnum(mode_2),
              chip: fromEnum(mode),
            });
          } else logFeatureBad("mode_switch", Er);
          let Vr = () => {
            if (Gn && Ur) return;
            addNotification(Pr ? notifyRemoteModeUnreachable(mode_2) : notifyRemoteModeRejected(mode_2));
          };
          if (wr || (Ur && pr !== Lt.current)) {
            if (Yr && ts !== "timeout") Vr();
            return;
          }
          let ms = (outgoingMode) => {
            if (!Ur) return outgoingMode;
            let Oi = outgoingMode.workerHolds ?? outgoingMode.mode;
            if (!outgoingMode.push) return outgoingMode;
            if (latestOwnSend === null)
              return kt.current && isModeMorePermissiveThan(outgoingMode.mode, "default")
                ? {
                    mode: "default",
                    origin: "person",
                    push: true,
                    workerHolds: Oi,
                  }
                : outgoingMode;
            if (!isModeMorePermissiveThan(outgoingMode.mode, latestOwnSend.mode)) return outgoingMode;
            if (latestOwnSend.mode === mode_2)
              return {
                mode: Oi,
                origin: "wire",
                push: false,
              };
            return guardPermissionModeChange(
              latestOwnSend.mode,
              appStoreDirect.getState().toolPermissionContext,
            ).ok
              ? {
                  mode: latestOwnSend.mode,
                  origin: latestOwnSend.origin,
                  push: true,
                  workerHolds: Oi,
                }
              : {
                  mode: "default",
                  origin: "person",
                  push: true,
                  workerHolds: Oi,
                };
          };
          if (_r) {
            logForDebugging(
              `[remote] set_permission_mode ${mode_2} failed, but the worker has since reported ${mode_2} itself \u2014 keeping it`,
            );
            return;
          }
          if (fr !== null && fr.sent > or && (fr === modeWire.ownSent || fr.mode !== mode_2)) {
            if ($r) return;
            let mode = guardPermissionModeChange(fr.mode, appStoreDirect.getState().toolPermissionContext).ok
              ? fr.mode
              : "default";
            let Oi = {
              mode,
              origin: "person",
              push: true,
              workerHolds: lastBroadcast?.mode ?? Ho.mode,
            };
            setPermissionModeWithGuards(mode, appStoreDirect.getState().toolPermissionContext, (Hi) => {
              setAppState((Zi) => {
                if (Zi.toolPermissionContext.mode !== mode_2) return Zi;
                cn(Oi);
                return {
                  ...Zi,
                  toolPermissionContext: Hi(Zi.toolPermissionContext),
                };
              });
            });
            Vr();
            return;
          }
          let ownAck = modeWire.ownAck;
          let Ls =
            ownAck !== null &&
            (!lastBroadcast ||
              lastBroadcast.seq <= ownAck.afterBroadcastSeq ||
              (lastBroadcast.mode === ownAck.mode && modeWire.lastChangeSeq <= ownAck.afterBroadcastSeq + 1));
          let mode_3 = Ls ? ownAck.mode : lastBroadcast?.mode;
          if (mode_3 !== undefined && mode_3 !== Ho.mode) {
            if (mode_3 === mode_2) {
              logForDebugging(
                `[remote] set_permission_mode ${mode_2} failed; ${mode_2} is the worker's last confirmed mode \u2014 keeping it and re-sending`,
              );
              mr(0, true);
              return;
            }
            let oi = ms(
              resolveOutgoingMode(
                mode_2,
                mode_3,
                resolveModeOrigin({
                  fallback: mode_3,
                  label: "wire",
                  acked: ownAck,
                  confirmedByAck: Ls,
                  sentBefore: latestOwnSend,
                  inCloudSession: Ur,
                }),
                Ur,
              ),
            );
            let mode = oi.mode;
            if (
              setPermissionModeWithGuards(mode, appStoreDirect.getState().toolPermissionContext, (Zi) => {
                setAppState((da) => {
                  if (da.toolPermissionContext.mode !== mode_2) return da;
                  let toolPermissionContext = Zi(da.toolPermissionContext);
                  cn(oi);
                  return {
                    ...da,
                    toolPermissionContext,
                  };
                });
              }).ok
            ) {
              logForDebugging(
                `[remote] set_permission_mode ${mode_2} failed; going to ${mode} (the worker's last confirmed mode is ${mode_3}; the chip was on ${Ho.mode}, never confirmed)`,
              );
              Vr();
              return;
            }
          }
          let ws = ms(
            resolveOutgoingMode(
              mode_2,
              Ho.mode,
              resolveModeOrigin({
                fallback: Ho.mode,
                label: Ho.origin,
                acked: ownAck,
                confirmedByAck: Ls,
                sentBefore: latestOwnSend,
                inCloudSession: Ur,
              }),
              Ur,
            ),
          );
          let Ci = (mode, Oi) =>
            setPermissionModeWithGuards(mode, appStoreDirect.getState().toolPermissionContext, (Hi) => {
              setAppState((Zi) => {
                if (Zi.toolPermissionContext.mode !== mode_2) return Zi;
                let toolPermissionContext = Hi(Zi.toolPermissionContext);
                cn(Oi);
                return {
                  ...Zi,
                  toolPermissionContext,
                };
              });
            });
          if (ws.mode !== Ho.mode || Ho.carried) {
            if (Ci(ws.mode, ws).ok) {
              logForDebugging(
                `[remote] set_permission_mode ${mode_2} failed; going to ${ws.mode}${ws.mode === Ho.mode ? " (the mode before a press carried from an earlier screen)" : ` \u2014 ${Ho.mode} is not re-posted as the person's`}`,
              );
              Vr();
              return;
            }
          }
          if (
            Ho.carried ||
            !guardPermissionModeChange(Ho.mode, appStoreDirect.getState().toolPermissionContext).ok
          ) {
            if (mode_2 !== "default")
              Ci("default", {
                mode: "default",
                origin: "person",
                push: true,
                workerHolds: ws.workerHolds ?? ws.mode,
              });
            else mr(0, true);
            logForDebugging(
              `[remote] set_permission_mode ${mode_2} failed; ${Ho.mode} can no longer be entered here, so the chip is on default`,
            );
            Vr();
            if (Gn && Ur) addNotification(notifyRemoteModeUnsynced());
            return;
          }
          setAppState((oi) => {
            if (oi.toolPermissionContext.mode !== mode_2) return oi;
            let Oi = {
              ...Ho,
              context: undonePermissionContext(Ho.context, oi.toolPermissionContext),
            };
            let toolPermissionContext = isDeviceIdentityEnabledCached()
              ? applyPermissionModeRevertEffects(oi.toolPermissionContext, Oi)
              : Oi.context;
            cn(ws);
            return {
              ...oi,
              toolPermissionContext,
            };
          });
          Vr();
        });
    };
    let Kn = (Wn, Fr, Zn, Un) => {
      let dr = () => bo() && Lt.current !== Fr;
      let or = () => {
        let latestOwnSend = getLatestOwnSend(modeWire);
        if (
          !bo() ||
          Ro() ||
          latestOwnSend === null ||
          latestOwnSend.sent <= Zn ||
          latestOwnSend.mode === mode_2
        )
          return false;
        setPermissionModeWithGuards(
          latestOwnSend.mode,
          appStoreDirect.getState().toolPermissionContext,
          (Ir) => {
            setAppState((Pr) => {
              if (Pr.toolPermissionContext.mode !== mode_2) return Pr;
              cn({
                mode: latestOwnSend.mode,
                origin: "person",
                push: true,
                workerHolds,
                from,
              });
              return {
                ...Pr,
                toolPermissionContext: Ir(Pr.toolPermissionContext),
              };
            });
          },
        );
        return true;
      };
      if (dr()) {
        Un();
        wn(notifyRemoteModeUnreachable(mode_2), true);
        return;
      }
      if (or()) {
        Un();
        return;
      }
      let pr = x[Wn];
      if (pr === undefined) {
        logForDebugging(
          `[remote] convergence push of ${mode_2} mode still undelivered after ${Wn + 1} attempts \u2014 giving up`,
          {
            level: "warn",
          },
        );
        if (workerHolds !== undefined) {
          Un();
          wn(notifyRemoteModeUnreachable(mode_2));
          return;
        }
        addNotification(notifyRemoteModeUnsynced());
        return;
      }
      let Qn = {
        broadcastSeq: modeWire.lastBroadcast?.seq ?? 0,
      };
      Et.current = Qn;
      sleep(pr).then(() => {
        if (Et.current !== Qn || Ro()) return;
        Et.current = null;
        if (
          (modeWire.lastBroadcast?.seq ?? 0) !== Qn.broadcastSeq ||
          appStoreDirect.getState().toolPermissionContext.mode !== mode_2 ||
          dr()
        ) {
          Un();
          wn(notifyRemoteModeUnreachable(mode_2));
          return;
        }
        if (or()) {
          Un();
          return;
        }
        mr(Wn + 1, true);
      });
    };
    mr(0, hn);
  }, [session, mode, ke, lastApplied, Ot, D, setAppState, addNotification, appStoreDirect, modeWire, x]);
}
//@ chunk-18hwfzwa.js:254618-254837 placement
function notifyRemoteModeUnsynced() {
  return {
    key: "remote-permission-mode-unsynced",
    kind: "feedback",
    text: "Couldn't reach the cloud session \u2014 permission mode may be out of sync \xB7 shift+tab to retry",
    color: "warning",
    priority: "immediate",
  };
}
//@ chunk-18hwfzwa.js:254837-255014 placement
function notifyRemoteModeUnreachable(h) {
  return {
    key: "remote-permission-mode-rejected",
    kind: "feedback",
    text: `Couldn't reach the cloud session to switch to ${h} mode`,
    color: "warning",
    priority: "immediate",
  };
}
//@ chunk-18hwfzwa.js:255014-255183 placement
function notifyRemoteModeRejected(h) {
  return {
    key: "remote-permission-mode-rejected",
    kind: "feedback",
    text: `Remote session couldn't switch to ${permissionModeTitle(h)} mode`,
    color: "warning",
    priority: "immediate",
  };
}
export {
  notifyRemoteModeRejected,
  beginModeLanding,
  clearOutstandingMode,
  sendModeWithRetry,
  notifyRemoteModeUnsynced,
  createModeSyncState,
  recordOwnSend,
  recordOwnAck,
  noteOwnModeAnswerPending,
  landOutstandingMode,
  nextOwnSendSeq,
  handleUnrecordedAnswer,
  recordModeBroadcast,
  consumeOwnAnswer,
  recordAppliedMode,
  applyRemoteMode,
  useRemotePermissionModeSync,
  registerPendingModeAck,
  ModePushTimeoutError,
};
