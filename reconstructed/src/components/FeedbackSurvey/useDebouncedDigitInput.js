/**
 * components/FeedbackSurvey/useDebouncedDigitInput.ts
 *
 * 数字键防抖输入（避免误触提交）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/useDebouncedDigitInput.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  isTranscriptShareKey,
  TRANSCRIPT_SHARE_RESPONSES,
  isShareAnswerKey,
} from "./TranscriptSharePrompt.js";
import { useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { SurveyOption } from "./FeedbackSurveyView.js";

//@ chunk-18hwfzwa.js:995118-995644 fingerprint = useDebouncedDigitInput (0.727)
function useDebouncedDigitInput(props) {
  let $ = w(10);
  let { onSelect, inputValue, setInputValue } = props;
  let ke;
  if ($[0] !== onSelect || $[1] !== setInputValue) {
    ke = function Be(Re) {
      setInputValue("");
      onSelect(Re);
    };
    $[0] = onSelect;
    $[1] = setInputValue;
    $[2] = ke;
  } else ke = $[2];
  let Be = ke;
  let onDigit;
  if ($[3] !== Be) {
    onDigit = (We) => {
      let lower = We.toLowerCase();
      if (isTranscriptShareKey(lower)) Be(TRANSCRIPT_SHARE_RESPONSES[lower]);
    };
    $[3] = Be;
    $[4] = onDigit;
  } else onDigit = $[4];
  let Xe;
  if ($[5] !== inputValue || $[6] !== onDigit) {
    Xe = {
      inputValue,
      isValidDigit: isShareAnswerKey,
      onDigit,
    };
    $[5] = inputValue;
    $[6] = onDigit;
    $[7] = Xe;
  } else Xe = $[7];
  useDigitHotkeys(Xe);
  let rt;
  if ($[8] !== Be) {
    rt = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(SurveyOption, {
        onSelect: Be,
      }),
    });
    $[8] = Be;
    $[9] = rt;
  } else rt = $[9];
  return rt;
}
export { useDebouncedDigitInput };
