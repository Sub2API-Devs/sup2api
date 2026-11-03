/**
 * hooks/notifs/useUsageLimitNotices.tsx
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 13, layout 3
 */
import { EMPTY_LIMIT_NOTICES } from "../../utils/messageQueueManager.js";
import { j, yt, ce, P } from "../../../vendor/react/cjs/react.production.js";
import {
  useRateLimitState,
  formatResetCountsSummary,
  useResetReached,
  zho,
  QuotaAutoResume,
  logLimitFooterOfferShownOnce,
} from "../../components/rateLimit/quotaAutoResume.js";
import { i9 } from "../../services/usageCreditOffers.js";
import {
  availableResetOffers,
  resetOfferFields,
  resetsUsedUpLine,
  isClaimingReset,
  subscribeResetChanges,
  canArmLowPriorityReset,
  reportResetOfferShown,
} from "../../services/rateLimit/rateLimitWall.js";
import {
  formatLimitResetTemplate,
  getCedarEmberCopy,
  getLimitResetCopy,
} from "../../commands/limit-reset/index.js";
import {
  usageCreditsSpentLine,
  logLimitResetOfferShown,
} from "../../components/rateLimit/usageCreditsOffer.js";
import {
  pir,
  aAt,
  K4e,
  fir,
  U8r,
  endLowPriorityIfReset,
  kEn,
} from "../../services/lowPriority/lowPriorityMode.js";
import { statusLineShouldDisplay } from "../../components/StatusLine.js";
import { formatResetTime } from "../../utils/format.js";
import { LOW_PRIORITY } from "../../services/lowPriority/headers.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { canOfferLowPriority, logLowPriorityShown } from "../../services/lowPriorityMode.js";
import { createSystemMessage } from "../../utils/messages.js";
import { useAppState } from "../../state/AppState.js";
import { isAutoResumableLimit } from "../../services/api/errors.js";
import { renderWithForceUpdate } from "../useForceRender.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useHost } from "../../context/session.js";
import { UsageLimitGraceNotice } from "../../components/UsageLimitGraceNotice.js";

/**
 * 从各类限额状态挑出 reset 提示（grant/weekly 及已用完）、低优先级、额度、套餐升级文案。
 */
//@ chunk-18hwfzwa.js:1655107-1655593 placement
function pickLimitNoticeParts(h) {
  let x = h.wait?.kind === "live" ? h.wait : null;
  return {
    reset:
      h.resetGrant.offer !== null
        ? { key: "grant", text: h.resetGrant.offer }
        : h.weeklyReset.offer !== null
          ? h.resetGrant.claimUnsettled
            ? null
            : { key: "weekly", text: h.weeklyReset.offer }
          : h.resetGrant.spent !== null
            ? { key: "grant-spent", text: h.resetGrant.spent }
            : h.weeklyReset.spent !== null
              ? { key: "weekly-spent", text: h.weeklyReset.spent }
              : null,
    lowPriority: h.lowPriorityOffer,
    credits: x?.credits ?? null,
    planUpsell: x === null ? h.wrapUp?.upsell || null : null,
  };
}
/**
 * 组装用量限额状态行与下一步提示行。
 */
//@ chunk-18hwfzwa.js:1655593-1656543 placement
function buildLimitStatusNotices(h) {
  let x = h.wait?.kind === "live" ? h.wait : null,
    D = pickLimitNoticeParts(h),
    L = h.wait?.kind === "declined" && h.wrapUp?.running !== !0,
    ee = [];
  if (h.wrapUp !== null)
    ee.push([
      { text: h.wrapUp.lead },
      { text: h.wrapUp.resets, dim: !0 },
      ...(L
        ? []
        : [
            { text: " \xB7 ", dim: !0 },
            { ...h.wrapUp.link, dim: !0 },
          ]),
      ...(D.planUpsell !== null ? [{ text: ` \xB7 ${D.planUpsell}`, dim: !0 }] : []),
    ]);
  else if (x !== null) ee.push([{ text: x.status }]);
  else if (h.pausedWorkflow !== null) ee.push([{ text: h.pausedWorkflow }]);
  if (h.lowPriorityActive !== null) ee.push([{ text: h.lowPriorityActive, color: "text" }]);
  let ke = [];
  if (x !== null) ke.push([{ text: x.next }]);
  if (D.credits !== null) ke.push([{ text: D.credits, dim: !0 }]);
  if (D.reset !== null) ke.push([{ text: D.reset.text, dim: D.reset.key.endsWith("spent") }]);
  if (D.lowPriority !== null) ke.push([{ text: D.lowPriority }]);
  if (ee.length === 0 && ke.length === 0) return EMPTY_LIMIT_NOTICES;
  return {
    status:
      ee.length === 0
        ? null
        : createEventNotice("limit-status", joinSegmentsWithDots(ee), h.wrapUp !== null ? "warning" : "text"),
    next: ke.length === 0 ? null : createEventNotice("limit-next", joinSegmentsWithDots(ke)),
  };
}
/**
 * {kind:"event",priority:"high",wrap:true} 通知对象。旧版名 getCommandsByMaxPriority 为错配。
 */
