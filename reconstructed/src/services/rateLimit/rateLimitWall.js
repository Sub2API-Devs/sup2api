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
  parseTimestampOrUndefined,
  CREDIT_RESETTABLE_LIMIT_TYPES,
  usageCreditStateSlots,
  getLatestResetGrantEnd,
  isOnlyIfUnusedResetNote,
  TENGU_WISE_BEAR_COPY,
  setUsageCreditState,
  fetchCedarEmberStatus,
  currentUsageCreditState,
  claimCedarEmberGrant,
  dropUnusedResetCache,
} from "../usageCreditOffers.js";
import {
  RETRY_BACKOFF_MS,
  POLL_INTERVAL_MS,
  isUsableLimit,
  getLimitResetKind,
  clearsLimit,
  rankResetKindForLimit,
  usableStatusForWall,
  formatResetKindName,
  formatResetCount,
  limitDescription,
  formatResetAppliedText,
  captureWallResetIdentity,
  isSameWallReset,
  MAX_ATTEMPTS,
  RETRY_AFTER_MS,
  RETRY_MAX_MS,
} from "../../components/rateLimit/quotaAutoResume.js";
import {
  canAutoResumeLimitType,
  currentSubscriptionTier,
  isAutoContinueEligible,
  enqueueAutoContinuation,
  isFiveHourAutoResumable,
} from "../rateLimitContinuation.js";
import { isLowPriorityActive, endLowPriority } from "../lowPriority/lowPriorityMode.js";
import {
  isCedarEmberEnabled,
  getCedarEmberCopy,
  formatLimitResetTemplate,
  cedarEmberVersion,
  LIMIT_RESET,
  cedarEmberAutoContinue,
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
import { formatResetTimeWithLocale } from "../../utils/format.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../analytics/growthbook.js";
import {
  isQuotaAutoResumeArmed,
  cancelQuotaAutoResume,
  confirmAndFire,
  isConversationResetSwitch,
} from "../quotaAutoResume/quotaAutoResume.js";
import { withDeadline } from "../../utils/sleep.js";
import { logError } from "../../utils/log.js";
import { toError, isExpectedApiError } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum, fromEnumOpt, fromEnumArr } from "../analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { RainbowText } from "../../components/tasks/RemoteSessionProgress.js";
import { isAutoResumableLimit } from "../api/errors.js";
import { logFeatureOk, logFeatureSad } from "../analytics/featureTelemetry.js";
import { onSessionSwitch, getRootSession } from "../../bootstrap/state.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, _enum, M, string, E } from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasProfileScope, getOauthAccountInfo } from "../../utils/auth.js";
import { fetchUtilization, hasUsageLimitKeys, isAuthRejectedUsageError } from "../api/usage.js";
import { withOAuth401Retry } from "../../utils/http.js";
import { apiClient } from "../routines/routinesApi.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";

//@ chunk-fm6h4dv7.js:10953-10984 placement
function now() {
  return Date.now();
}
//@ chunk-fm6h4dv7.js:10984-11306 placement
/**
 * 是否需要重新查询重置资格。
 */
function shouldRecheckResetStatus(i, s, d, m) {
  if (i.final) return false;
  let b = m - i.answeredAtMs;
  let _ = (A) => b < 0 || b >= A;
  if (firstAvailableResetOffer(s, m) !== undefined) return false;
  let timestampOrUndefined = parseTimestampOrUndefined(i.status?.cooldownUntil ?? null);
  let C =
    b < 0 ||
    (b >= RETRY_BACKOFF_MS &&
      (timestampOrUndefined === undefined || m >= Math.min(timestampOrUndefined, i.answeredAtMs + 150000)));
  switch (d) {
    case "wall":
      return _(POLL_INTERVAL_MS);
    case "command":
      return C;
    case "dialog":
      return C && (i.status === null || hasPendingGrants(s));
  }
}
//@ chunk-fm6h4dv7.js:11306-11705 placement
/**
 * 按种类汇总可用的限额重置授权。
 */
function groupResetGrants(i, rateLimitType, d) {
  let m = new Map();
  for (let grant of i.grants) {
    if (!isUsableLimit(grant)) continue;
    let limitResetKind = getLimitResetKind(grant);
    let h = m.get(limitResetKind) ?? {
      kind: limitResetKind,
      grants: [],
      resetsLeft: 0,
      target: undefined,
    };
    m.set(limitResetKind, h);
    h.grants.push(grant);
    h.resetsLeft += grant.resetsLeft;
    let C = parseTimestampOrUndefined(grant.endsAt) ?? null;
    if (
      h.target === undefined &&
      grant.usableNow &&
      (C === null || C > d) &&
      (rateLimitType === null || (clearsLimit(grant, rateLimitType) && !isGrantUsable(grant, i)))
    )
      h.target = {
        grant,
        endsAtMs: C,
      };
  }
  return [...m.values()].sort(
    (b, _) => rankResetKindForLimit(b.kind, rateLimitType) - rankResetKindForLimit(_.kind, rateLimitType),
  );
}
//@ chunk-fm6h4dv7.js:11705-12155 placement
/**
 * 当前达到上限时可用的重置提议。
 */
function availableResetOffers(i, s = Date.now()) {
  let d = usableStatusForWall(i);
  if (
    !canAutoResumeLimitType(i) ||
    d === undefined ||
    d === null ||
    i.rateLimitType === undefined ||
    i.resetsAt === undefined ||
    i.resetsAt * 1000 <= s ||
    isLowPriorityActive() ||
    !isCedarEmberEnabled()
  )
    return [];
  let rateLimitType = i.rateLimitType;
  let b = totalResetsLeft(d);
  let _ = [];
  for (let h of groupResetGrants(d, rateLimitType, s))
    if (h.target !== undefined)
      _.push({
        origin: "wall",
        kind: h.kind,
        grant: h.target.grant,
        resetsLeft: Math.max(1, h.resetsLeft),
        totalResetsLeft: Math.max(1, b),
        weeklyResetsAt: d.weeklyResetsAt,
        endsAtMs: h.target.endsAtMs,
        rateLimitType,
      });
  return _;
}
//@ chunk-fm6h4dv7.js:12155-12202 placement
function firstAvailableResetOffer(i, s = Date.now()) {
  return availableResetOffers(i, s)[0];
}
//@ chunk-fm6h4dv7.js:12202-12332 placement
/**
 * 当前限额下不能使用的重置及原因。
 */
function unusableResetsFor(currentLimits, s = Date.now()) {
  let d = usableStatusForWall(currentLimits);
  if (d === undefined || d === null || currentLimits.rateLimitType === undefined) return [];
  return unusableResetOffers(d, currentLimits.rateLimitType, s);
}
//@ chunk-fm6h4dv7.js:12332-12673 placement
/**
 * 不能用于当前限额的重置及原因。
 */
function unusableResetOffers(i, s, d) {
  let m = [];
  for (let b of groupResetGrants(i, s, d)) {
    let _ = b.grants[0];
    if (b.target !== undefined || b.resetsLeft === 0 || !_) continue;
    let h =
      s !== null && !b.grants.some((grant) => clearsLimit(grant, s))
        ? `doesn't refill your ${resetLimitDisplayName(s)}`
        : describeResetUnavailable(_, i);
    let C = formatResetKindName(b.kind);
    m.push({
      kind: b.kind,
      resetsLeft: b.resetsLeft,
      reason: h,
      text: `${C.charAt(0).toUpperCase()}${C.slice(1)} \xB7 ${h}`,
    });
  }
  return m;
}
//@ chunk-fm6h4dv7.js:12673-13325 placement
/**
 * 重置不可用的原因码。
 */
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
//@ chunk-fm6h4dv7.js:13325-14034 placement
/**
 * 重置不可用原因的说明。
 */
