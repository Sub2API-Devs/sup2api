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
import {
  objectSchema,
  _enum,
  booleanSchema,
  stringSchema,
  numberSchema,
} from "../../../vendor/zod/v4/classic/schemas.js";
import { logForDebugging } from "../../utils/debug.js";
import { hasProfileScope, getOauthAccountInfo } from "../../utils/auth.js";
import { fetchUtilization, hasUsageLimitKeys, isAuthRejectedUsageError } from "../api/usage.js";
import { withOAuth401Retry } from "../../utils/http.js";
import { apiClient } from "../routines/routinesApi.js";
import { isAxiosError } from "../../../vendor/axios/dist/esm/axios.js";
import { createSignal } from "../../utils/signal.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fm6h4dv7.js:10953-10984 placement
function now() {
  return Date.now();
}
//@ chunk-fm6h4dv7.js:10984-11306 placement
/**
 * 是否需要重新查询重置资格。
 */
function shouldRecheckResetStatus(offer, limits, surface, nowMs) {
  if (offer.final) return false;
  let ageMs = nowMs - offer.answeredAtMs;
  let isOlderThan = (thresholdMs) => ageMs < 0 || ageMs >= thresholdMs;
  if (firstAvailableResetOffer(limits, nowMs) !== undefined) return false;
  let timestampOrUndefined = parseTimestampOrUndefined(offer.status?.cooldownUntil ?? null);
  let shouldRetry =
    ageMs < 0 ||
    (ageMs >= RETRY_BACKOFF_MS &&
      (timestampOrUndefined === undefined ||
        nowMs >= Math.min(timestampOrUndefined, offer.answeredAtMs + 150000)));
  switch (surface) {
    case "wall":
      return isOlderThan(POLL_INTERVAL_MS);
    case "command":
      return shouldRetry;
    case "dialog":
      return shouldRetry && (offer.status === null || hasPendingGrants(limits));
  }
}
//@ chunk-fm6h4dv7.js:11306-11705 placement
/**
 * 按种类汇总可用的限额重置授权。
 */
function groupResetGrants(limits, limitType, nowMs) {
  let groupsByKind = new Map();
  for (let grant of limits.grants) {
    if (!isUsableLimit(grant)) continue;
    let limitResetKind = getLimitResetKind(grant);
    let group = groupsByKind.get(limitResetKind) ?? {
      kind: limitResetKind,
      grants: [],
      resetsLeft: 0,
      target: undefined,
    };
    groupsByKind.set(limitResetKind, group);
    group.grants.push(grant);
    group.resetsLeft += grant.resetsLeft;
    let endsAtMs = parseTimestampOrUndefined(grant.endsAt) ?? null;
    if (
      group.target === undefined &&
      grant.usableNow &&
      (endsAtMs === null || endsAtMs > nowMs) &&
      (limitType === null || (clearsLimit(grant, limitType) && !isGrantUsable(grant, limits)))
    )
      group.target = {
        grant,
        endsAtMs,
      };
  }
  return [...groupsByKind.values()].sort(
    (a, b) => rankResetKindForLimit(a.kind, limitType) - rankResetKindForLimit(b.kind, limitType),
  );
}
//@ chunk-fm6h4dv7.js:11705-12155 placement
/**
 * 当前达到上限时可用的重置提议。
 */
function availableResetOffers(limits, nowMs = Date.now()) {
  let status = usableStatusForWall(limits);
  if (
    !canAutoResumeLimitType(limits) ||
    status === undefined ||
    status === null ||
    limits.rateLimitType === undefined ||
    limits.resetsAt === undefined ||
    limits.resetsAt * 1000 <= nowMs ||
    isLowPriorityActive() ||
    !isCedarEmberEnabled()
  )
    return [];
  let rateLimitType = limits.rateLimitType;
  let totalLeft = totalResetsLeft(status);
  let offers = [];
  for (let group of groupResetGrants(status, rateLimitType, nowMs))
    if (group.target !== undefined)
      offers.push({
        origin: "wall",
        kind: group.kind,
        grant: group.target.grant,
        resetsLeft: Math.max(1, group.resetsLeft),
        totalResetsLeft: Math.max(1, totalLeft),
        weeklyResetsAt: status.weeklyResetsAt,
        endsAtMs: group.target.endsAtMs,
        rateLimitType,
      });
  return offers;
}
//@ chunk-fm6h4dv7.js:12155-12202 placement
function firstAvailableResetOffer(limits, nowMs = Date.now()) {
  return availableResetOffers(limits, nowMs)[0];
}
//@ chunk-fm6h4dv7.js:12202-12332 placement
/**
 * 当前限额下不能使用的重置及原因。
 */
function unusableResetsFor(limits, nowMs = Date.now()) {
  let status = usableStatusForWall(limits);
  if (status === undefined || status === null || limits.rateLimitType === undefined) return [];
  return unusableResetOffers(status, limits.rateLimitType, nowMs);
}
//@ chunk-fm6h4dv7.js:12332-12673 placement
/**
 * 不能用于当前限额的重置及原因。
 */
function unusableResetOffers(limits, rateLimitType, nowMs) {
  let offers = [];
  for (let group of groupResetGrants(limits, rateLimitType, nowMs)) {
    let firstGrant = group.grants[0];
    if (group.target !== undefined || group.resetsLeft === 0 || !firstGrant) continue;
    let reason =
      rateLimitType !== null && !group.grants.some((grant) => clearsLimit(grant, rateLimitType))
        ? `doesn't refill your ${resetLimitDisplayName(rateLimitType)}`
        : describeResetUnavailable(firstGrant, limits);
    let kindName = formatResetKindName(group.kind);
    offers.push({
      kind: group.kind,
      resetsLeft: group.resetsLeft,
      reason,
      text: `${kindName.charAt(0).toUpperCase()}${kindName.slice(1)} \xB7 ${reason}`,
    });
  }
  return offers;
}
//@ chunk-fm6h4dv7.js:12673-13325 placement
/**
 * 重置不可用的原因码。
 */
