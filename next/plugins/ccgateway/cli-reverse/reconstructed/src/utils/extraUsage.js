/**
 * utils/extraUsage.ts
 *
 * 判断订阅用户的请求是否按额外用量（extra usage）计费。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/extraUsage.ts
 * pieces: chunk-wefvmrb3.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isClaudeAISubscriber } from "./auth.js";
import { parseUserSpecifiedModel } from "./model/modelDisplay.js";
import { getDefaultMainLoopModel } from "./model/modelFallback.js";
import { supportsFastMode } from "./fastMode.js";
import { usageCreditsBillingState } from "./planTiers.js";
import { has1mSuffix_2 } from "./model/contextWindow1m.js";

//@ chunk-wefvmrb3.js:1255-1569 fingerprint (2.1.88 match: isBilledAsExtraUsage, 0.61)
/**
 * 订阅用户某次请求是否按额外用量（extra usage）计费：fast 模式、模型不在计划内，或 Opus/Sonnet 4.6 长上下文等情况。
 */
function isBilledAsExtraUsage(model, isFastMode, isOpus1mMerged) {
  if (!isClaudeAISubscriber()) return false;
  let resolvedModel = model !== null ? parseUserSpecifiedModel(model) : getDefaultMainLoopModel();
  let lower = resolvedModel.toLowerCase();
  let isOpusOrFable = lower.includes("opus") || lower.includes("fable");
  let included = lower.includes("opus-4-6");
  let included_2 = lower.includes("sonnet-4-6");
  if (isFastMode && supportsFastMode(model)) return true;
  let billingState = usageCreditsBillingState(resolvedModel);
  if (billingState !== "pay_per_request" && billingState !== "included_in_plan") return true;
  if (!has1mSuffix_2(lower)) return false;
  if (isOpusOrFable && isOpus1mMerged) return false;
  return included || included_2;
}
export { isBilledAsExtraUsage };
