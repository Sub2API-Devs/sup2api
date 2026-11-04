/**
 * tools/BashTool/bashPermissions.ts
 *
 * Bash 权限检查主模块：规则匹配（exact/prefix/wildcard，剥离安全 env 与包装命令）、单子命令判定、沙箱自动允许、too-complex/语义失败路径、bashToolHasPermission 总流程
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/tools/BashTool/bashPermissions.ts
 * pieces: chunk-63f0f3kd.js (1), chunk-dcmhvw5a.js (1), chunk-e6aww6q8.js (86), chunk-fnhsh6ng.js (1), chunk-m79qv8gp.js (1), chunk-v0yfsee9.js (1)
 * attribution: fingerprint 18, placement 28, layout 33, file-local 2, sole-consumer 8, affinity 2
 */
import { isAbsolute, resolve as resolve_2, dirname, normalize, sep } from "path";
import { homedir } from "os";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { firstLineOf, getFirstLine } from "../../utils/stringUtils.js";
import { noAdditionalDepthRule } from "../../utils/shell/specPrefix.js";
import { extractFirstPrompt_2 } from "../../commands/export/export.js";
import { BashTool, READ_BLOCK_EXEMPT_COMMANDS } from "./BashTool.js";
import {
  buildToolAllowSuggestion,
  parseShellPermissionRule,
  trimPsWhitespace,
  matchingRulesForInput_2,
  suggestionForExactCommand_2,
} from "../PowerShellTool/powershellPermissions.js";
import { matchWildcardPattern, endsWithUnescapedStar } from "../../utils/permissions/shellRuleMatching.js";
import {
  deletePlaceholders,
  noteRefusal,
  CMDSUB_PLACEHOLDER,
  parseForSecurityFromAst,
  containsAnyPlaceholder,
  hasZshDangerousCommand,
  isAssignmentNameUnsafeForSandbox,
  isSandboxAutoAllowUnsafeBase,
  TEST_ARITH_CMP_OPS,
  AWK_NAMES,
  isFindDangerousAction,
  isAmbiguousFindWord,
  findWordTakesOperand,
  findWordTakesFlagValue,
  PRINT_PROMPT_FLAG,
  SET_O_SAFE_OPTS,
  SET_O_SAFE_LETTERS,
  DECLARATION_LIKE_BUILTINS,
  parseForSecurity,
  declarationPrefixReadings,
  checkSemantics,
  nodeTypeId,
} from "../../utils/bash/ast.js";
import {
  shellEnvSnapshot,
  spawnEnvKeysForSession,
  sessionEnvVarNameSet,
  wasShellExportReported,
  setLastCheckedSessionEnvVarKeys,
} from "../../utils/shell/shellEnvSnapshot.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import {
  stripPathAndExe,
  isVersionOnlyFlag,
  parseCommandRaw,
  PARSE_ABORTED,
} from "../../utils/bash/parser.js";
import { getOwn } from "../../utils/objectSafety.js";
import {
  extractOutputRedirections,
  getCommandArgv,
  splitCommand,
  splitCommandStrict,
  hasZshExecutableParenInBraceExpansion,
  nestedCommandSpansFromAst,
  funsubBodyFromNode,
  nestedCommandSpansOrOverrun,
  nestedCommandSpans,
  labelSubcommandResults,
} from "../../utils/bash/commands.js";
import { hasCertifiedPrefix, matchesCertifiedCommand } from "./certifiedCommands.js";
import {
  getContentRulesMapForTool,
  createPermissionRequestMessage,
  findSafetyCheckReason,
  carriesAskRuleIntent,
  sandboxOverrideAskGuardsOn,
  scriptAsksToRunUnsandboxed,
  shouldRetagAskAsSandboxOverride,
} from "../../utils/permissions/permissions.js";
import { uniq, count } from "../../utils/collections.js";
import { permissionRuleValueFromString } from "../../utils/permissions/permissionRuleParser.js";
import { getToolPermissionContext } from "../../utils/permissions/toolPermissionContext.js";
import {
  BASH_COMMAND_CLAMP_DENY_REASON,
  BASH_COMMAND_CLAMP_CRASH_REASON,
  INLINE_CODE_FLAGS,
  outsideReadsRuntimePathAsk,
  isOutsideReadsBlockedAsk,
  outsideReadsTooComplexAsk,
  READ_ONLY_AUTO_ALLOW_REASON,
  SANDBOX_AUTO_ALLOW_REASON,
  isAutoModeDenyCircuitBreaker,
  isBypassImmuneCircuitBreaker,
  isClassifierRoutedCircuitBreaker,
  outsideReadsSedScriptAsk,
} from "../../types/permissions.js";
import {
  stripWrappersFromArgvForPaths,
  PATH_EXTRACTORS,
  urlPatternToRegex,
  checkPathConstraints,
  hasBashDenyRule,
  checkDangerousRemovalPaths,
  normalizeCommandName,
  hasNoBashDenyRules,
  extractWriteTargets,
} from "./pathValidation.js";
import { expandTildeWithHome } from "../../utils/networkPaths.js";
import { isUncOrDevicePath } from "../../utils/pathClassification.js";
import { firstGlobCharIndex } from "../../utils/windowsUncPaths.js";
import {
  hasInteriorDotDot,
  validatePath,
  shellPathSegments,
  globBeforeInteriorDotDot,
} from "../../utils/permissions/pathValidation.js";
import { getFsImplementation, safeResolvePath } from "../../utils/fsOperations.js";
import { isHttpMcpServeInvocation } from "../../entrypoints/mcpServeArgs.js";
import {
  sandboxReadBlockApplies,
  SandboxManager,
  getEffectiveFilesystemPolicy,
} from "../../utils/sandbox/sandbox-adapter.js";
import { hasBlockReadsOutsideWorkingDirectories } from "../../utils/permissions/readBlock.js";
import { getCwd } from "../../utils/cwd.js";
import { checkSedConstraints, isSedCommand, checkSedCommand } from "./sedValidation.js";
import { shouldUseSandbox, antDisabledListMatchesCommandText } from "./shouldUseSandbox.js";
import { checkPermissionMode } from "./modeValidation.js";
import {
  hasUnsafeGlobSource,
  runWithRefusedReading,
  runWithDivergentShapes,
  commandWritesToGitInternalPaths,
} from "./readOnlyValidation.js";
import { isSandboxAutoAllowOff, isPlanBypass } from "../../utils/permissions/browserToolNames.js";
import { isDangerousEnvName, isBuildToolEnvVar } from "../../utils/git/builderGit/gitEnv.js";
import { isTildeUserPath } from "../../utils/shell/readOnlyCommandValidation.js";
import {
  isDangerousRmEnabled,
  logDangerousRmShape,
  logEventUnlessSuppressed,
  checkDangerousRemoval,
  classifyRemovalReason,
  dangerousRemovalAsk,
  runWithoutTelemetry,
} from "./dangerousRemoval.js";
import { findDangerousVariableRemovalInText, describeCommandSubstitution } from "./expansionAnalysis.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTinglyPearlEnabled, runGuarded, runWithGuardOff } from "../../utils/bash/bashParserFlags.js";
import {
  INLINE_CD_PLACEHOLDER,
  checkInlineShellRemoval,
  combineDeclarationReadings,
} from "./inlineShellAnalysis.js";
import { env } from "../../utils/env.js";
import { isAbortError, AbortError as AbortError_2 } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { runWithReadingRefusals, runAsBashReads, runWithRuleOff } from "../../utils/bash/bashReadingFlags.js";
import {
  askClassifierForAllowedDomains,
  isPlainAsk,
  bashCommandIsSafeAsync,
  getDecisionSeverity,
  getSafetyCheckRank,
  stripCommandBuiltinPrefixes,
} from "./bashSecurity.js";
import { isAutoModePermissionSurface } from "../../utils/permissions/autoModeState.js";
import { isRemovalWaiverActive, extractRules } from "../../utils/permissions/PermissionUpdate.js";
import { getDangerousRmTimeoutConfig, isAutoDenyTimedDialogEnabled } from "./bashPermissionFlags.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  cdMayChangeReadScope,
  isReadOnlyAfterCd,
  isCdTextToCurrentDir,
  checkCdCommand,
  resolveSimpleCdTarget,
  isCdToCurrentDir,
} from "./cdTracking.js";
import {
  checkCommandOperatorPermissions,
  shouldDedupeSubcommandRules,
  findCircuitBreakerAsk,
} from "./bashCommandHelpers.js";
import { getPlatform } from "../../utils/platform.js";
import { windowsPathToPosixPath, expandPath } from "../../utils/path.js";
import { allWorkingDirectories, normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAllRuleReason } from "../../utils/permissions/decisionReasons.js";
import { noopToolUseHook } from "./sandboxViolations.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import {
  toExternalPermissionMode,
  permissionModeFromString,
} from "../../utils/permissions/PermissionMode.js";
import {
  isBypassPermissionsModeDisabled,
  isAutoModeGateEnabled,
} from "../../utils/permissions/permissionSetup.js";
import { ASSET_TARGET_PIN_TAG } from "../ArtifactTool/permissions/consentStamps.js";
import { POWERSHELL_TOOL_NAME } from "../PowerShellTool/toolName.js";
import { findDirectoryChangeIndex } from "./bgWorktreeGuard/bgWorktreeCommandGuard.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:214446-214577 placement = buildSuggestions (1)
/**
 * 通用前缀权限建议：规则内容为 "<前缀> *"。
 */
function buildToolPrefixAllowSuggestion(toolName, prefix) {
  return [
    {
      type: "addRules",
      rules: [
        {
          toolName,
          ruleContent: `${prefix} *`,
        },
      ],
      behavior: "allow",
      destination: "localSettings",
    },
  ];
}
//@ chunk-e6aww6q8.js:1164354-1164413 placement
/**
 * 匹配命令开头的环境变量赋值（NAME=value），权限检查用它统计安全的环境前缀。
 */
var ENV_ASSIGNMENT_RE = /^[A-Za-z_]\w*=/;
var MAX_COLLECTED_RULES = 5;
var TENGU_BINARY_LOLLIPOP = "tengu_binary_lollipop";
//@ chunk-e6aww6q8.js:1164413-1164445 placement
/**
 * 读取 tengu_binary_lollipop 开关，控制语义检查是否记录通配来源。
 */
function isSourceGlobRecordingEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BINARY_LOLLIPOP, true);
}
//@ chunk-e6aww6q8.js:1164445-1164580 placement
/**
 * 统计命令开头安全的环境变量赋值个数，遇到不安全赋值返回 null。
 */
function countSafeEnvPrefix(argv) {
  let prefixCount = 0;
  while (prefixCount < argv.length && ENV_ASSIGNMENT_RE.test(argv[prefixCount])) {
    let equalsIndex = firstLineOf(argv[prefixCount], "=");
    if (!isSafeEnvAssignment(equalsIndex, argv[prefixCount].slice(equalsIndex.length + 1))) return null;
    prefixCount++;
  }
  return prefixCount;
}
//@ chunk-e6aww6q8.js:1164580-1164960 placement
/**
 * 从命令中取出可作为规则前缀的"命令 子命令"（跳过安全的环境变量赋值，子命令须为小写 kebab 形式，必要时取更深层子命令）；裸 shell 前缀返回 null。
 */
function getSubcommandPrefix(command) {
  let argv = command.trim().split(/\s+/).filter(Boolean);
  if (argv.length === 0) return null;
  let envPrefixCount = countSafeEnvPrefix(argv);
  if (envPrefixCount === null) return null;
  let sliced = argv.slice(envPrefixCount);
  if (sliced.length < 2) return null;
  if (BARE_SHELL_PREFIXES.has(sliced[0].split("/").pop())) return null;
  let subcommand = sliced[1];
  let wordPattern = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (!wordPattern.test(subcommand)) return null;
  let maxDepth = noAdditionalDepthRule(sliced[0], subcommand) ?? 2;
  let depth = 2;
  while (depth < maxDepth && wordPattern.test(sliced[depth] ?? "")) depth++;
  return depth < maxDepth ? null : sliced.slice(0, depth).join(" ");
}
//@ chunk-e6aww6q8.js:1164960-1165276 fingerprint = BARE_SHELL_PREFIXES (0.706)
/**
 * 会把后续参数当命令执行的"裸 shell/包装"命令名（sh/bash/zsh/pwsh/env/xargs/sudo/timeout/nohup/strace…）；规则建议不会为这些前缀生成前缀规则。
 */
var BARE_SHELL_PREFIXES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-e6aww6q8.js:1164960", () => {
  BARE_SHELL_PREFIXES = new Set([
    "sh",
    "bash",
    "zsh",
    "fish",
    "csh",
    "tcsh",
    "ksh",
    "dash",
    "cmd",
    "powershell",
    "pwsh",
    "env",
    "xargs",
    "command",
    "builtin",
    "noglob",
    "nice",
    "stdbuf",
    "nohup",
    "timeout",
    "time",
    "watch",
    "ionice",
    "chrt",
    "setsid",
    "taskset",
    "strace",
    "ltrace",
    "script",
    "flock",
    "unshare",
    "nsenter",
    "sudo",
    "doas",
    "pkexec",
    "su",
    "runuser",
  ]);
});
//@ chunk-e6aww6q8.js:1165276-1165416 placement
/**
 * 判断命令（去掉前导环境变量后）是否以裸 shell 开头（如 bash、sh）。
 */
function startsWithBareShell(command) {
  let parts = stripAllLeadingEnvVars(command.trim()).split(/\s+/);
  let idx = 0;
  while (idx < parts.length && ENV_ASSIGNMENT_RE.test(parts[idx])) idx++;
  let firstWord = parts[idx];
  return !!firstWord && BARE_SHELL_PREFIXES.has(firstWord.split("/").pop());
}
//@ chunk-e6aww6q8.js:1165416-1165670 placement
/**
 * 获取命令的裸命令前缀（跳过安全的环境变量），用于生成权限规则；shell 或特殊命令返回 null。
 */
function getBareCommandPrefix(command) {
  let argv = command.trim().split(/\s+/).filter(Boolean);
  let envPrefixCount = countSafeEnvPrefix(argv);
  if (envPrefixCount === null) return null;
  let firstWord = argv[envPrefixCount];
  if (!firstWord) return null;
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(firstWord)) return null;
  if (BARE_SHELL_PREFIXES.has(firstWord)) return null;
  if (noAdditionalDepthRule(firstWord, argv[envPrefixCount + 1] ?? "") !== undefined) return null;
  return firstWord;
}
//@ chunk-e6aww6q8.js:1165670-1165854 placement
function suggestionForExactCommand(command) {
  let heredocPrefix = extractFirstPrompt_2(command);
  if (heredocPrefix) return buildToolPrefixAllowSuggestion(BashTool.name, heredocPrefix);
  if (
    command.includes(`
`)
  ) {
    let firstLine = getFirstLine(command).trim();
    if (firstLine) return buildToolPrefixAllowSuggestion(BashTool.name, firstLine);
  }
  let prefix = getSubcommandPrefix(command);
  if (prefix) return buildToolPrefixAllowSuggestion(BashTool.name, prefix);
  return buildToolAllowSuggestion(BashTool.name, command);
}
//@ chunk-e6aww6q8.js:1166245-1166283 placement
function suggestionForPrefix(prefix) {
  return buildToolPrefixAllowSuggestion(BashTool.name, prefix);
}
//@ chunk-e6aww6q8.js:1166283-1166321 placement
/**
 * 按 Bash 权限规则模式（含 xargs 前缀）匹配命令文本。
 */
function matchesCommandRule(rule, command) {
  return matchWildcardPattern(rule, command, false, true);
}
//@ chunk-e6aww6q8.js:1166321-1166857 fingerprint = SAFE_ENV_VARS (0.91)
/**
 * Bash 安全环境变量白名单（GO*\/RUST_*\/NODE_ENV/PYTHON*\/LANG/LC_*\/TERM/NO_COLOR/TZ/CI…）；wQ 是规则内容解析函数的别名（exact/prefix/wildcard）。
 */
var parseBashPermissionRule; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var SAFE_ENV_VARS;
deferInit("chunk-e6aww6q8.js:1166321", () => {
  parseBashPermissionRule = parseShellPermissionRule;
  SAFE_ENV_VARS = new Set([
    "GOEXPERIMENT",
    "GOOS",
    "GOARCH",
    "CGO_ENABLED",
    "GO111MODULE",
    "RUST_BACKTRACE",
    "RUST_LOG",
    "NODE_ENV",
    "PYTHONUNBUFFERED",
    "PYTHONDONTWRITEBYTECODE",
    "PYTEST_DISABLE_PLUGIN_AUTOLOAD",
    "PYTEST_DEBUG",
    "ANTHROPIC_API_KEY",
    "LANG",
    "LANGUAGE",
    "LC_ALL",
    "LC_CTYPE",
    "LC_TIME",
    "CHARSET",
    "TERM",
    "COLORTERM",
    "NO_COLOR",
    "FORCE_COLOR",
    "TZ",
    "LS_COLORS",
    "LSCOLORS",
    "GREP_COLOR",
    "GREP_COLORS",
    "GCC_COLORS",
    "TIME_STYLE",
    "BLOCK_SIZE",
    "BLOCKSIZE",
    "COLUMNS",
    "LINES",
    "CLICOLOR",
    "CLICOLOR_FORCE",
    "CI",
    "DEBIAN_FRONTEND",
    "GIT_TERMINAL_PROMPT",
  ]);
});
//@ chunk-e6aww6q8.js:1166857-1166891 layout
/**
 * 变量名是否在 Bash 安全环境变量白名单 SAFE_ENV_VARS 中。
 */
function isSafeEnvVarName(name) {
  return SAFE_ENV_VARS.has(name);
}
//@ chunk-e6aww6q8.js:1166891-1166929 layout
function isSafeEnvVarNameForStrip(name) {
  return SAFE_ENV_VARS.has(name) || false;
}
//@ chunk-e6aww6q8.js:1166929-1166997 layout
var PATH_LIKE_VALUE_RE = /^[.~]*[/\\]|[/\\][/\\]|:[/\\.]|(?:^|[/\\])\.\.(?:[/\\]|$)/;
//@ chunk-e6aww6q8.js:1166997-1167104 layout
/**
 * 值看起来像路径（以 ./ ~/ / 开头、含 ..、URL 冒号斜杠等）且路径型值检查开关打开时返回 true；这类赋值不能作为安全前缀剥离。
 */
function isPathLikeEnvValue(value) {
  let text = value.replaceAll('"', "").replaceAll("'", "");
  return (
    (PATH_LIKE_VALUE_RE.test(text) || PATH_LIKE_VALUE_RE.test(deletePlaceholders(text))) && noteRefusal()
  );
}
//@ chunk-e6aww6q8.js:1167104-1167203 layout
/**
 * NAME=value 是否可以当作安全前缀剥离：变量在 SAFE_ENV_VARS 中且值不像路径；含占位符时更严格。
 */
function isSafeEnvAssignment(varName, varValue) {
  if (varValue.includes(CMDSUB_PLACEHOLDER) && (!isSafeEnvVarNameForStrip(varName) || noteRefusal()))
    return false;
  if (SAFE_ENV_VARS.has(varName)) return !isPathLikeEnvValue(varValue);
  return false;
}
//@ chunk-e6aww6q8.js:1167203-1167279 layout
function isRiskyBareAssignmentName(name, getProtectedNames) {
  return (
    name === "PWD" ||
    name === "OLDPWD" ||
    (!isSafeEnvVarNameForStrip(name) && getProtectedNames()?.has(name) !== false)
  );
}
//@ chunk-e6aww6q8.js:1167279-1167318 layout
/**
 * 返回会话环境变量名集合的惰性读取器（供 hasRiskyBareAssignment 判断裸赋值）。
 */
