/**
 * components/projects/ContinueInProjectsMessageDialog.tsx
 *
 * 2.1.316 新增：发送到 Claude 项目前的消息编辑/确认对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-kv464nx7.js (4)
 * attribution: placement 4
 */
import { j, y, P } from "../../../vendor/react/cjs/react.production.js";
import { e, r } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputRefusalWindow, useMountTime, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { aWe } from "../ResumeStaleConversationDialog.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { messageTitle, MESSAGE_REVEAL_NOTICE } from "./messageRevealConfirm.js";
import { wrapTextToWidth, xpt, countItemsFittingRows, ProjectProposalCard } from "./ProjectProposalCard.js";
import { MESSAGE_DISCLOSURE } from "../../tools/ContinueInProjectsTool/ContinueInProjectsTool.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-kv464nx7.js:14087-14091 placement
j();
//@ chunk-kv464nx7.js:14091-14148 placement
function Ke(Ne) {
  return e(Text, { dimColor: !0, children: Ne }, Ne);
}
//@ chunk-kv464nx7.js:14148-14255 placement
var MIN_DIALOG_ROWS = 6,
  ce = 11,
  N = 20,
  TERMINAL_TOO_SMALL_MESSAGE = "Make this terminal larger to read and send it.",
  CLOSE_ONLY_OPTIONS = [{ label: "Close", value: "cancel" }];
/**
 * 发送到 Claude 项目前的消息编辑/确认对话框。
 */
