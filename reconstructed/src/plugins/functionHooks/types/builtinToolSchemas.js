/**
 * plugins/functionHooks/types/builtinToolSchemas.ts
 *
 * 内置工具输入 schema 获取与缓存（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (7)
 * attribution: placement 7
 */
import { Ar } from "../../../../runtime/bun-runtime.js";
import { settingsJsonSchema } from "../../../utils/settings/schemaOutput.js";
import { logForDebugging } from "../../../utils/debug.js";

//@ chunk-s61vbvea.js:10204-10215 placement
var E4o = {};
//@ chunk-s61vbvea.js:10215-10297 placement
Ar(E4o, {
  builtinToolSchemasOf: () => builtinToolSchemasOf,
  default: () => E4o,
  outputJsonSchemaOf: () => outputJsonSchemaOf,
});
/**
 * 按 zod schema 对象缓存其 JSON Schema 转换结果（WeakMap，可重置）。
 */
//@ chunk-s61vbvea.js:454996-455140 placement
class SchemaConversionCache {
  converted = new WeakMap();
  lookup(e) {
    return this.converted.get(e);
  }
  remember(e, n) {
    this.converted.set(e, n);
  }
  reset() {
    this.converted = new WeakMap();
  }
}
//@ chunk-s61vbvea.js:455140-455154 placement
var jb = new SchemaConversionCache();
/**
 * 把工具的 zod 输入 schema 转为 JSON Schema（不可表示时抛错），结果按 schema 缓存。被工具 API schema、延迟工具统计、serve 模式等使用。
 */
//@ chunk-s61vbvea.js:455154-455267 placement
function toolInputJsonSchema(e) {
  let lookup = jb.lookup(e);
  if (lookup) return lookup;
  let r = settingsJsonSchema(e, { unrepresentable: "throw" });
  return (jb.remember(e, r), r);
}
//@ chunk-s61vbvea.js:626893-627024 placement
function outputJsonSchemaOf(e) {
  try {
    return settingsJsonSchema(e, { unrepresentable: "any" });
  } catch (error) {
    logForDebugging(`tool types: an output schema did not convert: ${error}`);
    return;
  }
}
//@ chunk-s61vbvea.js:627024-627203 placement
var builtinToolSchemasOf = (e) =>
  e
    .filter((n) => n.isMcp !== !0)
    .map((n) => ({
      name: n.name,
      inputSchema: n.inputJSONSchema ?? toolInputJsonSchema(n.inputSchema),
      ...(n.outputSchema !== void 0 && { outputSchema: outputJsonSchemaOf(n.outputSchema) }),
    }));

export { toolInputJsonSchema, builtinToolSchemasOf };
