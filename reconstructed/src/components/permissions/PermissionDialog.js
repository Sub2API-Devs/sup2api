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
import { useScrollViewportSize, useHasScrollViewport } from "../ScrollViewportContext.js";
import {
  jsxProd_default,
  jsxProd_default_2,
  Fragment,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../../ink/components/Text.js";
import { sanitizeDisplayText } from "../../utils/permissions/approvalPayloadSerialization.js";
import { PANE_PADDING_X, PANE_PADDING } from "../design-system/Pane.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-3v13eg2e.js:3158-3183 affinity
var SHORTCUT_FORMAT = {
  keyCase: "lower",
};
//@ chunk-3v13eg2e.js:3183-4849 fingerprint = PermissionDialog (0.755)
/**
 * 权限对话框外框：圆角边框（permission 色）、标题 "Permission Required: …"、可选副标题与队友徽章。
 */
function PermissionDialog_2(props) {
  let $ = w(36);
  let {
    title,
    subtitle,
    color,
    titleColor,
    innerPaddingX,
    requestSource,
    titleRight,
    srPrefix,
    marginTop,
    frame,
    children,
  } = props;
  let f = color === undefined ? "permission" : color;
  let paddingX = innerPaddingX === undefined ? 1 : innerPaddingX;
  let k = srPrefix === undefined ? "Permission Required:" : srPrefix;
  let marginTop_2 = marginTop === undefined ? 1 : marginTop;
  let askPositionLabel = useAskPositionLabel();
  let L = Se(TerminalSizeContext);
  let m;
  if ($[0] !== L) {
    m = L ?? {
      rows: 0,
      columns: 0,
    };
    $[0] = L;
    $[1] = m;
  } else m = $[1];
  let { columns } = useScrollViewportSize(m);
  let insideModal = useHasScrollViewport();
  if (frame !== undefined) {
    let D;
    if (
      $[2] !== askPositionLabel ||
      $[3] !== children ||
      $[4] !== f ||
      $[5] !== columns ||
      $[6] !== frame ||
      $[7] !== insideModal ||
      $[8] !== requestSource ||
      $[9] !== k ||
      $[10] !== subtitle ||
      $[11] !== title ||
      $[12] !== titleRight
    ) {
      D = jsxProd_default(PermissionDialog, {
        title,
        subtitle,
        color: f,
        requestSource,
        titleRight,
        askPosition: askPositionLabel,
        columns,
        insideModal,
        srPrefix: k,
        frame,
        children,
      });
      $[2] = askPositionLabel;
      $[3] = children;
      $[4] = f;
      $[5] = columns;
      $[6] = frame;
      $[7] = insideModal;
      $[8] = requestSource;
      $[9] = k;
      $[10] = subtitle;
      $[11] = title;
      $[12] = titleRight;
      $[13] = D;
    } else D = $[13];
    return D;
  }
  const srPrefix_2 = k ?? undefined;
  let aside;
  if ($[14] !== askPositionLabel || $[15] !== columns || $[16] !== titleRight) {
    aside =
      titleRight === undefined && askPositionLabel !== null
        ? {
            text: askPositionLabel,
            rowColumns: columns - 2,
          }
        : undefined;
    $[14] = askPositionLabel;
    $[15] = columns;
    $[16] = titleRight;
    $[17] = aside;
  } else aside = $[17];
  let I;
  if (
    $[18] !== requestSource ||
    $[19] !== subtitle ||
    $[20] !== srPrefix_2 ||
    $[21] !== aside ||
    $[22] !== title ||
    $[23] !== titleColor
  ) {
    I = jsxProd_default(PermissionRequestTitle, {
      title,
      subtitle,
      color: titleColor,
      requestSource,
      srPrefix: srPrefix_2,
      aside,
    });
    $[18] = requestSource;
    $[19] = subtitle;
    $[20] = srPrefix_2;
    $[21] = aside;
    $[22] = title;
    $[23] = titleColor;
    $[24] = I;
  } else I = $[24];
  let v;
  if ($[25] !== I || $[26] !== titleRight) {
    v = jsxProd_default(Box, {
      paddingX: 1,
      flexDirection: "column",
      children: jsxProd_default_2(Box, {
        justifyContent: "space-between",
        children: [I, titleRight],
      }),
    });
    $[25] = I;
    $[26] = titleRight;
    $[27] = v;
  } else v = $[27];
  let E;
  if ($[28] !== children || $[29] !== paddingX) {
    E = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX,
      children,
    });
    $[28] = children;
    $[29] = paddingX;
    $[30] = E;
  } else E = $[30];
  let X;
  if ($[31] !== f || $[32] !== marginTop_2 || $[33] !== E || $[34] !== v) {
    X = jsxProd_default_2(Box, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor: f,
      borderLeft: false,
      borderRight: false,
      borderBottom: false,
      marginTop: marginTop_2,
      children: [v, E],
    });
    $[31] = f;
    $[32] = marginTop_2;
    $[33] = E;
    $[34] = v;
    $[35] = X;
  } else X = $[35];
  return X;
}
//@ chunk-3v13eg2e.js:4849-6814 sole-consumer
/**
 * 权限对话框外框：标题（含后缀与请求来源）、子标题、提问位置、Esc/permissions 等底部提示，并按内边距收窄子内容的终端尺寸上下文。
 */
