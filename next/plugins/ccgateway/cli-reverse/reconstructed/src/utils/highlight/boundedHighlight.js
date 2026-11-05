/**
 * utils/highlight/boundedHighlight.ts
 *
 * 有界语法高亮与语言语法表（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-rep15ptw.js (73)
 * attribution: placement 73
 */

//@ chunk-rep15ptw.js:419-506 placement
function MAX_COUNT_ITERATIONS(text) {
  let newlines = 0;
  for (
    let index = text.indexOf(`
`);
    index >= 0;
    index = text.indexOf(
      `
`,
      index + 1,
    )
  )
    newlines += 1;
  return newlines;
}
//@ chunk-rep15ptw.js:506-646 placement
class HighlightBoundError extends Error {
  constructor() {
    super("highlighting this text takes more work than its length allows");
    this.name = "HighlightBoundError";
  }
}
//@ chunk-rep15ptw.js:646-696 placement
function HighlightBudgetExceeded(budget, cost) {
  budget.left -= cost;
  if (budget.left < 0) throw new HighlightBoundError();
}
//@ chunk-rep15ptw.js:696-706 placement
var MAX_TOKEN_LENGTH = 32;
//@ chunk-rep15ptw.js:706-716 placement
var MAX_NESTING_DEPTH = 64;
//@ chunk-rep15ptw.js:716-727 placement
var MAX_EMIT_BUDGET = 4096;
//@ chunk-rep15ptw.js:727-736 placement
var EMIT_COST_FACTOR = 24;
//@ chunk-rep15ptw.js:736-745 placement
var MAX_REPEAT_SPAN = 3;
//@ chunk-rep15ptw.js:745-755 placement
var MAX_MATCH_DEPTH = 16;
//@ chunk-rep15ptw.js:755-1382 placement
/**
 * 包装 highlight.js 发射器类：按节点、文本长度、嵌套深度与子语言计入预算，超出时抛出高亮超限错误。
 */
var createBoundedEmitter = (BaseEmitter, budget) =>
  class BoundedEmitter extends BaseEmitter {
    static isBounded = true;
    held = 0;
    breaks = 0;
    height = 0;
    constructor(options) {
      super(options);
      HighlightBudgetExceeded(budget, MAX_MATCH_DEPTH);
    }
    openNode(node) {
      this.held += 1;
      HighlightBudgetExceeded(budget, 1);
      super.openNode(node);
      this.grownTo(this.stack.length - 1);
    }
    addText(text) {
      let newlines = MAX_COUNT_ITERATIONS(text);
      this.held += text.length;
      this.breaks += newlines;
      HighlightBudgetExceeded(budget, text.length + newlines * (this.stack.length - 1) ** 2);
      super.addText(text);
    }
    __addSublanguage(emitter, name) {
      if (emitter instanceof BoundedEmitter) {
        let height = this.stack.length + emitter.height;
        this.held += emitter.held;
        this.breaks += emitter.breaks;
        this.grownTo(height);
        HighlightBudgetExceeded(budget, emitter.breaks * height ** 2);
      }
      super.__addSublanguage(emitter, name);
    }
    toHTML() {
      HighlightBudgetExceeded(budget, this.held);
      return super.toHTML();
    }
    grownTo(height) {
      this.height = Math.max(this.height, height);
      if (this.height > MAX_TOKEN_LENGTH) HighlightBudgetExceeded(budget, Number.POSITIVE_INFINITY);
    }
  };
//@ chunk-rep15ptw.js:1382-1463 placement
var isBoundedGrammar = (Emitter) =>
  typeof Emitter === "function" && "openNode" in Emitter.prototype && !("isBounded" in Emitter);
