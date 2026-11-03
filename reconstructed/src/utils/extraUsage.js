/**
 * utils/extraUsage.ts
 *
 * 判断订阅用户的请求是否按额外用量（extra usage）计费。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/extraUsage.ts
 * pieces: chunk-d1cgs5na.js (1)
 * attribution: fingerprint 1
 */
import { isClaudeAISubscriber } from "./auth.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { supportsFastMode } from "./fastMode.js";
import { usageCreditsBillingState } from "./planTiers.js";
import { has1mSuffix } from "./model/contextWindow1m.js";

/**
 * 订阅用户某次请求是否按额外用量（extra usage）计费：fast 模式、模型不在计划内，或 Opus/Sonnet 4.6 长上下文等情况。
 */
//@ chunk-d1cgs5na.js:1188-1502 fingerprint = isBilledAsExtraUsage (0.61)
function isBilledAsExtraUsage(model, isFastMode, isOpus1mMerged) {
  if (!isClaudeAISubscriber()) return !1;
  let a = model !== null ? parseUserSpecifiedModel(model) : getDefaultMainLoopModel(),
    lower = a.toLowerCase(),
    l = lower.includes("opus") || lower.includes("fable"),
    included = lower.includes("opus-4-6"),
    included_2 = lower.includes("sonnet-4-6");
  if (isFastMode && supportsFastMode(model)) return !0;
  let u = usageCreditsBillingState(a);
  if (u !== "pay_per_request" && u !== "included_in_plan") return !0;
  if (!has1mSuffix(lower)) return !1;
  if (l && isOpus1mMerged) return !1;
  return included || included_2;
}

export { isBilledAsExtraUsage };
