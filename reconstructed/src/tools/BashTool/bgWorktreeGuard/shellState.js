/**
 * tools/BashTool/bgWorktreeGuard/shellState.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的 shell 程序分析入口与解析失败判定。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63f0f3kd.js (14)
 * attribution: placement 14
 */
import { TOO_COMPLEX_SUFFIX, analyzeAssignment, STAT_VALUE_NOTE, DATE_VALUE_NOTE } from "./wordValues.js";
import { withStdinState } from "./statementWalk.js";
import { programBaseName } from "./commandRules.js";
import { DECLARATION_BUILTINS } from "./commandTables.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";

/**
 * 对一条 shell 命令（tree-sitter AST）做后台 worktree 守卫分析：返回拒绝原因文本或 null。
 */
//@ chunk-63f0f3kd.js:3787-3818 placement
function analyzeCommandForWorktree(t) {
  return analyzeShellProgram(t, !1);
}
//@ chunk-63f0f3kd.js:3818-3888 placement
function analyzeSimpleCommandForWorktree(t) {
  return analyzeShellProgram(t, !0)?.replace(TOO_COMPLEX_SUFFIX, "in a plain command") ?? null;
}
//@ chunk-63f0f3kd.js:3888-4071 placement
function isParseFailureNode(t) {
  return (
    t.nodeType === void 0 ||
    t.nodeType === "PARSE_ABORT" ||
    t.nodeType === "ERROR" ||
    (t.differential === !0 && !/^(?:heredoc_redirect|concatenation|word|string)$/.test(t.nodeType))
  );
}
/**
 * 建立分析状态（变量种类、整数/数组名、绑定位置、cwd 等）并遍历整棵语法树，产出第一条拒绝原因。
 */
//@ chunk-63f0f3kd.js:4071-4764 placement
function analyzeShellProgram(t, e) {
  let i = {
    simple: e,
    kinds: new Map(),
    integerNames: new Set(),
    arrayNames: new Set(),
    bindingSites: new Map(),
    optionSafeNames: new Map(),
    pathNames: new Set(),
    opaqueNames: !1,
    shellFilledWord: null,
    shellSetNameWord: null,
    statPathDenied: !1,
    dateDirectiveDenied: !1,
    pathAssigned: !1,
    startupHazards: new Map(),
    allExported: !1,
    stdinFed: !1,
    pipedFrom: void 0,
    inputAssembled: !1,
    cwd: ".",
    opaqueCwd: !1,
    deviceLinked: !1,
    scopes: [new Map()],
    depth: 0,
  };
  ((i.pathAssigned = /(?:^|\W)(?:PATH|LD_\w*|DYLD_\w*)(?:\[[^\]]*\])?[+:]?=/i.test(t.text)),
    analyzeAssignment(t, i, !1),
    (i.opaqueNames ||= [...i.kinds.values()].includes("other")));
  let n = withStdinState(t, i, !1);
  return n && / arithmetically |command output/.test(n)
    ? n + (i.statPathDenied ? STAT_VALUE_NOTE : "") + (i.dateDirectiveDenied ? DATE_VALUE_NOTE : "")
    : n;
}
//@ chunk-63f0f3kd.js:4764-4904 placement
var DYNAMIC_VALUE_FLAGS = { integer: !1, inert: !1, arithmeticSafe: !1, optionSafe: !1, written: !1 },
  zt = { integer: !0, inert: !0, arithmeticSafe: !0, optionSafe: !0, written: !1 };
