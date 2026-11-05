/**
 * services/compact/contextHint.ts
 *
 * 2.1.316 新增。上下文提示请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-f992zm1q.js (15)
 * attribution: placement 15
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isBetaHeaderRejection } from "../api/badRequestClassifier.js";
import { logEvent } from "../analytics/index.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import {
  persistToolResult,
  toolResultsDirOrNull,
  isPersistError,
  PERSISTED_OUTPUT_TAG,
  PERSISTED_OUTPUT_CLOSING_TAG,
} from "../../utils/toolResultStorage.js";
import { formatFileSize } from "../../utils/format.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { roughTokenCountEstimationForMessages } from "../tokenEstimation.js";
import { maybeTimeBasedMicrocompact, selectClearableToolUses, MICROCOMPACT_LIMITS } from "./microCompact.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { BETA_CONTEXT_HINT } from "../../utils/betas.js";

//@ chunk-f992zm1q.js:13113-13160 placement
function isHazelOspreyGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_osprey", false);
}
//@ chunk-f992zm1q.js:13160-13172 placement
/**
 * 上下文提示的默认下限 token 数（75000）。
 */
var DEFAULT_CONTEXT_HINT_FLOOR = 75000;
//@ chunk-f992zm1q.js:13172-13224 placement
function isHazelOspreyFloorGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_osprey_floor", DEFAULT_CONTEXT_HINT_FLOOR);
}
//@ chunk-f992zm1q.js:13224-13295 placement
/**
 * 是否为会话额度类错误（422/424 的 API 错误）。
 */
function isSessionLimitError(error) {
  return error instanceof APIError && (error.status === 422 || error.status === 424);
}
//@ chunk-f992zm1q.js:13295-13424 placement
/**
 * 无状态码的 invalid_request_error API 错误。
 */
function isInvalidRequestWithoutStatus(error) {
  if (!(error instanceof APIError)) return false;
  if (error.status !== undefined) return false;
  return error.error?.error?.type === "invalid_request_error";
}
//@ chunk-f992zm1q.js:13424-13477 placement
/**
 * 是否为冲突错误（409）。
 */
function isConflictError(error) {
  return error instanceof APIError && error.status === 409;
}
//@ chunk-f992zm1q.js:13477-13645 placement
/**
 * 400 错误且提示 anthropic-beta 不被接受。
 */
function isUnsupportedBetaError(error) {
  if (!(error instanceof APIError)) return false;
  if (error.status !== 400) return false;
  let message = error.message ?? "";
  return (
    (message.includes("Unexpected value") && message.includes("anthropic-beta")) ||
    isBetaHeaderRejection(message)
  );
}
//@ chunk-f992zm1q.js:13645-13712 placement
/**
 * 从 API 错误里取 request id。
 */
function getRequestIdFromError(error) {
  if (error instanceof APIError) return error.requestID ?? undefined;
  return;
}
//@ chunk-f992zm1q.js:13712-13965 placement
/**
 * 记 tengu_context_hint_reject（压缩前后估算与节省）。
 */
function logContextHintReject(hint) {
  logEvent("tengu_context_hint_reject", {
    requestId: sanitizeMarkName(hint.requestId),
    preCompactTokenEstimate: hint.preCompactTokenEstimate,
    postCompactTokenEstimate: hint.postCompactTokenEstimate,
    tokensSaved: hint.tokensSaved,
    mcApplied: hint.mcApplied,
    mcTokensSaved: hint.mcTokensSaved,
  });
}
//@ chunk-f992zm1q.js:13965-14046 placement
/**
 * 记录上下文提示遇到忙时回退的埋点。
 */
function logContextHintBusyFallback(requestIdFromError, status) {
  logEvent("tengu_context_hint_busy_fallback", {
    requestId: sanitizeMarkName(requestIdFromError),
    status,
  });
}
//@ chunk-f992zm1q.js:14046-14074 placement
/**
 * 空的可清理内容映射，作为未清理时的默认值。
 */
var KEEP_RECENT_TOOL_RESULTS = 5;
var _ = new Set();
var EMPTY_CLEARED_CONTENT = new Map();
//@ chunk-f992zm1q.js:14074-14331 placement
/**
 * 把工具结果持久化到文件，返回引用文本（可能截断）。
 */
async function persistedResultReference(toolUseId, result, getDir) {
  let persisted = await persistToolResult(toolUseId, result, toolResultsDirOrNull(), getDir);
  if (isPersistError(persisted)) return null;
  let truncationNote =
    persisted.truncatedAtBytes === undefined
      ? ""
      : ` (truncated to the first ${formatFileSize(persisted.truncatedAtBytes)} of the output)`;
  return `${PERSISTED_OUTPUT_TAG}Tool result saved to: ${persisted.filepath}${truncationNote}

Use ${READ} to view${PERSISTED_OUTPUT_CLOSING_TAG}`;
}
//@ chunk-f992zm1q.js:14331-14723 placement
/**
 * 对消息做基于时间的 microcompact，返回结果与前后 token 估算。
 */
