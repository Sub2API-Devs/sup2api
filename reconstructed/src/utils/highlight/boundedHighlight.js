/**
 * utils/highlight/boundedHighlight.ts
 *
 * 有界语法高亮与语言语法表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-n5fvvrgq.js (73)
 * attribution: placement 73
 */

//@ chunk-n5fvvrgq.js:419-506 placement
function MAX_COUNT_ITERATIONS(r) {
  let e = 0;
  for (
    let index = r.indexOf(`
`);
    index >= 0;
    index = r.indexOf(
      `
`,
      index + 1,
    )
  )
    e += 1;
  return e;
}
//@ chunk-n5fvvrgq.js:506-646 placement
class HighlightBoundError extends Error {
  constructor() {
    super("highlighting this text takes more work than its length allows");
    this.name = "HighlightBoundError";
  }
}
//@ chunk-n5fvvrgq.js:646-696 placement
function HighlightBudgetExceeded(r, e) {
  r.left -= e;
  if (r.left < 0) throw new HighlightBoundError();
}
//@ chunk-n5fvvrgq.js:696-706 placement
var MAX_TOKEN_LENGTH = 32;
//@ chunk-n5fvvrgq.js:706-716 placement
var MAX_NESTING_DEPTH = 64;
//@ chunk-n5fvvrgq.js:716-727 placement
var MAX_EMIT_BUDGET = 4096;
//@ chunk-n5fvvrgq.js:727-736 placement
var EMIT_COST_FACTOR = 24;
//@ chunk-n5fvvrgq.js:736-745 placement
var MAX_REPEAT_SPAN = 3;
//@ chunk-n5fvvrgq.js:745-755 placement
var MAX_MATCH_DEPTH = 16;
//@ chunk-n5fvvrgq.js:755-1382 placement
/**
 * 包装 highlight.js 发射器类：按节点、文本长度、嵌套深度与子语言计入预算，超出时抛出高亮超限错误。
 */
var createBoundedEmitter = (r, e) =>
  class o extends r {
    static isBounded = true;
    held = 0;
    breaks = 0;
    height = 0;
    constructor(n) {
      super(n);
      HighlightBudgetExceeded(e, MAX_MATCH_DEPTH);
    }
    openNode(n) {
      this.held += 1;
      HighlightBudgetExceeded(e, 1);
      super.openNode(n);
      this.grownTo(this.stack.length - 1);
    }
    addText(n) {
      let i = MAX_COUNT_ITERATIONS(n);
      this.held += n.length;
      this.breaks += i;
      HighlightBudgetExceeded(e, n.length + i * (this.stack.length - 1) ** 2);
      super.addText(n);
    }
    __addSublanguage(n, i) {
      if (n instanceof o) {
        let s = this.stack.length + n.height;
        this.held += n.held;
        this.breaks += n.breaks;
        this.grownTo(s);
        HighlightBudgetExceeded(e, n.breaks * s ** 2);
      }
      super.__addSublanguage(n, i);
    }
    toHTML() {
      HighlightBudgetExceeded(e, this.held);
      return super.toHTML();
    }
    grownTo(n) {
      this.height = Math.max(this.height, n);
      if (this.height > MAX_TOKEN_LENGTH) HighlightBudgetExceeded(e, Number.POSITIVE_INFINITY);
    }
  };