function describeResetUnavailable(i, s) {
  switch (resetUnavailableReason(i, s)) {
    case "cooldown":
      return "try again in a minute";
    case "blocked_five_hour":
      return `can't be used while you're at your ${getRateLimitDisplayName("five_hour")}`;
    case "blocked_seven_day":
      return i.givesBackWeekly
        ? NO_FABLE_USAGE_LINE
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
//@ chunk-fm6h4dv7.js:14034-14195 placement
/**
 * 重置提议的标签文本（Fable 在周限额墙时附加后缀）。
 */
function resetOfferLabel(i) {
  let cedarEmberCopy = getCedarEmberCopy();
  let d = formatLimitResetTemplate(cedarEmberCopy.label, resetOfferFields(i));
  return i.kind === "fable" && i.origin === "wall" && i.rateLimitType === "seven_day"
    ? `${d} \xB7 ${cedarEmberCopy.fableAtWeeklySuffix}`
    : d;
}
//@ chunk-fm6h4dv7.js:14195-14258 placement
function totalResetsLeft(i) {
  return i.grants.reduce((acc, grant) => acc + grant.resetsLeft, 0);
}
//@ chunk-fm6h4dv7.js:14258-14383 placement
/**
 * 重置额度可直接使用：不要求先触达限额，且清除的限额都未耗尽。
 */
function isGrantUsable(i, s) {
  return (
    !i.useRequiresLimit &&
    !s.exhausted.some((d) => i.clears.includes(d) || (d === "seven_day" && i.givesBackWeekly))
  );
}
//@ chunk-fm6h4dv7.js:14383-14855 placement
/**
 * 重置相关的用量标识。
 */
function resetUsageBadge(grant, s) {
  if (!isGrantUsable(grant, s)) return null;
  let d = null;
  for (let b of CREDIT_RESETTABLE_LIMIT_TYPES) {
    let _ = grant.percentUsed[b];
    if (grant.clears.includes(b) && _ !== undefined && (d === null || _ > d.percentUsed))
      d = {
        claimType: b,
        percentUsed: _,
      };
  }
  if (d === null)
    return {
      kind: "unnumbered",
      percentUsedMax: null,
    };
  let m = limitDisplayName(d.claimType);
  if (m === null || d.percentUsed >= 100)
    return {
      kind: "unnumbered",
      percentUsedMax: d.percentUsed,
    };
  return {
    kind: "numbered",
    percentLeft: 100 - d.percentUsed,
    claimType: d.claimType,
    limitName: m,
    percentUsedMax: d.percentUsed,
  };
}
//@ chunk-fm6h4dv7.js:14855-14913 placement
function resetLimitDisplayName(type) {
  return type === "seven_day_sonnet" ? getWeeklyModelLimitName() : getRateLimitDisplayName(type);
}
//@ chunk-fm6h4dv7.js:14913-15148 placement
/**
 * 可重置限额类型的显示名（cowork/omelette/oauth 应用类型返回 null）。
 */
function limitDisplayName(claimType) {
  switch (claimType) {
    case "five_hour":
    case "seven_day":
    case "seven_day_opus":
    case "seven_day_overage_included":
    case "seven_day_sonnet":
      return resetLimitDisplayName(claimType);
    case "seven_day_cowork":
    case "seven_day_omelette":
    case "seven_day_oauth_apps":
      return null;
  }
}
//@ chunk-fm6h4dv7.js:15148-15347 placement
/**
 * 未到墙时提前使用重置的说明行（有编号/无编号）。
 */
function earlyUseLine(offer) {
  if (offer.origin === "wall" || offer.earlyUse === null) return;
  let cedarEmberCopy = getCedarEmberCopy();
  switch (offer.earlyUse.kind) {
    case "numbered":
      return formatLimitResetTemplate(cedarEmberCopy.earlyLine, resetOfferFields(offer));
    case "unnumbered":
      return formatLimitResetTemplate(cedarEmberCopy.earlyNoNumberLine, resetOfferFields(offer));
  }
}
//@ chunk-fm6h4dv7.js:15347-15460 placement
/**
 * 是否正在领取重置。
 */
function isClaimingReset() {
  let i = usageCreditStateSlots();
  return (
    i.claiming ||
    (i.unsettledClaimGrantId !== null &&
      i.unsettledClaimEpoch === getLimitsAccountEpoch() &&
      hasRecentUnsettledClaim(i))
  );
}
//@ chunk-fm6h4dv7.js:15460-15513 placement
/**
 * 判断额度墙上是否可提供重置。
 */
function isResetOfferAvailable(i, s = Date.now()) {
  return firstAvailableResetOffer(i, s) !== undefined;
}
//@ chunk-fm6h4dv7.js:15513-15761 placement
/**
 * 重置用完时的说明行。
 */
function resetsUsedUpLine(i, s = Date.now()) {
  let d = usableStatusForWall(i);
  if (
    !canAutoResumeLimitType(i) ||
    d === undefined ||
    d === null ||
    !d.eligible ||
    d.grants.length === 0 ||
    d.grants.some((grant) => grant.resetsLeft > 0 || grant.usableNow) ||
    i.resetsAt === undefined ||
    i.resetsAt * 1000 <= s ||
    !isCedarEmberEnabled()
  )
    return;
  return formatLimitResetTemplate(getCedarEmberCopy().spentLine, {
    left: 0,
  });
}
//@ chunk-fm6h4dv7.js:15761-15819 placement
/**
 * 是否存在覆盖最近结束时间的重置授权。
 */
function hasResetGrantCoveringLatestEnd(i, s = Date.now()) {
  return getLatestResetGrantEnd(usableStatusForWall(i), s) !== undefined;
}
//@ chunk-fm6h4dv7.js:15819-15956 placement
/**
 * 有资格、当前无可用额度但仍有剩余重置次数。
 */
function hasPendingGrants(i) {
  let s = usableStatusForWall(i);
  return (
    s !== undefined &&
    s !== null &&
    s.eligible &&
    !s.grants.some((grant) => grant.usableNow) &&
    s.grants.some((grant) => grant.resetsLeft > 0)
  );
}
//@ chunk-fm6h4dv7.js:15956-16296 placement
/**
 * 重置提议的显示字段。
 */
function resetOfferFields(i) {
  return {
    kind: formatResetKindName(i.kind),
    left: i.resetsLeft,
    kindResets: formatResetCount(i.kind, i.resetsLeft),
    date: latestGrantStartLine(i.grant.endsAt),
    deadline: latestGrantEndLine(i.grant.endsAt),
    week: latestGrantEndLine(i.weeklyResetsAt),
    limits: resetClearsLimits(i.grant),
    returns: limitDescription(i.kind),
    done: formatResetAppliedText(i.kind),
    ...(i.origin === "anytime" &&
      i.earlyUse?.kind === "numbered" && {
        percent: i.earlyUse.percentLeft,
        limit: i.earlyUse.limitName,
      }),
  };
}
//@ chunk-fm6h4dv7.js:16296-16859 placement
/**
 * 重置能清除哪些限额。
 */
function resetClearsLimits(grant) {
  let s = new Set();
  if (grant.givesBackWeekly) s.add("Fable");
  for (let clear of grant.clears)
    switch (clear) {
      case "five_hour":
        s.add("5-hour");
        break;
      case "seven_day":
        s.add("weekly");
        break;
      case "seven_day_overage_included":
        s.add(grant.givesBackWeekly ? "Fable" : "weekly");
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
  let d = [...s];
  let m = d.pop();
  if (m === undefined) return "limits";
  return d.length === 0 ? `${m} limit` : `${d.join(", ")} and ${m} limits`;
}
//@ chunk-fm6h4dv7.js:16859-16944 placement
function latestGrantStartLine(endsAt) {
  let timestampOrUndefined = parseTimestampOrUndefined(endsAt);
  return timestampOrUndefined === undefined
    ? undefined
    : formatResetTimeWithLocale(Math.floor(timestampOrUndefined / 1000), false, false, true);
}
//@ chunk-fm6h4dv7.js:16944-17029 placement
function latestGrantEndLine(i) {
  let timestampOrUndefined = parseTimestampOrUndefined(i);
  return timestampOrUndefined === undefined
    ? undefined
    : formatResetTimeWithLocale(Math.floor(timestampOrUndefined / 1000), false, true, true);
}
//@ chunk-fm6h4dv7.js:17029-17074 placement
function isResetAtWallOffered() {
  return (
    isCedarEmberEnabled() ||
    isOnlyIfUnusedResetNote(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_WISE_BEAR_COPY, null))
  );
}
//@ chunk-fm6h4dv7.js:17074-17136 placement
/**
 * 在额度墙上从菜单里提供重置入口。
 */
function offerResetAtWallFromMenu(quotaLimits, credentials) {
  if (!isResetAtWallOffered() || !canAutoResumeLimitType(quotaLimits)) return;
  askResetAtWall(quotaLimits, credentials, "cli_menu");
}
//@ chunk-fm6h4dv7.js:17136-17268 placement
/**
 * 周限额（含超额）触墙时询问可用的重置。
 */
function offerCreditsResetAtWall(credentials) {
  let currentLimits = getCurrentLimits();
  if (
    !isCedarEmberEnabled() ||
    currentLimits.rateLimitType !== "seven_day_overage_included" ||
    !canAutoResumeLimitType(currentLimits)
  )
    return;
  askResetAtWall(currentLimits, credentials, "cli_credits_required");
}
//@ chunk-fm6h4dv7.js:17268-17400 placement
/**
 * 在限额墙询问重置状态（订阅会话切换、清理过期的未结算领取）。
 */
function askResetAtWall(i, s, d) {
  let m = usageCreditStateSlots();
  subscribeWallReset(m);
  m.continuableWallResetsAt = i.resetsAt ?? null;
  if (m.unsettledClaimEpoch !== getLimitsAccountEpoch()) clearUnsettledClaim(m);
  askResetStatus(i, s, "wall", d);
}
//@ chunk-fm6h4dv7.js:17400-18383 placement
/**
 * 查询重置资格（按阶段去重）。
 */
function askResetStatus(currentLimits, s, d, m) {
  if (d === "wall" ? !isResetAtWallOffered() : !isCedarEmberEnabled()) return Promise.resolve();
  let b = captureWallResetIdentity(currentLimits);
  if (b === null) return Promise.resolve();
  let _ = usageCreditStateSlots();
  if (m !== undefined)
    _.wallSurface = {
      wall: b,
      surface: m,
    };
  let state = _.state;
  let failures = 0;
  let previous = null;
  if (state.phase !== "idle" && isSameWallReset(state.wall, currentLimits))
    switch (state.phase) {
      case "answered":
        if (!shouldRecheckResetStatus(state, currentLimits, d, now())) return Promise.resolve();
        previous = state;
        break;
      case "asking":
        return _.pendingAsk ?? Promise.resolve();
      case "failed":
        if (d === "wall" && state.failures >= MAX_ATTEMPTS) return Promise.resolve();
        failures = state.failures;
    }
  setUsageCreditState({
    phase: "asking",
    wall: b,
  });
  let autoArmed = isQuotaAutoResumeArmed();
  let surface =
    m ??
    (_.wallSurface !== null && isSameWallReset(_.wallSurface.wall, currentLimits)
      ? _.wallSurface.surface
      : "cli_menu");
  let x = withDeadline(
    fetchCedarEmberStatus(s, {
      surface,
    }),
    RETRY_AFTER_MS,
  )
    .then((L) => {
      settleResetStatus({
        wall: b,
        failures,
        previous,
        result: L ?? {
          kind: "failed",
        },
        autoArmed,
      });
      if (L !== undefined && L.kind === "answered" && L.status?.ineligibleReason !== "unavailable")
        settleUnsettledClaim(_, L.status, s);
    })
    .catch((error) => {
      logError(toError(error));
      try {
        settleResetStatus({
          wall: b,
          failures,
          previous,
          result: {
            kind: "failed",
          },
          autoArmed,
        });
      } catch (error) {
        logError(toError(error));
      }
    })
    .finally(() => {
      if (_.pendingAsk === x) _.pendingAsk = null;
    });
  _.pendingAsk = x;
  return x;
}
//@ chunk-fm6h4dv7.js:18383-20100 placement
/**
 * 处理重置资格查询结果。
 */
function settleResetStatus({ wall, failures, previous, result: m, autoArmed }) {
  let _ = currentUsageCreditState();
  if (
    _.phase !== "asking" ||
    _.wall.rateLimitType !== wall.rateLimitType ||
    _.wall.wallResetsAt !== wall.wallResetsAt ||
    _.wall.accountEpoch !== wall.accountEpoch
  )
    return;
  let status = m.kind === "answered" ? m.status : null;
  let C = m.kind === "failed" || status?.ineligibleReason === "unavailable";
  if (C && previous !== null)
    setUsageCreditState({
      ...previous,
      answeredAtMs: now(),
    });
  else if (C)
    setUsageCreditState({
      phase: "failed",
      wall,
      failures: failures + 1,
    });
  else {
    let I = m.kind === "no_profile_scope" || m.kind === "not_authorized";
    setUsageCreditState(
      I
        ? {
            phase: "answered",
            wall,
            status,
            answeredAtMs: now(),
            final: I,
          }
        : {
            phase: "answered",
            wall,
            status,
            answeredAtMs: now(),
          },
    );
  }
  if (!isCedarEmberEnabled()) return;
  let configVersion = cedarEmberVersion();
  logEvent("tengu_cedar_ember_asked", {
    outcome: fromEnum(resetFlowPhase(m)),
    at_wall: true,
    attempt: failures + 1,
    eligible: status?.eligible ?? false,
    ineligible_reason: fromEnumOpt(status?.ineligibleReason),
    limit_type: fromEnum(wall.rateLimitType),
    config_version: configVersion,
  });
  if (C || status === null || !status.eligible) return;
  let k = usageCreditStateSlots();
  let T = `${wall.accountEpoch}:${wall.rateLimitType}:${wall.wallResetsAt}:${status.eligible}:${status.nextGrantId}`;
  if (k.wallRecordKey === T) return;
  k.wallRecordKey = T;
  let filtered = groupResetGrants(status, wall.rateLimitType, now()).filter((I) => I.target !== undefined);
  let grant = filtered[0]?.target?.grant;
  logEvent("tengu_cedar_ember_wall", {
    eligible: status.eligible,
    at_limit: status.atLimit,
    usable: grant !== undefined,
    grant_id: sanitizeMarkName(grant?.id ?? status.nextGrantId),
    kind: fromEnumOpt(grant && getLimitResetKind(grant)),
    kinds_offered: fromEnumArr(filtered.map((I) => I.kind)),
    resets_left: grant?.resetsLeft ?? 0,
    resets_left_total: totalResetsLeft(status),
    grants: status.grants.length,
    limit_type: fromEnum(wall.rateLimitType),
    limit_types: fromEnumArr(status.exhausted),
    tier: fromEnum(currentSubscriptionTier()),
    auto_armed: autoArmed,
    low_priority_active: isLowPriorityActive(),
    config_version: configVersion,
    surface: fromEnumOpt(status.eventProps?.surface),
    server_tier: fromEnumOpt(status.eventProps?.tier),
    tenure_bucket: fromEnumOpt(status.eventProps?.tenureBucket),
    billing_path: fromEnumOpt(status.eventProps?.billingPath),
    billing_period: fromEnumOpt(status.eventProps?.billingPeriod),
    extra_usage_state: fromEnumOpt(status.eventProps?.extraUsageState),
  });
}
//@ chunk-fm6h4dv7.js:20100-20310 placement
/**
 * 核对未结算的重置领取：账号变化或额度已不可用时清除。
 */
function settleUnsettledClaim(i, status, d) {
  if (i.unsettledClaimGrantId === null) return;
  if (i.unsettledClaimEpoch !== getLimitsAccountEpoch()) {
    clearUnsettledClaim(i);
    return;
  }
  if (status?.grants.some((grant) => grant.id === i.unsettledClaimGrantId && grant.usableNow)) return;
  probeOrFireQuotaResume(d);
  if (status !== null && !isCooldownActive(status)) clearUnsettledClaim(i);
}
//@ chunk-fm6h4dv7.js:20310-20324 placement
var UNRESOLVED_CLAIM_TTL_MS = 600000;
//@ chunk-fm6h4dv7.js:20324-20403 placement
function hasRecentUnsettledClaim(i) {
  return i.unsettledClaimAtMs !== null && now() - i.unsettledClaimAtMs < UNRESOLVED_CLAIM_TTL_MS;
}
//@ chunk-fm6h4dv7.js:20403-20485 placement
function resetFlowPhase(i) {
  return i.kind === "answered" ? (i.status === null ? "absent" : "block") : i.kind;
}
//@ chunk-fm6h4dv7.js:20485-20574 placement
function isClaimForGrant(i, id) {
  return (
    i.unsettledClaimGrantId === id &&
    i.unsettledClaimEpoch === getLimitsAccountEpoch() &&
    hasRecentUnsettledClaim(i)
  );
}
//@ chunk-fm6h4dv7.js:20574-20701 placement
/**
 * 清空未结算的重置领取记录。
 */
function clearUnsettledClaim(i) {
  i.unsettledClaimGrantId = null;
  i.unsettledClaimRequestId = null;
  i.unsettledClaimEpoch = null;
  i.unsettledClaimAtMs = null;
}
//@ chunk-fm6h4dv7.js:20701-20858 placement
/**
 * 记录一次未结算的重置领取（额度 id、请求 id、账号代数、时间）。
 */
function recordUnsettledClaim(i, unsettledClaimGrantId, d, unsettledClaimEpoch) {
  if (i.unsettledClaimRequestId !== d) i.unsettledClaimAtMs = now();
  i.unsettledClaimGrantId = unsettledClaimGrantId;
  i.unsettledClaimRequestId = d;
  i.unsettledClaimEpoch = unsettledClaimEpoch;
}
//@ chunk-fm6h4dv7.js:20858-20955 placement
function claimRequestIdFor(i, id) {
  return isClaimForGrant(i, id) && i.unsettledClaimRequestId !== null
    ? i.unsettledClaimRequestId
    : randomUUID();
}
//@ chunk-fm6h4dv7.js:20955-21404 placement
/**
 * 首次显示重置提议时上报。
 */
function reportResetOfferShown(i, s) {
  let d = availableResetOffers(i);
  let [m] = d;
  if (m === undefined || i.resetsAt === undefined) return;
  let b = `${m.rateLimitType}:${i.resetsAt}:${d.map((h) => h.grant.id).join(",")}`;
  let _ = usageCreditStateSlots();
  if (_.shownOfferKey === b) return;
  _.shownOfferKey = b;
  logEvent("tengu_cedar_ember_shown", {
    surface: fromEnum(s),
    grant_id: sanitizeMarkName(m.grant.id),
    kind: fromEnum(m.kind),
    kinds_offered: fromEnumArr(d.map((h) => h.kind)),
    resets_left: m.grant.resetsLeft,
    resets_left_total: m.totalResetsLeft,
    limit_type: fromEnum(m.rateLimitType),
    config_version: cedarEmberVersion(),
  });
}
//@ chunk-fm6h4dv7.js:21404-21516 placement
/**
 * 对话框打开时需要时重新查询重置状态。
 */
function refreshResetStatusForDialog(claudeAiLimits, credentials) {
  let d = currentUsageCreditState();
  if (
    RainbowText(claudeAiLimits) ||
    (d.phase === "answered" &&
      isSameWallReset(d.wall, claudeAiLimits) &&
      shouldRecheckResetStatus(d, claudeAiLimits, "dialog", now()))
  )
    askResetStatus(claudeAiLimits, credentials, "dialog");
}
//@ chunk-fm6h4dv7.js:21516-21650 placement
/**
 * 执行重置流程，异常时返回 unavailable。
 */
async function startResetFlowSafe(i, credentials, d) {
  try {
    return await startResetFlow(i, credentials, d);
  } catch (error) {
    logError(toError(error));
    return {
      kind: "answer",
      result: {
        outcome: "unavailable",
        text: RESET_STATUS_MESSAGES,
      },
    };
  }
}
//@ chunk-fm6h4dv7.js:21650-21753 placement
/**
 * 查询重置状态；之前有进行中的查询且仍需刷新时再查一次。
 */
async function askResetStatusTwice(i, s) {
  let m = usageCreditStateSlots().pendingAsk !== null;
  await askResetStatus(getCurrentLimits(), s, i);
  if (m && RainbowText(getCurrentLimits())) await askResetStatus(getCurrentLimits(), s, i);
}
//@ chunk-fm6h4dv7.js:21753-22153 placement
/**
 * /reset 流程入口：检查是否可用并给出提议。
 */
async function startResetFlow(i, s, d) {
  if (usageCreditStateSlots().claiming)
    return {
      kind: "answer",
      result: {
        outcome: "unavailable",
        text: LIMITS_ALREADY_RESETTING_LINE,
      },
    };
  if (getCurrentLimits().status !== "rejected" && isAutoContinueEligible() && isCedarEmberEnabled()) {
    if (isLowPriorityActive())
      return {
        kind: "answer",
        result: {
          outcome: "not_offered",
          text: LOW_PRIORITY_RESETS_BLOCKED_LINE,
        },
      };
    return checkResetEligibility(i, s, d);
  }
  await askResetStatusTwice(i, s);
  let currentLimits = getCurrentLimits();
  let _ = availableResetOffers(currentLimits);
  if (_.length === 0) {
    let h = usableStatusForWall(currentLimits);
    if (h !== undefined && h !== null && (isCooldownActive(h) || hasUsableGrantFor(h, currentLimits)))
      probeOrFireQuotaResume(s);
    return {
      kind: "answer",
      result: resetNotOfferedResult(currentLimits),
    };
  }
  return chooseResetOffer(i, _, unusableResetsFor(currentLimits), d);
}
//@ chunk-fm6h4dv7.js:22153-22669 placement
/**
 * 选择或确认重置提议。
 */
function chooseResetOffer(i, s, d, m) {
  let [b, ..._] = s;
  let h = m !== undefined ? s.find((k) => k.kind === m) : b !== undefined && _.length === 0 ? b : undefined;
  if (h !== undefined) {
    reportResetSelected(i, h);
    return {
      kind: "confirm",
      offer: h,
    };
  }
  if (m === undefined)
    return {
      kind: "choose",
      offers: s,
      unusable: d,
    };
  let found = d.find((k) => k.kind === m);
  return {
    kind: "answer",
    result: {
      outcome: "not_offered",
      text: `${
        found === undefined
          ? formatLimitResetTemplate(getCedarEmberCopy().noKindLine, {
              kind: formatResetKindName(m),
            })
          : found.reason.startsWith("can't be used")
            ? `Your ${formatResetKindName(m)} ${found.reason}`
            : `Your ${formatResetKindName(m)} can't be used right now \xB7 ${found.reason}`
      } \xB7 you can use ${formatResetChoices(s.map((k) => k.kind))}`,
    },
  };
}
//@ chunk-fm6h4dv7.js:22669-22798 placement
/**
 * 把可选重置列为 “a X, a Y or a Z”。
 */
function formatResetChoices(i) {
  let mapped = i.map((m) => `a ${formatResetKindName(m)}`);
  let d = mapped.pop();
  return d === undefined ? "nothing here" : mapped.length === 0 ? d : `${mapped.join(", ")} or ${d}`;
}
//@ chunk-fm6h4dv7.js:22798-23114 placement
/**
 * 上报选择的重置。
 */
function reportResetSelected(i, s) {
  logEvent("tengu_cedar_ember_selected", {
    entry: fromEnum(i),
    grant_id: sanitizeMarkName(s.grant.id),
    kind: fromEnum(s.kind),
    resets_left: s.grant.resetsLeft,
    resets_left_total: s.totalResetsLeft,
    limit_type: fromEnumOpt(s.origin === "wall" ? s.rateLimitType : undefined),
    at_limit: s.origin === "wall" || s.atLimit,
    early_use: hasEarlyUse(s),
    auto_armed: isQuotaAutoResumeArmed(),
    config_version: cedarEmberVersion(),
  });
}
//@ chunk-fm6h4dv7.js:23114-23825 placement
/**
 * 向服务端查询重置资格并上报。
 */
async function checkResetEligibility(i, s, d) {
  let m = usageCreditStateSlots();
  let b = await withDeadline(
    fetchCedarEmberStatus(s, {
      read: "cedar_ember",
    }),
    RETRY_AFTER_MS,
  );
  let status = b?.kind === "answered" ? b.status : null;
  let h = b === undefined || b.kind === "failed" || status?.ineligibleReason === "unavailable";
  logEvent("tengu_cedar_ember_asked", {
    outcome: fromEnum(
      resetFlowPhase(
        b ?? {
          kind: "failed",
        },
      ),
    ),
    at_wall: false,
    asker: fromEnum(i),
    eligible: status?.eligible ?? false,
    ineligible_reason: fromEnumOpt(status?.ineligibleReason),
    at_limit: status?.atLimit ?? false,
    grants: status?.grants.length ?? 0,
    grant_id: sanitizeMarkName(status?.nextGrantId ?? null),
    config_version: cedarEmberVersion(),
  });
  if (h)
    return {
      kind: "answer",
      result: {
        outcome: "unavailable",
        text: isClaimingReset()
          ? formatLimitResetTemplate(getCedarEmberCopy().unconfirmedAnytimeLine, {})
          : RESET_STATUS_MESSAGES,
      },
    };
  settleUnsettledClaim(m, status, s);
  if (status === null)
    return {
      kind: "answer",
      result: describeResetState(status),
    };
  let C = now();
  let A = anytimeResetOffers(status, C);
  if (A.length === 0)
    return {
      kind: "answer",
      result: describeResetState(status),
    };
  return chooseResetOffer(i, A, unusableResetOffers(status, null, C), d);
}
//@ chunk-fm6h4dv7.js:23825-24148 placement
/**
 * 非上限时可用的重置提议。
 */
function anytimeResetOffers(status, s) {
  let d = totalResetsLeft(status);
  let m = [];
  for (let b of groupResetGrants(status, null, s))
    if (b.target !== undefined)
      m.push({
        origin: "anytime",
        kind: b.kind,
        grant: b.target.grant,
        resetsLeft: Math.max(1, b.resetsLeft),
        totalResetsLeft: Math.max(1, d),
        weeklyResetsAt: status.weeklyResetsAt,
        endsAtMs: b.target.endsAtMs,
        earlyUse: resetUsageBadge(b.target.grant, status),
        atLimit: status.atLimit,
      });
  return m;
}
//@ chunk-fm6h4dv7.js:24148-24740 placement
/**
 * 重置状态说明（无可用、未在上限等）。
 */
function describeResetState(status) {
  if (status === null || !status.eligible || status.grants.length === 0)
    return {
      outcome: "not_offered",
      text: `${RESET_MESSAGES} \xB7 ${NOT_AT_LIMIT_LINE}`,
    };
  let filtered = status.grants.filter((grant) => grant.resetsLeft > 0);
  let d = {
    left: totalResetsLeft(status),
    date: latestGrantStartLine(filtered[0]?.endsAt ?? null),
  };
  if (filtered.length === 0)
    return {
      outcome: "spent",
      text: formatLimitResetTemplate(getCedarEmberCopy().spentLine, d),
    };
  let m =
    filtered
      .flatMap((_) => _.blocking)
      .map(limitDisplayName)
      .find((_) => _ !== null) ?? null;
  let b =
    m !== null
      ? noRefillUntilResetLine(m)
      : filtered.every((_) => _.paused)
        ? `${RESET_UNAVAILABLE_LINE} \xB7 it is paused`
        : isCooldownActive(status)
          ? `${RESET_UNAVAILABLE_LINE} \xB7 try again in a minute`
          : filtered.every((_) => _.useRequiresLimit)
            ? SAVED_RESET_AT_LIMIT_LINE
            : `${RESET_UNAVAILABLE_LINE} \xB7 try again later`;
  return {
    outcome: "not_offered",
    text: formatLimitResetTemplate(`${b} \xB7 {resets} left \xB7 use by {date}`, d),
  };
}
//@ chunk-fm6h4dv7.js:24740-25025 placement
/**
 * 不提供重置时的结果（已用完、状态未知、当前额度足够或其他原因）。
 */
function resetNotOfferedResult(currentLimits) {
  let s = resetsUsedUpLine(currentLimits);
  if (s !== undefined)
    return {
      outcome: "spent",
      text: s,
    };
  if (RainbowText(currentLimits))
    return {
      outcome: "unavailable",
      text: isClaimingReset()
        ? formatLimitResetTemplate(getCedarEmberCopy().unconfirmedLine, {})
        : RESET_STATUS_MESSAGES,
    };
  let d = usableStatusForWall(currentLimits);
  if (d !== undefined && d !== null && hasUsableGrantFor(d, currentLimits))
    return {
      outcome: "not_offered",
      text: LIMIT_MAY_HAVE_LIFTED_LINE,
    };
  return {
    outcome: "not_offered",
    text: withLimitResetTime(resetStatusLine(currentLimits), currentLimits),
  };
}
//@ chunk-fm6h4dv7.js:25025-25166 placement
/**
 * 是否有可直接用于当前限额的重置额度。
 */
function hasUsableGrantFor(i, s) {
  let rateLimitType = s.rateLimitType;
  return (
    rateLimitType !== undefined &&
    !i.exhausted.some((m) => m === rateLimitType) &&
    i.grants.some((grant) => grant.usableNow && !grant.paused && clearsLimit(grant, rateLimitType))
  );
}
//@ chunk-fm6h4dv7.js:25166-25233 placement
function isCooldownActive(i) {
  let timestampOrUndefined = parseTimestampOrUndefined(i.cooldownUntil);
  return timestampOrUndefined !== undefined && timestampOrUndefined > now();
}
//@ chunk-fm6h4dv7.js:25233-25832 placement
/**
 * 当前限额下的重置状态行。
 */
function resetStatusLine(i) {
  let s = usableStatusForWall(i);
  if (s === undefined || s === null || i.rateLimitType === undefined) return RESET_MESSAGES;
  let rateLimitType = i.rateLimitType;
  let filtered = s.grants.filter((grant) => grant.resetsLeft > 0);
  if (filtered.length === 0) return RESET_MESSAGES;
  if (!filtered.some((_) => clearsLimit(_, rateLimitType)))
    return `${RESETS_REFILL_NOTHING_LINE} ${resetLimitDisplayName(rateLimitType)}`;
  if (
    rateLimitType === "seven_day" &&
    filtered.every((_) => _.givesBackWeekly && _.blocking.includes("seven_day"))
  )
    return `Your Fable reset can't be used right now \xB7 ${NO_FABLE_USAGE_LINE}`;
  let b =
    filtered
      .filter((_) => clearsLimit(_, rateLimitType))
      .flatMap((_) => _.blocking)
      .map(limitDisplayName)
      .find((_) => _ !== null) ?? null;
  if (b !== null) return noRefillUntilResetLine(b);
  if (filtered.every((_) => _.paused)) return `${RESET_NOT_FOR_THIS_LIMIT_LINE} \xB7 it is paused`;
  if (isCooldownActive(s)) return `${RESET_NOT_FOR_THIS_LIMIT_LINE} \xB7 try again in a minute`;
  return RESET_NOT_FOR_THIS_LIMIT_LINE;
}
//@ chunk-fm6h4dv7.js:25832-25954 placement
/**
 * 在说明后附上限额重置时间。
 */
function withLimitResetTime(i, s) {
  let d = isAutoResumableLimit(s) ? formatResetTimeWithLocale(s.resetsAt) : undefined;
  return d !== undefined ? `${i} \xB7 this limit resets ${d}` : `${i} \xB7 ${NOT_AT_LIMIT_LINE}`;
}
//@ chunk-fm6h4dv7.js:25954-26328 placement
/**
 * 上报用户拒绝重置。
 */
function reportResetDeclined(entry, offer) {
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: false,
    entry: fromEnum(entry),
    grant_id: sanitizeMarkName(offer.grant.id),
    kind: fromEnum(offer.kind),
    limit_type: fromEnumOpt(offer.origin === "wall" ? offer.rateLimitType : undefined),
    at_limit: offer.origin === "wall" || offer.atLimit,
    early_use: hasEarlyUse(offer),
    percent_used_max: earlyUsePercentUsedMax(offer),
    config_version: cedarEmberVersion(),
  });
  let cedarEmberCopy = getCedarEmberCopy();
  return {
    outcome: "kept",
    text: formatLimitResetTemplate(
      offer.grant.useRequiresLimit ? cedarEmberCopy.keptLine : cedarEmberCopy.keptAnytimeLine,
      resetOfferFields(offer),
    ),
  };
}
//@ chunk-fm6h4dv7.js:26328-26781 placement
/**
 * 用户保留重置时的结果。
 */
function keepResetForLater(entry, offers) {
  let [d, ...m] = offers;
  if (d === undefined)
    return {
      outcome: "kept",
      text: RESET_MESSAGES,
    };
  let reduced = m.reduce(
    (acc, h) => (h.endsAtMs !== null && (acc.endsAtMs === null || h.endsAtMs < acc.endsAtMs) ? h : acc),
    d,
  );
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: false,
    chose_none: true,
    entry: fromEnum(entry),
    kinds_offered: fromEnumArr(offers.map((_) => _.kind)),
    limit_type: fromEnumOpt(reduced.origin === "wall" ? reduced.rateLimitType : undefined),
    at_limit: reduced.origin === "wall" || reduced.atLimit,
    config_version: cedarEmberVersion(),
  });
  return {
    outcome: "kept",
    text: formatLimitResetTemplate(getCedarEmberCopy().keptChoiceLine, resetOfferFields(reduced)),
  };
}
//@ chunk-fm6h4dv7.js:26781-27116 placement
/**
 * 领取重置（防重入）。
 */
