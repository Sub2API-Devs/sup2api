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
/**
 * 导出函数 `isExpectedBillingError`。
 */
var isExpectedBillingError = (error) =>
  isExpectedApiError(error, (n) => verificationErrorMessage(n) !== null || !isAxiosError(n));
var DEFAULT_MONTHLY_SPEND_LIMIT = 2000;
//@ chunk-e6aww6q8.js:1620680-1621376 placement
/**
 * 为组织开启超额计费。
 */
async function enableOverageBilling(credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    lspManager.isEnabled = true;
    await sleep(300);
    logFeatureOk("api_overage_enable");
    return true;
  }
  try {
    let r = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/setup_overage_billing",
      {
        org_monthly_spend_limit: DEFAULT_MONTHLY_SPEND_LIMIT,
      },
      {
        auth: "teleport-org",
        timeout: 30000,
        credentials,
      },
    );
    if (!r.ok) throw Error(`setup_overage_billing unavailable: ${r.reason}`);
    let s = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/overage_spend_limit",
      {
        is_enabled: true,
      },
      {
        auth: "teleport-org",
        credentials,
      },
    );
    if (!s.ok) throw Error(`overage_spend_limit unavailable: ${s.reason}`);
    logFeatureOk("api_overage_enable");
    return true;
  } catch (error) {
    if (isExpectedBillingError(error))
      logForDebugging(`overage setup failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureBad("api_overage_enable", "request_failed");
    return false;
  }
}
//@ chunk-e6aww6q8.js:1621376-1622117 placement
/**
 * 更新组织的超额支出上限。
 */
async function updateOverageSpendLimit(e, currency, credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    lspManager.spendLimitCents = e;
    await sleep(300);
    logFeatureOk("api_spend_limit_update");
    return {
      ok: true,
      disabledUntil: null,
      usedCredits: lspManager.usedCents ?? 0,
      reason: null,
    };
  }
  try {
    let h = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/overage_spend_limit",
      {
        is_enabled: true,
        monthly_credit_limit: e,
        currency,
      },
      {
        auth: "teleport-org",
        credentials,
      },
    );
    if (!h.ok) throw Error(`overage_spend_limit unavailable: ${h.reason}`);
    logFeatureOk("api_spend_limit_update");
    return {
      ok: true,
      disabledUntil: h.data?.disabled_until ?? null,
      usedCredits: h.data?.used_credits ?? null,
      reason: null,
    };
  } catch (error) {
    if (isExpectedBillingError(error))
      logForDebugging(`updateSpendLimit failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureBad("api_spend_limit_update", "request_failed");
    return {
      ok: false,
      disabledUntil: null,
      usedCredits: null,
      reason: verificationErrorMessage(error),
    };
  }
}
//@ chunk-e6aww6q8.js:1622117-1622791 placement
/**
 * 更新组织的自动充值设置。
 */
async function updateAutoReloadSettings(e, n, r, currency, credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    lspManager.autoReload = e;
    await sleep(300);
    logFeatureOk("api_auto_reload_update");
    return {
      ok: true,
      reason: null,
    };
  }
  try {
    let S = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/contracts/auto_reload_settings",
      {
        enabled: e,
        ...(n !== undefined && {
          threshold_in_minor_units: n,
        }),
        ...(r !== undefined && {
          reload_to_in_minor_units: r,
        }),
        currency,
      },
      {
        auth: "teleport-org",
        timeout: 30000,
        credentials,
      },
    );
    if (!S.ok) throw Error(`auto_reload_settings unavailable: ${S.reason}`);
    logFeatureOk("api_auto_reload_update");
    return {
      ok: true,
      reason: null,
    };
  } catch (error) {
    if (isExpectedBillingError(error))
      logForDebugging(`auto_reload_settings update failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureBad("api_auto_reload_update", "request_failed");
    return {
      ok: false,
      reason: verificationErrorMessage(error),
    };
  }
}
//@ chunk-e6aww6q8.js:1622791-1623481 placement
/**
 * 获取组织预付额度余额。
 */
async function fetchPrepaidBalance(credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    logFeatureOk("api_prepaid_balance_fetch");
    return {
      amount: lspManager.balanceCents,
      currency: lspManager.currency,
      auto_reload_settings: {
        enabled: lspManager.autoReload,
      },
      expiry_policy_months: lspManager.expiryPolicyMonths ?? null,
    };
  }
  try {
    let r = await apiClient.get("/api/oauth/organizations/:orgUUID/prepaid/credits", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
    });
    if (!r.ok) throw Error(`prepaid/credits unavailable: ${r.reason}`);
    if (typeof r.data?.amount !== "number") {
      logFeatureSad("api_prepaid_balance_fetch", "not_supported");
      return null;
    }
    logFeatureOk("api_prepaid_balance_fetch");
    return r.data;
  } catch (error) {
    if (isExpectedBillingError(error))
      logForDebugging(`prepaid balance fetch failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureBad("api_prepaid_balance_fetch", "request_failed");
    return null;
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
/**
 * 计费接口的模拟数据：预付额度套餐的四档金额与默认/折扣两组 mock 套餐。
 */
var mapped_3 = [2500, 5000, 7500, 15000].map((e) => ({
  id: "",
  credit_minor_units: e,
  price_minor_units: e,
  discount_minor_units: 0,
  local_credit_minor_units: e,
  local_price_minor_units: e,
}));
var MOCK_CREDIT_BUNDLES = {
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
//@ chunk-e6aww6q8.js:1623968-1624727 placement
/**
 * 获取预付额度套餐列表。
 */
async function fetchPrepaidBundles(credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    logFeatureOk("api_bundles_fetch");
    return {
      bundles: MOCK_CREDIT_BUNDLES[lspManager.bundlePreset ?? "default"],
      bundle_paid_this_month_minor_units: 0,
      bundle_monthly_cap_minor_units: null,
      purchases_reset_at: new Date().toISOString(),
      currency: lspManager.currency,
      stripe_product_id: "prod_mock",
      expiry_policy_months: lspManager.expiryPolicyMonths ?? null,
    };
  }
  try {
    let r = await apiClient.get("/api/oauth/organizations/:orgUUID/prepaid/bundles", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
    });
    if (!r.ok) throw Error(`prepaid/bundles unavailable: ${r.reason}`);
    logFeatureOk("api_bundles_fetch");
    return r.data;
  } catch (error) {
    if (isAxiosError(error) && error.response?.status === 404) {
      logFeatureOk("api_bundles_fetch");
      return null;
    }
    if (isExpectedBillingError(error))
      logForDebugging(`getAvailableBundles failed: ${errorMessage(error)}`, {
        level: "error",
      });
    else logError(error);
    logFeatureSad("api_bundles_fetch", "request_failed");
    return null;
  }
}
//@ chunk-e6aww6q8.js:1624727-1625041 placement
/**
 * 获取组织的支付方式（测试替身存在时直接返回其值）。
 */
async function fetchPaymentMethod(credentials) {
  return withFeatureTelemetry("api_payment_method_fetch", async () => {
    let lspManager = getLspManager();
    if (lspManager) return lspManager.paymentMethod;
    let r = await apiClient.get("/api/oauth/organizations/:orgUUID/payment_method", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
    });
    if (!r.ok) throw Error(`payment_method unavailable: ${r.reason}`);
    return r.data ?? null;
  });
}
//@ chunk-e6aww6q8.js:1625041-1626081 placement
/**
 * 购买 API 额度，处理 3DS 验证、待付发票轮询等状态。
 */
