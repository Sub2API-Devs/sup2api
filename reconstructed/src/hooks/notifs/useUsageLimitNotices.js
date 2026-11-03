/**
 * hooks/notifs/useUsageLimitNotices.tsx
 *
 * 2.1.316 新增：用量与额度相关的通知：限流状态、额度重置奖励、周重置、低优先级模式与工作流限流恢复的提示行。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 13, layout 3
 */
import { EMPTY_LIMIT_NOTICES } from "../../utils/messageQueueManager.js";
import { init_react_production, yt, ce, P } from "../../../vendor/react/cjs/react.production.js";
import {
  useRateLimitState,
  formatResetCountsSummary,
  useResetReached,
  usageLimitStatusText,
  QuotaAutoResume,
  logLimitFooterOfferShownOnce,
} from "../../components/rateLimit/quotaAutoResume.js";
import { onUsageCreditStateChange } from "../../services/usageCreditOffers.js";
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
  onLowPriorityChanged,
  getLowPriorityStateValue,
  getCooloffUntil,
  allowanceLeftPercent,
  resetDeadlineMs,
  endLowPriorityIfReset,
  onLowPriorityEvent,
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

//@ chunk-18hwfzwa.js:1655107-1655593 placement
/**
 * 从各类限额状态挑出 reset 提示（grant/weekly 及已用完）、低优先级、额度、套餐升级文案。
 */
function pickLimitNoticeParts(h) {
  let wait = h.wait?.kind === "live" ? h.wait : null;
  return {
    reset:
      h.resetGrant.offer !== null
        ? {
            key: "grant",
            text: h.resetGrant.offer,
          }
        : h.weeklyReset.offer !== null
          ? h.resetGrant.claimUnsettled
            ? null
            : {
                key: "weekly",
                text: h.weeklyReset.offer,
              }
          : h.resetGrant.spent !== null
            ? {
                key: "grant-spent",
                text: h.resetGrant.spent,
              }
            : h.weeklyReset.spent !== null
              ? {
                  key: "weekly-spent",
                  text: h.weeklyReset.spent,
                }
              : null,
    lowPriority: h.lowPriorityOffer,
    credits: wait?.credits ?? null,
    planUpsell: wait === null ? h.wrapUp?.upsell || null : null,
  };
}
//@ chunk-18hwfzwa.js:1655593-1656543 placement
/**
 * 组装用量限额状态行与下一步提示行。
 */
function buildLimitStatusNotices(h) {
  let wait = h.wait?.kind === "live" ? h.wait : null;
  let D = pickLimitNoticeParts(h);
  let L = h.wait?.kind === "declined" && h.wrapUp?.running !== true;
  let ee = [];
  if (h.wrapUp !== null)
    ee.push([
      {
        text: h.wrapUp.lead,
      },
      {
        text: h.wrapUp.resets,
        dim: true,
      },
      ...(L
        ? []
        : [
            {
              text: " \xB7 ",
              dim: true,
            },
            {
              ...h.wrapUp.link,
              dim: true,
            },
          ]),
      ...(D.planUpsell !== null
        ? [
            {
              text: ` \xB7 ${D.planUpsell}`,
              dim: true,
            },
          ]
        : []),
    ]);
  else if (wait !== null)
    ee.push([
      {
        text: wait.status,
      },
    ]);
  else if (h.pausedWorkflow !== null)
    ee.push([
      {
        text: h.pausedWorkflow,
      },
    ]);
  if (h.lowPriorityActive !== null)
    ee.push([
      {
        text: h.lowPriorityActive,
        color: "text",
      },
    ]);
  let ke = [];
  if (wait !== null)
    ke.push([
      {
        text: wait.next,
      },
    ]);
  if (D.credits !== null)
    ke.push([
      {
        text: D.credits,
        dim: true,
      },
    ]);
  if (D.reset !== null)
    ke.push([
      {
        text: D.reset.text,
        dim: D.reset.key.endsWith("spent"),
      },
    ]);
  if (D.lowPriority !== null)
    ke.push([
      {
        text: D.lowPriority,
      },
    ]);
  if (ee.length === 0 && ke.length === 0) return EMPTY_LIMIT_NOTICES;
  return {
    status:
      ee.length === 0
        ? null
        : createEventNotice("limit-status", joinSegmentsWithDots(ee), h.wrapUp !== null ? "warning" : "text"),
    next: ke.length === 0 ? null : createEventNotice("limit-next", joinSegmentsWithDots(ke)),
  };
}
//@ chunk-18hwfzwa.js:1656543-1656640 placement
/**
 * {kind:"event",priority:"high",wrap:true} 通知对象。旧版名 getCommandsByMaxPriority 为错配。
 */
