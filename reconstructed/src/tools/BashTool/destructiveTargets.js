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
import { posix, resolve as resolve_2, isAbsolute, relative } from "path";
import { DESTRUCTIVE_PATTERNS_2 } from "./destructiveCommandWarning.js";
import { logError } from "../../utils/log.js";
import {
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  errorMessage,
} from "../../utils/errors.js";

//@ chunk-e6aww6q8.js:1007274-1007385 affinity
/**
 * 返回命令（截取前 10000 字符）命中的第一条破坏性模式；category 用于遥测，warning 显示在权限对话框。
 */
function matchDestructivePattern(e) {
  let n = e.length > 1e4 ? e.slice(0, 1e4) : e;
  for (let r of DESTRUCTIVE_PATTERNS_2) if (r.pattern.test(n)) return r;
  return null;
}
//@ chunk-e6aww6q8.js:1007385-1007430 placement
/**
 * 给出命令的破坏性删除目标警告文本（没有命中返回 null）。
 */
function getDestructiveTargetWarning(e) {
  return matchDestructivePattern(e)?.warning ?? null;
}
//@ chunk-e6aww6q8.js:1007430-1007476 placement
/**
 * 给出破坏性删除目标的分类名（没有命中返回 null）。
 */
function getDestructiveTargetCategory(command) {
  return matchDestructivePattern(command)?.category ?? null;
}
//@ chunk-e6aww6q8.js:1007476-1007859 placement
/**
 * 破坏性删除目标识别常量：rm 片段正则、PowerShell 删除命令正则、PowerShell 开关名、Windows 盘符正则、可分类的删除类型。
 */
