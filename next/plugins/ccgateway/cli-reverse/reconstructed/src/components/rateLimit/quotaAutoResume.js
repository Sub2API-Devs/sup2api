/**
 * components/rateLimit/quotaAutoResume.tsx
 *
 * 2.1.316 新增：达到用量上限后在重置时自动继续对话的控制组件（通知、取消、重新布防）；额度自动继续的开关名与提示文本模板等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-fm6h4dv7.js (47)
 * attribution: placement 47
 */
import {
  init_react_production,
  useState,
  useEffect,
  useContext,
  useMemo,
  useSyncExternalStore,
} from "../../../vendor/react/cjs/react.production.js";
import {
  getCurrentLimits,
  onLimitsStatusChanged,
  RATE_LIMIT_DISPLAY_NAMES,
  getLimitsAccountEpoch,
} from "../../services/claudeAiLimits.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { currentSubscriptionTier, canAutoResumeLimitType } from "../../services/rateLimitContinuation.js";
import { logEvent } from "../../services/analytics/index.js";
import { usageCreditsCommand } from "../../commands/extra-usage/index.js";
import { getSubscriptionType } from "../../utils/auth.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { planModeConstituentFamily } from "../../utils/model/planModeModel.js";
import { getUserSpecifiedModelSetting } from "../../utils/model/smallFastModel.js";
import { clockContext, defaultSetTimeout, noopClock } from "../../ink/components/ClockContext.js";
import {
  onQuotaResumeChange,
  quotaAutoResumeState,
  startQuotaSubscriptionsFor,
  onQuotaResumeEvent,
  tickAutoResume,
  isResetKeyArmed,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema } from "../../../vendor/zod/v4/classic/schemas.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { truncateToWidth, formatResetTime } from "../../utils/format.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useNotifications } from "../../context/notifications.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useTerminalNotification } from "../../ink/useTerminalNotification.js";
import {
  onCreditOfferPromptChange,
  getOfferMenuSuffix,
  logCreditOfferShown,
  currentUsageCreditState,
} from "../../services/usageCreditOffers.js";
import { createSystemMessage } from "../../utils/messages.js";
import { notifyAsync } from "../../utils/terminalProbe.js";
import { isAutoContinueRemoteEnabled } from "../../services/autoContinueAtUsageLimit.js";
import { useInterval } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-fm6h4dv7.js:1911-1941 placement
var TENGU_PEWTER_SUMMIT = "tengu_pewter_summit";
//@ chunk-fm6h4dv7.js:1941-1945 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fm6h4dv7.js:1941", () => {
  init_react_production();
});
//@ chunk-fm6h4dv7.js:1945-2022 placement
/**
 * 订阅当前限额状态的 hook。
 */
function useRateLimitState() {
  let [limits, setLimits] = useState({
    ...getCurrentLimits(),
  });
  useEffect(
    () =>
      onLimitsStatusChanged((next) => {
        setLimits({
          ...next,
        });
      }),
    [],
  );
  return limits;
}
//@ chunk-fm6h4dv7.js:2022-2088 placement
var autoResumeKeyStore; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fm6h4dv7.js:2022", () => {
  autoResumeKeyStore = new HostScoped(() => ({
    messageKeys: new Set(),
    footerOfferKeys: new Set(),
  }));
});
//@ chunk-fm6h4dv7.js:2088-2225 placement
/**
 * 构造限流相关事件的公共字段：limit_type（只有已知类型才上报）、订阅档位 tier、resets_at。
 */
function getRateLimitEventProps(state) {
  let rateLimitType = state.rateLimitType;
  return {
    limit_type:
      rateLimitType !== undefined && Object.hasOwn(RATE_LIMIT_DISPLAY_NAMES, rateLimitType)
        ? fromEnum(rateLimitType)
        : undefined,
    tier: fromEnum(currentSubscriptionTier()),
    resets_at: state.resetsAt,
  };
}
//@ chunk-fm6h4dv7.js:2225-2462 placement
/**
 * 对同一 (重置时间, 是否显示提示) 只打点一次 tengu_rate_limit_message_shown，附带提示类型与是否在实时等待。
 */