async function purchaseApiCredits(e, credentials) {
  return withFeatureTelemetry("api_credits_purchase", async () => {
    let lspManager = getLspManager();
    if (lspManager) {
      await sleep(500);
      if (lspManager.purchaseOutcome === "3ds")
        return {
          payment_status: "requires_action",
          payment_intent_client_secret: "pi_mock_secret",
        };
      if (lspManager.purchaseOutcome === "poll") {
        lspManager.pollCount = 0;
        return {
          payment_status: "pending_invoice",
          purchase_id: "mock-purchase-id",
        };
      }
      lspManager.balanceCents +=
        e.kind === "bundle" ? e.bundle.credit_minor_units : (e.expectedCreditMinorUnits ?? e.amountCents);
      return {
        payment_status: "success",
      };
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
            ...(e.expectedCreditMinorUnits !== undefined && {
              expected_credit_minor_units: e.expectedCreditMinorUnits,
            }),
            ...(e.expectedPriceMinorUnits !== undefined && {
              expected_price_minor_units: e.expectedPriceMinorUnits,
            }),
          };
    let h = await apiClient.post("/api/oauth/organizations/:orgUUID/contracts/prepaid/credits", s, {
      auth: "teleport-org",
      timeout: 30000,
      credentials,
    });
    if (!h.ok) throw Error(`prepaid/credits purchase unavailable: ${h.reason}`);
    return h.data;
  });
}
//@ chunk-e6aww6q8.js:1626081-1626955 placement
/**
 * 预览购买额度的税费。
 */
async function previewPurchaseTax(e, currency, stripeProductId, credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    if (lspManager.taxBps === undefined) {
      logFeatureSad("api_purchase_tax_preview", "no_rate");
      return null;
    }
    await sleep(200);
    logFeatureOk("api_purchase_tax_preview");
    return {
      tax_minor_units: Math.round((e * lspManager.taxBps) / 1e4),
      tax_rate_pct: lspManager.taxBps / 100,
      tax_label: lspManager.taxLabel ?? null,
    };
  }
  if (!stripeProductId) {
    logFeatureSad("api_purchase_tax_preview", "no_product_id");
    return null;
  }
  try {
    let y = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/billing/tax_rate",
      {
        product_id: stripeProductId,
        price: e,
        currency,
      },
      {
        auth: "teleport-org",
        timeout: 5000,
        credentials,
      },
    );
    if (!y.ok) throw Error(`billing/tax_rate unavailable: ${y.reason}`);
    let taxRate = y.data.tax_rate;
    if (taxRate == null) {
      logFeatureSad("api_purchase_tax_preview", "no_rate");
      return null;
    }
    logFeatureOk("api_purchase_tax_preview");
    return {
      tax_minor_units: Math.round((e * taxRate) / 100),
      tax_rate_pct: taxRate,
      tax_label: y.data.tax_label ?? null,
    };
  } catch (error) {
    logForDebugging(`tax_rate preview unavailable: ${error}`);
    logFeatureBad("api_purchase_tax_preview", "request_failed");
    return null;
  }
}
//@ chunk-e6aww6q8.js:1626955-1627336 placement
/**
 * 查询预付额度购买的状态（测试替身下模拟两次后变为 paid）。
 */
async function fetchPrepaidPurchaseStatus(purchaseId, credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    lspManager.pollCount = (lspManager.pollCount ?? 0) + 1;
    let status = lspManager.pollCount >= 2 ? "paid" : "pending";
    return {
      purchase_id: purchaseId,
      status,
      stripe_payment_intent_client_secret: null,
    };
  }
  let s = await apiClient.get(`/api/oauth/organizations/:orgUUID/prepaid/commits/${purchaseId}`, {
    auth: "teleport-org",
    credentials,
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
  DEFAULT_MONTHLY_SPEND_LIMIT,
};
