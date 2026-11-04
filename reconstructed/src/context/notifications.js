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
import {
  init_react_production,
  createContext,
  useState,
  useContext,
  useLayoutEffect,
  useCallback,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { currentToolPermissionContext } from "../utils/permissions/currentPermissionContext.js";
import { useStoreSelector } from "../hooks/useStoreSelector.js";
import { uiSignals } from "../state/uiSignals.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { resolveRenderMode, RenderModeContext } from "../ink/renderModeContext.js";
import { useAppStoreDirect, useSetAppState } from "../state/AppState.js";
import { useClock } from "../ink/components/ClockContext.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { truncateToLength } from "../utils/stringUtils.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-jvez4qde.js:506-510 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jvez4qde.js:506", () => {
  init_react_production();
});
//@ chunk-jvez4qde.js:510-537 placement
/**
 * 函数 useStatelessShared（无状态订阅辅助）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function useStatelessShared() {
  return currentToolPermissionContext();
}
//@ chunk-jvez4qde.js:537-569 placement
function hasMounts(notifications) {
  return notifications.mounts > 0;
}
//@ chunk-jvez4qde.js:569-818 placement
/**
 * 从通知状态（当前、队列、置顶）中移除指定 key 的通知；不存在时原样返回。
 */
function removeNotificationByKey(notifications, key) {
  let isCurrent = notifications.current?.key === key;
  let any = notifications.queue.some((notice) => notice.key === key);
  let any_2 = notifications.pinned.some((notice) => notice.key === key);
  if (!isCurrent && !any && !any_2) return notifications;
  return {
    current: isCurrent ? null : notifications.current,
    queue: notifications.queue.filter((notice) => notice.key !== key),
    pinned: any_2 ? notifications.pinned.filter((notice) => notice.key !== key) : notifications.pinned,
  };
}
//@ chunk-jvez4qde.js:818-878 placement
/**
 * 函数 holdsToasts（diff 面板或 pane 占住 toast）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function holdsToasts(notifications) {
  return notifications.diffPanelVisible || notifications.paneHoldsToasts;
}
//@ chunk-jvez4qde.js:878-950 placement
/**
 * 函数 isHeldNotice（非空且可豁免 diff 面板）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function isHeldNotice(notice, renderMode) {
  return notice !== null && (!renderMode || notice.exemptFromDiffPanelHold === true);
}
//@ chunk-jvez4qde.js:950-1014 placement
/**
 * 函数 isGaugeSurface（表面为 gauge）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function isGaugeSurface(surface, headerGauge) {
  return headerGauge && surface !== null && gaugeOf(surface)?.surface === "gauge";
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
var noticeSignal; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-jvez4qde.js:1198", () => {
  noticeSignal = createContext(null);
});
//@ chunk-jvez4qde.js:1213-1367 placement
/**
 * 通知上下文 Provider：为子树提供一份通知宿主状态（清除定时器、挂载计数、转录输出槽等）。
 */
function NotificationsProvider(props) {
  let $ = useMemoCache(3);
  let { children } = props;
  let [hostState] = useState(createNotificationHostState);
  let providerElement;
  if ($[0] !== children || $[1] !== hostState) {
    providerElement = jsxProd_default(noticeSignal.Provider, {
      value: hostState,
      children,
    });
    $[0] = children;
    $[1] = hostState;
    $[2] = providerElement;
  } else providerElement = $[2];
  return providerElement;
}
//@ chunk-jvez4qde.js:1367-1467 placement
function shouldRouteToFullscreenNotices({ presentationContext, isScreenReaderEnabled }) {
  return (
    useStatelessShared() && !isScreenReaderEnabled && resolveRenderMode(presentationContext) === "fullscreen"
  );
}
//@ chunk-jvez4qde.js:1467-1619 placement
function routeNotificationToTranscript(notice, { transcriptSink, saidInTranscript }, renderMode) {
  if (false)
    switch (m.routeNotification(notice.key, true)) {
      case "suppress":
      case "queue":
      case "transcript":
    }
  return notice;
}
//@ chunk-jvez4qde.js:1619-1642 placement
/**
 * 函数 gaugeOf（取 gauge（未启用））；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function gaugeOf(notice) {
  return;
}
//@ chunk-jvez4qde.js:1642-1816 placement
/**
 * 把一个转录输出函数注册为通知的 transcriptSink，卸载时注销。
 */
function useRegisterNotificationTranscriptSink(sink) {
  let hostState = useContext(noticeSignal);
  useLayoutEffect(() => {
    if (hostState === null) return;
    hostState.transcriptSink.registered = sink;
    return () => {
      if (hostState.transcriptSink.registered === sink) hostState.transcriptSink.registered = null;
    };
  }, [hostState, sink]);
}
//@ chunk-jvez4qde.js:1816-5286 fingerprint = useNotifications (0.595)
/**
 * 通知队列 hook：addNotification/removeNotification，按优先级出队、immediate 抢占、超时自动移除、diff 面板期间暂缓。
 */
