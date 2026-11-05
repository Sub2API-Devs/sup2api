/**
 * tools/BashTool/bgWorktreeGuard/shellState.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的 shell 程序分析入口与解析失败判定。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-h2y5xkdx.js (14)
 * attribution: placement 14
 */
import { TOO_COMPLEX_SUFFIX, analyzeAssignment, STAT_VALUE_NOTE, DATE_VALUE_NOTE } from "./wordValues.js";
import { MAX_SSH_TEXT_CHARS, programBaseName } from "./commandRules.js";
import { withStdinState } from "./statementWalk.js";
import { DECLARATION_BUILTINS } from "./commandTables.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";

//@ chunk-h2y5xkdx.js:4125-4156 placement
/**
 * 对一条 shell 命令（tree-sitter AST）做后台 worktree 守卫分析：返回拒绝原因文本或 null。
 */
function analyzeCommandForWorktree(tree) {
  return analyzeShellProgram(tree, false);
}
//@ chunk-h2y5xkdx.js:4156-4226 placement
function analyzeSimpleCommandForWorktree(tree) {
  return analyzeShellProgram(tree, true)?.replace(TOO_COMPLEX_SUFFIX, "in a plain command") ?? null;
}
//@ chunk-h2y5xkdx.js:4226-4409 placement
function isParseFailureNode(analysis) {
  return (
    analysis.nodeType === undefined ||
    analysis.nodeType === "PARSE_ABORT" ||
    analysis.nodeType === "ERROR" ||
    (analysis.differential === true &&
      !/^(?:heredoc_redirect|concatenation|word|string)$/.test(analysis.nodeType))
  );
}
//@ chunk-h2y5xkdx.js:4409-5126 placement
/**
 * 建立分析状态（变量种类、整数/数组名、绑定位置、cwd 等）并遍历整棵语法树，产出第一条拒绝原因。
 */
function analyzeShellProgram(tree, simple) {
  let state = {
    simple,
    kinds: new Map(),
    integerNames: new Set(),
    arrayNames: new Set(),
    bindingSites: new Map(),
    optionSafeNames: new Map(),
    pathNames: new Set(),
    opaqueNames: false,
    shellFilledWord: null,
    shellSetNameWord: null,
    statPathDenied: false,
    dateDirectiveDenied: false,
    pathAssigned: false,
    startupHazards: new Map(),
    allExported: false,
    stdinFed: false,
    pipedFrom: undefined,
    inputAssembled: false,
    cwd: ".",
    opaqueCwd: false,
    deviceLinked: false,
    scopes: [new Map()],
    depth: 0,
    sshTextBudget: {
      left: MAX_SSH_TEXT_CHARS,
    },
  };
  state.pathAssigned = /(?:^|\W)(?:PATH|LD_\w*|DYLD_\w*)(?:\[[^\]]*\])?[+:]?=/i.test(tree.text);
  analyzeAssignment(tree, state, false);
  state.opaqueNames ||= [...state.kinds.values()].includes("other");
  let reason = withStdinState(tree, state, false);
  return reason && / arithmetically |command output/.test(reason)
    ? reason +
        (state.statPathDenied ? STAT_VALUE_NOTE : "") +
        (state.dateDirectiveDenied ? DATE_VALUE_NOTE : "")
    : reason;
}
//@ chunk-h2y5xkdx.js:5126-5266 placement
/**
 * “该值可静态确定且可安全当选项”的标志对象，与 DYNAMIC_VALUE_FLAGS 相对。
 */
var DYNAMIC_VALUE_FLAGS = {
  integer: false,
  inert: false,
  arithmeticSafe: false,
  optionSafe: false,
  written: false,
};
var STATIC_VALUE_FLAGS = {
  integer: true,
  inert: true,
  arithmeticSafe: true,
  optionSafe: true,
  written: false,
};
//@ chunk-h2y5xkdx.js:5266-5318 placement
function wordSet(words) {
  return new Set(words.trim().split(/\s+/));
}
//@ chunk-h2y5xkdx.js:5318-5488 placement
/**
 * 匹配“整词就是一个变量引用”（$name、${name}，可带引号）。
 */
