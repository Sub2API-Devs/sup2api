/**
 * utils/toolInputPlaceholder.ts
 *
 * 2.1.316 新增：为缺少必填字段的工具输入生成占位值；按 schema 类型生成占位值等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (3)
 * attribution: placement 3
 */
import {
  B1e,
  lMn,
  ZodNumber,
  ZodBoolean,
  ZodArray,
  ZodEnum,
  ZodLiteral,
} from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "./slowOperations.js";

//@ chunk-aepeg2w5.js:76039-76138 placement
/**
 * 是否为空对象。
 */
function isEmptyObject(updatedInput) {
  return (
    typeof updatedInput === "object" &&
    updatedInput !== null &&
    !Array.isArray(updatedInput) &&
    Object.keys(updatedInput).length === 0
  );
}
//@ chunk-aepeg2w5.js:76138-76644 placement
/**
 * 为缺少必填字段的工具输入生成占位值。
 */
function placeholderToolInput(name, inputSchema) {
  try {
    if (!(inputSchema instanceof B1e)) return null;
    let shape = inputSchema.shape;
    let filtered = Object.entries(shape).filter(([, value]) => !value.safeParse(undefined).success);
    if (filtered.length === 0) return null;
    let h = {};
    for (let [S, w] of filtered) h[S] = placeholderForSchema(S, w);
    if (!inputSchema.safeParse(h).success) return null;
    let joined = filtered.map(([S]) => `\`${S}\``).join(", ");
    return `The ${name} tool was called with an empty input object ({}), but it has required parameters: ${joined}. Minimal valid call shape: ${jsonStringify(h)}. Re-issue the call with real values for each required parameter.`;
  } catch {
    return null;
  }
}
//@ chunk-aepeg2w5.js:76644-76946 placement
/**
 * 按 schema 类型生成占位值。
 */
function placeholderForSchema(e, n) {
  if (n instanceof lMn) return `<${e}>`;
  if (n instanceof ZodNumber) return 0;
  if (n instanceof ZodBoolean) return false;
  if (n instanceof ZodArray) return [];
  if (n instanceof ZodEnum) {
    let options = n.options;
    if (Array.isArray(options) && options.length > 0) return options[0];
  }
  if (n instanceof ZodLiteral) {
    let r = [...n.values];
    if (r.length > 0) return r[0];
  }
  return `<${e}>`;
}
export { isEmptyObject, placeholderToolInput };
