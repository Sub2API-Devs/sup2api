/**
 * utils/settings/toolValidationConfig.ts
 *
 * 权限规则内容的按工具校验配置（文件模式类工具、Bash 前缀类工具）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/settings/toolValidationConfig.ts
 * pieces: chunk-z20c443b.js (4)
 * attribution: fingerprint 4
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-z20c443b.js:210045-210912 fingerprint (2.1.88 match: TOOL_VALIDATION_CONFIG, 1)
var TOOL_VALIDATION_CONFIG = {
  filePatternTools: ["Read", "Write", "Edit", "Glob", "NotebookRead", "NotebookEdit", "Cd"],
  bashPrefixTools: ["Bash"],
  customValidation: {
    WebSearch: (content) => {
      if (content.includes("*") || content.includes("?"))
        return {
          valid: false,
          error: "WebSearch does not support wildcards",
          suggestion: "Use exact search terms without * or ?",
          examples: ["WebSearch(claude ai)", "WebSearch(typescript tutorial)"],
        };
      return {
        valid: true,
      };
    },
    WebFetch: (content) => {
      if (content.includes("://") || content.startsWith("http"))
        return {
          valid: false,
          error: "WebFetch permissions use domain format, not URLs",
          suggestion: 'Use "domain:hostname" format',
          examples: ["WebFetch(domain:example.com)", "WebFetch(domain:github.com)"],
        };
      if (!content.startsWith("domain:"))
        return {
          valid: false,
          error: 'WebFetch permissions must use "domain:" prefix',
          suggestion: 'Use "domain:hostname" format',
          examples: ["WebFetch(domain:example.com)", "WebFetch(domain:*.google.com)"],
        };
      return {
        valid: true,
      };
    },
  },
};
//@ chunk-z20c443b.js:210912-210967 fingerprint (2.1.88 match: isFilePatternTool, 1)
function isFilePatternTool(toolName) {
  return TOOL_VALIDATION_CONFIG.filePatternTools.includes(toolName);
}
//@ chunk-z20c443b.js:210967-211021 fingerprint (2.1.88 match: isBashPrefixTool, 1)
function isBashPrefixTool(toolName) {
  return TOOL_VALIDATION_CONFIG.bashPrefixTools.includes(toolName);
}
//@ chunk-z20c443b.js:211021-211112 fingerprint (2.1.88 match: getCustomValidation, 1)
function getCustomValidation(toolName) {
  return Object.hasOwn(TOOL_VALIDATION_CONFIG.customValidation, toolName)
    ? TOOL_VALIDATION_CONFIG.customValidation[toolName]
    : undefined;
}
export { TOOL_VALIDATION_CONFIG, isFilePatternTool, getCustomValidation, isBashPrefixTool };
