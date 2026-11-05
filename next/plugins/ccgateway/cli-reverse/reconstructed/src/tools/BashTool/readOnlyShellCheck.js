/**
 * tools/BashTool/readOnlyShellCheck.ts
 *
 * 2.1.316 新增：基于 Bash 解析器的只读命令判定（served shell 行、settings 文件写入、simctl 等应用操作、cd/pushd 处理）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9mrb3qx9.js (32)
 * attribution: placement 31, layout 1
 */
import { join, basename, isAbsolute, resolve } from "path";
import { homedir } from "os";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { runWithRuleOff, withSturdyLanternOff } from "../../utils/bash/bashReadingFlags.js";
import {
  withReExpansionIfNeeded,
  needsReExpansionRun,
  isGuardOff,
  runGuarded,
  runWithGuardOff,
} from "../../utils/bash/bashParserFlags.js";
import {
  parseForSecurity,
  parseForSecurityFromAst,
  failsSubstitutionTextCheck,
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
  normalizeCaseForComparison_2,
} from "../../utils/permissions/filesystem.js";
import { tildify } from "../../utils/path.js";
import { urlPatternToRegex } from "../../utils/stringUtils.js";
import { getWriteTargetsForAstCommand, stripWrappersFromArgvForPaths } from "./pathValidation.js";
import { unwrapCommandArgv } from "./bashPermissions.js";
import { shellQuoteArgs } from "../../utils/bash/bashPipeCommand.js";
import { validatePath } from "../../utils/permissions/pathValidation.js";
import { getEmptyToolPermissionContext } from "../../Tool.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { getPlatform } from "../../utils/platform.js";
import { getPathsForPermissionCheck } from "../../utils/fsOperations.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-9mrb3qx9.js:1132-1160 placement
var TENGU_VIOLIN_LINING = "tengu_violin_lining";
//@ chunk-9mrb3qx9.js:1160-1198 placement
/**
 * 读取 tengu_violin_lining 开关：只读判定时是否用安全解析器解析命令。
 */
function useSecurityParser() {
  return readFlagWithOverride(TENGU_VIOLIN_LINING, {
    safe: true,
  });
}
//@ chunk-9mrb3qx9.js:1198-1474 placement
/**
 * 解析命令（解析器放弃时标为 too-complex）。
 */
async function parseShellCommand(command) {
  return runWithRuleOff(() =>
    withSturdyLanternOff(() =>
      withReExpansionIfNeeded(command, async () => {
        if (!useSecurityParser()) return parseForSecurity(command);
        let commandRaw = await parseCommandRaw(command);
        if (commandRaw === PARSE_ABORTED && command.trim() !== "")
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
          : parseForSecurityFromAst(command, commandRaw);
      }),
    ),
  );
}
//@ chunk-9mrb3qx9.js:1474-1548 layout
async function readOnlyShellCheck(command) {
  let commandText = await parseCommandRaw(command);
  return (
    commandText !== null && commandText !== PARSE_ABORTED && failsSubstitutionTextCheck(command, commandText)
  );
}
//@ chunk-9mrb3qx9.js:1648-1685 placement
/**
 * 上报命令文本的长度上限（16）与扫描步数上限（64），超出分别记为 unknown / uncertain。
 */
var MAX_REPORTED_COMMAND_CHARS = 16;
var MAX_ENV_SCAN_STEPS = 64;
var TENGU_NIFTY_PINE = "tengu_nifty_pine";
//@ chunk-9mrb3qx9.js:1685-1738 placement
/**
 * 判断变量是否影响命令执行（被判定工具当作输入）。
 */
function isExecInfluencingVar(name) {
  return isExecInfluencingVar_2(name) || name === "PWD" || name === "OLDPWD";
}
//@ chunk-9mrb3qx9.js:1738-1806 placement
/**
 * 排除 LANG/LANGUAGE/LC_* 后，变量是否仍影响执行。
 */