function createEventNotice(key, segments, color = "text") {
  return {
    key,
    kind: "event",
    priority: "high",
    wrap: true,
    color,
    segments,
  };
}
//@ chunk-18hwfzwa.js:1656640-1656719 placement
/**
 * 用 " · " 连接多段文本片段。
 */
function joinSegmentsWithDots(h) {
  return h.flatMap((x, D) =>
    D === 0
      ? x
      : [
          {
            text: " \xB7 ",
            dim: true,
          },
          ...x,
        ],
  );
}
//@ chunk-18hwfzwa.js:1656719-1656723 layout
/**
 * 惰性模块初始化调用 j()（Bun 打包的 init 包装），无业务逻辑。
 */
init_react_production();
//@ chunk-18hwfzwa.js:1656723-1657417 placement
/**
 * React hook：限额重置赠送的提示与已用完提示。
 */
function useResetGrantOffer() {
  let rateLimitState = useRateLimitState();
  let x = yt(
    onUsageCreditStateChange,
    ce(() => {
      let He = availableResetOffers(rateLimitState);
      let [We, ...ze] = He;
      if (We === undefined) return null;
      let reduced = ze.reduce(
        (acc, At) =>
          At.endsAtMs !== null && (acc.endsAtMs === null || At.endsAtMs < acc.endsAtMs) ? At : acc,
        We,
      );
      let rt =
        ze.length === 0
          ? formatLimitResetTemplate(getCedarEmberCopy().noticeLine, resetOfferFields(We))
          : formatLimitResetTemplate(getCedarEmberCopy().noticeLineMany, {
              ...resetOfferFields(reduced),
              held: formatResetCountsSummary(
                He.map((kt) => ({
                  kind: kt.kind,
                  count: kt.resetsLeft,
                })),
              ),
            });
      return `${reduced.endsAtMs ?? ""}
${rt}`;
    }, [rateLimitState]),
  );
  let D =
    x?.indexOf(`
`) ?? -1;
  let L = x === null ? null : x.slice(D + 1);
  let ee = x === null || D === 0 ? null : Number(x.slice(0, D));
  let ke = yt(
    onUsageCreditStateChange,
    ce(() => resetsUsedUpLine(rateLimitState) ?? null, [rateLimitState]),
  );
  let claimUnsettled = yt(onUsageCreditStateChange, isClaimingReset);
  let Be = rateLimitState.resetsAt !== undefined ? rateLimitState.resetsAt * 1000 : null;
  useResetReached(L !== null || ke !== null ? (ee !== null && (Be === null || ee < Be) ? ee : Be) : null);
  return {
    offer: L,
    spent: L === null ? ke : null,
    claimUnsettled,
  };
}
//@ chunk-18hwfzwa.js:1657417-1657421 layout
/**
 * 惰性模块初始化调用 j()。
 */
init_react_production();
//@ chunk-18hwfzwa.js:1657421-1657638 placement
/**
 * React hook：周限额重置提示。
 */
function useWeeklyResetOffer() {
  let rateLimitState = useRateLimitState();
  let x = yt(
    subscribeResetChanges,
    ce(
      () => (canArmLowPriorityReset(rateLimitState) ? getLimitResetCopy().noticeLine : null),
      [rateLimitState],
    ),
  );
  let D = yt(
    subscribeResetChanges,
    ce(() => usageCreditsSpentLine(rateLimitState) ?? null, [rateLimitState]),
  );
  useResetReached(
    (x !== null || D !== null) && rateLimitState.resetsAt !== undefined
      ? rateLimitState.resetsAt * 1000
      : null,
  );
  return {
    offer: x,
    spent: x === null ? D : null,
  };
}
//@ chunk-18hwfzwa.js:1657638-1657642 layout
/**
 * 惰性模块初始化调用 j()。
 */
init_react_production();
//@ chunk-18hwfzwa.js:1657642-1657680 placement
/**
 * React hook：低优先级模式状态。
 */
