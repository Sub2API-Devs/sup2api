/**
 * utils/bash/ast.ts
 *
 * Bash 命令安全分析：把解析树遍历成 SimpleCommand 列表（argv/envVars/redirects），跟踪变量值，遇到无法静态确定的 shell 特性返回 too-complex，并做语义检查（checkSemantics）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/ast.ts
 * pieces: chunk-38axkkfw.js (1), chunk-e6aww6q8.js (3), chunk-jxcqr1hv.js (1), chunk-r01896cg.js (139)
 * attribution: fingerprint 21, placement 12, facade-majority 35, layout 63, file-local 3, callgraph-fingerprint 1, sole-consumer 8, callgraph-witnessed 1
 */
import { AsyncLocalStorage } from "async_hooks";
import { isDeepStrictEqual } from "util";
import { homedir } from "os";
import { parseCommandRaw, PARSE_ABORTED, Te, kwe, rU } from "./parser.js";
import {
  wCi,
  SCi,
  gso,
  isNestedRippleEnabled,
  ACi,
  recordReadingRefusal,
  isStagedPumpkinEnabled,
  lyr,
} from "./bashReadingFlags.js";
import { hasCommentNode, SPLIT_MAX_LEN, splitCommand, getCommandArgv } from "./commands.js";
import { isScrubEnabled } from "../subprocessEnv.js";
import { hasZshMultibyteName, SHELL_KEYWORDS, getParserModule } from "./bashParser.js";
import { getOwn } from "../objectSafety.js";
import { isXargsToSafeFilter } from "../../tools/BashTool/readOnlyValidation.js";
import { stripCommandBuiltinPrefixes } from "../../tools/BashTool/bashSecurity.js";
import {
  unattendedServingConsentView,
  unattendedServingConsentMayHoldYes,
} from "../../services/remoteTools/unattendedConsentStore.js";

//@ chunk-r01896cg.js:3046-3060 placement
var nt = new AsyncLocalStorage();
/**
 * 在拒绝跟踪上下文中运行函数，返回结果与是否发生拒绝。
 */
//@ chunk-r01896cg.js:3060-3165 placement
async function runWithRefusalTracking(e, t) {
  let r = { accepted: e, refused: !1 };
  return { result: await nt.run(r, t), refused: r.refused };
}
//@ chunk-r01896cg.js:3165-3255 placement
function _vn() {
  let store = nt.getStore();
  if (store === void 0) return !0;
  return ((store.refused = !0), !store.accepted);
}
//@ chunk-r01896cg.js:3255-3655 facade-majority = VAR_PLACEHOLDER (0.159)
var STRUCTURAL_TYPES = new Set(["program", "list", "pipeline", "redirected_statement"]),
  SEPARATOR_TYPES = new Set([
    "&&",
    "||",
    "|",
    ";",
    "&",
    "|&",
    `
`,
  ]),
  REDIRECTABLE_COMMAND_TYPES = new Set([
    "command",
    "pipeline",
    "list",
    "negated_command",
    "declaration_command",
    "unset_command",
  ]),
  TRAILING_OK_TYPES = new Set(["test_command", "redirected_statement"]),
  CMDSUB_PLACEHOLDER = "__CMDSUB_OUTPUT__",
  VAR_PLACEHOLDER = "__TRACKED_VAR__",
  REDIRECT_NODE_TYPES = new Set(["file_redirect", "herestring_redirect", "heredoc_redirect"]),
  UNCERTAIN_VAR_PLACEHOLDER = "__UNCERTAIN_VAR__";
/**
 * 值中是否含任一占位符（CMDSUB / TRACKED_VAR / UNCERTAIN_VAR）。
 */
//@ chunk-r01896cg.js:3655-3722 facade-majority
function containsAnyPlaceholder(value) {
  return (
    value.includes(CMDSUB_PLACEHOLDER) ||
    value.includes(VAR_PLACEHOLDER) ||
    value.includes(UNCERTAIN_VAR_PLACEHOLDER)
  );
}
/**
 * 把占位符换成 $(…) / ${…}，用于给用户看的理由文本。
 */
