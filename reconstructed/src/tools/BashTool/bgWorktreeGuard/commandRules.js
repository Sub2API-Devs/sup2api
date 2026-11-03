/**
 * tools/BashTool/bgWorktreeGuard/commandRules.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的逐命令规则：识别会写到 worktree 之外、远程执行（ssh/kubectl 等）或无法静态判定目标的命令。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63f0f3kd.js (56)
 * attribution: placement 56
 */
import { basename, basename as basename_2 } from "path";
import {
  SHELL_PROGRAM_NAMES,
  EVAL_LIKE_BUILTINS,
  POSIX_SHELL_NAMES,
  parseForSecurityFromAst,
  POSIX_SPECIAL_BUILTINS_NONEVAL,
  APPLET_SHELL_NAMES,
  UNHANDLED_EXEC_WRAPPERS,
  SET_O_SAFE_LETTERS,
  READ_DATA_FLAGS,
  READ_NUMERIC_ARG_FLAGS,
  READ_NUMERIC_OPERAND_RE,
  AWK_NAMES,
  awkProgramHasExecBridge,
} from "../../../utils/bash/ast.js";
import {
  GIT_COMMAND_PATTERN,
  Wt,
  isParseFailureNode,
  wordSet,
  isPlainWordText,
  Pe,
  Dn,
  me,
  SHELL_NAME_PATTERN,
  DYNAMIC_VALUE_FLAGS,
} from "./shellState.js";
import {
  GIT_TOO_COMPLEX_REASON,
  TOO_COMPLEX_SUFFIX,
  Me,
  describeWordValue,
  unescapeDoubleQuoted,
  evaluateWord,
  ts,
  isBraceExpansionNode,
  isBracketGlobNode,
  unverifiableRunReason,
  shortenForReason,
  analyzeAssignment,
  OPTION_POSITION_NOTE,
  dynamicArgumentReason,
  OPTION_POSITION_NOTE_LONG,
  WORD_NODE_TYPES,
  tooComplexReason,
  REDIRECT_NODE_TYPES,
  isStaticNode,
  ns,
  hasChildWordMatching,
  SED_PATTERN_NOTE,
  dynamicValue,
} from "./wordValues.js";
import {
  DECLARATION_BUILTINS,
  isSafeShellOption,
  isDevicePath,
  isOpaquePathArgument,
  dt,
  rn,
  Hn,
  ot,
  Ft,
  SHELL_COMMAND_FLAG_PATTERN,
  It,
  sn,
  GREP_PATTERN_OPTIONS,
  normalizeSortOption,
  RG_PROGRAM_OPTIONS,
  findGrepPatternFlag,
  Fs,
  zs,
  zn,
  TENGU_HUMBLE_WHALE,
  Vs,
  $e,
  ti,
  Ks,
  js,
  un,
  an,
  qs,
} from "./commandTables.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import {
  BOT_PROTECTED_TENGU_HUSHED_HYPHEN,
  withStdinState,
  isStdinRedirect,
  containsSubstitution,
  analyzeVariableAssignment,
  analyzeHeredocRedirect,
  environmentAssignmentReason,
  describeIntegerTyping,
  analyzeRedirect,
  describeUnsafeBinding,
} from "./statementWalk.js";
import { getParserModule } from "../../../utils/bash/bashParser.js";
import { count } from "../../../utils/collections.js";
import { getPlatform } from "../../../utils/platform.js";

//@ chunk-63f0f3kd.js:50717-50884 placement
function programBaseName(t) {
  let replaced = basename_2(t.replace(/\\/g, "/"))
      .toLowerCase()
      .replace(/\.(?:exe|bat|cmd|com)$/, ""),
    replaced_2 = replaced.replace(/([a-z])-?\d[\d.]*$/, "$1");
  return INTERPRETER_RULES.has(replaced_2) || SHELL_PROGRAM_NAMES.has(replaced_2) ? replaced_2 : replaced;
}
/**
 * 若命令是 git 或可能间接执行 git 的声明/eval 类内建命令，返回说明原因。
 */
//@ chunk-63f0f3kd.js:50884-51057 placement
function describeGitRunner(t) {
  let e = programBaseName(t);
  if (GIT_COMMAND_PATTERN.test(e)) return GIT_TOO_COMPLEX_REASON;
  return DECLARATION_BUILTINS.has(e) || EVAL_LIKE_BUILTINS.has(e)
    ? `runs ${e} ${TOO_COMPLEX_SUFFIX}; what it reads or is handed as shell text cannot be shown not to run git`
    : null;
}
/**
 * 各解释器（python/node/bun/deno/perl/ruby/php/lua/R/julia/osascript/groovy/tcl）的命令行规则表：内联代码选项、模块选项、取值选项、普通标志、能启动其他程序的代码特征（bridge）、启动时相关的环境变量前缀。
 */
