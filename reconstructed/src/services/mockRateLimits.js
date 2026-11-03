/**
 * services/mockRateLimits.ts
 *
 * 内部测试用的限额模拟：可设置模拟场景、伪造 anthropic-ratelimit-unified-* 响应头、快速模式限额与 overage 状态。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mockRateLimits.ts
 * pieces: chunk-1ny7cxrt.js (1), chunk-aepeg2w5.js (1), chunk-w5ndchqs.js (1), chunk-zv6whf9m.js (1)
 * attribution: fingerprint 4
 */
import { Ybe, J0 } from "./claudeGateway/mockRateLimits.js";
import { maybeMockRateLimitHeaders, buildRejectedLimits, it } from "./claudeAiLimits.js";

/**
 * 按模拟的 overage 用量生成 unified-status/reset/overage 利用率与阈值头。旧版名 updateRepresentativeClaim 不准确。
 */
//@ chunk-1ny7cxrt.js:1451847-1452744 fingerprint = updateRepresentativeClaim (0.494)
function buildOverageMockHeaders(e, t) {
  let n = String(Math.floor(e.resetsAt.getTime() / 1000)),
    o = e.exceeded ? 1 : Ybe.find((a) => e.utilization > a),
    r = e.exceeded ? "rejected" : o ? "allowed_warning" : "allowed",
    s = {
      "anthropic-ratelimit-unified-status": r,
      "anthropic-ratelimit-unified-reset": n,
      "anthropic-ratelimit-unified-overage-reset": n,
      "anthropic-ratelimit-unified-overage-utilization": String(J0(e)),
    };
  if (o) s["anthropic-ratelimit-unified-overage-surpassed-threshold"] = String(o);
  if (e.exceeded) {
    if (((s["anthropic-ratelimit-unified-overage-period"] = e.period), e.scope_type === "group_pool"))
      s["anthropic-ratelimit-unified-overage-scope"] = e.scope_type;
    ((s["anthropic-ratelimit-unified-overage-disabled-reason"] = "org_spend_cap_reached"),
      (s["retry-after"] = String(Math.max(1, Math.ceil((e.resetsAt.getTime() - t.getTime()) / 1000)))));
  } else
    ((s["anthropic-ratelimit-unified-representative-claim"] = "overage"),
      (s["anthropic-ratelimit-unified-overage-status"] = r));
  return s;
}
/**
 * 限额模拟状态类：enabled、伪造头、超限列表、无头 429 文案、订阅类型/档位、快速模式限额、overage、试用、宽限、计费权限等，含 reset 与场景设置方法。旧版名 setMockRateLimitScenario 指方法而非类。
 */
