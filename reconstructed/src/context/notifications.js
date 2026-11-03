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
import { init_react_production, qt, y, Se, zt, ce, P } from "../../vendor/react/cjs/react.production.js";
import { currentToolPermissionContext } from "../utils/permissions/currentPermissionContext.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { uiSignals } from "../state/uiSignals.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { resolveRenderMode, RenderModeContext } from "../ink/renderModeContext.js";
import { useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { stripAnsi } from "../utils/stripAnsi.js";

//@ chunk-jvez4qde.js:506-510 placement
init_react_production();
//@ chunk-jvez4qde.js:510-537 placement
/**
 * 函数 useStatelessShared（无状态订阅辅助）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function useStatelessShared() {
  return currentToolPermissionContext();
}
//@ chunk-jvez4qde.js:537-569 placement
function hasMounts(i) {
  return i.mounts > 0;
}
//@ chunk-jvez4qde.js:569-818 placement
/**
 * 从通知状态（当前、队列、置顶）中移除指定 key 的通知；不存在时原样返回。
 */
function removeNotificationByKey(notifications, n) {
  let a = notifications.current?.key === n;
  let any = notifications.queue.some((s) => s.key === n);
  let any_2 = notifications.pinned.some((s) => s.key === n);
  if (!a && !any && !any_2) return notifications;
  return {
    current: a ? null : notifications.current,
    queue: notifications.queue.filter((s) => s.key !== n),
    pinned: any_2 ? notifications.pinned.filter((s) => s.key !== n) : notifications.pinned,
  };
}
//@ chunk-jvez4qde.js:818-878 placement
/**
 * 函数 holdsToasts（diff 面板或 pane 占住 toast）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function holdsToasts(i) {
  return i.diffPanelVisible || i.paneHoldsToasts;
}
//@ chunk-jvez4qde.js:878-950 placement
/**
 * 函数 isHeldNotice（非空且可豁免 diff 面板）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function isHeldNotice(i, n) {
  return i !== null && (!n || i.exemptFromDiffPanelHold === true);
}
//@ chunk-jvez4qde.js:950-1014 placement
/**
 * 函数 isGaugeSurface（表面为 gauge）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function isGaugeSurface(i, headerGauge) {
  return headerGauge && i !== null && gaugeOf(i)?.surface === "gauge";
}
//@ chunk-jvez4qde.js:1014-1057 placement
/**
 * 函数 useHeaderGauge（取头部 gauge）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function useHeaderGauge() {
  return useStoreSelector(uiSignals.headerGauge, hasMounts);
}
//@ chunk-jvez4qde.js:1057-1070 placement
/**
 * 导出值：GAUGE_DECAY_MS（8000）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
var GAUGE_DECAY_MS = 8000;
//@ chunk-jvez4qde.js:1070-1198 placement
function createNotificationHostState() {
  return {
    clearTimer: {
      current: null,
    },
    mountCount: {
      current: 0,
    },
    transcriptSink: {
      registered: null,
    },
    saidInTranscript: new Map(),
  };
}
//@ chunk-jvez4qde.js:1198-1213 placement
var noticeSignal = qt(null);
//@ chunk-jvez4qde.js:1213-1367 placement
/**
 * 通知上下文 Provider：为子树提供一份通知宿主状态（清除定时器、挂载计数、转录输出槽等）。
 */
function NotificationsProvider(props) {
  let N = w(3);
  let { children } = props;
  let [a] = y(createNotificationHostState);
  let m;
  if (N[0] !== children || N[1] !== a) {
    m = jsxProd_default(noticeSignal.Provider, {
      value: a,
      children,
    });
    N[0] = children;
    N[1] = a;
    N[2] = m;
  } else m = N[2];
  return m;
}
//@ chunk-jvez4qde.js:1367-1467 placement
function shouldRouteToFullscreenNotices({ presentationContext, isScreenReaderEnabled }) {
  return (
    useStatelessShared() && !isScreenReaderEnabled && resolveRenderMode(presentationContext) === "fullscreen"
  );
}
//@ chunk-jvez4qde.js:1467-1619 placement
function routeNotificationToTranscript(i, { transcriptSink, saidInTranscript }, N) {
  if (false)
    switch (m.routeNotification(i.key, true)) {
      case "suppress":
      case "queue":
      case "transcript":
    }
  return i;
}
//@ chunk-jvez4qde.js:1619-1642 placement
/**
 * 函数 gaugeOf（取 gauge（未启用））；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function gaugeOf(i) {
  return;
}
//@ chunk-jvez4qde.js:1642-1816 placement
/**
 * 把一个转录输出函数注册为通知的 transcriptSink，卸载时注销。
 */
function useRegisterNotificationTranscriptSink(i) {
  let n = Se(noticeSignal);
  zt(() => {
    if (n === null) return;
    n.transcriptSink.registered = i;
    return () => {
      if (n.transcriptSink.registered === i) n.transcriptSink.registered = null;
    };
  }, [n, i]);
}
//@ chunk-jvez4qde.js:1816-5286 fingerprint = useNotifications (0.595)
/**
 * 通知队列 hook：addNotification/removeNotification，按优先级出队、immediate 抢占、超时自动移除、diff 面板期间暂缓。
 */
function useNotifications() {
  let store = useAppStoreDirect();
  let setAppState = useSetAppState();
  let clock = useClock();
  let N = Se(noticeSignal);
  let [m] = y(createNotificationHostState);
  let s = N ?? m;
  let { clearTimer, mountCount } = s;
  let S = Se(RenderModeContext);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let processQueue = ce(() => {
    let p = shouldRouteToFullscreenNotices({
      presentationContext: S,
      isScreenReaderEnabled,
    });
    let r = useStatelessShared()
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
            };
      let next = _(
        holdsToasts(t)
          ? t.notifications.queue.filter((f) => f.exemptFromDiffPanelHold)
          : t.notifications.queue,
      );
      if (!next) return t;
      let k =
        t.notifications.current !== null &&
        next.priority === "immediate" &&
        next.heldDuringDiffPanel === true &&
        t.notifications.current.priority !== "immediate"
          ? t.notifications.current
          : null;
      if (t.notifications.current !== null && k === null) return t;
      let key = next.key;
      clearTimer.current?.();
      clearTimer.current = clock.setTimeout(() => {
        clearTimer.current = null;
        setAppState((prev) => {
          if (prev.notifications.current?.key !== key) return prev;
          return {
            ...prev,
            notifications: {
              ...prev.notifications,
              current: null,
            },
          };
        });
        processQueue();
      }, next.timeoutMs ?? GAUGE_DECAY_MS);
      return {
        ...t,
        notifications: {
          ...t.notifications,
          queue: [
            ...(k !== null && isRequeueableOnPreempt(k, next) ? [k] : []),
            ...t.notifications.queue.filter((f) => f !== next),
          ],
          current: next.heldDuringDiffPanel
            ? {
                ...next,
                heldDuringDiffPanel: undefined,
              }
            : next,
        },
      };
    });
  }, [setAppState, store, s, clearTimer, clock, S, isScreenReaderEnabled]);
  let addNotification = ce(
    (notif) => {
      let r = useStatelessShared()
        ? routeNotificationToTranscript(
            notif,
            s,
            shouldRouteToFullscreenNotices({
              presentationContext: S,
              isScreenReaderEnabled,
            }),
          )
        : notif;
      if (r === "handled") return;
      if (r.pinned) {
        setAppState((t) => {
          if (t.notifications.pinned.some((c) => c.key === r.key)) return t;
          return {
            ...t,
            notifications: {
              ...t.notifications,
              pinned: [...t.notifications.pinned, r],
            },
          };
        });
        return;
      }
      if (r.priority === "immediate" && r.waitsItsTurn !== true && !holdsToasts(store.getState())) {
        if (clearTimer.current) {
          clearTimer.current();
          clearTimer.current = null;
        }
        clearTimer.current = clock.setTimeout(() => {
          clearTimer.current = null;
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
          });
          processQueue();
        }, r.timeoutMs ?? GAUGE_DECAY_MS);
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
        }));
        return;
      }
      let notif_2 =
        r.priority === "immediate"
          ? {
              ...r,
              heldDuringDiffPanel: true,
            }
          : r;
      setAppState((prev) => {
        if (notif_2.fold && prev.notifications.current?.key === notif_2.key) {
          let folded = notif_2.fold(prev.notifications.current, notif_2);
          if (clearTimer.current) {
            clearTimer.current();
            clearTimer.current = null;
          }
          let key = folded.key;
          clearTimer.current = clock.setTimeout(() => {
            clearTimer.current = null;
            setAppState((R) => {
              if (R.notifications.current?.key !== key) return R;
              return {
                ...R,
                notifications: {
                  ...R.notifications,
                  current: null,
                },
              };
            });
            processQueue();
          }, folded.timeoutMs ?? GAUGE_DECAY_MS);
          return {
            ...prev,
            notifications: {
              ...prev.notifications,
              current: folded,
            },
          };
        }
        let queueIdx = notif_2.fold ? prev.notifications.queue.findIndex((l) => l.key === notif_2.key) : -1;
        if (notif_2.fold && queueIdx !== -1) {
          let folded = notif_2.fold(prev.notifications.queue[queueIdx], notif_2);
          let newQueue = [...prev.notifications.queue];
          newQueue[queueIdx] = folded;
          return {
            ...prev,
            notifications: {
              ...prev.notifications,
              queue: newQueue,
            },
          };
        }
        if (!(
          !new Set(prev.notifications.queue.map((l) => l.key)).has(notif_2.key) &&
          prev.notifications.current?.key !== notif_2.key
        ))
          return prev;
        let invalidatesCurrent =
          prev.notifications.current !== null &&
          notif_2.invalidates?.includes(prev.notifications.current.key);
        if (invalidatesCurrent && clearTimer.current) {
          clearTimer.current();
          clearTimer.current = null;
        }
        return {
          ...prev,
          notifications: {
            ...prev.notifications,
            current: invalidatesCurrent ? null : prev.notifications.current,
            queue: [...prev.notifications.queue.filter((l) => isRequeueableOnPreempt(l, notif_2)), notif_2],
          },
        };
      });
      processQueue();
    },
    [setAppState, store, s, processQueue, clearTimer, clock, S, isScreenReaderEnabled],
  );
  let removeNotification = ce(
    (key) => {
      setAppState((prev) => {
        let u = removeNotificationByKey(prev.notifications, key);
        if (u === prev.notifications) return prev;
        if (prev.notifications.current?.key === key && clearTimer.current) {
          clearTimer.current();
          clearTimer.current = null;
        }
        return {
          ...prev,
          notifications: u,
        };
      });
      processQueue();
    },
    [setAppState, processQueue, clearTimer, s, S, isScreenReaderEnabled],
  );
  P(() => {
    mountCount.current++;
    if (store.getState().notifications.queue.length > 0) processQueue();
    return () => {
      mountCount.current--;
      if (mountCount.current === 0 && clearTimer.current) {
        clearTimer.current();
        clearTimer.current = null;
      }
    };
  }, []);
  return {
    addNotification,
    removeNotification,
    processQueue,
  };
}
//@ chunk-jvez4qde.js:5286-5330 layout = PRIORITIES (1)
/**
 * 通知优先级排序值：immediate 0、high 1、medium 2、low 3。
 */
