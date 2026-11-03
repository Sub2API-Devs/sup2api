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
import { u, literal, string } from "../../../vendor/zod/v4/classic/schemas.js";
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

//@ chunk-e6aww6q8.js:2584360-2585122 placement
/**
 * 从 transcript 记录的请求形状恢复 beta 锁定：按记录启用/拒绝中途 system 消息、工具变更头与内联工具 beta，并记 tengu_wire_shape_seeded。
 */
function seedWireShapeFromRecord(betas, record, model) {
  if (record === undefined || betas.wireShapeSeed?.record === record || !isFoamySpringEnabled()) return;
  try {
    let { systemTurns, toolChangeHeader, inlineTools } = record;
    let S = undefined;
    if (systemTurns === undefined && toolChangeHeader === undefined && inlineTools === undefined) return;
    let w = hasContextBeta(betas);
    let L = [];
    let G = [];
    let q = isInlineToolsAllowed();
    let Z = systemTurns === false && isMidConvSystemForced(model);
    if (systemTurns === true) L.push(BETA_MID_CONVERSATION_SYSTEM);
    else if (systemTurns === false && !Z) G.push(BETA_MID_CONVERSATION_SYSTEM);
    if (toolChangeHeader === true) {
      L.push(BETA_MID_CONV_TOOL_CHANGE);
      if (inlineTools === true && q) L.push(BETA_INLINE_TOOLS);
    } else if (toolChangeHeader === false) G.push(BETA_MID_CONV_TOOL_CHANGE);
    if (inlineTools === false) G.push(BETA_INLINE_TOOLS);
    dropWireShapeSeed(betas);
    applyWireShapeSeed(betas, {
      record,
      sent: L,
      rejected: G,
    });
    if (record.systemTurnsAnsweredBy !== undefined)
      betas.systemMessagesAcceptedBy.add(strip1mTagWhereBuiltIn(record.systemTurnsAnsweredBy));
    if (betas === getStickyBetas()) notifyPerTurnEffortInactive(betas, w);
    logEvent("tengu_wire_shape_seeded", {
      ...(systemTurns !== undefined && {
        systemTurns,
        systemTurnsForced: Z,
      }),
      ...(toolChangeHeader !== undefined && {
        toolChangeHeader,
      }),
      ...(inlineTools !== undefined && {
        inlineTools,
        inlineToolsOffered: isInlineToolsEnabled(),
        inlineToolsPermitted: q,
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
function readInputTransformations(e) {
  return typeof e === "object" &&
    e !== null &&
    "input_transformations" in e &&
    Array.isArray(e.input_transformations)
    ? e.input_transformations
    : undefined;
}
//@ chunk-e6aww6q8.js:2585321-2585782 placement
/**
 * 从服务端警告中解析 thinking_dropped 条目，得到消息/块位置与原因类别。
 */
function parseThinkingDrops(transformations) {
  let n = u({
    type: literal("thinking_dropped"),
    path: string(),
    reason: string(),
  });
  let r = [];
  for (let transformation of transformations) {
    let h = n.safeParse(transformation);
    if (!h.success) continue;
    let { path, reason } = h.data;
    let match = /^messages\.(\d{1,6})\.content\.(\d{1,6})$/.exec(path);
    let L = match ?? /^messages\.(\d{1,6})(?:\.|$)/.exec(path);
    r.push({
      messageIndex: L ? Number(L[1]) : undefined,
      blockIndex: match ? Number(match[2]) : undefined,
      reason:
        reason === "prefix_binding_mismatch"
          ? "prefix_mismatch"
          : reason === "model_binding_mismatch"
            ? "model_mismatch"
            : "other",
    });
  }
  return r;
}
//@ chunk-e6aww6q8.js:2585782-2585839 placement
function xxhashBase36(e) {
  return Bun.hash.xxHash64(e).toString(36);
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
  let h;
  let y = new Set();
  let S = [];
  let w = {};
  let L = new Set();
  for (let { messageIndex, blockIndex, reason } of drops) {
    if (messageIndex === undefined || blockIndex === undefined) continue;
    let Se = {
      messageIndex,
      blockIndex,
    };
    let ke = blockKeyAt(Se);
    if (ke === undefined) continue;
    let we = xxhashBase36(ke);
    let Ee = `*:${we}`;
    let Ae = isMain ? `main:${we}` : Ee;
    if (L.has(Ae) || seen.get(Ae)) continue;
    L.add(Ae).add(Ee);
    S.push(we);
    y.add(messageIndex);
    w[reason] = (w[reason] ?? 0) + 1;
    if (h === undefined) {
      h = {
        blockCount: 1,
        turnCount: 1,
        reason,
        first: Se,
        last: Se,
      };
      continue;
    }
    h.blockCount++;
    if (THINKING_DROP_REASON_RANK[reason] > THINKING_DROP_REASON_RANK[h.reason]) h.reason = reason;
    if (isBeforeBlock(Se, h.first)) h.first = Se;
    if (isBeforeBlock(h.last, Se)) h.last = Se;
  }
  if (h === undefined) return;
  h.turnCount = y.size;
  h.reasonCounts = w;
  return {
    drops: h,
    blockHashes: S,
    seenKeys: [...L],
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
    let ke = `${getSessionId()}:${trackingKey ?? "*"}`;
    let we = bindingDrops.threadsRead.get(ke) !== true;
    let isMain = agentId === undefined && classifyQuerySource(querySource) === "main";
    let Ae = we ? [...carriedBlockHashes()] : [];
    let seen =
      transformations.length > 0 || Ae.length > 0
        ? (bindingDrops.seenBlocks ??= new LRUCache({
            max: 40000,
          }))
        : undefined;
    for (let ze of Ae) {
      if (isMain) seen?.set(`main:${ze}`, true);
      seen?.set(`*:${ze}`, true);
    }
    let Me = seen && summarizeThinkingDrops(parseThinkingDrops(transformations), blockKeyAt, isMain, seen);
    let We;
    if (seen && Me) {
      let { drops, blockHashes, seenKeys } = Me;
      let nt = countThinkingSent();
      let pendingChangeSummary = getPendingChangeSummary(querySource, agentId);
      logEvent("tengu_thinking_drop", {
        query_source: agentTypeForTelemetry(querySource),
        model: telemetrySafeModelName(model),
        request_id: sanitizeMarkName(requestId) ?? lit_2("unknown"),
        solicited,
        thinking_blocks_sent: nt.blocksSent,
        thinking_turns_sent: nt.turnsSent,
        dropped_reason: fromEnum(drops.reason),
        newly_dropped_block_count: drops.blockCount,
        newly_dropped_turn_count: drops.turnCount,
        failing_message_index: drops.first.messageIndex,
        failing_block_index: drops.first.blockIndex,
        last_failing_message_index: drops.last.messageIndex,
        last_failing_block_index: drops.last.blockIndex,
        first_report_for_thread_in_process: we,
        client_change_kinds: pendingChangeSummary.kinds,
        first_changed_message_index: pendingChangeSummary.firstChangedMessageIndex,
        client_baseline: pendingChangeSummary.baseline,
        call_number: pendingChangeSummary.callNumber,
        context_compacted: fromEnumOpt(contextCompactedKind),
      });
      for (let seenKey of seenKeys) seen.set(seenKey, true);
      We = {
        drops,
        blockHashes,
        sent: nt,
        firstReport: we,
        change: pendingChangeSummary,
      };
    }
    bindingDrops.threadsRead.set(ke, true);
    return We;
  } catch (error) {
    logError(error);
    return;
  }
}
//@ chunk-e6aww6q8.js:2587915-2588030 placement
function isBeforeBlock(e, n) {
  return (
    e.messageIndex < n.messageIndex || (e.messageIndex === n.messageIndex && e.blockIndex < n.blockIndex)
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
function touchThreadHealState(e) {
  let n = threadDropRecreate();
  let r = n.get(e);
  if (r === undefined) {
    if (n.size >= MAX_TETHER_KEYS) {
      for (let key of n.keys())
        if (key !== ROOT_2) {
          n.delete(key);
          break;
        }
    }
    r = {
      mintedOnContinue: new Map(),
      continuesServed: 0,
      createdForDrop: false,
      armed: false,
      heldStateless: false,
      reportUnmatched: false,
      lastDispatchHealed: false,
    };
  } else n.delete(e);
  n.set(e, r);
  return r;
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
  let r = touchThreadHealState(formatZodErrors(threadKey));
  if (dispatch.thread === "create") {
    r.mintedOnContinue.clear();
    r.armed = false;
    if (dispatch.forDrop) {
      r.createdForDrop = true;
      r.continuesServed = 0;
    }
    return;
  }
  r.continuesServed++;
  if (dispatch.messageId !== undefined) {
    let mintedOnContinue = r.mintedOnContinue;
    if (!mintedOnContinue.has(dispatch.messageId) && mintedOnContinue.size >= MAX_MINTED_ONCE) {
      let h = mintedOnContinue.keys().next().value;
      if (h !== undefined) mintedOnContinue.delete(h);
    }
    mintedOnContinue.set(dispatch.messageId, r.continuesServed);
  }
}
//@ chunk-e6aww6q8.js:2588990-2589096 placement
function resetThreadHealState(agentId) {
  let n = threadDropRecreate().get(formatZodErrors(agentId));
  if (n === undefined) return;
  n.mintedOnContinue.clear();
  n.createdForDrop = false;
}
//@ chunk-e6aww6q8.js:2589096-2589173 placement
function noteLastDispatchHealed(agentId, lastDispatchHealed) {
  let r = threadDropRecreate().get(formatZodErrors(agentId));
  if (r !== undefined) r.lastDispatchHealed = lastDispatchHealed;
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
function isThreadHeldStateless(e) {
  try {
    return threadDropRecreate().get(formatZodErrors(e))?.heldStateless === true && isTetherHealEnabled();
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-e6aww6q8.js:2589361-2589556 placement
function takeThreadHealFacts(agentId) {
  let n = threadDropRecreate().get(formatZodErrors(agentId));
  let r = {
    continuesSinceDropCreate: n?.createdForDrop === true ? n.continuesServed : -1,
    reportUnmatched: n?.reportUnmatched === true,
  };
  if (n !== undefined) n.reportUnmatched = false;
  return r;
}
//@ chunk-e6aww6q8.js:2589556-2589692 placement
function hasPendingMintedReplies() {
  if (!isTetherHealEnabled()) return false;
  for (let e of threadDropRecreate().values())
    if (!e.heldStateless && !e.armed && e.mintedOnContinue.size > 0) return true;
  return false;
}
//@ chunk-e6aww6q8.js:2589692-2591079 placement
/**
 * 当服务端报告线程前缀不一致时给出警告（重发了旧字节、没发线程前缀等）。
 */
function warnTetherPrefixMismatch(e, carrier, sentThreadPrefix) {
  let s = tetherHealConfig();
  if (!s.enabled || e.length === 0) return;
  for (let [h, y] of threadDropRecreate()) {
    if (y.heldStateless || y.armed) continue;
    let sorted = e
      .filter((q) => y.mintedOnContinue.has(q.messageId))
      .sort((q, Z) => y.mintedOnContinue.get(q.messageId) - y.mintedOnContinue.get(Z.messageId));
    if (sorted.length === 0) continue;
    let w = y.lastDispatchHealed && h !== carrier.key;
    let L = w ? undefined : sorted.find((q) => sentThreadPrefix(h, q.messageIndex));
    if (L === undefined) {
      y.reportUnmatched = true;
      logForDebugging(
        `[tether] thread '${h}': a request (${carrier.querySource}) reported this thread's thinking dropped, but ${w ? "this thread's own requests re-send earlier bytes (sent-prefix ledger, enforce mode) that other requests do not" : "did not send this thread's prefix (system, tools, model, thinking or an earlier message differ)"}; ignored`,
      );
      continue;
    }
    let G = y.mintedOnContinue.get(L.messageId);
    if (y.createdForDrop && G < s.minContinues) {
      y.heldStateless = true;
      logFeatureSad("tether_drop_recreate", "held_stateless");
      logForDebugging(
        `[tether] thread '${h}': the server dropped thinking produced on continue #${G} after the thread was re-created for a drop (reported by ${carrier.querySource}; held because it came before continue #${s.minContinues}); sending without \`thread\` for the rest of this conversation`,
        {
          level: "warn",
        },
      );
      continue;
    }
    y.armed = true;
    logForDebugging(
      `[tether] thread '${h}': the server dropped thinking this thread produced on a continue (prefix mismatch, reported by ${carrier.querySource}); re-creating the thread on its next request`,
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
    [...earliestByMessage].map(([w, L]) => ({
      messageId: w,
      messageIndex: L,
    })),
    carrier,
    sentThreadPrefix,
  );
}
//@ chunk-e6aww6q8.js:2591583-2591618 placement
function clearThreadArmed(e) {
  threadDropRecreate().delete(formatZodErrors(e));
}
//@ chunk-e6aww6q8.js:2591618-2591647 placement
var MAX_THREAD_TTLS = 128;
var MIN_TTL_SECONDS = 300;
var MAX_TTL_SECONDS = 3600;
//@ chunk-e6aww6q8.js:2591647-2591736 placement
function validTtlSeconds(e) {
  return typeof e === "number" && Number.isInteger(e) && e >= MIN_TTL_SECONDS && e <= MAX_TTL_SECONDS
    ? e
    : undefined;
}
//@ chunk-e6aww6q8.js:2591736-2591928 placement
function threadLifetimeMs(closedTurn) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_jaunty_charm", null);
  let r = validTtlSeconds(featureValue_CACHED_MAY_BE_STALE?.ttl_seconds);
  let ccClosedTurnTtlSeconds = featureValue_CACHED_MAY_BE_STALE?.cc_closed_turn_ttl_seconds ?? undefined;
  let h = ccClosedTurnTtlSeconds === undefined ? r : validTtlSeconds(ccClosedTurnTtlSeconds);
  if (r === undefined || h === undefined || h < r) return;
  return (closedTurn ? r : h) * 1000;
}
//@ chunk-e6aww6q8.js:2591928-2591973 placement
function threadRequestEnds() {
  return streamFallbackWarning().threadRequestEnds;
}
//@ chunk-e6aww6q8.js:2591973-2592171 placement
function touchThreadLastUse(agentId, clock) {
  try {
    let r = threadRequestEnds();
    let s = formatZodErrors(agentId);
    if (!r.delete(s) && r.size >= MAX_THREAD_TTLS) {
      for (let key of r.keys())
        if (key !== ROOT_2) {
          r.delete(key);
          break;
        }
    }
    r.set(s, {
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
    let s = threadLifetimeMs(closedTurn);
    let h = threadRequestEnds().get(formatZodErrors(threadKey));
    if (h === undefined)
      return {
        idleMs: undefined,
        monotonicIdleMs: undefined,
        lifetimeMs: s,
        expired: false,
      };
    let y = clock.monotonicNow() - h.monotonicMs;
    let max = Math.max(clock.now() - h.wallMs, y);
    return {
      idleMs: max,
      monotonicIdleMs: y,
      lifetimeMs: s,
      expired: s !== undefined && max >= s,
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
function clearThreadRequestEnd(e) {
  threadRequestEnds().delete(formatZodErrors(e));
}
//@ chunk-e6aww6q8.js:2595772-2595824 placement = isSubagentContext (0.815)
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
function threadKey(e, n) {
  return `${e ?? ROOT}\x00${strippedCanonicalName(n)}`;
}
//@ chunk-e6aww6q8.js:2595970-2596197 placement
function isStatelessTetherModel(e) {
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE(
    "tengu_curious_tower_stateless_models",
    "",
  );
  if (
    typeof featureValue_CACHED_MAY_BE_STALE !== "string" ||
    featureValue_CACHED_MAY_BE_STALE.trim().length === 0
  )
    return false;
  let r = {};
  for (let s of featureValue_CACHED_MAY_BE_STALE.split(",")) {
    let h = strip1mSuffix(s.trim());
    if (h !== "" && h !== ANY_MODEL_KEY) r[h] = true;
  }
  return findModelKeyedEntry(r, e) !== undefined;
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
  return system.filter((n) => isUncachedSystemBlock(n));
}
//@ chunk-e6aww6q8.js:2596391-2596403 placement
var MAX_TOOLS_HASH_ENTRIES = 128;
//@ chunk-e6aww6q8.js:2596403-2596485 placement
function isTeleportCacheActiveRoot(e) {
  return e === undefined && thinkingRelayModuleKept?.getTeleportCacheState().status === "active";
}
//@ chunk-e6aww6q8.js:2596485-2596529 placement
function isThreadsHeldForClassifier() {
  return isThreadsHeldForServerClassifier() && (isAutoModeClassified() || isServerArbiterActive());
}
//@ chunk-e6aww6q8.js:2596529-2596605 placement
function canTetherThread(e, n) {
  return (
    isTetherLive() &&
    !isThreadUnsupported(e, n) &&
    !isStatelessTetherModel(n) &&
    !isTeleportCacheActiveRoot(e) &&
    !isThreadsHeldForClassifier() &&
    !isThreadHeldStateless(e)
  );
}
//@ chunk-e6aww6q8.js:2596605-2596719 placement
function hasServerToolUse(messages) {
  return messages.some(
    (n) => n.type === "assistant" && n.message.content.some((r) => r.type === "server_tool_use"),
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
  let ke = messages.length;
  let we =
    previousMessageId === undefined
      ? -1
      : messages.findLastIndex(
          (message) => message.type === "assistant" && message.message.id === previousMessageId,
        );
  let Ee = we >= 0 ? messages[we] : undefined;
  let Ae =
    Ee?.type === "assistant" &&
    Ee.message.stop_reason != null &&
    !getClientTruncatedAssistantIds().has(Ee.message.id) &&
    !getHeldStatelessReplyIds().has(Ee.message.id);
  let closedTurn = Ee?.type === "assistant" && Ee.message.content.some((yo) => yo.type === "tool_use");
  let Me = threadIdleState(agentId, closedTurn, clock);
  let We = engine === null ? "no_engine_result" : null;
  let ze = null;
  let lt = null;
  let Je = false;
  let nt = null;
  let pt = isThreadUnsupported(agentId, model);
  let Et = hasServerToolUse(messages);
  let any = messages.some(
    (message) =>
      message.type === "user" &&
      Array.isArray(message.message.content) &&
      message.message.content.some(
        (Ho) =>
          Ho.type === "tool_result" &&
          Array.isArray(Ho.content) &&
          Ho.content.some((rr) => isObjectBlock(rr) && rr.type === "search_result"),
      ),
  );
  let gt = false;
  let At = false;
  let It = false;
  let Yt = false;
  let qt = false;
  let Zt = false;
  let rn = false;
  let pn;
  let no = false;
  let hn = false;
  let ho = 0;
  let inheritBreakerTripped = false;
  let Kn;
  let Xn;
  let fo = (tools) => {
    if (Kn === undefined || Kn.ref !== tools) {
      let Ho = jsonStringify(tools);
      Kn = {
        ref: tools,
        json: Ho,
        hash: computeContentHash(Ho),
      };
    }
    return Kn;
  };
  let To = (system) => {
    if (Xn?.ref !== system)
      Xn = {
        ref: system,
        bytes: jsonStringify(system.filter((Ho) => !isUncachedSystemBlock(Ho))).length,
      };
    return Xn.bytes;
  };
  function bo(yo, Ho = false) {
    At = false;
    Zt = false;
    It = yo.some((Hr) => Hr.type === "api_system" && (Hr.toolAdditions?.length ?? 0) > 0);
    Yt = yo.some((Hr) => Hr.type === "api_system" && (Hr.toolRemovals?.length ?? 0) > 0);
    qt = (It || Yt) && !isLucidAnchorEnabled();
    if (
      pt ||
      modelHeldStateless ||
      relayHeldStateless ||
      classifierHeldStateless ||
      creditRetryStateless ||
      dropHeldStateless ||
      toolResultClearingHeldStateless ||
      nt !== null ||
      Et ||
      any ||
      qt
    ) {
      ze = null;
      return null;
    }
    if (
      yo.some(
        (Hr) =>
          (Hr.type === "user" && Hr.ephemeral) ||
          (!Ho && Hr.type === "api_system" && (Hr.ephemeral || Hr.ephemeralSuffix !== undefined)),
      )
    ) {
      ze = null;
      gt = true;
      return null;
    }
    Zt = isThreadArmed(agentId);
    let rr;
    if (We !== null || engine === null)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: We ?? "no_engine_result",
      };
    else if (engine.decision !== "continue")
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: engine.reason,
      };
    else if (previousMessageId === undefined || we < 0)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_missing",
      };
    else if (we + 1 >= ke)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_is_tail",
      };
    else if (!Ae)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_incomplete",
      };
    else if (anchorRewritten)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "anchor_rewritten",
      };
    else if (yo !== messages || yo.length !== ke)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "transcript_drift",
      };
    else if (Zt)
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "thread_minted_drop",
      };
    else if (Me.expired) {
      if (ze?.reason !== "thread_presumed_expired")
        logForDebugging(
          `[tether] thread idle for ${Math.round((Me.idleMs ?? 0) / 1000)} s, at or past its ${(Me.lifetimeMs ?? 0) / 1000} s lifetime on the server: sending a create, not a continue`,
        );
      rr = {
        thread: {
          type: "create",
        },
        sliceFrom: 0,
        reason: "thread_presumed_expired",
      };
    } else
      rr = {
        thread: {
          type: "continue",
          previous_message_id: previousMessageId,
        },
        sliceFrom: we + 1,
        reason: engine.reason,
      };
    ze = rr;
    let last = yo.at(-1);
    At = Ho && last?.type === "api_system" && (last.ephemeral === true || last.ephemeralSuffix !== undefined);
    return rr;
  }
  function vn(yo, Ho) {
    no = false;
    hn = false;
    ho = 0;
    pn = undefined;
    try {
      if (yo === null)
        return {
          system: Ho.system,
          tools: Ho.tools,
        };
      if (!isQuietHeronEnabled()) {
        forgetThreadToolsHash(agentId);
        return {
          system: Ho.system,
          tools: Ho.tools,
        };
      }
      let { json, hash } = fo(Ho.tools);
      if (yo.thread.type !== "continue") {
        pn = hash;
        return {
          system: Ho.system,
          tools: Ho.tools,
        };
      }
      let Hr = uncachedSystemBlocks(Ho.system);
      let Fr = Hr.length > 0 && Hr.length < Ho.system.length ? Hr : Ho.system;
      if (Fr !== Ho.system) {
        no = true;
        ho += To(Ho.system);
      }
      if (
        streamFallbackWarning().threadInheritedFields.storedToolsHashByThread.get(
          formatZodErrors(agentId),
        ) === hash
      ) {
        hn = true;
        ho += json.length;
        return {
          system: Fr,
          tools: undefined,
        };
      }
      pn = hash;
      return {
        system: Fr,
        tools: Ho.tools,
      };
    } catch (error) {
      logError(error);
      no = false;
      hn = false;
      ho = 0;
      pn = undefined;
      forgetThreadToolsHash(agentId);
      return {
        system: Ho.system,
        tools: Ho.tools,
      };
    }
  }
  function co(yo) {
    if (We === null) {
      We = yo;
      logForDebugging(`[tether] forcing create for retry: ${yo}`);
    }
  }
  function So(yo) {
    try {
      let Ho = classifyThreadError(yo);
      if (Ho !== null && lt === null) lt = Ho;
      if (Ho === "unsupported_request" || (Ho === "other_thread_400" && ze?.thread.type === "create")) {
        if (nt !== null || ze === null) return;
        nt = ze.thread.type;
        markThreadUnsupported(agentId, model);
        logForDebugging(
          `[tether] ${Ho}: resending this turn stateless; this thread stays stateless on this model for the session`,
          {
            level: "warn",
          },
        );
        return "retry:tether-stateless";
      }
      if (ze?.thread.type !== "continue") return;
      if (!(yo instanceof APIError)) return;
      if (yo.status !== 400 && yo.status !== 404) return;
      if (yo.status === 404 && Ho !== "not_found") return;
      if (Ho === null && (isPromptTooLongError(yo) || isCreditBalanceTooLow(yo))) return;
      switch (Ho) {
        case "not_found":
          Je = true;
          co("replay_not_found");
          return "retry:tether-replay";
        case "fingerprint_mismatch":
          Je = true;
          if (
            initFingerprint(yo, {
              system: no,
              tools: hn,
            })
          )
            $o();
          co("replay_fingerprint");
          return "retry:tether-replay";
        case "already_continued":
        case "other_thread_400":
        case null:
          Je = true;
          co("replay_other_400");
          return "retry:tether-replay";
      }
    } catch (error) {
      logError(error);
      return;
    }
  }
  function ko() {
    try {
      if (nt !== null || ze === null) return;
      nt = ze.thread.type;
      lt ??= "unrecognised_400";
      logForDebugging(
        `[tether] unrecognised HTTP 400 on a ${nt} that carried the message-threads header: resending this turn stateless without the header`,
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
  function un(yo) {
    addWithLimitLogged(getClientTruncatedAssistantIds(), MAX_TRUNCATED_ASSISTANT_IDS, yo);
  }
  function ao(yo, Ho, rr) {
    if (rn) return;
    rn = true;
    if (
      gt ||
      modelHeldStateless ||
      relayHeldStateless ||
      classifierHeldStateless ||
      creditRetryStateless ||
      dropHeldStateless ||
      toolResultClearingHeldStateless ||
      any ||
      qt ||
      nt !== null
    )
      addWithLimitLogged(getHeldStatelessReplyIds(), MAX_HELD_STATELESS_IDS, rr);
    if (ze !== null) touchThreadLastUse(agentId, clock);
    if (yo.kind === "ok" && ze !== null)
      try {
        let br = ze.thread.type === "create" && ze.reason === "thread_minted_drop";
        recordThreadDispatch(
          agentId,
          ze.thread.type === "continue"
            ? {
                thread: "continue",
                messageId: rr,
              }
            : {
                thread: "create",
                forDrop: br,
              },
        );
        if (br) logFeatureOk("tether_drop_recreate");
      } catch (error) {
        logError(toError(error));
      }
    if (yo.kind === "ok" && ze !== null && pn !== undefined) storeThreadToolsHash(agentId, pn);
    try {
      let br = yo.kind === "error" ? (classifyThreadError(yo.error) ?? "error_non_thread") : yo.kind;
      let Hr = takeThreadHealFacts(agentId);
      logEvent("tengu_tether_live_outcome", {
        requestId: sanitizeMarkName(Ho),
        sentThreadType: fromEnum(ze?.thread.type ?? "none"),
        sourceCategory: fromEnum(engine?.sourceCategory ?? "none"),
        planReason: fromEnum(ze?.reason ?? "none"),
        engineDecision: fromEnum(engine?.decision ?? "none"),
        engineReason: fromEnum(engine?.reason ?? "none"),
        firstThreadError: fromEnum(lt ?? "none"),
        finalOutcome: fromEnum(br),
        replayed: Je,
        droppedFrom: fromEnum(nt ?? "none"),
        threadUnsupported: pt,
        modelHeldStateless,
        relayHeldStateless,
        classifierHeldStateless,
        creditRetryStateless,
        toolResultClearingHeldStateless,
        serverToolHistory: Et,
        searchResultHistory: any,
        toolAdditionHistory: It,
        toolRemovalHistory: Yt,
        toolChangeHistory: qt,
        requestScopedStateless: gt,
        keptReminderClearAt: At,
        keptReminderScope: fromEnum(keptReminderModeSafe(model)),
        deltaMessageCount: we >= 0 ? ke - we - 1 : 0,
        messageCount: ke,
        turnsInThread: engine?.turnsInThread ?? 0,
        omittedSystem: no,
        omittedTools: hn,
        omittedBytes: ho,
        inheritBreakerTripped,
        dropArmed: Zt,
        dropHeldStateless,
        continuesSinceDropCreate: Hr.continuesSinceDropCreate,
        dropReportUnmatched: Hr.reportUnmatched,
        threadIdleMs: Math.round(Me.idleMs ?? -1),
        threadIdleMonotonicMs: Math.round(Me.monotonicIdleMs ?? -1),
        threadLifetimeMs: Me.lifetimeMs ?? -1,
        anchorHasToolCall: closedTurn,
      });
    } catch (error) {
      logError(error);
    }
  }
  function $o() {
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
    plan: bo,
    shapeInheritedFields: vn,
    forceCreate: co,
    resolveRetry: So,
    dropForUnrecognised400: ko,
    noteClientTruncated: un,
    settle: ao,
  };
}
//@ chunk-e6aww6q8.js:2603807-2603888 placement
function forgetThreadToolsHash(agentId) {
  streamFallbackWarning().threadInheritedFields.storedToolsHashByThread.delete(formatZodErrors(agentId));
}
//@ chunk-e6aww6q8.js:2603888-2604064 placement
function storeThreadToolsHash(agentId, n) {
  let storedToolsHashByThread = streamFallbackWarning().threadInheritedFields.storedToolsHashByThread;
  let s = formatZodErrors(agentId);
  storedToolsHashByThread.delete(s);
  if (storedToolsHashByThread.size >= MAX_TOOLS_HASH_ENTRIES) {
    let h = storedToolsHashByThread.keys().next().value;
    if (h !== undefined) storedToolsHashByThread.delete(h);
  }
  storedToolsHashByThread.set(s, n);
}
//@ chunk-e6aww6q8.js:2604064-2604135 placement
function addWithLimitLogged(e, n, r) {
  if (r === undefined) return;
  try {
    addWithLimit(e, r, n);
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:2604135-2604788 placement
/**
 * 把线程续接接口的错误（线程不存在、请求不支持、指纹不一致）归类。
 */
function classifyThreadError(e) {
  if (!(e instanceof APIError)) return null;
  let message = e.message ?? "";
  if (e.status === 404)
    return message.includes("thread_not_found") || readErrorCode(e) === "thread_not_found"
      ? "not_found"
      : null;
  if (e.status !== 400) return null;
  let errorCode = readErrorCode(e);
  if (errorCode === "thread_unsupported_request" || isTetherBetaRejected(e)) return "unsupported_request";
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
function readErrorCode(e) {
  let error = e.error;
  if (typeof error !== "object" || error === null) return;
  let r = "error" in error ? error.error : error;
  if (typeof r !== "object" || r === null || !("details" in r)) return;
  let details = r.details;
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
function canUseNoTransientReminders(querySource, agentContext, r, s = false) {
  let agentType = threadSourceKind(querySource);
  return (
    agentType !== null &&
    !s &&
    canTetherThread(agentContext, r) &&
    isSubagentOrUnknown(agentType, agentContext) &&
    !env.CLAUDE_CODE_SIMULATE_PROXY_USAGE
  );
}
//@ chunk-e6aww6q8.js:2605274-2605410 placement
/**
 * 决定提醒的投递方式：保留（kept）、不发（none）或临时（transient）。
 */
function reminderDeliveryMode(querySource, betas, model, s = model, h = false, recorded) {
  if (
    !isAutoModeQuerySource(querySource) &&
    isKeptReminderModeNotOff(
      s,
      classifyQuerySource(querySource) === "main"
        ? {
            recorded,
          }
        : undefined,
    )
  )
    return "kept";
  return canUseNoTransientReminders(querySource, betas, model, h) ? "none" : "transient";
}
//@ chunk-e6aww6q8.js:2605410-2605510 placement
function threadSourceKind(querySource) {
  if (querySource === "hook_agent") return null;
  let n = classifyQuerySource(querySource);
  return n === "main" || n === "subagent" ? n : null;
}
//@ chunk-e6aww6q8.js:2605510-2605522 placement
var MAX_TRACKED_IDS = 128;
//@ chunk-e6aww6q8.js:2605522-2605675 placement
function threadPrefixHashes(e) {
  return {
    model: computeHash(e.model),
    system: computeHash(e.system.filter((n) => !isUncachedSystemBlock(n)).map((n) => n.text)),
    tools: computeHash(e.toolSchemas),
    thinking: computeHash(e.thinkingConfig),
  };
}
//@ chunk-e6aww6q8.js:2605675-2607563 placement
/**
 * 决定本次请求能否作为线程续接（tether）发送：首个请求、无续接指针、配置变化、历史被改写都不能续接。
 */
function decideTetherContinuation() {
  let e = new Map();
  function n(h) {
    let y = threadSourceKind(h.querySource);
    if (y === null) return null;
    let S = formatZodErrors(h.agentId);
    let w = y === "main" ? takePendingConversationEdits() : [];
    let L = threadPrefixHashes(h);
    let G = {
      model: L.model,
      system: computeHash([
        L.system,
        h.system.filter((We) => !isUncachedSystemBlock(We)).map((We) => We.cache_control ?? null),
      ]),
      tools: L.tools,
      thinking: L.thinking,
      betas: computeHash([...h.betas].sort()),
      latchedHeaders: computeHash(h.latchedHeaders),
      toolChoice: computeHash(h.toolChoice ?? null),
      effort: computeHash(h.effortValue ?? null),
      extraBody: computeHash(h.extraBodyParams ?? null),
    };
    let messageHashes = h.getMessageHashes();
    let Z = e.get(S);
    let Se = Z?.messageHashes.length ?? 0;
    let ke = Z ? THREAD_INHERITED_FIELDS.filter((We) => G[We] !== Z.configHashes[We]) : [];
    let we;
    let Ee = -1;
    if (!Z) we = "first_request";
    else if (h.previousMessageId === undefined) we = "no_continue_pointer";
    else if (ke.length > 0) we = "config_changed";
    else {
      Ee = Z.messageHashes.findIndex(
        (messageHash, ze) =>
          messageHash !== EPHEMERAL_MESSAGE_MARK &&
          ze < messageHashes.length &&
          messageHashes[ze] !== messageHash,
      );
      if (Ee !== -1) we = "history_reshaped";
      else if (messageHashes.length <= Z.messageHashes.length) we = "history_rewound";
      else we = "append";
    }
    let Ae = we === "append" ? "continue" : "create";
    let turnsInThread = Ae === "continue" && Z ? Z.turnsInThread + 1 : 1;
    let evictedOther = false;
    if (e.has(S)) e.delete(S);
    else if (e.size >= MAX_TRACKED_IDS) {
      for (let key of e.keys())
        if (key !== ROOT_2) {
          e.delete(key);
          evictedOther = true;
          break;
        }
    }
    e.set(S, {
      configHashes: G,
      boundSystemHash: L.system,
      messageHashes,
      turnsInThread,
    });
    return {
      decision: Ae,
      reason: we,
      sourceCategory: y,
      evictedOther,
      changedConfigFields: ke,
      turnsInThread,
      messageCount: messageHashes.length,
      prevMessageCount: Se,
      firstChangedIndex: Ee,
      deltaMessageCount: Ae === "continue" ? messageHashes.length - Se : 0,
      historyEditClaims: Z ? w : [],
    };
  }
  function r(h, y, S, w) {
    let L = e.get(h);
    if (
      L === undefined ||
      w > L.messageHashes.length ||
      y.model !== L.configHashes.model ||
      y.system !== L.boundSystemHash ||
      y.tools !== L.configHashes.tools ||
      y.thinking !== L.configHashes.thinking
    )
      return false;
    let G = S();
    if (w > G.length) return false;
    if (w < L.messageHashes.length && G[w] !== L.messageHashes[w]) return false;
    for (let idx = 0; idx < w; idx++) {
      let Z = L.messageHashes[idx];
      if (Z !== EPHEMERAL_MESSAGE_MARK && G[idx] !== Z) return false;
    }
    return true;
  }
  function s(h) {
    e.delete(formatZodErrors(h));
  }
  return {
    evaluate: n,
    sentThreadPrefix: r,
    forget: s,
  };
}
//@ chunk-e6aww6q8.js:2607563-2607628 placement
function evaluateTetherContinuation() {
  let e = streamFallbackWarning();
  return (e.threadDecisionTracker ??= decideTetherContinuation());
}
//@ chunk-e6aww6q8.js:2607628-2607766 placement
/**
 * 子代理结束时清除其线程决策、工具哈希等线程状态。
 */
function forgetAgentThread(agentId) {
  let n = streamFallbackWarning();
  n.threadDecisionTracker?.forget(agentId);
  n.threadInheritedFields.storedToolsHashByThread.delete(formatZodErrors(agentId));
  clearThreadArmed(agentId);
  clearThreadRequestEnd(agentId);
}
//@ chunk-e6aww6q8.js:2607766-2607941 placement
function createSentPrefixChecker(e) {
  let n;
  return (r, s) => {
    try {
      let threadDecisionTracker = streamFallbackWarning().threadDecisionTracker;
      return (
        threadDecisionTracker !== undefined &&
        threadDecisionTracker.sentThreadPrefix(r, (n ??= threadPrefixHashes(e)), e.getMessageHashes, s)
      );
    } catch (error) {
      logError(toError(error));
      return false;
    }
  };
}
//@ chunk-e6aww6q8.js:2607941-2608002 placement
function logTetherDecisionSafely(e) {
  try {
    return logTetherDecision(e);
  } catch (error) {
    logError(error);
    return null;
  }
}
//@ chunk-e6aww6q8.js:2608002-2609515 placement
/**
 * 记录 tether 续接决策遥测。
 */
function logTetherDecision(e) {
  if (!isTetherLive()) return null;
  let n = evaluateTetherContinuation().evaluate(e);
  if (!n) return null;
  if (n.decision !== "continue") resetThreadHealState(e.agentId);
  let r = {
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
  for (let changedConfigField of n.changedConfigFields) r[changedConfigField] = true;
  let s = {
    compact: false,
    snip: false,
    tool_result_clear: false,
    rewind: false,
    clear: false,
    abort_strip: false,
  };
  for (let historyEditClaim of n.historyEditClaims) s[historyEditClaim] = true;
  let h = n.reason === "history_reshaped" || n.reason === "history_rewound";
  logEvent("tengu_tether_decision", {
    decision: fromEnum(n.decision),
    reason: fromEnum(n.reason),
    sourceCategory: fromEnum(n.sourceCategory),
    threadUnsupported: isThreadUnsupported(e.agentId, e.model),
    modelHeldStateless: e.modelHeldStateless,
    relayHeldStateless: e.relayHeldStateless,
    classifierHeldStateless: e.classifierHeldStateless,
    creditRetryStateless: e.creditRetryStateless,
    dropHeldStateless: e.dropHeldStateless,
    evictedOther: n.evictedOther,
    changedModel: r.model,
    changedSystem: r.system,
    changedTools: r.tools,
    changedBetas: r.betas,
    changedLatchedHeaders: r.latchedHeaders,
    changedThinking: r.thinking,
    changedToolChoice: r.toolChoice,
    changedEffort: r.effort,
    changedExtraBody: r.extraBody,
    turnsInThread: n.turnsInThread,
    messageCount: n.messageCount,
    prevMessageCount: n.prevMessageCount,
    firstChangedIndex: n.firstChangedIndex,
    deltaMessageCount: n.deltaMessageCount,
    claimedCompact: s.compact,
    claimedSnip: s.snip,
    claimedToolResultClear: s.tool_result_clear,
    claimedRewind: s.rewind,
    claimedClear: s.clear,
    claimedAbortStrip: s.abort_strip,
    unclaimedHistoryChange: n.sourceCategory === "main" && h && n.historyEditClaims.length === 0,
  });
  return n;
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
function hasStructuralEchoDiff(effort, n) {
  if (n === undefined) return false;
  let r = effort.classesById.get(n);
  if (r === undefined) return false;
  return STRUCTURAL_ECHO_DIFFS.some((s) => r.has(s));
}
//@ chunk-e6aww6q8.js:2610017-2610262 placement
function blockShape(e) {
  let n = e.type === "tool_use" || e.type === "server_tool_use" || e.type === "mcp_tool_use";
  return {
    type: e.type,
    id: n && typeof e.id === "string" ? e.id : undefined,
    name: n && typeof e.name === "string" ? e.name : undefined,
    hasCaller: "caller" in e && e.caller !== undefined,
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
function assistantBlockShapes(e) {
  let n = blockShapes(e.message.content);
  let batchToolUses = e.batchToolUses;
  if (!batchToolUses || batchToolUses.length === 0) return n;
  let s = new Map(batchToolUses.map((batchToolUse) => [batchToolUse.id, batchToolUse]));
  let h = [];
  let y = new Set();
  for (let S of n) {
    let w = S.id === undefined ? undefined : stripSuffixNumber(S.id);
    let L = w === undefined ? undefined : s.get(w);
    if (!L) h.push(S);
    else if (!y.has(L.id)) {
      y.add(L.id);
      h.push({
        type: "tool_use",
        id: L.id,
        name: L.name,
        hasCaller: S.hasCaller,
      });
    }
  }
  return h;
}
//@ chunk-e6aww6q8.js:2610705-2610769 placement
function blockKey(e) {
  return e.id !== undefined ? `${e.type}#${e.id}` : e.type;
}
//@ chunk-e6aww6q8.js:2610769-2610862 placement
function countBlockKeys(e) {
  let n = new Map();
  for (let r of e) {
    let s = blockKey(r);
    n.set(s, (n.get(s) ?? 0) + 1);
  }
  return n;
}
//@ chunk-e6aww6q8.js:2610862-2610984 placement
function matchedBlockKeys(e, n) {
  let r = new Map(n);
  let s = [];
  for (let h of e) {
    let y = blockKey(h);
    let S = r.get(y) ?? 0;
    if (S > 0) {
      s.push(y);
      r.set(y, S - 1);
    }
  }
  return s;
}
//@ chunk-e6aww6q8.js:2610984-2612031 placement
/**
 * 对比两次请求，分类新增的内容（工具调用、轮询、其他），供 tether 判断。
 */
function classifyAddedContent(e, shapes) {
  let r = new Set();
  let s = countBlockKeys(e);
  let h = countBlockKeys(shapes);
  for (let G of shapes) {
    let q = blockKey(G);
    if ((h.get(q) ?? 0) > (s.get(q) ?? 0))
      if (G.id === undefined) r.add("added_other");
      else if (isTaskId(G.id)) r.add("added_tool_use_gettask");
      else if (G.id.startsWith(POLL_2)) r.add("added_tool_use_poll");
      else r.add("added_tool_use_other");
  }
  for (let G of e) {
    let q = blockKey(G);
    if ((s.get(q) ?? 0) > (h.get(q) ?? 0))
      switch (G.type) {
        case "tool_use":
        case "server_tool_use":
        case "mcp_tool_use":
          r.add("dropped_tool_use");
          break;
        case "thinking":
        case "redacted_thinking":
          r.add("dropped_thinking");
          break;
        case "text":
          r.add("dropped_text");
          break;
        default:
          r.add("dropped_other");
      }
  }
  let y = new Map();
  for (let [G, q] of s) {
    let Z = h.get(G) ?? 0;
    if (Z > 0) y.set(G, Math.min(q, Z));
  }
  let S = matchedBlockKeys(e, y);
  let w = matchedBlockKeys(shapes, y);
  for (let idx = 0; idx < S.length; idx++)
    if (S[idx] !== w[idx]) {
      r.add("reordered");
      break;
    }
  let L = new Map();
  for (let G of e) if (G.id !== undefined) L.set(G.id, G);
  for (let G of shapes) {
    if (G.id === undefined) continue;
    let q = L.get(G.id);
    if (!q) continue;
    if (q.name !== undefined && G.name !== undefined && q.name !== G.name) r.add("tool_name_changed");
    if (q.hasCaller && !G.hasCaller) r.add("caller_dropped");
  }
  return r;
}
//@ chunk-e6aww6q8.js:2612031-2612836 placement
/**
 * 对比本地发送的 assistant 回合与服务端线程回显的内容：按消息 id 聚合块形状，统计重排、拆分、丢失、增删工具调用、thinking/文本丢失等差异类别。
 */
function auditTetherEcho(sent, echoed) {
  let r = new Map();
  let s = [];
  for (let G of sent) {
    if (G.type !== "assistant" || G.isVirtual || !isRealApiResponse(G)) continue;
    let id = G.message.id;
    if (typeof id !== "string" || id.length === 0) continue;
    let Z = r.get(id);
    if (!Z) {
      Z = [];
      r.set(id, Z);
      s.push(id);
    }
    Z.push(...assistantBlockShapes(G));
  }
  let h = new Map();
  for (let G of echoed) {
    if (G.type !== "assistant") continue;
    let id = G.message.id;
    if (typeof id !== "string" || !r.has(id)) continue;
    let Z = h.get(id);
    if (!Z) {
      Z = {
        shapes: [],
        messages: 0,
      };
      h.set(id, Z);
    }
    Z.messages++;
    Z.shapes.push(...blockShapes(G.message.content));
  }
  let y = emptyEchoDiffs();
  let S = 0;
  let w = [];
  let L = new Map();
  for (let G of s) {
    let q = r.get(G) ?? [];
    let Z = h.get(G);
    let Se = Z ? classifyAddedContent(q, Z.shapes) : new Set(["turn_dropped"]);
    if (Z && Z.messages > 1) Se.add("turn_split");
    if (Se.size === 0) {
      S++;
      continue;
    }
    w.push(G);
    L.set(G, Se);
    for (let ke of Se) y[ke]++;
  }
  return {
    turnsReceived: s.length,
    turnsIdentical: S,
    diffs: y,
    divergedMessageIds: w,
    classesById: L,
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
  let r = messages.length - 1;
  let s = new Map();
  let h = new Set();
  let y;
  messages.forEach((message, w) => {
    if (message.type !== "api_system") return;
    let L = message.ephemeral ? message.message.content : message.ephemeralSuffix;
    if (L === undefined || !(clearAtNextUser || (message.reminderFromRecords && w !== r))) return;
    if (clearAtNextUser && L.trim() !== "") s.set(w, L);
    let content = message.ephemeral ? "" : message.message.content;
    if (
      content === "" &&
      !message.toolAdditions?.length &&
      !message.toolRemovals?.length &&
      message.outputConfig === undefined
    )
      h.add(w);
    y ??= [...messages];
    y[w] = {
      ...message,
      message: {
        ...message.message,
        content,
      },
      ephemeral: undefined,
      ephemeralSuffix: undefined,
    };
  });
  return y === undefined
    ? undefined
    : {
        messages: y,
        clearAtAfter: s,
        dropBase: h,
      };
}
//@ chunk-e6aww6q8.js:2614300-2614553 placement
function buildWireWithClearAt(e, n) {
  let r = [];
  let s = [];
  e.forEach((h, y) => {
    s.push(r.length);
    if (!n.dropBase.has(y)) r.push(h);
    let S = n.clearAtAfter.get(y);
    if (S !== undefined)
      r.push({
        role: "system",
        content: S,
        clear_at: "next_user_message",
      });
  });
  s.push(r.length);
  return {
    wire: r,
    wireIndexOf: s,
  };
}
//@ chunk-e6aww6q8.js:2614553-2614712 placement
/**
 * ATIS 不一致时重新拉取 bootstrap 的参数：最小间隔 300 s（30–86400）、最大抖动 180 s（0–3600）与开关名、拉取时间槽。
 */
var X_CC_ATIS_CURRENT = "x-cc-atis-current";
var DEFAULT_ATIS_MIN_INTERVAL_S = 300;
var ATIS_MIN_INTERVAL_RANGE = {
  min: 30,
  max: 86400,
};
var DEFAULT_ATIS_MAX_JITTER_S = 180;
var ATIS_MAX_JITTER_RANGE = {
  min: 0,
  max: 3600,
};
var TENGU_EXPRESSIVE_WHISTLE_CONFIG = "tengu_expressive_whistle_config";
var atisRefetchStateSlot = new HostScoped(() => ({
  nextFetchAt: 0,
}));
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
    let s = headers.get(X_CC_ATIS_CURRENT);
    if (!s) return;
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
    let y = atisPin(s);
    if (y === atisPin(clientDataAtis)) return;
    let S = atisRefetchState();
    let now = Date.now();
    if (now < S.nextFetchAt) return;
    let { minIntervalMs, maxJitterMs } = staleRefetchTiming();
    let q = Math.random() * maxJitterMs;
    S.nextFetchAt = now + q + minIntervalMs;
    let { bootstrapFetchCanConvergeSlot, refreshBootstrapData } = await import("./chunk-1qx2v2vg.js");
    if (!bootstrapFetchCanConvergeSlot()) return;
    logForDebugging("[Bootstrap] Server ATIS pin differs from cached clientData; refetching");
    await sleep(q, undefined, {
      unref: true,
    });
    let outcome = lit_2("skipped_converged");
    if (clientDataAtisPin() !== y)
      outcome = !(await refreshBootstrapData(request.storageV5, request.credentials, {
        keepRenderCaches: true,
      }))
        ? lit_2("fetch_failed")
        : clientDataAtisPin() === y
          ? lit_2("fetched_converged")
          : lit_2("fetched_pins_differ");
    logEvent("tengu_client_data_stale_refetch", {
      outcome,
      server_has_pin: y !== "none",
      min_interval_ms: minIntervalMs,
      jitter_ms: Math.round(q),
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
function clampNumber(e, n, r) {
  return typeof e === "number" && Number.isFinite(e) ? Math.min(Math.max(e, r.min), r.max) : n;
}
//@ chunk-e6aww6q8.js:2616006-2616063 placement
class TetherHealSpendState {
  handlers = undefined;
  spent = undefined;
  lapsedAtMs = undefined;
}
//@ chunk-e6aww6q8.js:2616063-2616090 placement
var tetherHealSpendSlot = new HostScoped(() => new TetherHealSpendState());
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
