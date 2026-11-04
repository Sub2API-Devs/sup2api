/**
 * components/CustomSelect/selectTypeahead.tsx
 *
 * 2.1.316 新增：多选列表组件（提交按钮、默认值、输入拒绝）；通用单选列表组件（标题、标签、禁用、默认值、输入拒绝）等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-ey2qag4x.js (71)
 * attribution: placement 71
 */
import {
  init_react_production,
  useRef,
  useCallback,
  useState,
  fragmentTypeExport,
  useEffect,
  isValidElement_default,
  createContext,
  childrenExport,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import { RECENT_INPUT_GUARD_MS_2, isWithinRecentInput } from "../../hooks/useRecentInputGuard.js";
import { useInputClock } from "../../ink/components/Input.js";
import { useTimeout } from "../../ink/hooks/useTerminalHooks.js";
import { useMemoCache } from "../../../vendor/react/compiler-runtime.js";
import { MEMO_CACHE_SENTINEL } from "../../../runtime/bun-runtime.js";
import {
  truncateCodePoints,
  normalizeFullWidthDigits_2,
  replaceIdeographicSpace,
} from "../../utils/stringUtils.js";
import { isArrowNavEnabled } from "../../utils/accessibility/screenReader.js";
import { useFocusOnMount } from "../../hooks/useFocusOnMount.js";
import { useRegisterOverlay } from "../../context/overlayContext.js";
import { reactNodeText } from "../../utils/reactText.js";
import { bunStringWidth } from "../../ink/stringWidth.js";
import { useDeclaredCursor } from "../../ink/hooks/use-declared-cursor.js";
import {
  jsxProd_default_2,
  jsxProd_default,
} from "../../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../../ink/components/Text.js";
import { sequential } from "../../utils/sequential.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-ey2qag4x.js:1685-1689 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:1685", () => {
  init_react_production();
});
//@ chunk-ey2qag4x.js:1689-1693 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:1689", () => {
  init_react_production();
});
//@ chunk-ey2qag4x.js:1693-1777 placement
/**
 * 打开后一段时间内拒绝输入的判断（防止误触）。
 */
function useInputRefusalWindow(windowMs = RECENT_INPUT_GUARD_MS_2) {
  let inputClock = useInputClock();
  let openedAtRef = useRef(Date.now());
  return useCallback(
    () => isWithinRecentInput(inputClock, openedAtRef.current, windowMs),
    [inputClock, windowMs],
  );
}
//@ chunk-ey2qag4x.js:1777-1820 placement
/**
 * 组件挂载时间。
 */
function useMountTime() {
  return useRef(Date.now()).current;
}
//@ chunk-ey2qag4x.js:1820-1902 placement
/**
 * 根据是否已过冷静期返回 remountKey（settled/held）。
 */
function settleKey(epoch, windowMs = RECENT_INPUT_GUARD_MS_2) {
  let timeout = useTimeout(windowMs, epoch);
  return {
    remountKey: timeout ? "settled" : "held",
    settled: timeout,
  };
}
//@ chunk-ey2qag4x.js:1902-1986 placement
/**
 * typeahead 的 epoch 追踪器：返回 {epoch, noteAttempt}，值变化时用它重置内部状态。
 */
function typeaheadEpochTracker() {
  let [epoch, setEpoch] = useState(0);
  let noteAttempt = useCallback(() => setEpoch((previous) => previous + 1), []);
  return {
    epoch,
    noteAttempt,
  };
}
//@ chunk-ey2qag4x.js:1986-2192 placement
/**
 * 记录最近一次被拒输入并判断是否仍在拒绝窗口内。
 */
function useRefusalTracker() {
  let inputClock = useInputClock();
  let refusedAtRef = useRef(null);
  let { epoch, noteAttempt } = typeaheadEpochTracker();
  let refusedWithin = useCallback(
    (windowMs = RECENT_INPUT_GUARD_MS_2) =>
      refusedAtRef.current !== null && isWithinRecentInput(inputClock, refusedAtRef.current, windowMs),
    [inputClock],
  );
  let noteRefused = useCallback(() => {
    refusedAtRef.current = Date.now();
    noteAttempt();
  }, [noteAttempt]);
  return {
    refusedWithin,
    noteRefused,
    epoch,
  };
}
//@ chunk-ey2qag4x.js:2192-2232 placement
function optionValueString(option) {
  return String(option.value);
}
//@ chunk-ey2qag4x.js:2232-2258 placement
function nullPlaceholder1() {
  return null;
}
//@ chunk-ey2qag4x.js:2258-2281 placement
function emptyPlaceholder1() {
  return "";
}
//@ chunk-ey2qag4x.js:2281-2307 placement
function nullPlaceholder2() {
  return null;
}
//@ chunk-ey2qag4x.js:2307-2330 placement
function emptyPlaceholder2() {
  return "";
}
//@ chunk-ey2qag4x.js:2330-2353 placement
function emptyPlaceholder3() {
  return "";
}
//@ chunk-ey2qag4x.js:2353-2379 placement
function nullPlaceholder3() {
  return null;
}
//@ chunk-ey2qag4x.js:2379-2402 placement
function emptyPlaceholder4() {
  return "";
}
//@ chunk-ey2qag4x.js:2402-2425 placement
function emptyPlaceholder5() {
  return "";
}
//@ chunk-ey2qag4x.js:2425-2451 placement
function nullPlaceholder4() {
  return null;
}
//@ chunk-ey2qag4x.js:2451-2474 placement
function emptyPlaceholder6() {
  return "";
}
//@ chunk-ey2qag4x.js:2474-2500 placement
function nullPlaceholder5() {
  return null;
}
//@ chunk-ey2qag4x.js:2500-2526 placement
function nullPlaceholder6() {
  return null;
}
//@ chunk-ey2qag4x.js:2526-2549 placement
function emptyPlaceholder7() {
  return "";
}
//@ chunk-ey2qag4x.js:2549-2590 placement = _temp7 (1)
function isNotInputOption(opt) {
  return opt.type !== "input";
}
//@ chunk-ey2qag4x.js:2590-2613 placement
function emptyPlaceholder8() {
  return "";
}
//@ chunk-ey2qag4x.js:2613-2639 placement
function nullPlaceholder8() {
  return null;
}
//@ chunk-ey2qag4x.js:2639-2679 placement
function optionValueString_2(option) {
  return String(option.value);
}
//@ chunk-ey2qag4x.js:2679-2705 placement
function nullPlaceholder9() {
  return null;
}
//@ chunk-ey2qag4x.js:2705-2731 placement
function nullPlaceholder10() {
  return null;
}
//@ chunk-ey2qag4x.js:2731-2754 placement
function emptyPlaceholder9() {
  return "";
}
//@ chunk-ey2qag4x.js:2754-2780 placement
function nullPlaceholder7() {
  return null;
}
//@ chunk-ey2qag4x.js:2780-2803 placement
function emptyPlaceholder10() {
  return "";
}
//@ chunk-ey2qag4x.js:2803-2826 placement
function emptyPlaceholder11() {
  return "";
}
//@ chunk-ey2qag4x.js:2826-2852 placement
function nullPlaceholder11() {
  return null;
}
//@ chunk-ey2qag4x.js:2852-2878 placement
function nullPlaceholder12() {
  return null;
}
//@ chunk-ey2qag4x.js:2878-2904 placement
function nullPlaceholder13() {
  return null;
}
//@ chunk-ey2qag4x.js:2904-2927 placement
function emptyPlaceholder12() {
  return "";
}
//@ chunk-ey2qag4x.js:2927-2950 placement
function emptyPlaceholder13() {
  return "";
}
//@ chunk-ey2qag4x.js:2950-2973 placement
function emptyPlaceholder14() {
  return "";
}
//@ chunk-ey2qag4x.js:2973-2996 placement
function emptyPlaceholder15() {
  return "";
}
//@ chunk-ey2qag4x.js:2996-3022 placement
function nullPlaceholder14() {
  return null;
}
//@ chunk-ey2qag4x.js:3022-3048 placement
function nullPlaceholder15() {
  return null;
}
//@ chunk-ey2qag4x.js:3048-3074 placement
function nullPlaceholder19() {
  return null;
}
//@ chunk-ey2qag4x.js:3074-3115 placement = _temp7 (1)
function isNotInputOption_2(opt) {
  return opt.type !== "input";
}
//@ chunk-ey2qag4x.js:3115-3138 placement
function emptyPlaceholder16() {
  return "";
}
//@ chunk-ey2qag4x.js:3138-3170 placement
function subtract(left, right) {
  return left - right;
}
//@ chunk-ey2qag4x.js:3170-3206 placement
function nextIndexString(index) {
  return String(index + 1);
}
//@ chunk-ey2qag4x.js:3206-3232 placement
function nullPlaceholder16() {
  return null;
}
//@ chunk-ey2qag4x.js:3232-3255 placement
function emptyPlaceholder17() {
  return "";
}
//@ chunk-ey2qag4x.js:3255-3281 placement
function nullPlaceholder17() {
  return null;
}
//@ chunk-ey2qag4x.js:3281-3307 placement
function nullPlaceholder18() {
  return null;
}
//@ chunk-ey2qag4x.js:3307-3330 placement
function emptyPlaceholder18() {
  return "";
}
//@ chunk-ey2qag4x.js:3330-3353 placement
function emptyPlaceholder19() {
  return "";
}
//@ chunk-ey2qag4x.js:3353-3391 placement
function dropLastChar(text) {
  return text.slice(0, -1);
}
//@ chunk-ey2qag4x.js:3391-3580 placement
function useStateWithRef(initial) {
  let $ = useMemoCache(3);
  let [value, setValue] = useState(initial);
  let ref = useRef(initial);
  let update;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    update = (next) => {
      ref.current = next(ref.current);
      setValue(ref.current);
    };
    $[0] = update;
  } else update = $[0];
  let update_ = update;
  let tuple;
  if ($[1] !== value) {
    tuple = [value, ref, update_];
    $[1] = value;
    $[2] = tuple;
  } else tuple = $[2];
  return tuple;
}
//@ chunk-ey2qag4x.js:3580-3608 placement
function useStringStateWithRef() {
  return useStateWithRef("");
}
//@ chunk-ey2qag4x.js:3608-3749 placement
function formatOrList(items) {
  if (items.length <= 1) return items[0] ?? "";
  if (items.length === 2) return `${items[0]} or ${items[1]}`;
  return `${items.slice(0, -1).join(", ")}, or ${items.at(-1)}`;
}
//@ chunk-ey2qag4x.js:3749-3760 placement
var MAX_OPTION_LABEL_CHARS = 300;
//@ chunk-ey2qag4x.js:3760-3813 placement
function moreCharactersSuffix(remaining) {
  return ` \u2026 +${remaining} more characters`;
}
//@ chunk-ey2qag4x.js:3813-3924 placement
function truncateOptionLabel(text) {
  if (text.length <= MAX_OPTION_LABEL_CHARS) return text;
  let truncated = truncateCodePoints(text, MAX_OPTION_LABEL_CHARS);
  if (truncated === text) return text;
  let droppedChars = [...text].length - MAX_OPTION_LABEL_CHARS;
  return truncated + moreCharactersSuffix(droppedChars);
}
//@ chunk-ey2qag4x.js:3924-4554 placement
/**
 * 组合打开时间与拒绝记录，给出 refuse/refuseCharacter 判断。
 */
