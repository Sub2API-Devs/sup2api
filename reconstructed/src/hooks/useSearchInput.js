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
import { y, R, Q, ce } from "../../vendor/react/cjs/react.production.js";
import { useStoreSelector } from "./useStoreSelector.js";
import { Cursor } from "../utils/Cursor.js";
import { EDITOR_MODES } from "../utils/configConstants.js";
import { useVimInput } from "./useVimInput.js";

//@ chunk-tzghj6zv.js:5963-6203 affinity
var NON_TEXT_KEYS = new Set([
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
//@ chunk-tzghj6zv.js:6203-6304 fingerprint = isYankKey (1)
function isYankKey(d, key) {
  if (key.ctrl || key.meta) return false;
  if (NON_TEXT_KEYS.has(d)) return false;
  return d.length > 0 && !/^\s/.test(d);
}
//@ chunk-tzghj6zv.js:6304-6372 layout
/**
 * 函数 startsWithPunctuation（首字符是标点）；位于「搜索输入 hook：Emacs 风格编辑键（kill/yank）、退出/取消，供 transcript 搜索、选择器等使用」模块。
 */
function startsWithPunctuation(d) {
  return d.length > 0 && ".,?!:;)]".includes(d.charAt(0));
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
var UNHANDLED_SPECIAL_KEYS = new Set([
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
  let we = columns ?? terminalColumns;
  let [Te, L] = y(initialQuery);
  let [ee, ye] = y(initialQuery.length);
  let setQuery = useStoreSelector(buffer, (_) => _.query);
  let cursorOffset = useStoreSelector(buffer, (_) => _.cursorOffset);
  let ae = setQuery ?? Te;
  let X = cursorOffset ?? ee;
  let F = R(Te);
  let re = R(ee);
  let H = Q(
    () =>
      buffer
        ? {
            get current() {
              return buffer.getSnapshot().query;
            },
            set current(_) {
              buffer.setQueryAndCursor(_, buffer.getSnapshot().cursorOffset);
            },
          }
        : F,
    [buffer],
  );
  let D = Q(
    () =>
      buffer
        ? {
            get current() {
              return buffer.getSnapshot().cursorOffset;
            },
            set current(_) {
              buffer.setQueryAndCursor(buffer.getSnapshot().query, _);
            },
          }
        : re,
    [buffer],
  );
  let setQueryState = ce(
    (_) => {
      if (buffer) {
        buffer.setQueryAndCursor(_, buffer.getSnapshot().cursorOffset);
        return;
      }
      F.current = _;
      L(_);
    },
    [buffer],
  );
  let setCursorOffset = ce(
    (_) => {
      if (buffer) {
        buffer.setQueryAndCursor(buffer.getSnapshot().query, _);
        return;
      }
      re.current = _;
      ye(_);
    },
    [buffer],
  );
  let setQuery_2 = ce(
    (_) => {
      setQueryState(_);
      setCursorOffset(_.length);
    },
    [setQueryState, setCursorOffset],
  );
  let se = ce(
    (_) => {
      if (!isActive || !multiline || _.name !== "return") return false;
      let ge = D.current;
      return (ge > 0 && H.current[ge - 1] === "\\") || _.shift || _.meta;
    },
    [isActive, multiline],
  );
  let handleKeyDown = (e) => {
    if (!isActive) return;
    let ge = H.current;
    let ke = D.current;
    let cursor = Cursor.fromText(ge, we, ke);
    if (!isKillKey(e) && !isYankKey_2(e))
      killRing.dispatch({
        type: "interrupt",
      });
    if (e.ctrl && passthroughCtrlKeys.includes(e.key.toLowerCase())) return;
    if (e.name === "return") {
      e.preventDefault();
      if (se(e)) {
        if (ge[ke - 1] === "\\") {
          setQueryState(
            ge.slice(0, ke - 1) +
              `
` +
              ge.slice(ke),
          );
          return;
        }
        setQueryState(
          ge.slice(0, ke) +
            `
` +
            ge.slice(ke),
        );
        setCursorOffset(ke + 1);
        return;
      }
      onExit();
      return;
    }
    if (multiline && (e.name === "enter" || (e.ctrl && !e.shift && !e.meta && e.name === "j"))) {
      e.preventDefault();
      let U = cursor.insert(`
`);
      setQueryState(U.text);
      setCursorOffset(U.offset);
      return;
    }
    if (e.name === "down") {
      e.preventDefault();
      if (multiline) {
        let U = cursor.down();
        if (!U.equals(cursor)) {
          setCursorOffset(U.offset);
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
        let U = cursor.up();
        if (!U.equals(cursor)) {
          setCursorOffset(U.offset);
          return;
        }
      }
      if (onExitUp) onExitUp();
      return;
    }
    if (e.name === "escape") {
      e.preventDefault();
      if (onCancel) onCancel();
      else if (ge.length > 0) {
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
      if (ge.length === 0) {
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
          if (ge.length === 0) {
            (onCancel ?? onExit)();
            return;
          }
          let newCursor = cursor.del();
          setQueryState(newCursor.text);
          setCursorOffset(newCursor.offset);
          return;
        }
        case "h": {
          if (ge.length === 0) {
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
            let { text, start, length } = popResult;
            killRing.dispatch({
              type: "yankPop",
            });
            let before = ge.slice(0, start);
            let after = ge.slice(start + length);
            let newText = before + text + after;
            let newOffset = start + text.length;
            killRing.dispatch({
              type: "updateYankLength",
              length: text.length,
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
      if (onTabOnEmpty && ge === "") onTabOnEmpty();
      return;
    }
    if (onSpaceOnEmpty && e.key === " " && ge === "") {
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
  let Ce = honorEditorMode && EDITOR_MODES();
  let vimInput = useVimInput({
    value: ae,
    onChange: setQueryState,
    columns: we,
    onHistoryUp: onExitUp,
    onHistoryDown: onExitDown,
    isActive: Ce && isActive,
  });
  let _e = {
    handleKeyDown,
    offset: X,
    setOffset: setCursorOffset,
  };
  return {
    query: ae,
    queryRef: H,
    setQuery: setQuery_2,
    cursorOffset: X,
    cursorOffsetRef: D,
    willInsertNewline: se,
    setCursorOffset,
    handleKeyDown: (_) => {
      if (!Ce) {
        handleKeyDown(_);
        return;
      }
      if (!isActive) return;
      if (_.name === "escape" && vimInput.mode === "NORMAL") {
        vimInput.handleKeyDown(_, _e);
        handleKeyDown(_);
        return;
      }
      vimInput.handleKeyDown(_, _e);
    },
    handlePaste: (event) => {
      if (!isActive || event.text.length === 0) return;
      event.preventDefault();
      vimInput.cancelPendingRemap();
      let ge = multiline
        ? event.text.replace(
            /\r\n|\r/g,
            `
`,
          )
        : (event.text.split(/\r\n|\r|\n/, 2)[0] ?? "");
      if (ge.length === 0) return;
      let q = Cursor.fromText(H.current, we, D.current).insert(ge);
      setQueryState(q.text);
      setCursorOffset(q.offset);
    },
    vimMode: Ce ? vimInput.mode : undefined,
    enterInsertMode: () => {
      if (Ce) vimInput.setMode("INSERT", _e);
    },
  };
}
export { useSearchInput, isYankKey, startsWithPunctuation };
