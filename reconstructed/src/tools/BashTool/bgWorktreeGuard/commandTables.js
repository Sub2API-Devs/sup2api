/**
 * tools/BashTool/bgWorktreeGuard/commandTables.ts
 *
 * 2.1.316 新增：后台 worktree 守卫的命令表：shell 选项、grep/rg 参数、sed 正则、设备路径。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-63f0f3kd.js (22)
 * attribution: placement 22
 */
import { posix } from "path";
import {
  SHELL_PROGRAM_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
  AWK_NAMES,
  SET_O_SAFE_OPTS,
} from "../../../utils/bash/ast.js";
import { wordSet } from "./shellState.js";
import { readFlagWithOverride } from "../../../services/analytics/flagOverrides.js";
import { deferInit } from "../../../../runtime/deferred-init.js";

//@ chunk-63f0f3kd.js:6594-6804 placement
/**
 * 透明启动器命令名（不会改变实际执行的命令）。
 */
var DECLARATION_BUILTINS; // deferred: uses POSIX_SHELL_NAMES (../../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var TRANSPARENT_LAUNCHERS;
var COMMAND_PREFIX_WORDS;
var REMOTE_SESSION_PROGRAMS;
var NAMESPACE_WRAPPER_RE;
deferInit("chunk-63f0f3kd.js:6594", () => {
  DECLARATION_BUILTINS = new Set([
    ...SHELL_PROGRAM_NAMES,
    ...wordSet("export declare typeset local readonly"),
  ]);
  TRANSPARENT_LAUNCHERS = TRANSPARENT_LAUNCHER_NAMES;
  COMMAND_PREFIX_WORDS = wordSet("command builtin time noglob nocorrect");
  REMOTE_SESSION_PROGRAMS = wordSet("ssh rlogin scp rcp sftp rsync kubectl oc gcloud");
  NAMESPACE_WRAPPER_RE = /^(?:unshare|nsenter|wsl)$/;
});
//@ chunk-63f0f3kd.js:6804-7213 placement
function devicePathOf(pathText) {
  let replaced = pathText.replace(/^(?:(?:-[^=/]*|\w[\w.-]*)=|-[A-Za-z](?=\.*\/))/, "");
  let matches = /^file:/i.test(replaced);
  if (matches)
    try {
      replaced = new URL(replaced).pathname.replace(/%([0-9a-f]{2})/gi, (match, hexDigits) =>
        String.fromCharCode(parseInt(hexDigits, 16)),
      );
    } catch {
      replaced = "/dev/stdin";
    }
  let lower = posix.normalize(replaced).toLowerCase();
  return lower === "-" ||
    (matches && lower.includes("%")) ||
    (/^(?:\/|(?:\.\.\/)+)(?:dev|proc)(?:\/|$)/.test(lower) &&
      !/^\/dev\/(?:null|zero|full|u?random|tty)$/.test(lower))
    ? lower
    : null;
}
//@ chunk-63f0f3kd.js:7213-7247 placement
function isDevicePath(pathText) {
  return devicePathOf(pathText) !== null;
}
//@ chunk-63f0f3kd.js:7247-7332 placement
function isStdinLikeDevicePath(pathText) {
  return /\/(?:stdin|(?:tcp|udp)\/.*|fd\/(?![12]$)\d+)$/.test(devicePathOf(pathText) ?? "");
}
//@ chunk-63f0f3kd.js:7332-7415 placement
function isOpaquePathArgument(arg, state) {
  return (
    isDevicePath(resolveAgainstCwd(arg, state)) ||
    state.deviceLinked ||
    (state.opaqueCwd && !/^[\/~]/.test(arg))
  );
}
//@ chunk-63f0f3kd.js:7415-7497 placement
function resolveAgainstCwd(arg, state) {
  return /^[\/~]/.test(arg) || !state.cwd.startsWith("/") ? arg : `${state.cwd}/${arg}`;
}
//@ chunk-63f0f3kd.js:7497-8485 placement
/**
 * 以 exec/nocorrect 开头的命令集合（会被单独识别）。
 */
