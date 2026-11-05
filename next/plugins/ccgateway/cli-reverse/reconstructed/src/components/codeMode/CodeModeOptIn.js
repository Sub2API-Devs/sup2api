/**
 * components/codeMode/CodeModeOptIn.tsx
 *
 * Code 模式一次性征询对话框与重启流程（接受/拒绝、重启进模式或退出）（2.1.318 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-js21vjmb.js (5)
 * attribution: placement 5
 */
import {
  init_react_production,
  useState,
  useEffect,
  useRef,
} from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useApp } from "../../ink/components/Input.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { CODE_MODE_LABEL, CODE_MODE_EXPERIMENTAL_LABEL } from "../../constants/codeMode.js";
import { answerCodeModeOptInDialog } from "../../utils/codeModeOptIn.js";
import { isShuttingDown } from "../../utils/gracefulShutdown.js";
import { Byline } from "../design-system/Byline.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";
import { ConfigurableShortcutHint } from "../ConfigurableShortcutHint.js";
import { ConfirmSelect, CONFIRM_ARM_DELAY_MS } from "../design-system/ConfirmSelect.js";
import { Dialog } from "../design-system/Dialog.js";

//@ chunk-js21vjmb.js:15244-15248 placement
init_react_production();
//@ chunk-js21vjmb.js:15248-15309 placement
function relaunchInCurrentBinary(app) {
  return app.execRelaunch({
    pinToCurrentBinary: true,
  });
}
//@ chunk-js21vjmb.js:15309-15366 placement
function logOptInDialogShown() {
  logEvent("tengu_repl_mode_opt_in_dialog_shown", {});
}
//@ chunk-js21vjmb.js:15366-16018 placement
/**
 * Code 模式征询对话框的容器：按步骤显示重启中提示或弹出征询，接受后重启。
 */
function CodeModeOptInFlow(props) {
  let $ = useMemoCache(7);
  let { step, onStartWithout, storageV5 } = props;
  let [stepValue, setStep] = useState(step);
  let { exit } = useApp();
  let exitAndRelaunch;
  if ($[0] !== exit) {
    exitAndRelaunch = () => {
      exit();
      import("../../utils/relaunch.js").then(relaunchInCurrentBinary);
    };
    $[0] = exit;
    $[1] = exitAndRelaunch;
  } else exitAndRelaunch = $[1];
  useTimeout(exitAndRelaunch, stepValue === "ask" ? null : 250);
  if (stepValue === "restart_into_mode") {
    let restartingIntoModeText;
    if ($[2] === MEMO_CACHE_SENTINEL) {
      restartingIntoModeText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Restarting Claude Code in ", CODE_MODE_LABEL, "\u2026"],
      });
      $[2] = restartingIntoModeText;
    } else restartingIntoModeText = $[2];
    return restartingIntoModeText;
  }
  if (stepValue === "restart_without_mode") {
    let restartingWithoutModeText;
    if ($[3] === MEMO_CACHE_SENTINEL) {
      restartingWithoutModeText = jsxProd_default_2(Text, {
        dimColor: true,
        children: ["Restarting Claude Code without ", CODE_MODE_LABEL, "\u2026"],
      });
      $[3] = restartingWithoutModeText;
    } else restartingWithoutModeText = $[3];
    return restartingWithoutModeText;
  }
  let optInDialog;
  if ($[4] !== onStartWithout || $[5] !== storageV5) {
    optInDialog = jsxProd_default(CodeModeOptInDialog, {
      onAnswer: (accepted) => {
        answerCodeModeOptInDialog(accepted, storageV5).then((nextStep) => {
          if (nextStep === "none") onStartWithout();
          else setStep(nextStep);
        });
      },
    });
    $[4] = onStartWithout;
    $[5] = storageV5;
    $[6] = optInDialog;
  } else optInDialog = $[6];
  return optInDialog;
}
//@ chunk-js21vjmb.js:16018-18109 placement
/**
 * Code 模式一次性征询正文：说明实验性、只能在该模式恢复、权限模式与自检差异，并给确认/取消。
 */
