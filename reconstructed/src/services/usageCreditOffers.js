/**
 * services/usageCreditOffers.ts
 *
 * 2.1.316 新增：用量额度相关的服务端优惠/补偿（starry_waterfall 用量积分邀约、cedar_ember 限额重置授予）的状态获取与领取
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-zv6whf9m.js (55)
 * attribution: placement 55
 */
import { DoctorLazy } from "../cli/handlers/util.js";
import { string, u, M, _enum, E, array, unknown, record } from "../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../utils/debug.js";
import {
  hasProfileScope,
  isClaudeAISubscriber,
  getOauthAccountInfo,
  getAuthTokenSource,
} from "../utils/auth.js";
import {
  fetchUtilization,
  hasUsageLimitKeys,
  isAuthRejectedUsageError,
  isPromoOfferEnabled,
  promoOfferStrings,
  fillUsageTemplate,
  promoOfferVersion,
} from "./api/usage.js";
import { toError, isExpectedApiError } from "../utils/errors.js";
import { createSignal } from "../utils/signal.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getRootSession } from "../bootstrap/state.js";
import { isAutoResumableLimit } from "./api/errors.js";
import { getLimitsAccountEpoch } from "./claudeAiLimits.js";
import { isFirstPartyApiBackend } from "../utils/model/providers.js";
import { fromEnumOpt, fromEnum } from "./analytics/safeMetadata.js";
import { sanitizeMarkName } from "../utils/startupMarks.js";
import { isAutoContinueEligible, currentSubscriptionTier } from "./rateLimitContinuation.js";
import { isVsCodeTopSession } from "../utils/sessionShape.js";
import { withDeadline } from "../utils/sleep.js";
import { logError } from "../utils/log.js";
import { logEvent } from "./analytics/index.js";
import { withOAuth401Retry } from "../utils/http.js";
import { apiClient } from "./routines/routinesApi.js";
import { isAxiosError } from "../../vendor/axios/dist/esm/axios.js";
import { getGlobalConfig, saveGlobalConfig } from "../utils/config.js";
import { getEntrypointKind } from "../utils/entrypointKinds.js";
import { arePromoOffersAllowed } from "../utils/planTiers.js";

//@ chunk-zv6whf9m.js:981-2671 placement
/**
 * starry_waterfall（用量积分邀约）配置：资格、展示位置（CLI 菜单、限额带、IDE 横幅）与文案键。
 */
var STARRY_WATERFALL = "starry_waterfall";
var OFFER_INELIGIBLE_REASONS = [
  "org_not_eligible",
  "no_program_running",
  "holdout",
  "mobile",
  "surface",
  "cli_version",
  "app_version",
  "auto_reload",
  "auto_reload_unknown",
  "segment_unknown",
  "not_assigned",
  "arm_unknown",
  "unavailable",
  "unknown",
];
var OFFER_SURFACES = [
  "cli_menu",
  "cli_credits_required",
  "ide_banner",
  "alert_band",
  "overage_band",
  "code_usage_band",
  "credits_required",
  "code_credits_required",
  "unknown",
];
var offerArmSchema = DoctorLazy(() =>
  string()
    .regex(/^[A-Za-z0-9_-]{1,64}$/)
    .nullable()
    .optional()
    .catch(null),
);
var offerEventPropsSchema = DoctorLazy(() =>
  u({
    offer_eligible: M().nullable().optional().catch(null),
    offer_reason: _enum(OFFER_INELIGIBLE_REASONS).catch("unknown").nullable().optional(),
    offer_arm: offerArmSchema(),
    offer_kind: _enum(["none", "pct_off", "extra_credit", "unknown"]).catch("unknown").nullable().optional(),
    offer_menu: _enum(["base", "plus40", "unknown"]).catch("unknown").nullable().optional(),
    offer_segment: _enum(["never", "lapsed", "recent", "unknown"]).catch("unknown").nullable().optional(),
    offer_days_left: E().int().nullable().optional().catch(null),
    offer_surface: _enum(OFFER_SURFACES).catch("unknown").nullable().optional(),
  }),
);
var offerStatusSchema = DoctorLazy(() =>
  u({
    eligible: M(),
    ineligible_reason: _enum(OFFER_INELIGIBLE_REASONS).catch("unknown").nullable().optional(),
    active: M().optional().catch(false),
    arm_id: offerArmSchema(),
    kind: _enum(["none", "pct_off", "extra_credit"]).nullable().optional().catch(null),
    headline_pct: E().int().min(0).max(300).optional().catch(0),
    menu: _enum(["base", "plus40", "unknown"]).catch("unknown").nullable().optional(),
    default_bundle_id: offerArmSchema(),
    segment: _enum(["never", "lapsed", "recent", "unknown"]).catch("unknown").nullable().optional(),
    first_offered_at: string().nullable().optional().catch(null),
    expires_at: string().nullable().optional().catch(null),
    days_left: E().int().min(0).nullable().optional().catch(null),
    redeemed: M().optional().catch(false),
    event_props: offerEventPropsSchema().nullable().optional().catch(null),
  }),
);
//@ chunk-zv6whf9m.js:2671-3542 placement
function parseCreditOfferStatus(e) {
  if (e === undefined || e === null) return null;
  let n = offerStatusSchema().safeParse(e);
  if (!n.success) {
    logForDebugging(`[usage-credit-offer] ignoring a malformed status block: ${n.error.message}`);
    return null;
  }
  let r = n.data;
  let kind = r.kind ?? null;
  let eventProps = r.event_props;
  return {
    eligible: r.eligible,
    ineligibleReason: r.ineligible_reason ?? null,
    active: (r.active ?? false) && kind !== null,
    armId: r.arm_id ?? null,
    kind,
    headlinePct: r.headline_pct ?? 0,
    menu: r.menu ?? null,
    defaultBundleId: r.default_bundle_id ?? null,
    segment: r.segment ?? null,
    firstOfferedAt: r.first_offered_at ?? null,
    expiresAt: r.expires_at ?? null,
    daysLeft: r.days_left ?? null,
    redeemed: r.redeemed ?? false,
    eventProps: eventProps
      ? {
          offerEligible: eventProps.offer_eligible ?? null,
          offerReason: eventProps.offer_reason ?? null,
          offerArm: eventProps.offer_arm ?? null,
          offerKind: eventProps.offer_kind ?? null,
          offerMenu: eventProps.offer_menu ?? null,
          offerSegment: eventProps.offer_segment ?? null,
          offerDaysLeft: eventProps.offer_days_left ?? null,
          offerSurface: eventProps.offer_surface ?? null,
        }
      : null,
  };
}
//@ chunk-zv6whf9m.js:3542-3704 placement
function isActiveCreditOffer(currentWallOffer) {
  return (
    currentWallOffer !== undefined &&
    currentWallOffer !== null &&
    currentWallOffer.active &&
    !currentWallOffer.redeemed &&
    (currentWallOffer.kind === "pct_off" || currentWallOffer.kind === "extra_credit") &&
    currentWallOffer.headlinePct > 0 &&
    currentWallOffer.daysLeft !== null &&
    currentWallOffer.daysLeft > 0
  );
}
//@ chunk-zv6whf9m.js:3704-4183 placement
async function fetchCreditOfferStatus(e, surface) {
  try {
    if (!hasProfileScope())
      return {
        kind: "no_profile_scope",
      };
    let utilization = await fetchUtilization(e, {
      read: "starry_waterfall",
      surface,
    });
    if (!hasUsageLimitKeys(utilization)) {
      logForDebugging(
        "[usage-credit-offer] status fetch returned a fieldless or non-object body (in-band error)",
        {
          level: "warn",
        },
      );
      return {
        kind: "failed",
      };
    }
    return {
      kind: "answered",
      status: parseCreditOfferStatus(utilization?.[STARRY_WATERFALL]),
    };
  } catch (error) {
    logForDebugging(`[usage-credit-offer] status fetch failed: ${toError(error).message}`, {
      level: "warn",
    });
    if (isAuthRejectedUsageError(error))
      return {
        kind: "answered",
        status: null,
        notAuthorized: true,
      };
    return {
      kind: "failed",
    };
  }
}
//@ chunk-zv6whf9m.js:4183-4268 placement
/**
 * 优惠提示的初始状态。
 */
