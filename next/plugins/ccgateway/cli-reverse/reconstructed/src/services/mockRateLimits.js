/**
 * services/mockRateLimits.ts
 *
 * 内部测试用的限额模拟：可设置模拟场景、伪造 anthropic-ratelimit-unified-* 响应头、快速模式限额与 overage 状态。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mockRateLimits.ts
 * pieces: chunk-0467wazv.js (1), chunk-1hnjmk23.js (1), chunk-7pwjpdkw.js (1), chunk-exfmq47h.js (1)
 * attribution: fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  maybeMockRateLimitHeaders,
  buildRejectedLimits,
  refreshLimitsFromHeaders,
} from "./claudeAiLimits.js";
import { MOCK_UTILIZATION_STEPS, roundUtilization } from "./claudeGateway/mockRateLimits.js";

//@ chunk-exfmq47h.js:289210-297906 fingerprint (2.1.88 match: setMockRateLimitScenario, 0.609)
/**
 * 限额模拟状态类：enabled、伪造头、超限列表、无头 429 文案、订阅类型/档位、快速模式限额、overage、试用、宽限、计费权限等，含 reset 与场景设置方法。旧版名 setMockRateLimitScenario 指方法而非类。
 */
class MockRateLimitState {
  enabled = false;
  headers = {};
  exceededLimits = [];
  headerless429Message = null;
  subscriptionType = null;
  rateLimitTier = null;
  fastModeRateLimitDurationMs = null;
  fastModeRateLimitExpiresAt = null;
  overages = null;
  trial = null;
  graceBand = null;
  billingAccessOverride = null;
  reset() {
    this.enabled = false;
    this.headers = {};
    this.exceededLimits = [];
    this.headerless429Message = null;
    this.subscriptionType = null;
    this.rateLimitTier = null;
    this.fastModeRateLimitDurationMs = null;
    this.fastModeRateLimitExpiresAt = null;
    this.overages = null;
    this.trial = null;
    this.graceBand = null;
    this.billingAccessOverride = null;
  }
  setHeader(key, value) {
    this.enabled = true;
    let fullKey = key === "retry-after" ? "retry-after" : `anthropic-ratelimit-unified-${key}`;
    if (value === undefined || value === "clear") {
      delete this.headers[fullKey];
      if (key === "claim") this.exceededLimits = [];
      if (key === "status" || key === "overage-status") this.updateRetryAfter();
      return;
    }
    if (key === "reset" || key === "overage-reset") {
      let hours = Number(value);
      if (!isNaN(hours)) value = String(Math.floor(Date.now() / 1000) + hours * 3600);
    }
    if (key === "claim") {
      if (["five_hour", "seven_day", "seven_day_opus", "seven_day_sonnet"].includes(value)) {
        let resetsAt;
        if (value === "five_hour") resetsAt = Math.floor(Date.now() / 1000) + 18000;
        else if (value === "seven_day" || value === "seven_day_opus" || value === "seven_day_sonnet")
          resetsAt = Math.floor(Date.now() / 1000) + 604800;
        else resetsAt = Math.floor(Date.now() / 1000) + 3600;
        this.exceededLimits = this.exceededLimits.filter((exceededLimit) => exceededLimit.type !== value);
        this.exceededLimits.push({
          type: value,
          resetsAt,
        });
        this.updateRepresentativeClaim();
        return;
      }
    }
    let headers = this.headers;
    headers[fullKey] = value;
    if (key === "status" || key === "overage-status") this.updateRetryAfter();
  }
  updateRetryAfter() {
    let status = this.headers["anthropic-ratelimit-unified-status"];
    let overageStatus = this.headers["anthropic-ratelimit-unified-overage-status"];
    let reset = this.headers["anthropic-ratelimit-unified-reset"];
    if (status === "rejected" && (!overageStatus || overageStatus === "rejected") && reset) {
      let resetTimestamp = Number(reset);
      let secondsUntilReset = Math.max(0, resetTimestamp - Math.floor(Date.now() / 1000));
      this.headers["retry-after"] = String(secondsUntilReset);
    } else delete this.headers["retry-after"];
  }
  updateRepresentativeClaim() {
    if (this.exceededLimits.length === 0) {
      delete this.headers["anthropic-ratelimit-unified-representative-claim"];
      delete this.headers["anthropic-ratelimit-unified-reset"];
      delete this.headers["retry-after"];
      return;
    }
    let furthest = this.exceededLimits.reduce((prev, curr) => (curr.resetsAt > prev.resetsAt ? curr : prev));
    this.headers["anthropic-ratelimit-unified-representative-claim"] = furthest.type;
    this.headers["anthropic-ratelimit-unified-reset"] = String(furthest.resetsAt);
    if (this.headers["anthropic-ratelimit-unified-status"] === "rejected") {
      let overageStatus = this.headers["anthropic-ratelimit-unified-overage-status"];
      if (!overageStatus || overageStatus === "rejected") {
        let secondsUntilReset = Math.max(0, furthest.resetsAt - Math.floor(Date.now() / 1000));
        this.headers["retry-after"] = String(secondsUntilReset);
      } else delete this.headers["retry-after"];
    } else delete this.headers["retry-after"];
  }
  addExceededLimit(type, hoursFromNow) {
    this.enabled = true;
    let resetsAt = Math.floor(Date.now() / 1000) + hoursFromNow * 3600;
    this.exceededLimits = this.exceededLimits.filter((exceededLimit) => exceededLimit.type !== type);
    this.exceededLimits.push({
      type,
      resetsAt,
    });
    if (this.exceededLimits.length > 0) this.headers["anthropic-ratelimit-unified-status"] = "rejected";
    this.updateRepresentativeClaim();
  }
  setEarlyWarning(windowKind, utilization, hoursFromNow) {
    this.enabled = true;
    this.clearEarlyWarning();
    let hours = hoursFromNow ?? (windowKind === "5h" ? 4 : 120);
    let resetsAt = Math.floor(Date.now() / 1000) + hours * 3600;
    this.headers[`anthropic-ratelimit-unified-${windowKind}-utilization`] = String(utilization);
    this.headers[`anthropic-ratelimit-unified-${windowKind}-reset`] = String(resetsAt);
    this.headers[`anthropic-ratelimit-unified-${windowKind}-surpassed-threshold`] = String(utilization);
    if (windowKind !== "overage")
      this.headers[`anthropic-ratelimit-unified-${windowKind}-status`] = "allowed_warning";
    if (!this.headers["anthropic-ratelimit-unified-status"])
      this.headers["anthropic-ratelimit-unified-status"] = "allowed";
  }
  clearEarlyWarning() {
    delete this.headers["anthropic-ratelimit-unified-5h-utilization"];
    delete this.headers["anthropic-ratelimit-unified-5h-reset"];
    delete this.headers["anthropic-ratelimit-unified-5h-surpassed-threshold"];
    delete this.headers["anthropic-ratelimit-unified-5h-status"];
    delete this.headers["anthropic-ratelimit-unified-7d-utilization"];
    delete this.headers["anthropic-ratelimit-unified-7d-reset"];
    delete this.headers["anthropic-ratelimit-unified-7d-surpassed-threshold"];
    delete this.headers["anthropic-ratelimit-unified-7d-status"];
  }
  setScenario(scenario) {
    if (scenario === "clear") {
      this.headers = {};
      this.headerless429Message = null;
      this.overages = null;
      this.enabled = false;
      return;
    }
    this.enabled = true;
    let fiveHourReset = Math.floor(Date.now() / 1000) + 18000;
    let weekReset = Math.floor(Date.now() / 1000) + 604800;
    this.headers = {};
    this.headerless429Message = null;
    this.overages = null;
    if (!["overage-active", "overage-warning", "overage-exhausted"].includes(scenario))
      this.exceededLimits = [];
    switch (scenario) {
      case "normal":
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed",
          "anthropic-ratelimit-unified-reset": String(fiveHourReset),
        };
        break;
      case "session-limit-reached":
        this.exceededLimits = [
          {
            type: "five_hour",
            resetsAt: fiveHourReset,
          },
        ];
        this.updateRepresentativeClaim();
        this.headers["anthropic-ratelimit-unified-status"] = "rejected";
        break;
      case "approaching-weekly-limit":
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed_warning",
          "anthropic-ratelimit-unified-reset": String(weekReset),
          "anthropic-ratelimit-unified-representative-claim": "seven_day",
        };
        break;
      case "weekly-limit-reached":
        this.exceededLimits = [
          {
            type: "seven_day",
            resetsAt: weekReset,
          },
        ];
        this.updateRepresentativeClaim();
        this.headers["anthropic-ratelimit-unified-status"] = "rejected";
        break;
      case "overage-active":
        this.setOverageScenarioHeaders(fiveHourReset, "allowed");
        break;
      case "overage-warning":
        this.setOverageScenarioHeaders(fiveHourReset, "allowed_warning");
        break;
      case "overage-exhausted":
        this.setOverageScenarioHeaders(fiveHourReset, "rejected");
        break;
      case "out-of-credits":
        this.setOverageScenarioHeaders(fiveHourReset, "rejected", "out_of_credits");
        break;
      case "org-zero-credit-limit":
        this.setOverageScenarioHeaders(fiveHourReset, "rejected", "org_service_level_disabled");
        break;
      case "org-spend-cap-hit":
        this.setOverageScenarioHeaders(fiveHourReset, "rejected", "org_level_disabled_until");
        this.setOverages({
          isEnabled: true,
          balanceCents: 6532,
          spendLimitCents: 4000,
          usedCents: 4000,
        });
        break;
      case "member-zero-credit-limit":
        this.setOverageScenarioHeaders(fiveHourReset, "rejected", "member_zero_credit_limit");
        break;
      case "seat-tier-zero-credit-limit":
        this.setOverageScenarioHeaders(fiveHourReset, "rejected", "seat_tier_zero_credit_limit");
        break;
      case "opus-limit": {
        this.exceededLimits = [
          {
            type: "seven_day_opus",
            resetsAt: weekReset,
          },
        ];
        this.updateRepresentativeClaim();
        this.headers["anthropic-ratelimit-unified-status"] = "rejected";
        break;
      }
      case "opus-warning": {
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed_warning",
          "anthropic-ratelimit-unified-reset": String(weekReset),
          "anthropic-ratelimit-unified-representative-claim": "seven_day_opus",
        };
        break;
      }
      case "sonnet-limit": {
        this.exceededLimits = [
          {
            type: "seven_day_sonnet",
            resetsAt: weekReset,
          },
        ];
        this.updateRepresentativeClaim();
        this.headers["anthropic-ratelimit-unified-status"] = "rejected";
        break;
      }
      case "sonnet-warning": {
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed_warning",
          "anthropic-ratelimit-unified-reset": String(weekReset),
          "anthropic-ratelimit-unified-representative-claim": "seven_day_sonnet",
        };
        break;
      }
      case "fast-mode-limit": {
        this.updateRepresentativeClaim();
        this.headers["anthropic-ratelimit-unified-status"] = "rejected";
        this.fastModeRateLimitDurationMs = 600000;
        break;
      }
      case "fast-mode-short-limit": {
        this.updateRepresentativeClaim();
        this.headers["anthropic-ratelimit-unified-status"] = "rejected";
        this.fastModeRateLimitDurationMs = 1e4;
        break;
      }
      case "extra-usage-required": {
        this.headerless429Message = "Usage credits are required for long context requests.";
        break;
      }
      default:
        break;
    }
  }
  setOverageScenarioHeaders(resetsAt, overageStatus, disabledReason) {
    if (this.exceededLimits.length === 0)
      this.exceededLimits = [
        {
          type: "five_hour",
          resetsAt,
        },
      ];
    this.updateRepresentativeClaim();
    this.headers["anthropic-ratelimit-unified-status"] = "rejected";
    this.headers["anthropic-ratelimit-unified-overage-status"] = overageStatus;
    if (disabledReason) this.headers["anthropic-ratelimit-unified-overage-disabled-reason"] = disabledReason;
    let date = new Date();
    date.setMonth(date.getMonth() + 1, 1);
    date.setHours(0, 0, 0, 0);
    this.headers["anthropic-ratelimit-unified-overage-reset"] = String(Math.floor(date.getTime() / 1000));
  }
  setRateLimitTier(rateLimitTier) {
    this.enabled = true;
    this.rateLimitTier = rateLimitTier;
  }
  setSubscriptionType(subscriptionType) {
    this.enabled = true;
    this.subscriptionType = subscriptionType;
  }
  setBillingAccess(billingAccessOverride) {
    this.enabled = true;
    this.billingAccessOverride = billingAccessOverride;
  }
  setTrial(trial) {
    if (trial === null) {
      this.trial = null;
      return;
    }
    this.enabled = true;
    this.trial = trial;
  }
  setOverages(overages) {
    if (overages === null) {
      this.overages = null;
      return;
    }
    this.overages = {
      isEnabled: false,
      balanceCents: 0,
      spendLimitCents: 15000,
      usedCents: 0,
      currency: "USD",
      paymentMethod: {
        type: "card",
        brand: "visa",
        last4: "4242",
      },
      autoReload: false,
      purchaseOutcome: "success",
      pollCount: 0,
      ...this.overages,
      ...overages,
    };
  }
  checkFastModeRateLimit(isFastModeActive) {
    if (this.fastModeRateLimitDurationMs === null) return null;
    if (!isFastModeActive) return null;
    if (this.fastModeRateLimitExpiresAt !== null && Date.now() >= this.fastModeRateLimitExpiresAt) {
      this.reset();
      return null;
    }
    if (this.fastModeRateLimitExpiresAt === null)
      this.fastModeRateLimitExpiresAt = Date.now() + this.fastModeRateLimitDurationMs;
    let remainingMs = this.fastModeRateLimitExpiresAt - Date.now();
    let headersToSend = {
      ...this.headers,
    };
    headersToSend["retry-after"] = String(Math.max(1, Math.ceil(remainingMs / 1000)));
    return headersToSend;
  }
}
//@ chunk-7pwjpdkw.js:49082-49165 fingerprint (2.1.88 match: applyMockHeaders, 1)
/**
 * 从（模拟或真实）响应头计算额度并构造被拒状态。
 */