async function claimReset(entry, credentials, offer) {
  let m = usageCreditStateSlots();
  if (m.claiming)
    return {
      outcome: "unavailable",
      text: LIMITS_ALREADY_RESETTING_LINE,
    };
  m.claiming = true;
  try {
    return offer.origin === "wall" || captureWallResetIdentity(getCurrentLimits()) !== null
      ? await claimResetAtWall(entry, credentials, offer)
      : await claimResetEarly(entry, credentials, offer);
  } catch (error) {
    logError(toError(error));
    let cedarEmberCopy = getCedarEmberCopy();
    return {
      outcome: "unavailable",
      text: formatLimitResetTemplate(
        offer.origin === "wall" ? cedarEmberCopy.unconfirmedLine : cedarEmberCopy.unconfirmedAnytimeLine,
        {},
      ),
    };
  } finally {
    m.claiming = false;
  }
}
//@ chunk-fm6h4dv7.js:27116-30155 placement
/**
 * 达到上限时领取重置并刷新限额。
 */
async function claimResetAtWall(entry, credentials, d) {
  let m = usageCreditStateSlots();
  let cedarEmberCopy = getCedarEmberCopy();
  let configVersion = cedarEmberVersion();
  let id = d.grant.id;
  await askResetStatusTwice(entry, credentials);
  let currentLimits = getCurrentLimits();
  let A = captureWallResetIdentity(currentLimits);
  let k = availableResetOffers(currentLimits);
  let found = k.find((R) => R.kind === d.kind);
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: true,
    entry: fromEnum(entry),
    grant_id: sanitizeMarkName(id),
    kind: fromEnum(d.kind),
    limit_type: fromEnumOpt(currentLimits.rateLimitType),
    still_offered: found !== undefined && found.grant.id === id,
    at_limit: true,
    early_use: false,
    config_version: configVersion,
  });
  if (A === null || k.length === 0) return resetNotOfferedResult(currentLimits);
  if (found === undefined)
    return {
      outcome: "not_offered",
      text: `${formatLimitResetTemplate(RESET_NO_LONGER_OFFERED_LINE, {
        kind: formatResetKindName(d.kind),
      })} \xB7 you can use ${formatResetChoices(k.map((R) => R.kind))}`,
    };
  if (found.grant.id !== id)
    return {
      outcome: "not_offered",
      text: DIFFERENT_RESET_OFFERED_LINE,
    };
  let now_2 = Date.now();
  let L = isClaimForGrant(m, id);
  let I = claimRequestIdFor(m, id);
  let O = (await withDeadline(claimCedarEmberGrant(credentials, id, I), RETRY_MAX_MS)) ?? {
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
      entry: fromEnum(entry),
      grant_id: sanitizeMarkName(id),
      kind: fromEnum(found.kind),
      resets_left: O.resetsLeft ?? undefined,
      cleared: fromEnumArr(O.cleared),
      limit_type: fromEnum(A.rateLimitType),
      at_limit: true,
      early_use: false,
      latency_ms: Date.now() - now_2,
      config_version: configVersion,
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
  let D = found.resetsLeft - found.grant.resetsLeft;
  let Fe = O.resetsLeft ?? (O.result === "already_used" ? 0 : Math.max(0, found.grant.resetsLeft - 1));
  let G = {
    ...resetOfferFields(found),
    left: D + Fe,
    kindResets: formatResetCount(found.kind, D + Fe),
    week: latestGrantEndLine(O.weeklyResetsAt ?? found.weeklyResetsAt),
  };
  switch (O.result) {
    case "reset": {
      clearUnsettledClaim(m);
      dropUnusedResetCache();
      let R = [A.rateLimitType, ...resettableLimitTypes(O.cleared).filter((ae) => ae !== A.rateLimitType)];
      if (!found.grant.clears.some((clear) => clear === A.rateLimitType)) {
        forgetHeldWindows(R);
        let ae = now();
        await withDeadline(
          probeQuotaStatusAtStart(credentials, undefined).catch((error) => {
            logError(toError(error));
          }),
          RETRY_AFTER_MS,
        );
        let F = lastLimitsObservationAt() > ae;
        let currentLimits = getCurrentLimits();
        let _e = F && isAutoResumableLimit(currentLimits);
        let $e = _e && currentLimits.rateLimitType === A.rateLimitType;
        logEvent("tengu_cedar_ember_give_back", {
          outcome: fromEnum($e ? "binds" : _e ? "elsewhere" : F ? "lifted" : "unread"),
          entry: fromEnum(entry),
          grant_id: sanitizeMarkName(id),
          config_version: configVersion,
        });
        if ($e) {
          resetWallPhase(A);
          askResetStatus(currentLimits, credentials, entry);
          return {
            outcome: "reset",
            text: formatLimitResetTemplate(RESET_USED_STILL_LIMITED_LINE, {
              ...G,
              limit: resetLimitDisplayName(A.rateLimitType),
              date: formatResetTimeWithLocale(currentLimits.resetsAt, false, true, true),
            }),
          };
        }
        R = F ? [] : R;
      }
      let q = consumeContinuableWall(m, A);
      applyClaimedReset(m, A, R, entry, q);
      let Ke = formatLimitResetTemplate(cedarEmberCopy.successLine, G);
      return {
        outcome: "reset",
        text: q ? Ke : appendContinueHint(Ke),
      };
    }
    case "not_limited": {
      clearUnsettledClaim(m);
      let R = consumeContinuableWall(m, A);
      applyClaimedReset(m, A, [A.rateLimitType], entry, R);
      let q = L ? LIMITS_CLEAR_LINE : LIMIT_ALREADY_RESET_LINE;
      return {
        outcome: "reset",
        text: R ? q : appendContinueHint(q),
      };
    }
    case "cooldown": {
      if (!L) clearUnsettledClaim(m);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "unavailable",
        text: L ? EARLIER_RESET_PENDING_LINE : OTHER_RESET_STARTED_LINE,
      };
    }
    case "already_used": {
      if (L) {
        clearUnsettledClaim(m);
        resetWallPhase(A);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "spent",
          text: EARLIER_RESET_WENT_THROUGH_LINE,
        };
      }
      if (found.totalResetsLeft - found.grant.resetsLeft > 0) {
        resetWallPhase(A);
        askResetStatus(getCurrentLimits(), credentials, entry);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "spent",
          text: formatLimitResetTemplate(`${RESET_ALREADY_USED_LINE} \xB7 ${RUN_RESET_AGAIN_LINE}`, G),
        };
      }
      refreshAnsweredStatus(A, id);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "spent",
        text: formatLimitResetTemplate(RESET_ALREADY_USED_LINE, G),
      };
    }
    case "ineligible": {
      resetWallPhase(A);
      askResetStatus(getCurrentLimits(), credentials, entry);
      if (L) {
        clearUnsettledClaim(m);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "not_offered",
          text: RESET_GONE_MAYBE_APPLIED_LINE,
        };
      }
      return {
        outcome: "not_offered",
        text: withLimitResetTime(RESET_NOT_AVAILABLE_LINE, currentLimits),
      };
    }
    case "auth_error":
      return {
        outcome: "unavailable",
        text: RESET_LOGIN_ERROR_LINE,
      };
    case "rate_limited":
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(
          L ? cedarEmberCopy.unconfirmedLine : cedarEmberCopy.unavailableLine,
          G,
        ),
      };
    case "unavailable":
    case "error": {
      recordUnsettledClaim(m, id, I, A.accountEpoch);
      let R = resettableLimitTypes(O.cleared);
      if (R.length > 0) {
        forgetHeldWindows(R);
        if (R.includes(A.rateLimitType)) probeOrFireQuotaResume(credentials);
      }
      resetWallPhase(A);
      askResetStatus(getCurrentLimits(), credentials, entry);
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(
          L ? cedarEmberCopy.stillUnconfirmedLine : cedarEmberCopy.unconfirmedLine,
          G,
        ),
      };
    }
  }
}
//@ chunk-fm6h4dv7.js:30155-30240 placement
function earlyUsePercentUsedMax(i) {
  return i.origin === "anytime" ? (i.earlyUse?.percentUsedMax ?? undefined) : undefined;
}
//@ chunk-fm6h4dv7.js:30240-30302 placement
function hasEarlyUse(i) {
  return i.origin === "anytime" && i.earlyUse !== null;
}
//@ chunk-fm6h4dv7.js:30302-32325 placement
/**
 * 未达上限时提前领取重置。
 */
