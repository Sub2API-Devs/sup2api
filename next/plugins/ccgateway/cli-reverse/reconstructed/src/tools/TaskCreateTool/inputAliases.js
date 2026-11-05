/**
 * tools/TaskCreateTool/inputAliases.ts
 *
 * 2.1.316 新增：TaskCreate 工具输入别名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (6)
 * attribution: placement 5, affinity 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { getFirstLine } from "../../utils/stringUtils.js";
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:1853518-1853778 placement
/**
 * TaskCreate 输入的规范字段与可接受的别名（title/name → subject、content → description、active_form → activeForm），以及会被忽略的其他字段名。
 */
var TASK_INPUT_FIELDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBJECT_ALIASES;
var DESCRIPTION_ALIASES;
var ACTIVE_FORM_ALIASES_2;
var IGNORED_TASK_FIELDS;
deferInit("chunk-5xgkngpb.js:1853518", () => {
  TASK_INPUT_FIELDS = new Set(["subject", "description", "activeForm", "metadata"]);
  SUBJECT_ALIASES = ["title", "name"];
  DESCRIPTION_ALIASES = ["content"];
  ACTIVE_FORM_ALIASES_2 = ["active_form"];
  IGNORED_TASK_FIELDS = new Set([
    "status",
    "state",
    "priority",
    "prompt",
    "subagent_type",
    "id",
    "type",
    "owner",
    "blocks",
    "blockedBy",
    "addBlocks",
    "addBlockedBy",
  ]);
});
//@ chunk-5xgkngpb.js:1853778-1853835 placement
/**
 * 判断值是非空字符串（去空白后）。
 */
function isNonEmptyString(value) {
  return typeof value === "string" && value.trim() !== "";
}
//@ chunk-5xgkngpb.js:1853835-1853882 placement
/**
 * 判断输入含 tasks 或 todos 字段（是待办列表）。
 */
function isTodoListInput(input) {
  return "tasks" in input || "todos" in input;
}
//@ chunk-5xgkngpb.js:1853882-1853938 placement
/**
 * 判断输入含 prompt 或 subagent_type 字段（是 Agent 调用）。
 */
function isSubagentTaskInput(input) {
  return "prompt" in input || "subagent_type" in input;
}
//@ chunk-5xgkngpb.js:1853938-1854099 placement
function deriveTaskSubject(description) {
  let trimmed = getFirstLine(description).trim();
  let list = Array.from(trimmed);
  if (list.length <= 80) return trimmed;
  let joined = list.slice(0, 80).join("");
  let index = joined.lastIndexOf(" ");
  return (index > 40 ? joined.slice(0, index) : joined).trim();
}
//@ chunk-5xgkngpb.js:1854099-1855299 affinity
/**
 * TaskCreate 的 coerceInput：修正 task 包裹、title/name 等别名、补齐 subject/description、去掉未知键。
 */
function coerceTaskCreateInput(rawInput) {
  if (!isPlainObject_6(rawInput)) return null;
  if (isTodoListInput(rawInput)) return null;
  let appliedAliases = [];
  let input = {
    ...rawInput,
  };
  if (isSubagentTaskInput(input) && !(isNonEmptyString(input.subject) && isNonEmptyString(input.description)))
    return null;
  if (!("subject" in input) && !("description" in input) && "task" in input) {
    let task = input.task;
    if (isNonEmptyString(task)) {
      delete input.task;
      input.description = task;
      appliedAliases.push("task_wrapper_string");
    } else if (isPlainObject_6(task)) {
      if (isTodoListInput(task)) return null;
      if (
        isSubagentTaskInput(task) &&
        !(isNonEmptyString(task.subject) && isNonEmptyString(task.description))
      )
        return null;
      delete input.task;
      Object.assign(input, task);
      appliedAliases.push("task_wrapper_object");
    } else return null;
  }
  let aliasGroups = [
    [SUBJECT_ALIASES, "subject"],
    [DESCRIPTION_ALIASES, "description"],
    [ACTIVE_FORM_ALIASES_2, "activeForm"],
  ];
  for (let [aliases, canonicalField] of aliasGroups)
    for (let alias of aliases)
      if (alias in input && !(canonicalField in input) && isNonEmptyString(input[alias])) {
        input[canonicalField] = input[alias];
        delete input[alias];
        appliedAliases.push(`alias_${alias}`);
      }
  if (isNonEmptyString(input.subject) && !("description" in input)) {
    input.description = input.subject;
    appliedAliases.push("backfill_description");
  } else if (isNonEmptyString(input.description) && !("subject" in input)) {
    input.subject = deriveTaskSubject(input.description);
    appliedAliases.push("backfill_subject");
  }
  if (isNonEmptyString(input.subject) && isNonEmptyString(input.description)) {
    for (let key of Object.keys(input))
      if (!TASK_INPUT_FIELDS.has(key)) {
        delete input[key];
        appliedAliases.push(`strip_${IGNORED_TASK_FIELDS.has(key) ? key : "other"}`);
      }
    if ("activeForm" in input && typeof input.activeForm !== "string") {
      delete input.activeForm;
      appliedAliases.push("drop_invalid_activeForm");
    }
    if ("metadata" in input && !isPlainObject_6(input.metadata)) {
      delete input.metadata;
      appliedAliases.push("drop_invalid_metadata");
    }
  }
  if (appliedAliases.length === 0) return null;
  return {
    input,
    shapeClass: appliedAliases.join("+"),
  };
}
export { coerceTaskCreateInput, isTodoListInput, isSubagentTaskInput, isNonEmptyString };
