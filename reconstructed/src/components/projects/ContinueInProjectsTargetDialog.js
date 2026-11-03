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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputRefusalWindow, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { aWe } from "../ResumeStaleConversationDialog.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { lastActiveLabel } from "./continueInProjectsTargetRequest.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-ftzr67d2.js:13799-13803 placement
j();
//@ chunk-ftzr67d2.js:13803-13835 placement
function re() {
  return Date.now();
}
//@ chunk-ftzr67d2.js:13835-13851 placement
var NEW = "new",
  F = 8;
//@ chunk-ftzr67d2.js:13851-13925 placement
function M(C) {
  return C === NEW ? { choice: "new" } : { choice: "existing", projectId: C };
}
/**
 * 选择目标 Claude 项目（已有/新建）的对话框。
 */
//@ chunk-ftzr67d2.js:13925-16222 placement
function ContinueInProjectsTargetDialog(C) {
  let t = w(39),
    { payload: payload, answer: answer } = C,
    W = useInputRefusalWindow(),
    D = useInputRefusalWindow(aWe),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    G;
  if (t[0] !== answer) ((G = (se) => answer(M(se))), (t[0] = answer), (t[1] = G));
  else G = t[1];
  let a = useRefusableAnswer(G),
    [B] = y(re),
    H;
  if (t[2] !== B || t[3] !== payload.newProjectName || t[4] !== payload.projects || t[5] !== payload.sends) {
    let date = new Date(B);
    const u = `New Claude Project \u201C${payload.newProjectName}\u201D`;
    const d = payload.sends === "message" ? "create it for this message" : "create it from this session";
    let f;
    if (t[7] !== u || t[8] !== d)
      ((f = { label: u, value: NEW, description: d }), (t[7] = u), (t[8] = d), (t[9] = f));
    else f = t[9];
    H = [
      f,
      ...payload.projects.map((project) => ({
        label: project.name !== "" ? project.name : "Untitled project",
        value: project.id,
        description: lastActiveLabel(project.lastMessageAtMs, date),
      })),
    ];
    ((t[2] = B),
      (t[3] = payload.newProjectName),
      (t[4] = payload.projects),
      (t[5] = payload.sends),
      (t[6] = H));
  } else H = t[6];
  let O = H,
    u;
  if (t[10] !== noteRefused || t[11] !== refusedWithin)
    ((u = function c(ae) {
      if (!ae() && !refusedWithin()) {
        return !1;
      }
      return (noteRefused(), !0);
    }),
      (t[10] = noteRefused),
      (t[11] = refusedWithin),
      (t[12] = u));
  else u = t[12];
  let c = u,
    d;
  if (t[13] !== D || t[14] !== a || t[15] !== c)
    ((d = function v(K) {
      if (c(D)) {
        a.refuse(K);
        return;
      }
      a.answer(K);
    }),
      (t[13] = D),
      (t[14] = a),
      (t[15] = c),
      (t[16] = d));
  else d = t[16];
  let v = d,
    f;
  if (t[17] !== answer || t[18] !== W || t[19] !== c)
    ((f = function p() {
      if (!c(W)) answer({ choice: "cancel" });
    }),
      (t[17] = answer),
      (t[18] = W),
      (t[19] = c),
      (t[20] = f));
  else f = t[20];
  let p = f;
  const S =
    payload.sends === "message"
      ? "Your message goes to the project you pick."
      : "This session\u2019s work goes to the project you pick.";
  let R;
  if (t[21] !== payload.listError)
    ((R =
      payload.listError !== void 0
        ? r(Text, {
            color: "warning",
            children: [
              "Couldn\u2019t list your projects (",
              payload.listError,
              "). You can still create a new one.",
            ],
          })
        : null),
      (t[21] = payload.listError),
      (t[22] = R));
  else R = t[22];
  const A = a.refused ?? NEW;
  let b;
  if (t[23] !== p || t[24] !== O || t[25] !== v || t[26] !== a.attempts || t[27] !== A)
    ((b = e(
      ModelSelector,
      {
        options: O,
        defaultFocusValue: A,
        visibleOptionCount: F,
        hiddenBelowUnit: "project",
        onChange: v,
        onCancel: p,
      },
      a.attempts,
    )),
      (t[23] = p),
      (t[24] = O),
      (t[25] = v),
      (t[26] = a.attempts),
      (t[27] = A),
      (t[28] = b));
  else b = t[28];
  let k;
  if (t[29] !== payload.truncated)
    ((k = payload.truncated
      ? e(Text, {
          dimColor: !0,
          children: "Older projects are not listed. To use one, run /send-to-project with its link.",
        })
      : null),
      (t[29] = payload.truncated),
      (t[30] = k));
  else k = t[30];
  let T;
  if (t[31] !== k || t[32] !== R || t[33] !== b)
    ((T = r(Box, { flexDirection: "column", gap: 1, children: [R, b, k] })),
      (t[31] = k),
      (t[32] = R),
      (t[33] = b),
      (t[34] = T));
  else T = t[34];
  let V;
  if (t[35] !== p || t[36] !== T || t[37] !== S)
    ((V = e(Dialog, {
      title: "Send to which project?",
      subtitle: S,
      onCancel: p,
      color: "suggestion",
      children: T,
    })),
      (t[35] = p),
      (t[36] = T),
      (t[37] = S),
      (t[38] = V));
  else V = t[38];
  return V;
}
