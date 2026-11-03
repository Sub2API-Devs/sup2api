/**
 * components/TextInput.tsx
 *
 * 普通（非 vim）文本输入：useTextInput + BaseTextInput，支持语音录音电平条。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TextInput.tsx
 * pieces: chunk-7p2hc4jn.js (1), chunk-81qqq1aq.js (4)
 * attribution: fingerprint 2, sole-consumer 2, affinity 1
 */
import { w } from "../../vendor/react/compiler-runtime.js";
import { useTheme } from "./design-system/ThemeProvider.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { isNativeCursorEnabled } from "../ink/nativeCursor.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useAppState_2 } from "../state/AppState.js";
import { useVoiceLevelIndicator } from "../hooks/useVoiceAudioLevels.js";
import { useTextInputEffects } from "../hooks/useTextInputShared.js";
import { sequential } from "../utils/sequential.js";
import { inverseText } from "../ink/screen.js";
import { color } from "./design-system/color.js";
import { useTextInput } from "../hooks/useTextInput.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { BaseTextInput } from "./BaseTextInput.js";
import { Box } from "../ink/components/Text.js";

//@ chunk-81qqq1aq.js:7027-7064 sole-consumer
function selectVoiceState(tt) {
  return tt.voiceState;
}
//@ chunk-81qqq1aq.js:7064-7090 sole-consumer
function identity(ot) {
  return ot;
}
//@ chunk-81qqq1aq.js:7090-7116 affinity
function identity_2(ce) {
  return ce;
}
//@ chunk-81qqq1aq.js:7116-10954 fingerprint = TextInput (0.667)
/**
 * 普通输入框：调用 useTextInput，渲染 BaseTextInput；语音录音时显示电平条。
 */