//@ chunk-n5fvvrgq.js:1382-1463 placement
var isBoundedGrammar = (r) => typeof r === "function" && "openNode" in r.prototype && !("isBounded" in r);
//@ chunk-n5fvvrgq.js:1463-1475 placement
var DEFAULT_MAX_CODE_BYTES = 50000;
//@ chunk-n5fvvrgq.js:1475-1487 placement
var MAX_ASCIIDOC_BYTES = 16000;
//@ chunk-n5fvvrgq.js:1487-1499 placement
var MAX_GCODE_BYTES = 20000;
//@ chunk-n5fvvrgq.js:1499-1510 placement
var MAX_HTTP_BYTES = 8000;
//@ chunk-n5fvvrgq.js:1510-1521 placement
var MAX_NESTEDTEXT_BYTES = 8000;
//@ chunk-n5fvvrgq.js:1521-1533 placement
var MAX_SAS_BYTES = 20000;
//@ chunk-n5fvvrgq.js:1533-1545 placement
var MAX_WREN_BYTES = 20000;
//@ chunk-n5fvvrgq.js:1545-1638 placement
var LANGUAGE_MAX_BYTES = new Map([
  ["asciidoc", MAX_ASCIIDOC_BYTES],
  ["gcode", MAX_GCODE_BYTES],
  ["http", MAX_HTTP_BYTES],
  ["nestedtext", MAX_NESTEDTEXT_BYTES],
  ["sas", MAX_SAS_BYTES],
  ["wren", MAX_WREN_BYTES],
]);
//@ chunk-n5fvvrgq.js:1638-1670 placement
var min = Math.min(DEFAULT_MAX_CODE_BYTES, ...LANGUAGE_MAX_BYTES.values());
//@ chunk-n5fvvrgq.js:1670-2819 placement
var HIGHLIGHT_LANGUAGES = new Set([
  "abnf",
  "accesslog",
  "ada",
  "angelscript",
  "applescript",
  "arcade",
  "arduino",
  "asciidoc",
  "aspectj",
  "autohotkey",
  "awk",
  "bash",
  "brainfuck",
  "c",
  "cal",
  "clojure",
  "clojure-repl",
  "coffeescript",
  "cos",
  "cpp",
  "crmsh",
  "crystal",
  "csharp",
  "css",
  "dart",
  "delphi",
  "django",
  "dns",
  "dockerfile",
  "dos",
  "dsconfig",
  "dts",
  "dust",
  "elixir",
  "erb",
  "erlang",
  "excel",
  "fsharp",
  "gams",
  "gauss",
  "gcode",
  "go",
  "graphql",
  "groovy",
  "haml",
  "handlebars",
  "haskell",
  "http",
  "ini",
  "java",
  "javascript",
  "jboss-cli",
  "julia",
  "julia-repl",
  "kotlin",
  "latex",
  "leaf",
  "less",
  "livecodeserver",
  "livescript",
  "llvm",
  "markdown",
  "matlab",
  "mipsasm",
  "mojolicious",
  "monkey",
  "moonscript",
  "nestedtext",
  "nginx",
  "nim",
  "nix",
  "node-repl",
  "nsis",
  "objectivec",
  "ocaml",
  "parser3",
  "perl",
  "pgsql",
  "php",
  "php-template",
  "pony",
  "powershell",
  "processing",
  "profile",
  "properties",
  "protobuf",
  "puppet",
  "python",
  "python-repl",
  "qml",
  "r",
  "reasonml",
  "roboconf",
  "routeros",
  "ruby",
  "rust",
  "sas",
  "scala",
  "scheme",
  "scilab",
  "scss",
  "shell",
  "smali",
  "smalltalk",
  "sml",
  "stan",
  "stata",
  "stylus",
  "swift",
  "tap",
  "tcl",
  "tp",
  "twig",
  "typescript",
  "vbnet",
  "vbscript",
  "vbscript-html",
  "verilog",
  "wren",
  "x86asm",
  "xl",
  "xml",
  "xquery",
  "yaml",
  "zephir",
]);
//@ chunk-n5fvvrgq.js:2819-2853 placement
var KNOWN_LANGUAGES = new Set([...LANGUAGE_MAX_BYTES.keys(), ...HIGHLIGHT_LANGUAGES]);
//@ chunk-n5fvvrgq.js:2853-2865 placement
/**
 * 子语言文本超过该字符数才需要做有界处理。
 */
var MAX_SUBLANGUAGE_CHARS = 256;
//@ chunk-n5fvvrgq.js:2865-2882 placement
/**
 * 子语言高亮的字节预算。
 */
