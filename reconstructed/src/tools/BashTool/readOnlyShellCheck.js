/**
 * tools/BashTool/readOnlyShellCheck.ts
 *
 * 2.1.316 新增：基于 Bash 解析器的只读命令判定（served shell 行、settings 文件写入、simctl 等应用操作、cd/pushd 处理）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-whwptcwy.js (31)
 * attribution: placement 31
 */
import { join, basename, isAbsolute, resolve } from "path";
import { homedir } from "os";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { runWithRuleOff } from "../../utils/bash/bashReadingFlags.js";
import {
  parseForSecurity,
  parseForSecurityFromAst,
  isExecInfluencingVar as isExecInfluencingVar_2,
  EVAL_LIKE_BUILTINS,
  ZSH_DANGEROUS_BUILTINS,
  SHELL_PROGRAM_NAMES,
  TRANSPARENT_LAUNCHER_NAMES,
  UNHANDLED_EXEC_WRAPPERS,
  containsAnyPlaceholder,
} from "../../utils/bash/ast.js";
import { parseCommandRaw, PARSE_ABORTED, stripPathAndExe } from "../../utils/bash/parser.js";
import { LEGACY_CONFIG_JSON } from "../../utils/env.js";
import { CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME } from "../../utils/auth.js";
import { findSafetyCheckReason } from "../../utils/permissions/permissions.js";
import {
  isHostPersonOnlyCircuitBreaker,
  isServedUnplaceableCircuitBreaker,
} from "../../types/permissions.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { isReadOnlyCommand as isReadOnlyCommand_2 } from "../PowerShellTool/readOnlyValidation.js";
import { parsePowerShellCommand } from "../../utils/powershell/parser.js";
import { logError } from "../../utils/log.js";
import { claudeStateFilePaths, getClaudeConfigDirs } from "../../utils/permissions/claudeStatePaths.js";
import { OAUTH_GLOBAL_FILE_SUFFIXES } from "../../constants/oauth.js";
import {
  settingsLocationPaths,
  settingsTextNeedles,
  SETTINGS_FILE_BASENAMES,
  settingsDirectoryWords,
  normalizeCaseForComparison,
  checkPathSafetyForAutoEdit,
} from "../../utils/permissions/filesystem.js";
import { tildify } from "../../utils/path.js";
import { urlPatternToRegex } from "../../utils/stringUtils.js";
import { isGuardOff, runGuarded, runWithGuardOff } from "../../utils/bash/bashParserFlags.js";
import { getWriteTargetsForAstCommand, stripWrappersFromArgvForPaths } from "./pathValidation.js";
import { unwrapCommandArgv } from "./bashPermissions.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { validatePath } from "../../utils/permissions/pathValidation.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { getPlatform } from "../../utils/platform.js";
import { getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { uniq } from "../../utils/collections.js";

//@ chunk-whwptcwy.js:1083-1111 placement
var TENGU_VIOLIN_LINING = "tengu_violin_lining";
//@ chunk-whwptcwy.js:1111-1149 placement
/**
 * 读取 tengu_violin_lining 开关：只读判定时是否用安全解析器解析命令。
 */
function useSecurityParser() {
  return readFlagWithOverride(TENGU_VIOLIN_LINING, {
    safe: true,
  });
}
//@ chunk-whwptcwy.js:1149-1405 placement
/**
 * 解析命令（解析器放弃时标为 too-complex）。
 */
async function parseShellCommand(e) {
  return runWithRuleOff(async () => {
    if (!useSecurityParser()) return parseForSecurity(e);
    let commandRaw = await parseCommandRaw(e);
    if (commandRaw === PARSE_ABORTED && e.trim() !== "")
      return {
        kind: "too-complex",
        reason: "the parser gave up on the command",
      };
    return commandRaw === null
      ? {
          kind: "simple",
          commands: [],
          bareAssignmentNames: [],
        }
      : parseForSecurityFromAst(e, commandRaw);
  });
}
//@ chunk-whwptcwy.js:1505-1542 placement
/**
 * 上报命令文本的长度上限（16）与扫描步数上限（64），超出分别记为 unknown / uncertain。
 */
var MAX_REPORTED_COMMAND_CHARS = 16;
var MAX_ENV_SCAN_STEPS = 64;
var TENGU_NIFTY_PINE = "tengu_nifty_pine";
//@ chunk-whwptcwy.js:1542-1595 placement
/**
 * 判断变量是否影响命令执行（被判定工具当作输入）。
 */
function isExecInfluencingVar(e) {
  return isExecInfluencingVar_2(e) || e === "PWD" || e === "OLDPWD";
}
//@ chunk-whwptcwy.js:1595-1663 placement
/**
 * 排除 LANG/LANGUAGE/LC_* 后，变量是否仍影响执行。
 */
function isNonLocaleExecInfluencingVar(name) {
  return !/^(?:LANG|LANGUAGE|LC_[A-Z]+)$/i.test(name) && isExecInfluencingVar(name);
}
//@ chunk-whwptcwy.js:1663-1845 placement = DECLARATION_COMMANDS (0.701)
/**
 * 声明命令集合、可执行代码的命令集合（eval 类、zsh 危险内建、shell 程序、包装命令、xargs、parallel），Claude 配置目录下的敏感文件名（.config.json、.credentials.json、.device-keys.json），以及开关名 tengu_toasty_hammock。属只读命令判定的辅助模块。
 */
var DECLARATION_COMMANDS = new Set(["export", "declare", "typeset", "readonly", "local", "unset"]);
var EXEC_CAPABLE_COMMANDS = new Set([
  ...EVAL_LIKE_BUILTINS,
  ...ZSH_DANGEROUS_BUILTINS,
  ...SHELL_PROGRAM_NAMES,
  ...TRANSPARENT_LAUNCHER_NAMES,
  ...UNHANDLED_EXEC_WRAPPERS,
  "xargs",
  "parallel",
]);
var CLAUDE_HOME_SECRET_FILE_NAMES = [LEGACY_CONFIG_JSON, CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME];
var TENGU_TOASTY_HAMMOCK = "tengu_toasty_hammock";
//@ chunk-whwptcwy.js:1845-1917 placement
/**
 * 判断词是否为 [、[[ 或只含安全字符，可作为命令名/参数。
 */
function isPlainCommandWord(e) {
  return e === "[" || e === "[[" || /^[A-Za-z0-9_.+:~/-]+$/.test(e);
}
//@ chunk-whwptcwy.js:1917-2286 placement
async function shouldBypassAskForReadOnly(e, n, t, cwd) {
  let s =
    t.behavior === "ask" &&
    findSafetyCheckReason(t.decisionReason, isHostPersonOnlyCircuitBreaker) !== undefined;
  if (e.name === BASH_TOOL_NAME) {
    if (typeof n.command !== "string") return "uncertain";
    let i = await classifyServedShellLine(n.command, cwd, s);
    return i === "none" &&
      t.behavior === "ask" &&
      findSafetyCheckReason(t.decisionReason, isServedUnplaceableCircuitBreaker) !== undefined
      ? "uncertain"
      : i;
  }
  if (e.name !== POWERSHELL_TOOL_NAME) return "none";
  if (s) return "settings";
  return t.behavior === "ask" && SAFETY_CHECK_FIELDS(t) ? "uncertain" : "none";
}
//@ chunk-whwptcwy.js:2286-2464 placement
/**
 * 判断托管服务的命令行是否会写入受保护路径（Bash/PowerShell 且非只读）。
 */
async function servedLineTouchesProtectedPath(e, n, t, r = false) {
  if (
    (e.name !== BASH_TOOL_NAME && e.name !== POWERSHELL_TOOL_NAME) ||
    !touchesProtectedPath(n, "file") ||
    !(await isServedLineWriting(e, n, t))
  )
    return false;
  let command = n.command;
  return !(
    r &&
    e.name === BASH_TOOL_NAME &&
    typeof command === "string" &&
    (await isReadOnlyCommand(command))
  );
}
//@ chunk-whwptcwy.js:2464-2710 placement
/**
 * 判断托管服务的命令是否会写入（PowerShell 按解析结果，其他用工具的 isReadOnly）。
 */
async function isServedLineWriting(e, n, t) {
  try {
    let command = n.command;
    return e.name === POWERSHELL_TOOL_NAME && typeof command === "string"
      ? !isReadOnlyCommand_2(command, await parsePowerShellCommand(command))
      : !e.isReadOnly(n, t);
  } catch (error) {
    logError(
      Error("a served shell line's read-only check threw; the line counts as not read-only", {
        cause: error,
      }),
    );
    return true;
  }
}
//@ chunk-whwptcwy.js:2710-2842 placement
/**
 * 列出受保护的设置与密钥文件路径，以及全局 OAuth 配置文件名。
 */
function getProtectedSettingsPaths() {
  return {
    paths: [
      ...claudeStateFilePaths(),
      ...getClaudeConfigDirs().flatMap((e) => CLAUDE_HOME_SECRET_FILE_NAMES.map((n) => join(e, n))),
    ],
    globalConfigNames: OAUTH_GLOBAL_FILE_SUFFIXES.map((e) => `.claude${e}.json`),
  };
}
//@ chunk-whwptcwy.js:2842-3109 placement
/**
 * 一组常量：simctl/open/defaults 的子命令、形如 a.b.claude 的 bundle id 正则、以及判断命令含危险 shell 语法的正则。
 */
var SIMCTL_APP_VERBS = {
  simctl: ["launch", "terminate", "uninstall", "get_app_container", "appinfo", "privacy"],
  open: ["-b"],
  defaults: ["read", "read-type", "write", "delete"],
};
var CLAUDE_APP_BUNDLE_ID_RE = String.raw`(?:[a-z][a-z0-9_-]*\.){2,}claude`;
var regExp = new RegExp(`^${CLAUDE_APP_BUNDLE_ID_RE}$`, "i");
var DANGEROUS_SHELL_SYNTAX_RE = /[|`\\(]|\$[{_]|\$BASH|<<|\bfunction\b/;
//@ chunk-whwptcwy.js:3109-4253 placement
/**
 * 判断命令是否只读（简单命令、无赋值、目标不是设置文件）。
 */
async function isReadOnlyCommand(command) {
  if (DANGEROUS_SHELL_SYNTAX_RE.test(command)) return false;
  try {
    let shellCommand = await parseShellCommand(command);
    if (shellCommand.kind !== "simple" || shellCommand.bareAssignmentNames.some(isExecInfluencingVar))
      return false;
    let t = [];
    let command_2 = command.replace(
      new RegExp(String.raw`(^|\s)(${CLAUDE_APP_BUNDLE_ID_RE})(?=$|[\s;&])`, "gi"),
      (o, a, f) => {
        t.push(f);
        return `${a}APPID`;
      },
    );
    let s = [];
    let i = 0;
    for (let { argv, envVars, redirects } of shellCommand.commands) {
      if (
        envVars.some((envVar) => isExecInfluencingVar(envVar.name)) ||
        redirects.some(
          ({ op, target }) => target !== "/dev/null" && !(op === ">&" && (target === "1" || target === "2")),
        )
      )
        return false;
      let u = argv[0];
      let p =
        u === "simctl"
          ? 0
          : (u === "xcrun" || u === "/usr/bin/xcrun") && argv[1] === "simctl"
            ? 1
            : undefined;
      let g = p === undefined ? undefined : argv[p + 1];
      let S = p !== undefined && g !== undefined && SIMCTL_APP_VERBS.simctl.includes(g) ? p + 1 : undefined;
      let h =
        (u === "defaults" || u === "/usr/bin/defaults") &&
        argv[1] !== undefined &&
        SIMCTL_APP_VERBS.defaults.includes(argv[1]);
      let d = u === "open" || u === "/usr/bin/open";
      if (p === undefined && !h && !d && u !== undefined && u !== "sleep") return false;
      for (let [m, y] of argv.entries()) {
        if (!regExp.test(y)) continue;
        s.push(y);
        let E = argv[m - 1];
        if (
          (S !== undefined && m > S) ||
          (h && m === 2) ||
          (d && E !== undefined && SIMCTL_APP_VERBS.open.includes(E))
        )
          i += 1;
      }
    }
    return (
      t.length > 0 &&
      i === s.length &&
      t.toSorted().join(" ") === s.toSorted().join(" ") &&
      !touchesProtectedPath(
        {
          command: command_2,
        },
        "file",
      )
    );
  } catch (error) {
    logError(
      Error("reading a served shell line's app identifiers threw; the line counts as naming settings", {
        cause: error,
      }),
    );
    return false;
  }
}
//@ chunk-whwptcwy.js:4253-5072 placement
function touchesProtectedPath(e, n) {
  let command = e.command;
  if (typeof command !== "string") return true;
  let { files, dirs } = settingsLocationPaths();
  let i = n !== "file_or_folder";
  let o = n === "own_file";
  let flattened = dirs.flatMap((dir) => [dir, tildify(dir)]);
  let protectedSettingsPaths = getProtectedSettingsPaths();
  let paths = i ? protectedSettingsPaths.paths : [];
  let p = [
    ...(o ? [] : [...settingsTextNeedles(), "managed-settings"]),
    ...(i ? protectedSettingsPaths.globalConfigNames : [...SETTINGS_FILE_BASENAMES, ...flattened]),
    ...[...(o ? [] : files), ...paths].flatMap((d) => [d, tildify(d)]),
  ];
  let g = settingsDirectoryWords();
  let S = i
    ? [...(o ? [] : SETTINGS_FILE_BASENAMES), ...CLAUDE_HOME_SECRET_FILE_NAMES]
    : files.map((file) => basename(file)).filter((d) => d.includes("."));
  return ["", "/"].some((d) => {
    let m = normalizeForPathMatch(command, d);
    if (p.some((_) => m.includes(normalizeForPathMatch(_, d)))) return true;
    let any = g.some((_) =>
      new RegExp(`${urlPatternToRegex(normalizeForPathMatch(_, d))}(?![a-z0-9_])`).test(m),
    );
    let any_2 = S.some((_) =>
      new RegExp(`(?<![a-z0-9_])${urlPatternToRegex(normalizeForPathMatch(_, d))}(?![a-z0-9_])`).test(m),
    );
    if (!i) return any || any_2;
    return (
      (any_2 && (any || flattened.some((_) => m.includes(normalizeForPathMatch(_, d))))) ||
      (o ? [] : [...g, ...flattened]).some((_) =>
        new RegExp(
          `${urlPatternToRegex(normalizeForPathMatch(_, d))}(?![a-z0-9_-])(?=((?:/+(?:\\.(?![a-z0-9_.-]))?)*))\\1(?!\\.?[a-z0-9_-])`,
        ).test(m),
      )
    );
  });
}
//@ chunk-whwptcwy.js:5072-5159 placement
/**
 * 规整命令文本以便按路径匹配：NFKC、去掉引号、按平台替换反斜杠。
 */
function normalizeForPathMatch(e, n) {
  return normalizeCaseForComparison(e.normalize("NFKC")).replace(/['"`]/g, "").replaceAll("\\", n);
}
//@ chunk-whwptcwy.js:5159-5520 placement
function SAFETY_CHECK_FIELDS(e) {
  let decisionReason = e.decisionReason;
  if (decisionReason?.type === "subcommandResults") {
    for (let reason of decisionReason.reasons.values())
      if (reason.behavior === "ask" && SAFETY_CHECK_FIELDS(reason)) return true;
    return false;
  }
  if (decisionReason === undefined) return e.blockedPath === undefined;
  if (decisionReason.type === "sandboxOverride")
    return decisionReason.replaces !== undefined && SAFETY_CHECK_FIELDS(decisionReason.replaces);
  if (decisionReason.type === "safetyCheck" && !isHostPersonOnlyCircuitBreaker(decisionReason))
    return isServedUnplaceableCircuitBreaker(decisionReason) || e.blockedPath === undefined;
  return decisionReason.type === "other";
}
//@ chunk-whwptcwy.js:5520-6876 placement
/**
 * 对 served shell 行做只读检查（检查抛错时视为不确定）。
 */
