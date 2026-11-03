/**
 * components/permissions/FolderAccessPermissionRequest.tsx
 *
 * 2.1.316 新增。目录访问权限请求。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (18), chunk-1aq4fchs.js (3)
 * attribution: placement 21
 */
import { Ar, MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { init_react_production, y, qt, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import { wrapText } from "../../ink/wrap-text.js";
import { MAX_CARD_ACTIONS } from "./permissionCardKinds.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
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
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
} from "../CustomSelect/selectTypeahead.js";
import { useShortcutDisplay } from "../../keybindings/useKeybindingDisplay.js";
import { useDialogKeybindings } from "../../keybindings/dialogKeyHints.js";
import { PermissionDialog_2 } from "./PermissionDialog.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:36516-36526 placement
var FolderAccessPermissionRequestNamespace = {};
//@ chunk-18hwfzwa.js:36526-36567 placement
Ar(FolderAccessPermissionRequestNamespace, {
  cardRows: () => cardRows,
  default: () => FolderAccessPermissionRequestNamespace,
});
//@ chunk-18hwfzwa.js:36567-36577 placement
var FolderAccessPermissionRequestNamespace2 = {};
//@ chunk-18hwfzwa.js:36577-36623 placement
Ar(FolderAccessPermissionRequestNamespace2, {
  MIN_CARD_ROWS: () => MIN_CARD_ROWS,
  default: () => FolderAccessPermissionRequestNamespace2,
});
//@ chunk-18hwfzwa.js:1359828-1359832 placement
init_react_production();
//@ chunk-18hwfzwa.js:1359832-1359905 placement
var cardRows = (h, x) =>
  h.flatMap((D) =>
    wrapText(D, Math.max(1, x - MAX_CARD_ACTIONS), "wrap").split(`
`),
  );
//@ chunk-18hwfzwa.js:1359905-1359915 placement
var MIN_CARD_ROWS = 2;
//@ chunk-18hwfzwa.js:1359915-1359995 placement = _temp2 (1)
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
//@ chunk-18hwfzwa.js:1359995-1360090 placement
function renderFileItemValue(Xt, io) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      wrap: "truncate-middle",
      children: Xt,
    },
    `${io} ${Xt}`,
  );
}
//@ chunk-18hwfzwa.js:1360090-1361295 placement
function FolderListingCard(props) {
  let $ = w(25);
  let { card } = props;
  let terminalSize = useTerminalSize();
  let max = Math.max(
    FolderAccessPermissionRequestNamespace2.MIN_CARD_ROWS,
    terminalSize.rows - DIALOG_LAYOUT_EMPTY_1.CHROME_ROWS,
  );
  let ke;
  let Re;
  let Be;
  let He;
  let flexDirection;
  let ze;
  if ($[0] !== max || $[1] !== card.lines || $[2] !== terminalSize.columns) {
    He = FolderAccessPermissionRequestNamespace.cardRows(card.lines, terminalSize.columns);
    let Xe = He.length <= max;
    Re = Xe ? He : He.slice(0, max - 1);
    Be = Math.min(FolderAccessPermissionRequestNamespace_2.MAX_CARD_FILES, Math.max(0, max - He.length));
    ke = Box;
    flexDirection = "column";
    ze = Re.map(renderFileCardLine);
    $[0] = max;
    $[1] = card.lines;
    $[2] = terminalSize.columns;
    $[3] = ke;
    $[4] = Re;
    $[5] = Be;
    $[6] = He;
    $[7] = flexDirection;
    $[8] = ze;
  } else {
    ke = $[3];
    Re = $[4];
    Be = $[5];
    He = $[6];
    flexDirection = $[7];
    ze = $[8];
  }
  const count = He.length - Re.length;
  let kt;
  if ($[9] !== count) {
    kt = jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count,
    });
    $[9] = count;
    $[10] = kt;
  } else kt = $[10];
  let At;
  if ($[11] !== card.values || $[12] !== Be) {
    At = card.values.slice(0, Be).map(renderFileItemValue);
    $[11] = card.values;
    $[12] = Be;
    $[13] = At;
  } else At = $[13];
  const count_2 = card.values.length - Be;
  let Ot;
  if ($[14] !== count_2) {
    Ot = jsxProd_default(MoreItemsIndicator, {
      direction: "below",
      count: count_2,
    });
    $[14] = count_2;
    $[15] = Ot;
  } else Ot = $[15];
  let Et;
  if ($[16] !== At || $[17] !== Ot) {
    Et = jsxProd_default_2(Box, {
      flexDirection: "column",
      marginTop: 1,
      children: [At, Ot],
    });
    $[16] = At;
    $[17] = Ot;
    $[18] = Et;
  } else Et = $[18];
  let Dt;
  if ($[19] !== ke || $[20] !== flexDirection || $[21] !== ze || $[22] !== kt || $[23] !== Et) {
    Dt = jsxProd_default_2(ke, {
      flexDirection,
      children: [ze, kt, Et],
    });
    $[19] = ke;
    $[20] = flexDirection;
    $[21] = ze;
    $[22] = kt;
    $[23] = Et;
    $[24] = Dt;
  } else Dt = $[24];
  return Dt;
}
//@ chunk-18hwfzwa.js:1361295-1361358 placement
function renderOrderedListItem(rt, kt) {
  return jsxProd_default(
    OrderedListWithItem.Item,
    {
      label: rt,
    },
    `${kt} ${rt}`,
  );
}
//@ chunk-18hwfzwa.js:1361358-1362390 placement
function FolderListingView(h) {
  let $ = w(15);
  let terminalSize = useTerminalSize();
  const title = `Listed in the folder (${h.lines.length})`;
  const onCancel = h.onBack;
  let ke;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    ke = jsxProd_default(KeyboardShortcutHint, {
      chord: ["up", "down"],
      action: "move",
    });
    $[0] = ke;
  } else ke = $[0];
  let inputGuide;
  if ($[1] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        ke,
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
  if ($[2] !== h.head || $[3] !== h.lines || $[4] !== terminalSize.columns) {
    let We;
    if ($[6] !== terminalSize.columns) {
      We = (ze) =>
        wrapText(ze, Math.max(1, terminalSize.columns - DIALOG_LAYOUT_EMPTY_3.LIST_GUTTER), "wrap").split(`
`);
      $[6] = terminalSize.columns;
      $[7] = We;
    } else We = $[7];
    children = [...h.head, ...h.lines].flatMap(We).map(renderOrderedListItem);
    $[2] = h.head;
    $[3] = h.lines;
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
  let Xe;
  if ($[11] !== h.onBack || $[12] !== title || $[13] !== children_2) {
    Xe = jsxProd_default(Dialog, {
      title,
      color: "suggestion",
      onCancel,
      inputGuide,
      children: children_2,
    });
    $[11] = h.onBack;
    $[12] = title;
    $[13] = children_2;
    $[14] = Xe;
  } else Xe = $[14];
  return Xe;
}
//@ chunk-18hwfzwa.js:1362390-1364203 placement
function FolderAccessPermissionRequest(h) {
  let $ = w(19);
  let [x, D] = y("question");
  let inputRefusalWindow = useInputRefusalWindow();
  let refusalTracker = useRefusalTracker();
  let openedAt = useMountTime();
  let { remountKey } = settleKey(refusalTracker.epoch);
  let chord = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o");
  let We;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    We = [
      {
        action: "app:toggleTranscript",
        run: () => D("list"),
      },
    ];
    $[0] = We;
  } else We = $[0];
  let bindings = We;
  let Xe = h.payload.card === undefined;
  let rt;
  if ($[1] !== inputRefusalWindow || $[2] !== refusalTracker) {
    rt = function At() {
      let kt = inputRefusalWindow() || refusalTracker.refusedWithin();
      if (kt) refusalTracker.noteRefused();
      return kt;
    };
    $[1] = inputRefusalWindow;
    $[2] = refusalTracker;
    $[3] = rt;
  } else rt = $[3];
  let At = rt;
  let It;
  if ($[4] !== At || $[5] !== Xe || $[6] !== h) {
    It = function Dt(Ot) {
      if (At() || !h.wouldTakeAnswer()) {
        return;
      }
      let Et = Ot === "yes" && !Xe;
      h.answer(
        Et
          ? {
              behavior: "allow",
              updatedInput: h.payload.input,
            }
          : {
              behavior: "deny",
            },
      );
    };
    $[4] = At;
    $[5] = Xe;
    $[6] = h;
    $[7] = It;
  } else It = $[7];
  let Dt = It;
  let Lt = x === "list";
  let oo;
  if (
    $[8] !== chord ||
    $[9] !== At ||
    $[10] !== Lt ||
    $[11] !== Xe ||
    $[12] !== openedAt ||
    $[13] !== h.payload.card ||
    $[14] !== h.payload.everything ||
    $[15] !== h.payload.requestSource ||
    $[16] !== remountKey ||
    $[17] !== Dt
  ) {
    oo = Lt
      ? jsxProd_default(FolderListingView, {
          head: h.payload.card?.lines ?? [],
          lines: h.payload.everything,
          onBack: () => D("question"),
        })
      : jsxProd_default(useDialogKeybindings, {
          bindings,
          flexDirection: "column",
          children: jsxProd_default(PermissionDialog_2, {
            title: h.payload.card?.question ?? "Publish a plugin?",
            requestSource: h.payload.requestSource,
            children: jsxProd_default_2(Box, {
              flexDirection: "column",
              marginTop: 1,
              paddingX: 1,
              children: [
                Xe
                  ? jsxProd_default(Text, {
                      children: "This request to publish could not be read. Nothing is sent.",
                    })
                  : jsxProd_default(FolderListingCard, {
                      card: h.payload.card,
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
                      refuseInput: At,
                      openedAt,
                      hideIndexes: true,
                      focus: "cancel",
                      confirmLabel: Xe ? "Dismiss" : "Yes, publish",
                      cancelLabel: "No",
                      onConfirm: () => Dt("yes"),
                      onCancel: () => Dt("no"),
                    },
                    remountKey,
                  ),
                }),
              ],
            }),
          }),
        });
    $[8] = chord;
    $[9] = At;
    $[10] = Lt;
    $[11] = Xe;
    $[12] = openedAt;
    $[13] = h.payload.card;
    $[14] = h.payload.everything;
    $[15] = h.payload.requestSource;
    $[16] = remountKey;
    $[17] = Dt;
    $[18] = oo;
  } else oo = $[18];
  return oo;
}
//@ chunk-18hwfzwa.js:1364236-1364240 placement
init_react_production();
//@ chunk-18hwfzwa.js:1364240-1364244 placement
init_react_production();
//@ chunk-18hwfzwa.js:1364244-1364248 placement
init_react_production();
//@ chunk-18hwfzwa.js:1364248-1364265 placement
var exitCleanupCallbackRef = qt(null);
//@ chunk-18hwfzwa.js:1364265-1364313 placement
function useExitCleanup() {
  let h = Se(exitCleanupCallbackRef);
  zt(() => {
    h?.();
  }, [h]);
}
//@ chunk-1aq4fchs.js:227-238 placement
var FolderAccessPermissionRequestNamespace_2 = {};
//@ chunk-1aq4fchs.js:238-287 placement
Ar(FolderAccessPermissionRequestNamespace_2, {
  MAX_CARD_FILES: () => MAX_CARD_FILES,
  default: () => FolderAccessPermissionRequestNamespace_2,
});
//@ chunk-1aq4fchs.js:287-298 placement
var MAX_CARD_FILES = 20;
export { useExitCleanup, exitCleanupCallbackRef, FolderAccessPermissionRequest, MAX_CARD_FILES };
