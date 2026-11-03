/**
 * vim/transitions.ts
 *
 * 并入旧版已有路径：vim 状态转换。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/vim/transitions.ts
 * pieces: chunk-530hfzwb.js (37)
 * attribution: fingerprint 12, layout 8, file-local 2, placement 15
 */
import {
  executeToggleCase,
  executeX,
  executeSubstitute,
  executeLineOp,
  executeJoinLines,
  executePaste,
  executeOperatorMotion,
  executeOpenLine,
  clampOffsetOutsidePlaceholder,
  executeOperatorG,
  executeOperatorFind,
  executeOperatorTextObj,
  computeScreenLineMove,
  executeOperatorGg,
  executeReplace,
  executeIndent,
} from "./operators.js";
import {
  isOperatorKey,
  OPERATORS,
  BACKSPACE_KEY,
  resolveMotion,
  FIND_KEYS,
  isTextObjScopeKey,
  TEXT_OBJ_SCOPES,
  TEXT_OBJ_TYPES,
  SIMPLE_MOTIONS,
  CHAR_MOTIONS,
  MAX_VIM_COUNT,
} from "./types.js";
import { truncatePathMiddle, Cursor } from "../utils/Cursor.js";
import { findTextObject } from "./textObjects.js";

/**
 * 普通模式状态机入口：按当前命令状态（idle/count/operator/operatorCount/operatorFind/operatorTextObj/find/g/operatorG/replace/indent）分派处理一个输入，返回 {next 下一状态} 或 {execute 要执行的动作}（可带 wanted 目标列）。
 */
//@ chunk-530hfzwb.js:19998-20379 fingerprint = transition (1)
function transition(state, input, ctx) {
  switch (state.type) {
    case "idle":
      return fromIdle(input, ctx);
    case "count":
      return fromCount(state, input, ctx);
    case "operator":
      return fromOperator(state, input, ctx);
    case "operatorCount":
      return fromOperatorCount(state, input, ctx);
    case "operatorFind":
      return fromOperatorFind(state, input, ctx);
    case "operatorTextObj":
      return fromOperatorTextObj(state, input, ctx);
    case "find":
      return fromFind(state, input, ctx);
    case "g":
      return fromG(state, input, ctx);
    case "operatorG":
      return fromOperatorG(state, input, ctx);
    case "replace":
      return fromReplace(state, input, ctx);
    case "indent":
      return fromIndent(state, input, ctx);
  }
}
/**
 * 普通模式单键命令表：g r > < 进入子状态；~ x s S J p P D C Y ; , u i I a A o O 直接执行。
 */
//@ chunk-530hfzwb.js:20379-21423 fingerprint = handleNormalInput (0.433)
var NORMAL_COMMANDS = Object.assign(Object.create(null), {
  g: (e) => ({ next: { type: "g", count: e } }),
  r: (e) => ({ next: { type: "replace", count: e } }),
  ">": (e) => ({ next: { type: "indent", dir: ">", count: e } }),
  "<": (e) => ({ next: { type: "indent", dir: "<", count: e } }),
  "~": (e, t) => ({ execute: () => executeToggleCase(e, t) }),
  x: (e, t) => ({ execute: () => executeX(e, t), wanted: null }),
  s: (e, t) => ({ execute: () => executeSubstitute(e, t) }),
  S: (e, t) => ({ execute: () => executeLineOp("change", e, t) }),
  J: (e, t) => ({ execute: () => executeJoinLines(e, t) }),
  p: (e, t) => ({ execute: () => executePaste(!0, e, t), wanted: t.getRegister() === "" ? void 0 : null }),
  P: (e, t) => ({ execute: () => executePaste(!1, e, t), wanted: t.getRegister() === "" ? void 0 : null }),
  D: (e, t) => ({ execute: () => executeOperatorMotion("delete", "$", 1, t), wanted: null }),
  C: (e, t) => ({ execute: () => executeOperatorMotion("change", "$", 1, t) }),
  Y: (e, t) => ({ execute: () => executeLineOp("yank", e, t) }),
  ";": (e, t) => ({ execute: () => executeRepeatFind(!1, e, t) }),
  ",": (e, t) => ({ execute: () => executeRepeatFind(!0, e, t) }),
  u: (e, t) => ({ execute: () => t.onUndo?.(), wanted: null }),
  i: (e, t) => ({ execute: () => executeInsertCommand("i", t) }),
  I: (e, t) => ({ execute: () => executeInsertCommand("I", t) }),
  a: (e, t) => ({ execute: () => executeInsertCommand("a", t) }),
  A: (e, t) => ({ execute: () => executeInsertCommand("A", t) }),
  o: (e, t) => ({ execute: () => executeOpenLine("below", t) }),
  O: (e, t) => ({ execute: () => executeOpenLine("above", t) }),
});
/**
 * idle/count 状态下解析一个键：操作符 d c y 进入 operator 状态；G 跳行；j k 保持目标列移动；$ 记住列为无穷；其余简单移动；f F t T 进入 find；. 重复上次修改；否则查单键命令表。
 */
