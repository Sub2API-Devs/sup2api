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
var SERVED_SHELL_LIMITS = 16,
  ds = /^[A-Za-z_][A-Za-z0-9_]*$/,
  Kt = /^[A-Za-z0-9_./:@%+,-]+$/,
  ls = /^[A-Za-z0-9_./:@%+,=-]+$/,
  cs = new Set([
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
  ]),
  us = new Set([">", ">>", "<", ">&", "<&", "&>", "&>>", ">|"]),
  fs = new Set([
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
  ]),
  ms = ["bash", "zsh", "ld_", "dyld_", "lc_", "comp", "hist", "prompt", "dis_", "func", "job", "zle"],
  ps = new Set([
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
async function parseServedShellLine(e) {
  try {
    if (!/^[\t\n\x20-\x7e]*$/.test(e)) return;
    let n = await parseCommandRaw(e);
    if (n === null || n === PARSE_ABORTED) return;
    let o = collectProgramVariables(n, e, !1);
    if (o === void 0 || o.replacements.length === 0) return;
    let r = "",
      s = 0;
    for (let replacement of o.replacements) {
      if (replacement.start < s) return;
      ((r += e.slice(s, replacement.start) + replacement.value), (s = replacement.end));
    }
    r += e.slice(s);
    let d = await parseCommandRaw(r);
    if (d === null || d === PARSE_ABORTED) return;
    let u = collectProgramVariables(d, r, !0);
    return u !== void 0 && u.skeleton === o.skeleton ? r : void 0;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-tr0s0d0k.js:45067-46024 placement
function collectProgramVariables(e, n, o) {
  if (e.type !== "program") return;
  let r = new Map(),
    s = new Set(),
    d = [],
    u = "";
  for (let [p, h] of e.children.entries()) {
    if (h.type === ";" || h.type === "&") {
      u += h.type;
      continue;
    }
    if (h.type !== "variable_assignment") {
      let A = readShellNode(h, n, r, d);
      if (A === void 0) return;
      u += A;
      continue;
    }
    let [_, S, R] = h.children;
    if (
      h.children.length !== 3 ||
      _ === void 0 ||
      S === void 0 ||
      R === void 0 ||
      _.type !== "variable_name" ||
      S.type !== "=" ||
      !ds.test(_.text) ||
      s.has(_.text) ||
      s.size >= SERVED_SHELL_LIMITS ||
      e.children[p + 1]?.type === "&"
    )
      return;
    let lower = _.text.toLowerCase();
    if (isAssignmentNameUnsafeForSandbox(_.text) || fs.has(lower) || ms.some((A) => lower.startsWith(A)))
      return;
    let L = R.children[1],
      V =
        R.type === "word" || R.type === "number"
          ? R.text
          : R.type === "raw_string" && R.text.length > 2 && R.text.startsWith("'") && R.text.endsWith("'")
            ? R.text.slice(1, -1)
            : R.type === "string" &&
                R.children.length === 3 &&
                L !== void 0 &&
                L.type === "string_content" &&
                R.text === `"${L.text}"`
              ? L.text
              : void 0;
    if (V === void 0 || !Kt.test(V)) return;
    if ((s.add(_.text), !o)) r.set(_.text, V);
    u += "assignment";
  }
  return { skeleton: u, replacements: d };
}
//@ chunk-tr0s0d0k.js:46024-47218 placement
function readShellNode(e, n, o, r) {
  if (e.type === "list" || e.type === "pipeline") {
    let u = `${e.type}(`;
    for (let [p, h] of e.children.entries()) {
      let _ = e.type === "list" ? ["&&", "||"] : ["|", "|&"],
        S = p % 2 === 0 ? readShellNode(h, n, o, r) : _.includes(h.type) ? h.type : void 0;
      if (S === void 0) return;
      u += S;
    }
    return e.children.length % 2 === 1 ? `${u})` : void 0;
  }
  if (e.type !== "command" && e.type !== "redirected_statement") return;
  let s = `${e.type}(`,
    d = e.type === "redirected_statement";
  for (let [u, p] of e.children.entries())
    if (p.type === "file_redirect") {
      let at = p.children.at(-1),
        at_2 = p.children.at(-2),
        S = p.children.length === 3 ? p.children[0] : void 0;
      if (
        u === 0 ||
        at === void 0 ||
        at_2 === void 0 ||
        p.children.length > 3 ||
        !us.has(at_2.type) ||
        (p.children.length === 3 && (S?.type !== "file_descriptor" || !/^[0-9]+$/.test(S.text))) ||
        !isStaticWord(at, n, o, r)
      )
        return;
      s += `redirect(${S?.text ?? ""}${at_2.type})`;
    } else if (e.type === "redirected_statement") {
      let h = u === 0 ? readShellNode(p, n, o, r) : void 0;
      if (h === void 0) return;
      s += h;
    } else if (p.type === "command_name") {
      let h = p.children[0];
      if (d || h === void 0 || p.children.length !== 1) return;
      d = !0;
      let _ = r.length;
      if (
        !(h.type === "word" || h.type === "number"
          ? Kt.test(h.text) && (h.text.includes("/") || !ps.has(h.text))
          : isStaticWord(h, n, o, r) && r.length > _)
      )
        return;
      s += "head";
    } else {
      if (!d || !isStaticWord(p, n, o, r)) return;
      s += " word";
    }
  return d ? `${s})` : void 0;
}
//@ chunk-tr0s0d0k.js:47218-47933 placement
function isStaticWord(e, n, o, r) {
  switch (e.type) {
    case "word":
    case "number":
    case "raw_string":
      return !0;
    case "simple_expansion":
    case "expansion": {
      let s = e.type === "expansion",
        [d, u, p] = e.children,
        h = u?.type === "variable_name" ? o.get(u.text) : void 0;
      if (
        h === void 0 ||
        e.children.length !== (s ? 3 : 2) ||
        d?.type !== (s ? "${" : "$") ||
        (s && p?.type !== "}") ||
        (!s && !cs.has(n[e.endIndex] ?? ""))
      )
        return !1;
      return (r.push({ start: e.startIndex, end: e.endIndex, value: h }), !0);
    }
    case "string":
      return e.children.every(
        (s) =>
          s.type === '"' ||
          s.type === "string_content" ||
          ((s.type === "simple_expansion" || s.type === "expansion") && isStaticWord(s, n, o, r)),
      );
    case "concatenation":
      return e.children.every((s) =>
        s.type === "word" || s.type === "number"
          ? ls.test(s.text)
          : s.type !== "concatenation" && isStaticWord(s, n, o, r),
      );
    default:
      return !1;
  }
}
//@ chunk-tr0s0d0k.js:47933-48005 placement
function isServedHairEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_hair", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-tr0s0d0k.js:48005-48080 placement
function isServedFerruleEnabled() {
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_violin_ferrule", !1) === !0;
  } catch {
    return !1;
  }
}
//@ chunk-tr0s0d0k.js:48167-48209 placement
var SERVED_SHELL_READ_LIMITS = 2000,
  vs = 112,
  xe = Symbol("cut short");

export {
  SERVED_SHELL_READ_LIMITS,
  xe,
  vs,
  parseServedShellLine,
  isServedHairEnabled,
  isServedFerruleEnabled,
};
