/**
 * services/rateLimit/rateLimitWall.ts
 *
 * 2.1.316 新增：达到上限时领取重置并刷新限额；未达上限时提前领取重置等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fm6h4dv7.js (90)
 * attribution: placement 90
 */
import { randomUUID } from "crypto";
import {
  WHt,
  XAr,
  yz,
  getLatestResetGrantEnd,
  lyo,
  TENGU_WISE_BEAR_COPY,
  GHt,
  fetchCedarEmberStatus,
  s9,
  claimCedarEmberGrant,
  dropUnusedResetCache,
} from "../usageCreditOffers.js";
import {
  Zn,
  Qn,
  Ft,
  getLimitResetKind,
  ue,
  rankResetKindForLimit,
  ee,
  formatResetKindName,
  formatResetCount,
  Kt,
  formatResetAppliedText,
  captureWallResetIdentity,
  isSameWallReset,
  Vn,
  nt,
  Bt,
} from "../../components/rateLimit/quotaAutoResume.js";
import { hin, JTe, Qce, enqueueAutoContinuation, WQe } from "../rateLimitContinuation.js";
import { dD, endLowPriority } from "../lowPriority/lowPriorityMode.js";
import {
  isCedarEmberEnabled,
  getCedarEmberCopy,
  formatLimitResetTemplate,
  Stt,
  LIMIT_RESET,
  X3s,
  isLimitResetEnabled,
} from "../../commands/limit-reset/index.js";
import {
  getRateLimitDisplayName,
  getLimitsAccountEpoch,
  getCurrentLimits,
  forgetHeldWindows,
  probeQuotaStatusAtStart,
  lastLimitsObservationAt,
  emitLimitsStatusChange,
} from "../claudeAiLimits.js";
import { getWeeklyModelLimitName } from "../rateLimitMessages.js";
import { stripSuffix } from "../../utils/stringUtils.js";
import { xk } from "../../utils/format.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  isQuotaAutoResumeArmed,
  cancelQuotaAutoResume,
  C7e,
  isConversationResetSwitch,
} from "../quotaAutoResume/quotaAutoResume.js";
import { withDeadline } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { toError, isExpectedApiError } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, fromEnumArr } from "../analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { RainbowText } from "../../components/tasks/RemoteSessionProgress.js";
import { isAutoResumableLimit } from "../api/errors.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { onSessionSwitch, getRootSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, U, M, o, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasProfileScope, getOauthAccountInfo } from "../../utils/auth.js";
import { fetchUtilization, kVe, isAuthRejectedUsageError } from "../api/usage.js";
import { withOAuth401Retry } from "../../utils/http.js";
import { apiClient } from "../routines/routinesApi.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-fm6h4dv7.js:10953-10984 placement
function H() {
  return Date.now();
}
/**
 * 是否需要重新查询重置资格。
 */
//@ chunk-fm6h4dv7.js:10984-11306 placement
function shouldRecheckResetStatus(i, s, d, m) {
  if (i.final) return !1;
  let b = m - i.answeredAtMs,
    _ = (A) => b < 0 || b >= A;
  if (Yt(s, m) !== void 0) return !1;
  let h = WHt(i.status?.cooldownUntil ?? null),
    C = b < 0 || (b >= Zn && (h === void 0 || m >= Math.min(h, i.answeredAtMs + 150000)));
  switch (d) {
    case "wall":
      return _(Qn);
    case "command":
      return C;
    case "dialog":
      return C && (i.status === null || hasPendingGrants(s));
  }
}
/**
 * 按种类汇总可用的限额重置授权。
 */
//@ chunk-fm6h4dv7.js:11306-11705 placement
function groupResetGrants(i, s, d) {
  let m = new Map();
  for (let grant of i.grants) {
    if (!Ft(grant)) continue;
    let _ = getLimitResetKind(grant),
      h = m.get(_) ?? { kind: _, grants: [], resetsLeft: 0, target: void 0 };
    (m.set(_, h), h.grants.push(grant), (h.resetsLeft += grant.resetsLeft));
    let C = WHt(grant.endsAt) ?? null;
    if (
      h.target === void 0 &&
      grant.usableNow &&
      (C === null || C > d) &&
      (s === null || (ue(grant, s) && !isGrantUsable(grant, i)))
    )
      h.target = { grant: grant, endsAtMs: C };
  }
  return [...m.values()].sort((b, _) => rankResetKindForLimit(b.kind, s) - rankResetKindForLimit(_.kind, s));
}
/**
 * 当前达到上限时可用的重置提议。
 */
//@ chunk-fm6h4dv7.js:11705-12155 placement
function availableResetOffers(i, s = Date.now()) {
  let d = ee(i);
  if (
    !hin(i) ||
    d === void 0 ||
    d === null ||
    i.rateLimitType === void 0 ||
    i.resetsAt === void 0 ||
    i.resetsAt * 1000 <= s ||
    dD() ||
    !isCedarEmberEnabled()
  )
    return [];
  let rateLimitType = i.rateLimitType,
    b = Ie(d),
    _ = [];
  for (let h of groupResetGrants(d, rateLimitType, s))
    if (h.target !== void 0)
      _.push({
        origin: "wall",
        kind: h.kind,
        grant: h.target.grant,
        resetsLeft: Math.max(1, h.resetsLeft),
        totalResetsLeft: Math.max(1, b),
        weeklyResetsAt: d.weeklyResetsAt,
        endsAtMs: h.target.endsAtMs,
        rateLimitType: rateLimitType,
      });
  return _;
}
//@ chunk-fm6h4dv7.js:12155-12202 placement
function Yt(i, s = Date.now()) {
  return availableResetOffers(i, s)[0];
}
/**
 * 当前限额下不能使用的重置及原因。
 */
//@ chunk-fm6h4dv7.js:12202-12332 placement
function unusableResetsFor(i, s = Date.now()) {
  let d = ee(i);
  if (d === void 0 || d === null || i.rateLimitType === void 0) return [];
  return unusableResetOffers(d, i.rateLimitType, s);
}
/**
 * 不能用于当前限额的重置及原因。
 */
//@ chunk-fm6h4dv7.js:12332-12673 placement
function unusableResetOffers(i, s, d) {
  let m = [];
  for (let b of groupResetGrants(i, s, d)) {
    let _ = b.grants[0];
    if (b.target !== void 0 || b.resetsLeft === 0 || !_) continue;
    let h =
        s !== null && !b.grants.some((grant) => ue(grant, s))
          ? `doesn't refill your ${Oe(s)}`
          : describeResetUnavailable(_, i),
      C = formatResetKindName(b.kind);
    m.push({
      kind: b.kind,
      resetsLeft: b.resetsLeft,
      reason: h,
      text: `${C.charAt(0).toUpperCase()}${C.slice(1)} \xB7 ${h}`,
    });
  }
  return m;
}
/**
 * 重置不可用的原因码。
 */
//@ chunk-fm6h4dv7.js:12673-13325 placement
function resetUnavailableReason(i, s) {
  if (i.unavailableReason !== null) return i.unavailableReason;
  if (s.cooldownUntil !== null) return "cooldown";
  for (let d of i.blocking)
    switch (d) {
      case "five_hour":
        return "blocked_five_hour";
      case "seven_day":
        return "blocked_seven_day";
      case "seven_day_opus":
        return "blocked_opus";
      case "seven_day_sonnet":
        return "blocked_sonnet";
      case "seven_day_overage_included":
      case "seven_day_cowork":
      case "seven_day_omelette":
      case "seven_day_oauth_apps":
        break;
    }
  if (i.blocking.length > 0) return "blocked_other";
  if (s.atLimit && !s.exhausted.some((d) => i.clears.includes(d) || (d === "seven_day" && i.givesBackWeekly)))
    return "cannot_clear";
  return i.useRequiresLimit ? "needs_limit" : "unavailable";
}
/**
 * 重置不可用原因的说明。
 */
