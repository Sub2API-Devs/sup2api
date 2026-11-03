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
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { parseIntegerLike } from "./savedOutputPaths.js";

/**
 * 规范 Read 工具的 offset/limit 参数（数组、负数等）。
 */
//@ chunk-e6aww6q8.js:3157684-3158323 placement
function normalizeReadInputAliases(e) {
  if (!isPlainObject_4(e)) return null;
  let n = { ...e },
    r = [];
  if (Array.isArray(n.offset) && n.offset.length === 1) ((n.offset = n.offset[0]), r.push("offset_array"));
  if (Array.isArray(n.limit) && n.limit.length === 1) ((n.limit = n.limit[0]), r.push("limit_array"));
  let s = parseIntegerLike(n.offset);
  if (s !== void 0 && s < 0) (delete n.offset, r.push("offset_neg"));
  let h = parseIntegerLike(n.limit);
  if (h !== void 0 && h <= 0) (delete n.limit, r.push("limit_dropped"));
  if ("length" in n) {
    let y = parseIntegerLike(n.length);
    if (!("limit" in n) && y !== void 0 && y > 0) n.limit = y;
    (delete n.length, r.push("length"));
  }
  if (Object.hasOwn(n, "description")) (delete n.description, r.push("drop_description"));
  return r.length ? { input: n, shapeClass: r.join(",") } : null;
}

export { normalizeReadInputAliases };
