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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { truncateToWidth } from "../../utils/format.js";
import { labelOr } from "../../utils/permissions/approvalPayloadSerialization.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text } from "../../ink/components/Text.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { DesktopUpsellStartup } from "../DesktopUpsell/DesktopUpsellStartup.js";

//@ chunk-18hwfzwa.js:1108717-1108728 affinity
var MAX_HINT_LABEL_WIDTH = 24;
//@ chunk-18hwfzwa.js:1108728-1109652 fingerprint = PluginHintMenu (0.447)
function PluginHintMenu(props) {
  let $ = useMemoCache(11);
  let { pluginName, pluginDescription, marketplaceName, sourceCommand, onResponse } = props;
  let commandLabel;
  if ($[0] !== sourceCommand) {
    commandLabel = truncateToWidth(labelOr(sourceCommand, "(unnamed command)"), MAX_HINT_LABEL_WIDTH);
    $[0] = sourceCommand;
    $[1] = commandLabel;
  } else commandLabel = $[1];
  let children = commandLabel;
  let intro;
  if ($[2] !== children) {
    intro = jsxProd_default_2(Text, {
      dimColor: true,
      wrap: "truncate-end",
      children: [
        "The ",
        jsxProd_default(Text, {
          bold: true,
          children,
        }),
        " command suggests installing a plugin.",
      ],
    });
    $[2] = children;
    $[3] = intro;
  } else intro = $[3];
  let options;
  if ($[4] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: jsxProd_default(Text, {
          children: "Yes, install",
        }),
        value: "yes",
      },
      {
        label: "No",
        value: "no",
      },
      {
        label: "No, and don't show plugin installation hints again",
        value: "disable",
      },
    ];
    $[4] = options;
  } else options = $[4];
  let upsell;
  if (
    $[5] !== marketplaceName ||
    $[6] !== onResponse ||
    $[7] !== pluginDescription ||
    $[8] !== pluginName ||
    $[9] !== intro
  ) {
    upsell = jsxProd_default(DesktopUpsellStartup, {
      title: "Plugin recommendation",
      intro,
      pluginName,
      pluginDescription,
      marketplaceName,
      question: "Would you like to install it?",
      options,
      unansweredResponse: "no",
      onResponse,
    });
    $[5] = marketplaceName;
    $[6] = onResponse;
    $[7] = pluginDescription;
    $[8] = pluginName;
    $[9] = intro;
    $[10] = upsell;
  } else upsell = $[10];
  return upsell;
}
export { PluginHintMenu };
