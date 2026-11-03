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
import { sep } from "path";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { REFRESH_GLYPH } from "../../utils/permissions/autoModeRulesPrompt.js";
import { formatUri_2, getBaseName, homeDirectory } from "../../utils/errorStackSanitize.js";

//@ chunk-ah34pb7m.js:117725-118030 fingerprint = _temp (0.644)
/**
 * MCP 资源/轮询更新的一行：服务器名、格式化后的 URI（或目标）与原因。
 */
function renderResourceUpdateRow(update, i) {
  return jsxProd_default(
    Box,
    {
      children: jsxProd_default_2(Text, {
        children: [
          jsxProd_default(Text, {
            "aria-label": "update:",
            color: "success",
            children: REFRESH_GLYPH,
          }),
          " ",
          jsxProd_default_2(Text, {
            dimColor: true,
            children: [update.server, ":"],
          }),
          " ",
          jsxProd_default(Text, {
            color: "suggestion",
            children: update.kind === "resource" ? formatUri(update.target) : update.target,
          }),
          update.reason &&
            jsxProd_default_2(Text, {
              dimColor: true,
              children: [" \xB7 ", update.reason],
            }),
        ],
      }),
    },
    i,
  );
}
//@ chunk-ah34pb7m.js:118030-118489 fingerprint = parseUpdates (1)
function parseUpdates(text) {
  let updates = [];
  let resourceRegex =
    /<mcp-resource-update\s+server="([^"]+)"\s+uri="([^"]+)"[^>]*>(?:[\s\S]*?<reason>([^<]+)<\/reason>)?/g;
  let match;
  while ((match = resourceRegex.exec(text)) !== null)
    updates.push({
      kind: "resource",
      server: match[1] ?? "",
      target: match[2] ?? "",
      reason: match[3],
    });
  let pollingRegex =
    /<mcp-polling-update\s+type="([^"]+)"\s+server="([^"]+)"\s+tool="([^"]+)"[^>]*>(?:[\s\S]*?<reason>([^<]+)<\/reason>)?/g;
  while ((match = pollingRegex.exec(text)) !== null)
    updates.push({
      kind: "polling",
      server: match[2] ?? "",
      target: match[3] ?? "",
      reason: match[4],
    });
  return updates;
}
//@ chunk-ah34pb7m.js:118489-118642 fingerprint = formatUri (1)
function formatUri(uri) {
  if (uri.startsWith("file://")) {
    let path = uri.slice(7);
    let parts = path.split("/");
    return parts[parts.length - 1] || path;
  }
  if (uri.length > 40) return uri.slice(0, 39) + "\u2026";
  return uri;
}
//@ chunk-sycgf9xs.js:1336-1535 file-last-pair
function UserResourceUpdateMessage(t0) {
  let uri = t0;
  if (uri.startsWith("file://")) uri = uri.slice(7);
  if (formatUri_2(uri)) return getBaseName(uri);
  if (uri.startsWith("/snapshot/")) uri = uri.slice(10);
  let r = homeDirectory();
  if (r && uri.startsWith(r + sep)) uri = "~" + uri.slice(r.length);
  return uri;
}
export { parseUpdates, renderResourceUpdateRow, UserResourceUpdateMessage };
