/**
 * components/projects/ContinueInProjectsTargetDialog.tsx
 *
 * 2.1.316 新增：选择目标 Claude 项目（已有/新建）的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ftzr67d2.js (5)
 * attribution: placement 5
 */
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
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

//@ chunk-ftzr67d2.js:13799-13803 placement
init_react_production();
//@ chunk-ftzr67d2.js:13803-13835 placement
function nowMs() {
  return Date.now();
}
//@ chunk-ftzr67d2.js:13835-13851 placement
var NEW_PROJECT_VALUE = "new";
var LIST_RESERVED_ROWS = 8;
//@ chunk-ftzr67d2.js:13851-13925 placement
function toTargetChoice(C) {
  return C === NEW_PROJECT_VALUE
    ? {
        choice: "new",
      }
    : {
        choice: "existing",
        projectId: C,
      };
}
//@ chunk-ftzr67d2.js:13925-16222 placement
/**
 * 选择目标 Claude 项目（已有/新建）的对话框。
 */
function ContinueInProjectsTargetDialog(props) {
  let t = w(39);
  let { payload, answer } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let inputRefusalWindow_2 = useInputRefusalWindow(DECAY_TICK_MS);
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let G;
  if (t[0] !== answer) {
    G = (se) => answer(toTargetChoice(se));
    t[0] = answer;
    t[1] = G;
  } else G = t[1];
  let refusableAnswer = useRefusableAnswer(G);
  let [B] = y(nowMs);
  let H;
  if (t[2] !== B || t[3] !== payload.newProjectName || t[4] !== payload.projects || t[5] !== payload.sends) {
    let date = new Date(B);
    const label = `New Claude Project \u201C${payload.newProjectName}\u201D`;
    const description =
      payload.sends === "message" ? "create it for this message" : "create it from this session";
    let f;
    if (t[7] !== label || t[8] !== description) {
      f = {
        label,
        value: NEW_PROJECT_VALUE,
        description,
      };
      t[7] = label;
      t[8] = description;
      t[9] = f;
    } else f = t[9];
    H = [
      f,
      ...payload.projects.map((project) => ({
        label: project.name !== "" ? project.name : "Untitled project",
        value: project.id,
        description: lastActiveLabel(project.lastMessageAtMs, date),
      })),
    ];
    t[2] = B;
    t[3] = payload.newProjectName;
    t[4] = payload.projects;
    t[5] = payload.sends;
    t[6] = H;
  } else H = t[6];
  let options = H;
  let u;
  if (t[10] !== noteRefused || t[11] !== refusedWithin) {
    u = function c(ae) {
      if (!ae() && !refusedWithin()) {
        return false;
      }
      noteRefused();
      return true;
    };
    t[10] = noteRefused;
    t[11] = refusedWithin;
    t[12] = u;
  } else u = t[12];
  let c = u;
  let d;
  if (t[13] !== inputRefusalWindow_2 || t[14] !== refusableAnswer || t[15] !== c) {
    d = function v(K) {
      if (c(inputRefusalWindow_2)) {
        refusableAnswer.refuse(K);
        return;
      }
      refusableAnswer.answer(K);
    };
    t[13] = inputRefusalWindow_2;
    t[14] = refusableAnswer;
    t[15] = c;
    t[16] = d;
  } else d = t[16];
  let onChange = d;
  let f;
  if (t[17] !== answer || t[18] !== inputRefusalWindow || t[19] !== c) {
    f = function p() {
      if (!c(inputRefusalWindow))
        answer({
          choice: "cancel",
        });
    };
    t[17] = answer;
    t[18] = inputRefusalWindow;
    t[19] = c;
    t[20] = f;
  } else f = t[20];
  let onCancel = f;
  const subtitle =
    payload.sends === "message"
      ? "Your message goes to the project you pick."
      : "This session\u2019s work goes to the project you pick.";
  let R;
  if (t[21] !== payload.listError) {
    R =
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
    t[21] = payload.listError;
    t[22] = R;
  } else R = t[22];
  const defaultFocusValue = refusableAnswer.refused ?? NEW_PROJECT_VALUE;
  let b;
  if (
    t[23] !== onCancel ||
    t[24] !== options ||
    t[25] !== onChange ||
    t[26] !== refusableAnswer.attempts ||
    t[27] !== defaultFocusValue
  ) {
    b = jsxProd_default(
      ModelSelector,
      {
        options,
        defaultFocusValue,
        visibleOptionCount: LIST_RESERVED_ROWS,
        hiddenBelowUnit: "project",
        onChange,
        onCancel,
      },
      refusableAnswer.attempts,
    );
    t[23] = onCancel;
    t[24] = options;
    t[25] = onChange;
    t[26] = refusableAnswer.attempts;
    t[27] = defaultFocusValue;
    t[28] = b;
  } else b = t[28];
  let k;
  if (t[29] !== payload.truncated) {
    k = payload.truncated
      ? jsxProd_default(Text, {
          dimColor: true,
          children: "Older projects are not listed. To use one, run /send-to-project with its link.",
        })
      : null;
    t[29] = payload.truncated;
    t[30] = k;
  } else k = t[30];
  let children;
  if (t[31] !== k || t[32] !== R || t[33] !== b) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [R, b, k],
    });
    t[31] = k;
    t[32] = R;
    t[33] = b;
    t[34] = children;
  } else children = t[34];
  let V;
  if (t[35] !== onCancel || t[36] !== children || t[37] !== subtitle) {
    V = jsxProd_default(Dialog, {
      title: "Send to which project?",
      subtitle,
      onCancel,
      color: "suggestion",
      children,
    });
    t[35] = onCancel;
    t[36] = children;
    t[37] = subtitle;
    t[38] = V;
  } else V = t[38];
  return V;
}
