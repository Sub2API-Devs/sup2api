/**
 * remote/_new/toSdkRateLimitInfo.ts
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0h4e7gnq.js (1)
 * attribution: sole-consumer-new 1
 */

/**
 * 把内部限流状态转成 SDK rate_limit 事件的载荷：status、是否有统一限流回退、升级路径，以及存在时才带上的重置时间、类型、用量、超额状态/范围/周期用量、错误码、能否购买额度等字段（limitScope 输出为 overageScope）。
 */
//@ chunk-0h4e7gnq.js:47070-48384 sole-consumer-new
function toSdkRateLimitInfo(
  limits,
  { unifiedRateLimitFallbackAvailable: unifiedRateLimitFallbackAvailable, upgradePaths: upgradePaths },
) {
  return {
    status: limits.status,
    unifiedRateLimitFallbackAvailable: unifiedRateLimitFallbackAvailable,
    ...(upgradePaths !== void 0 && { upgradePaths: upgradePaths }),
    ...(limits.resetsAt !== void 0 && { resetsAt: limits.resetsAt }),
    ...(limits.rateLimitType !== void 0 && { rateLimitType: limits.rateLimitType }),
    ...(limits.utilization !== void 0 && { utilization: limits.utilization }),
    ...(limits.overageStatus !== void 0 && { overageStatus: limits.overageStatus }),
    ...(limits.overageResetsAt !== void 0 && { overageResetsAt: limits.overageResetsAt }),
    ...(limits.overageDisabledReason !== void 0 && { overageDisabledReason: limits.overageDisabledReason }),
    ...(limits.limitScope !== void 0 && { overageScope: limits.limitScope }),
    ...(limits.isUsingOverage !== void 0 && { isUsingOverage: limits.isUsingOverage }),
    ...(limits.overageInUse !== void 0 && { overageInUse: limits.overageInUse }),
    ...(limits.surpassedThreshold !== void 0 && { surpassedThreshold: limits.surpassedThreshold }),
    ...(limits.rateLimitGraceActive === !0 && { rateLimitGraceActive: !0 }),
    ...(limits.overagePeriodMonthly !== void 0 && {
      overagePeriodMonthly: { utilization: limits.overagePeriodMonthly.utilization },
    }),
    ...(limits.overagePeriodChannel !== void 0 && {
      overagePeriodChannel: { utilization: limits.overagePeriodChannel.utilization },
    }),
    ...(limits.errorCode !== void 0 && { errorCode: limits.errorCode }),
    ...(limits.canUserPurchaseCredits !== void 0 && {
      canUserPurchaseCredits: limits.canUserPurchaseCredits,
    }),
    ...(limits.hasChargeableSavedPaymentMethod !== void 0 && {
      hasChargeableSavedPaymentMethod: limits.hasChargeableSavedPaymentMethod,
    }),
  };
}

export { toSdkRateLimitInfo };
