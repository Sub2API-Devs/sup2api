/**
 * tools/TaskUpdateTool/inputAliases.ts
 *
 * 2.1.316 新增：TaskUpdate 工具输入别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (3)
 * attribution: placement 3
 */
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";

//@ chunk-e6aww6q8.js:1778957-1779002 placement
/**
 * TaskUpdate 中任务 id 的别名字段（id、task_id）。
 */
var TASK_ID_ALIASES = ["id", "task_id"];
var ACTIVE_FORM_ALIASES = ["active_form"];
//@ chunk-e6aww6q8.js:1779002-1779060 placement
/**
 * 判断值是非空字符串（去空白后）。
 */
function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}
//@ chunk-e6aww6q8.js:1779060-1779327 placement
/**
 * 把别名字段改为 taskId/activeForm。
 */
function normalizeTaskInputAliases(rawInput) {
  if (!isPlainObject_5(rawInput)) return null;
  let appliedAliases = [];
  let input = {
    ...rawInput,
  };
  let aliasGroups = [
    [TASK_ID_ALIASES, "taskId"],
    [ACTIVE_FORM_ALIASES, "activeForm"],
  ];
  for (let [aliases, canonicalField] of aliasGroups)
    for (let alias of aliases)
      if (alias in input && !(canonicalField in input) && isNonBlankString(input[alias])) {
        input[canonicalField] = input[alias];
        delete input[alias];
        appliedAliases.push(`alias_${alias}`);
      }
  if (appliedAliases.length === 0) return null;
  return {
    input,
    shapeClass: appliedAliases.join("+"),
  };
}
export { normalizeTaskInputAliases };
