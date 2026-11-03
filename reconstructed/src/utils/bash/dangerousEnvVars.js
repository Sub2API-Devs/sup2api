/**
 * utils/bash/dangerousEnvVars.ts
 *
 * 2.1.316 新增：Shell/git 命令安全检查用的危险环境变量与 git 全局选项模式（CDPATH、GIT_DIR、--git-dir 等）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-0sfjpx19.js (9)
 * attribution: placement 9
 */
import { SHELL_ASSIGNMENT_SUFFIX } from "../attributionFileClasses.js";
import { freeze as freeze_2 } from "../git/gitSafeEnv.js";

//@ chunk-0sfjpx19.js:131202-131264 placement
var SECURITY_GUIDANCE = "security-guidance",
  tA = `${SECURITY_GUIDANCE}@claude-code-marketplace`;
/**
 * 会改变命令解析的环境变量（CDPATH、OLDPWD、FPATH 等）及扩展列表。
 */
//@ chunk-0sfjpx19.js:131264-131610 placement
var PATH_LIKE_ENV_VARS = ["CDPATH", "OLDPWD", "FPATH", "MODULE_PATH"],
  yn = [
    ...PATH_LIKE_ENV_VARS,
    "HOME",
    "PWD",
    "PATH",
    "EXECIGNORE",
    "BASH_CMDS",
    "BASH_ALIASES",
    "XDG_CONFIG_HOME",
  ],
  Pl = ["path", "cdpath", "fpath", "module_path"],
  regExp_2 = new RegExp(`(?:^|[^A-Za-z0-9_])(?:${yn.join("|")})(?![A-Za-z0-9_.-])`),
  regExp_3 = new RegExp(`^(?:${[...yn, ...Pl].join("|")})${SHELL_ASSIGNMENT_SUFFIX}`, "i"),
  regExp_4 = new RegExp(yn.join("|"), "i");
//@ chunk-0sfjpx19.js:131610-131782 placement
var GIT_REDIRECT_ENV_PATTERN =
    "GIT_(?:DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|NAMESPACE|REFERENCE_BACKEND|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG\\w*)",
  regExp_5 = new RegExp(`^${GIT_REDIRECT_ENV_PATTERN}${SHELL_ASSIGNMENT_SUFFIX}`, "i");
//@ chunk-0sfjpx19.js:131782-131919 placement
function buildOptionAbbrevPattern(e, n) {
  let r = "";
  for (let s = e.length - 1; s >= n; s--) r = `(?:${e[s] === "-" ? "-" : e[s]}${r})?`;
  return `${e.slice(0, n)}${r}(?![A-Za-z0-9_-])`;
}
/**
 * 匹配改变 git 仓库/工作树位置的选项（--git-dir、--work-tree、--config-env 等）。
 */
//@ chunk-0sfjpx19.js:131919-132246 placement
var GIT_REDIRECT_OPTION_PATTERN = new RegExp(
    `(?:--git-dir|--work-tree|--namespace|--super-prefix|--config-env)(?![A-Za-z0-9_-])|${buildOptionAbbrevPattern("--separate-git-dir", 4)}`,
    "i",
  ),
  Dl = /(?:core\.worktree|core\.bare|include\.path)(?![A-Za-z0-9_.-])|includeif\./i,
  regExp_6 = new RegExp(`${GIT_REDIRECT_OPTION_PATTERN.source}|${Dl.source}`, "i"),
  regExp_7 = new RegExp(`(?<![A-Za-z0-9_])${GIT_REDIRECT_ENV_PATTERN}(?![A-Za-z0-9_.-])`, "i");
//@ chunk-0sfjpx19.js:132246-132324 placement
var regExp_8 = new RegExp(`(?<![A-Za-z0-9_])(?:${PATH_LIKE_ENV_VARS.join("|")})(?![A-Za-z0-9_])`, "i");
//@ chunk-0sfjpx19.js:132324-132496 placement
var regExp_9 = new RegExp(
  "^(?:GIT_DIR|GIT_WORK_TREE|GIT_INDEX_FILE|GIT_COMMON_DIR|GIT_OBJECT_DIRECTORY|GIT_ALTERNATE_OBJECT_DIRECTORIES|GIT_NAMESPACE|GIT_REFERENCE_BACKEND)$",
  "",
);
//@ chunk-0sfjpx19.js:132496-132588 placement
var regExp_10 = new RegExp(
  `(?:^|[\\s;|&(){}])[-\u2013\u2014\u2015]${buildOptionAbbrevPattern("workingdirectory", 2)}`,
  "i",
);
//@ chunk-0sfjpx19.js:132588-132639 placement
var XT = [...freeze_2, "-c", "safe.bareRepository=explicit"];
