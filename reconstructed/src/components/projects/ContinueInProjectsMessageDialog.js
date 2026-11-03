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
import { init_react_production, y, P } from "../../../vendor/react/cjs/react.production.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useInputRefusalWindow, useMountTime, useRefusalTracker } from "../CustomSelect/selectTypeahead.js";
import { DECAY_TICK_MS } from "../ResumeStaleConversationDialog.js";
import { useRefusableAnswer } from "../../hooks/useRefusableAnswer.js";
import { useTerminalSize } from "../../hooks/useTerminalSize.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { messageTitle, MESSAGE_REVEAL_NOTICE } from "./messageRevealConfirm.js";
import {
  wrapTextToWidth,
  wrapCardText,
  countItemsFittingRows,
  ProjectProposalCard,
} from "./ProjectProposalCard.js";
import { MESSAGE_DISCLOSURE } from "../../tools/ContinueInProjectsTool/ContinueInProjectsTool.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { ModelSelector } from "../agents/ModelSelector.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-kv464nx7.js:14087-14091 placement
init_react_production();
//@ chunk-kv464nx7.js:14091-14148 placement
function renderDimText(Ne) {
  return jsxProd_default(
    Text,
    {
      dimColor: true,
      children: Ne,
    },
    Ne,
  );
}
//@ chunk-kv464nx7.js:14148-14255 placement
var MIN_DIALOG_ROWS = 6;
var BULLET_GAP = 11;
var RESERVED_ROWS = 20;
var TERMINAL_TOO_SMALL_MESSAGE = "Make this terminal larger to read and send it.";
var CLOSE_ONLY_OPTIONS = [
  {
    label: "Close",
    value: "cancel",
  },
];
//@ chunk-kv464nx7.js:14255-17317 placement
/**
 * 发送到 Claude 项目前的消息编辑/确认对话框。
 */
