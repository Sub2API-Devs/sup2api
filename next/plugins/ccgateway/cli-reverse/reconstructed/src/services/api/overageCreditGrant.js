/**
 * services/api/overageCreditGrant.ts
 *
 * overage 信用赠送活动（FotW）：查询资格、领取、本地缓存与已领取/已完成标记，以及组织 API 路径工具。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/overageCreditGrant.ts
 * pieces: chunk-53f0ndkv.js (1), chunk-77qzxtqv.js (1), chunk-a76zrsb5.js (9), chunk-g88zyy4n.js (2)
 * attribution: fingerprint 4, layout 7, placement 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import {
  FOTW_DAY_MS,
  canClaimPromoCreditFor,
  activePromo,
  promoCreditAmount,
  FEATURE_OF_THE_WEEK,
  isPromoCommand,
  refreshPromoEligibility,
  promoCommand,
} from "./featureOfTheWeek.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { encodePathSegment } from "./apiPath.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-53f0ndkv.js:2392-2458 fingerprint (2.1.88 match: formatGrantAmount, 0.58)
/**
 * 旧版名 formatGrantAmount 为错配。
 */
function isUsdCurrency(info) {
  return typeof info === "string" && info.toUpperCase() === "USD";
}
//@ chunk-a76zrsb5.js:4406-4536 fingerprint (2.1.88 match: getCachedOverageCreditGrant, 0.588)
/**
 * 取未过期的资格缓存。
 */
function getCachedOverageCreditGrant(orgId, feature) {
  let cached = getGlobalConfig().fotwEligibilityCache?.[orgId]?.[feature];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > FOTW_DAY_MS) return null;
  return cached.info;
}
//@ chunk-a76zrsb5.js:4536-5596 layout
/**
 * POST overage_credit_grant 领取并启用 overage。
 */
async function claimOverageCreditGrant(orgId, credentials) {
  if (!canClaimPromoCreditFor(orgId))
    return {
      outcome: "skipped",
    };
  let promo = activePromo();
  if (!promo)
    return {
      outcome: "skipped",
    };
  let { campaign, orgId: orgId_2 } = promo;
  let amount = promoCreditAmount();
  let response;
  try {
    response = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/overage_credit_grant",
      {
        campaign: FEATURE_OF_THE_WEEK,
        feature: campaign.feature,
        enable_overages: true,
      },
      {
        auth: "teleport-org",
        timeout: 60000,
        validateStatus: (status) => status < 500,
        credentials,
      },
    );
  } catch (error) {
    logFeatureBad("api_fotw_claim", "request_failed");
    logForDebugging(`FotW claim failed: ${error}`, {
      level: "warn",
    });
    return {
      outcome: "failed",
    };
  }
  if (!response.ok)
    return {
      outcome: "failed",
    };
  if (response.status >= 400) {
    if (parseGrantErrorMessage(response.data) === "Failed to grant credit") {
      logFeatureBad("api_fotw_claim", "grant_failed");
      return {
        outcome: "failed",
      };
    }
    logFeatureSad("api_fotw_claim", "not_available");
    refreshOverageCreditGrantCache(orgId_2, campaign.feature, {
      available: false,
      eligible: false,
      granted: false,
      amount_minor_units: null,
      currency: null,
    });
    return {
      outcome: "not_available",
    };
  }
  if (!response.data.success) {
    logFeatureBad("api_fotw_claim", "grant_failed");
    return {
      outcome: "failed",
    };
  }
  logFeatureOk("api_fotw_claim");
  markFeatureClaimed(orgId_2, campaign.feature);
  return {
    outcome: "granted",
    amountMinorUnits: response.data.amount_minor_units ?? amount?.amountMinorUnits ?? 0,
    currency: response.data.currency ?? amount?.currency ?? "USD",
    expiresAt: response.data.expires_at ?? null,
  };
}
//@ chunk-a76zrsb5.js:5596-5640 layout
/**
 * 错误响应 schema {error:{message}}。
 */
var grantErrorSchema; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a76zrsb5.js:5596", () => {
  grantErrorSchema = DoctorLazy(() =>
    create({
      error: create({
        message: create_2(),
      }),
    }),
  );
});
//@ chunk-a76zrsb5.js:5640-5722 layout
/**
 * 取错误消息。
 */
function parseGrantErrorMessage(text) {
  let parsed = grantErrorSchema().safeParse(text);
  return parsed.success ? parsed.data.error.message : undefined;
}
//@ chunk-a76zrsb5.js:5722-5805 layout
/**
 * 该组织是否已领取该功能的赠送。
 */
function hasClaimedFeature(organizationUuid, feature) {
  let fotwClaimedFeatures = getGlobalConfig().fotwClaimedFeatures;
  return Boolean(fotwClaimedFeatures?.[organizationUuid]?.includes(feature));
}
//@ chunk-a76zrsb5.js:5805-5968 layout
/**
 * 记录已领取。
 */
function markFeatureClaimed(orgId, feature) {
  saveGlobalConfig((config) => {
    let claimed = config.fotwClaimedFeatures?.[orgId] ?? [];
    if (claimed.includes(feature)) return config;
    return {
      ...config,
      fotwClaimedFeatures: {
        ...config.fotwClaimedFeatures,
        [orgId]: [...claimed, feature],
      },
    };
  });
}
//@ chunk-a76zrsb5.js:5968-6051 layout
/**
 * 该组织是否已完成该功能的 upsell。
 */
