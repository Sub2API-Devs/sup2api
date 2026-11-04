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
import { __export } from "../../../../runtime/bun-runtime.js";
import { settingsJsonSchema } from "../../../utils/settings/schemaOutput.js";
import { logForDebugging } from "../../../utils/debug.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-s61vbvea.js:10204-10215 placement
/**
 * 模块导出对象
 */
var BUILTIN_TOOL_SCHEMAS_EXPORTS = {};
//@ chunk-s61vbvea.js:10215-10297 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-s61vbvea.js:10215", () => {
  __export(BUILTIN_TOOL_SCHEMAS_EXPORTS, {
    builtinToolSchemasOf: () => builtinToolSchemasOf,
    default: () => BUILTIN_TOOL_SCHEMAS_EXPORTS,
    outputJsonSchemaOf: () => outputJsonSchemaOf,
  });
});
//@ chunk-s61vbvea.js:454996-455140 placement
/**
 * 按 zod schema 对象缓存其 JSON Schema 转换结果（WeakMap，可重置）。
 */
class SchemaConversionCache {
  converted = new WeakMap();
  lookup(schema) {
    return this.converted.get(schema);
  }
  remember(schema, jsonSchema) {
    this.converted.set(schema, jsonSchema);
  }
  reset() {
    this.converted = new WeakMap();
  }
}
//@ chunk-s61vbvea.js:455140-455154 placement
/**
 * zod → JSON Schema 的缓存
 */
var schemaConversionCache; // deferred: uses SchemaConversionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-s61vbvea.js:455140", () => {
  schemaConversionCache = new SchemaConversionCache();
});
//@ chunk-s61vbvea.js:455154-455267 placement
/**
 * 把工具的 zod 输入 schema 转为 JSON Schema（不可表示时抛错），结果按 schema 缓存。被工具 API schema、延迟工具统计、serve 模式等使用。
 */
function toolInputJsonSchema(inputSchema) {
  let cached = schemaConversionCache.lookup(inputSchema);
  if (cached) return cached;
  let jsonSchema = settingsJsonSchema(inputSchema, {
    unrepresentable: "throw",
  });
  schemaConversionCache.remember(inputSchema, jsonSchema);
  return jsonSchema;
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
    .filter((tool) => tool.isMcp !== true)
    .map((tool) => ({
      name: tool.name,
      inputSchema: tool.inputJSONSchema ?? toolInputJsonSchema(tool.inputSchema),
      ...(tool.outputSchema !== undefined && {
        outputSchema: outputJsonSchemaOf(tool.outputSchema),
      }),
    }));
export { toolInputJsonSchema, builtinToolSchemasOf, BUILTIN_TOOL_SCHEMAS_EXPORTS, outputJsonSchemaOf };
