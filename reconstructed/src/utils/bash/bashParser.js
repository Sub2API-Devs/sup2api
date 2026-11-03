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
import { identity } from "../identity.js";
import {
  isTinglyPearlEnabled,
  isGuardOff,
  isCalmNautilusEnabled,
  isFoamyHeronEnabled,
  markGuardFired,
} from "./bashParserFlags.js";

//@ chunk-k5vy5m8c.js:280-382 file-local
var MAX_NESTING_DEPTH = 50;
var MAX_PARSE_NODES = 50000;
var MAX_INPUT_BYTES = 67108864;
var MAX_CACHED_BYTES = MAX_INPUT_BYTES;
var bashParser = {
  parse: parseCached,
};
var MAX_CACHE_ENTRIES = 64;
var MAX_COMMAND_LENGTH = 1e4;
var MAX_SOURCE_LENGTH = 32000;
var parseCache = identity(new Map(), (e) => e.clear());
//@ chunk-k5vy5m8c.js:382-406 facade-exports
function getParserModule() {
  return bashParser;
}
//@ chunk-k5vy5m8c.js:406-489 layout
var SPECIAL_VARS = new Set(["?", "$", "@", "*", "#", "-", "!", "_"]);
var ZSH_PARAM_FLAG_CHARS = new Set(["#", "^", "=", "~", "+"]);
//@ chunk-k5vy5m8c.js:489-659 layout
function scanNonAsciiParamName(e, o) {
  let src = e.L.src;
  let s = o;
  while (s < e.L.len && ZSH_PARAM_FLAG_CHARS.has(src[s])) s++;
  let i = false;
  while (s < e.L.len) {
    let r = src[s];
    if (isIdentChar(r)) s++;
    else if (r >= "\x80") {
      i = true;
      s++;
    } else break;
  }
  return i ? s : -1;
}
//@ chunk-k5vy5m8c.js:659-844 facade-exports = SHELL_KEYWORDS (0.799)
var DECL_KEYWORDS = new Set(["export", "declare", "typeset", "readonly", "local"]);
var SHELL_KEYWORDS = new Set([
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
  return {
    src,
    len: src.length,
    i: 0,
    b: 0,
    heredocs: [],
    byteTable: null,
    zshCondParenDiff: false,
  };
}
//@ chunk-k5vy5m8c.js:941-1078 fingerprint = advance (1)
function advance(L) {
  let code = L.src.charCodeAt(L.i);
  L.i++;
  if (code < 128) L.b++;
  else if (code < 2048) L.b += 2;
  else if (code >= 55296 && code <= 56319) {
    L.b += 4;
    L.i++;
  } else L.b += 3;
}
//@ chunk-k5vy5m8c.js:1078-1131 fingerprint = peek (1)
function peek(L, off = 0) {
  return L.i + off < L.len ? L.src[L.i + off] : "";
}
//@ chunk-k5vy5m8c.js:1131-1412 fingerprint = byteAt (1)
function byteAt(L, charIdx) {
  if (L.byteTable) return L.byteTable[charIdx];
  let uint32Array = new Uint32Array(L.len + 1);
  let s = 0;
  let i = 0;
  while (i < L.len) {
    uint32Array[i] = s;
    let code = L.src.charCodeAt(i);
    if (code < 128) {
      s++;
      i++;
    } else if (code < 2048) {
      s += 2;
      i++;
    } else if (code >= 55296 && code <= 56319) {
      uint32Array[i + 1] = s + 2;
      s += 4;
      i += 2;
    } else {
      s += 3;
      i++;
    }
  }
  uint32Array[L.len] = s;
  L.byteTable = uint32Array;
  return uint32Array[charIdx];
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
    else if (o === "\\") {
      if (
        e.src[e.i + 1] ===
        `
`
      ) {
        advance(e);
        advance(e);
      } else break;
    } else break;
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
    ) {
      advance(e);
      advance(e);
    } else break;
  }
}
//@ chunk-k5vy5m8c.js:2531-6872 fingerprint = nextToken (0.968)
/**
 * 词法分析下一个 token（EOF/NEWLINE/COMMENT/OP/WORD/NUMBER…），cmd 上下文把 [ 视为运算符，arg 上下文视为单词字符。
 */
function nextToken(L, ctx = "arg") {
  skipBlanks(L);
  let start = L.b;
  if (L.i >= L.len)
    return {
      type: "EOF",
      value: "",
      start,
      end: start,
    };
  let s = L.src[L.i];
  let c1 = peek(L, 1);
  let c2 = peek(L, 2);
  if (
    s ===
    `
`
  ) {
    advance(L);
    return {
      type: "NEWLINE",
      value: `
`,
      start,
      end: L.b,
    };
  }
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
      return {
        type: "COMMENT",
        value: L.src.slice(si, L.i),
        start,
        end: L.b,
      };
    }
  }
  if (s === "&" && c1 === "&") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "&&",
      start,
      end: L.b,
    };
  }
  if (s === "|" && c1 === "|") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "||",
      start,
      end: L.b,
    };
  }
  if (s === "|" && c1 === "&") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "|&",
      start,
      end: L.b,
    };
  }
  if (s === ";" && c1 === ";" && c2 === "&") {
    advance(L);
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ";;&",
      start,
      end: L.b,
    };
  }
  if (s === ";" && c1 === ";") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ";;",
      start,
      end: L.b,
    };
  }
  if (s === ";" && c1 === "&") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ";&",
      start,
      end: L.b,
    };
  }
  if (s === ">" && c1 === ">") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ">>",
      start,
      end: L.b,
    };
  }
  if (s === ">" && c1 === "&" && c2 === "-") {
    advance(L);
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ">&-",
      start,
      end: L.b,
    };
  }
  if (s === ">" && c1 === "&") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ">&",
      start,
      end: L.b,
    };
  }
  if (s === ">" && c1 === "|") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: ">|",
      start,
      end: L.b,
    };
  }
  if (s === "&" && c1 === ">" && c2 === ">") {
    advance(L);
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "&>>",
      start,
      end: L.b,
    };
  }
  if (s === "&" && c1 === ">") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "&>",
      start,
      end: L.b,
    };
  }
  if (s === "<" && c1 === "<" && c2 === "<") {
    advance(L);
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "<<<",
      start,
      end: L.b,
    };
  }
  if (s === "<" && c1 === "<" && c2 === "-") {
    advance(L);
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "<<-",
      start,
      end: L.b,
    };
  }
  if (s === "<" && c1 === "<") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "<<",
      start,
      end: L.b,
    };
  }
  if (s === "<" && c1 === "&" && c2 === "-") {
    advance(L);
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "<&-",
      start,
      end: L.b,
    };
  }
  if (s === "<" && c1 === "&") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "<&",
      start,
      end: L.b,
    };
  }
  if (s === "<" && c1 === "(") {
    advance(L);
    advance(L);
    return {
      type: "LT_PAREN",
      value: "<(",
      start,
      end: L.b,
    };
  }
  if (s === ">" && c1 === "(") {
    advance(L);
    advance(L);
    return {
      type: "GT_PAREN",
      value: ">(",
      start,
      end: L.b,
    };
  }
  if (s === "(" && c1 === "(") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "((",
      start,
      end: L.b,
    };
  }
  if (s === ")" && c1 === ")") {
    advance(L);
    advance(L);
    return {
      type: "OP",
      value: "))",
      start,
      end: L.b,
    };
  }
  if (s === "|" || s === "&" || s === ";" || s === ">" || s === "<") {
    advance(L);
    return {
      type: "OP",
      value: s,
      start,
      end: L.b,
    };
  }
  if (s === "(" || s === ")") {
    advance(L);
    return {
      type: "OP",
      value: s,
      start,
      end: L.b,
    };
  }
  if (ctx === "cmd") {
    if (s === "[") {
      let a = false;
      let c = (u) => {
        while (L.src[u] === "\\")
          if (
            L.src[u + 1] ===
            `
`
          ) {
            u += 2;
            a = true;
          } else if (
            L.src[u + 1] === "\r" &&
            L.src[u + 2] ===
              `
`
          ) {
            u += 3;
            a = true;
          } else break;
        return u;
      };
      let f = c(L.i + 1);
      if (L.src[f] === "[") {
        let u = c(f + 1);
        if (a && L.src[u] === "(") L.zshCondParenDiff = true;
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
      if (c2 === "(") L.zshCondParenDiff = true;
      advance(L);
      advance(L);
      return {
        type: "OP",
        value: "[[",
        start,
        end: L.b,
      };
    }
    if (s === "[") {
      advance(L);
      return {
        type: "OP",
        value: "[",
        start,
        end: L.b,
      };
    }
    if (
      s === "{" &&
      (c1 === " " ||
        c1 === "\t" ||
        c1 ===
          `
`)
    ) {
      advance(L);
      return {
        type: "OP",
        value: "{",
        start,
        end: L.b,
      };
    }
    if (s === "}") {
      advance(L);
      return {
        type: "OP",
        value: "}",
        start,
        end: L.b,
      };
    }
    if (s === "!" && (c1 === " " || c1 === "\t")) {
      advance(L);
      return {
        type: "OP",
        value: "!",
        start,
        end: L.b,
      };
    }
  }
  if (s === '"') {
    advance(L);
    return {
      type: "DQUOTE",
      value: '"',
      start,
      end: L.b,
    };
  }
  if (s === "'") {
    let si = L.i;
    advance(L);
    while (L.i < L.len && L.src[L.i] !== "'") advance(L);
    if (L.i < L.len) advance(L);
    return {
      type: "SQUOTE",
      value: L.src.slice(si, L.i),
      start,
      end: L.b,
    };
  }
  if (s === "$") {
    if (c1 === "(" && c2 === "(") {
      advance(L);
      advance(L);
      advance(L);
      return {
        type: "DOLLAR_DPAREN",
        value: "$((",
        start,
        end: L.b,
      };
    }
    if (c1 === "(") {
      advance(L);
      advance(L);
      return {
        type: "DOLLAR_PAREN",
        value: "$(",
        start,
        end: L.b,
      };
    }
    if (c1 === "{") {
      advance(L);
      advance(L);
      return {
        type: "DOLLAR_BRACE",
        value: "${",
        start,
        end: L.b,
      };
    }
    if (c1 === "'") {
      let si = L.i;
      advance(L);
      advance(L);
      while (L.i < L.len && L.src[L.i] !== "'") {
        if (L.src[L.i] === "\\" && L.i + 1 < L.len) advance(L);
        advance(L);
      }
      if (L.i < L.len) advance(L);
      return {
        type: "ANSI_C",
        value: L.src.slice(si, L.i),
        start,
        end: L.b,
      };
    }
    advance(L);
    return {
      type: "DOLLAR",
      value: "$",
      start,
      end: L.b,
    };
  }
  if (s === "`") {
    advance(L);
    return {
      type: "BACKTICK",
      value: "`",
      start,
      end: L.b,
    };
  }
  if (isDigit(s)) {
    let j = L.i;
    while (j < L.len && isDigit(L.src[j])) j++;
    let after = j < L.len ? L.src[j] : "";
    if (after === ">" || after === "<") {
      let si = L.i;
      while (L.i < j) advance(L);
      return {
        type: "WORD",
        value: L.src.slice(si, L.i),
        start,
        end: L.b,
      };
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
          advance(L);
          advance(L);
          continue;
        }
        advance(L);
        advance(L);
        continue;
      }
      if (!isWordChar(c) && c !== "{" && c !== "}" && c !== "#") break;
      advance(L);
    }
    if (L.i > si) {
      let v = L.src.slice(si, L.i);
      if (/^-?\d+$/.test(v))
        return {
          type: "NUMBER",
          value: v,
          start,
          end: L.b,
        };
      return {
        type: "WORD",
        value: v,
        start,
        end: L.b,
      };
    }
  }
  advance(L);
  return {
    type: "WORD",
    value: s,
    start,
    end: L.b,
  };
}
//@ chunk-k5vy5m8c.js:6872-7353 layout
/**
 * S_().parse 的实现：按命令文本缓存 AST（最多 64 条或总长 32000 字符，按最旧淘汰），缓存键还核对 tengu_tingly_pearl / tengu_calm_nautilus / tengu_foamy_heron 三个闸门的当前值；显式超时或超长时不走缓存。
 */
function parseCached(source, timeoutMs) {
  if (timeoutMs !== undefined || source.length > MAX_COMMAND_LENGTH) return parseSource(source, timeoutMs);
  let t = isTinglyPearlEnabled() && !isGuardOff();
  let s = isCalmNautilusEnabled();
  let i = isFoamyHeronEnabled();
  let r = parseCache.get(source);
  if (r !== undefined && r.keywordRule === t && r.patternQuoteGuard === s && r.dollarOperandGuard === i) {
    if (r.root.keywordAfterPrefix) markGuardFired();
    return r.root;
  }
  parseCache.delete(source);
  let source_2 = parseSource(source);
  if (source_2 !== null) {
    let c = source.length;
    for (let key of parseCache.keys()) c += key.length;
    for (let key of parseCache.keys()) {
      if (parseCache.size < MAX_CACHE_ENTRIES && c <= MAX_SOURCE_LENGTH) break;
      parseCache.delete(key);
      c -= key.length;
    }
    parseCache.set(source, {
      root: source_2,
      keywordRule: t,
      patternQuoteGuard: s,
      dollarOperandGuard: i,
    });
  }
  return source_2;
}
//@ chunk-k5vy5m8c.js:7353-7887 fingerprint = parseSource (0.571)
/**
 * 纯 TS bash 解析主函数：建立 lexer 与解析状态（节点上限 50000、默认 50ms 超时、UTF-8 字节偏移），parseProgram 产出 tree-sitter-bash 形状的节点树；超时/超预算返回 null；检测到 zsh 花括号/条件括号/$ 操作数/关键字错位等分歧时把根包成 ERROR。
 */
function parseSource(source, timeoutMs) {
  let lexer = makeLexer(source);
  let srcBytes = byteLengthUtf8(source);
  if (srcBytes >= MAX_CACHED_BYTES) return null;
  let i = {
    L: lexer,
    src: source,
    srcBytes,
    isAscii: srcBytes === source.length,
    nodeCount: 0,
    deadline: performance.now() + (timeoutMs ?? MAX_NESTING_DEPTH),
    aborted: false,
    inBacktick: 0,
    inDquote: 0,
    stopToken: null,
    zshBraceDiff: source.includes("$\\\n"),
    dollarOperandDiff: false,
    keywordDesync: false,
  };
  try {
    let program = parseProgram(i);
    if (i.aborted) return null;
    if (i.zshBraceDiff || i.L.zshCondParenDiff || i.dollarOperandDiff || i.keywordDesync) {
      let node = makeNode(i, "ERROR", program.startIndex, program.endIndex, [program]);
      if (i.keywordDesync)
        return {
          ...node,
          keywordAfterPrefix: true,
        };
      return node;
    }
    return program;
  } catch {
    return null;
  }
}
//@ chunk-k5vy5m8c.js:7887-8048 callgraph-fingerprint = byteLengthUtf8 (1)
function byteLengthUtf8(s_2) {
  let o = 0;
  for (let i = 0; i < s_2.length; i++) {
    let code = s_2.charCodeAt(i);
    if (code < 128) o++;
    else if (code < 2048) o += 2;
    else if (code >= 55296 && code <= 56319) {
      o += 4;
      i++;
    } else o += 3;
  }
  return o;
}
//@ chunk-k5vy5m8c.js:8048-8221 fingerprint = checkBudget (1)
/**
 * 节点数超过 50000 或每 128 个节点检查一次超时，超出则标 aborted 并抛错中止解析。
 */
