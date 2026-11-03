/**
 * utils/cliHighlight.ts
 *
 * 惰性加载 cli-highlight 及其语言支持检查。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/cliHighlight.ts
 * pieces: chunk-85hd307w.js (9), chunk-aepeg2w5.js (3)
 * attribution: placement 6, sole-consumer 5, fingerprint 1
 */
import { sequential } from "./sequential.js";
import { mergeCombiningGraphemes } from "./intl.js";
import { h } from "../../vendor/cli-highlight/dist/theme.js";
import { ensureHighlightLanguage, highlightUnderMessage, highlightCore } from "./cliHighlightLanguages.js";

//@ chunk-85hd307w.js:345-361 placement = RESET (1)
var RESET = "\x1B[0m";
//@ chunk-85hd307w.js:361-457 placement
function plainWithReset(e) {
  return sequential.level > 0 && e.includes(RESET)
    ? RESET + e.replace(/\r?\n/g, `${RESET}$&${RESET}`) + RESET
    : sequential.reset(e);
}
//@ chunk-85hd307w.js:1135-1247 sole-consumer
function mergeSplitGraphemes(e) {
  let t = [];
  let r = [];
  collectTextNodes(e, t, r);
  let i = mergeCombiningGraphemes(r);
  if (i === r) return;
  t.forEach(({ siblings, at }, g) => {
    siblings[at] = i[g];
  });
}
//@ chunk-85hd307w.js:1247-1376 sole-consumer
function collectTextNodes(e, t, r) {
  e.children.forEach((child, at) => {
    if (typeof child === "string") {
      t.push({
        siblings: e.children,
        at,
      });
      r.push(child);
    } else collectTextNodes(child, t, r);
  });
}
//@ chunk-85hd307w.js:1376-1505 sole-consumer
function renderHighlightNode(e) {
  if (typeof e === "string") return e;
  let joined = e.children.map(renderHighlightNode).join("");
  let r = e.scope ?? e.kind;
  let i = r ? h(r) : undefined;
  return i ? i(joined) : joined;
}
//@ chunk-85hd307w.js:1505-1850 sole-consumer
/**
 * 用 highlight.js 高亮代码（可在工作线程中执行），合并被拆开的组合字符后按作用域着色；语言不支持或出错时原样返回。
 */
function highlightCode(e, t) {
  let language = t?.language;
  if (!language) return e;
  try {
    let highlightLanguage = ensureHighlightLanguage(language);
    if (!highlightLanguage) return e;
    let work = t?.work;
    let s = work
      ? highlightUnderMessage(work, (c) =>
          c.highlight(e, {
            language: highlightLanguage,
            ignoreIllegals: true,
          }),
        )
      : highlightCore().highlight(e, {
          language: highlightLanguage,
          ignoreIllegals: true,
        });
    let g = s._emitter ?? s.emitter;
    let a = g?.rootNode ?? g?.root;
    if (!a || typeof a === "string") return e;
    mergeSplitGraphemes(a);
    return a.children.map(renderHighlightNode).join("");
  } catch {
    return e;
  }
}
//@ chunk-85hd307w.js:1850-1885 sole-consumer
/**
 * 判断高亮器是否支持某语言。
 */
function isSupportedHighlightLanguage(e) {
  return ensureHighlightLanguage(e) !== null;
}
//@ chunk-85hd307w.js:1885-1924 fingerprint = loadCliHighlight (0.783)
var loadCliHighlight = {
  highlight: highlightCode,
  supportsLanguage: isSupportedHighlightLanguage,
};
//@ chunk-85hd307w.js:1924-1947 placement
/**
 * 返回 CLI 高亮模块（highlight 与 supportsLanguage）。
 */
function getCliHighlightModule() {
  return loadCliHighlight;
}
//@ chunk-aepeg2w5.js:682798-683194 placement
/**
 * highlight.js 的 Cedar 语言定义。
 */
var cedarLanguage = (e) => ({
  name: "Cedar",
  aliases: ["cedarpolicy"],
  keywords: {
    keyword: "permit forbid when unless if then else in has like is",
    built_in: "principal action resource context decimal ip contains containsAll containsAny",
    literal: "true false",
  },
  contains: [
    e.QUOTE_STRING_MODE,
    e.C_NUMBER_MODE,
    e.C_LINE_COMMENT_MODE,
    {
      className: "meta",
      begin: /@\w+/,
    },
    {
      className: "type",
      begin: /\b[A-Z]\w*(::[A-Z]\w*)*/,
    },
  ],
});
var CEDAR_LANGUAGE_DEFINITION = cedarLanguage;
//@ chunk-aepeg2w5.js:683194-683282 placement
/**
 * 内置的 Cedar 语言定义表。
 */
