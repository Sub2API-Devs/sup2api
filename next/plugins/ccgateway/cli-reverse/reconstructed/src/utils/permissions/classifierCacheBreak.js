/**
 * utils/permissions/classifierCacheBreak.ts
 *
 * 2.1.316 新增：分类器缓存破坏检测
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isDiskless } from "../../bootstrap/state.js";
import { env } from "../env.js";
import { getGitEmail as getGitEmail_2 } from "../../services/analytics/growthbook.js";
import { firstLineOf } from "../stringUtils.js";
import {
  isCacheBreakOutlineEnabled,
  isExcludedModel,
  MIN_CACHE_MISS_TOKENS,
  isCacheReadDrop,
} from "../../services/api/promptCacheBreakDetection.js";
import { streamFallbackWarning } from "../../services/api/streamFallbackWarning.js";
import { bunHashOf } from "../pastedContent.js";
import { jsonStringify } from "../slowOperations.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, fromEnumOpt } from "../../services/analytics/safeMetadata.js";
import { agentTypeForTelemetry } from "../../services/analytics/metadata.js";
import { telemetrySafeModelName } from "../model/telemetryModelName.js";
import { sanitizeMarkName } from "../startupMarks.js";
import { logForDebugging } from "../debug.js";
import { logError } from "../log.js";
import { normalizeCaseForComparison_2 } from "./filesystem.js";
import { getAutoModeTierFromEnv } from "./yoloClassifier.js";

//@ chunk-5xgkngpb.js:2886951-2887028 placement
/**
 * isOutputLimitStop：停止原因是否因输出上限。
 */
function isOutputLimitStop(stopReason) {
  return stopReason === "max_tokens" || stopReason === "model_context_window_exceeded";
}
//@ chunk-5xgkngpb.js:2887028-2887055 placement
var USER_TAG_UNSAFE_RE = /[^a-zA-Z0-9._-]/g;
//@ chunk-5xgkngpb.js:2887055-2887261 placement
/**
 * 取分类器用的用户标识：GITHUB_ACTOR/USER/USERNAME，或 git 邮箱的用户名部分，清洗后截到 64 字符；无盘模式返回 null。
 */
async function getClassifierUserTag() {
  if (isDiskless()) return null;
  let actor = env.GITHUB_ACTOR ?? env.USER ?? env.USERNAME;
  let gitEmail = actor === undefined && !env.CLAUDE_CODE_EVAL_CONFINED ? await getGitEmail_2() : null;
  return (
    (actor ?? (gitEmail ? firstLineOf(gitEmail, "@") : null))?.replace(USER_TAG_UNSAFE_RE, "").slice(0, 64) ||
    null
  );
}
//@ chunk-5xgkngpb.js:2887261-2887717 placement
/**
 * 缓存失效说明的常量：说明长度上限、失效类型、失效区域与请求变化字段的显示标签。
 */
var MAX_CACHE_BREAK_DETAIL = 128;
var CACHE_BREAK_KIND_LABELS = {
  first_write: "first write",
  read_dropped: "less read from the cache",
  rewrote_half: "wrote at least half the prompt",
};
var CACHE_BREAK_REGION_LABELS = {
  system: "the system prompt",
  claude_md: "the CLAUDE.md message",
  transcript: "the end of the transcript",
  action: "the action",
  none: "nothing",
};
var CACHE_BREAK_CHANGE_LABELS = {
  modelChanged: "model",
  systemPromptChanged: "system prompt",
  cacheControlChanged: "cache lifetime",
  betasChanged: "betas",
  extraBodyChanged: "extra body fields",
  thinkingChanged: "thinking",
};
//@ chunk-5xgkngpb.js:2887717-2890891 placement
/**
 * 检测分类器提示缓存被破坏的原因（首次写入、读取丢失、改写一半等）。
 */
