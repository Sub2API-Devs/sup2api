/**
 * components/AutocompactOfferDialog.tsx
 *
 * 2.1.316 新增。提议开启自动压缩的对话框。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-18hwfzwa.js (9)
 * attribution: placement 9
 */
import { wrapText } from "../ink/wrap-text.js";
import {
  MIN_BODY_ROWS,
  MIN_BODY_COLUMNS,
  DIALOG_HORIZONTAL_CHROME,
  offerTelemetryFields,
  describeCurrentWindow,
  currentWindowLabel,
} from "../services/compact/autocompactOffer.js";
import {
  useRef,
  useContext,
  useState,
  useMemo,
  useLayoutEffect,
  useCallback,
  useEffectEvent,
  useEffect,
} from "../../vendor/react/cjs/react.production.js";
import { useScrollColumnContext, SCROLL_COLUMN_MIN_ROWS } from "./design-system/ScrollColumn.js";
import { useTerminalSize } from "../hooks/useTerminalSize.js";
import { useScrollViewportSize, useHasScrollViewport } from "./ScrollViewportContext.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
import { countCharInString } from "../utils/stringUtils.js";
import { useTimeout, measureElement, topWithin } from "../ink/hooks/useTerminalHooks.js";
import {
  RECENT_INPUT_GUARD_MS_2,
  INPUT_SETTLE_MS,
  isWithinRecentInput,
  RECENT_INPUT_GUARD_MS as RECENT_INPUT_GUARD_MS_3,
} from "../hooks/useRecentInputGuard.js";
import { usePreDispatchKeyHandler } from "../keybindings/useActionHandlers.js";
import { ContextSlotA } from "../context/contextSlots.js";
import { useMeasured, useInputClock } from "../ink/components/Input.js";
import { useMemoCache } from "../../vendor/react/compiler-runtime.js";
import { useIsScreenReaderEnabled } from "../ink/components/ErrorBoundary.js";
import { useGlobalExitKeybindings } from "../keybindings/useKeybinding.js";
import { logEvent } from "../services/analytics/index.js";
import { useOnFirstReveal } from "./permissions/PermissionRequestTitle.js";
import { useConfirmArmed, CONFIRM_ARM_DELAY_MS } from "./design-system/ConfirmSelect.js";
import { useRefusalTracker } from "./CustomSelect/selectTypeahead.js";
import { fitVisibleOptionCount, NO_COMMITTED_ROW } from "./CustomSelect/select.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useRefusableAnswer } from "../hooks/useRefusableAnswer.js";
import { MEMO_CACHE_SENTINEL } from "../../runtime/bun-runtime.js";
import { formatTokens } from "../utils/format.js";
import {
  jsxProd_default,
  jsxProd_default_2,
} from "../../vendor/react/cjs/react-jsx-dev-runtime.react-server.production.js";
import { Text, Box } from "../ink/components/Text.js";
import { ModelSelector } from "./agents/ModelSelector.js";
import { PermissionDialog_2 } from "./permissions/PermissionDialog.js";

//@ chunk-18hwfzwa.js:1115692-1116037 placement
/**
 * 把文本按宽度折行后截取不超过 maxRows 的窗口（从 start 行开始），返回文本、隐藏行数、上方隐藏行数与下一页起点。
 */
function fitTextToRows(text, width, maxRows, start = 0) {
  let lines = wrapText(text, Math.max(1, width), "wrap").split(`
`);
  let max = Math.max(MIN_BODY_ROWS, maxRows);
  if (lines.length <= max)
    return {
      text,
      hiddenRows: 0,
      hiddenAbove: 0,
      nextStart: 0,
    };
  let visibleRowCount = max - 1;
  let min = Math.min(Math.max(0, start), lines.length - visibleRowCount);
  let sliced = lines.slice(min, min + visibleRowCount);
  let hiddenAfter = lines.length - min - sliced.length;
  return {
    text: sliced.join(`
`),
    hiddenRows: hiddenAfter,
    hiddenAbove: min,
    nextStart: hiddenAfter === 0 ? 0 : min + sliced.length,
  };
}
//@ chunk-18hwfzwa.js:1116037-1116609 placement
/**
 * 计算自动压缩提议对话框的布局：是否显示常驻选项、是否保持常驻、正文可用行数与稳定后的模式。
 */
