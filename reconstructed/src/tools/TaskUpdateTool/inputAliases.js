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
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";

//@ chunk-e6aww6q8.js:1778957-1779002 placement
var J8o = ["id", "task_id"],
  Z8o = ["active_form"];
//@ chunk-e6aww6q8.js:1779002-1779060 placement
function e7o(e) {
  return typeof e === "string" && e.trim() !== "";
}
/**
 * 把别名字段改为 taskId/activeForm。
 */
//@ chunk-e6aww6q8.js:1779060-1779327 placement
function normalizeTaskInputAliases(e) {
  if (!isPlainObject_4(e)) return null;
  let n = [],
    r = { ...e },
    s = [
      [J8o, "taskId"],
      [Z8o, "activeForm"],
    ];
  for (let [h, y] of s)
    for (let S of h) if (S in r && !(y in r) && e7o(r[S])) ((r[y] = r[S]), delete r[S], n.push(`alias_${S}`));
  if (n.length === 0) return null;
  return { input: r, shapeClass: n.join("+") };
}

export { normalizeTaskInputAliases };
