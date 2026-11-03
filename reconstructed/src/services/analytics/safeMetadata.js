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
function identity(n) {
  return n;
}
//@ chunk-0wqny7vr.js:214-240 placement
/**
 * 导出函数 `lit`：参数 n，返回 r(n)。
 */
function lit(n) {
  return identity(n);
}
//@ chunk-0wqny7vr.js:240-266 placement
function fromEnum(n) {
  return identity(n);
}
//@ chunk-0wqny7vr.js:266-308 placement
function fromEnumOpt(n) {
  return n == null ? undefined : identity(n);
}
//@ chunk-0wqny7vr.js:308-343 placement
function fromNumber(n) {
  return identity(String(n));
}
//@ chunk-0wqny7vr.js:343-393 placement
function fromNumberOpt(n) {
  return n == null ? undefined : identity(String(n));
}
//@ chunk-0wqny7vr.js:393-432 placement
function concatSafe(...n) {
  return identity(n.join(""));
}
//@ chunk-0wqny7vr.js:432-470 placement
function fromNumberArr(n) {
  return identity(n.join(","));
}
//@ chunk-0wqny7vr.js:470-519 placement
function fromEnumArr(n) {
  return identity([...n].sort().join(","));
}
//@ chunk-0wqny7vr.js:519-561 placement
function joinSafe(n, e) {
  return identity(n.join(e ?? ","));
}
//@ chunk-0wqny7vr.js:561-588 placement
function fromSanitizer_SANITIZER_OUTPUT_ONLY(n) {
  return identity(n);
}
//@ chunk-0wqny7vr.js:588-627 placement
function mcpNameForAnalytics_GATE_EVALUATED(n, e) {
  return e ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : undefined;
}
//@ chunk-0wqny7vr.js:627-723 placement
/**
 * 遥测元数据的安全取值工具集（lit/fromEnum/fromNumber/joinSafe 等）与 MCP 名、插件 id、代理类型的脱敏转换，确保只上报构建期已知或经过闸门的值。
 */
function bundledFileStemForAnalytics_KNOWN_IS_BUILD_TIME(n, e) {
  return n !== undefined && e.includes(n) && /^[a-z0-9-]{1,64}$/.test(n)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n)
    : lit("none");
}
//@ chunk-0wqny7vr.js:723-768 placement = inputSchema (0.391)
function agentTypeForAnalytics_GATE_EVALUATED(n, e) {
  return e ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : lit("custom");
}
//@ chunk-0wqny7vr.js:768-830 placement = updateAgentFile (1)
function agentTypeForAnalyticsFromDefinition(n) {
  return agentTypeForAnalytics_GATE_EVALUATED(n.agentType, n.source === "built-in");
}
//@ chunk-0wqny7vr.js:830-880 placement = getPluginHookCounts (0.74)
/**
 * 插件钩子遥测用的插件标识：官方插件用哈希/名，否则 third-party。
 */
function pluginIdForAnalytics_GATE_EVALUATED(n, e) {
  return e ? fromSanitizer_SANITIZER_OUTPUT_ONLY(n) : lit("third-party");
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
