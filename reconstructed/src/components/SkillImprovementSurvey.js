/**
 * components/SkillImprovementSurvey.tsx
 *
 * 技能改进/记忆召回质量的简短调查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/SkillImprovementSurvey.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useAppState } from "../state/AppState.js";
import { truncateToLines } from "../utils/stringUtils.js";
import { y$, MEMORY_SURVEY_HEADER, t4 } from "./FeedbackSurvey/useMemorySurvey.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { e, r, Fragment } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { FeedbackSurveyView } from "./FeedbackSurvey/FeedbackSurveyView.js";

//@ chunk-18hwfzwa.js:993905-993940 placement
function selectVerbose_2(It) {
  return It.verbose;
}
//@ chunk-18hwfzwa.js:994017-994730 fingerprint = SkillImprovementSurvey (0.325)
function SkillImprovementSurvey(t0) {
  let $ = w(12),
    {
      citation: citation,
      onSelect: onSelect,
      inputValue: inputValue,
      setInputValue: setInputValue,
      mountDelayMs: mountDelayMs,
    } = t0,
    verbose = useAppState(selectVerbose_2),
    He;
  if ($[0] !== citation.sentence || $[1] !== verbose) {
    let trimmed = citation.sentence.trim();
    He = trimmed && !verbose ? truncateToLines(trimmed, y$) : trimmed;
    (($[0] = citation.sentence), ($[1] = verbose), ($[2] = He));
  } else He = $[2];
  let ze = He,
    Xe = ze
      ? `${MEMORY_SURVEY_HEADER}

${ze}

${t4}`
      : t4,
    rt;
  if ($[3] === MEMO_CACHE_SENTINEL) ((rt = e(Text, { dimColor: !0, children: "(optional)" })), ($[3] = rt));
  else rt = $[3];
  let kt;
  if ($[4] !== Xe) ((kt = r(Fragment, { children: [Xe, " ", rt] })), ($[4] = Xe), ($[5] = kt));
  else kt = $[5];
  let At;
  if (
    $[6] !== inputValue ||
    $[7] !== mountDelayMs ||
    $[8] !== onSelect ||
    $[9] !== setInputValue ||
    $[10] !== kt
  )
    ((At = e(FeedbackSurveyView, {
      onSelect: onSelect,
      inputValue: inputValue,
      setInputValue: setInputValue,
      message: kt,
      messageBold: !1,
      mountDelayMs: mountDelayMs,
      showNotSure: !0,
    })),
      ($[6] = inputValue),
      ($[7] = mountDelayMs),
      ($[8] = onSelect),
      ($[9] = setInputValue),
      ($[10] = kt),
      ($[11] = At));
  else At = $[11];
  return At;
}

export { SkillImprovementSurvey };
