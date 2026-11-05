/**
 * components/FeedbackSurvey/useDebouncedDigitInput.ts
 *
 * 数字键防抖输入（避免误触提交）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/FeedbackSurvey/useDebouncedDigitInput.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  isTranscriptShareKey,
  TRANSCRIPT_SHARE_RESPONSES,
  isShareAnswerKey,
} from "./TranscriptSharePrompt.js";
import { useDigitHotkeys } from "../pluginUi/digitHotkeys.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../../ink/components/Text.js";
import { SurveyOption } from "./FeedbackSurveyView.js";

//@ chunk-czq1j3j2.js:1029153-1029679 fingerprint (2.1.88 match: useDebouncedDigitInput, 0.728)
function useDebouncedDigitInput(props) {
  let $ = useMemoCache(10);
  let { onSelect, inputValue, setInputValue } = props;
  let selectCached;
  if ($[0] !== onSelect || $[1] !== setInputValue) {
    selectCached = function handleSelect(key) {
      setInputValue("");
      onSelect(key);
    };
    $[0] = onSelect;
    $[1] = setInputValue;
    $[2] = selectCached;
  } else selectCached = $[2];
  let select = selectCached;
  let onDigit;
  if ($[3] !== select) {
    onDigit = (key) => {
      let lower = key.toLowerCase();
      if (isTranscriptShareKey(lower)) select(TRANSCRIPT_SHARE_RESPONSES[lower]);
    };
    $[3] = select;
    $[4] = onDigit;
  } else onDigit = $[4];
  let digitHotkeyOptions;
  if ($[5] !== inputValue || $[6] !== onDigit) {
    digitHotkeyOptions = {
      inputValue,
      isValidDigit: isShareAnswerKey,
      onDigit,
    };
    $[5] = inputValue;
    $[6] = onDigit;
    $[7] = digitHotkeyOptions;
  } else digitHotkeyOptions = $[7];
  useDigitHotkeys(digitHotkeyOptions);
  let promptElement;
  if ($[8] !== select) {
    promptElement = jsxProd_default(Box, {
      marginTop: 1,
      children: jsxProd_default(SurveyOption, {
        onSelect: select,
      }),
    });
    $[8] = select;
    $[9] = promptElement;
  } else promptElement = $[9];
  return promptElement;
}
export { useDebouncedDigitInput };
