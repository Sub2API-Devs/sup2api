/**
 * components/agents/new-agent-creation/wizard-steps/ColorStep.tsx
 *
 * 向导步骤：选择颜色（实际内容为通用选择步骤）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/agents/new-agent-creation/wizard-steps/ColorStep.tsx
 * pieces: chunk-j6tt9nsa.js (4)
 * attribution: placement 3, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { init_react_production } from "../../../../../vendor/react/cjs/react.production.js";
import { notificationChannelLabel } from "../../../../commands/config/configSettings.js";
import { useMemoCache } from "../../../../../vendor/react/compiler-runtime.js";
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
import { beginDeferredInits } from "../../../../../runtime/deferred-init.js";

// This module is the first evaluated of an import cycle of 2 modules closed by ../../../Settings/Config.js;
// the load-time work of the cycle's statements marked "deferred" waits until the cycle is complete (runtime/deferred-init.js).
beginDeferredInits("src/components/Settings/Config.js");
//@ chunk-j6tt9nsa.js:11278-11282 placement
init_react_production();
//@ chunk-j6tt9nsa.js:11282-11326 placement
function notificationChannelOption(channel) {
  return {
    value: channel,
    label: notificationChannelLabel(channel),
  };
}
//@ chunk-j6tt9nsa.js:11326-11341 placement
function noop_4() {}
//@ chunk-j6tt9nsa.js:11341-12786 callgraph-witnessed (2.1.88 match: ColorStep, 0.188)
function ColorStep(props) {
  let $ = useMemoCache(26);
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
  let channelField;
  if ($[2] !== channel || $[3] !== onChangeChannel) {
    channelField = jsxProd_default(merged_2.Field, {
      label: "Channel",
      children: jsxProd_default(merged_2.Select, {
        value: channel,
        options,
        onChange: onChangeChannel,
      }),
    });
    $[2] = channel;
    $[3] = onChangeChannel;
    $[4] = channelField;
  } else channelField = $[4];
  let inputNeededField;
  if ($[5] !== inputNeededEnabled || $[6] !== onChangeInputNeeded || $[7] !== showInputNeededRow) {
    inputNeededField =
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
    $[8] = inputNeededField;
  } else inputNeededField = $[8];
  let doneField;
  if ($[9] !== doneEnabled || $[10] !== onChangeDone || $[11] !== showDoneRow) {
    doneField =
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
    $[12] = doneField;
  } else doneField = $[12];
  let fieldsBox;
  if ($[13] !== channelField || $[14] !== inputNeededField || $[15] !== doneField) {
    fieldsBox = jsxProd_default_2(merged_2, {
      visibleCount: 6,
      children: [channelField, inputNeededField, doneField],
    });
    $[13] = channelField;
    $[14] = inputNeededField;
    $[15] = doneField;
    $[16] = fieldsBox;
  } else fieldsBox = $[16];
  let mobileNotice;
  if ($[17] !== showDoneRow || $[18] !== showInputNeededRow) {
    mobileNotice = (showInputNeededRow || showDoneRow) && jsxProd_default(renderMobileNotice, {});
    $[17] = showDoneRow;
    $[18] = showInputNeededRow;
    $[19] = mobileNotice;
  } else mobileNotice = $[19];
  let children;
  if ($[20] !== fieldsBox || $[21] !== mobileNotice) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [fieldsBox, mobileNotice],
    });
    $[20] = fieldsBox;
    $[21] = mobileNotice;
    $[22] = children;
  } else children = $[22];
  let dialog;
  if ($[23] !== onClose || $[24] !== children) {
    dialog = jsxProd_default(Dialog, {
      title: "Notifications",
      onCancel: onClose,
      hideBorder: true,
      inputGuide,
      children,
    });
    $[23] = onClose;
    $[24] = children;
    $[25] = dialog;
  } else dialog = $[25];
  return dialog;
}
export { noop_4, ColorStep };
