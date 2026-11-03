/**
 * remote/sdkMessageAdapter.ts
 *
 * 并入旧版已有路径：SDK 消息适配。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/remote/sdkMessageAdapter.ts
 * pieces: chunk-0h4e7gnq.js (12), chunk-3xdfvx0n.js (18), chunk-kj4ctmv0.js (1)
 * attribution: fingerprint 5, affinity 4, placement 9, callgraph-fingerprint 1, layout 12
 */
import { randomUUID } from "crypto";
import {
  isBareApiErrorMessage,
  sanitizeApiErrorMessage,
  sanitizeTextBlocks,
  isApiErrorMessage,
  isHttpStatus,
  sanitizedMessageText,
  fromSDKCompactMetadata,
  nonExecutionKindOf,
} from "../utils/messages/mappers.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../utils/debug.js";
import { stripAnsi } from "../utils/stripAnsi.js";
import { readWorkerEpoch, capFrameDepth } from "./wireFrameShape.js";
import {
  sanitizeDisplayText,
  MARKDOWN_BREAK_CHARS,
  MAX_MARKDOWN_SAFE_LENGTH,
  tailLines,
} from "../utils/resultError.js";
import { claimOnce } from "../services/api/verificationRequired.js";
import { logFeatureSad } from "../services/analytics/featureTelemetry.js";
import { sameAutocompactState } from "../services/compact/autoCompactStatus.js";
import { logEvent } from "../services/analytics/index.js";
import { fromEnum, lit } from "../services/analytics/safeMetadata.js";
import { En, wi } from "../../vendor/lodash-es/_inlinedHelpers.js";
import {
  getLimitsAccountEpoch,
  getLatestLimitStatus,
  extractQuotaStatusFromHeaders_2,
  getCurrentLimits,
  areLimitsObserved,
  emitLimitsStatusChange,
} from "../services/claudeAiLimits.js";
import { logError } from "../utils/log.js";
import {
  createUserMessage,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  createAssistantMessage,
} from "../utils/messages.js";
import { mapToolResultImages } from "../cli/transports/ccrMessageMapping.js";
import { isNonHumanInboundOrigin } from "../utils/backgroundSessionResume.js";
import { buildRefusalMessage } from "../services/api/safeguardMessages.js";
import { machineLabelForMessage } from "../bridge/deviceRegistration.js";
import { isProbeWrittenValue } from "../utils/model/thirdPartyModelDefaults.js";
import { normalizeAgentIdOrNull } from "../utils/agentId.js";

//@ chunk-3xdfvx0n.js:1283-1294 placement
var cloudMemoryToolUseIdsReader = null;
//@ chunk-3xdfvx0n.js:1294-1545 placement
function isControlFrame(parsed) {
  return (
    parsed.type !== "control_request" &&
    parsed.type !== "control_response" &&
    parsed.type !== "keep_alive" &&
    parsed.type !== "control_cancel_request" &&
    parsed.type !== "transcript_mirror" &&
    !(
      parsed.type === "system" &&
      (parsed.subtype === "task_summary" || parsed.subtype === "session_metadata")
    )
  );
}
//@ chunk-3xdfvx0n.js:1545-2223 callgraph-fingerprint = convertAssistantMessage (0.199)
/**
 * SDK assistant → 本地 assistant 消息（remoteSourced，带 API 错误字段、verification_required 改写、云记忆工具 ID）。
 */
function convertAssistantMessage(msg) {
  let n = isBareApiErrorMessage(msg);
  let r = cloudMemoryToolUseIdsReader?.cloudMemoryToolUseIds(msg.tool_use_meta) ?? [];
  return {
    type: "assistant",
    message:
      msg.error === "verification_required"
        ? sanitizeApiErrorMessage(msg.message)
        : n
          ? {
              ...msg.message,
              content: sanitizeTextBlocks(msg.message.content),
            }
          : msg.message,
    uuid: msg.uuid,
    requestId: undefined,
    timestamp: msg.timestamp ?? new Date().toISOString(),
    remoteSourced: true,
    error: msg.error,
    ...(isApiErrorMessage(msg) && {
      isApiErrorMessage: true,
    }),
    ...(n && {
      sessionFailureNotice: true,
    }),
    ...(isHttpStatus(msg.api_error_status) && {
      apiErrorStatus: msg.api_error_status,
    }),
    ...(msg.api_error !== undefined && {
      apiError: msg.api_error,
    }),
    ...(msg.api_error_params !== undefined && {
      apiErrorParams: msg.api_error_params,
    }),
    ...(msg.api_error_code !== undefined && {
      apiErrorCode: msg.api_error_code,
    }),
    ...false,
    ...(r.length > 0 && {
      cloudMemoryToolUseIds: r,
    }),
  };
}
//@ chunk-3xdfvx0n.js:2223-2321 layout
function convertStreamEventFrame(frame) {
  return {
    type: "stream_event",
    event: frame.event,
    ...(frame.ttft_ms !== undefined && {
      ttftMs: frame.ttft_ms,
    }),
  };
}
//@ chunk-3xdfvx0n.js:2321-2501 layout
function ensureFrameUuid(uuid) {
  let n = uuid;
  if (typeof n === "string" && n !== "" && uuid !== undefined) return uuid;
  logForDebugging("[sdkMessageAdapter] frame uuid missing or not a string \u2014 minting one", {
    level: "error",
  });
  return randomUUID();
}
//@ chunk-3xdfvx0n.js:2501-2664 layout
function hasStringContent(frame) {
  if (typeof frame.content === "string") return true;
  logForDebugging(`[sdkMessageAdapter] Dropping ${frame.subtype} frame whose content is not a string`, {
    level: "error",
  });
  return false;
}
//@ chunk-3xdfvx0n.js:2664-2821 layout
/**
 * 过滤远程错误文本：去掉 [ede_diagnostic] / [session_crash] 诊断标记行。
 */
