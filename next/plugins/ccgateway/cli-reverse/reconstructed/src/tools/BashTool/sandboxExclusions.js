/**
 * tools/BashTool/sandboxExclusions.ts
 *
 * 2.1.316 新增：不适合在沙箱中运行的命令与参数
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (63)
 * attribution: placement 61, affinity 2
 */
import {
  UNICODE_WHITESPACE_RE,
  CONTROL_CHAR_RE as CONTROL_CHAR_RE_2,
  stripLiteralQuotedRegions,
  stripQuotedRegions,
  EVAL_LIKE_BUILTINS,
  AWK_NAMES,
  UNHANDLED_EXEC_WRAPPERS,
  ZSH_DANGEROUS_BUILTINS,
  liveBracedExpansionBodies,
  DECLARATION_LIKE_BUILTINS,
} from "../../utils/bash/ast.js";
import { getOwn } from "../../utils/objectSafety.js";
import { hasAnyLowerShortFlag, hasAnyShortFlagChar } from "../../utils/bash/parser.js";
import { getCommandArgv } from "../../utils/bash/commands.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import {
  stripUnsafeLeadingEnvVars,
  stripSafeWrappersFromCommand,
  isSafeEnvVarName,
  isPathLikeEnvValue,
} from "./bashPermissions.js";
import {
  TRANSPARENT_PREFIX_COMMANDS,
  COMMAND_RUNNER_PREFIXES,
  DIRECTORY_CHANGE_COMMANDS,
  POWERSHELL_INVOKE_COMMANDS,
  LEADING_REDIRECTION_RE,
  ENV_ASSIGNMENT_RE_3,
} from "./shouldUseSandbox.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  isGitArgMatchingFlagRule,
  hasDangerousGitGlobalOption,
  getGitSubcommandPath,
  SAFE_GIT_GLOBAL_FLAGS,
} from "../../utils/git.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:1244293-1244648 placement
/**
 * 沙箱排除判断用常量：shell 元字符、Unicode 空白、需拒绝的字符、@变量名、空白分隔与前导词正则、可信的 env 路径。
 */