//@ chunk-fm6h4dv7.js:13325-14034 placement
function describeResetUnavailable(i, s) {
  switch (resetUnavailableReason(i, s)) {
    case "cooldown":
      return "try again in a minute";
    case "blocked_five_hour":
      return `can't be used while you're at your ${getRateLimitDisplayName("five_hour")}`;
    case "blocked_seven_day":
      return i.givesBackWeekly
        ? _n
        : `can't be used while you're at your ${getRateLimitDisplayName("seven_day")}`;
    case "blocked_opus":
      return `can't be used while you're at your ${getRateLimitDisplayName("seven_day_opus")}`;
    case "blocked_sonnet":
      return `can't be used while you're at your ${getWeeklyModelLimitName()}`;
    case "blocked_other":
      return "can't be used while you're at another limit it doesn't refill";
    case "cannot_clear":
      return "doesn't refill the limit you've reached";
    case "needs_limit":
      return "usable once you reach a limit it refills";
    case "unavailable":
      return "can't be used right now";
  }
}
/**
 * 重置提议的标签文本（Fable 在周限额墙时附加后缀）。
 */
//@ chunk-fm6h4dv7.js:14034-14195 placement
function resetOfferLabel(i) {
  let s = getCedarEmberCopy(),
    d = formatLimitResetTemplate(s.label, resetOfferFields(i));
  return i.kind === "fable" && i.origin === "wall" && i.rateLimitType === "seven_day"
    ? `${d} \xB7 ${s.fableAtWeeklySuffix}`
    : d;
}
//@ chunk-fm6h4dv7.js:14195-14258 placement
function Ie(i) {
  return i.grants.reduce((s, d) => s + d.resetsLeft, 0);
}
/**
 * 重置额度可直接使用：不要求先触达限额，且清除的限额都未耗尽。
 */
//@ chunk-fm6h4dv7.js:14258-14383 placement
function isGrantUsable(i, s) {
  return (
    !i.useRequiresLimit &&
    !s.exhausted.some((d) => i.clears.includes(d) || (d === "seven_day" && i.givesBackWeekly))
  );
}
/**
 * 重置相关的用量标识。
 */
//@ chunk-fm6h4dv7.js:14383-14855 placement
function resetUsageBadge(i, s) {
  if (!isGrantUsable(i, s)) return null;
  let d = null;
  for (let b of XAr) {
    let _ = i.percentUsed[b];
    if (i.clears.includes(b) && _ !== void 0 && (d === null || _ > d.percentUsed))
      d = { claimType: b, percentUsed: _ };
  }
  if (d === null) return { kind: "unnumbered", percentUsedMax: null };
  let m = limitDisplayName(d.claimType);
  if (m === null || d.percentUsed >= 100) return { kind: "unnumbered", percentUsedMax: d.percentUsed };
  return {
    kind: "numbered",
    percentLeft: 100 - d.percentUsed,
    claimType: d.claimType,
    limitName: m,
    percentUsedMax: d.percentUsed,
  };
}
//@ chunk-fm6h4dv7.js:14855-14913 placement
function Oe(i) {
  return i === "seven_day_sonnet" ? getWeeklyModelLimitName() : getRateLimitDisplayName(i);
}
/**
 * 可重置限额类型的显示名（cowork/omelette/oauth 应用类型返回 null）。
 */
//@ chunk-fm6h4dv7.js:14913-15148 placement
function limitDisplayName(i) {
  switch (i) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
    case "seven_day_overage_included":
    case "seven_day_sonnet":
      return Oe(i);
    case "seven_day_cowork":
    case "seven_day_omelette":
    case "seven_day_oauth_apps":
      return null;
  }
}
/**
 * 未到墙时提前使用重置的说明行（有编号/无编号）。
 */
//@ chunk-fm6h4dv7.js:15148-15347 placement
function earlyUseLine(i) {
  if (i.origin === "wall" || i.earlyUse === null) return;
  let s = getCedarEmberCopy();
  switch (i.earlyUse.kind) {
    case "numbered":
      return formatLimitResetTemplate(s.earlyLine, resetOfferFields(i));
    case "unnumbered":
      return formatLimitResetTemplate(s.earlyNoNumberLine, resetOfferFields(i));
  }
}
/**
 * 是否正在领取重置。
 */
//@ chunk-fm6h4dv7.js:15347-15460 placement
function isClaimingReset() {
  let i = yz();
  return (
    i.claiming ||
    (i.unsettledClaimGrantId !== null && i.unsettledClaimEpoch === getLimitsAccountEpoch() && rn(i))
  );
}
//@ chunk-fm6h4dv7.js:15460-15513 placement
function Ltn(i, s = Date.now()) {
  return Yt(i, s) !== void 0;
}
/**
 * 重置用完时的说明行。
 */
//@ chunk-fm6h4dv7.js:15513-15761 placement
function resetsUsedUpLine(i, s = Date.now()) {
  let d = ee(i);
  if (
    !hin(i) ||
    d === void 0 ||
    d === null ||
    !d.eligible ||
    d.grants.length === 0 ||
    d.grants.some((grant) => grant.resetsLeft > 0 || grant.usableNow) ||
    i.resetsAt === void 0 ||
    i.resetsAt * 1000 <= s ||
    !isCedarEmberEnabled()
  )
    return;
  return formatLimitResetTemplate(getCedarEmberCopy().spentLine, { left: 0 });
}
//@ chunk-fm6h4dv7.js:15761-15819 placement
function Xxs(i, s = Date.now()) {
  return getLatestResetGrantEnd(ee(i), s) !== void 0;
}
/**
 * 有资格、当前无可用额度但仍有剩余重置次数。
 */
//@ chunk-fm6h4dv7.js:15819-15956 placement
function hasPendingGrants(i) {
  let s = ee(i);
  return (
    s !== void 0 &&
    s !== null &&
    s.eligible &&
    !s.grants.some((grant) => grant.usableNow) &&
    s.grants.some((grant) => grant.resetsLeft > 0)
  );
}
/**
 * 重置提议的显示字段。
 */
//@ chunk-fm6h4dv7.js:15956-16296 placement
function resetOfferFields(i) {
  return {
    kind: formatResetKindName(i.kind),
    left: i.resetsLeft,
    kindResets: formatResetCount(i.kind, i.resetsLeft),
    date: Qt(i.grant.endsAt),
    deadline: Ae(i.grant.endsAt),
    week: Ae(i.weeklyResetsAt),
    limits: resetClearsLimits(i.grant),
    returns: Kt(i.kind),
    done: formatResetAppliedText(i.kind),
    ...(i.origin === "anytime" &&
      i.earlyUse?.kind === "numbered" && { percent: i.earlyUse.percentLeft, limit: i.earlyUse.limitName }),
  };
}
/**
 * 重置能清除哪些限额。
 */
//@ chunk-fm6h4dv7.js:16296-16859 placement
function resetClearsLimits(i) {
  let s = new Set();
  if (i.givesBackWeekly) s.add("Fable");
  for (let clear of i.clears)
    switch (clear) {
      case "five_hour":
        s.add("5-hour");
        break;
      case "seven_day":
        s.add("weekly");
        break;
      case "seven_day_overage_included":
        s.add(i.givesBackWeekly ? "Fable" : "weekly");
        break;
      case "seven_day_opus":
        s.add(stripSuffix(getRateLimitDisplayName(clear), " limit"));
        break;
      case "seven_day_sonnet":
        s.add(stripSuffix(getWeeklyModelLimitName(), " limit"));
        break;
      case "seven_day_cowork":
      case "seven_day_omelette":
      case "seven_day_oauth_apps":
        break;
    }
  let d = [...s],
    m = d.pop();
  if (m === void 0) return "limits";
  return d.length === 0 ? `${m} limit` : `${d.join(", ")} and ${m} limits`;
}
//@ chunk-fm6h4dv7.js:16859-16944 placement
function Qt(i) {
  let s = WHt(i);
  return s === void 0 ? void 0 : xk(Math.floor(s / 1000), !1, !1, !0);
}
//@ chunk-fm6h4dv7.js:16944-17029 placement
function Ae(i) {
  let s = WHt(i);
  return s === void 0 ? void 0 : xk(Math.floor(s / 1000), !1, !0, !0);
}
//@ chunk-fm6h4dv7.js:17029-17074 placement
function en() {
  return isCedarEmberEnabled() || lyo(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null));
}
//@ chunk-fm6h4dv7.js:17074-17136 placement
function Jxs(i, s) {
  if (!en() || !hin(i)) return;
  askResetAtWall(i, s, "cli_menu");
}
/**
 * 周限额（含超额）触墙时询问可用的重置。
 */
