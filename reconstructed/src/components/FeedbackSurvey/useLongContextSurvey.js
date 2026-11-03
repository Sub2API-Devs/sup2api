/**
 * components/FeedbackSurvey/useLongContextSurvey.tsx
 *
 * 2.1.316 新增。长上下文体验调查 hook。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (7)
 * attribution: placement 7
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useStoreSelector } from "../../hooks/useStoreSelector.js";
import { selectIsLoading3, selectSubmitCount2, useSurveyState } from "./useSurveyState.js";
import { y, R, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-18hwfzwa.js:1034794-1035136 placement
var LONG_CONTEXT_SURVEY_FLAGS = 5000;
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
//@ chunk-18hwfzwa.js:1035136-1035221 placement
function normalizeQuestionVariant(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE === "instruction_following" ? "instruction_following" : "generic";
}
//@ chunk-18hwfzwa.js:1035221-1035297 placement
function normalizeTriggerMode(featureValue_CACHED_MAY_BE_STALE) {
  return featureValue_CACHED_MAY_BE_STALE === "virtual_context" ? "virtual_context" : "cumulative";
}
//@ chunk-18hwfzwa.js:1035297-1035404 placement
function parseProbability(featureValue_CACHED_MAY_BE_STALE) {
  let x = Number(featureValue_CACHED_MAY_BE_STALE);
  if (featureValue_CACHED_MAY_BE_STALE === "" || !Number.isFinite(x)) return DEFAULT_SURVEY_PROBABILITY;
  return Math.min(1, Math.max(0, x));
}
//@ chunk-18hwfzwa.js:1035404-1035488 placement
function parsePositiveInt(featureValue_CACHED_MAY_BE_STALE) {
  if (!/^\d+$/.test(featureValue_CACHED_MAY_BE_STALE)) return;
  let x = parseInt(featureValue_CACHED_MAY_BE_STALE, 10);
  return x > 0 ? x : undefined;
}
//@ chunk-18hwfzwa.js:1035488-1039263 placement
/**
 * useLongContextSurvey：长上下文使用后触发体验调查的 hook。
 */
