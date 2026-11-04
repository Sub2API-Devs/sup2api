/**
 * hooks/useSearchInput.ts
 *
 * 搜索输入 hook：Emacs 风格编辑键（kill/yank）、退出/取消，供 transcript 搜索、选择器等使用。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useSearchInput.ts
 * pieces: chunk-tzghj6zv.js (7)
 * attribution: affinity 1, fingerprint 4, layout 2
 */
import { useKillRing, topOfKillRing, nextYankPop } from "../utils/killRing.js";
import { useTerminalSize } from "./useTerminalSize.js";
import { useState, useRef, useMemo, useCallback } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { Cursor } from "../utils/Cursor.js";
import { EDITOR_MODES } from "../utils/configConstants.js";
import { useVimInput } from "./useVimInput.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-tzghj6zv.js:5963-6203 affinity
var NON_TEXT_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:5963", () => {
  NON_TEXT_KEYS = new Set([
    "escape",
    "return",
    "enter",
    "tab",
    "backspace",
    "delete",
    "up",
    "down",
    "left",
    "right",
    "pageup",
    "pagedown",
    "home",
    "end",
    "insert",
    "clear",
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
//@ chunk-tzghj6zv.js:6203-6304 fingerprint = isYankKey (1)
function isYankKey(text, key) {
  if (key.ctrl || key.meta) return false;
  if (NON_TEXT_KEYS.has(text)) return false;
  return text.length > 0 && !/^\s/.test(text);
}
//@ chunk-tzghj6zv.js:6304-6372 layout
/**
 * 函数 startsWithPunctuation（首字符是标点）；位于「搜索输入 hook：Emacs 风格编辑键（kill/yank）、退出/取消，供 transcript 搜索、选择器等使用」模块。
 */
function startsWithPunctuation(text) {
  return text.length > 0 && ".,?!:;)]".includes(text.charAt(0));
}
//@ chunk-tzghj6zv.js:6372-6561 fingerprint = isKillKey (1)
function isKillKey(e) {
  if (e.ctrl && (e.key === "k" || e.key === "u" || e.key === "w")) return true;
  if ((e.meta || e.ctrl) && e.key === "backspace") return true;
  if (e.meta && !e.ctrl && e.key.toLowerCase() === "d") return true;
  return false;
}
//@ chunk-tzghj6zv.js:6561-6612 layout = isYankKey (1)
function isYankKey_2(e) {
  return (e.ctrl || e.meta) && e.key === "y";
}
//@ chunk-tzghj6zv.js:6612-6768 fingerprint = UNHANDLED_SPECIAL_KEYS (0.925)
var UNHANDLED_SPECIAL_KEYS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-tzghj6zv.js:6612", () => {
  UNHANDLED_SPECIAL_KEYS = new Set([
    "pageup",
    "pagedown",
    "insert",
    "wheelup",
    "wheeldown",
    "mouse",
    "clear",
    "enter",
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
//@ chunk-tzghj6zv.js:6768-11964 fingerprint = useSearchInput (0.606)
/**
 * 搜索输入：维护 query/cursorOffset，处理字符输入、退格、Emacs kill/yank、左右移动，return 触发 onExit，escape 触发 onCancel；不处理翻页/滚轮等键。
 */
function useSearchInput({
  isActive,
  onExit,
  onCancel,
  onExitUp,
  onExitDown,
  columns,
  passthroughCtrlKeys = [],
  initialQuery = "",
  buffer,
  backspaceExitsOnEmpty = true,
  multiline = false,
  onSpaceOnEmpty,
  onTabOnEmpty,
  honorEditorMode = false,
}) {
  let killRing = useKillRing();
  let { columns: terminalColumns } = useTerminalSize();
  let width = columns ?? terminalColumns;
  let [localQuery, setLocalQuery] = useState(initialQuery);
  let [localCursorOffset, setLocalCursorOffset] = useState(initialQuery.length);
  let setQuery = useStoreSelector(buffer, (state) => state.query);
  let cursorOffset = useStoreSelector(buffer, (state) => state.cursorOffset);
  let query = setQuery ?? localQuery;
  let cursorOffset_2 = cursorOffset ?? localCursorOffset;
  let queryFallbackRef = useRef(localQuery);
  let cursorFallbackRef = useRef(localCursorOffset);
  let queryRef = useMemo(
    () =>
      buffer
        ? {
            get current() {
              return buffer.getSnapshot().query;
            },
            set current(nextQuery) {
              buffer.setQueryAndCursor(nextQuery, buffer.getSnapshot().cursorOffset);
            },
          }
        : queryFallbackRef,
    [buffer],
  );
  let cursorOffsetRef = useMemo(
    () =>
      buffer
        ? {
            get current() {
              return buffer.getSnapshot().cursorOffset;
            },
            set current(nextOffset) {
              buffer.setQueryAndCursor(buffer.getSnapshot().query, nextOffset);
            },
          }
        : cursorFallbackRef,
    [buffer],
  );
  let setQueryState = useCallback(
    (nextQuery) => {
      if (buffer) {
        buffer.setQueryAndCursor(nextQuery, buffer.getSnapshot().cursorOffset);
        return;
      }
      queryFallbackRef.current = nextQuery;
      setLocalQuery(nextQuery);
    },
    [buffer],
  );
  let setCursorOffset = useCallback(
    (nextOffset) => {
      if (buffer) {
        buffer.setQueryAndCursor(buffer.getSnapshot().query, nextOffset);
        return;
      }
      cursorFallbackRef.current = nextOffset;
      setLocalCursorOffset(nextOffset);
    },
    [buffer],
  );
  let setQuery_2 = useCallback(
    (nextQuery) => {
      setQueryState(nextQuery);
      setCursorOffset(nextQuery.length);
    },
    [setQueryState, setCursorOffset],
  );
  let willInsertNewline = useCallback(
    (key) => {
      if (!isActive || !multiline || key.name !== "return") return false;
      let offset = cursorOffsetRef.current;
      return (offset > 0 && queryRef.current[offset - 1] === "\\") || key.shift || key.meta;
    },
    [isActive, multiline],
  );
  let handleKeyDown = (e) => {
    if (!isActive) return;
    let text = queryRef.current;
    let offset = cursorOffsetRef.current;
    let cursor = Cursor.fromText(text, width, offset);
    if (!isKillKey(e) && !isYankKey_2(e))
      killRing.dispatch({
        type: "interrupt",
      });
    if (e.ctrl && passthroughCtrlKeys.includes(e.key.toLowerCase())) return;
    if (e.name === "return") {
      e.preventDefault();
      if (willInsertNewline(e)) {
        if (text[offset - 1] === "\\") {
          setQueryState(
            text.slice(0, offset - 1) +
              `
` +
              text.slice(offset),
          );
          return;
        }
        setQueryState(
          text.slice(0, offset) +
            `
` +
            text.slice(offset),
        );
        setCursorOffset(offset + 1);
        return;
      }
      onExit();
      return;
    }
    if (multiline && (e.name === "enter" || (e.ctrl && !e.shift && !e.meta && e.name === "j"))) {
      e.preventDefault();
      let nextCursor = cursor.insert(`
`);
      setQueryState(nextCursor.text);
      setCursorOffset(nextCursor.offset);
      return;
    }
    if (e.name === "down") {
      e.preventDefault();
      if (multiline) {
        let nextCursor = cursor.down();
        if (!nextCursor.equals(cursor)) {
          setCursorOffset(nextCursor.offset);
          return;
        }
      }
      if (onExitDown) onExitDown();
      else if (!multiline) onExit();
      return;
    }
    if (e.name === "up") {
      e.preventDefault();
      if (multiline) {
        let nextCursor = cursor.up();
        if (!nextCursor.equals(cursor)) {
          setCursorOffset(nextCursor.offset);
          return;
        }
      }
      if (onExitUp) onExitUp();
      return;
    }
    if (e.name === "escape") {
      e.preventDefault();
      if (onCancel) onCancel();
      else if (text.length > 0) {
        setQueryState("");
        setCursorOffset(0);
      } else onExit();
      return;
    }
    if (e.name === "backspace") {
      e.preventDefault();
      if (e.meta || e.ctrl) {
        let { cursor: newCursor, killed } = cursor.backwardKillWord();
        killRing.dispatch({
          type: "kill",
          text: killed,
          direction: "prepend",
        });
        setQueryState(newCursor.text);
        setCursorOffset(newCursor.offset);
        return;
      }
      if (text.length === 0) {
        if (backspaceExitsOnEmpty) (onCancel ?? onExit)();
        return;
      }
      let newCursor = cursor.backspace();
      setQueryState(newCursor.text);
      setCursorOffset(newCursor.offset);
      return;
    }
    if (e.name === "delete") {
      e.preventDefault();
      let newCursor = cursor.del();
      setQueryState(newCursor.text);
      setCursorOffset(newCursor.offset);
      return;
    }
    if (e.name === "left" && (e.ctrl || e.meta || e.fn)) {
      e.preventDefault();
      setCursorOffset(cursor.backwardWord().offset);
      return;
    }
    if (e.name === "right" && (e.ctrl || e.meta || e.fn)) {
      e.preventDefault();
      setCursorOffset(cursor.forwardWord().offset);
      return;
    }
    if (e.name === "left") {
      e.preventDefault();
      let newCursor = cursor.left();
      setCursorOffset(newCursor.offset);
      return;
    }
    if (e.name === "right") {
      e.preventDefault();
      let newCursor = cursor.right();
      setCursorOffset(newCursor.offset);
      return;
    }
    if (e.name === "home") {
      e.preventDefault();
      setCursorOffset(cursor.startOfLine().offset);
      return;
    }
    if (e.name === "end") {
      e.preventDefault();
      setCursorOffset(cursor.endOfLine().offset);
      return;
    }
    if (e.ctrl) {
      switch ((e.preventDefault(), e.key.toLowerCase())) {
        case "a":
          setCursorOffset(cursor.startOfLogicalLine().offset);
          return;
        case "e":
          setCursorOffset(cursor.endOfLogicalLine().offset);
          return;
        case "b":
          setCursorOffset(cursor.left().offset);
          return;
        case "f":
          setCursorOffset(cursor.right().offset);
          return;
        case "d": {
          if (text.length === 0) {
            (onCancel ?? onExit)();
            return;
          }
          let newCursor = cursor.del();
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "h": {
          if (text.length === 0) {
            if (backspaceExitsOnEmpty) (onCancel ?? onExit)();
            return;
          }
          let newCursor = cursor.backspace();
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "k": {
          let { cursor: newCursor, killed } = cursor.deleteToLineEnd();
          killRing.dispatch({
            type: "kill",
            text: killed,
            direction: "append",
          });
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "u": {
          let { cursor: newCursor, killed } = cursor.deleteToLineStart();
          killRing.dispatch({
            type: "kill",
            text: killed,
            direction: "prepend",
          });
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "w": {
          let { cursor: newCursor, killed } = cursor.deleteWORDBefore();
          killRing.dispatch({
            type: "kill",
            text: killed,
            direction: "prepend",
          });
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "y": {
          let text = topOfKillRing(killRing.state);
          if (text.length > 0) {
            let startOffset = cursor.offset;
            let newCursor = cursor.insert(text);
            killRing.dispatch({
              type: "yank",
              start: startOffset,
              length: text.length,
            });
            setQueryState(newCursor.text);
            setCursorOffset(newCursor.offset);
          }
          return;
        }
        case "g":
        case "c":
          if (onCancel) {
            onCancel();
            return;
          }
      }
      return;
    }
    if (e.meta) {
      switch ((e.preventDefault(), e.key.toLowerCase())) {
        case "b":
          setCursorOffset(cursor.backwardWord().offset);
          return;
        case "f":
          setCursorOffset(cursor.forwardWord().offset);
          return;
        case "d": {
          let { cursor: newCursor, killed } = cursor.killWord();
          killRing.dispatch({
            type: "kill",
            text: killed,
            direction: "append",
          });
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "y": {
          let popResult = nextYankPop(killRing.state);
          if (popResult) {
            let { text: text_2, start, length } = popResult;
            killRing.dispatch({
              type: "yankPop",
            });
            let before = text.slice(0, start);
            let after = text.slice(start + length);
            let newText = before + text_2 + after;
            let newOffset = start + text_2.length;
            killRing.dispatch({
              type: "updateYankLength",
              length: text_2.length,
            });
            setQueryState(newText);
            setCursorOffset(newOffset);
          }
          return;
        }
      }
      return;
    }
    if (e.name === "tab") {
      e.preventDefault();
      if (onTabOnEmpty && text === "") onTabOnEmpty();
      return;
    }
    if (onSpaceOnEmpty && e.key === " " && text === "") {
      e.preventDefault();
      onSpaceOnEmpty();
      return;
    }
    if (e.key.length >= 1 && !UNHANDLED_SPECIAL_KEYS.has(e.name)) {
      e.preventDefault();
      let newCursor = cursor.insert(e.key);
      setQueryState(newCursor.text);
      setCursorOffset(newCursor.offset);
    }
  };
  let vimEnabled = honorEditorMode && EDITOR_MODES();
  let vimInput = useVimInput({
    value: query,
    onChange: setQueryState,
    columns: width,
    onHistoryUp: onExitUp,
    onHistoryDown: onExitDown,
    isActive: vimEnabled && isActive,
  });
  let vimCallbacks = {
    handleKeyDown,
    offset: cursorOffset_2,
    setOffset: setCursorOffset,
  };
  return {
    query,
    queryRef,
    setQuery: setQuery_2,
    cursorOffset: cursorOffset_2,
    cursorOffsetRef,
    willInsertNewline,
    setCursorOffset,
    handleKeyDown: (key) => {
      if (!vimEnabled) {
        handleKeyDown(key);
        return;
      }
      if (!isActive) return;
      if (key.name === "escape" && vimInput.mode === "NORMAL") {
        vimInput.handleKeyDown(key, vimCallbacks);
        handleKeyDown(key);
        return;
      }
      vimInput.handleKeyDown(key, vimCallbacks);
    },
    handlePaste: (event) => {
      if (!isActive || event.text.length === 0) return;
      event.preventDefault();
      vimInput.cancelPendingRemap();
      let pasteText = multiline
        ? event.text.replace(
            /\r\n|\r/g,
            `
`,
          )
        : (event.text.split(/\r\n|\r|\n/, 2)[0] ?? "");
      if (pasteText.length === 0) return;
      let nextCursor = Cursor.fromText(queryRef.current, width, cursorOffsetRef.current).insert(pasteText);
      setQueryState(nextCursor.text);
      setCursorOffset(nextCursor.offset);
    },
    vimMode: vimEnabled ? vimInput.mode : undefined,
    enterInsertMode: () => {
      if (vimEnabled) vimInput.setMode("INSERT", vimCallbacks);
    },
  };
}
export { useSearchInput, isYankKey, startsWithPunctuation };
