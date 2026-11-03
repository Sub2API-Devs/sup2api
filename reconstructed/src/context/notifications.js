/**
 * context/notifications.tsx
 *
 * 通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/context/notifications.tsx
 * pieces: chunk-0h4e7gnq.js (5), chunk-jvez4qde.js (20)
 * attribution: fingerprint 2, placement 22, layout 1
 */
import { j, qt, y, Se, zt, ce, P } from "../../vendor/react/cjs/react.production.js";
import { tE } from "../utils/permissions/currentPermissionContext.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { uiSignals } from "../state/uiSignals.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { resolveRenderMode, RenderModeContext } from "../ink/renderModeContext.js";
import { Cr, useSetAppState } from "../state/AppState.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { Yn } from "../utils/stripAnsi.js";

//@ chunk-jvez4qde.js:506-510 placement
j();
//@ chunk-jvez4qde.js:510-537 placement
function Ynn() {
  return tE();
}
//@ chunk-jvez4qde.js:537-569 placement
function U(i) {
  return i.mounts > 0;
}
/**
 * 从通知状态（当前、队列、置顶）中移除指定 key 的通知；不存在时原样返回。
 */
//@ chunk-jvez4qde.js:569-818 placement
function removeNotificationByKey(i, n) {
  let a = i.current?.key === n,
    any = i.queue.some((s) => s.key === n),
    any_2 = i.pinned.some((s) => s.key === n);
  if (!a && !any && !any_2) return i;
  return {
    current: a ? null : i.current,
    queue: i.queue.filter((s) => s.key !== n),
    pinned: any_2 ? i.pinned.filter((s) => s.key !== n) : i.pinned,
  };
}
//@ chunk-jvez4qde.js:818-878 placement
function Kj(i) {
  return i.diffPanelVisible || i.paneHoldsToasts;
}
//@ chunk-jvez4qde.js:878-950 placement
function bye(i, n) {
  return i !== null && (!n || i.exemptFromDiffPanelHold === !0);
}
//@ chunk-jvez4qde.js:950-1014 placement
function KDe(i, n) {
  return n && i !== null && MRr(i)?.surface === "gauge";
}
//@ chunk-jvez4qde.js:1014-1057 placement
function pTe() {
  return useStoreSelector(uiSignals.headerGauge, U);
}
//@ chunk-jvez4qde.js:1057-1070 placement
var RUn = 8000;
//@ chunk-jvez4qde.js:1070-1198 placement
function createNotificationHostState() {
  return {
    clearTimer: { current: null },
    mountCount: { current: 0 },
    transcriptSink: { registered: null },
    saidInTranscript: new Map(),
  };
}
//@ chunk-jvez4qde.js:1198-1213 placement
var x = qt(null);
/**
 * 通知上下文 Provider：为子树提供一份通知宿主状态（清除定时器、挂载计数、转录输出槽等）。
 */
//@ chunk-jvez4qde.js:1213-1367 placement
function NotificationsProvider(i) {
  let N = w(3),
    { children: children } = i,
    [a] = y(createNotificationHostState),
    m;
  if (N[0] !== children || N[1] !== a)
    ((m = e(x.Provider, { value: a, children: children })), (N[0] = children), (N[1] = a), (N[2] = m));
  else m = N[2];
  return m;
}
//@ chunk-jvez4qde.js:1367-1467 placement
function shouldRouteToFullscreenNotices({
  presentationContext: presentationContext,
  isScreenReaderEnabled: isScreenReaderEnabled,
}) {
  return Ynn() && !isScreenReaderEnabled && resolveRenderMode(presentationContext) === "fullscreen";
}
//@ chunk-jvez4qde.js:1467-1619 placement
function routeNotificationToTranscript(
  i,
  { transcriptSink: transcriptSink, saidInTranscript: saidInTranscript },
  N,
) {
  if (!1)
    switch (m.routeNotification(i.key, !0)) {
      case "suppress":
      case "queue":
      case "transcript":
    }
  return i;
}
//@ chunk-jvez4qde.js:1619-1642 placement
function MRr(i) {
  return;
}
/**
 * 把一个转录输出函数注册为通知的 transcriptSink，卸载时注销。
 */
//@ chunk-jvez4qde.js:1642-1816 placement
function useRegisterNotificationTranscriptSink(i) {
  let n = Se(x);
  zt(() => {
    if (n === null) return;
    return (
      (n.transcriptSink.registered = i),
      () => {
        if (n.transcriptSink.registered === i) n.transcriptSink.registered = null;
      }
    );
  }, [n, i]);
}
/**
 * 通知队列 hook：addNotification/removeNotification，按优先级出队、immediate 抢占、超时自动移除、diff 面板期间暂缓。
 */
