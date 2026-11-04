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
async function parseServedShellLine(source) {
  try {
    if (!/^[\t\n\x20-\x7e]*$/.test(source)) return;
    let commandRaw = await parseCommandRaw(source);
    if (commandRaw === null || commandRaw === PARSE_ABORTED) return;
    let programVariables = collectProgramVariables(commandRaw, source, false);
    if (programVariables === undefined || programVariables.replacements.length === 0) return;
    let replaced = "";
    let cursor = 0;
    for (let replacement of programVariables.replacements) {
      if (replacement.start < cursor) return;
      replaced += source.slice(cursor, replacement.start) + replacement.value;
      cursor = replacement.end;
    }
    replaced += source.slice(cursor);
    let commandRaw_2 = await parseCommandRaw(replaced);
    if (commandRaw_2 === null || commandRaw_2 === PARSE_ABORTED) return;
    let programVariables_2 = collectProgramVariables(commandRaw_2, replaced, true);
    return programVariables_2 !== undefined && programVariables_2.skeleton === programVariables.skeleton
      ? replaced
      : undefined;
  } catch (error) {
    if (!isAbortError(error)) logError(error);
    return;
  }
}
//@ chunk-tr0s0d0k.js:45067-46024 placement
function collectProgramVariables(commandRaw, source, secondPass) {
  if (commandRaw.type !== "program") return;
  let values = new Map();
  let names = new Set();
  let replacements = [];
  let skeleton = "";
  for (let [index, child] of commandRaw.children.entries()) {
    if (child.type === ";" || child.type === "&") {
      skeleton += child.type;
      continue;
    }
    if (child.type !== "variable_assignment") {
      let shellNode = readShellNode(child, source, values, replacements);
      if (shellNode === undefined) return;
      skeleton += shellNode;
      continue;
    }
    let [nameNode, equals, valueNode] = child.children;
    if (
      child.children.length !== 3 ||
      nameNode === undefined ||
      equals === undefined ||
      valueNode === undefined ||
      nameNode.type !== "variable_name" ||
      equals.type !== "=" ||
      !SHELL_VARIABLE_NAME_RE.test(nameNode.text) ||
      names.has(nameNode.text) ||
      names.size >= SERVED_SHELL_LIMITS ||
      commandRaw.children[index + 1]?.type === "&"
    )
      return;
    let lower = nameNode.text.toLowerCase();
    if (
      isAssignmentNameUnsafeForSandbox(nameNode.text) ||
      RESERVED_SHELL_VARIABLES.has(lower) ||
      RESERVED_SHELL_VARIABLE_PREFIXES.some((prefix) => lower.startsWith(prefix))
    )
      return;
    let innerContent = valueNode.children[1];
    let literal =
      valueNode.type === "word" || valueNode.type === "number"
        ? valueNode.text
        : valueNode.type === "raw_string" &&
            valueNode.text.length > 2 &&
            valueNode.text.startsWith("'") &&
            valueNode.text.endsWith("'")
          ? valueNode.text.slice(1, -1)
          : valueNode.type === "string" &&
              valueNode.children.length === 3 &&
              innerContent !== undefined &&
              innerContent.type === "string_content" &&
              valueNode.text === `"${innerContent.text}"`
            ? innerContent.text
            : undefined;
    if (literal === undefined || !SAFE_PATH_CHARS_RE.test(literal)) return;
    names.add(nameNode.text);
    if (!secondPass) values.set(nameNode.text, literal);
    skeleton += "assignment";
  }
  return {
    skeleton,
    replacements,
  };
}
//@ chunk-tr0s0d0k.js:46024-47218 placement
function readShellNode(node, source, values, replacements) {
  if (node.type === "list" || node.type === "pipeline") {
    let out = `${node.type}(`;
    for (let [index, child] of node.children.entries()) {
      let separators = node.type === "list" ? ["&&", "||"] : ["|", "|&"];
      let piece =
        index % 2 === 0
          ? readShellNode(child, source, values, replacements)
          : separators.includes(child.type)
            ? child.type
            : undefined;
      if (piece === undefined) return;
      out += piece;
    }
    return node.children.length % 2 === 1 ? `${out})` : undefined;
  }
  if (node.type !== "command" && node.type !== "redirected_statement") return;
  let out = `${node.type}(`;
  let sawName = node.type === "redirected_statement";
  for (let [index, child] of node.children.entries())
    if (child.type === "file_redirect") {
      let last = child.children.at(-1);
      let operator = child.children.at(-2);
      let fd = child.children.length === 3 ? child.children[0] : undefined;
      if (
        index === 0 ||
        last === undefined ||
        operator === undefined ||
        child.children.length > 3 ||
        !REDIRECT_OPERATORS.has(operator.type) ||
        (child.children.length === 3 && (fd?.type !== "file_descriptor" || !/^[0-9]+$/.test(fd.text))) ||
        !isStaticWord(last, source, values, replacements)
      )
        return;
      out += `redirect(${fd?.text ?? ""}${operator.type})`;
    } else if (node.type === "redirected_statement") {
      let nested = index === 0 ? readShellNode(child, source, values, replacements) : undefined;
      if (nested === undefined) return;
      out += nested;
    } else if (child.type === "command_name") {
      let nameNode = child.children[0];
      if (sawName || nameNode === undefined || child.children.length !== 1) return;
      sawName = true;
      let beforeLength = replacements.length;
      if (
        !(nameNode.type === "word" || nameNode.type === "number"
          ? SAFE_PATH_CHARS_RE.test(nameNode.text) &&
            (nameNode.text.includes("/") || !PATH_READ_COMMANDS.has(nameNode.text))
          : isStaticWord(nameNode, source, values, replacements) && replacements.length > beforeLength)
      )
        return;
      out += "head";
    } else {
      if (!sawName || !isStaticWord(child, source, values, replacements)) return;
      out += " word";
    }
  return sawName ? `${out})` : undefined;
}
//@ chunk-tr0s0d0k.js:47218-47933 placement
function isStaticWord(node, source, values, replacements) {
  switch (node.type) {
    case "word":
    case "number":
    case "raw_string":
      return true;
    case "simple_expansion":
    case "expansion": {
      let braced = node.type === "expansion";
      let [prefixNode, nameNode, closing] = node.children;
      let value = nameNode?.type === "variable_name" ? values.get(nameNode.text) : undefined;
      if (
        value === undefined ||
        node.children.length !== (braced ? 3 : 2) ||
        prefixNode?.type !== (braced ? "${" : "$") ||
        (braced && closing?.type !== "}") ||
        (!braced && !NON_ASSIGNMENT_NEXT_CHARS.has(source[node.endIndex] ?? ""))
      )
        return false;
      replacements.push({
        start: node.startIndex,
        end: node.endIndex,
        value,
      });
      return true;
    }
    case "string":
      return node.children.every(
        (child) =>
          child.type === '"' ||
          child.type === "string_content" ||
          ((child.type === "simple_expansion" || child.type === "expansion") &&
            isStaticWord(child, source, values, replacements)),
      );
    case "concatenation":
      return node.children.every((child) =>
        child.type === "word" || child.type === "number"
          ? SAFE_ASSIGNMENT_CHARS_RE.test(child.text)
          : child.type !== "concatenation" && isStaticWord(child, source, values, replacements),
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