//@ chunk-63f0f3kd.js:4904-4956 placement
function wordSet(t) {
  return new Set(t.trim().split(/\s+/));
}
//@ chunk-63f0f3kd.js:4956-5126 placement
var SHELL_NAME_PATTERN = /^[A-Za-z_][A-Za-z0-9_]*$/,
  Pe = /^("?)\$(?:([A-Za-z_]\w*)|\{([A-Za-z_]\w*)\})\1$/,
  Dn = /^[A-Za-z0-9_.\/+:@~][A-Za-z0-9_.\/+:@~-]*$/,
  Wt = /^[A-Za-z0-9 _.,:\/=+@%^~#-]*$/;
//@ chunk-63f0f3kd.js:5126-5273 placement
function isPlainWordText(t) {
  return t
    .split(
      `
`,
    )
    .every(
      (e) =>
        Wt.test(e) &&
        e.split(/\s+/).every((i) => {
          let n = programBaseName(i.replace(/^.*=/, ""));
          return !GIT_COMMAND_PATTERN.test(n) && !DECLARATION_BUILTINS.has(n);
        }),
    );
}
//@ chunk-63f0f3kd.js:5273-6183 placement
var GIT_COMMAND_PATTERN = /^git(?:\.exe|\.real|-[a-z][\w-]*)?$/i,
  me = /^(?:GIT_\w*|HOME|CDPATH|XDG_CONFIG_HOME)$/i,
  Ce =
    /^(?:BASH_ALIASES|BASH_CMDS|SHELLOPTS|BASHOPTS|PWD|OLDPWD|DIRSTACK|dirstack|options|commands|nameddirs|(?:dis_)?(?:functions(?:_source)?|[gs]?aliases|builtins|reswords))$/,
  ft =
    /^(?:_|REPLY|OPTARG|MAPFILE|COPROC|BASH_REMATCH|BASH_COMMAND|BASH_ARGV|BASH_SOURCE|FUNCNAME|DIRSTACK|PWD|OLDPWD|READLINE_\w+|COMP_\w+)$/,
  Ts = /^(?:MATCH|match|MBEGIN|MEND|mbegin|mend|argv|reply)$/,
  Pn = /^(?:(?:cd|f|man|module_|mail)?path)$/i,
  Rs = /^[\s0-9A-Za-z_+\-*\/%()<>=!&|^~?:,#]*$/,
  ks =
    /^(?:jobtexts|jobdirs|history|historywords|funcstack|functrace|funcfiletrace|funcsourcetrace|zsh_scheduled_events|keymaps|widgets|modules|zcurses_windows|zgdbm_tied|mapfile|terminfo|termcap|langinfo|dis_patchars|ZFTP_(?:SESSION|HOST|USER|ACCOUNT|PWD|SYSTEM|REPLY|FILE)|ZSH_DEBUG_CMD|ZSH_EXECUTION_STRING|BASH_EXECUTION_STRING)$/,
  TENGU_MOSSY_KESTREL = "tengu_mossy_kestrel";
//@ chunk-63f0f3kd.js:6183-6247 placement
function isStartupHazardVariable(t) {
  return (ks.test(t) || Ce.test(t)) && readFlagWithOverride(TENGU_MOSSY_KESTREL, { safe: !0 });
}
//@ chunk-63f0f3kd.js:6247-6352 placement
var COMPLETION_VARIABLE_PATTERN =
  /^(?:COMP_(?:CWORD|KEY|LINE|POINT|TYPE|WORDBREAKS|WORDS)|READLINE_(?:ARGUMENT|LINE|MARK|POINT))$/;
//@ chunk-63f0f3kd.js:6352-6478 placement
function isShellManagedVariable(t) {
  let upper = t.toUpperCase();
  return (
    (ft.test(upper) && (!/^(?:COMP|READLINE)_/.test(upper) || COMPLETION_VARIABLE_PATTERN.test(upper))) ||
    upper === "MATCH" ||
    upper === "ARGV"
  );
}
//@ chunk-63f0f3kd.js:6478-6556 placement
var SHELL_AUTO_VARIABLES = /^(?:RANDOM|SECONDS|LINENO|PPID|SHLVL|OPTIND)$/,
  TENGU_EAGER_CHARM = "tengu_eager_charm";
//@ chunk-63f0f3kd.js:6556-6594 placement
function ve() {
  return readFlagWithOverride(TENGU_EAGER_CHARM, { safe: !0 });
}

export {
  wordSet,
  isStartupHazardVariable,
  ft,
  isShellManagedVariable,
  ve,
  isPlainWordText,
  SHELL_NAME_PATTERN,
  DYNAMIC_VALUE_FLAGS,
  zt,
  Pn,
  Ts,
  SHELL_AUTO_VARIABLES,
  Wt,
  Pe,
  Rs,
  Dn,
  me,
  GIT_COMMAND_PATTERN,
  Ce,
  isParseFailureNode,
  analyzeCommandForWorktree,
  analyzeSimpleCommandForWorktree,
};
