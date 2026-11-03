/**
 * utils/bash/bashParser.ts
 *
 * 纯 TypeScript 实现的 bash 解析器（词法+递归下降），产出 tree-sitter-bash 形状的节点树，带节点数/超时预算与 AST 缓存；另混入少量 ast.ts 的声明命令检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/bashParser.ts
 * pieces: chunk-k5vy5m8c.js (94)
 * attribution: file-local 1, facade-exports 3, layout 19, fingerprint 64, callgraph-witnessed 6, callgraph-fingerprint 1
 */
import { ge } from "../identity.js";
import {
  isTinglyPearlEnabled,
  $dt,
  isCalmNautilusEnabled,
  isFoamyHeronEnabled,
  KPn,
} from "./bashParserFlags.js";

//@ chunk-k5vy5m8c.js:280-382 file-local
var MAX_NESTING_DEPTH = 50,
  MAX_PARSE_NODES = 50000,
  MAX_INPUT_BYTES = 67108864,
  MAX_CACHED_BYTES = MAX_INPUT_BYTES,
  bashParser = { parse: parseCached },
  MAX_CACHE_ENTRIES = 64,
  MAX_COMMAND_LENGTH = 1e4,
  MAX_SOURCE_LENGTH = 32000,
  parseCache = ge(new Map(), (e) => e.clear());
//@ chunk-k5vy5m8c.js:382-406 facade-exports
function getParserModule() {
  return bashParser;
}
//@ chunk-k5vy5m8c.js:406-489 layout
var SPECIAL_VARS = new Set(["?", "$", "@", "*", "#", "-", "!", "_"]),
  ZSH_PARAM_FLAG_CHARS = new Set(["#", "^", "=", "~", "+"]);
//@ chunk-k5vy5m8c.js:489-659 layout
function scanNonAsciiParamName(e, o) {
  let src = e.L.src,
    s = o;
  while (s < e.L.len && ZSH_PARAM_FLAG_CHARS.has(src[s])) s++;
  let i = !1;
  while (s < e.L.len) {
    let r = src[s];
    if (isIdentChar(r)) s++;
    else if (r >= "\x80") ((i = !0), s++);
    else break;
  }
  return i ? s : -1;
}
//@ chunk-k5vy5m8c.js:659-844 facade-exports = SHELL_KEYWORDS (0.799)
var DECL_KEYWORDS = new Set(["export", "declare", "typeset", "readonly", "local"]),
  SHELL_KEYWORDS = new Set([
    "if",
    "then",
    "elif",
    "else",
    "fi",
    "while",
    "until",
    "for",
    "in",
    "do",
    "done",
    "case",
    "esac",
    "function",
    "select",
  ]);
//@ chunk-k5vy5m8c.js:844-941 fingerprint = makeLexer (0.903)
function makeLexer(src) {
  return { src: src, len: src.length, i: 0, b: 0, heredocs: [], byteTable: null, zshCondParenDiff: !1 };
}
//@ chunk-k5vy5m8c.js:941-1078 fingerprint = advance (1)
function advance(L) {
  let code = L.src.charCodeAt(L.i);
  if ((L.i++, code < 128)) L.b++;
  else if (code < 2048) L.b += 2;
  else if (code >= 55296 && code <= 56319) ((L.b += 4), L.i++);
  else L.b += 3;
}
//@ chunk-k5vy5m8c.js:1078-1131 fingerprint = peek (1)
function peek(L, off = 0) {
  return L.i + off < L.len ? L.src[L.i + off] : "";
}
//@ chunk-k5vy5m8c.js:1131-1412 fingerprint = byteAt (1)
function byteAt(L, charIdx) {
  if (L.byteTable) return L.byteTable[charIdx];
  let uint32Array = new Uint32Array(L.len + 1),
    s = 0,
    i = 0;
  while (i < L.len) {
    uint32Array[i] = s;
    let code = L.src.charCodeAt(i);
    if (code < 128) (s++, i++);
    else if (code < 2048) ((s += 2), i++);
    else if (code >= 55296 && code <= 56319) ((uint32Array[i + 1] = s + 2), (s += 4), (i += 2));
    else ((s += 3), i++);
  }
  return ((uint32Array[L.len] = s), (L.byteTable = uint32Array), uint32Array[charIdx]);
}
//@ chunk-k5vy5m8c.js:1412-1645 layout
function isWordChar(e) {
  return (
    (e >= "a" && e <= "z") ||
    (e >= "A" && e <= "Z") ||
    (e >= "0" && e <= "9") ||
    e === "_" ||
    e === "/" ||
    e === "." ||
    e === "-" ||
    e === "+" ||
    e === ":" ||
    e === "@" ||
    e === "%" ||
    e === "," ||
    e === "~" ||
    e === "^" ||
    e === "?" ||
    e === "*" ||
    e === "!" ||
    e === "=" ||
    e === "[" ||
    e === "]" ||
    e >= "\x80"
  );
}
//@ chunk-k5vy5m8c.js:1645-1683 layout
function isWordStart(e) {
  return isWordChar(e) || e === "\\";
}
//@ chunk-k5vy5m8c.js:1683-1813 layout
function isWordBreak(e) {
  return (
    e === "" ||
    e === " " ||
    e === "\t" ||
    e ===
      `
` ||
    e === "\r" ||
    e === ";" ||
    e === "&" ||
    e === "|" ||
    e === "(" ||
    e === ")" ||
    e === "<" ||
    e === ">"
  );
}
//@ chunk-k5vy5m8c.js:1813-1850 layout
function isWordBreakNotParen(e) {
  return isWordBreak(e) && e !== "(";
}
//@ chunk-k5vy5m8c.js:1850-1911 layout
function isIdentStart(e) {
  return (e >= "a" && e <= "z") || (e >= "A" && e <= "Z") || e === "_";
}
//@ chunk-k5vy5m8c.js:1911-1953 layout
function isIdentChar(e) {
  return isIdentStart(e) || (e >= "0" && e <= "9");
}
//@ chunk-k5vy5m8c.js:1953-1989 callgraph-witnessed = isDigit (0)
function isDigit(c) {
  return c >= "0" && c <= "9";
}
//@ chunk-k5vy5m8c.js:1989-2048 layout
function isHexDigit(e) {
  return isDigit(e) || (e >= "a" && e <= "f") || (e >= "A" && e <= "F");
}
//@ chunk-k5vy5m8c.js:2048-2084 layout
function isBaseDigit(e) {
  return isIdentChar(e) || e === "@";
}
//@ chunk-k5vy5m8c.js:2084-2241 layout
function isHeredocDelimChar(e) {
  return (
    e !== "" &&
    e !== " " &&
    e !== "\t" &&
    e !==
      `
` &&
    e !== "<" &&
    e !== ">" &&
    e !== "|" &&
    e !== "&" &&
    e !== ";" &&
    e !== "(" &&
    e !== ")" &&
    e !== "'" &&
    e !== '"' &&
    e !== "`" &&
    e !== "\\"
  );
}
//@ chunk-k5vy5m8c.js:2241-2397 layout = peek (1)
function skipBlanks(e) {
  while (e.i < e.len) {
    let o = e.src[e.i];
    if (o === " " || o === "\t" || o === "\r") advance(e);
    else if (o === "\\")
      if (
        e.src[e.i + 1] ===
        `
`
      )
        (advance(e), advance(e));
      else break;
    else break;
  }
}
//@ chunk-k5vy5m8c.js:2397-2531 layout = peek (1)
function skipBlanksNoCR(e) {
  while (e.i < e.len) {
    let o = e.src[e.i];
    if (o === " " || o === "\t") advance(e);
    else if (
      o === "\\" &&
      e.src[e.i + 1] ===
        `
`
    )
      (advance(e), advance(e));
    else break;
  }
}
/**
 * 词法分析下一个 token（EOF/NEWLINE/COMMENT/OP/WORD/NUMBER…），cmd 上下文把 [ 视为运算符，arg 上下文视为单词字符。
 */
//@ chunk-k5vy5m8c.js:2531-6872 fingerprint = nextToken (0.968)
function nextToken(L, ctx = "arg") {
  skipBlanks(L);
  let start = L.b;
  if (L.i >= L.len) return { type: "EOF", value: "", start: start, end: start };
  let s = L.src[L.i],
    c1 = peek(L, 1),
    c2 = peek(L, 2);
  if (
    s ===
    `
`
  )
    return (
      advance(L),
      {
        type: "NEWLINE",
        value: `
`,
        start: start,
        end: L.b,
      }
    );
  if (s === "#") {
    let a = L.i > 0 ? L.src[L.i - 1] : "";
    if (a === "" || " \t\n;&|<>()`".includes(a)) {
      let si = L.i;
      while (
        L.i < L.len &&
        L.src[L.i] !==
          `
`
      )
        advance(L);
      return { type: "COMMENT", value: L.src.slice(si, L.i), start: start, end: L.b };
    }
  }
  if (s === "&" && c1 === "&")
    return (advance(L), advance(L), { type: "OP", value: "&&", start: start, end: L.b });
  if (s === "|" && c1 === "|")
    return (advance(L), advance(L), { type: "OP", value: "||", start: start, end: L.b });
  if (s === "|" && c1 === "&")
    return (advance(L), advance(L), { type: "OP", value: "|&", start: start, end: L.b });
  if (s === ";" && c1 === ";" && c2 === "&")
    return (advance(L), advance(L), advance(L), { type: "OP", value: ";;&", start: start, end: L.b });
  if (s === ";" && c1 === ";")
    return (advance(L), advance(L), { type: "OP", value: ";;", start: start, end: L.b });
  if (s === ";" && c1 === "&")
    return (advance(L), advance(L), { type: "OP", value: ";&", start: start, end: L.b });
  if (s === ">" && c1 === ">")
    return (advance(L), advance(L), { type: "OP", value: ">>", start: start, end: L.b });
  if (s === ">" && c1 === "&" && c2 === "-")
    return (advance(L), advance(L), advance(L), { type: "OP", value: ">&-", start: start, end: L.b });
  if (s === ">" && c1 === "&")
    return (advance(L), advance(L), { type: "OP", value: ">&", start: start, end: L.b });
  if (s === ">" && c1 === "|")
    return (advance(L), advance(L), { type: "OP", value: ">|", start: start, end: L.b });
  if (s === "&" && c1 === ">" && c2 === ">")
    return (advance(L), advance(L), advance(L), { type: "OP", value: "&>>", start: start, end: L.b });
  if (s === "&" && c1 === ">")
    return (advance(L), advance(L), { type: "OP", value: "&>", start: start, end: L.b });
  if (s === "<" && c1 === "<" && c2 === "<")
    return (advance(L), advance(L), advance(L), { type: "OP", value: "<<<", start: start, end: L.b });
  if (s === "<" && c1 === "<" && c2 === "-")
    return (advance(L), advance(L), advance(L), { type: "OP", value: "<<-", start: start, end: L.b });
  if (s === "<" && c1 === "<")
    return (advance(L), advance(L), { type: "OP", value: "<<", start: start, end: L.b });
  if (s === "<" && c1 === "&" && c2 === "-")
    return (advance(L), advance(L), advance(L), { type: "OP", value: "<&-", start: start, end: L.b });
  if (s === "<" && c1 === "&")
    return (advance(L), advance(L), { type: "OP", value: "<&", start: start, end: L.b });
  if (s === "<" && c1 === "(")
    return (advance(L), advance(L), { type: "LT_PAREN", value: "<(", start: start, end: L.b });
  if (s === ">" && c1 === "(")
    return (advance(L), advance(L), { type: "GT_PAREN", value: ">(", start: start, end: L.b });
  if (s === "(" && c1 === "(")
    return (advance(L), advance(L), { type: "OP", value: "((", start: start, end: L.b });
  if (s === ")" && c1 === ")")
    return (advance(L), advance(L), { type: "OP", value: "))", start: start, end: L.b });
  if (s === "|" || s === "&" || s === ";" || s === ">" || s === "<")
    return (advance(L), { type: "OP", value: s, start: start, end: L.b });
  if (s === "(" || s === ")") return (advance(L), { type: "OP", value: s, start: start, end: L.b });
  if (ctx === "cmd") {
    if (s === "[") {
      let a = !1,
        c = (u) => {
          while (L.src[u] === "\\")
            if (
              L.src[u + 1] ===
              `
`
            )
              ((u += 2), (a = !0));
            else if (
              L.src[u + 1] === "\r" &&
              L.src[u + 2] ===
                `
`
            )
              ((u += 3), (a = !0));
            else break;
          return u;
        },
        f = c(L.i + 1);
      if (L.src[f] === "[") {
        let u = c(f + 1);
        if (a && L.src[u] === "(") L.zshCondParenDiff = !0;
      }
    }
    if (
      s === "[" &&
      c1 === "[" &&
      (c2 === " " ||
        c2 === "\t" ||
        c2 ===
          `
` ||
        c2 === "" ||
        c2 === "(")
    ) {
      if (c2 === "(") L.zshCondParenDiff = !0;
      return (advance(L), advance(L), { type: "OP", value: "[[", start: start, end: L.b });
    }
    if (s === "[") return (advance(L), { type: "OP", value: "[", start: start, end: L.b });
    if (
      s === "{" &&
      (c1 === " " ||
        c1 === "\t" ||
        c1 ===
          `
`)
    )
      return (advance(L), { type: "OP", value: "{", start: start, end: L.b });
    if (s === "}") return (advance(L), { type: "OP", value: "}", start: start, end: L.b });
    if (s === "!" && (c1 === " " || c1 === "\t"))
      return (advance(L), { type: "OP", value: "!", start: start, end: L.b });
  }
  if (s === '"') return (advance(L), { type: "DQUOTE", value: '"', start: start, end: L.b });
  if (s === "'") {
    let si = L.i;
    advance(L);
    while (L.i < L.len && L.src[L.i] !== "'") advance(L);
    if (L.i < L.len) advance(L);
    return { type: "SQUOTE", value: L.src.slice(si, L.i), start: start, end: L.b };
  }
  if (s === "$") {
    if (c1 === "(" && c2 === "(")
      return (
        advance(L),
        advance(L),
        advance(L),
        { type: "DOLLAR_DPAREN", value: "$((", start: start, end: L.b }
      );
    if (c1 === "(")
      return (advance(L), advance(L), { type: "DOLLAR_PAREN", value: "$(", start: start, end: L.b });
    if (c1 === "{")
      return (advance(L), advance(L), { type: "DOLLAR_BRACE", value: "${", start: start, end: L.b });
    if (c1 === "'") {
      let si = L.i;
      (advance(L), advance(L));
      while (L.i < L.len && L.src[L.i] !== "'") {
        if (L.src[L.i] === "\\" && L.i + 1 < L.len) advance(L);
        advance(L);
      }
      if (L.i < L.len) advance(L);
      return { type: "ANSI_C", value: L.src.slice(si, L.i), start: start, end: L.b };
    }
    return (advance(L), { type: "DOLLAR", value: "$", start: start, end: L.b });
  }
  if (s === "`") return (advance(L), { type: "BACKTICK", value: "`", start: start, end: L.b });
  if (isDigit(s)) {
    let a = L.i;
    while (a < L.len && isDigit(L.src[a])) a++;
    let c = a < L.len ? L.src[a] : "";
    if (c === ">" || c === "<") {
      let si = L.i;
      while (L.i < a) advance(L);
      return { type: "WORD", value: L.src.slice(si, L.i), start: start, end: L.b };
    }
  }
  if (isWordStart(s) || s === "{" || s === "}") {
    let si = L.i;
    while (L.i < L.len) {
      let c = L.src[L.i];
      if (c === "\\") {
        if (L.i + 1 >= L.len) break;
        if (
          L.src[L.i + 1] ===
          `
`
        ) {
          (advance(L), advance(L));
          continue;
        }
        (advance(L), advance(L));
        continue;
      }
      if (!isWordChar(c) && c !== "{" && c !== "}" && c !== "#") break;
      advance(L);
    }
    if (L.i > si) {
      let sliced = L.src.slice(si, L.i);
      if (/^-?\d+$/.test(sliced)) return { type: "NUMBER", value: sliced, start: start, end: L.b };
      return { type: "WORD", value: sliced, start: start, end: L.b };
    }
  }
  return (advance(L), { type: "WORD", value: s, start: start, end: L.b });
}
/**
 * S_().parse 的实现：按命令文本缓存 AST（最多 64 条或总长 32000 字符，按最旧淘汰），缓存键还核对 tengu_tingly_pearl / tengu_calm_nautilus / tengu_foamy_heron 三个闸门的当前值；显式超时或超长时不走缓存。
 */
//@ chunk-k5vy5m8c.js:6872-7353 layout
function parseCached(e, o) {
  if (o !== void 0 || e.length > MAX_COMMAND_LENGTH) return parseSource(e, o);
  let t = isTinglyPearlEnabled() && !$dt(),
    s = isCalmNautilusEnabled(),
    i = isFoamyHeronEnabled(),
    r = parseCache.get(e);
  if (r !== void 0 && r.keywordRule === t && r.patternQuoteGuard === s && r.dollarOperandGuard === i) {
    if (r.root.keywordAfterPrefix) KPn();
    return r.root;
  }
  parseCache.delete(e);
  let a = parseSource(e);
  if (a !== null) {
    let c = e.length;
    for (let f of parseCache.keys()) c += f.length;
    for (let f of parseCache.keys()) {
      if (parseCache.size < MAX_CACHE_ENTRIES && c <= MAX_SOURCE_LENGTH) break;
      (parseCache.delete(f), (c -= f.length));
    }
    parseCache.set(e, { root: a, keywordRule: t, patternQuoteGuard: s, dollarOperandGuard: i });
  }
  return a;
}
/**
 * 纯 TS bash 解析主函数：建立 lexer 与解析状态（节点上限 50000、默认 50ms 超时、UTF-8 字节偏移），parseProgram 产出 tree-sitter-bash 形状的节点树；超时/超预算返回 null；检测到 zsh 花括号/条件括号/$ 操作数/关键字错位等分歧时把根包成 ERROR。
 */
