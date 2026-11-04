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
import { init_react_production, useRef } from "../../../vendor/react/cjs/react.production.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-18hwfzwa.js:1386191-1386195 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1386191", () => {
  init_react_production();
});
//@ chunk-18hwfzwa.js:1386195-1386233 placement
function selectActiveGoal(state) {
  return state.activeGoal;
}
//@ chunk-18hwfzwa.js:1386233-1389938 placement
/**
 * GoalProposalPermissionRequest：模型提出目标（goal）时的确认界面。
 */
function GoalProposalPermissionRequest(props) {
  let $ = useMemoCache(64);
  let { payload, answer } = props;
  let appState = useAppState(selectActiveGoal);
  let mainLoopBusy = useMainLoopBusy();
  let condition = stripNonPrintable(payload.condition);
  let inputClock = useInputClock();
  let now;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    now = Date.now();
    $[0] = now;
  } else now = $[0];
  let lastShownAt = useRef(now);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let openedAt = useMountTime();
  let refuseInput;
  if ($[1] !== inputClock || $[2] !== noteRefused || $[3] !== refusedWithin) {
    refuseInput = function shouldRefuseInput() {
      if (
        isWithinRecentInput(inputClock, lastShownAt.current, RECENT_INPUT_GUARD_MS_3) ||
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
    $[4] = refuseInput;
  } else refuseInput = $[4];
  let refuseInput_2 = refuseInput;
  let answerSafely;
  if ($[5] !== answer || $[6] !== refuseInput_2) {
    answerSafely = function answerSafelyImpl(result) {
      if (!refuseInput_2()) answer(result);
    };
    $[5] = answer;
    $[6] = refuseInput_2;
    $[7] = answerSafely;
  } else answerSafely = $[7];
  let answerSafelyStable = answerSafely;
  let onDismiss;
  if ($[8] !== answer) {
    onDismiss = () =>
      answer({
        approved: false,
        explicit: true,
      });
    $[8] = answer;
    $[9] = onDismiss;
  } else onDismiss = $[9];
  let { handleInterrupt, handleExit, exitState } = useExitOnCtrlCD(undefined, onDismiss);
  let onInterrupt;
  if ($[10] !== handleInterrupt || $[11] !== refuseInput_2) {
    onInterrupt = () => {
      if (!refuseInput_2()) handleInterrupt();
    };
    $[10] = handleInterrupt;
    $[11] = refuseInput_2;
    $[12] = onInterrupt;
  } else onInterrupt = $[12];
  let onExit;
  if ($[13] !== handleExit || $[14] !== refuseInput_2) {
    onExit = () => {
      if (!refuseInput_2()) handleExit();
    };
    $[13] = handleExit;
    $[14] = refuseInput_2;
    $[15] = onExit;
  } else onExit = $[15];
  let keyActions;
  if ($[16] !== onInterrupt || $[17] !== onExit) {
    keyActions = {
      "app:interrupt": onInterrupt,
      "app:exit": onExit,
    };
    $[16] = onInterrupt;
    $[17] = onExit;
    $[18] = keyActions;
  } else keyActions = $[18];
  let keyOptions;
  if ($[19] === MEMO_CACHE_SENTINEL) {
    keyOptions = {
      context: "Global",
    };
    $[19] = keyOptions;
  } else keyOptions = $[19];
  MessageActionsKeybindings(keyActions, keyOptions);
  let settle = settleKey(epoch, RECENT_INPUT_GUARD_MS_3);
  const PaneComponent = Pane;
  const color = "permission";
  const BoxComponent = Box;
  const flexDirection = "column";
  const gap = 1;
  const headerBox = Box;
  const flexDirection_2 = "column";
  let title;
  if ($[20] === MEMO_CACHE_SENTINEL) {
    title = jsxProd_default(Text, {
      bold: true,
      color: "permission",
      children: "Claude proposes a goal",
    });
    $[20] = title;
  } else title = $[20];
  const DiffFrameComponent = DiffFrame;
  const BlockquoteComponent = Blockquote;
  const multiline = needsGutter(condition);
  let children;
  if ($[21] !== condition) {
    children = jsxProd_default(Text, {
      children: condition,
    });
    $[21] = condition;
    $[22] = children;
  } else children = $[22];
  let children_2;
  if ($[23] !== BlockquoteComponent || $[24] !== multiline || $[25] !== children) {
    children_2 = jsxProd_default(BlockquoteComponent, {
      multiline,
      children,
    });
    $[23] = BlockquoteComponent;
    $[24] = multiline;
    $[25] = children;
    $[26] = children_2;
  } else children_2 = $[26];
  let framedCondition;
  if ($[27] !== DiffFrameComponent || $[28] !== children_2) {
    framedCondition = jsxProd_default(DiffFrameComponent, {
      children: children_2,
    });
    $[27] = DiffFrameComponent;
    $[28] = children_2;
    $[29] = framedCondition;
  } else framedCondition = $[29];
  let header;
  if ($[30] !== headerBox || $[31] !== title || $[32] !== framedCondition) {
    header = jsxProd_default_2(headerBox, {
      flexDirection: flexDirection_2,
      children: [title, framedCondition],
    });
    $[30] = headerBox;
    $[31] = title;
    $[32] = framedCondition;
    $[33] = header;
  } else header = $[33];
  const busyNote = mainLoopBusy
    ? "Claude continues with the current work while you decide."
    : "Claude has finished its current work \u2014 approving starts it working again, toward this goal. Esc dismisses without setting it.";
  let explainText;
  if ($[34] !== busyNote) {
    explainText = jsxProd_default_2(Text, {
      dimColor: true,
      children: [
        "Approving sets this as the session goal, like running /goal: after each turn a separate check decides whether the condition is met, and Claude keeps working until it is.",
        " ",
        busyNote,
      ],
    });
    $[34] = busyNote;
    $[35] = explainText;
  } else explainText = $[35];
  let replaceNotice;
  if ($[36] !== appState) {
    replaceNotice =
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
    $[37] = replaceNotice;
  } else replaceNotice = $[37];
  let onConfirm;
  let onCancel;
  if ($[38] !== answerSafelyStable) {
    onConfirm = () =>
      answerSafelyStable({
        approved: true,
        explicit: true,
      });
    onCancel = () =>
      answerSafelyStable({
        approved: false,
        explicit: true,
      });
    $[38] = answerSafelyStable;
    $[39] = onConfirm;
    $[40] = onCancel;
  } else {
    onConfirm = $[39];
    onCancel = $[40];
  }
  let selector;
  if (
    $[41] !== settle.remountKey ||
    $[42] !== refuseInput_2 ||
    $[43] !== openedAt ||
    $[44] !== onConfirm ||
    $[45] !== onCancel
  ) {
    selector = jsxProd_default(
      ConfirmSelect,
      {
        refuseInput: refuseInput_2,
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
      settle.remountKey,
    );
    $[41] = settle.remountKey;
    $[42] = refuseInput_2;
    $[43] = openedAt;
    $[44] = onConfirm;
    $[45] = onCancel;
    $[46] = selector;
  } else selector = $[46];
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
  let exitHintBox;
  if ($[50] !== children_3) {
    exitHintBox = jsxProd_default(Box, {
      height: 1,
      children: children_3,
    });
    $[50] = children_3;
    $[51] = exitHintBox;
  } else exitHintBox = $[51];
  let footerBox;
  if ($[52] !== selector || $[53] !== exitHintBox) {
    footerBox = jsxProd_default_2(Box, {
      flexDirection: "column",
      children: [selector, exitHintBox],
    });
    $[52] = selector;
    $[53] = exitHintBox;
    $[54] = footerBox;
  } else footerBox = $[54];
  let children_4;
  if (
    $[55] !== BoxComponent ||
    $[56] !== header ||
    $[57] !== explainText ||
    $[58] !== replaceNotice ||
    $[59] !== footerBox
  ) {
    children_4 = jsxProd_default_2(BoxComponent, {
      flexDirection,
      gap,
      children: [header, explainText, replaceNotice, footerBox],
    });
    $[55] = BoxComponent;
    $[56] = header;
    $[57] = explainText;
    $[58] = replaceNotice;
    $[59] = footerBox;
    $[60] = children_4;
  } else children_4 = $[60];
  let pane;
  if ($[61] !== PaneComponent || $[62] !== children_4) {
    pane = jsxProd_default(PaneComponent, {
      color,
      children: children_4,
    });
    $[61] = PaneComponent;
    $[62] = children_4;
    $[63] = pane;
  } else pane = $[63];
  return pane;
}
//@ chunk-18hwfzwa.js:1389938-1389942 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-18hwfzwa.js:1389938", () => {
  init_react_production();
});
export { GoalProposalPermissionRequest };