var MAX_SUBLANGUAGE_BYTES = 16000000;
//@ chunk-n5fvvrgq.js:2882-2896 placement
/**
 * 高亮预算总量（按基础额与系数估算）。
 */
var TOTAL_BUDGET_BYTES = MAX_EMIT_BUDGET + DEFAULT_MAX_CODE_BYTES * EMIT_COST_FACTOR;
//@ chunk-n5fvvrgq.js:2896-2913 placement
/**
 * 恒等包装：直接调用回调（无预算限制时的占位）。
 */
var noopRun = (r, e) => e();
//@ chunk-n5fvvrgq.js:2913-2983 placement
var withBudgetReset = (r) => (e, o) => {
  r.spent = 0;
  try {
    return o();
  } finally {
    e.left -= r.spent;
  }
};
//@ chunk-n5fvvrgq.js:2983-3198 placement
var languageChildren = (r, e) => [
  ...[("subLanguage" in e ? e.subLanguage : undefined) ?? []]
    .flat()
    .filter((o) => typeof o === "string")
    .map((o) => r.getLanguage(o)),
  ...(e.contains ?? []),
  ...("variants" in e ? (e.variants ?? []) : []),
  "starts" in e ? e.starts : undefined,
];
//@ chunk-n5fvvrgq.js:3198-3331 placement
class HighlightLimitError extends Error {
  constructor() {
    super("this text is too long, or its lines are, for a grammar");
    this.name = "HighlightLimitError";
  }
}
//@ chunk-n5fvvrgq.js:3331-3367 placement
var SCRIPT_STYLE_RE = /<(?:script|style)(?=\s|>)/iu;
//@ chunk-n5fvvrgq.js:3367-3380 placement
var MARKDOWN_FENCE_CHARS = "[`~<";
//@ chunk-n5fvvrgq.js:3380-3416 placement
var MARKDOWN_TRIGGERS = new Map([["markdown", [MARKDOWN_FENCE_CHARS, SCRIPT_STYLE_RE]]]);
//@ chunk-n5fvvrgq.js:3416-3436 placement
var WHITESPACE_OR_LINE_RE = /\s+|[^\n]+/g;
//@ chunk-n5fvvrgq.js:3436-3545 placement
function countBreakChars(r, e) {
  let o = 0;
  for (let n of e === undefined ? "" : r) o += e?.includes(n) === true ? 1 : 0;
  return e === undefined ? r.length : o;
}
//@ chunk-n5fvvrgq.js:3545-3674 placement
function longTokenCost(r, e) {
  let o = 0;
  if (r.length <= MAX_SUBLANGUAGE_CHARS) return o;
  for (let [n] of r.matchAll(WHITESPACE_OR_LINE_RE)) {
    let i = n.length > MAX_SUBLANGUAGE_CHARS;
    o += i ? countBreakChars(n, e) * n.length : 0;
  }
  return o;
}
//@ chunk-n5fvvrgq.js:3674-3715 placement
var isWithinCodeBudget = (code) =>
  code.length <= min && longTokenCost(code, undefined) <= MAX_SUBLANGUAGE_BYTES;
//@ chunk-n5fvvrgq.js:3715-3790 placement
function markdownTriggerChar(r, e) {
  let o = MARKDOWN_TRIGGERS.get(e);
  return o === undefined || o[1].test(r) ? undefined : o[0];
}
//@ chunk-n5fvvrgq.js:3790-3852 placement
/**
 * 对需要预算的语言，计算超长子语言文本的裁剪结果。
 */
function sublanguageOverflowCheck(r, e) {
  return HIGHLIGHT_LANGUAGES.has(e) && r.length > MAX_SUBLANGUAGE_CHARS
    ? longTokenCost(r, markdownTriggerChar(r, e))
    : 0;
}
//@ chunk-n5fvvrgq.js:3852-3906 placement
/**
 * 判断某语言的文本是否可在预算内高亮（长度与子语言预算）。
 */