function useLongContextSurvey(props) {
  let $ = w(31);
  let { cumulativeSessionTokens, turn, transcript, hasActivePrompt, enabled, otherSurveyActive } = props;
  let Be = hasActivePrompt === undefined ? false : hasActivePrompt;
  let He = enabled === undefined ? true : enabled;
  let We = otherSurveyActive === undefined ? false : otherSurveyActive;
  let storeSelector = useStoreSelector(turn, selectIsLoading3);
  let storeSelector_2 = useStoreSelector(turn, selectSubmitCount2);
  let storeSelector_3 = useStoreSelector(transcript);
  let [kt, At] = y(undefined);
  let [It, Ot] = y("generic");
  let [Et, Dt] = y("cumulative");
  let [Lt, oo] = y(DEFAULT_SURVEY_PROBABILITY);
  let Xt = R(false);
  let storeSelectorRef = R(storeSelector_2);
  let so = R(null);
  let ao;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ao = (co) => {
      let bo = so.current;
      logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("appeared"),
        question_variant: fromEnum(bo?.variant ?? "generic"),
        trigger_mode: fromEnum(bo?.triggerMode ?? "cumulative"),
        appearance_id: sanitizeMarkName(co),
        threshold: bo?.threshold,
        token_count_at_trigger: bo?.tokenCount,
        cumulative_tokens: bo?.cumulativeTokens,
        virtual_context_tokens: bo?.virtualContextTokens,
        survey_probability: bo?.surveyProbability,
        last_assistant_message_id: sanitizeMarkName(bo?.lastAssistantId),
      });
      logOTelEvent("feedback_survey", {
        event_type: "appeared",
        appearance_id: co,
        survey_type: "long_context",
      });
    };
    $[0] = ao;
  } else ao = $[0];
  let onOpen = ao;
  let Bo;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    Bo = (Ro, Ho) => {
      let Io = so.current;
      logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("responded"),
        question_variant: fromEnum(Io?.variant ?? "generic"),
        trigger_mode: fromEnum(Io?.triggerMode ?? "cumulative"),
        appearance_id: sanitizeMarkName(Ro),
        response: fromEnum(Ho),
        threshold: Io?.threshold,
        token_count_at_trigger: Io?.tokenCount,
        cumulative_tokens: Io?.cumulativeTokens,
        virtual_context_tokens: Io?.virtualContextTokens,
        survey_probability: Io?.surveyProbability,
        last_assistant_message_id: sanitizeMarkName(Io?.lastAssistantId),
      });
      logOTelEvent("feedback_survey", {
        event_type: "responded",
        appearance_id: Ro,
        response: Ho,
        survey_type: "long_context",
      });
    };
    $[1] = Bo;
  } else Bo = $[1];
  let onSelect = Bo;
  let mn;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    mn = (Cn) => {
      let No = so.current;
      logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("abandoned"),
        question_variant: fromEnum(No?.variant ?? "generic"),
        trigger_mode: fromEnum(No?.triggerMode ?? "cumulative"),
        appearance_id: sanitizeMarkName(Cn),
        threshold: No?.threshold,
        token_count_at_trigger: No?.tokenCount,
        cumulative_tokens: No?.cumulativeTokens,
        virtual_context_tokens: No?.virtualContextTokens,
        survey_probability: No?.surveyProbability,
        last_assistant_message_id: sanitizeMarkName(No?.lastAssistantId),
      });
      logOTelEvent("feedback_survey", {
        event_type: "abandoned",
        appearance_id: Cn,
        survey_type: "long_context",
      });
    };
    $[2] = mn;
  } else mn = $[2];
  let onAbandon = mn;
  let Yo;
  if ($[3] !== We) {
    Yo = {
      hideThanksAfterMs: LONG_CONTEXT_SURVEY_FLAGS,
      otherSurveyActive: We,
      onOpen,
      onSelect,
      onAbandon,
    };
    $[3] = We;
    $[4] = Yo;
  } else Yo = $[4];
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo } = useSurveyState(Yo);
  let Sn;
  let $n;
  if ($[5] !== He) {
    Sn = () => {
      if (!He) {
        return;
      }
      At(parsePositiveInt(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_THRESHOLD, "")));
      Ot(
        normalizeQuestionVariant(
          getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_QUESTION_VARIANT, ""),
        ),
      );
      Dt(
        normalizeTriggerMode(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_TRIGGER_MODE, "")),
      );
      oo(parseProbability(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_PROBABILITY, "")));
    };
    $n = [He];
    $[5] = He;
    $[6] = Sn;
    $[7] = $n;
  } else {
    Sn = $[6];
    $n = $[7];
  }
  P(Sn, $n);
  let on;
  let _o;
  if (
    $[8] !== cumulativeSessionTokens ||
    $[9] !== He ||
    $[10] !== Be ||
    $[11] !== storeSelector ||
    $[12] !== storeSelector_3 ||
    $[13] !== open ||
    $[14] !== We ||
    $[15] !== state ||
    $[16] !== storeSelector_2 ||
    $[17] !== Lt ||
    $[18] !== kt ||
    $[19] !== Et ||
    $[20] !== It
  ) {
    on = () => {
      if (!He || Xt.current) {
        return;
      }
      if (state !== "closed" || storeSelector || Be) {
        return;
      }
      if (kt === undefined) {
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
      let cn = getMaxCumulativeDroppedTokens(storeSelector_3) + estimateTokensWithAnchor(storeSelector_3);
      let Dn = Et === "virtual_context" ? cn : cumulativeSessionTokens;
      if (Dn < kt) {
        return;
      }
      if (We) {
        return;
      }
      Xt.current = true;
      so.current = {
        threshold: kt,
        tokenCount: Dn,
        triggerMode: Et,
        cumulativeTokens: cumulativeSessionTokens,
        virtualContextTokens: cn,
        surveyProbability: Lt,
        variant: It,
        lastAssistantId: getLastAssistantMessage(storeSelector_3)?.message?.id,
      };
      if (Math.random() < Lt) open();
    };
    _o = [
      He,
      state,
      storeSelector,
      storeSelector_2,
      Be,
      We,
      kt,
      It,
      Et,
      Lt,
      cumulativeSessionTokens,
      storeSelector_3,
      open,
    ];
    $[8] = cumulativeSessionTokens;
    $[9] = He;
    $[10] = Be;
    $[11] = storeSelector;
    $[12] = storeSelector_3;
    $[13] = open;
    $[14] = We;
    $[15] = state;
    $[16] = storeSelector_2;
    $[17] = Lt;
    $[18] = kt;
    $[19] = Et;
    $[20] = It;
    $[21] = on;
    $[22] = _o;
  } else {
    on = $[21];
    _o = $[22];
  }
  P(on, _o);
  const question = SURVEY_QUESTION_TEXT[It];
  let mr;
  if (
    $[23] !== abandon ||
    $[24] !== appearanceId ||
    $[25] !== handleSelect ||
    $[26] !== handleUndo ||
    $[27] !== lastResponse ||
    $[28] !== state ||
    $[29] !== question
  ) {
    mr = {
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
    $[30] = mr;
  } else mr = $[30];
  return mr;
}
//@ chunk-18hwfzwa.js:1039263-1039267 placement
init_react_production();
export { useLongContextSurvey };
