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

//@ chunk-thjvqmbc.js:8415-8438 sole-consumer
function returnFalse() {
  return false;
}
//@ chunk-thjvqmbc.js:8438-8461 sole-consumer
function returnFalse_2() {
  return false;
}
//@ chunk-thjvqmbc.js:8461-8491 affinity
var DEFAULT_CONFIRM_CANCEL_HINTS; // deferred: uses renderConfirmCancelHints of its import cycle while loading; runs once the cycle is complete
var READONLY_HINT_FORMAT;
var DEFAULT_CONFIRM_CANCEL_HINTS_2;
deferInit("chunk-thjvqmbc.js:8461", () => {
  DEFAULT_CONFIRM_CANCEL_HINTS = renderConfirmCancelHints({});
  READONLY_HINT_FORMAT = stableEmptyObject(true);
  DEFAULT_CONFIRM_CANCEL_HINTS_2 = DEFAULT_CONFIRM_CANCEL_HINTS;
});
//@ chunk-thjvqmbc.js:8491-11137 fingerprint (2.1.88 match: Dialog, 0.482)
/**
 * 对话框：标题（permission 等色）、副标题、内容、底部快捷键提示（Esc 取消 / 双击退出），可选 onCancel。
 */
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
  let accentColor = color === undefined ? "permission" : color;
  let cancelActive = isCancelActive === undefined ? true : isCancelActive;
  let exitEnabled = exitOnCtrlCD === undefined ? false : exitOnCtrlCD;
  let isFullPageNotice = useIsFullPageNotice();
  let [isReadonlyFlag] = useState(returnFalse);
  let isTerse = isFullPageNotice || isReadonlyFlag;
  let resolvedAccentCached;
  if ($[0] !== accentColor || $[1] !== isTerse) {
    resolvedAccentCached = pickFirst(accentColor, isTerse);
    $[0] = accentColor;
    $[1] = isTerse;
    $[2] = resolvedAccentCached;
  } else resolvedAccentCached = $[2];
  let resolvedAccent = resolvedAccentCached;
  let color_2 = isFullPageNotice ? undefined : resolvedAccent;
  let children_2 = isTerse ? DEFAULT_CONFIRM_CANCEL_HINTS_2 : DEFAULT_CONFIRM_CANCEL_HINTS;
  let boundaryRef = useRef(null);
  let isExiting = exitEnabled || onExit !== undefined;
  let { entries, exitState } = useExitKeybindingEntries(
    isExiting ? onExit : onCancel,
    onInterrupt,
    cancelActive,
  );
  let cancelBindings;
  if ($[3] !== cancelActive || $[4] !== onCancel) {
    cancelBindings = cancelActive
      ? [
          {
            action: "confirm:no",
            run: onCancel,
            hint: "cancel",
          },
        ]
      : [];
    $[3] = cancelActive;
    $[4] = onCancel;
    $[5] = cancelBindings;
  } else cancelBindings = $[5];
  let bindings;
  if ($[6] !== entries || $[7] !== cancelBindings) {
    bindings = [...cancelBindings, ...entries];
    $[6] = entries;
    $[7] = cancelBindings;
    $[8] = bindings;
  } else bindings = $[8];
  let bindings_2 = bindings;
  let scrollContext = useContext(scrollViewportContext);
  let titleBoxRef = useRef(null);
  let [headerHeight, setHeaderHeight] = useState(subtitle ? 2 : 1);
  let measureHeader;
  if ($[9] !== scrollContext || $[10] !== headerHeight) {
    measureHeader = () => {
      if (!scrollContext || !titleBoxRef.current) {
        return;
      }
      let height = measureElement(titleBoxRef.current).height;
      if (height !== headerHeight) setHeaderHeight(height);
    };
    $[9] = scrollContext;
    $[10] = headerHeight;
    $[11] = measureHeader;
  } else measureHeader = $[11];
  useLayoutEffect(measureHeader);
  let chromeRows = headerHeight + 1 + (hideInputGuide ? 0 : 2);
  let innerScrollContext;
  if ($[12] !== scrollContext || $[13] !== chromeRows) {
    innerScrollContext = scrollContext
      ? {
          ...scrollContext,
          rows: Math.max(0, scrollContext.rows - chromeRows),
        }
      : null;
    $[12] = scrollContext;
    $[13] = chromeRows;
    $[14] = innerScrollContext;
  } else innerScrollContext = $[14];
  let value = innerScrollContext;
  let inputGuideNode;
  if ($[15] !== isExiting || $[16] !== exitState || $[17] !== inputGuide) {
    inputGuideNode =
      typeof inputGuide === "function"
        ? inputGuide(exitState)
        : exitState.pending
          ? jsxProd_default_2(Text, {
              children: ["Press ", exitState.keyName, " again to ", isExiting ? "exit" : "cancel"],
            })
          : inputGuide != null
            ? inputGuide
            : undefined;
    $[15] = isExiting;
    $[16] = exitState;
    $[17] = inputGuide;
    $[18] = inputGuideNode;
  } else inputGuideNode = $[18];
  let children_3 = inputGuideNode;
  let hasCustomGuide = typeof inputGuide === "function" || exitState.pending || inputGuide != null;
  let guideElement;
  if (
    $[19] !== children_3 ||
    $[20] !== children_2 ||
    $[21] !== hideInputGuide ||
    $[22] !== cancelActive ||
    $[23] !== isTerse ||
    $[24] !== hasCustomGuide ||
    $[25] !== truncateInputGuide
  ) {
    guideElement =
      !hideInputGuide &&
      jsxProd_default(Box, {
        marginTop: 1,
        flexShrink: 0,
        children: hasCustomGuide
          ? jsxProd_default(Text, {
              dimColor: true,
              italic: true,
              wrap: truncateInputGuide ? "truncate" : undefined,
              children: children_3,
            })
          : !cancelActive
            ? jsxProd_default(Text, {
                dimColor: true,
                italic: true,
                children: children_2,
              })
            : jsxProd_default(DialogKeyHints, {
                boundary: boundaryRef,
                terse: isTerse,
                format: isTerse ? READONLY_HINT_FORMAT.format : undefined,
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
    $[22] = cancelActive;
    $[23] = isTerse;
    $[24] = hasCustomGuide;
    $[25] = truncateInputGuide;
    $[26] = guideElement;
  } else guideElement = $[26];
  let guideRow = guideElement;
  const flexGrow = hideBorder || isFullPageNotice ? 0 : 1;
  let titleElement;
  if (
    $[27] !== isSubtitleDimmed_2 ||
    $[28] !== subtitle ||
    $[29] !== title ||
    $[30] !== color_2 ||
    $[31] !== titleEnd ||
    $[32] !== titleSuffix
  ) {
    titleElement = jsxProd_default(Box, {
      ref: titleBoxRef,
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
    $[33] = titleElement;
  } else titleElement = $[33];
  let bodyElement;
  if ($[34] !== value || $[35] !== children) {
    bodyElement = jsxProd_default(scrollViewportContext, {
      value,
      children,
    });
    $[34] = value;
    $[35] = children;
    $[36] = bodyElement;
  } else bodyElement = $[36];
  let contentElement;
  if ($[37] !== titleElement || $[38] !== bodyElement) {
    contentElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [titleElement, bodyElement],
    });
    $[37] = titleElement;
    $[38] = bodyElement;
    $[39] = contentElement;
  } else contentElement = $[39];
  let dialogElement;
  if ($[40] !== bindings_2 || $[41] !== guideRow || $[42] !== flexGrow || $[43] !== contentElement) {
    dialogElement = jsxProd_default_2(useDialogKeybindings, {
      ref: boundaryRef,
      scope: "Confirmation",
      claimFocus: true,
      flexGrow,
      flexDirection: "column",
      bindings: bindings_2,
      children: [contentElement, guideRow],
    });
    $[40] = bindings_2;
    $[41] = guideRow;
    $[42] = flexGrow;
    $[43] = contentElement;
    $[44] = dialogElement;
  } else dialogElement = $[44];
  let borderedElement = dialogElement;
  if (hideBorder || isFullPageNotice) {
    return borderedElement;
  }
  let paneElement;
  if ($[45] !== borderedElement || $[46] !== resolvedAccent) {
    paneElement = jsxProd_default(Pane, {
      color: resolvedAccent,
      children: borderedElement,
    });
    $[45] = borderedElement;
    $[46] = resolvedAccent;
    $[47] = paneElement;
  } else paneElement = $[47];
  return paneElement;
}
//@ chunk-thjvqmbc.js:11137-11811 layout
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
//@ chunk-thjvqmbc.js:11811-11837 layout
function pickFirst(first, second) {
  return first;
}
//@ chunk-thjvqmbc.js:11837-12013 placement (2.1.88 match: _temp, 0.712)
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