var SHELL_COMMAND_FLAG_PATTERN; // deferred: uses EVAL_LIKE_BUILTINS (../../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var EXEC_LIKE_COMMANDS;
var KNOWN_PROGRAMS;
var SHELL_BUILTIN_ARG_COMMANDS;
var ARG_SENSITIVE_COMMANDS;
var STRING_EXEC_COMMANDS;
var SAFE_SET_O_OPTIONS_RE;
var TENGU_SERENE_POSSUM;
deferInit("chunk-63f0f3kd.js:7497", () => {
  SHELL_COMMAND_FLAG_PATTERN = /^(?:-[a-zA-Z]*c|--command|--session-command|\/c)$/i;
  EXEC_LIKE_COMMANDS = new Set(["exec", "nocorrect"]);
  KNOWN_PROGRAMS = new Set([
    ...AWK_NAMES,
    ...wordSet(`echo printf cat ls cp mv ln mkdir touch rm rmdir chmod head tail
  wc sort uniq tr cut paste column tee rev tac nl fold comm join expand
  unexpand type basename dirname realpath
  readlink stat du df file date sleep true false : cd pwd seq yes printenv id
  whoami uname which kill pkill pgrep ps diff cmp md5sum sha1sum
  sha256sum shasum grep egrep fgrep rg jq curl mktemp test [ exit return break
  continue shift set shopt setopt unsetopt read unset wait getopts find xargs sed`),
  ]);
  SHELL_BUILTIN_ARG_COMMANDS = wordSet("read unset wait getopts");
  ARG_SENSITIVE_COMMANDS = new Set([
    ...AWK_NAMES,
    ...SHELL_BUILTIN_ARG_COMMANDS,
    ...wordSet("sed find xargs test [ printf set shopt setopt unsetopt rg sort cd pushd"),
  ]);
  STRING_EXEC_COMMANDS = new Set([...AWK_NAMES, ...wordSet("sed find xargs")]);
  SAFE_SET_O_OPTIONS_RE =
    /^(?:nullglob|failglob|dotglob|globstar|nocaseglob|nocasematch|nomatch|globskipdots|globasciiranges|lastpipe|inheriterrexit|shiftverbose|extquote|huponexit|checkwinsize)$/;
  TENGU_SERENE_POSSUM = "tengu_serene_possum";
});
//@ chunk-63f0f3kd.js:8485-8644 placement
/**
 * 判断 set -o / shopt 选项是否安全（含 no 前缀、按开关决定 extglob）。
 */
function isSafeShellOption(option) {
  let replaced = option.toLowerCase().replace(/[_-]/g, "");
  let flagWithOverride = readFlagWithOverride(TENGU_SERENE_POSSUM, {
    safe: true,
  });
  return [replaced, replaced.replace(/^no/, "")].some(
    (normalized) =>
      SET_O_SAFE_OPTS.has(normalized) ||
      SAFE_SET_O_OPTIONS_RE.test(normalized) ||
      (!flagWithOverride && normalized === "extglob"),
  );
}
//@ chunk-63f0f3kd.js:8644-8988 placement
/**
 * grep 中影响输出范围的选项（-A/-B/-C、--max-count 等）。
 */
var GREP_PATTERN_OPTIONS =
  /^(?:-[eftTgmABCMrE]|--(?:regexp|file|type|type-not|glob|iglob|max-count|after-context|before-context|context|max-columns|replace|encoding|engine|sort|sortr|color|colors|threads|max-depth|type-add))$/;
var GREP_CONTEXT_OPTIONS_RE =
  /^(?:-[mABCMjd]|--(?:max-count|after-context|before-context|context|max-columns|threads|max-depth|maxdepth))$/;
var GREP_BUNDLED_FLAG_RE = /[ABCEMTdefgjmrt]/;
//@ chunk-63f0f3kd.js:8988-9019 placement
function findGrepPatternFlag(arg) {
  return findBundledShortFlag(arg, GREP_BUNDLED_FLAG_RE);
}
//@ chunk-63f0f3kd.js:9019-9159 placement
function findBundledShortFlag(arg, chars) {
  if (arg === null || !/^-[A-Za-z0-9.]{2,}$/.test(arg)) return null;
  let matchIdx = arg.slice(1).search(chars) + 1;
  return matchIdx === arg.length - 1 ? `-${arg[matchIdx]}` : null;
}
//@ chunk-63f0f3kd.js:9159-9370 placement
/**
 * sort 中带值的选项（-k/-S、--key 等）。
 */
var SORT_OPTIONS; // deferred: uses wordSet (./shellState.js) of its import cycle while loading; runs once the cycle is complete
var SORT_VALUE_OPTIONS_RE;
var SORT_LONG_OPTION_PREFIXES;
deferInit("chunk-63f0f3kd.js:9159", () => {
  SORT_OPTIONS = /[koStT]/;
  SORT_VALUE_OPTIONS_RE = /^(?:-[kS]|--(?:key|buffer-size|parallel|batch-size))$/;
  SORT_LONG_OPTION_PREFIXES = wordSet(
    "key output buffer-size field-separator temporary-directory compress-program random-source sort batch-size parallel files0-from",
  );
});
//@ chunk-63f0f3kd.js:9370-9563 placement
function normalizeSortOption(arg) {
  if (arg === null) return null;
  if (/^-[koStT]$/.test(arg)) return arg;
  let longName = /^--([a-z][a-z0-9-]*)$/.exec(arg)?.[1];
  if (longName !== undefined)
    return [...SORT_LONG_OPTION_PREFIXES].some((prefix) => prefix.startsWith(longName)) ? arg : null;
  return findBundledShortFlag(arg, SORT_OPTIONS);
}
//@ chunk-63f0f3kd.js:9563-10110 placement
/**
 * xargs 的选项正则。
 */