//@ chunk-18hwfzwa.js:1656543-1656640 placement
function createEventNotice(h, x, D = "text") {
  return { key: h, kind: "event", priority: "high", wrap: !0, color: D, segments: x };
}
/**
 * 用 " · " 连接多段文本片段。
 */
//@ chunk-18hwfzwa.js:1656640-1656719 placement
function joinSegmentsWithDots(h) {
  return h.flatMap((x, D) => (D === 0 ? x : [{ text: " \xB7 ", dim: !0 }, ...x]));
}
/**
 * 惰性模块初始化调用 j()（Bun 打包的 init 包装），无业务逻辑。
 */
//@ chunk-18hwfzwa.js:1656719-1656723 layout
j();
/**
 * React hook：限额重置赠送的提示与已用完提示。
 */
//@ chunk-18hwfzwa.js:1656723-1657417 placement
function useResetGrantOffer() {
  let h = useRateLimitState(),
    x = yt(
      i9,
      ce(() => {
        let He = availableResetOffers(h),
          [We, ...ze] = He;
        if (We === void 0) return null;
        let reduced = ze.reduce(
            (kt, At) =>
              At.endsAtMs !== null && (kt.endsAtMs === null || At.endsAtMs < kt.endsAtMs) ? At : kt,
            We,
          ),
          rt =
            ze.length === 0
              ? formatLimitResetTemplate(getCedarEmberCopy().noticeLine, resetOfferFields(We))
              : formatLimitResetTemplate(getCedarEmberCopy().noticeLineMany, {
                  ...resetOfferFields(reduced),
                  held: formatResetCountsSummary(He.map((kt) => ({ kind: kt.kind, count: kt.resetsLeft }))),
                });
        return `${reduced.endsAtMs ?? ""}
${rt}`;
      }, [h]),
    ),
    D =
      x?.indexOf(`
`) ?? -1,
    L = x === null ? null : x.slice(D + 1),
    ee = x === null || D === 0 ? null : Number(x.slice(0, D)),
    ke = yt(
      i9,
      ce(() => resetsUsedUpLine(h) ?? null, [h]),
    ),
    Re = yt(i9, isClaimingReset),
    Be = h.resetsAt !== void 0 ? h.resetsAt * 1000 : null;
  return (
    useResetReached(L !== null || ke !== null ? (ee !== null && (Be === null || ee < Be) ? ee : Be) : null),
    { offer: L, spent: L === null ? ke : null, claimUnsettled: Re }
  );
}
/**
 * 惰性模块初始化调用 j()。
 */
//@ chunk-18hwfzwa.js:1657417-1657421 layout
j();
/**
 * React hook：周限额重置提示。
 */
//@ chunk-18hwfzwa.js:1657421-1657638 placement
function useWeeklyResetOffer() {
  let h = useRateLimitState(),
    x = yt(
      subscribeResetChanges,
      ce(() => (canArmLowPriorityReset(h) ? getLimitResetCopy().noticeLine : null), [h]),
    ),
    D = yt(
      subscribeResetChanges,
      ce(() => usageCreditsSpentLine(h) ?? null, [h]),
    );
  return (
    useResetReached((x !== null || D !== null) && h.resetsAt !== void 0 ? h.resetsAt * 1000 : null),
    { offer: x, spent: x === null ? D : null }
  );
}
/**
 * 惰性模块初始化调用 j()。
 */
