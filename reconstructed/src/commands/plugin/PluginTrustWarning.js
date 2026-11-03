/**
 * commands/plugin/PluginTrustWarning.tsx
 *
 * 安装插件前的信任警告
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginTrustWarning.tsx
 * pieces: chunk-vrb44rx7.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getPluginTrustMessage } from "../../utils/plugins/marketplacePolicy.js";
import { r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { re } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-vrb44rx7.js:52001-52587 fingerprint = PluginTrustWarning (0.578)
function PluginTrustWarning() {
  let i = w(3),
    h;
  if (i[0] === MEMO_CACHE_SENTINEL) ((h = getPluginTrustMessage()), (i[0] = h));
  else h = i[0];
  let customMessage = h,
    C;
  if (i[1] === MEMO_CACHE_SENTINEL)
    ((C = r(Text, { color: "claude", children: [re.warning, " "] })), (i[1] = C));
  else C = i[1];
  let x;
  if (i[2] === MEMO_CACHE_SENTINEL)
    ((x = r(Box, {
      marginBottom: 1,
      children: [
        C,
        r(Text, {
          dimColor: !0,
          italic: !0,
          children: [
            "Make sure you trust a plugin before installing, updating, or using it. Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change. See each plugin's homepage for more information.",
            customMessage ? ` ${customMessage}` : "",
          ],
        }),
      ],
    })),
      (i[2] = x));
  else x = i[2];
  return x;
}

export { PluginTrustWarning };
