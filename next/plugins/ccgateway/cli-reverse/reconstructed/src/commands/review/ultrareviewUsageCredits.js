/**
 * commands/review/ultrareviewUsageCredits.ts
 *
 * ultrareview 启动前读剩余用量额度，超时给出降级提示（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-53f0ndkv.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { typicalUltrareviewCost } from "./ultrareviewPreconditions.js";
import { isTeamSubscriber, isEnterpriseSubscriber } from "../../utils/auth.js";
import { withTimeout } from "../../utils/sleep.js";
import { fetchUtilization } from "../../services/api/usage.js";
import { fetchPrepaidBalance } from "../../services/api/billing.js";
import { REVIEW_REMOTE_POLL_MS, getRemainingOverageBudget } from "./reviewRemote.js";
import { logForDebugging } from "../../utils/debug.js";

//@ chunk-53f0ndkv.js:2458-2717 placement
/**
 * ultrareview 前读剩余用量额度，读不到或超时时只记提示并返回 null。
 */
async function readUsageCredits(context) {
  try {
    if (typicalUltrareviewCost() === null || isTeamSubscriber() || isEnterpriseSubscriber()) return null;
    let [usage, extraUsage] = await withTimeout(
      Promise.all([fetchUtilization(context), fetchPrepaidBalance(context)]),
      REVIEW_REMOTE_POLL_MS,
      "ultrareview: usage credits read timed out",
    );
    return getRemainingOverageBudget(usage?.extra_usage, extraUsage);
  } catch {
    logForDebugging("ultrareview: could not read usage credits left");
    return null;
  }
}
export { readUsageCredits };
