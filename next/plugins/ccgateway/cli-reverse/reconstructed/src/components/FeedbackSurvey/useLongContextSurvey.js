/**
 * components/FeedbackSurvey/useLongContextSurvey.tsx
 *
 * 2.1.316 新增。长上下文体验调查 hook。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (7)
 * attribution: placement 7
 */
import {
  init_react_production,
  useState,
  useRef,
  useEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectIsLoading3, selectSubmitCount2, useSurveyState } from "./useSurveyState.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { env } from "../../utils/env.js";
import { getMaxCumulativeDroppedTokens } from "../../utils/tokens.js";
import { estimateTokensWithAnchor } from "../../services/compact/autoCompact.js";
import { getLastAssistantMessage } from "../../utils/messages.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:1050725-1050729 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1050725", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1068823-1069165 placement
var SURVEY_HIDE_THANKS_AFTER_MS = 5000;
var TENGU_LONG_CONTEXT_SURVEY_THRESHOLD = "tengu_long_context_survey_threshold";
var TENGU_LONG_CONTEXT_SURVEY_QUESTION_VARIANT = "tengu_long_context_survey_question_variant";
var TENGU_LONG_CONTEXT_SURVEY_TRIGGER_MODE = "tengu_long_context_survey_trigger_mode";
var TENGU_LONG_CONTEXT_SURVEY_PROBABILITY = "tengu_long_context_survey_probability";
var DEFAULT_SURVEY_PROBABILITY = 0.2;
var SURVEY_QUESTION_TEXT = {
  generic: undefined,
  instruction_following:
    "How well is Claude following the instructions you gave earlier in this conversation? (optional)",
};
//@ chunk-czq1j3j2.js:1069165-1069250 placement
function normalizeQuestionVariant(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE === "instruction_following" ? "instruction_following" : "generic";
}
//@ chunk-czq1j3j2.js:1069250-1069326 placement
function normalizeTriggerMode(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE === "virtual_context" ? "virtual_context" : "cumulative";
}
//@ chunk-czq1j3j2.js:1069326-1069433 placement
function parseProbability(featureValue_CACHED_MAY_BE_STALE) {
  let value = Number(featureValue_CACHED_MAY_BE_STALE);
  if (featureValue_CACHED_MAY_BE_STALE === "" || !Number.isFinite(value)) return DEFAULT_SURVEY_PROBABILITY;
  return Math.min(1, Math.max(0, value));
}
//@ chunk-czq1j3j2.js:1069433-1069517 placement
function parsePositiveInt(featureValue_CACHED_MAY_BE_STALE) {
  if (!/^\d+$/.test(featureValue_CACHED_MAY_BE_STALE)) return;
  let value = parseInt(featureValue_CACHED_MAY_BE_STALE, 10);
  return value > 0 ? value : undefined;
}
//@ chunk-czq1j3j2.js:1069517-1073292 placement
/**
 * useLongContextSurvey：长上下文使用后触发体验调查的 hook。
 */