function logRateLimitMessageShownOnce(host, sessionHost, state) {
  if (sessionHost.resetsAt === undefined) return;
  let messageKeys = autoResumeKeyStore.of(host).messageKeys;
  let key = `${sessionHost.resetsAt}:${state.shown}`;
  if (messageKeys.has(key)) return;
  messageKeys.add(key);
  logEvent("tengu_rate_limit_message_shown", {
    ...getRateLimitEventProps(sessionHost),
    hint: fromEnum(state.kind),
    hint_shown: state.shown,
    wait_live: state.waitLive,
  });
}
//@ chunk-fm6h4dv7.js:2462-2653 placement
/**
 * 对同一 (重置时间, offer) 只打点一次 tengu_limit_footer_offer_shown。
 */
function logLimitFooterOfferShownOnce(host, state, state_2) {
  if (state.resetsAt === undefined) return;
  let footerOfferKeys = autoResumeKeyStore.of(host).footerOfferKeys;
  let key = `${state.resetsAt}:${state_2}`;
  if (footerOfferKeys.has(key)) return;
  footerOfferKeys.add(key);
  logEvent("tengu_limit_footer_offer_shown", {
    ...getRateLimitEventProps(state),
    offer: fromEnum(state_2),
  });
}
//@ chunk-fm6h4dv7.js:2653-2657 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fm6h4dv7.js:2653", () => {
  init_react_production();
});
//@ chunk-fm6h4dv7.js:2657-2732 placement
/**
 * 函数 isAutoResumeOfferEnabled（开关开且含 overage）。
 */
function isAutoResumeOfferEnabled(upgradePaths) {
  return usageCreditsCommand.isEnabled() && (upgradePaths === undefined || upgradePaths.includes("overage"));
}
//@ chunk-fm6h4dv7.js:2732-2832 placement (2.1.88 match: isBigQueryMetricsEnabled, 1)
function isBigQueryMetricsEnabled(upgradePaths) {
  let subscriptionType = getSubscriptionType();
  let isC4EOrTeamUser = subscriptionType === "team" || subscriptionType === "enterprise";
  return (
    isAutoResumeOfferEnabled(upgradePaths) &&
    !isC4EOrTeamUser &&
    !isEssentialTrafficOnly() &&
    planModeConstituentFamily(getUserSpecifiedModelSetting()) === null
  );
}
//@ chunk-fm6h4dv7.js:2832-2836 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-fm6h4dv7.js:2832", () => {
  init_react_production();
});
//@ chunk-fm6h4dv7.js:2836-2849 placement
var AUTO_RESUME_PROMPT_MS = 30000;
//@ chunk-fm6h4dv7.js:2849-3026 placement
/**
 * 在目标时间戳到达时调用回调：分段 setTimeout（每段不超过上限）避免长定时器漂移；返回取消函数；时间戳无效时什么都不做。
 */
function scheduleAtTimestamp(targetMs, scheduleFn, onReached) {
  let cancelled = false;
  let cancel = () => {};
  if (Number.isNaN(targetMs)) return cancel;
  let tick = () => {
    if (cancelled) return;
    let remainingMs = targetMs - Date.now();
    if (remainingMs <= 0) {
      onReached();
      return;
    }
    cancel = scheduleFn(tick, Math.min(remainingMs, AUTO_RESUME_PROMPT_MS));
  };
  tick();
  return () => {
    cancelled = true;
    cancel();
  };
}
//@ chunk-fm6h4dv7.js:3026-3173 placement
/**
 * 判断某重置时间是否已到（带定时器）。
 */
