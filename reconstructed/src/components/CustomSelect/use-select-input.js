/**
 * components/CustomSelect/use-select-input.ts
 *
 * Select 的按键处理（select:next/previous/first/last、数字直选、回车确认、输入选项编辑）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/components/CustomSelect/use-select-input.ts
 * pieces: chunk-ey2qag4x.js (6)
 * attribution: placement 5, fingerprint 1
 */
import { j, y, P, Q } from "../../../vendor/react/cjs/react.production.js";
import { useApp, useFocus } from "../../ink/components/Input.js";
import { getPlatform } from "../../utils/platform.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { Do } from "./select-input-option.js";
import { MessageActionsKeybindings } from "../messageActions.js";
import { normalizeFullWidthDigits_2, replaceIdeographicSpace } from "../../utils/stringUtils.js";

//@ chunk-ey2qag4x.js:33451-33455 placement
j();
/**
 * 收集粘贴事件，等目标输入项获得焦点后再派发（t 为真时）。
 */
//@ chunk-ey2qag4x.js:33455-33616 placement
function useDeferredPasteForwarding(t) {
  let { dispatchPasteEvent: dispatchPasteEvent } = useApp(),
    [i, a] = y([]);
  return (
    P(() => {
      if (i.length === 0) return;
      if ((a([]), t)) for (let l of i) dispatchPasteEvent(l);
    }, [i, t, dispatchPasteEvent]),
    (l) => {
      a((f) => [...f, l]);
    }
  );
}
/**
 * 粘贴事件未被阻止、去掉焦点尾序列后非空（macOS/WSL 允许空粘贴）且 canPaste 未否决时为真。
 */