function checkBudget(P) {
  P.nodeCount++;
  if (P.nodeCount > MAX_PARSE_NODES) {
    P.aborted = true;
    throw Error("budget");
  }
  if ((P.nodeCount & 127) === 0 && performance.now() > P.deadline) {
    P.aborted = true;
    throw Error("timeout");
  }
}
//@ chunk-k5vy5m8c.js:8221-8314 fingerprint = mk (1)
/**
 * 构造解析器语法树节点（消耗预算、切片文本、记录起止与子节点）。
 */
function makeNode(P, type, start, end, children) {
  checkBudget(P);
  return {
    type,
    text: sliceBytes(P, start, end),
    startIndex: start,
    endIndex: end,
    children,
  };
}
//@ chunk-k5vy5m8c.js:8314-8417 facade-exports
/**
 * 检测 $name 或 ${...} 中变量名紧跟非 ASCII 字符：zsh 会把多字节字符算进变量名而 bash 不会，存在解析分歧。
 */
function hasZshMultibyteName(e) {
  return /\$(?:\{(?:\([^)}]{0,32}\))?)?[#^=~+!]*(?:[A-Za-z_]\w*)?[\u0080-\uffff]/.test(e);
}
//@ chunk-k5vy5m8c.js:8417-8694 fingerprint = sliceBytes (1)
function sliceBytes(P, startByte, endByte) {
  if (P.isAscii) return P.src.slice(startByte, endByte);
  let s = P.L;
  if (!s.byteTable) byteAt(s, 0);
  let t = s.byteTable;
  let lo = 0;
  let hi = P.src.length;
  while (lo < hi) {
    let m = (lo + hi) >>> 1;
    if (t[m] < startByte) lo = m + 1;
    else hi = m;
  }
  let sc = lo;
  lo = sc;
  hi = P.src.length;
  while (lo < hi) {
    let m = (lo + hi) >>> 1;
    if (t[m] < endByte) lo = m + 1;
    else hi = m;
  }
  return P.src.slice(sc, lo);
}
//@ chunk-k5vy5m8c.js:8694-8743 callgraph-witnessed = leaf (0)
function leaf(P, type, tok) {
  return makeNode(P, type, tok.start, tok.end, []);
}
//@ chunk-k5vy5m8c.js:8743-9296 fingerprint = parseProgram (1)
/**
 * 解析整个程序：跳过前导空行，循环解析语句列表与注释，生成 program 节点。
 */
function parseProgram(P) {
  let children = [];
  skipBlanks(P.L);
  while (true) {
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
    let save = saveLex(P.L);
    let t = nextToken(P.L, "cmd");
    if (t.type === "EOF") break;
    if (t.type === "NEWLINE") continue;
    if (t.type === "COMMENT") {
      children.push(leaf(P, "comment", t));
      continue;
    }
    restoreLex(P.L, save);
    let stmts = parseStatements(P, null);
    for (let stmt of stmts) children.push(stmt);
    if (stmts.length === 0) {
      let errTok = nextToken(P.L, "cmd");
      if (errTok.type === "EOF") break;
      if (errTok.type === "OP" && errTok.value === ";;" && children.length > 0) continue;
      children.push(makeNode(P, "ERROR", errTok.start, errTok.end, []));
    }
  }
  let progEnd = children.length > 0 ? P.srcBytes : progStart;
  return makeNode(P, "program", progStart, progEnd, children);
}
//@ chunk-k5vy5m8c.js:9296-9328 fingerprint = saveLex (1)
function saveLex(L) {
  return L.b * MAX_INPUT_BYTES + L.i;
}
//@ chunk-k5vy5m8c.js:9328-9384 layout = saveLex (1)
function restoreLex(e, save) {
  let floored = Math.floor(save / MAX_INPUT_BYTES);
  e.i = save - floored * MAX_INPUT_BYTES;
  e.b = floored;
}
//@ chunk-k5vy5m8c.js:9384-10575 fingerprint = parseStatements (1)
/**
 * 解析语句序列直到 terminator：处理换行（触发 heredoc 正文扫描）、注释、; & 等分隔符。
 */
function parseStatements(P, terminator) {
  let out = [];
  while (true) {
    skipBlanks(P.L);
    let save = saveLex(P.L);
    let t = nextToken(P.L, "cmd");
    if (t.type === "EOF") {
      restoreLex(P.L, save);
      break;
    }
    if (t.type === "NEWLINE") {
      if (P.L.heredocs.length > 0) scanHeredocBodies(P);
      continue;
    }
    if (t.type === "COMMENT") {
      out.push(leaf(P, "comment", t));
      continue;
    }
    if (terminator && t.type === "OP" && t.value === terminator) {
      restoreLex(P.L, save);
      break;
    }
    if (
      t.type === "OP" &&
      (t.value === ")" ||
        t.value === "}" ||
        t.value === ";;" ||
        t.value === ";&" ||
        t.value === ";;&" ||
        t.value === "))" ||
        t.value === "]]" ||
        t.value === "]")
    ) {
      restoreLex(P.L, save);
      break;
    }
    if (t.type === "BACKTICK" && P.inBacktick > 0) {
      restoreLex(P.L, save);
      break;
    }
    if (
      t.type === "WORD" &&
      (t.value === "then" ||
        t.value === "elif" ||
        t.value === "else" ||
        t.value === "fi" ||
        t.value === "do" ||
        t.value === "done" ||
        t.value === "esac")
    ) {
      restoreLex(P.L, save);
      break;
    }
    restoreLex(P.L, save);
    let stmt = parseAndOr(P);
    if (!stmt) break;
    out.push(stmt);
    skipBlanks(P.L);
    let save2 = saveLex(P.L);
    let sep = nextToken(P.L, "cmd");
    if (sep.type === "OP" && (sep.value === ";" || sep.value === "&")) {
      let save3 = saveLex(P.L);
      let after = nextToken(P.L, "cmd");
      restoreLex(P.L, save3);
      out.push(leaf(P, sep.value, sep));
      if (
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
            after.value === "esac"))
      )
        continue;
    } else if (sep.type === "NEWLINE") {
      if (P.L.heredocs.length > 0) scanHeredocBodies(P);
      continue;
    } else restoreLex(P.L, save2);
  }
  return out;
}
//@ chunk-k5vy5m8c.js:10575-11107 fingerprint = parseAndOr (0.897)
/**
 * 解析 && / || 链为 list 节点；右侧是 redirected_statement 时调整节点结构以对齐 tree-sitter。
 */
