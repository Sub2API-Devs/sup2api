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

//@ chunk-e6aww6q8.js:1204114-1204550 placement
/**
 * 合并声明前缀不同读法的检查结果：任一 deny 即 deny；取最严重者；读法不穷尽且结果非 ask 时要求确认（too-complex）。
 */
function combineDeclarationReadings(result, n, exhaustive, s) {
  let found = [result, ...n].find((w) => w.behavior === "deny");
  if (found !== undefined) return found;
  if (!s && result.behavior === "ask" && !isPlainAsk(result)) return result;
  let y = result;
  for (let w of n) if (getDecisionSeverity(w) > getDecisionSeverity(y)) y = w;
  if (exhaustive || y.behavior === "ask") return y;
  let S = {
    type: "other",
    reason: "Variables set in front of a declaration in this command can't all be checked before it runs",
    bashMissKind: "too-complex",
  };
  return {
    behavior: "ask",
    decisionReason: S,
    message: createPermissionRequestMessage(BashTool.name, S),
    suggestions: [],
  };
}
//@ chunk-e6aww6q8.js:1204550-1204695 placement
var MAX_INLINE_SCRIPT_LENGTH = 2000;
var MAX_INLINE_STATEMENTS = 8;
var INLINE_SHELL_VALUE_PLACEHOLDER = "__INLINE_SHELL_VALUE__";
var INLINE_PREFIX_WORDS = new Set([
  ...COMMAND_WRAPPERS,
  ...LEADING_KEYWORDS,
  ..."builtin noglob toybox trap watch flock chroot script".split(" "),
]);
//@ chunk-e6aww6q8.js:1204695-1205183 placement
/**
 * 粗略地把脚本文本拆成语句与单词：引号内元字符置为分隔外字符，去掉重定向与前导赋值，按 ;&|()`{} 等切分。
 */
