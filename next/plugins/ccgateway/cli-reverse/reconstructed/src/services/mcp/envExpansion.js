/**
 * services/mcp/envExpansion.ts
 *
 * 并入已有模块：MCP 配置环境变量展开
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/mcp/envExpansion.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-qjh8ew63.js (5)
 * attribution: fingerprint 1, placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { expandServerConfigEnvVars } from "./config.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-qjh8ew63.js:191-254 placement
/**
 * 匹配 ${VAR} 或 ${VAR:-默认} 的正则源码。
 */
var ENV_REF_PATTERN; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qjh8ew63.js:191", () => {
  ENV_REF_PATTERN = String.raw`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}`;
});
//@ chunk-qjh8ew63.js:254-300 placement
/**
 * 判断字符串里是否含环境变量引用。
 */
function containsEnvRef(text) {
  return new RegExp(ENV_REF_PATTERN).test(text);
}
//@ chunk-qjh8ew63.js:300-451 placement
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
//@ chunk-qjh8ew63.js:451-531 placement
/**
 * 把环境变量引用替换成等长占位，用于长度判断。
 */
function maskEnvRefs(text) {
  return text.replace(new RegExp(ENV_REF_PATTERN, "g"), (ref) => "x".repeat(ref.length));
}
//@ chunk-qjh8ew63.js:531-603 placement
/**
 * 去掉默认值部分，只保留 ${VAR} 形式。
 */
function normalizeEnvRefs(text) {
  return text.replace(new RegExp(ENV_REF_PATTERN, "g"), (match, name) => `\${${name}}`);
}
//@ chunk-5xgkngpb.js:3921295-3921334 fingerprint (2.1.88 match: expandEnvVarsInString, 0.624)
function expandEnvVarsInString(value) {
  return expandServerConfigEnvVars(value).expanded;
}
export {
  splitAroundEnvRefs,
  normalizeEnvRefs,
  maskEnvRefs,
  containsEnvRef,
  ENV_REF_PATTERN,
  expandEnvVarsInString,
};