//@ chunk-fm6h4dv7.js:17136-17268 placement
function offerCreditsResetAtWall(i) {
  let s = getCurrentLimits();
  if (!isCedarEmberEnabled() || s.rateLimitType !== "seven_day_overage_included" || !hin(s)) return;
  askResetAtWall(s, i, "cli_credits_required");
}
/**
 * 在限额墙询问重置状态（订阅会话切换、清理过期的未结算领取）。
 */
//@ chunk-fm6h4dv7.js:17268-17400 placement
function askResetAtWall(i, s, d) {
  let m = yz();
  if (
    (subscribeWallReset(m),
    (m.continuableWallResetsAt = i.resetsAt ?? null),
    m.unsettledClaimEpoch !== getLimitsAccountEpoch())
  )
    clearUnsettledClaim(m);
  askResetStatus(i, s, "wall", d);
}
/**
 * 查询重置资格（按阶段去重）。
 */
//@ chunk-fm6h4dv7.js:17400-18383 placement
function askResetStatus(i, s, d, m) {
  if (d === "wall" ? !en() : !isCedarEmberEnabled()) return Promise.resolve();
  let b = captureWallResetIdentity(i);
  if (b === null) return Promise.resolve();
  let _ = yz();
  if (m !== void 0) _.wallSurface = { wall: b, surface: m };
  let state = _.state,
    C = 0,
    A = null;
  if (state.phase !== "idle" && isSameWallReset(state.wall, i))
    switch (state.phase) {
      case "answered":
        if (!shouldRecheckResetStatus(state, i, d, H())) return Promise.resolve();
        A = state;
        break;
      case "asking":
        return _.pendingAsk ?? Promise.resolve();
      case "failed":
        if (d === "wall" && state.failures >= Vn) return Promise.resolve();
        C = state.failures;
    }
  GHt({ phase: "asking", wall: b });
  let k = isQuotaAutoResumeArmed(),
    T =
      m ??
      (_.wallSurface !== null && isSameWallReset(_.wallSurface.wall, i) ? _.wallSurface.surface : "cli_menu"),
    x = withDeadline(fetchCedarEmberStatus(s, { surface: T }), nt)
      .then((L) => {
        if (
          (settleResetStatus({
            wall: b,
            failures: C,
            previous: A,
            result: L ?? { kind: "failed" },
            autoArmed: k,
          }),
          L !== void 0 && L.kind === "answered" && L.status?.ineligibleReason !== "unavailable")
        )
          settleUnsettledClaim(_, L.status, s);
      })
      .catch((L) => {
        logError(toError(L));
        try {
          settleResetStatus({ wall: b, failures: C, previous: A, result: { kind: "failed" }, autoArmed: k });
        } catch (error) {
          logError(toError(error));
        }
      })
      .finally(() => {
        if (_.pendingAsk === x) _.pendingAsk = null;
      });
  return ((_.pendingAsk = x), x);
}
/**
 * 处理重置资格查询结果。
 */
//@ chunk-fm6h4dv7.js:18383-20100 placement
function settleResetStatus({
  wall: wall,
  failures: failures,
  previous: previous,
  result: m,
  autoArmed: autoArmed,
}) {
  let _ = s9();
  if (
    _.phase !== "asking" ||
    _.wall.rateLimitType !== wall.rateLimitType ||
    _.wall.wallResetsAt !== wall.wallResetsAt ||
    _.wall.accountEpoch !== wall.accountEpoch
  )
    return;
  let h = m.kind === "answered" ? m.status : null,
    C = m.kind === "failed" || h?.ineligibleReason === "unavailable";
  if (C && previous !== null) GHt({ ...previous, answeredAtMs: H() });
  else if (C) GHt({ phase: "failed", wall: wall, failures: failures + 1 });
  else {
    let I = m.kind === "no_profile_scope" || m.kind === "not_authorized";
    GHt(
      I
        ? { phase: "answered", wall: wall, status: h, answeredAtMs: H(), final: I }
        : { phase: "answered", wall: wall, status: h, answeredAtMs: H() },
    );
  }
  if (!isCedarEmberEnabled()) return;
  let A = Stt();
  if (
    (logEvent("tengu_cedar_ember_asked", {
      outcome: fromEnum(sn(m)),
      at_wall: !0,
      attempt: failures + 1,
      eligible: h?.eligible ?? !1,
      ineligible_reason: fromEnumOpt(h?.ineligibleReason),
      limit_type: fromEnum(wall.rateLimitType),
      config_version: A,
    }),
    C || h === null || !h.eligible)
  )
    return;
  let k = yz(),
    T = `${wall.accountEpoch}:${wall.rateLimitType}:${wall.wallResetsAt}:${h.eligible}:${h.nextGrantId}`;
  if (k.wallRecordKey === T) return;
  k.wallRecordKey = T;
  let filtered = groupResetGrants(h, wall.rateLimitType, H()).filter((I) => I.target !== void 0),
    L = filtered[0]?.target?.grant;
  logEvent("tengu_cedar_ember_wall", {
    eligible: h.eligible,
    at_limit: h.atLimit,
    usable: L !== void 0,
    grant_id: ye(L?.id ?? h.nextGrantId),
    kind: fromEnumOpt(L && getLimitResetKind(L)),
    kinds_offered: fromEnumArr(filtered.map((I) => I.kind)),
    resets_left: L?.resetsLeft ?? 0,
    resets_left_total: Ie(h),
    grants: h.grants.length,
    limit_type: fromEnum(wall.rateLimitType),
    limit_types: fromEnumArr(h.exhausted),
    tier: fromEnum(JTe()),
    auto_armed: autoArmed,
    low_priority_active: dD(),
    config_version: A,
    surface: fromEnumOpt(h.eventProps?.surface),
    server_tier: fromEnumOpt(h.eventProps?.tier),
    tenure_bucket: fromEnumOpt(h.eventProps?.tenureBucket),
    billing_path: fromEnumOpt(h.eventProps?.billingPath),
    billing_period: fromEnumOpt(h.eventProps?.billingPeriod),
    extra_usage_state: fromEnumOpt(h.eventProps?.extraUsageState),
  });
}
/**
 * 核对未结算的重置领取：账号变化或额度已不可用时清除。
 */
//@ chunk-fm6h4dv7.js:20100-20310 placement
function settleUnsettledClaim(i, s, d) {
  if (i.unsettledClaimGrantId === null) return;
  if (i.unsettledClaimEpoch !== getLimitsAccountEpoch()) {
    clearUnsettledClaim(i);
    return;
  }
  if (s?.grants.some((m) => m.id === i.unsettledClaimGrantId && m.usableNow)) return;
  if ((K(d), s !== null && !Ue(s))) clearUnsettledClaim(i);
}
//@ chunk-fm6h4dv7.js:20310-20324 placement
var sr = 600000;
//@ chunk-fm6h4dv7.js:20324-20403 placement
function rn(i) {
  return i.unsettledClaimAtMs !== null && H() - i.unsettledClaimAtMs < sr;
}
//@ chunk-fm6h4dv7.js:20403-20485 placement
function sn(i) {
  return i.kind === "answered" ? (i.status === null ? "absent" : "block") : i.kind;
}
//@ chunk-fm6h4dv7.js:20485-20574 placement
function st(i, s) {
  return i.unsettledClaimGrantId === s && i.unsettledClaimEpoch === getLimitsAccountEpoch() && rn(i);
}
/**
 * 清空未结算的重置领取记录。
 */
//@ chunk-fm6h4dv7.js:20574-20701 placement
function clearUnsettledClaim(i) {
  ((i.unsettledClaimGrantId = null),
    (i.unsettledClaimRequestId = null),
    (i.unsettledClaimEpoch = null),
    (i.unsettledClaimAtMs = null));
}
/**
 * 记录一次未结算的重置领取（额度 id、请求 id、账号代数、时间）。
 */
//@ chunk-fm6h4dv7.js:20701-20858 placement
function recordUnsettledClaim(i, s, d, m) {
  if (i.unsettledClaimRequestId !== d) i.unsettledClaimAtMs = H();
  ((i.unsettledClaimGrantId = s), (i.unsettledClaimRequestId = d), (i.unsettledClaimEpoch = m));
}
//@ chunk-fm6h4dv7.js:20858-20955 placement
function un(i, s) {
  return st(i, s) && i.unsettledClaimRequestId !== null ? i.unsettledClaimRequestId : randomUUID();
}
/**
 * 首次显示重置提议时上报。
 */
