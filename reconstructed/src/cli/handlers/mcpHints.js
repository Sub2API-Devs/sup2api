/**
 * cli/handlers/mcpHints.ts
 *
 * 2.1.316 新增：MCP 服务器未找到时的提示文案（相近名称建议）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-sey2c4wh.js (2)
 * attribution: placement 2
 */
import { replaceControlChars } from "../../utils/resultError.js";
import { suggestClosestName } from "../../utils/settings/managedEnvKeys.js";

//@ chunk-sey2c4wh.js:264-735 placement
function formatUnknownMcpServerHint(t, n) {
  let e = replaceControlChars(t),
    sorted = n.map(replaceControlChars).sort(),
    s = suggestClosestName(
      e,
      sorted.map((d) => ({ name: d })),
      { maxEditDistance: 2 },
    );
  if (s) return `No MCP server named "${e}". Did you mean "${s}"? Run \`claude mcp list\` to see all.`;
  if (sorted.length === 0) return `No MCP server named "${e}". Run \`claude mcp add\` to add one.`;
  let o = 8,
    joined = sorted.slice(0, o).join(", "),
    i = sorted.length > o ? ` (and ${sorted.length - o} more \u2014 run \`claude mcp list\` to see all)` : "";
  return `No MCP server named "${e}". Configured servers: ${joined}${i}`;
}
//@ chunk-sey2c4wh.js:735-1040 placement
function formatMcpServerNotFoundMessage(t, n, e) {
  if (e && n.length === 0)
    return `No MCP server named "${replaceControlChars(t)}". ${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."}`;
  return (
    formatUnknownMcpServerHint(t, n) +
    (e
      ? ` (${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."})`
      : "")
  );
}

export { formatMcpServerNotFoundMessage, formatUnknownMcpServerHint };