function useLowPriorityState() {
  return yt(onLowPriorityChanged, getLowPriorityStateValue, getLowPriorityStateValue);
}
//@ chunk-18hwfzwa.js:1657680-1657986 placement
/**
 * 低优先级模式状态行（重置时间、额度百分比、停止命令）。
 */
function formatLowPriorityStatusLine(lowPriorityState, x) {
  let D = statusLineShouldDisplay();
  let L =
    lowPriorityState.phase === "active"
      ? formatResetTime(lowPriorityState.resetsAtSeconds, false)
      : undefined;
  let ee = D.statusLine.includes("{reset}")
    ? D.statusLine.replace("{reset}", L ?? "your usage limit resets")
    : D.statusLine;
  let ke = x === undefined ? "" : ` \xB7 ${D.allowanceNote.replace("{percent}", `${x}%`)}`;
  return `${ee}${ke} \xB7 /${LOW_PRIORITY} to stop`;
}
//@ chunk-18hwfzwa.js:1657986-1658823 placement
/**
 * 低优先级模式结束原因 → 提示文本（weekly/budget/off/extra_usage/max_wait）。
 */
function getLowPriorityEndedMessage(reason, x = getCooloffUntil()) {
  switch (reason) {
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
      let D = x === undefined ? undefined : formatResetTime(Math.ceil(x / 1000), false);
      return `No room for lower-priority work for a while \xB7 lower-priority mode stopped; new messages wait for your usage limit to reset${D ? ` \xB7 /${LOW_PRIORITY} again after ${D}` : ""}`;
    }
  }
}
//@ chunk-18hwfzwa.js:1658823-1660153 placement
/**
 * React hook：低优先级模式开始/结束的转录通知。
 */
function useLowPriorityNotices(props) {
  let ke = w(27);
  let { transcript } = props;
  let rateLimitState = useRateLimitState();
  let lowPriorityState = useLowPriorityState();
  let ee = yt(onLowPriorityChanged, allowanceLeftPercent, allowanceLeftPercent);
  let Re;
  if (ke[0] !== rateLimitState || ke[1] !== lowPriorityState.phase) {
    Re = lowPriorityState.phase === "idle" && canOfferLowPriority(rateLimitState);
    ke[0] = rateLimitState;
    ke[1] = lowPriorityState.phase;
    ke[2] = Re;
  } else Re = ke[2];
  let Be = Re;
  let He;
  if (ke[3] !== rateLimitState || ke[4] !== Be || ke[5] !== lowPriorityState.phase) {
    He =
      lowPriorityState.phase === "idle" && !Be && rateLimitState.lowPriorityOffer === "treatment"
        ? getCooloffUntil()
        : undefined;
    ke[3] = rateLimitState;
    ke[4] = Be;
    ke[5] = lowPriorityState.phase;
    ke[6] = He;
  } else He = ke[6];
  let We = He;
  let ze;
  if (ke[7] !== rateLimitState || ke[8] !== Be || ke[9] !== lowPriorityState || ke[10] !== We) {
    ze =
      lowPriorityState.phase === "active"
        ? resetDeadlineMs(lowPriorityState)
        : Be && rateLimitState.resetsAt !== undefined
          ? rateLimitState.resetsAt * 1000
          : (We ?? null);
    ke[7] = rateLimitState;
    ke[8] = Be;
    ke[9] = lowPriorityState;
    ke[10] = We;
    ke[11] = ze;
  } else ze = ke[11];
  let resetReached = useResetReached(ze);
  let kt;
  let At;
  if (ke[12] !== resetReached || ke[13] !== lowPriorityState.phase) {
    kt = () => {
      if (resetReached && lowPriorityState.phase === "active") endLowPriorityIfReset();
    };
    At = [resetReached, lowPriorityState.phase];
    ke[12] = resetReached;
    ke[13] = lowPriorityState.phase;
    ke[14] = kt;
    ke[15] = At;
  } else {
    kt = ke[14];
    At = ke[15];
  }
  P(kt, At);
  let It;
  let Ot;
  if (ke[16] !== transcript) {
    It = () =>
      onLowPriorityEvent((Et) => {
        if (Et.type !== "ended") {
          return;
        }
        let lowPriorityEndedMessage = getLowPriorityEndedMessage(Et.reason);
        if (lowPriorityEndedMessage === null) {
          return;
        }
        transcript.apply({
          type: "append",
          messages: [createSystemMessage(lowPriorityEndedMessage, "notice")],
        });
      });
    Ot = [transcript];
    ke[16] = transcript;
    ke[17] = It;
    ke[18] = Ot;
  } else {
    It = ke[17];
    Ot = ke[18];
  }
  P(It, Ot);
  let lowPriorityActive;
  if (ke[19] !== ee || ke[20] !== lowPriorityState) {
    lowPriorityActive =
      lowPriorityState.phase === "active" ? formatLowPriorityStatusLine(lowPriorityState, ee) : null;
    ke[19] = ee;
    ke[20] = lowPriorityState;
    ke[21] = lowPriorityActive;
  } else lowPriorityActive = ke[21];
  let lowPriorityOffer;
  if (ke[22] !== Be) {
    lowPriorityOffer = Be ? statusLineShouldDisplay().noticeLine : null;
    ke[22] = Be;
    ke[23] = lowPriorityOffer;
  } else lowPriorityOffer = ke[23];
  let Xt;
  if (ke[24] !== lowPriorityActive || ke[25] !== lowPriorityOffer) {
    Xt = {
      lowPriorityActive,
      lowPriorityOffer,
    };
    ke[24] = lowPriorityActive;
    ke[25] = lowPriorityOffer;
    ke[26] = Xt;
  } else Xt = ke[26];
  return Xt;
}
//@ chunk-18hwfzwa.js:1660153-1660335 placement
/**
 * 运行中工作流任务里最晚的 rateLimitWait.resetsAt。
 */