var PRIORITIES = {
  immediate: 0,
  high: 1,
  medium: 2,
  low: 3,
};
//@ chunk-jvez4qde.js:5330-5465 placement
function isRequeueableOnPreempt(i, n) {
  return (
    (i.priority !== "immediate" || i.requeueOnPreempt === true || i.heldDuringDiffPanel === true) &&
    !n.invalidates?.includes(i.key)
  );
}
//@ chunk-jvez4qde.js:5465-5562 placement
function _(i) {
  if (i.length === 0) return;
  return i.reduce((acc, a) => (PRIORITIES[a.priority] < PRIORITIES[acc.priority] ? a : acc));
}
//@ chunk-0h4e7gnq.js:40882-40987 fingerprint = PRIORITIES (1)
/**
 * 通知 color 字符串最长 64。
 */
var NOTIFICATION_PRIORITY_KEYS = {
  low: true,
  medium: true,
  high: true,
  immediate: true,
};
var NOTIFICATION_PRIORITY_SET = new Set(Object.keys(NOTIFICATION_PRIORITY_KEYS));
var MAX_NOTIFICATION_TIMEOUT_MS = 60000;
var MAX_NOTIFICATION_TEXT_LENGTH = 1000;
var MAX_REMOTE_NOTIFICATION_KEY_LENGTH = 256;
var MAX_NOTIFICATION_COLOR_LENGTH = 64;
//@ chunk-0h4e7gnq.js:40987-41080 placement
/**
 * 函数 isValidNotice（key/text 为字符串且优先级已知）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function isValidNotice(e) {
  return typeof e.key === "string" && typeof e.text === "string" && NOTIFICATION_PRIORITY_SET.has(e.priority);
}
//@ chunk-0h4e7gnq.js:41080-41089 placement
var MAX_QUEUED_NOTICES = 3;
//@ chunk-0h4e7gnq.js:41089-41260 placement
/**
 * 远程通知超过 3 条时返回最早一条要挤掉的 key；同 key 已存在或未超限返回 null。
 */