function useRefuseInput(openedAt, windowMs) {
  let $ = useMemoCache(18);
  let windowMs_ = windowMs === undefined ? RECENT_INPUT_GUARD_MS_2 : windowMs;
  let inputClock = useInputClock();
  let inputRefusalWindow = useInputRefusalWindow(windowMs_);
  let refuseBase;
  if ($[0] !== openedAt || $[1] !== inputClock || $[2] !== inputRefusalWindow || $[3] !== windowMs_) {
    refuseBase =
      openedAt === undefined
        ? inputRefusalWindow
        : () => isWithinRecentInput(inputClock, openedAt, windowMs_);
    $[0] = openedAt;
    $[1] = inputClock;
    $[2] = inputRefusalWindow;
    $[3] = windowMs_;
    $[4] = refuseBase;
  } else refuseBase = $[4];
  let baseRefuse = refuseBase;
  let { refusedWithin, noteRefused } = useRefusalTracker();
  let refuse;
  if ($[5] !== baseRefuse || $[6] !== noteRefused || $[7] !== refusedWithin || $[8] !== windowMs_) {
    refuse = () => {
      if (baseRefuse() || refusedWithin(windowMs_)) {
        noteRefused();
        return true;
      }
      return false;
    };
    $[5] = baseRefuse;
    $[6] = noteRefused;
    $[7] = refusedWithin;
    $[8] = windowMs_;
    $[9] = refuse;
  } else refuse = $[9];
  let refuse_2 = refuse;
  let refuseCharacter;
  if ($[10] !== baseRefuse || $[11] !== noteRefused || $[12] !== refusedWithin || $[13] !== windowMs_) {
    refuseCharacter = () => {
      if (!baseRefuse() && !refusedWithin(windowMs_)) {
        return false;
      }
      noteRefused();
      return true;
    };
    $[10] = baseRefuse;
    $[11] = noteRefused;
    $[12] = refusedWithin;
    $[13] = windowMs_;
    $[14] = refuseCharacter;
  } else refuseCharacter = $[14];
  let refuseCharacter_2 = refuseCharacter;
  let result;
  if ($[15] !== refuse_2 || $[16] !== refuseCharacter_2) {
    result = {
      refuse: refuse_2,
      refuseCharacter: refuseCharacter_2,
    };
    $[15] = refuse_2;
    $[16] = refuseCharacter_2;
    $[17] = result;
  } else result = $[17];
  return result;
}
//@ chunk-ey2qag4x.js:4554-9171 placement
/**
 * 通用单选列表组件（标题、标签、禁用、默认值、输入拒绝）。
 */
