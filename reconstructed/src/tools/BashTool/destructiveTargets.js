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
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1007274-1007385 affinity
/**
 * 返回命令（截取前 10000 字符）命中的第一条破坏性模式；category 用于遥测，warning 显示在权限对话框。
 */
function matchDestructivePattern(command) {
  let head = command.length > 1e4 ? command.slice(0, 1e4) : command;
  for (let entry of DESTRUCTIVE_PATTERNS_2) if (entry.pattern.test(head)) return entry;
  return null;
}
//@ chunk-e6aww6q8.js:1007385-1007430 placement
/**
 * 给出命令的破坏性删除目标警告文本（没有命中返回 null）。
 */
function getDestructiveTargetWarning(command) {
  return matchDestructivePattern(command)?.warning ?? null;
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
var RM_SEGMENT_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var POWERSHELL_REMOVE_RE;
var POWERSHELL_SWITCHES;
var WINDOWS_DRIVE_RE;
var REMOVAL_KINDS;
deferInit("chunk-e6aww6q8.js:1007476", () => {
  RM_SEGMENT_RE = /(?:^|[;&|\n])[ \t]*rm[ \t]((?:[^;&|\n\\]|\\.)*?)(?=$|[;&|\n])/g;
  POWERSHELL_REMOVE_RE = /(?:^|[|;&\n({])[ \t]*(?:Remove-Item|rm|del|rd|rmdir|ri)[ \t]+([^|;&\n}]*)/gi;
  POWERSHELL_SWITCHES = new Set(["recurse", "force", "whatif", "confirm", "verbose", "debug"]);
  WINDOWS_DRIVE_RE = /^[A-Za-z]:[\\/]/;
  REMOVAL_KINDS = new Set([
    "rm_force",
    "rm_recursive",
    "rm_recursive_force",
    "remove_item_force",
    "remove_item_recursive",
    "remove_item_recursive_force",
  ]);
});
//@ chunk-e6aww6q8.js:1007859-1008442 placement
/**
 * 判断破坏性命令的目标范围（无、未知、混合）。
 */
function classifyDestructiveTargetScope(command, cwd, category) {
  if (category === null || !REMOVAL_KINDS.has(category)) return "none";
  if (cwd === null) return "unknown";
  if (command.length > 2000) return "unknown";
  try {
    let cwdAfterCd = resolveCwdAfterCd(command, cwd);
    let rmTargets = extractRmTargets(command);
    let removeItemTargets = extractRemoveItemTargets(command);
    if (rmTargets === null && removeItemTargets === null) return "unknown";
    if (rmTargets === "unknown" || removeItemTargets === "unknown") return "unknown";
    let targets = [...(rmTargets ?? []), ...(removeItemTargets ?? [])];
    if (targets.length === 0) return "unknown";
    let locations = new Set();
    for (let target of targets) {
      let location = classifyTargetLocation(target, cwd, cwdAfterCd);
      if (location === "unknown") return "unknown";
      locations.add(location);
    }
    if (locations.size > 1) return "mixed";
    return locations.values().next().value ?? "unknown";
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
function resolveCwdAfterCd(command, cwd) {
  if (!DIR_CHANGE_RE.test(command)) return cwd;
  let resolve = cwd.startsWith("/") ? posix.resolve : resolve_2;
  let currentDir = cwd;
  let rest = command;
  let sawCd = false;
  for (let match = LEADING_CD_RE.exec(rest); match !== null; match = LEADING_CD_RE.exec(rest)) {
    let target = match[1];
    if (target.startsWith("-") || WINDOWS_DRIVE_RE.test(target)) return null;
    let replaced = target.replace(/\\(.)/g, "$1");
    if (replaced.startsWith("~")) {
      if (replaced !== "~" && !replaced.startsWith("~/")) return null;
      currentDir = replaced;
    } else if (currentDir.startsWith("~")) {
      if (replaced.startsWith("/")) currentDir = resolve(replaced);
      else currentDir = `${currentDir}/${replaced}`;
    } else currentDir = resolve(currentDir, replaced);
    rest = rest.slice(match[0].length);
    sawCd = true;
  }
  if (!sawCd || DIR_CHANGE_RE.test(rest)) return null;
  return currentDir;
}
//@ chunk-e6aww6q8.js:1009074-1009530 placement
/**
 * 从 rm 命令片段中提取删除目标（去掉注释与重定向、跳过选项）；需要带短选项且不是 PowerShell 参数，无法分词时返回 unknown。
 */
function extractRmTargets(command) {
  let sawRm = false;
  let targets = [];
  for (let match of command.matchAll(RM_SEGMENT_RE)) {
    let segmentText = match[1] ?? "";
    if (!/(?:^|\s)-[a-zA-Z]/.test(segmentText)) continue;
    if (/(?:^|\s)-(Recurse|Force|Path|LiteralPath)\b/i.test(segmentText)) continue;
    sawRm = true;
    let replaced = segmentText
      .replace(/(?:^|\s)#.*$/, "")
      .replace(/\d{0,4}>{1,2}\s*\S*/g, " ")
      .replace(/\d{0,4}<{1,2}\s*\S*/g, " ");
    let words = splitQuotedWords(replaced, true);
    if (words === "unknown") return "unknown";
    let afterDoubleDash = false;
    for (let word of words) {
      if (!afterDoubleDash && word === "--") {
        afterDoubleDash = true;
        continue;
      }
      if (!afterDoubleDash && word.startsWith("-")) continue;
      targets.push(word);
    }
  }
  return sawRm ? targets : null;
}
//@ chunk-e6aww6q8.js:1009530-1010423 placement
/**
 * 从 PowerShell 的 Remove-Item/rm/del 等带 -Recurse/-Force 的调用中提取目标路径（-Path/-LiteralPath 值、位置参数、逗号分隔列表）；含括号表达式时返回 unknown。
 */
function extractRemoveItemTargets(command) {
  let sawRemoveItem = false;
  let targets = [];
  let addTargets = (value) => {
    if (value.includes(",")) {
      for (let part of value.split(",")) if (part !== "") targets.push(part.trim());
    } else targets.push(value);
  };
  for (let match of command.matchAll(POWERSHELL_REMOVE_RE)) {
    let segmentText = match[1] ?? "";
    if (!/(?:^|\s)-(Recurse|Force)\b/i.test(segmentText)) continue;
    sawRemoveItem = true;
    if (/[()]/.test(segmentText)) return "unknown";
    let replaced = segmentText
      .replace(/(?:^|\s)#.*$/, "")
      .replace(/\*>{1,2}&?\d?\s*\S*/g, " ")
      .replace(/\d{0,4}>{1,2}\s*\S*/g, " ");
    let words = splitQuotedWords(replaced, false);
    if (words === "unknown") return "unknown";
    for (let idx = 0; idx < words.length; idx++) {
      let word = words[idx];
      if (word.startsWith("-")) {
        let index = word.indexOf(":");
        let lower = (index >= 0 ? word.slice(1, index) : word.slice(1)).toLowerCase();
        let inlineValue = index >= 0 ? word.slice(index + 1) : undefined;
        if (lower === "path" || lower === "literalpath") {
          if (inlineValue !== undefined && inlineValue !== "") addTargets(inlineValue);
          else {
            let nextWord = words[idx + 1];
            if (nextWord !== undefined && !nextWord.startsWith("-")) {
              addTargets(nextWord);
              idx++;
            }
          }
        } else if (inlineValue !== undefined && inlineValue !== "");
        else if (inlineValue === "") {
          if (words[idx + 1] !== undefined && !words[idx + 1].startsWith("-")) idx++;
        } else if (!POWERSHELL_SWITCHES.has(lower)) {
          if (words[idx + 1] !== undefined && !words[idx + 1].startsWith("-")) idx++;
        }
        continue;
      }
      addTargets(word);
    }
  }
  return sawRemoveItem ? targets : null;
}
//@ chunk-e6aww6q8.js:1010423-1010877 placement
/**
 * 按空白分词并处理单/双引号（可选处理双引号内转义）；遇到反引号或引号未闭合返回 unknown。
 */
function splitQuotedWords(text, isPosix) {
  let words = [];
  let current = "";
  let idx = 0;
  while (idx < text.length) {
    let char = text[idx];
    if (char === " " || char === "\t") {
      if (current !== "") {
        words.push(current);
        current = "";
      }
      idx++;
      continue;
    }
    if (char === "`") return "unknown";
    if (char === '"' || char === "'") {
      let quoteChar = char;
      idx++;
      while (idx < text.length && text[idx] !== quoteChar) {
        if (
          isPosix &&
          quoteChar === '"' &&
          text[idx] === "\\" &&
          idx + 1 < text.length &&
          '$`"\\\n'.includes(text[idx + 1])
        ) {
          current += text[idx + 1];
          idx += 2;
          continue;
        }
        current += text[idx];
        idx++;
      }
      if (idx >= text.length) return "unknown";
      idx++;
      continue;
    }
    if (isPosix && char === "\\" && idx + 1 < text.length) {
      current += text[idx + 1];
      idx += 2;
      continue;
    }
    current += char;
    idx++;
  }
  if (current !== "") words.push(current);
  return words;
}
//@ chunk-e6aww6q8.js:1010877-1011860 placement
/**
 * 把删除目标归类为 cwd、tmp、outside_cwd 或 unknown（含命令替换、变量、通配、~user 等无法判定的情况为 unknown）。
 */
function classifyTargetLocation(target, cwd, cwdAfterCd) {
  if (target === "") return "unknown";
  if (target.includes("$(")) return "unknown";
  if (target.includes("`")) return "unknown";
  if (/^\$TMPDIR(?:[\\/]|$)/.test(target)) return "tmp";
  if (/^\$\{TMPDIR\}(?:[\\/]|$)/.test(target)) return "tmp";
  if (/^%TE?MP%(?:[\\/]|$)/i.test(target)) return "tmp";
  if (/^\$env:TE?MP(?:[\\/]|$)/i.test(target)) return "tmp";
  if (target.includes("$")) return "unknown";
  if (/%[^%]+%/.test(target)) return "unknown";
  if (target.startsWith("*") || target.startsWith("?")) return "unknown";
  if (target.includes("{")) return "unknown";
  if (target.startsWith("~"))
    return target === "~" || target.startsWith("~/") || target.startsWith("~\\") ? "outside_cwd" : "unknown";
  let isWindowsPath = WINDOWS_DRIVE_RE.test(target) || target.startsWith("\\\\");
  if (!isAbsolute(target) && !isWindowsPath) {
    if (cwdAfterCd === null) return "unknown";
    if (cwdAfterCd.startsWith("~")) return "outside_cwd";
    let absoluteTarget = cwdAfterCd.startsWith("/")
      ? posix.resolve(cwdAfterCd, target)
      : resolve_2(cwdAfterCd, target);
    if (!relative(cwd, absoluteTarget).startsWith("..")) return "cwd";
    if (isTempPath(absoluteTarget)) return "tmp";
    return "outside_cwd";
  }
  if (!isWindowsPath || WINDOWS_DRIVE_RE.test(cwd) || cwd.startsWith("\\\\")) {
    let relativePath = relative(cwd, target);
    if (relativePath === "" || (!relativePath.startsWith("..") && !isAbsolute(relativePath))) return "cwd";
  }
  if (isTempPath(target)) return "tmp";
  return "outside_cwd";
}
//@ chunk-e6aww6q8.js:1011860-1012064 placement
var MAIN_LIKE_BRANCH_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var GIT_DESTRUCTIVE_KINDS;
deferInit("chunk-e6aww6q8.js:1011860", () => {
  MAIN_LIKE_BRANCH_RE =
    /^(main|master|develop|development|trunk|release([/-].*)?|prod(uction)?([/-].*)?|staging([/-].*)?)$/i;
  GIT_DESTRUCTIVE_KINDS = new Set([
    "git_force_push",
    "git_reset_hard",
    "git_branch_force_delete",
    "git_commit_amend",
  ]);
});
//@ chunk-e6aww6q8.js:1012064-1012461 placement
/**
 * 对强推、reset --hard、强删分支、amend 等破坏性 git 命令分类其目标（main_like/feature/implicit/bare 等），解析失败记录错误并返回 unknown。
 */
function classifyGitDestructiveTarget(command, kind) {
  if (kind === null || !GIT_DESTRUCTIVE_KINDS.has(kind)) return "none";
  if (command.length > 2000) return "unknown";
  try {
    switch (kind) {
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
function containsShellExpansion(text) {
  return text.includes("$") || text.includes("`");
}
//@ chunk-e6aww6q8.js:1012517-1012611 placement
/**
 * 去掉 refs/heads/ 前缀后判断分支是主干类（main/master 等）还是功能分支。
 */
function classifyBranchName(ref) {
  let replaced = ref.replace(/^refs\/heads\//, "");
  return MAIN_LIKE_BRANCH_RE.test(replaced) ? "main_like" : "feature";
}
//@ chunk-e6aww6q8.js:1012611-1012698 placement
/**
 * 用正则多次匹配命令文本，返回第一个通过谓词检查的捕获组（用于取 git push/commit 的目标分支）。
 */
function findFirstMatchingCapture(text, pattern, accepts) {
  for (let match of text.matchAll(pattern)) {
    let captured = match[1] ?? "";
    if (accepts(captured)) return captured;
  }
  return;
}
//@ chunk-e6aww6q8.js:1012698-1013469 placement
/**
 * 分类强制推送的目标分支：解析 git push 的参数与 refspec，判断是否为 main 类分支、功能分支、隐式或无法判定。
 */
function classifyForcePushTarget(command) {
  let text = findFirstMatchingCapture(command, /\bgit[ \t]+push\b([^;&|\n]*)/g, (argsText) =>
    /(?:^|[ \t])(?:--force(?:-with-lease|-if-includes)?|-f)\b/.test(argsText),
  );
  if (text === undefined) return "unknown";
  if (containsShellExpansion(text)) return "unknown";
  let words = splitQuotedWords(text, true);
  if (words === "unknown") return "unknown";
  let valueTakingFlags = new Set(["-o", "--push-option", "--repo", "--receive-pack", "--exec"]);
  let operands = [];
  let afterDoubleDash = false;
  for (let idx = 0; idx < words.length; idx++) {
    let word = words[idx];
    if (!afterDoubleDash && word === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (!afterDoubleDash && word.startsWith("-")) {
      let index = word.indexOf("=");
      let flagName = index >= 0 ? word.slice(0, index) : word;
      if (index < 0 && valueTakingFlags.has(flagName)) idx++;
      continue;
    }
    operands.push(word);
  }
  if (operands.length <= 1) return "implicit";
  let result = "feature";
  for (let spec of operands.slice(1)) {
    if (spec === "" || /[*?[\]]/.test(spec)) return "unknown";
    let replaced = spec.replace(/^\+/, "");
    let index = replaced.lastIndexOf(":");
    let branch = index >= 0 ? replaced.slice(index + 1) : replaced;
    if (branch === "" || branch === "HEAD") return "unknown";
    if (classifyBranchName(branch) === "main_like") result = "main_like";
  }
  return result;
}
//@ chunk-e6aww6q8.js:1013469-1014046 placement
/**
 * 分类 git reset --hard 的目标：无参数为 bare，HEAD 相对为 head_relative，远程主分支、其他提交或无法判定。
 */
function classifyResetHardTarget(command) {
  let match = command.match(/\bgit[ \t]+reset[ \t]+--hard\b([^;&|\n]*)/);
  if (!match) return "unknown";
  let argsText = match[1] ?? "";
  if (containsShellExpansion(argsText)) return "unknown";
  let words = splitQuotedWords(argsText, true);
  if (words === "unknown") return "unknown";
  let target;
  for (let word of words) {
    if (word === "--") continue;
    if (word.startsWith("-")) continue;
    target = word;
    break;
  }
  if (target === undefined || target === "") return "bare";
  if (/^(HEAD|@)([~^].*)?$/.test(target) || /^(HEAD|@)@\{.*\}$/.test(target)) return "head_relative";
  if (/^[A-Z_]+_HEAD$/.test(target)) return "head_relative";
  if (
    /^(origin|upstream)\//.test(target) ||
    /^refs\/remotes\//.test(target) ||
    /^[A-Za-z0-9_.-]+\/(main|master)$/.test(target)
  )
    return "remote_ref";
  return "other";
}
//@ chunk-e6aww6q8.js:1014046-1014497 placement
/**
 * 分类强制删除分支（-D 或 --delete --force）的目标：只要有 main 类分支即为 main_like，否则按其他分支判断。
 */
function classifyBranchDeleteTarget(command) {
  let text = findFirstMatchingCapture(
    command,
    /\bgit[ \t]+branch\b([^;&|\n]*)/g,
    (argsText) =>
      /(?:^|[ \t])-D\b/.test(argsText) || (/--delete\b/.test(argsText) && /--force\b/.test(argsText)),
  );
  if (text === undefined) return "unknown";
  if (containsShellExpansion(text)) return "unknown";
  let words = splitQuotedWords(text, true);
  if (words === "unknown") return "unknown";
  let branches = [];
  let afterDoubleDash = false;
  for (let word of words) {
    if (!afterDoubleDash && word === "--") {
      afterDoubleDash = true;
      continue;
    }
    if (!afterDoubleDash && word.startsWith("-")) continue;
    branches.push(word);
  }
  if (branches.length === 0) return "unknown";
  for (let branch of branches) if (classifyBranchName(branch) === "main_like") return "main_like";
  return "feature";
}
//@ chunk-e6aww6q8.js:1014497-1014747 placement
function classifyAmendKind(command) {
  let firstMatchingCapture = findFirstMatchingCapture(
    command,
    /\bgit[ \t]+commit\b([^;&|\n]*)/g,
    (argsText) => /--amend\b/.test(argsText),
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
function isTempPath(path) {
  if (
    /^\/tmp(?:\/|$)/.test(path) ||
    /^\/var\/tmp(?:\/|$)/.test(path) ||
    /^\/var\/folders\//.test(path) ||
    /^\/private\/tmp(?:\/|$)/.test(path) ||
    /^\/private\/var\/tmp(?:\/|$)/.test(path) ||
    /^\/private\/var\/folders\//.test(path)
  )
    return true;
  if (/[\\/]claude[^\\/]*[\\/](?:[^\\/]+[\\/])+scratchpad(?:[\\/]|$)/i.test(path)) return true;
  let replaced = path.replace(/\//g, "\\");
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