//@ chunk-530hfzwb.js:21423-22339 layout
function handleNormalInput(input, count, countTyped, ctx) {
  if (isOperatorKey(input))
    return { next: { type: "operator", op: OPERATORS[input], count: count, countTyped: countTyped } };
  if (input === "G")
    return {
      execute: () => {
        ctx.setOffset(
          countTyped
            ? ctx.cursor.goToLine(count).offset
            : ctx.text.lastIndexOf(`
`) + 1,
        );
      },
    };
  if (input === "j" || input === "k") {
    let { offset: offset, column: column } = truncatePathMiddle(input === "j", count, ctx),
      { text: text } = ctx.cursor;
    if (offset === null)
      return { next: { type: "idle" }, wanted: { column: column, offset: ctx.cursor.offset, text: text } };
    let u = clampOffsetOutsidePlaceholder(ctx.cursor, offset);
    return { execute: () => ctx.setOffset(u), wanted: { column: column, offset: u, text: text } };
  }
  if (input === "$") {
    let offset = ctx.cursor.lastCharInLogicalLine().offset;
    return {
      execute: () => ctx.setOffset(offset),
      wanted: { column: 1 / 0, offset: offset, text: ctx.cursor.text },
    };
  }
  if (isSimpleMotion(input, countTyped)) {
    let s =
        input === " " || input === BACKSPACE_KEY
          ? applyCharMotionAcrossLines(input, ctx.cursor, count)
          : resolveMotion(input, ctx.cursor, count),
      o = clampOffsetOutsidePlaceholder(s, s.offset);
    if (o === ctx.cursor.offset && isNoOpWhenUnmoved(input)) return { next: { type: "idle" } };
    return { execute: () => ctx.setOffset(o), wanted: null };
  }
  if (FIND_KEYS.has(input)) return { next: { type: "find", find: input, count: count } };
  if (input === ".") return { execute: () => ctx.onDotRepeat?.(countTyped ? count : void 0) };
  return NORMAL_COMMANDS[input]?.(count, ctx) ?? null;
}
/**
 * operator 状态下的后续键：i/a 进文本对象、f/F/t/T 进查找、移动键直接执行、G 到行、g 进 operatorG。
 */
//@ chunk-530hfzwb.js:22339-22711 fingerprint = handleOperatorInput (0.95)
function handleOperatorInput(op, count, countTyped, input, ctx) {
  if (isTextObjScopeKey(input))
    return { next: { type: "operatorTextObj", op: op, count: count, scope: TEXT_OBJ_SCOPES[input] } };
  if (FIND_KEYS.has(input)) return { next: { type: "operatorFind", op: op, count: count, find: input } };
  if (isSimpleMotion(input, countTyped))
    return {
      execute: () => executeOperatorMotion(op, input, count, ctx),
      wanted: input === "j" || input === "k" || input === "%" ? void 0 : null,
    };
  if (input === "G") {
    let o = countTyped ? count : 0;
    return { execute: () => executeOperatorG(op, o, ctx) };
  }
  if (input === "g") return { next: { type: "operatorG", op: op, count: count } };
  return null;
}
/**
 * idle：1-9 开始计数，0 回行首，其他交给 handleNormalInput。
 */
