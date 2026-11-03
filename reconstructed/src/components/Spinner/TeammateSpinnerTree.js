/**
 * components/Spinner/TeammateSpinnerTree.tsx
 *
 * 队友 Spinner 树；本模块大部分是被误归的 viewingAgentTaskId 选择器副本。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/TeammateSpinnerTree.tsx
 * pieces: chunk-18hwfzwa.js (1), chunk-v517dzda.js (1)
 * attribution: fingerprint 2
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { jsxProd_default_2 } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { WRITE_NEW_FEEDBACK_LABEL } from "../../commands/feedback/FeedbackQueue.js";

//@ chunk-18hwfzwa.js:120864-120911 fingerprint = _temp2 (1)
function selectIsViewingAgentTask(s_0) {
  return !!s_0.viewingAgentTaskId;
}
//@ chunk-v517dzda.js:14478-14680 fingerprint = HideRow (0.818)
function HideRow(props) {
  let $ = w(3);
  let { isSelected } = props;
  const color = isSelected ? "suggestion" : undefined;
  const d = isSelected ? `${figures_default.pointer} ` : "  ";
  let C;
  if ($[0] !== color || $[1] !== d) {
    C = jsxProd_default_2(Text, {
      color,
      children: [d, WRITE_NEW_FEEDBACK_LABEL],
    });
    $[0] = color;
    $[1] = d;
    $[2] = C;
  } else C = $[2];
  return C;
}
export { selectIsViewingAgentTask, HideRow };