function Select(props) {
  let $ = useMemoCache(73);
  let {
    options,
    onChange,
    onFocus,
    onCancel,
    isDisabled,
    disableSelection,
    defaultValue,
    refuseInput,
    headings,
    drawLabels,
    hidePromptWhileDisabled,
  } = props;
  let isDisabledFlag = isDisabled === undefined ? false : isDisabled;
  let selectionDisabled = disableSelection === undefined ? false : disableSelection;
  let drawLabel = drawLabels === undefined ? false : drawLabels;
  let hidePrompt = hidePromptWhileDisabled === undefined ? false : hidePromptWhileDisabled;
  let [typedText, typedRef, setTyped] = useStringStateWithRef();
  let [errorMessage, setErrorMessage] = useState(null);
  let arrowNavCached;
  if ($[0] === MEMO_CACHE_SENTINEL) {
    arrowNavCached = isArrowNavEnabled();
    $[0] = arrowNavCached;
  } else arrowNavCached = $[0];
  let arrowNavEnabled = arrowNavCached;
  let [focusIndex, focusRef, setFocusIndex] = useStateWithRef(null);
  let optionsKeyCached;
  if ($[1] !== options) {
    optionsKeyCached = options.map(optionValueString).join("\x00");
    $[1] = options;
    $[2] = optionsKeyCached;
  } else optionsKeyCached = $[2];
  let optionsKey = optionsKeyCached;
  let [lastOptionsKey, setLastOptionsKey] = useState(optionsKey);
  if (lastOptionsKey !== optionsKey) {
    setLastOptionsKey(optionsKey);
    setFocusIndex(nullPlaceholder1);
    setTyped(emptyPlaceholder1);
  }
  let [inputOptionIndex, inputOptionIndexRef, setInputOptionIndex] = useStateWithRef(null);
  if (lastOptionsKey !== optionsKey && inputOptionIndex !== null) {
    setInputOptionIndex(nullPlaceholder2);
    setTyped(emptyPlaceholder2);
  }
  let inputOption =
    inputOptionIndex !== null && options[inputOptionIndex - 1]?.type === "input"
      ? options[inputOptionIndex - 1]
      : null;
  let containerRef = useRef(null);
  useFocusOnMount(containerRef, !isDisabledFlag);
  useRegisterOverlay("select", !!onCancel && !isDisabledFlag);
  let commitCached;
  if (
    $[3] !== selectionDisabled ||
    $[4] !== inputOption ||
    $[5] !== onChange ||
    $[6] !== onFocus ||
    $[7] !== options ||
    $[8] !== setTyped ||
    $[9] !== setFocusIndex ||
    $[10] !== setInputOptionIndex
  ) {
    commitCached = (rawInput) => {
      if (selectionDisabled) {
        return;
      }
      if (inputOption) {
        if (rawInput === "" && !inputOption.screenReaderEmptySubmit) {
          setErrorMessage("Enter some text, or Escape for the list.");
          return;
        }
        if (onChange?.(inputOption.value) === false) {
          return;
        }
        setTyped(emptyPlaceholder3);
        setInputOptionIndex(nullPlaceholder3);
        return;
      }
      let selectedNumber = Number.parseInt(rawInput, 10);
      if (!Number.isFinite(selectedNumber) || selectedNumber < 1 || selectedNumber > options.length) {
        setErrorMessage(
          options.length === 0
            ? `Invalid selection "${rawInput}". Nothing to select.`
            : `Invalid selection "${rawInput}". Enter a number between 1 and ${options.length}.`,
        );
        setTyped(emptyPlaceholder4);
        return;
      }
      let option = options[selectedNumber - 1];
      if (option.disabled) {
        setErrorMessage(`Option ${selectedNumber} is disabled.`);
        setTyped(emptyPlaceholder5);
        return;
      }
      if (option.type === "input") {
        setInputOptionIndex(() => selectedNumber);
        setFocusIndex(nullPlaceholder4);
        let initialValue = option.initialValue ?? "";
        setTyped(() => initialValue);
        option.onChange(initialValue);
        onFocus?.(option.value);
        return;
      }
      if (onChange?.(option.value) === false) {
        return;
      }
      setTyped(emptyPlaceholder6);
      setFocusIndex(nullPlaceholder5);
    };
    $[3] = selectionDisabled;
    $[4] = inputOption;
    $[5] = onChange;
    $[6] = onFocus;
    $[7] = options;
    $[8] = setTyped;
    $[9] = setFocusIndex;
    $[10] = setInputOptionIndex;
    $[11] = commitCached;
  } else commitCached = $[11];
  let commit = commitCached;
  let keyHandlerCached;
  if (
    $[12] !== typedRef ||
    $[13] !== selectionDisabled ||
    $[14] !== focusRef ||
    $[15] !== inputOption ||
    $[16] !== inputOptionIndexRef ||
    $[17] !== isDisabledFlag ||
    $[18] !== onCancel ||
    $[19] !== onFocus ||
    $[20] !== options ||
    $[21] !== refuseInput ||
    $[22] !== setTyped ||
    $[23] !== setFocusIndex ||
    $[24] !== setInputOptionIndex ||
    $[25] !== commit
  ) {
    keyHandlerCached = (event) => {
      if (isDisabledFlag) {
        return;
      }
      if (event.key === "escape" && event.name === "escape") {
        event.preventDefault();
        if (inputOption) {
          if (inputOption.onChange(inputOption.initialValue ?? "") === false) {
            return;
          }
          setInputOptionIndex(nullPlaceholder6);
          setTyped(emptyPlaceholder7);
          let defaultOption = options.find(isNotInputOption) ?? options[0];
          if (defaultOption) onFocus?.(defaultOption.value);
          return;
        }
        onCancel?.();
        return;
      }
      if (selectionDisabled) {
        return;
      }
      if (event.key === "return" && event.name === "return") {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        if (inputOption || typedRef.current.length > 0) {
          commit(typedRef.current);
          return;
        }
        if (arrowNavEnabled && focusRef.current !== null) commit(String(focusRef.current + 1));
        return;
      }
      if (event.key === "backspace" || event.key === "delete") {
        event.preventDefault();
        let sliced = typedRef.current.slice(0, -1);
        if (inputOption && inputOption.onChange(sliced) === false) {
          return;
        }
        setTyped(() => sliced);
        return;
      }
      if (
        arrowNavEnabled &&
        !inputOption &&
        inputOptionIndexRef.current === null &&
        (event.name === "up" || event.name === "down")
      ) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        setErrorMessage(null);
        setTyped(emptyPlaceholder8);
        let optionCount = options.length;
        if (optionCount === 0) {
          return;
        }
        let currentFocus = focusRef.current;
        let nextFocus =
          currentFocus === null
            ? event.name === "down"
              ? 0
              : optionCount - 1
            : (currentFocus + (event.name === "down" ? 1 : -1) + optionCount) % optionCount;
        setFocusIndex(() => nextFocus);
        let focusedOption = options[nextFocus];
        if (focusedOption) onFocus?.(focusedOption.value);
        return;
      }
      if (inputOption) {
        if (event.key.length === 1 && !event.ctrl && !event.meta) {
          event.preventDefault();
          let nextTyped = typedRef.current + event.key;
          if (inputOption.onChange(nextTyped) === false) {
            return;
          }
          setTyped(() => nextTyped);
        }
        return;
      }
      let normalizedKey = normalizeFullWidthDigits_2(event.key);
      if (/^[0-9]$/.test(normalizedKey)) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        setErrorMessage(null);
        setTyped((previous) => previous + normalizedKey);
        setFocusIndex(nullPlaceholder8);
      }
    };
    $[12] = typedRef;
    $[13] = selectionDisabled;
    $[14] = focusRef;
    $[15] = inputOption;
    $[16] = inputOptionIndexRef;
    $[17] = isDisabledFlag;
    $[18] = onCancel;
    $[19] = onFocus;
    $[20] = options;
    $[21] = refuseInput;
    $[22] = setTyped;
    $[23] = setFocusIndex;
    $[24] = setInputOptionIndex;
    $[25] = commit;
    $[26] = keyHandlerCached;
  } else keyHandlerCached = $[26];
  let onKeyDown = keyHandlerCached;
  let announcement;
  if (
    $[27] !== typedText ||
    $[28] !== inputOption ||
    $[29] !== inputOptionIndex ||
    $[30] !== onCancel ||
    $[31] !== options.length
  ) {
    announcement = inputOption
      ? `Enter text for option ${inputOptionIndex} (${reactNodeText(inputOption.label)}), or Escape for the list: ${typedText}`
      : options.length === 0
        ? `Nothing to select${onCancel ? ". Escape to cancel" : ""}: ${typedText}`
        : `Select with numbers [1-${options.length}]${arrowNavEnabled ? " or up / down arrow keys" : ""}. Then ${formatOrList(["Enter to submit", ...(onCancel ? ["Escape to cancel"] : [])])}: ${typedText}`;
    $[27] = typedText;
    $[28] = inputOption;
    $[29] = inputOptionIndex;
    $[30] = onCancel;
    $[31] = options.length;
    $[32] = announcement;
  } else announcement = $[32];
  let announcementText = announcement;
  let column;
  if ($[33] !== announcementText) {
    column = bunStringWidth(announcementText);
    $[33] = announcementText;
    $[34] = column;
  } else column = $[34];
  const active = !isDisabledFlag && !selectionDisabled && focusIndex === null;
  let cursorOptions;
  if ($[35] !== column || $[36] !== active) {
    cursorOptions = {
      line: 0,
      column,
      active,
      visible: true,
    };
    $[35] = column;
    $[36] = active;
    $[37] = cursorOptions;
  } else cursorOptions = $[37];
  let ref = useDeclaredCursor(cursorOptions);
  let containerProps;
  if ($[38] !== onKeyDown || $[39] !== isDisabledFlag) {
    containerProps = isDisabledFlag
      ? {}
      : {
          tabIndex: 0,
          onKeyDown,
        };
    $[38] = onKeyDown;
    $[39] = isDisabledFlag;
    $[40] = containerProps;
  } else containerProps = $[40];
  let optionElements;
  if (
    $[41] !== defaultValue ||
    $[42] !== selectionDisabled ||
    $[43] !== drawLabel ||
    $[44] !== focusIndex ||
    $[45] !== headings ||
    $[46] !== isDisabledFlag ||
    $[47] !== options
  ) {
    let renderOption;
    if (
      $[49] !== defaultValue ||
      $[50] !== selectionDisabled ||
      $[51] !== drawLabel ||
      $[52] !== focusIndex ||
      $[53] !== headings ||
      $[54] !== isDisabledFlag
    ) {
      renderOption = (option, index) =>
        jsxProd_default_2(
          fragmentTypeExport,
          {
            children: [
              headings?.get(index),
              jsxProd_default(SelectOptionLabel, {
                index: index + 1,
                option,
                selected: defaultValue !== undefined && option.value === defaultValue,
                focused: focusIndex === index && !isDisabledFlag && !selectionDisabled,
                drawLabel,
              }),
            ],
          },
          String(option.value),
        );
      $[49] = defaultValue;
      $[50] = selectionDisabled;
      $[51] = drawLabel;
      $[52] = focusIndex;
      $[53] = headings;
      $[54] = isDisabledFlag;
      $[55] = renderOption;
    } else renderOption = $[55];
    optionElements = options.map(renderOption);
    $[41] = defaultValue;
    $[42] = selectionDisabled;
    $[43] = drawLabel;
    $[44] = focusIndex;
    $[45] = headings;
    $[46] = isDisabledFlag;
    $[47] = options;
    $[48] = optionElements;
  } else optionElements = $[48];
  let trailingHeading;
  if ($[56] !== headings || $[57] !== options.length) {
    trailingHeading = headings?.get(options.length);
    $[56] = headings;
    $[57] = options.length;
    $[58] = trailingHeading;
  } else trailingHeading = $[58];
  let errorElement;
  if ($[59] !== errorMessage) {
    errorElement =
      errorMessage &&
      jsxProd_default(Text, {
        children: errorMessage,
      });
    $[59] = errorMessage;
    $[60] = errorElement;
  } else errorElement = $[60];
  let promptElement;
  if (
    $[61] !== ref ||
    $[62] !== selectionDisabled ||
    $[63] !== hidePrompt ||
    $[64] !== isDisabledFlag ||
    $[65] !== announcementText
  ) {
    promptElement =
      !selectionDisabled &&
      !(isDisabledFlag && hidePrompt) &&
      jsxProd_default(Box, {
        ref,
        children: jsxProd_default(Text, {
          children: announcementText,
        }),
      });
    $[61] = ref;
    $[62] = selectionDisabled;
    $[63] = hidePrompt;
    $[64] = isDisabledFlag;
    $[65] = announcementText;
    $[66] = promptElement;
  } else promptElement = $[66];
  let selectElement;
  if (
    $[67] !== containerProps ||
    $[68] !== optionElements ||
    $[69] !== trailingHeading ||
    $[70] !== errorElement ||
    $[71] !== promptElement
  ) {
    selectElement = jsxProd_default_2(Box, {
      ref: containerRef,
      flexDirection: "column",
      ...containerProps,
      children: [optionElements, trailingHeading, errorElement, promptElement],
    });
    $[67] = containerProps;
    $[68] = optionElements;
    $[69] = trailingHeading;
    $[70] = errorElement;
    $[71] = promptElement;
    $[72] = selectElement;
  } else selectElement = $[72];
  return selectElement;
}
//@ chunk-ey2qag4x.js:9171-15553 placement
/**
 * 多选列表组件（提交按钮、默认值、输入拒绝）。
 */
