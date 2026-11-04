/**
 * services/compact/idleCompaction.ts
 *
 * 2.1.316 新增：空闲时自动压缩
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (8)
 * attribution: placement 8
 */
import { NO_BREAK_SPACE } from "../../constants/figures.js";
import { env } from "../../utils/env.js";
import {
  isAutoCompactEnabled,
  isIdleCompactionEnabled,
  isPrecomputeCompactionEnabled,
  canCompactInRemote,
} from "./compactSettings.js";
import {
  getLastMainThreadCacheTtlMs,
  getLastMainThreadRequestAt,
  getLastMainThreadContextTokens,
} from "../../bootstrap/state.js";
import { CACHE_TTL_1H_MS, getPromptCacheSummary } from "../api/promptCacheBreakDetection.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { logError } from "../../utils/log.js";
import { isAbortError } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { envSessionKind as envSessionKind_2 } from "../../utils/sessionShape.js";
import { getMainThreadCacheExpiresAt } from "./autoCompact.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1659046-1659291 placement
/**
 * 缓存被认为已失效的空闲时长（60 秒）。
 */
var IDLE_COMPACT_MIN_TOKENS; // deferred: uses HEAVY_VERTICAL_BAR_GLYPH (../../constants/figures.js) of its import cycle while loading; runs once the cycle is complete
var MIN_IDLE_COMPACT_TOKENS;
var IDLE_COMPACT_AGE_FRACTION;
var CACHE_LAPSED_MS;
var IDLE_COMPACT_OFF_HINT;
var COMPACTED_WHILE_IDLE_TEXT;
var COMPACTED_WITH_PRECOMPUTED_TEXT;
deferInit("chunk-e6aww6q8.js:1659046", () => {
  IDLE_COMPACT_MIN_TOKENS = 200000;
  MIN_IDLE_COMPACT_TOKENS = 1e5;
  IDLE_COMPACT_AGE_FRACTION = 0.9;
  CACHE_LAPSED_MS = 60000;
  IDLE_COMPACT_OFF_HINT = ` \xB7${NO_BREAK_SPACE}turn off with "idleCompaction": false in settings.json`;
  COMPACTED_WHILE_IDLE_TEXT = `Compacted while idle, before the prompt cache expired${IDLE_COMPACT_OFF_HINT}`;
  COMPACTED_WITH_PRECOMPUTED_TEXT = `Compacted using a summary written while you were away${IDLE_COMPACT_OFF_HINT}`;
});
//@ chunk-e6aww6q8.js:1659291-1659370 placement
/**
 * 空闲压缩的最小 token 数（环境变量可覆盖，且不低于 W3o）。
 */
function getIdleCompactMinTokens() {
  return Math.max(
    MIN_IDLE_COMPACT_TOKENS,
    env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS ?? IDLE_COMPACT_MIN_TOKENS,
  );
}
//@ chunk-e6aww6q8.js:1659370-1659768 placement
/**
 * 空闲压缩不执行的原因（关闭、缓存非 1 小时、已失效、太小、有新请求、接近额度等）。
 */
function idleCompactionSkipReason(precomputeWanted, lateMs, contextTokens, lastRequestAt, hasSummarize) {
  if (!isAutoCompactEnabled()) return "compaction_off";
  if (!isIdleCompactionEnabled()) return "idle_compaction_off";
  if (precomputeWanted && !isPrecomputeCompactionEnabled()) return "precompute_compaction_off";
  if (precomputeWanted && !canCompactInRemote()) return "swap_unsupported";
  if (!hasSummarize) return "prefix_changed";
  if (getLastMainThreadCacheTtlMs() !== CACHE_TTL_1H_MS) return "not_one_hour";
  if (!getPromptCacheSummary().warm || lateMs > CACHE_LAPSED_MS) return "lapsed";
  if (contextTokens < getIdleCompactMinTokens()) return "small";
  if ((getLastMainThreadRequestAt() ?? 0) > lastRequestAt) return "newer_request";
  if (getCurrentLimits().status !== "allowed") return "near_limit";
  return null;
}
//@ chunk-e6aww6q8.js:1659768-1659819 placement
/**
 * 等待一个异步动作并吞掉错误（只记日志）。
 */
