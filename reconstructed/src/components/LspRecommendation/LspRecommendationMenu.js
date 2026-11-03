/**
 * components/LspRecommendation/LspRecommendationMenu.tsx
 *
 * 打开特定类型文件时推荐安装 LSP 插件的菜单。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/LspRecommendation/LspRecommendationMenu.tsx
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { DesktopUpsellStartup } from "../DesktopUpsell/DesktopUpsellStartup.js";

//@ chunk-18hwfzwa.js:1194526-1195547 fingerprint = LspRecommendationMenu (0.429)
function LspRecommendationMenu(props) {
  let $ = w(10);
  let { pluginName, pluginDescription, marketplaceName, fileExtension, onResponse } = props;
  let intro;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    intro = jsxProd_default(Text, {
      dimColor: true,
      children: "LSP provides code intelligence like go-to-definition and error checking",
    });
    $[0] = intro;
  } else intro = $[0];
  let extraIdentityRow;
  if ($[1] !== fileExtension) {
    extraIdentityRow = {
      label: "Triggered by:",
      value: fileExtension,
      fallback: "(unnamed extension)",
      suffix: " files",
    };
    $[1] = fileExtension;
    $[2] = extraIdentityRow;
  } else extraIdentityRow = $[2];
  let options;
  if ($[3] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: jsxProd_default(Text, {
          children: "Yes, install",
        }),
        value: "yes",
      },
      {
        label: "No, not now",
        value: "no",
      },
      {
        label: jsxProd_default(Text, {
          children: "Never for this plugin",
        }),
        value: "never",
      },
      {
        label: "Disable all LSP recommendations",
        value: "disable",
      },
    ];
    $[3] = options;
  } else options = $[3];
  let ze;
  if (
    $[4] !== marketplaceName ||
    $[5] !== onResponse ||
    $[6] !== pluginDescription ||
    $[7] !== pluginName ||
    $[8] !== extraIdentityRow
  ) {
    ze = jsxProd_default(DesktopUpsellStartup, {
      title: "LSP plugin recommendation",
      intro,
      pluginName,
      pluginDescription,
      marketplaceName,
      extraIdentityRow,
      question: "Would you like to install this LSP plugin?",
      options,
      unansweredResponse: "timeout",
      onResponse,
    });
    $[4] = marketplaceName;
    $[5] = onResponse;
    $[6] = pluginDescription;
    $[7] = pluginName;
    $[8] = extraIdentityRow;
    $[9] = ze;
  } else ze = $[9];
  return ze;
}
export { LspRecommendationMenu };
