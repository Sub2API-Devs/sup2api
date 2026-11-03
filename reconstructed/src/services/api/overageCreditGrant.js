/**
 * services/api/overageCreditGrant.ts
 *
 * overage 信用赠送活动（FotW）：查询资格、领取、本地缓存与已领取/已完成标记，以及组织 API 路径工具。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/api/overageCreditGrant.ts
 * pieces: chunk-06y4szbn.js (1), chunk-0ba63vr9.js (9), chunk-3g0djq3w.js (2), chunk-9cjx5pnm.js (1), chunk-zn8pzrw0.js (1)
 * attribution: fingerprint 5, layout 7, placement 2
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
import { rosterAccountKey } from "../artifacts/capabilityRoster.js";
import { encodePathSegment } from "./apiPath.js";

//@ chunk-0ba63vr9.js:4406-4536 fingerprint = getCachedOverageCreditGrant (0.587)
/**
 * 取未过期的资格缓存。
 */
function getCachedOverageCreditGrant(orgId, feature) {
  let cached = getGlobalConfig().fotwEligibilityCache?.[orgId]?.[feature];
  if (!cached) return null;
  if (Date.now() - cached.timestamp > FOTW_DAY_MS) return null;
  return cached.info;
}
//@ chunk-0ba63vr9.js:4536-5596 layout
/**
 * POST overage_credit_grant 领取并启用 overage。
 */
