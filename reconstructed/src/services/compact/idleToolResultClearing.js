/**
 * services/compact/idleToolResultClearing.ts
 *
 * 2.1.316 新增：空闲后清除旧工具结果的判定与记录
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g54kbxqw.js (14)
 * attribution: placement 14
 */
import {
  getIdleClearingState,
  MAX_TRACKING_KEYS,
  TENGU_JIGGLY_BLOSSOM,
  SMALL_RESULT_BYTES,
} from "./microCompact.js";
import { classifyQuerySource } from "../api/requestHeaders.js";
import { getPromptCacheSummary, MAIN } from "../api/promptCacheBreakDetection.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getAllModelBetas, sle } from "../../utils/betas.js";
import { getRefusedBetasForModel } from "../../bootstrap/state.js";
import { toProviderWireModelId } from "../../utils/model/model.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { Sh } from "../../constants/xml.js";
import { roughTokenCountEstimation } from "../tokenEstimation.js";

/**
 * 空闲返回后判断是否清除旧工具结果（按空闲开始时间与上次清除记录）。
 */
//@ chunk-g54kbxqw.js:155349-156325 placement
function decideIdleClearing(e, n, s, r, h) {
  let { decidedIdles: decidedIdles, lastClearedByTrackingKey: lastClearedByTrackingKey } =
      getIdleClearingState(),
    { returnedAtMs: returnedAtMs, idleStartedAtMs: idleStartedAtMs } = r,
    S = classifyQuerySource(n);
  if (S === "auxiliary") {
    for (let P of lastClearedByTrackingKey.values())
      if (P.returnedAtMs === returnedAtMs && P.clearedToolUses > 0) return !0;
    return !1;
  }
  if (e === "unknown") return !0;
  let w = isNewIdlePeriod(decidedIdles, r, h);
  if (w === void 0) {
    let L =
      S === "main" && s === void 0 && !r.serverClearedBeforeIdle
        ? getPromptCacheSummary(MAIN, returnedAtMs).lastActivityAt
        : null;
    if (
      ((w = L === null || L > returnedAtMs || returnedAtMs - L > h.minIdleSeconds * 1000),
      !decidedIdles.delete(idleStartedAtMs) && decidedIdles.size >= MAX_TRACKING_KEYS)
    ) {
      let j = decidedIdles.keys().next().value;
      if (j !== void 0) decidedIdles.delete(j);
    }
    if ((decidedIdles.set(idleStartedAtMs, { starts: w, returnedAtMs: returnedAtMs }), w)) {
      if (
        (logEvent("tengu_tool_result_clearing_after_idle_planned", {
          mode: fromEnum(e),
          idle_seconds: r.idleSeconds,
          clearable_tool_uses: r.clearableToolUses,
          trigger_tool_uses: r.triggerToolUses,
          keep_tool_uses: h.keepToolUses,
          rough_tokens_to_clear: r.roughTokensToClear,
          context_tokens_before_idle: r.contextTokensBeforeIdle,
          server_cleared_before_idle: r.serverClearedBeforeIdle,
          query_source_category: fromEnumOpt(S),
        }),
        e === "on")
      )
        logFeatureOk("compact_tool_result_clearing_after_idle");
    }
  }
  return w;
}
//@ chunk-g54kbxqw.js:156325-156466 placement
function isNewIdlePeriod(e, n, s) {
  let r = e.get(n.idleStartedAtMs);
  return r && (r.starts || n.returnedAtMs - r.returnedAtMs <= s.minIdleSeconds * 1000) ? r.starts : void 0;
}
//@ chunk-g54kbxqw.js:156466-156541 placement
function supportsContextEditing(e) {
  return (
    getAllModelBetas(e).includes(sle) && ![...getRefusedBetasForModel(toProviderWireModelId(e))].includes(sle)
  );
}
//@ chunk-g54kbxqw.js:156541-156768 placement
function messagesSince(e, n) {
  let s = n === void 0 ? -1 : e.findLastIndex((h) => h.uuid === n);
  if (s < 0) return dropTrailingUserContent(e);
  let r = e[s];
  for (
    let h = e[s + 1];
    r?.type === "assistant" && h?.type === "assistant" && h.message.id === r.message.id;
    h = e[s + 1]
  )
    s++;
  return e.slice(0, s + 1);
}
/**
 * 去掉末尾可清理消息中的用户内容消息。
 */