async function classifyServedShellLine(e, n, t = false) {
  let r = isGuardOff();
  let { result: s, fired } = await runGuarded(r, () => parseShellCommand(e));
  if (s.kind !== "simple")
    return fired && !r && (await runWithGuardOff(() => classifyServedShellLine(e, n, t))) === "settings"
      ? "settings"
      : "uncertain";
  let o = s.bareAssignmentNames.some(isExecInfluencingVar) || s.laterLoopPassesDiffer === true;
  let a = [n];
  let f = true;
  let u = false;
  let p = false;
  let g = true;
  let S = 0;
  let h =
    s.hasLoop !== false &&
    readFlagWithOverride(TENGU_TOASTY_HAMMOCK, {
      safe: true,
    });
  for (let command of s.commands) {
    let { simple, wrapperWords, pathSpelled, doubt } = describeSubcommandResults(command);
    if (doubt || hasPlaceholderInArgs(simple) || u) o = true;
    let directoryChange = resolveDirectoryChange(simple, a);
    if (directoryChange !== undefined && h) o = true;
    if (directoryChange === "unknown") f = false;
    else if (directoryChange !== undefined) {
      a = directoryChange;
      if (simple.argv.slice(1).some(hasDotDotAfterSegment)) f = false;
    }
    if (directoryChange !== undefined && !isDirectoryChangeCommand(simple)) {
      f = false;
      u = true;
    }
    let writeTargetsForAstCommand = getWriteTargetsForAstCommand(simple);
    if (writeTargetsForAstCommand.writesUnseen) o = true;
    if (!writeTargetsForAstCommand.known && directoryChange === undefined && simple.argv.length > 0)
      g = false;
    let N = (c) => (isAbsolute(c) || c.startsWith("~") ? [n] : a);
    let flattened = [
      ...wrapperWords,
      ...(writeTargetsForAstCommand.known && !pathSpelled ? [] : simple.argv.slice(1)),
      ...simple.envVars.map((envVar) => envVar.value),
    ].flatMap((c) => getArgPathVariants(c));
    if (
      !writeTargetsForAstCommand.known &&
      directoryChange === undefined &&
      simple.argv.length > 0 &&
      a.some((c) => isHostPersonOnlyPath(".", c))
    )
      o = true;
    if (
      !f &&
      flattened.some(
        (c) =>
          c !== "" && !isAbsolute(c) && !c.startsWith("~") && isHostPersonOnlyPath(c, resolve(n, ".claude")),
      )
    )
      o = true;
    for (let c of [...flattened, ...writeTargetsForAstCommand.landings])
      if (c !== "" && N(c).some((R) => isHostPersonOnlyPath(c, R))) o = true;
    for (let c of writeTargetsForAstCommand.written) {
      S++;
      if (S > MAX_ENV_SCAN_STEPS) return "uncertain";
      if (containsAnyPlaceholder(c) || (N(c) === a && !f)) o = true;
      for (let R of N(c)) {
        let k = classifyWriteTarget(c, R);
        if (k === "settings") return "settings";
        if (k === "uncertain") o = true;
      }
    }
    for (let copySource of writeTargetsForAstCommand.copySources) {
      S++;
      if (S > MAX_ENV_SCAN_STEPS) return "uncertain";
      if (N(copySource).some((R) => classifyWriteTarget(copySource, R) === "settings")) p = true;
      else if (N(copySource).some((R) => isServedUnplaceablePath(copySource, R))) o = true;
    }
  }
  if (o || (t && !(p && g))) return "uncertain";
  return "none";
}
//@ chunk-whwptcwy.js:6876-6948 placement
/**
 * 影响工作目录的变量集合与 cd 类选项正则；有它们时不能沿用原 cwd 判断。
 */
