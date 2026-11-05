/**
 * components/CustomSelect/use-select-input.ts
 *
 * Select 的按键处理（select:next/previous/first/last、数字直选、回车确认、输入选项编辑）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-select-input.ts
 * pieces: chunk-p1yqn9ds.js (6)
 * attribution: placement 5, fingerprint 1
 */
import {
  init_react_production,
  useState,
  useEffect,
  useMemo,
} from "../../../vendor/react/cjs/react.production.js";
import { useApp, useFocus } from "../../ink/components/Input.js";
import { getPlatform } from "../../utils/platform.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { isEscapeKey } from "./select-input-option.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { normalizeFullWidthDigits_2 } from "../../utils/stringUtils.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-p1yqn9ds.js:33225-33229 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p1yqn9ds.js:33225", () => {
  init_react_production();
});
//@ chunk-p1yqn9ds.js:33229-33390 placement
/**
 * 收集粘贴事件，等目标输入项获得焦点后再派发（t 为真时）。
 */
function useDeferredPasteForwarding(forwarding) {
  let { dispatchPasteEvent } = useApp();
  let [queue, setQueue] = useState([]);
  useEffect(() => {
    if (queue.length === 0) return;
    setQueue([]);
    if (forwarding) for (let event of queue) dispatchPasteEvent(event);
  }, [queue, forwarding, dispatchPasteEvent]);
  return (enqueue) => {
    setQueue((previous) => [...previous, enqueue]);
  };
}
//@ chunk-p1yqn9ds.js:33390-33580 placement
/**
 * 粘贴事件未被阻止、去掉焦点尾序列后非空（macOS/WSL 允许空粘贴）且 canPaste 未否决时为真。
 */
function isForwardablePaste(event, guard) {
  if (event.defaultPrevented) return false;
  let text = event.rawEndedWithFocusTail ? event.text.replace(/\[[IO]$/, "") : event.text;
  let platform = getPlatform();
  let rawEmptyOnMac = event.rawEmpty && (platform === "macos" || platform === "wsl");
  return (text !== "" || rawEmptyOnMac) && guard?.() !== false;
}
//@ chunk-p1yqn9ds.js:33580-33856 placement
/**
 * 若选项里有接受其他行粘贴的输入项，返回粘贴处理器：焦点不在该项时拦截粘贴、转发并把焦点移过去。
 */
function usePasteIntoInputOption({ options, focusedValue, focusOption, canPaste }) {
  let found = options.find(
    (option) =>
      option.type === "input" && option.takesPasteFromOtherRows === true && option.disabled !== true,
  );
  let deferredPasteForwarding = useDeferredPasteForwarding(
    found !== undefined && focusedValue === found.value,
  );
  if (!found) return;
  return (event) => {
    if (focusedValue === found.value || !isForwardablePaste(event, canPaste)) return;
    event.preventDefault();
    deferredPasteForwarding(event);
    focusOption(found.value);
  };
}
//@ chunk-p1yqn9ds.js:33856-33860 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-p1yqn9ds.js:33856", () => {
  init_react_production();
});
//@ chunk-p1yqn9ds.js:33860-36635 fingerprint (2.1.88 match: useSelectInput, 0.724)
/**
 * Select 按键：select:next/previous/first/last、数字直选、回车提交、输入选项内的编辑与粘贴。
 */
