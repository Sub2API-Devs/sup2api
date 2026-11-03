/**
 * remote/sdkMessageAdapter.ts
 *
 * 并入旧版已有路径：SDK 消息适配。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/remote/sdkMessageAdapter.ts
 * pieces: chunk-0h4e7gnq.js (11), chunk-3xdfvx0n.js (18), chunk-kj4ctmv0.js (1)
 * attribution: fingerprint 5, affinity 4, placement 8, callgraph-fingerprint 1, layout 12
 */
import { randomUUID } from "crypto";
import {
  a2n,
  sanitizeApiErrorMessage,
  sanitizeTextBlocks,
  hLr,
  Mxo,
  RFt,
  fromSDKCompactMetadata,
  _Lr,
} from "../utils/messages/mappers.js";
import { logForDebugging, createAttachmentMessage_2 as createAttachmentMessage } from "../utils/debug.js";
import { Yn } from "../utils/stripAnsi.js";
import { readWorkerEpoch, capFrameDepth } from "./wireFrameShape.js";
import { sanitizeDisplayText, Zwr, MAX_MARKDOWN_SAFE_LENGTH, tailLines } from "../utils/resultError.js";
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
import { toSdkRateLimitInfo } from "./_new/toSdkRateLimitInfo.js";
import { logError } from "../utils/log.js";
import {
  createUserMessage,
  INTERRUPT_MESSAGE,
  INTERRUPT_MESSAGE_FOR_TOOL_USE,
  createAssistantMessage,
} from "../utils/messages.js";
import { qwn } from "../cli/transports/ccrMessageMapping.js";
import { qB } from "../utils/backgroundSessionResume.js";
import { buildRefusalMessage } from "../services/api/safeguardMessages.js";
import { HT } from "../bridge/deviceRegistration.js";
import { isProbeWrittenValue } from "../utils/model/thirdPartyModelDefaults.js";
import { Um } from "../utils/agentId.js";

//@ chunk-3xdfvx0n.js:1283-1294 placement
var G = null;
//@ chunk-3xdfvx0n.js:1294-1545 placement
function isControlFrame(e) {
  return (
    e.type !== "control_request" &&
    e.type !== "control_response" &&
    e.type !== "keep_alive" &&
    e.type !== "control_cancel_request" &&
    e.type !== "transcript_mirror" &&
    !(e.type === "system" && (e.subtype === "task_summary" || e.subtype === "session_metadata"))
  );
}
/**
 * SDK assistant → 本地 assistant 消息（remoteSourced，带 API 错误字段、verification_required 改写、云记忆工具 ID）。
 */
//@ chunk-3xdfvx0n.js:1545-2223 callgraph-fingerprint = convertAssistantMessage (0.199)
function convertAssistantMessage(msg) {
  let n = a2n(msg),
    r = G?.cloudMemoryToolUseIds(msg.tool_use_meta) ?? [];
  return {
    type: "assistant",
    message:
      msg.error === "verification_required"
        ? sanitizeApiErrorMessage(msg.message)
        : n
          ? { ...msg.message, content: sanitizeTextBlocks(msg.message.content) }
          : msg.message,
    uuid: msg.uuid,
    requestId: void 0,
    timestamp: msg.timestamp ?? new Date().toISOString(),
    remoteSourced: !0,
    error: msg.error,
    ...(hLr(msg) && { isApiErrorMessage: !0 }),
    ...(n && { sessionFailureNotice: !0 }),
    ...(Mxo(msg.api_error_status) && { apiErrorStatus: msg.api_error_status }),
    ...(msg.api_error !== void 0 && { apiError: msg.api_error }),
    ...(msg.api_error_params !== void 0 && { apiErrorParams: msg.api_error_params }),
    ...(msg.api_error_code !== void 0 && { apiErrorCode: msg.api_error_code }),
    ...!1,
    ...(r.length > 0 && { cloudMemoryToolUseIds: r }),
  };
}
//@ chunk-3xdfvx0n.js:2223-2321 layout
function convertStreamEventFrame(frame) {
  return {
    type: "stream_event",
    event: frame.event,
    ...(frame.ttft_ms !== void 0 && { ttftMs: frame.ttft_ms }),
  };
}
//@ chunk-3xdfvx0n.js:2321-2501 layout
function ensureFrameUuid(e) {
  let n = e;
  if (typeof n === "string" && n !== "" && e !== void 0) return e;
  return (
    logForDebugging("[sdkMessageAdapter] frame uuid missing or not a string \u2014 minting one", {
      level: "error",
    }),
    randomUUID()
  );
}
//@ chunk-3xdfvx0n.js:2501-2664 layout
function hasStringContent(frame) {
  if (typeof frame.content === "string") return !0;
  return (
    logForDebugging(`[sdkMessageAdapter] Dropping ${frame.subtype} frame whose content is not a string`, {
      level: "error",
    }),
    !1
  );
}
/**
 * 过滤远程错误文本：去掉 [ede_diagnostic] / [session_crash] 诊断标记行。
 */
