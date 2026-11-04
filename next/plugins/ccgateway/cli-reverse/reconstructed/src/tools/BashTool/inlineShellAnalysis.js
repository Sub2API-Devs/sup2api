/**
 * tools/BashTool/inlineShellAnalysis.ts
 *
 * 2.1.316 新增：内联 shell（bash -c、eval 等）分析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (25)
 * attribution: placement 25
 */
import { homedir } from "os";
import { isPlainAsk, getDecisionSeverity } from "./bashSecurity.js";
import {
  createPermissionRequestMessage,
  findSafetyCheckReason,
} from "../../utils/permissions/permissions.js";
import { BashTool } from "./BashTool.js";
import { COMMAND_WRAPPERS, LEADING_KEYWORDS, MAX_INLINE_DEPTH } from "./expansionAnalysis.js";
import {
  stripPathAndExe,
  hasAnyShortFlagChar,
  parseCommandRaw,
  PARSE_ABORTED,
} from "../../utils/bash/parser.js";
import { env } from "../../utils/env.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { count, uniq } from "../../utils/collections.js";
import {
  POSIX_SHELL_NAMES,
  parseForSecurity,
  declarationPrefixReadings,
  parseForSecurityFromAst,
} from "../../utils/bash/ast.js";
import { countCharInString } from "../../utils/stringUtils.js";
import {
  isNormalizedCdCommand,
  unwrapCommandArgv,
  isSimpleAndChain,
  bashToolHasPermission,
  getStructuralMissKind,
} from "./bashPermissions.js";
import { parseHasErrorNode, splitCommand } from "../../utils/bash/commands.js";
import { resolveSimpleCdTarget } from "./cdTracking.js";
import { getCwd } from "../../utils/cwd.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { logDangerousRmShape, runWithoutTelemetry, isDangerousRmEnabled } from "./dangerousRemoval.js";
import { stripWrappersFromArgvForPaths } from "./pathValidation.js";
import { runWithDivergentShapes } from "./readOnlyValidation.js";
import { runInRemoteCallFrameMain } from "../../remote/remoteMode.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1204114-1204550 placement
/**
 * 合并声明前缀不同读法的检查结果：任一 deny 即 deny；取最严重者；读法不穷尽且结果非 ask 时要求确认（too-complex）。
 */
function combineDeclarationReadings(result, readingResults, exhaustive, isExhaustive) {
  let found = [result, ...readingResults].find((readingResult) => readingResult.behavior === "deny");
  if (found !== undefined) return found;
  if (!isExhaustive && result.behavior === "ask" && !isPlainAsk(result)) return result;
  let worst = result;
  for (let readingResult of readingResults)
    if (getDecisionSeverity(readingResult) > getDecisionSeverity(worst)) worst = readingResult;
  if (exhaustive || worst.behavior === "ask") return worst;
  let decisionReason = {
    type: "other",
    reason: "Variables set in front of a declaration in this command can't all be checked before it runs",
    bashMissKind: "too-complex",
  };
  return {
    behavior: "ask",
    decisionReason,
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    suggestions: [],
  };
}
//@ chunk-e6aww6q8.js:1204550-1204695 placement
var MAX_INLINE_SCRIPT_LENGTH; // deferred: uses QUOTE_MARKER (./expansionAnalysis.js) of its import cycle while loading; runs once the cycle is complete
var MAX_INLINE_STATEMENTS;
var INLINE_SHELL_VALUE_PLACEHOLDER;
var INLINE_PREFIX_WORDS;
deferInit("chunk-e6aww6q8.js:1204550", () => {
  MAX_INLINE_SCRIPT_LENGTH = 2000;
  MAX_INLINE_STATEMENTS = 8;
  INLINE_SHELL_VALUE_PLACEHOLDER = "__INLINE_SHELL_VALUE__";
  INLINE_PREFIX_WORDS = new Set([
    ...COMMAND_WRAPPERS,
    ...LEADING_KEYWORDS,
    ..."builtin noglob toybox trap watch flock chroot script".split(" "),
  ]);
});
//@ chunk-e6aww6q8.js:1204695-1205183 placement
/**
 * 粗略地把脚本文本拆成语句与单词：引号内元字符置为分隔外字符，去掉重定向与前导赋值，按 ;&|()`{} 等切分。
 */