function isUpsellFulfilled(orgId, feature) {
  let fotwUpsellFulfilled = getGlobalConfig().fotwUpsellFulfilled;
  return Boolean(fotwUpsellFulfilled?.[orgId]?.includes(feature));
}
//@ chunk-a76zrsb5.js:6051-6311 layout
/**
 * viewer 身份且满足条件时记录 upsell 已完成。
 */
function markUpsellFulfilled(command) {
  let promo = activePromo();
  if (!promo || promo.audience !== "viewer" || !isPromoCommand(command)) return;
  let { orgId, campaign } = promo;
  saveGlobalConfig((config) => {
    let fulfilled = config.fotwUpsellFulfilled?.[orgId] ?? [];
    if (fulfilled.includes(campaign.feature)) return config;
    return {
      ...config,
      fotwUpsellFulfilled: {
        ...config.fotwUpsellFulfilled,
        [orgId]: [...fulfilled, campaign.feature],
      },
    };
  });
}
//@ chunk-a76zrsb5.js:6311-6770 fingerprint (2.1.88 match: refreshOverageCreditGrantCache, 0.792)
/**
 * 更新资格缓存（可只在缺失/过期时写）。
 */
function refreshOverageCreditGrantCache(orgId, feature, info, { onlyIfAbsent = false } = {}) {
  saveGlobalConfig((prev) => {
    let prevCached = prev.fotwEligibilityCache?.[orgId]?.[feature];
    let dataUnchanged = prevCached && Date.now() - prevCached.timestamp <= FOTW_DAY_MS;
    if (onlyIfAbsent && dataUnchanged) return prev;
    if (
      prevCached &&
      prevCached.info.available === info.available &&
      prevCached.info.eligible === info.eligible &&
      prevCached.info.granted === info.granted &&
      prevCached.info.amount_minor_units === info.amount_minor_units &&
      prevCached.info.currency === info.currency &&
      dataUnchanged
    )
      return prev;
    return {
      ...prev,
      fotwEligibilityCache: {
        ...prev.fotwEligibilityCache,
        [orgId]: {
          ...prev.fotwEligibilityCache?.[orgId],
          [feature]: {
            info,
            timestamp: Date.now(),
          },
        },
      },
    };
  });
}
//@ chunk-g88zyy4n.js:5778-6180 placement
/**
 * 运行特定命令后尝试领取超额额度赠送（交互主会话），必要时提示设置付款方式。
 */
function claimCommandOverageCredit({
  commandName,
  agentId,
  isNonInteractiveSession,
  setAppState,
  credentials,
}) {
  if (agentId !== undefined || isNonInteractiveSession) return;
  if (isBgSession()) return;
  markUpsellFulfilled(commandName);
  let refresh = refreshPromoEligibility(credentials);
  if (!isPromoCommand(commandName)) return;
  if (canClaimPromoCreditFor(commandName)) {
    startOverageClaim(commandName, setAppState, credentials);
    return;
  }
  refresh.then((result) => {
    if (canClaimPromoCreditFor(commandName)) {
      startOverageClaim(commandName, setAppState, credentials);
      return;
    }
    if (!result) return;
    let command = promoCommand();
    if (!command) return;
    setAppState((state) => ({
      ...state,
      fotwClaim: {
        phase: "needs_payment_setup",
        command,
        amountMinorUnits: result.amountMinorUnits,
        currency: result.currency,
      },
    }));
  });
}
//@ chunk-g88zyy4n.js:6180-6644 placement
/**
 * 开始领取超额额度：设置 pending 状态，完成后更新为 granted 或 failed。
 */
function startOverageClaim(orgId, setAppState, credentials) {
  let command = promoCommand();
  let amount = promoCreditAmount();
  if (!command || !amount) return;
  setAppState((state) => ({
    ...state,
    fotwClaim: {
      phase: "pending",
      command,
      amountMinorUnits: amount.amountMinorUnits,
      currency: amount.currency,
    },
  }));
  claimOverageCreditGrant(orgId, credentials)
    .catch(() => ({
      outcome: "failed",
    }))
    .then((result) => {
      setAppState((state) => {
        let fotwClaim = state.fotwClaim;
        if (!fotwClaim || fotwClaim.command !== command) return state;
        if (result.outcome === "granted")
          return {
            ...state,
            fotwClaim: {
              phase: "granted",
              command: fotwClaim.command,
              amountMinorUnits: result.amountMinorUnits,
              currency: result.currency,
            },
          };
        return {
          ...state,
          fotwClaim: {
            ...fotwClaim,
            phase: "failed",
          },
        };
      });
    });
}
//@ chunk-77qzxtqv.js:14074-14138 fingerprint (2.1.88 match: fetchOverageCreditGrant, 0.561)
/**
 * /api/oauth/organizations/<orgId>。旧版名 fetchOverageCreditGrant 为错配。
 */
var organizationApiPath = (account) =>
  `/api/oauth/organizations/${encodePathSegment(account.organization.id)}`;
export {
  isUsdCurrency,
  claimCommandOverageCredit,
  organizationApiPath,
  hasClaimedFeature,
  getCachedOverageCreditGrant,
  isUpsellFulfilled,
  markFeatureClaimed,
  refreshOverageCreditGrantCache,
};
