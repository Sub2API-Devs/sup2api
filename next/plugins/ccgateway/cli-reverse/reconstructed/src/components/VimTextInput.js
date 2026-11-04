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
import {
  init_react_production,
  useMemo,
  useRef,
  useEffectEvent,
  useEffect,
  useLayoutEffect,
} from "../../vendor/react/cjs/react.production.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-ey2qag4x.js:23710-23714 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:23710", () => {
  init_react_production();
});
//@ chunk-ey2qag4x.js:23714-25844 fingerprint (2.1.88 match: VimTextInput, 0.629)
/**
 * vim 模式输入框：在 TextInput 基础上显示当前 vim 模式（NORMAL/VISUAL/VISUAL LINE）。
 */
function VimTextInput(props) {
  let [theme] = useTheme();
  let terminalFocus = useTerminalFocus();
  let nativeCursorEnabled = useMemo(isNativeCursorEnabled, []);
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
    cursorChar: props.showCursor && !nativeCursorEnabled ? " " : "",
    preserveTrailingWhitespace: isTerminalFocused,
    highlightPastedText: props.highlightPastedText,
    invert: terminalFocus ? inverseText : (text) => text,
    themeText: color("text", theme),
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
  let didMountRef = useRef(false);
  let applyMode = useEffectEvent(setMode);
  useEffect(() => {
    let isFirstRun = !didMountRef.current;
    didMountRef.current = true;
    let initialMode =
      isFirstRun && (props.initialMode === "VISUAL" || props.initialMode === "VISUAL LINE")
        ? "NORMAL"
        : props.initialMode;
    if (initialMode && initialMode !== mode) applyMode(initialMode);
  }, [props.initialMode, mode]);
  let { recordInsertRef } = props;
  let { recordInsert } = vimInputState;
  useEffect(() => {
    if (!recordInsertRef) return;
    recordInsertRef.current = recordInsert;
    return () => {
      recordInsertRef.current = null;
    };
  }, [recordInsertRef, recordInsert]);
  let { cancelRemapRef } = props;
  useEffect(() => {
    if (!cancelRemapRef) return;
    cancelRemapRef.current = cancelPendingRemap;
    return () => {
      cancelRemapRef.current = null;
    };
  }, [cancelRemapRef, cancelPendingRemap]);
  let { forgetColumnRef } = props;
  useEffect(() => {
    if (!forgetColumnRef) return;
    forgetColumnRef.current = forgetColumn;
    return () => {
      forgetColumnRef.current = null;
    };
  }, [forgetColumnRef, forgetColumn]);
  let { onEditingStateChange } = props;
  let isFocused = props.focus !== false;
  let takesEscape = mode !== "NORMAL" || isCommandPending;
  useLayoutEffect(() => {
    if (!onEditingStateChange || !isFocused) return;
    onEditingStateChange({
      mode,
      takesEscape,
    });
    return () => onEditingStateChange(null);
  }, [onEditingStateChange, isFocused, mode, takesEscape]);
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