function filterDisplayableErrors(errors) {
  if (!Array.isArray(errors)) return [];
  return errors.filter(
    (n) => typeof n === "string" && !n.startsWith("[ede_diagnostic]") && !n.startsWith("[session_crash]"),
  );
}
//@ chunk-3xdfvx0n.js:2821-3356 fingerprint = convertResultMessage (0.662)
/**
 * 非 success 的 result → warning 级 informational（errors 拼接，去掉诊断前缀）；success → "Session completed successfully"。
 */
function convertResultMessage(msg) {
  if (msg.subtype === "success")
    return {
      type: "system",
      subtype: "informational",
      content: "Session completed successfully",
      level: "info",
      uuid: ensureFrameUuid(msg.uuid),
      timestamp: new Date().toISOString(),
    };
  let errors = msg.errors;
  if (!Array.isArray(errors)) {
    logForDebugging(
      `[sdkMessageAdapter] ${msg.subtype} result without an errors[] array \u2014 nothing to show`,
    );
    return null;
  }
  let r = filterDisplayableErrors(errors);
  if (r.length === 0) return null;
  return {
    type: "system",
    subtype: "informational",
    content: sanitizedMessageText(r.join(", ")),
    level: "warning",
    fromRemoteErrorResult: true,
    uuid: ensureFrameUuid(msg.uuid),
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-3xdfvx0n.js:3356-3613 fingerprint = convertStatusMessage (1)
function convertStatusMessage(msg) {
  let status = msg.status;
  if (typeof status !== "string" || status === "") return null;
  return {
    type: "system",
    subtype: "informational",
    content: status === "compacting" ? "Compacting conversation\u2026" : `Status: ${stripAnsi(status)}`,
    level: "info",
    uuid: ensureFrameUuid(msg.uuid),
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-3xdfvx0n.js:3613-3997 layout = convertCompactBoundaryMessage (0.821)
/**
 * system/compact_boundary 帧 → 本地 compact_boundary（缺 compact_metadata 丢弃）。
 */
function convertRemoteCompactBoundary(msg) {
  let compactMetadata = msg.compact_metadata;
  if (typeof compactMetadata !== "object" || compactMetadata === null) {
    logForDebugging("[sdkMessageAdapter] Dropping compact_boundary frame without compact_metadata", {
      level: "error",
    });
    return null;
  }
  return {
    type: "system",
    subtype: "compact_boundary",
    content: "Conversation compacted",
    level: "info",
    uuid: ensureFrameUuid(msg.uuid),
    timestamp: new Date().toISOString(),
    compactMetadata: fromSDKCompactMetadata(msg.compact_metadata),
    remoteSourced: true,
  };
}
//@ chunk-3xdfvx0n.js:3997-5748 layout
/**
 * 校验并提取 init 帧：model、cwd、slash_commands、skills、plugins、mcp_servers、tools、workerEpoch（字段类型不对时记日志忽略）。
 */
function parseInitFrame(frame) {
  let model = typeof frame.model === "string" ? frame.model : undefined;
  if (frame.model !== undefined && model === undefined)
    logForDebugging(
      `[sdkMessageAdapter] init frame model is ${frame.model === null ? "null" : typeof frame.model}, not a string \u2014 keeping the current model`,
      {
        level: "error",
      },
    );
  let cwd = typeof frame.cwd === "string" ? frame.cwd : undefined;
  if (frame.cwd !== undefined && cwd === undefined)
    logForDebugging("[sdkMessageAdapter] init frame cwd is not a string \u2014 not adopting", {
      level: "error",
    });
  let slashCommands;
  if (Array.isArray(frame.slash_commands))
    slashCommands = frame.slash_commands.filter((slashCommand) => typeof slashCommand === "string");
  else if (frame.slash_commands !== undefined)
    logForDebugging(
      "[sdkMessageAdapter] init frame slash_commands is not an array \u2014 keeping the local command list",
      {
        level: "error",
      },
    );
  let mcpServers;
  if (Array.isArray(frame.mcp_servers))
    mcpServers = frame.mcp_servers.flatMap((mcpServer) =>
      typeof mcpServer === "object" &&
      mcpServer !== null &&
      typeof mcpServer.name === "string" &&
      (mcpServer.status === undefined || typeof mcpServer.status === "string")
        ? [
            mcpServer.status === undefined
              ? {
                  name: mcpServer.name,
                }
              : {
                  name: mcpServer.name,
                  status: mcpServer.status,
                },
          ]
        : [],
    );
  else if (frame.mcp_servers !== undefined)
    logForDebugging("[sdkMessageAdapter] init frame mcp_servers is not an array \u2014 ignoring", {
      level: "error",
    });
  let skills;
  if (Array.isArray(frame.skills)) skills = frame.skills.filter((skill) => typeof skill === "string");
  else if (frame.skills !== undefined)
    logForDebugging("[sdkMessageAdapter] init frame skills is not an array \u2014 ignoring", {
      level: "error",
    });
  let plugins;
  if (Array.isArray(frame.plugins))
    plugins = frame.plugins.flatMap((plugin) =>
      typeof plugin === "object" && plugin !== null && typeof plugin.name === "string" ? [plugin.name] : [],
    );
  else if (frame.plugins !== undefined)
    logForDebugging("[sdkMessageAdapter] init frame plugins is not an array \u2014 ignoring", {
      level: "error",
    });
  let tools;
  if (Array.isArray(frame.tools)) tools = frame.tools.filter((tool) => typeof tool === "string");
  else if (frame.tools !== undefined)
    logForDebugging("[sdkMessageAdapter] init frame tools is not an array \u2014 ignoring", {
      level: "error",
    });
  return {
    model,
    cwd,
    slashCommands,
    skills,
    plugins,
    mcpServers,
    tools,
    workerEpoch: readWorkerEpoch(frame),
  };
}
//@ chunk-3xdfvx0n.js:5748-6237 layout
/**
 * 解析远程 init/状态帧中的目标（active goal）状态。
 */
function parseGoalState(goal) {
  if (!goal) return;
  if (
    typeof goal.condition !== "string" ||
    !Number.isSafeInteger(goal.iterations) ||
    goal.iterations < 0 ||
    !Number.isSafeInteger(goal.set_at) ||
    goal.set_at < 0 ||
    !Number.isSafeInteger(goal.tokens_at_start) ||
    goal.tokens_at_start < 0 ||
    (goal.last_reason !== undefined && typeof goal.last_reason !== "string")
  )
    return;
  return {
    condition: sanitizeDisplayText(goal.condition, {
      maxCodeUnits: 4000,
    }),
    iterations: goal.iterations,
    setAt: goal.set_at,
    tokensAtStart: goal.tokens_at_start,
    ...(goal.last_reason !== undefined && {
      lastReason: sanitizeDisplayText(goal.last_reason, {
        maxCodeUnits: 512,
      }),
    }),
  };
}
//@ chunk-3xdfvx0n.js:6237-6364 layout
var AUTOCOMPACT_SOURCES = {
  env: true,
  settings: true,
  clientdata: true,
  experiment: true,
  "model-default": true,
  "unknown-model": true,
  auto: true,
};
var AUTOCOMPACT_SOURCE_SET = new Set(Object.keys(AUTOCOMPACT_SOURCES));
//@ chunk-3xdfvx0n.js:6364-6897 layout
/**
 * 解析远程 autocompact 状态帧，格式不对时丢弃并记 remote_autocompact_frame_drop。
 */
function parseAutocompactState(frame) {
  if (
    typeof frame !== "object" ||
    frame === null ||
    typeof frame.enabled !== "boolean" ||
    typeof frame.enforced !== "boolean" ||
    !Number.isSafeInteger(frame.effective_window) ||
    frame.effective_window <= 0 ||
    !Number.isSafeInteger(frame.threshold) ||
    frame.threshold <= 0 ||
    !AUTOCOMPACT_SOURCE_SET.has(frame.source)
  ) {
    if (claimOnce().claim("remote_autocompact_frame_drop")) {
      logForDebugging("[sdkMessageAdapter] Dropping malformed autocompact_state frame");
      logFeatureSad("remote_autocompact_sync", "invalid_frame");
    }
    return;
  }
  return {
    enabled: frame.enabled,
    effectiveWindow: frame.effective_window,
    threshold: frame.threshold,
    enforced: frame.enforced,
    source: frame.source,
  };
}
//@ chunk-3xdfvx0n.js:6897-7297 layout
/**
 * 采用远程会话的自动压缩状态到 AppState.remoteAutocompactState（变化时记 tengu_remote_autocompact_state_adopted）。
 */
function adoptRemoteAutocompactState(setAppState, frame, via) {
  let autocompactState = parseAutocompactState(frame);
  if (autocompactState === undefined) {
    setAppState((m) =>
      m.remoteAutocompactState === undefined
        ? m
        : {
            ...m,
            remoteAutocompactState: undefined,
          },
    );
    return;
  }
  let i = false;
  setAppState((m) => {
    if (
      m.remoteAutocompactState !== undefined &&
      sameAutocompactState(m.remoteAutocompactState, autocompactState)
    )
      return m;
    i = true;
    return {
      ...m,
      remoteAutocompactState: autocompactState,
    };
  });
  if (!i) return;
  logEvent("tengu_remote_autocompact_state_adopted", {
    via,
    enabled: autocompactState.enabled,
    enforced: autocompactState.enforced,
    source: fromEnum(autocompactState.source),
  });
}
//@ chunk-3xdfvx0n.js:7297-7359 layout
var shallowEqualDefined = (e, currentLimits) =>
  En(
    wi(e, (r) => r === undefined),
    wi(currentLimits, (r) => r === undefined),
  );
//@ chunk-3xdfvx0n.js:7359-8660 layout
/**
 * 远程速率限制采纳器：缓冲 rate_limit 帧，账户切换时丢弃，seed/history 来源的过期信息跳过，采纳时更新本地限额状态并记遥测。
 */
function createRemoteRateLimitAdopter(isEnabled, via) {
  let r = [];
  let limitsAccountEpoch = getLimitsAccountEpoch();
  let i = false;
  let m = false;
  let g = (frames) => {
    if (!isEnabled()) return;
    logEvent("tengu_remote_rate_limits_dropped", {
      via: fromEnum(via),
      reason: lit("account_switched"),
      frames,
    });
  };
  let y = (_, w) => {
    if (!isEnabled()) return;
    let latestLimitStatus = getLatestLimitStatus(_);
    if (latestLimitStatus === undefined) return;
    if (
      (w === "seed" || w === "history") &&
      (extractQuotaStatusFromHeaders_2(latestLimitStatus.info) ||
        (latestLimitStatus.info.resetsAt === undefined &&
          latestLimitStatus.info.overageResetsAt === undefined))
    )
      return;
    let currentLimits = getCurrentLimits();
    let I = {
      ...toSdkRateLimitInfo(latestLimitStatus.info, {
        unifiedRateLimitFallbackAvailable: currentLimits.unifiedRateLimitFallbackAvailable,
        upgradePaths: currentLimits.upgradePaths,
      }),
      ...(currentLimits.lowPriorityOffer !== undefined && {
        lowPriorityOffer: currentLimits.lowPriorityOffer,
      }),
      ...(currentLimits.lowPriorityRetryAfterSeconds !== undefined && {
        lowPriorityRetryAfterSeconds: currentLimits.lowPriorityRetryAfterSeconds,
      }),
      ...(currentLimits.lowPriorityMaxWaitSeconds !== undefined && {
        lowPriorityMaxWaitSeconds: currentLimits.lowPriorityMaxWaitSeconds,
      }),
    };
    if (areLimitsObserved() && shallowEqualDefined(I, currentLimits)) return;
    emitLimitsStatusChange(I);
    logEvent("tengu_remote_rate_limits_adopted", {
      via: fromEnum(w),
      status: fromEnum(latestLimitStatus.info.status),
      degradation: fromEnum(latestLimitStatus.degradation),
      frames: _.length,
    });
  };
  let d = (_, w) => {
    if (m) return;
    try {
      y(_, w);
    } catch (error) {
      logError(error);
    }
  };
  let S = (_ = via) => {
    i = false;
    let w = r;
    r = [];
    if (w.length === 0) return;
    if (limitsAccountEpoch !== getLimitsAccountEpoch()) {
      g(w.length);
      return;
    }
    d(w, _);
  };
  let h = (_) => {
    let limitsAccountEpoch_2 = getLimitsAccountEpoch();
    if (r.length > 0 && limitsAccountEpoch_2 !== limitsAccountEpoch) {
      g(r.length);
      r = [];
    }
    limitsAccountEpoch = limitsAccountEpoch_2;
    r.push(_);
  };
  return {
    adopt(_, w) {
      S();
      d(_, w);
    },
    push(_) {
      if (m) return;
      h(_);
      if (!i) {
        i = true;
        queueMicrotask(() => {
          if (i) S();
        });
      }
    },
    hold(_) {
      if (m) return;
      h(_);
    },
    settle(_) {
      if (!i) S(_);
    },
    hasHeld: () => r.length > 0 && !i,
    flush: () => S(),
    dispose() {
      m = true;
      r = [];
    },
  };
}
//@ chunk-3xdfvx0n.js:8660-13943 fingerprint = convertSDKMessage (0.489)
/**
 * SDK 消息总适配：control_* 忽略；assistant → message；user 中 tool_result → message，子代理/合成/普通文本按选项忽略或转换；stream_event；result（非 success）；system 的 status/compact_boundary/model_refusal_fallback/model_fallback/model_consent_fallback/informational/tool_host_result/local_command_output；env_manager_log；conversation_reset；其它忽略。
 */
function convertSDKMessage(msg, opts) {
  if (!capFrameDepth(msg))
    return {
      type: "ignored",
    };
  switch (msg.type) {
    case "control_request":
    case "control_response":
    case "control_cancel_request":
      return {
        type: "ignored",
      };
    case "assistant":
      return {
        type: "message",
        message: convertAssistantMessage(msg),
      };
    case "user": {
      let content = msg.message?.content;
      if (Array.isArray(content) && content.some((m) => m.type === "tool_result")) {
        let m = nonExecutionKindOf(msg.tool_result_meta, content);
        return {
          type: "message",
          message: {
            ...createUserMessage({
              content,
              toolUseResult: mapToolResultImages(msg.tool_use_result, msg.message),
              uuid: msg.uuid,
              timestamp: msg.timestamp,
            }),
            remoteSourced: true,
            ...false,
            ...undefined,
            ...(m !== undefined && {
              remoteToolDenialKind: m,
            }),
          },
        };
      }
      if (msg.parent_tool_use_id)
        return {
          type: "ignored",
        };
      if (msg.isSynthetic && !isNonHumanInboundOrigin(msg.origin))
        return {
          type: "ignored",
        };
      let i =
        content === INTERRUPT_MESSAGE ||
        (Array.isArray(content) &&
          content.some(
            (m) =>
              m.type === "text" &&
              (m.text === INTERRUPT_MESSAGE || m.text === INTERRUPT_MESSAGE_FOR_TOOL_USE),
          ));
      if (opts?.convertUserTextMessages || i) {
        if (typeof content === "string" || Array.isArray(content))
          return {
            type: "message",
            message: createUserMessage({
              content,
              toolUseResult: msg.tool_use_result,
              uuid: msg.uuid,
              timestamp: msg.timestamp,
            }),
          };
      }
      return {
        type: "ignored",
      };
    }
    case "stream_event":
      return {
        type: "stream_event",
        event: convertStreamEventFrame(msg),
      };
    case "result": {
      if (msg.subtype === "success")
        return {
          type: "ignored",
        };
      let statusMsg = convertResultMessage(msg);
      return statusMsg
        ? {
            type: "message",
            message: statusMsg,
          }
        : {
            type: "ignored",
          };
    }
    case "system":
      if (msg.subtype === "init")
        return {
          type: "ignored",
        };
      if (msg.subtype === "status") {
        if (msg.status === "requesting")
          return {
            type: "stream_event",
            event: {
              type: "stream_request_start",
            },
          };
        let r = convertStatusMessage(msg);
        return r
          ? {
              type: "message",
              message: r,
            }
          : {
              type: "ignored",
            };
      }
      if (msg.subtype === "compact_boundary") {
        let r = convertRemoteCompactBoundary(msg);
        return r
          ? {
              type: "message",
              message: r,
            }
          : {
              type: "ignored",
            };
      }
      if (msg.subtype === "model_refusal_fallback")
        return {
          type: "message",
          message: {
            type: "system",
            subtype: "model_refusal_fallback",
            content:
              msg.direction === "retry" &&
              msg.scope !== "local" &&
              typeof msg.original_model === "string" &&
              typeof msg.fallback_model === "string"
                ? buildRefusalMessage(
                    msg.original_model,
                    msg.fallback_model,
                    msg.api_refusal_category ?? null,
                  )
                : sanitizeDisplayText(typeof msg.content === "string" ? msg.content : "", {
                    drop: MARKDOWN_BREAK_CHARS,
                    maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
                  }),
            level: "warning",
            trigger: msg.trigger,
            direction: msg.direction,
            ...(msg.scope !== undefined && {
              scope: msg.scope,
            }),
            originalModel: msg.original_model,
            fallbackModel: msg.fallback_model,
            requestId: msg.request_id,
            apiRefusalCategory: msg.api_refusal_category ?? null,
            apiRefusalExplanation: msg.api_refusal_explanation ?? null,
            ...(msg.retracted_message_uuids !== undefined && {
              retractedMessageUuids: msg.retracted_message_uuids,
            }),
            ...(msg.refused_user_message_uuid !== undefined && {
              refusedUserMessageUuid: msg.refused_user_message_uuid,
            }),
            isMeta: false,
            uuid: ensureFrameUuid(msg.uuid),
            timestamp: new Date().toISOString(),
          },
        };
      if (msg.subtype === "model_fallback") {
        if (!hasStringContent(msg))
          return {
            type: "ignored",
          };
        return {
          type: "message",
          message: {
            type: "system",
            subtype: "model_fallback",
            content: stripAnsi(msg.content),
            level: "warning",
            trigger: msg.trigger,
            originalModel: msg.original_model,
            fallbackModel: msg.fallback_model,
            isMeta: false,
            uuid: ensureFrameUuid(msg.uuid),
            timestamp: new Date().toISOString(),
          },
        };
      }
      if (msg.subtype === "model_consent_fallback") {
        if (!hasStringContent(msg))
          return {
            type: "ignored",
          };
        return {
          type: "message",
          message: createConsentFallbackMessage({
            ...msg,
            content: stripAnsi(msg.content),
            uuid: ensureFrameUuid(msg.uuid),
          }),
        };
      }
      if (msg.subtype === "informational") {
        if (!hasStringContent(msg))
          return {
            type: "ignored",
          };
        return {
          type: "message",
          message: {
            type: "system",
            subtype: "informational",
            content: stripAnsi(msg.content),
            level: msg.level,
            isMeta: false,
            uuid: ensureFrameUuid(msg.uuid),
            timestamp: new Date().toISOString(),
            ...(msg.tool_use_id && {
              toolUseID: msg.tool_use_id,
            }),
            ...(msg.prevent_continuation && {
              preventContinuation: msg.prevent_continuation,
            }),
          },
        };
      }
      if (msg.subtype === "tool_host_result") {
        let r = Array.isArray(msg.lines)
          ? msg.lines
              .filter((line) => typeof line === "string")
              .slice(0, 32)
              .map((line) =>
                sanitizeDisplayText(line, {
                  maxCodeUnits: 2100,
                }),
              )
              .filter((g) => g.trim() !== "")
          : [];
        let s =
          typeof msg.label === "string"
            ? sanitizeDisplayText(msg.label, {
                maxCodeUnits: 320,
              })
            : undefined;
        let i = msg.unverified === true && s !== undefined && s.trim() !== "";
        if (typeof msg.tool_use_id !== "string" || (r.length === 0 && !i))
          return {
            type: "ignored",
          };
        let frameUuid = ensureFrameUuid(msg.uuid);
        return {
          type: "message",
          message: createAttachmentMessage(
            {
              type: "tool_host_result_lines",
              toolUseID: msg.tool_use_id,
              host: machineLabelForMessage(typeof msg.host?.name === "string" ? msg.host.name : ""),
              lines: r,
              ...(s !== undefined && {
                label: s,
              }),
              ...(i && {
                unverified: true,
              }),
            },
            {
              now: () => new Date().toISOString(),
              uuid: () => frameUuid,
            },
          ),
        };
      }
      if (msg.subtype === "permission_denied")
        return {
          type: "ignored",
        };
      if (msg.subtype === "local_command_output") {
        if (!hasStringContent(msg))
          return {
            type: "ignored",
          };
        let frameUuid = ensureFrameUuid(msg.uuid);
        return {
          type: "message",
          message: createAssistantMessage({
            content: stripAnsi(msg.content),
            uuid: () => frameUuid,
          }),
        };
      }
      logForDebugging(`[sdkMessageAdapter] Ignoring system message subtype: ${msg.subtype}`);
      return {
        type: "ignored",
      };
    case "tool_progress":
      logForDebugging("[sdkMessageAdapter] Ignoring tool_progress frame");
      return {
        type: "ignored",
      };
    case "auth_status":
      logForDebugging("[sdkMessageAdapter] Ignoring auth_status message");
      return {
        type: "ignored",
      };
    case "tool_use_summary":
      logForDebugging("[sdkMessageAdapter] Ignoring tool_use_summary message");
      return {
        type: "ignored",
      };
    case "rate_limit_event":
      logForDebugging("[sdkMessageAdapter] Ignoring rate_limit_event message");
      return {
        type: "ignored",
      };
    case "active_goal":
      return {
        type: "ignored",
      };
    case "autocompact_state":
      return {
        type: "ignored",
      };
    case "env_manager_log": {
      let content = typeof msg.data?.content === "string" ? msg.data.content : null;
      if (content === null) {
        logForDebugging(
          "[sdkMessageAdapter] env_manager_log without data.content \u2014 orchestrator wire change?",
          {
            level: "warn",
          },
        );
        return {
          type: "env_log",
          message: "",
        };
      }
      return {
        type: "env_log",
        message: tailLines(content, 1)[0] ?? "",
      };
    }
    case "conversation_reset": {
      let newConversationId = msg.new_conversation_id;
      if (typeof newConversationId !== "string" || newConversationId === "") {
        logForDebugging(
          "[sdkMessageAdapter] Dropping conversation_reset frame without a string new_conversation_id",
          {
            level: "error",
          },
        );
        return {
          type: "ignored",
        };
      }
      return {
        type: "conversation_reset",
        newConversationId,
      };
    }
    default:
      logForDebugging(`[sdkMessageAdapter] Unknown message type: ${msg.type}`);
      return {
        type: "ignored",
      };
  }
}
//@ chunk-0h4e7gnq.js:14624-14668 fingerprint = convertStreamEvent (1)
var convertStreamEvent = (msg) => ({
  type: "stream_event",
  event: msg,
});
//@ chunk-0h4e7gnq.js:14668-14779 affinity
var inputJsonDeltaEvent = (e) =>
  convertStreamEvent({
    type: "content_block_delta",
    index: e.index,
    delta: {
      type: "input_json_delta",
      partial_json: e.json,
    },
  });
//@ chunk-0h4e7gnq.js:14779-14876 affinity
var textDeltaEvent = (e) =>
  convertStreamEvent({
    type: "content_block_delta",
    index: e.index,
    delta: {
      type: "text_delta",
      text: e.text,
    },
  });
//@ chunk-0h4e7gnq.js:14876-15003 affinity
var thinkingDeltaEvent = (e) =>
  convertStreamEvent({
    type: "content_block_delta",
    index: e.index,
    delta: {
      type: "thinking_delta",
      thinking: e.text,
      estimated_tokens: null,
    },
  });
//@ chunk-0h4e7gnq.js:15003-15132 affinity
function deltaEventForKind(e) {
  switch (e.kind) {
    case "text":
      return textDeltaEvent(e);
    case "thinking":
      return thinkingDeltaEvent(e);
    case "input":
      return inputJsonDeltaEvent(e);
    default:
      return textDeltaEvent(e);
  }
}
//@ chunk-0h4e7gnq.js:38969-39244 fingerprint = convertCompactBoundaryMessage (0.876)
/**
 * 把 SDK compact_boundary 消息转成本地"Conversation compacted"系统消息。
 */
function convertCompactBoundaryMessage(msg) {
  return {
    type: "system",
    subtype: "compact_boundary",
    content: "Conversation compacted",
    level: "info",
    compactMetadata: fromSDKCompactMetadata(msg.compact_metadata),
    ...(msg.logical_parent_uuid !== undefined && {
      logicalParentUuid: msg.logical_parent_uuid,
    }),
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-0h4e7gnq.js:39244-39932 placement
/**
 * SDK model_refusal_fallback 事件转为内部 system 消息。
 */
function createRefusalFallbackMessage(e) {
  return {
    type: "system",
    subtype: "model_refusal_fallback",
    content: e.content,
    level: "warning",
    trigger: e.trigger,
    direction: e.direction,
    ...(e.scope !== undefined && {
      scope: e.scope,
    }),
    originalModel: e.original_model,
    fallbackModel: e.fallback_model,
    requestId: e.request_id,
    apiRefusalCategory: e.api_refusal_category,
    apiRefusalExplanation: e.api_refusal_explanation,
    ...(e.saw_cyber_refusal && {
      sawCyberRefusal: true,
    }),
    ...(e.retracted_message_uuids !== undefined && {
      retractedMessageUuids: e.retracted_message_uuids,
    }),
    ...(e.refused_user_message_uuid !== undefined && {
      refusedUserMessageUuid: e.refused_user_message_uuid,
    }),
    ...(e.provisional && {
      provisional: e.provisional,
    }),
    isMeta: false,
    uuid: e.uuid,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-0h4e7gnq.js:39932-40292 placement
/**
 * SDK model_refusal_no_fallback 事件转为内部 system 消息。
 */
function createRefusalNoFallbackMessage(e) {
  return {
    type: "system",
    subtype: "model_refusal_no_fallback",
    content: e.content,
    level: "warning",
    originalModel: e.original_model,
    requestId: e.request_id,
    apiRefusalCategory: e.api_refusal_category,
    apiRefusalExplanation: e.api_refusal_explanation,
    refusedUserMessageUuid: e.refused_user_message_uuid,
    isMeta: false,
    uuid: e.uuid,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-0h4e7gnq.js:40526-40882 placement
/**
 * SDK model_consent_fallback 事件转为内部 system 消息。
 */
function createConsentFallbackMessage(e) {
  return {
    type: "system",
    subtype: "model_consent_fallback",
    content: e.content,
    level: "warning",
    choice: e.choice,
    originalModel: e.original_model,
    originalModelName: isProbeWrittenValue(e.original_model_name) ? e.original_model_name : undefined,
    fallbackModel: e.fallback_model,
    persistedAsDefault: e.persisted_as_default,
    isMeta: false,
    uuid: e.uuid,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-0h4e7gnq.js:46697-46808 placement = createToolUseSummaryMessage (0.751)
function createToolUseSummaryMessage(e) {
  return {
    type: "tool_use_summary",
    summary: e.summary,
    preceding_tool_use_ids: e.precedingToolUseIds,
  };
}
//@ chunk-0h4e7gnq.js:46808-46946 placement
/**
 * 把限额事件转成 SDK 的 rate limit 信息（状态、重置时间、类型、是否用超额）。
 */
function toRateLimitInfo(rateLimitInfo) {
  return {
    status: rateLimitInfo.status,
    resetsAt: rateLimitInfo.resetsAt ?? null,
    rateLimitType: rateLimitInfo.rateLimitType ?? null,
    isUsingOverage: rateLimitInfo.isUsingOverage ?? false,
  };
}
//@ chunk-0h4e7gnq.js:47070-48384 placement
/**
 * 把内部限流状态转成 SDK rate_limit 事件的载荷：status、是否有统一限流回退、升级路径，以及存在时才带上的重置时间、类型、用量、超额状态/范围/周期用量、错误码、能否购买额度等字段（limitScope 输出为 overageScope）。
 */
function toSdkRateLimitInfo(limits, { unifiedRateLimitFallbackAvailable, upgradePaths }) {
  return {
    status: limits.status,
    unifiedRateLimitFallbackAvailable,
    ...(upgradePaths !== undefined && {
      upgradePaths,
    }),
    ...(limits.resetsAt !== undefined && {
      resetsAt: limits.resetsAt,
    }),
    ...(limits.rateLimitType !== undefined && {
      rateLimitType: limits.rateLimitType,
    }),
    ...(limits.utilization !== undefined && {
      utilization: limits.utilization,
    }),
    ...(limits.overageStatus !== undefined && {
      overageStatus: limits.overageStatus,
    }),
    ...(limits.overageResetsAt !== undefined && {
      overageResetsAt: limits.overageResetsAt,
    }),
    ...(limits.overageDisabledReason !== undefined && {
      overageDisabledReason: limits.overageDisabledReason,
    }),
    ...(limits.limitScope !== undefined && {
      overageScope: limits.limitScope,
    }),
    ...(limits.isUsingOverage !== undefined && {
      isUsingOverage: limits.isUsingOverage,
    }),
    ...(limits.overageInUse !== undefined && {
      overageInUse: limits.overageInUse,
    }),
    ...(limits.surpassedThreshold !== undefined && {
      surpassedThreshold: limits.surpassedThreshold,
    }),
    ...(limits.rateLimitGraceActive === true && {
      rateLimitGraceActive: true,
    }),
    ...(limits.overagePeriodMonthly !== undefined && {
      overagePeriodMonthly: {
        utilization: limits.overagePeriodMonthly.utilization,
      },
    }),
    ...(limits.overagePeriodChannel !== undefined && {
      overagePeriodChannel: {
        utilization: limits.overagePeriodChannel.utilization,
      },
    }),
    ...(limits.errorCode !== undefined && {
      errorCode: limits.errorCode,
    }),
    ...(limits.canUserPurchaseCredits !== undefined && {
      canUserPurchaseCredits: limits.canUserPurchaseCredits,
    }),
    ...(limits.hasChargeableSavedPaymentMethod !== undefined && {
      hasChargeableSavedPaymentMethod: limits.hasChargeableSavedPaymentMethod,
    }),
  };
}
//@ chunk-kj4ctmv0.js:447-582 placement
function convertToolProgressMessage(msg) {
  let launchedAgentId =
    msg.type === "system" && msg.subtype === "informational" ? msg.launchedAgentId : undefined;
  return launchedAgentId !== undefined && normalizeAgentIdOrNull(launchedAgentId) !== null
    ? launchedAgentId
    : undefined;
}
export {
  convertStreamEvent,
  deltaEventForKind,
  toRateLimitInfo,
  convertToolProgressMessage,
  isControlFrame,
  createRemoteRateLimitAdopter,
  parseGoalState,
  adoptRemoteAutocompactState,
  convertSDKMessage,
  parseInitFrame,
  filterDisplayableErrors,
  createRefusalFallbackMessage,
  createRefusalNoFallbackMessage,
  convertCompactBoundaryMessage,
  createConsentFallbackMessage,
  parseAutocompactState,
  createToolUseSummaryMessage,
};
