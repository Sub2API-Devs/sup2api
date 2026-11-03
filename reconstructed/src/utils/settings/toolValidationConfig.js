/**
 * utils/settings/toolValidationConfig.ts
 *
 * 权限规则内容的按工具校验配置（文件模式类工具、Bash 前缀类工具）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/toolValidationConfig.ts
 * pieces: chunk-dcmhvw5a.js (4)
 * attribution: fingerprint 4
 */

//@ chunk-dcmhvw5a.js:214577-215444 fingerprint = TOOL_VALIDATION_CONFIG (1)
var TOOL_VALIDATION_CONFIG = {
  filePatternTools: ["Read", "Write", "Edit", "Glob", "NotebookRead", "NotebookEdit", "Cd"],
  bashPrefixTools: ["Bash"],
  customValidation: {
    WebSearch: (e) => {
      if (e.includes("*") || e.includes("?"))
        return {
          valid: !1,
          error: "WebSearch does not support wildcards",
          suggestion: "Use exact search terms without * or ?",
          examples: ["WebSearch(claude ai)", "WebSearch(typescript tutorial)"],
        };
      return { valid: !0 };
    },
    WebFetch: (e) => {
      if (e.includes("://") || e.startsWith("http"))
        return {
          valid: !1,
          error: "WebFetch permissions use domain format, not URLs",
          suggestion: 'Use "domain:hostname" format',
          examples: ["WebFetch(domain:example.com)", "WebFetch(domain:github.com)"],
        };
      if (!e.startsWith("domain:"))
        return {
          valid: !1,
          error: 'WebFetch permissions must use "domain:" prefix',
          suggestion: 'Use "domain:hostname" format',
          examples: ["WebFetch(domain:example.com)", "WebFetch(domain:*.google.com)"],
        };
      return { valid: !0 };
    },
  },
};
//@ chunk-dcmhvw5a.js:215444-215499 fingerprint = isFilePatternTool (1)
function isFilePatternTool(toolName) {
  return TOOL_VALIDATION_CONFIG.filePatternTools.includes(toolName);
}
//@ chunk-dcmhvw5a.js:215499-215553 fingerprint = isBashPrefixTool (1)
function isBashPrefixTool(toolName) {
  return TOOL_VALIDATION_CONFIG.bashPrefixTools.includes(toolName);
}
//@ chunk-dcmhvw5a.js:215553-215644 fingerprint = getCustomValidation (1)
function getCustomValidation(toolName) {
  return Object.hasOwn(TOOL_VALIDATION_CONFIG.customValidation, toolName)
    ? TOOL_VALIDATION_CONFIG.customValidation[toolName]
    : void 0;
}

export { TOOL_VALIDATION_CONFIG, isFilePatternTool, getCustomValidation, isBashPrefixTool };
