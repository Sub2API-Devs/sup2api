/**
 * components/FeedbackSurvey/usePostCompactSurvey.tsx
 *
 * 压缩后调查：compact 边界后有新消息时显示，记录 tengu_post_compact_survey_event。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/usePostCompactSurvey.tsx
 * pieces: chunk-18hwfzwa.js (10)
 * attribution: fingerprint 4, layout 1, file-last-pair 1, file-local 1, callgraph-fingerprint 1, placement 2
 */
import { logEvent } from "../../services/analytics/index.js";
import { lit as lit_2, fromEnum } from "../../services/analytics/safeMetadata.js";
import { ye } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { isCompactBoundaryMessage } from "../../services/projects/threadRows.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, P, j } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useSurveyState } from "./useSurveyState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { env } from "../../utils/env.js";

//@ chunk-18hwfzwa.js:1081954-1082146 fingerprint = _temp (1)
function logPostCompactSurveyAppeared(appearanceId) {
  (logEvent("tengu_post_compact_survey_event", {
    event_type: lit_2("appeared"),
    appearance_id: ye(appearanceId),
  }),
    logOTelEvent("feedback_survey", {
      event_type: "appeared",
      appearance_id: appearanceId,
      survey_type: "post_compact",
    }));
}
//@ chunk-18hwfzwa.js:1082146-1082370 fingerprint = _temp2 (1)
function logPostCompactSurveyResponded(appearanceId_0, selected) {
  (logEvent("tengu_post_compact_survey_event", {
    event_type: lit_2("responded"),
    appearance_id: ye(appearanceId_0),
    response: fromEnum(selected),
  }),
    logOTelEvent("feedback_survey", {
      event_type: "responded",
      appearance_id: appearanceId_0,
      response: selected,
      survey_type: "post_compact",
    }));
}
//@ chunk-18hwfzwa.js:1082370-1082564 layout = _temp (0.826)
function logPostCompactSurveyAbandoned(appearanceId) {
  (logEvent("tengu_post_compact_survey_event", {
    event_type: lit_2("abandoned"),
    appearance_id: ye(appearanceId),
  }),
    logOTelEvent("feedback_survey", {
      event_type: "abandoned",
      appearance_id: appearanceId,
      survey_type: "post_compact",
    }));
}
//@ chunk-18hwfzwa.js:1082564-1082595 file-last-pair
function qSo(msg) {
  return isCompactBoundaryMessage(msg);
}
//@ chunk-18hwfzwa.js:1082595-1082627 file-local
function $So(msg_0) {
  return msg_0.uuid;
}
//@ chunk-18hwfzwa.js:1082627-1082680 fingerprint = POST_COMPACT_SURVEY_GATE (1)
var Nrt = 5000,
  TENGU_POST_COMPACT_SURVEY = "tengu_post_compact_survey",
  Frt = 0.2;
//@ chunk-18hwfzwa.js:1082680-1082861 callgraph-fingerprint = hasMessageAfterBoundary (1)
function hasMessageAfterBoundary(messages, boundaryUuid) {
  let boundaryIndex = messages.findIndex((msg) => msg.uuid === boundaryUuid);
  if (boundaryIndex === -1) return !1;
  for (let L = boundaryIndex + 1; L < messages.length; L++) {
    let msg = messages[L];
    if (msg && (msg.type === "user" || msg.type === "assistant")) return !0;
  }
  return !1;
}
//@ chunk-18hwfzwa.js:1082861-1084481 fingerprint = usePostCompactSurvey (0.665)
function usePostCompactSurvey(messages, isLoading, t0, t1) {
  let $ = w(26),
    ee = t0 === void 0 ? !1 : t0,
    Re;
  if ($[0] !== t1) ((Re = t1 === void 0 ? {} : t1), ($[0] = t1), ($[1] = Re));
  else Re = $[1];
  let { enabled: t3 } = Re,
    He = t3 === void 0 ? !0 : t3,
    [We, ze] = y(null),
    Xe;
  if ($[2] === MEMO_CACHE_SENTINEL) ((Xe = new Set()), ($[2] = Xe));
  else Xe = $[2];
  let seenCompactBoundaries = R(Xe),
    pendingCompactBoundaryUuid = R(null),
    At = logPostCompactSurveyAppeared,
    It = logPostCompactSurveyResponded,
    Ot = logPostCompactSurveyAbandoned,
    Et;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((Et = { hideThanksAfterMs: Nrt, onOpen: At, onSelect: It, onAbandon: Ot }), ($[3] = Et));
  else Et = $[3];
  let {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      open: open,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
    } = useSurveyState(Et),
    ao,
    co;
  if ($[4] !== He)
    ((ao = () => {
      if (!He) {
        return;
      }
      ze(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_POST_COMPACT_SURVEY, !1));
    }),
      (co = [He]),
      ($[4] = He),
      ($[5] = ao),
      ($[6] = co));
  else ((ao = $[5]), (co = $[6]));
  P(ao, co);
  let bo;
  if ($[7] !== messages) ((bo = new Set(messages.filter(qSo).map($So))), ($[7] = messages), ($[8] = bo));
  else bo = $[8];
  let Ao = bo,
    Bo,
    Ro;
  if (
    $[9] !== Ao ||
    $[10] !== He ||
    $[11] !== We ||
    $[12] !== ee ||
    $[13] !== isLoading ||
    $[14] !== messages ||
    $[15] !== open ||
    $[16] !== state
  )
    ((Ro = () => {
      if (!He) {
        return;
      }
      if (state !== "closed" || isLoading) {
        return;
      }
      if (ee) {
        return;
      }
      if (We !== !0) {
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
      let newBoundaries = Array.from(Ao).filter((uuid) => !seenCompactBoundaries.current.has(uuid));
      if (newBoundaries.length > 0)
        ((seenCompactBoundaries.current = new Set(Ao)),
          (pendingCompactBoundaryUuid.current = newBoundaries.at(-1)));
      if (
        pendingCompactBoundaryUuid.current !== null &&
        hasMessageAfterBoundary(messages, pendingCompactBoundaryUuid.current)
      ) {
        if (((pendingCompactBoundaryUuid.current = null), Math.random() < Frt)) open();
      }
    }),
      (Bo = [He, Ao, state, isLoading, ee, We, messages, open]),
      ($[9] = Ao),
      ($[10] = He),
      ($[11] = We),
      ($[12] = ee),
      ($[13] = isLoading),
      ($[14] = messages),
      ($[15] = open),
      ($[16] = state),
      ($[17] = Bo),
      ($[18] = Ro));
  else ((Bo = $[17]), (Ro = $[18]));
  P(Ro, Bo);
  let Wo;
  if (
    $[19] !== abandon ||
    $[20] !== appearanceId ||
    $[21] !== handleSelect ||
    $[22] !== handleUndo ||
    $[23] !== lastResponse ||
    $[24] !== state
  )
    ((Wo = {
      state: state,
      lastResponse: lastResponse,
      appearanceId: appearanceId,
      abandon: abandon,
      handleSelect: handleSelect,
      handleUndo: handleUndo,
    }),
      ($[19] = abandon),
      ($[20] = appearanceId),
      ($[21] = handleSelect),
      ($[22] = handleUndo),
      ($[23] = lastResponse),
      ($[24] = state),
      ($[25] = Wo));
  else Wo = $[25];
  return Wo;
}
//@ chunk-18hwfzwa.js:1084481-1084485 placement
j();
//@ chunk-18hwfzwa.js:1084485-1084489 placement
j();

export { usePostCompactSurvey };
