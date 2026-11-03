/**
 * bridge/replControlHandler.ts
 *
 * 2.1.316 新增：REPL Remote Control 桥的 control_request 总分发（initialize/interrupt/set_model/apply_flag_settings 等）与合成 result 消息
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-1qpz7qcd.js (15)
 * attribution: placement 15
 */
import { randomUUID } from "crypto";
import { logForDebugging } from "../utils/debug.js";
import { WireSafeControlError, errorMessage, isAbortError } from "../utils/errors.js";
import {
  sendControlResponseWhenSettled,
  OUTBOUND_ONLY_ERROR,
  WORKSPACE_DIFF_TIMEOUT_MS,
  WORKSPACE_DIFF_TIMEOUT_MESSAGE,
  SIDE_QUESTION_TIMEOUT_MS,
  SIDE_QUESTION_TIMEOUT_MESSAGE,
  ALLOWED_FLAG_SETTING_KEYS,
  Ue,
  Fe,
} from "./bridgeMessaging.js";
import { sanitizeTelemetryString } from "../utils/sanitization.js";
import { isTerminalShutdown } from "../utils/terminalShutdown.js";
import {
  READ_ONLY_CONTROL_SUBTYPES,
  SESSION_SHUTTING_DOWN_MESSAGE,
  markLiveOnlyResponse,
  sanitizeStringList,
  respondToSetModelVerdict,
  isValidThinkingSettingsRequest,
  c7r,
  stripInitializeAgentPaths,
  parseOptionalToolUseId,
  a7r,
  BACKGROUND_TASKS_DISABLED_MESSAGE,
  SIDE_QUESTION_REQUEST_SCHEMA,
  markSyntheticControlResponse,
} from "./controlRequests.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { formatOperationFailure } from "../services/plugins/pluginOperations.js";
import { parsePermissionMode, UNRECOGNIZED_PERMISSION_MODE_ERROR } from "../types/permissions.js";
import { withTimeout } from "../utils/sleep.js";
import { uf } from "../tools/AgentTool/backgroundGates.js";
import { printableName } from "../utils/printableName.js";
import { isAbortedTerminalReason } from "../entrypoints/sdk/coreSchemas.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";

/**
 * mcp_reconnect 结果不是 connected 时抛错
 */
//@ chunk-1qpz7qcd.js:7648-7857 placement
function assertMcpReconnected(e) {
  if (e.type === "connected") return;
  if (e.type === "failed") {
    if (e.error) logForDebugging(`mcp_reconnect failed: ${e.error}`, { level: "error" });
    throw new WireSafeControlError("Connection failed");
  }
  throw new WireSafeControlError(`Server status: ${e.type}`);
}
//@ chunk-1qpz7qcd.js:7857-7936 placement = getRiskColor (0.785)
function getRiskColor(e, r, n, s) {
  sendControlResponseWhenSettled(
    e,
    r,
    n,
    s.then((i) => ({ subtype: "success", response: i ?? {} })),
  );
}
/**
 * 该控制请求是否要"实时回复"（mcp_status 的 liveReply，或带回调的 mcp_authenticate）。
 */
//@ chunk-1qpz7qcd.js:7936-8103 placement
function wantsLiveReply(request, response) {
  let request_2 = request.request;
  if (request_2.subtype === "mcp_status") return request_2.liveReply === !0;
  return (
    request_2.subtype === "mcp_authenticate" &&
    request_2.liveReply === !0 &&
    response?.callbackExpected === !0
  );
}
/**
 * 生成 control_response：结果 ok=false 时为 error（错误文本脱敏），否则 success。
 */
//@ chunk-1qpz7qcd.js:8506-8703 placement
function buildControlResponse(e, r) {
  if (r && r.ok === !1)
    return {
      type: "control_response",
      response: { subtype: "error", request_id: e, error: sanitizeTelemetryString(r.error) },
    };
  return { type: "control_response", response: { subtype: "success", request_id: e } };
}
/**
 * REPL Remote Control 桥的 control_request 总分发器：initialize、interrupt、set_model、set_permission_mode、background_tasks、get_context_usage、read_file、rename_session 等，逐个调用回调并回 control_response。
 */