function detectClassifierCacheBreak(cacheBreakState, requestOptions, usage, requestId, sentAt) {
  try {
    if (!isCacheBreakOutlineEnabled() || isExcludedModel(requestOptions.model)) return;
    let promptCacheBreak = streamFallbackWarning().promptCacheBreak;
    let classifierLines = promptCacheBreak.classifierLines;
    let joined = [
      cacheBreakState.agentId ?? "",
      cacheBreakState.site,
      cacheBreakState.hostRules === undefined ? "" : bunHashOf(cacheBreakState.hostRules.host),
    ].join("\x00");
    let previous = classifierLines.get(joined);
    let promptCacheRegions = buildPromptCacheRegions(requestOptions, cacheBreakState.leadingMessageCount);
    let systemTexts =
      typeof requestOptions.system === "string"
        ? [requestOptions.system]
        : (requestOptions.system ?? []).map((part) => part.text);
    let current = {
      agentId: cacheBreakState.agentId,
      model: requestOptions.model,
      systemHash: bunHashOf(systemTexts.join("\x00")),
      cacheControls: stableJsonKey(promptCacheRegions.cacheControls),
      betas: stableJsonKey(requestOptions.extraBetas ?? []),
      extraBodyHash: bunHashOf(jsonStringify(requestOptions.extraBodyParams ?? {})),
      thinking: requestOptions.thinking,
      breakpoints: promptCacheRegions.breakpoints,
      cacheReadTokens: usage.cache_read_input_tokens ?? 0,
      sentAt,
      respondedAt: Date.now(),
      requestCount: (previous?.requestCount ?? 0) + 1,
      remoteHost: cacheBreakState.hostRules !== undefined,
    };
    let overlapped = previous !== undefined && sentAt < previous.respondedAt;
    let sentBeforePrevious = previous !== undefined && sentAt < previous.sentAt;
    let comparable = sentBeforePrevious ? undefined : previous;
    let cacheReadTokens = current.cacheReadTokens;
    let cacheCreationInputTokens = usage.cache_creation_input_tokens ?? 0;
    let hasSignificantCacheWrite = cacheCreationInputTokens >= MIN_CACHE_MISS_TOKENS;
    let rewroteAtLeastHalf =
      hasSignificantCacheWrite &&
      cacheCreationInputTokens * 2 >= usage.input_tokens + cacheReadTokens + cacheCreationInputTokens;
    let trigger =
      previous === undefined
        ? hasSignificantCacheWrite
          ? "first_write"
          : undefined
        : isCacheReadDrop(previous.cacheReadTokens, cacheReadTokens)
          ? "read_dropped"
          : rewroteAtLeastHalf
            ? "rewrote_half"
            : undefined;
    if (trigger !== undefined) {
      let keptRegion = comparable
        ? locateCacheBreakRegion(comparable.breakpoints, promptCacheRegions)
        : undefined;
      let changes = comparable && {
        modelChanged: comparable.model !== current.model,
        systemPromptChanged: comparable.systemHash !== current.systemHash,
        cacheControlChanged: comparable.cacheControls !== current.cacheControls,
        betasChanged: comparable.betas !== current.betas,
        extraBodyChanged: comparable.extraBodyHash !== current.extraBodyHash,
        thinkingChanged: comparable.thinking !== current.thinking,
      };
      let msSincePreviousResponse = previous && !overlapped ? sentAt - previous.respondedAt : undefined;
      let compactedBeforeSend =
        comparable &&
        (promptCacheBreak.classifierCompactions.get(cacheBreakState.agentId) ?? []).some(
          (compactionAt) => comparable.sentAt < compactionAt && compactionAt <= sentAt,
        );
      logEvent("tengu_classifier_cache_break", {
        trigger: fromEnum(trigger),
        querySource: agentTypeForTelemetry(requestOptions.querySource),
        classifierSite: fromEnum(cacheBreakState.caller ?? cacheBreakState.site),
        loop: fromEnum(cacheBreakState.agentId === undefined ? "main" : "agent"),
        remoteHostRules: current.remoteHost,
        model: telemetrySafeModelName(requestOptions.model),
        requestId: sanitizeMarkName(requestId),
        callNumber: current.requestCount,
        inputTokens: usage.input_tokens,
        cacheReadTokens,
        cacheCreationTokens: cacheCreationInputTokens,
        prevCacheReadTokens: previous?.cacheReadTokens,
        overlapped: previous && overlapped,
        msSincePrevResponse: msSincePreviousResponse,
        is1hCacheTTL: promptCacheRegions.cacheControls.some((cacheControl) => cacheControl.ttl === "1h"),
        compactionBeforeSend: compactedBeforeSend,
        keptThrough: fromEnumOpt(keptRegion?.region),
        keptThroughBlocksBack: keptRegion?.blocksBack,
        edgesMoved: keptRegion?.edgesMoved,
        ...changes,
      });
      let joined = [
        cacheBreakState.site === "gate" ? "permission check" : cacheBreakState.site,
        cacheBreakState.agentId === undefined ? "main conversation" : "subagent",
        ...(current.remoteHost ? ["remote host"] : []),
      ].join(", ");
      let mapped = Object.entries(changes ?? {})
        .filter(([, value]) => value)
        .map(([key]) => CACHE_BREAK_CHANGE_LABELS[key]);
      let cacheText = `read ${cacheReadTokens} tokens from the cache (previous request ${previous?.cacheReadTokens}), wrote ${cacheCreationInputTokens}`;
      let comparisonText = sentBeforePrevious
        ? "sent before the previous request; not compared, because it was sent before the request it would be compared with"
        : `${overlapped ? "sent before the previous response arrived" : `sent ${msSincePreviousResponse} ms after the previous response`}; matches the previous request through: ${CACHE_BREAK_REGION_LABELS[keptRegion?.region ?? "none"]}; same bytes split into different blocks: ${keptRegion?.edgesMoved ? "yes" : "no"}; changed: ${mapped.join(", ") || "nothing"}; a compaction came before this request: ${compactedBeforeSend ? "yes" : "no"}`;
      logForDebugging(
        `[CLASSIFIER CACHE ${trigger === "read_dropped" ? "BREAK" : "WRITE"}] auto-mode classifier (${joined}), call #${current.requestCount}: ` +
          (previous === undefined
            ? `first tracked request from this conversation and call site, wrote ${cacheCreationInputTokens} tokens to the cache`
            : `${CACHE_BREAK_KIND_LABELS[trigger]}: ${cacheText}; ${comparisonText}`),
      );
    }
    if (previous !== undefined && sentBeforePrevious) {
      previous.requestCount = current.requestCount;
      return;
    }
    classifierLines.delete(joined);
    classifierLines.set(joined, current);
    if (classifierLines.size > MAX_CACHE_BREAK_DETAIL) {
      let found = [...classifierLines].find(([, entry]) => entry.agentId !== undefined || entry.remoteHost);
      if (found) classifierLines.delete(found[0]);
    }
  } catch (error) {
    logError(error);
  }
}
//@ chunk-5xgkngpb.js:2890891-2891826 placement
/**
 * 把请求拆成 system / CLAUDE.md / 转录三个区域的块列表，用于定位提示缓存失效发生在哪个区域。
 */