//@ chunk-rep15ptw.js:1463-1475 placement
var DEFAULT_MAX_CODE_BYTES = 50000;
//@ chunk-rep15ptw.js:1475-1487 placement
var MAX_ASCIIDOC_BYTES = 16000;
//@ chunk-rep15ptw.js:1487-1499 placement
var MAX_GCODE_BYTES = 20000;
//@ chunk-rep15ptw.js:1499-1510 placement
var MAX_HTTP_BYTES = 8000;
//@ chunk-rep15ptw.js:1510-1521 placement
var MAX_NESTEDTEXT_BYTES = 8000;
//@ chunk-rep15ptw.js:1521-1533 placement
var MAX_SAS_BYTES = 20000;
//@ chunk-rep15ptw.js:1533-1545 placement
var MAX_WREN_BYTES = 20000;
//@ chunk-rep15ptw.js:1545-1638 placement
var LANGUAGE_MAX_BYTES = new Map([
  ["asciidoc", MAX_ASCIIDOC_BYTES],
  ["gcode", MAX_GCODE_BYTES],
  ["http", MAX_HTTP_BYTES],
  ["nestedtext", MAX_NESTEDTEXT_BYTES],
  ["sas", MAX_SAS_BYTES],
  ["wren", MAX_WREN_BYTES],
]);
//@ chunk-rep15ptw.js:1638-1670 placement
var min = Math.min(DEFAULT_MAX_CODE_BYTES, ...LANGUAGE_MAX_BYTES.values());
//@ chunk-rep15ptw.js:1670-2819 placement
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
//@ chunk-rep15ptw.js:2819-2853 placement
var KNOWN_LANGUAGES = new Set([...LANGUAGE_MAX_BYTES.keys(), ...HIGHLIGHT_LANGUAGES]);
//@ chunk-rep15ptw.js:2853-2865 placement
/**
 * 子语言文本超过该字符数才需要做有界处理。
 */
var MAX_SUBLANGUAGE_CHARS = 256;
//@ chunk-rep15ptw.js:2865-2882 placement
/**
 * 子语言高亮的字节预算。
 */
var MAX_SUBLANGUAGE_BYTES = 16000000;
//@ chunk-rep15ptw.js:2882-2896 placement
/**
 * 高亮预算总量（按基础额与系数估算）。
 */
var TOTAL_BUDGET_BYTES = MAX_EMIT_BUDGET + DEFAULT_MAX_CODE_BYTES * EMIT_COST_FACTOR;
//@ chunk-rep15ptw.js:2896-2913 placement
/**
 * 恒等包装：直接调用回调（无预算限制时的占位）。
 */
var noopRun = (grammar, fn) => fn();
//@ chunk-rep15ptw.js:2913-2983 placement
var withBudgetReset = (spent) => (budget, fn) => {
  spent.spent = 0;
  try {
    return fn();
  } finally {
    budget.left -= spent.spent;
  }
};
//@ chunk-rep15ptw.js:2983-3198 placement
var languageChildren = (hljs, mode) => [
  ...[("subLanguage" in mode ? mode.subLanguage : undefined) ?? []]
    .flat()
    .filter((name) => typeof name === "string")
    .map((name) => hljs.getLanguage(name)),
  ...(mode.contains ?? []),
  ...("variants" in mode ? (mode.variants ?? []) : []),
  "starts" in mode ? mode.starts : undefined,
];
//@ chunk-rep15ptw.js:3198-3331 placement
class HighlightLimitError extends Error {
  constructor() {
    super("this text is too long, or its lines are, for a grammar");
    this.name = "HighlightLimitError";
  }
}
//@ chunk-rep15ptw.js:3331-3367 placement
var SCRIPT_STYLE_RE = /<(?:script|style)(?=\s|>)/iu;
//@ chunk-rep15ptw.js:3367-3380 placement
var MARKDOWN_FENCE_CHARS = "[`~<";
//@ chunk-rep15ptw.js:3380-3416 placement
var MARKDOWN_TRIGGERS = new Map([["markdown", [MARKDOWN_FENCE_CHARS, SCRIPT_STYLE_RE]]]);
//@ chunk-rep15ptw.js:3416-3436 placement
var WHITESPACE_OR_LINE_RE = /\s+|[^\n]+/g;
//@ chunk-rep15ptw.js:3436-3545 placement
function countBreakChars(text, breaks) {
  let count = 0;
  for (let char of breaks === undefined ? "" : text) count += breaks?.includes(char) === true ? 1 : 0;
  return breaks === undefined ? text.length : count;
}
//@ chunk-rep15ptw.js:3545-3674 placement
function longTokenCost(text, breaks) {
  let cost = 0;
  if (text.length <= MAX_SUBLANGUAGE_CHARS) return cost;
  for (let [token] of text.matchAll(WHITESPACE_OR_LINE_RE)) {
    let isLong = token.length > MAX_SUBLANGUAGE_CHARS;
    cost += isLong ? countBreakChars(token, breaks) * token.length : 0;
  }
  return cost;
}
//@ chunk-rep15ptw.js:3674-3715 placement
var isWithinCodeBudget = (text) =>
  text.length <= min && longTokenCost(text, undefined) <= MAX_SUBLANGUAGE_BYTES;
