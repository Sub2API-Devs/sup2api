/**
 * remote/remotePermissionModeSync.ts
 *
 * 2.1.316 新增。本地与远端权限模式同步。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (37)
 * attribution: placement 37
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { randomUUID } from "crypto";
import {
  init_react_production,
  useRef,
  useEffect,
  useLayoutEffect,
} from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:243755-243759 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:243755", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:243797-243822 placement
var MODE_PUSH_RETRY_DELAYS_MS = [1000, 3000, 9000];
//@ chunk-czq1j3j2.js:243822-244091 placement
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
  let attempt = (attemptIndex) => {
    send(mode).then(onTaken, (error) => {
      if (!(error instanceof ControlRequestNotDeliveredError)) {
        onNotTaken?.(error);
        return;
      }
      if (superseded()) return;
      let delayMs = delaysMs[attemptIndex];
      if (delayMs === undefined) {
        onGaveUp();
        return;
      }
      sleep(delayMs).then(() => {
        if (!superseded()) attempt(attemptIndex + 1);
      });
    });
  };
  attempt(0);
}
//@ chunk-czq1j3j2.js:244091-244222 placement
class ModePushTimeoutError extends Error {
  constructor() {
    super("set_permission_mode push not acknowledged in time");
    this.name = "ModePushTimeoutError";
  }
}
//@ chunk-czq1j3j2.js:244222-244604 placement
class PendingModeAcks {
  pending = [];
  register(mode, timeoutMs) {
    let { promise, resolve, reject } = Promise.withResolvers();
    let entry = {
      mode,
      resolve,
      reject,
      timer: undefined,
    };
    entry.timer = setTimeout(rejectPendingModePush, timeoutMs, this, entry);
    this.pending.push(entry);
    return promise;
  }
  settle(mode, error) {
    let filtered = this.pending.filter((entry) => entry.mode === mode);
    this.pending = this.pending.filter((entry) => entry.mode !== mode);
    for (let entry of filtered) {
      clearTimeout(entry.timer);
      if (error) entry.reject(error);
      else entry.resolve();
    }
  }
}
//@ chunk-czq1j3j2.js:244604-244632 placement
var pendingModeAcksBySession; // deferred: uses SessionRootSlot (../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-czq1j3j2.js:244604", () => {
  pendingModeAcksBySession = new SessionRootSlot(() => new PendingModeAcks());
});
//@ chunk-czq1j3j2.js:244632-244673 placement
function settlePendingModeAck(session, mode, error) {
  pendingModeAcksBySession.of(session).settle(mode, error);
}
//@ chunk-czq1j3j2.js:244673-244724 placement
/**
 * 导出函数 `registerPendingModeAck`：参数 h, x, D，返回 cUe.of(h).register(x, D)。
 */
function registerPendingModeAck(session, mode, timeoutMs) {
  return pendingModeAcksBySession.of(session).register(mode, timeoutMs);
}
//@ chunk-czq1j3j2.js:244724-244799 placement
function rejectPendingModePush(acks, entry) {
  acks.pending = acks.pending.filter((pendingEntry) => pendingEntry !== entry);
  entry.reject(new ModePushTimeoutError());
}
//@ chunk-czq1j3j2.js:244799-244975 placement
/**
 * 更新 remoteModeSessions 中某会话的记录并把它移到末尾，同时按上限裁剪旧记录（优先删除无未决请求的）；值未变返回原对象。
 */
