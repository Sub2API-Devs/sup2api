/**
 * tools/retiredTools.ts
 *
 * 2.1.316 新增：已下线的工具
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 */

//@ chunk-5xgkngpb.js:1530072-1530246 placement
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
