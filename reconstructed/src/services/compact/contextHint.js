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
import { Ot } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { W7s } from "../api/badRequestClassifier.js";
import { logEvent } from "../analytics/index.js";
import { ye } from "../../utils/startupMarks.js";
import {
  persistToolResult,
  kSr,
  isPersistError,
  PERSISTED_OUTPUT_TAG,
  PERSISTED_OUTPUT_CLOSING_TAG,
} from "../../utils/toolResultStorage.js";
import { formatFileSize } from "../../utils/format.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { Lg } from "../tokenEstimation.js";
import { maybeTimeBasedMicrocompact, selectClearableToolUses, MICROCOMPACT_LIMITS } from "./microCompact.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureOk } from "../analytics/featureTelemetry.js";
import { coo } from "../../utils/betas.js";

//@ chunk-gzv3xh26.js:11970-12017 placement
function isHazelOspreyGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_osprey", !1);
}
//@ chunk-gzv3xh26.js:12017-12029 placement
var A = 75000;
//@ chunk-gzv3xh26.js:12029-12081 placement
function isHazelOspreyFloorGateOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_hazel_osprey_floor", A);
}
//@ chunk-gzv3xh26.js:12081-12152 placement
function p(e) {
  return e instanceof Ot && (e.status === 422 || e.status === 424);
}
/**
 * 无状态码的 invalid_request_error API 错误。
 */
//@ chunk-gzv3xh26.js:12152-12281 placement
function isInvalidRequestWithoutStatus(e) {
  if (!(e instanceof Ot)) return !1;
  if (e.status !== void 0) return !1;
  return e.error?.error?.type === "invalid_request_error";
}
//@ chunk-gzv3xh26.js:12281-12334 placement
function E(e) {
  return e instanceof Ot && e.status === 409;
}
/**
 * 400 错误且提示 anthropic-beta 不被接受。
 */
//@ chunk-gzv3xh26.js:12334-12502 placement
function isUnsupportedBetaError(e) {
  if (!(e instanceof Ot)) return !1;
  if (e.status !== 400) return !1;
  let n = e.message ?? "";
  return (n.includes("Unexpected value") && n.includes("anthropic-beta")) || W7s(n);
}
//@ chunk-gzv3xh26.js:12502-12569 placement
function y(e) {
  if (e instanceof Ot) return e.requestID ?? void 0;
  return;
}
/**
 * 记 tengu_context_hint_reject（压缩前后估算与节省）。
 */
//@ chunk-gzv3xh26.js:12569-12822 placement
function logContextHintReject(e) {
  logEvent("tengu_context_hint_reject", {
    requestId: ye(e.requestId),
    preCompactTokenEstimate: e.preCompactTokenEstimate,
    postCompactTokenEstimate: e.postCompactTokenEstimate,
    tokensSaved: e.tokensSaved,
    mcApplied: e.mcApplied,
    mcTokensSaved: e.mcTokensSaved,
  });
}
//@ chunk-gzv3xh26.js:12822-12903 placement
function l(e, n) {
  logEvent("tengu_context_hint_busy_fallback", { requestId: ye(e), status: n });
}
//@ chunk-gzv3xh26.js:12903-12931 placement
var S = 5,
  _ = new Set(),
  I = new Map();
/**
 * 把工具结果持久化到文件，返回引用文本（可能截断）。
 */
//@ chunk-gzv3xh26.js:12931-13188 placement
async function persistedResultReference(e, n, o) {
  let s = await persistToolResult(e, n, kSr(), o);
  if (isPersistError(s)) return null;
  let d =
    s.truncatedAtBytes === void 0
      ? ""
      : ` (truncated to the first ${formatFileSize(s.truncatedAtBytes)} of the output)`;
  return `${PERSISTED_OUTPUT_TAG}Tool result saved to: ${s.filepath}${d}

Use ${FILE_READ_TOOL_NAME} to view${PERSISTED_OUTPUT_CLOSING_TAG}`;
}
/**
 * 对消息做基于时间的 microcompact，返回结果与前后 token 估算。
 */
//@ chunk-gzv3xh26.js:13188-13580 placement
async function microcompactForHint(e, n, o, s) {
  let d = Lg(e),
    r = await maybeTimeBasedMicrocompact(e, n, {
      keepRecent: S,
      persist: (x, R) => persistedResultReference(x, R, o),
      agentId: s,
    }),
    u = r ? r.messages : e,
    i = Lg(u);
  return (
    logForDebugging(`[CONTEXT_HINT_REJECT] mc=${!!r} tokensSaved=${r?.tokensSaved ?? 0}`),
    {
      messages: u,
      clearedIds: r?.clearedIds ?? _,
      clearedContent: r?.clearedContent ?? I,
      applied: { mcApplied: !!r, mcTokensSaved: r?.tokensSaved ?? 0 },
      preCompactTokenEstimate: d,
      postCompactTokenEstimate: i,
    }
  );
}
/**
 * 服务端拒绝上下文提示时本地做 microcompact 并记录。
 */
//@ chunk-gzv3xh26.js:13580-14034 placement
async function handleContextHintReject(e) {
  let n = await microcompactForHint(e.messages, e.querySource, e.storageV5, e.agentId);
  return (
    logFeatureOk("compact_hint_reject"),
    logContextHintReject({
      requestId: e.requestId,
      preCompactTokenEstimate: n.preCompactTokenEstimate,
      postCompactTokenEstimate: n.postCompactTokenEstimate,
      tokensSaved: n.preCompactTokenEstimate - n.postCompactTokenEstimate,
      mcApplied: n.applied.mcApplied,
      mcTokensSaved: n.applied.mcTokensSaved,
    }),
    { messages: n.messages, clearedIds: n.clearedIds, clearedContent: n.clearedContent }
  );
}
//@ chunk-gzv3xh26.js:14034-14964 placement
function contextHintRequest(e) {
  if (!e.includeFirstPartyBetas) return null;
  if (!e.querySource.startsWith("repl_main_thread")) return null;
  let n = isHazelOspreyGateOn(),
    o = !1,
    s = !1,
    d = !1;
  return {
    active: n,
    buildRequestParams(r) {
      if (((s = !1), !n || o)) return null;
      s = !0;
      let u = selectClearableToolUses(r, S).tokensSaved >= MICROCOMPACT_LIMITS,
        i = isHazelOspreyFloorGateOn();
      return {
        beta: coo,
        body: u ? { context_hint: { enabled: !0, ...(i > 0 && { target_tokens_saved: i }) } } : null,
      };
    },
    async onRequestError(r, u) {
      if (!s || o) return null;
      let i = y(r);
      if (p(r))
        return (
          (o = !0),
          handleContextHintReject({
            messages: u,
            querySource: e.querySource,
            agentId: e.agentId,
            requestId: i,
            storageV5: e.storageV5,
          })
        );
      if (isUnsupportedBetaError(r))
        return ((o = !0), l(i, 400), { messages: u, clearedIds: _, clearedContent: I });
      if (E(r)) return ((o = !0), l(i, 409), null);
      if (e.is529Error(r)) return ((o = !0), l(i, 529), null);
      return null;
    },
    classifyStreamError(r) {
      if (((d = !1), !s || o)) return !1;
      if (!isInvalidRequestWithoutStatus(r)) return !1;
      return ((d = !0), !0);
    },
    async onStreamFallback(r, u) {
      let i = d;
      if (((o = !0), !i)) return null;
      return handleContextHintReject({
        messages: r,
        querySource: e.querySource,
        agentId: e.agentId,
        requestId: u,
        storageV5: e.storageV5,
      });
    },
    strip() {
      o = !0;
    },
  };
}
