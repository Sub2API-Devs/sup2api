/**
 * components/permissions/PermissionDialog.tsx
 *
 * 权限对话框外框（"Permission Required:" 标题、圆角 permission 色边框），被 26 处使用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionDialog.tsx
 * pieces: chunk-3v13eg2e.js (3)
 * attribution: affinity 1, fingerprint 1, sole-consumer 1
 */
import { w } from "../../../vendor/react/compiler-runtime.js";
import {
  useAskPositionLabel,
  PermissionRequestTitle,
  describeRequestSource,
} from "./PermissionRequestTitle.js";
import { Se, Fy } from "../../../vendor/react/cjs/react.production.js";
import { TerminalSizeContext } from "../../ink/terminalModes.js";
import { useScrollViewportSize, Tl } from "../ScrollViewportContext.js";
import { e, r, Fragment } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { sanitizeDisplayText } from "../../utils/permissions/approvalPayloadSerialization.js";
import { zR, PANE_PADDING } from "../design-system/Pane.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-3v13eg2e.js:3158-3183 affinity
var ce = { keyCase: "lower" };
/**
 * 权限对话框外框：圆角边框（permission 色）、标题 "Permission Required: …"、可选副标题与队友徽章。
 */
//@ chunk-3v13eg2e.js:3183-4849 fingerprint = PermissionDialog (0.755)
function PermissionDialog_2(t0) {
  let $ = w(36),
    {
      title: title,
      subtitle: subtitle,
      color: t1,
      titleColor: titleColor,
      innerPaddingX: t2,
      requestSource: requestSource,
      titleRight: titleRight,
      srPrefix: srPrefix,
      marginTop: marginTop,
      frame: frame,
      children: children,
    } = t0,
    f = t1 === void 0 ? "permission" : t1,
    g = t2 === void 0 ? 1 : t2,
    k = srPrefix === void 0 ? "Permission Required:" : srPrefix,
    C = marginTop === void 0 ? 1 : marginTop,
    N = useAskPositionLabel(),
    L = Se(TerminalSizeContext),
    m;
  if ($[0] !== L) ((m = L ?? { rows: 0, columns: 0 }), ($[0] = L), ($[1] = m));
  else m = $[1];
  let { columns: columns } = useScrollViewportSize(m),
    T = Tl();
  if (frame !== void 0) {
    let D;
    if (
      $[2] !== N ||
      $[3] !== children ||
      $[4] !== f ||
      $[5] !== columns ||
      $[6] !== frame ||
      $[7] !== T ||
      $[8] !== requestSource ||
      $[9] !== k ||
      $[10] !== subtitle ||
      $[11] !== title ||
      $[12] !== titleRight
    )
      ((D = e(PermissionDialog, {
        title: title,
        subtitle: subtitle,
        color: f,
        requestSource: requestSource,
        titleRight: titleRight,
        askPosition: N,
        columns: columns,
        insideModal: T,
        srPrefix: k,
        frame: frame,
        children: children,
      })),
        ($[2] = N),
        ($[3] = children),
        ($[4] = f),
        ($[5] = columns),
        ($[6] = frame),
        ($[7] = T),
        ($[8] = requestSource),
        ($[9] = k),
        ($[10] = subtitle),
        ($[11] = title),
        ($[12] = titleRight),
        ($[13] = D));
    else D = $[13];
    return D;
  }
  const D = k ?? void 0;
  let H;
  if ($[14] !== N || $[15] !== columns || $[16] !== titleRight)
    ((H = titleRight === void 0 && N !== null ? { text: N, rowColumns: columns - 2 } : void 0),
      ($[14] = N),
      ($[15] = columns),
      ($[16] = titleRight),
      ($[17] = H));
  else H = $[17];
  let I;
  if (
    $[18] !== requestSource ||
    $[19] !== subtitle ||
    $[20] !== D ||
    $[21] !== H ||
    $[22] !== title ||
    $[23] !== titleColor
  )
    ((I = e(PermissionRequestTitle, {
      title: title,
      subtitle: subtitle,
      color: titleColor,
      requestSource: requestSource,
      srPrefix: D,
      aside: H,
    })),
      ($[18] = requestSource),
      ($[19] = subtitle),
      ($[20] = D),
      ($[21] = H),
      ($[22] = title),
      ($[23] = titleColor),
      ($[24] = I));
  else I = $[24];
  let v;
  if ($[25] !== I || $[26] !== titleRight)
    ((v = e(Box, {
      paddingX: 1,
      flexDirection: "column",
      children: r(Box, { justifyContent: "space-between", children: [I, titleRight] }),
    })),
      ($[25] = I),
      ($[26] = titleRight),
      ($[27] = v));
  else v = $[27];
  let E;
  if ($[28] !== children || $[29] !== g)
    ((E = e(Box, { flexDirection: "column", paddingX: g, children: children })),
      ($[28] = children),
      ($[29] = g),
      ($[30] = E));
  else E = $[30];
  let X;
  if ($[31] !== f || $[32] !== C || $[33] !== E || $[34] !== v)
    ((X = r(Box, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: f,
      borderLeft: !1,
      borderRight: !1,
      borderBottom: !1,
      marginTop: C,
      children: [v, E],
    })),
      ($[31] = f),
      ($[32] = C),
      ($[33] = E),
      ($[34] = v),
      ($[35] = X));
  else X = $[35];
  return X;
}
/**
 * 权限对话框外框：标题（含后缀与请求来源）、子标题、提问位置、Esc/permissions 等底部提示，并按内边距收窄子内容的终端尺寸上下文。
 */