async function claimResetEarly(i, credentials, d) {
  let m = usageCreditStateSlots();
  let cedarEmberCopy = getCedarEmberCopy();
  let configVersion = cedarEmberVersion();
  let id = d.grant.id;
  let unsettledClaimEpoch = getLimitsAccountEpoch();
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: true,
    entry: fromEnum(i),
    grant_id: sanitizeMarkName(id),
    kind: fromEnum(d.kind),
    at_limit: d.atLimit,
    early_use: hasEarlyUse(d),
    percent_used_max: earlyUsePercentUsedMax(d),
    config_version: configVersion,
  });
  let now = Date.now();
  let k = isClaimForGrant(m, id);
  let T = claimRequestIdFor(m, id);
  let x = (await withDeadline(claimCedarEmberGrant(credentials, id, T), RETRY_MAX_MS)) ?? {
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
      grant_id: sanitizeMarkName(id),
      kind: fromEnum(d.kind),
      resets_left: x.resetsLeft ?? undefined,
      cleared: fromEnumArr(x.cleared),
      at_limit: d.atLimit,
      early_use: hasEarlyUse(d),
      percent_used_max: earlyUsePercentUsedMax(d),
      latency_ms: Date.now() - now,
      config_version: configVersion,
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
  let L = d.resetsLeft - d.grant.resetsLeft;
  let I = x.resetsLeft ?? (x.result === "already_used" ? 0 : Math.max(0, d.grant.resetsLeft - 1));
  let O = {
    ...resetOfferFields(d),
    left: L + I,
    kindResets: formatResetCount(d.kind, L + I),
    week: latestGrantEndLine(x.weeklyResetsAt ?? d.weeklyResetsAt),
  };
  switch (x.result) {
    case "reset": {
      clearUnsettledClaim(m);
      dropUnusedResetCache();
      let D = resettableLimitTypes(x.cleared);
      if (D.length > 0) forgetHeldWindows(D);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "reset",
        text: formatLimitResetTemplate(cedarEmberCopy.successLine, O),
      };
    }
    case "not_limited":
      clearUnsettledClaim(m);
      if (k) {
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "not_offered",
          text: RESET_GONE_MAYBE_APPLIED_LINE,
        };
      }
      return {
        outcome: "not_offered",
        text: RESET_ONLY_AT_LIMIT_LINE,
      };
    case "cooldown":
      if (!k) clearUnsettledClaim(m);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "unavailable",
        text: k ? EARLIER_RESET_PENDING_LINE : OTHER_RESET_STARTED_UNUSED_LINE,
      };
    case "already_used":
      if (k) {
        clearUnsettledClaim(m);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "spent",
          text: EARLIER_RESET_WENT_THROUGH_LINE,
        };
      }
      return {
        outcome: "spent",
        text: formatLimitResetTemplate(
          d.totalResetsLeft - d.grant.resetsLeft > 0
            ? `${RESET_ALREADY_USED_LINE} \xB7 ${RUN_RESET_AGAIN_LINE}`
            : RESET_ALREADY_USED_LINE,
          O,
        ),
      };
    case "ineligible":
      if (k) {
        clearUnsettledClaim(m);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "not_offered",
          text: RESET_GONE_MAYBE_APPLIED_LINE,
        };
      }
      return {
        outcome: "not_offered",
        text: RESET_NOT_AVAILABLE_LINE,
      };
    case "auth_error":
      return {
        outcome: "unavailable",
        text: RESET_LOGIN_ERROR_LINE,
      };
    case "rate_limited":
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(
          k ? cedarEmberCopy.unconfirmedAnytimeLine : cedarEmberCopy.unavailableLine,
          O,
        ),
      };
    case "unavailable":
    case "error": {
      recordUnsettledClaim(m, id, T, unsettledClaimEpoch);
      let D = resettableLimitTypes(x.cleared);
      if (D.length > 0) forgetHeldWindows(D);
      if (D.length > 0 || k) probeOrFireQuotaResume(credentials);
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(
          k ? cedarEmberCopy.stillUnconfirmedLine : cedarEmberCopy.unconfirmedAnytimeLine,
          O,
        ),
      };
    }
  }
}
//@ chunk-fm6h4dv7.js:32325-33122 placement
/**
 * 重置流程的提示文本。
 */