//@ chunk-18hwfzwa.js:1657638-1657642 layout
j();
/**
 * React hook：低优先级模式状态。
 */
//@ chunk-18hwfzwa.js:1657642-1657680 placement
function useLowPriorityState() {
  return yt(pir, aAt, aAt);
}
/**
 * 低优先级模式状态行（重置时间、额度百分比、停止命令）。
 */
//@ chunk-18hwfzwa.js:1657680-1657986 placement
function formatLowPriorityStatusLine(h, x) {
  let D = statusLineShouldDisplay(),
    L = h.phase === "active" ? formatResetTime(h.resetsAtSeconds, !1) : void 0,
    ee = D.statusLine.includes("{reset}")
      ? D.statusLine.replace("{reset}", L ?? "your usage limit resets")
      : D.statusLine,
    ke = x === void 0 ? "" : ` \xB7 ${D.allowanceNote.replace("{percent}", `${x}%`)}`;
  return `${ee}${ke} \xB7 /${LOW_PRIORITY} to stop`;
}
/**
 * 低优先级模式结束原因 → 提示文本（weekly/budget/off/extra_usage/max_wait）。
 */
//@ chunk-18hwfzwa.js:1657986-1658823 placement
function getLowPriorityEndedMessage(h, x = K4e()) {
  switch (h) {
    case "reset":
    case "user":
    case "conversation_reset":
    case "account_switch":
      return null;
    case "weekly":
      return "Lower-priority mode ended \xB7 you have reached your weekly usage limit";
    case "budget":
      return `${statusLineShouldDisplay().budgetExhaustedCopy} \xB7 lower-priority mode ended; it is offered again after your weekly limit resets`;
    case "off":
    case "ineligible":
    case "wall":
      return "Lower-priority mode is no longer available \xB7 it has ended; new messages wait for your usage limit to reset";
    case "extra_usage":
      return "Extra usage is now covering your requests \xB7 lower-priority mode ended";
    case "max_wait": {
      let D = x === void 0 ? void 0 : formatResetTime(Math.ceil(x / 1000), !1);
      return `No room for lower-priority work for a while \xB7 lower-priority mode stopped; new messages wait for your usage limit to reset${D ? ` \xB7 /${LOW_PRIORITY} again after ${D}` : ""}`;
    }
  }
}
/**
 * React hook：低优先级模式开始/结束的转录通知。
 */
//@ chunk-18hwfzwa.js:1658823-1660153 placement
function useLowPriorityNotices(h) {
  let ke = w(27),
    { transcript: transcript } = h,
    D = useRateLimitState(),
    L = useLowPriorityState(),
    ee = yt(pir, fir, fir),
    Re;
  if (ke[0] !== D || ke[1] !== L.phase)
    ((Re = L.phase === "idle" && canOfferLowPriority(D)), (ke[0] = D), (ke[1] = L.phase), (ke[2] = Re));
  else Re = ke[2];
  let Be = Re,
    He;
  if (ke[3] !== D || ke[4] !== Be || ke[5] !== L.phase)
    ((He = L.phase === "idle" && !Be && D.lowPriorityOffer === "treatment" ? K4e() : void 0),
      (ke[3] = D),
      (ke[4] = Be),
      (ke[5] = L.phase),
      (ke[6] = He));
  else He = ke[6];
  let We = He,
    ze;
  if (ke[7] !== D || ke[8] !== Be || ke[9] !== L || ke[10] !== We)
    ((ze = L.phase === "active" ? U8r(L) : Be && D.resetsAt !== void 0 ? D.resetsAt * 1000 : (We ?? null)),
      (ke[7] = D),
      (ke[8] = Be),
      (ke[9] = L),
      (ke[10] = We),
      (ke[11] = ze));
  else ze = ke[11];
  let rt = useResetReached(ze),
    kt,
    At;
  if (ke[12] !== rt || ke[13] !== L.phase)
    ((kt = () => {
      if (rt && L.phase === "active") endLowPriorityIfReset();
    }),
      (At = [rt, L.phase]),
      (ke[12] = rt),
      (ke[13] = L.phase),
      (ke[14] = kt),
      (ke[15] = At));
  else ((kt = ke[14]), (At = ke[15]));
  P(kt, At);
  let It, Ot;
  if (ke[16] !== transcript)
    ((It = () =>
      kEn((Et) => {
        if (Et.type !== "ended") {
          return;
        }
        let Dt = getLowPriorityEndedMessage(Et.reason);
        if (Dt === null) {
          return;
        }
        transcript.apply({ type: "append", messages: [createSystemMessage(Dt, "notice")] });
      })),
      (Ot = [transcript]),
      (ke[16] = transcript),
      (ke[17] = It),
      (ke[18] = Ot));
  else ((It = ke[17]), (Ot = ke[18]));
  P(It, Ot);
  let Lt;
  if (ke[19] !== ee || ke[20] !== L)
    ((Lt = L.phase === "active" ? formatLowPriorityStatusLine(L, ee) : null),
      (ke[19] = ee),
      (ke[20] = L),
      (ke[21] = Lt));
  else Lt = ke[21];
  let oo;
  if (ke[22] !== Be) ((oo = Be ? statusLineShouldDisplay().noticeLine : null), (ke[22] = Be), (ke[23] = oo));
  else oo = ke[23];
  let Xt;
  if (ke[24] !== Lt || ke[25] !== oo)
    ((Xt = { lowPriorityActive: Lt, lowPriorityOffer: oo }), (ke[24] = Lt), (ke[25] = oo), (ke[26] = Xt));
  else Xt = ke[26];
  return Xt;
}
/**
 * 运行中工作流任务里最晚的 rateLimitWait.resetsAt。
 */
