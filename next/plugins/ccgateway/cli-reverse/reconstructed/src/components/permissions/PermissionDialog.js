/**
 * components/permissions/PermissionDialog.tsx
 *
 * 权限对话框外框（"Permission Required:" 标题、圆角 permission 色边框），被 26 处使用。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/PermissionDialog.tsx
 * pieces: chunk-dbmqtrf0.js (4)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import {
  useAskPositionLabel,
  PermissionRequestTitle,
  describeRequestSource,
} from "./PermissionRequestTitle.js";
import { useContext, useState, childrenExport } from "../../../vendor/react/cjs/react.production.js";
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
import { DialogFrame, Dialog } from "../design-system/Dialog.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";

//@ chunk-dbmqtrf0.js:3167-3190 sole-consumer
function useForcePlain() {
  return false;
}
//@ chunk-dbmqtrf0.js:3190-3215 affinity
var SHORTCUT_FORMAT = {
  keyCase: "lower",
};
//@ chunk-dbmqtrf0.js:3215-4960 fingerprint (2.1.88 match: PermissionDialog, 0.756)
/**
 * 权限对话框外框：圆角边框（permission 色）、标题 "Permission Required: …"、可选副标题与队友徽章。
 */
function PermissionDialog_2(props) {
  let $ = useMemoCache(38);
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
  let [forcePlain] = useState(useForcePlain);
  if (frame !== undefined || forcePlain) {
    let permissionDialogElement;
    if (
      $[2] !== askPositionLabel ||
      $[3] !== children ||
      $[4] !== borderColor ||
      $[5] !== columns ||
      $[6] !== frame ||
      $[7] !== paddingX ||
      $[8] !== insideModal ||
      $[9] !== marginTop_2 ||
      $[10] !== requestSource ||
      $[11] !== screenReaderPrefix ||
      $[12] !== subtitle ||
      $[13] !== title ||
      $[14] !== titleRight
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
        innerPaddingX: paddingX,
        marginTop: marginTop_2,
        frame,
        children,
      });
      $[2] = askPositionLabel;
      $[3] = children;
      $[4] = borderColor;
      $[5] = columns;
      $[6] = frame;
      $[7] = paddingX;
      $[8] = insideModal;
      $[9] = marginTop_2;
      $[10] = requestSource;
      $[11] = screenReaderPrefix;
      $[12] = subtitle;
      $[13] = title;
      $[14] = titleRight;
      $[15] = permissionDialogElement;
    } else permissionDialogElement = $[15];
    return permissionDialogElement;
  }
  const srPrefix_2 = screenReaderPrefix ?? undefined;
  let aside;
  if ($[16] !== askPositionLabel || $[17] !== columns || $[18] !== titleRight) {
    aside =
      titleRight === undefined && askPositionLabel !== null
        ? {
            text: askPositionLabel,
            rowColumns: columns - 2,
          }
        : undefined;
    $[16] = askPositionLabel;
    $[17] = columns;
    $[18] = titleRight;
    $[19] = aside;
  } else aside = $[19];
  let permissionRequestTitleElement;
  if (
    $[20] !== requestSource ||
    $[21] !== subtitle ||
    $[22] !== srPrefix_2 ||
    $[23] !== aside ||
    $[24] !== title ||
    $[25] !== titleColor
  ) {
    permissionRequestTitleElement = jsxProd_default(PermissionRequestTitle, {
      title,
      subtitle,
      color: titleColor,
      requestSource,
      srPrefix: srPrefix_2,
      aside,
    });
    $[20] = requestSource;
    $[21] = subtitle;
    $[22] = srPrefix_2;
    $[23] = aside;
    $[24] = title;
    $[25] = titleColor;
    $[26] = permissionRequestTitleElement;
  } else permissionRequestTitleElement = $[26];
  let titleBox;
  if ($[27] !== permissionRequestTitleElement || $[28] !== titleRight) {
    titleBox = jsxProd_default(Box, {
      paddingX: 1,
      flexDirection: "column",
      children: jsxProd_default_2(Box, {
        justifyContent: "space-between",
        children: [permissionRequestTitleElement, titleRight],
      }),
    });
    $[27] = permissionRequestTitleElement;
    $[28] = titleRight;
    $[29] = titleBox;
  } else titleBox = $[29];
  let bodyBox;
  if ($[30] !== children || $[31] !== paddingX) {
    bodyBox = jsxProd_default(Box, {
      flexDirection: "column",
      paddingX,
      children,
    });
    $[30] = children;
    $[31] = paddingX;
    $[32] = bodyBox;
  } else bodyBox = $[32];
  let dialogBox;
  if ($[33] !== borderColor || $[34] !== marginTop_2 || $[35] !== bodyBox || $[36] !== titleBox) {
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
    $[33] = borderColor;
    $[34] = marginTop_2;
    $[35] = bodyBox;
    $[36] = titleBox;
    $[37] = dialogBox;
  } else dialogBox = $[37];
  return dialogBox;
}
//@ chunk-dbmqtrf0.js:4960-7511 sole-consumer
/**
 * 权限对话框外框：标题（含后缀与请求来源）、子标题、提问位置、Esc/permissions 等底部提示，并按内边距收窄子内容的终端尺寸上下文。
 */
