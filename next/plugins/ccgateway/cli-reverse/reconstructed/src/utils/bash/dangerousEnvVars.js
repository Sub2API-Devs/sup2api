/**
 * utils/bash/dangerousEnvVars.ts
 *
 * 2.1.316 新增：Shell/git 命令安全检查用的危险环境变量与 git 全局选项模式（CDPATH、GIT_DIR、--git-dir 等）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-nh1pvp1m.js (9)
 * attribution: placement 9
 */
import { SHELL_ASSIGNMENT_SUFFIX } from "../attributionFileClasses.js";
import { GIT_SAFE_GLOBAL_ARGS } from "../git/gitSafeEnv.js";

//@ chunk-nh1pvp1m.js:126208-126270 placement
/**
 * 安全指引插件在全名（security-guidance@claude-code-marketplace）。
 */
var SECURITY_GUIDANCE = "security-guidance";
var SECURITY_GUIDANCE_PLUGIN = `${SECURITY_GUIDANCE}@claude-code-marketplace`;
//@ chunk-nh1pvp1m.js:126270-126616 placement
/**
 * 会改变命令解析的环境变量列表（CDPATH、OLDPWD、PATH、BASH_CMDS 等）。
 */
var PATH_LIKE_ENV_VARS = ["CDPATH", "OLDPWD", "FPATH", "MODULE_PATH"];
var DANGEROUS_ENV_VARS = [
  ...PATH_LIKE_ENV_VARS,
  "HOME",
  "PWD",
  "PATH",
  "EXECIGNORE",
  "BASH_CMDS",
  "BASH_ALIASES",
  "XDG_CONFIG_HOME",
];
var DANGEROUS_ENV_VARS_LOWER = ["path", "cdpath", "fpath", "module_path"];
var regExp_2 = new RegExp(`(?:^|[^A-Za-z0-9_])(?:${DANGEROUS_ENV_VARS.join("|")})(?![A-Za-z0-9_.-])`);
var regExp_3 = new RegExp(
  `^(?:${[...DANGEROUS_ENV_VARS, ...DANGEROUS_ENV_VARS_LOWER].join("|")})${SHELL_ASSIGNMENT_SUFFIX}`,
  "i",
);
var regExp_4 = new RegExp(DANGEROUS_ENV_VARS.join("|"), "i");
//@ chunk-nh1pvp1m.js:126616-126788 placement
var GIT_REDIRECT_ENV_PATTERN =
  "GIT_(?:DIR|WORK_TREE|INDEX_FILE|COMMON_DIR|NAMESPACE|REFERENCE_BACKEND|OBJECT_DIRECTORY|ALTERNATE_OBJECT_DIRECTORIES|CONFIG\\w*)";
var regExp_5 = new RegExp(`^${GIT_REDIRECT_ENV_PATTERN}${SHELL_ASSIGNMENT_SUFFIX}`, "i");
//@ chunk-nh1pvp1m.js:126788-126925 placement
function buildOptionAbbrevPattern(optionName, prefixLength) {
  let pattern = "";
  for (let j = optionName.length - 1; j >= prefixLength; j--)
    pattern = `(?:${optionName[j] === "-" ? "-" : optionName[j]}${pattern})?`;
  return `${optionName.slice(0, prefixLength)}${pattern}(?![A-Za-z0-9_-])`;
}
//@ chunk-nh1pvp1m.js:126925-127252 placement
/**
 * 会改变仓库位置的 git 配置键（core.worktree、core.bare、include.path、includeIf）。
 */
var GIT_REDIRECT_OPTION_PATTERN = new RegExp(
  `(?:--git-dir|--work-tree|--namespace|--super-prefix|--config-env)(?![A-Za-z0-9_-])|${buildOptionAbbrevPattern("--separate-git-dir", 4)}`,
  "i",
);
var GIT_REDIRECT_CONFIG_KEYS = /(?:core\.worktree|core\.bare|include\.path)(?![A-Za-z0-9_.-])|includeif\./i;
var regExp_6 = new RegExp(`${GIT_REDIRECT_OPTION_PATTERN.source}|${GIT_REDIRECT_CONFIG_KEYS.source}`, "i");
var regExp_7 = new RegExp(`(?<![A-Za-z0-9_])${GIT_REDIRECT_ENV_PATTERN}(?![A-Za-z0-9_.-])`, "i");
//@ chunk-nh1pvp1m.js:127252-127330 placement
var regExp_8 = new RegExp(`(?<![A-Za-z0-9_])(?:${PATH_LIKE_ENV_VARS.join("|")})(?![A-Za-z0-9_])`, "i");
//@ chunk-nh1pvp1m.js:127330-127502 placement
var regExp_9 = new RegExp(
  "^(?:GIT_DIR|GIT_WORK_TREE|GIT_INDEX_FILE|GIT_COMMON_DIR|GIT_OBJECT_DIRECTORY|GIT_ALTERNATE_OBJECT_DIRECTORIES|GIT_NAMESPACE|GIT_REFERENCE_BACKEND)$",
  "",
);
//@ chunk-nh1pvp1m.js:127502-127594 placement
var regExp_10 = new RegExp(
  `(?:^|[\\s;|&(){}])[-\u2013\u2014\u2015]${buildOptionAbbrevPattern("workingdirectory", 2)}`,
  "i",
);
//@ chunk-nh1pvp1m.js:127594-127645 placement
/**
 * 安全的 git 前缀参数（冻结参数加 safe.bareRepository=explicit）。
 */
var SAFE_GIT_BASE_ARGS = [...GIT_SAFE_GLOBAL_ARGS, "-c", "safe.bareRepository=explicit"];