function createCreditOfferPromptState() {
  return {
    state: {
      phase: "idle",
    },
    shown: new Set(),
    pendingAsk: null,
    changed: createSignal(),
  };
}
//@ chunk-zv6whf9m.js:4268-4283 placement
/**
 * 按 host 保存的优惠提示状态。
 */
var creditOfferPromptStateSlots = new HostScoped(createCreditOfferPromptState);
//@ chunk-zv6whf9m.js:4283-4318 placement
/**
 * 取当前 host 的优惠提示状态。
 */
function currentCreditOfferPromptState() {
  return creditOfferPromptStateSlots.of(getRootSession().host);
}
//@ chunk-zv6whf9m.js:4318-4350 placement
/**
 * 当前优惠提示的阶段。
 */
function getCreditOfferPhase() {
  return currentCreditOfferPromptState().state;
}
//@ chunk-zv6whf9m.js:4350-4401 placement
/**
 * 写入优惠提示状态并发出变更信号。
 */
function setCreditOfferPromptState(state) {
  let n = currentCreditOfferPromptState();
  n.state = state;
  n.changed.emit();
}
//@ chunk-zv6whf9m.js:4401-4449 placement
/**
 * 订阅优惠提示状态变化。
 */
function onCreditOfferPromptChange(e) {
  return currentCreditOfferPromptState().changed.subscribe(e);
}
//@ chunk-zv6whf9m.js:4449-4497 placement
/**
 * 优惠提示的三个时间与次数常量（失败上限、拉取超时、已答复有效期）。
 */
var MAX_OFFER_FETCH_FAILURES = 3;
var OFFER_FETCH_TIMEOUT_MS = 12000;
var ANSWERED_OFFER_TTL_MS = 600000;
var CREDITS_REQUIRED = "credits_required";
//@ chunk-zv6whf9m.js:4497-4590 placement
/**
 * 由可自动继续的限额生成墙键（限额类型:重置时间）。
 */
function wallKeyForLimit(e) {
  return isAutoResumableLimit(e) && e.rateLimitType !== undefined ? `${e.rateLimitType}:${e.resetsAt}` : null;
}
//@ chunk-zv6whf9m.js:4590-4636 placement
/**
 * 把墙键与账号 epoch 打包。
 */
function wrapWallKey(key) {
  return {
    key,
    accountEpoch: getLimitsAccountEpoch(),
  };
}
//@ chunk-zv6whf9m.js:4636-4706 placement
/**
 * 比较两个墙记录是否指向同一墙且同一账号 epoch。
 */
