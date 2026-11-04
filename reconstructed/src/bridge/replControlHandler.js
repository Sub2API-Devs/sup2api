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
  MAX_FLAG_SETTING_CHANGE_KEYS,
  MAX_FLAG_SETTING_VALUE_CHARS,
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
  THINKING_SETTINGS_INVALID_MESSAGE,
  stripInitializeAgentPaths,
  parseOptionalToolUseId,
  BACKGROUND_TASKS_TOOL_USE_ID_ERROR,
  BACKGROUND_TASKS_DISABLED_MESSAGE,
  SIDE_QUESTION_REQUEST_SCHEMA,
  markSyntheticControlResponse,
} from "./controlRequests.js";
import { logFeatureBad, logFeatureOk, logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { formatOperationFailure } from "../services/plugins/pluginOperations.js";
import { parsePermissionMode, UNRECOGNIZED_PERMISSION_MODE_ERROR } from "../types/permissions.js";
import { withTimeout } from "../utils/sleep.js";
import { isBackgroundTasksOff } from "../tools/AgentTool/backgroundGates.js";
import { printableName } from "../utils/printableName.js";
import { isAbortedTerminalReason } from "../entrypoints/sdk/coreSchemas.js";
import { EMPTY_USAGE } from "../services/api/emptyUsage.js";
import { SYNTHETIC_MODEL } from "../constants/messages.js";

//@ chunk-1qpz7qcd.js:7648-7857 placement
/**
 * mcp_reconnect 结果不是 connected 时抛错
 */
function assertMcpReconnected(client) {
  if (client.type === "connected") return;
  if (client.type === "failed") {
    if (client.error)
      logForDebugging(`mcp_reconnect failed: ${client.error}`, {
        level: "error",
      });
    throw new WireSafeControlError("Connection failed");
  }
  throw new WireSafeControlError(`Server status: ${client.type}`);
}
//@ chunk-1qpz7qcd.js:7857-7936 placement = getRiskColor (0.785)
function getRiskColor(request, writeFrame, sessionId, responsePromise) {
  sendControlResponseWhenSettled(
    request,
    writeFrame,
    sessionId,
    responsePromise.then((response) => ({
      subtype: "success",
      response: response ?? {},
    })),
  );
}
//@ chunk-1qpz7qcd.js:7936-8103 placement
/**
 * 该控制请求是否要"实时回复"（mcp_status 的 liveReply，或带回调的 mcp_authenticate）。
 */
function wantsLiveReply(request, response) {
  let request_2 = request.request;
  if (request_2.subtype === "mcp_status") return request_2.liveReply === true;
  return (
    request_2.subtype === "mcp_authenticate" &&
    request_2.liveReply === true &&
    response?.callbackExpected === true
  );
}
//@ chunk-1qpz7qcd.js:8506-8703 placement
/**
 * 生成 control_response：结果 ok=false 时为 error（错误文本脱敏），否则 success。
 */
function buildControlResponse(requestId, result) {
  if (result && result.ok === false)
    return {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: requestId,
        error: sanitizeTelemetryString(result.error),
      },
    };
  return {
    type: "control_response",
    response: {
      subtype: "success",
      request_id: requestId,
    },
  };
}
//@ chunk-1qpz7qcd.js:8703-22053 placement
/**
 * REPL Remote Control 桥的 control_request 总分发器：initialize、interrupt、set_model、set_permission_mode、background_tasks、get_context_usage、read_file、rename_session 等，逐个调用回调并回 control_response。
 */