function isNonLocaleExecInfluencingVar(name) {
  return !/^(?:LANG|LANGUAGE|LC_[A-Z]+)$/i.test(name) && isExecInfluencingVar(name);
}
//@ chunk-9mrb3qx9.js:1806-1988 placement (2.1.88 match: DECLARATION_COMMANDS, 0.701)
/**
 * 声明命令集合、可执行代码的命令集合（eval 类、zsh 危险内建、shell 程序、包装命令、xargs、parallel），Claude 配置目录下的敏感文件名（.config.json、.credentials.json、.device-keys.json），以及开关名 tengu_toasty_hammock。属只读命令判定的辅助模块。
 */
var DECLARATION_COMMANDS; // deferred: uses EVAL_LIKE_BUILTINS (../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var EXEC_CAPABLE_COMMANDS;
var CLAUDE_HOME_SECRET_FILE_NAMES;
var TENGU_TOASTY_HAMMOCK;
deferInit("chunk-9mrb3qx9.js:1806", () => {
  DECLARATION_COMMANDS = new Set(["export", "declare", "typeset", "readonly", "local", "unset"]);
  EXEC_CAPABLE_COMMANDS = new Set([
    ...EVAL_LIKE_BUILTINS,
    ...ZSH_DANGEROUS_BUILTINS,
    ...SHELL_PROGRAM_NAMES,
    ...TRANSPARENT_LAUNCHER_NAMES,
    ...UNHANDLED_EXEC_WRAPPERS,
    "xargs",
    "parallel",
  ]);
  CLAUDE_HOME_SECRET_FILE_NAMES = [LEGACY_CONFIG_JSON, CREDENTIALS_FILE_NAME, DEVICE_KEYS_FILE_NAME];
  TENGU_TOASTY_HAMMOCK = "tengu_toasty_hammock";
});
//@ chunk-9mrb3qx9.js:1988-2060 placement
/**
 * 判断词是否为 [、[[ 或只含安全字符，可作为命令名/参数。
 */
function isPlainCommandWord(word) {
  return word === "[" || word === "[[" || /^[A-Za-z0-9_.+:~/-]+$/.test(word);
}
//@ chunk-9mrb3qx9.js:2060-2429 placement
async function shouldBypassAskForReadOnly(tool, input, result, cwd) {
  let isPersonOnly =
    result.behavior === "ask" &&
    findSafetyCheckReason(result.decisionReason, isHostPersonOnlyCircuitBreaker) !== undefined;
  if (tool.name === BASH_TOOL_NAME) {
    if (typeof input.command !== "string") return "uncertain";
    let verdict = await classifyServedShellLine(input.command, cwd, isPersonOnly);
    return verdict === "none" &&
      result.behavior === "ask" &&
      findSafetyCheckReason(result.decisionReason, isServedUnplaceableCircuitBreaker) !== undefined
      ? "uncertain"
      : verdict;
  }
  if (tool.name !== POWERSHELL_TOOL_NAME) return "none";
  if (isPersonOnly) return "settings";
  return result.behavior === "ask" && SAFETY_CHECK_FIELDS(result) ? "uncertain" : "none";
}
//@ chunk-9mrb3qx9.js:2429-2606 placement
/**
 * 判断托管服务的命令行是否会写入受保护路径（Bash/PowerShell 且非只读）。
 */
async function servedLineTouchesProtectedPath(tool, input, result, allowReadOnly = false) {
  if (
    (tool.name !== BASH_TOOL_NAME && tool.name !== POWERSHELL_TOOL_NAME) ||
    !touchesProtectedPath(input, "file") ||
    !(await isServedLineWriting(tool, input, result))
  )
    return false;
  let command = input.command;
  return !(
    allowReadOnly &&
    tool.name === BASH_TOOL_NAME &&
    typeof command === "string" &&
    (await isReadOnlyCommand(command))
  );
}
//@ chunk-9mrb3qx9.js:2606-2852 placement
/**
 * 判断托管服务的命令是否会写入（PowerShell 按解析结果，其他用工具的 isReadOnly）。
 */
