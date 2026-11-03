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
import { init_react_production, R } from "../../../vendor/react/cjs/react.production.js";
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useAppState } from "../../state/AppState.js";
import { useMainLoopBusy } from "../LogoV2/Notices.js";
import { stripNonPrintable } from "../../utils/truncateGraphemes.js";
import { useInputClock } from "../../ink/components/Input.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import { useRefusalTracker, useMountTime, settleKey } from "../CustomSelect/selectTypeahead.js";
import {
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3,
} from "../../hooks/useRecentInputGuard.js";
import { useExitOnCtrlCD } from "../../hooks/useExitOnCtrlCD.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { Pane } from "../design-system/Pane.js";
import { Box, Text } from "../../ink/components/Text.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { DiffFrame } from "../FileEditToolDiff.js";
import { Blockquote } from "../Blockquote.js";
import { needsGutter } from "../../utils/permissions/approvalPayloadSerialization.js";
import { truncateWithNotice } from "../../utils/truncationNotice.js";
import { getFirstLine } from "../../utils/stringUtils.js";
import { ConfirmSelect } from "../design-system/ConfirmSelect.js";

//@ chunk-18hwfzwa.js:1386191-1386195 placement
init_react_production();
//@ chunk-18hwfzwa.js:1386195-1386233 placement
function selectActiveGoal(Kn) {
  return Kn.activeGoal;
}
//@ chunk-18hwfzwa.js:1386233-1389938 placement
/**
 * GoalProposalPermissionRequest：模型提出目标（goal）时的确认界面。
 */
