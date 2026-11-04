/**
 * components/ExitBackgroundWorkDialog.tsx
 *
 * 2.1.316 新增。退出时仍有后台工作的确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { init_react_production } from "../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box, Text } from "../ink/components/Text.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { logEvent } from "../services/analytics/index.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "./ScrollViewportContext.js";
import { isFullscreenActive } from "../utils/fullscreen.js";
import { Dialog } from "./design-system/Dialog.js";
import { OverflowHint } from "./CtrlOToExpand.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1690353-1690357 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1690353", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1690357-1690522 placement
function renderBackgroundWorkItem(item, key) {
  return jsxProd_default_2(
    Box,
    {
      flexDirection: "row",
      children: [
        jsxProd_default(Text, {
          bold: true,
          children: item.label,
        }),
        item.detail
          ? jsxProd_default_2(Text, {
              dimColor: true,
              children: [" \xB7 ", item.detail],
            })
          : null,
      ],
    },
    key,
  );
}
//@ chunk-18hwfzwa.js:1690522-1692920 placement
function ExitBackgroundWorkDialog(props) {
  let $ = useMemoCache(52);
  let { items, onExit, onCancel, onBackground } = props;
  let logChoiceCached;
  if ($[0] !== items.length) {
    logChoiceCached = function logChoice(choice) {
      logEvent("tengu_exit_background_work_prompt", {
        item_count: items.length,
        chose_exit: choice === "exit",
        chose_background: choice === "background",
      });
    };
    $[0] = items.length;
    $[1] = logChoiceCached;
  } else logChoiceCached = $[1];
  let recordChoice = logChoiceCached;
  let changeCached;
  if ($[2] !== recordChoice || $[3] !== onBackground || $[4] !== onCancel || $[5] !== onExit) {
    changeCached = function handleChange(value) {
      switch ((recordChoice(value), value)) {
        case "exit": {
          return onExit();
        }
        case "background": {
          return onBackground?.();
        }
        case "stay": {
          return onCancel();
        }
      }
    };
    $[2] = recordChoice;
    $[3] = onBackground;
    $[4] = onCancel;
    $[5] = onExit;
    $[6] = changeCached;
  } else changeCached = $[6];
  let onChange = changeCached;
  let cancelCached;
  if ($[7] !== recordChoice || $[8] !== onCancel) {
    cancelCached = function handleCancel() {
      recordChoice("stay");
      onCancel();
    };
    $[7] = recordChoice;
    $[8] = onCancel;
    $[9] = cancelCached;
  } else cancelCached = $[9];
  let onCancelHandler = cancelCached;
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let viewportRows;
  if ($[10] !== hasScrollViewport || $[11] !== rows) {
    viewportRows = !hasScrollViewport && isFullscreenActive() ? Math.floor(rows / 2) : rows;
    $[10] = hasScrollViewport;
    $[11] = rows;
    $[12] = viewportRows;
  } else viewportRows = $[12];
  let availableRows = viewportRows;
  let chromeRows = (onBackground ? 13 : 12) - 0;
  let max = Math.max(1, availableRows - chromeRows);
  let ListBox;
  let DialogComponent;
  let subtitle;
  let onCancel_2;
  let exitOnCtrlCD;
  let flexDirection;
  let gap;
  let paddingLeft;
  let itemElements;
  let title;
  if ($[13] !== onCancelHandler || $[14] !== items || $[15] !== max) {
    let sliced = items.slice(0, max);
    DialogComponent = Dialog;
    title = "Background work is running";
    subtitle = "The following will stop when you exit:";
    onCancel_2 = onCancelHandler;
    exitOnCtrlCD = true;
    ListBox = Box;
    flexDirection = "column";
    gap = 0;
    paddingLeft = 0;
    itemElements = sliced.map(renderBackgroundWorkItem);
    $[13] = onCancelHandler;
    $[14] = items;
    $[15] = max;
    $[16] = ListBox;
    $[17] = DialogComponent;
    $[18] = subtitle;
    $[19] = onCancel_2;
    $[20] = exitOnCtrlCD;
    $[21] = flexDirection;
    $[22] = gap;
    $[23] = paddingLeft;
    $[24] = itemElements;
    $[25] = title;
  } else {
    ListBox = $[16];
    DialogComponent = $[17];
    subtitle = $[18];
    onCancel_2 = $[19];
    exitOnCtrlCD = $[20];
    flexDirection = $[21];
    gap = $[22];
    paddingLeft = $[23];
    itemElements = $[24];
    title = $[25];
  }
  const count = items.length - max;
  let overflowHint;
  if ($[26] !== count) {
    overflowHint = jsxProd_default(OverflowHint, {
      count,
      unit: "item",
    });
    $[26] = count;
    $[27] = overflowHint;
  } else overflowHint = $[27];
  let listElement;
  if (
    $[28] !== ListBox ||
    $[29] !== overflowHint ||
    $[30] !== flexDirection ||
    $[31] !== gap ||
    $[32] !== paddingLeft ||
    $[33] !== itemElements
  ) {
    listElement = jsxProd_default_2(ListBox, {
      flexDirection,
      gap,
      paddingLeft,
      children: [itemElements, overflowHint],
    });
    $[28] = ListBox;
    $[29] = overflowHint;
    $[30] = flexDirection;
    $[31] = gap;
    $[32] = paddingLeft;
    $[33] = itemElements;
    $[34] = listElement;
  } else listElement = $[34];
  let exitOption;
  if ($[35] === MEMO_CACHE_SENTINEL) {
    exitOption = {
      label: "Exit and stop tasks",
      value: "exit",
    };
    $[35] = exitOption;
  } else exitOption = $[35];
  let backgroundOptions;
  if ($[36] !== onBackground) {
    backgroundOptions = onBackground
      ? [
          {
            label: "Move to background and exit",
            value: "background",
          },
        ]
      : [];
    $[36] = onBackground;
    $[37] = backgroundOptions;
  } else backgroundOptions = $[37];
  let stayOption;
  if ($[38] === MEMO_CACHE_SENTINEL) {
    stayOption = {
      label: "Stay",
      value: "stay",
    };
    $[38] = stayOption;
  } else stayOption = $[38];
  let options;
  if ($[39] !== backgroundOptions) {
    options = [exitOption, ...backgroundOptions, stayOption];
    $[39] = backgroundOptions;
    $[40] = options;
  } else options = $[40];
  let selectorElement;
  if ($[41] !== onChange || $[42] !== options) {
    selectorElement = jsxProd_default(ModelSelector, {
      options,
      onChange,
    });
    $[41] = onChange;
    $[42] = options;
    $[43] = selectorElement;
  } else selectorElement = $[43];
  let dialogElement;
  if (
    $[44] !== DialogComponent ||
    $[45] !== subtitle ||
    $[46] !== onCancel_2 ||
    $[47] !== exitOnCtrlCD ||
    $[48] !== listElement ||
    $[49] !== selectorElement ||
    $[50] !== title
  ) {
    dialogElement = jsxProd_default_2(DialogComponent, {
      title,
      subtitle,
      onCancel: onCancel_2,
      exitOnCtrlCD,
      children: [listElement, selectorElement],
    });
    $[44] = DialogComponent;
    $[45] = subtitle;
    $[46] = onCancel_2;
    $[47] = exitOnCtrlCD;
    $[48] = listElement;
    $[49] = selectorElement;
    $[50] = title;
    $[51] = dialogElement;
  } else dialogElement = $[51];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1693038-1693042 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1693038", () => {
  init_react_production();
});
export { ExitBackgroundWorkDialog };
