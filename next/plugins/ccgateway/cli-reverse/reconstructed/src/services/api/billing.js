/**
 * services/api/billing.ts
 *
 * 2.1.316 新增：API 额度购买（含 3DS 验证与发票轮询）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (12)
 * attribution: placement 12
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1688326-1688381 placement
/**
 * 导出函数 `isExpectedBillingError`。
 */
var isExpectedBillingError = (error) =>
  isExpectedApiError(
    error,
    (apiError) => verificationErrorMessage(apiError) !== null || !isAxiosError(apiError),
  );
var DEFAULT_MONTHLY_SPEND_LIMIT = 2000;
//@ chunk-5xgkngpb.js:1688381-1689078 placement
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
    let setupResponse = await apiClient.post(
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
    if (!setupResponse.ok) throw Error(`setup_overage_billing unavailable: ${setupResponse.reason}`);
    let limitResponse = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/overage_spend_limit",
      {
        is_enabled: true,
      },
      {
        auth: "teleport-org",
        credentials,
      },
    );
    if (!limitResponse.ok) throw Error(`overage_spend_limit unavailable: ${limitResponse.reason}`);
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
//@ chunk-5xgkngpb.js:1689078-1689820 placement
/**
 * 更新组织的超额支出上限。
 */
async function updateOverageSpendLimit(spendLimitCents, currency, credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    lspManager.spendLimitCents = spendLimitCents;
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
    let response = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/overage_spend_limit",
      {
        is_enabled: true,
        monthly_credit_limit: spendLimitCents,
        currency,
      },
      {
        auth: "teleport-org",
        credentials,
      },
    );
    if (!response.ok) throw Error(`overage_spend_limit unavailable: ${response.reason}`);
    logFeatureOk("api_spend_limit_update");
    return {
      ok: true,
      disabledUntil: response.data?.disabled_until ?? null,
      usedCredits: response.data?.used_credits ?? null,
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
//@ chunk-5xgkngpb.js:1689820-1690495 placement
/**
 * 更新组织的自动充值设置。
 */
async function updateAutoReloadSettings(
  enabled,
  thresholdMinorUnits,
  reloadToMinorUnits,
  currency,
  credentials,
) {
  let lspManager = getLspManager();
  if (lspManager) {
    lspManager.autoReload = enabled;
    await sleep(300);
    logFeatureOk("api_auto_reload_update");
    return {
      ok: true,
      reason: null,
    };
  }
  try {
    let response = await apiClient.put(
      "/api/oauth/organizations/:orgUUID/contracts/auto_reload_settings",
      {
        enabled,
        ...(thresholdMinorUnits !== undefined && {
          threshold_in_minor_units: thresholdMinorUnits,
        }),
        ...(reloadToMinorUnits !== undefined && {
          reload_to_in_minor_units: reloadToMinorUnits,
        }),
        currency,
      },
      {
        auth: "teleport-org",
        timeout: 30000,
        credentials,
      },
    );
    if (!response.ok) throw Error(`auto_reload_settings unavailable: ${response.reason}`);
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
//@ chunk-5xgkngpb.js:1690495-1691186 placement
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
    let response = await apiClient.get("/api/oauth/organizations/:orgUUID/prepaid/credits", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
    });
    if (!response.ok) throw Error(`prepaid/credits unavailable: ${response.reason}`);
    if (typeof response.data?.amount !== "number") {
      logFeatureSad("api_prepaid_balance_fetch", "not_supported");
      return null;
    }
    logFeatureOk("api_prepaid_balance_fetch");
    return response.data;
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
//@ chunk-5xgkngpb.js:1691186-1691399 placement
function buildMockCreditOptions(creditOptions) {
  return creditOptions.map(([creditMinorUnits, discountPercent], index) => {
    let rounded = Math.round((creditMinorUnits * discountPercent) / 100);
    return {
      id: `mock-${index}`,
      credit_minor_units: creditMinorUnits,
      price_minor_units: creditMinorUnits - rounded,
      discount_minor_units: rounded,
      local_credit_minor_units: creditMinorUnits,
      local_price_minor_units: creditMinorUnits - rounded,
    };
  });
}
//@ chunk-5xgkngpb.js:1691399-1691673 placement
/**
 * 计费接口的模拟数据：预付额度套餐的四档金额与默认/折扣两组 mock 套餐。
 */
var mapped_3; // deferred: uses buildMockCreditOptions of its import cycle while loading; runs once the cycle is complete
var MOCK_CREDIT_BUNDLES;
deferInit("chunk-5xgkngpb.js:1691399", () => {
  mapped_3 = [2500, 5000, 7500, 15000].map((creditMinorUnits) => ({
    id: "",
    credit_minor_units: creditMinorUnits,
    price_minor_units: creditMinorUnits,
    discount_minor_units: 0,
    local_credit_minor_units: creditMinorUnits,
    local_price_minor_units: creditMinorUnits,
  }));
  MOCK_CREDIT_BUNDLES = {
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
});
//@ chunk-5xgkngpb.js:1691673-1692433 placement
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
    let response = await apiClient.get("/api/oauth/organizations/:orgUUID/prepaid/bundles", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
    });
    if (!response.ok) throw Error(`prepaid/bundles unavailable: ${response.reason}`);
    logFeatureOk("api_bundles_fetch");
    return response.data;
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
//@ chunk-5xgkngpb.js:1692433-1692747 placement
/**
 * 获取组织的支付方式（测试替身存在时直接返回其值）。
 */
async function fetchPaymentMethod(credentials) {
  return withFeatureTelemetry("api_payment_method_fetch", async () => {
    let lspManager = getLspManager();
    if (lspManager) return lspManager.paymentMethod;
    let response = await apiClient.get("/api/oauth/organizations/:orgUUID/payment_method", {
      auth: "teleport-org",
      timeout: 5000,
      credentials,
    });
    if (!response.ok) throw Error(`payment_method unavailable: ${response.reason}`);
    return response.data ?? null;
  });
}
//@ chunk-5xgkngpb.js:1692747-1693787 placement
/**
 * 购买 API 额度，处理 3DS 验证、待付发票轮询等状态。
 */
async function purchaseApiCredits(purchaseRequest, credentials) {
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
        purchaseRequest.kind === "bundle"
          ? purchaseRequest.bundle.credit_minor_units
          : (purchaseRequest.expectedCreditMinorUnits ?? purchaseRequest.amountCents);
      return {
        payment_status: "success",
      };
    }
    let requestBody =
      purchaseRequest.kind === "bundle"
        ? {
            amount: purchaseRequest.bundle.credit_minor_units,
            bundle_id: purchaseRequest.bundle.id,
            expected_price_minor_units: purchaseRequest.bundle.price_minor_units,
          }
        : {
            amount: purchaseRequest.amountCents,
            ...(purchaseRequest.expectedCreditMinorUnits !== undefined && {
              expected_credit_minor_units: purchaseRequest.expectedCreditMinorUnits,
            }),
            ...(purchaseRequest.expectedPriceMinorUnits !== undefined && {
              expected_price_minor_units: purchaseRequest.expectedPriceMinorUnits,
            }),
          };
    let response = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/contracts/prepaid/credits",
      requestBody,
      {
        auth: "teleport-org",
        timeout: 30000,
        credentials,
      },
    );
    if (!response.ok) throw Error(`prepaid/credits purchase unavailable: ${response.reason}`);
    return response.data;
  });
}
//@ chunk-5xgkngpb.js:1693787-1694661 placement
/**
 * 预览购买额度的税费。
 */
