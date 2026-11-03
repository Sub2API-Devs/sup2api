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
import { useTheme_2 } from "../design-system/ThemeProvider.js";
import { useHost } from "../../context/session.js";
import { useAppStoreDirect } from "../../state/AppState.js";
import { sessionStore, useActive } from "../../screens/repl/storeHooks.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { y, R, ce, Q, P } from "../../../vendor/react/cjs/react.production.js";
import { useDynamicConfigValue, useDelayedFlag, endsWithNumberedList } from "./SurveyHost.js";
import { getInitialSettings_2 } from "../../utils/settings/settings.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { getLastCancelledAPIMessageId, getPromptIndex } from "../../bootstrap/state.js";
import { logEvent } from "../../services/analytics/index.js";
import {
  effortLevelForAppState,
  surveyProbability,
  answeredAfterTyping,
  msSinceAppeared,
  useSurveyState,
} from "./useSurveyState.js";
import { lit as lit_2, fromEnum, fromEnumOpt, fromNumber } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import {
  transcriptSharePolicy,
  getTranscriptShareGate,
  collectTranscriptShare,
} from "./submitTranscriptShare.js";
import {
  useDialogStore,
  useHasOpenDialog as useHasOpenDialog_2,
  hasOpenDialogs,
} from "../../state/dialogQueue.js";
import { getGlobalConfig, saveGlobalConfig } from "../../utils/config.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { isFeedbackSurveyForOtel, shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isEssentialTrafficOnly } from "../../utils/privacyLevel.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { feedbackMode } from "../../services/feedback/submitFeedback.js";
import { hasUnknownOtherKey } from "../../context/overlayContext.js";
import { logEventTo1P, submitSurveyFollowup } from "../../services/feedback/feedbackBundle.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { FOLLOWUP_RECENT_INPUT_MS } from "./SurveyFollowup.js";
import { logFeatureOk } from "../../services/analytics/featureTelemetry.js";
import { getMainLoopModel } from "../../utils/model/model.js";
import { env } from "../../utils/env.js";
import { isEnvTruthy } from "../../utils/envUtils.js";

//@ chunk-18hwfzwa.js:1024512-1024535 sole-consumer
function isShareAlwaysAllowed() {
  return false;
}
//@ chunk-18hwfzwa.js:1024535-1024559 sole-consumer
function isFollowupAlwaysEnabled() {
  return false;
}
//@ chunk-18hwfzwa.js:1024559-1024611 sole-consumer
function getLastAssistantMessageId(snapshot) {
  return getLastAssistantMessage(snapshot)?.message?.id || "unknown";
}
//@ chunk-18hwfzwa.js:1024611-1024724 affinity
function feedbackSurveyKindFor(h) {
  return h === "good"
    ? "good_feedback_survey"
    : h === "fine"
      ? "fine_feedback_survey"
      : "bad_feedback_survey";
}
//@ chunk-18hwfzwa.js:1024724-1034274 fingerprint = useFeedbackSurvey (0.589)
/**
 * 会话调查调度：读取 tengu_feedback_survey_config（概率、最少时长/消息数、冷却），按 good/fine/bad 评分读取对应的分享记录询问配置，管理显示与提交。
 */