function useResetReached(resetsAtMs) {
  let scheduleFn = useContext(clockContext)?.setTimeout ?? defaultSetTimeout;
  let schedule = useMemo(() => {
    if (resetsAtMs === null) return noopClock;
    return (onReached) => scheduleAtTimestamp(resetsAtMs, scheduleFn, onReached);
  }, [resetsAtMs, scheduleFn]);
  return useSyncExternalStore(schedule, () => resetsAtMs !== null && Date.now() >= resetsAtMs);
}
//@ chunk-fm6h4dv7.js:3173-3317 placement
var QUOTA_AUTO_RESUME_MIN_DELAY_MS = 30000;
var QUOTA_AUTO_RESUME_CAP = "quota-auto-resume-cap";
var QUOTA_AUTO_RESUME_CANCELLED = "quota-auto-resume-cancelled";
var AUTO_CONTINUE_CANCELLED_TEXT = "Automatic continue cancelled \xB7 /rate-limit-options to re-arm";
//@ chunk-fm6h4dv7.js:3317-3355 placement
/**
 * 订阅额度自动继续的状态。
 */
function useQuotaAutoResumeState() {
  return useSyncExternalStore(onQuotaResumeChange, quotaAutoResumeState, quotaAutoResumeState);
}
//@ chunk-fm6h4dv7.js:3355-3842 placement
/**
 * 额度自动继续的开关名与提示文本模板。
 */
var QUOTA_AUTO_RESUME_GATE; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
var AUTO_RESUME_COPY;
var COPY_MAX_WIDTH;
var AutoResumeCopySchema;
deferInit("chunk-fm6h4dv7.js:3355", () => {
  QUOTA_AUTO_RESUME_GATE = "tengu_functional_llama";
  AUTO_RESUME_COPY = {
    waiting: "Continuing automatically {when} \xB7 Esc to cancel",
    started: "Usage limit reached \xB7 continuing automatically {when} \xB7 esc to cancel",
    rearmed: "Usage limit reached again \xB7 continuing automatically {when} \xB7 esc to cancel",
    credits: "/usage-credits to continue now",
  };
  COPY_MAX_WIDTH = 120;
  AutoResumeCopySchema = DoctorLazy(() =>
    objectSchema({
      waiting: stringSchema().optional().catch(undefined),
      started: stringSchema().optional().catch(undefined),
      rearmed: stringSchema().optional().catch(undefined),
      credits: stringSchema().optional().catch(undefined),
    }),
  );
});
//@ chunk-fm6h4dv7.js:3842-3967 placement
function resolveAutoResumeText(phase, copy) {
  let custom = cleanTaskDescription(copy);
  if (custom === undefined) return AUTO_RESUME_COPY[phase];
  if (phase === "credits") return truncateToWidth(custom, COPY_MAX_WIDTH);
  return custom.includes("{when}") ? custom : AUTO_RESUME_COPY[phase];
}
//@ chunk-fm6h4dv7.js:3967-4164 placement
function getAutoResumeTexts(featureValue_CACHED_MAY_BE_STALE) {
  let parsed = AutoResumeCopySchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  let copyOverrides = parsed.success ? parsed.data : {};
  return {
    waiting: resolveAutoResumeText("waiting", copyOverrides.waiting),
    started: resolveAutoResumeText("started", copyOverrides.started),
    rearmed: resolveAutoResumeText("rearmed", copyOverrides.rearmed),
    credits: resolveAutoResumeText("credits", copyOverrides.credits),
  };
}
//@ chunk-fm6h4dv7.js:4164-4200 placement
function autoResumeCopy() {
  return getAutoResumeTexts(getFeatureValue_CACHED_MAY_BE_STALE(QUOTA_AUTO_RESUME_GATE, null));
}
//@ chunk-fm6h4dv7.js:4200-4253 placement
function fillWhen(template, whenText) {
  return truncateToWidth(template.replace("{when}", whenText), COPY_MAX_WIDTH);
}
//@ chunk-fm6h4dv7.js:4253-4367 placement
function describeResumeTime(state, nowMs) {
  let resetsAtSeconds = state.phase === "armed" ? state.resetsAtSeconds : 0;
  let resetLabel = resetsAtSeconds * 1000 > nowMs ? formatResetTime(resetsAtSeconds) : undefined;
  return resetLabel ? `at ${resetLabel}` : "shortly";
}
//@ chunk-fm6h4dv7.js:4367-4416 placement
function startedMessage(state, nowMs) {
  return fillWhen(autoResumeCopy().started, describeResumeTime(state, nowMs));
}
//@ chunk-fm6h4dv7.js:4416-4465 placement
function rearmedMessage(state, nowMs) {
  return fillWhen(autoResumeCopy().rearmed, describeResumeTime(state, nowMs));
}
//@ chunk-fm6h4dv7.js:4465-4494 placement
var USAGE_LIMIT_REACHED_TEXT = "Usage limit reached";
//@ chunk-fm6h4dv7.js:4494-4565 placement
/**
 * 函数 usageLimitStatusText（带重置时间的限流文案）。
 */