function useLongContextSurvey(props) {
  let $ = useMemoCache(31);
  let { cumulativeSessionTokens, turn, transcript, hasActivePrompt, enabled, otherSurveyActive } = props;
  let hasActivePromptFlag = hasActivePrompt === undefined ? false : hasActivePrompt;
  let isEnabled = enabled === undefined ? true : enabled;
  let otherSurveyActiveFlag = otherSurveyActive === undefined ? false : otherSurveyActive;
  let storeSelector = useStoreSelector(turn, selectIsLoading3);
  let storeSelector_2 = useStoreSelector(turn, selectSubmitCount2);
  let messages = useStoreSelector(transcript);
  let [threshold, setThreshold] = useState(undefined);
  let [questionVariant, setQuestionVariant] = useState("generic");
  let [triggerMode, setTriggerMode] = useState("cumulative");
  let [surveyProbability, setSurveyProbability] = useState(DEFAULT_SURVEY_PROBABILITY);
  let triggeredRef = useRef(false);
  let storeSelectorRef = useRef(storeSelector_2);
  let lastTriggerRef = useRef(null);
  let onOpen;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    onOpen = (appearanceId) => {
      let triggerInfo = lastTriggerRef.current;
      logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("appeared"),
        question_variant: fromEnum(triggerInfo?.variant ?? "generic"),
        trigger_mode: fromEnum(triggerInfo?.triggerMode ?? "cumulative"),
        appearance_id: sanitizeMarkName(appearanceId),
        threshold: triggerInfo?.threshold,
        token_count_at_trigger: triggerInfo?.tokenCount,
        cumulative_tokens: triggerInfo?.cumulativeTokens,
        virtual_context_tokens: triggerInfo?.virtualContextTokens,
        survey_probability: triggerInfo?.surveyProbability,
        last_assistant_message_id: sanitizeMarkName(triggerInfo?.lastAssistantId),
      });
      logOTelEvent("feedback_survey", {
        event_type: "appeared",
        appearance_id: appearanceId,
        survey_type: "long_context",
      });
    };
    $[0] = onOpen;
  } else onOpen = $[0];
  let onOpen_2 = onOpen;
  let onSelect;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    onSelect = (appearanceId, response) => {
      let triggerInfo = lastTriggerRef.current;
      logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("responded"),
        question_variant: fromEnum(triggerInfo?.variant ?? "generic"),
        trigger_mode: fromEnum(triggerInfo?.triggerMode ?? "cumulative"),
        appearance_id: sanitizeMarkName(appearanceId),
        response: fromEnum(response),
        threshold: triggerInfo?.threshold,
        token_count_at_trigger: triggerInfo?.tokenCount,
        cumulative_tokens: triggerInfo?.cumulativeTokens,
        virtual_context_tokens: triggerInfo?.virtualContextTokens,
        survey_probability: triggerInfo?.surveyProbability,
        last_assistant_message_id: sanitizeMarkName(triggerInfo?.lastAssistantId),
      });
      logOTelEvent("feedback_survey", {
        event_type: "responded",
        appearance_id: appearanceId,
        response,
        survey_type: "long_context",
      });
    };
    $[1] = onSelect;
  } else onSelect = $[1];
  let onSelect_2 = onSelect;
  let onAbandon;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    onAbandon = (appearanceId) => {
      let triggerInfo = lastTriggerRef.current;
      logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("abandoned"),
        question_variant: fromEnum(triggerInfo?.variant ?? "generic"),
        trigger_mode: fromEnum(triggerInfo?.triggerMode ?? "cumulative"),
        appearance_id: sanitizeMarkName(appearanceId),
        threshold: triggerInfo?.threshold,
        token_count_at_trigger: triggerInfo?.tokenCount,
        cumulative_tokens: triggerInfo?.cumulativeTokens,
        virtual_context_tokens: triggerInfo?.virtualContextTokens,
        survey_probability: triggerInfo?.surveyProbability,
        last_assistant_message_id: sanitizeMarkName(triggerInfo?.lastAssistantId),
      });
      logOTelEvent("feedback_survey", {
        event_type: "abandoned",
        appearance_id: appearanceId,
        survey_type: "long_context",
      });
    };
    $[2] = onAbandon;
  } else onAbandon = $[2];
  let onAbandon_2 = onAbandon;
  let stateOptions;
  if ($[3] !== otherSurveyActiveFlag) {
    stateOptions = {
      hideThanksAfterMs: SURVEY_HIDE_THANKS_AFTER_MS,
      otherSurveyActive: otherSurveyActiveFlag,
      onOpen: onOpen_2,
      onSelect: onSelect_2,
      onAbandon: onAbandon_2,
    };
    $[3] = otherSurveyActiveFlag;
    $[4] = stateOptions;
  } else stateOptions = $[4];
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo } =
    useSurveyState(stateOptions);
  let loadConfigEffect;
  let loadConfigDeps;
  if ($[5] !== isEnabled) {
    loadConfigEffect = () => {
      if (!isEnabled) {
        return;
      }
      setThreshold(
        parsePositiveInt(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_THRESHOLD, "")),
      );
      setQuestionVariant(
        normalizeQuestionVariant(
          getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_QUESTION_VARIANT, ""),
        ),
      );
      setTriggerMode(
        normalizeTriggerMode(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_TRIGGER_MODE, "")),
      );
      setSurveyProbability(
        parseProbability(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_PROBABILITY, "")),
      );
    };
    loadConfigDeps = [isEnabled];
    $[5] = isEnabled;
    $[6] = loadConfigEffect;
    $[7] = loadConfigDeps;
  } else {
    loadConfigEffect = $[6];
    loadConfigDeps = $[7];
  }
  useEffect(loadConfigEffect, loadConfigDeps);
  let maybeTriggerEffect;
  let maybeTriggerDeps;
  if (
    $[8] !== cumulativeSessionTokens ||
    $[9] !== isEnabled ||
    $[10] !== hasActivePromptFlag ||
    $[11] !== storeSelector ||
    $[12] !== messages ||
    $[13] !== open ||
    $[14] !== otherSurveyActiveFlag ||
    $[15] !== state ||
    $[16] !== storeSelector_2 ||
    $[17] !== surveyProbability ||
    $[18] !== threshold ||
    $[19] !== triggerMode ||
    $[20] !== questionVariant
  ) {
    maybeTriggerEffect = () => {
      if (!isEnabled || triggeredRef.current) {
        return;
      }
      if (state !== "closed" || storeSelector || hasActivePromptFlag) {
        return;
      }
      if (threshold === undefined) {
        return;
      }
      if (shouldSkipFeedbackSurvey()) {
        return;
      }
      if (!isPolicyAllowed_2("allow_product_feedback")) {
        return;
      }
      if (env.CLAUDE_CODE_DISABLE_FEEDBACK_SURVEY) {
        return;
      }
      if (storeSelector_2 <= storeSelectorRef.current) {
        return;
      }
      let virtualContextTokens = getMaxCumulativeDroppedTokens(messages) + estimateTokensWithAnchor(messages);
      let triggerTokens = triggerMode === "virtual_context" ? virtualContextTokens : cumulativeSessionTokens;
      if (triggerTokens < threshold) {
        return;
      }
      if (otherSurveyActiveFlag) {
        return;
      }
      triggeredRef.current = true;
      lastTriggerRef.current = {
        threshold,
        tokenCount: triggerTokens,
        triggerMode,
        cumulativeTokens: cumulativeSessionTokens,
        virtualContextTokens,
        surveyProbability,
        variant: questionVariant,
        lastAssistantId: getLastAssistantMessage(messages)?.message?.id,
      };
      if (Math.random() < surveyProbability) open();
    };
    maybeTriggerDeps = [
      isEnabled,
      state,
      storeSelector,
      storeSelector_2,
      hasActivePromptFlag,
      otherSurveyActiveFlag,
      threshold,
      questionVariant,
      triggerMode,
      surveyProbability,
      cumulativeSessionTokens,
      messages,
      open,
    ];
    $[8] = cumulativeSessionTokens;
    $[9] = isEnabled;
    $[10] = hasActivePromptFlag;
    $[11] = storeSelector;
    $[12] = messages;
    $[13] = open;
    $[14] = otherSurveyActiveFlag;
    $[15] = state;
    $[16] = storeSelector_2;
    $[17] = surveyProbability;
    $[18] = threshold;
    $[19] = triggerMode;
    $[20] = questionVariant;
    $[21] = maybeTriggerEffect;
    $[22] = maybeTriggerDeps;
  } else {
    maybeTriggerEffect = $[21];
    maybeTriggerDeps = $[22];
  }
  useEffect(maybeTriggerEffect, maybeTriggerDeps);
  const question = SURVEY_QUESTION_TEXT[questionVariant];
  let props_2;
  if (
    $[23] !== abandon ||
    $[24] !== appearanceId ||
    $[25] !== handleSelect ||
    $[26] !== handleUndo ||
    $[27] !== lastResponse ||
    $[28] !== state ||
    $[29] !== question
  ) {
    props_2 = {
      state,
      lastResponse,
      appearanceId,
      question,
      abandon,
      handleSelect,
      handleUndo,
    };
    $[23] = abandon;
    $[24] = appearanceId;
    $[25] = handleSelect;
    $[26] = handleUndo;
    $[27] = lastResponse;
    $[28] = state;
    $[29] = question;
    $[30] = props_2;
  } else props_2 = $[30];
  return props_2;
}
export { useLongContextSurvey };
