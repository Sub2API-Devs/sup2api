/**
 * utils/hooks/matcherGrammar.ts
 *
 * 钩子 matcher 语法（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-4nwcj4sh.js (21)
 * attribution: placement 21
 */
import { isDiskless } from "../../bootstrap/state.js";

//@ chunk-4nwcj4sh.js:370-444 placement
/**
 * 取 MCP 工具的有效权限上限（为 ask 时返回 ceiling）。
 */
var mcpPermissionCeiling = (e) =>
  e.mcpInfo?.effectiveMaxPermission === "ask"
    ? {
        ceiling: "ask",
      }
    : {};
//@ chunk-4nwcj4sh.js:444-495 placement
/**
 * 构造 matcher 的测试目标（工具名与权限上限）。
 */
var matcherTestTarget = (e) => ({
  tool: e.name,
  ceiling: mcpPermissionCeiling(e).ceiling,
});
//@ chunk-4nwcj4sh.js:495-558 placement
class MatcherGrammarError extends Error {
  kind;
  constructor(kind) {
    super();
    this.kind = kind;
  }
}
//@ chunk-4nwcj4sh.js:558-949 placement
/**
 * 匹配器语法使用的字符区间（数字、单词字符等）。
 */
var DIGIT_RANGES = [[48, 57]];
var WORD_CHAR_RANGES = [
  [48, 57],
  [65, 90],
  [95, 95],
  [97, 122],
];
var WHITESPACE_RANGES = [
  [9, 13],
  [32, 32],
  [160, 160],
  [5760, 5760],
  [8192, 8202],
  [8232, 8233],
  [8239, 8239],
  [8287, 8287],
  [12288, 12288],
  [65279, 65279],
];
var CHAR_CLASS_ESCAPES_2 = {
  d: DIGIT_RANGES,
  D: complementRanges(DIGIT_RANGES),
  w: WORD_CHAR_RANGES,
  W: complementRanges(WORD_CHAR_RANGES),
  s: WHITESPACE_RANGES,
  S: complementRanges(WHITESPACE_RANGES),
};
var DOT_RANGES = complementRanges([
  [10, 10],
  [13, 13],
  [8232, 8233],
]);
var ESCAPABLE_PUNCTUATION_RE = /^[ -/:-@[-`{-~]$/;
var QUANTIFIER_BRACES_RE = /^\{(\d+)(?:(,)(\d*))?\}/;
var NAMED_GROUP_NAME_RE = /^([A-Za-z_$][\w$]*)>/;
var CAPTURE_GROUP_RE = /\((?!\?)|\(\?<(?![=!])/;
var NAMED_CAPTURE_GROUP_RE = /\(\?<(?![=!])/;
var MAX_MATCHER_NODES = 100;
var CHAR_CLASS_ESCAPES = 6;
var REGEX_META_CHARS = "^$\\.*+?()[]{}|";
//@ chunk-4nwcj4sh.js:949-1066 placement
function inRanges(e, n) {
  let r = 0;
  let i = e.length;
  while (r < i) {
    let o = (r + i) >> 1;
    if (n > e[o][1]) r = o + 1;
    else i = o;
  }
  return r < e.length && n >= e[r][0];
}
//@ chunk-4nwcj4sh.js:1066-1179 placement
function complementRanges(e) {
  let n = [];
  let r = 0;
  for (let [i, o] of e) {
    if (i > r) n.push([r, i - 1]);
    r = o + 1;
  }
  if (r <= 65535) n.push([r, 65535]);
  return n;
}
//@ chunk-4nwcj4sh.js:1179-1337 placement
function mergeRanges(e) {
  let n = [];
  for (let [r, i] of e.toSorted((o, y) => o[0] - y[0])) {
    let last = n.at(-1);
    if (last !== undefined && r <= last[1] + 1) last[1] = Math.max(last[1], i);
    else n.push([r, i]);
  }
  return n;
}
//@ chunk-4nwcj4sh.js:1337-3450 placement
/**
 * 解析钩子 matcher 语法中的序列/二选一结构
 */
function parseMatcherSequence(e) {
  let n = 0;
  let r = 0;
  let i = new Set();
  function o(s) {
    if (!e.startsWith(s, n)) return false;
    n += s.length;
    return true;
  }
  function y() {
    if (n >= e.length) throw new MatcherGrammarError("other");
    return e.charCodeAt(n++);
  }
  function d() {
    let s = [a()];
    while (o("|")) s.push(a());
    return {
      type: "either",
      options: s,
    };
  }
  function a() {
    let s = [];
    while (n < e.length && e[n] !== "|" && e[n] !== ")") s.push(m());
    return {
      type: "sequence",
      items: s,
    };
  }
  function m() {
    if (o("^"))
      return {
        type: "start",
      };
    if (o("$"))
      return {
        type: "end",
      };
    if (o("\\b"))
      return {
        type: "boundary",
      };
    if (o("\\B"))
      return {
        type: "notBoundary",
      };
    let s = h();
    let l = 0;
    let u = 1 / 0;
    if (o("+")) l = 1;
    else if (o("?")) u = 1;
    else if (!o("*")) {
      let x = e[n] === "{" ? QUANTIFIER_BRACES_RE.exec(e.slice(n)) : null;
      if (x === null) return s;
      n += x[0].length;
      l = Number(x[1]);
      if (x[2] === undefined) u = l;
      else if (x[3] !== "") u = Number(x[3]);
      if (u < l) throw new MatcherGrammarError("other");
    }
    o("?");
    return {
      type: "repeat",
      item: s,
      least: l,
      most: u,
    };
  }
  function h() {
    if (o("(")) return S();
    if (o("."))
      return {
        type: "set",
        set: DOT_RANGES,
      };
    if (o("["))
      return {
        type: "set",
        set: _(),
      };
    if (o("\\")) {
      let s = k();
      return typeof s === "number"
        ? {
            type: "unit",
            unit: s,
          }
        : {
            type: "set",
            set: s,
          };
    }
    if (REGEX_META_CHARS.includes(e[n] ?? "")) throw new MatcherGrammarError("legacy_grammar");
    return {
      type: "unit",
      unit: y(),
    };
  }
  function S() {
    if (++r > MAX_MATCHER_NODES) throw new MatcherGrammarError("too_large");
    let s;
    if (o("?=")) s = false;
    else if (o("?!")) s = true;
    else if (o("?<=") || o("?<!")) throw new MatcherGrammarError("look_behind");
    else if (o("?<")) {
      let u = NAMED_GROUP_NAME_RE.exec(e.slice(n))?.[1];
      if (u === undefined || i.has(u)) throw new MatcherGrammarError("other");
      i.add(u);
      n += u.length + 1;
    } else if (e[n] === "?" && !o("?:")) throw new MatcherGrammarError("flags_group");
    let l = d();
    if (!o(")")) throw new MatcherGrammarError("other");
    r--;
    return s === undefined
      ? l
      : {
          type: "look",
          item: l,
          isNegative: s,
        };
  }
  function k(s = false) {
    let l = y();
    let u = String.fromCharCode(l);
    if (Object.hasOwn(CHAR_CLASS_ESCAPES_2, u)) return CHAR_CLASS_ESCAPES_2[u];
    if (!ESCAPABLE_PUNCTUATION_RE.test(u)) {
      let x = u === "k" ? NAMED_CAPTURE_GROUP_RE : CAPTURE_GROUP_RE;
      let p = !s && /[1-9k]/.test(u) && x.test(e);
      throw new MatcherGrammarError(p ? "back_reference" : "escape");
    }
    return l;
  }
  function _() {
    let s = o("^");
    let l = [];
    while (!o("]")) {
      let u = o("\\") ? k(true) : y();
      let x = e[n] === "-" && e[n + 1] !== "]";
      if (typeof u !== "number") {
        if (x) throw new MatcherGrammarError("legacy_grammar");
        l.push(...u);
        continue;
      }
      if (!x) {
        l.push([u, u]);
        continue;
      }
      n++;
      let p = o("\\") ? k(true) : y();
      if (typeof p !== "number") throw new MatcherGrammarError("legacy_grammar");
      if (p < u) throw new MatcherGrammarError("other");
      l.push([u, p]);
    }
    return s ? complementRanges(mergeRanges(l)) : mergeRanges(l);
  }
  let w = d();
  if (n < e.length) throw new MatcherGrammarError("other");
  return w;
}
//@ chunk-4nwcj4sh.js:3450-3540 placement
var OPCODES = {
  match: 0,
  unit: 1,
  set: 2,
  jump: 3,
  split: 4,
  start: 5,
  end: 6,
  boundary: 7,
  notBoundary: 8,
  look: 9,
};
//@ chunk-4nwcj4sh.js:3540-3593 placement
function spendProgramRoom(room) {
  if (--room.left < 0) throw new MatcherGrammarError("too_large");
}
//@ chunk-4nwcj4sh.js:3593-3652 placement
function newProgram(room) {
  return {
    room,
    ops: [],
    to: [],
    other: [],
    sets: [],
  };
}
//@ chunk-4nwcj4sh.js:3652-3751 placement
function emitOp(program, n, r = 0, i) {
  spendProgramRoom(program.room);
  program.to.push(r);
  program.other.push(0);
  program.sets.push(i);
  return program.ops.push(n) - 1;
}
//@ chunk-4nwcj4sh.js:3751-4788 placement
/**
 * 把匹配器语法树节点编译为匹配程序的指令（单元、集合、前瞻、分支等）。
 */
function compileMatcherNode(node, program, r, i) {
  spendProgramRoom(program.room);
  let { ops, to, other } = program;
  switch (node.type) {
    case "unit":
      emitOp(program, OPCODES.unit, node.unit);
      return;
    case "set":
      emitOp(program, OPCODES.set, 0, node.set);
      return;
    case "start":
    case "end":
    case "boundary":
    case "notBoundary":
      emitOp(program, OPCODES[node.type]);
      return;
    case "look": {
      let a = r.indexOf.get(node);
      if (a === undefined) {
        let program_2 = newProgram(program.room);
        compileMatcherNode(node.item, program_2, r, true);
        emitOp(program_2, OPCODES.match);
        a =
          r.list.push({
            places: program_2,
            isNegative: node.isNegative,
          }) - 1;
        r.indexOf.set(node, a);
      }
      emitOp(program, OPCODES.look, a);
      return;
    }
    case "sequence":
      for (let a of i ? node.items.toReversed() : node.items) compileMatcherNode(a, program, r, i);
      return;
    case "either": {
      let a = [];
      for (let option of node.options.slice(0, -1)) {
        let h = emitOp(program, OPCODES.split, ops.length + 1);
        compileMatcherNode(option, program, r, i);
        a.push(emitOp(program, OPCODES.jump));
        other[h] = ops.length;
      }
      compileMatcherNode(node.options.at(-1), program, r, i);
      for (let m of a) to[m] = ops.length;
      return;
    }
    case "repeat": {
      let a = ops.length;
      for (let j = 0; j < node.least; j++) {
        a = ops.length;
        compileMatcherNode(node.item, program, r, i);
      }
      if (node.most === 1 / 0) {
        if (node.least > 0) {
          let S = emitOp(program, OPCODES.split, a);
          other[S] = ops.length;
          return;
        }
        let h = emitOp(program, OPCODES.split, ops.length + 1);
        compileMatcherNode(node.item, program, r, i);
        emitOp(program, OPCODES.jump, h);
        other[h] = ops.length;
        return;
      }
      let m = [];
      for (let least = node.least; least < node.most; least++) {
        m.push(emitOp(program, OPCODES.split, ops.length + 1));
        compileMatcherNode(node.item, program, r, i);
      }
      for (let h of m) other[h] = ops.length;
    }
  }
}
//@ chunk-4nwcj4sh.js:4788-5571 placement
/**
 * 以 NFA 模拟的方式执行编译后的 matcher 程序：逐字符推进状态集合，处理单元、字符集、行首/行尾、词边界与环视结果，返回是否匹配（或为环视填充每个位置的匹配表）。
 */
function runMatcherProgram({ ops, to, other, sets }, input, y, captures) {
  let a = new Int32Array(ops.length).fill(-1);
  let int32Array = new Int32Array(ops.length);
  let int32Array_2 = new Int32Array(ops.length);
  let S = 0;
  let k = 0;
  let _ = captures === undefined ? 0 : input.length;
  function w(s) {
    if (a[s] !== _) {
      a[s] = _;
      int32Array[S++] = s;
    }
  }
  for (;;) {
    while (k > 0) w(int32Array_2[--k]);
    w(0);
    let s = _ > 0 ? input.charCodeAt(_ - 1) : -1;
    let l = _ < input.length ? input.charCodeAt(_) : -1;
    let u = captures === undefined ? l : s;
    let x = inRanges(WORD_CHAR_RANGES, s) !== inRanges(WORD_CHAR_RANGES, l);
    while (S > 0) {
      let p = int32Array[--S];
      switch (ops[p]) {
        case OPCODES.match:
          if (captures === undefined) return true;
          captures[_] = 1;
          break;
        case OPCODES.unit:
          if (u === to[p]) int32Array_2[k++] = p + 1;
          break;
        case OPCODES.set:
          if (inRanges(sets[p], u)) int32Array_2[k++] = p + 1;
          break;
        case OPCODES.split:
          w(other[p]);
          w(to[p]);
          break;
        case OPCODES.jump:
          w(to[p]);
          break;
        case OPCODES.start:
          if (s < 0) w(p + 1);
          break;
        case OPCODES.end:
          if (l < 0) w(p + 1);
          break;
        case OPCODES.boundary:
        case OPCODES.notBoundary:
          if (x === (ops[p] === OPCODES.boundary)) w(p + 1);
          break;
        default:
          if (y[to[p]][_] === 1) w(p + 1);
      }
    }
    if (u < 0) return false;
    _ += captures === undefined ? 1 : -1;
  }
}
//@ chunk-4nwcj4sh.js:5571-5808 placement
/**
 * 把解析后的 matcher 语法树编译为线性指令程序（类 Thompson NFA），环视子表达式先单独编译；返回逐位置模拟执行的 test 函数，保证线性时间匹配。
 */
function compileMatcher(matcherSequence, left) {
  let program = newProgram({
    left,
  });
  let i = {
    list: [],
    indexOf: new Map(),
  };
  compileMatcherNode(matcherSequence, program, i, false);
  emitOp(program, OPCODES.match);
  return (o) => {
    let y = [];
    for (let d of i.list) {
      let uint8Array = new Uint8Array(o.length + 1);
      runMatcherProgram(d.places, o, y, uint8Array);
      y.push(d.isNegative ? uint8Array.map((uint8) => 1 - uint8) : uint8Array);
    }
    return runMatcherProgram(program, o, y);
  };
}
//@ chunk-4nwcj4sh.js:5808-5920 placement
function tryCompileMatcher(e) {
  try {
    let n = CHAR_CLASS_ESCAPES * (e.length + 1);
    return {
      test: compileMatcher(parseMatcherSequence(e), n),
    };
  } catch (error) {
    if (error instanceof MatcherGrammarError) return error.kind;
    throw error;
  }
}
//@ chunk-4nwcj4sh.js:5920-5981 placement
function compileMatcherSafe(e) {
  let n = tryCompileMatcher(e);
  return typeof n === "object" ? n : undefined;
}
//@ chunk-4nwcj4sh.js:5981-6018 placement
/**
 * matcher 语法限制常量：最大长度、目标字符上限、步数上限与集合大小上限。
 */
var MAX_MATCHER_LENGTH = 2048;
var MAX_MATCH_TARGET_CHARS = 512;
var MAX_MATCHER_STEPS = 1024;
var MAX_MATCHER_SET_SIZE = 16384;
//@ chunk-4nwcj4sh.js:6018-6043 placement
/**
 * 云会话中无法测试某 matcher 时抛出的错误。
 */
class MatcherUnsupportableError extends Error {}
//@ chunk-4nwcj4sh.js:6043-6183 placement
function classifyUnreadableMatcher(e) {
  if (e.length > MAX_MATCHER_LENGTH) return "too_long";
  let n = compileMatcherSafe(e);
  if (n !== undefined) return n;
  try {
    new RegExp(e);
    return "not_read";
  } catch {
    return "invalid";
  }
}
//@ chunk-4nwcj4sh.js:6183-6631 placement
function checkHookMatcherForCloud(e) {
  if (!isDiskless()) return new RegExp(e);
  let n = classifyUnreadableMatcher(e);
  if (n === "invalid") throw SyntaxError("invalid hook matcher");
  if (typeof n === "string")
    throw new MatcherUnsupportableError(
      "This hook's matcher cannot be tested in a cloud session: it has to be rewritten.",
    );
  return {
    test(r) {
      if (r.length > MAX_MATCH_TARGET_CHARS)
        throw new MatcherUnsupportableError(
          `The name that this hook's matcher is tested against (for a tool call, the tool's name) has over ${MAX_MATCH_TARGET_CHARS} characters, more than a cloud session tests.`,
        );
      return n.test(r);
    },
  };
}
export {
  matcherTestTarget,
  MAX_MATCHER_SET_SIZE,
  MAX_MATCHER_STEPS,
  checkHookMatcherForCloud,
  MatcherUnsupportableError,
  mcpPermissionCeiling,
};