var RESET_MESSAGES = "No reset to use";
var NOT_AT_LIMIT_LINE = "you're not at a usage limit right now";
var RESET_NOT_FOR_THIS_LIMIT_LINE = "Your reset can't be used for this limit right now";
var RESETS_REFILL_NOTHING_LINE = "None of your resets refill your";
var NO_FABLE_USAGE_LINE = "no Fable usage this week to give back";
var RESET_USED_STILL_LIMITED_LINE =
  "{Kind} used \xB7 you're still at your {limit} until {date} \xB7 {kindResets} left";
var RESET_NO_LONGER_OFFERED_LINE = "Your {kind} is no longer on offer \xB7 nothing was used";
var LIMIT_MAY_HAVE_LIFTED_LINE = `This limit may have lifted already \xB7 checking your limits now \xB7 run /${LIMIT_RESET} again in a moment to use your reset anyway`;
var SAVED_RESET_AT_LIMIT_LINE = `You have a reset saved for when you reach a usage limit \xB7 run /${LIMIT_RESET} when you do`;
var RESET_UNAVAILABLE_LINE = "Your reset can't be used right now";
var LOW_PRIORITY_RESETS_BLOCKED_LINE = `Resets can't be used while you continue at lower priority \xB7 run /${LIMIT_RESET} after that ends`;
var RESET_ONLY_AT_LIMIT_LINE =
  "Your reset only works at a usage limit, and you're not at one now \xB7 nothing was used";