//@ chunk-3xdfvx0n.js:2664-2821 layout
function filterDisplayableErrors(e) {
  if (!Array.isArray(e)) return [];
  return e.filter(
    (n) => typeof n === "string" && !n.startsWith("[ede_diagnostic]") && !n.startsWith("[session_crash]"),
  );
}
/**
 * 非 success 的 result → warning 级 informational（errors 拼接，去掉诊断前缀）；success → "Session completed successfully"。
 */
//@ chunk-3xdfvx0n.js:2821-3356 fingerprint = convertResultMessage (0.662)
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
  if (!Array.isArray(errors))
    return (
      logForDebugging(
        `[sdkMessageAdapter] ${msg.subtype} result without an errors[] array \u2014 nothing to show`,
      ),
      null
    );
  let r = filterDisplayableErrors(errors);
  if (r.length === 0) return null;
  return {
    type: "system",
    subtype: "informational",
    content: RFt(r.join(", ")),
    level: "warning",
    fromRemoteErrorResult: !0,
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
    content: status === "compacting" ? "Compacting conversation\u2026" : `Status: ${Yn(status)}`,
    level: "info",
    uuid: ensureFrameUuid(msg.uuid),
    timestamp: new Date().toISOString(),
  };
}
/**
 * system/compact_boundary 帧 → 本地 compact_boundary（缺 compact_metadata 丢弃）。
 */
//@ chunk-3xdfvx0n.js:3613-3997 layout = convertCompactBoundaryMessage (0.821)
function convertRemoteCompactBoundary(msg) {
  let compact_metadata = msg.compact_metadata;
  if (typeof compact_metadata !== "object" || compact_metadata === null)
    return (
      logForDebugging("[sdkMessageAdapter] Dropping compact_boundary frame without compact_metadata", {
        level: "error",
      }),
      null
    );
  return {
    type: "system",
    subtype: "compact_boundary",
    content: "Conversation compacted",
    level: "info",
    uuid: ensureFrameUuid(msg.uuid),
    timestamp: new Date().toISOString(),
    compactMetadata: fromSDKCompactMetadata(msg.compact_metadata),
    remoteSourced: !0,
  };
}
/**
 * 校验并提取 init 帧：model、cwd、slash_commands、skills、plugins、mcp_servers、tools、workerEpoch（字段类型不对时记日志忽略）。
 */