function usageLimitStatusText(resetsAtSeconds) {
  let resetLabel = formatResetTime(resetsAtSeconds);
  return resetLabel
    ? `${USAGE_LIMIT_REACHED_TEXT} \xB7 limit resets ${resetLabel}`
    : USAGE_LIMIT_REACHED_TEXT;
}
//@ chunk-fm6h4dv7.js:4565-4995 placement
/**
 * 根据阶段（armed/stale）生成自动继续的状态行与下一步提示。
 */
function quotaAutoResumeStatus(quotaAutoResumeState, nowMs) {
  if (quotaAutoResumeState.phase === "stale")
    return {
      status: "Your usage limit has reset",
      next: "Press enter to continue",
    };
  if (quotaAutoResumeState.phase !== "armed") return null;
  let resetLabel = formatResetTime(quotaAutoResumeState.resetsAtSeconds);
  let status = usageLimitStatusText(quotaAutoResumeState.resetsAtSeconds);
  if (nowMs)
    return {
      status,
      next: "Continuing shortly \xB7 Esc to cancel",
    };
  let nextText = fillWhen(autoResumeCopy().waiting, resetLabel ? "at " + resetLabel : "when it resets");
  if (nextText.startsWith(`${USAGE_LIMIT_REACHED_TEXT} \xB7 `))
    nextText = nextText
      .slice(USAGE_LIMIT_REACHED_TEXT.length + 3)
      .replace(/^./u, (state) => state.toUpperCase());
  return {
    status,
    next: nextText,
  };
}
//@ chunk-fm6h4dv7.js:4995-5046 placement
function isArmedIdle(quotaAutoResumeState, isBusy, isPromptEmpty) {
  return quotaAutoResumeState.phase === "armed" && !isBusy && isPromptEmpty;
}
//@ chunk-fm6h4dv7.js:5046-5089 placement
function upgradePathsEnabled() {
  return isBigQueryMetricsEnabled(getCurrentLimits().upgradePaths);
}
//@ chunk-fm6h4dv7.js:5089-5110 placement
function noopEffect() {
  return;
}
//@ chunk-fm6h4dv7.js:5110-5203 placement
function timeUntilFire(quotaAutoResumeState) {
  return useResetReached(
    quotaAutoResumeState.phase === "armed"
      ? Math.min(quotaAutoResumeState.fireAtMs, quotaAutoResumeState.resetsAtSeconds * 1000)
      : null,
  );
}
//@ chunk-fm6h4dv7.js:5203-9093 placement
/**
 * 达到用量上限后在重置时自动继续对话的控制组件（通知、取消、重新布防）。
 */
