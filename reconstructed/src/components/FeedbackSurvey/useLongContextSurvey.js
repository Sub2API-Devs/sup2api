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
import { y, R, P, j } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { env } from "../../utils/env.js";
import { getMaxCumulativeDroppedTokens } from "../../utils/tokens.js";
import { Tp } from "../../services/compact/autoCompact.js";
import { getLastAssistantMessage } from "../../utils/messages.js";

//@ chunk-18hwfzwa.js:1034794-1035136 placement
var LONG_CONTEXT_SURVEY_FLAGS = 5000,
  TENGU_LONG_CONTEXT_SURVEY_THRESHOLD = "tengu_long_context_survey_threshold",
  got = "tengu_long_context_survey_question_variant",
  TENGU_LONG_CONTEXT_SURVEY_TRIGGER_MODE = "tengu_long_context_survey_trigger_mode",
  TENGU_LONG_CONTEXT_SURVEY_PROBABILITY = "tengu_long_context_survey_probability",
  Ave = 0.2,
  bot = {
    generic: void 0,
    instruction_following:
      "How well is Claude following the instructions you gave earlier in this conversation? (optional)",
  };
//@ chunk-18hwfzwa.js:1035136-1035221 placement
function wot(h) {
  return h === "instruction_following" ? "instruction_following" : "generic";
}
//@ chunk-18hwfzwa.js:1035221-1035297 placement
function kot(h) {
  return h === "virtual_context" ? "virtual_context" : "cumulative";
}
//@ chunk-18hwfzwa.js:1035297-1035404 placement
function parseProbability(h) {
  let x = Number(h);
  if (h === "" || !Number.isFinite(x)) return Ave;
  return Math.min(1, Math.max(0, x));
}
//@ chunk-18hwfzwa.js:1035404-1035488 placement
function Cot(h) {
  if (!/^\d+$/.test(h)) return;
  let x = parseInt(h, 10);
  return x > 0 ? x : void 0;
}
/**
 * useLongContextSurvey：长上下文使用后触发体验调查的 hook。
 */