async function isServedLineWriting(tool, input, result) {
  try {
    let command = input.command;
    return tool.name === POWERSHELL_TOOL_NAME && typeof command === "string"
      ? !isReadOnlyCommand_2(command, await parsePowerShellCommand(command))
      : !tool.isReadOnly(input, result);
  } catch (error) {
    logError(
      Error("a served shell line's read-only check threw; the line counts as not read-only", {
        cause: error,
      }),
    );
    return true;
  }
}
//@ chunk-9mrb3qx9.js:2852-2984 placement
/**
 * 列出受保护的设置与密钥文件路径，以及全局 OAuth 配置文件名。
 */
function getProtectedSettingsPaths() {
  return {
    paths: [
      ...claudeStateFilePaths(),
      ...getClaudeConfigDirs().flatMap((configDir) =>
        CLAUDE_HOME_SECRET_FILE_NAMES.map((fileName) => join(configDir, fileName)),
      ),
    ],
    globalConfigNames: OAUTH_GLOBAL_FILE_SUFFIXES.map((suffix) => `.claude${suffix}.json`),
  };
}
//@ chunk-9mrb3qx9.js:2984-3251 placement
/**
 * 一组常量：simctl/open/defaults 的子命令、形如 a.b.claude 的 bundle id 正则、以及判断命令含危险 shell 语法的正则。
 */
