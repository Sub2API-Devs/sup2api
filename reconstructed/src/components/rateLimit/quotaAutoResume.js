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
import { init_react_production, y, P, Se, Q, yt } from "../../../vendor/react/cjs/react.production.js";
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
import { u, string } from "../../../vendor/zod/v4/classic/schemas.js";
import { cleanTaskDescription } from "../../utils/taskDescription.js";
import { truncateToWidth, formatResetTime } from "../../utils/format.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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

//@ chunk-fm6h4dv7.js:1911-1941 placement
var TENGU_PEWTER_SUMMIT = "tengu_pewter_summit";
//@ chunk-fm6h4dv7.js:1941-1945 placement
init_react_production();
//@ chunk-fm6h4dv7.js:1945-2022 placement
/**
 * 订阅当前限额状态的 hook。
 */
function useRateLimitState() {
  let [i, s] = y({
    ...getCurrentLimits(),
  });
  P(
    () =>
      onLimitsStatusChanged((d) => {
        s({
          ...d,
        });
      }),
    [],
  );
  return i;
}
//@ chunk-fm6h4dv7.js:2022-2088 placement
var autoResumeKeyStore = new HostScoped(() => ({
  messageKeys: new Set(),
  footerOfferKeys: new Set(),
}));
//@ chunk-fm6h4dv7.js:2088-2225 placement
/**
 * 构造限流相关事件的公共字段：limit_type（只有已知类型才上报）、订阅档位 tier、resets_at。
 */
function getRateLimitEventProps(i) {
  let rateLimitType = i.rateLimitType;
  return {
    limit_type:
      rateLimitType !== undefined && Object.hasOwn(RATE_LIMIT_DISPLAY_NAMES, rateLimitType)
        ? fromEnum(rateLimitType)
        : undefined,
    tier: fromEnum(currentSubscriptionTier()),
    resets_at: i.resetsAt,
  };
}
//@ chunk-fm6h4dv7.js:2225-2462 placement
/**
 * 对同一 (重置时间, 是否显示提示) 只打点一次 tengu_rate_limit_message_shown，附带提示类型与是否在实时等待。
 */
function logRateLimitMessageShownOnce(host, s, d) {
  if (s.resetsAt === undefined) return;
  let messageKeys = autoResumeKeyStore.of(host).messageKeys;
  let b = `${s.resetsAt}:${d.shown}`;
  if (messageKeys.has(b)) return;
  messageKeys.add(b);
  logEvent("tengu_rate_limit_message_shown", {
    ...getRateLimitEventProps(s),
    hint: fromEnum(d.kind),
    hint_shown: d.shown,
    wait_live: d.waitLive,
  });
}
//@ chunk-fm6h4dv7.js:2462-2653 placement
/**
 * 对同一 (重置时间, offer) 只打点一次 tengu_limit_footer_offer_shown。
 */
function logLimitFooterOfferShownOnce(host, rateLimitState, d) {
  if (rateLimitState.resetsAt === undefined) return;
  let footerOfferKeys = autoResumeKeyStore.of(host).footerOfferKeys;
  let b = `${rateLimitState.resetsAt}:${d}`;
  if (footerOfferKeys.has(b)) return;
  footerOfferKeys.add(b);
  logEvent("tengu_limit_footer_offer_shown", {
    ...getRateLimitEventProps(rateLimitState),
    offer: fromEnum(d),
  });
}
//@ chunk-fm6h4dv7.js:2653-2657 placement
init_react_production();
//@ chunk-fm6h4dv7.js:2657-2732 placement
/**
 * 函数 isAutoResumeOfferEnabled（开关开且含 overage）。
 */