function buildPromptCacheRegions(requestOptions, leadingMessageCount) {
  let systemBlocks =
    typeof requestOptions.system === "string"
      ? [
          {
            type: "text",
            text: requestOptions.system,
          },
        ]
      : (requestOptions.system ?? []);
  let blocks = [];
  for (let block of systemBlocks)
    blocks.push({
      block,
      region: "system",
      role: undefined,
    });
  for (let [messageIndex, message] of requestOptions.messages.entries()) {
    let contentBlocks =
      typeof message.content === "string"
        ? [
            {
              type: "text",
              text: message.content,
            },
          ]
        : message.content;
    for (let [blockIndex, contentBlock] of contentBlocks.entries())
      blocks.push({
        block: contentBlock,
        region: messageIndex < leadingMessageCount ? "claude_md" : "transcript",
        role: blockIndex === 0 ? message.role : undefined,
      });
  }
  let pieces = [];
  let blockEnds = [];
  let blockIndexByEnd = new Map();
  let breakpoints = [];
  let cacheControls = [];
  let offset = 0;
  for (let [blockIndex, { block, region, role }] of blocks.entries()) {
    let piece = (role ? `\x00${role}\x00` : "") + isBase64ImageBlock_2(block);
    pieces.push(piece);
    offset += piece.length;
    blockEnds.push(offset);
    blockIndexByEnd.set(offset, blockIndex);
    if ("cache_control" in block && block.cache_control) {
      cacheControls.push(block.cache_control);
      breakpoints.push({
        offset,
        region,
      });
    }
  }
  let last = breakpoints.at(-1);
  if (last?.region === "transcript") last.region = "action";
  let outline = {
    text: pieces.join(""),
    blockEnds,
    blockIndexByEnd,
    breakpoints: [],
    cacheControls,
    prefixHashes: new Map(),
  };
  outline.breakpoints = breakpoints.map((breakpoint) => ({
    ...breakpoint,
    hash: getPrefixHash(outline, breakpoint.offset),
    edgesHash: getBlockBoundaryHash(outline, breakpoint.offset),
  }));
  return outline;
}
//@ chunk-5xgkngpb.js:2891826-2892004 placement (2.1.88 match: isBase64ImageBlock, 0.846)
function isBase64ImageBlock_2(block) {
  if (block.type === "text") return block.text;
  let hashSource =
    block.type === "image" && block.source.type === "base64"
      ? block.source.data
      : jsonStringify({
          ...block,
          cache_control: undefined,
        });
  return `\x00${block.type}:${bunHashOf(hashSource)}\x00`;
}
//@ chunk-5xgkngpb.js:2892004-2892121 placement
function getPrefixHash(regions, offset) {
  let cachedHash = regions.prefixHashes.get(offset);
  if (cachedHash === undefined) {
    cachedHash = bunHashOf(regions.text.slice(0, offset));
    regions.prefixHashes.set(offset, cachedHash);
  }
  return cachedHash;
}
//@ chunk-5xgkngpb.js:2892121-2892220 placement
function getBlockBoundaryHash(regions, offset) {
  let blockIndex = regions.blockIndexByEnd.get(offset) ?? -1;
  return bunHashOf(regions.blockEnds.slice(0, blockIndex + 1).join(","));
}
//@ chunk-5xgkngpb.js:2892220-2892673 placement
function locateCacheBreakRegion(breakpoints, regions) {
  let matchingBreakpoint;
  let edgesMoved = false;
  for (let breakpoint of breakpoints) {
    if (
      breakpoint.offset > regions.text.length ||
      getPrefixHash(regions, breakpoint.offset) !== breakpoint.hash
    )
      continue;
    if (
      regions.blockIndexByEnd.has(breakpoint.offset) &&
      getBlockBoundaryHash(regions, breakpoint.offset) === breakpoint.edgesHash
    )
      matchingBreakpoint = breakpoint;
    else edgesMoved = true;
  }
  if (matchingBreakpoint === undefined)
    return {
      region: "none",
      blocksBack: undefined,
      edgesMoved,
    };
  let offset = matchingBreakpoint.offset;
  let found = regions.breakpoints.find((breakpoint) => breakpoint.offset >= offset);
  let blocksFromStart = regions.blockIndexByEnd.get(offset);
  let blocksToNext = found && regions.blockIndexByEnd.get(found.offset);
  return {
    region: matchingBreakpoint.region,
    blocksBack:
      blocksFromStart !== undefined && blocksToNext !== undefined
        ? blocksToNext - blocksFromStart
        : undefined,
    edgesMoved,
  };
}
//@ chunk-5xgkngpb.js:2892673-2892736 placement
function stableJsonKey(cacheControls) {
  return normalizeCaseForComparison_2(cacheControls.map((cacheControl) => jsonStringify(cacheControl)))
    .sort()
    .join("\x00");
}
//@ chunk-5xgkngpb.js:2892736-2892770 placement
/**
 * currentAutoModeTier：当前 auto 模式等级。
 */
function currentAutoModeTier() {
  return getAutoModeTierFromEnv().value;
}
export { currentAutoModeTier, getClassifierUserTag, detectClassifierCacheBreak, isOutputLimitStop };
