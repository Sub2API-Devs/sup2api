/**
 * components/pluginUi/digitHotkeys.ts
 *
 * 2.1.316 新增。插件面板数字快捷键。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-czq1j3j2.js (5)
 * attribution: placement 5
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { uiSignals } from "../../state/uiSignals.js";
import { useClock } from "../../ink/components/ClockContext.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useRef, useEffect, useCallback } from "../../../vendor/react/cjs/react.production.js";
import { isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useKeybindingContext } from "../../keybindings/KeybindingContext.js";
import { usePreDispatchKeyHandler } from "../../keybindings/useActionHandlers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-czq1j3j2.js:502437-502587 placement
function capturePromptDigits() {
  uiSignals.promptDigitCaptures.setState((state) => ({
    count: state.count + 1,
  }));
  return function () {
    uiSignals.promptDigitCaptures.setState((state) => ({
      count: state.count - 1,
    }));
  };
}
//@ chunk-czq1j3j2.js:502587-502651 placement
function hasDigitCaptures() {
  return uiSignals.promptDigitCaptures.getState().count > 0;
}
//@ chunk-czq1j3j2.js:502651-502810 placement
var DIGIT_HOTKEY_DELAY_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DIGIT_HOTKEY_HOLD_MS;
var AZERTY_DIGIT_MAP;
deferInit("chunk-czq1j3j2.js:502651", () => {
  DIGIT_HOTKEY_DELAY_MS = 400;
  DIGIT_HOTKEY_HOLD_MS = 600;
  AZERTY_DIGIT_MAP = new Map([
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
});
//@ chunk-czq1j3j2.js:502810-502864 placement
function normalizeDigitKey(inputValue) {
  return AZERTY_DIGIT_MAP.get(inputValue) ?? inputValue.normalize("NFKC");
}
//@ chunk-czq1j3j2.js:502864-504351 placement
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
  let inputValueRef = useRef(inputValue);
  let didFireRef = useRef(false);
  let cancelTimerRef = useRef(null);
  let mountedAtRef = useRef(enabled ? Date.now() : null);
  useEffect(() => {
    if (enabled) mountedAtRef.current = Date.now();
  }, [enabled]);
  let isWithinMountDelay = useCallback(
    () =>
      mountDelayMs > 0 &&
      mountedAtRef.current !== null &&
      isWithinRecentInput(inputClock, mountedAtRef.current, mountDelayMs),
    [mountDelayMs, inputClock],
  );
  let didTypeOnceRef = useRef(false);
  let inputValueRef_2 = useRef(inputValue);
  useEffect(() => {
    if (inputValue === inputValueRef_2.current) return;
    inputValueRef_2.current = inputValue;
    didTypeOnceRef.current = inputValue.length === 1 && isWithinMountDelay();
  }, [inputValue, isWithinMountDelay]);
  useEffect(() => {
    if (!enabled) return;
    return capturePromptDigits();
  }, [enabled]);
  let handlersRef = useRef({
    isValidDigit,
    onDigit,
  });
  handlersRef.current = {
    isValidDigit,
    onDigit,
  };
  let keybindingContext = useKeybindingContext();
  usePreDispatchKeyHandler(
    (input, key) => {
      if (!enterConfirms || !enabled || (once && didFireRef.current)) return;
      if (
        inputValue.length !== 1 ||
        (acceptAfterPause && inputValue === inputValueRef.current) ||
        isWithinMountDelay() ||
        (!acceptAfterPause && didTypeOnceRef.current)
      )
        return;
      if (
        !(!acceptAfterPause && keybindingContext !== null) &&
        (!key.return || key.shift || key.ctrl || key.meta || key.super)
      )
        return;
      if (keybindingContext) {
        let resolved = keybindingContext.resolve(input, key, [
          ...keybindingContext.activeContexts,
          "Chat",
          "Global",
        ]);
        if (resolved.type !== "match" || resolved.action !== "chat:submit") return;
      }
      let normalized = inputValue.normalize("NFKC");
      let digit = handlersRef.current.isValidDigit(normalized)
        ? normalized
        : (AZERTY_DIGIT_MAP.get(inputValue) ?? normalized);
      if (!handlersRef.current.isValidDigit(digit)) return;
      if (cancelTimerRef.current !== null) {
        cancelTimerRef.current();
        cancelTimerRef.current = null;
      }
      didFireRef.current = true;
      handlersRef.current.onDigit(digit);
      return true;
    },
    {
      isActive: enabled,
    },
  );
  useEffect(() => {
    if (!enabled || !acceptAfterPause || (once && didFireRef.current)) return;
    if (cancelTimerRef.current !== null) {
      cancelTimerRef.current();
      cancelTimerRef.current = null;
    }
    if (isWithinMountDelay()) return;
    if (inputValue !== inputValueRef.current && inputValue.length === 1) {
      let normalized = inputValue.normalize("NFKC");
      if (handlersRef.current.isValidDigit(normalized))
        cancelTimerRef.current = clock.setTimeout(() => {
          cancelTimerRef.current = null;
          didFireRef.current = true;
          handlersRef.current.onDigit(normalized);
        }, debounceMs);
    }
    return () => {
      if (cancelTimerRef.current !== null) {
        cancelTimerRef.current();
        cancelTimerRef.current = null;
      }
    };
  }, [
    inputValue,
    enabled,
    acceptAfterPause,
    once,
    debounceMs,
    mountDelayMs,
    clock,
    inputClock,
    isWithinMountDelay,
  ]);
}
export { useDigitHotkeys, DIGIT_HOTKEY_HOLD_MS, DIGIT_HOTKEY_DELAY_MS, normalizeDigitKey };
