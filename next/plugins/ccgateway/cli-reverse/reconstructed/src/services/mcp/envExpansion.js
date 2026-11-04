/**
 * services/mcp/envExpansion.ts
 *
 * 并入已有模块：MCP 配置环境变量展开
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/envExpansion.ts
 * pieces: chunk-g2rygg7v.js (1), chunk-ka3sjxh8.js (5)
 * attribution: fingerprint 1, placement 5
 */
import { scrubbedEnvKeys, expandMcpCredentialEnvVars } from "../../utils/envExpansion.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ka3sjxh8.js:191-254 placement
/**
 * 匹配 ${VAR} 或 ${VAR:-默认} 的正则源码。
 */
var ENV_REF_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ka3sjxh8.js:191", () => {
  ENV_REF_PATTERN = String.raw`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}`;
});
//@ chunk-ka3sjxh8.js:254-301 placement
/**
 * 判断字符串里是否含环境变量引用。
 */
function containsEnvRef(text) {
  return new RegExp(ENV_REF_PATTERN).test(text);
}
//@ chunk-ka3sjxh8.js:301-452 placement
/**
 * 按 ${VAR} 环境变量引用把字符串切分为字面量片段。
 */
function splitAroundEnvRefs(text) {
  let segments = [];
  let cursor = 0;
  for (let match of text.matchAll(new RegExp(ENV_REF_PATTERN, "g"))) {
    segments.push(text.slice(cursor, match.index));
    cursor = match.index + match[0].length;
  }
  segments.push(text.slice(cursor));
  return segments;
}
//@ chunk-ka3sjxh8.js:452-532 placement
/**
 * 把环境变量引用替换成等长占位，用于长度判断。
 */
function maskEnvRefs(text) {
  return text.replace(new RegExp(ENV_REF_PATTERN, "g"), (ref) => "x".repeat(ref.length));
}
//@ chunk-ka3sjxh8.js:532-604 placement
/**
 * 去掉默认值部分，只保留 ${VAR} 形式。
 */
function normalizeEnvRefs(text) {
  return text.replace(new RegExp(ENV_REF_PATTERN, "g"), (match, name) => `\${${name}}`);
}
//@ chunk-g2rygg7v.js:9217-9450 fingerprint (2.1.88 match: expandEnvVarsInString, 0.537)
/**
 * expandEnvVarsInString（实为批量展开 headers）：对 headers 每个值做 ${VAR} 展开（远程目的地模式），返回 {staticHeaders, missingVars}。
 */
function expandEnvVarsInString(headers) {
  let blankList;
  let staticHeaders = {};
  let missingVars = [];
  for (let [key, value] of Object.entries(headers ?? {})) {
    if (value.includes("${")) blankList ??= scrubbedEnvKeys();
    let { expanded, missingVars: missingVars_2 } = expandMcpCredentialEnvVars(value, undefined, undefined, {
      remoteSink: true,
      blankList,
    });
    staticHeaders[key] = expanded;
    missingVars.push(...missingVars_2);
  }
  return {
    staticHeaders,
    missingVars,
  };
}
export {
  containsEnvRef,
  ENV_REF_PATTERN,
  expandEnvVarsInString,
  normalizeEnvRefs,
  maskEnvRefs,
  splitAroundEnvRefs,
};