function lazySessionEnvVarNames(sessionId) {
  shellEnvSnapshot();
  return () => spawnEnvKeysForSession(sessionId);
}
//@ chunk-e6aww6q8.js:1167318-1167377 layout
/**
 * 复合命令里的裸赋值是否可能改变目录语义：赋值给 PWD/OLDPWD，或给不在安全表但存在于会话环境变量里的名字。
 */
function hasRiskyBareAssignment(assignments, sessionId) {
  let getNames = onceExport(sessionId);
  return assignments.some((subcmd) => isRiskyBareAssignmentName(subcmd, getNames));
}
//@ chunk-e6aww6q8.js:1167377-1167495 file-local
/**
 * 去掉以 # 开头的注释行（全是注释时原样返回）。
 */
function stripCommentLines(command) {
  let nonCommentLines = command
    .split(
      `
`,
    )
    .filter((line) => !line.trim().startsWith("#"));
  if (nonCommentLines.length === 0) return command;
  return nonCommentLines.join(`
`);
}
//@ chunk-e6aww6q8.js:1167495-1168849 layout
/**
 * 规则匹配前的规范化：循环剥离注释行与安全 env 前缀，去掉首词引号，再剥离 timeout/time/nice/stdbuf/nohup/command/builtin/noglob 包装，返回 trim 后的命令。
 */
function stripSafeWrappers(command, stripEnvVars = true, stripComments = true) {
  let wrapperPatterns = [
    /^timeout[ \t]+(?:(?:--(?:foreground|preserve-status|verbose)|--(?:kill-after|signal)=[A-Za-z0-9_.+-]+|--(?:kill-after|signal)[ \t]+[A-Za-z0-9_.+-]+|-v|-[ks][ \t]+[A-Za-z0-9_.+-]+|-[ks][A-Za-z0-9_.+-]+)[ \t]+)*(?:--[ \t]+)?\d+(?:\.\d+)?[smhd]?[ \t]+/,
    /^time[ \t]+(?:--[ \t]+)?/,
    /^nice(?:[ \t]+-n[ \t]+-?\d+|[ \t]+-\d+)?[ \t]+(?:--[ \t]+)?/,
    /^stdbuf(?:[ \t]+-[ioe][LN0-9]+)+[ \t]+(?:--[ \t]+)?/,
    /^nohup[ \t]+(?:--[ \t]+)?/,
    /^command(?:[ \t]+-p+)*(?:[ \t]+--)?[ \t]+(?!-)/,
    /^builtin(?:[ \t]+--)?[ \t]+(?!-)/,
    /^noglob[ \t]+(?!-)/,
  ];
  let envAssignmentPattern = /^([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z0-9_./:-]+)[ \t]+/;
  let stripCommentsOf = (stripped) => (stripComments ? stripCommentLines(stripped) : stripped);
  let stripped = command;
  let previous = "";
  while (stripped !== previous) {
    previous = stripped;
    stripped = stripCommentsOf(stripped);
    let envMatch = stripEnvVars ? stripped.match(envAssignmentPattern) : null;
    if (envMatch && isSafeEnvAssignment(envMatch[1], envMatch[2]))
      stripped = stripped.replace(envAssignmentPattern, "");
  }
  function unquoteFirstWord(text) {
    let match = text.match(/^([^\s]+)([\s\S]*)$/);
    if (!match) return text;
    let word = match[1];
    let quoteChar = null;
    let isDanglingEscape = false;
    let unquoted = "";
    for (let idx = 0; idx < word.length; idx++) {
      let char = word[idx];
      isDanglingEscape = false;
      if (quoteChar === "'") {
        if (char === "'") quoteChar = null;
        else unquoted += char;
      } else if (quoteChar === '"') {
        if (char === "\\") {
          let nextChar = word[idx + 1];
          if (nextChar === "$" || nextChar === "`" || nextChar === '"' || nextChar === "\\") {
            unquoted += nextChar;
            idx++;
          } else if (nextChar === undefined) isDanglingEscape = true;
          else unquoted += char;
        } else if (char === '"') quoteChar = null;
        else unquoted += char;
      } else if (char === "\\") {
        let nextChar = word[idx + 1];
        if (nextChar === undefined) isDanglingEscape = true;
        else {
          unquoted += nextChar;
          idx++;
        }
      } else if (char === '"' || char === "'") quoteChar = char;
      else unquoted += char;
    }
    if (quoteChar !== null || isDanglingEscape) return text;
    return unquoted + match[2];
  }
  stripped = unquoteFirstWord(stripCommentsOf(stripped));
  previous = "";
  while (stripped !== previous) {
    previous = stripped;
    for (let pattern of wrapperPatterns) stripped = stripped.replace(pattern, "");
    if (stripped !== previous) stripped = unquoteFirstWord(stripCommentsOf(stripped));
  }
  return stripped.trim();
}
//@ chunk-e6aww6q8.js:1168849-1168878 layout
var TIMEOUT_FLAG_VALUE_RE = /^[A-Za-z0-9_.+-]+$/;
//@ chunk-e6aww6q8.js:1168878-1169375 fingerprint = skipTimeoutFlags (1)
/**
 * 在 timeout 的 argv 中跳过它的选项（--foreground、-k/-s 带值等），返回时长参数下标；遇到未知选项返回 -1。
 */
function skipTimeoutFlags(a) {
  let i = 1;
  while (i < a.length) {
    let arg = a[i];
    let next = a[i + 1];
    if (arg === "--foreground" || arg === "--preserve-status" || arg === "--verbose") i++;
    else if (/^--(?:kill-after|signal)=[A-Za-z0-9_.+-]+$/.test(arg)) i++;
    else if ((arg === "--kill-after" || arg === "--signal") && next && TIMEOUT_FLAG_VALUE_RE.test(next))
      i += 2;
    else if (arg === "--") {
      i++;
      break;
    } else if (arg.startsWith("--")) return -1;
    else if (arg === "-v") i++;
    else if ((arg === "-k" || arg === "-s") && next && TIMEOUT_FLAG_VALUE_RE.test(next)) i += 2;
    else if (/^-[ks][A-Za-z0-9_.+-]+$/.test(arg)) i++;
    else if (arg.startsWith("-")) return -1;
    else break;
  }
  return i;
}
//@ chunk-e6aww6q8.js:1169375-1169778 fingerprint = stripWrappersFromArgv (1)
/**
 * argv 版包装剥离：反复去掉 time [-p]、nohup、timeout <选项> <时长>、nice -n N，返回真正的命令 argv。
 */
function stripWrappersFromArgv(argv) {
  let remaining = argv;
  for (;;) {
    let exeName = stripPathAndExe(remaining[0] ?? "");
    if (exeName === "time" || exeName === "nohup") {
      let valueIndex = exeName === "time" && remaining[1] === "-p" ? 2 : 1;
      if (remaining[valueIndex]?.startsWith("-") && remaining[valueIndex] !== "--") return remaining;
      remaining = remaining.slice(remaining[valueIndex] === "--" ? valueIndex + 1 : valueIndex);
    } else if (exeName === "timeout") {
      let i = skipTimeoutFlags(remaining);
      if (i < 0 || !remaining[i] || !/^\d+(?:\.\d+)?[smhd]?$/.test(remaining[i])) return remaining;
      remaining = remaining.slice(i + 1);
    } else if (exeName === "nice" && remaining[1] === "-n" && remaining[2] && /^-?\d+$/.test(remaining[2]))
      remaining = remaining.slice(remaining[3] === "--" ? 4 : 3);
    else return remaining;
  }
}
//@ chunk-e6aww6q8.js:1169778-1170112 layout
/**
 * 命令是否带有不在安全表里（或值像路径）的 env 前缀；有 AST 时直接看 envVars。
 */
function hasUnsafeEnvVarPrefix(input, astCommand) {
  if (astCommand) return astCommand.envVars.some((envVar) => !isSafeEnvAssignment(envVar.name, envVar.value));
  let namePattern = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/;
  let assignmentPattern = /^[A-Za-z_][A-Za-z0-9_]*\+?=("[^"$`\\]*"|'[^']*'|[A-Za-z0-9_./:+-]*)[ \t]+/;
  let command = input.command;
  for (;;) {
    let match = command.match(namePattern);
    if (!match) return false;
    if (!isSafeEnvVarNameForStrip(match[1])) return true;
    let m = command.match(assignmentPattern);
    if (!m || !isSafeEnvAssignment(match[1], m[1])) return true;
    command = command.slice(m[0].length);
  }
}
//@ chunk-e6aww6q8.js:1170112-1170440 file-local
/**
 * 剥离所有前导 VAR=value（含数组下标、引号值），可用回调/正则在特定变量处停止；用于 deny/ask 规则匹配时不被 env 前缀绕过。
 */
function stripAllLeadingEnvVars(command, isUnsafeEnvAssignment, stripComments = true) {
  let ENV_VAR_PATTERN =
    /^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?)\+?=((?:'[^'\n\r]*'|"(?:\\.|[^"$`\\\n\r])*"|\\.|[^ \t\n\r$`;|&()<>\\\\'"])*)[ \t]+/;
  let stripped = command;
  let previousStripped = "";
  while (stripped !== previousStripped) {
    previousStripped = stripped;
    if (stripComments) stripped = stripCommentLines(stripped);
    let m = stripped.match(ENV_VAR_PATTERN);
    if (!m) continue;
    let name = m[1];
    if (
      typeof isUnsafeEnvAssignment === "function"
        ? isUnsafeEnvAssignment(name, m[2])
        : isUnsafeEnvAssignment?.test(name)
    )
      break;
    stripped = stripped.slice(m[0].length);
  }
  return stripped.trim();
}
//@ chunk-e6aww6q8.js:1170440-1172319 layout
var WRAPPER_FLAGS_WITH_VALUE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var WRAPPER_COMMAND_STRING_FLAGS;
var WRAPPER_LEADING_OPERAND_CHECKS;
var ENV_ASSIGNMENT_RE_2;
deferInit("chunk-e6aww6q8.js:1170440", () => {
  WRAPPER_FLAGS_WITH_VALUE = {
    env: new Set(["-u", "-C", "--unset", "--chdir"]),
    sudo: new Set([
      "-u",
      "-g",
      "-U",
      "-C",
      "-D",
      "-h",
      "-p",
      "-r",
      "-R",
      "-t",
      "-T",
      "--user",
      "--group",
      "--other-user",
      "--close-from",
      "--chdir",
      "--host",
      "--prompt",
      "--role",
      "--chroot",
      "--type",
      "--command-timeout",
      "-a",
      "--auth-type",
    ]),
    doas: new Set(["-a", "-u", "-C"]),
    pkexec: new Set(["--user"]),
    watch: new Set(["-n", "--interval", "--equexit"]),
    ionice: new Set(["-c", "-n", "-p", "-P", "-u", "--class", "--classdata", "--pid", "--pgid", "--uid"]),
    setsid: new Set([]),
    taskset: new Set(["-c", "--cpu-list"]),
    chrt: new Set(["-p", "--pid", "-T", "-P", "-D", "--sched-runtime", "--sched-period", "--sched-deadline"]),
    strace: new Set([
      "-e",
      "-o",
      "-p",
      "-s",
      "-E",
      "-P",
      "-S",
      "-a",
      "-b",
      "-I",
      "-u",
      "-X",
      "-O",
      "-U",
      "--output",
      "--trace",
      "--expr",
      "--attach",
      "--string-limit",
      "--env",
      "--trace-path",
      "--columns",
      "--user",
      "--interruptible",
      "--detach-on",
      "--const-print-style",
      "--summary-sort-by",
      "--summary-syscall-overhead",
      "--summary-columns",
    ]),
    ltrace: new Set([
      "-a",
      "-A",
      "-e",
      "-l",
      "-n",
      "-o",
      "-p",
      "-s",
      "-u",
      "-x",
      "-D",
      "-F",
      "--align",
      "--config",
      "--debug",
      "--indent",
      "--library",
      "--output",
      "--string-max",
      "-w",
      "--where",
    ]),
    flock: new Set(["-w", "-E", "--timeout", "--wait", "--conflict-exit-code"]),
    script: new Set([
      "-E",
      "-T",
      "-m",
      "-o",
      "-O",
      "-B",
      "-I",
      "--echo",
      "--log-timing",
      "--logging-format",
      "--output-limit",
      "--log-out",
      "--log-io",
      "--log-in",
    ]),
    unshare: new Set([
      "-R",
      "-w",
      "-S",
      "-G",
      "--setuid",
      "--setgid",
      "--root",
      "--wd",
      "--propagation",
      "--setgroups",
      "--monotonic",
      "--boottime",
    ]),
    nsenter: new Set(["-t", "-S", "-G", "--target", "--setuid", "--setgid"]),
    exec: new Set(["-a"]),
    command: new Set([]),
    builtin: new Set([]),
    noglob: new Set([]),
    nocorrect: new Set([]),
  };
  WRAPPER_COMMAND_STRING_FLAGS = {
    env: new Set(["-S", "--split-string"]),
    flock: new Set(["-c", "--command"]),
    script: new Set(["-c", "--command"]),
  };
  WRAPPER_LEADING_OPERAND_CHECKS = {
    chrt: (operand) => /^\d+$/.test(operand),
    taskset: (operand) => /^(0x[\da-f]+|\d+)$/i.test(operand),
    flock: () => true,
    script: () => true,
  };
  ENV_ASSIGNMENT_RE_2 = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
});
//@ chunk-e6aww6q8.js:1172319-1173302 layout
/**
 * 把 argv 中的 env 赋值和 sudo/doas/env/watch/ionice/taskset/chrt/strace/ltrace/flock/script/unshare/nsenter/exec/command 等包装（含它们带值的选项、env -S/flock -c 的命令串）一层层剥掉，得到真正执行的命令 argv。
 */
function unwrapCommandArgv(argv) {
  let argv_2 = argv.slice();
  for (;;) {
    while (argv_2[0] !== undefined && ENV_ASSIGNMENT_RE_2.test(argv_2[0])) argv_2 = argv_2.slice(1);
    argv_2 = stripWrappersFromArgv(argv_2);
    if (argv_2[0] === undefined) return argv_2;
    let exeName = stripPathAndExe(argv_2[0]);
    let flagsWithValue = getOwn(WRAPPER_FLAGS_WITH_VALUE, exeName);
    if (flagsWithValue === undefined) return argv_2;
    let commandStringFlags = getOwn(WRAPPER_COMMAND_STRING_FLAGS, exeName);
    let leadingOperandCheck = getOwn(WRAPPER_LEADING_OPERAND_CHECKS, exeName);
    let idx = 1;
    let commandString;
    let sawLeadingOperand = false;
    while (idx < argv_2.length) {
      let arg = argv_2[idx];
      if (arg === "--") {
        idx++;
        if (
          !sawLeadingOperand &&
          leadingOperandCheck !== undefined &&
          idx + 1 < argv_2.length &&
          leadingOperandCheck(argv_2[idx])
        ) {
          sawLeadingOperand = true;
          idx++;
          continue;
        }
        break;
      }
      if (commandStringFlags !== undefined) {
        if (commandStringFlags.has(arg) && argv_2[idx + 1] !== undefined) {
          let trimmed = argv_2[idx + 1].trim();
          if (trimmed !== "") {
            commandString = trimmed;
            break;
          }
          idx += 2;
          continue;
        }
        let index = arg.indexOf("=");
        if (index > 0 && commandStringFlags.has(arg.slice(0, index))) {
          let trimmed = arg.slice(index + 1).trim();
          if (trimmed !== "") {
            commandString = trimmed;
            break;
          }
          idx++;
          continue;
        }
        if (arg.length > 2 && arg[1] !== "-" && commandStringFlags.has(arg.slice(0, 2))) {
          let trimmed = arg.slice(2).trim();
          if (trimmed !== "") {
            commandString = trimmed;
            break;
          }
          idx++;
          continue;
        }
      }
      if (arg.startsWith("-") && (arg !== "-" || leadingOperandCheck === undefined)) {
        if (exeName === "command" && isVersionOnlyFlag(arg)) return argv_2;
        idx += flagsWithValue.has(arg) && idx + 1 < argv_2.length ? 2 : 1;
        continue;
      }
      if (exeName === "env" && ENV_ASSIGNMENT_RE_2.test(arg)) {
        idx++;
        continue;
      }
      if (!sawLeadingOperand && leadingOperandCheck?.(arg) && idx + 1 < argv_2.length) {
        sawLeadingOperand = true;
        idx++;
        continue;
      }
      break;
    }
    if (commandString !== undefined) {
      argv_2 = commandString.trim().split(/\s+/);
      if (argv_2.length === 0 || argv_2[0] === "") return argv.slice();
      continue;
    }
    if (idx >= argv_2.length) return argv_2;
    argv_2 = argv_2.slice(idx);
  }
}
//@ chunk-e6aww6q8.js:1173302-1174805 fingerprint = filterRulesByContentsMatchingInput (0.797)
/**
 * 在一组 Bash 规则里找出与输入命令匹配的规则：候选命令包括原文、去重定向、stripSafeWrappers 后，以及（deny/ask 时）剥离全部 env 与包装后的形式；exact/prefix/wildcard 三种规则，prefix 匹配拒绝复合命令，并识别 xargs 前缀。
 */
function filterRulesByContentsMatchingInput(
  input,
  rules,
  matchMode,
  {
    stripAllEnvVars = false,
    skipCompoundCheck = false,
    astCommand: command,
    ruleBehavior,
    compoundBareAssignmentNames = [],
  } = {},
) {
  if (rules.size === 0) return [];
  let command_2 = input.command.trim();
  let commandWithoutRedirections = extractOutputRedirections(command_2).commandWithoutRedirections;
  let commandsToTry = (
    matchMode === "exact" ? [command_2, commandWithoutRedirections] : [commandWithoutRedirections]
  ).flatMap((cmd) => {
    let strippedCommand = stripSafeWrappers(cmd);
    return strippedCommand !== cmd ? [cmd, strippedCommand] : [cmd];
  });
  if (stripAllEnvVars) {
    let baseArgv = command?.argv ?? getCommandArgv(commandWithoutRedirections);
    let unwrappedArgv = unwrapCommandArgv(baseArgv);
    if (unwrappedArgv.length > 0 && (unwrappedArgv[0] !== baseArgv[0] || (command?.envVars.length ?? 0) > 0))
      commandsToTry.push(unwrappedArgv.join(" "));
    if (unwrappedArgv[0] !== undefined && stripPathAndExe(unwrappedArgv[0]) !== unwrappedArgv[0])
      commandsToTry.push([stripPathAndExe(unwrappedArgv[0]), ...unwrappedArgv.slice(1)].join(" "));
    let seen = new Set(commandsToTry);
    let startIdx = 0;
    while (startIdx < commandsToTry.length) {
      let endIdx = commandsToTry.length;
      for (let i = startIdx; i < endIdx; i++) {
        let cmd = commandsToTry[i];
        if (!cmd) continue;
        let envStripped = stripAllLeadingEnvVars(cmd);
        if (!seen.has(envStripped)) {
          commandsToTry.push(envStripped);
          seen.add(envStripped);
        }
        let wrapperStripped = stripSafeWrappers(cmd);
        if (!seen.has(wrapperStripped)) {
          commandsToTry.push(wrapperStripped);
          seen.add(wrapperStripped);
        }
      }
      startIdx = endIdx;
    }
  }
  let isCompoundCommand = new Map();
  if (matchMode === "prefix" && !skipCompoundCheck) {
    for (let cmd of commandsToTry)
      if (!isCompoundCommand.has(cmd)) isCompoundCommand.set(cmd, splitCommand(cmd).length > 1);
  }
  return Array.from(rules.entries())
    .filter(([ruleContent]) => {
      if (hasCertifiedPrefix(ruleContent))
        return (
          ruleBehavior === "allow" &&
          matchMode === "prefix" &&
          command !== undefined &&
          matchesCertifiedCommand(ruleContent, command, compoundBareAssignmentNames)
        );
      let bashRule = parseBashPermissionRule(ruleContent);
      return commandsToTry.some((cmdToMatch) => {
        switch (bashRule.type) {
          case "exact":
            return bashRule.command === cmdToMatch;
          case "prefix": {
            let replaced = bashRule.prefix.replace(/[ \t]+/g, " ");
            let replaced_2 = cmdToMatch.replace(/[ \t]+/g, " ");
            switch (matchMode) {
              case "exact":
                return replaced === replaced_2;
              case "prefix": {
                if (isCompoundCommand.get(cmdToMatch)) return false;
                if (replaced_2 === replaced) return true;
                if (replaced_2.startsWith(replaced + " ")) return true;
                let xargsPrefix = "xargs " + replaced;
                if (replaced_2 === xargsPrefix) return true;
                return replaced_2.startsWith(xargsPrefix + " ");
              }
            }
            break;
          }
          case "wildcard":
            if (matchMode === "exact") return false;
            if (isCompoundCommand.get(cmdToMatch)) return false;
            if (matchesCommandRule(bashRule.pattern, cmdToMatch)) return true;
            if (ruleBehavior !== "deny" && ruleBehavior !== "ask" && !endsWithUnescapedStar(bashRule.pattern))
              return false;
            return matchesCommandRule(`xargs ${bashRule.pattern}`, cmdToMatch);
        }
      });
    })
    .map(([, rule]) => rule);
}
//@ chunk-e6aww6q8.js:1174805-1175298 fingerprint = matchingRulesForInput (0.781)
/**
 * 对输入分别求匹配的 deny、ask、allow 规则（deny/ask 剥离全部 env 与包装、不做复合检查；allow 不剥离）。
 */
