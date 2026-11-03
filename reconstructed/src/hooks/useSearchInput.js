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
import { useKillRing, egt, nextYankPop } from "../utils/killRing.js";
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
function isYankKey(d, h) {
  if (h.ctrl || h.meta) return !1;
  if (NON_TEXT_KEYS.has(d)) return !1;
  return d.length > 0 && !/^\s/.test(d);
}
//@ chunk-tzghj6zv.js:6304-6372 layout
function ego(d) {
  return d.length > 0 && ".,?!:;)]".includes(d.charAt(0));
}
//@ chunk-tzghj6zv.js:6372-6561 fingerprint = isKillKey (1)
function isKillKey(e) {
  if (e.ctrl && (e.key === "k" || e.key === "u" || e.key === "w")) return !0;
  if ((e.meta || e.ctrl) && e.key === "backspace") return !0;
  if (e.meta && !e.ctrl && e.key.toLowerCase() === "d") return !0;
  return !1;
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
/**
 * 搜索输入：维护 query/cursorOffset，处理字符输入、退格、Emacs kill/yank、左右移动，return 触发 onExit，escape 触发 onCancel；不处理翻页/滚轮等键。
 */
//@ chunk-tzghj6zv.js:6768-11964 fingerprint = useSearchInput (0.606)
function useSearchInput({
  isActive: isActive,
  onExit: onExit,
  onCancel: onCancel,
  onExitUp: onExitUp,
  onExitDown: onExitDown,
  columns: columns,
  passthroughCtrlKeys: passthroughCtrlKeys = [],
  initialQuery: initialQuery = "",
  buffer: buffer,
  backspaceExitsOnEmpty: backspaceExitsOnEmpty = !0,
  multiline: multiline = !1,
  onSpaceOnEmpty: onSpaceOnEmpty,
  onTabOnEmpty: onTabOnEmpty,
  honorEditorMode: honorEditorMode = !1,
}) {
  let ne = useKillRing(),
    { columns: terminalColumns } = useTerminalSize(),
    we = columns ?? terminalColumns,
    [Te, L] = y(initialQuery),
    [ee, ye] = y(initialQuery.length),
    setQuery = useStoreSelector(buffer, (_) => _.query),
    cursorOffset = useStoreSelector(buffer, (_) => _.cursorOffset),
    ae = setQuery ?? Te,
    X = cursorOffset ?? ee,
    F = R(Te),
    re = R(ee),
    H = Q(
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
    ),
    D = Q(
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
    ),
    J = ce(
      (_) => {
        if (buffer) {
          buffer.setQueryAndCursor(_, buffer.getSnapshot().cursorOffset);
          return;
        }
        ((F.current = _), L(_));
      },
      [buffer],
    ),
    K = ce(
      (_) => {
        if (buffer) {
          buffer.setQueryAndCursor(buffer.getSnapshot().query, _);
          return;
        }
        ((re.current = _), ye(_));
      },
      [buffer],
    ),
    me = ce(
      (_) => {
        (J(_), K(_.length));
      },
      [J, K],
    ),
    se = ce(
      (_) => {
        if (!isActive || !multiline || _.name !== "return") return !1;
        let ge = D.current;
        return (ge > 0 && H.current[ge - 1] === "\\") || _.shift || _.meta;
      },
      [isActive, multiline],
    ),
    handleKeyDown = (_) => {
      if (!isActive) return;
      let ge = H.current,
        ke = D.current,
        cursor = Cursor.fromText(ge, we, ke);
      if (!isKillKey(_) && !isYankKey_2(_)) ne.dispatch({ type: "interrupt" });
      if (_.ctrl && passthroughCtrlKeys.includes(_.key.toLowerCase())) return;
      if (_.name === "return") {
        if ((_.preventDefault(), se(_))) {
          if (ge[ke - 1] === "\\") {
            J(
              ge.slice(0, ke - 1) +
                `
` +
                ge.slice(ke),
            );
            return;
          }
          (J(
            ge.slice(0, ke) +
              `
` +
              ge.slice(ke),
          ),
            K(ke + 1));
          return;
        }
        onExit();
        return;
      }
      if (multiline && (_.name === "enter" || (_.ctrl && !_.shift && !_.meta && _.name === "j"))) {
        _.preventDefault();
        let insert = cursor.insert(`
`);
        (J(insert.text), K(insert.offset));
        return;
      }
      if (_.name === "down") {
        if ((_.preventDefault(), multiline)) {
          let down = cursor.down();
          if (!down.equals(cursor)) {
            K(down.offset);
            return;
          }
        }
        if (onExitDown) onExitDown();
        else if (!multiline) onExit();
        return;
      }
      if (_.name === "up") {
        if ((_.preventDefault(), multiline)) {
          let up = cursor.up();
          if (!up.equals(cursor)) {
            K(up.offset);
            return;
          }
        }
        if (onExitUp) onExitUp();
        return;
      }
      if (_.name === "escape") {
        if ((_.preventDefault(), onCancel)) onCancel();
        else if (ge.length > 0) (J(""), K(0));
        else onExit();
        return;
      }
      if (_.name === "backspace") {
        if ((_.preventDefault(), _.meta || _.ctrl)) {
          let { cursor: cursor_2, killed: killed } = cursor.backwardKillWord();
          (ne.dispatch({ type: "kill", text: killed, direction: "prepend" }),
            J(cursor_2.text),
            K(cursor_2.offset));
          return;
        }
        if (ge.length === 0) {
          if (backspaceExitsOnEmpty) (onCancel ?? onExit)();
          return;
        }
        let newCursor = cursor.backspace();
        (J(newCursor.text), K(newCursor.offset));
        return;
      }
      if (_.name === "delete") {
        _.preventDefault();
        let newCursor = cursor.del();
        (J(newCursor.text), K(newCursor.offset));
        return;
      }
      if (_.name === "left" && (_.ctrl || _.meta || _.fn)) {
        (_.preventDefault(), K(cursor.backwardWord().offset));
        return;
      }
      if (_.name === "right" && (_.ctrl || _.meta || _.fn)) {
        (_.preventDefault(), K(cursor.forwardWord().offset));
        return;
      }
      if (_.name === "left") {
        _.preventDefault();
        let newCursor = cursor.left();
        K(newCursor.offset);
        return;
      }
      if (_.name === "right") {
        _.preventDefault();
        let newCursor = cursor.right();
        K(newCursor.offset);
        return;
      }
      if (_.name === "home") {
        (_.preventDefault(), K(cursor.startOfLine().offset));
        return;
      }
      if (_.name === "end") {
        (_.preventDefault(), K(cursor.endOfLine().offset));
        return;
      }
      if (_.ctrl) {
        switch ((_.preventDefault(), _.key.toLowerCase())) {
          case "a":
            K(cursor.startOfLogicalLine().offset);
            return;
          case "e":
            K(cursor.endOfLogicalLine().offset);
            return;
          case "b":
            K(cursor.left().offset);
            return;
          case "f":
            K(cursor.right().offset);
            return;
          case "d": {
            if (ge.length === 0) {
              (onCancel ?? onExit)();
              return;
            }
            let newCursor = cursor.del();
            (J(newCursor.text), K(newCursor.offset));
            return;
          }
          case "h": {
            if (ge.length === 0) {
              if (backspaceExitsOnEmpty) (onCancel ?? onExit)();
              return;
            }
            let newCursor = cursor.backspace();
            (J(newCursor.text), K(newCursor.offset));
            return;
          }
          case "k": {
            let { cursor: newCursor, killed: killed } = cursor.deleteToLineEnd();
            (ne.dispatch({ type: "kill", text: killed, direction: "append" }),
              J(newCursor.text),
              K(newCursor.offset));
            return;
          }
          case "u": {
            let { cursor: newCursor, killed: killed } = cursor.deleteToLineStart();
            (ne.dispatch({ type: "kill", text: killed, direction: "prepend" }),
              J(newCursor.text),
              K(newCursor.offset));
            return;
          }
          case "w": {
            let { cursor: cursor_2, killed: killed } = cursor.deleteWORDBefore();
            (ne.dispatch({ type: "kill", text: killed, direction: "prepend" }),
              J(cursor_2.text),
              K(cursor_2.offset));
            return;
          }
          case "y": {
            let U = egt(ne.state);
            if (U.length > 0) {
              let startOffset = cursor.offset,
                newCursor = cursor.insert(U);
              (ne.dispatch({ type: "yank", start: startOffset, length: U.length }),
                J(newCursor.text),
                K(newCursor.offset));
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
      if (_.meta) {
        switch ((_.preventDefault(), _.key.toLowerCase())) {
          case "b":
            K(cursor.backwardWord().offset);
            return;
          case "f":
            K(cursor.forwardWord().offset);
            return;
          case "d": {
            let { cursor: cursor_2, killed: killed } = cursor.killWord();
            (ne.dispatch({ type: "kill", text: killed, direction: "append" }),
              J(cursor_2.text),
              K(cursor_2.offset));
            return;
          }
          case "y": {
            let U = nextYankPop(ne.state);
            if (U) {
              let { text: text, start: start, length: length } = U;
              ne.dispatch({ type: "yankPop" });
              let before = ge.slice(0, start),
                after = ge.slice(start + length),
                Xe = before + text + after,
                Ne = start + text.length;
              (ne.dispatch({ type: "updateYankLength", length: text.length }), J(Xe), K(Ne));
            }
            return;
          }
        }
        return;
      }
      if (_.name === "tab") {
        if ((_.preventDefault(), onTabOnEmpty && ge === "")) onTabOnEmpty();
        return;
      }
      if (onSpaceOnEmpty && _.key === " " && ge === "") {
        (_.preventDefault(), onSpaceOnEmpty());
        return;
      }
      if (_.key.length >= 1 && !UNHANDLED_SPECIAL_KEYS.has(_.name)) {
        _.preventDefault();
        let newCursor = cursor.insert(_.key);
        (J(newCursor.text), K(newCursor.offset));
      }
    },
    Ce = honorEditorMode && EDITOR_MODES(),
    de = useVimInput({
      value: ae,
      onChange: J,
      columns: we,
      onHistoryUp: onExitUp,
      onHistoryDown: onExitDown,
      isActive: Ce && isActive,
    }),
    _e = { handleKeyDown: handleKeyDown, offset: X, setOffset: K };
  return {
    query: ae,
    queryRef: H,
    setQuery: me,
    cursorOffset: X,
    cursorOffsetRef: D,
    willInsertNewline: se,
    setCursorOffset: K,
    handleKeyDown: (_) => {
      if (!Ce) {
        handleKeyDown(_);
        return;
      }
      if (!isActive) return;
      if (_.name === "escape" && de.mode === "NORMAL") {
        (de.handleKeyDown(_, _e), handleKeyDown(_));
        return;
      }
      de.handleKeyDown(_, _e);
    },
    handlePaste: (_) => {
      if (!isActive || _.text.length === 0) return;
      (_.preventDefault(), de.cancelPendingRemap());
      let ge = multiline
        ? _.text.replace(
            /\r\n|\r/g,
            `
`,
          )
        : (_.text.split(/\r\n|\r|\n/, 2)[0] ?? "");
      if (ge.length === 0) return;
      let insert = Cursor.fromText(H.current, we, D.current).insert(ge);
      (J(insert.text), K(insert.offset));
    },
    vimMode: Ce ? de.mode : void 0,
    enterInsertMode: () => {
      if (Ce) de.setMode("INSERT", _e);
    },
  };
}

export { useSearchInput, isYankKey, ego };
