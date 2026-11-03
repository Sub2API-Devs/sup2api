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
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  homedir as homedir_6,
  homedir as homedir_7,
  homedir as homedir_8,
  homedir as homedir_9,
  homedir as homedir_10,
  homedir as homedir_11,
  homedir as homedir_12,
} from "os";
import { isPlainAsk, getDecisionSeverity } from "./bashSecurity.js";
import {
  createPermissionRequestMessage,
  findSafetyCheckReason,
} from "../../utils/permissions/permissions.js";
import { BashTool } from "./BashTool.js";
import { COMMAND_WRAPPERS, LEADING_KEYWORDS, MAX_INLINE_DEPTH } from "./expansionAnalysis.js";
import { rU, kwe, parseCommandRaw, PARSE_ABORTED } from "../../utils/bash/parser.js";
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
  oT,
  unwrapCommandArgv,
  isSimpleAndChain,
  bashToolHasPermission,
  getStructuralMissKind,
} from "./bashPermissions.js";
import { parseHasErrorNode, splitCommand } from "../../utils/bash/commands.js";
import { resolveSimpleCdTarget } from "./cdTracking.js";
import { getCwd } from "../../utils/cwd.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import { DH, R0e, Z7 } from "./dangerousRemoval.js";
import { stripWrappersFromArgvForPaths } from "./pathValidation.js";
import { Mze } from "./readOnlyValidation.js";
import { Yg } from "../../remote/remoteMode.js";

/**
 * 合并声明前缀不同读法的检查结果：任一 deny 即 deny；取最严重者；读法不穷尽且结果非 ask 时要求确认（too-complex）。
 */