//@ chunk-3xdfvx0n.js:3997-5748 layout
function parseInitFrame(frame) {
  let n = typeof frame.model === "string" ? frame.model : void 0;
  if (frame.model !== void 0 && n === void 0)
    logForDebugging(
      `[sdkMessageAdapter] init frame model is ${frame.model === null ? "null" : typeof frame.model}, not a string \u2014 keeping the current model`,
      { level: "error" },
    );
  let r = typeof frame.cwd === "string" ? frame.cwd : void 0;
  if (frame.cwd !== void 0 && r === void 0)
    logForDebugging("[sdkMessageAdapter] init frame cwd is not a string \u2014 not adopting", {
      level: "error",
    });
  let s;
  if (Array.isArray(frame.slash_commands))
    s = frame.slash_commands.filter((slash_command) => typeof slash_command === "string");
  else if (frame.slash_commands !== void 0)
    logForDebugging(
      "[sdkMessageAdapter] init frame slash_commands is not an array \u2014 keeping the local command list",
      { level: "error" },
    );
  let i;
  if (Array.isArray(frame.mcp_servers))
    i = frame.mcp_servers.flatMap((mcp_server) =>
      typeof mcp_server === "object" &&
      mcp_server !== null &&
      typeof mcp_server.name === "string" &&
      (mcp_server.status === void 0 || typeof mcp_server.status === "string")
        ? [
            mcp_server.status === void 0
              ? { name: mcp_server.name }
              : { name: mcp_server.name, status: mcp_server.status },
          ]
        : [],
    );
  else if (frame.mcp_servers !== void 0)
    logForDebugging("[sdkMessageAdapter] init frame mcp_servers is not an array \u2014 ignoring", {
      level: "error",
    });
  let m;
  if (Array.isArray(frame.skills)) m = frame.skills.filter((skill) => typeof skill === "string");
  else if (frame.skills !== void 0)
    logForDebugging("[sdkMessageAdapter] init frame skills is not an array \u2014 ignoring", {
      level: "error",
    });
  let g;
  if (Array.isArray(frame.plugins))
    g = frame.plugins.flatMap((plugin) =>
      typeof plugin === "object" && plugin !== null && typeof plugin.name === "string" ? [plugin.name] : [],
    );
  else if (frame.plugins !== void 0)
    logForDebugging("[sdkMessageAdapter] init frame plugins is not an array \u2014 ignoring", {
      level: "error",
    });
  let y;
  if (Array.isArray(frame.tools)) y = frame.tools.filter((tool) => typeof tool === "string");
  else if (frame.tools !== void 0)
    logForDebugging("[sdkMessageAdapter] init frame tools is not an array \u2014 ignoring", {
      level: "error",
    });
  return {
    model: n,
    cwd: r,
    slashCommands: s,
    skills: m,
    plugins: g,
    mcpServers: i,
    tools: y,
    workerEpoch: readWorkerEpoch(frame),
  };
}
/**
 * 解析远程 init/状态帧中的目标（active goal）状态。
 */
//@ chunk-3xdfvx0n.js:5748-6237 layout
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
    (goal.last_reason !== void 0 && typeof goal.last_reason !== "string")
  )
    return;
  return {
    condition: sanitizeDisplayText(goal.condition, { maxCodeUnits: 4000 }),
    iterations: goal.iterations,
    setAt: goal.set_at,
    tokensAtStart: goal.tokens_at_start,
    ...(goal.last_reason !== void 0 && {
      lastReason: sanitizeDisplayText(goal.last_reason, { maxCodeUnits: 512 }),
    }),
  };
}
//@ chunk-3xdfvx0n.js:6237-6364 layout
var AUTOCOMPACT_SOURCES = {
    env: !0,
    settings: !0,
    clientdata: !0,
    experiment: !0,
    "model-default": !0,
    "unknown-model": !0,
    auto: !0,
  },
  AUTOCOMPACT_SOURCE_SET = new Set(Object.keys(AUTOCOMPACT_SOURCES));
/**
 * 解析远程 autocompact 状态帧，格式不对时丢弃并记 remote_autocompact_frame_drop。
 */
//@ chunk-3xdfvx0n.js:6364-6897 layout
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
    if (claimOnce().claim("remote_autocompact_frame_drop"))
      (logForDebugging("[sdkMessageAdapter] Dropping malformed autocompact_state frame"),
        logFeatureSad("remote_autocompact_sync", "invalid_frame"));
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
/**
 * 采用远程会话的自动压缩状态到 AppState.remoteAutocompactState（变化时记 tengu_remote_autocompact_state_adopted）。
 */
