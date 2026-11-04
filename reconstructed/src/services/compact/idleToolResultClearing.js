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
function decideIdleClearing(rolloutMode, querySource, toolUseState, idle, thresholds) {
  let { decidedIdles, lastClearedByTrackingKey } = getIdleClearingState();
  let { returnedAtMs, idleStartedAtMs } = idle;
  let sourceCategory = classifyQuerySource(querySource);
  if (sourceCategory === "auxiliary") {
    for (let entry of lastClearedByTrackingKey.values())
      if (entry.returnedAtMs === returnedAtMs && entry.clearedToolUses > 0) return true;
    return false;
  }
  if (rolloutMode === "unknown") return true;
  let shouldClear = isNewIdlePeriod(decidedIdles, idle, thresholds);
  if (shouldClear === undefined) {
    let lastActivityAt =
      sourceCategory === "main" && toolUseState === undefined && !idle.serverClearedBeforeIdle
        ? getPromptCacheSummary(MAIN, returnedAtMs).lastActivityAt
        : null;
    shouldClear =
      lastActivityAt === null ||
      lastActivityAt > returnedAtMs ||
      returnedAtMs - lastActivityAt > thresholds.minIdleSeconds * 1000;
    if (!decidedIdles.delete(idleStartedAtMs) && decidedIdles.size >= MAX_TRACKING_KEYS) {
      let oldestKey = decidedIdles.keys().next().value;
      if (oldestKey !== undefined) decidedIdles.delete(oldestKey);
    }
    decidedIdles.set(idleStartedAtMs, {
      starts: shouldClear,
      returnedAtMs,
    });
    if (shouldClear) {
      logEvent("tengu_tool_result_clearing_after_idle_planned", {
        mode: fromEnum(rolloutMode),
        idle_seconds: idle.idleSeconds,
        clearable_tool_uses: idle.clearableToolUses,
        trigger_tool_uses: idle.triggerToolUses,
        keep_tool_uses: thresholds.keepToolUses,
        rough_tokens_to_clear: idle.roughTokensToClear,
        context_tokens_before_idle: idle.contextTokensBeforeIdle,
        server_cleared_before_idle: idle.serverClearedBeforeIdle,
        query_source_category: fromEnumOpt(sourceCategory),
      });
      if (rolloutMode === "on") logFeatureOk("compact_tool_result_clearing_after_idle");
    }
  }
  return shouldClear;
}
//@ chunk-g54kbxqw.js:156325-156466 placement
function isNewIdlePeriod(decidedIdles, idle, options) {
  let previous = decidedIdles.get(idle.idleStartedAtMs);
  return previous &&
    (previous.starts || idle.returnedAtMs - previous.returnedAtMs <= options.minIdleSeconds * 1000)
    ? previous.starts
    : undefined;
}
//@ chunk-g54kbxqw.js:156466-156541 placement
function supportsContextEditing(model) {
  return (
    getAllModelBetas(model).includes(BETA_CONTEXT_MANAGEMENT) &&
    ![...getRefusedBetasForModel(toProviderWireModelId(model))].includes(BETA_CONTEXT_MANAGEMENT)
  );
}
//@ chunk-g54kbxqw.js:156541-156768 placement
function messagesSince(messages, anchorUuid) {
  let index =
    anchorUuid === undefined ? -1 : messages.findLastIndex((message) => message.uuid === anchorUuid);
  if (index < 0) return dropTrailingUserContent(messages);
  let previous = messages[index];
  for (
    let next = messages[index + 1];
    previous?.type === "assistant" && next?.type === "assistant" && next.message.id === previous.message.id;
    next = messages[index + 1]
  )
    index++;
  return messages.slice(0, index + 1);
}
//@ chunk-g54kbxqw.js:156768-156888 placement
/**
 * 去掉末尾可清理消息中的用户内容消息。
 */
function dropTrailingUserContent(messages) {
  let count = messages.length;
  for (let message = messages[count - 1]; message; message = messages[count - 1]) {
    if (clearableMessageKind(message) !== undefined)
      return isUserContentMessage(message) ? messages.slice(0, count - 1) : messages;
    count--;
  }
  return messages;
}
//@ chunk-g54kbxqw.js:156888-157054 placement
function isUserContentMessage(message) {
  return (
    message.type === "user" &&
    (typeof message.message.content === "string" ||
      (Array.isArray(message.message.content) &&
        !message.message.content.some((block) => block?.type === "tool_result")))
  );
}
//@ chunk-g54kbxqw.js:157054-157176 placement
function idleClearingMode() {
  let { value: mode, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_JIGGLY_BLOSSOM, "off");
  if (source === "fallback") return "unknown";
  return mode === "on" || mode === "shadow" ? mode : "off";
}
//@ chunk-g54kbxqw.js:157176-157342 placement
function hasAppliedContextEdits(message) {
  return (
    message.type === "assistant" &&
    (message.message.context_management?.applied_edits?.some(
      (appliedEdit) => appliedEdit?.type === "clear_tool_uses_20250919" && appliedEdit.cleared_tool_uses > 0,
    ) ??
      false)
  );
}
//@ chunk-g54kbxqw.js:157342-157549 placement
function logIdleClearingFailure(error, reason, code, session) {
  try {
    let { failuresLogged } = getIdleClearingState(session);
    if (failuresLogged.has(code)) return;
    failuresLogged.add(code);
    logError(error);
    if (reason === "bad") logFeatureBad("compact_tool_result_clearing_after_idle", code);
    else logFeatureSad("compact_tool_result_clearing_after_idle", code);
  } catch {}
}
//@ chunk-g54kbxqw.js:157549-157878 placement
function clearableMessageKind(message) {
  switch (message.type) {
    case "assistant":
      if (message.message.model === SYNTHETIC_MODEL || message.isApiErrorMessage) return;
      break;
    case "user":
      if (
        message.isMeta ||
        message.ephemeral ||
        message.isVirtual ||
        message.isVisibleInTranscriptOnly ||
        message.isCompactSummary ||
        message.toolDenialKind === "interrupted"
      )
        return;
      break;
    default:
      return;
  }
  let timestamp = Date.parse(message.timestamp);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
//@ chunk-g54kbxqw.js:157878-158040 placement
function hasClearedMarker(content) {
  if (typeof content === "string") return content.includes(ARTIFACT_CONTENT_AUTHORED_TAG);
  return (
    Array.isArray(content) &&
    content.some(
      (block) =>
        block?.type === "text" &&
        typeof block.text === "string" &&
        block.text.includes(ARTIFACT_CONTENT_AUTHORED_TAG),
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
  let textBytes = 0;
  let tokens = 0;
  let hasMedia = false;
  for (let inner of block)
    if (inner?.type === "text" && typeof inner.text === "string") {
      textBytes += inner.text.length;
      tokens += roughTokenCountEstimation(inner.text);
    } else if (inner?.type === "image" || inner?.type === "document") hasMedia = true;
  return hasMedia || textBytes >= SMALL_RESULT_BYTES ? tokens : undefined;
}
//@ chunk-g54kbxqw.js:158328-158426 placement
function currentMcpClients(context) {
  return context.options.refreshMcpClients?.() ?? context.getMcp?.().clients ?? context.options.mcpClients;
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
