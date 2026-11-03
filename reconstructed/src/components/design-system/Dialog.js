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
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullPageNotice } from "./NoticeUnderScene.js";
import { y, R, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import { useExitKeybindingEntries } from "../../hooks/useExitOnCtrlCD.js";
import { scrollViewportContext } from "../ScrollViewportContext.js";
import { measureElement } from "../../ink/hooks/useTerminalHooks.js";
import {
  jsxProd_default_2,
  jsxProd_default,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { DialogKeyHints, useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { Pane } from "./Pane.js";
import { Byline } from "./Byline.js";
import { KeyboardShortcutHint } from "./KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";

//@ chunk-thjvqmbc.js:8415-8438 sole-consumer
function returnFalse() {
  return false;
}
//@ chunk-thjvqmbc.js:8438-8461 sole-consumer
function returnFalse_2() {
  return false;
}
//@ chunk-thjvqmbc.js:8461-8491 affinity
var DEFAULT_CONFIRM_CANCEL_HINTS = renderConfirmCancelHints({});
var READONLY_HINT_FORMAT = stableEmptyObject(true);
var DEFAULT_CONFIRM_CANCEL_HINTS_2 = DEFAULT_CONFIRM_CANCEL_HINTS;
//@ chunk-thjvqmbc.js:8491-11137 fingerprint = Dialog (0.482)
/**
 * 对话框：标题（permission 等色）、副标题、内容、底部快捷键提示（Esc 取消 / 双击退出），可选 onCancel。
 */
function Dialog(props) {
  let $ = w(48);
  let {
    title,
    titleEnd,
    titleSuffix,
    subtitle,
    isSubtitleDimmed,
    children,
    onCancel,
    color,
    hideInputGuide,
    hideBorder,
    inputGuide,
    truncateInputGuide,
    isCancelActive,
    onInterrupt,
    exitOnCtrlCD,
    onExit,
  } = props;
  let isSubtitleDimmed_2 = isSubtitleDimmed === undefined ? true : isSubtitleDimmed;
  let T = color === undefined ? "permission" : color;
  let v = isCancelActive === undefined ? true : isCancelActive;
  let Y = exitOnCtrlCD === undefined ? false : exitOnCtrlCD;
  let isFullPageNotice = useIsFullPageNotice();
  let [U] = y(returnFalse);
  let F = isFullPageNotice || U;
  let m;
  if ($[0] !== T || $[1] !== F) {
    m = pickFirst(T, F);
    $[0] = T;
    $[1] = F;
    $[2] = m;
  } else m = $[2];
  let N = m;
  let color_2 = isFullPageNotice ? undefined : N;
  let children_2 = F ? DEFAULT_CONFIRM_CANCEL_HINTS_2 : DEFAULT_CONFIRM_CANCEL_HINTS;
  let d = R(null);
  let h = Y || onExit !== undefined;
  let { entries, exitState } = useExitKeybindingEntries(h ? onExit : onCancel, onInterrupt, v);
  let X;
  if ($[3] !== v || $[4] !== onCancel) {
    X = v
      ? [
          {
            action: "confirm:no",
            run: onCancel,
            hint: "cancel",
          },
        ]
      : [];
    $[3] = v;
    $[4] = onCancel;
    $[5] = X;
  } else X = $[5];
  let it;
  if ($[6] !== entries || $[7] !== X) {
    it = [...X, ...entries];
    $[6] = entries;
    $[7] = X;
    $[8] = it;
  } else it = $[8];
  let bindings = it;
  let V = Se(scrollViewportContext);
  let Re = R(null);
  let [le, Xt] = y(subtitle ? 2 : 1);
  let ot;
  if ($[9] !== V || $[10] !== le) {
    ot = () => {
      if (!V || !Re.current) {
        return;
      }
      let height = measureElement(Re.current).height;
      if (height !== le) Xt(height);
    };
    $[9] = V;
    $[10] = le;
    $[11] = ot;
  } else ot = $[11];
  zt(ot);
  let Ce = le + 1 + (hideInputGuide ? 0 : 2);
  let st;
  if ($[12] !== V || $[13] !== Ce) {
    st = V
      ? {
          ...V,
          rows: Math.max(0, V.rows - Ce),
        }
      : null;
    $[12] = V;
    $[13] = Ce;
    $[14] = st;
  } else st = $[14];
  let value = st;
  let ct;
  if ($[15] !== h || $[16] !== exitState || $[17] !== inputGuide) {
    ct =
      typeof inputGuide === "function"
        ? inputGuide(exitState)
        : exitState.pending
          ? jsxProd_default_2(Text, {
              children: ["Press ", exitState.keyName, " again to ", h ? "exit" : "cancel"],
            })
          : inputGuide != null
            ? inputGuide
            : undefined;
    $[15] = h;
    $[16] = exitState;
    $[17] = inputGuide;
    $[18] = ct;
  } else ct = $[18];
  let children_3 = ct;
  let Ne = typeof inputGuide === "function" || exitState.pending || inputGuide != null;
  let lt;
  if (
    $[19] !== children_3 ||
    $[20] !== children_2 ||
    $[21] !== hideInputGuide ||
    $[22] !== v ||
    $[23] !== F ||
    $[24] !== Ne ||
    $[25] !== truncateInputGuide
  ) {
    lt =
      !hideInputGuide &&
      jsxProd_default(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: Ne
          ? jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              wrap: truncateInputGuide ? "truncate" : undefined,
              children: children_3,
            })
          : !v
            ? jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: children_2,
              })
            : jsxProd_default(DialogKeyHints, {
                boundary: d,
                terse: F,
                format: F ? READONLY_HINT_FORMAT.format : undefined,
                fallback: jsxProd_default(Text, {
                  dimColor: true,
                  italic: true,
                  children: children_2,
                }),
              }),
      });
    $[19] = children_3;
    $[20] = children_2;
    $[21] = hideInputGuide;
    $[22] = v;
    $[23] = F;
    $[24] = Ne;
    $[25] = truncateInputGuide;
    $[26] = lt;
  } else lt = $[26];
  let ke = lt;
  const flexGrow = hideBorder || isFullPageNotice ? 0 : 1;
  let ae;
  if (
    $[27] !== isSubtitleDimmed_2 ||
    $[28] !== subtitle ||
    $[29] !== title ||
    $[30] !== color_2 ||
    $[31] !== titleEnd ||
    $[32] !== titleSuffix
  ) {
    ae = jsxProd_default(Box, {
      ref: Re,
      flexDirection: "column",
      children: jsxProd_default(DialogTitle, {
        title,
        titleEnd,
        titleSuffix,
        subtitle,
        isSubtitleDimmed: isSubtitleDimmed_2,
        color: color_2,
      }),
    });
    $[27] = isSubtitleDimmed_2;
    $[28] = subtitle;
    $[29] = title;
    $[30] = color_2;
    $[31] = titleEnd;
    $[32] = titleSuffix;
    $[33] = ae;
  } else ae = $[33];
  let de;
  if ($[34] !== value || $[35] !== children) {
    de = jsxProd_default(scrollViewportContext, {
      value,
      children,
    });
    $[34] = value;
    $[35] = children;
    $[36] = de;
  } else de = $[36];
  let pe;
  if ($[37] !== ae || $[38] !== de) {
    pe = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [ae, de],
    });
    $[37] = ae;
    $[38] = de;
    $[39] = pe;
  } else pe = $[39];
  let at;
  if ($[40] !== bindings || $[41] !== ke || $[42] !== flexGrow || $[43] !== pe) {
    at = jsxProd_default_2(useDialogKeybindings, {
      ref: d,
      scope: "Confirmation",
      claimFocus: true,
      flexGrow,
      flexDirection: "column",
      bindings,
      children: [pe, ke],
    });
    $[40] = bindings;
    $[41] = ke;
    $[42] = flexGrow;
    $[43] = pe;
    $[44] = at;
  } else at = $[44];
  let ue = at;
  if (hideBorder || isFullPageNotice) {
    return ue;
  }
  let dt;
  if ($[45] !== ue || $[46] !== N) {
    dt = jsxProd_default(Pane, {
      color: N,
      children: ue,
    });
    $[45] = ue;
    $[46] = N;
    $[47] = dt;
  } else dt = $[47];
  return dt;
}
//@ chunk-thjvqmbc.js:11137-11811 layout
/**
 * 对话框标题行：标题、标题后缀、右侧内容与可选副标题。
 */