function applyMockHeaders(headers) {
  let mockHeaders = maybeMockRateLimitHeaders(headers.headers ?? new globalThis.Headers());
  return buildRejectedLimits(refreshLimitsFromHeaders(mockHeaders, false), headers);
}
//@ chunk-0467wazv.js:16736-16932 fingerprint (2.1.88 match: setMockHeader, 0.357)
/**
 * 限额类型归类：five_hour→session、seven_day→weekly、模型类周限额→model。旧版名 setMockHeader 为错配。
 */
function getLimitScopeKind(rateLimitType) {
  switch (rateLimitType) {
    case "five_hour":
      return "session";
    case "seven_day":
      return "weekly";
    case "seven_day_opus":
    case "seven_day_sonnet":
    case "seven_day_overage_included":
      return "model";
    default:
      return;
  }
}
//@ chunk-1hnjmk23.js:1474775-1475672 fingerprint (2.1.88 match: updateRepresentativeClaim, 0.494)
/**
 * 按模拟的 overage 用量生成 unified-status/reset/overage 利用率与阈值头。旧版名 updateRepresentativeClaim 不准确。
 */
function buildOverageMockHeaders(overage, now) {
  let resetSeconds = String(Math.floor(overage.resetsAt.getTime() / 1000));
  let surpassedStep = overage.exceeded
    ? 1
    : MOCK_UTILIZATION_STEPS.find((step) => overage.utilization > step);
  let status = overage.exceeded ? "rejected" : surpassedStep ? "allowed_warning" : "allowed";
  let headers = {
    "anthropic-ratelimit-unified-status": status,
    "anthropic-ratelimit-unified-reset": resetSeconds,
    "anthropic-ratelimit-unified-overage-reset": resetSeconds,
    "anthropic-ratelimit-unified-overage-utilization": String(roundUtilization(overage)),
  };
  if (surpassedStep)
    headers["anthropic-ratelimit-unified-overage-surpassed-threshold"] = String(surpassedStep);
  if (overage.exceeded) {
    headers["anthropic-ratelimit-unified-overage-period"] = overage.period;
    if (overage.scope_type === "group_pool")
      headers["anthropic-ratelimit-unified-overage-scope"] = overage.scope_type;
    headers["anthropic-ratelimit-unified-overage-disabled-reason"] = "org_spend_cap_reached";
    headers["retry-after"] = String(
      Math.max(1, Math.ceil((overage.resetsAt.getTime() - now.getTime()) / 1000)),
    );
  } else {
    headers["anthropic-ratelimit-unified-representative-claim"] = "overage";
    headers["anthropic-ratelimit-unified-overage-status"] = status;
  }
  return headers;
}
export { applyMockHeaders, buildOverageMockHeaders, MockRateLimitState, getLimitScopeKind };