//@ chunk-63f0f3kd.js:51057-55417 placement
var NEVER_MATCH_RE = /(?!)/,
  INTERPRETER_RULE_DEFAULTS = {
    module: NEVER_MATCH_RE,
    inlineEndsOptions: !1,
    console: NEVER_MATCH_RE,
    literalScript: !1,
    scriptAfterDashes: !0,
  },
  GENERIC_BRIDGE_RE = /system|exec|popen|spawn|eval|shell|\x60|\bopen\b|pipe\(|load|dofile|source|require/i,
  NODE_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^(?:-[ep]|--(?:eval|print))$|^--(?:eval|print)=(.*)$/s,
    console: /^inspect$/,
    valued: /^(?:-[rC]|--(?:require|import|loader|experimental-loader|conditions|env-file))$/,
    flag: /^(?:-[vhc]|--[a-z][a-z0-9-]*=.*|--(?:no-[a-z-]+|enable-source-maps|experimental-[a-z-]+|trace-[a-z-]+|inspect(?:-brk)?|expose-gc|version|help|check|watch|test))$/,
    bridge:
      /child_process|exec\w*\s*\(|_compile|spawn(?:Sync)?\s*\(|\beval\b(?!['"])|\bFunction\b|runMain|\.constructor|import\s*\(|--import|--require|--loader|-r\b|require\s*\(\s*[^'"\s)]|\bvm\b|runIn\w*Context|inspector|repl|dlopen|process\.binding|worker_threads|\bWorker\(|\$`|Bun\.\$|Deno\./,
    environment: /^(?:NODE_|NPM_CONFIG_)/,
  },
  LUA_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^-e(.*)$/s,
    valued: /^-l$/,
    flag: /^-(?:[vEW]|l.+)$/,
    bridge: GENERIC_BRIDGE_RE,
    environment: /^LUA_/,
  },
  R_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^-e(.*)$/s,
    valued: /^-f$/,
    flag: /^--[a-z][a-z-]*(?:=.*)?$/,
    bridge: GENERIC_BRIDGE_RE,
    environment: /^R_/,
  },
  TCL_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: NEVER_MATCH_RE,
    valued: /^-encoding$/,
    flag: NEVER_MATCH_RE,
    bridge: GENERIC_BRIDGE_RE,
    environment: /^TCL/,
  },
  PYTHON_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^-[bBdEhIOPqRsSuvVx3]*c(.*)$/s,
    inlineEndsOptions: !0,
    module: /^-[bBdEhIOPqRsSuvVx3]*m$/,
    valued: /^(?:-[bBdEhIOPqRsSuvVx3]*[WX]|--check-hash-based-pycs)$/,
    flag: /^(?:-[bBdEhIOPqRsSuvVx3]+|-[WX].+|--(?:version|help)[a-z-]*)$/,
    bridge:
      /system|subprocess|[pP]open|spawn|\bexec\b(?!['"])|exec\w*\s*\(|\beval\b(?!['"])|(?:^|[^.\w])compile\s*\(|\bimp\.|__import__|importlib|runpy|getattr\s*\(|\b(?:globals|locals|vars)\s*\(|builtins|pickle|marshal|shelve|ctypes|breakpoint|\b[bp]db\b|\bcode\.|(?:from|import)\s+code\b|codeop|Interactive(?:Console|Interpreter)|\binteract\s*\(|cProfile|\bprofile\.run|\btrace\b|timeit|\bpty\b|webbrowser|\bdoctest\b/,
    environment: /^PYTHON/,
  },
  INTERPRETER_RULES = new Map(
    Object.entries({
      python: PYTHON_INTERPRETER_RULES,
      pypy: PYTHON_INTERPRETER_RULES,
      ipython: PYTHON_INTERPRETER_RULES,
      node: NODE_INTERPRETER_RULES,
      nodejs: NODE_INTERPRETER_RULES,
      tsx: NODE_INTERPRETER_RULES,
      "ts-node": NODE_INTERPRETER_RULES,
      bun: {
        ...NODE_INTERPRETER_RULES,
        module: /^(?:run|x)$/,
        valued: /^(?:-r|--(?:preload|config|cwd|env-file))$/,
        flag: /^(?:-[vh]|--[a-z][a-z0-9-]*=.*|--(?:no-[a-z-]+|version|help|watch|hot|bun|silent|smol)|test)$/,
        console: /^repl$/,
        environment: /^(?:BUN_|NODE_|NPM_CONFIG_)/,
      },
      deno: {
        ...NODE_INTERPRETER_RULES,
        inline: /^eval$/,
        valued: NEVER_MATCH_RE,
        flag: /^(?:run|test|bench|serve|-[A-Za-z]+|--[a-z][a-z0-9-]*(?:=.*)?)$/,
        console: /^repl$/,
        literalScript: !0,
        environment: /^(?:DENO_|NODE_|NPM_CONFIG_)/,
      },
      perl: {
        ...INTERPRETER_RULE_DEFAULTS,
        inline: /^-(?:[achnpsStTuUvwWX]|l[0-7]*|0[0-9a-fA-Fx]*)*(?:[eE]|[Mm]-?)(.*)$/s,
        valued: /^-[IF]$/,
        flag: /^-(?:[achnpsStTuUvwWX]|l[0-7]*|0[0-9a-fA-Fx]*)*(?:[iIFxCDV].*)?$/s,
        bridge:
          /system|exec|\x60|qx\W|%x|popen|\bopen[23]?\b|IPC::|eval|syscall|fork|\bdo\b|\brequire\s*[^A-Za-z\s;]|\/e[egimosxr]*(?![\w\/])/,
        environment: /^PERL/,
      },
      ruby: {
        ...INTERPRETER_RULE_DEFAULTS,
        inline: /^-(?:[adhlnpsSvwy]|W[0-2]?|0\d*)*e(.*)$/s,
        valued: /^-(?:[adhlnpsSvwy]|W[0-2]?|0\d*)*[IrCEF]$/,
        flag: /^(?:-(?:[adhlnpsSvwy]|W[0-2]?|0\d*)*(?:[iIrCEFKTx].*)?|--(?:version|help|verbose|copyright|yjit|jit|(?:en|dis)able[-=].*|[a-z-]*encoding=.*))$/s,
        bridge:
          /system|exec|\x60|%x|popen|spawn|\bopen\b|\bIO\.|Open3|eval|\b(?:public_)?send\b|__send__|\bmethod\s*\(|instance_method|syscall|fork|binding\.|\birb\b|pry|\bload\b|\brequire\s*[^'"\s]/,
        environment: /^RUBY/,
      },
      php: {
        ...INTERPRETER_RULE_DEFAULTS,
        inline: /^(?:-[rBRE]|--(?:run|process-(?:begin|code|end)))$/,
        valued: /^(?:-[cdfztSF]|--(?:php-ini|define|file|zend-extension|docroot|server|process-file))$/,
        flag: /^(?:-[eHhilmnqsvwCM]|--(?:no-php-ini|version|help|modules|info|syntax-check|ini))$/,
        bridge:
          /system|exec|passthru|popen|proc_open|\x60|eval|pcntl|include|require|\bassert\b|create_function|call_user_func|\$\w+\s*\(/,
        environment: /^PHP/,
        scriptAfterDashes: !1,
      },
      lua: LUA_INTERPRETER_RULES,
      luajit: LUA_INTERPRETER_RULES,
      rscript: R_INTERPRETER_RULES,
      r: R_INTERPRETER_RULES,
      julia: {
        ...INTERPRETER_RULE_DEFAULTS,
        inline: /^(?:-[eE]|--(?:eval|print))$|^--(?:eval|print)=(.*)$/s,
        valued: /^(?:-[ptJLCOm]|--(?:project|sysimage|load|threads|procs|module))$/,
        flag: /^(?:-[hvq]|-[ptO]\d+|--[a-z][a-z-]*=.*|--(?:version|help|quiet|color|banner|startup-file[a-z=]*))$/,
        bridge: /run\(|\x60|Cmd|eval|pipeline|success\(|spawn|ccall|include/,
        environment: /^JULIA_/,
      },
      osascript: {
        ...INTERPRETER_RULE_DEFAULTS,
        inline: /^-e(.*)$/s,
        valued: /^-[ls]$/,
        flag: /^-[ls].+$/,
        bridge: GENERIC_BRIDGE_RE,
        environment: /^OSA/,
      },
      groovy: {
        ...INTERPRETER_RULE_DEFAULTS,
        inline: /^-e(.*)$/s,
        valued: /^(?:-(?:c|cp|classpath|a|l|b)|--(?:encoding|classpath|autosplit|basescript))$/,
        flag: /^(?:-[dinpvh]|-D.+|--(?:debug|indy|version|help))$/,
        bridge: GENERIC_BRIDGE_RE,
        environment: /^(?:JAVA_TOOL_OPTIONS$|JDK_JAVA_OPTIONS$|GROOVY|CLASSPATH$)/,
      },
      tclsh: TCL_INTERPRETER_RULES,
      wish: TCL_INTERPRETER_RULES,
    }),
  );
//@ chunk-63f0f3kd.js:55417-55509 placement
function J({ node: node, value: e }) {
  return e.kind === "dynamic" && !e.integer && !(e.optionSafe && !hasExpansion(node));
}
//@ chunk-63f0f3kd.js:55509-55609 placement
var TENGU_HOLLOW_SANDPIPER = "tengu_hollow_sandpiper",
  Ii = /\$@|\$\{@|(?<!\$\{#\w*)\[@\]|\$\{\([^)]*@[^)]*\)|\$\{![^}]*@\}/;
//@ chunk-63f0f3kd.js:55609-55886 placement
function isNonEmptyWordPart({ type: t, text: text }) {
  return (
    /^(?:raw_string|ansi_c_string|number|arithmetic_expansion|process_substitution)$/.test(t) ||
    (t === "string" && !Ii.test(text)) ||
    (t === "word" && !Me.test(text) && !/[[\]{}]|(?:^|[^\\])(?:\\\\)*[#^]/.test(text)) ||
    /^\$(?:\{?[?#$]\}?|\{#\w+(?:\[[^\]]*\])?\})$/.test(text)
  );
}
//@ chunk-63f0f3kd.js:55886-56003 placement
function mayExpandToNothing(t) {
  return (
    !(t.type === "concatenation" ? t.children : [t]).every(isNonEmptyWordPart) &&
    !/^[[\]]$/.test(t.text) &&
    readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, { safe: !0 })
  );
}
//@ chunk-63f0f3kd.js:56003-56224 placement
function emptyExpansionReason({ value: t }) {
  return `${describeWordValue(t)}, which may expand to no word at all (a pattern that matches no file, or an empty value), so the word after it would take its place (quote it, or name the files instead of a pattern)`;
}
/**
 * 收集语法节点中各单词的字面前缀（跳过展开/替换、[ ] 测试表达式），动态单词只取通配前的前缀，无法确定时记为 "-"。
 */
//@ chunk-63f0f3kd.js:56224-56734 placement
function collectWordPrefixes(t, e) {
  if (/expansion|substitution/.test(t.type)) return [];
  if (t.children.length > 0) {
    let index = t.children.findIndex((a) => a.type === "word" && a.text === "["),
      lastIndex = t.children.findLastIndex((a) => a.type === "word" && a.text.endsWith("]"));
    return t.children.flatMap((a, o) =>
      index !== -1 && index <= o && o <= lastIndex ? [] : collectWordPrefixes(a, e),
    );
  }
  if (t.type === '"') return [];
  if (t.type === "string_content") return [unescapeDoubleQuoted(t.text)];
  let i = evaluateWord(t, e, !0);
  if (i.kind === "literal") return [i.text];
  let n = i.kind === "dynamic" && ts.test(t.text) ? /^[^\\*?[]*/.exec(t.text)[0] : "";
  return [n === "" ? "-" : n];
}
//@ chunk-63f0f3kd.js:56734-56795 placement
function Di(t, e) {
  return collectWordPrefixes(t, e).some((i) => i.startsWith("-"));
}
//@ chunk-63f0f3kd.js:56795-56850 placement
function Pi(t, e) {
  return /[^-nN]/.test(collectWordPrefixes(t, e).join(""));
}
/**
 * 判断语法节点是否含展开或命令替换（含 $@/$* 与数组下标）。
 */
//@ chunk-63f0f3kd.js:56850-57031 placement
function hasExpansion(t) {
  return (
    /expansion|substitution/.test(t.type) ||
    /\$\{?[@*]|\[[@*]\]/.test(t.text) ||
    (t.type === "concatenation" && t.children.some((e) => /expansion|substitution/.test(e.type)))
  );
}
//@ chunk-63f0f3kd.js:57031-57122 placement
function ls(t) {
  let { value: e } = t;
  return (
    J(t) ||
    (e.kind === "dynamic" &&
      e.integer &&
      readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, { safe: !0 }))
  );
}
/**
 * 判断节点是否为不含展开的引号字面量（或其拼接）。
 */
//@ chunk-63f0f3kd.js:57122-57305 placement
function isQuotedLiteral(t, e = /^string$/) {
  return (
    !hasExpansion(t) &&
    !t.text.includes("${!") &&
    (e.test(t.type) ||
      (t.type === "concatenation" &&
        t.children.every((i) => e.test(i.type) || (i.type === "word" && Wt.test(i.text)))))
  );
}
//@ chunk-63f0f3kd.js:57305-57346 placement
var BOT_PROTECTED_TENGU_SOFT_ISLAND = "bot_protected_tengu_soft_island";
//@ chunk-63f0f3kd.js:57346-57383 placement
function V() {
  return readFlagWithOverride(BOT_PROTECTED_TENGU_SOFT_ISLAND, { safe: !0 });
}
//@ chunk-63f0f3kd.js:57383-57455 placement
var us = /\$\{?@|\[@\]|\$\{![A-Za-z_]\w*@/,
  cs = /\$\{#[A-Za-z_]\w*\[@\]\}/g;
/**
 * 判断单词节点在静态分析下是否确定（算术展开、少数特殊变量与不含通配的拼接视为确定）。
 */
//@ chunk-63f0f3kd.js:57455-57682 placement
function isStaticWord(t) {
  if (!V()) return !hasExpansion(t);
  switch (t.type) {
    case "arithmetic_expansion":
      return !0;
    case "simple_expansion":
      return /^\$[?#$]$/.test(t.text);
    case "concatenation":
      return t.children.every(isStaticWordPart) && !isBraceExpansionNode(t) && !isBracketGlobNode(t);
    default:
      return isStaticWordPart(t);
  }
}
//@ chunk-63f0f3kd.js:57682-57907 placement
function isStaticWordPart(t) {
  switch (t.type) {
    case "word":
    case "number":
      return !Me.test(t.text);
    case "raw_string":
    case "ansi_c_string":
    case "$":
      return !0;
    case "string":
    case "translated_string":
      return !us.test(t.text.replace(cs, "0"));
    default:
      return !1;
  }
}
//@ chunk-63f0f3kd.js:57907-57980 placement
function Mt({ node: node, value: e }) {
  return !(e.kind === "dynamic" && e.many) && isStaticWord(node);
}
/**
 * 在 argv 中查找 sh/bash 的 -c 命令字符串参数下标（解析组合短选项与 -o 参数）；不是 shell 或没有 -c 返回 -1。
 */
//@ chunk-63f0f3kd.js:57980-58369 placement
function findShellCommandStringIndex(t, e) {
  if (!POSIX_SHELL_NAMES.has(programBaseName(t[e] ?? "-"))) return -1;
  let i = !1;
  for (let n = e + 1; n < t.length; n++) {
    let r = t[n];
    if (typeof r !== "string") return -1;
    let match = /^[-+](?=.)[bcefhlmnptuvxBCEHP]*(o?)$/.exec(r);
    if (match && (!match[1] || typeof t[n + 1] === "string")) {
      if (match[1] && !isSafeShellOption(t[n + 1] ?? "")) return -1;
      ((i ||= r.includes("c")), (n += match[1] ? 1 : 0));
    } else {
      let a = r === "--" ? n + 1 : n;
      return i && typeof t[a] === "string" && !/^[-+]/.test(t[a]) ? a : -1;
    }
  }
  return -1;
}
//@ chunk-63f0f3kd.js:58369-59406 placement
function analyzeNestedShellText(t, e, i, n) {
  if (i.depth >= 2) return unverifiableRunReason(t, "with shell text that starts a third shell");
  if (/git/i.test(e))
    return `hands ${t} text naming git ${TOO_COMPLEX_SUFFIX}, which cannot be shown to stay inside the worktree`;
  let r = getParserModule()?.parse(e) ?? null,
    s = r ? parseForSecurityFromAst(e, r) : null;
  if (!r || !s || (s.kind !== "simple" && isParseFailureNode(s)))
    return unverifiableRunReason(t, `with shell text it cannot parse (${shortenForReason(e)})`);
  let a = {
    simple: !1,
    kinds: new Map([...i.kinds.keys()].map((u) => [u, "other"])),
    integerNames: new Set(),
    arrayNames: new Set(),
    bindingSites: new Map(),
    optionSafeNames: new Map(),
    pathNames: new Set(),
    opaqueNames: !0,
    shellFilledWord: null,
    shellSetNameWord: null,
    statPathDenied: !1,
    dateDirectiveDenied: !1,
    pathAssigned: i.pathAssigned,
    startupHazards: new Map(i.startupHazards),
    allExported: i.allExported,
    stdinFed: !1,
    pipedFrom: void 0,
    inputAssembled: n || i.inputAssembled,
    cwd: i.cwd,
    opaqueCwd: i.opaqueCwd,
    deviceLinked: i.deviceLinked,
    scopes: [new Map()],
    depth: i.depth + 1,
  };
  analyzeAssignment(r, a, !1);
  let o = withStdinState(r, a, n);
  return (
    (i.statPathDenied ||= a.statPathDenied),
    (i.dateDirectiveDenied ||= a.dateDirectiveDenied),
    o === null ? null : `hands ${t} the text ${shortenForReason(e)}, which ${o}`
  );
}
//@ chunk-63f0f3kd.js:59406-59486 placement
var PUBLIC_IPV4_PATTERN = /^(?!127\.|0\.)(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?!$)|$)){4}$/;
//@ chunk-63f0f3kd.js:59486-59710 placement
function isRemoteSshHost(t) {
  let replaced = t.replace(/^ssh:\/\/|:\d*$/gi, "").replace(/^[^@]*@/, "");
  return (
    /[^\w.-]|^$|(?:^|[.-])(?:localhost[46]?|localdomain[46]?|loopback)\.?$/i.test(replaced) ||
    (/^(?:(?:0x[0-9a-f]*|\d+)(?:\.|$))+$/i.test(replaced) && !PUBLIC_IPV4_PATTERN.test(replaced))
  );
}
//@ chunk-63f0f3kd.js:59710-59822 placement
var SED_COMMAND_PARTS_RE = /^[\s="']*(\w*)["']?[\s=]*(.*)$/s,
  SSH_OPTION_RE = /^-[46AaCfGgKkMNnqsTtVvXxYy]*(?:([BbcDEeFIiJLlmOoPpQRSWw])(.*))?$/s;
//@ chunk-63f0f3kd.js:59822-61454 placement
function analyzeSshArgs(t, e, i, n) {
  let mapped = t.map((c) => (c.value.kind === "literal" ? c.value.text : null)),
    s = i,
    a = !1,
    o = -1,
    u = [],
    l = [];
  for (let c = e; c < t.length; c++) {
    let f = mapped[c] ?? null,
      h = f === "--" && !s ? c + 1 : c;
    if (
      h + 1 < t.length &&
      (!s || (mapped[h + 1] ?? "-").startsWith("-") || mayExpandToNothing(t[h + 1].node)) &&
      mayExpandToNothing(t[h].node)
    )
      return { detail: unverifiableRunReason("ssh", `with ${emptyExpansionReason(t[h])}`) };
    if (f !== "--" && f?.[0] === "-" && mayExpandToNothing(t[c].node))
      return {
        detail: unverifiableRunReason(
          "ssh",
          `with ${shortenForReason(t[c].node.text)}, a pattern that may expand to file names ssh reads as options (quote it)`,
        ),
      };
    let b = f === null ? !ls(t[c]) : f[0] !== "-";
    if (f === "--" || b) {
      let T = f === "--" ? c + 1 : c;
      if (!s && T < t.length) {
        if (
          ((s = !0),
          (a ||= mapped[T] === null || isRemoteSshHost(mapped[T] ?? "")),
          u.push(mapped[T] ?? ""),
          f !== "--")
        )
          continue;
        T++;
      }
      o = T < t.length ? T : -1;
      break;
    }
    let g = f === null ? null : SSH_OPTION_RE.exec(f);
    if (!g)
      return {
        detail: unverifiableRunReason(
          "ssh",
          `with ${f ?? `${describeWordValue(t[c].value)} ${OPTION_POSITION_NOTE}`}`,
        ),
      };
    let [, S, p] = g;
    if (!S) continue;
    let m = p ? { kind: "literal", text: p } : t[++c]?.value;
    if (!m || m.kind === "refuse")
      return { detail: m ? m.detail : unverifiableRunReason("ssh", `with ${f}`) };
    if (m.kind === "dynamic") {
      if (/[oFSOJI]/.test(S))
        return { detail: unverifiableRunReason("ssh", `with -${S} ${describeWordValue(m)}`) };
      if (V() && !Mt(t[c]))
        return {
          detail: unverifiableRunReason("ssh", `with ${dynamicArgumentReason("ssh", `-${S}`, t[c])}`),
        };
      if (S === "l") u.push("");
      continue;
    }
    let [, _ = "", x = ""] = S === "o" ? (SED_COMMAND_PARTS_RE.exec(m.text) ?? []) : ["", S, m.text];
    if (
      ((a ||= /^hostname$/i.test(_) && isRemoteSshHost(x.trim())),
      /^(?:hostname|user)$/i.test(_) || _ === "l")
    )
      u.push(x.trim());
    if (/command$/i.test(_)) l.push([_, x]);
    else if (
      _ === "" ||
      (/[oFSI]/.test(S) && isDevicePath(x)) ||
      (S === "F" && n.inputAssembled && isOpaquePathArgument(x, n))
    )
      return { detail: unverifiableRunReason("ssh", `with -${S} ${shortenForReason(m.text)}`) };
  }
  let d = u.length > 0 && !u.includes("") ? u.flatMap((c) => c.split("@")) : ["$9"];
  for (let [c, f] of l)
    for (let h of d) {
      let b = analyzeNestedShellText(`ssh -o ${c}`, f.replace(/%[a-z]/gi, h), n, !1);
      if (b !== null) return { detail: b };
    }
  return { commandAt: o, local: a };
}
//@ chunk-63f0f3kd.js:61454-62302 placement
var BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN = "bot_protected_tengu_buzzing_fountain",
  wn = wordSet(
    "--access-token-file --account --authority-selector --authorization-token-file --billing-project --configuration --flatten --format --http-timeout --impersonate-service-account --project --trace-token --universe-domain --verbosity",
  ),
  Gi = wordSet("-q --quiet --log-http --no-log-http --user-output-enabled --no-user-output-enabled"),
  Mi = wordSet(
    "--as --as-group --as-uid --as-user-extra --cluster --context -n --namespace --request-timeout --user",
  ),
  zi = wordSet("--disable-compression --match-server-version --warnings-as-errors"),
  Hi = /^--credential-file-override(?:=|$)/,
  Ui =
    /^(?:-[itq]*s|--(?:cache[-_]dir|certificate[-_]authority|client[-_]certificate|client[-_]key|insecure[-_]skip[-_]tls[-_]verify|kubeconfig|kuberc|password|profile|profile[-_]output|proxy[-_]url|server|tls[-_]server[-_]name|token|username)(?:=|$))/;
//@ chunk-63f0f3kd.js:62302-62535 placement
function hasRiskyOptionWord(t, e, i, n) {
  let index = e.indexOf("--", i);
  return t
    .slice(i, index === -1 ? void 0 : index)
    .some(
      ({ node: node }, a) =>
        ps(node) ||
        [node, ...node.children].some((o) => o.type === "brace_expression") ||
        n.test(e[i + a] ?? (/^[$'"\\]*-/.test(node.text) ? node.text.replace(SHELL_QUOTE_CHARS_RE, "") : "")),
    );
}
/**
 * 拼出命令的程序词序列（跳过带值选项及其参数、忽略的词），到目标词为止；值缺失或可疑时返回空串。
 */
//@ chunk-63f0f3kd.js:62535-62892 placement
function collectProgramWords(t, e, i, n, r) {
  let s = [];
  for (let a = 0; a < t.length; a++) {
    let { node: node, value: u } = t[a],
      l = u.kind === "literal" ? u.text : isQuotedLiteral(node) ? node.text : "-",
      replaced = l.replace(/=.*$/s, "");
    if (i.has(replaced)) {
      if (replaced === l) {
        a++;
        let c = t[a];
        if (
          !c ||
          (c.value.kind === "literal"
            ? c.value.text.startsWith("-") || mayExpandToNothing(c.node)
            : !r || !isQuotedLiteral(c.node))
        )
          return "";
      }
    } else if (!n.has(l)) {
      if ((s.push(l), l === e)) break;
    }
  }
  return s.join(" ");
}
/**
 * 检查 ssh/rlogin/kubectl 等"在别处执行命令"的程序：目标可能是本机或参数无法静态判定时拒绝。
 */
//@ chunk-63f0f3kd.js:62892-67460 placement
function analyzeRemoteShellCommand(t, e, i, n) {
  let mapped = e.map((s) => (s.value.kind === "literal" ? s.value.text : null));
  switch (t) {
    case "rlogin":
    case "ssh": {
      let s = analyzeSshArgs(e, 0, !1, i);
      if ("detail" in s) return s.detail;
      if (!s.local) return null;
      if (s.commandAt === -1)
        return n.fed
          ? unverifiableRunReason(
              "ssh",
              "with a shell on what may be this machine reading its commands from stdin",
            )
          : null;
      let sliced = mapped.slice(s.commandAt),
        found = e.slice(s.commandAt).find((u) => u.value.kind !== "literal");
      return found
        ? unverifiableRunReason(
            "ssh",
            `with a command for what may be this machine computed at runtime (${describeWordValue(found.value)})`,
          )
        : analyzeNestedShellText("ssh", sliced.join(" "), i, n.fed);
    }
    case "kubectl":
    case "oc": {
      let index = mapped.indexOf("exec"),
        index_2 = mapped.indexOf("--");
      if (index === -1 || index_2 < index) return;
      let o =
        !readFlagWithOverride(BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN, { safe: !0 }) ||
        (collectProgramWords(e, "exec", Mi, zi, !0) === "exec" &&
          !hasRiskyOptionWord(e, mapped, index + 1, Ui));
      for (let [b, g] of mapped.entries()) {
        let S =
          b > index_2
            ? g !== null && /\bgit\b/i.test(g.replace(SHELL_QUOTE_CHARS_RE, ""))
              ? `remote text naming git (${shortenForReason(g)}), which cannot be shown to stay inside the worktree`
              : null
            : g === null
              ? n.assembled || /[<>]\(/.test(e[b].node.text)
                ? `${describeWordValue(e[b].value)} next to input assembled at runtime`
                : null
              : n.assembled && isDevicePath(g)
                ? `${g} naming a descriptor fed here`
                : null;
        if (S !== null) return unverifiableRunReason(`${t} exec`, `with ${S}`);
      }
      let sliced = e.slice(index_2 + 1);
      if (i.simple) {
        let b = checkLauncherInvocation(t, sliced, i, n);
        return o ? b : (b ?? void 0);
      }
      let sliced_2 = mapped.slice(index_2 + 1),
        index_3 = sliced_2.findIndex((b) => SHELL_PROGRAM_NAMES.has(programBaseName(b ?? "-"))),
        c = findShellCommandStringIndex(sliced_2, index_3),
        found = sliced.find((b, g) => (c === -1 || g < index_3 || g > c) && !Xt(b.value)),
        h = found
          ? unverifiableRunReason(`${t} exec`, `with ${describeWordValue(found.value)}`)
          : n.fed && n.assembled
            ? unverifiableRunReason(`${t} exec`, "with input assembled at runtime")
            : c === -1
              ? null
              : analyzeNestedShellText(programBaseName(sliced_2[index_3]), sliced_2[c], i, n.fed);
      return o ? h : (h ?? void 0);
    }
    case "gcloud": {
      let index = mapped.indexOf("ssh"),
        a = readFlagWithOverride(BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN, { safe: !0 }),
        index_2 = mapped
          .slice(0, index)
          .findIndex(
            (p, m) =>
              p !== null &&
              !/^(?:alpha|beta|compute|-.*)$/.test(p) &&
              !/^--[^=]+$/.test(mapped[m - 1] ?? "") &&
              !mayExpandToNothing(e[m].node),
          ),
        u = index > 0 && mapped.slice(0, index).includes("compute"),
        l = !u || index_2 >= 0,
        d =
          u &&
          e
            .slice(0, index_2 < 0 ? index : index_2)
            .find(({ node: node }) => mayExpandToNothing(node) && !/^--?[\w-]+=[^*?[]*$/.test(node.text));
      if (d)
        return unverifiableRunReason(
          "gcloud",
          `with ${describeWordValue(d.value)} before the word ssh: it may expand to no word at all and the next word would take its place, so this cannot tell what gcloud will run (spell the value out)`,
        );
      let included = mapped.slice(0, index).includes(null),
        f = readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, { safe: !0 });
      if (l || included) {
        let p = findMatching(mapped, /^--(?:ssh-flag|scp-flag|flags-file)/);
        if (p !== null) return unverifiableRunReason("gcloud", `with ${p}`);
        let index_2 = mapped.indexOf("compute"),
          _ = mapped[index - 1],
          x =
            a &&
            index > 0 &&
            (_ === null || _?.startsWith("-")) &&
            index < index_2 &&
            mapped.includes("ssh", index_2)
              ? unverifiableRunReason(
                  "gcloud",
                  wn.has(_ ?? "")
                    ? `with ssh as the separate value of ${_} before compute (write ${_}=ssh instead)`
                    : "with ssh both before and after compute, where either could be the subcommand (join a flag's value to it with =, or drop the extra ssh)",
                )
              : void 0;
        if (!f) return x;
        if (l) {
          let T = index < 0 ? -1 : mapped.indexOf("--", index);
          if (T < 0) return x;
          let G = analyzeSshArgs(e, T + 1, !0, i);
          return "detail" in G
            ? G.detail
            : G.local
              ? unverifiableRunReason("gcloud", "with ssh pointed at what may be this machine")
              : x;
        }
      }
      let h =
          !a ||
          (/^(?:(?:alpha|beta) )?compute ssh$/.test(collectProgramWords(e, "ssh", wn, Gi, !1)) &&
            !hasRiskyOptionWord(e, mapped, index + 1, Hi)),
        b = [],
        g = 1 / 0;
      for (let p = 0; p < e.length; p++) {
        let m = mapped[p] ?? null;
        if (a && (p <= index ? /^--(?:scp|ssh)-flag/ : /^--scp-flag/).test(m ?? ""))
          return unverifiableRunReason(
            "gcloud",
            `with ${shortenForReason(m ?? "")} (${/^--scp/.test(m ?? "") ? "--scp-flag hands options to scp, which can run a local program; drop it" : "put --ssh-flag after the word ssh"})`,
          );
        if (p <= index) {
          if (/^--flags-file/.test(m ?? "") || isDevicePath(m ?? ""))
            return unverifiableRunReason("gcloud compute ssh", `with ${m}`);
          if (f && /^--(?:ssh|scp)-flag/.test(m ?? ""))
            return unverifiableRunReason("gcloud", `with ${shortenForReason(m ?? "")} before ssh`);
          if (
            f &&
            m === null &&
            J(e[p]) &&
            !/^--(?!flags-file|ssh-flag|scp-flag)[\w-]+=$/.test(e[p].node.children[0]?.text ?? "")
          )
            return unverifiableRunReason(
              "gcloud",
              `with ${describeWordValue(e[p].value)} before ssh, which may be a flag of its own (spell it out)`,
            );
          continue;
        }
        if (m === "--") {
          ((g = b.length), b.push(...e.slice(p + 1)));
          break;
        }
        if (m === null) {
          let T = e[p];
          if (
            J(T) &&
            !(
              T.node.type === "concatenation" &&
              /^--(?:command|zone|project)=$/.test(T.node.children[0]?.text ?? "")
            )
          )
            return unverifiableRunReason(
              "gcloud compute ssh",
              `with ${describeWordValue(T.value)} ${OPTION_POSITION_NOTE}`,
            );
          continue;
        }
        let match = /^--(command|zone|project|ssh-flag)(?:=(.*))?$/s.exec(m);
        if (!match) {
          if (/^--flags-file/.test(m) || isDevicePath(m))
            return unverifiableRunReason("gcloud compute ssh", `with ${m}`);
          if (
            /^-[^-]/.test(m) &&
            !/^-[qh]$/.test(m) &&
            readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, { safe: !0 })
          )
            return unverifiableRunReason(
              "gcloud compute ssh",
              `with ${shortenForReason(m)} before any -- (gcloud takes only its own flags there; words meant for ssh go after a literal --)`,
            );
          continue;
        }
        let x = match[2] ?? mapped[++p];
        if (match[1] !== "ssh-flag") continue;
        if (typeof x !== "string")
          return unverifiableRunReason(
            "gcloud compute ssh",
            `with --ssh-flag ${x === null ? describeWordValue(e[p].value) : "lacking its value"}`,
          );
        for (let T of x.trim().split(/\s+/)) b.push({ node: e[p].node, value: { kind: "literal", text: T } });
      }
      let S = analyzeSshArgs(b, 0, !0, i);
      return "detail" in S
        ? S.detail
        : S.local
          ? unverifiableRunReason("gcloud compute ssh", "pointed at what may be this machine")
          : S.commandAt !== -1 && S.commandAt < g
            ? unverifiableRunReason(
                "gcloud compute ssh",
                "with an --ssh-flag word ssh would not read as an option",
              )
            : included || !h
              ? void 0
              : null;
    }
    default:
      return;
  }
}
//@ chunk-63f0f3kd.js:67460-67514 placement
var TENGU_COMPOSED_TEACUP = "tengu_composed_teacup",
  TENGU_WOOLLY_WALL = "tengu_woolly_wall";
//@ chunk-63f0f3kd.js:67514-68621 placement
function analyzeRsyncScp(t, e, i) {
  let mapped = e.map((l) => (l.value.kind === "literal" ? l.value.text : null)),
    r =
      t === "rsync"
        ? readFlagWithOverride(TENGU_COMPOSED_TEACUP, { safe: !0 })
          ? /^(?:-[^-]*?(e)|--(?:rsh|rsync-path)(?==|$))=?(.*)$/s
          : /^(?:-[^-]*(e)|--(?:rsh|rsync-path)(?==|$))=?(.*)$/s
        : /^(?:scp|rcp|sftp)$/.test(t)
          ? /^-[^-]*?([oSD])(.*)$/s
          : null;
  if (!r) return null;
  let flattened = mapped.flatMap((l) => (l !== null && /^[^-/][^:/]*:/.test(l) ? [l] : [])),
    found = flattened.find((l) => /[^\w.,:\/@~+=-]/.test(l) && isRemoteSshHost(l.replace(/:.*$/s, "")));
  if (found !== void 0) return unverifiableRunReason(t, `with ${shortenForReason(found)}`);
  let o =
      flattened.length > 0 && mapped.every((l) => !/^(?:-\w*o)?\W*(?:hostname|user)/i.test(l ?? "user"))
        ? flattened.flatMap((l) => l.replace(/:.*$/s, "").split("@"))
        : ["$9"],
    u = readFlagWithOverride(TENGU_WOOLLY_WALL, { safe: !0 });
  for (let l = 0; l < mapped.length; l++) {
    if (mapped[l] === null) {
      if (u && J(e[l]))
        return unverifiableRunReason(t, `with ${describeWordValue(e[l].value)} ${OPTION_POSITION_NOTE_LONG}`);
      continue;
    }
    let match = r.exec(mapped[l]);
    if (!match) continue;
    let c = match[2] || mapped[++l];
    if (typeof c !== "string")
      return unverifiableRunReason(
        t,
        `with ${match[0]} ${c === null ? describeWordValue(e[l].value) : "lacking its value"}`,
      );
    let [, f = "", h = ""] = match[1] === "o" ? (SED_COMMAND_PARTS_RE.exec(c) ?? []) : ["", "Command", c];
    for (let b of o) {
      let g = /command$/i.test(f)
        ? analyzeNestedShellText(`${t} ${match[0]}`, h.replace(/%[a-z]/gi, b), i, !1)
        : f === "" || isDevicePath(h)
          ? unverifiableRunReason(t, `with -o ${shortenForReason(c)}`)
          : null;
      if (g !== null) return g;
    }
  }
  return null;
}
//@ chunk-63f0f3kd.js:68621-68772 placement
var DEBUGGER_MODULES_RE =
  /^(?:timeit|[ip]?[pu]db|[iI][pP]ython|[bp]t?python|idlelib.*|code|trace|cProfile|profile|asyncio|_pyrepl|runpy|unittest|irb|debug|pry|byebug)$/;
//@ chunk-63f0f3kd.js:68772-68852 placement
function Xt(t) {
  return t.kind === "literal" ? isPlainWordText(t.text) : t.kind === "dynamic" && t.inert;
}
//@ chunk-63f0f3kd.js:68852-68939 placement
function xt(t, e) {
  return t.some((i, n) => n !== e && i.value.kind === "dynamic" && !i.value.inert);
}
/**
 * 某个可能展开为空的单词导致无法判定时，去掉它重新检查；超过 16 个这类单词直接判为无法验证，并在原因中提示加引号或写明文件。
 */
//@ chunk-63f0f3kd.js:68939-69356 placement
function retryWithoutEmptyWord(t, e, i, n, r, s) {
  let a = n[t];
  if (!a || !mayExpandToNothing(a.node)) return null;
  if (count(n, (u) => mayExpandToNothing(u.node)) > 16)
    return unverifiableRunReason(
      e,
      "with more than 16 words that may expand to no word at all (name the files, or quote the words)",
    );
  let o = checkInterpreterInvocation(e, i, n.toSpliced(t, 1), r, {
    ...s,
    prefixValues: [...s.prefixValues, a.value],
  });
  return o === null
    ? null
    : `${o}, since ${shortenForReason(a.node.text)} may expand to no word at all (quote it, or name the files instead of a pattern)`;
}
/**
 * 后台 worktree 守卫：分析解释器调用（python/node/perl 等）能否证明不会运行 git——检查启动相关环境变量、内联代码与模块、选项、脚本操作数及运行时计算的输入，无法证明时返回原因。
 */
//@ chunk-63f0f3kd.js:69356-73556 placement
function checkInterpreterInvocation(program, rules, words, state, context) {
  let literals = words.map((x) => (x.value.kind === "literal" ? x.value.text : null)),
    a = state.stdinFed || context.redirects.some(isStdinRedirect),
    inputAssembled = state.inputAssembled,
    u = inputAssembled || context.prefixValues.some((prefixValue) => !Xt(prefixValue)),
    filtered = [...state.startupHazards].filter(([x]) => rules.environment.test(x)),
    found = filtered.find(([, x]) => x);
  if (found || (filtered.length > 0 && (u || xt(words, -1))))
    return unverifiableRunReason(
      program,
      found
        ? `after ${found[0]} is set here to a value that configures what it loads or runs at startup`
        : `after ${filtered[0][0]} is set here, next to an operand or input computed at runtime`,
    );
  if (inputAssembled && literals.some((x) => x !== null && x.split(/\s+/).some(isDevicePath)))
    return `feeds ${program} a descriptor it names ${TOO_COMPLEX_SUFFIX}, whose content is assembled at runtime and may be read as a program`;
  let c =
      (rules.flag.test("-0") || rules.flag.test("-3")) &&
      readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, { safe: !0 }),
    joined = context.redirects.map((redirect) => redirect.text).join(`
`),
    any = [
      ...literals,
      ...context.prefixValues.map((prefixValue) =>
        prefixValue.kind === "literal" ? prefixValue.text : null,
      ),
      joined,
    ].some((x) => !!x && mentionsGit(x)),
    inlineProgram,
    g = new Set(),
    S = !1,
    index = 0;
  while (index < words.length) {
    let x = literals[index] ?? null,
      T = x === null ? null : rules.inline.exec(x);
    if (inlineProgram !== void 0 && x === "--") break;
    if (T) {
      S ||= !rules.flag.test("-0") || /^-[anplsw]*[eE]/.test(x ?? "");
      let last = T.slice(1).findLast((O) => !!O),
        z = last === void 0 ? index + 1 : -1,
        R =
          last !== void 0
            ? { kind: "literal", text: last }
            : (words[z]?.value ?? { kind: "literal", text: "" });
      if (R.kind === "refuse") return R.detail;
      if (R.kind === "dynamic")
        return !R.inert
          ? unverifiableRunReason(program, `with a program computed at runtime (${R.why})`)
          : u || xt(words, z)
            ? unverifiableRunReason(
                program,
                "with a program pieced together here next to an operand or input computed at runtime",
              )
            : retryWithoutEmptyWord(z, program, rules, words, state, context);
      if (
        ((inlineProgram = `${inlineProgram ?? ""}
${R.text}`),
        g.add(last === void 0 ? z : index),
        (index += last === void 0 ? 2 : 1),
        !rules.inlineEndsOptions)
      )
        continue;
      break;
    }
    if (program === "bun" && x === "exec")
      return index === 0 && typeof literals[1] === "string" && words.length === 2
        ? analyzeNestedShellText("bun exec", literals[1], state, a)
        : unverifiableRunReason("bun exec", "with shell text it cannot read");
    if (x !== null && rules.module.test(x)) {
      let y = literals[index + 1],
        any_2 = literals.some((O, Y) => Y !== index && O?.[0] === "-"),
        R =
          /^(?:pip|pipx|ensurepip|easy_install)$/.test(y ?? "") &&
          words.slice(index + 2).find((O) => O.value.kind !== "literal");
      return y === null
        ? unverifiableRunReason(program, `with ${x} ${describeWordValue(words[index + 1].value)}`)
        : (DEBUGGER_MODULES_RE.test(y ?? "") && (u || xt(words, -1))) ||
            (inputAssembled && isOpaquePathArgument(y ?? "", state))
          ? unverifiableRunReason(program, `with ${x} ${y} next to an operand or input computed at runtime`)
          : R
            ? unverifiableRunReason(
                program,
                `with ${x} ${y} installing what a computed operand names (${describeWordValue(R.value)})`,
              )
            : program !== "bun" && !(any && DEBUGGER_MODULES_RE.test(y ?? ""))
              ? null
              : any ||
                  words.some(
                    ({ value: O }, Y) =>
                      Y > index &&
                      (O.kind !== "literal"
                        ? !(O.kind === "dynamic" && O.inert)
                        : isDevicePath(O.text) || (any_2 && isGitProgram(programBaseName(O.text)))),
                  )
                ? unverifiableRunReason(program, `with ${x} ${y}`)
                : checkLauncherInvocation(program, words.slice(index + 1), state, {
                    fed: a,
                    assembled: inputAssembled,
                  });
    }
    if (
      x === null
        ? J(words[index]) ||
          (c &&
            ls(words[index]) &&
            ((a && !S) ||
              words
                .slice(index + 1)
                .some((y) => (y.value.kind === "literal" ? y.value.text.startsWith("-") : J(y)))))
        : /^-[^-]|^--./.test(x) && !rules.valued.test(x) && !rules.flag.test(x)
    )
      return u || xt(words, -1) || (x === null && !J(words[index]))
        ? unverifiableRunReason(
            program,
            `with ${x ?? `${describeWordValue(words[index].value)} (a computed argument goes after the script or --)`} where it cannot tell which operand is the program, next to an operand or input computed at runtime`,
          )
        : any
          ? GIT_TOO_COMPLEX_REASON
          : retryWithoutEmptyWord(index, program, rules, words, state, context);
    let D = x !== null && rules.valued.test(x);
    if (D && index + 1 < words.length && literals[index + 1] === null)
      return unverifiableRunReason(program, `with ${x} ${describeWordValue(words[index + 1].value)}`);
    let N = D ? `${x} ${literals[index + 1] ?? ""}` : (x ?? "");
    if (/^-(?:-interactive\b|[A-Za-z0-9]*r ?(?:irb|debug|pry|byebug)\b)/.test(N) && (u || xt(words, -1)))
      return unverifiableRunReason(
        program,
        `with ${N.trim()}, a console that reads its program from input or operands computed at runtime`,
      );
    if (D || (x !== null && rules.flag.test(x))) {
      let match = /(?:^|=)(data:.*)$/is.exec(D ? literals[index + 1] : x);
      ((inlineProgram = match
        ? `${inlineProgram ?? ""}
${match[1]}`
        : inlineProgram),
        (index += D ? 2 : 1));
    } else {
      index += x !== "--" ? 0 : rules.scriptAfterDashes ? 1 : words.length;
      break;
    }
  }
  let m = retryWithoutEmptyWord(index, program, rules, words, state, context);
  if (m !== null) return m;
  let _ = index < words.length ? (literals[index] ?? null) : void 0;
  if (inlineProgram === void 0 && _ !== void 0) {
    if (_ === null)
      return inputAssembled || rules.literalScript
        ? unverifiableRunReason(
            program,
            `with a script computed at runtime (${describeWordValue(words[index].value)})`,
          )
        : null;
    if (/^(?:data|https?|npm|jsr):/i.test(_)) ((inlineProgram = _), g.add(index));
    else if (rules.console.test(_))
      return u || xt(words, -1)
        ? unverifiableRunReason(
            program,
            `with ${_}, a console that reads its program from input or operands computed at runtime`,
          )
        : null;
    else if (!isOpaquePathArgument(_, state)) return null;
  }
  if (inlineProgram !== void 0) {
    if (any || mentionsGit(inlineProgram)) return GIT_TOO_COMPLEX_REASON;
    let match = rules.bridge.exec(inlineProgram);
    return match && (u || words.some((T, G) => !g.has(G) && !Xt(T.value)))
      ? unverifiableRunReason(
          program,
          `with a program that can start another program (${match[0]}) next to an operand, env value or input that is computed at runtime or not plain text`,
        )
      : null;
  }
  if (inputAssembled)
    return `feeds ${program} a program assembled at runtime ${TOO_COMPLEX_SUFFIX}, so what it runs cannot be shown not to be git`;
  if (any) return GIT_TOO_COMPLEX_REASON;
  return rules.bridge.test(joined) && (u || xt(words, -1))
    ? unverifiableRunReason(
        program,
        "with a program on a descriptor that can start another program, next to an operand computed at runtime",
      )
    : null;
}
//@ chunk-63f0f3kd.js:73556-74189 placement
var FIND_PREDICATE_PATTERN =
    /^(?:-(?:i?name|i?path|i?wholename|i?regex|i?lname|x?type|size|empty|(?:max|min)?depth|[amc](?:time|min)|newer(?:[aBcmt][aBcmt])?|user|group|[ug]id|perm|links|inum|samefile|readable|writable|executable|no(?:user|group)|prune|print0|not|and|or|a|o|true|false|xdev|mount|[LHPE]|regextype|daystart|follow)|[-+]?\d+[bcwkMG]?)$/,
  Nt =
    /^-(?:i?name|i?path|i?wholename|i?regex|i?lname|x?type|size|(?:max|min)depth|[amc](?:time|min)|newer(?:[aBcmt][aBcmt])?|user|group|[ug]id|perm|links|inum|samefile|fstype|regextype)$/,
  Vi =
    /^-(?:[acm]newer|B(?:min|newer|time)|context|used|flags|xattrname|files0-from|D|printf|fprintf|fprint0?|fls|f)$/;
/**
 * 判断语句是否为只用安全谓词、带 -print0 的 find 命令（允许文件重定向）。
 */
//@ chunk-63f0f3kd.js:74189-74717 placement
function isSafeFindPrint0(t, e) {
  let i = t?.type === "redirected_statement" ? t.children.find((a) => a.type === "command") : t;
  if (
    i?.type !== "command" ||
    i.children[0]?.type !== "command_name" ||
    programBaseName(i.children[0].text) !== "find"
  )
    return !1;
  let n = !1,
    r = "";
  return (
    i.children.slice(1).every((a, o) => {
      if (!WORD_NODE_TYPES.has(a.type)) return a.type === "file_redirect";
      let u = evaluateWord(a, e, !0),
        l = r;
      if (((r = u.kind === "literal" ? u.text : ""), u.kind !== "literal"))
        return Nt.test(l) || (o === 0 && !J({ node: a, value: u }));
      return (
        (n ||= u.text === "-print0"),
        /^[^-(),!]/.test(u.text) || /^[(),!]$/.test(u.text) || FIND_PREDICATE_PATTERN.test(u.text)
      );
    }) && n
  );
}
/**
 * 分析一个简单命令：环境赋值前缀、命令名、参数求值；按程序分派到 git/ssh/rsync/find/xargs/sudo/printf 等专用规则。
 */
//@ chunk-63f0f3kd.js:74717-80297 placement
function analyzeCommand(t, e, i) {
  let stdinFed = e.stdinFed,
    r,
    s = [],
    a = [],
    o = [...i],
    lastIndex = t.children.findLastIndex((E) => E.type === "variable_assignment" && containsSubstitution(E));
  for (let [E, A] of t.children.entries()) {
    let L = null;
    if (A.type === "command_name")
      ((r = A.children.length === 1 ? A.children[0] : void 0),
        (L = r ? null : tooComplexReason("a command name it cannot read")));
    else if (A.type === "variable_assignment" && !r) {
      let U = programBaseName(t.children.find((St) => St.type === "command_name")?.text ?? ":"),
        ut = dt.has(U) && !POSIX_SPECIAL_BUILTINS_NONEVAL.has(U),
        bt = E < lastIndex;
      ((L = analyzeVariableAssignment(A, e, void 0, ut, rn.has(U) || bt, bt)),
        a.push(A.children[2] ? evaluateWord(A.children[2], e, !1) : { kind: "literal", text: "" }));
    } else if (REDIRECT_NODE_TYPES.has(A.type)) {
      let U = [];
      ((L =
        analyzeHeredocRedirect(A, e, U) ??
        (U.length > 0 ? tooComplexReason("a pipeline nested in a redirect") : null)),
        o.push(A));
    } else if (r && WORD_NODE_TYPES.has(A.type)) s.push({ node: A, value: evaluateWord(A, e, !0) });
    else if (r && A.type === "ERROR" && /^[=!]?=$/.test(A.text))
      s.push({ node: A, value: { kind: "literal", text: "=" } });
    else
      L = tooComplexReason(
        A.type === "ERROR" ? "syntax the parser could not recover" : `a ${A.type} in a command`,
      );
    if (L !== null) return L;
  }
  if (!r) return null;
  let l = evaluateWord(r, e, !0);
  if (l.kind === "refuse") return l.detail;
  let d = e.simple && l.kind === "dynamic" ? /\/([^/$`'"\\{}*?[\]]+)"?$/.exec(r.text)?.[1] : void 0,
    [, , c, f] = Pe.exec(r.text) ?? [],
    h = c ?? f ?? "",
    b = e.scopes.findLast((E) => E.has(h))?.get(h);
  if (d) l = { kind: "literal", text: d };
  else if (b !== void 0) {
    let E = programBaseName(b);
    if (dt.has(E) || Hn.has(E) || ot.has(E) || /^(?:chdir|popd|link|mkfifo|mknod)$/.test(E))
      return `runs ${E} through the variable ${h} ${TOO_COMPLEX_SUFFIX}; spell it out`;
    l = { kind: "literal", text: b };
  }
  if ((!isStaticNode(r) && !d && b === void 0) || l.kind !== "literal" || !Dn.test(l.text))
    return `runs a command whose name is computed at runtime ${TOO_COMPLEX_SUFFIX}, so it cannot be shown not to be git`;
  let g = [l.text];
  for (let [E, { node: A, value: L }] of s.entries()) {
    if (L.kind === "refuse") return L.detail;
    if (
      !e.simple &&
      L.kind === "literal" &&
      L.text.split(/\s+/).some((U) => GIT_COMMAND_PATTERN.test(basename_2(U)))
    )
      return GIT_TOO_COMPLEX_REASON;
    if (g.length === E + 1 && L.kind === "literal" && isStaticNode(A)) g.push(L.text);
  }
  let S = 0;
  while (ot.has(programBaseName(g[S])) || (e.simple && Ft.has(g[S]))) {
    let E = programBaseName(g[S]),
      A = S + 1;
    if (E === "timeout" && /^\d+(?:\.\d+)?[smhd]?$/.test(g[A] ?? "-")) A++;
    let L = programBaseName(g.slice(A).find((bt) => !/^[A-Za-z_]\w*=/.test(bt)) ?? ""),
      U = dt.has(L),
      ut = rn.has(L);
    while (/^(?:env|sudo)$/.test(E) && /^[A-Za-z_]\w*=/.test(g[A] ?? "-")) {
      let [bt = "", St = ""] = g[A].split(/=(.*)/s),
        nn =
          (me.test(bt) || !Wt.test(St)) && !e.simple
            ? unverifiableRunReason("env", `with ${shortenForReason(g[A])}`)
            : environmentAssignmentReason(bt, { kind: "literal", text: St }, St, U, ut);
      if (nn !== null) return nn;
      (a.push({ kind: "literal", text: St }), A++);
    }
    if (/^-|=/.test(g[A] ?? "-")) break;
    S = A;
  }
  if (isDevicePath(g[S]))
    return `runs the program a descriptor holds (${g[S]}) ${TOO_COMPLEX_SUFFIX}, so it cannot be shown not to be git`;
  let p = programBaseName(g[S]),
    sliced = s.slice(S),
    mapped = sliced.map((E) => (E.value.kind === "literal" ? E.value.text : null)),
    x = stdinFed || o.some(isStdinRedirect),
    inputAssembled = e.inputAssembled;
  if (e.simple && GIT_COMMAND_PATTERN.test(p)) return null;
  if (
    p === "integer" ||
    p === "float" ||
    (p === "private" && mapped.some((E) => E === null || /^[-+].*[iEF]/.test(E)))
  ) {
    let found = mapped
      .map((A) => describeIntegerTyping(/^[A-Za-z_]\w*/.exec(A ?? "")?.[0] ?? ""))
      .find((A) => A !== null);
    if (found !== void 0) return found;
  }
  let G = e.pipedFrom?.text ?? "";
  if (
    e.simple &&
    !dt.has(p) &&
    mentionsGit(
      [dt.has(G.split(/\s/)[0] ?? "") ? G : "", ...o.filter(isStdinRedirect).map((E) => E.text)].join(`
`),
    )
  )
    return `feeds ${p} text naming git ${TOO_COMPLEX_SUFFIX}, which cannot be shown to stay inside the worktree`;
  if (e.simple && EVAL_LIKE_BUILTINS.has(p))
    return p === "exec" && sliced.length === 0 && inputAssembled
      ? unverifiableRunReason("exec", "redirecting this shell's descriptors to one it assembles")
      : Ft.has(p)
        ? checkLauncherInvocation(p, sliced, e, { fed: x, assembled: inputAssembled })
        : null;
  let D = [g[S], ...mapped],
    N = !SHELL_PROGRAM_NAMES.has(p)
      ? -1
      : APPLET_SHELL_NAMES.has(p) && SHELL_PROGRAM_NAMES.has(programBaseName(mapped[0] ?? "-"))
        ? 1
        : 0,
    y = findShellCommandStringIndex(D, N);
  if (y !== -1) return analyzeNestedShellText(programBaseName(D[N]), D[y], e, x);
  if (e.simple && SHELL_PROGRAM_NAMES.has(p)) {
    let mapped_2 = mapped.map((U) => U?.toLowerCase() ?? "-"),
      sliced_2 = mapped_2.slice(N),
      L = sliced_2[0] === "-n" ? sliced_2[1] : sliced_2[0];
    return (x && (L === void 0 || isOpaquePathArgument(L, e) || /^(?:su|runuser)$/.test(p))) ||
      (/^(?:cmd|powershell|pwsh)$/.test(p) && sliced.length > 0) ||
      /^[-+]/.test(L ?? "") ||
      isDevicePath(L ?? "") ||
      mapped_2.some((U) => SHELL_COMMAND_FLAG_PATTERN.test(U))
      ? describeGitRunner(p)
      : APPLET_SHELL_NAMES.has(p)
        ? checkLauncherInvocation(p, sliced, e, { fed: x, assembled: inputAssembled })
        : p === "rsh"
          ? (analyzeRemoteShellCommand("ssh", sliced, e, { assembled: inputAssembled, fed: x }) ?? null)
          : null;
  }
  let z = describeGitRunner(p);
  if (z !== null) return z;
  let R =
    !V() || mapped.length === 0
      ? null
      : p === "pushd" &&
          (mapped.includes("-n") ||
            sliced.some(
              (E, A) =>
                mapped[A] === null &&
                (J(E) || Di(E.node, e) || isBracketGlobNode(E.node) || /^[?*[]/.test(E.node.text)) &&
                !(!hasExpansion(E.node) && Pi(E.node, e)) &&
                !(mapped.slice(0, A).includes("--") && !hasExpansion(E.node)),
            ))
        ? mapped.includes("-n")
          ? "-n (pushd then puts the directory on the stack without entering it, and a later ~1 stands for it; use pushd without -n, or cd)"
          : "a word that may come out as -n (pushd would then put the directory on the stack without entering it, and a later ~1 stands for it; write the directory out, or put it in double quotes after --)"
        : p === "dirs" && mapped.some((E) => E === null || !/^(?:-[clpv]+|[-+]\d+)$/.test(E))
          ? "a word that zsh puts on the directory stack without entering it (a later ~1 stands for it)"
          : null;
  if (R !== null) return unverifiableRunReason(p, `with ${R}`);
  if (p === "command" && /^-[vV]$/.test(mapped[0] ?? "")) return null;
  if (ot.has(p) && sliced.length > 0 && !e.simple)
    return unverifiableRunReason(p, `with ${describeWordValue(sliced[0].value)}`);
  if (dt.has(p)) return checkBuiltinArguments(p, sliced, e, o.some(isStdinRedirect) ? void 0 : e.pipedFrom);
  let O = INTERPRETER_RULES.get(p);
  if (O) return checkInterpreterInvocation(p, O, sliced, e, { redirects: o, prefixValues: a });
  if (e.simple) return checkLauncherInvocation(p, sliced, e, { fed: x, assembled: inputAssembled });
  let Y = checkSshpassInvocation(p, sliced, e, { assembled: inputAssembled, fed: x });
  if (Y !== null) return Y;
  let st =
      analyzeRsyncScp(p, sliced, e) ??
      analyzeRemoteShellCommand(p, sliced, e, { assembled: inputAssembled, fed: x }),
    index = mapped.findIndex((E) => SHELL_PROGRAM_NAMES.has(programBaseName(E ?? "-"))),
    it = findShellCommandStringIndex(mapped, index);
  for (let [E, A] of [...sliced.map((L) => L.value), ...a].entries())
    if (!(E < sliced.length && (st !== void 0 || (it !== -1 && E >= index && E <= it))) && !Xt(A))
      return A.kind === "refuse" ? A.detail : unverifiableRunReason(p, `with ${describeWordValue(A)}`);
  if (st !== void 0) return st;
  if (inputAssembled && mapped.some((E) => E !== null && E.split(/\s+/).some(isDevicePath)))
    return `feeds ${p} a descriptor it names ${TOO_COMPLEX_SUFFIX}, whose content is assembled at runtime and may be read as a program`;
  let filtered = o.filter(isStdinRedirect);
  if (filtered.length > 0 ? filtered.some((E) => analyzeRedirect(E, e)) : stdinFed && e.inputAssembled)
    return `feeds ${p} input assembled by the command ${TOO_COMPLEX_SUFFIX}; a program this guard does not know may run that input, so it cannot be shown not to run git`;
  return it === -1 ? null : analyzeNestedShellText(programBaseName(mapped[index]), mapped[it], e, x);
}
//@ chunk-63f0f3kd.js:80297-80390 placement
function hs(t) {
  return t.findIndex((e, i) => !/^(?:-|$)/.test(e) && !/^-[pfdP]$/.test(t[i - 1] ?? ""));
}
/**
 * 分析 sshpass 调用：校验其选项可读，找出被包装的程序；若为 rsh/ssh/scp/rsync 则交给远程命令分析，若后续词可能指定远程客户端则拒绝。
 */
//@ chunk-63f0f3kd.js:80390-81547 placement
function checkSshpassInvocation(t, e, i, n) {
  if (t !== "sshpass" || !readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, { safe: !0 })) return null;
  let mapped = e.map((f) => (f.value.kind === "literal" ? f.value.text : "")),
    s = hs(mapped),
    a = s === -1 ? e.length : s;
  if (
    !mapped
      .slice(0, a)
      .every((f, h) =>
        /^-[pfdP]$/.test(mapped[h - 1] ?? "")
          ? !f.startsWith("-")
          : (f === "--" && h + 1 === a) || /^-(?:[hVv]+e?|e|[pfdP]|[hVv]*[pfdP].+)$/s.test(f),
      )
  )
    return unverifiableRunReason(
      t,
      "with an option or computed word this check cannot read before the program it runs (write each option as its own word: -p PASSWORD, -f FILE, -d FD, -P PROMPT, -e or -v; attach a value that starts with -, as in -p-secret; and write the program name as plain text)",
    );
  let found = e.slice(0, a + 1).find((f) => mayExpandToNothing(f.node));
  if (found) return unverifiableRunReason(t, `with ${emptyExpansionReason(found)}`);
  let l = programBaseName(mapped[s] ?? ""),
    sliced = e.slice(s + 1);
  if (l === t) return checkSshpassInvocation(t, sliced, i, n);
  if (l === "rsh") return analyzeRemoteShellCommand("ssh", sliced, i, n) ?? null;
  let c =
    ot.has(l) || UNHANDLED_EXEC_WRAPPERS.has(l) || APPLET_SHELL_NAMES.has(l) || /^(?:xargs|find)$/.test(l);
  if (
    !It.has(l) &&
    sliced.some(({ value: f }) =>
      f.kind === "literal"
        ? f.text
            .split(/\s+/)
            .map(programBaseName)
            .some((h) => h === "rsh" || It.has(h))
        : c,
    )
  )
    return unverifiableRunReason(
      t,
      `with ${l} as its program and a later word that may name a remote client, which this guard does not read past (make the client sshpass's own program)`,
    );
  return It.has(l)
    ? (analyzeRsyncScp(l, sliced, i) ?? analyzeRemoteShellCommand(l, sliced, i, n) ?? null)
    : null;
}
/**
 * 分析启动器类命令（sudo、env、nohup、timeout、xargs 等）的参数：stdin 喂 shell、sshpass/远程客户端、操作数中的 git、shell -c 字符串、环境赋值与计算值，无法证明安全时返回原因。
 */
//@ chunk-63f0f3kd.js:81547-83889 placement
function checkLauncherInvocation(program, words, state, { fed: fed, assembled: assembled }) {
  let isLauncher =
      ot.has(program) ||
      UNHANDLED_EXEC_WRAPPERS.has(program) ||
      Ft.has(program) ||
      APPLET_SHELL_NAMES.has(program),
    literals = words.map((g) => (g.value.kind === "literal" ? g.value.text : "")),
    o = ns();
  if (program === "sudo" && literals.some((g) => /^(?:-[A-Za-z]*D|--chdir)/.test(g)))
    return unverifiableRunReason(
      "sudo",
      "with --chdir: the paths judged so far were read against the shell directory",
    );
  if (
    fed &&
    (/^(?:at|batch|crontab|newgrp)$/.test(program) ||
      (program === "parallel" && literals.every((g) => g.startsWith("-"))) ||
      (/^(?:unshare|nsenter|chroot)$/.test(program) &&
        count(literals, (g) => !/^(?:-|\d*$)/.test(g)) <= +(program === "chroot")) ||
      (/^(?:sudo|doas)$/.test(program) &&
        literals.some((g) => /^(?:-[A-Za-z]*[si]|--shell|--login)/.test(g))))
  )
    return unverifiableRunReason(program, "with a shell reading its commands from stdin");
  let u = checkSshpassInvocation(program, words, state, { fed: fed, assembled: assembled });
  if (u !== null) return u;
  let l = program === "sshpass" ? hs(literals) : -1,
    d = It.has(program)
      ? program
      : l !== -1 && It.has(programBaseName(literals[l]))
        ? programBaseName(literals[l])
        : null;
  if (d !== null) {
    let g =
      analyzeRsyncScp(d, words.slice(l + 1), state) ??
      analyzeRemoteShellCommand(d, words.slice(l + 1), state, { assembled: assembled, fed: fed });
    if (g !== void 0) return g;
  }
  let index = literals
    .slice(0, -1)
    .findIndex((g) =>
      GIT_COMMAND_PATTERN.test(programBaseName(g.replace(/^-.*=/, "")).replace(/[:@].*$/, "")),
    );
  if (
    index !== -1 &&
    (!isLauncher ||
      sn.test(program) ||
      literals
        .slice(0, index)
        .some(
          (g, S, p) =>
            /^(?:-[A-Za-z]*[DR]|--ch(?:dir|root))/.test(g) ||
            (!/^(?:-|[A-Za-z_]\w*=|[\d.,:]+[a-z]?$)/.test(g) &&
              !/^-[A-Za-z]*[ugnskoecptwC]$/.test(p[S - 1] ?? "") &&
              (!(ot.has(g) || UNHANDLED_EXEC_WRAPPERS.has(g)) || sn.test(g))),
        ))
  )
    return unverifiableRunReason(
      program,
      "with a git command among its operands: what runs it, and from which directory or root, cannot be read here (name git right after the launcher and its options)",
    );
  let index_2 = literals.findIndex((g) => SHELL_PROGRAM_NAMES.has(programBaseName(g))),
    h = findShellCommandStringIndex(
      words.map((g) => (g.value.kind === "literal" ? g.value.text : null)),
      index_2,
    ),
    b = literals[index_2 + (literals[index_2 + 1] === "-n" ? 2 : 1)];
  if (
    index_2 !== -1 &&
    h === -1 &&
    (literals.some((g) => SHELL_COMMAND_FLAG_PATTERN.test(g)) ||
      /^[-+]/.test(b ?? "") ||
      isDevicePath(b ?? "") ||
      (fed && (!b || isOpaquePathArgument(b, state))))
  )
    return unverifiableRunReason(program, `with ${describeWordValue(words[index_2].value)}`);
  for (let [g, { value: S }] of words.entries()) {
    if (g === h) continue;
    if (S.kind !== "literal") {
      if (
        S.kind === "refuse" ||
        (S.why === "a glob pattern" && (isLauncher || !S.inert)) ||
        (isLauncher && !S.inert)
      )
        return unverifiableRunReason(program, `with ${describeWordValue(S)}`);
      continue;
    }
    let matches = /[$`'"\\]/.test(S.text),
      mapped = S.text
        .replace(SHELL_QUOTE_CHARS_RE, "")
        .split(/\s+/)
        .map((D) => programBaseName(D.replace(/^.*=/, ""))),
      _ = o ? (mapped.find((D) => D !== "") ?? "") : mapped[0],
      x = isLauncher && /^([A-Za-z_]\w*)=(.*)$/s.exec(S.text),
      T = x ? environmentAssignmentReason(x[1], { kind: "literal", text: x[2] }, x[2]) : null;
    if (T !== null) return T;
    let G = isLauncher
      ? matches || isDevicePath(S.text) || mapped.some((D) => Hn.has(D) || (fed && INTERPRETER_RULES.has(D)))
        ? unverifiableRunReason(program, `with ${describeWordValue(S)}`)
        : mapped.length > 1 || /[*?[]/.test(S.text)
          ? analyzeNestedShellText(program, S.text, state, fed)
          : null
      : (matches || mapped.length > 1) && (isGitProgram(_) || (matches && mapped.some(isGitProgram)))
        ? unverifiableRunReason(program, `with ${describeWordValue(S)}`)
        : null;
    if (G !== null) return G;
  }
  return h === -1
    ? null
    : analyzeNestedShellText(programBaseName(literals[index_2]), literals[h], state, fed);
}
//@ chunk-63f0f3kd.js:83889-83932 placement
function isGitProgram(t) {
  return GIT_COMMAND_PATTERN.test(t) || SHELL_PROGRAM_NAMES.has(t);
}
//@ chunk-63f0f3kd.js:83932-84026 placement
function mentionsGit(t) {
  return [t, t.replace(SHELL_QUOTE_CHARS_RE, "")].some((e) =>
    e.split(/[^\w.-]+/).some((i) => GIT_COMMAND_PATTERN.test(i)),
  );
}
//@ chunk-63f0f3kd.js:84026-84177 placement
var SHELL_QUOTE_CHARS_RE = /\$\{[^}]*\}|\$\w*|[`'"\\]/g,
  BOT_PROTECTED_TENGU_STEADY_THIMBLE = "bot_protected_tengu_steady_thimble",
  STRING_NODE_TYPES_RE = /^(?:string|raw_string|ansi_c_string)$/,
  GLOB_CHARS_RE = /(?:^|[^\\])(?:\\\\)*[*?[{]/;
//@ chunk-63f0f3kd.js:84177-84240 placement
function ps(t) {
  return t.type === "word" ? GLOB_CHARS_RE.test(t.text) : hasChildWordMatching(t, GLOB_CHARS_RE);
}
/**
 * 检查内建命令与常用工具（printf、test、set/shopt、rg/sort、cd、read/getopts/unset 等）的参数能否静态判定（计算值可能是选项、变量名可能被绑定等），不能时返回原因。
 */
//@ chunk-63f0f3kd.js:84240-93992 placement
function checkBuiltinArguments(program, words, state, n) {
  let values = words.map((o) => o.value),
    literalValues = values.map((o) => (o.kind === "literal" ? o.text : null)),
    reason = null;
  if (program === "printf") {
    let o = literalValues[literalValues[0] === "--" ? 1 : 0];
    reason = o === null || (o ?? "").startsWith("-") ? (o ?? "a computed format") : null;
  } else if (program === "test" || program === "[") {
    let index = literalValues.findIndex(
        (l, d) => /^-[vRt]$/.test(l ?? "") && !/^(?:[A-Za-z_]\w*|\d+)$/.test(literalValues[d + 1] ?? ""),
      ),
      index_2 = values.findIndex(
        (l, d) =>
          d + 1 < values.length && l.kind === "dynamic" && !l.integer && !isTestOperand(values[d + 1]),
      );
    reason =
      index !== -1
        ? `${literalValues[index]} ${index + 1 < values.length ? describeWordValue(values[index + 1]) : "and nothing after it"}`
        : index_2 === -1
          ? null
          : describeWordValue(values[index_2]);
  } else if (/^(?:set|shopt|setopt|unsetopt|rg|sort)$/.test(program)) {
    let o = (N) => program === "rg" && GREP_PATTERN_OPTIONS.test(literalValues[N - 1] ?? ""),
      u = (program === "rg" || program === "sort") && V(),
      l = [];
    for (let N = 0; u && N < literalValues.length; N++) {
      let y = N > 0 && l[N - 1] === null ? literalValues[N - 1] : null;
      l[N] =
        y === null
          ? null
          : program === "sort"
            ? normalizeSortOption(y)
            : GREP_PATTERN_OPTIONS.test(y) || RG_PROGRAM_OPTIONS.test(y)
              ? y
              : findGrepPatternFlag(y);
    }
    let d = u ? literalValues.findIndex((N, y) => N === "--" && l[y] === null) : literalValues.indexOf("--"),
      c = (N) => (u ? (l[N] ?? (o(N) ? literalValues[N - 1] : null)) : null),
      f = program === "rg" ? Fs : zs,
      h = (N, y) =>
        y !== null &&
        N.value.kind !== "literal" &&
        !Mt(N) &&
        !(N.value.kind === "dynamic" && N.value.integer && f.test(y)),
      index = literalValues.indexOf("--"),
      g = (N, y) =>
        (index === -1 || y < index) &&
        J(N) &&
        !(program === "rg" && GREP_PATTERN_OPTIONS.test(literalValues[y - 1] ?? "") && !hasExpansion(N.node)),
      S = (N, y) => u && (d === -1 || y < d) && (o(y) && l[y] !== null ? h(N, l[y]) : J(N) || h(N, c(y))),
      index_2 = words.findIndex((N, y) => g(N, y) || S(N, y)),
      m = (N) => `${OPTION_POSITION_NOTE.slice(0, OPTION_POSITION_NOTE.indexOf(";"))}: ${N})`,
      _ = (N) => {
        let y = words[N],
          z = literalValues[N - 1] ?? "",
          R = u ? c(N) : o(N) ? z : null;
        if (R === null)
          return u && z === "--" && l[N - 1]
            ? `${describeWordValue(y.value)} ${m(`the -- before it is the ${l[N - 1]} value here, so options have not ended`)}`
            : `${describeWordValue(y.value)} ${OPTION_POSITION_NOTE}`;
        let O = u && l[N] != null && R !== z,
          Y = O ? `${z.slice(0, -1)} ${R}` : R,
          st = `as the ${R} value${O ? ` of the cluster ${z}` : ""}, where an option may stand`;
        if (y.value.kind === "dynamic" && y.value.many) return dynamicArgumentReason(program, R, y);
        if (program !== "rg" || !GREP_PATTERN_OPTIONS.test(R))
          return f.test(R)
            ? `${describeWordValue(y.value)} ${st} (give a spelled-out count or key: ${Y} 4)`
            : `${describeWordValue(y.value)} ${st} (if this command sets it to a path, quoting it is enough: "$x"; otherwise spell the value out, or at least its first character: a wholly computed ${R} value may begin with -)`;
        if ((u ? h(y, R) : !0) || (o(N) && l[N] !== null && hasExpansion(y.node)))
          return dynamicArgumentReason(program, R, y, O ? z : void 0);
        return O
          ? `${describeWordValue(y.value)} ${st} (write ${R} as its own word: ${Y} "$x")`
          : `${describeWordValue(y.value)} ${m(`the ${z} before it is itself the ${l[N - 1] ?? "previous option"} value here, so give each option its own value`)}`;
      },
      x = -1,
      T,
      G = program !== "set",
      D = !/^(?:rg|sort)$/.test(program);
    for (let N = 0; D && x === -1 && N < literalValues.length; N++) {
      let y = literalValues[N] ?? null;
      if (program === "set" && !G && !/^[-+][a-zA-Z]/.test(y ?? "")) {
        if (mayExpandToNothing(words[N].node)) {
          T = words[N];
          continue;
        }
        break;
      }
      ((x = (
        y === null
          ? !1
          : G
            ? isSafeShellOption(y) ||
              /^(?:no)?allexport$/i.test(y.replace(/_/g, "")) ||
              (program === "shopt" && /^-[suqpo]+$/.test(y))
            : !/o.*o/.test(y) &&
              y
                .slice(1)
                .split("")
                .every((R) => /[ao]/.test(R) || (R !== "T" && SET_O_SAFE_LETTERS.has(R)))
      )
        ? -1
        : N),
        (G = program !== "set" || /^[-+][a-zA-Z]*o/.test(y ?? "")));
    }
    reason =
      x !== -1
        ? describeWordValue(values[x]) + (T ? ` after ${emptyExpansionReason(T)}` : "")
        : ((D
            ? null
            : findMatching(
                literalValues,
                program === "rg" ? /^--(?:pre(?:-glob)?|hostname-bin)(?:=|$)/ : /^--co/,
              )) ?? (index_2 === -1 ? null : _(index_2)));
  } else if (program === "cd" || program === "pushd")
    reason = literalValues.some((o) => o !== null && o[0] !== "-" && isDevicePath(o))
      ? "a directory under /dev or /proc"
      : null;
  if (reason !== null) return unverifiableRunReason(program, `with ${reason}`);
  if (zn.has(program)) {
    let o = program === "getopts" ? "data" : "name";
    for (let [u, l] of values.entries()) {
      let d = o;
      o = "name";
      let c = literalValues[u] ?? null,
        node = words[u].node,
        h = d === "name" && program === "read" && c?.[0] === "-";
      if (
        l.kind === "literal" &&
        (h || d === "data") &&
        ps(node) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_STEADY_THIMBLE, { safe: !0 })
      )
        return unverifiableRunReason(
          program,
          `with the word ${shortenForReason(node.text)}: its unquoted *, ?, [ or { may make it no word or several, and the words after it may then be read as variable names (${h ? "spell the option letters out, such as -d" : "write it as quoted text, such as '*'"})`,
        );
      if (h) {
        for (let S = 1; S < c.length; S++) {
          let p = `-${c[S]}`;
          if (!/^-[aA]$/.test(p) && !READ_DATA_FLAGS.has(p)) continue;
          let m = READ_NUMERIC_ARG_FLAGS.has(p) ? "number" : READ_DATA_FLAGS.has(p) ? "data" : "name",
            sliced = c.slice(S + 1);
          if (sliced === "") o = m;
          else if (
            m === "number"
              ? !READ_NUMERIC_OPERAND_RE.test(sliced)
              : m === "name" && (!SHELL_NAME_PATTERN.test(sliced) || describeUnsafeBinding(sliced, state))
          )
            return describeUnsafeBinding(sliced, state) ?? unverifiableRunReason(program, `with ${c}`);
          break;
        }
        continue;
      }
      let b =
          d === "data"
            ? l.kind === "refuse"
            : d === "number"
              ? !(c === null ? l.kind === "dynamic" && l.integer : READ_NUMERIC_OPERAND_RE.test(c))
              : c === null
                ? l.kind !== "dynamic" || !l.arithmeticSafe
                : !Wt.test(c),
        g =
          d === "name" && program !== "unset" && SHELL_NAME_PATTERN.test(c ?? "-")
            ? describeUnsafeBinding(c, state)
            : null;
      if (b || g !== null)
        return g ?? unverifiableRunReason(program, `with a name it would evaluate (${describeWordValue(l)})`);
      if (
        l.kind === "dynamic" &&
        (d === "number" || (d === "data" && !isQuotedLiteral(node, STRING_NODE_TYPES_RE))) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_STEADY_THIMBLE, { safe: !0 })
      )
        return unverifiableRunReason(
          program,
          d === "number"
            ? `with ${describeWordValue(l)} after -t, -n or -N: zsh may read it and the words after it as variable names (write the number itself, such as -t 5)`
            : `with ${describeWordValue(l)} where one value belongs: it may become no word or several, and the words after it may then be read as variable names (write it as one double-quoted variable, such as "$NAME", or as quoted text; $@, $*, [@], [*] and \${! are refused here even inside quotes)`,
        );
    }
    return null;
  }
  if (AWK_NAMES.has(program)) {
    let o = 0;
    while (o < literalValues.length && literalValues[o] !== "--" && literalValues[o]?.[0] === "-") {
      let h = literalValues[o],
        match = /^-[Fv](.+)$/s.exec(h),
        g = match
          ? match[1]
          : h === "-v"
            ? words[o + 1]?.node.text.replace(/["'\\]/g, "")
            : literalValues[o + 1];
      if (!/^-[Fv]/.test(h) || typeof g !== "string" || (h[1] === "v" && !/^[A-Za-z_]\w*=/.test(g)))
        return unverifiableRunReason(program, `with ${h}`);
      let S = !match && literalValues[o + 1] === null ? words[o + 1] : null;
      if (S && (S.value.kind === "refuse" || hasExpansion(S.node) || (V() && !Mt(S))))
        return unverifiableRunReason(program, `with ${dynamicArgumentReason(program, h, S)}`);
      o += match ? 1 : 2;
    }
    o += literalValues[o] === "--" ? 1 : 0;
    let u = o < literalValues.length ? literalValues[o] : "";
    if (u === null || u === void 0 || u.includes("{}") || awkProgramHasExecBridge(u))
      return unverifiableRunReason(
        program,
        "with a program that can execute commands or that it cannot read",
      );
    let replaced = u.replaceAll("||", "  "),
      index = replaced.indexOf("|"),
      index_2 = u.indexOf("print");
    return index !== -1 &&
      ((index_2 !== -1 && index_2 < replaced.lastIndexOf("|")) || u.lastIndexOf("getline") > index) &&
      readFlagWithOverride(TENGU_RUSTLING_LIGHTHOUSE, { safe: !0 })
      ? unverifiableRunReason(
          program,
          `with a | after print/printf or before getline in its program, which awk can run as a pipe to a command, whatever the command is (a | in a regex, string or comment at such a spot is refused too: pass the pattern with -v re='a|b', doubling any backslash in it, and use $0 ~ re or gsub(re, "x"); print a literal | as "\\174")`,
        )
      : null;
  }
  switch (program) {
    case "sed": {
      let o = readFlagWithOverride(TENGU_HUMBLE_WHALE, { safe: !0 })
          ? parseSedProgram(literalValues, !1)
          : null,
        u =
          o && !["linux", "wsl", "windows"].includes(getPlatform())
            ? parseSedProgram(literalValues, !0)
            : null,
        index = literalValues.indexOf("--"),
        d = index !== -1 && u ? Math.max(index, u.optionsEnd) : index,
        found = words.find((p, m) => (d === -1 || m < d) && J(p)),
        found_2 = literalValues.find(
          (p) => isOptionWord(p) && !isSedExpressionFlag(p) && !p.startsWith("--expression=") && !Vs.test(p),
        );
      if (found || found_2)
        return (
          unverifiableRunReason(
            "sed",
            `with ${found_2 ?? `${describeWordValue(found.value)} ${OPTION_POSITION_NOTE}`}`,
          ) + (!found_2 && index !== -1 && words.indexOf(found) > index ? $e : "")
        );
      let flattened = literalValues.flatMap((p, m) =>
        isSedExpressionFlag(literalValues[m - 1]) ? [p] : p?.startsWith("--expression=") ? [p.slice(13)] : [],
      );
      if (flattened.length === 0)
        flattened = literalValues
          .filter((p, m) => p !== "--" && !isSedExpressionFlag(literalValues[m - 1]) && !isOptionWord(p))
          .slice(0, 1);
      let regExp = new RegExp(ti, "y"),
        g = Ks() ? new RegExp(js, "y") : null,
        S = [
          ...flattened.map((p) => ({ script: p, hint: "" })),
          ...(o ? [{ script: o.program, hint: un }] : []),
          ...(u
            ? [
                {
                  script: u.program,
                  hint: u.suffixes.some((suffixe) => suffixe !== "") ? $e : flattened[0] === "" ? "" : un,
                },
              ]
            : []),
        ];
      for (let { script: script, hint: hint } of S) {
        if (script === null) return unverifiableRunReason("sed", "with a program computed at runtime") + hint;
        if (!matchesWhole(regExp, script))
          return unverifiableRunReason("sed", `with the program ${shortenForReason(script)}`) + hint;
        if (g && !matchesWhole(g, script))
          return (
            unverifiableRunReason("sed", `with the program ${shortenForReason(script)}`) +
            SED_PATTERN_NOTE +
            hint
          );
      }
      return u?.suffixes.includes(null)
        ? unverifiableRunReason(
            "sed",
            "with a computed word after a bare -i, which macOS and BSD sed take as the backup suffix",
          ) + $e
        : null;
    }
    case "find": {
      let mapped = literalValues.map(() => null),
        u = literalValues.length;
      for (let f = 0; V() && f < u; f++) {
        let h = literalValues[f] ?? null;
        if (h === null || mapped[f] !== null) continue;
        if (an.has(h)) u = f;
        else if (Nt.test(h) || Vi.test(h)) {
          for (let b = 1; b <= (h === "-fprintf" ? 2 : 1); b++)
            if (f + b < literalValues.length) mapped[f + b] = h;
        }
      }
      let l = 0,
        d = !1;
      while (V() && l < literalValues.length && literalValues[l] !== "-") {
        let f = literalValues[l] ?? null;
        if (f === null) {
          if (J(words[l])) {
            d = !0;
            break;
          }
          if (isQuotedLiteral(words[l].node)) break;
          l += 1;
          continue;
        }
        let match = /^-[EHLPXdhsx]*(f([\s\S]*))?$/.exec(f);
        if (match === null) break;
        l += match[1] !== void 0 && match[2] === "" ? 2 : 1;
      }
      let c =
        d ||
        (V() &&
          literalValues.some(
            (f, h) =>
              f === "-files0-from" ||
              ((h < l || (h < u && mapped[h] === null)) && /^-[EHLPXdhsx]*f(?:-|$)/.test(f ?? "")),
          ));
      for (let [f, h] of literalValues.entries()) {
        let node = words[f].node,
          g =
            f === 0 &&
            !(
              J(words[f]) &&
              (node.type !== "string" ||
                node.children.length !== 3 ||
                literalValues.some((_) => _ === ";" || _ === "+"))
            ),
          S = h === null && (!Nt.test(literalValues[f - 1] ?? "") || hasExpansion(node)) && !g,
          p = f < u && Nt.test(mapped[f] ?? ""),
          m = V() && h === null && (!p || !Mt(words[f])) && !g;
        if (S || m) {
          let _ = V() && f >= u && Nt.test(literalValues[f - 1] ?? ""),
            x = V()
              ? p
                ? mapped[f]
                : null
              : Nt.test(literalValues[f - 1] ?? "")
                ? literalValues[f - 1]
                : null;
          return unverifiableRunReason(
            "find",
            `with ${x !== null ? dynamicArgumentReason("find", x, words[f]) : _ ? `${describeWordValue(values[f])} after ${literalValues[f - 1]} once an -exec action has begun, where no computed word is read as a value (spell it out, or put a find test before the -exec clause),` : describeWordValue(values[f])}`,
          );
        }
        if (an.has(h ?? "")) {
          let matches = /^-exec(?:dir)?$/.test(h),
            index = literalValues.findIndex((R, O) => O > f && /^[;+]$/.test(R ?? "")),
            index_2 = literalValues.findIndex(
              (R, O) => O > f && (R === ";" || (matches && R === "+" && literalValues[O - 1] === "{}")),
            ),
            G = V()
              ? literalValues
                  .slice(f + 1, index_2 === -1 ? literalValues.length : index_2)
                  .find(
                    (R, O) =>
                      R !== null &&
                      ((R !== ";" && R.startsWith(";")) ||
                        (matches && R !== "+" && R.startsWith("+") && literalValues[f + O] === "{}")),
                  )
              : void 0;
          if (G !== void 0)
            return unverifiableRunReason(
              "find",
              `${h} with a clause containing ${shortenForReason(G)}, which GNU and BSD find end differently,`,
            );
          let D = literalValues[f + 1],
            N = c || (V() && (h === "-execdir" || h === "-okdir")),
            y = (R) =>
              R === -1 || !D || D.includes("{}")
                ? unverifiableRunReason("find", `${h} with a program it cannot verify`)
                : checkExecSlotCommand(
                    D,
                    words
                      .slice(f + 2, R)
                      .map((O, Y) =>
                        O.value.kind === "literal" && O.value.text.includes("{}")
                          ? {
                              node: O.node,
                              value: dynamicValue("a found path", {
                                ...DYNAMIC_VALUE_FLAGS,
                                optionSafe:
                                  !O.value.text.startsWith("-") && !(N && O.value.text.startsWith("{}")),
                                many:
                                  V() &&
                                  matches &&
                                  literalValues[R] === "+" &&
                                  f + 2 + Y === R - 1 &&
                                  O.value.text === "{}",
                              }),
                            }
                          : O,
                      ),
                    state,
                  ),
            z = y(index) ?? (V() && index_2 !== index ? y(index_2) : null);
          if (z !== null) return z;
        }
      }
      return null;
    }
    case "xargs": {
      let o = null,
        u = !1;
      for (let l = 0; l < literalValues.length; l++) {
        let d = literalValues[l] ?? null,
          match = /^(?:-I(.*)|-i(.*)|--replace(?:=(.*))?)$/.exec(d ?? "");
        if (match && d !== "-I") {
          o = match[1] || match[2] || match[3] || "{}";
          continue;
        }
        if (d === "-I" && literalValues[l + 1]) {
          o = literalValues[++l];
          continue;
        }
        if (d !== null && qs.test(d)) {
          u = /^(?:-[0rtpx]*0|--null$)/.test(d) ? !0 : /^(?:-[0rtpx]*d|--delimiter)/.test(d) ? !1 : u;
          let matches = /^(?:-[nPLsdE]|--(?:max-args|max-procs|delimiter))$/.test(d),
            b = matches && literalValues[l + 1] === null ? words[l + 1] : null;
          if (b && V() && !Mt(b))
            return unverifiableRunReason("xargs", `with ${dynamicArgumentReason("xargs", d, b)}`);
          l += matches ? 1 : 0;
          continue;
        }
        let f = {
          node: words[l].node,
          value: dynamicValue(
            "the words xargs appends, which may begin with - unless they follow a -- operand or come NUL-separated from find -print0 into xargs -0",
            { ...DYNAMIC_VALUE_FLAGS, optionSafe: u && isSafeFindPrint0(n, state) },
          ),
        };
        return d !== null && !d.startsWith("-") && (o === null || !d.includes(o))
          ? checkExecSlotCommand(
              d,
              [
                ...words
                  .slice(l + 1)
                  .map((h) =>
                    o !== null && (h.value.kind !== "literal" || h.value.text.includes(o))
                      ? { node: h.node, value: dynamicValue("the words xargs substitutes") }
                      : h,
                  ),
                f,
                f,
              ],
              state,
            )
          : unverifiableRunReason("xargs", `with ${d ?? describeWordValue(values[l])}`);
      }
      return null;
    }
    default:
      return null;
  }
}
//@ chunk-63f0f3kd.js:93992-94027 placement
var TENGU_RUSTLING_LIGHTHOUSE = "tengu_rustling_lighthouse";
//@ chunk-63f0f3kd.js:94027-94310 placement
function checkExecSlotCommand(t, e, i) {
  let n = programBaseName(t);
  if (dt.has(n)) return checkBuiltinArguments(n, e, i);
  let r = INTERPRETER_RULES.get(n);
  if (r) return checkInterpreterInvocation(n, r, e, i, { redirects: [], prefixValues: [] });
  return i.simple &&
    (GIT_COMMAND_PATTERN.test(n) ||
      (describeGitRunner(n) === null && !ot.has(n) && !UNHANDLED_EXEC_WRAPPERS.has(n)))
    ? checkLauncherInvocation(n, e, i, { fed: !0, assembled: i.inputAssembled })
    : unverifiableRunReason(n, "from a find -exec or xargs slot");
}
//@ chunk-63f0f3kd.js:94310-94373 placement
function findMatching(t, e) {
  return t.find((i) => i !== null && e.test(i)) ?? null;
}
//@ chunk-63f0f3kd.js:94373-94506 placement
function isTestOperand(t) {
  return t.kind === "literal"
    ? Wt.test(t.text) || /^(?:!=?|==?|=~|\]|\(|\)|<|>)$/.test(t.text)
    : t.kind === "dynamic" && t.integer;
}
//@ chunk-63f0f3kd.js:94506-94632 placement
function matchesWhole(t, e) {
  t.lastIndex = 0;
  while (t.lastIndex < e.length) {
    let lastIndex = t.lastIndex;
    if (!t.test(e) || t.lastIndex === lastIndex) return !1;
  }
  return !0;
}
/**
 * 解析 sed 参数：找出脚本程序参数位置（被 -e/--expression 指定时为空）、选项结束下标与 -i 的后缀。
 */
//@ chunk-63f0f3kd.js:94632-94998 placement
function parseSedProgram(t, e) {
  let i = [],
    n = !1,
    r = !1,
    s = 0;
  for (; s < t.length; s++) {
    let l = t[s] ?? null;
    if (l === null) n ||= !r;
    else if (!isOptionWord(l)) break;
    else if (isSedExpressionFlag(l)) ((r = !0), s++);
    else if (l.startsWith("--expression=")) r = !0;
    else if (e && l === "-i" && ++s < t.length) i.push(t[s] ?? null);
  }
  let a = t[s] === "--" ? s + 1 : s,
    o = a < t.length ? (t[a] ?? null) : "",
    u = r || o?.startsWith(".") ? "" : o;
  return { program: n ? null : u, optionsEnd: s, suffixes: i };
}
//@ chunk-63f0f3kd.js:94998-95061 placement
function isOptionWord(t) {
  return !!t && t !== "-" && t !== "--" && t.startsWith("-");
}
//@ chunk-63f0f3kd.js:95061-95112 placement
function isSedExpressionFlag(t) {
  return t === "-e" || t === "--expression";
}

export {
  programBaseName,
  us,
  cs,
  isStaticWord,
  hasExpansion,
  TENGU_WOOLLY_WALL,
  V,
  isQuotedLiteral,
  analyzeCommand,
  describeGitRunner,
  INTERPRETER_RULES,
  Xt,
  TENGU_HOLLOW_SANDPIPER,
};