//@ chunk-ey2qag4x.js:33616-33806 placement
function isForwardablePaste(t, o) {
  if (t.defaultPrevented) return !1;
  let i = t.rawEndedWithFocusTail ? t.text.replace(/\[[IO]$/, "") : t.text,
    a = getPlatform(),
    l = t.rawEmpty && (a === "macos" || a === "wsl");
  return (i !== "" || l) && o?.() !== !1;
}
/**
 * 若选项里有接受其他行粘贴的输入项，返回粘贴处理器：焦点不在该项时拦截粘贴、转发并把焦点移过去。
 */
//@ chunk-ey2qag4x.js:33806-34082 placement
function usePasteIntoInputOption({
  options: options,
  focusedValue: focusedValue,
  focusOption: focusOption,
  canPaste: canPaste,
}) {
  let found = options.find(
      (d) => d.type === "input" && d.takesPasteFromOtherRows === !0 && d.disabled !== !0,
    ),
    f = useDeferredPasteForwarding(found !== void 0 && focusedValue === found.value);
  if (!found) return;
  return (d) => {
    if (focusedValue === found.value || !isForwardablePaste(d, canPaste)) return;
    (d.preventDefault(), f(d), focusOption(found.value));
  };
}
//@ chunk-ey2qag4x.js:34082-34086 placement
j();
/**
 * Select 按键：select:next/previous/first/last、数字直选、回车提交、输入选项内的编辑与粘贴。
 */
//@ chunk-ey2qag4x.js:34086-37014 fingerprint = useSelectInput (0.738)
var useSelectInput = ({
  isDisabled: isDisabled = !1,
  disableSelection: disableSelection = !1,
  state: state,
  options: options,
  isMultiSelect: isMultiSelect = !1,
  onUpFromFirstItem: onUpFromFirstItem,
  onDownFromLastItem: onDownFromLastItem,
  onInputModeToggle: onInputModeToggle,
  inputValues: inputValues,
  imagesSelected: imagesSelected = !1,
  onEnterImageSelection: onEnterImageSelection,
  onExitImageSelection: onExitImageSelection,
  hasInkFocus: hasInkFocus = !0,
}) => {
  let { focusDirection: focusDirection } = useFocus(),
    B = useKeybindingContext();
  useRegisterOverlay("select", !!state.onCancel);
  let isInInput = Q(
      () => options.find((opt) => opt.value === state.focusedValue)?.type === "input",
      [options, state.focusedValue],
    ),
    keybindingHandlers = Q(() => {
      let handlers = {};
      if (!isInInput)
        ((handlers["select:next"] = () => {
          let at = options.at(-1);
          if (at && state.getFocusedValue() === at.value) {
            if (onDownFromLastItem) {
              onDownFromLastItem();
              return;
            }
            if (focusDirection("down")) return;
          }
          state.focusNextOption();
        }),
          (handlers["select:previous"] = () => {
            let W = options[0];
            if (W && state.getFocusedValue() === W.value) {
              if (onUpFromFirstItem) {
                onUpFromFirstItem();
                return;
              }
              if (focusDirection("up")) return;
            }
            state.focusPreviousOption();
          }),
          (handlers["select:first"] = () => {
            state.focusOption(options[0]?.value);
          }),
          (handlers["select:last"] = () => {
            state.focusOption(options.at(-1)?.value);
          }),
          (handlers["select:accept"] = () => {
            if (disableSelection === !0) return;
            let focusedValue = state.getFocusedValue();
            if (focusedValue === void 0) return;
            let found = options.find((D) => D.value === focusedValue);
            if (found?.disabled === !0) return;
            if (found?.type === "input") return;
            (state.selectFocusedOption?.(), state.onChange?.(focusedValue));
          }));
      if (state.onCancel)
        handlers["select:cancel"] = () => {
          let focusedValue = state.getFocusedValue(),
            focusedOption = options.find((opt) => opt.value === focusedValue);
          if (
            focusedOption?.type === "input" &&
            focusedOption.vimEditing?.takesEscape &&
            Do(B?.singleKeyEvent() ?? null)
          )
            return !1;
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
      B,
    ]);
  return (
    MessageActionsKeybindings(keybindingHandlers, {
      context: "Select",
      isActive: !isDisabled && hasInkFocus,
    }),
    {
      handleKeyDown: (m) => {
        if (isDisabled) return;
        let normalizedInput = normalizeFullWidthDigits_2(m.key),
          focusedValue = state.getFocusedValue(),
          focusedOption = options.find((opt) => opt.value === focusedValue),
          L = focusedOption?.type === "input";
        if (m.key === "tab") {
          if ((m.preventDefault(), onInputModeToggle && focusedValue !== void 0))
            onInputModeToggle(focusedValue);
          return;
        }
        if (L) {
          if (imagesSelected) {
            if (m.key === "up") (m.preventDefault(), onExitImageSelection?.());
            return;
          }
          if (m.key === "down" && onEnterImageSelection?.()) {
            m.stopImmediatePropagation();
            return;
          }
          if (m.key === "down" || (m.ctrl && m.key === "n")) {
            if (onDownFromLastItem) {
              let at = options.at(-1);
              if (at && focusedValue === at.value) {
                (onDownFromLastItem(), m.stopImmediatePropagation());
                return;
              }
            }
            (state.focusNextOption(), m.stopImmediatePropagation());
            return;
          }
          if (m.key === "up" || (m.ctrl && m.key === "p")) {
            if (onUpFromFirstItem) {
              let M = options[0];
              if (M && focusedValue === M.value) {
                (onUpFromFirstItem(), m.stopImmediatePropagation());
                return;
              }
            }
            (state.focusPreviousOption(), m.stopImmediatePropagation());
            return;
          }
          return;
        }
        if (isInInput) {
          if (m.key === "down" || (m.ctrl && m.key === "n")) {
            if (onDownFromLastItem) {
              let at = options.at(-1);
              if (at && focusedValue === at.value) {
                (onDownFromLastItem(), m.stopImmediatePropagation());
                return;
              }
            }
            (state.focusNextOption(), m.stopImmediatePropagation());
            return;
          }
          if (m.key === "up" || (m.ctrl && m.key === "p")) {
            if (onUpFromFirstItem) {
              let M = options[0];
              if (M && focusedValue === M.value) {
                (onUpFromFirstItem(), m.stopImmediatePropagation());
                return;
              }
            }
            (state.focusPreviousOption(), m.stopImmediatePropagation());
            return;
          }
        }
        if (m.key === "pagedown") {
          (m.preventDefault(), state.focusNextPage());
          return;
        }
        if (m.key === "pageup") {
          (m.preventDefault(), state.focusPreviousPage());
          return;
        }
        if (disableSelection !== !0) {
          if (isMultiSelect && replaceIdeographicSpace(m.key) === " " && focusedValue !== void 0) {
            if (focusedOption?.disabled !== !0)
              (m.preventDefault(), state.selectFocusedOption?.(), state.onChange?.(focusedValue));
            return;
          }
          if (disableSelection !== "numeric" && /^[0-9]$/.test(normalizedInput)) {
            m.preventDefault();
            let M = parseInt(normalizedInput) - 1;
            if (M >= 0 && M < state.options.length) {
              let E = state.options[M];
              if (E.disabled === !0) return;
              if (E.type === "input") {
                if ((inputValues?.get(E.value) ?? "").trim()) {
                  state.onChange?.(E.value);
                  return;
                }
                if (E.allowEmptySubmitToCancel) {
                  state.onChange?.(E.value);
                  return;
                }
                state.focusOption(E.value);
                return;
              }
              state.onChange?.(E.value);
              return;
            }
          }
        }
      },
    }
  );
};

export { useDeferredPasteForwarding, isForwardablePaste, useSelectInput, usePasteIntoInputOption };
