/**
 * components/ToolStatusLabels.ts
 *
 * 2.1.316 新增：工具状态标签。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ncs6vc5k.js (2)
 * attribution: placement 2
 */
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { MessageResponse } from "./MessageResponse.js";
import { Text } from "../ink/components/Text.js";

//@ chunk-ncs6vc5k.js:297-389 placement
function _mt() {
  return e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: "Waiting\u2026" }) });
}
//@ chunk-ncs6vc5k.js:389-481 placement
function bmt() {
  return e(MessageResponse, { height: 1, children: e(Text, { dimColor: !0, children: "Running\u2026" }) });
}

export { bmt, _mt };
