/**
 * tools/TaskCreateTool/inputAliases.ts
 *
 * 2.1.316 新增：TaskCreate 工具输入别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (6)
 * attribution: placement 5, affinity 1
 */
import { getFirstLine } from "../../utils/stringUtils.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";

//@ chunk-e6aww6q8.js:1776548-1776808 placement
/**
 * TaskCreate 输入的规范字段与可接受的别名（title/name → subject、content → description、active_form → activeForm），以及会被忽略的其他字段名。
 */
var TASK_INPUT_FIELDS = new Set(["subject", "description", "activeForm", "metadata"]);
var SUBJECT_ALIASES = ["title", "name"];
var DESCRIPTION_ALIASES = ["content"];
var ACTIVE_FORM_ALIASES_2 = ["active_form"];
var IGNORED_TASK_FIELDS = new Set([
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
//@ chunk-e6aww6q8.js:1776808-1776865 placement
/**
 * 判断值是非空字符串（去空白后）。
 */
function isNonEmptyString(e) {
  return typeof e === "string" && e.trim() !== "";
}
//@ chunk-e6aww6q8.js:1776865-1776912 placement
/**
 * 判断输入含 tasks 或 todos 字段（是待办列表）。
 */
function isTodoListInput(e) {
  return "tasks" in e || "todos" in e;
}
//@ chunk-e6aww6q8.js:1776912-1776968 placement
/**
 * 判断输入含 prompt 或 subagent_type 字段（是 Agent 调用）。
 */
function isSubagentTaskInput(e) {
  return "prompt" in e || "subagent_type" in e;
}
//@ chunk-e6aww6q8.js:1776968-1777129 placement
function deriveTaskSubject(description) {
  let trimmed = getFirstLine(description).trim();
  let list = Array.from(trimmed);
  if (list.length <= 80) return trimmed;
  let joined = list.slice(0, 80).join("");
  let index = joined.lastIndexOf(" ");
  return (index > 40 ? joined.slice(0, index) : joined).trim();
}
//@ chunk-e6aww6q8.js:1777129-1778329 affinity
/**
 * TaskCreate 的 coerceInput：修正 task 包裹、title/name 等别名、补齐 subject/description、去掉未知键。
 */
function coerceTaskCreateInput(rawInput) {
  if (!isPlainObject_5(rawInput)) return null;
  if (isTodoListInput(rawInput)) return null;
  let n = [];
  let r = {
    ...rawInput,
  };
  if (isSubagentTaskInput(r) && !(isNonEmptyString(r.subject) && isNonEmptyString(r.description)))
    return null;
  if (!("subject" in r) && !("description" in r) && "task" in r) {
    let task = r.task;
    if (isNonEmptyString(task)) {
      delete r.task;
      r.description = task;
      n.push("task_wrapper_string");
    } else if (isPlainObject_5(task)) {
      if (isTodoListInput(task)) return null;
      if (
        isSubagentTaskInput(task) &&
        !(isNonEmptyString(task.subject) && isNonEmptyString(task.description))
      )
        return null;
      delete r.task;
      Object.assign(r, task);
      n.push("task_wrapper_object");
    } else return null;
  }
  let s = [
    [SUBJECT_ALIASES, "subject"],
    [DESCRIPTION_ALIASES, "description"],
    [ACTIVE_FORM_ALIASES_2, "activeForm"],
  ];
  for (let [h, y] of s)
    for (let S of h)
      if (S in r && !(y in r) && isNonEmptyString(r[S])) {
        r[y] = r[S];
        delete r[S];
        n.push(`alias_${S}`);
      }
  if (isNonEmptyString(r.subject) && !("description" in r)) {
    r.description = r.subject;
    n.push("backfill_description");
  } else if (isNonEmptyString(r.description) && !("subject" in r)) {
    r.subject = deriveTaskSubject(r.description);
    n.push("backfill_subject");
  }
  if (isNonEmptyString(r.subject) && isNonEmptyString(r.description)) {
    for (let key of Object.keys(r))
      if (!TASK_INPUT_FIELDS.has(key)) {
        delete r[key];
        n.push(`strip_${IGNORED_TASK_FIELDS.has(key) ? key : "other"}`);
      }
    if ("activeForm" in r && typeof r.activeForm !== "string") {
      delete r.activeForm;
      n.push("drop_invalid_activeForm");
    }
    if ("metadata" in r && !isPlainObject_5(r.metadata)) {
      delete r.metadata;
      n.push("drop_invalid_metadata");
    }
  }
  if (n.length === 0) return null;
  return {
    input: r,
    shapeClass: n.join("+"),
  };
}
export { coerceTaskCreateInput, isTodoListInput, isSubagentTaskInput, isNonEmptyString };