//@ chunk-3xdfvx0n.js:6897-7297 layout
function adoptRemoteAutocompactState(setAppState, frame, via) {
  let s = parseAutocompactState(frame);
  if (s === void 0) {
    setAppState((m) => (m.remoteAutocompactState === void 0 ? m : { ...m, remoteAutocompactState: void 0 }));
    return;
  }
  let i = !1;
  if (
    (setAppState((m) => {
      if (m.remoteAutocompactState !== void 0 && sameAutocompactState(m.remoteAutocompactState, s)) return m;
      return ((i = !0), { ...m, remoteAutocompactState: s });
    }),
    !i)
  )
    return;
  logEvent("tengu_remote_autocompact_state_adopted", {
    via: via,
    enabled: s.enabled,
    enforced: s.enforced,
    source: fromEnum(s.source),
  });
}
//@ chunk-3xdfvx0n.js:7297-7359 layout
var shallowEqualDefined = (e, n) =>
  En(
    wi(e, (r) => r === void 0),
    wi(n, (r) => r === void 0),
  );
/**
 * 远程速率限制采纳器：缓冲 rate_limit 帧，账户切换时丢弃，seed/history 来源的过期信息跳过，采纳时更新本地限额状态并记遥测。
 */
//@ chunk-3xdfvx0n.js:7359-8660 layout
function createRemoteRateLimitAdopter(isEnabled, via) {
  let r = [],
    s = getLimitsAccountEpoch(),
    i = !1,
    m = !1,
    g = (_) => {
      if (!isEnabled()) return;
      logEvent("tengu_remote_rate_limits_dropped", {
        via: fromEnum(via),
        reason: lit("account_switched"),
        frames: _,
      });
    },
    y = (_, w) => {
      if (!isEnabled()) return;
      let R = getLatestLimitStatus(_);
      if (R === void 0) return;
      if (
        (w === "seed" || w === "history") &&
        (extractQuotaStatusFromHeaders_2(R.info) ||
          (R.info.resetsAt === void 0 && R.info.overageResetsAt === void 0))
      )
        return;
      let A = getCurrentLimits(),
        I = {
          ...toSdkRateLimitInfo(R.info, {
            unifiedRateLimitFallbackAvailable: A.unifiedRateLimitFallbackAvailable,
            upgradePaths: A.upgradePaths,
          }),
          ...(A.lowPriorityOffer !== void 0 && { lowPriorityOffer: A.lowPriorityOffer }),
          ...(A.lowPriorityRetryAfterSeconds !== void 0 && {
            lowPriorityRetryAfterSeconds: A.lowPriorityRetryAfterSeconds,
          }),
          ...(A.lowPriorityMaxWaitSeconds !== void 0 && {
            lowPriorityMaxWaitSeconds: A.lowPriorityMaxWaitSeconds,
          }),
        };
      if (areLimitsObserved() && shallowEqualDefined(I, A)) return;
      (emitLimitsStatusChange(I),
        logEvent("tengu_remote_rate_limits_adopted", {
          via: fromEnum(w),
          status: fromEnum(R.info.status),
          degradation: fromEnum(R.degradation),
          frames: _.length,
        }));
    },
    d = (_, w) => {
      if (m) return;
      try {
        y(_, w);
      } catch (error) {
        logError(error);
      }
    },
    S = (_ = via) => {
      i = !1;
      let w = r;
      if (((r = []), w.length === 0)) return;
      if (s !== getLimitsAccountEpoch()) {
        g(w.length);
        return;
      }
      d(w, _);
    },
    h = (_) => {
      let w = getLimitsAccountEpoch();
      if (r.length > 0 && w !== s) (g(r.length), (r = []));
      ((s = w), r.push(_));
    };
  return {
    adopt(_, w) {
      (S(), d(_, w));
    },
    push(_) {
      if (m) return;
      if ((h(_), !i))
        ((i = !0),
          queueMicrotask(() => {
            if (i) S();
          }));
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
      ((m = !0), (r = []));
    },
  };
}
/**
 * SDK 消息总适配：control_* 忽略；assistant → message；user 中 tool_result → message，子代理/合成/普通文本按选项忽略或转换；stream_event；result（非 success）；system 的 status/compact_boundary/model_refusal_fallback/model_fallback/model_consent_fallback/informational/tool_host_result/local_command_output；env_manager_log；conversation_reset；其它忽略。
 */
