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
import { j, y, P, Se, Q, yt } from "../../../vendor/react/cjs/react.production.js";
import {
  getCurrentLimits,
  onLimitsStatusChanged,
  RATE_LIMIT_DISPLAY_NAMES,
  getLimitsAccountEpoch,
} from "../../services/claudeAiLimits.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { JTe, hin } from "../../services/rateLimitContinuation.js";
import { logEvent } from "../../services/analytics/index.js";
import { usageCreditsCommand } from "../../commands/extra-usage/index.js";
import { getSubscriptionType } from "../../utils/auth.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { planModeConstituentFamily } from "../../utils/model/planModeModel.js";
import { getUserSpecifiedModelSetting } from "../../utils/model/smallFastModel.js";
import { _T, $L, bTe } from "../../ink/components/ClockContext.js";
import {
  qIo,
  quotaAutoResumeState,
  eOo,
  _Ut,
  tickAutoResume,
  T7e,
} from "../../services/quotaAutoResume/quotaAutoResume.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o } from "../../../vendor/zod/v4/classic/schemas.js";
import { vc } from "../../utils/taskDescription.js";
import { truncateToWidth, formatResetTime } from "../../utils/format.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useNotifications } from "../../context/notifications.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useTerminalNotification } from "../../ink/useTerminalNotification.js";
import { Jre, getOfferMenuSuffix, logCreditOfferShown, s9 } from "../../services/usageCreditOffers.js";
import { createSystemMessage } from "../../utils/messages.js";
import { gB } from "../../utils/terminalProbe.js";
import { pze } from "../../services/autoContinueAtUsageLimit.js";
import { useInterval } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";

//@ chunk-fm6h4dv7.js:1911-1941 placement
var TENGU_PEWTER_SUMMIT = "tengu_pewter_summit";
//@ chunk-fm6h4dv7.js:1941-1945 placement
j();
/**
 * 订阅当前限额状态的 hook。
 */
//@ chunk-fm6h4dv7.js:1945-2022 placement
function useRateLimitState() {
  let [i, s] = y({ ...getCurrentLimits() });
  return (
    P(
      () =>
        onLimitsStatusChanged((d) => {
          s({ ...d });
        }),
      [],
    ),
    i
  );
}
//@ chunk-fm6h4dv7.js:2022-2088 placement
var ft = new HostScoped(() => ({ messageKeys: new Set(), footerOfferKeys: new Set() }));
/**
 * 构造限流相关事件的公共字段：limit_type（只有已知类型才上报）、订阅档位 tier、resets_at。
 */
//@ chunk-fm6h4dv7.js:2088-2225 placement
function getRateLimitEventProps(i) {
  let rateLimitType = i.rateLimitType;
  return {
    limit_type:
      rateLimitType !== void 0 && Object.hasOwn(RATE_LIMIT_DISPLAY_NAMES, rateLimitType)
        ? fromEnum(rateLimitType)
        : void 0,
    tier: fromEnum(JTe()),
    resets_at: i.resetsAt,
  };
}
/**
 * 对同一 (重置时间, 是否显示提示) 只打点一次 tengu_rate_limit_message_shown，附带提示类型与是否在实时等待。
 */
//@ chunk-fm6h4dv7.js:2225-2462 placement
function logRateLimitMessageShownOnce(i, s, d) {
  if (s.resetsAt === void 0) return;
  let messageKeys = ft.of(i).messageKeys,
    b = `${s.resetsAt}:${d.shown}`;
  if (messageKeys.has(b)) return;
  (messageKeys.add(b),
    logEvent("tengu_rate_limit_message_shown", {
      ...getRateLimitEventProps(s),
      hint: fromEnum(d.kind),
      hint_shown: d.shown,
      wait_live: d.waitLive,
    }));
}
/**
 * 对同一 (重置时间, offer) 只打点一次 tengu_limit_footer_offer_shown。
 */