async function microcompactForHint(messages, querySource, getDir, agentId) {
  let preCompactTokenEstimate = roughTokenCountEstimationForMessages(messages);
  let compacted = await maybeTimeBasedMicrocompact(messages, querySource, {
    keepRecent: KEEP_RECENT_TOOL_RESULTS,
    persist: (message, index) => persistedResultReference(message, index, getDir),
    agentId,
  });
  let afterMessages = compacted ? compacted.messages : messages;
  let postCompactTokenEstimate = roughTokenCountEstimationForMessages(afterMessages);
  logForDebugging(`[CONTEXT_HINT_REJECT] mc=${!!compacted} tokensSaved=${compacted?.tokensSaved ?? 0}`);
  return {
    messages: afterMessages,
    clearedIds: compacted?.clearedIds ?? _,
    clearedContent: compacted?.clearedContent ?? EMPTY_CLEARED_CONTENT,
    applied: {
      mcApplied: !!compacted,
      mcTokensSaved: compacted?.tokensSaved ?? 0,
    },
    preCompactTokenEstimate,
    postCompactTokenEstimate,
  };
}
//@ chunk-f992zm1q.js:14723-15177 placement
/**
 * 服务端拒绝上下文提示时本地做 microcompact 并记录。
 */
async function handleContextHintReject(hint) {
  let microcompacted = await microcompactForHint(
    hint.messages,
    hint.querySource,
    hint.storageV5,
    hint.agentId,
  );
  logFeatureOk("compact_hint_reject");
  logContextHintReject({
    requestId: hint.requestId,
    preCompactTokenEstimate: microcompacted.preCompactTokenEstimate,
    postCompactTokenEstimate: microcompacted.postCompactTokenEstimate,
    tokensSaved: microcompacted.preCompactTokenEstimate - microcompacted.postCompactTokenEstimate,
    mcApplied: microcompacted.applied.mcApplied,
    mcTokensSaved: microcompacted.applied.mcTokensSaved,
  });
  return {
    messages: microcompacted.messages,
    clearedIds: microcompacted.clearedIds,
    clearedContent: microcompacted.clearedContent,
  };
}
//@ chunk-f992zm1q.js:15177-16107 placement
function contextHintRequest(context) {
  if (!context.includeFirstPartyBetas) return null;
  if (!context.querySource.startsWith("repl_main_thread")) return null;
  let gateOn = isHazelOspreyGateOn();
  let disabled = false;
  let requested = false;
  let streamFallbackSeen = false;
  return {
    active: gateOn,
    buildRequestParams(messages) {
      requested = false;
      if (!gateOn || disabled) return null;
      requested = true;
      let worthHinting =
        selectClearableToolUses(messages, KEEP_RECENT_TOOL_RESULTS).tokensSaved >= MICROCOMPACT_LIMITS;
      let targetTokens = isHazelOspreyFloorGateOn();
      return {
        beta: BETA_CONTEXT_HINT,
        body: worthHinting
          ? {
              context_hint: {
                enabled: true,
                ...(targetTokens > 0 && {
                  target_tokens_saved: targetTokens,
                }),
              },
            }
          : null,
      };
    },
    async onRequestError(error, messages) {
      if (!requested || disabled) return null;
      let requestIdFromError = getRequestIdFromError(error);
      if (isSessionLimitError(error)) {
        disabled = true;
        return handleContextHintReject({
          messages,
          querySource: context.querySource,
          agentId: context.agentId,
          requestId: requestIdFromError,
          storageV5: context.storageV5,
        });
      }
      if (isUnsupportedBetaError(error)) {
        disabled = true;
        logContextHintBusyFallback(requestIdFromError, 400);
        return {
          messages,
          clearedIds: _,
          clearedContent: EMPTY_CLEARED_CONTENT,
        };
      }
      if (isConflictError(error)) {
        disabled = true;
        logContextHintBusyFallback(requestIdFromError, 409);
        return null;
      }
      if (context.is529Error(error)) {
        disabled = true;
        logContextHintBusyFallback(requestIdFromError, 529);
        return null;
      }
      return null;
    },
    classifyStreamError(error) {
      streamFallbackSeen = false;
      if (!requested || disabled) return false;
      if (!isInvalidRequestWithoutStatus(error)) return false;
      streamFallbackSeen = true;
      return true;
    },
    async onStreamFallback(messages, requestId) {
      let fallbackSeen = streamFallbackSeen;
      disabled = true;
      if (!fallbackSeen) return null;
      return handleContextHintReject({
        messages,
        querySource: context.querySource,
        agentId: context.agentId,
        requestId,
        storageV5: context.storageV5,
      });
    },
    strip() {
      disabled = true;
    },
  };
}
export { contextHintRequest };
