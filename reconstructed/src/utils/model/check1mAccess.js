/**
 * utils/model/check1mAccess.ts
 *
 * 订阅用户能否使用 1M 上下文（依赖 usage credits 是否开启）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/model/check1mAccess.ts
 * pieces: chunk-aepeg2w5.js (1)
 * attribution: fingerprint 1
 */
import { getGlobalConfig } from "../config.js";

/**
 * 缓存的 extra usage 禁用原因：未知为 false；null（已开启）或 out_of_credits 为 true；其他禁用原因为 false。供 Opus/Sonnet 1M 可用性（EK/vK）在订阅模式下判断。
 */
//@ chunk-aepeg2w5.js:418331-418830 fingerprint = isExtraUsageEnabled (0.96)
function isExtraUsageEnabled() {
  let reason = getGlobalConfig().cachedExtraUsageDisabledReason;
  if (reason === void 0) return !1;
  if (reason === null) return !0;
  switch (reason) {
    case "out_of_credits":
      return !0;
    case "overage_not_provisioned":
    case "org_level_disabled":
    case "org_level_disabled_until":
    case "seat_tier_level_disabled":
    case "member_level_disabled":
    case "seat_tier_zero_credit_limit":
    case "group_zero_credit_limit":
    case "member_zero_credit_limit":
    case "org_service_level_disabled":
    case "no_limits_configured":
    case "fetch_error":
    case "unknown":
      return !1;
    default:
      return !1;
  }
}

export { isExtraUsageEnabled };
