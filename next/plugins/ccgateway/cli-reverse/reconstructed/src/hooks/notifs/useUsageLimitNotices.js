/**
 * hooks/notifs/useUsageLimitNotices.tsx
 *
 * 2.1.316 新增：用量与额度相关的通知：限流状态、额度重置奖励、周重置、低优先级模式与工作流限流恢复的提示行。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (16)
 * attribution: placement 16
 */
import {
  init_react_production,
  useSyncExternalStore,
  useCallback,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { EMPTY_LIMIT_NOTICES } from "../../utils/messageQueueManager.js";
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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { canOfferLowPriority, logLowPriorityShown } from "../../services/lowPriorityMode.js";
import { createSystemMessage } from "../../utils/messages.js";
import { useAppState } from "../../state/AppState.js";
import { isAutoResumableLimit } from "../../services/api/errors.js";
import { renderWithForceUpdate } from "../useForceRender.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { useHost } from "../../context/session.js";
import { UsageLimitGraceNotice } from "../../components/UsageLimitGraceNotice.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1690170-1690174 placement
/**
 * 惰性模块初始化调用 j()（Bun 打包的 init 包装），无业务逻辑。
 */
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1690170", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1698577-1698581 placement
/**
 * 惰性模块初始化调用 j()。
 */
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1698577", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1698581-1698585 placement
/**
 * 惰性模块初始化调用 j()。
 */
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1698581", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1700831-1701317 placement
/**
 * 从各类限额状态挑出 reset 提示（grant/weekly 及已用完）、低优先级、额度、套餐升级文案。
 */
function pickLimitNoticeParts(limits) {
  let wait = limits.wait?.kind === "live" ? limits.wait : null;
  return {
    reset:
      limits.resetGrant.offer !== null
        ? {
            key: "grant",
            text: limits.resetGrant.offer,
          }
        : limits.weeklyReset.offer !== null
          ? limits.resetGrant.claimUnsettled
            ? null
            : {
                key: "weekly",
                text: limits.weeklyReset.offer,
              }
          : limits.resetGrant.spent !== null
            ? {
                key: "grant-spent",
                text: limits.resetGrant.spent,
              }
            : limits.weeklyReset.spent !== null
              ? {
                  key: "weekly-spent",
                  text: limits.weeklyReset.spent,
                }
              : null,
    lowPriority: limits.lowPriorityOffer,
    credits: wait?.credits ?? null,
    planUpsell: wait === null ? limits.wrapUp?.upsell || null : null,
  };
}
//@ chunk-czq1j3j2.js:1701317-1702267 placement
/**
 * 组装用量限额状态行与下一步提示行。
 */
function buildLimitStatusNotices(limits) {
  let wait = limits.wait?.kind === "live" ? limits.wait : null;
  let parts = pickLimitNoticeParts(limits);
  let isDeclinedWait = limits.wait?.kind === "declined" && limits.wrapUp?.running !== true;
  let statusSegments = [];
  if (limits.wrapUp !== null)
    statusSegments.push([
      {
        text: limits.wrapUp.lead,
      },
      {
        text: limits.wrapUp.resets,
        dim: true,
      },
      ...(isDeclinedWait
        ? []
        : [
            {
              text: " \xB7 ",
              dim: true,
            },
            {
              ...limits.wrapUp.link,
              dim: true,
            },
          ]),
      ...(parts.planUpsell !== null
        ? [
            {
              text: ` \xB7 ${parts.planUpsell}`,
              dim: true,
            },
          ]
        : []),
    ]);
  else if (wait !== null)
    statusSegments.push([
      {
        text: wait.status,
      },
    ]);
  else if (limits.pausedWorkflow !== null)
    statusSegments.push([
      {
        text: limits.pausedWorkflow,
      },
    ]);
  if (limits.lowPriorityActive !== null)
    statusSegments.push([
      {
        text: limits.lowPriorityActive,
        color: "text",
      },
    ]);
  let nextSegments = [];
  if (wait !== null)
    nextSegments.push([
      {
        text: wait.next,
      },
    ]);
  if (parts.credits !== null)
    nextSegments.push([
      {
        text: parts.credits,
        dim: true,
      },
    ]);
  if (parts.reset !== null)
    nextSegments.push([
      {
        text: parts.reset.text,
        dim: parts.reset.key.endsWith("spent"),
      },
    ]);
  if (parts.lowPriority !== null)
    nextSegments.push([
      {
        text: parts.lowPriority,
      },
    ]);
  if (statusSegments.length === 0 && nextSegments.length === 0) return EMPTY_LIMIT_NOTICES;
  return {
    status:
      statusSegments.length === 0
        ? null
        : createEventNotice(
            "limit-status",
            joinSegmentsWithDots(statusSegments),
            limits.wrapUp !== null ? "warning" : "text",
          ),
    next:
      nextSegments.length === 0 ? null : createEventNotice("limit-next", joinSegmentsWithDots(nextSegments)),
  };
}
//@ chunk-czq1j3j2.js:1702267-1702364 placement
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
//@ chunk-czq1j3j2.js:1702364-1702443 placement
/**
 * 用 " · " 连接多段文本片段。
 */
function joinSegmentsWithDots(segments) {
  return segments.flatMap((segment, index) =>
    index === 0
      ? segment
      : [
          {
            text: " \xB7 ",
            dim: true,
          },
          ...segment,
        ],
  );
}
//@ chunk-czq1j3j2.js:1702447-1703141 placement
/**
 * React hook：限额重置赠送的提示与已用完提示。
 */
function useResetGrantOffer() {
  let rateLimitState = useRateLimitState();
  let offerLine = useSyncExternalStore(
    onUsageCreditStateChange,
    useCallback(() => {
      let offers = availableResetOffers(rateLimitState);
      let [first, ...rest] = offers;
      if (first === undefined) return null;
      let reduced = rest.reduce(
        (acc, offer) =>
          offer.endsAtMs !== null && (acc.endsAtMs === null || offer.endsAtMs < acc.endsAtMs) ? offer : acc,
        first,
      );
      let line =
        rest.length === 0
          ? formatLimitResetTemplate(getCedarEmberCopy().noticeLine, resetOfferFields(first))
          : formatLimitResetTemplate(getCedarEmberCopy().noticeLineMany, {
              ...resetOfferFields(reduced),
              held: formatResetCountsSummary(
                offers.map((offer) => ({
                  kind: offer.kind,
                  count: offer.resetsLeft,
                })),
              ),
            });
      return `${reduced.endsAtMs ?? ""}
${line}`;
    }, [rateLimitState]),
  );
  let newlineIndex =
    offerLine?.indexOf(`
`) ?? -1;
  let offerText = offerLine === null ? null : offerLine.slice(newlineIndex + 1);
  let resetAtMs = offerLine === null || newlineIndex === 0 ? null : Number(offerLine.slice(0, newlineIndex));
  let spentLine = useSyncExternalStore(
    onUsageCreditStateChange,
    useCallback(() => resetsUsedUpLine(rateLimitState) ?? null, [rateLimitState]),
  );
  let claimUnsettled = useSyncExternalStore(onUsageCreditStateChange, isClaimingReset);
  let limitResetAtMs = rateLimitState.resetsAt !== undefined ? rateLimitState.resetsAt * 1000 : null;
  useResetReached(
    offerText !== null || spentLine !== null
      ? resetAtMs !== null && (limitResetAtMs === null || resetAtMs < limitResetAtMs)
        ? resetAtMs
        : limitResetAtMs
      : null,
  );
  return {
    offer: offerText,
    spent: offerText === null ? spentLine : null,
    claimUnsettled,
  };
}
//@ chunk-czq1j3j2.js:1703145-1703363 placement
/**
 * React hook：周限额重置提示。
 */
function useWeeklyResetOffer() {
  let rateLimitState = useRateLimitState();
  let offerLine = useSyncExternalStore(
    subscribeResetChanges,
    useCallback(
      () => (canArmLowPriorityReset(rateLimitState) ? getLimitResetCopy().noticeLine : null),
      [rateLimitState],
    ),
  );
  let spentLine = useSyncExternalStore(
    subscribeResetChanges,
    useCallback(() => usageCreditsSpentLine(rateLimitState) ?? null, [rateLimitState]),
  );
  useResetReached(
    (offerLine !== null || spentLine !== null) && rateLimitState.resetsAt !== undefined
      ? rateLimitState.resetsAt * 1000
      : null,
  );
  return {
    offer: offerLine,
    spent: offerLine === null ? spentLine : null,
  };
}
//@ chunk-czq1j3j2.js:1703367-1703405 placement
/**
 * React hook：低优先级模式状态。
 */
function useLowPriorityState() {
  return useSyncExternalStore(onLowPriorityChanged, getLowPriorityStateValue, getLowPriorityStateValue);
}
//@ chunk-czq1j3j2.js:1703405-1703711 placement
/**
 * 低优先级模式状态行（重置时间、额度百分比、停止命令）。
 */
function formatLowPriorityStatusLine(resumeState, allowancePercent) {
  let statusLine = statusLineShouldDisplay();
  let resetText =
    resumeState.phase === "active" ? formatResetTime(resumeState.resetsAtSeconds, false) : undefined;
  let line = statusLine.statusLine.includes("{reset}")
    ? statusLine.statusLine.replace("{reset}", resetText ?? "your usage limit resets")
    : statusLine.statusLine;
  let allowanceSuffix =
    allowancePercent === undefined
      ? ""
      : ` \xB7 ${statusLine.allowanceNote.replace("{percent}", `${allowancePercent}%`)}`;
  return `${line}${allowanceSuffix} \xB7 /${LOW_PRIORITY} to stop`;
}
//@ chunk-czq1j3j2.js:1703711-1704548 placement
/**
 * 低优先级模式结束原因 → 提示文本（weekly/budget/off/extra_usage/max_wait）。
 */
function getLowPriorityEndedMessage(reason, cooloffUntil = getCooloffUntil()) {
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
      let resetText =
        cooloffUntil === undefined ? undefined : formatResetTime(Math.ceil(cooloffUntil / 1000), false);
      return `No room for lower-priority work for a while \xB7 lower-priority mode stopped; new messages wait for your usage limit to reset${resetText ? ` \xB7 /${LOW_PRIORITY} again after ${resetText}` : ""}`;
    }
  }
}
//@ chunk-czq1j3j2.js:1704548-1705878 placement
/**
 * React hook：低优先级模式开始/结束的转录通知。
 */
