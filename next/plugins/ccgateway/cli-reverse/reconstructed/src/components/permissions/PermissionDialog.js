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
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  useAskPositionLabel,
  PermissionRequestTitle,
  describeRequestSource,
} from "./PermissionRequestTitle.js";
import { useContext, childrenExport } from "../../../vendor/react/cjs/react.production.js";
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
  let $ = useMemoCache(36);
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
  let borderColor = color === undefined ? "permission" : color;
  let paddingX = innerPaddingX === undefined ? 1 : innerPaddingX;
  let screenReaderPrefix = srPrefix === undefined ? "Permission Required:" : srPrefix;
  let marginTop_2 = marginTop === undefined ? 1 : marginTop;
  let askPositionLabel = useAskPositionLabel();
  let terminalSize = useContext(TerminalSizeContext);
  let fallbackSize;
  if ($[0] !== terminalSize) {
    fallbackSize = terminalSize ?? {
      rows: 0,
      columns: 0,
    };
    $[0] = terminalSize;
    $[1] = fallbackSize;
  } else fallbackSize = $[1];
  let { columns } = useScrollViewportSize(fallbackSize);
  let insideModal = useHasScrollViewport();
  if (frame !== undefined) {
    let permissionDialogElement;
    if (
      $[2] !== askPositionLabel ||
      $[3] !== children ||
      $[4] !== borderColor ||
      $[5] !== columns ||
      $[6] !== frame ||
      $[7] !== insideModal ||
      $[8] !== requestSource ||
      $[9] !== screenReaderPrefix ||
      $[10] !== subtitle ||
      $[11] !== title ||
      $[12] !== titleRight
    ) {
      permissionDialogElement = jsxProd_default(PermissionDialog, {
        title,
        subtitle,
        color: borderColor,
        requestSource,
        titleRight,
        askPosition: askPositionLabel,
        columns,
        insideModal,
        srPrefix: screenReaderPrefix,
        frame,
        children,
      });
      $[2] = askPositionLabel;
      $[3] = children;
      $[4] = borderColor;
      $[5] = columns;
      $[6] = frame;
      $[7] = insideModal;
      $[8] = requestSource;
      $[9] = screenReaderPrefix;
      $[10] = subtitle;
      $[11] = title;
      $[12] = titleRight;
      $[13] = permissionDialogElement;
    } else permissionDialogElement = $[13];
    return permissionDialogElement;
  }
  const srPrefix_2 = screenReaderPrefix ?? undefined;
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
  let permissionRequestTitleElement;
  if (
    $[18] !== requestSource ||
    $[19] !== subtitle ||
    $[20] !== srPrefix_2 ||
    $[21] !== aside ||
    $[22] !== title ||
    $[23] !== titleColor
  ) {
    permissionRequestTitleElement = jsxProd_default(PermissionRequestTitle, {
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
    $[24] = permissionRequestTitleElement;
  } else permissionRequestTitleElement = $[24];
  let titleBox;
  if ($[25] !== permissionRequestTitleElement || $[26] !== titleRight) {
    titleBox = jsxProd_default(Box, {
      paddingX: 1,
      flexDirection: "column",
      children: jsxProd_default_2(Box, {
        justifyContent: "space-between",
        children: [permissionRequestTitleElement, titleRight],
      }),
    });
    $[25] = permissionRequestTitleElement;
    $[26] = titleRight;
    $[27] = titleBox;
  } else titleBox = $[27];
  let bodyBox;
  if ($[28] !== children || $[29] !== paddingX) {
    bodyBox = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX,
      children,
    });
    $[28] = children;
    $[29] = paddingX;
    $[30] = bodyBox;
  } else bodyBox = $[30];
  let dialogBox;
  if ($[31] !== borderColor || $[32] !== marginTop_2 || $[33] !== bodyBox || $[34] !== titleBox) {
    dialogBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      borderStyle: "round",
      borderColor,
      borderLeft: false,
      borderRight: false,
      borderBottom: false,
      marginTop: marginTop_2,
      children: [titleBox, bodyBox],
    });
    $[31] = borderColor;
    $[32] = marginTop_2;
    $[33] = bodyBox;
    $[34] = titleBox;
    $[35] = dialogBox;
  } else dialogBox = $[35];
  return dialogBox;
}
//@ chunk-3v13eg2e.js:4849-6814 sole-consumer
/**
 * 权限对话框外框：标题（含后缀与请求来源）、子标题、提问位置、Esc/permissions 等底部提示，并按内边距收窄子内容的终端尺寸上下文。
 */