var SIMCTL_APP_VERBS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CLAUDE_APP_BUNDLE_ID_RE;
var regExp;
var DANGEROUS_SHELL_SYNTAX_RE;
deferInit("chunk-9mrb3qx9.js:2984", () => {
  SIMCTL_APP_VERBS = {
    simctl: ["launch", "terminate", "uninstall", "get_app_container", "appinfo", "privacy"],
    open: ["-b"],
    defaults: ["read", "read-type", "write", "delete"],
  };
  CLAUDE_APP_BUNDLE_ID_RE = String.raw`(?:[a-z][a-z0-9_-]*\.){2,}claude`;
  regExp = new RegExp(`^${CLAUDE_APP_BUNDLE_ID_RE}$`, "i");
  DANGEROUS_SHELL_SYNTAX_RE = /[|`\\(]|\$[{_]|\$BASH|<<|\bfunction\b/;
});
//@ chunk-9mrb3qx9.js:3251-4402 placement
/**
 * 判断命令是否只读（简单命令、无赋值、目标不是设置文件）。
 */
async function isReadOnlyCommand(command) {
  if (DANGEROUS_SHELL_SYNTAX_RE.test(command)) return false;
  try {
    let shellCommand = await parseShellCommand(command);
    if (
      shellCommand.kind !== "simple" ||
      shellCommand.bareAssignmentNames.some(isExecInfluencingVar) ||
      needsReExpansionRun(command)
    )
      return false;
    let appIds = [];
    let command_2 = command.replace(
      new RegExp(String.raw`(^|\s)(${CLAUDE_APP_BUNDLE_ID_RE})(?=$|[\s;&])`, "gi"),
      (prefix, matched, appId) => {
        appIds.push(appId);
        return `${matched}APPID`;
      },
    );
    let argvAppIds = [];
    let settingAppIds = 0;
    for (let { argv, envVars, redirects } of shellCommand.commands) {
      if (
        envVars.some((envVar) => isExecInfluencingVar(envVar.name)) ||
        redirects.some(
          ({ op, target }) => target !== "/dev/null" && !(op === ">&" && (target === "1" || target === "2")),
        )
      )
        return false;
      let program = argv[0];
      let simctlIdx =
        program === "simctl"
          ? 0
          : (program === "xcrun" || program === "/usr/bin/xcrun") && argv[1] === "simctl"
            ? 1
            : undefined;
      let simctlVerb = simctlIdx === undefined ? undefined : argv[simctlIdx + 1];
      let simctlVerbIdx =
        simctlIdx !== undefined && simctlVerb !== undefined && SIMCTL_APP_VERBS.simctl.includes(simctlVerb)
          ? simctlIdx + 1
          : undefined;
      let isDefaults =
        (program === "defaults" || program === "/usr/bin/defaults") &&
        argv[1] !== undefined &&
        SIMCTL_APP_VERBS.defaults.includes(argv[1]);
      let isOpen = program === "open" || program === "/usr/bin/open";
      if (simctlIdx === undefined && !isDefaults && !isOpen && program !== undefined && program !== "sleep")
        return false;
      for (let [argIdx, arg] of argv.entries()) {
        if (!regExp.test(arg)) continue;
        argvAppIds.push(arg);
        let previousArg = argv[argIdx - 1];
        if (
          (simctlVerbIdx !== undefined && argIdx > simctlVerbIdx) ||
          (isDefaults && argIdx === 2) ||
          (isOpen && previousArg !== undefined && SIMCTL_APP_VERBS.open.includes(previousArg))
        )
          settingAppIds += 1;
      }
    }
    return (
      appIds.length > 0 &&
      settingAppIds === argvAppIds.length &&
      appIds.toSorted().join(" ") === argvAppIds.toSorted().join(" ") &&
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
//@ chunk-9mrb3qx9.js:4402-5220 placement
function touchesProtectedPath(input, mode) {
  let command = input.command;
  if (typeof command !== "string") return true;
  let { files, dirs } = settingsLocationPaths();
  let includesSecrets = mode !== "file_or_folder";
  let isOwnFile = mode === "own_file";
  let flattened = dirs.flatMap((dir) => [dir, tildify(dir)]);
  let protectedSettingsPaths = getProtectedSettingsPaths();
  let paths = includesSecrets ? protectedSettingsPaths.paths : [];
  let needlePaths = [
    ...(isOwnFile ? [] : [...settingsTextNeedles(), "managed-settings"]),
    ...(includesSecrets
      ? protectedSettingsPaths.globalConfigNames
      : [...SETTINGS_FILE_BASENAMES, ...flattened]),
    ...[...(isOwnFile ? [] : files), ...paths].flatMap((path) => [path, tildify(path)]),
  ];
  let directoryWords = settingsDirectoryWords();
  let fileNames = includesSecrets
    ? [...(isOwnFile ? [] : SETTINGS_FILE_BASENAMES), ...CLAUDE_HOME_SECRET_FILE_NAMES]
    : files.map((file) => basename(file)).filter((fileName) => fileName.includes("."));
  return ["", "/"].some((separator) => {
    let normalizedCommand = normalizeForPathMatch(command, separator);
    if (needlePaths.some((needle) => normalizedCommand.includes(normalizeForPathMatch(needle, separator))))
      return true;
    let any = directoryWords.some((word) =>
      new RegExp(`${urlPatternToRegex(normalizeForPathMatch(word, separator))}(?![a-z0-9_])`).test(
        normalizedCommand,
      ),
    );
    let any_2 = fileNames.some((fileName) =>
      new RegExp(
        `(?<![a-z0-9_])${urlPatternToRegex(normalizeForPathMatch(fileName, separator))}(?![a-z0-9_])`,
      ).test(normalizedCommand),
    );
    if (!includesSecrets) return any || any_2;
    return (
      (any_2 &&
        (any ||
          flattened.some((dir) => normalizedCommand.includes(normalizeForPathMatch(dir, separator))))) ||
      (isOwnFile ? [] : [...directoryWords, ...flattened]).some((needle) =>
        new RegExp(
          `${urlPatternToRegex(normalizeForPathMatch(needle, separator))}(?![a-z0-9_-])(?=((?:/+(?:\\.(?![a-z0-9_.-]))?)*))\\1(?!\\.?[a-z0-9_-])`,
        ).test(normalizedCommand),
      )
    );
  });
}
//@ chunk-9mrb3qx9.js:5220-5307 placement
/**
 * 规整命令文本以便按路径匹配：NFKC、去掉引号、按平台替换反斜杠。
 */
function normalizeForPathMatch(text, separator) {
  return normalizeCaseForComparison(text.normalize("NFKC")).replace(/['"`]/g, "").replaceAll("\\", separator);
}
//@ chunk-9mrb3qx9.js:5307-5668 placement
function SAFETY_CHECK_FIELDS(result) {
  let decisionReason = result.decisionReason;
  if (decisionReason?.type === "subcommandResults") {
    for (let reason of decisionReason.reasons.values())
      if (reason.behavior === "ask" && SAFETY_CHECK_FIELDS(reason)) return true;
    return false;
  }
  if (decisionReason === undefined) return result.blockedPath === undefined;
  if (decisionReason.type === "sandboxOverride")
    return decisionReason.replaces !== undefined && SAFETY_CHECK_FIELDS(decisionReason.replaces);
  if (decisionReason.type === "safetyCheck" && !isHostPersonOnlyCircuitBreaker(decisionReason))
    return isServedUnplaceableCircuitBreaker(decisionReason) || result.blockedPath === undefined;
  return decisionReason.type === "other";
}
//@ chunk-9mrb3qx9.js:5668-7046 placement
/**
 * 对 served shell 行做只读检查（检查抛错时视为不确定）。
 */