//@ chunk-aepeg2w5.js:279587-288283 fingerprint = setMockRateLimitScenario (0.609)
class MockRateLimitState {
  enabled = !1;
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
    ((this.enabled = !1),
      (this.headers = {}),
      (this.exceededLimits = []),
      (this.headerless429Message = null),
      (this.subscriptionType = null),
      (this.rateLimitTier = null),
      (this.fastModeRateLimitDurationMs = null),
      (this.fastModeRateLimitExpiresAt = null),
      (this.overages = null),
      (this.trial = null),
      (this.graceBand = null),
      (this.billingAccessOverride = null));
  }
  setHeader(e, n) {
    this.enabled = !0;
    let r = e === "retry-after" ? "retry-after" : `anthropic-ratelimit-unified-${e}`;
    if (n === void 0 || n === "clear") {
      if ((delete this.headers[r], e === "claim")) this.exceededLimits = [];
      if (e === "status" || e === "overage-status") this.updateRetryAfter();
      return;
    }
    if (e === "reset" || e === "overage-reset") {
      let h = Number(n);
      if (!isNaN(h)) n = String(Math.floor(Date.now() / 1000) + h * 3600);
    }
    if (e === "claim") {
      if (["five_hour", "seven_day", "seven_day_opus", "seven_day_sonnet"].includes(n)) {
        let y;
        if (n === "five_hour") y = Math.floor(Date.now() / 1000) + 18000;
        else if (n === "seven_day" || n === "seven_day_opus" || n === "seven_day_sonnet")
          y = Math.floor(Date.now() / 1000) + 604800;
        else y = Math.floor(Date.now() / 1000) + 3600;
        ((this.exceededLimits = this.exceededLimits.filter((exceededLimit) => exceededLimit.type !== n)),
          this.exceededLimits.push({ type: n, resetsAt: y }),
          this.updateRepresentativeClaim());
        return;
      }
    }
    let headers = this.headers;
    if (((headers[r] = n), e === "status" || e === "overage-status")) this.updateRetryAfter();
  }
  updateRetryAfter() {
    let e = this.headers["anthropic-ratelimit-unified-status"],
      n = this.headers["anthropic-ratelimit-unified-overage-status"],
      r = this.headers["anthropic-ratelimit-unified-reset"];
    if (e === "rejected" && (!n || n === "rejected") && r) {
      let s = Number(r),
        max = Math.max(0, s - Math.floor(Date.now() / 1000));
      this.headers["retry-after"] = String(max);
    } else delete this.headers["retry-after"];
  }
  updateRepresentativeClaim() {
    if (this.exceededLimits.length === 0) {
      (delete this.headers["anthropic-ratelimit-unified-representative-claim"],
        delete this.headers["anthropic-ratelimit-unified-reset"],
        delete this.headers["retry-after"]);
      return;
    }
    let reduced = this.exceededLimits.reduce((n, r) => (r.resetsAt > n.resetsAt ? r : n));
    if (
      ((this.headers["anthropic-ratelimit-unified-representative-claim"] = reduced.type),
      (this.headers["anthropic-ratelimit-unified-reset"] = String(reduced.resetsAt)),
      this.headers["anthropic-ratelimit-unified-status"] === "rejected")
    ) {
      let n = this.headers["anthropic-ratelimit-unified-overage-status"];
      if (!n || n === "rejected") {
        let max = Math.max(0, reduced.resetsAt - Math.floor(Date.now() / 1000));
        this.headers["retry-after"] = String(max);
      } else delete this.headers["retry-after"];
    } else delete this.headers["retry-after"];
  }
  addExceededLimit(e, n) {
    this.enabled = !0;
    let r = Math.floor(Date.now() / 1000) + n * 3600;
    if (
      ((this.exceededLimits = this.exceededLimits.filter((exceededLimit) => exceededLimit.type !== e)),
      this.exceededLimits.push({ type: e, resetsAt: r }),
      this.exceededLimits.length > 0)
    )
      this.headers["anthropic-ratelimit-unified-status"] = "rejected";
    this.updateRepresentativeClaim();
  }
  setEarlyWarning(e, n, r) {
    ((this.enabled = !0), this.clearEarlyWarning());
    let h = r ?? (e === "5h" ? 4 : 120),
      y = Math.floor(Date.now() / 1000) + h * 3600;
    if (
      ((this.headers[`anthropic-ratelimit-unified-${e}-utilization`] = String(n)),
      (this.headers[`anthropic-ratelimit-unified-${e}-reset`] = String(y)),
      (this.headers[`anthropic-ratelimit-unified-${e}-surpassed-threshold`] = String(n)),
      e !== "overage")
    )
      this.headers[`anthropic-ratelimit-unified-${e}-status`] = "allowed_warning";
    if (!this.headers["anthropic-ratelimit-unified-status"])
      this.headers["anthropic-ratelimit-unified-status"] = "allowed";
  }
  clearEarlyWarning() {
    (delete this.headers["anthropic-ratelimit-unified-5h-utilization"],
      delete this.headers["anthropic-ratelimit-unified-5h-reset"],
      delete this.headers["anthropic-ratelimit-unified-5h-surpassed-threshold"],
      delete this.headers["anthropic-ratelimit-unified-5h-status"],
      delete this.headers["anthropic-ratelimit-unified-7d-utilization"],
      delete this.headers["anthropic-ratelimit-unified-7d-reset"],
      delete this.headers["anthropic-ratelimit-unified-7d-surpassed-threshold"],
      delete this.headers["anthropic-ratelimit-unified-7d-status"]);
  }
  setScenario(e) {
    if (e === "clear") {
      ((this.headers = {}), (this.headerless429Message = null), (this.overages = null), (this.enabled = !1));
      return;
    }
    this.enabled = !0;
    let n = Math.floor(Date.now() / 1000) + 18000,
      r = Math.floor(Date.now() / 1000) + 604800;
    if (
      ((this.headers = {}),
      (this.headerless429Message = null),
      (this.overages = null),
      !["overage-active", "overage-warning", "overage-exhausted"].includes(e))
    )
      this.exceededLimits = [];
    switch (e) {
      case "normal":
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed",
          "anthropic-ratelimit-unified-reset": String(n),
        };
        break;
      case "session-limit-reached":
        ((this.exceededLimits = [{ type: "five_hour", resetsAt: n }]),
          this.updateRepresentativeClaim(),
          (this.headers["anthropic-ratelimit-unified-status"] = "rejected"));
        break;
      case "approaching-weekly-limit":
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed_warning",
          "anthropic-ratelimit-unified-reset": String(r),
          "anthropic-ratelimit-unified-representative-claim": "seven_day",
        };
        break;
      case "weekly-limit-reached":
        ((this.exceededLimits = [{ type: "seven_day", resetsAt: r }]),
          this.updateRepresentativeClaim(),
          (this.headers["anthropic-ratelimit-unified-status"] = "rejected"));
        break;
      case "overage-active":
        this.setOverageScenarioHeaders(n, "allowed");
        break;
      case "overage-warning":
        this.setOverageScenarioHeaders(n, "allowed_warning");
        break;
      case "overage-exhausted":
        this.setOverageScenarioHeaders(n, "rejected");
        break;
      case "out-of-credits":
        this.setOverageScenarioHeaders(n, "rejected", "out_of_credits");
        break;
      case "org-zero-credit-limit":
        this.setOverageScenarioHeaders(n, "rejected", "org_service_level_disabled");
        break;
      case "org-spend-cap-hit":
        (this.setOverageScenarioHeaders(n, "rejected", "org_level_disabled_until"),
          this.setOverages({ isEnabled: !0, balanceCents: 6532, spendLimitCents: 4000, usedCents: 4000 }));
        break;
      case "member-zero-credit-limit":
        this.setOverageScenarioHeaders(n, "rejected", "member_zero_credit_limit");
        break;
      case "seat-tier-zero-credit-limit":
        this.setOverageScenarioHeaders(n, "rejected", "seat_tier_zero_credit_limit");
        break;
      case "opus-limit": {
        ((this.exceededLimits = [{ type: "seven_day_opus", resetsAt: r }]),
          this.updateRepresentativeClaim(),
          (this.headers["anthropic-ratelimit-unified-status"] = "rejected"));
        break;
      }
      case "opus-warning": {
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed_warning",
          "anthropic-ratelimit-unified-reset": String(r),
          "anthropic-ratelimit-unified-representative-claim": "seven_day_opus",
        };
        break;
      }
      case "sonnet-limit": {
        ((this.exceededLimits = [{ type: "seven_day_sonnet", resetsAt: r }]),
          this.updateRepresentativeClaim(),
          (this.headers["anthropic-ratelimit-unified-status"] = "rejected"));
        break;
      }
      case "sonnet-warning": {
        this.headers = {
          "anthropic-ratelimit-unified-status": "allowed_warning",
          "anthropic-ratelimit-unified-reset": String(r),
          "anthropic-ratelimit-unified-representative-claim": "seven_day_sonnet",
        };
        break;
      }
      case "fast-mode-limit": {
        (this.updateRepresentativeClaim(),
          (this.headers["anthropic-ratelimit-unified-status"] = "rejected"),
          (this.fastModeRateLimitDurationMs = 600000));
        break;
      }
      case "fast-mode-short-limit": {
        (this.updateRepresentativeClaim(),
          (this.headers["anthropic-ratelimit-unified-status"] = "rejected"),
          (this.fastModeRateLimitDurationMs = 1e4));
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
  setOverageScenarioHeaders(e, n, r) {
    if (this.exceededLimits.length === 0) this.exceededLimits = [{ type: "five_hour", resetsAt: e }];
    if (
      (this.updateRepresentativeClaim(),
      (this.headers["anthropic-ratelimit-unified-status"] = "rejected"),
      (this.headers["anthropic-ratelimit-unified-overage-status"] = n),
      r)
    )
      this.headers["anthropic-ratelimit-unified-overage-disabled-reason"] = r;
    let date = new Date();
    (date.setMonth(date.getMonth() + 1, 1),
      date.setHours(0, 0, 0, 0),
      (this.headers["anthropic-ratelimit-unified-overage-reset"] = String(
        Math.floor(date.getTime() / 1000),
      )));
  }
  setRateLimitTier(e) {
    ((this.enabled = !0), (this.rateLimitTier = e));
  }
  setSubscriptionType(e) {
    ((this.enabled = !0), (this.subscriptionType = e));
  }
  setBillingAccess(e) {
    ((this.enabled = !0), (this.billingAccessOverride = e));
  }
  setTrial(e) {
    if (e === null) {
      this.trial = null;
      return;
    }
    ((this.enabled = !0), (this.trial = e));
  }
  setOverages(e) {
    if (e === null) {
      this.overages = null;
      return;
    }
    this.overages = {
      isEnabled: !1,
      balanceCents: 0,
      spendLimitCents: 15000,
      usedCents: 0,
      currency: "USD",
      paymentMethod: { type: "card", brand: "visa", last4: "4242" },
      autoReload: !1,
      purchaseOutcome: "success",
      pollCount: 0,
      ...this.overages,
      ...e,
    };
  }
  checkFastModeRateLimit(e) {
    if (this.fastModeRateLimitDurationMs === null) return null;
    if (!e) return null;
    if (this.fastModeRateLimitExpiresAt !== null && Date.now() >= this.fastModeRateLimitExpiresAt)
      return (this.reset(), null);
    if (this.fastModeRateLimitExpiresAt === null)
      this.fastModeRateLimitExpiresAt = Date.now() + this.fastModeRateLimitDurationMs;
    let n = this.fastModeRateLimitExpiresAt - Date.now(),
      r = { ...this.headers };
    return ((r["retry-after"] = String(Math.max(1, Math.ceil(n / 1000)))), r);
  }
}
/**
 * 从（模拟或真实）响应头计算额度并构造被拒状态。
 */
//@ chunk-w5ndchqs.js:48835-48918 fingerprint = applyMockHeaders (1)
function applyMockHeaders(headers) {
  let n = maybeMockRateLimitHeaders(headers.headers ?? new globalThis.Headers());
  return buildRejectedLimits(it(n, !1), headers);
}
/**
 * 限额类型归类：five_hour→session、seven_day→weekly、模型类周限额→model。旧版名 setMockHeader 为错配。
 */
//@ chunk-zv6whf9m.js:16736-16932 fingerprint = setMockHeader (0.357)
function getLimitScopeKind(e) {
  switch (e) {
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

export { MockRateLimitState, applyMockHeaders, buildOverageMockHeaders, getLimitScopeKind };