function isSameWallKey(wall, n) {
  return wall.key === n.key && wall.accountEpoch === n.accountEpoch;
}
//@ chunk-zv6whf9m.js:4706-4773 placement
/**
 * 会话是否为可领取优惠的 claude.ai 订阅。
 */
function isCreditOfferEligibleSession() {
  return (
    isClaudeAISubscriber() && getOauthAccountInfo()?.billingType !== "usage_based" && isFirstPartyApiBackend()
  );
}
//@ chunk-zv6whf9m.js:4773-4952 placement
function getCurrentWallOffer() {
  let creditOfferPhase = getCreditOfferPhase();
  if (creditOfferPhase.phase === "idle" || creditOfferPhase.wall.accountEpoch !== getLimitsAccountEpoch())
    return;
  switch (creditOfferPhase.phase) {
    case "answered":
      return creditOfferPhase.status;
    case "asking":
      return creditOfferPhase.standing;
    case "failed":
      return;
  }
}
//@ chunk-zv6whf9m.js:4952-5003 placement
/**
 * 当前墙上有生效且开关允许的优惠。
 */
function activeOfferAtWall() {
  let currentWallOffer = getCurrentWallOffer();
  return isActiveCreditOffer(currentWallOffer) && isPromoOfferEnabled() ? currentWallOffer : undefined;
}
//@ chunk-zv6whf9m.js:5003-5175 placement
/**
 * 按当前额度优惠（折扣或额外额度）生成菜单项后缀文案。
 */
function getOfferMenuSuffix() {
  let e = activeOfferAtWall();
  if (e === undefined) return;
  let n = promoOfferStrings();
  return fillUsageTemplate(e.kind === "pct_off" ? n.menuSuffixPctOff : n.menuSuffixExtraCredit, {
    pct: e.headlinePct,
    daysLeft: e.daysLeft,
  });
}
//@ chunk-zv6whf9m.js:5175-5335 placement
/**
 * 按当前额度优惠生成提示文案。
 */
function getOfferHint() {
  let e = activeOfferAtWall();
  if (e === undefined) return;
  let n = promoOfferStrings();
  return fillUsageTemplate(e.kind === "pct_off" ? n.hintPctOff : n.hintExtraCredit, {
    pct: e.headlinePct,
    daysLeft: e.daysLeft,
  });
}
//@ chunk-zv6whf9m.js:5335-5506 placement
function getOfferBannerPill() {
  let e = activeOfferAtWall();
  if (e === undefined) return;
  let n = promoOfferStrings();
  return fillUsageTemplate(e.kind === "pct_off" ? n.bannerPillPctOff : n.bannerPillExtraCredit, {
    pct: e.headlinePct,
    daysLeft: e.daysLeft,
  });
}
//@ chunk-zv6whf9m.js:5506-5645 placement
/**
 * 返回额度优惠横幅信息：类型、百分比、剩余天数与胶囊文案；没有有效优惠时 undefined。
 */
function getOfferBanner() {
  let e = activeOfferAtWall();
  let offerBannerPill = getOfferBannerPill();
  if (e === undefined || offerBannerPill === undefined) return;
  return {
    kind: e.kind,
    headlinePct: e.headlinePct,
    daysLeft: e.daysLeft,
    label: offerBannerPill,
  };
}
//@ chunk-zv6whf9m.js:5645-6153 placement
function getCreditOfferForRateLimit() {
  let currentWallOffer = getCurrentWallOffer();
  if (currentWallOffer === undefined || currentWallOffer === null) return {};
  let eventProps = currentWallOffer.eventProps;
  return {
    offer_eligible: eventProps?.offerEligible ?? currentWallOffer.eligible,
    offer_reason: fromEnumOpt(eventProps?.offerReason ?? currentWallOffer.ineligibleReason) ?? undefined,
    offer_arm: sanitizeMarkName(eventProps?.offerArm ?? currentWallOffer.armId),
    offer_kind: fromEnumOpt(eventProps?.offerKind ?? currentWallOffer.kind) ?? undefined,
    offer_menu: fromEnumOpt(eventProps?.offerMenu ?? currentWallOffer.menu) ?? undefined,
    offer_segment: fromEnumOpt(eventProps?.offerSegment ?? currentWallOffer.segment) ?? undefined,
    offer_days_left: eventProps?.offerDaysLeft ?? currentWallOffer.daysLeft ?? undefined,
    offer_active: currentWallOffer.active,
    offer_redeemed: currentWallOffer.redeemed,
    offer_surface: fromEnumOpt(eventProps?.offerSurface) ?? undefined,
  };
}
//@ chunk-zv6whf9m.js:6153-6235 placement
/**
 * 为 CLI 菜单生成额度赠送入口。
 */
function offerForCliMenu(quotaLimits, credentials) {
  let r = wallKeyForLimit(quotaLimits);
  if (!isPromoOfferEnabled() || !isAutoContinueEligible() || r === null) return;
  CreditOfferPromptState(r, "cli_menu", credentials);
}
//@ chunk-zv6whf9m.js:6235-6307 placement
/**
 * 在 IDE 里请求额度赠送。
 */
function requestCreditOfferInIde(credentials) {
  if (!isPromoOfferEnabled() || !isAutoContinueEligible()) return;
  CreditOfferPromptState(CREDITS_REQUIRED, "cli_credits_required", credentials);
}
//@ chunk-zv6whf9m.js:6307-6400 placement
/**
 * 在额度区间处提供赠送入口。
 */
