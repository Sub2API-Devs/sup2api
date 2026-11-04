/**
 * components/PromptInput/promptInputState.ts
 *
 * 2.1.316 新增。输入框状态管理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (14)
 * attribution: placement 14
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

//@ chunk-18hwfzwa.js:922318-922322 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:922318", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:922322-922709 placement
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
//@ chunk-18hwfzwa.js:922709-922827 placement
function touchPlanModeUse(state, nowMs) {
  if (state.lastPlanModeUse !== undefined && nowMs - state.lastPlanModeUse < 86400000) return state;
  return {
    ...state,
    lastPlanModeUse: nowMs,
  };
}
//@ chunk-18hwfzwa.js:922827-922831 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:922827", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:922831-923004 placement
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
//@ chunk-18hwfzwa.js:923004-923085 placement
function getFastModeCooldownResetAt() {
  let runtimeState = fastModeState.runtimeState;
  return runtimeState.status === "cooldown" ? runtimeState.resetAt : null;
}
//@ chunk-18hwfzwa.js:923085-923098 placement
var SAVED_MODEL_SUCCESSOR_DRAW_MS = 1000;
//@ chunk-18hwfzwa.js:923098-923488 placement
function useSavedModelSuccessorKey(deps) {
  let killRing = useKillRing();
  let { storageV5 } = useTheme_2();
  let inputClock = useInputClock();
  useFooterAwareMessageActions(
    {
      "chat:defaultToNewerModel": () => {
        if (topOfKillRing(killRing.state) !== "") {
          endDrawnOffer();
          return false;
        }
        if (takeDrawnOffer(inputClock, SAVED_MODEL_SUCCESSOR_DRAW_MS)) return;
        let savedModelSuccessorDrawnAt = announcementState().savedModelSuccessorDrawnAt;
        let successor =
          isModelSuccessorNoticeActive() &&
          savedModelSuccessorDrawnAt !== null &&
          !isWithinRecentInput(inputClock, savedModelSuccessorDrawnAt, SAVED_MODEL_SUCCESSOR_DRAW_MS)
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
//@ chunk-18hwfzwa.js:923488-923492 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:923488", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:923492-923761 placement
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
//@ chunk-18hwfzwa.js:923761-923804 placement
var MAX_DEFAULT_TRUNCATE_LINES; // deferred: uses PANE_PADDING (../design-system/Pane.js) of its import cycle while loading; runs once the cycle is complete
var max;
var MIN_TRUNCATE_WIDTH;
deferInit("chunk-18hwfzwa.js:923761", () => {
  MAX_DEFAULT_TRUNCATE_LINES = 3;
  max = Math.max(2 * PANE_PADDING, 2 * (PANE_WIDTH_RESERVE + PANE_PADDING_X));
  MIN_TRUNCATE_WIDTH = 20;
});
//@ chunk-18hwfzwa.js:923804-924103 placement
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
//@ chunk-18hwfzwa.js:924103-924168 placement
function markCacheMissAcked(state) {
  return {
    ...state,
    cacheMissAckedAtOutputTokens: getTotalOutputTokens(),
  };
}
//@ chunk-18hwfzwa.js:924168-924178 placement
var MODEL_EFFORT_REASON_MAX_LINES = 6;
export {
  max,
  useLeftArrowGesture,
  touchPlanModeUse,
  useSavedModelSuccessorKey,
  useFastModeCooldownActive,
  markCacheMissAcked,
  truncateLines,
  MODEL_EFFORT_REASON_MAX_LINES,
  shouldShowEffortNotice,
  MAX_DEFAULT_TRUNCATE_LINES,
  MIN_TRUNCATE_WIDTH,
};
