/**
 * components/messages/UserPlanMessage.tsx
 *
 * 用户提交的计划内容（"Plan to implement"）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserPlanMessage.tsx
 * pieces: chunk-ah34pb7m.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ShutdownRequestDisplay } from "./ShutdownMessage.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:112874-113172 fingerprint = UserPlanMessage (0.444)
function UserPlanMessage(props) {
  let $ = w(5);
  let { addMargin, planContent } = props;
  const marginTop = addMargin ? 1 : 0;
  let children;
  if ($[0] !== planContent) {
    children = jsxProd_default(ShutdownRequestDisplay, {
      color: "planMode",
      title: "Plan to implement",
      children: jsxProd_default(MarkdownText_2, {
        children: planContent,
      }),
    });
    $[0] = planContent;
    $[1] = children;
  } else children = $[1];
  let M;
  if ($[2] !== marginTop || $[3] !== children) {
    M = jsxProd_default(Box, {
      marginTop,
      children,
    });
    $[2] = marginTop;
    $[3] = children;
    $[4] = M;
  } else M = $[4];
  return M;
}
export { UserPlanMessage };
