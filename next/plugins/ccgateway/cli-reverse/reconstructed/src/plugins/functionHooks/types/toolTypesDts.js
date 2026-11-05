/**
 * plugins/functionHooks/types/toolTypesDts.ts
 *
 * 生成 BuiltinToolInputs/McpToolInputs 类型声明（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-7jxyna5q.js (10), chunk-98xr2khk.js (1)
 * attribution: placement 11
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { jsonStringify } from "../../../utils/slowOperations.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { logForDebugging } from "../../../utils/debug.js";

//@ chunk-98xr2khk.js:191-220 placement
/**
 * TypeScript 标识符
 */
var TS_IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;
//@ chunk-7jxyna5q.js:545831-545895 placement
var sanitizeJsDocText = (description) => description.replace(/\s+/g, " ").trim().replace(/\*\//g, "* /");
//@ chunk-7jxyna5q.js:545895-546000 placement (2.1.88 match: parseSkillPaths, 0.822)
function formatJsDocLine(schema, indent) {
  let { description } = schema;
  let docText = typeof description === "string" ? sanitizeJsDocText(description) : "";
  return docText === ""
    ? ""
    : `${indent}/** ${docText} */
`;
}
//@ chunk-7jxyna5q.js:546000-546032 placement
/**
 * 非标识符则加引号
 */
var quoteIfNotIdentifier = (name) => (TS_IDENTIFIER_RE.test(name) ? name : jsonStringify(name));
//@ chunk-7jxyna5q.js:546032-546142 placement
function literalTsType(value) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
    ? jsonStringify(value)
    : "unknown";
}
//@ chunk-7jxyna5q.js:546142-546152 placement
/**
 * 32
 */
var MAX_TS_TYPE_DEPTH = 32;
//@ chunk-7jxyna5q.js:546152-547540 placement
/**
 * 把 JSON Schema 转成 TypeScript 类型文本（用于生成工具输入 d.ts）
 */
function jsonSchemaToTs(schema, indent = "", depth = 0) {
  if (schema === true || depth > MAX_TS_TYPE_DEPTH) return "unknown";
  if (schema === false) return "never";
  if (!isPlainObject(schema)) return "unknown";
  if ("const" in schema) return literalTsType(schema.const);
  if (Array.isArray(schema.enum)) return schema.enum.map(literalTsType).join(" | ") || "never";
  if (Array.isArray(schema.anyOf) || Array.isArray(schema.oneOf)) {
    let mapped = (schema.anyOf ?? schema.oneOf).map((branch) => jsonSchemaToTs(branch, indent, depth + 1));
    return mapped.length === 0 ? "unknown" : normalizeCaseForComparison_2(mapped).join(" | ");
  }
  if (Array.isArray(schema.allOf)) {
    let mapped = schema.allOf.map((branch) => jsonSchemaToTs(branch, indent, depth + 1));
    return mapped.length === 0
      ? "unknown"
      : mapped.map((text) => (text.includes(" | ") ? `(${text})` : text)).join(" & ");
  }
  if (Array.isArray(schema.type))
    return (
      normalizeCaseForComparison_2(
        schema.type.map((type) =>
          jsonSchemaToTs(
            {
              ...schema,
              type,
            },
            indent,
            depth + 1,
          ),
        ),
      ).join(" | ") || "unknown"
    );
  switch (schema.type) {
    case "string":
      return "string";
    case "number":
    case "integer":
      return "number";
    case "boolean":
      return "boolean";
    case "null":
      return "null";
    case "array": {
      if (Array.isArray(schema.items))
        return `[${schema.items.map((item) => jsonSchemaToTs(item, indent, depth + 1)).join(", ")}]`;
      let itemType = jsonSchemaToTs(schema.items, indent, depth + 1);
      return itemType.includes(" | ") || itemType.includes(" & ") || itemType.includes("/*")
        ? `Array<${itemType}>`
        : `${itemType}[]`;
    }
    case "object":
    case undefined: {
      if (!isPlainObject(schema.properties)) {
        let isObject = schema.type === "object";
        let hasRef = "$ref" in schema;
        return isObject
          ? "{}"
          : hasRef
            ? `unknown /* $ref ${sanitizeJsDocText(String(schema.$ref))} */`
            : "unknown";
      }
      let required = new Set(Array.isArray(schema.required) ? schema.required.map(String) : []);
      let fieldIndent = `${indent}  `;
      let mapped = Object.entries(schema.properties).map(([key, value]) => {
        let docLine = isPlainObject(value) ? formatJsDocLine(value, fieldIndent) : "";
        let optionalMark = required.has(key) ? "" : "?";
        let fieldType = jsonSchemaToTs(value, fieldIndent, depth + 1);
        return `${docLine}${fieldIndent}${quoteIfNotIdentifier(key)}${optionalMark}: ${fieldType}`;
      });
      return mapped.length === 0
        ? "{}"
        : `{
${mapped.join(`
`)}
${indent}}`;
    }
    default:
      return "unknown";
  }
}
//@ chunk-7jxyna5q.js:547540-547832 placement
/**
 * 生成 declare module 'claude-code' 中某工具输入接口的声明行（按名排序，带 JSDoc 描述）。
 */
