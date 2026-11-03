/**
 * components/pluginUi/digitHotkeys.ts
 *
 * 2.1.316 新增。插件面板数字快捷键。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (5)
 * attribution: placement 5
 */
import { uiSignals } from "../../state/uiSignals.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInputClock } from "../../ink/components/Input.js";
import { R, P, ce } from "../../../vendor/react/cjs/react.production.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";

//@ chunk-18hwfzwa.js:475961-476111 placement
function capturePromptDigits() {
  uiSignals.promptDigitCaptures.setState((h) => ({
    count: h.count + 1,
  }));
  return function () {
    uiSignals.promptDigitCaptures.setState((x) => ({
      count: x.count - 1,
    }));
  };
}
//@ chunk-18hwfzwa.js:476111-476175 placement
function hasDigitCaptures() {
  return uiSignals.promptDigitCaptures.getState().count > 0;
}
//@ chunk-18hwfzwa.js:476175-476334 placement
var DIGIT_HOTKEY_DELAY_MS = 400;
var DIGIT_HOTKEY_HOLD_MS = 600;
var AZERTY_DIGIT_MAP = new Map([
  ["&", "1"],
  ["\xE9", "2"],
  ['"', "3"],
  ["'", "4"],
  ["(", "5"],
  ["-", "6"],
  ["\xA7", "6"],
  ["\xE8", "7"],
  ["_", "8"],
  ["\xE7", "9"],
  ["\xE0", "0"],
]);
//@ chunk-18hwfzwa.js:476334-476388 placement
function normalizeDigitKey(inputValue) {
  return AZERTY_DIGIT_MAP.get(inputValue) ?? inputValue.normalize("NFKC");
}
//@ chunk-18hwfzwa.js:476388-477875 placement
function useDigitHotkeys({
  inputValue,
  isValidDigit,
  onDigit,
  enabled = true,
  once = false,
  enterConfirms = true,
  acceptAfterPause = true,
  debounceMs = DIGIT_HOTKEY_DELAY_MS,
  mountDelayMs = DIGIT_HOTKEY_HOLD_MS,
}) {
  let clock = useClock();
  let inputClock = useInputClock();
  let inputValueRef = R(inputValue);
  let rt = R(false);
  let kt = R(null);
  let At = R(enabled ? Date.now() : null);
  P(() => {
    if (enabled) At.current = Date.now();
  }, [enabled]);
  let It = ce(
    () =>
      mountDelayMs > 0 && At.current !== null && isWithinRecentInput(inputClock, At.current, mountDelayMs),
    [mountDelayMs, inputClock],
  );
  let Ot = R(false);
  let inputValueRef_2 = R(inputValue);
  P(() => {
    if (inputValue === inputValueRef_2.current) return;
    inputValueRef_2.current = inputValue;
    Ot.current = inputValue.length === 1 && It();
  }, [inputValue, It]);
  P(() => {
    if (!enabled) return;
    return capturePromptDigits();
  }, [enabled]);
  let Dt = R({
    isValidDigit,
    onDigit,
  });
  Dt.current = {
    isValidDigit,
    onDigit,
  };
  let keybindingContext = useKeybindingContext();
  usePreDispatchKeyHandler(
    (oo, Xt) => {
      if (!enterConfirms || !enabled || (once && rt.current)) return;
      if (
        inputValue.length !== 1 ||
        (acceptAfterPause && inputValue === inputValueRef.current) ||
        It() ||
        (!acceptAfterPause && Ot.current)
      )
        return;
      if (
        !(!acceptAfterPause && keybindingContext !== null) &&
        (!Xt.return || Xt.shift || Xt.ctrl || Xt.meta || Xt.super)
      )
        return;
      if (keybindingContext) {
        let resolved = keybindingContext.resolve(oo, Xt, [
          ...keybindingContext.activeContexts,
          "Chat",
          "Global",
        ]);
        if (resolved.type !== "match" || resolved.action !== "chat:submit") return;
      }
      let normalized = inputValue.normalize("NFKC");
      let po = Dt.current.isValidDigit(normalized)
        ? normalized
        : (AZERTY_DIGIT_MAP.get(inputValue) ?? normalized);
      if (!Dt.current.isValidDigit(po)) return;
      if (kt.current !== null) {
        kt.current();
        kt.current = null;
      }
      rt.current = true;
      Dt.current.onDigit(po);
      return true;
    },
    {
      isActive: enabled,
    },
  );
  P(() => {
    if (!enabled || !acceptAfterPause || (once && rt.current)) return;
    if (kt.current !== null) {
      kt.current();
      kt.current = null;
    }
    if (It()) return;
    if (inputValue !== inputValueRef.current && inputValue.length === 1) {
      let normalized = inputValue.normalize("NFKC");
      if (Dt.current.isValidDigit(normalized))
        kt.current = clock.setTimeout(() => {
          kt.current = null;
          rt.current = true;
          Dt.current.onDigit(normalized);
        }, debounceMs);
    }
    return () => {
      if (kt.current !== null) {
        kt.current();
        kt.current = null;
      }
    };
  }, [inputValue, enabled, acceptAfterPause, once, debounceMs, mountDelayMs, clock, inputClock, It]);
}
export { useDigitHotkeys, DIGIT_HOTKEY_HOLD_MS, DIGIT_HOTKEY_DELAY_MS, normalizeDigitKey };