//@ chunk-r01896cg.js:3722-3799 facade-majority
function redactPlaceholdersForDisplay(e) {
  return e.replaceAll(CMDSUB_PLACEHOLDER, "$(\u2026)").replaceAll(VAR_PLACEHOLDER, "${\u2026}");
}
//@ chunk-r01896cg.js:3799-3859 facade-majority
function deletePlaceholders(e) {
  return e.replaceAll(CMDSUB_PLACEHOLDER, "").replaceAll(VAR_PLACEHOLDER, "");
}
//@ chunk-r01896cg.js:3859-3888 layout
var substitutionCount = 0,
  catHeredocInlineCount = 0,
  quoteScanCarveOutCount = 0,
  QUOTE_OR_BACKSLASH_RE = /["`\\]/;
//@ chunk-r01896cg.js:3888-3930 layout
function isPrecededByNewline(e, t) {
  return (
    t > 0 &&
    e[t - 1] ===
      `
`
  );
}
/**
 * 文本中是否含运行时才确定的占位符：变量或不确定变量占位，或不在行首的命令替换输出占位。
 */
//@ chunk-r01896cg.js:3930-4079 facade-majority
function containsRuntimePlaceholder(e) {
  if (e.includes(VAR_PLACEHOLDER) || e.includes(UNCERTAIN_VAR_PLACEHOLDER)) return !0;
  let index = e.indexOf(CMDSUB_PLACEHOLDER);
  while (index !== -1) {
    if (!isPrecededByNewline(e, index)) return !0;
    index = e.indexOf(CMDSUB_PLACEHOLDER, index + CMDSUB_PLACEHOLDER.length);
  }
  return !1;
}
/**
 * 文本是否以任一占位符（命令替换输出、变量、不确定变量）开头。
 */
//@ chunk-r01896cg.js:4079-4153 facade-majority
function startsWithAnyPlaceholder(e) {
  return (
    e.startsWith(CMDSUB_PLACEHOLDER) ||
    e.startsWith(VAR_PLACEHOLDER) ||
    e.startsWith(UNCERTAIN_VAR_PLACEHOLDER)
  );
}
//@ chunk-r01896cg.js:4153-4961 fingerprint = SAFE_ENV_VARS (0.606)
var BARE_VAR_UNSAFE_RE = /[ \t\n*?[]/,
  STDBUF_SHORT_SEP_RE = /^-[ioe]$/,
  STDBUF_SHORT_FUSED_RE = /^-[ioe]./,
  STDBUF_LONG_RE = /^--(input|output|error)=/,
  BASH_READONLY_SPECIAL_VARS = new Set([
    "BASHOPTS",
    "BASH_VERSINFO",
    "EUID",
    "PPID",
    "SHELLOPTS",
    "UID",
    "FUNCNAME",
    "GROUPS",
    "BASH_ARGC",
    "BASH_ARGV",
    "BASH_LINENO",
    "BASH_SOURCE",
    "BASHPID",
  ]),
  SAFE_ENV_VARS = new Set([
    "HOME",
    "PWD",
    "OLDPWD",
    "USER",
    "LOGNAME",
    "SHELL",
    "PATH",
    "HOSTNAME",
    "UID",
    "EUID",
    "PPID",
    "RANDOM",
    "SECONDS",
    "LINENO",
    "TMPDIR",
    "BASH_VERSION",
    "BASHPID",
    "SHLVL",
    "HISTFILE",
    "IFS",
  ]),
  SPECIAL_VAR_NAMES = new Set(["?", "$", "!", "#", "0", "-"]),
  DANGEROUS_NODE_TYPES = new Set([
    "command_substitution",
    "process_substitution",
    "expansion",
    "simple_expansion",
    "brace_expression",
    "subshell",
    "compound_statement",
    "for_statement",
    "while_statement",
    "until_statement",
    "if_statement",
    "case_statement",
    "function_definition",
    "test_command",
    "ansi_c_string",
    "translated_string",
    "herestring_redirect",
    "heredoc_redirect",
  ]),
  DANGEROUS_TYPE_IDS = [...DANGEROUS_NODE_TYPES];
/**
 * 把节点类型映射为数字 id（未定义 -2、ERROR -1、DANGEROUS_TYPE_IDS 下标+1、其他 0），用于 tengu_bash_ast_too_complex 遥测。
 */
//@ chunk-r01896cg.js:4961-5054 facade-majority = nodeTypeId (1)
function nodeTypeId(nodeType) {
  if (!nodeType) return -2;
  if (nodeType === "ERROR") return -1;
  let index = DANGEROUS_TYPE_IDS.indexOf(nodeType);
  return index >= 0 ? index + 1 : 0;
}
//@ chunk-r01896cg.js:5054-5653 facade-majority = REDIRECT_OPS (1)
var REDIRECT_OPS = {
    ">": ">",
    ">>": ">>",
    "<": "<",
    ">&": ">&",
    "<&": "<&",
    ">|": ">|",
    "&>": "&>",
    "&>>": "&>>",
    "<<<": "<<<",
  },
  BRACE_EXPANSION_RE = /\{[^\s]*(,|\.\.)[^\s]*\}/,
  BRACE_ESCAPED_CLOSE_RE = /\{[^{]*\\}/,
  BRACE_ESCAPED_OPEN_RE = /\{[^}]*\\\{/,
  CONTROL_CHAR_RE = /[\x00-\x08\x0B-\x1F\x7F]/,
  LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/,
  UNICODE_WHITESPACE_RE = /[\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/,
  BACKSLASH_ESCAPED_SPACE_RE = /\\[ \t]/,
  BACKSLASH_LINE_CONTINUATION_RE = /(?:^|[^ \t\\])(?:\\\\)*\\\n|[ \t](?:\\\\)+\\\n/,
  BACKSLASH_WHITESPACE_RE = new RegExp(
    `${BACKSLASH_ESCAPED_SPACE_RE.source}|${BACKSLASH_LINE_CONTINUATION_RE.source}`,
  ),
  WORD_LEAF_EXPANSION_RE = /(?:^|[^\\])(?:\\\\)*(?:[`$]|[<>=]\()/,
  WORD_LEAF_QUOTE_RE = /(?:^|[^\\])(?:\\\\)*['"]/,
  ZSH_TILDE_BRACKET_RE = /~\[/,
  ZSH_EQUALS_EXPANSION_RE = /(?:^|[\s;&|])=[a-zA-Z_]/,
  ZSH_NUMERIC_GLOB_RE = /<\d*-\d*>/,
  BRACE_WITH_QUOTE_RE = /\{[^}]*['"]/;
/**
 * 简易扫描：命令文本在未加引号处（跳过单/双引号、反引号、注释）出现 * ? [ 即为真。写入 SimpleCommand.hasUnquotedGlob。
 */
//@ chunk-r01896cg.js:5653-6301 layout
function hasUnquotedGlob(text) {
  let t = !1,
    r = !1,
    s = !1,
    o = !0,
    n = 0;
  while (n < text.length) {
    let i = text[n];
    if (s)
      if (i === "\\" && (text[n + 1] === "`" || text[n + 1] === "\\" || text[n + 1] === "$")) n += 2;
      else {
        if (i === "`") s = !1;
        n++;
      }
    else if (t) {
      if (i === "'") t = !1;
      n++;
    } else if (r)
      if (i === "\\" && (text[n + 1] === '"' || text[n + 1] === "\\" || text[n + 1] === "`")) n += 2;
      else if (i === "`") ((s = !0), n++);
      else {
        if (i === '"') r = !1;
        n++;
      }
    else if (i === "\\" && n + 1 < text.length) {
      if (
        text[n + 1] !==
        `
`
      )
        o = !1;
      n += 2;
    } else if (i === "#" && o) {
      while (
        n < text.length &&
        text[n] !==
          `
`
      )
        n++;
      o = !0;
    } else if (i === "`") ((s = !0), (o = !1), n++);
    else {
      if (i === "*" || i === "?" || i === "[") return !0;
      if (i === "'") t = !0;
      else if (i === '"') r = !0;
      ((o =
        i === " " ||
        i === "\t" ||
        i ===
          `
` ||
        i === ";" ||
        i === "|" ||
        i === "&" ||
        i === "(" ||
        i === ")" ||
        i === "<" ||
        i === ">"),
        n++);
    }
  }
  return !1;
}
//@ chunk-r01896cg.js:6301-6326 layout
var GLOB_PATTERN_RE = /[*?]|\[[^\]]*\]/;
//@ chunk-r01896cg.js:6326-6359 layout
function looksLikeGlob(e) {
  return GLOB_PATTERN_RE.test(e);
}
/**
 * 判断命令 argv 或非 heredoc 重定向目标中是否有会被 shell 通配展开的模式（结合 argvUnquotedGlob 与占位符）。
 */
//@ chunk-r01896cg.js:6359-6680 facade-majority
function hasSourceUnquotedGlob(command) {
  let argvUnquotedGlob = command.argvUnquotedGlob;
  if (
    command.carveOutMayDesyncQuoteScan === !0 ||
    (argvUnquotedGlob === void 0 && command.argv.some(containsAnyPlaceholder))
  )
    return (
      command.argv.some(looksLikeGlob) ||
      command.redirects.some(
        (redirect) => redirect.op !== "<<" && redirect.op !== "<<<" && looksLikeGlob(redirect.target),
      )
    );
  if (argvUnquotedGlob === void 0) return !1;
  if (argvUnquotedGlob.length !== command.argv.length) return command.argv.some(looksLikeGlob);
  return command.argv.some(
    (s, o) => looksLikeGlob(s) && (argvUnquotedGlob[o] === !0 || containsAnyPlaceholder(s)),
  );
}
/**
 * 把单/双引号与反引号内的 { 替换为空格，用于 BRACE_WITH_QUOTE_RE 预检，避免把引号里的花括号当成展开混淆。
 */
//@ chunk-r01896cg.js:6680-7494 file-local
function maskBracesInQuotedContexts(cmd) {
  if (!cmd.includes("{")) return cmd;
  let out = [],
    r = !1,
    s = !1,
    o = !1,
    n = !0,
    i = 0;
  while (i < cmd.length) {
    let c = cmd[i];
    if (o)
      if (c === "\\" && (cmd[i + 1] === "`" || cmd[i + 1] === "\\" || cmd[i + 1] === "$"))
        (out.push(c, cmd[i + 1]), (i += 2));
      else {
        if (c === "`") o = !1;
        (out.push(c === "{" ? " " : c), i++);
      }
    else if (r) {
      if (c === "'") r = !1;
      (out.push(c === "{" ? " " : c), i++);
    } else if (s)
      if (c === "\\" && (cmd[i + 1] === '"' || cmd[i + 1] === "\\" || cmd[i + 1] === "`"))
        (out.push(c, cmd[i + 1]), (i += 2));
      else if (c === "`") ((o = !0), out.push(c), i++);
      else {
        if (c === '"') s = !1;
        (out.push(c === "{" ? " " : c), i++);
      }
    else if (c === "\\" && i + 1 < cmd.length) {
      if (
        (out.push(c, cmd[i + 1]),
        cmd[i + 1] !==
          `
`)
      )
        n = !1;
      i += 2;
    } else if (c === "#" && n) {
      while (
        i < cmd.length &&
        cmd[i] !==
          `
`
      )
        (out.push(cmd[i]), i++);
      n = !0;
    } else if (c === "`") ((o = !0), (n = !1), out.push(c), i++);
    else {
      if (c === "'") r = !0;
      else if (c === '"') s = !0;
      ((n =
        c === " " ||
        c === "\t" ||
        c ===
          `
` ||
        c === ";" ||
        c === "|" ||
        c === "&" ||
        c === "(" ||
        c === ")" ||
        c === "<" ||
        c === ">"),
        out.push(c),
        i++);
    }
  }
  return out.join("");
}
//@ chunk-r01896cg.js:7494-7525 callgraph-fingerprint = DOLLAR (1)
var DOLLAR = String.fromCharCode(36);
//@ chunk-r01896cg.js:7525-7621 file-local
function collectCommandSubstitution(e, t) {
  if (e.type === t) return !0;
  for (let child of e.children) if (child && collectCommandSubstitution(child, t)) return !0;
  return !1;
}
/**
 * 安全解析入口（2.1.88 parseForSecurity 的 316 版）：空串/解析失败返回空 simple；否则调用 parseForSecurityFromAstWithLoopCheck，simple 结果附带 tree。选项 readsDivergentShapes 用于按“分歧形态”重读。被 Shell.exec 的 worktree 守卫、命令文本日志与 shell -c 递归检查使用。
 */
//@ chunk-r01896cg.js:7621-7947 facade-majority
async function parseForSecurity(command, { readsDivergentShapes: readsDivergentShapes = !1 } = {}) {
  if (command === "") return { kind: "simple", commands: [], bareAssignmentNames: [] };
  let root = await parseCommandRaw(command);
  if (root === null) return { kind: "simple", commands: [], bareAssignmentNames: [] };
  let result = parseForSecurityFromAst(command, root, { readsDivergentShapes: readsDivergentShapes });
  if (root !== PARSE_ABORTED && (result.kind === "simple" || result.nodeType !== void 0))
    return { ...result, tree: root };
  return result;
}
/**
 * 为 n 个声明前缀生成“bash 是否保留赋值”的若干种布尔组合：n≤3 全枚举（exhaustive），否则取全假/全真/单个为真，并补上当前组合。供 shell -c 递归检查逐种读法判定。
 */
//@ chunk-r01896cg.js:7947-8297 facade-majority
function declarationPrefixReadings(count, currentReading) {
  let r = (o) => Array.from({ length: count }, (n, i) => o(i));
  if (count <= 3)
    return {
      readings: Array.from({ length: 2 ** count }, (o, n) => r((i) => Math.floor(n / 2 ** i) % 2 === 1)),
      exhaustive: !0,
    };
  let s = [r(() => !1), r(() => !0)];
  for (let o = 0; count <= 8 && o < count; o++) s.push(r((n) => n === o));
  if (currentReading?.length === count && !s.some((o) => o.every((n, i) => n === currentReading[i])))
    s.push([...currentReading]);
  return { readings: s, exhaustive: !1 };
}
/**
 * parseForSecurityFromAst 的包装：先以 first 轮运行；若结果 simple 且含循环、且 GrowthBook tengu_snappy_tower 打开，再以 later 轮（循环体按迭代后状态重走）运行，两次结果不深度相等时加 laterLoopPassesDiffer。BashTool 权限检查的主要调用点。
 */
//@ chunk-r01896cg.js:8297-8451 facade-majority
function parseForSecurityFromAst(command, root, options = {}) {
  let firstPass = parseForSecurityFromAst_2(command, root, options, "first");
  return firstPass.kind === "simple" &&
    firstPass.hasLoop === !0 &&
    wCi() &&
    !isDeepStrictEqual(firstPass, parseForSecurityFromAst_2(command, root, options, "later"))
    ? { ...firstPass, laterLoopPassesDiffer: !0 }
    : firstPass;
}
/**
 * Bash 安全分析核心：先做字节级预检（孤立代理项、控制字符、Unicode 空白、反斜杠空白、zsh ~[ / =cmd / <N-M>、花括号内引号），再查解析中止、反引号扫描异常、顶层语句之间/末尾是否有解析器跳过的字节、fd 变量重定向、重定向形状、结构性解析错误；然后保存/重置模块级分析状态，调用 walkProgram 收集 SimpleCommand。返回 {kind:'simple', commands, bareAssignmentNames, hasLoop, …} 或 {kind:'too-complex', reason, nodeType?, differential?, divergentShape?, keepsRemovalVerdict?}；可附 usesAssignedValue、uncertainWrite、declarationPrefixes。
 */
//@ chunk-r01896cg.js:8451-11790 fingerprint = parseForSecurityFromAst (0.455)
function parseForSecurityFromAst_2(
  command,
  root,
  {
    plainUnquotedHeredocs: plainUnquotedHeredocs = !1,
    declarationPrefix: declarationPrefix,
    readsDivergentShapes: readsDivergentShapes = !1,
  },
  pass,
) {
  if (LONE_SURROGATE_RE.test(command))
    return { kind: "too-complex", reason: "Contains lone surrogate", differential: !0 };
  if (CONTROL_CHAR_RE.test(command))
    return { kind: "too-complex", reason: "Contains control characters", differential: !0 };
  if (UNICODE_WHITESPACE_RE.test(command))
    return { kind: "too-complex", reason: "Contains Unicode whitespace", differential: !0 };
  if (BACKSLASH_WHITESPACE_RE.test(command))
    return { kind: "too-complex", reason: "Contains backslash-escaped whitespace", differential: !0 };
  if (ZSH_TILDE_BRACKET_RE.test(command))
    return { kind: "too-complex", reason: "Contains zsh ~[ dynamic directory syntax", differential: !0 };
  if (ZSH_EQUALS_EXPANSION_RE.test(command))
    return { kind: "too-complex", reason: "Contains zsh =cmd equals expansion", differential: !0 };
  if (ZSH_NUMERIC_GLOB_RE.test(command))
    return { kind: "too-complex", reason: "Contains zsh <N-M> numeric-range glob", differential: !0 };
  if (BRACE_WITH_QUOTE_RE.test(maskBracesInQuotedContexts(command)))
    return {
      kind: "too-complex",
      reason: "Contains brace with quote character (expansion obfuscation)",
      differential: !0,
    };
  if (command.trim() === "") return { kind: "simple", commands: [], bareAssignmentNames: [] };
  if (root === PARSE_ABORTED)
    return {
      kind: "too-complex",
      reason: "Parser aborted (timeout, resource limit, or over-length)",
      nodeType: "PARSE_ABORT",
    };
  for (let E of ["backtick_body_empty", "backtick_body_overrun", "backtick_escape_unsupported"])
    if (collectCommandSubstitution(root, E))
      return {
        kind: "too-complex",
        reason:
          E === "backtick_body_empty"
            ? "empty backtick substitution \u2014 bash joins the surrounding words, so the parsed command boundaries cannot be trusted"
            : "backtick substitution scan could not be trusted (" +
              E +
              ") \u2014 the parsed bytes may differ from what bash executes",
        differential: !0,
      };
  let buffer = Buffer.from(command, "utf8");
  {
    let E = findZshDifferentialSyntax(root, buffer, 0);
    if (E) return E;
  }
  {
    let E = checkDeclarationOperands(root);
    if (E) return E;
  }
  let l = (E) => E === 32 || E === 9 || E === 10 || E === 13 || E === 59 || E === 38,
    f = (E, K) => {
      let B = E;
      while (B < K) {
        let et = buffer[B];
        if (l(et)) B++;
        else if (et === 92 && (buffer[B + 1] === 10 || (buffer[B + 1] === 13 && buffer[B + 2] === 10)))
          B += buffer[B + 1] === 13 ? 3 : 2;
        else break;
      }
      return B;
    },
    sorted = root.children
      .filter((E) => E !== null)
      .map((E) => [E.startIndex, E.endIndex])
      .sort((E, K) => E[0] - K[0]),
    coveredEnd = 0;
  for (let [E, K] of sorted) {
    if (f(coveredEnd, E) < E)
      return { kind: "too-complex", reason: "Parser skipped input between top-level statements" };
    if (K > coveredEnd) coveredEnd = K;
  }
  if (f(coveredEnd, buffer.length) < buffer.length)
    return { kind: "too-complex", reason: "Parser did not consume trailing input" };
  {
    let E = findFdVariableRedirect(root, buffer);
    if (E !== null)
      return {
        kind: "too-complex",
        reason: `Redirect uses ${describeFdVariable(E)} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
  }
  {
    let E = findRedirectShapeError(root);
    if (E) return E;
  }
  let divergentShapeError = readsDivergentShapes ? null : findStructuralParseError(root);
  if (divergentShapeError !== null)
    return {
      kind: "too-complex",
      reason: divergentShapeError,
      nodeType: "ERROR",
      differential: !0,
      divergentShape: !0,
    };
  let h = allowPlainUnquotedHeredocs,
    d = readingDivergentShapes,
    m = sawUncertainWrite,
    p = reExpansionBudget,
    g = currentDeclarationPrefix,
    _ = declarationPrefixCount,
    b = declarationPrefixValues,
    k = prefixAssignInBranch,
    A = unsetNames,
    R = declarationPrefixBashKeeps,
    T = usedAssignedValue;
  usedAssignedValue = !1;
  let v = isLaterLoopPass,
    de = currentLoopNode,
    tn = loopDepth;
  ((isLaterLoopPass = pass === "later"),
    (currentLoopNode = null),
    (loopDepth = 0),
    (allowPlainUnquotedHeredocs = plainUnquotedHeredocs),
    (readingDivergentShapes = readsDivergentShapes),
    (sawUncertainWrite = !1),
    (reExpansionBudget = command.length * RE_EXPANSION_FACTOR),
    (currentDeclarationPrefix = declarationPrefix),
    (declarationPrefixCount = 0),
    (declarationPrefixValues = new Map()),
    (prefixAssignInBranch = !1),
    (unsetNames = new Set()),
    (declarationPrefixBashKeeps = void 0));
  let result;
  try {
    if (((result = walkProgram(root)), usedAssignedValue && result.kind === "simple"))
      result = { ...result, usesAssignedValue: !0 };
    if (prefixAssignInBranch && result.kind === "simple")
      result = {
        kind: "too-complex",
        reason:
          "A variable set in front of a declaration inside a branch or loop can't be checked before it runs",
      };
    let E = getDeclarationPrefixBashKeeps();
    if (declarationPrefix === void 0 && E !== void 0)
      result = { ...result, declarationPrefixes: E.length, declarationPrefixBashKeeps: E };
    if (
      declarationPrefix !== void 0 &&
      result.kind === "simple" &&
      getDeclarationPrefixCount() !== declarationPrefix.length
    )
      result = {
        kind: "too-complex",
        reason: "The variables set in front of declarations in this command can't be checked before it runs",
      };
    if (sawUncertainWrite) result = { ...result, uncertainWrite: !0 };
  } finally {
    ((allowPlainUnquotedHeredocs = h),
      (readingDivergentShapes = d),
      (sawUncertainWrite = m),
      (reExpansionBudget = p),
      (currentDeclarationPrefix = g),
      (declarationPrefixCount = _),
      (declarationPrefixValues = b),
      (prefixAssignInBranch = k),
      (unsetNames = A),
      (declarationPrefixBashKeeps = R),
      (usedAssignedValue = T),
      (isLaterLoopPass = v),
      (currentLoopNode = de),
      (loopDepth = tn));
  }
  if (
    result.kind === "too-complex" &&
    result.nodeType !== "ERROR" &&
    (hasDollarNonAsciiError(root) || hasZshLengthOfNonAsciiSubscript(root))
  )
    return { ...result, nodeType: "ERROR" };
  return result;
}
/**
 * 找结构性解析错误：空的非 heredoc 节点返回 Parse error；[ 紧贴后续单词时返回理由。
 */
//@ chunk-r01896cg.js:11790-12124 layout
function findStructuralParseError(node) {
  if (node.children.length === 0)
    return node.startIndex === node.endIndex && !node.type.startsWith("heredoc_") ? "Parse error" : null;
  for (let t of node.children) {
    let r = t === null ? null : findStructuralParseError(t);
    if (r !== null) return r;
  }
  return node.type === "test_command" && node.children[0]?.type === "[" && !/^\[[ \t]/.test(node.text)
    ? "[ glued to the next word names another command"
    : null;
}
//@ chunk-r01896cg.js:12124-12261 layout = nodeTypeId (1)
function hasDollarNonAsciiError(nodeType) {
  if (nodeType.type === "ERROR" && (nodeType.text.startsWith("${") || isDollarNonAsciiName(nodeType.text)))
    return !0;
  for (let t of nodeType.children) if (t && hasDollarNonAsciiError(t)) return !0;
  return !1;
}
//@ chunk-r01896cg.js:12261-12680 layout
function hasZshLengthOfNonAsciiSubscript(e) {
  let children = e.children;
  for (let r = 0; r < children.length; r++) {
    let s = children[r];
    if (!s) continue;
    if (
      s.type === "simple_expansion" &&
      s.children.some((o) => o?.type === "special_variable_name" && o.text === "#")
    ) {
      let o = "";
      for (let i = r + 1; i < children.length; i++) {
        let c = children[i]?.text ?? "";
        if (((o += c), !/^[\w\u0080-\uffff]*$/.test(c))) break;
      }
      let match = /^[\w\u0080-\uffff]*(?=\[|:[a-zA-Z&])/.exec(o);
      if (match && /[\u0080-\uffff]/.test(match[0])) return !0;
    }
    if (hasZshLengthOfNonAsciiSubscript(s)) return !0;
  }
  return !1;
}
//@ chunk-r01896cg.js:12680-12769 layout
function isDollarNonAsciiName(e) {
  return /^\$[#^=~+]*[\w\u0080-\uffff]+$/.test(e) && /[\u0080-\uffff]/.test(e);
}
/**
 * 递归查找 bash 与 zsh 解读不同的语法（注释紧贴括号、case 模式组内注释、无 () 的 function 括号体、关键字紧贴括号），命中时返回 too-complex（differential）。
 */
//@ chunk-r01896cg.js:12769-14269 layout
function findZshDifferentialSyntax(node, bytes, baseOffset) {
  for (let s of node.children) {
    if (!s) continue;
    let o = s.startIndex - 1 - baseOffset;
    if (s.type === "comment" && o >= 0 && (bytes[o] === 41 || bytes[o] === 40))
      return {
        kind: "too-complex",
        reason:
          "comment glued to a paren \u2014 bash reads `)#\u2026` and `(#\u2026` as a comment, but zsh reads a keyword- or word-glued `(\u2026)` as a glob group whose `#\u2026` text is word content that executes",
        differential: !0,
      };
    let n = findZshDifferentialSyntax(s, bytes, baseOffset);
    if (n) return n;
  }
  for (let s of node.children) {
    if (!s) continue;
    if (
      s.type === "case_item" &&
      !s.children.some((o) => o !== void 0 && o.type === ")") &&
      hasCommentNode(s)
    )
      return {
        kind: "too-complex",
        reason:
          "`case` pattern group holds a comment \u2014 bash reads no comment inside a pattern list, but zsh reads the group as one glob word and expands its contents",
        differential: !0,
      };
    if (s.type === "function" && !node.children.some((o) => o !== void 0 && o.type === "(")) {
      let o = node.children[1],
        n = node.children.find((c) => c !== void 0 && c.type === "redirected_statement")?.children[0],
        i =
          node.children.find((c) => c !== void 0 && c.type === "subshell") ??
          (n?.type === "subshell" ? n : void 0);
      if (
        o !== void 0 &&
        i !== void 0 &&
        isOnlyBlankBetween(bytes, o.endIndex - baseOffset, i.startIndex - baseOffset)
      )
        return {
          kind: "too-complex",
          reason:
            "`function` with a parenthesised body and no `()` \u2014 bash reads a subshell body, but zsh reads one glob-group word and expands its contents",
          differential: !0,
        };
    }
    if (wn.has(s.type) && bytes[s.endIndex - baseOffset] === 40)
      return {
        kind: "too-complex",
        reason: `\`${s.type}\` glued to a paren \u2014 bash reads a keyword and a subshell, but zsh reads one glob-group word and expands its contents`,
        differential: !0,
      };
  }
  return null;
}
//@ chunk-r01896cg.js:14269-14329 layout
var wn = new Set(["if", "elif", "else", "while", "until", "case"]);
/**
 * 递归检查 declare/unset 语句的写法：标志会改变赋值语义且有会被求值的操作数、相邻引号片段拼成一个操作数、$'…' 标志、拼写成别的命令但实为声明等，返回 too-complex。（实为 ast.ts 安全检查，被切到 bashParser.ts）
 */
//@ chunk-r01896cg.js:14329-19184 layout
function checkDeclarationOperands(e) {
  if (e.type === "declaration_command" || e.type === "unset_command") {
    if (
      e.type === "declaration_command" &&
      e.children.some(
        (n) =>
          n !== void 0 &&
          (/^(?:export|readonly)$/.test(e.children[0]?.text ?? "")
            ? EXPORT_SEMANTIC_FLAG_RE
            : DECLARE_SEMANTIC_FLAG_RE
          ).test(unquoteFlagWord(n.text)),
      ) &&
      !areDeclareArgsSimple(e)
    )
      return {
        kind: "too-complex",
        reason: `${e.children[0]?.text ?? "declare"} with a flag that changes assignment semantics and an operand it would evaluate`,
        differential: !0,
      };
    let t =
        e.type === "unset_command" || /^(?:declare|typeset|local|export)$/.test(e.children[0]?.text ?? ""),
      matches = /^(?:declare|typeset|local)$/.test(e.children[0]?.text ?? ""),
      any = e.children.some((n) => n !== void 0 && /^[-+][A-Za-z]*[fF]/.test(unquoteFlagWord(n.text))),
      o;
    for (let [n, i] of e.children.entries()) {
      if (!i) continue;
      if (n > 1 && o !== void 0 && i.type !== "variable_assignment" && i.startIndex === o.endIndex)
        return {
          kind: "too-complex",
          reason: `${e.children[0]?.text ?? e.type} operand '${o.text}${i.text}' is split across adjacent quoted segments \u2014 the shell joins them into one word the analyzer cannot verify`,
          differential: !0,
        };
      if (n > 0 && i.type === "ansi_c_string" && /^\$'[-+]/.test(i.text))
        return {
          kind: "too-complex",
          reason: `${e.children[0]?.text ?? e.type} flag ${i.text} \u2014 a $'\u2026' flag word the shell decodes`,
          differential: !0,
        };
      if (n > 0 && !/^[-+]/.test(unquoteFlagWord(i.text))) {
        let c =
          i.type === "word" ||
          i.type === "raw_string" ||
          i.type === "concatenation" ||
          i.type === "variable_name" ||
          i.type === "number";
        if (i.type === "ansi_c_string" && (t || e.children[0]?.text === "readonly"))
          return {
            kind: "too-complex",
            reason: `${e.children[0]?.text ?? e.type} operand ${i.text} \u2014 a $'\u2026' word the shell decodes, which may carry a subscript the parser cannot read`,
            differential: !0,
          };
        if (matches) {
          if (!isSafeDeclarationArg(i, any))
            return {
              kind: "too-complex",
              reason: `${e.children[0]?.text ?? "declare"} operand '${i.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: !0,
            };
          o = i;
          continue;
        }
        let l = getAssignmentName(i.text),
          matches_2 = /^['"]?[A-Za-z_]\w*=/.test(i.text),
          y = c
            ? (t && l.includes("[")) ||
              (matches_2 ? l.slice(1).includes("\\") : i.text.slice(1).includes("\\"))
            : i.type === "string" && (matches_2 ? l.includes("\\") : i.text.includes("\\")),
          x = i.type === "variable_assignment" && /['\\]/.test(getAssignmentName(i.text)),
          u = c && t && /^['"]?\$/.test(l) && /[[`'"]/.test(i.text);
        if (y || x || u)
          return {
            kind: "too-complex",
            reason: `${e.children[0]?.text ?? e.type} operand '${i.text}' carries a subscript or escape the shell evaluates \u2014 the parser read it as literal text`,
            differential: !0,
          };
        if (
          i.type === "variable_name"
            ? !(PLAIN_VAR_NAME_RE.test(i.text) || (any && FUNCTION_NAME_RE.test(i.text)))
            : (i.type === "word" ||
                i.type === "concatenation" ||
                i.type === "raw_string" ||
                (i.type === "string" && getAssignmentName(i.text) !== i.text)) &&
              !isPlainDeclarationOperand(i.text, any, e.children[0]?.text === "readonly")
        )
          return {
            kind: "too-complex",
            reason: `${e.children[0]?.text ?? e.type} operand '${i.text}' is not a plain variable name \u2014 the shell expands or matches it before assigning`,
            differential: !0,
          };
      }
      o = i;
    }
  }
  if (e.type === "command") {
    let found = e.children.find((o) => o !== void 0 && o.type === "command_name"),
      r = found === void 0 ? -1 : e.children.indexOf(found),
      filtered = e.children.filter((o, n) => o !== void 0 && n > r && o.type !== "command_name");
    if (found !== void 0) {
      if (containsAnsiCString(found) && filtered.some((f) => !/^[-+]/.test(unquoteFlagWord(f.text))))
        return {
          kind: "too-complex",
          reason: `command head ${found.text} \u2014 a $'\u2026' word the shell decodes before looking the command up`,
          differential: !0,
        };
      let o = stripQuoteChars(found.text),
        n = filtered,
        i = !1,
        c = !1;
      while (PREFIX_WRAPPER_RE.test(o) && n.length > 0) {
        i = !0;
        while (n.length > 0 && /^-/.test(unquoteFlagWord(n[0].text))) {
          let f = unquoteFlagWord(n[0].text);
          if (o === "command" && /^-[pP]*[vV]/.test(f)) c = !0;
          n = n.slice(o === "exec" && /^-[cl]*a$/.test(f) ? 2 : 1);
        }
        if (
          !c &&
          n.length > 0 &&
          containsAnsiCString(n[0]) &&
          n.slice(1).some((f) => !/^[-+]/.test(unquoteFlagWord(f.text)))
        )
          return {
            kind: "too-complex",
            reason: `command head ${n[0].text} after ${o} \u2014 a $'\u2026' word the shell decodes before looking the command up`,
            differential: !0,
          };
        ((o = n.length > 0 ? stripQuoteChars(n[0].text) : ""), (n = n.slice(1)));
      }
      let l = i || stripQuoteChars(found.text) !== found.text || DECLARATION_NAME_RE.test(found.text);
      if (!c && l && DECLARATION_NAME_RE.test(o)) {
        let f = o === "integer" || o === "float",
          y = { ...e, children: [found, ...(f ? [{ ...found, text: "-i" }] : []), ...n] },
          joined = n
            .map((p) => unquoteFlagWord(p.text))
            .filter((p) => /^[-+]/.test(p))
            .join(""),
          u =
            f ||
            (/^(?:declare|typeset|local|private)$/.test(o) && DECLARE_SEMANTIC_FLAG_CHARS.test(joined)) ||
            (/^(?:export|readonly)$/.test(o) && EXPORT_SEMANTIC_FLAG_CHARS.test(joined)),
          filtered = n.filter((p) => !/^[-+]/.test(unquoteFlagWord(p.text))),
          matches = /[fF]/.test(joined),
          m =
            (u && !areDeclareArgsSimple(y)) ||
            n.some((p) => p.type === "ansi_c_string" && /^\$'[-+]/.test(p.text));
        if (/^(?:declare|typeset|local|integer|float|private)$/.test(o))
          m ||= filtered.some((p) => !isSafeDeclarationArg(p, matches));
        else
          m ||= filtered.some((p) => {
            if (p.type === "ansi_c_string") return !0;
            let g = getAssignmentName(p.text);
            return (
              /[\\'"]/.test(g.replace(/^['"]/, "").replace(/['"]$/, "")) ||
              (o !== "readonly" && g.includes("[")) ||
              /^['"]?\$/.test(g) ||
              ((p.type === "word" ||
                p.type === "concatenation" ||
                p.type === "raw_string" ||
                (p.type === "string" && getAssignmentName(p.text) !== p.text)) &&
                !isPlainDeclarationOperand(p.text, matches, o === "readonly"))
            );
          });
        if (m)
          return {
            kind: "too-complex",
            reason: `${o} spelled '${i ? `${found.text} \u2026` : found.text}' with an operand the shell would evaluate \u2014 the parser did not read this as a declaration`,
            differential: !0,
          };
      }
    }
  }
  for (let t of e.children) {
    if (!t) continue;
    let r = checkDeclarationOperands(t);
    if (r) return r;
  }
  return null;
}
/**
 * 声明类命令的正则与选项规则：前缀包装（builtin/command/exec/time/coproc/noglob/nocorrect/-）、声明命令名、declare/export 会改变语义的标志字母，以及 declare/typeset/local/export/readonly 的赋值型与列出型选项。
 */
//@ chunk-r01896cg.js:19184-19657 placement = DECL_KEYWORDS (0.884)
var PREFIX_WRAPPER_RE = /^(?:builtin|command|exec|time|coproc|noglob|nocorrect|-)$/,
  DECLARATION_NAME_RE = /^(?:declare|typeset|local|export|readonly|unset|integer|float|private)$/,
  DECLARE_SEMANTIC_FLAG_RE = /^[-+].*[nialuAEFLRZ]/,
  DECLARE_SEMANTIC_FLAG_CHARS = /[nialuAEFLRZ]/,
  EXPORT_SEMANTIC_FLAG_RE = /^[-+].*[aAiluEFLRZ]/,
  EXPORT_SEMANTIC_FLAG_CHARS = /[aAiluEFLRZ]/,
  DECLARE_OPTION_CLASSES = { assigning: /^[-+][rtx]+$/, listing: /^(?:-[fgprtxU]+|\+[grtx]+)$/ },
  DECLARATION_OPTION_RULES = new Map([
    ["declare", DECLARE_OPTION_CLASSES],
    ["typeset", DECLARE_OPTION_CLASSES],
    ["local", { assigning: DECLARE_OPTION_CLASSES.assigning, listing: /^-[fprtx]+$/ }],
    ["export", { listing: /^-[aAfnp]+$/ }],
    ["readonly", { listing: /^-[aAfpx]+$/ }],
  ]);
/**
 * 检查声明命令的选项组合：列举型选项与赋值同用、readonly 重复命名、选项出现在名字之后、bash/zsh 不共同支持的选项，返回理由或 null。
 */
//@ chunk-r01896cg.js:19657-20601 placement
function checkDeclarationOptions(e, t) {
  let r = DECLARATION_OPTION_RULES.get(e),
    s = new Set(),
    o = e === "readonly",
    n = !1,
    i;
  for (let c of t)
    if (!/^[-+]/.test(c)) {
      if (i !== void 0 && c.includes("="))
        return `${e} ${i} with an assignment \u2014 not every supported bash and zsh assigns under that option, so the value cannot be statically verified`;
      let replaced = c.replace(/\+?=.*/s, "");
      if (o && c.includes("=") && s.has(replaced))
        return `${e} names '${redactPlaceholdersForDisplay(replaced)}' twice \u2014 the first makes it read-only, so bash does not carry out the second`;
      (s.add(replaced), (n = !0));
    } else if (n)
      return `${e} word '${redactPlaceholdersForDisplay(c)}' comes after the options \u2014 the shell reads it as a name, which it cannot be, and bash and zsh go on from that error differently`;
    else if (c === "--") n = !0;
    else if (r?.assigning?.test(c)) o ||= /^-.*r/.test(c);
    else if (r?.listing.test(c)) i ??= c;
    else
      return `${e} option '${redactPlaceholdersForDisplay(c)}' is not one bash and zsh are both known to accept \u2014 a shell that rejects it assigns nothing, so the names it declares cannot be statically verified`;
  return null;
}
/**
 * 检查声明上下文分歧：local 在函数外赋值、export/readonly 给名字加数组属性，返回理由或 null。
 */
//@ chunk-r01896cg.js:20601-21033 placement
function checkDeclarationContext(e, t) {
  let filtered = t.filter((s) => !/^[-+]/.test(s));
  if (e === "local" && filtered.some((s) => s.includes("=")))
    return "'local' outside a function \u2014 bash refuses that and assigns nothing, so the value cannot be statically verified";
  if ((e === "export" || e === "readonly") && filtered.length > 0 && t.some(Te))
    return `'${e}' gives a name the array attribute \u2014 zsh empties a value it held and bash keeps it, so it cannot be statically verified`;
  return null;
}
//@ chunk-r01896cg.js:21033-21092 placement
var PLAIN_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/,
  FUNCTION_NAME_RE = /^[A-Za-z_][\w.:-]*$/;
//@ chunk-r01896cg.js:21092-21403 placement
function isPlainDeclarationOperand(e, t, r = !1) {
  let s = getAssignmentName(e),
    o = e[0];
  if (o === "'" || o === '"') {
    if (((s = s.slice(1)), s.endsWith(o))) s = s.slice(0, -1);
  } else if (/^\\[A-Za-z_]/.test(s)) s = s.slice(1);
  if (r && (o === "'" || o === '"')) {
    let index = e.indexOf("["),
      index_2 = e.indexOf(o, 1);
    if (index > 0 && index_2 > index) s = s.replace(/\[[\s\S]*$/, "");
  }
  return ((s = s.replace(/\+$/, "")), PLAIN_VAR_NAME_RE.test(s) || (t && FUNCTION_NAME_RE.test(s)));
}
//@ chunk-r01896cg.js:21403-21491 placement
function containsAnsiCString(e) {
  return e.type === "ansi_c_string" || e.children.some((t) => t !== void 0 && containsAnsiCString(t));
}
//@ chunk-r01896cg.js:21491-21563 placement
function stripQuoteChars(e) {
  return e.replace(/\$(['"])/g, "$1").replace(/["'\\]/g, "");
}
//@ chunk-r01896cg.js:21563-21689 placement
var EXPANSION_NODE_TYPES = new Set([
    "command_substitution",
    "process_substitution",
    "arithmetic_expansion",
    "expansion",
    "simple_expansion",
  ]),
  EXPANSION_MASK = "$_";
//@ chunk-r01896cg.js:21689-22087 placement = mk (0.834)
function maskExpansions(e) {
  let t = [],
    r = (i) => {
      for (let c of i.children) {
        if (!c) continue;
        if (EXPANSION_NODE_TYPES.has(c.type))
          t.push([c.startIndex - e.startIndex, c.endIndex - e.startIndex]);
        else r(c);
      }
    };
  if ((r(e), t.length === 0)) return e.text;
  t.sort((i, c) => i[0] - c[0]);
  let buffer = Buffer.from(e.text, "utf8"),
    o = "",
    n = 0;
  for (let [i, c] of t) {
    if (i < n || c > buffer.length) return e.text;
    ((o += buffer.subarray(n, i).toString("utf8") + EXPANSION_MASK), (n = c));
  }
  return o + buffer.subarray(n).toString("utf8");
}
//@ chunk-r01896cg.js:22087-22234 sole-consumer
function hasParenInExpansion(e) {
  if (e.type === "expansion" && e.text.replace(/\$\(\(?|[<>]\(/g, "").includes("(")) return !0;
  return e.children.some((t) => t !== void 0 && hasParenInExpansion(t));
}
/**
 * 判断 declare/export 等的参数是否为安全的变量名或 name=value：拒绝大括号展开、ANSI-C 字符串、展开中的括号与以 ( 开头的值，数组赋值与数字直接接受。
 */
//@ chunk-r01896cg.js:22234-22898 sole-consumer
function isSafeDeclarationArg(node, allowExtendedNames) {
  if (node.type === "number" || /^\d+$/.test(node.text)) return !0;
  let masked = maskExpansions(node);
  if (
    node.type !== "raw_string" &&
    node.type !== "string" &&
    BRACE_EXPANSION_RE.test(maskBracesInQuotedContexts(masked))
  )
    return !1;
  let unquoted = /^['"]/.test(masked) ? masked.slice(1) : masked,
    eqIndex = unquoted.indexOf("="),
    varName = (eqIndex < 0 ? unquoted : unquoted.slice(0, eqIndex)).replace(/\+$/, "");
  if (!(allowExtendedNames ? /^[A-Za-z_][\w.:-]*['"]?$/ : /^[A-Za-z_]\w*['"]?$/).test(varName)) return !1;
  if (eqIndex < 0) return !0;
  if (
    node.children.find((f, y) => f !== void 0 && y >= 2 && f.type !== "=" && f.type !== "+=")?.type ===
    "array"
  )
    return !0;
  if (containsAnsiCString(node) || /\$'./.test(masked)) return !1;
  if (hasParenInExpansion(node)) return !1;
  let valueRest = unquoted.slice(eqIndex + 1);
  for (;;)
    if (/^[\\'"]/.test(valueRest)) valueRest = valueRest.slice(1);
    else if (/^\$['"]/.test(valueRest)) valueRest = valueRest.slice(2);
    else if (valueRest.startsWith(EXPANSION_MASK)) valueRest = valueRest.slice(EXPANSION_MASK.length);
    else break;
  return !valueRest.startsWith("(");
}
//@ chunk-r01896cg.js:22898-23179 sole-consumer
function getAssignmentName(e) {
  let t = 0,
    r = null,
    s = e[0] === "'" || e[0] === '"' ? e[0] : null;
  for (let o = s === null ? 0 : 1; o < e.length; o += 1) {
    let n = e[o];
    if (r !== null) {
      if (n === r) r = null;
    } else if ((n === "'" || n === '"') && n !== s) r = n;
    else if (n === "[") t += 1;
    else if (n === "]" && t > 0) t -= 1;
    else if (n === "=" && t === 0) return e.slice(0, o);
  }
  return e;
}
//@ chunk-r01896cg.js:23263-23390 sole-consumer
function isOnlyBlankBetween(e, t, r) {
  let s = t;
  while (s < r) {
    let o = e[s];
    if (o === 32 || o === 9) s += 1;
    else if (o === 92 && e[s + 1] === 10) s += 2;
    else return !1;
  }
  return !0;
}
/**
 * 判断 declare 类命令的各参数是否都是简单赋值：带 -i/-E/-F 时只允许算术表达式值，否则只允许普通字符串或简单数组。
 */
//@ chunk-r01896cg.js:23390-23760 sole-consumer
function areDeclareArgsSimple(e) {
  let joined = e.children
      .map((o) => (o === void 0 ? "" : unquoteFlagWord(o.text)))
      .filter((o) => /^[-+]/.test(o))
      .join(""),
    s = /[iEF]/.test(joined)
      ? /^[A-Za-z_][\w.-]*=(?:(['"]?)[0-9+\-*\/% ().]*\1|\([0-9+\-*\/% ().\s]*\))$/
      : /^[A-Za-z_][\w.-]*(?:\+?=(?:(['"]?)[\w.\/ -]*\1|\([\w\s.\/-]*\)))?$/;
  return e.children.every((o, n) => {
    if (!o || n === 0 || /^[-+]/.test(unquoteFlagWord(o.text))) return !0;
    return s.test(o.text);
  });
}
//@ chunk-r01896cg.js:23760-23870 sole-consumer
function unquoteFlagWord(e) {
  let match = /^\$?(['"])([-+][^'"]*)\1$/.exec(e);
  if (match) return match[2];
  return /^\\[-+]/.test(e) ? e.slice(1) : e;
}
//@ chunk-r01896cg.js:23870-23927 sole-consumer
var LOOP_STATEMENT_TYPES = new Set(["for_statement", "while_statement"]),
  MAX_LOOP_NESTING = 5;
//@ chunk-r01896cg.js:23927-23970 sole-consumer
function isLoopBlockedByEnvScrub(e) {
  return LOOP_STATEMENT_TYPES.has(e.type) && isScrubEnabled();
}
/**
 * 遍历 program：先跑 Tar 预检，再 collectCommands 收集命令与裸赋值名；对每条命令检查 zsh stat -A/-H 与声明上下文（local 在函数外等）。返回 {kind:'simple', commands, bareAssignmentNames, hasLoop}。
 */
//@ chunk-r01896cg.js:23970-24387 callgraph-witnessed = walkProgram (0.331)
function walkProgram(root) {
  let preCheck = scanSameLineStatementSplits(root);
  if (preCheck) return preCheck;
  let commands = [],
    varScope = new Map(),
    bareAssignmentNames = [],
    error = collectCommands(root, commands, varScope, bareAssignmentNames);
  if (error) return error;
  let hasLoop = [...LOOP_STATEMENT_TYPES].some((l) => collectCommandSubstitution(root, l)),
    lastCommand = hasLoop ? void 0 : commands.at(-1);
  for (let l of readingDivergentShapes ? [] : commands) {
    let [f = "", ...y] = l.argv,
      x = zshStatWritesVarReason(f, y) ?? (l === lastCommand ? null : checkDeclarationContext(f, y));
    if (x !== null)
      return {
        kind: "too-complex",
        reason: x,
        divergentShape: !0,
        ...(l.argvUnquotedGlob === void 0 && { nodeType: "declaration_command" }),
      };
  }
  return { kind: "simple", commands: commands, bareAssignmentNames: bareAssignmentNames, hasLoop: hasLoop };
}
//@ chunk-r01896cg.js:24387-24554 layout = mk (0.834)
function isSameLine(e, t, r) {
  return !Buffer.from(e.text, "utf8")
    .subarray(t.endIndex - e.startIndex, r.startIndex - e.startIndex)
    .toString("utf8")
    .replace(/\\\r?\n/g, "").includes(`
`);
}
//@ chunk-r01896cg.js:24554-24959 layout = extractCompoundStructure (0.753)
var STATEMENT_NODE_TYPES = new Set([
    "command",
    "variable_assignment",
    "variable_assignments",
    "list",
    "pipeline",
    "redirected_statement",
    "negated_command",
    "declaration_command",
    "unset_command",
    "test_command",
    "subshell",
    "compound_statement",
    "if_statement",
    "while_statement",
    "for_statement",
    "case_statement",
    "function_definition",
    "ERROR",
  ]),
  SCOPED_STATEMENT_TYPES = new Set([
    "negated_command",
    "if_statement",
    "while_statement",
    "for_statement",
    "subshell",
  ]);
/**
 * 递归扫描同一行上紧贴前一语句的语句或 (…) 组：bash 会把它们读成一条命令或报错，zsh 会当成 glob 组，存在解析分歧，返回 too-complex（differential）。
 */
//@ chunk-r01896cg.js:24959-25668 facade-majority
function scanSameLineStatementSplits(e) {
  let t = null;
  for (let r of e.children) {
    if (!r) continue;
    if (STATEMENT_NODE_TYPES.has(r.type)) {
      if (t !== null) {
        let o = r;
        while (STRUCTURAL_TYPES.has(o.type)) {
          let found = o.children.find((i) => i != null);
          if (!found) break;
          o = found;
        }
        if (SCOPED_STATEMENT_TYPES.has(o.type) && isSameLine(e, t, o))
          return {
            kind: "too-complex",
            reason:
              o.type === "subshell"
                ? "`(\u2026)` group directly follows a statement or word on the same line \u2014 bash rejects the line, but zsh reads the glued `(\u2026)` as a glob-group word and expands what follows it"
                : "statement directly follows another statement on the same line \u2014 bash reads the text as one command (`!` and shell keywords are plain words after an assignment), not two statements",
            differential: !0,
          };
      }
      t = r;
    } else t = null;
    let s = scanSameLineStatementSplits(r);
    if (s) return s;
  }
  return null;
}
/**
 * 递归收集简单命令（2.1.88 collectCommands 的大幅扩展版）：处理 command、redirected_statement、program/list/pipeline（|| 与 & 分支复制作用域，pipeline 末段外的赋值不外泄）、negated_command、declaration_command（declare/typeset/local/export/readonly 的大量 zsh/bash 分歧检查与变量跟踪）、variable_assignment（执行影响变量、整数属性变量拒绝）、for/while/if（作用域合并与循环变量限制）、subshell、test_command、unset_command；不认识的节点交给 tooComplex。返回 null 表示继续，返回结果对象表示终止。
 */
//@ chunk-r01896cg.js:25668-38155 fingerprint = collectCommands (0.636)
function collectCommands(node, commands, varScope, bareAssignmentNames, isProgramChild = !1) {
  if (node.type === "command") {
    let n = walkCommand(node, [], commands, varScope, bareAssignmentNames);
    if (n.kind !== "simple") return n;
    return (commands.push(...n.commands), null);
  }
  if (node.type === "redirected_statement")
    return walkRedirectedStatement(node, commands, varScope, bareAssignmentNames, isProgramChild);
  if (node.type === "comment") return null;
  if (STRUCTURAL_TYPES.has(node.type)) {
    let n = node.type === "pipeline",
      i = commands.length,
      c = !1;
    if (!n) {
      for (let x of node.children)
        if (x && (x.type === "||" || x.type === "&")) {
          c = !0;
          break;
        }
    }
    let l = c ? new Map(varScope) : null,
      f = n ? new Map(varScope) : varScope,
      y = null;
    for (let child of node.children) {
      if (!child) continue;
      if (SEPARATOR_TYPES.has(child.type)) {
        if (child.type === "||" || child.type === "|" || child.type === "|&" || child.type === "&")
          if (child.type === "||") {
            if (((y ??= new Set()), loopDepth === 0)) for (let d of varScope.keys()) y.add(d);
            let h = l ?? varScope;
            f = new Map(h);
            for (let [d, m] of varScope) if (h.get(d) !== m) markVarUnknown(f, d);
            for (let d of h.keys()) if (!varScope.has(d)) markVarUnknown(f, d);
          } else f = new Map(l ?? varScope);
        else if (y !== null) {
          for (let h of y) markVarUnknown(varScope, h);
          ((y = null), (f = varScope));
        }
        continue;
      }
      let u = collectCommands(child, commands, f, bareAssignmentNames, node.type === "program");
      if (u) return u;
      if (y !== null && loopDepth > 0) mergeScopeInto(varScope, f);
    }
    if (y !== null) for (let x of y) markVarUnknown(varScope, x);
    if (n) {
      if ((mergeScopeInto(varScope, f), commands.length === i)) pushTrueCommand(commands, node);
    }
    return null;
  }
  if (node.type === "negated_command") {
    let n = commands.length;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "!") continue;
      let c = collectCommands(child, commands, varScope, bareAssignmentNames);
      if (c) return c;
    }
    if (commands.length === n) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "declaration_command") {
    let n = commands.length,
      any = node.children.some((m) => m !== null && containsArithmeticExpansion(m)),
      c = (m, p) => {
        if (!any) return null;
        let g = varScope.get(m),
          _ = n === 0 && !containsAnyPlaceholder(p),
          b = g !== void 0 && !containsAnyPlaceholder(g);
        return _ || b
          ? divergentShapeResult(
              `'${m}' is assigned by a declaration carrying an expansion that can fail at runtime, which assigns nothing when it fails \u2014 its value cannot be statically verified`,
            )
          : null;
      },
      l = quoteScanCarveOutCount,
      f = new Map(varScope),
      y = !1,
      x = !1,
      u = [],
      h = -1;
    for (let child of node.children) {
      if (!child) continue;
      let p = child.startIndex === h;
      switch (((h = child.endIndex), child.type)) {
        case "export":
        case "local":
        case "readonly":
        case "declare":
        case "typeset":
          u.push(child.text);
          break;
        case "word":
        case "number":
        case "raw_string":
        case "string":
        case "concatenation": {
          if (p)
            return {
              kind: "too-complex",
              reason: `${u[0] ?? "declaration"} operand is split across adjacent quoted segments \u2014 the shell joins them into one word the analyzer cannot verify`,
              differential: !0,
            };
          let g = walkArgument(child, commands, f, bareAssignmentNames);
          if (typeof g !== "string") return g;
          if (/^[+-].*m/.test(g))
            return {
              kind: "too-complex",
              reason: `${u[0]} flag ${g} \u2014 zsh -m/+m pattern-assigns every matching variable; cannot statically model target set`,
              nodeType: "declaration_command",
            };
          if (u[0] === "declare" || u[0] === "typeset" || u[0] === "local" || u[0] === "readonly") {
            if (/^[+-].*f/.test(g)) y = !0;
            if (/^[+-].*[uU]/.test(g)) x = !0;
            if (y && x)
              return {
                kind: "too-complex",
                reason: `${u[0]} with both -f and -u/-U flags \u2014 zsh marks a function for autoload (synonym of 'autoload'), creating a function from file contents at call time`,
                nodeType: "declaration_command",
              };
          }
          if (
            (u[0] === "declare" || u[0] === "typeset" || u[0] === "local") &&
            DECLARE_SEMANTIC_FLAG_RE.test(g)
          )
            return {
              kind: "too-complex",
              reason: `declare flag ${g} changes assignment semantics (nameref/integer/float/array/width-truncation/case-conversion)`,
              ...(areDeclareArgsSimple(node) ? { nodeType: "declaration_command" } : { differential: !0 }),
            };
          if ((u[0] === "export" || u[0] === "readonly") && Te(g) && !areDeclareArgsSimple(node))
            return {
              kind: "too-complex",
              reason: `${u[0]} flag ${g} with an operand bash would evaluate as a compound array assignment`,
              differential: !0,
            };
          if ((u[0] === "export" || u[0] === "readonly") && /^[+-].*[iluEFLRZ]/.test(g))
            return {
              kind: "too-complex",
              reason: `${u[0]} flag ${g} \u2014 zsh bin_typeset mathevals (-i/-E/-F), width-truncates (-L/-R/-Z), or case-converts (-l/-u) the assigned value`,
              ...(areDeclareArgsSimple(node) ? { nodeType: "declaration_command" } : { differential: !0 }),
            };
          if (/^[+-].*T/.test(g))
            return {
              kind: "too-complex",
              reason: `${u[0]} -T creates a user-defined zsh tied pair \u2014 tracked literals for its operands are unreliable`,
              nodeType: "declaration_command",
            };
          if (
            (u[0] === "declare" || u[0] === "typeset" || u[0] === "local" || u[0] === "export") &&
            g[0] !== "-" &&
            /^[^=]*\[/.test(g)
          )
            return {
              kind: "too-complex",
              reason: `${u[0]} positional '${g}' contains array subscript \u2014 zsh/bash evaluate $(cmd) in subscripts`,
              differential: !0,
            };
          if (
            (u[0] === "declare" || u[0] === "typeset" || u[0] === "local") &&
            !/^[-+]/.test(g) &&
            !isSafeDeclarationArg(
              child,
              u.some((_) => /^[-+][A-Za-z]*[fF]/.test(_)),
            )
          )
            return {
              kind: "too-complex",
              reason: `${u[0]} operand '${child.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: !0,
            };
          if (g[0] !== "-") {
            let index = g.indexOf("=");
            if (index > 0) {
              let sliced = g.slice(0, index);
              if (/^[A-Za-z_][A-Za-z0-9_]*\+?$/.test(sliced)) {
                let endsWith = sliced.endsWith("+"),
                  A = endsWith ? sliced.slice(0, -1) : sliced,
                  R = c(A, g.slice(index + 1));
                if (R) return R;
                (applyVarToScope(varScope, { name: A, value: g.slice(index + 1), isAppend: endsWith }, n > 0),
                  bareAssignmentNames.push(A));
              }
            }
          }
          u.push(g);
          break;
        }
        case "variable_assignment": {
          if (
            (u[0] === "declare" || u[0] === "typeset" || u[0] === "local") &&
            !isSafeDeclarationArg(
              child,
              u.some((b) => /^[-+][A-Za-z]*[fF]/.test(b)),
            )
          )
            return {
              kind: "too-complex",
              reason: `${u[0]} operand '${child.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: !0,
            };
          let g = walkVariableAssignment(child, commands, f, bareAssignmentNames);
          if ("kind" in g) return g;
          let _ = c(g.name, g.value);
          if (_) return _;
          (applyVarToScope(varScope, g, n > 0),
            bareAssignmentNames.push(g.name),
            u.push(`${g.name}=${g.value}`));
          break;
        }
        case "variable_name": {
          let text = child.text;
          if (
            (u[0] === "declare" || u[0] === "typeset" || u[0] === "local" || u[0] === "export") &&
            text[0] !== "-" &&
            /^[^=]*\[/.test(text)
          )
            return {
              kind: "too-complex",
              reason: `${u[0]} positional '${text}' contains array subscript \u2014 backslash-escaped form de-escapes to [$(cmd)] at runtime`,
              differential: !0,
            };
          let any = u.some((b) => /^-[A-Za-z]*[fF]/.test(b));
          if (!PLAIN_VAR_NAME_RE.test(text) && !(any && FUNCTION_NAME_RE.test(text)))
            return {
              kind: "too-complex",
              reason: `${u[0]} operand '${text}' is not a plain variable name \u2014 the shell may turn it into an assignment the parser did not see`,
              differential: !0,
            };
          u.push(text);
          break;
        }
        case "ansi_c_string":
          return {
            kind: "too-complex",
            reason: `${u[0] ?? "declaration"} operand ${child.text} \u2014 a $'\u2026' word the shell decodes, which may carry a subscript the parser cannot read`,
            differential: !0,
          };
        default:
          return tooComplex(child);
      }
    }
    let d = checkDeclarationOptions(u[0] ?? "", u.slice(1));
    if (d !== null && !readingDivergentShapes)
      return {
        kind: "too-complex",
        reason: d,
        divergentShape: !0,
        ...(areDeclareArgsSimple(node) && { nodeType: "declaration_command" }),
      };
    return (
      commands.push({
        argv: u,
        envVars: [],
        redirects: [],
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
        carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== l,
      }),
      null
    );
  }
  if (node.type === "variable_assignment") {
    let n = commands.length,
      i = walkVariableAssignment(node, commands, varScope, bareAssignmentNames);
    if ("kind" in i) return i;
    if (isExecInfluencingVar(i.name))
      return {
        kind: "too-complex",
        reason: `${i.name} assignment alters command lookup/execution for subsequent commands`,
        nodeType: "variable_assignment",
      };
    if (isIntegerVarAssignUnsafe(i.name, i.value))
      return {
        kind: "too-complex",
        reason: `${i.name} has integer attribute \u2014 assignment arith-evals RHS, which can execute subscript command substitution or abort/diverge at runtime`,
        nodeType: "variable_assignment",
      };
    if (
      (applyVarToScope(varScope, i, n > 0),
      bareAssignmentNames.push(i.name),
      commands.length === n && (containsArithmeticExpansion(node) || BASH_READONLY_SPECIAL_VARS.has(i.name)))
    )
      pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "for_statement") {
    if (isLoopBlockedByEnvScrub(node)) return tooComplex(node);
    let n = collectLoopWrites(node, commands, varScope, bareAssignmentNames);
    if ("kind" in n) return n;
    let loopVar = null,
      doGroup = null,
      l = commands.length,
      f = !1;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "variable_name") loopVar = child.text;
      else if (child.type === "do_group") doGroup = child;
      else if (child.type === "select")
        return {
          kind: "too-complex",
          reason: "select statement reads stdin into $REPLY; cannot statically model",
          nodeType: "for_statement",
        };
      else if (child.type === "for" || child.type === "in" || child.type === ";") continue;
      else if (child.type === "command_substitution") {
        let h = walkCommandSubstitution(child, commands, varScope, bareAssignmentNames);
        if (h) return h;
      } else {
        let h = walkArgument(child, commands, varScope, bareAssignmentNames);
        if (typeof h !== "string") return h;
        if (containsArithmeticExpansion(child)) f = !0;
        else if ((hasUnquotedGlob(child.text) || nodeHasUnquotedGlob(child)) && SCi()) f = !0;
      }
    }
    if (loopVar === null || doGroup === null) return tooComplex(node);
    if (
      loopVar === "PS4" ||
      loopVar === "IFS" ||
      BASH_READONLY_SPECIAL_VARS.has(loopVar) ||
      loopVar === "BASH_ARGV0" ||
      isExecInfluencingVar(loopVar) ||
      INTEGER_ATTR_DEFAULT_VARS.has(loopVar) ||
      SAFE_ENV_VARS.has(loopVar) ||
      BASH_IMPLICITLY_REBOUND_VARS.has(loopVar)
    )
      return {
        kind: "too-complex",
        reason: `${loopVar} as loop variable bypasses assignment validation`,
        nodeType: "for_statement",
      };
    let y = varScope.get(loopVar);
    if (y !== void 0 && !containsAnyPlaceholder(y))
      return {
        kind: "too-complex",
        reason: `for-loop variable '${loopVar}' would overwrite tracked literal ${JSON.stringify(y.slice(0, 40))}; post-loop value cannot be statically determined`,
        nodeType: "for_statement",
      };
    (varScope.delete(loopVar), bareAssignmentNames.push(loopVar));
    let bodyScope = new Map(varScope);
    markLoopWritesUnknown(bodyScope, doGroup);
    for (let u of n) markVarUnknown(bodyScope, u);
    bodyScope.delete(loopVar);
    for (let u of doGroup.children) {
      if (!u) continue;
      if (u.type === "do" || u.type === "done" || u.type === ";") continue;
      let h = collectCommands(u, commands, bodyScope, bareAssignmentNames);
      if (h) return h;
    }
    if ((mergeScopeInto(varScope, bodyScope), f && commands.length === l)) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "if_statement" || node.type === "while_statement") {
    if (isLoopBlockedByEnvScrub(node)) return tooComplex(node);
    let n = null,
      i = null;
    if (node.type === "while_statement") {
      let l = collectLoopWrites(node, commands, varScope, bareAssignmentNames);
      if ("kind" in l) return l;
      ((n = new Set(varScope.keys())), (i = new Map(varScope)), markLoopWritesUnknown(varScope, node));
      for (let f of l) (markVarUnknown(varScope, f), markVarUnknown(i, f));
    }
    let c = !1;
    for (let child of node.children) {
      if (!child) continue;
      if (
        child.type === "if" ||
        child.type === "fi" ||
        child.type === "else" ||
        child.type === "elif" ||
        child.type === "while" ||
        child.type === "until" ||
        child.type === ";"
      )
        continue;
      if (child.type === "then") {
        c = !0;
        continue;
      }
      if (child.type === "do_group") {
        let bodyScope = new Map(varScope);
        markLoopWritesUnknown(bodyScope, child);
        for (let h of child.children) {
          if (!h) continue;
          if (h.type === "do" || h.type === "done" || h.type === ";") continue;
          let d = collectCommands(h, commands, bodyScope, bareAssignmentNames);
          if (d) return d;
        }
        mergeScopeInto(varScope, bodyScope);
        continue;
      }
      if (child.type === "elif_clause" || child.type === "else_clause") {
        let branchScope = new Map(varScope);
        for (let h of child.children) {
          if (!h) continue;
          if (h.type === "elif" || h.type === "else" || h.type === "then" || h.type === ";") continue;
          let d = collectCommands(h, commands, branchScope, bareAssignmentNames);
          if (d) return d;
        }
        mergeScopeInto(varScope, branchScope);
        continue;
      }
      let f = new Map(varScope),
        before = commands.length,
        x = collectCommands(child, commands, f, bareAssignmentNames);
      if (x) return x;
      if (!c) {
        for (let [u, h] of f) {
          let d = (i ?? varScope).get(u);
          if (d !== void 0 && !containsAnyPlaceholder(d) && h !== d)
            return {
              kind: "too-complex",
              reason: `'${u}' was tracked as literal '${d}' but condition may modify it (||/pipeline/unset/&&-short-circuit) \u2014 cannot prove downstream value`,
              nodeType: node.type,
            };
          if (d?.includes(UNCERTAIN_VAR_PLACEHOLDER) === !0 && h !== d) {
            varScope.set(u, d);
            continue;
          }
          varScope.set(u, h);
        }
        for (let u of varScope.keys())
          if (!f.has(u)) {
            let h = (i ?? varScope).get(u);
            if (h !== void 0 && !containsAnyPlaceholder(h))
              return {
                kind: "too-complex",
                reason: `'${u}' was tracked as literal '${h}' but condition may unset it (&&-short-circuit) \u2014 cannot prove downstream value`,
                nodeType: node.type,
              };
            markVarUnknown(varScope, u);
          }
        for (let u = before; u < commands.length; u++) {
          let h = commands[u];
          if (h?.argv[0] === "read" && !gso()) {
            for (let m of h.argv.slice(1))
              if (!m.startsWith("-") && /^[A-Za-z_][A-Za-z0-9_]*$/.test(m)) {
                let existing = varScope.get(m);
                if (existing !== void 0 && !containsAnyPlaceholder(existing))
                  return {
                    kind: "too-complex",
                    reason: `'read ${m}' in condition may not execute (||/pipeline/subshell); cannot prove it overwrites tracked literal '${existing}'`,
                    nodeType: node.type,
                  };
                markVarUnknown(varScope, m);
              }
            let d = varScope.get("REPLY");
            if (d !== void 0 && !containsAnyPlaceholder(d))
              return {
                kind: "too-complex",
                reason: `'read' in condition may write stdin to REPLY; cannot prove it overwrites tracked literal '${d}'`,
                nodeType: node.type,
              };
            markVarUnknown(varScope, "REPLY");
          }
        }
      } else mergeScopeInto(varScope, f);
    }
    if (n !== null) {
      for (let l of [...varScope.keys()]) if (!n.has(l)) varScope.delete(l);
    }
    return null;
  }
  if (node.type === "subshell") {
    let innerScope = new Map(varScope),
      i = commands.length,
      c = !1;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "(" || child.type === ")") continue;
      if (child.type !== "comment") c = !0;
      let f = collectCommands(child, commands, innerScope, bareAssignmentNames);
      if (f) return f;
    }
    if (c && commands.length === i) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "test_command") {
    let any = node.children.some((f) => f?.type === "[["),
      i = findTestCommandGap(node, any);
    if (i) return i;
    let argv = ["[["],
      l = quoteScanCarveOutCount;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "[[" || child.type === "]]" || child.type === "[" || child.type === "]") continue;
      let y = walkTestExpr(child, argv, commands, varScope, bareAssignmentNames, any);
      if (y) return y;
    }
    return (
      commands.push({
        argv: argv,
        envVars: [],
        redirects: [],
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
        carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== l,
      }),
      null
    );
  }
  if (node.type === "unset_command") {
    let n = [],
      i = quoteScanCarveOutCount,
      c = commands.length > 0,
      l = !1,
      f = !1,
      y = !1;
    for (let child of node.children) {
      if (!child) continue;
      switch (child.type) {
        case "unset":
          (n.push(child.text), (y = child.text === "unsetenv"));
          break;
        case "variable_name":
          if (!PLAIN_VAR_NAME_RE.test(child.text) && !(l && FUNCTION_NAME_RE.test(child.text)))
            return {
              kind: "too-complex",
              reason: `${n[0] ?? "unset"} operand '${child.text}' is not a plain variable name \u2014 the shell may expand or evaluate it`,
              differential: !0,
            };
          if ((n.push(child.text), (f = !0), l || y)) {
            let u = uncertainValueResult(
              varScope.get(child.text),
              `'${child.text}' no longer has a statically known value at this unset \u2014 cannot verify what the command leaves behind`,
              "unset_command",
            );
            if (u !== null) return u;
            break;
          }
          if (isAssignmentNameUnsafeForSandbox(child.text))
            return {
              kind: "too-complex",
              reason: `'unset' targets shell variable ${child.text} (exec-influencing / integer-attr / IFS / PS4)`,
              nodeType: "unset_command",
            };
          recordUnset(varScope, child.text, c);
          break;
        case "word": {
          let u = walkArgument(child, commands, varScope, bareAssignmentNames);
          if (typeof u !== "string") return u;
          if (u.startsWith("-")) {
            if (f) return tooComplex(child);
            if (u !== "-f" && u !== "-v") return tooComplex(child);
            if (u === "-f") l = !0;
            n.push(u);
            break;
          }
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(u)) return tooComplex(child);
          if ((n.push(u), (f = !0), l || y)) {
            let h = uncertainValueResult(
              varScope.get(u),
              `'${u}' no longer has a statically known value at this unset \u2014 cannot verify what the command leaves behind`,
              "unset_command",
            );
            if (h !== null) return h;
            break;
          }
          if (isAssignmentNameUnsafeForSandbox(u))
            return {
              kind: "too-complex",
              reason: `'unset' targets shell variable ${u} (exec-influencing / integer-attr / IFS / PS4)`,
              nodeType: "unset_command",
            };
          recordUnset(varScope, u, c);
          break;
        }
        case "ansi_c_string":
        case "raw_string":
        case "string":
        case "concatenation":
          if (/\[/.test(child.text) || child.type === "ansi_c_string")
            return {
              kind: "too-complex",
              reason: `${n[0] ?? "unset"} operand ${child.text} carries a subscript \u2014 bash and zsh evaluate $(cmd) inside it`,
              differential: !0,
            };
          return tooComplex(child);
        default:
          return tooComplex(child);
      }
    }
    return (
      commands.push({
        argv: n,
        envVars: [],
        redirects: [],
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
        carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== i,
      }),
      null
    );
  }
  return tooComplex(node);
}
//@ chunk-r01896cg.js:38155-38260 fingerprint = walkTestExpr (0.752)
var TEST_EXPRESSION_TYPES = new Set([
  "unary_expression",
  "binary_expression",
  "negated_expression",
  "parenthesized_expression",
]);
//@ chunk-r01896cg.js:38260-38497 layout
function isBlankTestGap(e, t) {
  let r = 0;
  while (r < e.length) {
    let s = e[r];
    if (s === " " || s === "\t") {
      r++;
      continue;
    }
    if (
      s === "\\" &&
      e[r + 1] ===
        `
`
    ) {
      r += 2;
      continue;
    }
    if (
      t &&
      s ===
        `
`
    ) {
      r++;
      continue;
    }
    if (t && s === "#") {
      r++;
      while (
        r < e.length &&
        e[r] !==
          `
`
      )
        r++;
      continue;
    }
    return !1;
  }
  return !0;
}
//@ chunk-r01896cg.js:38497-39147 layout
function findTestCommandGap(e, t) {
  let buffer = Buffer.from(e.text, "utf8"),
    startIndex = e.startIndex;
  for (let o of e.children) {
    if (!o) continue;
    if (o.startIndex > startIndex) {
      let str = buffer.subarray(startIndex - e.startIndex, o.startIndex - e.startIndex).toString("utf8");
      if (!isBlankTestGap(str, t))
        return {
          kind: "too-complex",
          reason:
            "Test command has unparsed bytes between children \u2014 parser dropped content that shell will see",
        };
    }
    if (((startIndex = Math.max(startIndex, o.endIndex)), TEST_EXPRESSION_TYPES.has(o.type))) {
      let n = findTestCommandGap(o, t);
      if (n) return n;
    }
  }
  if (startIndex < e.endIndex) {
    let str = buffer.subarray(startIndex - e.startIndex).toString("utf8");
    if (!isBlankTestGap(str, t))
      return {
        kind: "too-complex",
        reason:
          "Test command has unparsed bytes after its last child \u2014 parser dropped content that shell will see",
      };
  }
  return null;
}
//@ chunk-r01896cg.js:39147-39491 layout
function hasZshEqualsProcSubst(e) {
  let t = !1,
    r = !1,
    s = !1,
    o = 0,
    n;
  for (let i = 0; i < e.length; i++) {
    let c = e[i];
    if (!t && c === "\\") {
      i++;
      continue;
    }
    if (!r && c === "'") {
      t = !t;
      continue;
    }
    if (!t && c === '"') {
      r = !r;
      continue;
    }
    if (!t && !r) {
      if (c === "=" && e[i + 1] === "(" && (s || i === 0 || n === "|")) return !0;
      if (c === "(") o++;
      else if (c === ")") o = Math.max(0, o - 1);
      else if (o === 0 && (c === "|" || c === "&") && n === c) s = !0;
      n = c;
    }
  }
  return !1;
}
/**
 * 文本中是否有独立的 ]]（排除 [[:class:]] 等字符类写法，以及两侧都是单词字符的情况），用于发现 [[ ]] 条件的提前闭合。
 */
//@ chunk-r01896cg.js:39491-39763 facade-majority
function containsStandaloneCondCloser(e) {
  let replaced = e.replace(/\[(?::[a-zA-Z]+:|=[A-Za-z0-9-]*=|\.[A-Za-z0-9-]*\.|[!^]?)\]\](?!\])/g, "\x00"),
    r = /[A-Za-z0-9_]/,
    index = replaced.indexOf("]]");
  while (index !== -1) {
    let o = index > 0 ? replaced[index - 1] : "",
      n = index + 2 < replaced.length ? replaced[index + 2] : "";
    if (!(r.test(o) && r.test(n))) return !0;
    index = replaced.indexOf("]]", index + 1);
  }
  return !1;
}
//@ chunk-r01896cg.js:39763-39871 facade-majority
var ZSH_SUBSCRIPT_OR_MODIFIER_RE = /^([\w\u0080-\uffff]*|[-?*@!#])(\[|:[a-zA-Z&])/,
  ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE = /^([\w\u0080-\uffff]*|[-?*@!#$])(\[|:[a-zA-Z&])/;
/**
 * 遍历 [[ ]]/[ ] 内表达式，把运算符和操作数压入 argv：拒绝 zsh $name[expr]、!( 粘连、regex/extglob 中的展开/进程替换/=(CMD)/未加引号 &/粘连 ||/括号不平衡、独立 ]] 闭合符等 shell 词法分歧。
 */
//@ chunk-r01896cg.js:39871-43362 layout
function walkTestExpr(node, argv, innerCommands, varScope, bareAssignmentNames, isDoubleBracket) {
  if (TEST_EXPRESSION_TYPES.has(node.type)) {
    for (let i = 0; i < node.children.length; i++) {
      let c = node.children[i];
      if (!c) continue;
      if (
        (c.type === "simple_expansion" || c.type === "expansion") &&
        (node.children[i + 1]?.text.startsWith("[") ||
          /^:[a-zA-Z&]/.test(node.children[i + 1]?.text ?? "") ||
          (c.children.some((f) => f?.type === "special_variable_name") &&
            ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE.test(node.children[i + 1]?.text ?? "")))
      )
        return {
          kind: "too-complex",
          reason: "zsh $name[expr] / $name:mod in [[ ]] operand \u2014 recursive eval",
          differential: !0,
        };
      if (isDoubleBracket && c.type === "!" && node.children[i + 1]?.startIndex === c.endIndex)
        return { kind: "too-complex", reason: "zsh reads !( in [[ ]] as part of a word", differential: !0 };
      let l = walkTestExpr(c, argv, innerCommands, varScope, bareAssignmentNames, isDoubleBracket);
      if (l) return l;
    }
    return null;
  }
  switch (node.type) {
    case "test_operator":
    case "!":
    case "(":
    case ")":
    case "&&":
    case "||":
    case "==":
    case "=":
    case "!=":
    case "<":
    case ">":
    case "=~":
      return (argv.push(node.text), null);
    case "regex":
    case "extglob_pattern":
      if (/\$([({[\w#?!*@$'"+~^=-]|[\u0080-\uffff])|`|[<>]\(/.test(node.text))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type === "extglob_pattern" ? "pattern" : node.type} contains expansion / command / process substitution`,
          differential: !0,
        };
      if (node.text.startsWith("=("))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type === "extglob_pattern" ? "pattern" : node.type} contains zsh =(CMD) process substitution`,
          differential: !0,
        };
      if (node.type === "regex" && hasZshEqualsProcSubst(node.text))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type} contains zsh =(CMD) process substitution`,
          differential: !0,
        };
      if (node.type === "extglob_pattern") {
        let text = node.text,
          c = 0;
        while (c < text.length) {
          if (text[c] === "\\" && c + 1 < text.length) {
            c += 2;
            continue;
          }
          if (text[c] === "&")
            return {
              kind: "too-complex",
              reason: "[[ ]] pattern contains unquoted & (zsh splits the word at & at any depth)",
              differential: !0,
            };
          c++;
        }
      }
      if (node.type === "regex") {
        let text = node.text,
          c = 0,
          l = 0;
        while (l < text.length) {
          let f = text[l];
          if (f === "\\" && l + 1 < text.length) {
            l += 2;
            continue;
          }
          if (c === 0 && f === "|" && text[l + 1] === f)
            return {
              kind: "too-complex",
              reason: "[[ ]] regex contains glued || (zsh splits it as a cond operator)",
              differential: !0,
            };
          if (f === "&")
            return {
              kind: "too-complex",
              reason: "[[ ]] regex contains unquoted & (zsh splits the word at & at any depth)",
              differential: !0,
            };
          if (f === '"' || f === "'") {
            let y = f;
            l++;
            while (l < text.length && text[l] !== y) {
              if (y === '"' && text[l] === "\\" && l + 1 < text.length) l++;
              l++;
            }
            if (l < text.length) l++;
            continue;
          }
          if (f === "(") c++;
          else if (f === ")") {
            if ((c--, c < 0))
              return {
                kind: "too-complex",
                reason: "[[ ]] regex has unbalanced parentheses (parser desync)",
                differential: !0,
              };
          }
          l++;
        }
        if (c !== 0)
          return {
            kind: "too-complex",
            reason: "[[ ]] regex has unbalanced parentheses (parser desync)",
            differential: !0,
          };
      }
      if (node.text.includes("&&"))
        return {
          kind: "too-complex",
          reason:
            "[[ ]] pattern leaf contains `&&` \u2014 shell cond-lexer divergence (zsh splits the word there)",
          differential: !0,
        };
      if (containsStandaloneCondCloser(node.text))
        return {
          kind: "too-complex",
          reason:
            "[[ ]] pattern leaf contains a potential standalone `]]` closer \u2014 shell cond-lexer divergence (zsh may close the conditional early)",
          differential: !0,
        };
      return (argv.push(node.text), null);
    case "test_rhs_missing":
      return {
        kind: "too-complex",
        reason: "Test command comparison is missing its right-hand side \u2014 parser dropped consumed bytes",
      };
    default: {
      let i = walkArgument(node, innerCommands, varScope, bareAssignmentNames);
      if (typeof i !== "string") {
        if (isDoubleBracket && i.kind === "too-complex") {
          let { nodeType: nodeType, ...l } = i;
          return { ...l, differential: !0 };
        }
        return i;
      }
      if (
        (isDoubleBracket && (containsStandaloneCondCloser(i) || containsStandaloneCondCloser(node.text))) ||
        /]].*[;\n&|<>]/s.test(i)
      )
        return {
          kind: "too-complex",
          reason: isDoubleBracket
            ? "[[ ]] quoted operand contains `]]` closer or `]]`+separator bytes \u2014 possible parser quote-state desync"
            : "test command quoted operand contains `]]`+separator bytes \u2014 possible parser quote-state desync",
          differential: !0,
        };
      return (argv.push(i), null);
    }
  }
}
//@ chunk-r01896cg.js:43362-43617 layout
function findUnsupportedListTail(e) {
  let t = null;
  for (let r of e.children) {
    if (!r || r.type === "!" || r.type === "comment" || SEPARATOR_TYPES.has(r.type)) continue;
    t = r;
  }
  if (!t) return null;
  if (t.type === "list" || t.type === "negated_command") return findUnsupportedListTail(t);
  if (!REDIRECTABLE_COMMAND_TYPES.has(t.type) && !TRAILING_OK_TYPES.has(t.type)) return t;
  return null;
}
/**
 * 把变量在作用域中标为未知值 VAR_PLACEHOLDER（已是不确定值时保持）。
 */
//@ chunk-r01896cg.js:43617-43676 layout
function markVarUnknown(varScope, name) {
  if (varScope.get(name)?.includes(UNCERTAIN_VAR_PLACEHOLDER)) return;
  varScope.set(name, VAR_PLACEHOLDER);
}
//@ chunk-r01896cg.js:43676-43694 layout
var UNCERTAIN_PREFIX = `${UNCERTAIN_VAR_PLACEHOLDER}\x00`;
//@ chunk-r01896cg.js:43694-43757 layout
function stripUncertainPrefix(e) {
  return readingDivergentShapes && e.startsWith(UNCERTAIN_PREFIX) ? e.slice(UNCERTAIN_PREFIX.length) : e;
}
//@ chunk-r01896cg.js:43757-43952 layout
function uncertainValueResult(e, t, r) {
  if (e === void 0) return null;
  if (!containsAnyPlaceholder(stripUncertainPrefix(e))) return null;
  return !readingDivergentShapes && e.includes(UNCERTAIN_VAR_PLACEHOLDER)
    ? { kind: "too-complex", reason: t, nodeType: r, divergentShape: !0 }
    : { kind: "too-complex", reason: t, nodeType: r };
}
//@ chunk-r01896cg.js:43952-44016 layout
function recordUnset(varScope, name, hasPriorCommands) {
  if ((unsetNames.add(name), hasPriorCommands && readingDivergentShapes)) sawUncertainWrite = !0;
  varScope.set(
    name,
    !hasPriorCommands ? "" : readingDivergentShapes ? UNCERTAIN_PREFIX : UNCERTAIN_VAR_PLACEHOLDER,
  );
}
//@ chunk-r01896cg.js:44016-44179 layout
function mergeScopeAfterConditional(varScope, snapshot) {
  for (let [r, s] of varScope)
    if (snapshot.get(r) !== s) {
      if (!readingDivergentShapes && declarationPrefixValues.get(r) === s) prefixAssignInBranch = !0;
      ((sawUncertainWrite ||= readingDivergentShapes),
        varScope.set(
          r,
          !readingDivergentShapes
            ? UNCERTAIN_VAR_PLACEHOLDER
            : s.includes(UNCERTAIN_VAR_PLACEHOLDER)
              ? s
              : UNCERTAIN_PREFIX + s,
        ));
    }
  for (let r of snapshot.keys()) if (!varScope.has(r)) varScope.set(r, UNCERTAIN_VAR_PLACEHOLDER);
}
/**
 * 处理 redirected_statement：分离 file/heredoc 重定向与内层命令；内层是 a && b 的 list 时分两段收集；随后解析每个文件重定向、检查重定向读前缀变量、校验 heredoc，并把重定向挂到最后一条命令上（无命令时推入空 argv 命令）。
 */
//@ chunk-r01896cg.js:44179-45723 fingerprint = walkRedirectedStatement (0.821)
function walkRedirectedStatement(node, commands, varScope, bareAssignmentNames, isProgramChild) {
  let redirects = [],
    innerCommand = null,
    fileRedirects = [],
    heredocRedirects = [];
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "file_redirect") fileRedirects.push(child);
    else if (child.type === "heredoc_redirect") heredocRedirects.push(child);
    else if (REDIRECTABLE_COMMAND_TYPES.has(child.type)) {
      if (child.type === "list" || child.type === "negated_command") {
        let p = findUnsupportedListTail(child);
        if (p) return tooComplex(p);
      }
      innerCommand = child;
    } else return tooComplex(child);
  }
  if (!innerCommand) {
    for (let m of fileRedirects) {
      let p = walkFileRedirect(m, commands, varScope, bareAssignmentNames);
      if ("kind" in p) return p;
      redirects.push(p);
    }
    for (let m of heredocRedirects) {
      let p = walkHeredocRedirect(m, varScope);
      if (p) return p;
    }
    return (
      commands.push({
        argv: [],
        envVars: [],
        redirects: redirects,
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
      }),
      null
    );
  }
  let before = commands.length,
    y =
      allowPlainUnquotedHeredocs &&
      isProgramChild &&
      innerCommand.type === "command" &&
      fileRedirects.length === 0 &&
      heredocRedirects.length === 1
        ? heredocRedirects[0]?.children.find((m) => m?.type === "pipeline")
        : void 0,
    x,
    u = !1;
  if (innerCommand.type === "list") {
    let children = innerCommand.children;
    if (children.length === 3 && children[0] && children[1]?.type === "&&" && children[2]) {
      let p = collectCommands(children[0], commands, varScope, bareAssignmentNames);
      if (p) return p;
      ((x = new Map(varScope)), (u = !0));
      let g = collectCommands(children[2], commands, varScope, bareAssignmentNames);
      if (g) return g;
    } else {
      let p = collectCommands(innerCommand, commands, varScope, bareAssignmentNames);
      if (p) return p;
      x = varScope;
    }
  } else if (STRUCTURAL_TYPES.has(innerCommand.type)) {
    let m = collectCommands(innerCommand, commands, varScope, bareAssignmentNames);
    if (m) return m;
    x = varScope;
  } else {
    ((x = new Map(varScope)), (u = !0));
    let m = collectCommands(innerCommand, commands, y ? new Map(varScope) : varScope, bareAssignmentNames);
    if (m) return m;
  }
  if (u) mergeScopeAfterConditional(varScope, x);
  let h = commands.length > before ? commands.at(-1) : void 0,
    d = h?.envVars[0]?.name;
  if (d !== void 0 && fileRedirects.some((m) => containsArithmeticExpansion(m))) {
    let m = prefixAssignmentMayFailResult(d);
    if (m) return m;
  }
  for (let m of fileRedirects) {
    let p = walkFileRedirect(m, commands, x, bareAssignmentNames);
    if ("kind" in p) return p;
    redirects.push(p);
  }
  if (h) {
    let m = checkRedirectReadsPrefixVar(fileRedirects, h, redirects, commands, x, bareAssignmentNames);
    if (m) return m;
  }
  for (let m of heredocRedirects) {
    let err = walkHeredocRedirect(m, x, y);
    if (err) return err;
  }
  if (y) {
    let m = collectCommands(y, commands, varScope, bareAssignmentNames);
    if (m) return m;
  }
  if (heredocRedirects.length > 0)
    for (let m = before; m < commands.length; m++) {
      let last = commands[m];
      if (last) last.argvSourceLiteral = !1;
    }
  if (redirects.length > 0)
    if (commands.length > before) {
      let at = commands.at(-1);
      if (at) at.redirects.push(...redirects);
    } else
      commands.push({
        argv: [],
        envVars: [],
        redirects: redirects,
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
      });
  return null;
}
/**
 * 检查 file_redirect：子节点之间不能有被解析器丢掉的字节，不能用 fd 变量，>&/<& 后不能以 - 开头，关闭 fd 后不能跟词，目标不能多于一个。
 */
//@ chunk-r01896cg.js:45723-47196 layout
function checkFileRedirectShape(node) {
  {
    let startIndex = node.startIndex;
    for (let o of node.children) {
      if (!o) continue;
      if (o.startIndex > startIndex) {
        let str = Buffer.from(node.text, "utf8")
          .subarray(startIndex - node.startIndex, o.startIndex - node.startIndex)
          .toString("utf8");
        if (!/^(?:[ \t]|\\\n)*$/.test(str))
          return {
            kind: "too-complex",
            reason:
              "Redirect has unparsed bytes between children \u2014 parser dropped content that shell will see",
          };
      }
      startIndex = o.endIndex;
    }
    if (startIndex < node.endIndex) {
      let str = Buffer.from(node.text, "utf8")
        .subarray(startIndex - node.startIndex)
        .toString("utf8");
      if (!/^(?:[ \t]|\\\n)*$/.test(str))
        return {
          kind: "too-complex",
          reason: "Redirect has unparsed trailing bytes \u2014 parser dropped content that shell will see",
        };
    }
  }
  let t = null,
    r = 0;
  for (let s of node.children) {
    if (!s) continue;
    if (s.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${s.text} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    if (s.type === "file_descriptor") continue;
    if (s.type === ">&-" || s.type === "<&-") {
      t = s.type;
      continue;
    }
    if (s.type in REDIRECT_OPS) {
      t = s.type;
      continue;
    }
    if ((t === ">&" || t === "<&") && s.text.startsWith("-"))
      return {
        kind: "too-complex",
        reason:
          "Redirect target after >& or <& starts with - \u2014 bash treats the dash as close-fd and passes the rest to the command as a hidden argument",
      };
    if (t === ">&-" || t === "<&-")
      return {
        kind: "too-complex",
        reason:
          "Close-fd redirect is followed by a word \u2014 bash passes it to the command as a hidden argument",
      };
    (r++, (t = null));
  }
  if (r > 1)
    return {
      kind: "too-complex",
      reason: "Redirect has multiple targets \u2014 post-redirect args swallowed",
    };
  return null;
}
//@ chunk-r01896cg.js:47196-47372 layout
var HEREDOC_PART_TYPES = new Set([
    "heredoc_start",
    "heredoc_body",
    "<<",
    "<<-",
    "heredoc_end",
    "file_descriptor",
  ]),
  HEREDOC_TRAILER_TYPES = new Set(["file_redirect", "pipeline"]),
  FD_VARIABLE_RE = /^\{(?:\w|[^\x00-\x7F])+(\[.*\])?\}$/su;
//@ chunk-r01896cg.js:47372-47557 layout
function describeFdVariable(e) {
  let t = /^\{((?:\w|[^\x00-\x7F])+)/u.exec(e)?.[1];
  if (t === void 0) return "{\u2026}";
  let r = /^\w{1,64}$/.test(t) ? t : "\u2026";
  return e[t.length + 1] === "[" ? `{${r}[\u2026]}` : `{${r}}`;
}
/**
 * 在子树中找 {name}> / {name}< 形式的 fd 变量重定向，返回其文本（会给 shell 变量赋值，属副作用）。
 */
//@ chunk-r01896cg.js:47557-47918 layout = mk (1)
function findFdVariableRedirect(e, t) {
  let r = t[e.startIndex] === 123 ? FD_VARIABLE_RE.exec(e.text) : null;
  if (r) {
    let endIndex = e.endIndex,
      o = !1;
    for (;;) {
      let l = t[endIndex];
      if (l === 32 || l === 9) ((o = !0), endIndex++);
      else if (l === 92 && t[endIndex + 1] === 10) endIndex += 2;
      else break;
    }
    let n = t[endIndex],
      i = t[endIndex + 1];
    if ((((n === 62 || n === 60) && i !== 40) || (n === 38 && i === 62)) && !(o && r[1] !== void 0))
      return e.text;
  }
  for (let s of e.children)
    if (s) {
      let o = findFdVariableRedirect(s, t);
      if (o !== null) return o;
    }
  return null;
}
/**
 * 递归检查所有重定向节点的形状：文件重定向交给 checkFileRedirectShape；here-string/heredoc 禁止 fd 变量，heredoc 起始行后只能跟文件重定向或管道。
 */
//@ chunk-r01896cg.js:47918-48514 layout
function findRedirectShapeError(node) {
  if (node.type === "file_redirect") {
    let t = checkFileRedirectShape(node);
    if (t) return t;
  }
  if (node.type === "herestring_redirect" || node.type === "heredoc_redirect") {
    for (let t of node.children)
      if (t?.type === "variable_name")
        return {
          kind: "too-complex",
          reason: `Redirect uses ${describeFdVariable(t.text)} fd-variable assignment \u2014 modifies shell variable as side effect`,
        };
    if (node.type === "heredoc_redirect") {
      for (let t of node.children)
        if (t && !HEREDOC_PART_TYPES.has(t.type) && !HEREDOC_TRAILER_TYPES.has(t.type))
          return {
            kind: "too-complex",
            reason: "Text after the heredoc start on the same line cannot be statically analyzed",
          };
    }
  }
  for (let t of node.children)
    if (t) {
      let r = findRedirectShapeError(t);
      if (r) return r;
    }
  return null;
}
/**
 * 解析单个 file_redirect 为 {op, target, fd, targetSourceLiteral}：拒绝 fd 变量、关闭 fd 后跟词、多目标、>& 后以 - 开头、含花括号/替换的目标、含命令替换输出/换行/以 ! 或 = 开头的目标，以及 >& 后非简单路径。
 */
//@ chunk-r01896cg.js:48514-51279 fingerprint = walkFileRedirect (0.464)
function walkFileRedirect(node, innerCommands, varScope, bareAssignmentNames) {
  let o = substitutionCount,
    n = catHeredocInlineCount,
    op = null,
    target = null,
    fd;
  {
    let f = checkFileRedirectShape(node);
    if (f) return f;
  }
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "file_descriptor") fd = Number(child.text);
    else if (child.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${child.text} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    else if (child.type in REDIRECT_OPS) op = REDIRECT_OPS[child.type] ?? null;
    else if (child.type === ">&-" || child.type === "<&-") {
      if (node.children.some((y) => y !== child && y?.type !== "file_descriptor"))
        return {
          kind: "too-complex",
          reason:
            "Close-fd redirect is followed by a word \u2014 bash passes it to the command as a hidden argument",
        };
      return tooComplex(child);
    } else if (target !== null)
      return {
        kind: "too-complex",
        reason: "Redirect has multiple targets \u2014 post-redirect args swallowed",
      };
    else if ((op === ">&" || op === "<&") && child.text.startsWith("-"))
      return {
        kind: "too-complex",
        reason:
          "Redirect target after >& or <& starts with - \u2014 bash treats the dash as close-fd and passes the rest to the command as a hidden argument",
      };
    else if (child.type === "word" || child.type === "number") {
      if (child.children.length > 0) return tooComplex(child);
      if (BRACE_EXPANSION_RE.test(child.text)) return tooComplex(child);
      if (BRACE_ESCAPED_CLOSE_RE.test(child.text)) return tooComplex(child);
      if (BRACE_ESCAPED_OPEN_RE.test(child.text)) return tooComplex(child);
      if (/(?:^|[^\\])(?:\\\\)*[`$]/.test(child.text)) return tooComplex(child);
      target = child.text.replace(/\\([\s\S])/g, (y, x) =>
        x ===
        `
`
          ? ""
          : x,
      );
    } else if (child.type === "raw_string") target = stripRawString(child.text);
    else if (child.type === "string") {
      let y = walkString(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof y !== "string") return y;
      target = y;
    } else if (child.type === "concatenation") {
      let y = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof y !== "string") return y;
      if (/(?:^|[^\\])(?:\\\\)*[`$]/.test(child.text))
        return {
          kind: "too-complex",
          reason: "Redirect target concatenation contains $/` \u2014 unanalyzable gap or substitution",
          nodeType: "concatenation",
        };
      target = y;
    } else return tooComplex(child);
  }
  if (!op || target === null) return { kind: "too-complex", reason: "Unrecognized redirect shape" };
  if (containsAnyPlaceholder(target))
    return {
      kind: "too-complex",
      reason: "Redirect target contains $(cmd) output \u2014 path is runtime-determined",
      nodeType: node.type,
    };
  if (
    target.includes(`
`)
  )
    return {
      kind: "too-complex",
      reason: "Redirect target contains newline \u2014 potential path traversal",
      nodeType: node.type,
    };
  if (target.startsWith("!"))
    return {
      kind: "too-complex",
      reason: "Redirect target starts with ! \u2014 zsh clobber or history expansion",
      nodeType: node.type,
    };
  if (target.startsWith("="))
    return {
      kind: "too-complex",
      reason: "Redirect target starts with = \u2014 zsh expands to PATH binary",
      nodeType: node.type,
    };
  if ((op === ">&" || op === "<&") && target.startsWith("-"))
    return {
      kind: "too-complex",
      reason:
        "Redirect target after >& or <& starts with - \u2014 bash treats the dash as close-fd and passes the rest to the command as a hidden argument",
    };
  if (op === ">&" && !/^[A-Za-z0-9./_-]+$/.test(target))
    return {
      kind: "too-complex",
      reason:
        "bash `>&` applies a second word-expansion pass to its target \u2014 path cannot be statically validated",
      nodeType: node.type,
    };
  return {
    op: op,
    target: target,
    fd: fd,
    targetSourceLiteral: substitutionCount === o && catHeredocInlineCount === n,
  };
}
//@ chunk-r01896cg.js:51279-51375 layout
var allowPlainUnquotedHeredocs = !1,
  readingDivergentShapes = !1,
  sawUncertainWrite = !1,
  reExpansionBudget = 0,
  argvWordNodes = new WeakMap(),
  currentDeclarationPrefix,
  declarationPrefixCount = 0,
  declarationPrefixBashKeeps,
  declarationPrefixValues = new Map(),
  prefixAssignInBranch = !1,
  usedAssignedValue = !1,
  isLaterLoopPass = !1,
  currentLoopNode = null,
  loopDepth = 0,
  unsetNames = new Set();
//@ chunk-r01896cg.js:51375-51452 layout
function divergentShapeResult(e) {
  return readingDivergentShapes ? null : { kind: "too-complex", reason: e, divergentShape: !0 };
}
//@ chunk-r01896cg.js:51452-51648 layout
function prefixAssignmentMayFailResult(e) {
  return divergentShapeResult(
    `'${e}' is set for one command that carries an expansion which can fail at runtime \u2014 whether the assignment stands for later commands cannot be statically verified`,
  );
}
//@ chunk-r01896cg.js:51648-51671 layout
function getDeclarationPrefixBashKeeps() {
  return declarationPrefixBashKeeps;
}
//@ chunk-r01896cg.js:51671-51694 layout
function getDeclarationPrefixCount() {
  return declarationPrefixCount;
}
//@ chunk-r01896cg.js:51694-51836 layout
var HEREDOC_BODY_ESCAPE_RE = /`|\\[$`\\\n]/,
  VAR_NAME_SOURCE = PLAIN_VAR_NAME_RE.source.slice(1, -1),
  PLAIN_VAR_REF_RE = new RegExp(
    `\\$(?:${VAR_NAME_SOURCE}(?![A-Za-z0-9_\\u0080-\\uffff])|\\{${VAR_NAME_SOURCE}\\})(?!\\[|:[A-Za-z&])`,
    "g",
  );
/**
 * 校验 heredoc：必须有被扫描的正文；分界符未加引号时只在 plainUnquotedHeredocs 模式且正文只含可静态解析的 $name 时放行，否则 too-complex（differential）；引号分界符含反斜杠、<<- 配制表符分界符、正文行以分界符开头后跟 ) ` } 等也拒绝。可选允许分界行后紧跟一个简单管道。
 */
//@ chunk-r01896cg.js:51836-54371 layout
function walkHeredocRedirect(node, varScope, trailingPipeline) {
  let delimiter = null,
    endDelimiter = null,
    body = null,
    isDashHeredoc = !1;
  for (let l of node.children) {
    if (!l) continue;
    if (HEREDOC_PART_TYPES.has(l.type)) {
      if (l.type === "heredoc_start") delimiter = l.text;
      else if (l.type === "heredoc_body") body = l;
      else if (l.type === "<<-") isDashHeredoc = !0;
      else if (l.type === "heredoc_end") endDelimiter = l.text;
    } else if (
      l === trailingPipeline &&
      l.children.at(-1)?.type === "command" &&
      l.children.every(
        (f) =>
          f?.type === "|" ||
          (f?.type === "command" && !f.children.some((y) => y?.type.endsWith("_redirect"))),
      )
    );
    else if (HEREDOC_TRAILER_TYPES.has(l.type)) {
      let f = tooComplex(l);
      return f.kind === "too-complex" ? { ...f, afterHeredocDelimiter: !0 } : f;
    } else
      return {
        kind: "too-complex",
        reason: "Text after the heredoc start on the same line cannot be statically analyzed",
      };
  }
  if (body === null)
    return {
      kind: "too-complex",
      reason: "Heredoc body was not scanned by the parser",
      nodeType: "heredoc_redirect",
    };
  if (trailingPipeline) {
    let str = Buffer.from(node.text, "utf8")
        .subarray(0, body.startIndex - node.startIndex)
        .toString("utf8"),
      joined = node.children
        .slice(0, node.children.indexOf(body))
        .map((y) => (y === trailingPipeline ? "|" : "") + (y?.text ?? ""))
        .join("");
    if (
      str.indexOf(`
`) !==
        str.length - 1 ||
      str.includes("\\") ||
      str.replace(/[ \t\n]/g, "") !== joined.replace(/[ \t]/g, "")
    )
      return {
        kind: "too-complex",
        reason: "More than a pipeline follows the heredoc delimiter on its line",
      };
  }
  let isQuotedDelimiter =
    delimiter !== null &&
    ((delimiter.startsWith("'") && delimiter.endsWith("'")) ||
      (delimiter.startsWith('"') && delimiter.endsWith('"')) ||
      delimiter.startsWith("\\"));
  if (!isQuotedDelimiter) {
    let filtered = body.children.filter((y) => y?.type !== "heredoc_content");
    if (!(
      allowPlainUnquotedHeredocs &&
      varScope !== void 0 &&
      delimiter !== null &&
      PLAIN_VAR_NAME_RE.test(delimiter) &&
      endDelimiter === delimiter &&
      !HEREDOC_BODY_ESCAPE_RE.test(body.text) &&
      (body.text.match(/\$/g)?.length ?? 0) === filtered.length &&
      (body.text.match(PLAIN_VAR_REF_RE)?.length ?? 0) === filtered.length &&
      filtered.every(
        (y) => (
          substitutionCount++,
          (y?.type === "simple_expansion" || y?.type === "expansion") &&
            typeof resolveSimpleExpansion(y, varScope, !0) === "string"
        ),
      )
    ))
      return {
        kind: "too-complex",
        reason: "Heredoc with unquoted delimiter undergoes shell expansion",
        nodeType: "heredoc_redirect",
        differential: !0,
      };
  }
  if (
    delimiter !== null &&
    (delimiter.startsWith("'") || delimiter.startsWith('"')) &&
    delimiter.slice(1, -1).includes("\\")
  )
    return {
      kind: "too-complex",
      reason: "Quoted heredoc delimiter contains backslash",
      nodeType: "heredoc_redirect",
    };
  if (isQuotedDelimiter)
    for (let l of body.children) {
      if (!l) continue;
      if (l.type !== "heredoc_content") return tooComplex(l);
    }
  if (delimiter !== null && body !== null) {
    let l = !isQuotedDelimiter
      ? delimiter
      : delimiter.startsWith("\\")
        ? delimiter.slice(1)
        : delimiter.slice(1, -1);
    if (l.length > 0) {
      if (isDashHeredoc && l.startsWith("\t"))
        return {
          kind: "too-complex",
          reason: "Heredoc uses <<- with a tab-prefixed delimiter",
          nodeType: "heredoc_redirect",
        };
      for (let f of body.text.split(`
`)) {
        let y = isDashHeredoc ? f.replace(/^\t+/, "") : f;
        if (!y.startsWith(l)) continue;
        let sliced = y.slice(l.length);
        if (/[)`}]/.test(sliced))
          return {
            kind: "too-complex",
            reason:
              "Heredoc body line starts with the delimiter and contains a shell metacharacter bash may treat as a terminator",
            nodeType: "heredoc_redirect",
          };
      }
    }
  }
  return null;
}
/**
 * 校验 here-string（<<<）：参数需可静态解析，禁止 fd 变量与换行后注释。
 */
//@ chunk-r01896cg.js:54371-54707 layout
function walkHerestringRedirect(node, innerCommands, varScope, bareAssignmentNames) {
  for (let o of node.children) {
    if (!o) continue;
    if (o.type === "<<<") continue;
    if (o.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${describeFdVariable(o.text)} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    let n = walkArgument(o, innerCommands, varScope, bareAssignmentNames);
    if (typeof n !== "string") return n;
    if (NEWLINE_HASH_RE.test(n)) return tooComplex(o);
  }
  return null;
}
//@ chunk-r01896cg.js:54707-55086 facade-majority
var COMMAND_WRAPPER_BUILTINS = new Set(["command", "builtin", "noglob", "nocorrect", "time"]),
  SAFE_PREFIX_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?=[A-Za-z0-9_.,:/@%+=-]*$/,
  ASSIGNING_WRAPPERS = new Set(["builtin", "command", "noglob"]),
  DECLARATION_BUILTINS = new Set(["declare", "typeset", "local", "export", "readonly"]),
  DECLARATION_BUILTINS_ZSH = new Set([...DECLARATION_BUILTINS, "integer", "float", "private"]),
  POSIX_SPECIAL_BUILTINS_NONEVAL = new Set([
    ":",
    "break",
    "continue",
    "return",
    "exit",
    "shift",
    "times",
    "set",
    "export",
    "readonly",
    "unset",
  ]);
//@ chunk-r01896cg.js:55086-55887 layout
function checkZshReadDivergence(e, t, r, s, o) {
  if (e === void 0) return null;
  let [, n = "", i = ""] = /^([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(e) ?? [];
  if (n === "" || (r ? i === "" : i !== "" && !/^[[?]/.test(i))) return null;
  let c = s.get(n);
  if (
    !o.includes(n) &&
    !unsetNames.has(n) &&
    !declarationPrefixValues.has(n) &&
    (c === void 0 || containsAnyPlaceholder(c))
  )
    return null;
  if (!isNestedRippleEnabled() || ACi()) return null;
  let l = i,
    f = n;
  if (l.startsWith("[")) {
    let u = 0,
      h = l.length;
    for (let d = 0; d < l.length; d++)
      if (l[d] === "[") u++;
      else if (l[d] === "]" && --u === 0) {
        h = d + 1;
        break;
      }
    ((f += "[\u2026]"), (l = l.slice(h)));
  }
  if (l !== "") f += l.startsWith("?") ? "?\u2026" : "\u2026";
  let x = `In zsh, 'read ${redactPlaceholdersForDisplay(t === null ? f : `${t} ${f}`)}' can set ${n} differently from bash or leave it unchanged, and this command set or unset ${n} earlier, so ${n}'s value after the read can't be checked before the command runs`;
  if (!isLaterLoopPass) recordReadingRefusal(x);
  return { kind: "too-complex", reason: x, differential: !0 };
}
/**
 * 按命令语义更新变量作用域：识别 builtin/command/noglob 包装（zsh/bash 行为不同时拒绝）、前缀赋值、declare 类、read（含 zsh read 分歧检查）、printf -v、unset、print、set -A、mapfile、cd/pushd/popd（标 PWD/OLDPWD 未知），以及声明前缀（declarationPrefix）模式下的赋值核对；写入受保护变量即 too-complex。
 */
//@ chunk-r01896cg.js:55887-62370 layout
function applyCommandVariableWrites(
  argv,
  envVars,
  varScope,
  bareAssignmentNames,
  hasPriorCommands,
  hasArithmetic,
) {
  let writtenNames = [],
    assignedNames = [],
    l = (p, g = !0) => {
      let match = p.match(/^[A-Za-z_][A-Za-z0-9_]*/);
      if (match) {
        if ((writtenNames.push(match[0]), g)) assignedNames.push(match[0]);
      }
    },
    restArgv = argv,
    y = !1,
    x,
    u = [];
  for (;;) {
    let p = restArgv[0];
    if (p === void 0) break;
    if (COMMAND_WRAPPER_BUILTINS.has(p)) {
      if ((x === "builtin" || x === "command") && p !== "builtin" && p !== "command") {
        if (p === "noglob" && !y)
          return {
            kind: "too-complex",
            reason: `'${x} noglob' runs the wrapped command on zsh (for 'command', under POSIX_BUILTINS) but not bash \u2014 cannot statically model whether it executes`,
            nodeType: "command",
          };
        y = !0;
      }
      let g = 1;
      while (g < restArgv.length && /^-[-pvV]*$/.test(restArgv[g])) {
        if (
          /[vV]/.test(restArgv[g]) ||
          (p === "builtin" && /p/.test(restArgv[g]) && isStagedPumpkinEnabled())
        )
          y = !0;
        g++;
      }
      ((restArgv = restArgv.slice(g)), (x = p));
    } else if (p === "!") {
      if (x === "builtin" || x === "command") y = !0;
      ((restArgv = restArgv.slice(1)), (x = void 0));
    } else if (/^[A-Za-z_]\w*(\[[^\]]*\])?\+?=/.test(p)) {
      if (x !== void 0 && ASSIGNING_WRAPPERS.has(x) && isStagedPumpkinEnabled()) {
        if (!(SAFE_PREFIX_ASSIGN_RE.test(p) && !containsAnyPlaceholder(p)) && !y) {
          let b = wrappedGlobResult(x, p);
          if (b) return b;
        }
        y = !0;
      }
      let g = writtenNames.length;
      (l(p),
        u.push({ word: p, target: writtenNames.length > g ? g : void 0 }),
        (restArgv = restArgv.slice(1)),
        (x = void 0));
    } else {
      if (
        x !== void 0 &&
        ASSIGNING_WRAPPERS.has(x) &&
        !y &&
        p !== "[" &&
        /[*?[]/.test(p) &&
        isStagedPumpkinEnabled()
      ) {
        let g = wrappedGlobResult(x, p);
        if (g) return g;
      }
      break;
    }
  }
  let commandName = restArgv[0];
  if (commandName === void 0) for (let p of envVars) l(p.name);
  else if (DECLARATION_BUILTINS.has(commandName)) {
    let p = !1;
    for (let g = 1; g < restArgv.length; g++) {
      let _ = restArgv[g];
      if (!p && _ === "--") {
        p = !0;
        continue;
      }
      if (!p && /^[+-].*m/.test(_))
        return {
          kind: "too-complex",
          reason: `'${commandName} ${_}' (wrapped form) \u2014 zsh -m/+m pattern-assigns every matching variable; cannot statically model target set`,
          nodeType: "command",
        };
      if (!p && _.startsWith("-")) continue;
      if (_.includes("=")) l(_);
    }
  } else if (commandName === "read" && gso());
  else if (commandName === "read") {
    let p = 1,
      g = !1,
      _ = !1;
    while (p < restArgv.length) {
      let b = restArgv[p];
      if (!g && b === "--") {
        ((g = !0), p++);
        continue;
      }
      if (!g && b.startsWith("-")) {
        if (READ_DATA_FLAGS.has(b)) {
          if (READ_FLAGS_WITH_CHECKED_OPERAND.has(b)) {
            let R = checkZshReadDivergence(restArgv[p + 1], b, !1, varScope, bareAssignmentNames);
            if (R) return R;
          }
          p += 2;
          continue;
        }
        let A = !1;
        for (let R = 1; R < b.length; R++) {
          let T = b[R];
          if (T === "a" || T === "A") {
            let v = R < b.length - 1 ? b.slice(R + 1) : restArgv[p + 1];
            if (v) {
              let de = checkZshReadDivergence(v, b.slice(0, R + 1), !0, varScope, bareAssignmentNames);
              if (de) return de;
              (l(v), (_ = !0));
            }
            A = R === b.length - 1;
            break;
          }
          if (READ_DATA_FLAGS.has("-" + T)) {
            if (((A = R === b.length - 1), A && READ_FLAGS_WITH_CHECKED_OPERAND.has("-" + T))) {
              let v = checkZshReadDivergence(restArgv[p + 1], b, !1, varScope, bareAssignmentNames);
              if (v) return v;
            }
            break;
          }
        }
        p += A ? 2 : 1;
        continue;
      }
      let k = checkZshReadDivergence(b, null, !0, varScope, bareAssignmentNames);
      if (k) return k;
      (l(b), (_ = !0), p++);
    }
    if (!_) writtenNames.push("REPLY");
  } else if (commandName === "printf")
    for (let p = 1; p < restArgv.length; p++) {
      let g = restArgv[p];
      if (g === "--" || !g.startsWith("-")) break;
      if (g === "-v") {
        if (restArgv[p + 1]) l(restArgv[p + 1]);
        p++;
        continue;
      }
      if (g.startsWith("-v")) l(g.slice(2));
    }
  else if (commandName === "getopts") {
    let p = restArgv[1] === "--" ? 1 : 0;
    if (restArgv[2 + p]) l(restArgv[2 + p]);
    (writtenNames.push("OPTARG"), markVarUnknown(varScope, "OPTIND"));
  } else if (commandName === "wait")
    for (let p = 1; p < restArgv.length; p++) {
      let g = restArgv[p];
      if (g === "--" || !g.startsWith("-")) break;
      for (let _ = 1; _ < g.length; _++)
        if (g[_] === "p") {
          if (_ < g.length - 1) l(g.slice(_ + 1));
          else if (restArgv[p + 1]) (l(restArgv[p + 1]), p++);
          break;
        }
    }
  else if (!y && (commandName === "unset" || commandName === "unsetenv")) {
    let p = !1,
      g = !1;
    for (let _ = 1; _ < restArgv.length; _++) {
      let b = restArgv[_];
      if (b.startsWith("-")) {
        if (g)
          return {
            kind: "too-complex",
            reason: `'unset \u2026 ${b}' (wrapped form) \u2014 flag after name; getopt stops at first non-option`,
            nodeType: "command",
          };
        if (b !== "-f" && b !== "-v")
          return {
            kind: "too-complex",
            reason: `'unset ${b}' (wrapped form) \u2014 flag other than -f/-v (zsh -m pattern-unset, bash -n nameref) cannot be statically modelled`,
            nodeType: "command",
          };
        if (b === "-f") p = !0;
        continue;
      }
      if (((g = !0), !/^[A-Za-z_][A-Za-z0-9_]*$/.test(b)))
        return {
          kind: "too-complex",
          reason: `'unset ${b}' (wrapped form) \u2014 non-identifier operand may pathname-expand; cannot statically know which var is unset`,
          nodeType: "command",
        };
      if (p || commandName === "unsetenv") {
        let k = uncertainValueResult(
          varScope.get(b),
          `'${b}' no longer has a statically known value at this unset (wrapped form) \u2014 cannot verify what the command leaves behind`,
          "command",
        );
        if (k !== null) return k;
        continue;
      }
      if (isAssignmentNameUnsafeForSandbox(b))
        return {
          kind: "too-complex",
          reason: `'unset' targets shell variable ${b} (exec-influencing / integer-attr / IFS / PS4)`,
          nodeType: "command",
        };
      if (hasArithmetic) {
        let k = divergentShapeResult(
          `'unset ${b}' is in a command carrying an expansion that can fail at runtime \u2014 whether the name is cleared cannot be statically verified`,
        );
        if (k) return k;
      }
      recordUnset(varScope, b, hasPriorCommands);
    }
  } else if (commandName === "print")
    for (let p = 1; p < restArgv.length; p++) {
      let g = restArgv[p];
      if (g === "--" || g === "-" || !g.startsWith("-")) break;
      let _ = !1;
      for (let b = 1; b < g.length; b++) {
        let k = g[b];
        if (k === "v") {
          let A = b < g.length - 1 ? g.slice(b + 1) : restArgv[p + 1];
          if (A) l(A);
          _ = b === g.length - 1;
          break;
        }
        if (OPTION_LETTERS_TAKING_ARGUMENT.has("-" + k)) {
          _ = b === g.length - 1;
          break;
        }
      }
      if (_) p++;
    }
  else if (commandName === "set")
    for (let p = 1; p < restArgv.length; p++) {
      let g = restArgv[p];
      if (g === "--" || !/^[-+]/.test(g)) break;
      let index = g.indexOf("A", 1);
      if (index === -1) {
        if (g.endsWith("o")) p++;
        continue;
      }
      if (index < g.length - 1) l(g.slice(index + 1));
      else if (restArgv[p + 1]) l(restArgv[p + 1]);
      break;
    }
  else if (commandName === "mapfile" || commandName === "readarray") {
    let p = !1;
    for (let g = 1; g < restArgv.length; g++) {
      let _ = restArgv[g];
      if (_.startsWith("-")) {
        if (/^-[dnOsuCc]$/.test(_)) g++;
        continue;
      }
      (l(_), (p = !0));
    }
    if (!p) writtenNames.push("MAPFILE");
  } else if (
    !y &&
    (commandName === "cd" || commandName === "chdir" || commandName === "pushd" || commandName === "popd")
  ) {
    let p = !1;
    if (commandName === "pushd" || commandName === "popd")
      for (let g = 1; g < restArgv.length; g++) {
        let _ = restArgv[g];
        if (_ === "--") break;
        if (kwe(_, "n")) {
          p = !0;
          break;
        }
        if (commandName === "popd" && (/^\+0*[1-9]/.test(_) || /^-0+$/.test(_))) {
          p = !0;
          break;
        }
      }
    if (!p) (markVarUnknown(varScope, "PWD"), markVarUnknown(varScope, "OLDPWD"));
    if (commandName === "pushd" || commandName === "popd")
      (markVarUnknown(varScope, "DIRSTACK"), markVarUnknown(varScope, "dirstack"));
  }
  let d = commandName !== void 0 && DECLARATION_BUILTINS_ZSH.has(commandName) ? envVars.length + u.length : 0,
    m = declarationPrefixCount;
  if (((declarationPrefixCount += d), d > 0 && currentDeclarationPrefix === void 0)) {
    let p =
        commandName === "export" ||
        commandName === "readonly" ||
        restArgv.some((_) => /^-[A-Za-z]*[xr]/.test(_)),
      g = new Set();
    for (let _ of p ? restArgv.slice(1) : []) {
      let match = /^[A-Za-z_]\w*/.exec(_);
      if (match !== null) g.add(match[0]);
    }
    declarationPrefixBashKeeps = [
      ...(declarationPrefixBashKeeps ?? []),
      ...envVars.map((_) => g.has(_.name)),
      ...u.map(({ word: word }) => g.has(/^[A-Za-z_]\w*/.exec(word)?.[0] ?? "")),
    ];
  }
  if (d > 0 && currentDeclarationPrefix !== void 0) {
    let p = {
        kind: "too-complex",
        reason: `A variable set in front of ${commandName} in this command can't be checked before it runs`,
      },
      g = [...envVars];
    for (let { word: word } of u) {
      let match = /^([A-Za-z_]\w*)(\+?)=([^]*)$/.exec(word);
      if (match === null) return p;
      let [, k = "", A, R = ""] = match;
      g.push(A === "+" ? { name: k, value: R, isAppend: !0 } : { name: k, value: R });
    }
    if (currentDeclarationPrefix.length < m + g.length || (u.length > 0 && g.length > 1)) return p;
    for (let _ = u.length - 1; _ >= 0; _--) {
      let b = u[_]?.target;
      if (b !== void 0) writtenNames.splice(b, 1);
    }
    for (let [_, b] of g.entries()) {
      if (currentDeclarationPrefix[m + _] !== !0) continue;
      let k = b.isAppend ? varScope.get(b.name) : "",
        A = k === void 0 ? void 0 : stripUncertainPrefix(k);
      if (containsAnyPlaceholder(b.value) || isAssignmentNameUnsafeForSandbox(b.name)) return p;
      if (A === void 0 || containsAnyPlaceholder(A))
        return p.kind === "too-complex" &&
          !readingDivergentShapes &&
          k?.includes(UNCERTAIN_VAR_PLACEHOLDER) === !0
          ? { ...p, divergentShape: !0 }
          : p;
      if (hasArithmetic) {
        let T = divergentShapeResult(
          `'${b.name}' is appended to by a command carrying an expansion that can fail at runtime \u2014 whether the append happens cannot be statically verified`,
        );
        if (T) return T;
      }
      let R = (A === k ? "" : UNCERTAIN_PREFIX) + A + b.value;
      (varScope.set(b.name, R), declarationPrefixValues.set(b.name, A + b.value));
    }
  }
  if (
    commandName !== void 0 &&
    envVars.length > 0 &&
    !(d > 0 && currentDeclarationPrefix !== void 0) &&
    POSIX_SPECIAL_BUILTINS_NONEVAL.has(commandName)
  )
    for (let p of envVars) l(p.name);
  for (let p of writtenNames) {
    if (isAssignmentNameUnsafeForSandbox(p))
      return {
        kind: "too-complex",
        reason: `'${commandName ?? envVars[0]?.name}' writes shell variable ${p} (exec-influencing / integer-attr / IFS) \u2014 value cannot be statically verified`,
        nodeType: "command",
      };
    markVarUnknown(varScope, p);
  }
  return (bareAssignmentNames.push(...assignedNames), null);
}
//@ chunk-r01896cg.js:62370-62591 layout
function wrappedGlobResult(e, t) {
  return readingDivergentShapes
    ? null
    : {
        kind: "too-complex",
        reason: `'${e} ${redactPlaceholdersForDisplay(t)}' has a pattern the shell may expand, so this command can't be checked before it runs`,
        nodeType: "command",
        divergentShape: !0,
        keepsRemovalVerdict: !0,
      };
}
//@ chunk-r01896cg.js:62591-62655 layout
var ASSIGNMENT_WORD_RE = /^([A-Za-z_]\w*)(?:\[[\s\S]*?\])?(\+?)=([\s\S]*)$/,
  RE_EXPANSION_FACTOR = 16;
//@ chunk-r01896cg.js:62655-64008 layout
function checkRedirectReadsPrefixVar(children, command, redirects, commands, varScope, bareAssignmentNames) {
  let i = [...command.envVars],
    c = argvWordNodes.get(command.argv),
    l = !1;
  for (let [d, m] of command.argv.entries()) {
    let [, p, g, _] = ASSIGNMENT_WORD_RE.exec(m) ?? [],
      [, b] = /^([A-Za-z_]\w*)\[/.exec(m) ?? [];
    if (p !== void 0 && _ !== void 0)
      i.push({
        name: p,
        value: _,
        isAppend: g === "+",
        word: c?.[d],
        isOtherElement: /^\w+\[[1-9]\d*\]/.test(m),
      });
    else if (b !== void 0) (i.push({ name: b, value: VAR_PLACEHOLDER }), (l = !0));
    else if (!l && (i.length > command.envVars.length || !/^(?:time|coproc|!|-p|--)$/.test(m))) return null;
  }
  let f = new Set(i.map((d) => d.name)),
    filtered = children.filter(
      (d) =>
        (d?.type === "file_redirect" || d?.type === "herestring_redirect") &&
        findReferencedVar(d, f) !== null,
    );
  if (filtered.length === 0) return null;
  let x = divergentShapeResult(
    "A redirect in this command may read a variable the same command sets, and shells can differ on which value it gets",
  );
  if (x) return x.kind === "too-complex" ? { ...x, keepsRemovalVerdict: !0 } : x;
  let u = new Map(varScope),
    h = new Set();
  for (let { name: d, value: m, isAppend: isAppend, word: word, isOtherElement: isOtherElement } of i) {
    let b = m;
    if (word !== void 0 && findReferencedVar(word, h) !== null) {
      let A = [],
        R = consumeReExpansionBudget(word) ? walkArgument(word, A, u, bareAssignmentNames) : void 0;
      if (((b = typeof R === "string" ? ASSIGNMENT_WORD_RE.exec(R)?.[3] : void 0), b !== void 0)) {
        let index = commands.findIndex((v) => v.argv === command.argv);
        commands.splice(index === -1 ? commands.length : index, 0, ...A);
      }
    }
    if (isOtherElement) continue;
    let k = isAppend ? u.get(d) : "";
    if (k === void 0 || b === void 0) markVarUnknown(u, d);
    else u.set(d, k + b);
    h.add(d);
  }
  for (let d of filtered) {
    if (!consumeReExpansionBudget(d)) continue;
    let m = commands.length;
    if (d.type === "file_redirect") {
      let g = walkFileRedirect(d, commands, u, bareAssignmentNames);
      if (((commands.length = m), !("kind" in g))) redirects.push(g);
      continue;
    }
    if (walkHerestringRedirect(d, commands, u, bareAssignmentNames)) commands.length = m;
  }
  return null;
}
//@ chunk-r01896cg.js:64008-64080 layout
function consumeReExpansionBudget(e) {
  if (e.text.length > reExpansionBudget) return !1;
  return ((reExpansionBudget -= e.text.length), !0);
}
/**
 * 把一个 command 节点变成 SimpleCommand：逐子节点处理前缀赋值（同命令内前缀互相引用即拒绝）、command_name（环境清洗开启时命令名不能是变量）、参数（以 - 开头且含运行期内容拒绝）、$var、file/herestring 重定向；之后检查重定向读前缀变量、按命令更新变量作用域（applyCommandVariableWrites）。text 字段在含 $ 或换行时用重新加引号的 argv 重建。
 */
//@ chunk-r01896cg.js:64080-66702 fingerprint = walkCommand (0.699)
function walkCommand(node, extraRedirects, innerCommands, varScope, bareAssignmentNames) {
  let substitutionCountBefore = substitutionCount,
    carveOutCountBefore = quoteScanCarveOutCount,
    c = innerCommands.length,
    argv = [],
    argvNodes = [];
  if (readingDivergentShapes) argvWordNodes.set(argv, argvNodes);
  let argvUnquotedGlob = [],
    envVars = [],
    redirects = [...extraRedirects],
    scopeBeforeRedirects = node.children.some((k) => k && REDIRECT_NODE_TYPES.has(k.type))
      ? new Map(varScope)
      : null,
    d = 0,
    hasArithmetic = !1;
  for (let child of node.children) {
    if (!child) continue;
    let A = containsArithmeticExpansion(child);
    switch (((hasArithmetic ||= A), child.type)) {
      case "variable_assignment": {
        if (envVars.length > 0) {
          let T = findReferencedVar(child, new Set(envVars.map((v) => v.name)));
          if (T !== null)
            return {
              kind: "too-complex",
              reason: `Env-prefix value references \`$${T}\` assigned by an earlier env-prefix in the same command \u2014 runtime sees the earlier assignment, static analysis does not`,
              nodeType: "variable_assignment",
            };
        }
        let R = walkVariableAssignment(child, innerCommands, varScope, bareAssignmentNames);
        if ("kind" in R) return R;
        if (isIntegerVarAssignUnsafe(R.name, R.value))
          return {
            kind: "too-complex",
            reason: `${R.name} has integer attribute \u2014 env-prefix arith-evals value, which can execute subscript command substitution or abort/diverge at runtime`,
            nodeType: "variable_assignment",
          };
        if (
          (envVars.push(
            R.isAppend ? { name: R.name, value: R.value, isAppend: !0 } : { name: R.name, value: R.value },
          ),
          A)
        )
          d = envVars.length - 1;
        break;
      }
      case "command_name": {
        let R = child.children[0] ?? child;
        if (isScrubEnabled()) {
          if (R.type === "simple_expansion" || R.type === "expansion") return tooComplex(R);
          if ((R.type === "string" || R.type === "concatenation") && containsExpansionNode(R))
            return tooComplex(R);
        }
        let T = walkArgument(R, innerCommands, varScope, bareAssignmentNames);
        if (typeof T !== "string") return T;
        (argv.push(T),
          argvNodes.push(R),
          argvUnquotedGlob.push(hasUnquotedGlob(R.text) || nodeHasUnquotedGlob(R)));
        break;
      }
      case "word":
      case "number":
      case "raw_string":
      case "string":
      case "concatenation":
      case "arithmetic_expansion": {
        let R = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
        if (typeof R !== "string") return R;
        if (/^--?[\nA-Za-z0-9_]/.test(R) && containsAnyPlaceholder(R))
          return {
            kind: "too-complex",
            reason: "Argument starting with `-` contains runtime-determined content",
            nodeType: child.type,
          };
        (argv.push(R),
          argvNodes.push(child),
          argvUnquotedGlob.push(hasUnquotedGlob(child.text) || nodeHasUnquotedGlob(child)));
        break;
      }
      case "simple_expansion": {
        substitutionCount++;
        let ev = resolveSimpleExpansion(child, varScope, !1);
        if (typeof ev !== "string") return ev;
        (argv.push(ev), argvNodes.push(child), argvUnquotedGlob.push(!0));
        break;
      }
      case "file_redirect": {
        let R = envVars[0]?.name;
        if (R !== void 0 && A) {
          let v = prefixAssignmentMayFailResult(R);
          if (v) return v;
        }
        let T = walkFileRedirect(child, innerCommands, varScope, bareAssignmentNames);
        if ("kind" in T) return T;
        redirects.push(T);
        break;
      }
      case "herestring_redirect": {
        substitutionCount++;
        let R = envVars[0]?.name;
        if (R !== void 0 && A) {
          let v = prefixAssignmentMayFailResult(R);
          if (v) return v;
        }
        let T = walkHerestringRedirect(child, innerCommands, varScope, bareAssignmentNames);
        if (T) return T;
        break;
      }
      default:
        return tooComplex(child);
    }
  }
  if (scopeBeforeRedirects) {
    let k = checkRedirectReadsPrefixVar(
      node.children,
      { argv: argv, envVars: envVars },
      redirects,
      innerCommands,
      varScope,
      bareAssignmentNames,
    );
    if (k) return k;
  }
  let p = envVars[0]?.name;
  if (d > 0 && p !== void 0) {
    let k = prefixAssignmentMayFailResult(p);
    if (k) return k;
  }
  {
    let k = applyCommandVariableWrites(argv, envVars, varScope, bareAssignmentNames, c > 0, hasArithmetic);
    if (k) return k;
  }
  if (scopeBeforeRedirects) mergeScopeAfterConditional(varScope, scopeBeforeRedirects);
  let g = (k, A) =>
      k === "" || /["'\\ \t\n$`;|&<>(){}#]/.test(k) || (A === 0 && k.includes("="))
        ? `'${k.replaceAll("'", "'\\''")}'`
        : k,
    _ =
      /\$[A-Za-z_]/.test(node.text) ||
      node.text.includes(`
`)
        ? [...envVars.map((k) => `${k.name}=${g(k.value)}`), ...argv.map((k, A) => g(k, A))].join(" ")
        : node.text,
    b = hasUnquotedGlob(node.text);
  return {
    kind: "simple",
    commands: [
      {
        argv: argv,
        envVars: envVars,
        redirects: redirects,
        text: _,
        hasUnquotedGlob: b,
        argvSourceLiteral: substitutionCount === substitutionCountBefore,
        carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== carveOutCountBefore,
        argvUnquotedGlob: argvUnquotedGlob,
      },
    ],
    bareAssignmentNames: [],
  };
}
//@ chunk-r01896cg.js:66702-66715 layout
var GLOB_CHARS = "*?[";
//@ chunk-r01896cg.js:66715-67046 layout
function nodeHasUnquotedGlob(e) {
  switch (e.type) {
    case "word":
    case "number":
      for (let t = 0; t < e.text.length; t++)
        if (e.text[t] === "\\") t++;
        else if (GLOB_CHARS.includes(e.text[t])) return !0;
      return !1;
    case "string":
    case "raw_string":
    case "simple_expansion":
    case "arithmetic_expansion":
      return !1;
    case "concatenation":
      return e.children.some((t) => t !== null && nodeHasUnquotedGlob(t));
    default:
      return !0;
  }
}
/**
 * 递归分析 $(…)：要求子节点之间只有空白/分号/续行（否则“bytes no parsed node accounts for”），内部命令以复制的作用域收集进同一命令列表，空替换补一条 true 命令。
 */
//@ chunk-r01896cg.js:67046-67903 layout
function walkCommandSubstitution(node, innerCommands, varScope, bareAssignmentNames) {
  if (allowPlainUnquotedHeredocs && collectCommandSubstitution(node, "heredoc_redirect"))
    return tooComplex(node);
  let innerScope = new Map(varScope),
    n = innerCommands.length,
    i = !1;
  {
    let buffer = Buffer.from(node.text, "utf8"),
      l = (x) => x === 32 || x === 9 || x === 10 || x === 13 || x === 59 || x === 38,
      f = (x, u) => {
        let h = x;
        while (h < u) {
          let d = buffer[h];
          if (l(d)) h++;
          else if (d === 92 && (buffer[h + 1] === 10 || (buffer[h + 1] === 13 && buffer[h + 2] === 10)))
            h += buffer[h + 1] === 13 ? 3 : 2;
          else return !1;
        }
        return !0;
      },
      y = 0;
    for (let x of node.children) {
      if (!x) continue;
      let u = x.startIndex - node.startIndex;
      if (!f(y, u))
        return {
          kind: "too-complex",
          reason: "command substitution contains bytes no parsed node accounts for",
        };
      y = x.endIndex - node.startIndex;
    }
    if (!f(y, buffer.length))
      return {
        kind: "too-complex",
        reason: "command substitution contains bytes no parsed node accounts for",
      };
  }
  for (let c of node.children) {
    if (!c) continue;
    if (c.type === "$(" || c.type === "`" || c.type === ")") continue;
    if (c.type !== "comment") i = !0;
    let l = collectCommands(c, innerCommands, innerScope, bareAssignmentNames);
    if (l) return l;
  }
  if (i && innerCommands.length === n) pushTrueCommand(innerCommands, node);
  return null;
}
/**
 * 把参数节点解析成字符串：word（拒绝花括号展开、转义花括号、漏解析的 $ 或反引号、被吞的引号）、number、raw_string、string、concatenation（拒绝子节点间遗漏字节、zsh $name[expr]）、算术展开（返回 VAR_PLACEHOLDER）、$var；其余 too-complex。
 */
//@ chunk-r01896cg.js:67903-70413 fingerprint = walkArgument (0.634)
function walkArgument(node, innerCommands, varScope, bareAssignmentNames) {
  if (!node) return { kind: "too-complex", reason: "Null argument node" };
  switch (node.type) {
    case "word": {
      if (BRACE_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains brace expansion syntax",
          nodeType: "word",
          differential: !0,
        };
      if (BRACE_ESCAPED_CLOSE_RE.test(node.text) || BRACE_ESCAPED_OPEN_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace body contains backslash-escaped brace",
          nodeType: "word",
          differential: !0,
        };
      if (WORD_LEAF_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains unescaped ` or $ \u2014 parser missed expansion",
          nodeType: "word",
          differential: !0,
        };
      if (WORD_LEAF_QUOTE_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains unescaped quote \u2014 parser absorbed quote into brace-body word",
          nodeType: "word",
        };
      return node.text.replace(/\\(.)/g, "$1");
    }
    case "number":
      if (node.children.length > 0)
        return {
          kind: "too-complex",
          reason: "Number node contains expansion (NN# arithmetic base syntax)",
          nodeType: node.children[0]?.type,
        };
      return node.text;
    case "raw_string":
      return stripRawString(node.text);
    case "string":
      return walkString(node, innerCommands, varScope, bareAssignmentNames);
    case "concatenation": {
      if (BRACE_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace expansion",
          nodeType: "concatenation",
          differential: !0,
        };
      if (BRACE_ESCAPED_CLOSE_RE.test(node.text) || BRACE_ESCAPED_OPEN_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace body contains backslash-escaped brace",
          nodeType: "concatenation",
          differential: !0,
        };
      let result = "",
        n = !1,
        startIndex = node.startIndex;
      for (let c = 0; c < node.children.length; c++) {
        let l = node.children[c];
        if (!l) continue;
        if (l.startIndex > startIndex)
          return {
            kind: "too-complex",
            reason:
              "Concatenation has unparsed bytes between children \u2014 parser dropped content that shell will see",
            nodeType: "concatenation",
          };
        if (((startIndex = l.endIndex), l.type === "word" && l.text.includes("{"))) n = !0;
        if (
          (l.type === "simple_expansion" || l.type === "expansion") &&
          (node.children[c + 1]?.text.startsWith("[") || /^:[a-zA-Z&]/.test(node.children[c + 1]?.text ?? ""))
        )
          return {
            kind: "too-complex",
            reason: "zsh $name[expr] / $name:mod in bare concatenation \u2014 recursive eval",
            nodeType: "concatenation",
            differential: !0,
          };
        let f = walkArgument(l, innerCommands, varScope, bareAssignmentNames);
        if (typeof f !== "string") return f;
        result += f;
      }
      if (n && (result.includes(",") || result.includes("..")))
        return {
          kind: "too-complex",
          reason: "Brace expansion (unquoted `{` in concatenation with `,`/`..`)",
          nodeType: "concatenation",
        };
      if (ZSH_TILDE_BRACKET_RE.test(result))
        return {
          kind: "too-complex",
          reason: "zsh ~[ dynamic directory syntax (post-collapse)",
          nodeType: "concatenation",
          differential: !0,
        };
      if (ZSH_EQUALS_EXPANSION_RE.test(result))
        return {
          kind: "too-complex",
          reason: "zsh =cmd expansion (post-collapse)",
          nodeType: "concatenation",
          differential: !0,
        };
      return result;
    }
    case "arithmetic_expansion": {
      substitutionCount++;
      let err = walkArithmetic(node);
      if (err) return err;
      return VAR_PLACEHOLDER;
    }
    case "simple_expansion":
      return (substitutionCount++, resolveSimpleExpansion(node, varScope, !1));
    default:
      return tooComplex(node);
  }
}
/**
 * 解析双引号字符串：拼接 string_content，处理 $（拒绝 $[...]、zsh $+ 等前缀标志）、$(cat <<EOF) 安全内联、其他命令替换（递归收集并以 CMDSUB_PLACEHOLDER 代替）、$var（按作用域取值）、算术展开；子节点间间隙含反引号时拒绝。
 */
//@ chunk-r01896cg.js:70413-73069 fingerprint = walkString (0.51)
function walkString(node, innerCommands, varScope, bareAssignmentNames) {
  let result = "",
    cursor = -1,
    i = !1,
    c = !1,
    l = !1;
  for (let child of node.children) {
    if (!child) continue;
    if (cursor !== -1 && child.startIndex > cursor) {
      let str = Buffer.from(node.text, "utf8")
        .subarray(cursor - node.startIndex, child.startIndex - node.startIndex)
        .toString("utf8");
      if (str.includes("`"))
        return {
          kind: "too-complex",
          reason:
            "Unanalyzable backtick body in double-quoted string gap \u2014 shell-evaluated value unknown",
          nodeType: "string",
          differential: !0,
        };
      if (str.length > 0) ((result += str), (c = !0));
    }
    switch (((cursor = child.endIndex), child.type)) {
      case '"':
        cursor = child.endIndex;
        break;
      case "string_content":
        ((result += child.text.replace(/\\\n/g, "").replace(/\\([$`"\\])/g, "$1")), (c = !0));
        break;
      case DOLLAR: {
        let index = node.children.indexOf(child),
          x = node.children[index + 1];
        if (x?.type === "string_content") {
          if (x.text.startsWith("["))
            return {
              kind: "too-complex",
              reason: "Legacy $[...] arithmetic inside double-quotes \u2014 recursive subscript eval",
              nodeType: "string",
              differential: !0,
            };
          if (/^[+^=~]/.test(x.text))
            return {
              kind: "too-complex",
              reason: "zsh $+/$^/$=/$~ prefix-flag expansion \u2014 value defeats downstream content checks",
              nodeType: "string",
              differential: !0,
            };
          let u = node.children[index - 1];
          if (
            /^:[a-zA-Z&]/.test(x.text) &&
            u?.type === "simple_expansion" &&
            u.endIndex === child.startIndex &&
            u.children.some((h) => h?.type === "special_variable_name")
          )
            return {
              kind: "too-complex",
              reason: 'zsh "$name[expr]" / "$name:mod" inside double-quotes \u2014 recursive eval',
              nodeType: "string",
              differential: !0,
            };
        }
        ((result += DOLLAR), (c = !0));
        break;
      }
      case "command_substitution": {
        let heredocBody = extractSafeCatHeredoc(child);
        if (heredocBody === "DANGEROUS") return tooComplex(child);
        if (heredocBody !== null) {
          let trimmed = heredocBody.replace(/\n+$/, "");
          if (QUOTE_OR_BACKSLASH_RE.test(child.text)) quoteScanCarveOutCount++;
          if (
            trimmed.includes(`
`)
          ) {
            if (/^--?[A-Za-z0-9]/.test(result + trimmed))
              return {
                kind: "too-complex",
                reason: "cat-heredoc body would make the argument start with option syntax",
                nodeType: "command_substitution",
              };
            (catHeredocInlineCount++,
              (result +=
                `
` + CMDSUB_PLACEHOLDER),
              (c = !0));
            break;
          }
          (catHeredocInlineCount++, (result += trimmed), (c = !0));
          break;
        }
        let x = walkCommandSubstitution(child, innerCommands, varScope, bareAssignmentNames);
        if (x) return x;
        (substitutionCount++, (result += CMDSUB_PLACEHOLDER), (i = !0));
        break;
      }
      case "simple_expansion": {
        substitutionCount++;
        let err = resolveSimpleExpansion(child, varScope, !0);
        if (typeof err !== "string") return err;
        {
          let x = node.children[node.children.indexOf(child) + 1],
            any = child.children.some((h) => h?.type === "special_variable_name");
          if (
            x?.type === "string_content" &&
            (x.text.startsWith("[") ||
              /^:[a-zA-Z&]/.test(x.text) ||
              (any && ZSH_SUBSCRIPT_OR_MODIFIER_RE.test(x.text)))
          )
            return {
              kind: "too-complex",
              reason: 'zsh "$name[expr]" / "$name:mod" inside double-quotes \u2014 recursive eval',
              nodeType: "string",
              differential: !0,
            };
        }
        if (containsAnyPlaceholder(err)) i = !0;
        else if (err !== "") c = !0;
        else l = !0;
        result += err;
        break;
      }
      case "arithmetic_expansion": {
        let err = walkArithmetic(child);
        if (err) return err;
        (substitutionCount++, (result += VAR_PLACEHOLDER), (i = !0));
        break;
      }
      default:
        return tooComplex(child);
    }
  }
  if (i) {
    if ([...result.replaceAll(CMDSUB_PLACEHOLDER, "").replaceAll(VAR_PLACEHOLDER, "")].length <= 1)
      return tooComplex(node);
  }
  if (!c && !i && !l && node.text.length > 2) {
    let sliced = node.text.slice(1, -1);
    if (sliced.includes("`") || sliced.includes("$("))
      return {
        kind: "too-complex",
        reason: "Delimiters-only string node contains unparsed command substitution",
        nodeType: "string",
        differential: !0,
      };
    return sliced;
  }
  return result;
}
//@ chunk-r01896cg.js:73069-73190 layout
var ARITH_LITERAL_TOKEN_RE =
  /^(?:[0-9]+|0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[-+*/%^&|~!<>=?:(),]+|<<|>>|\*\*|&&|\|\||[<>=!]=|\$\(\(|\)\))$/;
/**
 * 校验算术展开：叶子只能是数字字面量或运算符，引用变量即 too-complex。
 */
//@ chunk-r01896cg.js:73190-73619 fingerprint = walkArithmetic (1)
function walkArithmetic(node) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.children.length === 0) {
      if (!ARITH_LITERAL_TOKEN_RE.test(child.text))
        return {
          kind: "too-complex",
          reason: `Arithmetic expansion references variable or non-literal: ${child.text}`,
          nodeType: "arithmetic_expansion",
        };
      continue;
    }
    switch (child.type) {
      case "binary_expression":
      case "unary_expression":
      case "ternary_expression":
      case "parenthesized_expression": {
        let err = walkArithmetic(child);
        if (err) return err;
        break;
      }
      default:
        return tooComplex(child);
    }
  }
  return null;
}
//@ chunk-r01896cg.js:73619-73721 layout
function pushTrueCommand(e, t) {
  e.push({
    argv: ["true"],
    envVars: [],
    redirects: [],
    text: t.text,
    hasUnquotedGlob: hasUnquotedGlob(t.text),
  });
}
//@ chunk-r01896cg.js:73721-73834 layout
function containsArithmeticExpansion(e) {
  if (e.type === "arithmetic_expansion") return !0;
  for (let t of e.children) if (t && containsArithmeticExpansion(t)) return !0;
  return !1;
}
/**
 * 识别 $(cat <<'EOF' … EOF) 这种安全的字面量替换：只含一个 cat 命令和一个合法 heredoc 时返回正文；正文含 /proc/*\/environ 或危险 awk 程序时返回 'DANGEROUS'；否则 null。
 */
//@ chunk-r01896cg.js:73834-74513 fingerprint = extractSafeCatHeredoc (0.925)
function extractSafeCatHeredoc(subNode) {
  let stmt = null;
  for (let child of subNode.children) {
    if (!child) continue;
    if (child.type === "$(" || child.type === ")") continue;
    if (child.type === "redirected_statement" && stmt === null) stmt = child;
    else return null;
  }
  if (!stmt) return null;
  let r = !1,
    body = null;
  for (let child of stmt.children) {
    if (!child) continue;
    if (child.type === "command") {
      let cmdChildren = child.children.filter((c) => c);
      if (cmdChildren.length !== 1) return null;
      let nameNode = cmdChildren[0];
      if (nameNode?.type !== "command_name" || nameNode.text !== "cat") return null;
      r = !0;
    } else if (child.type === "heredoc_redirect") {
      if (walkHeredocRedirect(child) !== null) return null;
      for (let hc of child.children) {
        if (hc?.type === "<<-") return null;
        if (hc?.type === "heredoc_body") body = hc.text;
      }
    } else return null;
  }
  if (!r || body === null) return null;
  if (PROC_ENVIRON_RE.test(body)) return "DANGEROUS";
  if (awkProgramHasExecBridge(body) !== !1) return "DANGEROUS";
  return body;
}
/**
 * 解析 NAME=value / NAME+=value：命令替换值记为 CMDSUB_PLACEHOLDER，$var 按作用域解析，其余经 walkArgument；返回 {name, value, isAppend} 或 too-complex。
 */
//@ chunk-r01896cg.js:74513-76097 fingerprint = walkVariableAssignment (0.966)
function walkVariableAssignment(node, innerCommands, varScope, bareAssignmentNames) {
  let name = null,
    value = "",
    isAppend = !1;
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "variable_name") name = child.text;
    else if (child.type === "=" || child.type === "+=") {
      isAppend = child.type === "+=";
      continue;
    } else if (child.type === "command_substitution") {
      let l = walkCommandSubstitution(child, innerCommands, varScope, bareAssignmentNames);
      if (l) return l;
      value = CMDSUB_PLACEHOLDER;
    } else if (child.type === "simple_expansion") {
      let err = resolveSimpleExpansion(child, varScope, !0);
      if (typeof err !== "string") return err;
      value = err;
    } else {
      let l = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof l !== "string") return l;
      value = l;
    }
  }
  if (name === null)
    return {
      kind: "too-complex",
      reason: "Variable assignment without name",
      nodeType: "variable_assignment",
    };
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
    return {
      kind: "too-complex",
      reason: `Invalid variable name (bash treats as command): ${name}`,
      nodeType: "variable_assignment",
    };
  if (name === "IFS")
    return {
      kind: "too-complex",
      reason: "IFS assignment changes word-splitting \u2014 cannot model statically",
      nodeType: "variable_assignment",
    };
  if (name === "PS4" || name === "PROMPT4") {
    if (isAppend)
      return {
        kind: "too-complex",
        reason: "PS4 += cannot be statically verified \u2014 combine into a single PS4= assignment",
        nodeType: "variable_assignment",
      };
    if (containsAnyPlaceholder(value))
      return {
        kind: "too-complex",
        reason: "PS4 value derived from cmdsub/variable \u2014 runtime unknowable",
        nodeType: "variable_assignment",
      };
    if (!/^[A-Za-z0-9 _+:./=[\]-]*$/.test(value.replace(/\$\{[A-Za-z_][A-Za-z0-9_]*\}/g, "")))
      return {
        kind: "too-complex",
        reason: "PS4 value outside safe charset \u2014 only ${VAR} refs and [A-Za-z0-9 _+:.=/[]-] allowed",
        nodeType: "variable_assignment",
      };
  }
  if (value.includes("~") && !readingDivergentShapes)
    return {
      kind: "too-complex",
      reason: "Tilde in assignment value \u2014 bash may expand at assignment time",
      nodeType: "variable_assignment",
    };
  return { name: name, value: value, isAppend: isAppend };
}
/**
 * bash/zsh 会隐式改写的特殊变量集合（_、RANDOM、SECONDS、REPLY、PIPESTATUS、BASH_REMATCH、MATCH、OPTARG、PS1 等），这些变量的值不能当作已跟踪的常量。
 */
//@ chunk-r01896cg.js:76097-76691 facade-majority
var BASH_IMPLICITLY_REBOUND_VARS = new Set([
  "_",
  "RANDOM",
  "SECONDS",
  "LINENO",
  "BASH_COMMAND",
  "FUNCNAME",
  "EPOCHSECONDS",
  "EPOCHREALTIME",
  "SRANDOM",
  "BASHPID",
  "BASH_MONOSECONDS",
  "BASH_TRAPSIG",
  "HISTCMD",
  "ERRNO",
  "REPLY",
  "reply",
  "PIPESTATUS",
  "pipestatus",
  "BASH_SOURCE",
  "DIRSTACK",
  "GROUPS",
  "BASH_ARGV",
  "BASH_ARGC",
  "BASH_SUBSHELL",
  "BASH_LINENO",
  "BASH_ARGV0",
  "BASH_REMATCH",
  "MATCH",
  "match",
  "MBEGIN",
  "MEND",
  "mbegin",
  "mend",
  "OPTARG",
  "OPTIND",
  "argv",
  "FIGNORE",
  "fignore",
  "PSVAR",
  "psvar",
  "WATCH",
  "watch",
  "HISTCHARS",
  "histchars",
  "PS1",
  "PROMPT",
  "prompt",
  "PS2",
  "PROMPT2",
  "PS3",
  "PROMPT3",
  "PS4",
  "PROMPT4",
  "RPS1",
  "RPROMPT",
  "RPS2",
  "RPROMPT2",
]);
/**
 * 解析 $var：作用域里有值时返回值（不确定值→too-complex+divergentShape；动态变量只在引号内且是安全环境变量时返回占位符；裸用时空值或含空白/通配的值拒绝）；HOME 取本机 homedir；引号内的安全环境变量与特殊变量返回 VAR_PLACEHOLDER；其余 too-complex。
 */
//@ chunk-r01896cg.js:76691-77367 fingerprint = resolveSimpleExpansion (0.525)
function resolveSimpleExpansion(node, varScope, insideString) {
  let varName = null,
    o = !1;
  for (let c of node.children) {
    if (c?.type === "variable_name") {
      varName = c.text;
      break;
    }
    if (c?.type === "special_variable_name") {
      ((varName = c.text), (o = !0));
      break;
    }
  }
  if (varName === null) return tooComplex(node);
  let trackedValue = varScope.get(varName),
    i = trackedValue === void 0 ? void 0 : stripUncertainPrefix(trackedValue);
  if (i !== void 0) {
    if (i.includes(UNCERTAIN_VAR_PLACEHOLDER)) {
      let c = tooComplex(node);
      return c.kind === "too-complex" && !readingDivergentShapes ? { ...c, divergentShape: !0 } : c;
    }
    if (BASH_IMPLICITLY_REBOUND_VARS.has(varName))
      return insideString && SAFE_ENV_VARS.has(varName) && varName !== "BASHPID"
        ? VAR_PLACEHOLDER
        : tooComplex(node);
    if (containsAnyPlaceholder(i)) {
      if (!insideString) return tooComplex(node);
      return ((usedAssignedValue ||= i !== VAR_PLACEHOLDER && i !== CMDSUB_PLACEHOLDER), i);
    }
    if (!insideString) {
      if (i === "") return tooComplex(node);
      if (BARE_VAR_UNSAFE_RE.test(i)) return tooComplex(node);
    }
    return ((usedAssignedValue = !0), i);
  }
  if (varName === "HOME") {
    let c = homedir();
    if (!insideString && (c === "" || BARE_VAR_UNSAFE_RE.test(c))) return tooComplex(node);
    return c;
  }
  if (insideString) {
    if (SAFE_ENV_VARS.has(varName)) return VAR_PLACEHOLDER;
    if (o && (SPECIAL_VAR_NAMES.has(varName) || /^[0-9]+$/.test(varName))) return VAR_PLACEHOLDER;
  }
  return tooComplex(node);
}
//@ chunk-r01896cg.js:77367-77392 layout
function markLoopWritesUnknown(varScope, node) {
  markWrittenVarsUnknown(node, varScope);
}
/**
 * later 轮次下重新遍历循环体（嵌套超过 MAX_LOOP_NESTING=5 即 too-complex），返回循环中值被改变的变量名；保存/恢复相关模块级状态。
 */
//@ chunk-r01896cg.js:77392-77739 layout
function collectLoopWrites(loopNode, commands, varScope, bareAssignmentNames) {
  if (!isLaterLoopPass || loopNode === currentLoopNode) return [];
  if (loopDepth >= MAX_LOOP_NESTING)
    return {
      kind: "too-complex",
      reason: "Loops nested too deeply to follow the variables they change",
      nodeType: loopNode.type,
    };
  let o = new Map(varScope),
    n = currentLoopNode,
    i = usedAssignedValue,
    c = sawUncertainWrite,
    l = declarationPrefixCount,
    f = declarationPrefixBashKeeps,
    y = declarationPrefixValues,
    x = prefixAssignInBranch;
  ((declarationPrefixValues = new Map(y)), (currentLoopNode = loopNode), loopDepth++);
  let u = collectCommands(loopNode, [...commands], o, [...bareAssignmentNames]);
  return (
    loopDepth--,
    (currentLoopNode = n),
    (usedAssignedValue = i),
    (sawUncertainWrite = c),
    (declarationPrefixCount = l),
    (declarationPrefixBashKeeps = f),
    (declarationPrefixValues = y),
    (prefixAssignInBranch = x),
    u ?? [...varScope.keys()].filter((h) => o.get(h) !== varScope.get(h))
  );
}
//@ chunk-r01896cg.js:77739-78254 layout
function markUnsetOperandsUnknown(e, t) {
  let r = () => {
    for (let s of t.keys()) markVarUnknown(t, s);
  };
  for (let s of e) {
    if (s?.type === "unset" && s.text === "unsetenv") return;
    if (
      !s ||
      s.type === "unset" ||
      s.type === "file_redirect" ||
      s.type === "heredoc_redirect" ||
      s.type === "herestring_redirect"
    )
      continue;
    if (s.type === "variable_name") {
      markVarUnknown(t, s.text.replace(/\\/g, ""));
      continue;
    }
    if (s.type === "word") {
      if (s.text.startsWith("-")) {
        if (s.text === "--" || /^-[fvn]+$/.test(s.text)) continue;
        r();
        continue;
      }
      if (/^\\?[A-Za-z_][A-Za-z0-9_]*$/.test(s.text)) {
        markVarUnknown(t, s.text.replace(/^\\/, ""));
        continue;
      }
    }
    r();
  }
}
//@ chunk-r01896cg.js:78254-78693 layout
function staticWordValue(e) {
  if (!e) return null;
  switch (e.type) {
    case "word":
    case "number":
      return e.text.replace(/\\(.)/g, "$1");
    case "raw_string":
      return e.text.slice(1, -1);
    case "string": {
      let filtered = e.children.filter((r) => r && r.type !== '"');
      if (filtered.length === 0) return "";
      if (filtered.length === 1 && filtered[0]?.type === "string_content") return filtered[0].text;
      return null;
    }
    case "concatenation": {
      let t = "";
      for (let r of e.children) {
        let s = staticWordValue(r);
        if (s === null) return null;
        t += s;
      }
      return t;
    }
    default:
      return null;
  }
}
/**
 * 遍历子树，把可能被写入的变量在作用域中标为未知（赋值、for 变量、read/mapfile/unset、包装命令中的赋值等；跳过函数定义/子 shell/替换与后台命令）。用于循环与 while 条件。
 */
//@ chunk-r01896cg.js:78693-81485 layout
function markWrittenVarsUnknown(node, varScope) {
  if (
    node.type === "function_definition" ||
    node.type === "subshell" ||
    node.type === "command_substitution" ||
    node.type === "process_substitution"
  )
    return;
  if (node.type === "pipeline") {
    let r = null;
    for (let s of node.children) if (s && !SEPARATOR_TYPES.has(s.type)) r = s;
    if (r) markWrittenVarsUnknown(r, varScope);
    return;
  }
  if (node.type === "list" || node.type === "program") {
    let children = node.children;
    for (let s = 0; s < children.length; s++) {
      let o = children[s];
      if (!o || SEPARATOR_TYPES.has(o.type)) continue;
      let n = s + 1;
      while (n < children.length && !children[n]) n++;
      if (children[n]?.type === "&") continue;
      markWrittenVarsUnknown(o, varScope);
    }
    return;
  }
  if (node.type === "variable_assignment") {
    for (let r of node.children)
      if (r?.type === "variable_name") {
        markVarUnknown(varScope, r.text);
        break;
      }
  }
  if (node.type === "for_statement") {
    for (let r of node.children)
      if (r?.type === "variable_name") {
        markVarUnknown(varScope, r.text);
        break;
      }
  }
  if (node.type === "unset_command") markUnsetOperandsUnknown(node.children, varScope);
  if (node.type === "command") {
    let r,
      s,
      o = [],
      n = [],
      i = !1;
    for (let d of node.children) {
      if (!d) continue;
      if (d.type === "command_name") ((s = d), (r = staticWordValue(d.children[0] ?? d) ?? void 0), (i = !0));
      else if (
        !i ||
        d.type === "file_redirect" ||
        d.type === "herestring_redirect" ||
        d.type === "heredoc_redirect"
      );
      else (o.push(staticWordValue(d) ?? ""), n.push(d));
    }
    let c = !1,
      l;
    while (r !== void 0 && (COMMAND_WRAPPER_BUILTINS.has(r) || r === "!")) {
      if ((l === "builtin" || l === "command") && r !== "builtin" && r !== "command" && r !== "noglob")
        c = !0;
      let d = r === "!" ? void 0 : r;
      while (o.length > 0) {
        let m = o[0];
        if (/^-[-pvV]*$/.test(m)) {
          if (/[vV]/.test(m) || (d === "builtin" && /p/.test(m) && isStagedPumpkinEnabled())) c = !0;
          (o.shift(), n.shift());
        } else if (/^[A-Za-z_]\w*(\[[^\]]*\])?\+?=/.test(m)) {
          if (
            d !== void 0 &&
            ASSIGNING_WRAPPERS.has(d) &&
            ((SAFE_PREFIX_ASSIGN_RE.test(m) && !containsAnyPlaceholder(m)) || readingDivergentShapes) &&
            isStagedPumpkinEnabled()
          )
            c = !0;
          let p = m.match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
          (markVarUnknown(varScope, p), o.shift(), n.shift(), (d = void 0));
        } else break;
      }
      ((l = d), (r = o.shift()), n.shift());
    }
    let f = o,
      y = (d) => {
        if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(d)) markVarUnknown(varScope, d);
      };
    if (r === "read" && !gso()) {
      markVarUnknown(varScope, "REPLY");
      let d = 0,
        m = !1;
      while (d < f.length) {
        let p = f[d];
        if (!m && p === "--") {
          ((m = !0), d++);
          continue;
        }
        if (!m && p.startsWith("-")) {
          if (READ_DATA_FLAGS.has(p)) {
            d += 2;
            continue;
          }
          let g = !1;
          for (let _ = 1; _ < p.length; _++) {
            let b = p[_];
            if (b === "a" || b === "A") {
              (y(_ < p.length - 1 ? p.slice(_ + 1) : (f[d + 1] ?? "")), (g = _ === p.length - 1));
              break;
            }
            if (READ_DATA_FLAGS.has("-" + b)) {
              g = _ === p.length - 1;
              break;
            }
          }
          d += g ? 2 : 1;
          continue;
        }
        (y(p), d++);
      }
    } else if (r === "mapfile" || r === "readarray") {
      markVarUnknown(varScope, "MAPFILE");
      for (let d = 0; d < f.length; d++) {
        let m = f[d];
        if (m.startsWith("-")) {
          if (/^-[dnOsuCc]$/.test(m)) d++;
          continue;
        }
        y(m);
      }
    } else if (r === "unset" && !c) markUnsetOperandsUnknown(n, varScope);
    let x = s?.children[0],
      u = x?.type === "word" ? x.text.replace(/\\(.)/g, "$1") : void 0,
      h =
        u !== void 0 &&
        !POSIX_SPECIAL_BUILTINS_NONEVAL.has(u) &&
        !COMMAND_WRAPPER_BUILTINS.has(u) &&
        !(currentDeclarationPrefix === void 0 ? DECLARATION_BUILTINS : DECLARATION_BUILTINS_ZSH).has(u);
    for (let d of node.children)
      if (d && (d.type !== "variable_assignment" || !h)) markWrittenVarsUnknown(d, varScope);
    return;
  }
  if (node.type === "declaration_command") {
    for (let r of node.children)
      if (
        r?.type === "string" ||
        r?.type === "raw_string" ||
        r?.type === "word" ||
        r?.type === "number" ||
        r?.type === "concatenation" ||
        r?.type === "variable_name"
      ) {
        let replaced = r.text.replace(/['"\\]/g, ""),
          match = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(replaced);
        if (match) markVarUnknown(varScope, match[1]);
        else {
          let index = replaced.indexOf("=");
          if (index > 0 && replaced.lastIndexOf("$", index - 1) !== -1)
            for (let i of [...varScope.keys()]) markVarUnknown(varScope, i);
        }
      }
  }
  for (let r of node.children) if (r) markWrittenVarsUnknown(r, varScope);
}
//@ chunk-r01896cg.js:81485-81650 layout
function mergeScopeInto(target, branchScope) {
  for (let [r, s] of branchScope) {
    let o = target.get(r);
    if (o !== void 0 && o !== s) {
      let n = stripUncertainPrefix(s);
      if (declarationPrefixValues.get(r) === n && stripUncertainPrefix(o) !== n) prefixAssignInBranch = !0;
      markVarUnknown(target, r);
    }
  }
  for (let r of target.keys()) if (!branchScope.has(r)) markVarUnknown(target, r);
}
/**
 * 把赋值写入变量作用域：分支内或值冲突时标为未知（VAR_PLACEHOLDER），+= 累加，否则覆盖。
 */
//@ chunk-r01896cg.js:81650-81885 fingerprint = applyVarToScope (1)
function applyVarToScope(varScope, assignment, markUnknown = !1) {
  if (markUnknown) {
    markVarUnknown(varScope, assignment.name);
    return;
  }
  if (assignment.isAppend && !varScope.has(assignment.name)) return;
  let s = varScope.get(assignment.name);
  if (
    s !== void 0 &&
    s !== assignment.value &&
    !assignment.isAppend &&
    !containsAnyPlaceholder(assignment.value)
  ) {
    markVarUnknown(varScope, assignment.name);
    return;
  }
  let combined = assignment.isAppend ? (s ?? "") + assignment.value : assignment.value;
  varScope.set(assignment.name, combined);
}
//@ chunk-r01896cg.js:81885-81921 file-local
function stripRawString(text) {
  return text.slice(1, -1);
}
//@ chunk-r01896cg.js:81921-82065 layout
function containsExpansionNode(e) {
  for (let t of e.children) {
    if (!t) continue;
    if (t.type === "simple_expansion" || t.type === "expansion") return !0;
    if (containsExpansionNode(t)) return !0;
  }
  return !1;
}
//@ chunk-r01896cg.js:82065-82229 layout
function tildeVarName(e) {
  if (e === "~" || e.startsWith("~/")) return "HOME";
  if (e === "~+" || e.startsWith("~+/")) return "PWD";
  if (e === "~-" || e.startsWith("~-/")) return "OLDPWD";
  return null;
}
//@ chunk-r01896cg.js:82229-82512 layout
function findReferencedVar(e, t) {
  let r = e.type === "variable_assignment";
  for (let s of e.children) {
    if (!s) continue;
    if (s.type === "variable_name") {
      if (r) continue;
      if (t.has(s.text)) return s.text;
    }
    if (s.type === "word") {
      let n = tildeVarName(s.text);
      if (n !== null && t.has(n)) return n;
    }
    let o = findReferencedVar(s, t);
    if (o !== null) return o;
  }
  return null;
}
/**
 * 把无法分析的节点转成 too-complex：ERROR 节点按是否为 $+非 ASCII 给不同理由，其他类型用 DANGEROUS_TYPES 中的中文化描述（如“A nested command”）。
 */
//@ chunk-r01896cg.js:82512-82897 fingerprint = tooComplex (0.518)
function tooComplex(node) {
  if (node.type === "ERROR")
    return {
      kind: "too-complex",
      reason:
        isDollarNonAsciiName(node.text) || (node.text.startsWith("${") && hasZshMultibyteName(node.text))
          ? "A $ followed by non-ASCII text in this command can't be checked before it runs"
          : "Parse error",
      nodeType: node.type,
    };
  let t = DANGEROUS_TYPES.get(node.type);
  return {
    kind: "too-complex",
    reason: `${t === void 0 ? "This command" : `${t} in this command`} can't be checked before it runs`,
    nodeType: node.type,
  };
}
/**
 * 节点类型 → 用户可读描述（A variable、A nested command、A here-document…），tooComplex 生成理由时使用。
 */
//@ chunk-r01896cg.js:82897-83970 fingerprint = DANGEROUS_TYPES (0.478)
var DANGEROUS_TYPES = new Map([
  ["simple_expansion", "A variable"],
  ["expansion", "A variable in braces"],
  ["command_substitution", "A nested command"],
  ["process_substitution", "A command used as a file"],
  ["brace_expression", "A brace pattern"],
  ["ansi_c_string", "Text with escape codes"],
  ["translated_string", "Translatable text"],
  ["test_command", "A test in brackets"],
  ["herestring_redirect", "A here-string"],
  ["heredoc_redirect", "A here-document"],
  ["subshell", "A group in parentheses"],
  ["compound_statement", "A group in braces or double parentheses"],
  ["for_statement", "A for or select loop"],
  ["c_style_for_statement", "A counting for loop"],
  ["while_statement", "A while or until loop"],
  ["until_statement", "An until loop"],
  ["if_statement", "An if statement"],
  ["case_statement", "A case statement"],
  ["function_definition", "A function definition"],
  ["array", "A list of values"],
  ["string", "Quoted text"],
  ["file_redirect", "A file redirect"],
  ["pipeline", "A pipeline"],
  ["concatenation", "Joined pieces of text"],
  ["variable_assignment", "A variable assignment"],
  ["variable_assignments", "Variable assignments"],
]);
/**
 * 提取文本中所有 ${…} 的内部内容（尊重引号与嵌套）。
 */
//@ chunk-r01896cg.js:83970-84415 facade-majority
function liveBracedExpansionBodies(e) {
  let t = [],
    r = 0,
    s = !1,
    o = !1;
  while (r < e.length) {
    let n = e[r];
    if (n === "\\" && !s) {
      r += 2;
      continue;
    }
    if (n === "'" && !o) {
      ((s = !s), r++);
      continue;
    }
    if (n === '"' && !s) {
      ((o = !o), r++);
      continue;
    }
    if (!s && n === "$" && e[r + 1] === "{") {
      let i = 1,
        c = r + 2,
        l = !1,
        f = !1;
      while (c < e.length && i > 0) {
        let y = e[c];
        if (y === "\\" && !l) {
          c += 2;
          continue;
        }
        if (y === "'" && !f) l = !l;
        else if (y === '"' && !l) f = !f;
        else if (!l && !f) {
          if (y === "{") i++;
          else if (y === "}") i--;
        }
        c++;
      }
      (t.push(e.slice(r + 2, i === 0 ? c - 1 : c)), (r = c));
      continue;
    }
    r++;
  }
  return t;
}
/**
 * 去掉反斜杠转义（保留会影响引号或展开的转义），单引号区原样保留，用于比较命令文本的字面形态。
 */
//@ chunk-r01896cg.js:84415-84691 facade-majority
function stripLiteralQuotedRegions(e) {
  let t = "",
    r = !1,
    s = !1;
  for (let o = 0; o < e.length; o++) {
    let n = e[o];
    if (r) {
      if (n === "'") ((r = !1), (t += n));
      continue;
    }
    if (n === "\\" && !r) {
      let i = e[o + 1];
      if ((o++, i !== void 0 && !"$'\"`\\".includes(i))) t += i;
      continue;
    }
    if (n === '"') {
      ((s = !s), (t += n));
      continue;
    }
    if (n === "'" && !s) {
      ((r = !0), (t += n));
      continue;
    }
    t += n;
  }
  return t;
}
/**
 * 去掉引号内的内容和转义字符，只保留未加引号的部分。
 */
//@ chunk-r01896cg.js:84691-84934 facade-majority
function stripQuotedRegions(e) {
  let t = "",
    r;
  for (let s = 0; s < e.length; s++) {
    let o = e[s];
    if (r === "'") {
      if (o === "'") r = void 0;
      continue;
    }
    if (r === '"') {
      if (o === "\\") s++;
      else if (o === '"') r = void 0;
      continue;
    }
    if (o === "\\") {
      s++;
      continue;
    }
    if (o === "'" || o === '"') {
      r = o;
      continue;
    }
    t += o;
  }
  return t;
}
/**
 * 会写变量的 zsh 模块函数名（strftime、zstat、zselect、zftp 等），以及会写变量的 zsh 内建集合（zformat、zparseopts、zstyle、vared……）。
 */
//@ chunk-r01896cg.js:84934-85146 facade-majority
var ZSH_MODULE_NAME_WRITERS = [
    "strftime",
    "pcre_match",
    "zstat",
    "zselect",
    "zgetattr",
    "zlistattr",
    "ztie",
    "zuntie",
    "syserror",
    "zsystem",
    "zftp",
    "zcurses",
  ],
  ZSH_VAR_WRITING_BUILTINS = new Set([
    "zformat",
    "zparseopts",
    "zstyle",
    "zregexparse",
    "getln",
    "vared",
    ...ZSH_MODULE_NAME_WRITERS,
  ]);
//@ chunk-r01896cg.js:85146-85388 layout
function zshStatWritesVarReason(e, t) {
  return e === "stat" && t.some((r) => /^-[gnNolLtTrs]*[AH]/.test(r)) && _vn()
    ? "'stat' with -A or -H \u2014 zsh's stat builtin stores its result in the variable that option names, so a tracked value cannot be statically verified"
    : null;
}
/**
 * zsh 危险内建集合（zmodload、emulate、sysopen、zpty、ztcp、zf_rm……、setopt、autoload，以及会写变量的内建），checkSemantics 遇到即拒绝；同一语句定义 find 的执行/写类动作集合 FIND_EXEC_ACTIONS（-exec、-delete、-fprint 等）。
 */
//@ chunk-r01896cg.js:85388-85787 facade-majority = ZSH_DANGEROUS_BUILTINS (0.649)
var ZSH_DANGEROUS_BUILTINS = new Set([
    "zmodload",
    "emulate",
    "sysopen",
    "sysread",
    "syswrite",
    "sysseek",
    "zpty",
    "ztcp",
    "zsocket",
    "zf_rm",
    "zf_mv",
    "zf_ln",
    "zf_chmod",
    "zf_chown",
    "zf_mkdir",
    "zf_rmdir",
    "zf_chgrp",
    "repeat",
    "foreach",
    "zcompile",
    "setopt",
    "unsetopt",
    "disable",
    "shopt",
    "autoload",
    "functions",
    ...ZSH_VAR_WRITING_BUILTINS,
  ]),
  FIND_EXEC_ACTIONS = new Set([
    "-exec",
    "-execdir",
    "-ok",
    "-okdir",
    "-delete",
    "-rm",
    "-fprint",
    "-fprint0",
    "-fprintf",
    "-fls",
    "-files0-from",
  ]);
//@ chunk-r01896cg.js:85787-85828 facade-majority
function isFindDangerousAction(e) {
  return FIND_EXEC_ACTIONS.has(e) && lyr(e);
}
//@ chunk-r01896cg.js:85828-86374 layout
var FIND_ARG_TAKING_PREDICATES = new Set([
    "-name",
    "-iname",
    "-path",
    "-ipath",
    "-lname",
    "-ilname",
    "-regex",
    "-iregex",
    "-wholename",
    "-iwholename",
    "-samefile",
    "-newer",
    "-anewer",
    "-cnewer",
    "-mnewer",
    "-perm",
    "-user",
    "-group",
    "-uid",
    "-gid",
    "-size",
    "-type",
    "-xtype",
    "-fstype",
    "-inum",
    "-links",
    "-used",
    "-context",
    "-amin",
    "-cmin",
    "-mmin",
    "-atime",
    "-ctime",
    "-mtime",
    "-mindepth",
    "-maxdepth",
    "-printf",
    "-regextype",
    "-D",
    "-f",
    "-flags",
    "-Bnewer",
    "-Btime",
    "-Bmin",
    "-files0-from",
    "-xattrname",
  ]),
  FIND_NEWER_XY_RE = /^-newer[aBcm][aBcmt]$/,
  Qt = /^-(?:[EHLPXdsx]*D|f|[dsx]*[EHLPX][EHLPXdsx]*f)$/,
  nr = /^-[dsx]+f$/;
//@ chunk-r01896cg.js:86374-86431 facade-majority
function findWordTakesOperand(e) {
  return FIND_ARG_TAKING_PREDICATES.has(e) || FIND_NEWER_XY_RE.test(e) || Qt.test(e);
}
//@ chunk-r01896cg.js:86431-86465 facade-majority
function findWordTakesFlagValue(e) {
  return Qt.test(e);
}
//@ chunk-r01896cg.js:86465-86499 facade-majority
function isAmbiguousFindWord(e) {
  return nr.test(e);
}
/**
 * eval 类内建集合（eval、source、.、exec、trap、alias、let、mapfile、bind、complete……），这类命令的参数会被当成代码执行；同时定义 awk 程序名集合，以及 awk 读取程序文件的选项正则。
 */
//@ chunk-r01896cg.js:86499-86734 facade-majority = EVAL_LIKE_BUILTINS (0.812)
var EVAL_LIKE_BUILTINS = new Set([
    "eval",
    "source",
    ".",
    "exec",
    "nocorrect",
    "fc",
    "coproc",
    "trap",
    "enable",
    "mapfile",
    "readarray",
    "hash",
    "bind",
    "complete",
    "compgen",
    "alias",
    "let",
  ]),
  AWK_NAMES = new Set(["awk", "gawk", "mawk", "nawk"]),
  AWK_PROGRAM_FILE_OPT_RE = /^(?:-[FvW]$|--(?:fie|a$|as))/;
/**
 * 检查 awk 程序文本：system()、命令管道/getline、@load/@include/间接调用、extension()、/inet/ 网络套接字，命中返回理由，否则 false。
 */
//@ chunk-r01896cg.js:86734-87486 facade-majority
function awkProgramHasExecBridge(e) {
  if (/(?<![A-Za-z_])system[\s\\]*\(/.test(e))
    return "awk program contains system() which executes arbitrary commands";
  if (/(?:^|[^|])\|&?[^/|%";#{}]*"/.test(e) || /(?:^|[^|])\|&?[\s\\]*getline\b/.test(e))
    return 'awk program contains a command pipe (| "cmd" or | getline) which executes arbitrary commands';
  if (/@[\s\\]*(?:load|include)\b|@[\s\\]*\w+(?:::\w+)?(?:\[[^\]]*\])*[\s\\]*\(/.test(e))
    return "awk program contains @load/@include or an @indirect call which can execute arbitrary code";
  if (/(?<![A-Za-z_])extension[\s\\]*\(/.test(e))
    return "awk program contains extension() which loads arbitrary native code (legacy gawk)";
  if (/"\/inet[46]?\//.test(e))
    return "awk program opens a gawk /inet/ network socket which can exfiltrate data";
  return !1;
}
/**
 * shell 程序名集合（POSIX shell、busybox/toybox/wsl/su 等 applet、fish/csh、cmd/powershell）、可透明剥离的启动包装（time、command、env、nice、nohup、sudo、doas、timeout……）和不处理的执行包装（watch、setsid、strace、flock、unshare……）。
 */
//@ chunk-r01896cg.js:87486-87916 facade-majority
var POSIX_SHELL_NAMES = new Set(["bash", "sh", "zsh", "dash", "ksh", "mksh", "ash", "hush", "rbash"]),
  APPLET_SHELL_NAMES = new Set(["busybox", "toybox", "wsl", "su", "runuser"]),
  SHELL_PROGRAM_NAMES = new Set([
    ...POSIX_SHELL_NAMES,
    "fish",
    "csh",
    "tcsh",
    "rsh",
    ...APPLET_SHELL_NAMES,
    "cmd",
    "powershell",
    "pwsh",
  ]),
  TRANSPARENT_LAUNCHER_NAMES = new Set([
    "time",
    "command",
    "builtin",
    "noglob",
    "env",
    "nice",
    "nohup",
    "sudo",
    "doas",
    "stdbuf",
    "timeout",
  ]),
  UNHANDLED_EXEC_WRAPPERS = new Set([
    "watch",
    "ionice",
    "chrt",
    "setsid",
    "taskset",
    "strace",
    "ltrace",
    "script",
    "flock",
    "unshare",
    "nsenter",
  ]);
//@ chunk-r01896cg.js:87916-87970 layout
function isZshDangerousBuiltin(e) {
  return ZSH_DANGEROUS_BUILTINS.has(e) && (!ZSH_VAR_WRITING_BUILTINS.has(e) || _vn());
}
/**
 * 命令名是否为 eval 类内建、zsh 危险内建、exec 包装或 rm/rmdir。
 */
//@ chunk-r01896cg.js:87970-88068 facade-majority
function isSandboxAutoAllowUnsafeBase(e) {
  let t = rU(e);
  return (
    EVAL_LIKE_BUILTINS.has(e) ||
    isZshDangerousBuiltin(e) ||
    UNHANDLED_EXEC_WRAPPERS.has(e) ||
    UNHANDLED_EXEC_WRAPPERS.has(t) ||
    t === "rm" ||
    t === "rmdir"
  );
}
/**
 * Bash 语义检查用的常量表：会对下标求值的选项（test -v、printf -v、read -a…）、算术比较运算符、声明类关键字与内建、set -o 安全选项与字母，以及影响命令查找/执行的变量名（PATH、BASH_ENV、LANG、LC_* 等）。
 */
//@ chunk-r01896cg.js:88068-89928 facade-majority
var SUBSCRIPT_EVAL_FLAGS = {
    test: new Set(["-v", "-R", "-t"]),
    "[": new Set(["-v", "-R", "-t"]),
    "[[": new Set(["-v", "-R", "-t"]),
    printf: new Set(["-v"]),
    read: new Set(["-a"]),
    unset: new Set(["-v"]),
    wait: new Set(["-p"]),
  },
  TEST_ARITH_CMP_OPS = new Set(["-eq", "-ne", "-lt", "-le", "-gt", "-ge"]),
  TEST_ARITH_NUMERIC_RE = /^-?(0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[0-9]+)$/,
  BARE_SUBSCRIPT_NAME_BUILTINS = new Set(["read", "unset"]),
  DECLARATION_KEYWORDS = new Set([
    "declare",
    "typeset",
    "local",
    "export",
    "readonly",
    "private",
    "float",
    "integer",
  ]),
  PRINT_PROMPT_FLAG = /^[+-][-+\w]*P/,
  DECLARATION_LIKE_BUILTINS = new Set([
    "declare",
    "typeset",
    "local",
    "export",
    "readonly",
    "print",
    "getopts",
    "set",
    "zparseopts",
    "zformat",
    "zstyle",
    ...ZSH_MODULE_NAME_WRITERS,
    "autoload",
    "shift",
    "exit",
    "return",
    "break",
    "continue",
    "bye",
    "logout",
    "vared",
    "private",
    "getln",
    "zregexparse",
    "float",
    "integer",
  ]),
  SET_O_SAFE_OPTS = new Set([
    "pipefail",
    "errexit",
    "nounset",
    "xtrace",
    "noglob",
    "noclobber",
    "verbose",
    "monitor",
    "notify",
    "vi",
    "emacs",
    "errtrace",
    "functrace",
    "hashall",
    "physical",
    "ignoreeof",
  ]),
  SET_O_SAFE_LETTERS = new Set(["e", "u", "x", "f", "C", "v", "m", "b", "E", "T", "h", "P", "n"]),
  EXEC_INFLUENCING_VARS = new Set([
    "path",
    "home",
    "dirstack",
    "tmpprefix",
    "bash_env",
    "env",
    "cdpath",
    "globignore",
    "shell",
    "fpath",
    "bash_loadables_path",
    "module_path",
    "manpath",
    "mailpath",
    "readnullcmd",
    "nullcmd",
    "histfile",
    "zdotdir",
    "functions",
    "commands",
    "aliases",
    "galiases",
    "saliases",
    "bash_cmds",
    "bash_aliases",
    "execignore",
    "bash_source_path",
    "lang",
    "language",
    "lc_all",
    "lc_ctype",
    "lc_collate",
    "lc_messages",
    "lc_numeric",
    "lc_time",
    "histchars",
    "textdomain",
    "textdomaindir",
  ]),
  INTEGER_ATTR_DEFAULT_VARS = new Set([
    "RANDOM",
    "SECONDS",
    "LINENO",
    "OPTIND",
    "MAILCHECK",
    "HISTCMD",
    "SRANDOM",
    "EPOCHSECONDS",
    "EPOCHREALTIME",
    "BASHPID",
    "BASH_MONOSECONDS",
    "BASH_TRAPSIG",
    "COLUMNS",
    "LINES",
    "SHLVL",
    "ERRNO",
    "TMOUT",
    "HISTSIZE",
    "SAVEHIST",
    "TRY_BLOCK_ERROR",
    "TRY_BLOCK_INTERRUPT",
    "KEYTIMEOUT",
    "LISTMAX",
    "LOGCHECK",
    "PERIOD",
    "FUNCNEST",
    "UID",
    "EUID",
    "GID",
    "EGID",
    "REPORTTIME",
    "REPORTMEMORY",
    "DIRSTACKSIZE",
    "BAUD",
    "ZLE_RPROMPT_INDENT",
    "MBEGIN",
    "MEND",
    "PPID",
    "ARGC",
    "ZSH_SUBSHELL",
    "TTYIDLE",
    "status",
  ]);
//@ chunk-r01896cg.js:89928-90092 layout
function isIntegerVarAssignUnsafe(e, t) {
  if (!INTEGER_ATTR_DEFAULT_VARS.has(e)) return !1;
  if (t.includes("[") || t.includes("`") || /\$\(/.test(t) || containsAnyPlaceholder(t)) return !0;
  if (!/^(0|[1-9][0-9]{0,17})$/.test(t)) return !0;
  return !1;
}
/**
 * 是否为影响命令查找/执行的变量（PATH、HOME、IFS 之外的 fpath/cdpath/LANG/LC_* 等，及 LD_*\/DYLD_*\/BASH_FUNC_* 前缀），大小写不敏感。
 */
//@ chunk-r01896cg.js:90092-90219 facade-majority
function isExecInfluencingVar(e) {
  let lower = e.toLowerCase();
  return (
    EXEC_INFLUENCING_VARS.has(lower) ||
    lower.startsWith("ld_") ||
    lower.startsWith("dyld_") ||
    lower.startsWith("bash_func_")
  );
}
/**
 * 受保护 shell 变量：执行影响变量、IFS、PS4、PROMPT4 或整数属性变量。ShellSnapshot 解析导出变量时也用它过滤。
 */
//@ chunk-r01896cg.js:90219-90297 facade-majority
function isAssignmentNameUnsafeForSandbox(e) {
  return (
    isExecInfluencingVar(e) ||
    e === "IFS" ||
    e === "PS4" ||
    e === "PROMPT4" ||
    INTEGER_ATTR_DEFAULT_VARS.has(e)
  );
}
/**
 * read 内建的选项表：带数据参数的选项、需再检查参数的选项、数值参数选项与数值正则；另有带下标变量名正则、组合短选项里吃参数的字母、/proc/*\/environ 正则和“换行后 #”正则。
 */
//@ chunk-r01896cg.js:90297-90558 facade-majority
var READ_DATA_FLAGS = new Set(["-p", "-d", "-n", "-N", "-t", "-u", "-i"]),
  READ_FLAGS_WITH_CHECKED_OPERAND = new Set(["-p", "-t", "-n"]),
  READ_NUMERIC_ARG_FLAGS = new Set(["-t", "-n", "-N"]),
  READ_NUMERIC_OPERAND_RE = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/,
  SUBSCRIPTED_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*\[/,
  OPTION_LETTERS_TAKING_ARGUMENT = new Set(["-f", "-C", "-x", "-X", "-u"]),
  PROC_ENVIRON_RE = /\/proc\/.*\/environ/,
  NEWLINE_HASH_RE = /\n\s*#/;
/**
 * 对 simple 结果做语义检查（2.1.88 checkSemantics 的扩展）：先剥去 time/nohup/timeout/nice/env/stdbuf/command/builtin/noglob/xargs 包装（参数不规范即拒绝），再检查命令名为空/占位符/片段、test -v 等下标求值、eval 类内建、zsh 危险内建、awk 危险程序、find -exec 类、shell 关键字作命令名、/proc/*\/environ、换行后 #（kind:'newline-hash'）等。返回 {ok:true} 或 {ok:false, reason, kind?}。
 */
//@ chunk-r01896cg.js:90558-103152 facade-majority = checkSemantics (0.488)
function checkSemantics(commands, options) {
  let r = options?.sourceGlobRecord !== !1,
    s = null;
  for (let cmd of commands) {
    let argv = cmd.argv,
      i = !1;
    for (;;) {
      let u = argv[0] === void 0 ? void 0 : rU(argv[0]),
        h =
          u === "time" ||
          u === "nohup" ||
          u === "timeout" ||
          u === "nice" ||
          u === "stdbuf" ||
          u === "env" ||
          u === "command" ||
          u === "xargs"
            ? u
            : argv[0];
      if (h === "time" || h === "nohup") {
        if (((argv = argv.slice(1)), argv[0] !== void 0 && !/^[\w./~+-]+$/.test(argv[0])))
          return { ok: !1, reason: `'${h} ${argv[0]}' can't be checked before it runs` };
      } else if (h === "timeout") {
        let d = 1;
        while (d < argv.length) {
          let m = argv[d];
          if (m === "--foreground" || m === "--preserve-status" || m === "--verbose") d++;
          else if (/^--(?:kill-after|signal)=[A-Za-z0-9_.+-]+$/.test(m)) d++;
          else if (
            (m === "--kill-after" || m === "--signal") &&
            argv[d + 1] &&
            /^[A-Za-z0-9_.+-]+$/.test(argv[d + 1])
          )
            d += 2;
          else if (m.startsWith("--"))
            return { ok: !1, reason: `'timeout ${m}' can't be checked before it runs` };
          else if (m === "-v") d++;
          else if ((m === "-k" || m === "-s") && argv[d + 1] && /^[A-Za-z0-9_.+-]+$/.test(argv[d + 1]))
            d += 2;
          else if (/^-[ks][A-Za-z0-9_.+-]+$/.test(m)) d++;
          else if (m.startsWith("-"))
            return { ok: !1, reason: `'timeout ${m}' can't be checked before it runs` };
          else break;
        }
        if (argv[d] && /^\d+(?:\.\d+)?[smhd]?$/.test(argv[d])) argv = argv.slice(d + 1);
        else if (argv[d])
          return { ok: !1, reason: `timeout duration '${argv[d]}' can't be checked before it runs` };
        else break;
      } else if (h === "nice")
        if (argv[1] === "-n" && argv[2] && /^-?\d+$/.test(argv[2])) argv = argv.slice(3);
        else if (argv[1] && /^-\d+$/.test(argv[1])) argv = argv.slice(2);
        else if (argv[1] && (/[$(`]/.test(argv[1]) || containsAnyPlaceholder(argv[1])))
          return {
            ok: !1,
            reason: `nice argument '${argv[1]}' contains expansion \u2014 cannot statically determine wrapped command`,
          };
        else argv = argv.slice(1);
      else if (h === "env") {
        let d = 1;
        while (d < argv.length) {
          let m = argv[d];
          if (m.includes("=") && !m.startsWith("-")) d++;
          else if (m === "-i" || m === "-0" || m === "-v") d++;
          else if (m === "-u" && argv[d + 1]) d += 2;
          else if (m.startsWith("-")) return { ok: !1, reason: `'env ${m}' can't be checked before it runs` };
          else break;
        }
        if (d < argv.length) argv = argv.slice(d);
        else break;
      } else if (h === "stdbuf") {
        let d = 1;
        while (d < argv.length) {
          let m = argv[d];
          if (STDBUF_SHORT_SEP_RE.test(m) && argv[d + 1]) d += 2;
          else if (STDBUF_SHORT_FUSED_RE.test(m)) d++;
          else if (STDBUF_LONG_RE.test(m)) d++;
          else if (m.startsWith("-"))
            return { ok: !1, reason: `'stdbuf ${m}' can't be checked before it runs` };
          else break;
        }
        if (d > 1 && d < argv.length) argv = argv.slice(d);
        else break;
      } else if (h === "command") {
        let d = 1,
          m = !1;
        while (d < argv.length && argv[d].startsWith("-") && argv[d] !== "--") {
          let p = argv[d];
          if (!/^-[pvV]+$/.test(p))
            return { ok: !1, reason: `'command ${p}' can't be checked before it runs` };
          if (p.includes("v") || p.includes("V")) m = !0;
          d++;
        }
        if (argv[d] === "--") d++;
        if (m || d >= argv.length) break;
        argv = argv.slice(d);
      } else if (argv[0] === "builtin" || argv[0] === "noglob") {
        let d = argv[0] === "builtin" && argv[1] === "--" ? 2 : 1;
        if (d < argv.length) argv = argv.slice(d);
        else break;
      } else if (h === "xargs")
        if (argv.length >= 2 && !argv[1].startsWith("-")) ((argv = argv.slice(1)), (i = !0));
        else break;
      else break;
    }
    let c = argv[0];
    if (c === void 0) continue;
    let l = rU(c);
    if (c === "")
      return { ok: !1, reason: "Empty command name \u2014 argv[0] may not reflect what bash runs" };
    if (containsAnyPlaceholder(c))
      return { ok: !1, reason: "Command name is runtime-determined (placeholder argv[0])" };
    if (c.startsWith("-") || c.startsWith("|") || c.startsWith("&"))
      return { ok: !1, reason: "Command appears to be an incomplete fragment" };
    let f = getOwn(SUBSCRIPT_EVAL_FLAGS, l),
      y = l === "test" || l === "[" || l === "[[";
    if (f !== void 0)
      for (let u = 1; u < argv.length; u++) {
        let h = argv[u],
          d = argv[u + 1];
        if (f.has(h) && d !== void 0 && (d.includes("[") || containsAnyPlaceholder(d)))
          return {
            ok: !1,
            reason: `'${l} ${h}' operand contains array subscript or runtime-determined value \u2014 bash evaluates $(cmd) in subscripts`,
          };
        if (y) {
          if (h === "-t" && d !== void 0 && !TEST_ARITH_NUMERIC_RE.test(d))
            return {
              ok: !1,
              reason: `'${l} -t' operand is non-numeric \u2014 zsh arith-evals identifiers (may run $(cmd))`,
            };
          continue;
        }
        if (h.length > 2 && h[0] === "-" && h[1] !== "-" && !h.includes("[")) {
          for (let flag of f)
            if (flag.length === 2 && h.includes(flag[1])) {
              let p = argv[u + 1];
              if (p !== void 0 && (p.includes("[") || containsAnyPlaceholder(p)))
                return {
                  ok: !1,
                  reason: `'${l} ${flag}' (combined in '${h}') operand contains array subscript \u2014 bash evaluates $(cmd) in subscripts`,
                };
            }
        }
        if (h.length > 2 && h[0] === "-" && l !== "read")
          for (let flag of f) {
            if (flag.length !== 2) continue;
            let index = h.indexOf(flag[1], 1);
            if (index === -1 || index === h.length - 1) continue;
            let sliced = h.slice(index + 1);
            if (/[A-Za-z_][A-Za-z0-9_]*\[/.test(sliced) || containsAnyPlaceholder(sliced))
              return {
                ok: !1,
                reason: `'${l} ${flag}' (fused in '${h}') operand contains array subscript \u2014 bash evaluates $(cmd) in subscripts`,
              };
          }
      }
    if (y)
      for (let u = 2; u < argv.length; u++) {
        if (!TEST_ARITH_CMP_OPS.has(argv[u])) continue;
        for (let h of [argv[u - 1], argv[u + 1]]) {
          if (h === void 0) continue;
          if (h.includes("[") || !TEST_ARITH_NUMERIC_RE.test(h))
            return {
              ok: !1,
              reason: `'${l} ... ${argv[u]} ...' operand is non-numeric \u2014 \`[[\` arithmetically evaluates identifiers/subscripts (may run $(cmd))`,
            };
        }
      }
    if (BARE_SUBSCRIPT_NAME_BUILTINS.has(l)) {
      let u = !1;
      for (let h = 1; h < argv.length; h++) {
        let d = argv[h];
        if (u !== !1) {
          let m = u;
          if (((u = !1), m === "numeric" && !READ_NUMERIC_OPERAND_RE.test(d)))
            return {
              ok: !1,
              reason: `'read ${argv[h - 1]}' operand '${d}' is non-numeric \u2014 zsh arith-evals subscripts/expressions (may run $(cmd))`,
            };
          if (
            m === "prompt" &&
            (SUBSCRIPTED_NAME_RE.test(d) ||
              (d[0] === "-" && /[A-Za-z_][A-Za-z0-9_]*\[/.test(d)) ||
              d.includes(CMDSUB_PLACEHOLDER))
          )
            return {
              ok: !1,
              reason: `'read ${argv[h - 1]}' operand '${d}' is a subscripted NAME, dash-prefixed with a subscript, or runtime-determined \u2014 zsh -p takes no operand; may arith-eval the subscript and run $(cmd)`,
            };
          continue;
        }
        if (d[0] === "-") {
          if (l === "read") {
            if (READ_NUMERIC_ARG_FLAGS.has(d)) u = "numeric";
            else if (d === "-p") u = "prompt";
            else if (READ_DATA_FLAGS.has(d)) u = "string";
            else if (d.length > 2)
              for (let m = 1; m < d.length; m++) {
                let p = "-" + d[m],
                  g = READ_NUMERIC_ARG_FLAGS.has(p);
                if (g || READ_DATA_FLAGS.has(p)) {
                  if (m === d.length - 1) u = g ? "numeric" : p === "-p" ? "prompt" : "string";
                  else if (g && !READ_NUMERIC_OPERAND_RE.test(d.slice(m + 1)))
                    return {
                      ok: !1,
                      reason: `'read ${p}' (fused in '${d}') operand is non-numeric \u2014 zsh arith-evals subscripts/expressions (may run $(cmd))`,
                    };
                  else if (p === "-p") {
                    let sliced = d.slice(m + 1);
                    if (/[A-Za-z_][A-Za-z0-9_]*\[/.test(sliced) || sliced.includes(CMDSUB_PLACEHOLDER))
                      return {
                        ok: !1,
                        reason: `'read -p' fused remainder '${sliced}' contains a subscripted identifier or cmdsub \u2014 on zsh (-p is no-arg) this may reach matheval via a following option and run $(cmd)`,
                      };
                  }
                  break;
                }
              }
          }
          continue;
        }
        if (d.includes("[") || containsAnyPlaceholder(d))
          return {
            ok: !1,
            reason: `'${l}' positional NAME '${d}' contains array subscript or runtime-determined value \u2014 bash evaluates $(cmd) in subscripts`,
          };
      }
    }
    if (DECLARATION_LIKE_BUILTINS.has(l)) {
      let u = l === "declare" || l === "typeset" || l === "local",
        h = u || l === "export" || l === "readonly",
        d = u || l === "readonly",
        m = !1,
        p = !1;
      for (let b = 1; b < argv.length; b++) {
        let k = argv[b];
        if (d) {
          if (/^[+-].*f/.test(k)) m = !0;
          if (/^[+-].*[uU]/.test(k)) p = !0;
          if (m && p)
            return {
              ok: !1,
              reason: `'${l}' with both -f and -u/-U flags (reached as plain command via wrapper/quote) \u2014 zsh marks a function for autoload (synonym of 'autoload')`,
            };
        }
        if (u && DECLARE_SEMANTIC_FLAG_RE.test(k))
          return {
            ok: !1,
            reason: `'${l}' with -n/-i/-a/-A/-E/-F/-L/-R/-Z/-l/-u flag (reached as plain command via wrapper/quote) changes assignment eval semantics`,
          };
        if (DECLARATION_KEYWORDS.has(l) && /^[+-].*[iluEFLRZ]/.test(k))
          return {
            ok: !1,
            reason: `'${l}' with -i/-E/-F/-L/-R/-Z/-l/-u flag (reached as plain command via wrapper/quote) \u2014 zsh bin_typeset mathevals, width-truncates, or case-converts the value`,
          };
        if ((h || l === "private") && /^[+-].*m/.test(k))
          return {
            ok: !1,
            reason: `'${l}' with -m/+m flag (reached as plain command via wrapper/quote) \u2014 zsh pattern-assigns every matching variable`,
          };
        if (DECLARATION_KEYWORDS.has(l) && /^[+-].*T/.test(k))
          return {
            ok: !1,
            reason: `'${l} -T' creates a user-defined zsh tied pair \u2014 tracked literals for its operands are unreliable`,
          };
        let A = k.includes("[") && /[$`]/.test(k);
        if (A || containsAnyPlaceholder(k))
          return {
            ok: !1,
            reason: A
              ? `'${l}' operand '${redactPlaceholdersForDisplay(k)}' contains array subscript with expansion \u2014 shell arith-evals $(cmd) in subscripts`
              : `'${l}' operand '${redactPlaceholdersForDisplay(k)}' is runtime-determined and may carry an array subscript \u2014 shell arith-evals $(cmd) in subscripts`,
          };
        if ((l === "float" || l === "integer") && !/^[+-]/.test(k))
          return {
            ok: !1,
            reason: `zsh '${l}' operand \u2014 implicit typeset -E/-i arithmetically evaluates the (existing or assigned) value`,
          };
      }
      let g = h && c === l ? checkDeclarationOptions(l, argv.slice(1)) : null;
      if (g !== null) return { ok: !1, reason: g };
      let _ =
        c === l && (options?.hasLoop !== !1 || cmd !== commands.at(-1))
          ? checkDeclarationContext(l, argv.slice(1))
          : null;
      if (_ !== null) return { ok: !1, reason: _ };
    }
    if (l === "printf")
      for (let u = 1; u < argv.length; u++) {
        let h = argv[u],
          d = h.includes("[") && /[$`]/.test(h);
        if (d || containsAnyPlaceholder(h))
          return {
            ok: !1,
            reason: d
              ? `printf operand '${redactPlaceholdersForDisplay(h)}' contains array subscript with expansion \u2014 zsh arith-evals %d/%i operands (may run $(cmd))`
              : `printf operand '${redactPlaceholdersForDisplay(h)}' is runtime-determined and may carry an array subscript \u2014 zsh arith-evals %d/%i operands (may run $(cmd))`,
          };
      }
    if (l === "set")
      for (let u = 1; u < argv.length; u++) {
        let h = argv[u];
        if (h === "--") break;
        if (!/^[-+]/.test(h)) continue;
        for (let d = 1; d < h.length; d++) {
          let m = h[d];
          if (m === "o") {
            let p = d < h.length - 1 ? h.slice(d + 1) : argv[u + 1];
            if (p !== void 0 && p !== "" && !SET_O_SAFE_OPTS.has(p.toLowerCase().replace(/[_-]/g, "")))
              return {
                ok: !1,
                reason: `'set -o/+o ${p}' changes shell parsing/globbing state \u2014 can enable globsubst/extendedglob and defeat static analysis`,
              };
            if (d === h.length - 1) u++;
            break;
          }
          if (m === "A") break;
          if (!SET_O_SAFE_LETTERS.has(m))
            return {
              ok: !1,
              reason: `'set ${h[0]}${m}' changes shell option state (allexport/keyword/\u2026) \u2014 defeats static env-var analysis; see SET_O_SAFE_LETTERS`,
            };
        }
      }
    if (l === "print" && argv.some((u) => PRINT_PROMPT_FLAG.test(u)))
      return { ok: !1, reason: "What 'print -P' expands can't be checked before it runs" };
    if (l === "jobs")
      for (let u = 1; u < argv.length; u++) {
        let h = argv[u];
        if (/^[+-].*x/.test(h))
          return { ok: !1, reason: "What 'jobs -x' starts can't be checked before it runs" };
      }
    if (SHELL_KEYWORDS.has(c))
      return { ok: !1, reason: `Shell keyword '${l}' as command name \u2014 tree-sitter mis-parse` };
    if (i) {
      if (l === "find" || l === "jq")
        return { ok: !1, reason: `What xargs adds to ${l} can't be checked before it runs` };
      if (AWK_NAMES.has(l)) {
        let u = !1;
        for (let h = 1; h < argv.length; h++) {
          let d = argv[h];
          if (d === "--") {
            u = h + 1 < argv.length;
            break;
          }
          if (d === "-" || !d.startsWith("-")) {
            u = !0;
            break;
          }
          if (!d.includes("=") && AWK_PROGRAM_FILE_OPT_RE.test(d)) h++;
        }
        if (!u) return { ok: !1, reason: `The program xargs gives ${l} can't be checked before it runs` };
      }
    }
    if (l === "jq") {
      for (let u of argv) {
        if (/\bsystem\s*\(/.test(u))
          return {
            ok: !1,
            reason: "jq command contains system() function which executes arbitrary commands",
          };
        if (/\b(?:include|import)\b/.test(u))
          return {
            ok: !1,
            reason:
              'jq command contains include/import \u2014 modules can load arbitrary .jq files via {search:"."} and call env or other builtins',
          };
      }
      if (
        argv.some((u) => /^(?:-[A-Za-z]*[fL]|--(?:from-file|rawfile|slurpfile|library-path)(?:$|=))/.test(u))
      )
        return {
          ok: !1,
          reason: "jq command contains dangerous flags that could execute code or read arbitrary files",
        };
    }
    if (AWK_NAMES.has(l)) {
      if (cmd.hasUnquotedGlob || (r && hasSourceUnquotedGlob(cmd)))
        return {
          ok: !1,
          reason:
            "awk command contains unquoted glob characters \u2014 could glob-expand to a planted program or flag before awk runs",
        };
      for (let arg of argv) {
        let h = awkProgramHasExecBridge(arg);
        if (h !== !1) return { ok: !1, reason: h };
        if (containsAnyPlaceholder(arg))
          return { ok: !1, reason: "awk is given text that can't be checked before it runs" };
      }
      if (
        argv.some((arg) => /^-[bcCghIkMnNOPrsStV]*[fEileDW]/.test(arg) || /^--(?:fil|e|i|lo|s|de)/.test(arg))
      )
        return { ok: !1, reason: "awk has an option that can't be checked before it runs" };
    }
    if (l === "find") {
      if (cmd.hasUnquotedGlob || (r && hasSourceUnquotedGlob(cmd)))
        return {
          ok: !1,
          reason:
            "find contains unquoted glob characters \u2014 could glob-expand to a dangerous action before find runs",
        };
      let u = !1;
      for (let h = 1; h < argv.length; h++) {
        let d = argv[h],
          m = u;
        if (((u = !1), isFindDangerousAction(d)))
          return {
            ok: !1,
            reason: `find with '${d}' executes commands or modifies files \u2014 cannot be auto-allowed by a Bash(find:*) prefix rule`,
          };
        if (isAmbiguousFindWord(d))
          return {
            ok: !1,
            reason: `find option '${d}' is read differently by different versions of find \u2014 could hide a following action`,
          };
        if (!m && findWordTakesFlagValue(d)) {
          u = !0;
          continue;
        }
        if (!m && findWordTakesOperand(d)) {
          h++;
          continue;
        }
        if (containsAnyPlaceholder(d))
          return {
            ok: !1,
            reason: "find argument is runtime-determined \u2014 could resolve to a dangerous action",
          };
        if (/[[\]*?]/.test(d))
          return {
            ok: !1,
            reason: `find argument '${d}' contains glob characters \u2014 could glob-expand to a dangerous action`,
          };
      }
    }
    if (isZshDangerousBuiltin(c)) return { ok: !1, reason: `Zsh builtin '${l}' can bypass security checks` };
    let x = zshStatWritesVarReason(c, argv.slice(1));
    if (x !== null) return { ok: !1, reason: x };
    if (EVAL_LIKE_BUILTINS.has(c))
      if (l === "fc" && !argv.slice(1).some((arg) => /^[+-].*[es]/.test(arg)));
      else if (l === "compgen" && !argv.slice(1).some((arg) => /^[+-].*[CFW]/.test(arg)));
      else return { ok: !1, reason: `'${l}' evaluates arguments as shell code` };
    if (UNHANDLED_EXEC_WRAPPERS.has(l) && argv.length > 1)
      return { ok: !1, reason: `What '${l}' starts can't be checked before it runs` };
    for (let arg of cmd.argv)
      if (arg.includes("/proc/") && PROC_ENVIRON_RE.test(arg))
        return { ok: !1, reason: "Accesses /proc/*/environ which may expose secrets" };
    for (let redirect of cmd.redirects)
      if (redirect.target.includes("/proc/") && PROC_ENVIRON_RE.test(redirect.target))
        return { ok: !1, reason: "Accesses /proc/*/environ which may expose secrets" };
    for (let u of cmd.argv)
      if (
        u.includes(`
`) &&
        NEWLINE_HASH_RE.test(u)
      )
        s ??= {
          ok: !1,
          kind: "newline-hash",
          reason: "Newline followed by # inside a quoted argument can hide arguments from path validation",
        };
    for (let envVar of cmd.envVars)
      if (
        envVar.value.includes(`
`) &&
        NEWLINE_HASH_RE.test(envVar.value)
      )
        s ??= {
          ok: !1,
          kind: "newline-hash",
          reason: "Newline followed by # inside an env var value can hide arguments from path validation",
        };
    for (let redirect of cmd.redirects)
      if (
        redirect.target.includes(`
`) &&
        NEWLINE_HASH_RE.test(redirect.target)
      )
        s ??= {
          ok: !1,
          kind: "newline-hash",
          reason: "Newline followed by # inside a redirect target can hide arguments from path validation",
        };
  }
  if (s) return s;
  return { ok: !0 };
}
/**
 * 快速判断命令是否含 zsh 危险命令：能安全解析时用 AST argv，否则用 splitCommand + tryParseShellCommand 回退，逐条交给 validateZshDangerousCommands。
 */
//@ chunk-e6aww6q8.js:1144304-1144468 fingerprint = parseForSecurity (0.861)
function hasZshDangerousCommand(cmd) {
  let n = cmd.length > SPLIT_MAX_LEN ? null : getParserModule()?.parse(cmd),
    r = n ? parseForSecurityFromAst(cmd, n) : void 0;
  return (
    r?.kind === "simple" ? r.commands.map((command) => command.argv) : splitCommand(cmd).map(getCommandArgv)
  ).some((h) => isXargsToSafeFilter(stripCommandBuiltinPrefixes(h)));
}
//@ chunk-e6aww6q8.js:1151910-1151949 fingerprint = walkHerestringRedirect (1)
var INPUT_REDIRECT_OPS = new Set(["<", "<<", "<<<", "<&"]);
/**
 * 结构性节点类型集合：program、list、pipeline、redirected_statement，遍历时只下钻不当作命令。
 */
//@ chunk-e6aww6q8.js:1155651-1155721 fingerprint = STRUCTURAL_TYPES (1)
var STRUCTURAL_TYPES_2 = new Set(["program", "list", "pipeline", "redirected_statement"]);
/**
 * 重定向相关的操作符与节点类型集合（< > >> << <<- <<< <& >& &> &>> >| 以及 file_descriptor、heredoc_*），判断重定向子节点是否只含这些记号。
 */
//@ chunk-38axkkfw.js:4923-5089 fingerprint = walkHeredocRedirect (0.627)
var REDIRECT_OPERATOR_TOKENS = new Set([
  "<",
  ">",
  ">>",
  "<<",
  "<<-",
  "<<<",
  "<&",
  ">&",
  "&>",
  "&>>",
  ">|",
  ">&-",
  "<&-",
  "file_descriptor",
  "heredoc_start",
  "heredoc_body",
  "heredoc_content",
  "heredoc_end",
]);
//@ chunk-jxcqr1hv.js:657-705 fingerprint = BARE_SUBSCRIPT_NAME_BUILTINS (0.702)
function BARE_SUBSCRIPT_NAME_BUILTINS_2(e) {
  return unattendedServingConsentView() !== "unset" || unattendedServingConsentMayHoldYes() || e;
}

export {
  containsAnyPlaceholder,
  startsWithAnyPlaceholder,
  BACKSLASH_ESCAPED_SPACE_RE,
  CONTROL_CHAR_RE,
  LONE_SURROGATE_RE,
  BACKSLASH_LINE_CONTINUATION_RE,
  ZSH_TILDE_BRACKET_RE,
  ZSH_EQUALS_EXPANSION_RE,
  ZSH_NUMERIC_GLOB_RE,
  scanSameLineStatementSplits,
  stripQuotedRegions,
  REDIRECT_OPERATOR_TOKENS,
  WORD_LEAF_EXPANSION_RE,
  WORD_LEAF_QUOTE_RE,
  SHELL_PROGRAM_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
  AWK_NAMES,
  SET_O_SAFE_OPTS,
  INTEGER_ATTR_DEFAULT_VARS,
  UNHANDLED_EXEC_WRAPPERS,
  ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE,
  containsStandaloneCondCloser,
  BASH_IMPLICITLY_REBOUND_VARS,
  isAssignmentNameUnsafeForSandbox,
  isExecInfluencingVar,
  TEST_ARITH_CMP_OPS,
  EVAL_LIKE_BUILTINS,
  POSIX_SHELL_NAMES,
  parseForSecurityFromAst,
  POSIX_SPECIAL_BUILTINS_NONEVAL,
  APPLET_SHELL_NAMES,
  SET_O_SAFE_LETTERS,
  READ_DATA_FLAGS,
  READ_NUMERIC_ARG_FLAGS,
  READ_NUMERIC_OPERAND_RE,
  awkProgramHasExecBridge,
  redactPlaceholdersForDisplay,
  deletePlaceholders,
  _vn,
  CMDSUB_PLACEHOLDER,
  hasZshDangerousCommand,
  isSandboxAutoAllowUnsafeBase,
  isFindDangerousAction,
  isAmbiguousFindWord,
  findWordTakesOperand,
  findWordTakesFlagValue,
  PRINT_PROMPT_FLAG,
  DECLARATION_LIKE_BUILTINS,
  parseForSecurity,
  declarationPrefixReadings,
  checkSemantics,
  nodeTypeId,
  runWithRefusalTracking,
  BARE_SUBSCRIPT_NAME_BUILTINS_2,
  containsRuntimePlaceholder,
  INPUT_REDIRECT_OPS,
  TEST_ARITH_NUMERIC_RE,
  hasSourceUnquotedGlob,
  STRUCTURAL_TYPES_2,
  UNICODE_WHITESPACE_RE,
  stripLiteralQuotedRegions,
  ZSH_DANGEROUS_BUILTINS,
  liveBracedExpansionBodies,
  SUBSCRIPT_EVAL_FLAGS,
  BARE_SUBSCRIPT_NAME_BUILTINS,
  ZSH_MODULE_NAME_WRITERS,
};
