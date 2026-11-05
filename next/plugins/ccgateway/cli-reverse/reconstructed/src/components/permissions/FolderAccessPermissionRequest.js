/**
 * components/permissions/FolderAccessPermissionRequest.tsx
 *
 * 2.1.316 新增。目录访问权限请求。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-0758th4x.js (3), chunk-czq1j3j2.js (18)
 * attribution: placement 21
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __export, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  init_react_production,
  useState,
  createContext,
  useContext,
  useLayoutEffect,
} from "../../../vendor/react/cjs/react.production.js";
import { wrapText } from "../../ink/wrap-text.js";
import { MAX_CARD_ACTIONS } from "./permissionCardKinds.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import {
  DIALOG_LAYOUT_EMPTY_1,
  DIALOG_LAYOUT_EMPTY_4,
  DIALOG_LAYOUT_EMPTY_2,
  DIALOG_LAYOUT_EMPTY_3,
} from "./PermissionDialogLayout.js";
import { MoreItemsIndicator } from "../CustomSelect/select.js";
import { OrderedListWithItem } from "../CustomSelect/selectTable.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Byline } from "../design-system/Byline.js";
import { Dialog } from "../design-system/Dialog.js";
import {
  useRecentInputWithin,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-0758th4x.js:227-238 placement
var FolderAccessPermissionRequestNamespace = {};
//@ chunk-0758th4x.js:238-287 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-0758th4x.js:238", () => {
  __export(FolderAccessPermissionRequestNamespace, {
    MAX_CARD_FILES: () => MAX_CARD_FILES,
    default: () => FolderAccessPermissionRequestNamespace,
  });
});
//@ chunk-0758th4x.js:287-298 placement
var MAX_CARD_FILES = 20;
//@ chunk-czq1j3j2.js:38077-38087 placement
var FolderAccessPermissionRequestNamespace_2 = {};
//@ chunk-czq1j3j2.js:38087-38128 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:38087", () => {
  __export(FolderAccessPermissionRequestNamespace_2, {
    cardRows: () => cardRows,
    default: () => FolderAccessPermissionRequestNamespace_2,
  });
});
//@ chunk-czq1j3j2.js:38128-38138 placement
var FolderAccessPermissionRequestNamespace2 = {};
//@ chunk-czq1j3j2.js:38138-38184 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:38138", () => {
  __export(FolderAccessPermissionRequestNamespace2, {
    MIN_CARD_ROWS: () => MIN_CARD_ROWS,
    default: () => FolderAccessPermissionRequestNamespace2,
  });
});
//@ chunk-czq1j3j2.js:1368847-1368851 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1368847", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1382630-1382634 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1382630", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1382634-1382707 placement
var cardRows = (lines, columns) =>
  lines.flatMap((line) =>
    wrapText(line, Math.max(1, columns - MAX_CARD_ACTIONS), "wrap").split(`
`),
  );
//@ chunk-czq1j3j2.js:1382707-1382717 placement
var MIN_CARD_ROWS = 2;
//@ chunk-czq1j3j2.js:1382717-1382797 placement (2.1.88 match: _temp2, 1)
function renderFileCardLine(line_0, i_1) {
  return jsxProd_default(
    Text,
    {
      wrap: "truncate-end",
      children: line_0,
    },
    `${i_1} ${line_0}`,
  );
}
//@ chunk-czq1j3j2.js:1382797-1382892 placement
function renderFileItemValue(value, index) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      wrap: "truncate-middle",
      children: value,
    },
    `${index} ${value}`,
  );
}
//@ chunk-czq1j3j2.js:1382892-1384095 placement
function FolderListingCard(props) {
  let $ = useMemoCache(25);
  let { card } = props;
  let terminalSize = useTerminalSize();
  let max = Math.max(
    FolderAccessPermissionRequestNamespace2.MIN_CARD_ROWS,
    terminalSize.rows - DIALOG_LAYOUT_EMPTY_1.CHROME_ROWS,
  );
  let containerComponent;
  let visibleLines;
  let maxValueCount;
  let wrappedLines;
  let flexDirection;
  let lineElements;
  if ($[0] !== max || $[1] !== card.lines || $[2] !== terminalSize.columns) {
    wrappedLines = FolderAccessPermissionRequestNamespace_2.cardRows(card.lines, terminalSize.columns);
    let fitsInMax = wrappedLines.length <= max;
    visibleLines = fitsInMax ? wrappedLines : wrappedLines.slice(0, max - 1);
    maxValueCount = Math.min(
      FolderAccessPermissionRequestNamespace.MAX_CARD_FILES,
      Math.max(0, max - wrappedLines.length),
    );
    containerComponent = Box;
    flexDirection = "column";
    lineElements = visibleLines.map(renderFileCardLine);
    $[0] = max;
    $[1] = card.lines;
    $[2] = terminalSize.columns;
    $[3] = containerComponent;
    $[4] = visibleLines;
    $[5] = maxValueCount;
    $[6] = wrappedLines;
    $[7] = flexDirection;
    $[8] = lineElements;
  } else {
    containerComponent = $[3];
    visibleLines = $[4];
    maxValueCount = $[5];
    wrappedLines = $[6];
    flexDirection = $[7];
    lineElements = $[8];
  }
  const count = wrappedLines.length - visibleLines.length;
  let hiddenLinesIndicator;
  if ($[9] !== count) {
    hiddenLinesIndicator = jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count,
    });
    $[9] = count;
    $[10] = hiddenLinesIndicator;
  } else hiddenLinesIndicator = $[10];
  let valueElements;
  if ($[11] !== card.values || $[12] !== maxValueCount) {
    valueElements = card.values.slice(0, maxValueCount).map(renderFileItemValue);
    $[11] = card.values;
    $[12] = maxValueCount;
    $[13] = valueElements;
  } else valueElements = $[13];
  const count_2 = card.values.length - maxValueCount;
  let hiddenValuesIndicator;
  if ($[14] !== count_2) {
    hiddenValuesIndicator = jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count: count_2,
    });
    $[14] = count_2;
    $[15] = hiddenValuesIndicator;
  } else hiddenValuesIndicator = $[15];
  let valuesColumn;
  if ($[16] !== valueElements || $[17] !== hiddenValuesIndicator) {
    valuesColumn = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [valueElements, hiddenValuesIndicator],
    });
    $[16] = valueElements;
    $[17] = hiddenValuesIndicator;
    $[18] = valuesColumn;
  } else valuesColumn = $[18];
  let cardElement;
  if (
    $[19] !== containerComponent ||
    $[20] !== flexDirection ||
    $[21] !== lineElements ||
    $[22] !== hiddenLinesIndicator ||
    $[23] !== valuesColumn
  ) {
    cardElement = jsxProd_default_2(containerComponent, {
      flexDirection,
      children: [lineElements, hiddenLinesIndicator, valuesColumn],
    });
    $[19] = containerComponent;
    $[20] = flexDirection;
    $[21] = lineElements;
    $[22] = hiddenLinesIndicator;
    $[23] = valuesColumn;
    $[24] = cardElement;
  } else cardElement = $[24];
  return cardElement;
}
//@ chunk-czq1j3j2.js:1384095-1384158 placement
function renderOrderedListItem(label, index) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label,
    },
    `${index} ${label}`,
  );
}
//@ chunk-czq1j3j2.js:1384158-1385190 placement
function FolderListingView(props) {
  let $ = useMemoCache(15);
  let terminalSize = useTerminalSize();
  const title = `Listed in the folder (${props.lines.length})`;
  const onCancel = props.onBack;
  let moveHint;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    moveHint = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "move",
    });
    $[0] = moveHint;
  } else moveHint = $[0];
  let inputGuide;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        moveHint,
        jsxProd_default(KeyboardShortcutHint, {
          chord: ["pageup", "pagedown"],
          action: "page",
        }),
        jsxProd_default(KeyboardShortcutHint, {
          chord: "escape",
          action: "go back",
        }),
      ],
    });
    $[1] = inputGuide;
  } else inputGuide = $[1];
  const visibleCount = Math.max(
    DIALOG_LAYOUT_EMPTY_4.MIN_LIST_ROWS,
    terminalSize.rows - DIALOG_LAYOUT_EMPTY_2.LIST_CHROME_ROWS,
  );
  let children;
  if ($[2] !== props.head || $[3] !== props.lines || $[4] !== terminalSize.columns) {
    let wrapEntry;
    if ($[6] !== terminalSize.columns) {
      wrapEntry = (entry) =>
        wrapText(entry, Math.max(1, terminalSize.columns - DIALOG_LAYOUT_EMPTY_3.LIST_GUTTER), "wrap").split(`
`);
      $[6] = terminalSize.columns;
      $[7] = wrapEntry;
    } else wrapEntry = $[7];
    children = [...props.head, ...props.lines].flatMap(wrapEntry).map(renderOrderedListItem);
    $[2] = props.head;
    $[3] = props.lines;
    $[4] = terminalSize.columns;
    $[5] = children;
  } else children = $[5];
  let children_2;
  if ($[8] !== visibleCount || $[9] !== children) {
    children_2 = jsxProd_default(OrderedListWithItem, {
      visibleCount,
      children,
    });
    $[8] = visibleCount;
    $[9] = children;
    $[10] = children_2;
  } else children_2 = $[10];
  let dialogElement;
  if ($[11] !== props.onBack || $[12] !== title || $[13] !== children_2) {
    dialogElement = jsxProd_default(Dialog, {
      title,
      color: "suggestion",
      onCancel,
      inputGuide,
      children: children_2,
    });
    $[11] = props.onBack;
    $[12] = title;
    $[13] = children_2;
    $[14] = dialogElement;
  } else dialogElement = $[14];
  return dialogElement;
}
//@ chunk-czq1j3j2.js:1385190-1387003 placement
function FolderAccessPermissionRequest(props) {
  let $ = useMemoCache(19);
  let [view, setView] = useState("question");
  let isRecentInput = useRecentInputWithin();
  let refusalTracker = useRefusalTracker();
  let openedAt = useMountTime();
  let { remountKey } = settleKey(refusalTracker.epoch);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let moreBindings;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    moreBindings = [
      {
        action: "app:toggleTranscript",
        run: () => setView("list"),
      },
    ];
    $[0] = moreBindings;
  } else moreBindings = $[0];
  let bindings = moreBindings;
  let isCardUnreadable = props.payload.card === undefined;
  let refuseInput;
  if ($[1] !== isRecentInput || $[2] !== refusalTracker) {
    refuseInput = function shouldRefuseInput() {
      let isRefused = isRecentInput() || refusalTracker.refusedWithin();
      if (isRefused) refusalTracker.noteRefused();
      return isRefused;
    };
    $[1] = isRecentInput;
    $[2] = refusalTracker;
    $[3] = refuseInput;
  } else refuseInput = $[3];
  let refuseInputMemo = refuseInput;
  let handleAnswer;
  if ($[4] !== refuseInputMemo || $[5] !== isCardUnreadable || $[6] !== props) {
    handleAnswer = function answerChoice(choice) {
      if (refuseInputMemo() || !props.wouldTakeAnswer()) {
        return;
      }
      let isAccepted = choice === "yes" && !isCardUnreadable;
      props.answer(
        isAccepted
          ? {
              behavior: "allow",
              updatedInput: props.payload.input,
            }
          : {
              behavior: "deny",
            },
      );
    };
    $[4] = refuseInputMemo;
    $[5] = isCardUnreadable;
    $[6] = props;
    $[7] = handleAnswer;
  } else handleAnswer = $[7];
  let handleAnswerMemo = handleAnswer;
  let isListView = view === "list";
  let content;
  if (
    $[8] !== chord ||
    $[9] !== refuseInputMemo ||
    $[10] !== isListView ||
    $[11] !== isCardUnreadable ||
    $[12] !== openedAt ||
    $[13] !== props.payload.card ||
    $[14] !== props.payload.everything ||
    $[15] !== props.payload.requestSource ||
    $[16] !== remountKey ||
    $[17] !== handleAnswerMemo
  ) {
    content = isListView
      ? jsxProd_default(FolderListingView, {
          head: props.payload.card?.lines ?? [],
          lines: props.payload.everything,
          onBack: () => setView("question"),
        })
      : jsxProd_default(useDialogKeybindings, {
          bindings,
          flexDirection: "column",
          children: jsxProd_default(PermissionDialog_2, {
            title: props.payload.card?.question ?? "Publish a plugin?",
            requestSource: props.payload.requestSource,
            children: jsxProd_default_2(Box, {
              flexDirection: "column",
              marginTop: 1,
              paddingX: 1,
              children: [
                isCardUnreadable
                  ? jsxProd_default(Text, {
                      children: "This request to publish could not be read. Nothing is sent.",
                    })
                  : jsxProd_default(FolderListingCard, {
                      card: props.payload.card,
                    }),
                jsxProd_default(Text, {
                  dimColor: true,
                  children: jsxProd_default(KeyboardShortcutHint, {
                    chord,
                    action: "see every file",
                    parens: true,
                    format: {
                      keyCase: "lower",
                    },
                  }),
                }),
                jsxProd_default(Box, {
                  marginTop: 1,
                  children: jsxProd_default(
                    ConfirmSelect,
                    {
                      refuseInput: refuseInputMemo,
                      openedAt,
                      hideIndexes: true,
                      focus: "cancel",
                      confirmLabel: isCardUnreadable ? "Dismiss" : "Yes, publish",
                      cancelLabel: "No",
                      onConfirm: () => handleAnswerMemo("yes"),
                      onCancel: () => handleAnswerMemo("no"),
                    },
                    remountKey,
                  ),
                }),
              ],
            }),
          }),
        });
    $[8] = chord;
    $[9] = refuseInputMemo;
    $[10] = isListView;
    $[11] = isCardUnreadable;
    $[12] = openedAt;
    $[13] = props.payload.card;
    $[14] = props.payload.everything;
    $[15] = props.payload.requestSource;
    $[16] = remountKey;
    $[17] = handleAnswerMemo;
    $[18] = content;
  } else content = $[18];
  return content;
}
//@ chunk-czq1j3j2.js:1387036-1387040 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1387036", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1387040-1387044 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1387040", () => {
  init_react_production();
});
//@ chunk-czq1j3j2.js:1387048-1387065 placement
var exitCleanupCallbackRef; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-czq1j3j2.js:1387048", () => {
  exitCleanupCallbackRef = createContext(null);
});
//@ chunk-czq1j3j2.js:1387065-1387113 placement
function useExitCleanup() {
  let exitCleanup = useContext(exitCleanupCallbackRef);
  useLayoutEffect(() => {
    exitCleanup?.();
  }, [exitCleanup]);
}
export { MAX_CARD_FILES, useExitCleanup, exitCleanupCallbackRef, FolderAccessPermissionRequest };
