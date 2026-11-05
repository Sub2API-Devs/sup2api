/**
 * tools/FileReadTool/inputAliases.ts
 *
 * 2.1.316 新增：Read 工具输入参数别名
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (1)
 * attribution: placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPlainObject as isPlainObject_6 } from "../../utils/isPlainObject.js";
import { parseIntegerLike } from "./savedOutputPaths.js";

//@ chunk-5xgkngpb.js:3242742-3243381 placement
/**
 * 规范 Read 工具的 offset/limit 参数（数组、负数等）。
 */
function normalizeReadInputAliases(rawInput) {
  if (!isPlainObject_6(rawInput)) return null;
  let normalizedInput = {
    ...rawInput,
  };
  let appliedAliases = [];
  if (Array.isArray(normalizedInput.offset) && normalizedInput.offset.length === 1) {
    normalizedInput.offset = normalizedInput.offset[0];
    appliedAliases.push("offset_array");
  }
  if (Array.isArray(normalizedInput.limit) && normalizedInput.limit.length === 1) {
    normalizedInput.limit = normalizedInput.limit[0];
    appliedAliases.push("limit_array");
  }
  let integerLike = parseIntegerLike(normalizedInput.offset);
  if (integerLike !== undefined && integerLike < 0) {
    delete normalizedInput.offset;
    appliedAliases.push("offset_neg");
  }
  let integerLike_2 = parseIntegerLike(normalizedInput.limit);
  if (integerLike_2 !== undefined && integerLike_2 <= 0) {
    delete normalizedInput.limit;
    appliedAliases.push("limit_dropped");
  }
  if ("length" in normalizedInput) {
    let integerLike = parseIntegerLike(normalizedInput.length);
    if (!("limit" in normalizedInput) && integerLike !== undefined && integerLike > 0)
      normalizedInput.limit = integerLike;
    delete normalizedInput.length;
    appliedAliases.push("length");
  }
  if (Object.hasOwn(normalizedInput, "description")) {
    delete normalizedInput.description;
    appliedAliases.push("drop_description");
  }
  return appliedAliases.length
    ? {
        input: normalizedInput,
        shapeClass: appliedAliases.join(","),
      }
    : null;
}
export { normalizeReadInputAliases };
