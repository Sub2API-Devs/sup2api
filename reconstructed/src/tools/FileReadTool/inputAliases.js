/**
 * tools/FileReadTool/inputAliases.ts
 *
 * 2.1.316 新增：Read 工具输入参数别名
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (1)
 * attribution: placement 1
 */
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { parseIntegerLike } from "./savedOutputPaths.js";

//@ chunk-e6aww6q8.js:3157684-3158323 placement
/**
 * 规范 Read 工具的 offset/limit 参数（数组、负数等）。
 */
function normalizeReadInputAliases(e) {
  if (!isPlainObject_5(e)) return null;
  let n = {
    ...e,
  };
  let r = [];
  if (Array.isArray(n.offset) && n.offset.length === 1) {
    n.offset = n.offset[0];
    r.push("offset_array");
  }
  if (Array.isArray(n.limit) && n.limit.length === 1) {
    n.limit = n.limit[0];
    r.push("limit_array");
  }
  let integerLike = parseIntegerLike(n.offset);
  if (integerLike !== undefined && integerLike < 0) {
    delete n.offset;
    r.push("offset_neg");
  }
  let integerLike_2 = parseIntegerLike(n.limit);
  if (integerLike_2 !== undefined && integerLike_2 <= 0) {
    delete n.limit;
    r.push("limit_dropped");
  }
  if ("length" in n) {
    let integerLike = parseIntegerLike(n.length);
    if (!("limit" in n) && integerLike !== undefined && integerLike > 0) n.limit = integerLike;
    delete n.length;
    r.push("length");
  }
  if (Object.hasOwn(n, "description")) {
    delete n.description;
    r.push("drop_description");
  }
  return r.length
    ? {
        input: n,
        shapeClass: r.join(","),
      }
    : null;
}
export { normalizeReadInputAliases };
