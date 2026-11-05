/**
 * components/Spinner/TeammateSpinnerTree.tsx
 *
 * 队友 Spinner 树；本模块大部分是被误归的 viewingAgentTaskId 选择器副本。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/Spinner/TeammateSpinnerTree.tsx
 * pieces: chunk-czq1j3j2.js (1), chunk-pghf5k6z.js (1)
 * attribution: fingerprint 2
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { jsxProd_default_2 } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { WRITE_NEW_FEEDBACK_LABEL } from "../../commands/feedback/FeedbackQueue.js";

//@ chunk-czq1j3j2.js:121865-121912 fingerprint (2.1.88 match: _temp2, 1)
function selectIsViewingAgentTask(s_0) {
  return !!s_0.viewingAgentTaskId;
}
//@ chunk-pghf5k6z.js:14481-14683 fingerprint (2.1.88 match: HideRow, 0.818)
function HideRow(props) {
  let $ = useMemoCache(3);
  let { isSelected } = props;
  const color = isSelected ? "suggestion" : undefined;
  const prefix = isSelected ? `${figures_default.pointer} ` : "  ";
  let rowElement;
  if ($[0] !== color || $[1] !== prefix) {
    rowElement = jsxProd_default_2(Text, {
      color,
      children: [prefix, WRITE_NEW_FEEDBACK_LABEL],
    });
    $[0] = color;
    $[1] = prefix;
    $[2] = rowElement;
  } else rowElement = $[2];
  return rowElement;
}
export { selectIsViewingAgentTask, HideRow };