function matchingRulesForInput(
  input,
  toolPermissionContext,
  matchMode,
  { skipCompoundCheck = false, astCommand, compoundBareAssignmentNames = [] } = {},
) {
  let denyRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "deny");
  let matchingDenyRules = filterRulesByContentsMatchingInput(input, denyRuleByContents, matchMode, {
    stripAllEnvVars: true,
    skipCompoundCheck: true,
    astCommand,
    ruleBehavior: "deny",
  });
  let askRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "ask");
  let matchingAskRules = filterRulesByContentsMatchingInput(input, askRuleByContents, matchMode, {
    stripAllEnvVars: true,
    skipCompoundCheck: true,
    astCommand,
    ruleBehavior: "ask",
  });
  let allowRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "allow");
  let matchingAllowRules = filterRulesByContentsMatchingInput(input, allowRuleByContents, matchMode, {
    skipCompoundCheck,
    ruleBehavior: "allow",
    astCommand,
    compoundBareAssignmentNames,
  });
  return {
    matchingDenyRules,
    matchingAskRules,
    matchingAllowRules,
  };
}
//@ chunk-e6aww6q8.js:1175298-1176073 placement
/**
 * 检查命令的每个片段是否都被某组规则（会话 allow 规则字符串）覆盖；返回第一个未覆盖的片段或解析失败时的 unverifiable。
 */
async function findSpanNotCoveredByRuleGroups(toolInput, bashCommandClamps) {
  if (bashCommandClamps.length === 0) return null;
  let unverifiableResult = {
    span: toolInput.command.trim(),
    group: bashCommandClamps[0] ?? [],
    kind: "unverifiable",
  };
  let commandRaw = await parseCommandRaw(toolInput.command);
  if (commandRaw === PARSE_ABORTED) return unverifiableResult;
  let securityParse = commandRaw
    ? parseForSecurityFromAst(toolInput.command, commandRaw)
    : {
        kind: "simple",
        commands: [],
        bareAssignmentNames: [],
      };
  if (securityParse.kind === "too-complex") return unverifiableResult;
  let splitCommands = splitCommandStrict(toolInput.command);
  if (splitCommands === null || splitCommands.length === 0) return unverifiableResult;
  let commandTexts = uniq([...splitCommands, ...securityParse.commands.map((command) => command.text)]);
  for (let clampGroup of bashCommandClamps) {
    let allowRulesByContent = new Map();
    for (let ruleString of clampGroup) {
      let ruleValue = permissionRuleValueFromString(ruleString);
      if (
        ruleValue.toolName !== BashTool.name ||
        ruleValue.ruleContent === undefined ||
        ruleValue.ruleContent === ""
      )
        continue;
      allowRulesByContent.set(ruleValue.ruleContent, {
        source: "session",
        ruleBehavior: "allow",
        ruleValue,
      });
    }
    for (let commandText of commandTexts) {
      let commandInput = {
        ...toolInput,
        command: commandText,
      };
      if (!(
        filterRulesByContentsMatchingInput(commandInput, allowRulesByContent, "exact", {
          ruleBehavior: "allow",
        }).length > 0 ||
        filterRulesByContentsMatchingInput(commandInput, allowRulesByContent, "prefix", {
          ruleBehavior: "allow",
        }).length > 0
      ))
        return {
          span: commandText,
          group: clampGroup,
          kind: "unmatched",
        };
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:1176073-1176465 placement
/**
 * 代理带有 bashCommandClamp（限定 Bash 命令形式）时，拒绝通过其他工具面执行 shell。
 */
function denyForBashCommandClamp(toolName, shellPermission) {
  let bashCommandClamps = getToolPermissionContext(shellPermission).bashCommandClamps;
  if (bashCommandClamps !== undefined && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message:
        `Permission to use ${toolName} has been denied: this agent carries a per-spawn bashCommandClamp, which scopes shell ` +
        "execution to a fixed set of Bash command forms \u2014 this surface " +
        "cannot match them. Use the clamped Bash forms instead.",
      decisionReason: {
        type: "other",
        reason: BASH_COMMAND_CLAMP_DENY_REASON,
      },
    };
  return;
}
//@ chunk-e6aww6q8.js:1176465-1176759 placement
/**
 * 权限检查本身崩溃且代理带 bashCommandClamp 时直接拒绝，不运行未验证的命令。BashTool.permissionCheckFailureDecision 调用。
 */
function denyCrashedCheckUnderCommandClamp(checkName, shellPermission) {
  let bashCommandClamps = getToolPermissionContext(shellPermission).bashCommandClamps;
  if (bashCommandClamps !== undefined && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message: `The ${checkName} permission check crashed and this agent carries a per-spawn bashCommandClamp; denying rather than running an unverified command.`,
      decisionReason: {
        type: "other",
        reason: BASH_COMMAND_CLAMP_CRASH_REASON,
      },
    };
  return;
}
//@ chunk-e6aww6q8.js:1176759-1177404 placement = bashToolCheckExactMatchPermission (0.921)
/**
 * 精确规则检查：deny→拒绝、ask→询问、allow→允许，否则 passthrough 并附精确命令的规则建议。
 */
var bashToolCheckExactMatchPermission = (input, toolPermissionContext) => {
  let command = input.command.trim();
  let { matchingDenyRules, matchingAskRules, matchingAllowRules } = matchingRulesForInput(
    input,
    toolPermissionContext,
    "exact",
  );
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  if (matchingAskRules[0] !== undefined)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  if (matchingAllowRules[0] !== undefined)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: matchingAllowRules[0],
      },
    };
  let decisionReason = {
    type: "other",
    reason: "This command requires approval",
    bashMissKind: "no-rule-match",
  };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions: suggestionForExactCommand(command),
  };
};
//@ chunk-e6aww6q8.js:1177404-1177633 placement
function readsCodeFromStdin(argv) {
  let strippedArgv = stripWrappersFromArgvForPaths([...argv]);
  let commandName = strippedArgv[0];
  if (commandName === undefined) return false;
  let replaced = commandName.slice(commandName.lastIndexOf("/") + 1).replace(/[\d.]+$/, "");
  if (!INLINE_CODE_FLAGS.has(replaced)) return false;
  let sliced = strippedArgv.slice(1);
  if (sliced.includes("-")) return true;
  return sliced.every((arg) => arg.startsWith("-"));
}
//@ chunk-e6aww6q8.js:1177633-1178453 placement
/**
 * 对 git 的 -C/--git-dir/--work-tree/--file 路径参数检查工作目录外读取限制：命中拒绝规则直接 deny，越界或无法判定时给出 ask。
 */
