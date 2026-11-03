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
import { basename } from "path";
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
  PLAIN_TEXT_RE,
  isParseFailureNode,
  wordSet,
  isPlainWordText,
  SINGLE_VAR_REF_RE,
  SAFE_PATH_TOKEN_RE,
  GIT_LOCATION_ENV_RE,
  SHELL_NAME_PATTERN,
  DYNAMIC_VALUE_FLAGS,
} from "./shellState.js";
import {
  GIT_TOO_COMPLEX_REASON,
  TOO_COMPLEX_SUFFIX,
  GLOB_WITH_ESCAPE_RE,
  describeWordValue,
  unescapeDoubleQuoted,
  evaluateWord,
  GLOB_SIMPLE_RE,
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
  isParameterExpansionStrictnessOn,
  hasChildWordMatching,
  SED_PATTERN_NOTE,
  dynamicValue,
} from "./wordValues.js";
import {
  DECLARATION_BUILTINS,
  isSafeShellOption,
  isDevicePath,
  isOpaquePathArgument,
  KNOWN_PROGRAMS,
  STRING_EXEC_COMMANDS,
  ARG_SENSITIVE_COMMANDS,
  TRANSPARENT_LAUNCHERS,
  EXEC_LIKE_COMMANDS,
  SHELL_COMMAND_FLAG_PATTERN,
  REMOTE_SESSION_PROGRAMS,
  NAMESPACE_WRAPPER_RE,
  GREP_PATTERN_OPTIONS,
  normalizeSortOption,
  RG_PROGRAM_OPTIONS,
  findGrepPatternFlag,
  GREP_CONTEXT_OPTIONS_RE,
  SORT_VALUE_OPTIONS_RE,
  SHELL_BUILTIN_ARG_COMMANDS,
  TENGU_HUMBLE_WHALE,
  SED_OPTIONS_RE,
  SED_BSD_INPLACE_NOTE,
  SED_COMMAND_PATTERN_STRICT,
  isSedScriptStrictnessOn,
  SED_COMMAND_PATTERN,
  SED_OPTION_ORDER_NOTE,
  FIND_EXEC_OPTIONS,
  XARGS_OPTIONS_RE,
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
  let replaced = basename(t.replace(/\\/g, "/"))
    .toLowerCase()
    .replace(/\.(?:exe|bat|cmd|com)$/, "");
  let replaced_2 = replaced.replace(/([a-z])-?\d[\d.]*$/, "$1");
  return INTERPRETER_RULES.has(replaced_2) || SHELL_PROGRAM_NAMES.has(replaced_2) ? replaced_2 : replaced;
}
//@ chunk-63f0f3kd.js:50884-51057 placement
/**
 * 若命令是 git 或可能间接执行 git 的声明/eval 类内建命令，返回说明原因。
 */
function describeGitRunner(t) {
  let e = programBaseName(t);
  if (GIT_COMMAND_PATTERN.test(e)) return GIT_TOO_COMPLEX_REASON;
  return DECLARATION_BUILTINS.has(e) || EVAL_LIKE_BUILTINS.has(e)
    ? `runs ${e} ${TOO_COMPLEX_SUFFIX}; what it reads or is handed as shell text cannot be shown not to run git`
    : null;
}
//@ chunk-63f0f3kd.js:51057-55417 placement
/**
 * 各解释器（python/node/bun/deno/perl/ruby/php/lua/R/julia/osascript/groovy/tcl）的命令行规则表：内联代码选项、模块选项、取值选项、普通标志、能启动其他程序的代码特征（bridge）、启动时相关的环境变量前缀。
 */