//@ chunk-rep15ptw.js:3715-3790 placement
function markdownTriggerChar(text, language) {
  let trigger = MARKDOWN_TRIGGERS.get(language);
  return trigger === undefined || trigger[1].test(text) ? undefined : trigger[0];
}
//@ chunk-rep15ptw.js:3790-3852 placement
/**
 * 对需要预算的语言，计算超长子语言文本的裁剪结果。
 */
function sublanguageOverflowCheck(text, language) {
  return HIGHLIGHT_LANGUAGES.has(language) && text.length > MAX_SUBLANGUAGE_CHARS
    ? longTokenCost(text, markdownTriggerChar(text, language))
    : 0;
}
//@ chunk-rep15ptw.js:3852-3906 placement
/**
 * 判断某语言的文本是否可在预算内高亮（长度与子语言预算）。
 */
var languageSubLanguageMap = (text, language) =>
  text.length <= (LANGUAGE_MAX_BYTES.get(language) ?? DEFAULT_MAX_CODE_BYTES) &&
  sublanguageOverflowCheck(text, language) <= MAX_SUBLANGUAGE_BYTES;
//@ chunk-rep15ptw.js:3906-4389 placement
/**
 * 沿子语言图找到某语言实际依赖的受限语言名（用于套用该语言的长度上限）。
 */
function rootHighlightLanguage(hljs, language) {
  let languageByName = new Map(
    [...KNOWN_LANGUAGES].flatMap((name) => {
      let language = hljs.getLanguage(name);
      return language === undefined ? [] : [[language, name]];
    }),
  );
  let visited = new Set();
  let pending = KNOWN_LANGUAGES.has(language) ? [] : [hljs.getLanguage(language)];
  let fallback = language;
  while (pending.length > 0) {
    let node = pending.pop();
    if (typeof node !== "object" || node === null || visited.has(node)) continue;
    let resolved =
      "subLanguage" in node && Array.isArray(node.subLanguage) && node.subLanguage.length === 0
        ? ([...languageByName.values()].find((name) => !MARKDOWN_TRIGGERS.has(name)) ??
          languageByName.values().next().value)
        : languageByName.get(node);
    if (resolved !== undefined && !MARKDOWN_TRIGGERS.has(resolved)) return resolved;
    fallback = resolved ?? fallback;
    visited.add(node);
    pending.push(...(resolved === undefined ? languageChildren(hljs, node) : []));
  }
  return fallback;
}
//@ chunk-rep15ptw.js:4389-4487 placement
var withMarkdownBudgetHooks = (hljs) => ({
  "before:highlight": ({ code, language }) => {
    if (!isWithinCodeBudget(code) && !languageSubLanguageMap(code, rootHighlightLanguage(hljs, language)))
      throw new HighlightLimitError();
  },
});
//@ chunk-rep15ptw.js:4487-4915 placement
/**
 * 计算语言定义中子语言的最大扇出。
 */
