/**
 * components/FeedbackSurvey/useSurveyState.tsx
 *
 * 调查状态机（closed/digit/followup/thanks/submitted/share_failed）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/useSurveyState.tsx
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: affinity 1, fingerprint 1, placement 7
 */
import { randomUUID } from "crypto";
import { useClock } from "../../ink/components/ClockContext.js";
import {
  useState,
  useRef,
  useEffect,
  useCallback,
  init_react_production,
} from "../../../vendor/react/cjs/react.production.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { buildEffortLevelTelemetry } from "./FeedbackDraftNotice.js";
import { resolveEffortLevel } from "../../utils/effort.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1021671-1021684 affinity
var PENDING_OPEN_DELAY_MS = 3000;
//@ chunk-18hwfzwa.js:1021684-1024512 fingerprint = useSurveyState (0.63)
/**
 * 调查状态机：closed → digit（评分）→ followup（是否分享）→ thanks/submitted/share_failed。
 */
function useSurveyState({
  hideThanksAfterMs,
  otherSurveyActive = false,
  autoDismissAfterMs,
  onOpen,
  onSelect,
  onAutoDismiss,
  onAbandon,
  shouldShowTranscriptPrompt,
  onTranscriptPromptShown,
  onTranscriptSelect,
  onShareConsent,
  shouldShowFollowupPrompt,
  onFollowupPromptShown,
  onFollowupResolve,
}) {
  let clock = useClock();
  let [state, setState] = useState("closed");
  let [lastResponse, setLastResponse] = useState(null);
  let [bundlePath, setBundlePath] = useState(null);
  let [submittingShare, setSubmittingShare] = useState(true);
  let appearanceId = useRef(randomUUID());
  let lastResponseRef = useRef(null);
  let pendingTimerRef = useRef(null);
  let sharePromiseRef = useRef(null);
  useEffect(
    () => () => {
      pendingTimerRef.current?.();
    },
    [],
  );
  let [thanksFromFollowup, setThanksFromFollowup] = useState(false);
  let showThanksThenClose = useCallback(
    (mode = "digit") => {
      setThanksFromFollowup(mode === "followup");
      setState("thanks");
      clock.setTimeout(() => {
        setState("closed");
        setLastResponse(null);
      }, hideThanksAfterMs);
    },
    [clock, hideThanksAfterMs],
  );
  let showSubmittedThenClose = useCallback(() => {
    setState("submitted");
    clock.setTimeout(() => setState("closed"), hideThanksAfterMs);
  }, [clock, hideThanksAfterMs]);
  let showShareFailedThenClose = useCallback(() => {
    setState("share_failed");
    clock.setTimeout(() => setState("closed"), hideThanksAfterMs);
  }, [clock, hideThanksAfterMs]);
  let open = useCallback(() => {
    if (state !== "closed") return;
    answeredRef.current = false;
    setState("open");
    appearanceId.current = randomUUID();
    onOpen(appearanceId.current);
  }, [state, onOpen]);
  let answeredRef = useRef(false);
  let showSubmittedThenClose_2 = useCallback(() => {
    if (state !== "open") return;
    setState("closed");
    setLastResponse(null);
    onAbandon?.(appearanceId.current);
  }, [state, onAbandon]);
  useEffect(() => {
    if (otherSurveyActive && state === "open" && !answeredRef.current) setState("closed");
  }, [otherSurveyActive, state]);
  useTimeout(
    () => {
      setState("closed");
      setLastResponse(null);
      onAutoDismiss?.(appearanceId.current);
    },
    state === "open" && autoDismissAfterMs ? autoDismissAfterMs : null,
    [state, autoDismissAfterMs],
  );
  let open_2 = useCallback(
    (selected) => {
      pendingTimerRef.current = null;
      if (selected !== "dismissed" && !isPolicyAllowed_2("allow_product_feedback")) {
        setState("closed");
        setLastResponse(null);
        return;
      }
      onSelect(appearanceId.current, selected);
      if (selected === "dismissed") {
        setState("closed");
        setLastResponse(null);
      } else if (shouldShowTranscriptPrompt?.(selected)) {
        setState("transcript_prompt");
        onTranscriptPromptShown?.(appearanceId.current, selected);
      } else if (shouldShowFollowupPrompt?.(selected)) {
        setState("followup_prompt");
        onFollowupPromptShown?.(appearanceId.current, selected);
      } else showThanksThenClose();
    },
    [
      showThanksThenClose,
      onSelect,
      shouldShowTranscriptPrompt,
      onTranscriptPromptShown,
      shouldShowFollowupPrompt,
      onFollowupPromptShown,
    ],
  );
  let handleSelect = useCallback(
    (selected) => {
      pendingTimerRef.current?.();
      pendingTimerRef.current = null;
      answeredRef.current = true;
      setLastResponse(selected);
      lastResponseRef.current = selected;
      if (selected === "dismissed") {
        open_2(selected);
        return;
      }
      setState("pending");
      pendingTimerRef.current = clock.setTimeout(() => open_2(selected), PENDING_OPEN_DELAY_MS);
    },
    [clock, open_2],
  );
  let handleTranscriptSelect = useCallback(() => {
    if (pendingTimerRef.current === null) return false;
    pendingTimerRef.current();
    pendingTimerRef.current = null;
    setLastResponse(null);
    lastResponseRef.current = null;
    setState("open");
    return true;
  }, []);
  let handleShareResult = useCallback(
    ({ success, bundlePath }) => {
      if (success) {
        setBundlePath(bundlePath ?? null);
        showSubmittedThenClose();
      } else showShareFailedThenClose();
    },
    [showSubmittedThenClose, showShareFailedThenClose],
  );
  let handleTranscriptSelect_2 = useCallback(
    (selected_0) => {
      let previousResponse = lastResponseRef.current;
      let followupFirst =
        previousResponse !== null && (shouldShowFollowupPrompt?.(previousResponse) ?? false);
      switch (selected_0) {
        case "yes": {
          let sharePromise = () =>
            (async () => {
              try {
                let success = await onTranscriptSelect?.(appearanceId.current, selected_0, previousResponse);
                return typeof success === "object"
                  ? success
                  : {
                      success: success ?? false,
                      bundlePath: undefined,
                    };
              } catch {
                return {
                  success: false,
                  bundlePath: undefined,
                };
              }
            })();
          if (followupFirst && previousResponse !== null) {
            onShareConsent?.(appearanceId.current, previousResponse);
            sharePromiseRef.current = sharePromise;
            setState("followup_prompt");
            onFollowupPromptShown?.(appearanceId.current, previousResponse);
          } else {
            setSubmittingShare(true);
            setState("submitting");
            sharePromise().then(handleShareResult);
          }
          break;
        }
        case "no":
        case "dont_ask_again":
          onTranscriptSelect?.(appearanceId.current, selected_0, previousResponse);
          if (followupFirst && previousResponse !== null) {
            setState("followup_prompt");
            onFollowupPromptShown?.(appearanceId.current, previousResponse);
          } else showThanksThenClose();
          break;
      }
    },
    [
      showThanksThenClose,
      handleShareResult,
      onTranscriptSelect,
      onShareConsent,
      shouldShowFollowupPrompt,
      onFollowupPromptShown,
    ],
  );
  let handleFollowupResolve = useCallback(
    (resolution) => {
      let submitPromise = onFollowupResolve?.(appearanceId.current, resolution, lastResponseRef.current);
      let followupPromise = submitPromise ? Promise.resolve(submitPromise).catch(() => {}) : null;
      let sharePromise = sharePromiseRef.current;
      sharePromiseRef.current = null;
      if (sharePromise) {
        setSubmittingShare(true);
        setState("submitting");
        Promise.all([sharePromise(), followupPromise]).then(([shareResult]) =>
          handleShareResult(shareResult),
        );
      } else if (followupPromise) {
        setSubmittingShare(false);
        setState("submitting");
        followupPromise.then(() => showThanksThenClose("followup"));
      } else showThanksThenClose("followup");
    },
    [onFollowupResolve, handleShareResult, showThanksThenClose],
  );
  return {
    state,
    lastResponse,
    appearanceId: appearanceId.current,
    transcriptBundlePath: bundlePath,
    open,
    abandon: showSubmittedThenClose_2,
    handleSelect,
    handleUndo: handleTranscriptSelect,
    handleTranscriptSelect: handleTranscriptSelect_2,
    handleFollowupResolve,
    thanksFromFollowup,
    submittingShare,
  };
}
//@ chunk-18hwfzwa.js:1034274-1034549 placement
function surveyProbability(probability) {
  if (!probability) return {};
  return {
    stays_while_typing: probability.stays,
    survey_config_probability: probability.configProbability,
    survey_override_probability: probability.settingsRate,
    ...(probability.answer && {
      answered_after_typing: answeredAfterTyping(probability),
      response_method: fromEnum(probability.answer.method),
      ms_since_appeared: probability.answer.msSinceAppeared,
    }),
  };
}
//@ chunk-18hwfzwa.js:1034549-1034615 placement
function answeredAfterTyping(answer) {
  return answer !== null && answer.submitCountWhenTypedOver !== null;
}
//@ chunk-18hwfzwa.js:1034615-1034670 placement
function msSinceAppeared(state, now) {
  return Math.round(now - state.openedAtClock);
}
//@ chunk-18hwfzwa.js:1034670-1034714 placement
function effortLevelForAppState(appStoreDirect) {
  return buildEffortLevelTelemetry(resolveEffortLevel(appStoreDirect.getState()));
}
//@ chunk-18hwfzwa.js:1034714-1034718 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1034714", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1034718-1034755 placement
function selectIsLoading3(state) {
  return state.isLoading;
}
//@ chunk-18hwfzwa.js:1034755-1034794 placement
function selectSubmitCount2(state) {
  return state.submitCount;
}
export {
  effortLevelForAppState,
  surveyProbability,
  answeredAfterTyping,
  msSinceAppeared,
  useSurveyState,
  selectIsLoading3,
  selectSubmitCount2,
};
