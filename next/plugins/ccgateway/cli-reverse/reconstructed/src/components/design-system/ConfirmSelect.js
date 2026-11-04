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
import { init_react_production, useState } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmButtons } from "../CustomSelect/selectTypeahead.js";
import { Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-q1cvb6kv.js:418-422 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-q1cvb6kv.js:418", () => {
  init_react_production();
});
//@ chunk-q1cvb6kv.js:422-434 placement
var CONFIRM_ARM_DELAY_MS = 500;
//@ chunk-q1cvb6kv.js:434-480 placement
function useConfirmArmed(delayMs = CONFIRM_ARM_DELAY_MS) {
  let terminalFocus = useTerminalFocus();
  return useTimeout(delayMs, terminalFocus);
}
//@ chunk-q1cvb6kv.js:480-1993 placement
function ConfirmSelect(props) {
  let $ = useMemoCache(33);
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
  let confirmText = confirmLabel === undefined ? "Yes" : confirmLabel;
  let cancelText = cancelLabel === undefined ? "No" : cancelLabel;
  let isCancelFirst = cancelFirst === undefined ? false : cancelFirst;
  let initialFocus = focus === undefined ? "confirm" : focus;
  let hideIndexes_2 = hideIndexes === undefined ? false : hideIndexes;
  let disablePrintableKeybindings_2 =
    disablePrintableKeybindings === undefined ? false : disablePrintableKeybindings;
  let [initialFocusValue] = useState(initialFocus);
  let isArmed = useConfirmArmed(armAfterMs ?? null) || armAfterMs === undefined;
  if (useIsScreenReaderEnabled()) {
    const windowMs_2 = windowMs ?? armAfterMs;
    let buttonsElement;
    if (
      $[0] !== cancelText ||
      $[1] !== confirmText ||
      $[2] !== onCancel ||
      $[3] !== onConfirm ||
      $[4] !== openedAt ||
      $[5] !== refuseInput ||
      $[6] !== windowMs_2
    ) {
      buttonsElement = jsxProd_default(ConfirmButtons, {
        confirmLabel: confirmText,
        cancelLabel: cancelText,
        onConfirm,
        onCancel,
        refuseInput,
        openedAt,
        windowMs: windowMs_2,
      });
      $[0] = cancelText;
      $[1] = confirmText;
      $[2] = onCancel;
      $[3] = onConfirm;
      $[4] = openedAt;
      $[5] = refuseInput;
      $[6] = windowMs_2;
      $[7] = buttonsElement;
    } else buttonsElement = $[7];
    return buttonsElement;
  }
  let label;
  if ($[8] !== confirmText || $[9] !== isArmed) {
    label = isArmed
      ? confirmText
      : jsxProd_default(Text, {
          dimColor: true,
          children: confirmText,
        });
    $[8] = confirmText;
    $[9] = isArmed;
    $[10] = label;
  } else label = $[10];
  let confirmOptionDraft;
  if ($[11] !== label) {
    confirmOptionDraft = {
      label,
      value: "confirm",
    };
    $[11] = label;
    $[12] = confirmOptionDraft;
  } else confirmOptionDraft = $[12];
  let confirmOption = confirmOptionDraft;
  let label_2;
  if ($[13] !== cancelText || $[14] !== isArmed) {
    label_2 = isArmed
      ? cancelText
      : jsxProd_default(Text, {
          dimColor: true,
          children: cancelText,
        });
    $[13] = cancelText;
    $[14] = isArmed;
    $[15] = label_2;
  } else label_2 = $[15];
  let cancelOptionDraft;
  if ($[16] !== label_2) {
    cancelOptionDraft = {
      label: label_2,
      value: "cancel",
    };
    $[16] = label_2;
    $[17] = cancelOptionDraft;
  } else cancelOptionDraft = $[17];
  let cancelOption = cancelOptionDraft;
  let options;
  if ($[18] !== cancelOption || $[19] !== isCancelFirst || $[20] !== confirmOption) {
    options = isCancelFirst ? [cancelOption, confirmOption] : [confirmOption, cancelOption];
    $[18] = cancelOption;
    $[19] = isCancelFirst;
    $[20] = confirmOption;
    $[21] = options;
  } else options = $[21];
  const isDisabled = !isArmed;
  let onChange;
  if ($[22] !== onCancel || $[23] !== onConfirm) {
    onChange = (selectedValue) => (selectedValue === "confirm" ? onConfirm() : onCancel());
    $[22] = onCancel;
    $[23] = onConfirm;
    $[24] = onChange;
  } else onChange = $[24];
  let selectorElement;
  if (
    $[25] !== disablePrintableKeybindings_2 ||
    $[26] !== hideIndexes_2 ||
    $[27] !== onCancel ||
    $[28] !== initialFocusValue ||
    $[29] !== options ||
    $[30] !== isDisabled ||
    $[31] !== onChange
  ) {
    selectorElement = jsxProd_default(ModelSelector, {
      options,
      selectedValue: NO_COMMITTED_ROW,
      hideIndexes: hideIndexes_2,
      disablePrintableKeybindings: disablePrintableKeybindings_2,
      isDisabled,
      defaultFocusValue: initialFocusValue,
      onChange,
      onCancel,
    });
    $[25] = disablePrintableKeybindings_2;
    $[26] = hideIndexes_2;
    $[27] = onCancel;
    $[28] = initialFocusValue;
    $[29] = options;
    $[30] = isDisabled;
    $[31] = onChange;
    $[32] = selectorElement;
  } else selectorElement = $[32];
  return selectorElement;
}
export { ConfirmSelect, useConfirmArmed, CONFIRM_ARM_DELAY_MS };
