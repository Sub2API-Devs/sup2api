/**
 * components/PromptInput/promptInputState.ts
 *
 * 2.1.316 新增。输入框状态管理。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (15)
 * attribution: placement 14, layout 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  init_react_production,
  useContext,
  useMemo,
  useState,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { useFooterTranscript } from "./PromptInputFooter.js";
import { getGlobalConfig } from "../../utils/config.js";
import { useStatusLineSuppressed } from "../StatusLine.js";
import { rootSessionSlot } from "../../context/replRootContext.js";
import { leftArrowHintText } from "../../screens/repl/BackgroundGesture.js";
import {
  onFastModeCooldownTriggered,
  onFastModeCooldownExpired,
  getFastModeRuntimeState,
  isFastModeEnabled,
  fastModeState,
} from "../../utils/fastMode.js";
import { useResetReached } from "../rateLimit/quotaAutoResume.js";
import { useKillRing, topOfKillRing } from "../../utils/killRing.js";
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useInputClock } from "../../ink/components/Input.js";
import { sessionStore } from "../../screens/repl/storeHooks.js";
import { useFooterAwareMessageActions } from "../CoordinatorAgentStatus.js";
import { endDrawnOffer, takeDrawnOffer } from "../../utils/newerModelOffer.js";
import { announcementState } from "../../services/announcements/announcementState.js";
import {
  isModelSuccessorNoticeActive,
  savedModelSuccessor,
  markModelSuccessorAnswered,
} from "../LogoV2/ModelSuccessorNotice.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { logEvent } from "../../services/analytics/index.js";
import { telemetrySafeModelName } from "../../utils/model/telemetryModelName.js";
import { getProcessedQueuedCommands } from "../../utils/messageQueueManager.js";
import { resolveRuntimeMainLoopModel } from "../../utils/model/planModeModel.js";
import { doesMostRecentAssistantMessageExceed200k } from "../../utils/tokens.js";
import { shouldShowEffortChangeNotice } from "../../utils/effort.js";
import { PANE_PADDING, PANE_WIDTH_RESERVE, PANE_PADDING_X } from "../design-system/Pane.js";
import { truncateToWidth } from "../../utils/format.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { getTotalOutputTokens } from "../../bootstrap/state.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:492725-492812 placement
var noopUnsubscribeFactory = () => () => {};
var LOOP_WAKEUP_CANCELLED = "loop-wakeup-cancelled";
var LOOP_WAKEUP_CANCELLED_TEXT = "Pending wakeup cancelled";
var SAVED_MODEL_SUCCESSOR_DRAW_MS = 1000;
//@ chunk-czq1j3j2.js:898196-898200 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:898196", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:908798-908802 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:908798", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:953761-953765 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:953761", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:955227-955614 placement
function useLeftArrowGesture({ gesture, turn, transcript, onDetachToCaller }) {
  let isLoading = useStoreSelector(turn, (state) => state.isLoading);
  let isExternalLoading = useStoreSelector(turn, (state) => state.isExternalLoading);
  let footerTranscript = useFooterTranscript({
    turn,
    transcript,
  });
  let leftArrowOpensAgents = getGlobalConfig().leftArrowOpensAgents !== false;
  let statusLineSuppressed = useStatusLineSuppressed();
  let hasRootSession = useContext(rootSessionSlot) !== null;
  return useMemo(
    () =>
      leftArrowHintText(gesture, {
        onDetachToCaller: hasRootSession ? undefined : onDetachToCaller,
        isLoading,
        isExternalLoading,
        betweenCalls: footerTranscript,
        leftArrowOpensAgents,
        tabsStandIn: statusLineSuppressed,
      }),
    [
      gesture,
      hasRootSession,
      onDetachToCaller,
      isLoading,
      isExternalLoading,
      footerTranscript,
      leftArrowOpensAgents,
      statusLineSuppressed,
    ],
  );
}
//@ chunk-czq1j3j2.js:955614-955732 placement
function touchPlanModeUse(state, nowMs) {
  if (state.lastPlanModeUse !== undefined && nowMs - state.lastPlanModeUse < 86400000) return state;
  return {
    ...state,
    lastPlanModeUse: nowMs,
  };
}
//@ chunk-czq1j3j2.js:955736-955909 placement
function useFastModeCooldownActive() {
  let [resetAt, setResetAt] = useState(getFastModeCooldownResetAt);
  useEffect(() => {
    let unsubscribeTriggered = onFastModeCooldownTriggered((nextResetAt) => setResetAt(nextResetAt));
    let unsubscribeExpired = onFastModeCooldownExpired(() => setResetAt(null));
    return () => {
      unsubscribeTriggered();
      unsubscribeExpired();
    };
  }, []);
  let resetReached = useResetReached(resetAt);
  useEffect(() => {
    if (resetReached) getFastModeRuntimeState();
  }, [resetReached]);
  return isFastModeEnabled() && getFastModeCooldownResetAt() !== null && !resetReached;
}
//@ chunk-czq1j3j2.js:955909-955990 placement
function getFastModeCooldownResetAt() {
  let runtimeState = fastModeState.runtimeState;
  return runtimeState.status === "cooldown" ? runtimeState.resetAt : null;
}
//@ chunk-czq1j3j2.js:955990-956003 layout
var SAVED_MODEL_OFFER_MS = 1000;
//@ chunk-czq1j3j2.js:956003-956438 placement
function useSavedModelSuccessorKey(deps) {
  let killRing = useKillRing();
  let { storageV5 } = useTheme_2();
  let inputClock = useInputClock();
  let sessionStoreRef = sessionStore();
  useFooterAwareMessageActions(
    {
      "chat:defaultToNewerModel": () => {
        if (sessionStoreRef.getState().value !== "") return false;
        if (topOfKillRing(killRing.state) !== "") {
          endDrawnOffer();
          return false;
        }
        if (takeDrawnOffer(inputClock, SAVED_MODEL_OFFER_MS)) return;
        let savedModelSuccessorDrawnAt = announcementState().savedModelSuccessorDrawnAt;
        let successor =
          isModelSuccessorNoticeActive() &&
          savedModelSuccessorDrawnAt !== null &&
          !isWithinRecentInput(inputClock, savedModelSuccessorDrawnAt, SAVED_MODEL_OFFER_MS)
            ? savedModelSuccessor()
            : undefined;
        if (!successor) return false;
        logEvent("tengu_saved_model_successor_key", {
          from_model: telemetrySafeModelName(successor.from),
          to_model: telemetrySafeModelName(successor.to),
        });
        markModelSuccessorAnswered(successor, storageV5);
        getProcessedQueuedCommands()?.(`model ${successor.alias}`, {
          kind: "human",
        });
      },
    },
    deps,
  );
}
//@ chunk-czq1j3j2.js:956442-956711 placement
/**
 * 判断切换 effort 时是否需要显示提示：分别对当前模型与运行时实际模型检查是否满足提示条件。
 */
