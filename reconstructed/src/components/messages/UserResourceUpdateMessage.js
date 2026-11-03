/**
 * components/messages/UserResourceUpdateMessage.tsx
 *
 * MCP 资源更新/轮询通知的显示（格式化 URI）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserResourceUpdateMessage.tsx
 * pieces: chunk-ah34pb7m.js (3), chunk-sycgf9xs.js (1)
 * attribution: fingerprint 3, file-last-pair 1
 */
import { sep, sep as sep_2 } from "path";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { ips } from "../../utils/permissions/autoModeRulesPrompt.js";
import { formatUri_2, getBaseName, nt } from "../../utils/errorStackSanitize.js";

/**
 * MCP 资源/轮询更新的一行：服务器名、格式化后的 URI（或目标）与原因。
 */
//@ chunk-ah34pb7m.js:117725-118030 fingerprint = _temp (0.644)
function renderResourceUpdateRow(update, i) {
  return e(
    Box,
    {
      children: r(Text, {
        children: [
          e(Text, { "aria-label": "update:", color: "success", children: ips }),
          " ",
          r(Text, { dimColor: !0, children: [update.server, ":"] }),
          " ",
          e(Text, {
            color: "suggestion",
            children: update.kind === "resource" ? formatUri(update.target) : update.target,
          }),
          update.reason && r(Text, { dimColor: !0, children: [" \xB7 ", update.reason] }),
        ],
      }),
    },
    i,
  );
}
//@ chunk-ah34pb7m.js:118030-118489 fingerprint = parseUpdates (1)
function parseUpdates(text) {
  let updates = [],
    resourceRegex =
      /<mcp-resource-update\s+server="([^"]+)"\s+uri="([^"]+)"[^>]*>(?:[\s\S]*?<reason>([^<]+)<\/reason>)?/g,
    match;
  while ((match = resourceRegex.exec(text)) !== null)
    updates.push({ kind: "resource", server: match[1] ?? "", target: match[2] ?? "", reason: match[3] });
  let pollingRegex =
    /<mcp-polling-update\s+type="([^"]+)"\s+server="([^"]+)"\s+tool="([^"]+)"[^>]*>(?:[\s\S]*?<reason>([^<]+)<\/reason>)?/g;
  while ((match = pollingRegex.exec(text)) !== null)
    updates.push({ kind: "polling", server: match[2] ?? "", target: match[3] ?? "", reason: match[4] });
  return updates;
}
//@ chunk-ah34pb7m.js:118489-118642 fingerprint = formatUri (1)
function formatUri(uri) {
  if (uri.startsWith("file://")) {
    let path = uri.slice(7),
      parts = path.split("/");
    return parts[parts.length - 1] || path;
  }
  if (uri.length > 40) return uri.slice(0, 39) + "\u2026";
  return uri;
}
//@ chunk-sycgf9xs.js:1336-1535 file-last-pair
function UserResourceUpdateMessage(t0) {
  let n = t0;
  if (n.startsWith("file://")) n = n.slice(7);
  if (formatUri_2(n)) return getBaseName(n);
  if (n.startsWith("/snapshot/")) n = n.slice(10);
  let r = nt();
  if (r && n.startsWith(r + sep)) n = "~" + n.slice(r.length);
  return n;
}

export { parseUpdates, renderResourceUpdateRow, UserResourceUpdateMessage };
