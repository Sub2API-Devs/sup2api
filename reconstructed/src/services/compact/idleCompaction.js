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
import { NO_BREAK_SPACE } from "../../utils/permissions/autoModeRulesPrompt.js";
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

//@ chunk-e6aww6q8.js:1659046-1659291 placement
/**
 * 缓存被认为已失效的空闲时长（60 秒）。
 */
var IDLE_COMPACT_MIN_TOKENS = 200000;
var MIN_IDLE_COMPACT_TOKENS = 1e5;
var IDLE_COMPACT_AGE_FRACTION = 0.9;
var CACHE_LAPSED_MS = 60000;
var IDLE_COMPACT_OFF_HINT = ` \xB7${NO_BREAK_SPACE}turn off with "idleCompaction": false in settings.json`;
var COMPACTED_WHILE_IDLE_TEXT = `Compacted while idle, before the prompt cache expired${IDLE_COMPACT_OFF_HINT}`;
var COMPACTED_WITH_PRECOMPUTED_TEXT = `Compacted using a summary written while you were away${IDLE_COMPACT_OFF_HINT}`;
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
function idleCompactionSkipReason(e, n, r, s, h) {
  if (!isAutoCompactEnabled()) return "compaction_off";
  if (!isIdleCompactionEnabled()) return "idle_compaction_off";
  if (e && !isPrecomputeCompactionEnabled()) return "precompute_compaction_off";
  if (e && !canCompactInRemote()) return "swap_unsupported";
  if (!h) return "prefix_changed";
  if (getLastMainThreadCacheTtlMs() !== CACHE_TTL_1H_MS) return "not_one_hour";
  if (!getPromptCacheSummary().warm || n > CACHE_LAPSED_MS) return "lapsed";
  if (r < getIdleCompactMinTokens()) return "small";
  if ((getLastMainThreadRequestAt() ?? 0) > s) return "newer_request";
  if (getCurrentLimits().status !== "allowed") return "near_limit";
  return null;
}
//@ chunk-e6aww6q8.js:1659768-1659819 placement
/**
 * 等待一个异步动作并吞掉错误（只记日志）。
 */
async function awaitSwallowingErrors(e) {
  try {
    await e();
  } catch (error) {
    logError(error);
  }
}
//@ chunk-e6aww6q8.js:1659819-1659974 placement
/**
 * 等待空闲压缩结果并分类（not_compacted/cancelled/failed）。
 */
async function settleIdleCompaction(e, n) {
  try {
    let r = await e;
    return {
      result: r === null ? "not_compacted" : n,
      sizes: r,
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
async function reportIdleCompaction(e, n, r) {
  let { result: s, sizes } = await settleIdleCompaction(e, r);
  logEvent("tengu_idle_compact_settled", {
    result: fromEnum(s),
    durationMs: Date.now() - n,
    tokensBefore: sizes?.tokensBefore,
    tokensAfter: sizes?.tokensAfter,
  });
  if (s === r) logFeatureOk("compact_idle");
  else if (s === "failed") logFeatureBad("compact_idle", s);
  else logFeatureSad("compact_idle", s);
}
//@ chunk-e6aww6q8.js:1660256-1661123 placement
/**
 * 空闲压缩触发：摘要并压缩对话。
 */
class fireIdleCompaction {
  host = null;
  summarize = null;
  #e = null;
  arm(e, n) {
    awaitSwallowingErrors(() => this.#t(e, n));
  }
  #t(e, n) {
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
    let s =
      promptCacheSummary.lastActivityAt +
      (promptCacheSummary.expiresAt - promptCacheSummary.lastActivityAt) * IDLE_COMPACT_AGE_FRACTION;
    this.#e = setTimeout(
      (h, y, S) => void awaitSwallowingErrors(() => this.#n(h, y, S)),
      Math.max(0, s - Date.now()),
      e,
      s,
      n,
    );
    this.#e.unref?.();
  }
  async #n(e, n, r) {
    this.#e = null;
    let now = Date.now();
    let max = Math.max(0, now - n);
    let cacheLeftMs = (getMainThreadCacheExpiresAt() ?? now) - now;
    let { host, summarize } = this;
    let L = getLastMainThreadContextTokens() ?? 0;
    let G = r();
    let q = host === null;
    let Z = host ? () => host.compact() : summarize && G && (() => summarize(G));
    let Se =
      idleCompactionSkipReason(q, max, L, e, G !== null) ??
      (Z ? ((await host?.refusal()) ?? "started") : "no_host");
    logEvent("tengu_idle_compact_fired", {
      outcome: fromEnum(Se),
      cacheLeftMs,
      contextTokens: L,
      minTokens: getIdleCompactMinTokens(),
      lateMs: max,
      sinceTurnEndMs: now - e,
    });
    if (Se === "started" && Z)
      await reportIdleCompaction(Promise.resolve().then(Z), now, q ? "summarized" : "compacted");
  }
}
//@ chunk-e6aww6q8.js:1661123-1661151 placement
/**
 * 按会话根保存的空闲压缩触发器。
 */
var idleCompactionSlot = new SessionRootSlot(() => new fireIdleCompaction());
export { idleCompactionSlot, COMPACTED_WHILE_IDLE_TEXT, COMPACTED_WITH_PRECOMPUTED_TEXT };