function updateSessionEntry(remoteModeSessions, sessionId, update) {
  let previous = remoteModeSessions[sessionId];
  let next = update(previous);
  if (next === undefined || next === previous) return remoteModeSessions;
  let entries = Object.entries(remoteModeSessions).filter(([key]) => key !== sessionId);
  let sessionEntry = [sessionId, next];
  return Object.fromEntries(trimSessionEntries(entries).concat([sessionEntry]));
}
//@ chunk-czq1j3j2.js:244975-245203 placement
function trimSessionEntries(entries) {
  let overflow = entries.length - 3;
  if (overflow <= 0) return entries;
  let filtered = entries.filter(([, entry]) => entry.outstanding === null);
  let filtered_2 = entries.filter(([, entry]) => entry.outstanding !== null);
  let dropped = new Set(
    filtered
      .concat(filtered_2)
      .slice(0, overflow)
      .map(([sessionId]) => sessionId),
  );
  return entries.filter(([sessionId]) => !dropped.has(sessionId));
}
//@ chunk-czq1j3j2.js:245203-245359 placement
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
//@ chunk-czq1j3j2.js:245359-245446 placement
var PERMISSION_MODE_RANKS = {
  default: 0,
  dontAsk: 0,
  bubble: 0,
  acceptEdits: 1,
  plan: 2,
  auto: 3,
  bypassPermissions: 4,
};
//@ chunk-czq1j3j2.js:245446-245529 placement
function isModeMorePermissiveThan(mode, otherMode) {
  return (
    PERMISSION_MODE_RANKS[mode] > PERMISSION_MODE_RANKS[otherMode] ||
    (mode === "acceptEdits" && (otherMode === "auto" || otherMode === "plan"))
  );
}
//@ chunk-czq1j3j2.js:245529-245746 placement
function resolveOutgoingMode(chipMode, mode, modeOrigin, inCloudSession) {
  if (!inCloudSession)
    return {
      mode,
      origin: modeOrigin,
      push: true,
    };
  if (!isModeMorePermissiveThan(chipMode, mode))
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
//@ chunk-czq1j3j2.js:245746-245921 placement
/**
 * 记录一次权限模式广播，更新序号与最近变化序号。
 */
function recordModeBroadcast(modeWire, broadcastMode) {
  let lastBroadcast = modeWire.lastBroadcast;
  let nextSeq = modeWire.lastSeq + 1;
  modeWire.lastSeq = nextSeq;
  if (
    broadcastMode === null ||
    lastBroadcast?.mode !== broadcastMode ||
    modeWire.lastChangeSeq > lastBroadcast.seq
  )
    modeWire.lastChangeSeq = nextSeq;
  if (broadcastMode !== null)
    modeWire.lastBroadcast = {
      mode: broadcastMode,
      seq: nextSeq,
    };
}
//@ chunk-czq1j3j2.js:245921-245999 placement
function recordAppliedMode(modeWire, mode, own = false) {
  modeWire.applied = mode;
  modeWire.lastApplied = {
    mode,
    seq: modeWire.lastSeq,
    own,
  };
}
//@ chunk-czq1j3j2.js:245999-246067 placement
function noteOwnModeAnswerPending(modeWire, mode) {
  modeWire.ownAnswerPending = {
    mode,
    sent: recordOwnSend(modeWire, mode, "person"),
  };
}
//@ chunk-czq1j3j2.js:246067-246287 placement
/**
 * 若收到的模式与自己等待确认的答复一致，则消费该等待并记录确认。
 */
function consumeOwnAnswer(modeWire, mode) {
  let ownAnswerPending = modeWire.ownAnswerPending;
  if (ownAnswerPending === null) return false;
  if (ownAnswerPending.mode !== mode) {
    if (modeWire.lastChangeSeq === modeWire.lastSeq) modeWire.ownAnswerPending = null;
    return false;
  }
  modeWire.ownAnswerPending = null;
  recordOwnAck(modeWire, {
    mode,
    origin: "person",
    sent: ownAnswerPending.sent,
  });
  return true;
}
//@ chunk-czq1j3j2.js:246287-246317 placement
function nextOwnSendSeq(modeWire) {
  modeWire.ownSends += 1;
}
//@ chunk-czq1j3j2.js:246317-246436 placement
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
//@ chunk-czq1j3j2.js:246436-246551 placement
function getLatestOwnSend(modeWire) {
  return modeWire.ownSends === (modeWire.ownSent?.sent ?? 0)
    ? modeWire.ownSent
    : {
        mode: "default",
        origin: "person",
        sent: modeWire.ownSends,
      };
}
//@ chunk-czq1j3j2.js:246551-246660 placement
/**
 * 记录本端发送得到的确认（忽略比已有确认更旧的）。
 */
function recordOwnAck(modeWire, ack) {
  if (modeWire.ownAck !== null && ack.sent < modeWire.ownAck.sent) return;
  modeWire.ownAck = {
    ...ack,
    afterBroadcastSeq: modeWire.lastSeq,
  };
}
//@ chunk-czq1j3j2.js:246660-246990 placement
/**
 * 用 updater 更新某远程会话的模式记录（不存在时以默认记录起步），可选择忽略来自旧屏幕的更新。
 */
function updateRemoteModeSession(setAppState, sessionRef, update, force = false) {
  if (sessionRef === null) return;
  setAppState((appState) => {
    let sessions = updateSessionEntry(appState.remoteModeSessions, sessionRef.id, (entry) => {
      if (!force && entry !== undefined && entry.screen > sessionRef.screen) return;
      let base = entry ?? {
        screen: sessionRef.screen,
        label: null,
        outstanding: null,
        applied: null,
      };
      let next = update(base);
      return entry === undefined && next === base ? undefined : next;
    });
    return sessions === appState.remoteModeSessions
      ? appState
      : {
          ...appState,
          remoteModeSessions: sessions,
        };
  });
}
//@ chunk-czq1j3j2.js:246990-247209 placement
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
//@ chunk-czq1j3j2.js:247209-247320 placement
function setSessionModeLabel(setAppState, sessionRef, mode, origin) {
  updateRemoteModeSession(setAppState, sessionRef, (entry) =>
    entry.label?.mode === mode && entry.label.origin === origin
      ? entry
      : {
          ...entry,
          label: {
            mode,
            origin,
          },
        },
  );
}
//@ chunk-czq1j3j2.js:247320-247845 placement
/**
 * 远端确认新模式时，把未决请求改为 landing 状态（来源为本人），已与目标一致则清除。
 */
function landOutstandingMode(setAppState, sessionId, mode) {
  setAppState((appState) => {
    let sessions = updateSessionEntry(appState.remoteModeSessions, sessionId, (entry) => {
      let outstanding = entry?.outstanding;
      if (entry === undefined || outstanding === null || outstanding === undefined) return entry;
      let fromMode = outstanding.kind === "landing" ? outstanding.from : outstanding.mode;
      let wasMode = outstanding.kind === "landing" ? (outstanding.was ?? outstanding.mode) : outstanding.mode;
      if (
        outstanding.kind === "landing" &&
        outstanding.mode === mode &&
        outstanding.origin === "person" &&
        outstanding.was === wasMode &&
        outstanding.workerHolds === undefined
      )
        return entry;
      return {
        ...entry,
        outstanding:
          fromMode === mode
            ? null
            : {
                id: outstanding.id,
                kind: "landing",
                mode,
                origin: "person",
                from: fromMode,
                workerHolds: undefined,
                was: wasMode,
              },
      };
    });
    return sessions === appState.remoteModeSessions
      ? appState
      : {
          ...appState,
          remoteModeSessions: sessions,
        };
  });
}
//@ chunk-czq1j3j2.js:247845-248022 placement
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
//@ chunk-czq1j3j2.js:248022-248446 placement
/**
 * 处理没有记录的模式应答：上报 tengu_remote_mode_unrecorded_answer，必要时把未决请求改指向 default。
 */
function handleUnrecordedAnswer(modeWire, store, setAppState, sessionId) {
  let outstanding = store.getSnapshot().remoteModeSessions[sessionId]?.outstanding;
  let retargeted = outstanding != null && retargetToDefault(outstanding) !== outstanding;
  logEvent("tengu_remote_mode_unrecorded_answer", {
    made_stale: fromEnumOpt(modeWire.ownSent?.mode) ?? lit_2("none"),
    retargeted: retargeted ? fromEnum(outstanding.kind) : lit_2("none"),
  });
  if (!retargeted) return;
  setAppState((appState) => {
    let sessions = updateSessionEntry(appState.remoteModeSessions, sessionId, (entry) =>
      entry?.outstanding == null
        ? entry
        : {
            ...entry,
            outstanding: retargetToDefault(entry.outstanding),
          },
    );
    return sessions === appState.remoteModeSessions
      ? appState
      : {
          ...appState,
          remoteModeSessions: sessions,
        };
  });
}
//@ chunk-czq1j3j2.js:248446-248887 placement
/**
 * 远端已应用某模式时更新会话记录的 applied，并清除已完成的 landing 未决请求。
 */
function applyRemoteMode(setAppState, sessionId, mode, origin) {
  setAppState((appState) => {
    let sessions = updateSessionEntry(appState.remoteModeSessions, sessionId, (entry) => {
      if (entry === undefined) return entry;
      let outstanding = entry.outstanding;
      let nextOutstanding =
        outstanding?.kind === "landing" && outstanding.was !== undefined
          ? origin === "person" && outstanding.mode === mode
            ? null
            : {
                ...outstanding,
                was: undefined,
              }
          : outstanding;
      let applied =
        entry.applied?.mode === mode && entry.applied.origin === origin
          ? entry.applied
          : {
              mode,
              origin,
            };
      return nextOutstanding === entry.outstanding && applied === entry.applied
        ? entry
        : {
            ...entry,
            outstanding: nextOutstanding,
            applied,
          };
    });
    return sessions === appState.remoteModeSessions
      ? appState
      : {
          ...appState,
          remoteModeSessions: sessions,
        };
  });
}
//@ chunk-czq1j3j2.js:248887-249162 placement
/**
 * 开始在远程会话中落地一次模式切换：生成 id 并记为该会话的待处理切换。
 */
function beginModeLanding(setAppState, sessionId, mode, from) {
  let landingId = randomUUID();
  setAppState((appState) => {
    let sessions = updateSessionEntry(appState.remoteModeSessions, sessionId, (entry) =>
      entry === undefined
        ? undefined
        : {
            ...entry,
            outstanding: {
              id: landingId,
              kind: "landing",
              mode,
              origin: "person",
              from,
              workerHolds: undefined,
            },
          },
    );
    return sessions === appState.remoteModeSessions
      ? appState
      : {
          ...appState,
          remoteModeSessions: sessions,
        };
  });
  return landingId;
}
//@ chunk-czq1j3j2.js:249162-249347 placement
/**
 * 清除远程会话中指定 id 的待处理模式切换。
 */
function clearOutstandingMode(setAppState, sessionId, convergeEntry) {
  setAppState((appState) => {
    let sessions = updateSessionEntry(appState.remoteModeSessions, sessionId, (entry) =>
      entry?.outstanding?.id === convergeEntry
        ? {
            ...entry,
            outstanding: null,
          }
        : entry,
    );
    return sessions === appState.remoteModeSessions
      ? appState
      : {
          ...appState,
          remoteModeSessions: sessions,
        };
  });
}
//@ chunk-czq1j3j2.js:249347-249487 placement
function setOutstandingMode(setAppState, sessionRef, outstanding, previous) {
  updateRemoteModeSession(
    setAppState,
    sessionRef,
    (entry) =>
      entry.outstanding === outstanding || (previous !== undefined && entry.outstanding?.id !== previous.id)
        ? entry
        : {
            ...entry,
            outstanding,
          },
    outstanding === null && previous !== undefined,
  );
}
//@ chunk-czq1j3j2.js:249487-259657 placement
/**
 * 云会话权限模式同步：本地按 shift+tab 改模式时推送 set_permission_mode 并等待 ack，远端广播模式变化时落地到本地，冲突/超时时回退并通知（remote-permission-mode-unsynced/rejected）。
 */
function useRemotePermissionModeSync(store, retryDelaysMs = MODE_PUSH_RETRY_DELAYS_MS) {
  let activeRemote = useStoreSelector(store, (state) => state.activeRemote);
  let modeWire = store.modeWire;
  let session = useSession();
  let toolPermissionContext = useAppState((appState) => appState.toolPermissionContext);
  let mode = toolPermissionContext.mode;
  let lastApplied = modeWire.lastApplied;
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let { addNotification } = useNotifications();
  let initializedRef = useRef(false);
  let chipRef = useRef({
    mode,
    context: toolPermissionContext,
    origin: "person",
    autoModeActive: isAutoModeActive(),
  });
  let sawLabelRef = useRef(false);
  let pendingPushRef = useRef(null);
  let queuedPushRef = useRef(null);
  let queuedPush = queuedPushRef.current;
  let convergeTimerRef = useRef(null);
  let lastAppliedRef = useRef(null);
  let sendSeqRef = useRef(0);
  let chipSeqRef = useRef(0);
  let labelRef = useRef(null);
  let wasBubbleRef = useRef(false);
  let mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
      convergeTimerRef.current = null;
    },
    [],
  );
  let screenRef = useRef(0);
  let sessionIdRef = useRef(undefined);
  let sessionId = activeRemote.isRemoteMode ? activeRemote.sessionId : undefined;
  useLayoutEffect(() => {
    let activeRemote = store.getSnapshot().activeRemote;
    let sessionId = activeRemote.isRemoteMode ? activeRemote.sessionId : undefined;
    if (sessionId === undefined || sessionId === sessionIdRef.current) return;
    sessionIdRef.current = sessionId;
    let nextScreen = (appStoreDirect.getState().remoteModeSessions[sessionId]?.screen ?? 0) + 1;
    screenRef.current = nextScreen;
    updateRemoteModeSession(
      setAppState,
      {
        id: sessionId,
        screen: nextScreen,
      },
      (entry) => ({
        ...entry,
        screen: nextScreen,
      }),
    );
  }, [store, sessionId, appStoreDirect, setAppState]);
  useEffect(() => {
    if (!activeRemote.isRemoteMode || !activeRemote.caps.controlChannel || activeRemote.viewerOnly) {
      convergeTimerRef.current = null;
      return;
    }
    let canSync = () => isDeviceIdentityEnabledCached() && activeRemote.caps.sessionRecord;
    let deviceSync = canSync();
    let sessionRef =
      activeRemote.sessionId === undefined
        ? null
        : {
            id: activeRemote.sessionId,
            screen: screenRef.current,
          };
    let isStale = () =>
      canSync() &&
      (!mountedRef.current ||
        (sessionRef !== null &&
          (appStoreDirect.getState().remoteModeSessions[sessionRef.id]?.screen ?? sessionRef.screen) !==
            sessionRef.screen));
    if (!initializedRef.current) {
      initializedRef.current = true;
      let entry =
        sessionRef === null ? undefined : appStoreDirect.getState().remoteModeSessions[sessionRef.id];
      if (entry?.label) {
        sawLabelRef.current = true;
        let mode = chipRef.current.mode;
        chipRef.current = {
          ...chipRef.current,
          origin: entry.label.mode === mode ? entry.label.origin : "wire",
        };
        if (mode === "bubble" && entry.label.mode !== "bubble") labelRef.current = entry.label;
        let outstanding = entry.outstanding;
        if (outstanding !== null) setOutstandingMode(setAppState, sessionRef, null);
        let isCurrentMode = (mode_2) =>
          mode_2 === mode && appStoreDirect.getState().toolPermissionContext.mode === mode_2;
        let landedElsewhere =
          outstanding?.kind === "landing" &&
          deviceSync &&
          outstanding.from !== outstanding.mode &&
          (entry.applied === null || entry.applied.mode === outstanding.mode) &&
          (entry.label.mode === outstanding.mode ||
            (outstanding.was !== undefined && entry.label.mode === outstanding.was));
        if (
          outstanding?.kind === "press" &&
          deviceSync &&
          isCurrentMode(outstanding.mode) &&
          mode !== "bubble"
        )
          chipRef.current = {
            mode: outstanding.fallback,
            origin: outstanding.fallbackOrigin,
            context: {
              ...chipRef.current.context,
              mode: outstanding.fallback,
            },
            autoModeActive: isAutoModeActive(),
            carried: true,
          };
        else if (outstanding?.kind === "landing" && landedElsewhere && isCurrentMode(outstanding.mode)) {
          chipRef.current = {
            ...chipRef.current,
            mode: outstanding.from,
            origin: "wire",
          };
          pendingPushRef.current = {
            mode: outstanding.mode,
            origin: outstanding.origin,
            push: true,
            workerHolds: outstanding.workerHolds,
          };
        } else if (outstanding?.kind === "landing" && landedElsewhere && mode !== "bubble") {
          let adoptedPush = {
            mode: outstanding.mode,
            origin: outstanding.origin,
            push: true,
            workerHolds: outstanding.workerHolds,
            from: outstanding.from,
          };
          setPermissionModeWithGuards(
            outstanding.mode,
            appStoreDirect.getState().toolPermissionContext,
            (applyContext) => {
              setAppState((appState) => {
                if (appState.toolPermissionContext.mode !== mode) return appState;
                pendingPushRef.current = adoptedPush;
                queuedPushRef.current = adoptedPush;
                return {
                  ...appState,
                  toolPermissionContext: applyContext(appState.toolPermissionContext),
                };
              });
            },
          );
        }
      } else {
        chipRef.current = {
          ...chipRef.current,
          origin: "wire",
        };
        wasBubbleRef.current = chipRef.current.mode === "bubble";
      }
    }
    let chipBefore = chipRef.current;
    let applied = modeWire.applied;
    modeWire.applied = null;
    let newApplied = lastApplied !== lastAppliedRef.current ? lastApplied : undefined;
    lastAppliedRef.current = lastApplied;
    let appliedMatches = deviceSync ? newApplied?.mode === mode : applied === mode;
    let workerApplied =
      deviceSync && sessionRef !== null
        ? (appStoreDirect.getState().remoteModeSessions[sessionRef.id]?.applied ?? null)
        : null;
    let confirmedMode = !appliedMatches && workerApplied?.mode === mode ? workerApplied : null;
    if (
      workerApplied !== null &&
      (workerApplied.mode === mode ||
        workerApplied.mode !== appStoreDirect.getState().toolPermissionContext.mode)
    )
      updateRemoteModeSession(setAppState, sessionRef, (entry) =>
        entry.applied === null
          ? entry
          : {
              ...entry,
              applied: null,
            },
      );
    let landedConfirmed = appliedMatches || confirmedMode !== null;
    let origin =
      confirmedMode !== null
        ? confirmedMode.origin
        : deviceSync && newApplied?.own === true
          ? "person"
          : "wire";
    if (landedConfirmed && origin === "person")
      updateRemoteModeSession(setAppState, sessionRef, (entry) =>
        entry.outstanding?.kind === "landing" &&
        entry.outstanding.was !== undefined &&
        entry.outstanding.mode === mode
          ? {
              ...entry,
              outstanding: null,
            }
          : entry,
      );
    if (chipBefore.mode === mode || mode === "bubble") {
      if (mode === "bubble" && chipBefore.mode !== "bubble")
        labelRef.current =
          deviceSync && newApplied
            ? {
                mode: newApplied.mode,
                origin,
              }
            : {
                mode: chipBefore.mode,
                origin: chipBefore.origin,
              };
      if (deviceSync && mode !== "bubble" && queuedPush && pendingPushRef.current === queuedPush)
        pendingPushRef.current = null;
      chipRef.current = {
        mode,
        context: toolPermissionContext,
        origin: deviceSync && landedConfirmed ? origin : chipBefore.origin,
        autoModeActive: isAutoModeActive(),
      };
      if (mode !== "bubble") setSessionModeLabel(setAppState, sessionRef, mode, chipRef.current.origin);
      return;
    }
    let pendingPush = pendingPushRef.current;
    pendingPushRef.current = null;
    let savedLabel = labelRef.current;
    labelRef.current = null;
    let wasBubble = wasBubbleRef.current;
    wasBubbleRef.current = false;
    let bubbleOrigin =
      chipBefore.mode !== "bubble"
        ? undefined
        : savedLabel?.mode === mode
          ? savedLabel.origin
          : wasBubble && isModeMorePermissiveThan(mode, "default")
            ? "wire"
            : undefined;
    let pushMatchesMode = pendingPush?.mode === mode;
    let adoptLocal =
      !(deviceSync && pushMatchesMode) && (landedConfirmed || (deviceSync && bubbleOrigin === "wire"));
    chipSeqRef.current += 1;
    let chipSeq = chipSeqRef.current;
    chipRef.current = {
      mode,
      context: toolPermissionContext,
      origin: adoptLocal
        ? landedConfirmed
          ? origin
          : "wire"
        : pendingPush?.mode === mode
          ? pendingPush.origin
          : (bubbleOrigin ?? "person"),
      autoModeActive: isAutoModeActive(),
    };
    setSessionModeLabel(setAppState, sessionRef, mode, chipRef.current.origin);
    if (convergeTimerRef.current !== null)
      updateRemoteModeSession(setAppState, sessionRef, (entry) =>
        entry.outstanding?.kind === "landing"
          ? {
              ...entry,
              outstanding: null,
            }
          : entry,
      );
    convergeTimerRef.current = null;
    if (adoptLocal) {
      settlePendingModeAck(session, mode);
      return;
    }
    let revertedMode = mode;
    let origin_2 = deviceSync ? chipRef.current.origin : "wire";
    if (deviceSync && pushMatchesMode && pendingPush?.push === false) {
      logForDebugging(`[remote] reverted to ${revertedMode}; nothing re-sent`);
      return;
    }
    let workerHolds = deviceSync && pushMatchesMode ? pendingPush?.workerHolds : undefined;
    let from = deviceSync && pushMatchesMode ? (pendingPush?.from ?? chipBefore.mode) : chipBefore.mode;
    let rememberPush = (push) => {
      pendingPushRef.current = push;
      queuedPushRef.current = push;
    };
    let seq = modeWire.lastBroadcast?.seq ?? 0;
    let revertChip = (notification, silent = false) => {
      if (
        isStale() ||
        workerHolds === undefined ||
        chipSeqRef.current !== chipSeq ||
        appStoreDirect.getState().toolPermissionContext.mode !== revertedMode
      )
        return;
      if ((modeWire.lastBroadcast?.seq ?? 0) !== seq) {
        if (!silent && modeWire.lastBroadcast?.mode !== revertedMode) addNotification(notification);
        return;
      }
      if (!silent) addNotification(notification);
      if (
        setPermissionModeWithGuards(
          workerHolds,
          appStoreDirect.getState().toolPermissionContext,
          (applyContext) => {
            setAppState((appState) => {
              if (appState.toolPermissionContext.mode !== revertedMode) return appState;
              let toolPermissionContext = applyContext(appState.toolPermissionContext);
              rememberPush({
                mode: workerHolds,
                origin: "wire",
                push: false,
              });
              return {
                ...appState,
                toolPermissionContext,
              };
            });
          },
        ).ok
      )
        logForDebugging(
          `[remote] the cloud session did not take ${revertedMode} after the landing; chip back on ${workerHolds}, which it still holds`,
        );
    };
    let pushMode = (delayIndex, landing) => {
      let lastSeq = modeWire.lastSeq;
      let latestOwnSend = getLatestOwnSend(modeWire);
      let ownSendAdvanced = latestOwnSend !== modeWire.ownSent;
      let ownSend = recordOwnSend(modeWire, revertedMode, origin_2);
      if (!landing) sendSeqRef.current += 1;
      let sendSeq = sendSeqRef.current;
      let outstanding = !deviceSync
        ? null
        : landing
          ? {
              id: randomUUID(),
              kind: "landing",
              mode: revertedMode,
              origin: origin_2,
              from,
              workerHolds,
            }
          : {
              id: randomUUID(),
              kind: "press",
              mode: revertedMode,
              fallback: chipBefore.mode,
              fallbackOrigin: chipBefore.origin,
            };
      let clearOutstanding = () => {
        if (outstanding !== null) setOutstandingMode(setAppState, sessionRef, null, outstanding);
      };
      if (outstanding !== null) setOutstandingMode(setAppState, sessionRef, outstanding);
      activeRemote
        .sendControlRequest({
          subtype: "set_permission_mode",
          mode: revertedMode,
        })
        .then(() => {
          clearOutstanding();
          recordOwnAck(modeWire, {
            mode: revertedMode,
            origin: origin_2,
            sent: deviceSync ? ownSend : modeWire.ownSends,
          });
          settlePendingModeAck(session, revertedMode);
          if (!landing) logFeatureOk("mode_switch");
        })
        .catch((error) => {
          settlePendingModeAck(session, revertedMode, toError(error));
          logForDebugging(`[remote] set_permission_mode rejected: ${errorMessage(error)}`);
          let undelivered = error instanceof ControlRequestNotDeliveredError;
          let errorKind = classifyControlRequestError(error);
          if (isStale()) {
            if (!landing) logFeatureBad("mode_switch", errorKind);
            return;
          }
          if (!(landing && undelivered)) clearOutstanding();
          let disconnected =
            (errorKind === "disconnected" || errorKind === "not_connected") &&
            appStoreDirect.getState().remoteConnectionStatus !== "connected";
          if (landing) {
            if (undelivered) retryConvergence(delayIndex, sendSeq, ownSend, clearOutstanding);
            else revertChip(notifyRemoteModeRejected(revertedMode), disconnected);
            return;
          }
          let inCloudSession = canSync();
          let mode = appStoreDirect.getState().toolPermissionContext.mode;
          let chipMoved = mode !== revertedMode;
          let lastBroadcast = modeWire.lastBroadcast;
          let workerReportedMode = lastBroadcast?.mode === revertedMode && lastBroadcast.seq > lastSeq;
          let latestOwn = inCloudSession ? getLatestOwnSend(modeWire) : null;
          let ownSendSuperseded =
            latestOwn !== null &&
            latestOwn === modeWire.ownSent &&
            latestOwn.mode === revertedMode &&
            latestOwn.sent > ownSend;
          let chipMovedUnexpectedly =
            inCloudSession &&
            chipMoved &&
            (mode === chipRef.current.mode ||
              (modeWire.lastApplied !== lastAppliedRef.current && modeWire.lastApplied?.mode === mode)) &&
            sendSeq === sendSeqRef.current &&
            !disconnected &&
            !workerReportedMode &&
            !ownSendSuperseded;
          let failureReason =
            ownSendAdvanced || getLatestOwnSend(modeWire) !== modeWire.ownSent
              ? `${errorKind}_after_unrecorded_answer`
              : errorKind;
          if (chipMovedUnexpectedly) {
            let sentWider =
              !undelivered && isModeMorePermissiveThan(modeWire.ownSent?.mode ?? revertedMode, mode);
            logFeatureBad("mode_switch", `${failureReason}_chip_moved${sentWider ? "_sent_wider" : ""}`, {
              pressed: fromEnum(revertedMode),
              chip: fromEnum(mode),
            });
          } else logFeatureBad("mode_switch", failureReason);
          let notifyFailure = () => {
            if (disconnected && inCloudSession) return;
            addNotification(
              undelivered
                ? notifyRemoteModeUnreachable(revertedMode)
                : notifyRemoteModeRejected(revertedMode),
            );
          };
          if (chipMoved || (inCloudSession && sendSeq !== sendSeqRef.current)) {
            if (chipMovedUnexpectedly && errorKind !== "timeout") notifyFailure();
            return;
          }
          let retargetPush = (outgoingMode) => {
            if (!inCloudSession) return outgoingMode;
            let heldMode = outgoingMode.workerHolds ?? outgoingMode.mode;
            if (!outgoingMode.push) return outgoingMode;
            if (latestOwnSend === null)
              return sawLabelRef.current && isModeMorePermissiveThan(outgoingMode.mode, "default")
                ? {
                    mode: "default",
                    origin: "person",
                    push: true,
                    workerHolds: heldMode,
                  }
                : outgoingMode;
            if (!isModeMorePermissiveThan(outgoingMode.mode, latestOwnSend.mode)) return outgoingMode;
            if (latestOwnSend.mode === revertedMode)
              return {
                mode: heldMode,
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
                  workerHolds: heldMode,
                }
              : {
                  mode: "default",
                  origin: "person",
                  push: true,
                  workerHolds: heldMode,
                };
          };
          if (workerReportedMode) {
            logForDebugging(
              `[remote] set_permission_mode ${revertedMode} failed, but the worker has since reported ${revertedMode} itself \u2014 keeping it`,
            );
            return;
          }
          if (
            latestOwn !== null &&
            latestOwn.sent > ownSend &&
            (latestOwn === modeWire.ownSent || latestOwn.mode !== revertedMode)
          ) {
            if (ownSendSuperseded) return;
            let mode = guardPermissionModeChange(
              latestOwn.mode,
              appStoreDirect.getState().toolPermissionContext,
            ).ok
              ? latestOwn.mode
              : "default";
            let outgoing = {
              mode,
              origin: "person",
              push: true,
              workerHolds: lastBroadcast?.mode ?? chipBefore.mode,
            };
            setPermissionModeWithGuards(
              mode,
              appStoreDirect.getState().toolPermissionContext,
              (applyContext) => {
                setAppState((appState) => {
                  if (appState.toolPermissionContext.mode !== revertedMode) return appState;
                  rememberPush(outgoing);
                  return {
                    ...appState,
                    toolPermissionContext: applyContext(appState.toolPermissionContext),
                  };
                });
              },
            );
            notifyFailure();
            return;
          }
          let ownAck = modeWire.ownAck;
          let ownAckConfirmed =
            ownAck !== null &&
            (!lastBroadcast ||
              lastBroadcast.seq <= ownAck.afterBroadcastSeq ||
              (lastBroadcast.mode === ownAck.mode && modeWire.lastChangeSeq <= ownAck.afterBroadcastSeq + 1));
          let mode_2 = ownAckConfirmed ? ownAck.mode : lastBroadcast?.mode;
          if (mode_2 !== undefined && mode_2 !== chipBefore.mode) {
            if (mode_2 === revertedMode) {
              logForDebugging(
                `[remote] set_permission_mode ${revertedMode} failed; ${revertedMode} is the worker's last confirmed mode \u2014 keeping it and re-sending`,
              );
              pushMode(0, true);
              return;
            }
            let outgoing = retargetPush(
              resolveOutgoingMode(
                revertedMode,
                mode_2,
                resolveModeOrigin({
                  fallback: mode_2,
                  label: "wire",
                  acked: ownAck,
                  confirmedByAck: ownAckConfirmed,
                  sentBefore: latestOwnSend,
                  inCloudSession,
                }),
                inCloudSession,
              ),
            );
            let mode = outgoing.mode;
            if (
              setPermissionModeWithGuards(
                mode,
                appStoreDirect.getState().toolPermissionContext,
                (applyContext) => {
                  setAppState((appState) => {
                    if (appState.toolPermissionContext.mode !== revertedMode) return appState;
                    let toolPermissionContext = applyContext(appState.toolPermissionContext);
                    rememberPush(outgoing);
                    return {
                      ...appState,
                      toolPermissionContext,
                    };
                  });
                },
              ).ok
            ) {
              logForDebugging(
                `[remote] set_permission_mode ${revertedMode} failed; going to ${mode} (the worker's last confirmed mode is ${mode_2}; the chip was on ${chipBefore.mode}, never confirmed)`,
              );
              notifyFailure();
              return;
            }
          }
          let outgoing = retargetPush(
            resolveOutgoingMode(
              revertedMode,
              chipBefore.mode,
              resolveModeOrigin({
                fallback: chipBefore.mode,
                label: chipBefore.origin,
                acked: ownAck,
                confirmedByAck: ownAckConfirmed,
                sentBefore: latestOwnSend,
                inCloudSession,
              }),
              inCloudSession,
            ),
          );
          let applyMode = (mode, push) =>
            setPermissionModeWithGuards(
              mode,
              appStoreDirect.getState().toolPermissionContext,
              (applyContext) => {
                setAppState((appState) => {
                  if (appState.toolPermissionContext.mode !== revertedMode) return appState;
                  let toolPermissionContext = applyContext(appState.toolPermissionContext);
                  rememberPush(push);
                  return {
                    ...appState,
                    toolPermissionContext,
                  };
                });
              },
            );
          if (outgoing.mode !== chipBefore.mode || chipBefore.carried) {
            if (applyMode(outgoing.mode, outgoing).ok) {
              logForDebugging(
                `[remote] set_permission_mode ${revertedMode} failed; going to ${outgoing.mode}${outgoing.mode === chipBefore.mode ? " (the mode before a press carried from an earlier screen)" : ` \u2014 ${chipBefore.mode} is not re-posted as the person's`}`,
              );
              notifyFailure();
              return;
            }
          }
          if (
            chipBefore.carried ||
            !guardPermissionModeChange(chipBefore.mode, appStoreDirect.getState().toolPermissionContext).ok
          ) {
            if (revertedMode !== "default")
              applyMode("default", {
                mode: "default",
                origin: "person",
                push: true,
                workerHolds: outgoing.workerHolds ?? outgoing.mode,
              });
            else pushMode(0, true);
            logForDebugging(
              `[remote] set_permission_mode ${revertedMode} failed; ${chipBefore.mode} can no longer be entered here, so the chip is on default`,
            );
            notifyFailure();
            if (disconnected && inCloudSession) addNotification(notifyRemoteModeUnsynced());
            return;
          }
          setAppState((appState) => {
            if (appState.toolPermissionContext.mode !== revertedMode) return appState;
            let restoredChip = {
              ...chipBefore,
              context: undonePermissionContext(chipBefore.context, appState.toolPermissionContext),
            };
            let toolPermissionContext = isDeviceIdentityEnabledCached()
              ? applyPermissionModeRevertEffects(appState.toolPermissionContext, restoredChip)
              : restoredChip.context;
            rememberPush(outgoing);
            return {
              ...appState,
              toolPermissionContext,
            };
          });
          notifyFailure();
        });
    };
    let retryConvergence = (delayIndex, sendSeq, ownSendSeq, clearOutstanding) => {
      let chipMovedSince = () => canSync() && sendSeqRef.current !== sendSeq;
      let workerSettled = () => {
        let latestOwnSend = getLatestOwnSend(modeWire);
        if (
          !canSync() ||
          isStale() ||
          latestOwnSend === null ||
          latestOwnSend.sent <= ownSendSeq ||
          latestOwnSend.mode === revertedMode
        )
          return false;
        setPermissionModeWithGuards(
          latestOwnSend.mode,
          appStoreDirect.getState().toolPermissionContext,
          (applyContext) => {
            setAppState((appState) => {
              if (appState.toolPermissionContext.mode !== revertedMode) return appState;
              rememberPush({
                mode: latestOwnSend.mode,
                origin: "person",
                push: true,
                workerHolds,
                from,
              });
              return {
                ...appState,
                toolPermissionContext: applyContext(appState.toolPermissionContext),
              };
            });
          },
        );
        return true;
      };
      if (chipMovedSince()) {
        clearOutstanding();
        revertChip(notifyRemoteModeUnreachable(revertedMode), true);
        return;
      }
      if (workerSettled()) {
        clearOutstanding();
        return;
      }
      let delayMs = retryDelaysMs[delayIndex];
      if (delayMs === undefined) {
        logForDebugging(
          `[remote] convergence push of ${revertedMode} mode still undelivered after ${delayIndex + 1} attempts \u2014 giving up`,
          {
            level: "warn",
          },
        );
        if (workerHolds !== undefined) {
          clearOutstanding();
          revertChip(notifyRemoteModeUnreachable(revertedMode));
          return;
        }
        addNotification(notifyRemoteModeUnsynced());
        return;
      }
      let timerToken = {
        broadcastSeq: modeWire.lastBroadcast?.seq ?? 0,
      };
      convergeTimerRef.current = timerToken;
      sleep(delayMs).then(() => {
        if (convergeTimerRef.current !== timerToken || isStale()) return;
        convergeTimerRef.current = null;
        if (
          (modeWire.lastBroadcast?.seq ?? 0) !== timerToken.broadcastSeq ||
          appStoreDirect.getState().toolPermissionContext.mode !== revertedMode ||
          chipMovedSince()
        ) {
          clearOutstanding();
          revertChip(notifyRemoteModeUnreachable(revertedMode));
          return;
        }
        if (workerSettled()) {
          clearOutstanding();
          return;
        }
        pushMode(delayIndex + 1, true);
      });
    };
    pushMode(0, pushMatchesMode);
  }, [
    session,
    mode,
    toolPermissionContext,
    lastApplied,
    queuedPush,
    activeRemote,
    setAppState,
    addNotification,
    appStoreDirect,
    modeWire,
    retryDelaysMs,
  ]);
}
//@ chunk-czq1j3j2.js:259657-259876 placement
function notifyRemoteModeUnsynced() {
  return {
    key: "remote-permission-mode-unsynced",
    kind: "feedback",
    text: "Couldn't reach the cloud session \u2014 permission mode may be out of sync \xB7 shift+tab to retry",
    color: "warning",
    priority: "immediate",
  };
}
//@ chunk-czq1j3j2.js:259876-260053 placement
function notifyRemoteModeUnreachable(mode) {
  return {
    key: "remote-permission-mode-rejected",
    kind: "feedback",
    text: `Couldn't reach the cloud session to switch to ${mode} mode`,
    color: "warning",
    priority: "immediate",
  };
}
//@ chunk-czq1j3j2.js:260053-260222 placement
function notifyRemoteModeRejected(mode) {
  return {
    key: "remote-permission-mode-rejected",
    kind: "feedback",
    text: `Remote session couldn't switch to ${permissionModeTitle(mode)} mode`,
    color: "warning",
    priority: "immediate",
  };
}
export {
  registerPendingModeAck,
  ModePushTimeoutError,
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
};