var declareToolInputsInterface = (
  interfaceName,
  tools,
  typeOf = (tool) => jsonSchemaToTs(tool.inputSchema, "    "),
) => [
  "declare module 'claude-code' {",
  `  interface ${interfaceName} {`,
  ...[...tools]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((tool) => {
      let docLine =
        tool.description === undefined
          ? ""
          : formatJsDocLine(
              {
                description: tool.description,
              },
              "    ",
            );
      let name = quoteIfNotIdentifier(tool.name);
      return `${docLine}    ${name}: ${typeOf(tool)}`;
    }),
  "  }",
  "}",
];
//@ chunk-7jxyna5q.js:547832-548401 placement
var BUILTIN_TOOL_INPUTS_HEADER = (tools) =>
  [
    "// The inputs of the built-in tools this build has, from each tool's",
    "// input schema. Merges into ToolCallInput (BuiltinToolInputs) so",
    '// `e.tool === "Bash"` narrows to the tool\'s arguments.',
    ...declareToolInputsInterface("BuiltinToolInputs", tools),
    "",
    "// The structured results of the same tools, from each tool's output",
    "// schema. Merges into ToolCallResult (BuiltinToolResults) so after",
    '// `e.tool === "Bash"` the `result` of `next(e)` is the tool\'s record.',
    ...declareToolInputsInterface("BuiltinToolResults", tools, (tool) =>
      tool.outputSchema !== undefined ? jsonSchemaToTs(tool.outputSchema, "    ") : "unknown",
    ),
    "",
  ].join(`
`);
//@ chunk-7jxyna5q.js:548847-549260 placement
var MCP_TOOL_INPUTS_HEADER = (tools) =>
  [
    "// The inputs of the MCP tools the session had connected when this mod",
    "// was last saved, from each server's tools/list inputSchema.",
    "// Merges into the engine's ToolCallInput (types/ McpToolInputs) so",
    '// `e.tool === "mcp__<server>__<tool>"` narrows to the tool\'s arguments.',
    "// Written again at a save of the mod with a server connected.",
    "export {}",
    ...declareToolInputsInterface("McpToolInputs", tools),
    "",
  ].join(`
`);
//@ chunk-7jxyna5q.js:549260-549556 placement
function buildMcpToolInputTypes(tools) {
  let entries = [];
  for (let tool of tools) {
    if (!tool.name.startsWith("mcp__")) continue;
    if (tool.inputJSONSchema === undefined) {
      logForDebugging(`tool types: ${tool.name} has no inputJSONSchema; skipped`);
      continue;
    }
    entries.push({
      name: tool.name,
      inputSchema: tool.inputJSONSchema,
      ...(tool.description !== undefined && {
        description: tool.description,
      }),
    });
  }
  return entries;
}
export {
  BUILTIN_TOOL_INPUTS_HEADER,
  TS_IDENTIFIER_RE,
  buildMcpToolInputTypes,
  MCP_TOOL_INPUTS_HEADER,
  quoteIfNotIdentifier,
  jsonSchemaToTs,
};