//@ chunk-3v13eg2e.js:4849-6814 sole-consumer
function PermissionDialog(i) {
  let m = w(33),
    {
      title: title,
      subtitle: subtitle,
      color: color,
      requestSource: requestSource,
      titleRight: titleRight,
      askPosition: askPosition,
      columns: columns,
      insideModal: insideModal,
      srPrefix: srPrefix,
      frame: frame,
      children: children,
    } = i,
    f =
      frame.titleSuffix === void 0 ? "" : sanitizeDisplayText(frame.titleSuffix.replace(/\s+/g, " ").trim()),
    g = describeRequestSource(requestSource),
    k = Se(TerminalSizeContext),
    max = Math.max(1, columns - 2 * (insideModal ? zR : PANE_PADDING)),
    N =
      bunStringWidth(title) +
      (f === "" ? 0 : 3 + bunStringWidth(f)) +
      (g === void 0 ? 0 : 3 + bunStringWidth(g)),
    L =
      titleRight ??
      (askPosition !== null && N + 2 + bunStringWidth(askPosition) <= max ? askPosition : void 0);
  const x = srPrefix === null ? void 0 : `${srPrefix} ${title}`;
  let b;
  if (m[0] !== x || m[1] !== title)
    ((b = e(Text, { "aria-label": x, children: title })), (m[0] = x), (m[1] = title), (m[2] = b));
  else b = m[2];
  let T;
  if (m[3] !== g || m[4] !== f)
    ((T =
      f === "" && g === void 0
        ? void 0
        : r(Fragment, {
            children: [
              f !== "" && r(Text, { dimColor: !0, children: [" \xB7 ", f] }),
              g !== void 0 && r(Text, { dimColor: !0, children: [" \xB7 ", g] }),
            ],
          })),
      (m[3] = g),
      (m[4] = f),
      (m[5] = T));
  else T = m[5];
  let D;
  if (m[6] !== subtitle)
    ((D =
      typeof subtitle === "string"
        ? e(Text, { dimColor: !0, wrap: "truncate-start", children: subtitle })
        : (subtitle ?? void 0)),
      (m[6] = subtitle),
      (m[7] = D));
  else D = m[7];
  const onCancel = frame.onCancel;
  let I;
  if (m[8] === MEMO_CACHE_SENTINEL)
    ((I = e(KeyboardShortcutHint, { chord: "escape", action: "cancel", terse: !0, format: ce }, "cancel")),
      (m[8] = I));
  else I = m[8];
  let v;
  if (m[9] !== frame.showPermissionsHint)
    ((v = frame.showPermissionsHint !== !1 && e(Text, { children: "/permissions" }, "permissions")),
      (m[9] = frame.showPermissionsHint),
      (m[10] = v));
  else v = m[10];
  let E;
  if (m[11] !== frame.hints) ((E = Fy.toArray(frame.hints)), (m[11] = frame.hints), (m[12] = E));
  else E = m[12];
  let X;
  if (m[13] !== v || m[14] !== E)
    ((X = r(Byline, { children: [I, v, E] })), (m[13] = v), (m[14] = E), (m[15] = X));
  else X = m[15];
  let K;
  if (m[16] !== max || m[17] !== k)
    ((K = k === null ? null : { rows: k.rows, columns: max }), (m[16] = max), (m[17] = k), (m[18] = K));
  else K = m[18];
  let Q;
  if (m[19] !== children)
    ((Q = e(Box, { flexDirection: "column", children: children })), (m[19] = children), (m[20] = Q));
  else Q = m[20];
  let U;
  if (m[21] !== K || m[22] !== Q)
    ((U = e(TerminalSizeContext.Provider, { value: K, children: Q })), (m[21] = K), (m[22] = Q), (m[23] = U));
  else U = m[23];
  let Ce;
  if (
    m[24] !== color ||
    m[25] !== frame.onCancel ||
    m[26] !== U ||
    m[27] !== b ||
    m[28] !== T ||
    m[29] !== D ||
    m[30] !== X ||
    m[31] !== L
  )
    ((Ce = e(Dialog, {
      title: b,
      titleSuffix: T,
      subtitle: D,
      isSubtitleDimmed: !1,
      titleEnd: L,
      color: color,
      onCancel: onCancel,
      isCancelActive: !1,
      truncateInputGuide: !0,
      inputGuide: X,
      children: U,
    })),
      (m[24] = color),
      (m[25] = frame.onCancel),
      (m[26] = U),
      (m[27] = b),
      (m[28] = T),
      (m[29] = D),
      (m[30] = X),
      (m[31] = L),
      (m[32] = Ce));
  else Ce = m[32];
  return Ce;
}

export { PermissionDialog_2 };