function useLowPriorityNotices(props) {
  let $ = useMemoCache(27);
  let { transcript } = props;
  let rateLimitState = useRateLimitState();
  let lowPriorityState = useLowPriorityState();
  let allowancePercent = useSyncExternalStore(
    onLowPriorityChanged,
    allowanceLeftPercent,
    allowanceLeftPercent,
  );
  let canOffer;
  if ($[0] !== rateLimitState || $[1] !== lowPriorityState.phase) {
    canOffer = lowPriorityState.phase === "idle" && canOfferLowPriority(rateLimitState);
    $[0] = rateLimitState;
    $[1] = lowPriorityState.phase;
    $[2] = canOffer;
  } else canOffer = $[2];
  let canOffer_ = canOffer;
  let cooloffUntil;
  if ($[3] !== rateLimitState || $[4] !== canOffer_ || $[5] !== lowPriorityState.phase) {
    cooloffUntil =
      lowPriorityState.phase === "idle" && !canOffer_ && rateLimitState.lowPriorityOffer === "treatment"
        ? getCooloffUntil()
        : undefined;
    $[3] = rateLimitState;
    $[4] = canOffer_;
    $[5] = lowPriorityState.phase;
    $[6] = cooloffUntil;
  } else cooloffUntil = $[6];
  let cooloffUntil_ = cooloffUntil;
  let resetAtMs;
  if ($[7] !== rateLimitState || $[8] !== canOffer_ || $[9] !== lowPriorityState || $[10] !== cooloffUntil_) {
    resetAtMs =
      lowPriorityState.phase === "active"
        ? resetDeadlineMs(lowPriorityState)
        : canOffer_ && rateLimitState.resetsAt !== undefined
          ? rateLimitState.resetsAt * 1000
          : (cooloffUntil_ ?? null);
    $[7] = rateLimitState;
    $[8] = canOffer_;
    $[9] = lowPriorityState;
    $[10] = cooloffUntil_;
    $[11] = resetAtMs;
  } else resetAtMs = $[11];
  let resetReached = useResetReached(resetAtMs);
  let onReset;
  let onResetDeps;
  if ($[12] !== resetReached || $[13] !== lowPriorityState.phase) {
    onReset = () => {
      if (resetReached && lowPriorityState.phase === "active") endLowPriorityIfReset();
    };
    onResetDeps = [resetReached, lowPriorityState.phase];
    $[12] = resetReached;
    $[13] = lowPriorityState.phase;
    $[14] = onReset;
    $[15] = onResetDeps;
  } else {
    onReset = $[14];
    onResetDeps = $[15];
  }
  useEffect(onReset, onResetDeps);
  let subscribeEnded;
  let subscribeEndedDeps;
  if ($[16] !== transcript) {
    subscribeEnded = () =>
      onLowPriorityEvent((event) => {
        if (event.type !== "ended") {
          return;
        }
        let lowPriorityEndedMessage = getLowPriorityEndedMessage(event.reason);
        if (lowPriorityEndedMessage === null) {
          return;
        }
        transcript.apply({
          type: "append",
          messages: [createSystemMessage(lowPriorityEndedMessage, "notice")],
        });
      });
    subscribeEndedDeps = [transcript];
    $[16] = transcript;
    $[17] = subscribeEnded;
    $[18] = subscribeEndedDeps;
  } else {
    subscribeEnded = $[17];
    subscribeEndedDeps = $[18];
  }
  useEffect(subscribeEnded, subscribeEndedDeps);
  let lowPriorityActive;
  if ($[19] !== allowancePercent || $[20] !== lowPriorityState) {
    lowPriorityActive =
      lowPriorityState.phase === "active"
        ? formatLowPriorityStatusLine(lowPriorityState, allowancePercent)
        : null;
    $[19] = allowancePercent;
    $[20] = lowPriorityState;
    $[21] = lowPriorityActive;
  } else lowPriorityActive = $[21];
  let lowPriorityOffer;
  if ($[22] !== canOffer_) {
    lowPriorityOffer = canOffer_ ? statusLineShouldDisplay().noticeLine : null;
    $[22] = canOffer_;
    $[23] = lowPriorityOffer;
  } else lowPriorityOffer = $[23];
  let result;
  if ($[24] !== lowPriorityActive || $[25] !== lowPriorityOffer) {
    result = {
      lowPriorityActive,
      lowPriorityOffer,
    };
    $[24] = lowPriorityActive;
    $[25] = lowPriorityOffer;
    $[26] = result;
  } else result = $[26];
  return result;
}
//@ chunk-czq1j3j2.js:1705878-1706060 placement
/**
 * 运行中工作流任务里最晚的 rateLimitWait.resetsAt。
 */