//@ chunk-3xdfvx0n.js:8660-13943 fingerprint = convertSDKMessage (0.489)
function convertSDKMessage(msg, opts) {
  if (!capFrameDepth(msg)) return { type: "ignored" };
  switch (msg.type) {
    case "control_request":
    case "control_response":
    case "control_cancel_request":
      return { type: "ignored" };
    case "assistant":
      return { type: "message", message: convertAssistantMessage(msg) };
    case "user": {
      let content = msg.message?.content;
      if (Array.isArray(content) && content.some((m) => m.type === "tool_result")) {
        let m = _Lr(msg.tool_result_meta, content);
        return {
          type: "message",
          message: {
            ...createUserMessage({
              content: content,
              toolUseResult: qwn(msg.tool_use_result, msg.message),
              uuid: msg.uuid,
              timestamp: msg.timestamp,
            }),
            remoteSourced: !0,
            ...!1,
            ...void 0,
            ...(m !== void 0 && { remoteToolDenialKind: m }),
          },
        };
      }
      if (msg.parent_tool_use_id) return { type: "ignored" };
      if (msg.isSynthetic && !qB(msg.origin)) return { type: "ignored" };
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
              content: content,
              toolUseResult: msg.tool_use_result,
              uuid: msg.uuid,
              timestamp: msg.timestamp,
            }),
          };
      }
      return { type: "ignored" };
    }
    case "stream_event":
      return { type: "stream_event", event: convertStreamEventFrame(msg) };
    case "result": {
      if (msg.subtype === "success") return { type: "ignored" };
      let statusMsg = convertResultMessage(msg);
      return statusMsg ? { type: "message", message: statusMsg } : { type: "ignored" };
    }
    case "system":
      if (msg.subtype === "init") return { type: "ignored" };
      if (msg.subtype === "status") {
        if (msg.status === "requesting")
          return { type: "stream_event", event: { type: "stream_request_start" } };
        let r = convertStatusMessage(msg);
        return r ? { type: "message", message: r } : { type: "ignored" };
      }
      if (msg.subtype === "compact_boundary") {
        let r = convertRemoteCompactBoundary(msg);
        return r ? { type: "message", message: r } : { type: "ignored" };
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
                    drop: Zwr,
                    maxCodeUnits: MAX_MARKDOWN_SAFE_LENGTH,
                  }),
            level: "warning",
            trigger: msg.trigger,
            direction: msg.direction,
            ...(msg.scope !== void 0 && { scope: msg.scope }),
            originalModel: msg.original_model,
            fallbackModel: msg.fallback_model,
            requestId: msg.request_id,
            apiRefusalCategory: msg.api_refusal_category ?? null,
            apiRefusalExplanation: msg.api_refusal_explanation ?? null,
            ...(msg.retracted_message_uuids !== void 0 && {
              retractedMessageUuids: msg.retracted_message_uuids,
            }),
            ...(msg.refused_user_message_uuid !== void 0 && {
              refusedUserMessageUuid: msg.refused_user_message_uuid,
            }),
            isMeta: !1,
            uuid: ensureFrameUuid(msg.uuid),
            timestamp: new Date().toISOString(),
          },
        };
      if (msg.subtype === "model_fallback") {
        if (!hasStringContent(msg)) return { type: "ignored" };
        return {
          type: "message",
          message: {
            type: "system",
            subtype: "model_fallback",
            content: Yn(msg.content),
            level: "warning",
            trigger: msg.trigger,
            originalModel: msg.original_model,
            fallbackModel: msg.fallback_model,
            isMeta: !1,
            uuid: ensureFrameUuid(msg.uuid),
            timestamp: new Date().toISOString(),
          },
        };
      }
      if (msg.subtype === "model_consent_fallback") {
        if (!hasStringContent(msg)) return { type: "ignored" };
        return {
          type: "message",
          message: createConsentFallbackMessage({
            ...msg,
            content: Yn(msg.content),
            uuid: ensureFrameUuid(msg.uuid),
          }),
        };
      }
      if (msg.subtype === "informational") {
        if (!hasStringContent(msg)) return { type: "ignored" };
        return {
          type: "message",
          message: {
            type: "system",
            subtype: "informational",
            content: Yn(msg.content),
            level: msg.level,
            isMeta: !1,
            uuid: ensureFrameUuid(msg.uuid),
            timestamp: new Date().toISOString(),
            ...(msg.tool_use_id && { toolUseID: msg.tool_use_id }),
            ...(msg.prevent_continuation && { preventContinuation: msg.prevent_continuation }),
          },
        };
      }
      if (msg.subtype === "tool_host_result") {
        let r = Array.isArray(msg.lines)
            ? msg.lines
                .filter((line) => typeof line === "string")
                .slice(0, 32)
                .map((g) => sanitizeDisplayText(g, { maxCodeUnits: 2100 }))
                .filter((g) => g.trim() !== "")
            : [],
          s = typeof msg.label === "string" ? sanitizeDisplayText(msg.label, { maxCodeUnits: 320 }) : void 0,
          i = msg.unverified === !0 && s !== void 0 && s.trim() !== "";
        if (typeof msg.tool_use_id !== "string" || (r.length === 0 && !i)) return { type: "ignored" };
        let m = ensureFrameUuid(msg.uuid);
        return {
          type: "message",
          message: createAttachmentMessage(
            {
              type: "tool_host_result_lines",
              toolUseID: msg.tool_use_id,
              host: HT(typeof msg.host?.name === "string" ? msg.host.name : ""),
              lines: r,
              ...(s !== void 0 && { label: s }),
              ...(i && { unverified: !0 }),
            },
            { now: () => new Date().toISOString(), uuid: () => m },
          ),
        };
      }
      if (msg.subtype === "permission_denied") return { type: "ignored" };
      if (msg.subtype === "local_command_output") {
        if (!hasStringContent(msg)) return { type: "ignored" };
        let r = ensureFrameUuid(msg.uuid);
        return {
          type: "message",
          message: createAssistantMessage({ content: Yn(msg.content), uuid: () => r }),
        };
      }
      return (
        logForDebugging(`[sdkMessageAdapter] Ignoring system message subtype: ${msg.subtype}`),
        { type: "ignored" }
      );
    case "tool_progress":
      return (logForDebugging("[sdkMessageAdapter] Ignoring tool_progress frame"), { type: "ignored" });
    case "auth_status":
      return (logForDebugging("[sdkMessageAdapter] Ignoring auth_status message"), { type: "ignored" });
    case "tool_use_summary":
      return (logForDebugging("[sdkMessageAdapter] Ignoring tool_use_summary message"), { type: "ignored" });
    case "rate_limit_event":
      return (logForDebugging("[sdkMessageAdapter] Ignoring rate_limit_event message"), { type: "ignored" });
    case "active_goal":
      return { type: "ignored" };
    case "autocompact_state":
      return { type: "ignored" };
    case "env_manager_log": {
      let r = typeof msg.data?.content === "string" ? msg.data.content : null;
      if (r === null)
        return (
          logForDebugging(
            "[sdkMessageAdapter] env_manager_log without data.content \u2014 orchestrator wire change?",
            { level: "warn" },
          ),
          { type: "env_log", message: "" }
        );
      return { type: "env_log", message: tailLines(r, 1)[0] ?? "" };
    }
    case "conversation_reset": {
      let new_conversation_id = msg.new_conversation_id;
      if (typeof new_conversation_id !== "string" || new_conversation_id === "")
        return (
          logForDebugging(
            "[sdkMessageAdapter] Dropping conversation_reset frame without a string new_conversation_id",
            { level: "error" },
          ),
          { type: "ignored" }
        );
      return { type: "conversation_reset", newConversationId: new_conversation_id };
    }
    default:
      return (logForDebugging(`[sdkMessageAdapter] Unknown message type: ${msg.type}`), { type: "ignored" });
  }
}
//@ chunk-0h4e7gnq.js:14624-14668 fingerprint = convertStreamEvent (1)
var convertStreamEvent = (msg) => ({ type: "stream_event", event: msg });
//@ chunk-0h4e7gnq.js:14668-14779 affinity
var inputJsonDeltaEvent = (e) =>
  convertStreamEvent({
    type: "content_block_delta",
    index: e.index,
    delta: { type: "input_json_delta", partial_json: e.json },
  });