//@ chunk-jvez4qde.js:1816-5286 fingerprint = useNotifications (0.595)
function useNotifications() {
  let store = Cr(),
    setAppState = useSetAppState(),
    a = useClock(),
    N = Se(x),
    [m] = y(createNotificationHostState),
    s = N ?? m,
    { clearTimer: clearTimer, mountCount: mountCount } = s,
    S = Se(RenderModeContext),
    h = useIsScreenReaderEnabled(),
    processQueue = ce(() => {
      let p = shouldRouteToFullscreenNotices({ presentationContext: S, isScreenReaderEnabled: h }),
        r = Ynn()
          ? store
              .getState()
              .notifications.queue.filter((prev) => routeNotificationToTranscript(prev, s, p) === "handled")
          : [];
      setAppState((u) => {
        let t =
            r.length === 0
              ? u
              : {
                  ...u,
                  notifications: {
                    ...u.notifications,
                    queue: u.notifications.queue.filter((f) => !r.includes(f)),
                  },
                },
          next = _(
            Kj(t) ? t.notifications.queue.filter((f) => f.exemptFromDiffPanelHold) : t.notifications.queue,
          );
        if (!next) return t;
        let k =
          t.notifications.current !== null &&
          next.priority === "immediate" &&
          next.heldDuringDiffPanel === !0 &&
          t.notifications.current.priority !== "immediate"
            ? t.notifications.current
            : null;
        if (t.notifications.current !== null && k === null) return t;
        let key = next.key;
        return (
          clearTimer.current?.(),
          (clearTimer.current = a.setTimeout(() => {
            ((clearTimer.current = null),
              setAppState((prev) => {
                if (prev.notifications.current?.key !== key) return prev;
                return { ...prev, notifications: { ...prev.notifications, current: null } };
              }),
              processQueue());
          }, next.timeoutMs ?? RUn)),
          {
            ...t,
            notifications: {
              ...t.notifications,
              queue: [
                ...(k !== null && isRequeueableOnPreempt(k, next) ? [k] : []),
                ...t.notifications.queue.filter((f) => f !== next),
              ],
              current: next.heldDuringDiffPanel ? { ...next, heldDuringDiffPanel: void 0 } : next,
            },
          }
        );
      });
    }, [setAppState, store, s, clearTimer, a, S, h]),
    addNotification = ce(
      (notif) => {
        let r = Ynn()
          ? routeNotificationToTranscript(
              notif,
              s,
              shouldRouteToFullscreenNotices({ presentationContext: S, isScreenReaderEnabled: h }),
            )
          : notif;
        if (r === "handled") return;
        if (r.pinned) {
          setAppState((t) => {
            if (t.notifications.pinned.some((c) => c.key === r.key)) return t;
            return { ...t, notifications: { ...t.notifications, pinned: [...t.notifications.pinned, r] } };
          });
          return;
        }
        if (r.priority === "immediate" && r.waitsItsTurn !== !0 && !Kj(store.getState())) {
          if (clearTimer.current) (clearTimer.current(), (clearTimer.current = null));
          ((clearTimer.current = a.setTimeout(() => {
            ((clearTimer.current = null),
              setAppState((prev) => {
                if (prev.notifications.current?.key !== r.key) return prev;
                return {
                  ...prev,
                  notifications: {
                    ...prev.notifications,
                    queue: prev.notifications.queue.filter((c) => !r.invalidates?.includes(c.key)),
                    current: null,
                  },
                };
              }),
              processQueue());
          }, r.timeoutMs ?? RUn)),
            setAppState((prev) => ({
              ...prev,
              notifications: {
                ...prev.notifications,
                current: r,
                queue: [
                  ...(prev.notifications.current ? [prev.notifications.current] : []),
                  ...prev.notifications.queue,
                ].filter((c) => isRequeueableOnPreempt(c, r)),
              },
            })));
          return;
        }
        let u = r.priority === "immediate" ? { ...r, heldDuringDiffPanel: !0 } : r;
        (setAppState((prev) => {
          if (u.fold && prev.notifications.current?.key === u.key) {
            let folded = u.fold(prev.notifications.current, u);
            if (clearTimer.current) (clearTimer.current(), (clearTimer.current = null));
            let key = folded.key;
            return (
              (clearTimer.current = a.setTimeout(() => {
                ((clearTimer.current = null),
                  setAppState((R) => {
                    if (R.notifications.current?.key !== key) return R;
                    return { ...R, notifications: { ...R.notifications, current: null } };
                  }),
                  processQueue());
              }, folded.timeoutMs ?? RUn)),
              { ...prev, notifications: { ...prev.notifications, current: folded } }
            );
          }
          let c = u.fold ? prev.notifications.queue.findIndex((l) => l.key === u.key) : -1;
          if (u.fold && c !== -1) {
            let folded = u.fold(prev.notifications.queue[c], u),
              newQueue = [...prev.notifications.queue];
            return (
              (newQueue[c] = folded),
              { ...prev, notifications: { ...prev.notifications, queue: newQueue } }
            );
          }
          if (!(
            !new Set(prev.notifications.queue.map((l) => l.key)).has(u.key) &&
            prev.notifications.current?.key !== u.key
          ))
            return prev;
          let f =
            prev.notifications.current !== null && u.invalidates?.includes(prev.notifications.current.key);
          if (f && clearTimer.current) (clearTimer.current(), (clearTimer.current = null));
          return {
            ...prev,
            notifications: {
              ...prev.notifications,
              current: f ? null : prev.notifications.current,
              queue: [...prev.notifications.queue.filter((l) => isRequeueableOnPreempt(l, u)), u],
            },
          };
        }),
          processQueue());
      },
      [setAppState, store, s, processQueue, clearTimer, a, S, h],
    ),
    removeNotification = ce(
      (key) => {
        (setAppState((prev) => {
          let u = removeNotificationByKey(prev.notifications, key);
          if (u === prev.notifications) return prev;
          if (prev.notifications.current?.key === key && clearTimer.current)
            (clearTimer.current(), (clearTimer.current = null));
          return { ...prev, notifications: u };
        }),
          processQueue());
      },
      [setAppState, processQueue, clearTimer, s, S, h],
    );
  return (
    P(() => {
      if ((mountCount.current++, store.getState().notifications.queue.length > 0)) processQueue();
      return () => {
        if ((mountCount.current--, mountCount.current === 0 && clearTimer.current))
          (clearTimer.current(), (clearTimer.current = null));
      };
    }, []),
    { addNotification: addNotification, removeNotification: removeNotification, processQueue: processQueue }
  );
}
/**
 * 通知优先级排序值：immediate 0、high 1、medium 2、low 3。
 */
