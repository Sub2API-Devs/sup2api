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
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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
function selectVerbose_2(state) {
  return state.verbose;
}
//@ chunk-18hwfzwa.js:994017-994730 fingerprint (2.1.88 match: SkillImprovementSurvey, 0.325)
function SkillImprovementSurvey(props) {
  let $ = useMemoCache(12);
  let { citation, onSelect, inputValue, setInputValue, mountDelayMs } = props;
  let verbose = useAppState(selectVerbose_2);
  let citationText;
  if ($[0] !== citation.sentence || $[1] !== verbose) {
    let text = citation.sentence.trim();
    citationText = text && !verbose ? truncateToLines(text, MEMORY_SURVEY_MAX_LINES) : text;
    $[0] = citation.sentence;
    $[1] = verbose;
    $[2] = citationText;
  } else citationText = $[2];
  let text = citationText;
  let truncated = text
    ? `${MEMORY_SURVEY_HEADER}

${text}

${MEMORY_SURVEY_QUESTION}`
    : MEMORY_SURVEY_QUESTION;
  let textElement;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    textElement = jsxProd_default(Text, {
      dimColor: true,
      children: "(optional)",
    });
    $[3] = textElement;
  } else textElement = $[3];
  let message;
  if ($[4] !== truncated) {
    message = jsxProd_default_2(Fragment, {
      children: [truncated, " ", textElement],
    });
    $[4] = truncated;
    $[5] = message;
  } else message = $[5];
  let feedbackSurveyViewElement;
  if (
    $[6] !== inputValue ||
    $[7] !== mountDelayMs ||
    $[8] !== onSelect ||
    $[9] !== setInputValue ||
    $[10] !== message
  ) {
    feedbackSurveyViewElement = jsxProd_default(FeedbackSurveyView, {
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
    $[11] = feedbackSurveyViewElement;
  } else feedbackSurveyViewElement = $[11];
  return feedbackSurveyViewElement;
}
export { SkillImprovementSurvey };