//@ chunk-g54kbxqw.js:156768-156888 placement
function dropTrailingUserContent(e) {
  let n = e.length;
  for (let s = e[n - 1]; s; s = e[n - 1]) {
    if (clearableMessageKind(s) !== void 0) return isUserContentMessage(s) ? e.slice(0, n - 1) : e;
    n--;
  }
  return e;
}
//@ chunk-g54kbxqw.js:156888-157054 placement
function isUserContentMessage(e) {
  return (
    e.type === "user" &&
    (typeof e.message.content === "string" ||
      (Array.isArray(e.message.content) && !e.message.content.some((n) => n?.type === "tool_result")))
  );
}
//@ chunk-g54kbxqw.js:157054-157176 placement
function idleClearingMode() {
  let { value: e, source: source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(
    TENGU_JIGGLY_BLOSSOM,
    "off",
  );
  if (source === "fallback") return "unknown";
  return e === "on" || e === "shadow" ? e : "off";
}
//@ chunk-g54kbxqw.js:157176-157342 placement
function hasAppliedContextEdits(e) {
  return (
    e.type === "assistant" &&
    (e.message.context_management?.applied_edits?.some(
      (n) => n?.type === "clear_tool_uses_20250919" && n.cleared_tool_uses > 0,
    ) ??
      !1)
  );
}
//@ chunk-g54kbxqw.js:157342-157549 placement
function logIdleClearingFailure(e, n, s, r) {
  try {
    let { failuresLogged: failuresLogged } = getIdleClearingState(r);
    if (failuresLogged.has(s)) return;
    if ((failuresLogged.add(s), logError(e), n === "bad"))
      logFeatureBad("compact_tool_result_clearing_after_idle", s);
    else logFeatureSad("compact_tool_result_clearing_after_idle", s);
  } catch {}
}
//@ chunk-g54kbxqw.js:157549-157878 placement
function clearableMessageKind(e) {
  switch (e.type) {
    case "assistant":
      if (e.message.model === SYNTHETIC_MODEL || e.isApiErrorMessage) return;
      break;
    case "user":
      if (
        e.isMeta ||
        e.ephemeral ||
        e.isVirtual ||
        e.isVisibleInTranscriptOnly ||
        e.isCompactSummary ||
        e.toolDenialKind === "interrupted"
      )
        return;
      break;
    default:
      return;
  }
  let parse = Date.parse(e.timestamp);
  return Number.isFinite(parse) ? parse : void 0;
}
//@ chunk-g54kbxqw.js:157878-158040 placement
function hasClearedMarker(e) {
  if (typeof e === "string") return e.includes(Sh);
  return (
    Array.isArray(e) && e.some((n) => n?.type === "text" && typeof n.text === "string" && n.text.includes(Sh))
  );
}
/**
 * 字符串或文本块总长超过阈值（或含媒体）时返回估算 token，否则 undefined。
 */
//@ chunk-g54kbxqw.js:158040-158328 placement = isMedia (1)
function estimateLargeContentTokens(block) {
  if (typeof block === "string")
    return block.length >= SMALL_RESULT_BYTES ? roughTokenCountEstimation(block) : void 0;
  if (!Array.isArray(block)) return;
  let n = 0,
    s = 0,
    r = !1;
  for (let h of block)
    if (h?.type === "text" && typeof h.text === "string")
      ((n += h.text.length), (s += roughTokenCountEstimation(h.text)));
    else if (h?.type === "image" || h?.type === "document") r = !0;
  return r || n >= SMALL_RESULT_BYTES ? s : void 0;
}
//@ chunk-g54kbxqw.js:158328-158426 placement
function currentMcpClients(e) {
  return e.options.refreshMcpClients?.() ?? e.getMcp?.().clients ?? e.options.mcpClients;
}
//@ chunk-g54kbxqw.js:158426-158548 placement = hasAccessToIDEExtensionDiffFeature (1)
function hasAccessToIDEExtensionDiffFeature(mcpClients) {
  if (!mcpClients) return;
  let found = mcpClients.find((client) => client.type === "connected" && client.name === "ide");
  return found?.type === "connected" ? found : void 0;
}

export {
  currentMcpClients,
  hasAccessToIDEExtensionDiffFeature,
  idleClearingMode,
  hasAppliedContextEdits,
  supportsContextEditing,
  messagesSince,
  decideIdleClearing,
  logIdleClearingFailure,
  isNewIdlePeriod,
  clearableMessageKind,
  isUserContentMessage,
  hasClearedMarker,
  estimateLargeContentTokens,
};