function maxSubLanguageFanout(hljs, rootMode) {
  let visited = new Set();
  let stack = [rootMode];
  let fanout = 0;
  while (stack.length > 0) {
    let node = stack.pop();
    if (typeof node !== "object" || node === null || visited.has(node)) continue;
    visited.add(node);
    let subLanguage = "subLanguage" in node ? node.subLanguage : undefined;
    let isArray = Array.isArray(subLanguage);
    fanout = Math.max(fanout, isArray ? subLanguage.length || Number.POSITIVE_INFINITY : 0);
    stack.push(
      ...[subLanguage ?? []]
        .flat()
        .filter((name) => typeof name === "string")
        .map((name) => hljs.getLanguage(name)),
      ...(node.contains ?? []),
      ...("variants" in node ? (node.variants ?? []) : []),
      "starts" in node ? node.starts : undefined,
    );
  }
  return fanout;
}
//@ chunk-rep15ptw.js:4915-5150 placement
function createHighlightBudget(hljs, cap) {
  let weakMap = new WeakMap();
  let knownLanguages = 0;
  function fanoutOf(rootMode) {
    let languageCount = hljs.listLanguages().length;
    if (rootMode === undefined) return 0;
    if (languageCount !== knownLanguages) {
      weakMap = new WeakMap();
      knownLanguages = languageCount;
    }
    let fanout = weakMap.get(rootMode) ?? maxSubLanguageFanout(hljs, rootMode);
    weakMap.set(rootMode, fanout);
    return Math.min(fanout, languageCount, cap);
  }
  return (languageName, codeLength) =>
    MAX_EMIT_BUDGET +
    codeLength * (EMIT_COST_FACTOR + MAX_REPEAT_SPAN * fanoutOf(hljs.getLanguage(languageName)));
}
//@ chunk-rep15ptw.js:5150-5362 placement
var budgetHooks = (budget, highlightBudget, spentRef) => ({
  "before:highlight": (context) => {
    budget.left = highlightBudget(context.language, context.code.length);
    spentRef.spent = budget.left;
  },
  "after:highlight": () => {
    let overspent = budget.left < 0;
    spentRef.spent -= Math.max(budget.left, 0);
    budget.left = Number.POSITIVE_INFINITY;
    if (overspent) throw new HighlightBoundError();
  },
});
//@ chunk-rep15ptw.js:5362-5615 placement
/**
 * 给 highlight.js 实例装上有界高亮：替换发射器并加入预算插件，返回包装高亮调用的函数。
 */
function installHighlightBounds(hljs, cap) {
  let Emitter = hljs.highlightAuto("", [])._emitter.constructor;
  if ("isBounded" in Emitter) return noopRun;
  hljs.addPlugin(withMarkdownBudgetHooks(hljs));
  if (!isBoundedGrammar(Emitter)) return noopRun;
  let budget = {
    left: Number.POSITIVE_INFINITY,
  };
  let spentRef = {
    spent: 0,
  };
  hljs.configure({
    __emitter: createBoundedEmitter(Emitter, budget),
  });
  hljs.addPlugin(budgetHooks(budget, createHighlightBudget(hljs, cap), spentRef));
  return withBudgetReset(spentRef);
}
//@ chunk-rep15ptw.js:5615-5635 placement
/**
 * 以最大嵌套深度包装高亮运行函数。
 */