//@ chunk-fm6h4dv7.js:20955-21404 placement
function reportResetOfferShown(i, s) {
  let d = availableResetOffers(i),
    [m] = d;
  if (m === void 0 || i.resetsAt === void 0) return;
  let b = `${m.rateLimitType}:${i.resetsAt}:${d.map((h) => h.grant.id).join(",")}`,
    _ = yz();
  if (_.shownOfferKey === b) return;
  ((_.shownOfferKey = b),
    logEvent("tengu_cedar_ember_shown", {
      surface: fromEnum(s),
      grant_id: ye(m.grant.id),
      kind: fromEnum(m.kind),
      kinds_offered: fromEnumArr(d.map((h) => h.kind)),
      resets_left: m.grant.resetsLeft,
      resets_left_total: m.totalResetsLeft,
      limit_type: fromEnum(m.rateLimitType),
      config_version: Stt(),
    }));
}
/**
 * 对话框打开时需要时重新查询重置状态。
 */
//@ chunk-fm6h4dv7.js:21404-21516 placement
function refreshResetStatusForDialog(i, s) {
  let d = s9();
  if (
    RainbowText(i) ||
    (d.phase === "answered" && isSameWallReset(d.wall, i) && shouldRecheckResetStatus(d, i, "dialog", H()))
  )
    askResetStatus(i, s, "dialog");
}
/**
 * 执行重置流程，异常时返回 unavailable。
 */
//@ chunk-fm6h4dv7.js:21516-21650 placement
async function startResetFlowSafe(i, s, d) {
  try {
    return await startResetFlow(i, s, d);
  } catch (error) {
    return (
      logError(toError(error)),
      { kind: "answer", result: { outcome: "unavailable", text: RESET_STATUS_MESSAGES } }
    );
  }
}
/**
 * 查询重置状态；之前有进行中的查询且仍需刷新时再查一次。
 */
//@ chunk-fm6h4dv7.js:21650-21753 placement
async function askResetStatusTwice(i, s) {
  let m = yz().pendingAsk !== null;
  if ((await askResetStatus(getCurrentLimits(), s, i), m && RainbowText(getCurrentLimits())))
    await askResetStatus(getCurrentLimits(), s, i);
}
/**
 * /reset 流程入口：检查是否可用并给出提议。
 */
//@ chunk-fm6h4dv7.js:21753-22153 placement
async function startResetFlow(i, s, d) {
  if (yz().claiming) return { kind: "answer", result: { outcome: "unavailable", text: An } };
  if (getCurrentLimits().status !== "rejected" && Qce() && isCedarEmberEnabled()) {
    if (dD()) return { kind: "answer", result: { outcome: "not_offered", text: hr } };
    return checkResetEligibility(i, s, d);
  }
  await askResetStatusTwice(i, s);
  let b = getCurrentLimits(),
    _ = availableResetOffers(b);
  if (_.length === 0) {
    let h = ee(b);
    if (h !== void 0 && h !== null && (Ue(h) || hasUsableGrantFor(h, b))) K(s);
    return { kind: "answer", result: resetNotOfferedResult(b) };
  }
  return chooseResetOffer(i, _, unusableResetsFor(b), d);
}
/**
 * 选择或确认重置提议。
 */
//@ chunk-fm6h4dv7.js:22153-22669 placement
function chooseResetOffer(i, s, d, m) {
  let [b, ..._] = s,
    h = m !== void 0 ? s.find((k) => k.kind === m) : b !== void 0 && _.length === 0 ? b : void 0;
  if (h !== void 0) return (reportResetSelected(i, h), { kind: "confirm", offer: h });
  if (m === void 0) return { kind: "choose", offers: s, unusable: d };
  let found = d.find((k) => k.kind === m);
  return {
    kind: "answer",
    result: {
      outcome: "not_offered",
      text: `${found === void 0 ? formatLimitResetTemplate(getCedarEmberCopy().noKindLine, { kind: formatResetKindName(m) }) : found.reason.startsWith("can't be used") ? `Your ${formatResetKindName(m)} ${found.reason}` : `Your ${formatResetKindName(m)} can't be used right now \xB7 ${found.reason}`} \xB7 you can use ${formatResetChoices(s.map((k) => k.kind))}`,
    },
  };
}
/**
 * 把可选重置列为 “a X, a Y or a Z”。
 */
//@ chunk-fm6h4dv7.js:22669-22798 placement
function formatResetChoices(i) {
  let mapped = i.map((m) => `a ${formatResetKindName(m)}`),
    d = mapped.pop();
  return d === void 0 ? "nothing here" : mapped.length === 0 ? d : `${mapped.join(", ")} or ${d}`;
}
/**
 * 上报选择的重置。
 */
//@ chunk-fm6h4dv7.js:22798-23114 placement
function reportResetSelected(i, s) {
  logEvent("tengu_cedar_ember_selected", {
    entry: fromEnum(i),
    grant_id: ye(s.grant.id),
    kind: fromEnum(s.kind),
    resets_left: s.grant.resetsLeft,
    resets_left_total: s.totalResetsLeft,
    limit_type: fromEnumOpt(s.origin === "wall" ? s.rateLimitType : void 0),
    at_limit: s.origin === "wall" || s.atLimit,
    early_use: ke(s),
    auto_armed: isQuotaAutoResumeArmed(),
    config_version: Stt(),
  });
}
/**
 * 向服务端查询重置资格并上报。
 */
//@ chunk-fm6h4dv7.js:23114-23825 placement
async function checkResetEligibility(i, s, d) {
  let m = yz(),
    b = await withDeadline(fetchCedarEmberStatus(s, { read: "cedar_ember" }), nt),
    _ = b?.kind === "answered" ? b.status : null,
    h = b === void 0 || b.kind === "failed" || _?.ineligibleReason === "unavailable";
  if (
    (logEvent("tengu_cedar_ember_asked", {
      outcome: fromEnum(sn(b ?? { kind: "failed" })),
      at_wall: !1,
      asker: fromEnum(i),
      eligible: _?.eligible ?? !1,
      ineligible_reason: fromEnumOpt(_?.ineligibleReason),
      at_limit: _?.atLimit ?? !1,
      grants: _?.grants.length ?? 0,
      grant_id: ye(_?.nextGrantId ?? null),
      config_version: Stt(),
    }),
    h)
  )
    return {
      kind: "answer",
      result: {
        outcome: "unavailable",
        text: isClaimingReset()
          ? formatLimitResetTemplate(getCedarEmberCopy().unconfirmedAnytimeLine, {})
          : RESET_STATUS_MESSAGES,
      },
    };
  if ((settleUnsettledClaim(m, _, s), _ === null)) return { kind: "answer", result: describeResetState(_) };
  let C = H(),
    A = anytimeResetOffers(_, C);
  if (A.length === 0) return { kind: "answer", result: describeResetState(_) };
  return chooseResetOffer(i, A, unusableResetOffers(_, null, C), d);
}
/**
 * 非上限时可用的重置提议。
 */
//@ chunk-fm6h4dv7.js:23825-24148 placement
function anytimeResetOffers(i, s) {
  let d = Ie(i),
    m = [];
  for (let b of groupResetGrants(i, null, s))
    if (b.target !== void 0)
      m.push({
        origin: "anytime",
        kind: b.kind,
        grant: b.target.grant,
        resetsLeft: Math.max(1, b.resetsLeft),
        totalResetsLeft: Math.max(1, d),
        weeklyResetsAt: i.weeklyResetsAt,
        endsAtMs: b.target.endsAtMs,
        earlyUse: resetUsageBadge(b.target.grant, i),
        atLimit: i.atLimit,
      });
  return m;
}
/**
 * 重置状态说明（无可用、未在上限等）。
 */
