/**
 * tools/BashTool/expansionAnalysis.ts
 *
 * 2.1.316 新增：命令替换与变量展开分析
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (35)
 * attribution: affinity 1, placement 34
 */
import { getPlatform } from "../../utils/platform.js";
import { normalizeDosDevicePath } from "../../utils/pathClassification.js";
import { isDangerousRemovalPath } from "../../utils/permissions/pathValidation.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { POSIX_SHELL_NAMES } from "../../utils/bash/ast.js";
import { splitCommand } from "../../utils/bash/commands.js";
import { truncateToLength } from "../../utils/stringUtils.js";

//@ chunk-e6aww6q8.js:1074425-1075273 affinity
/**
 * 危险删除检测用正则：$VAR/…、${N}/… 形式的目标，顶层目录名列表（Linux/macOS/Windows），以及 __TRACKED_VAR__/顶层目录的匹配。
 */
var VAR_SLASH_TARGET_RE =
  /^[\uE020"']*\$(?:\{[A-Za-z_][A-Za-z0-9_]*(?::?-(?:["']{2}|"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"?)?)?\}|[A-Za-z_][A-Za-z0-9_]*)[\uE020"']*\\?\/(?:[*?[{]|\$|\/|["']|\uE020|$)/;
var POSITIONAL_VAR_SLASH_TARGET_RE =
  /^[\uE020"']*\$(?:\{(?:[0-9]+|[@*!])(?::?-(?:["']{2}|"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"?)?)?\}|[0-9@*!])[\uE020"']*\\?\/(?:[*?[{]|\$|\/|["']|\uE020|$)/;
var TOP_LEVEL_DIR_NAMES =
  "bin|boot|dev|etc|home|lib|lib32|lib64|libx32|media|mnt|opt|proc|root|run|sbin|srv|sys|tmp|usr|var|snap|nix|lost\\+found|private|cores|Applications|Library|System|Users|Volumes|Windows|ProgramData|cygdrive";
var TRACKED_VAR_TOP_LEVEL_RE = new RegExp(
  String.raw`^(?:__TRACKED_VAR__)+[\\/]+(${TOP_LEVEL_DIR_NAMES})(?:[\\/]+\*+)*[\\/]*$`,
  "i",
);
var VAR_TOP_LEVEL_TARGET_RE = new RegExp(
  String.raw`^[\uE020"']*\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::?-(?:["']{2}|"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?)?)?\}|([A-Za-z_][A-Za-z0-9_]*))[\uE020"']*\\?\/(${TOP_LEVEL_DIR_NAMES})(?:[\\/]+\*+)*\/?[\uE020"']*$`,
  "i",
);
//@ chunk-e6aww6q8.js:1075273-1075318 placement
/**
 * 判断变量名是否为 HOME 或 PWD（展开分析中特殊处理）。
 */
function isHomeOrCwdVar(e) {
  return e === "HOME" || e === "PWD";
}
//@ chunk-e6aww6q8.js:1075318-1075492 placement
function matchRootChildTarget(e, n) {
  let match = VAR_TOP_LEVEL_TARGET_RE.exec(e.replace(/\/(?:\.\/)+/g, "/").replace(/\/{2,}/g, "/"));
  if (match === null) return;
  let s = match[1] ?? match[3];
  let h = match[2];
  return n(s) && (h === undefined || n(h)) ? match[4] : undefined;
}
//@ chunk-e6aww6q8.js:1075492-1075910 placement
/**
 * 展开分析常量：产出路径的命令替换（cd/pwd/dirname/git rev-parse）、默认分析上下文、长度上限、赋值/unset/for 循环正则。
 */
var PATH_COMMAND_SUBST_RE = /^\s*(?:(cd|pwd|dirname)(?![A-Za-z0-9_-])|git\s+(rev-parse)\b)/;
var DEFAULT_EXPANSION_CONTEXT = {
  mayBeUnset: () => false,
  derived: new Map(),
  assigned: new Set(),
  evalStrings: false,
};
var MAX_EXPANSION_SCAN = 1e4;
var ASSIGNMENT_NAME_RE = /(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=/g;
var UNSET_STATEMENT_RE =
  /(?:^|[;&|({\n]|\b(?:then|do|else|elif)\b|!)[ \t]*unset[ \t]+(?:-[a-z][ \t]+)*((?:[A-Za-z_][A-Za-z0-9_]*[ \t]*)+)/g;
var FOR_LOOP_RE =
  /(?:^|[;&|({\n]|\b(?:then|do|else|elif)\b)\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([^;\n]*)/g;
//@ chunk-e6aww6q8.js:1075910-1076359 placement
/**
 * 把命令文本中 heredoc 正文替换为空格（保留换行与长度），避免正文内容被当作命令分析。
 */
function blankHeredocBodies(e) {
  let n = e;
  let r = maskQuotedAndComments(n, true);
  let s = /(?:^|[^<$(])<<(?!<)/g;
  for (let match = s.exec(r); match !== null; match = s.exec(r)) {
    let y = match.index + match[0].length - 2;
    let match_2 = /^<<-?\s*\\?["']?([A-Za-z_][A-Za-z0-9_]*)["']?[^\n]*\n/.exec(n.slice(y));
    if (match_2 === null) continue;
    let w = y + match_2[0].length;
    let match_3 = new RegExp(String.raw`^\t*${match_2[1]}[ \t]*$`, "m").exec(n.slice(w));
    let q = match_3 === null ? n.length : w + match_3.index + match_3[0].length;
    n = n.slice(0, w) + n.slice(w, q).replace(/[^\n]/g, " ") + n.slice(q);
    r = maskQuotedAndComments(n, true);
    s.lastIndex = q;
  }
  return n;
}
//@ chunk-e6aww6q8.js:1076359-1076524 placement
function joinLineContinuations(e) {
  let n = maskQuotedAndComments(e, true);
  let r = e;
  for (let idx = n.length - 1; idx > 0; idx--)
    if (
      n[idx] ===
        `
` &&
      n[idx - 1] === "\\" &&
      !(n[idx - 2] === "\\" && e[idx - 1] === "\\")
    )
      r = r.slice(0, idx - 1) + r.slice(idx + 1);
  return r;
}
//@ chunk-e6aww6q8.js:1076524-1076581 placement
/**
 * 匹配 /c/、/cygdrive/c/ 这类 Windows 盘符路径。
 */
var CYGWIN_DRIVE_PATH_RE = /^[\\/](?:cygdrive[\\/])?([A-Za-z])(?=[\\/]|$)/i;
//@ chunk-e6aww6q8.js:1076581-1076653 placement
/**
 * 先按原路径、再按其 Windows 盘符形式检查谓词。
 */
function matchesPathOrWindowsDrive(e, n) {
  if (n(e)) return true;
  let windowsDrivePath = toWindowsDrivePath(e);
  return windowsDrivePath !== undefined && n(windowsDrivePath);
}
//@ chunk-e6aww6q8.js:1076653-1076857 placement
function toWindowsDrivePath(e) {
  if (getPlatform() !== "windows") return;
  let n = normalizeDosDevicePath(e);
  if (n !== e) return n;
  let match = CYGWIN_DRIVE_PATH_RE.exec(e);
  if (match === null) return;
  let replaced = e.slice(match[0].length).replace(/\//g, "\\");
  return `${match[1].toUpperCase()}:${replaced === "" ? "\\" : replaced}`;
}
//@ chunk-e6aww6q8.js:1076857-1076891 placement
/**
 * 判断路径是危险删除目标（同时检查 Windows 盘符形式）。
 */
function isDangerousRemovalTarget(e) {
  return matchesPathOrWindowsDrive(e, isDangerousRemovalPath);
}
//@ chunk-e6aww6q8.js:1076891-1077173 placement
function isRootLikeValue(e) {
  let replaced = e.replace(/^(["'])([\s\S]*)\1$/, "$2").replace(/(.)\/+$/, "$1");
  let r = /^\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^}$`]*)\}$/.exec(replaced)?.[1];
  return (
    /^\/+$/.test(replaced) ||
    /(?:^|\/)\.\.?\/*$/.test(replaced) ||
    /^\$\{?HOME\}?$/.test(replaced) ||
    (!/[$`]/.test(replaced) && isDangerousRemovalTarget(expandTildeWithHome(replaced))) ||
    (r !== undefined && r !== "" && isDangerousRemovalTarget(expandTildeWithHome(r)))
  );
}
//@ chunk-e6aww6q8.js:1077173-1077600 placement
/**
 * 从指定位置找到 shell 单词的结束位置（处理转义、引号、$( ) 与 ${ } 嵌套）；结构不完整返回 undefined。
 */
function findWordEnd(e, n) {
  let r = (s) => {
    let h = n;
    let y = 0;
    let S = null;
    for (; h < e.length; h++) {
      let w = e[h];
      if (w === "\\" && (S === "`" || isEscapeActive(e, h, S))) {
        h++;
        continue;
      }
      if (S !== null) {
        if (w === S) S = null;
        continue;
      }
      if (y === 0 && (w === '"' || w === "'" || w === "`")) S = w;
      else if (s && (w === "(" || (w === "{" && e[h - 1] === "$" && e[h - 2] !== "$" && e[h - 2] !== "\\")))
        y++;
      else if (s && (w === ")" || w === "}") && y > 0) y--;
      else if (y === 0 && /[\s;&|]/.test(w)) break;
    }
    return y === 0 && S === null ? h : undefined;
  };
  return r(true) ?? r(false) ?? e.length;
}
//@ chunk-e6aww6q8.js:1077600-1077939 placement
/**
 * 跳过语句开头的变量赋值前缀，返回命令开始位置以及该位置是否仍是前缀（遇到分隔符、注释或 &/| 时结束）。
 */
function skipAssignmentPrefix(e, wordEnd) {
  let r = wordEnd;
  for (;;) {
    while (r < e.length && (e[r] === " " || e[r] === "\t")) r++;
    if (r >= e.length || /[;\n)#]/.test(e[r]))
      return {
        end: r,
        prefix: false,
      };
    if (e[r] === "&" || e[r] === "|")
      return {
        end: r,
        prefix: e[r + 1] !== e[r],
      };
    let match = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/.exec(e.slice(r, r + 1024));
    if (match === null)
      return {
        end: r,
        prefix: true,
      };
    r = findWordEnd(e, r + match[0].length);
  }
}
//@ chunk-e6aww6q8.js:1077939-1078040 placement
function isAndChainOnly(e) {
  let parts = e.split("&&");
  return parts[0].trim() === "" && parts.slice(1).every((r) => !/[;|&]/.test(r));
}
//@ chunk-e6aww6q8.js:1078040-1078427 placement
/**
 * 从值中提取命令替换的正文：支持反引号与 $( )（须占满整个值，去掉外层双引号与结尾斜杠）。
 */
function extractSubstitutionBody(e) {
  let replaced = e.replace(/^"([\s\S]*)"$/, "$1").replace(/\/+$/, "");
  let match = /^`([^`]*)`$/.exec(replaced);
  if (match !== null) return match[1];
  if (!replaced.startsWith("$(")) return;
  let s = 0;
  let h = null;
  for (let idx = 1; idx < replaced.length; idx++) {
    let S = replaced[idx];
    if (S === "\\" && isEscapeActive(replaced, idx, h)) idx++;
    else if (h !== null) h = S === h ? null : h;
    else if (S === '"' || S === "'") h = S;
    else if (S === "(") s++;
    else if (S === ")" && --s === 0) return idx === replaced.length - 1 ? replaced.slice(2, idx) : undefined;
  }
  return;
}
//@ chunk-e6aww6q8.js:1078427-1082458 placement
/**
 * 描述命令替换的作用（如 git rev-parse 打印仓库根、pwd 打印当前目录），用于权限提示。
 */
function describeCommandSubstitution(e, mayBeUnset) {
  let r = joinLineContinuations(
    blankHeredocBodies(
      (e.length > MAX_EXPANSION_SCAN ? e.slice(0, MAX_EXPANSION_SCAN) : e).replace(/[\uE000-\uF8FF]/g, ""),
    ),
  );
  let s = maskQuotedAndComments(r, true);
  let h = maskQuotedAndComments(r, false);
  let y = /(?:^|[\s;&|({])trap\s+(?:--\s+)?\$?'[^']*\brm\b/.test(h)
    ? r.length
    : Math.max(...[...h.matchAll(/\brm(?:dir)?\b/gi)].map((ze) => ze.index), -1);
  let S = new Set();
  let w = new Set();
  let L = new Set();
  let G = new Set();
  let q = new Map();
  let Z = (ze) => w.has(ze) || L.has(ze) || (!S.has(ze) && !isHomeOrCwdVar(ze) && mayBeUnset(ze));
  let sorted = [
    ...[...s.matchAll(UNSET_STATEMENT_RE)].map((ze) => ({
      index: ze.index,
      names: ze[1].trim().split(/\s+/),
      bound: false,
      rootish: false,
      until: -1,
    })),
    ...[...s.matchAll(FOR_LOOP_RE)].map((ze) => {
      let lt = ze.index + ze[0].length;
      let trimmed = r.slice(lt - ze[2].length, lt).trim();
      let nt = trimmed !== "" && !/""|''/.test(trimmed) && !/(?:^|\s)"[^"]*[$`][^"]*"(?=\s|$)/.test(trimmed);
      let pt = /[$`]/.test(trimmed) ? /\bdone\b/.exec(s.slice(lt)) : null;
      return {
        index: ze.index,
        names: [ze[1]],
        bound: nt ? true : null,
        rootish: nt && !/\s/.test(trimmed) && isRootLikeValue(trimmed),
        until: pt === null ? -1 : lt + pt.index,
      };
    }),
  ]
    .flatMap((ze) =>
      ze.until >= 0
        ? [
            ze,
            {
              ...ze,
              index: ze.until,
              bound: null,
              rootish: false,
            },
          ]
        : [ze],
    )
    .filter((ze) => ze.index < y)
    .sort((ze, lt) => ze.index - lt.index);
  let ke = (ze) => {
    while (sorted.length > 0 && sorted[0].index < ze) {
      let { names, bound, rootish } = sorted.shift();
      for (let name of names) {
        S.delete(name);
        w.delete(name);
        L.delete(name);
        G.delete(name);
        q.delete(name);
        if (bound === true) {
          S.add(name);
          if (rootish) G.add(name);
        } else if (bound === false) w.add(name);
      }
    }
  };
  let we = 0;
  let Ee = null;
  let Ae = 0;
  let Ie = false;
  let Me = 0;
  let We = 0;
  ASSIGNMENT_NAME_RE.lastIndex = 0;
  for (
    let match = ASSIGNMENT_NAME_RE.exec(s);
    match !== null && match.index < y;
    match = ASSIGNMENT_NAME_RE.exec(s)
  ) {
    let lt = match[1];
    let Je = match.index + match[0].length;
    let wordEnd = findWordEnd(r, Je);
    ASSIGNMENT_NAME_RE.lastIndex = wordEnd;
    let pt = Je - lt.length - 1;
    for (; We < pt; We++) {
      let vn = s[We];
      if (
        vn ===
          `
` &&
        Ie &&
        s.slice(Ae, We).trim() === ""
      ) {
        Me = We + 1;
        continue;
      }
      if (/[;&|(\n]/.test(vn)) {
        Ae = We + 1;
        Ie = vn === "|" && s[We - 1] === "|";
      }
    }
    let max = Math.max(we, Ae, Me);
    let yt = Ee !== null && pt < Ee.end ? Ee : null;
    let gt = yt !== null ? yt.conditional : Ae >= we && Ie;
    if (
      !/^[\s)]*(?:(?:do|then|else|elif|if|while|until|time|!|\{)\s+)*(?:(?:export|local|declare|typeset|readonly)(?:\s+-\w+)*\s+)?$/.test(
        r.slice(max, pt),
      )
    )
      continue;
    we = wordEnd;
    let At = yt ?? {
      ...skipAssignmentPrefix(s, wordEnd),
      conditional: gt,
    };
    Ee = At;
    if (At.prefix) continue;
    ke(pt);
    let sliced = r.slice(Je, wordEnd);
    let substitutionBody = extractSubstitutionBody(sliced);
    let qt;
    if (substitutionBody !== undefined) {
      let match = PATH_COMMAND_SUBST_RE.exec(substitutionBody);
      if (match?.[2] === "rev-parse") qt = "prints a git value such as the repository root";
      else if (match?.[1] === "pwd") qt = "prints the current directory";
      else if (match?.[1] === "dirname" || match?.[1] === "cd") {
        let match_2 = /^\s*(?:cd|dirname)\s+(?:--?\w*\s+)*([^\s;&|]*)/.exec(substitutionBody);
        let So = match_2?.[1];
        let ko = (ao) => ao.replace(/\/+[^/]*\/*$/, "") || (ao.startsWith("/") ? "/" : ".");
        if (!(
          match_2 !== null &&
          So !== undefined &&
          So !== "" &&
          !/[$`]/.test(So) &&
          !/^(?:""|'')$/.test(So) &&
          (match[1] === "dirname"
            ? !isDangerousRemovalTarget(expandTildeWithHome(ko(So.replace(/^(["'])(.*)\1$/, "$2"))))
            : isAndChainOnly(substitutionBody.slice(match_2[0].length)))
        ))
          qt =
            match[1] === "dirname"
              ? So !== undefined && So !== "" && !/[$`]/.test(So)
                ? `prints ${ko(So.replace(/^(["'])(.*)\1$/, "$2"))}`
                : "prints the current directory (as `.`) when its input is empty"
              : 'prints the current directory when its input is empty (`cd ""` stays put)';
      }
    } else if (!/[$`]/.test(sliced) || /^"?\$\{?[A-Za-z_]/.test(sliced)) {
      let vn = matchRootChildTarget(sliced, Z);
      if (vn !== undefined) qt = `is /${vn} when the variable in it is empty`;
      else if (VAR_SLASH_TARGET_RE.test(sliced))
        qt = "is the filesystem root when the variable in it is empty";
    }
    let Zt = /^"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?\/*$/.exec(sliced)?.[1];
    let rn =
      Zt === "PWD"
        ? {
            value: sliced,
            becomes: "is the current directory",
          }
        : Zt === undefined
          ? undefined
          : q.get(Zt);
    if (qt !== undefined)
      q.set(lt, {
        value: sliced,
        becomes: qt,
      });
    else if (rn !== undefined) q.set(lt, rn);
    else if (!gt) q.delete(lt);
    let pn = /^"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?(?:\/[^\s"'$`]*)?"?$/.exec(sliced)?.[1];
    let matches = /(?:^|\/)\.\.(?:\/|$)/.test(sliced.replace(/["']/g, ""));
    let matches_2 = /^(?:""|''|\(\s*\))?$/.test(sliced);
    let ho = /\/([^\s/$`"')}]+)"?$/.exec(sliced)?.[1];
    let yn = /^"?\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^\s}$`]+)\}"?$/.exec(sliced)?.[1];
    let Kn =
      yn === undefined || /^(?:|\/+|(?:[^/]*\/)*\.\.?\/*)$/.test(yn.replace(/^(["'])([\s\S]*)\1$/, "$2"));
    let fo =
      (!matches && ho !== undefined && !/^[.?*[\]{}]+$/.test(ho)) ||
      !Kn ||
      (pn !== undefined && !matches ? !Z(pn) : !matches_2 && !/[$`]/.test(sliced));
    let To = S.has(lt);
    let bo = G.has(lt);
    S.delete(lt);
    w.delete(lt);
    L.delete(lt);
    G.delete(lt);
    if (fo && gt) {
      if (To) {
        S.add(lt);
        if (bo || isRootLikeValue(sliced)) G.add(lt);
      } else L.add(lt);
    } else if (fo) {
      S.add(lt);
      if (isRootLikeValue(sliced) || (pn !== undefined && G.has(pn))) G.add(lt);
    } else if (matches_2) w.add(lt);
    else L.add(lt);
  }
  ke(Number.POSITIVE_INFINITY);
  return {
    set: S,
    emptied: new Set([...w, ...L]),
    rootValued: G,
    derived: q,
  };
}
//@ chunk-e6aww6q8.js:1082458-1082612 placement
/**
 * 去掉路径末尾的 /* 或 /. 之类通配后缀（保留引号）。
 */
function stripTrailingPathGlob(e) {
  let n = e.length;
  while (n > 0 && /[\uE020"']/.test(e[n - 1])) n--;
  let r = n;
  while (r > 0 && /[/*.]/.test(e[r - 1])) r--;
  return r < n && e[r] === "/" ? e.slice(0, r) : e;
}
//@ chunk-e6aww6q8.js:1082612-1082778 placement
/**
 * 若单词只是一个变量引用（$NAME 或 ${NAME:?..}），返回变量名。
 */
function getBareVariableName(e) {
  let match =
    /^[\uE020"']*\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::?[?-][^}]*)?\}|([A-Za-z_][A-Za-z0-9_]*))[\uE020"']*$/.exec(
      e,
    );
  return match === null ? undefined : (match[1] ?? match[2]);
}
//@ chunk-e6aww6q8.js:1082778-1083597 placement
/**
 * 内联 shell 分析常量：引号占位字符、函数定义/set -- 正则、"sh -c" 调用正则、最大递归深度、截断长度、前导关键字与包装命令集合、find 谓词正则。
 */
var QUOTE_MARKER = "\uE020";
var FUNCTION_DEFINITION_RE =
  /(?:^|[;&|(\n])[ \t]*(?:function[ \t]+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*[ \t]*\([ \t]*\))/;
var SET_POSITIONAL_RE = /(?:^|[;&|(\n])[ \t]*set[ \t]+--[ \t]+(?!["']{2}(?:[\s;&|]|$)|["']?\$)[^\s;&|]/;
var SHELL_C_INVOCATION_RE = new RegExp(
  String.raw`(?:^|[\s;&|(])(?:[^\s=]*\/)?(?:busybox\s+)?(?:${[...POSIX_SHELL_NAMES].join("|")})\s+(?:(?:--?|\+)[A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z0-9_][A-Za-z0-9_-]*)?\s+)*-[A-Za-z]*c[A-Za-z]*\s+(?:--\s+)?\$?(["'])`,
  "gi",
);
var MAX_INLINE_DEPTH = 2;
var MAX_INVOCATION_DISPLAY = 120;
var LEADING_KEYWORDS = new Set(["do", "then", "else", "elif", "if", "while", "until", "!", "{", "coproc"]);
var COMMAND_WRAPPERS = new Set([
  "sudo",
  "doas",
  "exec",
  "command",
  "env",
  "nice",
  "nohup",
  "busybox",
  "time",
  "timeout",
  "stdbuf",
  "setsid",
  "ionice",
  "pkexec",
  "runuser",
  "eval",
  "xargs",
]);
var FIND_PREDICATE_RE =
  /^-(?:exec|execdir|ok|okdir|name|iname|path|ipath|regex|prune|type|maxdepth|mindepth|newer|mtime|mmin|size|print0?|delete|o|a|not|and|or)$/;
//@ chunk-e6aww6q8.js:1083597-1083746 placement
function getRemovalCommand(e) {
  let lower = e
    .replace(/[<>].*$/, "")
    .replace(/^\\/, "")
    .replace(/^[^\s=]*\//, "")
    .toLowerCase();
  return lower === "rm" ? "rm" : lower === "rmdir" ? "rmdir" : null;
}
//@ chunk-e6aww6q8.js:1083746-1084809 placement
/**
 * 在命令文本中跳过前导关键字、赋值、重定向与包装命令（sudo/env/xargs/eval 等）找到 rm/rmdir 调用，返回 {command, word, tokens, reparsed}。
 */
function findRemovalInvocation(text, allowEvalStrings) {
  let words = text.split(/\s+/).filter((G) => G !== "");
  let index = 0;
  while (index < words.length) {
    let G = words[index];
    if (getRemovalCommand(G) !== null) break;
    if (
      LEADING_KEYWORDS.has(G.toLowerCase()) ||
      /^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(G) ||
      /^[$\uE020]/.test(G)
    )
      index++;
    else if (/^[\d&]*[<>]/.test(G)) {
      index++;
      if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(G)) index++;
    } else break;
  }
  let h = (G) =>
    G.replace(/^\\/, "")
      .replace(/^[^\s=]*\//, "")
      .toLowerCase();
  let y = false;
  let S = (G) => (allowEvalStrings && y ? G.replace(/^\$?['"]/, "") : G);
  let w = (G) => {
    let q = h(S(G));
    return COMMAND_WRAPPERS.has(q) || (allowEvalStrings && q === "trap");
  };
  while (index < words.length && w(words[index])) {
    let G = h(S(words[index]));
    y ||= G === "eval" || G === "trap";
    index++;
    while (index < words.length) {
      let q = S(words[index]);
      if (getRemovalCommand(q) !== null || w(q)) break;
      if (/^[\d&]*[<>]/.test(q)) {
        index++;
        if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(q)) index++;
        continue;
      }
      if (q.startsWith("-")) {
        index++;
        let Z = words[index] === undefined ? undefined : S(words[index]);
        if (
          Z !== undefined &&
          !Z.startsWith("-") &&
          !Z.includes("=") &&
          getRemovalCommand(Z) === null &&
          !w(Z)
        )
          index++;
        continue;
      }
      if (/^[A-Za-z_][A-Za-z0-9_]*\+?=/.test(q) || /^\d/.test(q) || /^[$\uE020]/.test(q)) {
        index++;
        continue;
      }
      break;
    }
  }
  let command = index < words.length ? getRemovalCommand(S(words[index])) : null;
  return command === null
    ? null
    : {
        command,
        word: words[index],
        tokens: words.slice(index + 1),
        reparsed: y,
      };
}
//@ chunk-e6aww6q8.js:1084809-1085425 placement
/**
 * 对含 $ 和 rm 的命令找出以可能为空的变量路径为目标的 rm/rmdir 调用：结合已知赋值/unset/派生值推断变量是否可能为空，先按普通分词再按保守方式检查。
 */
function findDangerousVariableRemovalInText(e, n) {
  if (!e.includes("$") || !/\brm(?:dir)?\b/i.test(e)) return null;
  e = e.replace(/[\uE000-\uF8FF]/g, "");
  let r = DEFAULT_EXPANSION_CONTEXT;
  if (n !== undefined) {
    let {
      set: y,
      emptied,
      rootValued,
      derived,
    } = n.assignments ?? describeCommandSubstitution(n.wholeCommand ?? e, n.mayBeUnset);
    r = {
      mayBeUnset: (G) => emptied.has(G) || (!y.has(G) && !isHomeOrCwdVar(G) && n.mayBeUnset(G)),
      derived,
      assigned: new Set([...y].filter((G) => !rootValued.has(G))),
      evalStrings: true,
      skipAssignedOriginalHits: n.skipAssignedOriginalHits,
    };
  }
  let s =
    !FUNCTION_DEFINITION_RE.test(maskQuotedAndComments(e, true)) &&
    !SET_POSITIONAL_RE.test(maskQuotedAndComments(e, false));
  let h = splitCommand(e);
  for (let y of h) {
    let invokedCommandNames = extractInvokedCommandNames(y, s, 0, true, false, r);
    if (invokedCommandNames !== null) return invokedCommandNames;
  }
  for (let y of h) {
    let invokedCommandNames = extractInvokedCommandNames(y, false, 0, false, false, r);
    if (invokedCommandNames !== null) return invokedCommandNames;
  }
  return null;
}
//@ chunk-e6aww6q8.js:1085425-1085826 placement
/**
 * 把命令文本中的注释与（可选）引号内容替换为空格，保持长度与换行，便于结构匹配。
 */
function maskQuotedAndComments(e, n) {
  let r = "";
  let s = null;
  let h = false;
  for (let idx = 0; idx < e.length; idx++) {
    let S = e[idx];
    if (h) {
      if (
        S ===
        `
`
      ) {
        h = false;
        r += S;
      } else r += " ";
      continue;
    }
    if (s === null) {
      if (S === "\\") {
        r += S + (e[idx + 1] ?? "");
        idx++;
        continue;
      }
      if (S === "#" && (idx === 0 || /[\s;&|()]/.test(e[idx - 1]))) {
        h = true;
        r += " ";
        continue;
      }
      if (S === '"' || S === "'") s = S;
      r += S;
      continue;
    }
    if (S === "\\" && isEscapeActive(e, idx, s)) {
      r += n ? "  " : S + (e[idx + 1] ?? "");
      idx++;
      continue;
    }
    if (S === s) {
      s = null;
      r += S;
      continue;
    }
    r += n ? " " : S;
  }
  return r;
}
//@ chunk-e6aww6q8.js:1085826-1086797 placement = findTokenBudgetPositions (0.538)
/**
 * 把一行 shell 命令规整（去续行、反引号、$() 与子 shell，拆 ; | && 等）后提取每段调用的命令名，并识别 find -exec/-ok 内的命令（最多 8 个）。
 */
function extractInvokedCommandNames(e, n, r, s, h, context) {
  let replaced = e.replace(/\\\r?\n/g, " ");
  let w = (s ? protectQuotedMetachars(replaced) : replaced)
    .replace(/(?<!\\)`[^`]*`/g, QUOTE_MARKER)
    .trimStart();
  while (w.startsWith("(") || w.startsWith("{")) w = w.slice(1).trimStart();
  for (let L = ""; L !== w;) {
    L = w;
    w = w.replace(/\$\([^()]*\)/g, QUOTE_MARKER).replace(/(?<![$\\])\([^()]*(?<!\\)\)/g, QUOTE_MARKER);
  }
  w = w.replace(/(?<![<>&])&(?![<>&])/g, ";");
  for (let L of w.split(/[;|\n\r]|&&/)) {
    let text = L.replace(/^[\s\uE020]+/, "");
    let removalInvocation = findRemovalInvocation(text, context.evalStrings);
    let Z = removalInvocation === null ? [] : [removalInvocation];
    for (let match of text.matchAll(/(?:^|\s)-(?:exec|ok)(?:dir)?\s+/g)) {
      if (Z.length >= 8) break;
      let removalInvocation = findRemovalInvocation(
        text.slice(match.index + match[0].length),
        context.evalStrings,
      );
      if (removalInvocation !== null) {
        let we = false;
        let index = removalInvocation.tokens.findIndex((token, Ie, Me) => {
          let We = restoreMetacharsAndUnquote(token);
          if (We === "--") we = true;
          return (
            We === "\\;" ||
            We === ";" ||
            We === "\\" ||
            (We === "+" && restoreMetacharsAndUnquote(Me[Ie - 1] ?? "") === "{}") ||
            (!we && FIND_PREDICATE_RE.test(We))
          );
        });
        Z.push(
          index === -1
            ? removalInvocation
            : {
                ...removalInvocation,
                tokens: removalInvocation.tokens.slice(0, index),
              },
        );
      }
    }
    for (let Se of Z) {
      let variableTargetInRemoval = findVariableTargetInRemoval(Se, n, h, !s || h, context);
      if (variableTargetInRemoval !== null) return variableTargetInRemoval;
    }
    if (s && r < MAX_INLINE_DEPTH) {
      let removalInShellC = findRemovalInShellC(text, r === 0 || n, r + 1, context);
      if (removalInShellC !== null) return removalInShellC;
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:1086797-1087721 placement
/**
 * 检查 rm 调用的各参数：变量顶层路径、可能为空的变量 + 斜杠、派生值等，命中时返回 {command, target, invocation, rootChild, derived} 描述。
 */
function findVariableTargetInRemoval(invocation, n, r, s, context) {
  let { command, tokens } = invocation;
  for (let index = 0; index < tokens.length; index++) {
    let replaced = tokens[index].replace(/[)\]}]+$/, "");
    if (replaced === "" || replaced.startsWith("-") || (!r && /^'[^']*\$/.test(replaced))) continue;
    if (/^[\d&]*[<>]/.test(replaced)) {
      if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(replaced)) index++;
      continue;
    }
    let G = context.derived.get(getBareVariableName(stripTrailingPathGlob(replaced)) ?? "");
    let q = matchRootChildTarget(replaced, context.mayBeUnset);
    let Z = VAR_SLASH_TARGET_RE.test(replaced) || (n && POSITIONAL_VAR_SLASH_TARGET_RE.test(replaced));
    if (
      Z &&
      context.skipAssignedOriginalHits === true &&
      context.assigned.has(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/.exec(replaced)?.[1] ?? "")
    )
      continue;
    if (Z || q !== undefined || G !== undefined) {
      let Se = formatInvocationForDisplay([stripTrailingParens(tokens[index])]);
      let ke = [invocation.word, ...tokens.slice(0, -1), stripTrailingParens(tokens.at(-1))];
      let we = formatInvocationForDisplay(ke);
      let invocation_2 = we;
      if (we.length > MAX_INVOCATION_DISPLAY) {
        let Ae = truncateToLength(we, MAX_INVOCATION_DISPLAY);
        invocation_2 =
          formatInvocationForDisplay(ke.slice(0, index + 2)).length <= MAX_INVOCATION_DISPLAY
            ? `${Ae}\u2026`
            : `${Ae}\u2026 ${Se}`;
      }
      return {
        command,
        target: Se,
        invocation: invocation_2,
        reparsed: s || invocation.reparsed,
        ...(q !== undefined && {
          rootChild: q,
        }),
        ...(G !== undefined && {
          derived: {
            becomes: G.becomes,
            value: ((Ae) =>
              Ae.length > MAX_INVOCATION_DISPLAY
                ? `${truncateToLength(Ae, MAX_INVOCATION_DISPLAY)}\u2026`
                : Ae)(G.value.replace(/[\s\p{Cc}]+/gu, " ")),
          },
        }),
      };
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:1087721-1087818 placement
/**
 * 把命令调用拼成一行展示：命令替换折叠为 $(…)，其余空白与控制字符压成一个空格。
 */
function formatInvocationForDisplay(e) {
  return restoreMetachars(e.join(" "))
    .replaceAll(QUOTE_MARKER, "$(\u2026)")
    .replace(/[\s\p{Cc}]+/gu, " ");
}
//@ chunk-e6aww6q8.js:1087818-1087873 placement
/**
 * 去掉词尾未转义的右括号。
 */
function stripTrailingParens(e) {
  return e.replace(/(^|[^\\])\)+$/, "$1");
}
//@ chunk-e6aww6q8.js:1087873-1087989 placement
var SHELL_METACHARS = ";|&\n\r()` \t";
var METACHAR_PLACEHOLDER_BASE = 57345;
var METACHAR_PLACEHOLDER_RE = new RegExp(
  `[\\u${METACHAR_PLACEHOLDER_BASE.toString(16)}-\\u${(METACHAR_PLACEHOLDER_BASE + SHELL_METACHARS.length - 1).toString(16)}]`,
  "g",
);
//@ chunk-e6aww6q8.js:1087989-1088458 placement
/**
 * 把引号内及转义后的 shell 元字符替换为占位字符，使后续分词不把它们当作分隔符；引号未闭合时原样返回。
 */
function protectQuotedMetachars(e) {
  if (!e.includes('"') && !e.includes("'") && !/\\[ \t]/.test(e)) return e;
  if (getOpenQuoteAt(e, e.length) !== null) return e;
  let n = "";
  let r = null;
  for (let idx = 0; idx < e.length; idx++) {
    let h = e[idx];
    if (h === "\\" && isEscapeActive(e, idx, r)) {
      let S = e[idx + 1] ?? "";
      let w = r === null ? SHELL_METACHARS.indexOf(S) : -1;
      n +=
        h + (w !== -1 && (S === " " || S === "\t") ? String.fromCharCode(METACHAR_PLACEHOLDER_BASE + w) : S);
      idx++;
      continue;
    }
    if (r === null) {
      if (h === '"' || h === "'") r = h;
      n += h;
      continue;
    }
    if (h === r) {
      r = null;
      n += h;
      continue;
    }
    let index = SHELL_METACHARS.indexOf(h);
    n += index === -1 ? h : String.fromCharCode(METACHAR_PLACEHOLDER_BASE + index);
  }
  return n;
}
//@ chunk-e6aww6q8.js:1088458-1088525 placement
/**
 * 把占位字符还原成原来的 shell 元字符。
 */
function restoreMetachars(e) {
  return e.replace(
    METACHAR_PLACEHOLDER_RE,
    (n) => SHELL_METACHARS[n.charCodeAt(0) - METACHAR_PLACEHOLDER_BASE],
  );
}
//@ chunk-e6aww6q8.js:1088525-1088575 placement
/**
 * 去掉引号后还原 shell 元字符。
 */
function restoreMetacharsAndUnquote(token) {
  return restoreMetachars(token.replace(/['"]/g, ""));
}
//@ chunk-e6aww6q8.js:1088575-1088592 placement
/**
 * 转义 $ 时使用的私有区占位字符，最后再换回 “$”。
 */
var DOLLAR_PLACEHOLDER = "\uE010";
//@ chunk-e6aww6q8.js:1088592-1089792 placement
/**
 * 在 "sh/bash -c '脚本'" 调用中拼出脚本文本（处理引号、转义与 $ 占位），判断是否会另外接收参数，然后递归查找脚本中的危险 rm。
 */
function findRemovalInShellC(e, n, r, s) {
  let h = getOpenQuoteAt(e, e.length) === null;
  for (let y of e.matchAll(SHELL_C_INVOCATION_RE)) {
    if (h && getOpenQuoteAt(e, y.index) !== null) continue;
    let S = y[1];
    let L = y.index + y[0].length - 1;
    let G = null;
    let q = [];
    let Z = "";
    for (; L < e.length; L++) {
      let Me = e[L];
      if (Me === "\\" && isEscapeActive(e, L, G)) {
        Z += Me + (e[L + 1] ?? "");
        L++;
        continue;
      }
      if (G === null) {
        if (/\s/.test(Me)) break;
        if (Me === '"' || Me === "'") {
          if (Z !== "") {
            q.push({
              q: G,
              text: Z,
            });
            Z = "";
          }
          G = Me;
          continue;
        }
      } else if (Me === G) {
        q.push({
          q: G,
          text: Z,
        });
        Z = "";
        G = null;
        continue;
      }
      Z += Me;
    }
    if (Z !== "")
      q.push({
        q: G,
        text: Z,
      });
    let Se = restoreMetachars(
      q
        .map((Me) =>
          Me.q === '"'
            ? Me.text
                .replace(/\\(["\\$`])/g, (We, ze) => (ze === "$" ? DOLLAR_PLACEHOLDER : ze))
                .replace(/\uE010(?=[A-Za-z_]|\{[A-Za-z_])/g, "$")
                .replace(/\\+(?=\$)/g, "")
            : Me.q === "'"
              ? `'${Me.text}'`
              : Me.text,
        )
        .join(""),
    );
    let trimmed = e
      .slice(L)
      .replace(/\\ /g, "\uE022")
      .replace(/(?:^|\s)[\d&]*(?:>>?[|&]?|<<?<?|<>|&>)(?:\S+|\s+\S+)/g, " ")
      .replace(/\s*(?:\\;|\\|\+)\s*$/, "")
      .trim();
    let we =
      (trimmed !== "" && trimmed.split(/\s+/).length >= 2) ||
      /(?:^|\s)xargs(?:\s+(?!-[In]\b)\S+)*\s*$/.test(e.slice(0, y.index));
    let Ee = Se;
    let Ae;
    if (S === '"') {
      if (!we) Ee = Ee.replaceAll(DOLLAR_PLACEHOLDER, "$");
      Ae = n || !we;
    } else {
      Ee = Ee.replace(/^'([\s\S]*)'$/, "$1");
      Ae = !we;
    }
    let invokedCommandNames = extractInvokedCommandNames(Ee, Ae, r, true, S === '"', s);
    if (invokedCommandNames !== null)
      return {
        ...invokedCommandNames,
        target: invokedCommandNames.target.replaceAll(DOLLAR_PLACEHOLDER, "\\$"),
        invocation: invokedCommandNames.invocation.replaceAll(DOLLAR_PLACEHOLDER, "\\$"),
      };
  }
  return null;
}
//@ chunk-e6aww6q8.js:1089792-1089908 placement
function isEscapeActive(e, n, r) {
  if (r === "'") return false;
  if (r === null) return true;
  let s = e[n + 1];
  return s === '"' || s === "\\" || s === "$" || s === "`";
}
//@ chunk-e6aww6q8.js:1089908-1090073 placement
/**
 * 计算文本中某位置之前未闭合的引号字符（无则 null）。
 */
function getOpenQuoteAt(e, n) {
  let r = null;
  for (let idx = 0; idx < n; idx++) {
    let h = e[idx];
    if (h === "\\" && isEscapeActive(e, idx, r)) {
      idx++;
      continue;
    }
    if (r === null) {
      if (h === '"' || h === "'") r = h;
    } else if (h === r) r = null;
  }
  return r;
}
export {
  findDangerousVariableRemovalInText,
  describeCommandSubstitution,
  getOpenQuoteAt,
  getBareVariableName,
  stripTrailingPathGlob,
  TRACKED_VAR_TOP_LEVEL_RE,
  isDangerousRemovalTarget,
  matchesPathOrWindowsDrive,
  COMMAND_WRAPPERS,
  LEADING_KEYWORDS,
  MAX_INLINE_DEPTH,
};
