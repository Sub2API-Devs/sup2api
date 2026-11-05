/**
 * services/compact/idleToolResultClearing.ts
 *
 * 2.1.316 新增：空闲后清除旧工具结果的判定与记录
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-2c3jp4kn.js (2), chunk-5xgkngpb.js (12)
 * attribution: placement 14
 */
import { STREAM_PREFIXES } from "../../utils/messages/untrustedArtifactContent.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import {
  getIdleClearingState,
  MAX_TRACKING_KEYS,
  TENGU_JIGGLY_BLOSSOM,
  SUBAGENT_TEXT_CLEAR_THRESHOLD,
  TEXT_CLEAR_THRESHOLD,
} from "./microCompact.js";
import { classifyQuerySource } from "../api/requestHeaders.js";
import { getPromptCacheSummary, MAIN as MAIN_2 } from "../api/promptCacheBreakDetection.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { getAllModelBetas, BETA_CONTEXT_MANAGEMENT } from "../../utils/betas.js";
import { getRefusedBetasForModel } from "../../bootstrap/state.js";
import { toProviderWireModelId } from "../../utils/model/model.js";
import { getFeatureValueWithSource_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import { logError } from "../../utils/log.js";
import { SYNTHETIC_MODEL } from "../../utils/messages.js";
import { roughTokenCountEstimation } from "../tokenEstimation.js";

//@ chunk-2c3jp4kn.js:6309-6407 placement
function currentMcpClients(context) {
  return context.options.refreshMcpClients?.() ?? context.getMcp?.().clients ?? context.options.mcpClients;
}
//@ chunk-2c3jp4kn.js:6407-6529 placement (2.1.88 match: hasAccessToIDEExtensionDiffFeature, 1)
function hasAccessToIDEExtensionDiffFeature(mcpClients) {
  if (!mcpClients) return;
  let ideClient = mcpClients.find((client) => client.type === "connected" && client.name === "ide");
  return ideClient?.type === "connected" ? ideClient : undefined;
}
//@ chunk-5xgkngpb.js:1590354-1590541 placement
function hasClearedMarker(content) {
  return STREAM_PREFIXES.filter((marker) =>
    typeof content === "string"
      ? content.includes(marker)
      : Array.isArray(content) &&
        content.some(
          (block) =>
            isObjectBlock(block) &&
            block.type === "text" &&
            "text" in block &&
            typeof block.text === "string" &&
            block.text.includes(marker),
        ),
  );
}
//@ chunk-5xgkngpb.js:1600424-1601414 placement
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
        ? getPromptCacheSummary(MAIN_2, returnedAtMs).lastActivityAt
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
//@ chunk-5xgkngpb.js:1601414-1601556 placement
function isNewIdlePeriod(decidedIdles, idle, options) {
  let previous = decidedIdles.get(idle.idleStartedAtMs);
  return previous &&
    (previous.starts || idle.returnedAtMs - previous.returnedAtMs <= options.minIdleSeconds * 1000)
    ? previous.starts
    : undefined;
}
//@ chunk-5xgkngpb.js:1601556-1601632 placement
function supportsContextEditing(model) {
  return (
    getAllModelBetas(model).includes(BETA_CONTEXT_MANAGEMENT) &&
    ![...getRefusedBetasForModel(toProviderWireModelId(model))].includes(BETA_CONTEXT_MANAGEMENT)
  );
}
//@ chunk-5xgkngpb.js:1601632-1601861 placement
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
//@ chunk-5xgkngpb.js:1601861-1601984 placement
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
//@ chunk-5xgkngpb.js:1601984-1602151 placement
function isUserContentMessage(message) {
  return (
    message.type === "user" &&
    (typeof message.message.content === "string" ||
      (Array.isArray(message.message.content) &&
        !message.message.content.some((block) => block?.type === "tool_result")))
  );
}
//@ chunk-5xgkngpb.js:1602151-1602274 placement
function idleClearingMode() {
  let { value: mode, source } = getFeatureValueWithSource_CACHED_MAY_BE_STALE(TENGU_JIGGLY_BLOSSOM, "off");
  if (source === "fallback") return "unknown";
  return mode === "on" || mode === "shadow" ? mode : "off";
}
//@ chunk-5xgkngpb.js:1602274-1602441 placement
function hasAppliedContextEdits(message) {
  return (
    message.type === "assistant" &&
    (message.message.context_management?.applied_edits?.some(
      (appliedEdit) => appliedEdit?.type === "clear_tool_uses_20250919" && appliedEdit.cleared_tool_uses > 0,
    ) ??
      false)
  );
}
//@ chunk-5xgkngpb.js:1602441-1602649 placement
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
//@ chunk-5xgkngpb.js:1602649-1602979 placement
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
//@ chunk-5xgkngpb.js:1602979-1603299 placement (2.1.88 match: isMedia, 1)
/**
 * 字符串或文本块总长超过阈值（或含媒体）时返回估算 token，否则 undefined。
 */
function estimateLargeContentTokens(content, isSubagent) {
  let threshold = isSubagent ? SUBAGENT_TEXT_CLEAR_THRESHOLD : TEXT_CLEAR_THRESHOLD;
  if (typeof content === "string")
    return content.length >= threshold ? roughTokenCountEstimation(content) : undefined;
  if (!Array.isArray(content)) return;
  let textBytes = 0;
  let tokens = 0;
  let hasMedia = false;
  for (let inner of content)
    if (inner?.type === "text" && typeof inner.text === "string") {
      textBytes += inner.text.length;
      tokens += roughTokenCountEstimation(inner.text);
    } else if (isSubagent) return;
    else if (inner?.type === "image" || inner?.type === "document") hasMedia = true;
  return hasMedia || textBytes >= threshold ? tokens : undefined;
}
export {
  currentMcpClients,
  hasAccessToIDEExtensionDiffFeature,
  messagesSince,
  logIdleClearingFailure,
  hasClearedMarker,
  idleClearingMode,
  hasAppliedContextEdits,
  supportsContextEditing,
  decideIdleClearing,
  isNewIdlePeriod,
  clearableMessageKind,
  isUserContentMessage,
  estimateLargeContentTokens,
};