function useNotifications() {
  let store = useAppStoreDirect();
  let setAppState = useSetAppState();
  let clock = useClock();
  let hostStateSignal = useContext(noticeSignal);
  let [defaultHostState] = useState(createNotificationHostState);
  let hostState = hostStateSignal ?? defaultHostState;
  let { clearTimer, mountCount } = hostState;
  let renderMode = useContext(RenderModeContext);
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let processQueue = useCallback(() => {
    let routesToFullscreen = shouldRouteToFullscreenNotices({
      presentationContext: renderMode,
      isScreenReaderEnabled,
    });
    let heldKeys = useStatelessShared()
      ? store
          .getState()
          .notifications.queue.filter(
            (prev) => routeNotificationToTranscript(prev, hostState, routesToFullscreen) === "handled",
          )
      : [];
    setAppState((prevState) => {
      let current =
        heldKeys.length === 0
          ? prevState
          : {
              ...prevState,
              notifications: {
                ...prevState.notifications,
                queue: prevState.notifications.queue.filter((notice) => !heldKeys.includes(notice)),
              },
            };
      let next = _(
        holdsToasts(current)
          ? current.notifications.queue.filter((notice) => notice.exemptFromDiffPanelHold)
          : current.notifications.queue,
      );
      if (!next) return current;
      let nextState =
        current.notifications.current !== null &&
        next.priority === "immediate" &&
        next.heldDuringDiffPanel === true &&
        current.notifications.current.priority !== "immediate"
          ? current.notifications.current
          : null;
      if (current.notifications.current !== null && nextState === null) return current;
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
        ...current,
        notifications: {
          ...current.notifications,
          queue: [
            ...(nextState !== null && isRequeueableOnPreempt(nextState, next) ? [nextState] : []),
            ...current.notifications.queue.filter((notice) => notice !== next),
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
  }, [setAppState, store, hostState, clearTimer, clock, renderMode, isScreenReaderEnabled]);
  let addNotification = useCallback(
    (notif) => {
      let nextNotice = useStatelessShared()
        ? routeNotificationToTranscript(
            notif,
            hostState,
            shouldRouteToFullscreenNotices({
              presentationContext: renderMode,
              isScreenReaderEnabled,
            }),
          )
        : notif;
      if (nextNotice === "handled") return;
      if (nextNotice.pinned) {
        setAppState((prevState) => {
          if (prevState.notifications.pinned.some((pinned) => pinned.key === nextNotice.key))
            return prevState;
          return {
            ...prevState,
            notifications: {
              ...prevState.notifications,
              pinned: [...prevState.notifications.pinned, nextNotice],
            },
          };
        });
        return;
      }
      if (
        nextNotice.priority === "immediate" &&
        nextNotice.waitsItsTurn !== true &&
        !holdsToasts(store.getState())
      ) {
        if (clearTimer.current) {
          clearTimer.current();
          clearTimer.current = null;
        }
        clearTimer.current = clock.setTimeout(() => {
          clearTimer.current = null;
          setAppState((prev) => {
            if (prev.notifications.current?.key !== nextNotice.key) return prev;
            return {
              ...prev,
              notifications: {
                ...prev.notifications,
                queue: prev.notifications.queue.filter(
                  (pinned) => !nextNotice.invalidates?.includes(pinned.key),
                ),
                current: null,
              },
            };
          });
          processQueue();
        }, nextNotice.timeoutMs ?? GAUGE_DECAY_MS);
        setAppState((prev) => ({
          ...prev,
          notifications: {
            ...prev.notifications,
            current: nextNotice,
            queue: [
              ...(prev.notifications.current ? [prev.notifications.current] : []),
              ...prev.notifications.queue,
            ].filter((queued) => isRequeueableOnPreempt(queued, nextNotice)),
          },
        }));
        return;
      }
      let notif_2 =
        nextNotice.priority === "immediate"
          ? {
              ...nextNotice,
              heldDuringDiffPanel: true,
            }
          : nextNotice;
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
            setAppState((prevState) => {
              if (prevState.notifications.current?.key !== key) return prevState;
              return {
                ...prevState,
                notifications: {
                  ...prevState.notifications,
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
        let queueIdx = notif_2.fold
          ? prev.notifications.queue.findIndex((queued) => queued.key === notif_2.key)
          : -1;
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
          !new Set(prev.notifications.queue.map((queued) => queued.key)).has(notif_2.key) &&
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
            queue: [
              ...prev.notifications.queue.filter((queued) => isRequeueableOnPreempt(queued, notif_2)),
              notif_2,
            ],
          },
        };
      });
      processQueue();
    },
    [setAppState, store, hostState, processQueue, clearTimer, clock, renderMode, isScreenReaderEnabled],
  );
  let removeNotification = useCallback(
    (key) => {
      setAppState((prev) => {
        let nextNotifications = removeNotificationByKey(prev.notifications, key);
        if (nextNotifications === prev.notifications) return prev;
        if (prev.notifications.current?.key === key && clearTimer.current) {
          clearTimer.current();
          clearTimer.current = null;
        }
        return {
          ...prev,
          notifications: nextNotifications,
        };
      });
      processQueue();
    },
    [setAppState, processQueue, clearTimer, hostState, renderMode, isScreenReaderEnabled],
  );
  useEffect(() => {
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
function isRequeueableOnPreempt(notice, incoming) {
  return (
    (notice.priority !== "immediate" ||
      notice.requeueOnPreempt === true ||
      notice.heldDuringDiffPanel === true) &&
    !incoming.invalidates?.includes(notice.key)
  );
}
//@ chunk-jvez4qde.js:5465-5562 placement
function _(notices) {
  if (notices.length === 0) return;
  return notices.reduce((acc, notice) =>
    PRIORITIES[notice.priority] < PRIORITIES[acc.priority] ? notice : acc,
  );
}
//@ chunk-0h4e7gnq.js:40882-40987 fingerprint = PRIORITIES (1)
/**
 * 通知 color 字符串最长 64。
 */
var NOTIFICATION_PRIORITY_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var NOTIFICATION_PRIORITY_SET;
var MAX_NOTIFICATION_TIMEOUT_MS;
var MAX_NOTIFICATION_TEXT_LENGTH;
var MAX_REMOTE_NOTIFICATION_KEY_LENGTH;
var MAX_NOTIFICATION_COLOR_LENGTH;
deferInit("chunk-0h4e7gnq.js:40882", () => {
  NOTIFICATION_PRIORITY_KEYS = {
    low: true,
    medium: true,
    high: true,
    immediate: true,
  };
  NOTIFICATION_PRIORITY_SET = new Set(Object.keys(NOTIFICATION_PRIORITY_KEYS));
  MAX_NOTIFICATION_TIMEOUT_MS = 60000;
  MAX_NOTIFICATION_TEXT_LENGTH = 1000;
  MAX_REMOTE_NOTIFICATION_KEY_LENGTH = 256;
  MAX_NOTIFICATION_COLOR_LENGTH = 64;
});
//@ chunk-0h4e7gnq.js:40987-41080 placement
/**
 * 函数 isValidNotice（key/text 为字符串且优先级已知）；位于「通知队列：优先级、SDK 通知规范化常量、启动公告选择、useNotifications」模块。
 */
function isValidNotice(notice) {
  return (
    typeof notice.key === "string" &&
    typeof notice.text === "string" &&
    NOTIFICATION_PRIORITY_SET.has(notice.priority)
  );
}
//@ chunk-0h4e7gnq.js:41080-41089 placement
var MAX_QUEUED_NOTICES = 3;
//@ chunk-0h4e7gnq.js:41089-41260 placement
/**
 * 远程通知超过 3 条时返回最早一条要挤掉的 key；同 key 已存在或未超限返回 null。
 */
function pickRemoteNotificationToEvict(notifications, key) {
  if (notifications.current?.key === key || notifications.queue.some((queued) => queued.key === key))
    return null;
  let filtered = notifications.queue.filter((queued) => queued.key.startsWith("remote:"));
  return filtered.length >= MAX_QUEUED_NOTICES ? filtered[0].key : null;
}
//@ chunk-0h4e7gnq.js:41260-41678 placement
/**
 * 规范化 SDK/远程传来的通知：远程 key 加 remote: 前缀并截断、文本消毒截断并压成单行、远程 immediate 降为 high、颜色长度校验、超时夹到上限。
 */
function normalizeSdkNotification(raw, origin = "local") {
  let timeoutMs = Number.isFinite(raw.timeout_ms)
    ? Math.min(Math.max(raw.timeout_ms, 0), MAX_NOTIFICATION_TIMEOUT_MS)
    : undefined;
  return {
    key: origin === "remote" ? `remote:${raw.key.slice(0, MAX_REMOTE_NOTIFICATION_KEY_LENGTH)}` : raw.key,
    text: truncateToLength(stripAnsi(raw.text), MAX_NOTIFICATION_TEXT_LENGTH).replace(
      /\s*[\r\n\v\f]+\s*/g,
      " ",
    ),
    priority: origin === "remote" && raw.priority === "immediate" ? "high" : raw.priority,
    ...(typeof raw.color === "string" &&
      raw.color.length <= MAX_NOTIFICATION_COLOR_LENGTH &&
      !(raw.color in Object.prototype) && {
        color: raw.color,
      }),
    ...(timeoutMs !== undefined && {
      timeoutMs,
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