function CodeModeOptInDialog(props) {
  let $ = useMemoCache(13);
  let { onAnswer } = props;
  let shownDeps;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    shownDeps = [];
    $[0] = shownDeps;
  } else shownDeps = $[0];
  useEffect(logOptInDialogShown, shownDeps);
  let answeredRef = useRef(false);
  let answerOnce;
  if ($[1] !== onAnswer) {
    answerOnce = function onAnswerOnce(accepted) {
      if (answeredRef.current || isShuttingDown()) {
        return;
      }
      answeredRef.current = true;
      logEvent(
        accepted ? "tengu_repl_mode_opt_in_dialog_accept" : "tengu_repl_mode_opt_in_dialog_decline",
        {},
      );
      onAnswer(accepted);
    };
    $[1] = onAnswer;
    $[2] = answerOnce;
  } else answerOnce = $[2];
  let handleAnswer = answerOnce;
  let onCancel;
  if ($[3] !== handleAnswer) {
    onCancel = () => handleAnswer(false);
    $[3] = handleAnswer;
    $[4] = onCancel;
  } else onCancel = $[4];
  let inputGuide;
  if ($[5] === MEMO_CACHE_SENTINEL) {
    inputGuide = jsxProd_default_2(Byline, {
      children: [
        jsxProd_default(KeyboardShortcutHint, {
          chord: "enter",
          action: "confirm",
        }),
        jsxProd_default(ConfigurableShortcutHint, {
          action: "confirm:no",
          context: "Confirmation",
          fallback: "Esc",
          description: "start without it",
        }),
      ],
    });
    $[5] = inputGuide;
  } else inputGuide = $[5];
  let explanationText;
  if ($[6] === MEMO_CACHE_SENTINEL) {
    explanationText = jsxProd_default_2(Box, {
      flexDirection: "column",
      gap: 1,
      children: [
        jsxProd_default_2(Text, {
          children: [
            "In ",
            CODE_MODE_LABEL,
            ", Claude works by writing and running JavaScript that calls its tools, instead of calling them one at a time.",
          ],
        }),
        jsxProd_default(Text, {
          children:
            "This is an early experiment. It can behave differently from normal Claude Code, and it may change or be removed in any release.",
        }),
        jsxProd_default_2(Text, {
          bold: true,
          children: [
            "A session that you start in ",
            CODE_MODE_LABEL,
            " can be resumed only with ",
            CODE_MODE_LABEL,
            " on. If you turn",
            " ",
            CODE_MODE_LABEL,
            " off, turn it on again to resume the session. Where ",
            CODE_MODE_LABEL,
            " isn't available, the session can't be resumed: cloud sessions and the Claude apps can't continue it, and older versions of Claude Code may open it but not work properly in it.",
          ],
        }),
        jsxProd_default_2(Text, {
          children: [
            "Sessions start in the same permission mode as without",
            " ",
            CODE_MODE_LABEL,
            ", which can be auto mode where it's available. In auto mode, the safety check reads each piece of JavaScript once, before it runs. It doesn't check each tool call that the code then makes, so it can't see values that the code works out as it runs.",
          ],
        }),
      ],
    });
    $[6] = explanationText;
  } else explanationText = $[6];
  let confirmSelect;
  if ($[7] !== handleAnswer) {
    confirmSelect = jsxProd_default(ConfirmSelect, {
      hideIndexes: true,
      armAfterMs: CONFIRM_ARM_DELAY_MS,
      cancelFirst: true,
      focus: "cancel",
      confirmLabel: `Yes, turn on ${CODE_MODE_LABEL}`,
      cancelLabel: "No, start without it",
      onConfirm: () => handleAnswer(true),
      onCancel: () => handleAnswer(false),
    });
    $[7] = handleAnswer;
    $[8] = confirmSelect;
  } else confirmSelect = $[8];
  let feedbackHint;
  if ($[9] === MEMO_CACHE_SENTINEL) {
    feedbackHint = jsxProd_default(Text, {
      dimColor: true,
      children: "Tell us how it goes with /feedback",
    });
    $[9] = feedbackHint;
  } else feedbackHint = $[9];
  let dialog;
  if ($[10] !== onCancel || $[11] !== confirmSelect) {
    dialog = jsxProd_default_2(Dialog, {
      title: CODE_MODE_EXPERIMENTAL_LABEL,
      color: "warning",
      onCancel,
      exitOnCtrlCD: true,
      inputGuide,
      children: [explanationText, confirmSelect, feedbackHint],
    });
    $[10] = onCancel;
    $[11] = confirmSelect;
    $[12] = dialog;
  } else dialog = $[12];
  return dialog;
}
export { CodeModeOptInFlow };
