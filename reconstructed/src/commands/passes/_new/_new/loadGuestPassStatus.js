/**
 * commands/passes/_new/_new/loadGuestPassStatus.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aa3cndeh.js (1)
 * attribution: sole-consumer-new 1
 */
import {
  getCachedOrFetchPassesEligibility,
  fetchReferralRedemptions,
} from "../../../../services/api/referral.js";
import { logForDebugging } from "../../../../utils/debug.js";

/**
 * 读取访客通行证资格与已兑换记录，生成每张通行证的可用状态、推荐链接与推荐人奖励；任何失败返回 {available:false}。
 */
//@ chunk-aa3cndeh.js:10490-11146 sole-consumer-new
async function loadGuestPassStatus(credentials, storage) {
  try {
    let d = await getCachedOrFetchPassesEligibility(credentials, storage);
    if (!d || !d.eligible) return { available: !1 };
    let i = d.referral_code_details?.referral_link ?? null,
      referrer_reward = d.referrer_reward,
      m = d.referral_code_details?.campaign ?? "claude_code_guest_pass",
      o;
    try {
      o = await fetchReferralRedemptions(m, credentials);
    } catch (error) {
      return (
        logForDebugging(`Failed to fetch referral redemptions: ${error}`, { level: "error" }),
        { available: !1 }
      );
    }
    let h = o.redemptions || [],
      p = o.limit || 3,
      b = [];
    for (let u = 0; u < p; u++) {
      let v = h[u];
      b.push({ passNumber: u + 1, isAvailable: !v });
    }
    return { available: !0, passStatuses: b, referralLink: i, referrerReward: referrer_reward };
  } catch (error) {
    return (
      logForDebugging(
        `Failed to load guest pass eligibility: ${error instanceof Error ? (error.stack ?? error.message) : error}`,
        { level: "error" },
      ),
      { available: !1 }
    );
  }
}

export { loadGuestPassStatus };