//@ chunk-k5vy5m8c.js:7353-7887 fingerprint = parseSource (0.571)
function parseSource(source, timeoutMs) {
  let t = makeLexer(source),
    srcBytes = byteLengthUtf8(source);
  if (srcBytes >= MAX_CACHED_BYTES) return null;
  let i = {
    L: t,
    src: source,
    srcBytes: srcBytes,
    isAscii: srcBytes === source.length,
    nodeCount: 0,
    deadline: performance.now() + (timeoutMs ?? MAX_NESTING_DEPTH),
    aborted: !1,
    inBacktick: 0,
    inDquote: 0,
    stopToken: null,
    zshBraceDiff: source.includes("$\\\n"),
    dollarOperandDiff: !1,
    keywordDesync: !1,
  };
  try {
    let program = parseProgram(i);
    if (i.aborted) return null;
    if (i.zshBraceDiff || i.L.zshCondParenDiff || i.dollarOperandDiff || i.keywordDesync) {
      let a = mk(i, "ERROR", program.startIndex, program.endIndex, [program]);
      if (i.keywordDesync) return { ...a, keywordAfterPrefix: !0 };
      return a;
    }
    return program;
  } catch {
    return null;
  }
}
//@ chunk-k5vy5m8c.js:7887-8048 callgraph-fingerprint = byteLengthUtf8 (1)
function byteLengthUtf8(s_2) {
  let o = 0;
  for (let t = 0; t < s_2.length; t++) {
    let code = s_2.charCodeAt(t);
    if (code < 128) o++;
    else if (code < 2048) o += 2;
    else if (code >= 55296 && code <= 56319) ((o += 4), t++);
    else o += 3;
  }
  return o;
}
/**
 * 节点数超过 50000 或每 128 个节点检查一次超时，超出则标 aborted 并抛错中止解析。
 */
//@ chunk-k5vy5m8c.js:8048-8221 fingerprint = checkBudget (1)
function checkBudget(P) {
  if ((P.nodeCount++, P.nodeCount > MAX_PARSE_NODES)) throw ((P.aborted = !0), Error("budget"));
  if ((P.nodeCount & 127) === 0 && performance.now() > P.deadline) throw ((P.aborted = !0), Error("timeout"));
}
/**
 * 创建节点 {type, text, startIndex, endIndex, children}（偏移为 UTF-8 字节），同时计数检查预算。
 */
//@ chunk-k5vy5m8c.js:8221-8314 fingerprint = mk (1)
function mk(P, type, start, end, children) {
  return (
    checkBudget(P),
    { type: type, text: sliceBytes(P, start, end), startIndex: start, endIndex: end, children: children }
  );
}
/**
 * 检测 $name 或 ${...} 中变量名紧跟非 ASCII 字符：zsh 会把多字节字符算进变量名而 bash 不会，存在解析分歧。
 */
//@ chunk-k5vy5m8c.js:8314-8417 facade-exports
function hasZshMultibyteName(e) {
  return /\$(?:\{(?:\([^)}]{0,32}\))?)?[#^=~+!]*(?:[A-Za-z_]\w*)?[\u0080-\uffff]/.test(e);
}
//@ chunk-k5vy5m8c.js:8417-8694 fingerprint = sliceBytes (1)
function sliceBytes(P, startByte, endByte) {
  if (P.isAscii) return P.src.slice(startByte, endByte);
  let s = P.L;
  if (!s.byteTable) byteAt(s, 0);
  let byteTable = s.byteTable,
    lo = 0,
    hi = P.src.length;
  while (lo < hi) {
    let f = (lo + hi) >>> 1;
    if (byteTable[f] < startByte) lo = f + 1;
    else hi = f;
  }
  let sc = lo;
  ((lo = sc), (hi = P.src.length));
  while (lo < hi) {
    let f = (lo + hi) >>> 1;
    if (byteTable[f] < endByte) lo = f + 1;
    else hi = f;
  }
  return P.src.slice(sc, lo);
}
//@ chunk-k5vy5m8c.js:8694-8743 callgraph-witnessed = leaf (0)
function leaf(P, type, tok) {
  return mk(P, type, tok.start, tok.end, []);
}
/**
 * 解析整个程序：跳过前导空行，循环解析语句列表与注释，生成 program 节点。
 */
//@ chunk-k5vy5m8c.js:8743-9296 fingerprint = parseProgram (1)
function parseProgram(P) {
  let children = [];
  skipBlanks(P.L);
  while (!0) {
    let save = saveLex(P.L);
    if (nextToken(P.L, "cmd").type === "NEWLINE") {
      skipBlanks(P.L);
      continue;
    }
    restoreLex(P.L, save);
    break;
  }
  let progStart = P.L.b;
  while (P.L.i < P.L.len) {
    let save = saveLex(P.L),
      r = nextToken(P.L, "cmd");
    if (r.type === "EOF") break;
    if (r.type === "NEWLINE") continue;
    if (r.type === "COMMENT") {
      children.push(leaf(P, "comment", r));
      continue;
    }
    restoreLex(P.L, save);
    let stmts = parseStatements(P, null);
    for (let c of stmts) children.push(c);
    if (stmts.length === 0) {
      let errTok = nextToken(P.L, "cmd");
      if (errTok.type === "EOF") break;
      if (errTok.type === "OP" && errTok.value === ";;" && children.length > 0) continue;
      children.push(mk(P, "ERROR", errTok.start, errTok.end, []));
    }
  }
  let progEnd = children.length > 0 ? P.srcBytes : progStart;
  return mk(P, "program", progStart, progEnd, children);
}
//@ chunk-k5vy5m8c.js:9296-9328 fingerprint = saveLex (1)
function saveLex(L) {
  return L.b * MAX_INPUT_BYTES + L.i;
}
//@ chunk-k5vy5m8c.js:9328-9384 layout = saveLex (1)
function restoreLex(e, o) {
  let floored = Math.floor(o / MAX_INPUT_BYTES);
  ((e.i = o - floored * MAX_INPUT_BYTES), (e.b = floored));
}
/**
 * 解析语句序列直到 terminator：处理换行（触发 heredoc 正文扫描）、注释、; & 等分隔符。
 */
//@ chunk-k5vy5m8c.js:9384-10575 fingerprint = parseStatements (1)
function parseStatements(P, terminator) {
  let out = [];
  while (!0) {
    skipBlanks(P.L);
    let save = saveLex(P.L),
      i = nextToken(P.L, "cmd");
    if (i.type === "EOF") {
      restoreLex(P.L, save);
      break;
    }
    if (i.type === "NEWLINE") {
      if (P.L.heredocs.length > 0) scanHeredocBodies(P);
      continue;
    }
    if (i.type === "COMMENT") {
      out.push(leaf(P, "comment", i));
      continue;
    }
    if (terminator && i.type === "OP" && i.value === terminator) {
      restoreLex(P.L, save);
      break;
    }
    if (
      i.type === "OP" &&
      (i.value === ")" ||
        i.value === "}" ||
        i.value === ";;" ||
        i.value === ";&" ||
        i.value === ";;&" ||
        i.value === "))" ||
        i.value === "]]" ||
        i.value === "]")
    ) {
      restoreLex(P.L, save);
      break;
    }
    if (i.type === "BACKTICK" && P.inBacktick > 0) {
      restoreLex(P.L, save);
      break;
    }
    if (
      i.type === "WORD" &&
      (i.value === "then" ||
        i.value === "elif" ||
        i.value === "else" ||
        i.value === "fi" ||
        i.value === "do" ||
        i.value === "done" ||
        i.value === "esac")
    ) {
      restoreLex(P.L, save);
      break;
    }
    restoreLex(P.L, save);
    let stmt = parseAndOr(P);
    if (!stmt) break;
    (out.push(stmt), skipBlanks(P.L));
    let save2 = saveLex(P.L),
      sep = nextToken(P.L, "cmd");
    if (sep.type === "OP" && (sep.value === ";" || sep.value === "&")) {
      let save3 = saveLex(P.L),
        after = nextToken(P.L, "cmd");
      if (
        (restoreLex(P.L, save3),
        out.push(leaf(P, sep.value, sep)),
        after.type === "EOF" ||
          (after.type === "OP" &&
            (after.value === ")" ||
              after.value === "}" ||
              after.value === ";;" ||
              after.value === ";&" ||
              after.value === ";;&")) ||
          (after.type === "WORD" &&
            (after.value === "then" ||
              after.value === "elif" ||
              after.value === "else" ||
              after.value === "fi" ||
              after.value === "do" ||
              after.value === "done" ||
              after.value === "esac")))
      )
        continue;
    } else if (sep.type === "NEWLINE") {
      if (P.L.heredocs.length > 0) scanHeredocBodies(P);
      continue;
    } else restoreLex(P.L, save2);
  }
  return out;
}
/**
 * 解析 && / || 链为 list 节点；右侧是 redirected_statement 时调整节点结构以对齐 tree-sitter。
 */