function getEarliestWorkflowRateLimitReset(appState) {
  return Object.values(appState.tasks).reduce(
    (acc, task) =>
      task.type === "local_workflow" && task.status === "running" && task.rateLimitWait !== undefined
        ? Math.max(acc ?? 0, task.rateLimitWait.resetsAt)
        : acc,
    null,
  );
}
//@ chunk-czq1j3j2.js:1706060-1706219 placement
/**
 * React hook：因限额暂停的工作流提示（tengu_lantern_snuffer）。
 */
function usePausedWorkflowNotice() {
  let resetsAtSeconds = useAppState(getEarliestWorkflowRateLimitReset);
  let isAutoResumable = isAutoResumableLimit(useRateLimitState());
  let resetReached = useResetReached(resetsAtSeconds === null ? null : resetsAtSeconds * 1000);
  let isPaused = resetsAtSeconds !== null && isAutoResumable && !resetReached;
  return renderWithForceUpdate(
    () => isPaused && getFeatureValue_CACHED_MAY_BE_STALE("tengu_lantern_snuffer", false) === true,
  ) && resetsAtSeconds !== null
    ? usageLimitStatusText(resetsAtSeconds)
    : null;
}
//@ chunk-czq1j3j2.js:1706219-1706878 placement
/**
 * REPL 用的用量限额通知汇总 hook。
 */