var CWD_INFLUENCING_VARS = new Set(["HOME", "CDPATH", "PWD", "OLDPWD"]);
var CD_FLAG_RE = /^-[^-]*[CD]|^--chd/;
//@ chunk-whwptcwy.js:6948-7778 placement
async function classifyCommandForSandbox(command, n) {
  let shellCommand = await parseShellCommand(command);
  if (shellCommand.kind !== "simple" || shellCommand.hasLoop !== false) return "unparsed";
  let any = shellCommand.bareAssignmentNames.some((bareAssignmentName) =>
    CWD_INFLUENCING_VARS.has(bareAssignmentName),
  );
  let s = [n];
  let i = false;
  let o = [];
  for (let command of shellCommand.commands) {
    if (
      command.envVars.some((envVar) => CWD_INFLUENCING_VARS.has(envVar.name)) ||
      command.argv.some((arg) => arg.includes("=") && CWD_INFLUENCING_VARS.has(arg.split(/\+?=/, 1)[0] ?? ""))
    )
      any = true;
    let { simple, wrapperWords } = describeSubcommandResults(command);
    let p = i;
    let directoryChange = resolveDirectoryChange(simple, s);
    if (
      directoryChange === "unknown" ||
      (directoryChange !== undefined && (any || simple.argv.slice(1).some(hasDotDotAfterSegment)))
    )
      i = true;
    if (directoryChange !== undefined && !isDirectoryChangeCommand(simple)) i = true;
    if (directoryChange !== undefined && directoryChange !== "unknown") s = directoryChange;
    let any_2 = wrapperWords.some((wrapperWord) => CD_FLAG_RE.test(wrapperWord));
    for (let h of [
      {
        list: command.argv,
        directories: any_2 ? [] : s,
        mayBeElsewhere: p || any_2,
      },
      {
        list: [
          ...command.envVars.map((envVar) => envVar.value),
          ...command.redirects
            .filter((redirect) => redirect.op !== "<<" && redirect.op !== "<<<")
            .map((redirect) => redirect.target),
        ],
        directories: s,
        mayBeElsewhere: p,
      },
    ])
      for (let d of h.list)
        for (let word of getArgPathVariants(d))
          o.push({
            word,
            directories: h.directories,
            mayBeElsewhere: h.mayBeElsewhere,
          });
  }
  return o;
}
//@ chunk-whwptcwy.js:7778-7928 placement
function getArgPathVariants(e) {
  return [
    e,
    ...(e.includes("=") ? [e.slice(e.indexOf("=") + 1)] : []),
    ...(/^-[^-]./.test(e)
      ? Array.from(
          {
            length: e.length - 2,
          },
          (n, t) => e.slice(t + 2),
        )
      : []),
  ];
}
//@ chunk-whwptcwy.js:7928-8543 placement
function describeSubcommandResults(command) {
  let [n, ...t] = command.argv;
  if (n === undefined)
    return {
      simple: command,
      wrapperWords: [],
      pathSpelled: false,
      doubt: false,
    };
  let r = [stripPathAndExe(n), ...t];
  let s = stripWrappersFromArgvForPaths(unwrapCommandArgv(r));
  let i = r.length - s.length;
  let o = i >= 0 && s.every((p, g) => p === r[i + g]);
  let a = o ? r.slice(0, i) : r;
  let f = o && i === 0 ? n : s[0];
  let u = f === undefined ? undefined : stripPathAndExe(f);
  return {
    simple:
      o && i === 0 && n === r[0]
        ? command
        : {
            ...command,
            argv: s,
            text: shellQuoteArgs(s),
          },
    wrapperWords: a,
    pathSpelled: n !== r[0] || (f !== undefined && f !== u) || a.some((p) => p !== stripPathAndExe(p)),
    doubt:
      !o ||
      !isPlainCommandWord(n) ||
      [...a, ...(f === undefined ? [] : [f])].some(containsAnyPlaceholder) ||
      a.some(
        (p) =>
          (p.startsWith("-") && p !== "-" && p !== "--") ||
          isNonLocaleExecInfluencingVar(/^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(p)?.[1] ?? ""),
      ) ||
      (f !== undefined &&
        u !== undefined &&
        (!isPlainCommandWord(f) || u.startsWith("-") || EXEC_CAPABLE_COMMANDS.has(u))),
  };
}
//@ chunk-whwptcwy.js:8543-8704 placement = spawnScriptArgs (0.635)
function hasPlaceholderInArgs(simple) {
  let [n, ...t] = simple.argv;
  return (
    simple.envVars.some((envVar) => isNonLocaleExecInfluencingVar(envVar.name)) ||
    (n !== undefined &&
      DECLARATION_COMMANDS.has(n) &&
      t.some((r) => {
        let s = r.split(/\+?=/, 1)[0] ?? "";
        return containsAnyPlaceholder(s) || isExecInfluencingVar(s);
      }))
  );
}
//@ chunk-whwptcwy.js:8704-8993 placement
function classifyWriteTarget(e, n) {
  let t = validatePath(e, n, getEmptyToolPermissionContext(), "write");
  if (t.allowed) return "none";
  if (t.decisionReason?.type === "safetyCheck") {
    if (isHostPersonOnlyCircuitBreaker(t.decisionReason)) return "settings";
    return isServedUnplaceableCircuitBreaker(t.decisionReason) ? "uncertain" : "none";
  }
  if (t.decisionReason?.type !== "other") return "none";
  return isHostPersonOnlyPath(e, n) ? "settings" : "uncertain";
}
//@ chunk-whwptcwy.js:8993-9117 placement
function isServedUnplaceablePath(copySource, n) {
  let t = validatePath(copySource, n, getEmptyToolPermissionContext(), "write");
  return (
    !t.allowed &&
    t.decisionReason?.type === "safetyCheck" &&
    isServedUnplaceableCircuitBreaker(t.decisionReason)
  );
}
//@ chunk-whwptcwy.js:9117-9224 placement
/**
 * 判断路径是否只允许宿主用户本人编辑（命中仅限本人的安全熔断）。
 */
