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
  CONTROL_CHAR_RE,
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
import { $ui, kwe } from "../../utils/bash/parser.js";
import { getCommandArgv } from "../../utils/bash/commands.js";
import { firstLineOf } from "../../utils/stringUtils.js";
import { RQ, pqe, isSafeEnvVarName, isPathLikeEnvValue } from "./bashPermissions.js";
import {
  TRANSPARENT_PREFIX_COMMANDS,
  COMMAND_RUNNER_PREFIXES,
  DIRECTORY_CHANGE_COMMANDS,
  POWERSHELL_INVOKE_COMMANDS,
  LEADING_REDIRECTION_RE,
  ENV_ASSIGNMENT_RE_2,
} from "./shouldUseSandbox.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import {
  isGitArgMatchingFlagRule,
  hasDangerousGitGlobalOption,
  getGitSubcommandPath,
  SAFE_GIT_GLOBAL_FLAGS,
} from "../../utils/git.js";

/**
 * 沙箱排除判断用常量：shell 元字符、Unicode 空白、需拒绝的字符、@变量名、空白分隔与前导词正则、可信的 env 路径。
 */
//@ chunk-e6aww6q8.js:1244293-1244648 placement
var SHELL_META_RE = /[;|&`$(){}<>#\n\r]/,
  UNICODE_SPACE_RE = new RegExp(`\x85|${UNICODE_WHITESPACE_RE.source}`),
  UNSAFE_ARG_CHARS_RE = new RegExp(
    `${SHELL_META_RE.source}|[,%]|['"\u2013-\u2015\u2018-\u201B\u201C-\u201E]|${UNICODE_SPACE_RE.source}|${CONTROL_CHAR_RE.source}`,
  ),
  UNSAFE_PATH_CHARS_RE = new RegExp(`[,%\u2013-\u2015]|${UNICODE_SPACE_RE.source}|${CONTROL_CHAR_RE.source}`),
  AT_VARIABLE_RE = /^@[A-Za-z_][A-Za-z0-9_:]*$/,
  BLANK_RE = /[ \t]+/,
  LEADING_WORD_RE = /^([^ \t]*)[ \t]+/,
  TRUSTED_ENV_PATHS = new Set(["env", "/bin/env", "/usr/bin/env"]);
//@ chunk-e6aww6q8.js:1244648-1244836 placement
function normalizeEnvPath(e) {
  if (e.startsWith("//")) return e;
  let startsWith = e.startsWith("/"),
    replaced = e
      .replace(/\/+/g, "/")
      .replace(/(?:^|\/)\.(?=\/)/g, "")
      .replace(/\/+/g, "/");
  if (startsWith) return replaced;
  return e.includes("/") ? e : replaced;
}
/**
 * 分类 env 包装命令：不是 env、可信路径下的 env 或不可信的 env。
 */
//@ chunk-e6aww6q8.js:1244836-1245040 placement
function classifyEnvWrapper(e) {
  let n = NR(e);
  if (canonicalProgramName(n) !== "env") return "none";
  let lower = (n.split(/[/\\]/).pop() ?? "").toLowerCase();
  if (UNTRUSTED_ENV_ALIASES.has(lower.replace(/[. ]+$/, ""))) return "untrusted";
  return TRUSTED_ENV_PATHS.has(normalizeEnvPath(n)) ? "trusted" : "untrusted";
}
/**
 * 远程集群类命令（kubectl 等）的连接参数，用于判断是否排除出沙箱。
 */
//@ chunk-e6aww6q8.js:1245040-1246251 placement
var REMOTE_CLUSTER_FLAGS =
    /^(?:-i|--ignore-environment|-0|--null)[ \t]+|^(?:-u[ \t]+|--unset=)[A-Za-z_][A-Za-z0-9_]*[ \t]+/,
  rLo = {
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
function NR(e) {
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
  },
  UNTRUSTED_ENV_ALIASES = new Set(["genv"]);
//@ chunk-e6aww6q8.js:1246615-1246677 placement
function Zze(e, n) {
  let replaced = e.replace(n, "");
  return replaced.length > 0 ? replaced : e;
}
/**
 * 规范化程序名：取基本名、小写、去掉扩展名与版本后缀，并应用别名表。
 */
//@ chunk-e6aww6q8.js:1246677-1246921 placement
function canonicalProgramName(e) {
  let lower = (e.split(/[/\\]/).pop() ?? "").toLowerCase(),
    r = Zze(lower, /[. ]+$/),
    s = Zze(r, /\.(?:exe|com|bat|cmd)$/),
    h = getOwn(PROGRAM_ALIASES, s);
  if (h !== void 0) return h;
  let y = s;
  for (;;) {
    let S = Zze(y, /-?[0-9]+(?:\.[0-9]+)*$/);
    if (S === y) break;
    y = S;
  }
  return getOwn(PROGRAM_ALIASES, y) ?? y;
}
/**
 * 沙箱排除判断用的解释器表：各解释器带值的短选项、带子命令的程序、Windows shell，以及执行代码字符串的选项（如 -c、-e）。
 */
//@ chunk-e6aww6q8.js:1246921-1247534 placement
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
  },
  SUBCOMMAND_PROGRAMS = new Set(["git", "fish", "aws"]),
  WINDOWS_SHELLS = new Set(["pwsh", "powershell", "cmd"]),
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
//@ chunk-e6aww6q8.js:1247534-1247630 placement
function lLo(e) {
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
  ]),
  STDIN_SCRIPT_TOOLS = new Set(["make", "at", "batch", "sqlite", "ed", "crontab"]),
  STDIN_DEVICE_PATHS = new Set(["/dev/stdin", "/dev/fd/0", "/proc/self/fd/0"]);
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
  if (!e.startsWith("/") && !e.split("/").includes("..")) return !1;
  let n = normalizeDotSegments(`/${e}`);
  return /^\/dev\/fd\/\d+$/.test(n) || /^\/proc\/[^/]+\/fd\/\d+$/.test(n) || STDIN_DEVICE_PATHS.has(n);
}
/**
 * 判断解释器或 shell 调用是否会从标准输入读取脚本：无脚本参数、-s/-、-i（交互）、-o shinstdin，或参数为 /dev/stdin 等；make/at 等工具在非管道输入时也算。
 */