var languageSubLanguageMap = (r, e) =>
  r.length <= (LANGUAGE_MAX_BYTES.get(e) ?? DEFAULT_MAX_CODE_BYTES) &&
  sublanguageOverflowCheck(r, e) <= MAX_SUBLANGUAGE_BYTES;
//@ chunk-n5fvvrgq.js:3906-4389 placement
/**
 * 沿子语言图找到某语言实际依赖的受限语言名（用于套用该语言的长度上限）。
 */
function rootHighlightLanguage(r, e) {
  let o = new Map(
    [...KNOWN_LANGUAGES].flatMap((a) => {
      let language = r.getLanguage(a);
      return language === undefined ? [] : [[language, a]];
    }),
  );
  let n = new Set();
  let i = KNOWN_LANGUAGES.has(e) ? [] : [r.getLanguage(e)];
  let s = e;
  while (i.length > 0) {
    let a = i.pop();
    if (typeof a !== "object" || a === null || n.has(a)) continue;
    let g =
      "subLanguage" in a && Array.isArray(a.subLanguage) && a.subLanguage.length === 0
        ? ([...o.values()].find((_r) => !MARKDOWN_TRIGGERS.has(_r)) ?? o.values().next().value)
        : o.get(a);
    if (g !== undefined && !MARKDOWN_TRIGGERS.has(g)) return g;
    s = g ?? s;
    n.add(a);
    i.push(...(g === undefined ? languageChildren(r, a) : []));
  }
  return s;
}
//@ chunk-n5fvvrgq.js:4389-4487 placement
var withMarkdownBudgetHooks = (r) => ({
  "before:highlight": ({ code, language }) => {
    if (!isWithinCodeBudget(code) && !languageSubLanguageMap(code, rootHighlightLanguage(r, language)))
      throw new HighlightLimitError();
  },
});
//@ chunk-n5fvvrgq.js:4487-4915 placement
/**
 * 计算语言定义中子语言的最大扇出。
 */
function maxSubLanguageFanout(r, e) {
  let o = new Set();
  let n = [e];
  let i = 0;
  while (n.length > 0) {
    let s = n.pop();
    if (typeof s !== "object" || s === null || o.has(s)) continue;
    o.add(s);
    let subLanguage = "subLanguage" in s ? s.subLanguage : undefined;
    let p = Array.isArray(subLanguage);
    i = Math.max(i, p ? subLanguage.length || Number.POSITIVE_INFINITY : 0);
    n.push(
      ...[subLanguage ?? []]
        .flat()
        .filter((g) => typeof g === "string")
        .map((g) => r.getLanguage(g)),
      ...(s.contains ?? []),
      ...("variants" in s ? (s.variants ?? []) : []),
      "starts" in s ? s.starts : undefined,
    );
  }
  return i;
}
//@ chunk-n5fvvrgq.js:4915-5150 placement
function createHighlightBudget(r, e) {
  let weakMap = new WeakMap();
  let n = 0;
  function i(language) {
    let a = r.listLanguages().length;
    if (language === undefined) return 0;
    if (a !== n) {
      weakMap = new WeakMap();
      n = a;
    }
    let p = weakMap.get(language) ?? maxSubLanguageFanout(r, language);
    weakMap.set(language, p);
    return Math.min(p, a, e);
  }
  return (s, a) => MAX_EMIT_BUDGET + a * (EMIT_COST_FACTOR + MAX_REPEAT_SPAN * i(r.getLanguage(s)));
}
//@ chunk-n5fvvrgq.js:5150-5362 placement
var budgetHooks = (r, highlightBudget, o) => ({
  "before:highlight": (n) => {
    r.left = highlightBudget(n.language, n.code.length);
    o.spent = r.left;
  },
  "after:highlight": () => {
    let n = r.left < 0;
    o.spent -= Math.max(r.left, 0);
    r.left = Number.POSITIVE_INFINITY;
    if (n) throw new HighlightBoundError();
  },
});
//@ chunk-n5fvvrgq.js:5362-5615 placement
/**
 * 给 highlight.js 实例装上有界高亮：替换发射器并加入预算插件，返回包装高亮调用的函数。
 */
