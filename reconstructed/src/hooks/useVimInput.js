/**
 * hooks/useVimInput.ts
 *
 * vim 模式输入：NORMAL/INSERT/VISUAL 状态机、操作符与动作、点重复，叠加在 useTextInput 之上。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVimInput.ts
 * pieces: chunk-530hfzwb.js (4)
 * attribution: affinity 1, fingerprint 1, placement 2
 */
import { R, y, ce } from "../../vendor/react/cjs/react.production.js";
import { createInitialVimState, BACKSPACE_KEY, createInitialPersistentState } from "../vim/types.js";
import { dt } from "./_new/useVimInput.helpers-530h.js";
import {
  isTextInputKey,
  changeEntersInsert,
  getInsertOffset,
  isCursorMovingChange,
  wrapCtxWithHook,
  transition,
  META_CHAR_SEQUENCE,
  clampCursorInPlace,
  NON_TEXT_KEY_NAMES,
  visualTransition,
} from "../vim/transitions.js";
import { lastGrapheme, firstGrapheme } from "../utils/intl.js";
import { isModeCharTyped } from "../components/PromptInput/inputModes.js";
import { Cursor } from "../utils/Cursor.js";
import {
  executeX,
  executeSubstitute,
  executeReplace,
  executeToggleCase,
  executeIndent,
  executeJoinIfNotLastLine,
  executeOpenLine,
  executeLineOp,
  executeOperatorGg,
  executeOperatorG,
  executeOperatorMotion,
  executeOperatorFind,
  executeOperatorTextObj,
  repeatVisualOperator,
  repeatVisualReplace,
  repeatVisualCase,
  repeatVisualPaste,
  repeatVisualIndent,
  repeatVisualChange,
  executePaste,
  getInsertModeEscapeRemaps,
  VIM_ESCAPE_REMAP_TIMEOUT_MS,
  executeVisualOperator,
  executeVisualReplace,
  executeVisualCase,
  executeVisualPaste,
  executeVisualJoin,
  executeVisualIndent,
} from "../vim/operators.js";
import { logFeatureOk } from "../services/analytics/featureTelemetry.js";
import { useTextInput } from "./useTextInput.js";
import { getVimSharedState, setVimSharedState } from "../bootstrap/state.js";

//@ chunk-530hfzwb.js:30136-30218 affinity
function ot(e, t, r) {
  if (e.wanted !== void 0) return e.wanted ?? void 0;
  return t ? void 0 : r;
}
/**
 * vim 输入：维护 NORMAL/INSERT/VISUAL/VISUAL LINE 状态，解析操作符(d/c/y)+动作、文本对象、计数与点重复；INSERT 下回落到 useTextInput。
 */
