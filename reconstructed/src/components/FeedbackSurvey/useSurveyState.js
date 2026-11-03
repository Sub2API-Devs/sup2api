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
import { y, R, P, ce, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { buildEffortLevelTelemetry } from "./FeedbackDraftNotice.js";
import { resolveEffortLevel } from "../../utils/effort.js";

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
  let [It, Ot] = y("closed");
  let [Et, Dt] = y(null);
  let [Lt, oo] = y(null);
  let [Xt, io] = y(true);
  let appearanceId = R(randomUUID());
  let lastResponseRef = R(null);
  let ao = R(null);
  let co = R(null);
  P(
    () => () => {
      ao.current?.();
    },
    [],
  );
  let [bo, Ao] = y(false);
  let showThanksThenClose = ce(
    (bn = "digit") => {
      Ao(bn === "followup");
      Ot("thanks");
      clock.setTimeout(() => {
        Ot("closed");
        Dt(null);
      }, hideThanksAfterMs);
    },
    [clock, hideThanksAfterMs],
  );
  let Ro = ce(() => {
    Ot("submitted");
    clock.setTimeout(() => Ot("closed"), hideThanksAfterMs);
  }, [clock, hideThanksAfterMs]);
  let Ho = ce(() => {
    Ot("share_failed");
    clock.setTimeout(() => Ot("closed"), hideThanksAfterMs);
  }, [clock, hideThanksAfterMs]);
  let open = ce(() => {
    if (It !== "closed") return;
    Wo.current = false;
    Ot("open");
    appearanceId.current = randomUUID();
    onOpen(appearanceId.current);
  }, [It, onOpen]);
  let Wo = R(false);
  let showSubmittedThenClose = ce(() => {
    if (It !== "open") return;
    Ot("closed");
    Dt(null);
    onAbandon?.(appearanceId.current);
  }, [It, onAbandon]);
  P(() => {
    if (otherSurveyActive && It === "open" && !Wo.current) Ot("closed");
  }, [otherSurveyActive, It]);
  useTimeout(
    () => {
      Ot("closed");
      Dt(null);
      onAutoDismiss?.(appearanceId.current);
    },
    It === "open" && autoDismissAfterMs ? autoDismissAfterMs : null,
    [It, autoDismissAfterMs],
  );
  let open_2 = ce(
    (selected) => {
      ao.current = null;
      if (selected !== "dismissed" && !isPolicyAllowed_2("allow_product_feedback")) {
        Ot("closed");
        Dt(null);
        return;
      }
      onSelect(appearanceId.current, selected);
      if (selected === "dismissed") {
        Ot("closed");
        Dt(null);
      } else if (shouldShowTranscriptPrompt?.(selected)) {
        Ot("transcript_prompt");
        onTranscriptPromptShown?.(appearanceId.current, selected);
      } else if (shouldShowFollowupPrompt?.(selected)) {
        Ot("followup_prompt");
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
  let handleSelect = ce(
    (selected) => {
      ao.current?.();
      ao.current = null;
      Wo.current = true;
      Dt(selected);
      lastResponseRef.current = selected;
      if (selected === "dismissed") {
        open_2(selected);
        return;
      }
      Ot("pending");
      ao.current = clock.setTimeout(() => open_2(selected), PENDING_OPEN_DELAY_MS);
    },
    [clock, open_2],
  );
  let handleTranscriptSelect = ce(() => {
    if (ao.current === null) return false;
    ao.current();
    ao.current = null;
    Dt(null);
    lastResponseRef.current = null;
    Ot("open");
    return true;
  }, []);
  let Yo = ce(
    ({ success, bundlePath }) => {
      if (success) {
        oo(bundlePath ?? null);
        Ro();
      } else Ho();
    },
    [Ro, Ho],
  );
  let handleTranscriptSelect_2 = ce(
    (selected_0) => {
      let Go = lastResponseRef.current;
      let hn = Go !== null && (shouldShowFollowupPrompt?.(Go) ?? false);
      switch (selected_0) {
        case "yes": {
          let Mn = () =>
            (async () => {
              try {
                let success = await onTranscriptSelect?.(appearanceId.current, selected_0, Go);
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
          if (hn && Go !== null) {
            onShareConsent?.(appearanceId.current, Go);
            co.current = Mn;
            Ot("followup_prompt");
            onFollowupPromptShown?.(appearanceId.current, Go);
          } else {
            io(true);
            Ot("submitting");
            Mn().then(Yo);
          }
          break;
        }
        case "no":
        case "dont_ask_again":
          onTranscriptSelect?.(appearanceId.current, selected_0, Go);
          if (hn && Go !== null) {
            Ot("followup_prompt");
            onFollowupPromptShown?.(appearanceId.current, Go);
          } else showThanksThenClose();
          break;
      }
    },
    [
      showThanksThenClose,
      Yo,
      onTranscriptSelect,
      onShareConsent,
      shouldShowFollowupPrompt,
      onFollowupPromptShown,
    ],
  );
  let handleFollowupResolve = ce(
    (bn) => {
      let Go = onFollowupResolve?.(appearanceId.current, bn, lastResponseRef.current);
      let hn = Go ? Promise.resolve(Go).catch(() => {}) : null;
      let Mn = co.current;
      co.current = null;
      if (Mn) {
        io(true);
        Ot("submitting");
        Promise.all([Mn(), hn]).then(([Xo]) => Yo(Xo));
      } else if (hn) {
        io(false);
        Ot("submitting");
        hn.then(() => showThanksThenClose("followup"));
      } else showThanksThenClose("followup");
    },
    [onFollowupResolve, Yo, showThanksThenClose],
  );
  return {
    state: It,
    lastResponse: Et,
    appearanceId: appearanceId.current,
    transcriptBundlePath: Lt,
    open,
    abandon: showSubmittedThenClose,
    handleSelect,
    handleUndo: handleTranscriptSelect,
    handleTranscriptSelect: handleTranscriptSelect_2,
    handleFollowupResolve,
    thanksFromFollowup: bo,
    submittingShare: Xt,
  };
}
//@ chunk-18hwfzwa.js:1034274-1034549 placement
function surveyProbability(h) {
  if (!h) return {};
  return {
    stays_while_typing: h.stays,
    survey_config_probability: h.configProbability,
    survey_override_probability: h.settingsRate,
    ...(h.answer && {
      answered_after_typing: answeredAfterTyping(h),
      response_method: fromEnum(h.answer.method),
      ms_since_appeared: h.answer.msSinceAppeared,
    }),
  };
}
//@ chunk-18hwfzwa.js:1034549-1034615 placement
function answeredAfterTyping(h) {
  return h !== null && h.submitCountWhenTypedOver !== null;
}
//@ chunk-18hwfzwa.js:1034615-1034670 placement
function msSinceAppeared(h, x) {
  return Math.round(x - h.openedAtClock);
}
//@ chunk-18hwfzwa.js:1034670-1034714 placement
function effortLevelForAppState(appStoreDirect) {
  return buildEffortLevelTelemetry(resolveEffortLevel(appStoreDirect.getState()));
}
//@ chunk-18hwfzwa.js:1034714-1034718 placement
init_react_production();
//@ chunk-18hwfzwa.js:1034718-1034755 placement
function selectIsLoading3(Kn) {
  return Kn.isLoading;
}
//@ chunk-18hwfzwa.js:1034755-1034794 placement
function selectSubmitCount2(Wn) {
  return Wn.submitCount;
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