var SHELL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/;
var SINGLE_VAR_REF_RE = /^("?)\$(?:([A-Za-z_]\w*)|\{([A-Za-z_]\w*)\})\1$/;
var SAFE_PATH_TOKEN_RE = /^[A-Za-z0-9_.\/+:@~][A-Za-z0-9_.\/+:@~-]*$/;
var PLAIN_TEXT_RE = /^[A-Za-z0-9 _.,:\/=+@%^~#-]*$/;
//@ chunk-h2y5xkdx.js:5488-5636 placement
function isPlainWordText(text) {
  return text
    .split(
      `
`,
    )
    .every(
      (line) =>
        PLAIN_TEXT_RE.test(line) &&
        line.split(/\s+/).every((word) => {
          let programName = programBaseName(word.replace(/^.*=/, ""));
          return !GIT_COMMAND_PATTERN.test(programName) && !DECLARATION_BUILTINS.has(programName);
        }),
    );
}
//@ chunk-h2y5xkdx.js:5636-6547 placement
/**
 * 影响 git 位置或全局配置的环境变量（GIT_*、HOME、CDPATH、XDG_CONFIG_HOME）。
 */
var GIT_COMMAND_PATTERN = /^git(?:\.exe|\.real|-[a-z][\w-]*)?$/i;
var GIT_LOCATION_ENV_RE = /^(?:GIT_\w*|HOME|CDPATH|XDG_CONFIG_HOME)$/i;
var SHELL_STATE_SETTING_VARIABLES =
  /^(?:BASH_ALIASES|BASH_CMDS|SHELLOPTS|BASHOPTS|PWD|OLDPWD|DIRSTACK|dirstack|options|commands|nameddirs|(?:dis_)?(?:functions(?:_source)?|[gs]?aliases|builtins|reswords))$/;
var SHELL_SPECIAL_VARIABLES =
  /^(?:_|REPLY|OPTARG|MAPFILE|COPROC|BASH_REMATCH|BASH_COMMAND|BASH_ARGV|BASH_SOURCE|FUNCNAME|DIRSTACK|PWD|OLDPWD|READLINE_\w+|COMP_\w+)$/;
var ZSH_SPECIAL_VARIABLES = /^(?:MATCH|match|MBEGIN|MEND|mbegin|mend|argv|reply)$/;
var PATH_LIKE_VARIABLES_RE = /^(?:(?:cd|f|man|module_|mail)?path)$/i;
var SAFE_QUOTED_TEXT_RE = /^[\s0-9A-Za-z_+\-*\/%()<>=!&|^~?:,#]*$/;
var ZSH_MANAGED_VARIABLES =
  /^(?:jobtexts|jobdirs|history|historywords|funcstack|functrace|funcfiletrace|funcsourcetrace|zsh_scheduled_events|keymaps|widgets|modules|zcurses_windows|zgdbm_tied|mapfile|terminfo|termcap|langinfo|dis_patchars|ZFTP_(?:SESSION|HOST|USER|ACCOUNT|PWD|SYSTEM|REPLY|FILE)|ZSH_DEBUG_CMD|ZSH_EXECUTION_STRING|BASH_EXECUTION_STRING)$/;
var TENGU_MOSSY_KESTREL = "tengu_mossy_kestrel";
//@ chunk-h2y5xkdx.js:6547-6611 placement
function isStartupHazardVariable(name) {
  return (
    (ZSH_MANAGED_VARIABLES.test(name) || SHELL_STATE_SETTING_VARIABLES.test(name)) &&
    readFlagWithOverride(TENGU_MOSSY_KESTREL, {
      safe: true,
    })
  );
}
//@ chunk-h2y5xkdx.js:6611-6716 placement
var COMPLETION_VARIABLE_PATTERN =
  /^(?:COMP_(?:CWORD|KEY|LINE|POINT|TYPE|WORDBREAKS|WORDS)|READLINE_(?:ARGUMENT|LINE|MARK|POINT))$/;
//@ chunk-h2y5xkdx.js:6716-6842 placement
function isShellManagedVariable(name) {
  let upper = name.toUpperCase();
  return (
    (SHELL_SPECIAL_VARIABLES.test(upper) &&
      (!/^(?:COMP|READLINE)_/.test(upper) || COMPLETION_VARIABLE_PATTERN.test(upper))) ||
    upper === "MATCH" ||
    upper === "ARGV"
  );
}
//@ chunk-h2y5xkdx.js:6842-6920 placement
var SHELL_AUTO_VARIABLES = /^(?:RANDOM|SECONDS|LINENO|PPID|SHLVL|OPTIND)$/;
var TENGU_EAGER_CHARM = "tengu_eager_charm";
//@ chunk-h2y5xkdx.js:6920-6958 placement
/**
 * 读取 tengu_eager_charm 开关：是否追踪 shell 自身设置的变量名（用于整数变量与 for 循环绑定分析）。
 */
function isEagerShellSetScreeningEnabled() {
  return readFlagWithOverride(TENGU_EAGER_CHARM, {
    safe: true,
  });
}
export {
  wordSet,
  isStartupHazardVariable,
  SHELL_SPECIAL_VARIABLES,
  isShellManagedVariable,
  isEagerShellSetScreeningEnabled,
  isPlainWordText,
  SHELL_NAME_PATTERN,
  DYNAMIC_VALUE_FLAGS,
  STATIC_VALUE_FLAGS,
  PATH_LIKE_VARIABLES_RE,
  ZSH_SPECIAL_VARIABLES,
  SHELL_AUTO_VARIABLES,
  PLAIN_TEXT_RE,
  SINGLE_VAR_REF_RE,
  SAFE_QUOTED_TEXT_RE,
  SAFE_PATH_TOKEN_RE,
  GIT_LOCATION_ENV_RE,
  GIT_COMMAND_PATTERN,
  SHELL_STATE_SETTING_VARIABLES,
  isParseFailureNode,
  analyzeCommandForWorktree,
  analyzeSimpleCommandForWorktree,
};
