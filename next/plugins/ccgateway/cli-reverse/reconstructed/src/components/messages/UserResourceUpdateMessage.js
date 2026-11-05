/**
 * components/messages/UserResourceUpdateMessage.tsx
 *
 * MCP 资源更新/轮询通知的显示（格式化 URI）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/messages/UserResourceUpdateMessage.tsx
 * pieces: chunk-2avr6cej.js (1), chunk-wjygkcr4.js (3)
 * attribution: fingerprint 3, affinity 1
 */
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { REFRESH_GLYPH } from "../../constants/figures.js";

//@ chunk-2avr6cej.js:226788-226849 fingerprint (2.1.88 match: formatUri, 1)
var stripFileUrlPrefix = (file) => file?.replace(`file://${process.cwd()}/`, "");
var MAX_ERROR_LENGTH = 200;
//@ chunk-wjygkcr4.js:119417-119722 fingerprint (2.1.88 match: _temp, 0.644)
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
//@ chunk-wjygkcr4.js:119722-120181 fingerprint (2.1.88 match: parseUpdates, 1)
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
//@ chunk-wjygkcr4.js:120181-120334 affinity (2.1.88 match: formatUri, 1)
function formatUri(uri) {
  if (uri.startsWith("file://")) {
    let path = uri.slice(7);
    let parts = path.split("/");
    return parts[parts.length - 1] || path;
  }
  if (uri.length > 40) return uri.slice(0, 39) + "\u2026";
  return uri;
}
export { MAX_ERROR_LENGTH, stripFileUrlPrefix, parseUpdates, renderResourceUpdateRow };
