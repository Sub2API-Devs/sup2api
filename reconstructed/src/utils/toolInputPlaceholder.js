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
import { B1e, lMn, KJt, dMn, Jgs, rSr, Qgs } from "../../vendor/zod/v4/classic/schemas.js";
import { jsonStringify } from "./slowOperations.js";

/**
 * 是否为空对象。
 */
//@ chunk-aepeg2w5.js:76039-76138 placement
function isEmptyObject(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e) && Object.keys(e).length === 0;
}
/**
 * 为缺少必填字段的工具输入生成占位值。
 */
//@ chunk-aepeg2w5.js:76138-76644 placement
function placeholderToolInput(e, n) {
  try {
    if (!(n instanceof B1e)) return null;
    let shape = n.shape,
      filtered = Object.entries(shape).filter(([, S]) => !S.safeParse(void 0).success);
    if (filtered.length === 0) return null;
    let h = {};
    for (let [S, w] of filtered) h[S] = placeholderForSchema(S, w);
    if (!n.safeParse(h).success) return null;
    let joined = filtered.map(([S]) => `\`${S}\``).join(", ");
    return `The ${e} tool was called with an empty input object ({}), but it has required parameters: ${joined}. Minimal valid call shape: ${jsonStringify(h)}. Re-issue the call with real values for each required parameter.`;
  } catch {
    return null;
  }
}
/**
 * 按 schema 类型生成占位值。
 */
//@ chunk-aepeg2w5.js:76644-76946 placement
function placeholderForSchema(e, n) {
  if (n instanceof lMn) return `<${e}>`;
  if (n instanceof KJt) return 0;
  if (n instanceof dMn) return !1;
  if (n instanceof Jgs) return [];
  if (n instanceof rSr) {
    let options = n.options;
    if (Array.isArray(options) && options.length > 0) return options[0];
  }
  if (n instanceof Qgs) {
    let r = [...n.values];
    if (r.length > 0) return r[0];
  }
  return `<${e}>`;
}

export { isEmptyObject, placeholderToolInput };
