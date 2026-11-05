/**
 * components/ToolStatusLabels.ts
 *
 * 2.1.316 新增：工具状态标签。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-ayzmbaz1.js (2)
 * attribution: placement 2
 */
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "./MessageResponse.js";
import { Text } from "../ink/components/Text.js";

//@ chunk-ayzmbaz1.js:297-389 placement
/**
 * 函数 WaitingLabel（"Waiting…"）。
 */
function WaitingLabel() {
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: jsxProd_default(Text, {
      dimColor: true,
      children: "Waiting\u2026",
    }),
  });
}
//@ chunk-ayzmbaz1.js:389-481 placement
/**
 * 函数 RunningLabel（"Running…"）。
 */
function RunningLabel() {
  return jsxProd_default(MessageResponse, {
    height: 1,
    children: jsxProd_default(Text, {
      dimColor: true,
      children: "Running\u2026",
    }),
  });
}
export { WaitingLabel, RunningLabel };
