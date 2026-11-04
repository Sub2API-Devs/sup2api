/**
 * components/mcp/CapabilitiesSection.tsx
 *
 * MCP 服务器能力摘要（tools/resources/prompts）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/mcp/CapabilitiesSection.tsx
 * pieces: chunk-vrb44rx7.js (4)
 * attribution: placement 3, fingerprint 1
 */
import { init_react_production } from "../../../vendor/react/cjs/react.production.js";
import { formatRelativeTimeAgo } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { readMcpOAuthStore } from "../../services/mcp/credentialStoreRead.js";
import { getServerKey } from "../../services/mcp/auth.js";
import { hasExpiredAccessTokenOnly } from "../../services/mcp/registrationStatus.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../design-system/Byline.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-vrb44rx7.js:6073-6077 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-vrb44rx7.js:6073", () => {
  init_react_production();
});
//@ chunk-vrb44rx7.js:6077-6273 placement
function formatToolConnectionState(cacheSavedAt, toolCount) {
  let facts = [
    `cached ${formatRelativeTimeAgo(new Date(cacheSavedAt))}`,
    "connects on first use",
    ...(toolCount !== undefined ? [`${toolCount} ${plural(toolCount, "tool")}`] : []),
  ];
  return {
    glyph: figures_default.radioOn,
    tone: "inactive",
    statusText: facts.join(" \xB7 "),
    facts,
  };
}
//@ chunk-vrb44rx7.js:6273-6381 placement
/**
 * 该 MCP 服务器存有 access token 且未过期/未失效。
 */
async function hasValidMcpOAuthToken(name, config) {
  let store = await readMcpOAuthStore().catch(() => {
    return;
  });
  return (
    !!store?.[getServerKey(name, config)]?.accessToken && !hasExpiredAccessTokenOnly(name, config, store)
  );
}
//@ chunk-vrb44rx7.js:6381-6898 fingerprint = CapabilitiesSection (0.777)
function CapabilitiesSection(props) {
  let $ = useMemoCache(9);
  let { serverToolsCount, serverPromptsCount, serverResourcesCount } = props;
  let capabilities;
  if ($[0] !== serverPromptsCount || $[1] !== serverResourcesCount || $[2] !== serverToolsCount) {
    capabilities = [];
    if (serverToolsCount > 0) capabilities.push("tools");
    if (serverResourcesCount > 0) capabilities.push("resources");
    if (serverPromptsCount > 0) capabilities.push("prompts");
    $[0] = serverPromptsCount;
    $[1] = serverResourcesCount;
    $[2] = serverToolsCount;
    $[3] = capabilities;
  } else capabilities = $[3];
  let t1;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default(Text, {
      bold: true,
      children: "Capabilities: ",
    });
    $[4] = t1;
  } else t1 = $[4];
  let children;
  if ($[5] !== capabilities) {
    children =
      capabilities.length > 0
        ? jsxProd_default(Byline, {
            children: capabilities,
          })
        : "none";
    $[5] = capabilities;
    $[6] = children;
  } else children = $[6];
  let t3;
  if ($[7] !== children) {
    t3 = jsxProd_default_2(Box, {
      children: [
        t1,
        jsxProd_default(Text, {
          color: "text",
          children,
        }),
      ],
    });
    $[7] = children;
    $[8] = t3;
  } else t3 = $[8];
  return t3;
}
export { formatToolConnectionState, hasValidMcpOAuthToken, CapabilitiesSection };
