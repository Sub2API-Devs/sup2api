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
import { j } from "../../../vendor/react/cjs/react.production.js";
import { formatRelativeTimeAgo } from "../../utils/format.js";
import { plural } from "../../utils/stringUtils.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { readMcpOAuthStore } from "../../services/mcp/credentialStoreRead.js";
import { getServerKey } from "../../services/mcp/auth.js";
import { hasExpiredAccessTokenOnly } from "../../services/mcp/registrationStatus.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { Byline } from "../design-system/Byline.js";

//@ chunk-vrb44rx7.js:6073-6077 placement
j();
//@ chunk-vrb44rx7.js:6077-6273 placement
function formatToolConnectionState(i, h) {
  let k = [
    `cached ${formatRelativeTimeAgo(new Date(i))}`,
    "connects on first use",
    ...(h !== void 0 ? [`${h} ${plural(h, "tool")}`] : []),
  ];
  return { glyph: re.radioOn, tone: "inactive", statusText: k.join(" \xB7 "), facts: k };
}
/**
 * 该 MCP 服务器存有 access token 且未过期/未失效。
 */
//@ chunk-vrb44rx7.js:6273-6381 placement
async function hasValidMcpOAuthToken(i, h) {
  let k = await readMcpOAuthStore().catch(() => {
    return;
  });
  return !!k?.[getServerKey(i, h)]?.accessToken && !hasExpiredAccessTokenOnly(i, h, k);
}
//@ chunk-vrb44rx7.js:6381-6898 fingerprint = CapabilitiesSection (0.777)
function CapabilitiesSection(t0) {
  let $ = w(9),
    {
      serverToolsCount: serverToolsCount,
      serverPromptsCount: serverPromptsCount,
      serverResourcesCount: serverResourcesCount,
    } = t0,
    T;
  if ($[0] !== serverPromptsCount || $[1] !== serverResourcesCount || $[2] !== serverToolsCount) {
    T = [];
    if (serverToolsCount > 0) T.push("tools");
    if (serverResourcesCount > 0) T.push("resources");
    if (serverPromptsCount > 0) T.push("prompts");
    (($[0] = serverPromptsCount), ($[1] = serverResourcesCount), ($[2] = serverToolsCount), ($[3] = T));
  } else T = $[3];
  let D;
  if ($[4] === MEMO_CACHE_SENTINEL) ((D = e(Text, { bold: !0, children: "Capabilities: " })), ($[4] = D));
  else D = $[4];
  let U;
  if ($[5] !== T) ((U = T.length > 0 ? e(Byline, { children: T }) : "none"), ($[5] = T), ($[6] = U));
  else U = $[6];
  let L;
  if ($[7] !== U)
    ((L = r(Box, { children: [D, e(Text, { color: "text", children: U })] })), ($[7] = U), ($[8] = L));
  else L = $[8];
  return L;
}

export { formatToolConnectionState, hasValidMcpOAuthToken, CapabilitiesSection };
