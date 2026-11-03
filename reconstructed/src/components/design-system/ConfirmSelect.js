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
import { j, y } from "../../../vendor/react/cjs/react.production.js";
import { useTerminalFocus } from "../../ink/hooks/use-terminal-focus.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { ConfirmButtons } from "../CustomSelect/selectTypeahead.js";
import { Text } from "../../ink/components/Text.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";

//@ chunk-q1cvb6kv.js:418-422 placement
j();
//@ chunk-q1cvb6kv.js:422-434 placement
var CONFIRM_ARM_DELAY_MS = 500;
//@ chunk-q1cvb6kv.js:434-480 placement
function useConfirmArmed(L = CONFIRM_ARM_DELAY_MS) {
  let r = useTerminalFocus();
  return useTimeout(L, r);
}
//@ chunk-q1cvb6kv.js:480-1993 placement
function ConfirmSelect(L) {
  let s = w(33),
    {
      onConfirm: onConfirm,
      onCancel: onCancel,
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
      cancelFirst: cancelFirst,
      focus: focus,
      hideIndexes: hideIndexes,
      disablePrintableKeybindings: disablePrintableKeybindings,
      refuseInput: refuseInput,
      openedAt: openedAt,
      windowMs: windowMs,
      armAfterMs: armAfterMs,
    } = L,
    i = confirmLabel === void 0 ? "Yes" : confirmLabel,
    c = cancelLabel === void 0 ? "No" : cancelLabel,
    g = cancelFirst === void 0 ? !1 : cancelFirst,
    ne = focus === void 0 ? "confirm" : focus,
    v = hideIndexes === void 0 ? !1 : hideIndexes,
    x = disablePrintableKeybindings === void 0 ? !1 : disablePrintableKeybindings,
    [N] = y(ne),
    l = useConfirmArmed(armAfterMs ?? null) || armAfterMs === void 0;
  if (useIsScreenReaderEnabled()) {
    const a = windowMs ?? armAfterMs;
    let t;
    if (
      s[0] !== c ||
      s[1] !== i ||
      s[2] !== onCancel ||
      s[3] !== onConfirm ||
      s[4] !== openedAt ||
      s[5] !== refuseInput ||
      s[6] !== a
    )
      ((t = e(ConfirmButtons, {
        confirmLabel: i,
        cancelLabel: c,
        onConfirm: onConfirm,
        onCancel: onCancel,
        refuseInput: refuseInput,
        openedAt: openedAt,
        windowMs: a,
      })),
        (s[0] = c),
        (s[1] = i),
        (s[2] = onCancel),
        (s[3] = onConfirm),
        (s[4] = openedAt),
        (s[5] = refuseInput),
        (s[6] = a),
        (s[7] = t));
    else t = s[7];
    return t;
  }
  let a;
  if (s[8] !== i || s[9] !== l)
    ((a = l ? i : e(Text, { dimColor: !0, children: i })), (s[8] = i), (s[9] = l), (s[10] = a));
  else a = s[10];
  let t;
  if (s[11] !== a) ((t = { label: a, value: "confirm" }), (s[11] = a), (s[12] = t));
  else t = s[12];
  let m = t,
    d;
  if (s[13] !== c || s[14] !== l)
    ((d = l ? c : e(Text, { dimColor: !0, children: c })), (s[13] = c), (s[14] = l), (s[15] = d));
  else d = s[15];
  let k;
  if (s[16] !== d) ((k = { label: d, value: "cancel" }), (s[16] = d), (s[17] = k));
  else k = s[17];
  let f = k,
    u;
  if (s[18] !== f || s[19] !== g || s[20] !== m)
    ((u = g ? [f, m] : [m, f]), (s[18] = f), (s[19] = g), (s[20] = m), (s[21] = u));
  else u = s[21];
  const P = !l;
  let b;
  if (s[22] !== onCancel || s[23] !== onConfirm)
    ((b = (oe) => (oe === "confirm" ? onConfirm() : onCancel())),
      (s[22] = onCancel),
      (s[23] = onConfirm),
      (s[24] = b));
  else b = s[24];
  let q;
  if (
    s[25] !== x ||
    s[26] !== v ||
    s[27] !== onCancel ||
    s[28] !== N ||
    s[29] !== u ||
    s[30] !== P ||
    s[31] !== b
  )
    ((q = e(ModelSelector, {
      options: u,
      selectedValue: NO_COMMITTED_ROW,
      hideIndexes: v,
      disablePrintableKeybindings: x,
      isDisabled: P,
      defaultFocusValue: N,
      onChange: b,
      onCancel: onCancel,
    })),
      (s[25] = x),
      (s[26] = v),
      (s[27] = onCancel),
      (s[28] = N),
      (s[29] = u),
      (s[30] = P),
      (s[31] = b),
      (s[32] = q));
  else q = s[32];
  return q;
}

export { ConfirmSelect, useConfirmArmed, CONFIRM_ARM_DELAY_MS };
