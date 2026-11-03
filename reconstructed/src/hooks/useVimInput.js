/**
 * hooks/useVimInput.ts
 *
 * vim 模式输入：NORMAL/INSERT/VISUAL 状态机、操作符与动作、点重复，叠加在 useTextInput 之上。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/hooks/useVimInput.ts
 * pieces: chunk-530hfzwb.js (7)
 * attribution: placement 5, affinity 1, fingerprint 1
 */
import { init_react_production, Se, P, R, y, ce } from "../../vendor/react/cjs/react.production.js";
import { kp } from "../../vendor/convert-to-spaces/dist/index.js";
import { createInitialVimState, BACKSPACE_KEY, createInitialPersistentState } from "../vim/types.js";
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

//@ chunk-530hfzwb.js:672-676 placement
init_react_production();
//@ chunk-530hfzwb.js:676-680 placement
init_react_production();
//@ chunk-530hfzwb.js:680-745 placement
function useWatchLoop(e) {
  let { watchLoop } = Se(kp);
  P(() => (e ? watchLoop() : undefined), [e, watchLoop]);
}
//@ chunk-530hfzwb.js:30136-30218 affinity
function preferredWantedValue(e, t, wanted) {
  if (e.wanted !== undefined) return e.wanted ?? undefined;
  return t ? undefined : wanted;
}
//@ chunk-530hfzwb.js:30218-41931 fingerprint = useVimInput (0.505)
/**
 * vim 输入：维护 NORMAL/INSERT/VISUAL/VISUAL LINE 状态，解析操作符(d/c/y)+动作、文本对象、计数与点重复；INSERT 下回落到 useTextInput。
 */
