/**
 * components/permissions/AutoModeSetupReview.tsx
 *
 * 2.1.316 新增。auto 模式设置审阅。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (16)
 * attribution: placement 16
 */
import { j, y, R, Q, yt } from "../../../vendor/react/cjs/react.production.js";
import { jnn, settleKey, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { So } from "../../hooks/useRecentInputGuard.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { uniqueLabels, replaceLineBreaks } from "../../utils/permissions/approvalPayloadSerialization.js";
import { r, e } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Byline } from "../design-system/Byline.js";
import { Text, Box } from "../../ink/components/Text.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { Dialog } from "../design-system/Dialog.js";
import { SelectMultiAccessible } from "../CustomSelect/SelectMulti.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { NO_COMMITTED_ROW } from "../CustomSelect/select.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { createStore } from "../../state/store.js";
import { SessionRootSlot } from "../../bootstrap/sessionSlices.js";
import { useSession } from "../../context/session.js";

//@ chunk-18hwfzwa.js:1312910-1312914 placement
j();
//@ chunk-18hwfzwa.js:1312914-1312918 placement
j();
//@ chunk-18hwfzwa.js:1312918-1314841 placement
function AutoModeSetupFlaggedPicker({
  flagged: flagged,
  initialPicking: initialPicking,
  onPickingChange: onPickingChange,
  initialSelection: initialSelection,
  onSelectionChange: onSelectionChange,
  onResolve: onResolve,
  onCancel: onCancel,
  hideIndexes: hideIndexes,
}) {
  let { epoch: epoch, noteAttempt: noteAttempt } = jnn(),
    ze = settleKey(epoch, So),
    [Xe, rt] = y(initialPicking),
    kt = settleKey(Xe, So),
    At = useIsScreenReaderEnabled(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker();
  function Et() {
    if (!kt.settled || refusedWithin(So)) return (noteRefused(), !0);
    return !1;
  }
  function Dt() {
    if (!ze.settled) return (noteAttempt(), !0);
    return !1;
  }
  let Lt = R(initialSelection),
    oo = Q(() => uniqueLabels(flagged), [flagged]),
    Xt = r(Byline, {
      children: [
        e(Text, { children: "Your setup is saved either way" }),
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "skip" }),
      ],
    });
  function io() {
    (noteAttempt(), onCancel());
  }
  if (Xe)
    return e(Dialog, {
      title: "Pick which to remove",
      onCancel: io,
      exitOnCtrlCD: !0,
      inputGuide: Xt,
      children: e(
        SelectMultiAccessible,
        {
          refuseInput: Et,
          hideIndexes: hideIndexes,
          options: oo.map((so, po) => ({ value: flagged[po], label: String(so) })),
          defaultValue: Lt.current,
          onChange: (so) => {
            if (!kt.settled) return;
            ((Lt.current = so), onSelectionChange(so));
          },
          submitButtonText: "Remove selected",
          onSubmit: () => {
            (noteAttempt(), onResolve(Lt.current));
          },
          onCancel: io,
        },
        At ? "screen-reader" : kt.remountKey,
      ),
    });
  return e(Dialog, {
    title: "Review rules that skip checks",
    onCancel: io,
    exitOnCtrlCD: !0,
    inputGuide: Xt,
    children: r(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        e(Text, {
          dimColor: !0,
          children:
            "These permissions.allow entries in your user settings are broad enough that auto mode either ignores them at runtime, or auto-approves destructive commands with no check. Removing one means matching commands prompt again outside auto mode too.",
        }),
        e(Box, {
          flexDirection: "column",
          children: oo.map((so, po) => r(Text, { children: [" \xB7 ", String(so)] }, flagged[po])),
        }),
        e(Text, { dimColor: !0, children: "Removed entries can be restored by re-adding them verbatim." }),
        e(
          ModelSelector,
          {
            refuseInput: Dt,
            selectedValue: NO_COMMITTED_ROW,
            defaultFocusValue: "all",
            hideIndexes: hideIndexes,
            options: [
              { value: "all", label: "Remove them all" },
              { value: "pick", label: "Pick which to remove" },
              { value: "leave", label: "Leave them" },
            ],
            onChange: (so) => {
              if ((noteAttempt(), so === "all")) onResolve(flagged);
              else if (so === "pick") {
                if (onPickingChange(!0) === !1) return;
                rt(!0);
              } else onResolve([]);
            },
            onCancel: io,
          },
          ze.remountKey,
        ),
      ],
    }),
  });
}
//@ chunk-18hwfzwa.js:1314841-1314845 placement
j();
//@ chunk-18hwfzwa.js:1314845-1314876 placement
function QDo(kt) {
  return replaceLineBreaks(kt);
}
//@ chunk-18hwfzwa.js:1314876-1317648 placement
function AutoModeSetupReview(h) {
  let $ = w(49),
    {
      proposal: proposal,
      hideIndexes: hideIndexes,
      defaultFocusValue: defaultFocusValue,
      onFocus: onFocus,
      onAccept: onAccept,
      onDecline: onDecline,
      onCancel: onCancel,
    } = h,
    { epoch: epoch, noteAttempt: noteAttempt } = jnn(),
    ze = settleKey(epoch, So),
    rt;
  if ($[0] !== ze.settled || $[1] !== noteAttempt)
    ((rt = function kt() {
      if (!ze.settled) {
        return (noteAttempt(), !0);
      }
      return !1;
    }),
      ($[0] = ze.settled),
      ($[1] = noteAttempt),
      ($[2] = rt));
  else rt = $[2];
  let kt = rt,
    At = defaultFocusValue === "decline" && !ze.settled,
    It = R(!1),
    Ot;
  if ($[3] === MEMO_CACHE_SENTINEL)
    ((Ot = r(Byline, {
      children: [
        e(KeyboardShortcutHint, { chord: "enter", action: "confirm" }),
        e(KeyboardShortcutHint, { chord: "escape", action: "cancel" }),
      ],
    })),
      ($[3] = Ot));
  else Ot = $[3];
  let Et;
  if ($[4] !== proposal.environment)
    ((Et = e(ReviewEntrySection, { label: "Environment", entries: proposal.environment, headers: !0 })),
      ($[4] = proposal.environment),
      ($[5] = Et));
  else Et = $[5];
  let Dt;
  if ($[6] !== proposal.allow) ((Dt = sF(proposal.allow)), ($[6] = proposal.allow), ($[7] = Dt));
  else Dt = $[7];
  let Lt;
  if ($[8] !== Dt)
    ((Lt = e(ReviewEntrySection, {
      label: "Allow carve-outs",
      entries: Dt,
      empty: "none suggested \u2014 defaults look like they cover your usage",
    })),
      ($[8] = Dt),
      ($[9] = Lt));
  else Lt = $[9];
  let oo;
  if ($[10] !== proposal.soft_deny)
    ((oo = sF(proposal.soft_deny)), ($[10] = proposal.soft_deny), ($[11] = oo));
  else oo = $[11];
  let Xt;
  if ($[12] !== oo)
    ((Xt = e(ReviewEntrySection, { label: "Extra soft blocks", entries: oo, empty: "none suggested" })),
      ($[12] = oo),
      ($[13] = Xt));
  else Xt = $[13];
  let io;
  if ($[14] !== proposal.hard_deny)
    ((io = sF(proposal.hard_deny)), ($[14] = proposal.hard_deny), ($[15] = io));
  else io = $[15];
  let so;
  if ($[16] !== io)
    ((so = e(ReviewEntrySection, { label: "Extra hard blocks", entries: io, empty: "none suggested" })),
      ($[16] = io),
      ($[17] = so));
  else so = $[17];
  let po;
  if ($[18] !== proposal.notes)
    ((po = e(ReviewEntrySection, { label: "Notes", entries: proposal.notes, empty: "none", dim: !0 })),
      ($[18] = proposal.notes),
      ($[19] = po));
  else po = $[19];
  const ao = At ? "held" : "settled";
  let co;
  if ($[20] === MEMO_CACHE_SENTINEL)
    ((co = [
      { value: "accept", label: "Looks good \u2014 save it" },
      { value: "decline", label: "Discard and exit" },
    ]),
      ($[20] = co));
  else co = $[20];
  let bo;
  if ($[21] !== At || $[22] !== onFocus)
    ((bo = (Ao) => {
      if (At) {
        return;
      }
      if (!It.current) {
        It.current = !0;
        return;
      }
      onFocus?.(Ao);
    }),
      ($[21] = At),
      ($[22] = onFocus),
      ($[23] = bo));
  else bo = $[23];
  let Bo;
  if ($[24] !== noteAttempt || $[25] !== onAccept || $[26] !== onDecline)
    ((Bo = (Ro) => {
      if ((noteAttempt(), Ro === "accept")) onAccept();
      else onDecline();
    }),
      ($[24] = noteAttempt),
      ($[25] = onAccept),
      ($[26] = onDecline),
      ($[27] = Bo));
  else Bo = $[27];
  let Ho;
  if ($[28] !== noteAttempt || $[29] !== onCancel)
    ((Ho = () => {
      (noteAttempt(), onCancel());
    }),
      ($[28] = noteAttempt),
      ($[29] = onCancel),
      ($[30] = Ho));
  else Ho = $[30];
  let Io;
  if (
    $[31] !== defaultFocusValue ||
    $[32] !== hideIndexes ||
    $[33] !== kt ||
    $[34] !== ao ||
    $[35] !== bo ||
    $[36] !== Bo ||
    $[37] !== Ho
  )
    ((Io = e(
      ModelSelector,
      {
        refuseInput: kt,
        selectedValue: NO_COMMITTED_ROW,
        options: co,
        hideIndexes: hideIndexes,
        defaultFocusValue: defaultFocusValue,
        onFocus: bo,
        onChange: Bo,
        onCancel: Ho,
      },
      ao,
    )),
      ($[31] = defaultFocusValue),
      ($[32] = hideIndexes),
      ($[33] = kt),
      ($[34] = ao),
      ($[35] = bo),
      ($[36] = Bo),
      ($[37] = Ho),
      ($[38] = Io));
  else Io = $[38];
  let Wo;
  if ($[39] !== po || $[40] !== Io || $[41] !== Et || $[42] !== Lt || $[43] !== Xt || $[44] !== so)
    ((Wo = r(Box, { flexDirection: "column", gap: 1, children: [Et, Lt, Xt, so, po, Io] })),
      ($[39] = po),
      ($[40] = Io),
      ($[41] = Et),
      ($[42] = Lt),
      ($[43] = Xt),
      ($[44] = so),
      ($[45] = Wo));
  else Wo = $[45];
  let mn;
  if ($[46] !== onCancel || $[47] !== Wo)
    ((mn = e(Dialog, {
      title: "Review proposed auto-mode setup",
      onCancel: onCancel,
      inputGuide: Ot,
      children: Wo,
    })),
      ($[46] = onCancel),
      ($[47] = Wo),
      ($[48] = mn));
  else mn = $[48];
  return mn;
}
/**
 * auto 模式设置审阅中的一节：粗体标题 + 条目列表（### 开头视为小标题），空时显示 "nothing found"。
 */
