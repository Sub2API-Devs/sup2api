/**
 * components/TextInput.tsx
 *
 * 普通（非 vim）文本输入：useTextInput + BaseTextInput，支持语音录音电平条。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/TextInput.tsx
 * pieces: chunk-3t80v0fz.js (4), chunk-42wa4pww.js (1)
 * attribution: sole-consumer 2, affinity 1, fingerprint 2
 */
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
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

//@ chunk-42wa4pww.js:50977-51058 fingerprint (2.1.88 match: BARS, 1)
var VOICE_LEVEL_BARS = " \u2581\u2582\u2583\u2584\u2585\u2586\u2587\u2588";
var CURSOR_BLINK_ON_RATIO = 0.7;
var CURSOR_BLINK_PERIOD = 1.8;
var CURSOR_FADE_RATIO = 0.15;
//@ chunk-3t80v0fz.js:7030-7067 sole-consumer
function selectVoiceState(appState) {
  return appState.voiceState;
}
//@ chunk-3t80v0fz.js:7067-7093 sole-consumer
function identity(value) {
  return value;
}
//@ chunk-3t80v0fz.js:7093-7119 affinity
function identity_2(value) {
  return value;
}
//@ chunk-3t80v0fz.js:7119-10845 fingerprint (2.1.88 match: TextInput, 0.658)
/**
 * 普通输入框：调用 useTextInput，渲染 BaseTextInput；语音录音时显示电平条。
 */
function TextInput(props) {
  let $ = useMemoCache(58);
  let [theme] = useTheme();
  let isTerminalFocused = useTerminalFocus();
  let nativeCursorEnabled;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    nativeCursorEnabled = isNativeCursorEnabled();
    $[0] = nativeCursorEnabled;
  } else nativeCursorEnabled = $[0];
  let isNativeCursor = nativeCursorEnabled;
  let settings = useIsScreenReaderEnabled();
  let hidePlaceholderText = useAppState_2(selectVoiceState) === "recording";
  let [containerRef, voiceLevelCell] = useVoiceLevelIndicator();
  const canPasteImages = !!props.onImagePaste;
  let inputEffectOptions;
  if ($[1] !== isTerminalFocused || $[2] !== canPasteImages) {
    inputEffectOptions = {
      isTerminalFocused,
      canPasteImages,
    };
    $[1] = isTerminalFocused;
    $[2] = canPasteImages;
    $[3] = inputEffectOptions;
  } else inputEffectOptions = $[3];
  useTextInputEffects(inputEffectOptions);
  let invert;
  if ($[4] !== voiceLevelCell || $[5] !== isTerminalFocused) {
    invert = !isTerminalFocused
      ? identity
      : voiceLevelCell
        ? () => sequential.hex(voiceLevelCell.hex)(voiceLevelCell.char)
        : isNativeCursor
          ? identity_2
          : inverseText;
    $[4] = voiceLevelCell;
    $[5] = isTerminalFocused;
    $[6] = invert;
  } else invert = $[6];
  let invert_2 = invert;
  const {
    value,
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
  let themeText;
  if ($[7] !== theme) {
    themeText = color("text", theme);
    $[7] = theme;
    $[8] = themeText;
  } else themeText = $[8];
  const virtualTexts = settings ? undefined : props.virtualTexts;
  let inputOptions;
  if (
    $[9] !== invert_2 ||
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
    $[23] !== props.historyOnClear ||
    $[24] !== props.inlineGhostText ||
    $[25] !== props.inputFilter ||
    $[26] !== props.leadingPill ||
    $[27] !== props.leftArrowConfirmHint ||
    $[28] !== props.mask ||
    $[29] !== props.maskWhole ||
    $[30] !== props.maxVisibleLines ||
    $[31] !== props.multiline ||
    $[32] !== props.onChange ||
    $[33] !== props.onChangeCursorOffset ||
    $[34] !== props.onEscapeMessage ||
    $[35] !== props.onExit ||
    $[36] !== props.onExitMessage ||
    $[37] !== props.onHistoryDown ||
    $[38] !== props.onHistoryReset ||
    $[39] !== props.onHistoryUp ||
    $[40] !== props.onImagePaste ||
    $[41] !== props.onLeftArrowOnEmpty ||
    $[42] !== props.onSubmit ||
    $[43] !== props.value ||
    $[44] !== cursorChar ||
    $[45] !== themeText ||
    $[46] !== virtualTexts
  ) {
    inputOptions = {
      value,
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
      invert: invert_2,
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
    $[9] = invert_2;
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
    $[23] = props.historyOnClear;
    $[24] = props.inlineGhostText;
    $[25] = props.inputFilter;
    $[26] = props.leadingPill;
    $[27] = props.leftArrowConfirmHint;
    $[28] = props.mask;
    $[29] = props.maskWhole;
    $[30] = props.maxVisibleLines;
    $[31] = props.multiline;
    $[32] = props.onChange;
    $[33] = props.onChangeCursorOffset;
    $[34] = props.onEscapeMessage;
    $[35] = props.onExit;
    $[36] = props.onExitMessage;
    $[37] = props.onHistoryDown;
    $[38] = props.onHistoryReset;
    $[39] = props.onHistoryUp;
    $[40] = props.onImagePaste;
    $[41] = props.onLeftArrowOnEmpty;
    $[42] = props.onSubmit;
    $[43] = props.value;
    $[44] = cursorChar;
    $[45] = themeText;
    $[46] = virtualTexts;
    $[47] = inputOptions;
  } else inputOptions = $[47];
  let inputState = useTextInput(inputOptions);
  const cursorCellPainted = voiceLevelCell != null;
  let children;
  if (
    $[48] !== invert_2 ||
    $[49] !== isTerminalFocused ||
    $[50] !== hidePlaceholderText ||
    $[51] !== props ||
    $[52] !== cursorCellPainted ||
    $[53] !== inputState
  ) {
    children = jsxProd_default(BaseTextInput, {
      inputState,
      terminalFocus: isTerminalFocused,
      highlights: props.highlights,
      invert: invert_2,
      hidePlaceholderText,
      cursorCellPainted,
      ...props,
    });
    $[48] = invert_2;
    $[49] = isTerminalFocused;
    $[50] = hidePlaceholderText;
    $[51] = props;
    $[52] = cursorCellPainted;
    $[53] = inputState;
    $[54] = children;
  } else children = $[54];
  let boxElement;
  if ($[55] !== containerRef || $[56] !== children) {
    boxElement = jsxProd_default(Box, {
      ref: containerRef,
      children,
    });
    $[55] = containerRef;
    $[56] = children;
    $[57] = boxElement;
  } else boxElement = $[57];
  return boxElement;
}
export { TextInput, CURSOR_BLINK_PERIOD, CURSOR_BLINK_ON_RATIO, VOICE_LEVEL_BARS, CURSOR_FADE_RATIO };
