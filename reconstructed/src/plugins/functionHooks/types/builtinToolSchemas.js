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
/**
 * 模块导出对象
 */
var BUILTIN_TOOL_SCHEMAS_EXPORTS = {};
//@ chunk-s61vbvea.js:10215-10297 placement
Ar(BUILTIN_TOOL_SCHEMAS_EXPORTS, {
  builtinToolSchemasOf: () => builtinToolSchemasOf,
  default: () => BUILTIN_TOOL_SCHEMAS_EXPORTS,
  outputJsonSchemaOf: () => outputJsonSchemaOf,
});
//@ chunk-s61vbvea.js:454996-455140 placement
/**
 * 按 zod schema 对象缓存其 JSON Schema 转换结果（WeakMap，可重置）。
 */
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
/**
 * zod → JSON Schema 的缓存
 */
var schemaConversionCache = new SchemaConversionCache();
//@ chunk-s61vbvea.js:455154-455267 placement
/**
 * 把工具的 zod 输入 schema 转为 JSON Schema（不可表示时抛错），结果按 schema 缓存。被工具 API schema、延迟工具统计、serve 模式等使用。
 */
function toolInputJsonSchema(inputSchema) {
  let n = schemaConversionCache.lookup(inputSchema);
  if (n) return n;
  let r = settingsJsonSchema(inputSchema, {
    unrepresentable: "throw",
  });
  schemaConversionCache.remember(inputSchema, r);
  return r;
}
//@ chunk-s61vbvea.js:626893-627024 placement
function outputJsonSchemaOf(outputSchema) {
  try {
    return settingsJsonSchema(outputSchema, {
      unrepresentable: "any",
    });
  } catch (error) {
    logForDebugging(`tool types: an output schema did not convert: ${error}`);
    return;
  }
}
//@ chunk-s61vbvea.js:627024-627203 placement
var builtinToolSchemasOf = (allBaseToolsFromRegistry) =>
  allBaseToolsFromRegistry
    .filter((n) => n.isMcp !== true)
    .map((n) => ({
      name: n.name,
      inputSchema: n.inputJSONSchema ?? toolInputJsonSchema(n.inputSchema),
      ...(n.outputSchema !== undefined && {
        outputSchema: outputJsonSchemaOf(n.outputSchema),
      }),
    }));
export { toolInputJsonSchema, builtinToolSchemasOf };
