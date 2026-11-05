/**
 * hooks/useTextInput.ts
 *
 * 文本输入核心 hook：按键映射到 Cursor 编辑操作（移动/删除/kill/yank/换行）、历史上下、双击 Esc 清空、Ctrl-C 处理、提交。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTextInput.ts
 * pieces: chunk-42wa4pww.js (20)
 * attribution: placement 18, file-local 1, fingerprint 1
 */
import { claimOnce } from "../services/api/verificationRequired.js";
import { logError } from "../utils/log.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../utils/errors.js";
import { HostScoped } from "../utils/hostScoped.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../services/analytics/growthbook.js";
import { isAttachSettled, getAttachStampMs } from "../utils/attachStamp.js";
import { logEvent } from "../services/analytics/index.js";
import { lit } from "../services/analytics/safeMetadata.js";
import { logForDebugging } from "../utils/debug.js";
import {
  shiftSpans,
  buildVirtualTextLayout,
  draftToDisplayOffset,
  offsetDecorations,
} from "../plugins/functionHooks/prompt/decorationSpans.js";
import { Cursor } from "../utils/Cursor.js";
import { announce } from "../utils/accessibility/screenReader.js";
import { env } from "../utils/env.js";
import { useIsFullscreen } from "../ink/renderModeContext.js";
import { useKillRing, topOfKillRing, nextYankPop } from "../utils/killRing.js";
import { useMemo, useState, useRef } from "../../vendor/react/cjs/react.production.js";
import { useNotifications } from "../context/notifications.js";
import { useTheme_2 } from "../components/design-system/ThemeProvider.js";
import { useDoublePress } from "../keybindings/useActionHandlers.js";
import { pickByHelper } from "../utils/git/gitSafeEnv.js";
import {
  prependModeCharacterToInput,
  isBashModeChar,
  getModeFromInput,
} from "../components/PromptInput/inputModes.js";
import { addHistoryEntry } from "../history.js";
import { markBackslashReturnUsed } from "../commands/terminalSetup/terminalSetup.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-42wa4pww.js:38712-38960 placement
/**
 * 文本换行行与原文不能完全拼合、回退到硬换行时，每进程只记录一次错误。
 */