async function claimOverageCreditGrant(e, credentials) {
  if (!canClaimPromoCreditFor(e))
    return {
      outcome: "skipped",
    };
  let i = activePromo();
  if (!i)
    return {
      outcome: "skipped",
    };
  let { campaign, orgId } = i;
  let o = promoCreditAmount();
  let l;
  try {
    l = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/overage_credit_grant",
      {
        campaign: FEATURE_OF_THE_WEEK,
        feature: campaign.feature,
        enable_overages: true,
      },
      {
        auth: "teleport-org",
        timeout: 60000,
        validateStatus: (s) => s < 500,
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
  if (!l.ok)
    return {
      outcome: "failed",
    };
  if (l.status >= 400) {
    if (parseGrantErrorMessage(l.data) === "Failed to grant credit") {
      logFeatureBad("api_fotw_claim", "grant_failed");
      return {
        outcome: "failed",
      };
    }
    logFeatureSad("api_fotw_claim", "not_available");
    refreshOverageCreditGrantCache(orgId, campaign.feature, {
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
  if (!l.data.success) {
    logFeatureBad("api_fotw_claim", "grant_failed");
    return {
      outcome: "failed",
    };
  }
  logFeatureOk("api_fotw_claim");
  markFeatureClaimed(orgId, campaign.feature);
  return {
    outcome: "granted",
    amountMinorUnits: l.data.amount_minor_units ?? o?.amountMinorUnits ?? 0,
    currency: l.data.currency ?? o?.currency ?? "USD",
    expiresAt: l.data.expires_at ?? null,
  };
}
//@ chunk-0ba63vr9.js:5596-5640 layout
/**
 * 错误响应 schema {error:{message}}。
 */
var grantErrorSchema = DoctorLazy(() =>
  create({
    error: create({
      message: create_2(),
    }),
  }),
);
//@ chunk-0ba63vr9.js:5640-5722 layout
/**
 * 取错误消息。
 */
function parseGrantErrorMessage(e) {
  let n = grantErrorSchema().safeParse(e);
  return n.success ? n.data.error.message : undefined;
}
//@ chunk-0ba63vr9.js:5722-5805 layout
/**
 * 该组织是否已领取该功能的赠送。
 */
function hasClaimedFeature(organizationUuid, feature) {
  let fotwClaimedFeatures = getGlobalConfig().fotwClaimedFeatures;
  return Boolean(fotwClaimedFeatures?.[organizationUuid]?.includes(feature));
}
//@ chunk-0ba63vr9.js:5805-5968 layout
/**
 * 记录已领取。
 */
function markFeatureClaimed(orgId, feature) {
  saveGlobalConfig((i) => {
    let r = i.fotwClaimedFeatures?.[orgId] ?? [];
    if (r.includes(feature)) return i;
    return {
      ...i,
      fotwClaimedFeatures: {
        ...i.fotwClaimedFeatures,
        [orgId]: [...r, feature],
      },
    };
  });
}
//@ chunk-0ba63vr9.js:5968-6051 layout
/**
 * 该组织是否已完成该功能的 upsell。
 */
function isUpsellFulfilled(orgId, feature) {
  let fotwUpsellFulfilled = getGlobalConfig().fotwUpsellFulfilled;
  return Boolean(fotwUpsellFulfilled?.[orgId]?.includes(feature));
}
//@ chunk-0ba63vr9.js:6051-6311 layout
/**
 * viewer 身份且满足条件时记录 upsell 已完成。
 */
function markUpsellFulfilled(commandName) {
  let n = activePromo();
  if (!n || n.audience !== "viewer" || !isPromoCommand(commandName)) return;
  let { orgId, campaign } = n;
  saveGlobalConfig((a) => {
    let o = a.fotwUpsellFulfilled?.[orgId] ?? [];
    if (o.includes(campaign.feature)) return a;
    return {
      ...a,
      fotwUpsellFulfilled: {
        ...a.fotwUpsellFulfilled,
        [orgId]: [...o, campaign.feature],
      },
    };
  });
}
//@ chunk-0ba63vr9.js:6311-6770 fingerprint = refreshOverageCreditGrantCache (0.791)
/**
 * 更新资格缓存（可只在缺失/过期时写）。
 */
function refreshOverageCreditGrantCache(orgId, feature, info, { onlyIfAbsent: r = false } = {}) {
  saveGlobalConfig((prev) => {
    let prevCached = prev.fotwEligibilityCache?.[orgId]?.[feature];
    let dataUnchanged = prevCached && Date.now() - prevCached.timestamp <= FOTW_DAY_MS;
    if (r && dataUnchanged) return prev;
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
//@ chunk-3g0djq3w.js:5566-5968 placement
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
  let T = refreshPromoEligibility(credentials);
  if (!isPromoCommand(commandName)) return;
  if (canClaimPromoCreditFor(commandName)) {
    startOverageClaim(commandName, setAppState, credentials);
    return;
  }
  T.then((p) => {
    if (canClaimPromoCreditFor(commandName)) {
      startOverageClaim(commandName, setAppState, credentials);
      return;
    }
    if (!p) return;
    let h = promoCommand();
    if (!h) return;
    setAppState((y) => ({
      ...y,
      fotwClaim: {
        phase: "needs_payment_setup",
        command: h,
        amountMinorUnits: p.amountMinorUnits,
        currency: p.currency,
      },
    }));
  });
}
//@ chunk-3g0djq3w.js:5968-6432 placement
/**
 * 开始领取超额额度：设置 pending 状态，完成后更新为 granted 或 failed。
 */
function startOverageClaim(commandName, setAppState, credentials) {
  let u = promoCommand();
  let s = promoCreditAmount();
  if (!u || !s) return;
  setAppState((T) => ({
    ...T,
    fotwClaim: {
      phase: "pending",
      command: u,
      amountMinorUnits: s.amountMinorUnits,
      currency: s.currency,
    },
  }));
  claimOverageCreditGrant(commandName, credentials)
    .catch(() => ({
      outcome: "failed",
    }))
    .then((T) => {
      setAppState((p) => {
        let fotwClaim = p.fotwClaim;
        if (!fotwClaim || fotwClaim.command !== u) return p;
        if (T.outcome === "granted")
          return {
            ...p,
            fotwClaim: {
              phase: "granted",
              command: fotwClaim.command,
              amountMinorUnits: T.amountMinorUnits,
              currency: T.currency,
            },
          };
        return {
          ...p,
          fotwClaim: {
            ...fotwClaim,
            phase: "failed",
          },
        };
      });
    });
}
//@ chunk-06y4szbn.js:3058-3214 fingerprint = invalidateOverageCreditGrantCache (0.667)
/**
 * 缓存的赠送信息属于当前账号与组织时返回。旧版名 invalidateOverageCreditGrantCache 不准确。
 */
function invalidateOverageCreditGrantCache(e) {
  let n = rosterAccountKey();
  if (
    n === undefined ||
    !e.success ||
    e.data.accountUuid !== n.accountUuid ||
    e.data.organizationUuid !== n.organizationUuid
  )
    return;
  return e.data;
}
//@ chunk-9cjx5pnm.js:14005-14069 fingerprint = fetchOverageCreditGrant (0.561)
/**
 * /api/oauth/organizations/<orgId>。旧版名 fetchOverageCreditGrant 为错配。
 */
var organizationApiPath = (e) => `/api/oauth/organizations/${encodePathSegment(e.organization.id)}`;
//@ chunk-zn8pzrw0.js:3581-3648 fingerprint = formatGrantAmount (0.582)
/**
 * 旧版名 formatGrantAmount 为错配。
 */
function isUsdCurrency(info) {
  return typeof info === "string" && info.toUpperCase() === "USD";
}
export {
  invalidateOverageCreditGrantCache,
  hasClaimedFeature,
  getCachedOverageCreditGrant,
  isUpsellFulfilled,
  markFeatureClaimed,
  refreshOverageCreditGrantCache,
  claimCommandOverageCredit,
  organizationApiPath,
  isUsdCurrency,
};
