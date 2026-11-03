/**
 * services/api/billing.ts
 *
 * 2.1.316 新增：API 额度购买（含 3DS 验证与发票轮询）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (12)
 * attribution: placement 12
 */
import { isExpectedApiError, errorMessage } from "../../utils/errors.js";
import { verificationErrorMessage } from "./verificationRequired.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { getLspManager } from "../lsp/manager.js";
import { sleep } from "../../utils/sleep.js";
import {
  logFeatureOk,
  logFeatureBad,
  logFeatureSad,
  withFeatureTelemetry,
} from "../analytics/featureTelemetry.js";
import { apiClient } from "../routines/routinesApi.js";
import { logForDebugging } from "../../utils/debug.js";
import { logError } from "../../utils/log.js";

//@ chunk-e6aww6q8.js:1620626-1620680 placement
var GJ = (e) => isExpectedApiError(e, (n) => verificationErrorMessage(n) !== null || !isAxiosError(n)),
  RUo = 2000;
/**
 * 为组织开启超额计费。
 */
//@ chunk-e6aww6q8.js:1620680-1621376 placement
async function enableOverageBilling(e) {
  let n = getLspManager();
  if (n) return ((n.isEnabled = !0), await sleep(300), logFeatureOk("api_overage_enable"), !0);
  try {
    let post = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/setup_overage_billing",
      { org_monthly_spend_limit: RUo },
      { auth: "teleport-org", timeout: 30000, credentials: e },
    );
    if (!post.ok) throw Error(`setup_overage_billing unavailable: ${post.reason}`);
    let put = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/overage_spend_limit",
      { is_enabled: !0 },
      { auth: "teleport-org", credentials: e },
    );
    if (!put.ok) throw Error(`overage_spend_limit unavailable: ${put.reason}`);
    return (logFeatureOk("api_overage_enable"), !0);
  } catch (error) {
    if (GJ(error)) logForDebugging(`overage setup failed: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    return (logFeatureBad("api_overage_enable", "request_failed"), !1);
  }
}
/**
 * 更新组织的超额支出上限。
 */
//@ chunk-e6aww6q8.js:1621376-1622117 placement
async function updateOverageSpendLimit(e, n, r) {
  let s = getLspManager();
  if (s)
    return (
      (s.spendLimitCents = e),
      await sleep(300),
      logFeatureOk("api_spend_limit_update"),
      { ok: !0, disabledUntil: null, usedCredits: s.usedCents ?? 0, reason: null }
    );
  try {
    let put = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/overage_spend_limit",
      { is_enabled: !0, monthly_credit_limit: e, currency: n },
      { auth: "teleport-org", credentials: r },
    );
    if (!put.ok) throw Error(`overage_spend_limit unavailable: ${put.reason}`);
    return (
      logFeatureOk("api_spend_limit_update"),
      {
        ok: !0,
        disabledUntil: put.data?.disabled_until ?? null,
        usedCredits: put.data?.used_credits ?? null,
        reason: null,
      }
    );
  } catch (error) {
    if (GJ(error)) logForDebugging(`updateSpendLimit failed: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    return (
      logFeatureBad("api_spend_limit_update", "request_failed"),
      { ok: !1, disabledUntil: null, usedCredits: null, reason: verificationErrorMessage(error) }
    );
  }
}
/**
 * 更新组织的自动充值设置。
 */
