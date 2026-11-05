/**
 * tools/REPLTool/mcpArgs.ts
 *
 * MCP 工具调用的未声明参数检查与说明（2.1.318 新增）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-n51jggtb.js (7)
 * attribution: placement 7
 */
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";

//@ chunk-n51jggtb.js:91966-92124 placement
/**
 * 允许出现在顶层 schema 的关键字白名单。
 */
var TOP_LEVEL_SCHEMA_KEYS = new Set([
  "type",
  "properties",
  "required",
  "additionalProperties",
  "description",
  "title",
  "$schema",
  "$comment",
  "$defs",
  "definitions",
  "examples",
  "default",
]);
//@ chunk-n51jggtb.js:92124-92290 placement
/**
 * 列出 schema 声明的参数名并补上 required 项。
 */
function declaredFieldNames(schema) {
  let keys = Object.keys(schema.properties ?? {});
  let required = Array.isArray(schema.required) ? schema.required : [];
  for (let requiredName of required)
    if (typeof requiredName === "string" && !keys.includes(requiredName)) keys.push(requiredName);
  return keys;
}
//@ chunk-n51jggtb.js:92290-92539 placement
/**
 * 找出调用里 schema 未声明的参数（仅在 schema 封闭且扁平时）。
 */
function undeclaredArgumentKeys(schema, args, allowedExtra = []) {
  if (
    schema === undefined ||
    (schema.additionalProperties !== undefined && schema.additionalProperties !== false) ||
    !Object.keys(schema).every((key) => TOP_LEVEL_SCHEMA_KEYS.has(key))
  )
    return [];
  let declared = declaredFieldNames(schema);
  if (declared.length === 0) return [];
  return Object.keys(args).filter((key) => !declared.includes(key) && !allowedExtra.includes(key));
}
//@ chunk-n51jggtb.js:92539-92848 placement
/**
 * 生成“MCP 工具不声明这些参数”的说明并列出可用参数。
 */
function undeclaredArgumentText(name, undeclared, schema) {
  let joined = undeclared.map((name) => `\`${name}\``).join(", ");
  return `Not sent: ${name} does not declare ${joined}. A server can drop an argument it does not declare and answer with that parameter's default instead. It takes: ${declaredFieldNames(schema).join(", ")}. Call it again with those names; describeTool('${name}') describes each one.`;
}
//@ chunk-n51jggtb.js:92848-92915 placement
/**
 * MCP 未声明参数拒绝的开关。
 */
function isUndeclaredArgsRefuseOn() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_repl_mcp_undeclared_args_refuse", true);
}
//@ chunk-n51jggtb.js:92915-92948 placement
/**
 * 把错误包成 {error} 返回。
 */
function unusedWithError(name, error) {
  return {
    error,
  };
}
//@ chunk-n51jggtb.js:92948-93041 placement
/**
 * 去掉命令前的主机前缀。
 */
function stripHostPrefix(command, hostPrefix) {
  return typeof command === "string" && hostPrefix !== undefined && command.startsWith(hostPrefix)
    ? command.slice(hostPrefix.length)
    : command;
}
export {
  stripHostPrefix,
  unusedWithError,
  isUndeclaredArgsRefuseOn,
  undeclaredArgumentKeys,
  undeclaredArgumentText,
};
