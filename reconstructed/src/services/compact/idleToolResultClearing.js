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
import { getAllModelBetas, BETA_CONTEXT_MANAGEMENT } from "../../utils/betas.js";
import { getRefusedBetasForModel } from "../../bootstrap/state.js";
import { toProviderWireModelId } from "../../utils/model/model.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { SYNTHETIC_MODEL } from "../../constants/messages.js";
import { ARTIFACT_CONTENT_AUTHORED_TAG } from "../../constants/xml.js";
import { roughTokenCountEstimation } from "../tokenEstimation.js";

//@ chunk-g54kbxqw.js:155349-156325 placement
/**
 * 空闲返回后判断是否清除旧工具结果（按空闲开始时间与上次清除记录）。
 */
function decideIdleClearing(rolloutMode, querySource, s, idleReturn, h) {
  let { decidedIdles, lastClearedByTrackingKey } = getIdleClearingState();
  let { returnedAtMs, idleStartedAtMs } = idleReturn;
  let S = classifyQuerySource(querySource);
  if (S === "auxiliary") {
    for (let P of lastClearedByTrackingKey.values())
      if (P.returnedAtMs === returnedAtMs && P.clearedToolUses > 0) return true;
    return false;
  }
  if (rolloutMode === "unknown") return true;
  let w = isNewIdlePeriod(decidedIdles, idleReturn, h);
  if (w === undefined) {
    let lastActivityAt =
      S === "main" && s === undefined && !idleReturn.serverClearedBeforeIdle
        ? getPromptCacheSummary(MAIN, returnedAtMs).lastActivityAt
        : null;
    w =
      lastActivityAt === null ||
      lastActivityAt > returnedAtMs ||
      returnedAtMs - lastActivityAt > h.minIdleSeconds * 1000;
    if (!decidedIdles.delete(idleStartedAtMs) && decidedIdles.size >= MAX_TRACKING_KEYS) {
      let j = decidedIdles.keys().next().value;
      if (j !== undefined) decidedIdles.delete(j);
    }
    decidedIdles.set(idleStartedAtMs, {
      starts: w,
      returnedAtMs,
    });
    if (w) {
      logEvent("tengu_tool_result_clearing_after_idle_planned", {
        mode: fromEnum(rolloutMode),
        idle_seconds: idleReturn.idleSeconds,
        clearable_tool_uses: idleReturn.clearableToolUses,
        trigger_tool_uses: idleReturn.triggerToolUses,
        keep_tool_uses: h.keepToolUses,
        rough_tokens_to_clear: idleReturn.roughTokensToClear,
        context_tokens_before_idle: idleReturn.contextTokensBeforeIdle,
        server_cleared_before_idle: idleReturn.serverClearedBeforeIdle,
        query_source_category: fromEnumOpt(S),
      });
      if (rolloutMode === "on") logFeatureOk("compact_tool_result_clearing_after_idle");
    }
  }
  return w;
}
//@ chunk-g54kbxqw.js:156325-156466 placement
function isNewIdlePeriod(decidedIdles, n, s) {
  let r = decidedIdles.get(n.idleStartedAtMs);
  return r && (r.starts || n.returnedAtMs - r.returnedAtMs <= s.minIdleSeconds * 1000) ? r.starts : undefined;
}
//@ chunk-g54kbxqw.js:156466-156541 placement
function supportsContextEditing(e) {
  return (
    getAllModelBetas(e).includes(BETA_CONTEXT_MANAGEMENT) &&
    ![...getRefusedBetasForModel(toProviderWireModelId(e))].includes(BETA_CONTEXT_MANAGEMENT)
  );
}
//@ chunk-g54kbxqw.js:156541-156768 placement
function messagesSince(messages, n) {
  let s = n === undefined ? -1 : messages.findLastIndex((h) => h.uuid === n);
  if (s < 0) return dropTrailingUserContent(messages);
  let r = messages[s];
  for (
    let h = messages[s + 1];
    r?.type === "assistant" && h?.type === "assistant" && h.message.id === r.message.id;
    h = messages[s + 1]
  )
    s++;
  return messages.slice(0, s + 1);
}
//@ chunk-g54kbxqw.js:156768-156888 placement
/**
 * 去掉末尾可清理消息中的用户内容消息。
 */
function dropTrailingUserContent(e) {
  let n = e.length;
  for (let s = e[n - 1]; s; s = e[n - 1]) {
    if (clearableMessageKind(s) !== undefined) return isUserContentMessage(s) ? e.slice(0, n - 1) : e;
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
  let { value: e, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_JIGGLY_BLOSSOM, "off");
  if (source === "fallback") return "unknown";
  return e === "on" || e === "shadow" ? e : "off";
}
//@ chunk-g54kbxqw.js:157176-157342 placement
function hasAppliedContextEdits(e) {
  return (
    e.type === "assistant" &&
    (e.message.context_management?.applied_edits?.some(
      (appliedEdit) => appliedEdit?.type === "clear_tool_uses_20250919" && appliedEdit.cleared_tool_uses > 0,
    ) ??
      false)
  );
}
//@ chunk-g54kbxqw.js:157342-157549 placement
function logIdleClearingFailure(error, n, s, r) {
  try {
    let { failuresLogged } = getIdleClearingState(r);
    if (failuresLogged.has(s)) return;
    failuresLogged.add(s);
    logError(error);
    if (n === "bad") logFeatureBad("compact_tool_result_clearing_after_idle", s);
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
  let timestamp = Date.parse(e.timestamp);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
//@ chunk-g54kbxqw.js:157878-158040 placement
function hasClearedMarker(content) {
  if (typeof content === "string") return content.includes(ARTIFACT_CONTENT_AUTHORED_TAG);
  return (
    Array.isArray(content) &&
    content.some(
      (n) =>
        n?.type === "text" && typeof n.text === "string" && n.text.includes(ARTIFACT_CONTENT_AUTHORED_TAG),
    )
  );
}
//@ chunk-g54kbxqw.js:158040-158328 placement = isMedia (1)
/**
 * 字符串或文本块总长超过阈值（或含媒体）时返回估算 token，否则 undefined。
 */
function estimateLargeContentTokens(block) {
  if (typeof block === "string")
    return block.length >= SMALL_RESULT_BYTES ? roughTokenCountEstimation(block) : undefined;
  if (!Array.isArray(block)) return;
  let n = 0;
  let s = 0;
  let r = false;
  for (let h of block)
    if (h?.type === "text" && typeof h.text === "string") {
      n += h.text.length;
      s += roughTokenCountEstimation(h.text);
    } else if (h?.type === "image" || h?.type === "document") r = true;
  return r || n >= SMALL_RESULT_BYTES ? s : undefined;
}
//@ chunk-g54kbxqw.js:158328-158426 placement
function currentMcpClients(e) {
  return e.options.refreshMcpClients?.() ?? e.getMcp?.().clients ?? e.options.mcpClients;
}
//@ chunk-g54kbxqw.js:158426-158548 placement = hasAccessToIDEExtensionDiffFeature (1)
function hasAccessToIDEExtensionDiffFeature(mcpClients) {
  if (!mcpClients) return;
  let ideClient = mcpClients.find((client) => client.type === "connected" && client.name === "ide");
  return ideClient?.type === "connected" ? ideClient : undefined;
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
