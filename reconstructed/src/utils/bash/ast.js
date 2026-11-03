/**
 * utils/bash/ast.ts
 *
 * Bash 命令安全分析：把解析树遍历成 SimpleCommand 列表（argv/envVars/redirects），跟踪变量值，遇到无法静态确定的 shell 特性返回 too-complex，并做语义检查（checkSemantics）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/bash/ast.ts
 * pieces: chunk-38axkkfw.js (1), chunk-e6aww6q8.js (6), chunk-jxcqr1hv.js (1), chunk-r01896cg.js (139)
 * attribution: fingerprint 21, placement 15, facade-majority 35, layout 63, file-local 3, callgraph-fingerprint 1, sole-consumer 8, callgraph-witnessed 1
 */
import { AsyncLocalStorage } from "async_hooks";
import { isDeepStrictEqual } from "util";
import { homedir } from "os";
import {
  parseCommandRaw,
  PARSE_ABORTED,
  isSetFlagWithA,
  hasAnyShortFlagChar,
  stripPathAndExe,
} from "./parser.js";
import {
  isSnappyTowerEnabled,
  isVastPuddleEnabled,
  isBashReadingMode,
  isNestedRippleEnabled,
  isRuleOffOrBashReading,
  recordReadingRefusal,
  isStagedPumpkinEnabled,
  isRmModifierAllowed,
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
/**
 * 记录是否发生拒绝的 AsyncLocalStorage。
 */
var refusalTrackingStorage = new AsyncLocalStorage();
//@ chunk-r01896cg.js:3060-3165 placement
/**
 * 在拒绝跟踪上下文中运行函数，返回结果与是否发生拒绝。
 */
async function runWithRefusalTracking(accepted, t) {
  let r = {
    accepted,
    refused: false,
  };
  return {
    result: await refusalTrackingStorage.run(r, t),
    refused: r.refused,
  };
}
//@ chunk-r01896cg.js:3165-3255 placement
/**
 * 标记本次分析发生拒绝，并返回是否为首次。
 */
function noteRefusal() {
  let e = refusalTrackingStorage.getStore();
  if (e === undefined) return true;
  e.refused = true;
  return !e.accepted;
}
//@ chunk-r01896cg.js:3255-3655 facade-majority = VAR_PLACEHOLDER (0.159)
var STRUCTURAL_TYPES = new Set(["program", "list", "pipeline", "redirected_statement"]);
var SEPARATOR_TYPES = new Set([
  "&&",
  "||",
  "|",
  ";",
  "&",
  "|&",
  `
`,
]);
var REDIRECTABLE_COMMAND_TYPES = new Set([
  "command",
  "pipeline",
  "list",
  "negated_command",
  "declaration_command",
  "unset_command",
]);
var TRAILING_OK_TYPES = new Set(["test_command", "redirected_statement"]);
var CMDSUB_PLACEHOLDER = "__CMDSUB_OUTPUT__";
var VAR_PLACEHOLDER = "__TRACKED_VAR__";
var REDIRECT_NODE_TYPES = new Set(["file_redirect", "herestring_redirect", "heredoc_redirect"]);
var UNCERTAIN_VAR_PLACEHOLDER = "__UNCERTAIN_VAR__";
//@ chunk-r01896cg.js:3655-3722 facade-majority
/**
 * 值中是否含任一占位符（CMDSUB / TRACKED_VAR / UNCERTAIN_VAR）。
 */
function containsAnyPlaceholder(value) {
  return (
    value.includes(CMDSUB_PLACEHOLDER) ||
    value.includes(VAR_PLACEHOLDER) ||
    value.includes(UNCERTAIN_VAR_PLACEHOLDER)
  );
}
//@ chunk-r01896cg.js:3722-3799 facade-majority
/**
 * 把占位符换成 $(…) / ${…}，用于给用户看的理由文本。
 */
function redactPlaceholdersForDisplay(e) {
  return e.replaceAll(CMDSUB_PLACEHOLDER, "$(\u2026)").replaceAll(VAR_PLACEHOLDER, "${\u2026}");
}
//@ chunk-r01896cg.js:3799-3859 facade-majority
function deletePlaceholders(e) {
  return e.replaceAll(CMDSUB_PLACEHOLDER, "").replaceAll(VAR_PLACEHOLDER, "");
}
//@ chunk-r01896cg.js:3859-3888 layout
var substitutionCount = 0;
var catHeredocInlineCount = 0;
var quoteScanCarveOutCount = 0;
var QUOTE_OR_BACKSLASH_RE = /["`\\]/;
//@ chunk-r01896cg.js:3888-3930 layout
function isPrecededByNewline(e, t) {
  return (
    t > 0 &&
    e[t - 1] ===
      `
`
  );
}
//@ chunk-r01896cg.js:3930-4079 facade-majority
/**
 * 文本中是否含运行时才确定的占位符：变量或不确定变量占位，或不在行首的命令替换输出占位。
 */
function containsRuntimePlaceholder(e) {
  if (e.includes(VAR_PLACEHOLDER) || e.includes(UNCERTAIN_VAR_PLACEHOLDER)) return true;
  let index = e.indexOf(CMDSUB_PLACEHOLDER);
  while (index !== -1) {
    if (!isPrecededByNewline(e, index)) return true;
    index = e.indexOf(CMDSUB_PLACEHOLDER, index + CMDSUB_PLACEHOLDER.length);
  }
  return false;
}
//@ chunk-r01896cg.js:4079-4153 facade-majority
/**
 * 文本是否以任一占位符（命令替换输出、变量、不确定变量）开头。
 */
function startsWithAnyPlaceholder(argValue) {
  return (
    argValue.startsWith(CMDSUB_PLACEHOLDER) ||
    argValue.startsWith(VAR_PLACEHOLDER) ||
    argValue.startsWith(UNCERTAIN_VAR_PLACEHOLDER)
  );
}
//@ chunk-r01896cg.js:4153-4961 fingerprint = SAFE_ENV_VARS (0.606)
var BARE_VAR_UNSAFE_RE = /[ \t\n*?[]/;
var STDBUF_SHORT_SEP_RE = /^-[ioe]$/;
var STDBUF_SHORT_FUSED_RE = /^-[ioe]./;
var STDBUF_LONG_RE = /^--(input|output|error)=/;
var BASH_READONLY_SPECIAL_VARS = new Set([
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
]);
var SAFE_ENV_VARS = new Set([
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
]);
var SPECIAL_VAR_NAMES = new Set(["?", "$", "!", "#", "0", "-"]);
var DANGEROUS_NODE_TYPES = new Set([
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
]);
var DANGEROUS_TYPE_IDS = [...DANGEROUS_NODE_TYPES];
//@ chunk-r01896cg.js:4961-5054 facade-majority = nodeTypeId (1)
/**
 * 把节点类型映射为数字 id（未定义 -2、ERROR -1、DANGEROUS_TYPE_IDS 下标+1、其他 0），用于 tengu_bash_ast_too_complex 遥测。
 */
function nodeTypeId(nodeType) {
  if (!nodeType) return -2;
  if (nodeType === "ERROR") return -1;
  let i = DANGEROUS_TYPE_IDS.indexOf(nodeType);
  return i >= 0 ? i + 1 : 0;
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
};
var BRACE_EXPANSION_RE = /\{[^\s]*(,|\.\.)[^\s]*\}/;
var BRACE_ESCAPED_CLOSE_RE = /\{[^{]*\\}/;
var BRACE_ESCAPED_OPEN_RE = /\{[^}]*\\\{/;
var CONTROL_CHAR_RE = /[\x00-\x08\x0B-\x1F\x7F]/;
var LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;
var UNICODE_WHITESPACE_RE = /[\u00A0\u1680\u2000-\u200B\u2028\u2029\u202F\u205F\u3000\uFEFF]/;
var BACKSLASH_ESCAPED_SPACE_RE = /\\[ \t]/;
var BACKSLASH_LINE_CONTINUATION_RE = /(?:^|[^ \t\\])(?:\\\\)*\\\n|[ \t](?:\\\\)+\\\n/;
var BACKSLASH_WHITESPACE_RE = new RegExp(
  `${BACKSLASH_ESCAPED_SPACE_RE.source}|${BACKSLASH_LINE_CONTINUATION_RE.source}`,
);
var WORD_LEAF_EXPANSION_RE = /(?:^|[^\\])(?:\\\\)*(?:[`$]|[<>=]\()/;
var WORD_LEAF_QUOTE_RE = /(?:^|[^\\])(?:\\\\)*['"]/;
var ZSH_TILDE_BRACKET_RE = /~\[/;
var ZSH_EQUALS_EXPANSION_RE = /(?:^|[\s;&|])=[a-zA-Z_]/;
var ZSH_NUMERIC_GLOB_RE = /<\d*-\d*>/;
var BRACE_WITH_QUOTE_RE = /\{[^}]*['"]/;
//@ chunk-r01896cg.js:5653-6301 layout
/**
 * 简易扫描：命令文本在未加引号处（跳过单/双引号、反引号、注释）出现 * ? [ 即为真。写入 SimpleCommand.hasUnquotedGlob。
 */
function hasUnquotedGlob(text) {
  let t = false;
  let r = false;
  let s = false;
  let o = true;
  let n = 0;
  while (n < text.length) {
    let i = text[n];
    if (s) {
      if (i === "\\" && (text[n + 1] === "`" || text[n + 1] === "\\" || text[n + 1] === "$")) n += 2;
      else {
        if (i === "`") s = false;
        n++;
      }
    } else if (t) {
      if (i === "'") t = false;
      n++;
    } else if (r) {
      if (i === "\\" && (text[n + 1] === '"' || text[n + 1] === "\\" || text[n + 1] === "`")) n += 2;
      else if (i === "`") {
        s = true;
        n++;
      } else {
        if (i === '"') r = false;
        n++;
      }
    } else if (i === "\\" && n + 1 < text.length) {
      if (
        text[n + 1] !==
        `
`
      )
        o = false;
      n += 2;
    } else if (i === "#" && o) {
      while (
        n < text.length &&
        text[n] !==
          `
`
      )
        n++;
      o = true;
    } else if (i === "`") {
      s = true;
      o = false;
      n++;
    } else {
      if (i === "*" || i === "?" || i === "[") return true;
      if (i === "'") t = true;
      else if (i === '"') r = true;
      o =
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
        i === ">";
      n++;
    }
  }
  return false;
}
//@ chunk-r01896cg.js:6301-6326 layout
var GLOB_PATTERN_RE = /[*?]|\[[^\]]*\]/;
//@ chunk-r01896cg.js:6326-6359 layout
function looksLikeGlob(e) {
  return GLOB_PATTERN_RE.test(e);
}
//@ chunk-r01896cg.js:6359-6680 facade-majority
/**
 * 判断命令 argv 或非 heredoc 重定向目标中是否有会被 shell 通配展开的模式（结合 argvUnquotedGlob 与占位符）。
 */
function hasSourceUnquotedGlob(command) {
  let argvUnquotedGlob = command.argvUnquotedGlob;
  if (
    command.carveOutMayDesyncQuoteScan === true ||
    (argvUnquotedGlob === undefined && command.argv.some(containsAnyPlaceholder))
  )
    return (
      command.argv.some(looksLikeGlob) ||
      command.redirects.some(
        (redirect) => redirect.op !== "<<" && redirect.op !== "<<<" && looksLikeGlob(redirect.target),
      )
    );
  if (argvUnquotedGlob === undefined) return false;
  if (argvUnquotedGlob.length !== command.argv.length) return command.argv.some(looksLikeGlob);
  return command.argv.some(
    (arg, o) => looksLikeGlob(arg) && (argvUnquotedGlob[o] === true || containsAnyPlaceholder(arg)),
  );
}
//@ chunk-r01896cg.js:6680-7494 file-local
/**
 * 把单/双引号与反引号内的 { 替换为空格，用于 BRACE_WITH_QUOTE_RE 预检，避免把引号里的花括号当成展开混淆。
 */
function maskBracesInQuotedContexts(cmd) {
  if (!cmd.includes("{")) return cmd;
  let out = [];
  let r = false;
  let s = false;
  let o = false;
  let n = true;
  let i = 0;
  while (i < cmd.length) {
    let c = cmd[i];
    if (o) {
      if (c === "\\" && (cmd[i + 1] === "`" || cmd[i + 1] === "\\" || cmd[i + 1] === "$")) {
        out.push(c, cmd[i + 1]);
        i += 2;
      } else {
        if (c === "`") o = false;
        out.push(c === "{" ? " " : c);
        i++;
      }
    } else if (r) {
      if (c === "'") r = false;
      out.push(c === "{" ? " " : c);
      i++;
    } else if (s) {
      if (c === "\\" && (cmd[i + 1] === '"' || cmd[i + 1] === "\\" || cmd[i + 1] === "`")) {
        out.push(c, cmd[i + 1]);
        i += 2;
      } else if (c === "`") {
        o = true;
        out.push(c);
        i++;
      } else {
        if (c === '"') s = false;
        out.push(c === "{" ? " " : c);
        i++;
      }
    } else if (c === "\\" && i + 1 < cmd.length) {
      out.push(c, cmd[i + 1]);
      if (
        cmd[i + 1] !==
        `
`
      )
        n = false;
      i += 2;
    } else if (c === "#" && n) {
      while (
        i < cmd.length &&
        cmd[i] !==
          `
`
      ) {
        out.push(cmd[i]);
        i++;
      }
      n = true;
    } else if (c === "`") {
      o = true;
      n = false;
      out.push(c);
      i++;
    } else {
      if (c === "'") r = true;
      else if (c === '"') s = true;
      n =
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
        c === ">";
      out.push(c);
      i++;
    }
  }
  return out.join("");
}
//@ chunk-r01896cg.js:7494-7525 callgraph-fingerprint = DOLLAR (1)
var DOLLAR = String.fromCharCode(36);
//@ chunk-r01896cg.js:7525-7621 file-local
function collectCommandSubstitution(e, t) {
  if (e.type === t) return true;
  for (let child of e.children) if (child && collectCommandSubstitution(child, t)) return true;
  return false;
}
//@ chunk-r01896cg.js:7621-7947 facade-majority
/**
 * 安全解析入口（2.1.88 parseForSecurity 的 316 版）：空串/解析失败返回空 simple；否则调用 parseForSecurityFromAstWithLoopCheck，simple 结果附带 tree。选项 readsDivergentShapes 用于按“分歧形态”重读。被 Shell.exec 的 worktree 守卫、命令文本日志与 shell -c 递归检查使用。
 */
async function parseForSecurity(command, { readsDivergentShapes = false } = {}) {
  if (command === "")
    return {
      kind: "simple",
      commands: [],
      bareAssignmentNames: [],
    };
  let root = await parseCommandRaw(command);
  if (root === null)
    return {
      kind: "simple",
      commands: [],
      bareAssignmentNames: [],
    };
  let result = parseForSecurityFromAst(command, root, {
    readsDivergentShapes,
  });
  if (root !== PARSE_ABORTED && (result.kind === "simple" || result.nodeType !== undefined))
    return {
      ...result,
      tree: root,
    };
  return result;
}
//@ chunk-r01896cg.js:7947-8297 facade-majority
/**
 * 为 n 个声明前缀生成“bash 是否保留赋值”的若干种布尔组合：n≤3 全枚举（exhaustive），否则取全假/全真/单个为真，并补上当前组合。供 shell -c 递归检查逐种读法判定。
 */
function declarationPrefixReadings(count, currentReading) {
  let r = (o) =>
    Array.from(
      {
        length: count,
      },
      (n, i) => o(i),
    );
  if (count <= 3)
    return {
      readings: Array.from(
        {
          length: 2 ** count,
        },
        (o, n) => r((i) => Math.floor(n / 2 ** i) % 2 === 1),
      ),
      exhaustive: true,
    };
  let s = [r(() => false), r(() => true)];
  for (let i = 0; count <= 8 && i < count; i++) s.push(r((n) => n === i));
  if (currentReading?.length === count && !s.some((o) => o.every((n, i) => n === currentReading[i])))
    s.push([...currentReading]);
  return {
    readings: s,
    exhaustive: false,
  };
}
//@ chunk-r01896cg.js:8297-8451 facade-majority
/**
 * parseForSecurityFromAst 的包装：先以 first 轮运行；若结果 simple 且含循环、且 GrowthBook tengu_snappy_tower 打开，再以 later 轮（循环体按迭代后状态重走）运行，两次结果不深度相等时加 laterLoopPassesDiffer。BashTool 权限检查的主要调用点。
 */
function parseForSecurityFromAst(command, root, options = {}) {
  let firstPass = parseForSecurityFromAst_2(command, root, options, "first");
  return firstPass.kind === "simple" &&
    firstPass.hasLoop === true &&
    isSnappyTowerEnabled() &&
    !isDeepStrictEqual(firstPass, parseForSecurityFromAst_2(command, root, options, "later"))
    ? {
        ...firstPass,
        laterLoopPassesDiffer: true,
      }
    : firstPass;
}
//@ chunk-r01896cg.js:8451-11790 fingerprint = parseForSecurityFromAst (0.455)
/**
 * Bash 安全分析核心：先做字节级预检（孤立代理项、控制字符、Unicode 空白、反斜杠空白、zsh ~[ / =cmd / <N-M>、花括号内引号），再查解析中止、反引号扫描异常、顶层语句之间/末尾是否有解析器跳过的字节、fd 变量重定向、重定向形状、结构性解析错误；然后保存/重置模块级分析状态，调用 walkProgram 收集 SimpleCommand。返回 {kind:'simple', commands, bareAssignmentNames, hasLoop, …} 或 {kind:'too-complex', reason, nodeType?, differential?, divergentShape?, keepsRemovalVerdict?}；可附 usesAssignedValue、uncertainWrite、declarationPrefixes。
 */
function parseForSecurityFromAst_2(
  command,
  root,
  { plainUnquotedHeredocs = false, declarationPrefix, readsDivergentShapes = false },
  pass,
) {
  if (LONE_SURROGATE_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains lone surrogate",
      differential: true,
    };
  if (CONTROL_CHAR_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains control characters",
      differential: true,
    };
  if (UNICODE_WHITESPACE_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains Unicode whitespace",
      differential: true,
    };
  if (BACKSLASH_WHITESPACE_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains backslash-escaped whitespace",
      differential: true,
    };
  if (ZSH_TILDE_BRACKET_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains zsh ~[ dynamic directory syntax",
      differential: true,
    };
  if (ZSH_EQUALS_EXPANSION_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains zsh =cmd equals expansion",
      differential: true,
    };
  if (ZSH_NUMERIC_GLOB_RE.test(command))
    return {
      kind: "too-complex",
      reason: "Contains zsh <N-M> numeric-range glob",
      differential: true,
    };
  if (BRACE_WITH_QUOTE_RE.test(maskBracesInQuotedContexts(command)))
    return {
      kind: "too-complex",
      reason: "Contains brace with quote character (expansion obfuscation)",
      differential: true,
    };
  if (command.trim() === "")
    return {
      kind: "simple",
      commands: [],
      bareAssignmentNames: [],
    };
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
        differential: true,
      };
  let buffer = Buffer.from(command, "utf8");
  {
    let zshDifferentialSyntax = findZshDifferentialSyntax(root, buffer, 0);
    if (zshDifferentialSyntax) return zshDifferentialSyntax;
  }
  {
    let E = checkDeclarationOperands(root);
    if (E) return E;
  }
  let l = (E) => E === 32 || E === 9 || E === 10 || E === 13 || E === 59 || E === 38;
  let f = (coveredEnd, K) => {
    let B = coveredEnd;
    while (B < K) {
      let et = buffer[B];
      if (l(et)) B++;
      else if (et === 92 && (buffer[B + 1] === 10 || (buffer[B + 1] === 13 && buffer[B + 2] === 10)))
        B += buffer[B + 1] === 13 ? 3 : 2;
      else break;
    }
    return B;
  };
  let sorted = root.children
    .filter((child) => child !== null)
    .map((child) => [child.startIndex, child.endIndex])
    .sort((E, K) => E[0] - K[0]);
  let coveredEnd = 0;
  for (let [E, K] of sorted) {
    if (f(coveredEnd, E) < E)
      return {
        kind: "too-complex",
        reason: "Parser skipped input between top-level statements",
      };
    if (K > coveredEnd) coveredEnd = K;
  }
  if (f(coveredEnd, buffer.length) < buffer.length)
    return {
      kind: "too-complex",
      reason: "Parser did not consume trailing input",
    };
  {
    let fdVariableRedirect = findFdVariableRedirect(root, buffer);
    if (fdVariableRedirect !== null)
      return {
        kind: "too-complex",
        reason: `Redirect uses ${describeFdVariable(fdVariableRedirect)} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
  }
  {
    let redirectShapeError = findRedirectShapeError(root);
    if (redirectShapeError) return redirectShapeError;
  }
  let divergentShapeError = readsDivergentShapes ? null : findStructuralParseError(root);
  if (divergentShapeError !== null)
    return {
      kind: "too-complex",
      reason: divergentShapeError,
      nodeType: "ERROR",
      differential: true,
      divergentShape: true,
    };
  let h = allowPlainUnquotedHeredocs;
  let d = readingDivergentShapes;
  let m = sawUncertainWrite;
  let p = reExpansionBudget;
  let g = currentDeclarationPrefix;
  let _ = declarationPrefixCount;
  let b = declarationPrefixValues;
  let k = prefixAssignInBranch;
  let A = unsetNames;
  let R = declarationPrefixBashKeeps;
  let T = usedAssignedValue;
  usedAssignedValue = false;
  let v = isLaterLoopPass;
  let de = currentLoopNode;
  let tn = loopDepth;
  isLaterLoopPass = pass === "later";
  currentLoopNode = null;
  loopDepth = 0;
  allowPlainUnquotedHeredocs = plainUnquotedHeredocs;
  readingDivergentShapes = readsDivergentShapes;
  sawUncertainWrite = false;
  reExpansionBudget = command.length * RE_EXPANSION_FACTOR;
  currentDeclarationPrefix = declarationPrefix;
  declarationPrefixCount = 0;
  declarationPrefixValues = new Map();
  prefixAssignInBranch = false;
  unsetNames = new Set();
  declarationPrefixBashKeeps = undefined;
  let result;
  try {
    result = walkProgram(root);
    if (usedAssignedValue && result.kind === "simple")
      result = {
        ...result,
        usesAssignedValue: true,
      };
    if (prefixAssignInBranch && result.kind === "simple")
      result = {
        kind: "too-complex",
        reason:
          "A variable set in front of a declaration inside a branch or loop can't be checked before it runs",
      };
    let declarationPrefixBashKeeps = getDeclarationPrefixBashKeeps();
    if (declarationPrefix === undefined && declarationPrefixBashKeeps !== undefined)
      result = {
        ...result,
        declarationPrefixes: declarationPrefixBashKeeps.length,
        declarationPrefixBashKeeps,
      };
    if (
      declarationPrefix !== undefined &&
      result.kind === "simple" &&
      getDeclarationPrefixCount() !== declarationPrefix.length
    )
      result = {
        kind: "too-complex",
        reason: "The variables set in front of declarations in this command can't be checked before it runs",
      };
    if (sawUncertainWrite)
      result = {
        ...result,
        uncertainWrite: true,
      };
  } finally {
    allowPlainUnquotedHeredocs = h;
    readingDivergentShapes = d;
    sawUncertainWrite = m;
    reExpansionBudget = p;
    currentDeclarationPrefix = g;
    declarationPrefixCount = _;
    declarationPrefixValues = b;
    prefixAssignInBranch = k;
    unsetNames = A;
    declarationPrefixBashKeeps = R;
    usedAssignedValue = T;
    isLaterLoopPass = v;
    currentLoopNode = de;
    loopDepth = tn;
  }
  if (
    result.kind === "too-complex" &&
    result.nodeType !== "ERROR" &&
    (hasDollarNonAsciiError(root) || hasZshLengthOfNonAsciiSubscript(root))
  )
    return {
      ...result,
      nodeType: "ERROR",
    };
  return result;
}
//@ chunk-r01896cg.js:11790-12124 layout
/**
 * 找结构性解析错误：空的非 heredoc 节点返回 Parse error；[ 紧贴后续单词时返回理由。
 */
function findStructuralParseError(node) {
  if (node.children.length === 0)
    return node.startIndex === node.endIndex && !node.type.startsWith("heredoc_") ? "Parse error" : null;
  for (let child of node.children) {
    let r = child === null ? null : findStructuralParseError(child);
    if (r !== null) return r;
  }
  return node.type === "test_command" && node.children[0]?.type === "[" && !/^\[[ \t]/.test(node.text)
    ? "[ glued to the next word names another command"
    : null;
}
//@ chunk-r01896cg.js:12124-12261 layout = nodeTypeId (1)
function hasDollarNonAsciiError(nodeType) {
  if (nodeType.type === "ERROR" && (nodeType.text.startsWith("${") || isDollarNonAsciiName(nodeType.text)))
    return true;
  for (let child of nodeType.children) if (child && hasDollarNonAsciiError(child)) return true;
  return false;
}
//@ chunk-r01896cg.js:12261-12680 layout
function hasZshLengthOfNonAsciiSubscript(e) {
  let children = e.children;
  for (let k = 0; k < children.length; k++) {
    let s = children[k];
    if (!s) continue;
    if (
      s.type === "simple_expansion" &&
      s.children.some((child) => child?.type === "special_variable_name" && child.text === "#")
    ) {
      let o = "";
      for (let k_2 = k + 1; k_2 < children.length; k_2++) {
        let text = children[k_2]?.text ?? "";
        o += text;
        if (!/^[\w\u0080-\uffff]*$/.test(text)) break;
      }
      let match = /^[\w\u0080-\uffff]*(?=\[|:[a-zA-Z&])/.exec(o);
      if (match && /[\u0080-\uffff]/.test(match[0])) return true;
    }
    if (hasZshLengthOfNonAsciiSubscript(s)) return true;
  }
  return false;
}
//@ chunk-r01896cg.js:12680-12769 layout
function isDollarNonAsciiName(text) {
  return /^\$[#^=~+]*[\w\u0080-\uffff]+$/.test(text) && /[\u0080-\uffff]/.test(text);
}
//@ chunk-r01896cg.js:12769-14269 layout
/**
 * 递归查找 bash 与 zsh 解读不同的语法（注释紧贴括号、case 模式组内注释、无 () 的 function 括号体、关键字紧贴括号），命中时返回 too-complex（differential）。
 */
function findZshDifferentialSyntax(node, bytes, baseOffset) {
  for (let child of node.children) {
    if (!child) continue;
    let o = child.startIndex - 1 - baseOffset;
    if (child.type === "comment" && o >= 0 && (bytes[o] === 41 || bytes[o] === 40))
      return {
        kind: "too-complex",
        reason:
          "comment glued to a paren \u2014 bash reads `)#\u2026` and `(#\u2026` as a comment, but zsh reads a keyword- or word-glued `(\u2026)` as a glob group whose `#\u2026` text is word content that executes",
        differential: true,
      };
    let zshDifferentialSyntax = findZshDifferentialSyntax(child, bytes, baseOffset);
    if (zshDifferentialSyntax) return zshDifferentialSyntax;
  }
  for (let child of node.children) {
    if (!child) continue;
    if (
      child.type === "case_item" &&
      !child.children.some((child) => child !== undefined && child.type === ")") &&
      hasCommentNode(child)
    )
      return {
        kind: "too-complex",
        reason:
          "`case` pattern group holds a comment \u2014 bash reads no comment inside a pattern list, but zsh reads the group as one glob word and expands its contents",
        differential: true,
      };
    if (
      child.type === "function" &&
      !node.children.some((child) => child !== undefined && child.type === "(")
    ) {
      let o = node.children[1];
      let n = node.children.find((child) => child !== undefined && child.type === "redirected_statement")
        ?.children[0];
      let i =
        node.children.find((child) => child !== undefined && child.type === "subshell") ??
        (n?.type === "subshell" ? n : undefined);
      if (
        o !== undefined &&
        i !== undefined &&
        isOnlyBlankBetween(bytes, o.endIndex - baseOffset, i.startIndex - baseOffset)
      )
        return {
          kind: "too-complex",
          reason:
            "`function` with a parenthesised body and no `()` \u2014 bash reads a subshell body, but zsh reads one glob-group word and expands its contents",
          differential: true,
        };
    }
    if (COMPOUND_STATEMENT_TYPES.has(child.type) && bytes[child.endIndex - baseOffset] === 40)
      return {
        kind: "too-complex",
        reason: `\`${child.type}\` glued to a paren \u2014 bash reads a keyword and a subshell, but zsh reads one glob-group word and expands its contents`,
        differential: true,
      };
  }
  return null;
}
//@ chunk-r01896cg.js:14269-14329 layout
/**
 * 复合语句节点类型（if/elif/else/while/until/case）。
 */
var COMPOUND_STATEMENT_TYPES = new Set(["if", "elif", "else", "while", "until", "case"]);
//@ chunk-r01896cg.js:14329-19184 layout
/**
 * 递归检查 declare/unset 语句的写法：标志会改变赋值语义且有会被求值的操作数、相邻引号片段拼成一个操作数、$'…' 标志、拼写成别的命令但实为声明等，返回 too-complex。（实为 ast.ts 安全检查，被切到 bashParser.ts）
 */
function checkDeclarationOperands(e) {
  if (e.type === "declaration_command" || e.type === "unset_command") {
    if (
      e.type === "declaration_command" &&
      e.children.some(
        (child) =>
          child !== undefined &&
          (/^(?:export|readonly)$/.test(e.children[0]?.text ?? "")
            ? EXPORT_SEMANTIC_FLAG_RE
            : DECLARE_SEMANTIC_FLAG_RE
          ).test(unquoteFlagWord(child.text)),
      ) &&
      !areDeclareArgsSimple(e)
    )
      return {
        kind: "too-complex",
        reason: `${e.children[0]?.text ?? "declare"} with a flag that changes assignment semantics and an operand it would evaluate`,
        differential: true,
      };
    let t =
      e.type === "unset_command" || /^(?:declare|typeset|local|export)$/.test(e.children[0]?.text ?? "");
    let matches = /^(?:declare|typeset|local)$/.test(e.children[0]?.text ?? "");
    let any = e.children.some(
      (child) => child !== undefined && /^[-+][A-Za-z]*[fF]/.test(unquoteFlagWord(child.text)),
    );
    let o;
    for (let [n, i] of e.children.entries()) {
      if (!i) continue;
      if (n > 1 && o !== undefined && i.type !== "variable_assignment" && i.startIndex === o.endIndex)
        return {
          kind: "too-complex",
          reason: `${e.children[0]?.text ?? e.type} operand '${o.text}${i.text}' is split across adjacent quoted segments \u2014 the shell joins them into one word the analyzer cannot verify`,
          differential: true,
        };
      if (n > 0 && i.type === "ansi_c_string" && /^\$'[-+]/.test(i.text))
        return {
          kind: "too-complex",
          reason: `${e.children[0]?.text ?? e.type} flag ${i.text} \u2014 a $'\u2026' flag word the shell decodes`,
          differential: true,
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
            differential: true,
          };
        if (matches) {
          if (!isSafeDeclarationArg(i, any))
            return {
              kind: "too-complex",
              reason: `${e.children[0]?.text ?? "declare"} operand '${i.text}' is not a plain NAME with an inert value \u2014 the shell may re-parse it as a subscript, an expanded name or a compound assignment`,
              differential: true,
            };
          o = i;
          continue;
        }
        let assignmentName = getAssignmentName(i.text);
        let matches_2 = /^['"]?[A-Za-z_]\w*=/.test(i.text);
        let y = c
          ? (t && assignmentName.includes("[")) ||
            (matches_2 ? assignmentName.slice(1).includes("\\") : i.text.slice(1).includes("\\"))
          : i.type === "string" && (matches_2 ? assignmentName.includes("\\") : i.text.includes("\\"));
        let x = i.type === "variable_assignment" && /['\\]/.test(getAssignmentName(i.text));
        let u = c && t && /^['"]?\$/.test(assignmentName) && /[[`'"]/.test(i.text);
        if (y || x || u)
          return {
            kind: "too-complex",
            reason: `${e.children[0]?.text ?? e.type} operand '${i.text}' carries a subscript or escape the shell evaluates \u2014 the parser read it as literal text`,
            differential: true,
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
            differential: true,
          };
      }
      o = i;
    }
  }
  if (e.type === "command") {
    let found = e.children.find((child) => child !== undefined && child.type === "command_name");
    let r = found === undefined ? -1 : e.children.indexOf(found);
    let filtered = e.children.filter(
      (child, n) => child !== undefined && n > r && child.type !== "command_name",
    );
    if (found !== undefined) {
      if (containsAnsiCString(found) && filtered.some((f) => !/^[-+]/.test(unquoteFlagWord(f.text))))
        return {
          kind: "too-complex",
          reason: `command head ${found.text} \u2014 a $'\u2026' word the shell decodes before looking the command up`,
          differential: true,
        };
      let o = stripQuoteChars(found.text);
      let n = filtered;
      let i = false;
      let c = false;
      while (PREFIX_WRAPPER_RE.test(o) && n.length > 0) {
        i = true;
        while (n.length > 0 && /^-/.test(unquoteFlagWord(n[0].text))) {
          let f = unquoteFlagWord(n[0].text);
          if (o === "command" && /^-[pP]*[vV]/.test(f)) c = true;
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
            differential: true,
          };
        o = n.length > 0 ? stripQuoteChars(n[0].text) : "";
        n = n.slice(1);
      }
      let l = i || stripQuoteChars(found.text) !== found.text || DECLARATION_NAME_RE.test(found.text);
      if (!c && l && DECLARATION_NAME_RE.test(o)) {
        let f = o === "integer" || o === "float";
        let y = {
          ...e,
          children: [
            found,
            ...(f
              ? [
                  {
                    ...found,
                    text: "-i",
                  },
                ]
              : []),
            ...n,
          ],
        };
        let joined = n
          .map((p) => unquoteFlagWord(p.text))
          .filter((p) => /^[-+]/.test(p))
          .join("");
        let u =
          f ||
          (/^(?:declare|typeset|local|private)$/.test(o) && DECLARE_SEMANTIC_FLAG_CHARS.test(joined)) ||
          (/^(?:export|readonly)$/.test(o) && EXPORT_SEMANTIC_FLAG_CHARS.test(joined));
        let filtered = n.filter((p) => !/^[-+]/.test(unquoteFlagWord(p.text)));
        let matches = /[fF]/.test(joined);
        let m =
          (u && !areDeclareArgsSimple(y)) ||
          n.some((p) => p.type === "ansi_c_string" && /^\$'[-+]/.test(p.text));
        if (/^(?:declare|typeset|local|integer|float|private)$/.test(o))
          m ||= filtered.some((p) => !isSafeDeclarationArg(p, matches));
        else
          m ||= filtered.some((p) => {
            if (p.type === "ansi_c_string") return true;
            let assignmentName = getAssignmentName(p.text);
            return (
              /[\\'"]/.test(assignmentName.replace(/^['"]/, "").replace(/['"]$/, "")) ||
              (o !== "readonly" && assignmentName.includes("[")) ||
              /^['"]?\$/.test(assignmentName) ||
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
            differential: true,
          };
      }
    }
  }
  for (let child of e.children) {
    if (!child) continue;
    let r = checkDeclarationOperands(child);
    if (r) return r;
  }
  return null;
}
//@ chunk-r01896cg.js:19184-19657 placement = DECL_KEYWORDS (0.884)
/**
 * 声明类命令的正则与选项规则：前缀包装（builtin/command/exec/time/coproc/noglob/nocorrect/-）、声明命令名、declare/export 会改变语义的标志字母，以及 declare/typeset/local/export/readonly 的赋值型与列出型选项。
 */
var PREFIX_WRAPPER_RE = /^(?:builtin|command|exec|time|coproc|noglob|nocorrect|-)$/;
var DECLARATION_NAME_RE = /^(?:declare|typeset|local|export|readonly|unset|integer|float|private)$/;
var DECLARE_SEMANTIC_FLAG_RE = /^[-+].*[nialuAEFLRZ]/;
var DECLARE_SEMANTIC_FLAG_CHARS = /[nialuAEFLRZ]/;
var EXPORT_SEMANTIC_FLAG_RE = /^[-+].*[aAiluEFLRZ]/;
var EXPORT_SEMANTIC_FLAG_CHARS = /[aAiluEFLRZ]/;
var DECLARE_OPTION_CLASSES = {
  assigning: /^[-+][rtx]+$/,
  listing: /^(?:-[fgprtxU]+|\+[grtx]+)$/,
};
var DECLARATION_OPTION_RULES = new Map([
  ["declare", DECLARE_OPTION_CLASSES],
  ["typeset", DECLARE_OPTION_CLASSES],
  [
    "local",
    {
      assigning: DECLARE_OPTION_CLASSES.assigning,
      listing: /^-[fprtx]+$/,
    },
  ],
  [
    "export",
    {
      listing: /^-[aAfnp]+$/,
    },
  ],
  [
    "readonly",
    {
      listing: /^-[aAfpx]+$/,
    },
  ],
]);
//@ chunk-r01896cg.js:19657-20601 placement
/**
 * 检查声明命令的选项组合：列举型选项与赋值同用、readonly 重复命名、选项出现在名字之后、bash/zsh 不共同支持的选项，返回理由或 null。
 */
function checkDeclarationOptions(e, t) {
  let r = DECLARATION_OPTION_RULES.get(e);
  let s = new Set();
  let o = e === "readonly";
  let n = false;
  let i;
  for (let c of t)
    if (!/^[-+]/.test(c)) {
      if (i !== undefined && c.includes("="))
        return `${e} ${i} with an assignment \u2014 not every supported bash and zsh assigns under that option, so the value cannot be statically verified`;
      let replaced = c.replace(/\+?=.*/s, "");
      if (o && c.includes("=") && s.has(replaced))
        return `${e} names '${redactPlaceholdersForDisplay(replaced)}' twice \u2014 the first makes it read-only, so bash does not carry out the second`;
      s.add(replaced);
      n = true;
    } else if (n)
      return `${e} word '${redactPlaceholdersForDisplay(c)}' comes after the options \u2014 the shell reads it as a name, which it cannot be, and bash and zsh go on from that error differently`;
    else if (c === "--") n = true;
    else if (r?.assigning?.test(c)) o ||= /^-.*r/.test(c);
    else if (r?.listing.test(c)) i ??= c;
    else
      return `${e} option '${redactPlaceholdersForDisplay(c)}' is not one bash and zsh are both known to accept \u2014 a shell that rejects it assigns nothing, so the names it declares cannot be statically verified`;
  return null;
}
//@ chunk-r01896cg.js:20601-21033 placement
/**
 * 检查声明上下文分歧：local 在函数外赋值、export/readonly 给名字加数组属性，返回理由或 null。
 */
function checkDeclarationContext(e, t) {
  let filtered = t.filter((s) => !/^[-+]/.test(s));
  if (e === "local" && filtered.some((s) => s.includes("=")))
    return "'local' outside a function \u2014 bash refuses that and assigns nothing, so the value cannot be statically verified";
  if ((e === "export" || e === "readonly") && filtered.length > 0 && t.some(isSetFlagWithA))
    return `'${e}' gives a name the array attribute \u2014 zsh empties a value it held and bash keeps it, so it cannot be statically verified`;
  return null;
}
//@ chunk-r01896cg.js:21033-21092 placement
var PLAIN_VAR_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
var FUNCTION_NAME_RE = /^[A-Za-z_][\w.:-]*$/;
//@ chunk-r01896cg.js:21092-21403 placement
function isPlainDeclarationOperand(text, t, r = false) {
  let assignmentName = getAssignmentName(text);
  let o = text[0];
  if (o === "'" || o === '"') {
    assignmentName = assignmentName.slice(1);
    if (assignmentName.endsWith(o)) assignmentName = assignmentName.slice(0, -1);
  } else if (/^\\[A-Za-z_]/.test(assignmentName)) assignmentName = assignmentName.slice(1);
  if (r && (o === "'" || o === '"')) {
    let index = text.indexOf("[");
    let index_2 = text.indexOf(o, 1);
    if (index > 0 && index_2 > index) assignmentName = assignmentName.replace(/\[[\s\S]*$/, "");
  }
  assignmentName = assignmentName.replace(/\+$/, "");
  return PLAIN_VAR_NAME_RE.test(assignmentName) || (t && FUNCTION_NAME_RE.test(assignmentName));
}
//@ chunk-r01896cg.js:21403-21491 placement
function containsAnsiCString(e) {
  return (
    e.type === "ansi_c_string" ||
    e.children.some((child) => child !== undefined && containsAnsiCString(child))
  );
}
//@ chunk-r01896cg.js:21491-21563 placement
function stripQuoteChars(text) {
  return text.replace(/\$(['"])/g, "$1").replace(/["'\\]/g, "");
}
//@ chunk-r01896cg.js:21563-21689 placement
var EXPANSION_NODE_TYPES = new Set([
  "command_substitution",
  "process_substitution",
  "arithmetic_expansion",
  "expansion",
  "simple_expansion",
]);
var EXPANSION_MASK = "$_";
//@ chunk-r01896cg.js:21689-22087 placement = mk (0.834)
function maskExpansions(node) {
  let t = [];
  let r = (i) => {
    for (let child of i.children) {
      if (!child) continue;
      if (EXPANSION_NODE_TYPES.has(child.type))
        t.push([child.startIndex - node.startIndex, child.endIndex - node.startIndex]);
      else r(child);
    }
  };
  r(node);
  if (t.length === 0) return node.text;
  t.sort((i, c) => i[0] - c[0]);
  let buffer = Buffer.from(node.text, "utf8");
  let o = "";
  let n = 0;
  for (let [i, c] of t) {
    if (i < n || c > buffer.length) return node.text;
    o += buffer.subarray(n, i).toString("utf8") + EXPANSION_MASK;
    n = c;
  }
  return o + buffer.subarray(n).toString("utf8");
}
//@ chunk-r01896cg.js:22087-22234 sole-consumer
function hasParenInExpansion(e) {
  if (e.type === "expansion" && e.text.replace(/\$\(\(?|[<>]\(/g, "").includes("(")) return true;
  return e.children.some((child) => child !== undefined && hasParenInExpansion(child));
}
//@ chunk-r01896cg.js:22234-22898 sole-consumer
/**
 * 判断 declare/export 等的参数是否为安全的变量名或 name=value：拒绝大括号展开、ANSI-C 字符串、展开中的括号与以 ( 开头的值，数组赋值与数字直接接受。
 */
function isSafeDeclarationArg(node, allowExtendedNames) {
  if (node.type === "number" || /^\d+$/.test(node.text)) return true;
  let masked = maskExpansions(node);
  if (
    node.type !== "raw_string" &&
    node.type !== "string" &&
    BRACE_EXPANSION_RE.test(maskBracesInQuotedContexts(masked))
  )
    return false;
  let unquoted = /^['"]/.test(masked) ? masked.slice(1) : masked;
  let eqIndex = unquoted.indexOf("=");
  let varName = (eqIndex < 0 ? unquoted : unquoted.slice(0, eqIndex)).replace(/\+$/, "");
  if (!(allowExtendedNames ? /^[A-Za-z_][\w.:-]*['"]?$/ : /^[A-Za-z_]\w*['"]?$/).test(varName)) return false;
  if (eqIndex < 0) return true;
  if (
    node.children.find(
      (child, y) => child !== undefined && y >= 2 && child.type !== "=" && child.type !== "+=",
    )?.type === "array"
  )
    return true;
  if (containsAnsiCString(node) || /\$'./.test(masked)) return false;
  if (hasParenInExpansion(node)) return false;
  let valueRest = unquoted.slice(eqIndex + 1);
  for (;;)
    if (/^[\\'"]/.test(valueRest)) valueRest = valueRest.slice(1);
    else if (/^\$['"]/.test(valueRest)) valueRest = valueRest.slice(2);
    else if (valueRest.startsWith(EXPANSION_MASK)) valueRest = valueRest.slice(EXPANSION_MASK.length);
    else break;
  return !valueRest.startsWith("(");
}
//@ chunk-r01896cg.js:22898-23179 sole-consumer
function getAssignmentName(text) {
  let t = 0;
  let r = null;
  let s = text[0] === "'" || text[0] === '"' ? text[0] : null;
  for (let o = s === null ? 0 : 1; o < text.length; o += 1) {
    let n = text[o];
    if (r !== null) {
      if (n === r) r = null;
    } else if ((n === "'" || n === '"') && n !== s) r = n;
    else if (n === "[") t += 1;
    else if (n === "]" && t > 0) t -= 1;
    else if (n === "=" && t === 0) return text.slice(0, o);
  }
  return text;
}
//@ chunk-r01896cg.js:23263-23390 sole-consumer
function isOnlyBlankBetween(bytes, t, r) {
  let s = t;
  while (s < r) {
    let o = bytes[s];
    if (o === 32 || o === 9) s += 1;
    else if (o === 92 && bytes[s + 1] === 10) s += 2;
    else return false;
  }
  return true;
}
//@ chunk-r01896cg.js:23390-23760 sole-consumer
/**
 * 判断 declare 类命令的各参数是否都是简单赋值：带 -i/-E/-F 时只允许算术表达式值，否则只允许普通字符串或简单数组。
 */
function areDeclareArgsSimple(node) {
  let joined = node.children
    .map((child) => (child === undefined ? "" : unquoteFlagWord(child.text)))
    .filter((o) => /^[-+]/.test(o))
    .join("");
  let s = /[iEF]/.test(joined)
    ? /^[A-Za-z_][\w.-]*=(?:(['"]?)[0-9+\-*\/% ().]*\1|\([0-9+\-*\/% ().\s]*\))$/
    : /^[A-Za-z_][\w.-]*(?:\+?=(?:(['"]?)[\w.\/ -]*\1|\([\w\s.\/-]*\)))?$/;
  return node.children.every((child, n) => {
    if (!child || n === 0 || /^[-+]/.test(unquoteFlagWord(child.text))) return true;
    return s.test(child.text);
  });
}
//@ chunk-r01896cg.js:23760-23870 sole-consumer
function unquoteFlagWord(text) {
  let match = /^\$?(['"])([-+][^'"]*)\1$/.exec(text);
  if (match) return match[2];
  return /^\\[-+]/.test(text) ? text.slice(1) : text;
}
//@ chunk-r01896cg.js:23870-23927 sole-consumer
var LOOP_STATEMENT_TYPES = new Set(["for_statement", "while_statement"]);
var MAX_LOOP_NESTING = 5;
//@ chunk-r01896cg.js:23927-23970 sole-consumer
function isLoopBlockedByEnvScrub(node) {
  return LOOP_STATEMENT_TYPES.has(node.type) && isScrubEnabled();
}
//@ chunk-r01896cg.js:23970-24387 callgraph-witnessed = walkProgram (0.331)
/**
 * 遍历 program：先跑 Tar 预检，再 collectCommands 收集命令与裸赋值名；对每条命令检查 zsh stat -A/-H 与声明上下文（local 在函数外等）。返回 {kind:'simple', commands, bareAssignmentNames, hasLoop}。
 */
function walkProgram(root) {
  let preCheck = scanSameLineStatementSplits(root);
  if (preCheck) return preCheck;
  let commands = [];
  let varScope = new Map();
  let bareAssignmentNames = [];
  let error = collectCommands(root, commands, varScope, bareAssignmentNames);
  if (error) return error;
  let hasLoop = [...LOOP_STATEMENT_TYPES].some((l) => collectCommandSubstitution(root, l));
  let lastCommand = hasLoop ? undefined : commands.at(-1);
  for (let l of readingDivergentShapes ? [] : commands) {
    let [f = "", ...y] = l.argv;
    let x = zshStatWritesVarReason(f, y) ?? (l === lastCommand ? null : checkDeclarationContext(f, y));
    if (x !== null)
      return {
        kind: "too-complex",
        reason: x,
        divergentShape: true,
        ...(l.argvUnquotedGlob === undefined && {
          nodeType: "declaration_command",
        }),
      };
  }
  return {
    kind: "simple",
    commands,
    bareAssignmentNames,
    hasLoop,
  };
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
]);
var SCOPED_STATEMENT_TYPES = new Set([
  "negated_command",
  "if_statement",
  "while_statement",
  "for_statement",
  "subshell",
]);
//@ chunk-r01896cg.js:24959-25668 facade-majority
/**
 * 递归扫描同一行上紧贴前一语句的语句或 (…) 组：bash 会把它们读成一条命令或报错，zsh 会当成 glob 组，存在解析分歧，返回 too-complex（differential）。
 */
function scanSameLineStatementSplits(e) {
  let t = null;
  for (let child of e.children) {
    if (!child) continue;
    if (STATEMENT_NODE_TYPES.has(child.type)) {
      if (t !== null) {
        let o = child;
        while (STRUCTURAL_TYPES.has(o.type)) {
          let found = o.children.find((child) => child != null);
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
            differential: true,
          };
      }
      t = child;
    } else t = null;
    let s = scanSameLineStatementSplits(child);
    if (s) return s;
  }
  return null;
}
//@ chunk-r01896cg.js:25668-38155 fingerprint = collectCommands (0.636)
/**
 * 递归收集简单命令（2.1.88 collectCommands 的大幅扩展版）：处理 command、redirected_statement、program/list/pipeline（|| 与 & 分支复制作用域，pipeline 末段外的赋值不外泄）、negated_command、declaration_command（declare/typeset/local/export/readonly 的大量 zsh/bash 分歧检查与变量跟踪）、variable_assignment（执行影响变量、整数属性变量拒绝）、for/while/if（作用域合并与循环变量限制）、subshell、test_command、unset_command；不认识的节点交给 tooComplex。返回 null 表示继续，返回结果对象表示终止。
 */
function collectCommands(node, commands, varScope, bareAssignmentNames, isProgramChild = false) {
  if (node.type === "command") {
    let result = walkCommand(node, [], commands, varScope, bareAssignmentNames);
    if (result.kind !== "simple") return result;
    commands.push(...result.commands);
    return null;
  }
  if (node.type === "redirected_statement")
    return walkRedirectedStatement(node, commands, varScope, bareAssignmentNames, isProgramChild);
  if (node.type === "comment") return null;
  if (STRUCTURAL_TYPES.has(node.type)) {
    let isPipeline = node.type === "pipeline";
    let i = commands.length;
    let needsSnapshot = false;
    if (!isPipeline) {
      for (let child of node.children)
        if (child && (child.type === "||" || child.type === "&")) {
          needsSnapshot = true;
          break;
        }
    }
    let l = needsSnapshot ? new Map(varScope) : null;
    let f = isPipeline ? new Map(varScope) : varScope;
    let y = null;
    for (let child of node.children) {
      if (!child) continue;
      if (SEPARATOR_TYPES.has(child.type)) {
        if (child.type === "||" || child.type === "|" || child.type === "|&" || child.type === "&") {
          if (child.type === "||") {
            y ??= new Set();
            if (loopDepth === 0) for (let key of varScope.keys()) y.add(key);
            let h = l ?? varScope;
            f = new Map(h);
            for (let [d, m] of varScope) if (h.get(d) !== m) markVarUnknown(f, d);
            for (let key of h.keys()) if (!varScope.has(key)) markVarUnknown(f, key);
          } else f = new Map(l ?? varScope);
        } else if (y !== null) {
          for (let h of y) markVarUnknown(varScope, h);
          y = null;
          f = varScope;
        }
        continue;
      }
      let err = collectCommands(child, commands, f, bareAssignmentNames, node.type === "program");
      if (err) return err;
      if (y !== null && loopDepth > 0) mergeScopeInto(varScope, f);
    }
    if (y !== null) for (let x of y) markVarUnknown(varScope, x);
    if (isPipeline) {
      mergeScopeInto(varScope, f);
      if (commands.length === i) pushTrueCommand(commands, node);
    }
    return null;
  }
  if (node.type === "negated_command") {
    let n = commands.length;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "!") continue;
      let commands_2 = collectCommands(child, commands, varScope, bareAssignmentNames);
      if (commands_2) return commands_2;
    }
    if (commands.length === n) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "declaration_command") {
    let n = commands.length;
    let any = node.children.some((child) => child !== null && containsArithmeticExpansion(child));
    let c = (m, p) => {
      if (!any) return null;
      let g = varScope.get(m);
      let _ = n === 0 && !containsAnyPlaceholder(p);
      let b = g !== undefined && !containsAnyPlaceholder(g);
      return _ || b
        ? divergentShapeResult(
            `'${m}' is assigned by a declaration carrying an expansion that can fail at runtime, which assigns nothing when it fails \u2014 its value cannot be statically verified`,
          )
        : null;
    };
    let l = quoteScanCarveOutCount;
    let varScope_2 = new Map(varScope);
    let y = false;
    let x = false;
    let u = [];
    let h = -1;
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
              differential: true,
            };
          let g = walkArgument(child, commands, varScope_2, bareAssignmentNames);
          if (typeof g !== "string") return g;
          if (/^[+-].*m/.test(g))
            return {
              kind: "too-complex",
              reason: `${u[0]} flag ${g} \u2014 zsh -m/+m pattern-assigns every matching variable; cannot statically model target set`,
              nodeType: "declaration_command",
            };
          if (u[0] === "declare" || u[0] === "typeset" || u[0] === "local" || u[0] === "readonly") {
            if (/^[+-].*f/.test(g)) y = true;
            if (/^[+-].*[uU]/.test(g)) x = true;
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
              ...(areDeclareArgsSimple(node)
                ? {
                    nodeType: "declaration_command",
                  }
                : {
                    differential: true,
                  }),
            };
          if ((u[0] === "export" || u[0] === "readonly") && isSetFlagWithA(g) && !areDeclareArgsSimple(node))
            return {
              kind: "too-complex",
              reason: `${u[0]} flag ${g} with an operand bash would evaluate as a compound array assignment`,
              differential: true,
            };
          if ((u[0] === "export" || u[0] === "readonly") && /^[+-].*[iluEFLRZ]/.test(g))
            return {
              kind: "too-complex",
              reason: `${u[0]} flag ${g} \u2014 zsh bin_typeset mathevals (-i/-E/-F), width-truncates (-L/-R/-Z), or case-converts (-l/-u) the assigned value`,
              ...(areDeclareArgsSimple(node)
                ? {
                    nodeType: "declaration_command",
                  }
                : {
                    differential: true,
                  }),
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
              differential: true,
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
              differential: true,
            };
          if (g[0] !== "-") {
            let index = g.indexOf("=");
            if (index > 0) {
              let sliced = g.slice(0, index);
              if (/^[A-Za-z_][A-Za-z0-9_]*\+?$/.test(sliced)) {
                let k = sliced.endsWith("+");
                let A = k ? sliced.slice(0, -1) : sliced;
                let R = c(A, g.slice(index + 1));
                if (R) return R;
                applyVarToScope(
                  varScope,
                  {
                    name: A,
                    value: g.slice(index + 1),
                    isAppend: k,
                  },
                  n > 0,
                );
                bareAssignmentNames.push(A);
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
              differential: true,
            };
          let assignment = walkVariableAssignment(child, commands, varScope_2, bareAssignmentNames);
          if ("kind" in assignment) return assignment;
          let _ = c(assignment.name, assignment.value);
          if (_) return _;
          applyVarToScope(varScope, assignment, n > 0);
          bareAssignmentNames.push(assignment.name);
          u.push(`${assignment.name}=${assignment.value}`);
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
              differential: true,
            };
          let any = u.some((b) => /^-[A-Za-z]*[fF]/.test(b));
          if (!PLAIN_VAR_NAME_RE.test(text) && !(any && FUNCTION_NAME_RE.test(text)))
            return {
              kind: "too-complex",
              reason: `${u[0]} operand '${text}' is not a plain variable name \u2014 the shell may turn it into an assignment the parser did not see`,
              differential: true,
            };
          u.push(text);
          break;
        }
        case "ansi_c_string":
          return {
            kind: "too-complex",
            reason: `${u[0] ?? "declaration"} operand ${child.text} \u2014 a $'\u2026' word the shell decodes, which may carry a subscript the parser cannot read`,
            differential: true,
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
        divergentShape: true,
        ...(areDeclareArgsSimple(node) && {
          nodeType: "declaration_command",
        }),
      };
    commands.push({
      argv: u,
      envVars: [],
      redirects: [],
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
      carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== l,
    });
    return null;
  }
  if (node.type === "variable_assignment") {
    let n = commands.length;
    let assignment = walkVariableAssignment(node, commands, varScope, bareAssignmentNames);
    if ("kind" in assignment) return assignment;
    if (isExecInfluencingVar(assignment.name))
      return {
        kind: "too-complex",
        reason: `${assignment.name} assignment alters command lookup/execution for subsequent commands`,
        nodeType: "variable_assignment",
      };
    if (isIntegerVarAssignUnsafe(assignment.name, assignment.value))
      return {
        kind: "too-complex",
        reason: `${assignment.name} has integer attribute \u2014 assignment arith-evals RHS, which can execute subscript command substitution or abort/diverge at runtime`,
        nodeType: "variable_assignment",
      };
    applyVarToScope(varScope, assignment, n > 0);
    bareAssignmentNames.push(assignment.name);
    if (
      commands.length === n &&
      (containsArithmeticExpansion(node) || BASH_READONLY_SPECIAL_VARS.has(assignment.name))
    )
      pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "for_statement") {
    if (isLoopBlockedByEnvScrub(node)) return tooComplex(node);
    let loopWrites = collectLoopWrites(node, commands, varScope, bareAssignmentNames);
    if ("kind" in loopWrites) return loopWrites;
    let loopVar = null;
    let doGroup = null;
    let l = commands.length;
    let f = false;
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
        let err = walkCommandSubstitution(child, commands, varScope, bareAssignmentNames);
        if (err) return err;
      } else {
        let arg = walkArgument(child, commands, varScope, bareAssignmentNames);
        if (typeof arg !== "string") return arg;
        if (containsArithmeticExpansion(child)) f = true;
        else if ((hasUnquotedGlob(child.text) || nodeHasUnquotedGlob(child)) && isVastPuddleEnabled())
          f = true;
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
    if (y !== undefined && !containsAnyPlaceholder(y))
      return {
        kind: "too-complex",
        reason: `for-loop variable '${loopVar}' would overwrite tracked literal ${JSON.stringify(y.slice(0, 40))}; post-loop value cannot be statically determined`,
        nodeType: "for_statement",
      };
    varScope.delete(loopVar);
    bareAssignmentNames.push(loopVar);
    let bodyScope = new Map(varScope);
    markLoopWritesUnknown(bodyScope, doGroup);
    for (let loopWrite of loopWrites) markVarUnknown(bodyScope, loopWrite);
    bodyScope.delete(loopVar);
    for (let child of doGroup.children) {
      if (!child) continue;
      if (child.type === "do" || child.type === "done" || child.type === ";") continue;
      let err = collectCommands(child, commands, bodyScope, bareAssignmentNames);
      if (err) return err;
    }
    mergeScopeInto(varScope, bodyScope);
    if (f && commands.length === l) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "if_statement" || node.type === "while_statement") {
    if (isLoopBlockedByEnvScrub(node)) return tooComplex(node);
    let n = null;
    let i = null;
    if (node.type === "while_statement") {
      let loopWrites = collectLoopWrites(node, commands, varScope, bareAssignmentNames);
      if ("kind" in loopWrites) return loopWrites;
      n = new Set(varScope.keys());
      i = new Map(varScope);
      markLoopWritesUnknown(varScope, node);
      for (let loopWrite of loopWrites) {
        markVarUnknown(varScope, loopWrite);
        markVarUnknown(i, loopWrite);
      }
    }
    let seenThen = false;
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
        seenThen = true;
        continue;
      }
      if (child.type === "do_group") {
        let bodyScope = new Map(varScope);
        markLoopWritesUnknown(bodyScope, child);
        for (let child_2 of child.children) {
          if (!child_2) continue;
          if (child_2.type === "do" || child_2.type === "done" || child_2.type === ";") continue;
          let err = collectCommands(child_2, commands, bodyScope, bareAssignmentNames);
          if (err) return err;
        }
        mergeScopeInto(varScope, bodyScope);
        continue;
      }
      if (child.type === "elif_clause" || child.type === "else_clause") {
        let branchScope = new Map(varScope);
        for (let child_2 of child.children) {
          if (!child_2) continue;
          if (
            child_2.type === "elif" ||
            child_2.type === "else" ||
            child_2.type === "then" ||
            child_2.type === ";"
          )
            continue;
          let err = collectCommands(child_2, commands, branchScope, bareAssignmentNames);
          if (err) return err;
        }
        mergeScopeInto(varScope, branchScope);
        continue;
      }
      let f = new Map(varScope);
      let before = commands.length;
      let err = collectCommands(child, commands, f, bareAssignmentNames);
      if (err) return err;
      if (!seenThen) {
        for (let [u, h] of f) {
          let d = (i ?? varScope).get(u);
          if (d !== undefined && !containsAnyPlaceholder(d) && h !== d)
            return {
              kind: "too-complex",
              reason: `'${u}' was tracked as literal '${d}' but condition may modify it (||/pipeline/unset/&&-short-circuit) \u2014 cannot prove downstream value`,
              nodeType: node.type,
            };
          if (d?.includes(UNCERTAIN_VAR_PLACEHOLDER) === true && h !== d) {
            varScope.set(u, d);
            continue;
          }
          varScope.set(u, h);
        }
        for (let key of varScope.keys())
          if (!f.has(key)) {
            let h = (i ?? varScope).get(key);
            if (h !== undefined && !containsAnyPlaceholder(h))
              return {
                kind: "too-complex",
                reason: `'${key}' was tracked as literal '${h}' but condition may unset it (&&-short-circuit) \u2014 cannot prove downstream value`,
                nodeType: node.type,
              };
            markVarUnknown(varScope, key);
          }
        for (let i = before; i < commands.length; i++) {
          let h = commands[i];
          if (h?.argv[0] === "read" && !isBashReadingMode()) {
            for (let arg of h.argv.slice(1))
              if (!arg.startsWith("-") && /^[A-Za-z_][A-Za-z0-9_]*$/.test(arg)) {
                let existing = varScope.get(arg);
                if (existing !== undefined && !containsAnyPlaceholder(existing))
                  return {
                    kind: "too-complex",
                    reason: `'read ${arg}' in condition may not execute (||/pipeline/subshell); cannot prove it overwrites tracked literal '${existing}'`,
                    nodeType: node.type,
                  };
                markVarUnknown(varScope, arg);
              }
            let d = varScope.get("REPLY");
            if (d !== undefined && !containsAnyPlaceholder(d))
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
      for (let key of [...varScope.keys()]) if (!n.has(key)) varScope.delete(key);
    }
    return null;
  }
  if (node.type === "subshell") {
    let innerScope = new Map(varScope);
    let i = commands.length;
    let c = false;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "(" || child.type === ")") continue;
      if (child.type !== "comment") c = true;
      let err = collectCommands(child, commands, innerScope, bareAssignmentNames);
      if (err) return err;
    }
    if (c && commands.length === i) pushTrueCommand(commands, node);
    return null;
  }
  if (node.type === "test_command") {
    let isDoubleBracket = node.children.some((child) => child?.type === "[[");
    let testCommandGap = findTestCommandGap(node, isDoubleBracket);
    if (testCommandGap) return testCommandGap;
    let argv = ["[["];
    let l = quoteScanCarveOutCount;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "[[" || child.type === "]]" || child.type === "[" || child.type === "]") continue;
      let err = walkTestExpr(child, argv, commands, varScope, bareAssignmentNames, isDoubleBracket);
      if (err) return err;
    }
    commands.push({
      argv,
      envVars: [],
      redirects: [],
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
      carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== l,
    });
    return null;
  }
  if (node.type === "unset_command") {
    let n = [];
    let i = quoteScanCarveOutCount;
    let hasPriorCommands = commands.length > 0;
    let l = false;
    let f = false;
    let y = false;
    for (let child of node.children) {
      if (!child) continue;
      switch (child.type) {
        case "unset":
          n.push(child.text);
          y = child.text === "unsetenv";
          break;
        case "variable_name":
          if (!PLAIN_VAR_NAME_RE.test(child.text) && !(l && FUNCTION_NAME_RE.test(child.text)))
            return {
              kind: "too-complex",
              reason: `${n[0] ?? "unset"} operand '${child.text}' is not a plain variable name \u2014 the shell may expand or evaluate it`,
              differential: true,
            };
          n.push(child.text);
          f = true;
          if (l || y) {
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
          recordUnset(varScope, child.text, hasPriorCommands);
          break;
        case "word": {
          let name = walkArgument(child, commands, varScope, bareAssignmentNames);
          if (typeof name !== "string") return name;
          if (name.startsWith("-")) {
            if (f) return tooComplex(child);
            if (name !== "-f" && name !== "-v") return tooComplex(child);
            if (name === "-f") l = true;
            n.push(name);
            break;
          }
          if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) return tooComplex(child);
          n.push(name);
          f = true;
          if (l || y) {
            let h = uncertainValueResult(
              varScope.get(name),
              `'${name}' no longer has a statically known value at this unset \u2014 cannot verify what the command leaves behind`,
              "unset_command",
            );
            if (h !== null) return h;
            break;
          }
          if (isAssignmentNameUnsafeForSandbox(name))
            return {
              kind: "too-complex",
              reason: `'unset' targets shell variable ${name} (exec-influencing / integer-attr / IFS / PS4)`,
              nodeType: "unset_command",
            };
          recordUnset(varScope, name, hasPriorCommands);
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
              differential: true,
            };
          return tooComplex(child);
        default:
          return tooComplex(child);
      }
    }
    commands.push({
      argv: n,
      envVars: [],
      redirects: [],
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
      carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== i,
    });
    return null;
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
    return false;
  }
  return true;
}
//@ chunk-r01896cg.js:38497-39147 layout
function findTestCommandGap(e, t) {
  let buffer = Buffer.from(e.text, "utf8");
  let startIndex = e.startIndex;
  for (let child of e.children) {
    if (!child) continue;
    if (child.startIndex > startIndex) {
      let str = buffer.subarray(startIndex - e.startIndex, child.startIndex - e.startIndex).toString("utf8");
      if (!isBlankTestGap(str, t))
        return {
          kind: "too-complex",
          reason:
            "Test command has unparsed bytes between children \u2014 parser dropped content that shell will see",
        };
    }
    startIndex = Math.max(startIndex, child.endIndex);
    if (TEST_EXPRESSION_TYPES.has(child.type)) {
      let testCommandGap = findTestCommandGap(child, t);
      if (testCommandGap) return testCommandGap;
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
function hasZshEqualsProcSubst(text) {
  let t = false;
  let r = false;
  let s = false;
  let o = 0;
  let n;
  for (let i = 0; i < text.length; i++) {
    let c = text[i];
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
      if (c === "=" && text[i + 1] === "(" && (s || i === 0 || n === "|")) return true;
      if (c === "(") o++;
      else if (c === ")") o = Math.max(0, o - 1);
      else if (o === 0 && (c === "|" || c === "&") && n === c) s = true;
      n = c;
    }
  }
  return false;
}
//@ chunk-r01896cg.js:39491-39763 facade-majority
/**
 * 文本中是否有独立的 ]]（排除 [[:class:]] 等字符类写法，以及两侧都是单词字符的情况），用于发现 [[ ]] 条件的提前闭合。
 */
function containsStandaloneCondCloser(text) {
  let replaced = text.replace(/\[(?::[a-zA-Z]+:|=[A-Za-z0-9-]*=|\.[A-Za-z0-9-]*\.|[!^]?)\]\](?!\])/g, "\x00");
  let r = /[A-Za-z0-9_]/;
  let index = replaced.indexOf("]]");
  while (index !== -1) {
    let o = index > 0 ? replaced[index - 1] : "";
    let n = index + 2 < replaced.length ? replaced[index + 2] : "";
    if (!(r.test(o) && r.test(n))) return true;
    index = replaced.indexOf("]]", index + 1);
  }
  return false;
}
//@ chunk-r01896cg.js:39763-39871 facade-majority
var ZSH_SUBSCRIPT_OR_MODIFIER_RE = /^([\w\u0080-\uffff]*|[-?*@!#])(\[|:[a-zA-Z&])/;
var ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE = /^([\w\u0080-\uffff]*|[-?*@!#$])(\[|:[a-zA-Z&])/;
//@ chunk-r01896cg.js:39871-43362 layout
/**
 * 遍历 [[ ]]/[ ] 内表达式，把运算符和操作数压入 argv：拒绝 zsh $name[expr]、!( 粘连、regex/extglob 中的展开/进程替换/=(CMD)/未加引号 &/粘连 ||/括号不平衡、独立 ]] 闭合符等 shell 词法分歧。
 */
function walkTestExpr(node, argv, innerCommands, varScope, bareAssignmentNames, isDoubleBracket) {
  if (TEST_EXPRESSION_TYPES.has(node.type)) {
    for (let i = 0; i < node.children.length; i++) {
      let node_2 = node.children[i];
      if (!node_2) continue;
      if (
        (node_2.type === "simple_expansion" || node_2.type === "expansion") &&
        (node.children[i + 1]?.text.startsWith("[") ||
          /^:[a-zA-Z&]/.test(node.children[i + 1]?.text ?? "") ||
          (node_2.children.some((child) => child?.type === "special_variable_name") &&
            ZSH_SPECIAL_SUBSCRIPT_TESTEXPR_RE.test(node.children[i + 1]?.text ?? "")))
      )
        return {
          kind: "too-complex",
          reason: "zsh $name[expr] / $name:mod in [[ ]] operand \u2014 recursive eval",
          differential: true,
        };
      if (isDoubleBracket && node_2.type === "!" && node.children[i + 1]?.startIndex === node_2.endIndex)
        return {
          kind: "too-complex",
          reason: "zsh reads !( in [[ ]] as part of a word",
          differential: true,
        };
      let l = walkTestExpr(node_2, argv, innerCommands, varScope, bareAssignmentNames, isDoubleBracket);
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
      argv.push(node.text);
      return null;
    case "regex":
    case "extglob_pattern":
      if (/\$([({[\w#?!*@$'"+~^=-]|[\u0080-\uffff])|`|[<>]\(/.test(node.text))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type === "extglob_pattern" ? "pattern" : node.type} contains expansion / command / process substitution`,
          differential: true,
        };
      if (node.text.startsWith("=("))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type === "extglob_pattern" ? "pattern" : node.type} contains zsh =(CMD) process substitution`,
          differential: true,
        };
      if (node.type === "regex" && hasZshEqualsProcSubst(node.text))
        return {
          kind: "too-complex",
          reason: `[[ ]] ${node.type} contains zsh =(CMD) process substitution`,
          differential: true,
        };
      if (node.type === "extglob_pattern") {
        let text = node.text;
        let c = 0;
        while (c < text.length) {
          if (text[c] === "\\" && c + 1 < text.length) {
            c += 2;
            continue;
          }
          if (text[c] === "&")
            return {
              kind: "too-complex",
              reason: "[[ ]] pattern contains unquoted & (zsh splits the word at & at any depth)",
              differential: true,
            };
          c++;
        }
      }
      if (node.type === "regex") {
        let text = node.text;
        let c = 0;
        let l = 0;
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
              differential: true,
            };
          if (f === "&")
            return {
              kind: "too-complex",
              reason: "[[ ]] regex contains unquoted & (zsh splits the word at & at any depth)",
              differential: true,
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
            c--;
            if (c < 0)
              return {
                kind: "too-complex",
                reason: "[[ ]] regex has unbalanced parentheses (parser desync)",
                differential: true,
              };
          }
          l++;
        }
        if (c !== 0)
          return {
            kind: "too-complex",
            reason: "[[ ]] regex has unbalanced parentheses (parser desync)",
            differential: true,
          };
      }
      if (node.text.includes("&&"))
        return {
          kind: "too-complex",
          reason:
            "[[ ]] pattern leaf contains `&&` \u2014 shell cond-lexer divergence (zsh splits the word there)",
          differential: true,
        };
      if (containsStandaloneCondCloser(node.text))
        return {
          kind: "too-complex",
          reason:
            "[[ ]] pattern leaf contains a potential standalone `]]` closer \u2014 shell cond-lexer divergence (zsh may close the conditional early)",
          differential: true,
        };
      argv.push(node.text);
      return null;
    case "test_rhs_missing":
      return {
        kind: "too-complex",
        reason: "Test command comparison is missing its right-hand side \u2014 parser dropped consumed bytes",
      };
    default: {
      let i = walkArgument(node, innerCommands, varScope, bareAssignmentNames);
      if (typeof i !== "string") {
        if (isDoubleBracket && i.kind === "too-complex") {
          let { nodeType, ...l } = i;
          return {
            ...l,
            differential: true,
          };
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
          differential: true,
        };
      argv.push(i);
      return null;
    }
  }
}
//@ chunk-r01896cg.js:43362-43617 layout
function findUnsupportedListTail(e) {
  let t = null;
  for (let child of e.children) {
    if (!child || child.type === "!" || child.type === "comment" || SEPARATOR_TYPES.has(child.type)) continue;
    t = child;
  }
  if (!t) return null;
  if (t.type === "list" || t.type === "negated_command") return findUnsupportedListTail(t);
  if (!REDIRECTABLE_COMMAND_TYPES.has(t.type) && !TRAILING_OK_TYPES.has(t.type)) return t;
  return null;
}
//@ chunk-r01896cg.js:43617-43676 layout
/**
 * 把变量在作用域中标为未知值 VAR_PLACEHOLDER（已是不确定值时保持）。
 */
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
function uncertainValueResult(e, reason, nodeType) {
  if (e === undefined) return null;
  if (!containsAnyPlaceholder(stripUncertainPrefix(e))) return null;
  return !readingDivergentShapes && e.includes(UNCERTAIN_VAR_PLACEHOLDER)
    ? {
        kind: "too-complex",
        reason,
        nodeType,
        divergentShape: true,
      }
    : {
        kind: "too-complex",
        reason,
        nodeType,
      };
}
//@ chunk-r01896cg.js:43952-44016 layout
function recordUnset(varScope, name, hasPriorCommands) {
  unsetNames.add(name);
  if (hasPriorCommands && readingDivergentShapes) sawUncertainWrite = true;
  varScope.set(
    name,
    !hasPriorCommands ? "" : readingDivergentShapes ? UNCERTAIN_PREFIX : UNCERTAIN_VAR_PLACEHOLDER,
  );
}
//@ chunk-r01896cg.js:44016-44179 layout
function mergeScopeAfterConditional(varScope, snapshot) {
  for (let [r, s] of varScope)
    if (snapshot.get(r) !== s) {
      if (!readingDivergentShapes && declarationPrefixValues.get(r) === s) prefixAssignInBranch = true;
      sawUncertainWrite ||= readingDivergentShapes;
      varScope.set(
        r,
        !readingDivergentShapes
          ? UNCERTAIN_VAR_PLACEHOLDER
          : s.includes(UNCERTAIN_VAR_PLACEHOLDER)
            ? s
            : UNCERTAIN_PREFIX + s,
      );
    }
  for (let key of snapshot.keys()) if (!varScope.has(key)) varScope.set(key, UNCERTAIN_VAR_PLACEHOLDER);
}
//@ chunk-r01896cg.js:44179-45723 fingerprint = walkRedirectedStatement (0.821)
/**
 * 处理 redirected_statement：分离 file/heredoc 重定向与内层命令；内层是 a && b 的 list 时分两段收集；随后解析每个文件重定向、检查重定向读前缀变量、校验 heredoc，并把重定向挂到最后一条命令上（无命令时推入空 argv 命令）。
 */
function walkRedirectedStatement(node, commands, varScope, bareAssignmentNames, isProgramChild) {
  let redirects = [];
  let innerCommand = null;
  let fileRedirects = [];
  let heredocRedirects = [];
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "file_redirect") fileRedirects.push(child);
    else if (child.type === "heredoc_redirect") heredocRedirects.push(child);
    else if (REDIRECTABLE_COMMAND_TYPES.has(child.type)) {
      if (child.type === "list" || child.type === "negated_command") {
        let unsupportedListTail = findUnsupportedListTail(child);
        if (unsupportedListTail) return tooComplex(unsupportedListTail);
      }
      innerCommand = child;
    } else return tooComplex(child);
  }
  if (!innerCommand) {
    for (let fileRedirect of fileRedirects) {
      let p = walkFileRedirect(fileRedirect, commands, varScope, bareAssignmentNames);
      if ("kind" in p) return p;
      redirects.push(p);
    }
    for (let heredocRedirect of heredocRedirects) {
      let p = walkHeredocRedirect(heredocRedirect, varScope);
      if (p) return p;
    }
    commands.push({
      argv: [],
      envVars: [],
      redirects,
      text: node.text,
      hasUnquotedGlob: hasUnquotedGlob(node.text),
    });
    return null;
  }
  let before = commands.length;
  let trailingPipeline =
    allowPlainUnquotedHeredocs &&
    isProgramChild &&
    innerCommand.type === "command" &&
    fileRedirects.length === 0 &&
    heredocRedirects.length === 1
      ? heredocRedirects[0]?.children.find((child) => child?.type === "pipeline")
      : undefined;
  let x;
  let u = false;
  if (innerCommand.type === "list") {
    let children = innerCommand.children;
    if (children.length === 3 && children[0] && children[1]?.type === "&&" && children[2]) {
      let commands_2 = collectCommands(children[0], commands, varScope, bareAssignmentNames);
      if (commands_2) return commands_2;
      x = new Map(varScope);
      u = true;
      let commands_3 = collectCommands(children[2], commands, varScope, bareAssignmentNames);
      if (commands_3) return commands_3;
    } else {
      let commands_2 = collectCommands(innerCommand, commands, varScope, bareAssignmentNames);
      if (commands_2) return commands_2;
      x = varScope;
    }
  } else if (STRUCTURAL_TYPES.has(innerCommand.type)) {
    let commands_2 = collectCommands(innerCommand, commands, varScope, bareAssignmentNames);
    if (commands_2) return commands_2;
    x = varScope;
  } else {
    x = new Map(varScope);
    u = true;
    let commands_2 = collectCommands(
      innerCommand,
      commands,
      trailingPipeline ? new Map(varScope) : varScope,
      bareAssignmentNames,
    );
    if (commands_2) return commands_2;
  }
  if (u) mergeScopeAfterConditional(varScope, x);
  let command = commands.length > before ? commands.at(-1) : undefined;
  let d = command?.envVars[0]?.name;
  if (d !== undefined && fileRedirects.some((fileRedirect) => containsArithmeticExpansion(fileRedirect))) {
    let m = prefixAssignmentMayFailResult(d);
    if (m) return m;
  }
  for (let fileRedirect of fileRedirects) {
    let p = walkFileRedirect(fileRedirect, commands, x, bareAssignmentNames);
    if ("kind" in p) return p;
    redirects.push(p);
  }
  if (command) {
    let m = checkRedirectReadsPrefixVar(fileRedirects, command, redirects, commands, x, bareAssignmentNames);
    if (m) return m;
  }
  for (let heredocRedirect of heredocRedirects) {
    let err = walkHeredocRedirect(heredocRedirect, x, trailingPipeline);
    if (err) return err;
  }
  if (trailingPipeline) {
    let commands_2 = collectCommands(trailingPipeline, commands, varScope, bareAssignmentNames);
    if (commands_2) return commands_2;
  }
  if (heredocRedirects.length > 0)
    for (let m = before; m < commands.length; m++) {
      let last = commands[m];
      if (last) last.argvSourceLiteral = false;
    }
  if (redirects.length > 0)
    if (commands.length > before) {
      let last = commands.at(-1);
      if (last) last.redirects.push(...redirects);
    } else
      commands.push({
        argv: [],
        envVars: [],
        redirects,
        text: node.text,
        hasUnquotedGlob: hasUnquotedGlob(node.text),
      });
  return null;
}
//@ chunk-r01896cg.js:45723-47196 layout
/**
 * 检查 file_redirect：子节点之间不能有被解析器丢掉的字节，不能用 fd 变量，>&/<& 后不能以 - 开头，关闭 fd 后不能跟词，目标不能多于一个。
 */
function checkFileRedirectShape(node) {
  {
    let startIndex = node.startIndex;
    for (let child of node.children) {
      if (!child) continue;
      if (child.startIndex > startIndex) {
        let str = Buffer.from(node.text, "utf8")
          .subarray(startIndex - node.startIndex, child.startIndex - node.startIndex)
          .toString("utf8");
        if (!/^(?:[ \t]|\\\n)*$/.test(str))
          return {
            kind: "too-complex",
            reason:
              "Redirect has unparsed bytes between children \u2014 parser dropped content that shell will see",
          };
      }
      startIndex = child.endIndex;
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
  let t = null;
  let r = 0;
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${child.text} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    if (child.type === "file_descriptor") continue;
    if (child.type === ">&-" || child.type === "<&-") {
      t = child.type;
      continue;
    }
    if (child.type in REDIRECT_OPS) {
      t = child.type;
      continue;
    }
    if ((t === ">&" || t === "<&") && child.text.startsWith("-"))
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
    r++;
    t = null;
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
]);
var HEREDOC_TRAILER_TYPES = new Set(["file_redirect", "pipeline"]);
var FD_VARIABLE_RE = /^\{(?:\w|[^\x00-\x7F])+(\[.*\])?\}$/su;
//@ chunk-r01896cg.js:47372-47557 layout
function describeFdVariable(text) {
  let t = /^\{((?:\w|[^\x00-\x7F])+)/u.exec(text)?.[1];
  if (t === undefined) return "{\u2026}";
  let r = /^\w{1,64}$/.test(t) ? t : "\u2026";
  return text[t.length + 1] === "[" ? `{${r}[\u2026]}` : `{${r}}`;
}
//@ chunk-r01896cg.js:47557-47918 layout = mk (1)
/**
 * 在子树中找 {name}> / {name}< 形式的 fd 变量重定向，返回其文本（会给 shell 变量赋值，属副作用）。
 */
function findFdVariableRedirect(e, t) {
  let r = t[e.startIndex] === 123 ? FD_VARIABLE_RE.exec(e.text) : null;
  if (r) {
    let endIndex = e.endIndex;
    let o = false;
    for (;;) {
      let l = t[endIndex];
      if (l === 32 || l === 9) {
        o = true;
        endIndex++;
      } else if (l === 92 && t[endIndex + 1] === 10) endIndex += 2;
      else break;
    }
    let n = t[endIndex];
    let i = t[endIndex + 1];
    if ((((n === 62 || n === 60) && i !== 40) || (n === 38 && i === 62)) && !(o && r[1] !== undefined))
      return e.text;
  }
  for (let child of e.children)
    if (child) {
      let fdVariableRedirect = findFdVariableRedirect(child, t);
      if (fdVariableRedirect !== null) return fdVariableRedirect;
    }
  return null;
}
//@ chunk-r01896cg.js:47918-48514 layout
/**
 * 递归检查所有重定向节点的形状：文件重定向交给 checkFileRedirectShape；here-string/heredoc 禁止 fd 变量，heredoc 起始行后只能跟文件重定向或管道。
 */
function findRedirectShapeError(node) {
  if (node.type === "file_redirect") {
    let t = checkFileRedirectShape(node);
    if (t) return t;
  }
  if (node.type === "herestring_redirect" || node.type === "heredoc_redirect") {
    for (let child of node.children)
      if (child?.type === "variable_name")
        return {
          kind: "too-complex",
          reason: `Redirect uses ${describeFdVariable(child.text)} fd-variable assignment \u2014 modifies shell variable as side effect`,
        };
    if (node.type === "heredoc_redirect") {
      for (let child of node.children)
        if (child && !HEREDOC_PART_TYPES.has(child.type) && !HEREDOC_TRAILER_TYPES.has(child.type))
          return {
            kind: "too-complex",
            reason: "Text after the heredoc start on the same line cannot be statically analyzed",
          };
    }
  }
  for (let child of node.children)
    if (child) {
      let redirectShapeError = findRedirectShapeError(child);
      if (redirectShapeError) return redirectShapeError;
    }
  return null;
}
//@ chunk-r01896cg.js:48514-51279 fingerprint = walkFileRedirect (0.464)
/**
 * 解析单个 file_redirect 为 {op, target, fd, targetSourceLiteral}：拒绝 fd 变量、关闭 fd 后跟词、多目标、>& 后以 - 开头、含花括号/替换的目标、含命令替换输出/换行/以 ! 或 = 开头的目标，以及 >& 后非简单路径。
 */
function walkFileRedirect(node, innerCommands, varScope, bareAssignmentNames) {
  let o = substitutionCount;
  let n = catHeredocInlineCount;
  let op = null;
  let target = null;
  let fd;
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
      if (node.children.some((child_2) => child_2 !== child && child_2?.type !== "file_descriptor"))
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
  if (!op || target === null)
    return {
      kind: "too-complex",
      reason: "Unrecognized redirect shape",
    };
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
    op,
    target,
    fd,
    targetSourceLiteral: substitutionCount === o && catHeredocInlineCount === n,
  };
}
//@ chunk-r01896cg.js:51279-51375 layout
var allowPlainUnquotedHeredocs = false;
var readingDivergentShapes = false;
var sawUncertainWrite = false;
var reExpansionBudget = 0;
var argvWordNodes = new WeakMap();
var currentDeclarationPrefix;
var declarationPrefixCount = 0;
var declarationPrefixBashKeeps;
var declarationPrefixValues = new Map();
var prefixAssignInBranch = false;
var usedAssignedValue = false;
var isLaterLoopPass = false;
var currentLoopNode = null;
var loopDepth = 0;
var unsetNames = new Set();
//@ chunk-r01896cg.js:51375-51452 layout
function divergentShapeResult(reason) {
  return readingDivergentShapes
    ? null
    : {
        kind: "too-complex",
        reason,
        divergentShape: true,
      };
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
var HEREDOC_BODY_ESCAPE_RE = /`|\\[$`\\\n]/;
var VAR_NAME_SOURCE = PLAIN_VAR_NAME_RE.source.slice(1, -1);
var PLAIN_VAR_REF_RE = new RegExp(
  `\\$(?:${VAR_NAME_SOURCE}(?![A-Za-z0-9_\\u0080-\\uffff])|\\{${VAR_NAME_SOURCE}\\})(?!\\[|:[A-Za-z&])`,
  "g",
);
//@ chunk-r01896cg.js:51836-54371 layout
/**
 * 校验 heredoc：必须有被扫描的正文；分界符未加引号时只在 plainUnquotedHeredocs 模式且正文只含可静态解析的 $name 时放行，否则 too-complex（differential）；引号分界符含反斜杠、<<- 配制表符分界符、正文行以分界符开头后跟 ) ` } 等也拒绝。可选允许分界行后紧跟一个简单管道。
 */
function walkHeredocRedirect(node, varScope, trailingPipeline) {
  let delimiter = null;
  let endDelimiter = null;
  let body = null;
  let isDashHeredoc = false;
  for (let child of node.children) {
    if (!child) continue;
    if (HEREDOC_PART_TYPES.has(child.type)) {
      if (child.type === "heredoc_start") delimiter = child.text;
      else if (child.type === "heredoc_body") body = child;
      else if (child.type === "<<-") isDashHeredoc = true;
      else if (child.type === "heredoc_end") endDelimiter = child.text;
    } else if (
      child === trailingPipeline &&
      child.children.at(-1)?.type === "command" &&
      child.children.every(
        (child) =>
          child?.type === "|" ||
          (child?.type === "command" && !child.children.some((child) => child?.type.endsWith("_redirect"))),
      )
    );
    else if (HEREDOC_TRAILER_TYPES.has(child.type)) {
      let f = tooComplex(child);
      return f.kind === "too-complex"
        ? {
            ...f,
            afterHeredocDelimiter: true,
          }
        : f;
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
      .toString("utf8");
    let joined = node.children
      .slice(0, node.children.indexOf(body))
      .map((child) => (child === trailingPipeline ? "|" : "") + (child?.text ?? ""))
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
    let filtered = body.children.filter((child) => child?.type !== "heredoc_content");
    if (!(
      allowPlainUnquotedHeredocs &&
      varScope !== undefined &&
      delimiter !== null &&
      PLAIN_VAR_NAME_RE.test(delimiter) &&
      endDelimiter === delimiter &&
      !HEREDOC_BODY_ESCAPE_RE.test(body.text) &&
      (body.text.match(/\$/g)?.length ?? 0) === filtered.length &&
      (body.text.match(PLAIN_VAR_REF_RE)?.length ?? 0) === filtered.length &&
      filtered.every((y) => {
        substitutionCount++;
        return (
          (y?.type === "simple_expansion" || y?.type === "expansion") &&
          typeof resolveSimpleExpansion(y, varScope, true) === "string"
        );
      })
    ))
      return {
        kind: "too-complex",
        reason: "Heredoc with unquoted delimiter undergoes shell expansion",
        nodeType: "heredoc_redirect",
        differential: true,
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
    for (let child of body.children) {
      if (!child) continue;
      if (child.type !== "heredoc_content") return tooComplex(child);
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
      for (let line of body.text.split(`
`)) {
        let y = isDashHeredoc ? line.replace(/^\t+/, "") : line;
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
//@ chunk-r01896cg.js:54371-54707 layout
/**
 * 校验 here-string（<<<）：参数需可静态解析，禁止 fd 变量与换行后注释。
 */
function walkHerestringRedirect(node, innerCommands, varScope, bareAssignmentNames) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "<<<") continue;
    if (child.type === "variable_name")
      return {
        kind: "too-complex",
        reason: `Redirect uses ${describeFdVariable(child.text)} fd-variable assignment \u2014 modifies shell variable as side effect`,
      };
    let content = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
    if (typeof content !== "string") return content;
    if (NEWLINE_HASH_RE.test(content)) return tooComplex(child);
  }
  return null;
}
//@ chunk-r01896cg.js:54707-55086 facade-majority
var COMMAND_WRAPPER_BUILTINS = new Set(["command", "builtin", "noglob", "nocorrect", "time"]);
var SAFE_PREFIX_ASSIGN_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?=[A-Za-z0-9_.,:/@%+=-]*$/;
var ASSIGNING_WRAPPERS = new Set(["builtin", "command", "noglob"]);
var DECLARATION_BUILTINS = new Set(["declare", "typeset", "local", "export", "readonly"]);
var DECLARATION_BUILTINS_ZSH = new Set([...DECLARATION_BUILTINS, "integer", "float", "private"]);
var POSIX_SPECIAL_BUILTINS_NONEVAL = new Set([
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
function checkZshReadDivergence(e, t, r, varScope, bareAssignmentNames) {
  if (e === undefined) return null;
  let [, n = "", i = ""] = /^([A-Za-z_][A-Za-z0-9_]*)([\s\S]*)$/.exec(e) ?? [];
  if (n === "" || (r ? i === "" : i !== "" && !/^[[?]/.test(i))) return null;
  let c = varScope.get(n);
  if (
    !bareAssignmentNames.includes(n) &&
    !unsetNames.has(n) &&
    !declarationPrefixValues.has(n) &&
    (c === undefined || containsAnyPlaceholder(c))
  )
    return null;
  if (!isNestedRippleEnabled() || isRuleOffOrBashReading()) return null;
  let l = i;
  let f = n;
  if (l.startsWith("[")) {
    let u = 0;
    let h = l.length;
    for (let k = 0; k < l.length; k++)
      if (l[k] === "[") u++;
      else if (l[k] === "]" && --u === 0) {
        h = k + 1;
        break;
      }
    f += "[\u2026]";
    l = l.slice(h);
  }
  if (l !== "") f += l.startsWith("?") ? "?\u2026" : "\u2026";
  let x = `In zsh, 'read ${redactPlaceholdersForDisplay(t === null ? f : `${t} ${f}`)}' can set ${n} differently from bash or leave it unchanged, and this command set or unset ${n} earlier, so ${n}'s value after the read can't be checked before the command runs`;
  if (!isLaterLoopPass) recordReadingRefusal(x);
  return {
    kind: "too-complex",
    reason: x,
    differential: true,
  };
}
//@ chunk-r01896cg.js:55887-62370 layout
/**
 * 按命令语义更新变量作用域：识别 builtin/command/noglob 包装（zsh/bash 行为不同时拒绝）、前缀赋值、declare 类、read（含 zsh read 分歧检查）、printf -v、unset、print、set -A、mapfile、cd/pushd/popd（标 PWD/OLDPWD 未知），以及声明前缀（declarationPrefix）模式下的赋值核对；写入受保护变量即 too-complex。
 */
function applyCommandVariableWrites(
  argv,
  envVars,
  varScope,
  bareAssignmentNames,
  hasPriorCommands,
  hasArithmetic,
) {
  let writtenNames = [];
  let assignedNames = [];
  let l = (p, g = true) => {
    let match = p.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (match) {
      writtenNames.push(match[0]);
      if (g) assignedNames.push(match[0]);
    }
  };
  let restArgv = argv;
  let y = false;
  let x;
  let u = [];
  for (;;) {
    let p = restArgv[0];
    if (p === undefined) break;
    if (COMMAND_WRAPPER_BUILTINS.has(p)) {
      if ((x === "builtin" || x === "command") && p !== "builtin" && p !== "command") {
        if (p === "noglob" && !y)
          return {
            kind: "too-complex",
            reason: `'${x} noglob' runs the wrapped command on zsh (for 'command', under POSIX_BUILTINS) but not bash \u2014 cannot statically model whether it executes`,
            nodeType: "command",
          };
        y = true;
      }
      let g = 1;
      while (g < restArgv.length && /^-[-pvV]*$/.test(restArgv[g])) {
        if (
          /[vV]/.test(restArgv[g]) ||
          (p === "builtin" && /p/.test(restArgv[g]) && isStagedPumpkinEnabled())
        )
          y = true;
        g++;
      }
      restArgv = restArgv.slice(g);
      x = p;
    } else if (p === "!") {
      if (x === "builtin" || x === "command") y = true;
      restArgv = restArgv.slice(1);
      x = undefined;
    } else if (/^[A-Za-z_]\w*(\[[^\]]*\])?\+?=/.test(p)) {
      if (x !== undefined && ASSIGNING_WRAPPERS.has(x) && isStagedPumpkinEnabled()) {
        if (!(SAFE_PREFIX_ASSIGN_RE.test(p) && !containsAnyPlaceholder(p)) && !y) {
          let b = wrappedGlobResult(x, p);
          if (b) return b;
        }
        y = true;
      }
      let g = writtenNames.length;
      l(p);
      u.push({
        word: p,
        target: writtenNames.length > g ? g : undefined,
      });
      restArgv = restArgv.slice(1);
      x = undefined;
    } else {
      if (
        x !== undefined &&
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
  if (commandName === undefined) for (let envVar of envVars) l(envVar.name);
  else if (DECLARATION_BUILTINS.has(commandName)) {
    let p = false;
    for (let k = 1; k < restArgv.length; k++) {
      let _ = restArgv[k];
      if (!p && _ === "--") {
        p = true;
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
  } else if (commandName === "read" && isBashReadingMode());
  else if (commandName === "read") {
    let p = 1;
    let g = false;
    let _ = false;
    while (p < restArgv.length) {
      let b = restArgv[p];
      if (!g && b === "--") {
        g = true;
        p++;
        continue;
      }
      if (!g && b.startsWith("-")) {
        if (READ_DATA_FLAGS.has(b)) {
          if (READ_FLAGS_WITH_CHECKED_OPERAND.has(b)) {
            let R = checkZshReadDivergence(restArgv[p + 1], b, false, varScope, bareAssignmentNames);
            if (R) return R;
          }
          p += 2;
          continue;
        }
        let A = false;
        for (let idx = 1; idx < b.length; idx++) {
          let T = b[idx];
          if (T === "a" || T === "A") {
            let v = idx < b.length - 1 ? b.slice(idx + 1) : restArgv[p + 1];
            if (v) {
              let de = checkZshReadDivergence(v, b.slice(0, idx + 1), true, varScope, bareAssignmentNames);
              if (de) return de;
              l(v);
              _ = true;
            }
            A = idx === b.length - 1;
            break;
          }
          if (READ_DATA_FLAGS.has("-" + T)) {
            A = idx === b.length - 1;
            if (A && READ_FLAGS_WITH_CHECKED_OPERAND.has("-" + T)) {
              let v = checkZshReadDivergence(restArgv[p + 1], b, false, varScope, bareAssignmentNames);
              if (v) return v;
            }
            break;
          }
        }
        p += A ? 2 : 1;
        continue;
      }
      let k = checkZshReadDivergence(b, null, true, varScope, bareAssignmentNames);
      if (k) return k;
      l(b);
      _ = true;
      p++;
    }
    if (!_) writtenNames.push("REPLY");
  } else if (commandName === "printf")
    for (let k = 1; k < restArgv.length; k++) {
      let g = restArgv[k];
      if (g === "--" || !g.startsWith("-")) break;
      if (g === "-v") {
        if (restArgv[k + 1]) l(restArgv[k + 1]);
        k++;
        continue;
      }
      if (g.startsWith("-v")) l(g.slice(2));
    }
  else if (commandName === "getopts") {
    let p = restArgv[1] === "--" ? 1 : 0;
    if (restArgv[2 + p]) l(restArgv[2 + p]);
    writtenNames.push("OPTARG");
    markVarUnknown(varScope, "OPTIND");
  } else if (commandName === "wait")
    for (let k = 1; k < restArgv.length; k++) {
      let g = restArgv[k];
      if (g === "--" || !g.startsWith("-")) break;
      for (let k_2 = 1; k_2 < g.length; k_2++)
        if (g[k_2] === "p") {
          if (k_2 < g.length - 1) l(g.slice(k_2 + 1));
          else if (restArgv[k + 1]) {
            l(restArgv[k + 1]);
            k++;
          }
          break;
        }
    }
  else if (!y && (commandName === "unset" || commandName === "unsetenv")) {
    let p = false;
    let g = false;
    for (let idx = 1; idx < restArgv.length; idx++) {
      let name = restArgv[idx];
      if (name.startsWith("-")) {
        if (g)
          return {
            kind: "too-complex",
            reason: `'unset \u2026 ${name}' (wrapped form) \u2014 flag after name; getopt stops at first non-option`,
            nodeType: "command",
          };
        if (name !== "-f" && name !== "-v")
          return {
            kind: "too-complex",
            reason: `'unset ${name}' (wrapped form) \u2014 flag other than -f/-v (zsh -m pattern-unset, bash -n nameref) cannot be statically modelled`,
            nodeType: "command",
          };
        if (name === "-f") p = true;
        continue;
      }
      g = true;
      if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name))
        return {
          kind: "too-complex",
          reason: `'unset ${name}' (wrapped form) \u2014 non-identifier operand may pathname-expand; cannot statically know which var is unset`,
          nodeType: "command",
        };
      if (p || commandName === "unsetenv") {
        let k = uncertainValueResult(
          varScope.get(name),
          `'${name}' no longer has a statically known value at this unset (wrapped form) \u2014 cannot verify what the command leaves behind`,
          "command",
        );
        if (k !== null) return k;
        continue;
      }
      if (isAssignmentNameUnsafeForSandbox(name))
        return {
          kind: "too-complex",
          reason: `'unset' targets shell variable ${name} (exec-influencing / integer-attr / IFS / PS4)`,
          nodeType: "command",
        };
      if (hasArithmetic) {
        let k = divergentShapeResult(
          `'unset ${name}' is in a command carrying an expansion that can fail at runtime \u2014 whether the name is cleared cannot be statically verified`,
        );
        if (k) return k;
      }
      recordUnset(varScope, name, hasPriorCommands);
    }
  } else if (commandName === "print")
    for (let idx = 1; idx < restArgv.length; idx++) {
      let g = restArgv[idx];
      if (g === "--" || g === "-" || !g.startsWith("-")) break;
      let _ = false;
      for (let idx_2 = 1; idx_2 < g.length; idx_2++) {
        let k = g[idx_2];
        if (k === "v") {
          let A = idx_2 < g.length - 1 ? g.slice(idx_2 + 1) : restArgv[idx + 1];
          if (A) l(A);
          _ = idx_2 === g.length - 1;
          break;
        }
        if (OPTION_LETTERS_TAKING_ARGUMENT.has("-" + k)) {
          _ = idx_2 === g.length - 1;
          break;
        }
      }
      if (_) idx++;
    }
  else if (commandName === "set")
    for (let k = 1; k < restArgv.length; k++) {
      let g = restArgv[k];
      if (g === "--" || !/^[-+]/.test(g)) break;
      let index = g.indexOf("A", 1);
      if (index === -1) {
        if (g.endsWith("o")) k++;
        continue;
      }
      if (index < g.length - 1) l(g.slice(index + 1));
      else if (restArgv[k + 1]) l(restArgv[k + 1]);
      break;
    }
  else if (commandName === "mapfile" || commandName === "readarray") {
    let p = false;
    for (let k = 1; k < restArgv.length; k++) {
      let _ = restArgv[k];
      if (_.startsWith("-")) {
        if (/^-[dnOsuCc]$/.test(_)) k++;
        continue;
      }
      l(_);
      p = true;
    }
    if (!p) writtenNames.push("MAPFILE");
  } else if (
    !y &&
    (commandName === "cd" || commandName === "chdir" || commandName === "pushd" || commandName === "popd")
  ) {
    let p = false;
    if (commandName === "pushd" || commandName === "popd")
      for (let k = 1; k < restArgv.length; k++) {
        let _ = restArgv[k];
        if (_ === "--") break;
        if (hasAnyShortFlagChar(_, "n")) {
          p = true;
          break;
        }
        if (commandName === "popd" && (/^\+0*[1-9]/.test(_) || /^-0+$/.test(_))) {
          p = true;
          break;
        }
      }
    if (!p) {
      markVarUnknown(varScope, "PWD");
      markVarUnknown(varScope, "OLDPWD");
    }
    if (commandName === "pushd" || commandName === "popd") {
      markVarUnknown(varScope, "DIRSTACK");
      markVarUnknown(varScope, "dirstack");
    }
  }
  let d =
    commandName !== undefined && DECLARATION_BUILTINS_ZSH.has(commandName) ? envVars.length + u.length : 0;
  let m = declarationPrefixCount;
  declarationPrefixCount += d;
  if (d > 0 && currentDeclarationPrefix === undefined) {
    let p =
      commandName === "export" ||
      commandName === "readonly" ||
      restArgv.some((restArg) => /^-[A-Za-z]*[xr]/.test(restArg));
    let g = new Set();
    for (let _ of p ? restArgv.slice(1) : []) {
      let match = /^[A-Za-z_]\w*/.exec(_);
      if (match !== null) g.add(match[0]);
    }
    declarationPrefixBashKeeps = [
      ...(declarationPrefixBashKeeps ?? []),
      ...envVars.map((envVar) => g.has(envVar.name)),
      ...u.map(({ word }) => g.has(/^[A-Za-z_]\w*/.exec(word)?.[0] ?? "")),
    ];
  }
  if (d > 0 && currentDeclarationPrefix !== undefined) {
    let p = {
      kind: "too-complex",
      reason: `A variable set in front of ${commandName} in this command can't be checked before it runs`,
    };
    let g = [...envVars];
    for (let { word } of u) {
      let match = /^([A-Za-z_]\w*)(\+?)=([^]*)$/.exec(word);
      if (match === null) return p;
      let [, k = "", A, R = ""] = match;
      g.push(
        A === "+"
          ? {
              name: k,
              value: R,
              isAppend: true,
            }
          : {
              name: k,
              value: R,
            },
      );
    }
    if (currentDeclarationPrefix.length < m + g.length || (u.length > 0 && g.length > 1)) return p;
    for (let k = u.length - 1; k >= 0; k--) {
      let target = u[k]?.target;
      if (target !== undefined) writtenNames.splice(target, 1);
    }
    for (let [_, b] of g.entries()) {
      if (currentDeclarationPrefix[m + _] !== true) continue;
      let k = b.isAppend ? varScope.get(b.name) : "";
      let A = k === undefined ? undefined : stripUncertainPrefix(k);
      if (containsAnyPlaceholder(b.value) || isAssignmentNameUnsafeForSandbox(b.name)) return p;
      if (A === undefined || containsAnyPlaceholder(A))
        return p.kind === "too-complex" &&
          !readingDivergentShapes &&
          k?.includes(UNCERTAIN_VAR_PLACEHOLDER) === true
          ? {
              ...p,
              divergentShape: true,
            }
          : p;
      if (hasArithmetic) {
        let T = divergentShapeResult(
          `'${b.name}' is appended to by a command carrying an expansion that can fail at runtime \u2014 whether the append happens cannot be statically verified`,
        );
        if (T) return T;
      }
      let R = (A === k ? "" : UNCERTAIN_PREFIX) + A + b.value;
      varScope.set(b.name, R);
      declarationPrefixValues.set(b.name, A + b.value);
    }
  }
  if (
    commandName !== undefined &&
    envVars.length > 0 &&
    !(d > 0 && currentDeclarationPrefix !== undefined) &&
    POSIX_SPECIAL_BUILTINS_NONEVAL.has(commandName)
  )
    for (let envVar of envVars) l(envVar.name);
  for (let writtenName of writtenNames) {
    if (isAssignmentNameUnsafeForSandbox(writtenName))
      return {
        kind: "too-complex",
        reason: `'${commandName ?? envVars[0]?.name}' writes shell variable ${writtenName} (exec-influencing / integer-attr / IFS) \u2014 value cannot be statically verified`,
        nodeType: "command",
      };
    markVarUnknown(varScope, writtenName);
  }
  bareAssignmentNames.push(...assignedNames);
  return null;
}
//@ chunk-r01896cg.js:62370-62591 layout
function wrappedGlobResult(e, t) {
  return readingDivergentShapes
    ? null
    : {
        kind: "too-complex",
        reason: `'${e} ${redactPlaceholdersForDisplay(t)}' has a pattern the shell may expand, so this command can't be checked before it runs`,
        nodeType: "command",
        divergentShape: true,
        keepsRemovalVerdict: true,
      };
}
//@ chunk-r01896cg.js:62591-62655 layout
var ASSIGNMENT_WORD_RE = /^([A-Za-z_]\w*)(?:\[[\s\S]*?\])?(\+?)=([\s\S]*)$/;
var RE_EXPANSION_FACTOR = 16;
//@ chunk-r01896cg.js:62655-64008 layout
function checkRedirectReadsPrefixVar(children, command, redirects, commands, varScope, bareAssignmentNames) {
  let i = [...command.envVars];
  let c = argvWordNodes.get(command.argv);
  let l = false;
  for (let [d, m] of command.argv.entries()) {
    let [, p, g, _] = ASSIGNMENT_WORD_RE.exec(m) ?? [];
    let [, b] = /^([A-Za-z_]\w*)\[/.exec(m) ?? [];
    if (p !== undefined && _ !== undefined)
      i.push({
        name: p,
        value: _,
        isAppend: g === "+",
        word: c?.[d],
        isOtherElement: /^\w+\[[1-9]\d*\]/.test(m),
      });
    else if (b !== undefined) {
      i.push({
        name: b,
        value: VAR_PLACEHOLDER,
      });
      l = true;
    } else if (!l && (i.length > command.envVars.length || !/^(?:time|coproc|!|-p|--)$/.test(m))) return null;
  }
  let f = new Set(i.map((d) => d.name));
  let filtered = children.filter(
    (child) =>
      (child?.type === "file_redirect" || child?.type === "herestring_redirect") &&
      findReferencedVar(child, f) !== null,
  );
  if (filtered.length === 0) return null;
  let x = divergentShapeResult(
    "A redirect in this command may read a variable the same command sets, and shells can differ on which value it gets",
  );
  if (x)
    return x.kind === "too-complex"
      ? {
          ...x,
          keepsRemovalVerdict: true,
        }
      : x;
  let varScope_2 = new Map(varScope);
  let h = new Set();
  for (let { name: d, value: m, isAppend, word, isOtherElement } of i) {
    let b = m;
    if (word !== undefined && findReferencedVar(word, h) !== null) {
      let A = [];
      let R = consumeReExpansionBudget(word)
        ? walkArgument(word, A, varScope_2, bareAssignmentNames)
        : undefined;
      b = typeof R === "string" ? ASSIGNMENT_WORD_RE.exec(R)?.[3] : undefined;
      if (b !== undefined) {
        let index = commands.findIndex((command_2) => command_2.argv === command.argv);
        commands.splice(index === -1 ? commands.length : index, 0, ...A);
      }
    }
    if (isOtherElement) continue;
    let k = isAppend ? varScope_2.get(d) : "";
    if (k === undefined || b === undefined) markVarUnknown(varScope_2, d);
    else varScope_2.set(d, k + b);
    h.add(d);
  }
  for (let d of filtered) {
    if (!consumeReExpansionBudget(d)) continue;
    let m = commands.length;
    if (d.type === "file_redirect") {
      let g = walkFileRedirect(d, commands, varScope_2, bareAssignmentNames);
      commands.length = m;
      if (!("kind" in g)) redirects.push(g);
      continue;
    }
    if (walkHerestringRedirect(d, commands, varScope_2, bareAssignmentNames)) commands.length = m;
  }
  return null;
}
//@ chunk-r01896cg.js:64008-64080 layout
function consumeReExpansionBudget(e) {
  if (e.text.length > reExpansionBudget) return false;
  reExpansionBudget -= e.text.length;
  return true;
}
//@ chunk-r01896cg.js:64080-66702 fingerprint = walkCommand (0.699)
/**
 * 把一个 command 节点变成 SimpleCommand：逐子节点处理前缀赋值（同命令内前缀互相引用即拒绝）、command_name（环境清洗开启时命令名不能是变量）、参数（以 - 开头且含运行期内容拒绝）、$var、file/herestring 重定向；之后检查重定向读前缀变量、按命令更新变量作用域（applyCommandVariableWrites）。text 字段在含 $ 或换行时用重新加引号的 argv 重建。
 */
function walkCommand(node, extraRedirects, innerCommands, varScope, bareAssignmentNames) {
  let substitutionCountBefore = substitutionCount;
  let carveOutCountBefore = quoteScanCarveOutCount;
  let c = innerCommands.length;
  let argv = [];
  let argvNodes = [];
  if (readingDivergentShapes) argvWordNodes.set(argv, argvNodes);
  let argvUnquotedGlob = [];
  let envVars = [];
  let redirects = [...extraRedirects];
  let scopeBeforeRedirects = node.children.some((child) => child && REDIRECT_NODE_TYPES.has(child.type))
    ? new Map(varScope)
    : null;
  let d = 0;
  let hasArithmetic = false;
  for (let child of node.children) {
    if (!child) continue;
    let A = containsArithmeticExpansion(child);
    switch (((hasArithmetic ||= A), child.type)) {
      case "variable_assignment": {
        if (envVars.length > 0) {
          let referencedVar = findReferencedVar(child, new Set(envVars.map((envVar) => envVar.name)));
          if (referencedVar !== null)
            return {
              kind: "too-complex",
              reason: `Env-prefix value references \`$${referencedVar}\` assigned by an earlier env-prefix in the same command \u2014 runtime sees the earlier assignment, static analysis does not`,
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
        envVars.push(
          R.isAppend
            ? {
                name: R.name,
                value: R.value,
                isAppend: true,
              }
            : {
                name: R.name,
                value: R.value,
              },
        );
        if (A) d = envVars.length - 1;
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
        argv.push(T);
        argvNodes.push(R);
        argvUnquotedGlob.push(hasUnquotedGlob(R.text) || nodeHasUnquotedGlob(R));
        break;
      }
      case "word":
      case "number":
      case "raw_string":
      case "string":
      case "concatenation":
      case "arithmetic_expansion": {
        let arg = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
        if (typeof arg !== "string") return arg;
        if (/^--?[\nA-Za-z0-9_]/.test(arg) && containsAnyPlaceholder(arg))
          return {
            kind: "too-complex",
            reason: "Argument starting with `-` contains runtime-determined content",
            nodeType: child.type,
          };
        argv.push(arg);
        argvNodes.push(child);
        argvUnquotedGlob.push(hasUnquotedGlob(child.text) || nodeHasUnquotedGlob(child));
        break;
      }
      case "simple_expansion": {
        substitutionCount++;
        let v = resolveSimpleExpansion(child, varScope, false);
        if (typeof v !== "string") return v;
        argv.push(v);
        argvNodes.push(child);
        argvUnquotedGlob.push(true);
        break;
      }
      case "file_redirect": {
        let R = envVars[0]?.name;
        if (R !== undefined && A) {
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
        if (R !== undefined && A) {
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
      {
        argv,
        envVars,
      },
      redirects,
      innerCommands,
      varScope,
      bareAssignmentNames,
    );
    if (k) return k;
  }
  let p = envVars[0]?.name;
  if (d > 0 && p !== undefined) {
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
      : k;
  let text =
    /\$[A-Za-z_]/.test(node.text) ||
    node.text.includes(`
`)
      ? [
          ...envVars.map((envVar) => `${envVar.name}=${g(envVar.value)}`),
          ...argv.map((arg, A) => g(arg, A)),
        ].join(" ")
      : node.text;
  let hasUnquotedGlob_2 = hasUnquotedGlob(node.text);
  return {
    kind: "simple",
    commands: [
      {
        argv,
        envVars,
        redirects,
        text,
        hasUnquotedGlob: hasUnquotedGlob_2,
        argvSourceLiteral: substitutionCount === substitutionCountBefore,
        carveOutMayDesyncQuoteScan: quoteScanCarveOutCount !== carveOutCountBefore,
        argvUnquotedGlob,
      },
    ],
    bareAssignmentNames: [],
  };
}
//@ chunk-r01896cg.js:66702-66715 layout
var GLOB_CHARS = "*?[";
//@ chunk-r01896cg.js:66715-67046 layout
function nodeHasUnquotedGlob(child) {
  switch (child.type) {
    case "word":
    case "number":
      for (let i = 0; i < child.text.length; i++)
        if (child.text[i] === "\\") i++;
        else if (GLOB_CHARS.includes(child.text[i])) return true;
      return false;
    case "string":
    case "raw_string":
    case "simple_expansion":
    case "arithmetic_expansion":
      return false;
    case "concatenation":
      return child.children.some((child) => child !== null && nodeHasUnquotedGlob(child));
    default:
      return true;
  }
}
//@ chunk-r01896cg.js:67046-67903 layout
/**
 * 递归分析 $(…)：要求子节点之间只有空白/分号/续行（否则“bytes no parsed node accounts for”），内部命令以复制的作用域收集进同一命令列表，空替换补一条 true 命令。
 */
function walkCommandSubstitution(node, innerCommands, varScope, bareAssignmentNames) {
  if (allowPlainUnquotedHeredocs && collectCommandSubstitution(node, "heredoc_redirect"))
    return tooComplex(node);
  let innerScope = new Map(varScope);
  let n = innerCommands.length;
  let i = false;
  {
    let buffer = Buffer.from(node.text, "utf8");
    let l = (x) => x === 32 || x === 9 || x === 10 || x === 13 || x === 59 || x === 38;
    let f = (x, u) => {
      let h = x;
      while (h < u) {
        let d = buffer[h];
        if (l(d)) h++;
        else if (d === 92 && (buffer[h + 1] === 10 || (buffer[h + 1] === 13 && buffer[h + 2] === 10)))
          h += buffer[h + 1] === 13 ? 3 : 2;
        else return false;
      }
      return true;
    };
    let y = 0;
    for (let child of node.children) {
      if (!child) continue;
      let u = child.startIndex - node.startIndex;
      if (!f(y, u))
        return {
          kind: "too-complex",
          reason: "command substitution contains bytes no parsed node accounts for",
        };
      y = child.endIndex - node.startIndex;
    }
    if (!f(y, buffer.length))
      return {
        kind: "too-complex",
        reason: "command substitution contains bytes no parsed node accounts for",
      };
  }
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "$(" || child.type === "`" || child.type === ")") continue;
    if (child.type !== "comment") i = true;
    let commands = collectCommands(child, innerCommands, innerScope, bareAssignmentNames);
    if (commands) return commands;
  }
  if (i && innerCommands.length === n) pushTrueCommand(innerCommands, node);
  return null;
}
//@ chunk-r01896cg.js:67903-70413 fingerprint = walkArgument (0.634)
/**
 * 把参数节点解析成字符串：word（拒绝花括号展开、转义花括号、漏解析的 $ 或反引号、被吞的引号）、number、raw_string、string、concatenation（拒绝子节点间遗漏字节、zsh $name[expr]）、算术展开（返回 VAR_PLACEHOLDER）、$var；其余 too-complex。
 */
function walkArgument(node, innerCommands, varScope, bareAssignmentNames) {
  if (!node)
    return {
      kind: "too-complex",
      reason: "Null argument node",
    };
  switch (node.type) {
    case "word": {
      if (BRACE_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains brace expansion syntax",
          nodeType: "word",
          differential: true,
        };
      if (BRACE_ESCAPED_CLOSE_RE.test(node.text) || BRACE_ESCAPED_OPEN_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace body contains backslash-escaped brace",
          nodeType: "word",
          differential: true,
        };
      if (WORD_LEAF_EXPANSION_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Word contains unescaped ` or $ \u2014 parser missed expansion",
          nodeType: "word",
          differential: true,
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
          differential: true,
        };
      if (BRACE_ESCAPED_CLOSE_RE.test(node.text) || BRACE_ESCAPED_OPEN_RE.test(node.text))
        return {
          kind: "too-complex",
          reason: "Brace body contains backslash-escaped brace",
          nodeType: "concatenation",
          differential: true,
        };
      let result = "";
      let n = false;
      let startIndex = node.startIndex;
      for (let k = 0; k < node.children.length; k++) {
        let l = node.children[k];
        if (!l) continue;
        if (l.startIndex > startIndex)
          return {
            kind: "too-complex",
            reason:
              "Concatenation has unparsed bytes between children \u2014 parser dropped content that shell will see",
            nodeType: "concatenation",
          };
        startIndex = l.endIndex;
        if (l.type === "word" && l.text.includes("{")) n = true;
        if (
          (l.type === "simple_expansion" || l.type === "expansion") &&
          (node.children[k + 1]?.text.startsWith("[") || /^:[a-zA-Z&]/.test(node.children[k + 1]?.text ?? ""))
        )
          return {
            kind: "too-complex",
            reason: "zsh $name[expr] / $name:mod in bare concatenation \u2014 recursive eval",
            nodeType: "concatenation",
            differential: true,
          };
        let part = walkArgument(l, innerCommands, varScope, bareAssignmentNames);
        if (typeof part !== "string") return part;
        result += part;
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
          differential: true,
        };
      if (ZSH_EQUALS_EXPANSION_RE.test(result))
        return {
          kind: "too-complex",
          reason: "zsh =cmd expansion (post-collapse)",
          nodeType: "concatenation",
          differential: true,
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
      substitutionCount++;
      return resolveSimpleExpansion(node, varScope, false);
    default:
      return tooComplex(node);
  }
}
//@ chunk-r01896cg.js:70413-73069 fingerprint = walkString (0.51)
/**
 * 解析双引号字符串：拼接 string_content，处理 $（拒绝 $[...]、zsh $+ 等前缀标志）、$(cat <<EOF) 安全内联、其他命令替换（递归收集并以 CMDSUB_PLACEHOLDER 代替）、$var（按作用域取值）、算术展开；子节点间间隙含反引号时拒绝。
 */
function walkString(node, innerCommands, varScope, bareAssignmentNames) {
  let result = "";
  let cursor = -1;
  let i = false;
  let c = false;
  let l = false;
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
          differential: true,
        };
      if (str.length > 0) {
        result += str;
        c = true;
      }
    }
    switch (((cursor = child.endIndex), child.type)) {
      case '"':
        cursor = child.endIndex;
        break;
      case "string_content":
        result += child.text.replace(/\\\n/g, "").replace(/\\([$`"\\])/g, "$1");
        c = true;
        break;
      case DOLLAR: {
        let index = node.children.indexOf(child);
        let x = node.children[index + 1];
        if (x?.type === "string_content") {
          if (x.text.startsWith("["))
            return {
              kind: "too-complex",
              reason: "Legacy $[...] arithmetic inside double-quotes \u2014 recursive subscript eval",
              nodeType: "string",
              differential: true,
            };
          if (/^[+^=~]/.test(x.text))
            return {
              kind: "too-complex",
              reason: "zsh $+/$^/$=/$~ prefix-flag expansion \u2014 value defeats downstream content checks",
              nodeType: "string",
              differential: true,
            };
          let u = node.children[index - 1];
          if (
            /^:[a-zA-Z&]/.test(x.text) &&
            u?.type === "simple_expansion" &&
            u.endIndex === child.startIndex &&
            u.children.some((child) => child?.type === "special_variable_name")
          )
            return {
              kind: "too-complex",
              reason: 'zsh "$name[expr]" / "$name:mod" inside double-quotes \u2014 recursive eval',
              nodeType: "string",
              differential: true,
            };
        }
        result += DOLLAR;
        c = true;
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
            catHeredocInlineCount++;
            result +=
              `
` + CMDSUB_PLACEHOLDER;
            c = true;
            break;
          }
          catHeredocInlineCount++;
          result += trimmed;
          c = true;
          break;
        }
        let err = walkCommandSubstitution(child, innerCommands, varScope, bareAssignmentNames);
        if (err) return err;
        substitutionCount++;
        result += CMDSUB_PLACEHOLDER;
        i = true;
        break;
      }
      case "simple_expansion": {
        substitutionCount++;
        let err = resolveSimpleExpansion(child, varScope, true);
        if (typeof err !== "string") return err;
        {
          let x = node.children[node.children.indexOf(child) + 1];
          let any = child.children.some((child) => child?.type === "special_variable_name");
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
              differential: true,
            };
        }
        if (containsAnyPlaceholder(err)) i = true;
        else if (err !== "") c = true;
        else l = true;
        result += err;
        break;
      }
      case "arithmetic_expansion": {
        let err = walkArithmetic(child);
        if (err) return err;
        substitutionCount++;
        result += VAR_PLACEHOLDER;
        i = true;
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
        differential: true,
      };
    return sliced;
  }
  return result;
}
//@ chunk-r01896cg.js:73069-73190 layout
var ARITH_LITERAL_TOKEN_RE =
  /^(?:[0-9]+|0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[-+*/%^&|~!<>=?:(),]+|<<|>>|\*\*|&&|\|\||[<>=!]=|\$\(\(|\)\))$/;
//@ chunk-r01896cg.js:73190-73619 fingerprint = walkArithmetic (1)
/**
 * 校验算术展开：叶子只能是数字字面量或运算符，引用变量即 too-complex。
 */
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
function pushTrueCommand(commands, node) {
  commands.push({
    argv: ["true"],
    envVars: [],
    redirects: [],
    text: node.text,
    hasUnquotedGlob: hasUnquotedGlob(node.text),
  });
}
//@ chunk-r01896cg.js:73721-73834 layout
function containsArithmeticExpansion(child) {
  if (child.type === "arithmetic_expansion") return true;
  for (let child_2 of child.children) if (child_2 && containsArithmeticExpansion(child_2)) return true;
  return false;
}
//@ chunk-r01896cg.js:73834-74513 fingerprint = extractSafeCatHeredoc (0.925)
/**
 * 识别 $(cat <<'EOF' … EOF) 这种安全的字面量替换：只含一个 cat 命令和一个合法 heredoc 时返回正文；正文含 /proc/*\/environ 或危险 awk 程序时返回 'DANGEROUS'；否则 null。
 */
function extractSafeCatHeredoc(subNode) {
  let stmt = null;
  for (let child of subNode.children) {
    if (!child) continue;
    if (child.type === "$(" || child.type === ")") continue;
    if (child.type === "redirected_statement" && stmt === null) stmt = child;
    else return null;
  }
  if (!stmt) return null;
  let sawCat = false;
  let body = null;
  for (let child of stmt.children) {
    if (!child) continue;
    if (child.type === "command") {
      let cmdChildren = child.children.filter((child) => child);
      if (cmdChildren.length !== 1) return null;
      let nameNode = cmdChildren[0];
      if (nameNode?.type !== "command_name" || nameNode.text !== "cat") return null;
      sawCat = true;
    } else if (child.type === "heredoc_redirect") {
      if (walkHeredocRedirect(child) !== null) return null;
      for (let hc of child.children) {
        if (hc?.type === "<<-") return null;
        if (hc?.type === "heredoc_body") body = hc.text;
      }
    } else return null;
  }
  if (!sawCat || body === null) return null;
  if (PROC_ENVIRON_RE.test(body)) return "DANGEROUS";
  if (awkProgramHasExecBridge(body) !== false) return "DANGEROUS";
  return body;
}
//@ chunk-r01896cg.js:74513-76097 fingerprint = walkVariableAssignment (0.966)
/**
 * 解析 NAME=value / NAME+=value：命令替换值记为 CMDSUB_PLACEHOLDER，$var 按作用域解析，其余经 walkArgument；返回 {name, value, isAppend} 或 too-complex。
 */
function walkVariableAssignment(node, innerCommands, varScope, bareAssignmentNames) {
  let name = null;
  let value = "";
  let isAppend = false;
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "variable_name") name = child.text;
    else if (child.type === "=" || child.type === "+=") {
      isAppend = child.type === "+=";
      continue;
    } else if (child.type === "command_substitution") {
      let err = walkCommandSubstitution(child, innerCommands, varScope, bareAssignmentNames);
      if (err) return err;
      value = CMDSUB_PLACEHOLDER;
    } else if (child.type === "simple_expansion") {
      let v = resolveSimpleExpansion(child, varScope, true);
      if (typeof v !== "string") return v;
      value = v;
    } else {
      let v = walkArgument(child, innerCommands, varScope, bareAssignmentNames);
      if (typeof v !== "string") return v;
      value = v;
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
  return {
    name,
    value,
    isAppend,
  };
}
//@ chunk-r01896cg.js:76097-76691 facade-majority
/**
 * bash/zsh 会隐式改写的特殊变量集合（_、RANDOM、SECONDS、REPLY、PIPESTATUS、BASH_REMATCH、MATCH、OPTARG、PS1 等），这些变量的值不能当作已跟踪的常量。
 */
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
//@ chunk-r01896cg.js:76691-77367 fingerprint = resolveSimpleExpansion (0.525)
/**
 * 解析 $var：作用域里有值时返回值（不确定值→too-complex+divergentShape；动态变量只在引号内且是安全环境变量时返回占位符；裸用时空值或含空白/通配的值拒绝）；HOME 取本机 homedir；引号内的安全环境变量与特殊变量返回 VAR_PLACEHOLDER；其余 too-complex。
 */
function resolveSimpleExpansion(node, varScope, insideString) {
  let varName = null;
  let isSpecial = false;
  for (let child of node.children) {
    if (child?.type === "variable_name") {
      varName = child.text;
      break;
    }
    if (child?.type === "special_variable_name") {
      varName = child.text;
      isSpecial = true;
      break;
    }
  }
  if (varName === null) return tooComplex(node);
  let trackedValue = varScope.get(varName);
  let i = trackedValue === undefined ? undefined : stripUncertainPrefix(trackedValue);
  if (i !== undefined) {
    if (i.includes(UNCERTAIN_VAR_PLACEHOLDER)) {
      let c = tooComplex(node);
      return c.kind === "too-complex" && !readingDivergentShapes
        ? {
            ...c,
            divergentShape: true,
          }
        : c;
    }
    if (BASH_IMPLICITLY_REBOUND_VARS.has(varName))
      return insideString && SAFE_ENV_VARS.has(varName) && varName !== "BASHPID"
        ? VAR_PLACEHOLDER
        : tooComplex(node);
    if (containsAnyPlaceholder(i)) {
      if (!insideString) return tooComplex(node);
      usedAssignedValue ||= i !== VAR_PLACEHOLDER && i !== CMDSUB_PLACEHOLDER;
      return i;
    }
    if (!insideString) {
      if (i === "") return tooComplex(node);
      if (BARE_VAR_UNSAFE_RE.test(i)) return tooComplex(node);
    }
    usedAssignedValue = true;
    return i;
  }
  if (varName === "HOME") {
    let c = homedir();
    if (!insideString && (c === "" || BARE_VAR_UNSAFE_RE.test(c))) return tooComplex(node);
    return c;
  }
  if (insideString) {
    if (SAFE_ENV_VARS.has(varName)) return VAR_PLACEHOLDER;
    if (isSpecial && (SPECIAL_VAR_NAMES.has(varName) || /^[0-9]+$/.test(varName))) return VAR_PLACEHOLDER;
  }
  return tooComplex(node);
}
//@ chunk-r01896cg.js:77367-77392 layout
function markLoopWritesUnknown(varScope, node) {
  markWrittenVarsUnknown(node, varScope);
}
//@ chunk-r01896cg.js:77392-77739 layout
/**
 * later 轮次下重新遍历循环体（嵌套超过 MAX_LOOP_NESTING=5 即 too-complex），返回循环中值被改变的变量名；保存/恢复相关模块级状态。
 */
function collectLoopWrites(loopNode, commands, varScope, bareAssignmentNames) {
  if (!isLaterLoopPass || loopNode === currentLoopNode) return [];
  if (loopDepth >= MAX_LOOP_NESTING)
    return {
      kind: "too-complex",
      reason: "Loops nested too deeply to follow the variables they change",
      nodeType: loopNode.type,
    };
  let o = new Map(varScope);
  let n = currentLoopNode;
  let i = usedAssignedValue;
  let c = sawUncertainWrite;
  let l = declarationPrefixCount;
  let f = declarationPrefixBashKeeps;
  let y = declarationPrefixValues;
  let x = prefixAssignInBranch;
  declarationPrefixValues = new Map(y);
  currentLoopNode = loopNode;
  loopDepth++;
  let commands_2 = collectCommands(loopNode, [...commands], o, [...bareAssignmentNames]);
  loopDepth--;
  currentLoopNode = n;
  usedAssignedValue = i;
  sawUncertainWrite = c;
  declarationPrefixCount = l;
  declarationPrefixBashKeeps = f;
  declarationPrefixValues = y;
  prefixAssignInBranch = x;
  return commands_2 ?? [...varScope.keys()].filter((key) => o.get(key) !== varScope.get(key));
}
//@ chunk-r01896cg.js:77739-78254 layout
function markUnsetOperandsUnknown(e, varScope) {
  let r = () => {
    for (let key of varScope.keys()) markVarUnknown(varScope, key);
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
      markVarUnknown(varScope, s.text.replace(/\\/g, ""));
      continue;
    }
    if (s.type === "word") {
      if (s.text.startsWith("-")) {
        if (s.text === "--" || /^-[fvn]+$/.test(s.text)) continue;
        r();
        continue;
      }
      if (/^\\?[A-Za-z_][A-Za-z0-9_]*$/.test(s.text)) {
        markVarUnknown(varScope, s.text.replace(/^\\/, ""));
        continue;
      }
    }
    r();
  }
}
//@ chunk-r01896cg.js:78254-78693 layout
function staticWordValue(child) {
  if (!child) return null;
  switch (child.type) {
    case "word":
    case "number":
      return child.text.replace(/\\(.)/g, "$1");
    case "raw_string":
      return child.text.slice(1, -1);
    case "string": {
      let filtered = child.children.filter((child) => child && child.type !== '"');
      if (filtered.length === 0) return "";
      if (filtered.length === 1 && filtered[0]?.type === "string_content") return filtered[0].text;
      return null;
    }
    case "concatenation": {
      let t = "";
      for (let child_2 of child.children) {
        let s = staticWordValue(child_2);
        if (s === null) return null;
        t += s;
      }
      return t;
    }
    default:
      return null;
  }
}
//@ chunk-r01896cg.js:78693-81485 layout
/**
 * 遍历子树，把可能被写入的变量在作用域中标为未知（赋值、for 变量、read/mapfile/unset、包装命令中的赋值等；跳过函数定义/子 shell/替换与后台命令）。用于循环与 while 条件。
 */
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
    for (let child of node.children) if (child && !SEPARATOR_TYPES.has(child.type)) r = child;
    if (r) markWrittenVarsUnknown(r, varScope);
    return;
  }
  if (node.type === "list" || node.type === "program") {
    let children = node.children;
    for (let i = 0; i < children.length; i++) {
      let o = children[i];
      if (!o || SEPARATOR_TYPES.has(o.type)) continue;
      let n = i + 1;
      while (n < children.length && !children[n]) n++;
      if (children[n]?.type === "&") continue;
      markWrittenVarsUnknown(o, varScope);
    }
    return;
  }
  if (node.type === "variable_assignment") {
    for (let child of node.children)
      if (child?.type === "variable_name") {
        markVarUnknown(varScope, child.text);
        break;
      }
  }
  if (node.type === "for_statement") {
    for (let child of node.children)
      if (child?.type === "variable_name") {
        markVarUnknown(varScope, child.text);
        break;
      }
  }
  if (node.type === "unset_command") markUnsetOperandsUnknown(node.children, varScope);
  if (node.type === "command") {
    let r;
    let s;
    let o = [];
    let n = [];
    let i = false;
    for (let child of node.children) {
      if (!child) continue;
      if (child.type === "command_name") {
        s = child;
        r = staticWordValue(child.children[0] ?? child) ?? undefined;
        i = true;
      } else if (
        !i ||
        child.type === "file_redirect" ||
        child.type === "herestring_redirect" ||
        child.type === "heredoc_redirect"
      );
      else {
        o.push(staticWordValue(child) ?? "");
        n.push(child);
      }
    }
    let c = false;
    let l;
    while (r !== undefined && (COMMAND_WRAPPER_BUILTINS.has(r) || r === "!")) {
      if ((l === "builtin" || l === "command") && r !== "builtin" && r !== "command" && r !== "noglob")
        c = true;
      let d = r === "!" ? undefined : r;
      while (o.length > 0) {
        let m = o[0];
        if (/^-[-pvV]*$/.test(m)) {
          if (/[vV]/.test(m) || (d === "builtin" && /p/.test(m) && isStagedPumpkinEnabled())) c = true;
          o.shift();
          n.shift();
        } else if (/^[A-Za-z_]\w*(\[[^\]]*\])?\+?=/.test(m)) {
          if (
            d !== undefined &&
            ASSIGNING_WRAPPERS.has(d) &&
            ((SAFE_PREFIX_ASSIGN_RE.test(m) && !containsAnyPlaceholder(m)) || readingDivergentShapes) &&
            isStagedPumpkinEnabled()
          )
            c = true;
          let p = m.match(/^[A-Za-z_][A-Za-z0-9_]*/)[0];
          markVarUnknown(varScope, p);
          o.shift();
          n.shift();
          d = undefined;
        } else break;
      }
      l = d;
      r = o.shift();
      n.shift();
    }
    let f = o;
    let y = (d) => {
      if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(d)) markVarUnknown(varScope, d);
    };
    if (r === "read" && !isBashReadingMode()) {
      markVarUnknown(varScope, "REPLY");
      let d = 0;
      let m = false;
      while (d < f.length) {
        let p = f[d];
        if (!m && p === "--") {
          m = true;
          d++;
          continue;
        }
        if (!m && p.startsWith("-")) {
          if (READ_DATA_FLAGS.has(p)) {
            d += 2;
            continue;
          }
          let g = false;
          for (let k = 1; k < p.length; k++) {
            let b = p[k];
            if (b === "a" || b === "A") {
              y(k < p.length - 1 ? p.slice(k + 1) : (f[d + 1] ?? ""));
              g = k === p.length - 1;
              break;
            }
            if (READ_DATA_FLAGS.has("-" + b)) {
              g = k === p.length - 1;
              break;
            }
          }
          d += g ? 2 : 1;
          continue;
        }
        y(p);
        d++;
      }
    } else if (r === "mapfile" || r === "readarray") {
      markVarUnknown(varScope, "MAPFILE");
      for (let k = 0; k < f.length; k++) {
        let m = f[k];
        if (m.startsWith("-")) {
          if (/^-[dnOsuCc]$/.test(m)) k++;
          continue;
        }
        y(m);
      }
    } else if (r === "unset" && !c) markUnsetOperandsUnknown(n, varScope);
    let x = s?.children[0];
    let u = x?.type === "word" ? x.text.replace(/\\(.)/g, "$1") : undefined;
    let h =
      u !== undefined &&
      !POSIX_SPECIAL_BUILTINS_NONEVAL.has(u) &&
      !COMMAND_WRAPPER_BUILTINS.has(u) &&
      !(currentDeclarationPrefix === undefined ? DECLARATION_BUILTINS : DECLARATION_BUILTINS_ZSH).has(u);
    for (let child of node.children)
      if (child && (child.type !== "variable_assignment" || !h)) markWrittenVarsUnknown(child, varScope);
    return;
  }
  if (node.type === "declaration_command") {
    for (let child of node.children)
      if (
        child?.type === "string" ||
        child?.type === "raw_string" ||
        child?.type === "word" ||
        child?.type === "number" ||
        child?.type === "concatenation" ||
        child?.type === "variable_name"
      ) {
        let replaced = child.text.replace(/['"\\]/g, "");
        let match = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(replaced);
        if (match) markVarUnknown(varScope, match[1]);
        else {
          let index = replaced.indexOf("=");
          if (index > 0 && replaced.lastIndexOf("$", index - 1) !== -1)
            for (let key of [...varScope.keys()]) markVarUnknown(varScope, key);
        }
      }
  }
  for (let child of node.children) if (child) markWrittenVarsUnknown(child, varScope);
}
//@ chunk-r01896cg.js:81485-81650 layout
function mergeScopeInto(target, branchScope) {
  for (let [r, s] of branchScope) {
    let o = target.get(r);
    if (o !== undefined && o !== s) {
      let n = stripUncertainPrefix(s);
      if (declarationPrefixValues.get(r) === n && stripUncertainPrefix(o) !== n) prefixAssignInBranch = true;
      markVarUnknown(target, r);
    }
  }
  for (let key of target.keys()) if (!branchScope.has(key)) markVarUnknown(target, key);
}
//@ chunk-r01896cg.js:81650-81885 fingerprint = applyVarToScope (1)
/**
 * 把赋值写入变量作用域：分支内或值冲突时标为未知（VAR_PLACEHOLDER），+= 累加，否则覆盖。
 */
function applyVarToScope(varScope, assignment, markUnknown = false) {
  if (markUnknown) {
    markVarUnknown(varScope, assignment.name);
    return;
  }
  if (assignment.isAppend && !varScope.has(assignment.name)) return;
  let s = varScope.get(assignment.name);
  if (
    s !== undefined &&
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
  for (let child of e.children) {
    if (!child) continue;
    if (child.type === "simple_expansion" || child.type === "expansion") return true;
    if (containsExpansionNode(child)) return true;
  }
  return false;
}
//@ chunk-r01896cg.js:82065-82229 layout
function tildeVarName(text) {
  if (text === "~" || text.startsWith("~/")) return "HOME";
  if (text === "~+" || text.startsWith("~+/")) return "PWD";
  if (text === "~-" || text.startsWith("~-/")) return "OLDPWD";
  return null;
}
//@ chunk-r01896cg.js:82229-82512 layout
function findReferencedVar(child, t) {
  let r = child.type === "variable_assignment";
  for (let child_2 of child.children) {
    if (!child_2) continue;
    if (child_2.type === "variable_name") {
      if (r) continue;
      if (t.has(child_2.text)) return child_2.text;
    }
    if (child_2.type === "word") {
      let n = tildeVarName(child_2.text);
      if (n !== null && t.has(n)) return n;
    }
    let referencedVar = findReferencedVar(child_2, t);
    if (referencedVar !== null) return referencedVar;
  }
  return null;
}
//@ chunk-r01896cg.js:82512-82897 fingerprint = tooComplex (0.518)
/**
 * 把无法分析的节点转成 too-complex：ERROR 节点按是否为 $+非 ASCII 给不同理由，其他类型用 DANGEROUS_TYPES 中的中文化描述（如“A nested command”）。
 */
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
    reason: `${t === undefined ? "This command" : `${t} in this command`} can't be checked before it runs`,
    nodeType: node.type,
  };
}
//@ chunk-r01896cg.js:82897-83970 fingerprint = DANGEROUS_TYPES (0.478)
/**
 * 节点类型 → 用户可读描述（A variable、A nested command、A here-document…），tooComplex 生成理由时使用。
 */
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
//@ chunk-r01896cg.js:83970-84415 facade-majority
/**
 * 提取文本中所有 ${…} 的内部内容（尊重引号与嵌套）。
 */
function liveBracedExpansionBodies(e) {
  let t = [];
  let r = 0;
  let s = false;
  let o = false;
  while (r < e.length) {
    let n = e[r];
    if (n === "\\" && !s) {
      r += 2;
      continue;
    }
    if (n === "'" && !o) {
      s = !s;
      r++;
      continue;
    }
    if (n === '"' && !s) {
      o = !o;
      r++;
      continue;
    }
    if (!s && n === "$" && e[r + 1] === "{") {
      let i = 1;
      let c = r + 2;
      let l = false;
      let f = false;
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
      t.push(e.slice(r + 2, i === 0 ? c - 1 : c));
      r = c;
      continue;
    }
    r++;
  }
  return t;
}
//@ chunk-r01896cg.js:84415-84691 facade-majority
/**
 * 去掉反斜杠转义（保留会影响引号或展开的转义），单引号区原样保留，用于比较命令文本的字面形态。
 */
function stripLiteralQuotedRegions(e) {
  let t = "";
  let r = false;
  let s = false;
  for (let k = 0; k < e.length; k++) {
    let n = e[k];
    if (r) {
      if (n === "'") {
        r = false;
        t += n;
      }
      continue;
    }
    if (n === "\\" && !r) {
      let i = e[k + 1];
      k++;
      if (i !== undefined && !"$'\"`\\".includes(i)) t += i;
      continue;
    }
    if (n === '"') {
      s = !s;
      t += n;
      continue;
    }
    if (n === "'" && !s) {
      r = true;
      t += n;
      continue;
    }
    t += n;
  }
  return t;
}
//@ chunk-r01896cg.js:84691-84934 facade-majority
/**
 * 去掉引号内的内容和转义字符，只保留未加引号的部分。
 */
function stripQuotedRegions(e) {
  let t = "";
  let r;
  for (let i = 0; i < e.length; i++) {
    let o = e[i];
    if (r === "'") {
      if (o === "'") r = undefined;
      continue;
    }
    if (r === '"') {
      if (o === "\\") i++;
      else if (o === '"') r = undefined;
      continue;
    }
    if (o === "\\") {
      i++;
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
//@ chunk-r01896cg.js:84934-85146 facade-majority
/**
 * 会写变量的 zsh 模块函数名（strftime、zstat、zselect、zftp 等），以及会写变量的 zsh 内建集合（zformat、zparseopts、zstyle、vared……）。
 */
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
];
var ZSH_VAR_WRITING_BUILTINS = new Set([
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
  return e === "stat" && t.some((r) => /^-[gnNolLtTrs]*[AH]/.test(r)) && noteRefusal()
    ? "'stat' with -A or -H \u2014 zsh's stat builtin stores its result in the variable that option names, so a tracked value cannot be statically verified"
    : null;
}
//@ chunk-r01896cg.js:85388-85787 facade-majority = ZSH_DANGEROUS_BUILTINS (0.649)
/**
 * zsh 危险内建集合（zmodload、emulate、sysopen、zpty、ztcp、zf_rm……、setopt、autoload，以及会写变量的内建），checkSemantics 遇到即拒绝；同一语句定义 find 的执行/写类动作集合 FIND_EXEC_ACTIONS（-exec、-delete、-fprint 等）。
 */
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
]);
var FIND_EXEC_ACTIONS = new Set([
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
  return FIND_EXEC_ACTIONS.has(e) && isRmModifierAllowed(e);
}
//@ chunk-r01896cg.js:85828-86374 layout
/**
 * 匹配 find 的 -newerXY 谓词。
 */
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
]);
var FIND_NEWER_XY_RE_2 = /^-newer[aBcm][aBcmt]$/;
var FIND_NEWER_XY_RE = /^-(?:[EHLPXdsx]*D|f|[dsx]*[EHLPX][EHLPXdsx]*f)$/;
var FIND_ACTION_FLAG_RE = /^-[dsx]+f$/;
//@ chunk-r01896cg.js:86374-86431 facade-majority
function findWordTakesOperand(e) {
  return FIND_ARG_TAKING_PREDICATES.has(e) || FIND_NEWER_XY_RE_2.test(e) || FIND_NEWER_XY_RE.test(e);
}
//@ chunk-r01896cg.js:86431-86465 facade-majority
function findWordTakesFlagValue(e) {
  return FIND_NEWER_XY_RE.test(e);
}
//@ chunk-r01896cg.js:86465-86499 facade-majority
function isAmbiguousFindWord(e) {
  return FIND_ACTION_FLAG_RE.test(e);
}
//@ chunk-r01896cg.js:86499-86734 facade-majority = EVAL_LIKE_BUILTINS (0.812)
/**
 * eval 类内建集合（eval、source、.、exec、trap、alias、let、mapfile、bind、complete……），这类命令的参数会被当成代码执行；同时定义 awk 程序名集合，以及 awk 读取程序文件的选项正则。
 */
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
]);
var AWK_NAMES = new Set(["awk", "gawk", "mawk", "nawk"]);
var AWK_PROGRAM_FILE_OPT_RE = /^(?:-[FvW]$|--(?:fie|a$|as))/;
//@ chunk-r01896cg.js:86734-87486 facade-majority
/**
 * 检查 awk 程序文本：system()、命令管道/getline、@load/@include/间接调用、extension()、/inet/ 网络套接字，命中返回理由，否则 false。
 */
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
  return false;
}
//@ chunk-r01896cg.js:87486-87916 facade-majority
/**
 * shell 程序名集合（POSIX shell、busybox/toybox/wsl/su 等 applet、fish/csh、cmd/powershell）、可透明剥离的启动包装（time、command、env、nice、nohup、sudo、doas、timeout……）和不处理的执行包装（watch、setsid、strace、flock、unshare……）。
 */
var POSIX_SHELL_NAMES = new Set(["bash", "sh", "zsh", "dash", "ksh", "mksh", "ash", "hush", "rbash"]);
var APPLET_SHELL_NAMES = new Set(["busybox", "toybox", "wsl", "su", "runuser"]);
var SHELL_PROGRAM_NAMES = new Set([
  ...POSIX_SHELL_NAMES,
  "fish",
  "csh",
  "tcsh",
  "rsh",
  ...APPLET_SHELL_NAMES,
  "cmd",
  "powershell",
  "pwsh",
]);
var TRANSPARENT_LAUNCHER_NAMES = new Set([
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
]);
var UNHANDLED_EXEC_WRAPPERS = new Set([
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
  return ZSH_DANGEROUS_BUILTINS.has(e) && (!ZSH_VAR_WRITING_BUILTINS.has(e) || noteRefusal());
}
//@ chunk-r01896cg.js:87970-88068 facade-majority
/**
 * 命令名是否为 eval 类内建、zsh 危险内建、exec 包装或 rm/rmdir。
 */
function isSandboxAutoAllowUnsafeBase(e) {
  let t = stripPathAndExe(e);
  return (
    EVAL_LIKE_BUILTINS.has(e) ||
    isZshDangerousBuiltin(e) ||
    UNHANDLED_EXEC_WRAPPERS.has(e) ||
    UNHANDLED_EXEC_WRAPPERS.has(t) ||
    t === "rm" ||
    t === "rmdir"
  );
}
//@ chunk-r01896cg.js:88068-89928 facade-majority
/**
 * Bash 语义检查用的常量表：会对下标求值的选项（test -v、printf -v、read -a…）、算术比较运算符、声明类关键字与内建、set -o 安全选项与字母，以及影响命令查找/执行的变量名（PATH、BASH_ENV、LANG、LC_* 等）。
 */
var SUBSCRIPT_EVAL_FLAGS = {
  test: new Set(["-v", "-R", "-t"]),
  "[": new Set(["-v", "-R", "-t"]),
  "[[": new Set(["-v", "-R", "-t"]),
  printf: new Set(["-v"]),
  read: new Set(["-a"]),
  unset: new Set(["-v"]),
  wait: new Set(["-p"]),
};
var TEST_ARITH_CMP_OPS = new Set(["-eq", "-ne", "-lt", "-le", "-gt", "-ge"]);
var TEST_ARITH_NUMERIC_RE = /^-?(0[xX][0-9a-fA-F]+|[0-9]+#[0-9a-zA-Z]+|[0-9]+)$/;
var BARE_SUBSCRIPT_NAME_BUILTINS = new Set(["read", "unset"]);
var DECLARATION_KEYWORDS = new Set([
  "declare",
  "typeset",
  "local",
  "export",
  "readonly",
  "private",
  "float",
  "integer",
]);
var PRINT_PROMPT_FLAG = /^[+-][-+\w]*P/;
var DECLARATION_LIKE_BUILTINS = new Set([
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
]);
var SET_O_SAFE_OPTS = new Set([
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
]);
var SET_O_SAFE_LETTERS = new Set(["e", "u", "x", "f", "C", "v", "m", "b", "E", "T", "h", "P", "n"]);
var EXEC_INFLUENCING_VARS = new Set([
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
]);
var INTEGER_ATTR_DEFAULT_VARS = new Set([
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
function isIntegerVarAssignUnsafe(name, t) {
  if (!INTEGER_ATTR_DEFAULT_VARS.has(name)) return false;
  if (t.includes("[") || t.includes("`") || /\$\(/.test(t) || containsAnyPlaceholder(t)) return true;
  if (!/^(0|[1-9][0-9]{0,17})$/.test(t)) return true;
  return false;
}
//@ chunk-r01896cg.js:90092-90219 facade-majority
/**
 * 是否为影响命令查找/执行的变量（PATH、HOME、IFS 之外的 fpath/cdpath/LANG/LC_* 等，及 LD_*\/DYLD_*\/BASH_FUNC_* 前缀），大小写不敏感。
 */
function isExecInfluencingVar(e) {
  let lower = e.toLowerCase();
  return (
    EXEC_INFLUENCING_VARS.has(lower) ||
    lower.startsWith("ld_") ||
    lower.startsWith("dyld_") ||
    lower.startsWith("bash_func_")
  );
}
//@ chunk-r01896cg.js:90219-90297 facade-majority
/**
 * 受保护 shell 变量：执行影响变量、IFS、PS4、PROMPT4 或整数属性变量。ShellSnapshot 解析导出变量时也用它过滤。
 */
function isAssignmentNameUnsafeForSandbox(e) {
  return (
    isExecInfluencingVar(e) ||
    e === "IFS" ||
    e === "PS4" ||
    e === "PROMPT4" ||
    INTEGER_ATTR_DEFAULT_VARS.has(e)
  );
}
//@ chunk-r01896cg.js:90297-90558 facade-majority
/**
 * read 内建的选项表：带数据参数的选项、需再检查参数的选项、数值参数选项与数值正则；另有带下标变量名正则、组合短选项里吃参数的字母、/proc/*\/environ 正则和“换行后 #”正则。
 */
var READ_DATA_FLAGS = new Set(["-p", "-d", "-n", "-N", "-t", "-u", "-i"]);
var READ_FLAGS_WITH_CHECKED_OPERAND = new Set(["-p", "-t", "-n"]);
var READ_NUMERIC_ARG_FLAGS = new Set(["-t", "-n", "-N"]);
var READ_NUMERIC_OPERAND_RE = /^(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)$/;
var SUBSCRIPTED_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*\[/;
var OPTION_LETTERS_TAKING_ARGUMENT = new Set(["-f", "-C", "-x", "-X", "-u"]);
var PROC_ENVIRON_RE = /\/proc\/.*\/environ/;
var NEWLINE_HASH_RE = /\n\s*#/;
//@ chunk-r01896cg.js:90558-103152 facade-majority = checkSemantics (0.488)
/**
 * 对 simple 结果做语义检查（2.1.88 checkSemantics 的扩展）：先剥去 time/nohup/timeout/nice/env/stdbuf/command/builtin/noglob/xargs 包装（参数不规范即拒绝），再检查命令名为空/占位符/片段、test -v 等下标求值、eval 类内建、zsh 危险内建、awk 危险程序、find -exec 类、shell 关键字作命令名、/proc/*\/environ、换行后 #（kind:'newline-hash'）等。返回 {ok:true} 或 {ok:false, reason, kind?}。
 */
function checkSemantics(commands, options) {
  let r = options?.sourceGlobRecord !== false;
  let s = null;
  for (let cmd of commands) {
    let argv = cmd.argv;
    let i = false;
    for (;;) {
      let u = argv[0] === undefined ? undefined : stripPathAndExe(argv[0]);
      let h =
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
        argv = argv.slice(1);
        if (argv[0] !== undefined && !/^[\w./~+-]+$/.test(argv[0]))
          return {
            ok: false,
            reason: `'${h} ${argv[0]}' can't be checked before it runs`,
          };
      } else if (h === "timeout") {
        let i = 1;
        while (i < argv.length) {
          let arg = argv[i];
          if (arg === "--foreground" || arg === "--preserve-status" || arg === "--verbose") i++;
          else if (/^--(?:kill-after|signal)=[A-Za-z0-9_.+-]+$/.test(arg)) i++;
          else if (
            (arg === "--kill-after" || arg === "--signal") &&
            argv[i + 1] &&
            /^[A-Za-z0-9_.+-]+$/.test(argv[i + 1])
          )
            i += 2;
          else if (arg.startsWith("--"))
            return {
              ok: false,
              reason: `'timeout ${arg}' can't be checked before it runs`,
            };
          else if (arg === "-v") i++;
          else if ((arg === "-k" || arg === "-s") && argv[i + 1] && /^[A-Za-z0-9_.+-]+$/.test(argv[i + 1]))
            i += 2;
          else if (/^-[ks][A-Za-z0-9_.+-]+$/.test(arg)) i++;
          else if (arg.startsWith("-"))
            return {
              ok: false,
              reason: `'timeout ${arg}' can't be checked before it runs`,
            };
          else break;
        }
        if (argv[i] && /^\d+(?:\.\d+)?[smhd]?$/.test(argv[i])) argv = argv.slice(i + 1);
        else if (argv[i])
          return {
            ok: false,
            reason: `timeout duration '${argv[i]}' can't be checked before it runs`,
          };
        else break;
      } else if (h === "nice") {
        if (argv[1] === "-n" && argv[2] && /^-?\d+$/.test(argv[2])) argv = argv.slice(3);
        else if (argv[1] && /^-\d+$/.test(argv[1])) argv = argv.slice(2);
        else if (argv[1] && (/[$(`]/.test(argv[1]) || containsAnyPlaceholder(argv[1])))
          return {
            ok: false,
            reason: `nice argument '${argv[1]}' contains expansion \u2014 cannot statically determine wrapped command`,
          };
        else argv = argv.slice(1);
      } else if (h === "env") {
        let i = 1;
        while (i < argv.length) {
          let arg = argv[i];
          if (arg.includes("=") && !arg.startsWith("-")) i++;
          else if (arg === "-i" || arg === "-0" || arg === "-v") i++;
          else if (arg === "-u" && argv[i + 1]) i += 2;
          else if (arg.startsWith("-"))
            return {
              ok: false,
              reason: `'env ${arg}' can't be checked before it runs`,
            };
          else break;
        }
        if (i < argv.length) argv = argv.slice(i);
        else break;
      } else if (h === "stdbuf") {
        let i = 1;
        while (i < argv.length) {
          let arg = argv[i];
          if (STDBUF_SHORT_SEP_RE.test(arg) && argv[i + 1]) i += 2;
          else if (STDBUF_SHORT_FUSED_RE.test(arg)) i++;
          else if (STDBUF_LONG_RE.test(arg)) i++;
          else if (arg.startsWith("-"))
            return {
              ok: false,
              reason: `'stdbuf ${arg}' can't be checked before it runs`,
            };
          else break;
        }
        if (i > 1 && i < argv.length) argv = argv.slice(i);
        else break;
      } else if (h === "command") {
        let d = 1;
        let m = false;
        while (d < argv.length && argv[d].startsWith("-") && argv[d] !== "--") {
          let p = argv[d];
          if (!/^-[pvV]+$/.test(p))
            return {
              ok: false,
              reason: `'command ${p}' can't be checked before it runs`,
            };
          if (p.includes("v") || p.includes("V")) m = true;
          d++;
        }
        if (argv[d] === "--") d++;
        if (m || d >= argv.length) break;
        argv = argv.slice(d);
      } else if (argv[0] === "builtin" || argv[0] === "noglob") {
        let d = argv[0] === "builtin" && argv[1] === "--" ? 2 : 1;
        if (d < argv.length) argv = argv.slice(d);
        else break;
      } else if (h === "xargs") {
        if (argv.length >= 2 && !argv[1].startsWith("-")) {
          argv = argv.slice(1);
          i = true;
        } else break;
      } else break;
    }
    let c = argv[0];
    if (c === undefined) continue;
    let l = stripPathAndExe(c);
    if (c === "")
      return {
        ok: false,
        reason: "Empty command name \u2014 argv[0] may not reflect what bash runs",
      };
    if (containsAnyPlaceholder(c))
      return {
        ok: false,
        reason: "Command name is runtime-determined (placeholder argv[0])",
      };
    if (c.startsWith("-") || c.startsWith("|") || c.startsWith("&"))
      return {
        ok: false,
        reason: "Command appears to be an incomplete fragment",
      };
    let dangerFlags = getOwn(SUBSCRIPT_EVAL_FLAGS, l);
    let y = l === "test" || l === "[" || l === "[[";
    if (dangerFlags !== undefined)
      for (let i = 1; i < argv.length; i++) {
        let arg = argv[i];
        let d = argv[i + 1];
        if (dangerFlags.has(arg) && d !== undefined && (d.includes("[") || containsAnyPlaceholder(d)))
          return {
            ok: false,
            reason: `'${l} ${arg}' operand contains array subscript or runtime-determined value \u2014 bash evaluates $(cmd) in subscripts`,
          };
        if (y) {
          if (arg === "-t" && d !== undefined && !TEST_ARITH_NUMERIC_RE.test(d))
            return {
              ok: false,
              reason: `'${l} -t' operand is non-numeric \u2014 zsh arith-evals identifiers (may run $(cmd))`,
            };
          continue;
        }
        if (arg.length > 2 && arg[0] === "-" && arg[1] !== "-" && !arg.includes("[")) {
          for (let flag of dangerFlags)
            if (flag.length === 2 && arg.includes(flag[1])) {
              let p = argv[i + 1];
              if (p !== undefined && (p.includes("[") || containsAnyPlaceholder(p)))
                return {
                  ok: false,
                  reason: `'${l} ${flag}' (combined in '${arg}') operand contains array subscript \u2014 bash evaluates $(cmd) in subscripts`,
                };
            }
        }
        if (arg.length > 2 && arg[0] === "-" && l !== "read")
          for (let flag of dangerFlags) {
            if (flag.length !== 2) continue;
            let index = arg.indexOf(flag[1], 1);
            if (index === -1 || index === arg.length - 1) continue;
            let sliced = arg.slice(index + 1);
            if (/[A-Za-z_][A-Za-z0-9_]*\[/.test(sliced) || containsAnyPlaceholder(sliced))
              return {
                ok: false,
                reason: `'${l} ${flag}' (fused in '${arg}') operand contains array subscript \u2014 bash evaluates $(cmd) in subscripts`,
              };
          }
      }
    if (y)
      for (let i = 2; i < argv.length; i++) {
        if (!TEST_ARITH_CMP_OPS.has(argv[i])) continue;
        for (let h of [argv[i - 1], argv[i + 1]]) {
          if (h === undefined) continue;
          if (h.includes("[") || !TEST_ARITH_NUMERIC_RE.test(h))
            return {
              ok: false,
              reason: `'${l} ... ${argv[i]} ...' operand is non-numeric \u2014 \`[[\` arithmetically evaluates identifiers/subscripts (may run $(cmd))`,
            };
        }
      }
    if (BARE_SUBSCRIPT_NAME_BUILTINS.has(l)) {
      let u = false;
      for (let k = 1; k < argv.length; k++) {
        let d = argv[k];
        if (u !== false) {
          let m = u;
          u = false;
          if (m === "numeric" && !READ_NUMERIC_OPERAND_RE.test(d))
            return {
              ok: false,
              reason: `'read ${argv[k - 1]}' operand '${d}' is non-numeric \u2014 zsh arith-evals subscripts/expressions (may run $(cmd))`,
            };
          if (
            m === "prompt" &&
            (SUBSCRIPTED_NAME_RE.test(d) ||
              (d[0] === "-" && /[A-Za-z_][A-Za-z0-9_]*\[/.test(d)) ||
              d.includes(CMDSUB_PLACEHOLDER))
          )
            return {
              ok: false,
              reason: `'read ${argv[k - 1]}' operand '${d}' is a subscripted NAME, dash-prefixed with a subscript, or runtime-determined \u2014 zsh -p takes no operand; may arith-eval the subscript and run $(cmd)`,
            };
          continue;
        }
        if (d[0] === "-") {
          if (l === "read") {
            if (READ_NUMERIC_ARG_FLAGS.has(d)) u = "numeric";
            else if (d === "-p") u = "prompt";
            else if (READ_DATA_FLAGS.has(d)) u = "string";
            else if (d.length > 2)
              for (let k = 1; k < d.length; k++) {
                let p = "-" + d[k];
                let g = READ_NUMERIC_ARG_FLAGS.has(p);
                if (g || READ_DATA_FLAGS.has(p)) {
                  if (k === d.length - 1) u = g ? "numeric" : p === "-p" ? "prompt" : "string";
                  else if (g && !READ_NUMERIC_OPERAND_RE.test(d.slice(k + 1)))
                    return {
                      ok: false,
                      reason: `'read ${p}' (fused in '${d}') operand is non-numeric \u2014 zsh arith-evals subscripts/expressions (may run $(cmd))`,
                    };
                  else if (p === "-p") {
                    let sliced = d.slice(k + 1);
                    if (/[A-Za-z_][A-Za-z0-9_]*\[/.test(sliced) || sliced.includes(CMDSUB_PLACEHOLDER))
                      return {
                        ok: false,
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
            ok: false,
            reason: `'${l}' positional NAME '${d}' contains array subscript or runtime-determined value \u2014 bash evaluates $(cmd) in subscripts`,
          };
      }
    }
    if (DECLARATION_LIKE_BUILTINS.has(l)) {
      let u = l === "declare" || l === "typeset" || l === "local";
      let h = u || l === "export" || l === "readonly";
      let d = u || l === "readonly";
      let m = false;
      let p = false;
      for (let idx = 1; idx < argv.length; idx++) {
        let k = argv[idx];
        if (d) {
          if (/^[+-].*f/.test(k)) m = true;
          if (/^[+-].*[uU]/.test(k)) p = true;
          if (m && p)
            return {
              ok: false,
              reason: `'${l}' with both -f and -u/-U flags (reached as plain command via wrapper/quote) \u2014 zsh marks a function for autoload (synonym of 'autoload')`,
            };
        }
        if (u && DECLARE_SEMANTIC_FLAG_RE.test(k))
          return {
            ok: false,
            reason: `'${l}' with -n/-i/-a/-A/-E/-F/-L/-R/-Z/-l/-u flag (reached as plain command via wrapper/quote) changes assignment eval semantics`,
          };
        if (DECLARATION_KEYWORDS.has(l) && /^[+-].*[iluEFLRZ]/.test(k))
          return {
            ok: false,
            reason: `'${l}' with -i/-E/-F/-L/-R/-Z/-l/-u flag (reached as plain command via wrapper/quote) \u2014 zsh bin_typeset mathevals, width-truncates, or case-converts the value`,
          };
        if ((h || l === "private") && /^[+-].*m/.test(k))
          return {
            ok: false,
            reason: `'${l}' with -m/+m flag (reached as plain command via wrapper/quote) \u2014 zsh pattern-assigns every matching variable`,
          };
        if (DECLARATION_KEYWORDS.has(l) && /^[+-].*T/.test(k))
          return {
            ok: false,
            reason: `'${l} -T' creates a user-defined zsh tied pair \u2014 tracked literals for its operands are unreliable`,
          };
        let A = k.includes("[") && /[$`]/.test(k);
        if (A || containsAnyPlaceholder(k))
          return {
            ok: false,
            reason: A
              ? `'${l}' operand '${redactPlaceholdersForDisplay(k)}' contains array subscript with expansion \u2014 shell arith-evals $(cmd) in subscripts`
              : `'${l}' operand '${redactPlaceholdersForDisplay(k)}' is runtime-determined and may carry an array subscript \u2014 shell arith-evals $(cmd) in subscripts`,
          };
        if ((l === "float" || l === "integer") && !/^[+-]/.test(k))
          return {
            ok: false,
            reason: `zsh '${l}' operand \u2014 implicit typeset -E/-i arithmetically evaluates the (existing or assigned) value`,
          };
      }
      let g = h && c === l ? checkDeclarationOptions(l, argv.slice(1)) : null;
      if (g !== null)
        return {
          ok: false,
          reason: g,
        };
      let _ =
        c === l && (options?.hasLoop !== false || cmd !== commands.at(-1))
          ? checkDeclarationContext(l, argv.slice(1))
          : null;
      if (_ !== null)
        return {
          ok: false,
          reason: _,
        };
    }
    if (l === "printf")
      for (let k = 1; k < argv.length; k++) {
        let h = argv[k];
        let d = h.includes("[") && /[$`]/.test(h);
        if (d || containsAnyPlaceholder(h))
          return {
            ok: false,
            reason: d
              ? `printf operand '${redactPlaceholdersForDisplay(h)}' contains array subscript with expansion \u2014 zsh arith-evals %d/%i operands (may run $(cmd))`
              : `printf operand '${redactPlaceholdersForDisplay(h)}' is runtime-determined and may carry an array subscript \u2014 zsh arith-evals %d/%i operands (may run $(cmd))`,
          };
      }
    if (l === "set")
      for (let k = 1; k < argv.length; k++) {
        let h = argv[k];
        if (h === "--") break;
        if (!/^[-+]/.test(h)) continue;
        for (let k_2 = 1; k_2 < h.length; k_2++) {
          let m = h[k_2];
          if (m === "o") {
            let p = k_2 < h.length - 1 ? h.slice(k_2 + 1) : argv[k + 1];
            if (p !== undefined && p !== "" && !SET_O_SAFE_OPTS.has(p.toLowerCase().replace(/[_-]/g, "")))
              return {
                ok: false,
                reason: `'set -o/+o ${p}' changes shell parsing/globbing state \u2014 can enable globsubst/extendedglob and defeat static analysis`,
              };
            if (k_2 === h.length - 1) k++;
            break;
          }
          if (m === "A") break;
          if (!SET_O_SAFE_LETTERS.has(m))
            return {
              ok: false,
              reason: `'set ${h[0]}${m}' changes shell option state (allexport/keyword/\u2026) \u2014 defeats static env-var analysis; see SET_O_SAFE_LETTERS`,
            };
        }
      }
    if (l === "print" && argv.some((arg) => PRINT_PROMPT_FLAG.test(arg)))
      return {
        ok: false,
        reason: "What 'print -P' expands can't be checked before it runs",
      };
    if (l === "jobs")
      for (let k = 1; k < argv.length; k++) {
        let h = argv[k];
        if (/^[+-].*x/.test(h))
          return {
            ok: false,
            reason: "What 'jobs -x' starts can't be checked before it runs",
          };
      }
    if (SHELL_KEYWORDS.has(c))
      return {
        ok: false,
        reason: `Shell keyword '${l}' as command name \u2014 tree-sitter mis-parse`,
      };
    if (i) {
      if (l === "find" || l === "jq")
        return {
          ok: false,
          reason: `What xargs adds to ${l} can't be checked before it runs`,
        };
      if (AWK_NAMES.has(l)) {
        let u = false;
        for (let k = 1; k < argv.length; k++) {
          let d = argv[k];
          if (d === "--") {
            u = k + 1 < argv.length;
            break;
          }
          if (d === "-" || !d.startsWith("-")) {
            u = true;
            break;
          }
          if (!d.includes("=") && AWK_PROGRAM_FILE_OPT_RE.test(d)) k++;
        }
        if (!u)
          return {
            ok: false,
            reason: `The program xargs gives ${l} can't be checked before it runs`,
          };
      }
    }
    if (l === "jq") {
      for (let arg of argv) {
        if (/\bsystem\s*\(/.test(arg))
          return {
            ok: false,
            reason: "jq command contains system() function which executes arbitrary commands",
          };
        if (/\b(?:include|import)\b/.test(arg))
          return {
            ok: false,
            reason:
              'jq command contains include/import \u2014 modules can load arbitrary .jq files via {search:"."} and call env or other builtins',
          };
      }
      if (
        argv.some((arg) =>
          /^(?:-[A-Za-z]*[fL]|--(?:from-file|rawfile|slurpfile|library-path)(?:$|=))/.test(arg),
        )
      )
        return {
          ok: false,
          reason: "jq command contains dangerous flags that could execute code or read arbitrary files",
        };
    }
    if (AWK_NAMES.has(l)) {
      if (cmd.hasUnquotedGlob || (r && hasSourceUnquotedGlob(cmd)))
        return {
          ok: false,
          reason:
            "awk command contains unquoted glob characters \u2014 could glob-expand to a planted program or flag before awk runs",
        };
      for (let arg of argv) {
        let h = awkProgramHasExecBridge(arg);
        if (h !== false)
          return {
            ok: false,
            reason: h,
          };
        if (containsAnyPlaceholder(arg))
          return {
            ok: false,
            reason: "awk is given text that can't be checked before it runs",
          };
      }
      if (
        argv.some((arg) => /^-[bcCghIkMnNOPrsStV]*[fEileDW]/.test(arg) || /^--(?:fil|e|i|lo|s|de)/.test(arg))
      )
        return {
          ok: false,
          reason: "awk has an option that can't be checked before it runs",
        };
    }
    if (l === "find") {
      if (cmd.hasUnquotedGlob || (r && hasSourceUnquotedGlob(cmd)))
        return {
          ok: false,
          reason:
            "find contains unquoted glob characters \u2014 could glob-expand to a dangerous action before find runs",
        };
      let u = false;
      for (let k = 1; k < argv.length; k++) {
        let d = argv[k];
        let m = u;
        u = false;
        if (isFindDangerousAction(d))
          return {
            ok: false,
            reason: `find with '${d}' executes commands or modifies files \u2014 cannot be auto-allowed by a Bash(find:*) prefix rule`,
          };
        if (isAmbiguousFindWord(d))
          return {
            ok: false,
            reason: `find option '${d}' is read differently by different versions of find \u2014 could hide a following action`,
          };
        if (!m && findWordTakesFlagValue(d)) {
          u = true;
          continue;
        }
        if (!m && findWordTakesOperand(d)) {
          k++;
          continue;
        }
        if (containsAnyPlaceholder(d))
          return {
            ok: false,
            reason: "find argument is runtime-determined \u2014 could resolve to a dangerous action",
          };
        if (/[[\]*?]/.test(d))
          return {
            ok: false,
            reason: `find argument '${d}' contains glob characters \u2014 could glob-expand to a dangerous action`,
          };
      }
    }
    if (isZshDangerousBuiltin(c))
      return {
        ok: false,
        reason: `Zsh builtin '${l}' can bypass security checks`,
      };
    let x = zshStatWritesVarReason(c, argv.slice(1));
    if (x !== null)
      return {
        ok: false,
        reason: x,
      };
    if (EVAL_LIKE_BUILTINS.has(c))
      if (l === "fc" && !argv.slice(1).some((arg) => /^[+-].*[es]/.test(arg)));
      else if (l === "compgen" && !argv.slice(1).some((arg) => /^[+-].*[CFW]/.test(arg)));
      else
        return {
          ok: false,
          reason: `'${l}' evaluates arguments as shell code`,
        };
    if (UNHANDLED_EXEC_WRAPPERS.has(l) && argv.length > 1)
      return {
        ok: false,
        reason: `What '${l}' starts can't be checked before it runs`,
      };
    for (let arg of cmd.argv)
      if (arg.includes("/proc/") && PROC_ENVIRON_RE.test(arg))
        return {
          ok: false,
          reason: "Accesses /proc/*/environ which may expose secrets",
        };
    for (let redirect of cmd.redirects)
      if (redirect.target.includes("/proc/") && PROC_ENVIRON_RE.test(redirect.target))
        return {
          ok: false,
          reason: "Accesses /proc/*/environ which may expose secrets",
        };
    for (let arg of cmd.argv)
      if (
        arg.includes(`
`) &&
        NEWLINE_HASH_RE.test(arg)
      )
        s ??= {
          ok: false,
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
          ok: false,
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
          ok: false,
          kind: "newline-hash",
          reason: "Newline followed by # inside a redirect target can hide arguments from path validation",
        };
  }
  if (s) return s;
  return {
    ok: true,
  };
}
//@ chunk-e6aww6q8.js:1144304-1144468 fingerprint = parseForSecurity (0.861)
/**
 * 快速判断命令是否含 zsh 危险命令：能安全解析时用 AST argv，否则用 splitCommand + tryParseShellCommand 回退，逐条交给 validateZshDangerousCommands。
 */
function hasZshDangerousCommand(cmd) {
  let n = cmd.length > SPLIT_MAX_LEN ? null : getParserModule()?.parse(cmd);
  let r = n ? parseForSecurityFromAst(cmd, n) : undefined;
  return (
    r?.kind === "simple" ? r.commands.map((command) => command.argv) : splitCommand(cmd).map(getCommandArgv)
  ).some((h) => isXargsToSafeFilter(stripCommandBuiltinPrefixes(h)));
}
//@ chunk-e6aww6q8.js:1151910-1151949 fingerprint = walkHerestringRedirect (1)
var INPUT_REDIRECT_OPS_2 = new Set(["<", "<<", "<<<", "<&"]);
//@ chunk-e6aww6q8.js:1155366-1155446 placement
/**
 * 匹配命令开头的 command/builtin/noglob 包装前缀；stripCommandPrefixes 循环剥除。
 */
var COMMAND_PREFIX_STRIP_RE = /^(?:(?:command(?:[ \t]+-p+)*|builtin)(?:[ \t]+--)?|noglob)[ \t]+(?!-)/;
//@ chunk-e6aww6q8.js:1155446-1155517 placement
/**
 * 循环剥掉 command/builtin/noglob 前缀，得到实际执行的命令文本。
 */
function stripCommandPrefixes(text) {
  let n = text;
  while (COMMAND_PREFIX_STRIP_RE.test(n)) n = n.replace(COMMAND_PREFIX_STRIP_RE, "");
  return n;
}
//@ chunk-e6aww6q8.js:1155517-1155651 placement
/**
 * 判断语法树中是否含子 shell 或复合语句节点。
 */
function hasSubshellNode(e) {
  if (e.type === "subshell" || e.type === "compound_statement") return true;
  for (let child of e.children) if (child && hasSubshellNode(child)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:1155651-1155721 fingerprint = STRUCTURAL_TYPES (1)
/**
 * 结构性节点类型集合：program、list、pipeline、redirected_statement，遍历时只下钻不当作命令。
 */
var STRUCTURAL_TYPES_2 = new Set(["program", "list", "pipeline", "redirected_statement"]);
//@ chunk-38axkkfw.js:4923-5089 fingerprint = walkHeredocRedirect (0.627)
/**
 * 重定向相关的操作符与节点类型集合（< > >> << <<- <<< <& >& &> &>> >| 以及 file_descriptor、heredoc_*），判断重定向子节点是否只含这些记号。
 */
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
  noteRefusal,
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
  INPUT_REDIRECT_OPS_2,
  TEST_ARITH_NUMERIC_RE,
  hasSourceUnquotedGlob,
  STRUCTURAL_TYPES_2,
  hasSubshellNode,
  stripCommandPrefixes,
  UNICODE_WHITESPACE_RE,
  stripLiteralQuotedRegions,
  ZSH_DANGEROUS_BUILTINS,
  liveBracedExpansionBodies,
  SUBSCRIPT_EVAL_FLAGS,
  BARE_SUBSCRIPT_NAME_BUILTINS,
  ZSH_MODULE_NAME_WRITERS,
};