function parseAndOr(P) {
  let left = parsePipeline(P);
  if (!left) return null;
  while (true) {
    let save = saveLex(P.L);
    let t = nextToken(P.L, "cmd");
    if (t.type === "OP" && (t.value === "&&" || t.value === "||")) {
      let op = leaf(P, t.value, t);
      skipNewlines(P);
      let right = parsePipeline(P);
      if (!right) {
        left = makeNode(P, "ERROR", left.startIndex, op.endIndex, [left, op]);
        break;
      }
      if (right.type === "redirected_statement" && right.children.length >= 2) {
        let inner = right.children[0];
        let redirs = right.children.slice(1);
        let listNode = makeNode(P, "list", left.startIndex, inner.endIndex, [left, op, inner]);
        let lastR = redirs.at(-1);
        left = makeNode(P, "redirected_statement", listNode.startIndex, lastR.endIndex, [
          listNode,
          ...redirs,
        ]);
      } else left = makeNode(P, "list", left.startIndex, right.endIndex, [left, op, right]);
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  return left;
}
//@ chunk-k5vy5m8c.js:11107-11195 fingerprint = skipNewlines (1)
function skipNewlines(P) {
  while (true) {
    let save = saveLex(P.L);
    if (nextToken(P.L, "cmd").type !== "NEWLINE") {
      restoreLex(P.L, save);
      break;
    }
  }
}
//@ chunk-k5vy5m8c.js:11195-11807 fingerprint = parsePipeline (1)
/**
 * 解析 | / |& 管道。
 */
function parsePipeline(P) {
  let first = parseCommand(P);
  if (!first) return null;
  let parts = [first];
  while (true) {
    let save = saveLex(P.L);
    let t = nextToken(P.L, "cmd");
    if (t.type === "OP" && (t.value === "|" || t.value === "|&")) {
      let op = leaf(P, t.value, t);
      skipNewlines(P);
      let next = parseCommand(P);
      if (!next) {
        parts.push(op);
        break;
      }
      if (next.type === "redirected_statement" && next.children.length >= 2 && parts.length >= 1) {
        let inner = next.children[0];
        let redirs = next.children.slice(1);
        let pipeKids = [...parts, op, inner];
        let pipeNode = makeNode(P, "pipeline", pipeKids[0].startIndex, inner.endIndex, pipeKids);
        let lastR = redirs.at(-1);
        let wrapped = makeNode(P, "redirected_statement", pipeNode.startIndex, lastR.endIndex, [
          pipeNode,
          ...redirs,
        ]);
        parts.length = 0;
        parts.push(wrapped);
        first = wrapped;
        continue;
      }
      parts.push(op, next);
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  if (parts.length === 1) return parts[0];
  let last = parts.at(-1);
  return makeNode(P, "pipeline", parts[0].startIndex, last.endIndex, parts);
}
//@ chunk-k5vy5m8c.js:11807-13993 fingerprint = parseCommand (1)
/**
 * 解析一条命令：复合语句（if/while/for/case/function/子 shell/{}/[[ ]]/(( ))）、声明、unset 或简单命令，并附加重定向。
 */
function parseCommand(P) {
  skipBlanks(P.L);
  let save = saveLex(P.L);
  let t = nextToken(P.L, "cmd");
  if (t.type === "EOF") {
    restoreLex(P.L, save);
    return null;
  }
  if (t.type === "OP" && t.value === "!") {
    let bang = leaf(P, "!", t);
    let inner = parseCommand(P);
    if (!inner) return makeNode(P, "negated_command", bang.startIndex, bang.endIndex, [bang]);
    if (inner.type === "redirected_statement" && inner.children.length >= 2) {
      let cmd = inner.children[0];
      let redirs = inner.children.slice(1);
      let neg = makeNode(P, "negated_command", bang.startIndex, cmd.endIndex, [bang, cmd]);
      let lastR = redirs.at(-1);
      return makeNode(P, "redirected_statement", neg.startIndex, lastR.endIndex, [neg, ...redirs]);
    }
    return makeNode(P, "negated_command", bang.startIndex, inner.endIndex, [bang, inner]);
  }
  if (t.type === "OP" && t.value === "(") {
    let open = leaf(P, "(", t);
    let body = parseStatements(P, ")");
    let closeTok = nextToken(P.L, "cmd");
    let close =
      closeTok.type === "OP" && closeTok.value === ")"
        ? leaf(P, ")", closeTok)
        : makeNode(P, ")", open.endIndex, open.endIndex, []);
    let node = makeNode(P, "subshell", open.startIndex, close.endIndex, [open, ...body, close]);
    return maybeRedirect(P, node);
  }
  if (t.type === "OP" && t.value === "((") {
    let open = leaf(P, "((", t);
    let exprs = parseArithCommaList(P, "))", "var");
    let closeTok = nextToken(P.L, "cmd");
    let close =
      closeTok.value === "))" ? leaf(P, "))", closeTok) : makeNode(P, "))", open.endIndex, open.endIndex, []);
    return makeNode(P, "compound_statement", open.startIndex, close.endIndex, [open, ...exprs, close]);
  }
  if (t.type === "OP" && t.value === "{") {
    let open = leaf(P, "{", t);
    let body = parseStatements(P, "}");
    let closeTok = nextToken(P.L, "cmd");
    let close =
      closeTok.type === "OP" && closeTok.value === "}"
        ? leaf(P, "}", closeTok)
        : makeNode(P, "}", open.endIndex, open.endIndex, []);
    let node = makeNode(P, "compound_statement", open.startIndex, close.endIndex, [open, ...body, close]);
    return maybeRedirect(P, node);
  }
  if (t.type === "OP" && (t.value === "[" || t.value === "[[")) {
    let open = leaf(P, t.value, t);
    let closer = t.value === "[" ? "]" : "]]";
    let exprSave = saveLex(P.L);
    let expr = parseTestExpr(P, closer);
    skipBlanks(P.L);
    if (t.value === "[" && peek(P.L) !== "]") {
      restoreLex(P.L, exprSave);
      let prevStop = P.stopToken;
      P.stopToken = "]";
      let rstmt = parseCommand(P);
      P.stopToken = prevStop;
      if (rstmt && rstmt.type === "redirected_statement") expr = rstmt;
      else {
        restoreLex(P.L, exprSave);
        expr = parseTestExpr(P, closer);
      }
      skipBlanks(P.L);
    }
    let c = saveLex(P.L);
    let closeTok = nextToken(P.L, "arg");
    let close;
    if (closeTok.value === closer && isWordBreakNotParen(peek(P.L))) close = leaf(P, closer, closeTok);
    else {
      restoreLex(P.L, c);
      close = makeNode(P, closer, open.endIndex, open.endIndex, []);
    }
    let kids = expr ? [open, expr, close] : [open, close];
    return maybeRedirect(P, makeNode(P, "test_command", open.startIndex, close.endIndex, kids));
  }
  if (t.type === "WORD" && isWordBreak(peek(P.L))) {
    if (t.value === "if") return maybeRedirect(P, parseIf(P, t), true);
    if (t.value === "while" || t.value === "until") return maybeRedirect(P, parseWhile(P, t), true);
    if (t.value === "for") return maybeRedirect(P, parseFor(P, t), true);
    if (t.value === "select") return maybeRedirect(P, parseFor(P, t), true);
    if (t.value === "case") return maybeRedirect(P, parseCase(P, t), true);
    if (t.value === "function") return parseFunction(P, t);
    if (DECL_KEYWORDS.has(t.value)) return maybeRedirect(P, parseDeclaration(P, t));
    if (t.value === "unset" || t.value === "unsetenv") {
      let s = saveLex(P.L);
      skipBlanks(P.L);
      let i = false;
      if (peek(P.L) === "(") {
        nextToken(P.L, "cmd");
        skipBlanks(P.L);
        i = peek(P.L) === ")";
      }
      restoreLex(P.L, s);
      if (!i) return maybeRedirect(P, parseUnset(P, t));
    }
  }
  restoreLex(P.L, save);
  return parseSimpleCommand(P);
}
//@ chunk-k5vy5m8c.js:13993-17279 fingerprint = parseSimpleCommand (0.968)
/**
 * 解析简单命令：前缀赋值、命令名、参数、重定向混排。
 */
function parseSimpleCommand(P) {
  let start = P.L.b;
  let assignments = [];
  let preRedirects = [];
  while (true) {
    skipBlanks(P.L);
    let y = tryParseAssignment(P);
    if (y) {
      assignments.push(y);
      continue;
    }
    let _ = tryParseRedirect(P);
    if (_) {
      preRedirects.push(_);
      continue;
    }
    break;
  }
  skipBlanks(P.L);
  let save = saveLex(P.L);
  let nameTok = nextToken(P.L, "cmd");
  if (
    nameTok.type === "EOF" ||
    nameTok.type === "NEWLINE" ||
    nameTok.type === "COMMENT" ||
    nameTok.type === "BACKTICK" ||
    (nameTok.type === "OP" && nameTok.value !== "{" && nameTok.value !== "[" && nameTok.value !== "[[") ||
    (nameTok.type === "WORD" && SHELL_KEYWORDS.has(nameTok.value) && nameTok.value !== "in")
  ) {
    restoreLex(P.L, save);
    if (
      (assignments.length > 0 || preRedirects.length > 0) &&
      nameTok.type === "WORD" &&
      SHELL_KEYWORDS.has(nameTok.value) &&
      nameTok.value !== "in" &&
      isTinglyPearlEnabled() &&
      !isGuardOff()
    ) {
      let sorted = [...assignments, ...preRedirects].sort((_, k) => _.startIndex - k.startIndex);
      P.keywordDesync = true;
      markGuardFired();
      return makeNode(P, "ERROR", start, sorted.at(-1).endIndex, sorted);
    }
    if (assignments.length === 1 && preRedirects.length === 0) return assignments[0];
    if (preRedirects.length > 0 && assignments.length === 0) {
      let last = preRedirects.at(-1);
      return makeNode(P, "redirected_statement", preRedirects[0].startIndex, last.endIndex, preRedirects);
    }
    if (assignments.length > 1 && preRedirects.length === 0) {
      let last = assignments.at(-1);
      return makeNode(P, "variable_assignments", assignments[0].startIndex, last.endIndex, assignments);
    }
    if (assignments.length > 0 || preRedirects.length > 0) {
      let all = [...assignments, ...preRedirects];
      let last = all.at(-1);
      return makeNode(P, "command", start, last.endIndex, all);
    }
    return null;
  }
  restoreLex(P.L, save);
  let fnSave = saveLex(P.L);
  let nm = parseWord(P, "cmd");
  if (nm && nm.type === "word") {
    skipBlanks(P.L);
    let y = false;
    if (peek(P.L) === "(") {
      let _ = saveLex(P.L);
      nextToken(P.L, "cmd");
      skipBlanks(P.L);
      y = peek(P.L) === ")";
      restoreLex(P.L, _);
    }
    if (y) {
      let oTok = nextToken(P.L, "cmd");
      skipBlanks(P.L);
      let cTok = nextToken(P.L, "cmd");
      let oParen = leaf(P, "(", oTok);
      let cParen = leaf(P, ")", cTok);
      skipBlanks(P.L);
      skipNewlines(P);
      let body = parseCommand(P);
      if (body) {
        let bodyKids = [body];
        if (
          body.type === "redirected_statement" &&
          body.children.length >= 2 &&
          body.children[0].type === "compound_statement"
        )
          bodyKids = body.children;
        let last = bodyKids.at(-1);
        return makeNode(P, "function_definition", nm.startIndex, last.endIndex, [
          nm,
          oParen,
          cParen,
          ...bodyKids,
        ]);
      }
    }
  }
  restoreLex(P.L, fnSave);
  let nameArg = parseWord(P, "cmd");
  if (!nameArg) {
    if (assignments.length === 1) return assignments[0];
    return null;
  }
  let cmdName = makeNode(P, "command_name", nameArg.startIndex, nameArg.endIndex, [nameArg]);
  let args = [];
  let redirects = [];
  let heredocRedirect = null;
  while (true) {
    skipBlanks(P.L);
    let y = tryParseRedirect(P, true);
    if (y) {
      if (y.type === "heredoc_redirect") heredocRedirect = y;
      else if (y.type === "herestring_redirect") args.push(y);
      else redirects.push(y);
      continue;
    }
    if (redirects.length > 0) break;
    if (P.stopToken === "]" && peek(P.L) === "]") break;
    let save2 = saveLex(P.L);
    let pk = nextToken(P.L, "arg");
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
        let oTok = nextToken(P.L, "cmd");
        let open = leaf(P, "(", oTok);
        let body = parseStatements(P, ")");
        let Le = saveLex(P.L);
        let cTok = nextToken(P.L, "cmd");
        let close;
        if (cTok.type === "OP" && cTok.value === ")") close = leaf(P, ")", cTok);
        else {
          restoreLex(P.L, Le);
          close = makeNode(P, ")", open.endIndex, open.endIndex, []);
        }
        args.push(makeNode(P, "subshell", open.startIndex, close.endIndex, [open, ...body, close]));
        continue;
      }
      break;
    }
    if (arg.type === "word" && arg.text === "=") {
      args.push(makeNode(P, "ERROR", arg.startIndex, arg.endIndex, [arg]));
      continue;
    }
    if (
      (arg.type === "word" || arg.type === "concatenation") &&
      peek(P.L) === "(" &&
      P.L.b === arg.endIndex
    ) {
      args.push(makeNode(P, "ERROR", arg.startIndex, arg.endIndex, [arg]));
      continue;
    }
    args.push(arg);
  }
  let cmdChildren = [...assignments, ...preRedirects, cmdName, ...args];
  let cmdEnd = cmdChildren.length > 0 ? cmdChildren.at(-1).endIndex : cmdName.endIndex;
  let cmdStart = cmdChildren[0].startIndex;
  let cmd = makeNode(P, "command", cmdStart, cmdEnd, cmdChildren);
  if (heredocRedirect) {
    scanHeredocBodies(P);
    let hd = P.L.heredocs.shift();
    if (hd && heredocRedirect.children.length >= 2) {
      let bodyNode = makeNode(
        P,
        "heredoc_body",
        hd.bodyStart,
        hd.bodyEnd,
        hd.quoted ? [] : parseHeredocBodyContent(P, hd.bodyStart, hd.bodyEnd),
      );
      let endNode = makeNode(P, "heredoc_end", hd.endStart, hd.endEnd, []);
      heredocRedirect = {
        type: heredocRedirect.type,
        text: sliceBytes(P, heredocRedirect.startIndex, hd.endEnd),
        startIndex: heredocRedirect.startIndex,
        endIndex: hd.endEnd,
        children: [...heredocRedirect.children, bodyNode, endNode],
      };
    }
    let allR = [...preRedirects, heredocRedirect, ...redirects];
    let rStart =
      preRedirects.length > 0 ? Math.min(cmd.startIndex, preRedirects[0].startIndex) : cmd.startIndex;
    return makeNode(P, "redirected_statement", rStart, heredocRedirect.endIndex, [cmd, ...allR]);
  }
  if (redirects.length > 0) {
    let last = redirects.at(-1);
    return makeNode(P, "redirected_statement", cmd.startIndex, last.endIndex, [cmd, ...redirects]);
  }
  return cmd;
}
//@ chunk-k5vy5m8c.js:17279-17530 fingerprint = maybeRedirect (1)
function maybeRedirect(P, node, allowHerestring = false) {
  let redirects = [];
  while (true) {
    skipBlanks(P.L);
    let save = saveLex(P.L);
    let a = tryParseRedirect(P);
    if (!a) break;
    if (a.type === "herestring_redirect" && !allowHerestring) {
      restoreLex(P.L, save);
      break;
    }
    redirects.push(a);
  }
  if (redirects.length === 0) return node;
  let last = redirects.at(-1);
  return makeNode(P, "redirected_statement", node.startIndex, last.endIndex, [node, ...redirects]);
}
//@ chunk-k5vy5m8c.js:17530-18546 fingerprint = tryParseAssignment (1)
function tryParseAssignment(P) {
  let save = saveLex(P.L);
  skipBlanks(P.L);
  let startB = P.L.b;
  if (!isIdentStart(peek(P.L))) {
    restoreLex(P.L, save);
    return null;
  }
  while (isIdentChar(peek(P.L))) advance(P.L);
  let nameEnd = P.L.b;
  let subEnd = nameEnd;
  if (peek(P.L) === "[") {
    advance(P.L);
    let depth = 1;
    while (P.L.i < P.L.len && depth > 0) {
      let y = peek(P.L);
      if (y === "[") depth++;
      else if (y === "]") depth--;
      advance(P.L);
    }
    subEnd = P.L.b;
  }
  let r = peek(P.L);
  let c1 = peek(P.L, 1);
  let op;
  if (r === "=" && c1 !== "=") op = "=";
  else if (r === "+" && c1 === "=") op = "+=";
  else {
    restoreLex(P.L, save);
    return null;
  }
  let nameNode = makeNode(P, "variable_name", startB, nameEnd, []);
  let lhs = nameNode;
  if (subEnd > nameEnd) {
    let brOpen = makeNode(P, "[", nameEnd, nameEnd + 1, []);
    let idx = parseSubscriptIndex(P, nameEnd + 1, subEnd - 1);
    let brClose = makeNode(P, "]", subEnd - 1, subEnd, []);
    lhs = makeNode(P, "subscript", startB, subEnd, [nameNode, brOpen, idx, brClose]);
  }
  let opStart = P.L.b;
  advance(P.L);
  if (op === "+=") advance(P.L);
  let opEnd = P.L.b;
  let opNode = makeNode(P, op, opStart, opEnd, []);
  let val = null;
  if (peek(P.L) === "(") {
    let aoTok = nextToken(P.L, "cmd");
    let aOpen = leaf(P, "(", aoTok);
    let elems = [aOpen];
    while (true) {
      skipBlanks(P.L);
      if (peek(P.L) === ")") break;
      let e = parseWord(P, "arg");
      if (!e) break;
      elems.push(e);
    }
    let acTok = nextToken(P.L, "cmd");
    let aClose =
      acTok.value === ")" ? leaf(P, ")", acTok) : makeNode(P, ")", aOpen.endIndex, aOpen.endIndex, []);
    elems.push(aClose);
    val = makeNode(P, "array", aOpen.startIndex, aClose.endIndex, elems);
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
  let kids = val ? [lhs, opNode, val] : [lhs, opNode];
  let end = val ? val.endIndex : opEnd;
  return makeNode(P, "variable_assignment", startB, end, kids);
}
//@ chunk-k5vy5m8c.js:18546-18999 fingerprint = parseSubscriptIndexInline (1)
function parseSubscriptIndexInline(P) {
  skipBlanks(P.L);
  let o = peek(P.L);
  if ((o === "@" || o === "*") && peek(P.L, 1) === "]") {
    let t = P.L.b;
    advance(P.L);
    return makeNode(P, "word", t, P.L.b, []);
  }
  if (o === "(" && peek(P.L, 1) === "(") {
    let oStart = P.L.b;
    advance(P.L);
    advance(P.L);
    let open = makeNode(P, "((", oStart, P.L.b, []);
    let inner = parseArithExpr(P, "))", "var");
    skipBlanks(P.L);
    let close;
    if (peek(P.L) === ")" && peek(P.L, 1) === ")") {
      let cs = P.L.b;
      advance(P.L);
      advance(P.L);
      close = makeNode(P, "))", cs, P.L.b, []);
    } else close = makeNode(P, "))", P.L.b, P.L.b, []);
    let kids = inner ? [open, inner, close] : [open, close];
    return makeNode(P, "compound_statement", open.startIndex, close.endIndex, kids);
  }
  return parseArithExpr(P, "]", "word");
}
//@ chunk-k5vy5m8c.js:18999-19383 fingerprint = parseSubscriptIndex (1)
function parseSubscriptIndex(P, startB, endB) {
  let text = sliceBytes(P, startB, endB);
  if (/^\d+$/.test(text)) return makeNode(P, "number", startB, endB, []);
  if (/^\$([a-zA-Z_]\w*)$/.exec(text)) {
    let dollar = makeNode(P, "$", startB, startB + 1, []);
    let vn = makeNode(P, "variable_name", startB + 1, endB, []);
    return makeNode(P, "simple_expansion", startB, endB, [dollar, vn]);
  }
  if (text.length === 2 && text[0] === "$" && SPECIAL_VARS.has(text[1])) {
    let dollar = makeNode(P, "$", startB, startB + 1, []);
    let vn = makeNode(P, "special_variable_name", startB + 1, endB, []);
    return makeNode(P, "simple_expansion", startB, endB, [dollar, vn]);
  }
  return makeNode(P, "word", startB, endB, []);
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
    return false;
  if (o === "|" || o === "&" || o === ";" || o === "(" || o === ")") return false;
  if (o === "<" || o === ">") return peek(P.L, 1) === "(";
  if (isDigit(o)) {
    let j = P.L.i;
    while (j < P.L.len && isDigit(P.L.src[j])) j++;
    let after = j < P.L.len ? P.L.src[j] : "";
    if (after === ">" || after === "<") return false;
  }
  if (o === "}") return false;
  if (P.stopToken === "]" && o === "]") return false;
  return true;
}
//@ chunk-k5vy5m8c.js:19720-23489 fingerprint = tryParseRedirect (0.898)
/**
 * 尝试解析一个重定向（含 fd 前缀、{var}、>&、&>、<<、<<<、heredoc 登记）。
 */
function tryParseRedirect(P, greedy = false) {
  let save = saveLex(P.L);
  skipBlanks(P.L);
  let fd = null;
  if (isDigit(peek(P.L))) {
    let startB = P.L.b;
    let j = P.L.i;
    while (j < P.L.len && isDigit(P.L.src[j])) j++;
    let after = j < P.L.len ? P.L.src[j] : "";
    if (after === ">" || after === "<") {
      while (P.L.i < j) advance(P.L);
      fd = makeNode(P, "file_descriptor", startB, P.L.b, []);
    }
  }
  if (fd === null && peek(P.L) === "{") {
    let a = P.L.i + 1;
    if (a < P.L.len && /[A-Za-z_]/.test(P.L.src[a])) {
      while (a < P.L.len && /[A-Za-z0-9_]/.test(P.L.src[a])) a++;
      if (P.L.src[a] === "[") {
        let c = 0;
        let f = false;
        let u = false;
        while (a < P.L.len) {
          let d = P.L.src[a];
          if (f) {
            if (d === "'") f = false;
          } else if (u) {
            if (d === "\\" && a + 1 < P.L.len) a++;
            else if (d === '"') u = false;
          } else if (d === "\\" && a + 1 < P.L.len) a++;
          else if (d === "'") f = true;
          else if (d === '"') u = true;
          else if (d === "[") c++;
          else if (d === "]") {
            c--;
            if (c === 0) {
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
          fd = makeNode(P, "variable_name", f, P.L.b, []);
        }
      }
    }
  }
  let t = nextToken(P.L, "arg");
  if (t.type !== "OP") {
    restoreLex(P.L, save);
    return null;
  }
  let v = t.value;
  if (v === "<<<") {
    let op = leaf(P, "<<<", t);
    skipBlanks(P.L);
    let target = parseWord(P, "arg");
    let end = target ? target.endIndex : op.endIndex;
    let kids = target ? [op, target] : [op];
    return makeNode(
      P,
      "herestring_redirect",
      fd ? fd.startIndex : op.startIndex,
      end,
      fd ? [fd, ...kids] : kids,
    );
  }
  if (v === "<<" || v === "<<-") {
    let op = leaf(P, v, t);
    skipBlanksNoCR(P.L);
    let dStart = P.L.b;
    let quoted = false;
    let delim = "";
    let dc = peek(P.L);
    if (dc === "'" || dc === '"') {
      quoted = true;
      advance(P.L);
      while (P.L.i < P.L.len && peek(P.L) !== dc) {
        delim += peek(P.L);
        advance(P.L);
      }
      if (P.L.i < P.L.len) advance(P.L);
    } else if (dc === "\\") {
      quoted = true;
      advance(P.L);
      if (
        P.L.i < P.L.len &&
        peek(P.L) !==
          `
`
      ) {
        delim += peek(P.L);
        advance(P.L);
      }
      while (P.L.i < P.L.len && isIdentChar(peek(P.L))) {
        delim += peek(P.L);
        advance(P.L);
      }
    } else
      while (P.L.i < P.L.len && isHeredocDelimChar(peek(P.L))) {
        delim += peek(P.L);
        advance(P.L);
      }
    let dEnd = P.L.b;
    if (dc === '"' && /[`$\\\n]/.test(delim)) {
      P.aborted = true;
      throw Error("heredoc delimiter contains substitution/escape chars");
    }
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
      ) {
        P.aborted = true;
        throw Error("heredoc delimiter word continues past scanned segment");
      }
    }
    if (/[\uD800-\uDFFF]/.test(delim)) {
      P.aborted = true;
      throw Error("heredoc delimiter contains astral/surrogate code unit");
    }
    let startNode = makeNode(P, "heredoc_start", dStart, dEnd, []);
    P.L.heredocs.push({
      delim,
      stripTabs: v === "<<-",
      quoted,
      bodyStart: 0,
      bodyEnd: 0,
      endStart: 0,
      endEnd: 0,
    });
    let kids = fd ? [fd, op, startNode] : [op, startNode];
    let startIdx = fd ? fd.startIndex : op.startIndex;
    while (true) {
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
        let rSave = saveLex(P.L);
        let k = tryParseRedirect(P);
        if (k && k.type === "file_redirect") {
          kids.push(k);
          continue;
        }
        restoreLex(P.L, rSave);
      }
      if (tc === "|" && peek(P.L, 1) !== "|") {
        let _ = P.L.b;
        advance(P.L);
        skipBlanks(P.L);
        let pipeCmds = [];
        while (true) {
          let cmd = parseCommand(P);
          if (!cmd) break;
          pipeCmds.push(cmd);
          skipBlanks(P.L);
          if (peek(P.L) === "|" && peek(P.L, 1) !== "|") {
            let ps = P.L.b;
            advance(P.L);
            pipeCmds.push(makeNode(P, "|", ps, P.L.b, []));
            skipBlanks(P.L);
            continue;
          }
          break;
        }
        if (pipeCmds.length > 0) {
          let last = pipeCmds.at(-1);
          kids.push(makeNode(P, "pipeline", pipeCmds[0].startIndex, last.endIndex, pipeCmds));
        } else kids.push(makeNode(P, "ERROR", _, P.L.b, []));
        continue;
      }
      if ((tc === "&" && peek(P.L, 1) === "&") || (tc === "|" && peek(P.L, 1) === "|")) {
        let _ = P.L.b;
        advance(P.L);
        advance(P.L);
        skipBlanks(P.L);
        let rhs = parseCommand(P);
        if (rhs) kids.push(rhs);
        else kids.push(makeNode(P, "ERROR", _, P.L.b, []));
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
        kids.push(makeNode(P, "ERROR", eStart, P.L.b, []));
        break;
      }
      let word = parseWord(P, "arg");
      if (word) {
        kids.push(word);
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
      if (P.L.b > eStart) kids.push(makeNode(P, "ERROR", eStart, P.L.b, []));
      break;
    }
    return makeNode(P, "heredoc_redirect", startIdx, P.L.b, kids);
  }
  if (v === "<&-" || v === ">&-") {
    let op = leaf(P, v, t);
    let kids = [];
    if (fd) kids.push(fd);
    kids.push(op);
    skipBlanks(P.L);
    let dSave = saveLex(P.L);
    let dest = isRedirectLiteralStart(P) ? parseWord(P, "arg") : null;
    if (dest) kids.push(dest);
    else restoreLex(P.L, dSave);
    let startIdx = fd ? fd.startIndex : op.startIndex;
    let end = dest ? dest.endIndex : op.endIndex;
    return makeNode(P, "file_redirect", startIdx, end, kids);
  }
  if (
    v === ">" ||
    v === ">>" ||
    v === ">&" ||
    v === ">|" ||
    v === "&>" ||
    v === "&>>" ||
    v === "<" ||
    v === "<&"
  ) {
    let op = leaf(P, v, t);
    let kids = [];
    if (fd) kids.push(fd);
    kids.push(op);
    let end = op.endIndex;
    let taken = 0;
    while (true) {
      skipBlanks(P.L);
      if (!isRedirectLiteralStart(P)) break;
      if (!greedy && taken >= 1) break;
      let tc = peek(P.L);
      let tc1 = peek(P.L, 1);
      let target = null;
      if ((tc === "<" || tc === ">") && tc1 === "(") target = parseProcessSub(P);
      else target = parseWord(P, "arg");
      if (!target) break;
      kids.push(target);
      end = target.endIndex;
      taken++;
    }
    let startIdx = fd ? fd.startIndex : op.startIndex;
    return makeNode(P, "file_redirect", startIdx, end, kids);
  }
  restoreLex(P.L, save);
  return null;
}
//@ chunk-k5vy5m8c.js:23489-23791 fingerprint = parseProcessSub (1)
function parseProcessSub(P) {
  let o = peek(P.L);
  if ((o !== "<" && o !== ">") || peek(P.L, 1) !== "(") return null;
  let start = P.L.b;
  advance(P.L);
  advance(P.L);
  let open = makeNode(P, o + "(", start, P.L.b, []);
  let body = parseStatements(P, ")");
  skipBlanks(P.L);
  let close;
  if (peek(P.L) === ")") {
    let cs = P.L.b;
    advance(P.L);
    close = makeNode(P, ")", cs, P.L.b, []);
  } else close = makeNode(P, ")", P.L.b, P.L.b, []);
  return makeNode(P, "process_substitution", start, close.endIndex, [open, ...body, close]);
}
//@ chunk-k5vy5m8c.js:23791-24702 fingerprint = scanHeredocBodies (0.838)
/**
 * 在换行处扫描挂起的 heredoc 正文，回填 heredoc_body/heredoc_end 节点。
 */
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
    if (hd.stripTabs && hd.delim.startsWith("\t")) {
      P.aborted = true;
      throw Error("ambiguous heredoc terminator (<<- tab-prefixed delim)");
    }
    while (P.L.i < P.L.len) {
      let lineStart = P.L.i;
      let lineStartB = P.L.b;
      let checkI = lineStart;
      if (hd.stripTabs) while (checkI < P.L.len && P.L.src[checkI] === "\t") checkI++;
      if (P.L.src.startsWith(hd.delim, checkI)) {
        let a = checkI + delimLen;
        let c = a < P.L.len ? P.L.src[a] : "";
        if (
          c === "" ||
          c ===
            `
` ||
          c === "\r"
        ) {
          hd.bodyEnd = lineStartB;
          while (P.L.i < checkI) advance(P.L);
          hd.endStart = P.L.b;
          for (let k = 0; k < delimLen; k++) advance(P.L);
          hd.endEnd = P.L.b;
          if (
            P.L.i < P.L.len &&
            P.L.src[P.L.i] ===
              `
`
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
          if (u === ")" || u === "`" || u === "}") {
            P.aborted = true;
            throw Error("ambiguous heredoc terminator (shell_eof_token)");
          }
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
    hd.bodyEnd = P.L.b;
    hd.endStart = P.L.b;
    hd.endEnd = P.L.b;
  }
}
//@ chunk-k5vy5m8c.js:24702-25295 fingerprint = parseHeredocBodyContent (0.888)
function parseHeredocBodyContent(P, start, end) {
  let saved = saveLex(P.L);
  restoreLexToByte(P, start);
  let out = [];
  let contentStart = P.L.b;
  let sawExpansion = false;
  while (P.L.b < end) {
    let c = peek(P.L);
    if (c === "\\") {
      let nxt = peek(P.L, 1);
      if (nxt === "$" || nxt === "`" || nxt === "\\") {
        advance(P.L);
        advance(P.L);
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
      P.inDquote--;
      if (
        exp &&
        (exp.type === "simple_expansion" ||
          exp.type === "expansion" ||
          exp.type === "command_substitution" ||
          exp.type === "arithmetic_expansion" ||
          exp.type === "ERROR")
      ) {
        if (sawExpansion && preB > contentStart)
          out.push(makeNode(P, "heredoc_content", contentStart, preB, []));
        out.push(exp);
        contentStart = P.L.b;
        sawExpansion = true;
      }
      continue;
    }
    advance(P.L);
  }
  if (sawExpansion) out.push(makeNode(P, "heredoc_content", contentStart, end, []));
  restoreLex(P.L, saved);
  return out;
}
//@ chunk-k5vy5m8c.js:25295-25445 fingerprint = restoreLexToByte (1)
function restoreLexToByte(P, targetByte) {
  if (!P.L.byteTable) byteAt(P.L, 0);
  let byteTable = P.L.byteTable;
  let lo = 0;
  let hi = P.src.length;
  while (lo < hi) {
    let m = (lo + hi) >>> 1;
    if (byteTable[m] < targetByte) lo = m + 1;
    else hi = m;
  }
  P.L.i = lo;
  P.L.b = targetByte;
}
//@ chunk-k5vy5m8c.js:25445-26959 fingerprint = parseWord (1)
/**
 * 解析一个词（裸词、引号串、$ 展开、反引号、花括号、拼接）。
 */
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
        let dTok = {
          type: "DOLLAR",
          value: "$",
          start: P.L.b,
          end: P.L.b + 1,
        };
        advance(P.L);
        parts.push(leaf(P, "$", dTok));
        parts.push(parseDoubleQuoted(P));
        continue;
      }
      if (c1 === "`") {
        let u = {
          type: "DOLLAR",
          value: "$",
          start: P.L.b,
          end: P.L.b + 1,
        };
        advance(P.L);
        parts.push(leaf(P, "$", u));
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
        advance(P.L);
        parts.push(makeNode(P, "word", bStart, P.L.b, []));
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
      advance(P.L);
      parts.push(makeNode(P, "word", bStart, P.L.b, []));
      continue;
    }
    if (r === "[" || r === "]") {
      let bStart = P.L.b;
      advance(P.L);
      parts.push(makeNode(P, "word", bStart, P.L.b, []));
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
        parts.push(makeNode(P, "number", frag.startIndex, exp.endIndex, [exp]));
        continue;
      }
    }
    parts.push(frag);
  }
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  let first = parts[0];
  let last = parts.at(-1);
  return makeNode(P, "concatenation", first.startIndex, last.endIndex, parts);
}
//@ chunk-k5vy5m8c.js:26959-27431 fingerprint = parseBareWord (1)
function parseBareWord(P) {
  let start = P.L.b;
  let startI = P.L.i;
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
      advance(P.L);
      advance(P.L);
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
  let text = P.src.slice(startI, P.L.i);
  let type = /^-?\d+$/.test(text) ? "number" : "word";
  return makeNode(P, type, start, P.L.b, []);
}
//@ chunk-k5vy5m8c.js:27431-28102 fingerprint = tryParseBraceExpr (1)
function tryParseBraceExpr(P) {
  let save = saveLex(P.L);
  if (peek(P.L) !== "{") return null;
  let oStart = P.L.b;
  advance(P.L);
  let oEnd = P.L.b;
  let p1Start = P.L.b;
  while (isDigit(peek(P.L)) || isIdentStart(peek(P.L))) advance(P.L);
  let p1End = P.L.b;
  if (p1End === p1Start || peek(P.L) !== "." || peek(P.L, 1) !== ".") {
    restoreLex(P.L, save);
    return null;
  }
  let dotStart = P.L.b;
  advance(P.L);
  advance(P.L);
  let dotEnd = P.L.b;
  let p2Start = P.L.b;
  while (isDigit(peek(P.L)) || isIdentStart(peek(P.L))) advance(P.L);
  let p2End = P.L.b;
  if (p2End === p2Start || peek(P.L) !== "}") {
    restoreLex(P.L, save);
    return null;
  }
  let cStart = P.L.b;
  advance(P.L);
  let cEnd = P.L.b;
  let p1Text = sliceBytes(P, p1Start, p1End);
  let p2Text = sliceBytes(P, p2Start, p2End);
  let p1IsNum = /^\d+$/.test(p1Text);
  let p2IsNum = /^\d+$/.test(p2Text);
  if (p1IsNum !== p2IsNum) {
    restoreLex(P.L, save);
    return null;
  }
  if (!p1IsNum && (p1Text.length !== 1 || p2Text.length !== 1)) {
    restoreLex(P.L, save);
    return null;
  }
  let p1Type = p1IsNum ? "number" : "word";
  let p2Type = p2IsNum ? "number" : "word";
  return makeNode(P, "brace_expression", oStart, cEnd, [
    makeNode(P, "{", oStart, oEnd, []),
    makeNode(P, p1Type, p1Start, p1End, []),
    makeNode(P, "..", dotStart, dotEnd, []),
    makeNode(P, p2Type, p2Start, p2End, []),
    makeNode(P, "}", cStart, cEnd, []),
  ]);
}
//@ chunk-k5vy5m8c.js:28102-28833 fingerprint = tryParseBraceLikeCat (1)
function tryParseBraceLikeCat(P) {
  if (peek(P.L) !== "{") return null;
  let oStart = P.L.b;
  advance(P.L);
  let oEnd = P.L.b;
  let inner = [makeNode(P, "word", oStart, oEnd, [])];
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
      advance(P.L);
      inner.push(makeNode(P, "word", bStart, P.L.b, []));
      continue;
    }
    let midStart = P.L.b;
    while (P.L.i < P.L.len) {
      let mc = peek(P.L);
      if (mc === "\\" && P.L.i + 1 < P.L.len) {
        advance(P.L);
        advance(P.L);
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
      let midText = sliceBytes(P, midStart, midEnd);
      let midType = /^-?\d+$/.test(midText) ? "number" : "word";
      inner.push(makeNode(P, midType, midStart, midEnd, []));
    } else break;
  }
  if (peek(P.L) === "}") {
    let cStart = P.L.b;
    advance(P.L);
    inner.push(makeNode(P, "word", cStart, P.L.b, []));
  }
  return inner;
}
//@ chunk-k5vy5m8c.js:28833-29683 fingerprint = parseDoubleQuoted (0.926)
function parseDoubleQuoted(P) {
  let qStart = P.L.b;
  advance(P.L);
  P.inDquote++;
  let qEnd = P.L.b;
  let parts = [makeNode(P, '"', qStart, qEnd, [])];
  let contentStart = P.L.b;
  let contentStartI = P.L.i;
  let flushContent = () => {
    if (P.L.b > contentStart) {
      let txt = P.src.slice(contentStartI, P.L.i);
      if (!/^[ \t]+$/.test(txt)) parts.push(makeNode(P, "string_content", contentStart, P.L.b, []));
    }
  };
  while (P.L.i < P.L.len) {
    let u = peek(P.L);
    if (u === '"') break;
    if (u === "\\" && P.L.i + 1 < P.L.len) {
      advance(P.L);
      advance(P.L);
      continue;
    }
    if (
      u ===
      `
`
    ) {
      flushContent();
      advance(P.L);
      contentStart = P.L.b;
      contentStartI = P.L.i;
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
        contentStart = P.L.b;
        contentStartI = P.L.i;
        continue;
      }
      if (c1 !== '"' && c1 !== "") {
        flushContent();
        let dS = P.L.b;
        advance(P.L);
        parts.push(makeNode(P, "$", dS, P.L.b, []));
        contentStart = P.L.b;
        contentStartI = P.L.i;
        continue;
      }
    }
    if (u === "`") {
      flushContent();
      let bt = parseBacktick(P);
      parts.push(bt);
      contentStart = P.L.b;
      contentStartI = P.L.i;
      continue;
    }
    advance(P.L);
  }
  flushContent();
  let close;
  if (peek(P.L) === '"') {
    let cStart = P.L.b;
    advance(P.L);
    close = makeNode(P, '"', cStart, P.L.b, []);
  } else close = makeNode(P, '"', P.L.b, P.L.b, []);
  parts.push(close);
  P.inDquote--;
  return makeNode(P, "string", qStart, close.endIndex, parts);
}
//@ chunk-k5vy5m8c.js:29683-33849 fingerprint = parseDollarLike (0.813)
/**
 * 解析 $ 开头的结构：$var、${…}、$(…)、$((…))、$'…'、$"…"。
 */