//@ chunk-kv464nx7.js:14255-17317 placement
function ContinueInProjectsMessageDialog(Le) {
  let o = w(69),
    { payload: payload, answer: answer } = Le,
    E = useInputRefusalWindow(),
    ee = useInputRefusalWindow(aWe),
    oe = useMountTime(),
    { refusedWithin: refusedWithin, noteRefused: noteRefused } = useRefusalTracker(),
    [Te, Ye] = y(!1),
    Re;
  if (o[0] !== answer) ((Re = (Oe) => answer({ choice: Oe })), (o[0] = answer), (o[1] = Re));
  else Re = o[1];
  let a = useRefusableAnswer(Re),
    { columns: columns, rows: rows } = useTerminalSize(),
    A = useIsScreenReaderEnabled(),
    h = A ? columns : null,
    W,
    ge,
    xe,
    B,
    i;
  if (o[2] !== columns || o[3] !== payload || o[4] !== rows) {
    B = messageTitle(payload.projectName, payload.creates);
    i = Math.max(columns - MIN_DIALOG_ROWS, N);
    let M;
    if (o[10] !== payload.message)
      ((M = { summary: payload.message }), (o[10] = payload.message), (o[11] = M));
    else M = o[11];
    W = M;
    ge = rows - ce;
    let I;
    if (o[12] !== i) ((I = (Ue, _e) => Ue + wrapTextToWidth(_e, i).length), (o[12] = i), (o[13] = I));
    else I = o[13];
    xe = [B, ...MESSAGE_DISCLOSURE].reduce(I, 0);
    ((o[2] = columns),
      (o[3] = payload),
      (o[4] = rows),
      (o[5] = W),
      (o[6] = ge),
      (o[7] = xe),
      (o[8] = B),
      (o[9] = i));
  } else ((W = o[5]), (ge = o[6]), (xe = o[7]), (B = o[8]), (i = o[9]));
  let ke = ge - xe,
    max = Math.max(1, ke),
    ne,
    M;
  if (o[14] !== max || o[15] !== payload.message || o[16] !== h || o[17] !== i)
    ((ne = xpt(payload.message, i)),
      (M = countItemsFittingRows(ne, max, h)),
      (o[14] = max),
      (o[15] = payload.message),
      (o[16] = h),
      (o[17] = i),
      (o[18] = ne),
      (o[19] = M));
  else ((ne = o[18]), (M = o[19]));
  let q = M < ne.length,
    t = ke < 1 || columns - MIN_DIALOG_ROWS < N || q,
    [u, Ee] = y(t);
  if (t && !u) Ee(!0);
  let I, Be;
  if (o[20] !== u || o[21] !== t || o[22] !== noteRefused)
    ((I = () => {
      if (!t && u) noteRefused();
    }),
      (Be = [t, u, noteRefused]),
      (o[20] = u),
      (o[21] = t),
      (o[22] = noteRefused),
      (o[23] = I),
      (o[24] = Be));
  else ((I = o[23]), (Be = o[24]));
  P(I, Be);
  let z = Te && !t,
    Pe;
  if (o[25] !== E || o[26] !== ee || o[27] !== noteRefused || o[28] !== refusedWithin)
    ((Pe = function l(eo) {
      if (!(eo === "send" ? ee() : E()) && !refusedWithin()) {
        return !1;
      }
      return (noteRefused(), !0);
    }),
      (o[25] = E),
      (o[26] = ee),
      (o[27] = noteRefused),
      (o[28] = refusedWithin),
      (o[29] = Pe));
  else Pe = o[29];
  let l = Pe,
    je;
  if (o[30] !== a || o[31] !== l)
    ((je = function g(V) {
      if (l(V)) {
        (Ye(V === "send"), a.refuse(V));
        return;
      }
      a.answer(V);
    }),
      (o[30] = a),
      (o[31] = l),
      (o[32] = je));
  else je = o[32];
  let g = je,
    Me;
  if (o[33] !== answer || o[34] !== l)
    ((Me = function f() {
      if (!l("cancel")) answer({ choice: "cancel" });
    }),
      (o[33] = answer),
      (o[34] = l),
      (o[35] = Me));
  else Me = o[35];
  let f = Me;
  const re = !payload.creates;
  let X;
  if (o[36] !== max || o[37] !== W || o[38] !== h || o[39] !== re || o[40] !== i)
    ((X = e(ProjectProposalCard, {
      proposal: W,
      proposalBytes: 0,
      existingProject: re,
      width: i,
      maxRows: max,
      marginTop: 0,
      transcriptChord: "",
      screenReaderColumns: h,
      messageFrom: "typed",
    })),
      (o[36] = max),
      (o[37] = W),
      (o[38] = h),
      (o[39] = re),
      (o[40] = i),
      (o[41] = X));
  else X = o[41];
  let Z;
  if (o[42] !== t || o[43] !== q)
    ((Z = t && !q ? e(Text, { color: "warning", children: TERMINAL_TOO_SMALL_MESSAGE }) : null),
      (o[42] = t),
      (o[43] = q),
      (o[44] = Z));
  else Z = o[44];
  let Ie;
  if (o[45] === MEMO_CACHE_SENTINEL) ((Ie = MESSAGE_DISCLOSURE.map(Ke)), (o[45] = Ie));
  else Ie = o[45];
  let G;
  if (o[46] !== z || o[47] !== A)
    ((G = z || !A ? e(Text, { dimColor: !0, children: z ? MESSAGE_REVEAL_NOTICE : " " }) : null),
      (o[46] = z),
      (o[47] = A),
      (o[48] = G));
  else G = o[48];
  let H;
  if (
    o[49] !== f ||
    o[50] !== u ||
    o[51] !== t ||
    o[52] !== oe ||
    o[53] !== g ||
    o[54] !== a.attempts ||
    o[55] !== a.refused ||
    o[56] !== l
  )
    ((H = t
      ? e(
          ModelSelector,
          { hideIndexes: !0, options: [...CLOSE_ONLY_OPTIONS], onChange: () => g("cancel"), onCancel: f },
          a.attempts,
        )
      : e(
          ConfirmSelect,
          {
            refuseInput: () => l("send"),
            openedAt: oe,
            windowMs: aWe,
            focus: u || a.refused === "cancel" ? "cancel" : "confirm",
            confirmLabel: "Send",
            cancelLabel: "No",
            onConfirm: () => g("send"),
            onCancel: () => g("cancel"),
          },
          a.attempts,
        )),
      (o[49] = f),
      (o[50] = u),
      (o[51] = t),
      (o[52] = oe),
      (o[53] = g),
      (o[54] = a.attempts),
      (o[55] = a.refused),
      (o[56] = l),
      (o[57] = H));
  else H = o[57];
  let J;
  if (o[58] !== G || o[59] !== H)
    ((J = r(Box, { flexDirection: "column", children: [Ie, G, H] })), (o[58] = G), (o[59] = H), (o[60] = J));
  else J = o[60];
  let K;
  if (o[61] !== X || o[62] !== Z || o[63] !== J)
    ((K = r(Box, { flexDirection: "column", gap: 1, children: [X, Z, J] })),
      (o[61] = X),
      (o[62] = Z),
      (o[63] = J),
      (o[64] = K));
  else K = o[64];
  let be;
  if (o[65] !== f || o[66] !== K || o[67] !== B)
    ((be = e(Dialog, { title: B, onCancel: f, color: "suggestion", children: K })),
      (o[65] = f),
      (o[66] = K),
      (o[67] = B),
      (o[68] = be));
  else be = o[68];
  return be;
}