//@ chunk-fm6h4dv7.js:2462-2653 placement
function logLimitFooterOfferShownOnce(i, s, d) {
  if (s.resetsAt === void 0) return;
  let footerOfferKeys = ft.of(i).footerOfferKeys,
    b = `${s.resetsAt}:${d}`;
  if (footerOfferKeys.has(b)) return;
  (footerOfferKeys.add(b),
    logEvent("tengu_limit_footer_offer_shown", { ...getRateLimitEventProps(s), offer: fromEnum(d) }));
}
//@ chunk-fm6h4dv7.js:2653-2657 placement
j();
//@ chunk-fm6h4dv7.js:2657-2732 placement
function Dtn(i) {
  return usageCreditsCommand.isEnabled() && (i === void 0 || i.includes("overage"));
}
//@ chunk-fm6h4dv7.js:2732-2832 placement = isBigQueryMetricsEnabled (1)
function isBigQueryMetricsEnabled(i) {
  let subscriptionType = getSubscriptionType(),
    isC4EOrTeamUser = subscriptionType === "team" || subscriptionType === "enterprise";
  return (
    Dtn(i) &&
    !isC4EOrTeamUser &&
    !isEssentialTrafficOnly() &&
    planModeConstituentFamily(getUserSpecifiedModelSetting()) === null
  );
}
//@ chunk-fm6h4dv7.js:2832-2836 placement
j();
//@ chunk-fm6h4dv7.js:2836-2849 placement
var Fn = 30000;
/**
 * 在目标时间戳到达时调用回调：分段 setTimeout（每段不超过上限）避免长定时器漂移；返回取消函数；时间戳无效时什么都不做。
 */
//@ chunk-fm6h4dv7.js:2849-3026 placement
function scheduleAtTimestamp(i, s, d) {
  let m = !1,
    b = () => {};
  if (Number.isNaN(i)) return b;
  let _ = () => {
    if (m) return;
    let h = i - Date.now();
    if (h <= 0) {
      d();
      return;
    }
    b = s(_, Math.min(h, Fn));
  };
  return (
    _(),
    () => {
      ((m = !0), b());
    }
  );
}
/**
 * 判断某重置时间是否已到（带定时器）。
 */
//@ chunk-fm6h4dv7.js:3026-3173 placement
function useResetReached(i) {
  let d = Se(_T)?.setTimeout ?? $L,
    m = Q(() => {
      if (i === null) return bTe;
      return (b) => scheduleAtTimestamp(i, d, b);
    }, [i, d]);
  return yt(m, () => i !== null && Date.now() >= i);
}
//@ chunk-fm6h4dv7.js:3173-3317 placement
var QUOTA_AUTO_RESUME_MIN_DELAY_MS = 30000,
  QUOTA_AUTO_RESUME_CAP = "quota-auto-resume-cap",
  QUOTA_AUTO_RESUME_CANCELLED = "quota-auto-resume-cancelled",
  AUTO_CONTINUE_CANCELLED_TEXT = "Automatic continue cancelled \xB7 /rate-limit-options to re-arm";
/**
 * 订阅额度自动继续的状态。
 */
//@ chunk-fm6h4dv7.js:3317-3355 placement
function useQuotaAutoResumeState() {
  return yt(qIo, quotaAutoResumeState, quotaAutoResumeState);
}
/**
 * 额度自动继续的开关名与提示文本模板。
 */
//@ chunk-fm6h4dv7.js:3355-3842 placement
var QUOTA_AUTO_RESUME_GATE = "tengu_functional_llama",
  gt = {
    waiting: "Continuing automatically {when} \xB7 Esc to cancel",
    started: "Usage limit reached \xB7 continuing automatically {when} \xB7 esc to cancel",
    rearmed: "Usage limit reached again \xB7 continuing automatically {when} \xB7 esc to cancel",
    credits: "/usage-credits to continue now",
  },
  Pt = 120,
  Dn = DoctorLazy(() =>
    u({
      waiting: o()
        .optional()
        .catch(void 0),
      started: o()
        .optional()
        .catch(void 0),
      rearmed: o()
        .optional()
        .catch(void 0),
      credits: o()
        .optional()
        .catch(void 0),
    }),
  );
