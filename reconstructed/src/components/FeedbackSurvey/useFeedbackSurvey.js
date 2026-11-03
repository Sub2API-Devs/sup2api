/**
 * components/FeedbackSurvey/useFeedbackSurvey.tsx
 *
 * 会话调查触发逻辑：按 tengu_feedback_survey_config 的概率/间隔/消息数决定何时显示，并按评分决定是否询问分享记录。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/useFeedbackSurvey.tsx
 * pieces: chunk-0sfjpx19.js (1), chunk-18hwfzwa.js (5), chunk-pzv0vqyf.js (1)
 * attribution: fingerprint 3, sole-consumer 3, affinity 1
 */
import { getLastAssistantMessage } from "../../utils/messages.js";
import { Me } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { Cr } from "../../state/AppState.js";
import { op, Aw } from "../../screens/repl/storeHooks.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { y, R, ce, Q, P } from "../../../vendor/react/cjs/react.production.js";
import { YM, useDelayedFlag, JM } from "./SurveyHost.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { getLastCancelledAPIMessageId, getPromptIndex } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import { Ch, surveyProbability, v4, wve, useSurveyState } from "./useSurveyState.js";
import { lit as lit_2, fromEnum, fromEnumOpt, fromNumber } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import {
  transcriptSharePolicy,
  getTranscriptShareGate,
  collectTranscriptShare,
} from "./submitTranscriptShare.js";
import { useDialogStore, useHasOpenDialog as useHasOpenDialog_2, Unn } from "../../state/dialogQueue.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { isFeedbackSurveyForOtel, shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { feedbackMode } from "../../services/feedback/submitFeedback.js";
import { GWe } from "../../context/overlayContext.js";
import { logEventTo1P, submitSurveyFollowup } from "../../services/feedback/feedbackBundle.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { Jke } from "./SurveyFollowup.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { env } from "../../utils/env.js";
import { isEnvTruthy } from "../../utils/envUtils.js";

//@ chunk-18hwfzwa.js:1024512-1024535 sole-consumer
function k4() {
  return !1;
}
//@ chunk-18hwfzwa.js:1024535-1024559 sole-consumer
function mot() {
  return !1;
}
//@ chunk-18hwfzwa.js:1024559-1024611 sole-consumer
function yC(h) {
  return getLastAssistantMessage(h)?.message?.id || "unknown";
}
//@ chunk-18hwfzwa.js:1024611-1024724 affinity
function feedbackSurveyKindFor(h) {
  return h === "good"
    ? "good_feedback_survey"
    : h === "fine"
      ? "fine_feedback_survey"
      : "bad_feedback_survey";
}
/**
 * 会话调查调度：读取 tengu_feedback_survey_config（概率、最少时长/消息数、冷却），按 good/fine/bad 评分读取对应的分享记录询问配置，管理显示与提交。
 */
