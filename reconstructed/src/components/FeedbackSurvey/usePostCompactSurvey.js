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
import { sanitizeMarkName } from "../../utils/startupMarks.js";
import { logOTelEvent } from "../../utils/telemetry/events.js";
import { isCompactBoundaryMessage as isCompactBoundaryMessage_2 } from "../../services/projects/threadRows.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { y, R, P, init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useSurveyState } from "./useSurveyState.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { shouldSkipFeedbackSurvey } from "../../utils/hostEnvironment.js";
import { isPolicyAllowed as isPolicyAllowed_2 } from "../../services/policyLimits/policyEvidence.js";
import { env } from "../../utils/env.js";

//@ chunk-18hwfzwa.js:1081954-1082146 fingerprint = _temp (1)
function logPostCompactSurveyAppeared(appearanceId) {
  logEvent("tengu_post_compact_survey_event", {
    event_type: lit_2("appeared"),
    appearance_id: sanitizeMarkName(appearanceId),
  });
  logOTelEvent("feedback_survey", {
    event_type: "appeared",
    appearance_id: appearanceId,
    survey_type: "post_compact",
  });
}
//@ chunk-18hwfzwa.js:1082146-1082370 fingerprint = _temp2 (1)
function logPostCompactSurveyResponded(appearanceId, selected) {
  logEvent("tengu_post_compact_survey_event", {
    event_type: lit_2("responded"),
    appearance_id: sanitizeMarkName(appearanceId),
    response: fromEnum(selected),
  });
  logOTelEvent("feedback_survey", {
    event_type: "responded",
    appearance_id: appearanceId,
    response: selected,
    survey_type: "post_compact",
  });
}
//@ chunk-18hwfzwa.js:1082370-1082564 layout = _temp (0.826)
function logPostCompactSurveyAbandoned(appearanceId) {
  logEvent("tengu_post_compact_survey_event", {
    event_type: lit_2("abandoned"),
    appearance_id: sanitizeMarkName(appearanceId),
  });
  logOTelEvent("feedback_survey", {
    event_type: "abandoned",
    appearance_id: appearanceId,
    survey_type: "post_compact",
  });
}
//@ chunk-18hwfzwa.js:1082564-1082595 file-last-pair
function isCompactBoundaryMessage(msg) {
  return isCompactBoundaryMessage_2(msg);
}
//@ chunk-18hwfzwa.js:1082595-1082627 file-local
function messageUuidOf(msg) {
  return msg.uuid;
}
//@ chunk-18hwfzwa.js:1082627-1082680 fingerprint = POST_COMPACT_SURVEY_GATE (1)
var HIDE_THANKS_AFTER_MS = 5000;
var TENGU_POST_COMPACT_SURVEY = "tengu_post_compact_survey";
var POST_COMPACT_SURVEY_PROBABILITY = 0.2;
//@ chunk-18hwfzwa.js:1082680-1082861 callgraph-fingerprint = hasMessageAfterBoundary (1)
function hasMessageAfterBoundary(messages, boundaryUuid) {
  let boundaryIndex = messages.findIndex((msg) => msg.uuid === boundaryUuid);
  if (boundaryIndex === -1) return false;
  for (let i = boundaryIndex + 1; i < messages.length; i++) {
    let msg = messages[i];
    if (msg && (msg.type === "user" || msg.type === "assistant")) return true;
  }
  return false;
}
//@ chunk-18hwfzwa.js:1082861-1084481 fingerprint = usePostCompactSurvey (0.665)
function usePostCompactSurvey(messages, isLoading, t0, t1) {
  let $ = w(26);
  let hasActivePrompt = t0 === undefined ? false : t0;
  let t2;
  if ($[0] !== t1) {
    t2 = t1 === undefined ? {} : t1;
    $[0] = t1;
    $[1] = t2;
  } else t2 = $[1];
  let { enabled } = t2;
  let enabled_2 = enabled === undefined ? true : enabled;
  let [gateEnabled, setGateEnabled] = y(null);
  let t4;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t4 = new Set();
    $[2] = t4;
  } else t4 = $[2];
  let seenCompactBoundaries = R(t4);
  let pendingCompactBoundaryUuid = R(null);
  let onOpen = logPostCompactSurveyAppeared;
  let onSelect = logPostCompactSurveyResponded;
  let onAbandon = logPostCompactSurveyAbandoned;
  let t5;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    t5 = {
      hideThanksAfterMs: HIDE_THANKS_AFTER_MS,
      onOpen,
      onSelect,
      onAbandon,
    };
    $[3] = t5;
  } else t5 = $[3];
  let { state, lastResponse, appearanceId, open, abandon, handleSelect, handleUndo } = useSurveyState(t5);
  let t6;
  let t7;
  if ($[4] !== enabled_2) {
    t6 = () => {
      if (!enabled_2) {
        return;
      }
      setGateEnabled(getFeatureValue_CACHED_MAY_BE_STALE(TENGU_POST_COMPACT_SURVEY, false));
    };
    t7 = [enabled_2];
    $[4] = enabled_2;
    $[5] = t6;
    $[6] = t7;
  } else {
    t6 = $[5];
    t7 = $[6];
  }
  P(t6, t7);
  let t8;
  if ($[7] !== messages) {
    t8 = new Set(messages.filter(isCompactBoundaryMessage).map(messageUuidOf));
    $[7] = messages;
    $[8] = t8;
  } else t8 = $[8];
  let currentCompactBoundaries = t8;
  let t10;
  let t9;
  if (
    $[9] !== currentCompactBoundaries ||
    $[10] !== enabled_2 ||
    $[11] !== gateEnabled ||
    $[12] !== hasActivePrompt ||
    $[13] !== isLoading ||
    $[14] !== messages ||
    $[15] !== open ||
    $[16] !== state
  ) {
    t9 = () => {
      if (!enabled_2) {
        return;
      }
      if (state !== "closed" || isLoading) {
        return;
      }
      if (hasActivePrompt) {
        return;
      }
      if (gateEnabled !== true) {
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
      let newBoundaries = Array.from(currentCompactBoundaries).filter(
        (uuid) => !seenCompactBoundaries.current.has(uuid),
      );
      if (newBoundaries.length > 0) {
        seenCompactBoundaries.current = new Set(currentCompactBoundaries);
        pendingCompactBoundaryUuid.current = newBoundaries.at(-1);
      }
      if (
        pendingCompactBoundaryUuid.current !== null &&
        hasMessageAfterBoundary(messages, pendingCompactBoundaryUuid.current)
      ) {
        pendingCompactBoundaryUuid.current = null;
        if (Math.random() < POST_COMPACT_SURVEY_PROBABILITY) open();
      }
    };
    t10 = [
      enabled_2,
      currentCompactBoundaries,
      state,
      isLoading,
      hasActivePrompt,
      gateEnabled,
      messages,
      open,
    ];
    $[9] = currentCompactBoundaries;
    $[10] = enabled_2;
    $[11] = gateEnabled;
    $[12] = hasActivePrompt;
    $[13] = isLoading;
    $[14] = messages;
    $[15] = open;
    $[16] = state;
    $[17] = t10;
    $[18] = t9;
  } else {
    t10 = $[17];
    t9 = $[18];
  }
  P(t9, t10);
  let t11;
  if (
    $[19] !== abandon ||
    $[20] !== appearanceId ||
    $[21] !== handleSelect ||
    $[22] !== handleUndo ||
    $[23] !== lastResponse ||
    $[24] !== state
  ) {
    t11 = {
      state,
      lastResponse,
      appearanceId,
      abandon,
      handleSelect,
      handleUndo,
    };
    $[19] = abandon;
    $[20] = appearanceId;
    $[21] = handleSelect;
    $[22] = handleUndo;
    $[23] = lastResponse;
    $[24] = state;
    $[25] = t11;
  } else t11 = $[25];
  return t11;
}
//@ chunk-18hwfzwa.js:1084481-1084485 placement
init_react_production();
//@ chunk-18hwfzwa.js:1084485-1084489 placement
init_react_production();
export { usePostCompactSurvey };
