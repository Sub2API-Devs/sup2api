/**
 * utils/debugFilter.ts
 *
 * --debug=过滤串解析（包含/排除分类）与消息分类提取。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/debugFilter.ts
 * pieces: chunk-cgr0tezp.js (2)
 * attribution: fingerprint 2
 */

/**
 * 解析 --debug=<过滤串>：逗号分隔分类，! 前缀为排除；包含与排除混用返回 null。
 */
//@ chunk-cgr0tezp.js:16966-17290 fingerprint = parseDebugFilter (1)
function parseDebugFilter(filterString) {
  if (!filterString || filterString.trim() === "") return null;
  let filters = filterString
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
  if (filters.length === 0) return null;
  let hasExclusive = filters.some((o) => o.startsWith("!")),
    hasInclusive = filters.some((o) => !o.startsWith("!"));
  if (hasExclusive && hasInclusive) return null;
  let cleanFilters = filters.map((o) => o.replace(/^!/, "").toLowerCase());
  return {
    include: hasExclusive ? [] : cleanFilters,
    exclude: hasExclusive ? cleanFilters : [],
    isExclusive: hasExclusive,
  };
}
/**
 * 从调试消息中提取分类（如 [MCP]、1p event: 前缀）用于过滤。
 */
//@ chunk-cgr0tezp.js:17290-17797 fingerprint = extractDebugCategories (1)
function extractDebugCategories(message) {
  let categories = [],
    mcpMatch = message.match(/^MCP server ["']([^"']+)["']/);
  if (mcpMatch && mcpMatch[1]) (categories.push("mcp"), categories.push(mcpMatch[1].toLowerCase()));
  else {
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

export { extractDebugCategories, parseDebugFilter };