function planOfferLayout(measure, bodyRows, mode) {
  let chromeBare = measure?.chromeWithout ?? measure?.chromeWith ?? null;
  let chromeStanding = measure?.chromeWith ?? measure?.chromeWithout ?? null;
  if (measure === null || chromeBare === null || chromeStanding === null)
    return {
      offersStanding: mode === "standing",
      isStandingHeld: mode === "standing",
      room: MIN_BODY_ROWS,
      settles: null,
    };
  let fitsWithOffers = measure.overdraw === 0 && chromeStanding + bodyRows <= measure.available;
  if (mode === "bare" || (mode === "unsettled" && !fitsWithOffers))
    return {
      offersStanding: false,
      isStandingHeld: false,
      room: Math.max(MIN_BODY_ROWS, measure.available - chromeBare - measure.overdraw),
      settles: measure.chromeWithout === null ? null : "bare",
    };
  return {
    offersStanding: true,
    isStandingHeld: !fitsWithOffers,
    room: fitsWithOffers
      ? bodyRows
      : Math.max(MIN_BODY_ROWS, measure.available - chromeStanding - measure.overdraw),
    settles: measure.chromeWith === null ? null : "standing",
  };
}
//@ chunk-18hwfzwa.js:1116609-1119923 placement
/**
 * 自动压缩提议对话框的正文（适配宽度）。
 */
