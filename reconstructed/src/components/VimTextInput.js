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
import { j, Q, R, Oo, P, zt } from "../../vendor/react/cjs/react.production.js";
import { useTheme } from "./design-system/ThemeProvider.js";
import { useTerminalFocus } from "../ink/hooks/use-terminal-focus.js";
import { isNativeCursorEnabled } from "../ink/nativeCursor.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useTextInputEffects } from "../hooks/useTextInputShared.js";
import { VimInputHook } from "../hooks/useVimInput.js";
import { inverseText } from "../ink/screen.js";
import { color } from "./design-system/color.js";
import { e } from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Box } from "../ink/components/Text.js";
import { BaseTextInput } from "./BaseTextInput.js";

//@ chunk-ey2qag4x.js:23710-23714 placement
j();
/**
 * vim 模式输入框：在 TextInput 基础上显示当前 vim 模式（NORMAL/VISUAL/VISUAL LINE）。
 */
//@ chunk-ey2qag4x.js:23714-25844 fingerprint = VimTextInput (0.629)
function VimTextInput(props) {
  let [o] = useTheme(),
    i = useTerminalFocus(),
    a = Q(isNativeCursorEnabled, []),
    isTerminalFocused = useIsScreenReaderEnabled();
  useTextInputEffects({ isTerminalFocused: i, canPasteImages: !!props.onImagePaste });
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
      invert: i ? inverseText : (T) => T,
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
      virtualTexts: isTerminalFocused ? void 0 : props.virtualTexts,
      getPastedContents: props.getPastedContents,
      getInputMode: props.getInputMode,
      onModeChange: props.onModeChange,
      onUndo: props.onUndo,
      onOpenHistorySearch: props.onOpenHistorySearch,
      onToggleHelp: props.onToggleHelp,
    }),
    {
      mode: mode,
      setMode: setMode,
      cancelPendingRemap: cancelPendingRemap,
      forgetColumn: forgetColumn,
      isCommandPending: isCommandPending,
    } = vimInputState,
    V = R(!1),
    x = Oo(setMode);
  P(() => {
    let T = !V.current;
    V.current = !0;
    let D =
      T && (props.initialMode === "VISUAL" || props.initialMode === "VISUAL LINE")
        ? "NORMAL"
        : props.initialMode;
    if (D && D !== mode) x(D);
  }, [props.initialMode, mode]);
  let { recordInsertRef: recordInsertRef } = props,
    { recordInsert: recordInsert } = vimInputState;
  P(() => {
    if (!recordInsertRef) return;
    return (
      (recordInsertRef.current = recordInsert),
      () => {
        recordInsertRef.current = null;
      }
    );
  }, [recordInsertRef, recordInsert]);
  let { cancelRemapRef: cancelRemapRef } = props;
  P(() => {
    if (!cancelRemapRef) return;
    return (
      (cancelRemapRef.current = cancelPendingRemap),
      () => {
        cancelRemapRef.current = null;
      }
    );
  }, [cancelRemapRef, cancelPendingRemap]);
  let { forgetColumnRef: forgetColumnRef } = props;
  P(() => {
    if (!forgetColumnRef) return;
    return (
      (forgetColumnRef.current = forgetColumn),
      () => {
        forgetColumnRef.current = null;
      }
    );
  }, [forgetColumnRef, forgetColumn]);
  let { onEditingStateChange: onEditingStateChange } = props,
    m = props.focus !== !1,
    W = mode !== "NORMAL" || isCommandPending;
  return (
    zt(() => {
      if (!onEditingStateChange || !m) return;
      return (onEditingStateChange({ mode: mode, takesEscape: W }), () => onEditingStateChange(null));
    }, [onEditingStateChange, m, mode, W]),
    e(Box, {
      flexDirection: "column",
      children: e(BaseTextInput, {
        inputState: vimInputState,
        terminalFocus: i,
        highlights: props.highlights,
        ...props,
      }),
    })
  );
}

export { VimTextInput };