//@ chunk-fm6h4dv7.js:3842-3967 placement
function resolveAutoResumeText(i, s) {
  let d = vc(s);
  if (d === void 0) return gt[i];
  if (i === "credits") return truncateToWidth(d, Pt);
  return d.includes("{when}") ? d : gt[i];
}
//@ chunk-fm6h4dv7.js:3967-4164 placement
function getAutoResumeTexts(i) {
  let safeParse = Dn().safeParse(i),
    d = safeParse.success ? safeParse.data : {};
  return {
    waiting: resolveAutoResumeText("waiting", d.waiting),
    started: resolveAutoResumeText("started", d.started),
    rearmed: resolveAutoResumeText("rearmed", d.rearmed),
    credits: resolveAutoResumeText("credits", d.credits),
  };
}
//@ chunk-fm6h4dv7.js:4164-4200 placement
function ne() {
  return getAutoResumeTexts(getFeatureValue_CACHED_MAY_BE_STALE(QUOTA_AUTO_RESUME_GATE, null));
}
//@ chunk-fm6h4dv7.js:4200-4253 placement
function Ye(i, s) {
  return truncateToWidth(i.replace("{when}", s), Pt);
}
//@ chunk-fm6h4dv7.js:4253-4367 placement
function describeResumeTime(i, s) {
  let d = i.phase === "armed" ? i.resetsAtSeconds : 0,
    m = d * 1000 > s ? formatResetTime(d) : void 0;
  return m ? `at ${m}` : "shortly";
}
//@ chunk-fm6h4dv7.js:4367-4416 placement
function ht(i, s) {
  return Ye(ne().started, describeResumeTime(i, s));
}
//@ chunk-fm6h4dv7.js:4416-4465 placement
function Et(i, s) {
  return Ye(ne().rearmed, describeResumeTime(i, s));
}
//@ chunk-fm6h4dv7.js:4465-4494 placement
var we = "Usage limit reached";
//@ chunk-fm6h4dv7.js:4494-4565 placement
function zho(i) {
  let s = formatResetTime(i);
  return s ? `${we} \xB7 limit resets ${s}` : we;
}
/**
 * 根据阶段（armed/stale）生成自动继续的状态行与下一步提示。
 */
//@ chunk-fm6h4dv7.js:4565-4995 placement
function quotaAutoResumeStatus(i, s) {
  if (i.phase === "stale") return { status: "Your usage limit has reset", next: "Press enter to continue" };
  if (i.phase !== "armed") return null;
  let d = formatResetTime(i.resetsAtSeconds),
    m = zho(i.resetsAtSeconds);
  if (s) return { status: m, next: "Continuing shortly \xB7 Esc to cancel" };
  let b = Ye(ne().waiting, d ? "at " + d : "when it resets");
  if (b.startsWith(`${we} \xB7 `)) b = b.slice(we.length + 3).replace(/^./u, (_) => _.toUpperCase());
  return { status: m, next: b };
}
//@ chunk-fm6h4dv7.js:4995-5046 placement
function At(i, s, d) {
  return i.phase === "armed" && !s && d;
}
//@ chunk-fm6h4dv7.js:5046-5089 placement
function Ct() {
  return isBigQueryMetricsEnabled(getCurrentLimits().upgradePaths);
}
//@ chunk-fm6h4dv7.js:5089-5110 placement
function kt() {
  return;
}
//@ chunk-fm6h4dv7.js:5110-5203 placement
function Xe(i) {
  return useResetReached(i.phase === "armed" ? Math.min(i.fireAtMs, i.resetsAtSeconds * 1000) : null);
}
/**
 * 达到用量上限后在重置时自动继续对话的控制组件（通知、取消、重新布防）。
 */