var RG_PROGRAM_OPTIONS; // deferred: uses wordSet (./shellState.js) of its import cycle while loading; runs once the cycle is complete
var XARGS_OPTIONS_RE;
var FIND_EXEC_OPTIONS;
var SED_OPTIONS_RE;
deferInit("chunk-63f0f3kd.js:9563", () => {
  RG_PROGRAM_OPTIONS =
    /^(?:-[jd]|--(?:pre|pre-glob|hostname-bin|ignore-file|type-clear|context-separator|field-context-separator|field-match-separator|path-separator|hyperlink-format|max-filesize|dfa-size-limit|regex-size-limit|generate|maxdepth))$/;
  XARGS_OPTIONS_RE =
    /^(?:-[0rtpx]+|-[nPLsdE]|-[nPLs]\d+|-[dE].+|--|--(?:null|no-run-if-empty|verbose)|--(?:max-args|max-procs|max-lines|delimiter|eof)(?:=.*)?)$/s;
  FIND_EXEC_OPTIONS = wordSet("-exec -execdir -ok -okdir");
  SED_OPTIONS_RE =
    /^(?:-[nEruz]+|--(?:posix|quiet|silent|regexp-extended|unbuffered|null-data|separate|debug|sandbox)|-i\S*|--in-place(?:=\S*)?)$/;
});
//@ chunk-63f0f3kd.js:10110-10343 placement
function sedCommandPattern(addressPattern, substPattern, translitPattern) {
  return String.raw`[ \t]*(?:${addressPattern})?[ \t]*(?:![ \t]*)?(?:\{[ \t]*|(?:[pdqQhHgGxnNPDlzF=}]|s${substPattern}[gpiImM0-9]*|y${translitPattern}|[aic](?:\\\n?|[ \t])[^\n]*|:[ \t]*[A-Za-z_]\w*|[btT](?:[ \t]*[A-Za-z_]\w*)?)?[ \t]*(?:;|\n|$|(?=\})))`;
}
//@ chunk-63f0f3kd.js:10343-10709 placement
function sedRegexPattern(delimiter) {
  let escapedChar = String.raw`\\(?:(?=\])|[^\x00-\x08\x0a-\x1f\x7f[\]\u2028\u2029])`;
  let bracketAtom = String.raw`(?:\[(?!${delimiter}):(?:(?!${delimiter})[a-z])+:\](?!-\])|\[(?![.:=\]^])|(?!${delimiter})[^\x00-\x08\x0a-\x1f\x7f[\]\\]|${escapedChar})`;
  let bracketClass = String.raw`\[(?:(?!${delimiter})\^|(?!\^))(?:(?!${delimiter})\](?!-\])${bracketAtom}*|(?!\])${bracketAtom}+)(?!${delimiter})\]`;
  return String.raw`(?:\\[^\n\r\u2028\u2029]|(?!${delimiter})(?:${bracketClass}|[^\\\n[]))*${delimiter}`;
}
//@ chunk-63f0f3kd.js:10709-10776 placement
function sedDelimitedPattern(delimiter) {
  return String.raw`(?:\\[^\n]|(?!${delimiter})[^\\\n])*${delimiter}`;
}
//@ chunk-63f0f3kd.js:10776-10844 placement
function sedBracketPattern(delimiter) {
  return String.raw`(?:\\[^\n]|(?!${delimiter})[^\\\n[])*${delimiter}`;
}
//@ chunk-63f0f3kd.js:10844-11181 placement
/**
 * sed 地址片段（行号、$、/re/、\cREc），js 是拼好的整段 sed 脚本正则。
 */
