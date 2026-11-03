/**
 * tools/BashTool/destructiveTargets.ts
 *
 * 2.1.316 新增：破坏性命令目标识别
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (21)
 * attribution: affinity 1, placement 20
 */
import {
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  posix as posix_6,
  posix as posix_7,
  posix as posix_8,
  posix as posix_9,
  posix as posix_10,
  posix as posix_11,
  posix as posix_12,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  relative,
  relative as relative_2,
  relative as relative_3,
  relative as relative_4,
  relative as relative_5,
  relative as relative_6,
  relative as relative_7,
  relative as relative_8,
  relative as relative_9,
  relative as relative_10,
  relative as relative_11,
  relative as relative_12,
  relative as relative_13,
  relative as relative_14,
  relative as relative_15,
  relative as relative_16,
  relative as relative_17,
  relative as relative_18,
  relative as relative_19,
  relative as relative_20,
  relative as relative_21,
  relative as relative_22,
  relative as relative_23,
  relative as relative_24,
  relative as relative_25,
  relative as relative_26,
  relative as relative_27,
  relative as relative_28,
  relative as relative_29,
  relative as relative_30,
  relative as relative_31,
  relative as relative_32,
  relative as relative_33,
  relative as relative_34,
  relative as relative_35,
  relative as relative_36,
  relative as relative_37,
  relative as relative_38,
  relative as relative_39,
  relative as relative_40,
  relative as relative_41,
  relative as relative_42,
  relative as relative_43,
  relative as relative_44,
  relative as relative_45,
  relative as relative_46,
  relative as relative_47,
  relative as relative_48,
} from "path";
import { DESTRUCTIVE_PATTERNS_2 } from "./destructiveCommandWarning.js";
import { logError } from "../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";

/**
 * 返回命令（截取前 10000 字符）命中的第一条破坏性模式；category 用于遥测，warning 显示在权限对话框。
 */
//@ chunk-e6aww6q8.js:1007274-1007385 affinity
function matchDestructivePattern(e) {
  let n = e.length > 1e4 ? e.slice(0, 1e4) : e;
  for (let r of DESTRUCTIVE_PATTERNS_2) if (r.pattern.test(n)) return r;
  return null;
}
//@ chunk-e6aww6q8.js:1007385-1007430 placement
function n5s(e) {
  return matchDestructivePattern(e)?.warning ?? null;
}
//@ chunk-e6aww6q8.js:1007430-1007476 placement
function XCe(e) {
  return matchDestructivePattern(e)?.category ?? null;
}
/**
 * 破坏性删除目标识别常量：rm 片段正则、PowerShell 删除命令正则、PowerShell 开关名、Windows 盘符正则、可分类的删除类型。
 */