var SHELL_META_RE; // deferred: uses REDIRECT_OPS (../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var UNICODE_SPACE_RE_2;
var UNSAFE_ARG_CHARS_RE;
var UNSAFE_PATH_CHARS_RE_2;
var AT_VARIABLE_RE;
var BLANK_RE;
var LEADING_WORD_RE;
var TRUSTED_ENV_PATHS;
deferInit("chunk-e6aww6q8.js:1244293", () => {
  SHELL_META_RE = /[;|&`$(){}<>#\n\r]/;
  UNICODE_SPACE_RE_2 = new RegExp(`\x85|${UNICODE_WHITESPACE_RE.source}`);
  UNSAFE_ARG_CHARS_RE = new RegExp(
    `${SHELL_META_RE.source}|[,%]|['"\u2013-\u2015\u2018-\u201B\u201C-\u201E]|${UNICODE_SPACE_RE_2.source}|${CONTROL_CHAR_RE_2.source}`,
  );
  UNSAFE_PATH_CHARS_RE_2 = new RegExp(
    `[,%\u2013-\u2015]|${UNICODE_SPACE_RE_2.source}|${CONTROL_CHAR_RE_2.source}`,
  );
  AT_VARIABLE_RE = /^@[A-Za-z_][A-Za-z0-9_:]*$/;
  BLANK_RE = /[ \t]+/;
  LEADING_WORD_RE = /^([^ \t]*)[ \t]+/;
  TRUSTED_ENV_PATHS = new Set(["env", "/bin/env", "/usr/bin/env"]);
});
//@ chunk-e6aww6q8.js:1244648-1244836 placement
function normalizeEnvPath(path) {
  if (path.startsWith("//")) return path;
  let isAbsolutePath = path.startsWith("/");
  let replaced = path
    .replace(/\/+/g, "/")
    .replace(/(?:^|\/)\.(?=\/)/g, "")
    .replace(/\/+/g, "/");
  if (isAbsolutePath) return replaced;
  return path.includes("/") ? path : replaced;
}
//@ chunk-e6aww6q8.js:1244836-1245040 placement
/**
 * 分类 env 包装命令：不是 env、可信路径下的 env 或不可信的 env。
 */
function classifyEnvWrapper(wrapperText) {
  let firstWord = firstToken(wrapperText);
  if (canonicalProgramName(firstWord) !== "env") return "none";
  let lower = (firstWord.split(/[/\\]/).pop() ?? "").toLowerCase();
  if (UNTRUSTED_ENV_ALIASES.has(lower.replace(/[. ]+$/, ""))) return "untrusted";
  return TRUSTED_ENV_PATHS.has(normalizeEnvPath(firstWord)) ? "trusted" : "untrusted";
}
//@ chunk-e6aww6q8.js:1245040-1246251 placement
/**
 * 各程序“会取走下一个词作为值”的选项表（kubectl/docker/aws/git/shell/python 等）。
 */
var REMOTE_CLUSTER_FLAGS =
  /^(?:-i|--ignore-environment|-0|--null)[ \t]+|^(?:-u[ \t]+|--unset=)[A-Za-z_][A-Za-z0-9_]*[ \t]+/;
var PROGRAM_VALUE_OPTIONS = {
  printf: ["-v"],
  jobs: ["-x"],
  kubectl: ["--kubeconfig", "-s", "--server", "--insecure-skip-tls-verify"],
  docker: ["-H", "--host", "--config", "--context"],
  aws: ["--profile", "--endpoint-url"],
  git: [
    "--extcmd",
    "--config-env",
    "--exec-path",
    "--upload-pack",
    "--output",
    "--unsafe-paths",
    "--directory",
    "--separate-git-dir",
    "--open-files-in-pager",
    "--httpd",
    "--receive-pack",
    "--access-hook",
  ],
  sh: ["-c"],
  bash: ["-c", "--init-file", "--rcfile"],
  zsh: ["-c"],
  dash: ["-c"],
  ksh: ["-c"],
  ash: ["-c"],
  csh: ["-c"],
  tcsh: ["-c"],
  mksh: ["-c"],
  fish: ["-c", "--command", "-C", "--init-command"],
  python: ["-c"],
  perl: ["-e", "-E", "-M", "-m", "-d", "-d:"],
  ruby: ["-e", "-r", "--require"],
  php: ["-r", "-R", "-B", "-E", "-F", "-d", "-c"],
  bun: ["-e", "--eval", "-p", "--print", "-r", "--preload", "--require", "--import", "-c", "--config"],
  lua: ["-e", "-l"],
  deno: ["--eval", "--eval-file"],
  pwsh: ["-c", "-command", "-ec", "-encodedcommand", "-file"],
  powershell: ["-c", "-command", "-ec", "-encodedcommand", "-file"],
  cmd: ["/c", "/k", "/r"],
  node: [
    "--env-file",
    "--env-file-if-exists",
    "--test-reporter",
    "--run",
    "-e",
    "--eval",
    "-p",
    "--print",
    "-r",
    "--require",
    "--import",
    "--loader",
    "--experimental-loader",
  ],
};
//@ chunk-e6aww6q8.js:1246251-1246331 placement
/**
 * 取命令文本的第一个词（去首尾空白后按空白切开）。
 */
function firstToken(text) {
  return text.replace(/^[ \t]+|[ \t]+$/g, "").split(/[ \t]+/, 1)[0] ?? "";
}
//@ chunk-e6aww6q8.js:1246331-1246615 placement
var PROGRAM_ALIASES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var UNTRUSTED_ENV_ALIASES;
deferInit("chunk-e6aww6q8.js:1246331", () => {
  PROGRAM_ALIASES = {
    nodejs: "node",
    genv: "env",
    gtimeout: "timeout",
    gnice: "nice",
    gnohup: "nohup",
    gstdbuf: "stdbuf",
    gtime: "time",
    gsed: "sed",
    gawk: "awk",
    gxargs: "xargs",
    gmake: "make",
    "bash-static": "bash",
    "pwsh-preview": "pwsh",
    "zsh-static": "zsh",
    "mksh-static": "mksh",
    "static-sh": "sh",
  };
  UNTRUSTED_ENV_ALIASES = new Set(["genv"]);
});
//@ chunk-e6aww6q8.js:1246615-1246677 placement
/**
 * 去掉匹配的后缀；结果为空时返回原串，避免把名字清空。
 */
function stripSuffixIfNonEmpty(text, suffixRe) {
  let replaced = text.replace(suffixRe, "");
  return replaced.length > 0 ? replaced : text;
}
//@ chunk-e6aww6q8.js:1246677-1246921 placement
/**
 * 规范化程序名：取基本名、小写、去掉扩展名与版本后缀，并应用别名表。
 */
function canonicalProgramName(word) {
  let text = (word.split(/[/\\]/).pop() ?? "").toLowerCase();
  let withoutTrailing = stripSuffixIfNonEmpty(text, /[. ]+$/);
  let withoutExtension = stripSuffixIfNonEmpty(withoutTrailing, /\.(?:exe|com|bat|cmd)$/);
  let alias = getOwn(PROGRAM_ALIASES, withoutExtension);
  if (alias !== undefined) return alias;
  let current = withoutExtension;
  for (;;) {
    let withoutVersion = stripSuffixIfNonEmpty(current, /-?[0-9]+(?:\.[0-9]+)*$/);
    if (withoutVersion === current) break;
    current = withoutVersion;
  }
  return getOwn(PROGRAM_ALIASES, current) ?? current;
}
//@ chunk-e6aww6q8.js:1246921-1247534 placement
/**
 * 沙箱排除判断用的解释器表：各解释器带值的短选项、带子命令的程序、Windows shell，以及执行代码字符串的选项（如 -c、-e）。
 */
var INTERPRETER_VALUE_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBCOMMAND_PROGRAMS_2;
var WINDOWS_SHELLS;
var INTERPRETER_CODE_FLAGS;
deferInit("chunk-e6aww6q8.js:1246921", () => {
  INTERPRETER_VALUE_FLAGS = {
    sh: [],
    bash: [],
    zsh: [],
    dash: [],
    ksh: [],
    fish: [],
    python: ["W", "X", "Q", "m"],
    perl: ["C", "D", "F", "i", "I", "x"],
    ruby: ["C", "E", "F", "I", "i", "x"],
    php: ["c", "d", "f"],
    lua: ["l"],
    node: [],
    kubectl: ["n", "s", "o", "l", "c", "k", "L", "v", "e"],
  };
  SUBCOMMAND_PROGRAMS_2 = new Set(["git", "fish", "aws"]);
  WINDOWS_SHELLS = new Set(["pwsh", "powershell", "cmd"]);
  INTERPRETER_CODE_FLAGS = {
    sh: ["-c"],
    bash: ["-c"],
    zsh: ["-c"],
    dash: ["-c"],
    ksh: ["-c"],
    ash: ["-c"],
    csh: ["-c"],
    tcsh: ["-c"],
    mksh: ["-c"],
    fish: ["-c", "-C"],
    python: ["-c"],
    perl: ["-e", "-E", "-M", "-m", "-d"],
    ruby: ["-e", "-r"],
    php: ["-r", "-R", "-B", "-E", "-F", "-d", "-c"],
    bun: ["-e", "-p", "-r", "-c"],
    lua: ["-e"],
    node: ["-e", "-p", "-r"],
    jobs: ["-x"],
    kubectl: ["-s"],
  };
});
//@ chunk-e6aww6q8.js:1247534-1247630 placement
/**
 * git 参数里是否出现 ext:: 或 fd:: 传输协议（会执行外部命令）。
 */
function hasExtProtocolArg(args) {
  return args.slice(1).some((arg) => /(?:^|=)(?:ext|fd)::/i.test(arg.replace(/^['"]/, "")));
}
//@ chunk-e6aww6q8.js:1247630-1247911 placement
var STDIN_INTERPRETERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var STDIN_SCRIPT_TOOLS;
var STDIN_DEVICE_PATHS;
deferInit("chunk-e6aww6q8.js:1247630", () => {
  STDIN_INTERPRETERS = new Set([
    "sh",
    "bash",
    "zsh",
    "dash",
    "ksh",
    "ash",
    "csh",
    "tcsh",
    "mksh",
    "fish",
    "python",
    "perl",
    "ruby",
    "php",
    "node",
    "deno",
    "bun",
    "lua",
    "pwsh",
    "powershell",
    "cmd",
  ]);
  STDIN_SCRIPT_TOOLS = new Set(["make", "at", "batch", "sqlite", "ed", "crontab"]);
  STDIN_DEVICE_PATHS = new Set(["/dev/stdin", "/dev/fd/0", "/proc/self/fd/0"]);
});
//@ chunk-e6aww6q8.js:1247911-1248081 placement
function normalizeDotSegments(path) {
  let segments = [];
  for (let [idx, segment] of path.split("/").entries())
    if (segment === "..") {
      if (segments.length > 1) segments.pop();
    } else if (segment === "." || (segment === "" && idx > 0)) continue;
    else segments.push(segment);
  return segments.join("/");
}
//@ chunk-e6aww6q8.js:1248081-1248258 placement
function isStdinDevicePath(path) {
  if (!path.startsWith("/") && !path.split("/").includes("..")) return false;
  let normalized = normalizeDotSegments(`/${path}`);
  return (
    /^\/dev\/fd\/\d+$/.test(normalized) ||
    /^\/proc\/[^/]+\/fd\/\d+$/.test(normalized) ||
    STDIN_DEVICE_PATHS.has(normalized)
  );
}
//@ chunk-e6aww6q8.js:1248258-1249036 placement
/**
 * 判断解释器或 shell 调用是否会从标准输入读取脚本：无脚本参数、-s/-、-i（交互）、-o shinstdin，或参数为 /dev/stdin 等；make/at 等工具在非管道输入时也算。
 */
function readsScriptFromStdin(program, argv, stdinFed) {
  if (STDIN_SCRIPT_TOOLS.has(program)) return !stdinFed;
  if (!STDIN_INTERPRETERS.has(program)) return false;
  let sliced = argv.slice(1);
  let isWindowsShell = WINDOWS_SHELLS.has(program);
  if (program === "cmd" && !stdinFed && !sliced.some((arg) => /^[-/]{1,2}[ckr]/i.test(arg))) return true;
  let leadingOptions = collectLeadingOptions(argv);
  let optionCount = isWindowsShell
    ? collectLeadingOptions(argv, (arg) =>
        program === "cmd" ? /^[-+/\u2013-\u2015]/.test(arg) : /^[-+\u2013-\u2015]/.test(arg),
      )
    : leadingOptions;
  let sliced_2 = sliced.slice(optionCount.length);
  if (program === "powershell" && sliced.length > 0) return true;
  return (
    (!stdinFed && sliced_2.length === 0) ||
    sliced.length === 0 ||
    (!stdinFed && collectOptionsWithValues(argv).some((option) => hasAnyLowerShortFlag(option, "i"))) ||
    collectOptionsWithValues(argv).some((option) => option === "-" || hasAnyShortFlagChar(option, "s")) ||
    leadingOptions.some((leadingOption, idx, options) => {
      let match = /^[-+][-+]?(?:-)?(.+)$/.exec(leadingOption.startsWith("--") ? leadingOption : "");
      let match_2 = /^[-+][A-Za-z]*?o(.+)$/.exec(leadingOption);
      let optionValue =
        match !== null ? match[1] : /^[-+][A-Za-z]*o$/.test(leadingOption) ? options[idx + 1] : match_2?.[1];
      if (optionValue === undefined) return false;
      let replaced = optionValue.toLowerCase().replaceAll("_", "").replaceAll("-", "");
      return leadingOption.startsWith("+") ? replaced === "noshinstdin" : replaced === "shinstdin";
    }) ||
    sliced.some((arg) => isStdinDevicePath(arg))
  );
}
//@ chunk-e6aww6q8.js:1249036-1249161 placement
var SCRIPT_INTERPRETERS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1249036", () => {
  SCRIPT_INTERPRETERS = new Set([
    "sh",
    "bash",
    "zsh",
    "dash",
    "ksh",
    "ash",
    "csh",
    "tcsh",
    "mksh",
    "fish",
    "python",
    "perl",
    "ruby",
    "php",
    "node",
    "lua",
  ]);
});
//@ chunk-e6aww6q8.js:1249161-1249356 placement
function collectLeadingOptions(argv, isOption = (arg) => arg.startsWith("-") || arg.startsWith("+")) {
  let options = [];
  let sliced = argv.slice(1);
  for (let [idx, arg] of sliced.entries()) {
    if (!isOption(arg)) {
      let previousArg = idx === 0 ? undefined : sliced[idx - 1];
      if (previousArg === undefined || !isOption(previousArg)) return options;
    }
    options.push(arg);
  }
  return options;
}
//@ chunk-e6aww6q8.js:1249356-1249430 placement
/**
 * shell 中会把下一个词当参数或初始化文件的选项（-o、-O、--rcfile、--init-file 等）。
 */
var SHELL_OPTION_ARG_FLAGS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1249356", () => {
  SHELL_OPTION_ARG_FLAGS = new Set(["-o", "+o", "-O", "+O", "-W", "-X", "--rcfile", "--init-file"]);
});
//@ chunk-e6aww6q8.js:1249430-1249634 placement
function collectOptionsWithValues(argv) {
  let options = [];
  let sliced = argv.slice(1);
  for (let idx = 0; idx < sliced.length; idx++) {
    let arg = sliced[idx];
    if (!arg.startsWith("-") && !arg.startsWith("+")) return options;
    options.push(arg);
    if (SHELL_OPTION_ARG_FLAGS.has(arg)) {
      let value = sliced[idx + 1];
      if (value !== undefined) {
        options.push(value);
        idx++;
      }
    }
  }
  return options;
}
//@ chunk-e6aww6q8.js:1249634-1249869 placement
function splitAnsiQuotedWords(text) {
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;
  for (let char of text) {
    if (isEscaped) {
      result += char === "$" ? "\x01" : char;
      isEscaped = false;
      continue;
    }
    if (char === "\\" && !inSingleQuote) {
      isEscaped = true;
      continue;
    }
    if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    }
    if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    result += inSingleQuote && char === "$" ? "\x01" : char;
  }
  return result.split(/[ \t]+/);
}
//@ chunk-e6aww6q8.js:1249869-1250157 placement
function splitMarkingQuotedGlobs(text) {
  if (/\$['"]/.test(text)) return splitAnsiQuotedWords(text);
  let result = "";
  let inSingleQuote = false;
  let inDoubleQuote = false;
  let isEscaped = false;
  for (let char of text) {
    let isQuoted = isEscaped || inSingleQuote || inDoubleQuote;
    if (isEscaped) isEscaped = false;
    else if (char === "\\" && !inSingleQuote) {
      isEscaped = true;
      continue;
    } else if (char === "'" && !inDoubleQuote) {
      inSingleQuote = !inSingleQuote;
      continue;
    } else if (char === '"' && !inSingleQuote) {
      inDoubleQuote = !inDoubleQuote;
      continue;
    }
    result += isQuoted && (char === "[" || char === "?" || char === "*") ? "\x02" : char;
  }
  return result.split(/[ \t]+/);
}
//@ chunk-e6aww6q8.js:1250157-1251258 placement = isDockerSafe (0.772)
/**
 * （旧版名配错，切分错误）判断命令参数能否执行任意代码：解释器 -e/--eval、git config 中可执行的键、docker -H、bun/deno 运行脚本、通配参数等；被输入模式与沙箱排除检查使用。
 */
function isDockerSafe(command, argv, stdinFed = false) {
  let program = canonicalProgramName(argv === undefined ? firstToken(command) : (argv[0] ?? ""));
  let valueOptionRules = getOwn(PROGRAM_VALUE_OPTIONS, program);
  let isWindowsShell = WINDOWS_SHELLS.has(program);
  let isOptionSensitive =
    valueOptionRules !== undefined || SUBCOMMAND_PROGRAMS.has(program) || program === "docker";
  let maskedCommand = stripLiteralQuotedRegions(command);
  if (
    isOptionSensitive &&
    (LAST_ARG_VAR_RE.test(maskedCommand) ||
      LAST_ARG_VAR_RE.test(stripQuotedRegions(command)) ||
      MULTI_DIGIT_POSITIONAL_RE.test(maskedCommand) ||
      hasRiskyBracedExpansion(command, isWindowsShell))
  )
    return true;
  let commandArgv = argv ?? getCommandArgv(command);
  let sliced = stripQuotedRegions(command)
    .split(/[ \t]+/)
    .slice(1);
  let hasGlob = hasUnquotedGlob(command);
  let sliced_2 = stripLiteralQuotedRegions(command)
    .split(/[ \t]+/)
    .slice(1);
  let sliced_3 = splitAnsiQuotedWords(command).slice(1);
  let flagArgs = splitMarkingQuotedGlobs(command).slice(1);
  function normalizeDash(arg) {
    if (!isWindowsShell) return arg;
    return /^[/\u2013-\u2015]/.test(arg) ? `-${arg.slice(1)}` : arg;
  }
  if (
    isOptionSensitive &&
    ([...sliced_2, ...sliced_3].some((arg) => {
      let normalized = normalizeDash(arg);
      return [normalized, normalized.replace(/['"]/g, "")].some(
        (candidate) =>
          VAR_LEADING_OPTION_RE.test(candidate) ||
          OPTION_WITH_VAR_RE.test(candidate) ||
          (isWindowsShell && VAR_SLASH_DOLLAR_RE.test(candidate)),
      );
    }) ||
      [...sliced, ...flagArgs].some((arg) => {
        let normalized = normalizeDash(arg);
        return isGlobbedOption(normalized) || SHORT_GLOB_RE.test(normalized);
      }))
  )
    return true;
  let expandedCommand = expandDefaultValues(command);
  if (valueOptionRules === undefined)
    return (
      (SUBCOMMAND_PROGRAMS.has(program) && matchesExcludedSubcommand(commandArgv, hasGlob)) ||
      isUnsafeBunCommand(program, commandArgv) ||
      isUnsafeDenoCommand(program, commandArgv) ||
      isDockerSafe_2(program, commandArgv) ||
      readsScriptFromStdin(program, commandArgv, stdinFed) ||
      (expandedCommand !== null &&
        ((SUBCOMMAND_PROGRAMS.has(program) && matchesExcludedSubcommand(expandedCommand, hasGlob)) ||
          isUnsafeBunCommand(program, expandedCommand) ||
          isDockerSafe_2(program, expandedCommand) ||
          readsScriptFromStdin(program, expandedCommand, stdinFed)))
    );
  if (
    isExcludedFromSandbox(program, commandArgv, hasGlob, command) ||
    readsScriptFromStdin(program, commandArgv, stdinFed) ||
    (expandedCommand !== null &&
      (isExcludedFromSandbox(program, expandedCommand, hasGlob, command) ||
        readsScriptFromStdin(program, expandedCommand, stdinFed)))
  )
    return true;
  let isWindowsShellProgram = WINDOWS_SHELLS.has(program);
  let codeFlags = getOwn(INTERPRETER_CODE_FLAGS, program) ?? [];
  let valueFlags = getOwn(INTERPRETER_VALUE_FLAGS, program) ?? [];
  let isSubcommandProgram = SUBCOMMAND_PROGRAMS_2.has(program);
  let optionWords = SCRIPT_INTERPRETERS.has(program)
    ? collectLeadingOptions(commandArgv)
    : commandArgv.slice(1);
  return (expandedCommand === null ? [optionWords] : [optionWords, expandedCommand.slice(1)]).some(
    (wordList) =>
      wordList.some((word) =>
        valueOptionRules.some((rule) =>
          optionMatchesRule(
            word,
            rule,
            isWindowsShellProgram,
            codeFlags.includes(rule),
            valueFlags,
            isSubcommandProgram,
          ),
        ),
      ),
  );
}
//@ chunk-e6aww6q8.js:1251258-1251785 placement
/**
 * 判断一个参数是否匹配排除规则中的选项（精确、=值、带冒号前缀、绝对路径包含、长选项缩写、短选项组合），可选大小写与 Unicode 破折号归一。
 */
function optionMatchesRule(option, rule, isWindowsShell, isCodeFlag, valueFlags, isSubcommandProgram) {
  let normalized = isWindowsShell ? option.toLowerCase().replace(/^[\u2013\u2014\u2015]/, "-") : option;
  if (normalized === rule || normalized.startsWith(`${rule}=`)) return true;
  if (rule.endsWith(":") && normalized.startsWith(rule)) return true;
  if (rule.startsWith("/")) return normalized.replace(/^(?:\/\/|-)/, "/").includes(rule);
  if (isSubcommandProgram && rule.startsWith("--")) {
    let optionName = firstLineOf(normalized, "=");
    if (optionName.length > 2 && rule.startsWith(optionName)) return true;
  }
  if (isWindowsShell && normalized.length > 1 && rule.startsWith(normalized)) return true;
  if (!(!rule.startsWith("--") && rule.length === 2)) return false;
  if (isCodeFlag && normalized.startsWith("+")) return shortClusterHasFlag(normalized, rule[1], valueFlags);
  if (normalized.startsWith(rule)) return true;
  if (!isCodeFlag) return false;
  return shortClusterHasFlag(normalized, rule[1], valueFlags);
}
//@ chunk-e6aww6q8.js:1251785-1251919 placement
function shortClusterHasFlag(cluster, flag, valueFlags) {
  let letters = /^[-+]([A-Za-z0-9]*)/.exec(cluster)?.[1] ?? "";
  for (let letter of letters) {
    if (letter === flag) return true;
    if (valueFlags.includes(letter)) return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1251919-1252007 placement
/**
 * 命令里是否含 shell 元字符（$、反引号、引号、通配符等）；PowerShell 额外把反斜杠排除。
 */
function hasShellMetaChar(command, shell = "bash") {
  return (shell === "powershell" ? /[$`'"*?[]/ : /[$`\\'"*?[]/).test(firstToken(command));
}
//@ chunk-e6aww6q8.js:1252007-1252483 placement
/**
 * 去掉命令开头可信的 env 包装与远程集群参数等前缀，返回实际执行的命令文本（遇到 bash 可执行的包装时从该处截取）。
 */
function stripTrustedWrappers(command) {
  let trimmed = command.trim();
  let previous;
  while (trimmed !== previous) {
    previous = trimmed;
    trimmed = stripUnsafeLeadingEnvVars(trimmed);
    if (classifyEnvWrapper(trimmed) === "trusted") {
      trimmed = trimmed.replace(LEADING_WORD_RE, "");
      let previousFlags;
      while (trimmed !== previousFlags) {
        previousFlags = trimmed;
        trimmed = trimmed.replace(REMOTE_CLUSTER_FLAGS, "");
      }
    }
  }
  if (isUnsandboxableProgram(firstToken(trimmed), "bash")) return trimmed;
  trimmed = resolveTransparentWrapperAlias(trimmed);
  let stripped = stripSafeWrappersFromCommand(trimmed);
  let removedPrefix = getRemovedPrefix(trimmed, stripped);
  for (let word of removedPrefix.split(/[ \t]+/)) {
    let replaced = word.replace(/['"\\]/g, "");
    if (replaced.length > 0 && isUnsandboxableProgram(canonicalProgramName(replaced), "bash"))
      return trimmed.slice(removedPrefix.indexOf(word));
  }
  trimmed = stripped;
  if (classifyEnvWrapper(trimmed) === "trusted") {
    let previous;
    while (trimmed !== previous) {
      previous = trimmed;
      trimmed = stripUnsafeLeadingEnvVars(trimmed);
      if (classifyEnvWrapper(trimmed) === "trusted") {
        trimmed = trimmed.replace(LEADING_WORD_RE, "");
        let previousFlags;
        while (trimmed !== previousFlags) {
          previousFlags = trimmed;
          trimmed = trimmed.replace(REMOTE_CLUSTER_FLAGS, "");
        }
      }
    }
  }
  return trimmed;
}
//@ chunk-e6aww6q8.js:1252483-1252541 placement
/**
 * 剥掉不安全环境赋值与安全包装后，返回被去掉的包装前缀。
 */
function strippedCommandPrefix(command) {
  let withoutEnvVars = stripUnsafeLeadingEnvVars(command);
  let command_2 = resolveTransparentWrapperAlias(withoutEnvVars);
  return getRemovedPrefix(withoutEnvVars, stripSafeWrappersFromCommand(command_2));
}
//@ chunk-e6aww6q8.js:1252541-1252633 placement
/**
 * 若命令是透明包装命令的别名（program alias），替换成实际命令名。
 */
function resolveTransparentWrapperAlias(command) {
  let firstWord = firstToken(command);
  let alias = getOwn(PROGRAM_ALIASES, firstWord);
  return alias !== undefined && TRANSPARENT_PREFIX_COMMANDS.has(alias)
    ? alias + command.slice(firstWord.length)
    : command;
}
//@ chunk-e6aww6q8.js:1252633-1252799 placement
function getRemovedPrefix(original, stripped) {
  if (stripped === original) return "";
  let words = [...original.matchAll(/[^ \t]+/g)];
  let strippedWordCount = stripped === "" ? 0 : stripped.split(/[ \t]+/).length;
  let index = words.length - strippedWordCount;
  if (index <= 0) return "";
  return original.slice(0, words[index]?.index);
}
//@ chunk-e6aww6q8.js:1252799-1252839 placement
/**
 * 去引号后文本是否含 Unicode 空白（这类命令不认为能在沙箱外安全运行）。
 */
function hasUnicodeWhitespace(command) {
  return UNICODE_WHITESPACE_RE.test(stripQuotedRegions(command));
}
//@ chunk-e6aww6q8.js:1252839-1253000 placement
/**
 * 判断程序是否无法在沙箱外安全运行（eval 类、awk、执行包装、改变状态的内建等）。
 */
function isUnsandboxableProgram(word, shell) {
  let program = canonicalProgramName(word);
  let builtinName = shell === "bash" ? word : program;
  return (
    EVAL_LIKE_BUILTINS.has(builtinName) ||
    AWK_NAMES.has(program) ||
    UNHANDLED_EXEC_WRAPPERS.has(program) ||
    isStateChangingBuiltin(builtinName) ||
    ZSH_DANGEROUS_BUILTINS.has(builtinName) ||
    COMMAND_RUNNER_PREFIXES.has(program) ||
    DIRECTORY_CHANGE_COMMANDS.has(builtinName) ||
    (shell === "powershell" && POWERSHELL_INVOKE_COMMANDS.has(program))
  );
}
//@ chunk-e6aww6q8.js:1253000-1253309 placement = prependModeCharacterToInput (0.779)
function prependModeCharacterToInput(
  command,
  expandedCommand = command,
  quotedCommand = expandedCommand,
  stdinFed = false,
) {
  return (
    command !== "" &&
    !LEADING_REDIRECTION_RE.test(command.trimStart()) &&
    !LEADING_REDIRECTION_RE.test(expandedCommand.trimStart()) &&
    !hasUnicodeWhitespace(quotedCommand) &&
    !TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(firstToken(command))) &&
    classifyEnvWrapper(command) === "none" &&
    !IFS_EXPANSION_RE.test(stripLiteralQuotedRegions(expandedCommand)) &&
    !command.startsWith("-") &&
    !isUnsandboxableProgram(firstToken(command), "bash") &&
    !isUnsandboxableProgram(firstToken(expandedCommand), "bash") &&
    !ENV_ASSIGNMENT_RE_3.test(command) &&
    !hasShellMetaChar(command, "bash") &&
    !hasShellMetaChar(expandedCommand, "bash") &&
    !isDockerSafe(command, undefined, stdinFed) &&
    (expandedCommand === command || !isDockerSafe(expandedCommand, undefined, stdinFed))
  );
}
//@ chunk-e6aww6q8.js:1253309-1253442 placement
var SIMPLE_ASSIGNMENT_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LOCALE_VARS;
deferInit("chunk-e6aww6q8.js:1253309", () => {
  SIMPLE_ASSIGNMENT_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(?![-+/])([A-Za-z0-9_.:@,+=/-]*)$/;
  LOCALE_VARS = new Set(["LC_ALL", "LC_CTYPE", "LANG", "LANGUAGE", "CHARSET"]);
});
//@ chunk-e6aww6q8.js:1253442-1253553 placement
/**
 * 判断前导赋值是否安全（变量名安全、值不像路径、不是 locale 变量）。
 */
function isSafeLeadingAssignment(text) {
  let match = text.trim().match(SIMPLE_ASSIGNMENT_RE);
  return (
    match !== null &&
    isSafeEnvVarName(match[1]) &&
    !isPathLikeEnvValue(match[2]) &&
    !LOCALE_VARS.has(match[1].toUpperCase())
  );
}
//@ chunk-e6aww6q8.js:1253553-1253833 placement
var IFS_EXPANSION_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var LAST_ARG_VAR_RE;
var VARIABLE_REF_PATTERN;
var VAR_LEADING_OPTION_RE;
var VAR_SLASH_DOLLAR_RE;
var OPTION_WITH_VAR_RE;
deferInit("chunk-e6aww6q8.js:1253553", () => {
  IFS_EXPANSION_RE = /\$\{?IFS\b/;
  LAST_ARG_VAR_RE = /(?:^|[ \t"'])\$\{?_\}?(?=$|[ \t"'])/;
  VARIABLE_REF_PATTERN = String.raw`(?:\$\{[^}]*\}|\$[=^~]*(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!-]))`;
  VAR_LEADING_OPTION_RE = new RegExp(`^(?:${VARIABLE_REF_PATTERN})+[-+\u2013-\u2015](?:[A-Za-z]|\\$)`);
  VAR_SLASH_DOLLAR_RE = new RegExp(`${VARIABLE_REF_PATTERN}/\\$`);
  OPTION_WITH_VAR_RE = new RegExp(`^[-+]{1,2}[^=]*${VARIABLE_REF_PATTERN}`);
});
//@ chunk-e6aww6q8.js:1253833-1254334 placement
/**
 * 判断命令中的 ${...} 展开是否有风险：间接展开、特殊/位置参数、默认值中含变量、选项形状或通配字符。
 */
function hasRiskyBracedExpansion(command, isWindowsShell) {
  for (let body of liveBracedExpansionBodies(command)) {
    if (body.startsWith("!")) return true;
    let match = /^#?([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*])/.exec(body);
    if (match === null) return true;
    let sliced = body.slice(match[0].length);
    if (/^(?:_|[0-9]+)$/.test(match[1])) return true;
    let match_2 = /^:?[-+=?]/.exec(sliced);
    if (match_2 !== null) {
      let trimmed = sliced.slice(match_2[0].length).trim();
      if (trimmed.includes("$")) return true;
      if (
        trimmed.split(/[ \t]+/).some((word) => {
          let replaced = word.replace(/['"\\]/g, "");
          return (
            (isWindowsShell ? /^[-+/\u2013-\u2015]/.test(replaced) : /^[-+]/.test(replaced)) ||
            /[[*?]/.test(replaced)
          );
        })
      )
        return true;
      continue;
    }
    if (sliced.length > 0) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1254334-1254391 placement
/**
 * 匹配 $0–$9 形式的数字位置参数引用。
 */
var MULTI_DIGIT_POSITIONAL_RE = /(?:^|[ \t"'])\$[=^~]*\{?[0-9]+\}?(?=$|[ \t"'])/;
//@ chunk-e6aww6q8.js:1254391-1254515 placement
function isGlobbedOption(word) {
  if (!/^[-+]/.test(word)) return false;
  let globIdx = word.search(/[[?*]/);
  if (globIdx < 0) return false;
  let assignOrSlashIdx = word.search(/[=/]/);
  return assignOrSlashIdx < 0 || globIdx < assignOrSlashIdx;
}
//@ chunk-e6aww6q8.js:1254515-1254653 placement
var SHORT_GLOB_RE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CONTROL_FLOW_BUILTINS;
var READ_BUILTINS;
deferInit("chunk-e6aww6q8.js:1254515", () => {
  SHORT_GLOB_RE = /^\[[^\]]*\]|^\?[^ \t]{0,3}$|^\*[A-Za-z]$/;
  CONTROL_FLOW_BUILTINS = new Set(["exit", "return", "break", "continue", "bye", "logout"]);
  READ_BUILTINS = new Set(["read"]);
});
//@ chunk-e6aww6q8.js:1254653-1254757 placement
function isStateChangingBuiltin(name) {
  if (READ_BUILTINS.has(name)) return true;
  if (!DECLARATION_LIKE_BUILTINS.has(name)) return false;
  if (ZSH_DANGEROUS_BUILTINS.has(name)) return true;
  return !CONTROL_FLOW_BUILTINS.has(name);
}
//@ chunk-e6aww6q8.js:1254757-1255778 placement
/**
 * 需要按子命令判断是否排除沙箱的程序（git/deno/bun）。
 */
var SANDBOX_EXCLUDED_SUBCOMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SUBCOMMAND_PROGRAMS;
var GIT_SUBCOMMAND_EXCLUSIONS;
var PYTHON_SUBCOMMAND_EXCLUSIONS;
var TENGU_MOSSY_CRAYON;
deferInit("chunk-e6aww6q8.js:1254757", () => {
  SANDBOX_EXCLUDED_SUBCOMMANDS = [
    ["bisect", "run"],
    ["submodule", "foreach"],
    ["deno", "eval"],
    ["deno", "task"],
    ["bun", "run"],
    ["hook", "run"],
  ];
  SUBCOMMAND_PROGRAMS = new Set(["git", "deno", "bun"]);
  GIT_SUBCOMMAND_EXCLUSIONS = {
    git: [
      ["-x", ["rebase", "difftool"]],
      ["-d", ["instaweb"]],
      ["--file", ["config"]],
      ["-f", ["config"]],
      ["--prefix", ["checkout-index"]],
      ["-o", ["archive", "format-patch"]],
      ["--output-directory", ["format-patch"]],
      ["--rename-section", ["config"]],
      ["rename-section", ["config"]],
      ["--template", ["clone", "init"]],
      ["-c", ["clone"]],
      ["--config", ["clone"]],
      ["edit", ["config"]],
      ["--edit", ["config"]],
      ["-e", ["config"]],
      ["-O", ["grep"]],
      ["--tree-filter", ["filter-branch"]],
      ["--index-filter", ["filter-branch"]],
      ["--msg-filter", ["filter-branch"]],
      ["--env-filter", ["filter-branch"]],
      ["--commit-filter", ["filter-branch"]],
      ["--parent-filter", ["filter-branch"]],
      ["--tag-name-filter", ["filter-branch"]],
      ["--setup", ["filter-branch"]],
      ["--sendmail-cmd", ["send-email"]],
      ["--smtp-server", ["send-email"]],
      ["--to-cmd", ["send-email"]],
      ["--cc-cmd", ["send-email"]],
    ],
  };
  PYTHON_SUBCOMMAND_EXCLUSIONS = ["-u", ["clone"]];
  TENGU_MOSSY_CRAYON = "tengu_mossy_crayon";
});
//@ chunk-e6aww6q8.js:1255778-1255818 placement
/**
 * 读取 tengu_mossy_crayon 开关：是否按子命令排除沙箱。
 */
function isSubcommandExclusionEnabled() {
  return readFlagWithOverride(TENGU_MOSSY_CRAYON, {
    safe: true,
  });
}
//@ chunk-e6aww6q8.js:1255818-1256566 placement
/**
 * 会执行外部程序或读取任意文件的 git 配置键前缀（alias.、core.sshcommand、include. 等）。
 */
var GIT_UNSAFE_CONFIG_KEYS = {
  clone: ["b", "o", "j", "u"],
  rebase: ["C", "S", "X", "s"],
  difftool: ["t"],
  instaweb: ["b", "m", "p"],
  config: [],
  archive: [],
  "format-patch": ["v"],
  grep: ["e", "f", "A", "B", "C", "m"],
};
var GIT_UNSAFE_CONFIG_PREFIXES = [
  "alias.",
  "core.fsmonitor",
  "core.sshcommand",
  "core.pager",
  "core.editor",
  "core.hookspath",
  "core.gitproxy",
  "sendemail.",
  "diff.",
  "difftool.",
  "merge.",
  "mergetool.",
  "filter.",
  "sequence.",
  "uploadpack.",
  "receivepack.",
  "credential.",
  "init.templatedir",
  "gpg.",
  "pager.",
  "browser.",
  "ssh.",
  "protocol.allow",
  "protocol.ext.",
  "protocol.fd.",
  "include.",
  "includeif.",
  "core.askpass",
  "core.alternaterefscommand",
  "trailer.",
  "imap.",
  "interactive.difffilter",
  "instaweb.",
  "man.",
  "guitool.",
];
var GIT_UNSAFE_CONFIG_PATTERNS = [/^remote\..+\.(?:uploadpack|receivepack|vcs)$/, /^submodule\..+\.update$/];
var TENGU_PEPPY_NAUTILUS = "tengu_peppy_nautilus";
//@ chunk-e6aww6q8.js:1256566-1256606 placement
/**
 * 读取 tengu_peppy_nautilus 开关：是否检查 git clone/init/worktree 等建仓路径的风险。
 */
function isGitCreatePathCheckEnabled() {
  return readFlagWithOverride(TENGU_PEPPY_NAUTILUS, {
    safe: true,
  });
}
//@ chunk-e6aww6q8.js:1256606-1257030 placement
/**
 * 判断 git 子命令（clone/init/worktree add|move/bundle create 等）是否会在有风险的路径创建仓库或文件。
 */
function gitCreatesRepoAtRiskyPath(argv) {
  let sliced = argv.slice(1);
  let flattened = sliced.flatMap((word, idx) => (word.startsWith("-") ? [] : [idx]));
  let mapped = flattened.map((index) => sliced[index]);
  let argsAfter = (idx) =>
    isGitCreatePathCheckEnabled() ? sliced.slice(flattened[idx] + 1) : mapped.slice(idx + 1);
  return mapped.some((word, idx) => {
    let pathCandidates;
    switch (normalizeConfigKey(word)) {
      case "clone":
      case "init":
        pathCandidates = argsAfter(idx);
        break;
      case "worktree": {
        let nextWord = mapped[idx + 1];
        let nextKey = nextWord === undefined ? undefined : normalizeConfigKey(nextWord);
        pathCandidates = nextKey === "add" || nextKey === "move" ? argsAfter(idx + 1) : [];
        break;
      }
      case "bundle": {
        let nextWord = mapped[idx + 1];
        pathCandidates =
          nextWord !== undefined && normalizeConfigKey(nextWord) === "create" ? argsAfter(idx + 1) : [];
        break;
      }
      default:
        return false;
    }
    return pathCandidates.some(looksLikeEscapingPath);
  });
}
//@ chunk-e6aww6q8.js:1257030-1257126 placement
/**
 * 路径是绝对路径、带盘符或含 “..” 段时返回 true。
 */
function looksLikeEscapingPath(path) {
  return /^[/\\~$]/.test(path) || /^[A-Za-z]:/.test(path) || path.split(/[/\\]/).includes("..");
}
//@ chunk-e6aww6q8.js:1257126-1257182 affinity
/**
 * 把配置键规整为 NFKC 小写，便于比较。
 */
function normalizeConfigKey(key) {
  return key.normalize("NFKC").toLowerCase();
}
//@ chunk-e6aww6q8.js:1257695-1257890 affinity
function setsRiskyGitConfig(argv) {
  if (!argv.some((word) => normalizeConfigKey(word) === "config")) return false;
  return argv.some((word, idx) => {
    if (idx >= argv.length - 1) return false;
    let lower = word.toLowerCase();
    return (
      GIT_UNSAFE_CONFIG_PREFIXES.some((prefix) => lower.startsWith(prefix)) ||
      GIT_UNSAFE_CONFIG_PATTERNS.some((pattern) => pattern.test(lower))
    );
  });
}
//@ chunk-e6aww6q8.js:1257890-1258112 placement
function expandDefaultValues(command) {
  let replaced = command.replace(
    /\$\{(?:[A-Za-z_][A-Za-z0-9_]*|[@*]):?[-+=]([^}]*)\}/g,
    (match, defaultValue) => defaultValue,
  );
  if (replaced === command) return null;
  let args = [];
  for (let arg of replaced.split(/[ \t]+/)) {
    let replaced = arg.replace(/['"\\]/g, "");
    if (replaced.length > 0) args.push(replaced);
  }
  return args;
}
//@ chunk-e6aww6q8.js:1258112-1258331 placement
/**
 * 汇总判断命令是否应排除在沙箱外：子命令规则、bun/deno 非安全子命令、docker、git 的各类危险全局选项/config/clone 路径/通配等。
 */
function isExcludedFromSandbox(program, argv, hasGlob, stdinFed) {
  return (
    matchesExcludedSubcommand(argv, hasGlob) ||
    isUnsafeBunCommand(program, argv) ||
    isUnsafeDenoCommand(program, argv) ||
    isDockerSafe_2(program, argv) ||
    isGitArgMatchingFlagRule(program, argv) ||
    (program === "git" && hasGitShortGlobalOption(argv)) ||
    (program === "git" && hasDangerousGitGlobalOption(argv, stdinFed)) ||
    (program === "git" && hasGlob && hasGlobAroundGitSubcommand(argv)) ||
    (program === "git" && setsRiskyGitConfig(argv)) ||
    (program === "git" && hasExtProtocolArg(argv)) ||
    (program === "git" && gitCreatesRepoAtRiskyPath(argv)) ||
    (program === "git" && hasGlob && hasGitGlobArgument(argv))
  );
}
//@ chunk-e6aww6q8.js:1258331-1258673 placement
/**
 * bun 与 deno 中可在沙箱外安全运行的子命令集合。
 */
var SAFE_BUN_SUBCOMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_DENO_SUBCOMMANDS;
deferInit("chunk-e6aww6q8.js:1258331", () => {
  SAFE_BUN_SUBCOMMANDS = new Set([
    "install",
    "i",
    "add",
    "remove",
    "rm",
    "update",
    "outdated",
    "link",
    "unlink",
    "init",
    "upgrade",
    "test",
    "patch",
    "why",
    "audit",
    "info",
    "run",
  ]);
  SAFE_DENO_SUBCOMMANDS = new Set([
    "test",
    "bench",
    "add",
    "remove",
    "uninstall",
    "cache",
    "check",
    "doc",
    "fmt",
    "info",
    "init",
    "lint",
    "lsp",
    "outdated",
    "publish",
    "types",
    "upgrade",
    "vendor",
    "completions",
    "coverage",
    "bundle",
  ]);
});
//@ chunk-e6aww6q8.js:1258673-1258909 placement
function isUnsafeDenoCommand(program, argv) {
  if (program !== "deno") return false;
  let sliced = argv.slice(1);
  for (let [idx, word] of sliced.entries()) {
    if (word.startsWith("-")) continue;
    let previousWord = idx === 0 ? undefined : sliced[idx - 1];
    if (previousWord !== undefined && previousWord.startsWith("-")) {
      if (!SAFE_DENO_SUBCOMMANDS.has(word)) return true;
      continue;
    }
    return !SAFE_DENO_SUBCOMMANDS.has(word);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1258909-1259031 placement
function isUnsafeBunCommand(program, argv) {
  if (program !== "bun") return false;
  for (let word of argv.slice(1)) {
    if (word.startsWith("-")) continue;
    return !SAFE_BUN_SUBCOMMANDS.has(word);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1259031-1259665 placement
/**
 * docker 子命令集合、带值的短选项与安全的全局选项，用于判断 docker 命令是否排除在沙箱外。
 */
var DOCKER_SUBCOMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DOCKER_VALUE_SHORT_FLAGS;
var DOCKER_SAFE_GLOBAL_FLAGS;
deferInit("chunk-e6aww6q8.js:1259031", () => {
  DOCKER_SUBCOMMANDS = new Set([
    "run",
    "ps",
    "exec",
    "build",
    "buildx",
    "builder",
    "images",
    "image",
    "container",
    "pull",
    "push",
    "rm",
    "rmi",
    "logs",
    "inspect",
    "stop",
    "start",
    "restart",
    "kill",
    "cp",
    "commit",
    "tag",
    "login",
    "logout",
    "network",
    "volume",
    "system",
    "version",
    "compose",
    "context",
    "stats",
    "top",
    "pause",
    "unpause",
    "wait",
    "port",
    "diff",
    "export",
    "import",
    "save",
    "load",
    "search",
    "attach",
    "create",
    "update",
    "events",
    "history",
    "init",
    "manifest",
    "plugin",
    "secret",
    "service",
    "node",
    "config",
    "swarm",
    "stack",
    "trust",
    "checkpoint",
    "scout",
    "desktop",
    "extension",
    "sbom",
  ]);
  DOCKER_VALUE_SHORT_FLAGS = ["c", "H", "l"];
  DOCKER_SAFE_GLOBAL_FLAGS = new Set(["-D", "--debug", "--tls", "--tlsverify", "-v", "--version", "--help"]);
});
//@ chunk-e6aww6q8.js:1259665-1259967 placement = isDockerSafe (0.772)
function isDockerSafe_2(program, argv) {
  if (program !== "docker") return false;
  let sliced = argv.slice(1);
  let subcommandEnd = sliced.length;
  for (let idx = 0; idx < sliced.length; idx++) {
    let config = sliced[idx];
    if (!config.startsWith("-")) {
      if (DOCKER_SUBCOMMANDS.has(config.toLowerCase())) {
        subcommandEnd = idx;
        break;
      }
      continue;
    }
    if (!config.includes("=") && !DOCKER_SAFE_GLOBAL_FLAGS.has(config)) idx++;
  }
  return sliced
    .slice(0, subcommandEnd)
    .some(
      (flag) =>
        flag.startsWith("-") &&
        ["c", "H"].some((letter) => shortClusterHasFlag(flag, letter, DOCKER_VALUE_SHORT_FLAGS)),
    );
}
//@ chunk-e6aww6q8.js:1259967-1260169 placement
function matchesExcludedSubcommand(argv, hasGlob) {
  return SANDBOX_EXCLUDED_SUBCOMMANDS.some(([program, subcommand]) =>
    argv.some((word, idx) => {
      if (canonicalProgramName(word) !== program) return false;
      for (let idx_2 = idx + 1; idx_2 < argv.length; idx_2++) {
        let word = argv[idx_2];
        if (canonicalProgramName(word) === subcommand || (hasGlob && GLOB_CHAR_RE.test(word))) return true;
        if (!word.startsWith("-")) return false;
      }
      return false;
    }),
  );
}
//@ chunk-e6aww6q8.js:1260169-1260185 placement
/**
 * 通配字符正则 [[*?]。
 */
var GLOB_CHAR_RE = /[[*?]/;
//@ chunk-e6aww6q8.js:1260185-1260386 placement
function hasGitGlobArgument(argv) {
  return argv.some((word, idx) => {
    let key = normalizeConfigKey(word);
    if (key !== "config" && key !== "worktree" && key !== "bundle") return false;
    let scansAllArgs = key !== "config" && isGitCreatePathCheckEnabled();
    return argv
      .slice(idx + 1)
      .some((word) => (scansAllArgs || !word.startsWith("-")) && GLOB_CHAR_RE.test(word));
  });
}
//@ chunk-e6aww6q8.js:1260386-1260426 placement
/**
 * 去引号后的文本是否含通配符。
 */
function hasUnquotedGlob(command) {
  return GLOB_CHAR_RE.test(stripQuotedRegions(command));
}
//@ chunk-e6aww6q8.js:1260426-1260478 placement = DANGEROUS_GIT_GLOBAL_FLAGS (0.549)
/**
 * 危险 git 全局选项：-c、-C、--git-dir、--work-tree。被 utils/git.ts 等使用。
 */
var GIT_SHORT_GLOBAL_OPTIONS = ["-c", "-C"];
var GIT_LONG_GLOBAL_OPTIONS = ["--git-dir", "--work-tree"];
//@ chunk-e6aww6q8.js:1260971-1261054 placement
/**
 * git 子命令前是否出现 -c/-C 全局选项。
 */
function hasGitShortGlobalOption(argv) {
  return argv
    .slice(1, findGitSubcommandIndex(argv))
    .some((word) => GIT_SHORT_GLOBAL_OPTIONS.some((option) => word.startsWith(option)));
}
//@ chunk-e6aww6q8.js:1261054-1261133 placement
/**
 * git 子命令本身或其路径参数是否含通配符。
 */
function hasGlobAroundGitSubcommand(argv) {
  return [getGitSubcommandPath(argv)[0], argv[findGitSubcommandIndex(argv)]].some(
    (word) => word !== undefined && GLOB_CHAR_RE.test(word),
  );
}
//@ chunk-e6aww6q8.js:1261133-1261268 placement
/**
 * 在 git argv 中跳过全局选项，返回子命令下标。
 */
function findGitSubcommandIndex(argv) {
  let idx = 1;
  while (idx < argv.length) {
    let word = argv[idx];
    if (!word.startsWith("-")) return idx;
    idx += word.includes("=") || SAFE_GIT_GLOBAL_FLAGS.has(word) ? 1 : 2;
  }
  return argv.length;
}
//@ chunk-e6aww6q8.js:1262797-1262870 placement
/**
 * 去掉数组中的空串与纯空白项（当前无引用，保留为辅助函数）。
 */
function compactNonBlank(values) {
  return values.filter((value) => typeof value === "string" && value.trim() !== "");
}
export {
  GIT_SUBCOMMAND_EXCLUSIONS,
  isSubcommandExclusionEnabled,
  PYTHON_SUBCOMMAND_EXCLUSIONS,
  normalizeConfigKey,
  SUBCOMMAND_PROGRAMS_2,
  GIT_UNSAFE_CONFIG_KEYS,
  optionMatchesRule,
  findGitSubcommandIndex,
  GIT_LONG_GLOBAL_OPTIONS,
  stripTrustedWrappers,
  firstToken,
  isSafeLeadingAssignment,
  hasUnicodeWhitespace,
  prependModeCharacterToInput,
  strippedCommandPrefix,
  UNSAFE_ARG_CHARS_RE,
  BLANK_RE,
  canonicalProgramName,
  classifyEnvWrapper,
  AT_VARIABLE_RE,
  hasShellMetaChar,
  isUnsandboxableProgram,
  isDockerSafe,
  SHELL_META_RE,
  UNSAFE_PATH_CHARS_RE_2,
};