//@ chunk-k5vy5m8c.js:10575-11107 fingerprint = parseAndOr (0.897)
function parseAndOr(P) {
  let left = parsePipeline(P);
  if (!left) return null;
  while (!0) {
    let save = saveLex(P.L),
      s = nextToken(P.L, "cmd");
    if (s.type === "OP" && (s.value === "&&" || s.value === "||")) {
      let op = leaf(P, s.value, s);
      skipNewlines(P);
      let right = parsePipeline(P);
      if (!right) {
        left = mk(P, "ERROR", left.startIndex, op.endIndex, [left, op]);
        break;
      }
      if (right.type === "redirected_statement" && right.children.length >= 2) {
        let a = right.children[0],
          redirs = right.children.slice(1),
          listNode = mk(P, "list", left.startIndex, a.endIndex, [left, op, a]),
          at = redirs.at(-1);
        left = mk(P, "redirected_statement", listNode.startIndex, at.endIndex, [listNode, ...redirs]);
      } else left = mk(P, "list", left.startIndex, right.endIndex, [left, op, right]);
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  return left;
}
//@ chunk-k5vy5m8c.js:11107-11195 fingerprint = skipNewlines (1)
function skipNewlines(P) {
  while (!0) {
    let save = saveLex(P.L);
    if (nextToken(P.L, "cmd").type !== "NEWLINE") {
      restoreLex(P.L, save);
      break;
    }
  }
}
/**
 * 解析 | / |& 管道。
 */
//@ chunk-k5vy5m8c.js:11195-11807 fingerprint = parsePipeline (1)
function parsePipeline(P) {
  let first = parseCommand(P);
  if (!first) return null;
  let parts = [first];
  while (!0) {
    let save = saveLex(P.L),
      r = nextToken(P.L, "cmd");
    if (r.type === "OP" && (r.value === "|" || r.value === "|&")) {
      let op = leaf(P, r.value, r);
      skipNewlines(P);
      let next = parseCommand(P);
      if (!next) {
        parts.push(op);
        break;
      }
      if (next.type === "redirected_statement" && next.children.length >= 2 && parts.length >= 1) {
        let f = next.children[0],
          redirs = next.children.slice(1),
          pipeKids = [...parts, op, f],
          pipeNode = mk(P, "pipeline", pipeKids[0].startIndex, f.endIndex, pipeKids),
          at = redirs.at(-1),
          wrapped = mk(P, "redirected_statement", pipeNode.startIndex, at.endIndex, [pipeNode, ...redirs]);
        ((parts.length = 0), parts.push(wrapped), (first = wrapped));
        continue;
      }
      parts.push(op, next);
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  if (parts.length === 1) return parts[0];
  let at = parts.at(-1);
  return mk(P, "pipeline", parts[0].startIndex, at.endIndex, parts);
}
/**
 * 解析一条命令：复合语句（if/while/for/case/function/子 shell/{}/[[ ]]/(( ))）、声明、unset 或简单命令，并附加重定向。
 */
//@ chunk-k5vy5m8c.js:11807-13993 fingerprint = parseCommand (1)
function parseCommand(P) {
  skipBlanks(P.L);
  let save = saveLex(P.L),
    t = nextToken(P.L, "cmd");
  if (t.type === "EOF") return (restoreLex(P.L, save), null);
  if (t.type === "OP" && t.value === "!") {
    let bang = leaf(P, "!", t),
      inner = parseCommand(P);
    if (!inner) return mk(P, "negated_command", bang.startIndex, bang.endIndex, [bang]);
    if (inner.type === "redirected_statement" && inner.children.length >= 2) {
      let r = inner.children[0],
        redirs = inner.children.slice(1),
        neg = mk(P, "negated_command", bang.startIndex, r.endIndex, [bang, r]),
        at = redirs.at(-1);
      return mk(P, "redirected_statement", neg.startIndex, at.endIndex, [neg, ...redirs]);
    }
    return mk(P, "negated_command", bang.startIndex, inner.endIndex, [bang, inner]);
  }
  if (t.type === "OP" && t.value === "(") {
    let open = leaf(P, "(", t),
      body = parseStatements(P, ")"),
      closeTok = nextToken(P.L, "cmd"),
      a =
        closeTok.type === "OP" && closeTok.value === ")"
          ? leaf(P, ")", closeTok)
          : mk(P, ")", open.endIndex, open.endIndex, []),
      node = mk(P, "subshell", open.startIndex, a.endIndex, [open, ...body, a]);
    return maybeRedirect(P, node);
  }
  if (t.type === "OP" && t.value === "((") {
    let open = leaf(P, "((", t),
      exprs = parseArithCommaList(P, "))", "var"),
      closeTok = nextToken(P.L, "cmd"),
      a = closeTok.value === "))" ? leaf(P, "))", closeTok) : mk(P, "))", open.endIndex, open.endIndex, []);
    return mk(P, "compound_statement", open.startIndex, a.endIndex, [open, ...exprs, a]);
  }
  if (t.type === "OP" && t.value === "{") {
    let open = leaf(P, "{", t),
      body = parseStatements(P, "}"),
      closeTok = nextToken(P.L, "cmd"),
      a =
        closeTok.type === "OP" && closeTok.value === "}"
          ? leaf(P, "}", closeTok)
          : mk(P, "}", open.endIndex, open.endIndex, []),
      node = mk(P, "compound_statement", open.startIndex, a.endIndex, [open, ...body, a]);
    return maybeRedirect(P, node);
  }
  if (t.type === "OP" && (t.value === "[" || t.value === "[[")) {
    let open = leaf(P, t.value, t),
      i = t.value === "[" ? "]" : "]]",
      exprSave = saveLex(P.L),
      expr = parseTestExpr(P, i);
    if ((skipBlanks(P.L), t.value === "[" && peek(P.L) !== "]")) {
      restoreLex(P.L, exprSave);
      let prevStop = P.stopToken;
      P.stopToken = "]";
      let rstmt = parseCommand(P);
      if (((P.stopToken = prevStop), rstmt && rstmt.type === "redirected_statement")) expr = rstmt;
      else (restoreLex(P.L, exprSave), (expr = parseTestExpr(P, i)));
      skipBlanks(P.L);
    }
    let c = saveLex(P.L),
      closeTok = nextToken(P.L, "arg"),
      close;
    if (closeTok.value === i && isWordBreakNotParen(peek(P.L))) close = leaf(P, i, closeTok);
    else (restoreLex(P.L, c), (close = mk(P, i, open.endIndex, open.endIndex, [])));
    let d = expr ? [open, expr, close] : [open, close];
    return maybeRedirect(P, mk(P, "test_command", open.startIndex, close.endIndex, d));
  }
  if (t.type === "WORD" && isWordBreak(peek(P.L))) {
    if (t.value === "if") return maybeRedirect(P, parseIf(P, t), !0);
    if (t.value === "while" || t.value === "until") return maybeRedirect(P, parseWhile(P, t), !0);
    if (t.value === "for") return maybeRedirect(P, parseFor(P, t), !0);
    if (t.value === "select") return maybeRedirect(P, parseFor(P, t), !0);
    if (t.value === "case") return maybeRedirect(P, parseCase(P, t), !0);
    if (t.value === "function") return parseFunction(P, t);
    if (DECL_KEYWORDS.has(t.value)) return maybeRedirect(P, parseDeclaration(P, t));
    if (t.value === "unset" || t.value === "unsetenv") {
      let s = saveLex(P.L);
      skipBlanks(P.L);
      let i = !1;
      if (peek(P.L) === "(") (nextToken(P.L, "cmd"), skipBlanks(P.L), (i = peek(P.L) === ")"));
      if ((restoreLex(P.L, s), !i)) return maybeRedirect(P, parseUnset(P, t));
    }
  }
  return (restoreLex(P.L, save), parseSimpleCommand(P));
}
/**
 * 解析简单命令：前缀赋值、命令名、参数、重定向混排。
 */
//@ chunk-k5vy5m8c.js:13993-17279 fingerprint = parseSimpleCommand (0.968)
function parseSimpleCommand(P) {
  let start = P.L.b,
    t = [],
    s = [];
  while (!0) {
    skipBlanks(P.L);
    let y = tryParseAssignment(P);
    if (y) {
      t.push(y);
      continue;
    }
    let _ = tryParseRedirect(P);
    if (_) {
      s.push(_);
      continue;
    }
    break;
  }
  skipBlanks(P.L);
  let save = saveLex(P.L),
    nameTok = nextToken(P.L, "cmd");
  if (
    nameTok.type === "EOF" ||
    nameTok.type === "NEWLINE" ||
    nameTok.type === "COMMENT" ||
    nameTok.type === "BACKTICK" ||
    (nameTok.type === "OP" && nameTok.value !== "{" && nameTok.value !== "[" && nameTok.value !== "[[") ||
    (nameTok.type === "WORD" && SHELL_KEYWORDS.has(nameTok.value) && nameTok.value !== "in")
  ) {
    if (
      (restoreLex(P.L, save),
      (t.length > 0 || s.length > 0) &&
        nameTok.type === "WORD" &&
        SHELL_KEYWORDS.has(nameTok.value) &&
        nameTok.value !== "in" &&
        isTinglyPearlEnabled() &&
        !$dt())
    ) {
      let sorted = [...t, ...s].sort((_, k) => _.startIndex - k.startIndex);
      return ((P.keywordDesync = !0), KPn(), mk(P, "ERROR", start, sorted.at(-1).endIndex, sorted));
    }
    if (t.length === 1 && s.length === 0) return t[0];
    if (s.length > 0 && t.length === 0) {
      let at = s.at(-1);
      return mk(P, "redirected_statement", s[0].startIndex, at.endIndex, s);
    }
    if (t.length > 1 && s.length === 0) {
      let at = t.at(-1);
      return mk(P, "variable_assignments", t[0].startIndex, at.endIndex, t);
    }
    if (t.length > 0 || s.length > 0) {
      let all = [...t, ...s],
        at = all.at(-1);
      return mk(P, "command", start, at.endIndex, all);
    }
    return null;
  }
  restoreLex(P.L, save);
  let fnSave = saveLex(P.L),
    nm = parseWord(P, "cmd");
  if (nm && nm.type === "word") {
    skipBlanks(P.L);
    let y = !1;
    if (peek(P.L) === "(") {
      let _ = saveLex(P.L);
      (nextToken(P.L, "cmd"), skipBlanks(P.L), (y = peek(P.L) === ")"), restoreLex(P.L, _));
    }
    if (y) {
      let oTok = nextToken(P.L, "cmd");
      skipBlanks(P.L);
      let cTok = nextToken(P.L, "cmd"),
        oParen = leaf(P, "(", oTok),
        cParen = leaf(P, ")", cTok);
      (skipBlanks(P.L), skipNewlines(P));
      let body = parseCommand(P);
      if (body) {
        let bodyKids = [body];
        if (
          body.type === "redirected_statement" &&
          body.children.length >= 2 &&
          body.children[0].type === "compound_statement"
        )
          bodyKids = body.children;
        let at = bodyKids.at(-1);
        return mk(P, "function_definition", nm.startIndex, at.endIndex, [nm, oParen, cParen, ...bodyKids]);
      }
    }
  }
  restoreLex(P.L, fnSave);
  let nameArg = parseWord(P, "cmd");
  if (!nameArg) {
    if (t.length === 1) return t[0];
    return null;
  }
  let cmdName = mk(P, "command_name", nameArg.startIndex, nameArg.endIndex, [nameArg]),
    d = [],
    b = [],
    heredocRedirect = null;
  while (!0) {
    skipBlanks(P.L);
    let y = tryParseRedirect(P, !0);
    if (y) {
      if (y.type === "heredoc_redirect") heredocRedirect = y;
      else if (y.type === "herestring_redirect") d.push(y);
      else b.push(y);
      continue;
    }
    if (b.length > 0) break;
    if (P.stopToken === "]" && peek(P.L) === "]") break;
    let save2 = saveLex(P.L),
      pk = nextToken(P.L, "arg");
    if (
      pk.type === "EOF" ||
      pk.type === "NEWLINE" ||
      pk.type === "COMMENT" ||
      (pk.type === "OP" &&
        (pk.value === "|" ||
          pk.value === "|&" ||
          pk.value === "&&" ||
          pk.value === "||" ||
          pk.value === ";" ||
          pk.value === ";;" ||
          pk.value === ";&" ||
          pk.value === ";;&" ||
          pk.value === "&" ||
          pk.value === ")" ||
          pk.value === "}" ||
          pk.value === "))"))
    ) {
      restoreLex(P.L, save2);
      break;
    }
    restoreLex(P.L, save2);
    let arg = parseWord(P, "arg");
    if (!arg) {
      if (peek(P.L) === "(") {
        let oTok = nextToken(P.L, "cmd"),
          open = leaf(P, "(", oTok),
          body = parseStatements(P, ")"),
          Le = saveLex(P.L),
          cTok = nextToken(P.L, "cmd"),
          J;
        if (cTok.type === "OP" && cTok.value === ")") J = leaf(P, ")", cTok);
        else (restoreLex(P.L, Le), (J = mk(P, ")", open.endIndex, open.endIndex, [])));
        d.push(mk(P, "subshell", open.startIndex, J.endIndex, [open, ...body, J]));
        continue;
      }
      break;
    }
    if (arg.type === "word" && arg.text === "=") {
      d.push(mk(P, "ERROR", arg.startIndex, arg.endIndex, [arg]));
      continue;
    }
    if (
      (arg.type === "word" || arg.type === "concatenation") &&
      peek(P.L) === "(" &&
      P.L.b === arg.endIndex
    ) {
      d.push(mk(P, "ERROR", arg.startIndex, arg.endIndex, [arg]));
      continue;
    }
    d.push(arg);
  }
  let cmdChildren = [...t, ...s, cmdName, ...d],
    I = cmdChildren.length > 0 ? cmdChildren.at(-1).endIndex : cmdName.endIndex,
    cmdStart = cmdChildren[0].startIndex,
    cmd = mk(P, "command", cmdStart, I, cmdChildren);
  if (heredocRedirect) {
    scanHeredocBodies(P);
    let hd = P.L.heredocs.shift();
    if (hd && heredocRedirect.children.length >= 2) {
      let bodyNode = mk(
          P,
          "heredoc_body",
          hd.bodyStart,
          hd.bodyEnd,
          hd.quoted ? [] : parseHeredocBodyContent(P, hd.bodyStart, hd.bodyEnd),
        ),
        endNode = mk(P, "heredoc_end", hd.endStart, hd.endEnd, []);
      heredocRedirect = {
        type: heredocRedirect.type,
        text: sliceBytes(P, heredocRedirect.startIndex, hd.endEnd),
        startIndex: heredocRedirect.startIndex,
        endIndex: hd.endEnd,
        children: [...heredocRedirect.children, bodyNode, endNode],
      };
    }
    let allR = [...s, heredocRedirect, ...b],
      k = s.length > 0 ? Math.min(cmd.startIndex, s[0].startIndex) : cmd.startIndex;
    return mk(P, "redirected_statement", k, heredocRedirect.endIndex, [cmd, ...allR]);
  }
  if (b.length > 0) {
    let at = b.at(-1);
    return mk(P, "redirected_statement", cmd.startIndex, at.endIndex, [cmd, ...b]);
  }
  return cmd;
}
//@ chunk-k5vy5m8c.js:17279-17530 fingerprint = maybeRedirect (1)
function maybeRedirect(P, node, allowHerestring = !1) {
  let redirects = [];
  while (!0) {
    skipBlanks(P.L);
    let save = saveLex(P.L),
      a = tryParseRedirect(P);
    if (!a) break;
    if (a.type === "herestring_redirect" && !allowHerestring) {
      restoreLex(P.L, save);
      break;
    }
    redirects.push(a);
  }
  if (redirects.length === 0) return node;
  let at = redirects.at(-1);
  return mk(P, "redirected_statement", node.startIndex, at.endIndex, [node, ...redirects]);
}
//@ chunk-k5vy5m8c.js:17530-18546 fingerprint = tryParseAssignment (1)
function tryParseAssignment(P) {
  let save = saveLex(P.L);
  skipBlanks(P.L);
  let startB = P.L.b;
  if (!isIdentStart(peek(P.L))) return (restoreLex(P.L, save), null);
  while (isIdentChar(peek(P.L))) advance(P.L);
  let nameEnd = P.L.b,
    i = nameEnd;
  if (peek(P.L) === "[") {
    advance(P.L);
    let depth = 1;
    while (P.L.i < P.L.len && depth > 0) {
      let y = peek(P.L);
      if (y === "[") depth++;
      else if (y === "]") depth--;
      advance(P.L);
    }
    i = P.L.b;
  }
  let r = peek(P.L),
    c1 = peek(P.L, 1),
    op;
  if (r === "=" && c1 !== "=") op = "=";
  else if (r === "+" && c1 === "=") op = "+=";
  else return (restoreLex(P.L, save), null);
  let nameNode = mk(P, "variable_name", startB, nameEnd, []),
    u = nameNode;
  if (i > nameEnd) {
    let brOpen = mk(P, "[", nameEnd, nameEnd + 1, []),
      idx = parseSubscriptIndex(P, nameEnd + 1, i - 1),
      brClose = mk(P, "]", i - 1, i, []);
    u = mk(P, "subscript", startB, i, [nameNode, brOpen, idx, brClose]);
  }
  let opStart = P.L.b;
  if ((advance(P.L), op === "+=")) advance(P.L);
  let opEnd = P.L.b,
    opNode = mk(P, op, opStart, opEnd, []),
    val = null;
  if (peek(P.L) === "(") {
    let aoTok = nextToken(P.L, "cmd"),
      aOpen = leaf(P, "(", aoTok),
      elems = [aOpen];
    while (!0) {
      if ((skipBlanks(P.L), peek(P.L) === ")")) break;
      let D = parseWord(P, "arg");
      if (!D) break;
      elems.push(D);
    }
    let acTok = nextToken(P.L, "cmd"),
      N = acTok.value === ")" ? leaf(P, ")", acTok) : mk(P, ")", aOpen.endIndex, aOpen.endIndex, []);
    (elems.push(N), (val = mk(P, "array", aOpen.startIndex, N.endIndex, elems)));
  } else {
    let c2 = peek(P.L);
    if (
      c2 &&
      c2 !== " " &&
      c2 !== "\t" &&
      c2 !==
        `
` &&
      c2 !== ";" &&
      c2 !== "&" &&
      c2 !== "|" &&
      c2 !== ")" &&
      c2 !== "}"
    )
      val = parseWord(P, "arg");
  }
  let I = val ? [u, opNode, val] : [u, opNode],
    T = val ? val.endIndex : opEnd;
  return mk(P, "variable_assignment", startB, T, I);
}
//@ chunk-k5vy5m8c.js:18546-18999 fingerprint = parseSubscriptIndexInline (1)
function parseSubscriptIndexInline(P) {
  skipBlanks(P.L);
  let o = peek(P.L);
  if ((o === "@" || o === "*") && peek(P.L, 1) === "]") {
    let t = P.L.b;
    return (advance(P.L), mk(P, "word", t, P.L.b, []));
  }
  if (o === "(" && peek(P.L, 1) === "(") {
    let oStart = P.L.b;
    (advance(P.L), advance(P.L));
    let open = mk(P, "((", oStart, P.L.b, []),
      inner = parseArithExpr(P, "))", "var");
    skipBlanks(P.L);
    let close;
    if (peek(P.L) === ")" && peek(P.L, 1) === ")") {
      let cs = P.L.b;
      (advance(P.L), advance(P.L), (close = mk(P, "))", cs, P.L.b, [])));
    } else close = mk(P, "))", P.L.b, P.L.b, []);
    let kids = inner ? [open, inner, close] : [open, close];
    return mk(P, "compound_statement", open.startIndex, close.endIndex, kids);
  }
  return parseArithExpr(P, "]", "word");
}
//@ chunk-k5vy5m8c.js:18999-19383 fingerprint = parseSubscriptIndex (1)
function parseSubscriptIndex(P, startB, endB) {
  let text = sliceBytes(P, startB, endB);
  if (/^\d+$/.test(text)) return mk(P, "number", startB, endB, []);
  if (/^\$([a-zA-Z_]\w*)$/.exec(text)) {
    let dollar = mk(P, "$", startB, startB + 1, []),
      vn = mk(P, "variable_name", startB + 1, endB, []);
    return mk(P, "simple_expansion", startB, endB, [dollar, vn]);
  }
  if (text.length === 2 && text[0] === "$" && SPECIAL_VARS.has(text[1])) {
    let dollar = mk(P, "$", startB, startB + 1, []),
      vn = mk(P, "special_variable_name", startB + 1, endB, []);
    return mk(P, "simple_expansion", startB, endB, [dollar, vn]);
  }
  return mk(P, "word", startB, endB, []);
}
//@ chunk-k5vy5m8c.js:19383-19720 fingerprint = isRedirectLiteralStart (1)
function isRedirectLiteralStart(P) {
  let o = peek(P.L);
  if (
    o === "" ||
    o ===
      `
`
  )
    return !1;
  if (o === "|" || o === "&" || o === ";" || o === "(" || o === ")") return !1;
  if (o === "<" || o === ">") return peek(P.L, 1) === "(";
  if (isDigit(o)) {
    let t = P.L.i;
    while (t < P.L.len && isDigit(P.L.src[t])) t++;
    let after = t < P.L.len ? P.L.src[t] : "";
    if (after === ">" || after === "<") return !1;
  }
  if (o === "}") return !1;
  if (P.stopToken === "]" && o === "]") return !1;
  return !0;
}
/**
 * 尝试解析一个重定向（含 fd 前缀、{var}、>&、&>、<<、<<<、heredoc 登记）。
 */
//@ chunk-k5vy5m8c.js:19720-23489 fingerprint = tryParseRedirect (0.898)
function tryParseRedirect(P, greedy = !1) {
  let save = saveLex(P.L);
  skipBlanks(P.L);
  let fd = null;
  if (isDigit(peek(P.L))) {
    let startB = P.L.b,
      c = P.L.i;
    while (c < P.L.len && isDigit(P.L.src[c])) c++;
    let f = c < P.L.len ? P.L.src[c] : "";
    if (f === ">" || f === "<") {
      while (P.L.i < c) advance(P.L);
      fd = mk(P, "file_descriptor", startB, P.L.b, []);
    }
  }
  if (fd === null && peek(P.L) === "{") {
    let a = P.L.i + 1;
    if (a < P.L.len && /[A-Za-z_]/.test(P.L.src[a])) {
      while (a < P.L.len && /[A-Za-z0-9_]/.test(P.L.src[a])) a++;
      if (P.L.src[a] === "[") {
        let c = 0,
          f = !1,
          u = !1;
        while (a < P.L.len) {
          let d = P.L.src[a];
          if (f) {
            if (d === "'") f = !1;
          } else if (u) {
            if (d === "\\" && a + 1 < P.L.len) a++;
            else if (d === '"') u = !1;
          } else if (d === "\\" && a + 1 < P.L.len) a++;
          else if (d === "'") f = !0;
          else if (d === '"') u = !0;
          else if (d === "[") c++;
          else if (d === "]") {
            if ((c--, c === 0)) {
              a++;
              break;
            }
          } else if (
            d === "\\" &&
            P.L.src[a + 1] ===
              `
`
          ) {
            a += 2;
            continue;
          } else if (
            d ===
            `
`
          )
            break;
          a++;
        }
      }
      if (P.L.src[a] === "}") {
        let c = a + 1 < P.L.len ? P.L.src[a + 1] : "";
        if (c === ">" || c === "<") {
          let f = P.L.b;
          while (P.L.i <= a) advance(P.L);
          fd = mk(P, "variable_name", f, P.L.b, []);
        }
      }
    }
  }
  let i = nextToken(P.L, "arg");
  if (i.type !== "OP") return (restoreLex(P.L, save), null);
  let r = i.value;
  if (r === "<<<") {
    let op = leaf(P, "<<<", i);
    skipBlanks(P.L);
    let target = parseWord(P, "arg"),
      f = target ? target.endIndex : op.endIndex,
      u = target ? [op, target] : [op];
    return mk(P, "herestring_redirect", fd ? fd.startIndex : op.startIndex, f, fd ? [fd, ...u] : u);
  }
  if (r === "<<" || r === "<<-") {
    let op = leaf(P, r, i);
    skipBlanksNoCR(P.L);
    let dStart = P.L.b,
      f = !1,
      delim = "",
      dc = peek(P.L);
    if (dc === "'" || dc === '"') {
      ((f = !0), advance(P.L));
      while (P.L.i < P.L.len && peek(P.L) !== dc) ((delim += peek(P.L)), advance(P.L));
      if (P.L.i < P.L.len) advance(P.L);
    } else if (dc === "\\") {
      if (
        ((f = !0),
        advance(P.L),
        P.L.i < P.L.len &&
          peek(P.L) !==
            `
`)
      )
        ((delim += peek(P.L)), advance(P.L));
      while (P.L.i < P.L.len && isIdentChar(peek(P.L))) ((delim += peek(P.L)), advance(P.L));
    } else while (P.L.i < P.L.len && isHeredocDelimChar(peek(P.L))) ((delim += peek(P.L)), advance(P.L));
    let dEnd = P.L.b;
    if (dc === '"' && /[`$\\\n]/.test(delim))
      throw ((P.aborted = !0), Error("heredoc delimiter contains substitution/escape chars"));
    if (P.L.i < P.L.len) {
      let T = peek(P.L);
      if (
        T !== " " &&
        T !== "\t" &&
        T !==
          `
` &&
        T !== "<" &&
        T !== ">" &&
        T !== "|" &&
        T !== "&" &&
        T !== ";" &&
        T !== "(" &&
        T !== ")"
      )
        throw ((P.aborted = !0), Error("heredoc delimiter word continues past scanned segment"));
    }
    if (/[\uD800-\uDFFF]/.test(delim))
      throw ((P.aborted = !0), Error("heredoc delimiter contains astral/surrogate code unit"));
    let startNode = mk(P, "heredoc_start", dStart, dEnd, []);
    P.L.heredocs.push({
      delim: delim,
      stripTabs: r === "<<-",
      quoted: f,
      bodyStart: 0,
      bodyEnd: 0,
      endStart: 0,
      endEnd: 0,
    });
    let h = fd ? [fd, op, startNode] : [op, startNode],
      I = fd ? fd.startIndex : op.startIndex;
    while (!0) {
      skipBlanks(P.L);
      let tc = peek(P.L);
      if (
        tc ===
          `
` ||
        tc === "" ||
        P.L.i >= P.L.len
      )
        break;
      if (tc === ">" || tc === "<" || isDigit(tc)) {
        let rSave = saveLex(P.L),
          k = tryParseRedirect(P);
        if (k && k.type === "file_redirect") {
          h.push(k);
          continue;
        }
        restoreLex(P.L, rSave);
      }
      if (tc === "|" && peek(P.L, 1) !== "|") {
        let _ = P.L.b;
        (advance(P.L), skipBlanks(P.L));
        let k = [];
        while (!0) {
          let cmd = parseCommand(P);
          if (!cmd) break;
          if ((k.push(cmd), skipBlanks(P.L), peek(P.L) === "|" && peek(P.L, 1) !== "|")) {
            let ps = P.L.b;
            (advance(P.L), k.push(mk(P, "|", ps, P.L.b, [])), skipBlanks(P.L));
            continue;
          }
          break;
        }
        if (k.length > 0) {
          let at = k.at(-1);
          h.push(mk(P, "pipeline", k[0].startIndex, at.endIndex, k));
        } else h.push(mk(P, "ERROR", _, P.L.b, []));
        continue;
      }
      if ((tc === "&" && peek(P.L, 1) === "&") || (tc === "|" && peek(P.L, 1) === "|")) {
        let _ = P.L.b;
        (advance(P.L), advance(P.L), skipBlanks(P.L));
        let rhs = parseCommand(P);
        if (rhs) h.push(rhs);
        else h.push(mk(P, "ERROR", _, P.L.b, []));
        continue;
      }
      if (tc === "&" || tc === ";" || tc === "(" || tc === ")") {
        let eStart = P.L.b;
        while (
          P.L.i < P.L.len &&
          peek(P.L) !==
            `
`
        )
          advance(P.L);
        h.push(mk(P, "ERROR", eStart, P.L.b, []));
        break;
      }
      let g = parseWord(P, "arg");
      if (g) {
        h.push(g);
        continue;
      }
      let eStart = P.L.b;
      while (
        P.L.i < P.L.len &&
        peek(P.L) !==
          `
`
      )
        advance(P.L);
      if (P.L.b > eStart) h.push(mk(P, "ERROR", eStart, P.L.b, []));
      break;
    }
    return mk(P, "heredoc_redirect", I, P.L.b, h);
  }
  if (r === "<&-" || r === ">&-") {
    let op = leaf(P, r, i),
      c = [];
    if (fd) c.push(fd);
    (c.push(op), skipBlanks(P.L));
    let dSave = saveLex(P.L),
      u = isRedirectLiteralStart(P) ? parseWord(P, "arg") : null;
    if (u) c.push(u);
    else restoreLex(P.L, dSave);
    let d = fd ? fd.startIndex : op.startIndex,
      b = u ? u.endIndex : op.endIndex;
    return mk(P, "file_redirect", d, b, c);
  }
  if (
    r === ">" ||
    r === ">>" ||
    r === ">&" ||
    r === ">|" ||
    r === "&>" ||
    r === "&>>" ||
    r === "<" ||
    r === "<&"
  ) {
    let op = leaf(P, r, i),
      c = [];
    if (fd) c.push(fd);
    c.push(op);
    let end = op.endIndex,
      u = 0;
    while (!0) {
      if ((skipBlanks(P.L), !isRedirectLiteralStart(P))) break;
      if (!greedy && u >= 1) break;
      let tc = peek(P.L),
        tc1 = peek(P.L, 1),
        target = null;
      if ((tc === "<" || tc === ">") && tc1 === "(") target = parseProcessSub(P);
      else target = parseWord(P, "arg");
      if (!target) break;
      (c.push(target), (end = target.endIndex), u++);
    }
    let d = fd ? fd.startIndex : op.startIndex;
    return mk(P, "file_redirect", d, end, c);
  }
  return (restoreLex(P.L, save), null);
}
//@ chunk-k5vy5m8c.js:23489-23791 fingerprint = parseProcessSub (1)
function parseProcessSub(P) {
  let o = peek(P.L);
  if ((o !== "<" && o !== ">") || peek(P.L, 1) !== "(") return null;
  let start = P.L.b;
  (advance(P.L), advance(P.L));
  let open = mk(P, o + "(", start, P.L.b, []),
    body = parseStatements(P, ")");
  skipBlanks(P.L);
  let close;
  if (peek(P.L) === ")") {
    let cs = P.L.b;
    (advance(P.L), (close = mk(P, ")", cs, P.L.b, [])));
  } else close = mk(P, ")", P.L.b, P.L.b, []);
  return mk(P, "process_substitution", start, close.endIndex, [open, ...body, close]);
}
/**
 * 在换行处扫描挂起的 heredoc 正文，回填 heredoc_body/heredoc_end 节点。
 */
//@ chunk-k5vy5m8c.js:23791-24702 fingerprint = scanHeredocBodies (0.838)
function scanHeredocBodies(P) {
  while (
    P.L.i < P.L.len &&
    P.L.src[P.L.i] !==
      `
`
  )
    advance(P.L);
  if (P.L.i < P.L.len) advance(P.L);
  for (let hd of P.L.heredocs) {
    hd.bodyStart = P.L.b;
    let delimLen = hd.delim.length;
    if (hd.stripTabs && hd.delim.startsWith("\t"))
      throw ((P.aborted = !0), Error("ambiguous heredoc terminator (<<- tab-prefixed delim)"));
    while (P.L.i < P.L.len) {
      let lineStart = P.L.i,
        lineStartB = P.L.b,
        r = lineStart;
      if (hd.stripTabs) while (r < P.L.len && P.L.src[r] === "\t") r++;
      if (P.L.src.startsWith(hd.delim, r)) {
        let a = r + delimLen,
          c = a < P.L.len ? P.L.src[a] : "";
        if (
          c === "" ||
          c ===
            `
` ||
          c === "\r"
        ) {
          hd.bodyEnd = lineStartB;
          while (P.L.i < r) advance(P.L);
          hd.endStart = P.L.b;
          for (let u = 0; u < delimLen; u++) advance(P.L);
          if (
            ((hd.endEnd = P.L.b),
            P.L.i < P.L.len &&
              P.L.src[P.L.i] ===
                `
`)
          )
            advance(P.L);
          return;
        }
        let f = a;
        while (f < P.L.len) {
          let u = P.L.src[f];
          if (
            u ===
            `
`
          )
            break;
          if (u === ")" || u === "`" || u === "}")
            throw ((P.aborted = !0), Error("ambiguous heredoc terminator (shell_eof_token)"));
          f++;
        }
      }
      while (
        P.L.i < P.L.len &&
        P.L.src[P.L.i] !==
          `
`
      )
        advance(P.L);
      if (P.L.i < P.L.len) advance(P.L);
    }
    ((hd.bodyEnd = P.L.b), (hd.endStart = P.L.b), (hd.endEnd = P.L.b));
  }
}
//@ chunk-k5vy5m8c.js:24702-25295 fingerprint = parseHeredocBodyContent (0.888)
function parseHeredocBodyContent(P, start, end) {
  let saved = saveLex(P.L);
  restoreLexToByte(P, start);
  let out = [],
    contentStart = P.L.b,
    a = !1;
  while (P.L.b < end) {
    let c = peek(P.L);
    if (c === "\\") {
      let nxt = peek(P.L, 1);
      if (nxt === "$" || nxt === "`" || nxt === "\\") {
        (advance(P.L), advance(P.L));
        continue;
      }
      advance(P.L);
      continue;
    }
    if (c === "$" || c === "`") {
      if (c === "$" && peek(P.L, 1) === "'") {
        advance(P.L);
        continue;
      }
      let preB = P.L.b;
      P.inDquote++;
      let exp = parseDollarLike(P);
      if (
        (P.inDquote--,
        exp &&
          (exp.type === "simple_expansion" ||
            exp.type === "expansion" ||
            exp.type === "command_substitution" ||
            exp.type === "arithmetic_expansion" ||
            exp.type === "ERROR"))
      ) {
        if (a && preB > contentStart) out.push(mk(P, "heredoc_content", contentStart, preB, []));
        (out.push(exp), (contentStart = P.L.b), (a = !0));
      }
      continue;
    }
    advance(P.L);
  }
  if (a) out.push(mk(P, "heredoc_content", contentStart, end, []));
  return (restoreLex(P.L, saved), out);
}
//@ chunk-k5vy5m8c.js:25295-25445 fingerprint = restoreLexToByte (1)
function restoreLexToByte(P, targetByte) {
  if (!P.L.byteTable) byteAt(P.L, 0);
  let byteTable = P.L.byteTable,
    lo = 0,
    hi = P.src.length;
  while (lo < hi) {
    let r = (lo + hi) >>> 1;
    if (byteTable[r] < targetByte) lo = r + 1;
    else hi = r;
  }
  ((P.L.i = lo), (P.L.b = targetByte));
}
/**
 * 解析一个词（裸词、引号串、$ 展开、反引号、花括号、拼接）。
 */
//@ chunk-k5vy5m8c.js:25445-26959 fingerprint = parseWord (1)
function parseWord(P, _ctx) {
  skipBlanks(P.L);
  let parts = [];
  while (P.L.i < P.L.len) {
    let r = peek(P.L);
    if (
      r === " " ||
      r === "\t" ||
      r ===
        `
` ||
      r === "\r" ||
      r === "" ||
      r === "|" ||
      r === "&" ||
      r === ";" ||
      r === "(" ||
      r === ")"
    )
      break;
    if (r === "<" || r === ">") {
      if (peek(P.L, 1) === "(") {
        let ps = parseProcessSub(P);
        if (ps) parts.push(ps);
        continue;
      }
      break;
    }
    if (r === '"') {
      parts.push(parseDoubleQuoted(P));
      continue;
    }
    if (r === "'") {
      let tok = nextToken(P.L, "arg");
      parts.push(leaf(P, "raw_string", tok));
      continue;
    }
    if (r === "$") {
      let c1 = peek(P.L, 1);
      if (c1 === "'") {
        let tok = nextToken(P.L, "arg");
        parts.push(leaf(P, "ansi_c_string", tok));
        continue;
      }
      if (c1 === '"') {
        let dTok = { type: "DOLLAR", value: "$", start: P.L.b, end: P.L.b + 1 };
        (advance(P.L), parts.push(leaf(P, "$", dTok)), parts.push(parseDoubleQuoted(P)));
        continue;
      }
      if (c1 === "`") {
        let u = { type: "DOLLAR", value: "$", start: P.L.b, end: P.L.b + 1 };
        (advance(P.L), parts.push(leaf(P, "$", u)));
        continue;
      }
      let exp = parseDollarLike(P);
      if (exp) parts.push(exp);
      continue;
    }
    if (r === "`") {
      if (P.inBacktick > 0) break;
      let bt = parseBacktick(P);
      parts.push(bt);
      continue;
    }
    if (r === "{") {
      let be = tryParseBraceExpr(P);
      if (be) {
        parts.push(be);
        continue;
      }
      let nc = peek(P.L, 1);
      if (
        nc === ";" ||
        nc === "|" ||
        nc === "&" ||
        nc ===
          `
` ||
        nc === "" ||
        nc === ")" ||
        nc === " " ||
        nc === "\t"
      ) {
        let bStart = P.L.b;
        (advance(P.L), parts.push(mk(P, "word", bStart, P.L.b, [])));
        continue;
      }
      let cat = tryParseBraceLikeCat(P);
      if (cat) {
        for (let d of cat) parts.push(d);
        continue;
      }
    }
    if (r === "}") {
      let bStart = P.L.b;
      (advance(P.L), parts.push(mk(P, "word", bStart, P.L.b, [])));
      continue;
    }
    if (r === "[" || r === "]") {
      let bStart = P.L.b;
      (advance(P.L), parts.push(mk(P, "word", bStart, P.L.b, [])));
      continue;
    }
    let frag = parseBareWord(P);
    if (!frag) break;
    if (
      frag.type === "word" &&
      /^-?(0x)?[0-9]+#$/.test(frag.text) &&
      peek(P.L) === "$" &&
      (peek(P.L, 1) === "{" || peek(P.L, 1) === "(")
    ) {
      let exp = parseDollarLike(P);
      if (exp) {
        parts.push(mk(P, "number", frag.startIndex, exp.endIndex, [exp]));
        continue;
      }
    }
    parts.push(frag);
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  let s = parts[0],
    at = parts.at(-1);
  return mk(P, "concatenation", s.startIndex, at.endIndex, parts);
}
//@ chunk-k5vy5m8c.js:26959-27431 fingerprint = parseBareWord (1)
function parseBareWord(P) {
  let start = P.L.b,
    startI = P.L.i;
  while (P.L.i < P.L.len) {
    let r = peek(P.L);
    if (r === "\\") {
      if (P.L.i + 1 >= P.L.len) break;
      if (
        P.L.src[P.L.i + 1] ===
        `
`
      )
        break;
      (advance(P.L), advance(P.L));
      continue;
    }
    if (
      r === " " ||
      r === "\t" ||
      r ===
        `
` ||
      r === "\r" ||
      r === "" ||
      r === "|" ||
      r === "&" ||
      r === ";" ||
      r === "(" ||
      r === ")" ||
      r === "<" ||
      r === ">" ||
      r === '"' ||
      r === "'" ||
      r === "$" ||
      r === "`" ||
      r === "{" ||
      r === "}" ||
      r === "[" ||
      r === "]"
    )
      break;
    advance(P.L);
  }
  if (P.L.b === start) return null;
  let text = P.src.slice(startI, P.L.i),
    type = /^-?\d+$/.test(text) ? "number" : "word";
  return mk(P, type, start, P.L.b, []);
}
//@ chunk-k5vy5m8c.js:27431-28102 fingerprint = tryParseBraceExpr (1)
function tryParseBraceExpr(P) {
  let save = saveLex(P.L);
  if (peek(P.L) !== "{") return null;
  let oStart = P.L.b;
  advance(P.L);
  let oEnd = P.L.b,
    p1Start = P.L.b;
  while (isDigit(peek(P.L)) || isIdentStart(peek(P.L))) advance(P.L);
  let p1End = P.L.b;
  if (p1End === p1Start || peek(P.L) !== "." || peek(P.L, 1) !== ".") return (restoreLex(P.L, save), null);
  let dotStart = P.L.b;
  (advance(P.L), advance(P.L));
  let dotEnd = P.L.b,
    p2Start = P.L.b;
  while (isDigit(peek(P.L)) || isIdentStart(peek(P.L))) advance(P.L);
  let p2End = P.L.b;
  if (p2End === p2Start || peek(P.L) !== "}") return (restoreLex(P.L, save), null);
  let cStart = P.L.b;
  advance(P.L);
  let cEnd = P.L.b,
    p1Text = sliceBytes(P, p1Start, p1End),
    p2Text = sliceBytes(P, p2Start, p2End),
    p1IsNum = /^\d+$/.test(p1Text),
    p2IsNum = /^\d+$/.test(p2Text);
  if (p1IsNum !== p2IsNum) return (restoreLex(P.L, save), null);
  if (!p1IsNum && (p1Text.length !== 1 || p2Text.length !== 1)) return (restoreLex(P.L, save), null);
  let g = p1IsNum ? "number" : "word",
    y = p2IsNum ? "number" : "word";
  return mk(P, "brace_expression", oStart, cEnd, [
    mk(P, "{", oStart, oEnd, []),
    mk(P, g, p1Start, p1End, []),
    mk(P, "..", dotStart, dotEnd, []),
    mk(P, y, p2Start, p2End, []),
    mk(P, "}", cStart, cEnd, []),
  ]);
}
//@ chunk-k5vy5m8c.js:28102-28833 fingerprint = tryParseBraceLikeCat (1)
function tryParseBraceLikeCat(P) {
  if (peek(P.L) !== "{") return null;
  let oStart = P.L.b;
  advance(P.L);
  let oEnd = P.L.b,
    inner = [mk(P, "word", oStart, oEnd, [])];
  while (P.L.i < P.L.len) {
    let bc = peek(P.L);
    if (
      bc === "}" ||
      bc ===
        `
` ||
      bc === ";" ||
      bc === "|" ||
      bc === "&" ||
      bc === " " ||
      bc === "\t" ||
      bc === "<" ||
      bc === ">" ||
      bc === "(" ||
      bc === ")"
    )
      break;
    if (bc === "[" || bc === "]") {
      let bStart = P.L.b;
      (advance(P.L), inner.push(mk(P, "word", bStart, P.L.b, [])));
      continue;
    }
    let midStart = P.L.b;
    while (P.L.i < P.L.len) {
      let mc = peek(P.L);
      if (mc === "\\" && P.L.i + 1 < P.L.len) {
        (advance(P.L), advance(P.L));
        continue;
      }
      if (
        mc === "}" ||
        mc ===
          `
` ||
        mc === ";" ||
        mc === "|" ||
        mc === "&" ||
        mc === " " ||
        mc === "\t" ||
        mc === "<" ||
        mc === ">" ||
        mc === "(" ||
        mc === ")" ||
        mc === "[" ||
        mc === "]"
      )
        break;
      advance(P.L);
    }
    let midEnd = P.L.b;
    if (midEnd > midStart) {
      let midText = sliceBytes(P, midStart, midEnd),
        midType = /^-?\d+$/.test(midText) ? "number" : "word";
      inner.push(mk(P, midType, midStart, midEnd, []));
    } else break;
  }
  if (peek(P.L) === "}") {
    let cStart = P.L.b;
    (advance(P.L), inner.push(mk(P, "word", cStart, P.L.b, [])));
  }
  return inner;
}
//@ chunk-k5vy5m8c.js:28833-29683 fingerprint = parseDoubleQuoted (0.926)
function parseDoubleQuoted(P) {
  let qStart = P.L.b;
  (advance(P.L), P.inDquote++);
  let qEnd = P.L.b,
    parts = [mk(P, '"', qStart, qEnd, [])],
    contentStart = P.L.b,
    contentStartI = P.L.i,
    flushContent = () => {
      if (P.L.b > contentStart) {
        let txt = P.src.slice(contentStartI, P.L.i);
        if (!/^[ \t]+$/.test(txt)) parts.push(mk(P, "string_content", contentStart, P.L.b, []));
      }
    };
  while (P.L.i < P.L.len) {
    let u = peek(P.L);
    if (u === '"') break;
    if (u === "\\" && P.L.i + 1 < P.L.len) {
      (advance(P.L), advance(P.L));
      continue;
    }
    if (
      u ===
      `
`
    ) {
      (flushContent(), advance(P.L), (contentStart = P.L.b), (contentStartI = P.L.i));
      continue;
    }
    if (u === "$") {
      let c1 = peek(P.L, 1);
      if (
        c1 === "(" ||
        c1 === "{" ||
        isIdentStart(c1) ||
        SPECIAL_VARS.has(c1) ||
        isDigit(c1) ||
        c1 >= "\x80" ||
        (ZSH_PARAM_FLAG_CHARS.has(c1) && scanNonAsciiParamName(P, P.L.i + 1) !== -1)
      ) {
        flushContent();
        let exp = parseDollarLike(P);
        if (exp) parts.push(exp);
        ((contentStart = P.L.b), (contentStartI = P.L.i));
        continue;
      }
      if (c1 !== '"' && c1 !== "") {
        flushContent();
        let dS = P.L.b;
        (advance(P.L),
          parts.push(mk(P, "$", dS, P.L.b, [])),
          (contentStart = P.L.b),
          (contentStartI = P.L.i));
        continue;
      }
    }
    if (u === "`") {
      flushContent();
      let bt = parseBacktick(P);
      (parts.push(bt), (contentStart = P.L.b), (contentStartI = P.L.i));
      continue;
    }
    advance(P.L);
  }
  flushContent();
  let close;
  if (peek(P.L) === '"') {
    let cStart = P.L.b;
    (advance(P.L), (close = mk(P, '"', cStart, P.L.b, [])));
  } else close = mk(P, '"', P.L.b, P.L.b, []);
  return (parts.push(close), P.inDquote--, mk(P, "string", qStart, close.endIndex, parts));
}
/**
 * 解析 $ 开头的结构：$var、${…}、$(…)、$((…))、$'…'、$"…"。
 */
//@ chunk-k5vy5m8c.js:29683-33849 fingerprint = parseDollarLike (0.813)
function parseDollarLike(P) {
  let c1 = peek(P.L, 1),
    dStart = P.L.b;
  if (c1 === "(" && peek(P.L, 2) === "(") {
    (advance(P.L), advance(P.L), advance(P.L));
    let open = mk(P, "$((", dStart, P.L.b, []),
      f = saveLex(P.L),
      exprs = parseArithCommaList(P, "))", "var");
    skipBlanks(P.L);
    let d,
      b = !1;
    if (peek(P.L) !== ")" || peek(P.L, 1) !== ")") (skipToArithStop(P, f, "))"), (b = !0));
    if (peek(P.L) === ")" && peek(P.L, 1) === ")") {
      let cStart = P.L.b;
      (advance(P.L), advance(P.L), (d = mk(P, "))", cStart, P.L.b, [])));
    } else d = mk(P, "))", P.L.b, P.L.b, []);
    return mk(P, b ? "ERROR" : "arithmetic_expansion", dStart, d.endIndex, [open, ...exprs, d]);
  }
  if (c1 === "[") {
    (advance(P.L), advance(P.L));
    let open = mk(P, "$[", dStart, P.L.b, []),
      f = saveLex(P.L),
      exprs = parseArithCommaList(P, "]", "var");
    skipBlanks(P.L);
    let d,
      b = !1;
    if (peek(P.L) !== "]") (skipToArithStop(P, f, "]"), (b = !0));
    if (peek(P.L) === "]") {
      let cStart = P.L.b;
      (advance(P.L), (d = mk(P, "]", cStart, P.L.b, [])));
    } else d = mk(P, "]", P.L.b, P.L.b, []);
    return mk(P, b ? "ERROR" : "arithmetic_expansion", dStart, d.endIndex, [open, ...exprs, d]);
  }
  if (c1 === "(") {
    (advance(P.L), advance(P.L));
    let open = mk(P, "$(", dStart, P.L.b, []),
      inDquote = P.inDquote;
    P.inDquote = 0;
    let body = parseStatements(P, ")");
    ((P.inDquote = inDquote), skipBlanks(P.L));
    let d,
      b = !1;
    if (peek(P.L) === ")") {
      let cStart = P.L.b;
      (advance(P.L), (d = mk(P, ")", cStart, P.L.b, [])));
    } else {
      ((b = !0), (P.zshBraceDiff = !0));
      let p = P.L.b,
        h = 1;
      while (P.L.i < P.L.len) {
        let I = peek(P.L);
        if (I === "\\" && P.L.i + 1 < P.L.len) {
          (advance(P.L), advance(P.L));
          continue;
        }
        if (I === '"' || I === "'") {
          if ((skipQuotedSpan(P, I), P.L.i < P.L.len)) advance(P.L);
          continue;
        }
        if (I === "`") {
          advance(P.L);
          while (P.L.i < P.L.len && peek(P.L) !== "`") {
            if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            advance(P.L);
          }
          if (P.L.i < P.L.len) advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "$") {
          (advance(P.L), advance(P.L));
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "'") {
          if ((skipQuotedSpan(P, "$'"), P.L.i < P.L.len)) advance(P.L);
          continue;
        }
        if (I === "(") h++;
        else if (I === ")") {
          if ((h--, h === 0)) break;
        }
        advance(P.L);
      }
      if ((body.push(mk(P, "ERROR", p, P.L.b, [])), peek(P.L) === ")")) {
        let I = P.L.b;
        (advance(P.L), (d = mk(P, ")", I, P.L.b, [])));
      } else d = mk(P, "ERROR", P.L.b, P.L.b, []);
    }
    if (
      !b &&
      body.length === 1 &&
      body[0].type === "redirected_statement" &&
      body[0].children.length === 1 &&
      body[0].children[0].type === "file_redirect"
    )
      body = [...body[0].children];
    return mk(P, b ? "ERROR" : "command_substitution", dStart, d.endIndex, [open, ...body, d]);
  }
  if (c1 === "{") {
    (advance(P.L), advance(P.L));
    let open = mk(P, "${", dStart, P.L.b, []),
      inner = parseExpansionBody(P),
      u,
      d = !1;
    while (
      peek(P.L) ===
      `
`
    )
      advance(P.L);
    if (peek(P.L) === "}") {
      let cStart = P.L.b;
      (advance(P.L), (u = mk(P, "}", cStart, P.L.b, [])));
    } else {
      ((d = !0), (P.zshBraceDiff = !0));
      let dEnd = P.L.b,
        p = 1;
      while (P.L.i < P.L.len) {
        let I = peek(P.L);
        if (I === "\\" && P.L.i + 1 < P.L.len) {
          (advance(P.L), advance(P.L));
          continue;
        }
        if (I === '"' || I === "'") {
          if ((skipQuotedSpan(P, I), P.L.i < P.L.len)) advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "(") {
          let T = 1;
          (advance(P.L), advance(P.L));
          while (P.L.i < P.L.len && T > 0) {
            let g = peek(P.L);
            if (g === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            else if (g === "$" && peek(P.L, 1) === "$") advance(P.L);
            else if (g === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
            else if (g === '"' || g === "'") skipQuotedSpan(P, g);
            else if (g === "`") {
              advance(P.L);
              while (P.L.i < P.L.len && peek(P.L) !== "`") {
                if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
                advance(P.L);
              }
            } else if (g === "(") T++;
            else if (g === ")") T--;
            advance(P.L);
          }
          continue;
        }
        if (I === "`") {
          advance(P.L);
          while (P.L.i < P.L.len && peek(P.L) !== "`") {
            if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            advance(P.L);
          }
          if (P.L.i < P.L.len) advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "$") {
          (advance(P.L), advance(P.L));
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "'") {
          if ((skipQuotedSpan(P, "$'"), P.L.i < P.L.len)) advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "{") (p++, advance(P.L));
        else if (I === "}") {
          if ((p--, p === 0)) break;
        }
        advance(P.L);
      }
      let h = mk(P, "ERROR", dEnd, P.L.b, []);
      if (peek(P.L) === "}") {
        let I = P.L.b;
        (advance(P.L), (u = mk(P, "}", I, P.L.b, [])));
      } else u = mk(P, "ERROR", P.L.b, P.L.b, []);
      inner.push(h);
    }
    if (!d && P.inDquote > 0 && sliceBytes(P, open.endIndex, u.startIndex).includes("'")) d = !0;
    if (!d && hasZshMultibyteName(sliceBytes(P, dStart, u.startIndex))) d = !0;
    if (/\\\n|\$\[|\$\{[ \t\n|]/.test(sliceBytes(P, open.endIndex, u.startIndex))) P.zshBraceDiff = !0;
    return mk(P, d || P.zshBraceDiff || P.dollarOperandDiff ? "ERROR" : "expansion", dStart, u.endIndex, [
      open,
      ...inner,
      u,
    ]);
  }
  if (c1 === "'") {
    if ((skipQuotedSpan(P, "$'"), peek(P.L) === "'")) advance(P.L);
    return mk(P, "ansi_c_string", dStart, P.L.b, []);
  }
  advance(P.L);
  let s = P.L.b,
    dollar = mk(P, "$", dStart, s, []),
    nc = peek(P.L);
  if (nc >= "\x80") {
    while (isIdentChar(peek(P.L)) || peek(P.L) >= "\x80") advance(P.L);
    return mk(P, "ERROR", dStart, P.L.b, []);
  }
  if (nc === "_" && !isIdentChar(peek(P.L, 1)) && peek(P.L, 1) < "\x80") {
    let vStart = P.L.b;
    advance(P.L);
    let vn = mk(P, "special_variable_name", vStart, P.L.b, []);
    return mk(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  if (isIdentStart(nc)) {
    let vStart = P.L.b;
    while (isIdentChar(peek(P.L))) advance(P.L);
    if (peek(P.L) >= "\x80") {
      while (isIdentChar(peek(P.L)) || peek(P.L) >= "\x80") advance(P.L);
      return mk(P, "ERROR", dStart, P.L.b, []);
    }
    let vn = mk(P, "variable_name", vStart, P.L.b, []);
    return mk(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  let a = nc === "#" && !ZSH_PARAM_FLAG_CHARS.has(peek(P.L, 1));
  if (ZSH_PARAM_FLAG_CHARS.has(nc) && !a) {
    let c = scanNonAsciiParamName(P, P.L.i);
    if (c !== -1) {
      while (P.L.i < c) advance(P.L);
      return mk(P, "ERROR", dStart, P.L.b, []);
    }
  }
  if (isDigit(nc)) {
    let vStart = P.L.b;
    advance(P.L);
    let vn = mk(P, "variable_name", vStart, P.L.b, []);
    return mk(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  if (SPECIAL_VARS.has(nc)) {
    let vStart = P.L.b;
    advance(P.L);
    let vn = mk(P, "special_variable_name", vStart, P.L.b, []);
    return mk(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  return dollar;
}
//@ chunk-k5vy5m8c.js:33849-36522 fingerprint = parseExpansionBody (0.958)
function parseExpansionBody(P_2) {
  let out = [];
  skipBlanks(P_2.L);
  {
    let c0 = peek(P_2.L),
      c1 = peek(P_2.L, 1);
    if (c0 === "#" && c1 === "!" && peek(P_2.L, 2) === "}") return (advance(P_2.L), advance(P_2.L), out);
    if (c0 === "!" && c1 === "#") {
      let c = 2;
      if (peek(P_2.L, c) === "#") c++;
      if (peek(P_2.L, c) === " ") c++;
      if (peek(P_2.L, c) === "}") {
        while (c-- > 0) advance(P_2.L);
        return out;
      }
    }
  }
  if (peek(P_2.L) === "#") {
    let r = P_2.L.b;
    (advance(P_2.L), out.push(mk(P_2, "#", r, P_2.L.b, [])));
  }
  let pc = peek(P_2.L);
  if ((pc === "!" || pc === "=" || pc === "~") && (isIdentStart(peek(P_2.L, 1)) || isDigit(peek(P_2.L, 1)))) {
    let r = P_2.L.b;
    (advance(P_2.L), out.push(mk(P_2, pc, r, P_2.L.b, [])));
  }
  if ((skipBlanks(P_2.L), isIdentStart(peek(P_2.L)))) {
    let r = P_2.L.b;
    while (isIdentChar(peek(P_2.L))) advance(P_2.L);
    out.push(mk(P_2, "variable_name", r, P_2.L.b, []));
  } else if (isDigit(peek(P_2.L))) {
    let r = P_2.L.b;
    while (isDigit(peek(P_2.L))) advance(P_2.L);
    out.push(mk(P_2, "variable_name", r, P_2.L.b, []));
  } else if (SPECIAL_VARS.has(peek(P_2.L))) {
    let r = P_2.L.b;
    (advance(P_2.L), out.push(mk(P_2, "special_variable_name", r, P_2.L.b, [])));
  }
  if (peek(P_2.L) === "[") {
    let at = out.at(-1),
      brOpen = P_2.L.b;
    advance(P_2.L);
    let brOpenNode = mk(P_2, "[", brOpen, P_2.L.b, []),
      idx = parseSubscriptIndexInline(P_2);
    skipBlanks(P_2.L);
    let brClose = P_2.L.b;
    if (peek(P_2.L) === "]") advance(P_2.L);
    let brCloseNode = mk(P_2, "]", brClose, P_2.L.b, []);
    if (at) {
      let b = idx ? [at, brOpenNode, idx, brCloseNode] : [at, brOpenNode, brCloseNode];
      out[out.length - 1] = mk(P_2, "subscript", at.startIndex, P_2.L.b, b);
    } else {
      let b = idx ? [brOpenNode, idx, brCloseNode] : [brOpenNode, brCloseNode];
      out.push(mk(P_2, "ERROR", brOpen, P_2.L.b, b));
    }
  }
  skipBlanks(P_2.L);
  let tc = peek(P_2.L);
  if ((tc === "*" || tc === "@") && peek(P_2.L, 1) === "}") {
    let r = P_2.L.b;
    return (advance(P_2.L), out.push(mk(P_2, tc, r, P_2.L.b, [])), out);
  }
  if (tc === "@" && isIdentStart(peek(P_2.L, 1))) {
    let r = P_2.L.b;
    (advance(P_2.L), out.push(mk(P_2, "@", r, P_2.L.b, [])));
    while (isIdentChar(peek(P_2.L))) advance(P_2.L);
    return out;
  }
  let i = peek(P_2.L);
  if (i === ":") {
    let c1 = peek(P_2.L, 1);
    if (c1 === "}") return (advance(P_2.L), out);
    if (c1 !== "-" && c1 !== "=" && c1 !== "?" && c1 !== "+") {
      (advance(P_2.L), skipBlanks(P_2.L));
      let offC = peek(P_2.L),
        c;
      if (offC === "-" && isDigit(peek(P_2.L, 1))) {
        let ns = P_2.L.b;
        advance(P_2.L);
        while (isDigit(peek(P_2.L))) advance(P_2.L);
        c = mk(P_2, "number", ns, P_2.L.b, []);
      } else c = parseArithExpr(P_2, ":}", "var");
      if (c) out.push(c);
      if ((skipBlanks(P_2.L), peek(P_2.L) === ":")) {
        (advance(P_2.L), skipBlanks(P_2.L));
        let lenC = peek(P_2.L),
          u;
        if (lenC === "-" && isDigit(peek(P_2.L, 1))) {
          let ns = P_2.L.b;
          advance(P_2.L);
          while (isDigit(peek(P_2.L))) advance(P_2.L);
          u = mk(P_2, "number", ns, P_2.L.b, []);
        } else u = parseArithExpr(P_2, "}", "var");
        if (u) out.push(u);
      }
      return out;
    }
  }
  if (
    i === ":" ||
    i === "#" ||
    i === "%" ||
    i === "/" ||
    i === "^" ||
    i === "," ||
    i === "-" ||
    i === "=" ||
    i === "?" ||
    i === "+"
  ) {
    let r = P_2.L.b,
      c1 = peek(P_2.L, 1),
      op = i;
    if (i === ":" && (c1 === "-" || c1 === "=" || c1 === "?" || c1 === "+"))
      (advance(P_2.L), advance(P_2.L), (op = i + c1));
    else if ((i === "#" || i === "%" || i === "/" || i === "^" || i === ",") && c1 === i)
      (advance(P_2.L), advance(P_2.L), (op = i + i));
    else advance(P_2.L);
    out.push(mk(P_2, op, r, P_2.L.b, []));
    let isPattern =
      op === "#" ||
      op === "##" ||
      op === "%" ||
      op === "%%" ||
      op === "/" ||
      op === "//" ||
      op === "^" ||
      op === "^^" ||
      op === "," ||
      op === ",,";
    if (op === "/" || op === "//") {
      let ac = peek(P_2.L);
      if (ac === "#" || ac === "%") {
        let aStart = P_2.L.b;
        (advance(P_2.L), out.push(mk(P_2, ac, aStart, P_2.L.b, [])));
      }
      if (peek(P_2.L) === '"') {
        out.push(parseDoubleQuoted(P_2));
        let tail = parseExpansionRest(P_2, "regex", !0);
        if (tail) out.push(tail);
      } else {
        let regex = parseExpansionRest(P_2, "regex", !0);
        if (regex) out.push(regex);
      }
      if (peek(P_2.L) === "/") {
        let sepStart = P_2.L.b;
        (advance(P_2.L), out.push(mk(P_2, "/", sepStart, P_2.L.b, [])));
        let repl = parseExpansionRest(P_2, "replword", !1);
        if (repl)
          if (
            repl.type === "concatenation" &&
            repl.children.length === 2 &&
            repl.children[0].type === "command_substitution"
          )
            (out.push(repl.children[0]), out.push(repl.children[1]));
          else out.push(repl);
      }
    } else if (op === "#" || op === "##" || op === "%" || op === "%%")
      for (let u of parseExpansionRegexSegmented(P_2)) out.push(u);
    else {
      let rest = parseExpansionRest(P_2, isPattern ? "regex" : "word", !1);
      if (rest) out.push(rest);
    }
  }
  return out;
}
//@ chunk-k5vy5m8c.js:36522-40380 fingerprint = parseExpansionRest (0.929)
function parseExpansionRest(P, nodeType, stopAtSlash) {
  let start = P.L.b;
  if (nodeType === "word" && peek(P.L) === "(") {
    advance(P.L);
    let elems = [mk(P, "(", start, P.L.b, [])];
    while (P.L.i < P.L.len) {
      skipBlanks(P.L);
      let d = peek(P.L);
      if (
        d === ")" ||
        d === "}" ||
        d ===
          `
` ||
        d === ""
      )
        break;
      let wStart = P.L.b;
      while (P.L.i < P.L.len) {
        let wc = peek(P.L);
        if (
          wc === ")" ||
          wc === "}" ||
          wc === " " ||
          wc === "\t" ||
          wc ===
            `
` ||
          wc === ""
        )
          break;
        if (wc === "\\" && P.L.i + 1 < P.L.len) {
          (advance(P.L), advance(P.L));
          continue;
        }
        if (wc === "$" && peek(P.L, 1) === "$") {
          (advance(P.L), advance(P.L));
          continue;
        }
        if (wc === "$" && peek(P.L, 1) === "'") {
          if ((skipQuotedSpan(P, "$'"), peek(P.L) === "'")) advance(P.L);
          continue;
        }
        if (wc === "$" && peek(P.L, 1) === "(") P.zshBraceDiff = !0;
        if (wc === '"' || wc === "'") {
          if ((skipQuotedSpan(P, wc), peek(P.L) === wc)) advance(P.L);
          continue;
        }
        if (wc === "`") {
          ((P.zshBraceDiff = !0), advance(P.L));
          while (P.L.i < P.L.len && peek(P.L) !== "`") {
            if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            advance(P.L);
          }
          if (peek(P.L) === "`") advance(P.L);
          continue;
        }
        if (wc === "{") P.zshBraceDiff = !0;
        advance(P.L);
      }
      if (P.L.b > wStart) elems.push(mk(P, "word", wStart, P.L.b, []));
      else break;
    }
    if (peek(P.L) === ")") {
      let cStart = P.L.b;
      (advance(P.L), elems.push(mk(P, ")", cStart, P.L.b, [])));
    }
    while (
      peek(P.L) ===
      `
`
    )
      advance(P.L);
    return mk(P, "array", start, P.L.b, elems);
  }
  if (nodeType === "regex") {
    while (P.L.i < P.L.len) {
      let u = peek(P.L);
      if (u === "{") P.zshBraceDiff = !0;
      if (u === "}") break;
      if (stopAtSlash && u === "/") break;
      if (u === "\\" && P.L.i + 1 < P.L.len) {
        (advance(P.L), advance(P.L));
        continue;
      }
      if (u === '"' || u === "'") {
        advance(P.L);
        let d = isCalmNautilusEnabled();
        while (P.L.i < P.L.len && peek(P.L) !== u) {
          if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) {
            if (u === "'" && d && peek(P.L, 1) === "'") P.zshBraceDiff = !0;
            advance(P.L);
          } else if (u === '"' && d && !P.zshBraceDiff) {
            if (peek(P.L) === "`") P.zshBraceDiff = !0;
            else if (peek(P.L) === "$") {
              let b = 1;
              while (
                peek(P.L, b) === "\\" &&
                peek(P.L, b + 1) ===
                  `
`
              )
                b += 2;
              let c1 = peek(P.L, b);
              if (c1 === "{" || c1 === "(" || c1 === "[") P.zshBraceDiff = !0;
            }
          }
          advance(P.L);
        }
        if (peek(P.L) === u) advance(P.L);
        continue;
      }
      if (u === "`") {
        ((P.zshBraceDiff = !0), advance(P.L));
        while (P.L.i < P.L.len && peek(P.L) !== "`") {
          if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
          advance(P.L);
        }
        if (peek(P.L) === "`") advance(P.L);
        continue;
      }
      if (u === "$") {
        let d = peek(P.L, 1);
        if (d === "$" && isFoamyHeronEnabled()) {
          let b = 2;
          while (peek(P.L, b) === "$") b++;
          if (b % 2 === 0 && peek(P.L, b) === "{") P.dollarOperandDiff = !0;
          for (let p = 1; p < b; p++) advance(P.L);
          continue;
        }
        if (d === "{") {
          let b = 0;
          (advance(P.L), advance(P.L), b++);
          while (P.L.i < P.L.len && b > 0) {
            let nc = peek(P.L);
            if (nc === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            else if (nc === "$" && peek(P.L, 1) === "$") advance(P.L);
            else if (nc === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
            else if (nc === '"' || nc === "'") skipQuotedSpan(P, nc);
            else if (nc === "`") {
              ((P.zshBraceDiff = !0), advance(P.L));
              while (P.L.i < P.L.len && peek(P.L) !== "`") {
                if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
                advance(P.L);
              }
            } else if (nc === "$" && peek(P.L, 1) === "{") (b++, advance(P.L));
            else if (nc === "$" && peek(P.L, 1) === "(") P.zshBraceDiff = !0;
            else if (nc === "{") P.zshBraceDiff = !0;
            else if (nc === "}") b--;
            advance(P.L);
          }
          continue;
        }
        if (d === "(") {
          P.zshBraceDiff = !0;
          let b = 0;
          (advance(P.L), advance(P.L), b++);
          while (P.L.i < P.L.len && b > 0) {
            let nc = peek(P.L);
            if (nc === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            else if (nc === "$" && peek(P.L, 1) === "$") advance(P.L);
            else if (nc === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
            else if (nc === '"' || nc === "'") skipQuotedSpan(P, nc);
            else if (nc === "`") {
              advance(P.L);
              while (P.L.i < P.L.len && peek(P.L) !== "`") {
                if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
                advance(P.L);
              }
            } else if (nc === "(") b++;
            else if (nc === ")") b--;
            advance(P.L);
          }
          continue;
        }
      }
      advance(P.L);
    }
    let end = P.L.b;
    if (end === start) return null;
    return mk(P, "regex", start, end, []);
  }
  let parts = [],
    segStart = P.L.b,
    flushSeg = () => {
      if (P.L.b > segStart) parts.push(mk(P, "word", segStart, P.L.b, []));
    };
  while (P.L.i < P.L.len) {
    let f = peek(P.L);
    if (f === "}") break;
    if (f === "{") P.zshBraceDiff = !0;
    if (stopAtSlash && f === "/") break;
    if (f === "\\" && P.L.i + 1 < P.L.len) {
      (advance(P.L), advance(P.L));
      continue;
    }
    let c1 = peek(P.L, 1);
    if (f === "$") {
      if (c1 === "{" || c1 === "(" || c1 === "[") {
        flushSeg();
        let exp = parseDollarLike(P);
        if (exp) parts.push(exp);
        segStart = P.L.b;
        continue;
      }
      if (c1 === "'") {
        flushSeg();
        let aStart = P.L.b;
        if ((skipQuotedSpan(P, "$'"), peek(P.L) === "'")) advance(P.L);
        (parts.push(mk(P, "ansi_c_string", aStart, P.L.b, [])), (segStart = P.L.b));
        continue;
      }
      if (isIdentStart(c1) || isDigit(c1) || SPECIAL_VARS.has(c1) || c1 >= "\x80") {
        flushSeg();
        let exp = parseDollarLike(P);
        if (exp) parts.push(exp);
        segStart = P.L.b;
        continue;
      }
    }
    if (f === '"') {
      (flushSeg(), parts.push(parseDoubleQuoted(P)), (segStart = P.L.b));
      continue;
    }
    if (f === "'") {
      flushSeg();
      let rStart = P.L.b;
      if ((skipQuotedSpan(P, f), peek(P.L) === "'")) advance(P.L);
      (parts.push(mk(P, "raw_string", rStart, P.L.b, [])), (segStart = P.L.b));
      continue;
    }
    if ((f === "<" || f === ">") && c1 === "(") {
      ((P.zshBraceDiff = !0), flushSeg());
      let ps = parseProcessSub(P);
      if (ps) parts.push(ps);
      segStart = P.L.b;
      continue;
    }
    if (f === "`") {
      flushSeg();
      let bt = parseBacktick(P);
      (parts.push(bt), (segStart = P.L.b));
      continue;
    }
    advance(P.L);
  }
  if ((flushSeg(), parts.length > 1 && parts[0].type === "word" && /^[ \t]+$/.test(parts[0].text)))
    parts.shift();
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  let at = parts.at(-1);
  return mk(P, "concatenation", parts[0].startIndex, at.endIndex, parts);
}
//@ chunk-k5vy5m8c.js:40380-42063 fingerprint = parseExpansionRegexSegmented (0.813)
function parseExpansionRegexSegmented(P) {
  let out = [],
    segStart = P.L.b,
    flushRegex = () => {
      if (P.L.b > segStart) out.push(mk(P, "regex", segStart, P.L.b, []));
    };
  while (P.L.i < P.L.len) {
    let i = peek(P.L);
    if (i === "}") break;
    if (i === "{") P.zshBraceDiff = !0;
    if (i === "\\" && P.L.i + 1 < P.L.len) {
      (advance(P.L), advance(P.L));
      continue;
    }
    if (i === '"') {
      (flushRegex(), out.push(parseDoubleQuoted(P)), (segStart = P.L.b));
      continue;
    }
    if (i === "'") {
      flushRegex();
      let rStart = P.L.b;
      advance(P.L);
      while (P.L.i < P.L.len && peek(P.L) !== "'") advance(P.L);
      if (peek(P.L) === "'") advance(P.L);
      (out.push(mk(P, "raw_string", rStart, P.L.b, [])), (segStart = P.L.b));
      continue;
    }
    if (i === "`") {
      ((P.zshBraceDiff = !0), advance(P.L));
      while (P.L.i < P.L.len && peek(P.L) !== "`") {
        if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
        advance(P.L);
      }
      if (peek(P.L) === "`") advance(P.L);
      continue;
    }
    if (i === "$") {
      let c1 = peek(P.L, 1);
      if (c1 === "$") {
        (advance(P.L), advance(P.L));
        continue;
      }
      if (c1 === "'") {
        flushRegex();
        let a = P.L.b;
        if ((skipQuotedSpan(P, "$'"), peek(P.L) === "'")) advance(P.L);
        (out.push(mk(P, "ansi_c_string", a, P.L.b, [])), (segStart = P.L.b));
        continue;
      }
      if (c1 === "{") {
        let a = 1;
        (advance(P.L), advance(P.L));
        while (P.L.i < P.L.len && a > 0) {
          let nc = peek(P.L);
          if (nc === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
          else if (nc === "$" && peek(P.L, 1) === "$") advance(P.L);
          else if (nc === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
          else if (nc === '"' || nc === "'") skipQuotedSpan(P, nc);
          else if (nc === "`") {
            ((P.zshBraceDiff = !0), advance(P.L));
            while (P.L.i < P.L.len && peek(P.L) !== "`") {
              if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
              advance(P.L);
            }
          } else if (nc === "$" && peek(P.L, 1) === "{") (a++, advance(P.L));
          else if (nc === "$" && peek(P.L, 1) === "(") P.zshBraceDiff = !0;
          else if (nc === "{") P.zshBraceDiff = !0;
          else if (nc === "}") a--;
          advance(P.L);
        }
        continue;
      }
      if (c1 === "(") {
        P.zshBraceDiff = !0;
        let a = 1;
        (advance(P.L), advance(P.L));
        while (P.L.i < P.L.len && a > 0) {
          let nc = peek(P.L);
          if (nc === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
          else if (nc === "$" && peek(P.L, 1) === "$") advance(P.L);
          else if (nc === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
          else if (nc === '"' || nc === "'") skipQuotedSpan(P, nc);
          else if (nc === "`") {
            advance(P.L);
            while (P.L.i < P.L.len && peek(P.L) !== "`") {
              if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
              advance(P.L);
            }
          } else if (nc === "(") a++;
          else if (nc === ")") a--;
          advance(P.L);
        }
        continue;
      }
    }
    advance(P.L);
  }
  return (flushRegex(), out);
}
//@ chunk-k5vy5m8c.js:42063-43368 fingerprint = parseBacktick (0.693)
function parseBacktick(P) {
  let start = P.L.b;
  advance(P.L);
  let open = mk(P, "`", start, P.L.b, []),
    s = P.L.i;
  {
    let u = !1;
    while (s < P.L.len) {
      let d = P.L.src[s];
      if (d === "\\") {
        let b = P.L.src[s + 1];
        if (b === "`" || b === "$" || b === "\\") u = !0;
        s += 2;
        continue;
      }
      if (d === "`") break;
      s++;
    }
    if (u) {
      let d = P.L.b;
      while (P.L.i < s) advance(P.L);
      let b = mk(P, "backtick_escape_unsupported", d, P.L.b, []),
        p;
      if (peek(P.L) === "`") {
        let h = P.L.b;
        (advance(P.L), (p = mk(P, "`", h, P.L.b, [])));
      } else p = mk(P, "`", P.L.b, P.L.b, []);
      return mk(P, "command_substitution", start, p.endIndex, [open, b, p]);
    }
  }
  P.inBacktick++;
  let inDquote = P.inDquote;
  P.inDquote = 0;
  let r = saveLex(P.L),
    heredocs = P.L.heredocs;
  P.L.heredocs = [];
  let body = [];
  while (!0) {
    if ((skipBlanks(P.L), peek(P.L) === "`" || peek(P.L) === "")) break;
    let save = saveLex(P.L),
      d = nextToken(P.L, "cmd");
    if (d.type === "EOF" || d.type === "BACKTICK") {
      restoreLex(P.L, save);
      break;
    }
    if (d.type === "NEWLINE") continue;
    restoreLex(P.L, save);
    let stmt = parseAndOr(P);
    if (!stmt) break;
    if ((body.push(stmt), skipBlanks(P.L), peek(P.L) === "`")) break;
    let save2 = saveLex(P.L),
      sep = nextToken(P.L, "cmd");
    if (sep.type === "OP" && (sep.value === ";" || sep.value === "&")) body.push(leaf(P, sep.value, sep));
    else if (sep.type !== "NEWLINE") restoreLex(P.L, save2);
  }
  if (((P.L.heredocs = heredocs), P.inBacktick--, (P.inDquote = inDquote), P.L.i !== s)) {
    restoreLex(P.L, r);
    while (P.L.i < s) advance(P.L);
    ((body.length = 0), body.push(mk(P, "backtick_body_overrun", open.endIndex, P.L.b, [])));
  }
  let f;
  if (peek(P.L) === "`") {
    let cStart = P.L.b;
    (advance(P.L), (f = mk(P, "`", cStart, P.L.b, [])));
  } else f = mk(P, "`", P.L.b, P.L.b, []);
  if (body.length === 0) body.push(mk(P, "backtick_body_empty", open.endIndex, P.L.b, []));
  return mk(P, "command_substitution", start, f.endIndex, [open, ...body, f]);
}
//@ chunk-k5vy5m8c.js:43368-43967 fingerprint = parseIf (1)
function parseIf(P, ifTok) {
  let ifKw = leaf(P, "if", ifTok),
    kids = [ifKw],
    cond = parseStatements(P, null);
  (kids.push(...cond), consumeKeyword(P, "then", kids));
  let body = parseStatements(P, null);
  kids.push(...body);
  while (!0) {
    let save = saveLex(P.L),
      f = nextToken(P.L, "cmd");
    if (f.type === "WORD" && f.value === "elif") {
      let eKw = leaf(P, "elif", f),
        eCond = parseStatements(P, null),
        eKids = [eKw, ...eCond];
      consumeKeyword(P, "then", eKids);
      let eBody = parseStatements(P, null);
      eKids.push(...eBody);
      let at = eKids.at(-1);
      kids.push(mk(P, "elif_clause", eKw.startIndex, at.endIndex, eKids));
    } else if (f.type === "WORD" && f.value === "else") {
      let elKw = leaf(P, "else", f),
        elBody = parseStatements(P, null),
        last = elBody.length > 0 ? elBody.at(-1) : elKw;
      kids.push(mk(P, "else_clause", elKw.startIndex, last.endIndex, [elKw, ...elBody]));
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  consumeKeyword(P, "fi", kids);
  let at = kids.at(-1);
  return mk(P, "if_statement", ifKw.startIndex, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:43967-44134 fingerprint = parseWhile (1)
function parseWhile(P, kwTok) {
  let kw = leaf(P, kwTok.value, kwTok),
    kids = [kw],
    cond = parseStatements(P, null);
  kids.push(...cond);
  let dg = parseDoGroup(P);
  if (dg) kids.push(dg);
  let at = kids.at(-1);
  return mk(P, "while_statement", kw.startIndex, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:44134-45635 fingerprint = parseFor (0.963)
function parseFor(P, forTok) {
  let forKw = leaf(P, forTok.value, forTok);
  if ((skipBlanks(P.L), forTok.value === "for" && peek(P.L) === "(" && peek(P.L, 1) === "(")) {
    let oStart = P.L.b;
    (advance(P.L), advance(P.L));
    let open = mk(P, "((", oStart, P.L.b, []),
      kids = [forKw, open];
    for (let _ = 0; _ < 3; _++) {
      skipBlanks(P.L);
      let es = parseArithCommaList(P, _ < 2 ? ";" : "))", "assign");
      if ((kids.push(...es), _ < 2)) {
        if (peek(P.L) === ";") {
          let N = P.L.b;
          (advance(P.L), kids.push(mk(P, ";", N, P.L.b, [])));
        }
      }
    }
    if ((skipBlanks(P.L), peek(P.L) === ")" && peek(P.L, 1) === ")")) {
      let cStart = P.L.b;
      (advance(P.L), advance(P.L), kids.push(mk(P, "))", cStart, P.L.b, [])));
    } else kids.push(mk(P, "))", P.L.b, P.L.b, []));
    let save = saveLex(P.L),
      sep = nextToken(P.L, "cmd");
    if (sep.type === "OP" && sep.value === ";") kids.push(leaf(P, ";", sep));
    else if (sep.type !== "NEWLINE") restoreLex(P.L, save);
    let dg = parseDoGroup(P);
    if (dg) kids.push(dg);
    else if ((skipNewlines(P), skipBlanks(P.L), peek(P.L) === "{")) {
      let bOpen = P.L.b;
      advance(P.L);
      let brace = mk(P, "{", bOpen, P.L.b, []),
        body = parseStatements(P, "}"),
        bClose;
      if (peek(P.L) === "}") {
        let cs = P.L.b;
        (advance(P.L), (bClose = mk(P, "}", cs, P.L.b, [])));
      } else bClose = mk(P, "}", P.L.b, P.L.b, []);
      kids.push(mk(P, "compound_statement", brace.startIndex, bClose.endIndex, [brace, ...body, bClose]));
    }
    let at = kids.at(-1);
    return mk(P, "c_style_for_statement", forKw.startIndex, at.endIndex, kids);
  }
  let kids = [forKw],
    varTok = nextToken(P.L, "arg");
  if (varTok.type === "WORD" && isIdentStart(varTok.value[0] ?? "") && [...varTok.value].every(isIdentChar))
    kids.push(mk(P, "variable_name", varTok.start, varTok.end, []));
  else kids.push(mk(P, "ERROR", varTok.start, varTok.end, []));
  skipBlanks(P.L);
  let save = saveLex(P.L),
    inTok = nextToken(P.L, "arg");
  if (inTok.type === "WORD" && inTok.value === "in") {
    kids.push(leaf(P, "in", inTok));
    while (!0) {
      skipBlanks(P.L);
      let b = peek(P.L);
      if (
        b === ";" ||
        b ===
          `
` ||
        b === ""
      )
        break;
      let p = parseWord(P, "arg");
      if (!p) break;
      kids.push(p);
    }
  } else restoreLex(P.L, save);
  let save2 = saveLex(P.L),
    sep = nextToken(P.L, "cmd");
  if (sep.type === "OP" && sep.value === ";") kids.push(leaf(P, ";", sep));
  else if (sep.type !== "NEWLINE") restoreLex(P.L, save2);
  let dg = parseDoGroup(P);
  if (dg) kids.push(dg);
  let at = kids.at(-1);
  return mk(P, "for_statement", forKw.startIndex, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:45635-45858 fingerprint = parseDoGroup (1)
function parseDoGroup(P) {
  skipNewlines(P);
  let save = saveLex(P.L),
    doTok = nextToken(P.L, "cmd");
  if (doTok.type !== "WORD" || doTok.value !== "do") return (restoreLex(P.L, save), null);
  let doKw = leaf(P, "do", doTok),
    body = parseStatements(P, null),
    kids = [doKw, ...body];
  consumeKeyword(P, "done", kids);
  let at = kids.at(-1);
  return mk(P, "do_group", doKw.startIndex, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:45858-46217 fingerprint = parseCase (1)
function parseCase(P, caseTok) {
  let caseKw = leaf(P, "case", caseTok),
    kids = [caseKw];
  skipBlanks(P.L);
  let word = parseWord(P, "arg");
  if (word) kids.push(word);
  (skipBlanks(P.L), consumeKeyword(P, "in", kids), skipNewlines(P));
  while (!0) {
    (skipBlanks(P.L), skipNewlines(P));
    let save = saveLex(P.L),
      c = nextToken(P.L, "arg");
    if (c.type === "WORD" && c.value === "esac") {
      kids.push(leaf(P, "esac", c));
      break;
    }
    if (c.type === "EOF") break;
    restoreLex(P.L, save);
    let item = parseCaseItem(P);
    if (!item) break;
    kids.push(item);
  }
  let at = kids.at(-1);
  return mk(P, "case_statement", caseKw.startIndex, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:46217-47332 fingerprint = parseCaseItem (1)
function parseCaseItem(P) {
  skipBlanks(P.L);
  let start = P.L.b,
    kids = [];
  if (peek(P.L) === "(") {
    let f = P.L.b;
    (advance(P.L), kids.push(mk(P, "(", f, P.L.b, [])));
  }
  let s = !0;
  while (!0) {
    skipBlanks(P.L);
    let f = peek(P.L);
    if (f === ")" || f === "") break;
    let pats = parseCasePattern(P);
    if (pats.length === 0) break;
    if (!s && pats.length > 1) {
      let rewritten = pats.map((h) =>
          h.type === "extglob_pattern" ? mk(P, "word", h.startIndex, h.endIndex, []) : h,
        ),
        b = rewritten[0],
        at = rewritten.at(-1);
      kids.push(mk(P, "concatenation", b.startIndex, at.endIndex, rewritten));
    } else kids.push(...pats);
    if (
      ((s = !1),
      skipBlanks(P.L),
      peek(P.L) === "\\" &&
        peek(P.L, 1) ===
          `
`)
    )
      (advance(P.L), advance(P.L), skipBlanks(P.L));
    if (peek(P.L) === "|") {
      let d = P.L.b;
      if (
        (advance(P.L),
        kids.push(mk(P, "|", d, P.L.b, [])),
        peek(P.L) === "\\" &&
          peek(P.L, 1) ===
            `
`)
      )
        (advance(P.L), advance(P.L));
    } else break;
  }
  if (peek(P.L) === ")") {
    let f = P.L.b;
    (advance(P.L), kids.push(mk(P, ")", f, P.L.b, [])));
  }
  let body = parseStatements(P, null);
  kids.push(...body);
  let save = saveLex(P.L),
    term = nextToken(P.L, "cmd");
  if (term.type === "OP" && (term.value === ";;" || term.value === ";&" || term.value === ";;&"))
    kids.push(leaf(P, term.value, term));
  else restoreLex(P.L, save);
  if (kids.length === 0) return null;
  if (body.length === 0)
    for (let f = 0; f < kids.length; f++) {
      let u = kids[f];
      if (u.type !== "extglob_pattern") continue;
      let text = sliceBytes(P, u.startIndex, u.endIndex);
      if (/^[-+?*@!][a-zA-Z]/.test(text) && !/[*?(]/.test(text))
        kids[f] = mk(P, "word", u.startIndex, u.endIndex, []);
    }
  let at = kids.at(-1);
  return mk(P, "case_item", start, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:47332-48218 fingerprint = parseCasePattern (1)
function parseCasePattern(P) {
  skipBlanks(P.L);
  let save = saveLex(P.L),
    start = P.L.b,
    startI = P.L.i,
    parenDepth = 0,
    r = !1,
    a = !1,
    c = !1;
  while (P.L.i < P.L.len) {
    let b = peek(P.L);
    if (b === "\\" && P.L.i + 1 < P.L.len) {
      (advance(P.L), advance(P.L));
      continue;
    }
    if (b === "$" && peek(P.L, 1) === "$") {
      ((r = !0), advance(P.L), advance(P.L));
      continue;
    }
    let p = b === "$" && peek(P.L, 1) === "'";
    if (b === '"' || b === "'" || p) {
      c = !0;
      let h = p ? "'" : b;
      if (p) advance(P.L);
      advance(P.L);
      while (P.L.i < P.L.len && peek(P.L) !== h) {
        if (b !== "'" && peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
        advance(P.L);
      }
      if (peek(P.L) === h) advance(P.L);
      continue;
    }
    if (b === "(") {
      (parenDepth++, advance(P.L));
      continue;
    }
    if (parenDepth > 0) {
      if (b === ")") {
        (parenDepth--, advance(P.L));
        continue;
      }
      if (
        b ===
        `
`
      )
        break;
      advance(P.L);
      continue;
    }
    if (
      b === ")" ||
      b === "|" ||
      b === " " ||
      b === "\t" ||
      b ===
        `
`
    )
      break;
    if (b === "$") r = !0;
    if (b === "[") a = !0;
    advance(P.L);
  }
  if (P.L.b === start) return [];
  let text = P.src.slice(startI, P.L.i),
    hasExtglobParen = /[*?+@!]\(/.test(text);
  if (c && !hasExtglobParen) return (restoreLex(P.L, save), parseCasePatternSegmented(P));
  if (!hasExtglobParen && (r || a)) {
    restoreLex(P.L, save);
    let b = parseWord(P, "arg");
    return b ? [b] : [];
  }
  let d = hasExtglobParen || /[*?]/.test(text) || /^[-+?*@!][a-zA-Z]/.test(text) ? "extglob_pattern" : "word";
  return [mk(P, d, start, P.L.b, [])];
}
//@ chunk-k5vy5m8c.js:48218-48677 fingerprint = parseCasePatternSegmented (1)
function parseCasePatternSegmented(P) {
  let parts = [],
    segStart = P.L.b,
    segStartI = P.L.i,
    flushSeg = () => {
      if (P.L.i > segStartI) {
        let sliced = P.src.slice(segStartI, P.L.i),
          type = /[*?]/.test(sliced) ? "extglob_pattern" : "word";
        parts.push(mk(P, type, segStart, P.L.b, []));
      }
    };
  while (P.L.i < P.L.len) {
    let r = peek(P.L);
    if (r === "\\" && P.L.i + 1 < P.L.len) {
      (advance(P.L), advance(P.L));
      continue;
    }
    if (r === '"') {
      (flushSeg(), parts.push(parseDoubleQuoted(P)), (segStart = P.L.b), (segStartI = P.L.i));
      continue;
    }
    if (r === "'") {
      flushSeg();
      let tok = nextToken(P.L, "arg");
      (parts.push(leaf(P, "raw_string", tok)), (segStart = P.L.b), (segStartI = P.L.i));
      continue;
    }
    if (
      r === ")" ||
      r === "|" ||
      r === " " ||
      r === "\t" ||
      r ===
        `
`
    )
      break;
    advance(P.L);
  }
  return (flushSeg(), parts);
}
//@ chunk-k5vy5m8c.js:48677-49148 fingerprint = parseFunction (0.97)
function parseFunction(P, fnTok) {
  let fnKw = leaf(P, "function", fnTok);
  skipBlanks(P.L);
  let nameTok = nextToken(P.L, "arg"),
    name = mk(P, "word", nameTok.start, nameTok.end, []),
    kids = [fnKw, name];
  if ((skipBlanks(P.L), peek(P.L) === "(" && peek(P.L, 1) === ")")) {
    let f = nextToken(P.L, "cmd");
    kids.push(leaf(P, "(", f));
    let u = P.L.b;
    (advance(P.L), kids.push(mk(P, ")", u, P.L.b, [])));
  }
  (skipBlanks(P.L), skipNewlines(P));
  let body = parseCommand(P);
  if (body)
    if (
      body.type === "redirected_statement" &&
      body.children.length >= 2 &&
      body.children[0].type === "compound_statement"
    )
      kids.push(...body.children);
    else kids.push(body);
  let at = kids.at(-1);
  return mk(P, "function_definition", fnKw.startIndex, at.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:49148-49959 fingerprint = parseDeclaration (0.917)
function parseDeclaration(P, kwTok) {
  let kw = leaf(P, kwTok.value, kwTok),
    kids = [kw],
    i = [];
  while (!0) {
    skipBlanks(P.L);
    let u = tryParseRedirect(P);
    if (u) {
      i.push(u);
      continue;
    }
    let d = peek(P.L);
    if (d === "(") {
      kids.push(mk(P, "variable_name", P.L.b, P.L.b + 1, []));
      break;
    }
    if (
      d === "" ||
      d ===
        `
` ||
      d === ";" ||
      d === "&" ||
      d === "|" ||
      d === ")" ||
      d === "<" ||
      d === ">"
    )
      break;
    let b = tryParseAssignment(P);
    if (b) {
      kids.push(b);
      continue;
    }
    if (d === '"' || d === "'" || d === "$") {
      let I = parseWord(P, "arg");
      if (I) {
        kids.push(I);
        continue;
      }
      break;
    }
    let save = saveLex(P.L),
      tok = nextToken(P.L, "arg");
    if (tok.type === "WORD" || tok.type === "NUMBER")
      if (tok.value.startsWith("-")) kids.push(leaf(P, "word", tok));
      else if (isIdentStart(tok.value[0] ?? "")) kids.push(mk(P, "variable_name", tok.start, tok.end, []));
      else kids.push(leaf(P, "word", tok));
    else {
      restoreLex(P.L, save);
      break;
    }
  }
  let at = kids.at(-1),
    a = mk(P, "declaration_command", kw.startIndex, at.endIndex, kids);
  if (i.length === 0) return a;
  let at_2 = i.at(-1),
    max = Math.max(a.endIndex, at_2.endIndex);
  return mk(P, "redirected_statement", kw.startIndex, max, [a, ...i]);
}
//@ chunk-k5vy5m8c.js:49959-50574 fingerprint = parseUnset (0.898)
function parseUnset(P, kwTok) {
  let kw = leaf(P, "unset", kwTok),
    kids = [kw],
    i = [];
  while (!0) {
    skipBlanks(P.L);
    let u = tryParseRedirect(P);
    if (u) {
      i.push(u);
      continue;
    }
    let d = peek(P.L);
    if (d === "(") {
      kids.push(mk(P, "variable_name", P.L.b, P.L.b + 1, []));
      break;
    }
    if (
      d === "" ||
      d ===
        `
` ||
      d === ";" ||
      d === "&" ||
      d === "|" ||
      d === ")" ||
      d === "<" ||
      d === ">"
    )
      break;
    let arg = parseWord(P, "arg");
    if (!arg) break;
    if (arg.type === "word")
      if (arg.text.startsWith("-")) kids.push(arg);
      else kids.push(mk(P, "variable_name", arg.startIndex, arg.endIndex, []));
    else kids.push(arg);
  }
  let at = kids.at(-1),
    a = mk(P, "unset_command", kw.startIndex, at.endIndex, kids);
  if (i.length === 0) return a;
  let at_2 = i.at(-1),
    max = Math.max(a.endIndex, at_2.endIndex);
  return mk(P, "redirected_statement", kw.startIndex, max, [a, ...i]);
}
//@ chunk-k5vy5m8c.js:50574-50688 fingerprint = consumeKeyword (1)
function consumeKeyword(P, name, kids) {
  skipNewlines(P);
  let save = saveLex(P.L),
    i = nextToken(P.L, "cmd");
  if (i.type === "WORD" && i.value === name) kids.push(leaf(P, name, i));
  else restoreLex(P.L, save);
}
//@ chunk-k5vy5m8c.js:50688-50720 layout
function parseTestExpr(e, o) {
  return parseTestOr(e, o);
}
//@ chunk-k5vy5m8c.js:50720-51018 fingerprint = parseTestOr (1)
function parseTestOr(P, closer) {
  let left = parseTestAnd(P, closer);
  if (!left) return null;
  while (!0) {
    skipBlanks(P.L);
    let save = saveLex(P.L);
    if (closer === "]]" && peek(P.L) === "|" && peek(P.L, 1) === "|") {
      let i = P.L.b;
      (advance(P.L), advance(P.L));
      let op = mk(P, "||", i, P.L.b, []);
      skipTestNewlinesAndComments(P, closer);
      let right = parseTestAnd(P, closer);
      if (!right) {
        restoreLex(P.L, save);
        break;
      }
      left = mk(P, "binary_expression", left.startIndex, right.endIndex, [left, op, right]);
    } else break;
  }
  return left;
}
//@ chunk-k5vy5m8c.js:51018-51316 layout = parseTestOr (1)
function parseTestAnd(P, closer) {
  let left = parseTestUnary(P, closer);
  if (!left) return null;
  while (!0) {
    skipBlanks(P.L);
    let save = saveLex(P.L);
    if (closer === "]]" && peek(P.L) === "&" && peek(P.L, 1) === "&") {
      let i = P.L.b;
      (advance(P.L), advance(P.L));
      let r = mk(P, "&&", i, P.L.b, []);
      skipTestNewlinesAndComments(P, closer);
      let right = parseTestUnary(P, closer);
      if (!right) {
        restoreLex(P.L, save);
        break;
      }
      left = mk(P, "binary_expression", left.startIndex, right.endIndex, [left, r, right]);
    } else break;
  }
  return left;
}
//@ chunk-k5vy5m8c.js:51316-51462 callgraph-witnessed = parseTestAnd (0.276)
function skipTestNewlinesAndComments(P, closer) {
  if ((skipBlanks(P.L), closer === "]]"))
    while (!0) {
      let t = peek(P.L);
      if (
        t ===
        `
`
      )
        (advance(P.L), skipBlanks(P.L));
      else if (t === "#")
        while (
          peek(P.L) &&
          peek(P.L) !==
            `
`
        )
          advance(P.L);
      else break;
    }
}
//@ chunk-k5vy5m8c.js:51462-51763 fingerprint = parseTestUnary (1)
function parseTestUnary(P, closer) {
  if ((skipTestNewlinesAndComments(P, closer), peek(P.L) === "(")) {
    let s = P.L.b;
    advance(P.L);
    let open = mk(P, "(", s, P.L.b, []),
      inner = parseTestOr(P, closer);
    skipBlanks(P.L);
    let close;
    if (peek(P.L) === ")") {
      let cs = P.L.b;
      (advance(P.L), (close = mk(P, ")", cs, P.L.b, [])));
    } else close = mk(P, ")", P.L.b, P.L.b, []);
    let kids = inner ? [open, inner, close] : [open, close];
    return mk(P, "parenthesized_expression", open.startIndex, close.endIndex, kids);
  }
  return parseTestBinary(P, closer);
}
//@ chunk-k5vy5m8c.js:51763-52712 fingerprint = parseTestNegatablePrimary (0.716)
function parseTestNegatablePrimary(P, closer) {
  skipTestNewlinesAndComments(P, closer);
  let t = peek(P.L),
    s = (i) =>
      i === " " ||
      i === "\t" ||
      i ===
        `
` ||
      i === "";
  if (t === "!" && (s(peek(P.L, 1)) || peek(P.L, 1) === "(")) {
    let i = P.L.b;
    advance(P.L);
    let bang = mk(P, "!", i, P.L.b, []),
      inner = parseTestNegatablePrimary(P, closer);
    if (!inner) return bang;
    return mk(P, "unary_expression", bang.startIndex, inner.endIndex, [bang, inner]);
  }
  if (t === "(") {
    let i = P.L.b;
    advance(P.L);
    let r = mk(P, "(", i, P.L.b, []),
      a = parseTestOr(P, closer);
    skipBlanks(P.L);
    let c;
    if (peek(P.L) === ")") {
      let u = P.L.b;
      (advance(P.L), (c = mk(P, ")", u, P.L.b, [])));
    } else c = mk(P, ")", P.L.b, P.L.b, []);
    let f = a ? [r, a, c] : [r, c];
    return mk(P, "parenthesized_expression", r.startIndex, c.endIndex, f);
  }
  if (t === "-" && isIdentStart(peek(P.L, 1))) {
    let i = saveLex(P.L),
      r = P.L.b;
    advance(P.L);
    while (isIdentChar(peek(P.L))) advance(P.L);
    if (!s(peek(P.L))) return (restoreLex(P.L, i), parseTestPrimary(P, closer));
    let op = mk(P, "test_operator", r, P.L.b, []),
      c = P.L.i;
    skipBlanks(P.L);
    let arg = parseTestPrimary(P, closer);
    if (!arg) {
      let sliced = P.src.slice(c, P.L.i);
      if (!/^(?:[ \t]|\\\n)*$/.test(sliced)) {
        let d = mk(P, "test_rhs_missing", op.endIndex, P.L.b, []);
        return mk(P, "unary_expression", op.startIndex, P.L.b, [op, d]);
      }
      return op;
    }
    return mk(P, "unary_expression", op.startIndex, arg.endIndex, [op, arg]);
  }
  return parseTestPrimary(P, closer);
}
//@ chunk-k5vy5m8c.js:52712-52840 layout = parseTestOr (0.828)
function makeMissingRhsBinary(e, o, t) {
  let s = mk(e, "test_rhs_missing", t.endIndex, e.L.b, []);
  return mk(e, "binary_expression", o.startIndex, e.L.b, [o, t, s]);
}
//@ chunk-k5vy5m8c.js:52840-54349 fingerprint = parseTestBinary (1)
function parseTestBinary(P, closer) {
  skipBlanks(P.L);
  let left = parseTestNegatablePrimary(P, closer);
  if (!left) return null;
  skipBlanks(P.L);
  let s = peek(P.L),
    c1 = peek(P.L, 1),
    op = null,
    os = P.L.b;
  if (s === "=" && c1 === "=") (advance(P.L), advance(P.L), (op = mk(P, "==", os, P.L.b, [])));
  else if (s === "!" && c1 === "=") (advance(P.L), advance(P.L), (op = mk(P, "!=", os, P.L.b, [])));
  else if (s === "=" && c1 === "~") (advance(P.L), advance(P.L), (op = mk(P, "=~", os, P.L.b, [])));
  else if (s === "=" && c1 !== "=") (advance(P.L), (op = mk(P, "=", os, P.L.b, [])));
  else if (closer === "]]" && s === "<" && c1 !== "<") (advance(P.L), (op = mk(P, "<", os, P.L.b, [])));
  else if (closer === "]]" && s === ">" && c1 !== ">") (advance(P.L), (op = mk(P, ">", os, P.L.b, [])));
  else if (s === "-" && isIdentStart(c1)) {
    advance(P.L);
    while (isIdentChar(peek(P.L))) advance(P.L);
    op = mk(P, "test_operator", os, P.L.b, []);
  }
  if (!op) return left;
  if ((skipBlanks(P.L), closer === "]]")) {
    let opText = op.type;
    if (opText === "=~") {
      skipBlanks(P.L);
      let rc = peek(P.L),
        rhs = null;
      if (rc === '"' || rc === "'") {
        let save = saveLex(P.L),
          quoted = rc === '"' ? parseDoubleQuoted(P) : leaf(P, "raw_string", nextToken(P.L, "arg")),
          h = P.L.i,
          I = h;
        while (I < P.L.len && (P.src[I] === " " || P.src[I] === "\t")) I++;
        let T = P.src[I] ?? "",
          g = I + 1;
        while (P.src[g] === "\\")
          if (
            P.src[g + 1] ===
            `
`
          )
            g += 2;
          else if (
            P.src[g + 1] === "\r" &&
            P.src[g + 2] ===
              `
`
          )
            g += 3;
          else break;
        let y = P.src[g] ?? "";
        if (
          (T === "]" && y === "]" && I > h) ||
          (T === "&" && y === "&") ||
          (T === "|" && y === "|" && I > h) ||
          T ===
            `
` ||
          T === ""
        )
          rhs = quoted;
        else restoreLex(P.L, save);
      }
      if (!rhs) rhs = parseTestRegexRhs(P, !0);
      if (!rhs) return makeMissingRhsBinary(P, left, op);
      return mk(P, "binary_expression", left.startIndex, rhs.endIndex, [left, op, rhs]);
    }
    if (opText === "=") {
      let u = parseTestRegexRhs(P, !1);
      if (!u) return makeMissingRhsBinary(P, left, op);
      return mk(P, "binary_expression", left.startIndex, u.endIndex, [left, op, u]);
    }
    if (opText === "==" || opText === "!=") {
      let rhs = parseTestExtglobRhs(P);
      if (rhs.length === 0) return makeMissingRhsBinary(P, left, op);
      let at = rhs.at(-1);
      return mk(P, "binary_expression", left.startIndex, at.endIndex, [left, op, ...rhs]);
    }
  }
  let right = parseTestPrimary(P, closer);
  if (!right) return makeMissingRhsBinary(P, left, op);
  return mk(P, "binary_expression", left.startIndex, right.endIndex, [left, op, right]);
}
//@ chunk-k5vy5m8c.js:54349-55000 fingerprint = parseTestRegexRhs (0.921)
function parseTestRegexRhs(e, o) {
  skipBlanks(e.L);
  let start = e.L.b,
    s = 0;
  while (e.L.i < e.L.len) {
    let i = peek(e.L);
    if (i === "\\" && e.L.i + 1 < e.L.len) {
      (advance(e.L), advance(e.L));
      continue;
    }
    if (
      i ===
      `
`
    ) {
      if (s === 0) break;
      advance(e.L);
      continue;
    }
    if (i === '"' || i === "'") {
      let r = i;
      advance(e.L);
      while (e.L.i < e.L.len && peek(e.L) !== r) {
        if (r === '"' && peek(e.L) === "\\" && e.L.i + 1 < e.L.len) advance(e.L);
        advance(e.L);
      }
      if (e.L.i < e.L.len) advance(e.L);
      continue;
    }
    if (i === "`") {
      advance(e.L);
      while (e.L.i < e.L.len && peek(e.L) !== "`") {
        if (peek(e.L) === "\\" && e.L.i + 1 < e.L.len) advance(e.L);
        advance(e.L);
      }
      if (e.L.i < e.L.len) advance(e.L);
      continue;
    }
    if (s === 0) {
      if (i === " " || i === "\t") break;
      if (i === "&" || (!o && i === "|")) break;
      if (i === ")") break;
    }
    if (i === "(") s++;
    else if (i === ")" && s > 0) s--;
    advance(e.L);
  }
  if (e.L.b === start) return null;
  return mk(e, "regex", start, e.L.b, []);
}
//@ chunk-k5vy5m8c.js:55000-56538 fingerprint = parseTestExtglobRhs (0.83)
function parseTestExtglobRhs(P) {
  skipBlanks(P.L);
  let parts = [],
    segStart = P.L.b,
    segStartI = P.L.i,
    parenDepth = 0,
    flushSeg = () => {
      if (P.L.i > segStartI) {
        let text = P.src.slice(segStartI, P.L.i),
          type = /^\d+$/.test(text) ? "number" : "extglob_pattern";
        parts.push(mk(P, type, segStart, P.L.b, []));
      }
    };
  while (P.L.i < P.L.len) {
    let a = peek(P.L);
    if (a === "\\" && P.L.i + 1 < P.L.len) {
      (advance(P.L), advance(P.L));
      continue;
    }
    if (
      a ===
      `
`
    ) {
      if (parenDepth === 0) break;
      advance(P.L);
      continue;
    }
    if (parenDepth === 0) {
      if (a === "&" || a === "|") break;
      if (a === " " || a === "\t") {
        let c = P.L.i;
        for (;;) {
          let b = P.L.src[c];
          if (b === " " || b === "\t") c++;
          else if (
            b === "\\" &&
            P.L.src[c + 1] ===
              `
`
          )
            c += 2;
          else if (
            b === "\\" &&
            P.L.src[c + 1] === "\r" &&
            P.L.src[c + 2] ===
              `
`
          )
            c += 3;
          else break;
        }
        let f = P.L.src[c] ?? "",
          u = c + 1;
        while (P.L.src[u] === "\\")
          if (
            P.L.src[u + 1] ===
            `
`
          )
            u += 2;
          else if (
            P.L.src[u + 1] === "\r" &&
            P.L.src[u + 2] ===
              `
`
          )
            u += 3;
          else break;
        let d = P.L.src[u] ?? "";
        if (
          (f === "]" && d === "]") ||
          (f === "&" && d === "&") ||
          (f === "|" && d === "|") ||
          f === "#" ||
          f ===
            `
`
        )
          break;
        advance(P.L);
        continue;
      }
    }
    if (a === "$") {
      let c1 = peek(P.L, 1);
      if (c1 === "'") {
        flushSeg();
        let f = nextToken(P.L, "arg");
        (parts.push(leaf(P, "ansi_c_string", f)), (segStart = P.L.b), (segStartI = P.L.i));
        continue;
      }
      if (c1 === '"') {
        flushSeg();
        let f = { type: "DOLLAR", value: "$", start: P.L.b, end: P.L.b + 1 };
        (advance(P.L),
          parts.push(leaf(P, "$", f)),
          parts.push(parseDoubleQuoted(P)),
          (segStart = P.L.b),
          (segStartI = P.L.i));
        continue;
      }
      if (c1 === "(" || c1 === "{" || isIdentStart(c1) || SPECIAL_VARS.has(c1) || c1 >= "\x80") {
        flushSeg();
        let exp = parseDollarLike(P);
        if (exp) parts.push(exp);
        ((segStart = P.L.b), (segStartI = P.L.i));
        continue;
      }
    }
    if (a === '"') {
      (flushSeg(), parts.push(parseDoubleQuoted(P)), (segStart = P.L.b), (segStartI = P.L.i));
      continue;
    }
    if (a === "'") {
      flushSeg();
      let tok = nextToken(P.L, "arg");
      (parts.push(leaf(P, "raw_string", tok)), (segStart = P.L.b), (segStartI = P.L.i));
      continue;
    }
    if (a === "`") {
      flushSeg();
      let c = parseBacktick(P);
      (parts.push(c), (segStart = P.L.b), (segStartI = P.L.i));
      continue;
    }
    if ((a === "<" || a === ">") && peek(P.L, 1) === "(") {
      flushSeg();
      let c = parseProcessSub(P);
      if (c) parts.push(c);
      ((segStart = P.L.b), (segStartI = P.L.i));
      continue;
    }
    if (a === ")" && parenDepth === 0) break;
    if (a === "(") parenDepth++;
    else if (a === ")" && parenDepth > 0) parenDepth--;
    advance(P.L);
  }
  return (flushSeg(), parts);
}
//@ chunk-k5vy5m8c.js:56538-56707 fingerprint = parseTestPrimary (1)
function parseTestPrimary(P, closer) {
  if ((skipBlanks(P.L), closer === "]" && peek(P.L) === "]" && isWordBreakNotParen(peek(P.L, 1) ?? "")))
    return null;
  if (closer === "]]" && peek(P.L) === "]" && peek(P.L, 1) === "]" && isWordBreakNotParen(peek(P.L, 2) ?? ""))
    return null;
  return parseWord(P, "arg");
}
//@ chunk-k5vy5m8c.js:56707-57004 fingerprint = ARITH_PREC (1)
var ARITH_PREC = {
    "=": 2,
    "+=": 2,
    "-=": 2,
    "*=": 2,
    "/=": 2,
    "%=": 2,
    "<<=": 2,
    ">>=": 2,
    "&=": 2,
    "^=": 2,
    "|=": 2,
    "||": 4,
    "&&": 5,
    "|": 6,
    "^": 7,
    "&": 8,
    "==": 9,
    "!=": 9,
    "<": 10,
    ">": 10,
    "<=": 10,
    ">=": 10,
    "<<": 11,
    ">>": 11,
    "+": 12,
    "-": 12,
    "*": 13,
    "/": 13,
    "%": 13,
    "**": 14,
  },
  ARITH_RIGHT_ASSOC = new Set(["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "^=", "|=", "**"]);
//@ chunk-k5vy5m8c.js:57004-57280 callgraph-witnessed = parseArithBinary (0.216)
function skipToArithStop(e, o, t) {
  restoreLex(e.L, o);
  let s = 0;
  while (e.L.i < e.L.len) {
    let opInfo = peek(e.L);
    if (t === "))" || t === ")") {
      if (opInfo === "(") s++;
      else if (opInfo === ")")
        if (s === 0) {
          if (t === ")" || peek(e.L, 1) === ")") return;
        } else s--;
    } else if (t === "]") {
      if (opInfo === "[") s++;
      else if (opInfo === "]") {
        if (s === 0) return;
        s--;
      }
    } else if (isArithStop(e, t)) return;
    advance(e.L);
  }
}
//@ chunk-k5vy5m8c.js:57280-57355 fingerprint = parseArithExpr (0.743)
function parseArithExpr(P, stop, mode = "var") {
  P.inDquote++;
  let s = parseArithTernary(P, stop, mode);
  return (P.inDquote--, s);
}
//@ chunk-k5vy5m8c.js:57355-57492 fingerprint = parseArithCommaList (1)
function parseArithCommaList(P, stop, mode = "var") {
  let out = [];
  while (!0) {
    let i = parseArithExpr(P, stop, mode);
    if (i) out.push(i);
    if ((skipBlanks(P.L), peek(P.L) === "," && !isArithStop(P, stop))) {
      advance(P.L);
      continue;
    }
    break;
  }
  return out;
}
//@ chunk-k5vy5m8c.js:57492-57873 fingerprint = parseArithTernary (1)
function parseArithTernary(P, stop, mode) {
  let cond = parseArithBinary(P, stop, 0, mode);
  if (!cond) return null;
  if ((skipBlanks(P.L), peek(P.L) === "?")) {
    let qs = P.L.b;
    advance(P.L);
    let r = mk(P, "?", qs, P.L.b, []),
      a = parseArithBinary(P, ":", 0, mode);
    skipBlanks(P.L);
    let colon;
    if (peek(P.L) === ":") {
      let cs = P.L.b;
      (advance(P.L), (colon = mk(P, ":", cs, P.L.b, [])));
    } else colon = mk(P, ":", P.L.b, P.L.b, []);
    let f = parseArithTernary(P, stop, mode),
      last = f ?? colon,
      kids = [cond, r];
    if (a) kids.push(a);
    if ((kids.push(colon), f)) kids.push(f);
    return mk(P, "ternary_expression", cond.startIndex, last.endIndex, kids);
  }
  return cond;
}
//@ chunk-k5vy5m8c.js:57873-58913 fingerprint = scanArithOp (1)
function scanArithOp(P) {
  let o = peek(P.L),
    c1 = peek(P.L, 1),
    c2 = peek(P.L, 2);
  if (o === "<" && c1 === "<" && c2 === "=") return ["<<=", 3];
  if (o === ">" && c1 === ">" && c2 === "=") return [">>=", 3];
  if (o === "*" && c1 === "*") return ["**", 2];
  if (o === "<" && c1 === "<") return ["<<", 2];
  if (o === ">" && c1 === ">") return [">>", 2];
  if (o === "=" && c1 === "=") return ["==", 2];
  if (o === "!" && c1 === "=") return ["!=", 2];
  if (o === "<" && c1 === "=") return ["<=", 2];
  if (o === ">" && c1 === "=") return [">=", 2];
  if (o === "&" && c1 === "&") return ["&&", 2];
  if (o === "|" && c1 === "|") return ["||", 2];
  if (o === "+" && c1 === "=") return ["+=", 2];
  if (o === "-" && c1 === "=") return ["-=", 2];
  if (o === "*" && c1 === "=") return ["*=", 2];
  if (o === "/" && c1 === "=") return ["/=", 2];
  if (o === "%" && c1 === "=") return ["%=", 2];
  if (o === "&" && c1 === "=") return ["&=", 2];
  if (o === "^" && c1 === "=") return ["^=", 2];
  if (o === "|" && c1 === "=") return ["|=", 2];
  if (o === "+" && c1 !== "+") return ["+", 1];
  if (o === "-" && c1 !== "-") return ["-", 1];
  if (o === "*") return ["*", 1];
  if (o === "/") return ["/", 1];
  if (o === "%") return ["%", 1];
  if (o === "<") return ["<", 1];
  if (o === ">") return [">", 1];
  if (o === "&") return ["&", 1];
  if (o === "|") return ["|", 1];
  if (o === "^") return ["^", 1];
  if (o === "=") return ["=", 1];
  return null;
}
//@ chunk-k5vy5m8c.js:58913-59266 layout = parseTestOr (1)
function parseArithBinary(e, o, t, s) {
  let i = parseArithUnary(e, o, s);
  if (!i) return null;
  while (!0) {
    if ((skipBlanks(e.L), isArithStop(e, o))) break;
    if (peek(e.L) === ",") break;
    let save = scanArithOp(e);
    if (!save) break;
    let [a, c] = save,
      f = ARITH_PREC[a];
    if (f === void 0 || f < t) break;
    let u = e.L.b;
    for (let h = 0; h < c; h++) advance(e.L);
    let d = mk(e, a, u, e.L.b, []),
      b = ARITH_RIGHT_ASSOC.has(a) ? f : f + 1,
      p = parseArithBinary(e, o, b, s);
    if (!p) break;
    i = mk(e, "binary_expression", i.startIndex, p.endIndex, [i, d, p]);
  }
  return i;
}
//@ chunk-k5vy5m8c.js:59266-59807 fingerprint = parseArithUnary (1)
function parseArithUnary(P, stop, mode) {
  if ((skipBlanks(P.L), isArithStop(P, stop))) return null;
  let s = peek(P.L),
    c1 = peek(P.L, 1);
  if ((s === "+" && c1 === "+") || (s === "-" && c1 === "-")) {
    let r = P.L.b;
    (advance(P.L), advance(P.L));
    let op = mk(P, s + c1, r, P.L.b, []),
      inner = parseArithUnary(P, stop, mode);
    if (!inner) return op;
    return mk(P, "unary_expression", op.startIndex, inner.endIndex, [op, inner]);
  }
  if (s === "-" || s === "+" || s === "!" || s === "~") {
    if (mode !== "var" && s === "-" && isDigit(c1)) {
      let f = P.L.b;
      advance(P.L);
      while (isDigit(peek(P.L))) advance(P.L);
      return mk(P, "number", f, P.L.b, []);
    }
    let r = P.L.b;
    advance(P.L);
    let op = mk(P, s, r, P.L.b, []),
      inner = parseArithUnary(P, stop, mode);
    if (!inner) return op;
    return mk(P, "unary_expression", op.startIndex, inner.endIndex, [op, inner]);
  }
  return parseArithPostfix(P, stop, mode);
}
//@ chunk-k5vy5m8c.js:59807-60047 fingerprint = parseArithPostfix (1)
function parseArithPostfix(P, stop, mode) {
  let prim = parseArithPrimary(P, stop, mode);
  if (!prim) return null;
  let i = peek(P.L),
    c1 = peek(P.L, 1);
  if ((i === "+" && c1 === "+") || (i === "-" && c1 === "-")) {
    let a = P.L.b;
    (advance(P.L), advance(P.L));
    let op = mk(P, i + c1, a, P.L.b, []);
    return mk(P, "postfix_expression", prim.startIndex, op.endIndex, [prim, op]);
  }
  return prim;
}
//@ chunk-k5vy5m8c.js:60047-61263 fingerprint = parseArithPrimary (1)
function parseArithPrimary(P, stop, mode) {
  if ((skipBlanks(P.L), isArithStop(P, stop))) return null;
  let s = peek(P.L);
  if (s === "(") {
    let i = P.L.b;
    advance(P.L);
    let open = mk(P, "(", i, P.L.b, []),
      inners = parseArithCommaList(P, ")", mode);
    skipBlanks(P.L);
    let c;
    if (peek(P.L) === ")") {
      let cs = P.L.b;
      (advance(P.L), (c = mk(P, ")", cs, P.L.b, [])));
    } else c = mk(P, ")", P.L.b, P.L.b, []);
    return mk(P, "parenthesized_expression", open.startIndex, c.endIndex, [open, ...inners, c]);
  }
  if (s === '"') return parseDoubleQuoted(P);
  if (s === "$") return parseDollarLike(P);
  if (isDigit(s)) {
    let i = P.L.b;
    while (isDigit(peek(P.L))) advance(P.L);
    if (P.L.b - i === 1 && s === "0" && (peek(P.L) === "x" || peek(P.L) === "X")) {
      advance(P.L);
      while (isHexDigit(peek(P.L))) advance(P.L);
    } else if (peek(P.L) === "#") {
      advance(P.L);
      while (isBaseDigit(peek(P.L))) advance(P.L);
    }
    return mk(P, "number", i, P.L.b, []);
  }
  if (isIdentStart(s)) {
    let i = P.L.b;
    while (isIdentChar(peek(P.L))) advance(P.L);
    let nc = peek(P.L);
    if (mode === "assign") {
      skipBlanks(P.L);
      let ac = peek(P.L),
        ac1 = peek(P.L, 1);
      if (ac === "=" && ac1 !== "=") {
        let vn = mk(P, "variable_name", i, P.L.b, []),
          es = P.L.b;
        advance(P.L);
        let eq = mk(P, "=", es, P.L.b, []),
          val = parseArithTernary(P, stop, mode),
          h = val ? val.endIndex : eq.endIndex;
        return mk(P, "variable_assignment", i, h, val ? [vn, eq, val] : [vn, eq]);
      }
    }
    if (nc === "[") {
      let vn = mk(P, "variable_name", i, P.L.b, []),
        brS = P.L.b;
      advance(P.L);
      let brOpen = mk(P, "[", brS, P.L.b, []),
        idx = parseArithTernary(P, "]", "var") ?? parseDollarLike(P);
      skipBlanks(P.L);
      let b;
      if (peek(P.L) === "]") {
        let cs = P.L.b;
        (advance(P.L), (b = mk(P, "]", cs, P.L.b, [])));
      } else b = mk(P, "]", P.L.b, P.L.b, []);
      let p = idx ? [vn, brOpen, idx, b] : [vn, brOpen, b];
      return mk(P, "subscript", i, b.endIndex, p);
    }
    return mk(P, mode === "var" ? "variable_name" : "word", i, P.L.b, []);
  }
  return null;
}
//@ chunk-k5vy5m8c.js:61263-61524 callgraph-witnessed = isArithStop (1)
function isArithStop(P, stop) {
  let t = peek(P.L);
  if (stop === "))") return t === ")" && peek(P.L, 1) === ")";
  if (stop === ")") return t === ")";
  if (stop === ";") return t === ";";
  if (stop === ":") return t === ":";
  if (stop === "]") return t === "]";
  if (stop === "}") return t === "}";
  if (stop === ":}") return t === ":" || t === "}";
  return (
    t === "" ||
    t ===
      `
`
  );
}
//@ chunk-k5vy5m8c.js:61524-61752 callgraph-witnessed = skipBlanks (0.464)
function skipQuotedSpan(e, o) {
  let at = o.at(-1);
  if (o === "$'") advance(e.L);
  advance(e.L);
  while (e.L.i < e.L.len && peek(e.L) !== at) {
    if (o !== "'" && peek(e.L) === "\\" && e.L.i + 1 < e.L.len) advance(e.L);
    else if ((at === '"' || e.inDquote > 0) && (peek(e.L) === "$" || peek(e.L) === "`")) e.zshBraceDiff = !0;
    advance(e.L);
  }
}

export { getParserModule, hasZshMultibyteName, SHELL_KEYWORDS };
