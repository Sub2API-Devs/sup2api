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
var lqt = (e) => (e.mcpInfo?.effectiveMaxPermission === "ask" ? { ceiling: "ask" } : {});
//@ chunk-4nwcj4sh.js:444-495 placement
var KW = (e) => ({ tool: e.name, ceiling: lqt(e).ceiling });
//@ chunk-4nwcj4sh.js:495-558 placement
class g extends Error {
  kind;
  constructor(e) {
    super();
    this.kind = e;
  }
}
/**
 * 匹配器语法使用的字符区间（数字、单词字符等）。
 */
//@ chunk-4nwcj4sh.js:558-949 placement
var DIGIT_RANGES = [[48, 57]],
  WORD_CHAR_RANGES = [
    [48, 57],
    [65, 90],
    [95, 95],
    [97, 122],
  ],
  WHITESPACE_RANGES = [
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
  ],
  CHAR_CLASS_ESCAPES = {
    d: DIGIT_RANGES,
    D: complementRanges(DIGIT_RANGES),
    w: WORD_CHAR_RANGES,
    W: complementRanges(WORD_CHAR_RANGES),
    s: WHITESPACE_RANGES,
    S: complementRanges(WHITESPACE_RANGES),
  },
  DOT_RANGES = complementRanges([
    [10, 10],
    [13, 13],
    [8232, 8233],
  ]),
  ESCAPABLE_PUNCTUATION_RE = /^[ -/:-@[-`{-~]$/,
  QUANTIFIER_BRACES_RE = /^\{(\d+)(?:(,)(\d*))?\}/,
  NAMED_GROUP_NAME_RE = /^([A-Za-z_$][\w$]*)>/,
  CAPTURE_GROUP_RE = /\((?!\?)|\(\?<(?![=!])/,
  NAMED_CAPTURE_GROUP_RE = /\(\?<(?![=!])/,
  MAX_MATCHER_NODES = 100,
  V = 6,
  REGEX_META_CHARS = "^$\\.*+?()[]{}|";
//@ chunk-4nwcj4sh.js:949-1066 placement
function inRanges(e, n) {
  let r = 0,
    i = e.length;
  while (r < i) {
    let o = (r + i) >> 1;
    if (n > e[o][1]) r = o + 1;
    else i = o;
  }
  return r < e.length && n >= e[r][0];
}
//@ chunk-4nwcj4sh.js:1066-1179 placement
function complementRanges(e) {
  let n = [],
    r = 0;
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
    let at = n.at(-1);
    if (at !== void 0 && r <= at[1] + 1) at[1] = Math.max(at[1], i);
    else n.push([r, i]);
  }
  return n;
}
/**
 * 解析钩子 matcher 语法中的序列/二选一结构
 */
//@ chunk-4nwcj4sh.js:1337-3450 placement
function parseMatcherSequence(e) {
  let n = 0,
    r = 0,
    i = new Set();
  function o(s) {
    if (!e.startsWith(s, n)) return !1;
    return ((n += s.length), !0);
  }
  function y() {
    if (n >= e.length) throw new g("other");
    return e.charCodeAt(n++);
  }
  function d() {
    let s = [a()];
    while (o("|")) s.push(a());
    return { type: "either", options: s };
  }
  function a() {
    let s = [];
    while (n < e.length && e[n] !== "|" && e[n] !== ")") s.push(m());
    return { type: "sequence", items: s };
  }
  function m() {
    if (o("^")) return { type: "start" };
    if (o("$")) return { type: "end" };
    if (o("\\b")) return { type: "boundary" };
    if (o("\\B")) return { type: "notBoundary" };
    let s = h(),
      l = 0,
      u = 1 / 0;
    if (o("+")) l = 1;
    else if (o("?")) u = 1;
    else if (!o("*")) {
      let x = e[n] === "{" ? QUANTIFIER_BRACES_RE.exec(e.slice(n)) : null;
      if (x === null) return s;
      if (((n += x[0].length), (l = Number(x[1])), x[2] === void 0)) u = l;
      else if (x[3] !== "") u = Number(x[3]);
      if (u < l) throw new g("other");
    }
    return (o("?"), { type: "repeat", item: s, least: l, most: u });
  }
  function h() {
    if (o("(")) return S();
    if (o(".")) return { type: "set", set: DOT_RANGES };
    if (o("[")) return { type: "set", set: _() };
    if (o("\\")) {
      let s = k();
      return typeof s === "number" ? { type: "unit", unit: s } : { type: "set", set: s };
    }
    if (REGEX_META_CHARS.includes(e[n] ?? "")) throw new g("legacy_grammar");
    return { type: "unit", unit: y() };
  }
  function S() {
    if (++r > MAX_MATCHER_NODES) throw new g("too_large");
    let s;
    if (o("?=")) s = !1;
    else if (o("?!")) s = !0;
    else if (o("?<=") || o("?<!")) throw new g("look_behind");
    else if (o("?<")) {
      let u = NAMED_GROUP_NAME_RE.exec(e.slice(n))?.[1];
      if (u === void 0 || i.has(u)) throw new g("other");
      (i.add(u), (n += u.length + 1));
    } else if (e[n] === "?" && !o("?:")) throw new g("flags_group");
    let l = d();
    if (!o(")")) throw new g("other");
    return (r--, s === void 0 ? l : { type: "look", item: l, isNegative: s });
  }
  function k(s = !1) {
    let l = y(),
      fromCharCode = String.fromCharCode(l);
    if (Object.hasOwn(CHAR_CLASS_ESCAPES, fromCharCode)) return CHAR_CLASS_ESCAPES[fromCharCode];
    if (!ESCAPABLE_PUNCTUATION_RE.test(fromCharCode)) {
      let x = fromCharCode === "k" ? NAMED_CAPTURE_GROUP_RE : CAPTURE_GROUP_RE,
        p = !s && /[1-9k]/.test(fromCharCode) && x.test(e);
      throw new g(p ? "back_reference" : "escape");
    }
    return l;
  }
  function _() {
    let s = o("^"),
      l = [];
    while (!o("]")) {
      let u = o("\\") ? k(!0) : y(),
        x = e[n] === "-" && e[n + 1] !== "]";
      if (typeof u !== "number") {
        if (x) throw new g("legacy_grammar");
        l.push(...u);
        continue;
      }
      if (!x) {
        l.push([u, u]);
        continue;
      }
      n++;
      let p = o("\\") ? k(!0) : y();
      if (typeof p !== "number") throw new g("legacy_grammar");
      if (p < u) throw new g("other");
      l.push([u, p]);
    }
    return s ? complementRanges(mergeRanges(l)) : mergeRanges(l);
  }
  let w = d();
  if (n < e.length) throw new g("other");
  return w;
}
//@ chunk-4nwcj4sh.js:3450-3540 placement
var c = {
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
function M(e) {
  if (--e.left < 0) throw new g("too_large");
}
//@ chunk-4nwcj4sh.js:3593-3652 placement
function I(e) {
  return { room: e, ops: [], to: [], other: [], sets: [] };
}
//@ chunk-4nwcj4sh.js:3652-3751 placement
function b(e, n, r = 0, i) {
  return (M(e.room), e.to.push(r), e.other.push(0), e.sets.push(i), e.ops.push(n) - 1);
}
/**
 * 把匹配器语法树节点编译为匹配程序的指令（单元、集合、前瞻、分支等）。
 */
//@ chunk-4nwcj4sh.js:3751-4788 placement
function compileMatcherNode(node, program, r, i) {
  M(program.room);
  let { ops: ops, to: to, other: other } = program;
  switch (node.type) {
    case "unit":
      b(program, c.unit, node.unit);
      return;
    case "set":
      b(program, c.set, 0, node.set);
      return;
    case "start":
    case "end":
    case "boundary":
    case "notBoundary":
      b(program, c[node.type]);
      return;
    case "look": {
      let a = r.indexOf.get(node);
      if (a === void 0) {
        let m = I(program.room);
        (compileMatcherNode(node.item, m, r, !0),
          b(m, c.match),
          (a = r.list.push({ places: m, isNegative: node.isNegative }) - 1),
          r.indexOf.set(node, a));
      }
      b(program, c.look, a);
      return;
    }
    case "sequence":
      for (let a of i ? node.items.toReversed() : node.items) compileMatcherNode(a, program, r, i);
      return;
    case "either": {
      let a = [];
      for (let m of node.options.slice(0, -1)) {
        let h = b(program, c.split, ops.length + 1);
        (compileMatcherNode(m, program, r, i), a.push(b(program, c.jump)), (other[h] = ops.length));
      }
      compileMatcherNode(node.options.at(-1), program, r, i);
      for (let m of a) to[m] = ops.length;
      return;
    }
    case "repeat": {
      let a = ops.length;
      for (let h = 0; h < node.least; h++) ((a = ops.length), compileMatcherNode(node.item, program, r, i));
      if (node.most === 1 / 0) {
        if (node.least > 0) {
          let S = b(program, c.split, a);
          other[S] = ops.length;
          return;
        }
        let h = b(program, c.split, ops.length + 1);
        (compileMatcherNode(node.item, program, r, i), b(program, c.jump, h), (other[h] = ops.length));
        return;
      }
      let m = [];
      for (let least = node.least; least < node.most; least++)
        (m.push(b(program, c.split, ops.length + 1)), compileMatcherNode(node.item, program, r, i));
      for (let h of m) other[h] = ops.length;
    }
  }
}
/**
 * 以 NFA 模拟的方式执行编译后的 matcher 程序：逐字符推进状态集合，处理单元、字符集、行首/行尾、词边界与环视结果，返回是否匹配（或为环视填充每个位置的匹配表）。
 */
//@ chunk-4nwcj4sh.js:4788-5571 placement
function runMatcherProgram({ ops: ops, to: to, other: other, sets: sets }, input, y, captures) {
  let fill = new Int32Array(ops.length).fill(-1),
    int32Array = new Int32Array(ops.length),
    int32Array_2 = new Int32Array(ops.length),
    S = 0,
    k = 0,
    _ = captures === void 0 ? 0 : input.length;
  function w(s) {
    if (fill[s] !== _) ((fill[s] = _), (int32Array[S++] = s));
  }
  for (;;) {
    while (k > 0) w(int32Array_2[--k]);
    w(0);
    let s = _ > 0 ? input.charCodeAt(_ - 1) : -1,
      l = _ < input.length ? input.charCodeAt(_) : -1,
      u = captures === void 0 ? l : s,
      x = inRanges(WORD_CHAR_RANGES, s) !== inRanges(WORD_CHAR_RANGES, l);
    while (S > 0) {
      let p = int32Array[--S];
      switch (ops[p]) {
        case c.match:
          if (captures === void 0) return !0;
          captures[_] = 1;
          break;
        case c.unit:
          if (u === to[p]) int32Array_2[k++] = p + 1;
          break;
        case c.set:
          if (inRanges(sets[p], u)) int32Array_2[k++] = p + 1;
          break;
        case c.split:
          (w(other[p]), w(to[p]));
          break;
        case c.jump:
          w(to[p]);
          break;
        case c.start:
          if (s < 0) w(p + 1);
          break;
        case c.end:
          if (l < 0) w(p + 1);
          break;
        case c.boundary:
        case c.notBoundary:
          if (x === (ops[p] === c.boundary)) w(p + 1);
          break;
        default:
          if (y[to[p]][_] === 1) w(p + 1);
      }
    }
    if (u < 0) return !1;
    _ += captures === void 0 ? 1 : -1;
  }
}
/**
 * 把解析后的 matcher 语法树编译为线性指令程序（类 Thompson NFA），环视子表达式先单独编译；返回逐位置模拟执行的 test 函数，保证线性时间匹配。
 */
//@ chunk-4nwcj4sh.js:5571-5808 placement
function compileMatcher(e, n) {
  let r = I({ left: n }),
    i = { list: [], indexOf: new Map() };
  return (
    compileMatcherNode(e, r, i, !1),
    b(r, c.match),
    (o) => {
      let y = [];
      for (let d of i.list) {
        let uint8Array = new Uint8Array(o.length + 1);
        (runMatcherProgram(d.places, o, y, uint8Array),
          y.push(d.isNegative ? uint8Array.map((m) => 1 - m) : uint8Array));
      }
      return runMatcherProgram(r, o, y);
    }
  );
}
//@ chunk-4nwcj4sh.js:5808-5920 placement
function tryCompileMatcher(e) {
  try {
    let n = V * (e.length + 1);
    return { test: compileMatcher(parseMatcherSequence(e), n) };
  } catch (error) {
    if (error instanceof g) return error.kind;
    throw error;
  }
}
//@ chunk-4nwcj4sh.js:5920-5981 placement
function v(e) {
  let n = tryCompileMatcher(e);
  return typeof n === "object" ? n : void 0;
}
//@ chunk-4nwcj4sh.js:5981-6018 placement
var tt = 2048,
  D = 512,
  v6r = 1024,
  k6r = 16384;
//@ chunk-4nwcj4sh.js:6018-6043 placement
class xpe extends Error {}
//@ chunk-4nwcj4sh.js:6043-6183 placement
function classifyUnreadableMatcher(e) {
  if (e.length > tt) return "too_long";
  let n = v(e);
  if (n !== void 0) return n;
  try {
    return (new RegExp(e), "not_read");
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
    throw new xpe("This hook's matcher cannot be tested in a cloud session: it has to be rewritten.");
  return {
    test(r) {
      if (r.length > D)
        throw new xpe(
          `The name that this hook's matcher is tested against (for a tool call, the tool's name) has over ${D} characters, more than a cloud session tests.`,
        );
      return n.test(r);
    },
  };
}

export { KW, k6r, v6r, checkHookMatcherForCloud, xpe, lqt };
