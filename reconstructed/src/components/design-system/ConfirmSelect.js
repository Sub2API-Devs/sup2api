/**
 * components/design-system/ConfirmSelect.tsx
 *
 * 2.1.316 新增：带防误触延迟的确认/取消选择组件
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-q1cvb6kv.js (4)
 * attribution: placement 4
 */
import { init_react_production, y } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmButtons } from "../CustomSelect/selectTypeahead.js";
import { Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";

//@ chunk-q1cvb6kv.js:418-422 placement
init_react_production();
//@ chunk-q1cvb6kv.js:422-434 placement
var CONFIRM_ARM_DELAY_MS = 500;
//@ chunk-q1cvb6kv.js:434-480 placement
function useConfirmArmed(L = CONFIRM_ARM_DELAY_MS) {
  let terminalFocus = useTerminalFocus();
  return useTimeout(L, terminalFocus);
}
//@ chunk-q1cvb6kv.js:480-1993 placement
function ConfirmSelect(props) {
  let s = w(33);
  let {
    onConfirm,
    onCancel,
    confirmLabel,
    cancelLabel,
    cancelFirst,
    focus,
    hideIndexes,
    disablePrintableKeybindings,
    refuseInput,
    openedAt,
    windowMs,
    armAfterMs,
  } = props;
  let i = confirmLabel === undefined ? "Yes" : confirmLabel;
  let c = cancelLabel === undefined ? "No" : cancelLabel;
  let g = cancelFirst === undefined ? false : cancelFirst;
  let ne = focus === undefined ? "confirm" : focus;
  let hideIndexes_2 = hideIndexes === undefined ? false : hideIndexes;
  let disablePrintableKeybindings_2 =
    disablePrintableKeybindings === undefined ? false : disablePrintableKeybindings;
  let [N] = y(ne);
  let l = useConfirmArmed(armAfterMs ?? null) || armAfterMs === undefined;
  if (useIsScreenReaderEnabled()) {
    const windowMs_2 = windowMs ?? armAfterMs;
    let t;
    if (
      s[0] !== c ||
      s[1] !== i ||
      s[2] !== onCancel ||
      s[3] !== onConfirm ||
      s[4] !== openedAt ||
      s[5] !== refuseInput ||
      s[6] !== windowMs_2
    ) {
      t = jsxProd_default(ConfirmButtons, {
        confirmLabel: i,
        cancelLabel: c,
        onConfirm,
        onCancel,
        refuseInput,
        openedAt,
        windowMs: windowMs_2,
      });
      s[0] = c;
      s[1] = i;
      s[2] = onCancel;
      s[3] = onConfirm;
      s[4] = openedAt;
      s[5] = refuseInput;
      s[6] = windowMs_2;
      s[7] = t;
    } else t = s[7];
    return t;
  }
  let label;
  if (s[8] !== i || s[9] !== l) {
    label = l
      ? i
      : jsxProd_default(Text, {
          dimColor: true,
          children: i,
        });
    s[8] = i;
    s[9] = l;
    s[10] = label;
  } else label = s[10];
  let t;
  if (s[11] !== label) {
    t = {
      label,
      value: "confirm",
    };
    s[11] = label;
    s[12] = t;
  } else t = s[12];
  let m = t;
  let label_2;
  if (s[13] !== c || s[14] !== l) {
    label_2 = l
      ? c
      : jsxProd_default(Text, {
          dimColor: true,
          children: c,
        });
    s[13] = c;
    s[14] = l;
    s[15] = label_2;
  } else label_2 = s[15];
  let k;
  if (s[16] !== label_2) {
    k = {
      label: label_2,
      value: "cancel",
    };
    s[16] = label_2;
    s[17] = k;
  } else k = s[17];
  let f = k;
  let options;
  if (s[18] !== f || s[19] !== g || s[20] !== m) {
    options = g ? [f, m] : [m, f];
    s[18] = f;
    s[19] = g;
    s[20] = m;
    s[21] = options;
  } else options = s[21];
  const isDisabled = !l;
  let onChange;
  if (s[22] !== onCancel || s[23] !== onConfirm) {
    onChange = (oe) => (oe === "confirm" ? onConfirm() : onCancel());
    s[22] = onCancel;
    s[23] = onConfirm;
    s[24] = onChange;
  } else onChange = s[24];
  let q;
  if (
    s[25] !== disablePrintableKeybindings_2 ||
    s[26] !== hideIndexes_2 ||
    s[27] !== onCancel ||
    s[28] !== N ||
    s[29] !== options ||
    s[30] !== isDisabled ||
    s[31] !== onChange
  ) {
    q = jsxProd_default(ModelSelector, {
      options,
      selectedValue: NO_COMMITTED_ROW,
      hideIndexes: hideIndexes_2,
      disablePrintableKeybindings: disablePrintableKeybindings_2,
      isDisabled,
      defaultFocusValue: N,
      onChange,
      onCancel,
    });
    s[25] = disablePrintableKeybindings_2;
    s[26] = hideIndexes_2;
    s[27] = onCancel;
    s[28] = N;
    s[29] = options;
    s[30] = isDisabled;
    s[31] = onChange;
    s[32] = q;
  } else q = s[32];
  return q;
}
export { ConfirmSelect, useConfirmArmed, CONFIRM_ARM_DELAY_MS };