//@ chunk-e6aww6q8.js:1204114-1204550 placement
function combineDeclarationReadings(e, n, r, s) {
  let found = [e, ...n].find((w) => w.behavior === "deny");
  if (found !== void 0) return found;
  if (!s && e.behavior === "ask" && !isPlainAsk(e)) return e;
  let y = e;
  for (let w of n) if (getDecisionSeverity(w) > getDecisionSeverity(y)) y = w;
  if (r || y.behavior === "ask") return y;
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
var MAX_INLINE_SCRIPT_LENGTH = 2000,
  MAX_INLINE_STATEMENTS = 8,
  INLINE_SHELL_VALUE_PLACEHOLDER = "__INLINE_SHELL_VALUE__",
  INLINE_PREFIX_WORDS = new Set([
    ...COMMAND_WRAPPERS,
    ...LEADING_KEYWORDS,
    ..."builtin noglob toybox trap watch flock chroot script".split(" "),
  ]);
/**
 * 粗略地把脚本文本拆成语句与单词：引号内元字符置为分隔外字符，去掉重定向与前导赋值，按 ;&|()`{} 等切分。
 */
//@ chunk-e6aww6q8.js:1204695-1205183 placement
function splitInlineStatements(e, n = !0) {
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
function x0e(e) {
  return rU(e ?? "")
    .toLowerCase()
    .replace(/-\d+(?:\.\d+)*$/, "");
}
/**
 * 判断脚本是否可能间接运行 rm/rmdir：与 xargs/find -exec/sh -c 等组合、以变量作命令名、赋值为 rm，或大括号展开成 rm。
 */
//@ chunk-e6aww6q8.js:1205260-1205700 placement
function mayRunRmIndirectly(e) {
  let n = (s) =>
      /^(?:\w*=)?rm(?:dir)?$/i.test(rU(s.replace(/\d*[<>].*$/s, ""))) || /(?:^|,)rm(?:dir)?(?:,|\$)/i.test(s),
    r = (s) => INLINE_PREFIX_WORDS.has(rU(s).toLowerCase());
  return (
    [...splitInlineStatements(e), ...splitInlineStatements(e, !1)].some(
      (s) =>
        s.some(
          (h, y) =>
            n(h) &&
            s.some((S, w) => w !== y && (r(S) || kwe(S, "c") || /^-(?:exec(?:dir)?|ok(?:dir)?)$/.test(S))),
        ) ||
        s.some((h, y) => (n(h) || h.startsWith("$")) && (y === 0 || r(s[y - 1]))) ||
        s.some((h) => /^\w+=(?:\S*\/)?rm(?:dir)?$/i.test(h)),
    ) || Fye(e).some(braceExpandsToRm)
  );
}
/**
 * 宽松判断脚本文本是否可能提到 rm/rmdir：去掉转义、引号、变量与默认值展开等多种变体后匹配，并检查大括号展开。
 */
//@ chunk-e6aww6q8.js:1205700-1206270 placement
function mentionsRm(e) {
  let n = /(?:^|[^\w.-]|\$\{[^{}:-]*:?-)rm(?:dir)?(?:\.exe)?(?![\w.-])/i,
    r = [/\$[=~^]*(?:[A-Za-z_]\w*|[0-9]+|[@*#?!$-]|\{[^{}]*\})/g, /\$(?:[0-9]+|[@*#?!$-]|\{[^{}]*\})/g],
    s = (L) => L.replace(/\$\{[^{}:=?+-]*:?[-=?+]([^{}]*)\}/g, "$1"),
    replaced = e.replace(/\\\n/g, ""),
    y = (L) => L.replace(/\$(?=['"])|['"\\]/g, ""),
    flattened = [replaced, y(replaced), y(replaced.replace(/\\[ntr]/g, " "))].flatMap((L) => [L, s(L)]),
    flattened_2 = r.flatMap((L) =>
      [" ", ""].flatMap((G) => [y(s(replaced).replace(L, G)), ...flattened.map((q) => q.replace(L, G))]),
    );
  return (
    [...flattened, ...flattened_2].some((L) => n.test(L)) ||
    [...Fye(replaced), ...Fye(y(replaced))].some((L) => braceExpandsToRm(L.replace(/\.exe$/i, "")))
  );
}
//@ chunk-e6aww6q8.js:1206270-1206308 placement
var WVt = /\$'(?:\\'|[^'])*\\[xuUc0-7]/;
//@ chunk-e6aww6q8.js:1206308-1206422 placement
function hasInlineShellC(e) {
  return [e, e.replace(/\\\n/g, "")].some((n) => WVt.test(n) || WVt.test(n.replace(/'(?:\\'|"'")'/g, "'")));
}
//@ chunk-e6aww6q8.js:1206422-1206516 placement
function $Do() {
  return (
    !env.CLAUDE_CODE_STRICT_INLINE_SHELL_RM_PROMPT &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_pale_kestrel", !0)
  );
}
//@ chunk-e6aww6q8.js:1206516-1206577 placement
function Mye(...e) {
  return !$Do() || e.some((n) => mentionsRm(n) || hasInlineShellC(n));
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
/**
 * 判断脚本是否使用了静态分析无法建模的 shell 特性：函数/别名、IFS、位置参数赋值、shift/source/eval/trap、以变量作命令、set 改变位置参数等。
 */
//@ chunk-e6aww6q8.js:1206771-1207209 placement
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
function Fye(e) {
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
/**
 * 判断单词中的大括号展开是否有风险：多层或不规则、前后缀含路径或特殊字符、展开项含路径/通配/rm 或可能为空。
 */
//@ chunk-e6aww6q8.js:1207478-1207919 placement
function hasRiskyBraceExpansion(e) {
  let replaced = e.replace(/\$\{[^{}]*\}/g, "$X"),
    r = count([...replaced], (w) => w === "{");
  if (r === 0 || !/,|\.\./.test(replaced)) return !1;
  let match = /^([^{]*)\{([^{}]*)\}(.*)$/s.exec(replaced);
  if (r > 1 || match === null) return !0;
  let [, h = "", y = "", S = ""] = match;
  if (!/,|\.\./.test(y)) return !1;
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
/**
 * 分析内联 shell（busybox、zsh、bash -c 等）中的命令，必要时加上防护变量。
 */
//@ chunk-e6aww6q8.js:1207919-1210963 placement
function analyzeInlineShell(e) {
  let [n = "", ...r] =
    (x0e(e[0]) === "busybox" || x0e(e[0]) === "toybox") && POSIX_SHELL_NAMES.has(x0e(e[1])) ? e.slice(1) : e;
  if (!POSIX_SHELL_NAMES.has(x0e(n))) return;
  let s = !1,
    h = !1,
    y = 0;
  for (; y < r.length; y++) {
    let We = r[y];
    if (We === "-" || We === "--") {
      y++;
      break;
    }
    if (!/^[-+]./.test(We)) break;
    let ze = /^(?:r?ba)?sh$/.test(x0e(n))
      ? /^--?(?:login|posix|noprofile|norc|noediting|verbose|restricted|debugger|dump-(?:po-)?strings|wordexp|pretty-print|help|version|(rcfile|init-file))$/.exec(
          We,
        )
      : null;
    if (ze !== null) y += ze[1] === void 0 ? 0 : 1;
    else if (We.startsWith("--")) h = !0;
    else
      ((h ||=
        (/^(?:r?ba)?sh$/.test(x0e(n)) && /[^abcefhiklmnoprstuvxBCDEHIOPT]/.test(We.slice(1))) ||
        (/ksh$/.test(x0e(n)) && /[oO]./.test(We))),
        (s ||= We.startsWith("-") && We.includes("c")),
        (y += We.match(/[oO]/g)?.length ?? 0));
  }
  if (h)
    return r.some((We) => /^-[A-Za-z]*c/.test(We))
      ? { script: r.join(" "), judged: void 0, homeWritten: !1 }
      : void 0;
  let S = r[y];
  if (!s || S === void 0) return;
  if (S.length > MAX_INLINE_SCRIPT_LENGTH) return { script: S, judged: void 0, homeWritten: !1 };
  if (
    Fye(S).some(hasRiskyBraceExpansion) ||
    /\balias\b/.test(S) ||
    /\bIFS\b/.test(
      S.replace(
        /(?:^|[;&|\n({]\s*)(?:(?:do|then|else|elif|if|while|until)\s+)?IFS=(?:'[^']*'|"[^"]*"|[^\s;&|'"\\])*[ \t]+read\b/g,
        " read",
      ),
    ) ||
    (x0e(n) === "zsh" &&
      /(?:^|[\s;&|(){}])=(?!=)\S|\$\{?\w+\}?(?::[htrelquQxsaAcP&]|\[)|\bargv\b|\$(?:[=~^]|\{[=~^(])|\(:/.test(
        S,
      ))
  )
    return { script: S, judged: void 0, homeWritten: !1 };
  let w = homedir_3(),
    L = w.includes("\\") ? "$HOME" : w,
    G = !1,
    q = (We, ze) => We.endsWith("$HOME") && /\w/.test(ze ?? ""),
    Z = (We) => ({
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
          ? void 0
          : We,
      homeWritten: G,
    }),
    Se = S;
  if (L !== w && S.includes(w)) {
    let parts = S.split(w);
    if (
      S.includes("'") ||
      parts.slice(1).some((ze) => q(L, ze[0])) ||
      parts.slice(0, -1).some((ze) => ze.endsWith("\\"))
    )
      return { script: S, judged: void 0, homeWritten: G };
    ((Se = parts.join(L)), (G = !0));
  }
  if (!/\$(?:\{[!#@*0-9]|[#@*0-9])/.test(S)) return Z(Se);
  let ke = [r[y + 1] ?? n, ...r.slice(y + 2)],
    we = (We) => /^[\w./@%+=:,*?[\]!^{} \t\n-]*$/.test(We),
    Ee = (We) => {
      let ze = /^~(?=\/|$)/.test(We)
        ? We.slice(1)
        : L !== w && (We === w || We.startsWith(`${w}\\`) || We.startsWith(`${w}/`))
          ? We.slice(w.length).replace(/\\/g, "/")
          : void 0;
      if (ze === void 0)
        return We.startsWith("~")
          ? void 0
          : we(We)
            ? We.replace(/[\t\n]/g, " ")
            : INLINE_SHELL_VALUE_PLACEHOLDER;
      return (
        (G ||= L !== w),
        we(L === w ? w + ze : ze) ? (L + ze).replace(/[\t\n]/g, " ") : INLINE_SHELL_VALUE_PLACEHOLDER
      );
    },
    mapped = ke.map(Ee);
  if (
    /\$\{(?![0-9]+(?:\}|:?\?[^}$`]*\})|[@*#]\})[!#@*0-9]/.test(S) ||
    S.includes("'") ||
    hasUnmodeledShellFeatures(S) ||
    mapped.includes(void 0)
  )
    return Z(void 0);
  let Ie = !0,
    replaced = Se.replace(
      /\\[\s\S]|"\$\{?@\}?"|\$\{([0-9]+)(:?)\?[^}]*\}|\$(?:\{([0-9]+|[@*#])\}|([0-9@*#]))/g,
      (We, ze, lt, Je, nt, pt) => {
        let Et = Je ?? nt,
          yt = (gt) => ((Ie &&= !q(gt, Se[pt + We.length])), gt);
        if (We.startsWith('"')) {
          let replaced = Se.slice(0, pt).replace(/\\[\s\S]/g, "");
          return (
            (Ie &&= countCharInString(replaced, '"') % 2 === 0),
            mapped
              .slice(1)
              .map((At) => `"${At}"`)
              .join(" ")
          );
        }
        if (ze !== void 0) {
          let gt = mapped[Number(ze)],
            At = "${__INLINE_SHELL_GUARDED__:?}";
          return gt === void 0
            ? "${__INLINE_SHELL_GUARDED__:?}"
            : gt === "" || gt === INLINE_SHELL_VALUE_PLACEHOLDER
              ? lt
                ? "${__INLINE_SHELL_GUARDED__:?}"
                : gt
              : yt(gt);
        }
        if (Et === void 0) return We;
        if (Et === "#") return String(ke.length - 1);
        if (Et === "@" || Et === "*") return ((Ie &&= ke.length <= 2), yt(mapped[1] ?? ""));
        return yt(mapped[Number(Et)] ?? "");
      },
    );
  return Z(Ie && !hasUnmodeledShellFeatures(replaced) ? replaced : void 0);
}
/**
 * 描述前置语句：纯赋值返回变量名；cd 标记 cd；export/unset/declare 等返回涉及的变量名及是否导出；其他返回 undefined。
 */
//@ chunk-e6aww6q8.js:1210963-1211518 placement
function describeAssignmentStatement(e, n) {
  let [r] = n;
  if (r === void 0) {
    let y = [...e.matchAll(/(?:^|\s)([A-Za-z_]\w*)\+?=/g)];
    return { text: e, cd: !1, names: y.map((S) => S[1]), exports: !1 };
  }
  let [s = "", ...h] = r.argv;
  if (n.length > 1) return;
  if (oT(r.text)) return { text: e, cd: !0, names: [], exports: !1 };
  if (!/^(?:export|unset|declare|typeset|readonly|local)$/.test(s)) return;
  return {
    text: e,
    cd: !1,
    names:
      s === "unset" && h.some((y) => /^-\w*f/.test(y)) && !h.some((y) => /^-\w*v/.test(y))
        ? []
        : h.filter((y) => !y.startsWith("-")).map((y) => y.replace(/=.*$/s, "")),
    exports: s === "export" || s === "unset" || h.some((y) => /^-\w*x/.test(y)),
  };
}
/**
 * 解析命令并列出顶层语句分隔符（&&、||、|、;、&、换行）及其位于第几条语句之后；解析失败返回 null。
 */
//@ chunk-e6aww6q8.js:1211518-1212066 placement
async function listStatementSeparators(e, n) {
  let r = await parseCommandRaw(e);
  if (r === null || r === PARSE_ABORTED || r.type !== "program" || parseHasErrorNode(r)) return null;
  let s = [],
    h = 0,
    y = (w) => /^(?:&&|\|\||\||;|&|\|&|\n)$/.test(w.type),
    S = (w) => {
      if (y(w)) s.push({ after: h - 1, type: w.type });
      else if (w.type === "redirected_statement")
        w.children.filter((L) => !L.type.endsWith("_redirect")).forEach(S);
      else if (/^(?:program|list|pipeline)$/.test(w.type)) {
        let L = !1;
        for (let G of w.children.filter((q) => q.type !== "comment")) {
          if (L && !y(G))
            s.push({
              after: h - 1,
              type: `
`,
            });
          (S(G), (L = !y(G)));
        }
      } else if (w.type !== "comment") h++;
    };
  return (S(r), h === n ? s : null);
}
/**
 * shell -c 递归检查辅助：脚本前只有一个 cd 且其余以 && 连接时，解析 cd 目标并调用 Vze 计算新 cwd；远程执行或带 -C/-D/--chdir/su 等时放弃。
 */
//@ chunk-e6aww6q8.js:1212066-1212508 placement = parseForSecurity (0.837)
async function resolveSingleCdTarget(e, n, r, s) {
  if (
    s.forRemoteExecution === !0 ||
    r.some(
      (w) =>
        /^(?:-[A-Za-z]*[CDiR]|--(?:chdir|login|chroot))/.test(w) ||
        /^(?:unshare|nsenter|chroot|pkexec|runuser|su)$/.test(rU(w)),
    )
  )
    return;
  let h;
  try {
    h = splitCommand(e);
  } catch {
    return;
  }
  let y = await listStatementSeparators(e, h.length);
  if (h[0]?.trim() !== n.text || y === null || y.some((w) => w.type !== "&&")) return;
  let root = await parseForSecurity(n.text);
  return root.kind === "simple" && root.commands.length === 1
    ? (resolveSimpleCdTarget(root.commands[0], getCwd(), getToolPermissionContext(s)) ?? void 0)
    : void 0;
}
/**
 * 把内联 shell 脚本中危险 rm 的询问改写为更明确的说明（目标来自运行时才知道的变量或命令输出，可能为空而删到根或家目录），提示使用字面路径或 ${NAME:?}。
 */
//@ chunk-e6aww6q8.js:1212508-1213154 placement
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
var Hze = "*",
  GDo = 8,
  TYt = { text: `cd "${INLINE_SHELL_VALUE_PLACEHOLDER}"`, cd: !0, names: [], exports: !1 };
/**
 * 生成内联 shell 脚本无法检查危险删除时的询问结果：区分脚本内命令被权限规则拒绝与脚本含 rm 但无法检查两种说明，不可由分类器批准。
 */
//@ chunk-e6aww6q8.js:1213222-1213890 placement
function inlineShellUncheckedAsk(e, n) {
  if (n === 0) DH("inline_shell_unchecked");
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
      classifierApprovable: !1,
      circuitBreaker: "dangerousRemoval",
    },
    suggestions: [],
  };
}
/**
 * 改写 shell -c 中的命令（export、cd、exec、env 等）以便逐个检查。
 */
//@ chunk-e6aww6q8.js:1213890-1217476 placement
async function rewriteInlineShellCommand(e, n, r, s) {
  let { input: input, context: context, depth: depth, divergentShapes: divergentShapes, budget: budget } = r,
    sliced = e.argv.slice();
  if (sliced[0] !== void 0) sliced[0] = rU(sliced[0]);
  let q = unwrapCommandArgv(stripWrappersFromArgvForPaths(sliced)),
    Z = analyzeInlineShell(q);
  if (Z === void 0 || !(mayHideRm(Z.judged ?? Z.script) || Z.script.includes("$'"))) return null;
  let sliced_2 = sliced.slice(0, sliced.length - q.length),
    ke = (gt) =>
      gt.flatMap((At) => {
        let [, It, Yt = ""] = /^([A-Za-z_]\w*)=(.*)$/s.exec(At) ?? [];
        return It === void 0
          ? []
          : [`export ${It}=${/^[\w./@%+=:,-]*$/.test(Yt) ? Yt : INLINE_SHELL_VALUE_PLACEHOLDER}`];
      }),
    we = ke(e.envVars.map((envVar) => `${envVar.name}=${envVar.value}`)),
    Ee = ke(sliced_2),
    Ae = new Set([...Z.script.matchAll(/\$\{?([A-Za-z_]\w*)/g)].map((gt) => gt[1])),
    filtered = n.filter((gt) => gt.cd),
    Me =
      filtered.length === 1 && !s
        ? await resolveSingleCdTarget(input.command, filtered[0], sliced_2, context)
        : void 0,
    We =
      Me !== void 0
        ? []
        : filtered.length > 1
          ? [`cd "${INLINE_SHELL_VALUE_PLACEHOLDER}"`]
          : filtered.map((gt) => gt.text),
    filtered_2 = n.filter((gt) => gt.names.some((At) => Ae.has(At) || (At === Hze && Ae.size > 0))),
    lt = new Set(filtered_2.filter((gt) => gt.exports).flatMap((gt) => gt.names)),
    Je = [{ before: [...We, ...filtered_2.map((gt) => gt.text)], own: !0, from: 0 }];
  if (filtered_2.some((gt) => !gt.exports && gt.names.some((At) => !lt.has(At))))
    Je.push({
      before: [...We, ...filtered_2.filter((gt) => gt.exports).map((gt) => gt.text)],
      own: !0,
      from: 0,
    });
  let reduced = sliced_2.reduce((gt, At, It) => {
    let Yt = [];
    for (let rn of sliced_2.slice(It + 1)) {
      if (!rn.startsWith("-")) break;
      Yt.push(rn);
    }
    let sliced = sliced_2.slice(It + 1),
      Zt = rU(At);
    return (/^(?:sudo|doas)$/.test(Zt) && !Yt.some((rn) => /^(?:-\w*E\w*|--preserve-env)$/.test(rn))) ||
      Zt === "pkexec" ||
      (Zt === "exec" && sliced.some((rn) => /^-\w*c/.test(rn))) ||
      (Zt === "env" && sliced.some((rn) => /^(?:-\w*[iu]\w*|-|--i\S*|--u\S*)$/.test(rn)))
      ? It
      : gt;
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
    Je.push({ before: We, own: reduced === -1, from: reduced + 1 });
  if (s && (We.length > 0 || filtered_2.length > 0)) Je.push({ before: [], own: !0, from: 0 });
  let pt = isSimpleAndChain(input.command) ? " && " : " ; ",
    Et =
      Z.judged === void 0 ||
      (Z.homeWritten &&
        ([...we, ...Ee].some((gt) => gt.startsWith("export HOME=")) ||
          n.some((gt) => gt.names.includes("HOME")))) ||
      filtered_2.some((gt) => gt.unread) ||
      depth >= MAX_INLINE_DEPTH ||
      Z.judged.length > MAX_INLINE_SCRIPT_LENGTH ||
      count(splitInlineStatements(Z.judged).flat(), (gt) => /^(?:cd|pushd|popd|chdir)$/.test(rU(gt))) >
        MAX_INLINE_STATEMENTS,
    yt = !1;
  for (let { before: before, own: own, from: from } of Et ? [] : Je) {
    let replaced = [...before, ...(own ? we : []), ...ke(sliced_2.slice(from)), Z.judged]
        .join(pt)
        .replace(/__CMDSUB_OUTPUT__|__CMDSUB__|__INLINE_SHELL_VALUE__/g, (pn) =>
          pn === "__CMDSUB__" ? "$(__CMDSUB__)" : "${" + INLINE_SHELL_VALUE_PLACEHOLDER + "}",
        ),
      qt = `${depth}
${divergentShapes}
${Me ?? getCwd()}
${replaced}`,
      Zt = budget.judged.get(qt);
    if (Zt === void 0) {
      if (
        budget.left <= 0 ||
        budget.chars < replaced.length ||
        (await parseCommandRaw(replaced)) === PARSE_ABORTED
      ) {
        Et = !0;
        break;
      }
      (budget.left--, (budget.chars -= replaced.length));
      let pn = () =>
        R0e(async () => {
          let no = {},
            hn = await parseCommandRaw(replaced),
            ho = await bashToolHasPermission(
              { ...input, command: replaced },
              context,
              void 0,
              void 0,
              { depth: depth + 1, budget: budget },
              void 0,
              (Xn, fo) => {
                ((no.names = Xn), (no.operands = fo));
              },
            ),
            { readings: readings, exhaustive: exhaustive } =
              no.names === void 0
                ? { readings: [], exhaustive: !0 }
                : declarationPrefixReadings(no.names, no.operands);
          Et ||= !exhaustive;
          for (let Xn of readings) {
            if (
              findSafetyCheckReason(ho.decisionReason, (To) => To.circuitBreaker === "dangerousRemoval") !==
              void 0
            )
              break;
            if (budget.left <= 0) {
              Et = !0;
              break;
            }
            budget.left--;
            let fo = await bashToolHasPermission(
              { ...input, command: replaced },
              context,
              void 0,
              void 0,
              { depth: depth + 1, budget: budget },
              Xn,
            );
            if (
              fo.behavior === "deny" ||
              findSafetyCheckReason(fo.decisionReason, (To) => To.circuitBreaker === "dangerousRemoval") !==
                void 0
            )
              ho = fo;
            Et ||=
              getStructuralMissKind(fo) !== void 0 ||
              (hn !== null &&
                hn !== PARSE_ABORTED &&
                parseForSecurityFromAst(replaced, hn, { declarationPrefix: Xn }).kind === "too-complex");
          }
          return ho;
        });
      ((Zt = await Mze(!1, () => (Me === void 0 ? pn() : Yg(Me, pn)))), budget.judged.set(qt, Zt));
    }
    let rn =
      Zt.behavior === "ask"
        ? findSafetyCheckReason(Zt.decisionReason, (pn) => pn.circuitBreaker === "dangerousRemoval")
        : void 0;
    if (rn !== void 0) {
      if (depth === 0) DH("inline_shell_script");
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
    ((yt && !Et) || (Et && Mye(budget.command, Z.judged ?? Z.script)))
    ? inlineShellUncheckedAsk(yt && !Et, depth)
    : null;
}
/**
 * 检查内联 shell 脚本（bash -c、eval 等）中的危险 rm，结果按深度/形状/声明前缀/cwd/前置语句/脚本文本缓存；可由 CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT 关闭。
 */
//@ chunk-e6aww6q8.js:1217476-1217892 placement
async function checkInlineShellRemoval(e, n, r = [], s = []) {
  if (env.CLAUDE_CODE_DISABLE_INLINE_SHELL_RM_PROMPT || !Z7()) return null;
  let h = `${n.depth}
${n.divergentShapes}
${n.declarationPrefix}
${getCwd()}
${r.map((S) => S.text).join(`
`)}
${e}`;
  if (n.budget.asked.has(h)) return n.budget.asked.get(h) ?? null;
  let y =
    (await parseInlineAssignments(e, n, r, s, !1)) ??
    (/\b(?:export|declare|typeset|readonly|local)\b/.test(e)
      ? await parseInlineAssignments(e, n, r, s, !0)
      : null);
  return (n.budget.asked.set(h, y), y);
}
/**
 * 解析内联赋值（VAR=值），识别命令替换与 ANSI-C 字符串。
 */
//@ chunk-e6aww6q8.js:1217892-1222420 placement
async function parseInlineAssignments(e, n, r, s, h, y = !1, S = 0, w = !1) {
  let L;
  try {
    L = splitCommand(e);
  } catch {
    L = [e];
  }
  let replaced = e.replace(/\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g, "").replace(/[<>]&|&>/g, ">"),
    matches =
      /(?:^|[;|&\n]\s*)(?:export|unset|declare|typeset|readonly|local|cd|pushd|popd|[A-Za-z_]\w*\+?=)[^;|&\n]*&(?!&)/.test(
        replaced,
      ),
    Z = await listStatementSeparators(e, L.length),
    Se = !1,
    ke = (ze) => {
      if (y || matches || Se) return !0;
      if (Z === null) return /\|\||&&/.test(replaced) && !isSimpleAndChain(e);
      let mapped = Z.filter((Je) => Je.after < ze).map((Je) => Je.type);
      return mapped.some((Je) => Je === "&&" || Je === "||") && mapped.some((Je) => Je !== "&&");
    },
    we = w ? r : [...r],
    Ee = (ze) => {
      if (
        [...splitInlineStatements(ze), ...splitInlineStatements(ze, !1)].some((lt) =>
          lt.some(
            (Je, nt) =>
              (Je.startsWith("$") || /^(?:cd|pushd|popd|chdir)$/.test(rU(Je))) &&
              lt.slice(0, nt).every((pt) => INLINE_PREFIX_WORDS.has(rU(pt)) || pt.startsWith("-")),
          ),
        ) ||
        (/\b(?:cd|pushd|popd|chdir)\b/.test(ze) && /\$\(|`|\$\{?IFS\b/.test(ze))
      )
        we.push(TYt);
      we.push({
        text: ze,
        cd: !1,
        names:
          /\beval\b|\bprintf\b[^;&|\n]*\s-v|\b(?:read|declare|typeset|local|export|readonly|mapfile|readarray|getopts)\b[^;&|\n]*\$|\b(?:declare|typeset|local)\b[^;&|\n]*\s-\w*n|\$\{!?[A-Za-z_]\w*:{0,2}=|\$\(\(/.test(
            ze,
          ) ||
          /\bprintf\b[^;&|\n]*\s-v|\b(?:unset|export|declare|typeset|local|readonly)\b[^;&|\n]*\$/.test(
            ze.replace(/["'\\]/g, ""),
          )
            ? [Hze]
            : uniq(ze.replace(/\$\{?[A-Za-z_]\w*/g, " ").match(/[A-Za-z_]\w*/g) ?? []),
        exports: !1,
        unread: !0,
      });
    },
    Ae = (ze) =>
      Z === null
        ? /[|&]/.test(replaced.replace(/&&|\|\|/g, ""))
        : Z.some(
            (lt) =>
              (lt.after === ze - 1 && /^\|&?$/.test(lt.type)) ||
              (lt.after === ze && /^(?:\|&?|&)$/.test(lt.type)),
          ),
    Ie = 0,
    Me = new Set();
  for (let [ze, lt] of L.entries()) {
    let trimmed = lt.trim(),
      nt = ke(ze),
      pt = !Ae(ze),
      Et = trimmed.startsWith("{") && /;?\s*\}$/.test(trimmed);
    if (Et || (trimmed.startsWith("(") && trimmed.endsWith(")"))) {
      let replaced = trimmed.slice(1).replace(/;?\s*[)}]$/, "");
      if (S >= GDo) {
        if ((mayRunRmIndirectly(replaced) || mayHideRm(replaced)) && Mye(n.budget.command, trimmed))
          return inlineShellUncheckedAsk(!1, n.depth);
        Ee(trimmed);
        continue;
      }
      let ho = await parseInlineAssignments(replaced, n, we, [], h, nt, S + 1, Et && pt);
      if (ho !== null) return ho;
      if (Et) {
        Ee(trimmed);
        let replaced_2 = replaced.replace(/\\[\s\S]|'[^']*'|"(?:[^"\\]|\\.)*"/g, "");
        Se ||=
          (/\|\||&&/.test(replaced_2) && !isSimpleAndChain(replaced)) ||
          /&(?!&)/.test(replaced_2.replace(/&&|[<>]&|&>/g, ""));
      }
      continue;
    }
    let flat = splitInlineStatements(trimmed).flat(),
      any = flat.some((hn) => POSIX_SHELL_NAMES.has(x0e(hn)));
    if (
      !any &&
      !/^(?:[A-Za-z_]\w*\+?=|(?:cd|pushd|popd|chdir|export|unset|declare|typeset|readonly|local)\b)/.test(
        trimmed,
      )
    ) {
      Ee(trimmed);
      continue;
    }
    let At = await parseCommandRaw(trimmed);
    if (At === null || At === PARSE_ABORTED) {
      if (
        any &&
        flat.some((hn) => kwe(hn, "c")) &&
        mayRunRmIndirectly(trimmed) &&
        Mye(n.budget.command, trimmed)
      )
        return inlineShellUncheckedAsk(!1, n.depth);
      Ee(trimmed);
      continue;
    }
    let It = [],
      Yt = !1,
      qt = (hn) => {
        let filtered = we.filter((Kn) => hn && (Kn.names.includes(hn) || Kn.names.includes(Hze)));
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
      },
      Zt = (hn) => {
        if (/^(?:simple_expansion|expansion|arithmetic_expansion)$/.test(hn.type))
          It.push([hn.startIndex, hn.endIndex, qt(/^\$\{?([A-Za-z_]\w*)\}?$/.exec(hn.text)?.[1])]);
        else if (/^(?:command|process)_substitution$/.test(hn.type))
          It.push([hn.startIndex, hn.endIndex, "__CMDSUB__"]);
        else {
          Yt ||= hn.type === "ansi_c_string";
          for (let ho of hn.children) Zt(ho);
        }
      };
    Zt(At);
    let buffer = Buffer.from(trimmed);
    for (let [hn, ho, yn] of It.reverse())
      buffer = Buffer.concat([buffer.subarray(0, hn), Buffer.from(yn), buffer.subarray(ho)]);
    let pn = await parseForSecurity(buffer.toString(), { readsDivergentShapes: h });
    if (pn.kind !== "simple" || Yt) {
      if (
        any &&
        flat.some((hn) => kwe(hn, "c")) &&
        ((mayRunRmIndirectly(
          trimmed.replace(
            /\\[ntr]/g,
            `
`,
          ),
        ) &&
          Mye(n.budget.command, trimmed, buffer.toString())) ||
          hasInlineShellC(trimmed))
      )
        return inlineShellUncheckedAsk(!1, n.depth);
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
    if (no !== void 0) {
      if (pt) we.push(no);
      else Ee(trimmed);
      continue;
    }
    for (let command of pn.commands) {
      let index = s.findIndex(
        (Xn, fo) =>
          fo >= Ie &&
          Xn.argv.length === command.argv.length &&
          command.argv.every((To, bo) => To === Xn.argv[bo] || /__INLINE_SHELL_VALUE__|__CMDSUB__/.test(To)),
      );
      if (index !== -1) ((Ie = index + 1), Me.add(index));
      let yn = s[index],
        Kn = await rewriteInlineShellCommand(
          yn === void 0
            ? command
            : {
                ...yn,
                argv: yn.argv.map((Xn, fo) =>
                  command.argv[fo].includes("__CMDSUB__") ||
                  (command.argv[fo].includes(INLINE_SHELL_VALUE_PLACEHOLDER) && we.some((To) => To.unread))
                    ? command.argv[fo]
                    : Xn,
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

export { TYt, checkInlineShellRemoval, combineDeclarationReadings, x0e };