function pickRemoteNotificationToEvict(notifications, key) {
  if (notifications.current?.key === key || notifications.queue.some((y) => y.key === key)) return null;
  let filtered = notifications.queue.filter((y) => y.key.startsWith("remote:"));
  return filtered.length >= MAX_QUEUED_NOTICES ? filtered[0].key : null;
}
//@ chunk-0h4e7gnq.js:41260-41678 placement
/**
 * 规范化 SDK/远程传来的通知：远程 key 加 remote: 前缀并截断、文本消毒截断并压成单行、远程 immediate 降为 high、颜色长度校验、超时夹到上限。
 */
function normalizeSdkNotification(e, n = "local") {
  let s = Number.isFinite(e.timeout_ms)
    ? Math.min(Math.max(e.timeout_ms, 0), MAX_NOTIFICATION_TIMEOUT_MS)
    : undefined;
  return {
    key: n === "remote" ? `remote:${e.key.slice(0, MAX_REMOTE_NOTIFICATION_KEY_LENGTH)}` : e.key,
    text: truncateToLength(stripAnsi(e.text), MAX_NOTIFICATION_TEXT_LENGTH).replace(
      /\s*[\r\n\v\f]+\s*/g,
      " ",
    ),
    priority: n === "remote" && e.priority === "immediate" ? "high" : e.priority,
    ...(typeof e.color === "string" &&
      e.color.length <= MAX_NOTIFICATION_COLOR_LENGTH &&
      !(e.color in Object.prototype) && {
        color: e.color,
      }),
    ...(s !== undefined && {
      timeoutMs: s,
    }),
  };
}
export {
  useNotifications,
  holdsToasts,
  isValidNotice,
  normalizeSdkNotification,
  pickRemoteNotificationToEvict,
  useHeaderGauge,
  isHeldNotice,
  isGaugeSurface,
  gaugeOf,
  removeNotificationByKey,
  PRIORITIES,
  useRegisterNotificationTranscriptSink,
  GAUGE_DECAY_MS,
  useStatelessShared,
  NotificationsProvider,
};
