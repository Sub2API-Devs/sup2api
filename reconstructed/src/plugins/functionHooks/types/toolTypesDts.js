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
function formatJsDocLine(e, n) {
  let { description } = e;
  let h = typeof description === "string" ? sanitizeJsDocText(description) : "";
  return h === ""
    ? ""
    : `${n}/** ${h} */
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
var quoteIfNotIdentifier = (e) => (TS_IDENTIFIER_RE.test(e) ? e : jsonStringify(e));
//@ chunk-s61vbvea.js:624535-624645 placement
function literalTsType(e) {
  return typeof e === "string" || typeof e === "number" || typeof e === "boolean" || e === null
    ? jsonStringify(e)
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
function jsonSchemaToTs(e, n = "", r = 0) {
  if (e === true || r > MAX_TS_TYPE_DEPTH) return "unknown";
  if (e === false) return "never";
  if (!isPlainObject(e)) return "unknown";
  if ("const" in e) return literalTsType(e.const);
  if (Array.isArray(e.enum)) return e.enum.map(literalTsType).join(" | ") || "never";
  if (Array.isArray(e.anyOf) || Array.isArray(e.oneOf)) {
    let mapped = (e.anyOf ?? e.oneOf).map((h) => jsonSchemaToTs(h, n, r + 1));
    return mapped.length === 0 ? "unknown" : uniq(mapped).join(" | ");
  }
  if (Array.isArray(e.allOf)) {
    let mapped = e.allOf.map((y) => jsonSchemaToTs(y, n, r + 1));
    return mapped.length === 0
      ? "unknown"
      : mapped.map((y) => (y.includes(" | ") ? `(${y})` : y)).join(" & ");
  }
  if (Array.isArray(e.type))
    return (
      uniq(
        e.type.map((type) =>
          jsonSchemaToTs(
            {
              ...e,
              type,
            },
            n,
            r + 1,
          ),
        ),
      ).join(" | ") || "unknown"
    );
  switch (e.type) {
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
      if (Array.isArray(e.items))
        return `[${e.items.map((item) => jsonSchemaToTs(item, n, r + 1)).join(", ")}]`;
      let s = jsonSchemaToTs(e.items, n, r + 1);
      return s.includes(" | ") || s.includes(" & ") || s.includes("/*") ? `Array<${s}>` : `${s}[]`;
    }
    case "object":
    case undefined: {
      if (!isPlainObject(e.properties)) {
        let w = e.type === "object";
        let R = "$ref" in e;
        return w ? "{}" : R ? `unknown /* $ref ${sanitizeJsDocText(String(e.$ref))} */` : "unknown";
      }
      let s = new Set(Array.isArray(e.required) ? e.required.map(String) : []);
      let h = `${n}  `;
      let mapped = Object.entries(e.properties).map(([key, value]) => {
        let x = isPlainObject(value) ? formatJsDocLine(value, h) : "";
        let P = s.has(key) ? "" : "?";
        let j = jsonSchemaToTs(value, h, r + 1);
        return `${x}${h}${quoteIfNotIdentifier(key)}${P}: ${j}`;
      });
      return mapped.length === 0
        ? "{}"
        : `{
${mapped.join(`
`)}
${n}}`;
    }
    default:
      return "unknown";
  }
}
//@ chunk-s61vbvea.js:626035-626325 placement
/**
 * 生成 declare module 'claude-code' 中某工具输入接口的声明行（按名排序，带 JSDoc 描述）。
 */
var declareToolInputsInterface = (e, n, r = (s) => jsonSchemaToTs(s.inputSchema, "    ")) => [
  "declare module 'claude-code' {",
  `  interface ${e} {`,
  ...[...n]
    .sort((s, h) => s.name.localeCompare(h.name))
    .map((s) => {
      let y =
        s.description === undefined
          ? ""
          : formatJsDocLine(
              {
                description: s.description,
              },
              "    ",
            );
      let S = quoteIfNotIdentifier(s.name);
      return `${y}    ${S}: ${r(s)}`;
    }),
  "  }",
  "}",
];
//@ chunk-s61vbvea.js:626325-626893 placement
var BUILTIN_TOOL_INPUTS_HEADER = (e) =>
  [
    "// The inputs of the built-in tools this build has, from each tool's",
    "// input schema. Merges into ToolCallInput (BuiltinToolInputs) so",
    '// `e.tool === "Bash"` narrows to the tool\'s arguments.',
    ...declareToolInputsInterface("BuiltinToolInputs", e),
    "",
    "// The structured results of the same tools, from each tool's output",
    "// schema. Merges into ToolCallResult (BuiltinToolResults) so after",
    '// `e.tool === "Bash"` the `result` of `next(e)` is the tool\'s record.',
    ...declareToolInputsInterface("BuiltinToolResults", e, (n) =>
      n.outputSchema !== undefined ? jsonSchemaToTs(n.outputSchema, "    ") : "unknown",
    ),
    "",
  ].join(`
`);
//@ chunk-s61vbvea.js:627203-627616 placement
var MCP_TOOL_INPUTS_HEADER = (e) =>
  [
    "// The inputs of the MCP tools the session had connected when this mod",
    "// was last saved, from each server's tools/list inputSchema.",
    "// Merges into the engine's ToolCallInput (types/ McpToolInputs) so",
    '// `e.tool === "mcp__<server>__<tool>"` narrows to the tool\'s arguments.',
    "// Written again at a save of the mod with a server connected.",
    "export {}",
    ...declareToolInputsInterface("McpToolInputs", e),
    "",
  ].join(`
`);
//@ chunk-s61vbvea.js:627616-627912 placement
function buildMcpToolInputTypes(e) {
  let n = [];
  for (let r of e) {
    if (!r.name.startsWith("mcp__")) continue;
    if (r.inputJSONSchema === undefined) {
      logForDebugging(`tool types: ${r.name} has no inputJSONSchema; skipped`);
      continue;
    }
    n.push({
      name: r.name,
      inputSchema: r.inputJSONSchema,
      ...(r.description !== undefined && {
        description: r.description,
      }),
    });
  }
  return n;
}
export { BUILTIN_TOOL_INPUTS_HEADER, buildMcpToolInputTypes, MCP_TOOL_INPUTS_HEADER };
