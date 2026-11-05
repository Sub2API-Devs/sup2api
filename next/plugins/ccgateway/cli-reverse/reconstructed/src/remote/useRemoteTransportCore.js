/**
 * remote/useRemoteTransportCore.ts
 *
 * 2.1.316 新增。远程传输核心 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: placement 1
 */
import {
  useRef,
  useState,
  useCallback,
  useEffect,
  useMemo,
} from "../../vendor/react/cjs/react.production.js";
import {
  createRetractionState,
  reconcileRemoteTasks,
  applyRemoteTaskState,
  markTasksUnlisted,
  isModelRefusalFallback as isModelRefusalFallback_2,
  evictRefusalRetraction,
  isResultEvent,
  applyRemoteTaskEvent,
  dropRemoteRateLimitFrame,
  clearInProgressToolUses,
  countOrphanToolResults,
  dropLateRetracted,
  recordNestedUuidAliases,
  recordInProgressToolUses,
} from "./remoteSessionEvents.js";
import { useSetAppState, useAppStoreDirect } from "../state/AppState.js";
import {
  useNotifications,
  isValidNotice,
  normalizeSdkNotification,
  pickRemoteNotificationToEvict,
} from "../context/notifications.js";
import { useTheme } from "../components/design-system/ThemeProvider.js";
import { createSystemMessage, isNonRenderableSystemMessage } from "../utils/messages.js";
import { REMOTE_PERMISSION_UNSHOWABLE_WAITING } from "./forwardedPermissionDialog.js";
import { TransportPermissionDispatcher } from "./TransportPermissionDispatcher.js";
import { logForDebugging } from "../utils/debug.js";
import { classifyControlRequestError } from "./controlRequestErrors.js";
import { errorMessage } from "../utils/errors.js";
import { notifyRemoteModeRejected } from "./remotePermissionModeSync.js";
import {
  createRemoteRateLimitAdopter,
  parseGoalState,
  adoptRemoteAutocompactState,
  convertSDKMessage,
} from "./sdkMessageAdapter.js";
import { capFrameDepth } from "./wireFrameShape.js";
import { logEvent } from "../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../services/analytics/safeMetadata.js";
import { isSystemInitMessage, toBackgroundTaskEvent } from "./backgroundTaskEvents.js";
import { permissionModeOfSystemEvent } from "../utils/telemetry/memorySummary.js";

//@ chunk-czq1j3j2.js:260222-267882 placement
/**
 * useRemoteTransportCore：REPL 远程传输核心 hook，连接远端会话、同步消息、权限请求与权限模式。
 */
