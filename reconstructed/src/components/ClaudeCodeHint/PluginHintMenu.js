/**
 * components/ClaudeCodeHint/PluginHintMenu.tsx
 *
 * 命令输出提示安装插件时的确认菜单（安装 / 不再提示）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/ClaudeCodeHint/PluginHintMenu.tsx
 * pieces: chunk-18hwfzwa.js (2)
 * attribution: affinity 1, fingerprint 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import { truncateToWidth } from "../../utils/format.js";
import { labelOr } from "../../utils/permissions/approvalPayloadSerialization.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { DesktopUpsellStartup } from "../DesktopUpsell/DesktopUpsellStartup.js";

//@ chunk-18hwfzwa.js:1108717-1108728 affinity
var lit = 24;
//@ chunk-18hwfzwa.js:1108728-1109652 fingerprint = PluginHintMenu (0.447)
function PluginHintMenu(h) {
  let $ = w(11),
    {
      pluginName: pluginName,
      pluginDescription: pluginDescription,
      marketplaceName: marketplaceName,
      sourceCommand: sourceCommand,
      onResponse: onResponse,
    } = h,
    Be;
  if ($[0] !== sourceCommand)
    ((Be = truncateToWidth(labelOr(sourceCommand, "(unnamed command)"), lit)),
      ($[0] = sourceCommand),
      ($[1] = Be));
  else Be = $[1];
  let He = Be,
    We;
  if ($[2] !== He)
    ((We = r(Text, {
      dimColor: !0,
      wrap: "truncate-end",
      children: ["The ", e(Text, { bold: !0, children: He }), " command suggests installing a plugin."],
    })),
      ($[2] = He),
      ($[3] = We));
  else We = $[3];
  let ze;
  if ($[4] === MEMO_CACHE_SENTINEL)
    ((ze = [
      { label: e(Text, { children: "Yes, install" }), value: "yes" },
      { label: "No", value: "no" },
      { label: "No, and don't show plugin installation hints again", value: "disable" },
    ]),
      ($[4] = ze));
  else ze = $[4];
  let Xe;
  if (
    $[5] !== marketplaceName ||
    $[6] !== onResponse ||
    $[7] !== pluginDescription ||
    $[8] !== pluginName ||
    $[9] !== We
  )
    ((Xe = e(DesktopUpsellStartup, {
      title: "Plugin recommendation",
      intro: We,
      pluginName: pluginName,
      pluginDescription: pluginDescription,
      marketplaceName: marketplaceName,
      question: "Would you like to install it?",
      options: ze,
      unansweredResponse: "no",
      onResponse: onResponse,
    })),
      ($[5] = marketplaceName),
      ($[6] = onResponse),
      ($[7] = pluginDescription),
      ($[8] = pluginName),
      ($[9] = We),
      ($[10] = Xe));
  else Xe = $[10];
  return Xe;
}

export { PluginHintMenu };