function isAutoResumeOfferEnabled(upgradePaths) {
  return usageCreditsCommand.isEnabled() && (upgradePaths === undefined || upgradePaths.includes("overage"));
}
//@ chunk-fm6h4dv7.js:2732-2832 placement = isBigQueryMetricsEnabled (1)
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
init_react_production();
//@ chunk-fm6h4dv7.js:2836-2849 placement
var AUTO_RESUME_PROMPT_MS = 30000;
//@ chunk-fm6h4dv7.js:2849-3026 placement
/**
 * 在目标时间戳到达时调用回调：分段 setTimeout（每段不超过上限）避免长定时器漂移；返回取消函数；时间戳无效时什么都不做。
 */
function scheduleAtTimestamp(i, s, d) {
  let m = false;
  let b = () => {};
  if (Number.isNaN(i)) return b;
  let _ = () => {
    if (m) return;
    let h = i - Date.now();
    if (h <= 0) {
      d();
      return;
    }
    b = s(_, Math.min(h, AUTO_RESUME_PROMPT_MS));
  };
  _();
  return () => {
    m = true;
    b();
  };
}
//@ chunk-fm6h4dv7.js:3026-3173 placement
/**
 * 判断某重置时间是否已到（带定时器）。
 */
function useResetReached(i) {
  let d = Se(clockContext)?.setTimeout ?? defaultSetTimeout;
  let m = Q(() => {
    if (i === null) return noopClock;
    return (b) => scheduleAtTimestamp(i, d, b);
  }, [i, d]);
  return yt(m, () => i !== null && Date.now() >= i);
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
  return yt(onQuotaResumeChange, quotaAutoResumeState, quotaAutoResumeState);
}
//@ chunk-fm6h4dv7.js:3355-3842 placement
/**
 * 额度自动继续的开关名与提示文本模板。
 */
var QUOTA_AUTO_RESUME_GATE = "tengu_functional_llama";
var AUTO_RESUME_COPY = {
  waiting: "Continuing automatically {when} \xB7 Esc to cancel",
  started: "Usage limit reached \xB7 continuing automatically {when} \xB7 esc to cancel",
  rearmed: "Usage limit reached again \xB7 continuing automatically {when} \xB7 esc to cancel",
  credits: "/usage-credits to continue now",
};
var COPY_MAX_WIDTH = 120;
var AutoResumeCopySchema = DoctorLazy(() =>
  u({
    waiting: string().optional().catch(undefined),
    started: string().optional().catch(undefined),
    rearmed: string().optional().catch(undefined),
    credits: string().optional().catch(undefined),
  }),
);
//@ chunk-fm6h4dv7.js:3842-3967 placement
function resolveAutoResumeText(i, s) {
  let d = cleanTaskDescription(s);
  if (d === undefined) return AUTO_RESUME_COPY[i];
  if (i === "credits") return truncateToWidth(d, COPY_MAX_WIDTH);
  return d.includes("{when}") ? d : AUTO_RESUME_COPY[i];
}
//@ chunk-fm6h4dv7.js:3967-4164 placement
function getAutoResumeTexts(featureValue_CACHED_MAY_BE_STALE) {
  let s = AutoResumeCopySchema().safeParse(featureValue_CACHED_MAY_BE_STALE);
  let d = s.success ? s.data : {};
  return {
    waiting: resolveAutoResumeText("waiting", d.waiting),
    started: resolveAutoResumeText("started", d.started),
    rearmed: resolveAutoResumeText("rearmed", d.rearmed),
    credits: resolveAutoResumeText("credits", d.credits),
  };
}
//@ chunk-fm6h4dv7.js:4164-4200 placement
function autoResumeCopy() {
  return getAutoResumeTexts(getFeatureValue_CACHED_MAY_BE_STALE(QUOTA_AUTO_RESUME_GATE, null));
}
//@ chunk-fm6h4dv7.js:4200-4253 placement
function fillWhen(i, s) {
  return truncateToWidth(i.replace("{when}", s), COPY_MAX_WIDTH);
}
//@ chunk-fm6h4dv7.js:4253-4367 placement
function describeResumeTime(i, s) {
  let resetsAtSeconds = i.phase === "armed" ? i.resetsAtSeconds : 0;
  let m = resetsAtSeconds * 1000 > s ? formatResetTime(resetsAtSeconds) : undefined;
  return m ? `at ${m}` : "shortly";
}
//@ chunk-fm6h4dv7.js:4367-4416 placement
function startedMessage(i, s) {
  return fillWhen(autoResumeCopy().started, describeResumeTime(i, s));
}
//@ chunk-fm6h4dv7.js:4416-4465 placement
function rearmedMessage(i, s) {
  return fillWhen(autoResumeCopy().rearmed, describeResumeTime(i, s));
}
//@ chunk-fm6h4dv7.js:4465-4494 placement
var USAGE_LIMIT_REACHED_TEXT = "Usage limit reached";
//@ chunk-fm6h4dv7.js:4494-4565 placement
/**
 * 函数 usageLimitStatusText（带重置时间的限流文案）。
 */