function checkGitPathArgsForReadBlock(commandName, paths, cwd, context) {
  let ask;
  for (let path of paths) {
    if (path === "") continue;
    if (containsAnyPlaceholder(path)) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    if (path.startsWith("~") && path !== "~" && !path.startsWith("~/")) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let expandedPath = expandTildeWithHome(path);
    if (isUncOrDevicePath(expandedPath) || firstGlobCharIndex(expandedPath) !== -1) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let absolutePath = isAbsolute(expandedPath) ? expandedPath : resolve_2(cwd, expandedPath);
    if (!hasInteriorDotDot(expandedPath) && !getFsImplementation().existsSync(absolutePath)) continue;
    let validation = validatePath(path, cwd, context, "read");
    if (validation.allowed) continue;
    if (validation.decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: `${commandName} in '${validation.resolvedPath}' was blocked by a deny rule`,
        decisionReason: validation.decisionReason,
      };
    if (isOutsideReadsBlockedAsk(validation.decisionReason)) {
      ask ??= {
        behavior: "ask",
        message: `${commandName} names '${validation.resolvedPath}', outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
        decisionReason: validation.decisionReason,
      };
      continue;
    }
    ask ??= outsideReadsRuntimePathAsk(commandName);
  }
  return ask;
}
//@ chunk-e6aww6q8.js:1178560-1181654 sole-consumer
/**
 * 检查单个命令是否会读取工作目录外路径（permissions.blockReadsOutsideWorkingDirectories）：处理 env 赋值、git 路径选项、从 stdin/内联执行代码、xargs，以及各参数（含 --opt=路径、glob、~）的路径校验，返回 deny/ask 或 undefined。
 */
function checkCommandAgainstReadBlock(command, cwd, context, requireAbsolute, trustedInline) {
  if (!command) return;
  let commandName = command.argv[0] ?? "";
  if (
    !trustedInline &&
    commandName.slice(commandName.lastIndexOf("/") + 1) === "env" &&
    command.argv.slice(1).some((arg) => {
      let match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(arg);
      return match !== null && !isSafeEnvAssignment(match[1], arg.slice(match[0].length));
    })
  )
    return outsideReadsTooComplexAsk(
      "an environment variable assignment outside the safe list cannot be checked against the read block",
    );
  let argv = stripWrappersFromArgvForPaths([...command.argv]);
  let commandPath = argv[0];
  if (commandPath === undefined) return;
  let commandName_2 = commandPath.slice(commandPath.lastIndexOf("/") + 1);
  if (commandName_2 === "git") {
    let paths = [];
    for (let idx = 1; idx < argv.length; idx++) {
      let arg = argv[idx];
      if (
        (arg === "-C" || arg === "--git-dir" || arg === "--work-tree" || arg === "--file" || arg === "-f") &&
        argv[idx + 1] !== undefined
      ) {
        paths.push(argv[idx + 1]);
        idx++;
      } else if (/^--(git-dir|work-tree|file)=/.test(arg)) paths.push(arg.slice(arg.indexOf("=") + 1));
      else if (arg.startsWith("-C") && arg.length > 2) paths.push(arg.slice(2));
    }
    return paths.length === 0 ? undefined : checkGitPathArgsForReadBlock(commandName_2, paths, cwd, context);
  }
  if (Object.hasOwn(PATH_EXTRACTORS, commandPath) || READ_BLOCK_EXEMPT_COMMANDS.has(commandName_2)) return;
  let inlineCodeFlags = INLINE_CODE_FLAGS.get(commandName_2.replace(/[\d.]+$/, ""));
  if (!trustedInline && inlineCodeFlags !== undefined && argv.slice(1).includes("-"))
    return outsideReadsTooComplexAsk(
      `${commandName_2} runs code from stdin, which cannot be checked against the read block`,
    );
  if (commandName_2 === "xargs") return outsideReadsRuntimePathAsk(commandName_2);
  if (
    !trustedInline &&
    inlineCodeFlags !== undefined &&
    argv
      .slice(1)
      .some(
        (arg) =>
          inlineCodeFlags.has(arg) ||
          [...inlineCodeFlags].some((inlineCodeFlag) =>
            inlineCodeFlag.startsWith("--")
              ? arg.startsWith(inlineCodeFlag + "=")
              : arg.startsWith("-") &&
                !arg.startsWith("--") &&
                arg.length > 2 &&
                arg.includes(inlineCodeFlag.slice(1)),
          ),
      )
  )
    return outsideReadsTooComplexAsk(
      `${commandName_2} runs inline code, which cannot be checked against the read block`,
    );
  let ask;
  for (let arg of argv.slice(1)) {
    if (arg === "") continue;
    if (containsAnyPlaceholder(arg)) {
      ask ??= outsideReadsRuntimePathAsk(commandName_2);
      continue;
    }
    let index = arg.indexOf("=");
    let pathCandidates = arg.startsWith("-")
      ? index > 0
        ? [arg.slice(index + 1)]
        : !arg.startsWith("--") && arg.length > 2
          ? [arg.slice(2)]
          : []
      : index > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(arg.slice(0, index))
        ? [arg, arg.slice(index + 1)]
        : [arg];
    for (let pathCandidate of pathCandidates) {
      if (pathCandidate === "") continue;
      if (pathCandidate.startsWith("~") && pathCandidate !== "~" && !pathCandidate.startsWith("~/")) {
        ask ??= outsideReadsRuntimePathAsk(commandName_2);
        continue;
      }
      let expandedPath = expandTildeWithHome(pathCandidate);
      if (isUncOrDevicePath(expandedPath)) {
        ask ??= outsideReadsRuntimePathAsk(commandName_2);
        continue;
      }
      if (requireAbsolute && !isAbsolute(expandedPath)) {
        ask ??= outsideReadsRuntimePathAsk(commandName_2);
        continue;
      }
      let pathToValidate = pathCandidate;
      let globIndex = firstGlobCharIndex(expandedPath);
      if (globIndex !== -1) {
        let sliced = expandedPath.slice(0, globIndex);
        pathToValidate = sliced.endsWith("/") ? sliced : dirname(sliced);
        if (
          shellPathSegments(expandedPath).some((segment) => urlPatternToRegex(segment)) ||
          globBeforeInteriorDotDot(expandedPath)
        ) {
          let validation = validatePath(pathToValidate, cwd, context, "read");
          if (!validation.allowed && validation.decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message: `${commandName_2} in '${validation.resolvedPath}' was blocked by a deny rule`,
              decisionReason: validation.decisionReason,
            };
          ask ??= outsideReadsRuntimePathAsk(commandName_2);
          continue;
        }
      }
      let absolutePath = expandTildeWithHome(pathToValidate);
      let resolvedPath = isAbsolute(absolutePath) ? absolutePath : resolve_2(cwd, absolutePath);
      if (!hasInteriorDotDot(absolutePath) && !getFsImplementation().existsSync(resolvedPath)) continue;
      let validation = validatePath(pathToValidate, cwd, context, "read");
      if (validation.allowed) continue;
      if (validation.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${commandName_2} in '${validation.resolvedPath}' was blocked by a deny rule`,
          decisionReason: validation.decisionReason,
        };
      if (isOutsideReadsBlockedAsk(validation.decisionReason)) {
        ask ??= {
          behavior: "ask",
          message: `${commandName_2} names '${validation.resolvedPath}', outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
          decisionReason: validation.decisionReason,
        };
        continue;
      }
      ask ??= {
        behavior: "ask",
        message: `${commandName_2} names '${pathToValidate}', which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`,
        decisionReason: {
          type: "safetyCheck",
          reason: `${commandName_2} names '${pathToValidate}', which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`,
          classifierApprovable: false,
          circuitBreaker: "outsideReadsBlocked",
        },
      };
    }
  }
  return ask;
}
//@ chunk-e6aww6q8.js:1181654-1181714 affinity
function isSandboxReadBlockEnforceable(permissionContext) {
  return (
    !isHttpMcpServeInvocation() &&
    permissionContext.servedCall !== true &&
    sandboxReadBlockApplies() &&
    hasBlockReadsOutsideWorkingDirectories()
  );
}
//@ chunk-e6aww6q8.js:1181714-1183399 fingerprint = bashToolCheckPermission (0.772)
/**
 * 单个子命令的权限判定：精确规则 → 前缀/通配规则 → 路径约束（checkPathConstraints）→ 读封锁下的 sed/env/读命令检查 → allow 规则 → sed 约束 → 权限模式（acceptEdits）→ 只读命令自动允许；否则 passthrough 并给出前缀建议。
 */
var bashToolCheckPermission = (
  input,
  toolPermissionContext,
  compoundCommandHasCd,
  astCommand,
  cwd = getCwd(),
  compoundBareAssignmentNames = [],
  sandboxDecision,
  getSandboxedCommand,
) => {
  let command = input.command.trim();
  let exactMatchResult = bashToolCheckExactMatchPermission(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny" || exactMatchResult.behavior === "ask") return exactMatchResult;
  let { matchingDenyRules, matchingAskRules, matchingAllowRules } = matchingRulesForInput(
    input,
    toolPermissionContext,
    "prefix",
    {
      skipCompoundCheck: astCommand !== undefined,
      astCommand,
      compoundBareAssignmentNames,
    },
  );
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  if (matchingAskRules[0] !== undefined)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  let pathResult = checkPathConstraints(
    input,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand?.redirects,
    astCommand ? [astCommand] : undefined,
    sandboxDecision,
  );
  if (
    pathResult.behavior === "deny" ||
    (pathResult.behavior === "ask" && !pathResult.bashAllowRuleOverridable)
  )
    return pathResult;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
    let sedResult = checkSedConstraints(input, toolPermissionContext);
    if (sedResult.behavior === "ask" && isOutsideReadsBlockedAsk(sedResult.decisionReason)) return sedResult;
  }
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
    if (
      hasUnsafeEnvVarPrefix(input, astCommand) &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(toolPermissionContext))
    )
      return outsideReadsTooComplexAsk(
        "an environment variable prefix outside the safe list cannot be checked against the read block",
      );
    let readBlockResult = checkCommandAgainstReadBlock(
      astCommand,
      cwd,
      toolPermissionContext,
      compoundCommandHasCd === true,
      shouldUseSandbox(input) && isSandboxReadBlockEnforceable(toolPermissionContext),
    );
    if (readBlockResult) return readBlockResult;
  }
  if (exactMatchResult.behavior === "allow") return exactMatchResult;
  if (matchingAllowRules[0] !== undefined)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: matchingAllowRules[0],
      },
    };
  if (pathResult.behavior === "ask") return pathResult;
  let sedConstraintResult = checkSedConstraints(input, toolPermissionContext);
  if (sedConstraintResult.behavior !== "passthrough") return sedConstraintResult;
  let modeResult = checkPermissionMode(input, toolPermissionContext);
  if (modeResult.behavior !== "passthrough") return modeResult;
  let sandboxEnvVarNames = lazySessionEnvVarNames(
    getSandboxedCommand && sessionEnvVarNameSet(getSandboxedCommand),
  );
  let isZshDangerousWithDenyRule =
    hasBashDenyRule(toolPermissionContext) && hasZshDangerousCommand(input.command);
  let hasUnsafeGlob = astCommand !== undefined && hasUnsafeGlobSource(astCommand);
  if (
    !isZshDangerousWithDenyRule &&
    !hasUnsafeGlob &&
    BashTool.isReadOnly(input, getSandboxedCommand) &&
    !hasUnsafeEnvVarPrefix(input, astCommand) &&
    !hasRiskyBareAssignment(compoundBareAssignmentNames, sandboxEnvVarNames)
  )
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "other",
        reason: READ_ONLY_AUTO_ALLOW_REASON,
      },
    };
  let decisionReason = {
    type: "other",
    reason: "This command requires approval",
    bashMissKind: "no-rule-match",
  };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions: suggestionForExactCommand(command),
  };
};
//@ chunk-e6aww6q8.js:1183399-1183707 layout
/**
 * 对子命令跑 bashToolCheckPermission，passthrough 时用前缀提取器给出的 commandPrefix 生成建议规则。
 */
async function checkSubcommandPermissionWithSuggestions(
  input,
  toolPermissionContext,
  commandPrefixResult,
  compoundCommandHasCd,
  astCommand,
  sandboxedCommand,
  compoundBareAssignmentNames = [],
  getSandboxedCommand,
) {
  let exactMatchResult = bashToolCheckExactMatchPermission(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny" || exactMatchResult.behavior === "ask") return exactMatchResult;
  let result = bashToolCheckPermission(
    input,
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand,
    sandboxedCommand,
    compoundBareAssignmentNames,
    undefined,
    getSandboxedCommand,
  );
  if (result.behavior === "deny" || result.behavior === "ask") return result;
  if (result.behavior === "allow") return result;
  let suggestedUpdates = commandPrefixResult?.commandPrefix
    ? suggestionForPrefix(commandPrefixResult.commandPrefix)
    : suggestionForExactCommand(input.command);
  return {
    ...result,
    suggestions: suggestedUpdates,
  };
}
//@ chunk-e6aww6q8.js:1183707-1183928 layout
var INTERPRETER_COMMANDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DD_OPERAND_KEYS;
var INNER_WHITESPACE_RE;
deferInit("chunk-e6aww6q8.js:1183707", () => {
  INTERPRETER_COMMANDS = new Set(["python", "python3", "node", "bun", "deno", "ruby", "perl"]);
  DD_OPERAND_KEYS = new Set([
    "if",
    "of",
    "bs",
    "ibs",
    "obs",
    "cbs",
    "count",
    "skip",
    "seek",
    "iseek",
    "oseek",
    "conv",
    "status",
    "iflag",
    "oflag",
  ]);
  INNER_WHITESPACE_RE = /[^ \t\n][ \t\n]+[^ \t\n]/;
});
//@ chunk-e6aww6q8.js:1183928-1185390 layout
/**
 * 沙箱开启且"沙箱内自动允许"打开时，对已解析的简单命令判断能否自动允许：排除危险 env 赋值、UNC 路径、/dev/tcp 重定向、cd 与 rm 组合、危险删除路径等，满足则返回规则检查结果（allow/ask/deny）。
 */
function checkSandboxAutoAllowForAst(
  input,
  permissionContext,
  commands,
  bareAssignmentNames,
  toolUseContext,
) {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    !SandboxManager.isAutoAllowBashIfSandboxedEnabled() ||
    !shouldUseSandbox(input) ||
    isSandboxAutoAllowOff(permissionContext) ||
    antDisabledListMatchesCommandText(input.command) ||
    (permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !isSandboxReadBlockEnforceable(permissionContext))
  )
    return null;
  let decision = checkRulesForSandboxAutoAllow(input, permissionContext, commands);
  if (decision.behavior === "passthrough") return null;
  let getSessionEnvVarNames = lazySessionEnvVarNames(sessionEnvVarNameSet(toolUseContext));
  let hasUnsafeAssignment =
    hasRiskyBareAssignment(bareAssignmentNames, getSessionEnvVarNames) ||
    commands.some((command) => {
      let argv = stripWrappersFromArgvForPaths(command.argv);
      let droppedArgCount = command.argv.length - argv.length + 1;
      let interpreterArgIndex =
        INTERPRETER_COMMANDS.has(argv[0] ?? "") &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_larkspur", true)
          ? droppedArgCount
          : Number.POSITIVE_INFINITY;
      let ddOperandIndex =
        argv[0] === "dd" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_sorrel", true)
          ? droppedArgCount
          : Number.POSITIVE_INFINITY;
      return (
        command.envVars.some(
          (envVar) =>
            !isSafeEnvAssignment(envVar.name, envVar.value) &&
            (!INTERPRETER_COMMANDS.has(command.argv[0] ?? "") ||
              isAssignmentNameUnsafeForSandbox(envVar.name) ||
              isDangerousEnvName(envVar.name) ||
              isBuildToolEnvVar(envVar.name) ||
              !getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_plover", true) ||
              getEffectiveFilesystemPolicy() === "relaxed" ||
              !SandboxManager.isUnsandboxedFallbackClosedByTrustedSource()),
        ) ||
        command.argv.slice(1).some(isTildeUserPath) ||
        command.redirects.some((redirect) => redirect.op === "<" && isTildeUserPath(redirect.target)) ||
        command.argv.some((arg, idx) => {
          if (!arg.includes("=") || arg.startsWith("-")) return false;
          let index = arg.indexOf("=");
          if (
            idx >= ddOperandIndex &&
            DD_OPERAND_KEYS.has(arg.slice(0, index)) &&
            !arg
              .slice(index + 1)
              .split(":")
              .some(isTildeUserPath)
          )
            return false;
          let name = arg[index - 1] === "+" ? arg.slice(0, index - 1) : arg.slice(0, index);
          if (idx >= interpreterArgIndex && INNER_WHITESPACE_RE.test(name)) return false;
          return !isSafeEnvAssignment(name, arg.slice(index + 1));
        })
      );
    });
  let any = commands.some((command) =>
    command.redirects.some((subcmd) => /^\/dev\/(tcp|udp)\//.test(subcmd.target)),
  );
  if (hasUnsafeAssignment || any) return null;
  let hasCd = false;
  let hasRm = false;
  for (let command of commands) {
    let [baseName, ...args] = stripWrappersFromArgvForPaths(command.argv);
    let replaced = baseName?.replace(/^.*[\\/]/, "");
    if (replaced === "cd" || replaced === "pushd" || replaced === "popd" || replaced === "chdir") {
      hasCd = true;
      continue;
    }
    if (replaced !== "rm" && replaced !== "rmdir") continue;
    hasRm = true;
    if (checkDangerousRemovalPaths(replaced, args, getCwd(), permissionContext).behavior !== "passthrough")
      return null;
  }
  if (hasCd && hasRm) return null;
  return decision;
}
//@ chunk-e6aww6q8.js:1185390-1188803 fingerprint = checkSandboxAutoAllow (0.592)
/**
 * AST 过于复杂时的沙箱自动允许：逐个片段检查 deny/ask 规则，再用一长串启发式（heredoc、${!x}、/proc/*\/environ、引号/展开、test/find/jobs/print/set 的危险用法）排除，全部通过则 allow（有 ask 规则则 ask）。
 */
function checkSandboxAutoAllow(input, permissionContext, nodeType) {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    !SandboxManager.isAutoAllowBashIfSandboxedEnabled() ||
    !shouldUseSandbox(input) ||
    isSandboxAutoAllowOff(permissionContext) ||
    antDisabledListMatchesCommandText(input.command) ||
    (permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !isSandboxReadBlockEnforceable(permissionContext))
  )
    return null;
  if (nodeType === undefined || nodeType === "PARSE_ABORT" || nodeType === "ERROR") return null;
  if (/(?<!<)<<(?!<)/.test(input.command)) return null;
  if (/\$\{[\s|]/.test(input.command.replace(/['"\\]/g, ""))) return null;
  if (/\$\{![A-Za-z_0-9]/.test(input.command.replace(/['"\\]/g, ""))) return null;
  if (/\/proc\/.*\/environ/.test(input.command.replace(/['"\\]/g, ""))) return null;
  if (hasZshExecutableParenInBraceExpansion(input.command)) return null;
  let commands = splitCommandStrict(input.command);
  if (commands === null || commands.length === 0) return null;
  let firstAskRule;
  for (let command of commands) {
    let { matchingDenyRules, matchingAskRules } = matchingRulesForInput(
      {
        ...input,
        command,
      },
      permissionContext,
      "prefix",
    );
    if (matchingDenyRules[0] !== undefined)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${input.command.trim()} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: matchingDenyRules[0],
        },
      };
    firstAskRule ??= matchingAskRules[0];
  }
  for (let command of commands) {
    let words = command.trim().split(/\s+/).filter(Boolean);
    let subcommands = stripSafeLeadingAssignments(words);
    if (subcommands === null) return null;
    if (subcommands.length === 0) continue;
    let argv = stripWrappersFromArgvForPaths(subcommands);
    let sliced = subcommands.slice(0, subcommands.length - argv.length);
    if (sliced.some((arg) => /["'`$\\(){}|;&<>*?[\]]/.test(arg))) return null;
    if (
      sliced.some((assignment) => {
        let match = assignment.match(/^([A-Za-z_]\w*)\+?=/);
        return match !== null && isAssignmentNameUnsafeForSandbox(match[1]);
      })
    )
      return null;
    let mapped = argv.map((arg) => arg.replace(/['"\\]/g, ""));
    if (
      mapped.some((assignment) => {
        let match = assignment.match(/^([A-Za-z_]\w*)\+?=/);
        return match !== null && isAssignmentNameUnsafeForSandbox(match[1]);
      })
    )
      return null;
    let any = argv.some((arg, idx) => {
      if (idx === 0) return false;
      if (
        (arg.includes("$'") && !/^'[^']*\$'$/.test(arg)) ||
        (arg.includes('$"') && !/^"[^"]*\$"$/.test(arg))
      )
        return true;
      let unquoted = mapped[idx];
      return (
        unquoted.includes("`") ||
        /\$\((?!\()/.test(unquoted) ||
        (/\$[^(\s]/.test(unquoted) && unquoted.includes("-")) ||
        /\$\{[^}]*:?[+=]/.test(unquoted) ||
        /\{[^\s]*(,|\.\.)/.test(arg) ||
        (unquoted.match(/\{/g) ?? []).length !== (unquoted.match(/\}/g) ?? []).length
      );
    });
    let any_2 = mapped.some((arg, idx) => idx > 0 && arg.includes("$"));
    let any_3 = argv.some((arg, idx) => idx > 0 && (/[<>]/.test(arg) || arg.endsWith("\\")));
    let baseName = argv[0];
    if (
      baseName === undefined ||
      !/^[A-Za-z0-9._/~+][A-Za-z0-9._/~+-]*$/.test(baseName) ||
      isSandboxAutoAllowUnsafeBase(baseName) ||
      WRAPPER_COMMAND_NAMES.has(baseName) ||
      WRAPPER_COMMAND_NAMES.has(baseName.replace(/^.*[\\/]/, "")) ||
      (EXPANSION_SENSITIVE_BUILTINS.has(baseName) &&
        (any || mapped.some((unquoted) => unquoted.includes("[") && /[$`]/.test(unquoted)))) ||
      (baseName === "test" &&
        (any ||
          any_3 ||
          mapped.some((unquoted) => unquoted === "-t" || TEST_ARITH_CMP_OPS.has(unquoted)) ||
          mapped.some(
            (arg, idx) => idx > 0 && arg.includes("$") && (mapped.length > 4 || idx === mapped.length - 2),
          ))) ||
      baseName === "jq" ||
      AWK_NAMES.has(baseName) ||
      (baseName === "find" &&
        (any ||
          any_3 ||
          (() => {
            let expectOperand = false;
            for (let idx = 1; idx < mapped.length; idx++) {
              let word = mapped[idx];
              let previousExpectOperand = expectOperand;
              expectOperand = false;
              if (isFindDangerousAction(word)) return true;
              if (isAmbiguousFindWord(word) || (argv[idx] !== word && findWordTakesOperand(word)))
                return true;
              if (!previousExpectOperand && findWordTakesFlagValue(argv[idx])) {
                expectOperand = true;
                continue;
              }
              if (!previousExpectOperand && findWordTakesOperand(argv[idx])) {
                let nextWord = mapped[idx + 1];
                let matches = /^'[^']*'$|^"[^"]*"$/.test(argv[idx + 1] ?? "");
                if (nextWord !== undefined && /[[\]*?]/.test(nextWord) && !matches) return true;
                if (
                  nextWord !== undefined &&
                  (!nextWord.includes("$") || (matches && /^\$\{?[A-Za-z_]\w*\}?$/.test(nextWord)))
                ) {
                  idx++;
                  continue;
                }
              }
              if (word.includes("$") || /[[\]*?]/.test(word)) return true;
            }
            return false;
          })())) ||
      (baseName === "jobs" && (any || any_2 || any_3 || mapped.some((arg) => /^-[^-]*x/.test(arg)))) ||
      (baseName === "print" &&
        (any ||
          (any_2 && /^[+-]|\$/.test(mapped[1] ?? "")) ||
          any_3 ||
          /\\['"]/.test(command) ||
          /[[\]*?]/.test(command.replace(/'[^']*'|"[^"]*"/g, "")) ||
          mapped.some((arg) => PRINT_PROMPT_FLAG.test(arg)))) ||
      (baseName === "set" &&
        (any ||
          any_3 ||
          (() => {
            for (let idx = 1; idx < mapped.length; idx++) {
              let arg = mapped[idx];
              if (arg === "--") return false;
              if (arg.includes("$")) return true;
              if (!/^[-+]/.test(arg)) continue;
              for (let idx_2 = 1; idx_2 < arg.length; idx_2++) {
                let flagChar = arg[idx_2];
                if (flagChar === "o") {
                  let optionName = idx_2 < arg.length - 1 ? arg.slice(idx_2 + 1) : mapped[idx + 1];
                  if (
                    optionName !== undefined &&
                    optionName !== "" &&
                    !SET_O_SAFE_OPTS.has(optionName.toLowerCase().replace(/[_-]/g, ""))
                  )
                    return true;
                  break;
                }
                if (flagChar === "A") break;
                if (!SET_O_SAFE_LETTERS.has(flagChar)) return true;
              }
            }
            return false;
          })()))
    )
      return null;
  }
  if (firstAskRule)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: firstAskRule,
      },
    };
  return {
    behavior: "allow",
    updatedInput: input,
    decisionReason: {
      type: "other",
      reason: SANDBOX_AUTO_ALLOW_REASON,
    },
  };
}
//@ chunk-e6aww6q8.js:1188803-1188958 layout
var EXPANSION_SENSITIVE_BUILTINS; // deferred: uses SUBSCRIPT_EVAL_FLAGS (../../utils/bash/ast.js) of its import cycle while loading; runs once the cycle is complete
var WRAPPER_COMMAND_NAMES;
deferInit("chunk-e6aww6q8.js:1188803", () => {
  EXPANSION_SENSITIVE_BUILTINS = new Set([
    "printf",
    "test",
    "read",
    "wait",
    "unset",
    ...DECLARATION_LIKE_BUILTINS,
  ]);
  WRAPPER_COMMAND_NAMES = new Set([
    "time",
    "nohup",
    "timeout",
    "nice",
    "stdbuf",
    "env",
    "command",
    "builtin",
    "noglob",
  ]);
});
//@ chunk-e6aww6q8.js:1188958-1189178 layout
/**
 * 剥离 argv 开头的 VAR=value；遇到危险变量或值含元字符返回 null。
 */
function stripSafeLeadingAssignments(words) {
  let assignmentCount = 0;
  while (assignmentCount < words.length) {
    let match = words[assignmentCount].match(/^([A-Za-z_][A-Za-z0-9_]*)\+?=(.*)$/);
    if (match === null) break;
    if (isAssignmentNameUnsafeForSandbox(match[1])) return null;
    if (/["'`$\\(){}|;&<>*?[\]]/.test(match[2])) return null;
    assignmentCount++;
  }
  return assignmentCount === 0 ? words : words.slice(assignmentCount);
}
//@ chunk-e6aww6q8.js:1189178-1190057 layout = checkSemanticsDeny (0.881)
/**
 * 对整条命令和每个 AST 子命令查 prefix deny/ask 规则；没有命中则以"沙箱自动允许"理由 allow。
 */
function checkRulesForSandboxAutoAllow(input, toolPermissionContext, commands) {
  let command = input.command.trim();
  let { matchingDenyRules, matchingAskRules } = matchingRulesForInput(
    input,
    toolPermissionContext,
    "prefix",
    {
      astCommand: commands.length === 1 ? commands[0] : undefined,
    },
  );
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  if (commands.length > 1 || commands[0]?.text !== command) {
    let firstAskRule;
    for (let cmd of commands) {
      let subResult = matchingRulesForInput(
        {
          command: cmd.text,
        },
        toolPermissionContext,
        "prefix",
        {
          astCommand: cmd,
        },
      );
      if (subResult.matchingDenyRules[0] !== undefined)
        return {
          behavior: "deny",
          message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
          decisionReason: {
            type: "rule",
            rule: subResult.matchingDenyRules[0],
          },
        };
      firstAskRule ??= subResult.matchingAskRules[0];
    }
    if (firstAskRule)
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(BashTool.name),
        decisionReason: {
          type: "rule",
          rule: firstAskRule,
        },
      };
  }
  if (matchingAskRules[0] !== undefined)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  return {
    behavior: "allow",
    updatedInput: input,
    decisionReason: {
      type: "other",
      reason: SANDBOX_AUTO_ALLOW_REASON,
    },
  };
}
//@ chunk-e6aww6q8.js:1190057-1190400 fingerprint = filterCdCwdSubcommands (0.641)
/**
 * 过滤掉 "cd <当前目录>" 这种无效 cd 子命令（参数是纯路径、无 env/重定向/通配），返回剩余子命令及对应 AST。
 */
function filterCdCwdSubcommands(rawSubcommands, astCommands, cwd, cwdMingw) {
  let subcommands = [];
  let astCommandsByIdx = [];
  for (let i = 0; i < rawSubcommands.length; i++) {
    let cmd = rawSubcommands[i];
    let astCommand = astCommands?.[i];
    if (
      ((cmd === `cd ${cwd}` && isPlainPathToken(cwd)) ||
        (cmd === `cd ${cwdMingw}` && isPlainPathToken(cwdMingw))) &&
      astCommand !== undefined &&
      astCommand.argv.length === 2 &&
      astCommand.argv[0] === "cd" &&
      astCommand.envVars.length === 0 &&
      astCommand.redirects.length === 0 &&
      !/[*?[\]]/.test(astCommand.argv[1]) &&
      !containsAnyPlaceholder(astCommand.argv[1])
    )
      continue;
    subcommands.push(cmd);
    astCommandsByIdx.push(astCommand);
  }
  return {
    subcommands,
    astCommandsByIdx,
  };
}
//@ chunk-e6aww6q8.js:1190400-1190458 placement
/**
 * 字符串是否是不含空白、引号、通配、元字符的纯路径（用于识别无效的 cd <cwd>）。
 */
function isPlainPathToken(token) {
  return !/[\s\\$`'"*?[\]{}<>|&;()]/.test(token);
}
//@ chunk-e6aww6q8.js:1190458-1190605 placement
/**
 * 命令是否只由 && 连接（不含 ||、;、换行、单个 &）。
 */
function isSimpleAndChain(command) {
  if (command.includes("||") || command.includes(";")) return false;
  if (
    command.includes(`
`)
  )
    return false;
  if (command.replaceAll("&&", "").includes("&")) return false;
  return true;
}
//@ chunk-e6aww6q8.js:1197312-1197749 fingerprint = checkEarlyExitDeny (0.959)
/**
 * 对整条命令做提前检查：prefix deny → 拒绝；精确 deny → 拒绝；prefix ask → 询问；精确匹配非 passthrough 时返回它；否则 null。
 */
function checkEarlyExitDeny(input, toolPermissionContext) {
  let { matchingDenyRules, matchingAskRules } = matchingRulesForInput(input, toolPermissionContext, "prefix");
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  let exactMatchResult = bashToolCheckExactMatchPermission(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny") return exactMatchResult;
  if (matchingAskRules[0] !== undefined)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  if (exactMatchResult.behavior !== "passthrough") return exactMatchResult;
  return null;
}
//@ chunk-e6aww6q8.js:1197749-1198003 sole-consumer
/**
 * 读封锁开关打开时返回 mayBeUnset(name) 判定器，用于估计变量在运行时是否可能为空（TMPDIR 在沙箱中视为已设置）。
 */
function createEnvUnsetOracle(isEvalOrSource, toolUseContext) {
  if (!isDangerousRmEnabled()) return;
  return {
    mayBeUnset: (varName) => {
      if (isEvalOrSource) return true;
      if (varName === "TMPDIR" && SandboxManager.isSandboxingEnabled()) return false;
      let processValue = process.env[varName];
      if (typeof processValue === "string") return processValue === "";
      return (
        /^(?:TMPDIR|TMP|TEMP)$/.test(varName) ||
        spawnEnvKeysForSession(sessionEnvVarNameSet(toolUseContext))?.has(varName) !== true ||
        wasShellExportReported(varName)
      );
    },
  };
}
//@ chunk-e6aww6q8.js:1198003-1198326 sole-consumer
/**
 * 检测命令中可能展开为空的变量导致 rm 等危险删除（如 rm -rf $DIR/），命中时记录遥测并返回危险项。
 */
function findDangerousVariableRemoval(
  text,
  skipAssignedOriginalHits,
  wholeCommand,
  isEvalOrSource,
  toolUseContext,
  assignments,
) {
  let envUnsetOracle = createEnvUnsetOracle(isEvalOrSource, toolUseContext);
  if (envUnsetOracle === undefined)
    return skipAssignedOriginalHits ? null : findDangerousVariableRemovalInText(text);
  let dangerousVariableRemovalInText = findDangerousVariableRemovalInText(text, {
    ...envUnsetOracle,
    wholeCommand,
    skipAssignedOriginalHits,
    assignments,
  });
  if (dangerousVariableRemovalInText === null) return null;
  if (dangerousVariableRemovalInText.rootChild !== undefined) logDangerousRmShape("var_root_child");
  else if (dangerousVariableRemovalInText.derived !== undefined) logDangerousRmShape("derived_var");
  else if (skipAssignedOriginalHits || findDangerousVariableRemovalInText(text) === null)
    logDangerousRmShape("eval_trap_string");
  return dangerousVariableRemovalInText;
}
//@ chunk-e6aww6q8.js:1198326-1199186 sole-consumer = checkSemanticsDeny (0.783)
/**
 * AST 过于复杂（too-complex）时的拒绝路径：整命令/各片段的 deny 规则、读封锁、空变量删除、AST 上的危险删除检查；只有精确 allow 规则覆盖整条命令时才返回 allow。
 */
async function checkTooComplexCommandDeny(
  input,
  permissionContext,
  parsedRoot,
  findExtraDeny,
  originalCommand,
  isEvalOrSource,
  toolUseContext,
  toolUseContext_2,
) {
  let fullCmd = checkEarlyExitDeny(input, permissionContext);
  if (fullCmd?.behavior === "deny") return fullCmd;
  if (getContentRulesMapForTool(permissionContext, BashTool, "deny").size > 0) {
    let candidateCommands = new Set([
      ...splitCommand(input.command),
      ...(parsedRoot && parsedRoot !== PARSE_ABORTED ? nestedCommandSpansFromAst(parsedRoot) : []),
    ]);
    for (let cmd of candidateCommands) {
      let subDeny = matchingRulesForInput(
        {
          ...input,
          command: cmd,
        },
        permissionContext,
        "prefix",
      ).matchingDenyRules[0];
      if (subDeny !== undefined)
        return {
          behavior: "deny",
          message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
          decisionReason: {
            type: "rule",
            rule: subDeny,
          },
        };
    }
  }
  let denyResult = findExtraDeny?.();
  if (denyResult) return denyResult;
  let dangerousVariableRemoval = findDangerousVariableRemoval(
    input.command,
    false,
    originalCommand,
    isEvalOrSource,
    toolUseContext_2,
  );
  if (dangerousVariableRemoval !== null) {
    logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
      kind: fromEnum("emptyVariable"),
    });
    return checkDangerousRemoval(dangerousVariableRemoval, false);
  }
  if (parsedRoot && parsedRoot !== PARSE_ABORTED) {
    let removalResult = await checkDangerousRemovals(
      parsedRoot,
      getCwd(),
      permissionContext,
      originalCommand,
      isEvalOrSource,
      toolUseContext,
      toolUseContext_2,
    );
    if (removalResult !== null) {
      logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
        kind: fromEnum(removalResult.kind),
      });
      return removalResult.result;
    }
  }
  if (fullCmd === null || fullCmd.behavior !== "allow") return fullCmd;
  return (fullCmd.decisionReason?.type === "rule"
    ? fullCmd.decisionReason.rule.ruleValue.ruleContent
    : undefined) === input.command.trim()
    ? fullCmd
    : null;
}
//@ chunk-e6aww6q8.js:1199186-1199290 sole-consumer
function isMountedDriveAsk(decision) {
  return (
    decision.behavior === "ask" &&
    classifyRemovalReason(findSafetyCheckReason(decision.decisionReason)?.reason ?? "") ===
      "mounted_drive_path"
  );
}
//@ chunk-e6aww6q8.js:1199290-1199410 sole-consumer
function preferEarlierAsk(softAsk, result) {
  return softAsk !== undefined &&
    findSafetyCheckReason(
      result.result.decisionReason,
      (reason) => reason.circuitBreaker === "dangerousRemoval",
    ) === undefined
    ? softAsk
    : result;
}
//@ chunk-e6aww6q8.js:1199410-1203520 sole-consumer
/**
 * 检查命令（含命令替换、嵌套命令）中的危险 rm/rmdir：空变量展开、字面目标、替换输出为空时的目标、整段替换作为递归删除目标、内联 shell 脚本；返回 {result, kind} 或 null。
 */
async function checkDangerousRemovals(
  node,
  cwd,
  context,
  commandText,
  isEvalOrSource,
  bareAssignmentNames,
  toolUseContext,
) {
  let substitutions = [];
  let collectSubstitutions = (node) => {
    let text = node.text;
    let funsubBody = funsubBodyFromNode(node);
    if (node.type === "command_substitution" || node.type === "process_substitution" || funsubBody !== null) {
      let openLength =
        text.startsWith("$(") || text.startsWith("<(") || text.startsWith(">(")
          ? 2
          : text.startsWith("`")
            ? 1
            : 0;
      let closeIndex = text.endsWith(")") || text.endsWith("`") ? text.length - 1 : text.length;
      substitutions.push(funsubBody ?? text.slice(openLength, closeIndex).trim());
    }
    for (let child of node.children) if (child) collectSubstitutions(child);
  };
  collectSubstitutions(node);
  let envUnsetOracle = createEnvUnsetOracle(isEvalOrSource, toolUseContext);
  let assignments =
    envUnsetOracle === undefined
      ? undefined
      : describeCommandSubstitution(commandText ?? node.text, envUnsetOracle.mayBeUnset);
  let isPlainCommandNode = node.keywordAfterPrefix === true;
  if (substitutions.length > 64) {
    if (isTinglyPearlEnabled() || /\brm(?:dir)?\b/.test(node.text))
      return {
        result: dangerousRemovalAsk(
          "rm",
          `This command contains ${substitutions.length} command substitutions \u2014 too many to analyze for catastrophic removals. This requires explicit approval.`,
          `not ruled out \u2014 too many command substitutions to analyze (${substitutions.length})`,
        ),
        kind: "tooManySubstitutions",
      };
    return null;
  }
  let nestedSpans = isPlainCommandNode
    ? nestedCommandSpansOrOverrun(node, {
        unparsedBodyOverruns: true,
      })
    : [];
  if (nestedSpans === null)
    return {
      result: dangerousRemovalAsk(
        "rm",
        "This command could not be fully checked for dangerous rm operations: not all of its nested commands or function substitutions could be analyzed. This requires explicit approval.",
        "not ruled out \u2014 some nested commands or function substitutions could not be analyzed",
      ),
      kind: "nestedSpansOverrun",
    };
  let nestedCommands = nestedSpans ?? [];
  let any = nestedCommands.some((nestedCommand) => isNormalizedCdCommand(nestedCommand.trim()));
  let hasCd =
    commandHasAnyCd(node.text) || substitutions.some((substitution) => commandHasAnyCd(substitution)) || any;
  let cdCommands = hasCd
    ? [
        ...[node.text, ...substitutions]
          .flatMap((text) => {
            try {
              return splitCommand(text);
            } catch {
              return [text];
            }
          })
          .map((command) => command.trim())
          .filter((command) => isNormalizedCdCommand(command))
          .map((text) => ({
            text,
            cd: true,
            names: [],
            exports: false,
          })),
        ...(any ? [INLINE_CD_PLACEHOLDER] : []),
      ]
    : [];
  let softAsk;
  for (let text of [node.text, ...substitutions]) {
    let commands;
    try {
      commands = splitCommand(text);
    } catch {
      commands = [text];
    }
    if (text === node.text && nestedCommands.length > 0) commands = uniq([...commands, ...nestedCommands]);
    for (let subcommand of commands) {
      let trimmed = subcommand.trim();
      if (
        (trimmed.startsWith("{") && /;?\s*\}$/.test(trimmed)) ||
        (trimmed.startsWith("(") && trimmed.endsWith(")"))
      )
        trimmed = trimmed
          .slice(1)
          .replace(/;?\s*[)}]$/, "")
          .trim();
      let dangerousVariableRemoval = findDangerousVariableRemoval(
        trimmed,
        false,
        commandText ?? node.text,
        isEvalOrSource,
        toolUseContext,
        assignments,
      );
      if (dangerousVariableRemoval !== null)
        return preferEarlierAsk(softAsk, {
          result: checkDangerousRemoval(dangerousVariableRemoval, true),
          kind: "emptyVariable",
        });
      let replaced = trimmed.replace(/`[^`]*`/g, "__CMDSUB__");
      for (let previous = "", pass = 0; previous !== replaced && pass < 16; pass++) {
        previous = replaced;
        replaced = replaced.replace(/\$\([^()]*\)/g, "__CMDSUB__");
      }
      for (let previous = "", pass = 0; previous !== replaced && pass < 16; pass++) {
        previous = replaced;
        replaced = replaced.replace(
          /\$\{(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?!$-]):?[-=+?]"?((?:__CMDSUB__[/*.]*)+)"?\}/g,
          "$1",
        );
      }
      let hasCmdsub = replaced !== trimmed;
      let parsed = await parseForSecurity(replaced, {
        readsDivergentShapes: true,
      });
      if (parsed.kind === "simple")
        for (let command of parsed.commands) {
          let sliced = command.argv.slice();
          if (sliced[0] !== undefined) sliced[0] = sliced[0].replace(/^.*[\\/]/, "");
          let argv = unwrapCommandArgv(stripWrappersFromArgvForPaths(sliced));
          let commandName = normalizeCommandName(argv[0]);
          if (commandName !== "rm" && commandName !== "rmdir") continue;
          let sliced_2 = argv.slice(1);
          let targetDecision = checkDangerousRemovalPaths(commandName, sliced_2, cwd, context, hasCd);
          let mountedDriveAsk = isMountedDriveAsk(targetDecision) ? targetDecision : undefined;
          let kind = "literalTarget";
          if (targetDecision.behavior === "ask" && mountedDriveAsk === undefined)
            return preferEarlierAsk(softAsk, {
              result: targetDecision,
              kind: "literalTarget",
            });
          if (
            hasCmdsub &&
            sliced_2.some((arg) => /.(?:__CMDSUB__(?:(?!\.\.)[/*.])*)+(?:\/\.\.)*\/*$/.test(arg))
          ) {
            let index = sliced_2.indexOf("--");
            let doubleDashIndex = index === -1 ? sliced_2.length : index;
            let currentArgs = sliced_2;
            for (let keepFlags of [true, false]) {
              let mapped = sliced_2.map((arg, idx) =>
                keepFlags && idx < doubleDashIndex && arg.startsWith("-") && !arg.includes("/")
                  ? arg
                  : arg.replace(/(.)(?:__CMDSUB__(?:(?!\.\.)[/*.])*)+((?:\/\.\.)*)\/*$/, "$1$2"),
              );
              let all = mapped.every((arg, idx) => arg === currentArgs[idx]);
              currentArgs = mapped;
              if (all) continue;
              let strippedDecision = checkDangerousRemovalPaths(commandName, mapped, cwd, context, hasCd);
              if (strippedDecision.behavior === "ask" && !isMountedDriveAsk(strippedDecision))
                return preferEarlierAsk(softAsk, {
                  result: strippedDecision,
                  kind: "emptyExpansion",
                });
              if (strippedDecision.behavior === "ask" && mountedDriveAsk === undefined) {
                mountedDriveAsk = strippedDecision;
                kind = "emptyExpansion";
              }
            }
          }
          let flagArgs = sliced_2.includes("--") ? sliced_2.slice(0, sliced_2.indexOf("--")) : sliced_2;
          if (
            hasCmdsub &&
            commandName === "rm" &&
            flagArgs.some((arg) => /^--r/.test(arg) || /^-[a-zA-Z]*[rR]/.test(arg)) &&
            sliced_2.some((arg) => /^(?:__CMDSUB__[/*.]*)+$/.test(arg))
          ) {
            let featureValue = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_iridescent_boot", true);
            if (
              !env.CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT &&
              !(featureValue.value === false && featureValue.source === "payload")
            )
              return preferEarlierAsk(softAsk, {
                result: dangerousRemovalAsk(
                  commandName,
                  "Dangerous rm operation detected: the target is the output of a command substitution (`$(...)` or backticks) and cannot be checked before the command runs. This requires explicit approval and cannot be auto-allowed by permission rules.\n\nRun the substitution on its own first, then remove the literal paths it prints.",
                  "on statically-unresolvable target: command substitution output",
                ),
                kind: "wholeSubstitution",
              });
            logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
              kind: fromEnum("wholeSubstitution"),
            });
          }
          if (mountedDriveAsk !== undefined)
            softAsk ??= {
              result: mountedDriveAsk,
              kind,
            };
        }
    }
  }
  for (let text of [node.text, ...substitutions]) {
    let inlineResult = await checkInlineShellRemoval(
      text,
      bareAssignmentNames,
      text === node.text ? [] : cdCommands,
    );
    if (inlineResult !== null)
      return preferEarlierAsk(softAsk, {
        result: inlineResult,
        kind: "inlineShellScript",
      });
  }
  return softAsk ?? null;
}
//@ chunk-e6aww6q8.js:1203520-1203541 sole-consumer
var FALLBACK_RULE_LEFT_CHARS = 32;
var FALLBACK_RULE_TOTAL_CHARS = 20000;
//@ chunk-e6aww6q8.js:1222420-1222925 fingerprint = checkSemanticsDeny (0.891)
/**
 * 语义检查失败时的规则检查：整命令提前检查 + 每个 AST 子命令的 deny 规则；allow 仅当规则内容等于整条命令。
 */
function checkSemanticsDeny(input, toolPermissionContext, commands) {
  let fullCmd = checkEarlyExitDeny(input, toolPermissionContext);
  if (fullCmd?.behavior === "deny") return fullCmd;
  for (let cmd of commands) {
    let subDeny = matchingRulesForInput(
      {
        ...input,
        command: cmd.text,
      },
      toolPermissionContext,
      "prefix",
      {
        astCommand: cmd,
      },
    ).matchingDenyRules[0];
    if (subDeny !== undefined)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: subDeny,
        },
      };
  }
  if (fullCmd?.behavior === "allow") {
    if (
      (fullCmd.decisionReason?.type === "rule"
        ? fullCmd.decisionReason.rule.ruleValue.ruleContent
        : undefined) === input.command.trim()
    )
      return fullCmd;
  }
  if (fullCmd?.behavior === "ask") return fullCmd;
  return null;
}
//@ chunk-e6aww6q8.js:1222925-1223105 layout
/**
 * tree-sitter 树中是否含 ERROR 节点或不在二元表达式里的后台 &。
 */
function hasErrorOrBackgroundNode(node) {
  for (let child of node.children) {
    if (!child) continue;
    if (child.type === "ERROR") return true;
    if (child.type === "&") {
      if (node.type !== "binary_expression") return true;
      continue;
    }
    if (hasErrorOrBackgroundNode(child)) return true;
  }
  return false;
}
//@ chunk-e6aww6q8.js:1223105-1223554 layout
/**
 * bashMissKind 分类表：too-complex/semantics/multi-cd/shell-operators/cd-git-compound/process-substitution/loop-later-pass 为结构性原因。
 */
var STRUCTURAL_MISS_KINDS = {
  "too-complex": true,
  semantics: true,
  "multi-cd": true,
  "shell-operators": true,
  "cd-git-compound": true,
  "process-substitution": true,
  "loop-later-pass": true,
  "cd-compound-write": false,
  "cd-compound-read": false,
  "cd-compound-redirect": false,
  "dangerous-path": false,
  "flag-validation": false,
  "cd-multi-positional": false,
  "shell-expansion": false,
  "net-redirect": false,
  "sed-dangerous": false,
  "assigned-variable": false,
  "no-rule-match": false,
  "ask-rule": false,
  "working-dir": false,
  "safety-check": false,
  "other-untagged": false,
};
//@ chunk-e6aww6q8.js:1223554-1223712 layout
/**
 * 若 ask 结果的 bashMissKind 是结构性原因则返回它。
 */
function getStructuralMissKind(decision) {
  let decisionReason = decision.behavior === "ask" ? decision.decisionReason : undefined;
  return decisionReason?.type === "other" &&
    decisionReason.bashMissKind !== undefined &&
    STRUCTURAL_MISS_KINDS[decisionReason.bashMissKind]
    ? decisionReason.bashMissKind
    : undefined;
}
//@ chunk-e6aww6q8.js:1223712-1223955 layout
/**
 * 开启"禁止读工作目录外"且沙箱不能兜底时，把结构性 ask 改成读封锁拒绝。
 */
function applyReadBlockToStructuralAsk(decision, input, toolPermissionContext) {
  if (decision.behavior !== "ask") return decision;
  let decisionReason = decision.decisionReason;
  if (
    decisionReason?.type !== "other" ||
    decisionReason.bashMissKind === undefined ||
    !STRUCTURAL_MISS_KINDS[decisionReason.bashMissKind]
  )
    return decision;
  if (
    toolPermissionContext.blockReadsOutsideWorkingDirectories === true &&
    !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(toolPermissionContext))
  )
    return outsideReadsTooComplexAsk(decisionReason.reason);
  return decision;
}
//@ chunk-e6aww6q8.js:1223955-1224531 layout = checkSemanticsDeny (0.828)
/**
 * 对已得出的 ask 结果，再用整条命令、各片段、子命令理由键逐一查 deny/ask 规则：命中 deny 改为拒绝，命中 ask 记到 matchedAskRule。
 */
function applyAskDenyRulesToAskResult(askResult, bashInput, permissionContext) {
  if (askResult.behavior !== "ask" || carriesAskRuleIntent(askResult)) return askResult;
  if (
    getContentRulesMapForTool(permissionContext, BashTool, "ask").size === 0 &&
    getContentRulesMapForTool(permissionContext, BashTool, "deny").size === 0
  )
    return askResult;
  let candidateCommands = new Set([
    bashInput.command,
    ...splitCommand(bashInput.command),
    ...(askResult.decisionReason?.type === "subcommandResults"
      ? askResult.decisionReason.reasons.keys()
      : []),
    ...nestedCommandSpans(bashInput.command),
  ]);
  let matchedAskRule;
  for (let cmd of candidateCommands) {
    let { matchingDenyRules, matchingAskRules } = matchingRulesForInput(
      {
        ...bashInput,
        command: cmd,
      },
      permissionContext,
      "prefix",
    );
    if (matchingDenyRules[0] !== undefined)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${bashInput.command} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: matchingDenyRules[0],
        },
      };
    matchedAskRule ??= matchingAskRules[0];
  }
  return matchedAskRule === undefined
    ? askResult
    : {
        ...askResult,
        matchedAskRule,
      };
}
//@ chunk-e6aww6q8.js:1224531-1224768 layout
/**
 * Bash 权限检查的两遍执行：先正常跑 checkBashPermissionWithSandbox，若触发了二次检查条件，再在 R0e 上下文里重跑，第二遍为 deny 时以它为准，异常时保留第一遍结果。BashTool 与 Monitor 工具调用。
 */
async function bashToolHasPermissionTwoPass(input, permissionContext, astNode, toolUseContext) {
  let check = () => checkBashPermissionWithSandbox(input, permissionContext, astNode, toolUseContext);
  let { result: firstPassResult, fired } = await runGuarded(false, check);
  if (!fired || firstPassResult.behavior === "deny") return firstPassResult;
  try {
    let { result: secondPassResult } = await runGuarded(true, () => runWithoutTelemetry(check));
    return secondPassResult.behavior === "deny" ? secondPassResult : firstPassResult;
  } catch (error) {
    if (isAbortError(error)) throw error;
    logError(error);
    return firstPassResult;
  }
}
//@ chunk-e6aww6q8.js:1224768-1225707 layout
/**
 * 合并 Bash 权限的几路结论：常规规则检查、读法检查、沙箱覆盖检查；dangerouslyDisableSandbox 且原本可沙箱运行时按严格模式改成 too-complex ask；ask 结论标记 standsInUnderHookAsk 供 hook 处理。
 */
async function checkBashPermissionWithSandbox(input, permissionContext, astNode, toolUseContext) {
  let safetyCheck = () => runCommandSafetyCheck(input, permissionContext, astNode, toolUseContext);
  let [firstResult, reason] = await runWithReadingRefusals(safetyCheck);
  let context = firstResult;
  if (reason !== undefined && firstResult.behavior !== "deny") {
    let readsResult = await runWithoutTelemetry(() => runAsBashReads(safetyCheck));
    context = combineWithTooComplex(context, readsResult, reason);
    let context_2 = await runWithoutTelemetry(() => runWithRuleOff(safetyCheck));
    context = combineWithTooComplex(context, context_2, reason);
    if (
      input.dangerouslyDisableSandbox &&
      !shouldUseSandbox(input) &&
      shouldUseSandbox({
        ...input,
        dangerouslyDisableSandbox: false,
      })
    ) {
      if (isPassthroughOrPlainAsk(context_2) && context.behavior !== "deny" && sandboxOverrideAskGuardsOn())
        context = buildTooComplexAsk(reason);
    } else if (isPassthroughOrPlainAsk(context))
      context =
        askClassifierForAllowedDomains(BashTool, input, permissionContext, {
          behavior: "passthrough",
          message: "",
        }) ?? context;
    if (
      context.behavior === "ask" &&
      (context_2.behavior === "allow" ||
        context_2.behavior === "passthrough" ||
        (context_2.behavior === "ask" &&
          !carriesAskRuleIntent(context_2) &&
          findSafetyCheckReason(context_2.decisionReason) === undefined &&
          context_2.decisionReason?.type !== "sandboxOverride"))
    )
      context = {
        ...context,
        standsInUnderHookAsk: true,
      };
  }
  if (context.behavior === "ask" && isPlainAsk(context)) {
    let classifierAsk = askClassifierForAllowedDomains(BashTool, input, permissionContext, {
      behavior: "passthrough",
      message: "",
    });
    if (classifierAsk !== undefined) {
      let astRoot = (await parseCommandRaw(input.command)) ?? PARSE_ABORTED;
      let parsed = parseForSecurityFromAst(input.command, astRoot);
      if (parsed.kind === "too-complex" && parsed.keepsRemovalVerdict) context = classifierAsk;
    }
  }
  if (isDangerousRmEnabled()) {
    let safetyCheckReason = findSafetyCheckReason(
      context.decisionReason,
      (reason) => reason.circuitBreaker === "dangerousRemoval",
    );
    let removalKind =
      safetyCheckReason === undefined ? undefined : classifyRemovalReason(safetyCheckReason.reason);
    if (removalKind !== undefined) logDangerousRmShape(removalKind);
  }
  return context;
}
//@ chunk-e6aww6q8.js:1225707-1225784 layout = validateShellMetacharacters (1)
/**
 * 结果是 passthrough 或普通 ask（可被其他读法覆盖）。
 */
function isPassthroughOrPlainAsk(context) {
  return context.behavior === "passthrough" || (context.behavior === "ask" && isPlainAsk(context));
}
//@ chunk-e6aww6q8.js:1225784-1225995 layout
/**
 * 合并规则结果与安全检查结果：deny 优先；安全 ask 去掉建议；规则 allow 而安全检查不 allow 时改为需确认。
 */
function combineWithTooComplex(first, second, reason) {
  if (first.behavior === "deny") return first;
  if (second.behavior === "deny") return second;
  if (second.behavior === "ask" && !isPlainAsk(second))
    return {
      ...second,
      suggestions: [],
    };
  if (first.behavior === "allow" && second.behavior !== "allow") return buildTooComplexAsk(reason);
  return first;
}
//@ chunk-e6aww6q8.js:1225995-1226145 layout
/**
 * 生成 bashMissKind="too-complex" 的 ask 权限结论（无建议规则）。
 */
function buildTooComplexAsk(reason) {
  let decisionReason = {
    type: "other",
    reason,
    bashMissKind: "too-complex",
  };
  return {
    behavior: "ask",
    decisionReason,
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    suggestions: [],
  };
}
//@ chunk-e6aww6q8.js:1226145-1226675 fingerprint = checkCommandAndSuggestRules (0.671)
/**
 * 两遍运行注入/安全检查（正常模式和 refused 模式），取更严格的结果；refused 才有的 ask 在可安全降级时转为 passthrough。
 */
async function runCommandSafetyCheck(input, permissionContext, astNode, toolUseContext) {
  let { result: firstResult, refused } = await runWithRefusedReading(false, () =>
    bashCommandIsSafeAsync(input, permissionContext, astNode, toolUseContext),
  );
  if (!refused || firstResult.behavior === "deny") return firstResult;
  let { result: secondResult } = await runWithRefusedReading(true, () =>
    runWithoutTelemetry(() => bashCommandIsSafeAsync(input, permissionContext, astNode, toolUseContext)),
  );
  if (secondResult.behavior === "deny" || (secondResult.behavior === "ask" && !isPlainAsk(secondResult)))
    return secondResult;
  if (firstResult.behavior === "ask" && secondResult.behavior !== "ask")
    return isPlainAsk(firstResult)
      ? {
          behavior: "passthrough",
          message: firstResult.message,
          ...(firstResult.decisionReason !== undefined && {
            decisionReason: firstResult.decisionReason,
          }),
          ...(firstResult.suggestions !== undefined && {
            suggestions: firstResult.suggestions,
          }),
          ...(firstResult.blockedPath !== undefined && {
            blockedPath: firstResult.blockedPath,
          }),
        }
      : firstResult;
  return getDecisionSeverity(secondResult) > getDecisionSeverity(firstResult) ? secondResult : firstResult;
}
//@ chunk-e6aww6q8.js:1227686-1227822 placement
/**
 * 判断当前是否为绕过权限模式（或计划模式下可绕过且非远程执行）。
 */
function isBypassModeForBash(input) {
  let { mode, isBypassPermissionsModeAvailable } = getToolPermissionContext(input);
  return (
    mode === "bypassPermissions" ||
    (isPlanBypass(mode, isBypassPermissionsModeAvailable) && input.forRemoteExecution !== true)
  );
}
//@ chunk-e6aww6q8.js:1227822-1227984 placement
function buildPendingClassifierCheck(command, toolPermissionContext) {
  let allowDescriptions = getToolPermissionContext(toolPermissionContext);
  return (
    command.behavior === "ask" &&
    !carriesAskRuleIntent(command) &&
    findSafetyCheckReason(command.decisionReason, isAutoModeDenyCircuitBreaker) !== undefined &&
    (isAutoModePermissionSurface(allowDescriptions) ||
      (allowDescriptions.mode === "bypassPermissions" && !isRemovalWaiverActive(allowDescriptions))) &&
    getDangerousRmTimeoutConfig().enabled
  );
}
//@ chunk-e6aww6q8.js:1227984-1229250 placement
/**
 * 带声明前缀推断地执行 Bash 权限检查：对 declare/export 等可能的读法分别再检查并合并；命令含 $ 且使用了本命令内赋值的变量时，不允许直接 allow（转为 passthrough 并去掉建议）。
 */
async function checkBashWithDeclarations(input, context, getCommandSubcommandPrefix, finalizeResult) {
  let declarations = {};
  let clampResult = await checkBashCommandClamp(
    input,
    context,
    getCommandSubcommandPrefix,
    undefined,
    undefined,
    undefined,
    (names, operands, fromUncertainWrite) => {
      declarations.names = names;
      declarations.operands = operands;
      declarations.fromUncertainWrite = fromUncertainWrite;
    },
  );
  let result = finalizeResult?.(clampResult) ?? clampResult;
  let prefixes = [undefined];
  if (declarations.names !== undefined) {
    let { readings, exhaustive } = declarationPrefixReadings(declarations.names, declarations.operands);
    prefixes.push(...readings);
    let readingResults = [];
    for (let reading of readings) {
      let readingResult = await runWithoutTelemetry(() =>
        checkBashCommandClamp(input, context, getCommandSubcommandPrefix, undefined, undefined, reading),
      );
      readingResults.push(finalizeResult?.(readingResult) ?? readingResult);
    }
    let combined = applyReadBlockToStructuralAsk(
      combineDeclarationReadings(
        result,
        readingResults,
        exhaustive,
        declarations.fromUncertainWrite === true,
      ),
      input,
      getToolPermissionContext(context),
    );
    if (combined === result || combined.behavior !== "ask" || !isPlainAsk(combined)) result = combined;
    else if (result.behavior !== "passthrough")
      result = {
        behavior: "passthrough",
        message: combined.message,
        ...(combined.decisionReason !== undefined && {
          decisionReason: combined.decisionReason,
        }),
      };
  }
  if (
    result.behavior !== "deny" &&
    input.command.includes("$") &&
    !(
      result.decisionReason?.type === "other" && result.decisionReason.reason === SANDBOX_AUTO_ALLOW_REASON
    ) &&
    !(
      result.decisionReason?.type === "rule" &&
      result.decisionReason.rule.ruleValue.ruleContent === input.command.trim()
    )
  ) {
    let astRoot = (await parseCommandRaw(input.command)) ?? PARSE_ABORTED;
    let mapped = prefixes.map((declarationPrefix) =>
      parseForSecurityFromAst(input.command, astRoot, {
        declarationPrefix,
      }),
    );
    let any = mapped.some((parsed) => parsed.kind === "simple" && parsed.usesAssignedValue === true);
    if (result.behavior !== "allow") {
      if (any)
        result = {
          ...result,
          suggestions: [],
        };
    } else if (any || mapped.some((parsed) => parsed.kind !== "simple")) {
      let decisionReason = {
        type: "other",
        reason: "A variable set in this command can't be checked before it runs",
        bashMissKind: "assigned-variable",
      };
      let assignedVariableResult = {
        behavior: "passthrough",
        decisionReason,
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
        suggestions: [],
      };
      result = finalizeResult?.(assignedVariableResult) ?? assignedVariableResult;
    }
  }
  return result;
}
//@ chunk-e6aww6q8.js:1229250-1231407 placement
/**
 * 当代理的 Bash 使用被限定为固定命令集时，拒绝超出范围的命令。
 */
async function checkBashCommandClamp(
  toolInput,
  toolUseContext,
  getCommandSubcommandPrefix,
  originalCommand,
  recursionState,
  declarationPrefix,
  onDeclarationPrefixes,
  divergentShapes,
) {
  let bashCommandClamps = getToolPermissionContext(toolUseContext).bashCommandClamps;
  if (bashCommandClamps !== undefined && bashCommandClamps.length > 0) {
    let spanNotCoveredByRuleGroups = await findSpanNotCoveredByRuleGroups(toolInput, bashCommandClamps);
    if (spanNotCoveredByRuleGroups !== null) {
      logEventUnlessSuppressed("tengu_bash_command_clamp_denied", {
        groupCount: bashCommandClamps.length,
      });
      return {
        behavior: "deny",
        message:
          `Permission to use ${BashTool.name} with command ${toolInput.command.trim()} has been denied: this agent's Bash use is clamped to a fixed set of command forms (per-spawn bashCommandClamp), and ` +
          (spanNotCoveredByRuleGroups.kind === "unverifiable"
            ? "the command has structure the clamp cannot verify " +
              "(substitution, control flow, or an undecomposable compound) \u2014 " +
              "no clamp rule can admit it. Issue plain commands matching the clamped forms."
            : `the span ${jsonStringify(spanNotCoveredByRuleGroups.span)} matches none of them. Allowed forms: ${spanNotCoveredByRuleGroups.group.join(", ")}`),
        decisionReason: {
          type: "other",
          reason: BASH_COMMAND_CLAMP_DENY_REASON,
        },
      };
    }
  }
  let passState = {
    laterPassesDiffer: false,
  };
  let checkResult = applyReadBlockToStructuralAsk(
    await runWithDivergentShapes(divergentShapes === "read", () =>
      bashToolHasPermission(
        toolInput,
        toolUseContext,
        getCommandSubcommandPrefix,
        originalCommand,
        recursionState,
        declarationPrefix,
        onDeclarationPrefixes,
        divergentShapes,
        () => {
          passState.laterPassesDiffer = true;
        },
      ),
    ),
    toolInput,
    getToolPermissionContext(toolUseContext),
  );
  let askResult = checkResult;
  if (
    passState.laterPassesDiffer &&
    originalCommand === undefined &&
    (checkResult.behavior === "allow" || checkResult.behavior === "passthrough" || isPlainAsk(checkResult))
  ) {
    let decisionReason = {
      type: "other",
      reason:
        "Only the first pass of a loop in this command could be checked, and its later passes may run something else",
      bashMissKind: "loop-later-pass",
    };
    let message = createPermissionRequestMessage(BashTool.name, decisionReason);
    let laterPassAsk = applyReadBlockToStructuralAsk(
      {
        behavior: "ask",
        message,
        decisionReason,
      },
      toolInput,
      getToolPermissionContext(toolUseContext),
    );
    let exactMatchResult = bashToolCheckExactMatchPermission(
      toolInput,
      getToolPermissionContext(toolUseContext),
    );
    let isExactAllowed =
      checkResult.behavior === "allow" &&
      exactMatchResult.behavior === "allow" &&
      exactMatchResult.decisionReason?.type === "rule" &&
      exactMatchResult.decisionReason.rule.ruleValue.ruleContent === toolInput.command.trim();
    if (!isPlainAsk(laterPassAsk) && (isExactAllowed || !scriptAsksToRunUnsandboxed(BashTool, toolInput)))
      askResult = laterPassAsk;
    else if (checkResult.behavior === "allow" && !isExactAllowed)
      askResult = {
        behavior: "passthrough",
        message,
        decisionReason,
      };
  }
  if (
    passState.laterPassesDiffer &&
    originalCommand === undefined &&
    (askResult.behavior === "ask" || askResult.behavior === "passthrough")
  )
    askResult = {
      ...askResult,
      suggestions: [],
    };
  if (checkResult.behavior !== "allow" || askResult.behavior === "ask")
    return applyAskDenyRulesToAskResult(askResult, toolInput, getToolPermissionContext(toolUseContext));
  if (
    !toolInput.command.includes("&") ||
    (checkResult.decisionReason?.type === "other" &&
      checkResult.decisionReason.reason === SANDBOX_AUTO_ALLOW_REASON)
  )
    return askResult;
  let node = await parseCommandRaw(toolInput.command);
  if (node && node !== PARSE_ABORTED && !hasErrorOrBackgroundNode(node)) return askResult;
  let decisionReason = {
    type: "safetyCheck",
    reason:
      "This command uses the `&` background operator, which defers execution past approval-time safety checks. Approve only if you trust it.",
    classifierApprovable: false,
    circuitBreaker: "backgroundOperator",
  };
  return applyAskDenyRulesToAskResult(
    {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
    },
    toolInput,
    getToolPermissionContext(toolUseContext),
  );
}
//@ chunk-e6aww6q8.js:1231663-1231802 affinity
var GIT_AFTER_CD_READ_BLOCK_REASON =
  "git after a directory change, or after writes to files git reads (HEAD, config, hooks), cannot be checked against the read block";
//@ chunk-e6aww6q8.js:1231802-1243231 fingerprint = bashToolHasPermission (0.438)
/**
 * Bash 权限检查主入口：tree-sitter 解析 → 语义检查 → too-complex/语义失败的专用路径 → 沙箱自动允许 → 精确规则 → 管道/操作符分段 → cd 处理（多个 cd、cd+git、git 内部文件）→ 每个子命令 bashToolCheckPermission → 路径约束 → 安全检查 → 汇总为 allow/ask/deny/passthrough 并合并最多 aDo 条建议规则（写 localSettings）。
 */
async function bashToolHasPermission(
  input,
  toolUseContext,
  getCommandSubcommandPrefix,
  originalCommand,
  recursionState,
  declarationPrefix,
  onDeclarationPrefixes,
  divergentShapes,
  onLaterLoopPassesDiffer,
) {
  let permissionContext = getToolPermissionContext(toolUseContext);
  let recursionCtx = {
    input,
    context: toolUseContext,
    depth: recursionState?.depth ?? 0,
    divergentShapes,
    declarationPrefix,
    budget: recursionState?.budget ?? {
      left: FALLBACK_RULE_LEFT_CHARS,
      chars: FALLBACK_RULE_TOTAL_CHARS,
      judged: new Map(),
      asked: new Map(),
      command: originalCommand ?? input.command,
    },
  };
  setLastCheckedSessionEnvVarKeys(sessionEnvVarNameSet(toolUseContext));
  let parsedRoot = await parseCommandRaw(input.command);
  let astAnalysis = parsedRoot
    ? parseForSecurityFromAst(input.command, parsedRoot, {
        declarationPrefix,
        readsDivergentShapes: divergentShapes === "read",
      })
    : {
        kind: "simple",
        commands: [],
        bareAssignmentNames: [],
      };
  if (astAnalysis.kind === "simple" && astAnalysis.laterLoopPassesDiffer) onLaterLoopPassesDiffer?.();
  let semanticsResult =
    astAnalysis.kind === "simple"
      ? checkSemantics(astAnalysis.commands, {
          sourceGlobRecord: isSourceGlobRecordingEnabled(),
          hasLoop: astAnalysis.hasLoop,
        })
      : null;
  if (
    divergentShapes === undefined &&
    (astAnalysis.kind === "too-complex" ? astAnalysis.divergentShape === true : semanticsResult?.ok === false)
  ) {
    let readPassResult = await checkBashCommandClamp(
      input,
      toolUseContext,
      getCommandSubcommandPrefix,
      originalCommand,
      recursionState,
      declarationPrefix,
      onDeclarationPrefixes,
      "read",
    );
    let refusedPassResult = await runWithoutTelemetry(() =>
      checkBashCommandClamp(
        input,
        toolUseContext,
        getCommandSubcommandPrefix,
        originalCommand,
        recursionState,
        declarationPrefix,
        undefined,
        "refused",
      ),
    );
    let severityDelta =
      (getDecisionSeverity(readPassResult) === 4 && isBypassModeForBash(toolUseContext)
        ? 3
        : getDecisionSeverity(readPassResult)) - getDecisionSeverity(refusedPassResult);
    let keepsRemovalVerdict = astAnalysis.kind === "too-complex" && astAnalysis.keepsRemovalVerdict === true;
    if (
      keepsRemovalVerdict &&
      readPassResult.behavior === "ask" &&
      refusedPassResult.behavior === "ask" &&
      isOutsideReadsBlockedAsk(refusedPassResult.decisionReason)
    ) {
      let safetyCheckReason = findSafetyCheckReason(
        readPassResult.decisionReason,
        (reason) => reason.circuitBreaker === "dangerousRemoval",
      );
      if (safetyCheckReason !== undefined)
        return {
          ...readPassResult,
          message: `${readPassResult.message} ${refusedPassResult.message}`,
          decisionReason: {
            type: "subcommandResults",
            typeOnWire: "safetyCheck",
            reasons: new Map([
              [
                `${input.command} (as refused)`,
                {
                  ...refusedPassResult,
                  decisionReason: {
                    ...refusedPassResult.decisionReason,
                    reason: `${safetyCheckReason.reason}; ${refusedPassResult.decisionReason.reason}`,
                  },
                },
              ],
              [input.command, readPassResult],
            ]),
          },
          suggestions: [],
        };
    }
    let chosenResult =
      severityDelta > 0 ||
      (severityDelta === 0 && getSafetyCheckRank(readPassResult) > getSafetyCheckRank(refusedPassResult))
        ? readPassResult
        : refusedPassResult;
    let clearedResult = {
      ...chosenResult,
      matchedAskRule: undefined,
    };
    return keepsRemovalVerdict &&
      recursionState !== undefined &&
      buildPendingClassifierCheck(clearedResult, toolUseContext)
      ? clearedResult
      : chosenResult;
  }
  let isHeredocSandboxEligible =
    toolUseContext.forRemoteExecution !== true &&
    astAnalysis.kind === "too-complex" &&
    ((astAnalysis.nodeType === "heredoc_redirect" && astAnalysis.differential === true) ||
      (astAnalysis.nodeType === "pipeline" && astAnalysis.afterHeredocDelimiter === true)) &&
    SandboxManager.isSandboxingEnabled() &&
    SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
    shouldUseSandbox(input) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_larch", true);
  if (onDeclarationPrefixes !== undefined) {
    let plainUnquotedAnalysis =
      astAnalysis.declarationPrefixes === undefined && parsedRoot && isHeredocSandboxEligible
        ? parseForSecurityFromAst(input.command, parsedRoot, {
            plainUnquotedHeredocs: true,
          })
        : undefined;
    let declarationSource =
      astAnalysis.declarationPrefixes === undefined ? plainUnquotedAnalysis : astAnalysis;
    if (declarationSource?.declarationPrefixes !== undefined)
      onDeclarationPrefixes(
        declarationSource.declarationPrefixes,
        declarationSource.declarationPrefixBashKeeps,
        astAnalysis.uncertainWrite === true,
      );
  }
  if (astAnalysis.kind === "too-complex") {
    let denyResult = await checkTooComplexCommandDeny(
      input,
      permissionContext,
      parsedRoot,
      () =>
        permissionContext.blockReadsOutsideWorkingDirectories === true &&
        !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
          ? outsideReadsTooComplexAsk(astAnalysis.reason)
          : undefined,
      originalCommand,
      toolUseContext.forRemoteExecution === true,
      recursionCtx,
      toolUseContext,
    );
    if (denyResult !== null) return denyResult;
    let sandboxAutoAllow =
      toolUseContext.forRemoteExecution === true
        ? null
        : checkSandboxAutoAllow(input, permissionContext, astAnalysis.nodeType);
    if (sandboxAutoAllow !== null) return sandboxAutoAllow;
    if (parsedRoot && isHeredocSandboxEligible) {
      let plainAnalysis = parseForSecurityFromAst(input.command, parsedRoot, {
        plainUnquotedHeredocs: true,
        declarationPrefix,
      });
      if (plainAnalysis.kind === "simple" && plainAnalysis.laterLoopPassesDiffer) onLaterLoopPassesDiffer?.();
      let autoAllowResult =
        plainAnalysis.kind === "simple" &&
        checkSemantics(plainAnalysis.commands, {
          sourceGlobRecord: isSourceGlobRecordingEnabled(),
          hasLoop: plainAnalysis.hasLoop,
        }).ok
          ? checkSandboxAutoAllowForAst(
              input,
              permissionContext,
              plainAnalysis.commands,
              plainAnalysis.bareAssignmentNames,
              toolUseContext,
            )
          : null;
      if (autoAllowResult !== null) return autoAllowResult;
    }
    logEventUnlessSuppressed("tengu_bash_ast_too_complex", {
      nodeTypeId: nodeTypeId(astAnalysis.nodeType),
    });
    if (
      parsedRoot !== null &&
      parsedRoot !== PARSE_ABORTED &&
      parsedRoot.type === "ERROR" &&
      originalCommand === undefined
    )
      return dangerousRemovalAsk(
        "rm",
        "This command could not be checked for dangerous rm operations: the shell may read it differently than it was parsed. This requires explicit approval.",
        "not ruled out \u2014 the shell may read this command differently than it was parsed",
      );
    let decisionReason = {
      type: "other",
      reason: astAnalysis.reason,
      bashMissKind: "too-complex",
    };
    return {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
      suggestions: [],
    };
  }
  let commands = astAnalysis.commands;
  let getCompoundCdTimedDeny = (permissionContext) =>
    hasBashDenyRule(permissionContext) &&
    ((hasNoBashDenyRules(permissionContext) &&
      !cdMayChangeReadScope(commands, getCwd(), permissionContext, toolUseContext)) ||
      (toolUseContext.forRemoteExecution !== true &&
        astAnalysis.bareAssignmentNames.length === 0 &&
        astAnalysis.hasLoop === false &&
        isAutoDenyTimedDialogEnabled() &&
        isReadOnlyAfterCd(commands, getCwd(), permissionContext, toolUseContext)));
  if (
    permissionContext.blockReadsOutsideWorkingDirectories === true &&
    commands.some(
      (command, cmdIdx) =>
        readsCodeFromStdin(command.argv) &&
        (/<<</.test(input.command) ||
          /<<(?!<)/.test(input.command) ||
          (cmdIdx > 0 && input.command.includes("|"))),
    ) &&
    !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
  )
    return outsideReadsTooComplexAsk("code on stdin cannot be checked against the read block");
  if (semanticsResult !== null && !semanticsResult.ok && divergentShapes !== "read") {
    let earlyExit = checkSemanticsDeny(input, permissionContext, commands);
    if (earlyExit?.behavior === "deny") return earlyExit;
    if (semanticsResult.kind === "newline-hash" && toolUseContext.forRemoteExecution !== true) {
      let autoAllowResult = checkSandboxAutoAllowForAst(
        input,
        permissionContext,
        commands,
        astAnalysis.bareAssignmentNames,
        toolUseContext,
      );
      if (autoAllowResult) return autoAllowResult;
    }
    if (
      permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
    )
      return outsideReadsTooComplexAsk(semanticsResult.reason);
    let dangerousVariableRemoval = findDangerousVariableRemoval(
      input.command,
      true,
      originalCommand,
      toolUseContext.forRemoteExecution === true,
      toolUseContext,
    );
    if (dangerousVariableRemoval !== null) return checkDangerousRemoval(dangerousVariableRemoval, false);
    let inlineRemoval = await checkInlineShellRemoval(input.command, recursionCtx, [], commands);
    if (inlineRemoval !== null) return inlineRemoval;
    if (earlyExit !== null) return earlyExit;
    let decisionReason = {
      type: "other",
      reason: semanticsResult.reason,
      bashMissKind: "semantics",
    };
    return {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
      suggestions: [],
    };
  }
  let rawSubcommands = commands.map((command) => command.text);
  let flattened = commands.flatMap((command) => command.redirects);
  let sandboxAstAllowResult =
    toolUseContext.forRemoteExecution === true
      ? null
      : checkSandboxAutoAllowForAst(
          input,
          permissionContext,
          commands,
          astAnalysis.bareAssignmentNames,
          toolUseContext,
        );
  if (
    sandboxAstAllowResult &&
    (divergentShapes !== "read" ||
      sandboxAstAllowResult.behavior === "deny" ||
      (semanticsResult?.ok === false && semanticsResult.kind === "newline-hash"))
  )
    return sandboxAstAllowResult;
  let exactMatchResult = bashToolCheckExactMatchPermission(input, permissionContext);
  if (exactMatchResult.behavior === "deny") return exactMatchResult;
  let readBlockAsk = () =>
    permissionContext.blockReadsOutsideWorkingDirectories === true &&
    !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
      ? outsideReadsTooComplexAsk(GIT_AFTER_CD_READ_BLOCK_REASON)
      : undefined;
  let operatorResult = await checkCommandOperatorPermissions(
    input,
    (subcommandInput) =>
      checkBashCommandClamp(
        subcommandInput,
        toolUseContext,
        getCommandSubcommandPrefix,
        originalCommand ?? input.command,
        recursionCtx,
        declarationPrefix,
        undefined,
        divergentShapes,
      ),
    {
      isNormalizedCdCommand,
      isNormalizedGitCommand,
    },
    parsedRoot,
    commands,
    (text) => isCdTextToCurrentDir(text, getCwd()),
    readBlockAsk,
  );
  if (operatorResult.behavior !== "passthrough") {
    let isShellOperatorAsk =
      operatorResult.behavior === "ask" &&
      operatorResult.decisionReason?.type === "other" &&
      operatorResult.decisionReason.bashMissKind === "shell-operators";
    if (isShellOperatorAsk) {
      if (
        permissionContext.blockReadsOutsideWorkingDirectories === true &&
        !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
      )
        return outsideReadsTooComplexAsk("a subshell cannot be checked against the read block");
      if (parsedRoot && parsedRoot !== PARSE_ABORTED) {
        let removalResult = await checkDangerousRemovals(
          parsedRoot,
          getCwd(),
          permissionContext,
          originalCommand,
          toolUseContext.forRemoteExecution === true,
          recursionCtx,
          toolUseContext,
        );
        if (removalResult !== null) {
          logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
            kind: fromEnum(removalResult.kind),
          });
          return removalResult.result;
        }
      }
    }
    permissionContext = getToolPermissionContext(toolUseContext);
    let pathResult = checkPathConstraints(
      input,
      getCwd(),
      permissionContext,
      commandHasAnyCd(input.command),
      flattened,
      commands,
      getCompoundCdTimedDeny(permissionContext),
    );
    if (
      (pathResult.behavior === "deny" ||
        ((!isShellOperatorAsk || divergentShapes === "read") &&
          pathResult.behavior === "ask" &&
          !pathResult.bashAllowRuleOverridable)) &&
      getDecisionSeverity(pathResult) > getDecisionSeverity(operatorResult)
    )
      return pathResult;
    return operatorResult;
  }
  let cwd = getCwd();
  let cwdMingw = getPlatform() === "windows" ? windowsPathToPosixPath(cwd) : cwd;
  let { subcommands, astCommandsByIdx } = filterCdCwdSubcommands(rawSubcommands, commands, cwd, cwdMingw);
  let cdCommands = subcommands.filter((subCommand) => isNormalizedCdCommand(subCommand));
  if (cdCommands.length > 1) {
    let cdResult = checkCdCommand(commands, cwd, permissionContext);
    if (cdResult) return cdResult;
    if (
      permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
    )
      return outsideReadsTooComplexAsk("multiple directory changes cannot be checked against the read block");
    let mapped = uniq(
      [cwd, ...allWorkingDirectories(getToolPermissionContext(toolUseContext))]
        .flatMap((dir) => {
          let { resolvedPath } = safeResolvePath(getFsImplementation(), dir);
          return resolvedPath === dir ? [dir] : [dir, resolvedPath];
        })
        .map((dir) => normalize(dir)),
    ).map((dir) => ({
      exact: normalizeCaseForComparison(dir),
      prefix: normalizeCaseForComparison(/[\\/]$/.test(dir) ? dir : dir + sep),
    }));
    let isInsideWorkingDir = (path) => {
      let normalized = normalizeCaseForComparison(normalize(path));
      return mapped.some(
        (workingDir) => normalized === workingDir.exact || normalized.startsWith(workingDir.prefix),
      );
    };
    let isSimpleCdOnly = !/[;|\n&(`!]/.test(input.command.replace(/&&/g, ""));
    let { resolvedPath } = safeResolvePath(getFsImplementation(), cwd);
    let currentDirs = uniq([normalize(cwd), normalize(resolvedPath)]);
    let pushdStack = [];
    let inlineRemoval = await checkInlineShellRemoval(input.command, recursionCtx, [], commands);
    if (inlineRemoval !== null) return inlineRemoval;
    for (let command of commands) {
      let [baseName, ...args] = stripWrappersFromArgvForPaths(command.argv);
      let replaced = baseName?.replace(/^.*[\\/]/, "");
      if (replaced === "cd" || replaced === "chdir" || replaced === "pushd" || replaced === "popd") {
        isSimpleCdOnly &&= command.argv[0] === replaced && command.envVars.length === 0;
        if (replaced === "popd") {
          if (args.length === 0 && pushdStack.length > 0) currentDirs = pushdStack.pop();
          else isSimpleCdOnly = false;
        } else {
          let operands = args[0] === "--" ? args.slice(1) : args;
          let target = operands.length === 1 ? operands[0] : undefined;
          let isTargetAllowed = false;
          let resolvedDirs = [];
          if (
            target !== undefined &&
            !/^[-+]/.test(target) &&
            !target.startsWith("~") &&
            !/[*?[]/.test(target) &&
            !containsAnyPlaceholder(target) &&
            !/(^|[\\/])\.\.([\\/]|$)/.test(target)
          ) {
            isTargetAllowed = true;
            for (let baseDir of currentDirs) {
              let dirPath = isAbsolute(target) ? normalize(target) : resolve_2(baseDir, target);
              let { resolvedPath } = safeResolvePath(getFsImplementation(), dirPath);
              if (!isInsideWorkingDir(dirPath) || !isInsideWorkingDir(resolvedPath)) {
                isTargetAllowed = false;
                break;
              }
              resolvedDirs.push(normalize(dirPath), normalize(resolvedPath));
            }
          }
          isSimpleCdOnly &&= isTargetAllowed;
          if (isTargetAllowed) {
            if (replaced === "pushd") pushdStack.push(currentDirs);
            currentDirs = uniq(resolvedDirs);
          }
        }
        continue;
      }
      if (replaced !== "rm" && replaced !== "rmdir") continue;
      let removalResult = checkDangerousRemovalPaths(
        replaced,
        args,
        cwd,
        getToolPermissionContext(toolUseContext),
        !isSimpleCdOnly,
      );
      if (removalResult.behavior !== "passthrough") return removalResult;
    }
    let decisionReason = {
      type: "other",
      reason: "Multiple directory changes in one command require approval for clarity",
      bashMissKind: "multi-cd",
    };
    return {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
    };
  }
  let hasCd = cdCommands.length > 0;
  let effectiveCwd = cwd;
  let compoundCommandHasCd = hasCd;
  let skippedLeadingCd = false;
  if (
    toolUseContext.forRemoteExecution !== true &&
    hasCd &&
    subcommands.length > 1 &&
    subcommands.length === rawSubcommands.length &&
    isNormalizedCdCommand(subcommands[0]) &&
    isSimpleAndChain(input.command) &&
    input.command.trimStart().startsWith(subcommands[0]) &&
    /^[ \t]*&&/.test(input.command.trimStart().slice(subcommands[0].length))
  ) {
    let simpleCdTarget = resolveSimpleCdTarget(astCommandsByIdx[0], cwd, permissionContext);
    if (simpleCdTarget !== null) {
      effectiveCwd = simpleCdTarget;
      compoundCommandHasCd = false;
      skippedLeadingCd = true;
    }
  }
  if (compoundCommandHasCd || (hasCd && divergentShapes === "read")) {
    let cdResult = checkCdCommand(commands, cwd, permissionContext);
    if (cdResult) return cdResult;
  }
  let cdGitAskResult;
  if (hasCd) {
    if (
      subcommands.some((subcommand) => isNormalizedGitCommand(subcommand.trim())) &&
      !(await isCdToCurrentDir(astCommandsByIdx, subcommands, cwd))
    ) {
      let decisionReason = {
        type: "other",
        reason:
          "This command changes directory before running a version-control command, which can pick up untrusted hooks or repository configuration from the target directory. Approve only if you trust it.",
        bashMissKind: "cd-git-compound",
      };
      cdGitAskResult = {
        behavior: "ask",
        decisionReason,
        message: createPermissionRequestMessage(BashTool.name, decisionReason),
      };
    }
  }
  let gitStructureAskResult;
  if (
    subcommands.some((cmd) => isNormalizedGitCommand(cmd.trim())) &&
    (extractWriteTargets(astCommandsByIdx, effectiveCwd) || commandWritesToGitInternalPaths(input.command))
  ) {
    let decisionReason = {
      type: "other",
      reason:
        "This command creates git repository structure files (HEAD/objects/refs/hooks) and then runs git, which can execute hooks/fsmonitor from the created files.",
      bashMissKind: "cd-git-compound",
    };
    gitStructureAskResult = {
      behavior: "ask",
      decisionReason,
      message: createPermissionRequestMessage(BashTool.name, decisionReason),
    };
  }
  permissionContext = getToolPermissionContext(toolUseContext);
  let subcommandPermissionDecisions = subcommands.map((command, i) =>
    bashToolCheckPermission(
      {
        command,
      },
      permissionContext,
      compoundCommandHasCd,
      astCommandsByIdx[i],
      skippedLeadingCd && i === 0 ? cwd : effectiveCwd,
      astAnalysis.bareAssignmentNames,
      getCompoundCdTimedDeny(permissionContext),
      toolUseContext,
    ),
  );
  if (
    subcommandPermissionDecisions.find(
      (subcommandPermissionDecision) => subcommandPermissionDecision.behavior === "deny",
    ) !== undefined
  )
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: {
        type: "subcommandResults",
        reasons: shouldDedupeSubcommandRules()
          ? labelSubcommandResults(subcommands, astCommandsByIdx, subcommandPermissionDecisions)
          : new Map(
              subcommandPermissionDecisions.map((subcommandPermissionDecision, idx) => [
                subcommands[idx],
                subcommandPermissionDecision,
              ]),
            ),
      },
    };
  let filtered = astCommandsByIdx
    .slice(skippedLeadingCd ? 1 : 0)
    .filter((astCommand) => astCommand !== undefined);
  let pathConstraintResult = checkPathConstraints(
    input,
    effectiveCwd,
    permissionContext,
    compoundCommandHasCd,
    flattened,
    filtered,
    getCompoundCdTimedDeny(permissionContext),
  );
  if (pathConstraintResult.behavior === "deny") return pathConstraintResult;
  let safetyCheckResult = await checkInlineShellRemoval(input.command, recursionCtx, [], commands);
  let chosenResult =
    pathConstraintResult.behavior === "ask" &&
    pathConstraintResult.decisionReason?.type === "safetyCheck" &&
    pathConstraintResult.decisionReason.classifierApprovable === false
      ? pathConstraintResult
      : (safetyCheckResult ?? pathConstraintResult);
  if (
    chosenResult.behavior === "ask" &&
    chosenResult.decisionReason?.type === "safetyCheck" &&
    chosenResult.decisionReason.classifierApprovable === false
  ) {
    if (
      !isBypassImmuneCircuitBreaker(chosenResult.decisionReason) ||
      isClassifierRoutedCircuitBreaker(chosenResult.decisionReason)
    ) {
      let breakerAsk =
        findCircuitBreakerAsk(subcommandPermissionDecisions, true) ??
        (cdGitAskResult !== undefined || gitStructureAskResult !== undefined ? readBlockAsk() : undefined) ??
        findCircuitBreakerAsk(subcommandPermissionDecisions) ??
        safetyCheckResult ??
        undefined;
      if (breakerAsk) return breakerAsk;
    }
    return chosenResult;
  }
  if (cdGitAskResult !== undefined || gitStructureAskResult !== undefined) {
    let breakerAsk =
      findCircuitBreakerAsk(subcommandPermissionDecisions, true) ??
      readBlockAsk() ??
      findCircuitBreakerAsk(subcommandPermissionDecisions);
    if (breakerAsk) return breakerAsk;
  }
  if (cdGitAskResult !== undefined) return cdGitAskResult;
  if (gitStructureAskResult !== undefined) return gitStructureAskResult;
  let mapped = subcommands
    .map((result, idx) => [result, idx])
    .filter(([command]) => isSedCommand(command))
    .map(([, idx]) => idx);
  if (mapped.length > 0) {
    let all = mapped.every((idx) => {
      let decision = subcommandPermissionDecisions[idx];
      return decision?.behavior === "allow" && decision.decisionReason?.type === "rule";
    });
    let any = subcommandPermissionDecisions.some(
      (subcommandPermissionDecision) => subcommandPermissionDecision.behavior !== "allow",
    );
    let pathAsksAnyway =
      pathConstraintResult.behavior === "ask" && !pathConstraintResult.bashAllowRuleOverridable;
    if (!all && !any && !pathAsksAnyway && exactMatchResult.behavior !== "allow") {
      let allowedSedCommands = new Set(
        mapped
          .filter((idx) => {
            let decision = subcommandPermissionDecisions[idx];
            return decision?.behavior === "allow" && decision.decisionReason?.type === "rule";
          })
          .map((idx) => subcommands[idx].trim()),
      );
      let sedResult = checkSedCommand(input, permissionContext, allowedSedCommands);
      if (sedResult.behavior === "ask") {
        if (permissionContext.blockReadsOutsideWorkingDirectories === true) return outsideReadsSedScriptAsk();
        return sedResult;
      }
    }
  }
  let askSubresult = subcommandPermissionDecisions.find(
    (subcommandPermissionDecision) => subcommandPermissionDecision.behavior === "ask",
  );
  let nonAllowCount = count(subcommandPermissionDecisions, (decision) => decision.behavior !== "allow");
  if (
    pathConstraintResult.behavior === "ask" &&
    askSubresult === undefined &&
    !pathConstraintResult.bashAllowRuleOverridable
  )
    return pathConstraintResult;
  if (askSubresult !== undefined && nonAllowCount === 1) return askSubresult;
  if (exactMatchResult.behavior === "allow") return exactMatchResult;
  if (
    subcommandPermissionDecisions.every(
      (subcommandPermissionDecision) => subcommandPermissionDecision.behavior === "allow",
    )
  )
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "subcommandResults",
        reasons: shouldDedupeSubcommandRules()
          ? labelSubcommandResults(subcommands, astCommandsByIdx, subcommandPermissionDecisions)
          : new Map(subcommandPermissionDecisions.map((result, idx) => [subcommands[idx], result])),
      },
    };
  let commandSubcommandPrefix = null;
  if (getCommandSubcommandPrefix) {
    commandSubcommandPrefix = await getCommandSubcommandPrefix(
      input.command,
      toolUseContext.abortController.signal,
      toolUseContext.options.isNonInteractiveSession,
    );
    if (toolUseContext.abortController.signal.aborted) throw new AbortError_2();
  }
  permissionContext = getToolPermissionContext(toolUseContext);
  if (subcommands.length === 1)
    return await checkSubcommandPermissionWithSuggestions(
      {
        command: subcommands[0],
      },
      permissionContext,
      commandSubcommandPrefix,
      compoundCommandHasCd,
      astCommandsByIdx[0],
      effectiveCwd,
      astAnalysis.bareAssignmentNames,
      toolUseContext,
    );
  let subcommandResultList = [];
  for (let idx = 0; idx < subcommands.length; idx++) {
    let subcommand = subcommands[idx];
    subcommandResultList.push(
      await checkSubcommandPermissionWithSuggestions(
        {
          ...input,
          command: subcommand,
        },
        permissionContext,
        commandSubcommandPrefix?.subcommandPrefixes.get(subcommand),
        compoundCommandHasCd,
        astCommandsByIdx[idx],
        skippedLeadingCd && idx === 0 ? cwd : effectiveCwd,
        astAnalysis.bareAssignmentNames,
        toolUseContext,
      ),
    );
  }
  let severityByBehavior = {
    deny: 3,
    ask: 2,
    passthrough: 1,
    allow: 0,
  };
  let subcommandResults = new Map();
  for (let idx = 0; idx < subcommands.length; idx++) {
    let subcommand = subcommands[idx];
    let result = subcommandResultList[idx];
    let existing = subcommandResults.get(subcommand);
    let severity = severityByBehavior[result.behavior];
    let existingSeverity = existing ? severityByBehavior[existing.behavior] : -1;
    if (
      !existing ||
      severity > existingSeverity ||
      (severity === existingSeverity &&
        findSafetyCheckReason(result.decisionReason) !== undefined &&
        findSafetyCheckReason(existing.decisionReason) === undefined)
    )
      subcommandResults.set(subcommand, result);
  }
  if (subcommandResultList.every((subcommand) => subcommand.behavior === "allow"))
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "subcommandResults",
        reasons: shouldDedupeSubcommandRules()
          ? labelSubcommandResults(subcommands, astCommandsByIdx, subcommandResultList)
          : subcommandResults,
      },
    };
  let collectedRules = new Map();
  for (let idx = 0; idx < subcommandResultList.length; idx++) {
    let subcommand = subcommands[idx];
    let result = subcommandResultList[idx];
    if (result.behavior === "ask" || result.behavior === "passthrough") {
      let suggestions = "suggestions" in result ? result.suggestions : undefined;
      let rules = extractRules(suggestions);
      for (let rule of rules) {
        let ruleKey = formatPermissionRule(rule);
        collectedRules.set(ruleKey, rule);
      }
      if (result.behavior === "ask" && rules.length === 0 && result.decisionReason?.type !== "rule")
        for (let rule of extractRules(suggestionForExactCommand(subcommand))) {
          let ruleKey = formatPermissionRule(rule);
          collectedRules.set(ruleKey, rule);
        }
    }
  }
  let decisionReason = {
    type: "subcommandResults",
    reasons: subcommandResults,
  };
  let cappedRules = Array.from(collectedRules.values()).slice(0, MAX_COLLECTED_RULES);
  let suggestions =
    cappedRules.length > 0
      ? [
          {
            type: "addRules",
            rules: cappedRules,
            behavior: "allow",
            destination: "localSettings",
          },
        ]
      : undefined;
  return {
    behavior: askSubresult !== undefined ? "ask" : "passthrough",
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason,
    suggestions,
  };
}
//@ chunk-e6aww6q8.js:1243231-1243296 layout
var TENGU_WILD_OCTOPUS = "tengu_wild_octopus";
var LEADING_TIME_PREFIX_RE = /^(?:time[ \t]+(?:--[ \t]+)?)+/;
//@ chunk-e6aww6q8.js:1243296-1243435 layout
/**
 * 把命令剥离安全包装后解析 argv 交给谓词；开关 tengu_wild_octopus 打开时还会对 argv 再做包装剥离后再判一次。
 */
function matchesArgvAfterUnwrap(commandText, normalizeArgv, matchesArgv) {
  let unwrappedCommand = stripSafeWrappers(commandText);
  let commandArgv = getCommandArgv(unwrappedCommand);
  if (matchesArgv(commandArgv)) return true;
  if (
    !readFlagWithOverride(TENGU_WILD_OCTOPUS, {
      safe: true,
    })
  )
    return false;
  let candidateArgv =
    unwrappedCommand === commandText
      ? commandArgv
      : getCommandArgv(commandText.replace(LEADING_TIME_PREFIX_RE, ""));
  return matchesArgv(normalizeArgv(candidateArgv));
}
//@ chunk-e6aww6q8.js:1243435-1243583 fingerprint = isNormalizedGitCommand (0.939)
/**
 * 规范化后的命令是否是 git 命令（含 time/nohup 等包装后的 git、xargs git）。
 */
function isNormalizedGitCommand(command) {
  if (command.startsWith("git ") || command === "git") return true;
  if (
    matchesArgvAfterUnwrap(
      command,
      stripWrappersFromArgvForPaths,
      (argv) => argv[0] === "git" || (argv[0] === "xargs" && argv.includes("git")),
    )
  )
    return true;
  return isNeverExactMatch(command);
}
//@ chunk-e6aww6q8.js:1243583-1243608 layout
/**
 * 语义检查失败路径上的占位实现，恒返回 false（该路径不放行精确匹配）。
 */
function isNeverExactMatch(command) {
  return false;
}
//@ chunk-e6aww6q8.js:1243608-1243694 layout
/**
 * 剥掉包装后判断命令是否为目录切换内建（cd/pushd/popd/chdir）。
 */
function isNormalizedCdCommand(command) {
  return matchesArgvAfterUnwrap(
    command,
    stripCommandBuiltinPrefixes,
    ([firstArg]) => firstArg === "cd" || firstArg === "pushd" || firstArg === "popd" || firstArg === "chdir",
  );
}
//@ chunk-e6aww6q8.js:1243694-1243747 placement
function commandHasAnyCd(command) {
  return splitCommand(command).some((subcmd) => isNormalizedCdCommand(subcmd.trim()));
}
//@ chunk-e6aww6q8.js:1243747-1244182 placement
/**
 * 从命令中提取 rm 的字面目标路径（可能用两种读法解析），命令含 cd 时只保留绝对路径，展开后去重返回。
 */
async function extractLiteralRmTargets(command, cwd) {
  if (!/\brm\b/.test(command)) return [];
  let parseReadings = () => runWithGuardOff(() => parseForSecurity(command));
  let [guardedParse, readRefusal] = await runWithReadingRefusals(parseReadings);
  let parses =
    readRefusal === undefined
      ? [guardedParse]
      : [await runWithRuleOff(parseReadings), await runAsBashReads(parseReadings)];
  let hasAnyCd = runWithGuardOff(() => commandHasAnyCd(command));
  let targets = new Set();
  for (let parsed of parses) {
    if (parsed.kind !== "simple") {
      logForDebugging(`literalRmTargets: ${command.length}-char command not read (${parsed.kind})`);
      continue;
    }
    for (let command of parsed.commands) {
      let [commandName, ...commandArgs] = stripWrappersFromArgvForPaths(command.argv);
      if (normalizeCommandName(commandName) !== "rm") continue;
      for (let targetPath of PATH_EXTRACTORS.rm(commandArgs).map(expandTildeWithHome))
        if (!hasAnyCd || isAbsolute(targetPath)) targets.add(expandPath(targetPath, cwd));
    }
  }
  return [...targets];
}
//@ chunk-e6aww6q8.js:1244182-1244222 placement
/**
 * 判断某个开头的环境赋值不安全（变量名非常规或值像路径）。
 */
function isUnsafeEnvAssignment(name, value) {
  return !isSafeEnvVarName(name) || isPathLikeEnvValue(value);
}
//@ chunk-e6aww6q8.js:1244222-1244258 placement
/**
 * 剥掉开头所有不安全的环境赋值，返回剩余命令。
 */
function stripUnsafeLeadingEnvVars(command) {
  return stripAllLeadingEnvVars(command, isUnsafeEnvAssignment, false);
}
//@ chunk-e6aww6q8.js:1244258-1244293 placement
/**
 * 剥掉安全包装命令（command/time 等），得到实际执行的命令文本。
 */
function stripSafeWrappersFromCommand(command) {
  return stripSafeWrappers(command, false, false);
}
//@ chunk-e6aww6q8.js:4855075-4855835 placement
function mergeBashSubcommandVerdicts(input, context, result, mergeMode) {
  if (
    !input.dangerouslyDisableSandbox ||
    result.behavior === "deny" ||
    (mergeMode === "eachVerdict" ? result.behavior === "ask" : result.behavior === "allow") ||
    isAllRuleReason(result.decisionReason) ||
    shouldUseSandbox(input) ||
    !shouldUseSandbox({
      ...input,
      dangerouslyDisableSandbox: false,
    }) ||
    (mergeMode === "chosenVerdict" &&
      (result.behavior === "ask" ? !shouldRetagAskAsSandboxOverride(result) : !sandboxOverrideAskGuardsOn()))
  )
    return result;
  let hookResult = noopToolUseHook({
    toolName: BASH_TOOL_NAME,
    input,
    context,
  });
  if (hookResult) return hookResult;
  if (result.behavior === "allow" || (result.behavior === "passthrough" && mergeMode === "eachVerdict"))
    return {
      behavior: "ask",
      decisionReason: {
        type: "sandboxOverride",
        reason: "dangerouslyDisableSandbox",
      },
      message: "Run outside of the sandbox",
    };
  return {
    behavior: "ask",
    decisionReason: {
      type: "sandboxOverride",
      reason: "dangerouslyDisableSandbox",
      replaces: {
        decisionReason: result.decisionReason,
        message: result.message,
        blockedPath: result.blockedPath,
      },
    },
    message: "Run outside of the sandbox",
  };
}
//@ chunk-fnhsh6ng.js:2095-2231 fingerprint = startSpeculativeClassifierCheck (1)
/**
 * 把当前权限模式规整为分类器使用的模式（bypassPermissions 被禁用或 auto 不可用时回落为 default）。
 */
function resolveAvailablePermissionMode(permissionMode) {
  let allowDescriptions = toExternalPermissionMode(permissionModeFromString(permissionMode ?? "default"));
  if (allowDescriptions === "bypassPermissions" && isBypassPermissionsModeDisabled()) return "default";
  if (allowDescriptions === "auto" && !isAutoModeGateEnabled()) return "default";
  return allowDescriptions;
}
//@ chunk-m79qv8gp.js:11458-11568 fingerprint = awaitClassifierAutoApproval (0.353)
/**
 * 判断对象上是否带有 classifier:true 的决策标记。
 */
function isClassifierDecision(decision) {
  let metadata = Reflect.get(decision, ASSET_TARGET_PIN_TAG);
  return typeof metadata === "object" && metadata !== null && Reflect.get(metadata, "classifier") === true;
}
//@ chunk-v0yfsee9.js:75146-75763 fingerprint = bashToolCheckExactMatchPermission (1)
/**
 * PowerShell 的精确规则检查（命令先规范化），deny/ask/allow 规则命中即返回，否则 passthrough 并附精确命令建议。
 */
function powershellToolCheckExactMatchPermission_2(input, toolPermissionContext) {
  let command = trimPsWhitespace(input.command);
  let trimmedInput = {
    ...input,
    command,
  };
  let { matchingDenyRules, matchingAskRules, matchingAllowRules } = matchingRulesForInput_2(
    trimmedInput,
    toolPermissionContext,
    "exact",
  );
  if (matchingDenyRules[0] !== undefined)
    return {
      behavior: "deny",
      message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${command} has been denied.`,
      decisionReason: {
        type: "rule",
        rule: matchingDenyRules[0],
      },
    };
  if (matchingAskRules[0] !== undefined)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
      decisionReason: {
        type: "rule",
        rule: matchingAskRules[0],
      },
    };
  if (matchingAllowRules[0] !== undefined)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: matchingAllowRules[0],
      },
    };
  let decisionReason = {
    type: "other",
    reason: "This command requires approval",
  };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    decisionReason,
    suggestions: suggestionForExactCommand_2(command),
  };
}
//@ chunk-63f0f3kd.js:106273-106715 fingerprint = isNormalizedCdCommand (0.91)
/**
 * 从 cd/pushd 的 argv 求目标目录：无参数为 homedir，popd、pushd 无参、±N 栈操作、多个参数、"-" 返回 undefined。
 */
