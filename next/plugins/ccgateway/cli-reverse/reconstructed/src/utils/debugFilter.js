/**
 * utils/debugFilter.ts
 *
 * --debug=过滤串解析（包含/排除分类）与消息分类提取。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/debugFilter.ts
 * pieces: chunk-6hadbefe.js (2)
 * attribution: fingerprint 2
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */

//@ chunk-6hadbefe.js:4494-4818 fingerprint (2.1.88 match: shouldShowDebugCategories, 1)
/**
 * 解析 --debug=<过滤串>：逗号分隔分类，! 前缀为排除；包含与排除混用返回 null。
 */
function shouldShowDebugCategories(filterString) {
  if (!filterString || filterString.trim() === "") return null;
  let filters = filterString
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (filters.length === 0) return null;
  let hasExclusive = filters.some((cat) => cat.startsWith("!"));
  let hasInclusive = filters.some((filter) => !filter.startsWith("!"));
  if (hasExclusive && hasInclusive) return null;
  let cleanFilters = filters.map((filter) => filter.replace(/^!/, "").toLowerCase());
  return {
    include: hasExclusive ? [] : cleanFilters,
    exclude: hasExclusive ? cleanFilters : [],
    isExclusive: hasExclusive,
  };
}
//@ chunk-6hadbefe.js:4818-5325 fingerprint (2.1.88 match: extractDebugCategories, 1)
/**
 * 从调试消息中提取分类（如 [MCP]、1p event: 前缀）用于过滤。
 */
function extractDebugCategories(message) {
  let categories = [];
  let mcpMatch = message.match(/^MCP server ["']([^"']+)["']/);
  if (mcpMatch && mcpMatch[1]) {
    categories.push("mcp");
    categories.push(mcpMatch[1].toLowerCase());
  } else {
    let prefixMatch = message.match(/^([^:[]+):/);
    if (prefixMatch && prefixMatch[1]) categories.push(prefixMatch[1].trim().toLowerCase());
  }
  let bracketMatch = message.match(/^\[([^\]]+)]/);
  if (bracketMatch && bracketMatch[1]) categories.push(bracketMatch[1].trim().toLowerCase());
  if (message.toLowerCase().includes("1p event:")) categories.push("1p");
  let secondaryMatch = message.match(/:\s*([^:]+?)(?:\s+(?:type|mode|status|event))?:/);
  if (secondaryMatch && secondaryMatch[1]) {
    let secondary = secondaryMatch[1].trim().toLowerCase();
    if (secondary.length < 30 && !secondary.includes(" ")) categories.push(secondary);
  }
  return Array.from(new Set(categories));
}
export { shouldShowDebugCategories, extractDebugCategories };