//@ chunk-0h4e7gnq.js:14779-14876 affinity
var textDeltaEvent = (e) =>
  convertStreamEvent({
    type: "content_block_delta",
    index: e.index,
    delta: { type: "text_delta", text: e.text },
  });
//@ chunk-0h4e7gnq.js:14876-15003 affinity
var thinkingDeltaEvent = (e) =>
  convertStreamEvent({
    type: "content_block_delta",
    index: e.index,
    delta: { type: "thinking_delta", thinking: e.text, estimated_tokens: null },
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
/**
 * 把 SDK compact_boundary 消息转成本地"Conversation compacted"系统消息。
 */
//@ chunk-0h4e7gnq.js:38969-39244 fingerprint = convertCompactBoundaryMessage (0.876)
function convertCompactBoundaryMessage(msg) {
  return {
    type: "system",
    subtype: "compact_boundary",
    content: "Conversation compacted",
    level: "info",
    compactMetadata: fromSDKCompactMetadata(msg.compact_metadata),
    ...(msg.logical_parent_uuid !== void 0 && { logicalParentUuid: msg.logical_parent_uuid }),
    uuid: msg.uuid,
    timestamp: new Date().toISOString(),
  };
}
/**
 * SDK model_refusal_fallback 事件转为内部 system 消息。
 */
//@ chunk-0h4e7gnq.js:39244-39932 placement
function createRefusalFallbackMessage(e) {
  return {
    type: "system",
    subtype: "model_refusal_fallback",
    content: e.content,
    level: "warning",
    trigger: e.trigger,
    direction: e.direction,
    ...(e.scope !== void 0 && { scope: e.scope }),
    originalModel: e.original_model,
    fallbackModel: e.fallback_model,
    requestId: e.request_id,
    apiRefusalCategory: e.api_refusal_category,
    apiRefusalExplanation: e.api_refusal_explanation,
    ...(e.saw_cyber_refusal && { sawCyberRefusal: !0 }),
    ...(e.retracted_message_uuids !== void 0 && { retractedMessageUuids: e.retracted_message_uuids }),
    ...(e.refused_user_message_uuid !== void 0 && { refusedUserMessageUuid: e.refused_user_message_uuid }),
    ...(e.provisional && { provisional: e.provisional }),
    isMeta: !1,
    uuid: e.uuid,
    timestamp: new Date().toISOString(),
  };
}
/**
 * SDK model_refusal_no_fallback 事件转为内部 system 消息。
 */
//@ chunk-0h4e7gnq.js:39932-40292 placement
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
    isMeta: !1,
    uuid: e.uuid,
    timestamp: new Date().toISOString(),
  };
}
/**
 * SDK model_consent_fallback 事件转为内部 system 消息。
 */
