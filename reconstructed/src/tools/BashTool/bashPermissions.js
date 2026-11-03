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
import {
  isAbsolute,
  isAbsolute as isAbsolute_2,
  isAbsolute as isAbsolute_3,
  isAbsolute as isAbsolute_4,
  isAbsolute as isAbsolute_5,
  isAbsolute as isAbsolute_6,
  isAbsolute as isAbsolute_7,
  isAbsolute as isAbsolute_8,
  isAbsolute as isAbsolute_9,
  isAbsolute as isAbsolute_10,
  isAbsolute as isAbsolute_11,
  isAbsolute as isAbsolute_12,
  isAbsolute as isAbsolute_13,
  isAbsolute as isAbsolute_14,
  isAbsolute as isAbsolute_15,
  isAbsolute as isAbsolute_16,
  isAbsolute as isAbsolute_17,
  isAbsolute as isAbsolute_18,
  isAbsolute as isAbsolute_19,
  isAbsolute as isAbsolute_20,
  isAbsolute as isAbsolute_21,
  isAbsolute as isAbsolute_22,
  isAbsolute as isAbsolute_23,
  isAbsolute as isAbsolute_24,
  isAbsolute as isAbsolute_25,
  isAbsolute as isAbsolute_26,
  isAbsolute as isAbsolute_27,
  isAbsolute as isAbsolute_28,
  isAbsolute as isAbsolute_29,
  isAbsolute as isAbsolute_30,
  isAbsolute as isAbsolute_31,
  isAbsolute as isAbsolute_32,
  isAbsolute as isAbsolute_33,
  isAbsolute as isAbsolute_34,
  isAbsolute as isAbsolute_35,
  isAbsolute as isAbsolute_36,
  isAbsolute as isAbsolute_37,
  isAbsolute as isAbsolute_38,
  isAbsolute as isAbsolute_39,
  isAbsolute as isAbsolute_40,
  isAbsolute as isAbsolute_42,
  isAbsolute as isAbsolute_43,
  isAbsolute as isAbsolute_44,
  isAbsolute as isAbsolute_45,
  isAbsolute as isAbsolute_46,
  isAbsolute as isAbsolute_47,
  isAbsolute as isAbsolute_48,
  isAbsolute as isAbsolute_49,
  isAbsolute as isAbsolute_50,
  isAbsolute as isAbsolute_51,
  isAbsolute as isAbsolute_52,
  isAbsolute as isAbsolute_53,
  isAbsolute as isAbsolute_54,
  isAbsolute as isAbsolute_55,
  isAbsolute as isAbsolute_56,
  isAbsolute as isAbsolute_57,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  resolve as resolve_7,
  resolve as resolve_8,
  resolve as resolve_9,
  resolve as resolve_10,
  resolve as resolve_11,
  resolve as resolve_12,
  resolve as resolve_13,
  resolve as resolve_14,
  resolve as resolve_15,
  resolve as resolve_16,
  resolve as resolve_17,
  resolve as resolve_18,
  resolve as resolve_19,
  resolve as resolve_20,
  resolve as resolve_21,
  resolve as resolve_22,
  resolve as resolve_23,
  resolve as resolve_24,
  resolve as resolve_25,
  resolve as resolve_26,
  resolve as resolve_27,
  resolve as resolve_28,
  resolve as resolve_29,
  resolve as resolve_30,
  resolve as resolve_31,
  resolve as resolve_32,
  resolve as resolve_33,
  resolve as resolve_34,
  resolve as resolve_35,
  resolve as resolve_36,
  resolve as resolve_37,
  resolve as resolve_38,
  resolve as resolve_39,
  resolve as resolve_40,
  resolve as resolve_41,
  resolve as resolve_42,
  resolve as resolve_43,
  resolve as resolve_44,
  resolve as resolve_45,
  resolve as resolve_46,
  resolve as resolve_47,
  resolve as resolve_48,
  resolve as resolve_49,
  resolve as resolve_50,
  resolve as resolve_51,
  resolve as resolve_52,
  resolve as resolve_53,
  resolve as resolve_54,
  resolve as resolve_55,
  resolve as resolve_56,
  resolve as resolve_57,
  resolve as resolve_58,
  resolve as resolve_59,
  resolve as resolve_60,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  dirname as dirname_9,
  dirname as dirname_10,
  dirname as dirname_11,
  dirname as dirname_12,
  dirname as dirname_13,
  dirname as dirname_14,
  dirname as dirname_15,
  dirname as dirname_16,
  dirname as dirname_17,
  dirname as dirname_18,
  dirname as dirname_19,
  dirname as dirname_20,
  dirname as dirname_21,
  dirname as dirname_22,
  dirname as dirname_23,
  dirname as dirname_24,
  dirname as dirname_25,
  dirname as dirname_26,
  dirname as dirname_27,
  dirname as dirname_28,
  dirname as dirname_29,
  dirname as dirname_30,
  dirname as dirname_31,
  dirname as dirname_32,
  dirname as dirname_33,
  dirname as dirname_34,
  dirname as dirname_35,
  dirname as dirname_36,
  dirname as dirname_37,
  dirname as dirname_38,
  dirname as dirname_39,
  dirname as dirname_40,
  dirname as dirname_41,
  dirname as dirname_42,
  dirname as dirname_43,
  dirname as dirname_44,
  dirname as dirname_45,
  dirname as dirname_46,
  dirname as dirname_47,
  dirname as dirname_48,
  dirname as dirname_49,
  dirname as dirname_50,
  dirname as dirname_51,
  dirname as dirname_52,
  dirname as dirname_53,
  dirname as dirname_54,
  dirname as dirname_55,
  dirname as dirname_56,
  dirname as dirname_57,
  dirname as dirname_58,
  dirname as dirname_59,
  dirname as dirname_60,
  dirname as dirname_61,
  dirname as dirname_62,
  dirname as dirname_63,
  dirname as dirname_64,
  dirname as dirname_65,
  dirname as dirname_66,
  dirname as dirname_67,
  dirname as dirname_68,
  dirname as dirname_69,
  dirname as dirname_70,
  dirname as dirname_71,
  dirname as dirname_72,
  dirname as dirname_73,
  dirname as dirname_74,
  dirname as dirname_75,
  dirname as dirname_76,
  dirname as dirname_77,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  normalize as normalize_4,
  normalize as normalize_5,
  normalize as normalize_6,
  normalize as normalize_7,
  normalize as normalize_8,
  normalize as normalize_9,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
import { homedir } from "os";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  getFeatureValueWithSource_CACHED_MAY_BE_STALE,
} from "../../services/analytics/growthbook.js";
import { firstLineOf, getFirstLine } from "../../utils/stringUtils.js";
import { MH } from "../../utils/shell/specPrefix.js";
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
  _vn,
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
import { bR, qhe, RA, Sqt, mqt } from "../../utils/shell/shellEnvSnapshot.js";
import { onceExport } from "../../../vendor/lodash-es/once.js";
import { rU, BAt, parseCommandRaw, PARSE_ABORTED } from "../../utils/bash/parser.js";
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
import { HGe, matchesCertifiedCommand } from "./certifiedCommands.js";
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
import { Lu } from "../../utils/networkPaths.js";
import { Qn } from "../../utils/pathClassification.js";
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
import { checkSedConstraints, dze, checkSedCommand } from "./sedValidation.js";
import { shouldUseSandbox, antDisabledListMatchesCommandText } from "./shouldUseSandbox.js";
import { checkPermissionMode } from "./modeValidation.js";
import { Ize, runWithRefusedReading, Mze, commandWritesToGitInternalPaths } from "./readOnlyValidation.js";
import { isSandboxAutoAllowOff, isPlanBypass } from "../../utils/permissions/browserToolNames.js";
import { cSe, DNe } from "../../utils/git/builderGit/gitEnv.js";
import { isTildeUserPath } from "../../utils/shell/readOnlyCommandValidation.js";
import {
  Z7,
  DH,
  logEventUnlessSuppressed,
  checkDangerousRemoval,
  classifyRemovalReason,
  dangerousRemovalAsk,
  R0e,
} from "./dangerousRemoval.js";
import { findDangerousVariableRemovalInText, describeCommandSubstitution } from "./expansionAnalysis.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isTinglyPearlEnabled, BIt, Ndt } from "../../utils/bash/bashParserFlags.js";
import { TYt, checkInlineShellRemoval, combineDeclarationReadings } from "./inlineShellAnalysis.js";
import { env } from "../../utils/env.js";
import { isAbortError, AbortError as AbortError_2 } from "../../utils/errors.js";
import { logError } from "../../utils/log.js";
import { runWithReadingRefusals, bcs, DIt } from "../../utils/bash/bashReadingFlags.js";
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
import { getDangerousRmTimeoutConfig, kqt } from "./bashPermissionFlags.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import {
  cdMayChangeReadScope,
  isReadOnlyAfterCd,
  isCdTextToCurrentDir,
  checkCdCommand,
  resolveSimpleCdTarget,
  isCdToCurrentDir,
} from "./cdTracking.js";
import { checkCommandOperatorPermissions, uQ, findCircuitBreakerAsk } from "./bashCommandHelpers.js";
import { getPlatform } from "../../utils/platform.js";
import { windowsPathToPosixPath, expandPath } from "../../utils/path.js";
import { allWorkingDirectories, normalizeCaseForComparison } from "../../utils/permissions/filesystem.js";
import { formatPermissionRule } from "../../utils/permissions/disallowedToolsFlag.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { logForDebugging } from "../../utils/debug.js";
import { isAllRuleReason } from "../../utils/permissions/decisionReasons.js";
import { DWr } from "./sandboxViolations.js";
import { BASH_TOOL_NAME } from "./toolName.js";
import { findDirectoryChangeIndex } from "./bgWorktreeGuard/bgWorktreeCommandGuard.js";
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

//@ chunk-e6aww6q8.js:1164354-1164413 placement
var JVt = /^[A-Za-z_]\w*=/,
  aDo = 5,
  TENGU_BINARY_LOLLIPOP = "tengu_binary_lollipop";
//@ chunk-e6aww6q8.js:1164413-1164445 placement
function Cye() {
  return getFeatureValue_CACHED_MAY_BE_STALE(TENGU_BINARY_LOLLIPOP, !0);
}
/**
 * 统计命令开头安全的环境变量赋值个数，遇到不安全赋值返回 null。
 */
//@ chunk-e6aww6q8.js:1164445-1164580 placement
function countSafeEnvPrefix(e) {
  let n = 0;
  while (n < e.length && JVt.test(e[n])) {
    let r = firstLineOf(e[n], "=");
    if (!isSafeEnvAssignment(r, e[n].slice(r.length + 1))) return null;
    n++;
  }
  return n;
}
/**
 * 从命令中取出可作为规则前缀的"命令 子命令"（跳过安全的环境变量赋值，子命令须为小写 kebab 形式，必要时取更深层子命令）；裸 shell 前缀返回 null。
 */
//@ chunk-e6aww6q8.js:1164580-1164960 placement
function getSubcommandPrefix(e) {
  let filtered = e.trim().split(/\s+/).filter(Boolean);
  if (filtered.length === 0) return null;
  let r = countSafeEnvPrefix(filtered);
  if (r === null) return null;
  let sliced = filtered.slice(r);
  if (sliced.length < 2) return null;
  if (BARE_SHELL_PREFIXES.has(sliced[0].split("/").pop())) return null;
  let h = sliced[1],
    y = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (!y.test(h)) return null;
  let S = MH(sliced[0], h) ?? 2,
    w = 2;
  while (w < S && y.test(sliced[w] ?? "")) w++;
  return w < S ? null : sliced.slice(0, w).join(" ");
}
/**
 * 会把后续参数当命令执行的"裸 shell/包装"命令名（sh/bash/zsh/pwsh/env/xargs/sudo/timeout/nohup/strace…）；规则建议不会为这些前缀生成前缀规则。
 */
