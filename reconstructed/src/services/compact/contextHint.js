/**
 * services/compact/contextHint.ts
 *
 * 2.1.316 新增。上下文提示请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-gzv3xh26.js (15)
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
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { roughTokenCountEstimationForMessages } from "../tokenEstimation.js";
import { maybeTimeBasedMicrocompact, selectClearableToolUses, MICROCOMPACT_LIMITS } from "./microCompact.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { BETA_CONTEXT_HINT } from "../../utils/betas.js";

//@ chunk-gzv3xh26.js:11970-12017 placement
function isHazelOspreyGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_osprey", false);
}
//@ chunk-gzv3xh26.js:12017-12029 placement
/**
 * 上下文提示的默认下限 token 数（75000）。
 */
var DEFAULT_CONTEXT_HINT_FLOOR = 75000;
//@ chunk-gzv3xh26.js:12029-12081 placement
function isHazelOspreyFloorGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_osprey_floor", DEFAULT_CONTEXT_HINT_FLOOR);
}
//@ chunk-gzv3xh26.js:12081-12152 placement
/**
 * 是否为会话额度类错误（422/424 的 API 错误）。
 */
function isSessionLimitError(e) {
  return e instanceof APIError && (e.status === 422 || e.status === 424);
}
//@ chunk-gzv3xh26.js:12152-12281 placement
/**
 * 无状态码的 invalid_request_error API 错误。
 */
function isInvalidRequestWithoutStatus(e) {
  if (!(e instanceof APIError)) return false;
  if (e.status !== undefined) return false;
  return e.error?.error?.type === "invalid_request_error";
}
//@ chunk-gzv3xh26.js:12281-12334 placement
/**
 * 是否为冲突错误（409）。
 */
function isConflictError(e) {
  return e instanceof APIError && e.status === 409;
}
//@ chunk-gzv3xh26.js:12334-12502 placement
/**
 * 400 错误且提示 anthropic-beta 不被接受。
 */
function isUnsupportedBetaError(e) {
  if (!(e instanceof APIError)) return false;
  if (e.status !== 400) return false;
  let message = e.message ?? "";
  return (
    (message.includes("Unexpected value") && message.includes("anthropic-beta")) ||
    isBetaHeaderRejection(message)
  );
}
//@ chunk-gzv3xh26.js:12502-12569 placement
/**
 * 从 API 错误里取 request id。
 */
function getRequestIdFromError(e) {
  if (e instanceof APIError) return e.requestID ?? undefined;
  return;
}
//@ chunk-gzv3xh26.js:12569-12822 placement
/**
 * 记 tengu_context_hint_reject（压缩前后估算与节省）。
 */
function logContextHintReject(e) {
  logEvent("tengu_context_hint_reject", {
    requestId: sanitizeMarkName(e.requestId),
    preCompactTokenEstimate: e.preCompactTokenEstimate,
    postCompactTokenEstimate: e.postCompactTokenEstimate,
    tokensSaved: e.tokensSaved,
    mcApplied: e.mcApplied,
    mcTokensSaved: e.mcTokensSaved,
  });
}
//@ chunk-gzv3xh26.js:12822-12903 placement
/**
 * 记录上下文提示遇到忙时回退的埋点。
 */
function logContextHintBusyFallback(requestIdFromError, status) {
  logEvent("tengu_context_hint_busy_fallback", {
    requestId: sanitizeMarkName(requestIdFromError),
    status,
  });
}
//@ chunk-gzv3xh26.js:12903-12931 placement
/**
 * 空的可清理内容映射，作为未清理时的默认值。
 */
var KEEP_RECENT_TOOL_RESULTS = 5;
var _ = new Set();
var EMPTY_CLEARED_CONTENT = new Map();
//@ chunk-gzv3xh26.js:12931-13188 placement
/**
 * 把工具结果持久化到文件，返回引用文本（可能截断）。
 */
async function persistedResultReference(e, n, o) {
  let s = await persistToolResult(e, n, toolResultsDirOrNull(), o);
  if (isPersistError(s)) return null;
  let d =
    s.truncatedAtBytes === undefined
      ? ""
      : ` (truncated to the first ${formatFileSize(s.truncatedAtBytes)} of the output)`;
  return `${PERSISTED_OUTPUT_TAG}Tool result saved to: ${s.filepath}${d}

Use ${FILE_READ_TOOL_NAME} to view${PERSISTED_OUTPUT_CLOSING_TAG}`;
}
//@ chunk-gzv3xh26.js:13188-13580 placement
/**
 * 对消息做基于时间的 microcompact，返回结果与前后 token 估算。
 */