function offerCreditAtBand(e) {
  let n = wallKeyForLimit(e);
  if (!isPromoOfferEnabled() || !isVsCodeTopSession() || !isCreditOfferEligibleSession() || n === null)
    return;
  CreditOfferPromptState(n, "ide_banner", undefined);
}
//@ chunk-zv6whf9m.js:6400-6567 placement
/**
 * 优惠查询曾失败且仍在同一限额墙、失败次数未超上限时，从 CLI 菜单重新弹出额度优惠提示；返回是否弹出。
 */
function retryOfferPrompt(claudeAiLimits, credentials) {
  let key = wallKeyForLimit(claudeAiLimits);
  if (!isPromoOfferEnabled() || !isAutoContinueEligible() || key === null) return false;
  let creditOfferPhase = getCreditOfferPhase();
  if (
    creditOfferPhase.phase === "failed" &&
    isSameWallKey(creditOfferPhase.wall, wrapWallKey(key)) &&
    creditOfferPhase.failures < MAX_OFFER_FETCH_FAILURES
  ) {
    CreditOfferPromptState(key, "cli_menu", credentials);
    return true;
  }
  return false;
}
//@ chunk-zv6whf9m.js:6567-7280 placement
function CreditOfferPromptState(key, surface, r, i = Date.now()) {
  let s = wrapWallKey(key);
  let d = currentCreditOfferPromptState();
  let state = d.state;
  let failures = 0;
  if (state.phase !== "idle" && isSameWallKey(state.wall, s))
    switch (state.phase) {
      case "answered":
        if (i - state.answeredAt < ANSWERED_OFFER_TTL_MS) return Promise.resolve();
        break;
      case "asking":
        return d.pendingAsk ?? Promise.resolve();
      case "failed":
        if (state.failures >= MAX_OFFER_FETCH_FAILURES) return Promise.resolve();
        failures = state.failures;
    }
  else if (state.phase === "asking") {
    if (state.wall.accountEpoch === s.accountEpoch) return d.pendingAsk ?? Promise.resolve();
  }
  setCreditOfferPromptState({
    phase: "asking",
    wall: s,
    standing: getCurrentWallOffer(),
  });
  let b = withDeadline(fetchCreditOfferStatus(r, surface), OFFER_FETCH_TIMEOUT_MS)
    .then((C) => {
      claimCreditOffer({
        wall: s,
        surface,
        failures,
        result: C ?? {
          kind: "failed",
        },
      });
    })
    .catch((error) => {
      logError(toError(error));
      try {
        claimCreditOffer({
          wall: s,
          surface,
          failures,
          result: {
            kind: "failed",
          },
        });
      } catch (error) {
        logError(toError(error));
      }
    })
    .finally(() => {
      if (d.pendingAsk === b) d.pendingAsk = null;
    });
  d.pendingAsk = b;
  return b;
}
//@ chunk-zv6whf9m.js:7280-8027 placement
function claimCreditOffer({ wall, surface, failures, result: i }) {
  let creditOfferPhase = getCreditOfferPhase();
  if (creditOfferPhase.phase !== "asking" || !isSameWallKey(creditOfferPhase.wall, wall)) return;
  let status = i.kind === "answered" ? i.status : null;
  if (i.kind === "failed") {
    let standing = creditOfferPhase.standing;
    if (standing !== undefined)
      setCreditOfferPromptState({
        phase: "answered",
        wall,
        status: standing,
        answeredAt: Date.now(),
      });
    else
      setCreditOfferPromptState({
        phase: "failed",
        wall,
        failures: failures + 1,
      });
  } else
    setCreditOfferPromptState({
      phase: "answered",
      wall,
      status,
      answeredAt: Date.now(),
    });
  logEvent("tengu_starry_waterfall_asked", {
    outcome: fromEnum(
      i.kind === "answered"
        ? status === null
          ? i.notAuthorized
            ? "not_authorized"
            : "absent"
          : "block"
        : i.kind,
    ),
    attempt: failures + 1,
    surface: fromEnum(surface),
    eligible: status?.eligible ?? false,
    ineligible_reason: fromEnumOpt(status?.ineligibleReason) ?? undefined,
    config_version: promoOfferVersion(),
  });
  if (status === null || !status.eligible) return;
  logEvent("tengu_starry_waterfall_wall", {
    ...getCreditOfferForRateLimit(),
    surface: fromEnum(surface),
    tier: fromEnum(currentSubscriptionTier()),
    config_version: promoOfferVersion(),
  });
}
//@ chunk-zv6whf9m.js:8027-8239 placement
function logCreditOfferShown(e, offerAnalytics = {}) {
  let r = currentCreditOfferPromptState();
  let state = r.state;
  let d = `${state.phase === "idle" ? "none" : state.wall.key}:${e}`;
  if (r.shown.has(d)) return;
  r.shown.add(d);
  logEvent("tengu_starry_waterfall_shown", {
    ...getCreditOfferForRateLimit(),
    ...offerAnalytics,
    surface: fromEnum(e),
    config_version: promoOfferVersion(),
  });
}
//@ chunk-zv6whf9m.js:8239-8484 placement
/**
 * 使用额度优惠后，把当前回答或待定状态中的优惠标记为已兑换且不再生效。
 */
