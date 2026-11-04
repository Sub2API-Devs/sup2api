/**
 * components/permissions/useShellPermissionFeedback.ts
 *
 * Bash/PowerShell 权限对话框的反馈模式（accept/reject 时附加说明）状态与事件。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/permissions/useShellPermissionFeedback.ts
 * pieces: chunk-0e8j1zzj.js (1)
 * attribution: fingerprint 1
 */
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { useSetAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { useState } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { incrementEscapeCount } from "./PermissionPrompt.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-0e8j1zzj.js:25753-27685 fingerprint (2.1.88 match: useShellPermissionFeedback, 0.556)
/**
 * 反馈模式状态：在 accept/reject 选项上按 Tab 进入附加说明输入，记录 tengu_accept/reject_feedback_mode_entered/collapsed。
 */
function useShellPermissionFeedback(props) {
  let $ = useMemoCache(35);
  let { feedbackTypeOf, toolName, isMcp, initialFocusedType } = props;
  let setAppState = useSetAppState();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [acceptFeedback, setAcceptFeedback] = useState("");
  let [rejectFeedback, setRejectFeedback] = useState("");
  let [acceptInputMode, setAcceptInputMode] = useState(false);
  let [rejectInputMode, setRejectInputMode] = useState(false);
  let [acceptModeEntered, setAcceptModeEntered] = useState(false);
  let [rejectModeEntered, setRejectModeEntered] = useState(false);
  let [feedbackObj, setFeedback] = useState(undefined);
  let focusedType;
  if ($[0] !== feedbackTypeOf || $[1] !== feedbackObj || $[2] !== initialFocusedType) {
    focusedType = feedbackObj === undefined ? initialFocusedType : feedbackTypeOf(feedbackObj);
    $[0] = feedbackTypeOf;
    $[1] = feedbackObj;
    $[2] = initialFocusedType;
    $[3] = focusedType;
  } else focusedType = $[3];
  let focusedType_2 = focusedType;
  let handleInputModeToggle;
  if (
    $[4] !== acceptInputMode ||
    $[5] !== feedbackTypeOf ||
    $[6] !== isMcp ||
    $[7] !== rejectInputMode ||
    $[8] !== toolName
  ) {
    handleInputModeToggle = (option) => {
      let type = feedbackTypeOf(option);
      let analyticsProps = {
        toolName,
        isMcp,
      };
      if (type === "accept") {
        if (acceptInputMode) {
          setAcceptInputMode(false);
          logEvent("tengu_accept_feedback_mode_collapsed", analyticsProps);
        } else {
          setAcceptInputMode(true);
          setAcceptModeEntered(true);
          logEvent("tengu_accept_feedback_mode_entered", analyticsProps);
        }
      } else if (type === "reject") {
        if (rejectInputMode) {
          setRejectInputMode(false);
          logEvent("tengu_reject_feedback_mode_collapsed", analyticsProps);
        } else {
          setRejectInputMode(true);
          setRejectModeEntered(true);
          logEvent("tengu_reject_feedback_mode_entered", analyticsProps);
        }
      }
    };
    $[4] = acceptInputMode;
    $[5] = feedbackTypeOf;
    $[6] = isMcp;
    $[7] = rejectInputMode;
    $[8] = toolName;
    $[9] = handleInputModeToggle;
  } else handleInputModeToggle = $[9];
  let handleInputModeToggle_2 = handleInputModeToggle;
  let handleFocus;
  if (
    $[10] !== acceptFeedback ||
    $[11] !== acceptInputMode ||
    $[12] !== feedbackTypeOf ||
    $[13] !== rejectFeedback ||
    $[14] !== rejectInputMode
  ) {
    handleFocus = (feedback) => {
      let type = feedbackTypeOf(feedback);
      if (type !== "accept" && acceptInputMode && !acceptFeedback.trim()) setAcceptInputMode(false);
      if (type !== "reject" && rejectInputMode && !rejectFeedback.trim()) setRejectInputMode(false);
      setFeedback(feedback);
    };
    $[10] = acceptFeedback;
    $[11] = acceptInputMode;
    $[12] = feedbackTypeOf;
    $[13] = rejectFeedback;
    $[14] = rejectInputMode;
    $[15] = handleFocus;
  } else handleFocus = $[15];
  let handleFocus_2 = handleFocus;
  let logSubmitted;
  if ($[16] !== acceptModeEntered || $[17] !== isMcp || $[18] !== rejectModeEntered || $[19] !== toolName) {
    logSubmitted = (kind, instructions) => {
      logEvent(kind === "accept" ? "tengu_accept_submitted" : "tengu_reject_submitted", {
        toolName,
        isMcp,
        has_instructions: !!instructions,
        instructions_length: instructions?.length ?? 0,
        entered_feedback_mode: kind === "accept" ? acceptModeEntered : rejectModeEntered,
      });
    };
    $[16] = acceptModeEntered;
    $[17] = isMcp;
    $[18] = rejectModeEntered;
    $[19] = toolName;
    $[20] = logSubmitted;
  } else logSubmitted = $[20];
  let logSubmitted_2 = logSubmitted;
  let logEscape;
  if ($[21] !== setAppState) {
    logEscape = () => {
      logEvent("tengu_permission_request_escape", {});
      setAppState(incrementEscapeCount);
    };
    $[21] = setAppState;
    $[22] = logEscape;
  } else logEscape = $[22];
  let logEscape_2 = logEscape;
  let showHint =
    !isScreenReaderEnabled &&
    ((focusedType_2 === "accept" && !acceptInputMode) || (focusedType_2 === "reject" && !rejectInputMode));
  let hintNode;
  if ($[23] !== showHint) {
    hintNode =
      showHint &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: "amend",
      });
    $[23] = showHint;
    $[24] = hintNode;
  } else hintNode = $[24];
  let hintNode_2 = hintNode;
  let api;
  if (
    $[25] !== acceptFeedback ||
    $[26] !== acceptInputMode ||
    $[27] !== handleFocus_2 ||
    $[28] !== handleInputModeToggle_2 ||
    $[29] !== hintNode_2 ||
    $[30] !== logEscape_2 ||
    $[31] !== logSubmitted_2 ||
    $[32] !== rejectFeedback ||
    $[33] !== rejectInputMode
  ) {
    api = {
      acceptFeedback,
      rejectFeedback,
      setAcceptFeedback,
      setRejectFeedback,
      acceptInputMode,
      rejectInputMode,
      handleInputModeToggle: handleInputModeToggle_2,
      handleFocus: handleFocus_2,
      logSubmitted: logSubmitted_2,
      logEscape: logEscape_2,
      hintNode: hintNode_2,
    };
    $[25] = acceptFeedback;
    $[26] = acceptInputMode;
    $[27] = handleFocus_2;
    $[28] = handleInputModeToggle_2;
    $[29] = hintNode_2;
    $[30] = logEscape_2;
    $[31] = logSubmitted_2;
    $[32] = rejectFeedback;
    $[33] = rejectInputMode;
    $[34] = api;
  } else api = $[34];
  return api;
}
export { useShellPermissionFeedback };