//@ chunk-fm6h4dv7.js:24148-24740 placement
function describeResetState(i) {
  if (i === null || !i.eligible || i.grants.length === 0)
    return { outcome: "not_offered", text: `${RESET_MESSAGES} \xB7 ${bn}` };
  let filtered = i.grants.filter((grant) => grant.resetsLeft > 0),
    d = { left: Ie(i), date: Qt(filtered[0]?.endsAt ?? null) };
  if (filtered.length === 0)
    return { outcome: "spent", text: formatLimitResetTemplate(getCedarEmberCopy().spentLine, d) };
  let m =
      filtered
        .flatMap((_) => _.blocking)
        .map(limitDisplayName)
        .find((_) => _ !== null) ?? null,
    b =
      m !== null
        ? gn(m)
        : filtered.every((_) => _.paused)
          ? `${Ze} \xB7 it is paused`
          : Ue(i)
            ? `${Ze} \xB7 try again in a minute`
            : filtered.every((_) => _.useRequiresLimit)
              ? yr
              : `${Ze} \xB7 try again later`;
  return {
    outcome: "not_offered",
    text: formatLimitResetTemplate(`${b} \xB7 {resets} left \xB7 use by {date}`, d),
  };
}
/**
 * 不提供重置时的结果（已用完、状态未知、当前额度足够或其他原因）。
 */
//@ chunk-fm6h4dv7.js:24740-25025 placement
function resetNotOfferedResult(i) {
  let s = resetsUsedUpLine(i);
  if (s !== void 0) return { outcome: "spent", text: s };
  if (RainbowText(i))
    return {
      outcome: "unavailable",
      text: isClaimingReset()
        ? formatLimitResetTemplate(getCedarEmberCopy().unconfirmedLine, {})
        : RESET_STATUS_MESSAGES,
    };
  let d = ee(i);
  if (d !== void 0 && d !== null && hasUsableGrantFor(d, i)) return { outcome: "not_offered", text: _r };
  return { outcome: "not_offered", text: withLimitResetTime(resetStatusLine(i), i) };
}
/**
 * 是否有可直接用于当前限额的重置额度。
 */
//@ chunk-fm6h4dv7.js:25025-25166 placement
function hasUsableGrantFor(i, s) {
  let rateLimitType = s.rateLimitType;
  return (
    rateLimitType !== void 0 &&
    !i.exhausted.some((m) => m === rateLimitType) &&
    i.grants.some((grant) => grant.usableNow && !grant.paused && ue(grant, rateLimitType))
  );
}
//@ chunk-fm6h4dv7.js:25166-25233 placement
function Ue(i) {
  let s = WHt(i.cooldownUntil);
  return s !== void 0 && s > H();
}
/**
 * 当前限额下的重置状态行。
 */
//@ chunk-fm6h4dv7.js:25233-25832 placement
function resetStatusLine(i) {
  let s = ee(i);
  if (s === void 0 || s === null || i.rateLimitType === void 0) return RESET_MESSAGES;
  let rateLimitType = i.rateLimitType,
    filtered = s.grants.filter((grant) => grant.resetsLeft > 0);
  if (filtered.length === 0) return RESET_MESSAGES;
  if (!filtered.some((_) => ue(_, rateLimitType))) return `${fr} ${Oe(rateLimitType)}`;
  if (
    rateLimitType === "seven_day" &&
    filtered.every((_) => _.givesBackWeekly && _.blocking.includes("seven_day"))
  )
    return `Your Fable reset can't be used right now \xB7 ${_n}`;
  let b =
    filtered
      .filter((_) => ue(_, rateLimitType))
      .flatMap((_) => _.blocking)
      .map(limitDisplayName)
      .find((_) => _ !== null) ?? null;
  if (b !== null) return gn(b);
  if (filtered.every((_) => _.paused)) return `${Qe} \xB7 it is paused`;
  if (Ue(s)) return `${Qe} \xB7 try again in a minute`;
  return Qe;
}
/**
 * 在说明后附上限额重置时间。
 */
//@ chunk-fm6h4dv7.js:25832-25954 placement
function withLimitResetTime(i, s) {
  let d = isAutoResumableLimit(s) ? xk(s.resetsAt) : void 0;
  return d !== void 0 ? `${i} \xB7 this limit resets ${d}` : `${i} \xB7 ${bn}`;
}
/**
 * 上报用户拒绝重置。
 */
//@ chunk-fm6h4dv7.js:25954-26328 placement
function reportResetDeclined(i, s) {
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: !1,
    entry: fromEnum(i),
    grant_id: ye(s.grant.id),
    kind: fromEnum(s.kind),
    limit_type: fromEnumOpt(s.origin === "wall" ? s.rateLimitType : void 0),
    at_limit: s.origin === "wall" || s.atLimit,
    early_use: ke(s),
    percent_used_max: et(s),
    config_version: Stt(),
  });
  let d = getCedarEmberCopy();
  return {
    outcome: "kept",
    text: formatLimitResetTemplate(
      s.grant.useRequiresLimit ? d.keptLine : d.keptAnytimeLine,
      resetOfferFields(s),
    ),
  };
}
/**
 * 用户保留重置时的结果。
 */
//@ chunk-fm6h4dv7.js:26328-26781 placement
function keepResetForLater(i, s) {
  let [d, ...m] = s;
  if (d === void 0) return { outcome: "kept", text: RESET_MESSAGES };
  let reduced = m.reduce(
    (_, h) => (h.endsAtMs !== null && (_.endsAtMs === null || h.endsAtMs < _.endsAtMs) ? h : _),
    d,
  );
  return (
    logEvent("tengu_cedar_ember_confirmed", {
      confirmed: !1,
      chose_none: !0,
      entry: fromEnum(i),
      kinds_offered: fromEnumArr(s.map((_) => _.kind)),
      limit_type: fromEnumOpt(reduced.origin === "wall" ? reduced.rateLimitType : void 0),
      at_limit: reduced.origin === "wall" || reduced.atLimit,
      config_version: Stt(),
    }),
    {
      outcome: "kept",
      text: formatLimitResetTemplate(getCedarEmberCopy().keptChoiceLine, resetOfferFields(reduced)),
    }
  );
}
/**
 * 领取重置（防重入）。
 */
//@ chunk-fm6h4dv7.js:26781-27116 placement
async function claimReset(i, s, d) {
  let m = yz();
  if (m.claiming) return { outcome: "unavailable", text: An };
  m.claiming = !0;
  try {
    return d.origin === "wall" || captureWallResetIdentity(getCurrentLimits()) !== null
      ? await claimResetAtWall(i, s, d)
      : await claimResetEarly(i, s, d);
  } catch (error) {
    logError(toError(error));
    let _ = getCedarEmberCopy();
    return {
      outcome: "unavailable",
      text: formatLimitResetTemplate(d.origin === "wall" ? _.unconfirmedLine : _.unconfirmedAnytimeLine, {}),
    };
  } finally {
    m.claiming = !1;
  }
}
/**
 * 达到上限时领取重置并刷新限额。
 */
