/**
 * tools/BashTool/bgWorktreeGuard/commandRules.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的逐命令规则：识别会写到 worktree 之外、远程执行（ssh/kubectl 等）或无法静态判定目标的命令。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h2y5xkdx.js (79)
 * attribution: placement 55, layout 24
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { basename } from "path";
import {
  SHELL_PROGRAM_NAMES,
  EVAL_LIKE_BUILTINS,
  POSIX_SHELL_NAMES,
  parseForSecurityFromAst,
  UNHANDLED_EXEC_WRAPPERS,
  POSIX_SPECIAL_BUILTINS_NONEVAL,
  APPLET_SHELL_NAMES,
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
  describeComputedValue,
  describeWordRefusal,
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
import { normalizeCaseForComparison_2 } from "../../../utils/permissions/filesystem.js";
import { countWhere } from "../../../utils/collections.js";
import { getPlatform } from "../../../utils/platform.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-h2y5xkdx.js:51169-51336 placement
function programBaseName(program) {
  let replaced = basename(program.replace(/\\/g, "/"))
    .toLowerCase()
    .replace(/\.(?:exe|bat|cmd|com)$/, "");
  let replaced_2 = replaced.replace(/([a-z])-?\d[\d.]*$/, "$1");
  return INTERPRETER_RULES.has(replaced_2) || SHELL_PROGRAM_NAMES.has(replaced_2) ? replaced_2 : replaced;
}
//@ chunk-h2y5xkdx.js:51336-51510 placement
/**
 * 若命令是 git 或可能间接执行 git 的声明/eval 类内建命令，返回说明原因。
 */
function describeGitRunner(program) {
  let baseName = programBaseName(program);
  if (GIT_COMMAND_PATTERN.test(baseName)) return GIT_TOO_COMPLEX_REASON;
  return DECLARATION_BUILTINS.has(baseName) || EVAL_LIKE_BUILTINS.has(baseName)
    ? `runs ${baseName} ${TOO_COMPLEX_SUFFIX}; what it reads or is handed as shell text cannot be shown not to run git`
    : null;
}
//@ chunk-h2y5xkdx.js:51510-55870 placement
/**
 * 各解释器（python/node/bun/deno/perl/ruby/php/lua/R/julia/osascript/groovy/tcl）的命令行规则表：内联代码选项、模块选项、取值选项、普通标志、能启动其他程序的代码特征（bridge）、启动时相关的环境变量前缀。
 */
