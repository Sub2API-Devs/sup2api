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
import { j, y, qt, Se, zt } from "../../../vendor/react/cjs/react.production.js";
import { wrapText } from "../../ink/wrap-text.js";
import { QHi } from "./permissionCardKinds.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { iWn, dWn, aWn, lWn } from "./PermissionDialogLayout.js";
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
j();
//@ chunk-18hwfzwa.js:1359832-1359905 placement
var cardRows = (h, x) =>
  h.flatMap((D) =>
    wrapText(D, Math.max(1, x - QHi), "wrap").split(`
`),
  );
//@ chunk-18hwfzwa.js:1359905-1359915 placement
var MIN_CARD_ROWS = 2;
//@ chunk-18hwfzwa.js:1359915-1359995 placement = _temp2 (1)
function SLo(line_0, i_1) {
  return e(Text, { wrap: "truncate-end", children: line_0 }, `${i_1} ${line_0}`);
}
//@ chunk-18hwfzwa.js:1359995-1360090 placement
function bLo(Xt, io) {
  return e(Text, { dimColor: !0, wrap: "truncate-middle", children: Xt }, `${io} ${Xt}`);
}
//@ chunk-18hwfzwa.js:1360090-1361295 placement
function FolderListingCard(h) {
  let $ = w(25),
    { card: card } = h,
    D = useTerminalSize(),
    max = Math.max(FolderAccessPermissionRequestNamespace2.MIN_CARD_ROWS, D.rows - iWn.CHROME_ROWS),
    ke,
    Re,
    Be,
    He,
    We,
    ze;
  if ($[0] !== max || $[1] !== card.lines || $[2] !== D.columns) {
    He = FolderAccessPermissionRequestNamespace.cardRows(card.lines, D.columns);
    let Xe = He.length <= max;
    Re = Xe ? He : He.slice(0, max - 1);
    Be = Math.min(FolderAccessPermissionRequestNamespace_2.MAX_CARD_FILES, Math.max(0, max - He.length));
    ke = Box;
    We = "column";
    ze = Re.map(SLo);
    (($[0] = max),
      ($[1] = card.lines),
      ($[2] = D.columns),
      ($[3] = ke),
      ($[4] = Re),
      ($[5] = Be),
      ($[6] = He),
      ($[7] = We),
      ($[8] = ze));
  } else ((ke = $[3]), (Re = $[4]), (Be = $[5]), (He = $[6]), (We = $[7]), (ze = $[8]));
  const rt = He.length - Re.length;
  let kt;
  if ($[9] !== rt)
    ((kt = e(MoreItemsIndicator, { direction: "below", count: rt })), ($[9] = rt), ($[10] = kt));
  else kt = $[10];
  let At;
  if ($[11] !== card.values || $[12] !== Be)
    ((At = card.values.slice(0, Be).map(bLo)), ($[11] = card.values), ($[12] = Be), ($[13] = At));
  else At = $[13];
  const It = card.values.length - Be;
  let Ot;
  if ($[14] !== It)
    ((Ot = e(MoreItemsIndicator, { direction: "below", count: It })), ($[14] = It), ($[15] = Ot));
  else Ot = $[15];
  let Et;
  if ($[16] !== At || $[17] !== Ot)
    ((Et = r(Box, { flexDirection: "column", marginTop: 1, children: [At, Ot] })),
      ($[16] = At),
      ($[17] = Ot),
      ($[18] = Et));
  else Et = $[18];
  let Dt;
  if ($[19] !== ke || $[20] !== We || $[21] !== ze || $[22] !== kt || $[23] !== Et)
    ((Dt = r(ke, { flexDirection: We, children: [ze, kt, Et] })),
      ($[19] = ke),
      ($[20] = We),
      ($[21] = ze),
      ($[22] = kt),
      ($[23] = Et),
      ($[24] = Dt));
  else Dt = $[24];
  return Dt;
}
//@ chunk-18hwfzwa.js:1361295-1361358 placement
function vLo(rt, kt) {
  return e(OrderedListWithItem.Item, { label: rt }, `${kt} ${rt}`);
}
//@ chunk-18hwfzwa.js:1361358-1362390 placement
function FolderListingView(h) {
  let $ = w(15),
    x = useTerminalSize();
  const D = `Listed in the folder (${h.lines.length})`,
    onBack = h.onBack;
  let ke;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((ke = e(KeyboardShortcutHint, { chord: ["up", "down"], action: "move" })), ($[0] = ke));
  else ke = $[0];
  let Re;
  if ($[1] === MEMO_CACHE_SENTINEL)
    ((Re = r(Byline, {
      children: [
        ke,
        e(KeyboardShortcutHint, { chord: ["pageup", "pagedown"], action: "page" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "go back" }),
      ],
    })),
      ($[1] = Re));
  else Re = $[1];
  const max = Math.max(dWn.MIN_LIST_ROWS, x.rows - aWn.LIST_CHROME_ROWS);
  let He;
  if ($[2] !== h.head || $[3] !== h.lines || $[4] !== x.columns) {
    let We;
    if ($[6] !== x.columns)
      ((We = (ze) =>
        wrapText(ze, Math.max(1, x.columns - lWn.LIST_GUTTER), "wrap").split(`
`)),
        ($[6] = x.columns),
        ($[7] = We));
    else We = $[7];
    He = [...h.head, ...h.lines].flatMap(We).map(vLo);
    (($[2] = h.head), ($[3] = h.lines), ($[4] = x.columns), ($[5] = He));
  } else He = $[5];
  let We;
  if ($[8] !== max || $[9] !== He)
    ((We = e(OrderedListWithItem, { visibleCount: max, children: He })),
      ($[8] = max),
      ($[9] = He),
      ($[10] = We));
  else We = $[10];
  let Xe;
  if ($[11] !== h.onBack || $[12] !== D || $[13] !== We)
    ((Xe = e(Dialog, { title: D, color: "suggestion", onCancel: onBack, inputGuide: Re, children: We })),
      ($[11] = h.onBack),
      ($[12] = D),
      ($[13] = We),
      ($[14] = Xe));
  else Xe = $[14];
  return Xe;
}
//@ chunk-18hwfzwa.js:1362390-1364203 placement
function FolderAccessPermissionRequest(h) {
  let $ = w(19),
    [x, D] = y("question"),
    L = useInputRefusalWindow(),
    ee = useRefusalTracker(),
    ke = useMountTime(),
    { remountKey: remountKey } = settleKey(ee.epoch),
    Be = useShortcutDisplay("app:toggleTranscript", "Global", "ctrl+o"),
    We;
  if ($[0] === MEMO_CACHE_SENTINEL)
    ((We = [{ action: "app:toggleTranscript", run: () => D("list") }]), ($[0] = We));
  else We = $[0];
  let ze = We,
    Xe = h.payload.card === void 0,
    rt;
  if ($[1] !== L || $[2] !== ee)
    ((rt = function At() {
      let kt = L() || ee.refusedWithin();
      if (kt) ee.noteRefused();
      return kt;
    }),
      ($[1] = L),
      ($[2] = ee),
      ($[3] = rt));
  else rt = $[3];
  let At = rt,
    It;
  if ($[4] !== At || $[5] !== Xe || $[6] !== h)
    ((It = function Dt(Ot) {
      if (At() || !h.wouldTakeAnswer()) {
        return;
      }
      let Et = Ot === "yes" && !Xe;
      h.answer(Et ? { behavior: "allow", updatedInput: h.payload.input } : { behavior: "deny" });
    }),
      ($[4] = At),
      ($[5] = Xe),
      ($[6] = h),
      ($[7] = It));
  else It = $[7];
  let Dt = It,
    Lt = x === "list",
    oo;
  if (
    $[8] !== Be ||
    $[9] !== At ||
    $[10] !== Lt ||
    $[11] !== Xe ||
    $[12] !== ke ||
    $[13] !== h.payload.card ||
    $[14] !== h.payload.everything ||
    $[15] !== h.payload.requestSource ||
    $[16] !== remountKey ||
    $[17] !== Dt
  )
    ((oo = Lt
      ? e(FolderListingView, {
          head: h.payload.card?.lines ?? [],
          lines: h.payload.everything,
          onBack: () => D("question"),
        })
      : e(useDialogKeybindings, {
          bindings: ze,
          flexDirection: "column",
          children: e(PermissionDialog_2, {
            title: h.payload.card?.question ?? "Publish a plugin?",
            requestSource: h.payload.requestSource,
            children: r(Box, {
              flexDirection: "column",
              marginTop: 1,
              paddingX: 1,
              children: [
                Xe
                  ? e(Text, { children: "This request to publish could not be read. Nothing is sent." })
                  : e(FolderListingCard, { card: h.payload.card }),
                e(Text, {
                  dimColor: !0,
                  children: e(KeyboardShortcutHint, {
                    chord: Be,
                    action: "see every file",
                    parens: !0,
                    format: { keyCase: "lower" },
                  }),
                }),
                e(Box, {
                  marginTop: 1,
                  children: e(
                    ConfirmSelect,
                    {
                      refuseInput: At,
                      openedAt: ke,
                      hideIndexes: !0,
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
        })),
      ($[8] = Be),
      ($[9] = At),
      ($[10] = Lt),
      ($[11] = Xe),
      ($[12] = ke),
      ($[13] = h.payload.card),
      ($[14] = h.payload.everything),
      ($[15] = h.payload.requestSource),
      ($[16] = remountKey),
      ($[17] = Dt),
      ($[18] = oo));
  else oo = $[18];
  return oo;
}
//@ chunk-18hwfzwa.js:1364236-1364240 placement
j();
//@ chunk-18hwfzwa.js:1364240-1364244 placement
j();
//@ chunk-18hwfzwa.js:1364244-1364248 placement
j();
//@ chunk-18hwfzwa.js:1364248-1364265 placement
var PAe = qt(null);
//@ chunk-18hwfzwa.js:1364265-1364313 placement
function YC() {
  let h = Se(PAe);
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

export { YC, PAe, FolderAccessPermissionRequest, MAX_CARD_FILES };