var NEVER_MATCH_RE = /(?!)/;
var INTERPRETER_RULE_DEFAULTS = {
  module: NEVER_MATCH_RE,
  inlineEndsOptions: false,
  console: NEVER_MATCH_RE,
  literalScript: false,
  scriptAfterDashes: true,
};
var GENERIC_BRIDGE_RE = /system|exec|popen|spawn|eval|shell|\x60|\bopen\b|pipe\(|load|dofile|source|require/i;
var NODE_INTERPRETER_RULES = {
  ...INTERPRETER_RULE_DEFAULTS,
  inline: /^(?:-[ep]|--(?:eval|print))$|^--(?:eval|print)=(.*)$/s,
  console: /^inspect$/,
  valued: /^(?:-[rC]|--(?:require|import|loader|experimental-loader|conditions|env-file))$/,
  flag: /^(?:-[vhc]|--[a-z][a-z0-9-]*=.*|--(?:no-[a-z-]+|enable-source-maps|experimental-[a-z-]+|trace-[a-z-]+|inspect(?:-brk)?|expose-gc|version|help|check|watch|test))$/,
  bridge:
    /child_process|exec\w*\s*\(|_compile|spawn(?:Sync)?\s*\(|\beval\b(?!['"])|\bFunction\b|runMain|\.constructor|import\s*\(|--import|--require|--loader|-r\b|require\s*\(\s*[^'"\s)]|\bvm\b|runIn\w*Context|inspector|repl|dlopen|process\.binding|worker_threads|\bWorker\(|\$`|Bun\.\$|Deno\./,
  environment: /^(?:NODE_|NPM_CONFIG_)/,
};
var LUA_INTERPRETER_RULES = {
  ...INTERPRETER_RULE_DEFAULTS,
  inline: /^-e(.*)$/s,
  valued: /^-l$/,
  flag: /^-(?:[vEW]|l.+)$/,
  bridge: GENERIC_BRIDGE_RE,
  environment: /^LUA_/,
};
var R_INTERPRETER_RULES = {
  ...INTERPRETER_RULE_DEFAULTS,
  inline: /^-e(.*)$/s,
  valued: /^-f$/,
  flag: /^--[a-z][a-z-]*(?:=.*)?$/,
  bridge: GENERIC_BRIDGE_RE,
  environment: /^R_/,
};
var TCL_INTERPRETER_RULES = {
  ...INTERPRETER_RULE_DEFAULTS,
  inline: NEVER_MATCH_RE,
  valued: /^-encoding$/,
  flag: NEVER_MATCH_RE,
  bridge: GENERIC_BRIDGE_RE,
  environment: /^TCL/,
};
var PYTHON_INTERPRETER_RULES = {
  ...INTERPRETER_RULE_DEFAULTS,
  inline: /^-[bBdEhIOPqRsSuvVx3]*c(.*)$/s,
  inlineEndsOptions: true,
  module: /^-[bBdEhIOPqRsSuvVx3]*m$/,
  valued: /^(?:-[bBdEhIOPqRsSuvVx3]*[WX]|--check-hash-based-pycs)$/,
  flag: /^(?:-[bBdEhIOPqRsSuvVx3]+|-[WX].+|--(?:version|help)[a-z-]*)$/,
  bridge:
    /system|subprocess|[pP]open|spawn|\bexec\b(?!['"])|exec\w*\s*\(|\beval\b(?!['"])|(?:^|[^.\w])compile\s*\(|\bimp\.|__import__|importlib|runpy|getattr\s*\(|\b(?:globals|locals|vars)\s*\(|builtins|pickle|marshal|shelve|ctypes|breakpoint|\b[bp]db\b|\bcode\.|(?:from|import)\s+code\b|codeop|Interactive(?:Console|Interpreter)|\binteract\s*\(|cProfile|\bprofile\.run|\btrace\b|timeit|\bpty\b|webbrowser|\bdoctest\b/,
  environment: /^PYTHON/,
};
var INTERPRETER_RULES = new Map(
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
      literalScript: true,
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
      scriptAfterDashes: false,
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
/**
 * 判断词值无法静态验证：值是动态的、不是整数，且不是（选项安全且无展开）。
 */
function isUnverifiableValue({ node, value: e }) {
  return e.kind === "dynamic" && !e.integer && !(e.optionSafe && !hasExpansion(node));
}
//@ chunk-63f0f3kd.js:55509-55609 placement
/**
 * 匹配数组展开（$@、${@}、[@]、${!prefix@} 等），有它就无法静态判定。
 */
var TENGU_HOLLOW_SANDPIPER = "tengu_hollow_sandpiper";
var ARRAY_EXPANSION_RE = /\$@|\$\{@|(?<!\$\{#\w*)\[@\]|\$\{\([^)]*@[^)]*\)|\$\{![^}]*@\}/;
//@ chunk-63f0f3kd.js:55609-55886 placement
function isNonEmptyWordPart({ type: t, text }) {
  return (
    /^(?:raw_string|ansi_c_string|number|arithmetic_expansion|process_substitution)$/.test(t) ||
    (t === "string" && !ARRAY_EXPANSION_RE.test(text)) ||
    (t === "word" && !GLOB_WITH_ESCAPE_RE.test(text) && !/[[\]{}]|(?:^|[^\\])(?:\\\\)*[#^]/.test(text)) ||
    /^\$(?:\{?[?#$]\}?|\{#\w+(?:\[[^\]]*\])?\})$/.test(text)
  );
}
//@ chunk-63f0f3kd.js:55886-56003 placement
function mayExpandToNothing(node) {
  return (
    !(node.type === "concatenation" ? node.children : [node]).every(isNonEmptyWordPart) &&
    !/^[[\]]$/.test(node.text) &&
    readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
      safe: true,
    })
  );
}
//@ chunk-63f0f3kd.js:56003-56224 placement
function emptyExpansionReason({ value: t }) {
  return `${describeWordValue(t)}, which may expand to no word at all (a pattern that matches no file, or an empty value), so the word after it would take its place (quote it, or name the files instead of a pattern)`;
}
//@ chunk-63f0f3kd.js:56224-56734 placement
/**
 * 收集语法节点中各单词的字面前缀（跳过展开/替换、[ ] 测试表达式），动态单词只取通配前的前缀，无法确定时记为 "-"。
 */
function collectWordPrefixes(t, e) {
  if (/expansion|substitution/.test(t.type)) return [];
  if (t.children.length > 0) {
    let index = t.children.findIndex((child) => child.type === "word" && child.text === "[");
    let lastIndex = t.children.findLastIndex((child) => child.type === "word" && child.text.endsWith("]"));
    return t.children.flatMap((child, o) =>
      index !== -1 && index <= o && o <= lastIndex ? [] : collectWordPrefixes(child, e),
    );
  }
  if (t.type === '"') return [];
  if (t.type === "string_content") return [unescapeDoubleQuoted(t.text)];
  let i = evaluateWord(t, e, true);
  if (i.kind === "literal") return [i.text];
  let n = i.kind === "dynamic" && GLOB_SIMPLE_RE.test(t.text) ? /^[^\\*?[]*/.exec(t.text)[0] : "";
  return [n === "" ? "-" : n];
}
//@ chunk-63f0f3kd.js:56734-56795 placement
/**
 * 判断词的前缀片段里是否含以 - 开头的部分（可能被当成选项）。
 */
function hasOptionPrefix(node, e) {
  return collectWordPrefixes(node, e).some((i) => i.startsWith("-"));
}
//@ chunk-63f0f3kd.js:56795-56850 placement
/**
 * 判断词前缀里除 -n/-N 之外是否还有其他字符。
 */
function hasNonFlagPrefix(node, e) {
  return /[^-nN]/.test(collectWordPrefixes(node, e).join(""));
}
//@ chunk-63f0f3kd.js:56850-57031 placement
/**
 * 判断语法节点是否含展开或命令替换（含 $@/$* 与数组下标）。
 */
function hasExpansion(node) {
  return (
    /expansion|substitution/.test(node.type) ||
    /\$\{?[@*]|\[[@*]\]/.test(node.text) ||
    (node.type === "concatenation" &&
      node.children.some((child) => /expansion|substitution/.test(child.type)))
  );
}
//@ chunk-63f0f3kd.js:57031-57122 placement
/**
 * 判断词值是否无法验证（在 bot_protected_tengu_hushed_hyphen 开关下整数动态值也算）。
 */
function isRefusedValue(t) {
  let { value: e } = t;
  return (
    isUnverifiableValue(t) ||
    (e.kind === "dynamic" &&
      e.integer &&
      readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
        safe: true,
      }))
  );
}
//@ chunk-63f0f3kd.js:57122-57305 placement
/**
 * 判断节点是否为不含展开的引号字面量（或其拼接）。
 */
function isQuotedLiteral(node, e = /^string$/) {
  return (
    !hasExpansion(node) &&
    !node.text.includes("${!") &&
    (e.test(node.type) ||
      (node.type === "concatenation" &&
        node.children.every(
          (child) => e.test(child.type) || (child.type === "word" && PLAIN_TEXT_RE.test(child.text)),
        )))
  );
}
//@ chunk-63f0f3kd.js:57305-57346 placement
var BOT_PROTECTED_TENGU_SOFT_ISLAND = "bot_protected_tengu_soft_island";
//@ chunk-63f0f3kd.js:57346-57383 placement
/**
 * 读取 bot_protected_tengu_soft_island 开关：动态值一律按不可验证处理。
 */
function isStrictDynamicValuesEnabled() {
  return readFlagWithOverride(BOT_PROTECTED_TENGU_SOFT_ISLAND, {
    safe: true,
  });
}
//@ chunk-63f0f3kd.js:57383-57455 placement
/**
 * 匹配数组引用展开；cs 匹配 ${#a[@]} 长度写法，求值前先替换成 0。
 */
var ARRAY_REF_RE = /\$\{?@|\[@\]|\$\{![A-Za-z_]\w*@/;
var ARRAY_LENGTH_RE = /\$\{#[A-Za-z_]\w*\[@\]\}/g;
//@ chunk-63f0f3kd.js:57455-57682 placement
/**
 * 判断单词节点在静态分析下是否确定（算术展开、少数特殊变量与不含通配的拼接视为确定）。
 */
function isStaticWord(node) {
  if (!isStrictDynamicValuesEnabled()) return !hasExpansion(node);
  switch (node.type) {
    case "arithmetic_expansion":
      return true;
    case "simple_expansion":
      return /^\$[?#$]$/.test(node.text);
    case "concatenation":
      return node.children.every(isStaticWordPart) && !isBraceExpansionNode(node) && !isBracketGlobNode(node);
    default:
      return isStaticWordPart(node);
  }
}
//@ chunk-63f0f3kd.js:57682-57907 placement
function isStaticWordPart(t) {
  switch (t.type) {
    case "word":
    case "number":
      return !GLOB_WITH_ESCAPE_RE.test(t.text);
    case "raw_string":
    case "ansi_c_string":
    case "$":
      return true;
    case "string":
    case "translated_string":
      return !ARRAY_REF_RE.test(t.text.replace(ARRAY_LENGTH_RE, "0"));
    default:
      return false;
  }
}
//@ chunk-63f0f3kd.js:57907-57980 placement
/**
 * 判断值不含“动态多值”，且单词本身是静态的。
 */
function isFullyStaticValue({ node, value: e }) {
  return !(e.kind === "dynamic" && e.many) && isStaticWord(node);
}
//@ chunk-63f0f3kd.js:57980-58369 placement
/**
 * 在 argv 中查找 sh/bash 的 -c 命令字符串参数下标（解析组合短选项与 -o 参数）；不是 shell 或没有 -c 返回 -1。
 */
function findShellCommandStringIndex(t, e) {
  if (!POSIX_SHELL_NAMES.has(programBaseName(t[e] ?? "-"))) return -1;
  let i = false;
  for (let idx = e + 1; idx < t.length; idx++) {
    let r = t[idx];
    if (typeof r !== "string") return -1;
    let match = /^[-+](?=.)[bcefhlmnptuvxBCEHP]*(o?)$/.exec(r);
    if (match && (!match[1] || typeof t[idx + 1] === "string")) {
      if (match[1] && !isSafeShellOption(t[idx + 1] ?? "")) return -1;
      i ||= r.includes("c");
      idx += match[1] ? 1 : 0;
    } else {
      let a = r === "--" ? idx + 1 : idx;
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
  let r = getParserModule()?.parse(e) ?? null;
  let s = r ? parseForSecurityFromAst(e, r) : null;
  if (!r || !s || (s.kind !== "simple" && isParseFailureNode(s)))
    return unverifiableRunReason(t, `with shell text it cannot parse (${shortenForReason(e)})`);
  let a = {
    simple: false,
    kinds: new Map([...i.kinds.keys()].map((key) => [key, "other"])),
    integerNames: new Set(),
    arrayNames: new Set(),
    bindingSites: new Map(),
    optionSafeNames: new Map(),
    pathNames: new Set(),
    opaqueNames: true,
    shellFilledWord: null,
    shellSetNameWord: null,
    statPathDenied: false,
    dateDirectiveDenied: false,
    pathAssigned: i.pathAssigned,
    startupHazards: new Map(i.startupHazards),
    allExported: i.allExported,
    stdinFed: false,
    pipedFrom: undefined,
    inputAssembled: n || i.inputAssembled,
    cwd: i.cwd,
    opaqueCwd: i.opaqueCwd,
    deviceLinked: i.deviceLinked,
    scopes: [new Map()],
    depth: i.depth + 1,
  };
  analyzeAssignment(r, a, false);
  let o = withStdinState(r, a, n);
  i.statPathDenied ||= a.statPathDenied;
  i.dateDirectiveDenied ||= a.dateDirectiveDenied;
  return o === null ? null : `hands ${t} the text ${shortenForReason(e)}, which ${o}`;
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
var SED_COMMAND_PARTS_RE = /^[\s="']*(\w*)["']?[\s=]*(.*)$/s;
var SSH_OPTION_RE = /^-[46AaCfGgKkMNnqsTtVvXxYy]*(?:([BbcDEeFIiJLlmOoPpQRSWw])(.*))?$/s;
//@ chunk-63f0f3kd.js:59822-61454 placement
function analyzeSshArgs(t, e, i, n) {
  let mapped = t.map((c) => (c.value.kind === "literal" ? c.value.text : null));
  let s = i;
  let a = false;
  let commandAt = -1;
  let u = [];
  let l = [];
  for (let c = e; c < t.length; c++) {
    let f = mapped[c] ?? null;
    let h = f === "--" && !s ? c + 1 : c;
    if (
      h + 1 < t.length &&
      (!s || (mapped[h + 1] ?? "-").startsWith("-") || mayExpandToNothing(t[h + 1].node)) &&
      mayExpandToNothing(t[h].node)
    )
      return {
        detail: unverifiableRunReason("ssh", `with ${emptyExpansionReason(t[h])}`),
      };
    if (f !== "--" && f?.[0] === "-" && mayExpandToNothing(t[c].node))
      return {
        detail: unverifiableRunReason(
          "ssh",
          `with ${shortenForReason(t[c].node.text)}, a pattern that may expand to file names ssh reads as options (quote it)`,
        ),
      };
    let b = f === null ? !isRefusedValue(t[c]) : f[0] !== "-";
    if (f === "--" || b) {
      let T = f === "--" ? c + 1 : c;
      if (!s && T < t.length) {
        s = true;
        a ||= mapped[T] === null || isRemoteSshHost(mapped[T] ?? "");
        u.push(mapped[T] ?? "");
        if (f !== "--") continue;
        T++;
      }
      commandAt = T < t.length ? T : -1;
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
    let m = p
      ? {
          kind: "literal",
          text: p,
        }
      : t[++c]?.value;
    if (!m || m.kind === "refuse")
      return {
        detail: m ? m.detail : unverifiableRunReason("ssh", `with ${f}`),
      };
    if (m.kind === "dynamic") {
      if (/[oFSOJI]/.test(S))
        return {
          detail: unverifiableRunReason("ssh", `with -${S} ${describeWordValue(m)}`),
        };
      if (isStrictDynamicValuesEnabled() && !isFullyStaticValue(t[c]))
        return {
          detail: unverifiableRunReason("ssh", `with ${dynamicArgumentReason("ssh", `-${S}`, t[c])}`),
        };
      if (S === "l") u.push("");
      continue;
    }
    let [, _ = "", x = ""] = S === "o" ? (SED_COMMAND_PARTS_RE.exec(m.text) ?? []) : ["", S, m.text];
    a ||= /^hostname$/i.test(_) && isRemoteSshHost(x.trim());
    if (/^(?:hostname|user)$/i.test(_) || _ === "l") u.push(x.trim());
    if (/command$/i.test(_)) l.push([_, x]);
    else if (
      _ === "" ||
      (/[oFSI]/.test(S) && isDevicePath(x)) ||
      (S === "F" && n.inputAssembled && isOpaquePathArgument(x, n))
    )
      return {
        detail: unverifiableRunReason("ssh", `with -${S} ${shortenForReason(m.text)}`),
      };
  }
  let d = u.length > 0 && !u.includes("") ? u.flatMap((c) => c.split("@")) : ["$9"];
  for (let [c, f] of l)
    for (let h of d) {
      let b = analyzeNestedShellText(`ssh -o ${c}`, f.replace(/%[a-z]/gi, h), n, false);
      if (b !== null)
        return {
          detail: b,
        };
    }
  return {
    commandAt,
    local: a,
  };
}
//@ chunk-63f0f3kd.js:61454-62302 placement
/**
 * gcloud 通用选项；Gi 是输出相关选项；Mi/zi 是 kubectl 通用与压缩选项，Hi/Ui 是带凭据/秘密值的选项正则。用于判定云命令参数是否影响目标。
 */
var BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN = "bot_protected_tengu_buzzing_fountain";
var GCLOUD_COMMON_FLAGS = wordSet(
  "--access-token-file --account --authority-selector --authorization-token-file --billing-project --configuration --flatten --format --http-timeout --impersonate-service-account --project --trace-token --universe-domain --verbosity",
);
var GCLOUD_OUTPUT_FLAGS = wordSet(
  "-q --quiet --log-http --no-log-http --user-output-enabled --no-user-output-enabled",
);
var KUBECTL_GLOBAL_FLAGS = wordSet(
  "--as --as-group --as-uid --as-user-extra --cluster --context -n --namespace --request-timeout --user",
);
var KUBECTL_COMPRESSION_FLAGS = wordSet("--disable-compression --match-server-version --warnings-as-errors");
var KUBECTL_CREDENTIAL_RE = /^--credential-file-override(?:=|$)/;
var KUBECTL_VALUE_FLAGS_RE =
  /^(?:-[itq]*s|--(?:cache[-_]dir|certificate[-_]authority|client[-_]certificate|client[-_]key|insecure[-_]skip[-_]tls[-_]verify|kubeconfig|kuberc|password|profile|profile[-_]output|proxy[-_]url|server|tls[-_]server[-_]name|token|username)(?:=|$))/;
//@ chunk-63f0f3kd.js:62302-62535 placement
function hasRiskyOptionWord(t, e, i, n) {
  let index = e.indexOf("--", i);
  return t
    .slice(i, index === -1 ? undefined : index)
    .some(
      ({ node }, a) =>
        hasChildWordGlob(node) ||
        [node, ...node.children].some((o) => o.type === "brace_expression") ||
        n.test(e[i + a] ?? (/^[$'"\\]*-/.test(node.text) ? node.text.replace(SHELL_QUOTE_CHARS_RE, "") : "")),
    );
}
//@ chunk-63f0f3kd.js:62535-62892 placement
/**
 * 拼出命令的程序词序列（跳过带值选项及其参数、忽略的词），到目标词为止；值缺失或可疑时返回空串。
 */
function collectProgramWords(t, e, i, n, r) {
  let s = [];
  for (let idx = 0; idx < t.length; idx++) {
    let { node, value: u } = t[idx];
    let l = u.kind === "literal" ? u.text : isQuotedLiteral(node) ? node.text : "-";
    let replaced = l.replace(/=.*$/s, "");
    if (i.has(replaced)) {
      if (replaced === l) {
        idx++;
        let c = t[idx];
        if (
          !c ||
          (c.value.kind === "literal"
            ? c.value.text.startsWith("-") || mayExpandToNothing(c.node)
            : !r || !isQuotedLiteral(c.node))
        )
          return "";
      }
    } else if (!n.has(l)) {
      s.push(l);
      if (l === e) break;
    }
  }
  return s.join(" ");
}
//@ chunk-63f0f3kd.js:62892-67460 placement
/**
 * 检查 ssh/rlogin/kubectl 等"在别处执行命令"的程序：目标可能是本机或参数无法静态判定时拒绝。
 */
function analyzeRemoteShellCommand(t, e, i, n) {
  let mapped = e.map((s) => (s.value.kind === "literal" ? s.value.text : null));
  switch (t) {
    case "rlogin":
    case "ssh": {
      let s = analyzeSshArgs(e, 0, false, i);
      if ("detail" in s) return s.detail;
      if (!s.local) return null;
      if (s.commandAt === -1)
        return n.fed
          ? unverifiableRunReason(
              "ssh",
              "with a shell on what may be this machine reading its commands from stdin",
            )
          : null;
      let sliced = mapped.slice(s.commandAt);
      let found = e.slice(s.commandAt).find((u) => u.value.kind !== "literal");
      return found
        ? unverifiableRunReason(
            "ssh",
            `with a command for what may be this machine computed at runtime (${describeWordValue(found.value)})`,
          )
        : analyzeNestedShellText("ssh", sliced.join(" "), i, n.fed);
    }
    case "kubectl":
    case "oc": {
      let index = mapped.indexOf("exec");
      let index_2 = mapped.indexOf("--");
      if (index === -1 || index_2 < index) return;
      let o =
        !readFlagWithOverride(BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN, {
          safe: true,
        }) ||
        (collectProgramWords(e, "exec", KUBECTL_GLOBAL_FLAGS, KUBECTL_COMPRESSION_FLAGS, true) === "exec" &&
          !hasRiskyOptionWord(e, mapped, index + 1, KUBECTL_VALUE_FLAGS_RE));
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
        return o ? b : (b ?? undefined);
      }
      let sliced_2 = mapped.slice(index_2 + 1);
      let index_3 = sliced_2.findIndex((b) => SHELL_PROGRAM_NAMES.has(programBaseName(b ?? "-")));
      let shellCommandStringIndex = findShellCommandStringIndex(sliced_2, index_3);
      let found = sliced.find(
        (b, g) =>
          (shellCommandStringIndex === -1 || g < index_3 || g > shellCommandStringIndex) &&
          !isPlainOrInertValue(b.value),
      );
      let h = found
        ? unverifiableRunReason(`${t} exec`, `with ${describeWordValue(found.value)}`)
        : n.fed && n.assembled
          ? unverifiableRunReason(`${t} exec`, "with input assembled at runtime")
          : shellCommandStringIndex === -1
            ? null
            : analyzeNestedShellText(
                programBaseName(sliced_2[index_3]),
                sliced_2[shellCommandStringIndex],
                i,
                n.fed,
              );
      return o ? h : (h ?? undefined);
    }
    case "gcloud": {
      let index = mapped.indexOf("ssh");
      let flagWithOverride = readFlagWithOverride(BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN, {
        safe: true,
      });
      let index_2 = mapped
        .slice(0, index)
        .findIndex(
          (p, m) =>
            p !== null &&
            !/^(?:alpha|beta|compute|-.*)$/.test(p) &&
            !/^--[^=]+$/.test(mapped[m - 1] ?? "") &&
            !mayExpandToNothing(e[m].node),
        );
      let u = index > 0 && mapped.slice(0, index).includes("compute");
      let l = !u || index_2 >= 0;
      let d =
        u &&
        e
          .slice(0, index_2 < 0 ? index : index_2)
          .find(({ node }) => mayExpandToNothing(node) && !/^--?[\w-]+=[^*?[]*$/.test(node.text));
      if (d)
        return unverifiableRunReason(
          "gcloud",
          `with ${describeWordValue(d.value)} before the word ssh: it may expand to no word at all and the next word would take its place, so this cannot tell what gcloud will run (spell the value out)`,
        );
      let included = mapped.slice(0, index).includes(null);
      let flagWithOverride_2 = readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
        safe: true,
      });
      if (l || included) {
        let matching = findMatching(mapped, /^--(?:ssh-flag|scp-flag|flags-file)/);
        if (matching !== null) return unverifiableRunReason("gcloud", `with ${matching}`);
        let index_2 = mapped.indexOf("compute");
        let _ = mapped[index - 1];
        let x =
          flagWithOverride &&
          index > 0 &&
          (_ === null || _?.startsWith("-")) &&
          index < index_2 &&
          mapped.includes("ssh", index_2)
            ? unverifiableRunReason(
                "gcloud",
                GCLOUD_COMMON_FLAGS.has(_ ?? "")
                  ? `with ssh as the separate value of ${_} before compute (write ${_}=ssh instead)`
                  : "with ssh both before and after compute, where either could be the subcommand (join a flag's value to it with =, or drop the extra ssh)",
              )
            : undefined;
        if (!flagWithOverride_2) return x;
        if (l) {
          let T = index < 0 ? -1 : mapped.indexOf("--", index);
          if (T < 0) return x;
          let G = analyzeSshArgs(e, T + 1, true, i);
          return "detail" in G
            ? G.detail
            : G.local
              ? unverifiableRunReason("gcloud", "with ssh pointed at what may be this machine")
              : x;
        }
      }
      let h =
        !flagWithOverride ||
        (/^(?:(?:alpha|beta) )?compute ssh$/.test(
          collectProgramWords(e, "ssh", GCLOUD_COMMON_FLAGS, GCLOUD_OUTPUT_FLAGS, false),
        ) &&
          !hasRiskyOptionWord(e, mapped, index + 1, KUBECTL_CREDENTIAL_RE));
      let b = [];
      let g = 1 / 0;
      for (let idx = 0; idx < e.length; idx++) {
        let m = mapped[idx] ?? null;
        if (flagWithOverride && (idx <= index ? /^--(?:scp|ssh)-flag/ : /^--scp-flag/).test(m ?? ""))
          return unverifiableRunReason(
            "gcloud",
            `with ${shortenForReason(m ?? "")} (${/^--scp/.test(m ?? "") ? "--scp-flag hands options to scp, which can run a local program; drop it" : "put --ssh-flag after the word ssh"})`,
          );
        if (idx <= index) {
          if (/^--flags-file/.test(m ?? "") || isDevicePath(m ?? ""))
            return unverifiableRunReason("gcloud compute ssh", `with ${m}`);
          if (flagWithOverride_2 && /^--(?:ssh|scp)-flag/.test(m ?? ""))
            return unverifiableRunReason("gcloud", `with ${shortenForReason(m ?? "")} before ssh`);
          if (
            flagWithOverride_2 &&
            m === null &&
            isUnverifiableValue(e[idx]) &&
            !/^--(?!flags-file|ssh-flag|scp-flag)[\w-]+=$/.test(e[idx].node.children[0]?.text ?? "")
          )
            return unverifiableRunReason(
              "gcloud",
              `with ${describeWordValue(e[idx].value)} before ssh, which may be a flag of its own (spell it out)`,
            );
          continue;
        }
        if (m === "--") {
          g = b.length;
          b.push(...e.slice(idx + 1));
          break;
        }
        if (m === null) {
          let T = e[idx];
          if (
            isUnverifiableValue(T) &&
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
            readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
              safe: true,
            })
          )
            return unverifiableRunReason(
              "gcloud compute ssh",
              `with ${shortenForReason(m)} before any -- (gcloud takes only its own flags there; words meant for ssh go after a literal --)`,
            );
          continue;
        }
        let x = match[2] ?? mapped[++idx];
        if (match[1] !== "ssh-flag") continue;
        if (typeof x !== "string")
          return unverifiableRunReason(
            "gcloud compute ssh",
            `with --ssh-flag ${x === null ? describeWordValue(e[idx].value) : "lacking its value"}`,
          );
        for (let text of x.trim().split(/\s+/))
          b.push({
            node: e[idx].node,
            value: {
              kind: "literal",
              text,
            },
          });
      }
      let S = analyzeSshArgs(b, 0, true, i);
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
              ? undefined
              : null;
    }
    default:
      return;
  }
}
//@ chunk-63f0f3kd.js:67460-67514 placement
var TENGU_COMPOSED_TEACUP = "tengu_composed_teacup";
var TENGU_WOOLLY_WALL = "tengu_woolly_wall";
//@ chunk-63f0f3kd.js:67514-68621 placement
function analyzeRsyncScp(t, e, i) {
  let mapped = e.map((l) => (l.value.kind === "literal" ? l.value.text : null));
  let r =
    t === "rsync"
      ? readFlagWithOverride(TENGU_COMPOSED_TEACUP, {
          safe: true,
        })
        ? /^(?:-[^-]*?(e)|--(?:rsh|rsync-path)(?==|$))=?(.*)$/s
        : /^(?:-[^-]*(e)|--(?:rsh|rsync-path)(?==|$))=?(.*)$/s
      : /^(?:scp|rcp|sftp)$/.test(t)
        ? /^-[^-]*?([oSD])(.*)$/s
        : null;
  if (!r) return null;
  let flattened = mapped.flatMap((l) => (l !== null && /^[^-/][^:/]*:/.test(l) ? [l] : []));
  let found = flattened.find((l) => /[^\w.,:\/@~+=-]/.test(l) && isRemoteSshHost(l.replace(/:.*$/s, "")));
  if (found !== undefined) return unverifiableRunReason(t, `with ${shortenForReason(found)}`);
  let o =
    flattened.length > 0 && mapped.every((l) => !/^(?:-\w*o)?\W*(?:hostname|user)/i.test(l ?? "user"))
      ? flattened.flatMap((l) => l.replace(/:.*$/s, "").split("@"))
      : ["$9"];
  let flagWithOverride = readFlagWithOverride(TENGU_WOOLLY_WALL, {
    safe: true,
  });
  for (let idx = 0; idx < mapped.length; idx++) {
    if (mapped[idx] === null) {
      if (flagWithOverride && isUnverifiableValue(e[idx]))
        return unverifiableRunReason(
          t,
          `with ${describeWordValue(e[idx].value)} ${OPTION_POSITION_NOTE_LONG}`,
        );
      continue;
    }
    let match = r.exec(mapped[idx]);
    if (!match) continue;
    let c = match[2] || mapped[++idx];
    if (typeof c !== "string")
      return unverifiableRunReason(
        t,
        `with ${match[0]} ${c === null ? describeWordValue(e[idx].value) : "lacking its value"}`,
      );
    let [, f = "", h = ""] = match[1] === "o" ? (SED_COMMAND_PARTS_RE.exec(c) ?? []) : ["", "Command", c];
    for (let b of o) {
      let g = /command$/i.test(f)
        ? analyzeNestedShellText(`${t} ${match[0]}`, h.replace(/%[a-z]/gi, b), i, false)
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
/**
 * 判断词值是普通字面量（不含特殊字符），或不会展开的动态值。
 */
function isPlainOrInertValue(t) {
  return t.kind === "literal" ? isPlainWordText(t.text) : t.kind === "dynamic" && t.inert;
}
//@ chunk-63f0f3kd.js:68852-68939 placement
/**
 * 除指定下标外，是否还有其他动态且非 inert 的单词。
 */
function hasOtherDynamicWord(words, e) {
  return words.some((i, n) => n !== e && i.value.kind === "dynamic" && !i.value.inert);
}
//@ chunk-63f0f3kd.js:68939-69356 placement
/**
 * 某个可能展开为空的单词导致无法判定时，去掉它重新检查；超过 16 个这类单词直接判为无法验证，并在原因中提示加引号或写明文件。
 */
function retryWithoutEmptyWord(index, program, rules, words, state, context) {
  let a = words[index];
  if (!a || !mayExpandToNothing(a.node)) return null;
  if (count(words, (u) => mayExpandToNothing(u.node)) > 16)
    return unverifiableRunReason(
      program,
      "with more than 16 words that may expand to no word at all (name the files, or quote the words)",
    );
  let o = checkInterpreterInvocation(program, rules, words.toSpliced(index, 1), state, {
    ...context,
    prefixValues: [...context.prefixValues, a.value],
  });
  return o === null
    ? null
    : `${o}, since ${shortenForReason(a.node.text)} may expand to no word at all (quote it, or name the files instead of a pattern)`;
}
//@ chunk-63f0f3kd.js:69356-73556 placement
/**
 * 后台 worktree 守卫：分析解释器调用（python/node/perl 等）能否证明不会运行 git——检查启动相关环境变量、内联代码与模块、选项、脚本操作数及运行时计算的输入，无法证明时返回原因。
 */
function checkInterpreterInvocation(program, rules, words, state, context) {
  let literals = words.map((word) => (word.value.kind === "literal" ? word.value.text : null));
  let a = state.stdinFed || context.redirects.some(isStdinRedirect);
  let inputAssembled = state.inputAssembled;
  let u = inputAssembled || context.prefixValues.some((prefixValue) => !isPlainOrInertValue(prefixValue));
  let filtered = [...state.startupHazards].filter(([x]) => rules.environment.test(x));
  let found = filtered.find(([, x]) => x);
  if (found || (filtered.length > 0 && (u || hasOtherDynamicWord(words, -1))))
    return unverifiableRunReason(
      program,
      found
        ? `after ${found[0]} is set here to a value that configures what it loads or runs at startup`
        : `after ${filtered[0][0]} is set here, next to an operand or input computed at runtime`,
    );
  if (
    inputAssembled &&
    literals.some((literal) => literal !== null && literal.split(/\s+/).some(isDevicePath))
  )
    return `feeds ${program} a descriptor it names ${TOO_COMPLEX_SUFFIX}, whose content is assembled at runtime and may be read as a program`;
  let c =
    (rules.flag.test("-0") || rules.flag.test("-3")) &&
    readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
      safe: true,
    });
  let joined = context.redirects.map((redirect) => redirect.text).join(`
`);
  let any = [
    ...literals,
    ...context.prefixValues.map((prefixValue) => (prefixValue.kind === "literal" ? prefixValue.text : null)),
    joined,
  ].some((x) => !!x && mentionsGit(x));
  let inlineProgram;
  let g = new Set();
  let S = false;
  let index = 0;
  while (index < words.length) {
    let x = literals[index] ?? null;
    let T = x === null ? null : rules.inline.exec(x);
    if (inlineProgram !== undefined && x === "--") break;
    if (T) {
      S ||= !rules.flag.test("-0") || /^-[anplsw]*[eE]/.test(x ?? "");
      let last = T.slice(1).findLast((O) => !!O);
      let z = last === undefined ? index + 1 : -1;
      let R =
        last !== undefined
          ? {
              kind: "literal",
              text: last,
            }
          : (words[z]?.value ?? {
              kind: "literal",
              text: "",
            });
      if (R.kind === "refuse") return R.detail;
      if (R.kind === "dynamic")
        return !R.inert
          ? unverifiableRunReason(program, `with a program computed at runtime (${R.why})`)
          : u || hasOtherDynamicWord(words, z)
            ? unverifiableRunReason(
                program,
                "with a program pieced together here next to an operand or input computed at runtime",
              )
            : retryWithoutEmptyWord(z, program, rules, words, state, context);
      inlineProgram = `${inlineProgram ?? ""}
${R.text}`;
      g.add(last === undefined ? z : index);
      index += last === undefined ? 2 : 1;
      if (!rules.inlineEndsOptions) continue;
      break;
    }
    if (program === "bun" && x === "exec")
      return index === 0 && typeof literals[1] === "string" && words.length === 2
        ? analyzeNestedShellText("bun exec", literals[1], state, a)
        : unverifiableRunReason("bun exec", "with shell text it cannot read");
    if (x !== null && rules.module.test(x)) {
      let y = literals[index + 1];
      let any_2 = literals.some((literal, Y) => Y !== index && literal?.[0] === "-");
      let R =
        /^(?:pip|pipx|ensurepip|easy_install)$/.test(y ?? "") &&
        words.slice(index + 2).find((word) => word.value.kind !== "literal");
      return y === null
        ? unverifiableRunReason(program, `with ${x} ${describeWordValue(words[index + 1].value)}`)
        : (DEBUGGER_MODULES_RE.test(y ?? "") && (u || hasOtherDynamicWord(words, -1))) ||
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
        ? isUnverifiableValue(words[index]) ||
          (c &&
            isRefusedValue(words[index]) &&
            ((a && !S) ||
              words
                .slice(index + 1)
                .some((word) =>
                  word.value.kind === "literal" ? word.value.text.startsWith("-") : isUnverifiableValue(word),
                )))
        : /^-[^-]|^--./.test(x) && !rules.valued.test(x) && !rules.flag.test(x)
    )
      return u || hasOtherDynamicWord(words, -1) || (x === null && !isUnverifiableValue(words[index]))
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
    if (
      /^-(?:-interactive\b|[A-Za-z0-9]*r ?(?:irb|debug|pry|byebug)\b)/.test(N) &&
      (u || hasOtherDynamicWord(words, -1))
    )
      return unverifiableRunReason(
        program,
        `with ${N.trim()}, a console that reads its program from input or operands computed at runtime`,
      );
    if (D || (x !== null && rules.flag.test(x))) {
      let match = /(?:^|=)(data:.*)$/is.exec(D ? literals[index + 1] : x);
      inlineProgram = match
        ? `${inlineProgram ?? ""}
${match[1]}`
        : inlineProgram;
      index += D ? 2 : 1;
    } else {
      index += x !== "--" ? 0 : rules.scriptAfterDashes ? 1 : words.length;
      break;
    }
  }
  let m = retryWithoutEmptyWord(index, program, rules, words, state, context);
  if (m !== null) return m;
  let _ = index < words.length ? (literals[index] ?? null) : undefined;
  if (inlineProgram === undefined && _ !== undefined) {
    if (_ === null)
      return inputAssembled || rules.literalScript
        ? unverifiableRunReason(
            program,
            `with a script computed at runtime (${describeWordValue(words[index].value)})`,
          )
        : null;
    if (/^(?:data|https?|npm|jsr):/i.test(_)) {
      inlineProgram = _;
      g.add(index);
    } else if (rules.console.test(_))
      return u || hasOtherDynamicWord(words, -1)
        ? unverifiableRunReason(
            program,
            `with ${_}, a console that reads its program from input or operands computed at runtime`,
          )
        : null;
    else if (!isOpaquePathArgument(_, state)) return null;
  }
  if (inlineProgram !== undefined) {
    if (any || mentionsGit(inlineProgram)) return GIT_TOO_COMPLEX_REASON;
    let match = rules.bridge.exec(inlineProgram);
    return match && (u || words.some((word, G) => !g.has(G) && !isPlainOrInertValue(word.value)))
      ? unverifiableRunReason(
          program,
          `with a program that can start another program (${match[0]}) next to an operand, env value or input that is computed at runtime or not plain text`,
        )
      : null;
  }
  if (inputAssembled)
    return `feeds ${program} a program assembled at runtime ${TOO_COMPLEX_SUFFIX}, so what it runs cannot be shown not to be git`;
  if (any) return GIT_TOO_COMPLEX_REASON;
  return rules.bridge.test(joined) && (u || hasOtherDynamicWord(words, -1))
    ? unverifiableRunReason(
        program,
        "with a program on a descriptor that can start another program, next to an operand computed at runtime",
      )
    : null;
}
//@ chunk-63f0f3kd.js:73556-74189 placement
/**
 * find 中只影响匹配的路径谓词。
 */
var FIND_PREDICATE_PATTERN =
  /^(?:-(?:i?name|i?path|i?wholename|i?regex|i?lname|x?type|size|empty|(?:max|min)?depth|[amc](?:time|min)|newer(?:[aBcmt][aBcmt])?|user|group|[ug]id|perm|links|inum|samefile|readable|writable|executable|no(?:user|group)|prune|print0|not|and|or|a|o|true|false|xdev|mount|[LHPE]|regextype|daystart|follow)|[-+]?\d+[bcwkMG]?)$/;
var FIND_PATH_PREDICATE_RE =
  /^-(?:i?name|i?path|i?wholename|i?regex|i?lname|x?type|size|(?:max|min)depth|[amc](?:time|min)|newer(?:[aBcmt][aBcmt])?|user|group|[ug]id|perm|links|inum|samefile|fstype|regextype)$/;
var FIND_SIDE_EFFECT_PREDICATE_RE =
  /^-(?:[acm]newer|B(?:min|newer|time)|context|used|flags|xattrname|files0-from|D|printf|fprintf|fprint0?|fls|f)$/;
//@ chunk-63f0f3kd.js:74189-74717 placement
/**
 * 判断语句是否为只用安全谓词、带 -print0 的 find 命令（允许文件重定向）。
 */
function isSafeFindPrint0(t, state) {
  let i = t?.type === "redirected_statement" ? t.children.find((child) => child.type === "command") : t;
  if (
    i?.type !== "command" ||
    i.children[0]?.type !== "command_name" ||
    programBaseName(i.children[0].text) !== "find"
  )
    return false;
  let n = false;
  let r = "";
  return (
    i.children.slice(1).every((child, o) => {
      if (!WORD_NODE_TYPES.has(child.type)) return child.type === "file_redirect";
      let u = evaluateWord(child, state, true);
      let l = r;
      r = u.kind === "literal" ? u.text : "";
      if (u.kind !== "literal")
        return (
          FIND_PATH_PREDICATE_RE.test(l) ||
          (o === 0 &&
            !isUnverifiableValue({
              node: child,
              value: u,
            }))
        );
      n ||= u.text === "-print0";
      return /^[^-(),!]/.test(u.text) || /^[(),!]$/.test(u.text) || FIND_PREDICATE_PATTERN.test(u.text);
    }) && n
  );
}
//@ chunk-63f0f3kd.js:74717-80297 placement
/**
 * 分析一个简单命令：环境赋值前缀、命令名、参数求值；按程序分派到 git/ssh/rsync/find/xargs/sudo/printf 等专用规则。
 */
function analyzeCommand(t, state, i) {
  let stdinFed = state.stdinFed;
  let r;
  let s = [];
  let a = [];
  let o = [...i];
  let lastIndex = t.children.findLastIndex(
    (child) => child.type === "variable_assignment" && containsSubstitution(child),
  );
  for (let [E, A] of t.children.entries()) {
    let L = null;
    if (A.type === "command_name") {
      r = A.children.length === 1 ? A.children[0] : undefined;
      L = r ? null : tooComplexReason("a command name it cannot read");
    } else if (A.type === "variable_assignment" && !r) {
      let U = programBaseName(t.children.find((child) => child.type === "command_name")?.text ?? ":");
      let ut = KNOWN_PROGRAMS.has(U) && !POSIX_SPECIAL_BUILTINS_NONEVAL.has(U);
      let bt = E < lastIndex;
      L = analyzeVariableAssignment(A, state, undefined, ut, STRING_EXEC_COMMANDS.has(U) || bt, bt);
      a.push(
        A.children[2]
          ? evaluateWord(A.children[2], state, false)
          : {
              kind: "literal",
              text: "",
            },
      );
    } else if (REDIRECT_NODE_TYPES.has(A.type)) {
      let U = [];
      L =
        analyzeHeredocRedirect(A, state, U) ??
        (U.length > 0 ? tooComplexReason("a pipeline nested in a redirect") : null);
      o.push(A);
    } else if (r && WORD_NODE_TYPES.has(A.type))
      s.push({
        node: A,
        value: evaluateWord(A, state, true),
      });
    else if (r && A.type === "ERROR" && /^[=!]?=$/.test(A.text))
      s.push({
        node: A,
        value: {
          kind: "literal",
          text: "=",
        },
      });
    else
      L = tooComplexReason(
        A.type === "ERROR" ? "syntax the parser could not recover" : `a ${A.type} in a command`,
      );
    if (L !== null) return L;
  }
  if (!r) return null;
  let l = evaluateWord(r, state, true);
  if (l.kind === "refuse") return l.detail;
  let d = state.simple && l.kind === "dynamic" ? /\/([^/$`'"\\{}*?[\]]+)"?$/.exec(r.text)?.[1] : undefined;
  let [, , c, f] = SINGLE_VAR_REF_RE.exec(r.text) ?? [];
  let h = c ?? f ?? "";
  let b = state.scopes.findLast((scope) => scope.has(h))?.get(h);
  if (d)
    l = {
      kind: "literal",
      text: d,
    };
  else if (b !== undefined) {
    let E = programBaseName(b);
    if (
      KNOWN_PROGRAMS.has(E) ||
      ARG_SENSITIVE_COMMANDS.has(E) ||
      TRANSPARENT_LAUNCHERS.has(E) ||
      /^(?:chdir|popd|link|mkfifo|mknod)$/.test(E)
    )
      return `runs ${E} through the variable ${h} ${TOO_COMPLEX_SUFFIX}; spell it out`;
    l = {
      kind: "literal",
      text: b,
    };
  }
  if ((!isStaticNode(r) && !d && b === undefined) || l.kind !== "literal" || !SAFE_PATH_TOKEN_RE.test(l.text))
    return `runs a command whose name is computed at runtime ${TOO_COMPLEX_SUFFIX}, so it cannot be shown not to be git`;
  let g = [l.text];
  for (let [E, { node: A, value: L }] of s.entries()) {
    if (L.kind === "refuse") return L.detail;
    if (
      !state.simple &&
      L.kind === "literal" &&
      L.text.split(/\s+/).some((U) => GIT_COMMAND_PATTERN.test(basename(U)))
    )
      return GIT_TOO_COMPLEX_REASON;
    if (g.length === E + 1 && L.kind === "literal" && isStaticNode(A)) g.push(L.text);
  }
  let S = 0;
  while (TRANSPARENT_LAUNCHERS.has(programBaseName(g[S])) || (state.simple && EXEC_LIKE_COMMANDS.has(g[S]))) {
    let E = programBaseName(g[S]);
    let A = S + 1;
    if (E === "timeout" && /^\d+(?:\.\d+)?[smhd]?$/.test(g[A] ?? "-")) A++;
    let L = programBaseName(g.slice(A).find((bt) => !/^[A-Za-z_]\w*=/.test(bt)) ?? "");
    let U = KNOWN_PROGRAMS.has(L);
    let ut = STRING_EXEC_COMMANDS.has(L);
    while (/^(?:env|sudo)$/.test(E) && /^[A-Za-z_]\w*=/.test(g[A] ?? "-")) {
      let [bt = "", St = ""] = g[A].split(/=(.*)/s);
      let nn =
        (GIT_LOCATION_ENV_RE.test(bt) || !PLAIN_TEXT_RE.test(St)) && !state.simple
          ? unverifiableRunReason("env", `with ${shortenForReason(g[A])}`)
          : environmentAssignmentReason(
              bt,
              {
                kind: "literal",
                text: St,
              },
              St,
              U,
              ut,
            );
      if (nn !== null) return nn;
      a.push({
        kind: "literal",
        text: St,
      });
      A++;
    }
    if (/^-|=/.test(g[A] ?? "-")) break;
    S = A;
  }
  if (isDevicePath(g[S]))
    return `runs the program a descriptor holds (${g[S]}) ${TOO_COMPLEX_SUFFIX}, so it cannot be shown not to be git`;
  let program = programBaseName(g[S]);
  let words = s.slice(S);
  let mapped = words.map((E) => (E.value.kind === "literal" ? E.value.text : null));
  let x = stdinFed || o.some(isStdinRedirect);
  let inputAssembled = state.inputAssembled;
  if (state.simple && GIT_COMMAND_PATTERN.test(program)) return null;
  if (
    program === "integer" ||
    program === "float" ||
    (program === "private" && mapped.some((E) => E === null || /^[-+].*[iEF]/.test(E)))
  ) {
    let found = mapped
      .map((A) => describeIntegerTyping(/^[A-Za-z_]\w*/.exec(A ?? "")?.[0] ?? ""))
      .find((A) => A !== null);
    if (found !== undefined) return found;
  }
  let text = state.pipedFrom?.text ?? "";
  if (
    state.simple &&
    !KNOWN_PROGRAMS.has(program) &&
    mentionsGit(
      [
        KNOWN_PROGRAMS.has(text.split(/\s/)[0] ?? "") ? text : "",
        ...o.filter(isStdinRedirect).map((E) => E.text),
      ].join(`
`),
    )
  )
    return `feeds ${program} text naming git ${TOO_COMPLEX_SUFFIX}, which cannot be shown to stay inside the worktree`;
  if (state.simple && EVAL_LIKE_BUILTINS.has(program))
    return program === "exec" && words.length === 0 && inputAssembled
      ? unverifiableRunReason("exec", "redirecting this shell's descriptors to one it assembles")
      : EXEC_LIKE_COMMANDS.has(program)
        ? checkLauncherInvocation(program, words, state, {
            fed: x,
            assembled: inputAssembled,
          })
        : null;
  let D = [g[S], ...mapped];
  let N = !SHELL_PROGRAM_NAMES.has(program)
    ? -1
    : APPLET_SHELL_NAMES.has(program) && SHELL_PROGRAM_NAMES.has(programBaseName(mapped[0] ?? "-"))
      ? 1
      : 0;
  let shellCommandStringIndex = findShellCommandStringIndex(D, N);
  if (shellCommandStringIndex !== -1)
    return analyzeNestedShellText(programBaseName(D[N]), D[shellCommandStringIndex], state, x);
  if (state.simple && SHELL_PROGRAM_NAMES.has(program)) {
    let mapped_2 = mapped.map((U) => U?.toLowerCase() ?? "-");
    let sliced = mapped_2.slice(N);
    let L = sliced[0] === "-n" ? sliced[1] : sliced[0];
    return (x && (L === undefined || isOpaquePathArgument(L, state) || /^(?:su|runuser)$/.test(program))) ||
      (/^(?:cmd|powershell|pwsh)$/.test(program) && words.length > 0) ||
      /^[-+]/.test(L ?? "") ||
      isDevicePath(L ?? "") ||
      mapped_2.some((U) => SHELL_COMMAND_FLAG_PATTERN.test(U))
      ? describeGitRunner(program)
      : APPLET_SHELL_NAMES.has(program)
        ? checkLauncherInvocation(program, words, state, {
            fed: x,
            assembled: inputAssembled,
          })
        : program === "rsh"
          ? (analyzeRemoteShellCommand("ssh", words, state, {
              assembled: inputAssembled,
              fed: x,
            }) ?? null)
          : null;
  }
  let z = describeGitRunner(program);
  if (z !== null) return z;
  let R =
    !isStrictDynamicValuesEnabled() || mapped.length === 0
      ? null
      : program === "pushd" &&
          (mapped.includes("-n") ||
            words.some(
              (E, A) =>
                mapped[A] === null &&
                (isUnverifiableValue(E) ||
                  hasOptionPrefix(E.node, state) ||
                  isBracketGlobNode(E.node) ||
                  /^[?*[]/.test(E.node.text)) &&
                !(!hasExpansion(E.node) && hasNonFlagPrefix(E.node, state)) &&
                !(mapped.slice(0, A).includes("--") && !hasExpansion(E.node)),
            ))
        ? mapped.includes("-n")
          ? "-n (pushd then puts the directory on the stack without entering it, and a later ~1 stands for it; use pushd without -n, or cd)"
          : "a word that may come out as -n (pushd would then put the directory on the stack without entering it, and a later ~1 stands for it; write the directory out, or put it in double quotes after --)"
        : program === "dirs" && mapped.some((E) => E === null || !/^(?:-[clpv]+|[-+]\d+)$/.test(E))
          ? "a word that zsh puts on the directory stack without entering it (a later ~1 stands for it)"
          : null;
  if (R !== null) return unverifiableRunReason(program, `with ${R}`);
  if (program === "command" && /^-[vV]$/.test(mapped[0] ?? "")) return null;
  if (TRANSPARENT_LAUNCHERS.has(program) && words.length > 0 && !state.simple)
    return unverifiableRunReason(program, `with ${describeWordValue(words[0].value)}`);
  if (KNOWN_PROGRAMS.has(program))
    return checkBuiltinArguments(
      program,
      words,
      state,
      o.some(isStdinRedirect) ? undefined : state.pipedFrom,
    );
  let rules = INTERPRETER_RULES.get(program);
  if (rules)
    return checkInterpreterInvocation(program, rules, words, state, {
      redirects: o,
      prefixValues: a,
    });
  if (state.simple)
    return checkLauncherInvocation(program, words, state, {
      fed: x,
      assembled: inputAssembled,
    });
  let Y = checkSshpassInvocation(program, words, state, {
    assembled: inputAssembled,
    fed: x,
  });
  if (Y !== null) return Y;
  let st =
    analyzeRsyncScp(program, words, state) ??
    analyzeRemoteShellCommand(program, words, state, {
      assembled: inputAssembled,
      fed: x,
    });
  let index = mapped.findIndex((E) => SHELL_PROGRAM_NAMES.has(programBaseName(E ?? "-")));
  let shellCommandStringIndex_2 = findShellCommandStringIndex(mapped, index);
  for (let [E, A] of [...words.map((L) => L.value), ...a].entries())
    if (
      !(
        E < words.length &&
        (st !== undefined ||
          (shellCommandStringIndex_2 !== -1 && E >= index && E <= shellCommandStringIndex_2))
      ) &&
      !isPlainOrInertValue(A)
    )
      return A.kind === "refuse" ? A.detail : unverifiableRunReason(program, `with ${describeWordValue(A)}`);
  if (st !== undefined) return st;
  if (inputAssembled && mapped.some((E) => E !== null && E.split(/\s+/).some(isDevicePath)))
    return `feeds ${program} a descriptor it names ${TOO_COMPLEX_SUFFIX}, whose content is assembled at runtime and may be read as a program`;
  let filtered = o.filter(isStdinRedirect);
  if (
    filtered.length > 0 ? filtered.some((E) => analyzeRedirect(E, state)) : stdinFed && state.inputAssembled
  )
    return `feeds ${program} input assembled by the command ${TOO_COMPLEX_SUFFIX}; a program this guard does not know may run that input, so it cannot be shown not to run git`;
  return shellCommandStringIndex_2 === -1
    ? null
    : analyzeNestedShellText(programBaseName(mapped[index]), mapped[shellCommandStringIndex_2], state, x);
}
//@ chunk-63f0f3kd.js:80297-80390 placement
/**
 * 返回第一个非选项参数的下标（跳过 -p/-f/-d/-P 这类带值选项）。
 */
function findNonOptionWordIndex(t) {
  return t.findIndex((e, i) => !/^(?:-|$)/.test(e) && !/^-[pfdP]$/.test(t[i - 1] ?? ""));
}
//@ chunk-63f0f3kd.js:80390-81547 placement
/**
 * 分析 sshpass 调用：校验其选项可读，找出被包装的程序；若为 rsh/ssh/scp/rsync 则交给远程命令分析，若后续词可能指定远程客户端则拒绝。
 */
function checkSshpassInvocation(t, e, i, n) {
  if (
    t !== "sshpass" ||
    !readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
      safe: true,
    })
  )
    return null;
  let mapped = e.map((f) => (f.value.kind === "literal" ? f.value.text : ""));
  let nonOptionWordIndex = findNonOptionWordIndex(mapped);
  let a = nonOptionWordIndex === -1 ? e.length : nonOptionWordIndex;
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
  let l = programBaseName(mapped[nonOptionWordIndex] ?? "");
  let sliced = e.slice(nonOptionWordIndex + 1);
  if (l === t) return checkSshpassInvocation(t, sliced, i, n);
  if (l === "rsh") return analyzeRemoteShellCommand("ssh", sliced, i, n) ?? null;
  let c =
    TRANSPARENT_LAUNCHERS.has(l) ||
    UNHANDLED_EXEC_WRAPPERS.has(l) ||
    APPLET_SHELL_NAMES.has(l) ||
    /^(?:xargs|find)$/.test(l);
  if (
    !REMOTE_SESSION_PROGRAMS.has(l) &&
    sliced.some(({ value: f }) =>
      f.kind === "literal"
        ? f.text
            .split(/\s+/)
            .map(programBaseName)
            .some((h) => h === "rsh" || REMOTE_SESSION_PROGRAMS.has(h))
        : c,
    )
  )
    return unverifiableRunReason(
      t,
      `with ${l} as its program and a later word that may name a remote client, which this guard does not read past (make the client sshpass's own program)`,
    );
  return REMOTE_SESSION_PROGRAMS.has(l)
    ? (analyzeRsyncScp(l, sliced, i) ?? analyzeRemoteShellCommand(l, sliced, i, n) ?? null)
    : null;
}
//@ chunk-63f0f3kd.js:81547-83889 placement
/**
 * 分析启动器类命令（sudo、env、nohup、timeout、xargs 等）的参数：stdin 喂 shell、sshpass/远程客户端、操作数中的 git、shell -c 字符串、环境赋值与计算值，无法证明安全时返回原因。
 */
function checkLauncherInvocation(program, words, state, { fed, assembled }) {
  let isLauncher =
    TRANSPARENT_LAUNCHERS.has(program) ||
    UNHANDLED_EXEC_WRAPPERS.has(program) ||
    EXEC_LIKE_COMMANDS.has(program) ||
    APPLET_SHELL_NAMES.has(program);
  let literals = words.map((word) => (word.value.kind === "literal" ? word.value.text : ""));
  let o = isParameterExpansionStrictnessOn();
  if (program === "sudo" && literals.some((literal) => /^(?:-[A-Za-z]*D|--chdir)/.test(literal)))
    return unverifiableRunReason(
      "sudo",
      "with --chdir: the paths judged so far were read against the shell directory",
    );
  if (
    fed &&
    (/^(?:at|batch|crontab|newgrp)$/.test(program) ||
      (program === "parallel" && literals.every((literal) => literal.startsWith("-"))) ||
      (/^(?:unshare|nsenter|chroot)$/.test(program) &&
        count(literals, (g) => !/^(?:-|\d*$)/.test(g)) <= +(program === "chroot")) ||
      (/^(?:sudo|doas)$/.test(program) &&
        literals.some((literal) => /^(?:-[A-Za-z]*[si]|--shell|--login)/.test(literal))))
  )
    return unverifiableRunReason(program, "with a shell reading its commands from stdin");
  let u = checkSshpassInvocation(program, words, state, {
    fed,
    assembled,
  });
  if (u !== null) return u;
  let l = program === "sshpass" ? findNonOptionWordIndex(literals) : -1;
  let d = REMOTE_SESSION_PROGRAMS.has(program)
    ? program
    : l !== -1 && REMOTE_SESSION_PROGRAMS.has(programBaseName(literals[l]))
      ? programBaseName(literals[l])
      : null;
  if (d !== null) {
    let g =
      analyzeRsyncScp(d, words.slice(l + 1), state) ??
      analyzeRemoteShellCommand(d, words.slice(l + 1), state, {
        assembled,
        fed,
      });
    if (g !== undefined) return g;
  }
  let index = literals
    .slice(0, -1)
    .findIndex((literal) =>
      GIT_COMMAND_PATTERN.test(programBaseName(literal.replace(/^-.*=/, "")).replace(/[:@].*$/, "")),
    );
  if (
    index !== -1 &&
    (!isLauncher ||
      NAMESPACE_WRAPPER_RE.test(program) ||
      literals
        .slice(0, index)
        .some(
          (literal, S, p) =>
            /^(?:-[A-Za-z]*[DR]|--ch(?:dir|root))/.test(literal) ||
            (!/^(?:-|[A-Za-z_]\w*=|[\d.,:]+[a-z]?$)/.test(literal) &&
              !/^-[A-Za-z]*[ugnskoecptwC]$/.test(p[S - 1] ?? "") &&
              (!(TRANSPARENT_LAUNCHERS.has(literal) || UNHANDLED_EXEC_WRAPPERS.has(literal)) ||
                NAMESPACE_WRAPPER_RE.test(literal))),
        ))
  )
    return unverifiableRunReason(
      program,
      "with a git command among its operands: what runs it, and from which directory or root, cannot be read here (name git right after the launcher and its options)",
    );
  let index_2 = literals.findIndex((literal) => SHELL_PROGRAM_NAMES.has(programBaseName(literal)));
  let shellCommandStringIndex = findShellCommandStringIndex(
    words.map((word) => (word.value.kind === "literal" ? word.value.text : null)),
    index_2,
  );
  let b = literals[index_2 + (literals[index_2 + 1] === "-n" ? 2 : 1)];
  if (
    index_2 !== -1 &&
    shellCommandStringIndex === -1 &&
    (literals.some((literal) => SHELL_COMMAND_FLAG_PATTERN.test(literal)) ||
      /^[-+]/.test(b ?? "") ||
      isDevicePath(b ?? "") ||
      (fed && (!b || isOpaquePathArgument(b, state))))
  )
    return unverifiableRunReason(program, `with ${describeWordValue(words[index_2].value)}`);
  for (let [g, { value: S }] of words.entries()) {
    if (g === shellCommandStringIndex) continue;
    if (S.kind !== "literal") {
      if (
        S.kind === "refuse" ||
        (S.why === "a glob pattern" && (isLauncher || !S.inert)) ||
        (isLauncher && !S.inert)
      )
        return unverifiableRunReason(program, `with ${describeWordValue(S)}`);
      continue;
    }
    let matches = /[$`'"\\]/.test(S.text);
    let mapped = S.text
      .replace(SHELL_QUOTE_CHARS_RE, "")
      .split(/\s+/)
      .map((D) => programBaseName(D.replace(/^.*=/, "")));
    let _ = o ? (mapped.find((D) => D !== "") ?? "") : mapped[0];
    let x = isLauncher && /^([A-Za-z_]\w*)=(.*)$/s.exec(S.text);
    let T = x
      ? environmentAssignmentReason(
          x[1],
          {
            kind: "literal",
            text: x[2],
          },
          x[2],
        )
      : null;
    if (T !== null) return T;
    let G = isLauncher
      ? matches ||
        isDevicePath(S.text) ||
        mapped.some((D) => ARG_SENSITIVE_COMMANDS.has(D) || (fed && INTERPRETER_RULES.has(D)))
        ? unverifiableRunReason(program, `with ${describeWordValue(S)}`)
        : mapped.length > 1 || /[*?[]/.test(S.text)
          ? analyzeNestedShellText(program, S.text, state, fed)
          : null
      : (matches || mapped.length > 1) && (isGitProgram(_) || (matches && mapped.some(isGitProgram)))
        ? unverifiableRunReason(program, `with ${describeWordValue(S)}`)
        : null;
    if (G !== null) return G;
  }
  return shellCommandStringIndex === -1
    ? null
    : analyzeNestedShellText(
        programBaseName(literals[index_2]),
        literals[shellCommandStringIndex],
        state,
        fed,
      );
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
var SHELL_QUOTE_CHARS_RE = /\$\{[^}]*\}|\$\w*|[`'"\\]/g;
var BOT_PROTECTED_TENGU_STEADY_THIMBLE = "bot_protected_tengu_steady_thimble";
var STRING_NODE_TYPES_RE = /^(?:string|raw_string|ansi_c_string)$/;
var GLOB_CHARS_RE = /(?:^|[^\\])(?:\\\\)*[*?[{]/;
//@ chunk-63f0f3kd.js:84177-84240 placement
/**
 * 判断词节点（或其子节点）是否含通配符。
 */
function hasChildWordGlob(node) {
  return node.type === "word" ? GLOB_CHARS_RE.test(node.text) : hasChildWordMatching(node, GLOB_CHARS_RE);
}
//@ chunk-63f0f3kd.js:84240-93992 placement
/**
 * 检查内建命令与常用工具（printf、test、set/shopt、rg/sort、cd、read/getopts/unset 等）的参数能否静态判定（计算值可能是选项、变量名可能被绑定等），不能时返回原因。
 */
function checkBuiltinArguments(program, words, state, n) {
  let values = words.map((word) => word.value);
  let literalValues = values.map((value) => (value.kind === "literal" ? value.text : null));
  let reason = null;
  if (program === "printf") {
    let o = literalValues[literalValues[0] === "--" ? 1 : 0];
    reason = o === null || (o ?? "").startsWith("-") ? (o ?? "a computed format") : null;
  } else if (program === "test" || program === "[") {
    let index = literalValues.findIndex(
      (literalValue, d) =>
        /^-[vRt]$/.test(literalValue ?? "") && !/^(?:[A-Za-z_]\w*|\d+)$/.test(literalValues[d + 1] ?? ""),
    );
    let index_2 = values.findIndex(
      (value, d) =>
        d + 1 < values.length && value.kind === "dynamic" && !value.integer && !isTestOperand(values[d + 1]),
    );
    reason =
      index !== -1
        ? `${literalValues[index]} ${index + 1 < values.length ? describeWordValue(values[index + 1]) : "and nothing after it"}`
        : index_2 === -1
          ? null
          : describeWordValue(values[index_2]);
  } else if (/^(?:set|shopt|setopt|unsetopt|rg|sort)$/.test(program)) {
    let o = (N) => program === "rg" && GREP_PATTERN_OPTIONS.test(literalValues[N - 1] ?? "");
    let u = (program === "rg" || program === "sort") && isStrictDynamicValuesEnabled();
    let l = [];
    for (let idx = 0; u && idx < literalValues.length; idx++) {
      let y = idx > 0 && l[idx - 1] === null ? literalValues[idx - 1] : null;
      l[idx] =
        y === null
          ? null
          : program === "sort"
            ? normalizeSortOption(y)
            : GREP_PATTERN_OPTIONS.test(y) || RG_PROGRAM_OPTIONS.test(y)
              ? y
              : findGrepPatternFlag(y);
    }
    let d = u
      ? literalValues.findIndex((literalValue, y) => literalValue === "--" && l[y] === null)
      : literalValues.indexOf("--");
    let c = (N) => (u ? (l[N] ?? (o(N) ? literalValues[N - 1] : null)) : null);
    let f = program === "rg" ? GREP_CONTEXT_OPTIONS_RE : SORT_VALUE_OPTIONS_RE;
    let h = (N, y) =>
      y !== null &&
      N.value.kind !== "literal" &&
      !isFullyStaticValue(N) &&
      !(N.value.kind === "dynamic" && N.value.integer && f.test(y));
    let index = literalValues.indexOf("--");
    let g = (word, y) =>
      (index === -1 || y < index) &&
      isUnverifiableValue(word) &&
      !(
        program === "rg" &&
        GREP_PATTERN_OPTIONS.test(literalValues[y - 1] ?? "") &&
        !hasExpansion(word.node)
      );
    let S = (word, y) =>
      u &&
      (d === -1 || y < d) &&
      (o(y) && l[y] !== null ? h(word, l[y]) : isUnverifiableValue(word) || h(word, c(y)));
    let index_2 = words.findIndex((word, y) => g(word, y) || S(word, y));
    let m = (N) => `${OPTION_POSITION_NOTE.slice(0, OPTION_POSITION_NOTE.indexOf(";"))}: ${N})`;
    let _ = (N) => {
      let y = words[N];
      let z = literalValues[N - 1] ?? "";
      let R = u ? c(N) : o(N) ? z : null;
      if (R === null)
        return u && z === "--" && l[N - 1]
          ? `${describeWordValue(y.value)} ${m(`the -- before it is the ${l[N - 1]} value here, so options have not ended`)}`
          : `${describeWordValue(y.value)} ${OPTION_POSITION_NOTE}`;
      let O = u && l[N] != null && R !== z;
      let Y = O ? `${z.slice(0, -1)} ${R}` : R;
      let st = `as the ${R} value${O ? ` of the cluster ${z}` : ""}, where an option may stand`;
      if (y.value.kind === "dynamic" && y.value.many) return dynamicArgumentReason(program, R, y);
      if (program !== "rg" || !GREP_PATTERN_OPTIONS.test(R))
        return f.test(R)
          ? `${describeWordValue(y.value)} ${st} (give a spelled-out count or key: ${Y} 4)`
          : `${describeWordValue(y.value)} ${st} (if this command sets it to a path, quoting it is enough: "$x"; otherwise spell the value out, or at least its first character: a wholly computed ${R} value may begin with -)`;
      if ((u ? h(y, R) : true) || (o(N) && l[N] !== null && hasExpansion(y.node)))
        return dynamicArgumentReason(program, R, y, O ? z : undefined);
      return O
        ? `${describeWordValue(y.value)} ${st} (write ${R} as its own word: ${Y} "$x")`
        : `${describeWordValue(y.value)} ${m(`the ${z} before it is itself the ${l[N - 1] ?? "previous option"} value here, so give each option its own value`)}`;
    };
    let x = -1;
    let T;
    let G = program !== "set";
    let D = !/^(?:rg|sort)$/.test(program);
    for (let idx = 0; D && x === -1 && idx < literalValues.length; idx++) {
      let y = literalValues[idx] ?? null;
      if (program === "set" && !G && !/^[-+][a-zA-Z]/.test(y ?? "")) {
        if (mayExpandToNothing(words[idx].node)) {
          T = words[idx];
          continue;
        }
        break;
      }
      x = (
        y === null
          ? false
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
        : idx;
      G = program !== "set" || /^[-+][a-zA-Z]*o/.test(y ?? "");
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
    reason = literalValues.some(
      (literalValue) => literalValue !== null && literalValue[0] !== "-" && isDevicePath(literalValue),
    )
      ? "a directory under /dev or /proc"
      : null;
  if (reason !== null) return unverifiableRunReason(program, `with ${reason}`);
  if (SHELL_BUILTIN_ARG_COMMANDS.has(program)) {
    let o = program === "getopts" ? "data" : "name";
    for (let [u, l] of values.entries()) {
      let d = o;
      o = "name";
      let c = literalValues[u] ?? null;
      let node = words[u].node;
      let h = d === "name" && program === "read" && c?.[0] === "-";
      if (
        l.kind === "literal" &&
        (h || d === "data") &&
        hasChildWordGlob(node) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_STEADY_THIMBLE, {
          safe: true,
        })
      )
        return unverifiableRunReason(
          program,
          `with the word ${shortenForReason(node.text)}: its unquoted *, ?, [ or { may make it no word or several, and the words after it may then be read as variable names (${h ? "spell the option letters out, such as -d" : "write it as quoted text, such as '*'"})`,
        );
      if (h) {
        for (let idx = 1; idx < c.length; idx++) {
          let p = `-${c[idx]}`;
          if (!/^-[aA]$/.test(p) && !READ_DATA_FLAGS.has(p)) continue;
          let m = READ_NUMERIC_ARG_FLAGS.has(p) ? "number" : READ_DATA_FLAGS.has(p) ? "data" : "name";
          let sliced = c.slice(idx + 1);
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
              : !PLAIN_TEXT_RE.test(c);
      let g =
        d === "name" && program !== "unset" && SHELL_NAME_PATTERN.test(c ?? "-")
          ? describeUnsafeBinding(c, state)
          : null;
      if (b || g !== null)
        return g ?? unverifiableRunReason(program, `with a name it would evaluate (${describeWordValue(l)})`);
      if (
        l.kind === "dynamic" &&
        (d === "number" || (d === "data" && !isQuotedLiteral(node, STRING_NODE_TYPES_RE))) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_STEADY_THIMBLE, {
          safe: true,
        })
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
      let h = literalValues[o];
      let match = /^-[Fv](.+)$/s.exec(h);
      let g = match
        ? match[1]
        : h === "-v"
          ? words[o + 1]?.node.text.replace(/["'\\]/g, "")
          : literalValues[o + 1];
      if (!/^-[Fv]/.test(h) || typeof g !== "string" || (h[1] === "v" && !/^[A-Za-z_]\w*=/.test(g)))
        return unverifiableRunReason(program, `with ${h}`);
      let S = !match && literalValues[o + 1] === null ? words[o + 1] : null;
      if (
        S &&
        (S.value.kind === "refuse" ||
          hasExpansion(S.node) ||
          (isStrictDynamicValuesEnabled() && !isFullyStaticValue(S)))
      )
        return unverifiableRunReason(program, `with ${dynamicArgumentReason(program, h, S)}`);
      o += match ? 1 : 2;
    }
    o += literalValues[o] === "--" ? 1 : 0;
    let u = o < literalValues.length ? literalValues[o] : "";
    if (u === null || u === undefined || u.includes("{}") || awkProgramHasExecBridge(u))
      return unverifiableRunReason(
        program,
        "with a program that can execute commands or that it cannot read",
      );
    let replaced = u.replaceAll("||", "  ");
    let index = replaced.indexOf("|");
    let index_2 = u.indexOf("print");
    return index !== -1 &&
      ((index_2 !== -1 && index_2 < replaced.lastIndexOf("|")) || u.lastIndexOf("getline") > index) &&
      readFlagWithOverride(TENGU_RUSTLING_LIGHTHOUSE, {
        safe: true,
      })
      ? unverifiableRunReason(
          program,
          `with a | after print/printf or before getline in its program, which awk can run as a pipe to a command, whatever the command is (a | in a regex, string or comment at such a spot is refused too: pass the pattern with -v re='a|b', doubling any backslash in it, and use $0 ~ re or gsub(re, "x"); print a literal | as "\\174")`,
        )
      : null;
  }
  switch (program) {
    case "sed": {
      let o = readFlagWithOverride(TENGU_HUMBLE_WHALE, {
        safe: true,
      })
        ? parseSedProgram(literalValues, false)
        : null;
      let u =
        o && !["linux", "wsl", "windows"].includes(getPlatform())
          ? parseSedProgram(literalValues, true)
          : null;
      let index = literalValues.indexOf("--");
      let d = index !== -1 && u ? Math.max(index, u.optionsEnd) : index;
      let found = words.find((word, m) => (d === -1 || m < d) && isUnverifiableValue(word));
      let found_2 = literalValues.find(
        (literalValue) =>
          isOptionWord(literalValue) &&
          !isSedExpressionFlag(literalValue) &&
          !literalValue.startsWith("--expression=") &&
          !SED_OPTIONS_RE.test(literalValue),
      );
      if (found || found_2)
        return (
          unverifiableRunReason(
            "sed",
            `with ${found_2 ?? `${describeWordValue(found.value)} ${OPTION_POSITION_NOTE}`}`,
          ) + (!found_2 && index !== -1 && words.indexOf(found) > index ? SED_BSD_INPLACE_NOTE : "")
        );
      let flattened = literalValues.flatMap((literalValue, m) =>
        isSedExpressionFlag(literalValues[m - 1])
          ? [literalValue]
          : literalValue?.startsWith("--expression=")
            ? [literalValue.slice(13)]
            : [],
      );
      if (flattened.length === 0)
        flattened = literalValues
          .filter(
            (literalValue, m) =>
              literalValue !== "--" &&
              !isSedExpressionFlag(literalValues[m - 1]) &&
              !isOptionWord(literalValue),
          )
          .slice(0, 1);
      let regExp = new RegExp(SED_COMMAND_PATTERN_STRICT, "y");
      let g = isSedScriptStrictnessOn() ? new RegExp(SED_COMMAND_PATTERN, "y") : null;
      let S = [
        ...flattened.map((script) => ({
          script,
          hint: "",
        })),
        ...(o
          ? [
              {
                script: o.program,
                hint: SED_OPTION_ORDER_NOTE,
              },
            ]
          : []),
        ...(u
          ? [
              {
                script: u.program,
                hint: u.suffixes.some((suffix) => suffix !== "")
                  ? SED_BSD_INPLACE_NOTE
                  : flattened[0] === ""
                    ? ""
                    : SED_OPTION_ORDER_NOTE,
              },
            ]
          : []),
      ];
      for (let { script, hint } of S) {
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
          ) + SED_BSD_INPLACE_NOTE
        : null;
    }
    case "find": {
      let mapped = literalValues.map(() => null);
      let u = literalValues.length;
      for (let idx = 0; isStrictDynamicValuesEnabled() && idx < u; idx++) {
        let h = literalValues[idx] ?? null;
        if (h === null || mapped[idx] !== null) continue;
        if (FIND_EXEC_OPTIONS.has(h)) u = idx;
        else if (FIND_PATH_PREDICATE_RE.test(h) || FIND_SIDE_EFFECT_PREDICATE_RE.test(h)) {
          for (let idx_2 = 1; idx_2 <= (h === "-fprintf" ? 2 : 1); idx_2++)
            if (idx + idx_2 < literalValues.length) mapped[idx + idx_2] = h;
        }
      }
      let l = 0;
      let d = false;
      while (isStrictDynamicValuesEnabled() && l < literalValues.length && literalValues[l] !== "-") {
        let f = literalValues[l] ?? null;
        if (f === null) {
          if (isUnverifiableValue(words[l])) {
            d = true;
            break;
          }
          if (isQuotedLiteral(words[l].node)) break;
          l += 1;
          continue;
        }
        let match = /^-[EHLPXdhsx]*(f([\s\S]*))?$/.exec(f);
        if (match === null) break;
        l += match[1] !== undefined && match[2] === "" ? 2 : 1;
      }
      let c =
        d ||
        (isStrictDynamicValuesEnabled() &&
          literalValues.some(
            (literalValue, h) =>
              literalValue === "-files0-from" ||
              ((h < l || (h < u && mapped[h] === null)) && /^-[EHLPXdhsx]*f(?:-|$)/.test(literalValue ?? "")),
          ));
      for (let [f, h] of literalValues.entries()) {
        let node = words[f].node;
        let g =
          f === 0 &&
          !(
            isUnverifiableValue(words[f]) &&
            (node.type !== "string" ||
              node.children.length !== 3 ||
              literalValues.some((literalValue) => literalValue === ";" || literalValue === "+"))
          );
        let S =
          h === null &&
          (!FIND_PATH_PREDICATE_RE.test(literalValues[f - 1] ?? "") || hasExpansion(node)) &&
          !g;
        let p = f < u && FIND_PATH_PREDICATE_RE.test(mapped[f] ?? "");
        let m = isStrictDynamicValuesEnabled() && h === null && (!p || !isFullyStaticValue(words[f])) && !g;
        if (S || m) {
          let _ =
            isStrictDynamicValuesEnabled() &&
            f >= u &&
            FIND_PATH_PREDICATE_RE.test(literalValues[f - 1] ?? "");
          let x = isStrictDynamicValuesEnabled()
            ? p
              ? mapped[f]
              : null
            : FIND_PATH_PREDICATE_RE.test(literalValues[f - 1] ?? "")
              ? literalValues[f - 1]
              : null;
          return unverifiableRunReason(
            "find",
            `with ${x !== null ? dynamicArgumentReason("find", x, words[f]) : _ ? `${describeWordValue(values[f])} after ${literalValues[f - 1]} once an -exec action has begun, where no computed word is read as a value (spell it out, or put a find test before the -exec clause),` : describeWordValue(values[f])}`,
          );
        }
        if (FIND_EXEC_OPTIONS.has(h ?? "")) {
          let matches = /^-exec(?:dir)?$/.test(h);
          let index = literalValues.findIndex(
            (literalValue, O) => O > f && /^[;+]$/.test(literalValue ?? ""),
          );
          let index_2 = literalValues.findIndex(
            (literalValue, O) =>
              O > f &&
              (literalValue === ";" || (matches && literalValue === "+" && literalValues[O - 1] === "{}")),
          );
          let G = isStrictDynamicValuesEnabled()
            ? literalValues
                .slice(f + 1, index_2 === -1 ? literalValues.length : index_2)
                .find(
                  (literalValue, O) =>
                    literalValue !== null &&
                    ((literalValue !== ";" && literalValue.startsWith(";")) ||
                      (matches &&
                        literalValue !== "+" &&
                        literalValue.startsWith("+") &&
                        literalValues[f + O] === "{}")),
                )
            : undefined;
          if (G !== undefined)
            return unverifiableRunReason(
              "find",
              `${h} with a clause containing ${shortenForReason(G)}, which GNU and BSD find end differently,`,
            );
          let D = literalValues[f + 1];
          let N = c || (isStrictDynamicValuesEnabled() && (h === "-execdir" || h === "-okdir"));
          let y = (R) =>
            R === -1 || !D || D.includes("{}")
              ? unverifiableRunReason("find", `${h} with a program it cannot verify`)
              : checkExecSlotCommand(
                  D,
                  words.slice(f + 2, R).map((word, Y) =>
                    word.value.kind === "literal" && word.value.text.includes("{}")
                      ? {
                          node: word.node,
                          value: dynamicValue("a found path", {
                            ...DYNAMIC_VALUE_FLAGS,
                            optionSafe:
                              !word.value.text.startsWith("-") && !(N && word.value.text.startsWith("{}")),
                            many:
                              isStrictDynamicValuesEnabled() &&
                              matches &&
                              literalValues[R] === "+" &&
                              f + 2 + Y === R - 1 &&
                              word.value.text === "{}",
                          }),
                        }
                      : word,
                  ),
                  state,
                );
          let z = y(index) ?? (isStrictDynamicValuesEnabled() && index_2 !== index ? y(index_2) : null);
          if (z !== null) return z;
        }
      }
      return null;
    }
    case "xargs": {
      let o = null;
      let u = false;
      for (let idx = 0; idx < literalValues.length; idx++) {
        let d = literalValues[idx] ?? null;
        let match = /^(?:-I(.*)|-i(.*)|--replace(?:=(.*))?)$/.exec(d ?? "");
        if (match && d !== "-I") {
          o = match[1] || match[2] || match[3] || "{}";
          continue;
        }
        if (d === "-I" && literalValues[idx + 1]) {
          o = literalValues[++idx];
          continue;
        }
        if (d !== null && XARGS_OPTIONS_RE.test(d)) {
          u = /^(?:-[0rtpx]*0|--null$)/.test(d) ? true : /^(?:-[0rtpx]*d|--delimiter)/.test(d) ? false : u;
          let matches = /^(?:-[nPLsdE]|--(?:max-args|max-procs|delimiter))$/.test(d);
          let b = matches && literalValues[idx + 1] === null ? words[idx + 1] : null;
          if (b && isStrictDynamicValuesEnabled() && !isFullyStaticValue(b))
            return unverifiableRunReason("xargs", `with ${dynamicArgumentReason("xargs", d, b)}`);
          idx += matches ? 1 : 0;
          continue;
        }
        let f = {
          node: words[idx].node,
          value: dynamicValue(
            "the words xargs appends, which may begin with - unless they follow a -- operand or come NUL-separated from find -print0 into xargs -0",
            {
              ...DYNAMIC_VALUE_FLAGS,
              optionSafe: u && isSafeFindPrint0(n, state),
            },
          ),
        };
        return d !== null && !d.startsWith("-") && (o === null || !d.includes(o))
          ? checkExecSlotCommand(
              d,
              [
                ...words.slice(idx + 1).map((word) =>
                  o !== null && (word.value.kind !== "literal" || word.value.text.includes(o))
                    ? {
                        node: word.node,
                        value: dynamicValue("the words xargs substitutes"),
                      }
                    : word,
                ),
                f,
                f,
              ],
              state,
            )
          : unverifiableRunReason("xargs", `with ${d ?? describeWordValue(values[idx])}`);
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
function checkExecSlotCommand(t, words, state) {
  let program = programBaseName(t);
  if (KNOWN_PROGRAMS.has(program)) return checkBuiltinArguments(program, words, state);
  let rules = INTERPRETER_RULES.get(program);
  if (rules)
    return checkInterpreterInvocation(program, rules, words, state, {
      redirects: [],
      prefixValues: [],
    });
  return state.simple &&
    (GIT_COMMAND_PATTERN.test(program) ||
      (describeGitRunner(program) === null &&
        !TRANSPARENT_LAUNCHERS.has(program) &&
        !UNHANDLED_EXEC_WRAPPERS.has(program)))
    ? checkLauncherInvocation(program, words, state, {
        fed: true,
        assembled: state.inputAssembled,
      })
    : unverifiableRunReason(program, "from a find -exec or xargs slot");
}
//@ chunk-63f0f3kd.js:94310-94373 placement
function findMatching(t, e) {
  return t.find((i) => i !== null && e.test(i)) ?? null;
}
//@ chunk-63f0f3kd.js:94373-94506 placement
function isTestOperand(t) {
  return t.kind === "literal"
    ? PLAIN_TEXT_RE.test(t.text) || /^(?:!=?|==?|=~|\]|\(|\)|<|>)$/.test(t.text)
    : t.kind === "dynamic" && t.integer;
}
//@ chunk-63f0f3kd.js:94506-94632 placement
function matchesWhole(t, script) {
  t.lastIndex = 0;
  while (t.lastIndex < script.length) {
    let lastIndex = t.lastIndex;
    if (!t.test(script) || t.lastIndex === lastIndex) return false;
  }
  return true;
}
//@ chunk-63f0f3kd.js:94632-94998 placement
/**
 * 解析 sed 参数：找出脚本程序参数位置（被 -e/--expression 指定时为空）、选项结束下标与 -i 的后缀。
 */
function parseSedProgram(literalValues, e) {
  let i = [];
  let n = false;
  let r = false;
  let s = 0;
  for (; s < literalValues.length; s++) {
    let l = literalValues[s] ?? null;
    if (l === null) n ||= !r;
    else if (!isOptionWord(l)) break;
    else if (isSedExpressionFlag(l)) {
      r = true;
      s++;
    } else if (l.startsWith("--expression=")) r = true;
    else if (e && l === "-i" && ++s < literalValues.length) i.push(literalValues[s] ?? null);
  }
  let a = literalValues[s] === "--" ? s + 1 : s;
  let o = a < literalValues.length ? (literalValues[a] ?? null) : "";
  let u = r || o?.startsWith(".") ? "" : o;
  return {
    program: n ? null : u,
    optionsEnd: s,
    suffixes: i,
  };
}
//@ chunk-63f0f3kd.js:94998-95061 placement
function isOptionWord(literalValue) {
  return !!literalValue && literalValue !== "-" && literalValue !== "--" && literalValue.startsWith("-");
}
//@ chunk-63f0f3kd.js:95061-95112 placement
function isSedExpressionFlag(t) {
  return t === "-e" || t === "--expression";
}
export {
  programBaseName,
  ARRAY_REF_RE,
  ARRAY_LENGTH_RE,
  isStaticWord,
  hasExpansion,
  TENGU_WOOLLY_WALL,
  isStrictDynamicValuesEnabled,
  isQuotedLiteral,
  analyzeCommand,
  describeGitRunner,
  INTERPRETER_RULES,
  isPlainOrInertValue,
  TENGU_HOLLOW_SANDPIPER,
};
