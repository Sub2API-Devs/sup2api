/**
 * remote/useRemoteTransportCore.ts
 *
 * 2.1.316 新增。远程传输核心 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: placement 1
 */
import { R, y, ce, P, Q } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:255183-262843 placement
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
  let He = !!adapter;
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
  let managerRef = R(null);
  let Lt = R(false);
  let oo = R(false);
  let [Xt] = y(createRetractionState);
  let io = isLoading !== undefined;
  let isLoadingRef = R(isLoading ?? false);
  if (io) isLoadingRef.current = isLoading;
  let po = ce(
    (Sn) => {
      if (Sn && io && isLoadingRef.current) return;
      isLoadingRef.current = Sn;
      setIsLoading(Sn);
    },
    [setIsLoading, io],
  );
  let ao = R(false);
  let co = R(0);
  let bo = ce(() => {
    if (!ao.current) co.current++;
    ao.current = true;
    po(false);
  }, [po]);
  let setAppState = useSetAppState();
  let appStoreDirect = useAppStoreDirect();
  let { addNotification, removeNotification } = useNotifications();
  let Io = ce(
    (Sn) =>
      setAppState(($n) =>
        $n.remoteConnectionStatus === Sn
          ? $n
          : {
              ...$n,
              remoteConnectionStatus: Sn,
            },
      ),
    [setAppState],
  );
  let Wo = R(new Map());
  let mn = R(new Map());
  let Cn = R(new Set());
  let No = ce(() => {
    let Sn = [...Wo.current.values()];
    let $n = Cn.current.size > 0 ? "in_turn" : "none";
    let on = reconcileRemoteTasks(mn.current, Wo.current, Date.now());
    setAppState((_o) => applyRemoteTaskState(_o, Sn, on, $n));
  }, [setAppState]);
  let vo = ce(() => {
    Wo.current.clear();
    Cn.current.clear();
    markTasksUnlisted(mn.current);
    No();
    setInProgressToolUseIDs?.({
      action: "clear",
    });
    Xt.inProgressToolUses.clear();
  }, [No, setInProgressToolUseIDs, Xt]);
  let [Yo] = useTheme();
  let inputs = {
    sendResponse: (Sn, $n) => {
      let on = managerRef.current;
      if (!on) return;
      on.respondToPermissionRequest(Sn, $n);
      if ($n.behavior === "allow") po(true);
      else if ($n.interrupt) {
        bo();
        onTurnStopped?.();
      }
    },
    requestDialog,
    toolRegistry: tools,
    toolPermissionContext,
    theme: Yo,
    canInterruptTurn: !adapter?.readOnly,
    onAskNotShown: () => {
      setMessages((Sn) => [...Sn, createSystemMessage(REMOTE_PERMISSION_UNSHOWABLE_WAITING, "warning")]);
    },
  };
  let [Fn] = y(() => new TransportPermissionDispatcher(inputs));
  P(() => {
    Fn.setInputs(inputs);
  });
  P(() => {
    if (!adapter) return;
    let { label, createManager, onDisconnected, cleanup } = adapter;
    Lt.current = false;
    let cn = false;
    ao.current = false;
    co.current = 0;
    logForDebugging(`[${label}] connecting`);
    function Dn(manager) {
      if (cn || adapter?.readOnly) return;
      let mode = appStoreDirect.getState().toolPermissionContext.mode;
      if (mode === "bubble") return;
      cn = true;
      let dr = manager.sendControlRequest?.bind(manager);
      if (!dr) {
        manager.setPermissionMode?.(mode);
        return;
      }
      dr({
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
        dr({
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
      onMessage: (Zn) => {
        if (!capFrameDepth(Zn)) return;
        if (Zn.type === "active_goal") {
          let goalState = parseGoalState(Zn.value);
          setAppState((Qn) =>
            Qn.activeGoal === goalState
              ? Qn
              : {
                  ...Qn,
                  activeGoal: goalState,
                },
          );
          logEvent("tengu_remote_active_goal_adopted", {
            via: lit_2("thin_client_stream"),
            active: goalState !== undefined,
          });
          return;
        }
        if (Zn.type === "autocompact_state") {
          adoptRemoteAutocompactState(setAppState, Zn.value, lit_2("thin_client_stream"));
          return;
        }
        let Un = isModelRefusalFallback_2(Zn);
        if (Un)
          evictRefusalRetraction({
            index: Xt,
            signal: Un,
            surface: "thin_client",
            setMessages,
            setInProgressToolUseIDs,
          });
        if (isResultEvent(Zn)) {
          isSystemInitMessage(Cn.current, Zn);
          No();
          if (co.current > 0) co.current--;
          else onTurnComplete?.(Zn);
          ao.current = false;
          po(false);
        }
        if (
          !ao.current &&
          (Zn.type === "assistant" ||
            Zn.type === "stream_event" ||
            (Zn.type === "system" && Zn.subtype === "status" && Zn.status === "requesting"))
        )
          po(true);
        if (Zn.type === "system" && Zn.subtype === "status") {
          let pr = permissionModeOfSystemEvent(Zn);
          if (pr !== undefined) onPermissionModeChange(pr);
        }
        if (Zn.type === "system" && Zn.subtype === "init") {
          if (Lt.current) return;
          Lt.current = true;
          onInit?.(Zn);
        }
        if (Zn.type === "system") {
          applyRemoteTaskEvent(mn.current, Zn, Date.now());
          isSystemInitMessage(Cn.current, Zn);
          if (toBackgroundTaskEvent(Wo.current, Zn)) {
            No();
            return;
          }
          if (Zn.subtype === "notification") {
            if (isValidNotice(Zn)) {
              let pr = normalizeSdkNotification(Zn, "remote");
              let Qn = pickRemoteNotificationToEvict(appStoreDirect.getState().notifications, pr.key);
              if (Qn !== null) removeNotification(Qn);
              addNotification(pr);
              logEvent("tengu_remote_notification_routed", {
                via: lit_2("thin_client_stream"),
                priority: fromEnum(Zn.priority),
              });
            } else logForDebugging("[useThinClientSession] Dropping malformed notification frame");
            return;
          }
        }
        if (Zn.type === "rate_limit_event") {
          let pr = dropRemoteRateLimitFrame(Zn.rate_limit_info);
          if (pr === undefined)
            logForDebugging(`[${label}] Dropping rate_limit_event with invalid rate_limit_info`, {
              level: "warn",
            });
          else {
            let { canUserPurchaseCredits, hasChargeableSavedPaymentMethod, ...Ir } = pr;
            remoteRateLimitAdopter.push(Ir);
          }
          return;
        }
        if (setInProgressToolUseIDs && Zn.type === "user") {
          let content = Zn.message?.content;
          if (Array.isArray(content)) {
            let Qn = [];
            for (let ur of content) if (ur.type === "tool_result") Qn.push(ur.tool_use_id);
            if (Qn.length > 0) {
              setInProgressToolUseIDs({
                action: "remove",
                ids: Qn,
              });
              clearInProgressToolUses(Xt, Qn);
              countOrphanToolResults(Xt, Qn, "thin_client", typeof Zn.uuid === "string" ? Zn.uuid : null);
            }
          }
        }
        if (
          adapter.interceptMessage?.(Zn, {
            setMessages,
          }) === "consumed"
        )
          return;
        let dr = null;
        if (dr !== null) {
          if (typeof Zn.uuid === "string" && dropLateRetracted(Xt, Zn.uuid, "thin_client")) return;
          if (dr.length > 0) {
            if (typeof Zn.uuid === "string")
              recordNestedUuidAliases(
                Xt,
                Zn.uuid,
                dr.map((pr) => pr.uuid),
              );
            setMessages((pr) => {
              let filtered = dr.filter((ur) => !pr.some((Ir) => Ir.uuid === ur.uuid));
              return filtered.length === 0 ? pr : [...pr, ...filtered];
            });
          }
          return;
        }
        let or = convertSDKMessage(Zn, adapter.convertOpts);
        if (or.type === "conversation_reset") {
          streaming?.setStreamingToolUses((pr) => (pr.length > 0 ? [] : pr));
          setInProgressToolUseIDs?.({
            action: "clear",
          });
          Xt.inProgressToolUses.clear();
          po(false);
          onConversationReset?.(or.newConversationId);
          return;
        }
        if (or.type === "message") {
          streaming?.setStreamingToolUses((pr) => (pr.length > 0 ? [] : pr));
          if (dropLateRetracted(Xt, or.message.uuid, "thin_client")) return;
          if (setInProgressToolUseIDs && or.message.type === "assistant") {
            let mapped = or.message.message.content.filter((Qn) => Qn.type === "tool_use").map((Qn) => Qn.id);
            if (mapped.length > 0) {
              setInProgressToolUseIDs({
                action: "add",
                ids: mapped,
              });
              recordInProgressToolUses(Xt, or.message.uuid, mapped);
            }
          }
          setMessages((pr) => [...pr, or.message]);
        } else if (or.type === "stream_event")
          isNonRenderableSystemMessage(or.event, {
            onMessage: (pr) => setMessages((Qn) => [...Qn, pr]),
            onUpdateLength: () => {},
            onSetStreamMode: setStreamMode ?? (() => {}),
            onStreamingToolUses: streaming?.setStreamingToolUses ?? (() => {}),
            replInputAccumulator,
            onApiMetrics: streaming?.recordApiMetricsEvent,
          });
      },
      onPermissionRequest: (Zn, requestId) => {
        logForDebugging(`[${label}] permission request: ${Zn.tool_name}`);
        if (adapter.readOnly) {
          po(false);
          return;
        }
        if (
          Fn.dispatch({
            type: "control_request",
            request_id: requestId,
            request: Zn,
          })
        )
          po(false);
      },
      onPermissionCancelled: (Zn, Un) => {
        logForDebugging(`[${label}] permission cancelled: ${Zn}`);
        Fn.cancel(Zn);
        if (!ao.current) po(true);
      },
      onConnected: () => {
        logForDebugging(`[${label}] connected`);
        oo.current = true;
        Io("connected");
        Dn(manager);
      },
      onReconnecting: (Zn, Un) => {
        cn = false;
        logForDebugging(`[${label}] dropped, reconnecting${Zn != null ? ` (${Zn}/${Un})` : ""}`);
        oo.current = false;
        Io("reconnecting");
        if (!adapter.replaysOnReconnect) po(false);
        ao.current = false;
        co.current = 0;
        vo();
        if (Zn != null)
          setMessages((dr) => [
            ...dr,
            createSystemMessage(`Connection dropped \u2014 reconnecting (attempt ${Zn}/${Un})...`, "warning"),
          ]);
      },
      onDisconnected: () => {
        logForDebugging(`[${label}] disconnected`);
        let Zn = oo.current;
        oo.current = false;
        Io("disconnected");
        ao.current = false;
        co.current = 0;
        po(false);
        vo();
        onDisconnected(Zn);
      },
      onError: (Zn) => {
        logForDebugging(`[${label}] error: ${Zn.message}`);
      },
    });
    managerRef.current = manager;
    manager.connect();
    Dn(manager);
    let Wn = adapter.afterConnect?.(manager);
    let Fr = mn.current;
    return () => {
      logForDebugging(`[${label}] cleanup`);
      Fn.drain();
      Wn?.();
      setAppState((Zn) =>
        Zn.activeGoal === undefined
          ? Zn
          : {
              ...Zn,
              activeGoal: undefined,
            },
      );
      setAppState((Zn) =>
        Zn.remoteAutocompactState === undefined
          ? Zn
          : {
              ...Zn,
              remoteAutocompactState: undefined,
            },
      );
      Fr.clear();
      setAppState((Zn) =>
        Zn.remoteWorkflowRuns.length === 0
          ? Zn
          : {
              ...Zn,
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
    po,
    onInit,
    onPermissionModeChange,
    streaming,
    setStreamMode,
    setInProgressToolUseIDs,
    onConversationReset,
    onTurnComplete,
    Io,
    No,
    vo,
    Fn,
    addNotification,
    removeNotification,
    appStoreDirect,
    Xt,
  ]);
  let bn = ce(
    async (Sn, $n) => {
      let on = managerRef.current;
      if (!on) {
        setMessages((Dn) => [
          ...Dn,
          createSystemMessage(
            "Not connected to the remote session \u2014 your message wasn't sent.",
            "warning",
          ),
        ]);
        return false;
      }
      let _o = ao.current;
      ao.current = false;
      po(true);
      let cn = await on.sendMessage(Sn, $n);
      if (!cn.ok) {
        ao.current = ao.current || (_o && co.current > 0);
        setMessages((Dn) => [
          ...Dn,
          createSystemMessage(
            `Couldn't send your message \u2014 ${cn.reason}. It wasn't delivered to the remote session.`,
            "warning",
          ),
        ]);
        po(false);
        return false;
      }
      return true;
    },
    [po, setMessages],
  );
  let Go = ce(() => {
    if (!adapter?.readOnly) {
      managerRef.current?.sendInterrupt();
      bo();
      return;
    }
    po(false);
  }, [adapter, po, bo]);
  let hn = ce(() => {
    managerRef.current?.disconnect();
    managerRef.current = null;
    oo.current = false;
  }, []);
  let label = adapter?.label;
  let Xo = ce(
    (Sn, $n) => {
      let on = managerRef.current;
      if (!on) return Promise.reject(Error("Remote session is not connected \u2014 try again in a moment"));
      if (!on.sendControlRequest)
        return Promise.reject(Error(`sendControlRequest not yet wired for ${label ?? "this"} transport`));
      return on.sendControlRequest(Sn, $n);
    },
    [label],
  );
  return Q(
    () => ({
      isRemoteMode: He,
      sendMessage: bn,
      cancelRequest: Go,
      disconnect: hn,
      sendControlRequest: Xo,
    }),
    [He, bn, Go, hn, Xo],
  );
}
export { useRemoteTransportCore };