function TextInput(props) {
  let $ = w(59);
  let [h] = useTheme();
  let isTerminalFocused = useTerminalFocus();
  let d;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    d = isNativeCursorEnabled();
    $[0] = d;
  } else d = $[0];
  let m = d;
  let settings = useIsScreenReaderEnabled();
  let hidePlaceholderText = useAppState_2(selectVoiceState) === "recording";
  let [u, b] = useVoiceLevelIndicator();
  const canPasteImages = !!props.onImagePaste;
  let E;
  if ($[1] !== isTerminalFocused || $[2] !== canPasteImages) {
    E = {
      isTerminalFocused,
      canPasteImages,
    };
    $[1] = isTerminalFocused;
    $[2] = canPasteImages;
    $[3] = E;
  } else E = $[3];
  useTextInputEffects(E);
  let H;
  if ($[4] !== b || $[5] !== isTerminalFocused) {
    H = !isTerminalFocused
      ? identity
      : b
        ? () => sequential.hex(b.hex)(b.char)
        : m
          ? identity_2
          : inverseText;
    $[4] = b;
    $[5] = isTerminalFocused;
    $[6] = H;
  } else H = $[6];
  let invert = H;
  const {
    value: M,
    onChange,
    onSubmit,
    onExit,
    onExitMessage,
    onEscapeMessage,
    historyOnClear,
    onLeftArrowOnEmpty,
    leftArrowConfirmHint,
    onHistoryReset,
    onHistoryUp,
    onHistoryDown,
    focus,
    mask,
    maskWhole,
    multiline,
    disableBackslashReturn,
    clearOnSubmit,
    disableCtrlCClear,
  } = props;
  const cursorChar = props.showCursor && !settings ? " " : "";
  const highlightPastedText = props.highlightPastedText;
  let themeText;
  if ($[7] !== h) {
    themeText = color("text", h);
    $[7] = h;
    $[8] = themeText;
  } else themeText = $[8];
  const virtualTexts = settings ? undefined : props.virtualTexts;
  let ae;
  if (
    $[9] !== invert ||
    $[10] !== settings ||
    $[11] !== props.clearOnSubmit ||
    $[12] !== props.columns ||
    $[13] !== props.commitEdit ||
    $[14] !== props.cursorOffset ||
    $[15] !== props.disableBackslashReturn ||
    $[16] !== props.disableCtrlCClear ||
    $[17] !== props.disableCursorMovementForUpDownKeys ||
    $[18] !== props.disableEscapeDoublePress ||
    $[19] !== props.editRelay ||
    $[20] !== props.focus ||
    $[21] !== props.getInputMode ||
    $[22] !== props.getPastedContents ||
    $[23] !== props.highlightPastedText ||
    $[24] !== props.historyOnClear ||
    $[25] !== props.inlineGhostText ||
    $[26] !== props.inputFilter ||
    $[27] !== props.leadingPill ||
    $[28] !== props.leftArrowConfirmHint ||
    $[29] !== props.mask ||
    $[30] !== props.maskWhole ||
    $[31] !== props.maxVisibleLines ||
    $[32] !== props.multiline ||
    $[33] !== props.onChange ||
    $[34] !== props.onChangeCursorOffset ||
    $[35] !== props.onEscapeMessage ||
    $[36] !== props.onExit ||
    $[37] !== props.onExitMessage ||
    $[38] !== props.onHistoryDown ||
    $[39] !== props.onHistoryReset ||
    $[40] !== props.onHistoryUp ||
    $[41] !== props.onImagePaste ||
    $[42] !== props.onLeftArrowOnEmpty ||
    $[43] !== props.onSubmit ||
    $[44] !== props.value ||
    $[45] !== cursorChar ||
    $[46] !== themeText ||
    $[47] !== virtualTexts
  ) {
    ae = {
      value: M,
      onChange,
      onSubmit,
      onExit,
      onExitMessage,
      onEscapeMessage,
      historyOnClear,
      onLeftArrowOnEmpty,
      leftArrowConfirmHint,
      onHistoryReset,
      onHistoryUp,
      onHistoryDown,
      focus,
      mask,
      maskWhole,
      multiline,
      disableBackslashReturn,
      clearOnSubmit,
      disableCtrlCClear,
      cursorChar,
      preserveTrailingWhitespace: settings,
      highlightPastedText,
      invert,
      themeText,
      columns: props.columns,
      leadingPill: props.leadingPill,
      maxVisibleLines: props.maxVisibleLines,
      onImagePaste: props.onImagePaste,
      disableCursorMovementForUpDownKeys: props.disableCursorMovementForUpDownKeys,
      disableEscapeDoublePress: props.disableEscapeDoublePress,
      externalOffset: props.cursorOffset,
      onOffsetChange: props.onChangeCursorOffset,
      inputFilter: props.inputFilter,
      editRelay: props.editRelay,
      commitEdit: props.commitEdit,
      getPastedContents: props.getPastedContents,
      getInputMode: props.getInputMode,
      inlineGhostText: props.inlineGhostText,
      dim: sequential.dim,
      virtualTexts,
    };
    $[9] = invert;
    $[10] = settings;
    $[11] = props.clearOnSubmit;
    $[12] = props.columns;
    $[13] = props.commitEdit;
    $[14] = props.cursorOffset;
    $[15] = props.disableBackslashReturn;
    $[16] = props.disableCtrlCClear;
    $[17] = props.disableCursorMovementForUpDownKeys;
    $[18] = props.disableEscapeDoublePress;
    $[19] = props.editRelay;
    $[20] = props.focus;
    $[21] = props.getInputMode;
    $[22] = props.getPastedContents;
    $[23] = props.highlightPastedText;
    $[24] = props.historyOnClear;
    $[25] = props.inlineGhostText;
    $[26] = props.inputFilter;
    $[27] = props.leadingPill;
    $[28] = props.leftArrowConfirmHint;
    $[29] = props.mask;
    $[30] = props.maskWhole;
    $[31] = props.maxVisibleLines;
    $[32] = props.multiline;
    $[33] = props.onChange;
    $[34] = props.onChangeCursorOffset;
    $[35] = props.onEscapeMessage;
    $[36] = props.onExit;
    $[37] = props.onExitMessage;
    $[38] = props.onHistoryDown;
    $[39] = props.onHistoryReset;
    $[40] = props.onHistoryUp;
    $[41] = props.onImagePaste;
    $[42] = props.onLeftArrowOnEmpty;
    $[43] = props.onSubmit;
    $[44] = props.value;
    $[45] = cursorChar;
    $[46] = themeText;
    $[47] = virtualTexts;
    $[48] = ae;
  } else ae = $[48];
  let inputState = useTextInput(ae);
  const cursorCellPainted = b != null;
  let children;
  if (
    $[49] !== invert ||
    $[50] !== isTerminalFocused ||
    $[51] !== hidePlaceholderText ||
    $[52] !== props ||
    $[53] !== cursorCellPainted ||
    $[54] !== inputState
  ) {
    children = jsxProd_default(BaseTextInput, {
      inputState,
      terminalFocus: isTerminalFocused,
      highlights: props.highlights,
      invert,
      hidePlaceholderText,
      cursorCellPainted,
      ...props,
    });
    $[49] = invert;
    $[50] = isTerminalFocused;
    $[51] = hidePlaceholderText;
    $[52] = props;
    $[53] = cursorCellPainted;
    $[54] = inputState;
    $[55] = children;
  } else children = $[55];
  let Y;
  if ($[56] !== u || $[57] !== children) {
    Y = jsxProd_default(Box, {
      ref: u,
      children,
    });
    $[56] = u;
    $[57] = children;
    $[58] = Y;
  } else Y = $[58];
  return Y;
}
//@ chunk-7p2hc4jn.js:50977-51058 fingerprint = BARS (1)
var VOICE_LEVEL_BARS = " \u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588";
var CURSOR_BLINK_ON_RATIO = 0.7;
var CURSOR_BLINK_PERIOD = 1.8;
var CURSOR_FADE_RATIO = 0.15;
export { TextInput, CURSOR_BLINK_PERIOD, CURSOR_BLINK_ON_RATIO, VOICE_LEVEL_BARS, CURSOR_FADE_RATIO };
