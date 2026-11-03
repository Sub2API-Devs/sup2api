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
import { o, u, M, U, E, A, oe, pe } from "../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../utils/debug.js";
import {
  hasProfileScope,
  isClaudeAISubscriber,
  getOauthAccountInfo,
  getAuthTokenSource,
} from "../utils/auth.js";
import {
  fetchUtilization,
  kVe,
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
import { ye } from "../utils/startupMarks.js";
import { Qce, JTe } from "./rateLimitContinuation.js";
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

/**
 * starry_waterfall（用量积分邀约）配置：资格、展示位置（CLI 菜单、限额带、IDE 横幅）与文案键。
 */
//@ chunk-zv6whf9m.js:981-2671 placement
var STARRY_WATERFALL = "starry_waterfall",
  L = [
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
  ],
  q = [
    "cli_menu",
    "cli_credits_required",
    "ide_banner",
    "alert_band",
    "overage_band",
    "code_usage_band",
    "credits_required",
    "code_credits_required",
    "unknown",
  ],
  w = DoctorLazy(() =>
    o()
      .regex(/^[A-Za-z0-9_-]{1,64}$/)
      .nullable()
      .optional()
      .catch(null),
  ),
  V = DoctorLazy(() =>
    u({
      offer_eligible: M().nullable().optional().catch(null),
      offer_reason: U(L).catch("unknown").nullable().optional(),
      offer_arm: w(),
      offer_kind: U(["none", "pct_off", "extra_credit", "unknown"]).catch("unknown").nullable().optional(),
      offer_menu: U(["base", "plus40", "unknown"]).catch("unknown").nullable().optional(),
      offer_segment: U(["never", "lapsed", "recent", "unknown"]).catch("unknown").nullable().optional(),
      offer_days_left: E().int().nullable().optional().catch(null),
      offer_surface: U(q).catch("unknown").nullable().optional(),
    }),
  ),
  Q = DoctorLazy(() =>
    u({
      eligible: M(),
      ineligible_reason: U(L).catch("unknown").nullable().optional(),
      active: M().optional().catch(!1),
      arm_id: w(),
      kind: U(["none", "pct_off", "extra_credit"]).nullable().optional().catch(null),
      headline_pct: E().int().min(0).max(300).optional().catch(0),
      menu: U(["base", "plus40", "unknown"]).catch("unknown").nullable().optional(),
      default_bundle_id: w(),
      segment: U(["never", "lapsed", "recent", "unknown"]).catch("unknown").nullable().optional(),
      first_offered_at: o().nullable().optional().catch(null),
      expires_at: o().nullable().optional().catch(null),
      days_left: E().int().min(0).nullable().optional().catch(null),
      redeemed: M().optional().catch(!1),
      event_props: V().nullable().optional().catch(null),
    }),
  );
//@ chunk-zv6whf9m.js:2671-3542 placement
function parseCreditOfferStatus(e) {
  if (e === void 0 || e === null) return null;
  let safeParse = Q().safeParse(e);
  if (!safeParse.success)
    return (
      logForDebugging(`[usage-credit-offer] ignoring a malformed status block: ${safeParse.error.message}`),
      null
    );
  let r = safeParse.data,
    i = r.kind ?? null,
    event_props = r.event_props;
  return {
    eligible: r.eligible,
    ineligibleReason: r.ineligible_reason ?? null,
    active: (r.active ?? !1) && i !== null,
    armId: r.arm_id ?? null,
    kind: i,
    headlinePct: r.headline_pct ?? 0,
    menu: r.menu ?? null,
    defaultBundleId: r.default_bundle_id ?? null,
    segment: r.segment ?? null,
    firstOfferedAt: r.first_offered_at ?? null,
    expiresAt: r.expires_at ?? null,
    daysLeft: r.days_left ?? null,
    redeemed: r.redeemed ?? !1,
    eventProps: event_props
      ? {
          offerEligible: event_props.offer_eligible ?? null,
          offerReason: event_props.offer_reason ?? null,
          offerArm: event_props.offer_arm ?? null,
          offerKind: event_props.offer_kind ?? null,
          offerMenu: event_props.offer_menu ?? null,
          offerSegment: event_props.offer_segment ?? null,
          offerDaysLeft: event_props.offer_days_left ?? null,
          offerSurface: event_props.offer_surface ?? null,
        }
      : null,
  };
}
//@ chunk-zv6whf9m.js:3542-3704 placement
function isActiveCreditOffer(e) {
  return (
    e !== void 0 &&
    e !== null &&
    e.active &&
    !e.redeemed &&
    (e.kind === "pct_off" || e.kind === "extra_credit") &&
    e.headlinePct > 0 &&
    e.daysLeft !== null &&
    e.daysLeft > 0
  );
}
//@ chunk-zv6whf9m.js:3704-4183 placement
async function fetchCreditOfferStatus(e, n) {
  try {
    if (!hasProfileScope()) return { kind: "no_profile_scope" };
    let r = await fetchUtilization(e, { read: "starry_waterfall", surface: n });
    if (!kVe(r))
      return (
        logForDebugging(
          "[usage-credit-offer] status fetch returned a fieldless or non-object body (in-band error)",
          { level: "warn" },
        ),
        { kind: "failed" }
      );
    return { kind: "answered", status: parseCreditOfferStatus(r?.[STARRY_WATERFALL]) };
  } catch (error) {
    if (
      (logForDebugging(`[usage-credit-offer] status fetch failed: ${toError(error).message}`, {
        level: "warn",
      }),
      isAuthRejectedUsageError(error))
    )
      return { kind: "answered", status: null, notAuthorized: !0 };
    return { kind: "failed" };
  }
}
//@ chunk-zv6whf9m.js:4183-4268 placement
function Z() {
  return { state: { phase: "idle" }, shown: new Set(), pendingAsk: null, changed: createSignal() };
}
//@ chunk-zv6whf9m.js:4268-4283 placement
var X = new HostScoped(Z);
//@ chunk-zv6whf9m.js:4283-4318 placement
function h() {
  return X.of(getRootSession().host);
}
//@ chunk-zv6whf9m.js:4318-4350 placement
function CWe() {
  return h().state;
}
//@ chunk-zv6whf9m.js:4350-4401 placement
function g(e) {
  let n = h();
  ((n.state = e), n.changed.emit());
}
//@ chunk-zv6whf9m.js:4401-4449 placement
function Jre(e) {
  return h().changed.subscribe(e);
}
//@ chunk-zv6whf9m.js:4449-4497 placement
var D = 3,
  J = 12000,
  ee = 600000,
  CREDITS_REQUIRED = "credits_required";
//@ chunk-zv6whf9m.js:4497-4590 placement
function R(e) {
  return isAutoResumableLimit(e) && e.rateLimitType !== void 0 ? `${e.rateLimitType}:${e.resetsAt}` : null;
}
//@ chunk-zv6whf9m.js:4590-4636 placement
function j(e) {
  return { key: e, accountEpoch: getLimitsAccountEpoch() };
}
//@ chunk-zv6whf9m.js:4636-4706 placement
function O(e, n) {
  return e.key === n.key && e.accountEpoch === n.accountEpoch;
}
//@ chunk-zv6whf9m.js:4706-4773 placement
function te() {
  return (
    isClaudeAISubscriber() && getOauthAccountInfo()?.billingType !== "usage_based" && isFirstPartyApiBackend()
  );
}
//@ chunk-zv6whf9m.js:4773-4952 placement
function getCurrentWallOffer() {
  let e = CWe();
  if (e.phase === "idle" || e.wall.accountEpoch !== getLimitsAccountEpoch()) return;
  switch (e.phase) {
    case "answered":
      return e.status;
    case "asking":
      return e.standing;
    case "failed":
      return;
  }
}
//@ chunk-zv6whf9m.js:4952-5003 placement
function y() {
  let e = getCurrentWallOffer();
  return isActiveCreditOffer(e) && isPromoOfferEnabled() ? e : void 0;
}
/**
 * 按当前额度优惠（折扣或额外额度）生成菜单项后缀文案。
 */
//@ chunk-zv6whf9m.js:5003-5175 placement
function getOfferMenuSuffix() {
  let e = y();
  if (e === void 0) return;
  let n = promoOfferStrings();
  return fillUsageTemplate(e.kind === "pct_off" ? n.menuSuffixPctOff : n.menuSuffixExtraCredit, {
    pct: e.headlinePct,
    daysLeft: e.daysLeft,
  });
}
/**
 * 按当前额度优惠生成提示文案。
 */
//@ chunk-zv6whf9m.js:5175-5335 placement
function getOfferHint() {
  let e = y();
  if (e === void 0) return;
  let n = promoOfferStrings();
  return fillUsageTemplate(e.kind === "pct_off" ? n.hintPctOff : n.hintExtraCredit, {
    pct: e.headlinePct,
    daysLeft: e.daysLeft,
  });
}
//@ chunk-zv6whf9m.js:5335-5506 placement
function getOfferBannerPill() {
  let e = y();
  if (e === void 0) return;
  let n = promoOfferStrings();
  return fillUsageTemplate(e.kind === "pct_off" ? n.bannerPillPctOff : n.bannerPillExtraCredit, {
    pct: e.headlinePct,
    daysLeft: e.daysLeft,
  });
}
/**
 * 返回额度优惠横幅信息：类型、百分比、剩余天数与胶囊文案；没有有效优惠时 undefined。
 */
//@ chunk-zv6whf9m.js:5506-5645 placement
function getOfferBanner() {
  let e = y(),
    n = getOfferBannerPill();
  if (e === void 0 || n === void 0) return;
  return { kind: e.kind, headlinePct: e.headlinePct, daysLeft: e.daysLeft, label: n };
}
//@ chunk-zv6whf9m.js:5645-6153 placement
function getCreditOfferForRateLimit() {
  let e = getCurrentWallOffer();
  if (e === void 0 || e === null) return {};
  let eventProps = e.eventProps;
  return {
    offer_eligible: eventProps?.offerEligible ?? e.eligible,
    offer_reason: fromEnumOpt(eventProps?.offerReason ?? e.ineligibleReason) ?? void 0,
    offer_arm: ye(eventProps?.offerArm ?? e.armId),
    offer_kind: fromEnumOpt(eventProps?.offerKind ?? e.kind) ?? void 0,
    offer_menu: fromEnumOpt(eventProps?.offerMenu ?? e.menu) ?? void 0,
    offer_segment: fromEnumOpt(eventProps?.offerSegment ?? e.segment) ?? void 0,
    offer_days_left: eventProps?.offerDaysLeft ?? e.daysLeft ?? void 0,
    offer_active: e.active,
    offer_redeemed: e.redeemed,
    offer_surface: fromEnumOpt(eventProps?.offerSurface) ?? void 0,
  };
}
//@ chunk-zv6whf9m.js:6153-6235 placement
function nPs(e, n) {
  let r = R(e);
  if (!isPromoOfferEnabled() || !Qce() || r === null) return;
  CreditOfferPromptState(r, "cli_menu", n);
}
//@ chunk-zv6whf9m.js:6235-6307 placement
function rPs(e) {
  if (!isPromoOfferEnabled() || !Qce()) return;
  CreditOfferPromptState(CREDITS_REQUIRED, "cli_credits_required", e);
}
//@ chunk-zv6whf9m.js:6307-6400 placement
function oPs(e) {
  let n = R(e);
  if (!isPromoOfferEnabled() || !isVsCodeTopSession() || !te() || n === null) return;
  CreditOfferPromptState(n, "ide_banner", void 0);
}
/**
 * 优惠查询曾失败且仍在同一限额墙、失败次数未超上限时，从 CLI 菜单重新弹出额度优惠提示；返回是否弹出。
 */
//@ chunk-zv6whf9m.js:6400-6567 placement
function retryOfferPrompt(e, n) {
  let r = R(e);
  if (!isPromoOfferEnabled() || !Qce() || r === null) return !1;
  let i = CWe();
  if (i.phase === "failed" && O(i.wall, j(r)) && i.failures < D)
    return (CreditOfferPromptState(r, "cli_menu", n), !0);
  return !1;
}
//@ chunk-zv6whf9m.js:6567-7280 placement
function CreditOfferPromptState(e, n, r, i = Date.now()) {
  let s = j(e),
    d = h(),
    state = d.state,
    m = 0;
  if (state.phase !== "idle" && O(state.wall, s))
    switch (state.phase) {
      case "answered":
        if (i - state.answeredAt < ee) return Promise.resolve();
        break;
      case "asking":
        return d.pendingAsk ?? Promise.resolve();
      case "failed":
        if (state.failures >= D) return Promise.resolve();
        m = state.failures;
    }
  else if (state.phase === "asking") {
    if (state.wall.accountEpoch === s.accountEpoch) return d.pendingAsk ?? Promise.resolve();
  }
  g({ phase: "asking", wall: s, standing: getCurrentWallOffer() });
  let b = withDeadline(fetchCreditOfferStatus(r, n), J)
    .then((C) => {
      claimCreditOffer({ wall: s, surface: n, failures: m, result: C ?? { kind: "failed" } });
    })
    .catch((C) => {
      logError(toError(C));
      try {
        claimCreditOffer({ wall: s, surface: n, failures: m, result: { kind: "failed" } });
      } catch (error) {
        logError(toError(error));
      }
    })
    .finally(() => {
      if (d.pendingAsk === b) d.pendingAsk = null;
    });
  return ((d.pendingAsk = b), b);
}
//@ chunk-zv6whf9m.js:7280-8027 placement
function claimCreditOffer({ wall: wall, surface: surface, failures: failures, result: i }) {
  let s = CWe();
  if (s.phase !== "asking" || !O(s.wall, wall)) return;
  let d = i.kind === "answered" ? i.status : null;
  if (i.kind === "failed") {
    let standing = s.standing;
    if (standing !== void 0) g({ phase: "answered", wall: wall, status: standing, answeredAt: Date.now() });
    else g({ phase: "failed", wall: wall, failures: failures + 1 });
  } else g({ phase: "answered", wall: wall, status: d, answeredAt: Date.now() });
  if (
    (logEvent("tengu_starry_waterfall_asked", {
      outcome: fromEnum(
        i.kind === "answered"
          ? d === null
            ? i.notAuthorized
              ? "not_authorized"
              : "absent"
            : "block"
          : i.kind,
      ),
      attempt: failures + 1,
      surface: fromEnum(surface),
      eligible: d?.eligible ?? !1,
      ineligible_reason: fromEnumOpt(d?.ineligibleReason) ?? void 0,
      config_version: promoOfferVersion(),
    }),
    d === null || !d.eligible)
  )
    return;
  logEvent("tengu_starry_waterfall_wall", {
    ...getCreditOfferForRateLimit(),
    surface: fromEnum(surface),
    tier: fromEnum(JTe()),
    config_version: promoOfferVersion(),
  });
}
//@ chunk-zv6whf9m.js:8027-8239 placement
function logCreditOfferShown(e, n = {}) {
  let r = h(),
    state = r.state,
    d = `${state.phase === "idle" ? "none" : state.wall.key}:${e}`;
  if (r.shown.has(d)) return;
  (r.shown.add(d),
    logEvent("tengu_starry_waterfall_shown", {
      ...getCreditOfferForRateLimit(),
      ...n,
      surface: fromEnum(e),
      config_version: promoOfferVersion(),
    }));
}
/**
 * 使用额度优惠后，把当前回答或待定状态中的优惠标记为已兑换且不再生效。
 */
//@ chunk-zv6whf9m.js:8239-8484 placement
function markOfferRedeemed({ usedOffer: usedOffer }) {
  let n = CWe(),
    r = (i) => (usedOffer && i.active ? { ...i, active: !1, redeemed: !0 } : i);
  if (n.phase === "answered" && n.status !== null) g({ ...n, answeredAt: 0, status: r(n.status) });
  else if (n.phase === "asking" && n.standing) g({ ...n, standing: r(n.standing) });
}
/**
 * cedar_ember（五小时/七天限额重置授予）的配置与文本。
 */
//@ chunk-zv6whf9m.js:8484-10252 placement
var CEDAR_EMBER = "cedar_ember",
  ie = 25000,
  x = /^[a-z0-9_-]{1,40}$/,
  le = /^[A-Za-z0-9_-]{1,64}$/,
  XAr = [
    "five_hour",
    "seven_day",
    "seven_day_overage_included",
    "seven_day_opus",
    "seven_day_sonnet",
    "seven_day_cowork",
    "seven_day_omelette",
    "seven_day_oauth_apps",
  ],
  K = [
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
  ],
  se = [
    "cooldown",
    "blocked_five_hour",
    "blocked_seven_day",
    "blocked_opus",
    "blocked_sonnet",
    "blocked_other",
    "cannot_clear",
    "needs_limit",
    "unavailable",
  ],
  fe = [
    ...K,
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
  ],
  ce = DoctorLazy(() =>
    u({
      surface: U(["claude_ai", "claude_code_cli", "unknown"]).catch("unknown"),
      tier: U(["claude_pro", "claude_max_5x", "claude_max_20x", "claude_team", "unknown"]).catch("unknown"),
      tenure_bucket: U(["under_14", "14-29", "30-89", "90-364", "365+", "unknown"]).catch("unknown"),
      billing_path: U(["stripe", "apple", "google_play", "other", "unknown"]).catch("unknown"),
      billing_period: U(["monthly", "annual", "unknown"]).catch("unknown"),
      extra_usage_state: U(["not_configured", "disabled", "enabled", "unknown"]).catch("unknown"),
    }),
  ),
  S = DoctorLazy(() =>
    A(oe())
      .catch([])
      .transform((e) => e.filter((n) => XAr.some((r) => r === n))),
  ),
  me = DoctorLazy(() =>
    u({
      id: o().regex(x),
      label: o().catch(""),
      resets_total: E().int().min(0).catch(0),
      resets_left: E().int().min(0),
      starts_at: o().nullable().optional().catch(null),
      ends_at: o().nullable().optional().catch(null),
      clears: S(),
      paused: M().catch(!1),
      usable_now: M().catch(!1),
      use_requires_limit: M().catch(!0),
      percent_used: pe(o(), oe()).catch({}),
      blocking: S(),
      type: U(["session", "weekly", "full"])
        .optional()
        .catch(void 0),
      gives_back_weekly: M().catch(!1),
      unavailable_reason: U(se).nullable().optional().catch(null),
    }),
  );
//@ chunk-zv6whf9m.js:10252-10379 placement
function pickPercentFields(e) {
  let n = {};
  for (let r of XAr) {
    let i = e[r];
    if (typeof i === "number" && Number.isInteger(i) && i >= 0 && i <= 100) n[r] = i;
  }
  return n;
}
//@ chunk-zv6whf9m.js:10379-11165 placement
var CedarEmberStatusSchema = DoctorLazy(() =>
    u({
      eligible: M(),
      ineligible_reason: U(K).catch("unknown").nullable().optional(),
      at_limit: M()
        .optional()
        .catch(void 0),
      exhausted: S().optional(),
      grants: A(oe())
        .optional()
        .catch(void 0),
      next_grant_id: o().regex(x).nullable().optional().catch(null),
      weekly_resets_at: o().nullable().optional().catch(null),
      cooldown_until: o().nullable().optional().catch(null),
      event_props: ce().nullable().optional().catch(null),
    }),
  ),
  be = DoctorLazy(() =>
    u({
      result: U(["reset", "already_used", "not_limited", "cooldown", "ineligible", "unavailable"]).catch(
        "unavailable",
      ),
      reason: U(fe).catch("unknown").nullable().optional(),
      resets_left: E().int().min(0).nullable().optional().catch(null),
      cleared: S().optional(),
      weekly_resets_at: o().nullable().optional().catch(null),
      cooldown_until: o().nullable().optional().catch(null),
    }),
  );
//@ chunk-zv6whf9m.js:11165-11684 placement
function parseCedarEmberGrant(e) {
  let safeParse = me().safeParse(e);
  if (!safeParse.success)
    return (logForDebugging(`[cedar-ember] ignoring a malformed grant: ${safeParse.error.message}`), null);
  let r = safeParse.data;
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
function parseCedarEmberStatus(e) {
  if (e === void 0 || e === null) return null;
  let safeParse = CedarEmberStatusSchema().safeParse(e);
  if (!safeParse.success)
    return (
      logForDebugging(`[cedar-ember] ignoring a malformed status block: ${safeParse.error.message}`),
      null
    );
  let r = safeParse.data,
    filtered = (r.grants ?? []).map(parseCedarEmberGrant).filter((f) => f !== null),
    s =
      r.next_grant_id !== void 0 && r.next_grant_id !== null && filtered.some((f) => f.id === r.next_grant_id)
        ? r.next_grant_id
        : null,
    event_props = r.event_props;
  return {
    eligible: r.eligible,
    ineligibleReason: r.ineligible_reason ?? null,
    atLimit: r.at_limit ?? !1,
    exhausted: r.exhausted ?? [],
    grants: filtered,
    nextGrantId: s,
    weeklyResetsAt: r.weekly_resets_at ?? null,
    cooldownUntil: r.cooldown_until ?? null,
    eventProps: event_props
      ? {
          surface: event_props.surface,
          tier: event_props.tier,
          tenureBucket: event_props.tenure_bucket,
          billingPath: event_props.billing_path,
          billingPeriod: event_props.billing_period,
          extraUsageState: event_props.extra_usage_state,
        }
      : null,
  };
}
/**
 * 在可用的限额重置授予中找出结束时间晚于当前的最晚一个，没有返回 undefined。
 */
//@ chunk-zv6whf9m.js:12436-12640 placement
function getLatestResetGrantEnd(e, n) {
  if (e === void 0 || e === null || !e.eligible) return;
  let filtered = e.grants
    .filter((grant) => grant.resetsLeft > 0 && !grant.paused)
    .map((i) => WHt(i.endsAt) ?? 1 / 0)
    .filter((i) => i > n);
  return filtered.length === 0 ? void 0 : Math.max(...filtered);
}
//@ chunk-zv6whf9m.js:12640-13129 placement
async function fetchCedarEmberStatus(e, { read: n = "at_wall", surface: r } = {}) {
  try {
    if (!hasProfileScope()) return { kind: "no_profile_scope" };
    let i = await fetchUtilization(e, n === "at_wall" ? { read: n, surface: r } : { read: n });
    if (!kVe(i))
      return (
        logForDebugging(
          "[cedar-ember] status fetch returned a fieldless or non-object body (in-band error)",
          { level: "warn" },
        ),
        { kind: "failed" }
      );
    return { kind: "answered", status: parseCedarEmberStatus(i?.cedar_ember) };
  } catch (error) {
    if (
      (logForDebugging(`[cedar-ember] status fetch failed: ${toError(error).message}`, { level: "warn" }),
      isAuthRejectedUsageError(error))
    )
      return { kind: "not_authorized" };
    return { kind: "failed" };
  }
}
//@ chunk-zv6whf9m.js:13129-13196 placement
var _ = { reason: null, resetsLeft: null, cleared: [], weeklyResetsAt: null };
/**
 * 领取限额重置授予（需要 OAuth 组织，校验授予格式）。
 */
//@ chunk-zv6whf9m.js:13196-14515 placement
async function claimCedarEmberGrant(e, n, r) {
  let i = getOauthAccountInfo()?.organizationUuid;
  if (!i)
    return (
      logForDebugging("[cedar-ember] no OAuth organization; cannot claim"),
      { result: "auth_error", ..._ }
    );
  if (!x.test(n) || !le.test(r))
    return (
      logError(Error("[cedar-ember] refusing to claim with a malformed grant or request id")),
      { result: "error", ..._ }
    );
  try {
    let s = await withOAuth401Retry(
      () =>
        apiClient.post(
          `/api/organizations/${i}/reset_rate_limits`,
          { program: CEDAR_EMBER, grant_id: n, request_id: r },
          {
            auth: "async",
            headers: { "Content-Type": "application/json" },
            timeout: ie,
            refreshOAuth: !0,
            credentials: e,
          },
        ),
      { credentials: e },
    );
    if (!s.ok)
      return (
        logForDebugging(`[cedar-ember] claim not sent: ${s.reason === "no-auth" ? s.detail : s.reason}`, {
          level: "warn",
        }),
        { result: s.reason === "no-auth" ? "auth_error" : "error", ..._ }
      );
    let safeParse = be().safeParse(s.data);
    if (!safeParse.success)
      return (
        logForDebugging(`[cedar-ember] unreadable claim response: ${safeParse.error.message}`, {
          level: "error",
        }),
        logError(Error("[cedar-ember] unreadable claim response")),
        { result: "error", ..._ }
      );
    return {
      result: safeParse.data.result,
      reason: safeParse.data.reason ?? null,
      resetsLeft: safeParse.data.resets_left ?? null,
      cleared: safeParse.data.cleared ?? [],
      weeklyResetsAt: safeParse.data.weekly_resets_at ?? null,
    };
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`[cedar-ember] claim failed: ${toError(error).message}`, { level: "warn" });
    else logError(toError(error));
    if (isAxiosError(error))
      switch (error.response?.status) {
        case 429:
          return { result: "rate_limited", ..._ };
        case 401:
        case 403:
          return { result: "auth_error", ..._ };
        default:
          break;
      }
    return { result: "error", ..._ };
  }
}
//@ chunk-zv6whf9m.js:14515-14605 placement
function WHt(e) {
  if (e === null) return;
  let parse = Date.parse(e);
  return Number.isFinite(parse) ? parse : void 0;
}
/**
 * 创建用量额度优惠的初始状态（空闲阶段、各种待定与认领记录为空）。
 */
//@ chunk-zv6whf9m.js:14605-14992 placement
function createUsageCreditState() {
  return {
    state: { phase: "idle" },
    shownOfferKey: null,
    wallRecordKey: null,
    pendingAsk: null,
    pendingUnusedResetRead: null,
    unusedResetAnsweredFor: null,
    unusedResetDrops: 0,
    claiming: !1,
    continuableWallResetsAt: null,
    unsettledClaimGrantId: null,
    unsettledClaimEpoch: null,
    unsettledClaimRequestId: null,
    unsettledClaimAtMs: null,
    wallSurface: null,
    sessionSwitchSubscribed: !1,
    changed: createSignal(),
    events: createSignal(),
  };
}
//@ chunk-zv6whf9m.js:14992-15009 placement
var we = new HostScoped(createUsageCreditState);
//@ chunk-zv6whf9m.js:15009-15046 placement
function yz() {
  return we.of(getRootSession().host);
}
//@ chunk-zv6whf9m.js:15046-15078 placement
function s9() {
  return yz().state;
}
//@ chunk-zv6whf9m.js:15078-15132 placement
function GHt(e) {
  let n = yz();
  ((n.state = e), n.changed.emit());
}
//@ chunk-zv6whf9m.js:15132-15180 placement
function i9(e) {
  return yz().changed.subscribe(e);
}
//@ chunk-zv6whf9m.js:15180-15228 placement
function nyo(e) {
  return yz().events.subscribe(e);
}
/**
 * 未使用限额重置状态缓存的有效期、查询超时与缓存 schema。
 */
//@ chunk-zv6whf9m.js:15228-15341 placement
var UNUSED_RESET_CACHE_TTL_MS = 259200000,
  UNUSED_RESET_TIMEOUT_MS = 12000,
  UNUSED_RESET_CACHE_SCHEMA = DoctorLazy(() =>
    u({ accountUuid: o().min(1), holdsUnusedReset: M(), checkedAt: E(), validUntil: E() }),
  );
/**
 * 根据缓存判断当前账号是否持有未使用的限额重置：CLI 入口、同一账号、缓存未过期且在有效期内、使用 claude.ai 令牌且允许促销。
 */
//@ chunk-zv6whf9m.js:15341-15628 placement
function holdsUnusedReset(e = Date.now()) {
  try {
    let n = getOauthAccountInfo()?.accountUuid,
      r = UNUSED_RESET_CACHE_SCHEMA().safeParse(getGlobalConfig().unusedLimitResetStatusCache).data;
    return (
      getEntrypointKind() === "cli" &&
      !!n &&
      r?.accountUuid === n &&
      r.holdsUnusedReset &&
      r.checkedAt <= e &&
      e - r.checkedAt < UNUSED_RESET_CACHE_TTL_MS &&
      e < r.validUntil &&
      getAuthTokenSource().source === "claude.ai" &&
      arePromoOffersAllowed()
    );
  } catch (error) {
    return (logError(toError(error)), !1);
  }
}
/**
 * 刷新"未使用的限额重置"可用性（同一时间只发起一次请求，出错记日志）。
 */
//@ chunk-zv6whf9m.js:15628-15789 placement
function refreshUnusedResetStatus(e, n) {
  let r = yz();
  return (
    (r.pendingUnusedResetRead ??= describeCedarEmberAvailability(e, n)
      .catch((i) => logError(toError(i)))
      .finally(() => {
        r.pendingUnusedResetRead = null;
      })),
    r.pendingUnusedResetRead
  );
}
/**
 * 丢弃未使用限额重置状态的缓存（内存与全局配置），并计数。
 */
//@ chunk-zv6whf9m.js:15789-15958 placement
function dropUnusedResetCache() {
  let e = yz();
  ((e.unusedResetAnsweredFor = null),
    e.unusedResetDrops++,
    saveGlobalConfig((n) =>
      n.unusedLimitResetStatusCache === void 0 ? n : { ...n, unusedLimitResetStatusCache: void 0 },
    ));
}
//@ chunk-zv6whf9m.js:15958-16705 placement
async function describeCedarEmberAvailability(e, n) {
  let r = yz(),
    i = getOauthAccountInfo()?.accountUuid;
  if (!i) return;
  let s = `${getLimitsAccountEpoch()}:${i}`;
  if (
    r.unusedResetAnsweredFor === s ||
    getEntrypointKind() !== "cli" ||
    getAuthTokenSource().source !== "claude.ai" ||
    !Qce() ||
    !arePromoOffersAllowed()
  )
    return;
  let unusedResetDrops = r.unusedResetDrops,
    f = await withDeadline(fetchCedarEmberStatus(e, { read: "cedar_ember" }), UNUSED_RESET_TIMEOUT_MS);
  if (
    getOauthAccountInfo()?.accountUuid !== i ||
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
    case void 0:
      return;
  }
  if (f.status?.ineligibleReason === "unavailable") return;
  r.unusedResetAnsweredFor = s;
  let now = Date.now(),
    b = getLatestResetGrantEnd(f.status, now);
  await saveGlobalConfig(
    (C) => ({
      ...C,
      unusedLimitResetStatusCache: {
        accountUuid: i,
        holdsUnusedReset: b !== void 0,
        checkedAt: now,
        validUntil: Math.min(now + UNUSED_RESET_CACHE_TTL_MS, b ?? 1 / 0),
      },
    }),
    n,
  );
}
//@ chunk-zv6whf9m.js:16705-16736 placement
var TENGU_WISE_BEAR_COPY = "tengu_wise_bear_copy";
//@ chunk-zv6whf9m.js:16932-17029 placement
function lyo(e) {
  return typeof e === "object" && e !== null && Reflect.get(e, "only_if_unused_reset") === !0;
}
//@ chunk-zv6whf9m.js:17029-17266 placement
function readOfferNote(e, n, r, i) {
  if (typeof e !== "object" || e === null) return;
  if (lyo(e) && i !== !0) return;
  let s = Reflect.get(e, `note_${n}`);
  if (typeof s !== "string") return;
  let d = r(s);
  return d && !(d.endsWith("\u2026") && !s.trimEnd().endsWith("\u2026")) ? d : void 0;
}

export {
  nyo,
  s9,
  markOfferRedeemed,
  logCreditOfferShown,
  nPs,
  rPs,
  i9,
  readOfferNote,
  TENGU_WISE_BEAR_COPY,
  Jre,
  getOfferHint,
  CWe,
  getOfferMenuSuffix,
  getCreditOfferForRateLimit,
  retryOfferPrompt,
  holdsUnusedReset,
  refreshUnusedResetStatus,
  WHt,
  XAr,
  yz,
  getLatestResetGrantEnd,
  lyo,
  GHt,
  fetchCedarEmberStatus,
  claimCedarEmberGrant,
  dropUnusedResetCache,
  oPs,
  getOfferBanner,
};
