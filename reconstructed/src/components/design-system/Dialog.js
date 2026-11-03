/**
 * components/design-system/Dialog.tsx
 *
 * 设计系统对话框：标题 + 内容 + 底部按键提示，Esc/confirm:no 取消、双击退出提示（被 157 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Dialog.tsx
 * pieces: chunk-thjvqmbc.js (7)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1, layout 2, placement 1
 */
import { nd } from "../../utils/stableEmptyObject.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullPageNotice } from "./NoticeUnderScene.js";
import { y, R, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import { useExitKeybindingEntries } from "../../hooks/useExitOnCtrlCD.js";
import { $E } from "../ScrollViewportContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import { r, e, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { DialogKeyHints, useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { Pane } from "./Pane.js";
import { Byline } from "./Byline.js";
import { KeyboardShortcutHint } from "./KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";

//@ chunk-thjvqmbc.js:8415-8438 sole-consumer
function $t() {
  return !1;
}
//@ chunk-thjvqmbc.js:8438-8461 sole-consumer
function ii() {
  return !1;
}
//@ chunk-thjvqmbc.js:8461-8491 affinity
var he = renderConfirmCancelHints({}),
  Ie = nd(!0),
  Me = he;
/**
 * 对话框：标题（permission 等色）、副标题、内容、底部快捷键提示（Esc 取消 / 双击退出），可选 onCancel。
 */
//@ chunk-thjvqmbc.js:8491-11137 fingerprint = Dialog (0.482)
function Dialog(t0) {
  let $ = w(48),
    {
      title: title,
      titleEnd: titleEnd,
      titleSuffix: titleSuffix,
      subtitle: subtitle,
      isSubtitleDimmed: isSubtitleDimmed,
      children: children,
      onCancel: onCancel,
      color: t1,
      hideInputGuide: hideInputGuide,
      hideBorder: hideBorder,
      inputGuide: inputGuide,
      truncateInputGuide: truncateInputGuide,
      isCancelActive: t2,
      onInterrupt: onInterrupt,
      exitOnCtrlCD: exitOnCtrlCD,
      onExit: onExit,
    } = t0,
    B = isSubtitleDimmed === void 0 ? !0 : isSubtitleDimmed,
    T = t1 === void 0 ? "permission" : t1,
    v = t2 === void 0 ? !0 : t2,
    Y = exitOnCtrlCD === void 0 ? !1 : exitOnCtrlCD,
    M = useIsFullPageNotice(),
    [U] = y($t),
    F = M || U,
    m;
  if ($[0] !== T || $[1] !== F) ((m = tt(T, F)), ($[0] = T), ($[1] = F), ($[2] = m));
  else m = $[2];
  let N = m,
    W = M ? void 0 : N,
    o = F ? Me : he,
    d = R(null),
    h = Y || onExit !== void 0,
    { entries: entries, exitState: exitState } = useExitKeybindingEntries(
      h ? onExit : onCancel,
      onInterrupt,
      v,
    ),
    X;
  if ($[3] !== v || $[4] !== onCancel)
    ((X = v ? [{ action: "confirm:no", run: onCancel, hint: "cancel" }] : []),
      ($[3] = v),
      ($[4] = onCancel),
      ($[5] = X));
  else X = $[5];
  let it;
  if ($[6] !== entries || $[7] !== X) ((it = [...X, ...entries]), ($[6] = entries), ($[7] = X), ($[8] = it));
  else it = $[8];
  let xe = it,
    V = Se($E),
    Re = R(null),
    [le, Xt] = y(subtitle ? 2 : 1),
    ot;
  if ($[9] !== V || $[10] !== le)
    ((ot = () => {
      if (!V || !Re.current) {
        return;
      }
      let height = measureElement(Re.current).height;
      if (height !== le) Xt(height);
    }),
      ($[9] = V),
      ($[10] = le),
      ($[11] = ot));
  else ot = $[11];
  zt(ot);
  let Ce = le + 1 + (hideInputGuide ? 0 : 2),
    st;
  if ($[12] !== V || $[13] !== Ce)
    ((st = V ? { ...V, rows: Math.max(0, V.rows - Ce) } : null), ($[12] = V), ($[13] = Ce), ($[14] = st));
  else st = $[14];
  let De = st,
    ct;
  if ($[15] !== h || $[16] !== exitState || $[17] !== inputGuide)
    ((ct =
      typeof inputGuide === "function"
        ? inputGuide(exitState)
        : exitState.pending
          ? r(Text, { children: ["Press ", exitState.keyName, " again to ", h ? "exit" : "cancel"] })
          : inputGuide != null
            ? inputGuide
            : void 0),
      ($[15] = h),
      ($[16] = exitState),
      ($[17] = inputGuide),
      ($[18] = ct));
  else ct = $[18];
  let ve = ct,
    Ne = typeof inputGuide === "function" || exitState.pending || inputGuide != null,
    lt;
  if (
    $[19] !== ve ||
    $[20] !== o ||
    $[21] !== hideInputGuide ||
    $[22] !== v ||
    $[23] !== F ||
    $[24] !== Ne ||
    $[25] !== truncateInputGuide
  )
    ((lt =
      !hideInputGuide &&
      e(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: Ne
          ? e(Text, {
              dimColor: !0,
              italic: !0,
              wrap: truncateInputGuide ? "truncate" : void 0,
              children: ve,
            })
          : !v
            ? e(Text, { dimColor: !0, italic: !0, children: o })
            : e(DialogKeyHints, {
                boundary: d,
                terse: F,
                format: F ? Ie.format : void 0,
                fallback: e(Text, { dimColor: !0, italic: !0, children: o }),
              }),
      })),
      ($[19] = ve),
      ($[20] = o),
      ($[21] = hideInputGuide),
      ($[22] = v),
      ($[23] = F),
      ($[24] = Ne),
      ($[25] = truncateInputGuide),
      ($[26] = lt));
  else lt = $[26];
  let ke = lt;
  const Ke = hideBorder || M ? 0 : 1;
  let ae;
  if (
    $[27] !== B ||
    $[28] !== subtitle ||
    $[29] !== title ||
    $[30] !== W ||
    $[31] !== titleEnd ||
    $[32] !== titleSuffix
  )
    ((ae = e(Box, {
      ref: Re,
      flexDirection: "column",
      children: e(DialogTitle, {
        title: title,
        titleEnd: titleEnd,
        titleSuffix: titleSuffix,
        subtitle: subtitle,
        isSubtitleDimmed: B,
        color: W,
      }),
    })),
      ($[27] = B),
      ($[28] = subtitle),
      ($[29] = title),
      ($[30] = W),
      ($[31] = titleEnd),
      ($[32] = titleSuffix),
      ($[33] = ae));
  else ae = $[33];
  let de;
  if ($[34] !== De || $[35] !== children)
    ((de = e($E, { value: De, children: children })), ($[34] = De), ($[35] = children), ($[36] = de));
  else de = $[36];
  let pe;
  if ($[37] !== ae || $[38] !== de)
    ((pe = r(Box, { flexDirection: "column", gap: 1, children: [ae, de] })),
      ($[37] = ae),
      ($[38] = de),
      ($[39] = pe));
  else pe = $[39];
  let at;
  if ($[40] !== xe || $[41] !== ke || $[42] !== Ke || $[43] !== pe)
    ((at = r(useDialogKeybindings, {
      ref: d,
      scope: "Confirmation",
      claimFocus: !0,
      flexGrow: Ke,
      flexDirection: "column",
      bindings: xe,
      children: [pe, ke],
    })),
      ($[40] = xe),
      ($[41] = ke),
      ($[42] = Ke),
      ($[43] = pe),
      ($[44] = at));
  else at = $[44];
  let ue = at;
  if (hideBorder || M) {
    return ue;
  }
  let dt;
  if ($[45] !== ue || $[46] !== N)
    ((dt = e(Pane, { color: N, children: ue })), ($[45] = ue), ($[46] = N), ($[47] = dt));
  else dt = $[47];
  return dt;
}
/**
 * 对话框标题行：标题、标题后缀、右侧内容与可选副标题。
 */
