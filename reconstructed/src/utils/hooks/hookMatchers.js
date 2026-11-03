/**
 * utils/hooks/hookMatchers.ts
 *
 * 2.1.316 新增：钩子匹配器
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (5)
 * attribution: placement 5
 */
import { SPLIT_TOOL_PARENT, SPLIT_TOOL_BY_ACTION } from "../../tools/ArtifactTool/constants.js";
import { MONITOR } from "../../tools/MonitorTool/constants.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";

//@ chunk-e6aww6q8.js:823360-823418 placement
function PBr(e) {
  return Object.hasOwn(SPLIT_TOOL_PARENT, e) ? SPLIT_TOOL_PARENT[e] : void 0;
}
//@ chunk-e6aww6q8.js:823418-823552 placement
function J0t(e, n) {
  if (!Object.hasOwn(SPLIT_TOOL_BY_ACTION, e)) return;
  let r = n?.action,
    s = SPLIT_TOOL_BY_ACTION[e];
  return typeof r === "string" && Object.hasOwn(s, r) ? s[r] : void 0;
}
//@ chunk-e6aww6q8.js:823552-823682 placement
function getCommandField(e) {
  return typeof e === "object" &&
    e !== null &&
    "command" in e &&
    typeof e.command === "string" &&
    e.command !== ""
    ? e.command
    : void 0;
}
//@ chunk-e6aww6q8.js:823682-823871 placement
function getCommandAndDescription(e) {
  let n = getCommandField(e);
  if (n === void 0) return;
  return typeof e === "object" && e !== null && "description" in e && typeof e.description === "string"
    ? { command: n, description: e.description }
    : { command: n };
}
//@ chunk-e6aww6q8.js:823871-823929 placement
function Pz(e, n) {
  return e === MONITOR && getCommandField(n) !== void 0 ? BASH_TOOL_NAME : void 0;
}

export { PBr, Pz, getCommandAndDescription, J0t, getCommandField };
