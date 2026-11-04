/**
 * tools/retiredTools.ts
 *
 * 2.1.316 新增：已下线的工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */

//@ chunk-e6aww6q8.js:1524647-1524821 placement
/**
 * 已下线的工具名集合（Frame、TeamCreate、TaskOutput、BashOutput 等），用于识别旧会话与权限规则中的过时名称。
 */
var RETIRED_TOOL_NAMES = new Set([
  "Frame",
  "FrameRead",
  "TeamCreate",
  "TeamDelete",
  "SuggestBackgroundPR",
  "AutofixPr",
  "TaskOutput",
  "AgentOutputTool",
  "BashOutputTool",
  "AgentOutput",
  "BashOutput",
]);
export { RETIRED_TOOL_NAMES };