//@ chunk-530hfzwb.js:30218-41931 fingerprint = useVimInput (0.505)
function useVimInput(props) {
  let {
      value: t,
      onChange: onChange,
      columns: columns,
      disableEscapeDoublePress: disableEscapeDoublePress,
      onModeChange: onModeChange,
      onUndo: onUndo,
      onOpenHistorySearch: onOpenHistorySearch,
      onToggleHelp: onToggleHelp,
      onHistoryUp: onHistoryUp,
      onHistoryDown: onHistoryDown,
      inputFilter: inputFilter,
      getInputMode: getInputMode,
      isActive: isActive,
    } = props,
    O = R(createInitialVimState()),
    [I, F] = y("INSERT"),
    [D, K] = y(null),
    [it, oe] = y(!1);
  dt(isActive && I === "INSERT");
  let te = R(null),
    ne = R(Pn()),
    X = R(null),
    Oe = R(null),
    _e = R(null);
  function Qt(a, c) {
    let l = O.current;
    if (l.mode === "INSERT" && !c.ctrl && !c.meta && isTextInputKey(c, [...c.key].length === 1))
      O.current = { mode: "INSERT", insertedText: l.insertedText + a.normalize("NFC") };
  }
  let switchToInsertMode = ce((a, c = "") => {
    let l = O.current;
    if (l.mode !== "INSERT") return;
    let m = c !== "" && l.insertedText.endsWith(c) ? l.insertedText.slice(0, -c.length) : l.insertedText;
    O.current = { mode: "INSERT", insertedText: m + a };
  }, []);
  function at(a, c, l, m) {
    for (let T of a.keys())
      if (T.startsWith(c)) {
        te.current = { char: c, at: Date.now(), offsetAfter: l, recorded: m };
        return;
      }
  }
  let en = ce(() => {
      te.current = null;
    }, []),
    tn = ce(() => {
      let a = O.current;
      if (a.mode !== "INSERT") O.current = { ...a, wanted: void 0 };
    }, []),
    De = ce(
      (a, c) => {
        if (c !== void 0) a.setOffset(c);
        ((te.current = null),
          (Oe.current = null),
          (_e.current = null),
          (O.current = { mode: "INSERT", insertedText: "" }),
          F("INSERT"),
          K(null),
          onModeChange?.("INSERT"));
      },
      [onModeChange],
    ),
    switchToNormalMode = ce(
      (a, c) => {
        let current = O.current;
        if (current.mode === "INSERT") {
          let m = X.current,
            T = m === Oe.current;
          if (m?.type === "visualOp" && m.op === "change" && T)
            X.current = {
              type: "visualChange",
              span: m.span,
              linewise: m.linewise,
              text: current.insertedText ?? "",
            };
          else if (
            changeEntersInsert(m) &&
            m.type !== "visualOp" &&
            T &&
            (current.insertedText || (c?.buffer ? c.buffer.text : t.normalize("NFC")) === _e.current)
          )
            X.current = { ...m, insertedText: current.insertedText };
          else if (current.insertedText || (c?.claimEmptyInsert && !changeEntersInsert(m)))
            X.current = { type: "insert", text: current.insertedText };
          let v = c?.buffer ? c.buffer.offset : a.offset,
            M = c?.buffer ? c.buffer.text : t.normalize("NFC");
          if (
            v > 0 &&
            M[v - 1] !==
              `
`
          ) {
            let S = v > M.length ? 1 : lastGrapheme(M.slice(0, v)).length;
            a.setOffset(v - S);
          } else if (c?.buffer) a.setOffset(v);
        }
        ((O.current = { mode: "NORMAL", command: { type: "idle" } }),
          F("NORMAL"),
          K(null),
          onModeChange?.("NORMAL"));
      },
      [onModeChange, t],
    ),
    Ke = ce(
      (a, c, l) => {
        O.current = { mode: "VISUAL", kind: c, anchor: a, command: { type: "idle" }, wanted: l };
        let m = c === "line" ? "VISUAL LINE" : "VISUAL";
        (F(m), K(a), onModeChange?.(m));
      },
      [onModeChange],
    );
  function se(a, c, l = !1) {
    let m;
    return {
      cursor: a,
      text: a.text,
      setText: (T, v) => {
        ((m = T), onChange(T, v));
      },
      setOffset: (T) => c.setOffset(T),
      enterInsert: (T) => {
        (De(c, T), (_e.current = m ?? a.text));
      },
      getRegister: () => ne.current.register,
      getRegisterIsLinewise: () => ne.current.registerIsLinewise,
      setRegister: (T, v) => {
        ((ne.current.register = T), (ne.current.registerIsLinewise = v));
      },
      getLastFind: () => ne.current.lastFind,
      setLastFind: (cursor, v) => {
        ne.current.lastFind = { type: cursor, char: v };
      },
      recordChange: l
        ? () => {}
        : (newText) => {
            if (((X.current = newText), changeEntersInsert(newText) && O.current.mode === "INSERT"))
              Oe.current = newText;
          },
    };
  }
  function ut(a, c, l) {
    let text = a.text;
    return {
      ...a,
      setText: (T, v) => {
        let M = { value: text, cursorOffset: a.cursor.offset };
        ((text = T), a.setText(T, v ?? { previous: M }));
      },
      enterInsert: (offset) => {
        let v = text.slice(0, offset) + c + text.slice(offset),
          M = { value: text, cursorOffset: offset },
          S = xe(v, l, M) ? c.slice(1) : c;
        a.setText(v, { previous: M });
        let sliced = text.slice(0, offset),
          normalized = (sliced + S).normalize("NFC"),
          A = normalized.startsWith(sliced) ? lastGrapheme(normalized.slice(sliced.length)) : "",
          L = A && !/^[\p{Mn}\p{Me}]/u.test(A) ? A : lastGrapheme(normalized),
          E = normalized.endsWith(`
`)
            ? normalized.length
            : normalized.length - L.length,
          W =
            offset > 0 &&
            sliced[offset - 1] !==
              `
`
              ? offset - lastGrapheme(sliced).length
              : offset;
        a.setOffset(S ? E : W);
      },
    };
  }
  function xe(a, c, l) {
    return (
      getInputMode !== void 0 &&
      isModeCharTyped({
        nextValue: a,
        value: l?.value ?? t,
        cursorOffset: l?.cursorOffset ?? c.offset,
        mode: getInputMode(),
      })
    );
  }
  function lt(a, c, l, m) {
    if (a.type === "insertCommand") {
      if (a.insertedText === void 0) return;
      let T = getInsertOffset(a.key, c);
      ((c = new Cursor(c.measuredText, T)), (a = { type: "insert", text: a.insertedText }));
    }
    if ("insertedText" in a && a.insertedText !== void 0) l = ut(l, a.insertedText, m);
    switch (a.type) {
      case "insert":
        if (a.text) {
          let insert = c.insert(a.text),
            v = xe(insert.text, m);
          l.setText(insert.text);
          let M = v ? insert.text.slice(1) : insert.text,
            S = insert.offset - (v ? 1 : 0);
          l.setOffset(
            M[S - 1] ===
              `
`
              ? S
              : S - lastGrapheme(M.slice(0, S)).length,
          );
        }
        break;
      case "x":
        executeX(a.count, l);
        break;
      case "substitute":
        executeSubstitute(a.count, l);
        break;
      case "replace":
        executeReplace(a.char, a.count, l);
        break;
      case "toggleCase":
        executeToggleCase(a.count, l);
        break;
      case "indent":
        executeIndent(a.dir, a.count, l);
        break;
      case "join":
        executeJoinIfNotLastLine(a.count, l);
        break;
      case "openLine":
        executeOpenLine(a.direction, l);
        break;
      case "operator":
        if (a.motion === a.op[0]) executeLineOp(a.op, a.count, l);
        else if (a.motion === "gg") executeOperatorGg(a.op, a.count, l);
        else if (a.motion === "G") executeOperatorG(a.op, a.count, l);
        else executeOperatorMotion(a.op, a.motion, a.count, l);
        break;
      case "operatorFind":
        executeOperatorFind(a.op, a.find, a.char, a.count, l);
        break;
      case "operatorTextObj":
        executeOperatorTextObj(a.op, a.scope, a.objType, a.count, l);
        break;
      case "visualOp":
        repeatVisualOperator(a.op, a.span, a.linewise, l);
        break;
      case "visualReplace":
        repeatVisualReplace(a.char, a.span, a.linewise, l);
        break;
      case "visualCase":
        repeatVisualCase(a.caseOp, a.span, a.linewise, l);
        break;
      case "visualPaste":
        repeatVisualPaste(
          a.content,
          a.registerLinewise,
          a.selectionEndsLine,
          a.selectionOnOneLine,
          a.span,
          a.linewise,
          l,
        );
        break;
      case "visualIndent":
        repeatVisualIndent(a.dir, a.count, a.lines, l);
        break;
      case "visualChange":
        repeatVisualChange(a.span, a.linewise, ut(l, a.text, m));
        break;
      case "paste":
        executePaste(a.after, a.count, l);
        break;
    }
  }
  function ft(offset) {
    let c = X.current;
    if (c && offset !== void 0 && "count" in c && isCursorMovingChange(c)) return { ...c, count: offset };
    return c;
  }
  function ct(a, c, l) {
    let m = ft(l);
    if (!m) return;
    let fromText = Cursor.fromText(t, columns, a.offset);
    lt(m, fromText, { ...se(fromText, a, !0), wantedColumn: c }, a);
  }
  function nn(content, linewise) {
    let normalized = t.normalize("NFC"),
      offset = linewise.offset,
      T = (type, char) => {
        let w = char?.previous;
        if (!xe(type, linewise, w)) normalized = type;
        else if (type.length !== (w?.value ?? t).length + 1) normalized = type.slice(1);
        onChange(type, char);
      },
      v = (S, V) => {
        let w = ft(V);
        if (!w) return;
        let fromText = Cursor.fromText(normalized, columns, offset);
        lt(
          w,
          fromText,
          {
            ...se(fromText, linewise, !0),
            text: normalized,
            setText: T,
            setOffset: (change) => {
              ((offset = change), linewise.setOffset(change));
            },
            enterInsert: (L) => {
              ((offset = L), De(linewise, L));
            },
            wantedColumn: S,
          },
          linewise,
        );
      },
      M = [...content];
    for (let S = 0; S < M.length; S++) {
      if (O.current.mode === "INSERT") {
        let joined = M.slice(S).join(""),
          G = getInsertModeEscapeRemaps();
        if (G.size > 0 && G.has(joined.normalize("NFC"))) {
          (logFeatureOk("vim_insert_remap"),
            switchToNormalMode(linewise, {
              buffer: { text: normalized, offset: offset },
              claimEmptyInsert: !0,
            }));
          return;
        }
        let insert = Cursor.fromText(normalized, columns, offset).insert(joined),
          q = xe(insert.text, linewise),
          J = insert.offset - (q ? 1 : 0);
        (onChange(insert.text),
          linewise.setOffset(J),
          (O.current = { mode: "INSERT", insertedText: O.current.insertedText + joined }));
        let an = q ? joined.slice(1) : joined,
          Ue = lastGrapheme(insert.text.slice(0, insert.offset));
        if (Ue && an.endsWith(Ue)) at(G, Ue, J, !0);
        return;
      }
      let V = O.current;
      if (V.mode !== "NORMAL") return;
      let w = M[S];
      if ((w === "v" || w === "V") && (V.command.type === "idle" || V.command.type === "count")) {
        Ke(offset, w === "V" ? "line" : "char", V.wanted);
        return;
      }
      let cursor = Cursor.fromText(normalized, columns, offset),
        L = !1,
        E = {
          ...se(cursor, linewise, !1),
          text: normalized,
          setText: T,
          setOffset: (C) => {
            ((offset = C), linewise.setOffset(C));
          },
          enterInsert: (C) => {
            ((offset = C), De(linewise, C));
          },
          onDotRepeat: (C) => {
            ((L ||= X.current !== null), v(V.wanted, C));
          },
          wantedColumn: V.wanted,
        },
        ctx = wrapCtxWithHook(E, () => {
          L = !0;
        }),
        k = transition(V.command, w, ctx);
      if (k.execute) k.execute();
      if (O.current.mode === "NORMAL" && (k.next || k.execute || k.wanted !== void 0))
        O.current = { mode: "NORMAL", command: k.next ?? { type: "idle" }, wanted: ot(k, L, V.wanted) };
    }
  }
  function rn(a, c) {
    handleVimInput(a, c);
    let l = O.current;
    oe(l.mode !== "INSERT" && l.command.type !== "idle");
  }
  function handleVimInput(rawInput, key) {
    let state = O.current;
    if (
      state.mode === "INSERT" &&
      rawInput.readLate &&
      META_CHAR_SEQUENCE.test(rawInput.sequence) &&
      rawInput.readAsEscapeThenKey()
    ) {
      rawInput.preventDefault();
      return;
    }
    let fromText = Cursor.fromText(t, columns, key.offset),
      T = () => inputFilter?.(rawInput.key, rawInput);
    if (!(
      rawInput.name === "left" &&
      !rawInput.ctrl &&
      !rawInput.meta &&
      !rawInput.fn &&
      !rawInput.superKey &&
      !rawInput.shift
    ))
      key.disarmLeftArrowConfirm?.();
    let v = te.current;
    if (((te.current = null), rawInput.ctrl || rawInput.meta)) {
      if (state.mode === "VISUAL") {
        (T(), switchToNormalMode(key), rawInput.preventDefault());
        return;
      }
      key.handleKeyDown(rawInput);
      return;
    }
    if (rawInput.name === "escape") {
      if ((T(), state.mode === "NORMAL"))
        O.current = { mode: "NORMAL", command: { type: "idle" }, wanted: state.wanted };
      else if (state.mode === "VISUAL" && state.command.type !== "idle")
        O.current = { ...state, command: { type: "idle" } };
      else {
        if (state.mode === "VISUAL") clampCursorInPlace(fromText, key);
        switchToNormalMode(key);
      }
      if (!disableEscapeDoublePress) rawInput.preventDefault();
      return;
    }
    if (rawInput.name === "return" && state.mode !== "VISUAL") {
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.mode === "INSERT") {
      if (rawInput.name === "backspace" || rawInput.name === "delete") {
        if (state.insertedText.length > 0)
          O.current = {
            mode: "INSERT",
            insertedText: state.insertedText.slice(0, -(lastGrapheme(state.insertedText).length || 1)),
          };
      }
      let L = getInsertModeEscapeRemaps();
      if (L.size > 0) {
        let normalized = rawInput.key.normalize("NFC"),
          W = [...normalized].length,
          k = W === 1,
          C = isTextInputKey(rawInput, k);
        if (
          C &&
          W <= 2 &&
          v &&
          L.has(v.char + firstGrapheme(normalized)) &&
          Date.now() - v.at <= VIM_ESCAPE_REMAP_TIMEOUT_MS &&
          key.offset === v.offsetAfter &&
          fromText.text.startsWith(v.char, fromText.offset - v.char.length)
        ) {
          if ((T(), v.recorded && state.insertedText.endsWith(v.char)))
            O.current = { mode: "INSERT", insertedText: state.insertedText.slice(0, -v.char.length) };
          let q = fromText.offset - v.char.length,
            J = fromText.text.slice(0, q) + fromText.text.slice(fromText.offset);
          (onChange(J),
            logFeatureOk("vim_insert_remap"),
            switchToNormalMode(key, { buffer: { text: J, offset: q }, claimEmptyInsert: !0 }),
            rawInput.preventDefault());
          return;
        }
        if (C && !k && L.has(normalized)) {
          (T(),
            logFeatureOk("vim_insert_remap"),
            switchToNormalMode(key, { claimEmptyInsert: !0 }),
            rawInput.preventDefault());
          return;
        }
        let N = C ? lastGrapheme(normalized) : "";
        if (N)
          at(L, N, key.offset + normalized.length, isTextInputKey(rawInput, [...rawInput.key].length === 1));
      }
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.mode === "VISUAL") {
      let L = !1,
        E = wrapCtxWithHook(
          {
            ...se(fromText, key, !1),
            onUndo: onUndo,
            onDotRepeat: () => ct(key, state.wanted),
            wantedColumn: state.wanted,
          },
          () => {
            L = !0;
          },
        ),
        W = state.command.type === "idle" || state.command.type === "count",
        key_2 = rawInput.key;
      if (rawInput.name === "left") key_2 = W ? "h" : "";
      else if (rawInput.name === "right") key_2 = W ? "l" : "";
      else if (rawInput.name === "up") key_2 = W ? "k" : "";
      else if (rawInput.name === "down") key_2 = W ? "j" : "";
      else if (rawInput.name === "return")
        key_2 = W
          ? "j"
          : `
`;
      else if (rawInput.name === "backspace") key_2 = W ? BACKSPACE_KEY : "";
      else if (rawInput.name === "delete") key_2 = W && state.command.type !== "count" ? "x" : "";
      else if (rawInput.key === "" || NON_TEXT_KEY_NAMES.has(rawInput.name)) {
        rawInput.preventDefault();
        return;
      } else if ([...rawInput.key].length > 1) {
        rawInput.preventDefault();
        return;
      }
      T();
      let C = visualTransition(state.command, key_2, E),
        G = state.kind === "line";
      if ("next" in C)
        (C.move?.(),
          (O.current = {
            mode: "VISUAL",
            kind: state.kind,
            anchor: state.anchor,
            command: C.next,
            wanted: ot(C, L, state.wanted),
          }));
      else
        switch (C.exit) {
          case "operator":
            if (
              (executeVisualOperator(C.op, state.anchor, E, G || C.forceLinewise === !0),
              O.current.mode === "VISUAL")
            )
              switchToNormalMode(key);
            break;
          case "replace":
            (executeVisualReplace(C.char, state.anchor, E, G), switchToNormalMode(key));
            break;
          case "case":
            (executeVisualCase(C.op, state.anchor, E, G), switchToNormalMode(key));
            break;
          case "paste":
            if (E.getRegister()) (executeVisualPaste(state.anchor, E, G), switchToNormalMode(key));
            else O.current = { ...state, command: { type: "idle" } };
            break;
          case "join":
            (executeVisualJoin(state.anchor, E, G), switchToNormalMode(key));
            break;
          case "indent":
            (executeVisualIndent(C.dir, C.count, state.anchor, E), switchToNormalMode(key));
            break;
          case "swap": {
            let offset = fromText.offset;
            (key.setOffset(state.anchor),
              (O.current = { mode: "VISUAL", kind: state.kind, anchor: offset, command: { type: "idle" } }),
              K(offset));
            break;
          }
          case "selectRange": {
            let N = C.end > C.start ? fromText.measuredText.prevOffset(C.end) : C.start;
            (key.setOffset(N),
              (O.current = { mode: "VISUAL", kind: state.kind, anchor: C.start, command: { type: "idle" } }),
              K(C.start));
            break;
          }
          default: {
            let N = C.key === "V" ? "line" : "char";
            if (N === state.kind) {
              let q = clampCursorInPlace(fromText, key);
              switchToNormalMode(key);
              let { wanted: wanted } = state;
              if (wanted?.offset === fromText.offset && wanted.text === fromText.text)
                O.current = { mode: "NORMAL", command: { type: "idle" }, wanted: { ...wanted, offset: q } };
            } else Ke(state.anchor, N, state.wanted);
            break;
          }
        }
      rawInput.preventDefault();
      return;
    }
    if (state.mode !== "NORMAL") return;
    if (
      state.command.type === "idle" &&
      !rawInput.shift &&
      (rawInput.name === "up" ||
        rawInput.name === "down" ||
        (rawInput.name === "left" && fromText.text === ""))
    ) {
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.command.type === "idle" && rawInput.key === "?" && onToggleHelp) {
      (onToggleHelp(), rawInput.preventDefault());
      return;
    }
    if ((T(), state.command.type === "idle" && rawInput.key === "/" && onOpenHistorySearch)) {
      (onOpenHistorySearch(), rawInput.preventDefault());
      return;
    }
    if (state.command.type === "idle") {
      if (rawInput.key === "k") {
        let index = fromText.text.indexOf(`
`);
        if (index === -1 || fromText.offset <= index) {
          (onHistoryUp?.(), rawInput.preventDefault());
          return;
        }
      }
      if (rawInput.key === "j") {
        let index = fromText.text.lastIndexOf(`
`);
        if (index === -1 || fromText.offset > index) {
          (onHistoryDown?.(), rawInput.preventDefault());
          return;
        }
      }
    }
    let M = !1,
      S = wrapCtxWithHook(
        {
          ...se(fromText, key, !1),
          onUndo: onUndo,
          onDotRepeat: (L) => {
            ((M ||= X.current !== null), ct(key, state.wanted, L));
          },
          wantedColumn: state.wanted,
        },
        () => {
          M = !0;
        },
      ),
      V =
        state.command.type === "idle" ||
        state.command.type === "count" ||
        state.command.type === "operator" ||
        state.command.type === "operatorCount",
      key_2 = rawInput.key;
    if (rawInput.name === "left") key_2 = "h";
    else if (rawInput.name === "right") key_2 = "l";
    else if (rawInput.name === "up") key_2 = "k";
    else if (rawInput.name === "down") key_2 = "j";
    else if (V && rawInput.name === "backspace") key_2 = BACKSPACE_KEY;
    else if (V && state.command.type !== "count" && rawInput.name === "delete") key_2 = "x";
    else if (rawInput.key === "" || NON_TEXT_KEY_NAMES.has(rawInput.name)) return;
    else if ([...rawInput.key].length > 1) {
      (nn(rawInput.key, key), rawInput.preventDefault());
      return;
    }
    if (
      (key_2 === "v" || key_2 === "V") &&
      (state.command.type === "idle" || state.command.type === "count")
    ) {
      Ke(fromText.offset, key_2 === "V" ? "line" : "char", state.wanted);
      return;
    }
    let result = transition(state.command, key_2, S);
    if (result.execute) result.execute();
    if (O.current.mode === "NORMAL" && (result.next || result.execute || result.wanted !== void 0))
      O.current = {
        mode: "NORMAL",
        command: result.next ?? { type: "idle" },
        wanted: ot(result, M, state.wanted),
      };
    rawInput.preventDefault();
  }
  let setModeExternal = ce(
    (a, c) => {
      if (((te.current = null), (Oe.current = null), a === "INSERT"))
        ((O.current = { mode: "INSERT", insertedText: "" }), K(null));
      else if (a === "NORMAL") ((O.current = { mode: "NORMAL", command: { type: "idle" } }), K(null));
      else {
        let l = a === "VISUAL LINE" ? "line" : "char",
          offset = c.offset;
        ((O.current = { mode: "VISUAL", kind: l, anchor: offset, command: { type: "idle" } }), K(offset));
      }
      (F(a), oe(!1), onModeChange?.(a));
    },
    [onModeChange],
  );
  return {
    handleKeyDown: rn,
    mode: I,
    setMode: setModeExternal,
    visualAnchor: D,
    recordInsertedText: Qt,
    recordInsert: switchToInsertMode,
    cancelPendingRemap: en,
    forgetColumn: tn,
    isCommandPending: it,
  };
}
//@ chunk-530hfzwb.js:41931-43138 placement
function VimInputHook(e) {
  let { inputFilter: inputFilter } = e,
    r = R(null),
    n = useVimInput({
      value: e.value,
      onChange: (o, i) => {
        if (o === "" && e.value !== "") r.current?.();
        e.onChange(o, i);
      },
      columns: e.columns,
      disableEscapeDoublePress: e.disableEscapeDoublePress,
      onModeChange: e.onModeChange,
      onUndo:
        e.onUndo &&
        (() => {
          (r.current?.(), e.onUndo?.());
        }),
      onOpenHistorySearch: e.onOpenHistorySearch,
      onToggleHelp: e.onToggleHelp,
      onHistoryUp:
        e.onHistoryUp &&
        (() => {
          (r.current?.(), e.onHistoryUp?.());
        }),
      onHistoryDown:
        e.onHistoryDown &&
        (() => {
          (r.current?.(), e.onHistoryDown?.());
        }),
      inputFilter: inputFilter,
      getInputMode: e.getInputMode,
      isActive: e.focus !== !1,
    }),
    s = useTextInput({
      ...e,
      selectionAnchor: n.visualAnchor,
      selectionLinewise: n.mode === "VISUAL LINE",
      isCursorOnCharacter: n.mode !== "INSERT",
      inputFilter: (o, i) => {
        let u = inputFilter ? inputFilter(o, i) : o;
        if (
          o ===
            `
` &&
          (i.name === "return" || i.name === "enter" || (i.ctrl && i.name === "j"))
        ) {
          let f = i.name === "return" && e.multiline === !0 && e.disableBackslashReturn !== !0;
          n.recordInsert(u, f ? "\\" : "");
        } else n.recordInsertedText(u, i);
        return u;
      },
    });
  return (
    (r.current = s.noteKeystrokeEmptied ?? null),
    {
      ...s,
      handleKeyDown: (o) => n.handleKeyDown(o, s),
      recordInsert: n.recordInsert,
      mode: n.mode,
      setMode: (o) => n.setMode(o, s),
      cancelPendingRemap: n.cancelPendingRemap,
      forgetColumn: n.forgetColumn,
      isCommandPending: n.isCommandPending,
    }
  );
}
//@ chunk-530hfzwb.js:43138-43205 placement
function Pn() {
  let e = getVimSharedState();
  if (e) return e;
  let t = createInitialPersistentState();
  return (setVimSharedState(t), t);
}

export { VimInputHook, useVimInput };