//@ chunk-e6aww6q8.js:1248258-1249036 placement
function readsScriptFromStdin(e, n, r) {
  if (STDIN_SCRIPT_TOOLS.has(e)) return !r;
  if (!STDIN_INTERPRETERS.has(e)) return !1;
  let sliced = n.slice(1),
    h = WINDOWS_SHELLS.has(e);
  if (e === "cmd" && !r && !sliced.some((L) => /^[-/]{1,2}[ckr]/i.test(L))) return !0;
  let y = collectLeadingOptions(n),
    S = h
      ? collectLeadingOptions(n, (L) =>
          e === "cmd" ? /^[-+/\u2013-\u2015]/.test(L) : /^[-+\u2013-\u2015]/.test(L),
        )
      : y,
    sliced_2 = sliced.slice(S.length);
  if (e === "powershell" && sliced.length > 0) return !0;
  return (
    (!r && sliced_2.length === 0) ||
    sliced.length === 0 ||
    (!r && collectOptionsWithValues(n).some((L) => $ui(L, "i"))) ||
    collectOptionsWithValues(n).some((L) => L === "-" || kwe(L, "s")) ||
    y.some((L, G, q) => {
      let match = /^[-+][-+]?(?:-)?(.+)$/.exec(L.startsWith("--") ? L : ""),
        match_2 = /^[-+][A-Za-z]*?o(.+)$/.exec(L),
        ke = match !== null ? match[1] : /^[-+][A-Za-z]*o$/.test(L) ? q[G + 1] : match_2?.[1];
      if (ke === void 0) return !1;
      let replaced = ke.toLowerCase().replaceAll("_", "").replaceAll("-", "");
      return L.startsWith("+") ? replaced === "noshinstdin" : replaced === "shinstdin";
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
  let r = [],
    sliced = e.slice(1);
  for (let [h, y] of sliced.entries()) {
    if (!n(y)) {
      let S = h === 0 ? void 0 : sliced[h - 1];
      if (S === void 0 || !n(S)) return r;
    }
    r.push(y);
  }
  return r;
}
//@ chunk-e6aww6q8.js:1249356-1249430 placement
var gLo = new Set(["-o", "+o", "-O", "+O", "-W", "-X", "--rcfile", "--init-file"]);
//@ chunk-e6aww6q8.js:1249430-1249634 placement
function collectOptionsWithValues(e) {
  let n = [],
    sliced = e.slice(1);
  for (let s = 0; s < sliced.length; s++) {
    let h = sliced[s];
    if (!h.startsWith("-") && !h.startsWith("+")) return n;
    if ((n.push(h), gLo.has(h))) {
      let y = sliced[s + 1];
      if (y !== void 0) (n.push(y), s++);
    }
  }
  return n;
}
//@ chunk-e6aww6q8.js:1249634-1249869 placement
function splitAnsiQuotedWords(e) {
  let n = "",
    r = !1,
    s = !1,
    h = !1;
  for (let y of e) {
    if (h) {
      ((n += y === "$" ? "\x01" : y), (h = !1));
      continue;
    }
    if (y === "\\" && !r) {
      h = !0;
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
  let n = "",
    r = !1,
    s = !1,
    h = !1;
  for (let y of e) {
    let S = h || r || s;
    if (h) h = !1;
    else if (y === "\\" && !r) {
      h = !0;
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
/**
 * （旧版名配错，切分错误）判断命令参数能否执行任意代码：解释器 -e/--eval、git config 中可执行的键、docker -H、bun/deno 运行脚本、通配参数等；被输入模式与沙箱排除检查使用。
 */
//@ chunk-e6aww6q8.js:1250157-1251258 placement = isDockerSafe (0.772)
function isDockerSafe(e, n, r = !1) {
  let s = canonicalProgramName(n === void 0 ? NR(e) : (n[0] ?? "")),
    h = getOwn(rLo, s),
    y = WINDOWS_SHELLS.has(s),
    S = h !== void 0 || tqe.has(s) || s === "docker",
    w = stripLiteralQuotedRegions(e);
  if (
    S &&
    (LAST_ARG_VAR_RE.test(w) ||
      LAST_ARG_VAR_RE.test(stripQuotedRegions(e)) ||
      ELo.test(w) ||
      hasRiskyBracedExpansion(e, y))
  )
    return !0;
  let L = n ?? getCommandArgv(e),
    sliced = stripQuotedRegions(e)
      .split(/[ \t]+/)
      .slice(1),
    q = XLo(e),
    sliced_2 = stripLiteralQuotedRegions(e)
      .split(/[ \t]+/)
      .slice(1),
    sliced_3 = splitAnsiQuotedWords(e).slice(1),
    flagArgs = splitMarkingQuotedGlobs(e).slice(1);
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
    return !0;
  let Ee = expandDefaultValues(e);
  if (h === void 0)
    return (
      (tqe.has(s) && matchesExcludedSubcommand(L, q)) ||
      isUnsafeBunCommand(s, L) ||
      isUnsafeDenoCommand(s, L) ||
      isDockerSafe_2(s, L) ||
      readsScriptFromStdin(s, L, r) ||
      (Ee !== null &&
        ((tqe.has(s) && matchesExcludedSubcommand(Ee, q)) ||
          isUnsafeBunCommand(s, Ee) ||
          isDockerSafe_2(s, Ee) ||
          readsScriptFromStdin(s, Ee, r)))
    );
  if (
    isExcludedFromSandbox(s, L, q, e) ||
    readsScriptFromStdin(s, L, r) ||
    (Ee !== null && (isExcludedFromSandbox(s, Ee, q, e) || readsScriptFromStdin(s, Ee, r)))
  )
    return !0;
  let Ae = WINDOWS_SHELLS.has(s),
    Ie = getOwn(INTERPRETER_CODE_FLAGS, s) ?? [],
    Me = getOwn(INTERPRETER_VALUE_FLAGS, s) ?? [],
    We = SUBCOMMAND_PROGRAMS.has(s),
    ze = SCRIPT_INTERPRETERS.has(s) ? collectLeadingOptions(L) : L.slice(1);
  return (Ee === null ? [ze] : [ze, Ee.slice(1)]).some((Je) =>
    Je.some((nt) => h.some((pt) => optionMatchesRule(nt, pt, Ae, Ie.includes(pt), Me, We))),
  );
}
/**
 * 判断一个参数是否匹配排除规则中的选项（精确、=值、带冒号前缀、绝对路径包含、长选项缩写、短选项组合），可选大小写与 Unicode 破折号归一。
 */
//@ chunk-e6aww6q8.js:1251258-1251785 placement
function optionMatchesRule(e, n, r, s, h, y) {
  let S = r ? e.toLowerCase().replace(/^[\u2013\u2014\u2015]/, "-") : e;
  if (S === n || S.startsWith(`${n}=`)) return !0;
  if (n.endsWith(":") && S.startsWith(n)) return !0;
  if (n.startsWith("/")) return S.replace(/^(?:\/\/|-)/, "/").includes(n);
  if (y && n.startsWith("--")) {
    let L = firstLineOf(S, "=");
    if (L.length > 2 && n.startsWith(L)) return !0;
  }
  if (r && S.length > 1 && n.startsWith(S)) return !0;
  if (!(!n.startsWith("--") && n.length === 2)) return !1;
  if (s && S.startsWith("+")) return shortClusterHasFlag(S, n[1], h);
  if (S.startsWith(n)) return !0;
  if (!s) return !1;
  return shortClusterHasFlag(S, n[1], h);
}
//@ chunk-e6aww6q8.js:1251785-1251919 placement
function shortClusterHasFlag(e, n, r) {
  let s = /^[-+]([A-Za-z0-9]*)/.exec(e)?.[1] ?? "";
  for (let h of s) {
    if (h === n) return !0;
    if (r.includes(h)) return !1;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1251919-1252007 placement
function Gye(e, n = "bash") {
  return (n === "powershell" ? /[$`'"*?[]/ : /[$`\\'"*?[]/).test(NR(e));
}
/**
 * 去掉命令开头可信的 env 包装与远程集群参数等前缀，返回实际执行的命令文本（遇到 bash 可执行的包装时从该处截取）。
 */
//@ chunk-e6aww6q8.js:1252007-1252483 placement
function stripTrustedWrappers(e) {
  let trimmed = e.trim(),
    r;
  while (trimmed !== r)
    if (((r = trimmed), (trimmed = RQ(trimmed)), classifyEnvWrapper(trimmed) === "trusted")) {
      trimmed = trimmed.replace(LEADING_WORD_RE, "");
      let y;
      while (trimmed !== y) ((y = trimmed), (trimmed = trimmed.replace(REMOTE_CLUSTER_FLAGS, "")));
    }
  if (isUnsandboxableProgram(NR(trimmed), "bash")) return trimmed;
  trimmed = i4t(trimmed);
  let s = pqe(trimmed),
    h = getRemovedPrefix(trimmed, s);
  for (let y of h.split(/[ \t]+/)) {
    let replaced = y.replace(/['"\\]/g, "");
    if (replaced.length > 0 && isUnsandboxableProgram(canonicalProgramName(replaced), "bash"))
      return trimmed.slice(h.indexOf(y));
  }
  if (((trimmed = s), classifyEnvWrapper(trimmed) === "trusted")) {
    let y;
    while (trimmed !== y)
      if (((y = trimmed), (trimmed = RQ(trimmed)), classifyEnvWrapper(trimmed) === "trusted")) {
        trimmed = trimmed.replace(LEADING_WORD_RE, "");
        let S;
        while (trimmed !== S) ((S = trimmed), (trimmed = trimmed.replace(REMOTE_CLUSTER_FLAGS, "")));
      }
  }
  return trimmed;
}
//@ chunk-e6aww6q8.js:1252483-1252541 placement
function yLo(e) {
  let n = RQ(e),
    r = i4t(n);
  return getRemovedPrefix(n, pqe(r));
}
//@ chunk-e6aww6q8.js:1252541-1252633 placement
function i4t(e) {
  let n = NR(e),
    r = getOwn(PROGRAM_ALIASES, n);
  return r !== void 0 && TRANSPARENT_PREFIX_COMMANDS.has(r) ? r + e.slice(n.length) : e;
}
//@ chunk-e6aww6q8.js:1252633-1252799 placement
function getRemovedPrefix(e, n) {
  if (n === e) return "";
  let r = [...e.matchAll(/[^ \t]+/g)],
    s = n === "" ? 0 : n.split(/[ \t]+/).length,
    h = r.length - s;
  if (h <= 0) return "";
  return e.slice(0, r[h]?.index);
}
//@ chunk-e6aww6q8.js:1252799-1252839 placement
function l4t(e) {
  return UNICODE_WHITESPACE_RE.test(stripQuotedRegions(e));
}
/**
 * 判断程序是否无法在沙箱外安全运行（eval 类、awk、执行包装、改变状态的内建等）。
 */
//@ chunk-e6aww6q8.js:1252839-1253000 placement
function isUnsandboxableProgram(e, n) {
  let r = canonicalProgramName(e),
    s = n === "bash" ? e : r;
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
function prependModeCharacterToInput(e, n = e, r = n, s = !1) {
  return (
    e !== "" &&
    !LEADING_REDIRECTION_RE.test(e.trimStart()) &&
    !LEADING_REDIRECTION_RE.test(n.trimStart()) &&
    !l4t(r) &&
    !TRANSPARENT_PREFIX_COMMANDS.has(canonicalProgramName(NR(e))) &&
    classifyEnvWrapper(e) === "none" &&
    !IFS_EXPANSION_RE.test(stripLiteralQuotedRegions(n)) &&
    !e.startsWith("-") &&
    !isUnsandboxableProgram(NR(e), "bash") &&
    !isUnsandboxableProgram(NR(n), "bash") &&
    !ENV_ASSIGNMENT_RE_2.test(e) &&
    !Gye(e, "bash") &&
    !Gye(n, "bash") &&
    !isDockerSafe(e, void 0, s) &&
    (n === e || !isDockerSafe(n, void 0, s))
  );
}
//@ chunk-e6aww6q8.js:1253309-1253442 placement
var SIMPLE_ASSIGNMENT_RE = /^([A-Za-z_][A-Za-z0-9_]*)=(?![-+/])([A-Za-z0-9_.:@,+=/-]*)$/,
  LOCALE_VARS = new Set(["LC_ALL", "LC_CTYPE", "LANG", "LANGUAGE", "CHARSET"]);
/**
 * 判断前导赋值是否安全（变量名安全、值不像路径、不是 locale 变量）。
 */
//@ chunk-e6aww6q8.js:1253442-1253553 placement
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
var IFS_EXPANSION_RE = /\$\{?IFS\b/,
  LAST_ARG_VAR_RE = /(?:^|[ \t"'])\$\{?_\}?(?=$|[ \t"'])/,
  VARIABLE_REF_PATTERN = String.raw`(?:\$\{[^}]*\}|\$[=^~]*(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?$!-]))`,
  VAR_LEADING_OPTION_RE = new RegExp(`^(?:${VARIABLE_REF_PATTERN})+[-+\u2013-\u2015](?:[A-Za-z]|\\$)`),
  VAR_SLASH_DOLLAR_RE = new RegExp(`${VARIABLE_REF_PATTERN}/\\$`),
  OPTION_WITH_VAR_RE = new RegExp(`^[-+]{1,2}[^=]*${VARIABLE_REF_PATTERN}`);
/**
 * 判断命令中的 ${...} 展开是否有风险：间接展开、特殊/位置参数、默认值中含变量、选项形状或通配字符。
 */
//@ chunk-e6aww6q8.js:1253833-1254334 placement
function hasRiskyBracedExpansion(e, n) {
  for (let r of liveBracedExpansionBodies(e)) {
    if (r.startsWith("!")) return !0;
    let match = /^#?([A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*])/.exec(r);
    if (match === null) return !0;
    let sliced = r.slice(match[0].length);
    if (/^(?:_|[0-9]+)$/.test(match[1])) return !0;
    let match_2 = /^:?[-+=?]/.exec(sliced);
    if (match_2 !== null) {
      let trimmed = sliced.slice(match_2[0].length).trim();
      if (trimmed.includes("$")) return !0;
      if (
        trimmed.split(/[ \t]+/).some((w) => {
          let replaced = w.replace(/['"\\]/g, "");
          return (
            (n ? /^[-+/\u2013-\u2015]/.test(replaced) : /^[-+]/.test(replaced)) || /[[*?]/.test(replaced)
          );
        })
      )
        return !0;
      continue;
    }
    if (sliced.length > 0) return !0;
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1254334-1254391 placement
var ELo = /(?:^|[ \t"'])\$[=^~]*\{?[0-9]+\}?(?=$|[ \t"'])/;
//@ chunk-e6aww6q8.js:1254391-1254515 placement
function isGlobbedOption(e) {
  if (!/^[-+]/.test(e)) return !1;
  let search = e.search(/[[?*]/);
  if (search < 0) return !1;
  let search_2 = e.search(/[=/]/);
  return search_2 < 0 || search < search_2;
}
//@ chunk-e6aww6q8.js:1254515-1254653 placement
var SHORT_GLOB_RE = /^\[[^\]]*\]|^\?[^ \t]{0,3}$|^\*[A-Za-z]$/,
  CONTROL_FLOW_BUILTINS = new Set(["exit", "return", "break", "continue", "bye", "logout"]),
  READ_BUILTINS = new Set(["read"]);
//@ chunk-e6aww6q8.js:1254653-1254757 placement
function isStateChangingBuiltin(e) {
  if (READ_BUILTINS.has(e)) return !0;
  if (!DECLARATION_LIKE_BUILTINS.has(e)) return !1;
  if (ZSH_DANGEROUS_BUILTINS.has(e)) return !0;
  return !CONTROL_FLOW_BUILTINS.has(e);
}
/**
 * 不适合在沙箱中运行的子命令（git bisect run、submodule foreach、deno eval 等）。
 */
//@ chunk-e6aww6q8.js:1254757-1255778 placement
var SANDBOX_EXCLUDED_SUBCOMMANDS = [
    ["bisect", "run"],
    ["submodule", "foreach"],
    ["deno", "eval"],
    ["deno", "task"],
    ["bun", "run"],
    ["hook", "run"],
  ],
  tqe = new Set(["git", "deno", "bun"]),
  OLo = {
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
  },
  ILo = ["-u", ["clone"]],
  TENGU_MOSSY_CRAYON = "tengu_mossy_crayon";
//@ chunk-e6aww6q8.js:1255778-1255818 placement
function LLo() {
  return readFlagWithOverride(TENGU_MOSSY_CRAYON, { safe: !0 });
}
//@ chunk-e6aww6q8.js:1255818-1256566 placement
var GIT_UNSAFE_CONFIG_KEYS = {
    clone: ["b", "o", "j", "u"],
    rebase: ["C", "S", "X", "s"],
    difftool: ["t"],
    instaweb: ["b", "m", "p"],
    config: [],
    archive: [],
    "format-patch": ["v"],
    grep: ["e", "f", "A", "B", "C", "m"],
  },
  FLo = [
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
  ],
  $Lo = [/^remote\..+\.(?:uploadpack|receivepack|vcs)$/, /^submodule\..+\.update$/],
  TENGU_PEPPY_NAUTILUS = "tengu_peppy_nautilus";
//@ chunk-e6aww6q8.js:1256566-1256606 placement
function u4t() {
  return readFlagWithOverride(TENGU_PEPPY_NAUTILUS, { safe: !0 });
}
/**
 * 判断 git 子命令（clone/init/worktree add|move/bundle create 等）是否会在有风险的路径创建仓库或文件。
 */
//@ chunk-e6aww6q8.js:1256606-1257030 placement
function gitCreatesRepoAtRiskyPath(e) {
  let sliced = e.slice(1),
    flattened = sliced.flatMap((y, S) => (y.startsWith("-") ? [] : [S])),
    mapped = flattened.map((y) => sliced[y]),
    h = (y) => (u4t() ? sliced.slice(flattened[y] + 1) : mapped.slice(y + 1));
  return mapped.some((y, S) => {
    let w;
    switch (iq(y)) {
      case "clone":
      case "init":
        w = h(S);
        break;
      case "worktree": {
        let L = mapped[S + 1],
          G = L === void 0 ? void 0 : iq(L);
        w = G === "add" || G === "move" ? h(S + 1) : [];
        break;
      }
      case "bundle": {
        let L = mapped[S + 1];
        w = L !== void 0 && iq(L) === "create" ? h(S + 1) : [];
        break;
      }
      default:
        return !1;
    }
    return w.some(ULo);
  });
}
//@ chunk-e6aww6q8.js:1257030-1257126 placement
function ULo(e) {
  return /^[/\\~$]/.test(e) || /^[A-Za-z]:/.test(e) || e.split(/[/\\]/).includes("..");
}
//@ chunk-e6aww6q8.js:1257126-1257182 affinity
function iq(e) {
  return e.normalize("NFKC").toLowerCase();
}
//@ chunk-e6aww6q8.js:1257695-1257890 affinity
function setsRiskyGitConfig(e) {
  if (!e.some((n) => iq(n) === "config")) return !1;
  return e.some((n, r) => {
    if (r >= e.length - 1) return !1;
    let lower = n.toLowerCase();
    return FLo.some((h) => lower.startsWith(h)) || $Lo.some((h) => h.test(lower));
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
/**
 * 汇总判断命令是否应排除在沙箱外：子命令规则、bun/deno 非安全子命令、docker、git 的各类危险全局选项/config/clone 路径/通配等。
 */
//@ chunk-e6aww6q8.js:1258112-1258331 placement
function isExcludedFromSandbox(e, n, r, s) {
  return (
    matchesExcludedSubcommand(n, r) ||
    isUnsafeBunCommand(e, n) ||
    isUnsafeDenoCommand(e, n) ||
    isDockerSafe_2(e, n) ||
    isGitArgMatchingFlagRule(e, n) ||
    (e === "git" && eNo(n)) ||
    (e === "git" && hasDangerousGitGlobalOption(n, s)) ||
    (e === "git" && r && tNo(n)) ||
    (e === "git" && setsRiskyGitConfig(n)) ||
    (e === "git" && lLo(n)) ||
    (e === "git" && gitCreatesRepoAtRiskyPath(n)) ||
    (e === "git" && r && hasGitGlobArgument(n))
  );
}
/**
 * bun 与 deno 中可在沙箱外安全运行的子命令集合。
 */
//@ chunk-e6aww6q8.js:1258331-1258673 placement
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
  ]),
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
//@ chunk-e6aww6q8.js:1258673-1258909 placement
function isUnsafeDenoCommand(e, n) {
  if (e !== "deno") return !1;
  let sliced = n.slice(1);
  for (let [s, h] of sliced.entries()) {
    if (h.startsWith("-")) continue;
    let y = s === 0 ? void 0 : sliced[s - 1];
    if (y !== void 0 && y.startsWith("-")) {
      if (!SAFE_DENO_SUBCOMMANDS.has(h)) return !0;
      continue;
    }
    return !SAFE_DENO_SUBCOMMANDS.has(h);
  }
  return !1;
}
//@ chunk-e6aww6q8.js:1258909-1259031 placement
function isUnsafeBunCommand(e, n) {
  if (e !== "bun") return !1;
  for (let r of n.slice(1)) {
    if (r.startsWith("-")) continue;
    return !SAFE_BUN_SUBCOMMANDS.has(r);
  }
  return !1;
}
/**
 * docker 子命令集合、带值的短选项与安全的全局选项，用于判断 docker 命令是否排除在沙箱外。
 */
//@ chunk-e6aww6q8.js:1259031-1259665 placement
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
  ]),
  DOCKER_VALUE_SHORT_FLAGS = ["c", "H", "l"],
  DOCKER_SAFE_GLOBAL_FLAGS = new Set(["-D", "--debug", "--tls", "--tlsverify", "-v", "--version", "--help"]);
//@ chunk-e6aww6q8.js:1259665-1259967 placement = isDockerSafe (0.772)
function isDockerSafe_2(e, n) {
  if (e !== "docker") return !1;
  let sliced = n.slice(1),
    s = sliced.length;
  for (let h = 0; h < sliced.length; h++) {
    let config = sliced[h];
    if (!config.startsWith("-")) {
      if (DOCKER_SUBCOMMANDS.has(config.toLowerCase())) {
        s = h;
        break;
      }
      continue;
    }
    if (!config.includes("=") && !DOCKER_SAFE_GLOBAL_FLAGS.has(config)) h++;
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
      if (canonicalProgramName(h) !== r) return !1;
      for (let S = y + 1; S < e.length; S++) {
        let w = e[S];
        if (canonicalProgramName(w) === s || (n && GLOB_CHAR_RE.test(w))) return !0;
        if (!w.startsWith("-")) return !1;
      }
      return !1;
    }),
  );
}
/**
 * 通配字符正则 [[*?]。
 */
//@ chunk-e6aww6q8.js:1260169-1260185 placement
var GLOB_CHAR_RE = /[[*?]/;
//@ chunk-e6aww6q8.js:1260185-1260386 placement
function hasGitGlobArgument(e) {
  return e.some((n, r) => {
    let s = iq(n);
    if (s !== "config" && s !== "worktree" && s !== "bundle") return !1;
    let h = s !== "config" && u4t();
    return e.slice(r + 1).some((y) => (h || !y.startsWith("-")) && GLOB_CHAR_RE.test(y));
  });
}
//@ chunk-e6aww6q8.js:1260386-1260426 placement
function XLo(e) {
  return GLOB_CHAR_RE.test(stripQuotedRegions(e));
}
/**
 * 危险 git 全局选项：-c、-C、--git-dir、--work-tree。被 utils/git.ts 等使用。
 */
//@ chunk-e6aww6q8.js:1260426-1260478 placement = DANGEROUS_GIT_GLOBAL_FLAGS (0.549)
var QLo = ["-c", "-C"],
  JLo = ["--git-dir", "--work-tree"];
//@ chunk-e6aww6q8.js:1260971-1261054 placement
function eNo(e) {
  return e.slice(1, findGitSubcommandIndex(e)).some((n) => QLo.some((r) => n.startsWith(r)));
}
//@ chunk-e6aww6q8.js:1261054-1261133 placement
function tNo(e) {
  return [getGitSubcommandPath(e)[0], e[findGitSubcommandIndex(e)]].some(
    (r) => r !== void 0 && GLOB_CHAR_RE.test(r),
  );
}
/**
 * 在 git argv 中跳过全局选项，返回子命令下标。
 */
//@ chunk-e6aww6q8.js:1261133-1261268 placement
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
function nqe(e) {
  return e.filter((n) => typeof n === "string" && n.trim() !== "");
}

export {
  OLo,
  LLo,
  ILo,
  iq,
  SUBCOMMAND_PROGRAMS,
  GIT_UNSAFE_CONFIG_KEYS,
  optionMatchesRule,
  findGitSubcommandIndex,
  JLo,
  stripTrustedWrappers,
  NR,
  isSafeLeadingAssignment,
  l4t,
  prependModeCharacterToInput,
  yLo,
  UNSAFE_ARG_CHARS_RE,
  BLANK_RE,
  canonicalProgramName,
  classifyEnvWrapper,
  AT_VARIABLE_RE,
  Gye,
  isUnsandboxableProgram,
  isDockerSafe,
  SHELL_META_RE,
  UNSAFE_PATH_CHARS_RE,
};