//@ chunk-530hfzwb.js:22711-22919 fingerprint = fromIdle (0.878)
function fromIdle(input, ctx) {
  if (/[1-9]/.test(input)) return { next: { type: "count", count: parseInt(input, 10) } };
  if (input === "0") return { execute: () => ctx.setOffset(ctx.cursor.startOfLogicalLine().offset) };
  let r = handleNormalInput(input, 1, !1, ctx);
  if (r) return r;
  return {};
}
/**
 * count：继续累积数字（上限 10000），否则带计数执行。
 */
//@ chunk-530hfzwb.js:22919-23071 fingerprint = fromCount (0.794)
function fromCount(state, input, ctx) {
  if (/[0-9]/.test(input)) return { next: { type: "count", count: appendCountDigit(state.count, input) } };
  let n = handleNormalInput(input, state.count, !0, ctx);
  if (n) return n;
  return { next: { type: "idle" } };
}
/**
 * operator：同一操作符键（dd/cc/yy）做整行操作；1-9 开始移动计数；否则交给 handleOperatorInput。
 */
//@ chunk-530hfzwb.js:23071-23336 fingerprint = fromOperator (0.777)
function fromOperator(state, input, ctx) {
  if (input === state.op[0]) return { execute: () => executeLineOp(state.op, state.count, ctx) };
  if (/[1-9]/.test(input))
    return {
      next: { type: "operatorCount", op: state.op, count: state.count, motionCount: parseInt(input, 10) },
    };
  let n = state.countTyped ?? !1,
    s = handleOperatorInput(state.op, state.count, n, input, ctx);
  if (s) return s;
  return { next: { type: "idle" } };
}
/**
 * operatorCount（如 d3w）：累积移动计数，总计数 = 操作符计数 × 移动计数。
 */
