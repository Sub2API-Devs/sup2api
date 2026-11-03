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
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";

/**
 * TaskCreate 输入的规范字段与可接受的别名（title/name → subject、content → description、active_form → activeForm），以及会被忽略的其他字段名。
 */
//@ chunk-e6aww6q8.js:1776548-1776808 placement
var TASK_INPUT_FIELDS = new Set(["subject", "description", "activeForm", "metadata"]),
  SUBJECT_ALIASES = ["title", "name"],
  DESCRIPTION_ALIASES = ["content"],
  ACTIVE_FORM_ALIASES = ["active_form"],
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
//@ chunk-e6aww6q8.js:1776808-1776865 placement
function Dv(e) {
  return typeof e === "string" && e.trim() !== "";
}
//@ chunk-e6aww6q8.js:1776865-1776912 placement
function Mwe(e) {
  return "tasks" in e || "todos" in e;
}
//@ chunk-e6aww6q8.js:1776912-1776968 placement
function Owe(e) {
  return "prompt" in e || "subagent_type" in e;
}
//@ chunk-e6aww6q8.js:1776968-1777129 placement
function deriveTaskSubject(e) {
  let trimmed = getFirstLine(e).trim(),
    list = Array.from(trimmed);
  if (list.length <= 80) return trimmed;
  let joined = list.slice(0, 80).join(""),
    index = joined.lastIndexOf(" ");
  return (index > 40 ? joined.slice(0, index) : joined).trim();
}
/**
 * TaskCreate 的 coerceInput：修正 task 包裹、title/name 等别名、补齐 subject/description、去掉未知键。
 */
//@ chunk-e6aww6q8.js:1777129-1778329 affinity
function coerceTaskCreateInput(rawInput) {
  if (!isPlainObject_4(rawInput)) return null;
  if (Mwe(rawInput)) return null;
  let n = [],
    r = { ...rawInput };
  if (Owe(r) && !(Dv(r.subject) && Dv(r.description))) return null;
  if (!("subject" in r) && !("description" in r) && "task" in r) {
    let task = r.task;
    if (Dv(task)) (delete r.task, (r.description = task), n.push("task_wrapper_string"));
    else if (isPlainObject_4(task)) {
      if (Mwe(task)) return null;
      if (Owe(task) && !(Dv(task.subject) && Dv(task.description))) return null;
      (delete r.task, Object.assign(r, task), n.push("task_wrapper_object"));
    } else return null;
  }
  let s = [
    [SUBJECT_ALIASES, "subject"],
    [DESCRIPTION_ALIASES, "description"],
    [ACTIVE_FORM_ALIASES, "activeForm"],
  ];
  for (let [h, y] of s)
    for (let S of h) if (S in r && !(y in r) && Dv(r[S])) ((r[y] = r[S]), delete r[S], n.push(`alias_${S}`));
  if (Dv(r.subject) && !("description" in r)) ((r.description = r.subject), n.push("backfill_description"));
  else if (Dv(r.description) && !("subject" in r))
    ((r.subject = deriveTaskSubject(r.description)), n.push("backfill_subject"));
  if (Dv(r.subject) && Dv(r.description)) {
    for (let h of Object.keys(r))
      if (!TASK_INPUT_FIELDS.has(h))
        (delete r[h], n.push(`strip_${IGNORED_TASK_FIELDS.has(h) ? h : "other"}`));
    if ("activeForm" in r && typeof r.activeForm !== "string")
      (delete r.activeForm, n.push("drop_invalid_activeForm"));
    if ("metadata" in r && !isPlainObject_4(r.metadata)) (delete r.metadata, n.push("drop_invalid_metadata"));
  }
  if (n.length === 0) return null;
  return { input: r, shapeClass: n.join("+") };
}

export { coerceTaskCreateInput, Mwe, Owe, Dv };