var useSelectInput = ({
  isDisabled = false,
  disableSelection = false,
  state,
  options,
  onUpFromFirstItem,
  onDownFromLastItem,
  onInputModeToggle,
  inputValues,
  imagesSelected = false,
  onEnterImageSelection,
  onExitImageSelection,
  hasInkFocus = true,
}) => {
  let { focusDirection } = useFocus();
  let keybindingContext = useKeybindingContext();
  useRegisterOverlay("select", !!state.onCancel);
  let isInInput = useMemo(
    () => options.find((opt) => opt.value === state.focusedValue)?.type === "input",
    [options, state.focusedValue],
  );
  let keybindingHandlers = useMemo(() => {
    let handlers = {};
    if (!isInInput) {
      handlers["select:next"] = () => {
        let lastOption = options.at(-1);
        if (lastOption && state.getFocusedValue() === lastOption.value) {
          if (onDownFromLastItem) {
            onDownFromLastItem();
            return;
          }
          if (focusDirection("down")) return;
        }
        state.focusNextOption();
      };
      handlers["select:previous"] = () => {
        let firstOption = options[0];
        if (firstOption && state.getFocusedValue() === firstOption.value) {
          if (onUpFromFirstItem) {
            onUpFromFirstItem();
            return;
          }
          if (focusDirection("up")) return;
        }
        state.focusPreviousOption();
      };
      handlers["select:first"] = () => {
        state.focusOption(options[0]?.value);
      };
      handlers["select:last"] = () => {
        state.focusOption(options.at(-1)?.value);
      };
      handlers["select:accept"] = () => {
        if (disableSelection === true) return;
        let focusedValue = state.getFocusedValue();
        if (focusedValue === undefined) return;
        let focusedOption = options.find((opt) => opt.value === focusedValue);
        if (focusedOption?.disabled === true) return;
        if (focusedOption?.type === "input") return;
        state.selectFocusedOption?.();
        state.onChange?.(focusedValue);
      };
    }
    if (state.onCancel)
      handlers["select:cancel"] = () => {
        let focusedValue = state.getFocusedValue();
        let focusedOption = options.find((opt) => opt.value === focusedValue);
        if (
          focusedOption?.type === "input" &&
          focusedOption.vimEditing?.takesEscape &&
          isEscapeKey(keybindingContext?.singleKeyEvent() ?? null)
        )
          return false;
        state.onCancel();
      };
    return handlers;
  }, [
    options,
    state,
    onDownFromLastItem,
    onUpFromFirstItem,
    isInInput,
    disableSelection,
    focusDirection,
    keybindingContext,
  ]);
  MessageActionsKeybindings(keybindingHandlers, {
    context: "Select",
    isActive: !isDisabled && hasInkFocus,
  });
  return {
    handleKeyDown: (event) => {
      if (isDisabled) return;
      let normalizedInput = normalizeFullWidthDigits_2(event.key);
      let focusedValue = state.getFocusedValue();
      let isInputFocused = options.find((opt) => opt.value === focusedValue)?.type === "input";
      if (event.key === "tab") {
        event.preventDefault();
        if (onInputModeToggle && focusedValue !== undefined) onInputModeToggle(focusedValue);
        return;
      }
      if (isInputFocused) {
        if (imagesSelected) {
          if (event.key === "up") {
            event.preventDefault();
            onExitImageSelection?.();
          }
          return;
        }
        if (event.key === "down" && onEnterImageSelection?.()) {
          event.stopImmediatePropagation();
          return;
        }
        if (event.key === "down" || (event.ctrl && event.key === "n")) {
          if (onDownFromLastItem) {
            let lastOption = options.at(-1);
            if (lastOption && focusedValue === lastOption.value) {
              onDownFromLastItem();
              event.stopImmediatePropagation();
              return;
            }
          }
          state.focusNextOption();
          event.stopImmediatePropagation();
          return;
        }
        if (event.key === "up" || (event.ctrl && event.key === "p")) {
          if (onUpFromFirstItem) {
            let firstOption = options[0];
            if (firstOption && focusedValue === firstOption.value) {
              onUpFromFirstItem();
              event.stopImmediatePropagation();
              return;
            }
          }
          state.focusPreviousOption();
          event.stopImmediatePropagation();
          return;
        }
        return;
      }
      if (isInInput) {
        if (event.key === "down" || (event.ctrl && event.key === "n")) {
          if (onDownFromLastItem) {
            let last = options.at(-1);
            if (last && focusedValue === last.value) {
              onDownFromLastItem();
              event.stopImmediatePropagation();
              return;
            }
          }
          state.focusNextOption();
          event.stopImmediatePropagation();
          return;
        }
        if (event.key === "up" || (event.ctrl && event.key === "p")) {
          if (onUpFromFirstItem) {
            let firstOption = options[0];
            if (firstOption && focusedValue === firstOption.value) {
              onUpFromFirstItem();
              event.stopImmediatePropagation();
              return;
            }
          }
          state.focusPreviousOption();
          event.stopImmediatePropagation();
          return;
        }
      }
      if (event.key === "pagedown") {
        event.preventDefault();
        state.focusNextPage();
        return;
      }
      if (event.key === "pageup") {
        event.preventDefault();
        state.focusPreviousPage();
        return;
      }
      if (disableSelection !== true) {
        if (disableSelection !== "numeric" && /^[0-9]$/.test(normalizedInput)) {
          event.preventDefault();
          let index = parseInt(normalizedInput) - 1;
          if (index >= 0 && index < state.options.length) {
            let selectedOption = state.options[index];
            if (selectedOption.disabled === true) return;
            if (selectedOption.type === "input") {
              if ((inputValues?.get(selectedOption.value) ?? "").trim()) {
                state.onChange?.(selectedOption.value);
                return;
              }
              if (selectedOption.allowEmptySubmitToCancel) {
                state.onChange?.(selectedOption.value);
                return;
              }
              state.focusOption(selectedOption.value);
              return;
            }
            state.onChange?.(selectedOption.value);
          }
        }
      }
    },
  };
};
export { useDeferredPasteForwarding, isForwardablePaste, useSelectInput, usePasteIntoInputOption };