//@ chunk-530hfzwb.js:23336-23566 layout = fromOperatorTextObj (0.872)
function fromOperatorCount(state, input, ctx) {
  if (/[0-9]/.test(input))
    return { next: { ...state, motionCount: appendCountDigit(state.motionCount, input) } };
  let n = state.count * state.motionCount;
  if (input === state.op[0]) return { execute: () => executeLineOp(state.op, n, ctx) };
  let s = handleOperatorInput(state.op, n, !0, input, ctx);
  if (s) return s;
  return { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:23566-23669 fingerprint = fromOperatorFind (0.803)
function fromOperatorFind(state, input, ctx) {
  return {
    execute: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      executeOperatorFind(state.op, state.find, input, state.count, ctx);
    },
  };
}
//@ chunk-530hfzwb.js:23669-23777 fingerprint = fromOperatorTextObj (1)
function fromOperatorTextObj(state, input, ctx) {
  if (TEXT_OBJ_TYPES.has(input))
    return { execute: () => executeOperatorTextObj(state.op, state.scope, input, state.count, ctx) };
  return { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:23777-23926 fingerprint = fromFind (1)
function fromFind(state, input, ctx) {
  return {
    execute: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      let result = ctx.cursor.findCharacter(input, state.find, state.count);
      if (result !== null) ctx.setOffset(result);
    },
  };
}
/**
 * g 前缀：gj/gk 按屏幕行移动，gg/{count}gg 跳到第一行/第 count 行。
 */
//@ chunk-530hfzwb.js:23926-24261 fingerprint = fromG (1)
function fromG(state, input, ctx) {
  if (input === "j" || input === "k")
    return toScreenLineMoveResult(computeScreenLineMove(`g${input}`, state.count, ctx), ctx);
  if (input === "g") {
    if (state.count > 1)
      return {
        execute: () => {
          let parts = ctx.text.split(`
`),
            targetLine = Math.min(state.count - 1, parts.length - 1),
            o = 0;
          for (let i = 0; i < targetLine; i++) o += (parts[i]?.length ?? 0) + 1;
          ctx.setOffset(o);
        },
      };
    return { execute: () => ctx.setOffset(ctx.cursor.startOfFirstLine().offset) };
  }
  return { next: { type: "idle" } };
}
/**
 * operatorG：dgj/dgk 按屏幕行，dgg 到首行。
 */
//@ chunk-530hfzwb.js:24261-24483 layout = fromOperatorTextObj (0.876)
function fromOperatorG(state, input, ctx) {
  if (input === "j" || input === "k") {
    let n = computeScreenLineMove(`g${input}`, state.count, ctx);
    if (n.rowsRunOut) return toScreenLineMoveResult(n, ctx);
    return { execute: () => executeOperatorMotion(state.op, `g${input}`, state.count, ctx) };
  }
  if (input === "g") return { execute: () => executeOperatorGg(state.op, state.count, ctx) };
  return { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:24483-24575 fingerprint = fromReplace (1)
function fromReplace(state, input, ctx) {
  if (input === "") return { next: { type: "idle" } };
  return { execute: () => executeReplace(input, state.count, ctx) };
}
/**
 * indent：同一方向键（>> 或 <<）执行缩进，否则回 idle。
 */
//@ chunk-530hfzwb.js:24575-24674 layout = fromReplace (1)
function fromIndent(state, input, ctx) {
  if (input === state.dir) return { execute: () => executeIndent(state.dir, state.count, ctx) };
  return { next: { type: "idle" } };
}
/**
 * ; 与 ,：按上次查找（, 时方向反转）再找一次。
 */
//@ chunk-530hfzwb.js:24674-24845 fingerprint = executeRepeatFind (1)
function executeRepeatFind(reverse, count, ctx) {
  let lastFind = ctx.getLastFind();
  if (!lastFind) return;
  let findType = lastFind.type;
  if (reverse) findType = { f: "F", F: "f", t: "T", T: "t" }[findType];
  let result = ctx.cursor.findCharacter(lastFind.char, findType, count);
  if (result !== null) ctx.setOffset(result);
}
/**
 * 可视模式（316 新增）状态机入口：按 idle/count/find/g/replace/textObject 分派，返回 {next, move, wanted} 或 {exit: 结束可视模式要执行的操作}。
 */
//@ chunk-530hfzwb.js:24845-25103 layout
function visualTransition(state, input, ctx) {
  switch (state.type) {
    case "idle":
      return visualFromIdle(input, ctx);
    case "count":
      return visualFromCount(state, input, ctx);
    case "find":
      return visualFromFind(state, input, ctx);
    case "g":
      return visualFromG(state, input, ctx);
    case "replace":
      if (input === "") return { next: { type: "idle" } };
      return { exit: "replace", char: input };
    case "textObject":
      return visualFromTextObject(state, input, ctx);
  }
}
/**
 * 可视模式单键命令：x/s/X/D/C/S/R/Y → 删除/修改/复制（大写强制整行）；r 进替换；~ u U 切换/小写/大写；p P 粘贴；> < 缩进；v V 切换字符/整行可视；o 交换选区两端；J 合并；$ g ; , 移动。
 */
//@ chunk-530hfzwb.js:25103-26227 layout
var VISUAL_COMMANDS = Object.assign(Object.create(null), {
  x: () => ({ exit: "operator", op: "delete" }),
  s: () => ({ exit: "operator", op: "change" }),
  X: () => ({ exit: "operator", op: "delete", forceLinewise: !0 }),
  D: () => ({ exit: "operator", op: "delete", forceLinewise: !0 }),
  C: () => ({ exit: "operator", op: "change", forceLinewise: !0 }),
  S: () => ({ exit: "operator", op: "change", forceLinewise: !0 }),
  R: () => ({ exit: "operator", op: "change", forceLinewise: !0 }),
  Y: () => ({ exit: "operator", op: "yank", forceLinewise: !0 }),
  r: () => ({ next: { type: "replace" } }),
  "~": () => ({ exit: "case", op: "toggle" }),
  u: () => ({ exit: "case", op: "lower" }),
  U: () => ({ exit: "case", op: "upper" }),
  p: () => ({ exit: "paste" }),
  P: () => ({ exit: "paste" }),
  ">": (e) => ({ exit: "indent", dir: ">", count: e }),
  "<": (e) => ({ exit: "indent", dir: "<", count: e }),
  v: () => ({ exit: "toggleKind", key: "v" }),
  V: () => ({ exit: "toggleKind", key: "V" }),
  o: () => ({ exit: "swap" }),
  J: () => ({ exit: "join" }),
  $: (e, t) => {
    let offset = t.cursor.endOfLogicalLine().offset;
    return {
      next: { type: "idle" },
      move: () => t.setOffset(offset),
      wanted: { column: 1 / 0, offset: offset, text: t.cursor.text },
    };
  },
  g: (e) => ({ next: { type: "g", count: e } }),
  ";": (e, t) => ({ next: { type: "idle" }, move: () => executeRepeatFind(!1, e, t) }),
  ",": (e, t) => ({ next: { type: "idle" }, move: () => executeRepeatFind(!0, e, t) }),
});
//@ chunk-530hfzwb.js:26227-26893 layout
function handleVisualInput(input, count, countTyped, ctx) {
  if (isOperatorKey(input)) return { exit: "operator", op: OPERATORS[input] };
  if (input === "G")
    return {
      next: { type: "idle" },
      move: () => {
        ctx.setOffset(
          countTyped
            ? ctx.cursor.goToLine(count).offset
            : ctx.text.lastIndexOf(`
`) + 1,
        );
      },
    };
  let s = VISUAL_COMMANDS[input];
  if (s) return s(count, ctx);
  if (isTextObjScopeKey(input))
    return { next: { type: "textObject", scope: TEXT_OBJ_SCOPES[input], count: count } };
  if (input === "j" || input === "k") {
    let o = truncatePathMiddle(input === "j", count, ctx),
      i = o.offset ?? ctx.cursor.offset;
    return {
      next: { type: "idle" },
      move: () => ctx.setOffset(i),
      wanted: { column: o.column, offset: i, text: ctx.cursor.text },
    };
  }
  if (isSimpleMotion(input, countTyped)) {
    let { offset: offset } = resolveMotion(input, ctx.cursor, count);
    if (offset === ctx.cursor.offset && isNoOpWhenUnmoved(input)) return { next: { type: "idle" } };
    return { next: { type: "idle" }, move: () => ctx.setOffset(offset) };
  }
  if (FIND_KEYS.has(input)) return { next: { type: "find", find: input, count: count } };
  return null;
}
//@ chunk-530hfzwb.js:26893-27117 file-local
function visualFromIdle(e, t) {
  if (/[1-9]/.test(e)) return { next: { type: "count", count: parseInt(e, 10) } };
  if (e === "0")
    return { next: { type: "idle" }, move: () => t.setOffset(t.cursor.startOfLogicalLine().offset) };
  return handleVisualInput(e, 1, !1, t) ?? { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:27117-27251 layout = fromCount (0.794)
function visualFromCount(state, input, ctx) {
  if (/[0-9]/.test(input)) return { next: { type: "count", count: appendCountDigit(state.count, input) } };
  return handleVisualInput(input, state.count, !0, ctx) ?? { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:27251-27416 file-local
function visualFromFind(state, input, ctx) {
  return {
    next: { type: "idle" },
    move: () => {
      if (input !== "") ctx.setLastFind(state.find, input);
      let character = ctx.cursor.findCharacter(input, state.find, state.count);
      if (character !== null) ctx.setOffset(character);
    },
  };
}
//@ chunk-530hfzwb.js:27416-27781 placement
function visualFromG(e, t, r) {
  if (t === "j" || t === "k") {
    let { offset: offset, column: column } = computeScreenLineMove(`g${t}`, e.count, r);
    return {
      next: { type: "idle" },
      move: () => r.setOffset(offset),
      wanted: column === null ? null : { column: column, offset: offset, text: r.cursor.text },
    };
  }
  if (t === "g")
    return {
      next: { type: "idle" },
      move: () => {
        let n = e.count > 1 ? r.cursor.goToLine(e.count) : r.cursor.startOfFirstLine();
        r.setOffset(n.offset);
      },
    };
  return { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:27781-27950 placement
function visualFromTextObject(e, t, r) {
  if (TEXT_OBJ_TYPES.has(t)) {
    let n = findTextObject(r.text, r.cursor.offset, t, e.scope === "inner");
    if (n) return { exit: "selectRange", start: n.start, end: n.end };
  }
  return { next: { type: "idle" } };
}
//@ chunk-530hfzwb.js:27950-27999 placement
function isSimpleMotion(e, t) {
  return SIMPLE_MOTIONS.has(e) && !(e === "%" && t);
}
//@ chunk-530hfzwb.js:27999-28040 placement
function isNoOpWhenUnmoved(e) {
  return CHAR_MOTIONS.has(e) || e === "%";
}
//@ chunk-530hfzwb.js:28040-28097 placement
function appendCountDigit(e, t) {
  return Math.min(e * 10 + parseInt(t, 10), MAX_VIM_COUNT);
}
//@ chunk-530hfzwb.js:28097-28322 placement
function getInsertOffset(e, t) {
  switch (e) {
    case "i":
      return t.offset;
    case "I":
      return t.firstNonBlankInLogicalLine().offset;
    case "a":
      return t.isAtEnd() ||
        t.text[t.offset] ===
          `
`
        ? t.offset
        : t.right().offset;
    case "A":
      return t.endOfLogicalLine().offset;
  }
}
//@ chunk-530hfzwb.js:28322-28414 placement
function executeInsertCommand(e, t) {
  (t.enterInsert(getInsertOffset(e, t.cursor)), t.recordChange({ type: "insertCommand", key: e }));
}
//@ chunk-530hfzwb.js:28414-28612 placement
function applyCharMotionAcrossLines(e, t, r) {
  let n = t;
  for (let s = 0; s < r; s++) {
    let o = resolveMotion(e, n, 1),
      { text: text, offset: offset } = o;
    if (
      text[offset] ===
        `
` &&
      offset > 0 &&
      text[offset - 1] !==
        `
`
    )
      o =
        e === BACKSPACE_KEY
          ? new Cursor(o.measuredText, clampOffsetOutsidePlaceholder(o, offset))
          : resolveMotion(e, o, 1);
    if (o.equals(n)) break;
    n = o;
  }
  return n;
}
//@ chunk-530hfzwb.js:28975-29179 placement
function toScreenLineMoveResult(e, t) {
  let r = clampOffsetOutsidePlaceholder(t.cursor, e.offset);
  if (r === t.cursor.offset) return { next: { type: "idle" } };
  return {
    execute: () => t.setOffset(r),
    wanted: e.column === null ? null : { column: e.column, offset: r, text: t.cursor.text },
  };
}
//@ chunk-530hfzwb.js:29179-29410 placement
var META_CHAR_SEQUENCE = /^\x1b(?![[\]P_\\])[\x21-\x7e]$/,
  NON_TEXT_KEY_NAMES = new Set([
    "backspace",
    "delete",
    "tab",
    "home",
    "end",
    "pageup",
    "pagedown",
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
//@ chunk-530hfzwb.js:29410-29467 placement
function isTextInputKey(e, t) {
  return (t || e.name === "") && !NON_TEXT_KEY_NAMES.has(e.name);
}
//@ chunk-530hfzwb.js:29467-29685 placement
function changeEntersInsert(e) {
  if (!e) return !1;
  switch (e.type) {
    case "insertCommand":
    case "openLine":
    case "substitute":
      return !0;
    case "operator":
    case "operatorFind":
    case "operatorTextObj":
    case "visualOp":
      return e.op === "change";
    default:
      return !1;
  }
}
//@ chunk-530hfzwb.js:29685-29872 placement
function isCursorMovingChange(e) {
  switch (e.type) {
    case "x":
    case "substitute":
    case "paste":
    case "operatorTextObj":
      return !0;
    case "operator":
      return !["h", "l", " ", BACKSPACE_KEY, "gj", "gk", "%"].includes(e.motion);
    default:
      return !1;
  }
}
//@ chunk-530hfzwb.js:29872-30058 placement
function wrapCtxWithHook(e, t) {
  return {
    ...e,
    setText: (r, n) => {
      (t(), e.setText(r, n));
    },
    setOffset: (r) => {
      (t(), e.setOffset(r));
    },
    enterInsert: (r) => {
      (t(), e.enterInsert(r));
    },
    setRegister: (r, n) => {
      (t(), e.setRegister(r, n));
    },
  };
}
//@ chunk-530hfzwb.js:30058-30136 placement
function clampCursorInPlace(e, t) {
  let r = clampOffsetOutsidePlaceholder(e, e.offset);
  if (r !== e.offset) t.setOffset(r);
  return r;
}

export {
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
};
