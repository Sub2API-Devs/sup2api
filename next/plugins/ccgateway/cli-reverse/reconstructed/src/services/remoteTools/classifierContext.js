/**
 * services/remoteTools/classifierContext.ts
 *
 * 2.1.316 新增：远程工具分类器上下文
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-d4728jyd.js (1)
 * attribution: placement 1
 */
//@ chunk-d4728jyd.js:191-362 placement
/**
 * 需要从远程桥转录中扣留的工具结果字段与分类器上下文字段。
 */
var REMOTE_RESULT_FIELDS = ["toolUseResult", "tool_use_result", "mcpMeta", "remoteToolResult"];
var CLASSIFIER_CONTEXT_FIELDS = [
  "hostClassifierContext",
  "classifierMetaLines",
  "serverClassifierContext",
  "summarizeMetadata",
];
export { REMOTE_RESULT_FIELDS, CLASSIFIER_CONTEXT_FIELDS };