function parseDollarLike(P) {
  let c1 = peek(P.L, 1);
  let dStart = P.L.b;
  if (c1 === "(" && peek(P.L, 2) === "(") {
    advance(P.L);
    advance(P.L);
    advance(P.L);
    let open = makeNode(P, "$((", dStart, P.L.b, []);
    let f = saveLex(P.L);
    let exprs = parseArithCommaList(P, "))", "var");
    skipBlanks(P.L);
    let close;
    let b = false;
    if (peek(P.L) !== ")" || peek(P.L, 1) !== ")") {
      skipToArithStop(P, f, "))");
      b = true;
    }
    if (peek(P.L) === ")" && peek(P.L, 1) === ")") {
      let cStart = P.L.b;
      advance(P.L);
      advance(P.L);
      close = makeNode(P, "))", cStart, P.L.b, []);
    } else close = makeNode(P, "))", P.L.b, P.L.b, []);
    return makeNode(P, b ? "ERROR" : "arithmetic_expansion", dStart, close.endIndex, [open, ...exprs, close]);
  }
  if (c1 === "[") {
    advance(P.L);
    advance(P.L);
    let open = makeNode(P, "$[", dStart, P.L.b, []);
    let f = saveLex(P.L);
    let exprs = parseArithCommaList(P, "]", "var");
    skipBlanks(P.L);
    let close;
    let b = false;
    if (peek(P.L) !== "]") {
      skipToArithStop(P, f, "]");
      b = true;
    }
    if (peek(P.L) === "]") {
      let cStart = P.L.b;
      advance(P.L);
      close = makeNode(P, "]", cStart, P.L.b, []);
    } else close = makeNode(P, "]", P.L.b, P.L.b, []);
    return makeNode(P, b ? "ERROR" : "arithmetic_expansion", dStart, close.endIndex, [open, ...exprs, close]);
  }
  if (c1 === "(") {
    advance(P.L);
    advance(P.L);
    let open = makeNode(P, "$(", dStart, P.L.b, []);
    let inDquote = P.inDquote;
    P.inDquote = 0;
    let body = parseStatements(P, ")");
    P.inDquote = inDquote;
    skipBlanks(P.L);
    let d;
    let b = false;
    if (peek(P.L) === ")") {
      let cStart = P.L.b;
      advance(P.L);
      d = makeNode(P, ")", cStart, P.L.b, []);
    } else {
      b = true;
      P.zshBraceDiff = true;
      let p = P.L.b;
      let h = 1;
      while (P.L.i < P.L.len) {
        let I = peek(P.L);
        if (I === "\\" && P.L.i + 1 < P.L.len) {
          advance(P.L);
          advance(P.L);
          continue;
        }
        if (I === '"' || I === "'") {
          skipQuotedSpan(P, I);
          if (P.L.i < P.L.len) advance(P.L);
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
          advance(P.L);
          advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "'") {
          skipQuotedSpan(P, "$'");
          if (P.L.i < P.L.len) advance(P.L);
          continue;
        }
        if (I === "(") h++;
        else if (I === ")") {
          h--;
          if (h === 0) break;
        }
        advance(P.L);
      }
      body.push(makeNode(P, "ERROR", p, P.L.b, []));
      if (peek(P.L) === ")") {
        let I = P.L.b;
        advance(P.L);
        d = makeNode(P, ")", I, P.L.b, []);
      } else d = makeNode(P, "ERROR", P.L.b, P.L.b, []);
    }
    if (
      !b &&
      body.length === 1 &&
      body[0].type === "redirected_statement" &&
      body[0].children.length === 1 &&
      body[0].children[0].type === "file_redirect"
    )
      body = [...body[0].children];
    return makeNode(P, b ? "ERROR" : "command_substitution", dStart, d.endIndex, [open, ...body, d]);
  }
  if (c1 === "{") {
    advance(P.L);
    advance(P.L);
    let open = makeNode(P, "${", dStart, P.L.b, []);
    let inner = parseExpansionBody(P);
    let u;
    let d = false;
    while (
      peek(P.L) ===
      `
`
    )
      advance(P.L);
    if (peek(P.L) === "}") {
      let cStart = P.L.b;
      advance(P.L);
      u = makeNode(P, "}", cStart, P.L.b, []);
    } else {
      d = true;
      P.zshBraceDiff = true;
      let dEnd = P.L.b;
      let p = 1;
      while (P.L.i < P.L.len) {
        let I = peek(P.L);
        if (I === "\\" && P.L.i + 1 < P.L.len) {
          advance(P.L);
          advance(P.L);
          continue;
        }
        if (I === '"' || I === "'") {
          skipQuotedSpan(P, I);
          if (P.L.i < P.L.len) advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "(") {
          let T = 1;
          advance(P.L);
          advance(P.L);
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
          advance(P.L);
          advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "'") {
          skipQuotedSpan(P, "$'");
          if (P.L.i < P.L.len) advance(P.L);
          continue;
        }
        if (I === "$" && peek(P.L, 1) === "{") {
          p++;
          advance(P.L);
        } else if (I === "}") {
          p--;
          if (p === 0) break;
        }
        advance(P.L);
      }
      let node = makeNode(P, "ERROR", dEnd, P.L.b, []);
      if (peek(P.L) === "}") {
        let I = P.L.b;
        advance(P.L);
        u = makeNode(P, "}", I, P.L.b, []);
      } else u = makeNode(P, "ERROR", P.L.b, P.L.b, []);
      inner.push(node);
    }
    if (!d && P.inDquote > 0 && sliceBytes(P, open.endIndex, u.startIndex).includes("'")) d = true;
    if (!d && hasZshMultibyteName(sliceBytes(P, dStart, u.startIndex))) d = true;
    if (/\\\n|\$\[|\$\{[ \t\n|]/.test(sliceBytes(P, open.endIndex, u.startIndex))) P.zshBraceDiff = true;
    return makeNode(
      P,
      d || P.zshBraceDiff || P.dollarOperandDiff ? "ERROR" : "expansion",
      dStart,
      u.endIndex,
      [open, ...inner, u],
    );
  }
  if (c1 === "'") {
    skipQuotedSpan(P, "$'");
    if (peek(P.L) === "'") advance(P.L);
    return makeNode(P, "ansi_c_string", dStart, P.L.b, []);
  }
  advance(P.L);
  let dEnd = P.L.b;
  let dollar = makeNode(P, "$", dStart, dEnd, []);
  let nc = peek(P.L);
  if (nc >= "\x80") {
    while (isIdentChar(peek(P.L)) || peek(P.L) >= "\x80") advance(P.L);
    return makeNode(P, "ERROR", dStart, P.L.b, []);
  }
  if (nc === "_" && !isIdentChar(peek(P.L, 1)) && peek(P.L, 1) < "\x80") {
    let vStart = P.L.b;
    advance(P.L);
    let vn = makeNode(P, "special_variable_name", vStart, P.L.b, []);
    return makeNode(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  if (isIdentStart(nc)) {
    let vStart = P.L.b;
    while (isIdentChar(peek(P.L))) advance(P.L);
    if (peek(P.L) >= "\x80") {
      while (isIdentChar(peek(P.L)) || peek(P.L) >= "\x80") advance(P.L);
      return makeNode(P, "ERROR", dStart, P.L.b, []);
    }
    let vn = makeNode(P, "variable_name", vStart, P.L.b, []);
    return makeNode(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  let a = nc === "#" && !ZSH_PARAM_FLAG_CHARS.has(peek(P.L, 1));
  if (ZSH_PARAM_FLAG_CHARS.has(nc) && !a) {
    let c = scanNonAsciiParamName(P, P.L.i);
    if (c !== -1) {
      while (P.L.i < c) advance(P.L);
      return makeNode(P, "ERROR", dStart, P.L.b, []);
    }
  }
  if (isDigit(nc)) {
    let vStart = P.L.b;
    advance(P.L);
    let vn = makeNode(P, "variable_name", vStart, P.L.b, []);
    return makeNode(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  if (SPECIAL_VARS.has(nc)) {
    let vStart = P.L.b;
    advance(P.L);
    let vn = makeNode(P, "special_variable_name", vStart, P.L.b, []);
    return makeNode(P, "simple_expansion", dStart, P.L.b, [dollar, vn]);
  }
  return dollar;
}
//@ chunk-k5vy5m8c.js:33849-36522 fingerprint = parseExpansionBody (0.958)
function parseExpansionBody(P_2) {
  let out = [];
  skipBlanks(P_2.L);
  {
    let c0 = peek(P_2.L);
    let c1 = peek(P_2.L, 1);
    if (c0 === "#" && c1 === "!" && peek(P_2.L, 2) === "}") {
      advance(P_2.L);
      advance(P_2.L);
      return out;
    }
    if (c0 === "!" && c1 === "#") {
      let j = 2;
      if (peek(P_2.L, j) === "#") j++;
      if (peek(P_2.L, j) === " ") j++;
      if (peek(P_2.L, j) === "}") {
        while (j-- > 0) advance(P_2.L);
        return out;
      }
    }
  }
  if (peek(P_2.L) === "#") {
    let r = P_2.L.b;
    advance(P_2.L);
    out.push(makeNode(P_2, "#", r, P_2.L.b, []));
  }
  let pc = peek(P_2.L);
  if ((pc === "!" || pc === "=" || pc === "~") && (isIdentStart(peek(P_2.L, 1)) || isDigit(peek(P_2.L, 1)))) {
    let r = P_2.L.b;
    advance(P_2.L);
    out.push(makeNode(P_2, pc, r, P_2.L.b, []));
  }
  skipBlanks(P_2.L);
  if (isIdentStart(peek(P_2.L))) {
    let r = P_2.L.b;
    while (isIdentChar(peek(P_2.L))) advance(P_2.L);
    out.push(makeNode(P_2, "variable_name", r, P_2.L.b, []));
  } else if (isDigit(peek(P_2.L))) {
    let r = P_2.L.b;
    while (isDigit(peek(P_2.L))) advance(P_2.L);
    out.push(makeNode(P_2, "variable_name", r, P_2.L.b, []));
  } else if (SPECIAL_VARS.has(peek(P_2.L))) {
    let r = P_2.L.b;
    advance(P_2.L);
    out.push(makeNode(P_2, "special_variable_name", r, P_2.L.b, []));
  }
  if (peek(P_2.L) === "[") {
    let varNode = out.at(-1);
    let brOpen = P_2.L.b;
    advance(P_2.L);
    let brOpenNode = makeNode(P_2, "[", brOpen, P_2.L.b, []);
    let idx = parseSubscriptIndexInline(P_2);
    skipBlanks(P_2.L);
    let brClose = P_2.L.b;
    if (peek(P_2.L) === "]") advance(P_2.L);
    let brCloseNode = makeNode(P_2, "]", brClose, P_2.L.b, []);
    if (varNode) {
      let kids = idx ? [varNode, brOpenNode, idx, brCloseNode] : [varNode, brOpenNode, brCloseNode];
      out[out.length - 1] = makeNode(P_2, "subscript", varNode.startIndex, P_2.L.b, kids);
    } else {
      let b = idx ? [brOpenNode, idx, brCloseNode] : [brOpenNode, brCloseNode];
      out.push(makeNode(P_2, "ERROR", brOpen, P_2.L.b, b));
    }
  }
  skipBlanks(P_2.L);
  let tc = peek(P_2.L);
  if ((tc === "*" || tc === "@") && peek(P_2.L, 1) === "}") {
    let r = P_2.L.b;
    advance(P_2.L);
    out.push(makeNode(P_2, tc, r, P_2.L.b, []));
    return out;
  }
  if (tc === "@" && isIdentStart(peek(P_2.L, 1))) {
    let r = P_2.L.b;
    advance(P_2.L);
    out.push(makeNode(P_2, "@", r, P_2.L.b, []));
    while (isIdentChar(peek(P_2.L))) advance(P_2.L);
    return out;
  }
  let i = peek(P_2.L);
  if (i === ":") {
    let c1 = peek(P_2.L, 1);
    if (c1 === "}") {
      advance(P_2.L);
      return out;
    }
    if (c1 !== "-" && c1 !== "=" && c1 !== "?" && c1 !== "+") {
      advance(P_2.L);
      skipBlanks(P_2.L);
      let offC = peek(P_2.L);
      let off;
      if (offC === "-" && isDigit(peek(P_2.L, 1))) {
        let ns = P_2.L.b;
        advance(P_2.L);
        while (isDigit(peek(P_2.L))) advance(P_2.L);
        off = makeNode(P_2, "number", ns, P_2.L.b, []);
      } else off = parseArithExpr(P_2, ":}", "var");
      if (off) out.push(off);
      skipBlanks(P_2.L);
      if (peek(P_2.L) === ":") {
        advance(P_2.L);
        skipBlanks(P_2.L);
        let lenC = peek(P_2.L);
        let len;
        if (lenC === "-" && isDigit(peek(P_2.L, 1))) {
          let ns = P_2.L.b;
          advance(P_2.L);
          while (isDigit(peek(P_2.L))) advance(P_2.L);
          len = makeNode(P_2, "number", ns, P_2.L.b, []);
        } else len = parseArithExpr(P_2, "}", "var");
        if (len) out.push(len);
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
    let r = P_2.L.b;
    let c1 = peek(P_2.L, 1);
    let op = i;
    if (i === ":" && (c1 === "-" || c1 === "=" || c1 === "?" || c1 === "+")) {
      advance(P_2.L);
      advance(P_2.L);
      op = i + c1;
    } else if ((i === "#" || i === "%" || i === "/" || i === "^" || i === ",") && c1 === i) {
      advance(P_2.L);
      advance(P_2.L);
      op = i + i;
    } else advance(P_2.L);
    out.push(makeNode(P_2, op, r, P_2.L.b, []));
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
        advance(P_2.L);
        out.push(makeNode(P_2, ac, aStart, P_2.L.b, []));
      }
      if (peek(P_2.L) === '"') {
        out.push(parseDoubleQuoted(P_2));
        let tail = parseExpansionRest(P_2, "regex", true);
        if (tail) out.push(tail);
      } else {
        let regex = parseExpansionRest(P_2, "regex", true);
        if (regex) out.push(regex);
      }
      if (peek(P_2.L) === "/") {
        let sepStart = P_2.L.b;
        advance(P_2.L);
        out.push(makeNode(P_2, "/", sepStart, P_2.L.b, []));
        let repl = parseExpansionRest(P_2, "replword", false);
        if (repl)
          if (
            repl.type === "concatenation" &&
            repl.children.length === 2 &&
            repl.children[0].type === "command_substitution"
          ) {
            out.push(repl.children[0]);
            out.push(repl.children[1]);
          } else out.push(repl);
      }
    } else if (op === "#" || op === "##" || op === "%" || op === "%%")
      for (let u of parseExpansionRegexSegmented(P_2)) out.push(u);
    else {
      let rest = parseExpansionRest(P_2, isPattern ? "regex" : "word", false);
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
    let elems = [makeNode(P, "(", start, P.L.b, [])];
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
          advance(P.L);
          advance(P.L);
          continue;
        }
        if (wc === "$" && peek(P.L, 1) === "$") {
          advance(P.L);
          advance(P.L);
          continue;
        }
        if (wc === "$" && peek(P.L, 1) === "'") {
          skipQuotedSpan(P, "$'");
          if (peek(P.L) === "'") advance(P.L);
          continue;
        }
        if (wc === "$" && peek(P.L, 1) === "(") P.zshBraceDiff = true;
        if (wc === '"' || wc === "'") {
          skipQuotedSpan(P, wc);
          if (peek(P.L) === wc) advance(P.L);
          continue;
        }
        if (wc === "`") {
          P.zshBraceDiff = true;
          advance(P.L);
          while (P.L.i < P.L.len && peek(P.L) !== "`") {
            if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            advance(P.L);
          }
          if (peek(P.L) === "`") advance(P.L);
          continue;
        }
        if (wc === "{") P.zshBraceDiff = true;
        advance(P.L);
      }
      if (P.L.b > wStart) elems.push(makeNode(P, "word", wStart, P.L.b, []));
      else break;
    }
    if (peek(P.L) === ")") {
      let cStart = P.L.b;
      advance(P.L);
      elems.push(makeNode(P, ")", cStart, P.L.b, []));
    }
    while (
      peek(P.L) ===
      `
`
    )
      advance(P.L);
    return makeNode(P, "array", start, P.L.b, elems);
  }
  if (nodeType === "regex") {
    while (P.L.i < P.L.len) {
      let u = peek(P.L);
      if (u === "{") P.zshBraceDiff = true;
      if (u === "}") break;
      if (stopAtSlash && u === "/") break;
      if (u === "\\" && P.L.i + 1 < P.L.len) {
        advance(P.L);
        advance(P.L);
        continue;
      }
      if (u === '"' || u === "'") {
        advance(P.L);
        let d = isCalmNautilusEnabled();
        while (P.L.i < P.L.len && peek(P.L) !== u) {
          if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) {
            if (u === "'" && d && peek(P.L, 1) === "'") P.zshBraceDiff = true;
            advance(P.L);
          } else if (u === '"' && d && !P.zshBraceDiff) {
            if (peek(P.L) === "`") P.zshBraceDiff = true;
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
              if (c1 === "{" || c1 === "(" || c1 === "[") P.zshBraceDiff = true;
            }
          }
          advance(P.L);
        }
        if (peek(P.L) === u) advance(P.L);
        continue;
      }
      if (u === "`") {
        P.zshBraceDiff = true;
        advance(P.L);
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
          if (b % 2 === 0 && peek(P.L, b) === "{") P.dollarOperandDiff = true;
          for (let k = 1; k < b; k++) advance(P.L);
          continue;
        }
        if (d === "{") {
          let b = 0;
          advance(P.L);
          advance(P.L);
          b++;
          while (P.L.i < P.L.len && b > 0) {
            let nc = peek(P.L);
            if (nc === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
            else if (nc === "$" && peek(P.L, 1) === "$") advance(P.L);
            else if (nc === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
            else if (nc === '"' || nc === "'") skipQuotedSpan(P, nc);
            else if (nc === "`") {
              P.zshBraceDiff = true;
              advance(P.L);
              while (P.L.i < P.L.len && peek(P.L) !== "`") {
                if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
                advance(P.L);
              }
            } else if (nc === "$" && peek(P.L, 1) === "{") {
              b++;
              advance(P.L);
            } else if (nc === "$" && peek(P.L, 1) === "(") P.zshBraceDiff = true;
            else if (nc === "{") P.zshBraceDiff = true;
            else if (nc === "}") b--;
            advance(P.L);
          }
          continue;
        }
        if (d === "(") {
          P.zshBraceDiff = true;
          let b = 0;
          advance(P.L);
          advance(P.L);
          b++;
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
    return makeNode(P, "regex", start, end, []);
  }
  let parts = [];
  let segStart = P.L.b;
  let flushSeg = () => {
    if (P.L.b > segStart) parts.push(makeNode(P, "word", segStart, P.L.b, []));
  };
  while (P.L.i < P.L.len) {
    let f = peek(P.L);
    if (f === "}") break;
    if (f === "{") P.zshBraceDiff = true;
    if (stopAtSlash && f === "/") break;
    if (f === "\\" && P.L.i + 1 < P.L.len) {
      advance(P.L);
      advance(P.L);
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
        skipQuotedSpan(P, "$'");
        if (peek(P.L) === "'") advance(P.L);
        parts.push(makeNode(P, "ansi_c_string", aStart, P.L.b, []));
        segStart = P.L.b;
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
      flushSeg();
      parts.push(parseDoubleQuoted(P));
      segStart = P.L.b;
      continue;
    }
    if (f === "'") {
      flushSeg();
      let rStart = P.L.b;
      skipQuotedSpan(P, f);
      if (peek(P.L) === "'") advance(P.L);
      parts.push(makeNode(P, "raw_string", rStart, P.L.b, []));
      segStart = P.L.b;
      continue;
    }
    if ((f === "<" || f === ">") && c1 === "(") {
      P.zshBraceDiff = true;
      flushSeg();
      let ps = parseProcessSub(P);
      if (ps) parts.push(ps);
      segStart = P.L.b;
      continue;
    }
    if (f === "`") {
      flushSeg();
      let bt = parseBacktick(P);
      parts.push(bt);
      segStart = P.L.b;
      continue;
    }
    advance(P.L);
  }
  flushSeg();
  if (parts.length > 1 && parts[0].type === "word" && /^[ \t]+$/.test(parts[0].text)) parts.shift();
  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];
  let last = parts.at(-1);
  return makeNode(P, "concatenation", parts[0].startIndex, last.endIndex, parts);
}
//@ chunk-k5vy5m8c.js:40380-42063 fingerprint = parseExpansionRegexSegmented (0.813)
function parseExpansionRegexSegmented(P) {
  let out = [];
  let segStart = P.L.b;
  let flushRegex = () => {
    if (P.L.b > segStart) out.push(makeNode(P, "regex", segStart, P.L.b, []));
  };
  while (P.L.i < P.L.len) {
    let i = peek(P.L);
    if (i === "}") break;
    if (i === "{") P.zshBraceDiff = true;
    if (i === "\\" && P.L.i + 1 < P.L.len) {
      advance(P.L);
      advance(P.L);
      continue;
    }
    if (i === '"') {
      flushRegex();
      out.push(parseDoubleQuoted(P));
      segStart = P.L.b;
      continue;
    }
    if (i === "'") {
      flushRegex();
      let rStart = P.L.b;
      advance(P.L);
      while (P.L.i < P.L.len && peek(P.L) !== "'") advance(P.L);
      if (peek(P.L) === "'") advance(P.L);
      out.push(makeNode(P, "raw_string", rStart, P.L.b, []));
      segStart = P.L.b;
      continue;
    }
    if (i === "`") {
      P.zshBraceDiff = true;
      advance(P.L);
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
        advance(P.L);
        advance(P.L);
        continue;
      }
      if (c1 === "'") {
        flushRegex();
        let a = P.L.b;
        skipQuotedSpan(P, "$'");
        if (peek(P.L) === "'") advance(P.L);
        out.push(makeNode(P, "ansi_c_string", a, P.L.b, []));
        segStart = P.L.b;
        continue;
      }
      if (c1 === "{") {
        let a = 1;
        advance(P.L);
        advance(P.L);
        while (P.L.i < P.L.len && a > 0) {
          let nc = peek(P.L);
          if (nc === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
          else if (nc === "$" && peek(P.L, 1) === "$") advance(P.L);
          else if (nc === "$" && peek(P.L, 1) === "'") skipQuotedSpan(P, "$'");
          else if (nc === '"' || nc === "'") skipQuotedSpan(P, nc);
          else if (nc === "`") {
            P.zshBraceDiff = true;
            advance(P.L);
            while (P.L.i < P.L.len && peek(P.L) !== "`") {
              if (peek(P.L) === "\\" && P.L.i + 1 < P.L.len) advance(P.L);
              advance(P.L);
            }
          } else if (nc === "$" && peek(P.L, 1) === "{") {
            a++;
            advance(P.L);
          } else if (nc === "$" && peek(P.L, 1) === "(") P.zshBraceDiff = true;
          else if (nc === "{") P.zshBraceDiff = true;
          else if (nc === "}") a--;
          advance(P.L);
        }
        continue;
      }
      if (c1 === "(") {
        P.zshBraceDiff = true;
        let a = 1;
        advance(P.L);
        advance(P.L);
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
  flushRegex();
  return out;
}
//@ chunk-k5vy5m8c.js:42063-43368 fingerprint = parseBacktick (0.693)
function parseBacktick(P) {
  let start = P.L.b;
  advance(P.L);
  let open = makeNode(P, "`", start, P.L.b, []);
  let s = P.L.i;
  {
    let u = false;
    while (s < P.L.len) {
      let d = P.L.src[s];
      if (d === "\\") {
        let b = P.L.src[s + 1];
        if (b === "`" || b === "$" || b === "\\") u = true;
        s += 2;
        continue;
      }
      if (d === "`") break;
      s++;
    }
    if (u) {
      let d = P.L.b;
      while (P.L.i < s) advance(P.L);
      let node = makeNode(P, "backtick_escape_unsupported", d, P.L.b, []);
      let p;
      if (peek(P.L) === "`") {
        let h = P.L.b;
        advance(P.L);
        p = makeNode(P, "`", h, P.L.b, []);
      } else p = makeNode(P, "`", P.L.b, P.L.b, []);
      return makeNode(P, "command_substitution", start, p.endIndex, [open, node, p]);
    }
  }
  P.inBacktick++;
  let inDquote = P.inDquote;
  P.inDquote = 0;
  let r = saveLex(P.L);
  let heredocs = P.L.heredocs;
  P.L.heredocs = [];
  let body = [];
  while (true) {
    skipBlanks(P.L);
    if (peek(P.L) === "`" || peek(P.L) === "") break;
    let save = saveLex(P.L);
    let t = nextToken(P.L, "cmd");
    if (t.type === "EOF" || t.type === "BACKTICK") {
      restoreLex(P.L, save);
      break;
    }
    if (t.type === "NEWLINE") continue;
    restoreLex(P.L, save);
    let stmt = parseAndOr(P);
    if (!stmt) break;
    body.push(stmt);
    skipBlanks(P.L);
    if (peek(P.L) === "`") break;
    let save2 = saveLex(P.L);
    let sep = nextToken(P.L, "cmd");
    if (sep.type === "OP" && (sep.value === ";" || sep.value === "&")) body.push(leaf(P, sep.value, sep));
    else if (sep.type !== "NEWLINE") restoreLex(P.L, save2);
  }
  P.L.heredocs = heredocs;
  P.inBacktick--;
  P.inDquote = inDquote;
  if (P.L.i !== s) {
    restoreLex(P.L, r);
    while (P.L.i < s) advance(P.L);
    body.length = 0;
    body.push(makeNode(P, "backtick_body_overrun", open.endIndex, P.L.b, []));
  }
  let close;
  if (peek(P.L) === "`") {
    let cStart = P.L.b;
    advance(P.L);
    close = makeNode(P, "`", cStart, P.L.b, []);
  } else close = makeNode(P, "`", P.L.b, P.L.b, []);
  if (body.length === 0) body.push(makeNode(P, "backtick_body_empty", open.endIndex, P.L.b, []));
  return makeNode(P, "command_substitution", start, close.endIndex, [open, ...body, close]);
}
//@ chunk-k5vy5m8c.js:43368-43967 fingerprint = parseIf (1)
function parseIf(P, ifTok) {
  let ifKw = leaf(P, "if", ifTok);
  let kids = [ifKw];
  let cond = parseStatements(P, null);
  kids.push(...cond);
  consumeKeyword(P, "then", kids);
  let body = parseStatements(P, null);
  kids.push(...body);
  while (true) {
    let save = saveLex(P.L);
    let t = nextToken(P.L, "cmd");
    if (t.type === "WORD" && t.value === "elif") {
      let eKw = leaf(P, "elif", t);
      let eCond = parseStatements(P, null);
      let eKids = [eKw, ...eCond];
      consumeKeyword(P, "then", eKids);
      let eBody = parseStatements(P, null);
      eKids.push(...eBody);
      let last = eKids.at(-1);
      kids.push(makeNode(P, "elif_clause", eKw.startIndex, last.endIndex, eKids));
    } else if (t.type === "WORD" && t.value === "else") {
      let elKw = leaf(P, "else", t);
      let elBody = parseStatements(P, null);
      let last = elBody.length > 0 ? elBody.at(-1) : elKw;
      kids.push(makeNode(P, "else_clause", elKw.startIndex, last.endIndex, [elKw, ...elBody]));
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  consumeKeyword(P, "fi", kids);
  let last = kids.at(-1);
  return makeNode(P, "if_statement", ifKw.startIndex, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:43967-44134 fingerprint = parseWhile (1)
function parseWhile(P, kwTok) {
  let kw = leaf(P, kwTok.value, kwTok);
  let kids = [kw];
  let cond = parseStatements(P, null);
  kids.push(...cond);
  let dg = parseDoGroup(P);
  if (dg) kids.push(dg);
  let last = kids.at(-1);
  return makeNode(P, "while_statement", kw.startIndex, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:44134-45635 fingerprint = parseFor (0.963)
function parseFor(P, forTok) {
  let forKw = leaf(P, forTok.value, forTok);
  skipBlanks(P.L);
  if (forTok.value === "for" && peek(P.L) === "(" && peek(P.L, 1) === "(") {
    let oStart = P.L.b;
    advance(P.L);
    advance(P.L);
    let open = makeNode(P, "((", oStart, P.L.b, []);
    let kids = [forKw, open];
    for (let k_2 = 0; k_2 < 3; k_2++) {
      skipBlanks(P.L);
      let es = parseArithCommaList(P, k_2 < 2 ? ";" : "))", "assign");
      kids.push(...es);
      if (k_2 < 2) {
        if (peek(P.L) === ";") {
          let N = P.L.b;
          advance(P.L);
          kids.push(makeNode(P, ";", N, P.L.b, []));
        }
      }
    }
    skipBlanks(P.L);
    if (peek(P.L) === ")" && peek(P.L, 1) === ")") {
      let cStart = P.L.b;
      advance(P.L);
      advance(P.L);
      kids.push(makeNode(P, "))", cStart, P.L.b, []));
    } else kids.push(makeNode(P, "))", P.L.b, P.L.b, []));
    let save = saveLex(P.L);
    let sep = nextToken(P.L, "cmd");
    if (sep.type === "OP" && sep.value === ";") kids.push(leaf(P, ";", sep));
    else if (sep.type !== "NEWLINE") restoreLex(P.L, save);
    let dg = parseDoGroup(P);
    if (dg) kids.push(dg);
    else {
      skipNewlines(P);
      skipBlanks(P.L);
      if (peek(P.L) === "{") {
        let bOpen = P.L.b;
        advance(P.L);
        let brace = makeNode(P, "{", bOpen, P.L.b, []);
        let body = parseStatements(P, "}");
        let bClose;
        if (peek(P.L) === "}") {
          let cs = P.L.b;
          advance(P.L);
          bClose = makeNode(P, "}", cs, P.L.b, []);
        } else bClose = makeNode(P, "}", P.L.b, P.L.b, []);
        kids.push(
          makeNode(P, "compound_statement", brace.startIndex, bClose.endIndex, [brace, ...body, bClose]),
        );
      }
    }
    let last = kids.at(-1);
    return makeNode(P, "c_style_for_statement", forKw.startIndex, last.endIndex, kids);
  }
  let kids = [forKw];
  let varTok = nextToken(P.L, "arg");
  if (varTok.type === "WORD" && isIdentStart(varTok.value[0] ?? "") && [...varTok.value].every(isIdentChar))
    kids.push(makeNode(P, "variable_name", varTok.start, varTok.end, []));
  else kids.push(makeNode(P, "ERROR", varTok.start, varTok.end, []));
  skipBlanks(P.L);
  let save = saveLex(P.L);
  let inTok = nextToken(P.L, "arg");
  if (inTok.type === "WORD" && inTok.value === "in") {
    kids.push(leaf(P, "in", inTok));
    while (true) {
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
      let word = parseWord(P, "arg");
      if (!word) break;
      kids.push(word);
    }
  } else restoreLex(P.L, save);
  let save2 = saveLex(P.L);
  let sep = nextToken(P.L, "cmd");
  if (sep.type === "OP" && sep.value === ";") kids.push(leaf(P, ";", sep));
  else if (sep.type !== "NEWLINE") restoreLex(P.L, save2);
  let dg = parseDoGroup(P);
  if (dg) kids.push(dg);
  let last = kids.at(-1);
  return makeNode(P, "for_statement", forKw.startIndex, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:45635-45858 fingerprint = parseDoGroup (1)
function parseDoGroup(P) {
  skipNewlines(P);
  let save = saveLex(P.L);
  let doTok = nextToken(P.L, "cmd");
  if (doTok.type !== "WORD" || doTok.value !== "do") {
    restoreLex(P.L, save);
    return null;
  }
  let doKw = leaf(P, "do", doTok);
  let body = parseStatements(P, null);
  let kids = [doKw, ...body];
  consumeKeyword(P, "done", kids);
  let last = kids.at(-1);
  return makeNode(P, "do_group", doKw.startIndex, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:45858-46217 fingerprint = parseCase (1)
function parseCase(P, caseTok) {
  let caseKw = leaf(P, "case", caseTok);
  let kids = [caseKw];
  skipBlanks(P.L);
  let word = parseWord(P, "arg");
  if (word) kids.push(word);
  skipBlanks(P.L);
  consumeKeyword(P, "in", kids);
  skipNewlines(P);
  while (true) {
    skipBlanks(P.L);
    skipNewlines(P);
    let save = saveLex(P.L);
    let t = nextToken(P.L, "arg");
    if (t.type === "WORD" && t.value === "esac") {
      kids.push(leaf(P, "esac", t));
      break;
    }
    if (t.type === "EOF") break;
    restoreLex(P.L, save);
    let item = parseCaseItem(P);
    if (!item) break;
    kids.push(item);
  }
  let last = kids.at(-1);
  return makeNode(P, "case_statement", caseKw.startIndex, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:46217-47332 fingerprint = parseCaseItem (1)
function parseCaseItem(P) {
  skipBlanks(P.L);
  let start = P.L.b;
  let kids = [];
  if (peek(P.L) === "(") {
    let f = P.L.b;
    advance(P.L);
    kids.push(makeNode(P, "(", f, P.L.b, []));
  }
  let isFirstAlt = true;
  while (true) {
    skipBlanks(P.L);
    let f = peek(P.L);
    if (f === ")" || f === "") break;
    let pats = parseCasePattern(P);
    if (pats.length === 0) break;
    if (!isFirstAlt && pats.length > 1) {
      let rewritten = pats.map((h) =>
        h.type === "extglob_pattern" ? makeNode(P, "word", h.startIndex, h.endIndex, []) : h,
      );
      let first = rewritten[0];
      let last = rewritten.at(-1);
      kids.push(makeNode(P, "concatenation", first.startIndex, last.endIndex, rewritten));
    } else kids.push(...pats);
    isFirstAlt = false;
    skipBlanks(P.L);
    if (
      peek(P.L) === "\\" &&
      peek(P.L, 1) ===
        `
`
    ) {
      advance(P.L);
      advance(P.L);
      skipBlanks(P.L);
    }
    if (peek(P.L) === "|") {
      let d = P.L.b;
      advance(P.L);
      kids.push(makeNode(P, "|", d, P.L.b, []));
      if (
        peek(P.L) === "\\" &&
        peek(P.L, 1) ===
          `
`
      ) {
        advance(P.L);
        advance(P.L);
      }
    } else break;
  }
  if (peek(P.L) === ")") {
    let f = P.L.b;
    advance(P.L);
    kids.push(makeNode(P, ")", f, P.L.b, []));
  }
  let body = parseStatements(P, null);
  kids.push(...body);
  let save = saveLex(P.L);
  let term = nextToken(P.L, "cmd");
  if (term.type === "OP" && (term.value === ";;" || term.value === ";&" || term.value === ";;&"))
    kids.push(leaf(P, term.value, term));
  else restoreLex(P.L, save);
  if (kids.length === 0) return null;
  if (body.length === 0)
    for (let i = 0; i < kids.length; i++) {
      let k = kids[i];
      if (k.type !== "extglob_pattern") continue;
      let text = sliceBytes(P, k.startIndex, k.endIndex);
      if (/^[-+?*@!][a-zA-Z]/.test(text) && !/[*?(]/.test(text))
        kids[i] = makeNode(P, "word", k.startIndex, k.endIndex, []);
    }
  let last = kids.at(-1);
  return makeNode(P, "case_item", start, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:47332-48218 fingerprint = parseCasePattern (1)
function parseCasePattern(P) {
  skipBlanks(P.L);
  let save = saveLex(P.L);
  let start = P.L.b;
  let startI = P.L.i;
  let parenDepth = 0;
  let hasDollar = false;
  let hasBracketOutsideParen = false;
  let hasQuote = false;
  while (P.L.i < P.L.len) {
    let b = peek(P.L);
    if (b === "\\" && P.L.i + 1 < P.L.len) {
      advance(P.L);
      advance(P.L);
      continue;
    }
    if (b === "$" && peek(P.L, 1) === "$") {
      hasDollar = true;
      advance(P.L);
      advance(P.L);
      continue;
    }
    let p = b === "$" && peek(P.L, 1) === "'";
    if (b === '"' || b === "'" || p) {
      hasQuote = true;
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
      parenDepth++;
      advance(P.L);
      continue;
    }
    if (parenDepth > 0) {
      if (b === ")") {
        parenDepth--;
        advance(P.L);
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
    if (b === "$") hasDollar = true;
    if (b === "[") hasBracketOutsideParen = true;
    advance(P.L);
  }
  if (P.L.b === start) return [];
  let text = P.src.slice(startI, P.L.i);
  let hasExtglobParen = /[*?+@!]\(/.test(text);
  if (hasQuote && !hasExtglobParen) {
    restoreLex(P.L, save);
    return parseCasePatternSegmented(P);
  }
  if (!hasExtglobParen && (hasDollar || hasBracketOutsideParen)) {
    restoreLex(P.L, save);
    let word = parseWord(P, "arg");
    return word ? [word] : [];
  }
  let type =
    hasExtglobParen || /[*?]/.test(text) || /^[-+?*@!][a-zA-Z]/.test(text) ? "extglob_pattern" : "word";
  return [makeNode(P, type, start, P.L.b, [])];
}
//@ chunk-k5vy5m8c.js:48218-48677 fingerprint = parseCasePatternSegmented (1)
function parseCasePatternSegmented(P) {
  let parts = [];
  let segStart = P.L.b;
  let segStartI = P.L.i;
  let flushSeg = () => {
    if (P.L.i > segStartI) {
      let t = P.src.slice(segStartI, P.L.i);
      let type = /[*?]/.test(t) ? "extglob_pattern" : "word";
      parts.push(makeNode(P, type, segStart, P.L.b, []));
    }
  };
  while (P.L.i < P.L.len) {
    let r = peek(P.L);
    if (r === "\\" && P.L.i + 1 < P.L.len) {
      advance(P.L);
      advance(P.L);
      continue;
    }
    if (r === '"') {
      flushSeg();
      parts.push(parseDoubleQuoted(P));
      segStart = P.L.b;
      segStartI = P.L.i;
      continue;
    }
    if (r === "'") {
      flushSeg();
      let tok = nextToken(P.L, "arg");
      parts.push(leaf(P, "raw_string", tok));
      segStart = P.L.b;
      segStartI = P.L.i;
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
  flushSeg();
  return parts;
}
//@ chunk-k5vy5m8c.js:48677-49148 fingerprint = parseFunction (0.97)
function parseFunction(P, fnTok) {
  let fnKw = leaf(P, "function", fnTok);
  skipBlanks(P.L);
  let nameTok = nextToken(P.L, "arg");
  let name = makeNode(P, "word", nameTok.start, nameTok.end, []);
  let kids = [fnKw, name];
  skipBlanks(P.L);
  if (peek(P.L) === "(" && peek(P.L, 1) === ")") {
    let f = nextToken(P.L, "cmd");
    kids.push(leaf(P, "(", f));
    let u = P.L.b;
    advance(P.L);
    kids.push(makeNode(P, ")", u, P.L.b, []));
  }
  skipBlanks(P.L);
  skipNewlines(P);
  let body = parseCommand(P);
  if (body)
    if (
      body.type === "redirected_statement" &&
      body.children.length >= 2 &&
      body.children[0].type === "compound_statement"
    )
      kids.push(...body.children);
    else kids.push(body);
  let last = kids.at(-1);
  return makeNode(P, "function_definition", fnKw.startIndex, last.endIndex, kids);
}
//@ chunk-k5vy5m8c.js:49148-49959 fingerprint = parseDeclaration (0.917)
function parseDeclaration(P, kwTok) {
  let kw = leaf(P, kwTok.value, kwTok);
  let kids = [kw];
  let i = [];
  while (true) {
    skipBlanks(P.L);
    let u = tryParseRedirect(P);
    if (u) {
      i.push(u);
      continue;
    }
    let d = peek(P.L);
    if (d === "(") {
      kids.push(makeNode(P, "variable_name", P.L.b, P.L.b + 1, []));
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
      let word = parseWord(P, "arg");
      if (word) {
        kids.push(word);
        continue;
      }
      break;
    }
    let save = saveLex(P.L);
    let tok = nextToken(P.L, "arg");
    if (tok.type === "WORD" || tok.type === "NUMBER") {
      if (tok.value.startsWith("-")) kids.push(leaf(P, "word", tok));
      else if (isIdentStart(tok.value[0] ?? ""))
        kids.push(makeNode(P, "variable_name", tok.start, tok.end, []));
      else kids.push(leaf(P, "word", tok));
    } else {
      restoreLex(P.L, save);
      break;
    }
  }
  let last = kids.at(-1);
  let node = makeNode(P, "declaration_command", kw.startIndex, last.endIndex, kids);
  if (i.length === 0) return node;
  let last_2 = i.at(-1);
  let max = Math.max(node.endIndex, last_2.endIndex);
  return makeNode(P, "redirected_statement", kw.startIndex, max, [node, ...i]);
}
//@ chunk-k5vy5m8c.js:49959-50574 fingerprint = parseUnset (0.898)
function parseUnset(P, kwTok) {
  let kw = leaf(P, "unset", kwTok);
  let kids = [kw];
  let i = [];
  while (true) {
    skipBlanks(P.L);
    let u = tryParseRedirect(P);
    if (u) {
      i.push(u);
      continue;
    }
    let d = peek(P.L);
    if (d === "(") {
      kids.push(makeNode(P, "variable_name", P.L.b, P.L.b + 1, []));
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
    if (arg.type === "word") {
      if (arg.text.startsWith("-")) kids.push(arg);
      else kids.push(makeNode(P, "variable_name", arg.startIndex, arg.endIndex, []));
    } else kids.push(arg);
  }
  let last = kids.at(-1);
  let node = makeNode(P, "unset_command", kw.startIndex, last.endIndex, kids);
  if (i.length === 0) return node;
  let last_2 = i.at(-1);
  let max = Math.max(node.endIndex, last_2.endIndex);
  return makeNode(P, "redirected_statement", kw.startIndex, max, [node, ...i]);
}
//@ chunk-k5vy5m8c.js:50574-50688 fingerprint = consumeKeyword (1)
function consumeKeyword(P, name, kids) {
  skipNewlines(P);
  let save = saveLex(P.L);
  let t = nextToken(P.L, "cmd");
  if (t.type === "WORD" && t.value === name) kids.push(leaf(P, name, t));
  else restoreLex(P.L, save);
}
//@ chunk-k5vy5m8c.js:50688-50720 layout
function parseTestExpr(e, closer) {
  return parseTestOr(e, closer);
}
//@ chunk-k5vy5m8c.js:50720-51018 fingerprint = parseTestOr (1)
function parseTestOr(P, closer) {
  let left = parseTestAnd(P, closer);
  if (!left) return null;
  while (true) {
    skipBlanks(P.L);
    let save = saveLex(P.L);
    if (closer === "]]" && peek(P.L) === "|" && peek(P.L, 1) === "|") {
      let i = P.L.b;
      advance(P.L);
      advance(P.L);
      let op = makeNode(P, "||", i, P.L.b, []);
      skipTestNewlinesAndComments(P, closer);
      let right = parseTestAnd(P, closer);
      if (!right) {
        restoreLex(P.L, save);
        break;
      }
      left = makeNode(P, "binary_expression", left.startIndex, right.endIndex, [left, op, right]);
    } else break;
  }
  return left;
}
//@ chunk-k5vy5m8c.js:51018-51316 layout = parseTestOr (1)
function parseTestAnd(P, closer) {
  let left = parseTestUnary(P, closer);
  if (!left) return null;
  while (true) {
    skipBlanks(P.L);
    let save = saveLex(P.L);
    if (closer === "]]" && peek(P.L) === "&" && peek(P.L, 1) === "&") {
      let i = P.L.b;
      advance(P.L);
      advance(P.L);
      let op = makeNode(P, "&&", i, P.L.b, []);
      skipTestNewlinesAndComments(P, closer);
      let right = parseTestUnary(P, closer);
      if (!right) {
        restoreLex(P.L, save);
        break;
      }
      left = makeNode(P, "binary_expression", left.startIndex, right.endIndex, [left, op, right]);
    } else break;
  }
  return left;
}
//@ chunk-k5vy5m8c.js:51316-51462 callgraph-witnessed = parseTestAnd (0.276)
function skipTestNewlinesAndComments(P, closer) {
  skipBlanks(P.L);
  if (closer === "]]")
    while (true) {
      let t = peek(P.L);
      if (
        t ===
        `
`
      ) {
        advance(P.L);
        skipBlanks(P.L);
      } else if (t === "#")
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
  skipTestNewlinesAndComments(P, closer);
  if (peek(P.L) === "(") {
    let s = P.L.b;
    advance(P.L);
    let open = makeNode(P, "(", s, P.L.b, []);
    let inner = parseTestOr(P, closer);
    skipBlanks(P.L);
    let close;
    if (peek(P.L) === ")") {
      let cs = P.L.b;
      advance(P.L);
      close = makeNode(P, ")", cs, P.L.b, []);
    } else close = makeNode(P, ")", P.L.b, P.L.b, []);
    let kids = inner ? [open, inner, close] : [open, close];
    return makeNode(P, "parenthesized_expression", open.startIndex, close.endIndex, kids);
  }
  return parseTestBinary(P, closer);
}
//@ chunk-k5vy5m8c.js:51763-52712 fingerprint = parseTestNegatablePrimary (0.716)
function parseTestNegatablePrimary(P, closer) {
  skipTestNewlinesAndComments(P, closer);
  let t = peek(P.L);
  let s = (i) =>
    i === " " ||
    i === "\t" ||
    i ===
      `
` ||
    i === "";
  if (t === "!" && (s(peek(P.L, 1)) || peek(P.L, 1) === "(")) {
    let i = P.L.b;
    advance(P.L);
    let bang = makeNode(P, "!", i, P.L.b, []);
    let inner = parseTestNegatablePrimary(P, closer);
    if (!inner) return bang;
    return makeNode(P, "unary_expression", bang.startIndex, inner.endIndex, [bang, inner]);
  }
  if (t === "(") {
    let i = P.L.b;
    advance(P.L);
    let node = makeNode(P, "(", i, P.L.b, []);
    let testOr = parseTestOr(P, closer);
    skipBlanks(P.L);
    let c;
    if (peek(P.L) === ")") {
      let u = P.L.b;
      advance(P.L);
      c = makeNode(P, ")", u, P.L.b, []);
    } else c = makeNode(P, ")", P.L.b, P.L.b, []);
    let f = testOr ? [node, testOr, c] : [node, c];
    return makeNode(P, "parenthesized_expression", node.startIndex, c.endIndex, f);
  }
  if (t === "-" && isIdentStart(peek(P.L, 1))) {
    let i = saveLex(P.L);
    let r = P.L.b;
    advance(P.L);
    while (isIdentChar(peek(P.L))) advance(P.L);
    if (!s(peek(P.L))) {
      restoreLex(P.L, i);
      return parseTestPrimary(P, closer);
    }
    let op = makeNode(P, "test_operator", r, P.L.b, []);
    let c = P.L.i;
    skipBlanks(P.L);
    let arg = parseTestPrimary(P, closer);
    if (!arg) {
      let sliced = P.src.slice(c, P.L.i);
      if (!/^(?:[ \t]|\\\n)*$/.test(sliced)) {
        let node = makeNode(P, "test_rhs_missing", op.endIndex, P.L.b, []);
        return makeNode(P, "unary_expression", op.startIndex, P.L.b, [op, node]);
      }
      return op;
    }
    return makeNode(P, "unary_expression", op.startIndex, arg.endIndex, [op, arg]);
  }
  return parseTestPrimary(P, closer);
}
//@ chunk-k5vy5m8c.js:52712-52840 layout = parseTestOr (0.828)
function makeMissingRhsBinary(e, o, t) {
  let node = makeNode(e, "test_rhs_missing", t.endIndex, e.L.b, []);
  return makeNode(e, "binary_expression", o.startIndex, e.L.b, [o, t, node]);
}
//@ chunk-k5vy5m8c.js:52840-54349 fingerprint = parseTestBinary (1)
function parseTestBinary(P, closer) {
  skipBlanks(P.L);
  let left = parseTestNegatablePrimary(P, closer);
  if (!left) return null;
  skipBlanks(P.L);
  let s = peek(P.L);
  let c1 = peek(P.L, 1);
  let op = null;
  let os = P.L.b;
  if (s === "=" && c1 === "=") {
    advance(P.L);
    advance(P.L);
    op = makeNode(P, "==", os, P.L.b, []);
  } else if (s === "!" && c1 === "=") {
    advance(P.L);
    advance(P.L);
    op = makeNode(P, "!=", os, P.L.b, []);
  } else if (s === "=" && c1 === "~") {
    advance(P.L);
    advance(P.L);
    op = makeNode(P, "=~", os, P.L.b, []);
  } else if (s === "=" && c1 !== "=") {
    advance(P.L);
    op = makeNode(P, "=", os, P.L.b, []);
  } else if (closer === "]]" && s === "<" && c1 !== "<") {
    advance(P.L);
    op = makeNode(P, "<", os, P.L.b, []);
  } else if (closer === "]]" && s === ">" && c1 !== ">") {
    advance(P.L);
    op = makeNode(P, ">", os, P.L.b, []);
  } else if (s === "-" && isIdentStart(c1)) {
    advance(P.L);
    while (isIdentChar(peek(P.L))) advance(P.L);
    op = makeNode(P, "test_operator", os, P.L.b, []);
  }
  if (!op) return left;
  skipBlanks(P.L);
  if (closer === "]]") {
    let opText = op.type;
    if (opText === "=~") {
      skipBlanks(P.L);
      let rc = peek(P.L);
      let rhs = null;
      if (rc === '"' || rc === "'") {
        let save = saveLex(P.L);
        let quoted = rc === '"' ? parseDoubleQuoted(P) : leaf(P, "raw_string", nextToken(P.L, "arg"));
        let h = P.L.i;
        let I = h;
        while (I < P.L.len && (P.src[I] === " " || P.src[I] === "\t")) I++;
        let T = P.src[I] ?? "";
        let g = I + 1;
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
        let nc1 = P.src[g] ?? "";
        if (
          (T === "]" && nc1 === "]" && I > h) ||
          (T === "&" && nc1 === "&") ||
          (T === "|" && nc1 === "|" && I > h) ||
          T ===
            `
` ||
          T === ""
        )
          rhs = quoted;
        else restoreLex(P.L, save);
      }
      if (!rhs) rhs = parseTestRegexRhs(P, true);
      if (!rhs) return makeMissingRhsBinary(P, left, op);
      return makeNode(P, "binary_expression", left.startIndex, rhs.endIndex, [left, op, rhs]);
    }
    if (opText === "=") {
      let rhs = parseTestRegexRhs(P, false);
      if (!rhs) return makeMissingRhsBinary(P, left, op);
      return makeNode(P, "binary_expression", left.startIndex, rhs.endIndex, [left, op, rhs]);
    }
    if (opText === "==" || opText === "!=") {
      let parts = parseTestExtglobRhs(P);
      if (parts.length === 0) return makeMissingRhsBinary(P, left, op);
      let last = parts.at(-1);
      return makeNode(P, "binary_expression", left.startIndex, last.endIndex, [left, op, ...parts]);
    }
  }
  let right = parseTestPrimary(P, closer);
  if (!right) return makeMissingRhsBinary(P, left, op);
  return makeNode(P, "binary_expression", left.startIndex, right.endIndex, [left, op, right]);
}
//@ chunk-k5vy5m8c.js:54349-55000 fingerprint = parseTestRegexRhs (0.921)
function parseTestRegexRhs(e, o) {
  skipBlanks(e.L);
  let start = e.L.b;
  let s = 0;
  while (e.L.i < e.L.len) {
    let i = peek(e.L);
    if (i === "\\" && e.L.i + 1 < e.L.len) {
      advance(e.L);
      advance(e.L);
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
  return makeNode(e, "regex", start, e.L.b, []);
}
//@ chunk-k5vy5m8c.js:55000-56538 fingerprint = parseTestExtglobRhs (0.83)
function parseTestExtglobRhs(P) {
  skipBlanks(P.L);
  let parts = [];
  let segStart = P.L.b;
  let segStartI = P.L.i;
  let parenDepth = 0;
  let flushSeg = () => {
    if (P.L.i > segStartI) {
      let text = P.src.slice(segStartI, P.L.i);
      let type = /^\d+$/.test(text) ? "number" : "extglob_pattern";
      parts.push(makeNode(P, type, segStart, P.L.b, []));
    }
  };
  while (P.L.i < P.L.len) {
    let a = peek(P.L);
    if (a === "\\" && P.L.i + 1 < P.L.len) {
      advance(P.L);
      advance(P.L);
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
        let f = P.L.src[c] ?? "";
        let u = c + 1;
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
        let nc1 = P.L.src[u] ?? "";
        if (
          (f === "]" && nc1 === "]") ||
          (f === "&" && nc1 === "&") ||
          (f === "|" && nc1 === "|") ||
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
        parts.push(leaf(P, "ansi_c_string", f));
        segStart = P.L.b;
        segStartI = P.L.i;
        continue;
      }
      if (c1 === '"') {
        flushSeg();
        let f = {
          type: "DOLLAR",
          value: "$",
          start: P.L.b,
          end: P.L.b + 1,
        };
        advance(P.L);
        parts.push(leaf(P, "$", f));
        parts.push(parseDoubleQuoted(P));
        segStart = P.L.b;
        segStartI = P.L.i;
        continue;
      }
      if (c1 === "(" || c1 === "{" || isIdentStart(c1) || SPECIAL_VARS.has(c1) || c1 >= "\x80") {
        flushSeg();
        let exp = parseDollarLike(P);
        if (exp) parts.push(exp);
        segStart = P.L.b;
        segStartI = P.L.i;
        continue;
      }
    }
    if (a === '"') {
      flushSeg();
      parts.push(parseDoubleQuoted(P));
      segStart = P.L.b;
      segStartI = P.L.i;
      continue;
    }
    if (a === "'") {
      flushSeg();
      let tok = nextToken(P.L, "arg");
      parts.push(leaf(P, "raw_string", tok));
      segStart = P.L.b;
      segStartI = P.L.i;
      continue;
    }
    if (a === "`") {
      flushSeg();
      let backtick = parseBacktick(P);
      parts.push(backtick);
      segStart = P.L.b;
      segStartI = P.L.i;
      continue;
    }
    if ((a === "<" || a === ">") && peek(P.L, 1) === "(") {
      flushSeg();
      let processSub = parseProcessSub(P);
      if (processSub) parts.push(processSub);
      segStart = P.L.b;
      segStartI = P.L.i;
      continue;
    }
    if (a === ")" && parenDepth === 0) break;
    if (a === "(") parenDepth++;
    else if (a === ")" && parenDepth > 0) parenDepth--;
    advance(P.L);
  }
  flushSeg();
  return parts;
}
//@ chunk-k5vy5m8c.js:56538-56707 fingerprint = parseTestPrimary (1)
function parseTestPrimary(P, closer) {
  skipBlanks(P.L);
  if (closer === "]" && peek(P.L) === "]" && isWordBreakNotParen(peek(P.L, 1) ?? "")) return null;
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
};
var ARITH_RIGHT_ASSOC = new Set(["=", "+=", "-=", "*=", "/=", "%=", "<<=", ">>=", "&=", "^=", "|=", "**"]);
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
  let arithTernary = parseArithTernary(P, stop, mode);
  P.inDquote--;
  return arithTernary;
}
//@ chunk-k5vy5m8c.js:57355-57492 fingerprint = parseArithCommaList (1)
function parseArithCommaList(P, stop, mode = "var") {
  let out = [];
  while (true) {
    let e = parseArithExpr(P, stop, mode);
    if (e) out.push(e);
    skipBlanks(P.L);
    if (peek(P.L) === "," && !isArithStop(P, stop)) {
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
  skipBlanks(P.L);
  if (peek(P.L) === "?") {
    let qs = P.L.b;
    advance(P.L);
    let node = makeNode(P, "?", qs, P.L.b, []);
    let t = parseArithBinary(P, ":", 0, mode);
    skipBlanks(P.L);
    let colon;
    if (peek(P.L) === ":") {
      let cs = P.L.b;
      advance(P.L);
      colon = makeNode(P, ":", cs, P.L.b, []);
    } else colon = makeNode(P, ":", P.L.b, P.L.b, []);
    let arithTernary = parseArithTernary(P, stop, mode);
    let last = arithTernary ?? colon;
    let kids = [cond, node];
    if (t) kids.push(t);
    kids.push(colon);
    if (arithTernary) kids.push(arithTernary);
    return makeNode(P, "ternary_expression", cond.startIndex, last.endIndex, kids);
  }
  return cond;
}
//@ chunk-k5vy5m8c.js:57873-58913 fingerprint = scanArithOp (1)
function scanArithOp(P) {
  let o = peek(P.L);
  let c1 = peek(P.L, 1);
  let c2 = peek(P.L, 2);
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
function parseArithBinary(e, closer, minPrec, mode) {
  let left = parseArithUnary(e, closer, mode);
  if (!left) return null;
  while (true) {
    skipBlanks(e.L);
    if (isArithStop(e, closer)) break;
    if (peek(e.L) === ",") break;
    let opInfo = scanArithOp(e);
    if (!opInfo) break;
    let [opText, opLen] = opInfo;
    let prec = ARITH_PREC[opText];
    if (prec === undefined || prec < minPrec) break;
    let os = e.L.b;
    for (let k = 0; k < opLen; k++) advance(e.L);
    let op = makeNode(e, opText, os, e.L.b, []);
    let nextMin = ARITH_RIGHT_ASSOC.has(opText) ? prec : prec + 1;
    let right = parseArithBinary(e, closer, nextMin, mode);
    if (!right) break;
    left = makeNode(e, "binary_expression", left.startIndex, right.endIndex, [left, op, right]);
  }
  return left;
}
//@ chunk-k5vy5m8c.js:59266-59807 fingerprint = parseArithUnary (1)
function parseArithUnary(P, stop, mode) {
  skipBlanks(P.L);
  if (isArithStop(P, stop)) return null;
  let s = peek(P.L);
  let c1 = peek(P.L, 1);
  if ((s === "+" && c1 === "+") || (s === "-" && c1 === "-")) {
    let r = P.L.b;
    advance(P.L);
    advance(P.L);
    let op = makeNode(P, s + c1, r, P.L.b, []);
    let inner = parseArithUnary(P, stop, mode);
    if (!inner) return op;
    return makeNode(P, "unary_expression", op.startIndex, inner.endIndex, [op, inner]);
  }
  if (s === "-" || s === "+" || s === "!" || s === "~") {
    if (mode !== "var" && s === "-" && isDigit(c1)) {
      let f = P.L.b;
      advance(P.L);
      while (isDigit(peek(P.L))) advance(P.L);
      return makeNode(P, "number", f, P.L.b, []);
    }
    let r = P.L.b;
    advance(P.L);
    let op = makeNode(P, s, r, P.L.b, []);
    let inner = parseArithUnary(P, stop, mode);
    if (!inner) return op;
    return makeNode(P, "unary_expression", op.startIndex, inner.endIndex, [op, inner]);
  }
  return parseArithPostfix(P, stop, mode);
}
//@ chunk-k5vy5m8c.js:59807-60047 fingerprint = parseArithPostfix (1)
function parseArithPostfix(P, stop, mode) {
  let prim = parseArithPrimary(P, stop, mode);
  if (!prim) return null;
  let i = peek(P.L);
  let c1 = peek(P.L, 1);
  if ((i === "+" && c1 === "+") || (i === "-" && c1 === "-")) {
    let a = P.L.b;
    advance(P.L);
    advance(P.L);
    let op = makeNode(P, i + c1, a, P.L.b, []);
    return makeNode(P, "postfix_expression", prim.startIndex, op.endIndex, [prim, op]);
  }
  return prim;
}
//@ chunk-k5vy5m8c.js:60047-61263 fingerprint = parseArithPrimary (1)
function parseArithPrimary(P, stop, mode) {
  skipBlanks(P.L);
  if (isArithStop(P, stop)) return null;
  let s = peek(P.L);
  if (s === "(") {
    let i = P.L.b;
    advance(P.L);
    let open = makeNode(P, "(", i, P.L.b, []);
    let inners = parseArithCommaList(P, ")", mode);
    skipBlanks(P.L);
    let close;
    if (peek(P.L) === ")") {
      let cs = P.L.b;
      advance(P.L);
      close = makeNode(P, ")", cs, P.L.b, []);
    } else close = makeNode(P, ")", P.L.b, P.L.b, []);
    return makeNode(P, "parenthesized_expression", open.startIndex, close.endIndex, [open, ...inners, close]);
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
    return makeNode(P, "number", i, P.L.b, []);
  }
  if (isIdentStart(s)) {
    let i = P.L.b;
    while (isIdentChar(peek(P.L))) advance(P.L);
    let nc = peek(P.L);
    if (mode === "assign") {
      skipBlanks(P.L);
      let ac = peek(P.L);
      let ac1 = peek(P.L, 1);
      if (ac === "=" && ac1 !== "=") {
        let vn = makeNode(P, "variable_name", i, P.L.b, []);
        let es = P.L.b;
        advance(P.L);
        let eq = makeNode(P, "=", es, P.L.b, []);
        let val = parseArithTernary(P, stop, mode);
        let end = val ? val.endIndex : eq.endIndex;
        return makeNode(P, "variable_assignment", i, end, val ? [vn, eq, val] : [vn, eq]);
      }
    }
    if (nc === "[") {
      let vn = makeNode(P, "variable_name", i, P.L.b, []);
      let brS = P.L.b;
      advance(P.L);
      let brOpen = makeNode(P, "[", brS, P.L.b, []);
      let idx = parseArithTernary(P, "]", "var") ?? parseDollarLike(P);
      skipBlanks(P.L);
      let brClose;
      if (peek(P.L) === "]") {
        let cs = P.L.b;
        advance(P.L);
        brClose = makeNode(P, "]", cs, P.L.b, []);
      } else brClose = makeNode(P, "]", P.L.b, P.L.b, []);
      let kids = idx ? [vn, brOpen, idx, brClose] : [vn, brOpen, brClose];
      return makeNode(P, "subscript", i, brClose.endIndex, kids);
    }
    return makeNode(P, mode === "var" ? "variable_name" : "word", i, P.L.b, []);
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
  let last = o.at(-1);
  if (o === "$'") advance(e.L);
  advance(e.L);
  while (e.L.i < e.L.len && peek(e.L) !== last) {
    if (o !== "'" && peek(e.L) === "\\" && e.L.i + 1 < e.L.len) advance(e.L);
    else if ((last === '"' || e.inDquote > 0) && (peek(e.L) === "$" || peek(e.L) === "`"))
      e.zshBraceDiff = true;
    advance(e.L);
  }
}
export { getParserModule, hasZshMultibyteName, SHELL_KEYWORDS };