function logWrapFallbackOnce(columns, textLength) {
  if (!claimOnce().claim("measured_text_wrap_fallback")) return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Wrapped rows do not tile the text (columns=${columns}, length=${textLength}); fell back to plain hard wrapping`,
      "Wrapped rows do not tile the text; fell back to plain hard wrapping",
    ),
  );
}
//@ chunk-42wa4pww.js:38960-39072 placement
class OnceFlag {
  prewarmed = false;
  claim() {
    if (this.prewarmed) return false;
    this.prewarmed = true;
    return true;
  }
  reset() {
    this.prewarmed = false;
  }
}
//@ chunk-42wa4pww.js:39072-39097 placement
var textInputStoreSlot; // deferred: uses OnceFlag of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-42wa4pww.js:39072", () => {
  textInputStoreSlot = new HostScoped(() => new OnceFlag());
});
//@ chunk-42wa4pww.js:39097-39112 placement
function noopTextInput() {}
//@ chunk-42wa4pww.js:39112-39136 placement
function returnFalseTextInput(event) {
  return false;
}
//@ chunk-42wa4pww.js:39136-39264 placement
/**
 * 左方向键手势的常量：武装窗口毫秒数、两段提示文字、吸收窗口与人手节奏间隔。
 */
var LEFT_ARROW_ARM_WINDOW_MS = 3000;
var LEFT_ARROW_BACK_HINT = "Press \u2190 again to go back to agents";
var LEFT_ARROW_DETACH_HINT = "Ambiguous \u2190, press again to detach";
var LEFT_ARROW_ABSORB_MS = 1000;
var HUMAN_CADENCE_MS = 150;
var ATTACH_CONFIRM_MIN_MS = 150;
//@ chunk-42wa4pww.js:39264-39402 placement
/**
 * 新建左方向键手势状态：编辑清空时间、武装时间、吸收锚点、上次有效按键时间、attach 确认武装时间、是否已记过吸收日志。
 */
function createLeftArrowGestureState() {
  return {
    editedEmptyAtMs: 0,
    armedAtMs: 0,
    absorbAnchorMs: 0,
    lastQualifiedLeftPressMs: 0,
    attachConfirmArmedAtMs: 0,
    absorbLogged: false,
  };
}
//@ chunk-42wa4pww.js:39402-40028 placement
/**
 * 决定一次左方向键（返回代理列表/脱离会话）该怎么处理：reject（不是单独按键）、fire（执行）、arm（刚清空输入，先提示再按一次）、absorb（人手节奏的连按被吞掉）、attach-arm/attach-absorb（attach 模式下的确认）。
 */
function decideLeftArrowGesture(
  state,
  nowMs,
  isSoloKey,
  guardEnabled = getFeatureValue_CACHED_MAY_BE_STALE("tengu_left_arrow_editing_guard", true),
  isAttached = isAttachSettled(nowMs),
  sinceMs = getAttachStampMs(),
) {
  if (isSoloKey !== true) return "reject";
  let isRecent = (timestamp) => timestamp !== 0 && timestamp >= sinceMs;
  if (isAttached) {
    if (isRecent(state.absorbAnchorMs) && nowMs - state.absorbAnchorMs < LEFT_ARROW_ABSORB_MS)
      return "attach-absorb";
    if (isRecent(state.attachConfirmArmedAtMs) && nowMs - state.attachConfirmArmedAtMs <= 3000)
      return nowMs - state.attachConfirmArmedAtMs >= ATTACH_CONFIRM_MIN_MS ? "fire" : "attach-absorb";
    return "attach-arm";
  }
  if (!guardEnabled) return "fire";
  if (isRecent(state.lastQualifiedLeftPressMs) && nowMs - state.lastQualifiedLeftPressMs < HUMAN_CADENCE_MS)
    return "absorb";
  if (isRecent(state.armedAtMs) && nowMs - state.armedAtMs <= 3000) return "fire";
  if (isRecent(state.absorbAnchorMs) && nowMs - state.absorbAnchorMs < LEFT_ARROW_ABSORB_MS) return "absorb";
  return isRecent(state.editedEmptyAtMs) && nowMs - state.editedEmptyAtMs < 2000 ? "arm" : "fire";
}
//@ chunk-42wa4pww.js:40028-40522 placement
/**
 * 按 decideLeftArrowGesture 的结果更新手势状态（武装、吸收锚点、上次按键时间等）。
 */
function applyLeftArrowGesture(state, decision, nowMs) {
  switch (decision) {
    case "fire":
      if (state.armedAtMs !== 0) state.editedEmptyAtMs = 0;
      state.armedAtMs = 0;
      state.attachConfirmArmedAtMs = 0;
      state.absorbAnchorMs = nowMs;
      state.lastQualifiedLeftPressMs = nowMs;
      state.absorbLogged = false;
      return;
    case "arm":
      state.armedAtMs = nowMs;
      state.absorbAnchorMs = nowMs;
      state.lastQualifiedLeftPressMs = nowMs;
      state.absorbLogged = false;
      return;
    case "absorb":
      if (nowMs - state.lastQualifiedLeftPressMs < HUMAN_CADENCE_MS) state.absorbAnchorMs = nowMs;
      state.lastQualifiedLeftPressMs = nowMs;
      return;
    case "reject":
      return;
    case "attach-arm":
      state.attachConfirmArmedAtMs = nowMs;
      return;
    case "attach-absorb":
      return;
  }
}
//@ chunk-42wa4pww.js:40522-41484 placement
/**
 * 为被拦下的左方向键手势打点 tengu_left_arrow_blocked（原因：editing-quiet、attach-quiet、not-solo、absorb 等）并写调试日志；吸收日志每个锚点只记一次。
 */
function logLeftArrowGesture(decision, nowMs, state) {
  let msSinceAttach = nowMs - getAttachStampMs();
  switch (decision) {
    case "fire":
      return;
    case "arm":
      logEvent("tengu_left_arrow_blocked", {
        reason: lit("editing-quiet"),
      });
      return;
    case "attach-arm":
      logEvent("tengu_left_arrow_blocked", {
        reason: lit("attach-quiet-hint"),
        ms_since_stamp: msSinceAttach,
      });
      logForDebugging(`leftArrowGesture: attach-quiet hint armed (ms_since_stamp=${msSinceAttach})`, {
        level: "debug",
      });
      return;
    case "attach-absorb":
      logEvent("tengu_left_arrow_blocked", {
        reason: lit("attach-quiet"),
        ms_since_stamp: msSinceAttach,
      });
      logForDebugging(`leftArrowGesture: attach-quiet silent absorb (ms_since_stamp=${msSinceAttach})`, {
        level: "debug",
      });
      return;
    case "reject":
      if (claimOnce().claim("left_arrow_not_solo_reject"))
        logEvent("tengu_left_arrow_blocked", {
          reason: lit("not-solo"),
        });
      return;
    case "absorb":
      if (state.absorbAnchorMs === nowMs || state.absorbLogged) return;
      state.absorbLogged = true;
      let msSincePress = nowMs - state.absorbAnchorMs;
      logEvent("tengu_left_arrow_blocked", {
        reason: lit("absorb"),
        ms_since_press: msSincePress,
      });
      logForDebugging(
        `leftArrowGesture: human-cadence press absorbed, too soon after the last \u2190 that fired or showed the hint (ms_since_press=${msSincePress})`,
        {
          level: "debug",
        },
      );
      return;
  }
}
//@ chunk-42wa4pww.js:41484-41592 placement (2.1.88 match: setCwdState, 1)
var rangesBefore = (ranges, limit) => ranges.filter((range) => range.start < limit);
var isNfcStable = (text, virtualTextLayout) =>
  text.normalize("NFC") === text && virtualTextLayout.text.normalize("NFC") === virtualTextLayout.text;
//@ chunk-42wa4pww.js:41592-41920 placement
/**
 * 按方向移动光标，跳过与当前偏移相同或（上下移动时）不在目标行的位置，直到找到一个实际不同的光标位置；到边界时原地不动。
 */
function moveCursorToDistinctRow(layout, startCursor, key) {
  let isVertical = key === "up" || key === "down";
  let current = layout.cursorOver(startCursor);
  for (;;) {
    let nextCursor = current[key]();
    if (nextCursor.equals(current)) return startCursor;
    let line = nextCursor.getPosition().line;
    let offset = shiftSpans(layout.text, nextCursor.offset);
    let found = (
      isVertical
        ? [offset, startCursor.measuredText.nextOffset(offset), startCursor.measuredText.prevOffset(offset)]
        : [offset]
    ).find(
      (candidateOffset) =>
        candidateOffset !== startCursor.offset && (!isVertical || layout.rowOf(candidateOffset) === line),
    );
    if (found !== undefined) return new Cursor(startCursor.measuredText, found);
    current = nextCursor;
  }
}
//@ chunk-42wa4pww.js:41920-42358 placement
/**
 * 把带占位文本（如折叠粘贴）的缓冲区展开成显示文本并测量换行，返回显示/缓冲区偏移换算与按行移动光标的辅助函数；NFC 不稳定时返回 undefined。
 */
function buildDisplayTextMapping({ buffer, texts, columns, side }) {
  if (texts.length === 0) return;
  let virtualTextLayout = buildVirtualTextLayout(buffer, texts);
  if (!isNfcStable(buffer, virtualTextLayout)) return;
  let { measuredText } = Cursor.fromText(virtualTextLayout.text, columns);
  let cursorOver = (offset) =>
    new Cursor(measuredText, draftToDisplayOffset(virtualTextLayout, offset.offset, side));
  let rowOf = (offset) =>
    measuredText.getPositionFromOffset(draftToDisplayOffset(virtualTextLayout, offset, side)).line;
  return {
    text: virtualTextLayout,
    cursorOver,
    rowOf,
    lastRow: () => {
      let shift = draftToDisplayOffset(virtualTextLayout, buffer.length, "before");
      return measuredText.getPositionFromOffset(
        buffer.endsWith(`
`)
          ? shift
          : measuredText.prevOffset(shift),
      ).line;
    },
    rowMoved: (from, to) =>
      moveCursorToDistinctRow(
        {
          text: virtualTextLayout,
          cursorOver,
          rowOf,
        },
        from,
        to,
      ),
  };
}
//@ chunk-42wa4pww.js:42358-42598 placement
/**
 * 为输入缓冲区建立光标：有显示映射时光标落在显示文本上，并给出把显示偏移换回缓冲区偏移的函数；否则直接用缓冲区。
 */
function createDisplayCursor({ buffer, offset, texts, columns, side }) {
  let cursor = Cursor.fromText(buffer, columns, offset);
  let displayTextMapping = buildDisplayTextMapping({
    buffer,
    texts,
    columns,
    side,
  });
  if (displayTextMapping === undefined)
    return {
      cursor,
      bufferOffset: (offset) => offset,
    };
  return {
    cursor: displayTextMapping.cursorOver(cursor),
    bufferOffset: (offset) => shiftSpans(displayTextMapping.text, offset),
  };
}
//@ chunk-42wa4pww.js:42598-42612 placement
var noopTextInputCallback = () => {};
//@ chunk-42wa4pww.js:42612-42791 placement
function announceDeletion(deleted, mask) {
  if (deleted === "") return;
  if (mask !== "") {
    announce("deleted");
    return;
  }
  let description =
    deleted.trim() === ""
      ? deleted.includes(`
`)
        ? "new line"
        : deleted.includes("\t")
          ? "tab"
          : "space"
      : deleted
          .replaceAll(
            `
`,
            " ",
          )
          .trim();
  announce(description);
}
//@ chunk-42wa4pww.js:42791-42926 placement
var IGNORED_KEY_NAMES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-42wa4pww.js:42791", () => {
  IGNORED_KEY_NAMES = new Set([
    "insert",
    "clear",
    "enter",
    "center",
    "undefined",
    "mouse",
    "f1",
    "f2",
    "f3",
    "f4",
    "f5",
    "f6",
    "f7",
    "f8",
    "f9",
    "f10",
    "f11",
    "f12",
  ]);
});
//@ chunk-42wa4pww.js:42926-42991 placement
/**
 * 函数 needsShiftWorkaround（Apple Terminal 需要 shift 兼容）；位于「文本输入核心 hook：按键映射到 Cursor 编辑操作（移动/删除/kill/yank/换行）、历史上下、双击 Esc 清空、Ctrl-C 处理、提交」模块。
 */
function needsShiftWorkaround() {
  return env.terminal === "Apple_Terminal" && returnFalseTextInput("shift");
}
//@ chunk-42wa4pww.js:42991-43067 file-local
function mapInput(input_map) {
  let map = new Map(input_map);
  return function (input) {
    return (map.get(input) ?? noopTextInputCallback)(input);
  };
}
//@ chunk-42wa4pww.js:43067-50977 fingerprint (2.1.88 match: useTextInput, 0.462)
/**
 * 文本输入核心：把按键映射为 Cursor 操作（ctrl+a/e/b/f/h/d/k/u/w/y、alt+b/f/d、方向键、home/end、换行 \⏎/shift+⏎），上下键在多行内移动或触发历史；Esc 双击清空（escape-again-to-clear），Ctrl-C 清空或退出提示；Apple Terminal 特判；返回 onInput、渲染文本与光标位置。
 */
function useTextInput({
  value,
  onChange,
  onSubmit,
  onExit,
  onExitMessage,
  onEscapeMessage,
  historyOnClear = true,
  onLeftArrowOnEmpty,
  leftArrowConfirmHint,
  onHistoryUp,
  onHistoryDown,
  onHistoryReset,
  mask = "",
  maskWhole = false,
  multiline = false,
  disableBackslashReturn = false,
  clearOnSubmit = true,
  disableCtrlCClear = false,
  cursorChar,
  preserveTrailingWhitespace = false,
  invert,
  columns,
  leadingPill,
  onImagePaste: _onImagePaste,
  disableCursorMovementForUpDownKeys = false,
  disableEscapeDoublePress = false,
  maxVisibleLines,
  externalOffset,
  onOffsetChange,
  inputFilter,
  getPastedContents,
  getInputMode,
  inlineGhostText,
  dim,
  virtualTexts,
  isCursorOnCharacter = false,
  editRelay,
  commitEdit,
  selectionAnchor,
  selectionLinewise = false,
}) {
  let isFullscreen = useIsFullscreen();
  let killRing = useKillRing();
  if (env.terminal === "Apple_Terminal") noopTextInput();
  let offset = externalOffset;
  let setOffset = onOffsetChange;
  let text = leadingPill?.text ?? "";
  let cursor = Cursor.fromText(text + value, columns, text.length + offset);
  let ghostText =
    inlineGhostText && dim && inlineGhostText.insertPosition === offset
      ? {
          text: inlineGhostText.text,
          dim,
        }
      : undefined;
  let ghostAtEnd = ghostText !== undefined && offset >= value.length;
  let displayMapping = useMemo(
    () =>
      virtualTexts === undefined || virtualTexts.length === 0 || value === "" || mask !== ""
        ? undefined
        : buildDisplayTextMapping({
            buffer: text + value,
            texts: offsetDecorations(
              ghostAtEnd ? rangesBefore(virtualTexts, value.length) : virtualTexts,
              text.length,
            ),
            columns,
            side: isCursorOnCharacter ? "after" : "before",
          }),
    [virtualTexts, value, mask, text, ghostAtEnd, columns, isCursorOnCharacter],
  );
  let didSubmit = false;
  let currentEvent;
  let insertedModeChar = false;
  function applyInputFilter(rawInput) {
    return inputFilter && currentEvent ? inputFilter(rawInput, currentEvent) : rawInput;
  }
  let { addNotification, removeNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let [state] = useState(createLeftArrowGestureState);
  let leftArrowHintKey = "left-arrow-again-for-agents";
  let ctrlCState = useRef({
    key: "Ctrl-C",
    pending: false,
  });
  let handleCtrlC = useDoublePress(
    (show) => {
      ctrlCState.current.pending = show;
      onExitMessage?.(show, ctrlCState.current.key);
    },
    () => onExit?.(),
    () => {
      if (!disableCtrlCClear && value) {
        onChange("");
        setOffset(0);
        onHistoryReset?.();
      }
    },
  );
  function armCtrlC(key) {
    if (!ctrlCState.current.pending) ctrlCState.current.key = key;
    handleCtrlC();
  }
  let handleEscape = useDoublePress(
    (show) => {
      if (!value) return;
      if (onEscapeMessage) {
        onEscapeMessage(show);
        return;
      }
      if (!show) return;
      addNotification({
        key: "escape-again-to-clear",
        kind: "feedback",
        text: "Esc again to clear",
        row1Hint: "Esc again to clear",
        priority: "immediate",
        timeoutMs: 1000,
      });
    },
    () => {
      onEscapeMessage?.(false);
      removeNotification("escape-again-to-clear");
      if (value) {
        if (historyOnClear && mask === "" && value.trim() !== "") {
          let unavailableContents = getPastedContents
            ? pickByHelper(getPastedContents(), (show) => show.type === "text" && show.unavailable === true)
            : undefined;
          let inputMode = getInputMode?.();
          let inputWithModeChar =
            inputMode !== undefined ? prependModeCharacterToInput(value, inputMode) : value;
          let historyEntry = unavailableContents
            ? {
                display: inputWithModeChar,
                pastedContents: unavailableContents,
              }
            : inputWithModeChar;
          if (inputMode !== undefined)
            addHistoryEntry(historyEntry, storageV5, {
              submitMode: inputMode,
            });
          else addHistoryEntry(historyEntry, storageV5);
        }
        onChange("");
        setOffset(0);
        onHistoryReset?.();
      }
    },
  );
  function handleCtrlD() {
    if (cursor.text === text && value === "") {
      armCtrlC("Ctrl-D");
      return cursor;
    }
    return cursor.del();
  }
  function killToLineEnd() {
    if (text !== "" && cursor.offset === text.length)
      return Cursor.fromText(cursor.text.slice(text.length), columns);
    return cursor.backspace();
  }
  function recordKill(killed, direction) {
    let killedText = killed.startsWith(text) ? killed.slice(text.length) : killed;
    killRing.dispatch(
      mask === ""
        ? {
            type: "kill",
            text: killedText,
            direction,
          }
        : {
            type: "interrupt",
          },
    );
    announceDeletion(killedText, mask);
    return killedText;
  }
  function killToLineEnd_2() {
    let { cursor: newCursor, killed } = cursor.deleteToLineEnd(moveCursor("endOfLine"));
    recordKill(killed, "append");
    return newCursor;
  }
  function killToLineStart() {
    let { cursor: newCursor, killed } = cursor.deleteToLineStart(moveCursor("startOfLine"));
    let killedText = recordKill(killed, "prepend");
    if (mask === "" && killedText.length >= 3)
      addNotification({
        key: "kill-paste-hint",
        kind: "hint",
        text: "Ctrl+Y to paste deleted text",
        row1Hint: "ctrl+y to undo delete",
        priority: "immediate",
        timeoutMs: 5000,
      });
    return newCursor;
  }
  function killWordAfter() {
    let { cursor: cursor_2, killed } = cursor.killWord();
    recordKill(killed, "append");
    return cursor_2;
  }
  function killToLineStart_2() {
    let { cursor: cursor_2, killed } = cursor.backwardKillWord();
    recordKill(killed, "prepend");
    return cursor_2;
  }
  function killWordBefore() {
    let { cursor: cursor_2, killed } = cursor.deleteWORDBefore();
    recordKill(killed, "prepend");
    return cursor_2;
  }
  function yank() {
    let text_2 = applyInputFilter(topOfKillRing(killRing.state));
    if (text_2.length > 0) {
      let start = cursor.offset - text.length;
      let newCursor = cursor.insert(text_2);
      killRing.dispatch({
        type: "yank",
        start,
        length: text_2.length,
      });
      return newCursor;
    }
    return cursor;
  }
  function handleYankPop() {
    let popResult = nextYankPop(killRing.state);
    if (!popResult) return cursor;
    let { text: text_2, length } = popResult;
    let start = text.length + popResult.start;
    let text_3 = applyInputFilter(text_2);
    killRing.dispatch({
      type: "yankPop",
    });
    let before = cursor.text.slice(0, start);
    let after = cursor.text.slice(start + length);
    let newText = before + text_3 + after;
    let newOffset = start + text_3.length;
    killRing.dispatch({
      type: "updateYankLength",
      length: text_3.length,
    });
    return Cursor.fromText(newText, columns, newOffset);
  }
  let handleCtrl = mapInput([
    ["a", () => cursor.startOfLogicalLine()],
    ["b", () => cursor.left()],
    [
      "c",
      () => {
        armCtrlC("Ctrl-C");
        return cursor;
      },
    ],
    ["d", handleCtrlD],
    ["e", () => cursor.endOfLogicalLine()],
    ["f", () => cursor.right()],
    ["h", killToLineEnd],
    ["k", killToLineEnd_2],
    ["n", () => downOrHistoryDown()],
    ["p", () => upOrHistoryUp()],
    ["u", killToLineStart],
    ["w", killWordBefore],
    ["y", yank],
  ]);
  let handleMeta = mapInput([
    ["b", () => cursor.backwardWord()],
    ["f", () => cursor.forwardWord()],
    ["d", killWordAfter],
    ["y", handleYankPop],
  ]);
  function handleEnter({ meta, shift }) {
    if (
      multiline &&
      !disableBackslashReturn &&
      cursor.offset > 0 &&
      cursor.text[cursor.offset - 1] === "\\"
    ) {
      markBackslashReturnUsed(storageV5);
      return cursor.backspace().insert(
        applyInputFilter(`
`),
      );
    }
    if (meta || shift)
      return cursor.insert(
        applyInputFilter(`
`),
      );
    if (needsShiftWorkaround())
      return cursor.insert(
        applyInputFilter(`
`),
      );
    if (onSubmit) {
      onSubmit(cursor.text.slice(text.length));
      didSubmit = true;
    }
    return cursor;
  }
  function noteEditedEmpty() {
    state.editedEmptyAtMs = Date.now();
  }
  function disarmLeftArrowHint() {
    if (state.armedAtMs === 0) return;
    state.armedAtMs = 0;
    removeNotification(leftArrowHintKey);
  }
  function getDisplayMapping() {
    return displayMapping !== undefined && cursor.text === displayMapping.text.draft
      ? displayMapping
      : undefined;
  }
  function moveCursor(key) {
    return getDisplayMapping()?.rowMoved(cursor, key) ?? cursor[key]();
  }
  function upOrHistoryUp() {
    if (disableCursorMovementForUpDownKeys) {
      noteEditedEmpty();
      onHistoryUp?.();
      return cursor;
    }
    let mapping = getDisplayMapping();
    if (
      onHistoryUp &&
      (mapping
        ? mapping.rowOf(cursor.offset) <= mapping.rowOf(text.length)
        : cursor.getPosition().line <= cursor.measuredText.getPositionFromOffset(text.length).line)
    ) {
      noteEditedEmpty();
      onHistoryUp();
      return cursor;
    }
    let upCursor = moveCursor("up");
    if (!upCursor.equals(cursor)) return upCursor;
    if (multiline) {
      let cursorUpLogical = cursor.upLogicalLine();
      if (!cursorUpLogical.equals(cursor)) return cursorUpLogical;
    }
    return cursor;
  }
  function downOrHistoryDown() {
    if (disableCursorMovementForUpDownKeys) {
      noteEditedEmpty();
      onHistoryDown?.();
      return cursor;
    }
    let downMapping = getDisplayMapping();
    if (
      onHistoryDown &&
      (downMapping
        ? downMapping.rowOf(cursor.offset) >= downMapping.lastRow()
        : cursor.getPosition().line >= cursor.measuredText.lineCount - 1)
    ) {
      noteEditedEmpty();
      onHistoryDown();
      return cursor;
    }
    let cursorDown = moveCursor("down");
    if (!cursorDown.equals(cursor)) return cursorDown;
    if (multiline) {
      let cursorDownLogical = cursor.downLogicalLine();
      if (!cursorDownLogical.equals(cursor)) return cursorDownLogical;
    }
    return cursor;
  }
  function mapKey(key) {
    if (key.ctrl && (key.key === "k" || key.key === "u" || key.key === "w")) return true;
    if (key.meta && !key.ctrl && key.key === "d") return true;
    if (key.key === "backspace" && (key.meta || key.superKey || key.ctrl)) return true;
    if (key.key === "delete" && (key.meta || key.superKey)) return true;
    return false;
  }
  function isYankKey(input) {
    return (input.ctrl || input.meta) && input.key === "y";
  }
  function isKillKey(key, input) {
    switch (key.name) {
      case "escape":
        if (disableEscapeDoublePress) return;
        handleEscape();
        return cursor;
      case "left":
        if (key.superKey) return moveCursor("startOfLine");
        if (key.ctrl || key.meta || key.fn) return cursor.backwardWord();
        if (onLeftArrowOnEmpty && !key.shift && cursor.text === text) {
          let now = Date.now();
          let decision = decideLeftArrowGesture(state, now, key.soloKeypress);
          let msSinceArm = state.armedAtMs === 0 ? undefined : now - state.absorbAnchorMs;
          switch (
            (applyLeftArrowGesture(state, decision, now), logLeftArrowGesture(decision, now, state), decision)
          ) {
            case "fire":
              removeNotification(leftArrowHintKey);
              onLeftArrowOnEmpty(msSinceArm);
              return cursor;
            case "arm":
              addNotification({
                key: leftArrowHintKey,
                kind: "feedback",
                text: leftArrowConfirmHint ?? "Press \u2190 again",
                priority: "immediate",
                timeoutMs: LEFT_ARROW_ARM_WINDOW_MS,
              });
              return cursor;
            case "absorb":
              return cursor;
            case "attach-arm":
              addNotification({
                key: leftArrowHintKey,
                kind: "feedback",
                text: LEFT_ARROW_DETACH_HINT,
                priority: "immediate",
                timeoutMs: LEFT_ARROW_ARM_WINDOW_MS,
              });
              return cursor;
            case "attach-absorb":
              return cursor;
            case "reject":
              return cursor.left();
          }
        }
        return cursor.left();
      case "right":
        if (key.superKey) return moveCursor("endOfLine");
        if (key.ctrl || key.meta || key.fn) return cursor.forwardWord();
        return cursor.right();
      case "up":
        if (key.shift || key.ctrl || key.meta) return;
        return upOrHistoryUp();
      case "down":
        if (key.shift || key.ctrl || key.meta) return;
        return downOrHistoryDown();
      case "backspace":
        if (key.superKey) return killToLineStart();
        if (key.meta || key.ctrl) return killToLineStart_2();
        return killToLineEnd();
      case "delete":
        if (key.superKey) return killToLineEnd_2();
        if (key.meta) return killToLineEnd_2();
        return cursor.del();
      case "home":
        if (key.ctrl) return;
        return moveCursor("startOfLine");
      case "end":
        if (key.ctrl) return;
        return moveCursor("endOfLine");
      case "pagedown":
        if (isFullscreen || key.ctrl) return;
        return moveCursor("endOfLine");
      case "pageup":
        if (isFullscreen || key.ctrl) return;
        return moveCursor("startOfLine");
      case "return":
        if (key.ctrl) return;
        return handleEnter(key);
      case "enter":
        return cursor.insert(
          applyInputFilter(`
`),
        );
      case "tab":
        return;
    }
    if (multiline && key.ctrl && !key.shift && !key.meta && key.name === "j")
      return cursor.insert(
        applyInputFilter(`
`),
      );
    if (key.ctrl) return handleCtrl(key.key);
    if (key.meta) return handleMeta(key.key);
    if (IGNORED_KEY_NAMES.has(key.name)) return;
    if (input.length === 0) return;
    if (
      getInputMode !== undefined &&
      cursor.offset === text.length &&
      isBashModeChar(input) &&
      getInputMode() !== getModeFromInput(input)
    ) {
      insertedModeChar = true;
      return cursor.insert(input).left();
    }
    return cursor.insert(input);
  }
  function handleKeyDown(event) {
    currentEvent = event;
    insertedModeChar = false;
    let filteredKey = inputFilter ? inputFilter(event.key, event) : event.key;
    if (filteredKey === "" && event.key !== "") {
      event.preventDefault();
      return;
    }
    if (!mapKey(event) && !isYankKey(event))
      killRing.dispatch({
        type: "interrupt",
      });
    if (!(
      event.name === "left" &&
      !event.ctrl &&
      !event.meta &&
      !event.fn &&
      !event.superKey &&
      !event.shift
    ))
      disarmLeftArrowHint();
    let nextCursor = isKillKey(event, filteredKey);
    if (nextCursor === undefined) return;
    event.preventDefault();
    if (!cursor.equals(nextCursor)) {
      let keepsPill = nextCursor.text.startsWith(text);
      if (keepsPill && nextCursor.offset < text.length)
        nextCursor = new Cursor(nextCursor.measuredText, text.length);
      let sliced = cursor.text.slice(text.length);
      let nextText = keepsPill ? nextCursor.text.slice(text.length) : nextCursor.text;
      let nextOffset = nextCursor.offset - (keepsPill ? text.length : 0);
      if (sliced !== "" && nextText === "") state.editedEmptyAtMs = Date.now();
      if (sliced !== nextText)
        if (commitEdit !== undefined && !insertedModeChar) commitEdit(() => onChange(nextText));
        else onChange(nextText);
      setOffset(nextOffset);
      if (editRelay?.isRecording() === true && !insertedModeChar)
        editRelay.record({
          before: {
            text: sliced,
            cursor: Math.max(0, cursor.offset - text.length),
          },
          after: {
            text: nextText,
            cursor: nextOffset,
          },
          key: event,
        });
      cursor = nextCursor;
      if (!keepsPill) {
        text = "";
        leadingPill?.onDelete();
      }
    }
    if (didSubmit) {
      didSubmit = false;
      if (clearOnSubmit) cursor = Cursor.fromText(text, columns, text.length);
    }
  }
  let mapping = getDisplayMapping();
  let viewCursor = mapping?.cursorOver(cursor) ?? cursor;
  let cursorPos = viewCursor.getPosition();
  return {
    handleKeyDown,
    renderedValue: viewCursor.render(
      cursorChar,
      mask,
      invert,
      ghostText,
      maxVisibleLines,
      selectionAnchor === undefined || selectionAnchor === null
        ? undefined
        : mapping
          ? draftToDisplayOffset(mapping.text, text.length + selectionAnchor, "after")
          : text.length + selectionAnchor,
      selectionLinewise,
      preserveTrailingWhitespace,
      mapping?.text.spans,
      maskWhole,
    ),
    offset,
    setOffset,
    cursorLine: cursorPos.line - viewCursor.getViewportStartLine(maxVisibleLines),
    cursorColumn: cursorPos.column,
    renderedRowStartOffsets: viewCursor.getRenderedRowStartOffsets(maxVisibleLines),
    shown: mapping && {
      text: mapping.text,
      cursorOffset: viewCursor.offset,
    },
    noteKeystrokeEmptied: () => {
      state.editedEmptyAtMs = Date.now();
    },
    disarmLeftArrowConfirm: disarmLeftArrowHint,
  };
}
export {
  logWrapFallbackOnce,
  useTextInput,
  HUMAN_CADENCE_MS,
  LEFT_ARROW_BACK_HINT,
  isNfcStable,
  rangesBefore,
  createDisplayCursor,
  needsShiftWorkaround,
  createLeftArrowGestureState,
  LEFT_ARROW_ARM_WINDOW_MS,
  decideLeftArrowGesture,
  applyLeftArrowGesture,
  logLeftArrowGesture,
  LEFT_ARROW_DETACH_HINT,
};