async function classifyServedShellLine(command, cwd, includeCopySources = false) {
  let guardOff = isGuardOff();
  let { result: parsed, fired } = await runGuarded(guardOff, () => parseShellCommand(command));
  if (parsed.kind !== "simple")
    return fired &&
      !guardOff &&
      (await runWithGuardOff(() => classifyServedShellLine(command, cwd, includeCopySources))) === "settings"
      ? "settings"
      : "uncertain";
  let isUncertain =
    parsed.bareAssignmentNames.some(isExecInfluencingVar) ||
    parsed.laterLoopPassesDiffer === true ||
    needsReExpansionRun(command) ||
    (await readOnlyShellCheck(command));
  let currentDirs = [cwd];
  let dirsResolved = true;
  let hasUnknownCd = false;
  let copiesSettings = false;
  let allCommandsKnown = true;
  let scanSteps = 0;
  let trackLoops =
    parsed.hasLoop !== false &&
    readFlagWithOverride(TENGU_TOASTY_HAMMOCK, {
      safe: true,
    });
  for (let command of parsed.commands) {
    let { simple, wrapperWords, pathSpelled, doubt } = describeSubcommandResults(command);
    if (doubt || hasPlaceholderInArgs(simple) || hasUnknownCd) isUncertain = true;
    let directoryChange = resolveDirectoryChange(simple, currentDirs);
    if (directoryChange !== undefined && trackLoops) isUncertain = true;
    if (directoryChange === "unknown") dirsResolved = false;
    else if (directoryChange !== undefined) {
      currentDirs = directoryChange;
      if (simple.argv.slice(1).some(hasDotDotAfterSegment)) dirsResolved = false;
    }
    if (directoryChange !== undefined && !isDirectoryChangeCommand(simple)) {
      dirsResolved = false;
      hasUnknownCd = true;
    }
    let writeTargetsForAstCommand = getWriteTargetsForAstCommand(simple);
    if (writeTargetsForAstCommand.writesUnseen) isUncertain = true;
    if (!writeTargetsForAstCommand.known && directoryChange === undefined && simple.argv.length > 0)
      allCommandsKnown = false;
    let dirsFor = (path) => (isAbsolute(path) || path.startsWith("~") ? [cwd] : currentDirs);
    let flattened = [
      ...wrapperWords,
      ...(writeTargetsForAstCommand.known && !pathSpelled ? [] : simple.argv.slice(1)),
      ...simple.envVars.map((envVar) => envVar.value),
    ].flatMap((value) => getArgPathVariants(value));
    if (
      !writeTargetsForAstCommand.known &&
      directoryChange === undefined &&
      simple.argv.length > 0 &&
      currentDirs.some((dir) => isHostPersonOnlyPath(".", dir))
    )
      isUncertain = true;
    if (
      !dirsResolved &&
      flattened.some(
        (path) =>
          path !== "" &&
          !isAbsolute(path) &&
          !path.startsWith("~") &&
          isHostPersonOnlyPath(path, resolve(cwd, ".claude")),
      )
    )
      isUncertain = true;
    for (let path of [...flattened, ...writeTargetsForAstCommand.landings])
      if (path !== "" && dirsFor(path).some((dir) => isHostPersonOnlyPath(path, dir))) isUncertain = true;
    for (let target of writeTargetsForAstCommand.written) {
      scanSteps++;
      if (scanSteps > MAX_ENV_SCAN_STEPS) return "uncertain";
      if (containsAnyPlaceholder(target) || (dirsFor(target) === currentDirs && !dirsResolved))
        isUncertain = true;
      for (let dir of dirsFor(target)) {
        let verdict = classifyWriteTarget(target, dir);
        if (verdict === "settings") return "settings";
        if (verdict === "uncertain") isUncertain = true;
      }
    }
    for (let copySource of writeTargetsForAstCommand.copySources) {
      scanSteps++;
      if (scanSteps > MAX_ENV_SCAN_STEPS) return "uncertain";
      if (dirsFor(copySource).some((dir) => classifyWriteTarget(copySource, dir) === "settings"))
        copiesSettings = true;
      else if (dirsFor(copySource).some((dir) => isServedUnplaceablePath(copySource, dir)))
        isUncertain = true;
    }
  }
  if (isUncertain || (includeCopySources && !(copiesSettings && allCommandsKnown))) return "uncertain";
  return "none";
}
//@ chunk-9mrb3qx9.js:7046-7118 placement
/**
 * 影响工作目录的变量集合与 cd 类选项正则；有它们时不能沿用原 cwd 判断。
 */
