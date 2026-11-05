/**
 * cli/handlers/mcpHints.ts
 *
 * 2.1.316 新增：MCP 服务器未找到时的提示文案（相近名称建议）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9sm275st.js (2)
 * attribution: placement 2
 */
import { replaceControlChars } from "../../utils/resultError.js";
import { suggestClosestName } from "../../utils/settings/managedEnvKeys.js";

//@ chunk-9sm275st.js:264-735 placement
function formatUnknownMcpServerHint(name, knownNames) {
  let safeName = replaceControlChars(name);
  let sorted = knownNames.map(replaceControlChars).sort();
  let closest = suggestClosestName(
    safeName,
    sorted.map((name) => ({
      name,
    })),
    {
      maxEditDistance: 2,
    },
  );
  if (closest)
    return `No MCP server named "${safeName}". Did you mean "${closest}"? Run \`claude mcp list\` to see all.`;
  if (sorted.length === 0) return `No MCP server named "${safeName}". Run \`claude mcp add\` to add one.`;
  let maxListed = 8;
  let joined = sorted.slice(0, maxListed).join(", ");
  let moreSuffix =
    sorted.length > maxListed
      ? ` (and ${sorted.length - maxListed} more \u2014 run \`claude mcp list\` to see all)`
      : "";
  return `No MCP server named "${safeName}". Configured servers: ${joined}${moreSuffix}`;
}
//@ chunk-9sm275st.js:735-1040 placement
function formatMcpServerNotFoundMessage(name, knownNames, hasPendingApproval) {
  if (hasPendingApproval && knownNames.length === 0)
    return `No MCP server named "${replaceControlChars(name)}". ${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."}`;
  return (
    formatUnknownMcpServerHint(name, knownNames) +
    (hasPendingApproval
      ? ` (${".mcp.json servers are awaiting approval \u2014 run `claude` in this directory to review them."})`
      : "")
  );
}
export { formatUnknownMcpServerHint, formatMcpServerNotFoundMessage };