function PermissionDialog(props) {
  let m = w(33);
  let {
    title,
    subtitle,
    color,
    requestSource,
    titleRight,
    askPosition,
    columns,
    insideModal,
    srPrefix,
    frame,
    children,
  } = props;
  let f =
    frame.titleSuffix === undefined ? "" : sanitizeDisplayText(frame.titleSuffix.replace(/\s+/g, " ").trim());
  let g = describeRequestSource(requestSource);
  let k = Se(TerminalSizeContext);
  let max = Math.max(1, columns - 2 * (insideModal ? PANE_PADDING_X : PANE_PADDING));
  let N =
    bunStringWidth(title) +
    (f === "" ? 0 : 3 + bunStringWidth(f)) +
    (g === undefined ? 0 : 3 + bunStringWidth(g));
  let titleEnd =
    titleRight ??
    (askPosition !== null && N + 2 + bunStringWidth(askPosition) <= max ? askPosition : undefined);
  const x = srPrefix === null ? undefined : `${srPrefix} ${title}`;
  let title_2;
  if (m[0] !== x || m[1] !== title) {
    title_2 = jsxProd_default(Text, {
      "aria-label": x,
      children: title,
    });
    m[0] = x;
    m[1] = title;
    m[2] = title_2;
  } else title_2 = m[2];
  let titleSuffix;
  if (m[3] !== g || m[4] !== f) {
    titleSuffix =
      f === "" && g === undefined
        ? undefined
        : jsxProd_default_2(Fragment, {
            children: [
              f !== "" &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \xB7 ", f],
                }),
              g !== undefined &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \xB7 ", g],
                }),
            ],
          });
    m[3] = g;
    m[4] = f;
    m[5] = titleSuffix;
  } else titleSuffix = m[5];
  let subtitle_2;
  if (m[6] !== subtitle) {
    subtitle_2 =
      typeof subtitle === "string"
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate-start",
            children: subtitle,
          })
        : (subtitle ?? undefined);
    m[6] = subtitle;
    m[7] = subtitle_2;
  } else subtitle_2 = m[7];
  const onCancel = frame.onCancel;
  let I;
  if (m[8] === MEMO_CACHE_SENTINEL) {
    I = jsxProd_default(
      KeyboardShortcutHint,
      {
        chord: "escape",
        action: "cancel",
        terse: true,
        format: SHORTCUT_FORMAT,
      },
      "cancel",
    );
    m[8] = I;
  } else I = m[8];
  let v;
  if (m[9] !== frame.showPermissionsHint) {
    v =
      frame.showPermissionsHint !== false &&
      jsxProd_default(
        Text,
        {
          children: "/permissions",
        },
        "permissions",
      );
    m[9] = frame.showPermissionsHint;
    m[10] = v;
  } else v = m[10];
  let E;
  if (m[11] !== frame.hints) {
    E = Fy.toArray(frame.hints);
    m[11] = frame.hints;
    m[12] = E;
  } else E = m[12];
  let inputGuide;
  if (m[13] !== v || m[14] !== E) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [I, v, E],
    });
    m[13] = v;
    m[14] = E;
    m[15] = inputGuide;
  } else inputGuide = m[15];
  let value;
  if (m[16] !== max || m[17] !== k) {
    value =
      k === null
        ? null
        : {
            rows: k.rows,
            columns: max,
          };
    m[16] = max;
    m[17] = k;
    m[18] = value;
  } else value = m[18];
  let children_2;
  if (m[19] !== children) {
    children_2 = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    m[19] = children;
    m[20] = children_2;
  } else children_2 = m[20];
  let children_3;
  if (m[21] !== value || m[22] !== children_2) {
    children_3 = jsxProd_default(TerminalSizeContext.Provider, {
      value,
      children: children_2,
    });
    m[21] = value;
    m[22] = children_2;
    m[23] = children_3;
  } else children_3 = m[23];
  let Ce;
  if (
    m[24] !== color ||
    m[25] !== frame.onCancel ||
    m[26] !== children_3 ||
    m[27] !== title_2 ||
    m[28] !== titleSuffix ||
    m[29] !== subtitle_2 ||
    m[30] !== inputGuide ||
    m[31] !== titleEnd
  ) {
    Ce = jsxProd_default(Dialog, {
      title: title_2,
      titleSuffix,
      subtitle: subtitle_2,
      isSubtitleDimmed: false,
      titleEnd,
      color,
      onCancel,
      isCancelActive: false,
      truncateInputGuide: true,
      inputGuide,
      children: children_3,
    });
    m[24] = color;
    m[25] = frame.onCancel;
    m[26] = children_3;
    m[27] = title_2;
    m[28] = titleSuffix;
    m[29] = subtitle_2;
    m[30] = inputGuide;
    m[31] = titleEnd;
    m[32] = Ce;
  } else Ce = m[32];
  return Ce;
}
export { PermissionDialog_2 };