async function awaitSwallowingErrors(fn) {
  try {
    await fn();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1659819-1659974 placement
/**
 * 等待空闲压缩结果并分类（not_compacted/cancelled/failed）。
 */
async function settleIdleCompaction(promise, successResult) {
  try {
    let sizes = await promise;
    return {
      result: sizes === null ? "not_compacted" : successResult,
      sizes,
    };
  } catch (error) {
    return {
      result: isAbortError(error) ? "cancelled" : "failed",
      sizes: null,
    };
  }
}
//@ chunk-e6aww6q8.js:1659974-1660256 placement
/**
 * 记录空闲压缩结果遥测。
 */
async function reportIdleCompaction(promise, startMs, successResult) {
  let { result, sizes } = await settleIdleCompaction(promise, successResult);
  logEvent("tengu_idle_compact_settled", {
    result: fromEnum(result),
    durationMs: Date.now() - startMs,
    tokensBefore: sizes?.tokensBefore,
    tokensAfter: sizes?.tokensAfter,
  });
  if (result === successResult) logFeatureOk("compact_idle");
  else if (result === "failed") logFeatureBad("compact_idle", result);
  else logFeatureSad("compact_idle", result);
}
//@ chunk-e6aww6q8.js:1660256-1661123 placement
/**
 * 空闲压缩触发：摘要并压缩对话。
 */
class fireIdleCompaction {
  host = null;
  summarize = null;
  #e = null;
  arm(idleStartedAt, getSummarize) {
    awaitSwallowingErrors(() => this.#t(idleStartedAt, getSummarize));
  }
  #t(idleStartedAt, getSummarize) {
    if (this.#e !== null) {
      clearTimeout(this.#e);
      this.#e = null;
    }
    if (!envSessionKind_2() || getLastMainThreadCacheTtlMs() !== CACHE_TTL_1H_MS) return;
    let promptCacheSummary = getPromptCacheSummary();
    if (
      promptCacheSummary.lastRequest?.ttl !== "1h" ||
      promptCacheSummary.lastActivityAt === null ||
      promptCacheSummary.expiresAt === null
    )
      return;
    let fireAt =
      promptCacheSummary.lastActivityAt +
      (promptCacheSummary.expiresAt - promptCacheSummary.lastActivityAt) * IDLE_COMPACT_AGE_FRACTION;
    this.#e = setTimeout(
      (idleStartedAt, fireAt, getSummarize) =>
        void awaitSwallowingErrors(() => this.#n(idleStartedAt, fireAt, getSummarize)),
      Math.max(0, fireAt - Date.now()),
      idleStartedAt,
      fireAt,
      getSummarize,
    );
    this.#e.unref?.();
  }
  async #n(idleStartedAt, fireAt, getSummarize) {
    this.#e = null;
    let now = Date.now();
    let max = Math.max(0, now - fireAt);
    let cacheLeftMs = (getMainThreadCacheExpiresAt() ?? now) - now;
    let { host, summarize } = this;
    let contextTokens = getLastMainThreadContextTokens() ?? 0;
    let summarySource = getSummarize();
    let noHost = host === null;
    let runCompact = host
      ? () => host.compact()
      : summarize && summarySource && (() => summarize(summarySource));
    let outcome =
      idleCompactionSkipReason(noHost, max, contextTokens, idleStartedAt, summarySource !== null) ??
      (runCompact ? ((await host?.refusal()) ?? "started") : "no_host");
    logEvent("tengu_idle_compact_fired", {
      outcome: fromEnum(outcome),
      cacheLeftMs,
      contextTokens,
      minTokens: getIdleCompactMinTokens(),
      lateMs: max,
      sinceTurnEndMs: now - idleStartedAt,
    });
    if (outcome === "started" && runCompact)
      await reportIdleCompaction(
        Promise.resolve().then(runCompact),
        now,
        noHost ? "summarized" : "compacted",
      );
  }
}
//@ chunk-e6aww6q8.js:1661123-1661151 placement
/**
 * 按会话根保存的空闲压缩触发器。
 */
var idleCompactionSlot; // deferred: uses SessionRootSlot (../../bootstrap/sessionSlices.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:1661123", () => {
  idleCompactionSlot = new SessionRootSlot(() => new fireIdleCompaction());
});
export { idleCompactionSlot, COMPACTED_WHILE_IDLE_TEXT, COMPACTED_WITH_PRECOMPUTED_TEXT };