//@ chunk-jvez4qde.js:5286-5330 layout = PRIORITIES (1)
var PRIORITIES = { immediate: 0, high: 1, medium: 2, low: 3 };
//@ chunk-jvez4qde.js:5330-5465 placement
function isRequeueableOnPreempt(i, n) {
  return (
    (i.priority !== "immediate" || i.requeueOnPreempt === !0 || i.heldDuringDiffPanel === !0) &&
    !n.invalidates?.includes(i.key)
  );
}
//@ chunk-jvez4qde.js:5465-5562 placement
function _(i) {
  if (i.length === 0) return;
  return i.reduce((n, a) => (PRIORITIES[a.priority] < PRIORITIES[n.priority] ? a : n));
}
/**
 * 通知 color 字符串最长 64。
 */
//@ chunk-0h4e7gnq.js:40882-40987 fingerprint = PRIORITIES (1)
var NOTIFICATION_PRIORITY_KEYS = { low: !0, medium: !0, high: !0, immediate: !0 },
  NOTIFICATION_PRIORITY_SET = new Set(Object.keys(NOTIFICATION_PRIORITY_KEYS)),
  MAX_NOTIFICATION_TIMEOUT_MS = 60000,
  MAX_NOTIFICATION_TEXT_LENGTH = 1000,
  MAX_REMOTE_NOTIFICATION_KEY_LENGTH = 256,
  MAX_NOTIFICATION_COLOR_LENGTH = 64;
//@ chunk-0h4e7gnq.js:40987-41080 placement
function SLr(e) {
  return typeof e.key === "string" && typeof e.text === "string" && NOTIFICATION_PRIORITY_SET.has(e.priority);
}
//@ chunk-0h4e7gnq.js:41080-41089 placement
var Td = 3;
/**
 * 远程通知超过 3 条时返回最早一条要挤掉的 key；同 key 已存在或未超限返回 null。
 */
//@ chunk-0h4e7gnq.js:41089-41260 placement
function pickRemoteNotificationToEvict(e, n) {
  if (e.current?.key === n || e.queue.some((y) => y.key === n)) return null;
  let filtered = e.queue.filter((y) => y.key.startsWith("remote:"));
  return filtered.length >= Td ? filtered[0].key : null;
}
/**
 * 规范化 SDK/远程传来的通知：远程 key 加 remote: 前缀并截断、文本消毒截断并压成单行、远程 immediate 降为 high、颜色长度校验、超时夹到上限。
 */
//@ chunk-0h4e7gnq.js:41260-41678 placement
function normalizeSdkNotification(e, n = "local") {
  let s = Number.isFinite(e.timeout_ms)
    ? Math.min(Math.max(e.timeout_ms, 0), MAX_NOTIFICATION_TIMEOUT_MS)
    : void 0;
  return {
    key: n === "remote" ? `remote:${e.key.slice(0, MAX_REMOTE_NOTIFICATION_KEY_LENGTH)}` : e.key,
    text: truncateToLength(Yn(e.text), MAX_NOTIFICATION_TEXT_LENGTH).replace(/\s*[\r\n\v\f]+\s*/g, " "),
    priority: n === "remote" && e.priority === "immediate" ? "high" : e.priority,
    ...(typeof e.color === "string" &&
      e.color.length <= MAX_NOTIFICATION_COLOR_LENGTH &&
      !(e.color in Object.prototype) && { color: e.color }),
    ...(s !== void 0 && { timeoutMs: s }),
  };
}

export {
  useNotifications,
  Kj,
  SLr,
  normalizeSdkNotification,
  pickRemoteNotificationToEvict,
  pTe,
  bye,
  KDe,
  MRr,
  removeNotificationByKey,
  PRIORITIES,
  useRegisterNotificationTranscriptSink,
  RUn,
  Ynn,
  NotificationsProvider,
};