//@ chunk-thjvqmbc.js:11137-11811 layout
function DialogTitle(props) {
  let $ = w(13),
    {
      title: title,
      titleEnd: titleEnd,
      titleSuffix: titleSuffix,
      subtitle: subtitle,
      isSubtitleDimmed: isSubtitleDimmed,
      color: color,
    } = props,
    S = isSubtitleDimmed === void 0 ? !0 : isSubtitleDimmed,
    O;
  if ($[0] !== color || $[1] !== title || $[2] !== titleSuffix)
    ((O =
      titleSuffix == null
        ? e(Text, { bold: !0, color: color, children: title })
        : r(Text, { children: [e(Text, { bold: !0, color: color, children: title }), titleSuffix] })),
      ($[0] = color),
      ($[1] = title),
      ($[2] = titleSuffix),
      ($[3] = O));
  else O = $[3];
  let H = O,
    u;
  if ($[4] !== titleEnd || $[5] !== H)
    ((u = titleEnd
      ? r(Box, {
          justifyContent: "space-between",
          gap: 2,
          children: [H, e(Text, { dimColor: !0, wrap: "truncate-start", children: titleEnd })],
        })
      : H),
      ($[4] = titleEnd),
      ($[5] = H),
      ($[6] = u));
  else u = $[6];
  let D;
  if ($[7] !== S || $[8] !== subtitle)
    ((D = subtitle && (S ? e(Text, { dimColor: !0, children: subtitle }) : subtitle)),
      ($[7] = S),
      ($[8] = subtitle),
      ($[9] = D));
  else D = $[9];
  let I;
  if ($[10] !== u || $[11] !== D)
    ((I = r(Fragment, { children: [u, D] })), ($[10] = u), ($[11] = D), ($[12] = I));
  else I = $[12];
  return I;
}
//@ chunk-thjvqmbc.js:11811-11837 layout
function tt(i, l) {
  return i;
}
//@ chunk-thjvqmbc.js:11837-12013 placement = _temp (0.712)
function renderConfirmCancelHints(exitState) {
  return r(Byline, {
    children: [
      e(KeyboardShortcutHint, { chord: "enter", action: "confirm", ...exitState }),
      e(ConfigurableShortcutHint, {
        action: "confirm:no",
        context: "Confirmation",
        fallback: "Esc",
        description: "cancel",
        ...exitState,
      }),
    ],
  });
}

export { Dialog };
