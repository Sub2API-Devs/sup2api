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
import {
  init_react_production,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
} from "../../vendor/react/cjs/react.production.js";
import { APP_CONTEXT } from "../../vendor/convert-to-spaces/dist/index.js";
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
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-530hfzwb.js:672-676 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-530hfzwb.js:672", () => {
  init_react_production();
});
//@ chunk-530hfzwb.js:676-680 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-530hfzwb.js:676", () => {
  init_react_production();
});
//@ chunk-530hfzwb.js:680-745 placement
function useWatchLoop(active) {
  let { watchLoop } = useContext(APP_CONTEXT);
  useEffect(() => (active ? watchLoop() : undefined), [active, watchLoop]);
}
//@ chunk-530hfzwb.js:30136-30218 affinity
function preferredWantedValue(ctx, isInsert, wanted) {
  if (ctx.wanted !== undefined) return ctx.wanted ?? undefined;
  return isInsert ? undefined : wanted;
}
//@ chunk-530hfzwb.js:30218-41931 fingerprint = useVimInput (0.505)
/**
 * vim 输入：维护 NORMAL/INSERT/VISUAL/VISUAL LINE 状态，解析操作符(d/c/y)+动作、文本对象、计数与点重复；INSERT 下回落到 useTextInput。
 */
function useVimInput(props) {
  let {
    value,
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
  let initialVimStateRef = useRef(createInitialVimState());
  let [displayMode, setDisplayMode] = useState("INSERT");
  let [visualAnchor, setVisualAnchor] = useState(null);
  let [isLooping, setIsLooping] = useState(false);
  useWatchLoop(isActive && displayMode === "INSERT");
  let pendingRemapRef = useRef(null);
  let vimInputHelperRef = useRef(getVimInputHelper());
  let newTextRef = useRef(null);
  let newTextRef_2 = useRef(null);
  let insertStartTextRef = useRef(null);
  function recordInsertedText(text, key) {
    let state = initialVimStateRef.current;
    if (state.mode === "INSERT" && !key.ctrl && !key.meta && isTextInputKey(key, [...key.key].length === 1))
      initialVimStateRef.current = {
        mode: "INSERT",
        insertedText: state.insertedText + text.normalize("NFC"),
      };
  }
  let switchToInsertMode = useCallback((inserted, replacement = "") => {
    let state = initialVimStateRef.current;
    if (state.mode !== "INSERT") return;
    let previousText =
      replacement !== "" && state.insertedText.endsWith(replacement)
        ? state.insertedText.slice(0, -replacement.length)
        : state.insertedText;
    initialVimStateRef.current = {
      mode: "INSERT",
      insertedText: previousText + inserted,
    };
  }, []);
  function recordPendingRemap(insertModeEscapeRemaps, char, offsetAfter, recorded) {
    for (let key of insertModeEscapeRemaps.keys())
      if (key.startsWith(char)) {
        pendingRemapRef.current = {
          char,
          at: Date.now(),
          offsetAfter,
          recorded,
        };
        return;
      }
  }
  let cancelPendingRemap = useCallback(() => {
    pendingRemapRef.current = null;
  }, []);
  let forgetColumn = useCallback(() => {
    let state = initialVimStateRef.current;
    if (state.mode !== "INSERT")
      initialVimStateRef.current = {
        ...state,
        wanted: undefined,
      };
  }, []);
  let finishModeSwitch = useCallback(
    (cursor, options) => {
      if (options !== undefined) cursor.setOffset(options);
      pendingRemapRef.current = null;
      newTextRef_2.current = null;
      insertStartTextRef.current = null;
      initialVimStateRef.current = {
        mode: "INSERT",
        insertedText: "",
      };
      setDisplayMode("INSERT");
      setVisualAnchor(null);
      onModeChange?.("INSERT");
    },
    [onModeChange],
  );
  let switchToNormalMode = useCallback(
    (cursor, options) => {
      let current = initialVimStateRef.current;
      if (current.mode === "INSERT") {
        let lastChange = newTextRef.current;
        let isFreshChange = lastChange === newTextRef_2.current;
        if (lastChange?.type === "visualOp" && lastChange.op === "change" && isFreshChange)
          newTextRef.current = {
            type: "visualChange",
            span: lastChange.span,
            linewise: lastChange.linewise,
            text: current.insertedText ?? "",
          };
        else if (
          changeEntersInsert(lastChange) &&
          lastChange.type !== "visualOp" &&
          isFreshChange &&
          (current.insertedText ||
            (options?.buffer ? options.buffer.text : value.normalize("NFC")) === insertStartTextRef.current)
        )
          newTextRef.current = {
            ...lastChange,
            insertedText: current.insertedText,
          };
        else if (current.insertedText || (options?.claimEmptyInsert && !changeEntersInsert(lastChange)))
          newTextRef.current = {
            type: "insert",
            text: current.insertedText,
          };
        let offset = options?.buffer ? options.buffer.offset : cursor.offset;
        let text = options?.buffer ? options.buffer.text : value.normalize("NFC");
        if (
          offset > 0 &&
          text[offset - 1] !==
            `
`
        ) {
          let graphemeLength = offset > text.length ? 1 : lastGrapheme(text.slice(0, offset)).length;
          cursor.setOffset(offset - graphemeLength);
        } else if (options?.buffer) cursor.setOffset(offset);
      }
      initialVimStateRef.current = {
        mode: "NORMAL",
        command: {
          type: "idle",
        },
      };
      setDisplayMode("NORMAL");
      setVisualAnchor(null);
      onModeChange?.("NORMAL");
    },
    [onModeChange, value],
  );
  let enterVisualMode = useCallback(
    (anchor, kind, wanted) => {
      initialVimStateRef.current = {
        mode: "VISUAL",
        kind,
        anchor,
        command: {
          type: "idle",
        },
        wanted,
      };
      let modeLabel = kind === "line" ? "VISUAL LINE" : "VISUAL";
      setDisplayMode(modeLabel);
      setVisualAnchor(anchor);
      onModeChange?.(modeLabel);
    },
    [onModeChange],
  );
  function createOperatorContext(cursor, options, linewise = false) {
    let writtenText;
    return {
      cursor,
      text: cursor.text,
      setText: (newText, options) => {
        writtenText = newText;
        onChange(newText, options);
      },
      setOffset: (offset) => options.setOffset(offset),
      enterInsert: (cursor_2) => {
        finishModeSwitch(options, cursor_2);
        insertStartTextRef.current = writtenText ?? cursor.text;
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
      recordChange: linewise
        ? () => {}
        : (newText) => {
            newTextRef.current = newText;
            if (changeEntersInsert(newText) && initialVimStateRef.current.mode === "INSERT")
              newTextRef_2.current = newText;
          },
    };
  }
  function replaceRangeWithInsert(cursor, replacement, linewise) {
    let text = cursor.text;
    return {
      ...cursor,
      setText: (newText, options) => {
        let previous = {
          value: text,
          cursorOffset: cursor.cursor.offset,
        };
        text = newText;
        cursor.setText(
          newText,
          options ?? {
            previous,
          },
        );
      },
      enterInsert: (offset) => {
        let proposedText = text.slice(0, offset) + replacement + text.slice(offset);
        let snapshot = {
          value: text,
          cursorOffset: offset,
        };
        let nextReplacement = shouldDropFirstChar(proposedText, linewise, snapshot)
          ? replacement.slice(1)
          : replacement;
        cursor.setText(proposedText, {
          previous: snapshot,
        });
        let sliced = text.slice(0, offset);
        let normalized = (sliced + nextReplacement).normalize("NFC");
        let nextGrapheme = normalized.startsWith(sliced) ? lastGrapheme(normalized.slice(sliced.length)) : "";
        let lastChar =
          nextGrapheme && !/^[\p{Mn}\p{Me}]/u.test(nextGrapheme) ? nextGrapheme : lastGrapheme(normalized);
        let endsWithNewline = normalized.endsWith(`
`)
          ? normalized.length
          : normalized.length - lastChar.length;
        let trailingText =
          offset > 0 &&
          sliced[offset - 1] !==
            `
`
            ? offset - lastGrapheme(sliced).length
            : offset;
        cursor.setOffset(nextReplacement ? endsWithNewline : trailingText);
      },
    };
  }
  function shouldDropFirstChar(nextValue, linewise, options) {
    return (
      getInputMode !== undefined &&
      isModeCharTyped({
        nextValue,
        value: options?.value ?? value,
        cursorOffset: options?.cursorOffset ?? linewise.offset,
        mode: getInputMode(),
      })
    );
  }
  function applyInsertAtCursor(cursor, inserted, ctx, ctx_2) {
    if (cursor.type === "insertCommand") {
      if (cursor.insertedText === undefined) return;
      let insertOffset = getInsertOffset(cursor.key, inserted);
      inserted = new Cursor(inserted.measuredText, insertOffset);
      cursor = {
        type: "insert",
        text: cursor.insertedText,
      };
    }
    if ("insertedText" in cursor && cursor.insertedText !== undefined)
      ctx = replaceRangeWithInsert(ctx, cursor.insertedText, ctx_2);
    switch (cursor.type) {
      case "insert":
        if (cursor.text) {
          let insertResult = inserted.insert(cursor.text);
          let dropFirst = shouldDropFirstChar(insertResult.text, ctx_2);
          ctx.setText(insertResult.text);
          let nextText = dropFirst ? insertResult.text.slice(1) : insertResult.text;
          let nextOffset = insertResult.offset - (dropFirst ? 1 : 0);
          ctx.setOffset(
            nextText[nextOffset - 1] ===
              `
`
              ? nextOffset
              : nextOffset - lastGrapheme(nextText.slice(0, nextOffset)).length,
          );
        }
        break;
      case "x":
        executeX(cursor.count, ctx);
        break;
      case "substitute":
        executeSubstitute(cursor.count, ctx);
        break;
      case "replace":
        executeReplace(cursor.char, cursor.count, ctx);
        break;
      case "toggleCase":
        executeToggleCase(cursor.count, ctx);
        break;
      case "indent":
        executeIndent(cursor.dir, cursor.count, ctx);
        break;
      case "join":
        executeJoinIfNotLastLine(cursor.count, ctx);
        break;
      case "openLine":
        executeOpenLine(cursor.direction, ctx);
        break;
      case "operator":
        if (cursor.motion === cursor.op[0]) executeLineOp(cursor.op, cursor.count, ctx);
        else if (cursor.motion === "gg") executeOperatorGg(cursor.op, cursor.count, ctx);
        else if (cursor.motion === "G") executeOperatorG(cursor.op, cursor.count, ctx);
        else executeOperatorMotion(cursor.op, cursor.motion, cursor.count, ctx);
        break;
      case "operatorFind":
        executeOperatorFind(cursor.op, cursor.find, cursor.char, cursor.count, ctx);
        break;
      case "operatorTextObj":
        executeOperatorTextObj(cursor.op, cursor.scope, cursor.objType, cursor.count, ctx);
        break;
      case "visualOp":
        repeatVisualOperator(cursor.op, cursor.span, cursor.linewise, ctx);
        break;
      case "visualReplace":
        repeatVisualReplace(cursor.char, cursor.span, cursor.linewise, ctx);
        break;
      case "visualCase":
        repeatVisualCase(cursor.caseOp, cursor.span, cursor.linewise, ctx);
        break;
      case "visualPaste":
        repeatVisualPaste(
          cursor.content,
          cursor.registerLinewise,
          cursor.selectionEndsLine,
          cursor.selectionOnOneLine,
          cursor.span,
          cursor.linewise,
          ctx,
        );
        break;
      case "visualIndent":
        repeatVisualIndent(cursor.dir, cursor.count, cursor.lines, ctx);
        break;
      case "visualChange":
        repeatVisualChange(cursor.span, cursor.linewise, replaceRangeWithInsert(ctx, cursor.text, ctx_2));
        break;
      case "paste":
        executePaste(cursor.after, cursor.count, ctx);
        break;
    }
  }
  function columnFromOffset(offset) {
    let text = newTextRef.current;
    if (text && offset !== undefined && "count" in text && isCursorMovingChange(text))
      return {
        ...text,
        count: offset,
      };
    return text;
  }
  function targetForMotion(ctx, wantedColumn, offset) {
    let column = columnFromOffset(offset);
    if (!column) return;
    let cursor = Cursor.fromText(value, columns, ctx.offset);
    applyInsertAtCursor(
      column,
      cursor,
      {
        ...createOperatorContext(cursor, ctx, true),
        wantedColumn,
      },
      ctx,
    );
  }
  function deleteContent(content, linewise) {
    let normalized = value.normalize("NFC");
    let offset = linewise.offset;
    let setText = (type, char) => {
      let previous = char?.previous;
      if (!shouldDropFirstChar(type, linewise, previous)) normalized = type;
      else if (type.length !== (previous?.value ?? value).length + 1) normalized = type.slice(1);
      onChange(type, char);
    };
    let targetAt = (wantedColumn, offset_2) => {
      let column = columnFromOffset(offset_2);
      if (!column) return;
      let cursor = Cursor.fromText(normalized, columns, offset);
      applyInsertAtCursor(
        column,
        cursor,
        {
          ...createOperatorContext(cursor, linewise, true),
          text: normalized,
          setText,
          setOffset: (change) => {
            offset = change;
            linewise.setOffset(change);
          },
          enterInsert: (cursor) => {
            offset = cursor;
            finishModeSwitch(linewise, cursor);
          },
          wantedColumn,
        },
        linewise,
      );
    };
    let lines = [...content];
    for (let idx = 0; idx < lines.length; idx++) {
      if (initialVimStateRef.current.mode === "INSERT") {
        let joined = lines.slice(idx).join("");
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
        let inserted = Cursor.fromText(normalized, columns, offset).insert(joined);
        let dropFirst = shouldDropFirstChar(inserted.text, linewise);
        let offsetAfter = inserted.offset - (dropFirst ? 1 : 0);
        onChange(inserted.text);
        linewise.setOffset(offsetAfter);
        initialVimStateRef.current = {
          mode: "INSERT",
          insertedText: initialVimStateRef.current.insertedText + joined,
        };
        let joined_2 = dropFirst ? joined.slice(1) : joined;
        let lastChar = lastGrapheme(inserted.text.slice(0, inserted.offset));
        if (lastChar && joined_2.endsWith(lastChar))
          recordPendingRemap(insertModeEscapeRemaps, lastChar, offsetAfter, true);
        return;
      }
      let state = initialVimStateRef.current;
      if (state.mode !== "NORMAL") return;
      let keyText = lines[idx];
      if (
        (keyText === "v" || keyText === "V") &&
        (state.command.type === "idle" || state.command.type === "count")
      ) {
        enterVisualMode(offset, keyText === "V" ? "line" : "char", state.wanted);
        return;
      }
      let cursor = Cursor.fromText(normalized, columns, offset);
      let didYank = false;
      let motionContext = {
        ...createOperatorContext(cursor, linewise, false),
        text: normalized,
        setText,
        setOffset: (offset_2) => {
          offset = offset_2;
          linewise.setOffset(offset_2);
        },
        enterInsert: (cursor) => {
          offset = cursor;
          finishModeSwitch(linewise, cursor);
        },
        onDotRepeat: (change) => {
          didYank ||= newTextRef.current !== null;
          targetAt(state.wanted, change);
        },
        wantedColumn: state.wanted,
      };
      let ctx = wrapCtxWithHook(motionContext, () => {
        didYank = true;
      });
      let transitionResult = transition(state.command, keyText, ctx);
      if (transitionResult.execute) transitionResult.execute();
      if (
        initialVimStateRef.current.mode === "NORMAL" &&
        (transitionResult.next || transitionResult.execute || transitionResult.wanted !== undefined)
      )
        initialVimStateRef.current = {
          mode: "NORMAL",
          command: transitionResult.next ?? {
            type: "idle",
          },
          wanted: preferredWantedValue(transitionResult, didYank, state.wanted),
        };
    }
  }
  function handleVimKeyDown(rawInput, key) {
    handleVimInput(rawInput, key);
    let state = initialVimStateRef.current;
    setIsLooping(state.mode !== "INSERT" && state.command.type !== "idle");
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
    let cursor = Cursor.fromText(value, columns, key.offset);
    let filterInput = () => inputFilter?.(rawInput.key, rawInput);
    if (!(
      rawInput.name === "left" &&
      !rawInput.ctrl &&
      !rawInput.meta &&
      !rawInput.fn &&
      !rawInput.superKey &&
      !rawInput.shift
    ))
      key.disarmLeftArrowConfirm?.();
    let remap = pendingRemapRef.current;
    pendingRemapRef.current = null;
    if (rawInput.ctrl || rawInput.meta) {
      if (state.mode === "VISUAL") {
        filterInput();
        switchToNormalMode(key);
        rawInput.preventDefault();
        return;
      }
      key.handleKeyDown(rawInput);
      return;
    }
    if (rawInput.name === "escape") {
      filterInput();
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
        if (state.mode === "VISUAL") clampCursorInPlace(cursor, key);
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
        let charCount = [...normalized].length;
        let isSingleChar = charCount === 1;
        let isTextKey = isTextInputKey(rawInput, isSingleChar);
        if (
          isTextKey &&
          charCount <= 2 &&
          remap &&
          insertModeEscapeRemaps.has(remap.char + firstGrapheme(normalized)) &&
          Date.now() - remap.at <= VIM_ESCAPE_REMAP_TIMEOUT_MS &&
          key.offset === remap.offsetAfter &&
          cursor.text.startsWith(remap.char, cursor.offset - remap.char.length)
        ) {
          filterInput();
          if (remap.recorded && state.insertedText.endsWith(remap.char))
            initialVimStateRef.current = {
              mode: "INSERT",
              insertedText: state.insertedText.slice(0, -remap.char.length),
            };
          let remapStart = cursor.offset - remap.char.length;
          let withoutRemap = cursor.text.slice(0, remapStart) + cursor.text.slice(cursor.offset);
          onChange(withoutRemap);
          logFeatureOk("vim_insert_remap");
          switchToNormalMode(key, {
            buffer: {
              text: withoutRemap,
              offset: remapStart,
            },
            claimEmptyInsert: true,
          });
          rawInput.preventDefault();
          return;
        }
        if (isTextKey && !isSingleChar && insertModeEscapeRemaps.has(normalized)) {
          filterInput();
          logFeatureOk("vim_insert_remap");
          switchToNormalMode(key, {
            claimEmptyInsert: true,
          });
          rawInput.preventDefault();
          return;
        }
        let lastChar = isTextKey ? lastGrapheme(normalized) : "";
        if (lastChar)
          recordPendingRemap(
            insertModeEscapeRemaps,
            lastChar,
            key.offset + normalized.length,
            isTextInputKey(rawInput, [...rawInput.key].length === 1),
          );
      }
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.mode === "VISUAL") {
      let hooked = false;
      let ctx = wrapCtxWithHook(
        {
          ...createOperatorContext(cursor, key, false),
          onUndo,
          onDotRepeat: () => targetForMotion(key, state.wanted),
          wantedColumn: state.wanted,
        },
        () => {
          hooked = true;
        },
      );
      let isIdleOrCount = state.command.type === "idle" || state.command.type === "count";
      let key_2 = rawInput.key;
      if (rawInput.name === "left") key_2 = isIdleOrCount ? "h" : "";
      else if (rawInput.name === "right") key_2 = isIdleOrCount ? "l" : "";
      else if (rawInput.name === "up") key_2 = isIdleOrCount ? "k" : "";
      else if (rawInput.name === "down") key_2 = isIdleOrCount ? "j" : "";
      else if (rawInput.name === "return")
        key_2 = isIdleOrCount
          ? "j"
          : `
`;
      else if (rawInput.name === "backspace") key_2 = isIdleOrCount ? BACKSPACE_KEY : "";
      else if (rawInput.name === "delete") key_2 = isIdleOrCount && state.command.type !== "count" ? "x" : "";
      else if (rawInput.key === "" || NON_TEXT_KEY_NAMES.has(rawInput.name)) {
        rawInput.preventDefault();
        return;
      } else if ([...rawInput.key].length > 1) {
        rawInput.preventDefault();
        return;
      }
      filterInput();
      let visualTransitionResult = visualTransition(state.command, key_2, ctx);
      let isLinewiseKind = state.kind === "line";
      if ("next" in visualTransitionResult) {
        visualTransitionResult.move?.();
        initialVimStateRef.current = {
          mode: "VISUAL",
          kind: state.kind,
          anchor: state.anchor,
          command: visualTransitionResult.next,
          wanted: preferredWantedValue(visualTransitionResult, hooked, state.wanted),
        };
      } else
        switch (visualTransitionResult.exit) {
          case "operator":
            executeVisualOperator(
              visualTransitionResult.op,
              state.anchor,
              ctx,
              isLinewiseKind || visualTransitionResult.forceLinewise === true,
            );
            if (initialVimStateRef.current.mode === "VISUAL") switchToNormalMode(key);
            break;
          case "replace":
            executeVisualReplace(visualTransitionResult.char, state.anchor, ctx, isLinewiseKind);
            switchToNormalMode(key);
            break;
          case "case":
            executeVisualCase(visualTransitionResult.op, state.anchor, ctx, isLinewiseKind);
            switchToNormalMode(key);
            break;
          case "paste":
            if (ctx.getRegister()) {
              executeVisualPaste(state.anchor, ctx, isLinewiseKind);
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
            executeVisualJoin(state.anchor, ctx, isLinewiseKind);
            switchToNormalMode(key);
            break;
          case "indent":
            executeVisualIndent(visualTransitionResult.dir, visualTransitionResult.count, state.anchor, ctx);
            switchToNormalMode(key);
            break;
          case "swap": {
            let offset = cursor.offset;
            key.setOffset(state.anchor);
            initialVimStateRef.current = {
              mode: "VISUAL",
              kind: state.kind,
              anchor: offset,
              command: {
                type: "idle",
              },
            };
            setVisualAnchor(offset);
            break;
          }
          case "selectRange": {
            let pendingResult =
              visualTransitionResult.end > visualTransitionResult.start
                ? cursor.measuredText.prevOffset(visualTransitionResult.end)
                : visualTransitionResult.start;
            key.setOffset(pendingResult);
            initialVimStateRef.current = {
              mode: "VISUAL",
              kind: state.kind,
              anchor: visualTransitionResult.start,
              command: {
                type: "idle",
              },
            };
            setVisualAnchor(visualTransitionResult.start);
            break;
          }
          default: {
            let visualKind = visualTransitionResult.key === "V" ? "line" : "char";
            if (visualKind === state.kind) {
              let offset = clampCursorInPlace(cursor, key);
              switchToNormalMode(key);
              let { wanted } = state;
              if (wanted?.offset === cursor.offset && wanted.text === cursor.text)
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
            } else enterVisualMode(state.anchor, visualKind, state.wanted);
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
      (rawInput.name === "up" || rawInput.name === "down" || (rawInput.name === "left" && cursor.text === ""))
    ) {
      key.handleKeyDown(rawInput);
      return;
    }
    if (state.command.type === "idle" && rawInput.key === "?" && onToggleHelp) {
      onToggleHelp();
      rawInput.preventDefault();
      return;
    }
    filterInput();
    if (state.command.type === "idle" && rawInput.key === "/" && onOpenHistorySearch) {
      onOpenHistorySearch();
      rawInput.preventDefault();
      return;
    }
    if (state.command.type === "idle") {
      if (rawInput.key === "k") {
        let index = cursor.text.indexOf(`
`);
        if (index === -1 || cursor.offset <= index) {
          onHistoryUp?.();
          rawInput.preventDefault();
          return;
        }
      }
      if (rawInput.key === "j") {
        let index = cursor.text.lastIndexOf(`
`);
        if (index === -1 || cursor.offset > index) {
          onHistoryDown?.();
          rawInput.preventDefault();
          return;
        }
      }
    }
    let unusedVimFlag = false;
    let ctx = wrapCtxWithHook(
      {
        ...createOperatorContext(cursor, key, false),
        onUndo,
        onDotRepeat: (change) => {
          unusedVimFlag ||= newTextRef.current !== null;
          targetForMotion(key, state.wanted, change);
        },
        wantedColumn: state.wanted,
      },
      () => {
        unusedVimFlag = true;
      },
    );
    let retryResult =
      state.command.type === "idle" ||
      state.command.type === "count" ||
      state.command.type === "operator" ||
      state.command.type === "operatorCount";
    let key_2 = rawInput.key;
    if (rawInput.name === "left") key_2 = "h";
    else if (rawInput.name === "right") key_2 = "l";
    else if (rawInput.name === "up") key_2 = "k";
    else if (rawInput.name === "down") key_2 = "j";
    else if (retryResult && rawInput.name === "backspace") key_2 = BACKSPACE_KEY;
    else if (retryResult && state.command.type !== "count" && rawInput.name === "delete") key_2 = "x";
    else if (rawInput.key === "" || NON_TEXT_KEY_NAMES.has(rawInput.name)) return;
    else if ([...rawInput.key].length > 1) {
      deleteContent(rawInput.key, key);
      rawInput.preventDefault();
      return;
    }
    if (
      (key_2 === "v" || key_2 === "V") &&
      (state.command.type === "idle" || state.command.type === "count")
    ) {
      enterVisualMode(cursor.offset, key_2 === "V" ? "line" : "char", state.wanted);
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
        wanted: preferredWantedValue(result, unusedVimFlag, state.wanted),
      };
    rawInput.preventDefault();
  }
  let setModeExternal = useCallback(
    (offset, options) => {
      pendingRemapRef.current = null;
      newTextRef_2.current = null;
      if (offset === "INSERT") {
        initialVimStateRef.current = {
          mode: "INSERT",
          insertedText: "",
        };
        setVisualAnchor(null);
      } else if (offset === "NORMAL") {
        initialVimStateRef.current = {
          mode: "NORMAL",
          command: {
            type: "idle",
          },
        };
        setVisualAnchor(null);
      } else {
        let kind = offset === "VISUAL LINE" ? "line" : "char";
        let offset_2 = options.offset;
        initialVimStateRef.current = {
          mode: "VISUAL",
          kind,
          anchor: offset_2,
          command: {
            type: "idle",
          },
        };
        setVisualAnchor(offset_2);
      }
      setDisplayMode(offset);
      setIsLooping(false);
      onModeChange?.(offset);
    },
    [onModeChange],
  );
  return {
    handleKeyDown: handleVimKeyDown,
    mode: displayMode,
    setMode: setModeExternal,
    visualAnchor,
    recordInsertedText,
    recordInsert: switchToInsertMode,
    cancelPendingRemap,
    forgetColumn,
    isCommandPending: isLooping,
  };
}
//@ chunk-530hfzwb.js:41931-43138 placement
function VimInputHook(props) {
  let { inputFilter } = props;
  let clearHintRef = useRef(null);
  let vimInput = useVimInput({
    value: props.value,
    onChange: (text, options) => {
      if (text === "" && props.value !== "") clearHintRef.current?.();
      props.onChange(text, options);
    },
    columns: props.columns,
    disableEscapeDoublePress: props.disableEscapeDoublePress,
    onModeChange: props.onModeChange,
    onUndo:
      props.onUndo &&
      (() => {
        clearHintRef.current?.();
        props.onUndo?.();
      }),
    onOpenHistorySearch: props.onOpenHistorySearch,
    onToggleHelp: props.onToggleHelp,
    onHistoryUp:
      props.onHistoryUp &&
      (() => {
        clearHintRef.current?.();
        props.onHistoryUp?.();
      }),
    onHistoryDown:
      props.onHistoryDown &&
      (() => {
        clearHintRef.current?.();
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
    inputFilter: (rawInput, key) => {
      let filteredInput = inputFilter ? inputFilter(rawInput, key) : rawInput;
      if (
        rawInput ===
          `
` &&
        (key.name === "return" || key.name === "enter" || (key.ctrl && key.name === "j"))
      ) {
        let isMultilineReturn =
          key.name === "return" && props.multiline === true && props.disableBackslashReturn !== true;
        vimInput.recordInsert(filteredInput, isMultilineReturn ? "\\" : "");
      } else vimInput.recordInsertedText(filteredInput, key);
      return filteredInput;
    },
  });
  clearHintRef.current = textInput.noteKeystrokeEmptied ?? null;
  return {
    ...textInput,
    handleKeyDown: (keyEvent) => vimInput.handleKeyDown(keyEvent, textInput),
    recordInsert: vimInput.recordInsert,
    mode: vimInput.mode,
    setMode: (nextMode) => vimInput.setMode(nextMode, textInput),
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