//@ chunk-e6aww6q8.js:1164960-1165276 fingerprint = BARE_SHELL_PREFIXES (0.706)
var BARE_SHELL_PREFIXES = new Set([
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
/**
 * 判断命令（去掉前导环境变量后）是否以裸 shell 开头（如 bash、sh）。
 */
//@ chunk-e6aww6q8.js:1165276-1165416 placement
function startsWithBareShell(e) {
  let parts = stripAllLeadingEnvVars(e.trim()).split(/\s+/),
    r = 0;
  while (r < parts.length && JVt.test(parts[r])) r++;
  let s = parts[r];
  return !!s && BARE_SHELL_PREFIXES.has(s.split("/").pop());
}
/**
 * 获取命令的裸命令前缀（跳过安全的环境变量），用于生成权限规则；shell 或特殊命令返回 null。
 */
//@ chunk-e6aww6q8.js:1165416-1165670 placement
function getBareCommandPrefix(e) {
  let filtered = e.trim().split(/\s+/).filter(Boolean),
    r = countSafeEnvPrefix(filtered);
  if (r === null) return null;
  let s = filtered[r];
  if (!s) return null;
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(s)) return null;
  if (BARE_SHELL_PREFIXES.has(s)) return null;
  if (MH(s, filtered[r + 1] ?? "") !== void 0) return null;
  return s;
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
function yQ(e, n) {
  return matchWildcardPattern(e, n, !1, !0);
}
/**
 * Bash 安全环境变量白名单（GO*\/RUST_*\/NODE_ENV/PYTHON*\/LANG/LC_*\/TERM/NO_COLOR/TZ/CI…）；wQ 是规则内容解析函数的别名（exact/prefix/wildcard）。
 */
//@ chunk-e6aww6q8.js:1166321-1166857 fingerprint = SAFE_ENV_VARS (0.91)
var parseBashPermissionRule = parseShellPermissionRule,
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
/**
 * 变量名是否在 Bash 安全环境变量白名单 SAFE_ENV_VARS 中。
 */
//@ chunk-e6aww6q8.js:1166857-1166891 layout
function isSafeEnvVarName(e) {
  return SAFE_ENV_VARS.has(e);
}
//@ chunk-e6aww6q8.js:1166891-1166929 layout
function isSafeEnvVarNameForStrip(e) {
  return SAFE_ENV_VARS.has(e) || !1;
}
//@ chunk-e6aww6q8.js:1166929-1166997 layout
var PATH_LIKE_VALUE_RE = /^[.~]*[/\\]|[/\\][/\\]|:[/\\.]|(?:^|[/\\])\.\.(?:[/\\]|$)/;
/**
 * 值看起来像路径（以 ./ ~/ / 开头、含 ..、URL 冒号斜杠等）且路径型值检查开关打开时返回 true；这类赋值不能作为安全前缀剥离。
 */
//@ chunk-e6aww6q8.js:1166997-1167104 layout
function isPathLikeEnvValue(e) {
  let replaced = e.replaceAll('"', "").replaceAll("'", "");
  return (
    (PATH_LIKE_VALUE_RE.test(replaced) || PATH_LIKE_VALUE_RE.test(deletePlaceholders(replaced))) && _vn()
  );
}
/**
 * NAME=value 是否可以当作安全前缀剥离：变量在 SAFE_ENV_VARS 中且值不像路径；含占位符时更严格。
 */
//@ chunk-e6aww6q8.js:1167104-1167203 layout
function isSafeEnvAssignment(varName, varValue) {
  if (varValue.includes(CMDSUB_PLACEHOLDER) && (!isSafeEnvVarNameForStrip(varName) || _vn())) return !1;
  if (SAFE_ENV_VARS.has(varName)) return !isPathLikeEnvValue(varValue);
  return !1;
}
//@ chunk-e6aww6q8.js:1167203-1167279 layout
function isRiskyBareAssignmentName(e, n) {
  return e === "PWD" || e === "OLDPWD" || (!isSafeEnvVarNameForStrip(e) && n()?.has(e) !== !1);
}
/**
 * 返回会话环境变量名集合的惰性读取器（供 hasRiskyBareAssignment 判断裸赋值）。
 */
//@ chunk-e6aww6q8.js:1167279-1167318 layout
function lazySessionEnvVarNames(e) {
  return (bR(), () => qhe(e));
}
/**
 * 复合命令里的裸赋值是否可能改变目录语义：赋值给 PWD/OLDPWD，或给不在安全表但存在于会话环境变量里的名字。
 */
//@ chunk-e6aww6q8.js:1167318-1167377 layout
function hasRiskyBareAssignment(e, n) {
  let r = onceExport(n);
  return e.some((s) => isRiskyBareAssignmentName(s, r));
}
/**
 * 去掉以 # 开头的注释行（全是注释时原样返回）。
 */
//@ chunk-e6aww6q8.js:1167377-1167495 file-local
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
/**
 * 规则匹配前的规范化：循环剥离注释行与安全 env 前缀，去掉首词引号，再剥离 timeout/time/nice/stdbuf/nohup/command/builtin/noglob 包装，返回 trim 后的命令。
 */
//@ chunk-e6aww6q8.js:1167495-1168849 layout
function stripSafeWrappers(e, n = !0, r = !0) {
  let s = [
      /^timeout[ \t]+(?:(?:--(?:foreground|preserve-status|verbose)|--(?:kill-after|signal)=[A-Za-z0-9_.+-]+|--(?:kill-after|signal)[ \t]+[A-Za-z0-9_.+-]+|-v|-[ks][ \t]+[A-Za-z0-9_.+-]+|-[ks][A-Za-z0-9_.+-]+)[ \t]+)*(?:--[ \t]+)?\d+(?:\.\d+)?[smhd]?[ \t]+/,
      /^time[ \t]+(?:--[ \t]+)?/,
      /^nice(?:[ \t]+-n[ \t]+-?\d+|[ \t]+-\d+)?[ \t]+(?:--[ \t]+)?/,
      /^stdbuf(?:[ \t]+-[ioe][LN0-9]+)+[ \t]+(?:--[ \t]+)?/,
      /^nohup[ \t]+(?:--[ \t]+)?/,
      /^command(?:[ \t]+-p+)*(?:[ \t]+--)?[ \t]+(?!-)/,
      /^builtin(?:[ \t]+--)?[ \t]+(?!-)/,
      /^noglob[ \t]+(?!-)/,
    ],
    h = /^([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z0-9_./:-]+)[ \t]+/,
    y = (G) => (r ? stripCommentLines(G) : G),
    S = e,
    w = "";
  while (S !== w) {
    ((w = S), (S = y(S)));
    let G = n ? S.match(h) : null;
    if (G && isSafeEnvAssignment(G[1], G[2])) S = S.replace(h, "");
  }
  function L(G) {
    let match = G.match(/^([^\s]+)([\s\S]*)$/);
    if (!match) return G;
    let Z = match[1],
      Se = null,
      ke = !1,
      we = "";
    for (let Ee = 0; Ee < Z.length; Ee++) {
      let Ae = Z[Ee];
      if (((ke = !1), Se === "'"))
        if (Ae === "'") Se = null;
        else we += Ae;
      else if (Se === '"')
        if (Ae === "\\") {
          let Ie = Z[Ee + 1];
          if (Ie === "$" || Ie === "`" || Ie === '"' || Ie === "\\") ((we += Ie), Ee++);
          else if (Ie === void 0) ke = !0;
          else we += Ae;
        } else if (Ae === '"') Se = null;
        else we += Ae;
      else if (Ae === "\\") {
        let Ie = Z[Ee + 1];
        if (Ie === void 0) ke = !0;
        else ((we += Ie), Ee++);
      } else if (Ae === '"' || Ae === "'") Se = Ae;
      else we += Ae;
    }
    if (Se !== null || ke) return G;
    return we + match[2];
  }
  ((S = L(y(S))), (w = ""));
  while (S !== w) {
    w = S;
    for (let G of s) S = S.replace(G, "");
    if (S !== w) S = L(y(S));
  }
  return S.trim();
}
//@ chunk-e6aww6q8.js:1168849-1168878 layout
var TIMEOUT_FLAG_VALUE_RE = /^[A-Za-z0-9_.+-]+$/;
/**
 * 在 timeout 的 argv 中跳过它的选项（--foreground、-k/-s 带值等），返回时长参数下标；遇到未知选项返回 -1。
 */
//@ chunk-e6aww6q8.js:1168878-1169375 fingerprint = skipTimeoutFlags (1)
function skipTimeoutFlags(a) {
  let n = 1;
  while (n < a.length) {
    let r = a[n],
      s = a[n + 1];
    if (r === "--foreground" || r === "--preserve-status" || r === "--verbose") n++;
    else if (/^--(?:kill-after|signal)=[A-Za-z0-9_.+-]+$/.test(r)) n++;
    else if ((r === "--kill-after" || r === "--signal") && s && TIMEOUT_FLAG_VALUE_RE.test(s)) n += 2;
    else if (r === "--") {
      n++;
      break;
    } else if (r.startsWith("--")) return -1;
    else if (r === "-v") n++;
    else if ((r === "-k" || r === "-s") && s && TIMEOUT_FLAG_VALUE_RE.test(s)) n += 2;
    else if (/^-[ks][A-Za-z0-9_.+-]+$/.test(r)) n++;
    else if (r.startsWith("-")) return -1;
    else break;
  }
  return n;
}
/**
 * argv 版包装剥离：反复去掉 time [-p]、nohup、timeout <选项> <时长>、nice -n N，返回真正的命令 argv。
 */
//@ chunk-e6aww6q8.js:1169375-1169778 fingerprint = stripWrappersFromArgv (1)
function stripWrappersFromArgv(argv) {
  let n = argv;
  for (;;) {
    let r = rU(n[0] ?? "");
    if (r === "time" || r === "nohup") {
      let s = r === "time" && n[1] === "-p" ? 2 : 1;
      if (n[s]?.startsWith("-") && n[s] !== "--") return n;
      n = n.slice(n[s] === "--" ? s + 1 : s);
    } else if (r === "timeout") {
      let s = skipTimeoutFlags(n);
      if (s < 0 || !n[s] || !/^\d+(?:\.\d+)?[smhd]?$/.test(n[s])) return n;
      n = n.slice(s + 1);
    } else if (r === "nice" && n[1] === "-n" && n[2] && /^-?\d+$/.test(n[2]))
      n = n.slice(n[3] === "--" ? 4 : 3);
    else return n;
  }
}
/**
 * 命令是否带有不在安全表里（或值像路径）的 env 前缀；有 AST 时直接看 envVars。
 */
//@ chunk-e6aww6q8.js:1169778-1170112 layout
function hasUnsafeEnvVarPrefix(e, n) {
  if (n) return n.envVars.some((envVar) => !isSafeEnvAssignment(envVar.name, envVar.value));
  let r = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/,
    s = /^[A-Za-z_][A-Za-z0-9_]*\+?=("[^"$`\\]*"|'[^']*'|[A-Za-z0-9_./:+-]*)[ \t]+/,
    command = e.command;
  for (;;) {
    let match = command.match(r);
    if (!match) return !1;
    if (!isSafeEnvVarNameForStrip(match[1])) return !0;
    let match_2 = command.match(s);
    if (!match_2 || !isSafeEnvAssignment(match[1], match_2[1])) return !0;
    command = command.slice(match_2[0].length);
  }
}
/**
 * 剥离所有前导 VAR=value（含数组下标、引号值），可用回调/正则在特定变量处停止；用于 deny/ask 规则匹配时不被 env 前缀绕过。
 */
//@ chunk-e6aww6q8.js:1170112-1170440 file-local
function stripAllLeadingEnvVars(e, n, r = !0) {
  let ENV_VAR_PATTERN =
      /^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?)\+?=((?:'[^'\n\r]*'|"(?:\\.|[^"$`\\\n\r])*"|\\.|[^ \t\n\r$`;|&()<>\\\\'"])*)[ \t]+/,
    stripped = e,
    previousStripped = "";
  while (stripped !== previousStripped) {
    if (((previousStripped = stripped), r)) stripped = stripCommentLines(stripped);
    let match = stripped.match(ENV_VAR_PATTERN);
    if (!match) continue;
    let w = match[1];
    if (typeof n === "function" ? n(w, match[2]) : n?.test(w)) break;
    stripped = stripped.slice(match[0].length);
  }
  return stripped.trim();
}
//@ chunk-e6aww6q8.js:1170440-1172319 layout
var WRAPPER_FLAGS_WITH_VALUE = {
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
  },
  WRAPPER_COMMAND_STRING_FLAGS = {
    env: new Set(["-S", "--split-string"]),
    flock: new Set(["-c", "--command"]),
    script: new Set(["-c", "--command"]),
  },
  WRAPPER_LEADING_OPERAND_CHECKS = {
    chrt: (e) => /^\d+$/.test(e),
    taskset: (e) => /^(0x[\da-f]+|\d+)$/i.test(e),
    flock: () => !0,
    script: () => !0,
  },
  ENV_ASSIGNMENT_RE = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
/**
 * 把 argv 中的 env 赋值和 sudo/doas/env/watch/ionice/taskset/chrt/strace/ltrace/flock/script/unshare/nsenter/exec/command 等包装（含它们带值的选项、env -S/flock -c 的命令串）一层层剥掉，得到真正执行的命令 argv。
 */
//@ chunk-e6aww6q8.js:1172319-1173302 layout
function unwrapCommandArgv(e) {
  let sliced = e.slice();
  for (;;) {
    while (sliced[0] !== void 0 && ENV_ASSIGNMENT_RE.test(sliced[0])) sliced = sliced.slice(1);
    if (((sliced = stripWrappersFromArgv(sliced)), sliced[0] === void 0)) return sliced;
    let r = rU(sliced[0]),
      s = getOwn(WRAPPER_FLAGS_WITH_VALUE, r);
    if (s === void 0) return sliced;
    let h = getOwn(WRAPPER_COMMAND_STRING_FLAGS, r),
      y = getOwn(WRAPPER_LEADING_OPERAND_CHECKS, r),
      S = 1,
      w,
      L = !1;
    while (S < sliced.length) {
      let G = sliced[S];
      if (G === "--") {
        if ((S++, !L && y !== void 0 && S + 1 < sliced.length && y(sliced[S]))) {
          ((L = !0), S++);
          continue;
        }
        break;
      }
      if (h !== void 0) {
        if (h.has(G) && sliced[S + 1] !== void 0) {
          let trimmed = sliced[S + 1].trim();
          if (trimmed !== "") {
            w = trimmed;
            break;
          }
          S += 2;
          continue;
        }
        let index = G.indexOf("=");
        if (index > 0 && h.has(G.slice(0, index))) {
          let trimmed = G.slice(index + 1).trim();
          if (trimmed !== "") {
            w = trimmed;
            break;
          }
          S++;
          continue;
        }
        if (G.length > 2 && G[1] !== "-" && h.has(G.slice(0, 2))) {
          let trimmed = G.slice(2).trim();
          if (trimmed !== "") {
            w = trimmed;
            break;
          }
          S++;
          continue;
        }
      }
      if (G.startsWith("-") && (G !== "-" || y === void 0)) {
        if (r === "command" && BAt(G)) return sliced;
        S += s.has(G) && S + 1 < sliced.length ? 2 : 1;
        continue;
      }
      if (r === "env" && ENV_ASSIGNMENT_RE.test(G)) {
        S++;
        continue;
      }
      if (!L && y?.(G) && S + 1 < sliced.length) {
        ((L = !0), S++);
        continue;
      }
      break;
    }
    if (w !== void 0) {
      if (((sliced = w.trim().split(/\s+/)), sliced.length === 0 || sliced[0] === "")) return e.slice();
      continue;
    }
    if (S >= sliced.length) return sliced;
    sliced = sliced.slice(S);
  }
}
/**
 * 在一组 Bash 规则里找出与输入命令匹配的规则：候选命令包括原文、去重定向、stripSafeWrappers 后，以及（deny/ask 时）剥离全部 env 与包装后的形式；exact/prefix/wildcard 三种规则，prefix 匹配拒绝复合命令，并识别 xargs 前缀。
 */
//@ chunk-e6aww6q8.js:1173302-1174805 fingerprint = filterRulesByContentsMatchingInput (0.797)
function filterRulesByContentsMatchingInput(
  input,
  rules,
  matchMode,
  {
    stripAllEnvVars: s = !1,
    skipCompoundCheck: h = !1,
    astCommand: y,
    ruleBehavior: S,
    compoundBareAssignmentNames: w = [],
  } = {},
) {
  if (rules.size === 0) return [];
  let command = input.command.trim(),
    commandWithoutRedirections = extractOutputRedirections(command).commandWithoutRedirections,
    commandsToTry = (
      matchMode === "exact" ? [command, commandWithoutRedirections] : [commandWithoutRedirections]
    ).flatMap((cmd) => {
      let strippedCommand = stripSafeWrappers(cmd);
      return strippedCommand !== cmd ? [cmd, strippedCommand] : [cmd];
    });
  if (s) {
    let ke = y?.argv ?? getCommandArgv(commandWithoutRedirections),
      we = unwrapCommandArgv(ke);
    if (we.length > 0 && (we[0] !== ke[0] || (y?.envVars.length ?? 0) > 0)) commandsToTry.push(we.join(" "));
    if (we[0] !== void 0 && rU(we[0]) !== we[0]) commandsToTry.push([rU(we[0]), ...we.slice(1)].join(" "));
    let seen = new Set(commandsToTry),
      startIdx = 0;
    while (startIdx < commandsToTry.length) {
      let endIdx = commandsToTry.length;
      for (let Me = startIdx; Me < endIdx; Me++) {
        let cmd = commandsToTry[Me];
        if (!cmd) continue;
        let envStripped = stripAllLeadingEnvVars(cmd);
        if (!seen.has(envStripped)) (commandsToTry.push(envStripped), seen.add(envStripped));
        let wrapperStripped = stripSafeWrappers(cmd);
        if (!seen.has(wrapperStripped)) (commandsToTry.push(wrapperStripped), seen.add(wrapperStripped));
      }
      startIdx = endIdx;
    }
  }
  let isCompoundCommand = new Map();
  if (matchMode === "prefix" && !h) {
    for (let cmd of commandsToTry)
      if (!isCompoundCommand.has(cmd)) isCompoundCommand.set(cmd, splitCommand(cmd).length > 1);
  }
  return Array.from(rules.entries())
    .filter(([ke]) => {
      if (HGe(ke))
        return S === "allow" && matchMode === "prefix" && y !== void 0 && matchesCertifiedCommand(ke, y, w);
      let bashRule = parseBashPermissionRule(ke);
      return commandsToTry.some((cmdToMatch) => {
        switch (bashRule.type) {
          case "exact":
            return bashRule.command === cmdToMatch;
          case "prefix": {
            let replaced = bashRule.prefix.replace(/[ \t]+/g, " "),
              replaced_2 = cmdToMatch.replace(/[ \t]+/g, " ");
            switch (matchMode) {
              case "exact":
                return replaced === replaced_2;
              case "prefix": {
                if (isCompoundCommand.get(cmdToMatch)) return !1;
                if (replaced_2 === replaced) return !0;
                if (replaced_2.startsWith(replaced + " ")) return !0;
                let xargsPrefix = "xargs " + replaced;
                if (replaced_2 === xargsPrefix) return !0;
                return replaced_2.startsWith(xargsPrefix + " ");
              }
            }
            break;
          }
          case "wildcard":
            if (matchMode === "exact") return !1;
            if (isCompoundCommand.get(cmdToMatch)) return !1;
            if (yQ(bashRule.pattern, cmdToMatch)) return !0;
            if (S !== "deny" && S !== "ask" && !endsWithUnescapedStar(bashRule.pattern)) return !1;
            return yQ(`xargs ${bashRule.pattern}`, cmdToMatch);
        }
      });
    })
    .map(([, ke]) => ke);
}
/**
 * 对输入分别求匹配的 deny、ask、allow 规则（deny/ask 剥离全部 env 与包装、不做复合检查；allow 不剥离）。
 */
//@ chunk-e6aww6q8.js:1174805-1175298 fingerprint = matchingRulesForInput (0.781)
function matchingRulesForInput(
  input,
  toolPermissionContext,
  matchMode,
  { skipCompoundCheck: s = !1, astCommand: h, compoundBareAssignmentNames: y = [] } = {},
) {
  let denyRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "deny"),
    matchingDenyRules = filterRulesByContentsMatchingInput(input, denyRuleByContents, matchMode, {
      stripAllEnvVars: !0,
      skipCompoundCheck: !0,
      astCommand: h,
      ruleBehavior: "deny",
    }),
    askRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "ask"),
    matchingAskRules = filterRulesByContentsMatchingInput(input, askRuleByContents, matchMode, {
      stripAllEnvVars: !0,
      skipCompoundCheck: !0,
      astCommand: h,
      ruleBehavior: "ask",
    }),
    allowRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "allow"),
    matchingAllowRules = filterRulesByContentsMatchingInput(input, allowRuleByContents, matchMode, {
      skipCompoundCheck: s,
      ruleBehavior: "allow",
      astCommand: h,
      compoundBareAssignmentNames: y,
    });
  return {
    matchingDenyRules: matchingDenyRules,
    matchingAskRules: matchingAskRules,
    matchingAllowRules: matchingAllowRules,
  };
}
/**
 * 检查命令的每个片段是否都被某组规则（会话 allow 规则字符串）覆盖；返回第一个未覆盖的片段或解析失败时的 unverifiable。
 */