function usageLimitStatusText(i) {
  let s = formatResetTime(i);
  return s ? `${USAGE_LIMIT_REACHED_TEXT} \xB7 limit resets ${s}` : USAGE_LIMIT_REACHED_TEXT;
}
//@ chunk-fm6h4dv7.js:4565-4995 placement
/**
 * 根据阶段（armed/stale）生成自动继续的状态行与下一步提示。
 */
function quotaAutoResumeStatus(quotaAutoResumeState, s) {
  if (quotaAutoResumeState.phase === "stale")
    return {
      status: "Your usage limit has reset",
      next: "Press enter to continue",
    };
  if (quotaAutoResumeState.phase !== "armed") return null;
  let d = formatResetTime(quotaAutoResumeState.resetsAtSeconds);
  let status = usageLimitStatusText(quotaAutoResumeState.resetsAtSeconds);
  if (s)
    return {
      status,
      next: "Continuing shortly \xB7 Esc to cancel",
    };
  let b = fillWhen(autoResumeCopy().waiting, d ? "at " + d : "when it resets");
  if (b.startsWith(`${USAGE_LIMIT_REACHED_TEXT} \xB7 `))
    b = b.slice(USAGE_LIMIT_REACHED_TEXT.length + 3).replace(/^./u, (_) => _.toUpperCase());
  return {
    status,
    next: b,
  };
}
//@ chunk-fm6h4dv7.js:4995-5046 placement
function isArmedIdle(quotaAutoResumeState, s, d) {
  return quotaAutoResumeState.phase === "armed" && !s && d;
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
  let L = w(36);
  let { isLoading, transcript } = props;
  let { addNotification, removeNotification } = useNotifications();
  let { storageV5, credentials } = useTheme_2();
  let terminalNotification = useTerminalNotification();
  let quotaAutoResumeState_2 = useQuotaAutoResumeState();
  let k = timeUntilFire(quotaAutoResumeState_2);
  let T = yt(onLimitsStatusChanged, upgradePathsEnabled);
  let x = yt(
    onCreditOfferPromptChange,
    quotaAutoResumeState_2.phase === "armed" ? getOfferMenuSuffix : noopEffect,
  );
  let I;
  let O;
  if (L[0] !== storageV5) {
    I = () => {
      startQuotaSubscriptionsFor(storageV5);
    };
    O = [storageV5];
    L[0] = storageV5;
    L[1] = I;
    L[2] = O;
  } else {
    I = L[1];
    O = L[2];
  }
  P(I, O);
  let D;
  if (L[3] !== transcript) {
    D = (Fe, G) =>
      transcript.apply({
        type: "append",
        messages: [createSystemMessage(Fe, G)],
      });
    L[3] = transcript;
    L[4] = D;
  } else D = L[4];
  let R = D;
  let q;
  if (L[5] !== credentials || L[6] !== storageV5 || L[7] !== terminalNotification) {
    q = (message, notificationType) =>
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
    L[5] = credentials;
    L[6] = storageV5;
    L[7] = terminalNotification;
    L[8] = q;
  } else q = L[8];
  let F = q;
  let se;
  let _e;
  if (L[9] !== addNotification || L[10] !== R || L[11] !== F || L[12] !== removeNotification) {
    se = () =>
      onQuotaResumeEvent(($e) => {
        switch ($e) {
          case "armed":
          case "rearmed": {
            removeNotification(QUOTA_AUTO_RESUME_CAP);
            removeNotification(QUOTA_AUTO_RESUME_CANCELLED);
            return;
          }
          case "taken-over": {
            R(rearmedMessage(quotaAutoResumeState(), Date.now()), "notice");
            return;
          }
          case "cancelled": {
            R(AUTO_CONTINUE_CANCELLED_TEXT, "notice");
            return;
          }
          case "auto-armed": {
            R(startedMessage(quotaAutoResumeState(), Date.now()), "notice");
            return;
          }
          case "fired-now": {
            R("Usage limit available again \xB7 continuing now", "notice");
            F("Usage limit available \u2014 Claude is continuing your task", "quota_auto_resume_fired");
            return;
          }
          case "stale": {
            R("Usage limit has reset \xB7 Press enter to continue", "notice");
            F("Usage limit reset \u2014 press enter to continue", "quota_auto_resume_stale");
            return;
          }
          case "disabled": {
            R(
              `Automatic continue was turned off \xB7 this task will not resume on its own${isAutoContinueRemoteEnabled() ? " (/rate-limit-options to wait anyway)" : ""}`,
              "warning",
            );
            F(
              "Automatic continue was turned off \u2014 the task will not resume on its own",
              "quota_auto_resume_disabled",
            );
            return;
          }
          case "horizon-exceeded": {
            R(
              "Automatic continue stopped \xB7 the usage limit now resets more than 24 hours out, so this task will not resume on its own (/rate-limit-options to wait anyway)",
              "warning",
            );
            F(
              "Automatic continue stopped \u2014 the usage limit now resets more than 24 hours out; the task will not resume on its own",
              "quota_auto_resume_disabled",
            );
            return;
          }
          case "continuation-dropped": {
            R(
              "Automatic continue did not run \xB7 the continuation was blocked before it reached the model, so this task did not resume on its own \xB7 send a prompt to continue",
              "warning",
            );
            F(
              "Automatic continue did not run \u2014 the continuation was blocked before it reached the model; send a prompt to continue",
              "quota_auto_resume_disabled",
            );
            return;
          }
          case "cap-exhausted": {
            R(
              "Automatic continue stopped after repeated usage limit hits \xB7 This task will not resume on its own (/rate-limit-options to try again)",
              "warning",
            );
            F(
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
    _e = [addNotification, removeNotification, R, F];
    L[9] = addNotification;
    L[10] = R;
    L[11] = F;
    L[12] = removeNotification;
    L[13] = se;
    L[14] = _e;
  } else {
    se = L[13];
    _e = L[14];
  }
  P(se, _e);
  let De;
  if (L[15] !== R || L[16] !== isLoading || L[17] !== F) {
    De = () => {
      if (tickAutoResume(Date.now(), isLoading) === "fired") {
        R("Usage limit reset \xB7 Continuing automatically", "notice");
        F("Usage limit reset \u2014 Claude is continuing your task", "quota_auto_resume_fired");
      }
    };
    L[15] = R;
    L[16] = isLoading;
    L[17] = F;
    L[18] = De;
  } else De = L[18];
  useInterval(De, quotaAutoResumeState_2.phase === "armed" ? QUOTA_AUTO_RESUME_MIN_DELAY_MS : null);
  let On;
  if (L[19] !== quotaAutoResumeState_2 || L[20] !== T || L[21] !== k) {
    On = isArmedIdle(quotaAutoResumeState_2, k, T);
    L[19] = quotaAutoResumeState_2;
    L[20] = T;
    L[21] = k;
    L[22] = On;
  } else On = L[22];
  let Je = On;
  let resetsAtSeconds =
    Je && x !== undefined && quotaAutoResumeState_2.phase === "armed"
      ? quotaAutoResumeState_2.resetsAtSeconds
      : null;
  let Un;
  let Mn;
  if (L[23] !== resetsAtSeconds) {
    Mn = () => {
      if (resetsAtSeconds !== null) logCreditOfferShown("cli_wait_footer");
    };
    Un = [resetsAtSeconds];
    L[23] = resetsAtSeconds;
    L[24] = Un;
    L[25] = Mn;
  } else {
    Un = L[24];
    Mn = L[25];
  }
  P(Mn, Un);
  let Pn;
  if (L[26] !== quotaAutoResumeState_2 || L[27] !== k) {
    Pn = quotaAutoResumeStatus(quotaAutoResumeState_2, k);
    L[26] = quotaAutoResumeState_2;
    L[27] = k;
    L[28] = Pn;
  } else Pn = L[28];
  let Ge = Pn;
  if (Ge === null) {
    let oe;
    if (L[29] === MEMO_CACHE_SENTINEL) {
      let resetsAt = getCurrentLimits().resetsAt;
      oe =
        resetsAt !== undefined && isResetKeyArmed(resetsAt)
          ? {
              kind: "declined",
            }
          : null;
      L[29] = oe;
    } else oe = L[29];
    return oe;
  }
  let credits;
  if (L[30] !== Je || L[31] !== x) {
    credits = Je
      ? x !== undefined
        ? `${autoResumeCopy().credits} \xB7 ${x}`
        : autoResumeCopy().credits
      : null;
    L[30] = Je;
    L[31] = x;
    L[32] = credits;
  } else credits = L[32];
  let Wn;
  if (L[33] !== Ge || L[34] !== credits) {
    Wn = {
      kind: "live",
      ...Ge,
      credits,
    };
    L[33] = Ge;
    L[34] = credits;
    L[35] = Wn;
  } else Wn = L[35];
  return Wn;
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
function rankResetKindForLimit(kind, s) {
  if (s !== null && RESET_KIND_BY_LIMIT_TYPE[s] === kind) return -1;
  if (s === "seven_day" && kind === "fable") return LIMIT_CATEGORIES.length;
  return LIMIT_CATEGORIES.indexOf(kind);
}
//@ chunk-fm6h4dv7.js:9782-9938 placement
/**
 * 重置种类的显示名："5-hour reset"、"Fable reset"、"full reset"、"weekly reset"。
 */
function formatResetKindName(i) {
  switch (i) {
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
function formatResetCount(kind, s) {
  let d = kind === "session" ? "five-hour reset" : formatResetKindName(kind);
  return s === 0 ? `no ${d}s` : s === 1 ? `1 ${d}` : `${s} ${d}s`;
}
//@ chunk-fm6h4dv7.js:10050-10167 placement
/**
 * 把 [{kind, count}] 拼成 "N 5-hour, M weekly resets" 一样的摘要。
 */
function formatResetCountsSummary(i) {
  return `${i
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
function captureWallResetIdentity(currentLimits) {
  if (
    !canAutoResumeLimitType(currentLimits) ||
    currentLimits.rateLimitType === undefined ||
    currentLimits.resetsAt === undefined
  )
    return null;
  return {
    rateLimitType: currentLimits.rateLimitType,
    wallResetsAt: currentLimits.resetsAt,
    accountEpoch: getLimitsAccountEpoch(),
  };
}
//@ chunk-fm6h4dv7.js:10693-10803 placement
/**
 * 判断当前限流状态与之前记下的是否是同一次（类型、重置时间、账号纪元都一致）。
 */
function isSameWallReset(wall, s) {
  return (
    s.rateLimitType === wall.rateLimitType &&
    s.resetsAt === wall.wallResetsAt &&
    wall.accountEpoch === getLimitsAccountEpoch()
  );
}
//@ chunk-fm6h4dv7.js:10803-10887 placement
function usableStatusForWall(i) {
  let s = currentUsageCreditState();
  return s.phase === "answered" && isSameWallReset(s.wall, i) ? s.status : undefined;
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
