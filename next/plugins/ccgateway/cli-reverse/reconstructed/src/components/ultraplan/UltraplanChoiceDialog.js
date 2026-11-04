/**
 * components/ultraplan/UltraplanChoiceDialog.tsx
 *
 * 2.1.316 新增。ultraplan 选择对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { init_react_production, useState, useEffect } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { wrapText } from "../../ink/wrap-text.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { figures_default } from "../../../vendor/@inquirer/figures/dist/esm/index.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { Dialog } from "../design-system/Dialog.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1252276-1252280 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1252276", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1252280-1252296 placement
function noopUltraplanCancel() {}
//@ chunk-18hwfzwa.js:1252296-1252314 placement
var MAX_PLAN_ROWS = 24;
var PLAN_ROWS_RESERVED = 11;
//@ chunk-18hwfzwa.js:1252314-1254970 placement
function UltraplanChoiceDialog(props) {
  let $ = useMemoCache(40);
  let { plan, onDone } = props;
  useRegisterOverlay("ultraplan-choice");
  let { answer, refused, attempts } = useRefusableAnswer(onDone);
  let { rows, columns } = useTerminalSize();
  let min = Math.min(MAX_PLAN_ROWS, Math.max(1, Math.floor(rows / 2) - PLAN_ROWS_RESERVED));
  let planLines;
  if ($[0] !== columns || $[1] !== plan) {
    planLines = wrapText(stripNonPrintable(plan), Math.max(1, columns - 4), "wrap").split(`
`);
    $[0] = columns;
    $[1] = plan;
    $[2] = planLines;
  } else planLines = $[2];
  let lines = planLines;
  let max = Math.max(0, lines.length - min);
  let [scrollTop, setScrollTop] = useState(0);
  let clampScroll;
  let clampScrollDeps;
  if ($[3] !== max) {
    clampScroll = () => setScrollTop((previousTop) => Math.min(previousTop, max));
    clampScrollDeps = [max];
    $[3] = max;
    $[4] = clampScroll;
    $[5] = clampScrollDeps;
  } else {
    clampScroll = $[4];
    clampScrollDeps = $[5];
  }
  useEffect(clampScroll, clampScrollDeps);
  let isScrollable = lines.length > min;
  let scrollBy;
  if ($[6] !== max || $[7] !== isScrollable) {
    scrollBy = function scrollBy_(delta) {
      if (!isScrollable) {
        return;
      }
      setScrollTop((previousTop) => Math.max(0, Math.min(previousTop + delta, max)));
    };
    $[6] = max;
    $[7] = isScrollable;
    $[8] = scrollBy;
  } else scrollBy = $[8];
  let scrollPages = scrollBy;
  let handleKeyDown;
  if ($[9] !== min || $[10] !== scrollPages) {
    handleKeyDown = function onKeyDown(event) {
      if (!event.ctrl || event.meta) {
        return;
      }
      let max = Math.max(1, Math.floor(min / 2));
      if (event.key === "d") {
        event.preventDefault();
        scrollPages(max);
      } else if (event.key === "u") {
        event.preventDefault();
        scrollPages(-max);
      }
    };
    $[9] = min;
    $[10] = scrollPages;
    $[11] = handleKeyDown;
  } else handleKeyDown = $[11];
  let onKeyDown = handleKeyDown;
  let handleWheel;
  if ($[12] !== scrollPages) {
    handleWheel = function onWheel(event) {
      event.preventDefault();
      scrollPages(event.deltaY > 0 ? 3 : -3);
    };
    $[12] = scrollPages;
    $[13] = handleWheel;
  } else handleWheel = $[13];
  let onWheel = handleWheel;
  let visiblePlanText;
  if ($[14] !== lines || $[15] !== min || $[16] !== scrollTop) {
    visiblePlanText = lines.slice(scrollTop, scrollTop + min).join(`
`);
    $[14] = lines;
    $[15] = min;
    $[16] = scrollTop;
    $[17] = visiblePlanText;
  } else visiblePlanText = $[17];
  let children = visiblePlanText;
  let hasMoreAbove = scrollTop > 0;
  let hasMoreBelow = scrollTop < max;
  let planElement;
  if ($[18] !== children) {
    planElement = jsxProd_default(Text, {
      children,
    });
    $[18] = children;
    $[19] = planElement;
  } else planElement = $[19];
  let scrollHintElement;
  if (
    $[20] !== hasMoreBelow ||
    $[21] !== hasMoreAbove ||
    $[22] !== lines.length ||
    $[23] !== min ||
    $[24] !== scrollTop ||
    $[25] !== isScrollable
  ) {
    scrollHintElement =
      isScrollable &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          hasMoreAbove ? figures_default.arrowUp : " ",
          hasMoreBelow ? figures_default.arrowDown : " ",
          " ",
          scrollTop + 1,
          "\u2013",
          Math.min(scrollTop + min, lines.length),
          " of",
          " ",
          lines.length,
          " \xB7 ctrl+u/ctrl+d to scroll",
        ],
      });
    $[20] = hasMoreBelow;
    $[21] = hasMoreAbove;
    $[22] = lines.length;
    $[23] = min;
    $[24] = scrollTop;
    $[25] = isScrollable;
    $[26] = scrollHintElement;
  } else scrollHintElement = $[26];
  let bodyElement;
  if ($[27] !== planElement || $[28] !== scrollHintElement) {
    bodyElement = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginBottom: 1,
      children: [planElement, scrollHintElement],
    });
    $[27] = planElement;
    $[28] = scrollHintElement;
    $[29] = bodyElement;
  } else bodyElement = $[29];
  const defaultFocusValue = refused ?? undefined;
  let options;
  if ($[30] === MEMO_CACHE_SENTINEL) {
    options = [
      {
        label: "Implement here",
        value: "here",
        description: "Inject plan into the current conversation",
      },
      {
        label: "Start new session",
        value: "fresh",
        description: "Clear conversation and start with only the plan",
      },
      {
        label: "Cancel",
        value: "cancel",
        description: "Don't implement \u2014 save plan and return",
      },
    ];
    $[30] = options;
  } else options = $[30];
  let selectorElement;
  if ($[31] !== attempts || $[32] !== answer || $[33] !== defaultFocusValue) {
    selectorElement = jsxProd_default(
      ModelSelector,
      {
        defaultFocusValue,
        options,
        onChange: answer,
      },
      attempts,
    );
    $[31] = attempts;
    $[32] = answer;
    $[33] = defaultFocusValue;
    $[34] = selectorElement;
  } else selectorElement = $[34];
  let dialogElement;
  if ($[35] !== onKeyDown || $[36] !== onWheel || $[37] !== bodyElement || $[38] !== selectorElement) {
    dialogElement = jsxProd_default(Dialog, {
      title: "Ultraplan approved",
      subtitle: "How should the plan be implemented?",
      onCancel: noopUltraplanCancel,
      isCancelActive: false,
      hideInputGuide: true,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        marginBottom: 1,
        onKeyDown,
        onWheel,
        children: [bodyElement, selectorElement],
      }),
    });
    $[35] = onKeyDown;
    $[36] = onWheel;
    $[37] = bodyElement;
    $[38] = selectorElement;
    $[39] = dialogElement;
  } else dialogElement = $[39];
  return dialogElement;
}
//@ chunk-18hwfzwa.js:1254970-1254974 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1254970", () => {
  init_react_production();
});
export { UltraplanChoiceDialog };