function ContinueInProjectsMessageDialog(props) {
  let o = w(69);
  let { payload, answer } = props;
  let inputRefusalWindow = useInputRefusalWindow();
  let inputRefusalWindow_2 = useInputRefusalWindow(DECAY_TICK_MS);
  let openedAt = useMountTime();
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let [Te, Ye] = y(false);
  let Re;
  if (o[0] !== answer) {
    Re = (choice) =>
      answer({
        choice,
      });
    o[0] = answer;
    o[1] = Re;
  } else Re = o[1];
  let refusableAnswer = useRefusableAnswer(Re);
  let { columns, rows } = useTerminalSize();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let h = isScreenReaderEnabled ? columns : null;
  let proposal;
  let ge;
  let xe;
  let B;
  let i;
  if (o[2] !== columns || o[3] !== payload || o[4] !== rows) {
    B = messageTitle(payload.projectName, payload.creates);
    i = Math.max(columns - MIN_DIALOG_ROWS, RESERVED_ROWS);
    let M;
    if (o[10] !== payload.message) {
      M = {
        summary: payload.message,
      };
      o[10] = payload.message;
      o[11] = M;
    } else M = o[11];
    proposal = M;
    ge = rows - BULLET_GAP;
    let I;
    if (o[12] !== i) {
      I = (Ue, _e) => Ue + wrapTextToWidth(_e, i).length;
      o[12] = i;
      o[13] = I;
    } else I = o[13];
    xe = [B, ...MESSAGE_DISCLOSURE].reduce(I, 0);
    o[2] = columns;
    o[3] = payload;
    o[4] = rows;
    o[5] = proposal;
    o[6] = ge;
    o[7] = xe;
    o[8] = B;
    o[9] = i;
  } else {
    proposal = o[5];
    ge = o[6];
    xe = o[7];
    B = o[8];
    i = o[9];
  }
  let ke = ge - xe;
  let max = Math.max(1, ke);
  let ne;
  let M;
  if (o[14] !== max || o[15] !== payload.message || o[16] !== h || o[17] !== i) {
    ne = wrapCardText(payload.message, i);
    M = countItemsFittingRows(ne, max, h);
    o[14] = max;
    o[15] = payload.message;
    o[16] = h;
    o[17] = i;
    o[18] = ne;
    o[19] = M;
  } else {
    ne = o[18];
    M = o[19];
  }
  let q = M < ne.length;
  let t = ke < 1 || columns - MIN_DIALOG_ROWS < RESERVED_ROWS || q;
  let [u, Ee] = y(t);
  if (t && !u) Ee(true);
  let I;
  let Be;
  if (o[20] !== u || o[21] !== t || o[22] !== noteRefused) {
    I = () => {
      if (!t && u) noteRefused();
    };
    Be = [t, u, noteRefused];
    o[20] = u;
    o[21] = t;
    o[22] = noteRefused;
    o[23] = I;
    o[24] = Be;
  } else {
    I = o[23];
    Be = o[24];
  }
  P(I, Be);
  let z = Te && !t;
  let Pe;
  if (
    o[25] !== inputRefusalWindow ||
    o[26] !== inputRefusalWindow_2 ||
    o[27] !== noteRefused ||
    o[28] !== refusedWithin
  ) {
    Pe = function l(eo) {
      if (!(eo === "send" ? inputRefusalWindow_2() : inputRefusalWindow()) && !refusedWithin()) {
        return false;
      }
      noteRefused();
      return true;
    };
    o[25] = inputRefusalWindow;
    o[26] = inputRefusalWindow_2;
    o[27] = noteRefused;
    o[28] = refusedWithin;
    o[29] = Pe;
  } else Pe = o[29];
  let l = Pe;
  let je;
  if (o[30] !== refusableAnswer || o[31] !== l) {
    je = function g(V) {
      if (l(V)) {
        Ye(V === "send");
        refusableAnswer.refuse(V);
        return;
      }
      refusableAnswer.answer(V);
    };
    o[30] = refusableAnswer;
    o[31] = l;
    o[32] = je;
  } else je = o[32];
  let g = je;
  let Me;
  if (o[33] !== answer || o[34] !== l) {
    Me = function f() {
      if (!l("cancel"))
        answer({
          choice: "cancel",
        });
    };
    o[33] = answer;
    o[34] = l;
    o[35] = Me;
  } else Me = o[35];
  let onCancel = Me;
  const existingProject = !payload.creates;
  let X;
  if (o[36] !== max || o[37] !== proposal || o[38] !== h || o[39] !== existingProject || o[40] !== i) {
    X = jsxProd_default(ProjectProposalCard, {
      proposal,
      proposalBytes: 0,
      existingProject,
      width: i,
      maxRows: max,
      marginTop: 0,
      transcriptChord: "",
      screenReaderColumns: h,
      messageFrom: "typed",
    });
    o[36] = max;
    o[37] = proposal;
    o[38] = h;
    o[39] = existingProject;
    o[40] = i;
    o[41] = X;
  } else X = o[41];
  let Z;
  if (o[42] !== t || o[43] !== q) {
    Z =
      t && !q
        ? jsxProd_default(Text, {
            color: "warning",
            children: TERMINAL_TOO_SMALL_MESSAGE,
          })
        : null;
    o[42] = t;
    o[43] = q;
    o[44] = Z;
  } else Z = o[44];
  let Ie;
  if (o[45] === MEMO_CACHE_SENTINEL) {
    Ie = MESSAGE_DISCLOSURE.map(renderDimText);
    o[45] = Ie;
  } else Ie = o[45];
  let G;
  if (o[46] !== z || o[47] !== isScreenReaderEnabled) {
    G =
      z || !isScreenReaderEnabled
        ? jsxProd_default(Text, {
            dimColor: true,
            children: z ? MESSAGE_REVEAL_NOTICE : " ",
          })
        : null;
    o[46] = z;
    o[47] = isScreenReaderEnabled;
    o[48] = G;
  } else G = o[48];
  let H;
  if (
    o[49] !== onCancel ||
    o[50] !== u ||
    o[51] !== t ||
    o[52] !== openedAt ||
    o[53] !== g ||
    o[54] !== refusableAnswer.attempts ||
    o[55] !== refusableAnswer.refused ||
    o[56] !== l
  ) {
    H = t
      ? jsxProd_default(
          ModelSelector,
          {
            hideIndexes: true,
            options: [...CLOSE_ONLY_OPTIONS],
            onChange: () => g("cancel"),
            onCancel,
          },
          refusableAnswer.attempts,
        )
      : jsxProd_default(
          ConfirmSelect,
          {
            refuseInput: () => l("send"),
            openedAt,
            windowMs: DECAY_TICK_MS,
            focus: u || refusableAnswer.refused === "cancel" ? "cancel" : "confirm",
            confirmLabel: "Send",
            cancelLabel: "No",
            onConfirm: () => g("send"),
            onCancel: () => g("cancel"),
          },
          refusableAnswer.attempts,
        );
    o[49] = onCancel;
    o[50] = u;
    o[51] = t;
    o[52] = openedAt;
    o[53] = g;
    o[54] = refusableAnswer.attempts;
    o[55] = refusableAnswer.refused;
    o[56] = l;
    o[57] = H;
  } else H = o[57];
  let J;
  if (o[58] !== G || o[59] !== H) {
    J = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [Ie, G, H],
    });
    o[58] = G;
    o[59] = H;
    o[60] = J;
  } else J = o[60];
  let children;
  if (o[61] !== X || o[62] !== Z || o[63] !== J) {
    children = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [X, Z, J],
    });
    o[61] = X;
    o[62] = Z;
    o[63] = J;
    o[64] = children;
  } else children = o[64];
  let be;
  if (o[65] !== onCancel || o[66] !== children || o[67] !== B) {
    be = jsxProd_default(Dialog, {
      title: B,
      onCancel,
      color: "suggestion",
      children,
    });
    o[65] = onCancel;
    o[66] = children;
    o[67] = B;
    o[68] = be;
  } else be = o[68];
  return be;
}
