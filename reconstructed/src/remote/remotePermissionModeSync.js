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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { j, R, P, zt } from "../../vendor/react/cjs/react.production.js";
import { ControlRequestNotDeliveredError, classifyControlRequestError } from "./controlRequestErrors.js";
import { sleep } from "../utils/sleep.js";
import { SessionRootSlot } from "../bootstrap/sessionSlices.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnumOpt, lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { useSession } from "../context/session.js";
import { useAppState, useSetAppState, Cr } from "../state/AppState.js";
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
j();
//@ chunk-18hwfzwa.js:238758-238783 placement
var nae = [1000, 3000, 9000];
/**
 * 把权限模式发给远端：控制请求未送达时按退避延迟重试，被取代则放弃，延迟用尽调用 onGaveUp；其他错误交给 onNotTaken。
 */
//@ chunk-18hwfzwa.js:238783-239052 placement
function sendModeWithRetry({
  mode: mode,
  send: send,
  superseded: superseded,
  onGaveUp: onGaveUp,
  onNotTaken: onNotTaken,
  onTaken: onTaken,
  delaysMs: delaysMs = nae,
}) {
  let Be = (He) => {
    send(mode).then(onTaken, (We) => {
      if (!(We instanceof ControlRequestNotDeliveredError)) {
        onNotTaken?.(We);
        return;
      }
      if (superseded()) return;
      let ze = delaysMs[He];
      if (ze === void 0) {
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
  register(h, x) {
    let { promise: promise, resolve: resolve, reject: reject } = Promise.withResolvers(),
      ke = { mode: h, resolve: resolve, reject: reject, timer: void 0 };
    return ((ke.timer = setTimeout(a0t, x, this, ke)), this.pending.push(ke), promise);
  }
  settle(h, x) {
    let filtered = this.pending.filter((L) => L.mode === h);
    this.pending = this.pending.filter((L) => L.mode !== h);
    for (let L of filtered)
      if ((clearTimeout(L.timer), x)) L.reject(x);
      else L.resolve();
  }
}
//@ chunk-18hwfzwa.js:239565-239593 placement
var cUe = new SessionRootSlot(() => new PendingModeAcks());
//@ chunk-18hwfzwa.js:239593-239634 placement
function $Q(h, x, D) {
  cUe.of(h).settle(x, D);
}
//@ chunk-18hwfzwa.js:239634-239685 placement
function iAs(h, x, D) {
  return cUe.of(h).register(x, D);
}
//@ chunk-18hwfzwa.js:239685-239760 placement
function a0t(h, x) {
  ((h.pending = h.pending.filter((D) => D !== x)), x.reject(new ModePushTimeoutError()));
}
/**
 * 更新 remoteModeSessions 中某会话的记录并把它移到末尾，同时按上限裁剪旧记录（优先删除无未决请求的）；值未变返回原对象。
 */
//@ chunk-18hwfzwa.js:239760-239936 placement
function updateSessionEntry(h, x, D) {
  let L = h[x],
    ee = D(L);
  if (ee === void 0 || ee === L) return h;
  let filtered = Object.entries(h).filter(([Be]) => Be !== x),
    Re = [x, ee];
  return Object.fromEntries(trimSessionEntries(filtered).concat([Re]));
}
//@ chunk-18hwfzwa.js:239936-240164 placement
function trimSessionEntries(h) {
  let x = h.length - 3;
  if (x <= 0) return h;
  let filtered = h.filter(([, ke]) => ke.outstanding === null),
    filtered_2 = h.filter(([, ke]) => ke.outstanding !== null),
    ee = new Set(
      filtered
        .concat(filtered_2)
        .slice(0, x)
        .map(([ke]) => ke),
    );
  return h.filter(([ke]) => !ee.has(ke));
}
/**
 * 创建远程权限模式同步的初始状态（已应用/广播/序号/自身发送与确认）。
 */
//@ chunk-18hwfzwa.js:240164-240320 placement
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
var aae = { default: 0, dontAsk: 0, bubble: 0, acceptEdits: 1, plan: 2, auto: 3, bypassPermissions: 4 };
//@ chunk-18hwfzwa.js:240407-240490 placement
function zD(h, x) {
  return aae[h] > aae[x] || (h === "acceptEdits" && (x === "auto" || x === "plan"));
}
//@ chunk-18hwfzwa.js:240490-240707 placement
function resolveOutgoingMode(h, x, D, L) {
  if (!L) return { mode: x, origin: D, push: !0 };
  if (!zD(h, x)) return { mode: x, origin: D, push: !1 };
  return D === "person" || aae[x] === 0
    ? { mode: x, origin: D, push: !0 }
    : { mode: "default", origin: "person", push: !0, workerHolds: x };
}
/**
 * 记录一次权限模式广播，更新序号与最近变化序号。
 */
//@ chunk-18hwfzwa.js:240707-240882 placement
function recordModeBroadcast(h, x) {
  let lastBroadcast = h.lastBroadcast,
    L = h.lastSeq + 1;
  if (((h.lastSeq = L), x === null || lastBroadcast?.mode !== x || h.lastChangeSeq > lastBroadcast.seq))
    h.lastChangeSeq = L;
  if (x !== null) h.lastBroadcast = { mode: x, seq: L };
}
//@ chunk-18hwfzwa.js:240882-240960 placement
function yUe(h, x, D = !1) {
  ((h.applied = x), (h.lastApplied = { mode: x, seq: h.lastSeq, own: D }));
}
//@ chunk-18hwfzwa.js:240960-241028 placement
function SUe(h, x) {
  h.ownAnswerPending = { mode: x, sent: recordOwnSend(h, x, "person") };
}
/**
 * 若收到的模式与自己等待确认的答复一致，则消费该等待并记录确认。
 */
//@ chunk-18hwfzwa.js:241028-241248 placement
function consumeOwnAnswer(h, x) {
  let ownAnswerPending = h.ownAnswerPending;
  if (ownAnswerPending === null) return !1;
  if (ownAnswerPending.mode !== x) {
    if (h.lastChangeSeq === h.lastSeq) h.ownAnswerPending = null;
    return !1;
  }
  return (
    (h.ownAnswerPending = null),
    recordOwnAck(h, { mode: x, origin: "person", sent: ownAnswerPending.sent }),
    !0
  );
}
//@ chunk-18hwfzwa.js:241248-241278 placement
function wUe(h) {
  h.ownSends += 1;
}
/**
 * 记录本端发送的模式变更（递增发送计数），返回发送序号。
 */
//@ chunk-18hwfzwa.js:241278-241397 placement
function recordOwnSend(h, x, D) {
  return (
    (h.ownSends += 1),
    (h.ownSent = { mode: x, origin: D, sent: h.ownSends }),
    (h.ownAnswerPending = null),
    h.ownSends
  );
}
//@ chunk-18hwfzwa.js:241397-241512 placement
function getLatestOwnSend(h) {
  return h.ownSends === (h.ownSent?.sent ?? 0)
    ? h.ownSent
    : { mode: "default", origin: "person", sent: h.ownSends };
}
/**
 * 记录本端发送得到的确认（忽略比已有确认更旧的）。
 */
//@ chunk-18hwfzwa.js:241512-241621 placement
function recordOwnAck(h, x) {
  if (h.ownAck !== null && x.sent < h.ownAck.sent) return;
  h.ownAck = { ...x, afterBroadcastSeq: h.lastSeq };
}
/**
 * 用 updater 更新某远程会话的模式记录（不存在时以默认记录起步），可选择忽略来自旧屏幕的更新。
 */
//@ chunk-18hwfzwa.js:241621-241951 placement
function updateRemoteModeSession(h, x, D, L = !1) {
  if (x === null) return;
  h((ee) => {
    let ke = updateSessionEntry(ee.remoteModeSessions, x.id, (Re) => {
      if (!L && Re !== void 0 && Re.screen > x.screen) return;
      let Be = Re ?? { screen: x.screen, label: null, outstanding: null, applied: null },
        He = D(Be);
      return Re === void 0 && He === Be ? void 0 : He;
    });
    return ke === ee.remoteModeSessions ? ee : { ...ee, remoteModeSessions: ke };
  });
}
//@ chunk-18hwfzwa.js:241951-242170 placement
function resolveModeOrigin({
  fallback: fallback,
  label: label,
  acked: acked,
  confirmedByAck: confirmedByAck,
  sentBefore: sentBefore,
  inCloudSession: inCloudSession,
}) {
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
function setSessionModeLabel(h, x, D, L) {
  updateRemoteModeSession(h, x, (ee) =>
    ee.label?.mode === D && ee.label.origin === L ? ee : { ...ee, label: { mode: D, origin: L } },
  );
}
/**
 * 远端确认新模式时，把未决请求改为 landing 状态（来源为本人），已与目标一致则清除。
 */
//@ chunk-18hwfzwa.js:242281-242806 placement
function landOutstandingMode(h, x, D) {
  h((L) => {
    let ee = updateSessionEntry(L.remoteModeSessions, x, (ke) => {
      let Re = ke?.outstanding;
      if (ke === void 0 || Re === null || Re === void 0) return ke;
      let Be = Re.kind === "landing" ? Re.from : Re.mode,
        He = Re.kind === "landing" ? (Re.was ?? Re.mode) : Re.mode;
      if (
        Re.kind === "landing" &&
        Re.mode === D &&
        Re.origin === "person" &&
        Re.was === He &&
        Re.workerHolds === void 0
      )
        return ke;
      return {
        ...ke,
        outstanding:
          Be === D
            ? null
            : {
                id: Re.id,
                kind: "landing",
                mode: D,
                origin: "person",
                from: Be,
                workerHolds: void 0,
                was: He,
              },
      };
    });
    return ee === L.remoteModeSessions ? L : { ...L, remoteModeSessions: ee };
  });
}
//@ chunk-18hwfzwa.js:242806-242983 placement
function retargetToDefault(h) {
  return zD(h.mode, "default")
    ? {
        id: h.id,
        kind: "landing",
        mode: "default",
        origin: "person",
        from: h.mode,
        workerHolds: void 0,
        was: h.kind === "landing" ? (h.was ?? h.mode) : h.mode,
      }
    : h;
}
/**
 * 处理没有记录的模式应答：上报 tengu_remote_mode_unrecorded_answer，必要时把未决请求改指向 default。
 */
//@ chunk-18hwfzwa.js:242983-243407 placement
function handleUnrecordedAnswer(h, x, D, L) {
  let ee = x.getSnapshot().remoteModeSessions[L]?.outstanding,
    ke = ee != null && retargetToDefault(ee) !== ee;
  if (
    (logEvent("tengu_remote_mode_unrecorded_answer", {
      made_stale: fromEnumOpt(h.ownSent?.mode) ?? lit_2("none"),
      retargeted: ke ? fromEnum(ee.kind) : lit_2("none"),
    }),
    !ke)
  )
    return;
  D((Re) => {
    let Be = updateSessionEntry(Re.remoteModeSessions, L, (He) =>
      He?.outstanding == null ? He : { ...He, outstanding: retargetToDefault(He.outstanding) },
    );
    return Be === Re.remoteModeSessions ? Re : { ...Re, remoteModeSessions: Be };
  });
}
/**
 * 远端已应用某模式时更新会话记录的 applied，并清除已完成的 landing 未决请求。
 */
//@ chunk-18hwfzwa.js:243407-243848 placement
function applyRemoteMode(h, x, D, L) {
  h((ee) => {
    let ke = updateSessionEntry(ee.remoteModeSessions, x, (Re) => {
      if (Re === void 0) return Re;
      let outstanding = Re.outstanding,
        He =
          outstanding?.kind === "landing" && outstanding.was !== void 0
            ? L === "person" && outstanding.mode === D
              ? null
              : { ...outstanding, was: void 0 }
            : outstanding,
        We = Re.applied?.mode === D && Re.applied.origin === L ? Re.applied : { mode: D, origin: L };
      return He === Re.outstanding && We === Re.applied ? Re : { ...Re, outstanding: He, applied: We };
    });
    return ke === ee.remoteModeSessions ? ee : { ...ee, remoteModeSessions: ke };
  });
}
/**
 * 开始在远程会话中落地一次模式切换：生成 id 并记为该会话的待处理切换。
 */
//@ chunk-18hwfzwa.js:243848-244123 placement
function beginModeLanding(h, x, D, L) {
  let ee = randomUUID_6();
  return (
    h((ke) => {
      let Re = updateSessionEntry(ke.remoteModeSessions, x, (Be) =>
        Be === void 0
          ? void 0
          : {
              ...Be,
              outstanding: {
                id: ee,
                kind: "landing",
                mode: D,
                origin: "person",
                from: L,
                workerHolds: void 0,
              },
            },
      );
      return Re === ke.remoteModeSessions ? ke : { ...ke, remoteModeSessions: Re };
    }),
    ee
  );
}
/**
 * 清除远程会话中指定 id 的待处理模式切换。
 */
//@ chunk-18hwfzwa.js:244123-244308 placement
function clearOutstandingMode(h, x, D) {
  h((L) => {
    let ee = updateSessionEntry(L.remoteModeSessions, x, (ke) =>
      ke?.outstanding?.id === D ? { ...ke, outstanding: null } : ke,
    );
    return ee === L.remoteModeSessions ? L : { ...L, remoteModeSessions: ee };
  });
}
//@ chunk-18hwfzwa.js:244308-244448 placement
function setOutstandingMode(h, x, D, L) {
  updateRemoteModeSession(
    h,
    x,
    (ee) =>
      ee.outstanding === D || (L !== void 0 && ee.outstanding?.id !== L.id) ? ee : { ...ee, outstanding: D },
    D === null && L !== void 0,
  );
}
/**
 * 云会话权限模式同步：本地按 shift+tab 改模式时推送 set_permission_mode 并等待 ack，远端广播模式变化时落地到本地，冲突/超时时回退并通知（remote-permission-mode-unsynced/rejected）。
 */
//@ chunk-18hwfzwa.js:244448-254618 placement
function useRemotePermissionModeSync(h, x = nae) {
  let D = useStoreSelector(h, (bo) => bo.activeRemote),
    modeWire = h.modeWire,
    ee = useSession(),
    ke = useAppState((bo) => bo.toolPermissionContext),
    mode = ke.mode,
    lastApplied = modeWire.lastApplied,
    He = useSetAppState(),
    We = Cr(),
    { addNotification: addNotification } = useNotifications(),
    Xe = R(!1),
    rt = R({ mode: mode, context: ke, origin: "person", autoModeActive: isAutoModeActive() }),
    kt = R(!1),
    At = R(null),
    It = R(null),
    Ot = It.current,
    Et = R(null),
    Dt = R(null),
    Lt = R(0),
    oo = R(0),
    Xt = R(null),
    io = R(!1),
    so = R(!0);
  P(
    () => () => {
      ((so.current = !1), (Et.current = null));
    },
    [],
  );
  let po = R(0),
    ao = R(void 0),
    co = D.isRemoteMode ? D.sessionId : void 0;
  (zt(() => {
    let activeRemote = h.getSnapshot().activeRemote,
      Ao = activeRemote.isRemoteMode ? activeRemote.sessionId : void 0;
    if (Ao === void 0 || Ao === ao.current) return;
    ao.current = Ao;
    let Bo = (We.getState().remoteModeSessions[Ao]?.screen ?? 0) + 1;
    ((po.current = Bo), updateRemoteModeSession(He, { id: Ao, screen: Bo }, (Ro) => ({ ...Ro, screen: Bo })));
  }, [h, co, We, He]),
    P(() => {
      if (!D.isRemoteMode || !D.caps.controlChannel || D.viewerOnly) {
        Et.current = null;
        return;
      }
      let bo = () => isDeviceIdentityEnabledCached() && D.caps.sessionRecord,
        Ao = bo(),
        Bo = D.sessionId === void 0 ? null : { id: D.sessionId, screen: po.current },
        Ro = () =>
          bo() &&
          (!so.current ||
            (Bo !== null && (We.getState().remoteModeSessions[Bo.id]?.screen ?? Bo.screen) !== Bo.screen));
      if (!Xe.current) {
        Xe.current = !0;
        let Wn = Bo === null ? void 0 : We.getState().remoteModeSessions[Bo.id];
        if (Wn?.label) {
          kt.current = !0;
          let mode = rt.current.mode;
          if (
            ((rt.current = { ...rt.current, origin: Wn.label.mode === mode ? Wn.label.origin : "wire" }),
            mode === "bubble" && Wn.label.mode !== "bubble")
          )
            Xt.current = Wn.label;
          let outstanding = Wn.outstanding;
          if (outstanding !== null) setOutstandingMode(He, Bo, null);
          let Un = (or) => or === mode && We.getState().toolPermissionContext.mode === or,
            dr =
              outstanding?.kind === "landing" &&
              Ao &&
              outstanding.from !== outstanding.mode &&
              (Wn.applied === null || Wn.applied.mode === outstanding.mode) &&
              (Wn.label.mode === outstanding.mode ||
                (outstanding.was !== void 0 && Wn.label.mode === outstanding.was));
          if (outstanding?.kind === "press" && Ao && Un(outstanding.mode) && mode !== "bubble")
            rt.current = {
              mode: outstanding.fallback,
              origin: outstanding.fallbackOrigin,
              context: { ...rt.current.context, mode: outstanding.fallback },
              autoModeActive: isAutoModeActive(),
              carried: !0,
            };
          else if (outstanding?.kind === "landing" && dr && Un(outstanding.mode))
            ((rt.current = { ...rt.current, mode: outstanding.from, origin: "wire" }),
              (At.current = {
                mode: outstanding.mode,
                origin: outstanding.origin,
                push: !0,
                workerHolds: outstanding.workerHolds,
              }));
          else if (outstanding?.kind === "landing" && dr && mode !== "bubble") {
            let or = {
              mode: outstanding.mode,
              origin: outstanding.origin,
              push: !0,
              workerHolds: outstanding.workerHolds,
              from: outstanding.from,
            };
            setPermissionModeWithGuards(outstanding.mode, We.getState().toolPermissionContext, (pr) => {
              He((Qn) => {
                if (Qn.toolPermissionContext.mode !== mode) return Qn;
                return (
                  (At.current = or),
                  (It.current = or),
                  { ...Qn, toolPermissionContext: pr(Qn.toolPermissionContext) }
                );
              });
            });
          }
        } else
          ((rt.current = { ...rt.current, origin: "wire" }), (io.current = rt.current.mode === "bubble"));
      }
      let Ho = rt.current,
        applied = modeWire.applied;
      modeWire.applied = null;
      let Wo = lastApplied !== Dt.current ? lastApplied : void 0;
      Dt.current = lastApplied;
      let mn = Ao ? Wo?.mode === mode : applied === mode,
        Cn = Ao && Bo !== null ? (We.getState().remoteModeSessions[Bo.id]?.applied ?? null) : null,
        No = !mn && Cn?.mode === mode ? Cn : null;
      if (Cn !== null && (Cn.mode === mode || Cn.mode !== We.getState().toolPermissionContext.mode))
        updateRemoteModeSession(He, Bo, (Wn) => (Wn.applied === null ? Wn : { ...Wn, applied: null }));
      let vo = mn || No !== null,
        Yo = No !== null ? No.origin : Ao && Wo?.own === !0 ? "person" : "wire";
      if (vo && Yo === "person")
        updateRemoteModeSession(He, Bo, (Wn) =>
          Wn.outstanding?.kind === "landing" && Wn.outstanding.was !== void 0 && Wn.outstanding.mode === mode
            ? { ...Wn, outstanding: null }
            : Wn,
        );
      if (Ho.mode === mode || mode === "bubble") {
        if (mode === "bubble" && Ho.mode !== "bubble")
          Xt.current = Ao && Wo ? { mode: Wo.mode, origin: Yo } : { mode: Ho.mode, origin: Ho.origin };
        if (Ao && mode !== "bubble" && Ot && At.current === Ot) At.current = null;
        if (
          ((rt.current = {
            mode: mode,
            context: ke,
            origin: Ao && vo ? Yo : Ho.origin,
            autoModeActive: isAutoModeActive(),
          }),
          mode !== "bubble")
        )
          setSessionModeLabel(He, Bo, mode, rt.current.origin);
        return;
      }
      let kn = At.current;
      At.current = null;
      let Fn = Xt.current;
      Xt.current = null;
      let bn = io.current;
      io.current = !1;
      let Go =
          Ho.mode !== "bubble"
            ? void 0
            : Fn?.mode === mode
              ? Fn.origin
              : bn && zD(mode, "default")
                ? "wire"
                : void 0,
        hn = kn?.mode === mode,
        Mn = !(Ao && hn) && (vo || (Ao && Go === "wire"));
      oo.current += 1;
      let Xo = oo.current;
      if (
        ((rt.current = {
          mode: mode,
          context: ke,
          origin: Mn ? (vo ? Yo : "wire") : kn?.mode === mode ? kn.origin : (Go ?? "person"),
          autoModeActive: isAutoModeActive(),
        }),
        setSessionModeLabel(He, Bo, mode, rt.current.origin),
        Et.current !== null)
      )
        updateRemoteModeSession(He, Bo, (Wn) =>
          Wn.outstanding?.kind === "landing" ? { ...Wn, outstanding: null } : Wn,
        );
      if (((Et.current = null), Mn)) {
        $Q(ee, mode);
        return;
      }
      let Sn = mode,
        $n = Ao ? rt.current.origin : "wire";
      if (Ao && hn && kn?.push === !1) {
        logForDebugging(`[remote] reverted to ${Sn}; nothing re-sent`);
        return;
      }
      let on = Ao && hn ? kn?.workerHolds : void 0,
        _o = Ao && hn ? (kn?.from ?? Ho.mode) : Ho.mode,
        cn = (Wn) => {
          ((At.current = Wn), (It.current = Wn));
        },
        Dn = modeWire.lastBroadcast?.seq ?? 0,
        wn = (Wn, Fr = !1) => {
          if (Ro() || on === void 0 || oo.current !== Xo || We.getState().toolPermissionContext.mode !== Sn)
            return;
          if ((modeWire.lastBroadcast?.seq ?? 0) !== Dn) {
            if (!Fr && modeWire.lastBroadcast?.mode !== Sn) addNotification(Wn);
            return;
          }
          if (!Fr) addNotification(Wn);
          if (
            setPermissionModeWithGuards(on, We.getState().toolPermissionContext, (Un) => {
              He((dr) => {
                if (dr.toolPermissionContext.mode !== Sn) return dr;
                let or = Un(dr.toolPermissionContext);
                return (cn({ mode: on, origin: "wire", push: !1 }), { ...dr, toolPermissionContext: or });
              });
            }).ok
          )
            logForDebugging(
              `[remote] the cloud session did not take ${Sn} after the landing; chip back on ${on}, which it still holds`,
            );
        },
        mr = (Wn, Fr) => {
          let lastSeq = modeWire.lastSeq,
            Un = getLatestOwnSend(modeWire),
            dr = Un !== modeWire.ownSent,
            or = recordOwnSend(modeWire, Sn, $n);
          if (!Fr) Lt.current += 1;
          let pr = Lt.current,
            Qn = !Ao
              ? null
              : Fr
                ? { id: randomUUID_6(), kind: "landing", mode: Sn, origin: $n, from: _o, workerHolds: on }
                : {
                    id: randomUUID_6(),
                    kind: "press",
                    mode: Sn,
                    fallback: Ho.mode,
                    fallbackOrigin: Ho.origin,
                  },
            ur = () => {
              if (Qn !== null) setOutstandingMode(He, Bo, null, Qn);
            };
          if (Qn !== null) setOutstandingMode(He, Bo, Qn);
          D.sendControlRequest({ subtype: "set_permission_mode", mode: Sn })
            .then(() => {
              if (
                (ur(),
                recordOwnAck(modeWire, { mode: Sn, origin: $n, sent: Ao ? or : modeWire.ownSends }),
                $Q(ee, Sn),
                !Fr)
              )
                logFeatureOk("mode_switch");
            })
            .catch((Ir) => {
              ($Q(ee, Sn, toError(Ir)),
                logForDebugging(`[remote] set_permission_mode rejected: ${errorMessage(Ir)}`));
              let Pr = Ir instanceof ControlRequestNotDeliveredError,
                ts = classifyControlRequestError(Ir);
              if (Ro()) {
                if (!Fr) logFeatureBad("mode_switch", ts);
                return;
              }
              if (!(Fr && Pr)) ur();
              let Gn =
                (ts === "disconnected" || ts === "not_connected") &&
                We.getState().remoteConnectionStatus !== "connected";
              if (Fr) {
                if (Pr) Kn(Wn, pr, or, ur);
                else wn(notifyRemoteModeRejected(Sn), Gn);
                return;
              }
              let Ur = bo(),
                mode = We.getState().toolPermissionContext.mode,
                wr = mode !== Sn,
                lastBroadcast = modeWire.lastBroadcast,
                _r = lastBroadcast?.mode === Sn && lastBroadcast.seq > lastSeq,
                fr = Ur ? getLatestOwnSend(modeWire) : null,
                $r = fr !== null && fr === modeWire.ownSent && fr.mode === Sn && fr.sent > or,
                Yr =
                  Ur &&
                  wr &&
                  (mode === rt.current.mode ||
                    (modeWire.lastApplied !== Dt.current && modeWire.lastApplied?.mode === mode)) &&
                  pr === Lt.current &&
                  !Gn &&
                  !_r &&
                  !$r,
                Er =
                  dr || getLatestOwnSend(modeWire) !== modeWire.ownSent
                    ? `${ts}_after_unrecorded_answer`
                    : ts;
              if (Yr) {
                let oi = !Pr && zD(modeWire.ownSent?.mode ?? Sn, mode);
                logFeatureBad("mode_switch", `${Er}_chip_moved${oi ? "_sent_wider" : ""}`, {
                  pressed: fromEnum(Sn),
                  chip: fromEnum(mode),
                });
              } else logFeatureBad("mode_switch", Er);
              let Vr = () => {
                if (Gn && Ur) return;
                addNotification(Pr ? notifyRemoteModeUnreachable(Sn) : notifyRemoteModeRejected(Sn));
              };
              if (wr || (Ur && pr !== Lt.current)) {
                if (Yr && ts !== "timeout") Vr();
                return;
              }
              let ms = (oi) => {
                if (!Ur) return oi;
                let Oi = oi.workerHolds ?? oi.mode;
                if (!oi.push) return oi;
                if (Un === null)
                  return kt.current && zD(oi.mode, "default")
                    ? { mode: "default", origin: "person", push: !0, workerHolds: Oi }
                    : oi;
                if (!zD(oi.mode, Un.mode)) return oi;
                if (Un.mode === Sn) return { mode: Oi, origin: "wire", push: !1 };
                return guardPermissionModeChange(Un.mode, We.getState().toolPermissionContext).ok
                  ? { mode: Un.mode, origin: Un.origin, push: !0, workerHolds: Oi }
                  : { mode: "default", origin: "person", push: !0, workerHolds: Oi };
              };
              if (_r) {
                logForDebugging(
                  `[remote] set_permission_mode ${Sn} failed, but the worker has since reported ${Sn} itself \u2014 keeping it`,
                );
                return;
              }
              if (fr !== null && fr.sent > or && (fr === modeWire.ownSent || fr.mode !== Sn)) {
                if ($r) return;
                let oi = guardPermissionModeChange(fr.mode, We.getState().toolPermissionContext).ok
                    ? fr.mode
                    : "default",
                  Oi = { mode: oi, origin: "person", push: !0, workerHolds: lastBroadcast?.mode ?? Ho.mode };
                (setPermissionModeWithGuards(oi, We.getState().toolPermissionContext, (Hi) => {
                  He((Zi) => {
                    if (Zi.toolPermissionContext.mode !== Sn) return Zi;
                    return (cn(Oi), { ...Zi, toolPermissionContext: Hi(Zi.toolPermissionContext) });
                  });
                }),
                  Vr());
                return;
              }
              let ownAck = modeWire.ownAck,
                Ls =
                  ownAck !== null &&
                  (!lastBroadcast ||
                    lastBroadcast.seq <= ownAck.afterBroadcastSeq ||
                    (lastBroadcast.mode === ownAck.mode &&
                      modeWire.lastChangeSeq <= ownAck.afterBroadcastSeq + 1)),
                is = Ls ? ownAck.mode : lastBroadcast?.mode;
              if (is !== void 0 && is !== Ho.mode) {
                if (is === Sn) {
                  (logForDebugging(
                    `[remote] set_permission_mode ${Sn} failed; ${Sn} is the worker's last confirmed mode \u2014 keeping it and re-sending`,
                  ),
                    mr(0, !0));
                  return;
                }
                let oi = ms(
                    resolveOutgoingMode(
                      Sn,
                      is,
                      resolveModeOrigin({
                        fallback: is,
                        label: "wire",
                        acked: ownAck,
                        confirmedByAck: Ls,
                        sentBefore: Un,
                        inCloudSession: Ur,
                      }),
                      Ur,
                    ),
                  ),
                  mode = oi.mode;
                if (
                  setPermissionModeWithGuards(mode, We.getState().toolPermissionContext, (Zi) => {
                    He((da) => {
                      if (da.toolPermissionContext.mode !== Sn) return da;
                      let qn = Zi(da.toolPermissionContext);
                      return (cn(oi), { ...da, toolPermissionContext: qn });
                    });
                  }).ok
                ) {
                  (logForDebugging(
                    `[remote] set_permission_mode ${Sn} failed; going to ${mode} (the worker's last confirmed mode is ${is}; the chip was on ${Ho.mode}, never confirmed)`,
                  ),
                    Vr());
                  return;
                }
              }
              let ws = ms(
                  resolveOutgoingMode(
                    Sn,
                    Ho.mode,
                    resolveModeOrigin({
                      fallback: Ho.mode,
                      label: Ho.origin,
                      acked: ownAck,
                      confirmedByAck: Ls,
                      sentBefore: Un,
                      inCloudSession: Ur,
                    }),
                    Ur,
                  ),
                ),
                Ci = (oi, Oi) =>
                  setPermissionModeWithGuards(oi, We.getState().toolPermissionContext, (Hi) => {
                    He((Zi) => {
                      if (Zi.toolPermissionContext.mode !== Sn) return Zi;
                      let da = Hi(Zi.toolPermissionContext);
                      return (cn(Oi), { ...Zi, toolPermissionContext: da });
                    });
                  });
              if (ws.mode !== Ho.mode || Ho.carried) {
                if (Ci(ws.mode, ws).ok) {
                  (logForDebugging(
                    `[remote] set_permission_mode ${Sn} failed; going to ${ws.mode}${ws.mode === Ho.mode ? " (the mode before a press carried from an earlier screen)" : ` \u2014 ${Ho.mode} is not re-posted as the person's`}`,
                  ),
                    Vr());
                  return;
                }
              }
              if (Ho.carried || !guardPermissionModeChange(Ho.mode, We.getState().toolPermissionContext).ok) {
                if (Sn !== "default")
                  Ci("default", {
                    mode: "default",
                    origin: "person",
                    push: !0,
                    workerHolds: ws.workerHolds ?? ws.mode,
                  });
                else mr(0, !0);
                if (
                  (logForDebugging(
                    `[remote] set_permission_mode ${Sn} failed; ${Ho.mode} can no longer be entered here, so the chip is on default`,
                  ),
                  Vr(),
                  Gn && Ur)
                )
                  addNotification(notifyRemoteModeUnsynced());
                return;
              }
              (He((oi) => {
                if (oi.toolPermissionContext.mode !== Sn) return oi;
                let Oi = { ...Ho, context: undonePermissionContext(Ho.context, oi.toolPermissionContext) },
                  Hi = isDeviceIdentityEnabledCached()
                    ? applyPermissionModeRevertEffects(oi.toolPermissionContext, Oi)
                    : Oi.context;
                return (cn(ws), { ...oi, toolPermissionContext: Hi });
              }),
                Vr());
            });
        },
        Kn = (Wn, Fr, Zn, Un) => {
          let dr = () => bo() && Lt.current !== Fr,
            or = () => {
              let ur = getLatestOwnSend(modeWire);
              if (!bo() || Ro() || ur === null || ur.sent <= Zn || ur.mode === Sn) return !1;
              return (
                setPermissionModeWithGuards(ur.mode, We.getState().toolPermissionContext, (Ir) => {
                  He((Pr) => {
                    if (Pr.toolPermissionContext.mode !== Sn) return Pr;
                    return (
                      cn({ mode: ur.mode, origin: "person", push: !0, workerHolds: on, from: _o }),
                      { ...Pr, toolPermissionContext: Ir(Pr.toolPermissionContext) }
                    );
                  });
                }),
                !0
              );
            };
          if (dr()) {
            (Un(), wn(notifyRemoteModeUnreachable(Sn), !0));
            return;
          }
          if (or()) {
            Un();
            return;
          }
          let pr = x[Wn];
          if (pr === void 0) {
            if (
              (logForDebugging(
                `[remote] convergence push of ${Sn} mode still undelivered after ${Wn + 1} attempts \u2014 giving up`,
                { level: "warn" },
              ),
              on !== void 0)
            ) {
              (Un(), wn(notifyRemoteModeUnreachable(Sn)));
              return;
            }
            addNotification(notifyRemoteModeUnsynced());
            return;
          }
          let Qn = { broadcastSeq: modeWire.lastBroadcast?.seq ?? 0 };
          ((Et.current = Qn),
            sleep(pr).then(() => {
              if (Et.current !== Qn || Ro()) return;
              if (
                ((Et.current = null),
                (modeWire.lastBroadcast?.seq ?? 0) !== Qn.broadcastSeq ||
                  We.getState().toolPermissionContext.mode !== Sn ||
                  dr())
              ) {
                (Un(), wn(notifyRemoteModeUnreachable(Sn)));
                return;
              }
              if (or()) {
                Un();
                return;
              }
              mr(Wn + 1, !0);
            }));
        };
      mr(0, hn);
    }, [ee, mode, ke, lastApplied, Ot, D, He, addNotification, We, modeWire, x]));
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
  SUe,
  landOutstandingMode,
  wUe,
  handleUnrecordedAnswer,
  recordModeBroadcast,
  consumeOwnAnswer,
  yUe,
  applyRemoteMode,
  useRemotePermissionModeSync,
  iAs,
  ModePushTimeoutError,
};
