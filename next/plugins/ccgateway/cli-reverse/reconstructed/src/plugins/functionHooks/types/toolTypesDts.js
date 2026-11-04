/**
 * plugins/functionHooks/types/toolTypesDts.ts
 *
 * 生成 BuiltinToolInputs/McpToolInputs 类型声明（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-s61vbvea.js (11)
 * attribution: placement 11
 */
import { jsonStringify } from "../../../utils/slowOperations.js";
import { isPlainObject } from "../../../utils/isPlainObject.js";
import { uniq } from "../../../utils/collections.js";
import { logForDebugging } from "../../../utils/debug.js";

//@ chunk-s61vbvea.js:624308-624372 placement
var sanitizeJsDocText = (description) => description.replace(/\s+/g, " ").trim().replace(/\*\//g, "* /");
//@ chunk-s61vbvea.js:624372-624477 placement = parseSkillPaths (0.822)
function formatJsDocLine(schema, indent) {
  let { description } = schema;
  let docText = typeof description === "string" ? sanitizeJsDocText(description) : "";
  return docText === ""
    ? ""
    : `${indent}/** ${docText} */
`;
}
//@ chunk-s61vbvea.js:624477-624505 placement
/**
 * TypeScript 标识符
 */
var TS_IDENTIFIER_RE = /^[A-Za-z_$][\w$]*$/;
//@ chunk-s61vbvea.js:624505-624535 placement
/**
 * 非标识符则加引号
 */
var quoteIfNotIdentifier = (name) => (TS_IDENTIFIER_RE.test(name) ? name : jsonStringify(name));
//@ chunk-s61vbvea.js:624535-624645 placement
function literalTsType(value) {
  return typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
    ? jsonStringify(value)
    : "unknown";
}
//@ chunk-s61vbvea.js:624645-624655 placement
/**
 * 32
 */
var MAX_TS_TYPE_DEPTH = 32;
//@ chunk-s61vbvea.js:624655-626035 placement
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
    return mapped.length === 0 ? "unknown" : uniq(mapped).join(" | ");
  }
  if (Array.isArray(schema.allOf)) {
    let mapped = schema.allOf.map((branch) => jsonSchemaToTs(branch, indent, depth + 1));
    return mapped.length === 0
      ? "unknown"
      : mapped.map((text) => (text.includes(" | ") ? `(${text})` : text)).join(" & ");
  }
  if (Array.isArray(schema.type))
    return (
      uniq(
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
//@ chunk-s61vbvea.js:626035-626325 placement
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
//@ chunk-s61vbvea.js:626325-626893 placement
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
//@ chunk-s61vbvea.js:627203-627616 placement
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
//@ chunk-s61vbvea.js:627616-627912 placement
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
export { BUILTIN_TOOL_INPUTS_HEADER, buildMcpToolInputTypes, MCP_TOOL_INPUTS_HEADER };
