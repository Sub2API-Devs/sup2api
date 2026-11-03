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
function countSafeEnvPrefix(e) {
  let n = 0;
  while (n < e.length && ENV_ASSIGNMENT_RE.test(e[n])) {
    let r = firstLineOf(e[n], "=");
    if (!isSafeEnvAssignment(r, e[n].slice(r.length + 1))) return null;
    n++;
  }
  return n;
}
//@ chunk-e6aww6q8.js:1164580-1164960 placement
/**
 * 从命令中取出可作为规则前缀的"命令 子命令"（跳过安全的环境变量赋值，子命令须为小写 kebab 形式，必要时取更深层子命令）；裸 shell 前缀返回 null。
 */
function getSubcommandPrefix(command) {
  let filtered = command.trim().split(/\s+/).filter(Boolean);
  if (filtered.length === 0) return null;
  let r = countSafeEnvPrefix(filtered);
  if (r === null) return null;
  let sliced = filtered.slice(r);
  if (sliced.length < 2) return null;
  if (BARE_SHELL_PREFIXES.has(sliced[0].split("/").pop())) return null;
  let h = sliced[1];
  let y = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;
  if (!y.test(h)) return null;
  let S = noAdditionalDepthRule(sliced[0], h) ?? 2;
  let w = 2;
  while (w < S && y.test(sliced[w] ?? "")) w++;
  return w < S ? null : sliced.slice(0, w).join(" ");
}
//@ chunk-e6aww6q8.js:1164960-1165276 fingerprint = BARE_SHELL_PREFIXES (0.706)
/**
 * 会把后续参数当命令执行的"裸 shell/包装"命令名（sh/bash/zsh/pwsh/env/xargs/sudo/timeout/nohup/strace…）；规则建议不会为这些前缀生成前缀规则。
 */
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
//@ chunk-e6aww6q8.js:1165276-1165416 placement
/**
 * 判断命令（去掉前导环境变量后）是否以裸 shell 开头（如 bash、sh）。
 */
function startsWithBareShell(e) {
  let parts = stripAllLeadingEnvVars(e.trim()).split(/\s+/);
  let r = 0;
  while (r < parts.length && ENV_ASSIGNMENT_RE.test(parts[r])) r++;
  let s = parts[r];
  return !!s && BARE_SHELL_PREFIXES.has(s.split("/").pop());
}
//@ chunk-e6aww6q8.js:1165416-1165670 placement
/**
 * 获取命令的裸命令前缀（跳过安全的环境变量），用于生成权限规则；shell 或特殊命令返回 null。
 */