//@ chunk-fm6h4dv7.js:33122-33220 placement
/**
 * 说明「这个重置不补回某个限额，要等它自己重置」。
 */
function noRefillUntilResetLine(i) {
  return `Your reset doesn't refill your ${i}, so it can't be used until that resets`;
}
//@ chunk-fm6h4dv7.js:33220-34433 placement
/**
 * 查询/领取重置的状态文本。
 */
var RESET_STATUS_MESSAGES = "Couldn't check for a reset right now \xB7 try again in a moment";
var CHECKING_FOR_RESET_LINE = "Checking for a reset\u2026";
var RESET_ALREADY_USED_LINE =
  "That reset was already used \xB7 nothing changed just now \xB7 {kindResets} left";
var RUN_RESET_AGAIN_LINE = `run /${LIMIT_RESET} again to use one`;
var RESET_NOT_AVAILABLE_LINE = "This reset isn't available any more \xB7 nothing was used";
var DIFFERENT_RESET_OFFERED_LINE = `A different reset is on offer now \xB7 nothing was used \xB7 run /${LIMIT_RESET} again to see it`;
var LIMIT_ALREADY_RESET_LINE = "Your limit had already reset on its own \xB7 nothing was used";
var LIMITS_CLEAR_LINE = "Your limits are clear";
var OTHER_RESET_STARTED_LINE =
  "Another reset was just started on your account \xB7 checking your limits now \xB7 if you're still at the limit in a minute, try again";
