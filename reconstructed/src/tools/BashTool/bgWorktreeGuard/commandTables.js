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

//@ chunk-63f0f3kd.js:6594-6804 placement
var DECLARATION_BUILTINS = new Set([
    ...SHELL_PROGRAM_NAMES,
    ...wordSet("export declare typeset local readonly"),
  ]),
  ot = TRANSPARENT_LAUNCHER_NAMES,
  Fe = wordSet("command builtin time noglob nocorrect"),
  It = wordSet("ssh rlogin scp rcp sftp rsync kubectl oc gcloud"),
  sn = /^(?:unshare|nsenter|wsl)$/;
//@ chunk-63f0f3kd.js:6804-7213 placement
function devicePathOf(t) {
  let replaced = t.replace(/^(?:(?:-[^=/]*|\w[\w.-]*)=|-[A-Za-z](?=\.*\/))/, ""),
    matches = /^file:/i.test(replaced);
  if (matches)
    try {
      replaced = new URL(replaced).pathname.replace(/%([0-9a-f]{2})/gi, (r, s) =>
        String.fromCharCode(parseInt(s, 16)),
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
function isDevicePath(t) {
  return devicePathOf(t) !== null;
}
//@ chunk-63f0f3kd.js:7247-7332 placement
function isStdinLikeDevicePath(t) {
  return /\/(?:stdin|(?:tcp|udp)\/.*|fd\/(?![12]$)\d+)$/.test(devicePathOf(t) ?? "");
}
//@ chunk-63f0f3kd.js:7332-7415 placement
function isOpaquePathArgument(t, e) {
  return isDevicePath(resolveAgainstCwd(t, e)) || e.deviceLinked || (e.opaqueCwd && !/^[\/~]/.test(t));
}
//@ chunk-63f0f3kd.js:7415-7497 placement
function resolveAgainstCwd(t, e) {
  return /^[\/~]/.test(t) || !e.cwd.startsWith("/") ? t : `${e.cwd}/${t}`;
}
//@ chunk-63f0f3kd.js:7497-8485 placement
var SHELL_COMMAND_FLAG_PATTERN = /^(?:-[a-zA-Z]*c|--command|--session-command|\/c)$/i,
  Ft = new Set(["exec", "nocorrect"]),
  dt = new Set([
    ...AWK_NAMES,
    ...wordSet(`echo printf cat ls cp mv ln mkdir touch rm rmdir chmod head tail
  wc sort uniq tr cut paste column tee rev tac nl fold comm join expand
  unexpand type basename dirname realpath
  readlink stat du df file date sleep true false : cd pwd seq yes printenv id
  whoami uname which kill pkill pgrep ps diff cmp md5sum sha1sum
  sha256sum shasum grep egrep fgrep rg jq curl mktemp test [ exit return break
  continue shift set shopt setopt unsetopt read unset wait getopts find xargs sed`),
  ]),
  zn = wordSet("read unset wait getopts"),
  Hn = new Set([
    ...AWK_NAMES,
    ...zn,
    ...wordSet("sed find xargs test [ printf set shopt setopt unsetopt rg sort cd pushd"),
  ]),
  rn = new Set([...AWK_NAMES, ...wordSet("sed find xargs")]),
  Ps =
    /^(?:nullglob|failglob|dotglob|globstar|nocaseglob|nocasematch|nomatch|globskipdots|globasciiranges|lastpipe|inheriterrexit|shiftverbose|extquote|huponexit|checkwinsize)$/,
  TENGU_SERENE_POSSUM = "tengu_serene_possum";
/**
 * 判断 set -o / shopt 选项是否安全（含 no 前缀、按开关决定 extglob）。
 */
//@ chunk-63f0f3kd.js:8485-8644 placement
function isSafeShellOption(t) {
  let replaced = t.toLowerCase().replace(/[_-]/g, ""),
    i = readFlagWithOverride(TENGU_SERENE_POSSUM, { safe: !0 });
  return [replaced, replaced.replace(/^no/, "")].some(
    (n) => SET_O_SAFE_OPTS.has(n) || Ps.test(n) || (!i && n === "extglob"),
  );
}
//@ chunk-63f0f3kd.js:8644-8988 placement
var GREP_PATTERN_OPTIONS =
    /^(?:-[eftTgmABCMrE]|--(?:regexp|file|type|type-not|glob|iglob|max-count|after-context|before-context|context|max-columns|replace|encoding|engine|sort|sortr|color|colors|threads|max-depth|type-add))$/,
  Fs =
    /^(?:-[mABCMjd]|--(?:max-count|after-context|before-context|context|max-columns|threads|max-depth|maxdepth))$/,
  Ws = /[ABCEMTdefgjmrt]/;
//@ chunk-63f0f3kd.js:8988-9019 placement
function findGrepPatternFlag(t) {
  return findBundledShortFlag(t, Ws);
}
//@ chunk-63f0f3kd.js:9019-9159 placement
function findBundledShortFlag(t, e) {
  if (t === null || !/^-[A-Za-z0-9.]{2,}$/.test(t)) return null;
  let i = t.slice(1).search(e) + 1;
  return i === t.length - 1 ? `-${t[i]}` : null;
}
//@ chunk-63f0f3kd.js:9159-9370 placement
var SORT_OPTIONS = /[koStT]/,
  zs = /^(?:-[kS]|--(?:key|buffer-size|parallel|batch-size))$/,
  Hs = wordSet(
    "key output buffer-size field-separator temporary-directory compress-program random-source sort batch-size parallel files0-from",
  );
//@ chunk-63f0f3kd.js:9370-9563 placement
function normalizeSortOption(t) {
  if (t === null) return null;
  if (/^-[koStT]$/.test(t)) return t;
  let e = /^--([a-z][a-z0-9-]*)$/.exec(t)?.[1];
  if (e !== void 0) return [...Hs].some((i) => i.startsWith(e)) ? t : null;
  return findBundledShortFlag(t, SORT_OPTIONS);
}
//@ chunk-63f0f3kd.js:9563-10110 placement
var RG_PROGRAM_OPTIONS =
    /^(?:-[jd]|--(?:pre|pre-glob|hostname-bin|ignore-file|type-clear|context-separator|field-context-separator|field-match-separator|path-separator|hyperlink-format|max-filesize|dfa-size-limit|regex-size-limit|generate|maxdepth))$/,
  qs =
    /^(?:-[0rtpx]+|-[nPLsdE]|-[nPLs]\d+|-[dE].+|--|--(?:null|no-run-if-empty|verbose)|--(?:max-args|max-procs|max-lines|delimiter|eof)(?:=.*)?)$/s,
  an = wordSet("-exec -execdir -ok -okdir"),
  Vs =
    /^(?:-[nEruz]+|--(?:posix|quiet|silent|regexp-extended|unbuffered|null-data|separate|debug|sandbox)|-i\S*|--in-place(?:=\S*)?)$/;
//@ chunk-63f0f3kd.js:10110-10343 placement
function sedCommandPattern(t, e, i) {
  return String.raw`[ \t]*(?:${t})?[ \t]*(?:![ \t]*)?(?:\{[ \t]*|(?:[pdqQhHgGxnNPDlzF=}]|s${e}[gpiImM0-9]*|y${i}|[aic](?:\\\n?|[ \t])[^\n]*|:[ \t]*[A-Za-z_]\w*|[btT](?:[ \t]*[A-Za-z_]\w*)?)?[ \t]*(?:;|\n|$|(?=\})))`;
}
//@ chunk-63f0f3kd.js:10343-10709 placement
function sedRegexPattern(t) {
  let e = String.raw`\\(?:(?=\])|[^\x00-\x08\x0a-\x1f\x7f[\]\u2028\u2029])`,
    i = String.raw`(?:\[(?!${t}):(?:(?!${t})[a-z])+:\](?!-\])|\[(?![.:=\]^])|(?!${t})[^\x00-\x08\x0a-\x1f\x7f[\]\\]|${e})`,
    n = String.raw`\[(?:(?!${t})\^|(?!\^))(?:(?!${t})\](?!-\])${i}*|(?!\])${i}+)(?!${t})\]`;
  return String.raw`(?:\\[^\n\r\u2028\u2029]|(?!${t})(?:${n}|[^\\\n[]))*${t}`;
}
//@ chunk-63f0f3kd.js:10709-10776 placement
function sedDelimitedPattern(t) {
  return String.raw`(?:\\[^\n]|(?!${t})[^\\\n])*${t}`;
}
//@ chunk-63f0f3kd.js:10776-10844 placement
function sedBracketPattern(t) {
  return String.raw`(?:\\[^\n]|(?!${t})[^\\\n[])*${t}`;
}
//@ chunk-63f0f3kd.js:10844-11181 placement
var SED_DELIMITER_CLASS = String.raw`[^\\\n\sA-Za-z0-9;{}[]`,
  Xs = String.raw`(?:\d+(?:~\d+)?|\$|/${sedRegexPattern("/")}|\\([^\\\n\sA-Za-z0-9[])${sedRegexPattern(String.raw`\1`)})(?:[ \t]*,[ \t]*(?:[+~]?\d+|\$|/${sedRegexPattern("/")}))?`,
  js = sedCommandPattern(
    Xs,
    String.raw`(${SED_DELIMITER_CLASS})${sedRegexPattern(String.raw`\2`)}${sedDelimitedPattern(String.raw`\2`)}`,
    String.raw`(${SED_DELIMITER_CLASS})${sedBracketPattern(String.raw`\3`)}${sedBracketPattern(String.raw`\3`)}`,
  ),
  TENGU_STREAMED_GEM = "tengu_streamed_gem";
//@ chunk-63f0f3kd.js:11181-11219 placement
function Ks() {
  return readFlagWithOverride(TENGU_STREAMED_GEM, { safe: !0 });
}
//@ chunk-63f0f3kd.js:11219-11768 placement
var TENGU_HUMBLE_WHALE = "tengu_humble_whale",
  un =
    " (sed may stop reading options at the first word that is not an option and run it as the program: put every -e first and attach any -i suffix)",
  $e =
    " (on macOS and BSD, sed takes the word after a bare -i as the backup suffix and a later word as the program: write -i.bak, which every sed reads the same way, or, with BSD sed, -i '' as its own word)",
  Qs = String.raw`(?:\d+(?:~\d+)?|\$|/(?:\\.|[^\\/\n])*/|\\([^\\\n\s])(?:\\.|(?!\1)[^\\\n])*\1)(?:[ \t]*,[ \t]*(?:[+~]?\d+|\$|/(?:\\.|[^\\/\n])*/))?`,
  ti = sedCommandPattern(Qs, sedCustomDelimiterPattern(2), sedCustomDelimiterPattern(3));
//@ chunk-63f0f3kd.js:11768-11907 placement
function sedCustomDelimiterPattern(t) {
  let replaced = String.raw`(?:\\[^\n]|(?!\G)[^\\\n])*\G`.replaceAll("G", String(t));
  return String.raw`([^\\\n\sA-Za-z0-9;{}])${replaced}${replaced}`;
}

export {
  DECLARATION_BUILTINS,
  isStdinLikeDevicePath,
  resolveAgainstCwd,
  isOpaquePathArgument,
  ot,
  Ft,
  Fe,
  isDevicePath,
  dt,
  It,
  isSafeShellOption,
  rn,
  Hn,
  SHELL_COMMAND_FLAG_PATTERN,
  sn,
  GREP_PATTERN_OPTIONS,
  normalizeSortOption,
  RG_PROGRAM_OPTIONS,
  findGrepPatternFlag,
  Fs,
  zs,
  zn,
  TENGU_HUMBLE_WHALE,
  Vs,
  $e,
  ti,
  Ks,
  js,
  un,
  an,
  qs,
};