function MultiSelect(props) {
  let $ = useMemoCache(91);
  let {
    options,
    defaultValue,
    onChange,
    onSubmit,
    onFocus,
    onCancel,
    isDisabled,
    submitButtonText,
    refuseInput,
  } = props;
  let defaultValuesCached;
  if ($[0] !== defaultValue) {
    defaultValuesCached = defaultValue === undefined ? [] : defaultValue;
    $[0] = defaultValue;
    $[1] = defaultValuesCached;
  } else defaultValuesCached = $[1];
  let defaultValues = defaultValuesCached;
  let isDisabledFlag = isDisabled === undefined ? false : isDisabled;
  let [typedText, typedRef, setTyped] = useStringStateWithRef();
  let [errorMessage, setErrorMessage] = useState(null);
  let arrowNavCached;
  if ($[2] === MEMO_CACHE_SENTINEL) {
    arrowNavCached = isArrowNavEnabled();
    $[2] = arrowNavCached;
  } else arrowNavCached = $[2];
  let arrowNavEnabled = arrowNavCached;
  let [focusIndex, focusRef, setFocusIndex] = useStateWithRef(null);
  let [selectedSet, selectedRef, setSelectedSet] = useStateWithRef(null);
  let optionsKeyCached;
  if ($[3] !== options) {
    optionsKeyCached = options.map(optionValueString_2).join("\x00");
    $[3] = options;
    $[4] = optionsKeyCached;
  } else optionsKeyCached = $[4];
  let optionsKey = optionsKeyCached;
  let [lastOptionsKey, setLastOptionsKey] = useState(optionsKey);
  if (lastOptionsKey !== optionsKey) {
    setLastOptionsKey(optionsKey);
    setFocusIndex(nullPlaceholder9);
    setSelectedSet(nullPlaceholder10);
    setTyped(emptyPlaceholder9);
  }
  let initialSelectedCached;
  if ($[5] !== defaultValues || $[6] !== options) {
    initialSelectedCached = () =>
      new Set(
        options.flatMap((option, candidateOption) =>
          !option.disabled && defaultValues.includes(option.value) ? [candidateOption] : [],
        ),
      );
    $[5] = defaultValues;
    $[6] = options;
    $[7] = initialSelectedCached;
  } else initialSelectedCached = $[7];
  let initialSelected = initialSelectedCached;
  let [pendingSubmit, setPendingSubmit] = useState(null);
  let submittedRef = useRef(false);
  let inputArrivingRef = useRef(false);
  let submitCached;
  if ($[8] !== onSubmit || $[9] !== pendingSubmit) {
    submitCached = () => {
      if (pendingSubmit !== null) {
        let values = [...pendingSubmit];
        setPendingSubmit(null);
        submittedRef.current = false;
        onSubmit?.(values);
      }
    };
    $[8] = onSubmit;
    $[9] = pendingSubmit;
    $[10] = submitCached;
  } else submitCached = $[10];
  let submitDeps;
  if ($[11] !== pendingSubmit) {
    submitDeps = [pendingSubmit];
    $[11] = pendingSubmit;
    $[12] = submitDeps;
  } else submitDeps = $[12];
  useEffect(submitCached, submitDeps);
  let [inputClaim, inputClaimRef, setInputClaim] = useStateWithRef(null);
  if (lastOptionsKey !== optionsKey && inputClaim !== null) {
    setInputClaim(nullPlaceholder7);
    setTyped(emptyPlaceholder10);
  }
  let inputOption =
    inputClaim && options[inputClaim.index - 1]?.type === "input" ? options[inputClaim.index - 1] : null;
  let containerRef = useRef(null);
  useFocusOnMount(containerRef, !isDisabledFlag);
  useRegisterOverlay("multi-select", !!onCancel && !isDisabledFlag);
  let changeCached;
  if (
    $[13] !== onChange ||
    $[14] !== setTyped ||
    $[15] !== setFocusIndex ||
    $[16] !== setInputClaim ||
    $[17] !== setSelectedSet
  ) {
    changeCached = (nextValues) => {
      submittedRef.current = true;
      if (onChange?.([...nextValues]) === false) {
        submittedRef.current = false;
        return;
      }
      setPendingSubmit(nextValues);
      setTyped(emptyPlaceholder11);
      setInputClaim(nullPlaceholder11);
      setFocusIndex(nullPlaceholder12);
      setSelectedSet(nullPlaceholder13);
    };
    $[13] = onChange;
    $[14] = setTyped;
    $[15] = setFocusIndex;
    $[16] = setInputClaim;
    $[17] = setSelectedSet;
    $[18] = changeCached;
  } else changeCached = $[18];
  let changeSelection = changeCached;
  let applyInputCached;
  if (
    $[19] !== defaultValues ||
    $[20] !== changeSelection ||
    $[21] !== inputOption ||
    $[22] !== inputClaim ||
    $[23] !== onFocus ||
    $[24] !== options ||
    $[25] !== setTyped ||
    $[26] !== setFocusIndex ||
    $[27] !== setInputClaim ||
    $[28] !== setSelectedSet
  ) {
    applyInputCached = (rawInput) => {
      if (inputOption && inputClaim) {
        if (rawInput === "") {
          setErrorMessage("Enter some text, or Escape for the list.");
          return;
        }
        changeSelection([...inputClaim.stashed, inputOption.value]);
        return;
      }
      let trimmed = rawInput.trim();
      if (trimmed === "") {
        changeSelection(defaultValues);
        return;
      }
      let filtered = trimmed.split(/[\s,]+/).filter(Boolean);
      if (filtered.length === 0) {
        changeSelection(defaultValues);
        return;
      }
      let seenIndexes = new Set();
      let pickedValues = [];
      let inputPick = null;
      for (const part of filtered) {
        if (!/^\d+$/.test(part)) {
          setErrorMessage(
            `Invalid selection "${part}". Enter numbers between 1 and ${options.length}, comma- or space-separated.`,
          );
          setTyped(emptyPlaceholder12);
          return;
        }
        let optionIndex = Number.parseInt(part, 10);
        if (seenIndexes.has(optionIndex)) {
          continue;
        }
        seenIndexes.add(optionIndex);
        if (optionIndex < 1 || optionIndex > options.length) {
          setErrorMessage(
            `Invalid selection "${part}". Enter numbers between 1 and ${options.length}, comma- or space-separated.`,
          );
          setTyped(emptyPlaceholder13);
          return;
        }
        let option = options[optionIndex - 1];
        if (option.disabled) {
          setErrorMessage(`Option ${optionIndex} is disabled.`);
          setTyped(emptyPlaceholder14);
          return;
        }
        if (option.type === "input") {
          if (inputPick) {
            setErrorMessage("Only one free-text option can be included per selection.");
            setTyped(emptyPlaceholder15);
            return;
          }
          inputPick = {
            index: optionIndex,
            opt: option,
          };
          continue;
        }
        pickedValues.push(option.value);
      }
      if (inputPick?.opt) {
        setInputClaim(() => ({
          index: inputPick.index,
          stashed: pickedValues,
          raw: trimmed,
        }));
        setFocusIndex(nullPlaceholder14);
        setSelectedSet(nullPlaceholder15);
        let initialValue = inputPick.opt.initialValue ?? "";
        setTyped(() => initialValue);
        inputPick.opt.onChange(initialValue);
        onFocus?.(inputPick.opt.value);
        return;
      }
      changeSelection(pickedValues);
    };
    $[19] = defaultValues;
    $[20] = changeSelection;
    $[21] = inputOption;
    $[22] = inputClaim;
    $[23] = onFocus;
    $[24] = options;
    $[25] = setTyped;
    $[26] = setFocusIndex;
    $[27] = setInputClaim;
    $[28] = setSelectedSet;
    $[29] = applyInputCached;
  } else applyInputCached = $[29];
  let applyInput = applyInputCached;
  let keyHandlerCached;
  if (
    $[30] !== typedRef ||
    $[31] !== initialSelected ||
    $[32] !== changeSelection ||
    $[33] !== focusRef ||
    $[34] !== inputOption ||
    $[35] !== inputClaim ||
    $[36] !== inputClaimRef ||
    $[37] !== isDisabledFlag ||
    $[38] !== onCancel ||
    $[39] !== onFocus ||
    $[40] !== options ||
    $[41] !== refuseInput ||
    $[42] !== setTyped ||
    $[43] !== setFocusIndex ||
    $[44] !== setInputClaim ||
    $[45] !== setSelectedSet ||
    $[46] !== applyInput ||
    $[47] !== selectedRef
  ) {
    keyHandlerCached = (event) => {
      if (isDisabledFlag) {
        return;
      }
      if (event.key === "escape" && event.name === "escape") {
        event.preventDefault();
        if (inputClaim) {
          let { raw } = inputClaim;
          setInputClaim(nullPlaceholder19);
          setTyped(() => raw);
          let defaultOption = options.find(isNotInputOption_2) ?? options[0];
          if (defaultOption) onFocus?.(defaultOption.value);
          return;
        }
        onCancel?.();
        return;
      }
      if (event.key === "return" && event.name === "return") {
        event.preventDefault();
        if (inputArrivingRef.current) {
          refuseInput?.();
          inputArrivingRef.current = false;
          setTyped(emptyPlaceholder16);
          setErrorMessage(
            "Part of that entry arrived before the list was ready \u2014 enter your selection again.",
          );
          return;
        }
        if (refuseInput?.()) {
          return;
        }
        if (submittedRef.current) {
          return;
        }
        if (
          arrowNavEnabled &&
          !inputOption &&
          typedRef.current.length === 0 &&
          selectedRef.current !== null
        ) {
          let sorted = [...selectedRef.current].sort(subtract);
          if (sorted.length === 0) changeSelection([]);
          else applyInput(sorted.map(nextIndexString).join(" "));
          return;
        }
        applyInput(typedRef.current);
        return;
      }
      if (event.key === "backspace" || event.key === "delete") {
        event.preventDefault();
        let typedValue = typedRef.current;
        let sliced = typedValue.slice(0, -1);
        if (inputOption && inputOption.onChange(sliced) === false) {
          return;
        }
        setTyped(() => sliced);
        if (!inputOption && typedValue !== sliced) setSelectedSet(nullPlaceholder16);
        return;
      }
      if (
        arrowNavEnabled &&
        !inputOption &&
        inputClaimRef.current === null &&
        (event.name === "up" || event.name === "down")
      ) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        setErrorMessage(null);
        setTyped(emptyPlaceholder17);
        inputArrivingRef.current = false;
        let optionCount = options.length;
        if (optionCount === 0) {
          return;
        }
        let currentFocus = focusRef.current;
        let nextFocus =
          currentFocus === null
            ? event.name === "down"
              ? 0
              : optionCount - 1
            : (currentFocus + (event.name === "down" ? 1 : -1) + optionCount) % optionCount;
        setFocusIndex(() => nextFocus);
        let focusedOption = options[nextFocus];
        if (focusedOption) onFocus?.(focusedOption.value);
        return;
      }
      if (
        arrowNavEnabled &&
        !inputOption &&
        inputClaimRef.current === null &&
        focusRef.current !== null &&
        replaceIdeographicSpace(event.key) === " "
      ) {
        event.preventDefault();
        if (refuseInput?.()) {
          return;
        }
        let focusIndexValue = focusRef.current;
        let option = options[focusIndexValue];
        if (!option) {
          return;
        }
        if (option.disabled) {
          setErrorMessage(`Option ${focusIndexValue + 1} is disabled.`);
          return;
        }
        setErrorMessage(null);
        setSelectedSet((previous) => {
          let nextSet = new Set(previous ?? initialSelected());
          if (nextSet.has(focusIndexValue)) nextSet.delete(focusIndexValue);
          else nextSet.add(focusIndexValue);
          return nextSet;
        });
        return;
      }
      if (inputOption) {
        if (event.key.length === 1 && !event.ctrl && !event.meta) {
          event.preventDefault();
          let nextTyped = typedRef.current + event.key;
          if (inputOption.onChange(nextTyped) === false) {
            return;
          }
          setTyped(() => nextTyped);
        }
        return;
      }
      let replaced = replaceIdeographicSpace(normalizeFullWidthDigits_2(event.key))
        .replace("\uFF0C", ",")
        .replace("\u3001", ",");
      if (/^[0-9, ]$/.test(replaced)) {
        event.preventDefault();
        if (inputArrivingRef.current) {
          refuseInput?.();
          return;
        }
        if (refuseInput?.()) {
          inputArrivingRef.current = true;
          return;
        }
        setErrorMessage(null);
        setTyped((previous) => previous + replaced);
        setFocusIndex(nullPlaceholder17);
        setSelectedSet(nullPlaceholder18);
      }
    };
    $[30] = typedRef;
    $[31] = initialSelected;
    $[32] = changeSelection;
    $[33] = focusRef;
    $[34] = inputOption;
    $[35] = inputClaim;
    $[36] = inputClaimRef;
    $[37] = isDisabledFlag;
    $[38] = onCancel;
    $[39] = onFocus;
    $[40] = options;
    $[41] = refuseInput;
    $[42] = setTyped;
    $[43] = setFocusIndex;
    $[44] = setInputClaim;
    $[45] = setSelectedSet;
    $[46] = applyInput;
    $[47] = selectedRef;
    $[48] = keyHandlerCached;
  } else keyHandlerCached = $[48];
  let onKeyDown = keyHandlerCached;
  let announcement;
  if (
    $[49] !== typedText ||
    $[50] !== defaultValues ||
    $[51] !== inputOption ||
    $[52] !== inputClaim?.index ||
    $[53] !== onCancel ||
    $[54] !== options.length ||
    $[55] !== submitButtonText ||
    $[56] !== selectedSet
  ) {
    announcement = inputOption
      ? `Enter text for option ${inputClaim?.index} (${reactNodeText(inputOption.label)}), or Escape for the list: ${typedText}`
      : `Select with numbers [1-${options.length}] (comma- or space-separated for several)${arrowNavEnabled ? " or up / down arrow keys" : ""}. Then ${formatOrList([...(arrowNavEnabled ? ["Space to toggle"] : []), `Enter to ${submitButtonText ?? "submit"}`, ...(defaultValues.length > 0 && selectedSet === null ? ["bare Enter for defaults"] : []), ...(onCancel ? ["Escape to cancel"] : [])])}: ${typedText}`;
    $[49] = typedText;
    $[50] = defaultValues;
    $[51] = inputOption;
    $[52] = inputClaim?.index;
    $[53] = onCancel;
    $[54] = options.length;
    $[55] = submitButtonText;
    $[56] = selectedSet;
    $[57] = announcement;
  } else announcement = $[57];
  let announcementText = announcement;
  let column;
  if ($[58] !== announcementText) {
    column = bunStringWidth(announcementText);
    $[58] = announcementText;
    $[59] = column;
  } else column = $[59];
  const active = !isDisabledFlag && focusIndex === null;
  let cursorOptions;
  if ($[60] !== column || $[61] !== active) {
    cursorOptions = {
      line: 0,
      column,
      active,
      visible: true,
    };
    $[60] = column;
    $[61] = active;
    $[62] = cursorOptions;
  } else cursorOptions = $[62];
  let ref = useDeclaredCursor(cursorOptions);
  let selectedValuesCached;
  if ($[63] !== defaultValues) {
    selectedValuesCached = new Set(defaultValues);
    $[63] = defaultValues;
    $[64] = selectedValuesCached;
  } else selectedValuesCached = $[64];
  let selectedValues = selectedValuesCached;
  let containerProps;
  if ($[65] !== onKeyDown || $[66] !== isDisabledFlag) {
    containerProps = isDisabledFlag
      ? {}
      : {
          tabIndex: 0,
          onKeyDown,
        };
    $[65] = onKeyDown;
    $[66] = isDisabledFlag;
    $[67] = containerProps;
  } else containerProps = $[67];
  let optionElements;
  if (
    $[68] !== selectedValues ||
    $[69] !== focusIndex ||
    $[70] !== isDisabledFlag ||
    $[71] !== options ||
    $[72] !== selectedSet
  ) {
    let renderOption;
    if (
      $[74] !== selectedValues ||
      $[75] !== focusIndex ||
      $[76] !== isDisabledFlag ||
      $[77] !== selectedSet
    ) {
      renderOption = (option, index) =>
        jsxProd_default(
          SelectOptionLabel,
          {
            index: index + 1,
            option,
            selected: selectedSet ? selectedSet.has(index) : selectedValues.has(option.value),
            focused: focusIndex === index && !isDisabledFlag,
          },
          String(option.value),
        );
      $[74] = selectedValues;
      $[75] = focusIndex;
      $[76] = isDisabledFlag;
      $[77] = selectedSet;
      $[78] = renderOption;
    } else renderOption = $[78];
    optionElements = options.map(renderOption);
    $[68] = selectedValues;
    $[69] = focusIndex;
    $[70] = isDisabledFlag;
    $[71] = options;
    $[72] = selectedSet;
    $[73] = optionElements;
  } else optionElements = $[73];
  let errorElement;
  if ($[79] !== errorMessage) {
    errorElement =
      errorMessage &&
      jsxProd_default(Text, {
        children: errorMessage,
      });
    $[79] = errorMessage;
    $[80] = errorElement;
  } else errorElement = $[80];
  let children;
  if ($[81] !== announcementText) {
    children = jsxProd_default(Text, {
      children: announcementText,
    });
    $[81] = announcementText;
    $[82] = children;
  } else children = $[82];
  let announcementElement;
  if ($[83] !== ref || $[84] !== children) {
    announcementElement = jsxProd_default(Box, {
      ref,
      children,
    });
    $[83] = ref;
    $[84] = children;
    $[85] = announcementElement;
  } else announcementElement = $[85];
  let multiSelectElement;
  if (
    $[86] !== containerProps ||
    $[87] !== optionElements ||
    $[88] !== errorElement ||
    $[89] !== announcementElement
  ) {
    multiSelectElement = jsxProd_default_2(Box, {
      ref: containerRef,
      flexDirection: "column",
      ...containerProps,
      children: [optionElements, errorElement, announcementElement],
    });
    $[86] = containerProps;
    $[87] = optionElements;
    $[88] = errorElement;
    $[89] = announcementElement;
    $[90] = multiSelectElement;
  } else multiSelectElement = $[90];
  return multiSelectElement;
}
//@ chunk-ey2qag4x.js:15553-16760 placement
/**
 * 选项标签渲染（选中/焦点标记）。
 */