function isHostPersonOnlyPath(e, n) {
  let t = resolve(n, expandTildeWithHome(getPlatform() === "windows" ? e.replaceAll("\\", "/") : e));
  let r = checkPathSafetyForAutoEdit(t, [t]);
  return !r.safe && isHostPersonOnlyCircuitBreaker(r);
}
//@ chunk-whwptcwy.js:9224-9705 placement
function resolveDirectoryChange(simple, n) {
  let [t, ...r] = simple.argv;
  if (t === "popd") return "unknown";
  if (t !== "cd" && t !== "chdir" && t !== "pushd") return;
  let s = [];
  let i = false;
  for (let u of r) {
    if (!i) {
      if (u === "--") {
        i = true;
        continue;
      }
      if (u.startsWith("-") && u !== "-") continue;
      i = true;
    }
    s.push(u);
  }
  let o = s[0];
  if (o === undefined) return t === "pushd" ? "unknown" : cappedPathList(n, [homedir()]);
  if (
    s.length > 1 ||
    o === "-" ||
    (t === "pushd" && /^[+-]\d+$/.test(o)) ||
    containsAnyPlaceholder(o) ||
    classifyWriteTarget(o, n[0] ?? homedir()) === "uncertain"
  )
    return "unknown";
  let a = expandTildeWithHome(o);
  let f = isAbsolute(a) ? [a] : n.map((u) => resolve(u, a));
  return cappedPathList(n, [...f, ...f.flatMap(additionalPermissionPaths)]);
}
//@ chunk-whwptcwy.js:9705-10028 placement
function isDirectoryChangeCommand(simple) {
  let [n, ...t] = simple.argv;
  if (n !== "cd" && n !== "chdir" && n !== "pushd") return true;
  if (
    !readFlagWithOverride(TENGU_NIFTY_PINE, {
      safe: true,
    })
  )
    return true;
  let r = [];
  let s = false;
  for (let i of t) {
    if (!s) {
      if (i === "--") {
        s = true;
        continue;
      }
      if (i.startsWith("-") && i !== "-") {
        if (!/^-[qsLP]+$/.test(i)) return false;
        continue;
      }
      s = true;
    }
    r.push(i);
  }
  return r.length < 2 && (r[0] === undefined || !/^[+-]\d+$/.test(r[0]));
}
//@ chunk-whwptcwy.js:10028-10146 placement
function hasDotDotAfterSegment(e) {
  let n = false;
  for (let t of e.split(/[\\/]/))
    if (t === "..") {
      if (n) return true;
    } else if (t !== "" && t !== ".") n = true;
  return false;
}
//@ chunk-whwptcwy.js:10146-10213 placement
/**
 * 取命令涉及的其他权限路径（排除路径本身），用于把路径规则也应用到这些路径上。
 */
function additionalPermissionPaths(e) {
  try {
    return getPathsForPermissionCheck(e).filter((n) => n !== e);
  } catch {
    return [];
  }
}
//@ chunk-whwptcwy.js:10213-10281 placement
/**
 * 合并路径列表去重，数量超过上限时返回 “unknown”，避免路径检查泄漏。
 */
function cappedPathList(e, n) {
  let t = uniq([...e, ...n]);
  return t.length > MAX_REPORTED_COMMAND_CHARS ? "unknown" : t;
}
export {
  useSecurityParser,
  shouldBypassAskForReadOnly,
  servedLineTouchesProtectedPath,
  touchesProtectedPath,
  parseShellCommand,
  isReadOnlyCommand,
  classifyCommandForSandbox,
  getProtectedSettingsPaths,
  isHostPersonOnlyPath,
  isServedLineWriting,
};
