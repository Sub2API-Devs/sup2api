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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ShutdownRequestDisplay } from "./ShutdownMessage.js";
import { MarkdownText_2 } from "../pluginUi/render/MarkdownBlock.js";
import { Box } from "../../ink/components/Text.js";

//@ chunk-ah34pb7m.js:112874-113172 fingerprint = UserPlanMessage (0.444)
function UserPlanMessage(t0) {
  let $ = w(5),
    { addMargin: addMargin, planContent: planContent } = t0;
  const t1 = addMargin ? 1 : 0;
  let h;
  if ($[0] !== planContent)
    ((h = e(ShutdownRequestDisplay, {
      color: "planMode",
      title: "Plan to implement",
      children: e(MarkdownText_2, { children: planContent }),
    })),
      ($[0] = planContent),
      ($[1] = h));
  else h = $[1];
  let M;
  if ($[2] !== t1 || $[3] !== h)
    ((M = e(Box, { marginTop: t1, children: h })), ($[2] = t1), ($[3] = h), ($[4] = M));
  else M = $[4];
  return M;
}

export { UserPlanMessage };
