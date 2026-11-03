/**
 * remote/tools/serve/servedShellReading.ts
 *
 * 2.1.316 新增：服务端 shell 命令行读取与静态词判定
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-tr0s0d0k.js (8)
 * attribution: placement 8
 */
import { ZSH_MODULE_NAME_WRITERS, isAssignmentNameUnsafeForSandbox } from "../../../utils/bash/ast.js";
import { parseCommandRaw, PARSE_ABORTED } from "../../../utils/bash/parser.js";
import { isAbortError } from "../../../utils/errors.js";
import { logError } from "../../../utils/log.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../../services/analytics/growthbook.js";

//@ chunk-tr0s0d0k.js:42043-44632 placement
/**
 * shell 行解析限额：最多 16 段；变量名、路径、赋值字符集；重定向操作符；保留 bash/zsh 变量与前缀；会读取路径的命令集合。
 */
var SERVED_SHELL_LIMITS = 16;
var SHELL_VARIABLE_NAME_RE = /^[A-Za-z_][A-Za-z0-9_]*$/;
var SAFE_PATH_CHARS_RE = /^[A-Za-z0-9_./:@%+,-]+$/;
var SAFE_ASSIGNMENT_CHARS_RE = /^[A-Za-z0-9_./:@%+,=-]+$/;
var NON_ASSIGNMENT_NEXT_CHARS = new Set([
  "",
  " ",
  "\t",
  `
`,
  '"',
  "/",
  ".",
  "-",
  ",",
  ";",
  "&",
  "|",
  ">",
  "<",
]);
var REDIRECT_OPERATORS = new Set([">", ">>", "<", ">&", "<&", "&>", "&>>", ">|"]);
var RESERVED_SHELL_VARIABLES = new Set([
  "ifs",
  "path",
  "home",
  "pwd",
  "oldpwd",
  "cdpath",
  "env",
  "prompt_command",
  "ps1",
  "ps2",
  "ps3",
  "ps4",
  "random",
  "srandom",
  "seconds",
  "lineno",
  "uid",
  "euid",
  "gid",
  "egid",
  "ppid",
  "shellopts",
  "hostname",
  "hosttype",
  "ostype",
  "machtype",
  "groups",
  "dirstack",
  "pipestatus",
  "reply",
  "optind",
  "optarg",
  "opterr",
  "shlvl",
  "username",
  "logname",
  "user",
  "shell",
  "term",
  "tmpdir",
  "lang",
  "columns",
  "lines",
  "epochseconds",
  "epochrealtime",
  "timeformat",
  "timefmt",
  "globignore",
  "nullcmd",
  "readnullcmd",
  "errno",
  "tty",
  "argc",
  "argv",
  "argv0",
  "cputype",
  "vendor",
  "posixly_correct",
  "tmout",
  "fcedit",
  "fignore",
  "execignore",
  "inputrc",
  "wordchars",
  "stty",
  "match",
  "mbegin",
  "mend",
  "_",
  "status",
  "psvar",
  "fpath",
  "manpath",
  "mailpath",
  "module_path",
  "watch",
  "signals",
  "histchars",
  "options",
  "commands",
  "functions",
  "aliases",
  "galiases",
  "saliases",
  "parameters",
  "modules",
  "history",
  "historywords",
  "nameddirs",
  "userdirs",
  "builtins",
  "reswords",
  "widgets",
  "keymaps",
  "terminfo",
  "termcap",
  "langinfo",
  "errnos",
  "sysparams",
  "mapfile",
  "usergroups",
  "patchars",
  "epochtime",
  "rprompt",
  "rps1",
  "keyboard_hack",
  "mailcheck",
  "null",
  "bashpid",
  "baud",
  "dirstacksize",
  "keytimeout",
  "listmax",
  "logcheck",
  "period",
  "reporttime",
  "reportmemory",
  "savehist",
  "funcnest",
  "ttyidle",
  "try_block_error",
  "try_block_interrupt",
  "mail",
  "sprompt",
]);
var RESERVED_SHELL_VARIABLE_PREFIXES = [
  "bash",
  "zsh",
  "ld_",
  "dyld_",
  "lc_",
  "comp",
  "hist",
  "prompt",
  "dis_",
  "func",
  "job",
  "zle",
];
var PATH_READ_COMMANDS = new Set([
  ...ZSH_MODULE_NAME_WRITERS,
  "read",
  "mapfile",
  "readarray",
  "getopts",
  "printf",
  "declare",
  "typeset",
  "local",
  "export",
  "readonly",
  "unset",
  "let",
  "eval",
  "source",
  ".",
  "set",
  "shopt",
  "setopt",
  "unsetopt",
  "emulate",
  "exec",
  "trap",
  "alias",
  "unalias",
  "shift",
  "wait",
  "coproc",
  "builtin",
  "command",
  "noglob",
  "nocorrect",
  "-",
  "integer",
  "float",
  "vared",
  "zparseopts",
  "zstyle",
  "zformat",
  "zstat",
  "strftime",
  "print",
  "sched",
  "zmodload",
  "autoload",
  "pcre_match",
  "pcre_compile",
  "pcre_study",
  "zselect",
  "zgetattr",
  "zsetattr",
  "zsystem",
  "ztie",
  "zuntie",
  "zcurses",
  "enable",
  "disable",
  "hash",
  "unhash",
  "rehash",
  "bind",
  "bindkey",
  "compgen",
  "complete",
  "compopt",
  "fc",
  "history",
  "r",
  "ulimit",
  "limit",
  "unlimit",
  "unsetenv",
  "setenv",
  "getln",
  "pushln",
  "zregexparse",
  "sysread",
  "syswrite",
  "sysopen",
  "sysseek",
  "zsocket",
  "ztcp",
  "zpty",
  "zftp",
  "zle",
  "zcompile",
  "functions",
  "unfunction",
  "private",
  "nameref",
  "stat",
  "time",
  "function",
  "select",
  "if",
  "then",
  "else",
  "elif",
  "fi",
  "case",
  "esac",
  "for",
  "while",
  "until",
  "do",
  "done",
  "in",
  "repeat",
  "foreach",
  "end",
  "always",
  "nocasematch",
  "exit",
  "return",
]);
//@ chunk-tr0s0d0k.js:44632-45067 placement
async function parseServedShellLine(command) {
  try {
    if (!/^[\t\n\x20-\x7e]*$/.test(command)) return;
    let commandRaw = await parseCommandRaw(command);
    if (commandRaw === null || commandRaw === PARSE_ABORTED) return;
    let programVariables = collectProgramVariables(commandRaw, command, false);
    if (programVariables === undefined || programVariables.replacements.length === 0) return;
    let r = "";
    let s = 0;
    for (let replacement of programVariables.replacements) {
      if (replacement.start < s) return;
      r += command.slice(s, replacement.start) + replacement.value;
      s = replacement.end;
    }
    r += command.slice(s);
    let commandRaw_2 = await parseCommandRaw(r);
    if (commandRaw_2 === null || commandRaw_2 === PARSE_ABORTED) return;
    let programVariables_2 = collectProgramVariables(commandRaw_2, r, true);
    return programVariables_2 !== undefined && programVariables_2.skeleton === programVariables.skeleton
      ? r
      : undefined;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-tr0s0d0k.js:45067-46024 placement
function collectProgramVariables(commandRaw, n, o) {
  if (commandRaw.type !== "program") return;
  let r = new Map();
  let s = new Set();
  let d = [];
  let u = "";
  for (let [p, h] of commandRaw.children.entries()) {
    if (h.type === ";" || h.type === "&") {
      u += h.type;
      continue;
    }
    if (h.type !== "variable_assignment") {
      let shellNode = readShellNode(h, n, r, d);
      if (shellNode === undefined) return;
      u += shellNode;
      continue;
    }
    let [_, S, R] = h.children;
    if (
      h.children.length !== 3 ||
      _ === undefined ||
      S === undefined ||
      R === undefined ||
      _.type !== "variable_name" ||
      S.type !== "=" ||
      !SHELL_VARIABLE_NAME_RE.test(_.text) ||
      s.has(_.text) ||
      s.size >= SERVED_SHELL_LIMITS ||
      commandRaw.children[p + 1]?.type === "&"
    )
      return;
    let lower = _.text.toLowerCase();
    if (
      isAssignmentNameUnsafeForSandbox(_.text) ||
      RESERVED_SHELL_VARIABLES.has(lower) ||
      RESERVED_SHELL_VARIABLE_PREFIXES.some((A) => lower.startsWith(A))
    )
      return;
    let L = R.children[1];
    let V =
      R.type === "word" || R.type === "number"
        ? R.text
        : R.type === "raw_string" && R.text.length > 2 && R.text.startsWith("'") && R.text.endsWith("'")
          ? R.text.slice(1, -1)
          : R.type === "string" &&
              R.children.length === 3 &&
              L !== undefined &&
              L.type === "string_content" &&
              R.text === `"${L.text}"`
            ? L.text
            : undefined;
    if (V === undefined || !SAFE_PATH_CHARS_RE.test(V)) return;
    s.add(_.text);
    if (!o) r.set(_.text, V);
    u += "assignment";
  }
  return {
    skeleton: u,
    replacements: d,
  };
}
//@ chunk-tr0s0d0k.js:46024-47218 placement
function readShellNode(e, n, o, r) {
  if (e.type === "list" || e.type === "pipeline") {
    let u = `${e.type}(`;
    for (let [p, h] of e.children.entries()) {
      let _ = e.type === "list" ? ["&&", "||"] : ["|", "|&"];
      let S = p % 2 === 0 ? readShellNode(h, n, o, r) : _.includes(h.type) ? h.type : undefined;
      if (S === undefined) return;
      u += S;
    }
    return e.children.length % 2 === 1 ? `${u})` : undefined;
  }
  if (e.type !== "command" && e.type !== "redirected_statement") return;
  let s = `${e.type}(`;
  let d = e.type === "redirected_statement";
  for (let [u, p] of e.children.entries())
    if (p.type === "file_redirect") {
      let last = p.children.at(-1);
      let _ = p.children.at(-2);
      let S = p.children.length === 3 ? p.children[0] : undefined;
      if (
        u === 0 ||
        last === undefined ||
        _ === undefined ||
        p.children.length > 3 ||
        !REDIRECT_OPERATORS.has(_.type) ||
        (p.children.length === 3 && (S?.type !== "file_descriptor" || !/^[0-9]+$/.test(S.text))) ||
        !isStaticWord(last, n, o, r)
      )
        return;
      s += `redirect(${S?.text ?? ""}${_.type})`;
    } else if (e.type === "redirected_statement") {
      let h = u === 0 ? readShellNode(p, n, o, r) : undefined;
      if (h === undefined) return;
      s += h;
    } else if (p.type === "command_name") {
      let h = p.children[0];
      if (d || h === undefined || p.children.length !== 1) return;
      d = true;
      let _ = r.length;
      if (
        !(h.type === "word" || h.type === "number"
          ? SAFE_PATH_CHARS_RE.test(h.text) && (h.text.includes("/") || !PATH_READ_COMMANDS.has(h.text))
          : isStaticWord(h, n, o, r) && r.length > _)
      )
        return;
      s += "head";
    } else {
      if (!d || !isStaticWord(p, n, o, r)) return;
      s += " word";
    }
  return d ? `${s})` : undefined;
}
//@ chunk-tr0s0d0k.js:47218-47933 placement
function isStaticWord(e, n, o, r) {
  switch (e.type) {
    case "word":
    case "number":
    case "raw_string":
      return true;
    case "simple_expansion":
    case "expansion": {
      let s = e.type === "expansion";
      let [d, u, p] = e.children;
      let h = u?.type === "variable_name" ? o.get(u.text) : undefined;
      if (
        h === undefined ||
        e.children.length !== (s ? 3 : 2) ||
        d?.type !== (s ? "${" : "$") ||
        (s && p?.type !== "}") ||
        (!s && !NON_ASSIGNMENT_NEXT_CHARS.has(n[e.endIndex] ?? ""))
      )
        return false;
      r.push({
        start: e.startIndex,
        end: e.endIndex,
        value: h,
      });
      return true;
    }
    case "string":
      return e.children.every(
        (child) =>
          child.type === '"' ||
          child.type === "string_content" ||
          ((child.type === "simple_expansion" || child.type === "expansion") && isStaticWord(child, n, o, r)),
      );
    case "concatenation":
      return e.children.every((child) =>
        child.type === "word" || child.type === "number"
          ? SAFE_ASSIGNMENT_CHARS_RE.test(child.text)
          : child.type !== "concatenation" && isStaticWord(child, n, o, r),
      );
    default:
      return false;
  }
}
//@ chunk-tr0s0d0k.js:47933-48005 placement
function isServedHairEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_hair", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-tr0s0d0k.js:48005-48080 placement
function isServedFerruleEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_ferrule", false) === true;
  } catch {
    return false;
  }
}
//@ chunk-tr0s0d0k.js:48167-48209 placement
var SERVED_SHELL_READ_LIMITS = 2000;
var MAX_PATH_PIECES = 112;
var CUT_SHORT = Symbol("cut short");
export {
  SERVED_SHELL_READ_LIMITS,
  CUT_SHORT,
  MAX_PATH_PIECES,
  parseServedShellLine,
  isServedHairEnabled,
  isServedFerruleEnabled,
};