function handleReplBridgeControlRequest(request, options) {
  let {
    transport,
    sessionId,
    outboundOnly,
    getInitializeState,
    claudeCodeVersion,
    getCommands,
    reportsInboundReadReceipts,
    getPendingPrompts,
    onInterrupt,
    onStopTask,
    onBackgroundTasks,
    onCancelAsyncMessage,
    onDialogKindsDeclared,
    onClientInitialize,
    onSetModel,
    onSetMaxThinkingTokens,
    onSetPermissionMode,
    onApplyFlagSettings,
    onRenameSession,
    onSetColor,
    onFileSuggestions,
    onReadFile,
    onGetWorkspaceDiff,
    onGetContextUsage,
    onMcpAuthenticate,
    onMcpOauthCallbackUrl,
    onMcpReconnect,
    onMcpSetServers,
    onForkConversation,
    hasPendingPrompts,
    onSideQuestion,
    cancellableRequests,
  } = options;
  if (!transport) {
    logForDebugging("[bridge:repl] Cannot respond to control_request: transport not configured");
    return;
  }
  let writeFrame =
    options.writeFrame ??
    ((event) => {
      transport.write(event);
    });
  let response;
  if (isTerminalShutdown() && !READ_ONLY_CONTROL_SUBTYPES.has(request.request.subtype)) {
    logForDebugging(`[bridge] refusing ${request.request.subtype}: this process is exiting`);
    response = {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: request.request_id,
        error: SESSION_SHUTTING_DOWN_MESSAGE,
      },
    };
    let frame = {
      ...response,
      session_id: sessionId,
    };
    transport.write(frame);
    return;
  }
  if (outboundOnly && request.request.subtype !== "initialize") {
    response = {
      type: "control_response",
      response: {
        subtype: "error",
        request_id: request.request_id,
        error: OUTBOUND_ONLY_ERROR,
      },
    };
    let frame = {
      ...response,
      session_id: sessionId,
    };
    transport.write(frame);
    logForDebugging(
      `[bridge:repl] Rejected ${request.request.subtype} (outbound-only) request_id=${request.request_id}`,
    );
    return;
  }
  let responsePromise = options.answerSharedControlRequest?.(request.request);
  if (responsePromise instanceof Promise) {
    sendControlResponseWhenSettled(request, writeFrame, sessionId, responsePromise);
    return;
  }
  if (responsePromise !== undefined) {
    let frame = {
      ...(responsePromise.subtype === "error"
        ? {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: request.request_id,
              error: responsePromise.error,
            },
          }
        : wantsLiveReply(request, responsePromise.response)
          ? markLiveOnlyResponse(request.request_id, responsePromise.response)
          : {
              type: "control_response",
              response: {
                subtype: "success",
                request_id: request.request_id,
                ...(responsePromise.response !== undefined && {
                  response: responsePromise.response,
                }),
              },
            }),
      session_id: sessionId,
    };
    transport.write(frame);
    logForDebugging(
      `[bridge:repl] Sent control_response for ${request.request.subtype} request_id=${request.request_id} result=${responsePromise.subtype}`,
    );
    return;
  }
  switch (request.request.subtype) {
    case "initialize": {
      try {
        let dialogKinds = sanitizeStringList(request.request.supportedDialogKinds);
        if (dialogKinds.length > 0) onDialogKindsDeclared?.(dialogKinds);
      } catch (error) {
        logForDebugging(
          `[bridge:repl] dialog-kind capture failed; acking initialize anyway: ${errorMessage(error)}`,
        );
      }
      let commands = [];
      if (!outboundOnly)
        try {
          commands = getCommands?.() ?? [];
        } catch (error) {
          logFeatureBad("bridge_initialize_commands", "get_commands_threw");
          logForDebugging(
            `[bridge:repl] getCommands failed; acking initialize with commands: []: ${errorMessage(error)}`,
          );
        }
      let pending = getPendingPrompts?.() ?? [];
      let pendingPermissionRequests = pending.filter((entry) => entry.request.subtype === "can_use_tool");
      let pendingUserDialogRequests = pending.filter(
        (entry) => entry.request.subtype === "request_user_dialog",
      );
      response = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: request.request_id,
          response: {
            commands,
            agents: [],
            output_style: "normal",
            available_output_styles: ["normal"],
            models: [],
            account: {},
            pid: process.pid,
            ...(claudeCodeVersion !== undefined && {
              claude_code_version: claudeCodeVersion,
            }),
            ...(!outboundOnly &&
              reportsInboundReadReceipts?.() === true && {
                inbound_read_receipts: true,
              }),
            ...getInitializeState?.(),
          },
          pending_permission_requests: pendingPermissionRequests,
          pending_user_dialog_requests: pendingUserDialogRequests,
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
      let model = request.request.model;
      if (model != null && typeof model !== "string") {
        logFeatureBad("model_switch", "invalid_model_type");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "set_model: model must be a string",
          },
        };
        break;
      }
      let onlyIfModelIsCurrent = request.request.only_if_model_is_current;
      if (onlyIfModelIsCurrent !== undefined && onlyIfModelIsCurrent !== false) {
        logFeatureBad("model_switch", "only_if_model_is_current_unserved");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error:
              "set_model: Remote Control does not implement only_if_model_is_current. The request changed nothing.",
          },
        };
        break;
      }
      let result = onSetModel?.(request.request.model ?? undefined);
      if (result && "then" in result) {
        respondToSetModelVerdict({
          verdict: result,
          respond: (response) => {
            let frame = {
              ...{
                type: "control_response",
                response: {
                  ...response,
                  request_id: request.request_id,
                },
              },
              session_id: sessionId,
            };
            writeFrame(frame);
            logForDebugging(
              `[bridge:repl] Sent control_response for set_model request_id=${request.request_id} result=${response.subtype}`,
            );
          },
          inform: (notices) => {
            for (let content of notices)
              writeFrame({
                type: "system",
                subtype: "informational",
                content,
                level: "notice",
                uuid: randomUUID(),
                session_id: sessionId,
              });
          },
        });
        return;
      }
      if (result && !result.ok)
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: sanitizeTelemetryString(result.error),
          },
        };
      else
        response = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: request.request_id,
          },
        };
      break;
    }
    case "set_max_thinking_tokens": {
      if (!isValidThinkingSettingsRequest(request.request)) {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: THINKING_SETTINGS_INVALID_MESSAGE,
          },
        };
        break;
      }
      let result = onSetMaxThinkingTokens?.(
        request.request.max_thinking_tokens,
        request.request.thinking_display,
      );
      if (result && "then" in result) {
        let requestId = request.request_id;
        let subtype = request.request.subtype;
        result
          .then(
            (result) => buildControlResponse(requestId, result),
            (error) => ({
              type: "control_response",
              response: {
                subtype: "error",
                request_id: requestId,
                error: formatOperationFailure(subtype, error),
              },
            }),
          )
          .then((response) => {
            let frame = {
              ...response,
              session_id: sessionId,
            };
            writeFrame(frame);
            logForDebugging(
              `[bridge:repl] Sent control_response for set_max_thinking_tokens request_id=${requestId} result=${response.response.subtype}`,
            );
          });
        return;
      }
      response = buildControlResponse(request.request_id, result);
      break;
    }
    case "set_permission_mode": {
      let permissionMode = parsePermissionMode(request.request.mode);
      let outcome =
        permissionMode === undefined
          ? {
              ok: false,
              error: UNRECOGNIZED_PERMISSION_MODE_ERROR,
            }
          : (onSetPermissionMode?.(permissionMode) ?? {
              ok: false,
              error:
                "set_permission_mode is not supported in this context (onSetPermissionMode callback not registered)",
            });
      if (outcome.ok)
        response = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: request.request_id,
          },
        };
      else
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: sanitizeTelemetryString(outcome.error),
          },
        };
      break;
    }
    case "rename_session": {
      if (typeof request.request.title !== "string") {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "rename_session: title must be a string",
          },
        };
        break;
      }
      let outcome = onRenameSession?.(request.request.title) ?? {
        ok: false,
        error: "rename_session is not supported in this context (onRenameSession callback not registered)",
      };
      if (outcome.ok)
        response = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: request.request_id,
          },
        };
      else
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: sanitizeTelemetryString(outcome.error),
          },
        };
      break;
    }
    case "set_color": {
      let outcome = onSetColor?.(request.request.color) ?? {
        ok: false,
        error: "set_color is not supported in this context (onSetColor callback not registered)",
      };
      if (outcome.ok)
        response = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: request.request_id,
          },
        };
      else
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: sanitizeTelemetryString(outcome.error),
          },
        };
      break;
    }
    case "file_suggestions": {
      if (!onFileSuggestions) {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error:
              "file_suggestions is not supported in this context (onFileSuggestions callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        request,
        writeFrame,
        sessionId,
        onFileSuggestions(request.request.query).then((suggestions) => ({
          suggestions,
        })),
      );
      return;
    }
    case "read_file": {
      if (!onReadFile) {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "read_file is not supported in this context (onReadFile callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        request,
        writeFrame,
        sessionId,
        onReadFile(
          request.request.path,
          request.request.max_bytes,
          request.request.encoding,
          request.request.anchor,
        ).then(
          ((absPath) => (suggestions) => ({
            ...suggestions,
            absPath,
          }))(request.request.path),
        ),
      );
      return;
    }
    case "get_workspace_diff": {
      if (!onGetWorkspaceDiff) {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error:
              "get_workspace_diff is not supported in this context (onGetWorkspaceDiff callback not registered)",
          },
        };
        break;
      }
      let abortController = new AbortController();
      sendControlResponseWhenSettled(
        request,
        writeFrame,
        sessionId,
        withTimeout(
          onGetWorkspaceDiff(abortController.signal),
          WORKSPACE_DIFF_TIMEOUT_MS,
          WORKSPACE_DIFF_TIMEOUT_MESSAGE,
        ).then(
          (response) => ({
            subtype: "success",
            response,
          }),
          (error) => {
            abortController.abort();
            if (errorMessage(error) === WORKSPACE_DIFF_TIMEOUT_MESSAGE)
              return {
                subtype: "error",
                error: WORKSPACE_DIFF_TIMEOUT_MESSAGE,
                error_code: "workspace_diff_pending",
              };
            throw error;
          },
        ),
      );
      return;
    }
    case "get_context_usage": {
      if (!onGetContextUsage) {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error:
              "get_context_usage is not supported in this context (onGetContextUsage callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        request,
        writeFrame,
        sessionId,
        onGetContextUsage({
          detail: request.request.detail,
        }).then((usage) => ({
          ...usage,
          memoryFiles: [],
          ...stripInitializeAgentPaths(usage),
        })),
      );
      return;
    }
    case "get_usage":
      response = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: request.request_id,
          error: "get_usage is not supported in this context",
        },
      };
      break;
    case "mcp_status":
      response = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: request.request_id,
          response: {
            mcpServers: [],
          },
        },
      };
      break;
    case "mcp_authenticate":
    case "mcp_oauth_callback_url":
    case "mcp_reconnect": {
      let request_2 = request.request;
      let { subtype, serverName } = request_2;
      let handler =
        request_2.subtype === "mcp_authenticate"
          ? onMcpAuthenticate && ((serverName) => onMcpAuthenticate(serverName, request_2.redirectUri))
          : request_2.subtype === "mcp_oauth_callback_url"
            ? onMcpOauthCallbackUrl &&
              ((serverName) => onMcpOauthCallbackUrl(serverName, request_2.callbackUrl))
            : onMcpReconnect;
      if (!handler) {
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: `${subtype} is not supported in this context (callback not registered)`,
          },
        };
        break;
      }
      getRiskColor(request, writeFrame, sessionId, handler(serverName));
      return;
    }
    case "interrupt":
      onInterrupt?.();
      response = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: request.request_id,
        },
      };
      break;
    case "apply_flag_settings": {
      let validation = applyBridgeFlagSettings(request.request.settings);
      let outcome;
      if (!validation.ok) outcome = validation;
      else if (!onApplyFlagSettings) {
        logFeatureBad("bridge_flag_settings", "not_registered");
        outcome = {
          ok: false,
          error:
            "apply_flag_settings is not supported in this context (onApplyFlagSettings callback not registered)",
        };
      } else outcome = onApplyFlagSettings(validation.settings, request.request_id);
      if (outcome.ok) {
        logFeatureOk("bridge_flag_settings");
        response = {
          type: "control_response",
          response: {
            subtype: "success",
            request_id: request.request_id,
          },
        };
      } else
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: outcome.error,
          },
        };
      break;
    }
    case "mcp_set_servers": {
      let servers = request.request.servers;
      let hint = "hint" in request.request ? request.request.hint : undefined;
      let outcome;
      if (servers === undefined && typeof hint === "string") {
        logForDebugging(
          "[bridge:repl] mcp_set_servers carried an advisory hint and no servers; acknowledged, nothing to apply",
        );
        outcome = {
          ok: true,
          added: [],
          removed: [],
          errors: {},
          unknownServerCount: 0,
        };
      } else if (!isPlainObject(servers))
        outcome = {
          ok: false,
          error: "mcp_set_servers: servers must be an object",
        };
      else if (!onMcpSetServers)
        outcome = {
          ok: false,
          error: "mcp_set_servers is not supported in this context (onMcpSetServers callback not registered)",
        };
      else
        try {
          outcome = onMcpSetServers(servers);
        } catch (error) {
          logForDebugging(`[bridge:repl] mcp_set_servers handler threw: ${errorMessage(error)}`, {
            level: "error",
          });
          outcome = {
            ok: false,
            error: "mcp_set_servers failed to apply",
          };
        }
      response = outcome.ok
        ? {
            type: "control_response",
            response: {
              subtype: "success",
              request_id: request.request_id,
              response: {
                added: outcome.added,
                removed: outcome.removed,
                errors: annotateUnadoptedMcpServers(outcome.errors, outcome.unknownServerCount),
              },
            },
          }
        : {
            type: "control_response",
            response: {
              subtype: "error",
              request_id: request.request_id,
              error: sanitizeTelemetryString(outcome.error),
            },
          };
      break;
    }
    case "stop_task": {
      let taskId = request.request.task_id;
      if (typeof taskId !== "string") {
        logFeatureBad("task_stop_user", "invalid_task_id");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "stop_task: task_id must be a string",
          },
        };
        break;
      }
      let taskIdValue = taskId;
      if (!onStopTask) {
        logFeatureBad("task_stop_user", "not_supported");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "stop_task is not supported in this context (callback not registered)",
          },
        };
        break;
      }
      getRiskColor(request, writeFrame, sessionId, onStopTask(taskIdValue));
      return;
    }
    case "background_tasks": {
      let optionalToolUseId = parseOptionalToolUseId(request.request.tool_use_id);
      if (!optionalToolUseId.valid) {
        logFeatureBad("task_local_shell_background_all", "invalid_tool_use_id");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: BACKGROUND_TASKS_TOOL_USE_ID_ERROR,
          },
        };
        break;
      }
      let { toolUseId } = optionalToolUseId;
      if (!onBackgroundTasks) {
        logFeatureBad("task_local_shell_background_all", "not_supported");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "background_tasks is not supported in this context (callback not registered)",
          },
        };
        break;
      }
      if (isBackgroundTasksOff()) {
        logFeatureBad("task_local_shell_background_all", "disabled");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: BACKGROUND_TASKS_DISABLED_MESSAGE,
          },
        };
        break;
      }
      getRiskColor(
        request,
        writeFrame,
        sessionId,
        Promise.resolve()
          .then(() => onBackgroundTasks(toolUseId))
          .then((backgrounded) =>
            toolUseId === undefined
              ? {}
              : {
                  backgrounded,
                },
          ),
      );
      return;
    }
    case "cancel_async_message": {
      let messageUuid = request.request.message_uuid;
      if (typeof messageUuid !== "string") {
        logFeatureBad("bridge_cancel_queued_message", "invalid_message_uuid");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "cancel_async_message: message_uuid must be a string",
          },
        };
        break;
      }
      if (!onCancelAsyncMessage) {
        logFeatureBad("bridge_cancel_queued_message", "not_supported");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "cancel_async_message is not supported in this context (callback not registered)",
          },
        };
        break;
      }
      getRiskColor(
        request,
        writeFrame,
        sessionId,
        Promise.resolve()
          .then(() => onCancelAsyncMessage(messageUuid))
          .then(
            (backgrounded) => {
              if (backgrounded) logFeatureOk("bridge_cancel_queued_message");
              else logFeatureSad("bridge_cancel_queued_message", "not_queued");
              return {
                cancelled: backgrounded,
              };
            },
            (error) => {
              logFeatureBad("bridge_cancel_queued_message", "failed");
              throw error;
            },
          ),
      );
      return;
    }
    case "side_question": {
      let parsed = SIDE_QUESTION_REQUEST_SCHEMA().safeParse(request.request);
      if (!parsed.success) {
        logFeatureBad("bridge_side_question", "invalid_request");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error:
              "side_question: question must be a string and history an array of {question, response} strings",
          },
        };
        break;
      }
      if (!onSideQuestion) {
        logFeatureBad("bridge_side_question", "not_registered");
        response = {
          type: "control_response",
          response: {
            subtype: "error",
            request_id: request.request_id,
            error: "side_question is not supported in this context (onSideQuestion callback not registered)",
          },
        };
        break;
      }
      if (cancellableRequests?.has(request.request_id)) {
        logForDebugging(
          `[bridge:repl] side_question request_id=${request.request_id} already in flight \u2014 ignoring duplicate delivery`,
        );
        return;
      }
      let abortController = new AbortController();
      cancellableRequests?.set(request.request_id, abortController);
      let answer = Promise.resolve().then(() =>
        onSideQuestion(parsed.data, {
          signal: abortController.signal,
          onProgress: (progress) => {
            writeFrame({
              type: "system",
              subtype: "control_request_progress",
              request_id: request.request_id,
              ...progress,
              uuid: randomUUID(),
              session_id: sessionId,
            });
          },
        }),
      );
      getRiskColor(
        request,
        writeFrame,
        sessionId,
        withTimeout(
          answer,
          options.sideQuestionDeadlineMs ?? SIDE_QUESTION_TIMEOUT_MS,
          SIDE_QUESTION_TIMEOUT_MESSAGE,
        )
          .then(
            (response) => {
              if (response.response === null) logFeatureSad("bridge_side_question", "no_response");
              else if (response.synthetic !== false) logFeatureSad("bridge_side_question", "synthetic");
              else logFeatureOk("bridge_side_question");
              return markSyntheticControlResponse(response);
            },
            (error) => {
              if (errorMessage(error) === SIDE_QUESTION_TIMEOUT_MESSAGE) {
                abortController.abort();
                logFeatureBad("bridge_side_question", "deadline");
                throw new WireSafeControlError(SIDE_QUESTION_TIMEOUT_MESSAGE);
              }
              if (isAbortError(error)) logFeatureSad("bridge_side_question", "cancelled");
              else logFeatureBad("bridge_side_question", "failed");
              throw error;
            },
          )
          .finally(() => {
            if (cancellableRequests?.get(request.request_id) === abortController)
              cancellableRequests.delete(request.request_id);
          }),
      );
      return;
    }
    case "fork_conversation": {
      if (onForkConversation) {
        getRiskColor(
          request,
          writeFrame,
          sessionId,
          onForkConversation(request.request, {
            promptPending: hasPendingPrompts?.() ?? false,
            requestId: request.request_id,
          }),
        );
        return;
      }
      let response_2 = {
        forked: false,
        error: "unsupported",
        reason: "requires_remote_control_server",
      };
      response = {
        type: "control_response",
        response: {
          subtype: "success",
          request_id: request.request_id,
          response: response_2,
        },
      };
      break;
    }
    default:
      response = {
        type: "control_response",
        response: {
          subtype: "error",
          request_id: request.request_id,
          error: `REPL bridge does not handle control_request subtype: ${sanitizeTelemetryString(String(request.request.subtype))}`,
        },
      };
  }
  let frame = {
    ...response,
    session_id: sessionId,
  };
  transport.write(frame);
  logForDebugging(
    `[bridge:repl] Sent control_response for ${request.request.subtype} request_id=${request.request_id} result=${response.response.subtype}`,
  );
}
//@ chunk-1qpz7qcd.js:22053-22124 placement
function isPlainObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-1qpz7qcd.js:22124-22155 placement
var SERVERS_NOT_ADOPTED_KEY = "(servers not adopted)";
//@ chunk-1qpz7qcd.js:22155-22302 placement
/**
 * 有未接管的 MCP 服务器时在结果里附加说明（Remote Control 桥只认注入的 Project 服务器）。
 */
