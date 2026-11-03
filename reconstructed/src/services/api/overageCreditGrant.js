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
  _,
  WDr,
  activePromo,
  promoCreditAmount,
  FEATURE_OF_THE_WEEK,
  jDr,
  refreshPromoEligibility,
  BDr,
} from "./featureOfTheWeek.js";
import { apiClient } from "../routines/routinesApi.js";
import { logFeatureBad, logFeatureSad, logFeatureOk } from "../analytics/featureTelemetry.js";
import { logForDebugging } from "../../utils/debug.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { create, create_2 } from "../../../vendor/zod/lib/index.mjs";
import { isBgSession } from "../../utils/concurrentSessions.js";
import { rosterAccountKey } from "../artifacts/capabilityRoster.js";
import { encodePathSegment } from "./apiPath.js";

/**
 * 取未过期的资格缓存。
 */
//@ chunk-0ba63vr9.js:4406-4536 fingerprint = getCachedOverageCreditGrant (0.587)
function getCachedOverageCreditGrant(e, n) {
  let orgId = getGlobalConfig().fotwEligibilityCache?.[e]?.[n];
  if (!orgId) return null;
  if (Date.now() - orgId.timestamp > _) return null;
  return orgId.info;
}
/**
 * POST overage_credit_grant 领取并启用 overage。
 */
//@ chunk-0ba63vr9.js:4536-5596 layout
async function claimOverageCreditGrant(e, n) {
  if (!WDr(e)) return { outcome: "skipped" };
  let i = activePromo();
  if (!i) return { outcome: "skipped" };
  let { campaign: campaign, orgId: orgId } = i,
    o = promoCreditAmount(),
    l;
  try {
    l = await apiClient.post(
      "/api/oauth/organizations/:orgUUID/overage_credit_grant",
      { campaign: FEATURE_OF_THE_WEEK, feature: campaign.feature, enable_overages: !0 },
      { auth: "teleport-org", timeout: 60000, validateStatus: (s) => s < 500, credentials: n },
    );
  } catch (error) {
    return (
      logFeatureBad("api_fotw_claim", "request_failed"),
      logForDebugging(`FotW claim failed: ${error}`, { level: "warn" }),
      { outcome: "failed" }
    );
  }
  if (!l.ok) return { outcome: "failed" };
  if (l.status >= 400) {
    if (parseGrantErrorMessage(l.data) === "Failed to grant credit")
      return (logFeatureBad("api_fotw_claim", "grant_failed"), { outcome: "failed" });
    return (
      logFeatureSad("api_fotw_claim", "not_available"),
      refreshOverageCreditGrantCache(orgId, campaign.feature, {
        available: !1,
        eligible: !1,
        granted: !1,
        amount_minor_units: null,
        currency: null,
      }),
      { outcome: "not_available" }
    );
  }
  if (!l.data.success) return (logFeatureBad("api_fotw_claim", "grant_failed"), { outcome: "failed" });
  return (
    logFeatureOk("api_fotw_claim"),
    markFeatureClaimed(orgId, campaign.feature),
    {
      outcome: "granted",
      amountMinorUnits: l.data.amount_minor_units ?? o?.amountMinorUnits ?? 0,
      currency: l.data.currency ?? o?.currency ?? "USD",
      expiresAt: l.data.expires_at ?? null,
    }
  );
}
/**
 * 错误响应 schema {error:{message}}。
 */
//@ chunk-0ba63vr9.js:5596-5640 layout
var grantErrorSchema = DoctorLazy(() => create({ error: create({ message: create_2() }) }));
/**
 * 取错误消息。
 */
//@ chunk-0ba63vr9.js:5640-5722 layout
function parseGrantErrorMessage(e) {
  let safeParse = grantErrorSchema().safeParse(e);
  return safeParse.success ? safeParse.data.error.message : void 0;
}
/**
 * 该组织是否已领取该功能的赠送。
 */
//@ chunk-0ba63vr9.js:5722-5805 layout
function hasClaimedFeature(e, n) {
  let fotwClaimedFeatures = getGlobalConfig().fotwClaimedFeatures;
  return Boolean(fotwClaimedFeatures?.[e]?.includes(n));
}
/**
 * 记录已领取。
 */
//@ chunk-0ba63vr9.js:5805-5968 layout
function markFeatureClaimed(e, n) {
  saveGlobalConfig((i) => {
    let r = i.fotwClaimedFeatures?.[e] ?? [];
    if (r.includes(n)) return i;
    return { ...i, fotwClaimedFeatures: { ...i.fotwClaimedFeatures, [e]: [...r, n] } };
  });
}
/**
 * 该组织是否已完成该功能的 upsell。
 */
