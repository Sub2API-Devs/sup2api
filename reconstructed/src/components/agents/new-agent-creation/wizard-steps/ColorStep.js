/**
 * components/agents/new-agent-creation/wizard-steps/ColorStep.tsx
 *
 * 向导步骤：选择颜色（实际内容为通用选择步骤）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/ColorStep.tsx
 * pieces: chunk-9h8dr0qb.js (4)
 * attribution: placement 3, callgraph-fingerprint 1
 */
import { init_react_production } from "../../../../../vendor/react/cjs/react.production.js";
import { notificationChannelLabel } from "../../../../commands/config/configSettings.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { NOTIFICATION_CHANNELS } from "../../../../utils/config.js";
import { merged as merged_2 } from "../../../CustomSelect/selectA11y.js";
import { renderMobileNotice } from "../../../Settings/Config.js";
import { Box } from "../../../../ink/components/Text.js";
import { Dialog } from "../../../design-system/Dialog.js";

//@ chunk-9h8dr0qb.js:11300-11304 placement
init_react_production();
//@ chunk-9h8dr0qb.js:11304-11348 placement
function notificationChannelOption(J) {
  return {
    value: J,
    label: notificationChannelLabel(J),
  };
}
//@ chunk-9h8dr0qb.js:11348-11363 placement
function noop_4() {}
//@ chunk-9h8dr0qb.js:11363-12815 callgraph-fingerprint = ColorStep (0.188)
function ColorStep(props) {
  let $ = w(26);
  let {
    channel,
    showInputNeededRow,
    showDoneRow,
    inputNeededEnabled,
    doneEnabled,
    onChangeChannel,
    onChangeInputNeeded,
    onChangeDone,
    onClose,
  } = props;
  let inputGuide;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["up", "down"],
          action: "navigate",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "change",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "close",
        }),
      ],
    });
    $[0] = inputGuide;
  } else inputGuide = $[0];
  let options;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    options = NOTIFICATION_CHANNELS.map(notificationChannelOption);
    $[1] = options;
  } else options = $[1];
  let B;
  if ($[2] !== channel || $[3] !== onChangeChannel) {
    B = jsxProd_default(merged_2.Field, {
      label: "Channel",
      children: jsxProd_default(merged_2.Select, {
        value: channel,
        options,
        onChange: onChangeChannel,
      }),
    });
    $[2] = channel;
    $[3] = onChangeChannel;
    $[4] = B;
  } else B = $[4];
  let H;
  if ($[5] !== inputNeededEnabled || $[6] !== onChangeInputNeeded || $[7] !== showInputNeededRow) {
    H =
      showInputNeededRow &&
      jsxProd_default(merged_2.Field, {
        label: "Notify when Claude needs you",
        children: jsxProd_default(merged_2.Toggle, {
          value: inputNeededEnabled,
          onChange: onChangeInputNeeded,
        }),
      });
    $[5] = inputNeededEnabled;
    $[6] = onChangeInputNeeded;
    $[7] = showInputNeededRow;
    $[8] = H;
  } else H = $[8];
  let K;
  if ($[9] !== doneEnabled || $[10] !== onChangeDone || $[11] !== showDoneRow) {
    K =
      showDoneRow &&
      jsxProd_default(merged_2.Field, {
        label: "Notify when Claude is done",
        children: jsxProd_default(merged_2.Toggle, {
          value: doneEnabled,
          onChange: onChangeDone,
        }),
      });
    $[9] = doneEnabled;
    $[10] = onChangeDone;
    $[11] = showDoneRow;
    $[12] = K;
  } else K = $[12];
  let ee;
  if ($[13] !== B || $[14] !== H || $[15] !== K) {
    ee = jsxProd_default_2(merged_2, {
      visibleCount: 6,
      children: [B, H, K],
    });
    $[13] = B;
    $[14] = H;
    $[15] = K;
    $[16] = ee;
  } else ee = $[16];
  let ne;
  if ($[17] !== showDoneRow || $[18] !== showInputNeededRow) {
    ne = (showInputNeededRow || showDoneRow) && jsxProd_default(renderMobileNotice, {});
    $[17] = showDoneRow;
    $[18] = showInputNeededRow;
    $[19] = ne;
  } else ne = $[19];
  let children;
  if ($[20] !== ee || $[21] !== ne) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [ee, ne],
    });
    $[20] = ee;
    $[21] = ne;
    $[22] = children;
  } else children = $[22];
  let L;
  if ($[23] !== onClose || $[24] !== children) {
    L = jsxProd_default(Dialog, {
      title: "Notifications",
      onCancel: onClose,
      hideBorder: true,
      inputGuide,
      children,
    });
    $[23] = onClose;
    $[24] = children;
    $[25] = L;
  } else L = $[25];
  return L;
}
export { noop_4, ColorStep };