function useUsageLimitNotices({ isLoading, transcript }) {
  let host = useHost();
  let rateLimitState = useRateLimitState();
  let parts = {
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
  let limitStatusNotices = buildLimitStatusNotices(parts);
  let picked = pickLimitNoticeParts(parts);
  let text = picked.reset?.key === "grant" ? picked.reset.text : undefined;
  let text_2 = picked.reset?.key === "weekly" ? picked.reset.text : undefined;
  let lowPriority = picked.lowPriority ?? undefined;
  let credits = picked.credits ?? undefined;
  let planUpsell = picked.planUpsell ?? undefined;
  useEffect(() => {
    if (text !== undefined) reportResetOfferShown(rateLimitState, "notice");
  }, [text, rateLimitState]);
  useEffect(() => {
    if (text_2 !== undefined) logLimitResetOfferShown(rateLimitState, "notice");
  }, [text_2, rateLimitState]);
  useEffect(() => {
    if (lowPriority !== undefined) logLowPriorityShown(rateLimitState, "notice");
  }, [lowPriority, rateLimitState]);
  useEffect(() => {
    if (credits !== undefined) logLimitFooterOfferShownOnce(host, rateLimitState, "credits_while_waiting");
  }, [credits, host, rateLimitState]);
  useEffect(() => {
    if (planUpsell !== undefined) logLimitFooterOfferShownOnce(host, rateLimitState, "plan_upsell");
  }, [planUpsell, host, rateLimitState]);
  return limitStatusNotices;
}
export { useUsageLimitNotices };