function useFeedbackSurvey({ turn, transcript, surveyType = "session", otherSurveyActive = false }) {
  let { storageV5, credentials } = useTheme_2();
  let host = useHost();
  let appStoreDirect = useAppStoreDirect();
  let He = sessionStore();
  let isLoading = useStoreSelector(turn, (fr) => fr.isLoading);
  let submitCount = useStoreSelector(turn, (fr) => fr.submitCount);
  let storeSelector = useStoreSelector(transcript);
  let [rt, kt] = y(() => ({
    timeLastShown: null,
    timeLastShownAtClock: null,
    submitCountAtLastAppearance: null,
  }));
  let config = useDynamicConfigValue("tengu_feedback_survey_config", DEFAULT_SURVEY_TIMING);
  let badTranscriptAskConfig = useDynamicConfigValue(
    "tengu_bad_survey_transcript_ask_config",
    ZERO_PROBABILITY_CONFIG,
  );
  let dynamicConfigValue = useDynamicConfigValue(
    "tengu_fine_survey_transcript_ask_config",
    ZERO_PROBABILITY_CONFIG,
  );
  let goodTranscriptAskConfig = useDynamicConfigValue(
    "tengu_good_survey_transcript_ask_config",
    ZERO_PROBABILITY_CONFIG,
  );
  let [Dt, Lt] = y(DEFAULT_SURVEY_FOLLOWUP_CONFIG);
  let [oo, Xt] = y(false);
  let io = R(null);
  let [so, po] = y(false);
  let [ao, co] = y(false);
  let settingsRate = getInitialSettings_2().feedbackSurveyRate;
  let clock = useClock();
  let sessionStartTime = R(clock.now());
  let submitCountAtSessionStart = R(submitCount);
  let submitCountRef = R(null);
  let messagesRef = R(null);
  let Wo = ce(() => {
    submitCountRef.current = transcript.getSnapshot();
    messagesRef.current = getLastCancelledAPIMessageId();
  }, [transcript]);
  let mn = ce(() => {
    submitCountRef.current = null;
    messagesRef.current = null;
  }, []);
  let probabilityPassedRef = R(null);
  let updateLastShownTime = ce(
    (timestamp, submitCountValue) => {
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        event_type: lit_2("transcript_share_yes"),
        appearance_id: sanitizeMarkName(timestamp),
        last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
        survey_type: fromEnum(surveyType),
        trigger: fromEnum(feedbackSurveyKindFor(submitCountValue)),
      });
      probabilityPassedRef.current = transcriptSharePolicy(transcript.getSnapshot(), storageV5, host);
    },
    [surveyType, storageV5, host, appStoreDirect, transcript],
  );
  let dialogStore = useDialogStore();
  let hasOpenDialog = useHasOpenDialog_2();
  let probabilityPassedRef_2 = R(false);
  let lastEligibleSubmitCountRef = R(null);
  let delayedFlag = useDelayedFlag(isLoading);
  let active = useActive();
  let hn = Q(() => endsWithNumberedList(storeSelector), [storeSelector]);
  let Mn = ce(
    (prev) => {
      let timestamp = Date.now();
      let timeLastShownAtClock = clock.now();
      kt((prev_2) => {
        if (prev_2.timeLastShown === timestamp && prev_2.submitCountAtLastAppearance === prev) return prev_2;
        return {
          timeLastShown: timestamp,
          timeLastShownAtClock,
          submitCountAtLastAppearance: prev,
        };
      });
      if (getGlobalConfig().feedbackSurveyState?.lastShownTime !== timestamp)
        saveGlobalConfig(
          (current) => ({
            ...current,
            feedbackSurveyState: {
              lastShownTime: timestamp,
            },
          }),
          storageV5,
        );
    },
    [clock, storageV5],
  );
  let onOpen = ce(
    (appearanceId) => {
      Lt(DEFAULT_SURVEY_FOLLOWUP_CONFIG);
      Xt(false);
      mn();
      probabilityPassedRef.current = null;
      Mn(turn.getSnapshot().submitCount);
      let $r = surveyType === "session" ? getTranscriptShareGate() : null;
      io.current =
        $r === null
          ? null
          : {
              stays: $r,
              configProbability: config.probability,
              settingsRate,
              openedAtClock: clock.now(),
              submitCountWhenTypedOver: null,
              answer: null,
            };
      po($r === true);
      co(false);
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        ...surveyProbability(io.current),
        ...($r !== null && {
          draft_at_open: He.getState().value !== "",
        }),
        event_type: lit_2("appeared"),
        appearance_id: sanitizeMarkName(appearanceId),
        last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
        survey_type: fromEnum(surveyType),
        prompt_index: getPromptIndex(),
      });
      logOTelEvent("feedback_survey", {
        event_type: "appeared",
        appearance_id: appearanceId,
        survey_type: surveyType,
        enabled_via_override: isFeedbackSurveyForOtel(),
      });
    },
    [Mn, mn, surveyType, appStoreDirect, turn, transcript, clock, He, config.probability, settingsRate],
  );
  let onSelect = ce(
    (appearanceId, selected) => {
      let Yr = io.current;
      if (!answeredAfterTyping(Yr)) Mn(turn.getSnapshot().submitCount);
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        ...surveyProbability(Yr),
        event_type: lit_2("responded"),
        appearance_id: sanitizeMarkName(appearanceId),
        response: fromEnum(selected),
        last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
        survey_type: fromEnum(surveyType),
        prompt_index: getPromptIndex(),
        ...Yr?.answer?.ratedTurn,
      });
      logOTelEvent("feedback_survey", {
        event_type: "responded",
        appearance_id: appearanceId,
        response: selected,
        survey_type: surveyType,
        enabled_via_override: isFeedbackSurveyForOtel(),
      });
    },
    [Mn, surveyType, appStoreDirect, turn, transcript],
  );
  let shouldShowTranscriptPrompt = ce(
    (selected_0) => {
      let $r = io.current;
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        ...surveyProbability($r),
        ...($r && {
          ms_since_appeared: msSinceAppeared($r, clock.now()),
        }),
        event_type: lit_2("abandoned"),
        appearance_id: sanitizeMarkName(selected_0),
        last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
        survey_type: fromEnum(surveyType),
        prompt_index: getPromptIndex(),
      });
      logOTelEvent("feedback_survey", {
        event_type: "abandoned",
        appearance_id: selected_0,
        survey_type: surveyType,
        enabled_via_override: isFeedbackSurveyForOtel(),
      });
    },
    [surveyType, appStoreDirect, transcript, clock],
  );
  let shouldShowTranscriptPrompt_2 = ce(
    (selected) => {
      if (selected !== "bad" && selected !== "fine" && selected !== "good") return false;
      if (answeredAfterTyping(io.current)) return false;
      if (isEssentialTrafficOnly()) return false;
      if (!isPolicyAllowed_2("allow_product_feedback")) return false;
      if (feedbackMode().kind === "disabled") return false;
      if (isShareAlwaysAllowed()) return true;
      if (getGlobalConfig().transcriptShareDismissed) return false;
      let probability =
        selected === "bad"
          ? badTranscriptAskConfig.probability
          : selected === "fine"
            ? dynamicConfigValue.probability
            : goodTranscriptAskConfig.probability;
      return Math.random() <= probability;
    },
    [badTranscriptAskConfig.probability, dynamicConfigValue.probability, goodTranscriptAskConfig.probability],
  );
  let onTranscriptPromptShown = ce(
    (appearanceId, surveyResponse) => {
      let trigger = feedbackSurveyKindFor(surveyResponse);
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        event_type: lit_2("transcript_prompt_appeared"),
        appearance_id: sanitizeMarkName(appearanceId),
        last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
        survey_type: fromEnum(surveyType),
        trigger: fromEnum(trigger),
      });
      logOTelEvent("feedback_survey", {
        event_type: "transcript_prompt_appeared",
        appearance_id: appearanceId,
        survey_type: surveyType,
        enabled_via_override: isFeedbackSurveyForOtel(),
      });
    },
    [surveyType, appStoreDirect, transcript],
  );
  let onTranscriptSelect = ce(
    async (appearanceId, selected, surveyResponse) => {
      let trigger = feedbackSurveyKindFor(surveyResponse);
      if (!(selected === "yes" && probabilityPassedRef.current !== null))
        logEvent("tengu_feedback_survey_event", {
          ...effortLevelForAppState(appStoreDirect),
          event_type: fromEnum(`transcript_share_${selected}`),
          appearance_id: sanitizeMarkName(appearanceId),
          last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
          survey_type: fromEnum(surveyType),
          trigger: fromEnum(trigger),
        });
      if (selected === "dont_ask_again")
        await saveGlobalConfig(
          (current) => ({
            ...current,
            transcriptShareDismissed: true,
          }),
          storageV5,
        );
      if (selected === "yes") {
        let ms =
          probabilityPassedRef.current ?? transcriptSharePolicy(transcript.getSnapshot(), storageV5, host);
        probabilityPassedRef.current = null;
        let transcriptShare = await collectTranscriptShare(ms, trigger, appearanceId, credentials);
        logEvent("tengu_feedback_survey_event", {
          ...effortLevelForAppState(appStoreDirect),
          event_type: lit_2(
            transcriptShare.success ? "transcript_share_submitted" : "transcript_share_failed",
          ),
          appearance_id: sanitizeMarkName(appearanceId),
          trigger: fromEnum(trigger),
          error_code: transcriptShare.errorCode,
        });
        return transcriptShare;
      }
      return false;
    },
    [surveyType, storageV5, credentials, host, appStoreDirect, transcript],
  );
  let shouldShowFollowupPrompt = ce(
    (fr) => {
      if (fr === "dismissed") return false;
      let state = appStoreDirect.getState();
      let state_2 = He.getState();
      if (
        turn.getSnapshot().isLoading ||
        hasOpenDialogs(dialogStore.getState()) ||
        hasUnknownOtherKey(state.activeOverlays) ||
        state_2.active ||
        state_2.value.trim() !== ""
      )
        return false;
      if (!logEventTo1P()) return false;
      if (isFollowupAlwaysEnabled()) {
        Lt({
          ...DEFAULT_SURVEY_FOLLOWUP_CONFIG,
          enabled: true,
        });
        Xt(true);
        Wo();
        return true;
      }
      let Er =
        getFeatureValue_CACHED_MAY_BE_STALE(DEFAULT_FEEDBACK_SURVEY_CONFIG, DEFAULT_SURVEY_FOLLOWUP_CONFIG) ??
        {};
      let Vr = (maxChars, maxChars_2) =>
        typeof maxChars === "number" && Number.isFinite(maxChars) && maxChars > 0 ? maxChars : maxChars_2;
      let ms = (autoDismissAfterMs, autoDismissAfterMs_2) =>
        typeof autoDismissAfterMs === "number" &&
        Number.isFinite(autoDismissAfterMs) &&
        autoDismissAfterMs >= FOLLOWUP_RECENT_INPUT_MS
          ? autoDismissAfterMs
          : autoDismissAfterMs_2;
      let Xs = {
        enabled: Er.enabled === true,
        maxChars: Vr(Er.maxChars, DEFAULT_SURVEY_FOLLOWUP_CONFIG.maxChars),
        autoDismissAfterMs: ms(Er.autoDismissAfterMs, DEFAULT_SURVEY_FOLLOWUP_CONFIG.autoDismissAfterMs),
      };
      Lt(Xs);
      Xt(Xs.enabled === true);
      if (Xs.enabled === true) Wo();
      return Xs.enabled === true;
    },
    [turn, appStoreDirect, dialogStore, He, Wo],
  );
  let onFollowupPromptShown = ce(
    (fr, $r) => {
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        event_type: lit_2("followup_prompt_appeared"),
        appearance_id: sanitizeMarkName(fr),
        last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
        response: fromEnum($r),
        survey_type: fromEnum(surveyType),
      });
      logOTelEvent("feedback_survey", {
        event_type: "followup_prompt_appeared",
        appearance_id: fr,
        survey_type: surveyType,
        enabled_via_override: isFeedbackSurveyForOtel(),
      });
    },
    [surveyType, appStoreDirect, transcript],
  );
  let onTranscriptSelect_2 = ce(
    (appearanceId_2, selected_1, surveyResponse_0) => {
      if (selected_1.text === null) {
        logEvent("tengu_feedback_survey_event", {
          ...effortLevelForAppState(appStoreDirect),
          event_type: lit_2("followup_skipped"),
          appearance_id: sanitizeMarkName(appearanceId_2),
          skip_method: fromEnum(selected_1.method),
          response: fromEnumOpt(surveyResponse_0),
          survey_type: fromEnum(surveyType),
        });
        logOTelEvent("feedback_survey", {
          event_type: "followup_skipped",
          appearance_id: appearanceId_2,
          survey_type: surveyType,
          enabled_via_override: isFeedbackSurveyForOtel(),
        });
        mn();
        return;
      }
      let text = selected_1.text;
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        event_type: lit_2("followup_submitted"),
        appearance_id: sanitizeMarkName(appearanceId_2),
        char_count: fromNumber(Array.from(text).length),
        response: fromEnumOpt(surveyResponse_0),
        survey_type: fromEnum(surveyType),
      });
      logOTelEvent("feedback_survey", {
        event_type: "followup_submitted",
        appearance_id: appearanceId_2,
        survey_type: surveyType,
        enabled_via_override: isFeedbackSurveyForOtel(),
      });
      let messages = submitCountRef.current ?? transcript.getSnapshot();
      let lastInterruptedAssistantAPIMessageId = messagesRef.current;
      mn();
      return submitSurveyFollowup({
        description: text,
        appearanceId: appearanceId_2,
        surveyResponse: surveyResponse_0 ?? "bad",
        surveyType,
        messages,
        lastInterruptedAssistantAPIMessageId,
        credentials,
      })
        .then((current_0) => {
          logEvent("tengu_feedback_survey_event", {
            ...effortLevelForAppState(appStoreDirect),
            event_type: lit_2(current_0.success ? "followup_text_submitted" : "followup_text_failed"),
            appearance_id: sanitizeMarkName(appearanceId_2),
            ...(current_0.success
              ? {
                  feedback_id: sanitizeMarkName(current_0.feedbackId),
                }
              : {
                  error_code: sanitizeMarkName(current_0.failureReason ?? "unknown"),
                }),
            survey_type: fromEnum(surveyType),
          });
        })
        .catch(() => {});
    },
    [surveyType, mn, appStoreDirect, transcript, credentials],
  );
  let {
    state,
    lastResponse,
    appearanceId,
    transcriptBundlePath,
    open,
    abandon,
    handleSelect,
    handleUndo,
    handleTranscriptSelect,
    handleFollowupResolve,
    thanksFromFollowup,
    submittingShare,
  } = useSurveyState({
    otherSurveyActive,
    hideThanksAfterMs: config.hideThanksAfterMs,
    onOpen,
    onSelect,
    onAbandon: shouldShowTranscriptPrompt,
    shouldShowTranscriptPrompt: shouldShowTranscriptPrompt_2,
    onTranscriptPromptShown,
    onTranscriptSelect,
    onShareConsent: updateLastShownTime,
    shouldShowFollowupPrompt,
    onFollowupPromptShown,
    onFollowupResolve: onTranscriptSelect_2,
  });
  let handleSelect_2 = ce(
    (fr, $r) => {
      let Yr = io.current;
      if (Yr)
        Yr.answer = {
          response: fr,
          method: $r,
          msSinceAppeared: msSinceAppeared(Yr, clock.now()),
          ratedTurn: {
            effort_level: effortLevelForAppState(appStoreDirect).effort_level,
            last_assistant_message_id: sanitizeMarkName(getLastAssistantMessageId(transcript.getSnapshot())),
            prompt_index: getPromptIndex(),
          },
        };
      if ($r === "chord") logFeatureOk("feedback_survey_chord_rating");
      handleSelect(fr);
    },
    [clock, handleSelect, appStoreDirect, transcript],
  );
  let handleUndo_2 = ce(() => {
    if (!handleUndo()) return;
    let fr = io.current;
    if (fr?.answer) {
      logEvent("tengu_feedback_survey_event", {
        ...effortLevelForAppState(appStoreDirect),
        ...surveyProbability(fr),
        event_type: lit_2("undone"),
        appearance_id: sanitizeMarkName(appearanceId),
        response: fromEnum(fr.answer.response),
        survey_type: fromEnum(surveyType),
      });
      fr.answer = null;
    }
  }, [handleUndo, appStoreDirect, appearanceId, surveyType]);
  let Ur = ce(() => {
    let fr = io.current;
    if (!fr || answeredAfterTyping(fr)) return;
    fr.submitCountWhenTypedOver = turn.getSnapshot().submitCount;
    co(true);
    logEvent("tengu_feedback_survey_event", {
      ...effortLevelForAppState(appStoreDirect),
      ...surveyProbability(fr),
      ms_since_appeared: msSinceAppeared(fr, clock.now()),
      event_type: lit_2("typed_over"),
      appearance_id: sanitizeMarkName(appearanceId),
      survey_type: fromEnum(surveyType),
    });
  }, [appStoreDirect, clock, turn, appearanceId, surveyType]);
  let Zr = ao && (isLoading || submitCount !== io.current?.submitCountWhenTypedOver);
  P(() => {
    if (Zr && state === "open") abandon();
  }, [Zr, state, abandon]);
  let currentModel = getMainLoopModel();
  let isModelAllowed = Q(() => {
    if (config.onForModels.length === 0) return false;
    if (config.onForModels.includes("*")) return true;
    return config.onForModels.includes(currentModel);
  }, [config.onForModels, currentModel]);
  let shouldOpen = Q(() => {
    if (state !== "closed") return false;
    if (isLoading) return false;
    if (!delayedFlag) return false;
    if (active) return false;
    if (hn) return false;
    if (hasOpenDialog) return false;
    if (otherSurveyActive) return false;
    if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) return false;
    if (shouldSkipFeedbackSurvey()) return false;
    if (!isPolicyAllowed_2("allow_product_feedback")) return false;
    if (isEnvTruthy(process.env.CLAUDE_FORCE_DISPLAY_SURVEY) && !rt.timeLastShown) return true;
    if (!isModelAllowed) return false;
    let timeSinceLastShown = clock.now();
    if (rt.timeLastShownAtClock !== null) {
      if (timeSinceLastShown - rt.timeLastShownAtClock < config.minTimeBetweenFeedbackMs) return false;
      if (
        rt.submitCountAtLastAppearance !== null &&
        submitCount < rt.submitCountAtLastAppearance + config.minUserTurnsBetweenFeedback
      )
        return false;
    } else {
      if (timeSinceLastShown - sessionStartTime.current < config.minTimeBeforeFeedbackMs) return false;
      if (submitCount < submitCountAtSessionStart.current + config.minUserTurnsBeforeFeedback) return false;
    }
    if (lastEligibleSubmitCountRef.current !== submitCount) {
      lastEligibleSubmitCountRef.current = submitCount;
      probabilityPassedRef_2.current = Math.random() <= (settingsRate ?? config.probability);
    }
    if (!probabilityPassedRef_2.current) return false;
    let globalFeedbackState = getGlobalConfig().feedbackSurveyState;
    if (globalFeedbackState?.lastShownTime) {
      if (Date.now() - globalFeedbackState.lastShownTime < config.minTimeBetweenGlobalFeedbackMs)
        return false;
    }
    return true;
  }, [
    clock,
    state,
    isLoading,
    delayedFlag,
    active,
    hn,
    hasOpenDialog,
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
  P(() => {
    if (shouldOpen) open();
  }, [shouldOpen, open]);
  return {
    state,
    lastResponse,
    appearanceId,
    transcriptBundlePath,
    abandon,
    handleSelect: handleSelect_2,
    handleTypedOver: so ? Ur : undefined,
    typedOver: ao,
    turnMovedOn: Zr,
    handleUndo: handleUndo_2,
    handleTranscriptSelect,
    handleFollowupResolve,
    followupAskConfig: Dt,
    turnInProgress: isLoading,
    thanksFromFollowup,
    followupArmActive: oo,
    submittingShare,
  };
}
//@ chunk-0sfjpx19.js:134556-134912 fingerprint = DEFAULT_FEEDBACK_SURVEY_CONFIG (0.728)
var DEFAULT_FEEDBACK_SURVEY_CONFIG = "tengu_juniper_vale";
var TENGU_RUSSET_WHIMBREL = "tengu_russet_whimbrel";
var DEFAULT_SURVEY_TIMING = {
  minTimeBeforeFeedbackMs: 600000,
  minTimeBetweenFeedbackMs: 3600000,
  minTimeBetweenGlobalFeedbackMs: 1e8,
  minUserTurnsBeforeFeedback: 5,
  minUserTurnsBetweenFeedback: 10,
  hideThanksAfterMs: 5000,
  onForModels: ["*"],
  probability: 0.005,
};
var ZERO_PROBABILITY_CONFIG = {
  probability: 0,
};
var DEFAULT_SURVEY_FOLLOWUP_CONFIG = {
  enabled: false,
  maxChars: 500,
  autoDismissAfterMs: 30000,
};
//@ chunk-pzv0vqyf.js:1697-1755 fingerprint = DEFAULT_TRANSCRIPT_ASK_CONFIG (0.481)
var DEFAULT_TRANSCRIPT_ASK_CONFIG = {
  afterPromptCount: 5,
  probability: 0,
  maxImpressions: 3,
};
export {
  useFeedbackSurvey,
  DEFAULT_SURVEY_FOLLOWUP_CONFIG,
  TENGU_RUSSET_WHIMBREL,
  DEFAULT_TRANSCRIPT_ASK_CONFIG,
  DEFAULT_SURVEY_TIMING,
};