//@ chunk-e6aww6q8.js:1007476-1007859 placement
var RM_SEGMENT_RE = /(?:^|[;&|\n])[ \t]*rm[ \t]((?:[^;&|\n\\]|\\.)*?)(?=$|[;&|\n])/g,
  POWERSHELL_REMOVE_RE = /(?:^|[|;&\n({])[ \t]*(?:Remove-Item|rm|del|rd|rmdir|ri)[ \t]+([^|;&\n}]*)/gi,
  POWERSHELL_SWITCHES = new Set(["recurse", "force", "whatif", "confirm", "verbose", "debug"]),
  WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/,
  REMOVAL_KINDS = new Set([
    "rm_force",
    "rm_recursive",
    "rm_recursive_force",
    "remove_item_force",
    "remove_item_recursive",
    "remove_item_recursive_force",
  ]);
/**
 * 判断破坏性命令的目标范围（无、未知、混合）。
 */
//@ chunk-e6aww6q8.js:1007859-1008442 placement
function classifyDestructiveTargetScope(e, n, r) {
  if (r === null || !REMOVAL_KINDS.has(r)) return "none";
  if (n === null) return "unknown";
  if (e.length > 2000) return "unknown";
  try {
    let s = resolveCwdAfterCd(e, n),
      h = extractRmTargets(e),
      y = extractRemoveItemTargets(e);
    if (h === null && y === null) return "unknown";
    if (h === "unknown" || y === "unknown") return "unknown";
    let S = [...(h ?? []), ...(y ?? [])];
    if (S.length === 0) return "unknown";
    let w = new Set();
    for (let L of S) {
      let G = classifyTargetLocation(L, n, s);
      if (G === "unknown") return "unknown";
      w.add(G);
    }
    if (w.size > 1) return "mixed";
    return w.values().next().value ?? "unknown";
  } catch (error) {
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `destructive-target-scope parse failed: ${errorMessage(error)}`,
          "destructive-target-scope parse failed",
        ),
      ),
      "unknown"
    );
  }
}
//@ chunk-e6aww6q8.js:1008442-1008619 placement
var DIR_CHANGE_RE = /(?:^|[;&|\n({])[ \t]*(?:cd|pushd|popd|Set-Location|Push-Location|Pop-Location)\b/i,
  LEADING_CD_RE = /^[ \t]*(?:cd|pushd)[ \t]+((?:[^;&|\n\\ \t'"`$*?{}()<>]|\\.)+)[ \t]*(?:&&|;|\n)/;
/**
 * 计算命令开头一串 cd 之后的工作目录（支持 ~ 与相对路径）；含选项、盘符或后续还有 cd 时返回 null。
 */
//@ chunk-e6aww6q8.js:1008619-1009074 placement
function resolveCwdAfterCd(e, n) {
  if (!DIR_CHANGE_RE.test(e)) return n;
  let r = n.startsWith("/") ? posix_4.resolve : resolve_16,
    s = n,
    h = e,
    y = !1;
  for (let match = LEADING_CD_RE.exec(h); match !== null; match = LEADING_CD_RE.exec(h)) {
    let w = match[1];
    if (w.startsWith("-") || WINDOWS_DRIVE_RE.test(w)) return null;
    let replaced = w.replace(/\\(.)/g, "$1");
    if (replaced.startsWith("~")) {
      if (replaced !== "~" && !replaced.startsWith("~/")) return null;
      s = replaced;
    } else if (s.startsWith("~"))
      if (replaced.startsWith("/")) s = r(replaced);
      else s = `${s}/${replaced}`;
    else s = r(s, replaced);
    ((h = h.slice(match[0].length)), (y = !0));
  }
  if (!y || DIR_CHANGE_RE.test(h)) return null;
  return s;
}
/**
 * 从 rm 命令片段中提取删除目标（去掉注释与重定向、跳过选项）；需要带短选项且不是 PowerShell 参数，无法分词时返回 unknown。
 */
//@ chunk-e6aww6q8.js:1009074-1009530 placement
function extractRmTargets(e) {
  let n = !1,
    r = [];
  for (let s of e.matchAll(RM_SEGMENT_RE)) {
    let h = s[1] ?? "";
    if (!/(?:^|\s)-[a-zA-Z]/.test(h)) continue;
    if (/(?:^|\s)-(Recurse|Force|Path|LiteralPath)\b/i.test(h)) continue;
    n = !0;
    let replaced = h
        .replace(/(?:^|\s)#.*$/, "")
        .replace(/\d{0,4}>{1,2}\s*\S*/g, " ")
        .replace(/\d{0,4}<{1,2}\s*\S*/g, " "),
      S = splitQuotedWords(replaced, !0);
    if (S === "unknown") return "unknown";
    let w = !1;
    for (let L of S) {
      if (!w && L === "--") {
        w = !0;
        continue;
      }
      if (!w && L.startsWith("-")) continue;
      r.push(L);
    }
  }
  return n ? r : null;
}
/**
 * 从 PowerShell 的 Remove-Item/rm/del 等带 -Recurse/-Force 的调用中提取目标路径（-Path/-LiteralPath 值、位置参数、逗号分隔列表）；含括号表达式时返回 unknown。
 */
//@ chunk-e6aww6q8.js:1009530-1010423 placement
function extractRemoveItemTargets(e) {
  let n = !1,
    r = [],
    s = (h) => {
      if (h.includes(",")) {
        for (let y of h.split(",")) if (y !== "") r.push(y.trim());
      } else r.push(h);
    };
  for (let h of e.matchAll(POWERSHELL_REMOVE_RE)) {
    let y = h[1] ?? "";
    if (!/(?:^|\s)-(Recurse|Force)\b/i.test(y)) continue;
    if (((n = !0), /[()]/.test(y))) return "unknown";
    let replaced = y
        .replace(/(?:^|\s)#.*$/, "")
        .replace(/\*>{1,2}&?\d?\s*\S*/g, " ")
        .replace(/\d{0,4}>{1,2}\s*\S*/g, " "),
      w = splitQuotedWords(replaced, !1);
    if (w === "unknown") return "unknown";
    for (let L = 0; L < w.length; L++) {
      let G = w[L];
      if (G.startsWith("-")) {
        let index = G.indexOf(":"),
          lower = (index >= 0 ? G.slice(1, index) : G.slice(1)).toLowerCase(),
          Se = index >= 0 ? G.slice(index + 1) : void 0;
        if (lower === "path" || lower === "literalpath")
          if (Se !== void 0 && Se !== "") s(Se);
          else {
            let ke = w[L + 1];
            if (ke !== void 0 && !ke.startsWith("-")) (s(ke), L++);
          }
        else if (Se !== void 0 && Se !== "");
        else if (Se === "") {
          if (w[L + 1] !== void 0 && !w[L + 1].startsWith("-")) L++;
        } else if (!POWERSHELL_SWITCHES.has(lower)) {
          if (w[L + 1] !== void 0 && !w[L + 1].startsWith("-")) L++;
        }
        continue;
      }
      s(G);
    }
  }
  return n ? r : null;
}
/**
 * 按空白分词并处理单/双引号（可选处理双引号内转义）；遇到反引号或引号未闭合返回 unknown。
 */
//@ chunk-e6aww6q8.js:1010423-1010877 placement
function splitQuotedWords(e, n) {
  let r = [],
    s = "",
    h = 0;
  while (h < e.length) {
    let y = e[h];
    if (y === " " || y === "\t") {
      if (s !== "") (r.push(s), (s = ""));
      h++;
      continue;
    }
    if (y === "`") return "unknown";
    if (y === '"' || y === "'") {
      let S = y;
      h++;
      while (h < e.length && e[h] !== S) {
        if (n && S === '"' && e[h] === "\\" && h + 1 < e.length && '$`"\\\n'.includes(e[h + 1])) {
          ((s += e[h + 1]), (h += 2));
          continue;
        }
        ((s += e[h]), h++);
      }
      if (h >= e.length) return "unknown";
      h++;
      continue;
    }
    if (n && y === "\\" && h + 1 < e.length) {
      ((s += e[h + 1]), (h += 2));
      continue;
    }
    ((s += y), h++);
  }
  if (s !== "") r.push(s);
  return r;
}
/**
 * 把删除目标归类为 cwd、tmp、outside_cwd 或 unknown（含命令替换、变量、通配、~user 等无法判定的情况为 unknown）。
 */
//@ chunk-e6aww6q8.js:1010877-1011860 placement
function classifyTargetLocation(e, n, r) {
  if (e === "") return "unknown";
  if (e.includes("$(")) return "unknown";
  if (e.includes("`")) return "unknown";
  if (/^\$TMPDIR(?:[\\/]|$)/.test(e)) return "tmp";
  if (/^\$\{TMPDIR\}(?:[\\/]|$)/.test(e)) return "tmp";
  if (/^%TE?MP%(?:[\\/]|$)/i.test(e)) return "tmp";
  if (/^\$env:TE?MP(?:[\\/]|$)/i.test(e)) return "tmp";
  if (e.includes("$")) return "unknown";
  if (/%[^%]+%/.test(e)) return "unknown";
  if (e.startsWith("*") || e.startsWith("?")) return "unknown";
  if (e.includes("{")) return "unknown";
  if (e.startsWith("~"))
    return e === "~" || e.startsWith("~/") || e.startsWith("~\\") ? "outside_cwd" : "unknown";
  let s = WINDOWS_DRIVE_RE.test(e) || e.startsWith("\\\\");
  if (!isAbsolute_19(e) && !s) {
    if (r === null) return "unknown";
    if (r.startsWith("~")) return "outside_cwd";
    let h = r.startsWith("/") ? posix_4.resolve(r, e) : resolve_16(r, e);
    if (!relative_17(n, h).startsWith("..")) return "cwd";
    if (isTempPath(h)) return "tmp";
    return "outside_cwd";
  }
  if (!s || WINDOWS_DRIVE_RE.test(n) || n.startsWith("\\\\")) {
    let h = relative_17(n, e);
    if (h === "" || (!h.startsWith("..") && !isAbsolute_19(h))) return "cwd";
  }
  if (isTempPath(e)) return "tmp";
  return "outside_cwd";
}
//@ chunk-e6aww6q8.js:1011860-1012064 placement
var MAIN_LIKE_BRANCH_RE =
    /^(main|master|develop|development|trunk|release([/-].*)?|prod(uction)?([/-].*)?|staging([/-].*)?)$/i,
  GIT_DESTRUCTIVE_KINDS = new Set([
    "git_force_push",
    "git_reset_hard",
    "git_branch_force_delete",
    "git_commit_amend",
  ]);
/**
 * 对强推、reset --hard、强删分支、amend 等破坏性 git 命令分类其目标（main_like/feature/implicit/bare 等），解析失败记录错误并返回 unknown。
 */
//@ chunk-e6aww6q8.js:1012064-1012461 placement
function classifyGitDestructiveTarget(e, n) {
  if (n === null || !GIT_DESTRUCTIVE_KINDS.has(n)) return "none";
  if (e.length > 2000) return "unknown";
  try {
    switch (n) {
      case "git_force_push":
        return classifyForcePushTarget(e);
      case "git_reset_hard":
        return classifyResetHardTarget(e);
      case "git_branch_force_delete":
        return classifyBranchDeleteTarget(e);
      case "git_commit_amend":
        return classifyAmendKind(e);
      default:
        return "none";
    }
  } catch (error) {
    return (
      logError(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `git-destructive-target parse failed: ${errorMessage(error)}`,
          "git-destructive-target parse failed",
        ),
      ),
      "unknown"
    );
  }
}
//@ chunk-e6aww6q8.js:1012461-1012517 placement
function NGe(e) {
  return e.includes("$") || e.includes("`");
}
//@ chunk-e6aww6q8.js:1012517-1012611 placement
function cqt(e) {
  let replaced = e.replace(/^refs\/heads\//, "");
  return MAIN_LIKE_BRANCH_RE.test(replaced) ? "main_like" : "feature";
}
//@ chunk-e6aww6q8.js:1012611-1012698 placement
function FGe(e, n, r) {
  for (let s of e.matchAll(n)) {
    let h = s[1] ?? "";
    if (r(h)) return h;
  }
  return;
}
/**
 * 分类强制推送的目标分支：解析 git push 的参数与 refspec，判断是否为 main 类分支、功能分支、隐式或无法判定。
 */
//@ chunk-e6aww6q8.js:1012698-1013469 placement
function classifyForcePushTarget(e) {
  let n = FGe(e, /\bgit[ \t]+push\b([^;&|\n]*)/g, (w) =>
    /(?:^|[ \t])(?:--force(?:-with-lease|-if-includes)?|-f)\b/.test(w),
  );
  if (n === void 0) return "unknown";
  if (NGe(n)) return "unknown";
  let r = splitQuotedWords(n, !0);
  if (r === "unknown") return "unknown";
  let s = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]),
    h = [],
    y = !1;
  for (let w = 0; w < r.length; w++) {
    let L = r[w];
    if (!y && L === "--") {
      y = !0;
      continue;
    }
    if (!y && L.startsWith("-")) {
      let index = L.indexOf("="),
        q = index >= 0 ? L.slice(0, index) : L;
      if (index < 0 && s.has(q)) w++;
      continue;
    }
    h.push(L);
  }
  if (h.length <= 1) return "implicit";
  let S = "feature";
  for (let w of h.slice(1)) {
    if (w === "" || /[*?[\]]/.test(w)) return "unknown";
    let replaced = w.replace(/^\+/, ""),
      index = replaced.lastIndexOf(":"),
      q = index >= 0 ? replaced.slice(index + 1) : replaced;
    if (q === "" || q === "HEAD") return "unknown";
    if (cqt(q) === "main_like") S = "main_like";
  }
  return S;
}
/**
 * 分类 git reset --hard 的目标：无参数为 bare，HEAD 相对为 head_relative，远程主分支、其他提交或无法判定。
 */
//@ chunk-e6aww6q8.js:1013469-1014046 placement
function classifyResetHardTarget(e) {
  let match = e.match(/\bgit[ \t]+reset[ \t]+--hard\b([^;&|\n]*)/);
  if (!match) return "unknown";
  let r = match[1] ?? "";
  if (NGe(r)) return "unknown";
  let s = splitQuotedWords(r, !0);
  if (s === "unknown") return "unknown";
  let h;
  for (let y of s) {
    if (y === "--") continue;
    if (y.startsWith("-")) continue;
    h = y;
    break;
  }
  if (h === void 0 || h === "") return "bare";
  if (/^(HEAD|@)([~^].*)?$/.test(h) || /^(HEAD|@)@\{.*\}$/.test(h)) return "head_relative";
  if (/^[A-Z_]+_HEAD$/.test(h)) return "head_relative";
  if (
    /^(origin|upstream)\//.test(h) ||
    /^refs\/remotes\//.test(h) ||
    /^[A-Za-z0-9_.-]+\/(main|master)$/.test(h)
  )
    return "remote_ref";
  return "other";
}
/**
 * 分类强制删除分支（-D 或 --delete --force）的目标：只要有 main 类分支即为 main_like，否则按其他分支判断。
 */
//@ chunk-e6aww6q8.js:1014046-1014497 placement
function classifyBranchDeleteTarget(e) {
  let n = FGe(
    e,
    /\bgit[ \t]+branch\b([^;&|\n]*)/g,
    (y) => /(?:^|[ \t])-D\b/.test(y) || (/--delete\b/.test(y) && /--force\b/.test(y)),
  );
  if (n === void 0) return "unknown";
  if (NGe(n)) return "unknown";
  let r = splitQuotedWords(n, !0);
  if (r === "unknown") return "unknown";
  let s = [],
    h = !1;
  for (let y of r) {
    if (!h && y === "--") {
      h = !0;
      continue;
    }
    if (!h && y.startsWith("-")) continue;
    s.push(y);
  }
  if (s.length === 0) return "unknown";
  for (let y of s) if (cqt(y) === "main_like") return "main_like";
  return "feature";
}
//@ chunk-e6aww6q8.js:1014497-1014747 placement
function classifyAmendKind(e) {
  let n = FGe(e, /\bgit[ \t]+commit\b([^;&|\n]*)/g, (r) => /--amend\b/.test(r));
  if (n === void 0) return "unknown";
  if (/--no-edit\b/.test(n)) return "no_edit";
  if (/(?:^|[ \t])-[a-zA-Z]*m\b|--message\b/.test(n)) return "with_message";
  return "interactive";
}
/**
 * 判断路径是否为临时目录（/tmp、/var/tmp、macOS /var/folders、Claude scratchpad、Windows Temp 等）。
 */
//@ chunk-e6aww6q8.js:1014747-1015232 placement
function isTempPath(e) {
  if (
    /^\/tmp(?:\/|$)/.test(e) ||
    /^\/var\/tmp(?:\/|$)/.test(e) ||
    /^\/var\/folders\//.test(e) ||
    /^\/private\/tmp(?:\/|$)/.test(e) ||
    /^\/private\/var\/tmp(?:\/|$)/.test(e) ||
    /^\/private\/var\/folders\//.test(e)
  )
    return !0;
  if (/[\\/]claude[^\\/]*[\\/](?:[^\\/]+[\\/])+scratchpad(?:[\\/]|$)/i.test(e)) return !0;
  let replaced = e.replace(/\//g, "\\");
  if (
    /^[A-Za-z]:\\Temp(?:\\|$)/i.test(replaced) ||
    /^[A-Za-z]:\\Windows\\Temp(?:\\|$)/i.test(replaced) ||
    /\\AppData\\Local\\Temp(?:\\|$)/i.test(replaced)
  )
    return !0;
  return !1;
}

export { XCe, classifyDestructiveTargetScope, classifyGitDestructiveTarget, n5s };