//@ chunk-fm6h4dv7.js:27116-30155 placement
async function claimResetAtWall(i, s, d) {
  let m = yz(),
    b = getCedarEmberCopy(),
    _ = Stt(),
    id = d.grant.id;
  await askResetStatusTwice(i, s);
  let C = getCurrentLimits(),
    A = captureWallResetIdentity(C),
    k = availableResetOffers(C),
    found = k.find((R) => R.kind === d.kind);
  if (
    (logEvent("tengu_cedar_ember_confirmed", {
      confirmed: !0,
      entry: fromEnum(i),
      grant_id: ye(id),
      kind: fromEnum(d.kind),
      limit_type: fromEnumOpt(C.rateLimitType),
      still_offered: found !== void 0 && found.grant.id === id,
      at_limit: !0,
      early_use: !1,
      config_version: _,
    }),
    A === null || k.length === 0)
  )
    return resetNotOfferedResult(C);
  if (found === void 0)
    return {
      outcome: "not_offered",
      text: `${formatLimitResetTemplate(br, { kind: formatResetKindName(d.kind) })} \xB7 you can use ${formatResetChoices(k.map((R) => R.kind))}`,
    };
  if (found.grant.id !== id) return { outcome: "not_offered", text: wr };
  let now = Date.now(),
    L = st(m, id),
    I = un(m, id),
    O = (await withDeadline(claimCedarEmberGrant(s, id, I), Bt)) ?? {
      result: "error",
      reason: null,
      resetsLeft: null,
      cleared: [],
      weeklyResetsAt: null,
    };
  switch (
    (logEvent("tengu_cedar_ember_result", {
      result: fromEnum(O.result),
      reason: fromEnumOpt(O.reason),
      entry: fromEnum(i),
      grant_id: ye(id),
      kind: fromEnum(found.kind),
      resets_left: O.resetsLeft ?? void 0,
      cleared: fromEnumArr(O.cleared),
      limit_type: fromEnum(A.rateLimitType),
      at_limit: !0,
      early_use: !1,
      latency_ms: Date.now() - now,
      config_version: _,
    }),
    O.result)
  ) {
    case "reset":
    case "not_limited":
    case "cooldown":
    case "already_used":
    case "ineligible":
      logFeatureOk("cedar_ember");
      break;
    case "unavailable":
    case "rate_limited":
    case "auth_error":
    case "error":
      logFeatureSad("cedar_ember", O.result);
      break;
  }
  let D = found.resetsLeft - found.grant.resetsLeft,
    Fe = O.resetsLeft ?? (O.result === "already_used" ? 0 : Math.max(0, found.grant.resetsLeft - 1)),
    G = {
      ...resetOfferFields(found),
      left: D + Fe,
      kindResets: formatResetCount(found.kind, D + Fe),
      week: Ae(O.weeklyResetsAt ?? found.weeklyResetsAt),
    };
  switch (O.result) {
    case "reset": {
      (clearUnsettledClaim(m), dropUnusedResetCache());
      let R = [A.rateLimitType, ...resettableLimitTypes(O.cleared).filter((ae) => ae !== A.rateLimitType)];
      if (!found.grant.clears.some((clear) => clear === A.rateLimitType)) {
        forgetHeldWindows(R);
        let ae = H();
        await withDeadline(
          probeQuotaStatusAtStart(s, void 0).catch((De) => {
            logError(toError(De));
          }),
          nt,
        );
        let F = lastLimitsObservationAt() > ae,
          se = getCurrentLimits(),
          _e = F && isAutoResumableLimit(se),
          $e = _e && se.rateLimitType === A.rateLimitType;
        if (
          (logEvent("tengu_cedar_ember_give_back", {
            outcome: fromEnum($e ? "binds" : _e ? "elsewhere" : F ? "lifted" : "unread"),
            entry: fromEnum(i),
            grant_id: ye(id),
            config_version: _,
          }),
          $e)
        )
          return (
            resetWallPhase(A),
            askResetStatus(se, s, i),
            {
              outcome: "reset",
              text: formatLimitResetTemplate(pr, {
                ...G,
                limit: Oe(A.rateLimitType),
                date: xk(se.resetsAt, !1, !0, !0),
              }),
            }
          );
        R = F ? [] : R;
      }
      let q = consumeContinuableWall(m, A);
      applyClaimedReset(m, A, R, i, q);
      let Ke = formatLimitResetTemplate(b.successLine, G);
      return { outcome: "reset", text: q ? Ke : Gt(Ke) };
    }
    case "not_limited": {
      clearUnsettledClaim(m);
      let R = consumeContinuableWall(m, A);
      applyClaimedReset(m, A, [A.rateLimitType], i, R);
      let q = L ? Cr : Ar;
      return { outcome: "reset", text: R ? q : Gt(q) };
    }
    case "cooldown": {
      if (!L) clearUnsettledClaim(m);
      return (K(s), { outcome: "unavailable", text: L ? En : kr });
    }
    case "already_used": {
      if (L) return (clearUnsettledClaim(m), resetWallPhase(A), K(s), { outcome: "spent", text: wn });
      if (found.totalResetsLeft - found.grant.resetsLeft > 0)
        return (
          resetWallPhase(A),
          askResetStatus(getCurrentLimits(), s, i),
          K(s),
          { outcome: "spent", text: formatLimitResetTemplate(`${Te} \xB7 ${yn}`, G) }
        );
      return (
        refreshAnsweredStatus(A, id),
        K(s),
        { outcome: "spent", text: formatLimitResetTemplate(Te, G) }
      );
    }
    case "ineligible": {
      if ((resetWallPhase(A), askResetStatus(getCurrentLimits(), s, i), L))
        return (clearUnsettledClaim(m), K(s), { outcome: "not_offered", text: tt });
      return { outcome: "not_offered", text: withLimitResetTime(hn, C) };
    }
    case "auth_error":
      return { outcome: "unavailable", text: Cn };
    case "rate_limited":
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(L ? b.unconfirmedLine : b.unavailableLine, G),
      };
    case "unavailable":
    case "error": {
      recordUnsettledClaim(m, id, I, A.accountEpoch);
      let R = resettableLimitTypes(O.cleared);
      if (R.length > 0) {
        if ((forgetHeldWindows(R), R.includes(A.rateLimitType))) K(s);
      }
      return (
        resetWallPhase(A),
        askResetStatus(getCurrentLimits(), s, i),
        {
          outcome: "unavailable",
          text: formatLimitResetTemplate(L ? b.stillUnconfirmedLine : b.unconfirmedLine, G),
        }
      );
    }
  }
}
//@ chunk-fm6h4dv7.js:30155-30240 placement
function et(i) {
  return i.origin === "anytime" ? (i.earlyUse?.percentUsedMax ?? void 0) : void 0;
}
//@ chunk-fm6h4dv7.js:30240-30302 placement
function ke(i) {
  return i.origin === "anytime" && i.earlyUse !== null;
}
/**
 * 未达上限时提前领取重置。
 */
//@ chunk-fm6h4dv7.js:30302-32325 placement
async function claimResetEarly(i, s, d) {
  let m = yz(),
    b = getCedarEmberCopy(),
    _ = Stt(),
    id = d.grant.id,
    C = getLimitsAccountEpoch();
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: !0,
    entry: fromEnum(i),
    grant_id: ye(id),
    kind: fromEnum(d.kind),
    at_limit: d.atLimit,
    early_use: ke(d),
    percent_used_max: et(d),
    config_version: _,
  });
  let now = Date.now(),
    k = st(m, id),
    T = un(m, id),
    x = (await withDeadline(claimCedarEmberGrant(s, id, T), Bt)) ?? {
      result: "error",
      reason: null,
      resetsLeft: null,
      cleared: [],
      weeklyResetsAt: null,
    };
  switch (
    (logEvent("tengu_cedar_ember_result", {
      result: fromEnum(x.result),
      reason: fromEnumOpt(x.reason),
      entry: fromEnum(i),
      grant_id: ye(id),
      kind: fromEnum(d.kind),
      resets_left: x.resetsLeft ?? void 0,
      cleared: fromEnumArr(x.cleared),
      at_limit: d.atLimit,
      early_use: ke(d),
      percent_used_max: et(d),
      latency_ms: Date.now() - now,
      config_version: _,
    }),
    x.result)
  ) {
    case "reset":
    case "not_limited":
    case "cooldown":
    case "already_used":
    case "ineligible":
      logFeatureOk("cedar_ember");
      break;
    case "unavailable":
    case "rate_limited":
    case "auth_error":
    case "error":
      logFeatureSad("cedar_ember", x.result);
      break;
  }
  let L = d.resetsLeft - d.grant.resetsLeft,
    I = x.resetsLeft ?? (x.result === "already_used" ? 0 : Math.max(0, d.grant.resetsLeft - 1)),
    O = {
      ...resetOfferFields(d),
      left: L + I,
      kindResets: formatResetCount(d.kind, L + I),
      week: Ae(x.weeklyResetsAt ?? d.weeklyResetsAt),
    };
  switch (x.result) {
    case "reset": {
      (clearUnsettledClaim(m), dropUnusedResetCache());
      let D = resettableLimitTypes(x.cleared);
      if (D.length > 0) forgetHeldWindows(D);
      return (K(s), { outcome: "reset", text: formatLimitResetTemplate(b.successLine, O) });
    }
    case "not_limited":
      if ((clearUnsettledClaim(m), k)) return (K(s), { outcome: "not_offered", text: tt });
      return { outcome: "not_offered", text: Er };
    case "cooldown":
      if (!k) clearUnsettledClaim(m);
      return (K(s), { outcome: "unavailable", text: k ? En : Lr });
    case "already_used":
      if (k) return (clearUnsettledClaim(m), K(s), { outcome: "spent", text: wn });
      return {
        outcome: "spent",
        text: formatLimitResetTemplate(
          d.totalResetsLeft - d.grant.resetsLeft > 0 ? `${Te} \xB7 ${yn}` : Te,
          O,
        ),
      };
    case "ineligible":
      if (k) return (clearUnsettledClaim(m), K(s), { outcome: "not_offered", text: tt });
      return { outcome: "not_offered", text: hn };
    case "auth_error":
      return { outcome: "unavailable", text: Cn };
    case "rate_limited":
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(k ? b.unconfirmedAnytimeLine : b.unavailableLine, O),
      };
    case "unavailable":
    case "error": {
      recordUnsettledClaim(m, id, T, C);
      let D = resettableLimitTypes(x.cleared);
      if (D.length > 0) forgetHeldWindows(D);
      if (D.length > 0 || k) K(s);
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(k ? b.stillUnconfirmedLine : b.unconfirmedAnytimeLine, O),
      };
    }
  }
}
/**
 * 重置流程的提示文本。
 */
