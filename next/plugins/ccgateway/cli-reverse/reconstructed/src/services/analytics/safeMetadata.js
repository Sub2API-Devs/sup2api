/**
 * services/analytics/safeMetadata.ts
 *
 * 2.1.316 新增。遥测元数据安全取值工具（lit/fromEnum/joinSafe 等）与 MCP 名、插件 id、代理类型脱敏。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0wqny7vr.js (16)
 * attribution: placement 16
 */

//@ chunk-0wqny7vr.js:191-214 placement
/**
 * 安全元数据的透传函数：原样返回传入值（不做脱敏），另有 lit 作为其别名。
 */
function identity(value) {
  return value;
}
//@ chunk-0wqny7vr.js:214-240 placement
/**
 * 导出函数 `lit`：参数 n，返回 r(n)。
 */
function lit(value) {
  return identity(value);
}
//@ chunk-0wqny7vr.js:240-266 placement
function fromEnum(value) {
  return identity(value);
}
//@ chunk-0wqny7vr.js:266-308 placement
function fromEnumOpt(value) {
  return value == null ? undefined : identity(value);
}
//@ chunk-0wqny7vr.js:308-343 placement
function fromNumber(value) {
  return identity(String(value));
}
//@ chunk-0wqny7vr.js:343-393 placement
function fromNumberOpt(value) {
  return value == null ? undefined : identity(String(value));
}
//@ chunk-0wqny7vr.js:393-432 placement
function concatSafe(...values) {
  return identity(values.join(""));
}
//@ chunk-0wqny7vr.js:432-470 placement
function fromNumberArr(values) {
  return identity(values.join(","));
}
//@ chunk-0wqny7vr.js:470-519 placement
function fromEnumArr(values) {
  return identity([...values].sort().join(","));
}
//@ chunk-0wqny7vr.js:519-561 placement
function joinSafe(values, separator) {
  return identity(values.join(separator ?? ","));
}
//@ chunk-0wqny7vr.js:561-588 placement
function fromSanitizer_SANITIZER_OUTPUT_ONLY(value) {
  return identity(value);
}
//@ chunk-0wqny7vr.js:588-627 placement
function mcpNameForAnalytics_GATE_EVALUATED(name, gate) {
  return gate ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name) : undefined;
}
//@ chunk-0wqny7vr.js:627-723 placement
/**
 * 遥测元数据的安全取值工具集（lit/fromEnum/fromNumber/joinSafe 等）与 MCP 名、插件 id、代理类型的脱敏转换，确保只上报构建期已知或经过闸门的值。
 */
function bundledFileStemForAnalytics_KNOWN_IS_BUILD_TIME(stem, bundleSources) {
  return stem !== undefined && bundleSources.includes(stem) && /^[a-z0-9-]{1,64}$/.test(stem)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(stem)
    : lit("none");
}
//@ chunk-0wqny7vr.js:723-768 placement (2.1.88 match: inputSchema, 0.391)
function agentTypeForAnalytics_GATE_EVALUATED(agentType, gate) {
  return gate ? fromSanitizer_SANITIZER_OUTPUT_ONLY(agentType) : lit("custom");
}
//@ chunk-0wqny7vr.js:768-830 placement (2.1.88 match: updateAgentFile, 1)
function agentTypeForAnalyticsFromDefinition(agentDefinition) {
  return agentTypeForAnalytics_GATE_EVALUATED(
    agentDefinition.agentType,
    agentDefinition.source === "built-in",
  );
}
//@ chunk-0wqny7vr.js:830-880 placement (2.1.88 match: getPluginHookCounts, 0.74)
/**
 * 插件钩子遥测用的插件标识：官方插件用哈希/名，否则 third-party。
 */
function pluginIdForAnalytics_GATE_EVALUATED(pluginId, gate) {
  return gate ? fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginId) : lit("third-party");
}
export {
  fromEnumOpt,
  fromEnum,
  lit,
  fromNumber,
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  concatSafe,
  joinSafe,
  agentTypeForAnalytics_GATE_EVALUATED,
  mcpNameForAnalytics_GATE_EVALUATED,
  fromNumberOpt,
  agentTypeForAnalyticsFromDefinition,
  fromEnumArr,
  fromNumberArr,
  pluginIdForAnalytics_GATE_EVALUATED,
  bundledFileStemForAnalytics_KNOWN_IS_BUILD_TIME,
};