function SelectOptionLabel(props) {
  let $ = useMemoCache(26);
  let { index, option, selected, focused, drawLabel } = props;
  let drawLabel_ = drawLabel === undefined ? false : drawLabel;
  let cursor;
  if ($[0] !== focused) {
    cursor = {
      line: 0,
      column: 0,
      active: focused,
      visible: true,
    };
    $[0] = focused;
    $[1] = cursor;
  } else cursor = $[1];
  let ref = useDeclaredCursor(cursor);
  let labelText;
  if ($[2] !== option.label) {
    labelText = reactNodeText(option.label);
    $[2] = option.label;
    $[3] = labelText;
  } else labelText = $[3];
  let labelPlain = labelText;
  let descriptionSuffix = option.description ? ` \u2014 ${option.description}` : "";
  const combinedLabel = `${labelPlain}${descriptionSuffix}`;
  let truncated;
  if ($[4] !== combinedLabel) {
    truncated = truncateOptionLabel(combinedLabel);
    $[4] = combinedLabel;
    $[5] = truncated;
  } else truncated = $[5];
  let plainLabel = truncated;
  const disabledTag = option.disabled ? "(disabled)" : null;
  const selectedTag = selected ? "(selected)" : null;
  let tags;
  if ($[6] !== disabledTag || $[7] !== selectedTag) {
    tags = [disabledTag, selectedTag].filter(Boolean);
    $[6] = disabledTag;
    $[7] = selectedTag;
    $[8] = tags;
  } else tags = $[8];
  let joined = tags.join(" ");
  if (drawLabel_) {
    const joinedSuffix = joined ? ` ${joined}` : "";
    let indexLine;
    if ($[9] !== index || $[10] !== joinedSuffix) {
      indexLine = jsxProd_default_2(Text, {
        children: [index, ".", joinedSuffix],
      });
      $[9] = index;
      $[10] = joinedSuffix;
      $[11] = indexLine;
    } else indexLine = $[11];
    let descriptionText;
    if ($[12] !== option.description) {
      descriptionText =
        option.description &&
        jsxProd_default_2(Text, {
          children: ["\u2014 ", option.description],
        });
      $[12] = option.description;
      $[13] = descriptionText;
    } else descriptionText = $[13];
    let boxedCursor;
    if ($[14] !== ref || $[15] !== option.label || $[16] !== indexLine || $[17] !== descriptionText) {
      boxedCursor = jsxProd_default_2(Box, {
        ref,
        children: [indexLine, option.label, descriptionText],
      });
      $[14] = ref;
      $[15] = option.label;
      $[16] = indexLine;
      $[17] = descriptionText;
      $[18] = boxedCursor;
    } else boxedCursor = $[18];
    return boxedCursor;
  }
  const joinedPrefix = joined ? `${joined} ` : "";
  let children;
  if ($[19] !== plainLabel || $[20] !== index || $[21] !== joinedPrefix) {
    children = jsxProd_default_2(Text, {
      children: [index, ". ", joinedPrefix, plainLabel],
    });
    $[19] = plainLabel;
    $[20] = index;
    $[21] = joinedPrefix;
    $[22] = children;
  } else children = $[22];
  let row;
  if ($[23] !== ref || $[24] !== children) {
    row = jsxProd_default(Box, {
      ref,
      children,
    });
    $[23] = ref;
    $[24] = children;
    $[25] = row;
  } else row = $[25];
  return row;
}
//@ chunk-ey2qag4x.js:16760-18909 placement
/**
 * 确认/取消按钮对，带打开后输入拒绝窗口。
 */