var NEVER_MATCH_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var INTERPRETER_RULE_DEFAULTS;
var GENERIC_BRIDGE_RE;
var NODE_INTERPRETER_RULES;
var LUA_INTERPRETER_RULES;
var R_INTERPRETER_RULES;
var TCL_INTERPRETER_RULES;
var PYTHON_INTERPRETER_RULES;
var INTERPRETER_RULES;
deferInit("chunk-h2y5xkdx.js:51510", () => {
  NEVER_MATCH_RE = /(?!)/;
  INTERPRETER_RULE_DEFAULTS = {
    module: NEVER_MATCH_RE,
    inlineEndsOptions: false,
    console: NEVER_MATCH_RE,
    literalScript: false,
    scriptAfterDashes: true,
  };
  GENERIC_BRIDGE_RE = /system|exec|popen|spawn|eval|shell|\x60|\bopen\b|pipe\(|load|dofile|source|require/i;
  NODE_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^(?:-[ep]|--(?:eval|print))$|^--(?:eval|print)=(.*)$/s,
    console: /^inspect$/,
    valued: /^(?:-[rC]|--(?:require|import|loader|experimental-loader|conditions|env-file))$/,
    flag: /^(?:-[vhc]|--[a-z][a-z0-9-]*=.*|--(?:no-[a-z-]+|enable-source-maps|experimental-[a-z-]+|trace-[a-z-]+|inspect(?:-brk)?|expose-gc|version|help|check|watch|test))$/,
    bridge:
      /child_process|exec\w*\s*\(|_compile|spawn(?:Sync)?\s*\(|\beval\b(?!['"])|\bFunction\b|runMain|\.constructor|import\s*\(|--import|--require|--loader|-r\b|require\s*\(\s*[^'"\s)]|\bvm\b|runIn\w*Context|inspector|repl|dlopen|process\.binding|worker_threads|\bWorker\(|\$`|Bun\.\$|Deno\./,
    environment: /^(?:NODE_|NPM_CONFIG_)/,
  };
  LUA_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^-e(.*)$/s,
    valued: /^-l$/,
    flag: /^-(?:[vEW]|l.+)$/,
    bridge: GENERIC_BRIDGE_RE,
    environment: /^LUA_/,
  };
  R_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: /^-e(.*)$/s,
    valued: /^-f$/,
    flag: /^--[a-z][a-z-]*(?:=.*)?$/,
    bridge: GENERIC_BRIDGE_RE,
    environment: /^R_/,
  };
  TCL_INTERPRETER_RULES = {
    ...INTERPRETER_RULE_DEFAULTS,
    inline: NEVER_MATCH_RE,
    valued: /^-encoding$/,
    flag: NEVER_MATCH_RE,
    bridge: GENERIC_BRIDGE_RE,
    environment: /^TCL/,
  };
  PYTHON_INTERPRETER_RULES = {
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
});
//@ chunk-h2y5xkdx.js:55870-55962 placement
/**
 * 判断词值无法静态验证：值是动态的、不是整数，且不是（选项安全且无展开）。
 */
function isUnverifiableValue({ node, value }) {
  return value.kind === "dynamic" && !value.integer && !(value.optionSafe && !hasExpansion(node));
}
//@ chunk-h2y5xkdx.js:55962-56062 placement
/**
 * 匹配数组展开（$@、${@}、[@]、${!prefix@} 等），有它就无法静态判定。
 */
var TENGU_HOLLOW_SANDPIPER = "tengu_hollow_sandpiper";
var ARRAY_EXPANSION_RE = /\$@|\$\{@|(?<!\$\{#\w*)\[@\]|\$\{\([^)]*@[^)]*\)|\$\{![^}]*@\}/;
//@ chunk-h2y5xkdx.js:56062-56339 placement
function isNonEmptyWordPart({ type, text }) {
  return (
    /^(?:raw_string|ansi_c_string|number|arithmetic_expansion|process_substitution)$/.test(type) ||
    (type === "string" && !ARRAY_EXPANSION_RE.test(text)) ||
    (type === "word" && !GLOB_WITH_ESCAPE_RE.test(text) && !/[[\]{}]|(?:^|[^\\])(?:\\\\)*[#^]/.test(text)) ||
    /^\$(?:\{?[?#$]\}?|\{#\w+(?:\[[^\]]*\])?\})$/.test(text)
  );
}
//@ chunk-h2y5xkdx.js:56339-56456 placement
function mayExpandToNothing(node) {
  return (
    !(node.type === "concatenation" ? node.children : [node]).every(isNonEmptyWordPart) &&
    !/^[[\]]$/.test(node.text) &&
    readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
      safe: true,
    })
  );
}
//@ chunk-h2y5xkdx.js:56456-56677 placement
function emptyExpansionReason({ value }) {
  return `${describeWordValue(value)}, which may expand to no word at all (a pattern that matches no file, or an empty value), so the word after it would take its place (quote it, or name the files instead of a pattern)`;
}
//@ chunk-h2y5xkdx.js:56677-57187 placement
/**
 * 收集语法节点中各单词的字面前缀（跳过展开/替换、[ ] 测试表达式），动态单词只取通配前的前缀，无法确定时记为 "-"。
 */
function collectWordPrefixes(node, evalCtx) {
  if (/expansion|substitution/.test(node.type)) return [];
  if (node.children.length > 0) {
    let index = node.children.findIndex((child) => child.type === "word" && child.text === "[");
    let lastIndex = node.children.findLastIndex((child) => child.type === "word" && child.text.endsWith("]"));
    return node.children.flatMap((child, idx) =>
      index !== -1 && index <= idx && idx <= lastIndex ? [] : collectWordPrefixes(child, evalCtx),
    );
  }
  if (node.type === '"') return [];
  if (node.type === "string_content") return [unescapeDoubleQuoted(node.text)];
  let evaluated = evaluateWord(node, evalCtx, true);
  if (evaluated.kind === "literal") return [evaluated.text];
  let literalPrefix =
    evaluated.kind === "dynamic" && GLOB_SIMPLE_RE.test(node.text) ? /^[^\\*?[]*/.exec(node.text)[0] : "";
  return [literalPrefix === "" ? "-" : literalPrefix];
}
//@ chunk-h2y5xkdx.js:57187-57248 placement
/**
 * 判断词的前缀片段里是否含以 - 开头的部分（可能被当成选项）。
 */
function hasOptionPrefix(node, evalCtx) {
  return collectWordPrefixes(node, evalCtx).some((prefix) => prefix.startsWith("-"));
}
//@ chunk-h2y5xkdx.js:57248-57303 placement
/**
 * 判断词前缀里除 -n/-N 之外是否还有其他字符。
 */
function hasNonFlagPrefix(node, evalCtx) {
  return /[^-nN]/.test(collectWordPrefixes(node, evalCtx).join(""));
}
//@ chunk-h2y5xkdx.js:57303-57484 placement
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
//@ chunk-h2y5xkdx.js:57484-57575 placement
/**
 * 判断词值是否无法验证（在 bot_protected_tengu_hushed_hyphen 开关下整数动态值也算）。
 */
function isRefusedValue(arg) {
  let { value } = arg;
  return (
    isUnverifiableValue(arg) ||
    (value.kind === "dynamic" &&
      value.integer &&
      readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
        safe: true,
      }))
  );
}
//@ chunk-h2y5xkdx.js:57575-57758 placement
/**
 * 判断节点是否为不含展开的引号字面量（或其拼接）。
 */
function isQuotedLiteral(node, typePattern = /^string$/) {
  return (
    !hasExpansion(node) &&
    !node.text.includes("${!") &&
    (typePattern.test(node.type) ||
      (node.type === "concatenation" &&
        node.children.every(
          (child) =>
            typePattern.test(child.type) || (child.type === "word" && PLAIN_TEXT_RE.test(child.text)),
        )))
  );
}
//@ chunk-h2y5xkdx.js:57758-57799 placement
var BOT_PROTECTED_TENGU_SOFT_ISLAND = "bot_protected_tengu_soft_island";
//@ chunk-h2y5xkdx.js:57799-57836 placement
/**
 * 读取 bot_protected_tengu_soft_island 开关：动态值一律按不可验证处理。
 */
function isStrictDynamicValuesEnabled() {
  return readFlagWithOverride(BOT_PROTECTED_TENGU_SOFT_ISLAND, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:57836-57881 layout
var BOT_PROTECTED_TENGU_STURDY_TOLLGATE = "bot_protected_tengu_sturdy_tollgate";
//@ chunk-h2y5xkdx.js:57881-57919 layout
function isLabelNodeType() {
  return readFlagWithOverride(BOT_PROTECTED_TENGU_STURDY_TOLLGATE, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:57919-58038 placement
/**
 * 匹配数组引用展开；cs 匹配 ${#a[@]} 长度写法，求值前先替换成 0。
 */
var ARRAY_REF_RE = /\$\{?@|\[@\]|\$\{![A-Za-z_]\w*@/;
var ARRAY_LENGTH_RE = /\$\{#[A-Za-z_]\w*\[@\]\}/g;
var ARRAY_ELEMENT_REF_RE = /^(?:string_content|command_substitution)$/;
//@ chunk-h2y5xkdx.js:58038-58265 placement
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
//@ chunk-h2y5xkdx.js:58265-58490 placement
function isStaticWordPart(node) {
  switch (node.type) {
    case "word":
    case "number":
      return !GLOB_WITH_ESCAPE_RE.test(node.text);
    case "raw_string":
    case "ansi_c_string":
    case "$":
      return true;
    case "string":
    case "translated_string":
      return !ARRAY_REF_RE.test(node.text.replace(ARRAY_LENGTH_RE, "0"));
    default:
      return false;
  }
}
//@ chunk-h2y5xkdx.js:58490-58563 placement
/**
 * 判断值不含“动态多值”，且单词本身是静态的。
 */
function isFullyStaticValue({ node, value }) {
  return !(value.kind === "dynamic" && value.many) && isStaticWord(node);
}
//@ chunk-h2y5xkdx.js:58563-58765 layout
function isPlainWord(word) {
  let { node, value } = word;
  return (
    isFullyStaticValue(word) ||
    (/^(?:string|translated_string)$/.test(node.type) &&
      !(value.kind === "dynamic" && value.many) &&
      !node.children.some(
        (child) =>
          !ARRAY_ELEMENT_REF_RE.test(child.type) &&
          ARRAY_REF_RE.test(child.text.replace(ARRAY_LENGTH_RE, "0")),
      ))
  );
}
//@ chunk-h2y5xkdx.js:58765-59154 placement
/**
 * 在 argv 中查找 sh/bash 的 -c 命令字符串参数下标（解析组合短选项与 -o 参数）；不是 shell 或没有 -c 返回 -1。
 */
function findShellCommandStringIndex(argv, shellIdx) {
  if (!POSIX_SHELL_NAMES.has(programBaseName(argv[shellIdx] ?? "-"))) return -1;
  let hasDashC = false;
  for (let k = shellIdx + 1; k < argv.length; k++) {
    let arg = argv[k];
    if (typeof arg !== "string") return -1;
    let match = /^[-+](?=.)[bcefhlmnptuvxBCEHP]*(o?)$/.exec(arg);
    if (match && (!match[1] || typeof argv[k + 1] === "string")) {
      if (match[1] && !isSafeShellOption(argv[k + 1] ?? "")) return -1;
      hasDashC ||= arg.includes("c");
      k += match[1] ? 1 : 0;
    } else {
      let commandIdx = arg === "--" ? k + 1 : k;
      return hasDashC && typeof argv[commandIdx] === "string" && !/^[-+]/.test(argv[commandIdx])
        ? commandIdx
        : -1;
    }
  }
  return -1;
}
//@ chunk-h2y5xkdx.js:59154-60221 layout
function analyzeNestedShellText(launcher, shellText, parentState, stdinFed) {
  if (parentState.depth >= 2)
    return unverifiableRunReason(launcher, "with shell text that starts a third shell");
  if (/git/i.test(shellText))
    return `hands ${launcher} text naming git ${TOO_COMPLEX_SUFFIX}, which cannot be shown to stay inside the worktree`;
  let astRoot = getParserModule()?.parse(shellText) ?? null;
  let analysis = astRoot ? parseForSecurityFromAst(shellText, astRoot) : null;
  if (!astRoot || !analysis || (analysis.kind !== "simple" && isParseFailureNode(analysis)))
    return unverifiableRunReason(
      launcher,
      `with shell text it cannot parse (${shortenForReason(shellText)})`,
    );
  let state = {
    simple: false,
    kinds: new Map([...parentState.kinds.keys()].map((key) => [key, "other"])),
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
    pathAssigned: parentState.pathAssigned,
    startupHazards: new Map(parentState.startupHazards),
    allExported: parentState.allExported,
    stdinFed: false,
    pipedFrom: undefined,
    inputAssembled: stdinFed || parentState.inputAssembled,
    cwd: parentState.cwd,
    opaqueCwd: parentState.opaqueCwd,
    deviceLinked: parentState.deviceLinked,
    scopes: [new Map()],
    depth: parentState.depth + 1,
    sshTextBudget: parentState.sshTextBudget,
  };
  analyzeAssignment(astRoot, state, false);
  let verdict = withStdinState(astRoot, state, stdinFed);
  parentState.statPathDenied ||= state.statPathDenied;
  parentState.dateDirectiveDenied ||= state.dateDirectiveDenied;
  return verdict === null
    ? null
    : `hands ${launcher} the text ${shortenForReason(shellText)}, which ${verdict}`;
}
//@ chunk-h2y5xkdx.js:60221-60629 layout
function describeShellTextProblem(program, value, arg, fs = "rsync") {
  return PLAIN_TEXT_RE.test(value.replace(/["']/g, "")) && !/#|""|''|%["']|(?:^|[:=])~(?!\/)/.test(value)
    ? analyzeNestedShellText(program, value, arg, false)
    : `hands ${fs} the remote shell ${shortenForReason(value)}, which rsync splits into words itself, with no shell, so what it runs cannot be shown not to be git (to pass, use only ASCII letters, digits, spaces, undoubled quotes and _ . , : / = + @ % ^ ~ -, with ~ only as ~/ at the start or after a : or =)`;
}
//@ chunk-h2y5xkdx.js:60629-61092 layout
function describeEnvValue(envName, value, state, node = false) {
  if (
    envName !== "RSYNC_RSH" ||
    !readFlagWithOverride(BOT_PROTECTED_TENGU_GLEAMING_TOME, {
      safe: true,
    })
  )
    return null;
  let prefix = "rsync, through RSYNC_RSH,";
  if (node)
    return `${unverifiableRunReason(prefix, "with a value set through += or a subscript")} (to pass, set the whole value in one RSYNC_RSH=)`;
  if (value.kind !== "literal")
    return `${unverifiableRunReason(prefix, `with ${describeWordValue(value)}`)} (to pass, spell the value out)`;
  if (value.text === "") return null;
  let replaced = value.text.replace(/\S*command=\S*/gi, (flag) => flag.replace(/%[a-z]/gi, "$9"));
  return (
    describeShellTextProblem(prefix, value.text, state, prefix) ??
    (replaced === value.text ? null : analyzeNestedShellText(prefix, replaced, state, false))
  );
}
//@ chunk-h2y5xkdx.js:61092-61172 placement
var PUBLIC_IPV4_PATTERN = /^(?!127\.|0\.)(?:(?:25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(?:\.(?!$)|$)){4}$/;
//@ chunk-h2y5xkdx.js:61172-61250 layout
function stripSshPrefix(url) {
  return url.replace(/^ssh:\/\/|:\d*$/gi, "").replace(/^[^@]*@/, "");
}
//@ chunk-h2y5xkdx.js:61250-61424 placement
function isRemoteSshHost(host) {
  let hostName = stripSshPrefix(host);
  return (
    /[^\w.-]|^$|(?:^|[.-])(?:localhost[46]?|localdomain[46]?|loopback)\.?$/i.test(hostName) ||
    (/^(?:(?:0x[0-9a-f]*|\d+)(?:\.|$))+$/i.test(hostName) && !PUBLIC_IPV4_PATTERN.test(hostName))
  );
}
//@ chunk-h2y5xkdx.js:61424-61981 placement
var SED_COMMAND_PARTS_RE = /^[\s="']*(\w*)["']?[\s=]*(.*)$/s;
var DESTINATION_LABEL = "destination host";
var SSH_OPTION_RE = /^-[46AaCfGgKkMNnqsTtVvXxYy]*(?:([BbcDEeFIiJLlmOoPpQRSWw])(.*))?$/s;
var SFTP_SOURCE_RE =
  /^(?:sftp:\/\/(?:([^@]*)@)?(\[[^\]]*\]|[^:\/]*)|(?:([^:\/[]*)@)?(\[[^\]]*\](?=:|$)|[^:\/@[]+(?=:))|(.*))/is;
var SCP_OPTION_RE = /^-[^-cDFiJloPSX]*([cDFiJloPSX])(.*)$/s;
var SFTP_OPTION_RE = /^-[^-BbcDFiJloPRSsX]*([BbcDFiJloPRSsX])(.*)$/s;
var LEADING_OPTION_ONLY_RE = /^-[^-cDFiJlMoPSX]+$|^-[^-cDFiJlMoPSX]*[cDFiJlMoPSX]/s;
var LEADING_OPTION_END_RE = /^-[^-cDFiJlMoPSX]*[cDFiJlMoPSX]$/;
var QUOTED_OPTION_NAME_RE = /^[\s="']*\w+["'][^\s=]/;
var BOT_PROTECTED_TENGU_GLEAMING_TOME = "bot_protected_tengu_gleaming_tome";
var BRACKET_HOST_PORT_RE = /(^|[,@])\[[\dA-Fa-f.]*:[\dA-Fa-f:.]*\](?=$|[,:])/g;
//@ chunk-h2y5xkdx.js:61981-63058 layout
function describeSshOptionValue(program, optionLetter, optionValue) {
  let isConfigFile = optionLetter === "F";
  let matches = /^(?:J|ProxyJump)$/i.test(optionLetter);
  let matches_2 = /^HostName$/i.test(optionLetter);
  let isDestination = optionLetter === DESTINATION_LABEL;
  let cleaned = isConfigFile
    ? optionValue
    : optionValue
        .replace(isDestination ? /%[\w.-]+(\]?)$/ : /(?!)/, "$1")
        .replace(matches_2 ? /%[%h]/g : /%[%p]/g, "")
        .replace(BRACKET_HOST_PORT_RE, "$1");
  if (
    (!isConfigFile && !matches && !matches_2 && !isDestination) ||
    (PLAIN_TEXT_RE.test(cleaned) && !(isConfigFile ? /[ #=^%]|^~(?!\/)/ : /[ #=^%+~]/).test(cleaned)) ||
    !readFlagWithOverride(BOT_PROTECTED_TENGU_GLEAMING_TOME, {
      safe: true,
    })
  )
    return null;
  let reason = isConfigFile
    ? `the -F path ${shortenForReason(optionValue)}, which ssh pastes unquoted into a shell command when it connects through a jump host (the file itself can name one)`
    : matches
      ? `the jump host ${shortenForReason(optionValue)}, which ssh pastes unquoted into a shell command`
      : `the ${matches_2 ? "HostName" : "destination host"} ${shortenForReason(optionValue)}, which ssh pastes into a shell command when it connects through a jump host (given here or in an ssh config file)`;
  return `hands ${program} ${reason}, so what it runs cannot be shown not to be git (to pass, ${isConfigFile ? "use a path made only of ASCII letters, digits and _ . , : / + @ -, with ~ only as a leading ~/, such as a link to the file or a copy of it under a plain name" : matches ? "write each jump host as [user@]host[:port], separated by commas, with no + or ~ and no % token other than %p" : "write a host name or IP address"})`;
}
//@ chunk-h2y5xkdx.js:63058-63103 layout
var SHELL_HAZARD_RE = /^\\*-|\\$|[\s'"`$;&|<>(){}*?[\]!#%]/;
//@ chunk-h2y5xkdx.js:63103-63514 layout
function describeSshUser(program, userName, isSftpUrl) {
  return (SHELL_HAZARD_RE.test(userName) || (isSftpUrl && userName.includes("+"))) &&
    readFlagWithOverride(BOT_PROTECTED_TENGU_GLEAMING_TOME, {
      safe: true,
    })
    ? `hands ${program} the user name ${shortenForReason(userName)}, which ssh pastes into a shell command if a ProxyCommand in an ssh config file uses it, so what it runs cannot be shown not to be git (to pass, use a user name with no leading -, no trailing \\, no whitespace and none of ' " \` $ ; & | < > ( ) { } * ? [ ] ! # %, and no + in an sftp:// address)`
    : null;
}
//@ chunk-h2y5xkdx.js:63514-63742 layout
function describeQuotedOption(program, option) {
  return QUOTED_OPTION_NAME_RE.test(option) &&
    readFlagWithOverride(BOT_PROTECTED_TENGU_GLEAMING_TOME, {
      safe: true,
    })
    ? `hands ${program} the option ${shortenForReason(option)}, whose name holds a quote that ssh ignores, so what it runs cannot be shown not to be git (to pass, write the option name without quotes)`
    : null;
}
//@ chunk-h2y5xkdx.js:63742-63957 layout
var BOT_PROTECTED_TENGU_PARTED_TOKEN; // deferred: uses POSIX_SHELL_NAMES (../../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var MAX_SSH_TEXT_CHARS;
var SSH_PLAIN_PLACEHOLDER_RE;
var SSH_HAZARD_CHARS_RE;
var EXEC;
var SSH_PATH_PLACEHOLDER_RE;
var EXEC_WRAPPER_NAMES;
deferInit("chunk-h2y5xkdx.js:63742", () => {
  BOT_PROTECTED_TENGU_PARTED_TOKEN = "bot_protected_tengu_parted_token";
  MAX_SSH_TEXT_CHARS = 200000;
  SSH_PLAIN_PLACEHOLDER_RE = /^%[hnrkjH]$/;
  SSH_HAZARD_CHARS_RE = /["'\\#%$=~^{}\s]/;
  EXEC = "exec";
  SSH_PATH_PLACEHOLDER_RE = /^%[hkjHulL]$/;
  EXEC_WRAPPER_NAMES = new Set([
    ...UNHANDLED_EXEC_WRAPPERS,
    "setpriv",
    "setarch",
    "linux32",
    "linux64",
    "arch",
    "parallel",
    "pkexec",
    "chroot",
  ]);
});
//@ chunk-h2y5xkdx.js:63957-63995 layout
function isBotProtectionOn() {
  return readFlagWithOverride(BOT_PROTECTED_TENGU_PARTED_TOKEN, {
    safe: true,
  });
}
//@ chunk-h2y5xkdx.js:63995-64372 layout
function analyzeSshOption(text, token, node) {
  let match = /^\s*(?:([^\s="']+)(?:\s*=|\s|$)|(?:"\w+"|'\w+')(?:\s|$))(?!\s*=)/.exec(token);
  if (!isBotProtectionOn() || (match && (/^\w*$/.test(match[1] ?? "") || !mayExpandToNothing(node))))
    return null;
  return match
    ? `${unverifiableRunReason(text, `with -o ${shortenForReason(token)}, whose option name the shell may expand as a file pattern`)}; quote the option name`
    : `${unverifiableRunReason(text, `with -o ${shortenForReason(token)}, whose option name this check cannot read`)}; write the option name plainly`;
}
//@ chunk-h2y5xkdx.js:64372-64476 layout
function stripUserPart(text) {
  let userPart = /^\w+:\/\/([^@;]*)[^@]*@/.exec(text)?.[1];
  return userPart === undefined ? [] : [userPart.replace(/\+/g, " ")];
}
//@ chunk-h2y5xkdx.js:64476-64651 layout
function splitSftpTarget(text) {
  let match = /^\w+:\/\/(.*)$/s.exec(text);
  return [
    ...(match ? match[1].split(/[@:/;]+/) : []),
    ...stripUserPart(text),
    ...text.split("@"),
    text.replace(/@[^@]*$/, ""),
  ].flatMap((part) => [part, part.replace(/[[\]]/g, "")]);
}
//@ chunk-h2y5xkdx.js:64651-64737 layout (2.1.88 match: ghIsDangerousCallback, 1)
function ghIsDangerousCallback(_rawCommand, args) {
  return args.startsWith(`${_rawCommand}://`) ? Boolean(stripUserPart(args)[0]) : /^[^@:/]+@/.test(args);
}
//@ chunk-h2y5xkdx.js:64737-64905 layout
function collectCandidates(prefix, text) {
  let flattened = prefix.flatMap((candidate) =>
    [candidate, ...candidate.split(",")]
      .flatMap((part) => [part, part.replace(/[:/][^:@]*$/, "")])
      .flatMap(splitSftpTarget),
  );
  let hasExtra = text || prefix.length === 0;
  return [...prefix, ...flattened, ...(hasExtra ? ["$9"] : [])];
}
//@ chunk-h2y5xkdx.js:64905-67976 layout
function analyzeSshArg(state, program, optionLetter, optionValue, text, verdict) {
  if (!isBotProtectionOn()) {
    for (let sawRemote of optionLetter) {
      let replaced = program.replace(/%[a-z]/gi, sawRemote);
      let hostCandidates = analyzeNestedShellText(state, replaced, verdict, false);
      if (hostCandidates !== null) return hostCandidates;
    }
    return null;
  }
  let filtered = normalizeCaseForComparison_2(program.match(/%[%a-z]/gi) ?? []).filter((arg) =>
    SSH_PLAIN_PLACEHOLDER_RE.test(arg),
  );
  let entry = normalizeCaseForComparison_2(optionValue);
  let snippet = [new Map()];
  let reduced = filtered.reduce((acc, arg) => acc * (arg === "%j" ? entry.length + 1 : entry.length), 1);
  let max = Math.max(0, ...entry.map((arg) => arg.length));
  let match = program.length + countWhere(program.split(""), (arg) => arg === "%") * max;
  verdict.sshTextBudget.left -= filtered.length && reduced * (match + 100);
  if (verdict.sshTextBudget.left < 0)
    return `${unverifiableRunReason(state, "with too many possible host and user values for its % tokens")}; write the host and user out in place of the tokens, or give fewer host, user and jump values`;
  for (let arg of filtered)
    snippet = snippet.flatMap((placeholderValue) =>
      (arg === "%j" ? ["", ...entry] : entry).map((values) => new Map(placeholderValue).set(arg, values)),
    );
  let fallback = (arg) =>
    program.replace(/%[%a-z]/gi, (templateChar, name) =>
      templateChar === "%%"
        ? "%"
        : (arg.get(templateChar) ??
          (/\w/.test(program[name - 1] ?? "") || /\w/.test(program[name + 2] ?? "")
            ? "$9"
            : templateChar === "%p"
              ? "22"
              : "x")),
    );
  for (let arg of snippet) {
    let flags = fallback(arg);
    let outer = analyzeNestedShellText(state, flags, verdict, false);
    if (outer !== null)
      return flags.includes("$9") && !program.includes("$9")
        ? `${outer} ($9 there stands for a value computed or not read here; write the host, user or port out in place of the tokens)`
        : outer;
  }
  let found = entry.find((arg) => SSH_HAZARD_CHARS_RE.test(arg));
  if (filtered.length > 0 && found !== undefined)
    return `${unverifiableRunReason(state, `with % tokens that may stand for ${found === "$9" ? "a host or user computed at runtime" : `${shortenForReason(found)}${found.includes(" ") && entry.some((arg) => arg.includes(found.replace(/ /g, "+"))) ? " (ssh reads + in a URI's user as a space)" : ""}, which holds a character (a quote, backslash, equals sign, tilde, caret, brace, #, %, $ or space) this check cannot follow`}`)}; write the host and user out in place of the tokens`;
  if (filtered.includes("%r") && !text)
    return `${unverifiableRunReason(state, "with %r and no user written for each host (-o User does not count)")}; ssh may fill %r from a config file this check does not read (a line there reading User git makes %r git), so write the user out, as user@host`;
  let filtered_2 = normalizeCaseForComparison_2(program.match(/%[%a-z]/gi) ?? []).filter((arg) =>
    SSH_PATH_PLACEHOLDER_RE.test(arg),
  );
  let rule = (arg) => (/[ulL]/.test(arg) ? "this machine" : "a config file");
  let replaced = program.replace(/['"\\]/g, "");
  let reason = (arg) => arg.replace(/['"\\]/g, "").split(/[\s;&|()`{}<>=!$@]+/);
  let found_2 = [
    ...reason(replaced).map(programBaseName),
    ...snippet
      .flatMap((arg) => reason(fallback(arg)))
      .map((arg) =>
        basename(arg)
          .toLowerCase()
          .replace(/\.(?:exe|bat|cmd)$/, ""),
      ),
  ].find((arg) => EXEC_WRAPPER_NAMES.has(arg));
  if (found_2 !== undefined && filtered_2[0] !== undefined) {
    let command = filtered_2[0];
    return `${unverifiableRunReason(state, `with ${command} and the word ${found_2}, the name of a program that runs its arguments as a command`)}; ssh fills ${command} from ${rule(command)}, which this check does not read, so write the value out in place of ${command}`;
  }
  for (let command of filtered_2) {
    let regExp = new RegExp(`[^\\s;&|()\`=<>]*${command}[^\\s;&|()\`=<>]*`, "g");
    if (
      (program.match(regExp) ?? []).some(
        (remote) => /[\\#]/.test(remote) || (/['"]/.test(remote) && /[\\#]/.test(program)),
      )
    )
      return `${unverifiableRunReason(state, `with ${command} in a word this check cannot rewrite, as it or the setting holds a backslash or #`)}; ssh fills ${command} from ${rule(command)}, which this check does not read, so write the value out in place of ${command}`;
    let mapped = snippet.map((text) =>
      fallback(new Map(text).set(command, "\x00")).replace(
        new RegExp("[^\\s;&|()`=<>]*\\0[^\\s;&|()`=<>]*", "g"),
        (text) => `${text.replace(/[^'"]/g, "")}${EXEC}`,
      ),
    );
    for (let remote of normalizeCaseForComparison_2(mapped)) {
      let text = analyzeNestedShellText(state, remote, verdict, false);
      if (text !== null)
        return verdict.sshTextBudget.left < 0
          ? text
          : `${unverifiableRunReason(state, `with ${command} where a program's name may go`)}; ssh fills ${command} from ${rule(command)}, which this check does not read, so write the program's name in place of ${command}`;
    }
  }
  return null;
}
//@ chunk-h2y5xkdx.js:67976-70064 placement
function analyzeSshArgs(args, startIdx, hasHost, state) {
  let mapped = args.map((arg) => (arg.value.kind === "literal" ? arg.value.text : null));
  let hostFound = hasHost;
  let isRemoteHost = false;
  let commandAt = -1;
  let entry = "";
  let hostParts = [];
  let hostPartList = [];
  let hostPart = [];
  let reason = false;
  for (let idx = startIdx; idx < args.length; idx++) {
    let text = mapped[idx] ?? null;
    let operandIdx = text === "--" && !hostFound ? idx + 1 : idx;
    if (
      operandIdx + 1 < args.length &&
      (!hostFound ||
        (mapped[operandIdx + 1] ?? "-").startsWith("-") ||
        mayExpandToNothing(args[operandIdx + 1].node)) &&
      mayExpandToNothing(args[operandIdx].node)
    )
      return {
        detail: unverifiableRunReason("ssh", `with ${emptyExpansionReason(args[operandIdx])}`),
      };
    if (text !== "--" && text?.[0] === "-" && mayExpandToNothing(args[idx].node))
      return {
        detail: unverifiableRunReason(
          "ssh",
          `with ${shortenForReason(args[idx].node.text)}, a pattern that may expand to file names ssh reads as options (quote it)`,
        ),
      };
    let isOperand = text === null ? !isRefusedValue(args[idx]) : text[0] !== "-";
    if (text === "--" || isOperand) {
      let hostIdx = text === "--" ? idx + 1 : idx;
      if (!hostFound && hostIdx < args.length) {
        hostFound = true;
        isRemoteHost ||= mapped[hostIdx] === null || isRemoteSshHost(mapped[hostIdx] ?? "");
        hostParts.push(mapped[hostIdx] ?? "");
        entry = mapped[hostIdx] ?? "";
        if (text !== "--") continue;
        hostIdx++;
      }
      commandAt = hostIdx < args.length ? hostIdx : -1;
      break;
    }
    let optionMatch = text === null ? null : SSH_OPTION_RE.exec(text);
    if (!optionMatch)
      return {
        detail: unverifiableRunReason(
          "ssh",
          `with ${text ?? `${describeWordValue(args[idx].value)} ${OPTION_POSITION_NOTE}`}`,
        ),
      };
    let [, optionLetters, inlineValue] = optionMatch;
    if (!optionLetters) continue;
    let optionValue = inlineValue
      ? {
          kind: "literal",
          text: inlineValue,
        }
      : args[++idx]?.value;
    if (!optionValue || optionValue.kind === "refuse")
      return {
        detail: optionValue ? optionValue.detail : unverifiableRunReason("ssh", `with ${text}`),
      };
    if (optionValue.kind === "dynamic") {
      if (/[oFSOJI]/.test(optionLetters))
        return {
          detail: unverifiableRunReason("ssh", `with -${optionLetters} ${describeWordValue(optionValue)}`),
        };
      if (isStrictDynamicValuesEnabled() && !isFullyStaticValue(args[idx]))
        return {
          detail: unverifiableRunReason(
            "ssh",
            `with ${describeComputedValue("ssh", `-${optionLetters}`, args[idx])}`,
          ),
        };
      if (optionLetters === "l") hostParts.push("");
      continue;
    }
    let optionLetter2 = optionLetters === "o" ? describeQuotedOption("ssh", optionValue.text) : null;
    if (optionLetter2 !== null)
      return {
        detail: optionLetter2,
      };
    let [, configKey = "", configValue = ""] =
      optionLetters === "o"
        ? (SED_COMMAND_PARTS_RE.exec(optionValue.text) ?? [])
        : ["", optionLetters, optionValue.text];
    let key = optionLetters === "o" ? analyzeSshOption("ssh", optionValue.text, args[idx].node) : null;
    if (key !== null)
      return {
        detail: key,
      };
    isRemoteHost ||= /^hostname$/i.test(configKey) && isRemoteSshHost(configValue.trim());
    if (/^(?:hostname|user)$/i.test(configKey) || configKey === "l") hostParts.push(configValue.trim());
    reason ||= optionLetters === "l";
    if (/^(?:hostname|user|hostkeyalias|proxyjump)$/i.test(configKey) || /^[lJ]$/.test(configKey))
      hostPartList.push(configValue);
    if (/^canonicalizehostname$/i.test(configKey) && !/^no$/i.test(configValue.trim()))
      hostPartList.push("$9");
    if (/command$/i.test(configKey)) hostPart.push([configKey, configValue]);
    else if (
      configKey === "" ||
      (/[oFSI]/.test(optionLetters) && isDevicePath(configValue)) ||
      (optionLetters === "F" && state.inputAssembled && isOpaquePathArgument(configValue, state))
    )
      return {
        detail: unverifiableRunReason("ssh", `with -${optionLetters} ${shortenForReason(optionValue.text)}`),
      };
    let report = describeSshOptionValue("ssh", configKey, configValue);
    if (report !== null)
      return {
        detail: report,
      };
  }
  let sub =
    hostParts.length > 0 && !hostParts.includes("")
      ? hostParts.flatMap((hostText) => hostText.split("@"))
      : ["$9"];
  let key = collectCandidates(
    [...hostParts, ...hostPartList],
    hasHost || !hostFound || hostParts.includes(""),
  );
  for (let [candidate, hostSegment] of hostPart) {
    let detail = analyzeSshArg(
      `ssh -o ${candidate}`,
      hostSegment,
      sub,
      key,
      reason || ghIsDangerousCallback("ssh", entry),
      state,
    );
    if (detail !== null)
      return {
        detail,
      };
  }
  let entryText = describeSshOptionValue("ssh", DESTINATION_LABEL, stripSshPrefix(entry));
  if (entryText !== null)
    return {
      detail: entryText,
    };
  return {
    commandAt,
    local: isRemoteHost,
  };
}
//@ chunk-h2y5xkdx.js:70064-70132 layout
function analyzeSsh(out, option, outText) {
  return !isPlainWord(outText) && isLabelNodeType()
    ? unverifiableRunReason(out, `with ${describeComputedValue(out, option, outText)}`)
    : null;
}
//@ chunk-h2y5xkdx.js:70132-70256 layout
var HOST_PLACEHOLDER = /^--(?:ssh-flag|scp-flag|flags-file)/;
var SFTP_REMOTE_RE = /^(?:app|cloud-shell|instances|queued-resources|tpu-vm|tpus|workstations)$/;
//@ chunk-h2y5xkdx.js:70256-70394 layout
function analyzeSftp(scope, out) {
  return (
    (isLabelNodeType() ? /^(?:alpha|beta|compute|-.*)$/s : /^(?:alpha|beta|compute|-.*)$/).test(
      scope[out] ?? "",
    ) || /^--[^=]+$/.test(scope[out - 1] ?? "")
  );
}
//@ chunk-h2y5xkdx.js:70394-70475 layout
function describePortValue(out) {
  let [, ...option] = out.node.children;
  return option.length === 1
    ? {
        ...out,
        node: option[0],
      }
    : out;
}
//@ chunk-h2y5xkdx.js:70475-71520 layout
function analyzeSshPort(out, option, state) {
  if (!isLabelNodeType()) return;
  let found = out.find(
    ({ node }, value) => option[value] === null && HOST_PLACEHOLDER.test(node.text.replace(/["'\\]/g, "")),
  );
  if (found)
    return unverifiableRunReason(
      "gcloud",
      `with ${shortenForReason(found.node.text)}, whose computed value may pass options to ssh or scp that this check cannot read`,
    );
  let dirs;
  let opts = false;
  let seen = false;
  for (let [entry, candidate] of option.entries()) {
    if (candidate !== null) {
      opts ||= candidate === "ssh" && dirs !== undefined && !seen;
      let match =
        seen && GCLOUD_OUTPUT_FLAGS.has(option[entry - 1] ?? "") && !/^(?:-.*|true|false)$/s.test(candidate);
      if (analyzeSftp(option, entry) && !match) continue;
      if (SFTP_REMOTE_RE.test(candidate)) {
        seen = true;
        continue;
      }
      break;
    }
    let text = out[entry];
    let flags =
      text.node.type === "concatenation" ? /^(--[^=]+)=$/.exec(text.node.children[0]?.text ?? "") : null;
    let nodeText = flags?.[1] ?? option[entry - 1] ?? "";
    let reason = flags !== null || GCLOUD_COMMON_FLAGS.has(nodeText);
    if (!isPlainWord(flags ? describePortValue(text) : text)) {
      if (!state.simple && !isPlainOrInertValue(text.value)) return;
      return unverifiableRunReason(
        "gcloud",
        `with a computed ${reason ? `${nodeText} value` : "word before its command names"} ${describeWordRefusal(nodeText, text)}, and its words may spell out compute ssh and options for ssh,`,
      );
    }
    opts ||= !reason;
    dirs ??= text;
  }
  return dirs && opts
    ? unverifiableRunReason(
        "gcloud",
        `with ${describeWordValue(dirs.value)} before its command names, where this check cannot tell whether the command runs ssh (spell the command names out first and put computed values after them, as --project="$p")`,
      )
    : undefined;
}
//@ chunk-h2y5xkdx.js:71520-72368 placement
/**
 * gcloud 通用选项；Gi 是输出相关选项；Mi/zi 是 kubectl 通用与压缩选项，Hi/Ui 是带凭据/秘密值的选项正则。用于判定云命令参数是否影响目标。
 */
var BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN; // deferred: uses wordSet (./shellState.js) of its import cycle while loading; runs once the cycle is complete
var GCLOUD_COMMON_FLAGS;
var GCLOUD_OUTPUT_FLAGS;
var KUBECTL_GLOBAL_FLAGS;
var KUBECTL_COMPRESSION_FLAGS;
var KUBECTL_CREDENTIAL_RE;
var KUBECTL_VALUE_FLAGS_RE;
deferInit("chunk-h2y5xkdx.js:71520", () => {
  BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN = "bot_protected_tengu_buzzing_fountain";
  GCLOUD_COMMON_FLAGS = wordSet(
    "--access-token-file --account --authority-selector --authorization-token-file --billing-project --configuration --flatten --format --http-timeout --impersonate-service-account --project --trace-token --universe-domain --verbosity",
  );
  GCLOUD_OUTPUT_FLAGS = wordSet(
    "-q --quiet --log-http --no-log-http --user-output-enabled --no-user-output-enabled",
  );
  KUBECTL_GLOBAL_FLAGS = wordSet(
    "--as --as-group --as-uid --as-user-extra --cluster --context -n --namespace --request-timeout --user",
  );
  KUBECTL_COMPRESSION_FLAGS = wordSet("--disable-compression --match-server-version --warnings-as-errors");
  KUBECTL_CREDENTIAL_RE = /^--credential-file-override(?:=|$)/;
  KUBECTL_VALUE_FLAGS_RE =
    /^(?:-[itq]*s|--(?:cache[-_]dir|certificate[-_]authority|client[-_]certificate|client[-_]key|insecure[-_]skip[-_]tls[-_]verify|kubeconfig|kuberc|password|profile|profile[-_]output|proxy[-_]url|server|tls[-_]server[-_]name|token|username)(?:=|$))/;
});
//@ chunk-h2y5xkdx.js:72368-72601 placement
function hasRiskyOptionWord(words, literals, startIdx, valueFlagPattern) {
  let index = literals.indexOf("--", startIdx);
  return words
    .slice(startIdx, index === -1 ? undefined : index)
    .some(
      ({ node }, offset) =>
        hasChildWordGlob(node) ||
        [node, ...node.children].some((part) => part.type === "brace_expression") ||
        valueFlagPattern.test(
          literals[startIdx + offset] ??
            (/^[$'"\\]*-/.test(node.text) ? node.text.replace(SHELL_QUOTE_CHARS_RE, "") : ""),
        ),
    );
}
//@ chunk-h2y5xkdx.js:72601-72958 placement
/**
 * 拼出命令的程序词序列（跳过带值选项及其参数、忽略的词），到目标词为止；值缺失或可疑时返回空串。
 */
function collectProgramWords(words, target, valueFlags, ignoredFlags, allowQuotedValue) {
  let collected = [];
  for (let k = 0; k < words.length; k++) {
    let { node, value } = words[k];
    let text = value.kind === "literal" ? value.text : isQuotedLiteral(node) ? node.text : "-";
    let replaced = text.replace(/=.*$/s, "");
    if (valueFlags.has(replaced)) {
      if (replaced === text) {
        k++;
        let nextWord = words[k];
        if (
          !nextWord ||
          (nextWord.value.kind === "literal"
            ? nextWord.value.text.startsWith("-") || mayExpandToNothing(nextWord.node)
            : !allowQuotedValue || !isQuotedLiteral(nextWord.node))
        )
          return "";
      }
    } else if (!ignoredFlags.has(text)) {
      collected.push(text);
      if (text === target) break;
    }
  }
  return collected.join(" ");
}
//@ chunk-h2y5xkdx.js:72958-77743 placement
/**
 * 检查 ssh/rlogin/kubectl 等"在别处执行命令"的程序：目标可能是本机或参数无法静态判定时拒绝。
 */
function analyzeRemoteShellCommand(program, args, state, stdinInfo) {
  let mapped = args.map((arg) => (arg.value.kind === "literal" ? arg.value.text : null));
  switch (program) {
    case "rlogin":
    case "ssh": {
      let sshResult = analyzeSshArgs(args, 0, false, state);
      if ("detail" in sshResult) return sshResult.detail;
      if (!sshResult.local) return null;
      if (sshResult.commandAt === -1)
        return stdinInfo.fed
          ? unverifiableRunReason(
              "ssh",
              "with a shell on what may be this machine reading its commands from stdin",
            )
          : null;
      let afterCommand = mapped.slice(sshResult.commandAt);
      let nonLiteral = args.slice(sshResult.commandAt).find((arg) => arg.value.kind !== "literal");
      return nonLiteral
        ? unverifiableRunReason(
            "ssh",
            `with a command for what may be this machine computed at runtime (${describeWordValue(nonLiteral.value)})`,
          )
        : analyzeNestedShellText("ssh", afterCommand.join(" "), state, stdinInfo.fed);
    }
    case "kubectl":
    case "oc": {
      let execIdx = mapped.indexOf("exec");
      let dashIdx = mapped.indexOf("--");
      if (execIdx === -1 || dashIdx < execIdx) return;
      let isCleanExec =
        !readFlagWithOverride(BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN, {
          safe: true,
        }) ||
        (collectProgramWords(args, "exec", KUBECTL_GLOBAL_FLAGS, KUBECTL_COMPRESSION_FLAGS, true) ===
          "exec" &&
          !hasRiskyOptionWord(args, mapped, execIdx + 1, KUBECTL_VALUE_FLAGS_RE));
      for (let [idx, literal] of mapped.entries()) {
        let reason =
          idx > dashIdx
            ? literal !== null && /\bgit\b/i.test(literal.replace(SHELL_QUOTE_CHARS_RE, ""))
              ? `remote text naming git (${shortenForReason(literal)}), which cannot be shown to stay inside the worktree`
              : null
            : literal === null
              ? stdinInfo.assembled || /[<>]\(/.test(args[idx].node.text)
                ? `${describeWordValue(args[idx].value)} next to input assembled at runtime`
                : !isPlainWord(args[idx]) && isLabelNodeType()
                  ? `a computed word before -- ${describeWordRefusal("--", args[idx])}, and a -- among its words would start a pod command this check does not read,`
                  : null
              : stdinInfo.assembled && isDevicePath(literal)
                ? `${literal} naming a descriptor fed here`
                : null;
        if (reason !== null) return unverifiableRunReason(`${program} exec`, `with ${reason}`);
      }
      let rest = args.slice(dashIdx + 1);
      if (state.simple) {
        let reason = checkLauncherInvocation(program, rest, state, stdinInfo);
        return isCleanExec ? reason : (reason ?? undefined);
      }
      let tail = mapped.slice(dashIdx + 1);
      let stopIdx = tail.findIndex((word) => SHELL_PROGRAM_NAMES.has(programBaseName(word ?? "-")));
      let start = findShellCommandStringIndex(tail, stopIdx);
      let candidate = rest.find(
        (word, idx) => (start === -1 || idx < stopIdx || idx > start) && !isPlainOrInertValue(word.value),
      );
      let reason = candidate
        ? unverifiableRunReason(`${program} exec`, `with ${describeWordValue(candidate.value)}`)
        : stdinInfo.fed && stdinInfo.assembled
          ? unverifiableRunReason(`${program} exec`, "with input assembled at runtime")
          : start === -1
            ? null
            : analyzeNestedShellText(programBaseName(tail[stopIdx]), tail[start], state, stdinInfo.fed);
      return isCleanExec ? reason : (reason ?? undefined);
    }
    case "gcloud": {
      let sshIdx = mapped.indexOf("ssh");
      let gate = readFlagWithOverride(BOT_PROTECTED_TENGU_BUZZING_FOUNTAIN, {
        safe: true,
      });
      let beforeIdx = mapped
        .slice(0, sshIdx)
        .findIndex(
          (entry, idx) => entry !== null && !analyzeSftp(mapped, idx) && !mayExpandToNothing(args[idx].node),
        );
      let isComputeSsh = sshIdx > 0 && mapped.slice(0, sshIdx).includes("compute");
      let isWellFormed = !isComputeSsh || beforeIdx >= 0;
      let emptyExpansionWord =
        isComputeSsh &&
        args
          .slice(0, beforeIdx < 0 ? sshIdx : beforeIdx)
          .find(
            ({ node: flagEntry }) =>
              mayExpandToNothing(flagEntry) && !/^--?[\w-]+=[^*?[]*$/.test(flagEntry.text),
          );
      if (emptyExpansionWord)
        return unverifiableRunReason(
          "gcloud",
          `with ${describeWordValue(emptyExpansionWord.value)} before the word ssh: it may expand to no word at all and the next word would take its place, so this cannot tell what gcloud will run (spell the value out)`,
        );
      let hasNullBefore = mapped.slice(0, sshIdx).includes(null);
      let flagOn = readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
        safe: true,
      });
      if (isWellFormed || hasNullBefore) {
        let match = findMatching(mapped, HOST_PLACEHOLDER);
        if (match !== null) return unverifiableRunReason("gcloud", `with ${match}`);
        let computeWordIdx = mapped.indexOf("compute");
        let precedingWord = mapped[sshIdx - 1];
        let overrideReason =
          (gate &&
          sshIdx > 0 &&
          (precedingWord === null || precedingWord?.startsWith("-")) &&
          sshIdx < computeWordIdx &&
          mapped.includes("ssh", computeWordIdx)
            ? unverifiableRunReason(
                "gcloud",
                GCLOUD_COMMON_FLAGS.has(precedingWord ?? "")
                  ? `with ssh as the separate value of ${precedingWord} before compute (write ${precedingWord}=ssh instead)`
                  : "with ssh both before and after compute, where either could be the subcommand (join a flag's value to it with =, or drop the extra ssh)",
              )
            : undefined) ?? analyzeSshPort(args, mapped, state);
        if (!flagOn) return overrideReason;
        if (isWellFormed) {
          let doubleDashIdx = sshIdx < 0 ? -1 : mapped.indexOf("--", sshIdx);
          if (doubleDashIdx < 0) return overrideReason;
          let sshResult = analyzeSshArgs(args, doubleDashIdx + 1, true, state);
          return "detail" in sshResult
            ? sshResult.detail
            : sshResult.local
              ? unverifiableRunReason("gcloud", "with ssh pointed at what may be this machine")
              : overrideReason;
        }
      }
      let isCleanSshSubcommand =
        !gate ||
        (/^(?:(?:alpha|beta) )?compute ssh$/.test(
          collectProgramWords(args, "ssh", GCLOUD_COMMON_FLAGS, GCLOUD_OUTPUT_FLAGS, false),
        ) &&
          !hasRiskyOptionWord(args, mapped, sshIdx + 1, KUBECTL_CREDENTIAL_RE));
      let sshWords = [];
      let doubleDashPos = 1 / 0;
      for (let entry = 0; entry < args.length; entry++) {
        let literal = mapped[entry] ?? null;
        if (gate && (entry <= sshIdx ? /^--(?:scp|ssh)-flag/ : /^--scp-flag/).test(literal ?? ""))
          return unverifiableRunReason(
            "gcloud",
            `with ${shortenForReason(literal ?? "")} (${/^--scp/.test(literal ?? "") ? "--scp-flag hands options to scp, which can run a local program; drop it" : "put --ssh-flag after the word ssh"})`,
          );
        if (entry <= sshIdx) {
          if (/^--flags-file/.test(literal ?? "") || isDevicePath(literal ?? ""))
            return unverifiableRunReason("gcloud compute ssh", `with ${literal}`);
          if (flagOn && /^--(?:ssh|scp)-flag/.test(literal ?? ""))
            return unverifiableRunReason("gcloud", `with ${shortenForReason(literal ?? "")} before ssh`);
          if (
            flagOn &&
            literal === null &&
            isUnverifiableValue(args[entry]) &&
            !/^--(?!flags-file|ssh-flag|scp-flag)[\w-]+=$/.test(args[entry].node.children[0]?.text ?? "")
          )
            return unverifiableRunReason(
              "gcloud",
              `with ${describeWordValue(args[entry].value)} before ssh, which may be a flag of its own (spell it out)`,
            );
          continue;
        }
        if (literal === "--") {
          doubleDashPos = sshWords.length;
          sshWords.push(...args.slice(entry + 1));
          break;
        }
        if (literal === null) {
          let arg = args[entry];
          let nodeText =
            arg.node.type === "concatenation"
              ? /^(--(?:command|zone|project))=$/.exec(arg.node.children[0]?.text ?? "")
              : null;
          if (nodeText) {
            let flagMatch = analyzeSsh("gcloud compute ssh", nodeText[1], describePortValue(arg));
            if (flagMatch !== null) return flagMatch;
          } else if (isUnverifiableValue(arg))
            return unverifiableRunReason(
              "gcloud compute ssh",
              `with ${describeWordValue(arg.value)} ${OPTION_POSITION_NOTE}`,
            );
          continue;
        }
        let continueNote = /^--(command|zone|project|ssh-flag)(?:=(.*))?$/s.exec(literal);
        if (!continueNote) {
          if (/^--flags-file/.test(literal) || isDevicePath(literal))
            return unverifiableRunReason("gcloud compute ssh", `with ${literal}`);
          if (
            /^-[^-]/.test(literal) &&
            !/^-[qh]$/.test(literal) &&
            readFlagWithOverride(BOT_PROTECTED_TENGU_HUSHED_HYPHEN, {
              safe: true,
            })
          )
            return unverifiableRunReason(
              "gcloud compute ssh",
              `with ${shortenForReason(literal)} before any -- (gcloud takes only its own flags there; words meant for ssh go after a literal --)`,
            );
          continue;
        }
        let configValue = continueNote[2] ?? mapped[++entry];
        if (continueNote[1] !== "ssh-flag") {
          let value =
            configValue === null
              ? analyzeSsh("gcloud compute ssh", `--${continueNote[1]}`, args[entry])
              : null;
          if (value !== null) return value;
          continue;
        }
        if (typeof configValue !== "string")
          return unverifiableRunReason(
            "gcloud compute ssh",
            `with --ssh-flag ${configValue === null ? describeWordValue(args[entry].value) : "lacking its value"}`,
          );
        for (let word of configValue.trim().split(/\s+/))
          sshWords.push({
            node: args[entry].node,
            value: {
              kind: "literal",
              text: word,
            },
          });
      }
      let sshResult = analyzeSshArgs(sshWords, 0, true, state);
      return "detail" in sshResult
        ? sshResult.detail
        : sshResult.local
          ? unverifiableRunReason("gcloud compute ssh", "pointed at what may be this machine")
          : sshResult.commandAt !== -1 && sshResult.commandAt < doubleDashPos
            ? unverifiableRunReason(
                "gcloud compute ssh",
                "with an --ssh-flag word ssh would not read as an option",
              )
            : hasNullBefore || !isCleanSshSubcommand
              ? undefined
              : null;
    }
    default:
      return;
  }
}
//@ chunk-h2y5xkdx.js:77743-77797 placement
var TENGU_COMPOSED_TEACUP = "tengu_composed_teacup";
var TENGU_WOOLLY_WALL = "tengu_woolly_wall";
//@ chunk-h2y5xkdx.js:77797-81255 placement
function analyzeRsyncScp(program, args, state) {
  let mapped = args.map((arg) => (arg.value.kind === "literal" ? arg.value.text : null));
  let optionPattern =
    program === "rsync"
      ? readFlagWithOverride(TENGU_COMPOSED_TEACUP, {
          safe: true,
        })
        ? /^(?:-[^-]*?(e)|--(?:rsh|rsync-path)(?==|$))=?(.*)$/s
        : /^(?:-[^-]*(e)|--(?:rsh|rsync-path)(?==|$))=?(.*)$/s
      : /^(?:scp|rcp|sftp)$/.test(program)
        ? /^-[^-]*?([oSD])(.*)$/s
        : null;
  if (!optionPattern) return null;
  let portPattern = program === "sftp" ? SFTP_OPTION_RE : program === "rsync" ? null : SCP_OPTION_RE;
  let flattened = mapped.flatMap((literal) =>
    literal !== null && /^[^-/][^:/]*:/.test(literal) ? [literal] : [],
  );
  let hostCandidates = flattened.find(
    (target) => /[^\w.,:\/@~+=-]/.test(target) && isRemoteSshHost(target.replace(/:.*$/s, "")),
  );
  if (hostCandidates !== undefined)
    return unverifiableRunReason(program, `with ${shortenForReason(hostCandidates)}`);
  let candidates =
    flattened.length > 0 &&
    mapped.every((literal) => !/^(?:-\w*o)?\W*(?:hostname|user)/i.test(literal ?? "user"))
      ? flattened.flatMap((target) => target.replace(/:.*$/s, "").split("@"))
      : ["$9"];
  let flagIdx = 0;
  while (LEADING_OPTION_ONLY_RE.test(mapped[flagIdx] ?? ""))
    flagIdx += LEADING_OPTION_END_RE.test(mapped[flagIdx]) ? 2 : 1;
  let remoteTargets =
    program === "sftp"
      ? []
      : mapped.slice(flagIdx).flatMap((flag) => (flag !== null && /^-[^:/]*:/.test(flag) ? [flag] : []));
  let targetStart = program === "sftp" ? 0 : mapped.length;
  while (/^-./s.test(mapped[targetStart] ?? "") && mapped[targetStart] !== "--")
    targetStart += SFTP_OPTION_RE.exec(mapped[targetStart])?.[2] === "" ? 2 : 1;
  let sliced = mapped.slice(targetStart + (mapped[targetStart] === "--" ? 1 : 0));
  let targets = program === "sftp" ? sliced.slice(0, 1) : [...flattened, ...remoteTargets];
  let allDangerous =
    targets.length > 0 &&
    targets.every((target) => ghIsDangerousCallback(program === "sftp" ? "sftp" : "scp", target ?? ""));
  let hostStrings = collectCandidates(
    [
      ...(program === "sftp"
        ? [
            ...sliced,
            ...mapped
              .slice(-2)
              .filter(
                (arg, index) =>
                  index === 1 || !/^-\w*o$/.test(mapped.at(-3) ?? "") || !/[\s%]/.test(arg ?? ""),
              ),
          ].flatMap((arg) => [(arg ?? "").replace(/:.*$/s, ""), (arg ?? "").replace(/[:/].*$/s, "")])
        : []),
      ...[...flattened, ...remoteTargets].flatMap((target) => [
        ...stripUserPart(target),
        target.replace(/:.*$/s, ""),
        ...(/\]:/.test(target) ? [target.replace(/\]:.*$/s, "]")] : []),
        ...(/^\w+:\/\//.test(target) ? [target.replace(/^(\w+:\/\/[^/]*).*$/s, "$1")] : []),
      ]),
      ...mapped.flatMap((arg, index) => {
        let rshValue =
          /^-\w*?o(.+)$/s.exec(arg ?? "")?.[1] ?? (/^-\w*o$/.test(mapped[index - 1] ?? "") ? arg : null);
        let [, hostPart = "", userPart = ""] = SED_COMMAND_PARTS_RE.exec(rshValue ?? "") ?? [];
        let portPart = program === "rsync" ? null : /^-\w*?J(.*)$/s.exec(arg ?? "");
        return /^(?:hostname|user|hostkeyalias|proxyjump)$/i.test(hostPart)
          ? userPart
          : /^canonicalizehostname$/i.test(hostPart) && !/^no$/i.test(userPart.trim())
            ? "$9"
            : portPart
              ? portPart[1] || mapped[index + 1] || []
              : /^[^-\s:]+@[^\s:]+$/.test(arg ?? "")
                ? arg
                : [];
      }),
    ],
    candidates[0] === "$9",
  );
  let hasExplicitHost = readFlagWithOverride(TENGU_WOOLLY_WALL, {
    safe: true,
  });
  for (let text = 0; text < mapped.length; text++) {
    if (mapped[text] === null) {
      if (hasExplicitHost && isUnverifiableValue(args[text]))
        return unverifiableRunReason(
          program,
          `with ${describeWordValue(args[text].value)} ${OPTION_POSITION_NOTE_LONG}`,
        );
      continue;
    }
    let opt = portPattern?.exec(mapped[text]);
    if (opt && /[FJ]/.test(opt[1])) {
      let reason = opt[2] || mapped[text + 1];
      let optionValue =
        reason === null
          ? readFlagWithOverride(BOT_PROTECTED_TENGU_GLEAMING_TOME, {
              safe: true,
            })
            ? `${unverifiableRunReason(program, `with -${opt[1]} ${describeWordValue(args[text + 1].value)}`)} (to pass, spell the value out)`
            : null
          : reason === undefined
            ? null
            : describeSshOptionValue(program, opt[1], reason);
      if (optionValue !== null) return optionValue;
    }
    let match = optionPattern.exec(mapped[text]);
    if (!match) continue;
    let flagEnabled = /^--[\w-]+=$/.test(mapped[text]) && isBotProtectionOn();
    let optionValue = match[2] || (flagEnabled ? "" : mapped[++text]);
    if (typeof optionValue !== "string")
      return unverifiableRunReason(
        program,
        `with ${match[0]} ${optionValue === null ? describeWordValue(args[text].value) : "lacking its value"}`,
      );
    let isRshOption =
      program === "rsync" &&
      /^(?:--rsh|-[^-BfMT@]*e)/.test(match[0]) &&
      readFlagWithOverride(BOT_PROTECTED_TENGU_GLEAMING_TOME, {
        safe: true,
      })
        ? describeShellTextProblem(`${program} ${match[0]}`, optionValue, state)
        : match[1] === "o"
          ? describeQuotedOption(program, optionValue)
          : null;
    if (isRshOption !== null) return isRshOption;
    let [, configKey = "", rshReason = ""] =
      match[1] === "o" ? (SED_COMMAND_PARTS_RE.exec(optionValue) ?? []) : ["", "Command", optionValue];
    let rshCommand = match[1] === "o" ? analyzeSshOption(program, optionValue, args[text].node) : null;
    if (rshCommand !== null) return rshCommand;
    if (/command$/i.test(configKey)) {
      let unquotedCommand = match[1] !== "o" && isBotProtectionOn();
      let commandText = rshReason.replace(/["']/g, "");
      if (unquotedCommand && /[^\w .,:/=@+~-]/.test(commandText) && /command/i.test(commandText)) {
        let pastedCommand = match[1] ? `-${match[1]}` : match[0].replace(/=.*$/s, "");
        return `${unverifiableRunReason(`${program} ${pastedCommand}`, "with a program that sets a command (such as ProxyCommand) and holds more than plain words, which this check cannot follow")}; write that command in plain words, with the host and user spelled out`;
      }
      let prefix = `${program} ${match[0]}`;
      let verdict = unquotedCommand
        ? analyzeNestedShellText(prefix, rshReason, state, false)
        : analyzeSshArg(prefix, rshReason, candidates, hostStrings, allDangerous, state);
      if (verdict !== null) return verdict;
    } else if (configKey === "" || isDevicePath(rshReason))
      return unverifiableRunReason(program, `with -o ${shortenForReason(optionValue)}`);
    else {
      let userReason = /^User$/i.test(configKey)
        ? describeSshUser(program, rshReason.trimEnd(), false)
        : describeSshOptionValue(program, configKey, rshReason);
      if (userReason !== null) return userReason;
    }
  }
  if (program !== "sftp") return null;
  let atArg = false;
  for (let arg = 0; arg < mapped.length; arg++) {
    let text = mapped[arg] ?? null;
    if (text !== null && (text[0] !== "-" || atArg)) {
      let text_2 = SFTP_SOURCE_RE.exec(text);
      let matched = text_2?.[1] ?? text_2?.[3] ?? /^(.*)@/s.exec(text_2?.[5] ?? "")?.[1] ?? "";
      return (
        describeSshUser(program, matched, text_2?.[1] !== undefined) ??
        describeSshOptionValue(program, DESTINATION_LABEL, text_2?.[2] ?? text_2?.[4] ?? text_2?.[5] ?? "")
      );
    }
    atArg ||= text === "--";
    if (SFTP_OPTION_RE.exec(text ?? "")?.[2] === "") arg++;
  }
  return null;
}
//@ chunk-h2y5xkdx.js:81255-81406 placement
var DEBUGGER_MODULES_RE =
  /^(?:timeit|[ip]?[pu]db|[iI][pP]ython|[bp]t?python|idlelib.*|code|trace|cProfile|profile|asyncio|_pyrepl|runpy|unittest|irb|debug|pry|byebug)$/;
//@ chunk-h2y5xkdx.js:81406-81486 placement
/**
 * 判断词值是普通字面量（不含特殊字符），或不会展开的动态值。
 */
function isPlainOrInertValue(value) {
  return value.kind === "literal" ? isPlainWordText(value.text) : value.kind === "dynamic" && value.inert;
}
//@ chunk-h2y5xkdx.js:81486-81573 placement
/**
 * 除指定下标外，是否还有其他动态且非 inert 的单词。
 */
function hasOtherDynamicWord(words, skipIdx) {
  return words.some((word, idx) => idx !== skipIdx && word.value.kind === "dynamic" && !word.value.inert);
}
//@ chunk-h2y5xkdx.js:81573-81990 placement
/**
 * 某个可能展开为空的单词导致无法判定时，去掉它重新检查；超过 16 个这类单词直接判为无法验证，并在原因中提示加引号或写明文件。
 */
function retryWithoutEmptyWord(wordIndex, program, rules, words, state, context) {
  let word = words[wordIndex];
  if (!word || !mayExpandToNothing(word.node)) return null;
  if (countWhere(words, (word) => mayExpandToNothing(word.node)) > 16)
    return unverifiableRunReason(
      program,
      "with more than 16 words that may expand to no word at all (name the files, or quote the words)",
    );
  let reason = checkInterpreterInvocation(program, rules, words.toSpliced(wordIndex, 1), state, {
    ...context,
    prefixValues: [...context.prefixValues, word.value],
  });
  return reason === null
    ? null
    : `${reason}, since ${shortenForReason(word.node.text)} may expand to no word at all (quote it, or name the files instead of a pattern)`;
}
//@ chunk-h2y5xkdx.js:81990-86190 placement
/**
 * 后台 worktree 守卫：分析解释器调用（python/node/perl 等）能否证明不会运行 git——检查启动相关环境变量、内联代码与模块、选项、脚本操作数及运行时计算的输入，无法证明时返回原因。
 */
function checkInterpreterInvocation(program, rules, words, state, context) {
  let literals = words.map((word) => (word.value.kind === "literal" ? word.value.text : null));
  let stdinFed = state.stdinFed || context.redirects.some(isStdinRedirect);
  let inputAssembled = state.inputAssembled;
  let hasDynamicInput =
    inputAssembled || context.prefixValues.some((prefixValue) => !isPlainOrInertValue(prefixValue));
  let filtered = [...state.startupHazards].filter(([name]) => rules.environment.test(name));
  let found = filtered.find(([, value]) => value);
  if (found || (filtered.length > 0 && (hasDynamicInput || hasOtherDynamicWord(words, -1))))
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
  let isDashZeroAware =
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
  ].some((text) => !!text && mentionsGit(text));
  let inlineProgram;
  let seen = new Set();
  let sawInlineFlag = false;
  let index = 0;
  while (index < words.length) {
    let literal = literals[index] ?? null;
    let inlineMatch = literal === null ? null : rules.inline.exec(literal);
    if (inlineProgram !== undefined && literal === "--") break;
    if (inlineMatch) {
      sawInlineFlag ||= !rules.flag.test("-0") || /^-[anplsw]*[eE]/.test(literal ?? "");
      let last = inlineMatch.slice(1).findLast((capture) => !!capture);
      let programIdx = last === undefined ? index + 1 : -1;
      let programValue =
        last !== undefined
          ? {
              kind: "literal",
              text: last,
            }
          : (words[programIdx]?.value ?? {
              kind: "literal",
              text: "",
            });
      if (programValue.kind === "refuse") return programValue.detail;
      if (programValue.kind === "dynamic")
        return !programValue.inert
          ? unverifiableRunReason(program, `with a program computed at runtime (${programValue.why})`)
          : hasDynamicInput || hasOtherDynamicWord(words, programIdx)
            ? unverifiableRunReason(
                program,
                "with a program pieced together here next to an operand or input computed at runtime",
              )
            : retryWithoutEmptyWord(programIdx, program, rules, words, state, context);
      inlineProgram = `${inlineProgram ?? ""}
${programValue.text}`;
      seen.add(last === undefined ? programIdx : index);
      index += last === undefined ? 2 : 1;
      if (!rules.inlineEndsOptions) continue;
      break;
    }
    if (program === "bun" && literal === "exec")
      return index === 0 && typeof literals[1] === "string" && words.length === 2
        ? analyzeNestedShellText("bun exec", literals[1], state, stdinFed)
        : unverifiableRunReason("bun exec", "with shell text it cannot read");
    if (literal !== null && rules.module.test(literal)) {
      let moduleName = literals[index + 1];
      let any_2 = literals.some((literal, idx) => idx !== index && literal?.[0] === "-");
      let installerOperand =
        /^(?:pip|pipx|ensurepip|easy_install)$/.test(moduleName ?? "") &&
        words.slice(index + 2).find((word) => word.value.kind !== "literal");
      return moduleName === null
        ? unverifiableRunReason(program, `with ${literal} ${describeWordValue(words[index + 1].value)}`)
        : (DEBUGGER_MODULES_RE.test(moduleName ?? "") &&
              (hasDynamicInput || hasOtherDynamicWord(words, -1))) ||
            (inputAssembled && isOpaquePathArgument(moduleName ?? "", state))
          ? unverifiableRunReason(
              program,
              `with ${literal} ${moduleName} next to an operand or input computed at runtime`,
            )
          : installerOperand
            ? unverifiableRunReason(
                program,
                `with ${literal} ${moduleName} installing what a computed operand names (${describeWordValue(installerOperand.value)})`,
              )
            : program !== "bun" && !(any && DEBUGGER_MODULES_RE.test(moduleName ?? ""))
              ? null
              : any ||
                  words.some(
                    ({ value }, idx) =>
                      idx > index &&
                      (value.kind !== "literal"
                        ? !(value.kind === "dynamic" && value.inert)
                        : isDevicePath(value.text) || (any_2 && isGitProgram(programBaseName(value.text)))),
                  )
                ? unverifiableRunReason(program, `with ${literal} ${moduleName}`)
                : checkLauncherInvocation(program, words.slice(index + 1), state, {
                    fed: stdinFed,
                    assembled: inputAssembled,
                  });
    }
    if (
      literal === null
        ? isUnverifiableValue(words[index]) ||
          (isDashZeroAware &&
            isRefusedValue(words[index]) &&
            ((stdinFed && !sawInlineFlag) ||
              words
                .slice(index + 1)
                .some((word) =>
                  word.value.kind === "literal" ? word.value.text.startsWith("-") : isUnverifiableValue(word),
                )))
        : /^-[^-]|^--./.test(literal) && !rules.valued.test(literal) && !rules.flag.test(literal)
    )
      return hasDynamicInput ||
        hasOtherDynamicWord(words, -1) ||
        (literal === null && !isUnverifiableValue(words[index]))
        ? unverifiableRunReason(
            program,
            `with ${literal ?? `${describeWordValue(words[index].value)} (a computed argument goes after the script or --)`} where it cannot tell which operand is the program, next to an operand or input computed at runtime`,
          )
        : any
          ? GIT_TOO_COMPLEX_REASON
          : retryWithoutEmptyWord(index, program, rules, words, state, context);
    let isValueFlag = literal !== null && rules.valued.test(literal);
    if (isValueFlag && index + 1 < words.length && literals[index + 1] === null)
      return unverifiableRunReason(program, `with ${literal} ${describeWordValue(words[index + 1].value)}`);
    let flagText = isValueFlag ? `${literal} ${literals[index + 1] ?? ""}` : (literal ?? "");
    if (
      /^-(?:-interactive\b|[A-Za-z0-9]*r ?(?:irb|debug|pry|byebug)\b)/.test(flagText) &&
      (hasDynamicInput || hasOtherDynamicWord(words, -1))
    )
      return unverifiableRunReason(
        program,
        `with ${flagText.trim()}, a console that reads its program from input or operands computed at runtime`,
      );
    if (isValueFlag || (literal !== null && rules.flag.test(literal))) {
      let match = /(?:^|=)(data:.*)$/is.exec(isValueFlag ? literals[index + 1] : literal);
      inlineProgram = match
        ? `${inlineProgram ?? ""}
${match[1]}`
        : inlineProgram;
      index += isValueFlag ? 2 : 1;
    } else {
      index += literal !== "--" ? 0 : rules.scriptAfterDashes ? 1 : words.length;
      break;
    }
  }
  let retryReason = retryWithoutEmptyWord(index, program, rules, words, state, context);
  if (retryReason !== null) return retryReason;
  let scriptLiteral = index < words.length ? (literals[index] ?? null) : undefined;
  if (inlineProgram === undefined && scriptLiteral !== undefined) {
    if (scriptLiteral === null)
      return inputAssembled || rules.literalScript
        ? unverifiableRunReason(
            program,
            `with a script computed at runtime (${describeWordValue(words[index].value)})`,
          )
        : null;
    if (/^(?:data|https?|npm|jsr):/i.test(scriptLiteral)) {
      inlineProgram = scriptLiteral;
      seen.add(index);
    } else if (rules.console.test(scriptLiteral))
      return hasDynamicInput || hasOtherDynamicWord(words, -1)
        ? unverifiableRunReason(
            program,
            `with ${scriptLiteral}, a console that reads its program from input or operands computed at runtime`,
          )
        : null;
    else if (!isOpaquePathArgument(scriptLiteral, state)) return null;
  }
  if (inlineProgram !== undefined) {
    if (any || mentionsGit(inlineProgram)) return GIT_TOO_COMPLEX_REASON;
    let match = rules.bridge.exec(inlineProgram);
    return match &&
      (hasDynamicInput || words.some((word, idx) => !seen.has(idx) && !isPlainOrInertValue(word.value)))
      ? unverifiableRunReason(
          program,
          `with a program that can start another program (${match[0]}) next to an operand, env value or input that is computed at runtime or not plain text`,
        )
      : null;
  }
  if (inputAssembled)
    return `feeds ${program} a program assembled at runtime ${TOO_COMPLEX_SUFFIX}, so what it runs cannot be shown not to be git`;
  if (any) return GIT_TOO_COMPLEX_REASON;
  return rules.bridge.test(joined) && (hasDynamicInput || hasOtherDynamicWord(words, -1))
    ? unverifiableRunReason(
        program,
        "with a program on a descriptor that can start another program, next to an operand computed at runtime",
      )
    : null;
}
//@ chunk-h2y5xkdx.js:86190-86823 placement
/**
 * find 中只影响匹配的路径谓词。
 */
var FIND_PREDICATE_PATTERN =
  /^(?:-(?:i?name|i?path|i?wholename|i?regex|i?lname|x?type|size|empty|(?:max|min)?depth|[amc](?:time|min)|newer(?:[aBcmt][aBcmt])?|user|group|[ug]id|perm|links|inum|samefile|readable|writable|executable|no(?:user|group)|prune|print0|not|and|or|a|o|true|false|xdev|mount|[LHPE]|regextype|daystart|follow)|[-+]?\d+[bcwkMG]?)$/;
var FIND_PATH_PREDICATE_RE =
  /^-(?:i?name|i?path|i?wholename|i?regex|i?lname|x?type|size|(?:max|min)depth|[amc](?:time|min)|newer(?:[aBcmt][aBcmt])?|user|group|[ug]id|perm|links|inum|samefile|fstype|regextype)$/;
var FIND_SIDE_EFFECT_PREDICATE_RE =
  /^-(?:[acm]newer|B(?:min|newer|time)|context|used|flags|xattrname|files0-from|D|printf|fprintf|fprint0?|fls|f)$/;
//@ chunk-h2y5xkdx.js:86823-87351 placement
/**
 * 判断语句是否为只用安全谓词、带 -print0 的 find 命令（允许文件重定向）。
 */
function isSafeFindPrint0(findStatement, state) {
  let commandNode =
    findStatement?.type === "redirected_statement"
      ? findStatement.children.find((child) => child.type === "command")
      : findStatement;
  if (
    commandNode?.type !== "command" ||
    commandNode.children[0]?.type !== "command_name" ||
    programBaseName(commandNode.children[0].text) !== "find"
  )
    return false;
  let sawPrint0 = false;
  let previousWordText = "";
  return (
    commandNode.children.slice(1).every((child, argIndex) => {
      if (!WORD_NODE_TYPES.has(child.type)) return child.type === "file_redirect";
      let wordValue = evaluateWord(child, state, true);
      let previousText = previousWordText;
      previousWordText = wordValue.kind === "literal" ? wordValue.text : "";
      if (wordValue.kind !== "literal")
        return (
          FIND_PATH_PREDICATE_RE.test(previousText) ||
          (argIndex === 0 &&
            !isUnverifiableValue({
              node: child,
              value: wordValue,
            }))
        );
      sawPrint0 ||= wordValue.text === "-print0";
      return (
        /^[^-(),!]/.test(wordValue.text) ||
        /^[(),!]$/.test(wordValue.text) ||
        FIND_PREDICATE_PATTERN.test(wordValue.text)
      );
    }) && sawPrint0
  );
}
//@ chunk-h2y5xkdx.js:87351-92968 placement
/**
 * 分析一个简单命令：环境赋值前缀、命令名、参数求值；按程序分派到 git/ssh/rsync/find/xargs/sudo/printf 等专用规则。
 */
function analyzeCommand(commandNode, state, redirects) {
  let stdinFed = state.stdinFed;
  let commandNameNode;
  let wordNodes = [];
  let prefixValues = [];
  let redirectNodes = [...redirects];
  let lastIndex = commandNode.children.findLastIndex(
    (child) => child.type === "variable_assignment" && containsSubstitution(child),
  );
  for (let [childIndex, child] of commandNode.children.entries()) {
    let refusalReason = null;
    if (child.type === "command_name") {
      commandNameNode = child.children.length === 1 ? child.children[0] : undefined;
      refusalReason = commandNameNode ? null : tooComplexReason("a command name it cannot read");
    } else if (child.type === "variable_assignment" && !commandNameNode) {
      let assignedProgram = programBaseName(
        commandNode.children.find((child) => child.type === "command_name")?.text ?? ":",
      );
      let isKnownProgram =
        KNOWN_PROGRAMS.has(assignedProgram) && !POSIX_SPECIAL_BUILTINS_NONEVAL.has(assignedProgram);
      let precedesCommandName = childIndex < lastIndex;
      refusalReason = analyzeVariableAssignment(
        child,
        state,
        undefined,
        isKnownProgram,
        STRING_EXEC_COMMANDS.has(assignedProgram) || precedesCommandName,
        precedesCommandName,
      );
      prefixValues.push(
        child.children[2]
          ? evaluateWord(child.children[2], state, false)
          : {
              kind: "literal",
              text: "",
            },
      );
    } else if (REDIRECT_NODE_TYPES.has(child.type)) {
      let nestedRedirects = [];
      refusalReason =
        analyzeHeredocRedirect(child, state, nestedRedirects) ??
        (nestedRedirects.length > 0 ? tooComplexReason("a pipeline nested in a redirect") : null);
      redirectNodes.push(child);
    } else if (commandNameNode && WORD_NODE_TYPES.has(child.type))
      wordNodes.push({
        node: child,
        value: evaluateWord(child, state, true),
      });
    else if (commandNameNode && child.type === "ERROR" && /^[=!]?=$/.test(child.text))
      wordNodes.push({
        node: child,
        value: {
          kind: "literal",
          text: "=",
        },
      });
    else
      refusalReason = tooComplexReason(
        child.type === "ERROR" ? "syntax the parser could not recover" : `a ${child.type} in a command`,
      );
    if (refusalReason !== null) return refusalReason;
  }
  if (!commandNameNode) return null;
  let commandNameValue = evaluateWord(commandNameNode, state, true);
  if (commandNameValue.kind === "refuse") return commandNameValue.detail;
  let dynamicPathTail =
    state.simple && commandNameValue.kind === "dynamic"
      ? /\/([^/$`'"\\{}*?[\]]+)"?$/.exec(commandNameNode.text)?.[1]
      : undefined;
  let [, , bracedVarName, plainVarName] = SINGLE_VAR_REF_RE.exec(commandNameNode.text) ?? [];
  let varName = bracedVarName ?? plainVarName ?? "";
  let scopedVarValue = state.scopes.findLast((scope) => scope.has(varName))?.get(varName);
  if (dynamicPathTail)
    commandNameValue = {
      kind: "literal",
      text: dynamicPathTail,
    };
  else if (scopedVarValue !== undefined) {
    let resolvedProgram = programBaseName(scopedVarValue);
    if (
      KNOWN_PROGRAMS.has(resolvedProgram) ||
      ARG_SENSITIVE_COMMANDS.has(resolvedProgram) ||
      TRANSPARENT_LAUNCHERS.has(resolvedProgram) ||
      /^(?:chdir|popd|link|mkfifo|mknod)$/.test(resolvedProgram)
    )
      return `runs ${resolvedProgram} through the variable ${varName} ${TOO_COMPLEX_SUFFIX}; spell it out`;
    commandNameValue = {
      kind: "literal",
      text: scopedVarValue,
    };
  }
  if (
    (!isStaticNode(commandNameNode) && !dynamicPathTail && scopedVarValue === undefined) ||
    commandNameValue.kind !== "literal" ||
    !SAFE_PATH_TOKEN_RE.test(commandNameValue.text)
  )
    return `runs a command whose name is computed at runtime ${TOO_COMPLEX_SUFFIX}, so it cannot be shown not to be git`;
  let argv = [commandNameValue.text];
  for (let [wordIndex, { node: wordNode, value: wordValue }] of wordNodes.entries()) {
    if (wordValue.kind === "refuse") return wordValue.detail;
    if (
      !state.simple &&
      wordValue.kind === "literal" &&
      wordValue.text.split(/\s+/).some((wordPart) => GIT_COMMAND_PATTERN.test(basename(wordPart)))
    )
      return GIT_TOO_COMPLEX_REASON;
    if (argv.length === wordIndex + 1 && wordValue.kind === "literal" && isStaticNode(wordNode))
      argv.push(wordValue.text);
  }
  let programIndex = 0;
  while (
    TRANSPARENT_LAUNCHERS.has(programBaseName(argv[programIndex])) ||
    (state.simple && EXEC_LIKE_COMMANDS.has(argv[programIndex]))
  ) {
    let launcherName = programBaseName(argv[programIndex]);
    let argStartIndex = programIndex + 1;
    if (launcherName === "timeout" && /^\d+(?:\.\d+)?[smhd]?$/.test(argv[argStartIndex] ?? "-"))
      argStartIndex++;
    let nextProgram = programBaseName(
      argv.slice(argStartIndex).find((argText) => !/^[A-Za-z_]\w*=/.test(argText)) ?? "",
    );
    let nextIsKnown = KNOWN_PROGRAMS.has(nextProgram);
    let nextIsStringExec = STRING_EXEC_COMMANDS.has(nextProgram);
    while (/^(?:env|sudo)$/.test(launcherName) && /^[A-Za-z_]\w*=/.test(argv[argStartIndex] ?? "-")) {
      let [envVarName = "", envVarValue = ""] = argv[argStartIndex].split(/=(.*)/s);
      let envAssignmentReason =
        (GIT_LOCATION_ENV_RE.test(envVarName) || !PLAIN_TEXT_RE.test(envVarValue)) && !state.simple
          ? unverifiableRunReason("env", `with ${shortenForReason(argv[argStartIndex])}`)
          : (environmentAssignmentReason(
              envVarName,
              {
                kind: "literal",
                text: envVarValue,
              },
              envVarValue,
              nextIsKnown,
              nextIsStringExec,
            ) ??
            describeEnvValue(
              envVarName,
              {
                kind: "literal",
                text: envVarValue,
              },
              state,
            ));
      if (envAssignmentReason !== null) return envAssignmentReason;
      prefixValues.push({
        kind: "literal",
        text: envVarValue,
      });
      argStartIndex++;
    }
    if (/^-|=/.test(argv[argStartIndex] ?? "-")) break;
    programIndex = argStartIndex;
  }
  if (isDevicePath(argv[programIndex]))
    return `runs the program a descriptor holds (${argv[programIndex]}) ${TOO_COMPLEX_SUFFIX}, so it cannot be shown not to be git`;
  let program = programBaseName(argv[programIndex]);
  let words = wordNodes.slice(programIndex);
  let mapped = words.map((word) => (word.value.kind === "literal" ? word.value.text : null));
  let stdinFedToProgram = stdinFed || redirectNodes.some(isStdinRedirect);
  let inputAssembled = state.inputAssembled;
  if (state.simple && GIT_COMMAND_PATTERN.test(program)) return null;
  if (
    program === "integer" ||
    program === "float" ||
    (program === "private" &&
      mapped.some((mappedWord) => mappedWord === null || /^[-+].*[iEF]/.test(mappedWord)))
  ) {
    let found = mapped
      .map((word) => describeIntegerTyping(/^[A-Za-z_]\w*/.exec(word ?? "")?.[0] ?? ""))
      .find((typingReason) => typingReason !== null);
    if (found !== undefined) return found;
  }
  let text = state.pipedFrom?.text ?? "";
  if (
    state.simple &&
    !KNOWN_PROGRAMS.has(program) &&
    mentionsGit(
      [
        KNOWN_PROGRAMS.has(text.split(/\s/)[0] ?? "") ? text : "",
        ...redirectNodes.filter(isStdinRedirect).map((redirect) => redirect.text),
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
            fed: stdinFedToProgram,
            assembled: inputAssembled,
          })
        : null;
  let commandArgv = [argv[programIndex], ...mapped];
  let shellArgIndex = !SHELL_PROGRAM_NAMES.has(program)
    ? -1
    : APPLET_SHELL_NAMES.has(program) && SHELL_PROGRAM_NAMES.has(programBaseName(mapped[0] ?? "-"))
      ? 1
      : 0;
  let shellCommandStringIndex = findShellCommandStringIndex(commandArgv, shellArgIndex);
  if (shellCommandStringIndex !== -1)
    return analyzeNestedShellText(
      programBaseName(commandArgv[shellArgIndex]),
      commandArgv[shellCommandStringIndex],
      state,
      stdinFedToProgram,
    );
  if (state.simple && SHELL_PROGRAM_NAMES.has(program)) {
    let mapped_2 = mapped.map((lowerWord) => lowerWord?.toLowerCase() ?? "-");
    let sliced = mapped_2.slice(shellArgIndex);
    let shellCommandArg = sliced[0] === "-n" ? sliced[1] : sliced[0];
    return (stdinFedToProgram &&
      (shellCommandArg === undefined ||
        isOpaquePathArgument(shellCommandArg, state) ||
        /^(?:su|runuser)$/.test(program))) ||
      (/^(?:cmd|powershell|pwsh)$/.test(program) && words.length > 0) ||
      /^[-+]/.test(shellCommandArg ?? "") ||
      isDevicePath(shellCommandArg ?? "") ||
      mapped_2.some((lowerWord) => SHELL_COMMAND_FLAG_PATTERN.test(lowerWord))
      ? describeGitRunner(program)
      : APPLET_SHELL_NAMES.has(program)
        ? checkLauncherInvocation(program, words, state, {
            fed: stdinFedToProgram,
            assembled: inputAssembled,
          })
        : program === "rsh"
          ? (analyzeRemoteShellCommand("ssh", words, state, {
              assembled: inputAssembled,
              fed: stdinFedToProgram,
            }) ?? null)
          : null;
  }
  let gitRunnerReason = describeGitRunner(program);
  if (gitRunnerReason !== null) return gitRunnerReason;
  let strictDynamicReason =
    !isStrictDynamicValuesEnabled() || mapped.length === 0
      ? null
      : program === "pushd" &&
          (mapped.includes("-n") ||
            words.some(
              (word, wordIndex) =>
                mapped[wordIndex] === null &&
                (isUnverifiableValue(word) ||
                  hasOptionPrefix(word.node, state) ||
                  isBracketGlobNode(word.node) ||
                  /^[?*[]/.test(word.node.text)) &&
                !(!hasExpansion(word.node) && hasNonFlagPrefix(word.node, state)) &&
                !(mapped.slice(0, wordIndex).includes("--") && !hasExpansion(word.node)),
            ))
        ? mapped.includes("-n")
          ? "-n (pushd then puts the directory on the stack without entering it, and a later ~1 stands for it; use pushd without -n, or cd)"
          : "a word that may come out as -n (pushd would then put the directory on the stack without entering it, and a later ~1 stands for it; write the directory out, or put it in double quotes after --)"
        : program === "dirs" &&
            mapped.some((mappedWord) => mappedWord === null || !/^(?:-[clpv]+|[-+]\d+)$/.test(mappedWord))
          ? "a word that zsh puts on the directory stack without entering it (a later ~1 stands for it)"
          : null;
  if (strictDynamicReason !== null) return unverifiableRunReason(program, `with ${strictDynamicReason}`);
  if (program === "command" && /^-[vV]$/.test(mapped[0] ?? "")) return null;
  if (TRANSPARENT_LAUNCHERS.has(program) && words.length > 0 && !state.simple)
    return unverifiableRunReason(program, `with ${describeWordValue(words[0].value)}`);
  if (KNOWN_PROGRAMS.has(program))
    return checkBuiltinArguments(
      program,
      words,
      state,
      redirectNodes.some(isStdinRedirect) ? undefined : state.pipedFrom,
    );
  let rules = INTERPRETER_RULES.get(program);
  if (rules)
    return checkInterpreterInvocation(program, rules, words, state, {
      redirects: redirectNodes,
      prefixValues,
    });
  if (state.simple)
    return checkLauncherInvocation(program, words, state, {
      fed: stdinFedToProgram,
      assembled: inputAssembled,
    });
  let sshpassReason = checkSshpassInvocation(program, words, state, {
    assembled: inputAssembled,
    fed: stdinFedToProgram,
  });
  if (sshpassReason !== null) return sshpassReason;
  let remoteTransferReason =
    analyzeRsyncScp(program, words, state) ??
    analyzeRemoteShellCommand(program, words, state, {
      assembled: inputAssembled,
      fed: stdinFedToProgram,
    });
  let index = mapped.findIndex((mappedWord) => SHELL_PROGRAM_NAMES.has(programBaseName(mappedWord ?? "-")));
  let shellCommandStringIndex_2 = findShellCommandStringIndex(mapped, index);
  for (let [valueIndex, value] of [...words.map((word) => word.value), ...prefixValues].entries())
    if (
      !(
        valueIndex < words.length &&
        (remoteTransferReason !== undefined ||
          (shellCommandStringIndex_2 !== -1 &&
            valueIndex >= index &&
            valueIndex <= shellCommandStringIndex_2))
      ) &&
      !isPlainOrInertValue(value)
    )
      return value.kind === "refuse"
        ? value.detail
        : unverifiableRunReason(program, `with ${describeWordValue(value)}`);
  if (remoteTransferReason !== undefined) return remoteTransferReason;
  if (
    inputAssembled &&
    mapped.some((mappedWord) => mappedWord !== null && mappedWord.split(/\s+/).some(isDevicePath))
  )
    return `feeds ${program} a descriptor it names ${TOO_COMPLEX_SUFFIX}, whose content is assembled at runtime and may be read as a program`;
  let filtered = redirectNodes.filter(isStdinRedirect);
  if (
    filtered.length > 0
      ? filtered.some((redirect) => analyzeRedirect(redirect, state))
      : stdinFed && state.inputAssembled
  )
    return `feeds ${program} input assembled by the command ${TOO_COMPLEX_SUFFIX}; a program this guard does not know may run that input, so it cannot be shown not to run git`;
  return shellCommandStringIndex_2 === -1
    ? null
    : analyzeNestedShellText(
        programBaseName(mapped[index]),
        mapped[shellCommandStringIndex_2],
        state,
        stdinFedToProgram,
      );
}
//@ chunk-h2y5xkdx.js:92968-93061 placement
/**
 * 返回第一个非选项参数的下标（跳过 -p/-f/-d/-P 这类带值选项）。
 */
function findNonOptionWordIndex(words) {
  return words.findIndex(
    (word, wordIndex) => !/^(?:-|$)/.test(word) && !/^-[pfdP]$/.test(words[wordIndex - 1] ?? ""),
  );
}
//@ chunk-h2y5xkdx.js:93061-94218 placement
/**
 * 分析 sshpass 调用：校验其选项可读，找出被包装的程序；若为 rsh/ssh/scp/rsync 则交给远程命令分析，若后续词可能指定远程客户端则拒绝。
 */
function checkSshpassInvocation(program, words, state, options) {
  if (
    program !== "sshpass" ||
    !readFlagWithOverride(TENGU_HOLLOW_SANDPIPER, {
      safe: true,
    })
  )
    return null;
  let words_2 = words.map((word) => (word.value.kind === "literal" ? word.value.text : ""));
  let nonOptionWordIndex = findNonOptionWordIndex(words_2);
  let programWordIndex = nonOptionWordIndex === -1 ? words.length : nonOptionWordIndex;
  if (
    !words_2
      .slice(0, programWordIndex)
      .every((optionWord, wordIndex) =>
        /^-[pfdP]$/.test(words_2[wordIndex - 1] ?? "")
          ? !optionWord.startsWith("-")
          : (optionWord === "--" && wordIndex + 1 === programWordIndex) ||
            /^-(?:[hVv]+e?|e|[pfdP]|[hVv]*[pfdP].+)$/s.test(optionWord),
      )
  )
    return unverifiableRunReason(
      program,
      "with an option or computed word this check cannot read before the program it runs (write each option as its own word: -p PASSWORD, -f FILE, -d FD, -P PROMPT, -e or -v; attach a value that starts with -, as in -p-secret; and write the program name as plain text)",
    );
  let found = words.slice(0, programWordIndex + 1).find((word) => mayExpandToNothing(word.node));
  if (found) return unverifiableRunReason(program, `with ${emptyExpansionReason(found)}`);
  let innerProgram = programBaseName(words_2[nonOptionWordIndex] ?? "");
  let words_3 = words.slice(nonOptionWordIndex + 1);
  if (innerProgram === program) return checkSshpassInvocation(program, words_3, state, options);
  if (innerProgram === "rsh") return analyzeRemoteShellCommand("ssh", words_3, state, options) ?? null;
  let isWrapper =
    TRANSPARENT_LAUNCHERS.has(innerProgram) ||
    UNHANDLED_EXEC_WRAPPERS.has(innerProgram) ||
    APPLET_SHELL_NAMES.has(innerProgram) ||
    /^(?:xargs|find)$/.test(innerProgram);
  if (
    !REMOTE_SESSION_PROGRAMS.has(innerProgram) &&
    words_3.some(({ value }) =>
      value.kind === "literal"
        ? value.text
            .split(/\s+/)
            .map(programBaseName)
            .some((wordPart) => wordPart === "rsh" || REMOTE_SESSION_PROGRAMS.has(wordPart))
        : isWrapper,
    )
  )
    return unverifiableRunReason(
      program,
      `with ${innerProgram} as its program and a later word that may name a remote client, which this guard does not read past (make the client sshpass's own program)`,
    );
  return REMOTE_SESSION_PROGRAMS.has(innerProgram)
    ? (analyzeRsyncScp(innerProgram, words_3, state) ??
        analyzeRemoteShellCommand(innerProgram, words_3, state, options) ??
        null)
    : null;
}
//@ chunk-h2y5xkdx.js:94218-96600 placement
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
  let isStrictExpansion = isParameterExpansionStrictnessOn();
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
        countWhere(literals, (literal) => !/^(?:-|\d*$)/.test(literal)) <= +(program === "chroot")) ||
      (/^(?:sudo|doas)$/.test(program) &&
        literals.some((literal) => /^(?:-[A-Za-z]*[si]|--shell|--login)/.test(literal))))
  )
    return unverifiableRunReason(program, "with a shell reading its commands from stdin");
  let sshpassReason = checkSshpassInvocation(program, words, state, {
    fed,
    assembled,
  });
  if (sshpassReason !== null) return sshpassReason;
  let innerProgramIndex = program === "sshpass" ? findNonOptionWordIndex(literals) : -1;
  let remoteProgram = REMOTE_SESSION_PROGRAMS.has(program)
    ? program
    : innerProgramIndex !== -1 && REMOTE_SESSION_PROGRAMS.has(programBaseName(literals[innerProgramIndex]))
      ? programBaseName(literals[innerProgramIndex])
      : null;
  if (remoteProgram !== null) {
    let remoteReason =
      analyzeRsyncScp(remoteProgram, words.slice(innerProgramIndex + 1), state) ??
      analyzeRemoteShellCommand(remoteProgram, words.slice(innerProgramIndex + 1), state, {
        assembled,
        fed,
      });
    if (remoteReason !== undefined) return remoteReason;
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
          (literal, literalIndex, literals) =>
            /^(?:-[A-Za-z]*[DR]|--ch(?:dir|root))/.test(literal) ||
            (!/^(?:-|[A-Za-z_]\w*=|[\d.,:]+[a-z]?$)/.test(literal) &&
              !/^-[A-Za-z]*[ugnskoecptwC]$/.test(literals[literalIndex - 1] ?? "") &&
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
  let commandArg = literals[index_2 + (literals[index_2 + 1] === "-n" ? 2 : 1)];
  if (
    index_2 !== -1 &&
    shellCommandStringIndex === -1 &&
    (literals.some((literal) => SHELL_COMMAND_FLAG_PATTERN.test(literal)) ||
      /^[-+]/.test(commandArg ?? "") ||
      isDevicePath(commandArg ?? "") ||
      (fed && (!commandArg || isOpaquePathArgument(commandArg, state))))
  )
    return unverifiableRunReason(program, `with ${describeWordValue(words[index_2].value)}`);
  for (let [wordIndex, { value }] of words.entries()) {
    if (wordIndex === shellCommandStringIndex) continue;
    if (value.kind !== "literal") {
      if (
        value.kind === "refuse" ||
        (value.why === "a glob pattern" && (isLauncher || !value.inert)) ||
        (isLauncher && !value.inert)
      )
        return unverifiableRunReason(program, `with ${describeWordValue(value)}`);
      continue;
    }
    let matches = /[$`'"\\]/.test(value.text);
    let mapped = value.text
      .replace(SHELL_QUOTE_CHARS_RE, "")
      .split(/\s+/)
      .map((wordPart) => programBaseName(wordPart.replace(/^.*=/, "")));
    let firstProgram = isStrictExpansion ? (mapped.find((wordPart) => wordPart !== "") ?? "") : mapped[0];
    let assignmentMatch = isLauncher && /^([A-Za-z_]\w*)=(.*)$/s.exec(value.text);
    let assignmentReason = assignmentMatch
      ? (environmentAssignmentReason(
          assignmentMatch[1],
          {
            kind: "literal",
            text: assignmentMatch[2],
          },
          assignmentMatch[2],
        ) ??
        describeEnvValue(
          assignmentMatch[1],
          {
            kind: "literal",
            text: assignmentMatch[2],
          },
          state,
        ))
      : null;
    if (assignmentReason !== null) return assignmentReason;
    let wordReason = isLauncher
      ? matches ||
        isDevicePath(value.text) ||
        mapped.some(
          (wordPart) => ARG_SENSITIVE_COMMANDS.has(wordPart) || (fed && INTERPRETER_RULES.has(wordPart)),
        )
        ? unverifiableRunReason(program, `with ${describeWordValue(value)}`)
        : mapped.length > 1 || /[*?[]/.test(value.text)
          ? analyzeNestedShellText(program, value.text, state, fed)
          : null
      : (matches || mapped.length > 1) &&
          (isGitProgram(firstProgram) || (matches && mapped.some(isGitProgram)))
        ? unverifiableRunReason(program, `with ${describeWordValue(value)}`)
        : null;
    if (wordReason !== null) return wordReason;
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
//@ chunk-h2y5xkdx.js:96600-96644 placement
function isGitProgram(program) {
  return GIT_COMMAND_PATTERN.test(program) || SHELL_PROGRAM_NAMES.has(program);
}
//@ chunk-h2y5xkdx.js:96644-96739 placement
function mentionsGit(text) {
  return [text, text.replace(SHELL_QUOTE_CHARS_RE, "")].some((candidate) =>
    candidate.split(/[^\w.-]+/).some((wordPart) => GIT_COMMAND_PATTERN.test(wordPart)),
  );
}
//@ chunk-h2y5xkdx.js:96739-96890 placement
var SHELL_QUOTE_CHARS_RE = /\$\{[^}]*\}|\$\w*|[`'"\\]/g;
var BOT_PROTECTED_TENGU_STEADY_THIMBLE = "bot_protected_tengu_steady_thimble";
var STRING_NODE_TYPES_RE = /^(?:string|raw_string|ansi_c_string)$/;
var GLOB_CHARS_RE = /(?:^|[^\\])(?:\\\\)*[*?[{]/;
//@ chunk-h2y5xkdx.js:96890-96953 placement
/**
 * 判断词节点（或其子节点）是否含通配符。
 */
function hasChildWordGlob(node) {
  return node.type === "word" ? GLOB_CHARS_RE.test(node.text) : hasChildWordMatching(node, GLOB_CHARS_RE);
}
//@ chunk-h2y5xkdx.js:96953-106705 placement
/**
 * 检查内建命令与常用工具（printf、test、set/shopt、rg/sort、cd、read/getopts/unset 等）的参数能否静态判定（计算值可能是选项、变量名可能被绑定等），不能时返回原因。
 */
function checkBuiltinArguments(program, words, state, context) {
  let values = words.map((word) => word.value);
  let literalValues = values.map((value) => (value.kind === "literal" ? value.text : null));
  let reason = null;
  if (program === "printf") {
    let formatValue = literalValues[literalValues[0] === "--" ? 1 : 0];
    reason =
      formatValue === null || (formatValue ?? "").startsWith("-")
        ? (formatValue ?? "a computed format")
        : null;
  } else if (program === "test" || program === "[") {
    let index = literalValues.findIndex(
      (literalValue, idx) =>
        /^-[vRt]$/.test(literalValue ?? "") && !/^(?:[A-Za-z_]\w*|\d+)$/.test(literalValues[idx + 1] ?? ""),
    );
    let index_2 = values.findIndex(
      (value, idx) =>
        idx + 1 < values.length &&
        value.kind === "dynamic" &&
        !value.integer &&
        !isTestOperand(values[idx + 1]),
    );
    reason =
      index !== -1
        ? `${literalValues[index]} ${index + 1 < values.length ? describeWordValue(values[index + 1]) : "and nothing after it"}`
        : index_2 === -1
          ? null
          : describeWordValue(values[index_2]);
  } else if (/^(?:set|shopt|setopt|unsetopt|rg|sort)$/.test(program)) {
    let isPatternOption = (idx) =>
      program === "rg" && GREP_PATTERN_OPTIONS.test(literalValues[idx - 1] ?? "");
    let isStrictValues = (program === "rg" || program === "sort") && isStrictDynamicValuesEnabled();
    let optionAt = [];
    for (let k = 0; isStrictValues && k < literalValues.length; k++) {
      let prevLiteral = k > 0 && optionAt[k - 1] === null ? literalValues[k - 1] : null;
      optionAt[k] =
        prevLiteral === null
          ? null
          : program === "sort"
            ? normalizeSortOption(prevLiteral)
            : GREP_PATTERN_OPTIONS.test(prevLiteral) || RG_PROGRAM_OPTIONS.test(prevLiteral)
              ? prevLiteral
              : findGrepPatternFlag(prevLiteral);
    }
    let doubleDashIdx = isStrictValues
      ? literalValues.findIndex((literalValue, idx) => literalValue === "--" && optionAt[idx] === null)
      : literalValues.indexOf("--");
    let optionFor = (idx) =>
      isStrictValues ? (optionAt[idx] ?? (isPatternOption(idx) ? literalValues[idx - 1] : null)) : null;
    let valueOptionsRe = program === "rg" ? GREP_CONTEXT_OPTIONS_RE : SORT_VALUE_OPTIONS_RE;
    let isDynamicForOption = (word, option) =>
      option !== null &&
      word.value.kind !== "literal" &&
      !isFullyStaticValue(word) &&
      !(word.value.kind === "dynamic" && word.value.integer && valueOptionsRe.test(option));
    let index = literalValues.indexOf("--");
    let isUnverifiableAt = (word, idx) =>
      (index === -1 || idx < index) &&
      isUnverifiableValue(word) &&
      !(
        program === "rg" &&
        GREP_PATTERN_OPTIONS.test(literalValues[idx - 1] ?? "") &&
        !hasExpansion(word.node)
      );
    let isValueDynamicAt = (word, idx) =>
      isStrictValues &&
      (doubleDashIdx === -1 || idx < doubleDashIdx) &&
      (isPatternOption(idx) && optionAt[idx] !== null
        ? isDynamicForOption(word, optionAt[idx])
        : isUnverifiableValue(word) || isDynamicForOption(word, optionFor(idx)));
    let idx = words.findIndex((word, idx) => isUnverifiableAt(word, idx) || isValueDynamicAt(word, idx));
    let optionPositionReason = (why) =>
      `${OPTION_POSITION_NOTE.slice(0, OPTION_POSITION_NOTE.indexOf(";"))}: ${why})`;
    let explainWord = (idx) => {
      let word = words[idx];
      let prevLiteral = literalValues[idx - 1] ?? "";
      let option = isStrictValues ? optionFor(idx) : isPatternOption(idx) ? prevLiteral : null;
      if (option === null)
        return isStrictValues && prevLiteral === "--" && optionAt[idx - 1]
          ? `${describeWordValue(word.value)} ${optionPositionReason(`the -- before it is the ${optionAt[idx - 1]} value here, so options have not ended`)}`
          : `${describeWordValue(word.value)} ${OPTION_POSITION_NOTE}`;
      let isInsideCluster = isStrictValues && optionAt[idx] != null && option !== prevLiteral;
      let optionText = isInsideCluster ? `${prevLiteral.slice(0, -1)} ${option}` : option;
      let positionText = `as the ${option} value${isInsideCluster ? ` of the cluster ${prevLiteral}` : ""}, where an option may stand`;
      if (word.value.kind === "dynamic" && word.value.many)
        return describeComputedValue(program, option, word);
      if (program !== "rg" || !GREP_PATTERN_OPTIONS.test(option))
        return valueOptionsRe.test(option)
          ? `${describeWordValue(word.value)} ${positionText} (give a spelled-out count or key: ${optionText} 4)`
          : `${describeWordValue(word.value)} ${positionText} (if this command sets it to a path, quoting it is enough: "$x"; otherwise spell the value out, or at least its first character: a wholly computed ${option} value may begin with -)`;
      if (
        (isStrictValues ? isDynamicForOption(word, option) : true) ||
        (isPatternOption(idx) && optionAt[idx] !== null && hasExpansion(word.node))
      )
        return describeComputedValue(program, option, word, isInsideCluster ? prevLiteral : undefined);
      return isInsideCluster
        ? `${describeWordValue(word.value)} ${positionText} (write ${option} as its own word: ${optionText} "$x")`
        : `${describeWordValue(word.value)} ${optionPositionReason(`the ${prevLiteral} before it is itself the ${optionAt[idx - 1] ?? "previous option"} value here, so give each option its own value`)}`;
    };
    let badIdx = -1;
    let expandingWord;
    let hasInlineOptions = program !== "set";
    let scanOptions = !/^(?:rg|sort)$/.test(program);
    for (let idx = 0; scanOptions && badIdx === -1 && idx < literalValues.length; idx++) {
      let literal = literalValues[idx] ?? null;
      if (program === "set" && !hasInlineOptions && !/^[-+][a-zA-Z]/.test(literal ?? "")) {
        if (mayExpandToNothing(words[idx].node)) {
          expandingWord = words[idx];
          continue;
        }
        break;
      }
      badIdx = (
        literal === null
          ? false
          : hasInlineOptions
            ? isSafeShellOption(literal) ||
              /^(?:no)?allexport$/i.test(literal.replace(/_/g, "")) ||
              (program === "shopt" && /^-[suqpo]+$/.test(literal))
            : !/o.*o/.test(literal) &&
              literal
                .slice(1)
                .split("")
                .every((letter) => /[ao]/.test(letter) || (letter !== "T" && SET_O_SAFE_LETTERS.has(letter)))
      )
        ? -1
        : idx;
      hasInlineOptions = program !== "set" || /^[-+][a-zA-Z]*o/.test(literal ?? "");
    }
    reason =
      badIdx !== -1
        ? describeWordValue(values[badIdx]) +
          (expandingWord ? ` after ${emptyExpansionReason(expandingWord)}` : "")
        : ((scanOptions
            ? null
            : findMatching(
                literalValues,
                program === "rg" ? /^--(?:pre(?:-glob)?|hostname-bin)(?:=|$)/ : /^--co/,
              )) ?? (idx === -1 ? null : explainWord(idx)));
  } else if (program === "cd" || program === "pushd")
    reason = literalValues.some(
      (literalValue) => literalValue !== null && literalValue[0] !== "-" && isDevicePath(literalValue),
    )
      ? "a directory under /dev or /proc"
      : null;
  if (reason !== null) return unverifiableRunReason(program, `with ${reason}`);
  if (SHELL_BUILTIN_ARG_COMMANDS.has(program)) {
    let argRole = program === "getopts" ? "data" : "name";
    for (let [idx, value] of values.entries()) {
      let previousRole = argRole;
      argRole = "name";
      let literal = literalValues[idx] ?? null;
      let node = words[idx].node;
      let isReadFlagWord = previousRole === "name" && program === "read" && literal?.[0] === "-";
      if (
        value.kind === "literal" &&
        (isReadFlagWord || previousRole === "data") &&
        hasChildWordGlob(node) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_STEADY_THIMBLE, {
          safe: true,
        })
      )
        return unverifiableRunReason(
          program,
          `with the word ${shortenForReason(node.text)}: its unquoted *, ?, [ or { may make it no word or several, and the words after it may then be read as variable names (${isReadFlagWord ? "spell the option letters out, such as -d" : "write it as quoted text, such as '*'"})`,
        );
      if (isReadFlagWord) {
        for (let k = 1; k < literal.length; k++) {
          let flag = `-${literal[k]}`;
          if (!/^-[aA]$/.test(flag) && !READ_DATA_FLAGS.has(flag)) continue;
          let role = READ_NUMERIC_ARG_FLAGS.has(flag)
            ? "number"
            : READ_DATA_FLAGS.has(flag)
              ? "data"
              : "name";
          let sliced = literal.slice(k + 1);
          if (sliced === "") argRole = role;
          else if (
            role === "number"
              ? !READ_NUMERIC_OPERAND_RE.test(sliced)
              : role === "name" && (!SHELL_NAME_PATTERN.test(sliced) || describeUnsafeBinding(sliced, state))
          )
            return describeUnsafeBinding(sliced, state) ?? unverifiableRunReason(program, `with ${literal}`);
          break;
        }
        continue;
      }
      let isUnsafe =
        previousRole === "data"
          ? value.kind === "refuse"
          : previousRole === "number"
            ? !(literal === null
                ? value.kind === "dynamic" && value.integer
                : READ_NUMERIC_OPERAND_RE.test(literal))
            : literal === null
              ? value.kind !== "dynamic" || !value.arithmeticSafe
              : !PLAIN_TEXT_RE.test(literal);
      let bindingReason =
        previousRole === "name" && program !== "unset" && SHELL_NAME_PATTERN.test(literal ?? "-")
          ? describeUnsafeBinding(literal, state)
          : null;
      if (isUnsafe || bindingReason !== null)
        return (
          bindingReason ??
          unverifiableRunReason(program, `with a name it would evaluate (${describeWordValue(value)})`)
        );
      if (
        value.kind === "dynamic" &&
        (previousRole === "number" ||
          (previousRole === "data" && !isQuotedLiteral(node, STRING_NODE_TYPES_RE))) &&
        readFlagWithOverride(BOT_PROTECTED_TENGU_STEADY_THIMBLE, {
          safe: true,
        })
      )
        return unverifiableRunReason(
          program,
          previousRole === "number"
            ? `with ${describeWordValue(value)} after -t, -n or -N: zsh may read it and the words after it as variable names (write the number itself, such as -t 5)`
            : `with ${describeWordValue(value)} where one value belongs: it may become no word or several, and the words after it may then be read as variable names (write it as one double-quoted variable, such as "$NAME", or as quoted text; $@, $*, [@], [*] and \${! are refused here even inside quotes)`,
        );
    }
    return null;
  }
  if (AWK_NAMES.has(program)) {
    let idx = 0;
    while (idx < literalValues.length && literalValues[idx] !== "--" && literalValues[idx]?.[0] === "-") {
      let arg = literalValues[idx];
      let match = /^-[Fv](.+)$/s.exec(arg);
      let assignmentText = match
        ? match[1]
        : arg === "-v"
          ? words[idx + 1]?.node.text.replace(/["'\\]/g, "")
          : literalValues[idx + 1];
      if (
        !/^-[Fv]/.test(arg) ||
        typeof assignmentText !== "string" ||
        (arg[1] === "v" && !/^[A-Za-z_]\w*=/.test(assignmentText))
      )
        return unverifiableRunReason(program, `with ${arg}`);
      let valueWord = !match && literalValues[idx + 1] === null ? words[idx + 1] : null;
      if (
        valueWord &&
        (valueWord.value.kind === "refuse" ||
          hasExpansion(valueWord.node) ||
          (isStrictDynamicValuesEnabled() && !isFullyStaticValue(valueWord)))
      )
        return unverifiableRunReason(program, `with ${describeComputedValue(program, arg, valueWord)}`);
      idx += match ? 1 : 2;
    }
    idx += literalValues[idx] === "--" ? 1 : 0;
    let programText = idx < literalValues.length ? literalValues[idx] : "";
    if (
      programText === null ||
      programText === undefined ||
      programText.includes("{}") ||
      awkProgramHasExecBridge(programText)
    )
      return unverifiableRunReason(
        program,
        "with a program that can execute commands or that it cannot read",
      );
    let replaced = programText.replaceAll("||", "  ");
    let index = replaced.indexOf("|");
    let index_2 = programText.indexOf("print");
    return index !== -1 &&
      ((index_2 !== -1 && index_2 < replaced.lastIndexOf("|")) ||
        programText.lastIndexOf("getline") > index) &&
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
      let linuxSedProgram = readFlagWithOverride(TENGU_HUMBLE_WHALE, {
        safe: true,
      })
        ? parseSedProgram(literalValues, false)
        : null;
      let bsdSedProgram =
        linuxSedProgram && !["linux", "wsl", "windows"].includes(getPlatform())
          ? parseSedProgram(literalValues, true)
          : null;
      let index = literalValues.indexOf("--");
      let optionsEnd = index !== -1 && bsdSedProgram ? Math.max(index, bsdSedProgram.optionsEnd) : index;
      let found = words.find(
        (word, idx) => (optionsEnd === -1 || idx < optionsEnd) && isUnverifiableValue(word),
      );
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
      let flattened = literalValues.flatMap((literalValue, idx) =>
        isSedExpressionFlag(literalValues[idx - 1])
          ? [literalValue]
          : literalValue?.startsWith("--expression=")
            ? [literalValue.slice(13)]
            : [],
      );
      if (flattened.length === 0)
        flattened = literalValues
          .filter(
            (literalValue, idx) =>
              literalValue !== "--" &&
              !isSedExpressionFlag(literalValues[idx - 1]) &&
              !isOptionWord(literalValue),
          )
          .slice(0, 1);
      let regExp = new RegExp(SED_COMMAND_PATTERN_STRICT, "y");
      let strictRegExp = isSedScriptStrictnessOn() ? new RegExp(SED_COMMAND_PATTERN, "y") : null;
      let candidateScripts = [
        ...flattened.map((script) => ({
          script,
          hint: "",
        })),
        ...(linuxSedProgram
          ? [
              {
                script: linuxSedProgram.program,
                hint: SED_OPTION_ORDER_NOTE,
              },
            ]
          : []),
        ...(bsdSedProgram
          ? [
              {
                script: bsdSedProgram.program,
                hint: bsdSedProgram.suffixes.some((suffix) => suffix !== "")
                  ? SED_BSD_INPLACE_NOTE
                  : flattened[0] === ""
                    ? ""
                    : SED_OPTION_ORDER_NOTE,
              },
            ]
          : []),
      ];
      for (let { script, hint } of candidateScripts) {
        if (script === null) return unverifiableRunReason("sed", "with a program computed at runtime") + hint;
        if (!matchesWhole(regExp, script))
          return unverifiableRunReason("sed", `with the program ${shortenForReason(script)}`) + hint;
        if (strictRegExp && !matchesWhole(strictRegExp, script))
          return (
            unverifiableRunReason("sed", `with the program ${shortenForReason(script)}`) +
            SED_PATTERN_NOTE +
            hint
          );
      }
      return bsdSedProgram?.suffixes.includes(null)
        ? unverifiableRunReason(
            "sed",
            "with a computed word after a bare -i, which macOS and BSD sed take as the backup suffix",
          ) + SED_BSD_INPLACE_NOTE
        : null;
    }
    case "find": {
      let mapped = literalValues.map(() => null);
      let execIdxLimit = literalValues.length;
      for (let k = 0; isStrictDynamicValuesEnabled() && k < execIdxLimit; k++) {
        let literal = literalValues[k] ?? null;
        if (literal === null || mapped[k] !== null) continue;
        if (FIND_EXEC_OPTIONS.has(literal)) execIdxLimit = k;
        else if (FIND_PATH_PREDICATE_RE.test(literal) || FIND_SIDE_EFFECT_PREDICATE_RE.test(literal)) {
          for (let k_2 = 1; k_2 <= (literal === "-fprintf" ? 2 : 1); k_2++)
            if (k + k_2 < literalValues.length) mapped[k + k_2] = literal;
        }
      }
      let idx = 0;
      let hasUnverifiablePath = false;
      while (isStrictDynamicValuesEnabled() && idx < literalValues.length && literalValues[idx] !== "-") {
        let literal = literalValues[idx] ?? null;
        if (literal === null) {
          if (isUnverifiableValue(words[idx])) {
            hasUnverifiablePath = true;
            break;
          }
          if (isQuotedLiteral(words[idx].node)) break;
          idx += 1;
          continue;
        }
        let match = /^-[EHLPXdhsx]*(f([\s\S]*))?$/.exec(literal);
        if (match === null) break;
        idx += match[1] !== undefined && match[2] === "" ? 2 : 1;
      }
      let hasStdinSource =
        hasUnverifiablePath ||
        (isStrictDynamicValuesEnabled() &&
          literalValues.some(
            (literalValue, pathIdx) =>
              literalValue === "-files0-from" ||
              ((pathIdx < idx || (pathIdx < execIdxLimit && mapped[pathIdx] === null)) &&
                /^-[EHLPXdhsx]*f(?:-|$)/.test(literalValue ?? "")),
          ));
      for (let [idx, literal] of literalValues.entries()) {
        let node = words[idx].node;
        let isFirstPathSlot =
          idx === 0 &&
          !(
            isUnverifiableValue(words[idx]) &&
            (node.type !== "string" ||
              node.children.length !== 3 ||
              literalValues.some((literalValue) => literalValue === ";" || literalValue === "+"))
          );
        let isDynamicPath =
          literal === null &&
          (!FIND_PATH_PREDICATE_RE.test(literalValues[idx - 1] ?? "") || hasExpansion(node)) &&
          !isFirstPathSlot;
        let isPathPredicateSlot = idx < execIdxLimit && FIND_PATH_PREDICATE_RE.test(mapped[idx] ?? "");
        let isStrictDynamicPath =
          isStrictDynamicValuesEnabled() &&
          literal === null &&
          (!isPathPredicateSlot || !isFullyStaticValue(words[idx])) &&
          !isFirstPathSlot;
        if (isDynamicPath || isStrictDynamicPath) {
          let isAfterExec =
            isStrictDynamicValuesEnabled() &&
            idx >= execIdxLimit &&
            FIND_PATH_PREDICATE_RE.test(literalValues[idx - 1] ?? "");
          let optionName = isStrictDynamicValuesEnabled()
            ? isPathPredicateSlot
              ? mapped[idx]
              : null
            : FIND_PATH_PREDICATE_RE.test(literalValues[idx - 1] ?? "")
              ? literalValues[idx - 1]
              : null;
          return unverifiableRunReason(
            "find",
            `with ${optionName !== null ? describeComputedValue("find", optionName, words[idx]) : isAfterExec ? `${describeWordValue(values[idx])} after ${literalValues[idx - 1]} once an -exec action has begun, where no computed word is read as a value (spell it out, or put a find test before the -exec clause),` : describeWordValue(values[idx])}`,
          );
        }
        if (FIND_EXEC_OPTIONS.has(literal ?? "")) {
          let matches = /^-exec(?:dir)?$/.test(literal);
          let terminatorIdx = literalValues.findIndex(
            (literalValue, termIdx1) => termIdx1 > idx && /^[;+]$/.test(literalValue ?? ""),
          );
          let terminatorIdx_2 = literalValues.findIndex(
            (literalValue, termIdx2) =>
              termIdx2 > idx &&
              (literalValue === ";" ||
                (matches && literalValue === "+" && literalValues[termIdx2 - 1] === "{}")),
          );
          let misplacedTerminator = isStrictDynamicValuesEnabled()
            ? literalValues
                .slice(idx + 1, terminatorIdx_2 === -1 ? literalValues.length : terminatorIdx_2)
                .find(
                  (literalValue, offset) =>
                    literalValue !== null &&
                    ((literalValue !== ";" && literalValue.startsWith(";")) ||
                      (matches &&
                        literalValue !== "+" &&
                        literalValue.startsWith("+") &&
                        literalValues[idx + offset] === "{}")),
                )
            : undefined;
          if (misplacedTerminator !== undefined)
            return unverifiableRunReason(
              "find",
              `${literal} with a clause containing ${shortenForReason(misplacedTerminator)}, which GNU and BSD find end differently,`,
            );
          let execCommand = literalValues[idx + 1];
          let isDirExec =
            hasStdinSource ||
            (isStrictDynamicValuesEnabled() && (literal === "-execdir" || literal === "-okdir"));
          let checkExecAt = (terminatorIdx) =>
            terminatorIdx === -1 || !execCommand || execCommand.includes("{}")
              ? unverifiableRunReason("find", `${literal} with a program it cannot verify`)
              : checkExecSlotCommand(
                  execCommand,
                  words.slice(idx + 2, terminatorIdx).map((word, offset) =>
                    word.value.kind === "literal" && word.value.text.includes("{}")
                      ? {
                          node: word.node,
                          value: dynamicValue("a found path", {
                            ...DYNAMIC_VALUE_FLAGS,
                            optionSafe:
                              !word.value.text.startsWith("-") &&
                              !(isDirExec && word.value.text.startsWith("{}")),
                            many:
                              isStrictDynamicValuesEnabled() &&
                              matches &&
                              literalValues[terminatorIdx] === "+" &&
                              idx + 2 + offset === terminatorIdx - 1 &&
                              word.value.text === "{}",
                          }),
                        }
                      : word,
                  ),
                  state,
                );
          let execReason =
            checkExecAt(terminatorIdx) ??
            (isStrictDynamicValuesEnabled() && terminatorIdx_2 !== terminatorIdx
              ? checkExecAt(terminatorIdx_2)
              : null);
          if (execReason !== null) return execReason;
        }
      }
      return null;
    }
    case "xargs": {
      let replaceToken = null;
      let isNulSeparated = false;
      for (let k = 0; k < literalValues.length; k++) {
        let literal = literalValues[k] ?? null;
        let match = /^(?:-I(.*)|-i(.*)|--replace(?:=(.*))?)$/.exec(literal ?? "");
        if (match && literal !== "-I") {
          replaceToken = match[1] || match[2] || match[3] || "{}";
          continue;
        }
        if (literal === "-I" && literalValues[k + 1]) {
          replaceToken = literalValues[++k];
          continue;
        }
        if (literal !== null && XARGS_OPTIONS_RE.test(literal)) {
          isNulSeparated = /^(?:-[0rtpx]*0|--null$)/.test(literal)
            ? true
            : /^(?:-[0rtpx]*d|--delimiter)/.test(literal)
              ? false
              : isNulSeparated;
          let matches = /^(?:-[nPLsdE]|--(?:max-args|max-procs|delimiter))$/.test(literal);
          let valueWord = matches && literalValues[k + 1] === null ? words[k + 1] : null;
          if (valueWord && isStrictDynamicValuesEnabled() && !isFullyStaticValue(valueWord))
            return unverifiableRunReason(
              "xargs",
              `with ${describeComputedValue("xargs", literal, valueWord)}`,
            );
          k += matches ? 1 : 0;
          continue;
        }
        let appendedWords = {
          node: words[k].node,
          value: dynamicValue(
            "the words xargs appends, which may begin with - unless they follow a -- operand or come NUL-separated from find -print0 into xargs -0",
            {
              ...DYNAMIC_VALUE_FLAGS,
              optionSafe: isNulSeparated && isSafeFindPrint0(context, state),
            },
          ),
        };
        return literal !== null &&
          !literal.startsWith("-") &&
          (replaceToken === null || !literal.includes(replaceToken))
          ? checkExecSlotCommand(
              literal,
              [
                ...words.slice(k + 1).map((word) =>
                  replaceToken !== null &&
                  (word.value.kind !== "literal" || word.value.text.includes(replaceToken))
                    ? {
                        node: word.node,
                        value: dynamicValue("the words xargs substitutes"),
                      }
                    : word,
                ),
                appendedWords,
                appendedWords,
              ],
              state,
            )
          : unverifiableRunReason("xargs", `with ${literal ?? describeWordValue(values[k])}`);
      }
      return null;
    }
    default:
      return null;
  }
}
//@ chunk-h2y5xkdx.js:106705-106740 placement
var TENGU_RUSTLING_LIGHTHOUSE = "tengu_rustling_lighthouse";
//@ chunk-h2y5xkdx.js:106740-107024 placement
function checkExecSlotCommand(programPath, words, state) {
  let program = programBaseName(programPath);
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
//@ chunk-h2y5xkdx.js:107024-107087 placement
function findMatching(values, pattern) {
  return values.find((value) => value !== null && pattern.test(value)) ?? null;
}
//@ chunk-h2y5xkdx.js:107087-107220 placement
function isTestOperand(value) {
  return value.kind === "literal"
    ? PLAIN_TEXT_RE.test(value.text) || /^(?:!=?|==?|=~|\]|\(|\)|<|>)$/.test(value.text)
    : value.kind === "dynamic" && value.integer;
}
//@ chunk-h2y5xkdx.js:107220-107346 placement
function matchesWhole(pattern, script) {
  pattern.lastIndex = 0;
  while (pattern.lastIndex < script.length) {
    let lastIndex = pattern.lastIndex;
    if (!pattern.test(script) || pattern.lastIndex === lastIndex) return false;
  }
  return true;
}
//@ chunk-h2y5xkdx.js:107346-107712 placement
/**
 * 解析 sed 参数：找出脚本程序参数位置（被 -e/--expression 指定时为空）、选项结束下标与 -i 的后缀。
 */
function parseSedProgram(literalValues, allowInPlace) {
  let suffixes = [];
  let hasDynamicWord = false;
  let hasExpressionFlag = false;
  let optionIndex = 0;
  for (; optionIndex < literalValues.length; optionIndex++) {
    let word = literalValues[optionIndex] ?? null;
    if (word === null) hasDynamicWord ||= !hasExpressionFlag;
    else if (!isOptionWord(word)) break;
    else if (isSedExpressionFlag(word)) {
      hasExpressionFlag = true;
      optionIndex++;
    } else if (word.startsWith("--expression=")) hasExpressionFlag = true;
    else if (allowInPlace && word === "-i" && ++optionIndex < literalValues.length)
      suffixes.push(literalValues[optionIndex] ?? null);
  }
  let programIndex = literalValues[optionIndex] === "--" ? optionIndex + 1 : optionIndex;
  let scriptCandidate = programIndex < literalValues.length ? (literalValues[programIndex] ?? null) : "";
  let script = hasExpressionFlag || scriptCandidate?.startsWith(".") ? "" : scriptCandidate;
  return {
    program: hasDynamicWord ? null : script,
    optionsEnd: optionIndex,
    suffixes,
  };
}
//@ chunk-h2y5xkdx.js:107712-107775 placement
function isOptionWord(word) {
  return !!word && word !== "-" && word !== "--" && word.startsWith("-");
}
//@ chunk-h2y5xkdx.js:107775-107826 placement
function isSedExpressionFlag(word) {
  return word === "-e" || word === "--expression";
}
export {
  MAX_SSH_TEXT_CHARS,
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
  describeEnvValue,
  isPlainOrInertValue,
  TENGU_HOLLOW_SANDPIPER,
};
