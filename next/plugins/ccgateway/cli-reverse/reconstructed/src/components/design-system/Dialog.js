/**
 * components/design-system/Dialog.tsx
 *
 * 设计系统对话框：标题 + 内容 + 底部按键提示，Esc/confirm:no 取消、双击退出提示（被 157 处使用）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/design-system/Dialog.tsx
 * pieces: chunk-zjxrz3f0.js (8)
 * attribution: sole-consumer 2, affinity 1, fingerprint 1, layout 3, placement 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { stableEmptyObject } from "../../utils/stableEmptyObject.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useIsFullPageNotice } from "./NoticeUnderScene.js";
import { useState, useRef, useContext, useLayoutEffect } from "../../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-zjxrz3f0.js:8422-8445 sole-consumer
function returnFalse() {
  return false;
}
//@ chunk-zjxrz3f0.js:8445-8468 sole-consumer
function returnFalse_2() {
  return false;
}
//@ chunk-zjxrz3f0.js:8468-8498 affinity
var DEFAULT_CONFIRM_CANCEL_HINTS; // deferred: uses renderConfirmCancelHints of its import cycle while loading; runs once the cycle is complete
var READONLY_HINT_FORMAT;
var DEFAULT_CONFIRM_CANCEL_HINTS_2;
deferInit("chunk-zjxrz3f0.js:8468", () => {
  DEFAULT_CONFIRM_CANCEL_HINTS = renderConfirmCancelHints({});
  READONLY_HINT_FORMAT = stableEmptyObject(true);
  DEFAULT_CONFIRM_CANCEL_HINTS_2 = DEFAULT_CONFIRM_CANCEL_HINTS;
});
//@ chunk-zjxrz3f0.js:8498-11144 fingerprint (2.1.88 match: Dialog, 0.483)
function Dialog(props) {
  let $ = useMemoCache(48);
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
  let borderColor = color === undefined ? "permission" : color;
  let isEnabled = isCancelActive === undefined ? true : isCancelActive;
  let quitsOnCtrlC = exitOnCtrlCD === undefined ? false : exitOnCtrlCD;
  let isFullPageNotice = useIsFullPageNotice();
  let [fullPageFlag] = useState(returnFalse);
  let isFullPage = isFullPageNotice || fullPageFlag;
  let pickedColor;
  if ($[0] !== borderColor || $[1] !== isFullPage) {
    pickedColor = pickFirst(borderColor, isFullPage);
    $[0] = borderColor;
    $[1] = isFullPage;
    $[2] = pickedColor;
  } else pickedColor = $[2];
  let dialogColor = pickedColor;
  let color_2 = isFullPageNotice ? undefined : dialogColor;
  let children_2 = isFullPage ? DEFAULT_CONFIRM_CANCEL_HINTS_2 : DEFAULT_CONFIRM_CANCEL_HINTS;
  let boundaryRef = useRef(null);
  let usesExit = quitsOnCtrlC || onExit !== undefined;
  let { entries, exitState } = useExitKeybindingEntries(usesExit ? onExit : onCancel, onInterrupt, isEnabled);
  let cancelBinding;
  if ($[3] !== isEnabled || $[4] !== onCancel) {
    cancelBinding = isEnabled
      ? [
          {
            action: "confirm:no",
            run: onCancel,
            hint: "cancel",
          },
        ]
      : [];
    $[3] = isEnabled;
    $[4] = onCancel;
    $[5] = cancelBinding;
  } else cancelBinding = $[5];
  let bindings;
  if ($[6] !== entries || $[7] !== cancelBinding) {
    bindings = [...cancelBinding, ...entries];
    $[6] = entries;
    $[7] = cancelBinding;
    $[8] = bindings;
  } else bindings = $[8];
  let bindings_2 = bindings;
  let outerViewport = useContext(scrollViewportContext);
  let titleRef = useRef(null);
  let [titleHeight, setTitleHeight] = useState(subtitle ? 2 : 1);
  let measureTitle;
  if ($[9] !== outerViewport || $[10] !== titleHeight) {
    measureTitle = () => {
      if (!outerViewport || !titleRef.current) {
        return;
      }
      let height = measureElement(titleRef.current).height;
      if (height !== titleHeight) setTitleHeight(height);
    };
    $[9] = outerViewport;
    $[10] = titleHeight;
    $[11] = measureTitle;
  } else measureTitle = $[11];
  useLayoutEffect(measureTitle);
  let chromeRows = titleHeight + 1 + (hideInputGuide ? 0 : 2);
  let innerViewport;
  if ($[12] !== outerViewport || $[13] !== chromeRows) {
    innerViewport = outerViewport
      ? {
          ...outerViewport,
          rows: Math.max(0, outerViewport.rows - chromeRows),
        }
      : null;
    $[12] = outerViewport;
    $[13] = chromeRows;
    $[14] = innerViewport;
  } else innerViewport = $[14];
  let value = innerViewport;
  let guideContent;
  if ($[15] !== usesExit || $[16] !== exitState || $[17] !== inputGuide) {
    guideContent =
      typeof inputGuide === "function"
        ? inputGuide(exitState)
        : exitState.pending
          ? jsxProd_default_2(Text, {
              children: ["Press ", exitState.keyName, " again to ", usesExit ? "exit" : "cancel"],
            })
          : inputGuide != null
            ? inputGuide
            : undefined;
    $[15] = usesExit;
    $[16] = exitState;
    $[17] = inputGuide;
    $[18] = guideContent;
  } else guideContent = $[18];
  let children_3 = guideContent;
  let hasGuideContent = typeof inputGuide === "function" || exitState.pending || inputGuide != null;
  let guideRow;
  if (
    $[19] !== children_3 ||
    $[20] !== children_2 ||
    $[21] !== hideInputGuide ||
    $[22] !== isEnabled ||
    $[23] !== isFullPage ||
    $[24] !== hasGuideContent ||
    $[25] !== truncateInputGuide
  ) {
    guideRow =
      !hideInputGuide &&
      jsxProd_default(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: hasGuideContent
          ? jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              wrap: truncateInputGuide ? "truncate" : undefined,
              children: children_3,
            })
          : !isEnabled
            ? jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: children_2,
              })
            : jsxProd_default(DialogKeyHints, {
                boundary: boundaryRef,
                terse: isFullPage,
                format: isFullPage ? READONLY_HINT_FORMAT.format : undefined,
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
    $[22] = isEnabled;
    $[23] = isFullPage;
    $[24] = hasGuideContent;
    $[25] = truncateInputGuide;
    $[26] = guideRow;
  } else guideRow = $[26];
  let guideElement = guideRow;
  const flexGrow = hideBorder || isFullPageNotice ? 0 : 1;
  let titleBox;
  if (
    $[27] !== isSubtitleDimmed_2 ||
    $[28] !== subtitle ||
    $[29] !== title ||
    $[30] !== color_2 ||
    $[31] !== titleEnd ||
    $[32] !== titleSuffix
  ) {
    titleBox = jsxProd_default(Box, {
      ref: titleRef,
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
    $[33] = titleBox;
  } else titleBox = $[33];
  let bodyViewport;
  if ($[34] !== value || $[35] !== children) {
    bodyViewport = jsxProd_default(scrollViewportContext, {
      value,
      children,
    });
    $[34] = value;
    $[35] = children;
    $[36] = bodyViewport;
  } else bodyViewport = $[36];
  let contentBox;
  if ($[37] !== titleBox || $[38] !== bodyViewport) {
    contentBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleBox, bodyViewport],
    });
    $[37] = titleBox;
    $[38] = bodyViewport;
    $[39] = contentBox;
  } else contentBox = $[39];
  let dialogBox;
  if ($[40] !== bindings_2 || $[41] !== guideElement || $[42] !== flexGrow || $[43] !== contentBox) {
    dialogBox = jsxProd_default_2(useDialogKeybindings, {
      ref: boundaryRef,
      scope: "Confirmation",
      claimFocus: true,
      flexGrow,
      flexDirection: "column",
      bindings: bindings_2,
      children: [contentBox, guideElement],
    });
    $[40] = bindings_2;
    $[41] = guideElement;
    $[42] = flexGrow;
    $[43] = contentBox;
    $[44] = dialogBox;
  } else dialogBox = $[44];
  let dialogElement = dialogBox;
  if (hideBorder || isFullPageNotice) {
    return dialogElement;
  }
  let borderedPane;
  if ($[45] !== dialogElement || $[46] !== dialogColor) {
    borderedPane = jsxProd_default(Pane, {
      color: dialogColor,
      children: dialogElement,
    });
    $[45] = dialogElement;
    $[46] = dialogColor;
    $[47] = borderedPane;
  } else borderedPane = $[47];
  return borderedPane;
}
//@ chunk-zjxrz3f0.js:11144-11891 layout
function DialogFrame(props) {
  let $ = useMemoCache(17);
  let { title, titleEnd, titleSuffix, subtitle, isSubtitleDimmed, color, insetX, children } = props;
  let borderColor = color === undefined ? "permission" : color;
  let [fullPageFlag] = useState(returnFalse_2);
  let pickedColor;
  if ($[0] !== borderColor || $[1] !== fullPageFlag) {
    pickedColor = pickFirst(borderColor, fullPageFlag);
    $[0] = borderColor;
    $[1] = fullPageFlag;
    $[2] = pickedColor;
  } else pickedColor = $[2];
  let color_2 = pickedColor;
  let titleBox;
  if (
    $[3] !== color_2 ||
    $[4] !== isSubtitleDimmed ||
    $[5] !== subtitle ||
    $[6] !== title ||
    $[7] !== titleEnd ||
    $[8] !== titleSuffix
  ) {
    titleBox = jsxProd_default(Box, {
      flexDirection: "column",
      flexShrink: 0,
      children: jsxProd_default(DialogTitle, {
        title,
        titleEnd,
        titleSuffix,
        subtitle,
        isSubtitleDimmed,
        color: color_2,
      }),
    });
    $[3] = color_2;
    $[4] = isSubtitleDimmed;
    $[5] = subtitle;
    $[6] = title;
    $[7] = titleEnd;
    $[8] = titleSuffix;
    $[9] = titleBox;
  } else titleBox = $[9];
  let children_2;
  if ($[10] !== children || $[11] !== titleBox) {
    children_2 = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleBox, children],
    });
    $[10] = children;
    $[11] = titleBox;
    $[12] = children_2;
  } else children_2 = $[12];
  let pane;
  if ($[13] !== color_2 || $[14] !== insetX || $[15] !== children_2) {
    pane = jsxProd_default(Pane, {
      color: color_2,
      insetX,
      children: children_2,
    });
    $[13] = color_2;
    $[14] = insetX;
    $[15] = children_2;
    $[16] = pane;
  } else pane = $[16];
  return pane;
}
//@ chunk-zjxrz3f0.js:11891-12565 layout
/**
 * 对话框标题行：标题、标题后缀、右侧内容与可选副标题。
 */