function FittedOfferBody(text, { isActive, isCut, contentKey, maxRows, lateBody, keptForRequest }) {
  let boxRef = useRef(null);
  let textBoxRef = useRef(null);
  let scrollColumnContext = useScrollColumnContext();
  let terminalSize = useTerminalSize();
  let { rows } = useScrollViewportSize(terminalSize);
  let hasScrollViewport = useHasScrollViewport();
  let { subscribeLayout } = useContext(APP_CONTEXT);
  let [lastMeasure, setLastMeasure] = useState(null);
  let currentMeasure = lastMeasure?.contentKey === contentKey ? lastMeasure : null;
  let width =
    currentMeasure?.columns ?? Math.max(MIN_BODY_COLUMNS, terminalSize.columns - DIALOG_HORIZONTAL_CHROME);
  let bodyRows = useMemo(
    () =>
      isActive
        ? countCharInString(
            wrapText(text, Math.max(1, width), "wrap"),
            `
`,
          ) + 1
        : 0,
    [isActive, text, width],
  );
  let [lastScroll, setLastScroll] = useState(null);
  let start =
    lastScroll !== null && lastScroll.contentKey === contentKey && lastScroll.columns === width
      ? lastScroll.start
      : 0;
  let [layoutMode, setLayoutMode] = useState(() =>
    keptForRequest?.has("bare") === true ? "bare" : "unsettled",
  );
  let measure =
    currentMeasure === null && layoutMode === "standing" && lastMeasure !== null
      ? lastMeasure.fit
      : (currentMeasure?.fit ?? null);
  let isLateBodyPending = isActive && lateBody === "pending";
  let { offersStanding, isStandingHeld, room, settles } = isActive
    ? planOfferLayout(
        measure,
        bodyRows,
        isLateBodyPending && layoutMode === "unsettled" ? "standing" : layoutMode,
      )
    : {
        offersStanding: true,
        isStandingHeld: false,
        room: bodyRows,
        settles: null,
      };
  let timeout = useTimeout(isActive && layoutMode === "unsettled" ? RECENT_INPUT_GUARD_MS_2 : null);
  if (isActive && layoutMode === "unsettled") {
    if (settles !== null && currentMeasure !== null && lateBody === undefined) setLayoutMode(settles);
    else if (timeout) setLayoutMode(offersStanding ? "standing" : "bare");
  }
  let shouldHoldOffers = isStandingHeld || isLateBodyPending;
  let [isHeldForGood, setIsHeldForGood] = useState(() => keptForRequest?.has("held") ?? false);
  if (
    isActive &&
    layoutMode === "standing" &&
    (currentMeasure !== null || isLateBodyPending) &&
    shouldHoldOffers &&
    !isHeldForGood
  )
    setIsHeldForGood(true);
  let isStandingHeld_2 = shouldHoldOffers || isHeldForGood;
  useLayoutEffect(() => {
    if (keptForRequest === undefined) return;
    if (isHeldForGood) keptForRequest.keep("held");
    if (layoutMode === "bare") keptForRequest.keep("bare");
  }, [keptForRequest, isHeldForGood, layoutMode]);
  let fit = useMemo(
    () =>
      isActive && isCut
        ? fitTextToRows(text, width, Math.min(room, maxRows ?? room), start)
        : {
            text,
            hiddenRows: 0,
            hiddenAbove: 0,
            nextStart: 0,
          },
    [isActive, isCut, text, width, room, maxRows, start],
  );
  let chromeRows =
    (offersStanding ? currentMeasure?.fit.chromeWith : currentMeasure?.fit.chromeWithout) ?? null;
  let shortRows =
    isActive && currentMeasure !== null && chromeRows !== null
      ? Math.max(0, chromeRows + MIN_BODY_ROWS + currentMeasure.fit.overdraw - currentMeasure.fit.available)
      : 0;
  let nextStart = fit.nextStart;
  let showNextRows = useCallback(
    () =>
      setLastScroll({
        contentKey,
        columns: width,
        start: nextStart,
      }),
    [contentKey, width, nextStart],
  );
  let measureLayout = useEffectEvent(() => {
    if (!isActive || boxRef.current === null || textBoxRef.current === null) return;
    let node = scrollColumnContext?.box.current ?? boxRef.current;
    while (scrollColumnContext === null && node.parentNode !== undefined) node = node.parentNode;
    let height = measureElement(boxRef.current).height;
    if (height === 0) return;
    let height_2 = measureElement(node).height;
    let chromeHeight = height_2 - height;
    if (chromeHeight <= 0) return;
    let availableRows = hasScrollViewport
      ? (scrollColumnContext?.rows ?? rows)
      : measureRoomAbove(node, terminalSize.rows, scrollColumnContext?.reserve ?? SCROLL_COLUMN_MIN_ROWS);
    let topOffset = topWithin(boxRef.current, node);
    let textBoxSize = measureElement(textBoxRef.current);
    let measureKey = {
      contentKey,
      text,
      columns: textBoxSize.width,
      terminalRows: terminalSize.rows,
      terminalColumns: terminalSize.columns,
    };
    let visibleRows =
      fit.hiddenRows + fit.hiddenAbove === 0
        ? bodyRows
        : countCharInString(
            fit.text,
            `
`,
          ) + 1;
    setLastMeasure((previousMeasure) => {
      let previousFit =
        previousMeasure !== null &&
        previousMeasure.contentKey === measureKey.contentKey &&
        previousMeasure.columns === measureKey.columns &&
        previousMeasure.terminalRows === measureKey.terminalRows &&
        previousMeasure.terminalColumns === measureKey.terminalColumns
          ? previousMeasure.fit
          : {
              available: availableRows,
              chromeWithout: null,
              chromeWith: null,
              overdraw: 0,
            };
      let max = Math.max(
        previousMeasure?.text === text && previousMeasure.columns === measureKey.columns
          ? previousMeasure.fit.overdraw
          : 0,
        width === measureKey.columns ? textBoxSize.height - visibleRows : 0,
      );
      let overdraw = offersStanding ? previousFit.chromeWith : previousFit.chromeWithout;
      let min = Math.min(height, MIN_BODY_ROWS + max);
      let isBodyOnScreen =
        (hasScrollViewport ? topOffset + min : height_2 - topOffset - height + min) <= availableRows &&
        (previousFit !== previousMeasure?.fit || previousMeasure.isBodyOnScreen);
      if (
        previousFit === previousMeasure?.fit &&
        overdraw === chromeHeight &&
        previousFit.available === availableRows &&
        previousFit.overdraw === max &&
        previousMeasure.isBodyOnScreen === isBodyOnScreen
      )
        return previousMeasure;
      return {
        ...measureKey,
        isBodyOnScreen,
        fit: {
          ...previousFit,
          available: availableRows,
          overdraw: max,
          chromeWith: offersStanding ? chromeHeight : previousFit.chromeWith,
          chromeWithout: offersStanding ? previousFit.chromeWithout : chromeHeight,
        },
      };
    });
  });
  useLayoutEffect(() => {
    measureLayout();
    return subscribeLayout(measureLayout);
  }, [subscribeLayout]);
  usePreDispatchKeyHandler(
    (input, key) => {
      if (key.wheelUp || key.wheelDown) return false;
      if (keptForRequest !== undefined && !offersStanding) keptForRequest.keep("bare");
      setLayoutMode((mode) => (mode === "unsettled" ? (offersStanding ? "standing" : "bare") : mode));
      return false;
    },
    {
      isActive: isActive && layoutMode === "unsettled",
    },
  );
  return {
    text: fit.text,
    hiddenRows: fit.hiddenRows,
    hiddenAbove: fit.hiddenAbove,
    showNextRows,
    offersStanding,
    isStandingHeld: isStandingHeld_2,
    isHeldForGood,
    isMeasured:
      settles !== null &&
      currentMeasure !== null &&
      currentMeasure.terminalRows === terminalSize.rows &&
      currentMeasure.terminalColumns === terminalSize.columns,
    fitsScreen:
      settles !== null &&
      currentMeasure !== null &&
      currentMeasure.terminalRows === terminalSize.rows &&
      currentMeasure.terminalColumns === terminalSize.columns &&
      ((offersStanding ? currentMeasure.fit.chromeWith : currentMeasure.fit.chromeWithout) ??
        Number.POSITIVE_INFINITY) +
        Math.min(bodyRows, room) +
        currentMeasure.fit.overdraw <=
        currentMeasure.fit.available,
    box: boxRef,
    textBox: textBoxRef,
    columns: width,
    shortRows,
    isBodyOnScreen: currentMeasure?.isBodyOnScreen ?? null,
  };
}
//@ chunk-18hwfzwa.js:1119923-1120222 placement
function useOfferRoom() {
  let boxRef = useRef(null);
  let terminalSize = useTerminalSize();
  let reserve = useScrollColumnContext()?.reserve ?? SCROLL_COLUMN_MIN_ROWS;
  let contextSlot = useContext(ContextSlotA);
  function measureRows() {
    if (boxRef.current === null) return null;
    let reservedAbove = contextSlot?.() ?? null;
    return reservedAbove === null
      ? measureRoomAbove(boxRef.current, terminalSize.rows, reserve, true)
      : reservedAbove + measureElement(boxRef.current).height;
  }
  let measured = useMeasured(measureRows);
  return {
    box: boxRef,
    rows: measured ?? terminalSize.rows - reserve,
    rowsNow: () => measureRows() ?? terminalSize.rows - reserve,
    isCutFromTheBottom: contextSlot !== null,
  };
}
//@ chunk-18hwfzwa.js:1120222-1120776 placement
/**
 * 自下而上测量节点之后的兄弟元素高度，求出该节点可用的终端行数；遇到可滚动父容器时以其内高为准。
 */
