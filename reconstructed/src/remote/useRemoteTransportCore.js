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
  Skr,
  applyRemoteTaskEvent,
  dropRemoteRateLimitFrame,
  M0n,
  countOrphanToolResults,
  dropLateRetracted,
  Ekr,
  vkr,
} from "./remoteSessionEvents.js";
import { useSetAppState, Cr } from "../state/AppState.js";
import {
  useNotifications,
  SLr,
  normalizeSdkNotification,
  pickRemoteNotificationToEvict,
} from "../context/notifications.js";
import { useTheme } from "../components/design-system/ThemeProvider.js";
import { createSystemMessage, isNonRenderableSystemMessage } from "../utils/messages.js";
import { sUe } from "./forwardedPermissionDialog.js";
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
import { pgr } from "../utils/telemetry/memorySummary.js";

/**
 * useRemoteTransportCore：REPL 远程传输核心 hook，连接远端会话、同步消息、权限请求与权限模式。
 */
//@ chunk-18hwfzwa.js:255183-262843 placement
function useRemoteTransportCore({
  adapter: adapter,
  sink: sink,
  isLoading: isLoading,
  requestDialog: requestDialog,
  toolPermissionContext: toolPermissionContext,
  tools: tools,
  onInit: onInit,
  turnStream: turnStream,
}) {
  let He = !!adapter,
    We = turnStream?.streaming,
    ze = turnStream?.setStreamMode,
    Xe = turnStream?.setInProgressToolUseIDs,
    {
      setMessages: setMessages,
      setIsLoading: setIsLoading,
      onPermissionModeChange: onPermissionModeChange,
      onConversationReset: onConversationReset,
      onTurnComplete: onTurnComplete,
      onTurnStopped: onTurnStopped,
    } = sink,
    Dt = R(null),
    Lt = R(!1),
    oo = R(!1),
    [Xt] = y(createRetractionState),
    io = isLoading !== void 0,
    so = R(isLoading ?? !1);
  if (io) so.current = isLoading;
  let po = ce(
      (Sn) => {
        if (Sn && io && so.current) return;
        ((so.current = Sn), setIsLoading(Sn));
      },
      [setIsLoading, io],
    ),
    ao = R(!1),
    co = R(0),
    bo = ce(() => {
      if (!ao.current) co.current++;
      ((ao.current = !0), po(!1));
    }, [po]),
    Ao = useSetAppState(),
    Bo = Cr(),
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    Io = ce(
      (Sn) => Ao(($n) => ($n.remoteConnectionStatus === Sn ? $n : { ...$n, remoteConnectionStatus: Sn })),
      [Ao],
    ),
    Wo = R(new Map()),
    mn = R(new Map()),
    Cn = R(new Set()),
    No = ce(() => {
      let Sn = [...Wo.current.values()],
        $n = Cn.current.size > 0 ? "in_turn" : "none",
        on = reconcileRemoteTasks(mn.current, Wo.current, Date.now());
      Ao((_o) => applyRemoteTaskState(_o, Sn, on, $n));
    }, [Ao]),
    vo = ce(() => {
      (Wo.current.clear(),
        Cn.current.clear(),
        markTasksUnlisted(mn.current),
        No(),
        Xe?.({ action: "clear" }),
        Xt.inProgressToolUses.clear());
    }, [No, Xe, Xt]),
    [Yo] = useTheme(),
    kn = {
      sendResponse: (Sn, $n) => {
        let on = Dt.current;
        if (!on) return;
        if ((on.respondToPermissionRequest(Sn, $n), $n.behavior === "allow")) po(!0);
        else if ($n.interrupt) (bo(), onTurnStopped?.());
      },
      requestDialog: requestDialog,
      toolRegistry: tools,
      toolPermissionContext: toolPermissionContext,
      theme: Yo,
      canInterruptTurn: !adapter?.readOnly,
      onAskNotShown: () => {
        setMessages((Sn) => [...Sn, createSystemMessage(sUe, "warning")]);
      },
    },
    [Fn] = y(() => new TransportPermissionDispatcher(kn));
  (P(() => {
    Fn.setInputs(kn);
  }),
    P(() => {
      if (!adapter) return;
      let {
        label: label,
        createManager: createManager,
        onDisconnected: onDisconnected,
        cleanup: cleanup,
      } = adapter;
      Lt.current = !1;
      let cn = !1;
      ((ao.current = !1), (co.current = 0), logForDebugging(`[${label}] connecting`));
      function Dn(Zn) {
        if (cn || adapter?.readOnly) return;
        let mode = Bo.getState().toolPermissionContext.mode;
        if (mode === "bubble") return;
        cn = !0;
        let dr = Zn.sendControlRequest?.bind(Zn);
        if (!dr) {
          Zn.setPermissionMode?.(mode);
          return;
        }
        dr({ subtype: "set_permission_mode", mode: mode }).catch((or) => {
          if (Dt.current !== Zn || classifyControlRequestError(or) !== "server_error") return;
          if (
            (logForDebugging(
              `[${label}] connect-time set_permission_mode '${mode}' refused by the worker: ${errorMessage(or)}`,
              { level: "warn" },
            ),
            Bo.getState().toolPermissionContext.mode !== mode)
          )
            return;
          (onPermissionModeChange("default"),
            addNotification(notifyRemoteModeRejected(mode)),
            dr({ subtype: "set_permission_mode", mode: "default" }).catch((pr) => {
              logForDebugging(
                `[${label}] convergence set_permission_mode 'default' failed: ${errorMessage(pr)}`,
                { level: "warn" },
              );
            }));
        });
      }
      let wn = createRemoteRateLimitAdopter(
          () => adapter.hostUsesLocalCredentials === !0 && !adapter.readOnly,
          "thin_client_stream",
        ),
        mr = void 0,
        Kn = createManager({
          onMessage: (Zn) => {
            if (!capFrameDepth(Zn)) return;
            if (Zn.type === "active_goal") {
              let pr = parseGoalState(Zn.value);
              (Ao((Qn) => (Qn.activeGoal === pr ? Qn : { ...Qn, activeGoal: pr })),
                logEvent("tengu_remote_active_goal_adopted", {
                  via: lit_2("thin_client_stream"),
                  active: pr !== void 0,
                }));
              return;
            }
            if (Zn.type === "autocompact_state") {
              adoptRemoteAutocompactState(Ao, Zn.value, lit_2("thin_client_stream"));
              return;
            }
            let Un = isModelRefusalFallback_2(Zn);
            if (Un)
              evictRefusalRetraction({
                index: Xt,
                signal: Un,
                surface: "thin_client",
                setMessages: setMessages,
                setInProgressToolUseIDs: Xe,
              });
            if (Skr(Zn)) {
              if ((isSystemInitMessage(Cn.current, Zn), No(), co.current > 0)) co.current--;
              else onTurnComplete?.(Zn);
              ((ao.current = !1), po(!1));
            }
            if (
              !ao.current &&
              (Zn.type === "assistant" ||
                Zn.type === "stream_event" ||
                (Zn.type === "system" && Zn.subtype === "status" && Zn.status === "requesting"))
            )
              po(!0);
            if (Zn.type === "system" && Zn.subtype === "status") {
              let pr = pgr(Zn);
              if (pr !== void 0) onPermissionModeChange(pr);
            }
            if (Zn.type === "system" && Zn.subtype === "init") {
              if (Lt.current) return;
              ((Lt.current = !0), onInit?.(Zn));
            }
            if (Zn.type === "system") {
              if (
                (applyRemoteTaskEvent(mn.current, Zn, Date.now()),
                isSystemInitMessage(Cn.current, Zn),
                toBackgroundTaskEvent(Wo.current, Zn))
              ) {
                No();
                return;
              }
              if (Zn.subtype === "notification") {
                if (SLr(Zn)) {
                  let pr = normalizeSdkNotification(Zn, "remote"),
                    Qn = pickRemoteNotificationToEvict(Bo.getState().notifications, pr.key);
                  if (Qn !== null) removeNotification(Qn);
                  (addNotification(pr),
                    logEvent("tengu_remote_notification_routed", {
                      via: lit_2("thin_client_stream"),
                      priority: fromEnum(Zn.priority),
                    }));
                } else logForDebugging("[useThinClientSession] Dropping malformed notification frame");
                return;
              }
            }
            if (Zn.type === "rate_limit_event") {
              let pr = dropRemoteRateLimitFrame(Zn.rate_limit_info);
              if (pr === void 0)
                logForDebugging(`[${label}] Dropping rate_limit_event with invalid rate_limit_info`, {
                  level: "warn",
                });
              else {
                let {
                  canUserPurchaseCredits: canUserPurchaseCredits,
                  hasChargeableSavedPaymentMethod: hasChargeableSavedPaymentMethod,
                  ...Ir
                } = pr;
                wn.push(Ir);
              }
              return;
            }
            if (Xe && Zn.type === "user") {
              let pr = Zn.message?.content;
              if (Array.isArray(pr)) {
                let Qn = [];
                for (let ur of pr) if (ur.type === "tool_result") Qn.push(ur.tool_use_id);
                if (Qn.length > 0)
                  (Xe({ action: "remove", ids: Qn }),
                    M0n(Xt, Qn),
                    countOrphanToolResults(
                      Xt,
                      Qn,
                      "thin_client",
                      typeof Zn.uuid === "string" ? Zn.uuid : null,
                    ));
              }
            }
            if (adapter.interceptMessage?.(Zn, { setMessages: setMessages }) === "consumed") return;
            let dr = null;
            if (dr !== null) {
              if (typeof Zn.uuid === "string" && dropLateRetracted(Xt, Zn.uuid, "thin_client")) return;
              if (dr.length > 0) {
                if (typeof Zn.uuid === "string")
                  Ekr(
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
              (We?.setStreamingToolUses((pr) => (pr.length > 0 ? [] : pr)),
                Xe?.({ action: "clear" }),
                Xt.inProgressToolUses.clear(),
                po(!1),
                onConversationReset?.(or.newConversationId));
              return;
            }
            if (or.type === "message") {
              if (
                (We?.setStreamingToolUses((pr) => (pr.length > 0 ? [] : pr)),
                dropLateRetracted(Xt, or.message.uuid, "thin_client"))
              )
                return;
              if (Xe && or.message.type === "assistant") {
                let mapped = or.message.message.content
                  .filter((Qn) => Qn.type === "tool_use")
                  .map((Qn) => Qn.id);
                if (mapped.length > 0) (Xe({ action: "add", ids: mapped }), vkr(Xt, or.message.uuid, mapped));
              }
              setMessages((pr) => [...pr, or.message]);
            } else if (or.type === "stream_event")
              isNonRenderableSystemMessage(or.event, {
                onMessage: (pr) => setMessages((Qn) => [...Qn, pr]),
                onUpdateLength: () => {},
                onSetStreamMode: ze ?? (() => {}),
                onStreamingToolUses: We?.setStreamingToolUses ?? (() => {}),
                replInputAccumulator: mr,
                onApiMetrics: We?.recordApiMetricsEvent,
              });
          },
          onPermissionRequest: (Zn, Un) => {
            if ((logForDebugging(`[${label}] permission request: ${Zn.tool_name}`), adapter.readOnly)) {
              po(!1);
              return;
            }
            if (Fn.dispatch({ type: "control_request", request_id: Un, request: Zn })) po(!1);
          },
          onPermissionCancelled: (Zn, Un) => {
            if ((logForDebugging(`[${label}] permission cancelled: ${Zn}`), Fn.cancel(Zn), !ao.current))
              po(!0);
          },
          onConnected: () => {
            (logForDebugging(`[${label}] connected`), (oo.current = !0), Io("connected"), Dn(Kn));
          },
          onReconnecting: (Zn, Un) => {
            if (
              ((cn = !1),
              logForDebugging(`[${label}] dropped, reconnecting${Zn != null ? ` (${Zn}/${Un})` : ""}`),
              (oo.current = !1),
              Io("reconnecting"),
              !adapter.replaysOnReconnect)
            )
              po(!1);
            if (((ao.current = !1), (co.current = 0), vo(), Zn != null))
              setMessages((dr) => [
                ...dr,
                createSystemMessage(
                  `Connection dropped \u2014 reconnecting (attempt ${Zn}/${Un})...`,
                  "warning",
                ),
              ]);
          },
          onDisconnected: () => {
            logForDebugging(`[${label}] disconnected`);
            let Zn = oo.current;
            ((oo.current = !1),
              Io("disconnected"),
              (ao.current = !1),
              (co.current = 0),
              po(!1),
              vo(),
              onDisconnected(Zn));
          },
          onError: (Zn) => {
            logForDebugging(`[${label}] error: ${Zn.message}`);
          },
        });
      ((Dt.current = Kn), Kn.connect(), Dn(Kn));
      let Wn = adapter.afterConnect?.(Kn),
        Fr = mn.current;
      return () => {
        (logForDebugging(`[${label}] cleanup`),
          Fn.drain(),
          Wn?.(),
          Ao((Zn) => (Zn.activeGoal === void 0 ? Zn : { ...Zn, activeGoal: void 0 })),
          Ao((Zn) => (Zn.remoteAutocompactState === void 0 ? Zn : { ...Zn, remoteAutocompactState: void 0 })),
          Fr.clear(),
          Ao((Zn) => (Zn.remoteWorkflowRuns.length === 0 ? Zn : { ...Zn, remoteWorkflowRuns: [] })),
          wn.dispose(),
          Kn.disconnect(),
          cleanup?.(),
          (Dt.current = null));
      };
    }, [
      adapter,
      setMessages,
      po,
      onInit,
      onPermissionModeChange,
      We,
      ze,
      Xe,
      onConversationReset,
      onTurnComplete,
      Io,
      No,
      vo,
      Fn,
      addNotification,
      removeNotification,
      Bo,
      Xt,
    ]));
  let bn = ce(
      async (Sn, $n) => {
        let on = Dt.current;
        if (!on)
          return (
            setMessages((Dn) => [
              ...Dn,
              createSystemMessage(
                "Not connected to the remote session \u2014 your message wasn't sent.",
                "warning",
              ),
            ]),
            !1
          );
        let _o = ao.current;
        ((ao.current = !1), po(!0));
        let sendMessage = await on.sendMessage(Sn, $n);
        if (!sendMessage.ok)
          return (
            (ao.current = ao.current || (_o && co.current > 0)),
            setMessages((Dn) => [
              ...Dn,
              createSystemMessage(
                `Couldn't send your message \u2014 ${sendMessage.reason}. It wasn't delivered to the remote session.`,
                "warning",
              ),
            ]),
            po(!1),
            !1
          );
        return !0;
      },
      [po, setMessages],
    ),
    Go = ce(() => {
      if (!adapter?.readOnly) {
        (Dt.current?.sendInterrupt(), bo());
        return;
      }
      po(!1);
    }, [adapter, po, bo]),
    hn = ce(() => {
      (Dt.current?.disconnect(), (Dt.current = null), (oo.current = !1));
    }, []),
    Mn = adapter?.label,
    Xo = ce(
      (Sn, $n) => {
        let on = Dt.current;
        if (!on) return Promise.reject(Error("Remote session is not connected \u2014 try again in a moment"));
        if (!on.sendControlRequest)
          return Promise.reject(Error(`sendControlRequest not yet wired for ${Mn ?? "this"} transport`));
        return on.sendControlRequest(Sn, $n);
      },
      [Mn],
    );
  return Q(
    () => ({ isRemoteMode: He, sendMessage: bn, cancelRequest: Go, disconnect: hn, sendControlRequest: Xo }),
    [He, bn, Go, hn, Xo],
  );
}

export { useRemoteTransportCore };