function PermissionDialog(props) {
  let $ = useMemoCache(33);
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
  let titleSuffixText =
    frame.titleSuffix === undefined ? "" : sanitizeDisplayText(frame.titleSuffix.replace(/\s+/g, " ").trim());
  let sourceLabel = describeRequestSource(requestSource);
  let terminalSize = useContext(TerminalSizeContext);
  let max = Math.max(1, columns - 2 * (insideModal ? PANE_PADDING_X : PANE_PADDING));
  let titleWidth =
    bunStringWidth(title) +
    (titleSuffixText === "" ? 0 : 3 + bunStringWidth(titleSuffixText)) +
    (sourceLabel === undefined ? 0 : 3 + bunStringWidth(sourceLabel));
  let titleEnd =
    titleRight ??
    (askPosition !== null && titleWidth + 2 + bunStringWidth(askPosition) <= max ? askPosition : undefined);
  const screenReaderLabel = srPrefix === null ? undefined : `${srPrefix} ${title}`;
  let title_2;
  if ($[0] !== screenReaderLabel || $[1] !== title) {
    title_2 = jsxProd_default(Text, {
      "aria-label": screenReaderLabel,
      children: title,
    });
    $[0] = screenReaderLabel;
    $[1] = title;
    $[2] = title_2;
  } else title_2 = $[2];
  let titleSuffix;
  if ($[3] !== sourceLabel || $[4] !== titleSuffixText) {
    titleSuffix =
      titleSuffixText === "" && sourceLabel === undefined
        ? undefined
        : jsxProd_default_2(Fragment, {
            children: [
              titleSuffixText !== "" &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \xB7 ", titleSuffixText],
                }),
              sourceLabel !== undefined &&
                jsxProd_default_2(Text, {
                  dimColor: true,
                  children: [" \xB7 ", sourceLabel],
                }),
            ],
          });
    $[3] = sourceLabel;
    $[4] = titleSuffixText;
    $[5] = titleSuffix;
  } else titleSuffix = $[5];
  let subtitle_2;
  if ($[6] !== subtitle) {
    subtitle_2 =
      typeof subtitle === "string"
        ? jsxProd_default(Text, {
            dimColor: true,
            wrap: "truncate-start",
            children: subtitle,
          })
        : (subtitle ?? undefined);
    $[6] = subtitle;
    $[7] = subtitle_2;
  } else subtitle_2 = $[7];
  const onCancel = frame.onCancel;
  let keyboardShortcutHintElement;
  if ($[8] === MEMO_CACHE_SENTINEL) {
    keyboardShortcutHintElement = jsxProd_default(
      KeyboardShortcutHint,
      {
        chord: "escape",
        action: "cancel",
        terse: true,
        format: SHORTCUT_FORMAT,
      },
      "cancel",
    );
    $[8] = keyboardShortcutHintElement;
  } else keyboardShortcutHintElement = $[8];
  let permissionsHint;
  if ($[9] !== frame.showPermissionsHint) {
    permissionsHint =
      frame.showPermissionsHint !== false &&
      jsxProd_default(
        Text,
        {
          children: "/permissions",
        },
        "permissions",
      );
    $[9] = frame.showPermissionsHint;
    $[10] = permissionsHint;
  } else permissionsHint = $[10];
  let hintList;
  if ($[11] !== frame.hints) {
    hintList = childrenExport.toArray(frame.hints);
    $[11] = frame.hints;
    $[12] = hintList;
  } else hintList = $[12];
  let inputGuide;
  if ($[13] !== permissionsHint || $[14] !== hintList) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [keyboardShortcutHintElement, permissionsHint, hintList],
    });
    $[13] = permissionsHint;
    $[14] = hintList;
    $[15] = inputGuide;
  } else inputGuide = $[15];
  let value;
  if ($[16] !== max || $[17] !== terminalSize) {
    value =
      terminalSize === null
        ? null
        : {
            rows: terminalSize.rows,
            columns: max,
          };
    $[16] = max;
    $[17] = terminalSize;
    $[18] = value;
  } else value = $[18];
  let children_2;
  if ($[19] !== children) {
    children_2 = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    $[19] = children;
    $[20] = children_2;
  } else children_2 = $[20];
  let children_3;
  if ($[21] !== value || $[22] !== children_2) {
    children_3 = jsxProd_default(TerminalSizeContext.Provider, {
      value,
      children: children_2,
    });
    $[21] = value;
    $[22] = children_2;
    $[23] = children_3;
  } else children_3 = $[23];
  let dialogElement;
  if (
    $[24] !== color ||
    $[25] !== frame.onCancel ||
    $[26] !== children_3 ||
    $[27] !== title_2 ||
    $[28] !== titleSuffix ||
    $[29] !== subtitle_2 ||
    $[30] !== inputGuide ||
    $[31] !== titleEnd
  ) {
    dialogElement = jsxProd_default(Dialog, {
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
    $[24] = color;
    $[25] = frame.onCancel;
    $[26] = children_3;
    $[27] = title_2;
    $[28] = titleSuffix;
    $[29] = subtitle_2;
    $[30] = inputGuide;
    $[31] = titleEnd;
    $[32] = dialogElement;
  } else dialogElement = $[32];
  return dialogElement;
}
export { PermissionDialog_2 };