//@ chunk-e6aww6q8.js:1175298-1176073 placement
async function findSpanNotCoveredByRuleGroups(e, n) {
  if (n.length === 0) return null;
  let r = { span: e.command.trim(), group: n[0] ?? [], kind: "unverifiable" },
    s = await parseCommandRaw(e.command);
  if (s === PARSE_ABORTED) return r;
  let h = s
    ? parseForSecurityFromAst(e.command, s)
    : { kind: "simple", commands: [], bareAssignmentNames: [] };
  if (h.kind === "too-complex") return r;
  let y = splitCommandStrict(e.command);
  if (y === null || y.length === 0) return r;
  let S = uniq([...y, ...h.commands.map((command) => command.text)]);
  for (let w of n) {
    let L = new Map();
    for (let G of w) {
      let q = permissionRuleValueFromString(G);
      if (q.toolName !== BashTool.name || q.ruleContent === void 0 || q.ruleContent === "") continue;
      L.set(q.ruleContent, { source: "session", ruleBehavior: "allow", ruleValue: q });
    }
    for (let G of S) {
      let q = { ...e, command: G };
      if (!(
        filterRulesByContentsMatchingInput(q, L, "exact", { ruleBehavior: "allow" }).length > 0 ||
        filterRulesByContentsMatchingInput(q, L, "prefix", { ruleBehavior: "allow" }).length > 0
      ))
        return { span: G, group: w, kind: "unmatched" };
    }
  }
  return null;
}
/**
 * 代理带有 bashCommandClamp（限定 Bash 命令形式）时，拒绝通过其他工具面执行 shell。
 */
//@ chunk-e6aww6q8.js:1176073-1176465 placement
function denyForBashCommandClamp(e, n) {
  let bashCommandClamps = getToolPermissionContext(n).bashCommandClamps;
  if (bashCommandClamps !== void 0 && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message:
        `Permission to use ${e} has been denied: this agent carries a per-spawn bashCommandClamp, which scopes shell ` +
        "execution to a fixed set of Bash command forms \u2014 this surface " +
        "cannot match them. Use the clamped Bash forms instead.",
      decisionReason: { type: "other", reason: BASH_COMMAND_CLAMP_DENY_REASON },
    };
  return;
}
/**
 * 权限检查本身崩溃且代理带 bashCommandClamp 时直接拒绝，不运行未验证的命令。BashTool.permissionCheckFailureDecision 调用。
 */
//@ chunk-e6aww6q8.js:1176465-1176759 placement
function denyCrashedCheckUnderCommandClamp(e, n) {
  let bashCommandClamps = getToolPermissionContext(n).bashCommandClamps;
  if (bashCommandClamps !== void 0 && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message: `The ${e} permission check crashed and this agent carries a per-spawn bashCommandClamp; denying rather than running an unverified command.`,
      decisionReason: { type: "other", reason: BASH_COMMAND_CLAMP_CRASH_REASON },
    };
  return;
}
/**
 * 精确规则检查：deny→拒绝、ask→询问、allow→允许，否则 passthrough 并附精确命令的规则建议。
 */
//@ chunk-e6aww6q8.js:1176759-1177404 placement = bashToolCheckExactMatchPermission (0.921)
var bashToolCheckExactMatchPermission = (input, toolPermissionContext) => {
  let command = input.command.trim(),
    {
      matchingDenyRules: matchingDenyRules,
      matchingAskRules: matchingAskRules,
      matchingAllowRules: matchingAllowRules,
    } = matchingRulesForInput(input, toolPermissionContext, "exact");
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  if (matchingAskRules[0] !== void 0)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  if (matchingAllowRules[0] !== void 0)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "rule", rule: matchingAllowRules[0] },
    };
  let S = { type: "other", reason: "This command requires approval", bashMissKind: "no-rule-match" };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(BashTool.name, S),
    decisionReason: S,
    suggestions: suggestionForExactCommand(command),
  };
};
//@ chunk-e6aww6q8.js:1177404-1177633 placement
function readsCodeFromStdin(e) {
  let n = stripWrappersFromArgvForPaths([...e]),
    r = n[0];
  if (r === void 0) return !1;
  let replaced = r.slice(r.lastIndexOf("/") + 1).replace(/[\d.]+$/, "");
  if (!INLINE_CODE_FLAGS.has(replaced)) return !1;
  let sliced = n.slice(1);
  if (sliced.includes("-")) return !0;
  return sliced.every((y) => y.startsWith("-"));
}
/**
 * 对 git 的 -C/--git-dir/--work-tree/--file 路径参数检查工作目录外读取限制：命中拒绝规则直接 deny，越界或无法判定时给出 ask。
 */