//@ chunk-18hwfzwa.js:1024724-1034274 fingerprint = useFeedbackSurvey (0.589)
function useFeedbackSurvey({
  turn: turn,
  transcript: transcript,
  surveyType: surveyType = "session",
  otherSurveyActive: otherSurveyActive = !1,
}) {
  let { storageV5: storageV5, credentials: credentials } = Me(),
    Re = useHost(),
    Be = Cr(),
    He = op(),
    isLoading = useStoreSelector(turn, (fr) => fr.isLoading),
    submitCount = useStoreSelector(turn, (fr) => fr.submitCount),
    Xe = useStoreSelector(transcript),
    [rt, kt] = y(() => ({
      timeLastShown: null,
      timeLastShownAtClock: null,
      submitCountAtLastAppearance: null,
    })),
    config = YM("tengu_feedback_survey_config", J0n),
    badTranscriptAskConfig = YM("tengu_bad_survey_transcript_ask_config", Pkr),
    Ot = YM("tengu_fine_survey_transcript_ask_config", Pkr),
    goodTranscriptAskConfig = YM("tengu_good_survey_transcript_ask_config", Pkr),
    [Dt, Lt] = y(DEFAULT_SURVEY_FOLLOWUP_CONFIG),
    [oo, Xt] = y(!1),
    io = R(null),
    [so, po] = y(!1),
    [ao, co] = y(!1),
    settingsRate = getInitialSettings_2().feedbackSurveyRate,
    Ao = useClock(),
    sessionStartTime = R(Ao.now()),
    submitCountAtSessionStart = R(submitCount),
    submitCountRef = R(null),
    messagesRef = R(null),
    Wo = ce(() => {
      ((submitCountRef.current = transcript.getSnapshot()),
        (messagesRef.current = getLastCancelledAPIMessageId()));
    }, [transcript]),
    mn = ce(() => {
      ((submitCountRef.current = null), (messagesRef.current = null));
    }, []),
    probabilityPassedRef = R(null),
    updateLastShownTime = ce(
      (timestamp, submitCountValue) => {
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          event_type: lit_2("transcript_share_yes"),
          appearance_id: ye(timestamp),
          last_assistant_message_id: ye(yC(transcript.getSnapshot())),
          survey_type: fromEnum(surveyType),
          trigger: fromEnum(feedbackSurveyKindFor(submitCountValue)),
        }),
          (probabilityPassedRef.current = transcriptSharePolicy(transcript.getSnapshot(), storageV5, Re)));
      },
      [surveyType, storageV5, Re, Be, transcript],
    ),
    vo = useDialogStore(),
    Yo = useHasOpenDialog_2(),
    kn = R(!1),
    Fn = R(null),
    bn = useDelayedFlag(isLoading),
    Go = Aw(),
    hn = Q(() => JM(Xe), [Xe]),
    Mn = ce(
      (prev) => {
        let now = Date.now(),
          now_2 = Ao.now();
        if (
          (kt((current) => {
            if (current.timeLastShown === now && current.submitCountAtLastAppearance === prev) return current;
            return { timeLastShown: now, timeLastShownAtClock: now_2, submitCountAtLastAppearance: prev };
          }),
          getGlobalConfig().feedbackSurveyState?.lastShownTime !== now)
        )
          saveGlobalConfig((Er) => ({ ...Er, feedbackSurveyState: { lastShownTime: now } }), storageV5);
      },
      [Ao, storageV5],
    ),
    onOpen = ce(
      (appearanceId) => {
        (Lt(DEFAULT_SURVEY_FOLLOWUP_CONFIG),
          Xt(!1),
          mn(),
          (probabilityPassedRef.current = null),
          Mn(turn.getSnapshot().submitCount));
        let $r = surveyType === "session" ? getTranscriptShareGate() : null;
        ((io.current =
          $r === null
            ? null
            : {
                stays: $r,
                configProbability: config.probability,
                settingsRate: settingsRate,
                openedAtClock: Ao.now(),
                submitCountWhenTypedOver: null,
                answer: null,
              }),
          po($r === !0),
          co(!1),
          logEvent("tengu_feedback_survey_event", {
            ...Ch(Be),
            ...surveyProbability(io.current),
            ...($r !== null && { draft_at_open: He.getState().value !== "" }),
            event_type: lit_2("appeared"),
            appearance_id: ye(appearanceId),
            last_assistant_message_id: ye(yC(transcript.getSnapshot())),
            survey_type: fromEnum(surveyType),
            prompt_index: getPromptIndex(),
          }),
          logOTelEvent("feedback_survey", {
            event_type: "appeared",
            appearance_id: appearanceId,
            survey_type: surveyType,
            enabled_via_override: isFeedbackSurveyForOtel(),
          }));
      },
      [Mn, mn, surveyType, Be, turn, transcript, Ao, He, config.probability, settingsRate],
    ),
    onSelect = ce(
      (appearanceId_0, selected) => {
        let Yr = io.current;
        if (!v4(Yr)) Mn(turn.getSnapshot().submitCount);
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          ...surveyProbability(Yr),
          event_type: lit_2("responded"),
          appearance_id: ye(appearanceId_0),
          response: fromEnum(selected),
          last_assistant_message_id: ye(yC(transcript.getSnapshot())),
          survey_type: fromEnum(surveyType),
          prompt_index: getPromptIndex(),
          ...Yr?.answer?.ratedTurn,
        }),
          logOTelEvent("feedback_survey", {
            event_type: "responded",
            appearance_id: appearanceId_0,
            response: selected,
            survey_type: surveyType,
            enabled_via_override: isFeedbackSurveyForOtel(),
          }));
      },
      [Mn, surveyType, Be, turn, transcript],
    ),
    shouldShowTranscriptPrompt = ce(
      (selected_0) => {
        let $r = io.current;
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          ...surveyProbability($r),
          ...($r && { ms_since_appeared: wve($r, Ao.now()) }),
          event_type: lit_2("abandoned"),
          appearance_id: ye(selected_0),
          last_assistant_message_id: ye(yC(transcript.getSnapshot())),
          survey_type: fromEnum(surveyType),
          prompt_index: getPromptIndex(),
        }),
          logOTelEvent("feedback_survey", {
            event_type: "abandoned",
            appearance_id: selected_0,
            survey_type: surveyType,
            enabled_via_override: isFeedbackSurveyForOtel(),
          }));
      },
      [surveyType, Be, transcript, Ao],
    ),
    on = ce(
      (fr) => {
        if (fr !== "bad" && fr !== "fine" && fr !== "good") return !1;
        if (v4(io.current)) return !1;
        if (isEssentialTrafficOnly()) return !1;
        if (!isPolicyAllowed_2("allow_product_feedback")) return !1;
        if (feedbackMode().kind === "disabled") return !1;
        if (k4()) return !0;
        if (getGlobalConfig().transcriptShareDismissed) return !1;
        let $r =
          fr === "bad"
            ? badTranscriptAskConfig.probability
            : fr === "fine"
              ? Ot.probability
              : goodTranscriptAskConfig.probability;
        return Math.random() <= $r;
      },
      [badTranscriptAskConfig.probability, Ot.probability, goodTranscriptAskConfig.probability],
    ),
    onTranscriptPromptShown = ce(
      (appearanceId_1, surveyResponse) => {
        let Yr = feedbackSurveyKindFor(surveyResponse);
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          event_type: lit_2("transcript_prompt_appeared"),
          appearance_id: ye(appearanceId_1),
          last_assistant_message_id: ye(yC(transcript.getSnapshot())),
          survey_type: fromEnum(surveyType),
          trigger: fromEnum(Yr),
        }),
          logOTelEvent("feedback_survey", {
            event_type: "transcript_prompt_appeared",
            appearance_id: appearanceId_1,
            survey_type: surveyType,
            enabled_via_override: isFeedbackSurveyForOtel(),
          }));
      },
      [surveyType, Be, transcript],
    ),
    cn = ce(
      async (fr, $r, Yr) => {
        let Er = feedbackSurveyKindFor(Yr);
        if (!($r === "yes" && probabilityPassedRef.current !== null))
          logEvent("tengu_feedback_survey_event", {
            ...Ch(Be),
            event_type: fromEnum(`transcript_share_${$r}`),
            appearance_id: ye(fr),
            last_assistant_message_id: ye(yC(transcript.getSnapshot())),
            survey_type: fromEnum(surveyType),
            trigger: fromEnum(Er),
          });
        if ($r === "dont_ask_again")
          await saveGlobalConfig((ms) => ({ ...ms, transcriptShareDismissed: !0 }), storageV5);
        if ($r === "yes") {
          let ms =
            probabilityPassedRef.current ?? transcriptSharePolicy(transcript.getSnapshot(), storageV5, Re);
          probabilityPassedRef.current = null;
          let Xs = await collectTranscriptShare(ms, Er, fr, credentials);
          return (
            logEvent("tengu_feedback_survey_event", {
              ...Ch(Be),
              event_type: lit_2(Xs.success ? "transcript_share_submitted" : "transcript_share_failed"),
              appearance_id: ye(fr),
              trigger: fromEnum(Er),
              error_code: Xs.errorCode,
            }),
            Xs
          );
        }
        return !1;
      },
      [surveyType, storageV5, credentials, Re, Be, transcript],
    ),
    Dn = ce(
      (fr) => {
        if (fr === "dismissed") return !1;
        let state = Be.getState(),
          state_2 = He.getState();
        if (
          turn.getSnapshot().isLoading ||
          Unn(vo.getState()) ||
          GWe(state.activeOverlays) ||
          state_2.active ||
          state_2.value.trim() !== ""
        )
          return !1;
        if (!logEventTo1P()) return !1;
        if (mot()) return (Lt({ ...DEFAULT_SURVEY_FOLLOWUP_CONFIG, enabled: !0 }), Xt(!0), Wo(), !0);
        let Er =
            getFeatureValue_CACHED_MAY_BE_STALE(
              DEFAULT_FEEDBACK_SURVEY_CONFIG,
              DEFAULT_SURVEY_FOLLOWUP_CONFIG,
            ) ?? {},
          Vr = (Ls, is) => (typeof Ls === "number" && Number.isFinite(Ls) && Ls > 0 ? Ls : is),
          ms = (Ls, is) => (typeof Ls === "number" && Number.isFinite(Ls) && Ls >= Jke ? Ls : is),
          Xs = {
            enabled: Er.enabled === !0,
            maxChars: Vr(Er.maxChars, DEFAULT_SURVEY_FOLLOWUP_CONFIG.maxChars),
            autoDismissAfterMs: ms(Er.autoDismissAfterMs, DEFAULT_SURVEY_FOLLOWUP_CONFIG.autoDismissAfterMs),
          };
        if ((Lt(Xs), Xt(Xs.enabled === !0), Xs.enabled === !0)) Wo();
        return Xs.enabled === !0;
      },
      [turn, Be, vo, He, Wo],
    ),
    wn = ce(
      (fr, $r) => {
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          event_type: lit_2("followup_prompt_appeared"),
          appearance_id: ye(fr),
          last_assistant_message_id: ye(yC(transcript.getSnapshot())),
          response: fromEnum($r),
          survey_type: fromEnum(surveyType),
        }),
          logOTelEvent("feedback_survey", {
            event_type: "followup_prompt_appeared",
            appearance_id: fr,
            survey_type: surveyType,
            enabled_via_override: isFeedbackSurveyForOtel(),
          }));
      },
      [surveyType, Be, transcript],
    ),
    onTranscriptSelect = ce(
      (appearanceId_2, selected_1, surveyResponse_0) => {
        if (selected_1.text === null) {
          (logEvent("tengu_feedback_survey_event", {
            ...Ch(Be),
            event_type: lit_2("followup_skipped"),
            appearance_id: ye(appearanceId_2),
            skip_method: fromEnum(selected_1.method),
            response: fromEnumOpt(surveyResponse_0),
            survey_type: fromEnum(surveyType),
          }),
            logOTelEvent("feedback_survey", {
              event_type: "followup_skipped",
              appearance_id: appearanceId_2,
              survey_type: surveyType,
              enabled_via_override: isFeedbackSurveyForOtel(),
            }),
            mn());
          return;
        }
        let text = selected_1.text;
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          event_type: lit_2("followup_submitted"),
          appearance_id: ye(appearanceId_2),
          char_count: fromNumber(Array.from(text).length),
          response: fromEnumOpt(surveyResponse_0),
          survey_type: fromEnum(surveyType),
        }),
          logOTelEvent("feedback_survey", {
            event_type: "followup_submitted",
            appearance_id: appearanceId_2,
            survey_type: surveyType,
            enabled_via_override: isFeedbackSurveyForOtel(),
          }));
        let Vr = submitCountRef.current ?? transcript.getSnapshot(),
          ms = messagesRef.current;
        return (
          mn(),
          submitSurveyFollowup({
            description: text,
            appearanceId: appearanceId_2,
            surveyResponse: surveyResponse_0 ?? "bad",
            surveyType: surveyType,
            messages: Vr,
            lastInterruptedAssistantAPIMessageId: ms,
            credentials: credentials,
          })
            .then((current_0) => {
              logEvent("tengu_feedback_survey_event", {
                ...Ch(Be),
                event_type: lit_2(current_0.success ? "followup_text_submitted" : "followup_text_failed"),
                appearance_id: ye(appearanceId_2),
                ...(current_0.success
                  ? { feedback_id: ye(current_0.feedbackId) }
                  : { error_code: ye(current_0.failureReason ?? "unknown") }),
                survey_type: fromEnum(surveyType),
              });
            })
            .catch(() => {})
        );
      },
      [surveyType, mn, Be, transcript, credentials],
    ),
    {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      transcriptBundlePath: transcriptBundlePath,
      open: open,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
      handleTranscriptSelect: handleTranscriptSelect,
      handleFollowupResolve: handleFollowupResolve,
      thanksFromFollowup: thanksFromFollowup,
      submittingShare: submittingShare,
    } = useSurveyState({
      otherSurveyActive: otherSurveyActive,
      hideThanksAfterMs: config.hideThanksAfterMs,
      onOpen: onOpen,
      onSelect: onSelect,
      onAbandon: shouldShowTranscriptPrompt,
      shouldShowTranscriptPrompt: on,
      onTranscriptPromptShown: onTranscriptPromptShown,
      onTranscriptSelect: cn,
      onShareConsent: updateLastShownTime,
      shouldShowFollowupPrompt: Dn,
      onFollowupPromptShown: wn,
      onFollowupResolve: onTranscriptSelect,
    }),
    ts = ce(
      (fr, $r) => {
        let Yr = io.current;
        if (Yr)
          Yr.answer = {
            response: fr,
            method: $r,
            msSinceAppeared: wve(Yr, Ao.now()),
            ratedTurn: {
              effort_level: Ch(Be).effort_level,
              last_assistant_message_id: ye(yC(transcript.getSnapshot())),
              prompt_index: getPromptIndex(),
            },
          };
        if ($r === "chord") logFeatureOk("feedback_survey_chord_rating");
        handleSelect(fr);
      },
      [Ao, handleSelect, Be, transcript],
    ),
    Gn = ce(() => {
      if (!handleUndo()) return;
      let fr = io.current;
      if (fr?.answer)
        (logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          ...surveyProbability(fr),
          event_type: lit_2("undone"),
          appearance_id: ye(appearanceId),
          response: fromEnum(fr.answer.response),
          survey_type: fromEnum(surveyType),
        }),
          (fr.answer = null));
    }, [handleUndo, Be, appearanceId, surveyType]),
    Ur = ce(() => {
      let fr = io.current;
      if (!fr || v4(fr)) return;
      ((fr.submitCountWhenTypedOver = turn.getSnapshot().submitCount),
        co(!0),
        logEvent("tengu_feedback_survey_event", {
          ...Ch(Be),
          ...surveyProbability(fr),
          ms_since_appeared: wve(fr, Ao.now()),
          event_type: lit_2("typed_over"),
          appearance_id: ye(appearanceId),
          survey_type: fromEnum(surveyType),
        }));
    }, [Be, Ao, turn, appearanceId, surveyType]),
    Zr = ao && (isLoading || submitCount !== io.current?.submitCountWhenTypedOver);
  P(() => {
    if (Zr && state === "open") abandon();
  }, [Zr, state, abandon]);
  let currentModel = getMainLoopModel(),
    isModelAllowed = Q(() => {
      if (config.onForModels.length === 0) return !1;
      if (config.onForModels.includes("*")) return !0;
      return config.onForModels.includes(currentModel);
    }, [config.onForModels, currentModel]),
    shouldOpen = Q(() => {
      if (state !== "closed") return !1;
      if (isLoading) return !1;
      if (!bn) return !1;
      if (Go) return !1;
      if (hn) return !1;
      if (Yo) return !1;
      if (otherSurveyActive) return !1;
      if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return !1;
      if (shouldSkipFeedbackSurvey()) return !1;
      if (!isPolicyAllowed_2("allow_product_feedback")) return !1;
      if (isEnvTruthy(process.env.CLAUDE_FORCE_DISPLAY_SURVEY) && !rt.timeLastShown) return !0;
      if (!isModelAllowed) return !1;
      let now = Ao.now();
      if (rt.timeLastShownAtClock !== null) {
        if (now - rt.timeLastShownAtClock < config.minTimeBetweenFeedbackMs) return !1;
        if (
          rt.submitCountAtLastAppearance !== null &&
          submitCount < rt.submitCountAtLastAppearance + config.minUserTurnsBetweenFeedback
        )
          return !1;
      } else {
        if (now - sessionStartTime.current < config.minTimeBeforeFeedbackMs) return !1;
        if (submitCount < submitCountAtSessionStart.current + config.minUserTurnsBeforeFeedback) return !1;
      }
      if (Fn.current !== submitCount)
        ((Fn.current = submitCount), (kn.current = Math.random() <= (settingsRate ?? config.probability)));
      if (!kn.current) return !1;
      let globalFeedbackState = getGlobalConfig().feedbackSurveyState;
      if (globalFeedbackState?.lastShownTime) {
        if (Date.now() - globalFeedbackState.lastShownTime < config.minTimeBetweenGlobalFeedbackMs) return !1;
      }
      return !0;
    }, [
      Ao,
      state,
      isLoading,
      bn,
      Go,
      hn,
      Yo,
      otherSurveyActive,
      isModelAllowed,
      rt.timeLastShown,
      rt.timeLastShownAtClock,
      rt.submitCountAtLastAppearance,
      submitCount,
      config.minTimeBetweenFeedbackMs,
      config.minTimeBetweenGlobalFeedbackMs,
      config.minUserTurnsBetweenFeedback,
      config.minTimeBeforeFeedbackMs,
      config.minUserTurnsBeforeFeedback,
      config.probability,
      settingsRate,
    ]);
  return (
    P(() => {
      if (shouldOpen) open();
    }, [shouldOpen, open]),
    {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      transcriptBundlePath: transcriptBundlePath,
      abandon: abandon,
      handleSelect: ts,
      handleTypedOver: so ? Ur : void 0,
      typedOver: ao,
      turnMovedOn: Zr,
      handleUndo: Gn,
      handleTranscriptSelect: handleTranscriptSelect,
      handleFollowupResolve: handleFollowupResolve,
      followupAskConfig: Dt,
      turnInProgress: isLoading,
      thanksFromFollowup: thanksFromFollowup,
      followupArmActive: oo,
      submittingShare: submittingShare,
    }
  );
}
//@ chunk-0sfjpx19.js:134556-134912 fingerprint = DEFAULT_FEEDBACK_SURVEY_CONFIG (0.728)
var DEFAULT_FEEDBACK_SURVEY_CONFIG = "tengu_juniper_vale",
  TENGU_RUSSET_WHIMBREL = "tengu_russet_whimbrel",
  J0n = {
    minTimeBeforeFeedbackMs: 600000,
    minTimeBetweenFeedbackMs: 3600000,
    minTimeBetweenGlobalFeedbackMs: 1e8,
    minUserTurnsBeforeFeedback: 5,
    minUserTurnsBetweenFeedback: 10,
    hideThanksAfterMs: 5000,
    onForModels: ["*"],
    probability: 0.005,
  },
  Pkr = { probability: 0 },
  DEFAULT_SURVEY_FOLLOWUP_CONFIG = { enabled: !1, maxChars: 500, autoDismissAfterMs: 30000 };
//@ chunk-pzv0vqyf.js:1697-1755 fingerprint = DEFAULT_TRANSCRIPT_ASK_CONFIG (0.481)
var DEFAULT_TRANSCRIPT_ASK_CONFIG = { afterPromptCount: 5, probability: 0, maxImpressions: 3 };

export {
  useFeedbackSurvey,
  DEFAULT_SURVEY_FOLLOWUP_CONFIG,
  TENGU_RUSSET_WHIMBREL,
  DEFAULT_TRANSCRIPT_ASK_CONFIG,
  J0n,
};