var SED_DELIMITER_CLASS; // deferred: uses sedRegexPattern of its import cycle while loading; runs once the cycle is complete
var SED_ADDRESS_PATTERN;
var SED_COMMAND_PATTERN;
var TENGU_STREAMED_GEM;
deferInit("chunk-63f0f3kd.js:10844", () => {
  SED_DELIMITER_CLASS = String.raw`[^\\\n\sA-Za-z0-9;{}[]`;
  SED_ADDRESS_PATTERN = String.raw`(?:\d+(?:~\d+)?|\$|/${sedRegexPattern("/")}|\\([^\\\n\sA-Za-z0-9[])${sedRegexPattern(String.raw`\1`)})(?:[ \t]*,[ \t]*(?:[+~]?\d+|\$|/${sedRegexPattern("/")}))?`;
  SED_COMMAND_PATTERN = sedCommandPattern(
    SED_ADDRESS_PATTERN,
    String.raw`(${SED_DELIMITER_CLASS})${sedRegexPattern(String.raw`\2`)}${sedDelimitedPattern(String.raw`\2`)}`,
    String.raw`(${SED_DELIMITER_CLASS})${sedBracketPattern(String.raw`\3`)}${sedBracketPattern(String.raw`\3`)}`,
  );
  TENGU_STREAMED_GEM = "tengu_streamed_gem";
});
//@ chunk-63f0f3kd.js:11181-11219 placement
/**
 * 读取 tengu_streamed_gem 开关。
 */
function isSedScriptStrictnessOn() {
  return readFlagWithOverride(TENGU_STREAMED_GEM, {
    safe: true,
  });
}
//@ chunk-63f0f3kd.js:11219-11768 placement
/**
 * 选项顺序提示：-e 放前面、-i 后缀紧贴，否则 sed 会把后面的词当脚本执行。
 */
var TENGU_HUMBLE_WHALE; // deferred: uses sedCommandPattern of its import cycle while loading; runs once the cycle is complete
var SED_OPTION_ORDER_NOTE;
var SED_BSD_INPLACE_NOTE;
var SED_ADDRESS_PATTERN_STRICT;
var SED_COMMAND_PATTERN_STRICT;
deferInit("chunk-63f0f3kd.js:11219", () => {
  TENGU_HUMBLE_WHALE = "tengu_humble_whale";
  SED_OPTION_ORDER_NOTE =
    " (sed may stop reading options at the first word that is not an option and run it as the program: put every -e first and attach any -i suffix)";
  SED_BSD_INPLACE_NOTE =
    " (on macOS and BSD, sed takes the word after a bare -i as the backup suffix and a later word as the program: write -i.bak, which every sed reads the same way, or, with BSD sed, -i '' as its own word)";
  SED_ADDRESS_PATTERN_STRICT = String.raw`(?:\d+(?:~\d+)?|\$|/(?:\\.|[^\\/\n])*/|\\([^\\\n\s])(?:\\.|(?!\1)[^\\\n])*\1)(?:[ \t]*,[ \t]*(?:[+~]?\d+|\$|/(?:\\.|[^\\/\n])*/))?`;
  SED_COMMAND_PATTERN_STRICT = sedCommandPattern(
    SED_ADDRESS_PATTERN_STRICT,
    sedCustomDelimiterPattern(2),
    sedCustomDelimiterPattern(3),
  );
});
//@ chunk-63f0f3kd.js:11768-11907 placement
function sedCustomDelimiterPattern(delimiter) {
  let replaced = String.raw`(?:\\[^\n]|(?!\G)[^\\\n])*\G`.replaceAll("G", String(delimiter));
  return String.raw`([^\\\n\sA-Za-z0-9;{}])${replaced}${replaced}`;
}
export {
  DECLARATION_BUILTINS,
  isStdinLikeDevicePath,
  resolveAgainstCwd,
  isOpaquePathArgument,
  TRANSPARENT_LAUNCHERS,
  EXEC_LIKE_COMMANDS,
  COMMAND_PREFIX_WORDS,
  isDevicePath,
  KNOWN_PROGRAMS,
  REMOTE_SESSION_PROGRAMS,
  isSafeShellOption,
  STRING_EXEC_COMMANDS,
  ARG_SENSITIVE_COMMANDS,
  SHELL_COMMAND_FLAG_PATTERN,
  NAMESPACE_WRAPPER_RE,
  GREP_PATTERN_OPTIONS,
  normalizeSortOption,
  RG_PROGRAM_OPTIONS,
  findGrepPatternFlag,
  GREP_CONTEXT_OPTIONS_RE,
  SORT_VALUE_OPTIONS_RE,
  SHELL_BUILTIN_ARG_COMMANDS,
  TENGU_HUMBLE_WHALE,
  SED_OPTIONS_RE,
  SED_BSD_INPLACE_NOTE,
  SED_COMMAND_PATTERN_STRICT,
  isSedScriptStrictnessOn,
  SED_COMMAND_PATTERN,
  SED_OPTION_ORDER_NOTE,
  FIND_EXEC_OPTIONS,
  XARGS_OPTIONS_RE,
};