function QuotaAutoResume(props) {
  let $ = useMemoCache(36);
  let { isLoading, transcript } = props;
  let { addNotification, removeNotification } = useNotifications();
  let { storageV5, credentials } = useTheme_2();
  let terminalNotification = useTerminalNotification();
  let quotaAutoResumeState_2 = useQuotaAutoResumeState();
  let timeUntilFireMs = timeUntilFire(quotaAutoResumeState_2);
  let upgradePaths = useSyncExternalStore(onLimitsStatusChanged, upgradePathsEnabled);
  let offerSuffix = useSyncExternalStore(
    onCreditOfferPromptChange,
    quotaAutoResumeState_2.phase === "armed" ? getOfferMenuSuffix : noopEffect,
  );
  let subscribeEffect;
  let subscribeDeps;
  if ($[0] !== storageV5) {
    subscribeEffect = () => {
      startQuotaSubscriptionsFor(storageV5);
    };
    subscribeDeps = [storageV5];
    $[0] = storageV5;
    $[1] = subscribeEffect;
    $[2] = subscribeDeps;
  } else {
    subscribeEffect = $[1];
    subscribeDeps = $[2];
  }
  useEffect(subscribeEffect, subscribeDeps);
  let appendNotice;
  if ($[3] !== transcript) {
    appendNotice = (message, kind) =>
      transcript.apply({
        type: "append",
        messages: [createSystemMessage(message, kind)],
      });
    $[3] = transcript;
    $[4] = appendNotice;
  } else appendNotice = $[4];
  let appendNoticeStable = appendNotice;
  let notify;
  if ($[5] !== credentials || $[6] !== storageV5 || $[7] !== terminalNotification) {
    notify = (message, notificationType) =>
      void notifyAsync(
        {
          message,
          notificationType,
        },
        terminalNotification,
        {
          storageV5,
          credentials,
        },
      );
    $[5] = credentials;
    $[6] = storageV5;
    $[7] = terminalNotification;
    $[8] = notify;
  } else notify = $[8];
  let notifyStable = notify;
  let onResumeEvent;
  let onResumeDeps;
  if (
    $[9] !== addNotification ||
    $[10] !== appendNoticeStable ||
    $[11] !== notifyStable ||
    $[12] !== removeNotification
  ) {
    onResumeEvent = () =>
      onQuotaResumeEvent((event) => {
        switch (event) {
          case "armed":
          case "rearmed": {
            removeNotification(QUOTA_AUTO_RESUME_CAP);
            removeNotification(QUOTA_AUTO_RESUME_CANCELLED);
            return;
          }
          case "taken-over": {
            appendNoticeStable(rearmedMessage(quotaAutoResumeState(), Date.now()), "notice");
            return;
          }
          case "cancelled": {
            appendNoticeStable(AUTO_CONTINUE_CANCELLED_TEXT, "notice");
            return;
          }
          case "auto-armed": {
            appendNoticeStable(startedMessage(quotaAutoResumeState(), Date.now()), "notice");
            return;
          }
          case "fired-now": {
            appendNoticeStable("Usage limit available again \xB7 continuing now", "notice");
            notifyStable(
              "Usage limit available \u2014 Claude is continuing your task",
              "quota_auto_resume_fired",
            );
            return;
          }
          case "stale": {
            appendNoticeStable("Usage limit has reset \xB7 Press enter to continue", "notice");
            notifyStable("Usage limit reset \u2014 press enter to continue", "quota_auto_resume_stale");
            return;
          }
          case "disabled": {
            appendNoticeStable(
              `Automatic continue was turned off \xB7 this task will not resume on its own${isAutoContinueRemoteEnabled() ? " (/rate-limit-options to wait anyway)" : ""}`,
              "warning",
            );
            notifyStable(
              "Automatic continue was turned off \u2014 the task will not resume on its own",
              "quota_auto_resume_disabled",
            );
            return;
          }
          case "horizon-exceeded": {
            appendNoticeStable(
              "Automatic continue stopped \xB7 the usage limit now resets more than 24 hours out, so this task will not resume on its own (/rate-limit-options to wait anyway)",
              "warning",
            );
            notifyStable(
              "Automatic continue stopped \u2014 the usage limit now resets more than 24 hours out; the task will not resume on its own",
              "quota_auto_resume_disabled",
            );
            return;
          }
          case "continuation-dropped": {
            appendNoticeStable(
              "Automatic continue did not run \xB7 the continuation was blocked before it reached the model, so this task did not resume on its own \xB7 send a prompt to continue",
              "warning",
            );
            notifyStable(
              "Automatic continue did not run \u2014 the continuation was blocked before it reached the model; send a prompt to continue",
              "quota_auto_resume_disabled",
            );
            return;
          }
          case "cap-exhausted": {
            appendNoticeStable(
              "Automatic continue stopped after repeated usage limit hits \xB7 This task will not resume on its own (/rate-limit-options to try again)",
              "warning",
            );
            notifyStable(
              "Automatic continue stopped after repeated usage-limit hits \u2014 the task will not resume on its own",
              "quota_auto_resume_disabled",
            );
            addNotification({
              key: QUOTA_AUTO_RESUME_CAP,
              kind: "warning",
              text: "Automatic continue stopped after repeated usage-limit hits \xB7 /rate-limit-options to try again",
              color: "warning",
              priority: "high",
              timeoutMs: 20000,
            });
            return;
          }
          default:
        }
      });
    onResumeDeps = [addNotification, removeNotification, appendNoticeStable, notifyStable];
    $[9] = addNotification;
    $[10] = appendNoticeStable;
    $[11] = notifyStable;
    $[12] = removeNotification;
    $[13] = onResumeEvent;
    $[14] = onResumeDeps;
  } else {
    onResumeEvent = $[13];
    onResumeDeps = $[14];
  }
  useEffect(onResumeEvent, onResumeDeps);
  let tickEffect;
  if ($[15] !== appendNoticeStable || $[16] !== isLoading || $[17] !== notifyStable) {
    tickEffect = () => {
      if (tickAutoResume(Date.now(), isLoading) === "fired") {
        appendNoticeStable("Usage limit reset \xB7 Continuing automatically", "notice");
        notifyStable("Usage limit reset \u2014 Claude is continuing your task", "quota_auto_resume_fired");
      }
    };
    $[15] = appendNoticeStable;
    $[16] = isLoading;
    $[17] = notifyStable;
    $[18] = tickEffect;
  } else tickEffect = $[18];
  useInterval(tickEffect, quotaAutoResumeState_2.phase === "armed" ? QUOTA_AUTO_RESUME_MIN_DELAY_MS : null);
  let isArmedIdleValue;
  if ($[19] !== quotaAutoResumeState_2 || $[20] !== upgradePaths || $[21] !== timeUntilFireMs) {
    isArmedIdleValue = isArmedIdle(quotaAutoResumeState_2, timeUntilFireMs, upgradePaths);
    $[19] = quotaAutoResumeState_2;
    $[20] = upgradePaths;
    $[21] = timeUntilFireMs;
    $[22] = isArmedIdleValue;
  } else isArmedIdleValue = $[22];
  let isIdleArmed = isArmedIdleValue;
  let resetsAtSeconds =
    isIdleArmed && offerSuffix !== undefined && quotaAutoResumeState_2.phase === "armed"
      ? quotaAutoResumeState_2.resetsAtSeconds
      : null;
  let resetsDeps;
  let logOfferEffect;
  if ($[23] !== resetsAtSeconds) {
    logOfferEffect = () => {
      if (resetsAtSeconds !== null) logCreditOfferShown("cli_wait_footer");
    };
    resetsDeps = [resetsAtSeconds];
    $[23] = resetsAtSeconds;
    $[24] = resetsDeps;
    $[25] = logOfferEffect;
  } else {
    resetsDeps = $[24];
    logOfferEffect = $[25];
  }
  useEffect(logOfferEffect, resetsDeps);
  let status;
  if ($[26] !== quotaAutoResumeState_2 || $[27] !== timeUntilFireMs) {
    status = quotaAutoResumeStatus(quotaAutoResumeState_2, timeUntilFireMs);
    $[26] = quotaAutoResumeState_2;
    $[27] = timeUntilFireMs;
    $[28] = status;
  } else status = $[28];
  let status_2 = status;
  if (status_2 === null) {
    let declinedStatus;
    if ($[29] === MEMO_CACHE_SENTINEL) {
      let resetsAt = getCurrentLimits().resetsAt;
      declinedStatus =
        resetsAt !== undefined && isResetKeyArmed(resetsAt)
          ? {
              kind: "declined",
            }
          : null;
      $[29] = declinedStatus;
    } else declinedStatus = $[29];
    return declinedStatus;
  }
  let credits;
  if ($[30] !== isIdleArmed || $[31] !== offerSuffix) {
    credits = isIdleArmed
      ? offerSuffix !== undefined
        ? `${autoResumeCopy().credits} \xB7 ${offerSuffix}`
        : autoResumeCopy().credits
      : null;
    $[30] = isIdleArmed;
    $[31] = offerSuffix;
    $[32] = credits;
  } else credits = $[32];
  let result;
  if ($[33] !== status_2 || $[34] !== credits) {
    result = {
      kind: "live",
      ...status_2,
      credits,
    };
    $[33] = status_2;
    $[34] = credits;
    $[35] = result;
  } else result = $[35];
  return result;
}
//@ chunk-fm6h4dv7.js:9130-9174 placement
/**
 * 导出值：LIMIT_CATEGORIES（session/weekly/fable/full）。
 */