function annotateUnadoptedMcpServers(errors, unknownServerCount) {
  if (unknownServerCount <= 0) return errors;
  return {
    ...errors,
    [SERVERS_NOT_ADOPTED_KEY]: `${unknownServerCount} server(s) not adopted: a Remote Control bridge only honors the injected Project servers`,
  };
}
//@ chunk-1qpz7qcd.js:22302-23435 placement
/**
 * 校验并应用远端 apply_flag_settings 的设置对象（只允许白名单键），记录遥测。
 */
function applyBridgeFlagSettings(settings) {
  if (!isPlainObject(settings)) {
    logFeatureBad("bridge_flag_settings", "invalid_shape");
    return {
      ok: false,
      error: "apply_flag_settings: settings must be an object",
    };
  }
  let filtered = Object.keys(settings).filter((key) => !ALLOWED_FLAG_SETTING_KEYS.has(key));
  if (filtered.length > 0) {
    logFeatureBad("bridge_flag_settings", "unsupported_key");
    let mapped = filtered
      .slice(0, MAX_FLAG_SETTING_CHANGE_KEYS)
      .map((key) => printableName(key, MAX_FLAG_SETTING_VALUE_CHARS));
    let moreNote = filtered.length > mapped.length ? ` (+${filtered.length - mapped.length} more)` : "";
    return {
      ok: false,
      error: `apply_flag_settings: ${mapped.join(", ")}${moreNote} cannot be changed over Remote Control (only effortLevel and ultracode can)`,
    };
  }
  let acceptedSettings = {};
  if ("effortLevel" in settings) {
    let effortLevel = settings.effortLevel;
    if (effortLevel !== null && typeof effortLevel !== "string") {
      logFeatureBad("bridge_flag_settings", "invalid_type");
      return {
        ok: false,
        error: "apply_flag_settings: effortLevel must be a string or null",
      };
    }
    acceptedSettings.effortLevel = effortLevel;
  }
  if ("ultracode" in settings) {
    let ultracode = settings.ultracode;
    if (typeof ultracode !== "boolean") {
      logFeatureBad("bridge_flag_settings", "invalid_type");
      return {
        ok: false,
        error: "apply_flag_settings: ultracode must be a boolean",
      };
    }
    acceptedSettings.ultracode = ultracode;
  }
  if (!("effortLevel" in acceptedSettings) && !("ultracode" in acceptedSettings)) {
    logFeatureBad("bridge_flag_settings", "nothing_to_apply");
    return {
      ok: false,
      error:
        "apply_flag_settings: nothing to apply \u2014 only effortLevel and ultracode can be changed over Remote Control",
    };
  }
  return {
    ok: true,
    settings: acceptedSettings,
  };
}
//@ chunk-1qpz7qcd.js:23435-23479 placement
function isNotAbortedTerminalReason(outcome) {
  return !isAbortedTerminalReason(outcome.terminal_reason);
}
//@ chunk-1qpz7qcd.js:23479-23839 placement
function resolveTurnTerminalReason({ userMessageUuid, outcome, aborted }) {
  let terminalReason = outcome?.terminal_reason;
  let guessedReason = isAbortedTerminalReason(terminalReason) ? terminalReason : aborted?.guess;
  let abortedResult =
    guessedReason === undefined
      ? undefined
      : {
          userMessageUuid,
          terminalReason: guessedReason,
        };
  if (aborted === undefined)
    return outcome === undefined || isNotAbortedTerminalReason(outcome)
      ? {
          userMessageUuid,
          outcome,
        }
      : abortedResult;
  if (aborted.sendRunsAgain) return;
  switch (aborted.by) {
    case "stop":
      return abortedResult;
    case "send-now":
      return {
        userMessageUuid,
        sendNowCut: true,
      };
    case "other":
      return;
  }
}
//@ chunk-1qpz7qcd.js:23839-24800 placement
/**
 * 为桥会话合成一条 type=result 的结束消息（用量为空，带 terminal_reason）。
 */
