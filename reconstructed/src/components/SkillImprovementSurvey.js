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
import {
  MEMORY_SURVEY_MAX_LINES,
  MEMORY_SURVEY_HEADER,
  MEMORY_SURVEY_QUESTION,
} from "./FeedbackSurvey/useMemorySurvey.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../ink/components/Text.js";
import { FeedbackSurveyView } from "./FeedbackSurvey/FeedbackSurveyView.js";

//@ chunk-18hwfzwa.js:993905-993940 placement
function selectVerbose_2(It) {
  return It.verbose;
}
//@ chunk-18hwfzwa.js:994017-994730 fingerprint = SkillImprovementSurvey (0.325)
function SkillImprovementSurvey(props) {
  let $ = w(12);
  let { citation, onSelect, inputValue, setInputValue, mountDelayMs } = props;
  let verbose = useAppState(selectVerbose_2);
  let He;
  if ($[0] !== citation.sentence || $[1] !== verbose) {
    let text = citation.sentence.trim();
    He = text && !verbose ? truncateToLines(text, MEMORY_SURVEY_MAX_LINES) : text;
    $[0] = citation.sentence;
    $[1] = verbose;
    $[2] = He;
  } else He = $[2];
  let ze = He;
  let Xe = ze
    ? `${MEMORY_SURVEY_HEADER}

${ze}

${MEMORY_SURVEY_QUESTION}`
    : MEMORY_SURVEY_QUESTION;
  let rt;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    rt = jsxProd_default(Text, {
      dimColor: true,
      children: "(optional)",
    });
    $[3] = rt;
  } else rt = $[3];
  let message;
  if ($[4] !== Xe) {
    message = jsxProd_default_2(Fragment, {
      children: [Xe, " ", rt],
    });
    $[4] = Xe;
    $[5] = message;
  } else message = $[5];
  let At;
  if (
    $[6] !== inputValue ||
    $[7] !== mountDelayMs ||
    $[8] !== onSelect ||
    $[9] !== setInputValue ||
    $[10] !== message
  ) {
    At = jsxProd_default(FeedbackSurveyView, {
      onSelect,
      inputValue,
      setInputValue,
      message,
      messageBold: false,
      mountDelayMs,
      showNotSure: true,
    });
    $[6] = inputValue;
    $[7] = mountDelayMs;
    $[8] = onSelect;
    $[9] = setInputValue;
    $[10] = message;
    $[11] = At;
  } else At = $[11];
  return At;
}
export { SkillImprovementSurvey };