function getEarliestWorkflowRateLimitReset(h) {
  return Object.values(h.tasks).reduce(
    (acc, task) =>
      task.type === "local_workflow" && task.status === "running" && task.rateLimitWait !== undefined
        ? Math.max(acc ?? 0, task.rateLimitWait.resetsAt)
        : acc,
    null,
  );
}
//@ chunk-18hwfzwa.js:1660335-1660494 placement
/**
 * React hook：因限额暂停的工作流提示（tengu_lantern_snuffer）。
 */
function usePausedWorkflowNotice() {
  let appState = useAppState(getEarliestWorkflowRateLimitReset);
  let x = isAutoResumableLimit(useRateLimitState());
  let resetReached = useResetReached(appState === null ? null : appState * 1000);
  let L = appState !== null && x && !resetReached;
  return renderWithForceUpdate(
    () => L && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_snuffer", false) === true,
  ) && appState !== null
    ? usageLimitStatusText(appState)
    : null;
}
//@ chunk-18hwfzwa.js:1660494-1661153 placement
/**
 * REPL 用的用量限额通知汇总 hook。
 */
function useUsageLimitNotices({ isLoading, transcript }) {
  let host = useHost();
  let rateLimitState = useRateLimitState();
  let ee = {
    wrapUp: UsageLimitGraceNotice(isLoading),
    wait: QuotaAutoResume({
      isLoading,
      transcript,
    }),
    pausedWorkflow: usePausedWorkflowNotice(),
    resetGrant: useResetGrantOffer(),
    weeklyReset: useWeeklyResetOffer(),
    ...useLowPriorityNotices({
      transcript,
    }),
  };
  let limitStatusNotices = buildLimitStatusNotices(ee);
  let Re = pickLimitNoticeParts(ee);
  let text = Re.reset?.key === "grant" ? Re.reset.text : undefined;
  let text_2 = Re.reset?.key === "weekly" ? Re.reset.text : undefined;
  let lowPriority = Re.lowPriority ?? undefined;
  let credits = Re.credits ?? undefined;
  let planUpsell = Re.planUpsell ?? undefined;
  P(() => {
    if (text !== undefined) reportResetOfferShown(rateLimitState, "notice");
  }, [text, rateLimitState]);
  P(() => {
    if (text_2 !== undefined) logLimitResetOfferShown(rateLimitState, "notice");
  }, [text_2, rateLimitState]);
  P(() => {
    if (lowPriority !== undefined) logLowPriorityShown(rateLimitState, "notice");
  }, [lowPriority, rateLimitState]);
  P(() => {
    if (credits !== undefined) logLimitFooterOfferShownOnce(host, rateLimitState, "credits_while_waiting");
  }, [credits, host, rateLimitState]);
  P(() => {
    if (planUpsell !== undefined) logLimitFooterOfferShownOnce(host, rateLimitState, "plan_upsell");
  }, [planUpsell, host, rateLimitState]);
  return limitStatusNotices;
}
export { useUsageLimitNotices };