async function previewPurchaseTax(amountCents, currency, stripeProductId, credentials) {
  let lspManager = getLspManager();
  if (lspManager) {
    if (lspManager.taxBps === undefined) {
      logFeatureSad("api_purchase_tax_preview", "no_rate");
      return null;
    }
    await sleep(200);
    logFeatureOk("api_purchase_tax_preview");
    return {
      tax_minor_units: Math.round((amountCents * lspManager.taxBps) / 1e4),
      tax_rate_pct: lspManager.taxBps / 100,
      tax_label: lspManager.taxLabel ?? null,
    };
  }
  if (!stripeProductId) {
    logFeatureSad("api_purchase_tax_preview", "no_product_id");
    return null;
  }
  try {
    let response = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/billing/tax_rate",
      {
        product_id: stripeProductId,
        price: amountCents,
        currency,
      },
      {
        auth: "teleport-org",
        timeout: 5000,
        credentials,
      },
    );
    if (!response.ok) throw Error(`billing/tax_rate unavailable: ${response.reason}`);
    let taxRate = response.data.tax_rate;
    if (taxRate == null) {
      logFeatureSad("api_purchase_tax_preview", "no_rate");
      return null;
    }
    logFeatureOk("api_purchase_tax_preview");
    return {
      tax_minor_units: Math.round((amountCents * taxRate) / 100),
      tax_rate_pct: taxRate,
      tax_label: response.data.tax_label ?? null,
    };
  } catch (error) {
    logForDebugging(`tax_rate preview unavailable: ${error}`);
    logFeatureBad("api_purchase_tax_preview", "request_failed");
    return null;
  }
}
//@ chunk-5xgkngpb.js:1694661-1695042 placement
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
  let response = await apiClient.get(`/api/oauth/organizations/:orgUUID/prepaid/commits/${purchaseId}`, {
    auth: "teleport-org",
    credentials,
  });
  if (!response.ok) throw Error(`prepaid/commits status unavailable: ${response.reason}`);
  return response.data;
}
export {
  updateOverageSpendLimit,
  fetchPrepaidBalance,
  enableOverageBilling,
  previewPurchaseTax,
  fetchPrepaidPurchaseStatus,
  fetchPaymentMethod,
  fetchPrepaidBundles,
  mapped_3,
  updateAutoReloadSettings,
  purchaseApiCredits,
  DEFAULT_MONTHLY_SPEND_LIMIT,
};