//@ chunk-e6aww6q8.js:1177633-1178453 placement
function checkGitPathArgsForReadBlock(commandName, paths, cwd, context) {
  let ask;
  for (let y of paths) {
    if (y === "") continue;
    if (containsAnyPlaceholder(y)) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    if (y.startsWith("~") && y !== "~" && !y.startsWith("~/")) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let S = Lu(y);
    if (Qn(S) || firstGlobCharIndex(S) !== -1) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let w = isAbsolute_20(S) ? S : resolve_17(cwd, S);
    if (!hasInteriorDotDot(S) && !getFsImplementation().existsSync(w)) continue;
    let L = validatePath(y, cwd, context, "read");
    if (L.allowed) continue;
    if (L.decisionReason?.type === "rule")
      return {
        behavior: "deny",
        message: `${commandName} in '${L.resolvedPath}' was blocked by a deny rule`,
        decisionReason: L.decisionReason,
      };
    if (isOutsideReadsBlockedAsk(L.decisionReason)) {
      ask ??= {
        behavior: "ask",
        message: `${commandName} names '${L.resolvedPath}', outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
        decisionReason: L.decisionReason,
      };
      continue;
    }
    ask ??= outsideReadsRuntimePathAsk(commandName);
  }
  return ask;
}
/**
 * 检查单个命令是否会读取工作目录外路径（permissions.blockReadsOutsideWorkingDirectories）：处理 env 赋值、git 路径选项、从 stdin/内联执行代码、xargs，以及各参数（含 --opt=路径、glob、~）的路径校验，返回 deny/ask 或 undefined。
 */
//@ chunk-e6aww6q8.js:1178560-1181654 sole-consumer
function checkCommandAgainstReadBlock(command, cwd, context, requireAbsolute, trustedInline) {
  if (!command) return;
  let y = command.argv[0] ?? "";
  if (
    !trustedInline &&
    y.slice(y.lastIndexOf("/") + 1) === "env" &&
    command.argv.slice(1).some((Z) => {
      let match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(Z);
      return match !== null && !isSafeEnvAssignment(match[1], Z.slice(match[0].length));
    })
  )
    return outsideReadsTooComplexAsk(
      "an environment variable assignment outside the safe list cannot be checked against the read block",
    );
  let argv = stripWrappersFromArgvForPaths([...command.argv]),
    w = argv[0];
  if (w === void 0) return;
  let commandName = w.slice(w.lastIndexOf("/") + 1);
  if (commandName === "git") {
    let Z = [];
    for (let Se = 1; Se < argv.length; Se++) {
      let ke = argv[Se];
      if (
        (ke === "-C" || ke === "--git-dir" || ke === "--work-tree" || ke === "--file" || ke === "-f") &&
        argv[Se + 1] !== void 0
      )
        (Z.push(argv[Se + 1]), Se++);
      else if (/^--(git-dir|work-tree|file)=/.test(ke)) Z.push(ke.slice(ke.indexOf("=") + 1));
      else if (ke.startsWith("-C") && ke.length > 2) Z.push(ke.slice(2));
    }
    return Z.length === 0 ? void 0 : checkGitPathArgsForReadBlock(commandName, Z, cwd, context);
  }
  if (Object.hasOwn(PATH_EXTRACTORS, w) || READ_BLOCK_EXEMPT_COMMANDS.has(commandName)) return;
  let inlineCodeFlags = INLINE_CODE_FLAGS.get(commandName.replace(/[\d.]+$/, ""));
  if (!trustedInline && inlineCodeFlags !== void 0 && argv.slice(1).includes("-"))
    return outsideReadsTooComplexAsk(
      `${commandName} runs code from stdin, which cannot be checked against the read block`,
    );
  if (commandName === "xargs") return outsideReadsRuntimePathAsk(commandName);
  if (
    !trustedInline &&
    inlineCodeFlags !== void 0 &&
    argv
      .slice(1)
      .some(
        (Z) =>
          inlineCodeFlags.has(Z) ||
          [...inlineCodeFlags].some((Se) =>
            Se.startsWith("--")
              ? Z.startsWith(Se + "=")
              : Z.startsWith("-") && !Z.startsWith("--") && Z.length > 2 && Z.includes(Se.slice(1)),
          ),
      )
  )
    return outsideReadsTooComplexAsk(
      `${commandName} runs inline code, which cannot be checked against the read block`,
    );
  let ask;
  for (let Z of argv.slice(1)) {
    if (Z === "") continue;
    if (containsAnyPlaceholder(Z)) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let index = Z.indexOf("="),
      ke = Z.startsWith("-")
        ? index > 0
          ? [Z.slice(index + 1)]
          : !Z.startsWith("--") && Z.length > 2
            ? [Z.slice(2)]
            : []
        : index > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(Z.slice(0, index))
          ? [Z, Z.slice(index + 1)]
          : [Z];
    for (let we of ke) {
      if (we === "") continue;
      if (we.startsWith("~") && we !== "~" && !we.startsWith("~/")) {
        ask ??= outsideReadsRuntimePathAsk(commandName);
        continue;
      }
      let Ee = Lu(we);
      if (Qn(Ee)) {
        ask ??= outsideReadsRuntimePathAsk(commandName);
        continue;
      }
      if (requireAbsolute && !isAbsolute_20(Ee)) {
        ask ??= outsideReadsRuntimePathAsk(commandName);
        continue;
      }
      let Ae = we,
        Ie = firstGlobCharIndex(Ee);
      if (Ie !== -1) {
        let sliced = Ee.slice(0, Ie);
        if (
          ((Ae = sliced.endsWith("/") ? sliced : dirname_27(sliced)),
          shellPathSegments(Ee).some((Je) => urlPatternToRegex(Je)) || globBeforeInteriorDotDot(Ee))
        ) {
          let Je = validatePath(Ae, cwd, context, "read");
          if (!Je.allowed && Je.decisionReason?.type === "rule")
            return {
              behavior: "deny",
              message: `${commandName} in '${Je.resolvedPath}' was blocked by a deny rule`,
              decisionReason: Je.decisionReason,
            };
          ask ??= outsideReadsRuntimePathAsk(commandName);
          continue;
        }
      }
      let Me = Lu(Ae),
        We = isAbsolute_20(Me) ? Me : resolve_17(cwd, Me);
      if (!hasInteriorDotDot(Me) && !getFsImplementation().existsSync(We)) continue;
      let ze = validatePath(Ae, cwd, context, "read");
      if (ze.allowed) continue;
      if (ze.decisionReason?.type === "rule")
        return {
          behavior: "deny",
          message: `${commandName} in '${ze.resolvedPath}' was blocked by a deny rule`,
          decisionReason: ze.decisionReason,
        };
      if (isOutsideReadsBlockedAsk(ze.decisionReason)) {
        ask ??= {
          behavior: "ask",
          message: `${commandName} names '${ze.resolvedPath}', outside the working directories, which the read block does not allow without asking (permissions.blockReadsOutsideWorkingDirectories). Add the directory with /add-dir, or remove that setting.`,
          decisionReason: ze.decisionReason,
        };
        continue;
      }
      ask ??= {
        behavior: "ask",
        message: `${commandName} names '${Ae}', which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`,
        decisionReason: {
          type: "safetyCheck",
          reason: `${commandName} names '${Ae}', which cannot be checked against the read block (permissions.blockReadsOutsideWorkingDirectories)`,
          classifierApprovable: !1,
          circuitBreaker: "outsideReadsBlocked",
        },
      };
    }
  }
  return ask;
}
//@ chunk-e6aww6q8.js:1181654-1181714 affinity
function isSandboxReadBlockEnforceable(e) {
  return (
    !isHttpMcpServeInvocation() &&
    e.servedCall !== !0 &&
    sandboxReadBlockApplies() &&
    hasBlockReadsOutsideWorkingDirectories()
  );
}
/**
 * 单个子命令的权限判定：精确规则 → 前缀/通配规则 → 路径约束（checkPathConstraints）→ 读封锁下的 sed/env/读命令检查 → allow 规则 → sed 约束 → 权限模式（acceptEdits）→ 只读命令自动允许；否则 passthrough 并给出前缀建议。
 */
//@ chunk-e6aww6q8.js:1181714-1183399 fingerprint = bashToolCheckPermission (0.772)
var bashToolCheckPermission = (e, n, r, s, h = getCwd(), y = [], S, w) => {
  let command = e.command.trim(),
    exactMatchResult = bashToolCheckExactMatchPermission(e, n);
  if (exactMatchResult.behavior === "deny" || exactMatchResult.behavior === "ask") return exactMatchResult;
  let {
    matchingDenyRules: matchingDenyRules,
    matchingAskRules: matchingAskRules,
    matchingAllowRules: matchingAllowRules,
  } = matchingRulesForInput(e, n, "prefix", {
    skipCompoundCheck: s !== void 0,
    astCommand: s,
    compoundBareAssignmentNames: y,
  });
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${command} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  if (matchingAskRules[0] !== void 0)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  let ke = checkPathConstraints(e, h, n, r, s?.redirects, s ? [s] : void 0, S);
  if (ke.behavior === "deny" || (ke.behavior === "ask" && !ke.bashAllowRuleOverridable)) return ke;
  if (n.blockReadsOutsideWorkingDirectories === !0) {
    let ze = checkSedConstraints(e, n);
    if (ze.behavior === "ask" && isOutsideReadsBlockedAsk(ze.decisionReason)) return ze;
  }
  if (n.blockReadsOutsideWorkingDirectories === !0) {
    if (hasUnsafeEnvVarPrefix(e, s) && !(shouldUseSandbox(e) && isSandboxReadBlockEnforceable(n)))
      return outsideReadsTooComplexAsk(
        "an environment variable prefix outside the safe list cannot be checked against the read block",
      );
    let ze = checkCommandAgainstReadBlock(
      s,
      h,
      n,
      r === !0,
      shouldUseSandbox(e) && isSandboxReadBlockEnforceable(n),
    );
    if (ze) return ze;
  }
  if (exactMatchResult.behavior === "allow") return exactMatchResult;
  if (matchingAllowRules[0] !== void 0)
    return {
      behavior: "allow",
      updatedInput: e,
      decisionReason: { type: "rule", rule: matchingAllowRules[0] },
    };
  if (ke.behavior === "ask") return ke;
  let sedConstraintResult = checkSedConstraints(e, n);
  if (sedConstraintResult.behavior !== "passthrough") return sedConstraintResult;
  let modeResult = checkPermissionMode(e, n);
  if (modeResult.behavior !== "passthrough") return modeResult;
  let Ae = lazySessionEnvVarNames(w && RA(w)),
    Ie = hasBashDenyRule(n) && hasZshDangerousCommand(e.command),
    Me = s !== void 0 && Ize(s);
  if (
    !Ie &&
    !Me &&
    BashTool.isReadOnly(e, w) &&
    !hasUnsafeEnvVarPrefix(e, s) &&
    !hasRiskyBareAssignment(y, Ae)
  )
    return {
      behavior: "allow",
      updatedInput: e,
      decisionReason: { type: "other", reason: READ_ONLY_AUTO_ALLOW_REASON },
    };
  let We = { type: "other", reason: "This command requires approval", bashMissKind: "no-rule-match" };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(BashTool.name, We),
    decisionReason: We,
    suggestions: suggestionForExactCommand(command),
  };
};
/**
 * 对子命令跑 bashToolCheckPermission，passthrough 时用前缀提取器给出的 commandPrefix 生成建议规则。
 */
//@ chunk-e6aww6q8.js:1183399-1183707 layout
async function checkSubcommandPermissionWithSuggestions(e, n, r, s, h, y, S = [], w) {
  let L = bashToolCheckExactMatchPermission(e, n);
  if (L.behavior === "deny" || L.behavior === "ask") return L;
  let G = bashToolCheckPermission(e, n, s, h, y, S, void 0, w);
  if (G.behavior === "deny" || G.behavior === "ask") return G;
  if (G.behavior === "allow") return G;
  let q = r?.commandPrefix ? suggestionForPrefix(r.commandPrefix) : suggestionForExactCommand(e.command);
  return { ...G, suggestions: q };
}
//@ chunk-e6aww6q8.js:1183707-1183928 layout
var INTERPRETER_COMMANDS = new Set(["python", "python3", "node", "bun", "deno", "ruby", "perl"]),
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
  ]),
  INNER_WHITESPACE_RE = /[^ \t\n][ \t\n]+[^ \t\n]/;
/**
 * 沙箱开启且"沙箱内自动允许"打开时，对已解析的简单命令判断能否自动允许：排除危险 env 赋值、UNC 路径、/dev/tcp 重定向、cd 与 rm 组合、危险删除路径等，满足则返回规则检查结果（allow/ask/deny）。
 */
//@ chunk-e6aww6q8.js:1183928-1185390 layout
function checkSandboxAutoAllowForAst(e, n, r, s, h) {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    !SandboxManager.isAutoAllowBashIfSandboxedEnabled() ||
    !shouldUseSandbox(e) ||
    isSandboxAutoAllowOff(n) ||
    antDisabledListMatchesCommandText(e.command) ||
    (n.blockReadsOutsideWorkingDirectories === !0 && !isSandboxReadBlockEnforceable(n))
  )
    return null;
  let y = checkRulesForSandboxAutoAllow(e, n, r);
  if (y.behavior === "passthrough") return null;
  let S = lazySessionEnvVarNames(RA(h)),
    w =
      hasRiskyBareAssignment(s, S) ||
      r.some((Z) => {
        let Se = stripWrappersFromArgvForPaths(Z.argv),
          ke = Z.argv.length - Se.length + 1,
          we =
            INTERPRETER_COMMANDS.has(Se[0] ?? "") &&
            getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_larkspur", !0)
              ? ke
              : Number.POSITIVE_INFINITY,
          Ee =
            Se[0] === "dd" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_sorrel", !0)
              ? ke
              : Number.POSITIVE_INFINITY;
        return (
          Z.envVars.some(
            (envVar) =>
              !isSafeEnvAssignment(envVar.name, envVar.value) &&
              (!INTERPRETER_COMMANDS.has(Z.argv[0] ?? "") ||
                isAssignmentNameUnsafeForSandbox(envVar.name) ||
                cSe(envVar.name) ||
                DNe(envVar.name) ||
                !getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_plover", !0) ||
                getEffectiveFilesystemPolicy() === "relaxed" ||
                !SandboxManager.isUnsandboxedFallbackClosedByTrustedSource()),
          ) ||
          Z.argv.slice(1).some(isTildeUserPath) ||
          Z.redirects.some((redirect) => redirect.op === "<" && isTildeUserPath(redirect.target)) ||
          Z.argv.some((Ae, Ie) => {
            if (!Ae.includes("=") || Ae.startsWith("-")) return !1;
            let index = Ae.indexOf("=");
            if (
              Ie >= Ee &&
              DD_OPERAND_KEYS.has(Ae.slice(0, index)) &&
              !Ae.slice(index + 1)
                .split(":")
                .some(isTildeUserPath)
            )
              return !1;
            let We = Ae[index - 1] === "+" ? Ae.slice(0, index - 1) : Ae.slice(0, index);
            if (Ie >= we && INNER_WHITESPACE_RE.test(We)) return !1;
            return !isSafeEnvAssignment(We, Ae.slice(index + 1));
          })
        );
      }),
    any = r.some((Z) => Z.redirects.some((redirect) => /^\/dev\/(tcp|udp)\//.test(redirect.target)));
  if (w || any) return null;
  let G = !1,
    q = !1;
  for (let Z of r) {
    let [Se, ...ke] = stripWrappersFromArgvForPaths(Z.argv),
      we = Se?.replace(/^.*[\\/]/, "");
    if (we === "cd" || we === "pushd" || we === "popd" || we === "chdir") {
      G = !0;
      continue;
    }
    if (we !== "rm" && we !== "rmdir") continue;
    if (((q = !0), checkDangerousRemovalPaths(we, ke, getCwd(), n).behavior !== "passthrough")) return null;
  }
  if (G && q) return null;
  return y;
}
/**
 * AST 过于复杂时的沙箱自动允许：逐个片段检查 deny/ask 规则，再用一长串启发式（heredoc、${!x}、/proc/*\/environ、引号/展开、test/find/jobs/print/set 的危险用法）排除，全部通过则 allow（有 ask 规则则 ask）。
 */
//@ chunk-e6aww6q8.js:1185390-1188803 fingerprint = checkSandboxAutoAllow (0.592)
function checkSandboxAutoAllow(e, n, r) {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    !SandboxManager.isAutoAllowBashIfSandboxedEnabled() ||
    !shouldUseSandbox(e) ||
    isSandboxAutoAllowOff(n) ||
    antDisabledListMatchesCommandText(e.command) ||
    (n.blockReadsOutsideWorkingDirectories === !0 && !isSandboxReadBlockEnforceable(n))
  )
    return null;
  if (r === void 0 || r === "PARSE_ABORT" || r === "ERROR") return null;
  if (/(?<!<)<<(?!<)/.test(e.command)) return null;
  if (/\$\{[\s|]/.test(e.command.replace(/['"\\]/g, ""))) return null;
  if (/\$\{![A-Za-z_0-9]/.test(e.command.replace(/['"\\]/g, ""))) return null;
  if (/\/proc\/.*\/environ/.test(e.command.replace(/['"\\]/g, ""))) return null;
  if (hasZshExecutableParenInBraceExpansion(e.command)) return null;
  let s = splitCommandStrict(e.command);
  if (s === null || s.length === 0) return null;
  let h;
  for (let y of s) {
    let { matchingDenyRules: matchingDenyRules, matchingAskRules: matchingAskRules } = matchingRulesForInput(
      { ...e, command: y },
      n,
      "prefix",
    );
    if (matchingDenyRules[0] !== void 0)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${e.command.trim()} has been denied.`,
        decisionReason: { type: "rule", rule: matchingDenyRules[0] },
      };
    h ??= matchingAskRules[0];
  }
  for (let y of s) {
    let filtered = y.trim().split(/\s+/).filter(Boolean),
      subcommands = stripSafeLeadingAssignments(filtered);
    if (subcommands === null) return null;
    if (subcommands.length === 0) continue;
    let L = stripWrappersFromArgvForPaths(subcommands),
      sliced = subcommands.slice(0, subcommands.length - L.length);
    if (sliced.some((Ee) => /["'`$\\(){}|;&<>*?[\]]/.test(Ee))) return null;
    if (
      sliced.some((Ee) => {
        let match = Ee.match(/^([A-Za-z_]\w*)\+?=/);
        return match !== null && isAssignmentNameUnsafeForSandbox(match[1]);
      })
    )
      return null;
    let mapped = L.map((Ee) => Ee.replace(/['"\\]/g, ""));
    if (
      mapped.some((Ee) => {
        let match = Ee.match(/^([A-Za-z_]\w*)\+?=/);
        return match !== null && isAssignmentNameUnsafeForSandbox(match[1]);
      })
    )
      return null;
    let any = L.some((Ee, Ae) => {
        if (Ae === 0) return !1;
        if ((Ee.includes("$'") && !/^'[^']*\$'$/.test(Ee)) || (Ee.includes('$"') && !/^"[^"]*\$"$/.test(Ee)))
          return !0;
        let Ie = mapped[Ae];
        return (
          Ie.includes("`") ||
          /\$\((?!\()/.test(Ie) ||
          (/\$[^(\s]/.test(Ie) && Ie.includes("-")) ||
          /\$\{[^}]*:?[+=]/.test(Ie) ||
          /\{[^\s]*(,|\.\.)/.test(Ee) ||
          (Ie.match(/\{/g) ?? []).length !== (Ie.match(/\}/g) ?? []).length
        );
      }),
      any_2 = mapped.some((Ee, Ae) => Ae > 0 && Ee.includes("$")),
      any_3 = L.some((Ee, Ae) => Ae > 0 && (/[<>]/.test(Ee) || Ee.endsWith("\\"))),
      we = L[0];
    if (
      we === void 0 ||
      !/^[A-Za-z0-9._/~+][A-Za-z0-9._/~+-]*$/.test(we) ||
      isSandboxAutoAllowUnsafeBase(we) ||
      WRAPPER_COMMAND_NAMES.has(we) ||
      WRAPPER_COMMAND_NAMES.has(we.replace(/^.*[\\/]/, "")) ||
      (EXPANSION_SENSITIVE_BUILTINS.has(we) &&
        (any || mapped.some((Ee) => Ee.includes("[") && /[$`]/.test(Ee)))) ||
      (we === "test" &&
        (any ||
          any_3 ||
          mapped.some((Ee) => Ee === "-t" || TEST_ARITH_CMP_OPS.has(Ee)) ||
          mapped.some(
            (Ee, Ae) => Ae > 0 && Ee.includes("$") && (mapped.length > 4 || Ae === mapped.length - 2),
          ))) ||
      we === "jq" ||
      AWK_NAMES.has(we) ||
      (we === "find" &&
        (any ||
          any_3 ||
          (() => {
            let Ee = !1;
            for (let Ae = 1; Ae < mapped.length; Ae++) {
              let Ie = mapped[Ae],
                Me = Ee;
              if (((Ee = !1), isFindDangerousAction(Ie))) return !0;
              if (isAmbiguousFindWord(Ie) || (L[Ae] !== Ie && findWordTakesOperand(Ie))) return !0;
              if (!Me && findWordTakesFlagValue(L[Ae])) {
                Ee = !0;
                continue;
              }
              if (!Me && findWordTakesOperand(L[Ae])) {
                let We = mapped[Ae + 1],
                  matches = /^'[^']*'$|^"[^"]*"$/.test(L[Ae + 1] ?? "");
                if (We !== void 0 && /[[\]*?]/.test(We) && !matches) return !0;
                if (We !== void 0 && (!We.includes("$") || (matches && /^\$\{?[A-Za-z_]\w*\}?$/.test(We)))) {
                  Ae++;
                  continue;
                }
              }
              if (Ie.includes("$") || /[[\]*?]/.test(Ie)) return !0;
            }
            return !1;
          })())) ||
      (we === "jobs" && (any || any_2 || any_3 || mapped.some((Ee) => /^-[^-]*x/.test(Ee)))) ||
      (we === "print" &&
        (any ||
          (any_2 && /^[+-]|\$/.test(mapped[1] ?? "")) ||
          any_3 ||
          /\\['"]/.test(y) ||
          /[[\]*?]/.test(y.replace(/'[^']*'|"[^"]*"/g, "")) ||
          mapped.some((Ee) => PRINT_PROMPT_FLAG.test(Ee)))) ||
      (we === "set" &&
        (any ||
          any_3 ||
          (() => {
            for (let Ee = 1; Ee < mapped.length; Ee++) {
              let Ae = mapped[Ee];
              if (Ae === "--") return !1;
              if (Ae.includes("$")) return !0;
              if (!/^[-+]/.test(Ae)) continue;
              for (let Ie = 1; Ie < Ae.length; Ie++) {
                let Me = Ae[Ie];
                if (Me === "o") {
                  let We = Ie < Ae.length - 1 ? Ae.slice(Ie + 1) : mapped[Ee + 1];
                  if (
                    We !== void 0 &&
                    We !== "" &&
                    !SET_O_SAFE_OPTS.has(We.toLowerCase().replace(/[_-]/g, ""))
                  )
                    return !0;
                  break;
                }
                if (Me === "A") break;
                if (!SET_O_SAFE_LETTERS.has(Me)) return !0;
              }
            }
            return !1;
          })()))
    )
      return null;
  }
  if (h)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: { type: "rule", rule: h },
    };
  return {
    behavior: "allow",
    updatedInput: e,
    decisionReason: { type: "other", reason: SANDBOX_AUTO_ALLOW_REASON },
  };
}
//@ chunk-e6aww6q8.js:1188803-1188958 layout
var EXPANSION_SENSITIVE_BUILTINS = new Set([
    "printf",
    "test",
    "read",
    "wait",
    "unset",
    ...DECLARATION_LIKE_BUILTINS,
  ]),
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
/**
 * 剥离 argv 开头的 VAR=value；遇到危险变量或值含元字符返回 null。
 */
//@ chunk-e6aww6q8.js:1188958-1189178 layout
function stripSafeLeadingAssignments(e) {
  let n = 0;
  while (n < e.length) {
    let match = e[n].match(/^([A-Za-z_][A-Za-z0-9_]*)\+?=(.*)$/);
    if (match === null) break;
    if (isAssignmentNameUnsafeForSandbox(match[1])) return null;
    if (/["'`$\\(){}|;&<>*?[\]]/.test(match[2])) return null;
    n++;
  }
  return n === 0 ? e : e.slice(n);
}
/**
 * 对整条命令和每个 AST 子命令查 prefix deny/ask 规则；没有命中则以"沙箱自动允许"理由 allow。
 */
//@ chunk-e6aww6q8.js:1189178-1190057 layout = checkSemanticsDeny (0.881)
function checkRulesForSandboxAutoAllow(input, toolPermissionContext, commands) {
  let trimmed = input.command.trim(),
    { matchingDenyRules: matchingDenyRules, matchingAskRules: matchingAskRules } = matchingRulesForInput(
      input,
      toolPermissionContext,
      "prefix",
      { astCommand: commands.length === 1 ? commands[0] : void 0 },
    );
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${trimmed} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  if (commands.length > 1 || commands[0]?.text !== trimmed) {
    let S;
    for (let cmd of commands) {
      let L = matchingRulesForInput({ command: cmd.text }, toolPermissionContext, "prefix", {
        astCommand: cmd,
      });
      if (L.matchingDenyRules[0] !== void 0)
        return {
          behavior: "deny",
          message: `Permission to use ${BashTool.name} with command ${trimmed} has been denied.`,
          decisionReason: { type: "rule", rule: L.matchingDenyRules[0] },
        };
      S ??= L.matchingAskRules[0];
    }
    if (S)
      return {
        behavior: "ask",
        message: createPermissionRequestMessage(BashTool.name),
        decisionReason: { type: "rule", rule: S },
      };
  }
  if (matchingAskRules[0] !== void 0)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  return {
    behavior: "allow",
    updatedInput: input,
    decisionReason: { type: "other", reason: SANDBOX_AUTO_ALLOW_REASON },
  };
}
/**
 * 过滤掉 "cd <当前目录>" 这种无效 cd 子命令（参数是纯路径、无 env/重定向/通配），返回剩余子命令及对应 AST。
 */
//@ chunk-e6aww6q8.js:1190057-1190400 fingerprint = filterCdCwdSubcommands (0.641)
function filterCdCwdSubcommands(rawSubcommands, astCommands, cwd, cwdMingw) {
  let h = [],
    y = [];
  for (let S = 0; S < rawSubcommands.length; S++) {
    let cmd = rawSubcommands[S],
      L = astCommands?.[S];
    if (
      ((cmd === `cd ${cwd}` && isPlainPathToken(cwd)) ||
        (cmd === `cd ${cwdMingw}` && isPlainPathToken(cwdMingw))) &&
      L !== void 0 &&
      L.argv.length === 2 &&
      L.argv[0] === "cd" &&
      L.envVars.length === 0 &&
      L.redirects.length === 0 &&
      !/[*?[\]]/.test(L.argv[1]) &&
      !containsAnyPlaceholder(L.argv[1])
    )
      continue;
    (h.push(cmd), y.push(L));
  }
  return { subcommands: h, astCommandsByIdx: y };
}
/**
 * 字符串是否是不含空白、引号、通配、元字符的纯路径（用于识别无效的 cd <cwd>）。
 */
//@ chunk-e6aww6q8.js:1190400-1190458 placement
function isPlainPathToken(e) {
  return !/[\s\\$`'"*?[\]{}<>|&;()]/.test(e);
}
/**
 * 命令是否只由 && 连接（不含 ||、;、换行、单个 &）。
 */
//@ chunk-e6aww6q8.js:1190458-1190605 placement
function isSimpleAndChain(e) {
  if (e.includes("||") || e.includes(";")) return !1;
  if (
    e.includes(`
`)
  )
    return !1;
  if (e.replaceAll("&&", "").includes("&")) return !1;
  return !0;
}
/**
 * 对整条命令做提前检查：prefix deny → 拒绝；精确 deny → 拒绝；prefix ask → 询问；精确匹配非 passthrough 时返回它；否则 null。
 */
//@ chunk-e6aww6q8.js:1197312-1197749 fingerprint = checkEarlyExitDeny (0.959)
function checkEarlyExitDeny(input, toolPermissionContext) {
  let { matchingDenyRules: matchingDenyRules, matchingAskRules: matchingAskRules } = matchingRulesForInput(
    input,
    toolPermissionContext,
    "prefix",
  );
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  let exactMatchResult = bashToolCheckExactMatchPermission(input, toolPermissionContext);
  if (exactMatchResult.behavior === "deny") return exactMatchResult;
  if (matchingAskRules[0] !== void 0)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  if (exactMatchResult.behavior !== "passthrough") return exactMatchResult;
  return null;
}
/**
 * 读封锁开关打开时返回 mayBeUnset(name) 判定器，用于估计变量在运行时是否可能为空（TMPDIR 在沙箱中视为已设置）。
 */
//@ chunk-e6aww6q8.js:1197749-1198003 sole-consumer
function createEnvUnsetOracle(e, n) {
  if (!Z7()) return;
  return {
    mayBeUnset: (r) => {
      if (e) return !0;
      if (r === "TMPDIR" && SandboxManager.isSandboxingEnabled()) return !1;
      let s = process.env[r];
      if (typeof s === "string") return s === "";
      return /^(?:TMPDIR|TMP|TEMP)$/.test(r) || qhe(RA(n))?.has(r) !== !0 || Sqt(r);
    },
  };
}
/**
 * 检测命令中可能展开为空的变量导致 rm 等危险删除（如 rm -rf $DIR/），命中时记录遥测并返回危险项。
 */
//@ chunk-e6aww6q8.js:1198003-1198326 sole-consumer
function findDangerousVariableRemoval(e, n, r, s, h, y) {
  let S = createEnvUnsetOracle(s, h);
  if (S === void 0) return n ? null : findDangerousVariableRemovalInText(e);
  let w = findDangerousVariableRemovalInText(e, {
    ...S,
    wholeCommand: r,
    skipAssignedOriginalHits: n,
    assignments: y,
  });
  if (w === null) return null;
  if (w.rootChild !== void 0) DH("var_root_child");
  else if (w.derived !== void 0) DH("derived_var");
  else if (n || findDangerousVariableRemovalInText(e) === null) DH("eval_trap_string");
  return w;
}
/**
 * AST 过于复杂（too-complex）时的拒绝路径：整命令/各片段的 deny 规则、读封锁、空变量删除、AST 上的危险删除检查；只有精确 allow 规则覆盖整条命令时才返回 allow。
 */
//@ chunk-e6aww6q8.js:1198326-1199186 sole-consumer = checkSemanticsDeny (0.783)
async function checkTooComplexCommandDeny(e, n, r, s, h, y, S, w) {
  let fullCmd = checkEarlyExitDeny(e, n);
  if (fullCmd?.behavior === "deny") return fullCmd;
  if (getContentRulesMapForTool(n, BashTool, "deny").size > 0) {
    let Se = new Set([
      ...splitCommand(e.command),
      ...(r && r !== PARSE_ABORTED ? nestedCommandSpansFromAst(r) : []),
    ]);
    for (let cmd of Se) {
      let subDeny = matchingRulesForInput({ ...e, command: cmd }, n, "prefix").matchingDenyRules[0];
      if (subDeny !== void 0)
        return {
          behavior: "deny",
          message: `Permission to use ${BashTool.name} with command ${e.command} has been denied.`,
          decisionReason: { type: "rule", rule: subDeny },
        };
    }
  }
  let G = s?.();
  if (G) return G;
  let q = findDangerousVariableRemoval(e.command, !1, h, y, w);
  if (q !== null)
    return (
      logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", { kind: fromEnum("emptyVariable") }),
      checkDangerousRemoval(q, !1)
    );
  if (r && r !== PARSE_ABORTED) {
    let Se = await checkDangerousRemovals(r, getCwd(), n, h, y, S, w);
    if (Se !== null)
      return (
        logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", { kind: fromEnum(Se.kind) }),
        Se.result
      );
  }
  if (fullCmd === null || fullCmd.behavior !== "allow") return fullCmd;
  return (fullCmd.decisionReason?.type === "rule"
    ? fullCmd.decisionReason.rule.ruleValue.ruleContent
    : void 0) === e.command.trim()
    ? fullCmd
    : null;
}
//@ chunk-e6aww6q8.js:1199186-1199290 sole-consumer
function isMountedDriveAsk(e) {
  return (
    e.behavior === "ask" &&
    classifyRemovalReason(findSafetyCheckReason(e.decisionReason)?.reason ?? "") === "mounted_drive_path"
  );
}
//@ chunk-e6aww6q8.js:1199290-1199410 sole-consumer
function preferEarlierAsk(e, n) {
  return e !== void 0 &&
    findSafetyCheckReason(n.result.decisionReason, (r) => r.circuitBreaker === "dangerousRemoval") === void 0
    ? e
    : n;
}
/**
 * 检查命令（含命令替换、嵌套命令）中的危险 rm/rmdir：空变量展开、字面目标、替换输出为空时的目标、整段替换作为递归删除目标、内联 shell 脚本；返回 {result, kind} 或 null。
 */
//@ chunk-e6aww6q8.js:1199410-1203520 sole-consumer
async function checkDangerousRemovals(node, cwd, context, commandText, h, y, S) {
  let substitutions = [],
    L = (Me) => {
      let text = Me.text,
        ze = funsubBodyFromNode(Me);
      if (Me.type === "command_substitution" || Me.type === "process_substitution" || ze !== null) {
        let Je =
            text.startsWith("$(") || text.startsWith("<(") || text.startsWith(">(")
              ? 2
              : text.startsWith("`")
                ? 1
                : 0,
          nt = text.endsWith(")") || text.endsWith("`") ? text.length - 1 : text.length;
        substitutions.push(ze ?? text.slice(Je, nt).trim());
      }
      for (let lt of Me.children) if (lt) L(lt);
    };
  L(node);
  let G = createEnvUnsetOracle(h, S),
    q = G === void 0 ? void 0 : describeCommandSubstitution(commandText ?? node.text, G.mayBeUnset),
    Z = node.keywordAfterPrefix === !0;
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
  let Se = Z ? nestedCommandSpansOrOverrun(node, { unparsedBodyOverruns: !0 }) : [];
  if (Se === null)
    return {
      result: dangerousRemovalAsk(
        "rm",
        "This command could not be fully checked for dangerous rm operations: not all of its nested commands or function substitutions could be analyzed. This requires explicit approval.",
        "not ruled out \u2014 some nested commands or function substitutions could not be analyzed",
      ),
      kind: "nestedSpansOverrun",
    };
  let ke = Se ?? [],
    any = ke.some((Me) => oT(Me.trim())),
    Ee = commandHasAnyCd(node.text) || substitutions.some((Me) => commandHasAnyCd(Me)) || any,
    Ae = Ee
      ? [
          ...[node.text, ...substitutions]
            .flatMap((Me) => {
              try {
                return splitCommand(Me);
              } catch {
                return [Me];
              }
            })
            .map((Me) => Me.trim())
            .filter((Me) => oT(Me))
            .map((Me) => ({ text: Me, cd: !0, names: [], exports: !1 })),
          ...(any ? [TYt] : []),
        ]
      : [],
    softAsk;
  for (let Me of [node.text, ...substitutions]) {
    let We;
    try {
      We = splitCommand(Me);
    } catch {
      We = [Me];
    }
    if (Me === node.text && ke.length > 0) We = uniq([...We, ...ke]);
    for (let ze of We) {
      let trimmed = ze.trim();
      if (
        (trimmed.startsWith("{") && /;?\s*\}$/.test(trimmed)) ||
        (trimmed.startsWith("(") && trimmed.endsWith(")"))
      )
        trimmed = trimmed
          .slice(1)
          .replace(/;?\s*[)}]$/, "")
          .trim();
      let Je = findDangerousVariableRemoval(trimmed, !1, commandText ?? node.text, h, S, q);
      if (Je !== null)
        return preferEarlierAsk(softAsk, { result: checkDangerousRemoval(Je, !0), kind: "emptyVariable" });
      let replaced = trimmed.replace(/`[^`]*`/g, "__CMDSUB__");
      for (let yt = "", gt = 0; yt !== replaced && gt < 16; gt++)
        ((yt = replaced), (replaced = replaced.replace(/\$\([^()]*\)/g, "__CMDSUB__")));
      for (let yt = "", gt = 0; yt !== replaced && gt < 16; gt++)
        ((yt = replaced),
          (replaced = replaced.replace(
            /\$\{(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?!$-]):?[-=+?]"?((?:__CMDSUB__[/*.]*)+)"?\}/g,
            "$1",
          )));
      let pt = replaced !== trimmed,
        Et = await parseForSecurity(replaced, { readsDivergentShapes: !0 });
      if (Et.kind === "simple")
        for (let command of Et.commands) {
          let sliced = command.argv.slice();
          if (sliced[0] !== void 0) sliced[0] = sliced[0].replace(/^.*[\\/]/, "");
          let At = unwrapCommandArgv(stripWrappersFromArgvForPaths(sliced)),
            It = normalizeCommandName(At[0]);
          if (It !== "rm" && It !== "rmdir") continue;
          let sliced_2 = At.slice(1),
            qt = checkDangerousRemovalPaths(It, sliced_2, cwd, context, Ee),
            Zt = isMountedDriveAsk(qt) ? qt : void 0,
            rn = "literalTarget";
          if (qt.behavior === "ask" && Zt === void 0)
            return preferEarlierAsk(softAsk, { result: qt, kind: "literalTarget" });
          if (pt && sliced_2.some((no) => /.(?:__CMDSUB__(?:(?!\.\.)[/*.])*)+(?:\/\.\.)*\/*$/.test(no))) {
            let index = sliced_2.indexOf("--"),
              hn = index === -1 ? sliced_2.length : index,
              ho = sliced_2;
            for (let yn of [!0, !1]) {
              let mapped = sliced_2.map((To, bo) =>
                  yn && bo < hn && To.startsWith("-") && !To.includes("/")
                    ? To
                    : To.replace(/(.)(?:__CMDSUB__(?:(?!\.\.)[/*.])*)+((?:\/\.\.)*)\/*$/, "$1$2"),
                ),
                all = mapped.every((To, bo) => To === ho[bo]);
              if (((ho = mapped), all)) continue;
              let fo = checkDangerousRemovalPaths(It, mapped, cwd, context, Ee);
              if (fo.behavior === "ask" && !isMountedDriveAsk(fo))
                return preferEarlierAsk(softAsk, { result: fo, kind: "emptyExpansion" });
              if (fo.behavior === "ask" && Zt === void 0) ((Zt = fo), (rn = "emptyExpansion"));
            }
          }
          let pn = sliced_2.includes("--") ? sliced_2.slice(0, sliced_2.indexOf("--")) : sliced_2;
          if (
            pt &&
            It === "rm" &&
            pn.some((no) => /^--r/.test(no) || /^-[a-zA-Z]*[rR]/.test(no)) &&
            sliced_2.some((no) => /^(?:__CMDSUB__[/*.]*)+$/.test(no))
          ) {
            let no = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_iridescent_boot", !0);
            if (
              !env.CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT &&
              !(no.value === !1 && no.source === "payload")
            )
              return preferEarlierAsk(softAsk, {
                result: dangerousRemovalAsk(
                  It,
                  "Dangerous rm operation detected: the target is the output of a command substitution (`$(...)` or backticks) and cannot be checked before the command runs. This requires explicit approval and cannot be auto-allowed by permission rules.\n\nRun the substitution on its own first, then remove the literal paths it prints.",
                  "on statically-unresolvable target: command substitution output",
                ),
                kind: "wholeSubstitution",
              });
            logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
              kind: fromEnum("wholeSubstitution"),
            });
          }
          if (Zt !== void 0) softAsk ??= { result: Zt, kind: rn };
        }
    }
  }
  for (let Me of [node.text, ...substitutions]) {
    let We = await checkInlineShellRemoval(Me, y, Me === node.text ? [] : Ae);
    if (We !== null) return preferEarlierAsk(softAsk, { result: We, kind: "inlineShellScript" });
  }
  return softAsk ?? null;
}
//@ chunk-e6aww6q8.js:1203520-1203541 sole-consumer
var IDo = 32,
  DDo = 20000;
/**
 * 语义检查失败时的规则检查：整命令提前检查 + 每个 AST 子命令的 deny 规则；allow 仅当规则内容等于整条命令。
 */
//@ chunk-e6aww6q8.js:1222420-1222925 fingerprint = checkSemanticsDeny (0.891)
function checkSemanticsDeny(input, toolPermissionContext, commands) {
  let fullCmd = checkEarlyExitDeny(input, toolPermissionContext);
  if (fullCmd?.behavior === "deny") return fullCmd;
  for (let cmd of commands) {
    let subDeny = matchingRulesForInput({ ...input, command: cmd.text }, toolPermissionContext, "prefix", {
      astCommand: cmd,
    }).matchingDenyRules[0];
    if (subDeny !== void 0)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
        decisionReason: { type: "rule", rule: subDeny },
      };
  }
  if (fullCmd?.behavior === "allow") {
    if (
      (fullCmd.decisionReason?.type === "rule"
        ? fullCmd.decisionReason.rule.ruleValue.ruleContent
        : void 0) === input.command.trim()
    )
      return fullCmd;
  }
  if (fullCmd?.behavior === "ask") return fullCmd;
  return null;
}
/**
 * tree-sitter 树中是否含 ERROR 节点或不在二元表达式里的后台 &。
 */
//@ chunk-e6aww6q8.js:1222925-1223105 layout
function hasErrorOrBackgroundNode(e) {
  for (let n of e.children) {
    if (!n) continue;
    if (n.type === "ERROR") return !0;
    if (n.type === "&") {
      if (e.type !== "binary_expression") return !0;
      continue;
    }
    if (hasErrorOrBackgroundNode(n)) return !0;
  }
  return !1;
}
/**
 * bashMissKind 分类表：too-complex/semantics/multi-cd/shell-operators/cd-git-compound/process-substitution/loop-later-pass 为结构性原因。
 */
//@ chunk-e6aww6q8.js:1223105-1223554 layout
var STRUCTURAL_MISS_KINDS = {
  "too-complex": !0,
  semantics: !0,
  "multi-cd": !0,
  "shell-operators": !0,
  "cd-git-compound": !0,
  "process-substitution": !0,
  "loop-later-pass": !0,
  "cd-compound-write": !1,
  "cd-compound-read": !1,
  "cd-compound-redirect": !1,
  "dangerous-path": !1,
  "flag-validation": !1,
  "cd-multi-positional": !1,
  "shell-expansion": !1,
  "net-redirect": !1,
  "sed-dangerous": !1,
  "assigned-variable": !1,
  "no-rule-match": !1,
  "ask-rule": !1,
  "working-dir": !1,
  "safety-check": !1,
  "other-untagged": !1,
};
/**
 * 若 ask 结果的 bashMissKind 是结构性原因则返回它。
 */
//@ chunk-e6aww6q8.js:1223554-1223712 layout
function getStructuralMissKind(e) {
  let n = e.behavior === "ask" ? e.decisionReason : void 0;
  return n?.type === "other" && n.bashMissKind !== void 0 && STRUCTURAL_MISS_KINDS[n.bashMissKind]
    ? n.bashMissKind
    : void 0;
}
/**
 * 开启"禁止读工作目录外"且沙箱不能兜底时，把结构性 ask 改成读封锁拒绝。
 */
//@ chunk-e6aww6q8.js:1223712-1223955 layout
function applyReadBlockToStructuralAsk(e, n, r) {
  if (e.behavior !== "ask") return e;
  let decisionReason = e.decisionReason;
  if (
    decisionReason?.type !== "other" ||
    decisionReason.bashMissKind === void 0 ||
    !STRUCTURAL_MISS_KINDS[decisionReason.bashMissKind]
  )
    return e;
  if (
    r.blockReadsOutsideWorkingDirectories === !0 &&
    !(shouldUseSandbox(n) && isSandboxReadBlockEnforceable(r))
  )
    return outsideReadsTooComplexAsk(decisionReason.reason);
  return e;
}
/**
 * 对已得出的 ask 结果，再用整条命令、各片段、子命令理由键逐一查 deny/ask 规则：命中 deny 改为拒绝，命中 ask 记到 matchedAskRule。
 */
//@ chunk-e6aww6q8.js:1223955-1224531 layout = checkSemanticsDeny (0.828)
function applyAskDenyRulesToAskResult(askResult, bashInput, permissionContext) {
  if (askResult.behavior !== "ask" || carriesAskRuleIntent(askResult)) return askResult;
  if (
    getContentRulesMapForTool(permissionContext, BashTool, "ask").size === 0 &&
    getContentRulesMapForTool(permissionContext, BashTool, "deny").size === 0
  )
    return askResult;
  let s = new Set([
      bashInput.command,
      ...splitCommand(bashInput.command),
      ...(askResult.decisionReason?.type === "subcommandResults"
        ? askResult.decisionReason.reasons.keys()
        : []),
      ...nestedCommandSpans(bashInput.command),
    ]),
    h;
  for (let cmd of s) {
    let { matchingDenyRules: matchingDenyRules, matchingAskRules: matchingAskRules } = matchingRulesForInput(
      { ...bashInput, command: cmd },
      permissionContext,
      "prefix",
    );
    if (matchingDenyRules[0] !== void 0)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${bashInput.command} has been denied.`,
        decisionReason: { type: "rule", rule: matchingDenyRules[0] },
      };
    h ??= matchingAskRules[0];
  }
  return h === void 0 ? askResult : { ...askResult, matchedAskRule: h };
}
/**
 * Bash 权限检查的两遍执行：先正常跑 checkBashPermissionWithSandbox，若触发了二次检查条件，再在 R0e 上下文里重跑，第二遍为 deny 时以它为准，异常时保留第一遍结果。BashTool 与 Monitor 工具调用。
 */
//@ chunk-e6aww6q8.js:1224531-1224768 layout
async function bashToolHasPermissionTwoPass(e, n, r, s) {
  let h = () => checkBashPermissionWithSandbox(e, n, r, s),
    { result: y, fired: fired } = await BIt(!1, h);
  if (!fired || y.behavior === "deny") return y;
  try {
    let { result: w } = await BIt(!0, () => R0e(h));
    return w.behavior === "deny" ? w : y;
  } catch (error) {
    if (isAbortError(error)) throw error;
    return (logError(error), y);
  }
}
/**
 * 合并 Bash 权限的几路结论：常规规则检查、读法检查、沙箱覆盖检查；dangerouslyDisableSandbox 且原本可沙箱运行时按严格模式改成 too-complex ask；ask 结论标记 standsInUnderHookAsk 供 hook 处理。
 */
//@ chunk-e6aww6q8.js:1224768-1225707 layout
async function checkBashPermissionWithSandbox(e, n, r, s) {
  let h = () => runCommandSafetyCheck(e, n, r, s),
    [y, S] = await runWithReadingRefusals(h),
    w = y;
  if (S !== void 0 && y.behavior !== "deny") {
    let L = await R0e(() => bcs(h));
    w = combineWithTooComplex(w, L, S);
    let G = await R0e(() => DIt(h));
    if (
      ((w = combineWithTooComplex(w, G, S)),
      e.dangerouslyDisableSandbox &&
        !shouldUseSandbox(e) &&
        shouldUseSandbox({ ...e, dangerouslyDisableSandbox: !1 }))
    ) {
      if (isPassthroughOrPlainAsk(G) && w.behavior !== "deny" && sandboxOverrideAskGuardsOn())
        w = buildTooComplexAsk(S);
    } else if (isPassthroughOrPlainAsk(w))
      w = askClassifierForAllowedDomains(BashTool, e, n, { behavior: "passthrough", message: "" }) ?? w;
    if (
      w.behavior === "ask" &&
      (G.behavior === "allow" ||
        G.behavior === "passthrough" ||
        (G.behavior === "ask" &&
          !carriesAskRuleIntent(G) &&
          findSafetyCheckReason(G.decisionReason) === void 0 &&
          G.decisionReason?.type !== "sandboxOverride"))
    )
      w = { ...w, standsInUnderHookAsk: !0 };
  }
  if (w.behavior === "ask" && isPlainAsk(w)) {
    let L = askClassifierForAllowedDomains(BashTool, e, n, { behavior: "passthrough", message: "" });
    if (L !== void 0) {
      let G = (await parseCommandRaw(e.command)) ?? PARSE_ABORTED,
        q = parseForSecurityFromAst(e.command, G);
      if (q.kind === "too-complex" && q.keepsRemovalVerdict) w = L;
    }
  }
  if (Z7()) {
    let L = findSafetyCheckReason(w.decisionReason, (q) => q.circuitBreaker === "dangerousRemoval"),
      G = L === void 0 ? void 0 : classifyRemovalReason(L.reason);
    if (G !== void 0) DH(G);
  }
  return w;
}
/**
 * 结果是 passthrough 或普通 ask（可被其他读法覆盖）。
 */
//@ chunk-e6aww6q8.js:1225707-1225784 layout = validateShellMetacharacters (1)
function isPassthroughOrPlainAsk(context) {
  return context.behavior === "passthrough" || (context.behavior === "ask" && isPlainAsk(context));
}
/**
 * 合并规则结果与安全检查结果：deny 优先；安全 ask 去掉建议；规则 allow 而安全检查不 allow 时改为需确认。
 */
//@ chunk-e6aww6q8.js:1225784-1225995 layout
function combineWithTooComplex(e, n, r) {
  if (e.behavior === "deny") return e;
  if (n.behavior === "deny") return n;
  if (n.behavior === "ask" && !isPlainAsk(n)) return { ...n, suggestions: [] };
  if (e.behavior === "allow" && n.behavior !== "allow") return buildTooComplexAsk(r);
  return e;
}
/**
 * 生成 bashMissKind="too-complex" 的 ask 权限结论（无建议规则）。
 */
//@ chunk-e6aww6q8.js:1225995-1226145 layout
function buildTooComplexAsk(e) {
  let n = { type: "other", reason: e, bashMissKind: "too-complex" };
  return {
    behavior: "ask",
    decisionReason: n,
    message: createPermissionRequestMessage(BashTool.name, n),
    suggestions: [],
  };
}
/**
 * 两遍运行注入/安全检查（正常模式和 refused 模式），取更严格的结果；refused 才有的 ask 在可安全降级时转为 passthrough。
 */
//@ chunk-e6aww6q8.js:1226145-1226675 fingerprint = checkCommandAndSuggestRules (0.671)
async function runCommandSafetyCheck(e, n, r, s) {
  let { result: h, refused: refused } = await runWithRefusedReading(!1, () =>
    bashCommandIsSafeAsync(e, n, r, s),
  );
  if (!refused || h.behavior === "deny") return h;
  let { result: S } = await runWithRefusedReading(!0, () => R0e(() => bashCommandIsSafeAsync(e, n, r, s)));
  if (S.behavior === "deny" || (S.behavior === "ask" && !isPlainAsk(S))) return S;
  if (h.behavior === "ask" && S.behavior !== "ask")
    return isPlainAsk(h)
      ? {
          behavior: "passthrough",
          message: h.message,
          ...(h.decisionReason !== void 0 && { decisionReason: h.decisionReason }),
          ...(h.suggestions !== void 0 && { suggestions: h.suggestions }),
          ...(h.blockedPath !== void 0 && { blockedPath: h.blockedPath }),
        }
      : h;
  return getDecisionSeverity(S) > getDecisionSeverity(h) ? S : h;
}
/**
 * 判断当前是否为绕过权限模式（或计划模式下可绕过且非远程执行）。
 */
//@ chunk-e6aww6q8.js:1227686-1227822 placement
function isBypassModeForBash(e) {
  let { mode: mode, isBypassPermissionsModeAvailable: isBypassPermissionsModeAvailable } =
    getToolPermissionContext(e);
  return (
    mode === "bypassPermissions" ||
    (isPlanBypass(mode, isBypassPermissionsModeAvailable) && e.forRemoteExecution !== !0)
  );
}
//@ chunk-e6aww6q8.js:1227822-1227984 placement
function buildPendingClassifierCheck(command, toolPermissionContext) {
  let allowDescriptions = getToolPermissionContext(toolPermissionContext);
  return (
    command.behavior === "ask" &&
    !carriesAskRuleIntent(command) &&
    findSafetyCheckReason(command.decisionReason, isAutoModeDenyCircuitBreaker) !== void 0 &&
    (isAutoModePermissionSurface(allowDescriptions) ||
      (allowDescriptions.mode === "bypassPermissions" && !isRemovalWaiverActive(allowDescriptions))) &&
    getDangerousRmTimeoutConfig().enabled
  );
}
/**
 * 带声明前缀推断地执行 Bash 权限检查：对 declare/export 等可能的读法分别再检查并合并；命令含 $ 且使用了本命令内赋值的变量时，不允许直接 allow（转为 passthrough 并去掉建议）。
 */
//@ chunk-e6aww6q8.js:1227984-1229250 placement
async function checkBashWithDeclarations(input, context, r, s) {
  let h = {},
    y = await checkBashCommandClamp(input, context, r, void 0, void 0, void 0, (L, G, q) => {
      ((h.names = L), (h.operands = G), (h.fromUncertainWrite = q));
    }),
    result = s?.(y) ?? y,
    prefixes = [void 0];
  if (h.names !== void 0) {
    let { readings: readings, exhaustive: exhaustive } = declarationPrefixReadings(h.names, h.operands);
    prefixes.push(...readings);
    let q = [];
    for (let Se of readings) {
      let ke = await R0e(() => checkBashCommandClamp(input, context, r, void 0, void 0, Se));
      q.push(s?.(ke) ?? ke);
    }
    let Z = applyReadBlockToStructuralAsk(
      combineDeclarationReadings(result, q, exhaustive, h.fromUncertainWrite === !0),
      input,
      getToolPermissionContext(context),
    );
    if (Z === result || Z.behavior !== "ask" || !isPlainAsk(Z)) result = Z;
    else if (result.behavior !== "passthrough")
      result = {
        behavior: "passthrough",
        message: Z.message,
        ...(Z.decisionReason !== void 0 && { decisionReason: Z.decisionReason }),
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
    let L = (await parseCommandRaw(input.command)) ?? PARSE_ABORTED,
      mapped = prefixes.map((Z) => parseForSecurityFromAst(input.command, L, { declarationPrefix: Z })),
      any = mapped.some((Z) => Z.kind === "simple" && Z.usesAssignedValue === !0);
    if (result.behavior !== "allow") {
      if (any) result = { ...result, suggestions: [] };
    } else if (any || mapped.some((Z) => Z.kind !== "simple")) {
      let Z = {
          type: "other",
          reason: "A variable set in this command can't be checked before it runs",
          bashMissKind: "assigned-variable",
        },
        Se = {
          behavior: "passthrough",
          decisionReason: Z,
          message: createPermissionRequestMessage(BashTool.name, Z),
          suggestions: [],
        };
      result = s?.(Se) ?? Se;
    }
  }
  return result;
}
/**
 * 当代理的 Bash 使用被限定为固定命令集时，拒绝超出范围的命令。
 */
//@ chunk-e6aww6q8.js:1229250-1231407 placement
async function checkBashCommandClamp(e, n, r, s, h, y, S, w) {
  let bashCommandClamps = getToolPermissionContext(n).bashCommandClamps;
  if (bashCommandClamps !== void 0 && bashCommandClamps.length > 0) {
    let we = await findSpanNotCoveredByRuleGroups(e, bashCommandClamps);
    if (we !== null)
      return (
        logEventUnlessSuppressed("tengu_bash_command_clamp_denied", { groupCount: bashCommandClamps.length }),
        {
          behavior: "deny",
          message:
            `Permission to use ${BashTool.name} with command ${e.command.trim()} has been denied: this agent's Bash use is clamped to a fixed set of command forms (per-spawn bashCommandClamp), and ` +
            (we.kind === "unverifiable"
              ? "the command has structure the clamp cannot verify " +
                "(substitution, control flow, or an undecomposable compound) \u2014 " +
                "no clamp rule can admit it. Issue plain commands matching the clamped forms."
              : `the span ${jsonStringify(we.span)} matches none of them. Allowed forms: ${we.group.join(", ")}`),
          decisionReason: { type: "other", reason: BASH_COMMAND_CLAMP_DENY_REASON },
        }
      );
  }
  let G = { laterPassesDiffer: !1 },
    q = applyReadBlockToStructuralAsk(
      await Mze(w === "read", () =>
        bashToolHasPermission(e, n, r, s, h, y, S, w, () => {
          G.laterPassesDiffer = !0;
        }),
      ),
      e,
      getToolPermissionContext(n),
    ),
    Z = q;
  if (
    G.laterPassesDiffer &&
    s === void 0 &&
    (q.behavior === "allow" || q.behavior === "passthrough" || isPlainAsk(q))
  ) {
    let we = {
        type: "other",
        reason:
          "Only the first pass of a loop in this command could be checked, and its later passes may run something else",
        bashMissKind: "loop-later-pass",
      },
      Ee = createPermissionRequestMessage(BashTool.name, we),
      Ae = applyReadBlockToStructuralAsk(
        { behavior: "ask", message: Ee, decisionReason: we },
        e,
        getToolPermissionContext(n),
      ),
      Ie = bashToolCheckExactMatchPermission(e, getToolPermissionContext(n)),
      Me =
        q.behavior === "allow" &&
        Ie.behavior === "allow" &&
        Ie.decisionReason?.type === "rule" &&
        Ie.decisionReason.rule.ruleValue.ruleContent === e.command.trim();
    if (!isPlainAsk(Ae) && (Me || !scriptAsksToRunUnsandboxed(BashTool, e))) Z = Ae;
    else if (q.behavior === "allow" && !Me) Z = { behavior: "passthrough", message: Ee, decisionReason: we };
  }
  if (G.laterPassesDiffer && s === void 0 && (Z.behavior === "ask" || Z.behavior === "passthrough"))
    Z = { ...Z, suggestions: [] };
  if (q.behavior !== "allow" || Z.behavior === "ask")
    return applyAskDenyRulesToAskResult(Z, e, getToolPermissionContext(n));
  if (
    !e.command.includes("&") ||
    (q.decisionReason?.type === "other" && q.decisionReason.reason === SANDBOX_AUTO_ALLOW_REASON)
  )
    return Z;
  let Se = await parseCommandRaw(e.command);
  if (Se && Se !== PARSE_ABORTED && !hasErrorOrBackgroundNode(Se)) return Z;
  let ke = {
    type: "safetyCheck",
    reason:
      "This command uses the `&` background operator, which defers execution past approval-time safety checks. Approve only if you trust it.",
    classifierApprovable: !1,
    circuitBreaker: "backgroundOperator",
  };
  return applyAskDenyRulesToAskResult(
    { behavior: "ask", decisionReason: ke, message: createPermissionRequestMessage(BashTool.name, ke) },
    e,
    getToolPermissionContext(n),
  );
}
//@ chunk-e6aww6q8.js:1231663-1231802 affinity
var GIT_AFTER_CD_READ_BLOCK_REASON =
  "git after a directory change, or after writes to files git reads (HEAD, config, hooks), cannot be checked against the read block";
/**
 * Bash 权限检查主入口：tree-sitter 解析 → 语义检查 → too-complex/语义失败的专用路径 → 沙箱自动允许 → 精确规则 → 管道/操作符分段 → cd 处理（多个 cd、cd+git、git 内部文件）→ 每个子命令 bashToolCheckPermission → 路径约束 → 安全检查 → 汇总为 allow/ask/deny/passthrough 并合并最多 aDo 条建议规则（写 localSettings）。
 */
//@ chunk-e6aww6q8.js:1231802-1243231 fingerprint = bashToolHasPermission (0.438)
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
  let permissionContext = getToolPermissionContext(toolUseContext),
    q = {
      input: input,
      context: toolUseContext,
      depth: recursionState?.depth ?? 0,
      divergentShapes: divergentShapes,
      declarationPrefix: declarationPrefix,
      budget: recursionState?.budget ?? {
        left: IDo,
        chars: DDo,
        judged: new Map(),
        asked: new Map(),
        command: originalCommand ?? input.command,
      },
    };
  mqt(RA(toolUseContext));
  let parsedRoot = await parseCommandRaw(input.command),
    astAnalysis = parsedRoot
      ? parseForSecurityFromAst(input.command, parsedRoot, {
          declarationPrefix: declarationPrefix,
          readsDivergentShapes: divergentShapes === "read",
        })
      : { kind: "simple", commands: [], bareAssignmentNames: [] };
  if (astAnalysis.kind === "simple" && astAnalysis.laterLoopPassesDiffer) onLaterLoopPassesDiffer?.();
  let semanticsResult =
    astAnalysis.kind === "simple"
      ? checkSemantics(astAnalysis.commands, { sourceGlobRecord: Cye(), hasLoop: astAnalysis.hasLoop })
      : null;
  if (
    divergentShapes === void 0 &&
    (astAnalysis.kind === "too-complex" ? astAnalysis.divergentShape === !0 : semanticsResult?.ok === !1)
  ) {
    let yo = await checkBashCommandClamp(
        input,
        toolUseContext,
        getCommandSubcommandPrefix,
        originalCommand,
        recursionState,
        declarationPrefix,
        onDeclarationPrefixes,
        "read",
      ),
      Ho = await R0e(() =>
        checkBashCommandClamp(
          input,
          toolUseContext,
          getCommandSubcommandPrefix,
          originalCommand,
          recursionState,
          declarationPrefix,
          void 0,
          "refused",
        ),
      ),
      br =
        (getDecisionSeverity(yo) === 4 && isBypassModeForBash(toolUseContext) ? 3 : getDecisionSeverity(yo)) -
        getDecisionSeverity(Ho),
      Hr = astAnalysis.kind === "too-complex" && astAnalysis.keepsRemovalVerdict === !0;
    if (Hr && yo.behavior === "ask" && Ho.behavior === "ask" && isOutsideReadsBlockedAsk(Ho.decisionReason)) {
      let _r = findSafetyCheckReason(yo.decisionReason, (Cr) => Cr.circuitBreaker === "dangerousRemoval");
      if (_r !== void 0)
        return {
          ...yo,
          message: `${yo.message} ${Ho.message}`,
          decisionReason: {
            type: "subcommandResults",
            typeOnWire: "safetyCheck",
            reasons: new Map([
              [
                `${input.command} (as refused)`,
                {
                  ...Ho,
                  decisionReason: {
                    ...Ho.decisionReason,
                    reason: `${_r.reason}; ${Ho.decisionReason.reason}`,
                  },
                },
              ],
              [input.command, yo],
            ]),
          },
          suggestions: [],
        };
    }
    let Fr = br > 0 || (br === 0 && getSafetyCheckRank(yo) > getSafetyCheckRank(Ho)) ? yo : Ho,
      cs = { ...Fr, matchedAskRule: void 0 };
    return Hr && recursionState !== void 0 && buildPendingClassifierCheck(cs, toolUseContext) ? cs : Fr;
  }
  let we =
    toolUseContext.forRemoteExecution !== !0 &&
    astAnalysis.kind === "too-complex" &&
    ((astAnalysis.nodeType === "heredoc_redirect" && astAnalysis.differential === !0) ||
      (astAnalysis.nodeType === "pipeline" && astAnalysis.afterHeredocDelimiter === !0)) &&
    SandboxManager.isSandboxingEnabled() &&
    SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
    shouldUseSandbox(input) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_larch", !0);
  if (onDeclarationPrefixes !== void 0) {
    let yo =
        astAnalysis.declarationPrefixes === void 0 && parsedRoot && we
          ? parseForSecurityFromAst(input.command, parsedRoot, { plainUnquotedHeredocs: !0 })
          : void 0,
      Ho = astAnalysis.declarationPrefixes === void 0 ? yo : astAnalysis;
    if (Ho?.declarationPrefixes !== void 0)
      onDeclarationPrefixes(
        Ho.declarationPrefixes,
        Ho.declarationPrefixBashKeeps,
        astAnalysis.uncertainWrite === !0,
      );
  }
  if (astAnalysis.kind === "too-complex") {
    let yo = await checkTooComplexCommandDeny(
      input,
      permissionContext,
      parsedRoot,
      () =>
        permissionContext.blockReadsOutsideWorkingDirectories === !0 &&
        !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
          ? outsideReadsTooComplexAsk(astAnalysis.reason)
          : void 0,
      originalCommand,
      toolUseContext.forRemoteExecution === !0,
      q,
      toolUseContext,
    );
    if (yo !== null) return yo;
    let Ho =
      toolUseContext.forRemoteExecution === !0
        ? null
        : checkSandboxAutoAllow(input, permissionContext, astAnalysis.nodeType);
    if (Ho !== null) return Ho;
    if (parsedRoot && we) {
      let br = parseForSecurityFromAst(input.command, parsedRoot, {
        plainUnquotedHeredocs: !0,
        declarationPrefix: declarationPrefix,
      });
      if (br.kind === "simple" && br.laterLoopPassesDiffer) onLaterLoopPassesDiffer?.();
      let Hr =
        br.kind === "simple" &&
        checkSemantics(br.commands, { sourceGlobRecord: Cye(), hasLoop: br.hasLoop }).ok
          ? checkSandboxAutoAllowForAst(
              input,
              permissionContext,
              br.commands,
              br.bareAssignmentNames,
              toolUseContext,
            )
          : null;
      if (Hr !== null) return Hr;
    }
    if (
      (logEventUnlessSuppressed("tengu_bash_ast_too_complex", {
        nodeTypeId: nodeTypeId(astAnalysis.nodeType),
      }),
      parsedRoot !== null &&
        parsedRoot !== PARSE_ABORTED &&
        parsedRoot.type === "ERROR" &&
        originalCommand === void 0)
    )
      return dangerousRemovalAsk(
        "rm",
        "This command could not be checked for dangerous rm operations: the shell may read it differently than it was parsed. This requires explicit approval.",
        "not ruled out \u2014 the shell may read this command differently than it was parsed",
      );
    let rr = { type: "other", reason: astAnalysis.reason, bashMissKind: "too-complex" };
    return {
      behavior: "ask",
      decisionReason: rr,
      message: createPermissionRequestMessage(BashTool.name, rr),
      suggestions: [],
    };
  }
  let commands = astAnalysis.commands,
    Ae = (yo) =>
      hasBashDenyRule(yo) &&
      ((hasNoBashDenyRules(yo) && !cdMayChangeReadScope(commands, getCwd(), yo, toolUseContext)) ||
        (toolUseContext.forRemoteExecution !== !0 &&
          astAnalysis.bareAssignmentNames.length === 0 &&
          astAnalysis.hasLoop === !1 &&
          kqt() &&
          isReadOnlyAfterCd(commands, getCwd(), yo, toolUseContext)));
  if (
    permissionContext.blockReadsOutsideWorkingDirectories === !0 &&
    commands.some(
      (yo, Ho) =>
        readsCodeFromStdin(yo.argv) &&
        (/<<</.test(input.command) ||
          /<<(?!<)/.test(input.command) ||
          (Ho > 0 && input.command.includes("|"))),
    ) &&
    !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
  )
    return outsideReadsTooComplexAsk("code on stdin cannot be checked against the read block");
  if (semanticsResult !== null && !semanticsResult.ok && divergentShapes !== "read") {
    let earlyExit = checkSemanticsDeny(input, permissionContext, commands);
    if (earlyExit?.behavior === "deny") return earlyExit;
    if (semanticsResult.kind === "newline-hash" && toolUseContext.forRemoteExecution !== !0) {
      let Hr = checkSandboxAutoAllowForAst(
        input,
        permissionContext,
        commands,
        astAnalysis.bareAssignmentNames,
        toolUseContext,
      );
      if (Hr) return Hr;
    }
    if (
      permissionContext.blockReadsOutsideWorkingDirectories === !0 &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
    )
      return outsideReadsTooComplexAsk(semanticsResult.reason);
    let Ho = findDangerousVariableRemoval(
      input.command,
      !0,
      originalCommand,
      toolUseContext.forRemoteExecution === !0,
      toolUseContext,
    );
    if (Ho !== null) return checkDangerousRemoval(Ho, !1);
    let rr = await checkInlineShellRemoval(input.command, q, [], commands);
    if (rr !== null) return rr;
    if (earlyExit !== null) return earlyExit;
    let br = { type: "other", reason: semanticsResult.reason, bashMissKind: "semantics" };
    return {
      behavior: "ask",
      decisionReason: br,
      message: createPermissionRequestMessage(BashTool.name, br),
      suggestions: [],
    };
  }
  let mapped = commands.map((yo) => yo.text),
    flattened = commands.flatMap((yo) => yo.redirects),
    sandboxAstAllowResult =
      toolUseContext.forRemoteExecution === !0
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
      (semanticsResult?.ok === !1 && semanticsResult.kind === "newline-hash"))
  )
    return sandboxAstAllowResult;
  let exactMatchResult = bashToolCheckExactMatchPermission(input, permissionContext);
  if (exactMatchResult.behavior === "deny") return exactMatchResult;
  let lt = () =>
      permissionContext.blockReadsOutsideWorkingDirectories === !0 &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
        ? outsideReadsTooComplexAsk(GIT_AFTER_CD_READ_BLOCK_REASON)
        : void 0,
    operatorResult = await checkCommandOperatorPermissions(
      input,
      (yo) =>
        checkBashCommandClamp(
          yo,
          toolUseContext,
          getCommandSubcommandPrefix,
          originalCommand ?? input.command,
          q,
          declarationPrefix,
          void 0,
          divergentShapes,
        ),
      { isNormalizedCdCommand: oT, isNormalizedGitCommand: isNormalizedGitCommand },
      parsedRoot,
      commands,
      (yo) => isCdTextToCurrentDir(yo, getCwd()),
      lt,
    );
  if (operatorResult.behavior !== "passthrough") {
    let yo =
      operatorResult.behavior === "ask" &&
      operatorResult.decisionReason?.type === "other" &&
      operatorResult.decisionReason.bashMissKind === "shell-operators";
    if (yo) {
      if (
        permissionContext.blockReadsOutsideWorkingDirectories === !0 &&
        !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
      )
        return outsideReadsTooComplexAsk("a subshell cannot be checked against the read block");
      if (parsedRoot && parsedRoot !== PARSE_ABORTED) {
        let rr = await checkDangerousRemovals(
          parsedRoot,
          getCwd(),
          permissionContext,
          originalCommand,
          toolUseContext.forRemoteExecution === !0,
          q,
          toolUseContext,
        );
        if (rr !== null)
          return (
            logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", { kind: fromEnum(rr.kind) }),
            rr.result
          );
      }
    }
    permissionContext = getToolPermissionContext(toolUseContext);
    let Ho = checkPathConstraints(
      input,
      getCwd(),
      permissionContext,
      commandHasAnyCd(input.command),
      flattened,
      commands,
      Ae(permissionContext),
    );
    if (
      (Ho.behavior === "deny" ||
        ((!yo || divergentShapes === "read") && Ho.behavior === "ask" && !Ho.bashAllowRuleOverridable)) &&
      getDecisionSeverity(Ho) > getDecisionSeverity(operatorResult)
    )
      return Ho;
    return operatorResult;
  }
  let cwd = getCwd(),
    pt = getPlatform() === "windows" ? windowsPathToPosixPath(cwd) : cwd,
    { subcommands: subcommands, astCommandsByIdx: astCommandsByIdx } = filterCdCwdSubcommands(
      mapped,
      commands,
      cwd,
      pt,
    ),
    cdCommands = subcommands.filter((subCommand) => oT(subCommand));
  if (cdCommands.length > 1) {
    let yo = checkCdCommand(commands, cwd, permissionContext);
    if (yo) return yo;
    if (
      permissionContext.blockReadsOutsideWorkingDirectories === !0 &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
    )
      return outsideReadsTooComplexAsk("multiple directory changes cannot be checked against the read block");
    let mapped = uniq(
        [cwd, ...allWorkingDirectories(getToolPermissionContext(toolUseContext))]
          .flatMap((jr) => {
            let { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), jr);
            return resolvedPath === jr ? [jr] : [jr, resolvedPath];
          })
          .map((jr) => normalize_2(jr)),
      ).map((jr) => ({
        exact: normalizeCaseForComparison(jr),
        prefix: normalizeCaseForComparison(/[\\/]$/.test(jr) ? jr : jr + sep_27),
      })),
      br = (jr) => {
        let Or = normalizeCaseForComparison(normalize_2(jr));
        return mapped.some((Io) => Or === Io.exact || Or.startsWith(Io.prefix));
      },
      Fr = !/[;|\n&(`!]/.test(input.command.replace(/&&/g, "")),
      { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), cwd),
      _r = uniq([normalize_2(cwd), normalize_2(resolvedPath)]),
      Cr = [],
      Vr = await checkInlineShellRemoval(input.command, q, [], commands);
    if (Vr !== null) return Vr;
    for (let jr of commands) {
      let [Or, ...Io] = stripWrappersFromArgvForPaths(jr.argv),
        zo = Or?.replace(/^.*[\\/]/, "");
      if (zo === "cd" || zo === "chdir" || zo === "pushd" || zo === "popd") {
        if (((Fr &&= jr.argv[0] === zo && jr.envVars.length === 0), zo === "popd"))
          if (Io.length === 0 && Cr.length > 0) _r = Cr.pop();
          else Fr = !1;
        else {
          let Es = Io[0] === "--" ? Io.slice(1) : Io,
            Nr = Es.length === 1 ? Es[0] : void 0,
            Is = !1,
            fs = [];
          if (
            Nr !== void 0 &&
            !/^[-+]/.test(Nr) &&
            !Nr.startsWith("~") &&
            !/[*?[]/.test(Nr) &&
            !containsAnyPlaceholder(Nr) &&
            !/(^|[\\/])\.\.([\\/]|$)/.test(Nr)
          ) {
            Is = !0;
            for (let as of _r) {
              let Vi = isAbsolute_20(Nr) ? normalize_2(Nr) : resolve_17(as, Nr),
                { resolvedPath: resolvedPath } = safeResolvePath(getFsImplementation(), Vi);
              if (!br(Vi) || !br(resolvedPath)) {
                Is = !1;
                break;
              }
              fs.push(normalize_2(Vi), normalize_2(resolvedPath));
            }
          }
          if (((Fr &&= Is), Is)) {
            if (zo === "pushd") Cr.push(_r);
            _r = uniq(fs);
          }
        }
        continue;
      }
      if (zo !== "rm" && zo !== "rmdir") continue;
      let rs = checkDangerousRemovalPaths(zo, Io, cwd, getToolPermissionContext(toolUseContext), !Fr);
      if (rs.behavior !== "passthrough") return rs;
    }
    let Oo = {
      type: "other",
      reason: "Multiple directory changes in one command require approval for clarity",
      bashMissKind: "multi-cd",
    };
    return {
      behavior: "ask",
      decisionReason: Oo,
      message: createPermissionRequestMessage(BashTool.name, Oo),
    };
  }
  let At = cdCommands.length > 0,
    effectiveCwd = cwd,
    Yt = At,
    qt = !1;
  if (
    toolUseContext.forRemoteExecution !== !0 &&
    At &&
    subcommands.length > 1 &&
    subcommands.length === mapped.length &&
    oT(subcommands[0]) &&
    isSimpleAndChain(input.command) &&
    input.command.trimStart().startsWith(subcommands[0]) &&
    /^[ \t]*&&/.test(input.command.trimStart().slice(subcommands[0].length))
  ) {
    let yo = resolveSimpleCdTarget(astCommandsByIdx[0], cwd, permissionContext);
    if (yo !== null) ((effectiveCwd = yo), (Yt = !1), (qt = !0));
  }
  if (Yt || (At && divergentShapes === "read")) {
    let yo = checkCdCommand(commands, cwd, permissionContext);
    if (yo) return yo;
  }
  let cdGitAskResult;
  if (At) {
    if (
      subcommands.some((Ho) => isNormalizedGitCommand(Ho.trim())) &&
      !(await isCdToCurrentDir(astCommandsByIdx, subcommands, cwd))
    ) {
      let Ho = {
        type: "other",
        reason:
          "This command changes directory before running a version-control command, which can pick up untrusted hooks or repository configuration from the target directory. Approve only if you trust it.",
        bashMissKind: "cd-git-compound",
      };
      cdGitAskResult = {
        behavior: "ask",
        decisionReason: Ho,
        message: createPermissionRequestMessage(BashTool.name, Ho),
      };
    }
  }
  let gitStructureAskResult;
  if (
    subcommands.some((cmd) => isNormalizedGitCommand(cmd.trim())) &&
    (extractWriteTargets(astCommandsByIdx, effectiveCwd) || commandWritesToGitInternalPaths(input.command))
  ) {
    let Ho = {
      type: "other",
      reason:
        "This command creates git repository structure files (HEAD/objects/refs/hooks) and then runs git, which can execute hooks/fsmonitor from the created files.",
      bashMissKind: "cd-git-compound",
    };
    gitStructureAskResult = {
      behavior: "ask",
      decisionReason: Ho,
      message: createPermissionRequestMessage(BashTool.name, Ho),
    };
  }
  permissionContext = getToolPermissionContext(toolUseContext);
  let subcommandPermissionDecisions = subcommands.map((command, Ho) =>
    bashToolCheckPermission(
      { command: command },
      permissionContext,
      Yt,
      astCommandsByIdx[Ho],
      qt && Ho === 0 ? cwd : effectiveCwd,
      astAnalysis.bareAssignmentNames,
      Ae(permissionContext),
      toolUseContext,
    ),
  );
  if (subcommandPermissionDecisions.find((yo) => yo.behavior === "deny") !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${BashTool.name} with command ${input.command} has been denied.`,
      decisionReason: {
        type: "subcommandResults",
        reasons: uQ()
          ? labelSubcommandResults(subcommands, astCommandsByIdx, subcommandPermissionDecisions)
          : new Map(subcommandPermissionDecisions.map((yo, Ho) => [subcommands[Ho], yo])),
      },
    };
  let filtered = astCommandsByIdx.slice(qt ? 1 : 0).filter((yo) => yo !== void 0),
    pathConstraintResult = checkPathConstraints(
      input,
      effectiveCwd,
      permissionContext,
      Yt,
      flattened,
      filtered,
      Ae(permissionContext),
    );
  if (pathConstraintResult.behavior === "deny") return pathConstraintResult;
  let safetyCheckResult = await checkInlineShellRemoval(input.command, q, [], commands),
    Kn =
      pathConstraintResult.behavior === "ask" &&
      pathConstraintResult.decisionReason?.type === "safetyCheck" &&
      pathConstraintResult.decisionReason.classifierApprovable === !1
        ? pathConstraintResult
        : (safetyCheckResult ?? pathConstraintResult);
  if (
    Kn.behavior === "ask" &&
    Kn.decisionReason?.type === "safetyCheck" &&
    Kn.decisionReason.classifierApprovable === !1
  ) {
    if (
      !isBypassImmuneCircuitBreaker(Kn.decisionReason) ||
      isClassifierRoutedCircuitBreaker(Kn.decisionReason)
    ) {
      let yo =
        findCircuitBreakerAsk(subcommandPermissionDecisions, !0) ??
        (cdGitAskResult !== void 0 || gitStructureAskResult !== void 0 ? lt() : void 0) ??
        findCircuitBreakerAsk(subcommandPermissionDecisions) ??
        safetyCheckResult ??
        void 0;
      if (yo) return yo;
    }
    return Kn;
  }
  if (cdGitAskResult !== void 0 || gitStructureAskResult !== void 0) {
    let yo =
      findCircuitBreakerAsk(subcommandPermissionDecisions, !0) ??
      lt() ??
      findCircuitBreakerAsk(subcommandPermissionDecisions);
    if (yo) return yo;
  }
  if (cdGitAskResult !== void 0) return cdGitAskResult;
  if (gitStructureAskResult !== void 0) return gitStructureAskResult;
  let mapped_2 = subcommands
    .map((result, Ho) => [result, Ho])
    .filter(([yo]) => dze(yo))
    .map(([, yo]) => yo);
  if (mapped_2.length > 0) {
    let all = mapped_2.every((br) => {
        let Hr = subcommandPermissionDecisions[br];
        return Hr?.behavior === "allow" && Hr.decisionReason?.type === "rule";
      }),
      any = subcommandPermissionDecisions.some((br) => br.behavior !== "allow"),
      rr = pathConstraintResult.behavior === "ask" && !pathConstraintResult.bashAllowRuleOverridable;
    if (!all && !any && !rr && exactMatchResult.behavior !== "allow") {
      let br = new Set(
          mapped_2
            .filter((Fr) => {
              let cs = subcommandPermissionDecisions[Fr];
              return cs?.behavior === "allow" && cs.decisionReason?.type === "rule";
            })
            .map((Fr) => subcommands[Fr].trim()),
        ),
        Hr = checkSedCommand(input, permissionContext, br);
      if (Hr.behavior === "ask") {
        if (permissionContext.blockReadsOutsideWorkingDirectories === !0) return outsideReadsSedScriptAsk();
        return Hr;
      }
    }
  }
  let askSubresult = subcommandPermissionDecisions.find((yo) => yo.behavior === "ask"),
    nonAllowCount = count(subcommandPermissionDecisions, (yo) => yo.behavior !== "allow");
  if (
    pathConstraintResult.behavior === "ask" &&
    askSubresult === void 0 &&
    !pathConstraintResult.bashAllowRuleOverridable
  )
    return pathConstraintResult;
  if (askSubresult !== void 0 && nonAllowCount === 1) return askSubresult;
  if (exactMatchResult.behavior === "allow") return exactMatchResult;
  if (subcommandPermissionDecisions.every((yo) => yo.behavior === "allow"))
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "subcommandResults",
        reasons: uQ()
          ? labelSubcommandResults(subcommands, astCommandsByIdx, subcommandPermissionDecisions)
          : new Map(subcommandPermissionDecisions.map((result, Ho) => [subcommands[Ho], result])),
      },
    };
  let commandSubcommandPrefix = null;
  if (getCommandSubcommandPrefix) {
    if (
      ((commandSubcommandPrefix = await getCommandSubcommandPrefix(
        input.command,
        toolUseContext.abortController.signal,
        toolUseContext.options.isNonInteractiveSession,
      )),
      toolUseContext.abortController.signal.aborted)
    )
      throw new AbortError_2();
  }
  if (((permissionContext = getToolPermissionContext(toolUseContext)), subcommands.length === 1))
    return await checkSubcommandPermissionWithSuggestions(
      { command: subcommands[0] },
      permissionContext,
      commandSubcommandPrefix,
      Yt,
      astCommandsByIdx[0],
      effectiveCwd,
      astAnalysis.bareAssignmentNames,
      toolUseContext,
    );
  let subcommandResultList = [];
  for (let yo = 0; yo < subcommands.length; yo++) {
    let Ho = subcommands[yo];
    subcommandResultList.push(
      await checkSubcommandPermissionWithSuggestions(
        { ...input, command: Ho },
        permissionContext,
        commandSubcommandPrefix?.subcommandPrefixes.get(Ho),
        Yt,
        astCommandsByIdx[yo],
        qt && yo === 0 ? cwd : effectiveCwd,
        astAnalysis.bareAssignmentNames,
        toolUseContext,
      ),
    );
  }
  let co = { deny: 3, ask: 2, passthrough: 1, allow: 0 },
    subcommandResults = new Map();
  for (let yo = 0; yo < subcommands.length; yo++) {
    let Ho = subcommands[yo],
      rr = subcommandResultList[yo],
      br = subcommandResults.get(Ho),
      Hr = co[rr.behavior],
      Fr = br ? co[br.behavior] : -1;
    if (
      !br ||
      Hr > Fr ||
      (Hr === Fr &&
        findSafetyCheckReason(rr.decisionReason) !== void 0 &&
        findSafetyCheckReason(br.decisionReason) === void 0)
    )
      subcommandResults.set(Ho, rr);
  }
  if (subcommandResultList.every((subcommand) => subcommand.behavior === "allow"))
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "subcommandResults",
        reasons: uQ()
          ? labelSubcommandResults(subcommands, astCommandsByIdx, subcommandResultList)
          : subcommandResults,
      },
    };
  let collectedRules = new Map();
  for (let yo = 0; yo < subcommandResultList.length; yo++) {
    let Ho = subcommands[yo],
      rr = subcommandResultList[yo];
    if (rr.behavior === "ask" || rr.behavior === "passthrough") {
      let br = "suggestions" in rr ? rr.suggestions : void 0,
        rules = extractRules(br);
      for (let rule of rules) {
        let ruleKey = formatPermissionRule(rule);
        collectedRules.set(ruleKey, rule);
      }
      if (rr.behavior === "ask" && rules.length === 0 && rr.decisionReason?.type !== "rule")
        for (let rule of extractRules(suggestionForExactCommand(Ho))) {
          let ruleKey = formatPermissionRule(rule);
          collectedRules.set(ruleKey, rule);
        }
    }
  }
  let decisionReason = { type: "subcommandResults", reasons: subcommandResults },
    cappedRules = Array.from(collectedRules.values()).slice(0, aDo),
    $o =
      cappedRules.length > 0
        ? [{ type: "addRules", rules: cappedRules, behavior: "allow", destination: "localSettings" }]
        : void 0;
  return {
    behavior: askSubresult !== void 0 ? "ask" : "passthrough",
    message: createPermissionRequestMessage(BashTool.name, decisionReason),
    decisionReason: decisionReason,
    suggestions: $o,
  };
}
//@ chunk-e6aww6q8.js:1243231-1243296 layout
var TENGU_WILD_OCTOPUS = "tengu_wild_octopus",
  LEADING_TIME_PREFIX_RE = /^(?:time[ \t]+(?:--[ \t]+)?)+/;
/**
 * 把命令剥离安全包装后解析 argv 交给谓词；开关 tengu_wild_octopus 打开时还会对 argv 再做包装剥离后再判一次。
 */
//@ chunk-e6aww6q8.js:1243296-1243435 layout
function matchesArgvAfterUnwrap(e, n, r) {
  let s = stripSafeWrappers(e),
    h = getCommandArgv(s);
  if (r(h)) return !0;
  if (!readFlagWithOverride(TENGU_WILD_OCTOPUS, { safe: !0 })) return !1;
  let y = s === e ? h : getCommandArgv(e.replace(LEADING_TIME_PREFIX_RE, ""));
  return r(n(y));
}
/**
 * 规范化后的命令是否是 git 命令（含 time/nohup 等包装后的 git、xargs git）。
 */
//@ chunk-e6aww6q8.js:1243435-1243583 fingerprint = isNormalizedGitCommand (0.939)
function isNormalizedGitCommand(command) {
  if (command.startsWith("git ") || command === "git") return !0;
  if (
    matchesArgvAfterUnwrap(
      command,
      stripWrappersFromArgvForPaths,
      (n) => n[0] === "git" || (n[0] === "xargs" && n.includes("git")),
    )
  )
    return !0;
  return JDo(command);
}
//@ chunk-e6aww6q8.js:1243583-1243608 layout
function JDo(e) {
  return !1;
}
//@ chunk-e6aww6q8.js:1243608-1243694 layout
function oT(e) {
  return matchesArgvAfterUnwrap(
    e,
    stripCommandBuiltinPrefixes,
    ([n]) => n === "cd" || n === "pushd" || n === "popd" || n === "chdir",
  );
}
//@ chunk-e6aww6q8.js:1243694-1243747 placement
function commandHasAnyCd(command) {
  return splitCommand(command).some((subcmd) => oT(subcmd.trim()));
}
/**
 * 从命令中提取 rm 的字面目标路径（可能用两种读法解析），命令含 cd 时只保留绝对路径，展开后去重返回。
 */
//@ chunk-e6aww6q8.js:1243747-1244182 placement
async function extractLiteralRmTargets(e, n) {
  if (!/\brm\b/.test(e)) return [];
  let r = () => Ndt(() => parseForSecurity(e)),
    [s, h] = await runWithReadingRefusals(r),
    y = h === void 0 ? [s] : [await DIt(r), await bcs(r)],
    S = Ndt(() => commandHasAnyCd(e)),
    w = new Set();
  for (let L of y) {
    if (L.kind !== "simple") {
      logForDebugging(`literalRmTargets: ${e.length}-char command not read (${L.kind})`);
      continue;
    }
    for (let command of L.commands) {
      let [q, ...Z] = stripWrappersFromArgvForPaths(command.argv);
      if (normalizeCommandName(q) !== "rm") continue;
      for (let Se of PATH_EXTRACTORS.rm(Z).map(Lu)) if (!S || isAbsolute_20(Se)) w.add(expandPath(Se, n));
    }
  }
  return [...w];
}
//@ chunk-e6aww6q8.js:1244182-1244222 placement
function ZDo(e, n) {
  return !isSafeEnvVarName(e) || isPathLikeEnvValue(n);
}
//@ chunk-e6aww6q8.js:1244222-1244258 placement
function RQ(e) {
  return stripAllLeadingEnvVars(e, ZDo, !1);
}
//@ chunk-e6aww6q8.js:1244258-1244293 placement
function pqe(e) {
  return stripSafeWrappers(e, !1, !1);
}
//@ chunk-e6aww6q8.js:4855075-4855835 placement
function mergeBashSubcommandVerdicts(e, n, r, s) {
  if (
    !e.dangerouslyDisableSandbox ||
    r.behavior === "deny" ||
    (s === "eachVerdict" ? r.behavior === "ask" : r.behavior === "allow") ||
    isAllRuleReason(r.decisionReason) ||
    shouldUseSandbox(e) ||
    !shouldUseSandbox({ ...e, dangerouslyDisableSandbox: !1 }) ||
    (s === "chosenVerdict" &&
      (r.behavior === "ask" ? !shouldRetagAskAsSandboxOverride(r) : !sandboxOverrideAskGuardsOn()))
  )
    return r;
  let h = DWr({ toolName: BASH_TOOL_NAME, input: e, context: n });
  if (h) return h;
  if (r.behavior === "allow" || (r.behavior === "passthrough" && s === "eachVerdict"))
    return {
      behavior: "ask",
      decisionReason: { type: "sandboxOverride", reason: "dangerouslyDisableSandbox" },
      message: "Run outside of the sandbox",
    };
  return {
    behavior: "ask",
    decisionReason: {
      type: "sandboxOverride",
      reason: "dangerouslyDisableSandbox",
      replaces: { decisionReason: r.decisionReason, message: r.message, blockedPath: r.blockedPath },
    },
    message: "Run outside of the sandbox",
  };
}
/**
 * 从 cd/pushd 的 argv 求目标目录：无参数为 homedir，popd、pushd 无参、±N 栈操作、多个参数、"-" 返回 undefined。
 */
//@ chunk-63f0f3kd.js:106273-106715 fingerprint = isNormalizedCdCommand (0.91)
function getCdTargetFromArgv(command) {
  let stripped = findDirectoryChangeIndex(command),
    lower = (command[stripped] ?? "").toLowerCase();
  if (lower === "popd") return;
  if (lower === "pushd" && command.length - stripped - 1 === 0) return;
  if (command.slice(stripped + 1).some((d) => /^[+-]\d+$/.test(d))) return;
  let sliced = command.slice(stripped + 1),
    index = sliced.indexOf("--"),
    a = index === -1 ? sliced : sliced.slice(0, index),
    o = index === -1 ? [] : sliced.slice(index + 1),
    u = index !== -1 || a.some((d) => d !== "-" && d.startsWith("-")),
    l = [...a.filter((d) => d === "-" || !d.startsWith("-")), ...o];
  if (l.length === 0) return u ? void 0 : homedir();
  if (l.length > 1 || l[0] === "-") return;
  return l[0];
}
/**
 * 通用前缀权限建议：规则内容为 "<前缀> *"。
 */
//@ chunk-dcmhvw5a.js:214446-214577 placement = buildSuggestions (1)
function buildToolPrefixAllowSuggestion(e, n) {
  return [
    {
      type: "addRules",
      rules: [{ toolName: e, ruleContent: `${n} *` }],
      behavior: "allow",
      destination: "localSettings",
    },
  ];
}
/**
 * 把当前权限模式规整为分类器使用的模式（bypassPermissions 被禁用或 auto 不可用时回落为 default）。
 */
//@ chunk-fnhsh6ng.js:2095-2231 fingerprint = startSpeculativeClassifierCheck (1)
function resolveAvailablePermissionMode(r) {
  let allowDescriptions = toExternalPermissionMode(permissionModeFromString(r ?? "default"));
  if (allowDescriptions === "bypassPermissions" && isBypassPermissionsModeDisabled()) return "default";
  if (allowDescriptions === "auto" && !isAutoModeGateEnabled()) return "default";
  return allowDescriptions;
}
/**
 * 判断对象上是否带有 classifier:true 的决策标记。
 */
//@ chunk-m79qv8gp.js:11458-11568 fingerprint = awaitClassifierAutoApproval (0.353)
function isClassifierDecision(e) {
  let n = Reflect.get(e, ASSET_TARGET_PIN_TAG);
  return typeof n === "object" && n !== null && Reflect.get(n, "classifier") === !0;
}
/**
 * PowerShell 的精确规则检查（命令先规范化），deny/ask/allow 规则命中即返回，否则 passthrough 并附精确命令建议。
 */
//@ chunk-v0yfsee9.js:75146-75763 fingerprint = bashToolCheckExactMatchPermission (1)
function powershellToolCheckExactMatchPermission_2(input, toolPermissionContext) {
  let r = trimPsWhitespace(input.command),
    s = { ...input, command: r },
    {
      matchingDenyRules: matchingDenyRules,
      matchingAskRules: matchingAskRules,
      matchingAllowRules: matchingAllowRules,
    } = matchingRulesForInput_2(s, toolPermissionContext, "exact");
  if (matchingDenyRules[0] !== void 0)
    return {
      behavior: "deny",
      message: `Permission to use ${POWERSHELL_TOOL_NAME} with command ${r} has been denied.`,
      decisionReason: { type: "rule", rule: matchingDenyRules[0] },
    };
  if (matchingAskRules[0] !== void 0)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME),
      decisionReason: { type: "rule", rule: matchingAskRules[0] },
    };
  if (matchingAllowRules[0] !== void 0)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "rule", rule: matchingAllowRules[0] },
    };
  let decisionReason = { type: "other", reason: "This command requires approval" };
  return {
    behavior: "passthrough",
    message: createPermissionRequestMessage(POWERSHELL_TOOL_NAME, decisionReason),
    decisionReason: decisionReason,
    suggestions: suggestionForExactCommand_2(r),
  };
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
  Cye,
  lazySessionEnvVarNames,
  hasRiskyBareAssignment,
  isNormalizedGitCommand,
  oT,
  isSafeEnvAssignment,
  isPlainPathToken,
  unwrapCommandArgv,
  isSimpleAndChain,
  bashToolHasPermission,
  getStructuralMissKind,
  RQ,
  pqe,
  isSafeEnvVarName,
  isPathLikeEnvValue,
  yQ,
  parseBashPermissionRule,
  resolveAvailablePermissionMode,
  isClassifierDecision,
};