function installHighlightBounds(r, e) {
  let o = r.highlightAuto("", [])._emitter.constructor;
  if ("isBounded" in o) return noopRun;
  r.addPlugin(withMarkdownBudgetHooks(r));
  if (!isBoundedGrammar(o)) return noopRun;
  let n = {
    left: Number.POSITIVE_INFINITY,
  };
  let i = {
    spent: 0,
  };
  r.configure({
    __emitter: createBoundedEmitter(o, n),
  });
  r.addPlugin(budgetHooks(n, createHighlightBudget(r, e), i));
  return withBudgetReset(i);
}
//@ chunk-n5fvvrgq.js:5615-5635 placement
/**
 * 以最大嵌套深度包装高亮运行函数。
 */
var withMaxDepth = (r) => installHighlightBounds(r, MAX_NESTING_DEPTH);
//@ chunk-n5fvvrgq.js:5635-5676 placement
var cloneGrammar = ["begin", "end", "match", "illegal"];
//@ chunk-n5fvvrgq.js:5676-5793 placement
var regexpRewriter = (r) => (e) => {
  let o = r.get(typeof e === "string" ? e : e.source);
  try {
    return o === undefined ? e : new RegExp(o);
  } catch {
    return e;
  }
};
//@ chunk-n5fvvrgq.js:5793-5873 placement
function cloneGrammarDeep(starts) {
  return typeof starts === "object" && starts !== null && Object.isFrozen(starts)
    ? {
        ...starts,
      }
    : starts;
}
//@ chunk-n5fvvrgq.js:5873-6249 placement
/**
 * 遍历语言定义的模式树，把已知会回溯爆炸的正则替换为有界版本。
 */
function rewriteLanguageRegexps(r, e) {
  let o = new Set();
  let n = [r];
  let i = regexpRewriter(e);
  while (n.length > 0) {
    let s = n.pop();
    if (!(typeof s === "object" && s !== null) || o.has(s)) continue;
    o.add(s);
    for (let p of cloneGrammar) {
      let g = s[p];
      if (g !== undefined && g !== null) s[p] = Array.isArray(g) ? g.map(i) : i(g);
    }
    s.contains &&= s.contains.map(cloneGrammarDeep);
    s.variants &&= s.variants.map(cloneGrammarDeep);
    s.starts &&= cloneGrammarDeep(s.starts);
    n.push(...(s.contains ?? []), ...(s.variants ?? []), s.starts);
  }
  return r;
}
//@ chunk-n5fvvrgq.js:6249-6261 placement
var MAX_CPP_REGEX_BYTES = 1000;
//@ chunk-n5fvvrgq.js:6261-6273 placement
var MAX_C_REGEX_BYTES = 1000;
//@ chunk-n5fvvrgq.js:6273-6283 placement
var CPP_TEMPLATE_SPAN = 16;
//@ chunk-n5fvvrgq.js:6283-6295 placement
var MAX_CPP_TOKEN_BYTES = 1000;
//@ chunk-n5fvvrgq.js:6295-6305 placement
var MAX_CPP_TEMPLATE_DEPTH = 12;
//@ chunk-n5fvvrgq.js:6305-6317 placement
var MAX_CPP_REGEX_ITEM_BYTES = 1500;
//@ chunk-n5fvvrgq.js:6317-6328 placement
var MAX_CPP_REGEX_REPEAT = 1e4;
//@ chunk-n5fvvrgq.js:6328-6338 placement
var CPP_TEMPLATE_RE = 16;
//@ chunk-n5fvvrgq.js:6338-6749 placement
/**
 * C/C++ 函数声明正则的原版与有界版本。
 */
