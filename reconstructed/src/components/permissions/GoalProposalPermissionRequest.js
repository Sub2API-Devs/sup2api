/**
 * components/permissions/GoalProposalPermissionRequest.tsx
 *
 * 2.1.316 新增。目标（goal）提议的确认。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (4)
 * attribution: placement 4
 */
import { j, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useMainLoopBusy } from "../LogoV2/Notices.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { useInputClock } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useRefusalTracker, useMountTime, settleKey } from "../CustomSelect/selectTypeahead.js";
import { isWithinRecentInput, So } from "../../hooks/useRecentInputGuard.js";
import { useExitOnCtrlCD } from "../../hooks/useExitOnCtrlCD.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { Pane } from "../design-system/Pane.js";
import { Box, Text } from "../../ink/components/Text.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { needsGutter } from "../../utils/permissions/approvalPayloadSerialization.js";
import { truncateWithNotice } from "../../utils/truncationNotice.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:1386191-1386195 placement
j();
//@ chunk-18hwfzwa.js:1386195-1386233 placement
function selectActiveGoal(Kn) {
  return Kn.activeGoal;
}
/**
 * GoalProposalPermissionRequest：模型提出目标（goal）时的确认界面。
 */
//@ chunk-18hwfzwa.js:1386233-1389938 placement
function GoalProposalPermissionRequest(h) {
  let $ = w(64),
    { payload: payload, answer: answer } = h,
    L = useAppState(selectActiveGoal),
    ee = useMainLoopBusy(),
    ke = stripNonPrintable(payload.condition),
    Re = useInputClock(),
    He;
  if ($[0] === MEMO_CACHE_SENTINEL) ((He = Date.now()), ($[0] = He));
  else He = $[0];
  let We = R(He),
    { refusedWithin: refusedWithin, noteRefused: noteRefused, epoch: epoch } = useRefusalTracker(),
    kt = useMountTime(),
    At;
  if ($[1] !== Re || $[2] !== noteRefused || $[3] !== refusedWithin)
    ((At = function It() {
      if (isWithinRecentInput(Re, We.current, So) || refusedWithin(So)) {
        return (noteRefused(), !0);
      }
      return !1;
    }),
      ($[1] = Re),
      ($[2] = noteRefused),
      ($[3] = refusedWithin),
      ($[4] = At));
  else At = $[4];
  let It = At,
    Ot;
  if ($[5] !== answer || $[6] !== It)
    ((Ot = function Dt(Et) {
      if (!It()) answer(Et);
    }),
      ($[5] = answer),
      ($[6] = It),
      ($[7] = Ot));
  else Ot = $[7];
  let Dt = Ot,
    Lt;
  if ($[8] !== answer) ((Lt = () => answer({ approved: !1, explicit: !0 })), ($[8] = answer), ($[9] = Lt));
  else Lt = $[9];
  let {
      handleInterrupt: handleInterrupt,
      handleExit: handleExit,
      exitState: exitState,
    } = useExitOnCtrlCD(void 0, Lt),
    so;
  if ($[10] !== handleInterrupt || $[11] !== It)
    ((so = () => {
      if (!It()) handleInterrupt();
    }),
      ($[10] = handleInterrupt),
      ($[11] = It),
      ($[12] = so));
  else so = $[12];
  let po;
  if ($[13] !== handleExit || $[14] !== It)
    ((po = () => {
      if (!It()) handleExit();
    }),
      ($[13] = handleExit),
      ($[14] = It),
      ($[15] = po));
  else po = $[15];
  let ao;
  if ($[16] !== so || $[17] !== po)
    ((ao = { "app:interrupt": so, "app:exit": po }), ($[16] = so), ($[17] = po), ($[18] = ao));
  else ao = $[18];
  let co;
  if ($[19] === MEMO_CACHE_SENTINEL) ((co = { context: "Global" }), ($[19] = co));
  else co = $[19];
  MessageActionsKeybindings(ao, co);
  let bo = settleKey(epoch, So);
  const Ao = Pane,
    Bo = "permission",
    Ro = Box,
    Ho = "column",
    Io = 1,
    Wo = Box,
    mn = "column";
  let Cn;
  if ($[20] === MEMO_CACHE_SENTINEL)
    ((Cn = e(Text, { bold: !0, color: "permission", children: "Claude proposes a goal" })), ($[20] = Cn));
  else Cn = $[20];
  const No = DiffFrame,
    vo = Blockquote,
    Yo = needsGutter(ke);
  let kn;
  if ($[21] !== ke) ((kn = e(Text, { children: ke })), ($[21] = ke), ($[22] = kn));
  else kn = $[22];
  let Fn;
  if ($[23] !== vo || $[24] !== Yo || $[25] !== kn)
    ((Fn = e(vo, { multiline: Yo, children: kn })), ($[23] = vo), ($[24] = Yo), ($[25] = kn), ($[26] = Fn));
  else Fn = $[26];
  let bn;
  if ($[27] !== No || $[28] !== Fn)
    ((bn = e(No, { children: Fn })), ($[27] = No), ($[28] = Fn), ($[29] = bn));
  else bn = $[29];
  let Go;
  if ($[30] !== Wo || $[31] !== Cn || $[32] !== bn)
    ((Go = r(Wo, { flexDirection: mn, children: [Cn, bn] })),
      ($[30] = Wo),
      ($[31] = Cn),
      ($[32] = bn),
      ($[33] = Go));
  else Go = $[33];
  const hn = ee
    ? "Claude continues with the current work while you decide."
    : "Claude has finished its current work \u2014 approving starts it working again, toward this goal. Esc dismisses without setting it.";
  let Mn;
  if ($[34] !== hn)
    ((Mn = r(Text, {
      dimColor: !0,
      children: [
        "Approving sets this as the session goal, like running /goal: after each turn a separate check decides whether the condition is met, and Claude keeps working until it is.",
        " ",
        hn,
      ],
    })),
      ($[34] = hn),
      ($[35] = Mn));
  else Mn = $[35];
  let Xo;
  if ($[36] !== L)
    ((Xo =
      L !== void 0 &&
      r(Text, {
        dimColor: !0,
        children: [
          "Approving replaces the current goal:",
          " ",
          truncateWithNotice(getFirstLine(L.condition), 200),
        ],
      })),
      ($[36] = L),
      ($[37] = Xo));
  else Xo = $[37];
  let Sn, $n;
  if ($[38] !== Dt)
    ((Sn = () => Dt({ approved: !0, explicit: !0 })),
      ($n = () => Dt({ approved: !1, explicit: !0 })),
      ($[38] = Dt),
      ($[39] = Sn),
      ($[40] = $n));
  else ((Sn = $[39]), ($n = $[40]));
  let on;
  if ($[41] !== bo.remountKey || $[42] !== It || $[43] !== kt || $[44] !== Sn || $[45] !== $n)
    ((on = e(
      ConfirmSelect,
      {
        refuseInput: It,
        openedAt: kt,
        confirmLabel: "Set this goal",
        cancelLabel: "Not now",
        hideIndexes: !0,
        disablePrintableKeybindings: !0,
        cancelFirst: !0,
        focus: "cancel",
        onConfirm: Sn,
        onCancel: $n,
        windowMs: So,
      },
      bo.remountKey,
    )),
      ($[41] = bo.remountKey),
      ($[42] = It),
      ($[43] = kt),
      ($[44] = Sn),
      ($[45] = $n),
      ($[46] = on));
  else on = $[46];
  let _o;
  if ($[47] !== exitState.keyName || $[48] !== exitState.pending)
    ((_o =
      exitState.pending &&
      r(Text, {
        dimColor: !0,
        wrap: "truncate",
        children: ["Press ", exitState.keyName, " again to dismiss this goal"],
      })),
      ($[47] = exitState.keyName),
      ($[48] = exitState.pending),
      ($[49] = _o));
  else _o = $[49];
  let cn;
  if ($[50] !== _o) ((cn = e(Box, { height: 1, children: _o })), ($[50] = _o), ($[51] = cn));
  else cn = $[51];
  let Dn;
  if ($[52] !== on || $[53] !== cn)
    ((Dn = r(Box, { flexDirection: "column", children: [on, cn] })),
      ($[52] = on),
      ($[53] = cn),
      ($[54] = Dn));
  else Dn = $[54];
  let wn;
  if ($[55] !== Ro || $[56] !== Go || $[57] !== Mn || $[58] !== Xo || $[59] !== Dn)
    ((wn = r(Ro, { flexDirection: Ho, gap: Io, children: [Go, Mn, Xo, Dn] })),
      ($[55] = Ro),
      ($[56] = Go),
      ($[57] = Mn),
      ($[58] = Xo),
      ($[59] = Dn),
      ($[60] = wn));
  else wn = $[60];
  let mr;
  if ($[61] !== Ao || $[62] !== wn)
    ((mr = e(Ao, { color: Bo, children: wn })), ($[61] = Ao), ($[62] = wn), ($[63] = mr));
  else mr = $[63];
  return mr;
}
//@ chunk-18hwfzwa.js:1389938-1389942 placement
j();

export { GoalProposalPermissionRequest };
