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
import {
  randomUUID,
  randomUUID as randomUUID_2,
  randomUUID as randomUUID_3,
  randomUUID as randomUUID_4,
  randomUUID as randomUUID_5,
  randomUUID as randomUUID_6,
  randomUUID as randomUUID_7,
  randomUUID as randomUUID_8,
  randomUUID as randomUUID_9,
  randomUUID as randomUUID_10,
  randomUUID as randomUUID_11,
  randomUUID as randomUUID_12,
  randomUUID as randomUUID_13,
  randomUUID as randomUUID_14,
  randomUUID as randomUUID_15,
  randomUUID as randomUUID_16,
  randomUUID as randomUUID_17,
} from "crypto";
import { useClock } from "../../ink/components/ClockContext.js";
import { y, R, P, ce, j } from "../../../vendor/react/cjs/react.production.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { Kke } from "./FeedbackDraftNotice.js";
import { resolveEffortLevel } from "../../utils/effort.js";

//@ chunk-18hwfzwa.js:1021671-1021684 affinity
var zfo = 3000;
/**
 * 调查状态机：closed → digit（评分）→ followup（是否分享）→ thanks/submitted/share_failed。
 */
//@ chunk-18hwfzwa.js:1021684-1024512 fingerprint = useSurveyState (0.63)
function useSurveyState({
  hideThanksAfterMs: hideThanksAfterMs,
  otherSurveyActive: otherSurveyActive = !1,
  autoDismissAfterMs: autoDismissAfterMs,
  onOpen: onOpen,
  onSelect: onSelect,
  onAutoDismiss: onAutoDismiss,
  onAbandon: onAbandon,
  shouldShowTranscriptPrompt: shouldShowTranscriptPrompt,
  onTranscriptPromptShown: onTranscriptPromptShown,
  onTranscriptSelect: onTranscriptSelect,
  onShareConsent: onShareConsent,
  shouldShowFollowupPrompt: shouldShowFollowupPrompt,
  onFollowupPromptShown: onFollowupPromptShown,
  onFollowupResolve: onFollowupResolve,
}) {
  let At = useClock(),
    [It, Ot] = y("closed"),
    [Et, Dt] = y(null),
    [Lt, oo] = y(null),
    [Xt, io] = y(!0),
    appearanceId = R(randomUUID_10()),
    lastResponseRef = R(null),
    ao = R(null),
    co = R(null);
  P(
    () => () => {
      ao.current?.();
    },
    [],
  );
  let [bo, Ao] = y(!1),
    showThanksThenClose = ce(
      (bn = "digit") => {
        (Ao(bn === "followup"),
          Ot("thanks"),
          At.setTimeout(() => {
            (Ot("closed"), Dt(null));
          }, hideThanksAfterMs));
      },
      [At, hideThanksAfterMs],
    ),
    Ro = ce(() => {
      (Ot("submitted"), At.setTimeout(() => Ot("closed"), hideThanksAfterMs));
    }, [At, hideThanksAfterMs]),
    Ho = ce(() => {
      (Ot("share_failed"), At.setTimeout(() => Ot("closed"), hideThanksAfterMs));
    }, [At, hideThanksAfterMs]),
    Io = ce(() => {
      if (It !== "closed") return;
      ((Wo.current = !1), Ot("open"), (appearanceId.current = randomUUID_10()), onOpen(appearanceId.current));
    }, [It, onOpen]),
    Wo = R(!1),
    showSubmittedThenClose = ce(() => {
      if (It !== "open") return;
      (Ot("closed"), Dt(null), onAbandon?.(appearanceId.current));
    }, [It, onAbandon]);
  (P(() => {
    if (otherSurveyActive && It === "open" && !Wo.current) Ot("closed");
  }, [otherSurveyActive, It]),
    useTimeout(
      () => {
        (Ot("closed"), Dt(null), onAutoDismiss?.(appearanceId.current));
      },
      It === "open" && autoDismissAfterMs ? autoDismissAfterMs : null,
      [It, autoDismissAfterMs],
    ));
  let open = ce(
      (bn) => {
        if (((ao.current = null), bn !== "dismissed" && !isPolicyAllowed_2("allow_product_feedback"))) {
          (Ot("closed"), Dt(null));
          return;
        }
        if ((onSelect(appearanceId.current, bn), bn === "dismissed")) (Ot("closed"), Dt(null));
        else if (shouldShowTranscriptPrompt?.(bn))
          (Ot("transcript_prompt"), onTranscriptPromptShown?.(appearanceId.current, bn));
        else if (shouldShowFollowupPrompt?.(bn))
          (Ot("followup_prompt"), onFollowupPromptShown?.(appearanceId.current, bn));
        else showThanksThenClose();
      },
      [
        showThanksThenClose,
        onSelect,
        shouldShowTranscriptPrompt,
        onTranscriptPromptShown,
        shouldShowFollowupPrompt,
        onFollowupPromptShown,
      ],
    ),
    handleSelect = ce(
      (selected) => {
        if (
          (ao.current?.(),
          (ao.current = null),
          (Wo.current = !0),
          Dt(selected),
          (lastResponseRef.current = selected),
          selected === "dismissed")
        ) {
          open(selected);
          return;
        }
        (Ot("pending"), (ao.current = At.setTimeout(() => open(selected), zfo)));
      },
      [At, open],
    ),
    handleTranscriptSelect = ce(() => {
      if (ao.current === null) return !1;
      return (ao.current(), (ao.current = null), Dt(null), (lastResponseRef.current = null), Ot("open"), !0);
    }, []),
    Yo = ce(
      ({ success: success, bundlePath: bundlePath }) => {
        if (success) (oo(bundlePath ?? null), Ro());
        else Ho();
      },
      [Ro, Ho],
    ),
    kn = ce(
      (selected_0) => {
        let Go = lastResponseRef.current,
          hn = Go !== null && (shouldShowFollowupPrompt?.(Go) ?? !1);
        switch (selected_0) {
          case "yes": {
            let Mn = () =>
              (async () => {
                try {
                  let success = await onTranscriptSelect?.(appearanceId.current, selected_0, Go);
                  return typeof success === "object"
                    ? success
                    : { success: success ?? !1, bundlePath: void 0 };
                } catch {
                  return { success: !1, bundlePath: void 0 };
                }
              })();
            if (hn && Go !== null)
              (onShareConsent?.(appearanceId.current, Go),
                (co.current = Mn),
                Ot("followup_prompt"),
                onFollowupPromptShown?.(appearanceId.current, Go));
            else (io(!0), Ot("submitting"), Mn().then(Yo));
            break;
          }
          case "no":
          case "dont_ask_again":
            if ((onTranscriptSelect?.(appearanceId.current, selected_0, Go), hn && Go !== null))
              (Ot("followup_prompt"), onFollowupPromptShown?.(appearanceId.current, Go));
            else showThanksThenClose();
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
    ),
    Fn = ce(
      (bn) => {
        let Go = onFollowupResolve?.(appearanceId.current, bn, lastResponseRef.current),
          hn = Go ? Promise.resolve(Go).catch(() => {}) : null,
          Mn = co.current;
        if (((co.current = null), Mn))
          (io(!0), Ot("submitting"), Promise.all([Mn(), hn]).then(([Xo]) => Yo(Xo)));
        else if (hn) (io(!1), Ot("submitting"), hn.then(() => showThanksThenClose("followup")));
        else showThanksThenClose("followup");
      },
      [onFollowupResolve, Yo, showThanksThenClose],
    );
  return {
    state: It,
    lastResponse: Et,
    appearanceId: appearanceId.current,
    transcriptBundlePath: Lt,
    open: Io,
    abandon: showSubmittedThenClose,
    handleSelect: handleSelect,
    handleUndo: handleTranscriptSelect,
    handleTranscriptSelect: kn,
    handleFollowupResolve: Fn,
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
      answered_after_typing: v4(h),
      response_method: fromEnum(h.answer.method),
      ms_since_appeared: h.answer.msSinceAppeared,
    }),
  };
}
//@ chunk-18hwfzwa.js:1034549-1034615 placement
function v4(h) {
  return h !== null && h.submitCountWhenTypedOver !== null;
}
//@ chunk-18hwfzwa.js:1034615-1034670 placement
function wve(h, x) {
  return Math.round(x - h.openedAtClock);
}
//@ chunk-18hwfzwa.js:1034670-1034714 placement
function Ch(h) {
  return Kke(resolveEffortLevel(h.getState()));
}
//@ chunk-18hwfzwa.js:1034714-1034718 placement
j();
//@ chunk-18hwfzwa.js:1034718-1034755 placement
function selectIsLoading3(Kn) {
  return Kn.isLoading;
}
//@ chunk-18hwfzwa.js:1034755-1034794 placement
function selectSubmitCount2(Wn) {
  return Wn.submitCount;
}

export { Ch, surveyProbability, v4, wve, useSurveyState, selectIsLoading3, selectSubmitCount2 };