function measureRoomAbove(node, rows, reserve, withMargins = false) {
  let belowHeight = 0;
  let currentNode = node;
  while (currentNode.parentNode !== undefined) {
    let parentNode = currentNode.parentNode;
    if ((parentNode.style.overflowY ?? parentNode.style.overflow) === "scroll") {
      let scrollHeight =
        measureElement(parentNode).height -
        (parentNode.yogaNode?.getComputedPadding(1) ?? 0) -
        (parentNode.yogaNode?.getComputedPadding(3) ?? 0);
      return Math.min(scrollHeight, rows - SCROLL_COLUMN_MIN_ROWS) - belowHeight;
    }
    for (let childNode of parentNode.childNodes.slice(parentNode.childNodes.indexOf(currentNode) + 1))
      if (
        childNode.nodeName !== "#text" &&
        childNode.style.position !== "absolute" &&
        !(childNode.style.flexGrow ?? 0)
      )
        belowHeight +=
          measureElement(childNode).height +
          (withMargins
            ? (childNode.yogaNode?.getComputedMargin(1) ?? 0) +
              (childNode.yogaNode?.getComputedMargin(3) ?? 0)
            : 0);
    currentNode = parentNode;
  }
  return rows - Math.max(reserve, SCROLL_COLUMN_MIN_ROWS + belowHeight);
}
//@ chunk-18hwfzwa.js:1120776-1120805 placement
function increment_2(value) {
  return value + 1;
}
//@ chunk-18hwfzwa.js:1120805-1120834 placement
function increment_2_2(value) {
  return value + 1;
}
//@ chunk-18hwfzwa.js:1120834-1121034 placement
var AUTOCOMPACT_OFFER_TITLE = "We recommend compacting earlier";
var AUTOCOMPACT_OFFER_KEYS_HINT =
  "\u2191/\u2193 choose \xB7 \u2190/\u2192 change size \xB7 enter confirm \xB7 esc not now";
var MORE_TEXT_ABOVE_HINT = "More text above: scroll up, or enlarge the terminal";
var OFFER_MIN_ROWS = 2;
//@ chunk-18hwfzwa.js:1121034-1127615 placement
/**
 * AutocompactOfferDialog：上下文接近上限时提议开启自动压缩的对话框。
 */