function markOfferRedeemed({ usedOffer }) {
  let creditOfferPhase = getCreditOfferPhase();
  let r = (i) =>
    usedOffer && i.active
      ? {
          ...i,
          active: false,
          redeemed: true,
        }
      : i;
  if (creditOfferPhase.phase === "answered" && creditOfferPhase.status !== null)
    setCreditOfferPromptState({
      ...creditOfferPhase,
      answeredAt: 0,
      status: r(creditOfferPhase.status),
    });
  else if (creditOfferPhase.phase === "asking" && creditOfferPhase.standing)
    setCreditOfferPromptState({
      ...creditOfferPhase,
      standing: r(creditOfferPhase.standing),
    });
}
//@ chunk-zv6whf9m.js:8484-10252 placement
/**
 * cedar_ember（五小时/七天限额重置授予）的配置与文本。
 */
var CEDAR_EMBER = "cedar_ember";
var CEDAR_EMBER_GRANT_TIMEOUT_MS = 25000;
var grantIdRegex = /^[a-z0-9_-]{1,40}$/;
var armIdRegex = /^[A-Za-z0-9_-]{1,64}$/;
var CREDIT_RESETTABLE_LIMIT_TYPES = [
  "five_hour",
  "seven_day",
  "seven_day_overage_included",
  "seven_day_opus",
  "seven_day_sonnet",
  "seven_day_cowork",
  "seven_day_omelette",
  "seven_day_oauth_apps",
];
var GRANT_INELIGIBLE_REASONS = [
  "config_off",
  "tier",
  "seat",
  "mobile",
  "surface",
  "cli_version",
  "no_grant",
  "tenure",
  "other_experiment",
  "unavailable",
  "unknown",
];
var GRANT_REFUSAL_REASONS = [
  "cooldown",
  "blocked_five_hour",
  "blocked_seven_day",
  "blocked_opus",
  "blocked_sonnet",
  "blocked_other",
  "cannot_clear",
  "needs_limit",
  "unavailable",
];
var GRANT_RESULT_REASONS = [
  ...GRANT_INELIGIBLE_REASONS,
  "paused",
  "expired",
  "unknown_grant",
  "not_next_grant",
  "grant_id_required",
  "not_limited",
  "already_used",
  "cooldown",
  "stamp_indeterminate",
  "reset_unconfirmed",
];
var grantEventPropsSchema = DoctorLazy(() =>
  u({
    surface: _enum(["claude_ai", "claude_code_cli", "unknown"]).catch("unknown"),
    tier: _enum(["claude_pro", "claude_max_5x", "claude_max_20x", "claude_team", "unknown"]).catch("unknown"),
    tenure_bucket: _enum(["under_14", "14-29", "30-89", "90-364", "365+", "unknown"]).catch("unknown"),
    billing_path: _enum(["stripe", "apple", "google_play", "other", "unknown"]).catch("unknown"),
    billing_period: _enum(["monthly", "annual", "unknown"]).catch("unknown"),
    extra_usage_state: _enum(["not_configured", "disabled", "enabled", "unknown"]).catch("unknown"),
  }),
);
var clearedLimitsSchema = DoctorLazy(() =>
  array(unknown())
    .catch([])
    .transform((e) => e.filter((n) => CREDIT_RESETTABLE_LIMIT_TYPES.some((r) => r === n))),
);
var grantSchema = DoctorLazy(() =>
  u({
    id: string().regex(grantIdRegex),
    label: string().catch(""),
    resets_total: E().int().min(0).catch(0),
    resets_left: E().int().min(0),
    starts_at: string().nullable().optional().catch(null),
    ends_at: string().nullable().optional().catch(null),
    clears: clearedLimitsSchema(),
    paused: M().catch(false),
    usable_now: M().catch(false),
    use_requires_limit: M().catch(true),
    percent_used: record(string(), unknown()).catch({}),
    blocking: clearedLimitsSchema(),
    type: _enum(["session", "weekly", "full"]).optional().catch(undefined),
    gives_back_weekly: M().catch(false),
    unavailable_reason: _enum(GRANT_REFUSAL_REASONS).nullable().optional().catch(null),
  }),
);
//@ chunk-zv6whf9m.js:10252-10379 placement
function pickPercentFields(percentUsed) {
  let n = {};
  for (let r of CREDIT_RESETTABLE_LIMIT_TYPES) {
    let i = percentUsed[r];
    if (typeof i === "number" && Number.isInteger(i) && i >= 0 && i <= 100) n[r] = i;
  }
  return n;
}
//@ chunk-zv6whf9m.js:10379-11165 placement
/**
 * 领取赠送结果的校验 schema。
 */