function getBareCommandPrefix(command) {
  let filtered = command.trim().split(/\s+/).filter(Boolean);
  let r = countSafeEnvPrefix(filtered);
  if (r === null) return null;
  let s = filtered[r];
  if (!s) return null;
  if (!/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(s)) return null;
  if (BARE_SHELL_PREFIXES.has(s)) return null;
  if (noAdditionalDepthRule(s, filtered[r + 1] ?? "") !== undefined) return null;
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
/**
 * 按 Bash 权限规则模式（含 xargs 前缀）匹配命令文本。
 */
function matchesCommandRule(e, cmdToMatch) {
  return matchWildcardPattern(e, cmdToMatch, false, true);
}
//@ chunk-e6aww6q8.js:1166321-1166857 fingerprint = SAFE_ENV_VARS (0.91)
/**
 * Bash 安全环境变量白名单（GO*\/RUST_*\/NODE_ENV/PYTHON*\/LANG/LC_*\/TERM/NO_COLOR/TZ/CI…）；wQ 是规则内容解析函数的别名（exact/prefix/wildcard）。
 */
var parseBashPermissionRule = parseShellPermissionRule;
var SAFE_ENV_VARS = new Set([
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
//@ chunk-e6aww6q8.js:1166857-1166891 layout
/**
 * 变量名是否在 Bash 安全环境变量白名单 SAFE_ENV_VARS 中。
 */
function isSafeEnvVarName(e) {
  return SAFE_ENV_VARS.has(e);
}
//@ chunk-e6aww6q8.js:1166891-1166929 layout
function isSafeEnvVarNameForStrip(e) {
  return SAFE_ENV_VARS.has(e) || false;
}
//@ chunk-e6aww6q8.js:1166929-1166997 layout
var PATH_LIKE_VALUE_RE = /^[.~]*[/\\]|[/\\][/\\]|:[/\\.]|(?:^|[/\\])\.\.(?:[/\\]|$)/;
//@ chunk-e6aww6q8.js:1166997-1167104 layout
/**
 * 值看起来像路径（以 ./ ~/ / 开头、含 ..、URL 冒号斜杠等）且路径型值检查开关打开时返回 true；这类赋值不能作为安全前缀剥离。
 */
function isPathLikeEnvValue(e) {
  let replaced = e.replaceAll('"', "").replaceAll("'", "");
  return (
    (PATH_LIKE_VALUE_RE.test(replaced) || PATH_LIKE_VALUE_RE.test(deletePlaceholders(replaced))) &&
    noteRefusal()
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
function isRiskyBareAssignmentName(subcmd, n) {
  return (
    subcmd === "PWD" ||
    subcmd === "OLDPWD" ||
    (!isSafeEnvVarNameForStrip(subcmd) && n()?.has(subcmd) !== false)
  );
}
//@ chunk-e6aww6q8.js:1167279-1167318 layout
/**
 * 返回会话环境变量名集合的惰性读取器（供 hasRiskyBareAssignment 判断裸赋值）。
 */
function lazySessionEnvVarNames(e) {
  shellEnvSnapshot();
  return () => spawnEnvKeysForSession(e);
}
//@ chunk-e6aww6q8.js:1167318-1167377 layout
/**
 * 复合命令里的裸赋值是否可能改变目录语义：赋值给 PWD/OLDPWD，或给不在安全表但存在于会话环境变量里的名字。
 */
function hasRiskyBareAssignment(e, n) {
  let r = onceExport(n);
  return e.some((subcmd) => isRiskyBareAssignmentName(subcmd, r));
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
function stripSafeWrappers(e, n = true, r = true) {
  let s = [
    /^timeout[ \t]+(?:(?:--(?:foreground|preserve-status|verbose)|--(?:kill-after|signal)=[A-Za-z0-9_.+-]+|--(?:kill-after|signal)[ \t]+[A-Za-z0-9_.+-]+|-v|-[ks][ \t]+[A-Za-z0-9_.+-]+|-[ks][A-Za-z0-9_.+-]+)[ \t]+)*(?:--[ \t]+)?\d+(?:\.\d+)?[smhd]?[ \t]+/,
    /^time[ \t]+(?:--[ \t]+)?/,
    /^nice(?:[ \t]+-n[ \t]+-?\d+|[ \t]+-\d+)?[ \t]+(?:--[ \t]+)?/,
    /^stdbuf(?:[ \t]+-[ioe][LN0-9]+)+[ \t]+(?:--[ \t]+)?/,
    /^nohup[ \t]+(?:--[ \t]+)?/,
    /^command(?:[ \t]+-p+)*(?:[ \t]+--)?[ \t]+(?!-)/,
    /^builtin(?:[ \t]+--)?[ \t]+(?!-)/,
    /^noglob[ \t]+(?!-)/,
  ];
  let h = /^([A-Za-z_][A-Za-z0-9_]*)=([A-Za-z0-9_./:-]+)[ \t]+/;
  let y = (command) => (r ? stripCommentLines(command) : command);
  let S = e;
  let w = "";
  while (S !== w) {
    w = S;
    S = y(S);
    let G = n ? S.match(h) : null;
    if (G && isSafeEnvAssignment(G[1], G[2])) S = S.replace(h, "");
  }
  function L(G) {
    let match = G.match(/^([^\s]+)([\s\S]*)$/);
    if (!match) return G;
    let Z = match[1];
    let Se = null;
    let ke = false;
    let we = "";
    for (let idx = 0; idx < Z.length; idx++) {
      let Ae = Z[idx];
      ke = false;
      if (Se === "'") {
        if (Ae === "'") Se = null;
        else we += Ae;
      } else if (Se === '"') {
        if (Ae === "\\") {
          let Ie = Z[idx + 1];
          if (Ie === "$" || Ie === "`" || Ie === '"' || Ie === "\\") {
            we += Ie;
            idx++;
          } else if (Ie === undefined) ke = true;
          else we += Ae;
        } else if (Ae === '"') Se = null;
        else we += Ae;
      } else if (Ae === "\\") {
        let Ie = Z[idx + 1];
        if (Ie === undefined) ke = true;
        else {
          we += Ie;
          idx++;
        }
      } else if (Ae === '"' || Ae === "'") Se = Ae;
      else we += Ae;
    }
    if (Se !== null || ke) return G;
    return we + match[2];
  }
  S = L(y(S));
  w = "";
  while (S !== w) {
    w = S;
    for (let G of s) S = S.replace(G, "");
    if (S !== w) S = L(y(S));
  }
  return S.trim();
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
  let n = argv;
  for (;;) {
    let r = stripPathAndExe(n[0] ?? "");
    if (r === "time" || r === "nohup") {
      let s = r === "time" && n[1] === "-p" ? 2 : 1;
      if (n[s]?.startsWith("-") && n[s] !== "--") return n;
      n = n.slice(n[s] === "--" ? s + 1 : s);
    } else if (r === "timeout") {
      let i = skipTimeoutFlags(n);
      if (i < 0 || !n[i] || !/^\d+(?:\.\d+)?[smhd]?$/.test(n[i])) return n;
      n = n.slice(i + 1);
    } else if (r === "nice" && n[1] === "-n" && n[2] && /^-?\d+$/.test(n[2]))
      n = n.slice(n[3] === "--" ? 4 : 3);
    else return n;
  }
}
//@ chunk-e6aww6q8.js:1169778-1170112 layout
/**
 * 命令是否带有不在安全表里（或值像路径）的 env 前缀；有 AST 时直接看 envVars。
 */
function hasUnsafeEnvVarPrefix(e, astCommand) {
  if (astCommand) return astCommand.envVars.some((envVar) => !isSafeEnvAssignment(envVar.name, envVar.value));
  let r = /^([A-Za-z_][A-Za-z0-9_]*)\+?=/;
  let s = /^[A-Za-z_][A-Za-z0-9_]*\+?=("[^"$`\\]*"|'[^']*'|[A-Za-z0-9_./:+-]*)[ \t]+/;
  let command = e.command;
  for (;;) {
    let match = command.match(r);
    if (!match) return false;
    if (!isSafeEnvVarNameForStrip(match[1])) return true;
    let m = command.match(s);
    if (!m || !isSafeEnvAssignment(match[1], m[1])) return true;
    command = command.slice(m[0].length);
  }
}
//@ chunk-e6aww6q8.js:1170112-1170440 file-local
/**
 * 剥离所有前导 VAR=value（含数组下标、引号值），可用回调/正则在特定变量处停止；用于 deny/ask 规则匹配时不被 env 前缀绕过。
 */
function stripAllLeadingEnvVars(command, isUnsafeEnvAssignment, r = true) {
  let ENV_VAR_PATTERN =
    /^([A-Za-z_][A-Za-z0-9_]*(?:\[[^\]]*\])?)\+?=((?:'[^'\n\r]*'|"(?:\\.|[^"$`\\\n\r])*"|\\.|[^ \t\n\r$`;|&()<>\\\\'"])*)[ \t]+/;
  let stripped = command;
  let previousStripped = "";
  while (stripped !== previousStripped) {
    previousStripped = stripped;
    if (r) stripped = stripCommentLines(stripped);
    let m = stripped.match(ENV_VAR_PATTERN);
    if (!m) continue;
    let w = m[1];
    if (
      typeof isUnsafeEnvAssignment === "function"
        ? isUnsafeEnvAssignment(w, m[2])
        : isUnsafeEnvAssignment?.test(w)
    )
      break;
    stripped = stripped.slice(m[0].length);
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
};
var WRAPPER_COMMAND_STRING_FLAGS = {
  env: new Set(["-S", "--split-string"]),
  flock: new Set(["-c", "--command"]),
  script: new Set(["-c", "--command"]),
};
var WRAPPER_LEADING_OPERAND_CHECKS = {
  chrt: (e) => /^\d+$/.test(e),
  taskset: (e) => /^(0x[\da-f]+|\d+)$/i.test(e),
  flock: () => true,
  script: () => true,
};
var ENV_ASSIGNMENT_RE_2 = /^[A-Za-z_][A-Za-z0-9_]*\+?=/;
//@ chunk-e6aww6q8.js:1172319-1173302 layout
/**
 * 把 argv 中的 env 赋值和 sudo/doas/env/watch/ionice/taskset/chrt/strace/ltrace/flock/script/unshare/nsenter/exec/command 等包装（含它们带值的选项、env -S/flock -c 的命令串）一层层剥掉，得到真正执行的命令 argv。
 */
function unwrapCommandArgv(e) {
  let argv = e.slice();
  for (;;) {
    while (argv[0] !== undefined && ENV_ASSIGNMENT_RE_2.test(argv[0])) argv = argv.slice(1);
    argv = stripWrappersFromArgv(argv);
    if (argv[0] === undefined) return argv;
    let r = stripPathAndExe(argv[0]);
    let s = getOwn(WRAPPER_FLAGS_WITH_VALUE, r);
    if (s === undefined) return argv;
    let h = getOwn(WRAPPER_COMMAND_STRING_FLAGS, r);
    let y = getOwn(WRAPPER_LEADING_OPERAND_CHECKS, r);
    let S = 1;
    let w;
    let L = false;
    while (S < argv.length) {
      let G = argv[S];
      if (G === "--") {
        S++;
        if (!L && y !== undefined && S + 1 < argv.length && y(argv[S])) {
          L = true;
          S++;
          continue;
        }
        break;
      }
      if (h !== undefined) {
        if (h.has(G) && argv[S + 1] !== undefined) {
          let trimmed = argv[S + 1].trim();
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
      if (G.startsWith("-") && (G !== "-" || y === undefined)) {
        if (r === "command" && isVersionOnlyFlag(G)) return argv;
        S += s.has(G) && S + 1 < argv.length ? 2 : 1;
        continue;
      }
      if (r === "env" && ENV_ASSIGNMENT_RE_2.test(G)) {
        S++;
        continue;
      }
      if (!L && y?.(G) && S + 1 < argv.length) {
        L = true;
        S++;
        continue;
      }
      break;
    }
    if (w !== undefined) {
      argv = w.trim().split(/\s+/);
      if (argv.length === 0 || argv[0] === "") return e.slice();
      continue;
    }
    if (S >= argv.length) return argv;
    argv = argv.slice(S);
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
    ruleBehavior: S,
    compoundBareAssignmentNames: w = [],
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
    let ke = command?.argv ?? getCommandArgv(commandWithoutRedirections);
    let we = unwrapCommandArgv(ke);
    if (we.length > 0 && (we[0] !== ke[0] || (command?.envVars.length ?? 0) > 0))
      commandsToTry.push(we.join(" "));
    if (we[0] !== undefined && stripPathAndExe(we[0]) !== we[0])
      commandsToTry.push([stripPathAndExe(we[0]), ...we.slice(1)].join(" "));
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
          S === "allow" &&
          matchMode === "prefix" &&
          command !== undefined &&
          matchesCertifiedCommand(ruleContent, command, w)
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
            if (S !== "deny" && S !== "ask" && !endsWithUnescapedStar(bashRule.pattern)) return false;
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
  { skipCompoundCheck = false, astCommand: h, compoundBareAssignmentNames: y = [] } = {},
) {
  let denyRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "deny");
  let matchingDenyRules = filterRulesByContentsMatchingInput(input, denyRuleByContents, matchMode, {
    stripAllEnvVars: true,
    skipCompoundCheck: true,
    astCommand: h,
    ruleBehavior: "deny",
  });
  let askRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "ask");
  let matchingAskRules = filterRulesByContentsMatchingInput(input, askRuleByContents, matchMode, {
    stripAllEnvVars: true,
    skipCompoundCheck: true,
    astCommand: h,
    ruleBehavior: "ask",
  });
  let allowRuleByContents = getContentRulesMapForTool(toolPermissionContext, BashTool, "allow");
  let matchingAllowRules = filterRulesByContentsMatchingInput(input, allowRuleByContents, matchMode, {
    skipCompoundCheck,
    ruleBehavior: "allow",
    astCommand: h,
    compoundBareAssignmentNames: y,
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
async function findSpanNotCoveredByRuleGroups(e, bashCommandClamps) {
  if (bashCommandClamps.length === 0) return null;
  let r = {
    span: e.command.trim(),
    group: bashCommandClamps[0] ?? [],
    kind: "unverifiable",
  };
  let commandRaw = await parseCommandRaw(e.command);
  if (commandRaw === PARSE_ABORTED) return r;
  let h = commandRaw
    ? parseForSecurityFromAst(e.command, commandRaw)
    : {
        kind: "simple",
        commands: [],
        bareAssignmentNames: [],
      };
  if (h.kind === "too-complex") return r;
  let y = splitCommandStrict(e.command);
  if (y === null || y.length === 0) return r;
  let S = uniq([...y, ...h.commands.map((command) => command.text)]);
  for (let w of bashCommandClamps) {
    let L = new Map();
    for (let G of w) {
      let q = permissionRuleValueFromString(G);
      if (q.toolName !== BashTool.name || q.ruleContent === undefined || q.ruleContent === "") continue;
      L.set(q.ruleContent, {
        source: "session",
        ruleBehavior: "allow",
        ruleValue: q,
      });
    }
    for (let G of S) {
      let q = {
        ...e,
        command: G,
      };
      if (!(
        filterRulesByContentsMatchingInput(q, L, "exact", {
          ruleBehavior: "allow",
        }).length > 0 ||
        filterRulesByContentsMatchingInput(q, L, "prefix", {
          ruleBehavior: "allow",
        }).length > 0
      ))
        return {
          span: G,
          group: w,
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
function denyForBashCommandClamp(e, shellPermission) {
  let bashCommandClamps = getToolPermissionContext(shellPermission).bashCommandClamps;
  if (bashCommandClamps !== undefined && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message:
        `Permission to use ${e} has been denied: this agent carries a per-spawn bashCommandClamp, which scopes shell ` +
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
function denyCrashedCheckUnderCommandClamp(e, shellPermission) {
  let bashCommandClamps = getToolPermissionContext(shellPermission).bashCommandClamps;
  if (bashCommandClamps !== undefined && bashCommandClamps.length > 0)
    return {
      behavior: "deny",
      message: `The ${e} permission check crashed and this agent carries a per-spawn bashCommandClamp; denying rather than running an unverified command.`,
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
  let n = stripWrappersFromArgvForPaths([...argv]);
  let r = n[0];
  if (r === undefined) return false;
  let replaced = r.slice(r.lastIndexOf("/") + 1).replace(/[\d.]+$/, "");
  if (!INLINE_CODE_FLAGS.has(replaced)) return false;
  let sliced = n.slice(1);
  if (sliced.includes("-")) return true;
  return sliced.every((y) => y.startsWith("-"));
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
    let S = expandTildeWithHome(path);
    if (isUncOrDevicePath(S) || firstGlobCharIndex(S) !== -1) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let w = isAbsolute(S) ? S : resolve_2(cwd, S);
    if (!hasInteriorDotDot(S) && !getFsImplementation().existsSync(w)) continue;
    let L = validatePath(path, cwd, context, "read");
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
//@ chunk-e6aww6q8.js:1178560-1181654 sole-consumer
/**
 * 检查单个命令是否会读取工作目录外路径（permissions.blockReadsOutsideWorkingDirectories）：处理 env 赋值、git 路径选项、从 stdin/内联执行代码、xargs，以及各参数（含 --opt=路径、glob、~）的路径校验，返回 deny/ask 或 undefined。
 */
function checkCommandAgainstReadBlock(command, cwd, context, requireAbsolute, trustedInline) {
  if (!command) return;
  let y = command.argv[0] ?? "";
  if (
    !trustedInline &&
    y.slice(y.lastIndexOf("/") + 1) === "env" &&
    command.argv.slice(1).some((arg) => {
      let match = /^([A-Za-z_][A-Za-z0-9_]*)=/.exec(arg);
      return match !== null && !isSafeEnvAssignment(match[1], arg.slice(match[0].length));
    })
  )
    return outsideReadsTooComplexAsk(
      "an environment variable assignment outside the safe list cannot be checked against the read block",
    );
  let argv = stripWrappersFromArgvForPaths([...command.argv]);
  let w = argv[0];
  if (w === undefined) return;
  let commandName = w.slice(w.lastIndexOf("/") + 1);
  if (commandName === "git") {
    let paths = [];
    for (let idx = 1; idx < argv.length; idx++) {
      let ke = argv[idx];
      if (
        (ke === "-C" || ke === "--git-dir" || ke === "--work-tree" || ke === "--file" || ke === "-f") &&
        argv[idx + 1] !== undefined
      ) {
        paths.push(argv[idx + 1]);
        idx++;
      } else if (/^--(git-dir|work-tree|file)=/.test(ke)) paths.push(ke.slice(ke.indexOf("=") + 1));
      else if (ke.startsWith("-C") && ke.length > 2) paths.push(ke.slice(2));
    }
    return paths.length === 0 ? undefined : checkGitPathArgsForReadBlock(commandName, paths, cwd, context);
  }
  if (Object.hasOwn(PATH_EXTRACTORS, w) || READ_BLOCK_EXEMPT_COMMANDS.has(commandName)) return;
  let inlineCodeFlags = INLINE_CODE_FLAGS.get(commandName.replace(/[\d.]+$/, ""));
  if (!trustedInline && inlineCodeFlags !== undefined && argv.slice(1).includes("-"))
    return outsideReadsTooComplexAsk(
      `${commandName} runs code from stdin, which cannot be checked against the read block`,
    );
  if (commandName === "xargs") return outsideReadsRuntimePathAsk(commandName);
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
      `${commandName} runs inline code, which cannot be checked against the read block`,
    );
  let ask;
  for (let arg of argv.slice(1)) {
    if (arg === "") continue;
    if (containsAnyPlaceholder(arg)) {
      ask ??= outsideReadsRuntimePathAsk(commandName);
      continue;
    }
    let index = arg.indexOf("=");
    let ke = arg.startsWith("-")
      ? index > 0
        ? [arg.slice(index + 1)]
        : !arg.startsWith("--") && arg.length > 2
          ? [arg.slice(2)]
          : []
      : index > 0 && /^[A-Za-z_][A-Za-z0-9_]*$/.test(arg.slice(0, index))
        ? [arg, arg.slice(index + 1)]
        : [arg];
    for (let we of ke) {
      if (we === "") continue;
      if (we.startsWith("~") && we !== "~" && !we.startsWith("~/")) {
        ask ??= outsideReadsRuntimePathAsk(commandName);
        continue;
      }
      let Ee = expandTildeWithHome(we);
      if (isUncOrDevicePath(Ee)) {
        ask ??= outsideReadsRuntimePathAsk(commandName);
        continue;
      }
      if (requireAbsolute && !isAbsolute(Ee)) {
        ask ??= outsideReadsRuntimePathAsk(commandName);
        continue;
      }
      let Ae = we;
      let Ie = firstGlobCharIndex(Ee);
      if (Ie !== -1) {
        let sliced = Ee.slice(0, Ie);
        Ae = sliced.endsWith("/") ? sliced : dirname(sliced);
        if (shellPathSegments(Ee).some((Je) => urlPatternToRegex(Je)) || globBeforeInteriorDotDot(Ee)) {
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
      let Me = expandTildeWithHome(Ae);
      let We = isAbsolute(Me) ? Me : resolve_2(cwd, Me);
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
  y = [],
  S,
  w,
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
      compoundBareAssignmentNames: y,
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
  let ke = checkPathConstraints(
    input,
    cwd,
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand?.redirects,
    astCommand ? [astCommand] : undefined,
    S,
  );
  if (ke.behavior === "deny" || (ke.behavior === "ask" && !ke.bashAllowRuleOverridable)) return ke;
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
    let ze = checkSedConstraints(input, toolPermissionContext);
    if (ze.behavior === "ask" && isOutsideReadsBlockedAsk(ze.decisionReason)) return ze;
  }
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories === true) {
    if (
      hasUnsafeEnvVarPrefix(input, astCommand) &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(toolPermissionContext))
    )
      return outsideReadsTooComplexAsk(
        "an environment variable prefix outside the safe list cannot be checked against the read block",
      );
    let ze = checkCommandAgainstReadBlock(
      astCommand,
      cwd,
      toolPermissionContext,
      compoundCommandHasCd === true,
      shouldUseSandbox(input) && isSandboxReadBlockEnforceable(toolPermissionContext),
    );
    if (ze) return ze;
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
  if (ke.behavior === "ask") return ke;
  let sedConstraintResult = checkSedConstraints(input, toolPermissionContext);
  if (sedConstraintResult.behavior !== "passthrough") return sedConstraintResult;
  let modeResult = checkPermissionMode(input, toolPermissionContext);
  if (modeResult.behavior !== "passthrough") return modeResult;
  let Ae = lazySessionEnvVarNames(w && sessionEnvVarNameSet(w));
  let Ie = hasBashDenyRule(toolPermissionContext) && hasZshDangerousCommand(input.command);
  let Me = astCommand !== undefined && hasUnsafeGlobSource(astCommand);
  if (
    !Ie &&
    !Me &&
    BashTool.isReadOnly(input, w) &&
    !hasUnsafeEnvVarPrefix(input, astCommand) &&
    !hasRiskyBareAssignment(y, Ae)
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
  y,
  bareAssignmentNames = [],
  toolUseContext,
) {
  let L = bashToolCheckExactMatchPermission(input, toolPermissionContext);
  if (L.behavior === "deny" || L.behavior === "ask") return L;
  let G = bashToolCheckPermission(
    input,
    toolPermissionContext,
    compoundCommandHasCd,
    astCommand,
    y,
    bareAssignmentNames,
    undefined,
    toolUseContext,
  );
  if (G.behavior === "deny" || G.behavior === "ask") return G;
  if (G.behavior === "allow") return G;
  let suggestedUpdates = commandPrefixResult?.commandPrefix
    ? suggestionForPrefix(commandPrefixResult.commandPrefix)
    : suggestionForExactCommand(input.command);
  return {
    ...G,
    suggestions: suggestedUpdates,
  };
}
//@ chunk-e6aww6q8.js:1183707-1183928 layout
var INTERPRETER_COMMANDS = new Set(["python", "python3", "node", "bun", "deno", "ruby", "perl"]);
var DD_OPERAND_KEYS = new Set([
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
var INNER_WHITESPACE_RE = /[^ \t\n][ \t\n]+[^ \t\n]/;
//@ chunk-e6aww6q8.js:1183928-1185390 layout
/**
 * 沙箱开启且"沙箱内自动允许"打开时，对已解析的简单命令判断能否自动允许：排除危险 env 赋值、UNC 路径、/dev/tcp 重定向、cd 与 rm 组合、危险删除路径等，满足则返回规则检查结果（allow/ask/deny）。
 */
function checkSandboxAutoAllowForAst(e, permissionContext, commands, bareAssignmentNames, toolUseContext) {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    !SandboxManager.isAutoAllowBashIfSandboxedEnabled() ||
    !shouldUseSandbox(e) ||
    isSandboxAutoAllowOff(permissionContext) ||
    antDisabledListMatchesCommandText(e.command) ||
    (permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !isSandboxReadBlockEnforceable(permissionContext))
  )
    return null;
  let y = checkRulesForSandboxAutoAllow(e, permissionContext, commands);
  if (y.behavior === "passthrough") return null;
  let S = lazySessionEnvVarNames(sessionEnvVarNameSet(toolUseContext));
  let w =
    hasRiskyBareAssignment(bareAssignmentNames, S) ||
    commands.some((Z) => {
      let Se = stripWrappersFromArgvForPaths(Z.argv);
      let ke = Z.argv.length - Se.length + 1;
      let we =
        INTERPRETER_COMMANDS.has(Se[0] ?? "") &&
        getFeatureValue_CACHED_MAY_BE_STALE("tengu_quiet_larkspur", true)
          ? ke
          : Number.POSITIVE_INFINITY;
      let Ee =
        Se[0] === "dd" && getFeatureValue_CACHED_MAY_BE_STALE("tengu_plain_sorrel", true)
          ? ke
          : Number.POSITIVE_INFINITY;
      return (
        Z.envVars.some(
          (envVar) =>
            !isSafeEnvAssignment(envVar.name, envVar.value) &&
            (!INTERPRETER_COMMANDS.has(Z.argv[0] ?? "") ||
              isAssignmentNameUnsafeForSandbox(envVar.name) ||
              isDangerousEnvName(envVar.name) ||
              isBuildToolEnvVar(envVar.name) ||
              !getFeatureValue_CACHED_MAY_BE_STALE("tengu_umber_plover", true) ||
              getEffectiveFilesystemPolicy() === "relaxed" ||
              !SandboxManager.isUnsandboxedFallbackClosedByTrustedSource()),
        ) ||
        Z.argv.slice(1).some(isTildeUserPath) ||
        Z.redirects.some((redirect) => redirect.op === "<" && isTildeUserPath(redirect.target)) ||
        Z.argv.some((arg, Ie) => {
          if (!arg.includes("=") || arg.startsWith("-")) return false;
          let index = arg.indexOf("=");
          if (
            Ie >= Ee &&
            DD_OPERAND_KEYS.has(arg.slice(0, index)) &&
            !arg
              .slice(index + 1)
              .split(":")
              .some(isTildeUserPath)
          )
            return false;
          let We = arg[index - 1] === "+" ? arg.slice(0, index - 1) : arg.slice(0, index);
          if (Ie >= we && INNER_WHITESPACE_RE.test(We)) return false;
          return !isSafeEnvAssignment(We, arg.slice(index + 1));
        })
      );
    });
  let any = commands.some((command) =>
    command.redirects.some((subcmd) => /^\/dev\/(tcp|udp)\//.test(subcmd.target)),
  );
  if (w || any) return null;
  let G = false;
  let q = false;
  for (let Z of commands) {
    let [Se, ...ke] = stripWrappersFromArgvForPaths(Z.argv);
    let replaced = Se?.replace(/^.*[\\/]/, "");
    if (replaced === "cd" || replaced === "pushd" || replaced === "popd" || replaced === "chdir") {
      G = true;
      continue;
    }
    if (replaced !== "rm" && replaced !== "rmdir") continue;
    q = true;
    if (checkDangerousRemovalPaths(replaced, ke, getCwd(), permissionContext).behavior !== "passthrough")
      return null;
  }
  if (G && q) return null;
  return y;
}
//@ chunk-e6aww6q8.js:1185390-1188803 fingerprint = checkSandboxAutoAllow (0.592)
/**
 * AST 过于复杂时的沙箱自动允许：逐个片段检查 deny/ask 规则，再用一长串启发式（heredoc、${!x}、/proc/*\/environ、引号/展开、test/find/jobs/print/set 的危险用法）排除，全部通过则 allow（有 ask 规则则 ask）。
 */
function checkSandboxAutoAllow(e, permissionContext, nodeType) {
  if (
    !SandboxManager.isSandboxingEnabled() ||
    !SandboxManager.isAutoAllowBashIfSandboxedEnabled() ||
    !shouldUseSandbox(e) ||
    isSandboxAutoAllowOff(permissionContext) ||
    antDisabledListMatchesCommandText(e.command) ||
    (permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !isSandboxReadBlockEnforceable(permissionContext))
  )
    return null;
  if (nodeType === undefined || nodeType === "PARSE_ABORT" || nodeType === "ERROR") return null;
  if (/(?<!<)<<(?!<)/.test(e.command)) return null;
  if (/\$\{[\s|]/.test(e.command.replace(/['"\\]/g, ""))) return null;
  if (/\$\{![A-Za-z_0-9]/.test(e.command.replace(/['"\\]/g, ""))) return null;
  if (/\/proc\/.*\/environ/.test(e.command.replace(/['"\\]/g, ""))) return null;
  if (hasZshExecutableParenInBraceExpansion(e.command)) return null;
  let s = splitCommandStrict(e.command);
  if (s === null || s.length === 0) return null;
  let h;
  for (let command of s) {
    let { matchingDenyRules, matchingAskRules } = matchingRulesForInput(
      {
        ...e,
        command,
      },
      permissionContext,
      "prefix",
    );
    if (matchingDenyRules[0] !== undefined)
      return {
        behavior: "deny",
        message: `Permission to use ${BashTool.name} with command ${e.command.trim()} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: matchingDenyRules[0],
        },
      };
    h ??= matchingAskRules[0];
  }
  for (let y of s) {
    let filtered = y.trim().split(/\s+/).filter(Boolean);
    let subcommands = stripSafeLeadingAssignments(filtered);
    if (subcommands === null) return null;
    if (subcommands.length === 0) continue;
    let L = stripWrappersFromArgvForPaths(subcommands);
    let sliced = subcommands.slice(0, subcommands.length - L.length);
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
      if (Ae === 0) return false;
      if ((Ee.includes("$'") && !/^'[^']*\$'$/.test(Ee)) || (Ee.includes('$"') && !/^"[^"]*\$"$/.test(Ee)))
        return true;
      let Ie = mapped[Ae];
      return (
        Ie.includes("`") ||
        /\$\((?!\()/.test(Ie) ||
        (/\$[^(\s]/.test(Ie) && Ie.includes("-")) ||
        /\$\{[^}]*:?[+=]/.test(Ie) ||
        /\{[^\s]*(,|\.\.)/.test(Ee) ||
        (Ie.match(/\{/g) ?? []).length !== (Ie.match(/\}/g) ?? []).length
      );
    });
    let any_2 = mapped.some((Ee, Ae) => Ae > 0 && Ee.includes("$"));
    let any_3 = L.some((Ee, Ae) => Ae > 0 && (/[<>]/.test(Ee) || Ee.endsWith("\\")));
    let we = L[0];
    if (
      we === undefined ||
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
            let Ee = false;
            for (let idx = 1; idx < mapped.length; idx++) {
              let Ie = mapped[idx];
              let Me = Ee;
              Ee = false;
              if (isFindDangerousAction(Ie)) return true;
              if (isAmbiguousFindWord(Ie) || (L[idx] !== Ie && findWordTakesOperand(Ie))) return true;
              if (!Me && findWordTakesFlagValue(L[idx])) {
                Ee = true;
                continue;
              }
              if (!Me && findWordTakesOperand(L[idx])) {
                let We = mapped[idx + 1];
                let matches = /^'[^']*'$|^"[^"]*"$/.test(L[idx + 1] ?? "");
                if (We !== undefined && /[[\]*?]/.test(We) && !matches) return true;
                if (
                  We !== undefined &&
                  (!We.includes("$") || (matches && /^\$\{?[A-Za-z_]\w*\}?$/.test(We)))
                ) {
                  idx++;
                  continue;
                }
              }
              if (Ie.includes("$") || /[[\]*?]/.test(Ie)) return true;
            }
            return false;
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
            for (let idx = 1; idx < mapped.length; idx++) {
              let Ae = mapped[idx];
              if (Ae === "--") return false;
              if (Ae.includes("$")) return true;
              if (!/^[-+]/.test(Ae)) continue;
              for (let idx_2 = 1; idx_2 < Ae.length; idx_2++) {
                let Me = Ae[idx_2];
                if (Me === "o") {
                  let We = idx_2 < Ae.length - 1 ? Ae.slice(idx_2 + 1) : mapped[idx + 1];
                  if (
                    We !== undefined &&
                    We !== "" &&
                    !SET_O_SAFE_OPTS.has(We.toLowerCase().replace(/[_-]/g, ""))
                  )
                    return true;
                  break;
                }
                if (Me === "A") break;
                if (!SET_O_SAFE_LETTERS.has(Me)) return true;
              }
            }
            return false;
          })()))
    )
      return null;
  }
  if (h)
    return {
      behavior: "ask",
      message: createPermissionRequestMessage(BashTool.name),
      decisionReason: {
        type: "rule",
        rule: h,
      },
    };
  return {
    behavior: "allow",
    updatedInput: e,
    decisionReason: {
      type: "other",
      reason: SANDBOX_AUTO_ALLOW_REASON,
    },
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
]);
var WRAPPER_COMMAND_NAMES = new Set([
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
//@ chunk-e6aww6q8.js:1188958-1189178 layout
/**
 * 剥离 argv 开头的 VAR=value；遇到危险变量或值含元字符返回 null。
 */
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
    let L = astCommands?.[i];
    if (
      ((cmd === `cd ${cwd}` && isPlainPathToken(cwd)) ||
        (cmd === `cd ${cwdMingw}` && isPlainPathToken(cwdMingw))) &&
      L !== undefined &&
      L.argv.length === 2 &&
      L.argv[0] === "cd" &&
      L.envVars.length === 0 &&
      L.redirects.length === 0 &&
      !/[*?[\]]/.test(L.argv[1]) &&
      !containsAnyPlaceholder(L.argv[1])
    )
      continue;
    subcommands.push(cmd);
    astCommandsByIdx.push(L);
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
function isPlainPathToken(e) {
  return !/[\s\\$`'"*?[\]{}<>|&;()]/.test(e);
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
function createEnvUnsetOracle(e, n) {
  if (!isDangerousRmEnabled()) return;
  return {
    mayBeUnset: (r) => {
      if (e) return true;
      if (r === "TMPDIR" && SandboxManager.isSandboxingEnabled()) return false;
      let s = process.env[r];
      if (typeof s === "string") return s === "";
      return (
        /^(?:TMPDIR|TMP|TEMP)$/.test(r) ||
        spawnEnvKeysForSession(sessionEnvVarNameSet(n))?.has(r) !== true ||
        wasShellExportReported(r)
      );
    },
  };
}
//@ chunk-e6aww6q8.js:1198003-1198326 sole-consumer
/**
 * 检测命令中可能展开为空的变量导致 rm 等危险删除（如 rm -rf $DIR/），命中时记录遥测并返回危险项。
 */
function findDangerousVariableRemoval(command, n, wholeCommand, s, h, assignments) {
  let envUnsetOracle = createEnvUnsetOracle(s, h);
  if (envUnsetOracle === undefined) return n ? null : findDangerousVariableRemovalInText(command);
  let dangerousVariableRemovalInText = findDangerousVariableRemovalInText(command, {
    ...envUnsetOracle,
    wholeCommand,
    skipAssignedOriginalHits: n,
    assignments,
  });
  if (dangerousVariableRemovalInText === null) return null;
  if (dangerousVariableRemovalInText.rootChild !== undefined) logDangerousRmShape("var_root_child");
  else if (dangerousVariableRemovalInText.derived !== undefined) logDangerousRmShape("derived_var");
  else if (n || findDangerousVariableRemovalInText(command) === null) logDangerousRmShape("eval_trap_string");
  return dangerousVariableRemovalInText;
}
//@ chunk-e6aww6q8.js:1198326-1199186 sole-consumer = checkSemanticsDeny (0.783)
/**
 * AST 过于复杂（too-complex）时的拒绝路径：整命令/各片段的 deny 规则、读封锁、空变量删除、AST 上的危险删除检查；只有精确 allow 规则覆盖整条命令时才返回 allow。
 */
async function checkTooComplexCommandDeny(
  e,
  permissionContext,
  node,
  s,
  originalCommand,
  y,
  S,
  toolUseContext,
) {
  let fullCmd = checkEarlyExitDeny(e, permissionContext);
  if (fullCmd?.behavior === "deny") return fullCmd;
  if (getContentRulesMapForTool(permissionContext, BashTool, "deny").size > 0) {
    let Se = new Set([
      ...splitCommand(e.command),
      ...(node && node !== PARSE_ABORTED ? nestedCommandSpansFromAst(node) : []),
    ]);
    for (let cmd of Se) {
      let subDeny = matchingRulesForInput(
        {
          ...e,
          command: cmd,
        },
        permissionContext,
        "prefix",
      ).matchingDenyRules[0];
      if (subDeny !== undefined)
        return {
          behavior: "deny",
          message: `Permission to use ${BashTool.name} with command ${e.command} has been denied.`,
          decisionReason: {
            type: "rule",
            rule: subDeny,
          },
        };
    }
  }
  let G = s?.();
  if (G) return G;
  let dangerousVariableRemoval = findDangerousVariableRemoval(
    e.command,
    false,
    originalCommand,
    y,
    toolUseContext,
  );
  if (dangerousVariableRemoval !== null) {
    logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
      kind: fromEnum("emptyVariable"),
    });
    return checkDangerousRemoval(dangerousVariableRemoval, false);
  }
  if (node && node !== PARSE_ABORTED) {
    let Se = await checkDangerousRemovals(
      node,
      getCwd(),
      permissionContext,
      originalCommand,
      y,
      S,
      toolUseContext,
    );
    if (Se !== null) {
      logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
        kind: fromEnum(Se.kind),
      });
      return Se.result;
    }
  }
  if (fullCmd === null || fullCmd.behavior !== "allow") return fullCmd;
  return (fullCmd.decisionReason?.type === "rule"
    ? fullCmd.decisionReason.rule.ruleValue.ruleContent
    : undefined) === e.command.trim()
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
function preferEarlierAsk(softAsk, n) {
  return softAsk !== undefined &&
    findSafetyCheckReason(n.result.decisionReason, (r) => r.circuitBreaker === "dangerousRemoval") ===
      undefined
    ? softAsk
    : n;
}
//@ chunk-e6aww6q8.js:1199410-1203520 sole-consumer
/**
 * 检查命令（含命令替换、嵌套命令）中的危险 rm/rmdir：空变量展开、字面目标、替换输出为空时的目标、整段替换作为递归删除目标、内联 shell 脚本；返回 {result, kind} 或 null。
 */
async function checkDangerousRemovals(node, cwd, context, commandText, h, y, S) {
  let substitutions = [];
  let L = (Me) => {
    let text = Me.text;
    let ze = funsubBodyFromNode(Me);
    if (Me.type === "command_substitution" || Me.type === "process_substitution" || ze !== null) {
      let Je =
        text.startsWith("$(") || text.startsWith("<(") || text.startsWith(">(")
          ? 2
          : text.startsWith("`")
            ? 1
            : 0;
      let nt = text.endsWith(")") || text.endsWith("`") ? text.length - 1 : text.length;
      substitutions.push(ze ?? text.slice(Je, nt).trim());
    }
    for (let child of Me.children) if (child) L(child);
  };
  L(node);
  let envUnsetOracle = createEnvUnsetOracle(h, S);
  let assignments =
    envUnsetOracle === undefined
      ? undefined
      : describeCommandSubstitution(commandText ?? node.text, envUnsetOracle.mayBeUnset);
  let Z = node.keywordAfterPrefix === true;
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
  let Se = Z
    ? nestedCommandSpansOrOverrun(node, {
        unparsedBodyOverruns: true,
      })
    : [];
  if (Se === null)
    return {
      result: dangerousRemovalAsk(
        "rm",
        "This command could not be fully checked for dangerous rm operations: not all of its nested commands or function substitutions could be analyzed. This requires explicit approval.",
        "not ruled out \u2014 some nested commands or function substitutions could not be analyzed",
      ),
      kind: "nestedSpansOverrun",
    };
  let ke = Se ?? [];
  let any = ke.some((Me) => isNormalizedCdCommand(Me.trim()));
  let Ee =
    commandHasAnyCd(node.text) || substitutions.some((substitution) => commandHasAnyCd(substitution)) || any;
  let Ae = Ee
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
          .filter((Me) => isNormalizedCdCommand(Me))
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
      let dangerousVariableRemoval = findDangerousVariableRemoval(
        trimmed,
        false,
        commandText ?? node.text,
        h,
        S,
        assignments,
      );
      if (dangerousVariableRemoval !== null)
        return preferEarlierAsk(softAsk, {
          result: checkDangerousRemoval(dangerousVariableRemoval, true),
          kind: "emptyVariable",
        });
      let replaced = trimmed.replace(/`[^`]*`/g, "__CMDSUB__");
      for (let yt = "", gt = 0; yt !== replaced && gt < 16; gt++) {
        yt = replaced;
        replaced = replaced.replace(/\$\([^()]*\)/g, "__CMDSUB__");
      }
      for (let yt = "", gt = 0; yt !== replaced && gt < 16; gt++) {
        yt = replaced;
        replaced = replaced.replace(
          /\$\{(?:[A-Za-z_][A-Za-z0-9_]*|[0-9]+|[@*#?!$-]):?[-=+?]"?((?:__CMDSUB__[/*.]*)+)"?\}/g,
          "$1",
        );
      }
      let pt = replaced !== trimmed;
      let Et = await parseForSecurity(replaced, {
        readsDivergentShapes: true,
      });
      if (Et.kind === "simple")
        for (let command of Et.commands) {
          let sliced = command.argv.slice();
          if (sliced[0] !== undefined) sliced[0] = sliced[0].replace(/^.*[\\/]/, "");
          let At = unwrapCommandArgv(stripWrappersFromArgvForPaths(sliced));
          let It = normalizeCommandName(At[0]);
          if (It !== "rm" && It !== "rmdir") continue;
          let sliced_2 = At.slice(1);
          let qt = checkDangerousRemovalPaths(It, sliced_2, cwd, context, Ee);
          let Zt = isMountedDriveAsk(qt) ? qt : undefined;
          let kind = "literalTarget";
          if (qt.behavior === "ask" && Zt === undefined)
            return preferEarlierAsk(softAsk, {
              result: qt,
              kind: "literalTarget",
            });
          if (pt && sliced_2.some((no) => /.(?:__CMDSUB__(?:(?!\.\.)[/*.])*)+(?:\/\.\.)*\/*$/.test(no))) {
            let index = sliced_2.indexOf("--");
            let hn = index === -1 ? sliced_2.length : index;
            let ho = sliced_2;
            for (let yn of [true, false]) {
              let mapped = sliced_2.map((To, bo) =>
                yn && bo < hn && To.startsWith("-") && !To.includes("/")
                  ? To
                  : To.replace(/(.)(?:__CMDSUB__(?:(?!\.\.)[/*.])*)+((?:\/\.\.)*)\/*$/, "$1$2"),
              );
              let all = mapped.every((To, bo) => To === ho[bo]);
              ho = mapped;
              if (all) continue;
              let fo = checkDangerousRemovalPaths(It, mapped, cwd, context, Ee);
              if (fo.behavior === "ask" && !isMountedDriveAsk(fo))
                return preferEarlierAsk(softAsk, {
                  result: fo,
                  kind: "emptyExpansion",
                });
              if (fo.behavior === "ask" && Zt === undefined) {
                Zt = fo;
                kind = "emptyExpansion";
              }
            }
          }
          let pn = sliced_2.includes("--") ? sliced_2.slice(0, sliced_2.indexOf("--")) : sliced_2;
          if (
            pt &&
            It === "rm" &&
            pn.some((no) => /^--r/.test(no) || /^-[a-zA-Z]*[rR]/.test(no)) &&
            sliced_2.some((no) => /^(?:__CMDSUB__[/*.]*)+$/.test(no))
          ) {
            let no = getFeatureValueWithSource_CACHED_MAY_BE_STALE("tengu_iridescent_boot", true);
            if (
              !env.CLAUDE_CODE_DISABLE_SUBSTITUTION_RM_PROMPT &&
              !(no.value === false && no.source === "payload")
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
          if (Zt !== undefined)
            softAsk ??= {
              result: Zt,
              kind,
            };
        }
    }
  }
  for (let Me of [node.text, ...substitutions]) {
    let We = await checkInlineShellRemoval(Me, y, Me === node.text ? [] : Ae);
    if (We !== null)
      return preferEarlierAsk(softAsk, {
        result: We,
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
function hasErrorOrBackgroundNode(e) {
  for (let child of e.children) {
    if (!child) continue;
    if (child.type === "ERROR") return true;
    if (child.type === "&") {
      if (e.type !== "binary_expression") return true;
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
function getStructuralMissKind(e) {
  let decisionReason = e.behavior === "ask" ? e.decisionReason : undefined;
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
function applyReadBlockToStructuralAsk(e, n, toolPermissionContext) {
  if (e.behavior !== "ask") return e;
  let decisionReason = e.decisionReason;
  if (
    decisionReason?.type !== "other" ||
    decisionReason.bashMissKind === undefined ||
    !STRUCTURAL_MISS_KINDS[decisionReason.bashMissKind]
  )
    return e;
  if (
    toolPermissionContext.blockReadsOutsideWorkingDirectories === true &&
    !(shouldUseSandbox(n) && isSandboxReadBlockEnforceable(toolPermissionContext))
  )
    return outsideReadsTooComplexAsk(decisionReason.reason);
  return e;
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
  let s = new Set([
    bashInput.command,
    ...splitCommand(bashInput.command),
    ...(askResult.decisionReason?.type === "subcommandResults"
      ? askResult.decisionReason.reasons.keys()
      : []),
    ...nestedCommandSpans(bashInput.command),
  ]);
  let h;
  for (let cmd of s) {
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
    h ??= matchingAskRules[0];
  }
  return h === undefined
    ? askResult
    : {
        ...askResult,
        matchedAskRule: h,
      };
}
//@ chunk-e6aww6q8.js:1224531-1224768 layout
/**
 * Bash 权限检查的两遍执行：先正常跑 checkBashPermissionWithSandbox，若触发了二次检查条件，再在 R0e 上下文里重跑，第二遍为 deny 时以它为准，异常时保留第一遍结果。BashTool 与 Monitor 工具调用。
 */
async function bashToolHasPermissionTwoPass(e, shellPermission, r, s) {
  let h = () => checkBashPermissionWithSandbox(e, shellPermission, r, s);
  let { result: y, fired } = await runGuarded(false, h);
  if (!fired || y.behavior === "deny") return y;
  try {
    let { result: w } = await runGuarded(true, () => runWithoutTelemetry(h));
    return w.behavior === "deny" ? w : y;
  } catch (error) {
    if (isAbortError(error)) throw error;
    logError(error);
    return y;
  }
}
//@ chunk-e6aww6q8.js:1224768-1225707 layout
/**
 * 合并 Bash 权限的几路结论：常规规则检查、读法检查、沙箱覆盖检查；dangerouslyDisableSandbox 且原本可沙箱运行时按严格模式改成 too-complex ask；ask 结论标记 standsInUnderHookAsk 供 hook 处理。
 */
async function checkBashPermissionWithSandbox(e, n, r, s) {
  let h = () => runCommandSafetyCheck(e, n, r, s);
  let [y, reason] = await runWithReadingRefusals(h);
  let context = y;
  if (reason !== undefined && y.behavior !== "deny") {
    let L = await runWithoutTelemetry(() => runAsBashReads(h));
    context = combineWithTooComplex(context, L, reason);
    let context_2 = await runWithoutTelemetry(() => runWithRuleOff(h));
    context = combineWithTooComplex(context, context_2, reason);
    if (
      e.dangerouslyDisableSandbox &&
      !shouldUseSandbox(e) &&
      shouldUseSandbox({
        ...e,
        dangerouslyDisableSandbox: false,
      })
    ) {
      if (isPassthroughOrPlainAsk(context_2) && context.behavior !== "deny" && sandboxOverrideAskGuardsOn())
        context = buildTooComplexAsk(reason);
    } else if (isPassthroughOrPlainAsk(context))
      context =
        askClassifierForAllowedDomains(BashTool, e, n, {
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
    let L = askClassifierForAllowedDomains(BashTool, e, n, {
      behavior: "passthrough",
      message: "",
    });
    if (L !== undefined) {
      let G = (await parseCommandRaw(e.command)) ?? PARSE_ABORTED;
      let q = parseForSecurityFromAst(e.command, G);
      if (q.kind === "too-complex" && q.keepsRemovalVerdict) context = L;
    }
  }
  if (isDangerousRmEnabled()) {
    let safetyCheckReason = findSafetyCheckReason(
      context.decisionReason,
      (q) => q.circuitBreaker === "dangerousRemoval",
    );
    let G = safetyCheckReason === undefined ? undefined : classifyRemovalReason(safetyCheckReason.reason);
    if (G !== undefined) logDangerousRmShape(G);
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
function combineWithTooComplex(e, n, reason) {
  if (e.behavior === "deny") return e;
  if (n.behavior === "deny") return n;
  if (n.behavior === "ask" && !isPlainAsk(n))
    return {
      ...n,
      suggestions: [],
    };
  if (e.behavior === "allow" && n.behavior !== "allow") return buildTooComplexAsk(reason);
  return e;
}
//@ chunk-e6aww6q8.js:1225995-1226145 layout
/**
 * 生成 bashMissKind="too-complex" 的 ask 权限结论（无建议规则）。
 */
function buildTooComplexAsk(reason) {
  let n = {
    type: "other",
    reason,
    bashMissKind: "too-complex",
  };
  return {
    behavior: "ask",
    decisionReason: n,
    message: createPermissionRequestMessage(BashTool.name, n),
    suggestions: [],
  };
}
//@ chunk-e6aww6q8.js:1226145-1226675 fingerprint = checkCommandAndSuggestRules (0.671)
/**
 * 两遍运行注入/安全检查（正常模式和 refused 模式），取更严格的结果；refused 才有的 ask 在可安全降级时转为 passthrough。
 */
async function runCommandSafetyCheck(e, n, r, s) {
  let { result: h, refused } = await runWithRefusedReading(false, () => bashCommandIsSafeAsync(e, n, r, s));
  if (!refused || h.behavior === "deny") return h;
  let { result: S } = await runWithRefusedReading(true, () =>
    runWithoutTelemetry(() => bashCommandIsSafeAsync(e, n, r, s)),
  );
  if (S.behavior === "deny" || (S.behavior === "ask" && !isPlainAsk(S))) return S;
  if (h.behavior === "ask" && S.behavior !== "ask")
    return isPlainAsk(h)
      ? {
          behavior: "passthrough",
          message: h.message,
          ...(h.decisionReason !== undefined && {
            decisionReason: h.decisionReason,
          }),
          ...(h.suggestions !== undefined && {
            suggestions: h.suggestions,
          }),
          ...(h.blockedPath !== undefined && {
            blockedPath: h.blockedPath,
          }),
        }
      : h;
  return getDecisionSeverity(S) > getDecisionSeverity(h) ? S : h;
}
//@ chunk-e6aww6q8.js:1227686-1227822 placement
/**
 * 判断当前是否为绕过权限模式（或计划模式下可绕过且非远程执行）。
 */
function isBypassModeForBash(e) {
  let { mode, isBypassPermissionsModeAvailable } = getToolPermissionContext(e);
  return (
    mode === "bypassPermissions" ||
    (isPlanBypass(mode, isBypassPermissionsModeAvailable) && e.forRemoteExecution !== true)
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
async function checkBashWithDeclarations(input, context, r, s) {
  let h = {};
  let y = await checkBashCommandClamp(
    input,
    context,
    r,
    undefined,
    undefined,
    undefined,
    (names, operands, fromUncertainWrite) => {
      h.names = names;
      h.operands = operands;
      h.fromUncertainWrite = fromUncertainWrite;
    },
  );
  let result = s?.(y) ?? y;
  let prefixes = [undefined];
  if (h.names !== undefined) {
    let { readings, exhaustive } = declarationPrefixReadings(h.names, h.operands);
    prefixes.push(...readings);
    let q = [];
    for (let reading of readings) {
      let ke = await runWithoutTelemetry(() =>
        checkBashCommandClamp(input, context, r, undefined, undefined, reading),
      );
      q.push(s?.(ke) ?? ke);
    }
    let Z = applyReadBlockToStructuralAsk(
      combineDeclarationReadings(result, q, exhaustive, h.fromUncertainWrite === true),
      input,
      getToolPermissionContext(context),
    );
    if (Z === result || Z.behavior !== "ask" || !isPlainAsk(Z)) result = Z;
    else if (result.behavior !== "passthrough")
      result = {
        behavior: "passthrough",
        message: Z.message,
        ...(Z.decisionReason !== undefined && {
          decisionReason: Z.decisionReason,
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
    let L = (await parseCommandRaw(input.command)) ?? PARSE_ABORTED;
    let mapped = prefixes.map((declarationPrefix) =>
      parseForSecurityFromAst(input.command, L, {
        declarationPrefix,
      }),
    );
    let any = mapped.some((Z) => Z.kind === "simple" && Z.usesAssignedValue === true);
    if (result.behavior !== "allow") {
      if (any)
        result = {
          ...result,
          suggestions: [],
        };
    } else if (any || mapped.some((Z) => Z.kind !== "simple")) {
      let Z = {
        type: "other",
        reason: "A variable set in this command can't be checked before it runs",
        bashMissKind: "assigned-variable",
      };
      let Se = {
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
//@ chunk-e6aww6q8.js:1229250-1231407 placement
/**
 * 当代理的 Bash 使用被限定为固定命令集时，拒绝超出范围的命令。
 */
async function checkBashCommandClamp(
  bashInput,
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
    let spanNotCoveredByRuleGroups = await findSpanNotCoveredByRuleGroups(bashInput, bashCommandClamps);
    if (spanNotCoveredByRuleGroups !== null) {
      logEventUnlessSuppressed("tengu_bash_command_clamp_denied", {
        groupCount: bashCommandClamps.length,
      });
      return {
        behavior: "deny",
        message:
          `Permission to use ${BashTool.name} with command ${bashInput.command.trim()} has been denied: this agent's Bash use is clamped to a fixed set of command forms (per-spawn bashCommandClamp), and ` +
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
  let G = {
    laterPassesDiffer: false,
  };
  let q = applyReadBlockToStructuralAsk(
    await runWithDivergentShapes(divergentShapes === "read", () =>
      bashToolHasPermission(
        bashInput,
        toolUseContext,
        getCommandSubcommandPrefix,
        originalCommand,
        recursionState,
        declarationPrefix,
        onDeclarationPrefixes,
        divergentShapes,
        () => {
          G.laterPassesDiffer = true;
        },
      ),
    ),
    bashInput,
    getToolPermissionContext(toolUseContext),
  );
  let askResult = q;
  if (
    G.laterPassesDiffer &&
    originalCommand === undefined &&
    (q.behavior === "allow" || q.behavior === "passthrough" || isPlainAsk(q))
  ) {
    let we = {
      type: "other",
      reason:
        "Only the first pass of a loop in this command could be checked, and its later passes may run something else",
      bashMissKind: "loop-later-pass",
    };
    let message = createPermissionRequestMessage(BashTool.name, we);
    let Ae = applyReadBlockToStructuralAsk(
      {
        behavior: "ask",
        message,
        decisionReason: we,
      },
      bashInput,
      getToolPermissionContext(toolUseContext),
    );
    let Ie = bashToolCheckExactMatchPermission(bashInput, getToolPermissionContext(toolUseContext));
    let Me =
      q.behavior === "allow" &&
      Ie.behavior === "allow" &&
      Ie.decisionReason?.type === "rule" &&
      Ie.decisionReason.rule.ruleValue.ruleContent === bashInput.command.trim();
    if (!isPlainAsk(Ae) && (Me || !scriptAsksToRunUnsandboxed(BashTool, bashInput))) askResult = Ae;
    else if (q.behavior === "allow" && !Me)
      askResult = {
        behavior: "passthrough",
        message,
        decisionReason: we,
      };
  }
  if (
    G.laterPassesDiffer &&
    originalCommand === undefined &&
    (askResult.behavior === "ask" || askResult.behavior === "passthrough")
  )
    askResult = {
      ...askResult,
      suggestions: [],
    };
  if (q.behavior !== "allow" || askResult.behavior === "ask")
    return applyAskDenyRulesToAskResult(askResult, bashInput, getToolPermissionContext(toolUseContext));
  if (
    !bashInput.command.includes("&") ||
    (q.decisionReason?.type === "other" && q.decisionReason.reason === SANDBOX_AUTO_ALLOW_REASON)
  )
    return askResult;
  let commandRaw = await parseCommandRaw(bashInput.command);
  if (commandRaw && commandRaw !== PARSE_ABORTED && !hasErrorOrBackgroundNode(commandRaw)) return askResult;
  let ke = {
    type: "safetyCheck",
    reason:
      "This command uses the `&` background operator, which defers execution past approval-time safety checks. Approve only if you trust it.",
    classifierApprovable: false,
    circuitBreaker: "backgroundOperator",
  };
  return applyAskDenyRulesToAskResult(
    {
      behavior: "ask",
      decisionReason: ke,
      message: createPermissionRequestMessage(BashTool.name, ke),
    },
    bashInput,
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
  let q = {
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
    let yo = await checkBashCommandClamp(
      input,
      toolUseContext,
      getCommandSubcommandPrefix,
      originalCommand,
      recursionState,
      declarationPrefix,
      onDeclarationPrefixes,
      "read",
    );
    let Ho = await runWithoutTelemetry(() =>
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
    let br =
      (getDecisionSeverity(yo) === 4 && isBypassModeForBash(toolUseContext) ? 3 : getDecisionSeverity(yo)) -
      getDecisionSeverity(Ho);
    let Hr = astAnalysis.kind === "too-complex" && astAnalysis.keepsRemovalVerdict === true;
    if (Hr && yo.behavior === "ask" && Ho.behavior === "ask" && isOutsideReadsBlockedAsk(Ho.decisionReason)) {
      let safetyCheckReason = findSafetyCheckReason(
        yo.decisionReason,
        (Cr) => Cr.circuitBreaker === "dangerousRemoval",
      );
      if (safetyCheckReason !== undefined)
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
                    reason: `${safetyCheckReason.reason}; ${Ho.decisionReason.reason}`,
                  },
                },
              ],
              [input.command, yo],
            ]),
          },
          suggestions: [],
        };
    }
    let Fr = br > 0 || (br === 0 && getSafetyCheckRank(yo) > getSafetyCheckRank(Ho)) ? yo : Ho;
    let cs = {
      ...Fr,
      matchedAskRule: undefined,
    };
    return Hr && recursionState !== undefined && buildPendingClassifierCheck(cs, toolUseContext) ? cs : Fr;
  }
  let we =
    toolUseContext.forRemoteExecution !== true &&
    astAnalysis.kind === "too-complex" &&
    ((astAnalysis.nodeType === "heredoc_redirect" && astAnalysis.differential === true) ||
      (astAnalysis.nodeType === "pipeline" && astAnalysis.afterHeredocDelimiter === true)) &&
    SandboxManager.isSandboxingEnabled() &&
    SandboxManager.isAutoAllowBashIfSandboxedEnabled() &&
    shouldUseSandbox(input) &&
    getFeatureValue_CACHED_MAY_BE_STALE("tengu_amber_larch", true);
  if (onDeclarationPrefixes !== undefined) {
    let yo =
      astAnalysis.declarationPrefixes === undefined && parsedRoot && we
        ? parseForSecurityFromAst(input.command, parsedRoot, {
            plainUnquotedHeredocs: true,
          })
        : undefined;
    let Ho = astAnalysis.declarationPrefixes === undefined ? yo : astAnalysis;
    if (Ho?.declarationPrefixes !== undefined)
      onDeclarationPrefixes(
        Ho.declarationPrefixes,
        Ho.declarationPrefixBashKeeps,
        astAnalysis.uncertainWrite === true,
      );
  }
  if (astAnalysis.kind === "too-complex") {
    let yo = await checkTooComplexCommandDeny(
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
      q,
      toolUseContext,
    );
    if (yo !== null) return yo;
    let Ho =
      toolUseContext.forRemoteExecution === true
        ? null
        : checkSandboxAutoAllow(input, permissionContext, astAnalysis.nodeType);
    if (Ho !== null) return Ho;
    if (parsedRoot && we) {
      let br = parseForSecurityFromAst(input.command, parsedRoot, {
        plainUnquotedHeredocs: true,
        declarationPrefix,
      });
      if (br.kind === "simple" && br.laterLoopPassesDiffer) onLaterLoopPassesDiffer?.();
      let Hr =
        br.kind === "simple" &&
        checkSemantics(br.commands, {
          sourceGlobRecord: isSourceGlobRecordingEnabled(),
          hasLoop: br.hasLoop,
        }).ok
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
    let rr = {
      type: "other",
      reason: astAnalysis.reason,
      bashMissKind: "too-complex",
    };
    return {
      behavior: "ask",
      decisionReason: rr,
      message: createPermissionRequestMessage(BashTool.name, rr),
      suggestions: [],
    };
  }
  let commands = astAnalysis.commands;
  let Ae = (permissionContext) =>
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
      (command, Ho) =>
        readsCodeFromStdin(command.argv) &&
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
    if (semanticsResult.kind === "newline-hash" && toolUseContext.forRemoteExecution !== true) {
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
    let rr = await checkInlineShellRemoval(input.command, q, [], commands);
    if (rr !== null) return rr;
    if (earlyExit !== null) return earlyExit;
    let br = {
      type: "other",
      reason: semanticsResult.reason,
      bashMissKind: "semantics",
    };
    return {
      behavior: "ask",
      decisionReason: br,
      message: createPermissionRequestMessage(BashTool.name, br),
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
  let lt = () =>
    permissionContext.blockReadsOutsideWorkingDirectories === true &&
    !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
      ? outsideReadsTooComplexAsk(GIT_AFTER_CD_READ_BLOCK_REASON)
      : undefined;
  let operatorResult = await checkCommandOperatorPermissions(
    input,
    (yo) =>
      checkBashCommandClamp(
        yo,
        toolUseContext,
        getCommandSubcommandPrefix,
        originalCommand ?? input.command,
        q,
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
        permissionContext.blockReadsOutsideWorkingDirectories === true &&
        !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
      )
        return outsideReadsTooComplexAsk("a subshell cannot be checked against the read block");
      if (parsedRoot && parsedRoot !== PARSE_ABORTED) {
        let rr = await checkDangerousRemovals(
          parsedRoot,
          getCwd(),
          permissionContext,
          originalCommand,
          toolUseContext.forRemoteExecution === true,
          q,
          toolUseContext,
        );
        if (rr !== null) {
          logEventUnlessSuppressed("tengu_bash_dangerous_rm_too_complex", {
            kind: fromEnum(rr.kind),
          });
          return rr.result;
        }
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
  let cwd = getCwd();
  let cwdMingw = getPlatform() === "windows" ? windowsPathToPosixPath(cwd) : cwd;
  let { subcommands, astCommandsByIdx } = filterCdCwdSubcommands(rawSubcommands, commands, cwd, cwdMingw);
  let cdCommands = subcommands.filter((subCommand) => isNormalizedCdCommand(subCommand));
  if (cdCommands.length > 1) {
    let yo = checkCdCommand(commands, cwd, permissionContext);
    if (yo) return yo;
    if (
      permissionContext.blockReadsOutsideWorkingDirectories === true &&
      !(shouldUseSandbox(input) && isSandboxReadBlockEnforceable(permissionContext))
    )
      return outsideReadsTooComplexAsk("multiple directory changes cannot be checked against the read block");
    let mapped = uniq(
      [cwd, ...allWorkingDirectories(getToolPermissionContext(toolUseContext))]
        .flatMap((jr) => {
          let { resolvedPath } = safeResolvePath(getFsImplementation(), jr);
          return resolvedPath === jr ? [jr] : [jr, resolvedPath];
        })
        .map((jr) => normalize(jr)),
    ).map((jr) => ({
      exact: normalizeCaseForComparison(jr),
      prefix: normalizeCaseForComparison(/[\\/]$/.test(jr) ? jr : jr + sep),
    }));
    let br = (jr) => {
      let Or = normalizeCaseForComparison(normalize(jr));
      return mapped.some((Io) => Or === Io.exact || Or.startsWith(Io.prefix));
    };
    let Fr = !/[;|\n&(`!]/.test(input.command.replace(/&&/g, ""));
    let { resolvedPath } = safeResolvePath(getFsImplementation(), cwd);
    let _r = uniq([normalize(cwd), normalize(resolvedPath)]);
    let Cr = [];
    let Vr = await checkInlineShellRemoval(input.command, q, [], commands);
    if (Vr !== null) return Vr;
    for (let command of commands) {
      let [Or, ...Io] = stripWrappersFromArgvForPaths(command.argv);
      let replaced = Or?.replace(/^.*[\\/]/, "");
      if (replaced === "cd" || replaced === "chdir" || replaced === "pushd" || replaced === "popd") {
        Fr &&= command.argv[0] === replaced && command.envVars.length === 0;
        if (replaced === "popd") {
          if (Io.length === 0 && Cr.length > 0) _r = Cr.pop();
          else Fr = false;
        } else {
          let Es = Io[0] === "--" ? Io.slice(1) : Io;
          let Nr = Es.length === 1 ? Es[0] : undefined;
          let Is = false;
          let fs = [];
          if (
            Nr !== undefined &&
            !/^[-+]/.test(Nr) &&
            !Nr.startsWith("~") &&
            !/[*?[]/.test(Nr) &&
            !containsAnyPlaceholder(Nr) &&
            !/(^|[\\/])\.\.([\\/]|$)/.test(Nr)
          ) {
            Is = true;
            for (let as of _r) {
              let Vi = isAbsolute(Nr) ? normalize(Nr) : resolve_2(as, Nr);
              let { resolvedPath } = safeResolvePath(getFsImplementation(), Vi);
              if (!br(Vi) || !br(resolvedPath)) {
                Is = false;
                break;
              }
              fs.push(normalize(Vi), normalize(resolvedPath));
            }
          }
          Fr &&= Is;
          if (Is) {
            if (replaced === "pushd") Cr.push(_r);
            _r = uniq(fs);
          }
        }
        continue;
      }
      if (replaced !== "rm" && replaced !== "rmdir") continue;
      let rs = checkDangerousRemovalPaths(replaced, Io, cwd, getToolPermissionContext(toolUseContext), !Fr);
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
  let At = cdCommands.length > 0;
  let effectiveCwd = cwd;
  let compoundCommandHasCd = At;
  let qt = false;
  if (
    toolUseContext.forRemoteExecution !== true &&
    At &&
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
      qt = true;
    }
  }
  if (compoundCommandHasCd || (At && divergentShapes === "read")) {
    let yo = checkCdCommand(commands, cwd, permissionContext);
    if (yo) return yo;
  }
  let cdGitAskResult;
  if (At) {
    if (
      subcommands.some((subcommand) => isNormalizedGitCommand(subcommand.trim())) &&
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
  let subcommandPermissionDecisions = subcommands.map((command, i) =>
    bashToolCheckPermission(
      {
        command,
      },
      permissionContext,
      compoundCommandHasCd,
      astCommandsByIdx[i],
      qt && i === 0 ? cwd : effectiveCwd,
      astAnalysis.bareAssignmentNames,
      Ae(permissionContext),
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
              subcommandPermissionDecisions.map((subcommandPermissionDecision, Ho) => [
                subcommands[Ho],
                subcommandPermissionDecision,
              ]),
            ),
      },
    };
  let filtered = astCommandsByIdx.slice(qt ? 1 : 0).filter((yo) => yo !== undefined);
  let pathConstraintResult = checkPathConstraints(
    input,
    effectiveCwd,
    permissionContext,
    compoundCommandHasCd,
    flattened,
    filtered,
    Ae(permissionContext),
  );
  if (pathConstraintResult.behavior === "deny") return pathConstraintResult;
  let safetyCheckResult = await checkInlineShellRemoval(input.command, q, [], commands);
  let Kn =
    pathConstraintResult.behavior === "ask" &&
    pathConstraintResult.decisionReason?.type === "safetyCheck" &&
    pathConstraintResult.decisionReason.classifierApprovable === false
      ? pathConstraintResult
      : (safetyCheckResult ?? pathConstraintResult);
  if (
    Kn.behavior === "ask" &&
    Kn.decisionReason?.type === "safetyCheck" &&
    Kn.decisionReason.classifierApprovable === false
  ) {
    if (
      !isBypassImmuneCircuitBreaker(Kn.decisionReason) ||
      isClassifierRoutedCircuitBreaker(Kn.decisionReason)
    ) {
      let yo =
        findCircuitBreakerAsk(subcommandPermissionDecisions, true) ??
        (cdGitAskResult !== undefined || gitStructureAskResult !== undefined ? lt() : undefined) ??
        findCircuitBreakerAsk(subcommandPermissionDecisions) ??
        safetyCheckResult ??
        undefined;
      if (yo) return yo;
    }
    return Kn;
  }
  if (cdGitAskResult !== undefined || gitStructureAskResult !== undefined) {
    let yo =
      findCircuitBreakerAsk(subcommandPermissionDecisions, true) ??
      lt() ??
      findCircuitBreakerAsk(subcommandPermissionDecisions);
    if (yo) return yo;
  }
  if (cdGitAskResult !== undefined) return cdGitAskResult;
  if (gitStructureAskResult !== undefined) return gitStructureAskResult;
  let mapped = subcommands
    .map((result, Ho) => [result, Ho])
    .filter(([yo]) => isSedCommand(yo))
    .map(([, yo]) => yo);
  if (mapped.length > 0) {
    let all = mapped.every((br) => {
      let Hr = subcommandPermissionDecisions[br];
      return Hr?.behavior === "allow" && Hr.decisionReason?.type === "rule";
    });
    let any = subcommandPermissionDecisions.some(
      (subcommandPermissionDecision) => subcommandPermissionDecision.behavior !== "allow",
    );
    let rr = pathConstraintResult.behavior === "ask" && !pathConstraintResult.bashAllowRuleOverridable;
    if (!all && !any && !rr && exactMatchResult.behavior !== "allow") {
      let br = new Set(
        mapped
          .filter((Fr) => {
            let cs = subcommandPermissionDecisions[Fr];
            return cs?.behavior === "allow" && cs.decisionReason?.type === "rule";
          })
          .map((Fr) => subcommands[Fr].trim()),
      );
      let Hr = checkSedCommand(input, permissionContext, br);
      if (Hr.behavior === "ask") {
        if (permissionContext.blockReadsOutsideWorkingDirectories === true) return outsideReadsSedScriptAsk();
        return Hr;
      }
    }
  }
  let askSubresult = subcommandPermissionDecisions.find(
    (subcommandPermissionDecision) => subcommandPermissionDecision.behavior === "ask",
  );
  let nonAllowCount = count(subcommandPermissionDecisions, (yo) => yo.behavior !== "allow");
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
          : new Map(subcommandPermissionDecisions.map((result, Ho) => [subcommands[Ho], result])),
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
    let Ho = subcommands[idx];
    subcommandResultList.push(
      await checkSubcommandPermissionWithSuggestions(
        {
          ...input,
          command: Ho,
        },
        permissionContext,
        commandSubcommandPrefix?.subcommandPrefixes.get(Ho),
        compoundCommandHasCd,
        astCommandsByIdx[idx],
        qt && idx === 0 ? cwd : effectiveCwd,
        astAnalysis.bareAssignmentNames,
        toolUseContext,
      ),
    );
  }
  let co = {
    deny: 3,
    ask: 2,
    passthrough: 1,
    allow: 0,
  };
  let subcommandResults = new Map();
  for (let idx = 0; idx < subcommands.length; idx++) {
    let Ho = subcommands[idx];
    let rr = subcommandResultList[idx];
    let br = subcommandResults.get(Ho);
    let Hr = co[rr.behavior];
    let Fr = br ? co[br.behavior] : -1;
    if (
      !br ||
      Hr > Fr ||
      (Hr === Fr &&
        findSafetyCheckReason(rr.decisionReason) !== undefined &&
        findSafetyCheckReason(br.decisionReason) === undefined)
    )
      subcommandResults.set(Ho, rr);
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
    let Ho = subcommands[idx];
    let rr = subcommandResultList[idx];
    if (rr.behavior === "ask" || rr.behavior === "passthrough") {
      let suggestions = "suggestions" in rr ? rr.suggestions : undefined;
      let rules = extractRules(suggestions);
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
function matchesArgvAfterUnwrap(e, n, r) {
  let s = stripSafeWrappers(e);
  let commandArgv = getCommandArgv(s);
  if (r(commandArgv)) return true;
  if (
    !readFlagWithOverride(TENGU_WILD_OCTOPUS, {
      safe: true,
    })
  )
    return false;
  let y = s === e ? commandArgv : getCommandArgv(e.replace(LEADING_TIME_PREFIX_RE, ""));
  return r(n(y));
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
      (n) => n[0] === "git" || (n[0] === "xargs" && n.includes("git")),
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
function isNormalizedCdCommand(e) {
  return matchesArgvAfterUnwrap(
    e,
    stripCommandBuiltinPrefixes,
    ([n]) => n === "cd" || n === "pushd" || n === "popd" || n === "chdir",
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
  let r = () => runWithGuardOff(() => parseForSecurity(command));
  let [s, h] = await runWithReadingRefusals(r);
  let y = h === undefined ? [s] : [await runWithRuleOff(r), await runAsBashReads(r)];
  let S = runWithGuardOff(() => commandHasAnyCd(command));
  let w = new Set();
  for (let L of y) {
    if (L.kind !== "simple") {
      logForDebugging(`literalRmTargets: ${command.length}-char command not read (${L.kind})`);
      continue;
    }
    for (let command of L.commands) {
      let [q, ...Z] = stripWrappersFromArgvForPaths(command.argv);
      if (normalizeCommandName(q) !== "rm") continue;
      for (let Se of PATH_EXTRACTORS.rm(Z).map(expandTildeWithHome))
        if (!S || isAbsolute(Se)) w.add(expandPath(Se, cwd));
    }
  }
  return [...w];
}
//@ chunk-e6aww6q8.js:1244182-1244222 placement
/**
 * 判断某个开头的环境赋值不安全（变量名非常规或值像路径）。
 */
function isUnsafeEnvAssignment(e, n) {
  return !isSafeEnvVarName(e) || isPathLikeEnvValue(n);
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
function stripSafeWrappersFromCommand(e) {
  return stripSafeWrappers(e, false, false);
}
//@ chunk-e6aww6q8.js:4855075-4855835 placement
function mergeBashSubcommandVerdicts(e, context, r, s) {
  if (
    !e.dangerouslyDisableSandbox ||
    r.behavior === "deny" ||
    (s === "eachVerdict" ? r.behavior === "ask" : r.behavior === "allow") ||
    isAllRuleReason(r.decisionReason) ||
    shouldUseSandbox(e) ||
    !shouldUseSandbox({
      ...e,
      dangerouslyDisableSandbox: false,
    }) ||
    (s === "chosenVerdict" &&
      (r.behavior === "ask" ? !shouldRetagAskAsSandboxOverride(r) : !sandboxOverrideAskGuardsOn()))
  )
    return r;
  let h = noopToolUseHook({
    toolName: BASH_TOOL_NAME,
    input: e,
    context,
  });
  if (h) return h;
  if (r.behavior === "allow" || (r.behavior === "passthrough" && s === "eachVerdict"))
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
        decisionReason: r.decisionReason,
        message: r.message,
        blockedPath: r.blockedPath,
      },
    },
    message: "Run outside of the sandbox",
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
  if (command.slice(stripped + 1).some((d) => /^[+-]\d+$/.test(d))) return;
  let sliced = command.slice(stripped + 1);
  let index = sliced.indexOf("--");
  let a = index === -1 ? sliced : sliced.slice(0, index);
  let o = index === -1 ? [] : sliced.slice(index + 1);
  let u = index !== -1 || a.some((d) => d !== "-" && d.startsWith("-"));
  let l = [...a.filter((d) => d === "-" || !d.startsWith("-")), ...o];
  if (l.length === 0) return u ? undefined : homedir();
  if (l.length > 1 || l[0] === "-") return;
  return l[0];
}
//@ chunk-dcmhvw5a.js:214446-214577 placement = buildSuggestions (1)
/**
 * 通用前缀权限建议：规则内容为 "<前缀> *"。
 */
function buildToolPrefixAllowSuggestion(toolName, n) {
  return [
    {
      type: "addRules",
      rules: [
        {
          toolName,
          ruleContent: `${n} *`,
        },
      ],
      behavior: "allow",
      destination: "localSettings",
    },
  ];
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
function isClassifierDecision(e) {
  let n = Reflect.get(e, ASSET_TARGET_PIN_TAG);
  return typeof n === "object" && n !== null && Reflect.get(n, "classifier") === true;
}
//@ chunk-v0yfsee9.js:75146-75763 fingerprint = bashToolCheckExactMatchPermission (1)
/**
 * PowerShell 的精确规则检查（命令先规范化），deny/ask/allow 规则命中即返回，否则 passthrough 并附精确命令建议。
 */
function powershellToolCheckExactMatchPermission_2(input, toolPermissionContext) {
  let command = trimPsWhitespace(input.command);
  let s = {
    ...input,
    command,
  };
  let { matchingDenyRules, matchingAskRules, matchingAllowRules } = matchingRulesForInput_2(
    s,
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
