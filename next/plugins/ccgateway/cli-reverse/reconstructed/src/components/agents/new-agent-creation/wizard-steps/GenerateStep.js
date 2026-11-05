/**
 * components/agents/new-agent-creation/wizard-steps/GenerateStep.tsx
 *
 * 向导生成步骤；实际内容为 API key 输入（疑似匹配错误）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/GenerateStep.tsx
 * pieces: chunk-1gcg79yh.js (2)
 * attribution: affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
import { useState } from "../../../../../vendor/react/cjs/react.production.js";
import { useTerminalSize } from "../../../../hooks/useTerminalSize.js";
import { useRecentInputWithin, useRefusalTracker } from "../../../CustomSelect/selectTypeahead.js";
import { DECAY_TICK_MS } from "../../../ResumeStaleConversationDialog.js";
import { validateSummaryProblem } from "../../../../services/projects/proposalValidation.js";
import { composeSubtitle, COMPOSE_TITLE } from "../../../projects/continueInProjectsComposeRequest.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { Text, Box } from "../../../../ink/components/Text.js";
import { TextInput } from "../../../TextInput.js";
import { Dialog } from "../../../design-system/Dialog.js";

//@ chunk-1gcg79yh.js:15025-15033 affinity
var PROMPT_CHROME_COLUMNS = 8;
//@ chunk-1gcg79yh.js:15033-16727 fingerprint (2.1.88 match: GenerateStep, 0.384)
function GenerateStep(props) {
  let $ = useMemoCache(28);
  let { payload, answer } = props;
  let [draft, setDraft] = useState("");
  let [cursorOffset, setCursorOffset] = useState(0);
  let [problemText, setProblemText] = useState(null);
  let { columns } = useTerminalSize();
  let model = useRecentInputWithin();
  let abortControllerRef = useRecentInputWithin(DECAY_TICK_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let shouldRefuse;
  if ($[0] !== noteRefused || $[1] !== refusedWithin) {
    shouldRefuse = function refuse(isActive) {
      if (!isActive() && !refusedWithin()) {
        return false;
      }
      noteRefused();
      return true;
    };
    $[0] = noteRefused;
    $[1] = refusedWithin;
    $[2] = shouldRefuse;
  } else shouldRefuse = $[2];
  let refuseInput = shouldRefuse;
  let onSubmit;
  if ($[3] !== answer || $[4] !== abortControllerRef || $[5] !== refuseInput) {
    onSubmit = function submit(input) {
      if (refuseInput(abortControllerRef)) {
        return;
      }
      let trimmedPrompt = input.trim();
      if (trimmedPrompt === "") {
        return;
      }
      let inputProblem = validateSummaryProblem(trimmedPrompt);
      if (inputProblem !== null) {
        setProblemText(`That can\u2019t be sent as typed: ${inputProblem.problem}.`);
        return;
      }
      answer({
        choice: "send",
        message: trimmedPrompt,
      });
    };
    $[3] = answer;
    $[4] = abortControllerRef;
    $[5] = refuseInput;
    $[6] = onSubmit;
  } else onSubmit = $[6];
  let onSubmit_2 = onSubmit;
  let onCancel;
  if ($[7] !== answer || $[8] !== model || $[9] !== refuseInput) {
    onCancel = function cancel() {
      if (!refuseInput(model))
        answer({
          choice: "cancel",
        });
    };
    $[7] = answer;
    $[8] = model;
    $[9] = refuseInput;
    $[10] = onCancel;
  } else onCancel = $[10];
  let onCancel_2 = onCancel;
  let subtitle;
  if ($[11] !== payload) {
    subtitle = composeSubtitle(payload);
    $[11] = payload;
    $[12] = subtitle;
  } else subtitle = $[12];
  let inputGuide;
  if ($[13] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "continue",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "cancel",
        }),
      ],
    });
    $[13] = inputGuide;
  } else inputGuide = $[13];
  let promptMarker;
  if ($[14] === MEMO_CACHE_SENTINEL) {
    promptMarker = jsxProd_default(Text, {
      dimColor: true,
      children: ">",
    });
    $[14] = promptMarker;
  } else promptMarker = $[14];
  let onChange;
  if ($[15] === MEMO_CACHE_SENTINEL) {
    onChange = (value) => {
      setDraft(value);
      setProblemText(null);
    };
    $[15] = onChange;
  } else onChange = $[15];
  const columns_2 = Math.max(10, columns - PROMPT_CHROME_COLUMNS);
  let inputRow;
  if ($[16] !== cursorOffset || $[17] !== draft || $[18] !== onSubmit_2 || $[19] !== columns_2) {
    inputRow = jsxProd_default_2(Box, {
      flexDirection: "row",
      gap: 1,
      children: [
        promptMarker,
        jsxProd_default(TextInput, {
          value: draft,
          onChange,
          onSubmit: onSubmit_2,
          disableEscapeDoublePress: true,
          clearOnSubmit: false,
          focus: true,
          showCursor: true,
          columns: columns_2,
          cursorOffset,
          onChangeCursorOffset: setCursorOffset,
        }),
      ],
    });
    $[16] = cursorOffset;
    $[17] = draft;
    $[18] = onSubmit_2;
    $[19] = columns_2;
    $[20] = inputRow;
  } else inputRow = $[20];
  let problemRow;
  if ($[21] !== problemText) {
    problemRow =
      problemText === null
        ? null
        : jsxProd_default(Text, {
            color: "warning",
            children: problemText,
          });
    $[21] = problemText;
    $[22] = problemRow;
  } else problemRow = $[22];
  let dialog;
  if ($[23] !== onCancel_2 || $[24] !== problemRow || $[25] !== subtitle || $[26] !== inputRow) {
    dialog = jsxProd_default_2(Dialog, {
      title: COMPOSE_TITLE,
      subtitle,
      color: "suggestion",
      onCancel: onCancel_2,
      inputGuide,
      children: [inputRow, problemRow],
    });
    $[23] = onCancel_2;
    $[24] = problemRow;
    $[25] = subtitle;
    $[26] = inputRow;
    $[27] = dialog;
  } else dialog = $[27];
  return dialog;
}
export { GenerateStep };