function PermissionDialog(props) {
  let $ = useMemoCache(45);
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
    innerPaddingX,
    marginTop,
    frame,
    children,
  } = props;
  let titleSuffixText =
    frame?.titleSuffix === undefined
      ? ""
      : sanitizeDisplayText(frame.titleSuffix.replace(/\s+/g, " ").trim());
  let sourceLabel = describeRequestSource(requestSource);
  let terminalSize = useContext(TerminalSizeContext);
  let max = Math.max(
    1,
    frame === undefined ? columns - 2 : columns - 2 * (insideModal ? PANE_PADDING_X : PANE_PADDING),
  );
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
  let frameProps;
  if (
    $[8] !== color ||
    $[9] !== title_2 ||
    $[10] !== titleSuffix ||
    $[11] !== subtitle_2 ||
    $[12] !== titleEnd
  ) {
    frameProps = {
      title: title_2,
      titleSuffix,
      subtitle: subtitle_2,
      isSubtitleDimmed: false,
      titleEnd,
      color,
    };
    $[8] = color;
    $[9] = title_2;
    $[10] = titleSuffix;
    $[11] = subtitle_2;
    $[12] = titleEnd;
    $[13] = frameProps;
  } else frameProps = $[13];
  let framePropsStable = frameProps;
  if (frame === undefined) {
    const marginTop_2 = marginTop === 0 && !insideModal ? -1 : 0;
    let children_2;
    if ($[14] !== children || $[15] !== innerPaddingX) {
      children_2 = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: -1,
        marginX: -1,
        paddingX: innerPaddingX,
        children,
      });
      $[14] = children;
      $[15] = innerPaddingX;
      $[16] = children_2;
    } else children_2 = $[16];
    let children_3;
    if ($[17] !== children_2 || $[18] !== framePropsStable) {
      children_3 = jsxProd_default(DialogFrame, {
        ...framePropsStable,
        insetX: 1,
        children: children_2,
      });
      $[17] = children_2;
      $[18] = framePropsStable;
      $[19] = children_3;
    } else children_3 = $[19];
    let framedChildren;
    if ($[20] !== marginTop_2 || $[21] !== children_3) {
      framedChildren = jsxProd_default(Box, {
        flexDirection: "column",
        marginTop: marginTop_2,
        children: children_3,
      });
      $[20] = marginTop_2;
      $[21] = children_3;
      $[22] = framedChildren;
    } else framedChildren = $[22];
    return framedChildren;
  }
  const onCancel = frame.onCancel;
  const hideInputGuide = frame.showHintLine === false;
  let keyboardShortcutHintElement;
  if ($[23] === MEMO_CACHE_SENTINEL) {
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
    $[23] = keyboardShortcutHintElement;
  } else keyboardShortcutHintElement = $[23];
  let permissionsHint;
  if ($[24] !== frame.showPermissionsHint) {
    permissionsHint =
      frame.showPermissionsHint !== false &&
      jsxProd_default(
        Text,
        {
          children: "/permissions",
        },
        "permissions",
      );
    $[24] = frame.showPermissionsHint;
    $[25] = permissionsHint;
  } else permissionsHint = $[25];
  let hintList;
  if ($[26] !== frame.hints) {
    hintList = childrenExport.toArray(frame.hints);
    $[26] = frame.hints;
    $[27] = hintList;
  } else hintList = $[27];
  let inputGuide;
  if ($[28] !== hintList || $[29] !== permissionsHint) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [keyboardShortcutHintElement, permissionsHint, hintList],
    });
    $[28] = hintList;
    $[29] = permissionsHint;
    $[30] = inputGuide;
  } else inputGuide = $[30];
  let value;
  if ($[31] !== max || $[32] !== terminalSize) {
    value =
      terminalSize === null
        ? null
        : {
            rows: terminalSize.rows,
            columns: max,
          };
    $[31] = max;
    $[32] = terminalSize;
    $[33] = value;
  } else value = $[33];
  let children_2;
  if ($[34] !== children) {
    children_2 = jsxProd_default(Box, {
      flexDirection: "column",
      children,
    });
    $[34] = children;
    $[35] = children_2;
  } else children_2 = $[35];
  let children_3;
  if ($[36] !== value || $[37] !== children_2) {
    children_3 = jsxProd_default(TerminalSizeContext.Provider, {
      value,
      children: children_2,
    });
    $[36] = value;
    $[37] = children_2;
    $[38] = children_3;
  } else children_3 = $[38];
  let dialogElement;
  if (
    $[39] !== frame.onCancel ||
    $[40] !== inputGuide ||
    $[41] !== children_3 ||
    $[42] !== hideInputGuide ||
    $[43] !== framePropsStable
  ) {
    dialogElement = jsxProd_default(Dialog, {
      ...framePropsStable,
      onCancel,
      isCancelActive: false,
      truncateInputGuide: true,
      hideInputGuide,
      inputGuide,
      children: children_3,
    });
    $[39] = frame.onCancel;
    $[40] = inputGuide;
    $[41] = children_3;
    $[42] = hideInputGuide;
    $[43] = framePropsStable;
    $[44] = dialogElement;
  } else dialogElement = $[44];
  return dialogElement;
}
export { PermissionDialog_2 };