//@ chunk-e6aww6q8.js:1622117-1622791 placement
async function updateAutoReloadSettings(e, n, r, s, h) {
  let y = getLspManager();
  if (y)
    return (
      (y.autoReload = e),
      await sleep(300),
      logFeatureOk("api_auto_reload_update"),
      { ok: !0, reason: null }
    );
  try {
    let put = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/contracts/auto_reload_settings",
      {
        enabled: e,
        ...(n !== void 0 && { threshold_in_minor_units: n }),
        ...(r !== void 0 && { reload_to_in_minor_units: r }),
        currency: s,
      },
      { auth: "teleport-org", timeout: 30000, credentials: h },
    );
    if (!put.ok) throw Error(`auto_reload_settings unavailable: ${put.reason}`);
    return (logFeatureOk("api_auto_reload_update"), { ok: !0, reason: null });
  } catch (error) {
    if (GJ(error))
      logForDebugging(`auto_reload_settings update failed: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    return (
      logFeatureBad("api_auto_reload_update", "request_failed"),
      { ok: !1, reason: verificationErrorMessage(error) }
    );
  }
}
/**
 * 获取组织预付额度余额。
 */
//@ chunk-e6aww6q8.js:1622791-1623481 placement
async function fetchPrepaidBalance(e) {
  let n = getLspManager();
  if (n)
    return (
      logFeatureOk("api_prepaid_balance_fetch"),
      {
        amount: n.balanceCents,
        currency: n.currency,
        auto_reload_settings: { enabled: n.autoReload },
        expiry_policy_months: n.expiryPolicyMonths ?? null,
      }
    );
  try {
    let r = await apiClient.get("/api/oauth/organizations/:orgUUID/prepaid/credits", {
      auth: "teleport-org",
      timeout: 5000,
      credentials: e,
    });
    if (!r.ok) throw Error(`prepaid/credits unavailable: ${r.reason}`);
    if (typeof r.data?.amount !== "number")
      return (logFeatureSad("api_prepaid_balance_fetch", "not_supported"), null);
    return (logFeatureOk("api_prepaid_balance_fetch"), r.data);
  } catch (error) {
    if (GJ(error))
      logForDebugging(`prepaid balance fetch failed: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    return (logFeatureBad("api_prepaid_balance_fetch", "request_failed"), null);
  }
}
//@ chunk-e6aww6q8.js:1623481-1623694 placement
function buildMockCreditOptions(e) {
  return e.map(([n, r], s) => {
    let rounded = Math.round((n * r) / 100);
    return {
      id: `mock-${s}`,
      credit_minor_units: n,
      price_minor_units: n - rounded,
      discount_minor_units: rounded,
      local_credit_minor_units: n,
      local_price_minor_units: n - rounded,
    };
  });
}
//@ chunk-e6aww6q8.js:1623694-1623968 placement
var mapped_3 = [2500, 5000, 7500, 15000].map((e) => ({
    id: "",
    credit_minor_units: e,
    price_minor_units: e,
    discount_minor_units: 0,
    local_credit_minor_units: e,
    local_price_minor_units: e,
  })),
  h3o = {
    default: buildMockCreditOptions([
      [2500, 0],
      [5000, 0],
      [7500, 0],
      [15000, 0],
    ]),
    discounted: buildMockCreditOptions([
      [5000, 10],
      [25000, 20],
      [1e5, 30],
    ]),
  };
/**
 * 获取预付额度套餐列表。
 */
//@ chunk-e6aww6q8.js:1623968-1624727 placement
async function fetchPrepaidBundles(e) {
  let n = getLspManager();
  if (n)
    return (
      logFeatureOk("api_bundles_fetch"),
      {
        bundles: h3o[n.bundlePreset ?? "default"],
        bundle_paid_this_month_minor_units: 0,
        bundle_monthly_cap_minor_units: null,
        purchases_reset_at: new Date().toISOString(),
        currency: n.currency,
        stripe_product_id: "prod_mock",
        expiry_policy_months: n.expiryPolicyMonths ?? null,
      }
    );
  try {
    let r = await apiClient.get("/api/oauth/organizations/:orgUUID/prepaid/bundles", {
      auth: "teleport-org",
      timeout: 5000,
      credentials: e,
    });
    if (!r.ok) throw Error(`prepaid/bundles unavailable: ${r.reason}`);
    return (logFeatureOk("api_bundles_fetch"), r.data);
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404)
      return (logFeatureOk("api_bundles_fetch"), null);
    if (GJ(error)) logForDebugging(`getAvailableBundles failed: ${errorMessage(error)}`, { level: "error" });
    else logError(error);
    return (logFeatureSad("api_bundles_fetch", "request_failed"), null);
  }
}
/**
 * 获取组织的支付方式（测试替身存在时直接返回其值）。
 */
//@ chunk-e6aww6q8.js:1624727-1625041 placement
async function fetchPaymentMethod(credentials) {
  return withFeatureTelemetry("api_payment_method_fetch", async () => {
    let n = getLspManager();
    if (n) return n.paymentMethod;
    let r = await apiClient.get("/api/oauth/organizations/:orgUUID/payment_method", {
      auth: "teleport-org",
      timeout: 5000,
      credentials: credentials,
    });
    if (!r.ok) throw Error(`payment_method unavailable: ${r.reason}`);
    return r.data ?? null;
  });
}
/**
 * 购买 API 额度，处理 3DS 验证、待付发票轮询等状态。
 */
