/**
 * services/mcp/resultNormalization.ts
 *
 * 2.1.316 新增：MCP 结果规范化与回填。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-8t8n4kdh.js (7)
 * attribution: placement 7
 */
import {
  la,
  PROTOCOL_VERSION_META_KEY,
  CACHEABLE_LIST_METHODS,
} from "../../../vendor/@modelcontextprotocol/client/dist/src-CeKsbNLO.mjs";
import { logMCPDebug } from "../../utils/log.js";
import { MCP_PROTOCOL_NEXT } from "./mcpCallConstants.js";
import { getIsNonInteractiveSession, getLastPersonPrompt } from "../../bootstrap/state.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";

/**
 * installModernResultBackfill：modern 协议下包装 transport，若 tools/list 等结果缺 resultType/ttlMs/cacheScope，补默认值（complete/0/private）并对每种方法告警一次。
 */
//@ chunk-8t8n4kdh.js:25977-26695 placement
function installModernResultBackfill(e, n) {
  let r = new Map(),
    s = new Set(),
    h = e.send.bind(e);
  e.send = (S, w) => {
    if ("method" in S && "id" in S && hasProtocolVersionMeta(S)) {
      if (r.size >= la) {
        let P = r.keys().next();
        if (!P.done) r.delete(P.value);
      }
      r.set(String(S.id), S.method);
    }
    return h(S, w);
  };
  let onmessage = e.onmessage;
  e.onmessage = (S, w) => {
    if ((onmessage?.(S, w), "method" in S || !("id" in S) || S.id === void 0)) return;
    let P = r.get(String(S.id));
    if (P === void 0) return;
    if ((r.delete(String(S.id)), !("result" in S))) return;
    let M = S.result;
    if (typeof M !== "object" || M === null || Array.isArray(M)) return;
    let j = backfillModernResult(P, S.result);
    if (j.length > 0 && !s.has(P))
      (s.add(P),
        logMCPDebug(
          n,
          `${P} result omits required fields although the server negotiated ${MCP_PROTOCOL_NEXT}; filled in ${j.join(", ")} instead of rejecting it (not logged again for ${P} on this connection)`,
        ));
  };
}
//@ chunk-8t8n4kdh.js:26695-26803 placement
function hasProtocolVersionMeta(e) {
  let n = e.params?._meta;
  return (
    typeof n === "object" &&
    n !== null &&
    PROTOCOL_VERSION_META_KEY in n &&
    typeof n[PROTOCOL_VERSION_META_KEY] === "string"
  );
}
//@ chunk-8t8n4kdh.js:26803-27087 placement
function backfillModernResult(e, n) {
  let r = [];
  if (n.resultType === void 0) ((n.resultType = "complete"), r.push('resultType="complete"'));
  if (n.resultType === "complete" && CACHEABLE_LIST_METHODS.has(e)) {
    if (n.ttlMs === void 0) ((n.ttlMs = 0), r.push("ttlMs=0"));
    if (n.cacheScope === void 0) ((n.cacheScope = "private"), r.push('cacheScope="private"'));
  }
  return r;
}
//@ chunk-8t8n4kdh.js:27087-27101 placement
var to = 230000;
//@ chunk-8t8n4kdh.js:27101-27207 placement
function shouldPauseForQuestions(e, n) {
  return (
    n < to &&
    !(e.timeout !== void 0 && e.timeout >= 1000) &&
    getIsNonInteractiveSession() &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_rosy_finch", !1) === !0
  );
}
//@ chunk-8t8n4kdh.js:27207-27342 placement
function isAppOnSnugOrbitList() {
  let e = getLastPersonPrompt()?.clientPlatform;
  if (e === void 0) return !1;
  let n = getFeatureValue_CACHED_MAY_BE_STALE("tengu_snug_orbit", []);
  return Array.isArray(n) && n.includes(e);
}
/**
 * 为 MCP 调用安装"提问暂停"：服务器提问期间暂停超时计时（有上限），应用在名单内时跳过，并记录特性状态。
 */
//@ chunk-8t8n4kdh.js:27342-27861 placement
function installQuestionPause(
  watchdog,
  { inFlight: inFlight, timeoutMs: timeoutMs, armTimeout: armTimeout, timedOut: timedOut },
) {
  let startTime = performance.now(),
    remainingMs = timeoutMs,
    openQuestions = 0,
    pausedAt = 0,
    paused = !1,
    skipped,
    R = (ce) => {
      if (inFlight?.has(watchdog)) armTimeout(startTime + ce - performance.now(), ce);
    };
  ((watchdog.questionOpened = () => {
    if (skipped === void 0) {
      if (((skipped = isAppOnSnugOrbitList()), skipped))
        logFeatureSad("mcp_question_pause", "skipped_app_on_list");
    }
    if (skipped) return;
    if (((paused = !0), openQuestions++ === 0)) ((pausedAt = performance.now()), R(to));
  }),
    (watchdog.questionClosed = () => {
      if (!skipped && --openQuestions === 0)
        ((remainingMs = Math.min(remainingMs + performance.now() - pausedAt, to)), R(remainingMs));
    }),
    (watchdog.returned = () => {
      if (paused) logFeatureOk("mcp_question_pause");
    }),
    timedOut.catch(() => {
      if (paused)
        logFeatureSad(
          "mcp_question_pause",
          openQuestions > 0 || remainingMs === to ? "ceiling_timeout" : "timeout",
        );
    }));
}

export { installModernResultBackfill, shouldPauseForQuestions, installQuestionPause };
