/**
 * commands/plugin/PluginTrustWarning.tsx
 *
 * 安装插件前的信任警告
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/commands/plugin/PluginTrustWarning.tsx
 * pieces: chunk-wb51jffc.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { getPluginTrustMessage } from "../../utils/plugins/marketplacePolicy.js";
import { jsxProd_default_2 } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";

//@ chunk-wb51jffc.js:52152-52738 fingerprint (2.1.88 match: PluginTrustWarning, 0.577)
function PluginTrustWarning() {
  let $ = useMemoCache(3);
  let t0;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    t0 = getPluginTrustMessage();
    $[0] = t0;
  } else t0 = $[0];
  let customMessage = t0;
  let t1;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    t1 = jsxProd_default_2(Text, {
      color: "claude",
      children: [figures_default.warning, " "],
    });
    $[1] = t1;
  } else t1 = $[1];
  let t2;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    t2 = jsxProd_default_2(Box, {
      marginBottom: 1,
      children: [
        t1,
        jsxProd_default_2(Text, {
          dimColor: true,
          italic: true,
          children: [
            "Make sure you trust a plugin before installing, updating, or using it. Anthropic does not control what MCP servers, files, or other software are included in plugins and cannot verify that they will work as intended or that they won't change. See each plugin's homepage for more information.",
            customMessage ? ` ${customMessage}` : "",
          ],
        }),
      ],
    });
    $[2] = t2;
  } else t2 = $[2];
  return t2;
}
export { PluginTrustWarning };