var cppFunctionPatterns = (r) => [
  String.raw`(${r}(decltype\(auto\)|(?:[a-zA-Z_]\w*::)?[a-zA-Z_]\w*` +
    String.raw`(?:<[^<>]+>)?)[\*&\s]+)+` +
    String.raw`(?:[a-zA-Z_]\w*::)?[a-zA-Z]\w*\s*\(`,
  String.raw`(?=[a-zA-Z_])` +
    String.raw`(?:(?=decltype\(auto\))|(?<!${r}[a-zA-Z_]\w*?))` +
    String.raw`(${r}(decltype\(auto\)|(?:[a-zA-Z_]\w*::)?[a-zA-Z_]\w*` +
    String.raw`(?:<[^<>]+>)?)[\*&\s]+){1,${CPP_TEMPLATE_RE}}` +
    String.raw`(?:[a-zA-Z_]\w*::)?[a-zA-Z]\w*\s*\(`,
];
//@ chunk-n5fvvrgq.js:6749-6764 placement
var CPP_BOUNDED_PATTERNS = [cppFunctionPatterns("")];
//@ chunk-n5fvvrgq.js:6764-7256 placement
/**
 * 所有语言共用的危险正则替换（英文句子与 TODO 注释）。
 */
var SHARED_REGEX_REWRITES = [
  [
    String.raw`[ ]+((?:I|a|is|so|us|to|at|if|in|it|on|` +
      String.raw`[A-Za-z]+['](d|ve|re|ll|t|s|n)|[A-Za-z]+[-][a-z]+|` +
      String.raw`[A-Za-z][a-z]{2,})[.]?[:]?([.][ ]|[ ])){3}`,
    String.raw`(?<! )[ ]+((?:I|a|is|so|us|to|at|if|in|it|on|` +
      String.raw`[A-Za-z]+['](d|ve|re|ll|t|s|n)|[A-Za-z]+[-][a-z]+|` +
      String.raw`[A-Za-z][a-z]{2,})[.]?[:]?([.][ ]|[ ])){3}`,
  ],
  [
    String.raw`[ ]*(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)`,
    String.raw`(?:(?<! )[ ]+)?(?=(TODO|FIXME|NOTE|BUG|OPTIMIZE|HACK|XXX):)`,
  ],
];
//@ chunk-n5fvvrgq.js:7256-7280 placement
var CPP_TYPE_PATTERN = [cppFunctionPatterns("(?!struct)")];
//@ chunk-n5fvvrgq.js:7280-7703 placement
/**
 * C# 的危险正则替换。
 */
var CSHARP_REGEX_REWRITES = [
  [
    String.raw`([a-zA-Z]\w*(<[a-zA-Z]\w*(\s*,\s*[a-zA-Z]\w*)*>)?(\[\])?\s+)+` +
      String.raw`[a-zA-Z]\w*\s*(<[^=]+>\s*)?\(`,
    String.raw`(?=[a-zA-Z])(?<![a-zA-Z]\w*?)` +
      String.raw`([a-zA-Z]\w*(<[a-zA-Z]\w*(\s*,\s*[a-zA-Z]\w*)*>)?(\[\])?\s+)` +
      String.raw`{1,${MAX_CPP_TEMPLATE_DEPTH}}[a-zA-Z]\w*\s*` +
      String.raw`(<[^=]{1,${MAX_C_REGEX_BYTES}}?>\s*)?\(`,
  ],
  [
    String.raw`[a-zA-Z]\w*\s*(<[^=]+>\s*)?\(`,
    String.raw`[a-zA-Z]\w*\s*` + String.raw`(<[^=]{1,${MAX_C_REGEX_BYTES}}?>\s*)?\(`,
  ],
];
//@ chunk-n5fvvrgq.js:7703-8135 placement
var mapped = [
  String.raw`(?:\.|\.\/|\/)?(?:""|"[^"]+"|''|'[^']+'|\[\]|\[[^\]]+\]|` +
    String.raw`[^\s!"#%&'()*+,.\/;<=>@\[\\\]^` +
    "`" +
    String.raw`{|}~]+)(?:(\.|\/)(?:""|"[^"]+"|''|'[^']+'|\[\]|\[[^\]]+\]|` +
    String.raw`[^\s!"#%&'()*+,.\/;<=>@\[\\\]^` +
    "`" +
    String.raw`{|}~]+))*`,
  String.raw`(\[\]|\[[^\]]+\]|[^\s!"#%&'()*+,.\/;<=>@\[\\\]^` + "`" + String.raw`{|}~]+)(?==)`,
].map((r) => [r, r.replaceAll(String.raw`[^\]]+\]`, String.raw`[^\]]{1,${MAX_CPP_REGEX_BYTES}}\]`)]);
//@ chunk-n5fvvrgq.js:8135-8499 placement
/**
 * INI 的危险正则替换。
 */