var CedarEmberStatusSchema = DoctorLazy(() =>
  u({
    eligible: M(),
    ineligible_reason: _enum(GRANT_INELIGIBLE_REASONS).catch("unknown").nullable().optional(),
    at_limit: M().optional().catch(undefined),
    exhausted: clearedLimitsSchema().optional(),
    grants: array(unknown()).optional().catch(undefined),
    next_grant_id: string().regex(grantIdRegex).nullable().optional().catch(null),
    weekly_resets_at: string().nullable().optional().catch(null),
    cooldown_until: string().nullable().optional().catch(null),
    event_props: grantEventPropsSchema().nullable().optional().catch(null),
  }),
);
var grantClaimResultSchema = DoctorLazy(() =>
  u({
    result: _enum(["reset", "already_used", "not_limited", "cooldown", "ineligible", "unavailable"]).catch(
      "unavailable",
    ),
    reason: _enum(GRANT_RESULT_REASONS).catch("unknown").nullable().optional(),
    resets_left: E().int().min(0).nullable().optional().catch(null),
    cleared: clearedLimitsSchema().optional(),
    weekly_resets_at: string().nullable().optional().catch(null),
    cooldown_until: string().nullable().optional().catch(null),
  }),
);
//@ chunk-zv6whf9m.js:11165-11684 placement
function parseCedarEmberGrant(e) {
  let n = grantSchema().safeParse(e);
  if (!n.success) {
    logForDebugging(`[cedar-ember] ignoring a malformed grant: ${n.error.message}`);
    return null;
  }
  let r = n.data;
  return {
    id: r.id,
    label: r.label,
    resetsTotal: r.resets_total,
    resetsLeft: r.resets_left,
    startsAt: r.starts_at ?? null,
    endsAt: r.ends_at ?? null,
    clears: r.clears,
    paused: r.paused,
    usableNow: r.usable_now,
    useRequiresLimit: r.use_requires_limit,
    percentUsed: pickPercentFields(r.percent_used),
    blocking: r.blocking,
    type: r.type ?? null,
    givesBackWeekly: r.gives_back_weekly,
    unavailableReason: r.unavailable_reason ?? null,
  };
}
//@ chunk-zv6whf9m.js:11684-12436 placement
function parseCedarEmberStatus(cedarEmber) {
  if (cedarEmber === undefined || cedarEmber === null) return null;
  let n = CedarEmberStatusSchema().safeParse(cedarEmber);
  if (!n.success) {
    logForDebugging(`[cedar-ember] ignoring a malformed status block: ${n.error.message}`);
    return null;
  }
  let r = n.data;
  let filtered = (r.grants ?? []).map(parseCedarEmberGrant).filter((f) => f !== null);
  let nextGrantId =
    r.next_grant_id !== undefined &&
    r.next_grant_id !== null &&
    filtered.some((f) => f.id === r.next_grant_id)
      ? r.next_grant_id
      : null;
  let eventProps = r.event_props;
  return {
    eligible: r.eligible,
    ineligibleReason: r.ineligible_reason ?? null,
    atLimit: r.at_limit ?? false,
    exhausted: r.exhausted ?? [],
    grants: filtered,
    nextGrantId,
    weeklyResetsAt: r.weekly_resets_at ?? null,
    cooldownUntil: r.cooldown_until ?? null,
    eventProps: eventProps
      ? {
          surface: eventProps.surface,
          tier: eventProps.tier,
          tenureBucket: eventProps.tenure_bucket,
          billingPath: eventProps.billing_path,
          billingPeriod: eventProps.billing_period,
          extraUsageState: eventProps.extra_usage_state,
        }
      : null,
  };
}
//@ chunk-zv6whf9m.js:12436-12640 placement
/**
 * 在可用的限额重置授予中找出结束时间晚于当前的最晚一个，没有返回 undefined。
 */
function getLatestResetGrantEnd(e, n) {
  if (e === undefined || e === null || !e.eligible) return;
  let filtered = e.grants
    .filter((grant) => grant.resetsLeft > 0 && !grant.paused)
    .map((grant) => parseTimestampOrUndefined(grant.endsAt) ?? 1 / 0)
    .filter((i) => i > n);
  return filtered.length === 0 ? undefined : Math.max(...filtered);
}
//@ chunk-zv6whf9m.js:12640-13129 placement
async function fetchCedarEmberStatus(e, { read: n = "at_wall", surface: r } = {}) {
  try {
    if (!hasProfileScope())
      return {
        kind: "no_profile_scope",
      };
    let utilization = await fetchUtilization(
      e,
      n === "at_wall"
        ? {
            read: n,
            surface: r,
          }
        : {
            read: n,
          },
    );
    if (!hasUsageLimitKeys(utilization)) {
      logForDebugging("[cedar-ember] status fetch returned a fieldless or non-object body (in-band error)", {
        level: "warn",
      });
      return {
        kind: "failed",
      };
    }
    return {
      kind: "answered",
      status: parseCedarEmberStatus(utilization?.cedar_ember),
    };
  } catch (error) {
    logForDebugging(`[cedar-ember] status fetch failed: ${toError(error).message}`, {
      level: "warn",
    });
    if (isAuthRejectedUsageError(error))
      return {
        kind: "not_authorized",
      };
    return {
      kind: "failed",
    };
  }
}
//@ chunk-zv6whf9m.js:13129-13196 placement
var _ = {
  reason: null,
  resetsLeft: null,
  cleared: [],
  weeklyResetsAt: null,
};
//@ chunk-zv6whf9m.js:13196-14515 placement
/**
 * 领取限额重置授予（需要 OAuth 组织，校验授予格式）。
 */