var withMaxDepth = (hljs) => installHighlightBounds(hljs, MAX_NESTING_DEPTH);
//@ chunk-rep15ptw.js:5635-5676 placement
var cloneGrammar = ["begin", "end", "match", "illegal"];
//@ chunk-rep15ptw.js:5676-5793 placement
var regexpRewriter = (rewrites) => (value) => {
  let rewritten = rewrites.get(typeof value === "string" ? value : value.source);
  try {
    return rewritten === undefined ? value : new RegExp(rewritten);
  } catch {
    return value;
  }
};
//@ chunk-rep15ptw.js:5793-5873 placement
function cloneGrammarDeep(starts) {
  return typeof starts === "object" && starts !== null && Object.isFrozen(starts)
    ? {
        ...starts,
      }
    : starts;
}
//@ chunk-rep15ptw.js:5873-6249 placement
/**
 * 遍历语言定义的模式树，把已知会回溯爆炸的正则替换为有界版本。
 */
function rewriteLanguageRegexps(grammar, rewrites) {
  let visited = new Set();
  let stack = [grammar];
  let rewrite = regexpRewriter(rewrites);
  while (stack.length > 0) {
    let node = stack.pop();
    if (!(typeof node === "object" && node !== null) || visited.has(node)) continue;
    visited.add(node);
    for (let key of cloneGrammar) {
      let value = node[key];
      if (value !== undefined && value !== null)
        node[key] = Array.isArray(value) ? value.map(rewrite) : rewrite(value);
    }
    node.contains &&= node.contains.map(cloneGrammarDeep);
    node.variants &&= node.variants.map(cloneGrammarDeep);
    node.starts &&= cloneGrammarDeep(node.starts);
    stack.push(...(node.contains ?? []), ...(node.variants ?? []), node.starts);
  }
  return grammar;
}
//@ chunk-rep15ptw.js:6249-6261 placement
var MAX_CPP_REGEX_BYTES = 1000;
//@ chunk-rep15ptw.js:6261-6273 placement
var MAX_C_REGEX_BYTES = 1000;
//@ chunk-rep15ptw.js:6273-6283 placement
var CPP_TEMPLATE_SPAN = 16;
//@ chunk-rep15ptw.js:6283-6295 placement
var MAX_CPP_TOKEN_BYTES = 1000;
//@ chunk-rep15ptw.js:6295-6305 placement
var MAX_CPP_TEMPLATE_DEPTH = 12;
//@ chunk-rep15ptw.js:6305-6317 placement
var MAX_CPP_REGEX_ITEM_BYTES = 1500;
//@ chunk-rep15ptw.js:6317-6328 placement
var MAX_CPP_REGEX_REPEAT = 1e4;
//@ chunk-rep15ptw.js:6328-6338 placement
var CPP_TEMPLATE_MAX_PARTS = 16;
//@ chunk-rep15ptw.js:6338-6749 placement
/**
 * C/C++ 函数声明正则的原版与有界版本。
 */
