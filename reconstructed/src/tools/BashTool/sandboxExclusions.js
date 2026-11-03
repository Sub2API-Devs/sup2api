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

//@ chunk-e6aww6q8.js:1244293-1244648 placement
/**
 * 沙箱排除判断用常量：shell 元字符、Unicode 空白、需拒绝的字符、@变量名、空白分隔与前导词正则、可信的 env 路径。
 */
var SHELL_META_RE = /[;|&`$(){}<>#\n\r]/;
var UNICODE_SPACE_RE_2 = new RegExp(`\x85|${UNICODE_WHITESPACE_RE.source}`);
var UNSAFE_ARG_CHARS_RE = new RegExp(
  `${SHELL_META_RE.source}|[,%]|['"\u2013-\u2015\u2018-\u201B\u201C-\u201E]|${UNICODE_SPACE_RE_2.source}|${CONTROL_CHAR_RE_2.source}`,
);
var UNSAFE_PATH_CHARS_RE_2 = new RegExp(
  `[,%\u2013-\u2015]|${UNICODE_SPACE_RE_2.source}|${CONTROL_CHAR_RE_2.source}`,
);
var AT_VARIABLE_RE = /^@[A-Za-z_][A-Za-z0-9_:]*$/;
var BLANK_RE = /[ \t]+/;
var LEADING_WORD_RE = /^([^ \t]*)[ \t]+/;
var TRUSTED_ENV_PATHS = new Set(["env", "/bin/env", "/usr/bin/env"]);
//@ chunk-e6aww6q8.js:1244648-1244836 placement
function normalizeEnvPath(e) {
  if (e.startsWith("//")) return e;
  let n = e.startsWith("/");
  let replaced = e
    .replace(/\/+/g, "/")
    .replace(/(?:^|\/)\.(?=\/)/g, "")
    .replace(/\/+/g, "/");
  if (n) return replaced;
  return e.includes("/") ? e : replaced;
}
//@ chunk-e6aww6q8.js:1244836-1245040 placement
/**
 * 分类 env 包装命令：不是 env、可信路径下的 env 或不可信的 env。
 */
function classifyEnvWrapper(e) {
  let n = firstToken(e);
  if (canonicalProgramName(n) !== "env") return "none";
  let lower = (n.split(/[/\\]/).pop() ?? "").toLowerCase();
  if (UNTRUSTED_ENV_ALIASES.has(lower.replace(/[. ]+$/, ""))) return "untrusted";
  return TRUSTED_ENV_PATHS.has(normalizeEnvPath(n)) ? "trusted" : "untrusted";
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
function firstToken(e) {
  return e.replace(/^[ \t]+|[ \t]+$/g, "").split(/[ \t]+/, 1)[0] ?? "";
}
//@ chunk-e6aww6q8.js:1246331-1246615 placement
var PROGRAM_ALIASES = {
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
var UNTRUSTED_ENV_ALIASES = new Set(["genv"]);
//@ chunk-e6aww6q8.js:1246615-1246677 placement
/**
 * 去掉匹配的后缀；结果为空时返回原串，避免把名字清空。
 */
function stripSuffixIfNonEmpty(e, n) {
  let replaced = e.replace(n, "");
  return replaced.length > 0 ? replaced : e;
}
//@ chunk-e6aww6q8.js:1246677-1246921 placement
/**
 * 规范化程序名：取基本名、小写、去掉扩展名与版本后缀，并应用别名表。
 */
function canonicalProgramName(e) {
  let lower = (e.split(/[/\\]/).pop() ?? "").toLowerCase();
  let r = stripSuffixIfNonEmpty(lower, /[. ]+$/);
  let s = stripSuffixIfNonEmpty(r, /\.(?:exe|com|bat|cmd)$/);
  let h = getOwn(PROGRAM_ALIASES, s);
  if (h !== undefined) return h;
  let y = s;
  for (;;) {
    let S = stripSuffixIfNonEmpty(y, /-?[0-9]+(?:\.[0-9]+)*$/);
    if (S === y) break;
    y = S;
  }
  return getOwn(PROGRAM_ALIASES, y) ?? y;
}
//@ chunk-e6aww6q8.js:1246921-1247534 placement
/**
 * 沙箱排除判断用的解释器表：各解释器带值的短选项、带子命令的程序、Windows shell，以及执行代码字符串的选项（如 -c、-e）。
 */
var INTERPRETER_VALUE_FLAGS = {
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
var SUBCOMMAND_PROGRAMS_2 = new Set(["git", "fish", "aws"]);
var WINDOWS_SHELLS = new Set(["pwsh", "powershell", "cmd"]);
var INTERPRETER_CODE_FLAGS = {
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
//@ chunk-e6aww6q8.js:1247534-1247630 placement
/**
 * git 参数里是否出现 ext:: 或 fd:: 传输协议（会执行外部命令）。
 */
function hasExtProtocolArg(e) {
  return e.slice(1).some((n) => /(?:^|=)(?:ext|fd)::/i.test(n.replace(/^['"]/, "")));
}
//@ chunk-e6aww6q8.js:1247630-1247911 placement
var STDIN_INTERPRETERS = new Set([
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
var STDIN_SCRIPT_TOOLS = new Set(["make", "at", "batch", "sqlite", "ed", "crontab"]);
var STDIN_DEVICE_PATHS = new Set(["/dev/stdin", "/dev/fd/0", "/proc/self/fd/0"]);
//@ chunk-e6aww6q8.js:1247911-1248081 placement
function normalizeDotSegments(e) {
  let n = [];
  for (let [r, s] of e.split("/").entries())
    if (s === "..") {
      if (n.length > 1) n.pop();
    } else if (s === "." || (s === "" && r > 0)) continue;
    else n.push(s);
  return n.join("/");
}
//@ chunk-e6aww6q8.js:1248081-1248258 placement
function isStdinDevicePath(e) {
  if (!e.startsWith("/") && !e.split("/").includes("..")) return false;
  let n = normalizeDotSegments(`/${e}`);
  return /^\/dev\/fd\/\d+$/.test(n) || /^\/proc\/[^/]+\/fd\/\d+$/.test(n) || STDIN_DEVICE_PATHS.has(n);
}
//@ chunk-e6aww6q8.js:1248258-1249036 placement
/**
 * 判断解释器或 shell 调用是否会从标准输入读取脚本：无脚本参数、-s/-、-i（交互）、-o shinstdin，或参数为 /dev/stdin 等；make/at 等工具在非管道输入时也算。
 */
function readsScriptFromStdin(e, n, r) {
  if (STDIN_SCRIPT_TOOLS.has(e)) return !r;
  if (!STDIN_INTERPRETERS.has(e)) return false;
  let sliced = n.slice(1);
  let h = WINDOWS_SHELLS.has(e);
  if (e === "cmd" && !r && !sliced.some((L) => /^[-/]{1,2}[ckr]/i.test(L))) return true;
  let leadingOptions = collectLeadingOptions(n);
  let S = h
    ? collectLeadingOptions(n, (L) =>
        e === "cmd" ? /^[-+/\u2013-\u2015]/.test(L) : /^[-+\u2013-\u2015]/.test(L),
      )
    : leadingOptions;
  let sliced_2 = sliced.slice(S.length);
  if (e === "powershell" && sliced.length > 0) return true;
  return (
    (!r && sliced_2.length === 0) ||
    sliced.length === 0 ||
    (!r && collectOptionsWithValues(n).some((L) => hasAnyLowerShortFlag(L, "i"))) ||
    collectOptionsWithValues(n).some((L) => L === "-" || hasAnyShortFlagChar(L, "s")) ||
    leadingOptions.some((leadingOption, G, q) => {
      let match = /^[-+][-+]?(?:-)?(.+)$/.exec(leadingOption.startsWith("--") ? leadingOption : "");
      let match_2 = /^[-+][A-Za-z]*?o(.+)$/.exec(leadingOption);
      let ke = match !== null ? match[1] : /^[-+][A-Za-z]*o$/.test(leadingOption) ? q[G + 1] : match_2?.[1];
      if (ke === undefined) return false;
      let replaced = ke.toLowerCase().replaceAll("_", "").replaceAll("-", "");
      return leadingOption.startsWith("+") ? replaced === "noshinstdin" : replaced === "shinstdin";
    }) ||
    sliced.some((L) => isStdinDevicePath(L))
  );
}
//@ chunk-e6aww6q8.js:1249036-1249161 placement
var SCRIPT_INTERPRETERS = new Set([
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
//@ chunk-e6aww6q8.js:1249161-1249356 placement
function collectLeadingOptions(e, n = (r) => r.startsWith("-") || r.startsWith("+")) {
  let r = [];
  let sliced = e.slice(1);
  for (let [h, y] of sliced.entries()) {
    if (!n(y)) {
      let S = h === 0 ? undefined : sliced[h - 1];
      if (S === undefined || !n(S)) return r;
    }
    r.push(y);
  }
  return r;
}
//@ chunk-e6aww6q8.js:1249356-1249430 placement
/**
 * shell 中会把下一个词当参数或初始化文件的选项（-o、-O、--rcfile、--init-file 等）。
 */
var SHELL_OPTION_ARG_FLAGS = new Set(["-o", "+o", "-O", "+O", "-W", "-X", "--rcfile", "--init-file"]);
//@ chunk-e6aww6q8.js:1249430-1249634 placement
function collectOptionsWithValues(e) {
  let n = [];
  let sliced = e.slice(1);
  for (let idx = 0; idx < sliced.length; idx++) {
    let h = sliced[idx];
    if (!h.startsWith("-") && !h.startsWith("+")) return n;
    n.push(h);
    if (SHELL_OPTION_ARG_FLAGS.has(h)) {
      let y = sliced[idx + 1];
      if (y !== undefined) {
        n.push(y);
        idx++;
      }
    }
  }
  return n;
}
//@ chunk-e6aww6q8.js:1249634-1249869 placement
function splitAnsiQuotedWords(e) {
  let n = "";
  let r = false;
  let s = false;
  let h = false;
  for (let y of e) {
    if (h) {
      n += y === "$" ? "\x01" : y;
      h = false;
      continue;
    }
    if (y === "\\" && !r) {
      h = true;
      continue;
    }
    if (y === "'" && !s) {
      r = !r;
      continue;
    }
    if (y === '"' && !r) {
      s = !s;
      continue;
    }
    n += r && y === "$" ? "\x01" : y;
  }
  return n.split(/[ \t]+/);
}
//@ chunk-e6aww6q8.js:1249869-1250157 placement
function splitMarkingQuotedGlobs(e) {
  if (/\$['"]/.test(e)) return splitAnsiQuotedWords(e);
  let n = "";
  let r = false;
  let s = false;
  let h = false;
  for (let y of e) {
    let S = h || r || s;
    if (h) h = false;
    else if (y === "\\" && !r) {
      h = true;
      continue;
    } else if (y === "'" && !s) {
      r = !r;
      continue;
    } else if (y === '"' && !r) {
      s = !s;
      continue;
    }
    n += S && (y === "[" || y === "?" || y === "*") ? "\x02" : y;
  }
  return n.split(/[ \t]+/);
}
//@ chunk-e6aww6q8.js:1250157-1251258 placement = isDockerSafe (0.772)
/**
 * （旧版名配错，切分错误）判断命令参数能否执行任意代码：解释器 -e/--eval、git config 中可执行的键、docker -H、bun/deno 运行脚本、通配参数等；被输入模式与沙箱排除检查使用。
 */
function isDockerSafe(e, n, r = false) {
  let s = canonicalProgramName(n === undefined ? firstToken(e) : (n[0] ?? ""));
  let h = getOwn(PROGRAM_VALUE_OPTIONS, s);
  let y = WINDOWS_SHELLS.has(s);
  let S = h !== undefined || SUBCOMMAND_PROGRAMS.has(s) || s === "docker";
  let w = stripLiteralQuotedRegions(e);
  if (
    S &&
    (LAST_ARG_VAR_RE.test(w) ||
      LAST_ARG_VAR_RE.test(stripQuotedRegions(e)) ||
      MULTI_DIGIT_POSITIONAL_RE.test(w) ||
      hasRiskyBracedExpansion(e, y))
  )
    return true;
  let L = n ?? getCommandArgv(e);
  let sliced = stripQuotedRegions(e)
    .split(/[ \t]+/)
    .slice(1);
  let q = hasUnquotedGlob(e);
  let sliced_2 = stripLiteralQuotedRegions(e)
    .split(/[ \t]+/)
    .slice(1);
  let sliced_3 = splitAnsiQuotedWords(e).slice(1);
  let flagArgs = splitMarkingQuotedGlobs(e).slice(1);
  function we(Je) {
    if (!y) return Je;
    return /^[/\u2013-\u2015]/.test(Je) ? `-${Je.slice(1)}` : Je;
  }
  if (
    S &&
    ([...sliced_2, ...sliced_3].some((Je) => {
      let nt = we(Je);
      return [nt, nt.replace(/['"]/g, "")].some(
        (pt) =>
          VAR_LEADING_OPTION_RE.test(pt) ||
          OPTION_WITH_VAR_RE.test(pt) ||
          (y && VAR_SLASH_DOLLAR_RE.test(pt)),
      );
    }) ||
      [...sliced, ...flagArgs].some((Je) => {
        let nt = we(Je);
        return isGlobbedOption(nt) || SHORT_GLOB_RE.test(nt);
      }))
  )
    return true;
  let Ee = expandDefaultValues(e);
  if (h === undefined)
    return (
      (SUBCOMMAND_PROGRAMS.has(s) && matchesExcludedSubcommand(L, q)) ||
      isUnsafeBunCommand(s, L) ||
      isUnsafeDenoCommand(s, L) ||
      isDockerSafe_2(s, L) ||
      readsScriptFromStdin(s, L, r) ||
      (Ee !== null &&
        ((SUBCOMMAND_PROGRAMS.has(s) && matchesExcludedSubcommand(Ee, q)) ||
          isUnsafeBunCommand(s, Ee) ||
          isDockerSafe_2(s, Ee) ||
          readsScriptFromStdin(s, Ee, r)))
    );
  if (
    isExcludedFromSandbox(s, L, q, e) ||
    readsScriptFromStdin(s, L, r) ||
    (Ee !== null && (isExcludedFromSandbox(s, Ee, q, e) || readsScriptFromStdin(s, Ee, r)))
  )
    return true;
  let Ae = WINDOWS_SHELLS.has(s);
  let Ie = getOwn(INTERPRETER_CODE_FLAGS, s) ?? [];
  let Me = getOwn(INTERPRETER_VALUE_FLAGS, s) ?? [];
  let We = SUBCOMMAND_PROGRAMS_2.has(s);
  let ze = SCRIPT_INTERPRETERS.has(s) ? collectLeadingOptions(L) : L.slice(1);
  return (Ee === null ? [ze] : [ze, Ee.slice(1)]).some((Je) =>
    Je.some((nt) => h.some((pt) => optionMatchesRule(nt, pt, Ae, Ie.includes(pt), Me, We))),
  );
}
//@ chunk-e6aww6q8.js:1251258-1251785 placement
/**
 * 判断一个参数是否匹配排除规则中的选项（精确、=值、带冒号前缀、绝对路径包含、长选项缩写、短选项组合），可选大小写与 Unicode 破折号归一。
 */
function optionMatchesRule(e, n, r, s, h, y) {
  let S = r ? e.toLowerCase().replace(/^[\u2013\u2014\u2015]/, "-") : e;
  if (S === n || S.startsWith(`${n}=`)) return true;
  if (n.endsWith(":") && S.startsWith(n)) return true;
  if (n.startsWith("/")) return S.replace(/^(?:\/\/|-)/, "/").includes(n);
  if (y && n.startsWith("--")) {
    let L = firstLineOf(S, "=");
    if (L.length > 2 && n.startsWith(L)) return true;
  }
  if (r && S.length > 1 && n.startsWith(S)) return true;
  if (!(!n.startsWith("--") && n.length === 2)) return false;
  if (s && S.startsWith("+")) return shortClusterHasFlag(S, n[1], h);
  if (S.startsWith(n)) return true;
  if (!s) return false;
  return shortClusterHasFlag(S, n[1], h);
}
//@ chunk-e6aww6q8.js:1251785-1251919 placement
function shortClusterHasFlag(e, n, r) {
  let s = /^[-+]([A-Za-z0-9]*)/.exec(e)?.[1] ?? "";
  for (let h of s) {
    if (h === n) return true;
    if (r.includes(h)) return false;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1251919-1252007 placement
/**
 * 命令里是否含 shell 元字符（$、反引号、引号、通配符等）；PowerShell 额外把反斜杠排除。
 */
function hasShellMetaChar(e, n = "bash") {
  return (n === "powershell" ? /[$`'"*?[]/ : /[$`\\'"*?[]/).test(firstToken(e));
}
//@ chunk-e6aww6q8.js:1252007-1252483 placement
/**
 * 去掉命令开头可信的 env 包装与远程集群参数等前缀，返回实际执行的命令文本（遇到 bash 可执行的包装时从该处截取）。
 */
function stripTrustedWrappers(e) {
  let trimmed = e.trim();
  let r;
  while (trimmed !== r) {
    r = trimmed;
    trimmed = stripUnsafeLeadingEnvVars(trimmed);
    if (classifyEnvWrapper(trimmed) === "trusted") {
      trimmed = trimmed.replace(LEADING_WORD_RE, "");
      let y;
      while (trimmed !== y) {
        y = trimmed;
        trimmed = trimmed.replace(REMOTE_CLUSTER_FLAGS, "");
      }
    }
  }
  if (isUnsandboxableProgram(firstToken(trimmed), "bash")) return trimmed;
  trimmed = resolveTransparentWrapperAlias(trimmed);
  let s = stripSafeWrappersFromCommand(trimmed);
  let removedPrefix = getRemovedPrefix(trimmed, s);
  for (let y of removedPrefix.split(/[ \t]+/)) {
    let replaced = y.replace(/['"\\]/g, "");
    if (replaced.length > 0 && isUnsandboxableProgram(canonicalProgramName(replaced), "bash"))
      return trimmed.slice(removedPrefix.indexOf(y));
  }
  trimmed = s;
  if (classifyEnvWrapper(trimmed) === "trusted") {
    let y;
    while (trimmed !== y) {
      y = trimmed;
      trimmed = stripUnsafeLeadingEnvVars(trimmed);
      if (classifyEnvWrapper(trimmed) === "trusted") {
        trimmed = trimmed.replace(LEADING_WORD_RE, "");
        let S;
        while (trimmed !== S) {
          S = trimmed;
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
function strippedCommandPrefix(e) {
  let n = stripUnsafeLeadingEnvVars(e);
  let transparentWrapperAlias = resolveTransparentWrapperAlias(n);
  return getRemovedPrefix(n, stripSafeWrappersFromCommand(transparentWrapperAlias));
}
//@ chunk-e6aww6q8.js:1252541-1252633 placement
/**
 * 若命令是透明包装命令的别名（program alias），替换成实际命令名。
 */
function resolveTransparentWrapperAlias(e) {
  let n = firstToken(e);
  let r = getOwn(PROGRAM_ALIASES, n);
  return r !== undefined && TRANSPARENT_PREFIX_COMMANDS.has(r) ? r + e.slice(n.length) : e;
}
//@ chunk-e6aww6q8.js:1252633-1252799 placement
function getRemovedPrefix(e, n) {
  if (n === e) return "";
  let r = [...e.matchAll(/[^ \t]+/g)];
  let s = n === "" ? 0 : n.split(/[ \t]+/).length;
  let h = r.length - s;
  if (h <= 0) return "";
  return e.slice(0, r[h]?.index);
}
//@ chunk-e6aww6q8.js:1252799-1252839 placement
/**
 * 去引号后文本是否含 Unicode 空白（这类命令不认为能在沙箱外安全运行）。
 */
function hasUnicodeWhitespace(e) {
  return UNICODE_WHITESPACE_RE.test(stripQuotedRegions(e));
}
//@ chunk-e6aww6q8.js:1252839-1253000 placement
/**
 * 判断程序是否无法在沙箱外安全运行（eval 类、awk、执行包装、改变状态的内建等）。
 */
function isUnsandboxableProgram(e, n) {
  let r = canonicalProgramName(e);
  let s = n === "bash" ? e : r;
  return (
    EVAL_LIKE_BUILTINS.has(s) ||
    AWK_NAMES.has(r) ||
    UNHANDLED_EXEC_WRAPPERS.has(r) ||
    isStateChangingBuiltin(s) ||
    ZSH_DANGEROUS_BUILTINS.has(s) ||
    COMMAND_RUNNER_PREFIXES.has(r) ||
    DIRECTORY_CHANGE_COMMANDS.has(s) ||
    (n === "powershell" && POWERSHELL_INVOKE_COMMANDS.has(r))
  );
}
//@ chunk-e6aww6q8.js:1253000-1253309 placement = prependModeCharacterToInput (0.779)
function prependModeCharacterToInput(e, n = e, r = n, s = false) {
  return (
    e !== "" &&
    !LEADING_REDIRECTION_RE.test(e.trimStart()) &&
    !LEADING_REDIRECTION_RE.test(n.trimStart()) &&
    !hasUnicodeWhitespace(r) &&
    !TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(firstToken(e))) &&
    classifyEnvWrapper(e) === "none" &&
    !IFS_EXPANSION_RE.test(stripLiteralQuotedRegions(n)) &&
    !e.startsWith("-") &&
    !isUnsandboxableProgram(firstToken(e), "bash") &&
    !isUnsandboxableProgram(firstToken(n), "bash") &&
    !ENV_ASSIGNMENT_RE_3.test(e) &&
    !hasShellMetaChar(e, "bash") &&
    !hasShellMetaChar(n, "bash") &&
    !isDockerSafe(e, undefined, s) &&
    (n === e || !isDockerSafe(n, undefined, s))
  );
}
//@ chunk-e6aww6q8.js:1253309-1253442 placement
var SIMPLE_ASSIGNMENT_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(?![-+/])([A-Za-z0-9_.:@,+=/-]*)$/;
var LOCALE_VARS = new Set(["LC_ALL", "LC_CTYPE", "LANG", "LANGUAGE", "CHARSET"]);
//@ chunk-e6aww6q8.js:1253442-1253553 placement
/**
 * 判断前导赋值是否安全（变量名安全、值不像路径、不是 locale 变量）。
 */
function isSafeLeadingAssignment(e) {
  let match = e.trim().match(SIMPLE_ASSIGNMENT_RE);
  return (
    match !== null &&
    isSafeEnvVarName(match[1]) &&
    !isPathLikeEnvValue(match[2]) &&
    !LOCALE_VARS.has(match[1].toUpperCase())
  );
}
//@ chunk-e6aww6q8.js:1253553-1253833 placement
var IFS_EXPANSION_RE = /\$\{?IFS\b/;
var LAST_ARG_VAR_RE = /(?:^|[ \t"'])\$\{?_\}?(?=$|[ \t"'])/;
var VARIABLE_REF_PATTERN = String.raw`(?:\$\{[^}]*\}|\$[=^~]*(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!-]))`;
var VAR_LEADING_OPTION_RE = new RegExp(`^(?:${VARIABLE_REF_PATTERN})+[-+\u2013-\u2015](?:[A-Za-z]|\\$)`);
var VAR_SLASH_DOLLAR_RE = new RegExp(`${VARIABLE_REF_PATTERN}/\\$`);
var OPTION_WITH_VAR_RE = new RegExp(`^[-+]{1,2}[^=]*${VARIABLE_REF_PATTERN}`);
//@ chunk-e6aww6q8.js:1253833-1254334 placement
/**
 * 判断命令中的 ${...} 展开是否有风险：间接展开、特殊/位置参数、默认值中含变量、选项形状或通配字符。
 */
function hasRiskyBracedExpansion(e, n) {
  for (let r of liveBracedExpansionBodies(e)) {
    if (r.startsWith("!")) return true;
    let match = /^#?([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*])/.exec(r);
    if (match === null) return true;
    let sliced = r.slice(match[0].length);
    if (/^(?:_|[0-9]+)$/.test(match[1])) return true;
    let match_2 = /^:?[-+=?]/.exec(sliced);
    if (match_2 !== null) {
      let trimmed = sliced.slice(match_2[0].length).trim();
      if (trimmed.includes("$")) return true;
      if (
        trimmed.split(/[ \t]+/).some((w) => {
          let replaced = w.replace(/['"\\]/g, "");
          return (
            (n ? /^[-+/\u2013-\u2015]/.test(replaced) : /^[-+]/.test(replaced)) || /[[*?]/.test(replaced)
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
function isGlobbedOption(e) {
  if (!/^[-+]/.test(e)) return false;
  let n = e.search(/[[?*]/);
  if (n < 0) return false;
  let r = e.search(/[=/]/);
  return r < 0 || n < r;
}
//@ chunk-e6aww6q8.js:1254515-1254653 placement
var SHORT_GLOB_RE = /^\[[^\]]*\]|^\?[^ \t]{0,3}$|^\*[A-Za-z]$/;
var CONTROL_FLOW_BUILTINS = new Set(["exit", "return", "break", "continue", "bye", "logout"]);
var READ_BUILTINS = new Set(["read"]);
//@ chunk-e6aww6q8.js:1254653-1254757 placement
function isStateChangingBuiltin(e) {
  if (READ_BUILTINS.has(e)) return true;
  if (!DECLARATION_LIKE_BUILTINS.has(e)) return false;
  if (ZSH_DANGEROUS_BUILTINS.has(e)) return true;
  return !CONTROL_FLOW_BUILTINS.has(e);
}
//@ chunk-e6aww6q8.js:1254757-1255778 placement
/**
 * 需要按子命令判断是否排除沙箱的程序（git/deno/bun）。
 */
var SANDBOX_EXCLUDED_SUBCOMMANDS = [
  ["bisect", "run"],
  ["submodule", "foreach"],
  ["deno", "eval"],
  ["deno", "task"],
  ["bun", "run"],
  ["hook", "run"],
];
var SUBCOMMAND_PROGRAMS = new Set(["git", "deno", "bun"]);
var GIT_SUBCOMMAND_EXCLUSIONS = {
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
var PYTHON_SUBCOMMAND_EXCLUSIONS = ["-u", ["clone"]];
var TENGU_MOSSY_CRAYON = "tengu_mossy_crayon";
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
function gitCreatesRepoAtRiskyPath(e) {
  let sliced = e.slice(1);
  let flattened = sliced.flatMap((y, S) => (y.startsWith("-") ? [] : [S]));
  let mapped = flattened.map((y) => sliced[y]);
  let h = (y) => (isGitCreatePathCheckEnabled() ? sliced.slice(flattened[y] + 1) : mapped.slice(y + 1));
  return mapped.some((y, S) => {
    let w;
    switch (normalizeConfigKey(y)) {
      case "clone":
      case "init":
        w = h(S);
        break;
      case "worktree": {
        let L = mapped[S + 1];
        let G = L === undefined ? undefined : normalizeConfigKey(L);
        w = G === "add" || G === "move" ? h(S + 1) : [];
        break;
      }
      case "bundle": {
        let L = mapped[S + 1];
        w = L !== undefined && normalizeConfigKey(L) === "create" ? h(S + 1) : [];
        break;
      }
      default:
        return false;
    }
    return w.some(looksLikeEscapingPath);
  });
}
//@ chunk-e6aww6q8.js:1257030-1257126 placement
/**
 * 路径是绝对路径、带盘符或含 “..” 段时返回 true。
 */
function looksLikeEscapingPath(e) {
  return /^[/\\~$]/.test(e) || /^[A-Za-z]:/.test(e) || e.split(/[/\\]/).includes("..");
}
//@ chunk-e6aww6q8.js:1257126-1257182 affinity
/**
 * 把配置键规整为 NFKC 小写，便于比较。
 */
function normalizeConfigKey(e) {
  return e.normalize("NFKC").toLowerCase();
}
//@ chunk-e6aww6q8.js:1257695-1257890 affinity
function setsRiskyGitConfig(e) {
  if (!e.some((n) => normalizeConfigKey(n) === "config")) return false;
  return e.some((n, r) => {
    if (r >= e.length - 1) return false;
    let lower = n.toLowerCase();
    return (
      GIT_UNSAFE_CONFIG_PREFIXES.some((h) => lower.startsWith(h)) ||
      GIT_UNSAFE_CONFIG_PATTERNS.some((h) => h.test(lower))
    );
  });
}
//@ chunk-e6aww6q8.js:1257890-1258112 placement
function expandDefaultValues(e) {
  let replaced = e.replace(/\$\{(?:[A-Za-z_][A-Za-z0-9_]*|[@*]):?[-+=]([^}]*)\}/g, (s, h) => h);
  if (replaced === e) return null;
  let r = [];
  for (let s of replaced.split(/[ \t]+/)) {
    let replaced = s.replace(/['"\\]/g, "");
    if (replaced.length > 0) r.push(replaced);
  }
  return r;
}
//@ chunk-e6aww6q8.js:1258112-1258331 placement
/**
 * 汇总判断命令是否应排除在沙箱外：子命令规则、bun/deno 非安全子命令、docker、git 的各类危险全局选项/config/clone 路径/通配等。
 */
function isExcludedFromSandbox(e, n, r, s) {
  return (
    matchesExcludedSubcommand(n, r) ||
    isUnsafeBunCommand(e, n) ||
    isUnsafeDenoCommand(e, n) ||
    isDockerSafe_2(e, n) ||
    isGitArgMatchingFlagRule(e, n) ||
    (e === "git" && hasGitShortGlobalOption(n)) ||
    (e === "git" && hasDangerousGitGlobalOption(n, s)) ||
    (e === "git" && r && hasGlobAroundGitSubcommand(n)) ||
    (e === "git" && setsRiskyGitConfig(n)) ||
    (e === "git" && hasExtProtocolArg(n)) ||
    (e === "git" && gitCreatesRepoAtRiskyPath(n)) ||
    (e === "git" && r && hasGitGlobArgument(n))
  );
}
//@ chunk-e6aww6q8.js:1258331-1258673 placement
/**
 * bun 与 deno 中可在沙箱外安全运行的子命令集合。
 */
var SAFE_BUN_SUBCOMMANDS = new Set([
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
var SAFE_DENO_SUBCOMMANDS = new Set([
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
//@ chunk-e6aww6q8.js:1258673-1258909 placement
function isUnsafeDenoCommand(e, n) {
  if (e !== "deno") return false;
  let sliced = n.slice(1);
  for (let [s, h] of sliced.entries()) {
    if (h.startsWith("-")) continue;
    let y = s === 0 ? undefined : sliced[s - 1];
    if (y !== undefined && y.startsWith("-")) {
      if (!SAFE_DENO_SUBCOMMANDS.has(h)) return true;
      continue;
    }
    return !SAFE_DENO_SUBCOMMANDS.has(h);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1258909-1259031 placement
function isUnsafeBunCommand(e, n) {
  if (e !== "bun") return false;
  for (let r of n.slice(1)) {
    if (r.startsWith("-")) continue;
    return !SAFE_BUN_SUBCOMMANDS.has(r);
  }
  return false;
}
//@ chunk-e6aww6q8.js:1259031-1259665 placement
/**
 * docker 子命令集合、带值的短选项与安全的全局选项，用于判断 docker 命令是否排除在沙箱外。
 */
var DOCKER_SUBCOMMANDS = new Set([
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
var DOCKER_VALUE_SHORT_FLAGS = ["c", "H", "l"];
var DOCKER_SAFE_GLOBAL_FLAGS = new Set([
  "-D",
  "--debug",
  "--tls",
  "--tlsverify",
  "-v",
  "--version",
  "--help",
]);
//@ chunk-e6aww6q8.js:1259665-1259967 placement = isDockerSafe (0.772)
function isDockerSafe_2(e, n) {
  if (e !== "docker") return false;
  let sliced = n.slice(1);
  let s = sliced.length;
  for (let idx = 0; idx < sliced.length; idx++) {
    let config = sliced[idx];
    if (!config.startsWith("-")) {
      if (DOCKER_SUBCOMMANDS.has(config.toLowerCase())) {
        s = idx;
        break;
      }
      continue;
    }
    if (!config.includes("=") && !DOCKER_SAFE_GLOBAL_FLAGS.has(config)) idx++;
  }
  return sliced
    .slice(0, s)
    .some(
      (h) => h.startsWith("-") && ["c", "H"].some((y) => shortClusterHasFlag(h, y, DOCKER_VALUE_SHORT_FLAGS)),
    );
}
//@ chunk-e6aww6q8.js:1259967-1260169 placement
function matchesExcludedSubcommand(e, n) {
  return SANDBOX_EXCLUDED_SUBCOMMANDS.some(([r, s]) =>
    e.some((h, y) => {
      if (canonicalProgramName(h) !== r) return false;
      for (let idx = y + 1; idx < e.length; idx++) {
        let w = e[idx];
        if (canonicalProgramName(w) === s || (n && GLOB_CHAR_RE.test(w))) return true;
        if (!w.startsWith("-")) return false;
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
function hasGitGlobArgument(e) {
  return e.some((n, r) => {
    let s = normalizeConfigKey(n);
    if (s !== "config" && s !== "worktree" && s !== "bundle") return false;
    let h = s !== "config" && isGitCreatePathCheckEnabled();
    return e.slice(r + 1).some((y) => (h || !y.startsWith("-")) && GLOB_CHAR_RE.test(y));
  });
}
//@ chunk-e6aww6q8.js:1260386-1260426 placement
/**
 * 去引号后的文本是否含通配符。
 */
function hasUnquotedGlob(e) {
  return GLOB_CHAR_RE.test(stripQuotedRegions(e));
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
function hasGitShortGlobalOption(e) {
  return e
    .slice(1, findGitSubcommandIndex(e))
    .some((n) => GIT_SHORT_GLOBAL_OPTIONS.some((r) => n.startsWith(r)));
}
//@ chunk-e6aww6q8.js:1261054-1261133 placement
/**
 * git 子命令本身或其路径参数是否含通配符。
 */
function hasGlobAroundGitSubcommand(e) {
  return [getGitSubcommandPath(e)[0], e[findGitSubcommandIndex(e)]].some(
    (r) => r !== undefined && GLOB_CHAR_RE.test(r),
  );
}
//@ chunk-e6aww6q8.js:1261133-1261268 placement
/**
 * 在 git argv 中跳过全局选项，返回子命令下标。
 */
function findGitSubcommandIndex(e) {
  let n = 1;
  while (n < e.length) {
    let r = e[n];
    if (!r.startsWith("-")) return n;
    n += r.includes("=") || SAFE_GIT_GLOBAL_FLAGS.has(r) ? 1 : 2;
  }
  return e.length;
}
//@ chunk-e6aww6q8.js:1262797-1262870 placement
/**
 * 去掉数组中的空串与纯空白项（当前无引用，保留为辅助函数）。
 */
function compactNonBlank(e) {
  return e.filter((n) => typeof n === "string" && n.trim() !== "");
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