//@ chunk-18hwfzwa.js:1660153-1660335 placement
function getEarliestWorkflowRateLimitReset(h) {
  return Object.values(h.tasks).reduce(
    (x, D) =>
      D.type === "local_workflow" && D.status === "running" && D.rateLimitWait !== void 0
        ? Math.max(x ?? 0, D.rateLimitWait.resetsAt)
        : x,
    null,
  );
}
/**
 * React hook：因限额暂停的工作流提示（tengu_lantern_snuffer）。
 */
//@ chunk-18hwfzwa.js:1660335-1660494 placement
function usePausedWorkflowNotice() {
  let h = useAppState(getEarliestWorkflowRateLimitReset),
    x = isAutoResumableLimit(useRateLimitState()),
    D = useResetReached(h === null ? null : h * 1000),
    L = h !== null && x && !D;
  return renderWithForceUpdate(
    () => L && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_snuffer", !1) === !0,
  ) && h !== null
    ? zho(h)
    : null;
}
/**
 * REPL 用的用量限额通知汇总 hook。
 */
//@ chunk-18hwfzwa.js:1660494-1661153 placement
function useUsageLimitNotices({ isLoading: isLoading, transcript: transcript }) {
  let D = useHost(),
    L = useRateLimitState(),
    ee = {
      wrapUp: UsageLimitGraceNotice(isLoading),
      wait: QuotaAutoResume({ isLoading: isLoading, transcript: transcript }),
      pausedWorkflow: usePausedWorkflowNotice(),
      resetGrant: useResetGrantOffer(),
      weeklyReset: useWeeklyResetOffer(),
      ...useLowPriorityNotices({ transcript: transcript }),
    },
    ke = buildLimitStatusNotices(ee),
    Re = pickLimitNoticeParts(ee),
    Be = Re.reset?.key === "grant" ? Re.reset.text : void 0,
    He = Re.reset?.key === "weekly" ? Re.reset.text : void 0,
    We = Re.lowPriority ?? void 0,
    ze = Re.credits ?? void 0,
    Xe = Re.planUpsell ?? void 0;
  return (
    P(() => {
      if (Be !== void 0) reportResetOfferShown(L, "notice");
    }, [Be, L]),
    P(() => {
      if (He !== void 0) logLimitResetOfferShown(L, "notice");
    }, [He, L]),
    P(() => {
      if (We !== void 0) logLowPriorityShown(L, "notice");
    }, [We, L]),
    P(() => {
      if (ze !== void 0) logLimitFooterOfferShownOnce(D, L, "credits_while_waiting");
    }, [ze, D, L]),
    P(() => {
      if (Xe !== void 0) logLimitFooterOfferShownOnce(D, L, "plan_upsell");
    }, [Xe, D, L]),
    ke
  );
}

export { useUsageLimitNotices };