function resetUnavailableReason(grant, limits) {
  if (grant.unavailableReason !== null) return grant.unavailableReason;
  if (limits.cooldownUntil !== null) return "cooldown";
  for (let blocking of grant.blocking)
    switch (blocking) {
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
  if (grant.blocking.length > 0) return "blocked_other";
  if (
    limits.atLimit &&
    !limits.exhausted.some(
      (limitType) => grant.clears.includes(limitType) || (limitType === "seven_day" && grant.givesBackWeekly),
    )
  )
    return "cannot_clear";
  return grant.useRequiresLimit ? "needs_limit" : "unavailable";
}
//@ chunk-fm6h4dv7.js:13325-14034 placement
/**
 * 重置不可用原因的说明。
 */
function describeResetUnavailable(grant, limits) {
  switch (resetUnavailableReason(grant, limits)) {
    case "cooldown":
      return "try again in a minute";
    case "blocked_five_hour":
      return `can't be used while you're at your ${getRateLimitDisplayName("five_hour")}`;
    case "blocked_seven_day":
      return grant.givesBackWeekly
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
function resetOfferLabel(offer) {
  let cedarEmberCopy = getCedarEmberCopy();
  let label = formatLimitResetTemplate(cedarEmberCopy.label, resetOfferFields(offer));
  return offer.kind === "fable" && offer.origin === "wall" && offer.rateLimitType === "seven_day"
    ? `${label} \xB7 ${cedarEmberCopy.fableAtWeeklySuffix}`
    : label;
}
//@ chunk-fm6h4dv7.js:14195-14258 placement
function totalResetsLeft(limits) {
  return limits.grants.reduce((acc, grant) => acc + grant.resetsLeft, 0);
}
//@ chunk-fm6h4dv7.js:14258-14383 placement
/**
 * 重置额度可直接使用：不要求先触达限额，且清除的限额都未耗尽。
 */
function isGrantUsable(grant, limits) {
  return (
    !grant.useRequiresLimit &&
    !limits.exhausted.some(
      (limitType) => grant.clears.includes(limitType) || (limitType === "seven_day" && grant.givesBackWeekly),
    )
  );
}
//@ chunk-fm6h4dv7.js:14383-14855 placement
/**
 * 重置相关的用量标识。
 */
function resetUsageBadge(grant, limits) {
  if (!isGrantUsable(grant, limits)) return null;
  let best = null;
  for (let claimType of CREDIT_RESETTABLE_LIMIT_TYPES) {
    let percentUsed = grant.percentUsed[claimType];
    if (
      grant.clears.includes(claimType) &&
      percentUsed !== undefined &&
      (best === null || percentUsed > best.percentUsed)
    )
      best = {
        claimType,
        percentUsed,
      };
  }
  if (best === null)
    return {
      kind: "unnumbered",
      percentUsedMax: null,
    };
  let limitName = limitDisplayName(best.claimType);
  if (limitName === null || best.percentUsed >= 100)
    return {
      kind: "unnumbered",
      percentUsedMax: best.percentUsed,
    };
  return {
    kind: "numbered",
    percentLeft: 100 - best.percentUsed,
    claimType: best.claimType,
    limitName,
    percentUsedMax: best.percentUsed,
  };
}
//@ chunk-fm6h4dv7.js:14855-14913 placement
function resetLimitDisplayName(rateLimitType) {
  return rateLimitType === "seven_day_sonnet"
    ? getWeeklyModelLimitName()
    : getRateLimitDisplayName(rateLimitType);
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
  let state = usageCreditStateSlots();
  return (
    state.claiming ||
    (state.unsettledClaimGrantId !== null &&
      state.unsettledClaimEpoch === getLimitsAccountEpoch() &&
      hasRecentUnsettledClaim(state))
  );
}
//@ chunk-fm6h4dv7.js:15460-15513 placement
/**
 * 判断额度墙上是否可提供重置。
 */
function isResetOfferAvailable(limits, nowMs = Date.now()) {
  return firstAvailableResetOffer(limits, nowMs) !== undefined;
}
//@ chunk-fm6h4dv7.js:15513-15761 placement
/**
 * 重置用完时的说明行。
 */
function resetsUsedUpLine(limits, nowMs = Date.now()) {
  let status = usableStatusForWall(limits);
  if (
    !canAutoResumeLimitType(limits) ||
    status === undefined ||
    status === null ||
    !status.eligible ||
    status.grants.length === 0 ||
    status.grants.some((grant) => grant.resetsLeft > 0 || grant.usableNow) ||
    limits.resetsAt === undefined ||
    limits.resetsAt * 1000 <= nowMs ||
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
function hasResetGrantCoveringLatestEnd(limits, nowMs = Date.now()) {
  return getLatestResetGrantEnd(usableStatusForWall(limits), nowMs) !== undefined;
}
//@ chunk-fm6h4dv7.js:15819-15956 placement
/**
 * 有资格、当前无可用额度但仍有剩余重置次数。
 */
function hasPendingGrants(limits) {
  let status = usableStatusForWall(limits);
  return (
    status !== undefined &&
    status !== null &&
    status.eligible &&
    !status.grants.some((grant) => grant.usableNow) &&
    status.grants.some((grant) => grant.resetsLeft > 0)
  );
}
//@ chunk-fm6h4dv7.js:15956-16296 placement
/**
 * 重置提议的显示字段。
 */
function resetOfferFields(offer) {
  return {
    kind: formatResetKindName(offer.kind),
    left: offer.resetsLeft,
    kindResets: formatResetCount(offer.kind, offer.resetsLeft),
    date: latestGrantStartLine(offer.grant.endsAt),
    deadline: latestGrantEndLine(offer.grant.endsAt),
    week: latestGrantEndLine(offer.weeklyResetsAt),
    limits: resetClearsLimits(offer.grant),
    returns: limitDescription(offer.kind),
    done: formatResetAppliedText(offer.kind),
    ...(offer.origin === "anytime" &&
      offer.earlyUse?.kind === "numbered" && {
        percent: offer.earlyUse.percentLeft,
        limit: offer.earlyUse.limitName,
      }),
  };
}
//@ chunk-fm6h4dv7.js:16296-16859 placement
/**
 * 重置能清除哪些限额。
 */
function resetClearsLimits(grant) {
  let names = new Set();
  if (grant.givesBackWeekly) names.add("Fable");
  for (let clear of grant.clears)
    switch (clear) {
      case "five_hour":
        names.add("5-hour");
        break;
      case "seven_day":
        names.add("weekly");
        break;
      case "seven_day_overage_included":
        names.add(grant.givesBackWeekly ? "Fable" : "weekly");
        break;
      case "seven_day_opus":
        names.add(stripSuffix(getRateLimitDisplayName(clear), " limit"));
        break;
      case "seven_day_sonnet":
        names.add(stripSuffix(getWeeklyModelLimitName(), " limit"));
        break;
      case "seven_day_cowork":
      case "seven_day_omelette":
      case "seven_day_oauth_apps":
        break;
    }
  let listed = [...names];
  let lastName = listed.pop();
  if (lastName === undefined) return "limits";
  return listed.length === 0 ? `${lastName} limit` : `${listed.join(", ")} and ${lastName} limits`;
}
//@ chunk-fm6h4dv7.js:16859-16944 placement
function latestGrantStartLine(endsAt) {
  let timestampOrUndefined = parseTimestampOrUndefined(endsAt);
  return timestampOrUndefined === undefined
    ? undefined
    : formatResetTimeWithLocale(Math.floor(timestampOrUndefined / 1000), false, false, true);
}
//@ chunk-fm6h4dv7.js:16944-17029 placement
function latestGrantEndLine(endsAt) {
  let timestampOrUndefined = parseTimestampOrUndefined(endsAt);
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
function offerResetAtWallFromMenu(limits, credentials) {
  if (!isResetAtWallOffered() || !canAutoResumeLimitType(limits)) return;
  askResetAtWall(limits, credentials, "cli_menu");
}
//@ chunk-fm6h4dv7.js:17136-17268 placement
/**
 * 周限额（含超额）触墙时询问可用的重置。
 */
function offerCreditsResetAtWall(credentials) {
  let limits = getCurrentLimits();
  if (
    !isCedarEmberEnabled() ||
    limits.rateLimitType !== "seven_day_overage_included" ||
    !canAutoResumeLimitType(limits)
  )
    return;
  askResetAtWall(limits, credentials, "cli_credits_required");
}
//@ chunk-fm6h4dv7.js:17268-17400 placement
/**
 * 在限额墙询问重置状态（订阅会话切换、清理过期的未结算领取）。
 */
function askResetAtWall(limits, credentials, surface) {
  let state = usageCreditStateSlots();
  subscribeWallReset(state);
  state.continuableWallResetsAt = limits.resetsAt ?? null;
  if (state.unsettledClaimEpoch !== getLimitsAccountEpoch()) clearUnsettledClaim(state);
  askResetStatus(limits, credentials, "wall", surface);
}
//@ chunk-fm6h4dv7.js:17400-18383 placement
/**
 * 查询重置资格（按阶段去重）。
 */
function askResetStatus(limits, credentials, surfaceKind, eventSurface) {
  if (surfaceKind === "wall" ? !isResetAtWallOffered() : !isCedarEmberEnabled()) return Promise.resolve();
  let wall = captureWallResetIdentity(limits);
  if (wall === null) return Promise.resolve();
  let creditState = usageCreditStateSlots();
  if (eventSurface !== undefined)
    creditState.wallSurface = {
      wall,
      surface: eventSurface,
    };
  let state = creditState.state;
  let failures = 0;
  let previous = null;
  if (state.phase !== "idle" && isSameWallReset(state.wall, limits))
    switch (state.phase) {
      case "answered":
        if (!shouldRecheckResetStatus(state, limits, surfaceKind, now())) return Promise.resolve();
        previous = state;
        break;
      case "asking":
        return creditState.pendingAsk ?? Promise.resolve();
      case "failed":
        if (surfaceKind === "wall" && state.failures >= MAX_ATTEMPTS) return Promise.resolve();
        failures = state.failures;
    }
  setUsageCreditState({
    phase: "asking",
    wall,
  });
  let autoArmed = isQuotaAutoResumeArmed();
  let surface =
    eventSurface ??
    (creditState.wallSurface !== null && isSameWallReset(creditState.wallSurface.wall, limits)
      ? creditState.wallSurface.surface
      : "cli_menu");
  let ask = withDeadline(
    fetchCedarEmberStatus(credentials, {
      surface,
    }),
    RETRY_AFTER_MS,
  )
    .then((answer) => {
      settleResetStatus({
        wall,
        failures,
        previous,
        result: answer ?? {
          kind: "failed",
        },
        autoArmed,
      });
      if (
        answer !== undefined &&
        answer.kind === "answered" &&
        answer.status?.ineligibleReason !== "unavailable"
      )
        settleUnsettledClaim(creditState, answer.status, credentials);
    })
    .catch((error) => {
      logError(toError(error));
      try {
        settleResetStatus({
          wall,
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
      if (creditState.pendingAsk === ask) creditState.pendingAsk = null;
    });
  creditState.pendingAsk = ask;
  return ask;
}
//@ chunk-fm6h4dv7.js:18383-20100 placement
/**
 * 处理重置资格查询结果。
 */
function settleResetStatus({ wall, failures, previous, result: askResult, autoArmed }) {
  let state = currentUsageCreditState();
  if (
    state.phase !== "asking" ||
    state.wall.rateLimitType !== wall.rateLimitType ||
    state.wall.wallResetsAt !== wall.wallResetsAt ||
    state.wall.accountEpoch !== wall.accountEpoch
  )
    return;
  let status = askResult.kind === "answered" ? askResult.status : null;
  let isFailure = askResult.kind === "failed" || status?.ineligibleReason === "unavailable";
  if (isFailure && previous !== null)
    setUsageCreditState({
      ...previous,
      answeredAtMs: now(),
    });
  else if (isFailure)
    setUsageCreditState({
      phase: "failed",
      wall,
      failures: failures + 1,
    });
  else {
    let isFinal = askResult.kind === "no_profile_scope" || askResult.kind === "not_authorized";
    setUsageCreditState(
      isFinal
        ? {
            phase: "answered",
            wall,
            status,
            answeredAtMs: now(),
            final: isFinal,
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
    outcome: fromEnum(resetFlowPhase(askResult)),
    at_wall: true,
    attempt: failures + 1,
    eligible: status?.eligible ?? false,
    ineligible_reason: fromEnumOpt(status?.ineligibleReason),
    limit_type: fromEnum(wall.rateLimitType),
    config_version: configVersion,
  });
  if (isFailure || status === null || !status.eligible) return;
  let creditState = usageCreditStateSlots();
  let recordKey = `${wall.accountEpoch}:${wall.rateLimitType}:${wall.wallResetsAt}:${status.eligible}:${status.nextGrantId}`;
  if (creditState.wallRecordKey === recordKey) return;
  creditState.wallRecordKey = recordKey;
  let filtered = groupResetGrants(status, wall.rateLimitType, now()).filter(
    (group) => group.target !== undefined,
  );
  let grant = filtered[0]?.target?.grant;
  logEvent("tengu_cedar_ember_wall", {
    eligible: status.eligible,
    at_limit: status.atLimit,
    usable: grant !== undefined,
    grant_id: sanitizeMarkName(grant?.id ?? status.nextGrantId),
    kind: fromEnumOpt(grant && getLimitResetKind(grant)),
    kinds_offered: fromEnumArr(filtered.map((group) => group.kind)),
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
function settleUnsettledClaim(state, status, credentials) {
  if (state.unsettledClaimGrantId === null) return;
  if (state.unsettledClaimEpoch !== getLimitsAccountEpoch()) {
    clearUnsettledClaim(state);
    return;
  }
  if (status?.grants.some((grant) => grant.id === state.unsettledClaimGrantId && grant.usableNow)) return;
  probeOrFireQuotaResume(credentials);
  if (status !== null && !isCooldownActive(status)) clearUnsettledClaim(state);
}
//@ chunk-fm6h4dv7.js:20310-20324 placement
var UNRESOLVED_CLAIM_TTL_MS = 600000;
//@ chunk-fm6h4dv7.js:20324-20403 placement
function hasRecentUnsettledClaim(state) {
  return state.unsettledClaimAtMs !== null && now() - state.unsettledClaimAtMs < UNRESOLVED_CLAIM_TTL_MS;
}
//@ chunk-fm6h4dv7.js:20403-20485 placement
function resetFlowPhase(result) {
  return result.kind === "answered" ? (result.status === null ? "absent" : "block") : result.kind;
}
//@ chunk-fm6h4dv7.js:20485-20574 placement
function isClaimForGrant(state, id) {
  return (
    state.unsettledClaimGrantId === id &&
    state.unsettledClaimEpoch === getLimitsAccountEpoch() &&
    hasRecentUnsettledClaim(state)
  );
}
//@ chunk-fm6h4dv7.js:20574-20701 placement
/**
 * 清空未结算的重置领取记录。
 */
function clearUnsettledClaim(state) {
  state.unsettledClaimGrantId = null;
  state.unsettledClaimRequestId = null;
  state.unsettledClaimEpoch = null;
  state.unsettledClaimAtMs = null;
}
//@ chunk-fm6h4dv7.js:20701-20858 placement
/**
 * 记录一次未结算的重置领取（额度 id、请求 id、账号代数、时间）。
 */
function recordUnsettledClaim(state, unsettledClaimGrantId, requestId, unsettledClaimEpoch) {
  if (state.unsettledClaimRequestId !== requestId) state.unsettledClaimAtMs = now();
  state.unsettledClaimGrantId = unsettledClaimGrantId;
  state.unsettledClaimRequestId = requestId;
  state.unsettledClaimEpoch = unsettledClaimEpoch;
}
//@ chunk-fm6h4dv7.js:20858-20955 placement
function claimRequestIdFor(state, id) {
  return isClaimForGrant(state, id) && state.unsettledClaimRequestId !== null
    ? state.unsettledClaimRequestId
    : randomUUID();
}
//@ chunk-fm6h4dv7.js:20955-21404 placement
/**
 * 首次显示重置提议时上报。
 */
function reportResetOfferShown(limits, surface) {
  let offers = availableResetOffers(limits);
  let [firstOffer] = offers;
  if (firstOffer === undefined || limits.resetsAt === undefined) return;
  let offerKey = `${firstOffer.rateLimitType}:${limits.resetsAt}:${offers.map((offer) => offer.grant.id).join(",")}`;
  let creditState = usageCreditStateSlots();
  if (creditState.shownOfferKey === offerKey) return;
  creditState.shownOfferKey = offerKey;
  logEvent("tengu_cedar_ember_shown", {
    surface: fromEnum(surface),
    grant_id: sanitizeMarkName(firstOffer.grant.id),
    kind: fromEnum(firstOffer.kind),
    kinds_offered: fromEnumArr(offers.map((offer) => offer.kind)),
    resets_left: firstOffer.grant.resetsLeft,
    resets_left_total: firstOffer.totalResetsLeft,
    limit_type: fromEnum(firstOffer.rateLimitType),
    config_version: cedarEmberVersion(),
  });
}
//@ chunk-fm6h4dv7.js:21404-21516 placement
/**
 * 对话框打开时需要时重新查询重置状态。
 */
function refreshResetStatusForDialog(limits, credentials) {
  let creditState = currentUsageCreditState();
  if (
    RainbowText(limits) ||
    (creditState.phase === "answered" &&
      isSameWallReset(creditState.wall, limits) &&
      shouldRecheckResetStatus(creditState, limits, "dialog", now()))
  )
    askResetStatus(limits, credentials, "dialog");
}
//@ chunk-fm6h4dv7.js:21516-21650 placement
/**
 * 执行重置流程，异常时返回 unavailable。
 */
async function startResetFlowSafe(entry, credentials, eventSurface) {
  try {
    return await startResetFlow(entry, credentials, eventSurface);
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
async function askResetStatusTwice(surface, credentials) {
  let wasAsking = usageCreditStateSlots().pendingAsk !== null;
  await askResetStatus(getCurrentLimits(), credentials, surface);
  if (wasAsking && RainbowText(getCurrentLimits()))
    await askResetStatus(getCurrentLimits(), credentials, surface);
}
//@ chunk-fm6h4dv7.js:21753-22153 placement
/**
 * /reset 流程入口：检查是否可用并给出提议。
 */
async function startResetFlow(entry, credentials, eventSurface) {
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
    return checkResetEligibility(entry, credentials, eventSurface);
  }
  await askResetStatusTwice(entry, credentials);
  let limits = getCurrentLimits();
  let offers = availableResetOffers(limits);
  if (offers.length === 0) {
    let status = usableStatusForWall(limits);
    if (
      status !== undefined &&
      status !== null &&
      (isCooldownActive(status) || hasUsableGrantFor(status, limits))
    )
      probeOrFireQuotaResume(credentials);
    return {
      kind: "answer",
      result: resetNotOfferedResult(limits),
    };
  }
  return chooseResetOffer(entry, offers, unusableResetsFor(limits), eventSurface);
}
//@ chunk-fm6h4dv7.js:22153-22669 placement
/**
 * 选择或确认重置提议。
 */
function chooseResetOffer(entry, offers, unusable, requestedKind) {
  let [firstOffer, ...restOffers] = offers;
  let chosen =
    requestedKind !== undefined
      ? offers.find((offer) => offer.kind === requestedKind)
      : firstOffer !== undefined && restOffers.length === 0
        ? firstOffer
        : undefined;
  if (chosen !== undefined) {
    reportResetSelected(entry, chosen);
    return {
      kind: "confirm",
      offer: chosen,
    };
  }
  if (requestedKind === undefined)
    return {
      kind: "choose",
      offers,
      unusable,
    };
  let found = unusable.find((unusableEntry) => unusableEntry.kind === requestedKind);
  return {
    kind: "answer",
    result: {
      outcome: "not_offered",
      text: `${
        found === undefined
          ? formatLimitResetTemplate(getCedarEmberCopy().noKindLine, {
              kind: formatResetKindName(requestedKind),
            })
          : found.reason.startsWith("can't be used")
            ? `Your ${formatResetKindName(requestedKind)} ${found.reason}`
            : `Your ${formatResetKindName(requestedKind)} can't be used right now \xB7 ${found.reason}`
      } \xB7 you can use ${formatResetChoices(offers.map((offer) => offer.kind))}`,
    },
  };
}
//@ chunk-fm6h4dv7.js:22669-22798 placement
/**
 * 把可选重置列为 “a X, a Y or a Z”。
 */
function formatResetChoices(kinds) {
  let mapped = kinds.map((kind) => `a ${formatResetKindName(kind)}`);
  let last = mapped.pop();
  return last === undefined ? "nothing here" : mapped.length === 0 ? last : `${mapped.join(", ")} or ${last}`;
}
//@ chunk-fm6h4dv7.js:22798-23114 placement
/**
 * 上报选择的重置。
 */
function reportResetSelected(entry, offer) {
  logEvent("tengu_cedar_ember_selected", {
    entry: fromEnum(entry),
    grant_id: sanitizeMarkName(offer.grant.id),
    kind: fromEnum(offer.kind),
    resets_left: offer.grant.resetsLeft,
    resets_left_total: offer.totalResetsLeft,
    limit_type: fromEnumOpt(offer.origin === "wall" ? offer.rateLimitType : undefined),
    at_limit: offer.origin === "wall" || offer.atLimit,
    early_use: hasEarlyUse(offer),
    auto_armed: isQuotaAutoResumeArmed(),
    config_version: cedarEmberVersion(),
  });
}
//@ chunk-fm6h4dv7.js:23114-23825 placement
/**
 * 向服务端查询重置资格并上报。
 */
async function checkResetEligibility(entry, credentials, eventSurface) {
  let creditState = usageCreditStateSlots();
  let askResult = await withDeadline(
    fetchCedarEmberStatus(credentials, {
      read: "cedar_ember",
    }),
    RETRY_AFTER_MS,
  );
  let status = askResult?.kind === "answered" ? askResult.status : null;
  let isUnavailable =
    askResult === undefined || askResult.kind === "failed" || status?.ineligibleReason === "unavailable";
  logEvent("tengu_cedar_ember_asked", {
    outcome: fromEnum(
      resetFlowPhase(
        askResult ?? {
          kind: "failed",
        },
      ),
    ),
    at_wall: false,
    asker: fromEnum(entry),
    eligible: status?.eligible ?? false,
    ineligible_reason: fromEnumOpt(status?.ineligibleReason),
    at_limit: status?.atLimit ?? false,
    grants: status?.grants.length ?? 0,
    grant_id: sanitizeMarkName(status?.nextGrantId ?? null),
    config_version: cedarEmberVersion(),
  });
  if (isUnavailable)
    return {
      kind: "answer",
      result: {
        outcome: "unavailable",
        text: isClaimingReset()
          ? formatLimitResetTemplate(getCedarEmberCopy().unconfirmedAnytimeLine, {})
          : RESET_STATUS_MESSAGES,
      },
    };
  settleUnsettledClaim(creditState, status, credentials);
  if (status === null)
    return {
      kind: "answer",
      result: describeResetState(status),
    };
  let nowMs = now();
  let offers = anytimeResetOffers(status, nowMs);
  if (offers.length === 0)
    return {
      kind: "answer",
      result: describeResetState(status),
    };
  return chooseResetOffer(entry, offers, unusableResetOffers(status, null, nowMs), eventSurface);
}
//@ chunk-fm6h4dv7.js:23825-24148 placement
/**
 * 非上限时可用的重置提议。
 */
function anytimeResetOffers(limits, nowMs) {
  let totalLeft = totalResetsLeft(limits);
  let offers = [];
  for (let group of groupResetGrants(limits, null, nowMs))
    if (group.target !== undefined)
      offers.push({
        origin: "anytime",
        kind: group.kind,
        grant: group.target.grant,
        resetsLeft: Math.max(1, group.resetsLeft),
        totalResetsLeft: Math.max(1, totalLeft),
        weeklyResetsAt: limits.weeklyResetsAt,
        endsAtMs: group.target.endsAtMs,
        earlyUse: resetUsageBadge(group.target.grant, limits),
        atLimit: limits.atLimit,
      });
  return offers;
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
  let fields = {
    left: totalResetsLeft(status),
    date: latestGrantStartLine(filtered[0]?.endsAt ?? null),
  };
  if (filtered.length === 0)
    return {
      outcome: "spent",
      text: formatLimitResetTemplate(getCedarEmberCopy().spentLine, fields),
    };
  let blockedLimitName =
    filtered
      .flatMap((grant) => grant.blocking)
      .map(limitDisplayName)
      .find((name) => name !== null) ?? null;
  let reasonText =
    blockedLimitName !== null
      ? noRefillUntilResetLine(blockedLimitName)
      : filtered.every((grant) => grant.paused)
        ? `${RESET_UNAVAILABLE_LINE} \xB7 it is paused`
        : isCooldownActive(status)
          ? `${RESET_UNAVAILABLE_LINE} \xB7 try again in a minute`
          : filtered.every((grant) => grant.useRequiresLimit)
            ? SAVED_RESET_AT_LIMIT_LINE
            : `${RESET_UNAVAILABLE_LINE} \xB7 try again later`;
  return {
    outcome: "not_offered",
    text: formatLimitResetTemplate(`${reasonText} \xB7 {resets} left \xB7 use by {date}`, fields),
  };
}
//@ chunk-fm6h4dv7.js:24740-25025 placement
/**
 * 不提供重置时的结果（已用完、状态未知、当前额度足够或其他原因）。
 */
function resetNotOfferedResult(limits) {
  let spentLine = resetsUsedUpLine(limits);
  if (spentLine !== undefined)
    return {
      outcome: "spent",
      text: spentLine,
    };
  if (RainbowText(limits))
    return {
      outcome: "unavailable",
      text: isClaimingReset()
        ? formatLimitResetTemplate(getCedarEmberCopy().unconfirmedLine, {})
        : RESET_STATUS_MESSAGES,
    };
  let wallStatus = usableStatusForWall(limits);
  if (wallStatus !== undefined && wallStatus !== null && hasUsableGrantFor(wallStatus, limits))
    return {
      outcome: "not_offered",
      text: LIMIT_MAY_HAVE_LIFTED_LINE,
    };
  return {
    outcome: "not_offered",
    text: withLimitResetTime(resetStatusLine(limits), limits),
  };
}
//@ chunk-fm6h4dv7.js:25025-25166 placement
/**
 * 是否有可直接用于当前限额的重置额度。
 */
function hasUsableGrantFor(status, limits) {
  let rateLimitType = limits.rateLimitType;
  return (
    rateLimitType !== undefined &&
    !status.exhausted.some((exhaustedType) => exhaustedType === rateLimitType) &&
    status.grants.some((grant) => grant.usableNow && !grant.paused && clearsLimit(grant, rateLimitType))
  );
}
//@ chunk-fm6h4dv7.js:25166-25233 placement
function isCooldownActive(status) {
  let timestampOrUndefined = parseTimestampOrUndefined(status.cooldownUntil);
  return timestampOrUndefined !== undefined && timestampOrUndefined > now();
}
//@ chunk-fm6h4dv7.js:25233-25832 placement
/**
 * 当前限额下的重置状态行。
 */
function resetStatusLine(limits) {
  let status = usableStatusForWall(limits);
  if (status === undefined || status === null || limits.rateLimitType === undefined) return RESET_MESSAGES;
  let rateLimitType = limits.rateLimitType;
  let filtered = status.grants.filter((grant) => grant.resetsLeft > 0);
  if (filtered.length === 0) return RESET_MESSAGES;
  if (!filtered.some((grant) => clearsLimit(grant, rateLimitType)))
    return `${RESETS_REFILL_NOTHING_LINE} ${resetLimitDisplayName(rateLimitType)}`;
  if (
    rateLimitType === "seven_day" &&
    filtered.every((grant) => grant.givesBackWeekly && grant.blocking.includes("seven_day"))
  )
    return `Your Fable reset can't be used right now \xB7 ${NO_FABLE_USAGE_LINE}`;
  let blockedLimitName =
    filtered
      .filter((grant) => clearsLimit(grant, rateLimitType))
      .flatMap((grant) => grant.blocking)
      .map(limitDisplayName)
      .find((name) => name !== null) ?? null;
  if (blockedLimitName !== null) return noRefillUntilResetLine(blockedLimitName);
  if (filtered.every((grant) => grant.paused)) return `${RESET_NOT_FOR_THIS_LIMIT_LINE} \xB7 it is paused`;
  if (isCooldownActive(status)) return `${RESET_NOT_FOR_THIS_LIMIT_LINE} \xB7 try again in a minute`;
  return RESET_NOT_FOR_THIS_LIMIT_LINE;
}
//@ chunk-fm6h4dv7.js:25832-25954 placement
/**
 * 在说明后附上限额重置时间。
 */
function withLimitResetTime(line, limits) {
  let resetText = isAutoResumableLimit(limits) ? formatResetTimeWithLocale(limits.resetsAt) : undefined;
  return resetText !== undefined
    ? `${line} \xB7 this limit resets ${resetText}`
    : `${line} \xB7 ${NOT_AT_LIMIT_LINE}`;
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
  let [firstOffer, ...restOffers] = offers;
  if (firstOffer === undefined)
    return {
      outcome: "kept",
      text: RESET_MESSAGES,
    };
  let reduced = restOffers.reduce(
    (acc, offer) =>
      offer.endsAtMs !== null && (acc.endsAtMs === null || offer.endsAtMs < acc.endsAtMs) ? offer : acc,
    firstOffer,
  );
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: false,
    chose_none: true,
    entry: fromEnum(entry),
    kinds_offered: fromEnumArr(offers.map((offer) => offer.kind)),
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
  let creditState = usageCreditStateSlots();
  if (creditState.claiming)
    return {
      outcome: "unavailable",
      text: LIMITS_ALREADY_RESETTING_LINE,
    };
  creditState.claiming = true;
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
    creditState.claiming = false;
  }
}
//@ chunk-fm6h4dv7.js:27116-30155 placement
/**
 * 达到上限时领取重置并刷新限额。
 */
async function claimResetAtWall(wall, credentials, offer) {
  let creditState = usageCreditStateSlots();
  let cedarEmberCopy = getCedarEmberCopy();
  let configVersion = cedarEmberVersion();
  let id = offer.grant.id;
  await askResetStatusTwice(wall, credentials);
  let limits = getCurrentLimits();
  let wall_2 = captureWallResetIdentity(limits);
  let offers = availableResetOffers(limits);
  let found = offers.find((matchedOffer) => matchedOffer.kind === offer.kind);
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: true,
    entry: fromEnum(wall),
    grant_id: sanitizeMarkName(id),
    kind: fromEnum(offer.kind),
    limit_type: fromEnumOpt(limits.rateLimitType),
    still_offered: found !== undefined && found.grant.id === id,
    at_limit: true,
    early_use: false,
    config_version: configVersion,
  });
  if (wall_2 === null || offers.length === 0) return resetNotOfferedResult(limits);
  if (found === undefined)
    return {
      outcome: "not_offered",
      text: `${formatLimitResetTemplate(RESET_NO_LONGER_OFFERED_LINE, {
        kind: formatResetKindName(offer.kind),
      })} \xB7 you can use ${formatResetChoices(offers.map((offer) => offer.kind))}`,
    };
  if (found.grant.id !== id)
    return {
      outcome: "not_offered",
      text: DIFFERENT_RESET_OFFERED_LINE,
    };
  let now_2 = Date.now();
  let wasClaiming = isClaimForGrant(creditState, id);
  let requestId = claimRequestIdFor(creditState, id);
  let claimResult = (await withDeadline(claimCedarEmberGrant(credentials, id, requestId), RETRY_MAX_MS)) ?? {
    result: "error",
    reason: null,
    resetsLeft: null,
    cleared: [],
    weeklyResetsAt: null,
  };
  switch (
    (logEvent("tengu_cedar_ember_result", {
      result: fromEnum(claimResult.result),
      reason: fromEnumOpt(claimResult.reason),
      entry: fromEnum(wall),
      grant_id: sanitizeMarkName(id),
      kind: fromEnum(found.kind),
      resets_left: claimResult.resetsLeft ?? undefined,
      cleared: fromEnumArr(claimResult.cleared),
      limit_type: fromEnum(wall_2.rateLimitType),
      at_limit: true,
      early_use: false,
      latency_ms: Date.now() - now_2,
      config_version: configVersion,
    }),
    claimResult.result)
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
      logFeatureSad("cedar_ember", claimResult.result);
      break;
  }
  let usedDiff = found.resetsLeft - found.grant.resetsLeft;
  let resetsLeft =
    claimResult.resetsLeft ??
    (claimResult.result === "already_used" ? 0 : Math.max(0, found.grant.resetsLeft - 1));
  let fields = {
    ...resetOfferFields(found),
    left: usedDiff + resetsLeft,
    kindResets: formatResetCount(found.kind, usedDiff + resetsLeft),
    week: latestGrantEndLine(claimResult.weeklyResetsAt ?? found.weeklyResetsAt),
  };
  switch (claimResult.result) {
    case "reset": {
      clearUnsettledClaim(creditState);
      dropUnusedResetCache();
      let clearedTypes = [
        wall_2.rateLimitType,
        ...resettableLimitTypes(claimResult.cleared).filter(
          (clearedType) => clearedType !== wall_2.rateLimitType,
        ),
      ];
      if (!found.grant.clears.some((clear) => clear === wall_2.rateLimitType)) {
        forgetHeldWindows(clearedTypes);
        let probeStartMs = now();
        await withDeadline(
          probeQuotaStatusAtStart(credentials, undefined).catch((error) => {
            logError(toError(error));
          }),
          RETRY_AFTER_MS,
        );
        let limitsMoved = lastLimitsObservationAt() > probeStartMs;
        let currentLimits = getCurrentLimits();
        let stillLimited = limitsMoved && isAutoResumableLimit(currentLimits);
        let stillAtSameLimit = stillLimited && currentLimits.rateLimitType === wall_2.rateLimitType;
        logEvent("tengu_cedar_ember_give_back", {
          outcome: fromEnum(
            stillAtSameLimit ? "binds" : stillLimited ? "elsewhere" : limitsMoved ? "lifted" : "unread",
          ),
          entry: fromEnum(wall),
          grant_id: sanitizeMarkName(id),
          config_version: configVersion,
        });
        if (stillAtSameLimit) {
          resetWallPhase(wall_2);
          askResetStatus(currentLimits, credentials, wall);
          return {
            outcome: "reset",
            text: formatLimitResetTemplate(RESET_USED_STILL_LIMITED_LINE, {
              ...fields,
              limit: resetLimitDisplayName(wall_2.rateLimitType),
              date: formatResetTimeWithLocale(currentLimits.resetsAt, false, true, true),
            }),
          };
        }
        clearedTypes = limitsMoved ? [] : clearedTypes;
      }
      let continuable = consumeContinuableWall(creditState, wall_2);
      applyClaimedReset(creditState, wall_2, clearedTypes, wall, continuable);
      let successText = formatLimitResetTemplate(cedarEmberCopy.successLine, fields);
      return {
        outcome: "reset",
        text: continuable ? successText : appendContinueHint(successText),
      };
    }
    case "not_limited": {
      clearUnsettledClaim(creditState);
      let continuable = consumeContinuableWall(creditState, wall_2);
      applyClaimedReset(creditState, wall_2, [wall_2.rateLimitType], wall, continuable);
      let text = wasClaiming ? LIMITS_CLEAR_LINE : LIMIT_ALREADY_RESET_LINE;
      return {
        outcome: "reset",
        text: continuable ? text : appendContinueHint(text),
      };
    }
    case "cooldown": {
      if (!wasClaiming) clearUnsettledClaim(creditState);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "unavailable",
        text: wasClaiming ? EARLIER_RESET_PENDING_LINE : OTHER_RESET_STARTED_LINE,
      };
    }
    case "already_used": {
      if (wasClaiming) {
        clearUnsettledClaim(creditState);
        resetWallPhase(wall_2);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "spent",
          text: EARLIER_RESET_WENT_THROUGH_LINE,
        };
      }
      if (found.totalResetsLeft - found.grant.resetsLeft > 0) {
        resetWallPhase(wall_2);
        askResetStatus(getCurrentLimits(), credentials, wall);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "spent",
          text: formatLimitResetTemplate(`${RESET_ALREADY_USED_LINE} \xB7 ${RUN_RESET_AGAIN_LINE}`, fields),
        };
      }
      refreshAnsweredStatus(wall_2, id);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "spent",
        text: formatLimitResetTemplate(RESET_ALREADY_USED_LINE, fields),
      };
    }
    case "ineligible": {
      resetWallPhase(wall_2);
      askResetStatus(getCurrentLimits(), credentials, wall);
      if (wasClaiming) {
        clearUnsettledClaim(creditState);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "not_offered",
          text: RESET_GONE_MAYBE_APPLIED_LINE,
        };
      }
      return {
        outcome: "not_offered",
        text: withLimitResetTime(RESET_NOT_AVAILABLE_LINE, limits),
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
          wasClaiming ? cedarEmberCopy.unconfirmedLine : cedarEmberCopy.unavailableLine,
          fields,
        ),
      };
    case "unavailable":
    case "error": {
      recordUnsettledClaim(creditState, id, requestId, wall_2.accountEpoch);
      let clearedTypes = resettableLimitTypes(claimResult.cleared);
      if (clearedTypes.length > 0) {
        forgetHeldWindows(clearedTypes);
        if (clearedTypes.includes(wall_2.rateLimitType)) probeOrFireQuotaResume(credentials);
      }
      resetWallPhase(wall_2);
      askResetStatus(getCurrentLimits(), credentials, wall);
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(
          wasClaiming ? cedarEmberCopy.stillUnconfirmedLine : cedarEmberCopy.unconfirmedLine,
          fields,
        ),
      };
    }
  }
}
//@ chunk-fm6h4dv7.js:30155-30240 placement
function earlyUsePercentUsedMax(offer) {
  return offer.origin === "anytime" ? (offer.earlyUse?.percentUsedMax ?? undefined) : undefined;
}
//@ chunk-fm6h4dv7.js:30240-30302 placement
function hasEarlyUse(offer) {
  return offer.origin === "anytime" && offer.earlyUse !== null;
}
//@ chunk-fm6h4dv7.js:30302-32325 placement
/**
 * 未达上限时提前领取重置。
 */
async function claimResetEarly(entry, credentials, offer) {
  let creditState = usageCreditStateSlots();
  let cedarEmberCopy = getCedarEmberCopy();
  let configVersion = cedarEmberVersion();
  let id = offer.grant.id;
  let unsettledClaimEpoch = getLimitsAccountEpoch();
  logEvent("tengu_cedar_ember_confirmed", {
    confirmed: true,
    entry: fromEnum(entry),
    grant_id: sanitizeMarkName(id),
    kind: fromEnum(offer.kind),
    at_limit: offer.atLimit,
    early_use: hasEarlyUse(offer),
    percent_used_max: earlyUsePercentUsedMax(offer),
    config_version: configVersion,
  });
  let now = Date.now();
  let wasClaiming = isClaimForGrant(creditState, id);
  let requestId = claimRequestIdFor(creditState, id);
  let claimResult = (await withDeadline(claimCedarEmberGrant(credentials, id, requestId), RETRY_MAX_MS)) ?? {
    result: "error",
    reason: null,
    resetsLeft: null,
    cleared: [],
    weeklyResetsAt: null,
  };
  switch (
    (logEvent("tengu_cedar_ember_result", {
      result: fromEnum(claimResult.result),
      reason: fromEnumOpt(claimResult.reason),
      entry: fromEnum(entry),
      grant_id: sanitizeMarkName(id),
      kind: fromEnum(offer.kind),
      resets_left: claimResult.resetsLeft ?? undefined,
      cleared: fromEnumArr(claimResult.cleared),
      at_limit: offer.atLimit,
      early_use: hasEarlyUse(offer),
      percent_used_max: earlyUsePercentUsedMax(offer),
      latency_ms: Date.now() - now,
      config_version: configVersion,
    }),
    claimResult.result)
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
      logFeatureSad("cedar_ember", claimResult.result);
      break;
  }
  let usedDiff = offer.resetsLeft - offer.grant.resetsLeft;
  let resetsLeft =
    claimResult.resetsLeft ??
    (claimResult.result === "already_used" ? 0 : Math.max(0, offer.grant.resetsLeft - 1));
  let fields = {
    ...resetOfferFields(offer),
    left: usedDiff + resetsLeft,
    kindResets: formatResetCount(offer.kind, usedDiff + resetsLeft),
    week: latestGrantEndLine(claimResult.weeklyResetsAt ?? offer.weeklyResetsAt),
  };
  switch (claimResult.result) {
    case "reset": {
      clearUnsettledClaim(creditState);
      dropUnusedResetCache();
      let clearedTypes = resettableLimitTypes(claimResult.cleared);
      if (clearedTypes.length > 0) forgetHeldWindows(clearedTypes);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "reset",
        text: formatLimitResetTemplate(cedarEmberCopy.successLine, fields),
      };
    }
    case "not_limited":
      clearUnsettledClaim(creditState);
      if (wasClaiming) {
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
      if (!wasClaiming) clearUnsettledClaim(creditState);
      probeOrFireQuotaResume(credentials);
      return {
        outcome: "unavailable",
        text: wasClaiming ? EARLIER_RESET_PENDING_LINE : OTHER_RESET_STARTED_UNUSED_LINE,
      };
    case "already_used":
      if (wasClaiming) {
        clearUnsettledClaim(creditState);
        probeOrFireQuotaResume(credentials);
        return {
          outcome: "spent",
          text: EARLIER_RESET_WENT_THROUGH_LINE,
        };
      }
      return {
        outcome: "spent",
        text: formatLimitResetTemplate(
          offer.totalResetsLeft - offer.grant.resetsLeft > 0
            ? `${RESET_ALREADY_USED_LINE} \xB7 ${RUN_RESET_AGAIN_LINE}`
            : RESET_ALREADY_USED_LINE,
          fields,
        ),
      };
    case "ineligible":
      if (wasClaiming) {
        clearUnsettledClaim(creditState);
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
          wasClaiming ? cedarEmberCopy.unconfirmedAnytimeLine : cedarEmberCopy.unavailableLine,
          fields,
        ),
      };
    case "unavailable":
    case "error": {
      recordUnsettledClaim(creditState, id, requestId, unsettledClaimEpoch);
      let clearedTypes = resettableLimitTypes(claimResult.cleared);
      if (clearedTypes.length > 0) forgetHeldWindows(clearedTypes);
      if (clearedTypes.length > 0 || wasClaiming) probeOrFireQuotaResume(credentials);
      return {
        outcome: "unavailable",
        text: formatLimitResetTemplate(
          wasClaiming ? cedarEmberCopy.stillUnconfirmedLine : cedarEmberCopy.unconfirmedAnytimeLine,
          fields,
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
function noRefillUntilResetLine(limitName) {
  return `Your reset doesn't refill your ${limitName}, so it can't be used until that resets`;
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
function appendContinueHint(text) {
  return `${text} \xB7 ${SEND_MESSAGE_TO_CONTINUE_LINE}`;
}
//@ chunk-fm6h4dv7.js:34472-34585 placement
/**
 * 取出并清除“可继续”的墙标记。
 */
function consumeContinuableWall(state, wall) {
  let isContinuable = cedarEmberAutoContinue() && state.continuableWallResetsAt === wall.wallResetsAt;
  state.continuableWallResetsAt = null;
  return isContinuable;
}
//@ chunk-fm6h4dv7.js:34585-34849 placement
/**
 * 过滤出可重置的限额类型。
 */
function resettableLimitTypes(cleared) {
  let types = [];
  for (let limitType of cleared)
    switch (limitType) {
      case "five_hour":
      case "seven_day":
      case "seven_day_overage_included":
      case "seven_day_opus":
      case "seven_day_sonnet":
        types.push(limitType);
        break;
      case "seven_day_cowork":
      case "seven_day_omelette":
      case "seven_day_oauth_apps":
        break;
    }
  return types;
}
//@ chunk-fm6h4dv7.js:34849-35084 placement
/**
 * 领取重置后的收尾：取消自动续接、结束低优先级、释放限额、清空状态、发出 reset 事件（每步独立容错）。
 */
function applyClaimedReset(state, wall, clearedTypes, entry, shouldContinue) {
  let steps = [
    () => cancelQuotaAutoResume("cedar_ember"),
    () => {
      endLowPriority("reset");
    },
    () => releaseClearedLimits(clearedTypes),
    () => {
      resetWallPhase(wall);
      state.wallRecordKey = null;
      state.shownOfferKey = null;
    },
    () => {
      if (shouldContinue) enqueueAutoContinuation();
    },
    () =>
      state.events.emit({
        type: "reset",
        entry,
      }),
  ];
  for (let step of steps)
    try {
      step();
    } catch (error) {
      logError(toError(error));
    }
}
//@ chunk-fm6h4dv7.js:35084-35285 placement
/**
 * 忘记被清除的限额窗口；当前被拒的限额已清除时改为 allowed。
 */
function releaseClearedLimits(clearedTypes) {
  if (clearedTypes.length > 0) forgetHeldWindows(clearedTypes);
  let currentLimits = getCurrentLimits();
  if (
    currentLimits.status !== "rejected" ||
    currentLimits.rateLimitType === undefined ||
    !clearedTypes.includes(currentLimits.rateLimitType)
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
function probeOrFireQuotaResume(credentials) {
  if (isQuotaAutoResumeArmed()) {
    confirmAndFire();
    return;
  }
  probeQuotaStatusAtStart(credentials, undefined).catch((error) => {
    logError(toError(error));
  });
}
//@ chunk-fm6h4dv7.js:35357-35501 placement
/**
 * 当前墙已处理时把重置状态置为 idle。
 */
function resetWallPhase(wall) {
  let state = currentUsageCreditState();
  if (
    state.phase !== "idle" &&
    state.wall.wallResetsAt === wall.wallResetsAt &&
    state.wall.rateLimitType === wall.rateLimitType
  )
    setUsageCreditState({
      phase: "idle",
    });
}
//@ chunk-fm6h4dv7.js:35501-35845 placement
/**
 * 更新已答复的重置状态。
 */
function refreshAnsweredStatus(wall, id) {
  let state = currentUsageCreditState();
  if (
    state.phase !== "answered" ||
    state.wall.wallResetsAt !== wall.wallResetsAt ||
    state.wall.rateLimitType !== wall.rateLimitType ||
    state.status === null
  )
    return;
  setUsageCreditState({
    ...state,
    answeredAtMs: now(),
    status: {
      ...state.status,
      nextGrantId: state.status.nextGrantId === id ? null : state.status.nextGrantId,
      grants: state.status.grants.map((grant) =>
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
function subscribeWallReset(state) {
  if (state.sessionSwitchSubscribed) return;
  state.sessionSwitchSubscribed = true;
  onSessionSwitch((from, to) => {
    if (isConversationResetSwitch(to)) state.continuableWallResetsAt = null;
  });
}
//@ chunk-fm6h4dv7.js:35979-37293 placement
/**
 * juniper_tide（重置额度）状态 schema。
 */
var JUNIPER_TIDE_PROGRAM; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var RESET_CLAIM_TIMEOUT_MS;
var juniperTideEventSchema;
var juniperTideStatusSchema;
var juniperTideClaimResultSchema;
deferInit("chunk-fm6h4dv7.js:35979", () => {
  JUNIPER_TIDE_PROGRAM = "juniper_tide";
  RESET_CLAIM_TIMEOUT_MS = 25000;
  juniperTideEventSchema = DoctorLazy(() =>
    objectSchema({
      surface: _enum(["claude_ai", "claude_code_cli", "unknown"]).catch("unknown"),
      tier: _enum(["claude_pro", "claude_max_5x", "claude_max_20x", "unknown"]).catch("unknown"),
      tenure_bucket: _enum(["under_14", "14-29", "30-89", "90-364", "365+", "unknown"]).catch("unknown"),
      billing_path: _enum(["stripe", "apple", "google_play", "other", "unknown"]).catch("unknown"),
      billing_period: _enum(["monthly", "annual", "unknown"]).catch("unknown"),
      extra_usage_state: _enum(["not_configured", "disabled", "enabled", "unknown"]).catch("unknown"),
    }),
  );
  juniperTideStatusSchema = DoctorLazy(() =>
    objectSchema({
      eligible: booleanSchema(),
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
      in_experiment: booleanSchema().optional(),
      arm: _enum(["control", "reset"]).nullable().optional().catch(null),
      available: booleanSchema().optional(),
      next_available_at: stringSchema().nullable().optional().catch(null),
      weekly_resets_at: stringSchema().nullable().optional().catch(null),
      resets_per_week: numberSchema().optional().catch(undefined),
      event_props: juniperTideEventSchema().nullable().optional().catch(null),
    }),
  );
  juniperTideClaimResultSchema = DoctorLazy(() =>
    objectSchema({
      result: _enum(["reset", "already_used", "not_limited", "ineligible", "unavailable"]).catch(
        "unavailable",
      ),
      next_available_at: stringSchema().nullable().optional().catch(null),
      weekly_resets_at: stringSchema().nullable().optional().catch(null),
    }),
  );
});
//@ chunk-fm6h4dv7.js:37293-37933 placement
/**
 * 解析 juniper_tide 状态块。
 */
function parseJuniperTideStatus(juniperTide) {
  if (juniperTide === undefined || juniperTide === null) return null;
  let parsed = juniperTideStatusSchema().safeParse(juniperTide);
  if (!parsed.success) {
    logForDebugging(`[juniper-tide] ignoring a malformed status block: ${parsed.error.message}`);
    return null;
  }
  let data = parsed.data;
  let eventProps = data.event_props;
  return {
    eligible: data.eligible,
    ineligibleReason: data.ineligible_reason ?? null,
    inExperiment: data.in_experiment ?? false,
    arm: data.arm ?? null,
    available: data.available ?? false,
    nextAvailableAt: data.next_available_at ?? null,
    weeklyResetsAt: data.weekly_resets_at ?? null,
    resetsPerWeek: data.resets_per_week ?? 1,
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
async function fetchJuniperTideStatus(credentials) {
  try {
    if (!hasProfileScope())
      return {
        kind: "no_profile_scope",
      };
    let utilization = await fetchUtilization(credentials, {
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
    let response = await withOAuth401Retry(
      () =>
        apiClient.post(
          `/api/organizations/${organizationUuid}/reset_rate_limits`,
          {
            program: JUNIPER_TIDE_PROGRAM,
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
    if (!response.ok) {
      logForDebugging(
        `[juniper-tide] claim not sent: ${response.reason === "no-auth" ? response.detail : response.reason}`,
        {
          level: "warn",
        },
      );
      return {
        result: response.reason === "no-auth" ? "auth_error" : "error",
        nextAvailableAt: null,
      };
    }
    let parsed = juniperTideClaimResultSchema().safeParse(response.data);
    if (!parsed.success) {
      logForDebugging(`[juniper-tide] unreadable claim response: ${parsed.error.message}`, {
        level: "error",
      });
      logError(Error("[juniper-tide] unreadable claim response"));
      return {
        result: "error",
        nextAvailableAt: null,
      };
    }
    return {
      result: parsed.data.result,
      nextAvailableAt: parsed.data.next_available_at ?? null,
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
var resetFlowStateSlots; // deferred: uses createResetFlowState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-fm6h4dv7.js:39746", () => {
  resetFlowStateSlots = new HostScoped(createResetFlowState);
});
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
  let flow = currentResetFlowState();
  flow.state = state;
  flow.changed.emit();
}
//@ chunk-fm6h4dv7.js:39882-39930 placement
/**
 * 订阅重置状态变化。
 */
function subscribeResetChanges(listener) {
  return currentResetFlowState().changed.subscribe(listener);
}
//@ chunk-fm6h4dv7.js:39930-39977 placement
/**
 * 订阅重置流程事件（用于界面刷新）。
 */
function onResetFlowEvent(listener) {
  return currentResetFlowState().events.subscribe(listener);
}
//@ chunk-fm6h4dv7.js:39977-40004 placement
var MAX_STATUS_ATTEMPTS = 3;
var STATUS_RETRY_DELAY_MS = 12000;
var STATUS_REQUEST_TIMEOUT_MS = 35000;
//@ chunk-fm6h4dv7.js:40004-40079 placement
/**
 * 当前重置流程记录是否对应该墙（重置点相同且账号 epoch 未变）。
 */
function isFlowForWall(flow, limits) {
  return limits.resetsAt === flow.wallResetsAt && flow.accountEpoch === getLimitsAccountEpoch();
}
//@ chunk-fm6h4dv7.js:40079-40158 placement
/**
 * 该墙的重置流程已答复时返回其状态文本。
 */
function answeredStatusForWall(limits) {
  let flow = getResetFlowPhase();
  return flow.phase === "answered" && isFlowForWall(flow, limits) ? flow.status : undefined;
}
//@ chunk-fm6h4dv7.js:40158-40219 placement
/**
 * 该墙的重置流程是否处于失败阶段。
 */
function isFailedForWall(limits) {
  let flow = getResetFlowPhase();
  return flow.phase === "failed" && isFlowForWall(flow, limits);
}
//@ chunk-fm6h4dv7.js:40219-40379 placement (2.1.88 match: getMockStatus, 0.387)
/**
 * 被拒且可在重置点提供低优先级等待时为真。旧版名错配；疑似归错文件。
 */
function canArmLowPriorityReset(limits, nowMs = Date.now()) {
  let timestamp = answeredStatusForWall(limits);
  return (
    isFiveHourAutoResumable(limits) &&
    timestamp !== undefined &&
    timestamp !== null &&
    timestamp.arm === "reset" &&
    timestamp.available &&
    limits.resetsAt !== undefined &&
    limits.resetsAt * 1000 > nowMs &&
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