var CWD_INFLUENCING_VARS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var CD_FLAG_RE;
deferInit("chunk-9mrb3qx9.js:7046", () => {
  CWD_INFLUENCING_VARS = new Set(["HOME", "CDPATH", "PWD", "OLDPWD"]);
  CD_FLAG_RE = /^-[^-]*[CD]|^--chd/;
});
//@ chunk-9mrb3qx9.js:7118-7948 placement
async function classifyCommandForSandbox(command, cwd) {
  let shellCommand = await parseShellCommand(command);
  if (shellCommand.kind !== "simple" || shellCommand.hasLoop !== false) return "unparsed";
  let any = shellCommand.bareAssignmentNames.some((bareAssignmentName) =>
    CWD_INFLUENCING_VARS.has(bareAssignmentName),
  );
  let currentDirs = [cwd];
  let isCwdUnknown = false;
  let entries = [];
  for (let command of shellCommand.commands) {
    if (
      command.envVars.some((envVar) => CWD_INFLUENCING_VARS.has(envVar.name)) ||
      command.argv.some((arg) => arg.includes("=") && CWD_INFLUENCING_VARS.has(arg.split(/\+?=/, 1)[0] ?? ""))
    )
      any = true;
    let { simple, wrapperWords } = describeSubcommandResults(command);
    let wasUnknown = isCwdUnknown;
    let directoryChange = resolveDirectoryChange(simple, currentDirs);
    if (
      directoryChange === "unknown" ||
      (directoryChange !== undefined && (any || simple.argv.slice(1).some(hasDotDotAfterSegment)))
    )
      isCwdUnknown = true;
    if (directoryChange !== undefined && !isDirectoryChangeCommand(simple)) isCwdUnknown = true;
    if (directoryChange !== undefined && directoryChange !== "unknown") currentDirs = directoryChange;
    let any_2 = wrapperWords.some((wrapperWord) => CD_FLAG_RE.test(wrapperWord));
    for (let group of [
      {
        list: command.argv,
        directories: any_2 ? [] : currentDirs,
        mayBeElsewhere: wasUnknown || any_2,
      },
      {
        list: [
          ...command.envVars.map((envVar) => envVar.value),
          ...command.redirects
            .filter((redirect) => redirect.op !== "<<" && redirect.op !== "<<<")
            .map((redirect) => redirect.target),
        ],
        directories: currentDirs,
        mayBeElsewhere: wasUnknown,
      },
    ])
      for (let value of group.list)
        for (let word of getArgPathVariants(value))
          entries.push({
            word,
            directories: group.directories,
            mayBeElsewhere: group.mayBeElsewhere,
          });
  }
  return entries;
}
//@ chunk-9mrb3qx9.js:7948-8098 placement
function getArgPathVariants(arg) {
  return [
    arg,
    ...(arg.includes("=") ? [arg.slice(arg.indexOf("=") + 1)] : []),
    ...(/^-[^-]./.test(arg)
      ? Array.from(
          {
            length: arg.length - 2,
          },
          (unused, offset) => arg.slice(offset + 2),
        )
      : []),
  ];
}
//@ chunk-9mrb3qx9.js:8098-8713 placement
function describeSubcommandResults(command) {
  let [program, ...args] = command.argv;
  if (program === undefined)
    return {
      simple: command,
      wrapperWords: [],
      pathSpelled: false,
      doubt: false,
    };
  let normalizedArgv = [stripPathAndExe(program), ...args];
  let unwrappedArgv = stripWrappersFromArgvForPaths(unwrapCommandArgv(normalizedArgv));
  let droppedCount = normalizedArgv.length - unwrappedArgv.length;
  let isPrefixOfUnwrapped =
    droppedCount >= 0 && unwrappedArgv.every((word, idx) => word === normalizedArgv[droppedCount + idx]);
  let wrapperWords = isPrefixOfUnwrapped ? normalizedArgv.slice(0, droppedCount) : normalizedArgv;
  let commandWord = isPrefixOfUnwrapped && droppedCount === 0 ? program : unwrappedArgv[0];
  let baseName = commandWord === undefined ? undefined : stripPathAndExe(commandWord);
  return {
    simple:
      isPrefixOfUnwrapped && droppedCount === 0 && program === normalizedArgv[0]
        ? command
        : {
            ...command,
            argv: unwrappedArgv,
            text: shellQuoteArgs(unwrappedArgv),
          },
    wrapperWords,
    pathSpelled:
      program !== normalizedArgv[0] ||
      (commandWord !== undefined && commandWord !== baseName) ||
      wrapperWords.some((word) => word !== stripPathAndExe(word)),
    doubt:
      !isPrefixOfUnwrapped ||
      !isPlainCommandWord(program) ||
      [...wrapperWords, ...(commandWord === undefined ? [] : [commandWord])].some(containsAnyPlaceholder) ||
      wrapperWords.some(
        (word) =>
          (word.startsWith("-") && word !== "-" && word !== "--") ||
          isNonLocaleExecInfluencingVar(/^([A-Za-z_][A-Za-z0-9_]*)\+?=/.exec(word)?.[1] ?? ""),
      ) ||
      (commandWord !== undefined &&
        baseName !== undefined &&
        (!isPlainCommandWord(commandWord) ||
          baseName.startsWith("-") ||
          EXEC_CAPABLE_COMMANDS.has(baseName))),
  };
}
//@ chunk-9mrb3qx9.js:8713-8874 placement (2.1.88 match: spawnScriptArgs, 0.637)
function hasPlaceholderInArgs(simple) {
  let [program, ...args] = simple.argv;
  return (
    simple.envVars.some((envVar) => isNonLocaleExecInfluencingVar(envVar.name)) ||
    (program !== undefined &&
      DECLARATION_COMMANDS.has(program) &&
      args.some((arg) => {
        let varName = arg.split(/\+?=/, 1)[0] ?? "";
        return containsAnyPlaceholder(varName) || isExecInfluencingVar(varName);
      }))
  );
}
//@ chunk-9mrb3qx9.js:8874-9163 placement
function classifyWriteTarget(path, cwd) {
  let validation = validatePath(path, cwd, getEmptyToolPermissionContext(), "write");
  if (validation.allowed) return "none";
  if (validation.decisionReason?.type === "safetyCheck") {
    if (isHostPersonOnlyCircuitBreaker(validation.decisionReason)) return "settings";
    return isServedUnplaceableCircuitBreaker(validation.decisionReason) ? "uncertain" : "none";
  }
  if (validation.decisionReason?.type !== "other") return "none";
  return isHostPersonOnlyPath(path, cwd) ? "settings" : "uncertain";
}
//@ chunk-9mrb3qx9.js:9163-9287 placement
function isServedUnplaceablePath(copySource, cwd) {
  let validation = validatePath(copySource, cwd, getEmptyToolPermissionContext(), "write");
  return (
    !validation.allowed &&
    validation.decisionReason?.type === "safetyCheck" &&
    isServedUnplaceableCircuitBreaker(validation.decisionReason)
  );
}
//@ chunk-9mrb3qx9.js:9287-9394 placement
/**
 * 判断路径是否只允许宿主用户本人编辑（命中仅限本人的安全熔断）。
 */