var LIMIT_CATEGORIES = ["session", "weekly", "fable", "full"];
//@ chunk-fm6h4dv7.js:9174-9375 placement
/**
 * 判断一次额度重置属于哪种：givesBackWeekly 时为 fable；有明确 type 用 type；否则按清空的窗口：只有 five_hour 为 session、只有其他窗口为 weekly、都有为 full。
 */
function getLimitResetKind(grant) {
  if (grant.givesBackWeekly) return "fable";
  if (grant.type !== null) return grant.type;
  let included = grant.clears.includes("five_hour");
  let any = grant.clears.some((clear) => clear !== "five_hour");
  return included && !any ? "session" : any && !included ? "weekly" : "full";
}
//@ chunk-fm6h4dv7.js:9375-9437 placement
function isUsableLimit(grant) {
  return !grant.paused && (grant.resetsLeft > 0 || grant.usableNow);
}
//@ chunk-fm6h4dv7.js:9437-9523 placement
function clearsLimit(grant, rateLimitType) {
  return (
    grant.clears.some((clear) => clear === rateLimitType) ||
    (rateLimitType === "seven_day" && grant.givesBackWeekly)
  );
}
//@ chunk-fm6h4dv7.js:9523-9661 placement
var RESET_KIND_BY_LIMIT_TYPE = {
  five_hour: "session",
  seven_day: "weekly",
  seven_day_overage_included: "fable",
  seven_day_opus: null,
  seven_day_sonnet: null,
  overage: null,
};
//@ chunk-fm6h4dv7.js:9661-9782 placement
/**
 * 给重置种类排序：与当前限流类型对应的种类排最前（-1），seven_day 限流下 fable 排最后，其余按默认顺序。
 */