//@ chunk-fm6h4dv7.js:5203-9093 placement
function QuotaAutoResume(i) {
  let L = w(36),
    { isLoading: isLoading, transcript: transcript } = i,
    { addNotification: addNotification, removeNotification: removeNotification } = useNotifications(),
    { storageV5: storageV5, credentials: credentials } = Me(),
    C = useTerminalNotification(),
    A = useQuotaAutoResumeState(),
    k = Xe(A),
    T = yt(onLimitsStatusChanged, Ct),
    x = yt(Jre, A.phase === "armed" ? getOfferMenuSuffix : kt),
    I,
    O;
  if (L[0] !== storageV5)
    ((I = () => {
      eOo(storageV5);
    }),
      (O = [storageV5]),
      (L[0] = storageV5),
      (L[1] = I),
      (L[2] = O));
  else ((I = L[1]), (O = L[2]));
  P(I, O);
  let D;
  if (L[3] !== transcript)
    ((D = (Fe, G) => transcript.apply({ type: "append", messages: [createSystemMessage(Fe, G)] })),
      (L[3] = transcript),
      (L[4] = D));
  else D = L[4];
  let R = D,
    q;
  if (L[5] !== credentials || L[6] !== storageV5 || L[7] !== C)
    ((q = (Ke, ae) =>
      void gB({ message: Ke, notificationType: ae }, C, { storageV5: storageV5, credentials: credentials })),
      (L[5] = credentials),
      (L[6] = storageV5),
      (L[7] = C),
      (L[8] = q));
  else q = L[8];
  let F = q,
    se,
    _e;
  if (L[9] !== addNotification || L[10] !== R || L[11] !== F || L[12] !== removeNotification)
    ((se = () =>
      _Ut(($e) => {
        switch ($e) {
          case "armed":
          case "rearmed": {
            (removeNotification(QUOTA_AUTO_RESUME_CAP), removeNotification(QUOTA_AUTO_RESUME_CANCELLED));
            return;
          }
          case "taken-over": {
            R(Et(quotaAutoResumeState(), Date.now()), "notice");
            return;
          }
          case "cancelled": {
            R(AUTO_CONTINUE_CANCELLED_TEXT, "notice");
            return;
          }
          case "auto-armed": {
            R(ht(quotaAutoResumeState(), Date.now()), "notice");
            return;
          }
          case "fired-now": {
            (R("Usage limit available again \xB7 continuing now", "notice"),
              F("Usage limit available \u2014 Claude is continuing your task", "quota_auto_resume_fired"));
            return;
          }
          case "stale": {
            (R("Usage limit has reset \xB7 Press enter to continue", "notice"),
              F("Usage limit reset \u2014 press enter to continue", "quota_auto_resume_stale"));
            return;
          }
          case "disabled": {
            (R(
              `Automatic continue was turned off \xB7 this task will not resume on its own${pze() ? " (/rate-limit-options to wait anyway)" : ""}`,
              "warning",
            ),
              F(
                "Automatic continue was turned off \u2014 the task will not resume on its own",
                "quota_auto_resume_disabled",
              ));
            return;
          }
          case "horizon-exceeded": {
            (R(
              "Automatic continue stopped \xB7 the usage limit now resets more than 24 hours out, so this task will not resume on its own (/rate-limit-options to wait anyway)",
              "warning",
            ),
              F(
                "Automatic continue stopped \u2014 the usage limit now resets more than 24 hours out; the task will not resume on its own",
                "quota_auto_resume_disabled",
              ));
            return;
          }
          case "continuation-dropped": {
            (R(
              "Automatic continue did not run \xB7 the continuation was blocked before it reached the model, so this task did not resume on its own \xB7 send a prompt to continue",
              "warning",
            ),
              F(
                "Automatic continue did not run \u2014 the continuation was blocked before it reached the model; send a prompt to continue",
                "quota_auto_resume_disabled",
              ));
            return;
          }
          case "cap-exhausted": {
            (R(
              "Automatic continue stopped after repeated usage limit hits \xB7 This task will not resume on its own (/rate-limit-options to try again)",
              "warning",
            ),
              F(
                "Automatic continue stopped after repeated usage-limit hits \u2014 the task will not resume on its own",
                "quota_auto_resume_disabled",
              ),
              addNotification({
                key: QUOTA_AUTO_RESUME_CAP,
                kind: "warning",
                text: "Automatic continue stopped after repeated usage-limit hits \xB7 /rate-limit-options to try again",
                color: "warning",
                priority: "high",
                timeoutMs: 20000,
              }));
            return;
          }
          default:
        }
      })),
      (_e = [addNotification, removeNotification, R, F]),
      (L[9] = addNotification),
      (L[10] = R),
      (L[11] = F),
      (L[12] = removeNotification),
      (L[13] = se),
      (L[14] = _e));
  else ((se = L[13]), (_e = L[14]));
  P(se, _e);
  let De;
  if (L[15] !== R || L[16] !== isLoading || L[17] !== F)
    ((De = () => {
      if (tickAutoResume(Date.now(), isLoading) === "fired")
        (R("Usage limit reset \xB7 Continuing automatically", "notice"),
          F("Usage limit reset \u2014 Claude is continuing your task", "quota_auto_resume_fired"));
    }),
      (L[15] = R),
      (L[16] = isLoading),
      (L[17] = F),
      (L[18] = De));
  else De = L[18];
  useInterval(De, A.phase === "armed" ? QUOTA_AUTO_RESUME_MIN_DELAY_MS : null);
  let On;
  if (L[19] !== A || L[20] !== T || L[21] !== k)
    ((On = At(A, k, T)), (L[19] = A), (L[20] = T), (L[21] = k), (L[22] = On));
  else On = L[22];
  let Je = On,
    He = Je && x !== void 0 && A.phase === "armed" ? A.resetsAtSeconds : null,
    Un,
    Mn;
  if (L[23] !== He)
    ((Mn = () => {
      if (He !== null) logCreditOfferShown("cli_wait_footer");
    }),
      (Un = [He]),
      (L[23] = He),
      (L[24] = Un),
      (L[25] = Mn));
  else ((Un = L[24]), (Mn = L[25]));
  P(Mn, Un);
  let Pn;
  if (L[26] !== A || L[27] !== k)
    ((Pn = quotaAutoResumeStatus(A, k)), (L[26] = A), (L[27] = k), (L[28] = Pn));
  else Pn = L[28];
  let Ge = Pn;
  if (Ge === null) {
    let oe;
    if (L[29] === MEMO_CACHE_SENTINEL) {
      let resetsAt = getCurrentLimits().resetsAt;
      oe = resetsAt !== void 0 && T7e(resetsAt) ? { kind: "declined" } : null;
      L[29] = oe;
    } else oe = L[29];
    return oe;
  }
  let oe;
  if (L[30] !== Je || L[31] !== x)
    ((oe = Je ? (x !== void 0 ? `${ne().credits} \xB7 ${x}` : ne().credits) : null),
      (L[30] = Je),
      (L[31] = x),
      (L[32] = oe));
  else oe = L[32];
  let Wn;
  if (L[33] !== Ge || L[34] !== oe)
    ((Wn = { kind: "live", ...Ge, credits: oe }), (L[33] = Ge), (L[34] = oe), (L[35] = Wn));
  else Wn = L[35];
  return Wn;
}
//@ chunk-fm6h4dv7.js:9130-9174 placement
var EWe = ["session", "weekly", "fable", "full"];
/**
 * 判断一次额度重置属于哪种：givesBackWeekly 时为 fable；有明确 type 用 type；否则按清空的窗口：只有 five_hour 为 session、只有其他窗口为 weekly、都有为 full。
 */