async function microcompactForHint(messages, querySource, storageV5, agentId) {
  let preCompactTokenEstimate = roughTokenCountEstimationForMessages(messages);
  let r = await maybeTimeBasedMicrocompact(messages, querySource, {
    keepRecent: KEEP_RECENT_TOOL_RESULTS,
    persist: (x, R) => persistedResultReference(x, R, storageV5),
    agentId,
  });
  let u = r ? r.messages : messages;
  let postCompactTokenEstimate = roughTokenCountEstimationForMessages(u);
  logForDebugging(`[CONTEXT_HINT_REJECT] mc=${!!r} tokensSaved=${r?.tokensSaved ?? 0}`);
  return {
    messages: u,
    clearedIds: r?.clearedIds ?? _,
    clearedContent: r?.clearedContent ?? EMPTY_CLEARED_CONTENT,
    applied: {
      mcApplied: !!r,
      mcTokensSaved: r?.tokensSaved ?? 0,
    },
    preCompactTokenEstimate,
    postCompactTokenEstimate,
  };
}
//@ chunk-gzv3xh26.js:13580-14034 placement
/**
 * 服务端拒绝上下文提示时本地做 microcompact 并记录。
 */
async function handleContextHintReject(e) {
  let n = await microcompactForHint(e.messages, e.querySource, e.storageV5, e.agentId);
  logFeatureOk("compact_hint_reject");
  logContextHintReject({
    requestId: e.requestId,
    preCompactTokenEstimate: n.preCompactTokenEstimate,
    postCompactTokenEstimate: n.postCompactTokenEstimate,
    tokensSaved: n.preCompactTokenEstimate - n.postCompactTokenEstimate,
    mcApplied: n.applied.mcApplied,
    mcTokensSaved: n.applied.mcTokensSaved,
  });
  return {
    messages: n.messages,
    clearedIds: n.clearedIds,
    clearedContent: n.clearedContent,
  };
}
//@ chunk-gzv3xh26.js:14034-14964 placement
function contextHintRequest(e) {
  if (!e.includeFirstPartyBetas) return null;
  if (!e.querySource.startsWith("repl_main_thread")) return null;
  let n = isHazelOspreyGateOn();
  let o = false;
  let s = false;
  let d = false;
  return {
    active: n,
    buildRequestParams(r) {
      s = false;
      if (!n || o) return null;
      s = true;
      let u = selectClearableToolUses(r, KEEP_RECENT_TOOL_RESULTS).tokensSaved >= MICROCOMPACT_LIMITS;
      let i = isHazelOspreyFloorGateOn();
      return {
        beta: BETA_CONTEXT_HINT,
        body: u
          ? {
              context_hint: {
                enabled: true,
                ...(i > 0 && {
                  target_tokens_saved: i,
                }),
              },
            }
          : null,
      };
    },
    async onRequestError(r, messages) {
      if (!s || o) return null;
      let requestIdFromError = getRequestIdFromError(r);
      if (isSessionLimitError(r)) {
        o = true;
        return handleContextHintReject({
          messages,
          querySource: e.querySource,
          agentId: e.agentId,
          requestId: requestIdFromError,
          storageV5: e.storageV5,
        });
      }
      if (isUnsupportedBetaError(r)) {
        o = true;
        logContextHintBusyFallback(requestIdFromError, 400);
        return {
          messages,
          clearedIds: _,
          clearedContent: EMPTY_CLEARED_CONTENT,
        };
      }
      if (isConflictError(r)) {
        o = true;
        logContextHintBusyFallback(requestIdFromError, 409);
        return null;
      }
      if (e.is529Error(r)) {
        o = true;
        logContextHintBusyFallback(requestIdFromError, 529);
        return null;
      }
      return null;
    },
    classifyStreamError(r) {
      d = false;
      if (!s || o) return false;
      if (!isInvalidRequestWithoutStatus(r)) return false;
      d = true;
      return true;
    },
    async onStreamFallback(messages, requestId) {
      let i = d;
      o = true;
      if (!i) return null;
      return handleContextHintReject({
        messages,
        querySource: e.querySource,
        agentId: e.agentId,
        requestId,
        storageV5: e.storageV5,
      });
    },
    strip() {
      o = true;
    },
  };
}
