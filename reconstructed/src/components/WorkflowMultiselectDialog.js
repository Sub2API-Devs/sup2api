/**
 * components/WorkflowMultiselectDialog.tsx
 *
 * 安装 GitHub Actions 工作流时的多选对话框（Claude Code / 代码审查等）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/WorkflowMultiselectDialog.tsx
 * pieces: chunk-4v9zy7gn.js (5)
 * attribution: placement 2, file-local 1, fingerprint 2
 */
import { j, y } from "../../vendor/react/cjs/react.production.js";
import { r, e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Text, Box, Link } from "../ink/components/Text.js";
import { SelectMultiAccessible } from "./CustomSelect/SelectMulti.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-4v9zy7gn.js:15719-15723 placement
j();
//@ chunk-4v9zy7gn.js:15723-15727 placement
j();
//@ chunk-4v9zy7gn.js:15727-15778 file-local
function eo(workflow) {
  return { label: workflow.label, value: workflow.value };
}
/**
 * GitHub Actions 工作流多选的选项（@claude 标记与自动代码审查）与底部按键提示行。
 */
//@ chunk-4v9zy7gn.js:15778-16180 fingerprint = renderInputGuide (0.527)
var GITHUB_WORKFLOW_OPTIONS = [
    { value: "claude", label: "@Claude Code - Tag @claude in issues and PR comments" },
    { value: "claude-review", label: "Claude Code Review - Automated code review on new PRs" },
  ],
  WORKFLOW_SELECT_HINTS = r(Byline, {
    children: [
      e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
      e(KeyboardShortcutHint, { chord: "space", action: "toggle" }),
      e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
      e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
      }),
    ],
  });
/**
 * GitHub Actions 工作流多选：为每个选中的工作流在仓库中创建文件。
 */
//@ chunk-4v9zy7gn.js:16180-17501 fingerprint = WorkflowMultiselectDialog (0.715)
function WorkflowMultiselectDialog(t0) {
  let $ = w(15),
    { onSubmit: onSubmit, defaultSelections: defaultSelections } = t0,
    [f, C] = y(!1),
    o;
  if ($[0] !== onSubmit)
    ((o = (selectedValues) => {
      if (selectedValues.length === 0) {
        C(!0);
        return;
      }
      (C(!1), onSubmit(selectedValues));
    }),
      ($[0] = onSubmit),
      ($[1] = o));
  else o = $[1];
  let A = o,
    g;
  if ($[2] === MEMO_CACHE_SENTINEL)
    ((g = () => {
      C(!1);
    }),
      ($[2] = g));
  else g = $[2];
  let _ = g,
    k;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((k = () => {
      C(!0);
    }),
      ($[3] = k));
  else k = $[3];
  let E = k,
    x;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((x = e(Text, {
      dimColor: !0,
      children: "We'll create a workflow file in your repository for each one you select.",
    })),
      ($[4] = x));
  else x = $[4];
  let T;
  if ($[5] === MEMO_CACHE_SENTINEL)
    ((T = r(Box, {
      flexDirection: "column",
      children: [
        x,
        r(Text, {
          dimColor: !0,
          children: [
            "More workflow examples (issue triage, CI fixes, etc.) at:",
            " ",
            e(Link, {
              url: "https://github.com/anthropics/claude-code-action/blob/main/examples/",
              children: "https://github.com/anthropics/claude-code-action/blob/main/examples/",
            }),
          ],
        }),
      ],
    })),
      ($[5] = T));
  else T = $[5];
  let W;
  if ($[6] === MEMO_CACHE_SENTINEL) ((W = GITHUB_WORKFLOW_OPTIONS.map(eo)), ($[6] = W));
  else W = $[6];
  let N;
  if ($[7] !== defaultSelections || $[8] !== A)
    ((N = e(SelectMultiAccessible, {
      options: W,
      defaultValue: defaultSelections,
      onSubmit: A,
      onChange: _,
      onCancel: E,
      hideIndexes: !0,
    })),
      ($[7] = defaultSelections),
      ($[8] = A),
      ($[9] = N));
  else N = $[9];
  let G;
  if ($[10] !== f)
    ((G =
      f &&
      e(Box, {
        children: e(Text, { color: "error", children: "You must select at least one workflow to continue" }),
      })),
      ($[10] = f),
      ($[11] = G));
  else G = $[11];
  let B;
  if ($[12] !== N || $[13] !== G)
    ((B = r(Dialog, {
      title: "Install GitHub App",
      subtitle: "Select GitHub workflows to install",
      onCancel: E,
      exitOnCtrlCD: !0,
      inputGuide: WORKFLOW_SELECT_HINTS,
      children: [T, N, G],
    })),
      ($[12] = N),
      ($[13] = G),
      ($[14] = B));
  else B = $[14];
  return B;
}

export { WorkflowMultiselectDialog };