var INI_REGEX_REWRITES = [
  [
    String.raw`(?:[A-Za-z0-9_-]+|"(\\"|[^"])*"|'[^']*')` +
      String.raw`(\s*\.\s*(?:[A-Za-z0-9_-]+|"(\\"|[^"])*"|'[^']*'))*` +
      String.raw`(?=\s*=\s*[^#\s])`,
    String.raw`(?:(?<![A-Za-z0-9_-])[A-Za-z0-9_-]+|` +
      String.raw`(?<!\\)"(\\"|[^"])*"|'[^']*')` +
      String.raw`(\s*\.\s*(?:[A-Za-z0-9_-]+|"(\\"|[^"])*"|'[^']*'))` +
      String.raw`{0,${CPP_TEMPLATE_SPAN}}` +
      String.raw`(?=\s*=\s*[^#\s])`,
  ],
];
//@ chunk-n5fvvrgq.js:8499-8680 placement
var MARKDOWN_FENCE_REWRITES = [
  ["(`{3,})[^`](.|\\n)*?\\1`*[ ]*", "(`{3,})[^`][^\\r\\u2028\\u2029]*?\\1`*[ ]*"],
  [String.raw`(~{3,})[^~](.|\n)*?\1~*[ ]*`, String.raw`(~{3,})[^~][^\r\u2028\u2029]*?\1~*[ ]*`],
];
//@ chunk-n5fvvrgq.js:8680-9122 placement
/**
 * Markdown 链接的危险正则替换。
 */
var MARKDOWN_LINK_REWRITES = [
  [String.raw`\[.*?\]\(.*?\)`, String.raw`\[(?=(.*?\]\())\1.*?\)`],
  [
    String.raw`\[.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/).*?\)`,
    String.raw`\[(?=(.+?\]\(((data|javascript|mailto):|(?:http|ftp)s?:\/\/)))` + String.raw`\1.*?\)`,
  ],
  [
    String.raw`\[.+?\]\([A-Za-z][A-Za-z0-9+.-]*:\/\/.*?\)`,
    String.raw`\[(?=(.+?\]\([A-Za-z][A-Za-z0-9+.-]*:\/\/))\1.*?\)`,
  ],
  [String.raw`\[.+?\]\([./?&#].*?\)`, String.raw`\[(?=(.+?\]\([./?&#]))\1.*?\)`],
];
//@ chunk-n5fvvrgq.js:9122-9929 placement
var mapped_2 = [
  String.raw`(?:s|tr|y)(!|\/|\||\?|'|"|#)(?:\\.|[^\\\/])*?\1` +
    String.raw`(?:\\.|[^\\\/])*?\1[dualxmsipngr]{0,12}`,
  String.raw`(?:s|tr|y)\((?:\\.|[^\\\/])*?\)\(` + String.raw`(?:\\.|[^\\\/])*?\)[dualxmsipngr]{0,12}`,
  String.raw`(?:s|tr|y)\[(?:\\.|[^\\\/])*?\]\[` + String.raw`(?:\\.|[^\\\/])*?\][dualxmsipngr]{0,12}`,
  String.raw`(?:s|tr|y)\{(?:\\.|[^\\\/])*?\}\{` + String.raw`(?:\\.|[^\\\/])*?\}[dualxmsipngr]{0,12}`,
  String.raw`(?:(?:m|qr)?)\/(?:\\.|[^\\\/])*?\/[dualxmsipngr]{0,12}`,
  String.raw`(?:m|qr)(!|\/|\||\?|'|"|#)(?:\\.|[^\\\/])*?\1` + String.raw`[dualxmsipngr]{0,12}`,
  String.raw`(?:m|qr)\((?:\\.|[^\\\/])*?\)[dualxmsipngr]{0,12}`,
  String.raw`(?:m|qr)\[(?:\\.|[^\\\/])*?\][dualxmsipngr]{0,12}`,
  String.raw`(?:m|qr)\{(?:\\.|[^\\\/])*?\}[dualxmsipngr]{0,12}`,
].map((r) => [r, r.replaceAll(")*?", `){0,${MAX_CPP_REGEX_ITEM_BYTES}}?`)]);
//@ chunk-n5fvvrgq.js:9929-10429 placement
/**
 * Python 数字字面量的危险正则替换。
 */