function useVimInput(props) {
  let {
    value: t,
    onChange,
    columns,
    disableEscapeDoublePress,
    onModeChange,
    onUndo,
    onOpenHistorySearch,
    onToggleHelp,
    onHistoryUp,
    onHistoryDown,
    inputFilter,
    getInputMode,
    isActive,
  } = props;
  let initialVimStateRef = R(createInitialVimState());
  let [I, F] = y("INSERT");
  let [D, K] = y(null);
  let [it, oe] = y(false);
  useWatchLoop(isActive && I === "INSERT");
  let te = R(null);
  let vimInputHelperRef = R(getVimInputHelper());
  let newTextRef = R(null);
  let newTextRef_2 = R(null);
  let _e = R(null);
  function Qt(a, c) {
    let l = initialVimStateRef.current;
    if (l.mode === "INSERT" && !c.ctrl && !c.meta && isTextInputKey(c, [...c.key].length === 1))
      initialVimStateRef.current = {
        mode: "INSERT",
        insertedText: l.insertedText + a.normalize("NFC"),
      };
  }
  let switchToInsertMode = ce((a, c = "") => {
    let l = initialVimStateRef.current;
    if (l.mode !== "INSERT") return;
    let m = c !== "" && l.insertedText.endsWith(c) ? l.insertedText.slice(0, -c.length) : l.insertedText;
    initialVimStateRef.current = {
      mode: "INSERT",
      insertedText: m + a,
    };
  }, []);
  function at(insertModeEscapeRemaps, c, offsetAfter, recorded) {
    for (let key of insertModeEscapeRemaps.keys())
      if (key.startsWith(c)) {
        te.current = {
          char: c,
          at: Date.now(),
          offsetAfter,
          recorded,
        };
        return;
      }
  }
  let cancelPendingRemap = ce(() => {
    te.current = null;
  }, []);
  let forgetColumn = ce(() => {
    let a = initialVimStateRef.current;
    if (a.mode !== "INSERT")
      initialVimStateRef.current = {
        ...a,
        wanted: undefined,
      };
  }, []);
  let De = ce(
    (a, c) => {
      if (c !== undefined) a.setOffset(c);
      te.current = null;
      newTextRef_2.current = null;
      _e.current = null;
      initialVimStateRef.current = {
        mode: "INSERT",
        insertedText: "",
      };
      F("INSERT");
      K(null);
      onModeChange?.("INSERT");
    },
    [onModeChange],
  );
  let switchToNormalMode = ce(
    (a, c) => {
      let current = initialVimStateRef.current;
      if (current.mode === "INSERT") {
        let m = newTextRef.current;
        let T = m === newTextRef_2.current;
        if (m?.type === "visualOp" && m.op === "change" && T)
          newTextRef.current = {
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
          newTextRef.current = {
            ...m,
            insertedText: current.insertedText,
          };
        else if (current.insertedText || (c?.claimEmptyInsert && !changeEntersInsert(m)))
          newTextRef.current = {
            type: "insert",
            text: current.insertedText,
          };
        let offset = c?.buffer ? c.buffer.offset : a.offset;
        let M = c?.buffer ? c.buffer.text : t.normalize("NFC");
        if (
          offset > 0 &&
          M[offset - 1] !==
            `
`
        ) {
          let S = offset > M.length ? 1 : lastGrapheme(M.slice(0, offset)).length;
          a.setOffset(offset - S);
        } else if (c?.buffer) a.setOffset(offset);
      }
      initialVimStateRef.current = {
        mode: "NORMAL",
        command: {
          type: "idle",
        },
      };
      F("NORMAL");
      K(null);
      onModeChange?.("NORMAL");
    },
    [onModeChange, t],
  );
  let Ke = ce(
    (a, c, wanted) => {
      initialVimStateRef.current = {
        mode: "VISUAL",
        kind: c,
        anchor: a,
        command: {
          type: "idle",
        },
        wanted,
      };
      let m = c === "line" ? "VISUAL LINE" : "VISUAL";
      F(m);
      K(a);
      onModeChange?.(m);
    },
    [onModeChange],
  );
  function createOperatorContext(cursor, c, l = false) {
    let m;
    return {
      cursor,
      text: cursor.text,
      setText: (newText, v) => {
        m = newText;
        onChange(newText, v);
      },
      setOffset: (offset) => c.setOffset(offset),
      enterInsert: (T) => {
        De(c, T);
        _e.current = m ?? cursor.text;
      },
      getRegister: () => vimInputHelperRef.current.register,
      getRegisterIsLinewise: () => vimInputHelperRef.current.registerIsLinewise,
      setRegister: (content, linewise) => {
        vimInputHelperRef.current.register = content;
        vimInputHelperRef.current.registerIsLinewise = linewise;
      },
      getLastFind: () => vimInputHelperRef.current.lastFind,
      setLastFind: (type, char) => {
        vimInputHelperRef.current.lastFind = {
          type,
          char,
        };
      },
      recordChange: l
        ? () => {}
        : (newText) => {
            newTextRef.current = newText;
            if (changeEntersInsert(newText) && initialVimStateRef.current.mode === "INSERT")
              newTextRef_2.current = newText;
          },
    };
  }
  function ut(a, c, l) {
    let text = a.text;
    return {
      ...a,
      setText: (T, v) => {
        let previous = {
          value: text,
          cursorOffset: a.cursor.offset,
        };
        text = T;
        a.setText(
          T,
          v ?? {
            previous,
          },
        );
      },
      enterInsert: (offset) => {
        let v = text.slice(0, offset) + c + text.slice(offset);
        let M = {
          value: text,
          cursorOffset: offset,
        };
        let S = xe(v, l, M) ? c.slice(1) : c;
        a.setText(v, {
          previous: M,
        });
        let sliced = text.slice(0, offset);
        let normalized = (sliced + S).normalize("NFC");
        let A = normalized.startsWith(sliced) ? lastGrapheme(normalized.slice(sliced.length)) : "";
        let L = A && !/^[\p{Mn}\p{Me}]/u.test(A) ? A : lastGrapheme(normalized);
        let E = normalized.endsWith(`
`)
          ? normalized.length
          : normalized.length - L.length;
        let W =
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
  function xe(nextValue, linewise, l) {
    return (
      getInputMode !== undefined &&
      isModeCharTyped({
        nextValue,
        value: l?.value ?? t,
        cursorOffset: l?.cursorOffset ?? linewise.offset,
        mode: getInputMode(),
      })
    );
  }
  function lt(a, c, ctx, m) {
    if (a.type === "insertCommand") {
      if (a.insertedText === undefined) return;
      let insertOffset = getInsertOffset(a.key, c);
      c = new Cursor(c.measuredText, insertOffset);
      a = {
        type: "insert",
        text: a.insertedText,
      };
    }
    if ("insertedText" in a && a.insertedText !== undefined) ctx = ut(ctx, a.insertedText, m);
    switch (a.type) {
      case "insert":
        if (a.text) {
          let T = c.insert(a.text);
          let v = xe(T.text, m);
          ctx.setText(T.text);
          let M = v ? T.text.slice(1) : T.text;
          let S = T.offset - (v ? 1 : 0);
          ctx.setOffset(
            M[S - 1] ===
              `
`
              ? S
              : S - lastGrapheme(M.slice(0, S)).length,
          );
        }
        break;
      case "x":
        executeX(a.count, ctx);
        break;
      case "substitute":
        executeSubstitute(a.count, ctx);
        break;
      case "replace":
        executeReplace(a.char, a.count, ctx);
        break;
      case "toggleCase":
        executeToggleCase(a.count, ctx);
        break;
      case "indent":
        executeIndent(a.dir, a.count, ctx);
        break;
      case "join":
        executeJoinIfNotLastLine(a.count, ctx);
        break;
      case "openLine":
        executeOpenLine(a.direction, ctx);
        break;
      case "operator":
        if (a.motion === a.op[0]) executeLineOp(a.op, a.count, ctx);
        else if (a.motion === "gg") executeOperatorGg(a.op, a.count, ctx);
        else if (a.motion === "G") executeOperatorG(a.op, a.count, ctx);
        else executeOperatorMotion(a.op, a.motion, a.count, ctx);
        break;
      case "operatorFind":
        executeOperatorFind(a.op, a.find, a.char, a.count, ctx);
        break;
      case "operatorTextObj":
        executeOperatorTextObj(a.op, a.scope, a.objType, a.count, ctx);
        break;
      case "visualOp":
        repeatVisualOperator(a.op, a.span, a.linewise, ctx);
        break;
      case "visualReplace":
        repeatVisualReplace(a.char, a.span, a.linewise, ctx);
        break;
      case "visualCase":
        repeatVisualCase(a.caseOp, a.span, a.linewise, ctx);
        break;
      case "visualPaste":
        repeatVisualPaste(
          a.content,
          a.registerLinewise,
          a.selectionEndsLine,
          a.selectionOnOneLine,
          a.span,
          a.linewise,
          ctx,
        );
        break;
      case "visualIndent":
        repeatVisualIndent(a.dir, a.count, a.lines, ctx);
        break;
      case "visualChange":
        repeatVisualChange(a.span, a.linewise, ut(ctx, a.text, m));
        break;
      case "paste":
        executePaste(a.after, a.count, ctx);
        break;
    }
  }
  function ft(offset) {
    let c = newTextRef.current;
    if (c && offset !== undefined && "count" in c && isCursorMovingChange(c))
      return {
        ...c,
        count: offset,
      };
    return c;
  }
  function ct(key, wantedColumn, offset) {
    let m = ft(offset);
    if (!m) return;
    let T = Cursor.fromText(t, columns, key.offset);
    lt(
      m,
      T,
      {
        ...createOperatorContext(T, key, true),
        wantedColumn,
      },
      key,
    );
  }
  function nn(content, linewise) {
    let normalized = t.normalize("NFC");
    let offset = linewise.offset;
    let setText = (type, char) => {
      let previous = char?.previous;
      if (!xe(type, linewise, previous)) normalized = type;
      else if (type.length !== (previous?.value ?? t).length + 1) normalized = type.slice(1);
      onChange(type, char);
    };
    let v = (wantedColumn, offset_2) => {
      let w = ft(offset_2);
      if (!w) return;
      let A = Cursor.fromText(normalized, columns, offset);
      lt(
        w,
        A,
        {
          ...createOperatorContext(A, linewise, true),
          text: normalized,
          setText,
          setOffset: (change) => {
            offset = change;
            linewise.setOffset(change);
          },
          enterInsert: (L) => {
            offset = L;
            De(linewise, L);
          },
          wantedColumn,
        },
        linewise,
      );
    };
    let M = [...content];
    for (let idx = 0; idx < M.length; idx++) {
      if (initialVimStateRef.current.mode === "INSERT") {
        let joined = M.slice(idx).join("");
        let insertModeEscapeRemaps = getInsertModeEscapeRemaps();
        if (insertModeEscapeRemaps.size > 0 && insertModeEscapeRemaps.has(joined.normalize("NFC"))) {
          logFeatureOk("vim_insert_remap");
          switchToNormalMode(linewise, {
            buffer: {
              text: normalized,
              offset,
            },
            claimEmptyInsert: true,
          });
          return;
        }
        let N = Cursor.fromText(normalized, columns, offset).insert(joined);
        let q = xe(N.text, linewise);
        let offsetAfter = N.offset - (q ? 1 : 0);
        onChange(N.text);
        linewise.setOffset(offsetAfter);
        initialVimStateRef.current = {
          mode: "INSERT",
          insertedText: initialVimStateRef.current.insertedText + joined,
        };
        let an = q ? joined.slice(1) : joined;
        let Ue = lastGrapheme(N.text.slice(0, N.offset));
        if (Ue && an.endsWith(Ue)) at(insertModeEscapeRemaps, Ue, offsetAfter, true);
        return;
      }
      let V = initialVimStateRef.current;
      if (V.mode !== "NORMAL") return;
      let w = M[idx];
      if ((w === "v" || w === "V") && (V.command.type === "idle" || V.command.type === "count")) {
        Ke(offset, w === "V" ? "line" : "char", V.wanted);
        return;
      }
      let cursor = Cursor.fromText(normalized, columns, offset);
      let L = false;
      let E = {
        ...createOperatorContext(cursor, linewise, false),
        text: normalized,
        setText,
        setOffset: (C) => {
          offset = C;
          linewise.setOffset(C);
        },
        enterInsert: (C) => {
          offset = C;
          De(linewise, C);
        },
        onDotRepeat: (C) => {
          L ||= newTextRef.current !== null;
          v(V.wanted, C);
        },
        wantedColumn: V.wanted,
      };
      let ctx = wrapCtxWithHook(E, () => {
        L = true;
      });
      let k = transition(V.command, w, ctx);
      if (k.execute) k.execute();
      if (initialVimStateRef.current.mode === "NORMAL" && (k.next || k.execute || k.wanted !== undefined))
        initialVimStateRef.current = {
          mode: "NORMAL",
          command: k.next ?? {
            type: "idle",
          },
          wanted: preferredWantedValue(k, L, V.wanted),
        };
    }
  }
  function rn(rawInput, key) {
    handleVimInput(rawInput, key);
    let l = initialVimStateRef.current;
    oe(l.mode !== "INSERT" && l.command.type !== "idle");
  }
  function handleVimInput(rawInput, key) {
    let state = initialVimStateRef.current;
    if (
      state.mode === "INSERT" &&
      rawInput.readLate &&
      META_CHAR_SEQUENCE.test(rawInput.sequence) &&
      rawInput.readAsEscapeThenKey()
    ) {
      rawInput.preventDefault();
      return;
    }
    let m = Cursor.fromText(t, columns, key.offset);
    let T = () => inputFilter?.(rawInput.key, rawInput);
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
    te.current = null;
    if (rawInput.ctrl || rawInput.meta) {
      if (state.mode === "VISUAL") {
        T();
        switchToNormalMode(key);
        rawInput.preventDefault();
        return;
      }
      key.handleKeyDown(rawInput);
      return;
    }
    if (rawInput.name === "escape") {
      T();
      if (state.mode === "NORMAL")
        initialVimStateRef.current = {
          mode: "NORMAL",
          command: {
            type: "idle",
          },
          wanted: state.wanted,
        };
      else if (state.mode === "VISUAL" && state.command.type !== "idle")
        initialVimStateRef.current = {
          ...state,
          command: {
            type: "idle",
          },
        };
      else {
        if (state.mode === "VISUAL") clampCursorInPlace(m, key);
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
          initialVimStateRef.current = {
            mode: "INSERT",
            insertedText: state.insertedText.slice(0, -(lastGrapheme(state.insertedText).length || 1)),
          };
      }
      let insertModeEscapeRemaps = getInsertModeEscapeRemaps();
      if (insertModeEscapeRemaps.size > 0) {
        let normalized = rawInput.key.normalize("NFC");
        let W = [...normalized].length;
        let k = W === 1;
        let C = isTextInputKey(rawInput, k);
        if (
          C &&
          W <= 2 &&
          v &&
          insertModeEscapeRemaps.has(v.char + firstGrapheme(normalized)) &&
          Date.now() - v.at <= VIM_ESCAPE_REMAP_TIMEOUT_MS &&
          key.offset === v.offsetAfter &&
          m.text.startsWith(v.char, m.offset - v.char.length)
        ) {
          T();
          if (v.recorded && state.insertedText.endsWith(v.char))
            initialVimStateRef.current = {
              mode: "INSERT",
              insertedText: state.insertedText.slice(0, -v.char.length),
            };
          let q = m.offset - v.char.length;
          let J = m.text.slice(0, q) + m.text.slice(m.offset);
          onChange(J);
          logFeatureOk("vim_insert_remap");
          switchToNormalMode(key, {
            buffer: {
              text: J,
              offset: q,
            },
            claimEmptyInsert: true,
          });
          rawInput.preventDefault();
          return;
        }
        if (C && !k && insertModeEscapeRemaps.has(normalized)) {
          T();
          logFeatureOk("vim_insert_remap");
          switchToNormalMode(key, {
            claimEmptyInsert: true,
          });
          rawInput.preventDefault();
          return;
        }
        let N = C ? lastGrapheme(normalized) : "";
        if (N)
          at(
            insertModeEscapeRemaps,
            N,
            key.offset + normalized.length,
            isTextInputKey(rawInput, [...rawInput.key].length === 1),
          );
      }
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.mode === "VISUAL") {
      let L = false;
      let ctx = wrapCtxWithHook(
        {
          ...createOperatorContext(m, key, false),
          onUndo,
          onDotRepeat: () => ct(key, state.wanted),
          wantedColumn: state.wanted,
        },
        () => {
          L = true;
        },
      );
      let W = state.command.type === "idle" || state.command.type === "count";
      let key_2 = rawInput.key;
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
      let C = visualTransition(state.command, key_2, ctx);
      let G = state.kind === "line";
      if ("next" in C) {
        C.move?.();
        initialVimStateRef.current = {
          mode: "VISUAL",
          kind: state.kind,
          anchor: state.anchor,
          command: C.next,
          wanted: preferredWantedValue(C, L, state.wanted),
        };
      } else
        switch (C.exit) {
          case "operator":
            executeVisualOperator(C.op, state.anchor, ctx, G || C.forceLinewise === true);
            if (initialVimStateRef.current.mode === "VISUAL") switchToNormalMode(key);
            break;
          case "replace":
            executeVisualReplace(C.char, state.anchor, ctx, G);
            switchToNormalMode(key);
            break;
          case "case":
            executeVisualCase(C.op, state.anchor, ctx, G);
            switchToNormalMode(key);
            break;
          case "paste":
            if (ctx.getRegister()) {
              executeVisualPaste(state.anchor, ctx, G);
              switchToNormalMode(key);
            } else
              initialVimStateRef.current = {
                ...state,
                command: {
                  type: "idle",
                },
              };
            break;
          case "join":
            executeVisualJoin(state.anchor, ctx, G);
            switchToNormalMode(key);
            break;
          case "indent":
            executeVisualIndent(C.dir, C.count, state.anchor, ctx);
            switchToNormalMode(key);
            break;
          case "swap": {
            let offset = m.offset;
            key.setOffset(state.anchor);
            initialVimStateRef.current = {
              mode: "VISUAL",
              kind: state.kind,
              anchor: offset,
              command: {
                type: "idle",
              },
            };
            K(offset);
            break;
          }
          case "selectRange": {
            let N = C.end > C.start ? m.measuredText.prevOffset(C.end) : C.start;
            key.setOffset(N);
            initialVimStateRef.current = {
              mode: "VISUAL",
              kind: state.kind,
              anchor: C.start,
              command: {
                type: "idle",
              },
            };
            K(C.start);
            break;
          }
          default: {
            let N = C.key === "V" ? "line" : "char";
            if (N === state.kind) {
              let offset = clampCursorInPlace(m, key);
              switchToNormalMode(key);
              let { wanted } = state;
              if (wanted?.offset === m.offset && wanted.text === m.text)
                initialVimStateRef.current = {
                  mode: "NORMAL",
                  command: {
                    type: "idle",
                  },
                  wanted: {
                    ...wanted,
                    offset,
                  },
                };
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
      (rawInput.name === "up" || rawInput.name === "down" || (rawInput.name === "left" && m.text === ""))
    ) {
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.command.type === "idle" && rawInput.key === "?" && onToggleHelp) {
      onToggleHelp();
      rawInput.preventDefault();
      return;
    }
    T();
    if (state.command.type === "idle" && rawInput.key === "/" && onOpenHistorySearch) {
      onOpenHistorySearch();
      rawInput.preventDefault();
      return;
    }
    if (state.command.type === "idle") {
      if (rawInput.key === "k") {
        let index = m.text.indexOf(`
`);
        if (index === -1 || m.offset <= index) {
          onHistoryUp?.();
          rawInput.preventDefault();
          return;
        }
      }
      if (rawInput.key === "j") {
        let index = m.text.lastIndexOf(`
`);
        if (index === -1 || m.offset > index) {
          onHistoryDown?.();
          rawInput.preventDefault();
          return;
        }
      }
    }
    let M = false;
    let ctx = wrapCtxWithHook(
      {
        ...createOperatorContext(m, key, false),
        onUndo,
        onDotRepeat: (L) => {
          M ||= newTextRef.current !== null;
          ct(key, state.wanted, L);
        },
        wantedColumn: state.wanted,
      },
      () => {
        M = true;
      },
    );
    let V =
      state.command.type === "idle" ||
      state.command.type === "count" ||
      state.command.type === "operator" ||
      state.command.type === "operatorCount";
    let key_2 = rawInput.key;
    if (rawInput.name === "left") key_2 = "h";
    else if (rawInput.name === "right") key_2 = "l";
    else if (rawInput.name === "up") key_2 = "k";
    else if (rawInput.name === "down") key_2 = "j";
    else if (V && rawInput.name === "backspace") key_2 = BACKSPACE_KEY;
    else if (V && state.command.type !== "count" && rawInput.name === "delete") key_2 = "x";
    else if (rawInput.key === "" || NON_TEXT_KEY_NAMES.has(rawInput.name)) return;
    else if ([...rawInput.key].length > 1) {
      nn(rawInput.key, key);
      rawInput.preventDefault();
      return;
    }
    if (
      (key_2 === "v" || key_2 === "V") &&
      (state.command.type === "idle" || state.command.type === "count")
    ) {
      Ke(m.offset, key_2 === "V" ? "line" : "char", state.wanted);
      return;
    }
    let result = transition(state.command, key_2, ctx);
    if (result.execute) result.execute();
    if (
      initialVimStateRef.current.mode === "NORMAL" &&
      (result.next || result.execute || result.wanted !== undefined)
    )
      initialVimStateRef.current = {
        mode: "NORMAL",
        command: result.next ?? {
          type: "idle",
        },
        wanted: preferredWantedValue(result, M, state.wanted),
      };
    rawInput.preventDefault();
  }
  let setModeExternal = ce(
    (a, c) => {
      te.current = null;
      newTextRef_2.current = null;
      if (a === "INSERT") {
        initialVimStateRef.current = {
          mode: "INSERT",
          insertedText: "",
        };
        K(null);
      } else if (a === "NORMAL") {
        initialVimStateRef.current = {
          mode: "NORMAL",
          command: {
            type: "idle",
          },
        };
        K(null);
      } else {
        let kind = a === "VISUAL LINE" ? "line" : "char";
        let offset = c.offset;
        initialVimStateRef.current = {
          mode: "VISUAL",
          kind,
          anchor: offset,
          command: {
            type: "idle",
          },
        };
        K(offset);
      }
      F(a);
      oe(false);
      onModeChange?.(a);
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
    cancelPendingRemap,
    forgetColumn,
    isCommandPending: it,
  };
}
//@ chunk-530hfzwb.js:41931-43138 placement
function VimInputHook(props) {
  let { inputFilter } = props;
  let r = R(null);
  let vimInput = useVimInput({
    value: props.value,
    onChange: (o, i) => {
      if (o === "" && props.value !== "") r.current?.();
      props.onChange(o, i);
    },
    columns: props.columns,
    disableEscapeDoublePress: props.disableEscapeDoublePress,
    onModeChange: props.onModeChange,
    onUndo:
      props.onUndo &&
      (() => {
        r.current?.();
        props.onUndo?.();
      }),
    onOpenHistorySearch: props.onOpenHistorySearch,
    onToggleHelp: props.onToggleHelp,
    onHistoryUp:
      props.onHistoryUp &&
      (() => {
        r.current?.();
        props.onHistoryUp?.();
      }),
    onHistoryDown:
      props.onHistoryDown &&
      (() => {
        r.current?.();
        props.onHistoryDown?.();
      }),
    inputFilter,
    getInputMode: props.getInputMode,
    isActive: props.focus !== false,
  });
  let textInput = useTextInput({
    ...props,
    selectionAnchor: vimInput.visualAnchor,
    selectionLinewise: vimInput.mode === "VISUAL LINE",
    isCursorOnCharacter: vimInput.mode !== "INSERT",
    inputFilter: (o, i) => {
      let u = inputFilter ? inputFilter(o, i) : o;
      if (
        o ===
          `
` &&
        (i.name === "return" || i.name === "enter" || (i.ctrl && i.name === "j"))
      ) {
        let f = i.name === "return" && props.multiline === true && props.disableBackslashReturn !== true;
        vimInput.recordInsert(u, f ? "\\" : "");
      } else vimInput.recordInsertedText(u, i);
      return u;
    },
  });
  r.current = textInput.noteKeystrokeEmptied ?? null;
  return {
    ...textInput,
    handleKeyDown: (o) => vimInput.handleKeyDown(o, textInput),
    recordInsert: vimInput.recordInsert,
    mode: vimInput.mode,
    setMode: (o) => vimInput.setMode(o, textInput),
    cancelPendingRemap: vimInput.cancelPendingRemap,
    forgetColumn: vimInput.forgetColumn,
    isCommandPending: vimInput.isCommandPending,
  };
}
//@ chunk-530hfzwb.js:43138-43205 placement
function getVimInputHelper() {
  let vimSharedState = getVimSharedState();
  if (vimSharedState) return vimSharedState;
  let initialPersistentState = createInitialPersistentState();
  setVimSharedState(initialPersistentState);
  return initialPersistentState;
}
export { VimInputHook, useVimInput };
