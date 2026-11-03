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
import { j } from "../../../../../vendor/react/cjs/react.production.js";
import { notificationChannelLabel } from "../../../../commands/config/configSettings.js";
import { w } from "../../../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../../../runtime/bun-runtime.js";
import { r, e } from "../../../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../../../design-system/Byline.js";
import { KeyboardShortcutHint } from "../../../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../../../ConfigurableShortcutHint.js";
import { NOTIFICATION_CHANNELS } from "../../../../utils/config.js";
import { merged as merged_2 } from "../../../CustomSelect/selectA11y.js";
import { renderMobileNotice } from "../../../Settings/Config.js";
import { Box } from "../../../../ink/components/Text.js";
import { Dialog } from "../../../design-system/Dialog.js";

//@ chunk-9h8dr0qb.js:11300-11304 placement
j();
//@ chunk-9h8dr0qb.js:11304-11348 placement
function fu(J) {
  return { value: J, label: notificationChannelLabel(J) };
}
//@ chunk-9h8dr0qb.js:11348-11363 placement
function pu() {}
//@ chunk-9h8dr0qb.js:11363-12815 callgraph-fingerprint = ColorStep (0.188)
function ColorStep(o) {
  let $ = w(26),
    {
      channel: channel,
      showInputNeededRow: showInputNeededRow,
      showDoneRow: showDoneRow,
      inputNeededEnabled: inputNeededEnabled,
      doneEnabled: doneEnabled,
      onChangeChannel: onChangeChannel,
      onChangeInputNeeded: onChangeInputNeeded,
      onChangeDone: onChangeDone,
      onClose: onClose,
    } = o,
    W;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((W = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: ["up", "down"], action: "navigate" }),
        e(KeyboardShortcutHint, { chord: "enter", action: "change" }),
        e(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "close",
        }),
      ],
    })),
      ($[0] = W));
  else W = $[0];
  let M;
  if ($[1] === MEMO_CACHE_SENTINEL) ((M = NOTIFICATION_CHANNELS.map(fu)), ($[1] = M));
  else M = $[1];
  let B;
  if ($[2] !== channel || $[3] !== onChangeChannel)
    ((B = e(merged_2.Field, {
      label: "Channel",
      children: e(merged_2.Select, { value: channel, options: M, onChange: onChangeChannel }),
    })),
      ($[2] = channel),
      ($[3] = onChangeChannel),
      ($[4] = B));
  else B = $[4];
  let H;
  if ($[5] !== inputNeededEnabled || $[6] !== onChangeInputNeeded || $[7] !== showInputNeededRow)
    ((H =
      showInputNeededRow &&
      e(merged_2.Field, {
        label: "Notify when Claude needs you",
        children: e(merged_2.Toggle, { value: inputNeededEnabled, onChange: onChangeInputNeeded }),
      })),
      ($[5] = inputNeededEnabled),
      ($[6] = onChangeInputNeeded),
      ($[7] = showInputNeededRow),
      ($[8] = H));
  else H = $[8];
  let K;
  if ($[9] !== doneEnabled || $[10] !== onChangeDone || $[11] !== showDoneRow)
    ((K =
      showDoneRow &&
      e(merged_2.Field, {
        label: "Notify when Claude is done",
        children: e(merged_2.Toggle, { value: doneEnabled, onChange: onChangeDone }),
      })),
      ($[9] = doneEnabled),
      ($[10] = onChangeDone),
      ($[11] = showDoneRow),
      ($[12] = K));
  else K = $[12];
  let ee;
  if ($[13] !== B || $[14] !== H || $[15] !== K)
    ((ee = r(merged_2, { visibleCount: 6, children: [B, H, K] })),
      ($[13] = B),
      ($[14] = H),
      ($[15] = K),
      ($[16] = ee));
  else ee = $[16];
  let ne;
  if ($[17] !== showDoneRow || $[18] !== showInputNeededRow)
    ((ne = (showInputNeededRow || showDoneRow) && e(renderMobileNotice, {})),
      ($[17] = showDoneRow),
      ($[18] = showInputNeededRow),
      ($[19] = ne));
  else ne = $[19];
  let V;
  if ($[20] !== ee || $[21] !== ne)
    ((V = r(Box, { flexDirection: "column", children: [ee, ne] })), ($[20] = ee), ($[21] = ne), ($[22] = V));
  else V = $[22];
  let L;
  if ($[23] !== onClose || $[24] !== V)
    ((L = e(Dialog, {
      title: "Notifications",
      onCancel: onClose,
      hideBorder: !0,
      inputGuide: W,
      children: V,
    })),
      ($[23] = onClose),
      ($[24] = V),
      ($[25] = L));
  else L = $[25];
  return L;
}

export { pu, ColorStep };