function buildBridgeResultMessage(sessionId, turn) {
  let outcome = turn?.outcome;
  let result = {
    type: "result",
    ...(turn?.userMessageUuid && {
      user_message_uuid: turn.userMessageUuid,
    }),
    duration_ms: 0,
    duration_api_ms: 0,
    total_cost_usd: 0,
    usage: {
      ...EMPTY_USAGE,
    },
    modelUsage: {},
    permission_denials: [],
    session_id: sessionId,
    uuid: randomUUID(),
  };
  if (outcome === undefined)
    return {
      ...result,
      subtype: "success",
      is_error: false,
      num_turns: 0,
      result: "",
      stop_reason: null,
      ...(turn?.terminalReason !== undefined && {
        terminal_reason: turn.terminalReason,
      }),
    };
  let outcomeFields = {
    is_error: outcome.is_error,
    num_turns: outcome.num_turns,
    stop_reason: outcome.stop_reason,
    ...(outcome.terminal_reason !== undefined && {
      terminal_reason: outcome.terminal_reason,
    }),
  };
  if (outcome.subtype === "success")
    return {
      ...result,
      ...outcomeFields,
      subtype: "success",
      result: outcome.is_error && outcome.structured_output === undefined ? (outcome.result ?? "") : "",
      ...(outcome.api_error_status != null && {
        api_error_status: outcome.api_error_status,
      }),
      ...(outcome.api_error_code !== undefined && {
        api_error_code: outcome.api_error_code,
      }),
      ...(outcome.api_error_origin !== undefined && {
        api_error_origin: outcome.api_error_origin,
      }),
      ...(outcome.api_error !== undefined && {
        api_error: outcome.api_error,
      }),
    };
  return {
    ...result,
    ...outcomeFields,
    subtype: outcome.subtype,
    errors: [],
  };
}
//@ chunk-1qpz7qcd.js:24800-24902 placement
function buildWorkerShuttingDownMessage(sessionId, reason) {
  return {
    type: "system",
    subtype: "worker_shutting_down",
    reason,
    session_id: sessionId,
    uuid: randomUUID(),
  };
}
//@ chunk-1qpz7qcd.js:24902-24928 placement
var PUSHNOTIFICATION = "PushNotification";
//@ chunk-1qpz7qcd.js:24928-25296 placement
function buildSyntheticPushNotificationToolUse(message, sessionId) {
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
      usage: {
        ...EMPTY_USAGE,
      },
      content: [
        {
          type: "tool_use",
          id: randomUUID(),
          name: PUSHNOTIFICATION,
          input: {
            message,
            status: "proactive",
          },
        },
      ],
      context_management: null,
    },
    parent_tool_use_id: null,
    is_meta: true,
    session_id: sessionId,
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