var cppFunctionPatterns = (declSpec) => [
  String.raw`(${declSpec}(decltype\(auto\)|(?:[a-zA-Z_]\w*::)?[a-zA-Z_]\w*` +
    String.raw`(?:<[^<>]+>)?)[\*&\s]+)+` +
    String.raw`(?:[a-zA-Z_]\w*::)?[a-zA-Z]\w*\s*\(`,
  String.raw`(?=[a-zA-Z_])` +
    String.raw`(?:(?=decltype\(auto\))|(?<!${declSpec}[a-zA-Z_]\w*?))` +
    String.raw`(${declSpec}(decltype\(auto\)|(?:[a-zA-Z_]\w*::)?[a-zA-Z_]\w*` +
    String.raw`(?:<[^<>]+>)?)[\*&\s]+){1,${CPP_TEMPLATE_MAX_PARTS}}` +
    String.raw`(?:[a-zA-Z_]\w*::)?[a-zA-Z]\w*\s*\(`,
];
//@ chunk-rep15ptw.js:6749-6764 placement
var CPP_BOUNDED_PATTERNS = [cppFunctionPatterns("")];
//@ chunk-rep15ptw.js:6764-7256 placement
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
//@ chunk-rep15ptw.js:7256-7280 placement
var CPP_TYPE_PATTERN = [cppFunctionPatterns("(?!struct)")];
//@ chunk-rep15ptw.js:7280-7703 placement
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
//@ chunk-rep15ptw.js:7703-8135 placement
var mapped = [
  String.raw`(?:\.|\.\/|\/)?(?:""|"[^"]+"|''|'[^']+'|\[\]|\[[^\]]+\]|` +
    String.raw`[^\s!"#%&'()*+,.\/;<=>@\[\\\]^` +
    "`" +
    String.raw`{|}~]+)(?:(\.|\/)(?:""|"[^"]+"|''|'[^']+'|\[\]|\[[^\]]+\]|` +
    String.raw`[^\s!"#%&'()*+,.\/;<=>@\[\\\]^` +
    "`" +
    String.raw`{|}~]+))*`,
  String.raw`(\[\]|\[[^\]]+\]|[^\s!"#%&'()*+,.\/;<=>@\[\\\]^` + "`" + String.raw`{|}~]+)(?==)`,
].map((regex) => [
  regex,
  regex.replaceAll(String.raw`[^\]]+\]`, String.raw`[^\]]{1,${MAX_CPP_REGEX_BYTES}}\]`),
]);
//@ chunk-rep15ptw.js:8135-8499 placement
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
//@ chunk-rep15ptw.js:8499-8680 placement
var MARKDOWN_FENCE_REWRITES = [
  ["(`{3,})[^`](.|\\n)*?\\1`*[ ]*", "(`{3,})[^`][^\\r\\u2028\\u2029]*?\\1`*[ ]*"],
  [String.raw`(~{3,})[^~](.|\n)*?\1~*[ ]*`, String.raw`(~{3,})[^~][^\r\u2028\u2029]*?\1~*[ ]*`],
];
//@ chunk-rep15ptw.js:8680-9122 placement
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
//@ chunk-rep15ptw.js:9122-9929 placement
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
].map((regex) => [regex, regex.replaceAll(")*?", `){0,${MAX_CPP_REGEX_ITEM_BYTES}}?`)]);
//@ chunk-rep15ptw.js:9929-10429 placement
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
//@ chunk-rep15ptw.js:10429-10598 placement
var RUBY_HEREDOC_REWRITES = [
  [
    String.raw`<<[-~]?'?(?=(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)*?\s*\1\b)`,
    String.raw`<<[-~]?'?(?=(\w+)(?=\W)[^\n]*\n(?:[^\n]*\n)` +
      String.raw`{0,${MAX_CPP_TOKEN_BYTES}}?[^\S\n]*\1\b)`,
  ],
];
//@ chunk-rep15ptw.js:10598-10688 placement
var LANGUAGE_GRAMMARS = [
  [String.raw`b?r(#*)"(.|\n)*?"\1(?!#)`, String.raw`b?r(#*)"[^]{0,${MAX_CPP_REGEX_REPEAT}}?"\1(?!#)`],
];
//@ chunk-rep15ptw.js:10688-10859 placement
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
//@ chunk-rep15ptw.js:10859-10960 placement
/**
 * 包装语言定义工厂：用有界正则替换已知的危险正则，失败时退回原定义。
 */
var withBoundedRegexps = (languageId, resolveGrammar) => (grammar) => {
  let resolved = resolveGrammar(grammar);
  try {
    return rewriteLanguageRegexps(
      resolved,
      new Map([...SHARED_REGEX_REWRITES, ...(LANGUAGE_REGEX_REWRITES.get(languageId) ?? [])]),
    );
  } catch {
    return resolveGrammar(grammar);
  }
};
export {
  languageSubLanguageMap,
  MAX_SUBLANGUAGE_CHARS,
  rootHighlightLanguage,
  sublanguageOverflowCheck,
  MAX_SUBLANGUAGE_BYTES,
  noopRun,
  withMaxDepth,
  withBoundedRegexps,
  TOTAL_BUDGET_BYTES,
};
