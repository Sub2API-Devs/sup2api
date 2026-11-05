/**
 * components/projects/ContinueInProjectsTargetDialog.tsx
 *
 * 2.1.316 新增：选择目标 Claude 项目（已有/新建）的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-gxrznpbn.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRecentInputWithin, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { DECAY_TICK_MS } from "../ResumeStaleConversationDialog.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { lastActiveLabel } from "./continueInProjectsTargetRequest.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-gxrznpbn.js:14947-14951 placement
init_react_production();
//@ chunk-gxrznpbn.js:14951-14983 placement
function nowMs() {
  return Date.now();
}
//@ chunk-gxrznpbn.js:14983-14999 placement
var NEW_PROJECT_VALUE = "new";
var LIST_RESERVED_ROWS = 8;
//@ chunk-gxrznpbn.js:14999-15073 placement
function toTargetChoice(projectId) {
  return projectId === NEW_PROJECT_VALUE
    ? {
        choice: "new",
      }
    : {
        choice: "existing",
        projectId,
      };
}
//@ chunk-gxrznpbn.js:15073-17370 placement
/**
 * 选择目标 Claude 项目（已有/新建）的对话框。
 */
function ContinueInProjectsTargetDialog(props) {
  let $ = useMemoCache(39);
  let { payload, answer } = props;
  let isRecentInput = useRecentInputWithin();
  let isRecentInputForDecay = useRecentInputWithin(DECAY_TICK_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let rawAnswer;
  if ($[0] !== answer) {
    rawAnswer = (choice) => answer(toTargetChoice(choice));
    $[0] = answer;
    $[1] = rawAnswer;
  } else rawAnswer = $[1];
  let refusableAnswer = useRefusableAnswer(rawAnswer);
  let [nowTimestamp] = useState(nowMs);
  let options;
  if (
    $[2] !== nowTimestamp ||
    $[3] !== payload.newProjectName ||
    $[4] !== payload.projects ||
    $[5] !== payload.sends
  ) {
    let date = new Date(nowTimestamp);
    const label = `New Claude Project \u201C${payload.newProjectName}\u201D`;
    const description =
      payload.sends === "message" ? "create it for this message" : "create it from this session";
    let newProjectOption;
    if ($[7] !== label || $[8] !== description) {
      newProjectOption = {
        label,
        value: NEW_PROJECT_VALUE,
        description,
      };
      $[7] = label;
      $[8] = description;
      $[9] = newProjectOption;
    } else newProjectOption = $[9];
    options = [
      newProjectOption,
      ...payload.projects.map((project) => ({
        label: project.name !== "" ? project.name : "Untitled project",
        value: project.id,
        description: lastActiveLabel(project.lastMessageAtMs, date),
      })),
    ];
    $[2] = nowTimestamp;
    $[3] = payload.newProjectName;
    $[4] = payload.projects;
    $[5] = payload.sends;
    $[6] = options;
  } else options = $[6];
  let options_2 = options;
  let refuseInput;
  if ($[10] !== noteRefused || $[11] !== refusedWithin) {
    refuseInput = function refuseInput(check) {
      if (!check() && !refusedWithin()) {
        return false;
      }
      noteRefused();
      return true;
    };
    $[10] = noteRefused;
    $[11] = refusedWithin;
    $[12] = refuseInput;
  } else refuseInput = $[12];
  let refuseInput_2 = refuseInput;
  let onChoice;
  if ($[13] !== isRecentInputForDecay || $[14] !== refusableAnswer || $[15] !== refuseInput_2) {
    onChoice = function onChoice(choice) {
      if (refuseInput_2(isRecentInputForDecay)) {
        refusableAnswer.refuse(choice);
        return;
      }
      refusableAnswer.answer(choice);
    };
    $[13] = isRecentInputForDecay;
    $[14] = refusableAnswer;
    $[15] = refuseInput_2;
    $[16] = onChoice;
  } else onChoice = $[16];
  let onChange = onChoice;
  let onCancel;
  if ($[17] !== answer || $[18] !== isRecentInput || $[19] !== refuseInput_2) {
    onCancel = function onCancel() {
      if (!refuseInput_2(isRecentInput))
        answer({
          choice: "cancel",
        });
    };
    $[17] = answer;
    $[18] = isRecentInput;
    $[19] = refuseInput_2;
    $[20] = onCancel;
  } else onCancel = $[20];
  let onCancel_2 = onCancel;
  const subtitle =
    payload.sends === "message"
      ? "Your message goes to the project you pick."
      : "This session\u2019s work goes to the project you pick.";
  let listErrorText;
  if ($[21] !== payload.listError) {
    listErrorText =
      payload.listError !== undefined
        ? jsxProd_default_2(Text, {
            color: "warning",
            children: [
              "Couldn\u2019t list your projects (",
              payload.listError,
              "). You can still create a new one.",
            ],
          })
        : null;
    $[21] = payload.listError;
    $[22] = listErrorText;
  } else listErrorText = $[22];
  const defaultFocusValue = refusableAnswer.refused ?? NEW_PROJECT_VALUE;
  let selector;
  if (
    $[23] !== onCancel_2 ||
    $[24] !== options_2 ||
    $[25] !== onChange ||
    $[26] !== refusableAnswer.attempts ||
    $[27] !== defaultFocusValue
  ) {
    selector = jsxProd_default(
      ModelSelector,
      {
        options: options_2,
        defaultFocusValue,
        visibleOptionCount: LIST_RESERVED_ROWS,
        hiddenBelowUnit: "project",
        onChange,
        onCancel: onCancel_2,
      },
      refusableAnswer.attempts,
    );
    $[23] = onCancel_2;
    $[24] = options_2;
    $[25] = onChange;
    $[26] = refusableAnswer.attempts;
    $[27] = defaultFocusValue;
    $[28] = selector;
  } else selector = $[28];
  let truncatedNote;
  if ($[29] !== payload.truncated) {
    truncatedNote = payload.truncated
      ? jsxProd_default(Text, {
          dimColor: true,
          children: "Older projects are not listed. To use one, run /send-to-project with its link.",
        })
      : null;
    $[29] = payload.truncated;
    $[30] = truncatedNote;
  } else truncatedNote = $[30];
  let children;
  if ($[31] !== truncatedNote || $[32] !== listErrorText || $[33] !== selector) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [listErrorText, selector, truncatedNote],
    });
    $[31] = truncatedNote;
    $[32] = listErrorText;
    $[33] = selector;
    $[34] = children;
  } else children = $[34];
  let dialog;
  if ($[35] !== onCancel_2 || $[36] !== children || $[37] !== subtitle) {
    dialog = jsxProd_default(Dialog, {
      title: "Send to which project?",
      subtitle,
      onCancel: onCancel_2,
      color: "suggestion",
      children,
    });
    $[35] = onCancel_2;
    $[36] = children;
    $[37] = subtitle;
    $[38] = dialog;
  } else dialog = $[38];
  return dialog;
}
export { ContinueInProjectsTargetDialog };
