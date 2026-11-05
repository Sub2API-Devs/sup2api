/**
 * hooks/notifs/startupNotificationSpecs.ts
 *
 * 2.1.316 新增。启动通知规格汇总。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-01kgd7xg.js (1), chunk-czq1j3j2.js (14)
 * attribution: placement 15
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isInProcessTeammateTask } from "../../tasks/InProcessTeammateTask/types.js";
import {
  init_react_production,
  useRef,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import { COMPUTED_NOTICE_SPECS } from "./specs/installNotices.js";
import { useNotifications } from "../../context/notifications.js";
import { useSession } from "../../context/session.js";
import { useTheme_2 } from "../../components/design-system/ThemeProvider.js";
import { getIsRemoteMode, onAttacherCapsChange, getAttacherCaps } from "../../bootstrap/state.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logError } from "../../utils/log.js";
import { withTelemetryMessage, toError } from "../../utils/errors.js";
import { useStartupNotification } from "./useStartupNotification.js";
import { getRemoteCaps } from "../../remote/remoteMode.js";
import { makeSpawnNotif, makeShutdownNotif } from "./useTeammateShutdownNotification.js";
import { useStoreSelector } from "../useStoreSelector.js";
import { useAppStoreDirect, useAppStateSession, useAppState } from "../../state/AppState.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useTerminalSize } from "../useTerminalSize.js";
import { useForceRender } from "../useForceRender.js";
import { useSettingsState } from "../useSettings.js";
import { useRateLimitState } from "../../components/rateLimit/quotaAutoResume.js";
import { useCommandQueue } from "../../components/Messages.js";
import { useQueuedMessageText } from "../../context/QueuedMessageContext.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-01kgd7xg.js:22547-22646 placement
/**
 * teammate 任务状态签名串（id:status;…），用于判断是否变化。
 */
function teammateStatusSignature(tasks) {
  let signature = "";
  for (let task of Object.values(tasks))
    if (isInProcessTeammateTask(task)) signature += `${task.id}:${task.status};`;
  return signature;
}
//@ chunk-czq1j3j2.js:1786543-1786547 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1786543", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1786927-1786931 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1786927", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1787144-1787148 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1787144", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1798065-1798856 placement
function runStartupNotificationSpecs(specs = COMPUTED_NOTICE_SPECS) {
  let { addNotification } = useNotifications();
  let session = useSession();
  let { storageV5, credentials } = useTheme_2();
  let hasRunRef = useRef(false);
  useEffect(() => {
    if (getIsRemoteMode() || hasRunRef.current) return;
    hasRunRef.current = true;
    let seenNotifications = getGlobalConfig().seenNotifications ?? {};
    let countedIds = [];
    Promise.allSettled(
      specs.map(async (spec) => {
        if (spec.maxImpressions !== undefined && (seenNotifications[spec.id] ?? 0) >= spec.maxImpressions)
          return;
        let result = await spec.compute({
          session,
          storageV5,
          credentials,
        });
        if (!result || (Array.isArray(result) && result.length === 0)) return;
        for (let notice of Array.isArray(result) ? result : [result]) addNotification(notice);
        spec.onShown?.();
        if (spec.maxImpressions !== undefined) countedIds.push(spec.id);
      }),
    ).then((settledResults) => {
      for (let settled of settledResults)
        if (settled.status === "rejected")
          logError(withTelemetryMessage(toError(settled.reason), "startup notification spec failed"));
      if (countedIds.length === 0) return;
      saveGlobalConfig((config) => {
        let seenNotifications = {
          ...(config.seenNotifications ?? {}),
        };
        for (let noticeId of countedIds) seenNotifications[noticeId] = (seenNotifications[noticeId] ?? 0) + 1;
        return {
          ...config,
          seenNotifications,
        };
      }, storageV5);
    });
  }, [addNotification, session, specs, storageV5, credentials]);
}
//@ chunk-czq1j3j2.js:1833906-1834020 placement
var ROLLOUT_COHORT_NOTICE_SPEC = {
  id: "rollout-cohort-notice",
  deps: (noticeState) => [noticeState.addNotification, noticeState.removeNotification, noticeState.storageV5],
  setup: () => useStartupNotification,
};
//@ chunk-czq1j3j2.js:1836432-1836806 placement
/**
 * 启动通知规格：进程内队友任务开始运行或完成时各提示一次。
 */