async function claimCedarEmberGrant(credentials, id, r) {
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!organizationUuid) {
    logForDebugging("[cedar-ember] no OAuth organization; cannot claim");
    return {
      result: "auth_error",
      ..._,
    };
  }
  if (!grantIdRegex.test(id) || !armIdRegex.test(r)) {
    logError(Error("[cedar-ember] refusing to claim with a malformed grant or request id"));
    return {
      result: "error",
      ..._,
    };
  }
  try {
    let s = await withOAuth401Retry(
      () =>
        apiClient.post(
          `/api/organizations/${organizationUuid}/reset_rate_limits`,
          {
            program: CEDAR_EMBER,
            grant_id: id,
            request_id: r,
          },
          {
            auth: "async",
            headers: {
              "Content-Type": "application/json",
            },
            timeout: CEDAR_EMBER_GRANT_TIMEOUT_MS,
            refreshOAuth: true,
            credentials,
          },
        ),
      {
        credentials,
      },
    );
    if (!s.ok) {
      logForDebugging(`[cedar-ember] claim not sent: ${s.reason === "no-auth" ? s.detail : s.reason}`, {
        level: "warn",
      });
      return {
        result: s.reason === "no-auth" ? "auth_error" : "error",
        ..._,
      };
    }
    let d = grantClaimResultSchema().safeParse(s.data);
    if (!d.success) {
      logForDebugging(`[cedar-ember] unreadable claim response: ${d.error.message}`, {
        level: "error",
      });
      logError(Error("[cedar-ember] unreadable claim response"));
      return {
        result: "error",
        ..._,
      };
    }
    return {
      result: d.data.result,
      reason: d.data.reason ?? null,
      resetsLeft: d.data.resets_left ?? null,
      cleared: d.data.cleared ?? [],
      weeklyResetsAt: d.data.weekly_resets_at ?? null,
    };
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`[cedar-ember] claim failed: ${toError(error).message}`, {
        level: "warn",
      });
    else logError(toError(error));
    if (isAxiosError(error))
      switch (error.response?.status) {
        case 429:
          return {
            result: "rate_limited",
            ..._,
          };
        case 401:
        case 403:
          return {
            result: "auth_error",
            ..._,
          };
        default:
          break;
      }
    return {
      result: "error",
      ..._,
    };
  }
}
//@ chunk-zv6whf9m.js:14515-14605 placement
/**
 * 解析时间戳为毫秒数，非法返回 undefined。
 */
function parseTimestampOrUndefined(e) {
  if (e === null) return;
  let timestamp = Date.parse(e);
  return Number.isFinite(timestamp) ? timestamp : undefined;
}
//@ chunk-zv6whf9m.js:14605-14992 placement
/**
 * 创建用量额度优惠的初始状态（空闲阶段、各种待定与认领记录为空）。
 */
function createUsageCreditState() {
  return {
    state: {
      phase: "idle",
    },
    shownOfferKey: null,
    wallRecordKey: null,
    pendingAsk: null,
    pendingUnusedResetRead: null,
    unusedResetAnsweredFor: null,
    unusedResetDrops: 0,
    claiming: false,
    continuableWallResetsAt: null,
    unsettledClaimGrantId: null,
    unsettledClaimEpoch: null,
    unsettledClaimRequestId: null,
    unsettledClaimAtMs: null,
    wallSurface: null,
    sessionSwitchSubscribed: false,
    changed: createSignal(),
    events: createSignal(),
  };
}
//@ chunk-zv6whf9m.js:14992-15009 placement
/**
 * 按 host 保存的用量额度状态。
 */
var usageCreditHostStates = new HostScoped(createUsageCreditState);
//@ chunk-zv6whf9m.js:15009-15046 placement
/**
 * 取当前 host 的用量额度状态。
 */
function usageCreditStateSlots() {
  return usageCreditHostStates.of(getRootSession().host);
}
//@ chunk-zv6whf9m.js:15046-15078 placement
/**
 * 当前用量额度状态对象。
 */
function currentUsageCreditState() {
  return usageCreditStateSlots().state;
}
//@ chunk-zv6whf9m.js:15078-15132 placement
/**
 * 写入用量额度状态并发出变更信号。
 */
function setUsageCreditState(state) {
  let n = usageCreditStateSlots();
  n.state = state;
  n.changed.emit();
}
//@ chunk-zv6whf9m.js:15132-15180 placement
/**
 * 订阅用量额度状态变化。
 */
function onUsageCreditStateChange(e) {
  return usageCreditStateSlots().changed.subscribe(e);
}
//@ chunk-zv6whf9m.js:15180-15228 placement
/**
 * 订阅用量额度事件。
 */
function onUsageCreditEvent(e) {
  return usageCreditStateSlots().events.subscribe(e);
}
//@ chunk-zv6whf9m.js:15228-15341 placement
/**
 * 未使用限额重置状态缓存的有效期、查询超时与缓存 schema。
 */
var UNUSED_RESET_CACHE_TTL_MS = 259200000;
var UNUSED_RESET_TIMEOUT_MS = 12000;
var UNUSED_RESET_CACHE_SCHEMA = DoctorLazy(() =>
  u({
    accountUuid: string().min(1),
    holdsUnusedReset: M(),
    checkedAt: E(),
    validUntil: E(),
  }),
);
//@ chunk-zv6whf9m.js:15341-15628 placement
/**
 * 根据缓存判断当前账号是否持有未使用的限额重置：CLI 入口、同一账号、缓存未过期且在有效期内、使用 claude.ai 令牌且允许促销。
 */
function holdsUnusedReset(e = Date.now()) {
  try {
    let accountUuid = getOauthAccountInfo()?.accountUuid;
    let r = UNUSED_RESET_CACHE_SCHEMA().safeParse(getGlobalConfig().unusedLimitResetStatusCache).data;
    return (
      getEntrypointKind() === "cli" &&
      !!accountUuid &&
      r?.accountUuid === accountUuid &&
      r.holdsUnusedReset &&
      r.checkedAt <= e &&
      e - r.checkedAt < UNUSED_RESET_CACHE_TTL_MS &&
      e < r.validUntil &&
      getAuthTokenSource().source === "claude.ai" &&
      arePromoOffersAllowed()
    );
  } catch (error) {
    logError(toError(error));
    return false;
  }
}
//@ chunk-zv6whf9m.js:15628-15789 placement
/**
 * 刷新"未使用的限额重置"可用性（同一时间只发起一次请求，出错记日志）。
 */