function getCdTargetFromArgv(command) {
  let stripped = findDirectoryChangeIndex(command);
  let lower = (command[stripped] ?? "").toLowerCase();
  if (lower === "popd") return;
  if (lower === "pushd" && command.length - stripped - 1 === 0) return;
  if (command.slice(stripped + 1).some((arg) => /^[+-]\d+$/.test(arg))) return;
  let sliced = command.slice(stripped + 1);
  let index = sliced.indexOf("--");
  let argsBeforeDoubleDash = index === -1 ? sliced : sliced.slice(0, index);
  let argsAfterDoubleDash = index === -1 ? [] : sliced.slice(index + 1);
  let hasFlag = index !== -1 || argsBeforeDoubleDash.some((arg) => arg !== "-" && arg.startsWith("-"));
  let pathArgs = [
    ...argsBeforeDoubleDash.filter((arg) => arg === "-" || !arg.startsWith("-")),
    ...argsAfterDoubleDash,
  ];
  if (pathArgs.length === 0) return hasFlag ? undefined : homedir();
  if (pathArgs.length > 1 || pathArgs[0] === "-") return;
  return pathArgs[0];
}
export {
  commandHasAnyCd,
  getSubcommandPrefix,
  getBareCommandPrefix,
  startsWithBareShell,
  getCdTargetFromArgv,
  suggestionForExactCommand,
  checkBashWithDeclarations,
  isBypassModeForBash,
  buildPendingClassifierCheck,
  isPassthroughOrPlainAsk,
  countSafeEnvPrefix,
  BARE_SHELL_PREFIXES,
  bashToolHasPermissionTwoPass,
  denyCrashedCheckUnderCommandClamp,
  denyForBashCommandClamp,
  powershellToolCheckExactMatchPermission_2,
  extractLiteralRmTargets,
  mergeBashSubcommandVerdicts,
  stripSafeWrappers,
  skipTimeoutFlags,
  isSourceGlobRecordingEnabled,
  lazySessionEnvVarNames,
  hasRiskyBareAssignment,
  isNormalizedGitCommand,
  isNormalizedCdCommand,
  isSafeEnvAssignment,
  isPlainPathToken,
  unwrapCommandArgv,
  isSimpleAndChain,
  bashToolHasPermission,
  getStructuralMissKind,
  stripUnsafeLeadingEnvVars,
  stripSafeWrappersFromCommand,
  isSafeEnvVarName,
  isPathLikeEnvValue,
  matchesCommandRule,
  parseBashPermissionRule,
  resolveAvailablePermissionMode,
  isClassifierDecision,
};