function DialogTitle(props) {
  let $ = w(13);
  let { title, titleEnd, titleSuffix, subtitle, isSubtitleDimmed, color } = props;
  let S = isSubtitleDimmed === undefined ? true : isSubtitleDimmed;
  let O;
  if ($[0] !== color || $[1] !== title || $[2] !== titleSuffix) {
    O =
      titleSuffix == null
        ? jsxProd_default(Text, {
            bold: true,
            color,
            children: title,
          })
        : jsxProd_default_2(Text, {
            children: [
              jsxProd_default(Text, {
                bold: true,
                color,
                children: title,
              }),
              titleSuffix,
            ],
          });
    $[0] = color;
    $[1] = title;
    $[2] = titleSuffix;
    $[3] = O;
  } else O = $[3];
  let H = O;
  let u;
  if ($[4] !== titleEnd || $[5] !== H) {
    u = titleEnd
      ? jsxProd_default_2(Box, {
          justifyContent: "space-between",
          gap: 2,
          children: [
            H,
            jsxProd_default(Text, {
              dimColor: true,
              wrap: "truncate-start",
              children: titleEnd,
            }),
          ],
        })
      : H;
    $[4] = titleEnd;
    $[5] = H;
    $[6] = u;
  } else u = $[6];
  let D;
  if ($[7] !== S || $[8] !== subtitle) {
    D =
      subtitle &&
      (S
        ? jsxProd_default(Text, {
            dimColor: true,
            children: subtitle,
          })
        : subtitle);
    $[7] = S;
    $[8] = subtitle;
    $[9] = D;
  } else D = $[9];
  let I;
  if ($[10] !== u || $[11] !== D) {
    I = jsxProd_default_2(Fragment, {
      children: [u, D],
    });
    $[10] = u;
    $[11] = D;
    $[12] = I;
  } else I = $[12];
  return I;
}
//@ chunk-thjvqmbc.js:11811-11837 layout
function pickFirst(i, l) {
  return i;
}
//@ chunk-thjvqmbc.js:11837-12013 placement = _temp (0.712)
function renderConfirmCancelHints(exitState) {
  return jsxProd_default_2(Byline, {
    children: [
      jsxProd_default(KeyboardShortcutHint, {
        chord: "enter",
        action: "confirm",
        ...exitState,
      }),
      jsxProd_default(ConfigurableShortcutHint, {
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
