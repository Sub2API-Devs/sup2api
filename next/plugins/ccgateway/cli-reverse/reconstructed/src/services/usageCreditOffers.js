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
import {
  stringSchema,
  objectSchema,
  booleanSchema,
  _enum,
  numberSchema,
  array,
  unknown,
  record,
} from "../../vendor/zod/v4/classic/schemas.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-zv6whf9m.js:981-2671 placement
/**
 * starry_waterfall（用量积分邀约）配置：资格、展示位置（CLI 菜单、限额带、IDE 横幅）与文案键。
 */
var STARRY_WATERFALL; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var OFFER_INELIGIBLE_REASONS;
var OFFER_SURFACES;
var offerArmSchema;
var offerEventPropsSchema;
var offerStatusSchema;
deferInit("chunk-zv6whf9m.js:981", () => {
  STARRY_WATERFALL = "starry_waterfall";
  OFFER_INELIGIBLE_REASONS = [
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
  OFFER_SURFACES = [
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
  offerArmSchema = DoctorLazy(() =>
    stringSchema()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .nullable()
      .optional()
      .catch(null),
  );
  offerEventPropsSchema = DoctorLazy(() =>
    objectSchema({
      offer_eligible: booleanSchema().nullable().optional().catch(null),
      offer_reason: _enum(OFFER_INELIGIBLE_REASONS).catch("unknown").nullable().optional(),
      offer_arm: offerArmSchema(),
      offer_kind: _enum(["none", "pct_off", "extra_credit", "unknown"])
        .catch("unknown")
        .nullable()
        .optional(),
      offer_menu: _enum(["base", "plus40", "unknown"]).catch("unknown").nullable().optional(),
      offer_segment: _enum(["never", "lapsed", "recent", "unknown"]).catch("unknown").nullable().optional(),
      offer_days_left: numberSchema().int().nullable().optional().catch(null),
      offer_surface: _enum(OFFER_SURFACES).catch("unknown").nullable().optional(),
    }),
  );
  offerStatusSchema = DoctorLazy(() =>
    objectSchema({
      eligible: booleanSchema(),
      ineligible_reason: _enum(OFFER_INELIGIBLE_REASONS).catch("unknown").nullable().optional(),
      active: booleanSchema().optional().catch(false),
      arm_id: offerArmSchema(),
      kind: _enum(["none", "pct_off", "extra_credit"]).nullable().optional().catch(null),
      headline_pct: numberSchema().int().min(0).max(300).optional().catch(0),
      menu: _enum(["base", "plus40", "unknown"]).catch("unknown").nullable().optional(),
      default_bundle_id: offerArmSchema(),
      segment: _enum(["never", "lapsed", "recent", "unknown"]).catch("unknown").nullable().optional(),
      first_offered_at: stringSchema().nullable().optional().catch(null),
      expires_at: stringSchema().nullable().optional().catch(null),
      days_left: numberSchema().int().min(0).nullable().optional().catch(null),
      redeemed: booleanSchema().optional().catch(false),
      event_props: offerEventPropsSchema().nullable().optional().catch(null),
    }),
  );
});
//@ chunk-zv6whf9m.js:2671-3542 placement
function parseCreditOfferStatus(raw) {
  if (raw === undefined || raw === null) return null;
  let parsed = offerStatusSchema().safeParse(raw);
  if (!parsed.success) {
    logForDebugging(`[usage-credit-offer] ignoring a malformed status block: ${parsed.error.message}`);
    return null;
  }
  let status = parsed.data;
  let kind = status.kind ?? null;
  let eventProps = status.event_props;
  return {
    eligible: status.eligible,
    ineligibleReason: status.ineligible_reason ?? null,
    active: (status.active ?? false) && kind !== null,
    armId: status.arm_id ?? null,
    kind,
    headlinePct: status.headline_pct ?? 0,
    menu: status.menu ?? null,
    defaultBundleId: status.default_bundle_id ?? null,
    segment: status.segment ?? null,
    firstOfferedAt: status.first_offered_at ?? null,
    expiresAt: status.expires_at ?? null,
    daysLeft: status.days_left ?? null,
    redeemed: status.redeemed ?? false,
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
async function fetchCreditOfferStatus(credentials, surface) {
  try {
    if (!hasProfileScope())
      return {
        kind: "no_profile_scope",
      };
    let utilization = await fetchUtilization(credentials, {
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
var creditOfferPromptStateSlots; // deferred: uses createCreditOfferPromptState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zv6whf9m.js:4268", () => {
  creditOfferPromptStateSlots = new HostScoped(createCreditOfferPromptState);
});
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
  let promptState = currentCreditOfferPromptState();
  promptState.state = state;
  promptState.changed.emit();
}
//@ chunk-zv6whf9m.js:4401-4449 placement
/**
 * 订阅优惠提示状态变化。
 */
function onCreditOfferPromptChange(listener) {
  return currentCreditOfferPromptState().changed.subscribe(listener);
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
function wallKeyForLimit(limit) {
  return isAutoResumableLimit(limit) && limit.rateLimitType !== undefined
    ? `${limit.rateLimitType}:${limit.resetsAt}`
    : null;
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
function isSameWallKey(wall, other) {
  return wall.key === other.key && wall.accountEpoch === other.accountEpoch;
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
  let offer = activeOfferAtWall();
  if (offer === undefined) return;
  let strings = promoOfferStrings();
  return fillUsageTemplate(
    offer.kind === "pct_off" ? strings.menuSuffixPctOff : strings.menuSuffixExtraCredit,
    {
      pct: offer.headlinePct,
      daysLeft: offer.daysLeft,
    },
  );
}
//@ chunk-zv6whf9m.js:5175-5335 placement
/**
 * 按当前额度优惠生成提示文案。
 */
function getOfferHint() {
  let offer = activeOfferAtWall();
  if (offer === undefined) return;
  let strings = promoOfferStrings();
  return fillUsageTemplate(offer.kind === "pct_off" ? strings.hintPctOff : strings.hintExtraCredit, {
    pct: offer.headlinePct,
    daysLeft: offer.daysLeft,
  });
}
//@ chunk-zv6whf9m.js:5335-5506 placement
function getOfferBannerPill() {
  let offer = activeOfferAtWall();
  if (offer === undefined) return;
  let strings = promoOfferStrings();
  return fillUsageTemplate(
    offer.kind === "pct_off" ? strings.bannerPillPctOff : strings.bannerPillExtraCredit,
    {
      pct: offer.headlinePct,
      daysLeft: offer.daysLeft,
    },
  );
}
//@ chunk-zv6whf9m.js:5506-5645 placement
/**
 * 返回额度优惠横幅信息：类型、百分比、剩余天数与胶囊文案；没有有效优惠时 undefined。
 */
function getOfferBanner() {
  let offer = activeOfferAtWall();
  let offerBannerPill = getOfferBannerPill();
  if (offer === undefined || offerBannerPill === undefined) return;
  return {
    kind: offer.kind,
    headlinePct: offer.headlinePct,
    daysLeft: offer.daysLeft,
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
function offerForCliMenu(limit, credentials) {
  let wallKey = wallKeyForLimit(limit);
  if (!isPromoOfferEnabled() || !isAutoContinueEligible() || wallKey === null) return;
  CreditOfferPromptState(wallKey, "cli_menu", credentials);
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
function offerCreditAtBand(quotaLimits) {
  let wallKey = wallKeyForLimit(quotaLimits);
  if (!isPromoOfferEnabled() || !isVsCodeTopSession() || !isCreditOfferEligibleSession() || wallKey === null)
    return;
  CreditOfferPromptState(wallKey, "ide_banner", undefined);
}
//@ chunk-zv6whf9m.js:6400-6567 placement
/**
 * 优惠查询曾失败且仍在同一限额墙、失败次数未超上限时，从 CLI 菜单重新弹出额度优惠提示；返回是否弹出。
 */
function retryOfferPrompt(limit, credentials) {
  let key = wallKeyForLimit(limit);
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
function CreditOfferPromptState(key, surface, credentials, nowMs = Date.now()) {
  let wrappedWall = wrapWallKey(key);
  let promptState = currentCreditOfferPromptState();
  let state = promptState.state;
  let failures = 0;
  if (state.phase !== "idle" && isSameWallKey(state.wall, wrappedWall))
    switch (state.phase) {
      case "answered":
        if (nowMs - state.answeredAt < ANSWERED_OFFER_TTL_MS) return Promise.resolve();
        break;
      case "asking":
        return promptState.pendingAsk ?? Promise.resolve();
      case "failed":
        if (state.failures >= MAX_OFFER_FETCH_FAILURES) return Promise.resolve();
        failures = state.failures;
    }
  else if (state.phase === "asking") {
    if (state.wall.accountEpoch === wrappedWall.accountEpoch)
      return promptState.pendingAsk ?? Promise.resolve();
  }
  setCreditOfferPromptState({
    phase: "asking",
    wall: wrappedWall,
    standing: getCurrentWallOffer(),
  });
  let fetchPromise = withDeadline(fetchCreditOfferStatus(credentials, surface), OFFER_FETCH_TIMEOUT_MS)
    .then((result) => {
      claimCreditOffer({
        wall: wrappedWall,
        surface,
        failures,
        result: result ?? {
          kind: "failed",
        },
      });
    })
    .catch((error) => {
      logError(toError(error));
      try {
        claimCreditOffer({
          wall: wrappedWall,
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
      if (promptState.pendingAsk === fetchPromise) promptState.pendingAsk = null;
    });
  promptState.pendingAsk = fetchPromise;
  return fetchPromise;
}
//@ chunk-zv6whf9m.js:7280-8027 placement
function claimCreditOffer({ wall, surface, failures, result }) {
  let creditOfferPhase = getCreditOfferPhase();
  if (creditOfferPhase.phase !== "asking" || !isSameWallKey(creditOfferPhase.wall, wall)) return;
  let status = result.kind === "answered" ? result.status : null;
  if (result.kind === "failed") {
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
      result.kind === "answered"
        ? status === null
          ? result.notAuthorized
            ? "not_authorized"
            : "absent"
          : "block"
        : result.kind,
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
function logCreditOfferShown(surface, offerAnalytics = {}) {
  let promptState = currentCreditOfferPromptState();
  let state = promptState.state;
  let shownKey = `${state.phase === "idle" ? "none" : state.wall.key}:${surface}`;
  if (promptState.shown.has(shownKey)) return;
  promptState.shown.add(shownKey);
  logEvent("tengu_starry_waterfall_shown", {
    ...getCreditOfferForRateLimit(),
    ...offerAnalytics,
    surface: fromEnum(surface),
    config_version: promoOfferVersion(),
  });
}
//@ chunk-zv6whf9m.js:8239-8484 placement
/**
 * 使用额度优惠后，把当前回答或待定状态中的优惠标记为已兑换且不再生效。
 */
function markOfferRedeemed({ usedOffer }) {
  let creditOfferPhase = getCreditOfferPhase();
  let markUsed = (offer) =>
    usedOffer && offer.active
      ? {
          ...offer,
          active: false,
          redeemed: true,
        }
      : offer;
  if (creditOfferPhase.phase === "answered" && creditOfferPhase.status !== null)
    setCreditOfferPromptState({
      ...creditOfferPhase,
      answeredAt: 0,
      status: markUsed(creditOfferPhase.status),
    });
  else if (creditOfferPhase.phase === "asking" && creditOfferPhase.standing)
    setCreditOfferPromptState({
      ...creditOfferPhase,
      standing: markUsed(creditOfferPhase.standing),
    });
}
//@ chunk-zv6whf9m.js:8484-10252 placement
/**
 * cedar_ember（五小时/七天限额重置授予）的配置与文本。
 */
var CEDAR_EMBER; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var CEDAR_EMBER_GRANT_TIMEOUT_MS;
var grantIdRegex;
var armIdRegex;
var CREDIT_RESETTABLE_LIMIT_TYPES;
var GRANT_INELIGIBLE_REASONS;
var GRANT_REFUSAL_REASONS;
var GRANT_RESULT_REASONS;
var grantEventPropsSchema;
var clearedLimitsSchema;
var grantSchema;
deferInit("chunk-zv6whf9m.js:8484", () => {
  CEDAR_EMBER = "cedar_ember";
  CEDAR_EMBER_GRANT_TIMEOUT_MS = 25000;
  grantIdRegex = /^[a-z0-9_-]{1,40}$/;
  armIdRegex = /^[A-Za-z0-9_-]{1,64}$/;
  CREDIT_RESETTABLE_LIMIT_TYPES = [
    "five_hour",
    "seven_day",
    "seven_day_overage_included",
    "seven_day_opus",
    "seven_day_sonnet",
    "seven_day_cowork",
    "seven_day_omelette",
    "seven_day_oauth_apps",
  ];
  GRANT_INELIGIBLE_REASONS = [
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
  GRANT_REFUSAL_REASONS = [
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
  GRANT_RESULT_REASONS = [
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
  grantEventPropsSchema = DoctorLazy(() =>
    objectSchema({
      surface: _enum(["claude_ai", "claude_code_cli", "unknown"]).catch("unknown"),
      tier: _enum(["claude_pro", "claude_max_5x", "claude_max_20x", "claude_team", "unknown"]).catch(
        "unknown",
      ),
      tenure_bucket: _enum(["under_14", "14-29", "30-89", "90-364", "365+", "unknown"]).catch("unknown"),
      billing_path: _enum(["stripe", "apple", "google_play", "other", "unknown"]).catch("unknown"),
      billing_period: _enum(["monthly", "annual", "unknown"]).catch("unknown"),
      extra_usage_state: _enum(["not_configured", "disabled", "enabled", "unknown"]).catch("unknown"),
    }),
  );
  clearedLimitsSchema = DoctorLazy(() =>
    array(unknown())
      .catch([])
      .transform((list) =>
        list.filter((limitType) => CREDIT_RESETTABLE_LIMIT_TYPES.some((allowed) => allowed === limitType)),
      ),
  );
  grantSchema = DoctorLazy(() =>
    objectSchema({
      id: stringSchema().regex(grantIdRegex),
      label: stringSchema().catch(""),
      resets_total: numberSchema().int().min(0).catch(0),
      resets_left: numberSchema().int().min(0),
      starts_at: stringSchema().nullable().optional().catch(null),
      ends_at: stringSchema().nullable().optional().catch(null),
      clears: clearedLimitsSchema(),
      paused: booleanSchema().catch(false),
      usable_now: booleanSchema().catch(false),
      use_requires_limit: booleanSchema().catch(true),
      percent_used: record(stringSchema(), unknown()).catch({}),
      blocking: clearedLimitsSchema(),
      type: _enum(["session", "weekly", "full"]).optional().catch(undefined),
      gives_back_weekly: booleanSchema().catch(false),
      unavailable_reason: _enum(GRANT_REFUSAL_REASONS).nullable().optional().catch(null),
    }),
  );
});
//@ chunk-zv6whf9m.js:10252-10379 placement
function pickPercentFields(percentUsed) {
  let picked = {};
  for (let limitType of CREDIT_RESETTABLE_LIMIT_TYPES) {
    let value = percentUsed[limitType];
    if (typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100)
      picked[limitType] = value;
  }
  return picked;
}
//@ chunk-zv6whf9m.js:10379-11165 placement
/**
 * 领取赠送结果的校验 schema。
 */
var CedarEmberStatusSchema; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var grantClaimResultSchema;
deferInit("chunk-zv6whf9m.js:10379", () => {
  CedarEmberStatusSchema = DoctorLazy(() =>
    objectSchema({
      eligible: booleanSchema(),
      ineligible_reason: _enum(GRANT_INELIGIBLE_REASONS).catch("unknown").nullable().optional(),
      at_limit: booleanSchema().optional().catch(undefined),
      exhausted: clearedLimitsSchema().optional(),
      grants: array(unknown()).optional().catch(undefined),
      next_grant_id: stringSchema().regex(grantIdRegex).nullable().optional().catch(null),
      weekly_resets_at: stringSchema().nullable().optional().catch(null),
      cooldown_until: stringSchema().nullable().optional().catch(null),
      event_props: grantEventPropsSchema().nullable().optional().catch(null),
    }),
  );
  grantClaimResultSchema = DoctorLazy(() =>
    objectSchema({
      result: _enum(["reset", "already_used", "not_limited", "cooldown", "ineligible", "unavailable"]).catch(
        "unavailable",
      ),
      reason: _enum(GRANT_RESULT_REASONS).catch("unknown").nullable().optional(),
      resets_left: numberSchema().int().min(0).nullable().optional().catch(null),
      cleared: clearedLimitsSchema().optional(),
      weekly_resets_at: stringSchema().nullable().optional().catch(null),
      cooldown_until: stringSchema().nullable().optional().catch(null),
    }),
  );
});
//@ chunk-zv6whf9m.js:11165-11684 placement
function parseCedarEmberGrant(raw) {
  let parsed = grantSchema().safeParse(raw);
  if (!parsed.success) {
    logForDebugging(`[cedar-ember] ignoring a malformed grant: ${parsed.error.message}`);
    return null;
  }
  let grant = parsed.data;
  return {
    id: grant.id,
    label: grant.label,
    resetsTotal: grant.resets_total,
    resetsLeft: grant.resets_left,
    startsAt: grant.starts_at ?? null,
    endsAt: grant.ends_at ?? null,
    clears: grant.clears,
    paused: grant.paused,
    usableNow: grant.usable_now,
    useRequiresLimit: grant.use_requires_limit,
    percentUsed: pickPercentFields(grant.percent_used),
    blocking: grant.blocking,
    type: grant.type ?? null,
    givesBackWeekly: grant.gives_back_weekly,
    unavailableReason: grant.unavailable_reason ?? null,
  };
}
//@ chunk-zv6whf9m.js:11684-12436 placement
function parseCedarEmberStatus(cedarEmber) {
  if (cedarEmber === undefined || cedarEmber === null) return null;
  let parsed = CedarEmberStatusSchema().safeParse(cedarEmber);
  if (!parsed.success) {
    logForDebugging(`[cedar-ember] ignoring a malformed status block: ${parsed.error.message}`);
    return null;
  }
  let status = parsed.data;
  let filtered = (status.grants ?? []).map(parseCedarEmberGrant).filter((grant) => grant !== null);
  let nextGrantId =
    status.next_grant_id !== undefined &&
    status.next_grant_id !== null &&
    filtered.some((grant) => grant.id === status.next_grant_id)
      ? status.next_grant_id
      : null;
  let eventProps = status.event_props;
  return {
    eligible: status.eligible,
    ineligibleReason: status.ineligible_reason ?? null,
    atLimit: status.at_limit ?? false,
    exhausted: status.exhausted ?? [],
    grants: filtered,
    nextGrantId,
    weeklyResetsAt: status.weekly_resets_at ?? null,
    cooldownUntil: status.cooldown_until ?? null,
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
function getLatestResetGrantEnd(status, nowMs) {
  if (status === undefined || status === null || !status.eligible) return;
  let filtered = status.grants
    .filter((grant) => grant.resetsLeft > 0 && !grant.paused)
    .map((grant) => parseTimestampOrUndefined(grant.endsAt) ?? 1 / 0)
    .filter((endMs) => endMs > nowMs);
  return filtered.length === 0 ? undefined : Math.max(...filtered);
}
//@ chunk-zv6whf9m.js:12640-13129 placement
async function fetchCedarEmberStatus(credentials, { read = "at_wall", surface } = {}) {
  try {
    if (!hasProfileScope())
      return {
        kind: "no_profile_scope",
      };
    let utilization = await fetchUtilization(
      credentials,
      read === "at_wall"
        ? {
            read,
            surface,
          }
        : {
            read,
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
var EMPTY_GRANT_RESULT = {
  reason: null,
  resetsLeft: null,
  cleared: [],
  weeklyResetsAt: null,
};
//@ chunk-zv6whf9m.js:13196-14515 placement
/**
 * 领取限额重置授予（需要 OAuth 组织，校验授予格式）。
 */
async function claimCedarEmberGrant(credentials, id, requestId) {
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!organizationUuid) {
    logForDebugging("[cedar-ember] no OAuth organization; cannot claim");
    return {
      result: "auth_error",
      ...EMPTY_GRANT_RESULT,
    };
  }
  if (!grantIdRegex.test(id) || !armIdRegex.test(requestId)) {
    logError(Error("[cedar-ember] refusing to claim with a malformed grant or request id"));
    return {
      result: "error",
      ...EMPTY_GRANT_RESULT,
    };
  }
  try {
    let response = await withOAuth401Retry(
      () =>
        apiClient.post(
          `/api/organizations/${organizationUuid}/reset_rate_limits`,
          {
            program: CEDAR_EMBER,
            grant_id: id,
            request_id: requestId,
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
    if (!response.ok) {
      logForDebugging(
        `[cedar-ember] claim not sent: ${response.reason === "no-auth" ? response.detail : response.reason}`,
        {
          level: "warn",
        },
      );
      return {
        result: response.reason === "no-auth" ? "auth_error" : "error",
        ...EMPTY_GRANT_RESULT,
      };
    }
    let claimResult = grantClaimResultSchema().safeParse(response.data);
    if (!claimResult.success) {
      logForDebugging(`[cedar-ember] unreadable claim response: ${claimResult.error.message}`, {
        level: "error",
      });
      logError(Error("[cedar-ember] unreadable claim response"));
      return {
        result: "error",
        ...EMPTY_GRANT_RESULT,
      };
    }
    return {
      result: claimResult.data.result,
      reason: claimResult.data.reason ?? null,
      resetsLeft: claimResult.data.resets_left ?? null,
      cleared: claimResult.data.cleared ?? [],
      weeklyResetsAt: claimResult.data.weekly_resets_at ?? null,
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
            ...EMPTY_GRANT_RESULT,
          };
        case 401:
        case 403:
          return {
            result: "auth_error",
            ...EMPTY_GRANT_RESULT,
          };
        default:
          break;
      }
    return {
      result: "error",
      ...EMPTY_GRANT_RESULT,
    };
  }
}
//@ chunk-zv6whf9m.js:14515-14605 placement
/**
 * 解析时间戳为毫秒数，非法返回 undefined。
 */
function parseTimestampOrUndefined(value) {
  if (value === null) return;
  let timestamp = Date.parse(value);
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
var usageCreditHostStates; // deferred: uses createUsageCreditState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-zv6whf9m.js:14992", () => {
  usageCreditHostStates = new HostScoped(createUsageCreditState);
});
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
  let slots = usageCreditStateSlots();
  slots.state = state;
  slots.changed.emit();
}
//@ chunk-zv6whf9m.js:15132-15180 placement
/**
 * 订阅用量额度状态变化。
 */
function onUsageCreditStateChange(listener) {
  return usageCreditStateSlots().changed.subscribe(listener);
}
//@ chunk-zv6whf9m.js:15180-15228 placement
/**
 * 订阅用量额度事件。
 */
function onUsageCreditEvent(listener) {
  return usageCreditStateSlots().events.subscribe(listener);
}
//@ chunk-zv6whf9m.js:15228-15341 placement
/**
 * 未使用限额重置状态缓存的有效期、查询超时与缓存 schema。
 */
var UNUSED_RESET_CACHE_TTL_MS; // deferred: uses DoctorLazy (../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var UNUSED_RESET_TIMEOUT_MS;
var UNUSED_RESET_CACHE_SCHEMA;
deferInit("chunk-zv6whf9m.js:15228", () => {
  UNUSED_RESET_CACHE_TTL_MS = 259200000;
  UNUSED_RESET_TIMEOUT_MS = 12000;
  UNUSED_RESET_CACHE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      accountUuid: stringSchema().min(1),
      holdsUnusedReset: booleanSchema(),
      checkedAt: numberSchema(),
      validUntil: numberSchema(),
    }),
  );
});
//@ chunk-zv6whf9m.js:15341-15628 placement
/**
 * 根据缓存判断当前账号是否持有未使用的限额重置：CLI 入口、同一账号、缓存未过期且在有效期内、使用 claude.ai 令牌且允许促销。
 */
function holdsUnusedReset(nowMs = Date.now()) {
  try {
    let accountUuid = getOauthAccountInfo()?.accountUuid;
    let cache = UNUSED_RESET_CACHE_SCHEMA().safeParse(getGlobalConfig().unusedLimitResetStatusCache).data;
    return (
      getEntrypointKind() === "cli" &&
      !!accountUuid &&
      cache?.accountUuid === accountUuid &&
      cache.holdsUnusedReset &&
      cache.checkedAt <= nowMs &&
      nowMs - cache.checkedAt < UNUSED_RESET_CACHE_TTL_MS &&
      nowMs < cache.validUntil &&
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
function refreshUnusedResetStatus(credentials, storageV5) {
  let slots = usageCreditStateSlots();
  slots.pendingUnusedResetRead ??= describeCedarEmberAvailability(credentials, storageV5)
    .catch((error) => logError(toError(error)))
    .finally(() => {
      slots.pendingUnusedResetRead = null;
    });
  return slots.pendingUnusedResetRead;
}
//@ chunk-zv6whf9m.js:15789-15958 placement
/**
 * 丢弃未使用限额重置状态的缓存（内存与全局配置），并计数。
 */
function dropUnusedResetCache() {
  let slots = usageCreditStateSlots();
  slots.unusedResetAnsweredFor = null;
  slots.unusedResetDrops++;
  saveGlobalConfig((config) =>
    config.unusedLimitResetStatusCache === undefined
      ? config
      : {
          ...config,
          unusedLimitResetStatusCache: undefined,
        },
  );
}
//@ chunk-zv6whf9m.js:15958-16705 placement
async function describeCedarEmberAvailability(credentials, storageV5) {
  let slots = usageCreditStateSlots();
  let accountUuid = getOauthAccountInfo()?.accountUuid;
  if (!accountUuid) return;
  let answeredForKey = `${getLimitsAccountEpoch()}:${accountUuid}`;
  if (
    slots.unusedResetAnsweredFor === answeredForKey ||
    getEntrypointKind() !== "cli" ||
    getAuthTokenSource().source !== "claude.ai" ||
    !isAutoContinueEligible() ||
    !arePromoOffersAllowed()
  )
    return;
  let unusedResetDrops = slots.unusedResetDrops;
  let statusResult = await withDeadline(
    fetchCedarEmberStatus(credentials, {
      read: "cedar_ember",
    }),
    UNUSED_RESET_TIMEOUT_MS,
  );
  if (
    getOauthAccountInfo()?.accountUuid !== accountUuid ||
    slots.unusedResetDrops !== unusedResetDrops ||
    getAuthTokenSource().source !== "claude.ai" ||
    !arePromoOffersAllowed()
  )
    return;
  switch (statusResult?.kind) {
    case "not_authorized":
    case "no_profile_scope":
      slots.unusedResetAnsweredFor = answeredForKey;
      return;
    case "answered":
      break;
    case "failed":
    case undefined:
      return;
  }
  if (statusResult.status?.ineligibleReason === "unavailable") return;
  slots.unusedResetAnsweredFor = answeredForKey;
  let now = Date.now();
  let latestResetGrantEnd = getLatestResetGrantEnd(statusResult.status, now);
  await saveGlobalConfig(
    (config) => ({
      ...config,
      unusedLimitResetStatusCache: {
        accountUuid,
        holdsUnusedReset: latestResetGrantEnd !== undefined,
        checkedAt: now,
        validUntil: Math.min(now + UNUSED_RESET_CACHE_TTL_MS, latestResetGrantEnd ?? 1 / 0),
      },
    }),
    storageV5,
  );
}
//@ chunk-zv6whf9m.js:16705-16736 placement
var TENGU_WISE_BEAR_COPY = "tengu_wise_bear_copy";
//@ chunk-zv6whf9m.js:16932-17029 placement
/**
 * 优惠里的备注是否只在本周重置未使用时才展示。
 */
function isOnlyIfUnusedResetNote(note) {
  return typeof note === "object" && note !== null && Reflect.get(note, "only_if_unused_reset") === true;
}
//@ chunk-zv6whf9m.js:17029-17266 placement
function readOfferNote(note, noteKind, cleanTaskDescription, allowOnlyIfUnused) {
  if (typeof note !== "object" || note === null) return;
  if (isOnlyIfUnusedResetNote(note) && allowOnlyIfUnused !== true) return;
  let rawNote = Reflect.get(note, `note_${noteKind}`);
  if (typeof rawNote !== "string") return;
  let cleaned = cleanTaskDescription(rawNote);
  return cleaned && !(cleaned.endsWith("\u2026") && !rawNote.trimEnd().endsWith("\u2026"))
    ? cleaned
    : undefined;
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