function ConfirmButtons(props) {
  let $ = useMemoCache(43);
  let { confirmLabel, cancelLabel, onConfirm, onCancel, refuseInput, openedAt, windowMs } = props;
  let [typedText, typedRef, setTyped] = useStringStateWithRef();
  let [errorMessage, setErrorMessage] = useState(null);
  let containerRef = useRef(null);
  useFocusOnMount(containerRef, true);
  useRegisterOverlay("select", true);
  let { refuse, refuseCharacter } = useRefuseInput(openedAt, windowMs);
  let shouldRefuseCached;
  if ($[0] !== refuseInput || $[1] !== refuse) {
    shouldRefuseCached = function shouldRefuse() {
      return (refuseInput?.() ?? false) || refuse();
    };
    $[0] = refuseInput;
    $[1] = refuse;
    $[2] = shouldRefuseCached;
  } else shouldRefuseCached = $[2];
  let shouldRefuseKey = shouldRefuseCached;
  let shouldRefuseCharCached;
  if ($[3] !== refuseInput || $[4] !== refuseCharacter) {
    shouldRefuseCharCached = function shouldRefuseChar() {
      return (refuseInput?.() ?? false) || refuseCharacter();
    };
    $[3] = refuseInput;
    $[4] = refuseCharacter;
    $[5] = shouldRefuseCharCached;
  } else shouldRefuseCharCached = $[5];
  let refuseThisCharacter = shouldRefuseCharCached;
  let submitTypedCached;
  if ($[6] !== onCancel || $[7] !== onConfirm || $[8] !== shouldRefuseKey || $[9] !== setTyped) {
    submitTypedCached = (rawTyped) => {
      let lower = rawTyped.trim().toLowerCase();
      if ((lower === "y" || lower === "yes" || lower === "n" || lower === "no") && shouldRefuseKey()) {
        setTyped(emptyPlaceholder18);
        return;
      }
      if (lower === "y" || lower === "yes") {
        return onConfirm();
      }
      if (lower === "n" || lower === "no") {
        return onCancel();
      }
      setErrorMessage("Please answer y or n.");
      setTyped(emptyPlaceholder19);
    };
    $[6] = onCancel;
    $[7] = onConfirm;
    $[8] = shouldRefuseKey;
    $[9] = setTyped;
    $[10] = submitTypedCached;
  } else submitTypedCached = $[10];
  let submitTyped = submitTypedCached;
  let keyHandlerCached;
  if (
    $[11] !== typedRef ||
    $[12] !== onCancel ||
    $[13] !== shouldRefuseKey ||
    $[14] !== refuseThisCharacter ||
    $[15] !== setTyped ||
    $[16] !== submitTyped
  ) {
    keyHandlerCached = (event) => {
      if (event.key === "escape" && event.name === "escape") {
        event.preventDefault();
        if (shouldRefuseKey()) {
          return;
        }
        return onCancel();
      }
      if (event.key === "return" && event.name === "return") {
        event.preventDefault();
        return submitTyped(typedRef.current);
      }
      if (event.key === "backspace" || event.key === "delete") {
        event.preventDefault();
        setTyped(dropLastChar);
        return;
      }
      if (event.key.length === 1 && !event.ctrl && !event.meta) {
        event.preventDefault();
        if (refuseThisCharacter()) {
          return;
        }
        setErrorMessage(null);
        setTyped((previous) => previous + event.key);
      }
    };
    $[11] = typedRef;
    $[12] = onCancel;
    $[13] = shouldRefuseKey;
    $[14] = refuseThisCharacter;
    $[15] = setTyped;
    $[16] = submitTyped;
    $[17] = keyHandlerCached;
  } else keyHandlerCached = $[17];
  let onKeyDown = keyHandlerCached;
  let promptText = `Enter y/n: ${typedText}`;
  let column;
  if ($[18] !== promptText) {
    column = bunStringWidth(promptText);
    $[18] = promptText;
    $[19] = column;
  } else column = $[19];
  let cursorOptions;
  if ($[20] !== column) {
    cursorOptions = {
      line: 0,
      column,
      active: true,
      visible: true,
    };
    $[20] = column;
    $[21] = cursorOptions;
  } else cursorOptions = $[21];
  let ref = useDeclaredCursor(cursorOptions);
  let confirmText;
  if ($[22] !== confirmLabel) {
    confirmText = reactNodeText(confirmLabel);
    $[22] = confirmLabel;
    $[23] = confirmText;
  } else confirmText = $[23];
  let confirmLine;
  if ($[24] !== confirmText) {
    confirmLine = jsxProd_default_2(Text, {
      children: ["y. ", confirmText],
    });
    $[24] = confirmText;
    $[25] = confirmLine;
  } else confirmLine = $[25];
  let cancelText;
  if ($[26] !== cancelLabel) {
    cancelText = reactNodeText(cancelLabel);
    $[26] = cancelLabel;
    $[27] = cancelText;
  } else cancelText = $[27];
  let cancelLine;
  if ($[28] !== cancelText) {
    cancelLine = jsxProd_default_2(Text, {
      children: ["n. ", cancelText],
    });
    $[28] = cancelText;
    $[29] = cancelLine;
  } else cancelLine = $[29];
  let errorLine;
  if ($[30] !== errorMessage) {
    errorLine =
      errorMessage &&
      jsxProd_default(Text, {
        children: errorMessage,
      });
    $[30] = errorMessage;
    $[31] = errorLine;
  } else errorLine = $[31];
  let children;
  if ($[32] !== promptText) {
    children = jsxProd_default(Text, {
      children: promptText,
    });
    $[32] = promptText;
    $[33] = children;
  } else children = $[33];
  let promptElement;
  if ($[34] !== ref || $[35] !== children) {
    promptElement = jsxProd_default(Box, {
      ref,
      children,
    });
    $[34] = ref;
    $[35] = children;
    $[36] = promptElement;
  } else promptElement = $[36];
  let buttonsElement;
  if (
    $[37] !== onKeyDown ||
    $[38] !== cancelLine ||
    $[39] !== errorLine ||
    $[40] !== promptElement ||
    $[41] !== confirmLine
  ) {
    buttonsElement = jsxProd_default_2(Box, {
      ref: containerRef,
      flexDirection: "column",
      tabIndex: 0,
      onKeyDown,
      children: [confirmLine, cancelLine, errorLine, promptElement],
    });
    $[37] = onKeyDown;
    $[38] = cancelLine;
    $[39] = errorLine;
    $[40] = promptElement;
    $[41] = confirmLine;
    $[42] = buttonsElement;
  } else buttonsElement = $[42];
  return buttonsElement;
}
//@ chunk-ey2qag4x.js:18909-18913 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:18909", () => {
  init_react_production();
});
//@ chunk-ey2qag4x.js:18913-18917 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:18913", () => {
  init_react_production();
});
//@ chunk-ey2qag4x.js:18917-18954 placement
function elementKeyOrEmpty(child) {
  return isValidElement_default(child) ? child.key : "";
}
//@ chunk-ey2qag4x.js:18954-18985 placement
/**
 * 用户消息背景色主题键。
 */
