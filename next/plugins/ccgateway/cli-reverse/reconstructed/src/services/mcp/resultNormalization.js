/**
 * services/mcp/resultNormalization.ts
 *
 * 2.1.316 新增：MCP 结果规范化与回填。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-sywnjtqb.js (8)
 * attribution: placement 7, layout 1
 */
import {
  MAX_CACHEABLE_LIST_ITEMS,
  PROTOCOL_VERSION_META_KEY,
  CACHEABLE_LIST_METHODS,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";
import { logMCPDebug } from "../../utils/log.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { getIsNonInteractiveSession, getLastPersonPrompt } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

//@ chunk-sywnjtqb.js:27386-28104 placement
/**
 * installModernResultBackfill：modern 协议下包装 transport，若 tools/list 等结果缺 resultType/ttlMs/cacheScope，补默认值（complete/0/private）并对每种方法告警一次。
 */
function installModernResultBackfill(transport, name) {
  let pendingMethods = new Map();
  let loggedMethods = new Set();
  let originalSend = transport.send.bind(transport);
  transport.send = (message, requestOptions) => {
    if ("method" in message && "id" in message && hasProtocolVersionMeta(message)) {
      if (pendingMethods.size >= MAX_CACHEABLE_LIST_ITEMS) {
        let oldest = pendingMethods.keys().next();
        if (!oldest.done) pendingMethods.delete(oldest.value);
      }
      pendingMethods.set(String(message.id), message.method);
    }
    return originalSend(message, requestOptions);
  };
  let onmessage = transport.onmessage;
  transport.onmessage = (message, rest) => {
    onmessage?.(message, rest);
    if ("method" in message || !("id" in message) || message.id === undefined) return;
    let method = pendingMethods.get(String(message.id));
    if (method === undefined) return;
    pendingMethods.delete(String(message.id));
    if (!("result" in message)) return;
    let result = message.result;
    if (typeof result !== "object" || result === null || Array.isArray(result)) return;
    let filled = backfillModernResult(method, message.result);
    if (filled.length > 0 && !loggedMethods.has(method)) {
      loggedMethods.add(method);
      logMCPDebug(
        name,
        `${method} result omits required fields although the server negotiated ${MCP_PROTOCOL_NEXT}; filled in ${filled.join(", ")} instead of rejecting it (not logged again for ${method} on this connection)`,
      );
    }
  };
}
//@ chunk-sywnjtqb.js:28104-28212 placement
function hasProtocolVersionMeta(message) {
  let _meta = message.params?._meta;
  return (
    typeof _meta === "object" &&
    _meta !== null &&
    PROTOCOL_VERSION_META_KEY in _meta &&
    typeof _meta[PROTOCOL_VERSION_META_KEY] === "string"
  );
}
//@ chunk-sywnjtqb.js:28212-28496 placement
function backfillModernResult(method, result) {
  let filled = [];
  if (result.resultType === undefined) {
    result.resultType = "complete";
    filled.push('resultType="complete"');
  }
  if (result.resultType === "complete" && CACHEABLE_LIST_METHODS.has(method)) {
    if (result.ttlMs === undefined) {
      result.ttlMs = 0;
      filled.push("ttlMs=0");
    }
    if (result.cacheScope === undefined) {
      result.cacheScope = "private";
      filled.push('cacheScope="private"');
    }
  }
  return filled;
}
//@ chunk-sywnjtqb.js:28496-28510 placement
/**
 * 因提问暂停结果回填的最长时间（230000 毫秒）。
 */
var MAX_QUESTION_PAUSE_MS = 230000;
//@ chunk-sywnjtqb.js:28510-28616 placement
function shouldPauseForQuestions(config, callTimeoutMs) {
  return (
    callTimeoutMs < MAX_QUESTION_PAUSE_MS &&
    !(config.timeout !== undefined && config.timeout >= 1000) &&
    getIsNonInteractiveSession() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_finch", false) === true
  );
}
//@ chunk-sywnjtqb.js:28616-28763 layout
function isProbeAllowed(config) {
  if (!getIsNonInteractiveSession() || (config.timeout ?? 0) > MAX_QUESTION_PAUSE_MS) return 0;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_enchanted_leaf", 0);
  return typeof featureValue_CACHED_MAY_BE_STALE === "number" &&
    Number.isFinite(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE > 0
    ? featureValue_CACHED_MAY_BE_STALE * 1000
    : 0;
}
//@ chunk-sywnjtqb.js:28763-28898 placement
function isAppOnSnugOrbitList() {
  let clientPlatform = getLastPersonPrompt()?.clientPlatform;
  if (clientPlatform === undefined) return false;
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_orbit", []);
  return (
    Array.isArray(featureValue_CACHED_MAY_BE_STALE) &&
    featureValue_CACHED_MAY_BE_STALE.includes(clientPlatform)
  );
}
//@ chunk-sywnjtqb.js:28898-29600 placement
/**
 * 为 MCP 调用安装"提问暂停"：服务器提问期间暂停超时计时（有上限），应用在名单内时跳过，并记录特性状态。
 */
function installQuestionPause(
  watchdog,
  { inFlight, timeoutMs, pauses, questionBoundMs, armTimeout, timedOut },
) {
  let startTime = performance.now();
  let remainingMs = timeoutMs;
  let openQuestions = 0;
  let pausedAt = 0;
  let paused = false;
  let startedAt = false;
  let deadlineMs;
  let rearm = (timeoutMs) => {
    if (inFlight?.has(watchdog)) armTimeout(startTime + timeoutMs - performance.now(), timeoutMs);
  };
  watchdog.questionOpened = () => {
    if (deadlineMs === undefined) {
      deadlineMs = !pauses || isAppOnSnugOrbitList();
      if (pauses && deadlineMs) logFeatureSad("mcp_question_pause", "skipped_app_on_list");
    }
    if (deadlineMs && questionBoundMs === 0) return;
    paused ||= !deadlineMs;
    if (openQuestions++ === 0) {
      pausedAt = performance.now();
      let pauseCount = deadlineMs ? remainingMs : MAX_QUESTION_PAUSE_MS;
      let pausedBoundMs = pausedAt - startTime + questionBoundMs;
      startedAt = questionBoundMs > 0 && pausedBoundMs < pauseCount;
      rearm(startedAt ? pausedBoundMs : pauseCount);
    }
  };
  watchdog.questionClosed = () => {
    if (deadlineMs && questionBoundMs === 0) return;
    if (--openQuestions === 0) {
      if (!deadlineMs)
        remainingMs = Math.min(remainingMs + performance.now() - pausedAt, MAX_QUESTION_PAUSE_MS);
      startedAt = false;
      rearm(remainingMs);
    }
  };
  watchdog.returned = () => {
    if (paused) logFeatureOk("mcp_question_pause");
  };
  timedOut.catch(() => {
    if (startedAt) logFeatureSad("mcp_question_pause", "question_bound_timeout");
    else if (paused)
      logFeatureSad(
        "mcp_question_pause",
        openQuestions > 0 || remainingMs === MAX_QUESTION_PAUSE_MS ? "ceiling_timeout" : "timeout",
      );
  });
}
export { installModernResultBackfill, shouldPauseForQuestions, isProbeAllowed, installQuestionPause };