//@ chunk-18hwfzwa.js:1035488-1039263 placement
function useLongContextSurvey(h) {
  let $ = w(31),
    {
      cumulativeSessionTokens: cumulativeSessionTokens,
      turn: turn,
      transcript: transcript,
      hasActivePrompt: hasActivePrompt,
      enabled: enabled,
      otherSurveyActive: otherSurveyActive,
    } = h,
    Be = hasActivePrompt === void 0 ? !1 : hasActivePrompt,
    He = enabled === void 0 ? !0 : enabled,
    We = otherSurveyActive === void 0 ? !1 : otherSurveyActive,
    ze = useStoreSelector(turn, selectIsLoading3),
    Xe = useStoreSelector(turn, selectSubmitCount2),
    rt = useStoreSelector(transcript),
    [kt, At] = y(void 0),
    [It, Ot] = y("generic"),
    [Et, Dt] = y("cumulative"),
    [Lt, oo] = y(Ave),
    Xt = R(!1),
    io = R(Xe),
    so = R(null),
    ao;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ao = (co) => {
      let bo = so.current;
      (logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("appeared"),
        question_variant: fromEnum(bo?.variant ?? "generic"),
        trigger_mode: fromEnum(bo?.triggerMode ?? "cumulative"),
        appearance_id: ye(co),
        threshold: bo?.threshold,
        token_count_at_trigger: bo?.tokenCount,
        cumulative_tokens: bo?.cumulativeTokens,
        virtual_context_tokens: bo?.virtualContextTokens,
        survey_probability: bo?.surveyProbability,
        last_assistant_message_id: ye(bo?.lastAssistantId),
      }),
        logOTelEvent("feedback_survey", {
          event_type: "appeared",
          appearance_id: co,
          survey_type: "long_context",
        }));
    }),
      ($[0] = ao));
  else ao = $[0];
  let Ao = ao,
    Bo;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((Bo = (Ro, Ho) => {
      let Io = so.current;
      (logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("responded"),
        question_variant: fromEnum(Io?.variant ?? "generic"),
        trigger_mode: fromEnum(Io?.triggerMode ?? "cumulative"),
        appearance_id: ye(Ro),
        response: fromEnum(Ho),
        threshold: Io?.threshold,
        token_count_at_trigger: Io?.tokenCount,
        cumulative_tokens: Io?.cumulativeTokens,
        virtual_context_tokens: Io?.virtualContextTokens,
        survey_probability: Io?.surveyProbability,
        last_assistant_message_id: ye(Io?.lastAssistantId),
      }),
        logOTelEvent("feedback_survey", {
          event_type: "responded",
          appearance_id: Ro,
          response: Ho,
          survey_type: "long_context",
        }));
    }),
      ($[1] = Bo));
  else Bo = $[1];
  let Wo = Bo,
    mn;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((mn = (Cn) => {
      let No = so.current;
      (logEvent("tengu_long_context_survey_event", {
        event_type: lit_2("abandoned"),
        question_variant: fromEnum(No?.variant ?? "generic"),
        trigger_mode: fromEnum(No?.triggerMode ?? "cumulative"),
        appearance_id: ye(Cn),
        threshold: No?.threshold,
        token_count_at_trigger: No?.tokenCount,
        cumulative_tokens: No?.cumulativeTokens,
        virtual_context_tokens: No?.virtualContextTokens,
        survey_probability: No?.surveyProbability,
        last_assistant_message_id: ye(No?.lastAssistantId),
      }),
        logOTelEvent("feedback_survey", {
          event_type: "abandoned",
          appearance_id: Cn,
          survey_type: "long_context",
        }));
    }),
      ($[2] = mn));
  else mn = $[2];
  let vo = mn,
    Yo;
  if ($[3] !== We)
    ((Yo = {
      hideThanksAfterMs: LONG_CONTEXT_SURVEY_FLAGS,
      otherSurveyActive: We,
      onOpen: Ao,
      onSelect: Wo,
      onAbandon: vo,
    }),
      ($[3] = We),
      ($[4] = Yo));
  else Yo = $[4];
  let {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      open: open,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
    } = useSurveyState(Yo),
    Sn,
    $n;
  if ($[5] !== He)
    ((Sn = () => {
      if (!He) {
        return;
      }
      (At(Cot(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_THRESHOLD, ""))),
        Ot(wot(getFeatureValue_CACHED_MAY_BE_STALE(got, ""))),
        Dt(kot(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_TRIGGER_MODE, ""))),
        oo(parseProbability(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_LONG_CONTEXT_SURVEY_PROBABILITY, ""))));
    }),
      ($n = [He]),
      ($[5] = He),
      ($[6] = Sn),
      ($[7] = $n));
  else ((Sn = $[6]), ($n = $[7]));
  P(Sn, $n);
  let on, _o;
  if (
    $[8] !== cumulativeSessionTokens ||
    $[9] !== He ||
    $[10] !== Be ||
    $[11] !== ze ||
    $[12] !== rt ||
    $[13] !== open ||
    $[14] !== We ||
    $[15] !== state ||
    $[16] !== Xe ||
    $[17] !== Lt ||
    $[18] !== kt ||
    $[19] !== Et ||
    $[20] !== It
  )
    ((on = () => {
      if (!He || Xt.current) {
        return;
      }
      if (state !== "closed" || ze || Be) {
        return;
      }
      if (kt === void 0) {
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
      if (Xe <= io.current) {
        return;
      }
      let cn = getMaxCumulativeDroppedTokens(rt) + Tp(rt);
      let Dn = Et === "virtual_context" ? cn : cumulativeSessionTokens;
      if (Dn < kt) {
        return;
      }
      if (We) {
        return;
      }
      if (
        ((Xt.current = !0),
        (so.current = {
          threshold: kt,
          tokenCount: Dn,
          triggerMode: Et,
          cumulativeTokens: cumulativeSessionTokens,
          virtualContextTokens: cn,
          surveyProbability: Lt,
          variant: It,
          lastAssistantId: getLastAssistantMessage(rt)?.message?.id,
        }),
        Math.random() < Lt)
      )
        open();
    }),
      (_o = [He, state, ze, Xe, Be, We, kt, It, Et, Lt, cumulativeSessionTokens, rt, open]),
      ($[8] = cumulativeSessionTokens),
      ($[9] = He),
      ($[10] = Be),
      ($[11] = ze),
      ($[12] = rt),
      ($[13] = open),
      ($[14] = We),
      ($[15] = state),
      ($[16] = Xe),
      ($[17] = Lt),
      ($[18] = kt),
      ($[19] = Et),
      ($[20] = It),
      ($[21] = on),
      ($[22] = _o));
  else ((on = $[21]), (_o = $[22]));
  P(on, _o);
  const wn = bot[It];
  let mr;
  if (
    $[23] !== abandon ||
    $[24] !== appearanceId ||
    $[25] !== handleSelect ||
    $[26] !== handleUndo ||
    $[27] !== lastResponse ||
    $[28] !== state ||
    $[29] !== wn
  )
    ((mr = {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      question: wn,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
    }),
      ($[23] = abandon),
      ($[24] = appearanceId),
      ($[25] = handleSelect),
      ($[26] = handleUndo),
      ($[27] = lastResponse),
      ($[28] = state),
      ($[29] = wn),
      ($[30] = mr));
  else mr = $[30];
  return mr;
}
//@ chunk-18hwfzwa.js:1039263-1039267 placement
j();

export { useLongContextSurvey };