var USER_MESSAGE_BACKGROUND = "userMessageBackground";
//@ chunk-ey2qag4x.js:18985-19040 placement
/**
 * 用户消息背景色模式：无色（level 0）时用 inverse，否则用传入值。
 */
function userMessageBackgroundMode(defaultMode = "tint") {
  return sequential.level === 0 ? "inverse" : defaultMode;
}
//@ chunk-ey2qag4x.js:19040-19054 placement
var WINDOWED_TEXT_CONTEXT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-ey2qag4x.js:19040", () => {
  WINDOWED_TEXT_CONTEXT = createContext("");
});
//@ chunk-ey2qag4x.js:19054-19582 placement
/**
 * 按窗口起点切片渲染子元素文本。
 */
function WindowedText(props) {
  let $ = useMemoCache(14);
  let restProps;
  let windowStartProp;
  if ($[0] !== props) {
    ({ windowStart: windowStartProp, ...restProps } = props);
    $[0] = props;
    $[1] = restProps;
    $[2] = windowStartProp;
  } else {
    restProps = $[1];
    windowStartProp = $[2];
  }
  let windowStart = windowStartProp === undefined ? 0 : windowStartProp;
  let ProviderComponent;
  let startValue;
  let childKeys;
  if ($[3] !== restProps.children || $[4] !== windowStart) {
    let mapped = childrenExport.toArray(restProps.children).map(elementKeyOrEmpty);
    ProviderComponent = WINDOWED_TEXT_CONTEXT.Provider;
    startValue = windowStart;
    childKeys = mapped.join();
    $[3] = restProps.children;
    $[4] = windowStart;
    $[5] = ProviderComponent;
    $[6] = startValue;
    $[7] = childKeys;
  } else {
    ProviderComponent = $[5];
    startValue = $[6];
    childKeys = $[7];
  }
  const value = `${startValue} ${childKeys}`;
  let children;
  if ($[8] !== restProps) {
    children = jsxProd_default(Box, {
      flexDirection: "column",
      ...restProps,
    });
    $[8] = restProps;
    $[9] = children;
  } else children = $[9];
  let windowedElement;
  if ($[10] !== ProviderComponent || $[11] !== value || $[12] !== children) {
    windowedElement = jsxProd_default(ProviderComponent, {
      value,
      children,
    });
    $[10] = ProviderComponent;
    $[11] = value;
    $[12] = children;
    $[13] = windowedElement;
  } else windowedElement = $[13];
  return windowedElement;
}
//@ chunk-ey2qag4x.js:19582-19808 placement
/**
 * 行悬停高亮：返回 [是否高亮, 设置悬停]，同一上下文里只有一行处于悬停态。
 */
function useHoverHighlight(enabled) {
  let $ = useMemoCache(5);
  let contextValue = useContext(WINDOWED_TEXT_CONTEXT);
  let [hoveredValue, setHoveredValue] = useState(null);
  let isHovered = enabled && hoveredValue === contextValue;
  if (hoveredValue !== null && !isHovered) setHoveredValue(null);
  let setter;
  if ($[0] !== contextValue) {
    setter = (value) => setHoveredValue(value ? contextValue : null);
    $[0] = contextValue;
    $[1] = setter;
  } else setter = $[1];
  let result;
  if ($[2] !== isHovered || $[3] !== setter) {
    result = [isHovered, setter];
    $[2] = isHovered;
    $[3] = setter;
    $[4] = result;
  } else result = $[4];
  return result;
}
export {
  useInputRefusalWindow,
  useRefusalTracker,
  useMountTime,
  settleKey,
  USER_MESSAGE_BACKGROUND,
  typeaheadEpochTracker,
  Select,
  WindowedText,
  useHoverHighlight,
  userMessageBackgroundMode,
  MultiSelect,
  ConfirmButtons,
};