//@ chunk-fm6h4dv7.js:9174-9375 placement
function getLimitResetKind(i) {
  if (i.givesBackWeekly) return "fable";
  if (i.type !== null) return i.type;
  let included = i.clears.includes("five_hour"),
    any = i.clears.some((clear) => clear !== "five_hour");
  return included && !any ? "session" : any && !included ? "weekly" : "full";
}
//@ chunk-fm6h4dv7.js:9375-9437 placement
function Ft(i) {
  return !i.paused && (i.resetsLeft > 0 || i.usableNow);
}
//@ chunk-fm6h4dv7.js:9437-9523 placement
function ue(i, s) {
  return i.clears.some((clear) => clear === s) || (s === "seven_day" && i.givesBackWeekly);
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
/**
 * 给重置种类排序：与当前限流类型对应的种类排最前（-1），seven_day 限流下 fable 排最后，其余按默认顺序。
 */
//@ chunk-fm6h4dv7.js:9661-9782 placement
function rankResetKindForLimit(i, s) {
  if (s !== null && RESET_KIND_BY_LIMIT_TYPE[s] === i) return -1;
  if (s === "seven_day" && i === "fable") return EWe.length;
  return EWe.indexOf(i);
}
/**
 * 重置种类的显示名："5-hour reset"、"Fable reset"、"full reset"、"weekly reset"。
 */
//@ chunk-fm6h4dv7.js:9782-9938 placement
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
/**
 * 按数量格式化重置次数："no X resets"、"1 X"、"N Xs"（session 写作 five-hour reset）。
 */
//@ chunk-fm6h4dv7.js:9938-10050 placement
function formatResetCount(i, s) {
  let d = i === "session" ? "five-hour reset" : formatResetKindName(i);
  return s === 0 ? `no ${d}s` : s === 1 ? `1 ${d}` : `${s} ${d}s`;
}
/**
 * 把 [{kind, count}] 拼成 "N 5-hour, M weekly resets" 一样的摘要。
 */
//@ chunk-fm6h4dv7.js:10050-10167 placement
function formatResetCountsSummary(i) {
  return `${i.map(({ kind: kind, count: count }) => `${count} ${formatResetCount(kind, 1).replace(/^1 | reset$/g, "")}`).join(", ")} resets`;
}
//@ chunk-fm6h4dv7.js:10167-10255 placement
function Kt(i) {
  return i === "fable" ? "returns what Fable used to your weekly limit" : void 0;
}
/**
 * 重置生效后的提示文字（5-hour/Fable/全部/每周限额已重置）。
 */
//@ chunk-fm6h4dv7.js:10255-10482 placement
function formatResetAppliedText(i) {
  switch (i) {
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
var Vn = 3,
  nt = 12000,
  Bt = 35000,
  Qn = 600000,
  Zn = 20000;
/**
 * 对可重置的限流状态记下 {rateLimitType, wallResetsAt, accountEpoch}，用于之后判断是否还是同一次限流；不满足时返回 null。
 */
//@ chunk-fm6h4dv7.js:10528-10693 placement
function captureWallResetIdentity(i) {
  if (!hin(i) || i.rateLimitType === void 0 || i.resetsAt === void 0) return null;
  return { rateLimitType: i.rateLimitType, wallResetsAt: i.resetsAt, accountEpoch: getLimitsAccountEpoch() };
}
/**
 * 判断当前限流状态与之前记下的是否是同一次（类型、重置时间、账号纪元都一致）。
 */
//@ chunk-fm6h4dv7.js:10693-10803 placement
function isSameWallReset(i, s) {
  return (
    s.rateLimitType === i.rateLimitType &&
    s.resetsAt === i.wallResetsAt &&
    i.accountEpoch === getLimitsAccountEpoch()
  );
}
//@ chunk-fm6h4dv7.js:10803-10887 placement
function ee(i) {
  let s = s9();
  return s.phase === "answered" && isSameWallReset(s.wall, i) ? s.status : void 0;
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
  zho,
  QuotaAutoResume,
  logLimitFooterOfferShownOnce,
  TENGU_PEWTER_SUMMIT,
  logRateLimitMessageShownOnce,
  Dtn,
  EWe,
  getRateLimitEventProps,
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
  Vn,
  nt,
  Bt,
};
