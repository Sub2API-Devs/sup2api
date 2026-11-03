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

//@ chunk-ka3sjxh8.js:191-254 placement
var _8e = String.raw`\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}`;
//@ chunk-ka3sjxh8.js:254-301 placement
function Ove(e) {
  return new RegExp(_8e).test(e);
}
/**
 * 按 ${VAR} 环境变量引用把字符串切分为字面量片段。
 */
//@ chunk-ka3sjxh8.js:301-452 placement
function splitAroundEnvRefs(e) {
  let n = [],
    r = 0;
  for (let t of e.matchAll(new RegExp(_8e, "g"))) (n.push(e.slice(r, t.index)), (r = t.index + t[0].length));
  return (n.push(e.slice(r)), n);
}
//@ chunk-ka3sjxh8.js:452-532 placement
function zOn(e) {
  return e.replace(new RegExp(_8e, "g"), (n) => "x".repeat(n.length));
}
//@ chunk-ka3sjxh8.js:532-604 placement
function M1e(e) {
  return e.replace(new RegExp(_8e, "g"), (n, r) => `\${${r}}`);
}
/**
 * expandEnvVarsInString（实为批量展开 headers）：对 headers 每个值做 ${VAR} 展开（远程目的地模式），返回 {staticHeaders, missingVars}。
 */
//@ chunk-g2rygg7v.js:9217-9450 fingerprint = expandEnvVarsInString (0.537)
function expandEnvVarsInString(headers) {
  let blankList,
    n = {},
    missingVars = [];
  for (let [s, u] of Object.entries(headers ?? {})) {
    if (u.includes("${")) blankList ??= scrubbedEnvKeys();
    let { expanded: expanded, missingVars: missingVars_2 } = expandMcpCredentialEnvVars(u, void 0, void 0, {
      remoteSink: !0,
      blankList: blankList,
    });
    ((n[s] = expanded), missingVars.push(...missingVars_2));
  }
  return { staticHeaders: n, missingVars: missingVars };
}

export { Ove, _8e, expandEnvVarsInString, M1e, zOn, splitAroundEnvRefs };