//@ chunk-fm6h4dv7.js:32325-33122 placement
var RESET_MESSAGES = "No reset to use",
  bn = "you're not at a usage limit right now",
  Qe = "Your reset can't be used for this limit right now",
  fr = "None of your resets refill your",
  _n = "no Fable usage this week to give back",
  pr = "{Kind} used \xB7 you're still at your {limit} until {date} \xB7 {kindResets} left",
  br = "Your {kind} is no longer on offer \xB7 nothing was used",
  _r = `This limit may have lifted already \xB7 checking your limits now \xB7 run /${LIMIT_RESET} again in a moment to use your reset anyway`,
  yr = `You have a reset saved for when you reach a usage limit \xB7 run /${LIMIT_RESET} when you do`,
  Ze = "Your reset can't be used right now",
  hr = `Resets can't be used while you continue at lower priority \xB7 run /${LIMIT_RESET} after that ends`,
  Er = "Your reset only works at a usage limit, and you're not at one now \xB7 nothing was used";
//@ chunk-fm6h4dv7.js:33122-33220 placement
function gn(i) {
  return `Your reset doesn't refill your ${i}, so it can't be used until that resets`;
}
/**
 * 查询/领取重置的状态文本。
 */
//@ chunk-fm6h4dv7.js:33220-34433 placement
var RESET_STATUS_MESSAGES = "Couldn't check for a reset right now \xB7 try again in a moment",
  eJe = "Checking for a reset\u2026",
  Te = "That reset was already used \xB7 nothing changed just now \xB7 {kindResets} left",
  yn = `run /${LIMIT_RESET} again to use one`,
  hn = "This reset isn't available any more \xB7 nothing was used",
  wr = `A different reset is on offer now \xB7 nothing was used \xB7 run /${LIMIT_RESET} again to see it`,
  Ar = "Your limit had already reset on its own \xB7 nothing was used",
  Cr = "Your limits are clear",
  kr =
    "Another reset was just started on your account \xB7 checking your limits now \xB7 if you're still at the limit in a minute, try again",
  En =
    "Your earlier reset may still be going through \xB7 checking your limits now \xB7 try again in a minute if they aren't refilled",
  Lr = "Another reset was just started on your account \xB7 this one wasn't used \xB7 try again in a minute",
  wn = "Your earlier reset went through after all \xB7 checking your limits now",
  tt =
    "This reset isn't available any more \xB7 your earlier try may have gone through \xB7 checking your limits now",
  vr = "send a message to continue",
  An = "Your limits are already being reset \xB7 one moment",
  Cn = "Couldn't reset your limits with this login \xB7 run /login, then try again";
//@ chunk-fm6h4dv7.js:34433-34472 placement
function Gt(i) {
  return `${i} \xB7 ${vr}`;
}
/**
 * 取出并清除“可继续”的墙标记。
 */
//@ chunk-fm6h4dv7.js:34472-34585 placement
function consumeContinuableWall(i, s) {
  let d = X3s() && i.continuableWallResetsAt === s.wallResetsAt;
  return ((i.continuableWallResetsAt = null), d);
}
/**
 * 过滤出可重置的限额类型。
 */
//@ chunk-fm6h4dv7.js:34585-34849 placement
function resettableLimitTypes(i) {
  let s = [];
  for (let d of i)
    switch (d) {
      case "five_hour":
      case "seven_day":
      case "seven_day_overage_included":
      case "seven_day_opus":
      case "seven_day_sonnet":
        s.push(d);
        break;
      case "seven_day_cowork":
      case "seven_day_omelette":
      case "seven_day_oauth_apps":
        break;
    }
  return s;
}
/**
 * 领取重置后的收尾：取消自动续接、结束低优先级、释放限额、清空状态、发出 reset 事件（每步独立容错）。
 */
//@ chunk-fm6h4dv7.js:34849-35084 placement
function applyClaimedReset(i, s, d, m, b) {
  let _ = [
    () => cancelQuotaAutoResume("cedar_ember"),
    () => {
      endLowPriority("reset");
    },
    () => releaseClearedLimits(d),
    () => {
      (resetWallPhase(s), (i.wallRecordKey = null), (i.shownOfferKey = null));
    },
    () => {
      if (b) enqueueAutoContinuation();
    },
    () => i.events.emit({ type: "reset", entry: m }),
  ];
  for (let h of _)
    try {
      h();
    } catch (error) {
      logError(toError(error));
    }
}
/**
 * 忘记被清除的限额窗口；当前被拒的限额已清除时改为 allowed。
 */
//@ chunk-fm6h4dv7.js:35084-35285 placement
function releaseClearedLimits(i) {
  if (i.length > 0) forgetHeldWindows(i);
  let s = getCurrentLimits();
  if (s.status !== "rejected" || s.rateLimitType === void 0 || !i.includes(s.rateLimitType)) return;
  emitLimitsStatusChange({ ...s, status: "allowed", rateLimitType: void 0, resetsAt: void 0 });
}
//@ chunk-fm6h4dv7.js:35285-35357 placement
function K(i) {
  if (isQuotaAutoResumeArmed()) {
    C7e();
    return;
  }
  probeQuotaStatusAtStart(i, void 0).catch((s) => {
    logError(toError(s));
  });
}
/**
 * 当前墙已处理时把重置状态置为 idle。
 */
//@ chunk-fm6h4dv7.js:35357-35501 placement
function resetWallPhase(i) {
  let s = s9();
  if (
    s.phase !== "idle" &&
    s.wall.wallResetsAt === i.wallResetsAt &&
    s.wall.rateLimitType === i.rateLimitType
  )
    GHt({ phase: "idle" });
}
/**
 * 更新已答复的重置状态。
 */
//@ chunk-fm6h4dv7.js:35501-35845 placement
function refreshAnsweredStatus(i, s) {
  let d = s9();
  if (
    d.phase !== "answered" ||
    d.wall.wallResetsAt !== i.wallResetsAt ||
    d.wall.rateLimitType !== i.rateLimitType ||
    d.status === null
  )
    return;
  GHt({
    ...d,
    answeredAtMs: H(),
    status: {
      ...d.status,
      nextGrantId: d.status.nextGrantId === s ? null : d.status.nextGrantId,
      grants: d.status.grants.map((grant) =>
        grant.id === s ? { ...grant, resetsLeft: 0, usableNow: !1 } : grant,
      ),
    },
  });
}
/**
 * 订阅会话切换以在对话重置时清除可继续标记（只订阅一次）。
 */
//@ chunk-fm6h4dv7.js:35845-35979 placement
function subscribeWallReset(i) {
  if (i.sessionSwitchSubscribed) return;
  ((i.sessionSwitchSubscribed = !0),
    onSessionSwitch((s, d) => {
      if (isConversationResetSwitch(d)) i.continuableWallResetsAt = null;
    }));
}
/**
 * juniper_tide（重置额度）状态 schema。
 */