//@ chunk-0ba63vr9.js:5968-6051 layout
function isUpsellFulfilled(e, n) {
  let fotwUpsellFulfilled = getGlobalConfig().fotwUpsellFulfilled;
  return Boolean(fotwUpsellFulfilled?.[e]?.includes(n));
}
/**
 * viewer 身份且满足条件时记录 upsell 已完成。
 */
//@ chunk-0ba63vr9.js:6051-6311 layout
function markUpsellFulfilled(e) {
  let n = activePromo();
  if (!n || n.audience !== "viewer" || !jDr(e)) return;
  let { orgId: orgId, campaign: campaign } = n;
  saveGlobalConfig((a) => {
    let o = a.fotwUpsellFulfilled?.[orgId] ?? [];
    if (o.includes(campaign.feature)) return a;
    return { ...a, fotwUpsellFulfilled: { ...a.fotwUpsellFulfilled, [orgId]: [...o, campaign.feature] } };
  });
}
/**
 * 更新资格缓存（可只在缺失/过期时写）。
 */
//@ chunk-0ba63vr9.js:6311-6770 fingerprint = refreshOverageCreditGrantCache (0.791)
function refreshOverageCreditGrantCache(e, n, i, { onlyIfAbsent: r = !1 } = {}) {
  saveGlobalConfig((prev) => {
    let prevCached = prev.fotwEligibilityCache?.[e]?.[n],
      dataUnchanged = prevCached && Date.now() - prevCached.timestamp <= _;
    if (r && dataUnchanged) return prev;
    if (
      prevCached &&
      prevCached.info.available === i.available &&
      prevCached.info.eligible === i.eligible &&
      prevCached.info.granted === i.granted &&
      prevCached.info.amount_minor_units === i.amount_minor_units &&
      prevCached.info.currency === i.currency &&
      dataUnchanged
    )
      return prev;
    return {
      ...prev,
      fotwEligibilityCache: {
        ...prev.fotwEligibilityCache,
        [e]: { ...prev.fotwEligibilityCache?.[e], [n]: { info: i, timestamp: Date.now() } },
      },
    };
  });
}
/**
 * 运行特定命令后尝试领取超额额度赠送（交互主会话），必要时提示设置付款方式。
 */
//@ chunk-3g0djq3w.js:5566-5968 placement
function claimCommandOverageCredit({
  commandName: commandName,
  agentId: agentId,
  isNonInteractiveSession: isNonInteractiveSession,
  setAppState: setAppState,
  credentials: credentials,
}) {
  if (agentId !== void 0 || isNonInteractiveSession) return;
  if (isBgSession()) return;
  markUpsellFulfilled(commandName);
  let T = refreshPromoEligibility(credentials);
  if (!jDr(commandName)) return;
  if (WDr(commandName)) {
    startOverageClaim(commandName, setAppState, credentials);
    return;
  }
  T.then((p) => {
    if (WDr(commandName)) {
      startOverageClaim(commandName, setAppState, credentials);
      return;
    }
    if (!p) return;
    let h = BDr();
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
/**
 * 开始领取超额额度：设置 pending 状态，完成后更新为 granted 或 failed。
 */
//@ chunk-3g0djq3w.js:5968-6432 placement
function startOverageClaim(e, n, o) {
  let u = BDr(),
    s = promoCreditAmount();
  if (!u || !s) return;
  (n((T) => ({
    ...T,
    fotwClaim: { phase: "pending", command: u, amountMinorUnits: s.amountMinorUnits, currency: s.currency },
  })),
    claimOverageCreditGrant(e, o)
      .catch(() => ({ outcome: "failed" }))
      .then((T) => {
        n((p) => {
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
          return { ...p, fotwClaim: { ...fotwClaim, phase: "failed" } };
        });
      }));
}
/**
 * 缓存的赠送信息属于当前账号与组织时返回。旧版名 invalidateOverageCreditGrantCache 不准确。
 */
//@ chunk-06y4szbn.js:3058-3214 fingerprint = invalidateOverageCreditGrantCache (0.667)
function invalidateOverageCreditGrantCache(e) {
  let n = rosterAccountKey();
  if (
    n === void 0 ||
    !e.success ||
    e.data.accountUuid !== n.accountUuid ||
    e.data.organizationUuid !== n.organizationUuid
  )
    return;
  return e.data;
}
/**
 * /api/oauth/organizations/<orgId>。旧版名 fetchOverageCreditGrant 为错配。
 */
//@ chunk-9cjx5pnm.js:14005-14069 fingerprint = fetchOverageCreditGrant (0.561)
var organizationApiPath = (e) => `/api/oauth/organizations/${encodePathSegment(e.organization.id)}`;
/**
 * 旧版名 formatGrantAmount 为错配。
 */
//@ chunk-zn8pzrw0.js:3581-3648 fingerprint = formatGrantAmount (0.582)
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