function splitInlineStatements(e, n = true) {
  return e
    .replace(n ? /\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g : /(?!)/g, (r) =>
      r.startsWith("\\") ? r : r.replace(/[\s;&|()`{}!]/g, "\x00"),
    )
    .replace(/\d*[<>]&(?:\d+-?|-)(?![^\s;&|()])/g, " ")
    .replace(/\d*[<>]&|&>>?|>\|/g, ">")
    .replace(/\$(?=['"])|['"\\]/g, "")
    .split(/[;&|()`{}\n!]|\$\(/)
    .map((r) => {
      let filtered = r.split(/[ \t]+/).filter(Boolean);
      return filtered.filter(
        (h, y) =>
          !/^\d*[<>]/.test(h) &&
          !/^\d*[<>]+$/.test(filtered[y - 1] ?? "") &&
          !(/^\w+\+?=/.test(h) && filtered.slice(0, y).every((S) => /^\w+\+?=/.test(S))),
      );
    });
}
//@ chunk-e6aww6q8.js:1205183-1205260 placement
/**
 * 取可执行名并归一（小写、去掉 -1.2.3 版本号），用于识别 busybox/toybox 这类多重调用程序。
 */
function normalizeProgramBasename(e) {
  return stripPathAndExe(e ?? "")
    .toLowerCase()
    .replace(/-\d+(?:\.\d+)*$/, "");
}
//@ chunk-e6aww6q8.js:1205260-1205700 placement
/**
 * 判断脚本是否可能间接运行 rm/rmdir：与 xargs/find -exec/sh -c 等组合、以变量作命令名、赋值为 rm，或大括号展开成 rm。
 */
function mayRunRmIndirectly(e) {
  let n = (s) =>
    /^(?:\w*=)?rm(?:dir)?$/i.test(stripPathAndExe(s.replace(/\d*[<>].*$/s, ""))) ||
    /(?:^|,)rm(?:dir)?(?:,|\$)/i.test(s);
  let r = (s) => INLINE_PREFIX_WORDS.has(stripPathAndExe(s).toLowerCase());
  return (
    [...splitInlineStatements(e), ...splitInlineStatements(e, false)].some(
      (s) =>
        s.some(
          (h, y) =>
            n(h) &&
            s.some(
              (S, w) =>
                w !== y && (r(S) || hasAnyShortFlagChar(S, "c") || /^-(?:exec(?:dir)?|ok(?:dir)?)$/.test(S)),
            ),
        ) ||
        s.some((h, y) => (n(h) || h.startsWith("$")) && (y === 0 || r(s[y - 1]))) ||
        s.some((h) => /^\w+=(?:\S*\/)?rm(?:dir)?$/i.test(h)),
    ) || splitShellWords(e).some(braceExpandsToRm)
  );
}
//@ chunk-e6aww6q8.js:1205700-1206270 placement
/**
 * 宽松判断脚本文本是否可能提到 rm/rmdir：去掉转义、引号、变量与默认值展开等多种变体后匹配，并检查大括号展开。
 */
function mentionsRm(e) {
  let n = /(?:^|[^\w.-]|\$\{[^{}:-]*:?-)rm(?:dir)?(?:\.exe)?(?![\w.-])/i;
  let r = [/\$[=~^]*(?:[A-Za-z_]\w*|[0-9]+|[@*#?!$-]|\{[^{}]*\})/g, /\$(?:[0-9]+|[@*#?!$-]|\{[^{}]*\})/g];
  let s = (L) => L.replace(/\$\{[^{}:=?+-]*:?[-=?+]([^{}]*)\}/g, "$1");
  let replaced = e.replace(/\\\n/g, "");
  let y = (L) => L.replace(/\$(?=['"])|['"\\]/g, "");
  let flattened = [replaced, y(replaced), y(replaced.replace(/\\[ntr]/g, " "))].flatMap((L) => [L, s(L)]);
  let flattened_2 = r.flatMap((L) =>
    [" ", ""].flatMap((G) => [y(s(replaced).replace(L, G)), ...flattened.map((q) => q.replace(L, G))]),
  );
  return (
    [...flattened, ...flattened_2].some((L) => n.test(L)) ||
    [...splitShellWords(replaced), ...splitShellWords(y(replaced))].some((L) =>
      braceExpandsToRm(L.replace(/\.exe$/i, "")),
    )
  );
}
//@ chunk-e6aww6q8.js:1206270-1206308 placement
/**
 * 匹配 $'…' 里带 C 风格转义（\x \u \U \c \0-7）的字符串，这类脚本无法静态判定。
 */
var C_STYLE_ESCAPE_RE = /\$'(?:\\'|[^'])*\\[xuUc0-7]/;
//@ chunk-e6aww6q8.js:1206308-1206422 placement
function hasInlineShellC(e) {
  return [e, e.replace(/\\\n/g, "")].some(
    (n) => C_STYLE_ESCAPE_RE.test(n) || C_STYLE_ESCAPE_RE.test(n.replace(/'(?:\\'|"'")'/g, "'")),
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
function needsInlineShellRmCheck(...e) {
  return !isStrictInlineShellRmPromptEnabled() || e.some((n) => mentionsRm(n) || hasInlineShellC(n));
}
//@ chunk-e6aww6q8.js:1206577-1206771 placement
function mayHideRm(e) {
  let replaced = e.replace(/\$(?=['"])|['"\\]/g, "");
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
function hasUnmodeledShellFeatures(e) {
  return (
    /\bfunction\b|\balias\b|\bIFS\b|\w\s*\(\s*\)|(?:^|[\s;&|(){}])(?:argv|[0-9]+)(?:\[[^\]]*\])?=|(?:^|[\s;&|(){}!])set\s[^;&|\n]*(?:\$\(|`)/.test(
      e,
    ) ||
    splitInlineStatements(e).some((n) =>
      n.some(
        (r, s) =>
          n.slice(0, s).every((h) => INLINE_PREFIX_WORDS.has(h) || /^(?:-|\d+$)/.test(h)) &&
          (/^(?:shift|source|\.|eval|trap)$/.test(r) ||
            /^\$(?!\{?[0-9@*#])/.test(r) ||
            (r === "set" &&
              n
                .slice(s + 1)
                .some(
                  (h, y, S) => h === "-" || h === "--" || (!/^[-+]/.test(h) && !/[oO]$/.test(S[y - 1] ?? "")),
                ))),
      ),
    )
  );
}
//@ chunk-e6aww6q8.js:1207209-1207298 placement
/**
 * 按 shell 词法切分（处理单双引号与反斜杠转义），得到单词列表。
 */
function splitShellWords(e) {
  return e.match(/(?:[^\s'"\\]|\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*")+/g) ?? [];
}
//@ chunk-e6aww6q8.js:1207298-1207478 placement
function braceExpandsToRm(e) {
  let match = /^([^{]*)\{([^{}]*)\}(.*)$/s.exec(e.replace(/["'\\]/g, ""));
  return (
    match !== null &&
    match[2].split(/,|\.\./).some((r) => /(?:^|\/)rm(?:dir)?$/i.test(`${match[1]}${r}${match[3]}`))
  );
}
//@ chunk-e6aww6q8.js:1207478-1207919 placement
/**
 * 判断单词中的大括号展开是否有风险：多层或不规则、前后缀含路径或特殊字符、展开项含路径/通配/rm 或可能为空。
 */
function hasRiskyBraceExpansion(e) {
  let replaced = e.replace(/\$\{[^{}]*\}/g, "$X");
  let r = count([...replaced], (w) => w === "{");
  if (r === 0 || !/,|\.\./.test(replaced)) return false;
  let match = /^([^{]*)\{([^{}]*)\}(.*)$/s.exec(replaced);
  if (r > 1 || match === null) return true;
  let [, h = "", y = "", S = ""] = match;
  if (!/,|\.\./.test(y)) return false;
  return (
    /^["']?[/~$]|[{},\\'"]|\.\./.test(h) ||
    /[~{},\\'"]/.test(S) ||
    y
      .split(/,|\.\./)
      .map((w) => w.replace(/["'\\]/g, ""))
      .some(
        (w) =>
          /[/~$*?[]|^\.\.?$|\brm/.test(w) || (w === "" && /[$]|^["']?\//.test(h + S)) || braceExpandsToRm(e),
      )
  );
}
//@ chunk-e6aww6q8.js:1207919-1210963 placement
/**
 * 分析内联 shell（busybox、zsh、bash -c 等）中的命令，必要时加上防护变量。
 */
function analyzeInlineShell(e) {
  let [n = "", ...r] =
    (normalizeProgramBasename(e[0]) === "busybox" || normalizeProgramBasename(e[0]) === "toybox") &&
    POSIX_SHELL_NAMES.has(normalizeProgramBasename(e[1]))
      ? e.slice(1)
      : e;
  if (!POSIX_SHELL_NAMES.has(normalizeProgramBasename(n))) return;
  let s = false;
  let h = false;
  let y = 0;
  for (; y < r.length; y++) {
    let We = r[y];
    if (We === "-" || We === "--") {
      y++;
      break;
    }
    if (!/^[-+]./.test(We)) break;
    let ze = /^(?:r?ba)?sh$/.test(normalizeProgramBasename(n))
      ? /^--?(?:login|posix|noprofile|norc|noediting|verbose|restricted|debugger|dump-(?:po-)?strings|wordexp|pretty-print|help|version|(rcfile|init-file))$/.exec(
          We,
        )
      : null;
    if (ze !== null) y += ze[1] === undefined ? 0 : 1;
    else if (We.startsWith("--")) h = true;
    else {
      h ||=
        (/^(?:r?ba)?sh$/.test(normalizeProgramBasename(n)) &&
          /[^abcefhiklmnoprstuvxBCDEHIOPT]/.test(We.slice(1))) ||
        (/ksh$/.test(normalizeProgramBasename(n)) && /[oO]./.test(We));
      s ||= We.startsWith("-") && We.includes("c");
      y += We.match(/[oO]/g)?.length ?? 0;
    }
  }
  if (h)
    return r.some((We) => /^-[A-Za-z]*c/.test(We))
      ? {
          script: r.join(" "),
          judged: undefined,
          homeWritten: false,
        }
      : undefined;
  let S = r[y];
  if (!s || S === undefined) return;
  if (S.length > MAX_INLINE_SCRIPT_LENGTH)
    return {
      script: S,
      judged: undefined,
      homeWritten: false,
    };
  if (
    splitShellWords(S).some(hasRiskyBraceExpansion) ||
    /\balias\b/.test(S) ||
    /\bIFS\b/.test(
      S.replace(
        /(?:^|[;&|\n({]\s*)(?:(?:do|then|else|elif|if|while|until)\s+)?IFS=(?:'[^']*'|"[^"]*"|[^\s;&|'"\\])*[ \t]+read\b/g,
        " read",
      ),
    ) ||
    (normalizeProgramBasename(n) === "zsh" &&
      /(?:^|[\s;&|(){}])=(?!=)\S|\$\{?\w+\}?(?::[htrelquQxsaAcP&]|\[)|\bargv\b|\$(?:[=~^]|\{[=~^(])|\(:/.test(
        S,
      ))
  )
    return {
      script: S,
      judged: undefined,
      homeWritten: false,
    };
  let w = homedir();
  let L = w.includes("\\") ? "$HOME" : w;
  let G = false;
  let q = (We, ze) => We.endsWith("$HOME") && /\w/.test(ze ?? "");
  let Z = (We) => ({
    script: S,
    judged:
      G &&
      (/[\s*?[]/.test(w) ||
        /HOME/.test(
          (We ?? "")
            .split("$HOME")
            .join("")
            .replace(/["'\\]/g, ""),
        ))
        ? undefined
        : We,
    homeWritten: G,
  });
  let Se = S;
  if (L !== w && S.includes(w)) {
    let parts = S.split(w);
    if (
      S.includes("'") ||
      parts.slice(1).some((ze) => q(L, ze[0])) ||
      parts.slice(0, -1).some((ze) => ze.endsWith("\\"))
    )
      return {
        script: S,
        judged: undefined,
        homeWritten: G,
      };
    Se = parts.join(L);
    G = true;
  }
  if (!/\$(?:\{[!#@*0-9]|[#@*0-9])/.test(S)) return Z(Se);
  let ke = [r[y + 1] ?? n, ...r.slice(y + 2)];
  let we = (We) => /^[\w./@%+=:,*?[\]!^{} \t\n-]*$/.test(We);
  let Ee = (We) => {
    let ze = /^~(?=\/|$)/.test(We)
      ? We.slice(1)
      : L !== w && (We === w || We.startsWith(`${w}\\`) || We.startsWith(`${w}/`))
        ? We.slice(w.length).replace(/\\/g, "/")
        : undefined;
    if (ze === undefined)
      return We.startsWith("~")
        ? undefined
        : we(We)
          ? We.replace(/[\t\n]/g, " ")
          : INLINE_SHELL_VALUE_PLACEHOLDER;
    G ||= L !== w;
    return we(L === w ? w + ze : ze) ? (L + ze).replace(/[\t\n]/g, " ") : INLINE_SHELL_VALUE_PLACEHOLDER;
  };
  let mapped = ke.map(Ee);
  if (
    /\$\{(?![0-9]+(?:\}|:?\?[^}$`]*\})|[@*#]\})[!#@*0-9]/.test(S) ||
    S.includes("'") ||
    hasUnmodeledShellFeatures(S) ||
    mapped.includes(undefined)
  )
    return Z(undefined);
  let Ie = true;
  let replaced = Se.replace(
    /\\[\s\S]|"\$\{?@\}?"|\$\{([0-9]+)(:?)\?[^}]*\}|\$(?:\{([0-9]+|[@*#])\}|([0-9@*#]))/g,
    (We, ze, lt, Je, nt, pt) => {
      let Et = Je ?? nt;
      let yt = (gt) => {
        Ie &&= !q(gt, Se[pt + We.length]);
        return gt;
      };
      if (We.startsWith('"')) {
        let replaced = Se.slice(0, pt).replace(/\\[\s\S]/g, "");
        Ie &&= countCharInString(replaced, '"') % 2 === 0;
        return mapped
          .slice(1)
          .map((At) => `"${At}"`)
          .join(" ");
      }
      if (ze !== undefined) {
        let gt = mapped[Number(ze)];
        let At = "${__INLINE_SHELL_GUARDED__:?}";
        return gt === undefined
          ? "${__INLINE_SHELL_GUARDED__:?}"
          : gt === "" || gt === INLINE_SHELL_VALUE_PLACEHOLDER
            ? lt
              ? "${__INLINE_SHELL_GUARDED__:?}"
              : gt
            : yt(gt);
      }
      if (Et === undefined) return We;
      if (Et === "#") return String(ke.length - 1);
      if (Et === "@" || Et === "*") {
        Ie &&= ke.length <= 2;
        return yt(mapped[1] ?? "");
      }
      return yt(mapped[Number(Et)] ?? "");
    },
  );
  return Z(Ie && !hasUnmodeledShellFeatures(replaced) ? replaced : undefined);
}
//@ chunk-e6aww6q8.js:1210963-1211518 placement
/**
 * 描述前置语句：纯赋值返回变量名；cd 标记 cd；export/unset/declare 等返回涉及的变量名及是否导出；其他返回 undefined。
 */
function describeAssignmentStatement(e, commands) {
  let [r] = commands;
  if (r === undefined) {
    let y = [...e.matchAll(/(?:^|\s)([A-Za-z_]\w*)\+?=/g)];
    return {
      text: e,
      cd: false,
      names: y.map((S) => S[1]),
      exports: false,
    };
  }
  let [s = "", ...h] = r.argv;
  if (commands.length > 1) return;
  if (isNormalizedCdCommand(r.text))
    return {
      text: e,
      cd: true,
      names: [],
      exports: false,
    };
  if (!/^(?:export|unset|declare|typeset|readonly|local)$/.test(s)) return;
  return {
    text: e,
    cd: false,
    names:
      s === "unset" && h.some((y) => /^-\w*f/.test(y)) && !h.some((y) => /^-\w*v/.test(y))
        ? []
        : h.filter((y) => !y.startsWith("-")).map((y) => y.replace(/=.*$/s, "")),
    exports: s === "export" || s === "unset" || h.some((y) => /^-\w*x/.test(y)),
  };
}
//@ chunk-e6aww6q8.js:1211518-1212066 placement
/**
 * 解析命令并列出顶层语句分隔符（&&、||、|、;、&、换行）及其位于第几条语句之后；解析失败返回 null。
 */
async function listStatementSeparators(e, n) {
  let commandRaw = await parseCommandRaw(e);
  if (
    commandRaw === null ||
    commandRaw === PARSE_ABORTED ||
    commandRaw.type !== "program" ||
    parseHasErrorNode(commandRaw)
  )
    return null;
  let s = [];
  let h = 0;
  let y = (child) => /^(?:&&|\|\||\||;|&|\|&|\n)$/.test(child.type);
  let S = (w) => {
    if (y(w))
      s.push({
        after: h - 1,
        type: w.type,
      });
    else if (w.type === "redirected_statement")
      w.children.filter((child) => !child.type.endsWith("_redirect")).forEach(S);
    else if (/^(?:program|list|pipeline)$/.test(w.type)) {
      let L = false;
      for (let child of w.children.filter((child) => child.type !== "comment")) {
        if (L && !y(child))
          s.push({
            after: h - 1,
            type: `
`,
          });
        S(child);
        L = !y(child);
      }
    } else if (w.type !== "comment") h++;
  };
  S(commandRaw);
  return h === n ? s : null;
}
//@ chunk-e6aww6q8.js:1212066-1212508 placement = parseForSecurity (0.837)
/**
 * shell -c 递归检查辅助：脚本前只有一个 cd 且其余以 && 连接时，解析 cd 目标并调用 Vze 计算新 cwd；远程执行或带 -C/-D/--chdir/su 等时放弃。
 */
async function resolveSingleCdTarget(command, n, r, context) {
  if (
    context.forRemoteExecution === true ||
    r.some(
      (w) =>
        /^(?:-[A-Za-z]*[CDiR]|--(?:chdir|login|chroot))/.test(w) ||
        /^(?:unshare|nsenter|chroot|pkexec|runuser|su)$/.test(stripPathAndExe(w)),
    )
  )
    return;
  let h;
  try {
    h = splitCommand(command);
  } catch {
    return;
  }
  let y = await listStatementSeparators(command, h.length);
  if (h[0]?.trim() !== n.text || y === null || y.some((w) => w.type !== "&&")) return;
  let root = await parseForSecurity(n.text);
  return root.kind === "simple" && root.commands.length === 1
    ? (resolveSimpleCdTarget(root.commands[0], getCwd(), getToolPermissionContext(context)) ?? undefined)
    : undefined;
}
//@ chunk-e6aww6q8.js:1212508-1213154 placement
/**
 * 把内联 shell 脚本中危险 rm 的询问改写为更明确的说明（目标来自运行时才知道的变量或命令输出，可能为空而删到根或家目录），提示使用字面路径或 ${NAME:?}。
 */
function rewordInlineRemovalAsk(e) {
  if (e.behavior !== "ask") return e;
  let decisionReason = e.decisionReason;
  return decisionReason?.type !== "safetyCheck" ||
    !/__INLINE_SHELL_|__CMDSUB/.test(e.message + decisionReason.reason)
    ? e
    : {
        ...e,
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
var WILDCARD_ANY_NAME = "*";
var MAX_INLINE_REPORTED_NAMES = 8;
var INLINE_CD_PLACEHOLDER = {
  text: `cd "${INLINE_SHELL_VALUE_PLACEHOLDER}"`,
  cd: true,
  names: [],
  exports: false,
};
//@ chunk-e6aww6q8.js:1213222-1213890 placement
/**
 * 生成内联 shell 脚本无法检查危险删除时的询问结果：区分脚本内命令被权限规则拒绝与脚本含 rm 但无法检查两种说明，不可由分类器批准。
 */
function inlineShellUncheckedAsk(e, depth) {
  if (depth === 0) logDangerousRmShape("inline_shell_unchecked");
  return {
    behavior: "ask",
    message: e
      ? "A permission rule denies a command inside this shell -c script, so Claude Code could not check it for dangerous removals. Approving runs the whole script, including that command."
      : "This command passes a shell -c script that runs rm, and Claude Code could not check the script for dangerous removals. Approve only if you have read the script.",
    decisionReason: {
      type: "safetyCheck",
      reason: e
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
async function rewriteInlineShellCommand(e, n, r, s) {
  let { input, context, depth, divergentShapes, budget } = r;
  let sliced = e.argv.slice();
  if (sliced[0] !== undefined) sliced[0] = stripPathAndExe(sliced[0]);
  let q = unwrapCommandArgv(stripWrappersFromArgvForPaths(sliced));
  let Z = analyzeInlineShell(q);
  if (Z === undefined || !(mayHideRm(Z.judged ?? Z.script) || Z.script.includes("$'"))) return null;
  let sliced_2 = sliced.slice(0, sliced.length - q.length);
  let ke = (gt) =>
    gt.flatMap((At) => {
      let [, It, Yt = ""] = /^([A-Za-z_]\w*)=(.*)$/s.exec(At) ?? [];
      return It === undefined
        ? []
        : [`export ${It}=${/^[\w./@%+=:,-]*$/.test(Yt) ? Yt : INLINE_SHELL_VALUE_PLACEHOLDER}`];
    });
  let we = ke(e.envVars.map((envVar) => `${envVar.name}=${envVar.value}`));
  let Ee = ke(sliced_2);
  let Ae = new Set([...Z.script.matchAll(/\$\{?([A-Za-z_]\w*)/g)].map((gt) => gt[1]));
  let filtered = n.filter((gt) => gt.cd);
  let Me =
    filtered.length === 1 && !s
      ? await resolveSingleCdTarget(input.command, filtered[0], sliced_2, context)
      : undefined;
  let We =
    Me !== undefined
      ? []
      : filtered.length > 1
        ? [`cd "${INLINE_SHELL_VALUE_PLACEHOLDER}"`]
        : filtered.map((gt) => gt.text);
  let filtered_2 = n.filter((gt) =>
    gt.names.some((At) => Ae.has(At) || (At === WILDCARD_ANY_NAME && Ae.size > 0)),
  );
  let lt = new Set(filtered_2.filter((gt) => gt.exports).flatMap((gt) => gt.names));
  let Je = [
    {
      before: [...We, ...filtered_2.map((gt) => gt.text)],
      own: true,
      from: 0,
    },
  ];
  if (filtered_2.some((gt) => !gt.exports && gt.names.some((At) => !lt.has(At))))
    Je.push({
      before: [...We, ...filtered_2.filter((gt) => gt.exports).map((gt) => gt.text)],
      own: true,
      from: 0,
    });
  let reduced = sliced_2.reduce((acc, At, It) => {
    let Yt = [];
    for (let rn of sliced_2.slice(It + 1)) {
      if (!rn.startsWith("-")) break;
      Yt.push(rn);
    }
    let sliced = sliced_2.slice(It + 1);
    let Zt = stripPathAndExe(At);
    return (/^(?:sudo|doas)$/.test(Zt) && !Yt.some((rn) => /^(?:-\w*E\w*|--preserve-env)$/.test(rn))) ||
      Zt === "pkexec" ||
      (Zt === "exec" && sliced.some((rn) => /^-\w*c/.test(rn))) ||
      (Zt === "env" && sliced.some((rn) => /^(?:-\w*[iu]\w*|-|--i\S*|--u\S*)$/.test(rn)))
      ? It
      : acc;
  }, -1);
  if (
    (filtered_2.length > 0 || we.length > 0 || Ee.length > 0) &&
    (reduced !== -1 ||
      filtered_2.some((gt) =>
        /^(?:export(?:\s+-\w+)*\s+-\w*n\w*|(?:declare|typeset)(?:\s+[-+]\w+)*\s+\+\w*x\w*)(?:\s|$)/.test(
          gt.text,
        ),
      ))
  )
    Je.push({
      before: We,
      own: reduced === -1,
      from: reduced + 1,
    });
  if (s && (We.length > 0 || filtered_2.length > 0))
    Je.push({
      before: [],
      own: true,
      from: 0,
    });
  let pt = isSimpleAndChain(input.command) ? " && " : " ; ";
  let Et =
    Z.judged === undefined ||
    (Z.homeWritten &&
      ([...we, ...Ee].some((gt) => gt.startsWith("export HOME=")) ||
        n.some((gt) => gt.names.includes("HOME")))) ||
    filtered_2.some((gt) => gt.unread) ||
    depth >= MAX_INLINE_DEPTH ||
    Z.judged.length > MAX_INLINE_SCRIPT_LENGTH ||
    count(splitInlineStatements(Z.judged).flat(), (gt) =>
      /^(?:cd|pushd|popd|chdir)$/.test(stripPathAndExe(gt)),
    ) > MAX_INLINE_STATEMENTS;
  let yt = false;
  for (let { before, own, from } of Et ? [] : Je) {
    let replaced = [...before, ...(own ? we : []), ...ke(sliced_2.slice(from)), Z.judged]
      .join(pt)
      .replace(/__CMDSUB_OUTPUT__|__CMDSUB__|__INLINE_SHELL_VALUE__/g, (pn) =>
        pn === "__CMDSUB__" ? "$(__CMDSUB__)" : "${" + INLINE_SHELL_VALUE_PLACEHOLDER + "}",
      );
    let qt = `${depth}
${divergentShapes}
${Me ?? getCwd()}
${replaced}`;
    let Zt = budget.judged.get(qt);
    if (Zt === undefined) {
      if (
        budget.left <= 0 ||
        budget.chars < replaced.length ||
        (await parseCommandRaw(replaced)) === PARSE_ABORTED
      ) {
        Et = true;
        break;
      }
      budget.left--;
      budget.chars -= replaced.length;
      let pn = () =>
        runWithoutTelemetry(async () => {
          let no = {};
          let commandRaw = await parseCommandRaw(replaced);
          let ho = await bashToolHasPermission(
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
              no.names = names;
              no.operands = operands;
            },
          );
          let { readings, exhaustive } =
            no.names === undefined
              ? {
                  readings: [],
                  exhaustive: true,
                }
              : declarationPrefixReadings(no.names, no.operands);
          Et ||= !exhaustive;
          for (let reading of readings) {
            if (
              findSafetyCheckReason(ho.decisionReason, (To) => To.circuitBreaker === "dangerousRemoval") !==
              undefined
            )
              break;
            if (budget.left <= 0) {
              Et = true;
              break;
            }
            budget.left--;
            let fo = await bashToolHasPermission(
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
              fo.behavior === "deny" ||
              findSafetyCheckReason(fo.decisionReason, (To) => To.circuitBreaker === "dangerousRemoval") !==
                undefined
            )
              ho = fo;
            Et ||=
              getStructuralMissKind(fo) !== undefined ||
              (commandRaw !== null &&
                commandRaw !== PARSE_ABORTED &&
                parseForSecurityFromAst(replaced, commandRaw, {
                  declarationPrefix: reading,
                }).kind === "too-complex");
          }
          return ho;
        });
      Zt = await runWithDivergentShapes(false, () =>
        Me === undefined ? pn() : runInRemoteCallFrameMain(Me, pn),
      );
      budget.judged.set(qt, Zt);
    }
    let rn =
      Zt.behavior === "ask"
        ? findSafetyCheckReason(Zt.decisionReason, (pn) => pn.circuitBreaker === "dangerousRemoval")
        : undefined;
    if (rn !== undefined) {
      if (depth === 0) logDangerousRmShape("inline_shell_script");
      return rewordInlineRemovalAsk(
        Zt.decisionReason === rn
          ? Zt
          : {
              behavior: "ask",
              decisionReason: rn,
              message: createPermissionRequestMessage(BashTool.name, rn),
            },
      );
    }
    yt ||= Zt.behavior === "deny";
  }
  return mayRunRmIndirectly(Z.judged ?? Z.script) &&
    ((yt && !Et) || (Et && needsInlineShellRmCheck(budget.command, Z.judged ?? Z.script)))
    ? inlineShellUncheckedAsk(yt && !Et, depth)
    : null;
}
//@ chunk-e6aww6q8.js:1217476-1217892 placement
/**
 * 检查内联 shell 脚本（bash -c、eval 等）中的危险 rm，结果按深度/形状/声明前缀/cwd/前置语句/脚本文本缓存；可由 CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT 关闭。
 */
async function checkInlineShellRemoval(command, n, r = [], commands = []) {
  if (env.CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT || !isDangerousRmEnabled()) return null;
  let h = `${n.depth}
${n.divergentShapes}
${n.declarationPrefix}
${getCwd()}
${r.map((S) => S.text).join(`
`)}
${command}`;
  if (n.budget.asked.has(h)) return n.budget.asked.get(h) ?? null;
  let y =
    (await parseInlineAssignments(command, n, r, commands, false)) ??
    (/\b(?:export|declare|typeset|readonly|local)\b/.test(command)
      ? await parseInlineAssignments(command, n, r, commands, true)
      : null);
  n.budget.asked.set(h, y);
  return y;
}
//@ chunk-e6aww6q8.js:1217892-1222420 placement
/**
 * 解析内联赋值（VAR=值），识别命令替换与 ANSI-C 字符串。
 */
async function parseInlineAssignments(e, n, r, s, h, y = false, S = 0, w = false) {
  let L;
  try {
    L = splitCommand(e);
  } catch {
    L = [e];
  }
  let replaced = e.replace(/\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g, "").replace(/[<>]&|&>/g, ">");
  let matches =
    /(?:^|[;|&\n]\s*)(?:export|unset|declare|typeset|readonly|local|cd|pushd|popd|[A-Za-z_]\w*\+?=)[^;|&\n]*&(?!&)/.test(
      replaced,
    );
  let Z = await listStatementSeparators(e, L.length);
  let Se = false;
  let ke = (ze) => {
    if (y || matches || Se) return true;
    if (Z === null) return /\|\||&&/.test(replaced) && !isSimpleAndChain(e);
    let mapped = Z.filter((Je) => Je.after < ze).map((Je) => Je.type);
    return mapped.some((Je) => Je === "&&" || Je === "||") && mapped.some((Je) => Je !== "&&");
  };
  let we = w ? r : [...r];
  let Ee = (ze) => {
    if (
      [...splitInlineStatements(ze), ...splitInlineStatements(ze, false)].some((lt) =>
        lt.some(
          (Je, nt) =>
            (Je.startsWith("$") || /^(?:cd|pushd|popd|chdir)$/.test(stripPathAndExe(Je))) &&
            lt.slice(0, nt).every((pt) => INLINE_PREFIX_WORDS.has(stripPathAndExe(pt)) || pt.startsWith("-")),
        ),
      ) ||
      (/\b(?:cd|pushd|popd|chdir)\b/.test(ze) && /\$\(|`|\$\{?IFS\b/.test(ze))
    )
      we.push(INLINE_CD_PLACEHOLDER);
    we.push({
      text: ze,
      cd: false,
      names:
        /\beval\b|\bprintf\b[^;&|\n]*\s-v|\b(?:read|declare|typeset|local|export|readonly|mapfile|readarray|getopts)\b[^;&|\n]*\$|\b(?:declare|typeset|local)\b[^;&|\n]*\s-\w*n|\$\{!?[A-Za-z_]\w*:{0,2}=|\$\(\(/.test(
          ze,
        ) ||
        /\bprintf\b[^;&|\n]*\s-v|\b(?:unset|export|declare|typeset|local|readonly)\b[^;&|\n]*\$/.test(
          ze.replace(/["'\\]/g, ""),
        )
          ? [WILDCARD_ANY_NAME]
          : uniq(ze.replace(/\$\{?[A-Za-z_]\w*/g, " ").match(/[A-Za-z_]\w*/g) ?? []),
      exports: false,
      unread: true,
    });
  };
  let Ae = (ze) =>
    Z === null
      ? /[|&]/.test(replaced.replace(/&&|\|\|/g, ""))
      : Z.some(
          (lt) =>
            (lt.after === ze - 1 && /^\|&?$/.test(lt.type)) ||
            (lt.after === ze && /^(?:\|&?|&)$/.test(lt.type)),
        );
  let Ie = 0;
  let Me = new Set();
  for (let [ze, lt] of L.entries()) {
    let trimmed = lt.trim();
    let nt = ke(ze);
    let pt = !Ae(ze);
    let Et = trimmed.startsWith("{") && /;?\s*\}$/.test(trimmed);
    if (Et || (trimmed.startsWith("(") && trimmed.endsWith(")"))) {
      let replaced = trimmed.slice(1).replace(/;?\s*[)}]$/, "");
      if (S >= MAX_INLINE_REPORTED_NAMES) {
        if (
          (mayRunRmIndirectly(replaced) || mayHideRm(replaced)) &&
          needsInlineShellRmCheck(n.budget.command, trimmed)
        )
          return inlineShellUncheckedAsk(false, n.depth);
        Ee(trimmed);
        continue;
      }
      let inlineAssignments = await parseInlineAssignments(replaced, n, we, [], h, nt, S + 1, Et && pt);
      if (inlineAssignments !== null) return inlineAssignments;
      if (Et) {
        Ee(trimmed);
        let replaced_2 = replaced.replace(/\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g, "");
        Se ||=
          (/\|\||&&/.test(replaced_2) && !isSimpleAndChain(replaced)) ||
          /&(?!&)/.test(replaced_2.replace(/&&|[<>]&|&>/g, ""));
      }
      continue;
    }
    let yt = splitInlineStatements(trimmed).flat();
    let any = yt.some((hn) => POSIX_SHELL_NAMES.has(normalizeProgramBasename(hn)));
    if (
      !any &&
      !/^(?:[A-Za-z_]\w*\+?=|(?:cd|pushd|popd|chdir|export|unset|declare|typeset|readonly|local)\b)/.test(
        trimmed,
      )
    ) {
      Ee(trimmed);
      continue;
    }
    let commandRaw = await parseCommandRaw(trimmed);
    if (commandRaw === null || commandRaw === PARSE_ABORTED) {
      if (
        any &&
        yt.some((hn) => hasAnyShortFlagChar(hn, "c")) &&
        mayRunRmIndirectly(trimmed) &&
        needsInlineShellRmCheck(n.budget.command, trimmed)
      )
        return inlineShellUncheckedAsk(false, n.depth);
      Ee(trimmed);
      continue;
    }
    let It = [];
    let Yt = false;
    let qt = (hn) => {
      let filtered = we.filter((Kn) => hn && (Kn.names.includes(hn) || Kn.names.includes(WILDCARD_ANY_NAME)));
      Yt ||= nt && filtered.length > 0;
      let yn = "";
      for (let Kn of filtered.reverse()) {
        if (Kn.unread) return INLINE_SHELL_VALUE_PLACEHOLDER;
        if (/^unset(?:\s|$)/.test(Kn.text)) return yn;
        let match = new RegExp(
          `(?:^|\\s)${hn}(\\+?)=(?:"([^"$\`\\\\]*)"|'([^']*)'|([^\\s"'$\`\\\\]*))(?:\\s|$)`,
        ).exec(Kn.text);
        if (match !== null) {
          let fo = (match[2] ?? match[3] ?? match[4] ?? "") + yn;
          if (!/^[\w./@%+=:,-]*$/.test(fo)) return INLINE_SHELL_VALUE_PLACEHOLDER;
          if (match[1] !== "+") return fo;
          yn = fo;
          continue;
        }
        if (new RegExp(`(?:^|\\s)${hn}\\+?=`).test(Kn.text)) return INLINE_SHELL_VALUE_PLACEHOLDER;
      }
      return yn === "" ? INLINE_SHELL_VALUE_PLACEHOLDER : yn;
    };
    let Zt = (hn) => {
      if (/^(?:simple_expansion|expansion|arithmetic_expansion)$/.test(hn.type))
        It.push([hn.startIndex, hn.endIndex, qt(/^\$\{?([A-Za-z_]\w*)\}?$/.exec(hn.text)?.[1])]);
      else if (/^(?:command|process)_substitution$/.test(hn.type))
        It.push([hn.startIndex, hn.endIndex, "__CMDSUB__"]);
      else {
        Yt ||= hn.type === "ansi_c_string";
        for (let child of hn.children) Zt(child);
      }
    };
    Zt(commandRaw);
    let buffer = Buffer.from(trimmed);
    for (let [hn, ho, yn] of It.reverse())
      buffer = Buffer.concat([buffer.subarray(0, hn), Buffer.from(yn), buffer.subarray(ho)]);
    let pn = await parseForSecurity(buffer.toString(), {
      readsDivergentShapes: h,
    });
    if (pn.kind !== "simple" || Yt) {
      if (
        any &&
        yt.some((hn) => hasAnyShortFlagChar(hn, "c")) &&
        ((mayRunRmIndirectly(
          trimmed.replace(
            /\\[ntr]/g,
            `
`,
          ),
        ) &&
          needsInlineShellRmCheck(n.budget.command, trimmed, buffer.toString())) ||
          hasInlineShellC(trimmed))
      )
        return inlineShellUncheckedAsk(false, n.depth);
      Ee(trimmed);
      continue;
    }
    if (
      /^(?:[A-Za-z_]\w*\+?=(?:'[^']*'|"[^"]*"|[^\s'"])*\s+)*(?:declare|typeset|local)\b[^;&|\n]*\s-\w*n/.test(
        trimmed,
      )
    ) {
      Ee(trimmed);
      continue;
    }
    let no = describeAssignmentStatement(trimmed, pn.commands);
    if (no?.names.some((hn) => /__INLINE_SHELL_VALUE__|__CMDSUB/.test(hn))) {
      Ee(trimmed);
      continue;
    }
    if (no !== undefined) {
      if (pt) we.push(no);
      else Ee(trimmed);
      continue;
    }
    for (let command of pn.commands) {
      let index = s.findIndex(
        (Xn, fo) =>
          fo >= Ie &&
          Xn.argv.length === command.argv.length &&
          command.argv.every(
            (arg, bo) => arg === Xn.argv[bo] || /__INLINE_SHELL_VALUE__|__CMDSUB__/.test(arg),
          ),
      );
      if (index !== -1) {
        Ie = index + 1;
        Me.add(index);
      }
      let yn = s[index];
      let Kn = await rewriteInlineShellCommand(
        yn === undefined
          ? command
          : {
              ...yn,
              argv: yn.argv.map((arg, fo) =>
                command.argv[fo].includes("__CMDSUB__") ||
                (command.argv[fo].includes(INLINE_SHELL_VALUE_PLACEHOLDER) && we.some((To) => To.unread))
                  ? command.argv[fo]
                  : arg,
              ),
            },
        we,
        n,
        nt,
      );
      if (Kn !== null) return Kn;
    }
    Ee(
      /\b(?:eval|trap|source)\b|(?:^|\s)\.\s/.test(trimmed)
        ? trimmed
        : trimmed.replace(/'[^']*'|"(?:[^"\\]|\\.)*"/g, "''"),
    );
  }
  let We = ke(L.length);
  for (let [ze, lt] of s.entries()) {
    let Je = Me.has(ze) ? null : await rewriteInlineShellCommand(lt, we, n, We);
    if (Je !== null) return Je;
  }
  return null;
}
export {
  INLINE_CD_PLACEHOLDER,
  checkInlineShellRemoval,
  combineDeclarationReadings,
  normalizeProgramBasename,
};
