/**
 * tools/TaskUpdateTool/inputAliases.ts
 *
 * 2.1.316 新增：TaskUpdate 工具输入别名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (3)
 * attribution: placement 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";

//@ chunk-5xgkngpb.js:1855927-1855972 placement
/**
 * TaskUpdate 中任务 id 的别名字段（id、task_id）。
 */
var TASK_ID_ALIASES = ["id", "task_id"];
var ACTIVE_FORM_ALIASES = ["active_form"];
//@ chunk-5xgkngpb.js:1855972-1856030 placement
/**
 * 判断值是非空字符串（去空白后）。
 */
function isNonBlankString(value) {
  return typeof value === "string" && value.trim() !== "";
}
//@ chunk-5xgkngpb.js:1856030-1856297 placement
/**
 * 把别名字段改为 taskId/activeForm。
 */
function normalizeTaskInputAliases(rawInput) {
  if (!isPlainObject_6(rawInput)) return null;
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