var CEDAR_LANGUAGES = {
  cedar: CEDAR_LANGUAGE_DEFINITION,
};
var CEDAR_ALIASES = new Set(["cedarpolicy"]);
var CEDAR_DISPLAY_NAMES = {
  cedar: "Cedar",
  cedarpolicy: "Cedar",
};
//@ chunk-aepeg2w5.js:683282-690062 placement
/**
 * 高亮语言 id 到显示名的大表。
 */
var LANGUAGE_NAMES = {
  abnf: "Augmented Backus-Naur Form",
  accesslog: "Apache Access Log",
  actionscript: "ActionScript",
  ada: "Ada",
  angelscript: "AngelScript",
  apache: "Apache config",
  applescript: "AppleScript",
  arcade: "ArcGIS Arcade",
  arduino: "Arduino",
  armasm: "ARM Assembly",
  asciidoc: "AsciiDoc",
  aspectj: "AspectJ",
  autohotkey: "AutoHotkey",
  autoit: "AutoIt",
  avrasm: "AVR Assembly",
  awk: "Awk",
  axapta: "X++",
  bash: "Bash",
  basic: "BASIC",
  bnf: "Backus\u2013Naur Form",
  brainfuck: "Brainfuck",
  c: "C",
  cal: "C/AL",
  capnproto: "Cap\u2019n Proto",
  ceylon: "Ceylon",
  clean: "Clean",
  clojure: "Clojure",
  "clojure-repl": "Clojure REPL",
  cmake: "CMake",
  coffeescript: "CoffeeScript",
  coq: "Coq",
  cos: "Cach\xE9 Object Script",
  cpp: "C++",
  crmsh: "crmsh",
  crystal: "Crystal",
  csharp: "C#",
  csp: "CSP",
  css: "CSS",
  d: "D",
  dart: "Dart",
  delphi: "Delphi",
  diff: "Diff",
  django: "Django",
  dns: "DNS Zone",
  dockerfile: "Dockerfile",
  dos: "Batch file (DOS)",
  dsconfig: "dsconfig",
  dts: "Device Tree",
  dust: "Dust",
  ebnf: "Extended Backus-Naur Form",
  elixir: "Elixir",
  elm: "Elm",
  erb: "ERB",
  erlang: "Erlang",
  "erlang-repl": "Erlang REPL",
  excel: "Excel formulae",
  fix: "FIX",
  flix: "Flix",
  fortran: "Fortran",
  fsharp: "F#",
  gams: "GAMS",
  gauss: "GAUSS",
  gcode: "G-code (ISO 6983)",
  gherkin: "Gherkin",
  glsl: "GLSL",
  go: "Go",
  golo: "Golo",
  gradle: "Gradle",
  graphql: "GraphQL",
  groovy: "Groovy",
  haml: "HAML",
  handlebars: "Handlebars",
  haskell: "Haskell",
  haxe: "Haxe",
  hsp: "HSP",
  http: "HTTP",
  hy: "Hy",
  inform7: "Inform 7",
  ini: "TOML, also INI",
  irpf90: "IRPF90",
  java: "Java",
  javascript: "JavaScript",
  "jboss-cli": "JBoss CLI",
  json: "JSON",
  julia: "Julia",
  "julia-repl": "Julia REPL",
  kotlin: "Kotlin",
  lasso: "Lasso",
  latex: "LaTeX",
  ldif: "LDIF",
  leaf: "Leaf",
  less: "Less",
  lisp: "Lisp",
  livecodeserver: "LiveCode",
  livescript: "LiveScript",
  llvm: "LLVM IR",
  lsl: "LSL (Linden Scripting Language)",
  lua: "Lua",
  makefile: "Makefile",
  markdown: "Markdown",
  matlab: "Matlab",
  mel: "MEL",
  mercury: "Mercury",
  mipsasm: "MIPS Assembly",
  mizar: "Mizar",
  mojolicious: "Mojolicious",
  monkey: "Monkey",
  moonscript: "MoonScript",
  n1ql: "N1QL",
  nestedtext: "Nested Text",
  nginx: "Nginx config",
  nim: "Nim",
  nix: "Nix",
  "node-repl": "Node REPL",
  nsis: "NSIS",
  objectivec: "Objective-C",
  ocaml: "OCaml",
  openscad: "OpenSCAD",
  oxygene: "Oxygene",
  parser3: "Parser3",
  perl: "Perl",
  pf: "Packet Filter config",
  pgsql: "PostgreSQL",
  php: "php",
  "php-template": "PHP template",
  plaintext: "Plain text",
  pony: "Pony",
  powershell: "PowerShell",
  processing: "Processing",
  profile: "Python profiler",
  prolog: "Prolog",
  properties: ".properties",
  protobuf: "Protocol Buffers",
  puppet: "Puppet",
  purebasic: "PureBASIC",
  python: "Python",
  "python-repl": "python-repl",
  q: "Q",
  qml: "QML",
  r: "R",
  reasonml: "ReasonML",
  rib: "RenderMan RIB",
  roboconf: "Roboconf",
  routeros: "MikroTik RouterOS script",
  rsl: "RenderMan RSL",
  ruby: "Ruby",
  ruleslanguage: "Oracle Rules Language",
  rust: "Rust",
  sas: "SAS",
  scala: "Scala",
  scheme: "Scheme",
  scilab: "Scilab",
  scss: "SCSS",
  shell: "Shell Session",
  smali: "Smali",
  smalltalk: "Smalltalk",
  sml: "SML (Standard ML)",
  sql: "SQL",
  stan: "Stan",
  stata: "Stata",
  step21: "STEP Part 21",
  stylus: "Stylus",
  subunit: "SubUnit",
  swift: "Swift",
  taggerscript: "Tagger Script",
  tap: "Test Anything Protocol",
  tcl: "Tcl",
  thrift: "Thrift",
  tp: "TP",
  twig: "Twig",
  typescript: "TypeScript",
  vala: "Vala",
  vbnet: "Visual Basic .NET",
  vbscript: "VBScript",
  "vbscript-html": "VBScript in HTML",
  verilog: "Verilog",
  vhdl: "VHDL",
  vim: "Vim Script",
  wasm: "WebAssembly",
  wren: "Wren",
  x86asm: "Intel x86 Assembly",
  xl: "XL",
  xml: "HTML, XML",
  xquery: "XQuery",
  yaml: "YAML",
  zephir: "Zephir",
};
var HIGHLIGHT_LANGUAGE_NAME_MAP = {
  as: "actionscript",
  asc: "angelscript",
  apacheconf: "apache",
  osascript: "applescript",
  ino: "arduino",
  arm: "armasm",
  adoc: "asciidoc",
  ahk: "autohotkey",
  "x++": "axapta",
  sh: "bash",
  zsh: "bash",
  bf: "brainfuck",
  h: "c",
  capnp: "capnproto",
  icl: "clean",
  dcl: "clean",
  clj: "clojure",
  edn: "clojure",
  "cmake.in": "cmake",
  coffee: "coffeescript",
  cson: "coffeescript",
  iced: "coffeescript",
  cls: "cos",
  cc: "cpp",
  "c++": "cpp",
  "h++": "cpp",
  hpp: "cpp",
  hh: "cpp",
  hxx: "cpp",
  cxx: "cpp",
  crm: "crmsh",
  pcmk: "crmsh",
  cr: "crystal",
  cs: "csharp",
  "c#": "csharp",
  dpr: "delphi",
  dfm: "delphi",
  pas: "delphi",
  pascal: "delphi",
  patch: "diff",
  jinja: "django",
  bind: "dns",
  zone: "dns",
  docker: "dockerfile",
  bat: "dos",
  cmd: "dos",
  dst: "dust",
  ex: "elixir",
  exs: "elixir",
  erl: "erlang",
  xlsx: "excel",
  xls: "excel",
  f90: "fortran",
  f95: "fortran",
  fs: "fsharp",
  "f#": "fsharp",
  gms: "gams",
  gss: "gauss",
  nc: "gcode",
  feature: "gherkin",
  golang: "go",
  gql: "graphql",
  hbs: "handlebars",
  "html.hbs": "handlebars",
  "html.handlebars": "handlebars",
  htmlbars: "handlebars",
  hs: "haskell",
  hx: "haxe",
  https: "http",
  hylang: "hy",
  i7: "inform7",
  toml: "ini",
  jsp: "java",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  "wildfly-cli": "jboss-cli",
  jsonc: "json",
  jldoctest: "julia-repl",
  kt: "kotlin",
  kts: "kotlin",
  ls: "livescript",
  lassoscript: "lasso",
  tex: "latex",
  pluto: "lua",
  mk: "makefile",
  mak: "makefile",
  make: "makefile",
  md: "markdown",
  mkdown: "markdown",
  mkd: "markdown",
  m: "mercury",
  moo: "mercury",
  mips: "mipsasm",
  moon: "moonscript",
  nt: "nestedtext",
  nginxconf: "nginx",
  nixos: "nix",
  mm: "objectivec",
  objc: "objectivec",
  "obj-c": "objectivec",
  "obj-c++": "objectivec",
  "objective-c++": "objectivec",
  ml: "sml",
  scad: "openscad",
  pl: "perl",
  pm: "perl",
  "pf.conf": "pf",
  postgres: "pgsql",
  postgresql: "pgsql",
  text: "plaintext",
  txt: "plaintext",
  pwsh: "powershell",
  ps: "powershell",
  ps1: "powershell",
  pde: "processing",
  proto: "protobuf",
  pp: "puppet",
  pb: "purebasic",
  pbi: "purebasic",
  py: "python",
  gyp: "python",
  ipython: "python",
  pycon: "python-repl",
  k: "q",
  kdb: "q",
  qt: "qml",
  re: "reasonml",
  graph: "roboconf",
  instances: "roboconf",
  mikrotik: "routeros",
  rb: "ruby",
  gemspec: "ruby",
  podspec: "ruby",
  thor: "ruby",
  irb: "ruby",
  rs: "rust",
  scm: "scheme",
  sci: "scilab",
  console: "shell",
  shellsession: "shell",
  st: "smalltalk",
  stanfuncs: "stan",
  do: "stata",
  ado: "stata",
  p21: "step21",
  step: "step21",
  stp: "step21",
  styl: "stylus",
  tk: "tcl",
  craftcms: "twig",
  ts: "typescript",
  tsx: "typescript",
  mts: "typescript",
  cts: "typescript",
  vb: "vbnet",
  vbs: "vbscript",
  v: "verilog",
  sv: "verilog",
  svh: "verilog",
  tao: "xl",
  html: "xml",
  xhtml: "xml",
  rss: "xml",
  atom: "xml",
  xjb: "xml",
  xsd: "xml",
  xsl: "xml",
  plist: "xml",
  wsf: "xml",
  svg: "xml",
  xpath: "xquery",
  xq: "xquery",
  xqm: "xquery",
  yml: "yaml",
  zep: "zephir",
  mysql: "sql",
  oracle: "sql",
  freepascal: "delphi",
  lazarus: "delphi",
  lpr: "delphi",
  lfm: "delphi",
  php3: "php",
  php4: "php",
  php5: "php",
  php6: "php",
  php7: "php",
  php8: "php",
};
var HIGHLIGHT_LANGUAGE_ALIASES = {
  asciidoc: ["xml"],
  "clojure-repl": ["clojure"],
  coffeescript: ["javascript"],
  cos: ["javascript", "sql", "xml"],
  dart: ["markdown"],
  django: ["xml"],
  dockerfile: ["bash"],
  dust: ["xml"],
  erb: ["ruby", "xml"],
  haml: ["ruby"],
  handlebars: ["xml"],
  javascript: ["css", "graphql", "xml"],
  "julia-repl": ["julia"],
  livescript: ["javascript"],
  markdown: ["xml"],
  mojolicious: ["perl", "xml"],
  nix: ["markdown"],
  "node-repl": ["javascript"],
  parser3: ["xml"],
  perl: ["mojolicious"],
  pgsql: ["bash", "java", "json", "lua", "perl", "php", "python", "r", "ruby", "scheme", "tcl", "xml"],
  "php-template": ["php", "xml"],
  "python-repl": ["python"],
  qml: ["xml"],
  shell: ["bash"],
  tap: ["yaml"],
  twig: ["xml"],
  typescript: ["css", "graphql", "xml"],
  "vbscript-html": ["vbscript", "xml"],
  xml: ["css", "handlebars", "javascript"],
  xquery: ["xml"],
  yaml: ["ruby"],
};
export {
  LANGUAGE_NAMES,
  HIGHLIGHT_LANGUAGE_NAME_MAP,
  getCliHighlightModule,
  plainWithReset,
  CEDAR_DISPLAY_NAMES,
  HIGHLIGHT_LANGUAGE_ALIASES,
  CEDAR_LANGUAGES,
  CEDAR_ALIASES,
};
