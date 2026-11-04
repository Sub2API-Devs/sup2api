/**
 * services/api/tether.ts
 *
 * 2.1.316 新增：线程续接（tether）：只发增量请求、判断能否续接并记录决策
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (88)
 * attribution: placement 88
 */
import {
  isFoamySpringEnabled,
  isInlineToolsAllowed,
  isInlineToolsEnabled,
} from "../analytics/growthbookGates.js";
import {
  hasContextBeta,
  BETA_MID_CONVERSATION_SYSTEM,
  BETA_MID_CONV_TOOL_CHANGE,
  BETA_INLINE_TOOLS,
} from "../../utils/betas.js";
import { isMidConvSystemForced, notifyPerTurnEffortInactive, isRealApiResponse } from "./claude.js";
import { dropWireShapeSeed, applyWireShapeSeed } from "../../bootstrap/stateSlices.js";
import { strip1mTagWhereBuiltIn, getMainLoopModel } from "../../utils/model/model.js";
import {
  getStickyBetas,
  getSessionId,
  getUnsupportedThreadKeys,
  isThreadsHeldForServerClassifier,
  getClientTruncatedAssistantIds,
  getHeldStatelessReplyIds,
  getRootSession,
  hasRefusalFallbackOccurred,
  hasRefusalFallbackHeaderArmed,
} from "../../bootstrap/state.js";
import { logEvent } from "../analytics/index.js";
import { logError } from "../../utils/log.js";
import { toError } from "../../utils/errors.js";
import { objectSchema, literal, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { streamFallbackWarning, ROOT as ROOT_2, formatZodErrors } from "./streamFallbackWarning.js";
import {
  getTrackingKey,
  getPendingChangeSummary,
  isUncachedSystemBlock,
  computeHash,
  EPHEMERAL_MESSAGE_MARK,
} from "./promptCacheBreakDetection.js";
import { classifyQuerySource, isAutoModeQuerySource } from "./requestHeaders.js";
import { LRUCache } from "../../../vendor/lru-cache/dist/esm/index.min.js";
import { agentTypeForTelemetry } from "../analytics/metadata.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { lit as lit_2, fromEnum, fromEnumOpt } from "../analytics/safeMetadata.js";
import { getFeatureValue_CACHED_MAY_BE_STALE, getClientDataAtis, atisPin } from "../analytics/growthbook.js";
import { logForDebugging } from "../../utils/debug.js";
import { logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { strippedCanonicalName } from "../../utils/model/canonicalModelName.js";
import { strip1mSuffix, stripAnyVersatileSuffix } from "../../utils/model/modelIds.js";
import { ANY_MODEL_KEY, findModelKeyedEntry } from "../../utils/attachments/totalTokensReminder.js";
import {
  thinkingRelayModuleKept,
  isTetherLive,
  keptReminderModeSafe,
  isKeptReminderModeNotOff,
} from "./keptReminder.js";
import {
  isAutoModeClassified,
  isServerArbiterActive,
} from "../../utils/permissions/serverClassifier/arbiter.js";
import { isObjectBlock } from "../../utils/toolResultStorage.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { computeContentHash } from "../../utils/commitAttribution.js";
import { APIError } from "../../../vendor/@anthropic-ai/sdk/core/error.mjs";
import { isPromptTooLongError, isCreditBalanceTooLow, isTetherBetaRejected } from "./errors.js";
import { initFingerprint } from "./dumpPrompts.js";
import { addWithLimit } from "../../utils/cronTasks.js";
import { env } from "../../utils/env.js";
import { takePendingConversationEdits } from "../../utils/shell/shellToolUtils.js";
import { stripSuffixNumber } from "./toolDefinitionShape.js";
import { isTaskId } from "../../tasks/LocalShellTask/backgroundNotices.js";
import { POLL as POLL_2 } from "../../utils/pollEvents.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { isFirstPartyApiBackend } from "../../utils/model/providers.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { sleep } from "../../utils/sleep.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:2584360-2585122 placement
/**
 * 从 transcript 记录的请求形状恢复 beta 锁定：按记录启用/拒绝中途 system 消息、工具变更头与内联工具 beta，并记 tengu_wire_shape_seeded。
 */
function seedWireShapeFromRecord(betas, record, model) {
  if (record === undefined || betas.wireShapeSeed?.record === record || !isFoamySpringEnabled()) return;
  try {
    let { systemTurns, toolChangeHeader, inlineTools } = record;
    let unusedSeed = undefined;
    if (systemTurns === undefined && toolChangeHeader === undefined && inlineTools === undefined) return;
    let hadContextBeta = hasContextBeta(betas);
    let sent = [];
    let rejected = [];
    let inlineAllowed = isInlineToolsAllowed();
    let forcedMidConv = systemTurns === false && isMidConvSystemForced(model);
    if (systemTurns === true) sent.push(BETA_MID_CONVERSATION_SYSTEM);
    else if (systemTurns === false && !forcedMidConv) rejected.push(BETA_MID_CONVERSATION_SYSTEM);
    if (toolChangeHeader === true) {
      sent.push(BETA_MID_CONV_TOOL_CHANGE);
      if (inlineTools === true && inlineAllowed) sent.push(BETA_INLINE_TOOLS);
    } else if (toolChangeHeader === false) rejected.push(BETA_MID_CONV_TOOL_CHANGE);
    if (inlineTools === false) rejected.push(BETA_INLINE_TOOLS);
    dropWireShapeSeed(betas);
    applyWireShapeSeed(betas, {
      record,
      sent,
      rejected,
    });
    if (record.systemTurnsAnsweredBy !== undefined)
      betas.systemMessagesAcceptedBy.add(strip1mTagWhereBuiltIn(record.systemTurnsAnsweredBy));
    if (betas === getStickyBetas()) notifyPerTurnEffortInactive(betas, hadContextBeta);
    logEvent("tengu_wire_shape_seeded", {
      ...(systemTurns !== undefined && {
        systemTurns,
        systemTurnsForced: forcedMidConv,
      }),
      ...(toolChangeHeader !== undefined && {
        toolChangeHeader,
      }),
      ...(inlineTools !== undefined && {
        inlineTools,
        inlineToolsOffered: isInlineToolsEnabled(),
        inlineToolsPermitted: inlineAllowed,
      }),
      ...false,
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2585122-2585168 placement
function thinkingDropSummary(body) {
  let transformations = readInputTransformations(body);
  return transformations && parseThinkingDrops(transformations);
}
//@ chunk-e6aww6q8.js:2585168-2585321 placement
function readInputTransformations(body) {
  return typeof body === "object" &&
    body !== null &&
    "input_transformations" in body &&
    Array.isArray(body.input_transformations)
    ? body.input_transformations
    : undefined;
}
//@ chunk-e6aww6q8.js:2585321-2585782 placement
/**
 * 从服务端警告中解析 thinking_dropped 条目，得到消息/块位置与原因类别。
 */
function parseThinkingDrops(transformations) {
  let schema = objectSchema({
    type: literal("thinking_dropped"),
    path: stringSchema(),
    reason: stringSchema(),
  });
  let drops = [];
  for (let transformation of transformations) {
    let parsed = schema.safeParse(transformation);
    if (!parsed.success) continue;
    let { path, reason } = parsed.data;
    let match = /^messages\.(\d{1,6})\.content\.(\d{1,6})$/.exec(path);
    let pathMatch = match ?? /^messages\.(\d{1,6})(?:\.|$)/.exec(path);
    drops.push({
      messageIndex: pathMatch ? Number(pathMatch[1]) : undefined,
      blockIndex: match ? Number(match[2]) : undefined,
      reason:
        reason === "prefix_binding_mismatch"
          ? "prefix_mismatch"
          : reason === "model_binding_mismatch"
            ? "model_mismatch"
            : "other",
    });
  }
  return drops;
}
//@ chunk-e6aww6q8.js:2585782-2585839 placement
function xxhashBase36(text) {
  return Bun.hash.xxHash64(text).toString(36);
}
//@ chunk-e6aww6q8.js:2585839-2585892 placement
/**
 * 思考块被丢弃原因的严重度顺序（other < model_mismatch < prefix_mismatch），汇总时取最严重者。
 */
var THINKING_DROP_REASON_RANK = {
  other: 0,
  model_mismatch: 1,
  prefix_mismatch: 2,
};
//@ chunk-e6aww6q8.js:2585892-2586534 placement
/**
 * 汇总被丢弃的思考块：去重已报告的块，统计块数、轮数、原因与首末位置。
 */
function summarizeThinkingDrops(drops, blockKeyAt, isMain, seen) {
  let summary;
  let turns = new Set();
  let blockHashes = [];
  let reasonCounts = {};
  let seenKeys = new Set();
  for (let { messageIndex, blockIndex, reason } of drops) {
    if (messageIndex === undefined || blockIndex === undefined) continue;
    let position = {
      messageIndex,
      blockIndex,
    };
    let blockKey = blockKeyAt(position);
    if (blockKey === undefined) continue;
    let hash = xxhashBase36(blockKey);
    let anyKey = `*:${hash}`;
    let key = isMain ? `main:${hash}` : anyKey;
    if (seenKeys.has(key) || seen.get(key)) continue;
    seenKeys.add(key).add(anyKey);
    blockHashes.push(hash);
    turns.add(messageIndex);
    reasonCounts[reason] = (reasonCounts[reason] ?? 0) + 1;
    if (summary === undefined) {
      summary = {
        blockCount: 1,
        turnCount: 1,
        reason,
        first: position,
        last: position,
      };
      continue;
    }
    summary.blockCount++;
    if (THINKING_DROP_REASON_RANK[reason] > THINKING_DROP_REASON_RANK[summary.reason])
      summary.reason = reason;
    if (isBeforeBlock(position, summary.first)) summary.first = position;
    if (isBeforeBlock(summary.last, position)) summary.last = position;
  }
  if (summary === undefined) return;
  summary.turnCount = turns.size;
  summary.reasonCounts = reasonCounts;
  return {
    drops: summary,
    blockHashes,
    seenKeys: [...seenKeys],
  };
}
//@ chunk-e6aww6q8.js:2586534-2587915 placement
/**
 * 记录线程思考块被服务端丢弃的情况。
 */
function reportThinkingDrop({
  body,
  blockKeyAt,
  carriedBlockHashes,
  countThinkingSent,
  querySource,
  agentId,
  model,
  requestId,
  solicited,
  contextCompactedKind,
}) {
  try {
    let transformations = readInputTransformations(body);
    if (transformations === undefined) return;
    let bindingDrops = streamFallbackWarning().bindingDrops;
    let trackingKey = getTrackingKey(querySource, agentId);
    let threadKey = `${getSessionId()}:${trackingKey ?? "*"}`;
    let firstReport = bindingDrops.threadsRead.get(threadKey) !== true;
    let isMain = agentId === undefined && classifyQuerySource(querySource) === "main";
    let carriedHashes = firstReport ? [...carriedBlockHashes()] : [];
    let seen =
      transformations.length > 0 || carriedHashes.length > 0
        ? (bindingDrops.seenBlocks ??= new LRUCache({
            max: 40000,
          }))
        : undefined;
    for (let hash of carriedHashes) {
      if (isMain) seen?.set(`main:${hash}`, true);
      seen?.set(`*:${hash}`, true);
    }
    let summary =
      seen && summarizeThinkingDrops(parseThinkingDrops(transformations), blockKeyAt, isMain, seen);
    let report;
    if (seen && summary) {
      let { drops, blockHashes, seenKeys } = summary;
      let sent = countThinkingSent();
      let pendingChangeSummary = getPendingChangeSummary(querySource, agentId);
      logEvent("tengu_thinking_drop", {
        query_source: agentTypeForTelemetry(querySource),
        model: telemetrySafeModelName(model),
        request_id: sanitizeMarkName(requestId) ?? lit_2("unknown"),
        solicited,
        thinking_blocks_sent: sent.blocksSent,
        thinking_turns_sent: sent.turnsSent,
        dropped_reason: fromEnum(drops.reason),
        newly_dropped_block_count: drops.blockCount,
        newly_dropped_turn_count: drops.turnCount,
        failing_message_index: drops.first.messageIndex,
        failing_block_index: drops.first.blockIndex,
        last_failing_message_index: drops.last.messageIndex,
        last_failing_block_index: drops.last.blockIndex,
        first_report_for_thread_in_process: firstReport,
        client_change_kinds: pendingChangeSummary.kinds,
        first_changed_message_index: pendingChangeSummary.firstChangedMessageIndex,
        client_baseline: pendingChangeSummary.baseline,
        call_number: pendingChangeSummary.callNumber,
        context_compacted: fromEnumOpt(contextCompactedKind),
      });
      for (let seenKey of seenKeys) seen.set(seenKey, true);
      report = {
        drops,
        blockHashes,
        sent,
        firstReport,
        change: pendingChangeSummary,
      };
    }
    bindingDrops.threadsRead.set(threadKey, true);
    return report;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2587915-2588030 placement
function isBeforeBlock(left, right) {
  return (
    left.messageIndex < right.messageIndex ||
    (left.messageIndex === right.messageIndex && left.blockIndex < right.blockIndex)
  );
}
//@ chunk-e6aww6q8.js:2588030-2588056 placement
var MAX_MINTED_ONCE = 256;
var MAX_TETHER_KEYS = 128;
var DEFAULT_MIN_CONTINUES = 3;
//@ chunk-e6aww6q8.js:2588056-2588225 placement
function tetherHealConfig() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_wondrous_acorn", null);
  let minContinues = featureValue_CACHED_MAY_BE_STALE?.min_continues;
  return {
    enabled: featureValue_CACHED_MAY_BE_STALE?.enabled === true,
    minContinues:
      typeof minContinues === "number" && Number.isInteger(minContinues) && minContinues >= 0
        ? minContinues
        : DEFAULT_MIN_CONTINUES,
  };
}
//@ chunk-e6aww6q8.js:2588225-2588261 placement
function isTetherHealEnabled() {
  return tetherHealConfig().enabled;
}
//@ chunk-e6aww6q8.js:2588261-2588306 placement
function threadDropRecreate() {
  return streamFallbackWarning().threadDropRecreate;
}
//@ chunk-e6aww6q8.js:2588306-2588597 placement
function touchThreadHealState(key) {
  let states = threadDropRecreate();
  let state = states.get(key);
  if (state === undefined) {
    if (states.size >= MAX_TETHER_KEYS) {
      for (let key of states.keys())
        if (key !== ROOT_2) {
          states.delete(key);
          break;
        }
    }
    state = {
      mintedOnContinue: new Map(),
      continuesServed: 0,
      createdForDrop: false,
      armed: false,
      heldStateless: false,
      reportUnmatched: false,
      lastDispatchHealed: false,
    };
  } else states.delete(key);
  states.set(key, state);
  return state;
}
//@ chunk-e6aww6q8.js:2588597-2588990 placement
/**
 * 记录线程分派：新建线程时重置状态，续用时累加次数并记下每条消息续用时的序号。
 */
function recordThreadDispatch(threadKey, dispatch) {
  if (!isTetherHealEnabled()) {
    threadDropRecreate().delete(formatZodErrors(threadKey));
    return;
  }
  let state = touchThreadHealState(formatZodErrors(threadKey));
  if (dispatch.thread === "create") {
    state.mintedOnContinue.clear();
    state.armed = false;
    if (dispatch.forDrop) {
      state.createdForDrop = true;
      state.continuesServed = 0;
    }
    return;
  }
  state.continuesServed++;
  if (dispatch.messageId !== undefined) {
    let mintedOnContinue = state.mintedOnContinue;
    if (!mintedOnContinue.has(dispatch.messageId) && mintedOnContinue.size >= MAX_MINTED_ONCE) {
      let oldest = mintedOnContinue.keys().next().value;
      if (oldest !== undefined) mintedOnContinue.delete(oldest);
    }
    mintedOnContinue.set(dispatch.messageId, state.continuesServed);
  }
}
//@ chunk-e6aww6q8.js:2588990-2589096 placement
function resetThreadHealState(agentId) {
  let state = threadDropRecreate().get(formatZodErrors(agentId));
  if (state === undefined) return;
  state.mintedOnContinue.clear();
  state.createdForDrop = false;
}
//@ chunk-e6aww6q8.js:2589096-2589173 placement
function noteLastDispatchHealed(agentId, lastDispatchHealed) {
  let state = threadDropRecreate().get(formatZodErrors(agentId));
  if (state !== undefined) state.lastDispatchHealed = lastDispatchHealed;
}
//@ chunk-e6aww6q8.js:2589173-2589263 placement
function isThreadArmed(agentId) {
  try {
    return threadDropRecreate().get(formatZodErrors(agentId))?.armed === true && isTetherHealEnabled();
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e6aww6q8.js:2589263-2589361 placement
function isThreadHeldStateless(agentId) {
  try {
    return (
      threadDropRecreate().get(formatZodErrors(agentId))?.heldStateless === true && isTetherHealEnabled()
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e6aww6q8.js:2589361-2589556 placement
function takeThreadHealFacts(agentId) {
  let state = threadDropRecreate().get(formatZodErrors(agentId));
  let facts = {
    continuesSinceDropCreate: state?.createdForDrop === true ? state.continuesServed : -1,
    reportUnmatched: state?.reportUnmatched === true,
  };
  if (state !== undefined) state.reportUnmatched = false;
  return facts;
}
//@ chunk-e6aww6q8.js:2589556-2589692 placement
function hasPendingMintedReplies() {
  if (!isTetherHealEnabled()) return false;
  for (let state of threadDropRecreate().values())
    if (!state.heldStateless && !state.armed && state.mintedOnContinue.size > 0) return true;
  return false;
}
//@ chunk-e6aww6q8.js:2589692-2591079 placement
/**
 * 当服务端报告线程前缀不一致时给出警告（重发了旧字节、没发线程前缀等）。
 */
function warnTetherPrefixMismatch(mintedReplies, carrier, sentThreadPrefix) {
  let config = tetherHealConfig();
  if (!config.enabled || mintedReplies.length === 0) return;
  for (let [threadKey, state] of threadDropRecreate()) {
    if (state.heldStateless || state.armed) continue;
    let sorted = mintedReplies
      .filter((reply) => state.mintedOnContinue.has(reply.messageId))
      .sort((a, b) => state.mintedOnContinue.get(a.messageId) - state.mintedOnContinue.get(b.messageId));
    if (sorted.length === 0) continue;
    let exempt = state.lastDispatchHealed && threadKey !== carrier.key;
    let matched = exempt
      ? undefined
      : sorted.find((reply) => sentThreadPrefix(threadKey, reply.messageIndex));
    if (matched === undefined) {
      state.reportUnmatched = true;
      logForDebugging(
        `[tether] thread '${threadKey}': a request (${carrier.querySource}) reported this thread's thinking dropped, but ${exempt ? "this thread's own requests re-send earlier bytes (sent-prefix ledger, enforce mode) that other requests do not" : "did not send this thread's prefix (system, tools, model, thinking or an earlier message differ)"}; ignored`,
      );
      continue;
    }
    let continues = state.mintedOnContinue.get(matched.messageId);
    if (state.createdForDrop && continues < config.minContinues) {
      state.heldStateless = true;
      logFeatureSad("tether_drop_recreate", "held_stateless");
      logForDebugging(
        `[tether] thread '${threadKey}': the server dropped thinking produced on continue #${continues} after the thread was re-created for a drop (reported by ${carrier.querySource}; held because it came before continue #${config.minContinues}); sending without \`thread\` for the rest of this conversation`,
        {
          level: "warn",
        },
      );
      continue;
    }
    state.armed = true;
    logForDebugging(
      `[tether] thread '${threadKey}': the server dropped thinking this thread produced on a continue (prefix mismatch, reported by ${carrier.querySource}); re-creating the thread on its next request`,
    );
  }
}
//@ chunk-e6aww6q8.js:2591079-2591583 placement
/**
 * 线程续接请求返回 prefix_mismatch 的 thinking 丢弃时，找出这些块属于哪条回复，并发出前缀不一致告警。
 */
function checkTetherPrefixMismatch({ body, blockKeyAt, replyHolding, carrier, sentThreadPrefix }) {
  if (!hasPendingMintedReplies()) return;
  let cacheBreaks = thinkingDropSummary(body);
  if (cacheBreaks === undefined) return;
  let earliestByMessage = new Map();
  for (let { reason, messageIndex, blockIndex } of cacheBreaks) {
    if (reason !== "prefix_mismatch" || messageIndex === undefined || blockIndex === undefined) continue;
    let blockKey = blockKeyAt({
      messageIndex,
      blockIndex,
    });
    let holding = blockKey === undefined ? undefined : replyHolding(messageIndex, blockKey);
    if (holding === undefined) continue;
    earliestByMessage.set(
      holding.messageId,
      Math.min(holding.messageIndex, earliestByMessage.get(holding.messageId) ?? holding.messageIndex),
    );
  }
  if (earliestByMessage.size === 0) return;
  warnTetherPrefixMismatch(
    [...earliestByMessage].map(([messageId, messageIndex]) => ({
      messageId,
      messageIndex,
    })),
    carrier,
    sentThreadPrefix,
  );
}
//@ chunk-e6aww6q8.js:2591583-2591618 placement
function clearThreadArmed(agentId) {
  threadDropRecreate().delete(formatZodErrors(agentId));
}
//@ chunk-e6aww6q8.js:2591618-2591647 placement
var MAX_THREAD_TTLS = 128;
var MIN_TTL_SECONDS = 300;
var MAX_TTL_SECONDS = 3600;
//@ chunk-e6aww6q8.js:2591647-2591736 placement
function validTtlSeconds(value) {
  return typeof value === "number" &&
    Number.isInteger(value) &&
    value >= MIN_TTL_SECONDS &&
    value <= MAX_TTL_SECONDS
    ? value
    : undefined;
}
//@ chunk-e6aww6q8.js:2591736-2591928 placement
function threadLifetimeMs(closedTurn) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_jaunty_charm", null);
  let ttlSeconds = validTtlSeconds(featureValue_CACHED_MAY_BE_STALE?.ttl_seconds);
  let ccClosedTurnTtlSeconds = featureValue_CACHED_MAY_BE_STALE?.cc_closed_turn_ttl_seconds ?? undefined;
  let effectiveTtl =
    ccClosedTurnTtlSeconds === undefined ? ttlSeconds : validTtlSeconds(ccClosedTurnTtlSeconds);
  if (ttlSeconds === undefined || effectiveTtl === undefined || effectiveTtl < ttlSeconds) return;
  return (closedTurn ? ttlSeconds : effectiveTtl) * 1000;
}
//@ chunk-e6aww6q8.js:2591928-2591973 placement
function threadRequestEnds() {
  return streamFallbackWarning().threadRequestEnds;
}
//@ chunk-e6aww6q8.js:2591973-2592171 placement
function touchThreadLastUse(agentId, clock) {
  try {
    let ends = threadRequestEnds();
    let key = formatZodErrors(agentId);
    if (!ends.delete(key) && ends.size >= MAX_THREAD_TTLS) {
      for (let key of ends.keys())
        if (key !== ROOT_2) {
          ends.delete(key);
          break;
        }
    }
    ends.set(key, {
      wallMs: clock.now(),
      monotonicMs: clock.monotonicNow(),
    });
  } catch (error) {
    logError(toError(error));
  }
}
//@ chunk-e6aww6q8.js:2592171-2592544 placement
/**
 * 计算线程空闲时长（墙钟与单调时钟取大）、生命周期以及是否已过期。
 */
function threadIdleState(threadKey, closedTurn, clock) {
  try {
    let lifetimeMs = threadLifetimeMs(closedTurn);
    let end = threadRequestEnds().get(formatZodErrors(threadKey));
    if (end === undefined)
      return {
        idleMs: undefined,
        monotonicIdleMs: undefined,
        lifetimeMs,
        expired: false,
      };
    let monotonicIdleMs = clock.monotonicNow() - end.monotonicMs;
    let max = Math.max(clock.now() - end.wallMs, monotonicIdleMs);
    return {
      idleMs: max,
      monotonicIdleMs,
      lifetimeMs,
      expired: lifetimeMs !== undefined && max >= lifetimeMs,
    };
  } catch (error) {
    logError(toError(error));
    return {
      idleMs: undefined,
      monotonicIdleMs: undefined,
      lifetimeMs: undefined,
      expired: false,
    };
  }
}
//@ chunk-e6aww6q8.js:2592544-2592580 placement
function clearThreadRequestEnd(agentId) {
  threadRequestEnds().delete(formatZodErrors(agentId));
}
//@ chunk-e6aww6q8.js:2595772-2595824 placement (2.1.88 match: isSubagentContext, 0.815)
/**
 * 代理类型为 subagent 或未给出上下文。
 */
function isSubagentOrUnknown(agentType, agentContext) {
  return agentType === "subagent" || agentContext === undefined;
}
//@ chunk-e6aww6q8.js:2595824-2595839 placement
var ROOT = "root";
//@ chunk-e6aww6q8.js:2595839-2595877 placement
function markThreadUnsupported(agentId, model) {
  getUnsupportedThreadKeys().add(threadKey(agentId, model));
}
//@ chunk-e6aww6q8.js:2595877-2595922 placement
function isThreadUnsupported(agentId, model) {
  return getUnsupportedThreadKeys().has(threadKey(agentId, model));
}
//@ chunk-e6aww6q8.js:2595922-2595970 placement
function threadKey(agentId, model) {
  return `${agentId ?? ROOT}\x00${strippedCanonicalName(model)}`;
}
//@ chunk-e6aww6q8.js:2595970-2596197 placement
function isStatelessTetherModel(model) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_curious_tower_stateless_models",
    "",
  );
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "string" ||
    featureValue_CACHED_MAY_BE_STALE.trim().length === 0
  )
    return false;
  let keys = {};
  for (let part of featureValue_CACHED_MAY_BE_STALE.split(",")) {
    let key = strip1mSuffix(part.trim());
    if (key !== "" && key !== ANY_MODEL_KEY) keys[key] = true;
  }
  return findModelKeyedEntry(keys, model) !== undefined;
}
//@ chunk-e6aww6q8.js:2596197-2596251 placement
function isLucidAnchorEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_lucid_anchor", false) === true;
}
//@ chunk-e6aww6q8.js:2596251-2596347 placement
function isQuietHeronEnabled() {
  return (
    !streamFallbackWarning().threadInheritedFields.breakerTripped &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_heron", false) === true
  );
}
//@ chunk-e6aww6q8.js:2596347-2596391 placement
function uncachedSystemBlocks(system) {
  return system.filter((block) => isUncachedSystemBlock(block));
}
//@ chunk-e6aww6q8.js:2596391-2596403 placement
var MAX_TOOLS_HASH_ENTRIES = 128;
//@ chunk-e6aww6q8.js:2596403-2596485 placement
function isTeleportCacheActiveRoot(agentId) {
  return agentId === undefined && thinkingRelayModuleKept?.getTeleportCacheState().status === "active";
}
//@ chunk-e6aww6q8.js:2596485-2596529 placement
function isThreadsHeldForClassifier() {
  return isThreadsHeldForServerClassifier() && (isAutoModeClassified() || isServerArbiterActive());
}
//@ chunk-e6aww6q8.js:2596529-2596605 placement
function canTetherThread(agentId, model) {
  return (
    isTetherLive() &&
    !isThreadUnsupported(agentId, model) &&
    !isStatelessTetherModel(model) &&
    !isTeleportCacheActiveRoot(agentId) &&
    !isThreadsHeldForClassifier() &&
    !isThreadHeldStateless(agentId)
  );
}
//@ chunk-e6aww6q8.js:2596605-2596719 placement
function hasServerToolUse(messages) {
  return messages.some(
    (message) =>
      message.type === "assistant" &&
      message.message.content.some((block) => block.type === "server_tool_use"),
  );
}
//@ chunk-e6aww6q8.js:2596719-2596739 placement
var MAX_TRUNCATED_ASSISTANT_IDS = 256;
var MAX_HELD_STATELESS_IDS = 256;
//@ chunk-e6aww6q8.js:2596739-2603522 placement
/**
 * 构造 tether 增量：只把上次之后新增的助手与工具结果消息发给服务端。
 */
function buildTetherDelta({
  engine,
  previousMessageId,
  anchorRewritten,
  messages,
  agentId,
  model,
  modelHeldStateless,
  relayHeldStateless,
  classifierHeldStateless,
  creditRetryStateless,
  dropHeldStateless,
  toolResultClearingHeldStateless = false,
  clock,
}) {
  let messageCount = messages.length;
  let anchorIndex =
    previousMessageId === undefined
      ? -1
      : messages.findLastIndex(
          (message) => message.type === "assistant" && message.message.id === previousMessageId,
        );
  let anchorMessage = anchorIndex >= 0 ? messages[anchorIndex] : undefined;
  let anchorComplete =
    anchorMessage?.type === "assistant" &&
    anchorMessage.message.stop_reason != null &&
    !getClientTruncatedAssistantIds().has(anchorMessage.message.id) &&
    !getHeldStatelessReplyIds().has(anchorMessage.message.id);
  let closedTurn =
    anchorMessage?.type === "assistant" &&
    anchorMessage.message.content.some((block) => block.type === "tool_use");
  let idleState = threadIdleState(agentId, closedTurn, clock);
  let forcedCreateReason = engine === null ? "no_engine_result" : null;
  let plan = null;
  let firstThreadError = null;
  let replayed = false;
  let droppedThreadType = null;
  let threadUnsupported = isThreadUnsupported(agentId, model);
  let hasServerToolHistory = hasServerToolUse(messages);
  let any = messages.some(
    (message) =>
      message.type === "user" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (block) =>
          block.type === "tool_result" &&
          Array.isArray(block.content) &&
          block.content.some((block) => isObjectBlock(block) && block.type === "search_result"),
      ),
  );
  let requestScopedStateless = false;
  let keptReminderClearAt = false;
  let hasToolAdditions = false;
  let hasToolRemovals = false;
  let hasToolChanges = false;
  let dropArmed = false;
  let settled = false;
  let storedToolsHash;
  let omittedSystem = false;
  let omittedTools = false;
  let omittedBytes = 0;
  let inheritBreakerTripped = false;
  let toolsHashCache;
  let systemBytesCache;
  let toolsHashOf = (tools) => {
    if (toolsHashCache === undefined || toolsHashCache.ref !== tools) {
      let json = jsonStringify(tools);
      toolsHashCache = {
        ref: tools,
        json,
        hash: computeContentHash(json),
      };
    }
    return toolsHashCache;
  };
  let systemBytesOf = (system) => {
    if (systemBytesCache?.ref !== system)
      systemBytesCache = {
        ref: system,
        bytes: jsonStringify(system.filter((block) => !isUncachedSystemBlock(block))).length,
      };
    return systemBytesCache.bytes;
  };
  function buildPlan(messagesForSend, isRetry = false) {
    keptReminderClearAt = false;
    dropArmed = false;
    hasToolAdditions = messagesForSend.some(
      (message) => message.type === "api_system" && (message.toolAdditions?.length ?? 0) > 0,
    );
    hasToolRemovals = messagesForSend.some(
      (message) => message.type === "api_system" && (message.toolRemovals?.length ?? 0) > 0,
    );
    hasToolChanges = (hasToolAdditions || hasToolRemovals) && !isLucidAnchorEnabled();
    if (
      threadUnsupported ||
      modelHeldStateless ||
      relayHeldStateless ||
      classifierHeldStateless ||
      creditRetryStateless ||
      dropHeldStateless ||
      toolResultClearingHeldStateless ||
      droppedThreadType !== null ||
      hasServerToolHistory ||
      any ||
      hasToolChanges
    ) {
      plan = null;
      return null;
    }
    if (
      messagesForSend.some(
        (message) =>
          (message.type === "user" && message.ephemeral) ||
          (!isRetry &&
            message.type === "api_system" &&
            (message.ephemeral || message.ephemeralSuffix !== undefined)),
      )
    ) {
      plan = null;
      requestScopedStateless = true;
      return null;
    }
    dropArmed = isThreadArmed(agentId);
    let decision;
    if (forcedCreateReason !== null || engine === null)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: forcedCreateReason ?? "no_engine_result",
      };
    else if (engine.decision !== "continue")
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: engine.reason,
      };
    else if (previousMessageId === undefined || anchorIndex < 0)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_missing",
      };
    else if (anchorIndex + 1 >= messageCount)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_is_tail",
      };
    else if (!anchorComplete)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_incomplete",
      };
    else if (anchorRewritten)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_rewritten",
      };
    else if (messagesForSend !== messages || messagesForSend.length !== messageCount)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "transcript_drift",
      };
    else if (dropArmed)
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "thread_minted_drop",
      };
    else if (idleState.expired) {
      if (plan?.reason !== "thread_presumed_expired")
        logForDebugging(
          `[tether] thread idle for ${Math.round((idleState.idleMs ?? 0) / 1000)} s, at or past its ${(idleState.lifetimeMs ?? 0) / 1000} s lifetime on the server: sending a create, not a continue`,
        );
      decision = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "thread_presumed_expired",
      };
    } else
      decision = {
        thread: {
          type: "continue",
          previous_message_id: previousMessageId,
        },
        sliceFrom: anchorIndex + 1,
        reason: engine.reason,
      };
    plan = decision;
    let last = messagesForSend.at(-1);
    keptReminderClearAt =
      isRetry &&
      last?.type === "api_system" &&
      (last.ephemeral === true || last.ephemeralSuffix !== undefined);
    return decision;
  }
  function shapeInheritedFields(decision, body) {
    omittedSystem = false;
    omittedTools = false;
    omittedBytes = 0;
    storedToolsHash = undefined;
    try {
      if (decision === null)
        return {
          system: body.system,
          tools: body.tools,
        };
      if (!isQuietHeronEnabled()) {
        forgetThreadToolsHash(agentId);
        return {
          system: body.system,
          tools: body.tools,
        };
      }
      let { json, hash } = toolsHashOf(body.tools);
      if (decision.thread.type !== "continue") {
        storedToolsHash = hash;
        return {
          system: body.system,
          tools: body.tools,
        };
      }
      let uncached = uncachedSystemBlocks(body.system);
      let system = uncached.length > 0 && uncached.length < body.system.length ? uncached : body.system;
      if (system !== body.system) {
        omittedSystem = true;
        omittedBytes += systemBytesOf(body.system);
      }
      if (
        streamFallbackWarning().threadInheritedFields.storedToolsHashByThread.get(
          formatZodErrors(agentId),
        ) === hash
      ) {
        omittedTools = true;
        omittedBytes += json.length;
        return {
          system,
          tools: undefined,
        };
      }
      storedToolsHash = hash;
      return {
        system,
        tools: body.tools,
      };
    } catch (error) {
      logError(error);
      omittedSystem = false;
      omittedTools = false;
      omittedBytes = 0;
      storedToolsHash = undefined;
      forgetThreadToolsHash(agentId);
      return {
        system: body.system,
        tools: body.tools,
      };
    }
  }
  function forceCreate(reason) {
    if (forcedCreateReason === null) {
      forcedCreateReason = reason;
      logForDebugging(`[tether] forcing create for retry: ${reason}`);
    }
  }
  function resolveRetry(error) {
    try {
      let errorClass = classifyThreadError(error);
      if (errorClass !== null && firstThreadError === null) firstThreadError = errorClass;
      if (
        errorClass === "unsupported_request" ||
        (errorClass === "other_thread_400" && plan?.thread.type === "create")
      ) {
        if (droppedThreadType !== null || plan === null) return;
        droppedThreadType = plan.thread.type;
        markThreadUnsupported(agentId, model);
        logForDebugging(
          `[tether] ${errorClass}: resending this turn stateless; this thread stays stateless on this model for the session`,
          {
            level: "warn",
          },
        );
        return "retry:tether-stateless";
      }
      if (plan?.thread.type !== "continue") return;
      if (!(error instanceof APIError)) return;
      if (error.status !== 400 && error.status !== 404) return;
      if (error.status === 404 && errorClass !== "not_found") return;
      if (errorClass === null && (isPromptTooLongError(error) || isCreditBalanceTooLow(error))) return;
      switch (errorClass) {
        case "not_found":
          replayed = true;
          forceCreate("replay_not_found");
          return "retry:tether-replay";
        case "fingerprint_mismatch":
          replayed = true;
          if (
            initFingerprint(error, {
              system: omittedSystem,
              tools: omittedTools,
            })
          )
            tripInheritBreaker();
          forceCreate("replay_fingerprint");
          return "retry:tether-replay";
        case "already_continued":
        case "other_thread_400":
        case null:
          replayed = true;
          forceCreate("replay_other_400");
          return "retry:tether-replay";
      }
    } catch (error) {
      logError(error);
      return;
    }
  }
  function dropForUnrecognised400() {
    try {
      if (droppedThreadType !== null || plan === null) return;
      droppedThreadType = plan.thread.type;
      firstThreadError ??= "unrecognised_400";
      logForDebugging(
        `[tether] unrecognised HTTP 400 on a ${droppedThreadType} that carried the message-threads header: resending this turn stateless without the header`,
        {
          level: "warn",
        },
      );
      return "retry:tether-stateless";
    } catch (error) {
      logError(error);
      return;
    }
  }
  function noteClientTruncated(messageId) {
    addWithLimitLogged(getClientTruncatedAssistantIds(), MAX_TRUNCATED_ASSISTANT_IDS, messageId);
  }
  function settle(outcome, requestId, messageId) {
    if (settled) return;
    settled = true;
    if (
      requestScopedStateless ||
      modelHeldStateless ||
      relayHeldStateless ||
      classifierHeldStateless ||
      creditRetryStateless ||
      dropHeldStateless ||
      toolResultClearingHeldStateless ||
      any ||
      hasToolChanges ||
      droppedThreadType !== null
    )
      addWithLimitLogged(getHeldStatelessReplyIds(), MAX_HELD_STATELESS_IDS, messageId);
    if (plan !== null) touchThreadLastUse(agentId, clock);
    if (outcome.kind === "ok" && plan !== null)
      try {
        let forDrop = plan.thread.type === "create" && plan.reason === "thread_minted_drop";
        recordThreadDispatch(
          agentId,
          plan.thread.type === "continue"
            ? {
                thread: "continue",
                messageId,
              }
            : {
                thread: "create",
                forDrop,
              },
        );
        if (forDrop) logFeatureOk("tether_drop_recreate");
      } catch (error) {
        logError(toError(error));
      }
    if (outcome.kind === "ok" && plan !== null && storedToolsHash !== undefined)
      storeThreadToolsHash(agentId, storedToolsHash);
    try {
      let finalOutcome =
        outcome.kind === "error" ? (classifyThreadError(outcome.error) ?? "error_non_thread") : outcome.kind;
      let healFacts = takeThreadHealFacts(agentId);
      logEvent("tengu_tether_live_outcome", {
        requestId: sanitizeMarkName(requestId),
        sentThreadType: fromEnum(plan?.thread.type ?? "none"),
        sourceCategory: fromEnum(engine?.sourceCategory ?? "none"),
        planReason: fromEnum(plan?.reason ?? "none"),
        engineDecision: fromEnum(engine?.decision ?? "none"),
        engineReason: fromEnum(engine?.reason ?? "none"),
        firstThreadError: fromEnum(firstThreadError ?? "none"),
        finalOutcome: fromEnum(finalOutcome),
        replayed,
        droppedFrom: fromEnum(droppedThreadType ?? "none"),
        threadUnsupported,
        modelHeldStateless,
        relayHeldStateless,
        classifierHeldStateless,
        creditRetryStateless,
        toolResultClearingHeldStateless,
        serverToolHistory: hasServerToolHistory,
        searchResultHistory: any,
        toolAdditionHistory: hasToolAdditions,
        toolRemovalHistory: hasToolRemovals,
        toolChangeHistory: hasToolChanges,
        requestScopedStateless,
        keptReminderClearAt,
        keptReminderScope: fromEnum(keptReminderModeSafe(model)),
        deltaMessageCount: anchorIndex >= 0 ? messageCount - anchorIndex - 1 : 0,
        messageCount,
        turnsInThread: engine?.turnsInThread ?? 0,
        omittedSystem,
        omittedTools,
        omittedBytes,
        inheritBreakerTripped,
        dropArmed,
        dropHeldStateless,
        continuesSinceDropCreate: healFacts.continuesSinceDropCreate,
        dropReportUnmatched: healFacts.reportUnmatched,
        threadIdleMs: Math.round(idleState.idleMs ?? -1),
        threadIdleMonotonicMs: Math.round(idleState.monotonicIdleMs ?? -1),
        threadLifetimeMs: idleState.lifetimeMs ?? -1,
        anchorHasToolCall: closedTurn,
      });
    } catch (error) {
      logError(error);
    }
  }
  function tripInheritBreaker() {
    let threadInheritedFields = streamFallbackWarning().threadInheritedFields;
    if (threadInheritedFields.breakerTripped) return;
    threadInheritedFields.breakerTripped = true;
    inheritBreakerTripped = true;
    logForDebugging(
      "[tether] a continue that left system/tools to the thread was refused (fingerprint); sending full fields for the rest of the session",
      {
        level: "warn",
      },
    );
    logFeatureSad("tether_inherited_fields", "fingerprint_mismatch");
  }
  return {
    plan: buildPlan,
    shapeInheritedFields,
    forceCreate,
    resolveRetry,
    dropForUnrecognised400,
    noteClientTruncated,
    settle,
  };
}
//@ chunk-e6aww6q8.js:2603807-2603888 placement
function forgetThreadToolsHash(agentId) {
  streamFallbackWarning().threadInheritedFields.storedToolsHashByThread.delete(formatZodErrors(agentId));
}
//@ chunk-e6aww6q8.js:2603888-2604064 placement
function storeThreadToolsHash(agentId, hash) {
  let storedToolsHashByThread = streamFallbackWarning().threadInheritedFields.storedToolsHashByThread;
  let key = formatZodErrors(agentId);
  storedToolsHashByThread.delete(key);
  if (storedToolsHashByThread.size >= MAX_TOOLS_HASH_ENTRIES) {
    let oldest = storedToolsHashByThread.keys().next().value;
    if (oldest !== undefined) storedToolsHashByThread.delete(oldest);
  }
  storedToolsHashByThread.set(key, hash);
}
//@ chunk-e6aww6q8.js:2604064-2604135 placement
function addWithLimitLogged(collection, limit, value) {
  if (value === undefined) return;
  try {
    addWithLimit(collection, value, limit);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2604135-2604788 placement
/**
 * 把线程续接接口的错误（线程不存在、请求不支持、指纹不一致）归类。
 */
function classifyThreadError(error) {
  if (!(error instanceof APIError)) return null;
  let message = error.message ?? "";
  if (error.status === 404)
    return message.includes("thread_not_found") || readErrorCode(error) === "thread_not_found"
      ? "not_found"
      : null;
  if (error.status !== 400) return null;
  let errorCode = readErrorCode(error);
  if (errorCode === "thread_unsupported_request" || isTetherBetaRejected(error)) return "unsupported_request";
  if (errorCode === "thread_fingerprint_mismatch" || message.includes("differing field"))
    return "fingerprint_mismatch";
  if (errorCode === "thread_already_continued" || message.includes("already been continued"))
    return "already_continued";
  if (
    /(?<!diagnostics\.)previous_message_id/.test(message) ||
    /\bthread\b.{0,3}(param|field|request|type|:)/i.test(message) ||
    errorCode?.startsWith("thread_")
  )
    return "other_thread_400";
  return null;
}
//@ chunk-e6aww6q8.js:2604788-2605055 placement
function readErrorCode(error) {
  let error_2 = error.error;
  if (typeof error_2 !== "object" || error_2 === null) return;
  let inner = "error" in error_2 ? error_2.error : error_2;
  if (typeof inner !== "object" || inner === null || !("details" in inner)) return;
  let details = inner.details;
  if (typeof details !== "object" || details === null) return;
  let errorCode = details.error_code;
  return typeof errorCode === "string" ? errorCode : undefined;
}
//@ chunk-e6aww6q8.js:2605055-2605160 placement
var THREAD_INHERITED_FIELDS = [
  "model",
  "system",
  "tools",
  "betas",
  "latchedHeaders",
  "thinking",
  "toolChoice",
  "effort",
  "extraBody",
];
//@ chunk-e6aww6q8.js:2605160-2605274 placement
/**
 * 判断能否不发送临时提醒：子代理或未知来源、模型条件满足、未模拟代理。
 */
function canUseNoTransientReminders(querySource, threadId, model, usesToolResultClearing = false) {
  let agentType = threadSourceKind(querySource);
  return (
    agentType !== null &&
    !usesToolResultClearing &&
    canTetherThread(threadId, model) &&
    isSubagentOrUnknown(agentType, threadId) &&
    !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE
  );
}
//@ chunk-e6aww6q8.js:2605274-2605410 placement
/**
 * 决定提醒的投递方式：保留（kept）、不发（none）或临时（transient）。
 */
function reminderDeliveryMode(
  querySource,
  betas,
  model,
  ttlModel = model,
  usesToolResultClearing = false,
  recorded,
) {
  if (
    !isAutoModeQuerySource(querySource) &&
    isKeptReminderModeNotOff(
      ttlModel,
      classifyQuerySource(querySource) === "main"
        ? {
            recorded,
          }
        : undefined,
    )
  )
    return "kept";
  return canUseNoTransientReminders(querySource, betas, model, usesToolResultClearing) ? "none" : "transient";
}
//@ chunk-e6aww6q8.js:2605410-2605510 placement
function threadSourceKind(querySource) {
  if (querySource === "hook_agent") return null;
  let category = classifyQuerySource(querySource);
  return category === "main" || category === "subagent" ? category : null;
}
//@ chunk-e6aww6q8.js:2605510-2605522 placement
var MAX_TRACKED_IDS = 128;
//@ chunk-e6aww6q8.js:2605522-2605675 placement
function threadPrefixHashes(request) {
  return {
    model: computeHash(request.model),
    system: computeHash(
      request.system.filter((block) => !isUncachedSystemBlock(block)).map((block) => block.text),
    ),
    tools: computeHash(request.toolSchemas),
    thinking: computeHash(request.thinkingConfig),
  };
}
//@ chunk-e6aww6q8.js:2605675-2607563 placement
/**
 * 决定本次请求能否作为线程续接（tether）发送：首个请求、无续接指针、配置变化、历史被改写都不能续接。
 */
function decideTetherContinuation() {
  let trackers = new Map();
  function evaluate(input) {
    let category = threadSourceKind(input.querySource);
    if (category === null) return null;
    let key = formatZodErrors(input.agentId);
    let claimedEdits = category === "main" ? takePendingConversationEdits() : [];
    let prefixHashes = threadPrefixHashes(input);
    let configHashes = {
      model: prefixHashes.model,
      system: computeHash([
        prefixHashes.system,
        input.system
          .filter((block) => !isUncachedSystemBlock(block))
          .map((block) => block.cache_control ?? null),
      ]),
      tools: prefixHashes.tools,
      thinking: prefixHashes.thinking,
      betas: computeHash([...input.betas].sort()),
      latchedHeaders: computeHash(input.latchedHeaders),
      toolChoice: computeHash(input.toolChoice ?? null),
      effort: computeHash(input.effortValue ?? null),
      extraBody: computeHash(input.extraBodyParams ?? null),
    };
    let messageHashes = input.getMessageHashes();
    let prev = trackers.get(key);
    let prevCount = prev?.messageHashes.length ?? 0;
    let changedFields = prev
      ? THREAD_INHERITED_FIELDS.filter((field) => configHashes[field] !== prev.configHashes[field])
      : [];
    let reason;
    let firstChangedIndex = -1;
    if (!prev) reason = "first_request";
    else if (input.previousMessageId === undefined) reason = "no_continue_pointer";
    else if (changedFields.length > 0) reason = "config_changed";
    else {
      firstChangedIndex = prev.messageHashes.findIndex(
        (messageHash, index) =>
          messageHash !== EPHEMERAL_MESSAGE_MARK &&
          index < messageHashes.length &&
          messageHashes[index] !== messageHash,
      );
      if (firstChangedIndex !== -1) reason = "history_reshaped";
      else if (messageHashes.length <= prev.messageHashes.length) reason = "history_rewound";
      else reason = "append";
    }
    let decision = reason === "append" ? "continue" : "create";
    let turnsInThread = decision === "continue" && prev ? prev.turnsInThread + 1 : 1;
    let evictedOther = false;
    if (trackers.has(key)) trackers.delete(key);
    else if (trackers.size >= MAX_TRACKED_IDS) {
      for (let key of trackers.keys())
        if (key !== ROOT_2) {
          trackers.delete(key);
          evictedOther = true;
          break;
        }
    }
    trackers.set(key, {
      configHashes,
      boundSystemHash: prefixHashes.system,
      messageHashes,
      turnsInThread,
    });
    return {
      decision,
      reason,
      sourceCategory: category,
      evictedOther,
      changedConfigFields: changedFields,
      turnsInThread,
      messageCount: messageHashes.length,
      prevMessageCount: prevCount,
      firstChangedIndex,
      deltaMessageCount: decision === "continue" ? messageHashes.length - prevCount : 0,
      historyEditClaims: prev ? claimedEdits : [],
    };
  }
  function sentThreadPrefix(key, prefixHashes, getHashes, sentCount) {
    let record = trackers.get(key);
    if (
      record === undefined ||
      sentCount > record.messageHashes.length ||
      prefixHashes.model !== record.configHashes.model ||
      prefixHashes.system !== record.boundSystemHash ||
      prefixHashes.tools !== record.configHashes.tools ||
      prefixHashes.thinking !== record.configHashes.thinking
    )
      return false;
    let hashes = getHashes();
    if (sentCount > hashes.length) return false;
    if (sentCount < record.messageHashes.length && hashes[sentCount] !== record.messageHashes[sentCount])
      return false;
    for (let idx = 0; idx < sentCount; idx++) {
      let hash = record.messageHashes[idx];
      if (hash !== EPHEMERAL_MESSAGE_MARK && hashes[idx] !== hash) return false;
    }
    return true;
  }
  function forget(agentId) {
    trackers.delete(formatZodErrors(agentId));
  }
  return {
    evaluate,
    sentThreadPrefix,
    forget,
  };
}
//@ chunk-e6aww6q8.js:2607563-2607628 placement
function evaluateTetherContinuation() {
  let warningState = streamFallbackWarning();
  return (warningState.threadDecisionTracker ??= decideTetherContinuation());
}
//@ chunk-e6aww6q8.js:2607628-2607766 placement
/**
 * 子代理结束时清除其线程决策、工具哈希等线程状态。
 */
function forgetAgentThread(agentId) {
  let state = streamFallbackWarning();
  state.threadDecisionTracker?.forget(agentId);
  state.threadInheritedFields.storedToolsHashByThread.delete(formatZodErrors(agentId));
  clearThreadArmed(agentId);
  clearThreadRequestEnd(agentId);
}
//@ chunk-e6aww6q8.js:2607766-2607941 placement
function createSentPrefixChecker(request) {
  let hashes;
  return (threadKey, messageIndex) => {
    try {
      let threadDecisionTracker = streamFallbackWarning().threadDecisionTracker;
      return (
        threadDecisionTracker !== undefined &&
        threadDecisionTracker.sentThreadPrefix(
          threadKey,
          (hashes ??= threadPrefixHashes(request)),
          request.getMessageHashes,
          messageIndex,
        )
      );
    } catch (error) {
      logError(toError(error));
      return false;
    }
  };
}
//@ chunk-e6aww6q8.js:2607941-2608002 placement
function logTetherDecisionSafely(args) {
  try {
    return logTetherDecision(args);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:2608002-2609515 placement
/**
 * 记录 tether 续接决策遥测。
 */
function logTetherDecision(args) {
  if (!isTetherLive()) return null;
  let decision = evaluateTetherContinuation().evaluate(args);
  if (!decision) return null;
  if (decision.decision !== "continue") resetThreadHealState(args.agentId);
  let changedFields = {
    model: false,
    system: false,
    tools: false,
    betas: false,
    latchedHeaders: false,
    thinking: false,
    toolChoice: false,
    effort: false,
    extraBody: false,
  };
  for (let changedConfigField of decision.changedConfigFields) changedFields[changedConfigField] = true;
  let claimedEdits = {
    compact: false,
    snip: false,
    tool_result_clear: false,
    rewind: false,
    clear: false,
    abort_strip: false,
  };
  for (let historyEditClaim of decision.historyEditClaims) claimedEdits[historyEditClaim] = true;
  let reshaped = decision.reason === "history_reshaped" || decision.reason === "history_rewound";
  logEvent("tengu_tether_decision", {
    decision: fromEnum(decision.decision),
    reason: fromEnum(decision.reason),
    sourceCategory: fromEnum(decision.sourceCategory),
    threadUnsupported: isThreadUnsupported(args.agentId, args.model),
    modelHeldStateless: args.modelHeldStateless,
    relayHeldStateless: args.relayHeldStateless,
    classifierHeldStateless: args.classifierHeldStateless,
    creditRetryStateless: args.creditRetryStateless,
    dropHeldStateless: args.dropHeldStateless,
    evictedOther: decision.evictedOther,
    changedModel: changedFields.model,
    changedSystem: changedFields.system,
    changedTools: changedFields.tools,
    changedBetas: changedFields.betas,
    changedLatchedHeaders: changedFields.latchedHeaders,
    changedThinking: changedFields.thinking,
    changedToolChoice: changedFields.toolChoice,
    changedEffort: changedFields.effort,
    changedExtraBody: changedFields.extraBody,
    turnsInThread: decision.turnsInThread,
    messageCount: decision.messageCount,
    prevMessageCount: decision.prevMessageCount,
    firstChangedIndex: decision.firstChangedIndex,
    deltaMessageCount: decision.deltaMessageCount,
    claimedCompact: claimedEdits.compact,
    claimedSnip: claimedEdits.snip,
    claimedToolResultClear: claimedEdits.tool_result_clear,
    claimedRewind: claimedEdits.rewind,
    claimedClear: claimedEdits.clear,
    claimedAbortStrip: claimedEdits.abort_strip,
    unclaimedHistoryChange:
      decision.sourceCategory === "main" && reshaped && decision.historyEditClaims.length === 0,
  });
  return decision;
}
//@ chunk-e6aww6q8.js:2609515-2609768 placement
function emptyEchoDiffs() {
  return {
    reordered: 0,
    turn_split: 0,
    turn_dropped: 0,
    added_tool_use_gettask: 0,
    added_tool_use_poll: 0,
    added_tool_use_other: 0,
    added_other: 0,
    dropped_tool_use: 0,
    dropped_thinking: 0,
    dropped_text: 0,
    dropped_other: 0,
    tool_name_changed: 0,
    caller_dropped: 0,
  };
}
//@ chunk-e6aww6q8.js:2609768-2609895 placement
var STRUCTURAL_ECHO_DIFFS = [
  "added_tool_use_gettask",
  "added_tool_use_poll",
  "added_tool_use_other",
  "dropped_tool_use",
  "turn_split",
  "turn_dropped",
];
//@ chunk-e6aww6q8.js:2609895-2610017 placement
function hasStructuralEchoDiff(effort, anchorId) {
  if (anchorId === undefined) return false;
  let classes = effort.classesById.get(anchorId);
  if (classes === undefined) return false;
  return STRUCTURAL_ECHO_DIFFS.some((diff) => classes.has(diff));
}
//@ chunk-e6aww6q8.js:2610017-2610262 placement
function blockShape(block) {
  let isTool = block.type === "tool_use" || block.type === "server_tool_use" || block.type === "mcp_tool_use";
  return {
    type: block.type,
    id: isTool && typeof block.id === "string" ? block.id : undefined,
    name: isTool && typeof block.name === "string" ? block.name : undefined,
    hasCaller: "caller" in block && block.caller !== undefined,
  };
}
//@ chunk-e6aww6q8.js:2610262-2610354 placement
function blockShapes(content) {
  if (typeof content === "string")
    return [
      {
        type: "text",
        hasCaller: false,
      },
    ];
  return content.map(blockShape);
}
//@ chunk-e6aww6q8.js:2610354-2610705 placement
/**
 * 把助手消息内容转成块形状列表，批量工具调用按原始调用合并去重。
 */
function assistantBlockShapes(message) {
  let shapes = blockShapes(message.message.content);
  let batchToolUses = message.batchToolUses;
  if (!batchToolUses || batchToolUses.length === 0) return shapes;
  let batches = new Map(batchToolUses.map((batchToolUse) => [batchToolUse.id, batchToolUse]));
  let out = [];
  let usedIds = new Set();
  for (let shape of shapes) {
    let baseId = shape.id === undefined ? undefined : stripSuffixNumber(shape.id);
    let batch = baseId === undefined ? undefined : batches.get(baseId);
    if (!batch) out.push(shape);
    else if (!usedIds.has(batch.id)) {
      usedIds.add(batch.id);
      out.push({
        type: "tool_use",
        id: batch.id,
        name: batch.name,
        hasCaller: shape.hasCaller,
      });
    }
  }
  return out;
}
//@ chunk-e6aww6q8.js:2610705-2610769 placement
function blockKey(shape) {
  return shape.id !== undefined ? `${shape.type}#${shape.id}` : shape.type;
}
//@ chunk-e6aww6q8.js:2610769-2610862 placement
function countBlockKeys(shapes) {
  let counts = new Map();
  for (let shape of shapes) {
    let key = blockKey(shape);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}
//@ chunk-e6aww6q8.js:2610862-2610984 placement
function matchedBlockKeys(shapes, counts) {
  let remaining = new Map(counts);
  let keys = [];
  for (let shape of shapes) {
    let key = blockKey(shape);
    let count = remaining.get(key) ?? 0;
    if (count > 0) {
      keys.push(key);
      remaining.set(key, count - 1);
    }
  }
  return keys;
}
//@ chunk-e6aww6q8.js:2610984-2612031 placement
/**
 * 对比两次请求，分类新增的内容（工具调用、轮询、其他），供 tether 判断。
 */
function classifyAddedContent(sentShapes, shapes) {
  let classes = new Set();
  let sentCounts = countBlockKeys(sentShapes);
  let echoedCounts = countBlockKeys(shapes);
  for (let shape of shapes) {
    let key = blockKey(shape);
    if ((echoedCounts.get(key) ?? 0) > (sentCounts.get(key) ?? 0))
      if (shape.id === undefined) classes.add("added_other");
      else if (isTaskId(shape.id)) classes.add("added_tool_use_gettask");
      else if (shape.id.startsWith(POLL_2)) classes.add("added_tool_use_poll");
      else classes.add("added_tool_use_other");
  }
  for (let shape of sentShapes) {
    let key = blockKey(shape);
    if ((sentCounts.get(key) ?? 0) > (echoedCounts.get(key) ?? 0))
      switch (shape.type) {
        case "tool_use":
        case "server_tool_use":
        case "mcp_tool_use":
          classes.add("dropped_tool_use");
          break;
        case "thinking":
        case "redacted_thinking":
          classes.add("dropped_thinking");
          break;
        case "text":
          classes.add("dropped_text");
          break;
        default:
          classes.add("dropped_other");
      }
  }
  let matchedCounts = new Map();
  for (let [key, count] of sentCounts) {
    let otherCount = echoedCounts.get(key) ?? 0;
    if (otherCount > 0) matchedCounts.set(key, Math.min(count, otherCount));
  }
  let sentMatched = matchedBlockKeys(sentShapes, matchedCounts);
  let echoedMatched = matchedBlockKeys(shapes, matchedCounts);
  for (let idx = 0; idx < sentMatched.length; idx++)
    if (sentMatched[idx] !== echoedMatched[idx]) {
      classes.add("reordered");
      break;
    }
  let byId = new Map();
  for (let shape of sentShapes) if (shape.id !== undefined) byId.set(shape.id, shape);
  for (let shape of shapes) {
    if (shape.id === undefined) continue;
    let sent = byId.get(shape.id);
    if (!sent) continue;
    if (sent.name !== undefined && shape.name !== undefined && sent.name !== shape.name)
      classes.add("tool_name_changed");
    if (sent.hasCaller && !shape.hasCaller) classes.add("caller_dropped");
  }
  return classes;
}
//@ chunk-e6aww6q8.js:2612031-2612836 placement
/**
 * 对比本地发送的 assistant 回合与服务端线程回显的内容：按消息 id 聚合块形状，统计重排、拆分、丢失、增删工具调用、thinking/文本丢失等差异类别。
 */
function auditTetherEcho(sent, echoed) {
  let shapesById = new Map();
  let order = [];
  for (let message of sent) {
    if (message.type !== "assistant" || message.isVirtual || !isRealApiResponse(message)) continue;
    let id = message.message.id;
    if (typeof id !== "string" || id.length === 0) continue;
    let shapes = shapesById.get(id);
    if (!shapes) {
      shapes = [];
      shapesById.set(id, shapes);
      order.push(id);
    }
    shapes.push(...assistantBlockShapes(message));
  }
  let echoedById = new Map();
  for (let message of echoed) {
    if (message.type !== "assistant") continue;
    let id = message.message.id;
    if (typeof id !== "string" || !shapesById.has(id)) continue;
    let entry = echoedById.get(id);
    if (!entry) {
      entry = {
        shapes: [],
        messages: 0,
      };
      echoedById.set(id, entry);
    }
    entry.messages++;
    entry.shapes.push(...blockShapes(message.message.content));
  }
  let diffs = emptyEchoDiffs();
  let identical = 0;
  let diverged = [];
  let classesById = new Map();
  for (let id of order) {
    let sentShapes = shapesById.get(id) ?? [];
    let echoed = echoedById.get(id);
    let classes = echoed ? classifyAddedContent(sentShapes, echoed.shapes) : new Set(["turn_dropped"]);
    if (echoed && echoed.messages > 1) classes.add("turn_split");
    if (classes.size === 0) {
      identical++;
      continue;
    }
    diverged.push(id);
    classesById.set(id, classes);
    for (let cls of classes) diffs[cls]++;
  }
  return {
    turnsReceived: order.length,
    turnsIdentical: identical,
    diffs,
    divergedMessageIds: diverged,
    classesById,
  };
}
//@ chunk-e6aww6q8.js:2612836-2612901 placement
function auditTetherEchoSafely(sent, echoed) {
  try {
    return auditTetherEcho(sent, echoed);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:2612901-2613755 placement
/**
 * 记录 tether 回声审计遥测：收到/一致/分歧的轮数及各类差异计数。
 */
function logTetherEchoAudit(audit, context) {
  try {
    if (audit.turnsReceived === 0) return;
    logEvent("tengu_tether_echo_audit", {
      sourceCategory: fromEnum(context.sourceCategory),
      messageCount: context.messageCount,
      anchorDiverged:
        context.anchorMessageId !== undefined && audit.divergedMessageIds.includes(context.anchorMessageId),
      turnsReceived: audit.turnsReceived,
      turnsIdentical: audit.turnsIdentical,
      turnsDiverged: audit.turnsReceived - audit.turnsIdentical,
      reordered: audit.diffs.reordered,
      turnSplit: audit.diffs.turn_split,
      turnDropped: audit.diffs.turn_dropped,
      addedToolUseGettask: audit.diffs.added_tool_use_gettask,
      addedToolUsePoll: audit.diffs.added_tool_use_poll,
      addedToolUseOther: audit.diffs.added_tool_use_other,
      addedOther: audit.diffs.added_other,
      droppedToolUse: audit.diffs.dropped_tool_use,
      droppedThinking: audit.diffs.dropped_thinking,
      droppedText: audit.diffs.dropped_text,
      droppedOther: audit.diffs.dropped_other,
      toolNameChanged: audit.diffs.tool_name_changed,
      callerDropped: audit.diffs.caller_dropped,
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2613755-2614300 placement
/**
 * 把 api_system 消息中的临时提醒拆出：返回去掉临时内容的消息副本、需在下一条用户消息时清除的提醒位置与需整体丢弃的空消息。
 */
function liftEphemeralReminders(messages, clearAtNextUser) {
  let lastIndex = messages.length - 1;
  let clearAtByIndex = new Map();
  let dropBase = new Set();
  let next;
  messages.forEach((message, index) => {
    if (message.type !== "api_system") return;
    let suffix = message.ephemeral ? message.message.content : message.ephemeralSuffix;
    if (suffix === undefined || !(clearAtNextUser || (message.reminderFromRecords && index !== lastIndex)))
      return;
    if (clearAtNextUser && suffix.trim() !== "") clearAtByIndex.set(index, suffix);
    let content = message.ephemeral ? "" : message.message.content;
    if (
      content === "" &&
      !message.toolAdditions?.length &&
      !message.toolRemovals?.length &&
      message.outputConfig === undefined
    )
      dropBase.add(index);
    next ??= [...messages];
    next[index] = {
      ...message,
      message: {
        ...message.message,
        content,
      },
      ephemeral: undefined,
      ephemeralSuffix: undefined,
    };
  });
  return next === undefined
    ? undefined
    : {
        messages: next,
        clearAtAfter: clearAtByIndex,
        dropBase,
      };
}
//@ chunk-e6aww6q8.js:2614300-2614553 placement
function buildWireWithClearAt(messages, lifted) {
  let wire = [];
  let wireIndexOf = [];
  messages.forEach((message, index) => {
    wireIndexOf.push(wire.length);
    if (!lifted.dropBase.has(index)) wire.push(message);
    let content = lifted.clearAtAfter.get(index);
    if (content !== undefined)
      wire.push({
        role: "system",
        content,
        clear_at: "next_user_message",
      });
  });
  wireIndexOf.push(wire.length);
  return {
    wire,
    wireIndexOf,
  };
}
//@ chunk-e6aww6q8.js:2614553-2614712 placement
/**
 * ATIS 不一致时重新拉取 bootstrap 的参数：最小间隔 300 s（30–86400）、最大抖动 180 s（0–3600）与开关名、拉取时间槽。
 */
var X_CC_ATIS_CURRENT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DEFAULT_ATIS_MIN_INTERVAL_S;
var ATIS_MIN_INTERVAL_RANGE;
var DEFAULT_ATIS_MAX_JITTER_S;
var ATIS_MAX_JITTER_RANGE;
var TENGU_EXPRESSIVE_WHISTLE_CONFIG;
var atisRefetchStateSlot;
deferInit("chunk-e6aww6q8.js:2614553", () => {
  X_CC_ATIS_CURRENT = "x-cc-atis-current";
  DEFAULT_ATIS_MIN_INTERVAL_S = 300;
  ATIS_MIN_INTERVAL_RANGE = {
    min: 30,
    max: 86400,
  };
  DEFAULT_ATIS_MAX_JITTER_S = 180;
  ATIS_MAX_JITTER_RANGE = {
    min: 0,
    max: 3600,
  };
  TENGU_EXPRESSIVE_WHISTLE_CONFIG = "tengu_expressive_whistle_config";
  atisRefetchStateSlot = new HostScoped(() => ({
    nextFetchAt: 0,
  }));
});
//@ chunk-e6aww6q8.js:2614712-2614751 placement
function atisRefetchState() {
  return atisRefetchStateSlot.of(getRootSession().host);
}
//@ chunk-e6aww6q8.js:2614751-2614806 placement
function isExpressiveWhistleEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_expressive_whistle", false);
}
//@ chunk-e6aww6q8.js:2614806-2615701 placement
/**
 * 主线程请求的响应头里服务端 ATIS 标记与本地 client_data 不一致时，按最小间隔加抖动重新拉取 bootstrap，并记 tengu_client_data_stale_refetch。
 */
async function refetchStaleClientData(headers, request, fallbackActive) {
  try {
    if (!isExpressiveWhistleEnabled()) return;
    let serverPin = headers.get(X_CC_ATIS_CURRENT);
    if (!serverPin) return;
    let clientDataAtis = getClientDataAtis();
    if (clientDataAtis === undefined) return;
    if (
      classifyQuerySource(request.querySource) !== "main" ||
      !isFirstPartyApiBackend() ||
      isEssentialTrafficOnly() ||
      stripAnyVersatileSuffix(request.model) !== stripAnyVersatileSuffix(getMainLoopModel()) ||
      fallbackActive ||
      hasRefusalFallbackOccurred() ||
      hasRefusalFallbackHeaderArmed()
    )
      return;
    let pin = atisPin(serverPin);
    if (pin === atisPin(clientDataAtis)) return;
    let state = atisRefetchState();
    let now = Date.now();
    if (now < state.nextFetchAt) return;
    let { minIntervalMs, maxJitterMs } = staleRefetchTiming();
    let jitterMs = Math.random() * maxJitterMs;
    state.nextFetchAt = now + jitterMs + minIntervalMs;
    let { bootstrapFetchCanConvergeSlot, refreshBootstrapData } = await import("./bootstrap.js");
    if (!bootstrapFetchCanConvergeSlot()) return;
    logForDebugging("[Bootstrap] Server ATIS pin differs from cached clientData; refetching");
    await sleep(jitterMs, undefined, {
      unref: true,
    });
    let outcome = lit_2("skipped_converged");
    if (clientDataAtisPin() !== pin)
      outcome = !(await refreshBootstrapData(request.storageV5, request.credentials, {
        keepRenderCaches: true,
      }))
        ? lit_2("fetch_failed")
        : clientDataAtisPin() === pin
          ? lit_2("fetched_converged")
          : lit_2("fetched_pins_differ");
    logEvent("tengu_client_data_stale_refetch", {
      outcome,
      server_has_pin: pin !== "none",
      min_interval_ms: minIntervalMs,
      jitter_ms: Math.round(jitterMs),
    });
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2615701-2615760 placement
function clientDataAtisPin() {
  let clientDataAtis = getClientDataAtis();
  return clientDataAtis === undefined ? "none" : atisPin(clientDataAtis);
}
//@ chunk-e6aww6q8.js:2615760-2615903 placement
function staleRefetchTiming() {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    TENGU_EXPRESSIVE_WHISTLE_CONFIG,
    {},
  );
  return {
    minIntervalMs:
      1000 *
      clampNumber(
        featureValue_CACHED_MAY_BE_STALE?.minIntervalSeconds,
        DEFAULT_ATIS_MIN_INTERVAL_S,
        ATIS_MIN_INTERVAL_RANGE,
      ),
    maxJitterMs:
      1000 *
      clampNumber(
        featureValue_CACHED_MAY_BE_STALE?.maxJitterSeconds,
        DEFAULT_ATIS_MAX_JITTER_S,
        ATIS_MAX_JITTER_RANGE,
      ),
  };
}
//@ chunk-e6aww6q8.js:2615903-2616006 placement
function clampNumber(value, fallback, bounds) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(Math.max(value, bounds.min), bounds.max)
    : fallback;
}
//@ chunk-e6aww6q8.js:2616006-2616063 placement
class TetherHealSpendState {
  handlers = undefined;
  spent = undefined;
  lapsedAtMs = undefined;
}
//@ chunk-e6aww6q8.js:2616063-2616090 placement
var tetherHealSpendSlot; // deferred: uses TetherHealSpendState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:2616063", () => {
  tetherHealSpendSlot = new HostScoped(() => new TetherHealSpendState());
});
export {
  seedWireShapeFromRecord,
  forgetAgentThread,
  threadSourceKind,
  noteLastDispatchHealed,
  isStatelessTetherModel,
  isTeleportCacheActiveRoot,
  isThreadsHeldForClassifier,
  isThreadHeldStateless,
  canUseNoTransientReminders,
  classifyThreadError,
  logTetherDecisionSafely,
  isSubagentOrUnknown,
  auditTetherEchoSafely,
  buildTetherDelta,
  hasStructuralEchoDiff,
  logTetherEchoAudit,
  checkTetherPrefixMismatch,
  createSentPrefixChecker,
  reportThinkingDrop,
  refetchStaleClientData,
  liftEphemeralReminders,
  buildWireWithClearAt,
  reminderDeliveryMode,
};