//@ chunk-18hwfzwa.js:1317648-1318281 placement
function ReviewEntrySection(h) {
  let $ = w(10),
    { label: label, entries: entries, empty: empty, dim: dim, headers: headers } = h,
    Be;
  if ($[0] !== label) ((Be = e(Text, { bold: !0, children: label })), ($[0] = label), ($[1] = Be));
  else Be = $[1];
  let He;
  if ($[2] !== dim || $[3] !== empty || $[4] !== entries || $[5] !== headers)
    ((He =
      entries.length === 0
        ? r(Text, { dimColor: !0, children: [" ", empty ?? "nothing found"] })
        : entries.map((We, ze) => {
            let Xe = QDo;
            return headers && We.startsWith("### ")
              ? r(Text, { dimColor: !0, children: ["  ", Xe(We.slice(4))] }, ze)
              : r(Text, { dimColor: dim, children: ["  \xB7 ", Xe(We)] }, ze);
          })),
      ($[2] = dim),
      ($[3] = empty),
      ($[4] = entries),
      ($[5] = headers),
      ($[6] = He));
  else He = $[6];
  let rt;
  if ($[7] !== Be || $[8] !== He)
    ((rt = r(Box, { flexDirection: "column", children: [Be, He] })), ($[7] = Be), ($[8] = He), ($[9] = rt));
  else rt = $[9];
  return rt;
}
//@ chunk-18hwfzwa.js:1318281-1318334 placement
function sF(h) {
  return h.filter((x) => x !== "$defaults");
}
//@ chunk-18hwfzwa.js:1318334-1318361 placement
function iOo() {
  return null;
}
//@ chunk-18hwfzwa.js:1318361-1318388 placement
function aOo() {
  return null;
}
//@ chunk-18hwfzwa.js:1318388-1318640 placement
function useThrottledRun() {
  let $ = w(4),
    h = useClock(),
    D;
  if ($[0] !== h) ((D = h.now()), ($[0] = h), ($[1] = D));
  else D = $[1];
  let L = R(D),
    ee;
  if ($[2] !== h)
    ((ee = (ke) => {
      let now = h.now();
      let Be = L.current;
      if (((L.current = Math.max(now, Be)), now - Be < So)) {
        return !1;
      }
      return (ke(), !0);
    }),
      ($[2] = h),
      ($[3] = ee));
  else ee = $[3];
  return ee;
}
//@ chunk-18hwfzwa.js:1318640-1318693 placement
class Dft {
  reviewFocus = createStore(null);
  flaggedStash = createStore(null);
}
//@ chunk-18hwfzwa.js:1318693-1318720 placement
var W7 = new SessionRootSlot(() => new Dft());
//@ chunk-18hwfzwa.js:1318720-1319583 placement
function autoModeSetupReviewDialog(h) {
  let $ = w(18),
    { payload: payload, answer: answer } = h,
    L = useThrottledRun(),
    { reviewFocus: reviewFocus } = W7.of(useSession()),
    ke = yt(reviewFocus.subscribe, reviewFocus.getState),
    Be;
  if ($[0] !== answer || $[1] !== reviewFocus)
    ((Be = (He) => {
      if (answer(He) === !1) {
        return;
      }
      reviewFocus.setState(iOo);
    }),
      ($[0] = answer),
      ($[1] = reviewFocus),
      ($[2] = Be));
  else Be = $[2];
  let We = Be;
  const ze = ke ?? void 0;
  let Xe;
  if ($[3] !== reviewFocus)
    ((Xe = (rt) => reviewFocus.setState(() => rt)), ($[3] = reviewFocus), ($[4] = Xe));
  else Xe = $[4];
  let kt, At;
  if ($[5] !== L || $[6] !== We)
    ((kt = () => L(() => We("accept"))),
      (At = () => L(() => We("decline"))),
      ($[5] = L),
      ($[6] = We),
      ($[7] = kt),
      ($[8] = At));
  else ((kt = $[7]), (At = $[8]));
  let It;
  if ($[9] !== We) ((It = () => We("cancelled")), ($[9] = We), ($[10] = It));
  else It = $[10];
  let Ot;
  if ($[11] !== payload || $[12] !== ze || $[13] !== Xe || $[14] !== kt || $[15] !== At || $[16] !== It)
    ((Ot = e(AutoModeSetupReview, {
      proposal: payload,
      hideIndexes: !0,
      defaultFocusValue: ze,
      onFocus: Xe,
      onAccept: kt,
      onDecline: At,
      onCancel: It,
    })),
      ($[11] = payload),
      ($[12] = ze),
      ($[13] = Xe),
      ($[14] = kt),
      ($[15] = At),
      ($[16] = It),
      ($[17] = Ot));
  else Ot = $[17];
  return Ot;
}
//@ chunk-18hwfzwa.js:1319583-1320919 placement
function autoModeSetupFlaggedDialog(h) {
  let $ = w(27),
    { payload: payload, answer: answer } = h,
    L = useThrottledRun(),
    { flaggedStash: flaggedStash } = W7.of(useSession()),
    runId = payload.runId,
    Re = yt(flaggedStash.subscribe, flaggedStash.getState),
    He;
  if ($[0] !== runId || $[1] !== Re)
    ((He = Re?.key === runId ? Re : { key: runId, picking: !1, selection: [] }),
      ($[0] = runId),
      ($[1] = Re),
      ($[2] = He));
  else He = $[2];
  let We = He,
    ze;
  if ($[3] !== answer || $[4] !== flaggedStash)
    ((ze = (Xe) => {
      if (answer(Xe) === !1) {
        return;
      }
      flaggedStash.setState(aOo);
    }),
      ($[3] = answer),
      ($[4] = flaggedStash),
      ($[5] = ze));
  else ze = $[5];
  let rt = ze,
    kt;
  if ($[6] !== flaggedStash || $[7] !== L || $[8] !== runId || $[9] !== We)
    ((kt = (At) =>
      L(() => {
        flaggedStash.setState((It) => ({ ...(It?.key === runId ? It : We), picking: At }));
      })),
      ($[6] = flaggedStash),
      ($[7] = L),
      ($[8] = runId),
      ($[9] = We),
      ($[10] = kt));
  else kt = $[10];
  let Ot;
  if ($[11] !== flaggedStash || $[12] !== runId || $[13] !== We)
    ((Ot = (Et) => {
      flaggedStash.setState((Dt) => ({ ...(Dt?.key === runId ? Dt : We), selection: Et }));
    }),
      ($[11] = flaggedStash),
      ($[12] = runId),
      ($[13] = We),
      ($[14] = Ot));
  else Ot = $[14];
  let Lt, oo;
  if ($[15] !== L || $[16] !== rt)
    ((Lt = (Xt) => L(() => rt({ toRemove: Xt }))),
      (oo = () => L(() => rt("cancelled"))),
      ($[15] = L),
      ($[16] = rt),
      ($[17] = Lt),
      ($[18] = oo));
  else ((Lt = $[17]), (oo = $[18]));
  let io;
  if (
    $[19] !== payload.flagged ||
    $[20] !== We.picking ||
    $[21] !== We.selection ||
    $[22] !== kt ||
    $[23] !== Ot ||
    $[24] !== Lt ||
    $[25] !== oo
  )
    ((io = e(AutoModeSetupFlaggedPicker, {
      hideIndexes: !0,
      flagged: payload.flagged,
      initialPicking: We.picking,
      onPickingChange: kt,
      initialSelection: We.selection,
      onSelectionChange: Ot,
      onResolve: Lt,
      onCancel: oo,
    })),
      ($[19] = payload.flagged),
      ($[20] = We.picking),
      ($[21] = We.selection),
      ($[22] = kt),
      ($[23] = Ot),
      ($[24] = Lt),
      ($[25] = oo),
      ($[26] = io));
  else io = $[26];
  return io;
}
//@ chunk-18hwfzwa.js:1320919-1320936 placement
var Oft = 8,
  ox = 160;

export {
  ox,
  Oft,
  autoModeSetupReviewDialog,
  autoModeSetupFlaggedDialog,
  AutoModeSetupReview,
  AutoModeSetupFlaggedPicker,
};