function AutocompactOfferDialog(props) {
  let $ = useMemoCache(101);
  let { payload, onDone } = props;
  let isScreenReaderEnabled = useIsScreenReaderEnabled();
  let globalExitKeybindings = useGlobalExitKeybindings();
  let defaultChoice = payload.order === "lower_first" ? "accept" : "keep";
  const preselected = defaultChoice === "accept" ? "lower" : "keep";
  let selectorStateCached;
  if ($[0] !== isScreenReaderEnabled || $[1] !== preselected) {
    selectorStateCached = {
      preselected,
      isScreenReader: isScreenReaderEnabled,
    };
    $[0] = isScreenReaderEnabled;
    $[1] = preselected;
    $[2] = selectorStateCached;
  } else selectorStateCached = $[2];
  let selectorState = selectorStateCached;
  let impressionCached;
  if ($[3] !== payload || $[4] !== selectorState) {
    impressionCached = () => {
      logEvent("tengu_autocompact_offer_shown", offerTelemetryFields(payload, selectorState));
    };
    $[3] = payload;
    $[4] = selectorState;
    $[5] = impressionCached;
  } else impressionCached = $[5];
  useOnFirstReveal("impression", impressionCached);
  let defaultIndexFn;
  if ($[6] !== payload.defaultTokens || $[7] !== payload.sizes) {
    defaultIndexFn = () => payload.sizes.findIndex((siz) => siz.tokens === payload.defaultTokens);
    $[6] = payload.defaultTokens;
    $[7] = payload.sizes;
    $[8] = defaultIndexFn;
  } else defaultIndexFn = $[8];
  let [selectedIndex, setSelectedIndex] = useState(defaultIndexFn);
  let [stepperMoves, setStepperMoves] = useState(0);
  let selectedSize = payload.sizes[selectedIndex] ?? payload.sizes[0];
  let stepCached;
  if ($[9] !== payload.sizes.length || $[10] !== selectedIndex) {
    stepCached = function handleStep(delta) {
      let nextIndex = selectedIndex + delta;
      if (nextIndex < 0 || nextIndex >= payload.sizes.length) {
        return;
      }
      setSelectedIndex(nextIndex);
      setStepperMoves(increment_2);
    };
    $[9] = payload.sizes.length;
    $[10] = selectedIndex;
    $[11] = stepCached;
  } else stepCached = $[11];
  let stepSelection = stepCached;
  let confirmArmed = useConfirmArmed(CONFIRM_ARM_DELAY_MS);
  let { refusedWithin, noteRefused, epoch } = useRefusalTracker();
  let timeout = useTimeout(INPUT_SETTLE_MS, epoch);
  let isSettled = epoch === 0 || timeout;
  let [isAnswered, setIsAnswered] = useState(false);
  let hasRoomForOptions = fitVisibleOptionCount(2, "compact-vertical") === 2 || isScreenReaderEnabled;
  let isInteractive = confirmArmed && isSettled && !isAnswered && hasRoomForOptions;
  let { box, rows } = useOfferRoom();
  let measureBoxHeight;
  if ($[12] !== box.current) {
    measureBoxHeight = () => (box.current === null ? 0 : measureElement(box.current).height);
    $[12] = box.current;
    $[13] = measureBoxHeight;
  } else measureBoxHeight = $[13];
  let overflowRows = useMeasured(measureBoxHeight) - OFFER_MIN_ROWS - rows;
  let { columns, rows: rows_2 } = useTerminalSize();
  let initialOverflowState;
  if ($[14] !== columns || $[15] !== rows_2) {
    initialOverflowState = {
      columns,
      rows: rows_2,
      overflow: -Infinity,
    };
    $[14] = columns;
    $[15] = rows_2;
    $[16] = initialOverflowState;
  } else initialOverflowState = $[16];
  let [overflowState, setOverflowState] = useState(initialOverflowState);
  let sizeMatches = overflowState.columns === columns && overflowState.rows === rows_2;
  let syncOverflow;
  let syncOverflowDeps;
  if (
    $[17] !== columns ||
    $[18] !== sizeMatches ||
    $[19] !== overflowState.overflow ||
    $[20] !== overflowRows ||
    $[21] !== rows_2
  ) {
    syncOverflow = () => {
      if (!sizeMatches)
        setOverflowState({
          columns,
          rows: rows_2,
          overflow: -Infinity,
        });
      else if (overflowRows > overflowState.overflow)
        setOverflowState({
          columns,
          rows: rows_2,
          overflow: overflowRows,
        });
    };
    syncOverflowDeps = [sizeMatches, columns, rows_2, overflowRows, overflowState.overflow];
    $[17] = columns;
    $[18] = sizeMatches;
    $[19] = overflowState.overflow;
    $[20] = overflowRows;
    $[21] = rows_2;
    $[22] = syncOverflow;
    $[23] = syncOverflowDeps;
  } else {
    syncOverflow = $[22];
    syncOverflowDeps = $[23];
  }
  useLayoutEffect(syncOverflow, syncOverflowDeps);
  let hasMoreAbove =
    (useIsFullscreen()
      ? overflowRows
      : Math.max(overflowRows, sizeMatches ? overflowState.overflow : -Infinity)) > 0;
  let [strayKeys, setStrayKeys] = useState(0);
  let [pasteCount, setPasteCount] = useState(0);
  let recordStrayCached;
  if ($[24] !== noteRefused) {
    recordStrayCached = function recordStrayInput(strayCount) {
      setIsAnswered(true);
      noteRefused();
      setStrayKeys((previous) => previous + strayCount);
      setPasteCount(increment_2_2);
    };
    $[24] = noteRefused;
    $[25] = recordStrayCached;
  } else recordStrayCached = $[25];
  let recordStray = recordStrayCached;
  let answerWithStats;
  if (
    $[26] !== onDone ||
    $[27] !== selectorState ||
    $[28] !== selectedSize.tokens ||
    $[29] !== stepperMoves ||
    $[30] !== strayKeys
  ) {
    answerWithStats = (choice) =>
      onDone({
        choice,
        tokens: selectedSize.tokens,
        stepperMoves,
        strayKeys,
        ...selectorState,
      });
    $[26] = onDone;
    $[27] = selectorState;
    $[28] = selectedSize.tokens;
    $[29] = stepperMoves;
    $[30] = strayKeys;
    $[31] = answerWithStats;
  } else answerWithStats = $[31];
  let refusableAnswer = useRefusableAnswer(answerWithStats);
  let inputClock = useInputClock();
  let lastArrowAtRef = useRef(null);
  let keyHandlerCached;
  if (
    $[32] !== hasRoomForOptions ||
    $[33] !== confirmArmed ||
    $[34] !== inputClock ||
    $[35] !== isInteractive ||
    $[36] !== isScreenReaderEnabled ||
    $[37] !== isAnswered ||
    $[38] !== noteRefused ||
    $[39] !== recordStray ||
    $[40] !== refusedWithin ||
    $[41] !== refusableAnswer ||
    $[42] !== stepSelection
  ) {
    keyHandlerCached = (input, key, sequence) => {
      if (key.wheelUp || key.wheelDown) {
        return false;
      }
      let isPlainKey = !key.ctrl && !key.meta && !key.shift && !key.super;
      let isArrowKey = isPlainKey && (key.upArrow || key.downArrow || key.leftArrow || key.rightArrow);
      let isAnswerKey = isPlainKey && (key.return || key.escape);
      let isDigitKey = isScreenReaderEnabled && /^[0-9]$/.test(input);
      if (!isArrowKey && !isAnswerKey && !isDigitKey) {
        recordStray(input.length || (sequence.startsWith("\x1B") ? 1 : sequence.length) || 1);
        return !(key.ctrl && (input === "c" || input === "d"));
      }
      if (!confirmArmed || refusedWithin(INPUT_SETTLE_MS)) {
        noteRefused();
        return true;
      }
      if (isAnswered) {
        setIsAnswered(false);
        noteRefused();
        return true;
      }
      if (!hasRoomForOptions) {
        if (key.escape) refusableAnswer.answer("esc");
        else noteRefused();
        return true;
      }
      if (!isInteractive) {
        return true;
      }
      if (isArrowKey) lastArrowAtRef.current = Date.now();
      else if (
        lastArrowAtRef.current !== null &&
        isWithinRecentInput(inputClock, lastArrowAtRef.current, RECENT_INPUT_GUARD_MS_3)
      ) {
        noteRefused();
        return true;
      }
      if (!isScreenReaderEnabled && (key.leftArrow || key.rightArrow)) {
        stepSelection(key.rightArrow ? 1 : -1);
        return true;
      }
      return false;
    };
    $[32] = hasRoomForOptions;
    $[33] = confirmArmed;
    $[34] = inputClock;
    $[35] = isInteractive;
    $[36] = isScreenReaderEnabled;
    $[37] = isAnswered;
    $[38] = noteRefused;
    $[39] = recordStray;
    $[40] = refusedWithin;
    $[41] = refusableAnswer;
    $[42] = stepSelection;
    $[43] = keyHandlerCached;
  } else keyHandlerCached = $[43];
  usePreDispatchKeyHandler(keyHandlerCached);
  let [isRevealed, setIsRevealed] = useState(false);
  let revealEffect;
  let revealEffectDeps;
  if ($[44] === MEMO_CACHE_SENTINEL) {
    revealEffect = () => {
      setIsRevealed(true);
    };
    revealEffectDeps = [];
    $[44] = revealEffect;
    $[45] = revealEffectDeps;
  } else {
    revealEffect = $[44];
    revealEffectDeps = $[45];
  }
  useEffect(revealEffect, revealEffectDeps);
  let defaultFocusValue =
    (refusableAnswer.refused === "esc" ? null : refusableAnswer.refused) ??
    (isRevealed ? undefined : defaultChoice);
  let tokensLabel;
  if ($[46] !== selectedSize.tokens) {
    tokensLabel = formatTokens(selectedSize.tokens);
    $[46] = selectedSize.tokens;
    $[47] = tokensLabel;
  } else tokensLabel = $[47];
  let tokensText = tokensLabel;
  let currentWindowText;
  if ($[48] !== payload) {
    currentWindowText = describeCurrentWindow(payload);
    $[48] = payload;
    $[49] = currentWindowText;
  } else currentWindowText = $[49];
  const whyParagraph = `Each message re-sends the whole conversation, so long conversations use up your plan's usage limits faster. With your current settings, Claude Code autocompacts (replaces older messages with a summary) at ${currentWindowText}. Compacting earlier can reduce usage, but it happens more often, and some details can be lost each time.`;
  const offerQuestion = `Want to autocompact at ${tokensText} tokens instead? Your model doesn't change. Switch back any time with /autocompact.`;
  let paragraphs;
  if ($[50] !== whyParagraph || $[51] !== offerQuestion) {
    paragraphs = [whyParagraph, offerQuestion];
    $[50] = whyParagraph;
    $[51] = offerQuestion;
    $[52] = paragraphs;
  } else paragraphs = $[52];
  let children = paragraphs.join(`

`);
  let styleLabel;
  if ($[53] !== isInteractive || $[54] !== isScreenReaderEnabled) {
    styleLabel = (text) =>
      isInteractive || isScreenReaderEnabled
        ? text
        : jsxProd_default(Text, {
            dimColor: true,
            children: text,
          });
    $[53] = isInteractive;
    $[54] = isScreenReaderEnabled;
    $[55] = styleLabel;
  } else styleLabel = $[55];
  let styleLabelStable = styleLabel;
  const acceptLabelText = isScreenReaderEnabled
    ? `Autocompact at ${tokensText} tokens`
    : `Autocompact at \u2039 ${tokensText} \u203A tokens`;
  let label;
  if ($[56] !== styleLabelStable || $[57] !== acceptLabelText) {
    label = styleLabelStable(acceptLabelText);
    $[56] = styleLabelStable;
    $[57] = acceptLabelText;
    $[58] = label;
  } else label = $[58];
  let description;
  if ($[59] !== payload.contextTokens || $[60] !== selectedSize.firesAt) {
    description =
      payload.contextTokens >= selectedSize.firesAt
        ? `This conversation is at ${formatTokens(payload.contextTokens)}, so it will be summarized on your next message.`
        : undefined;
    $[59] = payload.contextTokens;
    $[60] = selectedSize.firesAt;
    $[61] = description;
  } else description = $[61];
  let acceptOption;
  if ($[62] !== label || $[63] !== description) {
    acceptOption = {
      label,
      value: "accept",
      description,
    };
    $[62] = label;
    $[63] = description;
    $[64] = acceptOption;
  } else acceptOption = $[64];
  let acceptOptionStable = acceptOption;
  let currentWindowName;
  if ($[65] !== payload) {
    currentWindowName = currentWindowLabel(payload);
    $[65] = payload;
    $[66] = currentWindowName;
  } else currentWindowName = $[66];
  const keepLabelText = `Keep ${currentWindowName}`;
  let label_2;
  if ($[67] !== styleLabelStable || $[68] !== keepLabelText) {
    label_2 = styleLabelStable(keepLabelText);
    $[67] = styleLabelStable;
    $[68] = keepLabelText;
    $[69] = label_2;
  } else label_2 = $[69];
  let keepOptionDraft;
  if ($[70] !== label_2) {
    keepOptionDraft = {
      label: label_2,
      value: "keep",
    };
    $[70] = label_2;
    $[71] = keepOptionDraft;
  } else keepOptionDraft = $[71];
  let keepOption = keepOptionDraft;
  const ref = isScreenReaderEnabled ? undefined : box;
  let onPaste;
  if ($[72] !== recordStray) {
    onPaste = (pasteEvent) => recordStray(pasteEvent.text.length);
    $[72] = recordStray;
    $[73] = onPaste;
  } else onPaste = $[73];
  let paragraphElement;
  if ($[74] !== children) {
    paragraphElement = jsxProd_default(Box, {
      marginBottom: 1,
      children: jsxProd_default(Text, {
        children,
      }),
    });
    $[74] = children;
    $[75] = paragraphElement;
  } else paragraphElement = $[75];
  const selectorKey = `${refusableAnswer.attempts}:${isScreenReaderEnabled ? `${pasteCount}:${isInteractive}` : ""}`;
  const isDisabled = !isInteractive;
  let options;
  if ($[76] !== acceptOptionStable || $[77] !== defaultChoice || $[78] !== keepOption) {
    options =
      defaultChoice === "accept" ? [acceptOptionStable, keepOption] : [keepOption, acceptOptionStable];
    $[76] = acceptOptionStable;
    $[77] = defaultChoice;
    $[78] = keepOption;
    $[79] = options;
  } else options = $[79];
  let onCancel;
  if ($[80] !== refusableAnswer) {
    onCancel = () => refusableAnswer.answer("esc");
    $[80] = refusableAnswer;
    $[81] = onCancel;
  } else onCancel = $[81];
  let selectorElement;
  if (
    $[82] !== defaultFocusValue ||
    $[83] !== refusableAnswer.answer ||
    $[84] !== selectorKey ||
    $[85] !== isDisabled ||
    $[86] !== options ||
    $[87] !== onCancel
  ) {
    selectorElement = jsxProd_default(
      ModelSelector,
      {
        isDisabled,
        hidePromptWhileDisabled: true,
        options,
        layout: "compact-vertical",
        selectedValue: NO_COMMITTED_ROW,
        defaultFocusValue,
        hideIndexes: true,
        disablePrintableKeybindings: true,
        onChange: refusableAnswer.answer,
        onCancel,
      },
      selectorKey,
    );
    $[82] = defaultFocusValue;
    $[83] = refusableAnswer.answer;
    $[84] = selectorKey;
    $[85] = isDisabled;
    $[86] = options;
    $[87] = onCancel;
    $[88] = selectorElement;
  } else selectorElement = $[88];
  let hintElement;
  if ($[89] !== globalExitKeybindings || $[90] !== hasMoreAbove || $[91] !== isScreenReaderEnabled) {
    hintElement =
      (!isScreenReaderEnabled || globalExitKeybindings.pending) &&
      jsxProd_default_2(Box, {
        flexDirection: "column",
        marginTop: hasMoreAbove ? 0 : 1,
        children: [
          jsxProd_default(Text, {
            dimColor: true,
            children: globalExitKeybindings.pending
              ? `Press ${globalExitKeybindings.keyName} again to exit`
              : AUTOCOMPACT_OFFER_KEYS_HINT,
          }),
          hasMoreAbove &&
            jsxProd_default(Text, {
              color: "warning",
              wrap: "truncate-end",
              children: MORE_TEXT_ABOVE_HINT,
            }),
        ],
      });
    $[89] = globalExitKeybindings;
    $[90] = hasMoreAbove;
    $[91] = isScreenReaderEnabled;
    $[92] = hintElement;
  } else hintElement = $[92];
  let children_2;
  if ($[93] !== paragraphElement || $[94] !== selectorElement || $[95] !== hintElement) {
    children_2 = jsxProd_default(PermissionDialog_2, {
      title: AUTOCOMPACT_OFFER_TITLE,
      srPrefix: null,
      children: jsxProd_default_2(Box, {
        flexDirection: "column",
        paddingX: 2,
        paddingY: 1,
        children: [paragraphElement, selectorElement, hintElement],
      }),
    });
    $[93] = paragraphElement;
    $[94] = selectorElement;
    $[95] = hintElement;
    $[96] = children_2;
  } else children_2 = $[96];
  let dialogElement;
  if ($[97] !== ref || $[98] !== onPaste || $[99] !== children_2) {
    dialogElement = jsxProd_default(Box, {
      ref,
      flexDirection: "column",
      tabIndex: 0,
      autoFocus: true,
      onPaste,
      children: children_2,
    });
    $[97] = ref;
    $[98] = onPaste;
    $[99] = children_2;
    $[100] = dialogElement;
  } else dialogElement = $[100];
  return dialogElement;
}
export { FittedOfferBody, AutocompactOfferDialog };