var EARLIER_RESET_PENDING_LINE =
  "Your earlier reset may still be going through \xB7 checking your limits now \xB7 try again in a minute if they aren't refilled";
var OTHER_RESET_STARTED_UNUSED_LINE =
  "Another reset was just started on your account \xB7 this one wasn't used \xB7 try again in a minute";
var EARLIER_RESET_WENT_THROUGH_LINE =
  "Your earlier reset went through after all \xB7 checking your limits now";
var RESET_GONE_MAYBE_APPLIED_LINE =
  "This reset isn't available any more \xB7 your earlier try may have gone through \xB7 checking your limits now";
var SEND_MESSAGE_TO_CONTINUE_LINE = "send a message to continue";
var LIMITS_ALREADY_RESETTING_LINE = "Your limits are already being reset \xB7 one moment";
var RESET_LOGIN_ERROR_LINE = "Couldn't reset your limits with this login \xB7 run /login, then try again";
//@ chunk-fm6h4dv7.js:34433-34472 placement
/**
 * 在重置成功文案后追加「发一条消息继续」。
 */
function appendContinueHint(i) {
  return `${i} \xB7 ${SEND_MESSAGE_TO_CONTINUE_LINE}`;
}
//@ chunk-fm6h4dv7.js:34472-34585 placement
/**
 * 取出并清除“可继续”的墙标记。
 */
function consumeContinuableWall(i, s) {
  let d = cedarEmberAutoContinue() && i.continuableWallResetsAt === s.wallResetsAt;
  i.continuableWallResetsAt = null;
  return d;
}
//@ chunk-fm6h4dv7.js:34585-34849 placement
/**
 * 过滤出可重置的限额类型。
 */
