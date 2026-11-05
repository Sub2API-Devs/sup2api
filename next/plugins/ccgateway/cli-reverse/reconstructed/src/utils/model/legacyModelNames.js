/**
 * utils/model/legacyModelNames.ts
 *
 * 2.1.316 新增：旧模型名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";

//@ chunk-5xgkngpb.js:3317003-3317322 placement (2.1.88 match: firstPartyNameToCanonical, 0.821)
/**
 * TodoWrite、TaskCreate、TaskGet、TaskUpdate、TaskList（工具名列表，用于折叠显示判断）。
 */
var TODO_TOOL_LEGACY_MODELS = new Set([
  "claude-3-opus",
  "claude-3-sonnet",
  "claude-3-haiku",
  "claude-3-5-sonnet",
  "claude-3-5-haiku",
  "claude-3-7-sonnet",
  "claude-opus-4-0",
  "claude-opus-4-1",
  "claude-opus-4-5",
  "claude-opus-4-6",
  "claude-opus-4-7",
  "claude-sonnet-4-0",
  "claude-sonnet-4-5",
  "claude-sonnet-4-6",
  "claude-haiku-4-5",
]);
var TODO_TOOL_NAMES = [
  TODO_WRITE_TOOL_NAME,
  TASK_CREATE_TOOL_NAME,
  TASK_GET_TOOL_NAME,
  TASK_UPDATE_TOOL_NAME,
  TASK_LIST_TOOL_NAME,
];
//@ chunk-5xgkngpb.js:3317322-3317356 placement
/**
 * 模型是否在 TODO_TOOL_LEGACY_MODELS 中。
 */
function isTodoToolLegacyModel(modelId) {
  return TODO_TOOL_LEGACY_MODELS.has(modelId);
}
//@ chunk-5xgkngpb.js:3317356-3317423 placement
/**
 * 判断模型 id 是否为推理配置（application-inference-profile）。
 */
function isInferenceProfileModelId(modelId) {
  return modelId.includes("application-inference-profile");
}
export { TODO_TOOL_NAMES, isInferenceProfileModelId, isTodoToolLegacyModel };
