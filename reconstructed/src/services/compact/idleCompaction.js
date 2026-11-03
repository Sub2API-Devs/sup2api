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
import { k_r } from "../../utils/permissions/autoModeRulesPrompt.js";
import { env } from "../../utils/env.js";
import { isAutoCompactEnabled, isIdleCompactionEnabled, OYr, canCompactInRemote } from "./compactSettings.js";
import {
  getLastMainThreadCacheTtlMs,
  getLastMainThreadRequestAt,
  getLastMainThreadContextTokens,
} from "../../bootstrap/state.js";
import { oR, getPromptCacheSummary } from "../api/promptCacheBreakDetection.js";
import { getCurrentLimits } from "../claudeAiLimits.js";
import { logError } from "../../utils/log.js";
import { isAbortError } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import { logFeatureOk, logFeatureBad, logFeatureSad } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { envSessionKind as envSessionKind_2 } from "../../utils/sessionShape.js";
import { dke } from "./autoCompact.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";

/**
 * 空闲压缩的阈值与提示文案。
 */
//@ chunk-e6aww6q8.js:1659046-1659291 placement
var IDLE_COMPACT_MIN_TOKENS = 200000,
  W3o = 1e5,
  G3o = 0.9,
  z3o = 60000,
  IDLE_COMPACT_OFF_HINT = ` \xB7${k_r}turn off with "idleCompaction": false in settings.json`,
  COMPACTED_WHILE_IDLE_TEXT = `Compacted while idle, before the prompt cache expired${IDLE_COMPACT_OFF_HINT}`,
  COMPACTED_WITH_PRECOMPUTED_TEXT = `Compacted using a summary written while you were away${IDLE_COMPACT_OFF_HINT}`;
//@ chunk-e6aww6q8.js:1659291-1659370 placement
function EZt() {
  return Math.max(W3o, env.CLAUDE_CODE_IDLE_COMPACT_MIN_TOKENS ?? IDLE_COMPACT_MIN_TOKENS);
}
/**
 * 空闲压缩不执行的原因（关闭、缓存非 1 小时、已失效、太小、有新请求、接近额度等）。
 */
//@ chunk-e6aww6q8.js:1659370-1659768 placement
function idleCompactionSkipReason(e, n, r, s, h) {
  if (!isAutoCompactEnabled()) return "compaction_off";
  if (!isIdleCompactionEnabled()) return "idle_compaction_off";
  if (e && !OYr()) return "precompute_compaction_off";
  if (e && !canCompactInRemote()) return "swap_unsupported";
  if (!h) return "prefix_changed";
  if (getLastMainThreadCacheTtlMs() !== oR) return "not_one_hour";
  if (!getPromptCacheSummary().warm || n > z3o) return "lapsed";
  if (r < EZt()) return "small";
  if ((getLastMainThreadRequestAt() ?? 0) > s) return "newer_request";
  if (getCurrentLimits().status !== "allowed") return "near_limit";
  return null;
}
//@ chunk-e6aww6q8.js:1659768-1659819 placement
async function TZt(e) {
  try {
    await e();
  } catch (error) {
    logError(error);
  }
}
/**
 * 等待空闲压缩结果并分类（not_compacted/cancelled/failed）。
 */
//@ chunk-e6aww6q8.js:1659819-1659974 placement
async function settleIdleCompaction(e, n) {
  try {
    let r = await e;
    return { result: r === null ? "not_compacted" : n, sizes: r };
  } catch (error) {
    return { result: isAbortError(error) ? "cancelled" : "failed", sizes: null };
  }
}
/**
 * 记录空闲压缩结果遥测。
 */
//@ chunk-e6aww6q8.js:1659974-1660256 placement
async function reportIdleCompaction(e, n, r) {
  let { result: s, sizes: sizes } = await settleIdleCompaction(e, r);
  if (
    (logEvent("tengu_idle_compact_settled", {
      result: fromEnum(s),
      durationMs: Date.now() - n,
      tokensBefore: sizes?.tokensBefore,
      tokensAfter: sizes?.tokensAfter,
    }),
    s === r)
  )
    logFeatureOk("compact_idle");
  else if (s === "failed") logFeatureBad("compact_idle", s);
  else logFeatureSad("compact_idle", s);
}
/**
 * 空闲压缩触发：摘要并压缩对话。
 */
//@ chunk-e6aww6q8.js:1660256-1661123 placement
class fireIdleCompaction {
  host = null;
  summarize = null;
  #e = null;
  arm(e, n) {
    TZt(() => this.#t(e, n));
  }
  #t(e, n) {
    if (this.#e !== null) (clearTimeout(this.#e), (this.#e = null));
    if (!envSessionKind_2() || getLastMainThreadCacheTtlMs() !== oR) return;
    let r = getPromptCacheSummary();
    if (r.lastRequest?.ttl !== "1h" || r.lastActivityAt === null || r.expiresAt === null) return;
    let s = r.lastActivityAt + (r.expiresAt - r.lastActivityAt) * G3o;
    ((this.#e = setTimeout(
      (h, y, S) => void TZt(() => this.#n(h, y, S)),
      Math.max(0, s - Date.now()),
      e,
      s,
      n,
    )),
      this.#e.unref?.());
  }
  async #n(e, n, r) {
    this.#e = null;
    let now = Date.now(),
      max = Math.max(0, now - n),
      y = (dke() ?? now) - now,
      { host: host, summarize: summarize } = this,
      L = getLastMainThreadContextTokens() ?? 0,
      G = r(),
      q = host === null,
      Z = host ? () => host.compact() : summarize && G && (() => summarize(G)),
      Se =
        idleCompactionSkipReason(q, max, L, e, G !== null) ??
        (Z ? ((await host?.refusal()) ?? "started") : "no_host");
    if (
      (logEvent("tengu_idle_compact_fired", {
        outcome: fromEnum(Se),
        cacheLeftMs: y,
        contextTokens: L,
        minTokens: EZt(),
        lateMs: max,
        sinceTurnEndMs: now - e,
      }),
      Se === "started" && Z)
    )
      await reportIdleCompaction(Promise.resolve().then(Z), now, q ? "summarized" : "compacted");
  }
}
//@ chunk-e6aww6q8.js:1661123-1661151 placement
var dWt = new SessionRootSlot(() => new fireIdleCompaction());

export { dWt, COMPACTED_WHILE_IDLE_TEXT, COMPACTED_WITH_PRECOMPUTED_TEXT };