function useRemoteTransportCore({
  adapter,
  sink,
  isLoading,
  requestDialog,
  toolPermissionContext,
  tools,
  onInit,
  turnStream,
}) {
  let isAttached = !!adapter;
  let streaming = turnStream?.streaming;
  let setStreamMode = turnStream?.setStreamMode;
  let setInProgressToolUseIDs = turnStream?.setInProgressToolUseIDs;
  let {
    setMessages,
    setIsLoading,
    onPermissionModeChange,
    onConversationReset,
    onTurnComplete,
    onTurnStopped,
  } = sink;
  let managerRef = useRef(null);
  let initHandled = useRef(false);
  let connected = useRef(false);
  let [retractionState] = useState(createRetractionState);
  let controlsLoading = isLoading !== undefined;
  let previousLoadingRef = useRef(isLoading ?? false);
  if (controlsLoading) previousLoadingRef.current = isLoading;
  let trackLoading = useCallback(
    (loading) => {
      if (loading && controlsLoading && previousLoadingRef.current) return;
      previousLoadingRef.current = loading;
      setIsLoading(loading);
    },
    [setIsLoading, controlsLoading],
  );
  let sending = useRef(false);
  let pendingSends = useRef(0);
  let markSendStarted = useCallback(() => {
    if (!sending.current) pendingSends.current++;
    sending.current = true;
    trackLoading(false);
  }, [trackLoading]);
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let { addNotification, removeNotification } = useNotifications();
  let setConnectionStatus = useCallback(
    (status) =>
      setAppState((prevState) =>
        prevState.remoteConnectionStatus === status
          ? prevState
          : {
              ...prevState,
              remoteConnectionStatus: status,
            },
      ),
    [setAppState],
  );
  let runningTasks = useRef(new Map());
  let remoteTasks = useRef(new Map());
  let seededTaskIds = useRef(new Set());
  let writeTaskSnapshot = useCallback(() => {
    let taskList = [...runningTasks.current.values()];
    let presence = seededTaskIds.current.size > 0 ? "in_turn" : "none";
    let workflowRuns = reconcileRemoteTasks(remoteTasks.current, runningTasks.current, Date.now());
    setAppState((prevState) => applyRemoteTaskState(prevState, taskList, workflowRuns, presence));
  }, [setAppState]);
  let resetTaskLists = useCallback(() => {
    runningTasks.current.clear();
    seededTaskIds.current.clear();
    markTasksUnlisted(remoteTasks.current);
    writeTaskSnapshot();
    setInProgressToolUseIDs?.({
      action: "clear",
    });
    retractionState.inProgressToolUses.clear();
  }, [writeTaskSnapshot, setInProgressToolUseIDs, retractionState]);
  let [theme] = useTheme();
  let inputs = {
    sendResponse: (requestId, response) => {
      let manager = managerRef.current;
      if (!manager) return;
      manager.respondToPermissionRequest(requestId, response);
      if (response.behavior === "allow") trackLoading(true);
      else if (response.interrupt) {
        markSendStarted();
        onTurnStopped?.();
      }
    },
    requestDialog,
    toolRegistry: tools,
    toolPermissionContext,
    theme,
    canInterruptTurn: !adapter?.readOnly,
    onAskNotShown: () => {
      setMessages((messages) => [
        ...messages,
        createSystemMessage(REMOTE_PERMISSION_UNSHOWABLE_WAITING, "warning"),
      ]);
    },
  };
  let [dispatcher] = useState(() => new TransportPermissionDispatcher(inputs));
  useEffect(() => {
    dispatcher.setInputs(inputs);
  });
  useEffect(() => {
    if (!adapter) return;
    let { label, createManager, onDisconnected, cleanup } = adapter;
    initHandled.current = false;
    let modeSent = false;
    sending.current = false;
    pendingSends.current = 0;
    logForDebugging(`[${label}] connecting`);
    function sendInitialPermissionMode(manager) {
      if (modeSent || adapter?.readOnly) return;
      let mode = appStoreDirect.getState().toolPermissionContext.mode;
      if (mode === "bubble") return;
      modeSent = true;
      let sendRequest = manager.sendControlRequest?.bind(manager);
      if (!sendRequest) {
        manager.setPermissionMode?.(mode);
        return;
      }
      sendRequest({
        subtype: "set_permission_mode",
        mode,
      }).catch((error) => {
        if (managerRef.current !== manager || classifyControlRequestError(error) !== "server_error") return;
        logForDebugging(
          `[${label}] connect-time set_permission_mode '${mode}' refused by the worker: ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
        if (appStoreDirect.getState().toolPermissionContext.mode !== mode) return;
        onPermissionModeChange("default");
        addNotification(notifyRemoteModeRejected(mode));
        sendRequest({
          subtype: "set_permission_mode",
          mode: "default",
        }).catch((error) => {
          logForDebugging(
            `[${label}] convergence set_permission_mode 'default' failed: ${errorMessage(error)}`,
            {
              level: "warn",
            },
          );
        });
      });
    }
    let remoteRateLimitAdopter = createRemoteRateLimitAdopter(
      () => adapter.hostUsesLocalCredentials === true && !adapter.readOnly,
      "thin_client_stream",
    );
    let replInputAccumulator = undefined;
    let manager = createManager({
      onMessage: (frame) => {
        if (!capFrameDepth(frame)) return;
        if (frame.type === "active_goal") {
          let goalState = parseGoalState(frame.value);
          setAppState((prevState) =>
            prevState.activeGoal === goalState
              ? prevState
              : {
                  ...prevState,
                  activeGoal: goalState,
                },
          );
          logEvent("tengu_remote_active_goal_adopted", {
            via: lit_2("thin_client_stream"),
            active: goalState !== undefined,
          });
          return;
        }
        if (frame.type === "autocompact_state") {
          adoptRemoteAutocompactState(setAppState, frame.value, lit_2("thin_client_stream"));
          return;
        }
        let refusalSignal = isModelRefusalFallback_2(frame);
        if (refusalSignal)
          evictRefusalRetraction({
            index: retractionState,
            signal: refusalSignal,
            surface: "thin_client",
            setMessages,
            setInProgressToolUseIDs,
          });
        if (isResultEvent(frame)) {
          isSystemInitMessage(seededTaskIds.current, frame);
          writeTaskSnapshot();
          if (pendingSends.current > 0) pendingSends.current--;
          else onTurnComplete?.(frame);
          sending.current = false;
          trackLoading(false);
        }
        if (
          !sending.current &&
          (frame.type === "assistant" ||
            frame.type === "stream_event" ||
            (frame.type === "system" && frame.subtype === "status" && frame.status === "requesting"))
        )
          trackLoading(true);
        if (frame.type === "system" && frame.subtype === "status") {
          let mode = permissionModeOfSystemEvent(frame);
          if (mode !== undefined) onPermissionModeChange(mode);
        }
        if (frame.type === "system" && frame.subtype === "init") {
          if (initHandled.current) return;
          initHandled.current = true;
          onInit?.(frame);
        }
        if (frame.type === "system") {
          applyRemoteTaskEvent(remoteTasks.current, frame, Date.now());
          isSystemInitMessage(seededTaskIds.current, frame);
          if (toBackgroundTaskEvent(runningTasks.current, frame)) {
            writeTaskSnapshot();
            return;
          }
          if (frame.subtype === "notification") {
            if (isValidNotice(frame)) {
              let notification = normalizeSdkNotification(frame, "remote");
              let evictedKey = pickRemoteNotificationToEvict(
                appStoreDirect.getState().notifications,
                notification.key,
              );
              if (evictedKey !== null) removeNotification(evictedKey);
              addNotification(notification);
              logEvent("tengu_remote_notification_routed", {
                via: lit_2("thin_client_stream"),
                priority: fromEnum(frame.priority),
              });
            } else logForDebugging("[useThinClientSession] Dropping malformed notification frame");
            return;
          }
        }
        if (frame.type === "rate_limit_event") {
          let rateLimitInfo = dropRemoteRateLimitFrame(frame.rate_limit_info);
          if (rateLimitInfo === undefined)
            logForDebugging(`[${label}] Dropping rate_limit_event with invalid rate_limit_info`, {
              level: "warn",
            });
          else {
            let { canUserPurchaseCredits, hasChargeableSavedPaymentMethod, ...rateLimitFields } =
              rateLimitInfo;
            remoteRateLimitAdopter.push(rateLimitFields);
          }
          return;
        }
        if (setInProgressToolUseIDs && frame.type === "user") {
          let content = frame.message?.content;
          if (Array.isArray(content)) {
            let toolUseIds = [];
            for (let block of content) if (block.type === "tool_result") toolUseIds.push(block.tool_use_id);
            if (toolUseIds.length > 0) {
              setInProgressToolUseIDs({
                action: "remove",
                ids: toolUseIds,
              });
              clearInProgressToolUses(retractionState, toolUseIds);
              countOrphanToolResults(
                retractionState,
                toolUseIds,
                "thin_client",
                typeof frame.uuid === "string" ? frame.uuid : null,
              );
            }
          }
        }
        if (
          adapter.interceptMessage?.(frame, {
            setMessages,
          }) === "consumed"
        )
          return;
        let replayed = null;
        if (replayed !== null) {
          if (typeof frame.uuid === "string" && dropLateRetracted(retractionState, frame.uuid, "thin_client"))
            return;
          if (replayed.length > 0) {
            if (typeof frame.uuid === "string")
              recordNestedUuidAliases(
                retractionState,
                frame.uuid,
                replayed.map((message) => message.uuid),
              );
            setMessages((messages) => {
              let filtered = replayed.filter(
                (row) => !messages.some((existing) => existing.uuid === row.uuid),
              );
              return filtered.length === 0 ? messages : [...messages, ...filtered];
            });
          }
          return;
        }
        let converted = convertSDKMessage(frame, adapter.convertOpts);
        if (converted.type === "conversation_reset") {
          streaming?.setStreamingToolUses((current) => (current.length > 0 ? [] : current));
          setInProgressToolUseIDs?.({
            action: "clear",
          });
          retractionState.inProgressToolUses.clear();
          trackLoading(false);
          onConversationReset?.(converted.newConversationId);
          return;
        }
        if (converted.type === "message") {
          streaming?.setStreamingToolUses((current) => (current.length > 0 ? [] : current));
          if (dropLateRetracted(retractionState, converted.message.uuid, "thin_client")) return;
          if (setInProgressToolUseIDs && converted.message.type === "assistant") {
            let toolUseIds = converted.message.message.content
              .filter((block) => block.type === "tool_use")
              .map((block) => block.id);
            if (toolUseIds.length > 0) {
              setInProgressToolUseIDs({
                action: "add",
                ids: toolUseIds,
              });
              recordInProgressToolUses(retractionState, converted.message.uuid, toolUseIds);
            }
          }
          setMessages((messages) => [...messages, converted.message]);
        } else if (converted.type === "stream_event")
          isNonRenderableSystemMessage(converted.event, {
            onMessage: (message) => setMessages((messages) => [...messages, message]),
            onUpdateLength: () => {},
            onSetStreamMode: setStreamMode ?? (() => {}),
            onStreamingToolUses: streaming?.setStreamingToolUses ?? (() => {}),
            replInputAccumulator,
            onApiMetrics: streaming?.recordApiMetricsEvent,
          });
      },
      onPermissionRequest: (request, requestId) => {
        logForDebugging(`[${label}] permission request: ${request.tool_name}`);
        if (adapter.readOnly) {
          trackLoading(false);
          return;
        }
        if (
          dispatcher.dispatch({
            type: "control_request",
            request_id: requestId,
            request,
          })
        )
          trackLoading(false);
      },
      onPermissionCancelled: (requestId, reason) => {
        logForDebugging(`[${label}] permission cancelled: ${requestId}`);
        dispatcher.cancel(requestId);
        if (!sending.current) trackLoading(true);
      },
      onConnected: () => {
        logForDebugging(`[${label}] connected`);
        connected.current = true;
        setConnectionStatus("connected");
        sendInitialPermissionMode(manager);
      },
      onReconnecting: (attempt, maxAttempts) => {
        modeSent = false;
        logForDebugging(
          `[${label}] dropped, reconnecting${attempt != null ? ` (${attempt}/${maxAttempts})` : ""}`,
        );
        connected.current = false;
        setConnectionStatus("reconnecting");
        if (!adapter.replaysOnReconnect) trackLoading(false);
        sending.current = false;
        pendingSends.current = 0;
        resetTaskLists();
        if (attempt != null)
          setMessages((messages) => [
            ...messages,
            createSystemMessage(
              `Connection dropped \u2014 reconnecting (attempt ${attempt}/${maxAttempts})...`,
              "warning",
            ),
          ]);
      },
      onDisconnected: () => {
        logForDebugging(`[${label}] disconnected`);
        let wasConnected = connected.current;
        connected.current = false;
        setConnectionStatus("disconnected");
        sending.current = false;
        pendingSends.current = 0;
        trackLoading(false);
        resetTaskLists();
        onDisconnected(wasConnected);
      },
      onError: (error) => {
        logForDebugging(`[${label}] error: ${error.message}`);
      },
    });
    managerRef.current = manager;
    manager.connect();
    sendInitialPermissionMode(manager);
    let afterConnectResult = adapter.afterConnect?.(manager);
    let taskMap = remoteTasks.current;
    return () => {
      logForDebugging(`[${label}] cleanup`);
      dispatcher.drain();
      afterConnectResult?.();
      setAppState((prevState) =>
        prevState.activeGoal === undefined
          ? prevState
          : {
              ...prevState,
              activeGoal: undefined,
            },
      );
      setAppState((prevState) =>
        prevState.remoteAutocompactState === undefined
          ? prevState
          : {
              ...prevState,
              remoteAutocompactState: undefined,
            },
      );
      taskMap.clear();
      setAppState((prevState) =>
        prevState.remoteWorkflowRuns.length === 0
          ? prevState
          : {
              ...prevState,
              remoteWorkflowRuns: [],
            },
      );
      remoteRateLimitAdopter.dispose();
      manager.disconnect();
      cleanup?.();
      managerRef.current = null;
    };
  }, [
    adapter,
    setMessages,
    trackLoading,
    onInit,
    onPermissionModeChange,
    streaming,
    setStreamMode,
    setInProgressToolUseIDs,
    onConversationReset,
    onTurnComplete,
    setConnectionStatus,
    writeTaskSnapshot,
    resetTaskLists,
    dispatcher,
    addNotification,
    removeNotification,
    appStoreDirect,
    retractionState,
  ]);
  let sendMessage = useCallback(
    async (text, options) => {
      let manager = managerRef.current;
      if (!manager) {
        setMessages((messages) => [
          ...messages,
          createSystemMessage(
            "Not connected to the remote session \u2014 your message wasn't sent.",
            "warning",
          ),
        ]);
        return false;
      }
      let wasSending = sending.current;
      sending.current = false;
      trackLoading(true);
      let result = await manager.sendMessage(text, options);
      if (!result.ok) {
        sending.current = sending.current || (wasSending && pendingSends.current > 0);
        setMessages((messages) => [
          ...messages,
          createSystemMessage(
            `Couldn't send your message \u2014 ${result.reason}. It wasn't delivered to the remote session.`,
            "warning",
          ),
        ]);
        trackLoading(false);
        return false;
      }
      return true;
    },
    [trackLoading, setMessages],
  );
  let cancelRequest = useCallback(() => {
    if (!adapter?.readOnly) {
      managerRef.current?.sendInterrupt();
      markSendStarted();
      return;
    }
    trackLoading(false);
  }, [adapter, trackLoading, markSendStarted]);
  let disconnect = useCallback(() => {
    managerRef.current?.disconnect();
    managerRef.current = null;
    connected.current = false;
  }, []);
  let label = adapter?.label;
  let sendControlRequest = useCallback(
    (request, options) => {
      let manager = managerRef.current;
      if (!manager)
        return Promise.reject(Error("Remote session is not connected \u2014 try again in a moment"));
      if (!manager.sendControlRequest)
        return Promise.reject(Error(`sendControlRequest not yet wired for ${label ?? "this"} transport`));
      return manager.sendControlRequest(request, options);
    },
    [label],
  );
  return useMemo(
    () => ({
      isRemoteMode: isAttached,
      sendMessage,
      cancelRequest,
      disconnect,
      sendControlRequest,
    }),
    [isAttached, sendMessage, cancelRequest, disconnect, sendControlRequest],
  );
}
export { useRemoteTransportCore };