var PYTHON_REGEX_REWRITES = [
  [
    String.raw`\b([1-9](_?[0-9])*|0+(_?0)*)[lLjJ]?(?=\b|and|as|assert|async|` +
      "await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|10|not|or|pass|raise|return|try|while|with|yield)",
    String.raw`\b([1-9](_?[0-9])*|0(_?0)*)[lLjJ]?(?=\b|and|as|assert|async|` +
      "await|break|case|class|continue|def|del|elif|else|except|finally|for|from|global|if|import|in|is|lambda|match|nonlocal|10|not|or|pass|raise|return|try|while|with|yield)",
  ],
];
//@ chunk-n5fvvrgq.js:10429-10598 placement
var RUBY_HEREDOC_REWRITES = [
  [
    String.raw`<<[-~]?'?(?=(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b)`,
    String.raw`<<[-~]?'?(?=(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)` +
      String.raw`{0,${MAX_CPP_TOKEN_BYTES}}?[^\S\n]*\1\b)`,
  ],
];
//@ chunk-n5fvvrgq.js:10598-10688 placement
var LANGUAGE_GRAMMARS = [
  [String.raw`b?r(#*)"(.|\n)*?"\1(?!#)`, String.raw`b?r(#*)"[^]{0,${MAX_CPP_REGEX_REPEAT}}?"\1(?!#)`],
];
//@ chunk-n5fvvrgq.js:10688-10859 placement
var LANGUAGE_REGEX_REWRITES = new Map([
  ["arduino", CPP_TYPE_PATTERN],
  ["c", CPP_BOUNDED_PATTERNS],
  ["cpp", CPP_TYPE_PATTERN],
  ["csharp", CSHARP_REGEX_REWRITES],
  ["handlebars", mapped],
  ["ini", INI_REGEX_REWRITES],
  ["markdown", [...MARKDOWN_LINK_REWRITES, ...MARKDOWN_FENCE_REWRITES]],
  ["perl", mapped_2],
  ["python", PYTHON_REGEX_REWRITES],
  ["ruby", RUBY_HEREDOC_REWRITES],
  ["rust", LANGUAGE_GRAMMARS],
]);
//@ chunk-n5fvvrgq.js:10859-10960 placement
/**
 * 包装语言定义工厂：用有界正则替换已知的危险正则，失败时退回原定义。
 */
var withBoundedRegexps = (r, e) => (o) => {
  let n = e(o);
  try {
    return rewriteLanguageRegexps(
      n,
      new Map([...SHARED_REGEX_REWRITES, ...(LANGUAGE_REGEX_REWRITES.get(r) ?? [])]),
    );
  } catch {
    return e(o);
  }
};
export {
  languageSubLanguageMap,
  TOTAL_BUDGET_BYTES,
  MAX_SUBLANGUAGE_CHARS,
  rootHighlightLanguage,
  sublanguageOverflowCheck,
  MAX_SUBLANGUAGE_BYTES,
  noopRun,
  withMaxDepth,
  withBoundedRegexps,
};