//@ chunk-fm6h4dv7.js:35979-37293 placement
var JUNIPER_TIDE_SCHEMA = "juniper_tide",
  Ir = 25000,
  Or = DoctorLazy(() =>
    u({
      surface: U(["claude_ai", "claude_code_cli", "unknown"]).catch("unknown"),
      tier: U(["claude_pro", "claude_max_5x", "claude_max_20x", "unknown"]).catch("unknown"),
      tenure_bucket: U(["under_14", "14-29", "30-89", "90-364", "365+", "unknown"]).catch("unknown"),
      billing_path: U(["stripe", "apple", "google_play", "other", "unknown"]).catch("unknown"),
      billing_period: U(["monthly", "annual", "unknown"]).catch("unknown"),
      extra_usage_state: U(["not_configured", "disabled", "enabled", "unknown"]).catch("unknown"),
    }),
  ),
  Ur = DoctorLazy(() =>
    u({
      eligible: M(),
      ineligible_reason: U([
        "tier",
        "tenure",
        "surface",
        "mobile",
        "cli_version",
        "not_at_wall",
        "weekly_limit",
        "no_weekly_limit",
        "other_experiment",
        "extra_usage",
        "unavailable",
        "unknown",
      ])
        .catch("unknown")
        .nullable()
        .optional(),
      in_experiment: M().optional(),
      arm: U(["control", "reset"]).nullable().optional().catch(null),
      available: M().optional(),
      next_available_at: o().nullable().optional().catch(null),
      weekly_resets_at: o().nullable().optional().catch(null),
      resets_per_week: E()
        .optional()
        .catch(void 0),
      event_props: Or().nullable().optional().catch(null),
    }),
  ),
  Mr = DoctorLazy(() =>
    u({
      result: U(["reset", "already_used", "not_limited", "ineligible", "unavailable"]).catch("unavailable"),
      next_available_at: o().nullable().optional().catch(null),
      weekly_resets_at: o().nullable().optional().catch(null),
    }),
  );
/**
 * 解析 juniper_tide 状态块。
 */
//@ chunk-fm6h4dv7.js:37293-37933 placement
function parseJuniperTideStatus(i) {
  if (i === void 0 || i === null) return null;
  let safeParse = Ur().safeParse(i);
  if (!safeParse.success)
    return (
      logForDebugging(`[juniper-tide] ignoring a malformed status block: ${safeParse.error.message}`),
      null
    );
  let d = safeParse.data,
    event_props = d.event_props;
  return {
    eligible: d.eligible,
    ineligibleReason: d.ineligible_reason ?? null,
    inExperiment: d.in_experiment ?? !1,
    arm: d.arm ?? null,
    available: d.available ?? !1,
    nextAvailableAt: d.next_available_at ?? null,
    weeklyResetsAt: d.weekly_resets_at ?? null,
    resetsPerWeek: d.resets_per_week ?? 1,
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
 * 获取限额重置状态。
 */
//@ chunk-fm6h4dv7.js:37933-38373 placement
async function fetchJuniperTideStatus(i) {
  try {
    if (!hasProfileScope()) return { kind: "no_profile_scope" };
    let s = await fetchUtilization(i, { read: "at_wall" });
    if (!kVe(s))
      return (
        logForDebugging(
          "[juniper-tide] status fetch returned a fieldless or non-object body (in-band error)",
          { level: "warn" },
        ),
        { kind: "failed" }
      );
    return { kind: "answered", status: parseJuniperTideStatus(s?.juniper_tide) };
  } catch (error) {
    if (
      (logForDebugging(`[juniper-tide] status fetch failed: ${toError(error).message}`, { level: "warn" }),
      isAuthRejectedUsageError(error))
    )
      return { kind: "answered", status: null };
    return { kind: "failed" };
  }
}
/**
 * 调用 /api/organizations/{org}/reset_rate_limit 领取重置。
 */
//@ chunk-fm6h4dv7.js:38373-39539 placement
async function claimJuniperTide(i) {
  let s = getOauthAccountInfo()?.organizationUuid;
  if (!s)
    return (
      logForDebugging("[juniper-tide] no OAuth organization; cannot claim"),
      { result: "auth_error", nextAvailableAt: null }
    );
  try {
    let d = await withOAuth401Retry(
      () =>
        apiClient.post(
          `/api/organizations/${s}/reset_rate_limits`,
          { program: JUNIPER_TIDE_SCHEMA },
          {
            auth: "async",
            headers: { "Content-Type": "application/json" },
            timeout: Ir,
            refreshOAuth: !0,
            credentials: i,
          },
        ),
      { credentials: i },
    );
    if (!d.ok)
      return (
        logForDebugging(`[juniper-tide] claim not sent: ${d.reason === "no-auth" ? d.detail : d.reason}`, {
          level: "warn",
        }),
        { result: d.reason === "no-auth" ? "auth_error" : "error", nextAvailableAt: null }
      );
    let safeParse = Mr().safeParse(d.data);
    if (!safeParse.success)
      return (
        logForDebugging(`[juniper-tide] unreadable claim response: ${safeParse.error.message}`, {
          level: "error",
        }),
        logError(Error("[juniper-tide] unreadable claim response")),
        { result: "error", nextAvailableAt: null }
      );
    return { result: safeParse.data.result, nextAvailableAt: safeParse.data.next_available_at ?? null };
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`[juniper-tide] claim failed: ${toError(error).message}`, { level: "warn" });
    else logError(toError(error));
    if (isAxiosError(error))
      switch (error.response?.status) {
        case 429:
          return { result: "rate_limited", nextAvailableAt: null };
        case 401:
        case 403:
          return { result: "auth_error", nextAvailableAt: null };
        default:
          break;
      }
    return { result: "error", nextAvailableAt: null };
  }
}
/**
 * 重置流程的初始状态。
 */
//@ chunk-fm6h4dv7.js:39539-39746 placement
function createResetFlowState() {
  return {
    state: { phase: "idle" },
    shownWallResetsAt: null,
    pendingAsk: null,
    claiming: !1,
    continuableWallResetsAt: null,
    unsettledClaimWallResetsAt: null,
    sessionSwitchSubscribed: !1,
    changed: createSignal(),
    events: createSignal(),
  };
}
//@ chunk-fm6h4dv7.js:39746-39763 placement
var Wr = new HostScoped(createResetFlowState);
//@ chunk-fm6h4dv7.js:39763-39799 placement
function Y() {
  return Wr.of(getRootSession().host);
}
//@ chunk-fm6h4dv7.js:39799-39830 placement
function O7() {
  return Y().state;
}
//@ chunk-fm6h4dv7.js:39830-39882 placement
function re(i) {
  let s = Y();
  ((s.state = i), s.changed.emit());
}
/**
 * 订阅重置状态变化。
 */
//@ chunk-fm6h4dv7.js:39882-39930 placement
function subscribeResetChanges(i) {
  return Y().changed.subscribe(i);
}
//@ chunk-fm6h4dv7.js:39930-39977 placement
function Jho(i) {
  return Y().events.subscribe(i);
}
//@ chunk-fm6h4dv7.js:39977-40004 placement
var Fr = 3,
  Kr = 12000,
  $r = 35000;
//@ chunk-fm6h4dv7.js:40004-40079 placement
function dt(i, s) {
  return s.resetsAt === i.wallResetsAt && i.accountEpoch === getLimitsAccountEpoch();
}
//@ chunk-fm6h4dv7.js:40079-40158 placement
function Ne(i) {
  let s = O7();
  return s.phase === "answered" && dt(s, i) ? s.status : void 0;
}
//@ chunk-fm6h4dv7.js:40158-40219 placement
function ot(i) {
  let s = O7();
  return s.phase === "failed" && dt(s, i);
}
/**
 * 被拒且可在重置点提供低优先级等待时为真。旧版名错配；疑似归错文件。
 */
//@ chunk-fm6h4dv7.js:40219-40379 placement = getMockStatus (0.387)
function canArmLowPriorityReset(i, s = Date.now()) {
  let timestamp = Ne(i);
  return (
    WQe(i) &&
    timestamp !== void 0 &&
    timestamp !== null &&
    timestamp.arm === "reset" &&
    timestamp.available &&
    i.resetsAt !== void 0 &&
    i.resetsAt * 1000 > s &&
    !dD() &&
    isLimitResetEnabled()
  );
}

export {
  Jho,
  Jxs,
  offerCreditsResetAtWall,
  availableResetOffers,
  resetOfferFields,
  resetsUsedUpLine,
  isClaimingReset,
  subscribeResetChanges,
  canArmLowPriorityReset,
  reportResetOfferShown,
  O7,
  Ltn,
  Xxs,
  resetOfferLabel,
  refreshResetStatusForDialog,
  startResetFlowSafe,
  RESET_STATUS_MESSAGES,
  eJe,
  Ne,
  Y,
  dt,
  Fr,
  re,
  fetchJuniperTideStatus,
  Kr,
  ot,
  claimJuniperTide,
  $r,
  earlyUseLine,
  reportResetDeclined,
  claimReset,
  keepResetForLater,
  reportResetSelected,
};
