/**
 * components/VimTextInput.tsx
 *
 * vim 模式文本输入：useVimInput + BaseTextInput，并显示 INSERT/NORMAL/VISUAL 模式。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/VimTextInput.tsx
 * pieces: chunk-ey2qag4x.js (2)
 * attribution: placement 1, fingerprint 1
 */
import { init_react_production, Q, R, Oo, P, zt } from "../../vendor/react/cjs/react.production.js";
import { useTheme } from "./design-system/ThemeProvider.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { isNativeCursorEnabled } from "../ink/nativeCursor.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTextInputEffects } from "../hooks/useTextInputShared.js";
import { VimInputHook } from "../hooks/useVimInput.js";
import { inverseText } from "../ink/screen.js";
import { color } from "./design-system/color.js";
import { jsxProd_default } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { BaseTextInput } from "./BaseTextInput.js";

//@ chunk-ey2qag4x.js:23710-23714 placement
init_react_production();
//@ chunk-ey2qag4x.js:23714-25844 fingerprint = VimTextInput (0.629)
/**
 * vim 模式输入框：在 TextInput 基础上显示当前 vim 模式（NORMAL/VISUAL/VISUAL LINE）。
 */
function VimTextInput(props) {
  let [o] = useTheme();
  let terminalFocus = useTerminalFocus();
  let a = Q(isNativeCursorEnabled, []);
  let isTerminalFocused = useIsScreenReaderEnabled();
  useTextInputEffects({
    isTerminalFocused: terminalFocus,
    canPasteImages: !!props.onImagePaste,
  });
  let vimInputState = VimInputHook({
    value: props.value,
    onChange: props.onChange,
    onSubmit: props.onSubmit,
    onExit: props.onExit,
    onExitMessage: props.onExitMessage,
    onLeftArrowOnEmpty: props.onLeftArrowOnEmpty,
    leftArrowConfirmHint: props.leftArrowConfirmHint,
    onHistoryReset: props.onHistoryReset,
    onHistoryUp: props.onHistoryUp,
    onHistoryDown: props.onHistoryDown,
    focus: props.focus,
    mask: props.mask,
    maskWhole: props.maskWhole,
    multiline: props.multiline,
    disableBackslashReturn: props.disableBackslashReturn,
    clearOnSubmit: props.clearOnSubmit,
    disableCtrlCClear: props.disableCtrlCClear,
    cursorChar: props.showCursor && !a ? " " : "",
    preserveTrailingWhitespace: isTerminalFocused,
    highlightPastedText: props.highlightPastedText,
    invert: terminalFocus ? inverseText : (T) => T,
    themeText: color("text", o),
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
    virtualTexts: isTerminalFocused ? undefined : props.virtualTexts,
    getPastedContents: props.getPastedContents,
    getInputMode: props.getInputMode,
    onModeChange: props.onModeChange,
    onUndo: props.onUndo,
    onOpenHistorySearch: props.onOpenHistorySearch,
    onToggleHelp: props.onToggleHelp,
  });
  let { mode, setMode, cancelPendingRemap, forgetColumn, isCommandPending } = vimInputState;
  let V = R(false);
  let x = Oo(setMode);
  P(() => {
    let T = !V.current;
    V.current = true;
    let initialMode =
      T && (props.initialMode === "VISUAL" || props.initialMode === "VISUAL LINE")
        ? "NORMAL"
        : props.initialMode;
    if (initialMode && initialMode !== mode) x(initialMode);
  }, [props.initialMode, mode]);
  let { recordInsertRef } = props;
  let { recordInsert } = vimInputState;
  P(() => {
    if (!recordInsertRef) return;
    recordInsertRef.current = recordInsert;
    return () => {
      recordInsertRef.current = null;
    };
  }, [recordInsertRef, recordInsert]);
  let { cancelRemapRef } = props;
  P(() => {
    if (!cancelRemapRef) return;
    cancelRemapRef.current = cancelPendingRemap;
    return () => {
      cancelRemapRef.current = null;
    };
  }, [cancelRemapRef, cancelPendingRemap]);
  let { forgetColumnRef } = props;
  P(() => {
    if (!forgetColumnRef) return;
    forgetColumnRef.current = forgetColumn;
    return () => {
      forgetColumnRef.current = null;
    };
  }, [forgetColumnRef, forgetColumn]);
  let { onEditingStateChange } = props;
  let m = props.focus !== false;
  let W = mode !== "NORMAL" || isCommandPending;
  zt(() => {
    if (!onEditingStateChange || !m) return;
    onEditingStateChange({
      mode,
      takesEscape: W,
    });
    return () => onEditingStateChange(null);
  }, [onEditingStateChange, m, mode, W]);
  return jsxProd_default(Box, {
    flexDirection: "column",
    children: jsxProd_default(BaseTextInput, {
      inputState: vimInputState,
      terminalFocus,
      highlights: props.highlights,
      ...props,
    }),
  });
}
export { VimTextInput };