function resettableLimitTypes(cleared) {
  let s = [];
  for (let d of cleared)
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
//@ chunk-fm6h4dv7.js:34849-35084 placement
/**
 * 领取重置后的收尾：取消自动续接、结束低优先级、释放限额、清空状态、发出 reset 事件（每步独立容错）。
 */
function applyClaimedReset(i, s, d, entry, b) {
  let _ = [
    () => cancelQuotaAutoResume("cedar_ember"),
    () => {
      endLowPriority("reset");
    },
    () => releaseClearedLimits(d),
    () => {
      resetWallPhase(s);
      i.wallRecordKey = null;
      i.shownOfferKey = null;
    },
    () => {
      if (b) enqueueAutoContinuation();
    },
    () =>
      i.events.emit({
        type: "reset",
        entry,
      }),
  ];
  for (let h of _)
    try {
      h();
    } catch (error) {
      logError(toError(error));
    }
}
//@ chunk-fm6h4dv7.js:35084-35285 placement
/**
 * 忘记被清除的限额窗口；当前被拒的限额已清除时改为 allowed。
 */
function releaseClearedLimits(i) {
  if (i.length > 0) forgetHeldWindows(i);
  let currentLimits = getCurrentLimits();
  if (
    currentLimits.status !== "rejected" ||
    currentLimits.rateLimitType === undefined ||
    !i.includes(currentLimits.rateLimitType)
  )
    return;
  emitLimitsStatusChange({
    ...currentLimits,
    status: "allowed",
    rateLimitType: undefined,
    resetsAt: undefined,
  });
}
//@ chunk-fm6h4dv7.js:35285-35357 placement
function probeOrFireQuotaResume(i) {
  if (isQuotaAutoResumeArmed()) {
    confirmAndFire();
    return;
  }
  probeQuotaStatusAtStart(i, undefined).catch((error) => {
    logError(toError(error));
  });
}
//@ chunk-fm6h4dv7.js:35357-35501 placement
/**
 * 当前墙已处理时把重置状态置为 idle。
 */
function resetWallPhase(i) {
  let s = currentUsageCreditState();
  if (
    s.phase !== "idle" &&
    s.wall.wallResetsAt === i.wallResetsAt &&
    s.wall.rateLimitType === i.rateLimitType
  )
    setUsageCreditState({
      phase: "idle",
    });
}
//@ chunk-fm6h4dv7.js:35501-35845 placement
/**
 * 更新已答复的重置状态。
 */
function refreshAnsweredStatus(i, id) {
  let d = currentUsageCreditState();
  if (
    d.phase !== "answered" ||
    d.wall.wallResetsAt !== i.wallResetsAt ||
    d.wall.rateLimitType !== i.rateLimitType ||
    d.status === null
  )
    return;
  setUsageCreditState({
    ...d,
    answeredAtMs: now(),
    status: {
      ...d.status,
      nextGrantId: d.status.nextGrantId === id ? null : d.status.nextGrantId,
      grants: d.status.grants.map((grant) =>
        grant.id === id
          ? {
              ...grant,
              resetsLeft: 0,
              usableNow: false,
            }
          : grant,
      ),
    },
  });
}
//@ chunk-fm6h4dv7.js:35845-35979 placement
/**
 * 订阅会话切换以在对话重置时清除可继续标记（只订阅一次）。
 */
function subscribeWallReset(i) {
  if (i.sessionSwitchSubscribed) return;
  i.sessionSwitchSubscribed = true;
  onSessionSwitch((s, d) => {
    if (isConversationResetSwitch(d)) i.continuableWallResetsAt = null;
  });
}
//@ chunk-fm6h4dv7.js:35979-37293 placement
/**
 * juniper_tide（重置额度）状态 schema。
 */
var JUNIPER_TIDE_SCHEMA = "juniper_tide";
var RESET_CLAIM_TIMEOUT_MS = 25000;
var juniperTideEventSchema = DoctorLazy(() =>
  u({
    surface: _enum(["claude_ai", "claude_code_cli", "unknown"]).catch("unknown"),
    tier: _enum(["claude_pro", "claude_max_5x", "claude_max_20x", "unknown"]).catch("unknown"),
    tenure_bucket: _enum(["under_14", "14-29", "30-89", "90-364", "365+", "unknown"]).catch("unknown"),
    billing_path: _enum(["stripe", "apple", "google_play", "other", "unknown"]).catch("unknown"),
    billing_period: _enum(["monthly", "annual", "unknown"]).catch("unknown"),
    extra_usage_state: _enum(["not_configured", "disabled", "enabled", "unknown"]).catch("unknown"),
  }),
);
var juniperTideStatusSchema = DoctorLazy(() =>
  u({
    eligible: M(),
    ineligible_reason: _enum([
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
    arm: _enum(["control", "reset"]).nullable().optional().catch(null),
    available: M().optional(),
    next_available_at: string().nullable().optional().catch(null),
    weekly_resets_at: string().nullable().optional().catch(null),
    resets_per_week: E().optional().catch(undefined),
    event_props: juniperTideEventSchema().nullable().optional().catch(null),
  }),
);
var juniperTideClaimResultSchema = DoctorLazy(() =>
  u({
    result: _enum(["reset", "already_used", "not_limited", "ineligible", "unavailable"]).catch("unavailable"),
    next_available_at: string().nullable().optional().catch(null),
    weekly_resets_at: string().nullable().optional().catch(null),
  }),
);
//@ chunk-fm6h4dv7.js:37293-37933 placement
/**
 * 解析 juniper_tide 状态块。
 */
function parseJuniperTideStatus(juniperTide) {
  if (juniperTide === undefined || juniperTide === null) return null;
  let s = juniperTideStatusSchema().safeParse(juniperTide);
  if (!s.success) {
    logForDebugging(`[juniper-tide] ignoring a malformed status block: ${s.error.message}`);
    return null;
  }
  let d = s.data;
  let eventProps = d.event_props;
  return {
    eligible: d.eligible,
    ineligibleReason: d.ineligible_reason ?? null,
    inExperiment: d.in_experiment ?? false,
    arm: d.arm ?? null,
    available: d.available ?? false,
    nextAvailableAt: d.next_available_at ?? null,
    weeklyResetsAt: d.weekly_resets_at ?? null,
    resetsPerWeek: d.resets_per_week ?? 1,
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
//@ chunk-fm6h4dv7.js:37933-38373 placement
/**
 * 获取限额重置状态。
 */
async function fetchJuniperTideStatus(i) {
  try {
    if (!hasProfileScope())
      return {
        kind: "no_profile_scope",
      };
    let utilization = await fetchUtilization(i, {
      read: "at_wall",
    });
    if (!hasUsageLimitKeys(utilization)) {
      logForDebugging("[juniper-tide] status fetch returned a fieldless or non-object body (in-band error)", {
        level: "warn",
      });
      return {
        kind: "failed",
      };
    }
    return {
      kind: "answered",
      status: parseJuniperTideStatus(utilization?.juniper_tide),
    };
  } catch (error) {
    logForDebugging(`[juniper-tide] status fetch failed: ${toError(error).message}`, {
      level: "warn",
    });
    if (isAuthRejectedUsageError(error))
      return {
        kind: "answered",
        status: null,
      };
    return {
      kind: "failed",
    };
  }
}
//@ chunk-fm6h4dv7.js:38373-39539 placement
/**
 * 调用 /api/organizations/{org}/reset_rate_limit 领取重置。
 */
async function claimJuniperTide(credentials) {
  let organizationUuid = getOauthAccountInfo()?.organizationUuid;
  if (!organizationUuid) {
    logForDebugging("[juniper-tide] no OAuth organization; cannot claim");
    return {
      result: "auth_error",
      nextAvailableAt: null,
    };
  }
  try {
    let d = await withOAuth401Retry(
      () =>
        apiClient.post(
          `/api/organizations/${organizationUuid}/reset_rate_limits`,
          {
            program: JUNIPER_TIDE_SCHEMA,
          },
          {
            auth: "async",
            headers: {
              "Content-Type": "application/json",
            },
            timeout: RESET_CLAIM_TIMEOUT_MS,
            refreshOAuth: true,
            credentials,
          },
        ),
      {
        credentials,
      },
    );
    if (!d.ok) {
      logForDebugging(`[juniper-tide] claim not sent: ${d.reason === "no-auth" ? d.detail : d.reason}`, {
        level: "warn",
      });
      return {
        result: d.reason === "no-auth" ? "auth_error" : "error",
        nextAvailableAt: null,
      };
    }
    let m = juniperTideClaimResultSchema().safeParse(d.data);
    if (!m.success) {
      logForDebugging(`[juniper-tide] unreadable claim response: ${m.error.message}`, {
        level: "error",
      });
      logError(Error("[juniper-tide] unreadable claim response"));
      return {
        result: "error",
        nextAvailableAt: null,
      };
    }
    return {
      result: m.data.result,
      nextAvailableAt: m.data.next_available_at ?? null,
    };
  } catch (error) {
    if (isExpectedApiError(error))
      logForDebugging(`[juniper-tide] claim failed: ${toError(error).message}`, {
        level: "warn",
      });
    else logError(toError(error));
    if (isAxiosError(error))
      switch (error.response?.status) {
        case 429:
          return {
            result: "rate_limited",
            nextAvailableAt: null,
          };
        case 401:
        case 403:
          return {
            result: "auth_error",
            nextAvailableAt: null,
          };
        default:
          break;
      }
    return {
      result: "error",
      nextAvailableAt: null,
    };
  }
}
//@ chunk-fm6h4dv7.js:39539-39746 placement
/**
 * 重置流程的初始状态。
 */
function createResetFlowState() {
  return {
    state: {
      phase: "idle",
    },
    shownWallResetsAt: null,
    pendingAsk: null,
    claiming: false,
    continuableWallResetsAt: null,
    unsettledClaimWallResetsAt: null,
    sessionSwitchSubscribed: false,
    changed: createSignal(),
    events: createSignal(),
  };
}
//@ chunk-fm6h4dv7.js:39746-39763 placement
/**
 * 按 host 隔离的重置流程状态容器。
 */
var resetFlowStateSlots = new HostScoped(createResetFlowState);
//@ chunk-fm6h4dv7.js:39763-39799 placement
/**
 * 取当前 host 的重置流程状态容器。
 */
function currentResetFlowState() {
  return resetFlowStateSlots.of(getRootSession().host);
}
//@ chunk-fm6h4dv7.js:39799-39830 placement
/**
 * 当前的重置流程状态（阶段、墙重置点、状态文本等）。
 */
function getResetFlowPhase() {
  return currentResetFlowState().state;
}
//@ chunk-fm6h4dv7.js:39830-39882 placement
/**
 * 写入重置流程状态并发出变更信号。
 */
function setResetFlowState(state) {
  let s = currentResetFlowState();
  s.state = state;
  s.changed.emit();
}
//@ chunk-fm6h4dv7.js:39882-39930 placement
/**
 * 订阅重置状态变化。
 */
function subscribeResetChanges(i) {
  return currentResetFlowState().changed.subscribe(i);
}
//@ chunk-fm6h4dv7.js:39930-39977 placement
/**
 * 订阅重置流程事件（用于界面刷新）。
 */
function onResetFlowEvent(i) {
  return currentResetFlowState().events.subscribe(i);
}
//@ chunk-fm6h4dv7.js:39977-40004 placement
var MAX_STATUS_ATTEMPTS = 3;
var STATUS_RETRY_DELAY_MS = 12000;
var STATUS_REQUEST_TIMEOUT_MS = 35000;
//@ chunk-fm6h4dv7.js:40004-40079 placement
/**
 * 当前重置流程记录是否对应该墙（重置点相同且账号 epoch 未变）。
 */
function isFlowForWall(i, s) {
  return s.resetsAt === i.wallResetsAt && i.accountEpoch === getLimitsAccountEpoch();
}
//@ chunk-fm6h4dv7.js:40079-40158 placement
/**
 * 该墙的重置流程已答复时返回其状态文本。
 */
function answeredStatusForWall(i) {
  let resetFlowPhase = getResetFlowPhase();
  return resetFlowPhase.phase === "answered" && isFlowForWall(resetFlowPhase, i)
    ? resetFlowPhase.status
    : undefined;
}
//@ chunk-fm6h4dv7.js:40158-40219 placement
/**
 * 该墙的重置流程是否处于失败阶段。
 */
function isFailedForWall(currentLimits) {
  let resetFlowPhase = getResetFlowPhase();
  return resetFlowPhase.phase === "failed" && isFlowForWall(resetFlowPhase, currentLimits);
}
//@ chunk-fm6h4dv7.js:40219-40379 placement = getMockStatus (0.387)
/**
 * 被拒且可在重置点提供低优先级等待时为真。旧版名错配；疑似归错文件。
 */
function canArmLowPriorityReset(i, s = Date.now()) {
  let timestamp = answeredStatusForWall(i);
  return (
    isFiveHourAutoResumable(i) &&
    timestamp !== undefined &&
    timestamp !== null &&
    timestamp.arm === "reset" &&
    timestamp.available &&
    i.resetsAt !== undefined &&
    i.resetsAt * 1000 > s &&
    !isLowPriorityActive() &&
    isLimitResetEnabled()
  );
}
export {
  onResetFlowEvent,
  offerResetAtWallFromMenu,
  offerCreditsResetAtWall,
  availableResetOffers,
  resetOfferFields,
  resetsUsedUpLine,
  isClaimingReset,
  subscribeResetChanges,
  canArmLowPriorityReset,
  reportResetOfferShown,
  getResetFlowPhase,
  isResetOfferAvailable,
  hasResetGrantCoveringLatestEnd,
  resetOfferLabel,
  refreshResetStatusForDialog,
  startResetFlowSafe,
  RESET_STATUS_MESSAGES,
  CHECKING_FOR_RESET_LINE,
  answeredStatusForWall,
  currentResetFlowState,
  isFlowForWall,
  MAX_STATUS_ATTEMPTS,
  setResetFlowState,
  fetchJuniperTideStatus,
  STATUS_RETRY_DELAY_MS,
  isFailedForWall,
  claimJuniperTide,
  STATUS_REQUEST_TIMEOUT_MS,
  earlyUseLine,
  reportResetDeclined,
  claimReset,
  keepResetForLater,
  reportResetSelected,
};