function DialogTitle(props) {
  let $ = useMemoCache(13);
  let { title, titleEnd, titleSuffix, subtitle, isSubtitleDimmed, color } = props;
  let dimSubtitle = isSubtitleDimmed === undefined ? true : isSubtitleDimmed;
  let titleElementCached;
  if ($[0] !== color || $[1] !== title || $[2] !== titleSuffix) {
    titleElementCached =
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
    $[3] = titleElementCached;
  } else titleElementCached = $[3];
  let titleElement = titleElementCached;
  let headerElement;
  if ($[4] !== titleEnd || $[5] !== titleElement) {
    headerElement = titleEnd
      ? jsxProd_default_2(Box, {
          justifyContent: "space-between",
          gap: 2,
          children: [
            titleElement,
            jsxProd_default(Text, {
              dimColor: true,
              wrap: "truncate-start",
              children: titleEnd,
            }),
          ],
        })
      : titleElement;
    $[4] = titleEnd;
    $[5] = titleElement;
    $[6] = headerElement;
  } else headerElement = $[6];
  let subtitleElement;
  if ($[7] !== dimSubtitle || $[8] !== subtitle) {
    subtitleElement =
      subtitle &&
      (dimSubtitle
        ? jsxProd_default(Text, {
            dimColor: true,
            children: subtitle,
          })
        : subtitle);
    $[7] = dimSubtitle;
    $[8] = subtitle;
    $[9] = subtitleElement;
  } else subtitleElement = $[9];
  let headerGroup;
  if ($[10] !== headerElement || $[11] !== subtitleElement) {
    headerGroup = jsxProd_default_2(Fragment, {
      children: [headerElement, subtitleElement],
    });
    $[10] = headerElement;
    $[11] = subtitleElement;
    $[12] = headerGroup;
  } else headerGroup = $[12];
  return headerGroup;
}
//@ chunk-zjxrz3f0.js:12565-12592 layout
function pickFirst(first, second) {
  return first;
}
//@ chunk-zjxrz3f0.js:12592-12768 placement (2.1.88 match: _temp, 0.711)
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
export { Dialog, pickFirst, DialogFrame };
