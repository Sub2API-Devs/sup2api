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
import { w } from "../../../vendor/react/compiler-runtime.js";
import { useSetAppState } from "../../state/AppState.js";
import { useIsScreenReaderEnabled } from "../../ink/components/ErrorBoundary.js";
import { y } from "../../../vendor/react/cjs/react.production.js";
import { logEvent } from "../../services/analytics/index.js";
import { incrementEscapeCount } from "./PermissionPrompt.js";
import { jsxProd_default } from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { KeyboardShortcutHint } from "../design-system/KeyboardShortcutHint.js";

//@ chunk-0e8j1zzj.js:25753-27685 fingerprint = useShellPermissionFeedback (0.556)
/**
 * 反馈模式状态：在 accept/reject 选项上按 Tab 进入附加说明输入，记录 tengu_accept/reject_feedback_mode_entered/collapsed。
 */
function useShellPermissionFeedback(props) {
  let $ = w(35);
  let { feedbackTypeOf, toolName, isMcp, initialFocusedType } = props;
  let setAppState = useSetAppState();
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let [h, k] = y("");
  let [f, g] = y("");
  let [M, N] = y(false);
  let [x, A] = y(false);
  let [T, v] = y(false);
  let [I, L] = y(false);
  let [b, E] = y(undefined);
  let le;
  if ($[0] !== feedbackTypeOf || $[1] !== b || $[2] !== initialFocusedType) {
    le = b === undefined ? initialFocusedType : feedbackTypeOf(b);
    $[0] = feedbackTypeOf;
    $[1] = b;
    $[2] = initialFocusedType;
    $[3] = le;
  } else le = $[3];
  let V = le;
  let X;
  if ($[4] !== M || $[5] !== feedbackTypeOf || $[6] !== isMcp || $[7] !== x || $[8] !== toolName) {
    X = (option) => {
      let z = feedbackTypeOf(option);
      let analyticsProps = {
        toolName,
        isMcp,
      };
      if (z === "accept") {
        if (M) {
          N(false);
          logEvent("tengu_accept_feedback_mode_collapsed", analyticsProps);
        } else {
          N(true);
          v(true);
          logEvent("tengu_accept_feedback_mode_entered", analyticsProps);
        }
      } else if (z === "reject") {
        if (x) {
          A(false);
          logEvent("tengu_reject_feedback_mode_collapsed", analyticsProps);
        } else {
          A(true);
          L(true);
          logEvent("tengu_reject_feedback_mode_entered", analyticsProps);
        }
      }
    };
    $[4] = M;
    $[5] = feedbackTypeOf;
    $[6] = isMcp;
    $[7] = x;
    $[8] = toolName;
    $[9] = X;
  } else X = $[9];
  let handleInputModeToggle = X;
  let B;
  if ($[10] !== h || $[11] !== M || $[12] !== feedbackTypeOf || $[13] !== f || $[14] !== x) {
    B = (feedback) => {
      let oe = feedbackTypeOf(feedback);
      if (oe !== "accept" && M && !h.trim()) N(false);
      if (oe !== "reject" && x && !f.trim()) A(false);
      E(feedback);
    };
    $[10] = h;
    $[11] = M;
    $[12] = feedbackTypeOf;
    $[13] = f;
    $[14] = x;
    $[15] = B;
  } else B = $[15];
  let handleFocus = B;
  let K;
  if ($[16] !== T || $[17] !== isMcp || $[18] !== I || $[19] !== toolName) {
    K = (Ne, $e) => {
      logEvent(Ne === "accept" ? "tengu_accept_submitted" : "tengu_reject_submitted", {
        toolName,
        isMcp,
        has_instructions: !!$e,
        instructions_length: $e?.length ?? 0,
        entered_feedback_mode: Ne === "accept" ? T : I,
      });
    };
    $[16] = T;
    $[17] = isMcp;
    $[18] = I;
    $[19] = toolName;
    $[20] = K;
  } else K = $[20];
  let logSubmitted = K;
  let ae;
  if ($[21] !== setAppState) {
    ae = () => {
      logEvent("tengu_permission_request_escape", {});
      setAppState(incrementEscapeCount);
    };
    $[21] = setAppState;
    $[22] = ae;
  } else ae = $[22];
  let logEscape = ae;
  let Oe = !isScreenReaderEnabled && ((V === "accept" && !M) || (V === "reject" && !x));
  let Ye;
  if ($[23] !== Oe) {
    Ye =
      Oe &&
      jsxProd_default(KeyboardShortcutHint, {
        chord: "tab",
        action: "amend",
      });
    $[23] = Oe;
    $[24] = Ye;
  } else Ye = $[24];
  let hintNode = Ye;
  let pe;
  if (
    $[25] !== h ||
    $[26] !== M ||
    $[27] !== handleFocus ||
    $[28] !== handleInputModeToggle ||
    $[29] !== hintNode ||
    $[30] !== logEscape ||
    $[31] !== logSubmitted ||
    $[32] !== f ||
    $[33] !== x
  ) {
    pe = {
      acceptFeedback: h,
      rejectFeedback: f,
      setAcceptFeedback: k,
      setRejectFeedback: g,
      acceptInputMode: M,
      rejectInputMode: x,
      handleInputModeToggle,
      handleFocus,
      logSubmitted,
      logEscape,
      hintNode,
    };
    $[25] = h;
    $[26] = M;
    $[27] = handleFocus;
    $[28] = handleInputModeToggle;
    $[29] = hintNode;
    $[30] = logEscape;
    $[31] = logSubmitted;
    $[32] = f;
    $[33] = x;
    $[34] = pe;
  } else pe = $[34];
  return pe;
}
export { useShellPermissionFeedback };
