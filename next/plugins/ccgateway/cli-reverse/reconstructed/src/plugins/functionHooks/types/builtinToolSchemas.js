/**
 * plugins/functionHooks/types/builtinToolSchemas.ts
 *
 * 内置工具输入 schema 获取与缓存（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (7)
 * attribution: placement 7
 */
import { __export } from "../../../../runtime/bun-runtime.js";
import { settingsJsonSchema } from "../../../utils/settings/schemaOutput.js";
import { logForDebugging } from "../../../utils/debug.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-7jxyna5q.js:10180-10191 placement
/**
 * 模块导出对象
 */
var BUILTIN_TOOL_SCHEMAS_EXPORTS = {};
//@ chunk-7jxyna5q.js:10191-10273 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-7jxyna5q.js:10191", () => {
  __export(BUILTIN_TOOL_SCHEMAS_EXPORTS, {
    builtinToolSchemasOf: () => builtinToolSchemasOf,
    default: () => BUILTIN_TOOL_SCHEMAS_EXPORTS,
    outputJsonSchemaOf: () => outputJsonSchemaOf,
  });
});
//@ chunk-7jxyna5q.js:373665-373809 placement
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
//@ chunk-7jxyna5q.js:373809-373823 placement
/**
 * zod → JSON Schema 的缓存
 */
var schemaConversionCache; // deferred: uses SchemaConversionCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-7jxyna5q.js:373809", () => {
  schemaConversionCache = new SchemaConversionCache();
});
//@ chunk-7jxyna5q.js:373823-373936 placement
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
//@ chunk-7jxyna5q.js:548401-548668 placement
function outputJsonSchemaOf(outputSchema) {
  try {
    let jsonSchema = settingsJsonSchema(outputSchema, {
      unrepresentable: "any",
    });
    let { properties } = jsonSchema;
    if (typeof properties === "object" && properties !== null && "codeModeRouted" in properties) {
      let { codeModeRouted, ...restProperties } = properties;
      return {
        ...jsonSchema,
        properties: restProperties,
      };
    }
    return jsonSchema;
  } catch (error) {
    logForDebugging(`tool types: an output schema did not convert: ${error}`);
    return;
  }
}
//@ chunk-7jxyna5q.js:548668-548847 placement
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