function rankResetKindForLimit(kind, limitType) {
  if (limitType !== null && RESET_KIND_BY_LIMIT_TYPE[limitType] === kind) return -1;
  if (limitType === "seven_day" && kind === "fable") return LIMIT_CATEGORIES.length;
  return LIMIT_CATEGORIES.indexOf(kind);
}
//@ chunk-fm6h4dv7.js:9782-9938 placement
/**
 * 重置种类的显示名："5-hour reset"、"Fable reset"、"full reset"、"weekly reset"。
 */
function formatResetKindName(kind) {
  switch (kind) {
    case "session":
      return "5-hour reset";
    case "fable":
      return "Fable reset";
    case "full":
      return "full reset";
    case "weekly":
      return "weekly reset";
  }
}
//@ chunk-fm6h4dv7.js:9938-10050 placement
/**
 * 按数量格式化重置次数："no X resets"、"1 X"、"N Xs"（session 写作 five-hour reset）。
 */
function formatResetCount(kind, count) {
  let kindName = kind === "session" ? "five-hour reset" : formatResetKindName(kind);
  return count === 0 ? `no ${kindName}s` : count === 1 ? `1 ${kindName}` : `${count} ${kindName}s`;
}
//@ chunk-fm6h4dv7.js:10050-10167 placement
/**
 * 把 [{kind, count}] 拼成 "N 5-hour, M weekly resets" 一样的摘要。
 */
