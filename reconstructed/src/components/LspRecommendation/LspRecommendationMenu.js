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
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { DesktopUpsellStartup } from "../DesktopUpsell/DesktopUpsellStartup.js";

//@ chunk-18hwfzwa.js:1194526-1195547 fingerprint = LspRecommendationMenu (0.429)
function LspRecommendationMenu(h) {
  let $ = w(10),
    {
      pluginName: pluginName,
      pluginDescription: pluginDescription,
      marketplaceName: marketplaceName,
      fileExtension: fileExtension,
      onResponse: onResponse,
    } = h,
    Be;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((Be = e(Text, {
      dimColor: !0,
      children: "LSP provides code intelligence like go-to-definition and error checking",
    })),
      ($[0] = Be));
  else Be = $[0];
  let He;
  if ($[1] !== fileExtension)
    ((He = {
      label: "Triggered by:",
      value: fileExtension,
      fallback: "(unnamed extension)",
      suffix: " files",
    }),
      ($[1] = fileExtension),
      ($[2] = He));
  else He = $[2];
  let We;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((We = [
      { label: e(Text, { children: "Yes, install" }), value: "yes" },
      { label: "No, not now", value: "no" },
      { label: e(Text, { children: "Never for this plugin" }), value: "never" },
      { label: "Disable all LSP recommendations", value: "disable" },
    ]),
      ($[3] = We));
  else We = $[3];
  let ze;
  if (
    $[4] !== marketplaceName ||
    $[5] !== onResponse ||
    $[6] !== pluginDescription ||
    $[7] !== pluginName ||
    $[8] !== He
  )
    ((ze = e(DesktopUpsellStartup, {
      title: "LSP plugin recommendation",
      intro: Be,
      pluginName: pluginName,
      pluginDescription: pluginDescription,
      marketplaceName: marketplaceName,
      extraIdentityRow: He,
      question: "Would you like to install this LSP plugin?",
      options: We,
      unansweredResponse: "timeout",
      onResponse: onResponse,
    })),
      ($[4] = marketplaceName),
      ($[5] = onResponse),
      ($[6] = pluginDescription),
      ($[7] = pluginName),
      ($[8] = He),
      ($[9] = ze));
  else ze = $[9];
  return ze;
}

export { LspRecommendationMenu };