//@ chunk-e6aww6q8.js:1625041-1626081 placement
async function purchaseApiCredits(e, n) {
  return withFeatureTelemetry("api_credits_purchase", async () => {
    let r = getLspManager();
    if (r) {
      if ((await sleep(500), r.purchaseOutcome === "3ds"))
        return { payment_status: "requires_action", payment_intent_client_secret: "pi_mock_secret" };
      if (r.purchaseOutcome === "poll")
        return ((r.pollCount = 0), { payment_status: "pending_invoice", purchase_id: "mock-purchase-id" });
      return (
        (r.balanceCents +=
          e.kind === "bundle" ? e.bundle.credit_minor_units : (e.expectedCreditMinorUnits ?? e.amountCents)),
        { payment_status: "success" }
      );
    }
    let s =
        e.kind === "bundle"
          ? {
              amount: e.bundle.credit_minor_units,
              bundle_id: e.bundle.id,
              expected_price_minor_units: e.bundle.price_minor_units,
            }
          : {
              amount: e.amountCents,
              ...(e.expectedCreditMinorUnits !== void 0 && {
                expected_credit_minor_units: e.expectedCreditMinorUnits,
              }),
              ...(e.expectedPriceMinorUnits !== void 0 && {
                expected_price_minor_units: e.expectedPriceMinorUnits,
              }),
            },
      post = await apiClient.post("/api/oauth/organizations/:orgUUID/contracts/prepaid/credits", s, {
        auth: "teleport-org",
        timeout: 30000,
        credentials: n,
      });
    if (!post.ok) throw Error(`prepaid/credits purchase unavailable: ${post.reason}`);
    return post.data;
  });
}
/**
 * 预览购买额度的税费。
 */
//@ chunk-e6aww6q8.js:1626081-1626955 placement
async function previewPurchaseTax(e, n, r, s) {
  let h = getLspManager();
  if (h) {
    if (h.taxBps === void 0) return (logFeatureSad("api_purchase_tax_preview", "no_rate"), null);
    return (
      await sleep(200),
      logFeatureOk("api_purchase_tax_preview"),
      {
        tax_minor_units: Math.round((e * h.taxBps) / 1e4),
        tax_rate_pct: h.taxBps / 100,
        tax_label: h.taxLabel ?? null,
      }
    );
  }
  if (!r) return (logFeatureSad("api_purchase_tax_preview", "no_product_id"), null);
  try {
    let post = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/billing/tax_rate",
      { product_id: r, price: e, currency: n },
      { auth: "teleport-org", timeout: 5000, credentials: s },
    );
    if (!post.ok) throw Error(`billing/tax_rate unavailable: ${post.reason}`);
    let tax_rate = post.data.tax_rate;
    if (tax_rate == null) return (logFeatureSad("api_purchase_tax_preview", "no_rate"), null);
    return (
      logFeatureOk("api_purchase_tax_preview"),
      {
        tax_minor_units: Math.round((e * tax_rate) / 100),
        tax_rate_pct: tax_rate,
        tax_label: post.data.tax_label ?? null,
      }
    );
  } catch (error) {
    return (
      logForDebugging(`tax_rate preview unavailable: ${error}`),
      logFeatureBad("api_purchase_tax_preview", "request_failed"),
      null
    );
  }
}
/**
 * 查询预付额度购买的状态（测试替身下模拟两次后变为 paid）。
 */
//@ chunk-e6aww6q8.js:1626955-1627336 placement
async function fetchPrepaidPurchaseStatus(purchaseId, credentials) {
  let r = getLspManager();
  if (r) {
    r.pollCount = (r.pollCount ?? 0) + 1;
    let h = r.pollCount >= 2 ? "paid" : "pending";
    return { purchase_id: purchaseId, status: h, stripe_payment_intent_client_secret: null };
  }
  let s = await apiClient.get(`/api/oauth/organizations/:orgUUID/prepaid/commits/${purchaseId}`, {
    auth: "teleport-org",
    credentials: credentials,
  });
  if (!s.ok) throw Error(`prepaid/commits status unavailable: ${s.reason}`);
  return s.data;
}

export {
  fetchPrepaidBalance,
  fetchPaymentMethod,
  fetchPrepaidBundles,
  mapped_3,
  enableOverageBilling,
  updateAutoReloadSettings,
  purchaseApiCredits,
  updateOverageSpendLimit,
  previewPurchaseTax,
  fetchPrepaidPurchaseStatus,
  RUo,
};
