/**
 * utils/model/legacyModelNames.ts
 *
 * 2.1.316 新增：旧模型名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { TODO_WRITE_TOOL_NAME } from "../../tools/TodoWriteTool/constants.js";
import { TASK_CREATE_TOOL_NAME } from "../../tools/TaskCreateTool/constants.js";
import { TASK_GET_TOOL_NAME } from "../../tools/TaskGetTool/constants.js";
import { TASK_UPDATE_TOOL_NAME } from "../../tools/TaskUpdateTool/constants.js";
import { TASK_LIST_TOOL_NAME } from "../../tools/TaskListTool/constants.js";

/**
 * TodoWrite、TaskCreate、TaskGet、TaskUpdate、TaskList（工具名列表，用于折叠显示判断）。
 */
//@ chunk-e6aww6q8.js:3232364-3232683 placement = firstPartyNameToCanonical (0.821)
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
  ]),
  TODO_TOOL_NAMES = [
    TODO_WRITE_TOOL_NAME,
    TASK_CREATE_TOOL_NAME,
    TASK_GET_TOOL_NAME,
    TASK_UPDATE_TOOL_NAME,
    TASK_LIST_TOOL_NAME,
  ];
/**
 * 模型是否在 TODO_TOOL_LEGACY_MODELS 中。
 */
//@ chunk-e6aww6q8.js:3232683-3232717 placement
function isTodoToolLegacyModel(e) {
  return TODO_TOOL_LEGACY_MODELS.has(e);
}
//@ chunk-e6aww6q8.js:3232717-3232784 placement
function tAr(e) {
  return e.includes("application-inference-profile");
}

export { TODO_TOOL_NAMES, tAr, isTodoToolLegacyModel };