var TEAMMATE_LIFECYCLE_NOTICE_SPEC = {
  id: "teammate-lifecycle",
  deps: (noticeState) => [noticeState.teammateStatusSignature, noticeState.addNotification],
  setup() {
    let announcedRunning = new Set();
    let announcedCompleted = new Set();
    return ({ addNotification, store }) => {
      if (getRemoteCaps() !== null) return;
      for (let [key, value] of Object.entries(store.getState().tasks)) {
        if (!isInProcessTeammateTask(value)) continue;
        if (value.status === "running" && !announcedRunning.has(key)) {
          announcedRunning.add(key);
          addNotification(makeSpawnNotif(1));
        }
        if (value.status === "completed" && !announcedCompleted.has(key)) {
          announcedCompleted.add(key);
          addNotification(makeShutdownNotif(1));
        }
      }
    };
  },
};
//@ chunk-czq1j3j2.js:1837754-1839653 placement
function useStartupNotifications({
  mainLoopModel,
  mcpClients,
  ideInstallationStatus,
  dynamicMcpConfig,
  turn,
  transcript,
  requestDialog,
  dialogStore,
  hasOpenDialog,
  submitPrompt,
  screen,
  disabled,
  isRemoteSession,
  isTranscriptAtBottom,
}) {
  let storeSelector = useStoreSelector(turn, selectIsLoading6);
  let storeSelector_2 = useStoreSelector(turn, selectLastQueryCompletionTime);
  let storeSelector_3 = useStoreSelector(turn, selectLastTurnEnd2);
  let storeSelector_4 = useStoreSelector(turn, selectSubmitCount3);
  useStoreSelector(transcript);
  let turnSnapshot = useMemo(
    () => ({
      isLoading: storeSelector,
      lastQueryCompletionTime: storeSelector_2,
      lastTurnEnd: storeSelector_3,
      submitCount: storeSelector_4,
    }),
    [storeSelector, storeSelector_2, storeSelector_3, storeSelector_4],
  );
  let { addNotification, removeNotification } = useNotifications();
  let appStoreDirect = useAppStoreDirect();
  let appStateSession = useAppStateSession();
  let { storageV5, credentials } = useTheme_2();
  let clock = useClock();
  let terminalSize = useTerminalSize();
  let forceRender = useForceRender();
  let hasBgAttacher = useSyncExternalStore(onAttacherCapsChange, () => getAttacherCaps() !== null);
  let settingsState = useSettingsState();
  let rateLimitState = useRateLimitState();
  let permissionMode = useAppState((state) => state.toolPermissionContext.mode);
  let isAutoModeAvailable = useAppState((state) => state.toolPermissionContext.isAutoModeAvailable);
  let isBypassPermissionsModeAvailable = useAppState(
    (state) => state.toolPermissionContext.isBypassPermissionsModeAvailable,
  );
  let permissionPromptCount = useAppState((state) => state.attribution.permissionPromptCount);
  let replBridgeActive = useAppState((state) => state.replBridgeConnected && !state.replBridgeOutboundOnly);
  let replBridgeSessionUrl = useAppState((state) => state.replBridgeSessionUrl);
  let fastMode = useAppState((state) => state.fastMode);
  let advisorModel = useAppState((state) => state.advisorModel);
  let appState = useAppState(selectTeammateStatusSignature);
  let initialMessage = useAppState((state) => state.initialMessage);
  let queuedCommandCount = useCommandQueue().length;
  let userSpecifiedModel = useAppState((state) => state.mainLoopModelForSession ?? state.mainLoopModel);
  let queuedMessageText = useQueuedMessageText();
  return useMemo(
    () => ({
      mainLoopModel,
      mcpClients,
      ideInstallationStatus,
      dynamicMcpConfig,
      turn,
      turnAtRender: turnSnapshot,
      transcript,
      requestDialog,
      submitPrompt,
      screen,
      disabled,
      isRemoteSession,
      isTranscriptAtBottom,
      addNotification,
      removeNotification,
      store: appStoreDirect,
      dialogStore,
      hasOpenDialog,
      session: appStateSession,
      storageV5,
      credentials,
      clock,
      terminalSize,
      growthBookVersion: forceRender,
      hasBgAttacher,
      settings: settingsState,
      claudeAiLimits: rateLimitState,
      permissionMode,
      isAutoModeAvailable,
      isBypassPermissionsModeAvailable,
      permissionPromptCount,
      replBridgeActive,
      replBridgeSessionUrl,
      fastMode,
      advisorModel,
      teammateStatusSignature: appState,
      initialMessage,
      queuedCommandCount,
      userSpecifiedModel,
      effortValue: queuedMessageText,
    }),
    [
      mainLoopModel,
      mcpClients,
      ideInstallationStatus,
      dynamicMcpConfig,
      turn,
      turnSnapshot,
      transcript,
      requestDialog,
      submitPrompt,
      screen,
      disabled,
      isRemoteSession,
      isTranscriptAtBottom,
      addNotification,
      removeNotification,
      appStoreDirect,
      dialogStore,
      hasOpenDialog,
      appStateSession,
      storageV5,
      credentials,
      clock,
      terminalSize,
      forceRender,
      hasBgAttacher,
      settingsState,
      rateLimitState,
      permissionMode,
      isAutoModeAvailable,
      isBypassPermissionsModeAvailable,
      permissionPromptCount,
      replBridgeActive,
      replBridgeSessionUrl,
      fastMode,
      advisorModel,
      appState,
      initialMessage,
      queuedCommandCount,
      userSpecifiedModel,
      queuedMessageText,
    ],
  );
}
//@ chunk-czq1j3j2.js:1839653-1839689 placement
function selectTeammateStatusSignature(state) {
  return teammateStatusSignature(state.tasks);
}
//@ chunk-czq1j3j2.js:1839689-1839724 placement
function selectIsLoading6(state) {
  return state.isLoading;
}
//@ chunk-czq1j3j2.js:1839724-1839773 placement
function selectLastQueryCompletionTime(state) {
  return state.lastQueryCompletionTime;
}
//@ chunk-czq1j3j2.js:1839773-1839810 placement
function selectLastTurnEnd2(state) {
  return state.lastTurnEnd;
}
//@ chunk-czq1j3j2.js:1839810-1839847 placement
function selectSubmitCount3(state) {
  return state.submitCount;
}
//@ chunk-czq1j3j2.js:1839920-1840009 placement
var STARTUP_FLAG_TTL_MS = 180000;
var STARTUP_MIN_INTERVAL_MS = 30000;
var STARTUP_MAX_INTERVAL_MS = 3600000;
var STARTUP_SESSION_BUDGET_MS = 300000;
var STARTUP_CHECK_STEP_MS = 500;
var STARTUP_BACKOFF_MS = 2000;
var MAX_STARTUP_NOTICES = 3;
var STARTUP_GRACE_TURNS = 3;
var STARTUP_GRACE_TURNS_MIN = 2;
var STARTUP_GRACE_TURNS_MAX = 3;
//@ chunk-czq1j3j2.js:1840009-1840094 placement
function isRealUserMessage(message) {
  return message.type === "user" && !message.isMeta && !message.isCompactSummary && !message.isVirtual;
}
export {
  runStartupNotificationSpecs,
  useStartupNotifications,
  TEAMMATE_LIFECYCLE_NOTICE_SPEC,
  ROLLOUT_COHORT_NOTICE_SPEC,
  isRealUserMessage,
  STARTUP_GRACE_TURNS,
  STARTUP_GRACE_TURNS_MIN,
  STARTUP_FLAG_TTL_MS,
  STARTUP_MIN_INTERVAL_MS,
  MAX_STARTUP_NOTICES,
  STARTUP_GRACE_TURNS_MAX,
  STARTUP_MAX_INTERVAL_MS,
  STARTUP_BACKOFF_MS,
  STARTUP_SESSION_BUDGET_MS,
  STARTUP_CHECK_STEP_MS,
};