function refreshUnusedResetStatus(e, n) {
  let r = usageCreditStateSlots();
  r.pendingUnusedResetRead ??= describeCedarEmberAvailability(e, n)
    .catch((error) => logError(toError(error)))
    .finally(() => {
      r.pendingUnusedResetRead = null;
    });
  return r.pendingUnusedResetRead;
}
//@ chunk-zv6whf9m.js:15789-15958 placement
/**
 * 丢弃未使用限额重置状态的缓存（内存与全局配置），并计数。
 */
function dropUnusedResetCache() {
  let e = usageCreditStateSlots();
  e.unusedResetAnsweredFor = null;
  e.unusedResetDrops++;
  saveGlobalConfig((n) =>
    n.unusedLimitResetStatusCache === undefined
      ? n
      : {
          ...n,
          unusedLimitResetStatusCache: undefined,
        },
  );
}
//@ chunk-zv6whf9m.js:15958-16705 placement
async function describeCedarEmberAvailability(e, n) {
  let r = usageCreditStateSlots();
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  if (!accountUuid) return;
  let s = `${getLimitsAccountEpoch()}:${accountUuid}`;
  if (
    r.unusedResetAnsweredFor === s ||
    getEntrypointKind() !== "cli" ||
    getAuthTokenSource().source !== "claude.ai" ||
    !isAutoContinueEligible() ||
    !arePromoOffersAllowed()
  )
    return;
  let unusedResetDrops = r.unusedResetDrops;
  let f = await withDeadline(
    fetchCedarEmberStatus(e, {
      read: "cedar_ember",
    }),
    UNUSED_RESET_TIMEOUT_MS,
  );
  if (
    getOauthAccountInfo()?.accountUuid !== accountUuid ||
    r.unusedResetDrops !== unusedResetDrops ||
    getAuthTokenSource().source !== "claude.ai" ||
    !arePromoOffersAllowed()
  )
    return;
  switch (f?.kind) {
    case "not_authorized":
    case "no_profile_scope":
      r.unusedResetAnsweredFor = s;
      return;
    case "answered":
      break;
    case "failed":
    case undefined:
      return;
  }
  if (f.status?.ineligibleReason === "unavailable") return;
  r.unusedResetAnsweredFor = s;
  let now = Date.now();
  let latestResetGrantEnd = getLatestResetGrantEnd(f.status, now);
  await saveGlobalConfig(
    (C) => ({
      ...C,
      unusedLimitResetStatusCache: {
        accountUuid,
        holdsUnusedReset: latestResetGrantEnd !== undefined,
        checkedAt: now,
        validUntil: Math.min(now + UNUSED_RESET_CACHE_TTL_MS, latestResetGrantEnd ?? 1 / 0),
      },
    }),
    n,
  );
}
//@ chunk-zv6whf9m.js:16705-16736 placement
var TENGU_WISE_BEAR_COPY = "tengu_wise_bear_copy";
//@ chunk-zv6whf9m.js:16932-17029 placement
/**
 * 优惠里的备注是否只在本周重置未使用时才展示。
 */
function isOnlyIfUnusedResetNote(e) {
  return typeof e === "object" && e !== null && Reflect.get(e, "only_if_unused_reset") === true;
}
//@ chunk-zv6whf9m.js:17029-17266 placement
function readOfferNote(featureValue_CACHED_MAY_BE_STALE, n, cleanTaskDescription, i) {
  if (typeof featureValue_CACHED_MAY_BE_STALE !== "object" || featureValue_CACHED_MAY_BE_STALE === null)
    return;
  if (isOnlyIfUnusedResetNote(featureValue_CACHED_MAY_BE_STALE) && i !== true) return;
  let s = Reflect.get(featureValue_CACHED_MAY_BE_STALE, `note_${n}`);
  if (typeof s !== "string") return;
  let d = cleanTaskDescription(s);
  return d && !(d.endsWith("\u2026") && !s.trimEnd().endsWith("\u2026")) ? d : undefined;
}
export {
  onUsageCreditEvent,
  currentUsageCreditState,
  markOfferRedeemed,
  logCreditOfferShown,
  offerForCliMenu,
  requestCreditOfferInIde,
  onUsageCreditStateChange,
  readOfferNote,
  TENGU_WISE_BEAR_COPY,
  onCreditOfferPromptChange,
  getOfferHint,
  getCreditOfferPhase,
  getOfferMenuSuffix,
  getCreditOfferForRateLimit,
  retryOfferPrompt,
  holdsUnusedReset,
  refreshUnusedResetStatus,
  parseTimestampOrUndefined,
  CREDIT_RESETTABLE_LIMIT_TYPES,
  usageCreditStateSlots,
  getLatestResetGrantEnd,
  isOnlyIfUnusedResetNote,
  setUsageCreditState,
  fetchCedarEmberStatus,
  claimCedarEmberGrant,
  dropUnusedResetCache,
  offerCreditAtBand,
  getOfferBanner,
};
