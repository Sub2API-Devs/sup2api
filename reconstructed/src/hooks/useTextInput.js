/**
 * hooks/useTextInput.ts
 *
 * 文本输入核心 hook：按键映射到 Cursor 编辑操作（移动/删除/kill/yank/换行）、历史上下、双击 Esc 清空、Ctrl-C 处理、提交。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useTextInput.ts
 * pieces: chunk-7p2hc4jn.js (20)
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
import { Q, y, R } from "../../vendor/react/cjs/react.production.js";
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

//@ chunk-7p2hc4jn.js:38712-38960 placement
/**
 * 文本换行行与原文不能完全拼合、回退到硬换行时，每进程只记录一次错误。
 */
function logWrapFallbackOnce(columns, r) {
  if (!claimOnce().claim("measured_text_wrap_fallback")) return;
  logError(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Wrapped rows do not tile the text (columns=${columns}, length=${r}); fell back to plain hard wrapping`,
      "Wrapped rows do not tile the text; fell back to plain hard wrapping",
    ),
  );
}
//@ chunk-7p2hc4jn.js:38960-39072 placement
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
//@ chunk-7p2hc4jn.js:39072-39097 placement
var textInputStoreSlot = new HostScoped(() => new OnceFlag());
//@ chunk-7p2hc4jn.js:39097-39112 placement
function noopTextInput() {}
//@ chunk-7p2hc4jn.js:39112-39136 placement
function returnFalseTextInput(e) {
  return false;
}
//@ chunk-7p2hc4jn.js:39136-39264 placement
/**
 * 左方向键手势的常量：武装窗口毫秒数、两段提示文字、吸收窗口与人手节奏间隔。
 */
var LEFT_ARROW_ARM_WINDOW_MS = 3000;
var LEFT_ARROW_BACK_HINT = "Press \u2190 again to go back to agents";
var LEFT_ARROW_DETACH_HINT = "Ambiguous \u2190, press again to detach";
var LEFT_ARROW_ABSORB_MS = 1000;
var HUMAN_CADENCE_MS = 150;
var ATTACH_CONFIRM_MIN_MS = 150;
//@ chunk-7p2hc4jn.js:39264-39402 placement
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
//@ chunk-7p2hc4jn.js:39402-40028 placement
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
  let isRecent = (x) => x !== 0 && x >= sinceMs;
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
//@ chunk-7p2hc4jn.js:40028-40522 placement
/**
 * 按 decideLeftArrowGesture 的结果更新手势状态（武装、吸收锚点、上次按键时间等）。
 */
function applyLeftArrowGesture(e, r, n) {
  switch (r) {
    case "fire":
      if (e.armedAtMs !== 0) e.editedEmptyAtMs = 0;
      e.armedAtMs = 0;
      e.attachConfirmArmedAtMs = 0;
      e.absorbAnchorMs = n;
      e.lastQualifiedLeftPressMs = n;
      e.absorbLogged = false;
      return;
    case "arm":
      e.armedAtMs = n;
      e.absorbAnchorMs = n;
      e.lastQualifiedLeftPressMs = n;
      e.absorbLogged = false;
      return;
    case "absorb":
      if (n - e.lastQualifiedLeftPressMs < HUMAN_CADENCE_MS) e.absorbAnchorMs = n;
      e.lastQualifiedLeftPressMs = n;
      return;
    case "reject":
      return;
    case "attach-arm":
      e.attachConfirmArmedAtMs = n;
      return;
    case "attach-absorb":
      return;
  }
}
//@ chunk-7p2hc4jn.js:40522-41484 placement
/**
 * 为被拦下的左方向键手势打点 tengu_left_arrow_blocked（原因：editing-quiet、attach-quiet、not-solo、absorb 等）并写调试日志；吸收日志每个锚点只记一次。
 */
function logLeftArrowGesture(decision, nowMs, state) {
  let s = nowMs - getAttachStampMs();
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
        ms_since_stamp: s,
      });
      logForDebugging(`leftArrowGesture: attach-quiet hint armed (ms_since_stamp=${s})`, {
        level: "debug",
      });
      return;
    case "attach-absorb":
      logEvent("tengu_left_arrow_blocked", {
        reason: lit("attach-quiet"),
        ms_since_stamp: s,
      });
      logForDebugging(`leftArrowGesture: attach-quiet silent absorb (ms_since_stamp=${s})`, {
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
      let o = nowMs - state.absorbAnchorMs;
      logEvent("tengu_left_arrow_blocked", {
        reason: lit("absorb"),
        ms_since_press: o,
      });
      logForDebugging(
        `leftArrowGesture: human-cadence press absorbed, too soon after the last \u2190 that fired or showed the hint (ms_since_press=${o})`,
        {
          level: "debug",
        },
      );
      return;
  }
}
//@ chunk-7p2hc4jn.js:41484-41592 placement = setCwdState (1)
var rangesBefore = (e, r) => e.filter((n) => n.start < r);
var isNfcStable = (e, virtualTextLayout) =>
  e.normalize("NFC") === e && virtualTextLayout.text.normalize("NFC") === virtualTextLayout.text;
//@ chunk-7p2hc4jn.js:41592-41920 placement
/**
 * 按方向移动光标，跳过与当前偏移相同或（上下移动时）不在目标行的位置，直到找到一个实际不同的光标位置；到边界时原地不动。
 */
function moveCursorToDistinctRow(e, r, n) {
  let s = n === "up" || n === "down";
  let o = e.cursorOver(r);
  for (;;) {
    let u = o[n]();
    if (u.equals(o)) return r;
    let line = u.getPosition().line;
    let h = shiftSpans(e.text, u.offset);
    let found = (s ? [h, r.measuredText.nextOffset(h), r.measuredText.prevOffset(h)] : [h]).find(
      (T) => T !== r.offset && (!s || e.rowOf(T) === line),
    );
    if (found !== undefined) return new Cursor(r.measuredText, found);
    o = u;
  }
}
//@ chunk-7p2hc4jn.js:41920-42358 placement
/**
 * 把带占位文本（如折叠粘贴）的缓冲区展开成显示文本并测量换行，返回显示/缓冲区偏移换算与按行移动光标的辅助函数；NFC 不稳定时返回 undefined。
 */
function buildDisplayTextMapping({ buffer, texts, columns, side }) {
  if (texts.length === 0) return;
  let virtualTextLayout = buildVirtualTextLayout(buffer, texts);
  if (!isNfcStable(buffer, virtualTextLayout)) return;
  let { measuredText } = Cursor.fromText(virtualTextLayout.text, columns);
  let cursorOver = (x) => new Cursor(measuredText, draftToDisplayOffset(virtualTextLayout, x.offset, side));
  let rowOf = (x) =>
    measuredText.getPositionFromOffset(draftToDisplayOffset(virtualTextLayout, x, side)).line;
  return {
    text: virtualTextLayout,
    cursorOver,
    rowOf,
    lastRow: () => {
      let x = draftToDisplayOffset(virtualTextLayout, buffer.length, "before");
      return measuredText.getPositionFromOffset(
        buffer.endsWith(`
`)
          ? x
          : measuredText.prevOffset(x),
      ).line;
    },
    rowMoved: (x, T) =>
      moveCursorToDistinctRow(
        {
          text: virtualTextLayout,
          cursorOver,
          rowOf,
        },
        x,
        T,
      ),
  };
}
//@ chunk-7p2hc4jn.js:42358-42598 placement
/**
 * 为输入缓冲区建立光标：有显示映射时光标落在显示文本上，并给出把显示偏移换回缓冲区偏移的函数；否则直接用缓冲区。
 */
function createDisplayCursor({ buffer, offset, texts, columns, side }) {
  let u = Cursor.fromText(buffer, columns, offset);
  let displayTextMapping = buildDisplayTextMapping({
    buffer,
    texts,
    columns,
    side,
  });
  if (displayTextMapping === undefined)
    return {
      cursor: u,
      bufferOffset: (h) => h,
    };
  return {
    cursor: displayTextMapping.cursorOver(u),
    bufferOffset: (h) => shiftSpans(displayTextMapping.text, h),
  };
}
//@ chunk-7p2hc4jn.js:42598-42612 placement
var noopTextInputCallback = () => {};
//@ chunk-7p2hc4jn.js:42612-42791 placement
function announceDeletion(e, mask) {
  if (e === "") return;
  if (mask !== "") {
    announce("deleted");
    return;
  }
  let n =
    e.trim() === ""
      ? e.includes(`
`)
        ? "new line"
        : e.includes("\t")
          ? "tab"
          : "space"
      : e
          .replaceAll(
            `
`,
            " ",
          )
          .trim();
  announce(n);
}
//@ chunk-7p2hc4jn.js:42791-42926 placement
var IGNORED_KEY_NAMES = new Set([
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
//@ chunk-7p2hc4jn.js:42926-42991 placement
/**
 * 函数 needsShiftWorkaround（Apple Terminal 需要 shift 兼容）；位于「文本输入核心 hook：按键映射到 Cursor 编辑操作（移动/删除/kill/yank/换行）、历史上下、双击 Esc 清空、Ctrl-C 处理、提交」模块。
 */
function needsShiftWorkaround() {
  return env.terminal === "Apple_Terminal" && returnFalseTextInput("shift");
}
//@ chunk-7p2hc4jn.js:42991-43067 file-local
function mapInput(input_map) {
  let map = new Map(input_map);
  return function (input) {
    return (map.get(input) ?? noopTextInputCallback)(input);
  };
}
//@ chunk-7p2hc4jn.js:43067-50977 fingerprint = useTextInput (0.462)
/**
 * 文本输入核心：把按键映射为 Cursor 操作（ctrl+a/e/b/f/h/d/k/u/w/y、alt+b/f/d、方向键、home/end、换行 \⏎/shift+⏎），上下键在多行内移动或触发历史；Esc 双击清空（escape-again-to-clear），Ctrl-C 清空或退出提示；Apple Terminal 特判；返回 onInput、渲染文本与光标位置。
 */
function useTextInput({
  value: e,
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
  let He = externalOffset;
  let Ge = onOffsetChange;
  let text = leadingPill?.text ?? "";
  let cursor = Cursor.fromText(text + e, columns, text.length + He);
  let wt =
    inlineGhostText && dim && inlineGhostText.insertPosition === He
      ? {
          text: inlineGhostText.text,
          dim,
        }
      : undefined;
  let xt = wt !== undefined && He >= e.length;
  let rt = Q(
    () =>
      virtualTexts === undefined || virtualTexts.length === 0 || e === "" || mask !== ""
        ? undefined
        : buildDisplayTextMapping({
            buffer: text + e,
            texts: offsetDecorations(xt ? rangesBefore(virtualTexts, e.length) : virtualTexts, text.length),
            columns,
            side: isCursorOnCharacter ? "after" : "before",
          }),
    [virtualTexts, e, mask, text, xt, columns, isCursorOnCharacter],
  );
  let nt = false;
  let st;
  let Ke = false;
  function Oe(c) {
    return inputFilter && st ? inputFilter(c, st) : c;
  }
  let { addNotification, removeNotification } = useNotifications();
  let { storageV5 } = useTheme_2();
  let [state] = y(createLeftArrowGestureState);
  let Ue = "left-arrow-again-for-agents";
  let Ve = R({
    key: "Ctrl-C",
    pending: false,
  });
  let handleCtrlC = useDoublePress(
    (show) => {
      Ve.current.pending = show;
      onExitMessage?.(show, Ve.current.key);
    },
    () => onExit?.(),
    () => {
      if (!disableCtrlCClear && e) {
        onChange("");
        Ge(0);
        onHistoryReset?.();
      }
    },
  );
  function yt(key) {
    if (!Ve.current.pending) Ve.current.key = key;
    handleCtrlC();
  }
  let handleEscape = useDoublePress(
    (show) => {
      if (!e) return;
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
      if (e) {
        if (historyOnClear && mask === "" && e.trim() !== "") {
          let c = getPastedContents
            ? pickByHelper(getPastedContents(), (show) => show.type === "text" && show.unavailable === true)
            : undefined;
          let O = getInputMode?.();
          let L = O !== undefined ? prependModeCharacterToInput(e, O) : e;
          let ne = c
            ? {
                display: L,
                pastedContents: c,
              }
            : L;
          if (O !== undefined)
            addHistoryEntry(ne, storageV5, {
              submitMode: O,
            });
          else addHistoryEntry(ne, storageV5);
        }
        onChange("");
        Ge(0);
        onHistoryReset?.();
      }
    },
  );
  function handleCtrlD() {
    if (cursor.text === text && e === "") {
      yt("Ctrl-D");
      return cursor;
    }
    return cursor.del();
  }
  function killToLineEnd() {
    if (text !== "" && cursor.offset === text.length)
      return Cursor.fromText(cursor.text.slice(text.length), columns);
    return cursor.backspace();
  }
  function _e(killed, direction) {
    let L = killed.startsWith(text) ? killed.slice(text.length) : killed;
    killRing.dispatch(
      mask === ""
        ? {
            type: "kill",
            text: L,
            direction,
          }
        : {
            type: "interrupt",
          },
    );
    announceDeletion(L, mask);
    return L;
  }
  function killToLineEnd_2() {
    let { cursor: newCursor, killed } = cursor.deleteToLineEnd(we("endOfLine"));
    _e(killed, "append");
    return newCursor;
  }
  function St() {
    let { cursor: newCursor, killed } = cursor.deleteToLineStart(we("startOfLine"));
    let L = _e(killed, "prepend");
    if (mask === "" && L.length >= 3)
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
  function Qt() {
    let { cursor: cursor_2, killed } = cursor.killWord();
    _e(killed, "append");
    return cursor_2;
  }
  function killToLineStart() {
    let { cursor: cursor_2, killed } = cursor.backwardKillWord();
    _e(killed, "prepend");
    return cursor_2;
  }
  function killWordBefore() {
    let { cursor: cursor_2, killed } = cursor.deleteWORDBefore();
    _e(killed, "prepend");
    return cursor_2;
  }
  function yank() {
    let text_2 = Oe(topOfKillRing(killRing.state));
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
    let text_3 = Oe(text_2);
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
        yt("Ctrl-C");
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
    ["u", St],
    ["w", killWordBefore],
    ["y", yank],
  ]);
  let handleMeta = mapInput([
    ["b", () => cursor.backwardWord()],
    ["f", () => cursor.forwardWord()],
    ["d", Qt],
    ["y", handleYankPop],
  ]);
  function handleEnter({ meta, shift: O }) {
    if (
      multiline &&
      !disableBackslashReturn &&
      cursor.offset > 0 &&
      cursor.text[cursor.offset - 1] === "\\"
    ) {
      markBackslashReturnUsed(storageV5);
      return cursor.backspace().insert(
        Oe(`
`),
      );
    }
    if (meta || O)
      return cursor.insert(
        Oe(`
`),
      );
    if (needsShiftWorkaround())
      return cursor.insert(
        Oe(`
`),
      );
    if (onSubmit) {
      onSubmit(cursor.text.slice(text.length));
      nt = true;
    }
    return cursor;
  }
  function Ye() {
    state.editedEmptyAtMs = Date.now();
  }
  function Et() {
    if (state.armedAtMs === 0) return;
    state.armedAtMs = 0;
    removeNotification(Ue);
  }
  function ze() {
    return rt !== undefined && cursor.text === rt.text.draft ? rt : undefined;
  }
  function we(key) {
    return ze()?.rowMoved(cursor, key) ?? cursor[key]();
  }
  function upOrHistoryUp() {
    if (disableCursorMovementForUpDownKeys) {
      Ye();
      onHistoryUp?.();
      return cursor;
    }
    let c = ze();
    if (
      onHistoryUp &&
      (c
        ? c.rowOf(cursor.offset) <= c.rowOf(text.length)
        : cursor.getPosition().line <= cursor.measuredText.getPositionFromOffset(text.length).line)
    ) {
      Ye();
      onHistoryUp();
      return cursor;
    }
    let O = we("up");
    if (!O.equals(cursor)) return O;
    if (multiline) {
      let cursorUpLogical = cursor.upLogicalLine();
      if (!cursorUpLogical.equals(cursor)) return cursorUpLogical;
    }
    return cursor;
  }
  function downOrHistoryDown() {
    if (disableCursorMovementForUpDownKeys) {
      Ye();
      onHistoryDown?.();
      return cursor;
    }
    let c = ze();
    if (
      onHistoryDown &&
      (c
        ? c.rowOf(cursor.offset) >= c.lastRow()
        : cursor.getPosition().line >= cursor.measuredText.lineCount - 1)
    ) {
      Ye();
      onHistoryDown();
      return cursor;
    }
    let cursorDown = we("down");
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
  function lr(input) {
    return (input.ctrl || input.meta) && input.key === "y";
  }
  function isKillKey(key, input) {
    switch (key.name) {
      case "escape":
        if (disableEscapeDoublePress) return;
        handleEscape();
        return cursor;
      case "left":
        if (key.superKey) return we("startOfLine");
        if (key.ctrl || key.meta || key.fn) return cursor.backwardWord();
        if (onLeftArrowOnEmpty && !key.shift && cursor.text === text) {
          let now = Date.now();
          let decision = decideLeftArrowGesture(state, now, key.soloKeypress);
          let me = state.armedAtMs === 0 ? undefined : now - state.absorbAnchorMs;
          switch (
            (applyLeftArrowGesture(state, decision, now), logLeftArrowGesture(decision, now, state), decision)
          ) {
            case "fire":
              removeNotification(Ue);
              onLeftArrowOnEmpty(me);
              return cursor;
            case "arm":
              addNotification({
                key: Ue,
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
                key: Ue,
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
        if (key.superKey) return we("endOfLine");
        if (key.ctrl || key.meta || key.fn) return cursor.forwardWord();
        return cursor.right();
      case "up":
        if (key.shift || key.ctrl || key.meta) return;
        return upOrHistoryUp();
      case "down":
        if (key.shift || key.ctrl || key.meta) return;
        return downOrHistoryDown();
      case "backspace":
        if (key.superKey) return St();
        if (key.meta || key.ctrl) return killToLineStart();
        return killToLineEnd();
      case "delete":
        if (key.superKey) return killToLineEnd_2();
        if (key.meta) return killToLineEnd_2();
        return cursor.del();
      case "home":
        if (key.ctrl) return;
        return we("startOfLine");
      case "end":
        if (key.ctrl) return;
        return we("endOfLine");
      case "pagedown":
        if (isFullscreen || key.ctrl) return;
        return we("endOfLine");
      case "pageup":
        if (isFullscreen || key.ctrl) return;
        return we("startOfLine");
      case "return":
        if (key.ctrl) return;
        return handleEnter(key);
      case "enter":
        return cursor.insert(
          Oe(`
`),
        );
      case "tab":
        return;
    }
    if (multiline && key.ctrl && !key.shift && !key.meta && key.name === "j")
      return cursor.insert(
        Oe(`
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
      Ke = true;
      return cursor.insert(input).left();
    }
    return cursor.insert(input);
  }
  function cr(event) {
    st = event;
    Ke = false;
    let O = inputFilter ? inputFilter(event.key, event) : event.key;
    if (O === "" && event.key !== "") {
      event.preventDefault();
      return;
    }
    if (!mapKey(event) && !lr(event))
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
      Et();
    let L = isKillKey(event, O);
    if (L === undefined) return;
    event.preventDefault();
    if (!cursor.equals(L)) {
      let ne = L.text.startsWith(text);
      if (ne && L.offset < text.length) L = new Cursor(L.measuredText, text.length);
      let sliced = cursor.text.slice(text.length);
      let Ae = ne ? L.text.slice(text.length) : L.text;
      let qe = L.offset - (ne ? text.length : 0);
      if (sliced !== "" && Ae === "") state.editedEmptyAtMs = Date.now();
      if (sliced !== Ae)
        if (commitEdit !== undefined && !Ke) commitEdit(() => onChange(Ae));
        else onChange(Ae);
      Ge(qe);
      if (editRelay?.isRecording() === true && !Ke)
        editRelay.record({
          before: {
            text: sliced,
            cursor: Math.max(0, cursor.offset - text.length),
          },
          after: {
            text: Ae,
            cursor: qe,
          },
          key: event,
        });
      cursor = L;
      if (!ne) {
        text = "";
        leadingPill?.onDelete();
      }
    }
    if (nt) {
      nt = false;
      if (clearOnSubmit) cursor = Cursor.fromText(text, columns, text.length);
    }
  }
  let Ce = ze();
  let ve = Ce?.cursorOver(cursor) ?? cursor;
  let cursorPos = ve.getPosition();
  return {
    handleKeyDown: cr,
    renderedValue: ve.render(
      cursorChar,
      mask,
      invert,
      wt,
      maxVisibleLines,
      selectionAnchor === undefined || selectionAnchor === null
        ? undefined
        : Ce
          ? draftToDisplayOffset(Ce.text, text.length + selectionAnchor, "after")
          : text.length + selectionAnchor,
      selectionLinewise,
      preserveTrailingWhitespace,
      Ce?.text.spans,
      maskWhole,
    ),
    offset: He,
    setOffset: Ge,
    cursorLine: cursorPos.line - ve.getViewportStartLine(maxVisibleLines),
    cursorColumn: cursorPos.column,
    renderedRowStartOffsets: ve.getRenderedRowStartOffsets(maxVisibleLines),
    shown: Ce && {
      text: Ce.text,
      cursorOffset: ve.offset,
    },
    noteKeystrokeEmptied: () => {
      state.editedEmptyAtMs = Date.now();
    },
    disarmLeftArrowConfirm: Et,
  };
}
export {
  HUMAN_CADENCE_MS,
  LEFT_ARROW_BACK_HINT,
  isNfcStable,
  rangesBefore,
  createDisplayCursor,
  needsShiftWorkaround,
  logWrapFallbackOnce,
  useTextInput,
  createLeftArrowGestureState,
  LEFT_ARROW_ARM_WINDOW_MS,
  decideLeftArrowGesture,
  applyLeftArrowGesture,
  logLeftArrowGesture,
  LEFT_ARROW_DETACH_HINT,
};
