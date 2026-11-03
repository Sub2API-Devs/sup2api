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
import { Lu } from "../../utils/networkPaths.js";
import { POSIX_SHELL_NAMES } from "../../utils/bash/ast.js";
import { splitCommand } from "../../utils/bash/commands.js";
import { truncateToLength } from "../../utils/stringUtils.js";

/**
 * 危险删除检测用正则：$VAR/…、${N}/… 形式的目标，顶层目录名列表（Linux/macOS/Windows），以及 __TRACKED_VAR__/顶层目录的匹配。
 */
//@ chunk-e6aww6q8.js:1074425-1075273 affinity
var VAR_SLASH_TARGET_RE =
    /^[\uE020"']*\$(?:\{[A-Za-z_][A-Za-z0-9_]*(?::?-(?:["']{2}|"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"?)?)?\}|[A-Za-z_][A-Za-z0-9_]*)[\uE020"']*\\?\/(?:[*?[{]|\$|\/|["']|\uE020|$)/,
  POSITIONAL_VAR_SLASH_TARGET_RE =
    /^[\uE020"']*\$(?:\{(?:[0-9]+|[@*!])(?::?-(?:["']{2}|"?\$\{?[A-Za-z_][A-Za-z0-9_]*\}?"?)?)?\}|[0-9@*!])[\uE020"']*\\?\/(?:[*?[{]|\$|\/|["']|\uE020|$)/,
  TOP_LEVEL_DIR_NAMES =
    "bin|boot|dev|etc|home|lib|lib32|lib64|libx32|media|mnt|opt|proc|root|run|sbin|srv|sys|tmp|usr|var|snap|nix|lost\\+found|private|cores|Applications|Library|System|Users|Volumes|Windows|ProgramData|cygdrive",
  TRACKED_VAR_TOP_LEVEL_RE = new RegExp(
    String.raw`^(?:__TRACKED_VAR__)+[\\/]+(${TOP_LEVEL_DIR_NAMES})(?:[\\/]+\*+)*[\\/]*$`,
    "i",
  ),
  VAR_TOP_LEVEL_TARGET_RE = new RegExp(
    String.raw`^[\uE020"']*\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::?-(?:["']{2}|"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?)?)?\}|([A-Za-z_][A-Za-z0-9_]*))[\uE020"']*\\?\/(${TOP_LEVEL_DIR_NAMES})(?:[\\/]+\*+)*\/?[\uE020"']*$`,
    "i",
  );
//@ chunk-e6aww6q8.js:1075273-1075318 placement
function y2t(e) {
  return e === "HOME" || e === "PWD";
}
//@ chunk-e6aww6q8.js:1075318-1075492 placement
function matchRootChildTarget(e, n) {
  let match = VAR_TOP_LEVEL_TARGET_RE.exec(e.replace(/\/(?:\.\/)+/g, "/").replace(/\/{2,}/g, "/"));
  if (match === null) return;
  let s = match[1] ?? match[3],
    h = match[2];
  return n(s) && (h === void 0 || n(h)) ? match[4] : void 0;
}
/**
 * 展开分析常量：产出路径的命令替换（cd/pwd/dirname/git rev-parse）、默认分析上下文、长度上限、赋值/unset/for 循环正则。
 */
//@ chunk-e6aww6q8.js:1075492-1075910 placement
var PATH_COMMAND_SUBST_RE = /^\s*(?:(cd|pwd|dirname)(?![A-Za-z0-9_-])|git\s+(rev-parse)\b)/,
  DEFAULT_EXPANSION_CONTEXT = {
    mayBeUnset: () => !1,
    derived: new Map(),
    assigned: new Set(),
    evalStrings: !1,
  },
  MAX_EXPANSION_SCAN = 1e4,
  ASSIGNMENT_NAME_RE = /(?:^|[\s;&|(])([A-Za-z_][A-Za-z0-9_]*)=/g,
  UNSET_STATEMENT_RE =
    /(?:^|[;&|({\n]|\b(?:then|do|else|elif)\b|!)[ \t]*unset[ \t]+(?:-[a-z][ \t]+)*((?:[A-Za-z_][A-Za-z0-9_]*[ \t]*)+)/g,
  FOR_LOOP_RE =
    /(?:^|[;&|({\n]|\b(?:then|do|else|elif)\b)\s*for\s+([A-Za-z_][A-Za-z0-9_]*)\s+in\s+([^;\n]*)/g;
/**
 * 把命令文本中 heredoc 正文替换为空格（保留换行与长度），避免正文内容被当作命令分析。
 */
//@ chunk-e6aww6q8.js:1075910-1076359 placement
function blankHeredocBodies(e) {
  let n = e,
    r = maskQuotedAndComments(n, !0),
    s = /(?:^|[^<$(])<<(?!<)/g;
  for (let match = s.exec(r); match !== null; match = s.exec(r)) {
    let y = match.index + match[0].length - 2,
      match_2 = /^<<-?\s*\\?["']?([A-Za-z_][A-Za-z0-9_]*)["']?[^\n]*\n/.exec(n.slice(y));
    if (match_2 === null) continue;
    let w = y + match_2[0].length,
      match_3 = new RegExp(String.raw`^\t*${match_2[1]}[ \t]*$`, "m").exec(n.slice(w)),
      q = match_3 === null ? n.length : w + match_3.index + match_3[0].length;
    ((n = n.slice(0, w) + n.slice(w, q).replace(/[^\n]/g, " ") + n.slice(q)),
      (r = maskQuotedAndComments(n, !0)),
      (s.lastIndex = q));
  }
  return n;
}
//@ chunk-e6aww6q8.js:1076359-1076524 placement
function joinLineContinuations(e) {
  let n = maskQuotedAndComments(e, !0),
    r = e;
  for (let s = n.length - 1; s > 0; s--)
    if (
      n[s] ===
        `
` &&
      n[s - 1] === "\\" &&
      !(n[s - 2] === "\\" && e[s - 1] === "\\")
    )
      r = r.slice(0, s - 1) + r.slice(s + 1);
  return r;
}
//@ chunk-e6aww6q8.js:1076524-1076581 placement
var jOo = /^[\\/](?:cygdrive[\\/])?([A-Za-z])(?=[\\/]|$)/i;
//@ chunk-e6aww6q8.js:1076581-1076653 placement
function S2t(e, n) {
  if (n(e)) return !0;
  let r = toWindowsDrivePath(e);
  return r !== void 0 && n(r);
}
//@ chunk-e6aww6q8.js:1076653-1076857 placement
function toWindowsDrivePath(e) {
  if (getPlatform() !== "windows") return;
  let n = normalizeDosDevicePath(e);
  if (n !== e) return n;
  let match = jOo.exec(e);
  if (match === null) return;
  let replaced = e.slice(match[0].length).replace(/\//g, "\\");
  return `${match[1].toUpperCase()}:${replaced === "" ? "\\" : replaced}`;
}
//@ chunk-e6aww6q8.js:1076857-1076891 placement
function mye(e) {
  return S2t(e, isDangerousRemovalPath);
}
//@ chunk-e6aww6q8.js:1076891-1077173 placement
function isRootLikeValue(e) {
  let replaced = e.replace(/^(["'])([\s\S]*)\1$/, "$2").replace(/(.)\/+$/, "$1"),
    r = /^\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^}$`]*)\}$/.exec(replaced)?.[1];
  return (
    /^\/+$/.test(replaced) ||
    /(?:^|\/)\.\.?\/*$/.test(replaced) ||
    /^\$\{?HOME\}?$/.test(replaced) ||
    (!/[$`]/.test(replaced) && mye(Lu(replaced))) ||
    (r !== void 0 && r !== "" && mye(Lu(r)))
  );
}
/**
 * 从指定位置找到 shell 单词的结束位置（处理转义、引号、$( ) 与 ${ } 嵌套）；结构不完整返回 undefined。
 */
//@ chunk-e6aww6q8.js:1077173-1077600 placement
function findWordEnd(e, n) {
  let r = (s) => {
    let h = n,
      y = 0,
      S = null;
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
    return y === 0 && S === null ? h : void 0;
  };
  return r(!0) ?? r(!1) ?? e.length;
}
/**
 * 跳过语句开头的变量赋值前缀，返回命令开始位置以及该位置是否仍是前缀（遇到分隔符、注释或 &/| 时结束）。
 */
//@ chunk-e6aww6q8.js:1077600-1077939 placement
function skipAssignmentPrefix(e, n) {
  let r = n;
  for (;;) {
    while (r < e.length && (e[r] === " " || e[r] === "\t")) r++;
    if (r >= e.length || /[;\n)#]/.test(e[r])) return { end: r, prefix: !1 };
    if (e[r] === "&" || e[r] === "|") return { end: r, prefix: e[r + 1] !== e[r] };
    let match = /^[A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?\+?=/.exec(e.slice(r, r + 1024));
    if (match === null) return { end: r, prefix: !0 };
    r = findWordEnd(e, r + match[0].length);
  }
}
//@ chunk-e6aww6q8.js:1077939-1078040 placement
function isAndChainOnly(e) {
  let parts = e.split("&&");
  return parts[0].trim() === "" && parts.slice(1).every((r) => !/[;|&]/.test(r));
}
/**
 * 从值中提取命令替换的正文：支持反引号与 $( )（须占满整个值，去掉外层双引号与结尾斜杠）。
 */
//@ chunk-e6aww6q8.js:1078040-1078427 placement
function extractSubstitutionBody(e) {
  let replaced = e.replace(/^"([\s\S]*)"$/, "$1").replace(/\/+$/, ""),
    match = /^`([^`]*)`$/.exec(replaced);
  if (match !== null) return match[1];
  if (!replaced.startsWith("$(")) return;
  let s = 0,
    h = null;
  for (let y = 1; y < replaced.length; y++) {
    let S = replaced[y];
    if (S === "\\" && isEscapeActive(replaced, y, h)) y++;
    else if (h !== null) h = S === h ? null : h;
    else if (S === '"' || S === "'") h = S;
    else if (S === "(") s++;
    else if (S === ")" && --s === 0) return y === replaced.length - 1 ? replaced.slice(2, y) : void 0;
  }
  return;
}
/**
 * 描述命令替换的作用（如 git rev-parse 打印仓库根、pwd 打印当前目录），用于权限提示。
 */
//@ chunk-e6aww6q8.js:1078427-1082458 placement
function describeCommandSubstitution(e, n) {
  let r = joinLineContinuations(
      blankHeredocBodies(
        (e.length > MAX_EXPANSION_SCAN ? e.slice(0, MAX_EXPANSION_SCAN) : e).replace(/[\uE000-\uF8FF]/g, ""),
      ),
    ),
    s = maskQuotedAndComments(r, !0),
    h = maskQuotedAndComments(r, !1),
    y = /(?:^|[\s;&|({])trap\s+(?:--\s+)?\$?'[^']*\brm\b/.test(h)
      ? r.length
      : Math.max(...[...h.matchAll(/\brm(?:dir)?\b/gi)].map((ze) => ze.index), -1),
    S = new Set(),
    w = new Set(),
    L = new Set(),
    G = new Set(),
    q = new Map(),
    Z = (ze) => w.has(ze) || L.has(ze) || (!S.has(ze) && !y2t(ze) && n(ze)),
    sorted = [
      ...[...s.matchAll(UNSET_STATEMENT_RE)].map((ze) => ({
        index: ze.index,
        names: ze[1].trim().split(/\s+/),
        bound: !1,
        rootish: !1,
        until: -1,
      })),
      ...[...s.matchAll(FOR_LOOP_RE)].map((ze) => {
        let lt = ze.index + ze[0].length,
          trimmed = r.slice(lt - ze[2].length, lt).trim(),
          nt = trimmed !== "" && !/""|''/.test(trimmed) && !/(?:^|\s)"[^"]*[$`][^"]*"(?=\s|$)/.test(trimmed),
          pt = /[$`]/.test(trimmed) ? /\bdone\b/.exec(s.slice(lt)) : null;
        return {
          index: ze.index,
          names: [ze[1]],
          bound: nt ? !0 : null,
          rootish: nt && !/\s/.test(trimmed) && isRootLikeValue(trimmed),
          until: pt === null ? -1 : lt + pt.index,
        };
      }),
    ]
      .flatMap((ze) => (ze.until >= 0 ? [ze, { ...ze, index: ze.until, bound: null, rootish: !1 }] : [ze]))
      .filter((ze) => ze.index < y)
      .sort((ze, lt) => ze.index - lt.index),
    ke = (ze) => {
      while (sorted.length > 0 && sorted[0].index < ze) {
        let { names: names, bound: bound, rootish: rootish } = sorted.shift();
        for (let pt of names)
          if ((S.delete(pt), w.delete(pt), L.delete(pt), G.delete(pt), q.delete(pt), bound === !0)) {
            if ((S.add(pt), rootish)) G.add(pt);
          } else if (bound === !1) w.add(pt);
      }
    },
    we = 0,
    Ee = null,
    Ae = 0,
    Ie = !1,
    Me = 0,
    We = 0;
  ASSIGNMENT_NAME_RE.lastIndex = 0;
  for (
    let match = ASSIGNMENT_NAME_RE.exec(s);
    match !== null && match.index < y;
    match = ASSIGNMENT_NAME_RE.exec(s)
  ) {
    let lt = match[1],
      Je = match.index + match[0].length,
      nt = findWordEnd(r, Je);
    ASSIGNMENT_NAME_RE.lastIndex = nt;
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
      if (/[;&|(\n]/.test(vn)) ((Ae = We + 1), (Ie = vn === "|" && s[We - 1] === "|"));
    }
    let max = Math.max(we, Ae, Me),
      yt = Ee !== null && pt < Ee.end ? Ee : null,
      gt = yt !== null ? yt.conditional : Ae >= we && Ie;
    if (
      !/^[\s)]*(?:(?:do|then|else|elif|if|while|until|time|!|\{)\s+)*(?:(?:export|local|declare|typeset|readonly)(?:\s+-\w+)*\s+)?$/.test(
        r.slice(max, pt),
      )
    )
      continue;
    we = nt;
    let At = yt ?? { ...skipAssignmentPrefix(s, nt), conditional: gt };
    if (((Ee = At), At.prefix)) continue;
    ke(pt);
    let sliced = r.slice(Je, nt),
      Yt = extractSubstitutionBody(sliced),
      qt;
    if (Yt !== void 0) {
      let match = PATH_COMMAND_SUBST_RE.exec(Yt);
      if (match?.[2] === "rev-parse") qt = "prints a git value such as the repository root";
      else if (match?.[1] === "pwd") qt = "prints the current directory";
      else if (match?.[1] === "dirname" || match?.[1] === "cd") {
        let match_2 = /^\s*(?:cd|dirname)\s+(?:--?\w*\s+)*([^\s;&|]*)/.exec(Yt),
          So = match_2?.[1],
          ko = (ao) => ao.replace(/\/+[^/]*\/*$/, "") || (ao.startsWith("/") ? "/" : ".");
        if (!(
          match_2 !== null &&
          So !== void 0 &&
          So !== "" &&
          !/[$`]/.test(So) &&
          !/^(?:""|'')$/.test(So) &&
          (match[1] === "dirname"
            ? !mye(Lu(ko(So.replace(/^(["'])(.*)\1$/, "$2"))))
            : isAndChainOnly(Yt.slice(match_2[0].length)))
        ))
          qt =
            match[1] === "dirname"
              ? So !== void 0 && So !== "" && !/[$`]/.test(So)
                ? `prints ${ko(So.replace(/^(["'])(.*)\1$/, "$2"))}`
                : "prints the current directory (as `.`) when its input is empty"
              : 'prints the current directory when its input is empty (`cd ""` stays put)';
      }
    } else if (!/[$`]/.test(sliced) || /^"?\$\{?[A-Za-z_]/.test(sliced)) {
      let vn = matchRootChildTarget(sliced, Z);
      if (vn !== void 0) qt = `is /${vn} when the variable in it is empty`;
      else if (VAR_SLASH_TARGET_RE.test(sliced))
        qt = "is the filesystem root when the variable in it is empty";
    }
    let Zt = /^"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?\/*$/.exec(sliced)?.[1],
      rn =
        Zt === "PWD"
          ? { value: sliced, becomes: "is the current directory" }
          : Zt === void 0
            ? void 0
            : q.get(Zt);
    if (qt !== void 0) q.set(lt, { value: sliced, becomes: qt });
    else if (rn !== void 0) q.set(lt, rn);
    else if (!gt) q.delete(lt);
    let pn = /^"?\$\{?([A-Za-z_][A-Za-z0-9_]*)\}?"?(?:\/[^\s"'$`]*)?"?$/.exec(sliced)?.[1],
      matches = /(?:^|\/)\.\.(?:\/|$)/.test(sliced.replace(/["']/g, "")),
      matches_2 = /^(?:""|''|\(\s*\))?$/.test(sliced),
      ho = /\/([^\s/$`"')}]+)"?$/.exec(sliced)?.[1],
      yn = /^"?\$\{[A-Za-z_][A-Za-z0-9_]*:?-([^\s}$`]+)\}"?$/.exec(sliced)?.[1],
      Kn = yn === void 0 || /^(?:|\/+|(?:[^/]*\/)*\.\.?\/*)$/.test(yn.replace(/^(["'])([\s\S]*)\1$/, "$2")),
      fo =
        (!matches && ho !== void 0 && !/^[.?*[\]{}]+$/.test(ho)) ||
        !Kn ||
        (pn !== void 0 && !matches ? !Z(pn) : !matches_2 && !/[$`]/.test(sliced)),
      To = S.has(lt),
      bo = G.has(lt);
    if ((S.delete(lt), w.delete(lt), L.delete(lt), G.delete(lt), fo && gt))
      if (To) {
        if ((S.add(lt), bo || isRootLikeValue(sliced))) G.add(lt);
      } else L.add(lt);
    else if (fo) {
      if ((S.add(lt), isRootLikeValue(sliced) || (pn !== void 0 && G.has(pn)))) G.add(lt);
    } else if (matches_2) w.add(lt);
    else L.add(lt);
  }
  return (
    ke(Number.POSITIVE_INFINITY),
    { set: S, emptied: new Set([...w, ...L]), rootValued: G, derived: q }
  );
}
/**
 * 去掉路径末尾的 /* 或 /. 之类通配后缀（保留引号）。
 */
//@ chunk-e6aww6q8.js:1082458-1082612 placement
function stripTrailingPathGlob(e) {
  let n = e.length;
  while (n > 0 && /[\uE020"']/.test(e[n - 1])) n--;
  let r = n;
  while (r > 0 && /[/*.]/.test(e[r - 1])) r--;
  return r < n && e[r] === "/" ? e.slice(0, r) : e;
}
/**
 * 若单词只是一个变量引用（$NAME 或 ${NAME:?..}），返回变量名。
 */
//@ chunk-e6aww6q8.js:1082612-1082778 placement
function getBareVariableName(e) {
  let match =
    /^[\uE020"']*\$(?:\{([A-Za-z_][A-Za-z0-9_]*)(?::?[?-][^}]*)?\}|([A-Za-z_][A-Za-z0-9_]*))[\uE020"']*$/.exec(
      e,
    );
  return match === null ? void 0 : (match[1] ?? match[2]);
}
/**
 * 内联 shell 分析常量：引号占位字符、函数定义/set -- 正则、"sh -c" 调用正则、最大递归深度、截断长度、前导关键字与包装命令集合、find 谓词正则。
 */
//@ chunk-e6aww6q8.js:1082778-1083597 placement
var QUOTE_MARKER = "\uE020",
  FUNCTION_DEFINITION_RE =
    /(?:^|[;&|(\n])[ \t]*(?:function[ \t]+[A-Za-z_][A-Za-z0-9_]*|[A-Za-z_][A-Za-z0-9_]*[ \t]*\([ \t]*\))/,
  SET_POSITIONAL_RE = /(?:^|[;&|(\n])[ \t]*set[ \t]+--[ \t]+(?!["']{2}(?:[\s;&|]|$)|["']?\$)[^\s;&|]/,
  SHELL_C_INVOCATION_RE = new RegExp(
    String.raw`(?:^|[\s;&|(])(?:[^\s=]*\/)?(?:busybox\s+)?(?:${[...POSIX_SHELL_NAMES].join("|")})\s+(?:(?:--?|\+)[A-Za-z][A-Za-z0-9_-]*(?:\s+[A-Za-z0-9_][A-Za-z0-9_-]*)?\s+)*-[A-Za-z]*c[A-Za-z]*\s+(?:--\s+)?\$?(["'])`,
    "gi",
  ),
  MAX_INLINE_DEPTH = 2,
  MAX_INVOCATION_DISPLAY = 120,
  LEADING_KEYWORDS = new Set(["do", "then", "else", "elif", "if", "while", "until", "!", "{", "coproc"]),
  COMMAND_WRAPPERS = new Set([
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
  ]),
  FIND_PREDICATE_RE =
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
/**
 * 在命令文本中跳过前导关键字、赋值、重定向与包装命令（sudo/env/xargs/eval 等）找到 rm/rmdir 调用，返回 {command, word, tokens, reparsed}。
 */
//@ chunk-e6aww6q8.js:1083746-1084809 placement
function findRemovalInvocation(text, allowEvalStrings) {
  let words = text.split(/\s+/).filter((G) => G !== ""),
    index = 0;
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
      if ((index++, /^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(G))) index++;
    } else break;
  }
  let h = (G) =>
      G.replace(/^\\/, "")
        .replace(/^[^\s=]*\//, "")
        .toLowerCase(),
    y = !1,
    S = (G) => (allowEvalStrings && y ? G.replace(/^\$?['"]/, "") : G),
    w = (G) => {
      let q = h(S(G));
      return COMMAND_WRAPPERS.has(q) || (allowEvalStrings && q === "trap");
    };
  while (index < words.length && w(words[index])) {
    let G = h(S(words[index]));
    ((y ||= G === "eval" || G === "trap"), index++);
    while (index < words.length) {
      let q = S(words[index]);
      if (getRemovalCommand(q) !== null || w(q)) break;
      if (/^[\d&]*[<>]/.test(q)) {
        if ((index++, /^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(q))) index++;
        continue;
      }
      if (q.startsWith("-")) {
        index++;
        let Z = words[index] === void 0 ? void 0 : S(words[index]);
        if (Z !== void 0 && !Z.startsWith("-") && !Z.includes("=") && getRemovalCommand(Z) === null && !w(Z))
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
    : { command: command, word: words[index], tokens: words.slice(index + 1), reparsed: y };
}
/**
 * 对含 $ 和 rm 的命令找出以可能为空的变量路径为目标的 rm/rmdir 调用：结合已知赋值/unset/派生值推断变量是否可能为空，先按普通分词再按保守方式检查。
 */
//@ chunk-e6aww6q8.js:1084809-1085425 placement
function findDangerousVariableRemovalInText(e, n) {
  if (!e.includes("$") || !/\brm(?:dir)?\b/i.test(e)) return null;
  e = e.replace(/[\uE000-\uF8FF]/g, "");
  let r = DEFAULT_EXPANSION_CONTEXT;
  if (n !== void 0) {
    let {
      set: y,
      emptied: emptied,
      rootValued: rootValued,
      derived: derived,
    } = n.assignments ?? describeCommandSubstitution(n.wholeCommand ?? e, n.mayBeUnset);
    r = {
      mayBeUnset: (G) => emptied.has(G) || (!y.has(G) && !y2t(G) && n.mayBeUnset(G)),
      derived: derived,
      assigned: new Set([...y].filter((G) => !rootValued.has(G))),
      evalStrings: !0,
      skipAssignedOriginalHits: n.skipAssignedOriginalHits,
    };
  }
  let s =
      !FUNCTION_DEFINITION_RE.test(maskQuotedAndComments(e, !0)) &&
      !SET_POSITIONAL_RE.test(maskQuotedAndComments(e, !1)),
    h = splitCommand(e);
  for (let y of h) {
    let S = extractInvokedCommandNames(y, s, 0, !0, !1, r);
    if (S !== null) return S;
  }
  for (let y of h) {
    let S = extractInvokedCommandNames(y, !1, 0, !1, !1, r);
    if (S !== null) return S;
  }
  return null;
}
/**
 * 把命令文本中的注释与（可选）引号内容替换为空格，保持长度与换行，便于结构匹配。
 */
//@ chunk-e6aww6q8.js:1085425-1085826 placement
function maskQuotedAndComments(e, n) {
  let r = "",
    s = null,
    h = !1;
  for (let y = 0; y < e.length; y++) {
    let S = e[y];
    if (h) {
      if (
        S ===
        `
`
      )
        ((h = !1), (r += S));
      else r += " ";
      continue;
    }
    if (s === null) {
      if (S === "\\") {
        ((r += S + (e[y + 1] ?? "")), y++);
        continue;
      }
      if (S === "#" && (y === 0 || /[\s;&|()]/.test(e[y - 1]))) {
        ((h = !0), (r += " "));
        continue;
      }
      if (S === '"' || S === "'") s = S;
      r += S;
      continue;
    }
    if (S === "\\" && isEscapeActive(e, y, s)) {
      ((r += n ? "  " : S + (e[y + 1] ?? "")), y++);
      continue;
    }
    if (S === s) {
      ((s = null), (r += S));
      continue;
    }
    r += n ? " " : S;
  }
  return r;
}
/**
 * 把一行 shell 命令规整（去续行、反引号、$() 与子 shell，拆 ; | && 等）后提取每段调用的命令名，并识别 find -exec/-ok 内的命令（最多 8 个）。
 */
//@ chunk-e6aww6q8.js:1085826-1086797 placement = findTokenBudgetPositions (0.538)
function extractInvokedCommandNames(e, n, r, s, h, y) {
  let replaced = e.replace(/\\\r?\n/g, " "),
    trimStart = (s ? protectQuotedMetachars(replaced) : replaced)
      .replace(/(?<!\\)`[^`]*`/g, QUOTE_MARKER)
      .trimStart();
  while (trimStart.startsWith("(") || trimStart.startsWith("{")) trimStart = trimStart.slice(1).trimStart();
  for (let L = ""; L !== trimStart;)
    ((L = trimStart),
      (trimStart = trimStart
        .replace(/\$\([^()]*\)/g, QUOTE_MARKER)
        .replace(/(?<![$\\])\([^()]*(?<!\\)\)/g, QUOTE_MARKER)));
  trimStart = trimStart.replace(/(?<![<>&])&(?![<>&])/g, ";");
  for (let L of trimStart.split(/[;|\n\r]|&&/)) {
    let replaced = L.replace(/^[\s\uE020]+/, ""),
      q = findRemovalInvocation(replaced, y.evalStrings),
      Z = q === null ? [] : [q];
    for (let match of replaced.matchAll(/(?:^|\s)-(?:exec|ok)(?:dir)?\s+/g)) {
      if (Z.length >= 8) break;
      let ke = findRemovalInvocation(replaced.slice(match.index + match[0].length), y.evalStrings);
      if (ke !== null) {
        let we = !1,
          index = ke.tokens.findIndex((token, Ie, Me) => {
            let We = KKt(token);
            if (We === "--") we = !0;
            return (
              We === "\\;" ||
              We === ";" ||
              We === "\\" ||
              (We === "+" && KKt(Me[Ie - 1] ?? "") === "{}") ||
              (!we && FIND_PREDICATE_RE.test(We))
            );
          });
        Z.push(index === -1 ? ke : { ...ke, tokens: ke.tokens.slice(0, index) });
      }
    }
    for (let Se of Z) {
      let ke = findVariableTargetInRemoval(Se, n, h, !s || h, y);
      if (ke !== null) return ke;
    }
    if (s && r < MAX_INLINE_DEPTH) {
      let Se = findRemovalInShellC(replaced, r === 0 || n, r + 1, y);
      if (Se !== null) return Se;
    }
  }
  return null;
}
/**
 * 检查 rm 调用的各参数：变量顶层路径、可能为空的变量 + 斜杠、派生值等，命中时返回 {command, target, invocation, rootChild, derived} 描述。
 */
//@ chunk-e6aww6q8.js:1086797-1087721 placement
function findVariableTargetInRemoval(invocation, n, r, s, context) {
  let { command: command, tokens: tokens } = invocation;
  for (let index = 0; index < tokens.length; index++) {
    let replaced = tokens[index].replace(/[)\]}]+$/, "");
    if (replaced === "" || replaced.startsWith("-") || (!r && /^'[^']*\$/.test(replaced))) continue;
    if (/^[\d&]*[<>]/.test(replaced)) {
      if (/^(?:[0-9]+|&)?(?:>>?[|&]?|<<?<?|<>)$/.test(replaced)) index++;
      continue;
    }
    let G = context.derived.get(getBareVariableName(stripTrailingPathGlob(replaced)) ?? ""),
      q = matchRootChildTarget(replaced, context.mayBeUnset),
      Z = VAR_SLASH_TARGET_RE.test(replaced) || (n && POSITIONAL_VAR_SLASH_TARGET_RE.test(replaced));
    if (
      Z &&
      context.skipAssignedOriginalHits === !0 &&
      context.assigned.has(/\$\{?([A-Za-z_][A-Za-z0-9_]*)/.exec(replaced)?.[1] ?? "")
    )
      continue;
    if (Z || q !== void 0 || G !== void 0) {
      let Se = fze([GKt(tokens[index])]),
        ke = [invocation.word, ...tokens.slice(0, -1), GKt(tokens.at(-1))],
        we = fze(ke),
        Ee = we;
      if (we.length > MAX_INVOCATION_DISPLAY) {
        let Ae = truncateToLength(we, MAX_INVOCATION_DISPLAY);
        Ee =
          fze(ke.slice(0, index + 2)).length <= MAX_INVOCATION_DISPLAY ? `${Ae}\u2026` : `${Ae}\u2026 ${Se}`;
      }
      return {
        command: command,
        target: Se,
        invocation: Ee,
        reparsed: s || invocation.reparsed,
        ...(q !== void 0 && { rootChild: q }),
        ...(G !== void 0 && {
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
function fze(e) {
  return wze(e.join(" "))
    .replaceAll(QUOTE_MARKER, "$(\u2026)")
    .replace(/[\s\p{Cc}]+/gu, " ");
}
//@ chunk-e6aww6q8.js:1087818-1087873 placement
function GKt(e) {
  return e.replace(/(^|[^\\])\)+$/, "$1");
}
//@ chunk-e6aww6q8.js:1087873-1087989 placement
var SHELL_METACHARS = ";|&\n\r()` \t",
  METACHAR_PLACEHOLDER_BASE = 57345,
  METACHAR_PLACEHOLDER_RE = new RegExp(
    `[\\u${METACHAR_PLACEHOLDER_BASE.toString(16)}-\\u${(METACHAR_PLACEHOLDER_BASE + SHELL_METACHARS.length - 1).toString(16)}]`,
    "g",
  );
/**
 * 把引号内及转义后的 shell 元字符替换为占位字符，使后续分词不把它们当作分隔符；引号未闭合时原样返回。
 */
//@ chunk-e6aww6q8.js:1087989-1088458 placement
function protectQuotedMetachars(e) {
  if (!e.includes('"') && !e.includes("'") && !/\\[ \t]/.test(e)) return e;
  if (getOpenQuoteAt(e, e.length) !== null) return e;
  let n = "",
    r = null;
  for (let s = 0; s < e.length; s++) {
    let h = e[s];
    if (h === "\\" && isEscapeActive(e, s, r)) {
      let S = e[s + 1] ?? "",
        w = r === null ? SHELL_METACHARS.indexOf(S) : -1;
      ((n +=
        h + (w !== -1 && (S === " " || S === "\t") ? String.fromCharCode(METACHAR_PLACEHOLDER_BASE + w) : S)),
        s++);
      continue;
    }
    if (r === null) {
      if (h === '"' || h === "'") r = h;
      n += h;
      continue;
    }
    if (h === r) {
      ((r = null), (n += h));
      continue;
    }
    let index = SHELL_METACHARS.indexOf(h);
    n += index === -1 ? h : String.fromCharCode(METACHAR_PLACEHOLDER_BASE + index);
  }
  return n;
}
//@ chunk-e6aww6q8.js:1088458-1088525 placement
function wze(e) {
  return e.replace(
    METACHAR_PLACEHOLDER_RE,
    (n) => SHELL_METACHARS[n.charCodeAt(0) - METACHAR_PLACEHOLDER_BASE],
  );
}
//@ chunk-e6aww6q8.js:1088525-1088575 placement
function KKt(e) {
  return wze(e.replace(/['"]/g, ""));
}
//@ chunk-e6aww6q8.js:1088575-1088592 placement
var dye = "\uE010";
/**
 * 在 "sh/bash -c '脚本'" 调用中拼出脚本文本（处理引号、转义与 $ 占位），判断是否会另外接收参数，然后递归查找脚本中的危险 rm。
 */
//@ chunk-e6aww6q8.js:1088592-1089792 placement
function findRemovalInShellC(e, n, r, s) {
  let h = getOpenQuoteAt(e, e.length) === null;
  for (let y of e.matchAll(SHELL_C_INVOCATION_RE)) {
    if (h && getOpenQuoteAt(e, y.index) !== null) continue;
    let S = y[1],
      L = y.index + y[0].length - 1,
      G = null,
      q = [],
      Z = "";
    for (; L < e.length; L++) {
      let Me = e[L];
      if (Me === "\\" && isEscapeActive(e, L, G)) {
        ((Z += Me + (e[L + 1] ?? "")), L++);
        continue;
      }
      if (G === null) {
        if (/\s/.test(Me)) break;
        if (Me === '"' || Me === "'") {
          if (Z !== "") (q.push({ q: G, text: Z }), (Z = ""));
          G = Me;
          continue;
        }
      } else if (Me === G) {
        (q.push({ q: G, text: Z }), (Z = ""), (G = null));
        continue;
      }
      Z += Me;
    }
    if (Z !== "") q.push({ q: G, text: Z });
    let Se = wze(
        q
          .map((Me) =>
            Me.q === '"'
              ? Me.text
                  .replace(/\\(["\\$`])/g, (We, ze) => (ze === "$" ? dye : ze))
                  .replace(/\uE010(?=[A-Za-z_]|\{[A-Za-z_])/g, "$")
                  .replace(/\\+(?=\$)/g, "")
              : Me.q === "'"
                ? `'${Me.text}'`
                : Me.text,
          )
          .join(""),
      ),
      trimmed = e
        .slice(L)
        .replace(/\\ /g, "\uE022")
        .replace(/(?:^|\s)[\d&]*(?:>>?[|&]?|<<?<?|<>|&>)(?:\S+|\s+\S+)/g, " ")
        .replace(/\s*(?:\\;|\\|\+)\s*$/, "")
        .trim(),
      we =
        (trimmed !== "" && trimmed.split(/\s+/).length >= 2) ||
        /(?:^|\s)xargs(?:\s+(?!-[In]\b)\S+)*\s*$/.test(e.slice(0, y.index)),
      Ee = Se,
      Ae;
    if (S === '"') {
      if (!we) Ee = Ee.replaceAll(dye, "$");
      Ae = n || !we;
    } else ((Ee = Ee.replace(/^'([\s\S]*)'$/, "$1")), (Ae = !we));
    let Ie = extractInvokedCommandNames(Ee, Ae, r, !0, S === '"', s);
    if (Ie !== null)
      return {
        ...Ie,
        target: Ie.target.replaceAll(dye, "\\$"),
        invocation: Ie.invocation.replaceAll(dye, "\\$"),
      };
  }
  return null;
}
//@ chunk-e6aww6q8.js:1089792-1089908 placement
function isEscapeActive(e, n, r) {
  if (r === "'") return !1;
  if (r === null) return !0;
  let s = e[n + 1];
  return s === '"' || s === "\\" || s === "$" || s === "`";
}
/**
 * 计算文本中某位置之前未闭合的引号字符（无则 null）。
 */
//@ chunk-e6aww6q8.js:1089908-1090073 placement
function getOpenQuoteAt(e, n) {
  let r = null;
  for (let s = 0; s < n; s++) {
    let h = e[s];
    if (h === "\\" && isEscapeActive(e, s, r)) {
      s++;
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
  mye,
  S2t,
  COMMAND_WRAPPERS,
  LEADING_KEYWORDS,
  MAX_INLINE_DEPTH,
};
