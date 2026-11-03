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
  return (
    uiSignals.promptDigitCaptures.setState((h) => ({ count: h.count + 1 })),
    function () {
      uiSignals.promptDigitCaptures.setState((x) => ({ count: x.count - 1 }));
    }
  );
}
//@ chunk-18hwfzwa.js:476111-476175 placement
function nde() {
  return uiSignals.promptDigitCaptures.getState().count > 0;
}
//@ chunk-18hwfzwa.js:476175-476334 placement
var DIGIT_HOTKEY_DELAY_MS = 400,
  DIGIT_HOTKEY_HOLD_MS = 600,
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
//@ chunk-18hwfzwa.js:476334-476388 placement
function fT(h) {
  return AZERTY_DIGIT_MAP.get(h) ?? h.normalize("NFKC");
}
//@ chunk-18hwfzwa.js:476388-477875 placement
function useDigitHotkeys({
  inputValue: inputValue,
  isValidDigit: isValidDigit,
  onDigit: onDigit,
  enabled: enabled = !0,
  once: once = !1,
  enterConfirms: enterConfirms = !0,
  acceptAfterPause: acceptAfterPause = !0,
  debounceMs: debounceMs = DIGIT_HOTKEY_DELAY_MS,
  mountDelayMs: mountDelayMs = DIGIT_HOTKEY_HOLD_MS,
}) {
  let We = useClock(),
    ze = useInputClock(),
    Xe = R(inputValue),
    rt = R(!1),
    kt = R(null),
    At = R(enabled ? Date.now() : null);
  P(() => {
    if (enabled) At.current = Date.now();
  }, [enabled]);
  let It = ce(
      () => mountDelayMs > 0 && At.current !== null && isWithinRecentInput(ze, At.current, mountDelayMs),
      [mountDelayMs, ze],
    ),
    Ot = R(!1),
    Et = R(inputValue);
  (P(() => {
    if (inputValue === Et.current) return;
    ((Et.current = inputValue), (Ot.current = inputValue.length === 1 && It()));
  }, [inputValue, It]),
    P(() => {
      if (!enabled) return;
      return capturePromptDigits();
    }, [enabled]));
  let Dt = R({ isValidDigit: isValidDigit, onDigit: onDigit });
  Dt.current = { isValidDigit: isValidDigit, onDigit: onDigit };
  let Lt = useKeybindingContext();
  (usePreDispatchKeyHandler(
    (oo, Xt) => {
      if (!enterConfirms || !enabled || (once && rt.current)) return;
      if (
        inputValue.length !== 1 ||
        (acceptAfterPause && inputValue === Xe.current) ||
        It() ||
        (!acceptAfterPause && Ot.current)
      )
        return;
      if (!(!acceptAfterPause && Lt !== null) && (!Xt.return || Xt.shift || Xt.ctrl || Xt.meta || Xt.super))
        return;
      if (Lt) {
        let resolved = Lt.resolve(oo, Xt, [...Lt.activeContexts, "Chat", "Global"]);
        if (resolved.type !== "match" || resolved.action !== "chat:submit") return;
      }
      let normalized = inputValue.normalize("NFKC"),
        po = Dt.current.isValidDigit(normalized)
          ? normalized
          : (AZERTY_DIGIT_MAP.get(inputValue) ?? normalized);
      if (!Dt.current.isValidDigit(po)) return;
      if (kt.current !== null) (kt.current(), (kt.current = null));
      return ((rt.current = !0), Dt.current.onDigit(po), !0);
    },
    { isActive: enabled },
  ),
    P(() => {
      if (!enabled || !acceptAfterPause || (once && rt.current)) return;
      if (kt.current !== null) (kt.current(), (kt.current = null));
      if (It()) return;
      if (inputValue !== Xe.current && inputValue.length === 1) {
        let normalized = inputValue.normalize("NFKC");
        if (Dt.current.isValidDigit(normalized))
          kt.current = We.setTimeout(() => {
            ((kt.current = null), (rt.current = !0), Dt.current.onDigit(normalized));
          }, debounceMs);
      }
      return () => {
        if (kt.current !== null) (kt.current(), (kt.current = null));
      };
    }, [inputValue, enabled, acceptAfterPause, once, debounceMs, mountDelayMs, We, ze, It]));
}

export { useDigitHotkeys, DIGIT_HOTKEY_HOLD_MS, DIGIT_HOTKEY_DELAY_MS, fT };