function shouldShowEffortNotice(notice) {
  let { target, current, model, permissionMode, messages } = notice;
  let model_2 = resolveRuntimeMainLoopModel({
    permissionMode,
    mainLoopModel: model,
    setting: notice.setting,
    exceeds200kTokens: permissionMode === "plan" && doesMostRecentAssistantMessageExceed200k(messages),
  }).model;
  return [model, model_2].some((candidateModel) =>
    shouldShowEffortChangeNotice(
      target,
      current,
      candidateModel,
      notice.ackedAtOutputTokens,
      notice.promptCacheMayBeWarm,
    ),
  );
}
//@ chunk-czq1j3j2.js:956711-956754 placement
var MAX_DEFAULT_TRUNCATE_LINES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var max;
var MIN_TRUNCATE_WIDTH;
deferInit("chunk-czq1j3j2.js:956711", () => {
  MAX_DEFAULT_TRUNCATE_LINES = 3;
  max = Math.max(2 * PANE_PADDING, 2 * (PANE_WIDTH_RESERVE + PANE_PADDING_X));
  MIN_TRUNCATE_WIDTH = 20;
});
//@ chunk-czq1j3j2.js:956754-957053 placement
function truncateLines(text, columns, maxLines = MAX_DEFAULT_TRUNCATE_LINES + 1) {
  let max_2 = Math.max(MIN_TRUNCATE_WIDTH, columns - max);
  let mapped = text
    .split(
      `
`,
    )
    .map((line) => truncateToWidth(line, max_2));
  if (mapped.length <= maxLines)
    return mapped.join(`
`);
  if (maxLines <= 1) {
    let overflowNote = ` \u2026 (+${mapped.length - 1} more lines)`;
    return (
      truncateToWidth(getFirstLine(text), Math.max(1, max_2 - bunStringWidth(overflowNote))) + overflowNote
    );
  }
  let keepCount = maxLines - 1;
  return (
    mapped.slice(0, keepCount).join(`
`) +
    `
\u2026 (+${mapped.length - keepCount} more lines)`
  );
}
//@ chunk-czq1j3j2.js:957053-957118 placement
function markCacheMissAcked(state) {
  return {
    ...state,
    cacheMissAckedAtOutputTokens: getTotalOutputTokens(),
  };
}
//@ chunk-czq1j3j2.js:957118-957128 placement
var MODEL_EFFORT_REASON_MAX_LINES = 6;
export {
  MAX_DEFAULT_TRUNCATE_LINES,
  truncateLines,
  MIN_TRUNCATE_WIDTH,
  max,
  useLeftArrowGesture,
  touchPlanModeUse,
  useSavedModelSuccessorKey,
  useFastModeCooldownActive,
  noopUnsubscribeFactory,
  LOOP_WAKEUP_CANCELLED,
  LOOP_WAKEUP_CANCELLED_TEXT,
  SAVED_MODEL_SUCCESSOR_DRAW_MS,
  markCacheMissAcked,
  MODEL_EFFORT_REASON_MAX_LINES,
  shouldShowEffortNotice,
};