function splitInlineStatements(text, stripQuotes = true) {
  return text
    .replace(stripQuotes ? /\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g : /(?!)/g, (quoted) =>
      quoted.startsWith("\\") ? quoted : quoted.replace(/[\s;&|()`{}!]/g, "\x00"),
    )
    .replace(/\d*[<>]&(?:\d+-?|-)(?![^\s;&|()])/g, " ")
    .replace(/\d*[<>]&|&>>?|>\|/g, ">")
    .replace(/\$(?=['"])|['"\\]/g, "")
    .split(/[;&|()`{}\n!]|\$\(/)
    .map((statement) => {
      let filtered = statement.split(/[ \t]+/).filter(Boolean);
      return filtered.filter(
        (word, idx) =>
          !/^\d*[<>]/.test(word) &&
          !/^\d*[<>]+$/.test(filtered[idx - 1] ?? "") &&
          !(
            /^\w+\+?=/.test(word) &&
            filtered.slice(0, idx).every((previousWord) => /^\w+\+?=/.test(previousWord))
          ),
      );
    });
}
//@ chunk-e6aww6q8.js:1205183-1205260 placement
/**
 * 取可执行名并归一（小写、去掉 -1.2.3 版本号），用于识别 busybox/toybox 这类多重调用程序。
 */
function normalizeProgramBasename(program) {
  return stripPathAndExe(program ?? "")
    .toLowerCase()
    .replace(/-\d+(?:\.\d+)*$/, "");
}
//@ chunk-e6aww6q8.js:1205260-1205700 placement
/**
 * 判断脚本是否可能间接运行 rm/rmdir：与 xargs/find -exec/sh -c 等组合、以变量作命令名、赋值为 rm，或大括号展开成 rm。
 */
function mayRunRmIndirectly(text) {
  let isRmWord = (word) =>
    /^(?:\w*=)?rm(?:dir)?$/i.test(stripPathAndExe(word.replace(/\d*[<>].*$/s, ""))) ||
    /(?:^|,)rm(?:dir)?(?:,|\$)/i.test(word);
  let isPrefixWord = (word) => INLINE_PREFIX_WORDS.has(stripPathAndExe(word).toLowerCase());
  return (
    [...splitInlineStatements(text), ...splitInlineStatements(text, false)].some(
      (statement) =>
        statement.some(
          (word, rmIdx) =>
            isRmWord(word) &&
            statement.some(
              (otherWord, otherIdx) =>
                otherIdx !== rmIdx &&
                (isPrefixWord(otherWord) ||
                  hasAnyShortFlagChar(otherWord, "c") ||
                  /^-(?:exec(?:dir)?|ok(?:dir)?)$/.test(otherWord)),
            ),
        ) ||
        statement.some(
          (word, idx) =>
            (isRmWord(word) || word.startsWith("$")) && (idx === 0 || isPrefixWord(statement[idx - 1])),
        ) ||
        statement.some((word) => /^\w+=(?:\S*\/)?rm(?:dir)?$/i.test(word)),
    ) || splitShellWords(text).some(braceExpandsToRm)
  );
}
//@ chunk-e6aww6q8.js:1205700-1206270 placement
/**
 * 宽松判断脚本文本是否可能提到 rm/rmdir：去掉转义、引号、变量与默认值展开等多种变体后匹配，并检查大括号展开。
 */
function mentionsRm(text) {
  let rmMentionRe = /(?:^|[^\w.-]|\$\{[^{}:-]*:?-)rm(?:dir)?(?:\.exe)?(?![\w.-])/i;
  let varExpansionPatterns = [
    /\$[=~^]*(?:[A-Za-z_]\w*|[0-9]+|[@*#?!$-]|\{[^{}]*\})/g,
    /\$(?:[0-9]+|[@*#?!$-]|\{[^{}]*\})/g,
  ];
  let flattenDefaults = (text) => text.replace(/\$\{[^{}:=?+-]*:?[-=?+]([^{}]*)\}/g, "$1");
  let text_2 = text.replace(/\\\n/g, "");
  let unquote = (text) => text.replace(/\$(?=['"])|['"\\]/g, "");
  let flattened = [text_2, unquote(text_2), unquote(text_2.replace(/\\[ntr]/g, " "))].flatMap((variant) => [
    variant,
    flattenDefaults(variant),
  ]);
  let flattened_2 = varExpansionPatterns.flatMap((pattern) =>
    [" ", ""].flatMap((replacement) => [
      unquote(flattenDefaults(text_2).replace(pattern, replacement)),
      ...flattened.map((variant) => variant.replace(pattern, replacement)),
    ]),
  );
  return (
    [...flattened, ...flattened_2].some((variant) => rmMentionRe.test(variant)) ||
    [...splitShellWords(text_2), ...splitShellWords(unquote(text_2))].some((word) =>
      braceExpandsToRm(word.replace(/\.exe$/i, "")),
    )
  );
}
//@ chunk-e6aww6q8.js:1206270-1206308 placement
/**
 * 匹配 $'…' 里带 C 风格转义（\x \u \U \c \0-7）的字符串，这类脚本无法静态判定。
 */
var C_STYLE_ESCAPE_RE = /\$'(?:\\'|[^'])*\\[xuUc0-7]/;
//@ chunk-e6aww6q8.js:1206308-1206422 placement
function hasInlineShellC(text) {
  return [text, text.replace(/\\\n/g, "")].some(
    (variant) =>
      C_STYLE_ESCAPE_RE.test(variant) || C_STYLE_ESCAPE_RE.test(variant.replace(/'(?:\\'|"'")'/g, "'")),
  );
}
//@ chunk-e6aww6q8.js:1206422-1206516 placement
/**
 * 内联 shell 脚本是否必须检查危险删除：未设 CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT 且 tengu_pale_kestrel 开启时为真。
 */
function isStrictInlineShellRmPromptEnabled() {
  return (
    !env.CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_pale_kestrel", true)
  );
}
//@ chunk-e6aww6q8.js:1206516-1206577 placement
/**
 * 当内联检查开启时，判断词语里是否提到 rm 或含 sh -c 这类内联执行。
 */
function needsInlineShellRmCheck(...texts) {
  return (
    !isStrictInlineShellRmPromptEnabled() || texts.some((text) => mentionsRm(text) || hasInlineShellC(text))
  );
}
//@ chunk-e6aww6q8.js:1206577-1206771 placement
function mayHideRm(text) {
  let replaced = text.replace(/\$(?=['"])|['"\\]/g, "");
  return (
    /\{[^{}\s]*(?:,|\.\.)/.test(replaced) ||
    /(?:^|[^\w.-])rm(?:dir)?(?![\w.-])/i.test(replaced) ||
    /(?:^|[;&|(){}\n`!])\s*(?:\w+\+?=\S*\s+)*\$/.test(replaced)
  );
}
//@ chunk-e6aww6q8.js:1206771-1207209 placement
/**
 * 判断脚本是否使用了静态分析无法建模的 shell 特性：函数/别名、IFS、位置参数赋值、shift/source/eval/trap、以变量作命令、set 改变位置参数等。
 */
function hasUnmodeledShellFeatures(text) {
  return (
    /\bfunction\b|\balias\b|\bIFS\b|\w\s*\(\s*\)|(?:^|[\s;&|(){}])(?:argv|[0-9]+)(?:\[[^\]]*\])?=|(?:^|[\s;&|(){}!])set\s[^;&|\n]*(?:\$\(|`)/.test(
      text,
    ) ||
    splitInlineStatements(text).some((statement) =>
      statement.some(
        (word, idx) =>
          statement
            .slice(0, idx)
            .every((prefixWord) => INLINE_PREFIX_WORDS.has(prefixWord) || /^(?:-|\d+$)/.test(prefixWord)) &&
          (/^(?:shift|source|\.|eval|trap)$/.test(word) ||
            /^\$(?!\{?[0-9@*#])/.test(word) ||
            (word === "set" &&
              statement
                .slice(idx + 1)
                .some(
                  (arg, argIdx, words) =>
                    arg === "-" ||
                    arg === "--" ||
                    (!/^[-+]/.test(arg) && !/[oO]$/.test(words[argIdx - 1] ?? "")),
                ))),
      ),
    )
  );
}
//@ chunk-e6aww6q8.js:1207209-1207298 placement
/**
 * 按 shell 词法切分（处理单双引号与反斜杠转义），得到单词列表。
 */
function splitShellWords(text) {
  return text.match(/(?:[^\s'"\\]|\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*")+/g) ?? [];
}
//@ chunk-e6aww6q8.js:1207298-1207478 placement
function braceExpandsToRm(word) {
  let match = /^([^{]*)\{([^{}]*)\}(.*)$/s.exec(word.replace(/["'\\]/g, ""));
  return (
    match !== null &&
    match[2]
      .split(/,|\.\./)
      .some((alternative) => /(?:^|\/)rm(?:dir)?$/i.test(`${match[1]}${alternative}${match[3]}`))
  );
}
//@ chunk-e6aww6q8.js:1207478-1207919 placement
/**
 * 判断单词中的大括号展开是否有风险：多层或不规则、前后缀含路径或特殊字符、展开项含路径/通配/rm 或可能为空。
 */
function hasRiskyBraceExpansion(text) {
  let replaced = text.replace(/\$\{[^{}]*\}/g, "$X");
  let braceCount = count([...replaced], (char) => char === "{");
  if (braceCount === 0 || !/,|\.\./.test(replaced)) return false;
  let match = /^([^{]*)\{([^{}]*)\}(.*)$/s.exec(replaced);
  if (braceCount > 1 || match === null) return true;
  let [, prefix = "", body = "", suffix = ""] = match;
  if (!/,|\.\./.test(body)) return false;
  return (
    /^["']?[/~$]|[{},\\'"]|\.\./.test(prefix) ||
    /[~{},\\'"]/.test(suffix) ||
    body
      .split(/,|\.\./)
      .map((part) => part.replace(/["'\\]/g, ""))
      .some(
        (alternative) =>
          /[/~$*?[]|^\.\.?$|\brm/.test(alternative) ||
          (alternative === "" && /[$]|^["']?\//.test(prefix + suffix)) ||
          braceExpandsToRm(text),
      )
  );
}
//@ chunk-e6aww6q8.js:1207919-1210963 placement
/**
 * 分析内联 shell（busybox、zsh、bash -c 等）中的命令，必要时加上防护变量。
 */
function analyzeInlineShell(argv) {
  let [shellName = "", ...args] =
    (normalizeProgramBasename(argv[0]) === "busybox" || normalizeProgramBasename(argv[0]) === "toybox") &&
    POSIX_SHELL_NAMES.has(normalizeProgramBasename(argv[1]))
      ? argv.slice(1)
      : argv;
  if (!POSIX_SHELL_NAMES.has(normalizeProgramBasename(shellName))) return;
  let hasDashC = false;
  let hasUnknownFlag = false;
  let idx = 0;
  for (; idx < args.length; idx++) {
    let arg = args[idx];
    if (arg === "-" || arg === "--") {
      idx++;
      break;
    }
    if (!/^[-+]./.test(arg)) break;
    let longFlagMatch = /^(?:r?ba)?sh$/.test(normalizeProgramBasename(shellName))
      ? /^--?(?:login|posix|noprofile|norc|noediting|verbose|restricted|debugger|dump-(?:po-)?strings|wordexp|pretty-print|help|version|(rcfile|init-file))$/.exec(
          arg,
        )
      : null;
    if (longFlagMatch !== null) idx += longFlagMatch[1] === undefined ? 0 : 1;
    else if (arg.startsWith("--")) hasUnknownFlag = true;
    else {
      hasUnknownFlag ||=
        (/^(?:r?ba)?sh$/.test(normalizeProgramBasename(shellName)) &&
          /[^abcefhiklmnoprstuvxBCDEHIOPT]/.test(arg.slice(1))) ||
        (/ksh$/.test(normalizeProgramBasename(shellName)) && /[oO]./.test(arg));
      hasDashC ||= arg.startsWith("-") && arg.includes("c");
      idx += arg.match(/[oO]/g)?.length ?? 0;
    }
  }
  if (hasUnknownFlag)
    return args.some((arg) => /^-[A-Za-z]*c/.test(arg))
      ? {
          script: args.join(" "),
          judged: undefined,
          homeWritten: false,
        }
      : undefined;
  let script = args[idx];
  if (!hasDashC || script === undefined) return;
  if (script.length > MAX_INLINE_SCRIPT_LENGTH)
    return {
      script,
      judged: undefined,
      homeWritten: false,
    };
  if (
    splitShellWords(script).some(hasRiskyBraceExpansion) ||
    /\balias\b/.test(script) ||
    /\bIFS\b/.test(
      script.replace(
        /(?:^|[;&|\n({]\s*)(?:(?:do|then|else|elif|if|while|until)\s+)?IFS=(?:'[^']*'|"[^"]*"|[^\s;&|'"\\])*[ \t]+read\b/g,
        " read",
      ),
    ) ||
    (normalizeProgramBasename(shellName) === "zsh" &&
      /(?:^|[\s;&|(){}])=(?!=)\S|\$\{?\w+\}?(?::[htrelquQxsaAcP&]|\[)|\bargv\b|\$(?:[=~^]|\{[=~^(])|\(:/.test(
        script,
      ))
  )
    return {
      script,
      judged: undefined,
      homeWritten: false,
    };
  let homeDir = homedir();
  let homeToken = homeDir.includes("\\") ? "$HOME" : homeDir;
  let homeWritten = false;
  let isHomeContinuation = (before, after) => before.endsWith("$HOME") && /\w/.test(after ?? "");
  let result = (judged) => ({
    script,
    judged:
      homeWritten &&
      (/[\s*?[]/.test(homeDir) ||
        /HOME/.test(
          (judged ?? "")
            .split("$HOME")
            .join("")
            .replace(/["'\\]/g, ""),
        ))
        ? undefined
        : judged,
    homeWritten,
  });
  let rewritten = script;
  if (homeToken !== homeDir && script.includes(homeDir)) {
    let parts = script.split(homeDir);
    if (
      script.includes("'") ||
      parts.slice(1).some((tail) => isHomeContinuation(homeToken, tail[0])) ||
      parts.slice(0, -1).some((head) => head.endsWith("\\"))
    )
      return {
        script,
        judged: undefined,
        homeWritten,
      };
    rewritten = parts.join(homeToken);
    homeWritten = true;
  }
  if (!/\$(?:\{[!#@*0-9]|[#@*0-9])/.test(script)) return result(rewritten);
  let positionalArgs = [args[idx + 1] ?? shellName, ...args.slice(idx + 2)];
  let isPlainValue = (value) => /^[\w./@%+=:,*?[\]!^{} \t\n-]*$/.test(value);
  let mapValue = (value) => {
    let relative = /^~(?=\/|$)/.test(value)
      ? value.slice(1)
      : homeToken !== homeDir &&
          (value === homeDir || value.startsWith(`${homeDir}\\`) || value.startsWith(`${homeDir}/`))
        ? value.slice(homeDir.length).replace(/\\/g, "/")
        : undefined;
    if (relative === undefined)
      return value.startsWith("~")
        ? undefined
        : isPlainValue(value)
          ? value.replace(/[\t\n]/g, " ")
          : INLINE_SHELL_VALUE_PLACEHOLDER;
    homeWritten ||= homeToken !== homeDir;
    return isPlainValue(homeToken === homeDir ? homeDir + relative : relative)
      ? (homeToken + relative).replace(/[\t\n]/g, " ")
      : INLINE_SHELL_VALUE_PLACEHOLDER;
  };
  let mapped = positionalArgs.map(mapValue);
  if (
    /\$\{(?![0-9]+(?:\}|:?\?[^}$`]*\})|[@*#]\})[!#@*0-9]/.test(script) ||
    script.includes("'") ||
    hasUnmodeledShellFeatures(script) ||
    mapped.includes(undefined)
  )
    return result(undefined);
  let isSafe = true;
  let text = rewritten.replace(
    /\\[\s\S]|"\$\{?@\}?"|\$\{([0-9]+)(:?)\?[^}]*\}|\$(?:\{([0-9]+|[@*#])\}|([0-9@*#]))/g,
    (match, indexWithCheck, colonFlag, bracedName, plainName, offset) => {
      let name = bracedName ?? plainName;
      let acceptArg = (arg) => {
        isSafe &&= !isHomeContinuation(arg, rewritten[offset + match.length]);
        return arg;
      };
      if (match.startsWith('"')) {
        let replaced = rewritten.slice(0, offset).replace(/\\[\s\S]/g, "");
        isSafe &&= countCharInString(replaced, '"') % 2 === 0;
        return mapped
          .slice(1)
          .map((arg) => `"${arg}"`)
          .join(" ");
      }
      if (indexWithCheck !== undefined) {
        let argValue = mapped[Number(indexWithCheck)];
        let guard = "${__INLINE_SHELL_GUARDED__:?}";
        return argValue === undefined
          ? "${__INLINE_SHELL_GUARDED__:?}"
          : argValue === "" || argValue === INLINE_SHELL_VALUE_PLACEHOLDER
            ? colonFlag
              ? "${__INLINE_SHELL_GUARDED__:?}"
              : argValue
            : acceptArg(argValue);
      }
      if (name === undefined) return match;
      if (name === "#") return String(positionalArgs.length - 1);
      if (name === "@" || name === "*") {
        isSafe &&= positionalArgs.length <= 2;
        return acceptArg(mapped[1] ?? "");
      }
      return acceptArg(mapped[Number(name)] ?? "");
    },
  );
  return result(isSafe && !hasUnmodeledShellFeatures(text) ? text : undefined);
}
//@ chunk-e6aww6q8.js:1210963-1211518 placement
/**
 * 描述前置语句：纯赋值返回变量名；cd 标记 cd；export/unset/declare 等返回涉及的变量名及是否导出；其他返回 undefined。
 */
function describeAssignmentStatement(text, commands) {
  let [command] = commands;
  if (command === undefined) {
    let assignments = [...text.matchAll(/(?:^|\s)([A-Za-z_]\w*)\+?=/g)];
    return {
      text,
      cd: false,
      names: assignments.map((assignment) => assignment[1]),
      exports: false,
    };
  }
  let [commandName = "", ...args] = command.argv;
  if (commands.length > 1) return;
  if (isNormalizedCdCommand(command.text))
    return {
      text,
      cd: true,
      names: [],
      exports: false,
    };
  if (!/^(?:export|unset|declare|typeset|readonly|local)$/.test(commandName)) return;
  return {
    text,
    cd: false,
    names:
      commandName === "unset" &&
      args.some((arg) => /^-\w*f/.test(arg)) &&
      !args.some((arg) => /^-\w*v/.test(arg))
        ? []
        : args.filter((arg) => !arg.startsWith("-")).map((arg) => arg.replace(/=.*$/s, "")),
    exports: commandName === "export" || commandName === "unset" || args.some((arg) => /^-\w*x/.test(arg)),
  };
}
//@ chunk-e6aww6q8.js:1211518-1212066 placement
/**
 * 解析命令并列出顶层语句分隔符（&&、||、|、;、&、换行）及其位于第几条语句之后；解析失败返回 null。
 */
async function listStatementSeparators(command, expectedCount) {
  let node = await parseCommandRaw(command);
  if (node === null || node === PARSE_ABORTED || node.type !== "program" || parseHasErrorNode(node))
    return null;
  let separators = [];
  let statementCount = 0;
  let isSeparator = (node) => /^(?:&&|\|\||\||;|&|\|&|\n)$/.test(node.type);
  let visit = (node) => {
    if (isSeparator(node))
      separators.push({
        after: statementCount - 1,
        type: node.type,
      });
    else if (node.type === "redirected_statement")
      node.children.filter((child) => !child.type.endsWith("_redirect")).forEach(visit);
    else if (/^(?:program|list|pipeline)$/.test(node.type)) {
      let previousWasStatement = false;
      for (let child of node.children.filter((child) => child.type !== "comment")) {
        if (previousWasStatement && !isSeparator(child))
          separators.push({
            after: statementCount - 1,
            type: `
`,
          });
        visit(child);
        previousWasStatement = !isSeparator(child);
      }
    } else if (node.type !== "comment") statementCount++;
  };
  visit(node);
  return statementCount === expectedCount ? separators : null;
}
//@ chunk-e6aww6q8.js:1212066-1212508 placement (2.1.88 match: parseForSecurity, 0.837)
/**
 * shell -c 递归检查辅助：脚本前只有一个 cd 且其余以 && 连接时，解析 cd 目标并调用 Vze 计算新 cwd；远程执行或带 -C/-D/--chdir/su 等时放弃。
 */
async function resolveSingleCdTarget(command, command_2, prefixWords, context) {
  if (
    context.forRemoteExecution === true ||
    prefixWords.some(
      (word) =>
        /^(?:-[A-Za-z]*[CDiR]|--(?:chdir|login|chroot))/.test(word) ||
        /^(?:unshare|nsenter|chroot|pkexec|runuser|su)$/.test(stripPathAndExe(word)),
    )
  )
    return;
  let segments;
  try {
    segments = splitCommand(command);
  } catch {
    return;
  }
  let separators = await listStatementSeparators(command, segments.length);
  if (
    segments[0]?.trim() !== command_2.text ||
    separators === null ||
    separators.some((separator) => separator.type !== "&&")
  )
    return;
  let root = await parseForSecurity(command_2.text);
  return root.kind === "simple" && root.commands.length === 1
    ? (resolveSimpleCdTarget(root.commands[0], getCwd(), getToolPermissionContext(context)) ?? undefined)
    : undefined;
}
//@ chunk-e6aww6q8.js:1212508-1213154 placement
/**
 * 把内联 shell 脚本中危险 rm 的询问改写为更明确的说明（目标来自运行时才知道的变量或命令输出，可能为空而删到根或家目录），提示使用字面路径或 ${NAME:?}。
 */
function rewordInlineRemovalAsk(result) {
  if (result.behavior !== "ask") return result;
  let decisionReason = result.decisionReason;
  return decisionReason?.type !== "safetyCheck" ||
    !/__INLINE_SHELL_|__CMDSUB/.test(result.message + decisionReason.reason)
    ? result
    : {
        ...result,
        message:
          "Dangerous rm operation in a shell -c script: its target is built from a variable or command output known only when it runs, and if that is empty the rm can reach a directory like / or your home directory. This requires explicit approval and cannot be auto-allowed by permission rules. Pass a literal path, or guard the value with ${NAME:?}.",
        decisionReason: {
          ...decisionReason,
          reason:
            "Dangerous rm operation in a shell -c script, on a target built from a value known only when it runs",
        },
      };
}
//@ chunk-e6aww6q8.js:1213154-1213222 placement
/**
 * 三个常量：权限规则里的通配名 “*”、上报命令名上限 8、以及内联脚本中代表 “cd 到某处” 的占位伪命令。
 */
var WILDCARD_ANY_NAME; // deferred: uses MAX_INLINE_SCRIPT_LENGTH of its import cycle while loading; runs once the cycle is complete
var MAX_INLINE_REPORTED_NAMES;
var INLINE_CD_PLACEHOLDER;
deferInit("chunk-e6aww6q8.js:1213154", () => {
  WILDCARD_ANY_NAME = "*";
  MAX_INLINE_REPORTED_NAMES = 8;
  INLINE_CD_PLACEHOLDER = {
    text: `cd "${INLINE_SHELL_VALUE_PLACEHOLDER}"`,
    cd: true,
    names: [],
    exports: false,
  };
});
//@ chunk-e6aww6q8.js:1213222-1213890 placement
/**
 * 生成内联 shell 脚本无法检查危险删除时的询问结果：区分脚本内命令被权限规则拒绝与脚本含 rm 但无法检查两种说明，不可由分类器批准。
 */
function inlineShellUncheckedAsk(deniedInside, depth) {
  if (depth === 0) logDangerousRmShape("inline_shell_unchecked");
  return {
    behavior: "ask",
    message: deniedInside
      ? "A permission rule denies a command inside this shell -c script, so Claude Code could not check it for dangerous removals. Approving runs the whole script, including that command."
      : "This command passes a shell -c script that runs rm, and Claude Code could not check the script for dangerous removals. Approve only if you have read the script.",
    decisionReason: {
      type: "safetyCheck",
      reason: deniedInside
        ? "A permission rule denies a command in this shell -c script"
        : "This shell -c script runs rm and could not be checked",
      classifierApprovable: false,
      circuitBreaker: "dangerousRemoval",
    },
    suggestions: [],
  };
}
//@ chunk-e6aww6q8.js:1213890-1217476 placement
/**
 * 改写 shell -c 中的命令（export、cd、exec、env 等）以便逐个检查。
 */
async function rewriteInlineShellCommand(astCommand, assignments, recursionCtx, forceOwnOnly) {
  let { input, context, depth, divergentShapes, budget } = recursionCtx;
  let sliced = astCommand.argv.slice();
  if (sliced[0] !== undefined) sliced[0] = stripPathAndExe(sliced[0]);
  let unwrappedArgv = unwrapCommandArgv(stripWrappersFromArgvForPaths(sliced));
  let inlineShell = analyzeInlineShell(unwrappedArgv);
  if (
    inlineShell === undefined ||
    !(mayHideRm(inlineShell.judged ?? inlineShell.script) || inlineShell.script.includes("$'"))
  )
    return null;
  let sliced_2 = sliced.slice(0, sliced.length - unwrappedArgv.length);
  let toExports = (pairs) =>
    pairs.flatMap((pair) => {
      let [, name, value = ""] = /^([A-Za-z_]\w*)=(.*)$/s.exec(pair) ?? [];
      return name === undefined
        ? []
        : [`export ${name}=${/^[\w./@%+=:,-]*$/.test(value) ? value : INLINE_SHELL_VALUE_PLACEHOLDER}`];
    });
  let envExports = toExports(astCommand.envVars.map((envVar) => `${envVar.name}=${envVar.value}`));
  let prefixExports = toExports(sliced_2);
  let scriptVars = new Set([...inlineShell.script.matchAll(/\$\{?([A-Za-z_]\w*)/g)].map((match) => match[1]));
  let filtered = assignments.filter((assignment) => assignment.cd);
  let singleCdTarget =
    filtered.length === 1 && !forceOwnOnly
      ? await resolveSingleCdTarget(input.command, filtered[0], sliced_2, context)
      : undefined;
  let cdLines =
    singleCdTarget !== undefined
      ? []
      : filtered.length > 1
        ? [`cd "${INLINE_SHELL_VALUE_PLACEHOLDER}"`]
        : filtered.map((assignment) => assignment.text);
  let filtered_2 = assignments.filter((assignment) =>
    assignment.names.some(
      (name) => scriptVars.has(name) || (name === WILDCARD_ANY_NAME && scriptVars.size > 0),
    ),
  );
  let exportedNames = new Set(
    filtered_2.filter((assignment) => assignment.exports).flatMap((assignment) => assignment.names),
  );
  let variants = [
    {
      before: [...cdLines, ...filtered_2.map((assignment) => assignment.text)],
      own: true,
      from: 0,
    },
  ];
  if (
    filtered_2.some(
      (assignment) => !assignment.exports && assignment.names.some((name) => !exportedNames.has(name)),
    )
  )
    variants.push({
      before: [
        ...cdLines,
        ...filtered_2.filter((assignment) => assignment.exports).map((assignment) => assignment.text),
      ],
      own: true,
      from: 0,
    });
  let reduced = sliced_2.reduce((acc, word, idx) => {
    let trailingFlags = [];
    for (let nextWord of sliced_2.slice(idx + 1)) {
      if (!nextWord.startsWith("-")) break;
      trailingFlags.push(nextWord);
    }
    let sliced = sliced_2.slice(idx + 1);
    let baseName = stripPathAndExe(word);
    return (/^(?:sudo|doas)$/.test(baseName) &&
      !trailingFlags.some((flag) => /^(?:-\w*E\w*|--preserve-env)$/.test(flag))) ||
      baseName === "pkexec" ||
      (baseName === "exec" && sliced.some((flag) => /^-\w*c/.test(flag))) ||
      (baseName === "env" && sliced.some((flag) => /^(?:-\w*[iu]\w*|-|--i\S*|--u\S*)$/.test(flag)))
      ? idx
      : acc;
  }, -1);
  if (
    (filtered_2.length > 0 || envExports.length > 0 || prefixExports.length > 0) &&
    (reduced !== -1 ||
      filtered_2.some((assignment) =>
        /^(?:export(?:\s+-\w+)*\s+-\w*n\w*|(?:declare|typeset)(?:\s+[-+]\w+)*\s+\+\w*x\w*)(?:\s|$)/.test(
          assignment.text,
        ),
      ))
  )
    variants.push({
      before: cdLines,
      own: reduced === -1,
      from: reduced + 1,
    });
  if (forceOwnOnly && (cdLines.length > 0 || filtered_2.length > 0))
    variants.push({
      before: [],
      own: true,
      from: 0,
    });
  let joiner = isSimpleAndChain(input.command) ? " && " : " ; ";
  let isUnchecked =
    inlineShell.judged === undefined ||
    (inlineShell.homeWritten &&
      ([...envExports, ...prefixExports].some((line) => line.startsWith("export HOME=")) ||
        assignments.some((assignment) => assignment.names.includes("HOME")))) ||
    filtered_2.some((assignment) => assignment.unread) ||
    depth >= MAX_INLINE_DEPTH ||
    inlineShell.judged.length > MAX_INLINE_SCRIPT_LENGTH ||
    count(splitInlineStatements(inlineShell.judged).flat(), (word) =>
      /^(?:cd|pushd|popd|chdir)$/.test(stripPathAndExe(word)),
    ) > MAX_INLINE_STATEMENTS;
  let sawDeny = false;
  for (let { before, own, from } of isUnchecked ? [] : variants) {
    let replaced = [
      ...before,
      ...(own ? envExports : []),
      ...toExports(sliced_2.slice(from)),
      inlineShell.judged,
    ]
      .join(joiner)
      .replace(/__CMDSUB_OUTPUT__|__CMDSUB__|__INLINE_SHELL_VALUE__/g, (placeholder) =>
        placeholder === "__CMDSUB__" ? "$(__CMDSUB__)" : "${" + INLINE_SHELL_VALUE_PLACEHOLDER + "}",
      );
    let cacheKey = `${depth}
${divergentShapes}
${singleCdTarget ?? getCwd()}
${replaced}`;
    let cached = budget.judged.get(cacheKey);
    if (cached === undefined) {
      if (
        budget.left <= 0 ||
        budget.chars < replaced.length ||
        (await parseCommandRaw(replaced)) === PARSE_ABORTED
      ) {
        isUnchecked = true;
        break;
      }
      budget.left--;
      budget.chars -= replaced.length;
      let evaluate = () =>
        runWithoutTelemetry(async () => {
          let declarations = {};
          let commandRaw = await parseCommandRaw(replaced);
          let result = await bashToolHasPermission(
            {
              ...input,
              command: replaced,
            },
            context,
            undefined,
            undefined,
            {
              depth: depth + 1,
              budget,
            },
            undefined,
            (names, operands) => {
              declarations.names = names;
              declarations.operands = operands;
            },
          );
          let { readings, exhaustive } =
            declarations.names === undefined
              ? {
                  readings: [],
                  exhaustive: true,
                }
              : declarationPrefixReadings(declarations.names, declarations.operands);
          isUnchecked ||= !exhaustive;
          for (let reading of readings) {
            if (
              findSafetyCheckReason(
                result.decisionReason,
                (reason) => reason.circuitBreaker === "dangerousRemoval",
              ) !== undefined
            )
              break;
            if (budget.left <= 0) {
              isUnchecked = true;
              break;
            }
            budget.left--;
            let readingResult = await bashToolHasPermission(
              {
                ...input,
                command: replaced,
              },
              context,
              undefined,
              undefined,
              {
                depth: depth + 1,
                budget,
              },
              reading,
            );
            if (
              readingResult.behavior === "deny" ||
              findSafetyCheckReason(
                readingResult.decisionReason,
                (reason) => reason.circuitBreaker === "dangerousRemoval",
              ) !== undefined
            )
              result = readingResult;
            isUnchecked ||=
              getStructuralMissKind(readingResult) !== undefined ||
              (commandRaw !== null &&
                commandRaw !== PARSE_ABORTED &&
                parseForSecurityFromAst(replaced, commandRaw, {
                  declarationPrefix: reading,
                }).kind === "too-complex");
          }
          return result;
        });
      cached = await runWithDivergentShapes(false, () =>
        singleCdTarget === undefined ? evaluate() : runInRemoteCallFrameMain(singleCdTarget, evaluate),
      );
      budget.judged.set(cacheKey, cached);
    }
    let removalReason =
      cached.behavior === "ask"
        ? findSafetyCheckReason(
            cached.decisionReason,
            (reason) => reason.circuitBreaker === "dangerousRemoval",
          )
        : undefined;
    if (removalReason !== undefined) {
      if (depth === 0) logDangerousRmShape("inline_shell_script");
      return rewordInlineRemovalAsk(
        cached.decisionReason === removalReason
          ? cached
          : {
              behavior: "ask",
              decisionReason: removalReason,
              message: createPermissionRequestMessage(BashTool.name, removalReason),
            },
      );
    }
    sawDeny ||= cached.behavior === "deny";
  }
  return mayRunRmIndirectly(inlineShell.judged ?? inlineShell.script) &&
    ((sawDeny && !isUnchecked) ||
      (isUnchecked && needsInlineShellRmCheck(budget.command, inlineShell.judged ?? inlineShell.script)))
    ? inlineShellUncheckedAsk(sawDeny && !isUnchecked, depth)
    : null;
}
//@ chunk-e6aww6q8.js:1217476-1217892 placement
/**
 * 检查内联 shell 脚本（bash -c、eval 等）中的危险 rm，结果按深度/形状/声明前缀/cwd/前置语句/脚本文本缓存；可由 CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT 关闭。
 */
async function checkInlineShellRemoval(command, recursionCtx, assignments = [], astCommands = []) {
  if (env.CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT || !isDangerousRmEnabled()) return null;
  let cacheKey = `${recursionCtx.depth}
${recursionCtx.divergentShapes}
${recursionCtx.declarationPrefix}
${getCwd()}
${assignments.map((assignment) => assignment.text).join(`
`)}
${command}`;
  if (recursionCtx.budget.asked.has(cacheKey)) return recursionCtx.budget.asked.get(cacheKey) ?? null;
  let result =
    (await parseInlineAssignments(command, recursionCtx, assignments, astCommands, false)) ??
    (/\b(?:export|declare|typeset|readonly|local)\b/.test(command)
      ? await parseInlineAssignments(command, recursionCtx, assignments, astCommands, true)
      : null);
  recursionCtx.budget.asked.set(cacheKey, result);
  return result;
}
//@ chunk-e6aww6q8.js:1217892-1222420 placement
/**
 * 解析内联赋值（VAR=值），识别命令替换与 ANSI-C 字符串。
 */
async function parseInlineAssignments(
  command,
  recursionCtx,
  assignments,
  astCommands,
  divergentShapes,
  forceOwn = false,
  depth = 0,
  skipCopy = false,
) {
  let segments;
  try {
    segments = splitCommand(command);
  } catch {
    segments = [command];
  }
  let replaced = command.replace(/\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g, "").replace(/[<>]&|&>/g, ">");
  let matches =
    /(?:^|[;|&\n]\s*)(?:export|unset|declare|typeset|readonly|local|cd|pushd|popd|[A-Za-z_]\w*\+?=)[^;|&\n]*&(?!&)/.test(
      replaced,
    );
  let separators = await listStatementSeparators(command, segments.length);
  let sawConditional = false;
  let canTrustStatement = (segIdx) => {
    if (forceOwn || matches || sawConditional) return true;
    if (separators === null) return /\|\||&&/.test(replaced) && !isSimpleAndChain(command);
    let mapped = separators
      .filter((separator) => separator.after < segIdx)
      .map((separator) => separator.type);
    return mapped.some((type) => type === "&&" || type === "||") && mapped.some((type) => type !== "&&");
  };
  let collected = skipCopy ? assignments : [...assignments];
  let addUnread = (text) => {
    if (
      [...splitInlineStatements(text), ...splitInlineStatements(text, false)].some((statement) =>
        statement.some(
          (word, wordIdx) =>
            (word.startsWith("$") || /^(?:cd|pushd|popd|chdir)$/.test(stripPathAndExe(word))) &&
            statement
              .slice(0, wordIdx)
              .every(
                (prefixWord) =>
                  INLINE_PREFIX_WORDS.has(stripPathAndExe(prefixWord)) || prefixWord.startsWith("-"),
              ),
        ),
      ) ||
      (/\b(?:cd|pushd|popd|chdir)\b/.test(text) && /\$\(|`|\$\{?IFS\b/.test(text))
    )
      collected.push(INLINE_CD_PLACEHOLDER);
    collected.push({
      text,
      cd: false,
      names:
        /\beval\b|\bprintf\b[^;&|\n]*\s-v|\b(?:read|declare|typeset|local|export|readonly|mapfile|readarray|getopts)\b[^;&|\n]*\$|\b(?:declare|typeset|local)\b[^;&|\n]*\s-\w*n|\$\{!?[A-Za-z_]\w*:{0,2}=|\$\(\(/.test(
          text,
        ) ||
        /\bprintf\b[^;&|\n]*\s-v|\b(?:unset|export|declare|typeset|local|readonly)\b[^;&|\n]*\$/.test(
          text.replace(/["'\\]/g, ""),
        )
          ? [WILDCARD_ANY_NAME]
          : uniq(text.replace(/\$\{?[A-Za-z_]\w*/g, " ").match(/[A-Za-z_]\w*/g) ?? []),
      exports: false,
      unread: true,
    });
  };
  let isPipedAround = (segIdx) =>
    separators === null
      ? /[|&]/.test(replaced.replace(/&&|\|\|/g, ""))
      : separators.some(
          (separator) =>
            (separator.after === segIdx - 1 && /^\|&?$/.test(separator.type)) ||
            (separator.after === segIdx && /^(?:\|&?|&)$/.test(separator.type)),
        );
  let astCursor = 0;
  let consumedAst = new Set();
  for (let [segIdx, segment] of segments.entries()) {
    let text = segment.trim();
    let isOwnStatement = canTrustStatement(segIdx);
    let isNotPiped = !isPipedAround(segIdx);
    let isBraceGroup = text.startsWith("{") && /;?\s*\}$/.test(text);
    if (isBraceGroup || (text.startsWith("(") && text.endsWith(")"))) {
      let replaced = text.slice(1).replace(/;?\s*[)}]$/, "");
      if (depth >= MAX_INLINE_REPORTED_NAMES) {
        if (
          (mayRunRmIndirectly(replaced) || mayHideRm(replaced)) &&
          needsInlineShellRmCheck(recursionCtx.budget.command, text)
        )
          return inlineShellUncheckedAsk(false, recursionCtx.depth);
        addUnread(text);
        continue;
      }
      let inlineAssignments = await parseInlineAssignments(
        replaced,
        recursionCtx,
        collected,
        [],
        divergentShapes,
        isOwnStatement,
        depth + 1,
        isBraceGroup && isNotPiped,
      );
      if (inlineAssignments !== null) return inlineAssignments;
      if (isBraceGroup) {
        addUnread(text);
        let replaced_2 = replaced.replace(/\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g, "");
        sawConditional ||=
          (/\|\||&&/.test(replaced_2) && !isSimpleAndChain(replaced)) ||
          /&(?!&)/.test(replaced_2.replace(/&&|[<>]&|&>/g, ""));
      }
      continue;
    }
    let words = splitInlineStatements(text).flat();
    let any = words.some((word) => POSIX_SHELL_NAMES.has(normalizeProgramBasename(word)));
    if (
      !any &&
      !/^(?:[A-Za-z_]\w*\+?=|(?:cd|pushd|popd|chdir|export|unset|declare|typeset|readonly|local)\b)/.test(
        text,
      )
    ) {
      addUnread(text);
      continue;
    }
    let node = await parseCommandRaw(text);
    if (node === null || node === PARSE_ABORTED) {
      if (
        any &&
        words.some((word) => hasAnyShortFlagChar(word, "c")) &&
        mayRunRmIndirectly(text) &&
        needsInlineShellRmCheck(recursionCtx.budget.command, text)
      )
        return inlineShellUncheckedAsk(false, recursionCtx.depth);
      addUnread(text);
      continue;
    }
    let replacements = [];
    let hasAnsiCString = false;
    let resolveValue = (name) => {
      let filtered = collected.filter(
        (assignment) =>
          name && (assignment.names.includes(name) || assignment.names.includes(WILDCARD_ANY_NAME)),
      );
      hasAnsiCString ||= isOwnStatement && filtered.length > 0;
      let suffixValue = "";
      for (let assignment of filtered.reverse()) {
        if (assignment.unread) return INLINE_SHELL_VALUE_PLACEHOLDER;
        if (/^unset(?:\s|$)/.test(assignment.text)) return suffixValue;
        let match = new RegExp(
          `(?:^|\\s)${name}(\\+?)=(?:"([^"$\`\\\\]*)"|'([^']*)'|([^\\s"'$\`\\\\]*))(?:\\s|$)`,
        ).exec(assignment.text);
        if (match !== null) {
          let value = (match[2] ?? match[3] ?? match[4] ?? "") + suffixValue;
          if (!/^[\w./@%+=:,-]*$/.test(value)) return INLINE_SHELL_VALUE_PLACEHOLDER;
          if (match[1] !== "+") return value;
          suffixValue = value;
          continue;
        }
        if (new RegExp(`(?:^|\\s)${name}\\+?=`).test(assignment.text)) return INLINE_SHELL_VALUE_PLACEHOLDER;
      }
      return suffixValue === "" ? INLINE_SHELL_VALUE_PLACEHOLDER : suffixValue;
    };
    let collectReplacements = (node) => {
      if (/^(?:simple_expansion|expansion|arithmetic_expansion)$/.test(node.type))
        replacements.push([
          node.startIndex,
          node.endIndex,
          resolveValue(/^\$\{?([A-Za-z_]\w*)\}?$/.exec(node.text)?.[1]),
        ]);
      else if (/^(?:command|process)_substitution$/.test(node.type))
        replacements.push([node.startIndex, node.endIndex, "__CMDSUB__"]);
      else {
        hasAnsiCString ||= node.type === "ansi_c_string";
        for (let child of node.children) collectReplacements(child);
      }
    };
    collectReplacements(node);
    let buffer = Buffer.from(text);
    for (let [start, end, replacement] of replacements.reverse())
      buffer = Buffer.concat([buffer.subarray(0, start), Buffer.from(replacement), buffer.subarray(end)]);
    let resolved = await parseForSecurity(buffer.toString(), {
      readsDivergentShapes: divergentShapes,
    });
    if (resolved.kind !== "simple" || hasAnsiCString) {
      if (
        any &&
        words.some((word) => hasAnyShortFlagChar(word, "c")) &&
        ((mayRunRmIndirectly(
          text.replace(
            /\\[ntr]/g,
            `
`,
          ),
        ) &&
          needsInlineShellRmCheck(recursionCtx.budget.command, text, buffer.toString())) ||
          hasInlineShellC(text))
      )
        return inlineShellUncheckedAsk(false, recursionCtx.depth);
      addUnread(text);
      continue;
    }
    if (
      /^(?:[A-Za-z_]\w*\+?=(?:'[^']*'|"[^"]*"|[^\s'"])*\s+)*(?:declare|typeset|local)\b[^;&|\n]*\s-\w*n/.test(
        text,
      )
    ) {
      addUnread(text);
      continue;
    }
    let assignmentStatement = describeAssignmentStatement(text, resolved.commands);
    if (assignmentStatement?.names.some((name) => /__INLINE_SHELL_VALUE__|__CMDSUB/.test(name))) {
      addUnread(text);
      continue;
    }
    if (assignmentStatement !== undefined) {
      if (isNotPiped) collected.push(assignmentStatement);
      else addUnread(text);
      continue;
    }
    for (let command of resolved.commands) {
      let index = astCommands.findIndex(
        (astCommand, astIdx) =>
          astIdx >= astCursor &&
          astCommand.argv.length === command.argv.length &&
          command.argv.every(
            (arg, argIdx) => arg === astCommand.argv[argIdx] || /__INLINE_SHELL_VALUE__|__CMDSUB__/.test(arg),
          ),
      );
      if (index !== -1) {
        astCursor = index + 1;
        consumedAst.add(index);
      }
      let astCommand = astCommands[index];
      let rewriteResult = await rewriteInlineShellCommand(
        astCommand === undefined
          ? command
          : {
              ...astCommand,
              argv: astCommand.argv.map((arg, argIdx) =>
                command.argv[argIdx].includes("__CMDSUB__") ||
                (command.argv[argIdx].includes(INLINE_SHELL_VALUE_PLACEHOLDER) &&
                  collected.some((assignment) => assignment.unread))
                  ? command.argv[argIdx]
                  : arg,
              ),
            },
        collected,
        recursionCtx,
        isOwnStatement,
      );
      if (rewriteResult !== null) return rewriteResult;
    }
    addUnread(
      /\b(?:eval|trap|source)\b|(?:^|\s)\.\s/.test(text)
        ? text
        : text.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''"),
    );
  }
  let lastTrust = canTrustStatement(segments.length);
  for (let [idx, astCommand] of astCommands.entries()) {
    let rewriteResult = consumedAst.has(idx)
      ? null
      : await rewriteInlineShellCommand(astCommand, collected, recursionCtx, lastTrust);
    if (rewriteResult !== null) return rewriteResult;
  }
  return null;
}
export {
  INLINE_CD_PLACEHOLDER,
  checkInlineShellRemoval,
  combineDeclarationReadings,
  normalizeProgramBasename,
};