function formatResetCountsSummary(counts) {
  return `${counts
    .map(({ kind, count }) => `${count} ${formatResetCount(kind, 1).replace(/^1 | reset$/g, "")}`)
    .join(", ")} resets`;
}
//@ chunk-fm6h4dv7.js:10167-10255 placement
function limitDescription(kind) {
  return kind === "fable" ? "returns what Fable used to your weekly limit" : undefined;
}
//@ chunk-fm6h4dv7.js:10255-10482 placement
/**
 * 重置生效后的提示文字（5-hour/Fable/全部/每周限额已重置）。
 */
function formatResetAppliedText(kind) {
  switch (kind) {
    case "session":
      return "5-hour limit reset";
    case "fable":
      return "Fable reset used \xB7 what Fable used is back in your weekly limit";
    case "full":
      return "Limits reset";
    case "weekly":
      return "Weekly limits reset";
  }
}
//@ chunk-fm6h4dv7.js:10482-10528 placement
var MAX_ATTEMPTS = 3;
var RETRY_AFTER_MS = 12000;
var RETRY_MAX_MS = 35000;
var POLL_INTERVAL_MS = 600000;
var RETRY_BACKOFF_MS = 20000;
//@ chunk-fm6h4dv7.js:10528-10693 placement
/**
 * 对可重置的限流状态记下 {rateLimitType, wallResetsAt, accountEpoch}，用于之后判断是否还是同一次限流；不满足时返回 null。
 */
function captureWallResetIdentity(limits) {
  if (!canAutoResumeLimitType(limits) || limits.rateLimitType === undefined || limits.resetsAt === undefined)
    return null;
  return {
    rateLimitType: limits.rateLimitType,
    wallResetsAt: limits.resetsAt,
    accountEpoch: getLimitsAccountEpoch(),
  };
}
//@ chunk-fm6h4dv7.js:10693-10803 placement
/**
 * 判断当前限流状态与之前记下的是否是同一次（类型、重置时间、账号纪元都一致）。
 */
function isSameWallReset(wall, status) {
  return (
    status.rateLimitType === wall.rateLimitType &&
    status.resetsAt === wall.wallResetsAt &&
    wall.accountEpoch === getLimitsAccountEpoch()
  );
}
//@ chunk-fm6h4dv7.js:10803-10887 placement
function usableStatusForWall(wall) {
  let creditState = currentUsageCreditState();
  return creditState.phase === "answered" && isSameWallReset(creditState.wall, wall)
    ? creditState.status
    : undefined;
}
export {
  QUOTA_AUTO_RESUME_CANCELLED,
  AUTO_CONTINUE_CANCELLED_TEXT,
  useQuotaAutoResumeState,
  useRateLimitState,
  isSameWallReset,
  useResetReached,
  scheduleAtTimestamp,
  formatResetCountsSummary,
  usageLimitStatusText,
  QuotaAutoResume,
  logLimitFooterOfferShownOnce,
  TENGU_PEWTER_SUMMIT,
  logRateLimitMessageShownOnce,
  isAutoResumeOfferEnabled,
  LIMIT_CATEGORIES,
  getRateLimitEventProps,
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
  MAX_ATTEMPTS,
  RETRY_AFTER_MS,
  RETRY_MAX_MS,
};