//@ chunk-1qpz7qcd.js:8703-22053 placement
function handleReplBridgeControlRequest(e, r) {
  let {
    transport: transport,
    sessionId: sessionId,
    outboundOnly: outboundOnly,
    getInitializeState: getInitializeState,
    claudeCodeVersion: claudeCodeVersion,
    getCommands: getCommands,
    reportsInboundReadReceipts: reportsInboundReadReceipts,
    getPendingPrompts: getPendingPrompts,
    onInterrupt: onInterrupt,
    onStopTask: onStopTask,
    onBackgroundTasks: onBackgroundTasks,
    onCancelAsyncMessage: onCancelAsyncMessage,
    onDialogKindsDeclared: onDialogKindsDeclared,
    onClientInitialize: onClientInitialize,
    onSetModel: onSetModel,
    onSetMaxThinkingTokens: onSetMaxThinkingTokens,
    onSetPermissionMode: onSetPermissionMode,
    onApplyFlagSettings: onApplyFlagSettings,
    onRenameSession: onRenameSession,
    onSetColor: onSetColor,
    onFileSuggestions: onFileSuggestions,
    onReadFile: onReadFile,
    onGetWorkspaceDiff: onGetWorkspaceDiff,
    onGetContextUsage: onGetContextUsage,
    onMcpAuthenticate: onMcpAuthenticate,
    onMcpOauthCallbackUrl: onMcpOauthCallbackUrl,
    onMcpReconnect: onMcpReconnect,
    onMcpSetServers: onMcpSetServers,
    onForkConversation: onForkConversation,
    hasPendingPrompts: hasPendingPrompts,
    onSideQuestion: onSideQuestion,
    cancellableRequests: cancellableRequests,
  } = r;
  if (!transport) {
    logForDebugging("[bridge:repl] Cannot respond to control_request: transport not configured");
    return;
  }
  let q =
      r.writeFrame ??
      ((l) => {
        transport.write(l);
      }),
    S;
  if (isTerminalShutdown() && !READ_ONLY_CONTROL_SUBTYPES.has(e.request.subtype)) {
    (logForDebugging(`[bridge] refusing ${e.request.subtype}: this process is exiting`),
      (S = {
        type: "control_response",
        response: { subtype: "error", request_id: e.request_id, error: SESSION_SHUTTING_DOWN_MESSAGE },
      }));
    let l = { ...S, session_id: sessionId };
    transport.write(l);
    return;
  }
  if (outboundOnly && e.request.subtype !== "initialize") {
    S = {
      type: "control_response",
      response: { subtype: "error", request_id: e.request_id, error: OUTBOUND_ONLY_ERROR },
    };
    let l = { ...S, session_id: sessionId };
    (transport.write(l),
      logForDebugging(
        `[bridge:repl] Rejected ${e.request.subtype} (outbound-only) request_id=${e.request_id}`,
      ));
    return;
  }
  let O = r.answerSharedControlRequest?.(e.request);
  if (O instanceof Promise) {
    sendControlResponseWhenSettled(e, q, sessionId, O);
    return;
  }
  if (O !== void 0) {
    let c = {
      ...(O.subtype === "error"
        ? {
            type: "control_response",
            response: { subtype: "error", request_id: e.request_id, error: O.error },
          }
        : wantsLiveReply(e, O.response)
          ? markLiveOnlyResponse(e.request_id, O.response)
          : {
              type: "control_response",
              response: {
                subtype: "success",
                request_id: e.request_id,
                ...(O.response !== void 0 && { response: O.response }),
              },
            }),
      session_id: sessionId,
    };
    (transport.write(c),
      logForDebugging(
        `[bridge:repl] Sent control_response for ${e.request.subtype} request_id=${e.request_id} result=${O.subtype}`,
      ));
    return;
  }
  switch (e.request.subtype) {
    case "initialize": {
      try {
        let R = sanitizeStringList(e.request.supportedDialogKinds);
        if (R.length > 0) onDialogKindsDeclared?.(R);
      } catch (error) {
        logForDebugging(
          `[bridge:repl] dialog-kind capture failed; acking initialize anyway: ${errorMessage(error)}`,
        );
      }
      let l = [];
      if (!outboundOnly)
        try {
          l = getCommands?.() ?? [];
        } catch (error) {
          (logFeatureBad("bridge_initialize_commands", "get_commands_threw"),
            logForDebugging(
              `[bridge:repl] getCommands failed; acking initialize with commands: []: ${errorMessage(error)}`,
            ));
        }
      let c = getPendingPrompts?.() ?? [],
        filtered = c.filter((R) => R.request.subtype === "can_use_tool"),
        filtered_2 = c.filter((R) => R.request.subtype === "request_user_dialog");
      S = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: e.request_id,
          response: {
            commands: l,
            agents: [],
            output_style: "normal",
            available_output_styles: ["normal"],
            models: [],
            account: {},
            pid: process.pid,
            ...(claudeCodeVersion !== void 0 && { claude_code_version: claudeCodeVersion }),
            ...(!outboundOnly && reportsInboundReadReceipts?.() === !0 && { inbound_read_receipts: !0 }),
            ...getInitializeState?.(),
          },
          pending_permission_requests: filtered,
          pending_user_dialog_requests: filtered_2,
        },
      };
      try {
        onClientInitialize?.();
      } catch (error) {
        logForDebugging(
          `[bridge:repl] onClientInitialize failed; acking initialize anyway: ${errorMessage(error)}`,
        );
      }
      break;
    }
    case "set_model": {
      let model = e.request.model;
      if (model != null && typeof model !== "string") {
        (logFeatureBad("model_switch", "invalid_model_type"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: "set_model: model must be a string",
            },
          }));
        break;
      }
      let only_if_model_is_current = e.request.only_if_model_is_current;
      if (only_if_model_is_current !== void 0 && only_if_model_is_current !== !1) {
        (logFeatureBad("model_switch", "only_if_model_is_current_unserved"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error:
                "set_model: Remote Control does not implement only_if_model_is_current. The request changed nothing.",
            },
          }));
        break;
      }
      let k = onSetModel?.(e.request.model ?? void 0);
      if (k && "then" in k) {
        respondToSetModelVerdict({
          verdict: k,
          respond: (h) => {
            let qe = {
              ...{ type: "control_response", response: { ...h, request_id: e.request_id } },
              session_id: sessionId,
            };
            (q(qe),
              logForDebugging(
                `[bridge:repl] Sent control_response for set_model request_id=${e.request_id} result=${h.subtype}`,
              ));
          },
          inform: (h) => {
            for (let R of h)
              q({
                type: "system",
                subtype: "informational",
                content: R,
                level: "notice",
                uuid: randomUUID(),
                session_id: sessionId,
              });
          },
        });
        return;
      }
      if (k && !k.ok)
        S = {
          type: "control_response",
          response: { subtype: "error", request_id: e.request_id, error: sanitizeTelemetryString(k.error) },
        };
      else S = { type: "control_response", response: { subtype: "success", request_id: e.request_id } };
      break;
    }
    case "set_max_thinking_tokens": {
      if (!isValidThinkingSettingsRequest(e.request)) {
        S = {
          type: "control_response",
          response: { subtype: "error", request_id: e.request_id, error: c7r },
        };
        break;
      }
      let l = onSetMaxThinkingTokens?.(e.request.max_thinking_tokens, e.request.thinking_display);
      if (l && "then" in l) {
        let request_id = e.request_id,
          subtype = e.request.subtype;
        l.then(
          (h) => buildControlResponse(request_id, h),
          (h) => ({
            type: "control_response",
            response: { subtype: "error", request_id: request_id, error: formatOperationFailure(subtype, h) },
          }),
        ).then((h) => {
          let R = { ...h, session_id: sessionId };
          (q(R),
            logForDebugging(
              `[bridge:repl] Sent control_response for set_max_thinking_tokens request_id=${request_id} result=${h.response.subtype}`,
            ));
        });
        return;
      }
      S = buildControlResponse(e.request_id, l);
      break;
    }
    case "set_permission_mode": {
      let l = parsePermissionMode(e.request.mode),
        c =
          l === void 0
            ? { ok: !1, error: UNRECOGNIZED_PERMISSION_MODE_ERROR }
            : (onSetPermissionMode?.(l) ?? {
                ok: !1,
                error:
                  "set_permission_mode is not supported in this context (onSetPermissionMode callback not registered)",
              });
      if (c.ok) S = { type: "control_response", response: { subtype: "success", request_id: e.request_id } };
      else
        S = {
          type: "control_response",
          response: { subtype: "error", request_id: e.request_id, error: sanitizeTelemetryString(c.error) },
        };
      break;
    }
    case "rename_session": {
      if (typeof e.request.title !== "string") {
        S = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error: "rename_session: title must be a string",
          },
        };
        break;
      }
      let c = onRenameSession?.(e.request.title) ?? {
        ok: !1,
        error: "rename_session is not supported in this context (onRenameSession callback not registered)",
      };
      if (c.ok) S = { type: "control_response", response: { subtype: "success", request_id: e.request_id } };
      else
        S = {
          type: "control_response",
          response: { subtype: "error", request_id: e.request_id, error: sanitizeTelemetryString(c.error) },
        };
      break;
    }
    case "set_color": {
      let l = onSetColor?.(e.request.color) ?? {
        ok: !1,
        error: "set_color is not supported in this context (onSetColor callback not registered)",
      };
      if (l.ok) S = { type: "control_response", response: { subtype: "success", request_id: e.request_id } };
      else
        S = {
          type: "control_response",
          response: { subtype: "error", request_id: e.request_id, error: sanitizeTelemetryString(l.error) },
        };
      break;
    }
    case "file_suggestions": {
      if (!onFileSuggestions) {
        S = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error:
              "file_suggestions is not supported in this context (onFileSuggestions callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        e,
        q,
        sessionId,
        onFileSuggestions(e.request.query).then((l) => ({ suggestions: l })),
      );
      return;
    }
    case "read_file": {
      if (!onReadFile) {
        S = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error: "read_file is not supported in this context (onReadFile callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        e,
        q,
        sessionId,
        onReadFile(e.request.path, e.request.max_bytes, e.request.encoding, e.request.anchor).then(
          ((l) => (c) => ({ ...c, absPath: l }))(e.request.path),
        ),
      );
      return;
    }
    case "get_workspace_diff": {
      if (!onGetWorkspaceDiff) {
        S = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error:
              "get_workspace_diff is not supported in this context (onGetWorkspaceDiff callback not registered)",
          },
        };
        break;
      }
      let abortController = new AbortController();
      sendControlResponseWhenSettled(
        e,
        q,
        sessionId,
        withTimeout(
          onGetWorkspaceDiff(abortController.signal),
          WORKSPACE_DIFF_TIMEOUT_MS,
          WORKSPACE_DIFF_TIMEOUT_MESSAGE,
        ).then(
          (c) => ({ subtype: "success", response: c }),
          (c) => {
            if ((abortController.abort(), errorMessage(c) === WORKSPACE_DIFF_TIMEOUT_MESSAGE))
              return {
                subtype: "error",
                error: WORKSPACE_DIFF_TIMEOUT_MESSAGE,
                error_code: "workspace_diff_pending",
              };
            throw c;
          },
        ),
      );
      return;
    }
    case "get_context_usage": {
      if (!onGetContextUsage) {
        S = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error:
              "get_context_usage is not supported in this context (onGetContextUsage callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        e,
        q,
        sessionId,
        onGetContextUsage({ detail: e.request.detail }).then((l) => ({
          ...l,
          memoryFiles: [],
          ...stripInitializeAgentPaths(l),
        })),
      );
      return;
    }
    case "get_usage":
      S = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: e.request_id,
          error: "get_usage is not supported in this context",
        },
      };
      break;
    case "mcp_status":
      S = {
        type: "control_response",
        response: { subtype: "success", request_id: e.request_id, response: { mcpServers: [] } },
      };
      break;
    case "mcp_authenticate":
    case "mcp_oauth_callback_url":
    case "mcp_reconnect": {
      let request = e.request,
        { subtype: subtype, serverName: serverName } = request,
        h =
          request.subtype === "mcp_authenticate"
            ? onMcpAuthenticate && ((R) => onMcpAuthenticate(R, request.redirectUri))
            : request.subtype === "mcp_oauth_callback_url"
              ? onMcpOauthCallbackUrl && ((R) => onMcpOauthCallbackUrl(R, request.callbackUrl))
              : onMcpReconnect;
      if (!h) {
        S = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: e.request_id,
            error: `${subtype} is not supported in this context (callback not registered)`,
          },
        };
        break;
      }
      getRiskColor(e, q, sessionId, h(serverName));
      return;
    }
    case "interrupt":
      (onInterrupt?.(),
        (S = { type: "control_response", response: { subtype: "success", request_id: e.request_id } }));
      break;
    case "apply_flag_settings": {
      let l = applyBridgeFlagSettings(e.request.settings),
        c;
      if (!l.ok) c = l;
      else if (!onApplyFlagSettings)
        (logFeatureBad("bridge_flag_settings", "not_registered"),
          (c = {
            ok: !1,
            error:
              "apply_flag_settings is not supported in this context (onApplyFlagSettings callback not registered)",
          }));
      else c = onApplyFlagSettings(l.settings, e.request_id);
      if (c.ok)
        (logFeatureOk("bridge_flag_settings"),
          (S = { type: "control_response", response: { subtype: "success", request_id: e.request_id } }));
      else
        S = {
          type: "control_response",
          response: { subtype: "error", request_id: e.request_id, error: c.error },
        };
      break;
    }
    case "mcp_set_servers": {
      let servers = e.request.servers,
        c = "hint" in e.request ? e.request.hint : void 0,
        k;
      if (servers === void 0 && typeof c === "string")
        (logForDebugging(
          "[bridge:repl] mcp_set_servers carried an advisory hint and no servers; acknowledged, nothing to apply",
        ),
          (k = { ok: !0, added: [], removed: [], errors: {}, unknownServerCount: 0 }));
      else if (!be(servers)) k = { ok: !1, error: "mcp_set_servers: servers must be an object" };
      else if (!onMcpSetServers)
        k = {
          ok: !1,
          error: "mcp_set_servers is not supported in this context (onMcpSetServers callback not registered)",
        };
      else
        try {
          k = onMcpSetServers(servers);
        } catch (error) {
          (logForDebugging(`[bridge:repl] mcp_set_servers handler threw: ${errorMessage(error)}`, {
            level: "error",
          }),
            (k = { ok: !1, error: "mcp_set_servers failed to apply" }));
        }
      S = k.ok
        ? {
            type: "control_response",
            response: {
              subtype: "success",
              request_id: e.request_id,
              response: {
                added: k.added,
                removed: k.removed,
                errors: annotateUnadoptedMcpServers(k.errors, k.unknownServerCount),
              },
            },
          }
        : {
            type: "control_response",
            response: { subtype: "error", request_id: e.request_id, error: sanitizeTelemetryString(k.error) },
          };
      break;
    }
    case "stop_task": {
      let task_id = e.request.task_id;
      if (typeof task_id !== "string") {
        (logFeatureBad("task_stop_user", "invalid_task_id"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: "stop_task: task_id must be a string",
            },
          }));
        break;
      }
      let c = task_id;
      if (!onStopTask) {
        (logFeatureBad("task_stop_user", "not_supported"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: "stop_task is not supported in this context (callback not registered)",
            },
          }));
        break;
      }
      getRiskColor(e, q, sessionId, onStopTask(c));
      return;
    }
    case "background_tasks": {
      let l = parseOptionalToolUseId(e.request.tool_use_id);
      if (!l.valid) {
        (logFeatureBad("task_local_shell_background_all", "invalid_tool_use_id"),
          (S = {
            type: "control_response",
            response: { subtype: "error", request_id: e.request_id, error: a7r },
          }));
        break;
      }
      let { toolUseId: toolUseId } = l;
      if (!onBackgroundTasks) {
        (logFeatureBad("task_local_shell_background_all", "not_supported"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: "background_tasks is not supported in this context (callback not registered)",
            },
          }));
        break;
      }
      if (uf()) {
        (logFeatureBad("task_local_shell_background_all", "disabled"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: BACKGROUND_TASKS_DISABLED_MESSAGE,
            },
          }));
        break;
      }
      getRiskColor(
        e,
        q,
        sessionId,
        Promise.resolve()
          .then(() => onBackgroundTasks(toolUseId))
          .then((k) => (toolUseId === void 0 ? {} : { backgrounded: k })),
      );
      return;
    }
    case "cancel_async_message": {
      let message_uuid = e.request.message_uuid;
      if (typeof message_uuid !== "string") {
        (logFeatureBad("bridge_cancel_queued_message", "invalid_message_uuid"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: "cancel_async_message: message_uuid must be a string",
            },
          }));
        break;
      }
      if (!onCancelAsyncMessage) {
        (logFeatureBad("bridge_cancel_queued_message", "not_supported"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error: "cancel_async_message is not supported in this context (callback not registered)",
            },
          }));
        break;
      }
      getRiskColor(
        e,
        q,
        sessionId,
        Promise.resolve()
          .then(() => onCancelAsyncMessage(message_uuid))
          .then(
            (c) => {
              if (c) logFeatureOk("bridge_cancel_queued_message");
              else logFeatureSad("bridge_cancel_queued_message", "not_queued");
              return { cancelled: c };
            },
            (c) => {
              throw (logFeatureBad("bridge_cancel_queued_message", "failed"), c);
            },
          ),
      );
      return;
    }
    case "side_question": {
      let safeParse = SIDE_QUESTION_REQUEST_SCHEMA().safeParse(e.request);
      if (!safeParse.success) {
        (logFeatureBad("bridge_side_question", "invalid_request"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error:
                "side_question: question must be a string and history an array of {question, response} strings",
            },
          }));
        break;
      }
      if (!onSideQuestion) {
        (logFeatureBad("bridge_side_question", "not_registered"),
          (S = {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: e.request_id,
              error:
                "side_question is not supported in this context (onSideQuestion callback not registered)",
            },
          }));
        break;
      }
      if (cancellableRequests?.has(e.request_id)) {
        logForDebugging(
          `[bridge:repl] side_question request_id=${e.request_id} already in flight \u2014 ignoring duplicate delivery`,
        );
        return;
      }
      let abortController = new AbortController();
      cancellableRequests?.set(e.request_id, abortController);
      let k = Promise.resolve().then(() =>
        onSideQuestion(safeParse.data, {
          signal: abortController.signal,
          onProgress: (h) => {
            q({
              type: "system",
              subtype: "control_request_progress",
              request_id: e.request_id,
              ...h,
              uuid: randomUUID(),
              session_id: sessionId,
            });
          },
        }),
      );
      getRiskColor(
        e,
        q,
        sessionId,
        withTimeout(k, r.sideQuestionDeadlineMs ?? SIDE_QUESTION_TIMEOUT_MS, SIDE_QUESTION_TIMEOUT_MESSAGE)
          .then(
            (h) => {
              if (h.response === null) logFeatureSad("bridge_side_question", "no_response");
              else if (h.synthetic !== !1) logFeatureSad("bridge_side_question", "synthetic");
              else logFeatureOk("bridge_side_question");
              return markSyntheticControlResponse(h);
            },
            (h) => {
              if (errorMessage(h) === SIDE_QUESTION_TIMEOUT_MESSAGE)
                throw (
                  abortController.abort(),
                  logFeatureBad("bridge_side_question", "deadline"),
                  new WireSafeControlError(SIDE_QUESTION_TIMEOUT_MESSAGE)
                );
              if (isAbortError(h)) logFeatureSad("bridge_side_question", "cancelled");
              else logFeatureBad("bridge_side_question", "failed");
              throw h;
            },
          )
          .finally(() => {
            if (cancellableRequests?.get(e.request_id) === abortController)
              cancellableRequests.delete(e.request_id);
          }),
      );
      return;
    }
    case "fork_conversation": {
      if (onForkConversation) {
        getRiskColor(
          e,
          q,
          sessionId,
          onForkConversation(e.request, {
            promptPending: hasPendingPrompts?.() ?? !1,
            requestId: e.request_id,
          }),
        );
        return;
      }
      let l = { forked: !1, error: "unsupported", reason: "requires_remote_control_server" };
      S = {
        type: "control_response",
        response: { subtype: "success", request_id: e.request_id, response: l },
      };
      break;
    }
    default:
      S = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: e.request_id,
          error: `REPL bridge does not handle control_request subtype: ${sanitizeTelemetryString(String(e.request.subtype))}`,
        },
      };
  }
  let we = { ...S, session_id: sessionId };
  (transport.write(we),
    logForDebugging(
      `[bridge:repl] Sent control_response for ${e.request.subtype} request_id=${e.request_id} result=${S.response.subtype}`,
    ));
}
//@ chunk-1qpz7qcd.js:22053-22124 placement
function be(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-1qpz7qcd.js:22124-22155 placement
var Ye = "(servers not adopted)";
/**
 * 有未接管的 MCP 服务器时在结果里附加说明（Remote Control 桥只认注入的 Project 服务器）。
 */
//@ chunk-1qpz7qcd.js:22155-22302 placement
function annotateUnadoptedMcpServers(e, r) {
  if (r <= 0) return e;
  return {
    ...e,
    [Ye]: `${r} server(s) not adopted: a Remote Control bridge only honors the injected Project servers`,
  };
}
/**
 * 校验并应用远端 apply_flag_settings 的设置对象（只允许白名单键），记录遥测。
 */
//@ chunk-1qpz7qcd.js:22302-23435 placement
function applyBridgeFlagSettings(e) {
  if (!be(e))
    return (
      logFeatureBad("bridge_flag_settings", "invalid_shape"),
      { ok: !1, error: "apply_flag_settings: settings must be an object" }
    );
  let filtered = Object.keys(e).filter((s) => !ALLOWED_FLAG_SETTING_KEYS.has(s));
  if (filtered.length > 0) {
    logFeatureBad("bridge_flag_settings", "unsupported_key");
    let mapped = filtered.slice(0, Ue).map((b) => printableName(b, Fe)),
      i = filtered.length > mapped.length ? ` (+${filtered.length - mapped.length} more)` : "";
    return {
      ok: !1,
      error: `apply_flag_settings: ${mapped.join(", ")}${i} cannot be changed over Remote Control (only effortLevel and ultracode can)`,
    };
  }
  let n = {};
  if ("effortLevel" in e) {
    let effortLevel = e.effortLevel;
    if (effortLevel !== null && typeof effortLevel !== "string")
      return (
        logFeatureBad("bridge_flag_settings", "invalid_type"),
        { ok: !1, error: "apply_flag_settings: effortLevel must be a string or null" }
      );
    n.effortLevel = effortLevel;
  }
  if ("ultracode" in e) {
    let ultracode = e.ultracode;
    if (typeof ultracode !== "boolean")
      return (
        logFeatureBad("bridge_flag_settings", "invalid_type"),
        { ok: !1, error: "apply_flag_settings: ultracode must be a boolean" }
      );
    n.ultracode = ultracode;
  }
  if (!("effortLevel" in n) && !("ultracode" in n))
    return (
      logFeatureBad("bridge_flag_settings", "nothing_to_apply"),
      {
        ok: !1,
        error:
          "apply_flag_settings: nothing to apply \u2014 only effortLevel and ultracode can be changed over Remote Control",
      }
    );
  return { ok: !0, settings: n };
}
//@ chunk-1qpz7qcd.js:23435-23479 placement
function Qe(e) {
  return !isAbortedTerminalReason(e.terminal_reason);
}
//@ chunk-1qpz7qcd.js:23479-23839 placement
function resolveTurnTerminalReason({ userMessageUuid: userMessageUuid, outcome: outcome, aborted: aborted }) {
  let s = outcome?.terminal_reason,
    i = isAbortedTerminalReason(s) ? s : aborted?.guess,
    b = i === void 0 ? void 0 : { userMessageUuid: userMessageUuid, terminalReason: i };
  if (aborted === void 0)
    return outcome === void 0 || Qe(outcome) ? { userMessageUuid: userMessageUuid, outcome: outcome } : b;
  if (aborted.sendRunsAgain) return;
  switch (aborted.by) {
    case "stop":
      return b;
    case "send-now":
      return { userMessageUuid: userMessageUuid, sendNowCut: !0 };
    case "other":
      return;
  }
}
/**
 * 为桥会话合成一条 type=result 的结束消息（用量为空，带 terminal_reason）。
 */
//@ chunk-1qpz7qcd.js:23839-24800 placement
function buildBridgeResultMessage(e, r) {
  let n = r?.outcome,
    s = {
      type: "result",
      ...(r?.userMessageUuid && { user_message_uuid: r.userMessageUuid }),
      duration_ms: 0,
      duration_api_ms: 0,
      total_cost_usd: 0,
      usage: { ...EMPTY_USAGE },
      modelUsage: {},
      permission_denials: [],
      session_id: e,
      uuid: randomUUID(),
    };
  if (n === void 0)
    return {
      ...s,
      subtype: "success",
      is_error: !1,
      num_turns: 0,
      result: "",
      stop_reason: null,
      ...(r?.terminalReason !== void 0 && { terminal_reason: r.terminalReason }),
    };
  let i = {
    is_error: n.is_error,
    num_turns: n.num_turns,
    stop_reason: n.stop_reason,
    ...(n.terminal_reason !== void 0 && { terminal_reason: n.terminal_reason }),
  };
  if (n.subtype === "success")
    return {
      ...s,
      ...i,
      subtype: "success",
      result: n.is_error && n.structured_output === void 0 ? (n.result ?? "") : "",
      ...(n.api_error_status != null && { api_error_status: n.api_error_status }),
      ...(n.api_error_code !== void 0 && { api_error_code: n.api_error_code }),
      ...(n.api_error_origin !== void 0 && { api_error_origin: n.api_error_origin }),
      ...(n.api_error !== void 0 && { api_error: n.api_error }),
    };
  return { ...s, ...i, subtype: n.subtype, errors: [] };
}
//@ chunk-1qpz7qcd.js:24800-24902 placement
function buildWorkerShuttingDownMessage(e, r) {
  return { type: "system", subtype: "worker_shutting_down", reason: r, session_id: e, uuid: randomUUID() };
}
//@ chunk-1qpz7qcd.js:24902-24928 placement
var PUSHNOTIFICATION = "PushNotification";
//@ chunk-1qpz7qcd.js:24928-25296 placement
function buildSyntheticPushNotificationToolUse(e, r) {
  return {
    type: "assistant",
    message: {
      diagnostics: null,
      id: randomUUID(),
      container: null,
      model: SYNTHETIC_MODEL,
      role: "assistant",
      stop_details: null,
      stop_reason: "tool_use",
      stop_sequence: null,
      type: "message",
      usage: { ...EMPTY_USAGE },
      content: [
        {
          type: "tool_use",
          id: randomUUID(),
          name: PUSHNOTIFICATION,
          input: { message: e, status: "proactive" },
        },
      ],
      context_management: null,
    },
    parent_tool_use_id: null,
    is_meta: !0,
    session_id: r,
    uuid: randomUUID(),
  };
}

export {
  resolveTurnTerminalReason,
  buildSyntheticPushNotificationToolUse,
  assertMcpReconnected,
  wantsLiveReply,
  buildWorkerShuttingDownMessage,
  handleReplBridgeControlRequest,
  buildBridgeResultMessage,
};