//@ chunk-0h4e7gnq.js:40526-40882 placement
function createConsentFallbackMessage(e) {
  return {
    type: "system",
    subtype: "model_consent_fallback",
    content: e.content,
    level: "warning",
    choice: e.choice,
    originalModel: e.original_model,
    originalModelName: isProbeWrittenValue(e.original_model_name) ? e.original_model_name : void 0,
    fallbackModel: e.fallback_model,
    persistedAsDefault: e.persisted_as_default,
    isMeta: !1,
    uuid: e.uuid,
    timestamp: new Date().toISOString(),
  };
}
//@ chunk-0h4e7gnq.js:46697-46808 placement = createToolUseSummaryMessage (0.751)
function createToolUseSummaryMessage(e) {
  return { type: "tool_use_summary", summary: e.summary, preceding_tool_use_ids: e.precedingToolUseIds };
}
/**
 * 把限额事件转成 SDK 的 rate limit 信息（状态、重置时间、类型、是否用超额）。
 */
//@ chunk-0h4e7gnq.js:46808-46946 placement
function toRateLimitInfo(e) {
  return {
    status: e.status,
    resetsAt: e.resetsAt ?? null,
    rateLimitType: e.rateLimitType ?? null,
    isUsingOverage: e.isUsingOverage ?? !1,
  };
}
//@ chunk-kj4ctmv0.js:447-582 placement
function convertToolProgressMessage(msg) {
  let n = msg.type === "system" && msg.subtype === "informational" ? msg.launchedAgentId : void 0;
  return n !== void 0 && Um(n) !== null ? n : void 0;
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
