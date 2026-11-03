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
import { init_react_production, y } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "./design-system/Byline.js";
import { KeyboardShortcutHint } from "./design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "./ConfigurableShortcutHint.js";
import { w } from "../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { Text, Box, Link } from "../ink/components/Text.js";
import { SelectMultiAccessible } from "./CustomSelect/SelectMulti.js";
import { Dialog } from "./design-system/Dialog.js";

//@ chunk-4v9zy7gn.js:15719-15723 placement
init_react_production();
//@ chunk-4v9zy7gn.js:15723-15727 placement
init_react_production();
//@ chunk-4v9zy7gn.js:15727-15778 file-local
function toMultiselectOption(workflow) {
  return {
    label: workflow.label,
    value: workflow.value,
  };
}
//@ chunk-4v9zy7gn.js:15778-16180 fingerprint = renderInputGuide (0.527)
/**
 * GitHub Actions 工作流多选的选项（@claude 标记与自动代码审查）与底部按键提示行。
 */
var GITHUB_WORKFLOW_OPTIONS = [
  {
    value: "claude",
    label: "@Claude Code - Tag @claude in issues and PR comments",
  },
  {
    value: "claude-review",
    label: "Claude Code Review - Automated code review on new PRs",
  },
];
var WORKFLOW_SELECT_HINTS = jsxProd_default_2(Byline, {
  children: [
    jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "navigate",
    }),
    jsxProd_default(KeyboardShortcutHint, {
      chord: "space",
      action: "toggle",
    }),
    jsxProd_default(KeyboardShortcutHint, {
      chord: "enter",
      action: "confirm",
    }),
    jsxProd_default(ConfigurableShortcutHint, {
      action: "confirm:no",
      context: "Confirmation",
      fallback: "Esc",
      description: "cancel",
    }),
  ],
});
//@ chunk-4v9zy7gn.js:16180-17501 fingerprint = WorkflowMultiselectDialog (0.715)
/**
 * GitHub Actions 工作流多选：为每个选中的工作流在仓库中创建文件。
 */
function WorkflowMultiselectDialog(props) {
  let $ = w(15);
  let { onSubmit, defaultSelections } = props;
  let [showError, setShowError] = y(false);
  let t1;
  if ($[0] !== onSubmit) {
    t1 = (selectedValues) => {
      if (selectedValues.length === 0) {
        setShowError(true);
        return;
      }
      setShowError(false);
      onSubmit(selectedValues);
    };
    $[0] = onSubmit;
    $[1] = t1;
  } else t1 = $[1];
  let handleSubmit = t1;
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = () => {
      setShowError(false);
    };
    $[2] = t2;
  } else t2 = $[2];
  let handleChange = t2;
  let t3;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    t3 = () => {
      setShowError(true);
    };
    $[3] = t3;
  } else t3 = $[3];
  let handleCancel = t3;
  let x;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    x = jsxProd_default(Text, {
      dimColor: true,
      children: "We'll create a workflow file in your repository for each one you select.",
    });
    $[4] = x;
  } else x = $[4];
  let T;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    T = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [
        x,
        jsxProd_default_2(Text, {
          dimColor: true,
          children: [
            "More workflow examples (issue triage, CI fixes, etc.) at:",
            " ",
            jsxProd_default(Link, {
              url: "https://github.com/anthropics/claude-code-action/blob/main/examples/",
              children: "https://github.com/anthropics/claude-code-action/blob/main/examples/",
            }),
          ],
        }),
      ],
    });
    $[5] = T;
  } else T = $[5];
  let options;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    options = GITHUB_WORKFLOW_OPTIONS.map(toMultiselectOption);
    $[6] = options;
  } else options = $[6];
  let t6;
  if ($[7] !== defaultSelections || $[8] !== handleSubmit) {
    t6 = jsxProd_default(SelectMultiAccessible, {
      options,
      defaultValue: defaultSelections,
      onSubmit: handleSubmit,
      onChange: handleChange,
      onCancel: handleCancel,
      hideIndexes: true,
    });
    $[7] = defaultSelections;
    $[8] = handleSubmit;
    $[9] = t6;
  } else t6 = $[9];
  let t7;
  if ($[10] !== showError) {
    t7 =
      showError &&
      jsxProd_default(Box, {
        children: jsxProd_default(Text, {
          color: "error",
          children: "You must select at least one workflow to continue",
        }),
      });
    $[10] = showError;
    $[11] = t7;
  } else t7 = $[11];
  let t8;
  if ($[12] !== t6 || $[13] !== t7) {
    t8 = jsxProd_default_2(Dialog, {
      title: "Install GitHub App",
      subtitle: "Select GitHub workflows to install",
      onCancel: handleCancel,
      exitOnCtrlCD: true,
      inputGuide: WORKFLOW_SELECT_HINTS,
      children: [T, t6, t7],
    });
    $[12] = t6;
    $[13] = t7;
    $[14] = t8;
  } else t8 = $[14];
  return t8;
}
export { WorkflowMultiselectDialog };