function isHostPersonOnlyPath(path, cwd) {
  let resolved = resolve(
    cwd,
    expandTildeWithHome(getPlatform() === "windows" ? path.replaceAll("\\", "/") : path),
  );
  let safety = checkPathSafetyForAutoEdit(resolved, [resolved]);
  return !safety.safe && isHostPersonOnlyCircuitBreaker(safety);
}
//@ chunk-9mrb3qx9.js:9394-9875 placement
function resolveDirectoryChange(simple, dirs) {
  let [commandName, ...args] = simple.argv;
  if (commandName === "popd") return "unknown";
  if (commandName !== "cd" && commandName !== "chdir" && commandName !== "pushd") return;
  let operands = [];
  let sawOperand = false;
  for (let arg of args) {
    if (!sawOperand) {
      if (arg === "--") {
        sawOperand = true;
        continue;
      }
      if (arg.startsWith("-") && arg !== "-") continue;
      sawOperand = true;
    }
    operands.push(arg);
  }
  let target = operands[0];
  if (target === undefined) return commandName === "pushd" ? "unknown" : cappedPathList(dirs, [homedir()]);
  if (
    operands.length > 1 ||
    target === "-" ||
    (commandName === "pushd" && /^[+-]\d+$/.test(target)) ||
    containsAnyPlaceholder(target) ||
    classifyWriteTarget(target, dirs[0] ?? homedir()) === "uncertain"
  )
    return "unknown";
  let expanded = expandTildeWithHome(target);
  let resolvedDirs = isAbsolute(expanded) ? [expanded] : dirs.map((dir) => resolve(dir, expanded));
  return cappedPathList(dirs, [...resolvedDirs, ...resolvedDirs.flatMap(additionalPermissionPaths)]);
}
//@ chunk-9mrb3qx9.js:9875-10198 placement
function isDirectoryChangeCommand(simple) {
  let [commandName, ...args] = simple.argv;
  if (commandName !== "cd" && commandName !== "chdir" && commandName !== "pushd") return true;
  if (
    !readFlagWithOverride(TENGU_NIFTY_PINE, {
      safe: true,
    })
  )
    return true;
  let operands = [];
  let sawOperand = false;
  for (let arg of args) {
    if (!sawOperand) {
      if (arg === "--") {
        sawOperand = true;
        continue;
      }
      if (arg.startsWith("-") && arg !== "-") {
        if (!/^-[qsLP]+$/.test(arg)) return false;
        continue;
      }
      sawOperand = true;
    }
    operands.push(arg);
  }
  return operands.length < 2 && (operands[0] === undefined || !/^[+-]\d+$/.test(operands[0]));
}
//@ chunk-9mrb3qx9.js:10198-10316 placement
function hasDotDotAfterSegment(path) {
  let sawSegment = false;
  for (let segment of path.split(/[\\/]/))
    if (segment === "..") {
      if (sawSegment) return true;
    } else if (segment !== "" && segment !== ".") sawSegment = true;
  return false;
}
//@ chunk-9mrb3qx9.js:10316-10383 placement
/**
 * 取命令涉及的其他权限路径（排除路径本身），用于把路径规则也应用到这些路径上。
 */
function additionalPermissionPaths(path) {
  try {
    return getPathsForPermissionCheck(path).filter((permissionPath) => permissionPath !== path);
  } catch {
    return [];
  }
}
//@ chunk-9mrb3qx9.js:10383-10451 placement
/**
 * 合并路径列表去重，数量超过上限时返回 “unknown”，避免路径检查泄漏。
 */
function cappedPathList(dirs, extra) {
  let paths = normalizeCaseForComparison_2([...dirs, ...extra]);
  return paths.length > MAX_REPORTED_COMMAND_CHARS ? "unknown" : paths;
}
export {
  useSecurityParser,
  parseShellCommand,
  readOnlyShellCheck,
  touchesProtectedPath,
  isReadOnlyCommand,
  classifyCommandForSandbox,
  getProtectedSettingsPaths,
  isHostPersonOnlyPath,
  shouldBypassAskForReadOnly,
  isServedLineWriting,
  servedLineTouchesProtectedPath,
};