function GoalProposalPermissionRequest(props) {
  let $ = w(64);
  let { payload, answer } = props;
  let appState = useAppState(selectActiveGoal);
  let mainLoopBusy = useMainLoopBusy();
  let ke = stripNonPrintable(payload.condition);
  let inputClock = useInputClock();
  let He;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    He = Date.now();
    $[0] = He;
  } else He = $[0];
  let We = R(He);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let openedAt = useMountTime();
  let At;
  if ($[1] !== inputClock || $[2] !== noteRefused || $[3] !== refusedWithin) {
    At = function It() {
      if (
        isWithinRecentInput(inputClock, We.current, RECENT_INPUT_GUARD_MS_3) ||
        refusedWithin(RECENT_INPUT_GUARD_MS_3)
      ) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[1] = inputClock;
    $[2] = noteRefused;
    $[3] = refusedWithin;
    $[4] = At;
  } else At = $[4];
  let It = At;
  let Ot;
  if ($[5] !== answer || $[6] !== It) {
    Ot = function Dt(Et) {
      if (!It()) answer(Et);
    };
    $[5] = answer;
    $[6] = It;
    $[7] = Ot;
  } else Ot = $[7];
  let Dt = Ot;
  let Lt;
  if ($[8] !== answer) {
    Lt = () =>
      answer({
        approved: false,
        explicit: true,
      });
    $[8] = answer;
    $[9] = Lt;
  } else Lt = $[9];
  let { handleInterrupt, handleExit, exitState } = useExitOnCtrlCD(undefined, Lt);
  let so;
  if ($[10] !== handleInterrupt || $[11] !== It) {
    so = () => {
      if (!It()) handleInterrupt();
    };
    $[10] = handleInterrupt;
    $[11] = It;
    $[12] = so;
  } else so = $[12];
  let po;
  if ($[13] !== handleExit || $[14] !== It) {
    po = () => {
      if (!It()) handleExit();
    };
    $[13] = handleExit;
    $[14] = It;
    $[15] = po;
  } else po = $[15];
  let ao;
  if ($[16] !== so || $[17] !== po) {
    ao = {
      "app:interrupt": so,
      "app:exit": po,
    };
    $[16] = so;
    $[17] = po;
    $[18] = ao;
  } else ao = $[18];
  let co;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    co = {
      context: "Global",
    };
    $[19] = co;
  } else co = $[19];
  MessageActionsKeybindings(ao, co);
  let bo = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  const Ao = Pane;
  const color = "permission";
  const Ro = Box;
  const flexDirection = "column";
  const gap = 1;
  const Wo = Box;
  const flexDirection_2 = "column";
  let Cn;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    Cn = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "Claude proposes a goal",
    });
    $[20] = Cn;
  } else Cn = $[20];
  const No = DiffFrame;
  const vo = Blockquote;
  const multiline = needsGutter(ke);
  let children;
  if ($[21] !== ke) {
    children = jsxProd_default(Text, {
      children: ke,
    });
    $[21] = ke;
    $[22] = children;
  } else children = $[22];
  let children_2;
  if ($[23] !== vo || $[24] !== multiline || $[25] !== children) {
    children_2 = jsxProd_default(vo, {
      multiline,
      children,
    });
    $[23] = vo;
    $[24] = multiline;
    $[25] = children;
    $[26] = children_2;
  } else children_2 = $[26];
  let bn;
  if ($[27] !== No || $[28] !== children_2) {
    bn = jsxProd_default(No, {
      children: children_2,
    });
    $[27] = No;
    $[28] = children_2;
    $[29] = bn;
  } else bn = $[29];
  let Go;
  if ($[30] !== Wo || $[31] !== Cn || $[32] !== bn) {
    Go = jsxProd_default_2(Wo, {
      flexDirection: flexDirection_2,
      children: [Cn, bn],
    });
    $[30] = Wo;
    $[31] = Cn;
    $[32] = bn;
    $[33] = Go;
  } else Go = $[33];
  const hn = mainLoopBusy
    ? "Claude continues with the current work while you decide."
    : "Claude has finished its current work \u2014 approving starts it working again, toward this goal. Esc dismisses without setting it.";
  let Mn;
  if ($[34] !== hn) {
    Mn = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Approving sets this as the session goal, like running /goal: after each turn a separate check decides whether the condition is met, and Claude keeps working until it is.",
        " ",
        hn,
      ],
    });
    $[34] = hn;
    $[35] = Mn;
  } else Mn = $[35];
  let Xo;
  if ($[36] !== appState) {
    Xo =
      appState !== undefined &&
      jsxProd_default_2(Text, {
        dimColor: true,
        children: [
          "Approving replaces the current goal:",
          " ",
          truncateWithNotice(getFirstLine(appState.condition), 200),
        ],
      });
    $[36] = appState;
    $[37] = Xo;
  } else Xo = $[37];
  let onConfirm;
  let onCancel;
  if ($[38] !== Dt) {
    onConfirm = () =>
      Dt({
        approved: true,
        explicit: true,
      });
    onCancel = () =>
      Dt({
        approved: false,
        explicit: true,
      });
    $[38] = Dt;
    $[39] = onConfirm;
    $[40] = onCancel;
  } else {
    onConfirm = $[39];
    onCancel = $[40];
  }
  let on;
  if (
    $[41] !== bo.remountKey ||
    $[42] !== It ||
    $[43] !== openedAt ||
    $[44] !== onConfirm ||
    $[45] !== onCancel
  ) {
    on = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput: It,
        openedAt,
        confirmLabel: "Set this goal",
        cancelLabel: "Not now",
        hideIndexes: true,
        disablePrintableKeybindings: true,
        cancelFirst: true,
        focus: "cancel",
        onConfirm,
        onCancel,
        windowMs: RECENT_INPUT_GUARD_MS_3,
      },
      bo.remountKey,
    );
    $[41] = bo.remountKey;
    $[42] = It;
    $[43] = openedAt;
    $[44] = onConfirm;
    $[45] = onCancel;
    $[46] = on;
  } else on = $[46];
  let children_3;
  if ($[47] !== exitState.keyName || $[48] !== exitState.pending) {
    children_3 =
      exitState.pending &&
      jsxProd_default_2(Text, {
        dimColor: true,
        wrap: "truncate",
        children: ["Press ", exitState.keyName, " again to dismiss this goal"],
      });
    $[47] = exitState.keyName;
    $[48] = exitState.pending;
    $[49] = children_3;
  } else children_3 = $[49];
  let cn;
  if ($[50] !== children_3) {
    cn = jsxProd_default(Box, {
      height: 1,
      children: children_3,
    });
    $[50] = children_3;
    $[51] = cn;
  } else cn = $[51];
  let Dn;
  if ($[52] !== on || $[53] !== cn) {
    Dn = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [on, cn],
    });
    $[52] = on;
    $[53] = cn;
    $[54] = Dn;
  } else Dn = $[54];
  let children_4;
  if ($[55] !== Ro || $[56] !== Go || $[57] !== Mn || $[58] !== Xo || $[59] !== Dn) {
    children_4 = jsxProd_default_2(Ro, {
      flexDirection,
      gap,
      children: [Go, Mn, Xo, Dn],
    });
    $[55] = Ro;
    $[56] = Go;
    $[57] = Mn;
    $[58] = Xo;
    $[59] = Dn;
    $[60] = children_4;
  } else children_4 = $[60];
  let mr;
  if ($[61] !== Ao || $[62] !== children_4) {
    mr = jsxProd_default(Ao, {
      color,
      children: children_4,
    });
    $[61] = Ao;
    $[62] = children_4;
    $[63] = mr;
  } else mr = $[63];
  return mr;
}
//@ chunk-18hwfzwa.js:1389938-1389942 placement
init_react_production();
export { GoalProposalPermissionRequest };