var RM_SEGMENT_RE = /(?:^|[;&|\n])[ \t]*rm[ \t]((?:[^;&|\n\\]|\\.)*?)(?=$|[;&|\n])/g;
var POWERSHELL_REMOVE_RE = /(?:^|[|;&\n({])[ \t]*(?:Remove-Item|rm|del|rd|rmdir|ri)[ \t]+([^|;&\n}]*)/gi;
var POWERSHELL_SWITCHES = new Set(["recurse", "force", "whatif", "confirm", "verbose", "debug"]);
var WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;
var REMOVAL_KINDS = new Set([
  "rm_force",
  "rm_recursive",
  "rm_recursive_force",
  "remove_item_force",
  "remove_item_recursive",
  "remove_item_recursive_force",
]);
//@ chunk-e6aww6q8.js:1007859-1008442 placement
/**
 * 判断破坏性命令的目标范围（无、未知、混合）。
 */
function classifyDestructiveTargetScope(command, n, r) {
  if (r === null || !REMOVAL_KINDS.has(r)) return "none";
  if (n === null) return "unknown";
  if (command.length > 2000) return "unknown";
  try {
    let cwdAfterCd = resolveCwdAfterCd(command, n);
    let rmTargets = extractRmTargets(command);
    let removeItemTargets = extractRemoveItemTargets(command);
    if (rmTargets === null && removeItemTargets === null) return "unknown";
    if (rmTargets === "unknown" || removeItemTargets === "unknown") return "unknown";
    let S = [...(rmTargets ?? []), ...(removeItemTargets ?? [])];
    if (S.length === 0) return "unknown";
    let w = new Set();
    for (let L of S) {
      let G = classifyTargetLocation(L, n, cwdAfterCd);
      if (G === "unknown") return "unknown";
      w.add(G);
    }
    if (w.size > 1) return "mixed";
    return w.values().next().value ?? "unknown";
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `destructive-target-scope parse failed: ${errorMessage(error)}`,
        "destructive-target-scope parse failed",
      ),
    );
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:1008442-1008619 placement
var DIR_CHANGE_RE = /(?:^|[;&|\n({])[ \t]*(?:cd|pushd|popd|Set-Location|Push-Location|Pop-Location)\b/i;
var LEADING_CD_RE = /^[ \t]*(?:cd|pushd)[ \t]+((?:[^;&|\n\\ \t'"`$*?{}()<>]|\\.)+)[ \t]*(?:&&|;|\n)/;
//@ chunk-e6aww6q8.js:1008619-1009074 placement
/**
 * 计算命令开头一串 cd 之后的工作目录（支持 ~ 与相对路径）；含选项、盘符或后续还有 cd 时返回 null。
 */
function resolveCwdAfterCd(e, n) {
  if (!DIR_CHANGE_RE.test(e)) return n;
  let r = n.startsWith("/") ? posix.resolve : resolve_2;
  let s = n;
  let h = e;
  let y = false;
  for (let match = LEADING_CD_RE.exec(h); match !== null; match = LEADING_CD_RE.exec(h)) {
    let w = match[1];
    if (w.startsWith("-") || WINDOWS_DRIVE_RE.test(w)) return null;
    let replaced = w.replace(/\\(.)/g, "$1");
    if (replaced.startsWith("~")) {
      if (replaced !== "~" && !replaced.startsWith("~/")) return null;
      s = replaced;
    } else if (s.startsWith("~")) {
      if (replaced.startsWith("/")) s = r(replaced);
      else s = `${s}/${replaced}`;
    } else s = r(s, replaced);
    h = h.slice(match[0].length);
    y = true;
  }
  if (!y || DIR_CHANGE_RE.test(h)) return null;
  return s;
}
//@ chunk-e6aww6q8.js:1009074-1009530 placement
/**
 * 从 rm 命令片段中提取删除目标（去掉注释与重定向、跳过选项）；需要带短选项且不是 PowerShell 参数，无法分词时返回 unknown。
 */
function extractRmTargets(e) {
  let n = false;
  let r = [];
  for (let s of e.matchAll(RM_SEGMENT_RE)) {
    let h = s[1] ?? "";
    if (!/(?:^|\s)-[a-zA-Z]/.test(h)) continue;
    if (/(?:^|\s)-(Recurse|Force|Path|LiteralPath)\b/i.test(h)) continue;
    n = true;
    let replaced = h
      .replace(/(?:^|\s)#.*$/, "")
      .replace(/\d{0,4}>{1,2}\s*\S*/g, " ")
      .replace(/\d{0,4}<{1,2}\s*\S*/g, " ");
    let S = splitQuotedWords(replaced, true);
    if (S === "unknown") return "unknown";
    let w = false;
    for (let L of S) {
      if (!w && L === "--") {
        w = true;
        continue;
      }
      if (!w && L.startsWith("-")) continue;
      r.push(L);
    }
  }
  return n ? r : null;
}
//@ chunk-e6aww6q8.js:1009530-1010423 placement
/**
 * 从 PowerShell 的 Remove-Item/rm/del 等带 -Recurse/-Force 的调用中提取目标路径（-Path/-LiteralPath 值、位置参数、逗号分隔列表）；含括号表达式时返回 unknown。
 */
function extractRemoveItemTargets(e) {
  let n = false;
  let r = [];
  let s = (h) => {
    if (h.includes(",")) {
      for (let y of h.split(",")) if (y !== "") r.push(y.trim());
    } else r.push(h);
  };
  for (let h of e.matchAll(POWERSHELL_REMOVE_RE)) {
    let y = h[1] ?? "";
    if (!/(?:^|\s)-(Recurse|Force)\b/i.test(y)) continue;
    n = true;
    if (/[()]/.test(y)) return "unknown";
    let replaced = y
      .replace(/(?:^|\s)#.*$/, "")
      .replace(/\*>{1,2}&?\d?\s*\S*/g, " ")
      .replace(/\d{0,4}>{1,2}\s*\S*/g, " ");
    let w = splitQuotedWords(replaced, false);
    if (w === "unknown") return "unknown";
    for (let idx = 0; idx < w.length; idx++) {
      let G = w[idx];
      if (G.startsWith("-")) {
        let index = G.indexOf(":");
        let lower = (index >= 0 ? G.slice(1, index) : G.slice(1)).toLowerCase();
        let Se = index >= 0 ? G.slice(index + 1) : undefined;
        if (lower === "path" || lower === "literalpath") {
          if (Se !== undefined && Se !== "") s(Se);
          else {
            let ke = w[idx + 1];
            if (ke !== undefined && !ke.startsWith("-")) {
              s(ke);
              idx++;
            }
          }
        } else if (Se !== undefined && Se !== "");
        else if (Se === "") {
          if (w[idx + 1] !== undefined && !w[idx + 1].startsWith("-")) idx++;
        } else if (!POWERSHELL_SWITCHES.has(lower)) {
          if (w[idx + 1] !== undefined && !w[idx + 1].startsWith("-")) idx++;
        }
        continue;
      }
      s(G);
    }
  }
  return n ? r : null;
}
//@ chunk-e6aww6q8.js:1010423-1010877 placement
/**
 * 按空白分词并处理单/双引号（可选处理双引号内转义）；遇到反引号或引号未闭合返回 unknown。
 */
function splitQuotedWords(e, n) {
  let r = [];
  let s = "";
  let h = 0;
  while (h < e.length) {
    let y = e[h];
    if (y === " " || y === "\t") {
      if (s !== "") {
        r.push(s);
        s = "";
      }
      h++;
      continue;
    }
    if (y === "`") return "unknown";
    if (y === '"' || y === "'") {
      let S = y;
      h++;
      while (h < e.length && e[h] !== S) {
        if (n && S === '"' && e[h] === "\\" && h + 1 < e.length && '$`"\\\n'.includes(e[h + 1])) {
          s += e[h + 1];
          h += 2;
          continue;
        }
        s += e[h];
        h++;
      }
      if (h >= e.length) return "unknown";
      h++;
      continue;
    }
    if (n && y === "\\" && h + 1 < e.length) {
      s += e[h + 1];
      h += 2;
      continue;
    }
    s += y;
    h++;
  }
  if (s !== "") r.push(s);
  return r;
}
//@ chunk-e6aww6q8.js:1010877-1011860 placement
/**
 * 把删除目标归类为 cwd、tmp、outside_cwd 或 unknown（含命令替换、变量、通配、~user 等无法判定的情况为 unknown）。
 */
function classifyTargetLocation(e, n, cwdAfterCd) {
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
  if (!isAbsolute(e) && !s) {
    if (cwdAfterCd === null) return "unknown";
    if (cwdAfterCd.startsWith("~")) return "outside_cwd";
    let h = cwdAfterCd.startsWith("/") ? posix.resolve(cwdAfterCd, e) : resolve_2(cwdAfterCd, e);
    if (!relative(n, h).startsWith("..")) return "cwd";
    if (isTempPath(h)) return "tmp";
    return "outside_cwd";
  }
  if (!s || WINDOWS_DRIVE_RE.test(n) || n.startsWith("\\\\")) {
    let h = relative(n, e);
    if (h === "" || (!h.startsWith("..") && !isAbsolute(h))) return "cwd";
  }
  if (isTempPath(e)) return "tmp";
  return "outside_cwd";
}
//@ chunk-e6aww6q8.js:1011860-1012064 placement
var MAIN_LIKE_BRANCH_RE =
  /^(main|master|develop|development|trunk|release([/-].*)?|prod(uction)?([/-].*)?|staging([/-].*)?)$/i;
var GIT_DESTRUCTIVE_KINDS = new Set([
  "git_force_push",
  "git_reset_hard",
  "git_branch_force_delete",
  "git_commit_amend",
]);
//@ chunk-e6aww6q8.js:1012064-1012461 placement
/**
 * 对强推、reset --hard、强删分支、amend 等破坏性 git 命令分类其目标（main_like/feature/implicit/bare 等），解析失败记录错误并返回 unknown。
 */
function classifyGitDestructiveTarget(command, destructiveCategory) {
  if (destructiveCategory === null || !GIT_DESTRUCTIVE_KINDS.has(destructiveCategory)) return "none";
  if (command.length > 2000) return "unknown";
  try {
    switch (destructiveCategory) {
      case "git_force_push":
        return classifyForcePushTarget(command);
      case "git_reset_hard":
        return classifyResetHardTarget(command);
      case "git_branch_force_delete":
        return classifyBranchDeleteTarget(command);
      case "git_commit_amend":
        return classifyAmendKind(command);
      default:
        return "none";
    }
  } catch (error) {
    logError(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `git-destructive-target parse failed: ${errorMessage(error)}`,
        "git-destructive-target parse failed",
      ),
    );
    return "unknown";
  }
}
//@ chunk-e6aww6q8.js:1012461-1012517 placement
/**
 * 文本里含 $ 或反引号说明有 shell 展开，分类只能记为 unknown。
 */
function containsShellExpansion(firstMatchingCapture) {
  return firstMatchingCapture.includes("$") || firstMatchingCapture.includes("`");
}
//@ chunk-e6aww6q8.js:1012517-1012611 placement
/**
 * 去掉 refs/heads/ 前缀后判断分支是主干类（main/master 等）还是功能分支。
 */
function classifyBranchName(e) {
  let replaced = e.replace(/^refs\/heads\//, "");
  return MAIN_LIKE_BRANCH_RE.test(replaced) ? "main_like" : "feature";
}
//@ chunk-e6aww6q8.js:1012611-1012698 placement
/**
 * 用正则多次匹配命令文本，返回第一个通过谓词检查的捕获组（用于取 git push/commit 的目标分支）。
 */
function findFirstMatchingCapture(e, n, r) {
  for (let s of e.matchAll(n)) {
    let h = s[1] ?? "";
    if (r(h)) return h;
  }
  return;
}
//@ chunk-e6aww6q8.js:1012698-1013469 placement
/**
 * 分类强制推送的目标分支：解析 git push 的参数与 refspec，判断是否为 main 类分支、功能分支、隐式或无法判定。
 */
function classifyForcePushTarget(e) {
  let firstMatchingCapture = findFirstMatchingCapture(e, /\bgit[ \t]+push\b([^;&|\n]*)/g, (w) =>
    /(?:^|[ \t])(?:--force(?:-with-lease|-if-includes)?|-f)\b/.test(w),
  );
  if (firstMatchingCapture === undefined) return "unknown";
  if (containsShellExpansion(firstMatchingCapture)) return "unknown";
  let r = splitQuotedWords(firstMatchingCapture, true);
  if (r === "unknown") return "unknown";
  let s = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);
  let h = [];
  let y = false;
  for (let idx = 0; idx < r.length; idx++) {
    let L = r[idx];
    if (!y && L === "--") {
      y = true;
      continue;
    }
    if (!y && L.startsWith("-")) {
      let index = L.indexOf("=");
      let q = index >= 0 ? L.slice(0, index) : L;
      if (index < 0 && s.has(q)) idx++;
      continue;
    }
    h.push(L);
  }
  if (h.length <= 1) return "implicit";
  let S = "feature";
  for (let w of h.slice(1)) {
    if (w === "" || /[*?[\]]/.test(w)) return "unknown";
    let replaced = w.replace(/^\+/, "");
    let index = replaced.lastIndexOf(":");
    let q = index >= 0 ? replaced.slice(index + 1) : replaced;
    if (q === "" || q === "HEAD") return "unknown";
    if (classifyBranchName(q) === "main_like") S = "main_like";
  }
  return S;
}
//@ chunk-e6aww6q8.js:1013469-1014046 placement
/**
 * 分类 git reset --hard 的目标：无参数为 bare，HEAD 相对为 head_relative，远程主分支、其他提交或无法判定。
 */
function classifyResetHardTarget(e) {
  let match = e.match(/\bgit[ \t]+reset[ \t]+--hard\b([^;&|\n]*)/);
  if (!match) return "unknown";
  let r = match[1] ?? "";
  if (containsShellExpansion(r)) return "unknown";
  let s = splitQuotedWords(r, true);
  if (s === "unknown") return "unknown";
  let h;
  for (let y of s) {
    if (y === "--") continue;
    if (y.startsWith("-")) continue;
    h = y;
    break;
  }
  if (h === undefined || h === "") return "bare";
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
//@ chunk-e6aww6q8.js:1014046-1014497 placement
/**
 * 分类强制删除分支（-D 或 --delete --force）的目标：只要有 main 类分支即为 main_like，否则按其他分支判断。
 */
function classifyBranchDeleteTarget(e) {
  let firstMatchingCapture = findFirstMatchingCapture(
    e,
    /\bgit[ \t]+branch\b([^;&|\n]*)/g,
    (y) => /(?:^|[ \t])-D\b/.test(y) || (/--delete\b/.test(y) && /--force\b/.test(y)),
  );
  if (firstMatchingCapture === undefined) return "unknown";
  if (containsShellExpansion(firstMatchingCapture)) return "unknown";
  let r = splitQuotedWords(firstMatchingCapture, true);
  if (r === "unknown") return "unknown";
  let s = [];
  let h = false;
  for (let y of r) {
    if (!h && y === "--") {
      h = true;
      continue;
    }
    if (!h && y.startsWith("-")) continue;
    s.push(y);
  }
  if (s.length === 0) return "unknown";
  for (let y of s) if (classifyBranchName(y) === "main_like") return "main_like";
  return "feature";
}
//@ chunk-e6aww6q8.js:1014497-1014747 placement
function classifyAmendKind(e) {
  let firstMatchingCapture = findFirstMatchingCapture(e, /\bgit[ \t]+commit\b([^;&|\n]*)/g, (r) =>
    /--amend\b/.test(r),
  );
  if (firstMatchingCapture === undefined) return "unknown";
  if (/--no-edit\b/.test(firstMatchingCapture)) return "no_edit";
  if (/(?:^|[ \t])-[a-zA-Z]*m\b|--message\b/.test(firstMatchingCapture)) return "with_message";
  return "interactive";
}
//@ chunk-e6aww6q8.js:1014747-1015232 placement
/**
 * 判断路径是否为临时目录（/tmp、/var/tmp、macOS /var/folders、Claude scratchpad、Windows Temp 等）。
 */
function isTempPath(e) {
  if (
    /^\/tmp(?:\/|$)/.test(e) ||
    /^\/var\/tmp(?:\/|$)/.test(e) ||
    /^\/var\/folders\//.test(e) ||
    /^\/private\/tmp(?:\/|$)/.test(e) ||
    /^\/private\/var\/tmp(?:\/|$)/.test(e) ||
    /^\/private\/var\/folders\//.test(e)
  )
    return true;
  if (/[\\/]claude[^\\/]*[\\/](?:[^\\/]+[\\/])+scratchpad(?:[\\/]|$)/i.test(e)) return true;
  let replaced = e.replace(/\//g, "\\");
  if (
    /^[A-Za-z]:\\Temp(?:\\|$)/i.test(replaced) ||
    /^[A-Za-z]:\\Windows\\Temp(?:\\|$)/i.test(replaced) ||
    /\\AppData\\Local\\Temp(?:\\|$)/i.test(replaced)
  )
    return true;
  return false;
}
export {
  getDestructiveTargetCategory,
  classifyDestructiveTargetScope,
  classifyGitDestructiveTarget,
  getDestructiveTargetWarning,
};
