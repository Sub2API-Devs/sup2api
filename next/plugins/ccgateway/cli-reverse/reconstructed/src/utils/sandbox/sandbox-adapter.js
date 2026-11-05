/**
 * utils/sandbox/sandbox-adapter.ts
 *
 * Claude Code 侧的沙箱适配层：把 settings（sandbox.*、Read/Edit/WebFetch 权限规则、托管策略）转成 @anthropic-ai/sandbox-runtime 配置，判定沙箱是否开启/必需/可用，初始化与热更新运行时，包装命令（wrapWithSandbox/wrapWithSandboxArgv），管理 excludedCommands、读禁止根复查与 Windows 原生 deny。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sandbox/sandbox-adapter.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-gg17c06d.js (1), chunk-mrcnh9sb.js (1), chunk-qg41pqt6.js (391)
 * attribution: fingerprint 12, callgraph-fingerprint 2, placement 308, layout 68, sole-consumer 1, file-local 2, callgraph-witnessed 1
 */
import { dirname, win32, resolve, isAbsolute, join, sep, basename, parse, relative } from "path";
import { homedir, hostname } from "os";
import {
  statSync,
  lstatSync,
  openSync,
  fstatSync,
  readSync,
  closeSync,
  readlinkSync,
  realpathSync,
  readFileSync,
  chmodSync,
  constants,
  rmSync,
  renameSync,
  unlinkSync,
  fchmodSync,
  mkdirSync,
  rmdirSync,
  readdirSync,
  accessSync,
  writeSync,
} from "fs";
import { isIP } from "net";
import { randomBytes } from "crypto";
import { READ_LIKE_TOOLS, isAmberPloverOn } from "../permissions/legacyWildcardRules.js";
import { normalizeDomainKey, domainRuleMatches } from "../wildcardMapLookup.js";
import {
  collectFromSandboxSettings,
  getSandboxSettingsSources,
  sandboxSettingsChain,
  policySandboxSetting,
  firstFromSandboxSettings,
  readPolicySandboxSetting,
  collectAllowRules,
  SHADOWED_SSH_DIR,
  mergeIgnoreViolations,
  readSandboxSetting,
  getPolicySettingsIfEnabled,
} from "./sandboxSettingsSources.js";
import { celModule, ensurePrivateDir, bridgeSpawnDir, HOST_FUNCTION_CATEGORIES } from "./celHostFunctions.js";
import {
  removeTrailingGlobSuffix,
  containsGlobChars,
  compileDenyGlob,
  canonicalGlobSource,
  directoryCoverRegex,
  expandWindowsEnvRefs,
  containsGlobCharsWin,
  stripExtendedPathPrefix,
  getDefaultWritePaths,
  isSymlinkOutsideBoundary,
  expandGlobPattern,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getPlatform } from "../platform.js";
import {
  classifyRuleParens,
  canonicalToolName,
  isWindowsAbsoluteRule,
  unescapeParens,
  unescapeRuleContent,
  isEscapableRuleChar,
} from "../permissions/permissionRuleParser.js";
import { assertPathHasNoNullBytes, expandPath, NullBytePathError } from "../path.js";
import {
  getRuleAnchorRootForSource,
  isPolicySlotAdminOrParentComposed,
  getSettingsForSource,
  getAllPolicyTierSettings,
  getSettings_DEPRECATED,
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  isAdminPolicyOrigin,
  getBasePolicySettingsOrigin,
  getBasePolicySettings,
  getSettingsForSourceTightenOnly,
  updateSettingsForSourceWithTransform,
} from "../settings/settings.js";
import { env } from "../env.js";
import {
  readJunctionSync,
  isPathWithin,
  toComparablePath,
  hasWin32DevicePrefixSpelling,
} from "../fsJunctions.js";
import { REPO_DIR_SETTING_SOURCES, isSettingSourceEnabled, SETTING_SOURCES } from "../settings/constants.js";
import { logForDebugging } from "../debug.js";
import {
  errorMessage,
  getErrnoCode,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
  isFsInaccessible,
} from "../errors.js";
import {
  reportSandboxErrorUnderStandIn,
  SANDBOX_TELEMETRY_MESSAGES,
  sandboxErrorSignalLazy,
  describeUnreadableSandboxError,
  SandboxInitFailedError,
  SandboxBridgeUnavailableError,
  reportSandboxTelemetryError,
  SandboxProtectionNotRenewedError,
} from "./sandboxErrors.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { objectSchema, stringSchema, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { PLUGIN_TOOL_STAGING_GUARD_FLAG, PLUGIN_TOOL_STAGING_DIRNAME } from "../tempDir.js";
import {
  isWindowsSandboxEnabled,
  getGitHomeInfo,
  isUnderGitHome,
  CLAUDECODESANDBOX,
  describeWindowsSandboxRemedy,
  isSeclogonAccessDenied,
  WindowsSandboxError_2,
  HOME_AS_CWD_NOTE,
  grantParentFoldersToSandboxGroup,
  rgRunner,
  grantExecutableReadToSandboxGroup,
  getSandboxUserStatus,
  writeWindowsDenyEntries,
  mergeNativeDenyState,
  hasAnyDeniedPath,
  dropAppliedNativeDenies,
  splitDenyLists,
  areNativeDeniesComplete,
} from "./windowsSandbox.js";
import {
  windowsStateDir,
  parseWindowsSandboxError,
  getWindowsSandboxUserStatusAsync,
  expandWindowsFsPaths,
  WindowsSandboxError,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { certThumbprint } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/mitm-ca.js";
import {
  getOriginalCwd,
  getCwdState,
  getProjectRoot,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getProjectConfigRoot,
  getAdditionalDirectoriesForClaudeMd,
  isDiskless,
  getIsNonInteractiveSession,
} from "../../bootstrap/state.js";
import {
  isScrubEnabled,
  isScrubSandboxAvailable,
  getSandboxBwrapPath,
  getSandboxSocatPath,
} from "../subprocessEnv.js";
import { canonicalizeHost } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/parent-proxy.js";
import { parseHostPort } from "../../commands/ide/ide.js";
import {
  splitDomainPatternPort,
  isInjectHostCoveredByAllowedDomains,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/domain-pattern.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { parseGitConfigSections } from "../git/gitConfigParser.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import {
  identity,
  isMacSpecialPath,
  isDeviceNamespacePath,
  uncHostOf,
  hasDotSegment,
  isForeignNetworkPath,
} from "../pathClassification.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../../services/analytics/featureTelemetry.js";
import {
  createWalkMemo,
  rawPointerPathWalk,
  rawPointerPathIsUnsafe,
  readLinkTextSafe,
  linkChainIsUnsafeToFollow,
  pointerFileIsSuspect,
} from "../git/gitFilesystem.js";
import {
  isOnForeignMount,
  isUntouchableSpelling,
  isNetDir,
  networkMountHost,
  isForeignMountPath,
  isNetworkMountPath,
  neverOtherHostMount,
  networkMountRootCached,
  foldCase_2,
  readAutoMaster,
  readAutofsMounts,
  readAutofsMountPoints,
  isWslUncPath,
  readResolvSearchDomains,
} from "../networkPaths.js";
import { isWindowsDevicePath, nativeRealpathLong } from "../windowsUncPaths.js";
import { ATOMIC_WRITE_DIRNAME } from "../plugins/safeCopy.js";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { recordStagingDirIdentity, throwStagingTampered } from "../fsSafety/atomicWriteStaging.js";
import { addFileGlobRuleToGitignore } from "../git/gitignore.js";
import { countWhere } from "../collections.js";
import { getClaudeTempDirRealpath, getChildProcessTmpDirRealpath } from "../tempDirRealpaths.js";
import { getDropInDir } from "../fileStateCache.js";
import { WSL_MANAGED_SETTINGS_DIR } from "../settings/mdm/wslRegistry.js";
import { getBashEditDiffDir, setUserTempRoot, neverTempRoot } from "./userTempRoot.js";
import { signatureFileFor, signatureIatFileFor } from "../settings/policyCertificates.js";
import { stampPathFor } from "../../services/policyLimits/cacheStamp.js";
import { devModsDir } from "../../plugins/functionHooks/devModsName.js";
import { peekTaskOutputDir } from "../task/diskOutput.js";
import {
  projectPluginsDir,
  updateDeniedProducerDirs,
  pluginRootDirs,
  commandProducerDirs,
  onProducerDirsChanged,
} from "../plugins/pluginCachePaths.js";
import { getPluginSeedDirs } from "../plugins/pluginDirectories.js";
import {
  helperConfigPath,
  policyHelperPaths,
  retiredHelperPaths,
} from "../settings/policyHelper/helperRemote.js";
import { isNetworkOrMacSpecialPath } from "../settings/types.js";
import {
  getMockRemoteSettingsFixturePath,
  getSettingsPath,
} from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { syncStampPath } from "../../services/remoteManagedSettings/consentRecords.js";
import { claudeStateFilePaths } from "../permissions/claudeStatePaths.js";
import { getWIFProfileStoreDenyPaths } from "../wifProfile.js";
import { getIdeLockfilesPaths } from "../ide.js";
import { normalizePathForCompare } from "../file.js";
import { findGitRoot, findCanonicalGitRoot, getLocalInterfaceAddresses } from "../git.js";
import {
  getFeatureValue_CACHED_MAY_BE_STALE,
  onGrowthBookRefresh,
} from "../../services/analytics/growthbook.js";
import { logEvent } from "../../services/analytics/index.js";
import { repoResidentSettingSources } from "../permissions/permissionsLoader.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { userSettingsHomes } from "../settings/settingsFileParsing.js";
import {
  AWS_CREDENTIAL_ENV_NAMES,
  credentialRuleRefine,
  MERGE_PAIR_SUPPRESSOR_SENTINEL,
  SLOT_COLLISION_SENTINEL,
  INVALID_PAIR_SENTINEL,
} from "../settings/settingsSourceTrust.js";
import { ripgrepCommand } from "../ripgrep.js";
import {
  seccompExecPlan,
  assertMarkedPathsResolved,
  checkAppArmorUserNamespaces,
  linuxSandboxProbes,
} from "./linuxSandboxExec.js";
import { SandboxManager_2 } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js";
import { memoizeAlias } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { createStore } from "../../state/store.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isSentinelInode, jsonStringify } from "../slowOperations.js";
import { regExp } from "../permissions/protectedDirNames.js";
import { isSystemVolumePath } from "../permissions/protectedDirs.js";
import { isLoopbackHost } from "../localhost.js";
import { sandboxBinaryPath } from "../../components/sandbox/SandboxDependenciesTab.js";
import { isEnvTruthy } from "../envUtils.js";
import { envDynamicProbe } from "../envDynamic.js";
import { getHostAgentPolicy } from "../hostAgentPolicy.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { permissionRuleExtractPrefix } from "../permissions/shellRuleMatching.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { READ_LIMITS, O_NOFOLLOW_ANY } from "../fsBoundRead.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-gg17c06d.js:4800-4866 callgraph-fingerprint (2.1.88 match: permissionRuleValueFromString, 1)
function permissionRuleValueFromString(ruleString) {
  return ruleString.ruleContent === "*" && READ_LIKE_TOOLS.has(ruleString.toolName) && isAmberPloverOn();
}
//@ chunk-mrcnh9sb.js:1080-1176 placement
/**
 * hostIdentityMatches：主机身份是否一致。
 */
function hostIdentityMatches(hostPattern, host) {
  let patternKey = normalizeDomainKey(`domain:${hostPattern}`);
  let hostKey = normalizeDomainKey(`domain:${host}`);
  return patternKey.includes("*") ? domainRuleMatches(patternKey, hostKey) : patternKey === hostKey;
}
//@ chunk-qg41pqt6.js:855647-855697 fingerprint (2.1.88 match: getExcludedCommands, 0.74)
function getTrustedExcludedCommands() {
  return collectFromSandboxSettings((settings) => settings.excludedCommands);
}
//@ chunk-qg41pqt6.js:909175-909268 placement
/**
 * Shell 需要沙箱但沙箱不可用时抛出的错误类型。
 */
class SandboxUnavailableForShellError extends Error {
  constructor(message) {
    super(message);
    this.name = "SandboxUnavailableForShellError";
  }
}
//@ chunk-qg41pqt6.js:909268-909355 placement
class SandboxCommandTooLongError extends Error {
  constructor(message) {
    super(message);
    this.name = "SandboxCommandTooLongError";
  }
}
//@ chunk-qg41pqt6.js:909355-909464 placement
/**
 * 沙箱因策略拒绝执行时的错误，带 reason 字段。
 */
class SandboxPolicyRefusalError extends Error {
  reason;
  constructor(message, reason) {
    super(message);
    this.reason = reason;
    this.name = "SandboxPolicyRefusalError";
  }
}
//@ chunk-qg41pqt6.js:909464-909545 placement
/**
 * POSIX 路径前缀覆盖：相等、或根目录覆盖一切绝对路径、或以 e/ 开头。
 */
function posixCovers(rulePath, path) {
  return path === rulePath || (rulePath === "/" ? path.startsWith("/") : path.startsWith(`${rulePath}/`));
}
//@ chunk-qg41pqt6.js:909545-909693 placement
/**
 * 用 picomatch 按 dot:true（可选大小写不敏感）匹配 glob，编译结果按模式缓存，编译失败视为不匹配。
 */
function matchesGuardedGlob(path, pattern, cache, nocase = false) {
  let cacheKey = nocase ? `${pattern}\x00nocase` : pattern;
  let matcher = cache?.get(cacheKey);
  if (!matcher) {
    try {
      matcher = celModule.default(pattern, {
        dot: true,
        nocase,
      });
    } catch {
      matcher = () => false;
    }
    cache?.set(cacheKey, matcher);
  }
  return matcher(path);
}
//@ chunk-qg41pqt6.js:909693-909954 placement
/**
 * 把含通配段的路径拆成若干“名字读法”：整串作字面名，以及每个通配段前的前缀目录 + 余下 glob，用于判断 glob 可能命中的文件夹名。
 */
function nameReadingsOfGlobSpelling(spelling) {
  let baseName = removeTrailingGlobSuffix(spelling);
  let parts = baseName.split("/");
  let flattened = parts.flatMap((part, partIndex) => (containsGlobChars(part) ? [partIndex] : []));
  if (flattened.length === 0) return [];
  return [
    {
      name: baseName.replace(/\/+$/, ""),
      pattern: null,
    },
    ...flattened.slice(1).map((partIndex) => ({
      name: parts.slice(0, partIndex).join("/"),
      pattern: `/${parts.slice(partIndex).join("/")}${spelling.slice(baseName.length)}`,
    })),
  ];
}
//@ chunk-qg41pqt6.js:909954-910083 placement
/**
 * 路径是否匹配某个名字读法：字面名相等，或位于前缀目录下且余下部分匹配 glob。
 */
function matchesNameReading(path, readings, cache, nocase = false) {
  return readings.some(({ name, pattern }) =>
    pattern === null
      ? path === name
      : path.startsWith(`${name}/`) && matchesGuardedGlob(path.slice(name.length), pattern, cache, nocase),
  );
}
//@ chunk-qg41pqt6.js:910083-910245 placement (2.1.88 match: LayoutMeasureMode, 0.654)
function matchesRuntimeGlobBy(path, pattern, caseMode, matchFn) {
  return (
    matchFn(pattern, path) ||
    (containsGlobChars(path) &&
      nameReadingsOfGlobSpelling(pattern).some(({ name, pattern }) =>
        pattern === null
          ? caseMode === "exactly"
            ? path === name
            : posixCovers(name, path)
          : path.startsWith(`${name}/`) && matchFn(pattern, path.slice(name.length)),
      ))
  );
}
//@ chunk-qg41pqt6.js:910245-910276 placement
var LONG_PATTERN_OR_PATH_RE = /[^/]{256}|^[^]{4097}/;
//@ chunk-qg41pqt6.js:910276-910887 placement
/**
 * 用运行时 glob 判断路径是否命中拒绝条目：按大小写模式（anyCase/ownCase/exactly）编译读、写两种翻译并缓存；无法编译或需要覆盖整个目录时退化为匹配 glob 的基目录。
 */
function matchesDenyGlobAtRuntime(path, pattern, caseMode, coverage, cache) {
  if (LONG_PATTERN_OR_PATH_RE.test(path)) return false;
  return matchesRuntimeGlobBy(path, removeTrailingGlobSuffix(pattern), caseMode, (globPattern, candidate) => {
    let cacheKey = (readTranslation) => `${globPattern}\x00runtime ${readTranslation} ${coverage}`;
    let matcher = cache?.get(cacheKey(caseMode));
    if (!matcher) {
      let readTranslation = compileDenyGlob(globPattern);
      let writeTranslation = coverage === "unread" ? undefined : canonicalGlobSource(globPattern);
      let translations = (
        coverage === "allBeneathItsDirectory"
          ? readTranslation.kind !== "read" || writeTranslation?.kind !== "read"
          : coverage === "allBeneathIfUncompilable" &&
            (readTranslation.kind === "unreadable" || writeTranslation?.kind === "unreadable")
      )
        ? [directoryCoverRegex(getGlobBaseDirectory(globPattern))]
        : [readTranslation, writeTranslation].flatMap((translation) =>
            translation?.kind === "read" ? [translation.translation] : [],
          );
      let buildMatcher = (caseMode) => {
        let [primary, secondary] = translations.map((translation) => translation[caseMode]);
        if (!primary) return () => false;
        return !secondary || secondary.source === primary.source
          ? (candidate) => primary.test(candidate)
          : (candidate) => primary.test(candidate) || secondary.test(candidate);
      };
      for (let caseMode of ["anyCase", "ownCase", "exactly"])
        cache?.set(cacheKey(caseMode), buildMatcher(caseMode));
      matcher = buildMatcher(caseMode);
    }
    return matcher(candidate);
  });
}
//@ chunk-qg41pqt6.js:910887-911045 placement
/**
 * deny 条目是否覆盖目标路径：非 glob 用前缀覆盖；glob 则对目标及其各级父目录依次尝试 glob 与名字读法匹配。
 */
function denyEntryCovers(denyPattern, path, cache, nocase = false) {
  if (!containsGlobChars(denyPattern)) return posixCovers(denyPattern, path);
  let readings = containsGlobChars(path) ? nameReadingsOfGlobSpelling(denyPattern) : [];
  let candidate = path;
  for (;;) {
    if (
      matchesGuardedGlob(candidate, denyPattern, cache, nocase) ||
      matchesNameReading(candidate, readings, cache, nocase)
    )
      return true;
    let parent = dirname(candidate);
    if (parent === candidate) return false;
    candidate = parent;
  }
}
//@ chunk-qg41pqt6.js:911045-911156 placement
function denyEntryCoversPath(denyPattern, path, cache, nocase = false) {
  if (!containsGlobChars(denyPattern)) return posixCovers(denyPattern, path);
  return (
    matchesDenyGlobAtRuntime(path, denyPattern, nocase ? "anyCase" : "ownCase", "unread", cache) ||
    denyEntryCovers(denyPattern, path, cache, nocase)
  );
}
//@ chunk-qg41pqt6.js:911156-911409 placement
/**
 * 判断沙箱路径模式是否覆盖某路径：无 glob 时按路径段前缀比较，有 glob 时大小写两种折叠都试并处理不可编译模式。
 */
function denyEntryCoversFolded(denyPattern, path, cache) {
  let isWindows = getPlatform() === "windows";
  let posixPattern = isWindows ? denyPattern.replaceAll("\\", "/") : denyPattern;
  let posixPath = isWindows ? path.replaceAll("\\", "/") : path;
  if (!containsGlobChars(posixPattern)) return isPathPrefixOf(posixPattern, posixPath);
  let coverage = "allBeneathIfUncompilable";
  let foldedPattern = foldPathCase(posixPattern);
  let foldedPath = foldPathCase(posixPath);
  return (
    matchesDenyGlobAtRuntime(posixPath, posixPattern, "anyCase", coverage, cache) ||
    matchesDenyGlobAtRuntime(foldedPath, foldedPattern, "ownCase", coverage, cache) ||
    denyEntryCovers(posixPattern, posixPath, cache, true) ||
    denyEntryCovers(foldedPattern, foldedPath, cache)
  );
}
//@ chunk-qg41pqt6.js:911409-911577 placement
/**
 * glob 模式第一个通配符之前的目录部分（Windows 用 win32.dirname）。
 */
function getGlobBaseDirectory(pattern) {
  let literalPrefix = pattern.split(/[*?[\]]/)[0] ?? "";
  if (getPlatform() === "windows") return win32.dirname(literalPrefix.replace(/[/\\]+$/, "\\_"));
  return literalPrefix.endsWith("/") ? literalPrefix.replace(/\/+$/, "") || "/" : dirname(literalPrefix);
}
//@ chunk-qg41pqt6.js:911577-911802 placement
/**
 * 把规则串（如 `Read(//secret/**)`、`WebFetch(domain:x)`）解析成 {toolName, ruleContent}，Windows 上对反斜杠路径单独处理转义。
 */
function parseRuleForSandbox(ruleString) {
  let parsed = classifyRuleParens(ruleString);
  if (parsed.kind !== "call" || !parsed.toolName || parsed.rawContent === "")
    return {
      toolName: canonicalToolName(ruleString),
    };
  let isWindowsPath = getPlatform() === "windows" && isWindowsAbsoluteRule(parsed.rawContent);
  return {
    toolName: canonicalToolName(parsed.toolName),
    ruleContent: isWindowsPath ? unescapeParens(parsed.rawContent) : unescapeRuleContent(parsed.rawContent),
  };
}
//@ chunk-qg41pqt6.js:911802-912142 placement
/**
 * 去掉沙箱路径规则中的 glob 转义（\x→x，单字符类 [x]→x），保留真正的通配与字符类；Windows 上只在特定字符前视反斜杠为转义。
 */
function unescapeGlobPattern(pattern) {
  let isWindows = getPlatform() === "windows";
  let keepBackslashes = isWindows && isWindowsAbsoluteRule(pattern);
  let result = "";
  for (let j = 0; j < pattern.length; j++) {
    let char = pattern[j];
    let nextChar = pattern[j + 1];
    if (
      char === "\\" &&
      nextChar !== undefined &&
      !keepBackslashes &&
      (!isWindows || isEscapableRuleChar(nextChar))
    ) {
      result += containsGlobChars(nextChar) ? char + nextChar : nextChar;
      j++;
    } else if (char === "[" && nextChar !== undefined) {
      if (pattern[j + 2] === "]" && !containsGlobChars(nextChar) && !"\\/!^".includes(nextChar)) {
        result += nextChar;
        j += 2;
      } else {
        let index = pattern.indexOf("]", j + 2);
        let classEnd = index === -1 ? pattern.length : index + 1;
        result += pattern.slice(j, classEnd);
        j = classEnd - 1;
      }
    } else result += char;
  }
  return result;
}
//@ chunk-qg41pqt6.js:912142-912444 placement
/**
 * 解析 sandbox.filesystem 路径：`//x` 为绝对，`/x` 相对该设置来源根目录，`~/` 家目录，其他相对 cwd（./）。
 */
function resolvePathPatternForSandboxAt(pattern, sourceRoot) {
  assertPathHasNoNullBytes(pattern);
  if (pattern.startsWith("//")) return stripTrailingSlash(unescapeGlobPattern(pattern.slice(1)));
  if (pattern.startsWith("/")) {
    let sliced = pattern.slice(1);
    let relativeToRoot = !(getPlatform() === "windows" && /^(?:[A-Za-z]:[\\/]|\\\\)/.test(sliced));
    return resolve(sourceRoot, (relativeToRoot ? "./" : "") + unescapeGlobPattern(sliced));
  }
  let unescaped = unescapeGlobPattern(pattern);
  let anchor = /^(?:[\\/]|~[\\/]|~$|[A-Za-z]:)/.exec(unescaped)?.[0] ?? "";
  return stripTrailingSlash(pattern.startsWith(anchor) ? unescaped : `./${unescaped}`);
}
//@ chunk-qg41pqt6.js:912444-912483 placement
function resolvePathPatternForSandbox(pattern, source) {
  return resolvePathPatternForSandboxAt(pattern, getRuleAnchorRootForSource(source));
}
//@ chunk-qg41pqt6.js:912483-912593 placement
/**
 * 解析权限规则里的路径模式（Read/Edit 规则），`//x` 为绝对，其余经 expandPath 相对来源根；Windows 先展开 %USERPROFILE% 等。
 */
function resolveSandboxFilesystemPathAt(path, anchor) {
  assertPathHasNoNullBytes(path);
  if (path.startsWith("//")) return stripTrailingSlash(path.slice(1));
  return stripTrailingSlash(
    expandPath(getPlatform() === "windows" ? expandWindowsProfileVariables(path) : path, anchor),
  );
}
//@ chunk-qg41pqt6.js:912593-912684 placement
/**
 * 沙箱文件系统路径是否为相对路径（不是绝对路径也不是 ~/ 开头）；Windows 先展开 %USERPROFILE% 类变量。
 */
function isSandboxFilesystemPathRelative(value) {
  let trimmed = (getPlatform() === "windows" ? expandWindowsProfileVariables(value) : value).trim();
  return !isAbsolute(trimmed) && !/^~(?:\/|$)/.test(trimmed);
}
//@ chunk-qg41pqt6.js:912684-912751 placement
/**
 * Windows 上含 profile 变量的路径在旧版本被当相对路径读，返回 ./ 前缀的旧读法用于提示；其他情况 null。
 */
function sandboxFilesystemPathAsReadEarlier(value) {
  return getPlatform() === "windows" && hasWindowsProfileVariable(value) ? `./${value.trim()}` : null;
}
//@ chunk-qg41pqt6.js:912751-912868 placement
function hasWindowsProfileVariable(value) {
  return (
    /^\s*(?:~\\|%(?:USERPROFILE|APPDATA|LOCALAPPDATA)%)/i.test(value) && !/%HOME(?:DRIVE|PATH)%/i.test(value)
  );
}
//@ chunk-qg41pqt6.js:912868-913145 placement
function expandWindowsProfileVariables(value) {
  if (!hasWindowsProfileVariable(value)) return value;
  let home = homedir();
  return expandWindowsEnvRefs(
    value
      .replace(/%APPDATA%/gi, () =>
        env.APPDATA && isAbsolute(env.APPDATA) ? env.APPDATA : join(home, "AppData", "Roaming"),
      )
      .replace(/%LOCALAPPDATA%/gi, () =>
        env.LOCALAPPDATA && isAbsolute(env.LOCALAPPDATA) ? env.LOCALAPPDATA : join(home, "AppData", "Local"),
      ),
  ).replace(/^\s*~\\/, "~/");
}
//@ chunk-qg41pqt6.js:913145-913285 placement
function stripTrailingSlash(path, { evenAfterGlob = false } = {}) {
  if (getPlatform() === "windows" || !path.endsWith("/")) return path;
  if (!evenAfterGlob && containsGlobChars(path)) return path;
  return path.replace(/\/+$/, "") || "/";
}
//@ chunk-qg41pqt6.js:913285-913395 placement
function normalizeDirectoryPattern(pattern) {
  if (getPlatform() === "windows")
    return containsGlobCharsWin(stripExtendedPathPrefix(pattern)) ? pattern.replace(/[\\/]+$/, "") : pattern;
  return stripTrailingSlash(pattern, {
    evenAfterGlob: true,
  });
}
//@ chunk-qg41pqt6.js:913395-913458 placement
function isDirectorySync(file) {
  try {
    return statSync(file).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-qg41pqt6.js:913458-913520 placement
function isDirectoryNoFollow(path) {
  try {
    return lstatSync(path).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-qg41pqt6.js:913520-913594 layout (2.1.88 match: scanDirectory, 0.767)
function scanDirectory(dirPath) {
  return (
    isDirectoryNoFollow(dirPath) &&
    (getPlatform() !== "windows" || readJunctionSync(dirPath).kind === "directory")
  );
}
//@ chunk-qg41pqt6.js:913594-913633 placement
function resolveSandboxFilesystemPath(path, source) {
  return resolveSandboxFilesystemPathAt(path, getRuleAnchorRootForSource(source));
}
//@ chunk-qg41pqt6.js:913633-913665 placement
function isRepoSettingSource(source) {
  return REPO_DIR_SETTING_SOURCES.has(source);
}
//@ chunk-qg41pqt6.js:913665-913732 placement
function isUserTierSource(source) {
  return source === "userSettings" || (source === "flagSettings" && isNotBackgroundSession());
}
//@ chunk-qg41pqt6.js:913732-913820 placement
function isTrustedTierSource(source) {
  return source === "policySettings"
    ? isPolicySlotAdminOrParentComposed()
    : source === "userSettings" || source === "flagSettings";
}
//@ chunk-qg41pqt6.js:913820-913875 placement
function isNotBackgroundSession() {
  return env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-qg41pqt6.js:913875-913970 placement
function warnDroppedPathEntry(error, source) {
  reportSandboxPathError(
    error,
    `Ignoring unresolvable sandbox path entry from ${source}`,
    "pathEntryDropped",
  );
}
//@ chunk-qg41pqt6.js:913970-914088 placement
function reportSandboxPathError(error, label, code) {
  let cause = error instanceof SandboxPathEntryError ? error.cause : error;
  if (cause instanceof NullBytePathError)
    logForDebugging(`${label}: ${errorMessage(cause)}`, {
      level: "warn",
    });
  else reportSandboxErrorUnderStandIn(cause, code);
}
//@ chunk-qg41pqt6.js:914088-914194 placement
class SandboxPathEntryError extends Error {
  cause;
  telemetryMessage = SANDBOX_TELEMETRY_MESSAGES.pathEntryRefused;
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}
//@ chunk-qg41pqt6.js:914194-914373 placement
/**
 * 解析一条沙箱路径条目；失败时若沙箱为必需、或是可信层的 deny 条目则抛 SandboxPathEntryError（整个配置构建失败），否则告警丢弃。
 */
function resolvePathEntry(entry, source, kind, resolveFn) {
  try {
    return resolveFn(entry, source);
  } catch (error) {
    if (
      (isSettingSourceEnabled(source) && isSandboxRequired()) ||
      (!(error instanceof NullBytePathError) && kind === "deny" && !isRepoSettingSource(source))
    )
      throw new SandboxPathEntryError(`${errorMessage(error)} (a sandbox path entry from ${source})`, error);
    warnDroppedPathEntry(error, source);
    return;
  }
}
//@ chunk-qg41pqt6.js:914373-914467 placement
/**
 * 批量解析路径条目（相对于来源根、展开 ~），丢弃解析失败的条目。
 */
function resolvePathEntries(entries, source, kind, resolveFn) {
  return (entries ?? []).flatMap((entry) => {
    let pathEntry = resolvePathEntry(entry, source, kind, resolveFn);
    return pathEntry === undefined ? [] : [pathEntry];
  });
}
//@ chunk-qg41pqt6.js:914467-914507 placement
function resolveSandboxPathPatterns(entries, source, kind) {
  return resolvePathEntries(entries, source, kind, resolveSandboxFilesystemPath);
}
//@ chunk-qg41pqt6.js:914507-914656 placement
/**
 * 把权限规则列表按工具名分组，只保留有 ruleContent 的（如取出所有 Read(...) 的路径）。
 */
function groupRuleContentsByTool(ruleStrings, toolNames) {
  let byTool = new Map(toolNames.map((toolName) => [toolName, []]));
  for (let ruleString of ruleStrings ?? []) {
    let ruleForSandbox = parseRuleForSandbox(ruleString);
    if (ruleForSandbox.ruleContent) byTool.get(ruleForSandbox.toolName)?.push(ruleForSandbox.ruleContent);
  }
  return byTool;
}
//@ chunk-qg41pqt6.js:914656-914748 layout
function editAllowRuleContents(ruleStrings) {
  return (groupRuleContentsByTool(ruleStrings, [EDIT]).get(EDIT) ?? []).filter(
    (ruleContent) =>
      !permissionRuleValueFromString({
        toolName: EDIT,
        ruleContent,
      }),
  );
}
//@ chunk-qg41pqt6.js:914748-914788 placement
function resolveSandboxDenyReadEntry(entry, source) {
  return normalizeDirPattern(entry, resolveSandboxFilesystemPath(entry, source));
}
//@ chunk-qg41pqt6.js:914788-914824 placement
function normalizeDirPattern(entry, path) {
  return normalizeDirEntryPattern(entry, normalizeDirectoryPattern(path));
}
//@ chunk-qg41pqt6.js:914824-914946 placement
var NETWORK_HOST_RULE_SCHEMA; // deferred: uses DoctorLazy (../../cli/handlers/util.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg41pqt6.js:914824", () => {
  NETWORK_HOST_RULE_SCHEMA = DoctorLazy(() =>
    objectSchema({
      host: stringSchema().min(1),
      action: _enum(["allow", "deny"]).optional(),
      methods: array(stringSchema()).optional(),
      reason: stringSchema().optional(),
    }),
  );
});
//@ chunk-qg41pqt6.js:914946-914973 placement
function antSandboxConfig() {
  return null;
}
//@ chunk-qg41pqt6.js:914973-915030 placement
function isNestedGitConfigLockDenyEnabled() {
  return readFlagWithOverride("tengu_golden_pebble", {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915030-915091 placement
function isSshStoreWriteDenyEnabled() {
  return readFlagWithOverride("tengu_resilient_adleman", {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915091-915130 placement
function isPluginToolStagingDenyEnabled() {
  return readFlagWithOverride(PLUGIN_TOOL_STAGING_GUARD_FLAG, {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915130-915161 placement
var TENGU_HUSHED_CARAWAY = "tengu_hushed_caraway";
//@ chunk-qg41pqt6.js:915161-915200 placement
function isPatternWriteDenyTwinsEnabled() {
  return readFlagWithOverride(TENGU_HUSHED_CARAWAY, {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915200-915229 placement
var TENGU_DUSKY_SORREL = "tengu_dusky_sorrel";
//@ chunk-qg41pqt6.js:915229-915268 placement
function isUnlistableWorktreesDenyEnabled() {
  return readFlagWithOverride(TENGU_DUSKY_SORREL, {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915268-915297 layout
var TENGU_QUIET_MEDLAR = "tengu_quiet_medlar";
//@ chunk-qg41pqt6.js:915297-915336 layout
function denyUnlistableWorktrees() {
  return readFlagWithOverride(TENGU_QUIET_MEDLAR, {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915336-915366 layout
var TENGU_SERENE_FLURRY = "tengu_serene_flurry";
//@ chunk-qg41pqt6.js:915366-915405 layout
function denyLegacyRemoteDirs() {
  return readFlagWithOverride(TENGU_SERENE_FLURRY, {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915405-915464 layout
function pinGitInfoDirs() {
  return readFlagWithOverride("tengu_riveted_lantern", {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:915464-915500 layout
var SANDBOX_NOREPLACE_SENTINEL = ".claude-sandbox-noreplace";
//@ chunk-qg41pqt6.js:915500-915524 placement
/**
 * 外部构建里沙箱 GrowthBook 配置恒为 {}（forbidUnsandboxedCommands、disableNoSandbox、requireSandboxedAttempt、filesystemPolicy 都未设置）。
 */
function getDefaultSandboxGbConfig() {
  return {};
}
//@ chunk-qg41pqt6.js:915524-915573 placement
function getSandboxGbConfig() {
  return getSandboxAdapterState().tenguSandboxGbConfig();
}
//@ chunk-qg41pqt6.js:915573-915744 placement
/**
 * 清掉沙箱 GrowthBook 配置缓存与主机规则缓存；尚未初始化时同时重置“已安装过滤器强制白名单”标志。
 */
function relatchTenguSandboxGbConfig() {
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.tenguSandboxGbConfig.cache.clear?.();
  sandboxAdapterState.gbHostRulesMemo = undefined;
  if (sandboxAdapterState.initializationPromise === undefined)
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist = false;
}
//@ chunk-qg41pqt6.js:915744-915836 placement
function getTlsTerminateSetting() {
  return getSandboxSettingsSources()
    .map((settings) => settings?.sandbox?.network?.tlsTerminate)
    .find((value) => value !== undefined);
}
//@ chunk-qg41pqt6.js:915836-915996 placement
var MANDATE_IGNORED_NETWORK_KEYS = [
  "allowUnixSockets",
  "allowAllUnixSockets",
  "allowLocalBinding",
  "allowMachLookup",
  "httpProxyPort",
  "socksProxyPort",
];
var PROXY_PORT_KEYS = ["httpProxyPort", "socksProxyPort"];
//@ chunk-qg41pqt6.js:915996-917733 placement
/**
 * 计算 sandbox.network 的本地放行项（unix socket、本地绑定、mach lookup、代理端口）：无管理员强制且无可信网络限制时直接用合并设置；否则忽略 project/local 设置里的这些键（并记一次日志），代理端口在 allowManagedDomainsOnly 时只认托管设置。
 */
function getNetworkAllowances(network) {
  let adminMandate = isAdminSandboxMandate();
  if (!adminMandate && !hasTrustedNetworkRestrictions())
    return {
      allowUnixSockets: network?.allowUnixSockets,
      allowAllUnixSockets: network?.allowAllUnixSockets,
      allowLocalBinding: getAllowLocalBindingFor(network),
      allowMachLookup: network?.allowMachLookup,
      httpProxyPort: network?.httpProxyPort,
      socksProxyPort: network?.socksProxyPort,
    };
  let managedDomainsOnly = shouldAllowManagedSandboxDomainsOnly();
  let sandboxAdapterState = getSandboxAdapterState();
  if (!sandboxAdapterState.droppedRepoNetworkAllowancesLogged) {
    sandboxAdapterState.droppedRepoNetworkAllowancesLogged = true;
    let mapped = ["projectSettings", "localSettings"].map((sourceName) =>
      isSettingSourceEnabled(sourceName) ? getSettingsForSource(sourceName) : null,
    );
    let filtered = (adminMandate ? MANDATE_IGNORED_NETWORK_KEYS : PROXY_PORT_KEYS).filter((key) =>
      mapped.some((settings) => {
        let value = settings?.sandbox?.network?.[key];
        return value !== undefined && value !== false;
      }),
    );
    if (filtered.length > 0)
      logForDebugging(
        adminMandate
          ? `[sandbox] admin sandbox mandate: ignoring sandbox.network.${filtered.join(", ")} from project/local settings`
          : `[sandbox] trusted network deny list or strict allowlist: ignoring sandbox.network.${filtered.join(", ")} from project/local settings (a project may not replace the filtering proxy)`,
      );
    if (managedDomainsOnly) {
      let chain = sandboxSettingsChain();
      let filtered = PROXY_PORT_KEYS.filter((key) =>
        chain.some((settings) => settings?.sandbox?.network?.[key] !== undefined),
      );
      if (filtered.length > 0)
        logForDebugging(
          `[sandbox] network.allowManagedDomainsOnly: ignoring sandbox.network.${filtered.join(", ")} from --settings/user settings; only managed settings may replace the filtering proxy`,
        );
    }
  }
  let pickSetting = managedDomainsOnly ? policySandboxSetting : firstFromSandboxSettings;
  let httpProxyPort = pickSetting((settings) => settings.network?.httpProxyPort);
  let socksProxyPort = pickSetting((settings) => settings.network?.socksProxyPort);
  if (!adminMandate)
    return {
      allowUnixSockets: network?.allowUnixSockets,
      allowAllUnixSockets: network?.allowAllUnixSockets,
      allowLocalBinding: getAllowLocalBindingFor(network),
      allowMachLookup: network?.allowMachLookup,
      httpProxyPort,
      socksProxyPort,
    };
  let unixSockets = collectFromSandboxSettings((settings) => settings.network?.allowUnixSockets);
  let machLookups = collectFromSandboxSettings((settings) => settings.network?.allowMachLookup);
  return {
    allowUnixSockets: unixSockets.length > 0 ? unixSockets : undefined,
    allowAllUnixSockets: trustedBooleanUnlessFalse(
      network?.allowAllUnixSockets,
      (settings) => settings.network?.allowAllUnixSockets,
    ),
    allowLocalBinding:
      getPlatform() === "windows"
        ? getWindowsLoopbackSetting()
        : trustedBooleanUnlessFalse(
            network?.allowLocalBinding,
            (settings) => settings.network?.allowLocalBinding,
          ),
    allowMachLookup: machLookups.length > 0 ? machLookups : undefined,
    httpProxyPort,
    socksProxyPort,
  };
}
//@ chunk-qg41pqt6.js:917733-917797 placement
function getAllowLocalBindingFor(network) {
  return getPlatform() === "windows" ? getWindowsLoopbackSetting() : network?.allowLocalBinding;
}
//@ chunk-qg41pqt6.js:917797-917871 placement
/**
 * Windows 沙箱是否允许本地连接：取 sandbox.network.allowLocalBinding（托管锁定时只看可信层）。
 */
function areWindowsLocalConnectionsOn() {
  return (
    (areSandboxSettingsLockedByPolicy() ? policySandboxSetting : firstFromSandboxSettings)(
      (settings) => settings.network?.allowLocalBinding,
    ) === true
  );
}
//@ chunk-qg41pqt6.js:917871-918024 fingerprint (2.1.88 match: areSandboxSettingsLockedByPolicy, 0.862)
/**
 * 只看 policySettings：托管层设置了 sandbox.enabled / autoAllowBashIfSandboxed / allowUnsandboxedCommands 任一项即视为沙箱设置被托管锁定（SandboxManager.areSandboxSettingsLockedByManagedSettings）。
 */
function areSandboxSettingsLockedByPolicy() {
  let sandbox = getSettingsForSource("policySettings")?.sandbox;
  return (
    sandbox?.enabled !== undefined ||
    sandbox?.autoAllowBashIfSandboxed !== undefined ||
    sandbox?.allowUnsandboxedCommands !== undefined
  );
}
//@ chunk-qg41pqt6.js:918024-918080 placement
function getWindowsLoopbackSetting() {
  return getSandboxAdapterState().windowsLoopbackAtStart ?? areWindowsLocalConnectionsOn();
}
//@ chunk-qg41pqt6.js:918080-918157 placement
/**
 * 本地连接设置与启动时不同（需要重启才生效）时为真。
 */
function needsRestartForLocalConnections() {
  let windowsLoopbackAtStart = getSandboxAdapterState().windowsLoopbackAtStart;
  return windowsLoopbackAtStart !== undefined && windowsLoopbackAtStart !== areWindowsLocalConnectionsOn();
}
//@ chunk-qg41pqt6.js:918157-918197 placement
function trustedBooleanUnlessFalse(network, pickSetting) {
  return network === false ? false : firstFromSandboxSettings(pickSetting);
}
//@ chunk-qg41pqt6.js:918197-918229 placement
var ALLOW_ALL_UNIX_SOCKETS = {
  allowAllUnixSockets: true,
};
//@ chunk-qg41pqt6.js:918229-918452 placement
/**
 * Windows 上 tlsTerminate 的 CA 来源：设置给了 caCertPath/caKeyPath 为 trustedPair，srt-win 可用为 managed，否则 unavailable。
 */
function resolveWindowsTlsTerminateCaSource() {
  let tlsTerminateSetting = getTlsTerminateSetting();
  if (tlsTerminateSetting?.caCertPath || tlsTerminateSetting?.caKeyPath)
    return {
      source: "trustedPair",
      ...(tlsTerminateSetting.caCertPath && {
        caCertPath: tlsTerminateSetting.caCertPath,
      }),
      ...(tlsTerminateSetting.caKeyPath && {
        caKeyPath: tlsTerminateSetting.caKeyPath,
      }),
    };
  return isWindowsSandboxEnabled()
    ? {
        source: "managed",
      }
    : {
        source: "unavailable",
      };
}
//@ chunk-qg41pqt6.js:918452-918643 placement
function getCaCertPaths(windowsTlsTerminateCaSource) {
  switch (windowsTlsTerminateCaSource.source) {
    case "trustedPair":
      return {
        ...(windowsTlsTerminateCaSource.caCertPath && {
          caCertPath: windowsTlsTerminateCaSource.caCertPath,
        }),
        ...(windowsTlsTerminateCaSource.caKeyPath && {
          caKeyPath: windowsTlsTerminateCaSource.caKeyPath,
        }),
      };
    case "managed":
      return {};
    case "unavailable":
      return;
  }
}
//@ chunk-qg41pqt6.js:918643-918748 placement
/**
 * 沙箱是否会做 TLS 终止：设置了 tlsTerminate 且（非 Windows，或 Windows 有可用 CA 来源）。
 */
function willSandboxTlsTerminate() {
  if (getTlsTerminateSetting() === undefined) return false;
  if (getPlatform() !== "windows") return true;
  return resolveWindowsTlsTerminateCaSource().source !== "unavailable";
}
//@ chunk-qg41pqt6.js:918748-919088 placement
/**
 * 比较已安装的 Windows TLS CA 证书指纹与期望值；无证书路径、文件异常或读取失败一律视为最新。
 */
function isInstalledWindowsTlsCaCurrent(caCertThumb) {
  let windowsTlsTerminateCaSource = resolveWindowsTlsTerminateCaSource();
  try {
    let certPath =
      windowsTlsTerminateCaSource.source === "trustedPair"
        ? (windowsTlsTerminateCaSource.caCertPath ?? null)
        : windowsTlsTerminateCaSource.source === "managed"
          ? join(windowsStateDir(), "ca", "cert.pem")
          : null;
    if (certPath === null) return true;
    let fd = openSync(certPath, "r");
    let certPem;
    try {
      let stats = fstatSync(fd);
      if (!stats.isFile() || stats.size > MAX_DENY_PATTERN_BYTES) return true;
      let buffer = Buffer.alloc(stats.size);
      readSync(fd, buffer, 0, buffer.length, 0);
      certPem = buffer.toString("utf8");
    } finally {
      closeSync(fd);
    }
    return certThumbprint(certPem) === caCertThumb;
  } catch {
    return true;
  }
}
//@ chunk-qg41pqt6.js:919088-919102 placement
var MAX_DENY_PATTERN_BYTES = 65536;
//@ chunk-qg41pqt6.js:919102-919382 placement
function getFilesystemDisabledSetting() {
  let allPolicyTierSettings = getAllPolicyTierSettings();
  let policyDisabled = booleanOrUndefined(readPolicySandboxSetting(["filesystem", "disabled"]));
  if (policyDisabled !== undefined) return policyDisabled;
  if (
    allPolicyTierSettings.some(
      (policyTierSetting) =>
        policyTierSetting.sandbox?.filesystem !== undefined ||
        (policyTierSetting.sandbox?.credentials?.files ?? []).some(
          (credentialFile) => credentialFile.mode === "deny",
        ),
    )
  )
    return;
  return getSandboxSettingsSources()
    .map((settings) => settings?.sandbox?.filesystem?.disabled)
    .find((value) => value !== undefined);
}
//@ chunk-qg41pqt6.js:919382-919432 placement
function isFilesystemIsolationDisabledBySetting() {
  return getFilesystemDisabledSetting() === true && getEffectiveFilesystemPolicy() === "relaxed";
}
//@ chunk-qg41pqt6.js:919432-919484 placement
function booleanOrUndefined(value) {
  return typeof value === "boolean" ? value : undefined;
}
//@ chunk-qg41pqt6.js:919484-919562 placement
/**
 * 沙箱读禁止是否生效：沙箱启用、文件系统策略不是 relaxed 且没有覆盖原因。
 */
function sandboxReadBlockApplies() {
  return (
    SandboxManager.isSandboxingEnabled() &&
    getEffectiveFilesystemPolicy() !== "relaxed" &&
    getReadDenySkipReason() === null
  );
}
//@ chunk-qg41pqt6.js:919562-919882 placement
/**
 * 返回不添加读取拒绝的原因（只允许托管读取路径、原始工作目录含通配字符、Windows 需要管理员权限），否则 null。
 */
function getReadDenySkipReason() {
  if (
    getAllPolicyTierSettings().some(
      (settings) => settings.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
    )
  )
    return "allowManagedReadPathsOnly is set";
  if (containsGlobChars(getOriginalCwd())) return "the original working directory has glob characters";
  return getPlatform() === "windows"
    ? "on Windows the read denies are never added, because adding them needs administrator rights"
    : null;
}
//@ chunk-qg41pqt6.js:919882-920110 placement
/**
 * 有效文件系统策略 strict/relaxed：scrub 模式与 Windows 恒 strict；设置 sandbox.filesystem.disabled 显式指定时按其值；否则看 GrowthBook filesystemPolicy（relaxedIfForced：有设置根路径时 strict）。
 */
function getEffectiveFilesystemPolicy() {
  if (isScrubEnabled()) return "strict";
  if (getPlatform() === "windows") return "strict";
  let filesystemDisabledSetting = getFilesystemDisabledSetting();
  if (filesystemDisabledSetting !== undefined) return filesystemDisabledSetting ? "relaxed" : "strict";
  let filesystemPolicy = getSandboxGbConfig().filesystemPolicy ?? "strict";
  if (filesystemPolicy === "relaxedIfForced") return isSandboxEnabledInSettings() ? "strict" : "relaxed";
  return filesystemPolicy;
}
//@ chunk-qg41pqt6.js:920110-920166 placement
function sandboxExportsChildTmpDir() {
  return getPlatform() === "windows" || getEffectiveFilesystemPolicy() !== "relaxed";
}
//@ chunk-qg41pqt6.js:920166-920389 placement
function isSandboxEnabledInSettings() {
  return [
    ...getAllPolicyTierSettings(),
    getSettingsForSource("flagSettings"),
    isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
    isSettingSourceEnabled("projectSettings") ? getSettingsForSource("projectSettings") : null,
    isSettingSourceEnabled("localSettings") ? getSettingsForSource("localSettings") : null,
  ].some((settings) => settings?.sandbox?.enabled === true);
}
//@ chunk-qg41pqt6.js:920389-920476 placement (2.1.88 match: shouldAllowManagedSandboxDomainsOnly, 0.82)
/**
 * 任一托管/可信层设置了 sandbox.network.allowManagedDomainsOnly 时为真：网络白名单只认托管层。
 */
function shouldAllowManagedSandboxDomainsOnly() {
  return getAllPolicyTierSettings().some(
    (settings) => settings.sandbox?.network?.allowManagedDomainsOnly === true,
  );
}
//@ chunk-qg41pqt6.js:920476-920555 placement
/**
 * 任一可信层设置了 sandbox.network.strictAllowlist 时为真。
 */
function isStrictNetworkAllowlistConfigured() {
  return getSandboxSettingsSources().some((settings) => settings?.sandbox?.network?.strictAllowlist === true);
}
//@ chunk-qg41pqt6.js:920555-920627 placement
/**
 * 是否扣下按命令的额外网络放行：托管域名独占、严格白名单或插件评测（CLAUDE_CODE_EVAL_CONFINED）任一成立。
 */
function perCommandAllowsWithheld() {
  return (
    shouldAllowManagedSandboxDomainsOnly() ||
    isStrictNetworkAllowlistConfigured() ||
    Boolean(env.CLAUDE_CODE_EVAL_CONFINED)
  );
}
//@ chunk-qg41pqt6.js:920627-920692 placement
/**
 * 把单条命令批准的 allowed_domains 转成 sandbox-runtime 的逐命令网络列表；托管仅限域名/strictAllowlist/评测模式下逐命令放行被扣留（空列表）。
 */
function perCommandNetworkListsForRuntime(sandboxNetworkLists) {
  return {
    allowedDomains: perCommandAllowsWithheld()
      ? []
      : normalizeIpv6HostEntries([...sandboxNetworkLists.allow]),
  };
}
//@ chunk-qg41pqt6.js:920692-920810 placement (2.1.88 match: supportsPersistence, 0.792)
/**
 * 沙箱设置写到哪一层：仅允许托管域名时不可写；托管策略锁定时只写 userSettings（若启用），否则 localSettings。
 */
function sandboxHostGrantDestination() {
  if (shouldAllowManagedSandboxDomainsOnly()) return null;
  if (isAdminSandboxMandate() || isStrictNetworkAllowlistConfigured())
    return isSettingSourceEnabled("userSettings") ? "userSettings" : null;
  return "localSettings";
}
//@ chunk-qg41pqt6.js:920810-920837 placement
var TCP_PORT_PATTERN = /^[1-9][0-9]{0,4}$/;
//@ chunk-qg41pqt6.js:920837-920925 placement
/**
 * 主机名规范化（IDNA 等）后与其小写形式不同；IPv6 不算。用于识别易误导的同意弹窗主机名。
 */
function hostnameCanonicalFormDiffers(host) {
  if (isIP(host) === 6) return false;
  let canonical = canonicalizeHost(host);
  return canonical !== undefined && canonical !== host.toLowerCase();
}
//@ chunk-qg41pqt6.js:920925-921046 placement
function isValidSandboxHost(rawHost, host) {
  if (rawHost.length === 0 || rawHost.length > 255) return false;
  if (host.includes("%")) return false;
  if (isIP(host) !== 0) return true;
  return isSrtHostNameCharset(host);
}
//@ chunk-qg41pqt6.js:921046-921096 placement
function isSrtHostNameCharset(value) {
  return /^[A-Za-z0-9._-]+$/.test(value);
}
//@ chunk-qg41pqt6.js:921096-921196 placement
/**
 * 是否是严格端口后缀“:数字”且不超过 65535。
 */
function isStrictPortSuffix(text) {
  if (!text.startsWith(":")) return false;
  let sliced = text.slice(1);
  return TCP_PORT_PATTERN.test(sliced) && Number(sliced) <= 65535;
}
//@ chunk-qg41pqt6.js:921196-921346 placement
function stripIpv6Brackets(text) {
  if (!text.startsWith("[")) return text;
  let index = text.indexOf("]");
  if (index === -1) return;
  let text_2 = text.slice(index + 1);
  if (text_2 !== "" && !isStrictPortSuffix(text_2)) return;
  return text.slice(1, index);
}
//@ chunk-qg41pqt6.js:921346-921409 placement
function hasWildcardAfterNormalize(host) {
  let canonical = canonicalizeHost(host);
  return canonical !== undefined && canonical.includes("*");
}
//@ chunk-qg41pqt6.js:921409-921555 placement
/**
 * 规范化会不会改变主机：无法规范化、规范结果与原串不一致、或是特殊形式时为真；IP 直接为假。
 */
function canonicalizationChangesHost(host) {
  let stripped = stripIpv6Brackets(host);
  if (stripped === undefined) return true;
  if (!isValidSandboxHost(host, stripped)) return true;
  if (isIP(stripped) !== 0) return false;
  if (hasWildcardAfterNormalize(stripped)) return true;
  return hostnameCanonicalFormDiffers(stripped.replace(/\.$/, ""));
}
//@ chunk-qg41pqt6.js:921555-921601 placement
function isMisleadingConsentHost(host) {
  return host.includes("*") || canonicalizationChangesHost(host);
}
//@ chunk-qg41pqt6.js:921601-921696 placement
/**
 * 是否为不带方括号的 IPv6 字面量（至少两个冒号且不以 [ 开头）。
 */
function isBareIpv6Literal(text) {
  let index = text.indexOf(":");
  return index !== -1 && text.indexOf(":", index + 1) !== -1 && !text.startsWith("[");
}
//@ chunk-qg41pqt6.js:921903-922040 sole-consumer
function expandIpv6Spellings(host) {
  let spellings = [];
  if (isIP(host) === 6) spellings.push(`[${host}]`);
  let hostPort = parseHostPort(host);
  if (hostPort !== undefined) spellings.push(`[${hostPort.host}]:${hostPort.port}`);
  return spellings.length > 0 ? spellings : [host];
}
//@ chunk-qg41pqt6.js:922040-922150 placement
function expandBareIpv6Hosts(hosts) {
  return hosts.flatMap((host) => {
    if (!isBareIpv6Literal(host)) return [host];
    if (host.includes("@") || hostnameCanonicalFormDiffers(host)) return [host];
    return expandIpv6Spellings(host);
  });
}
//@ chunk-qg41pqt6.js:922150-922396 placement
function addTrailingDotFreeVariants(patterns) {
  return patterns.flatMap((pattern) => {
    if (pattern.startsWith("[")) return [pattern];
    let { hostPattern, port } = splitDomainPatternPort(pattern);
    let replaced = hostPattern.replace(/\.+$/, "");
    if (replaced === hostPattern) return [pattern];
    if (replaced === "" || replaced.endsWith("*")) return [pattern];
    if (canonicalizeHost(replaced) === undefined) return [pattern];
    return [pattern, port === undefined ? replaced : `${replaced}:${port}`];
  });
}
//@ chunk-qg41pqt6.js:922396-922617 placement
function bracketIpv6WithPort(text) {
  let index = text.lastIndexOf(":");
  let sliced = text.slice(0, index);
  let sliced_2 = text.slice(index + 1);
  let index_2 = sliced.indexOf(":");
  if (
    TCP_PORT_PATTERN.test(sliced_2) &&
    Number(sliced_2) <= 65535 &&
    sliced !== "" &&
    !(sliced.endsWith(":") && isIP(sliced) !== 6) &&
    index_2 !== -1 &&
    sliced.indexOf(":", index_2 + 1) !== -1
  )
    return `[${sliced}]:${sliced_2}`;
  return text;
}
//@ chunk-qg41pqt6.js:922617-922661 placement
function formatIpLiteralHost(host) {
  return isIP(host) === 6 ? `[${host}]` : host;
}
//@ chunk-qg41pqt6.js:922661-922741 placement
/**
 * 把主机名转成会话放行条目：去掉末尾点（原样或可规范化时），再做条目编码。
 */
function consentHostEntry(host) {
  let replaced = host.replace(/\.$/, "");
  return formatIpLiteralHost(replaced === host || canonicalizeHost(host) !== undefined ? replaced : host);
}
//@ chunk-qg41pqt6.js:922741-923095 placement
/**
 * 规范化网络条目中的 IPv6 主机写法：丢弃含 @、规范形式不一致或无法规范化的条目，为带端口的裸 IPv6 加方括号。
 */
function normalizeIpv6HostEntries(hosts) {
  return hosts.flatMap((host) => {
    if (host.includes("@")) return [];
    if (host.startsWith("[")) {
      let index = host.indexOf("]");
      let bracketed = index === -1 ? undefined : host.slice(1, index);
      if (bracketed !== undefined && hostnameCanonicalFormDiffers(bracketed)) return [];
      if (bracketed !== undefined && bracketed.includes("*") && canonicalizeHost(bracketed) !== undefined)
        return [];
      return [host];
    }
    if (!isBareIpv6Literal(host)) return [host];
    if (hostnameCanonicalFormDiffers(host)) return [];
    let rewritten = bracketIpv6WithPort(host);
    if (rewritten !== host) return [rewritten];
    if (isIP(host) === 6 && parseHostPort(host) !== undefined) return [];
    return [host];
  });
}
//@ chunk-qg41pqt6.js:923095-923387 placement
/**
 * 从多层设置收集网络域名条目：sandbox.network.allowedDomains/deniedDomains，加上 WebFetch(domain:…) 的 allow/deny 规则。
 */
function collectNetworkDomainEntries(sources, access) {
  let key = access === "allow" ? "allowedDomains" : "deniedDomains";
  let domains = [];
  for (let settings of sources) {
    for (let domain of settings.sandbox?.network?.[key] ?? []) domains.push(domain);
    for (let rule of settings.permissions?.[access] ?? []) {
      let ruleForSandbox = parseRuleForSandbox(rule);
      if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
        domains.push(ruleForSandbox.ruleContent.substring(7));
    }
  }
  return domains;
}
//@ chunk-qg41pqt6.js:923387-923522 placement
function hostEntryMatches(entry, host, port, missingPortMode) {
  let { hostPattern, port: port_2 } = splitDomainPatternPort(entry);
  if (!hostIdentityMatches(hostPattern, host)) return false;
  if (port_2 === undefined) return true;
  return port === undefined ? missingPortMode === "match" : port_2 === port;
}
//@ chunk-qg41pqt6.js:923522-923600 layout
function hostsIntersect(hosts, candidateHosts, port) {
  return addTrailingDotFreeVariants(expandBareIpv6Hosts(hosts)).some((pattern) =>
    candidateHosts.some((entry) => hostEntryMatches(pattern, entry, port, "match")),
  );
}
//@ chunk-qg41pqt6.js:923600-924094 placement
/**
 * 按沙箱网络策略判断主机是否允许：命中 deniedDomains（含 IP 反查名）则拒绝并给原因；allowManagedDomainsOnly 时只放行托管层白名单；否则放行。
 */
function isHostAllowedBySandboxNetworkPolicy(host, port) {
  let canonicalHost = isIP(host) !== 0 ? (canonicalizeHost(host) ?? host) : host;
  let sources = getAllPolicyTierSettings();
  let policyDenyEntries = [...collectNetworkDomainEntries(sources, "deny"), ...[]];
  let hostSpellings = [canonicalHost, host];
  let deniedByPolicy = hostsIntersect(policyDenyEntries, hostSpellings, port);
  if (
    deniedByPolicy ||
    hostsIntersect(collectNetworkDomainEntries([getSettings_DEPRECATED()], "deny"), hostSpellings, port)
  )
    return {
      allowed: false,
      byPolicy: deniedByPolicy,
      reason:
        canonicalHost === host
          ? `${host} is in sandbox.network.deniedDomains`
          : `${host} (${canonicalHost}) is in sandbox.network.deniedDomains`,
    };
  if (!shouldAllowManagedSandboxDomainsOnly())
    return {
      allowed: true,
    };
  if (
    normalizeIpv6HostEntries(collectNetworkDomainEntries(sources, "allow")).some((entry) =>
      hostEntryMatches(entry, canonicalHost, port, "no-match"),
    )
  )
    return {
      allowed: true,
    };
  return {
    allowed: false,
    byPolicy: true,
    reason: `sandbox.network.allowManagedDomainsOnly is set and ${host} is not in the policy allowlist`,
  };
}
//@ chunk-qg41pqt6.js:924094-924328 placement
function grantSessionHost(host) {
  if (isMisleadingConsentHost(host)) {
    logForDebugging(
      `[SandboxManager] Refusing a session grant for a host srt would re-spell as ${canonicalizeHost(host) ?? "(uncanonicalizable)"}`,
      {
        level: "warn",
      },
    );
    return;
  }
  let { sessionAllowedHosts } = getSandboxAdapterState();
  let entry = consentHostEntry(host);
  if (sessionAllowedHosts.has(entry)) return;
  sessionAllowedHosts.add(entry);
  refreshConfig();
}
//@ chunk-qg41pqt6.js:924328-924805 placement
/**
 * 解析拒绝路径中的符号链接：不是链接时记为字面候选；可解析时记录字面/解析路径/父目录信息供命令后清理；悬空链接时最多跟随 8 跳得到目标。
 */
function resolveDenySymlink(targetPath) {
  let linkTarget;
  try {
    linkTarget = readlinkSync(targetPath);
  } catch {
    getSandboxAdapterState().denyLiteralSymlinkCandidates.push(targetPath);
    return targetPath;
  }
  let state = getSandboxAdapterState();
  let parentInfo = resolveScrubParent(state, targetPath);
  let resolved;
  try {
    resolved = realpathSync(targetPath);
    state.symlinkedDenyScrubPaths.push({
      literal: targetPath,
      resolved,
      parent: parentInfo,
      hopDirectories: collectSymlinkHopDirectories(targetPath, resolved),
      danglingBaseline: false,
    });
    return resolved;
  } catch {
    let danglingFollowed = followDanglingLink(targetPath, linkTarget);
    let target = danglingFollowed ?? resolve(dirname(targetPath), linkTarget);
    for (let hop = 0; hop < 8; hop++) {
      let nextTarget;
      try {
        nextTarget = readlinkSync(target);
      } catch {
        break;
      }
      target = resolve(dirname(target), nextTarget);
    }
    state.symlinkedDenyScrubPaths.push({
      literal: targetPath,
      resolved: target,
      parent: parentInfo,
      hopDirectories: danglingFollowed === null ? null : collectSymlinkHopDirectories(targetPath, null),
      danglingBaseline: true,
    });
    return target;
  }
}
//@ chunk-qg41pqt6.js:924805-925524 placement
/**
 * 遍历 git 全局配置（~/.gitconfig 与 XDG git 的 config/ignore/attributes），按 include/文件引用继续展开，收集位于允许写目录之内、需要拒绝写入的文件路径。
 */
function collectGitConfigDenyPaths(xdgConfigHome, allowWriteRoots, getDenyRoots, isExcluded) {
  let homeDir = homedir();
  let queue = [
    {
      file: resolve(homeDir, ".gitconfig"),
      parse: true,
    },
    {
      file: resolve(xdgConfigHome, "git", "config"),
      parse: true,
    },
    {
      file: resolve(xdgConfigHome, "git", "ignore"),
      parse: false,
    },
    {
      file: resolve(xdgConfigHome, "git", "attributes"),
      parse: false,
    },
  ];
  let seen = new Set();
  let results = [];
  for (
    let item = queue.shift();
    item !== undefined && seen.size < MAX_HOST_LABEL_COUNT;
    item = queue.shift()
  ) {
    let { file, parse } = item;
    if (seen.has(file) || containsGlobChars(file)) continue;
    seen.add(file);
    if (isDirectorySync(file)) continue;
    let chain = resolveSymlinkChain(file);
    if (chain === null || chain.some(isExcluded)) continue;
    let index = chain.findIndex((paths) => isPathPrefixOfAny([paths], getDenyRoots()));
    results.push(
      ...(index === -1 ? chain : chain.slice(0, index)).filter(
        (path) =>
          allowWriteRoots.some((parse) => isPathPrefixOf(parse, path)) &&
          !allowWriteRoots.some((allowWriteRoot) => isPathPrefixOf(path, allowWriteRoot)),
      ),
    );
    let contents = parse && index === -1 ? readSmallTextFile(file) : null;
    if (contents === null) continue;
    let { includes, files } = parseGitConfigSections(contents);
    for (let [paths, shouldParse] of [
      [includes, true],
      [files, false],
    ])
      for (let includePath of paths) {
        let pathPatternForSandbox = resolvePathPatternForSandbox_2(includePath, file, homeDir);
        if (pathPatternForSandbox !== null)
          queue.push({
            file: pathPatternForSandbox,
            parse: shouldParse,
          });
      }
  }
  return normalizeCaseForComparison_2(results);
}
//@ chunk-qg41pqt6.js:925524-925648 placement
function resolvePathPatternForSandbox_2(value, file, homeDir) {
  if (value === "~" || value.startsWith("~/")) return resolve(homeDir, `./${value.slice(2)}`);
  return value.startsWith("~") ? null : resolve(dirname(file), value);
}
//@ chunk-qg41pqt6.js:925648-925794 placement
function readSmallTextFile(file) {
  try {
    let fileStats = statSync(file);
    if (!fileStats.isFile() || fileStats.size > 1048576) return null;
    let file_2 = readFileSync(file, "utf8");
    return file_2.includes("\x00") ? null : file_2;
  } catch {
    return null;
  }
}
//@ chunk-qg41pqt6.js:925794-925981 placement
function resolveSymlinkChain(file) {
  if (getPlatform() === "windows") return [file];
  let chain = [file];
  let current = file;
  for (let j = 0; j < MAX_HOST_LABEL_COUNT; j++) {
    let firstSymlink = resolveFirstSymlink(current);
    if (firstSymlink === null) return null;
    if (firstSymlink === undefined) return normalizeCaseForComparison_2([...chain, current]);
    chain.push(firstSymlink.link);
    current = firstSymlink.next;
  }
  return null;
}
//@ chunk-qg41pqt6.js:925981-926277 placement
function resolveFirstSymlink(path) {
  let filtered = path.split(sep).filter(Boolean);
  for (let j = 1; j <= filtered.length; j++) {
    let prefix = sep + filtered.slice(0, j).join(sep);
    let linkText;
    try {
      linkText = readlinkSync(prefix);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "EINVAL") continue;
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? undefined : null;
    }
    let linkTarget = resolveLinkTarget(dirname(prefix), linkText);
    return linkTarget === null
      ? null
      : {
          link: prefix,
          next: join(linkTarget, ...filtered.slice(j)),
        };
  }
  return;
}
//@ chunk-qg41pqt6.js:926277-927279 placement
/**
 * 解析清理目标的父目录：真实路径、字面物理路径与 inode（带缓存）；与本会话早先构建配置时记录的不一致或无法解析时，沿用早先记录。
 */
function resolveScrubParent(state, targetPath) {
  if (getPlatform() === "windows")
    return {
      real: null,
      literalPhysical: null,
      inode: null,
    };
  let resolveDir = (dir) => {
    let info = state.scrubParentMemo.get(dir);
    if (info === undefined) {
      try {
        let real = identity(realpathSync(dir));
        let inode = null;
        try {
          let stats = statSync(dir, {
            bigint: true,
          });
          inode = {
            dev: stats.dev,
            ino: stats.ino,
          };
        } catch {}
        info = {
          real,
          inode,
        };
      } catch {
        info = {
          real: null,
          inode: null,
        };
      }
      state.scrubParentMemo.set(dir, info);
    }
    return info;
  };
  let parentDir = dirname(targetPath);
  let { real: realPath, inode } = resolveDir(parentDir);
  let real = resolveDir(dirname(parentDir)).real;
  let literalPhysical = real === null ? null : identity(join(real, basename(parentDir)));
  let info = {
    real: realPath,
    literalPhysical: literalPhysical === realPath ? null : literalPhysical,
    inode,
  };
  if (realPath === null) {
    let previous = state.scrubParentLastKnown.get(parentDir);
    if (previous !== undefined) {
      logForDebugging(
        `[Sandbox] scrub parent ${parentDir} did not resolve at this config build; keeping the spelling recorded earlier this session`,
      );
      return resolveEntryWithoutInode(previous);
    }
  } else {
    let previous = state.scrubParentLastKnown.get(parentDir);
    if (
      previous !== undefined &&
      (previous.real !== realPath || previous.literalPhysical !== info.literalPhysical)
    ) {
      logForDebugging(
        `[Sandbox] scrub parent ${parentDir} resolves elsewhere than at an earlier config build this session; keeping the spelling recorded then`,
        {
          level: "warn",
        },
      );
      logFeatureSad("sandbox_exec", "scrub_parent_rebuild_relocated");
      return resolveEntryWithoutInode(previous);
    }
    state.scrubParentLastKnown.set(parentDir, info);
  }
  return info;
}
//@ chunk-qg41pqt6.js:927279-927359 placement
function resolveEntryWithoutInode(info) {
  return {
    real: info.real,
    literalPhysical: info.literalPhysical,
    inode: null,
  };
}
//@ chunk-qg41pqt6.js:927359-927398 placement
function isENOENTError(error) {
  return getErrnoCode(error) === "ENOENT";
}
//@ chunk-qg41pqt6.js:927398-927861 placement
/**
 * 登记需在命令后清理的裸仓库标记路径；无法确认其是否存在时警告（将来找到文件会移走而不是删除）。
 */
function registerBareRepoScrubPath(state, targetPath, removal, probeError) {
  let unlinkable = probeError === undefined || isENOENTError(probeError);
  if (!unlinkable) {
    let errnoCode = getErrnoCode(probeError);
    let reason =
      errnoCode === "EEXIST"
        ? `${targetPath} appeared while the sandbox configuration was being built`
        : `could not check whether ${targetPath} exists (${errnoCode ?? probeError})`;
    logForDebugging(
      `[Sandbox] ${reason}; if the cleanup after a sandboxed command finds a file there, it will move the file aside, not delete it`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_exec", "bare_repo_indicator_unclassified");
  }
  state.bareGitRepoScrubPaths.set(targetPath, {
    path: targetPath,
    parent: resolveScrubParent(state, targetPath),
    unlinkable,
    removal,
  });
}
//@ chunk-qg41pqt6.js:927861-927969 placement
function checkPathAbsent(path) {
  try {
    statSync(path);
    return Object.assign(Error("the path exists"), {
      code: "EEXIST",
    });
  } catch (error) {
    return error;
  }
}
//@ chunk-qg41pqt6.js:927969-927984 placement
var MAX_OWNER_MODE_RESTORE_BYTES = 2097152;
//@ chunk-qg41pqt6.js:927984-928304 placement
/**
 * 若沙箱命令改掉了目录所有者的 rwx 权限，则恢复并记录。
 */
function restoreOwnerDirMode(parentBase, label) {
  try {
    let stats = statSync(parentBase);
    if ((stats.mode & 448) !== 448 && stats.uid === process.getuid?.()) {
      chmodSync(parentBase, (stats.mode & 4095) | 448);
      logSandboxDebug(
        `${label}: restored owner rwx on a directory the sandboxed command had chmod'ed ${(stats.mode & 4095).toString(8)}`,
      );
      logSandboxOutcome("scrub_restored_owner_rwx");
    }
  } catch (error) {
    logSandboxDebug(`${label}: could not check/restore directory mode (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-qg41pqt6.js:928304-929903 placement
/**
 * 以真实目录方式打开路径（拒绝链接），用于清扫与授权检查。
 */
function openVerifiedScrubParent(dirPath, label, expectedPath, altPath, recordedInode) {
  let fd = null;
  try {
    fd = openSync(
      dirPath,
      constants.O_RDONLY |
        MAX_OWNER_MODE_RESTORE_BYTES |
        constants.O_DIRECTORY |
        (expectedPath === dirPath ? constants.O_NOFOLLOW : 0),
    );
  } catch (error) {
    let errorCode = getErrnoCode(error);
    if (errorCode !== "EACCES" || MAX_OWNER_MODE_RESTORE_BYTES !== 0) {
      logSandboxDebug(
        `${label}: cannot open ${dirPath} as a real directory (${errorCode ?? error}); refusing`,
        "error",
      );
      return {
        ok: false,
        refusedNonCanonical: errorCode === "ELOOP" || errorCode === "ENOTDIR",
      };
    }
  }
  let close = () => {
    if (fd !== null) closeSync(fd);
  };
  let procPath = `/proc/self/fd/${fd}`;
  let resolvedPath;
  let hasProcPath = false;
  let sameInode = false;
  if (recordedInode !== null)
    try {
      let stats =
        fd !== null
          ? fstatSync(fd, {
              bigint: true,
            })
          : statSync(dirPath, {
              bigint: true,
            });
      sameInode = stats.dev === recordedInode.dev && stats.ino === recordedInode.ino;
    } catch (error) {
      logSandboxDebug(
        `${label}: could not stat ${dirPath} (${getErrnoCode(error) ?? error}); treating it as not the recorded directory`,
      );
    }
  if (fd !== null && MAX_OWNER_MODE_RESTORE_BYTES !== 0)
    try {
      resolvedPath = readlinkSync(procPath);
      hasProcPath = true;
    } catch (error) {
      logSandboxDebug(
        `${label}: /proc/self/fd unavailable (${getErrnoCode(error) ?? error}); falling back to a path-based check for ${dirPath}`,
      );
    }
  if (!hasProcPath)
    try {
      resolvedPath = identity(realpathSync(dirPath));
    } catch {
      resolvedPath = undefined;
    }
  let acceptedPath =
    resolvedPath === expectedPath
      ? expectedPath
      : altPath !== undefined && resolvedPath === altPath
        ? altPath
        : undefined;
  if (acceptedPath === undefined && sameInode) {
    let hasLivePath = hasProcPath;
    if (!hasProcPath && recordedInode !== null)
      try {
        let stats = lstatSync(expectedPath, {
          bigint: true,
        });
        hasLivePath =
          stats.isDirectory() && stats.dev === recordedInode.dev && stats.ino === recordedInode.ino;
      } catch {}
    if (hasLivePath) {
      acceptedPath = expectedPath;
      logSandboxDebug(
        `${label}: ${dirPath} is spelled ${resolvedPath ?? "<unresolved>"} but is the directory recorded at the config build (same device and inode); accepting`,
      );
    }
  }
  if (acceptedPath === undefined) {
    close();
    if (resolvedPath === undefined) {
      logSandboxDebug(`${label}: cannot resolve ${dirPath} for the path-based check; refusing`, "error");
      return {
        ok: false,
        refusedNonCanonical: false,
      };
    }
    logSandboxDebug(
      `${label}: ${dirPath} resolves to ${resolvedPath}, not ${altPath === undefined ? expectedPath : `${expectedPath} or ${altPath}`} (symlinked or moved component since the config build); refusing`,
      "error",
    );
    return {
      ok: false,
      refusedNonCanonical: true,
    };
  }
  let isRecorded = acceptedPath === expectedPath && sameInode;
  if (!isRecorded)
    logSandboxDebug(
      `${label}: ${dirPath} is a real directory at an accepted spelling but not verified as the directory recorded at the config build; planted entries there are moved aside, not unlinked`,
    );
  return {
    ok: true,
    base: hasProcPath ? procPath : acceptedPath,
    recorded: isRecorded,
    close,
  };
}
//@ chunk-qg41pqt6.js:929903-929940 placement
var QUARANTINE_PREFIX = ".claude-sandbox-quarantine-";
//@ chunk-qg41pqt6.js:929940-930807 placement
/**
 * 处理命令在受保护位置放置的条目：已不存在返回 gone；非目录且允许时直接删除；否则改名移到旁边（隔离），失败多次后退化到就地处理。
 */
function quarantinePlantedEntry(
  parentDir,
  entryName,
  label,
  isRecordedParent,
  onQuarantined,
  includeDirectories = true,
) {
  let entryPath = join(parentDir, entryName);
  let isDirectory;
  try {
    isDirectory = lstatSync(entryPath).isDirectory();
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return "gone";
    throw error;
  }
  if (isDirectory && !includeDirectories) return "left";
  if (!isDirectory && isRecordedParent)
    try {
      rmSync(entryPath, {
        recursive: false,
        force: true,
      });
      return "removed";
    } catch (error) {
      let errorCode = getErrnoCode(error);
      if (errorCode !== "EISDIR" && errorCode !== "ERR_FS_EISDIR") throw error;
      if (!includeDirectories) return "left";
      isDirectory = true;
    }
  for (let j = 0; j < 4; j++) {
    let quarantineName = `${entryName}${QUARANTINE_PREFIX}${randomBytes(6).toString("hex")}`;
    try {
      renameSync(entryPath, join(parentDir, quarantineName));
      logSandboxDebug(
        `${label}: moved the planted ${entryName} aside whole as ${quarantineName} rather than deleting it \u2014 it may be a pre-existing ${isDirectory ? "directory" : "file"} the command moved here, so inspect before deleting`,
      );
      logSandboxOutcome(isDirectory ? "scrub_planted_dir_quarantined" : "scrub_planted_file_quarantined");
      onQuarantined?.(quarantineName);
      return "quarantined";
    } catch (error) {
      let renameError = getErrnoCode(error);
      if (renameError === "ENOENT") return "gone";
      if (
        renameError === "EEXIST" ||
        renameError === "ENOTEMPTY" ||
        renameError === "EISDIR" ||
        renameError === "ENOTDIR"
      )
        continue;
      logSandboxDebug(`${label}: could not move the planted ${entryName} aside (${renameError ?? error})`);
      break;
    }
  }
  return neutralizePlantedEntryInPlace(parentDir, entryName, label, isRecordedParent, includeDirectories);
}
//@ chunk-qg41pqt6.js:930807-932908 placement
/**
 * 处理一个被植入的条目：挪开、置不可用或删除，失败时记录。
 */
function neutralizePlantedEntryInPlace(
  parentDir,
  entryName,
  label,
  isRecordedParent,
  includeDirectories = true,
) {
  let entryPath = join(parentDir, entryName);
  try {
    if (!includeDirectories && lstatSync(entryPath).isDirectory()) return "left";
  } catch {}
  let report = (error, code) => {
    reportSandboxErrorUnderStandIn(error, code);
  };
  let leaveInPlace = (reason) => {
    report(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[Sandbox] ${label}: the planted ${entryName} could not be moved aside or made unreadable (${reason}); it stays in place, readable \u2014 remove it by hand`,
        "sandbox: post-command scrub left a planted entry in place",
      ),
      "plantedEntryLeftInPlace",
    );
    logSandboxOutcome("scrub_planted_entry_unmovable");
    return false;
  };
  if (getPlatform() === "windows") return leaveInPlace("rename failed; no in-place fallback on Windows");
  let parentNote = isRecordedParent
    ? ""
    : " \u2014 the parent is not the directory recorded at startup, so this may be your own entry";
  let unlinkInstead = (kind) => {
    try {
      unlinkSync(entryPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT"
        ? "gone"
        : leaveInPlace(`unlink of the ${kind} failed: ${errnoCode ?? error}`);
    }
    let message = `[Sandbox] ${label}: could not move the planted ${entryName} aside (the rename failed); unlinked the ${kind} instead${parentNote}; recreate it if so`;
    if (isRecordedParent) logForDebugging(message);
    else
      report(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          message,
          "sandbox: post-command scrub unlinked a planted entry after the move-aside failed",
        ),
        "plantedEntryUnlinked",
      );
    logSandboxOutcome("scrub_planted_entry_unlinked_after_rename_failure");
    return "removed";
  };
  let fd;
  try {
    fd = openSync(
      entryPath,
      constants.O_RDONLY | MAX_OWNER_MODE_RESTORE_BYTES | constants.O_NOFOLLOW | constants.O_NONBLOCK,
    );
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode === "ENOENT") return "gone";
    if (errnoCode === "ELOOP") return unlinkInstead("symlink");
    if (errnoCode === "ENXIO" || errnoCode === "EOPNOTSUPP") return unlinkInstead("socket");
    return leaveInPlace(`open for chmod failed: ${errnoCode ?? error}`);
  }
  try {
    let stats = fstatSync(fd);
    if (stats.isDirectory() && !includeDirectories) return "left";
    if (!stats.isFile() && !stats.isDirectory())
      return unlinkInstead(stats.isSymbolicLink() ? "symlink" : "non-regular entry");
    if (stats.isFile() && stats.nlink > 1) return unlinkInstead("hard link");
    let uid = process.getuid?.();
    if (uid === 0) return leaveInPlace("mode bits do not bind root");
    if (stats.uid !== uid) return leaveInPlace("not owned by this user; chmod would be EPERM");
    if (MAX_OWNER_MODE_RESTORE_BYTES !== 0) chmodSync(`/proc/self/fd/${fd}`, 0);
    else fchmodSync(fd, 0);
  } catch (error) {
    return leaveInPlace(`chmod failed: ${getErrnoCode(error) ?? error}`);
  } finally {
    closeSync(fd);
  }
  let message = `[Sandbox] ${label}: could not move the planted ${entryName} aside (the rename failed); set its mode to 000 in place so nothing reads it${parentNote}; chmod it back if so`;
  if (isRecordedParent)
    logForDebugging(message, {
      level: "error",
    });
  else
    report(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        message,
        "sandbox: post-command scrub set a planted entry to mode 000 in place under an unrecorded parent",
      ),
      "plantedEntryMadeUnreadable",
    );
  logSandboxOutcome("scrub_planted_entry_neutralized_in_place");
  return "neutralized";
}
//@ chunk-qg41pqt6.js:932908-933491 placement
/**
 * 收集路径解析过程中经过的所有目录（含符号链接各跳的父目录与目标），供命令结束后检查是否被替换；解析出错或超出上限时返回 null。
 */
function collectSymlinkHopDirectories(startPath, resolvedPath, excludeLeaves = false) {
  if (getPlatform() === "windows") return null;
  let dirs = new Set();
  if (resolvedPath !== null) {
    if (!excludeLeaves) dirs.add(resolvedPath);
    dirs.add(dirname(resolvedPath));
  }
  let visited = new Set();
  let stack = [startPath];
  let budget = MAX_HOST_LABEL_COUNT;
  for (let current = stack.pop(); current !== undefined; current = stack.pop()) {
    if (visited.has(current)) continue;
    if (--budget < 0) return null;
    visited.add(current);
    for (
      let component = current, parent = dirname(current);
      component !== parent;
      component = parent, parent = dirname(parent)
    ) {
      let linkTarget;
      try {
        linkTarget = readlinkSync(component);
      } catch (info) {
        let errorCode = getErrnoCode(info);
        if (errorCode !== "EINVAL" && errorCode !== "ENOENT" && errorCode !== "ENOTDIR") return null;
      }
      let parentReal;
      if (component === current || linkTarget !== undefined) {
        dirs.add(parent);
        let existingPrefix = resolveExistingPrefix(parent);
        if (existingPrefix === null) return null;
        dirs.add(existingPrefix.path);
        if (!excludeLeaves) {
          dirs.add(component);
          dirs.add(join(existingPrefix.path, basename(component)));
        }
        if (existingPrefix.exists) parentReal = existingPrefix.path;
      }
      if (linkTarget !== undefined) {
        let linkTarget_2 = resolveLinkTarget(parentReal, linkTarget);
        if (linkTarget_2 === null) return null;
        stack.push(linkTarget_2);
      }
    }
  }
  return [...dirs];
}
//@ chunk-qg41pqt6.js:933491-933694 placement
function resolveLinkTarget(baseDir, linkText) {
  let parts = linkText.split("/");
  let index = parts.findIndex((segment) => segment !== ".." && segment !== "." && segment !== "");
  let hasDotDotAfter = index !== -1 && parts.indexOf("..", index) !== -1;
  if (isAbsolute(linkText)) return parts.includes("..") ? null : resolve(linkText);
  if (hasDotDotAfter || baseDir === undefined) return null;
  return resolve(baseDir, linkText);
}
//@ chunk-qg41pqt6.js:933694-933925 placement
function followDanglingLink(path, linkText, avoidForeignMounts = false) {
  let parentReal;
  try {
    parentReal = realpathSync(dirname(path));
  } catch {
    return null;
  }
  let linkTarget = resolveLinkTarget(parentReal, linkText);
  for (let j = 0; j < 8 && linkTarget !== null; j++) {
    if (avoidForeignMounts && classifyForeignMountKind(linkTarget, parentReal) !== undefined) return null;
    let nextLinkText;
    try {
      nextLinkText = readlinkSync(linkTarget);
    } catch {
      return linkTarget;
    }
    try {
      parentReal = realpathSync(dirname(linkTarget));
    } catch {
      return null;
    }
    linkTarget = resolveLinkTarget(parentReal, nextLinkText);
  }
  return null;
}
//@ chunk-qg41pqt6.js:933925-933977 placement
function realpathOrNull(literal) {
  try {
    return realpathSync(literal);
  } catch {
    return null;
  }
}
//@ chunk-qg41pqt6.js:933977-934041 placement
function escapeBracketForGlob(glob) {
  return getPlatform() === "windows" ? glob : glob.replaceAll("[", "[[]");
}
//@ chunk-qg41pqt6.js:934041-934127 placement
/**
 * 取 realpath；目标不存在时用父目录 realpath 拼上文件名；再失败原样返回。
 */
function realpathOrParentRealpath(path) {
  try {
    return realpathSync(path);
  } catch {
    try {
      return resolve(realpathSync(dirname(path)), basename(path));
    } catch {
      return path;
    }
  }
}
//@ chunk-qg41pqt6.js:934127-935508 placement
/**
 * macOS 下为拒绝条目补上真实路径"双胞胎"：展开 ~，对非通配路径（或允许时的通配基目录）解析真实路径与父目录真实路径，生成额外条目追加到列表，并缓存到适配器状态。
 */
function addRealPathDenyTwins(denyPaths, kind, realPathMemo, allowGlobBases, globDenyBasesAllowed) {
  if (getPlatform() !== "macos" || getSandboxAdapterState().realPathTwins === "off") return denyPaths;
  let walkMemo = createWalkMemo();
  let previous = getSandboxAdapterState().realPathsOfDenies[kind];
  let resolvedByDeny = new Map();
  let reportedCodes = new Set();
  let extraPaths = [];
  let scrubLiterals =
    kind === "write" ? getSandboxAdapterState().symlinkedDenyScrubPaths.map((index) => index.literal) : [];
  for (let [index, entry] of [...denyPaths, ...scrubLiterals].entries()) {
    let escaped = kind === "read" ? entry.replaceAll("[[]", "\x00") : entry;
    let pattern = (
      escaped === "~" || escaped.startsWith("~/") ? join(homedir(), escaped.slice(1)) : escaped
    ).replaceAll("\x00", "[");
    let denyPattern = globDenyBasesAllowed ? resolveSandboxFilesystemPath_2(pattern) : pattern;
    let matches = /[*?[]/.test(escaped);
    let baseDir = matches ? getGlobBaseDirectory(denyPattern) : denyPattern;
    if ((matches && (!allowGlobBases || index >= denyPaths.length)) || !isAbsolute(baseDir)) continue;
    let suffix = denyPattern.slice(baseDir.length);
    let previousTwins = previous.get(denyPattern);
    let twins = previousTwins ?? new Set();
    let parentReal;
    let failureCode;
    try {
      let selfReal =
        index < denyPaths.length ? resolveRealPathForDeny(baseDir, realPathMemo, walkMemo) : baseDir;
      let parentResolved =
        selfReal === NOT_LOOKED_AT
          ? NOT_LOOKED_AT
          : resolveRealPathForDeny(dirname(baseDir), realPathMemo, walkMemo);
      if (selfReal !== NOT_LOOKED_AT && parentResolved !== NOT_LOOKED_AT) {
        let fallback =
          typeof selfReal === "string" || twins.size > 0 ? baseDir : resolveThroughLinks(baseDir);
        if (typeof selfReal !== "string" && fallback === undefined) failureCode = selfReal.code;
        parentReal = typeof parentResolved === "string" ? parentResolved : undefined;
        if (typeof selfReal === "string" || twins.size === 0)
          twins = new Set(
            [
              typeof selfReal === "string" ? selfReal : typeof fallback === "string" ? fallback : baseDir,
              typeof parentResolved === "string" ? join(parentResolved, basename(baseDir)) : baseDir,
            ].filter((twin) => twin !== baseDir || index >= denyPaths.length),
          );
      }
    } catch (error) {
      reportSandboxErrorUnderStandIn(error, "realPathOfDenyNotFound");
      failureCode = error instanceof Error ? error.name : "unknown";
    }
    if (failureCode !== undefined && !reportedCodes.has(failureCode)) {
      reportedCodes.add(failureCode);
      logForDebugging(`[sandbox] a ${kind} deny keeps its spelling (${failureCode})`, {
        level: "warn",
      });
    }
    let label = `${kind} deny ${pattern}`;
    let roots = [dirname(baseDir), parentReal ?? dirname(baseDir)];
    let finalTwins =
      twins === previousTwins && parentReal === undefined
        ? twins
        : new Set(
            [...twins].flatMap(
              (twin) =>
                toDenyTwinSpelling(
                  twin,
                  suffix,
                  roots,
                  label,
                  globDenyBasesAllowed && !isAbsolute(pattern),
                ) ?? [],
            ),
          );
    resolvedByDeny.set(denyPattern, finalTwins);
    if (finalTwins.size > 0) getSandboxAdapterState().realPathTwins = "listed";
    for (let finalTwin of finalTwins) extraPaths.push(finalTwin + suffix);
  }
  getSandboxAdapterState().realPathsOfDenies[kind] = resolvedByDeny;
  return extraPaths.length === 0 ? denyPaths : denyPaths.concat(extraPaths);
}
//@ chunk-qg41pqt6.js:935508-935549 placement
var GLOB_UNSAFE_CHARS_RE = /[*?[\]"\\\0-\x1f\x7f]/g;
var MAX_TWIN_SPELLING_LENGTH = 900;
//@ chunk-qg41pqt6.js:935549-936137 placement
/**
 * 把拒绝条目的真实路径改写为可用的"双胞胎"写法；会覆盖到拒绝之上、无法拼写或过长时保留原写法并警告。
 */
function toDenyTwinSpelling(twin, suffix, roots, label, devDenyAllowed) {
  let replaced = twin.replace(GLOB_UNSAFE_CHARS_RE, "?");
  let fullPattern = replaced + suffix;
  let probe = /[*?[]/.test(fullPattern)
    ? fullPattern
        .replace(/[.^$+{}()|[\]]/g, "...")
        .replace(/[*?]/g, "?????")
        .replace(/["\\\0-\x1f\x7f\ud800-\udfff]/g, "xxxxxx")
    : fullPattern;
  let sliced = replaced.slice(0, replaced.lastIndexOf(sep, replaced.indexOf("?")) + 1);
  let skipReason = roots.some((root) => join(root, sep).startsWith(join(twin, sep)))
    ? "above-the-deny"
    : devDenyAllowed && join(twin, sep).startsWith(join(sep, "dev", sep))
      ? "a-device"
      : replaced.includes("?") && !roots.some((root) => sliced.startsWith(join(root, sep)))
        ? "covered-above-the-deny"
        : /\ufffd|__GLOBSTAR/.test(twin)
          ? "unspellable"
          : Buffer.byteLength(probe) > MAX_TWIN_SPELLING_LENGTH && "too-long";
  if (skipReason) {
    logForDebugging(`[sandbox] ${label} keeps its spelling (${skipReason})`, {
      level: "warn",
    });
    return;
  }
  return replaced;
}
//@ chunk-qg41pqt6.js:936137-936182 placement
var NOT_LOOKED_AT; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:936137", () => {
  NOT_LOOKED_AT = Object.freeze({
    code: "not-looked-at",
  });
});
//@ chunk-qg41pqt6.js:936182-937124 placement
/**
 * 解析拒绝路径的真实路径（带缓存与深度限制）：主机共享路径返回特殊标记，不安全或未审核的链接返回错误码，缺失尾部时解析存在的前缀再拼回，悬空链接按链接目标继续解析。
 */
function resolveRealPathForDeny(path, memo, walkMemo, depth = 0) {
  let cached = memo.get(path);
  if (cached !== undefined) return cached;
  if (depth > MAX_HOST_LABEL_COUNT)
    return {
      code: "too-deep",
    };
  let cwd = getCwdState();
  let hostKind = classifyForeignMountKind(path, cwd);
  if (hostKind !== undefined) {
    let result =
      hostKind === "host"
        ? NOT_LOOKED_AT
        : {
            code: hostKind,
          };
    memo.set(path, result);
    return result;
  }
  let walk = rawPointerPathWalk(path, cwd, walkMemo);
  let stopKind = walk.unsafe ? (walk.stoppedAt?.kind ?? "link") : undefined;
  if (stopKind !== undefined && stopKind !== "special") {
    let result = {
      code: stopKind === "other" ? "unknown" : "not-vetted",
    };
    try {
      if (stopKind === "other") lstatSync(walk.stoppedAt?.path ?? path);
    } catch (errorCode) {
      result.code = getErrnoCode(errorCode) ?? result.code;
    }
    memo.set(path, result);
    return result;
  }
  let missingCount = walk.missingTail ?? 0;
  if (missingCount > 0) {
    let parts = path.split(sep);
    let existingPart = parts.slice(0, -missingCount).join(sep) || sep;
    let parent = resolveRealPathForDeny(existingPart, memo, walkMemo, depth + 1);
    let next = typeof parent === "string" ? join(parent, ...parts.slice(-missingCount)) : parent;
    memo.set(path, next);
    return next;
  }
  let resolved;
  try {
    resolved = realpathPlaceable(path);
  } catch (error) {
    let errnoCode = getErrnoCode(error) ?? "unknown";
    let parentPath = dirname(path);
    if (!(errnoCode === "ENOENT" || errnoCode === "ENOTDIR") || parentPath === path)
      resolved = {
        code: errnoCode,
      };
    else {
      let linkTarget;
      try {
        linkTarget = followDanglingLink(path, readlinkSync(path), true);
      } catch (parentResolved) {
        let linkError = getErrnoCode(parentResolved);
        linkTarget =
          linkError === "ENOENT" || linkError === "ENOTDIR" || linkError === "EINVAL" ? undefined : null;
      }
      if (linkTarget === undefined) {
        let realPathForDeny = resolveRealPathForDeny(parentPath, memo, walkMemo, depth + 1);
        resolved =
          typeof realPathForDeny === "string" ? join(realPathForDeny, basename(path)) : realPathForDeny;
      } else
        resolved =
          linkTarget === null || linkTarget === path
            ? {
                code: "unknown",
              }
            : resolveRealPathForDeny(linkTarget, memo, walkMemo, depth + 1);
    }
  }
  memo.set(path, resolved);
  return resolved;
}
//@ chunk-qg41pqt6.js:937124-937731 placement
/**
 * 手工逐段跟随符号链接解析路径（限跳数）；遇到主机共享路径返回特殊标记，无法解析返回 undefined。
 */
function resolveThroughLinks(baseDir) {
  let filtered = baseDir.split(sep).filter((segment) => segment !== "" && segment !== ".");
  let current = sep;
  let sawLink = false;
  for (let index = 0, linksSeen = 0; index < filtered.length;) {
    let segment = filtered[index] ?? "";
    if (segment === "..") {
      current = dirname(current);
      index++;
      continue;
    }
    let candidate = join(current, segment);
    let linkTarget;
    let errorCode;
    try {
      if (classifyForeignMountKind(candidate, getCwdState()) !== undefined) linkTarget = candidate;
      else linkTarget = readlinkSync(candidate);
    } catch (error) {
      errorCode = getErrnoCode(error) ?? "unknown";
    }
    let kind = linkTarget === undefined ? undefined : classifyForeignMountKind(linkTarget, current);
    if (kind !== undefined) return kind === "host" ? NOT_LOOKED_AT : undefined;
    if (errorCode === "ENOENT" || errorCode === "ENOTDIR")
      return sawLink ? join(candidate, ...filtered.slice(index + 1)) : undefined;
    if (errorCode !== undefined && errorCode !== "EINVAL")
      return sawLink && index === filtered.length - 1 ? candidate : undefined;
    if (linkTarget === undefined) {
      current = candidate;
      index++;
    } else if (++linksSeen > MAX_HOST_LABEL_COUNT) return;
    else {
      sawLink = true;
      let absolute = isAbsolute(linkTarget);
      filtered = [
        ...linkTarget.split(sep).filter((segment) => segment !== "" && segment !== "."),
        ...filtered.slice(index + 1),
      ];
      current = absolute ? sep : current;
      index = 0;
    }
  }
  return sawLink ? current : undefined;
}
//@ chunk-qg41pqt6.js:937731-937818 placement
function classifyForeignMountKind(path, baseDir) {
  if (!isOnForeignMount(path, baseDir)) return;
  return isMacSpecialPath(path) || isMacSpecialPath(resolve(baseDir, path)) ? "kernel-resolved" : "host";
}
//@ chunk-qg41pqt6.js:937818-937837 placement
var MAX_HOST_LABEL_COUNT = 32;
var MAX_HOST_NAME_LENGTH = 1024;
//@ chunk-qg41pqt6.js:937837-938049 placement
function resolveExistingPrefix(path) {
  let missingParts = [];
  for (let current = path; ; current = dirname(current))
    try {
      let real = realpathPlaceable(current);
      return {
        path: missingParts.length === 0 ? real : join(real, ...missingParts),
        exists: missingParts.length === 0,
      };
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if ((errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") || dirname(current) === current) return null;
      missingParts.unshift(basename(current));
    }
}
//@ chunk-qg41pqt6.js:938049-938384 placement
/**
 * 求路径的真实位置：普通文件/目录直接 realpath；特殊文件解析其父目录；指向特殊文件的链接逐跳跟随，超过上限抛 ELOOP。
 */
function realpathPlaceable(path) {
  let current = path;
  for (let j = 0; ; j++) {
    let stats = lstatSync(current);
    let followed = stats.isSymbolicLink() ? statSync(current) : stats;
    if (followed.isFile() || followed.isDirectory()) return realpathSync(current);
    let parent = dirname(current);
    if (!stats.isSymbolicLink()) return join(realpathPlaceable(parent), basename(current));
    let next =
      j < MAX_HOST_LABEL_COUNT ? resolveLinkTarget(realpathSync(parent), readlinkSync(current)) : null;
    if (next === null)
      throw Object.assign(Error("ELOOP: a link chain onto a special file cannot be placed"), {
        code: "ELOOP",
      });
    current = next;
  }
}
//@ chunk-qg41pqt6.js:938384-938399 placement
var MAX_DENY_SCAN_BYTES = 8388608;
//@ chunk-qg41pqt6.js:938399-939053 placement
/**
 * 为遮罩/禁止扫描求路径的规范形式：逐级向上找到可 realpath 的祖先再拼回缺失尾段；遇到禁区或不安全链接停止解析并返回原样；可选回填 settled/stoppedAt/throughLink 状态。
 */
function canonicalizePathForMaskSweep(path, memo, walkMemo) {
  if (memo) {
    memo.settled = false;
    memo.stoppedAt = undefined;
    memo.throughLink = false;
  }
  let missingParts = [];
  let cwdState = getCwdState();
  let current = path;
  if (isOnForeignMount(current, cwdState)) return path;
  let walk = rawPointerPathWalk(current, cwdState, walkMemo);
  if (memo) {
    memo.stoppedAt = walk.stoppedAt;
    memo.throughLink = walk.throughLink;
  }
  if (walk.unsafe) return path;
  if (walk.missingTail !== null) {
    let trimmed = path;
    for (let j = 0; j < walk.missingTail; j++) {
      let parent = dirname(trimmed);
      if (parent === trimmed) break;
      missingParts.push(basename(trimmed));
      trimmed = parent;
      if (isOnForeignMount(trimmed, cwdState)) return path;
    }
    try {
      let real = realpathSync(trimmed);
      if (memo) memo.settled = missingParts.length === 0;
      return missingParts.length === 0 ? real : join(real, ...missingParts.reverse());
    } catch {
      missingParts.length = 0;
      if (memo) memo.stoppedAt = undefined;
    }
  }
  let settled = walk.missingTail === null;
  for (;;) {
    if (!settled && (isOnForeignMount(current, cwdState) || rawPointerPathIsUnsafe(current, cwdState))) break;
    settled = false;
    try {
      current = realpathSync(current);
      break;
    } catch {
      let parent = dirname(current);
      if (parent === current) break;
      missingParts.push(basename(current));
      current = parent;
    }
  }
  return missingParts.length === 0 ? current : join(current, ...missingParts.reverse());
}
//@ chunk-qg41pqt6.js:939053-939084 placement
var UNIX_DENY_PREFIX_ROOTS = ["/etc", "/tmp", "/var"];
//@ chunk-qg41pqt6.js:939084-939299 placement
function isOsLinkedRootAlias(path, target) {
  let { osLinkedRootRealpaths } = getProcessSandboxState();
  return UNIX_DENY_PREFIX_ROOTS.some((root) => {
    if (path !== root && !path.startsWith(root + sep)) return false;
    let realRoot = osLinkedRootRealpaths.get(root);
    if (realRoot === undefined) {
      try {
        realRoot = realpathSync(root);
      } catch {
        realRoot = root;
      }
      osLinkedRootRealpaths.set(root, realRoot);
    }
    return realRoot !== root && target === realRoot + path.slice(root.length);
  });
}
//@ chunk-qg41pqt6.js:939299-939516 placement
function expandDenySymlink(path) {
  let linkText;
  try {
    linkText = readlinkSync(path);
  } catch {
    getSandboxAdapterState().denyLiteralSymlinkCandidates.push(path);
    return [path];
  }
  let target;
  try {
    target = realpathSync(path);
  } catch {
    target = followDanglingLink(path, linkText) ?? resolve(dirname(path), linkText);
    for (let j = 0; j < 8; j++) {
      let nextText;
      try {
        nextText = readlinkSync(target);
      } catch {
        break;
      }
      target = resolve(dirname(target), nextText);
    }
  }
  return [target, path];
}
//@ chunk-qg41pqt6.js:939516-940134 placement
/**
 * 逐段遍历路径，记录途中经过的所有符号链接（是否仍有效），遇到无法读取或不存在的段时返回缺失信息与落点。
 */
function traceSymlinkHops(path) {
  let links = [];
  let separatorPattern = getPlatform() === "windows" ? /[\\/]/ : "/";
  let root = parse(path).root;
  let parts = path.slice(root.length).split(sep);
  let queue = [];
  while (queue.length + parts.length > 0) {
    let segment = queue.shift() ?? parts.shift() ?? "";
    if (segment === "..") root = dirname(root);
    else if (segment !== "" && segment !== ".") {
      let candidate = join(root, segment);
      let linkTarget;
      try {
        linkTarget = readlinkSync(candidate);
      } catch (error) {
        let errorCode = getErrnoCode(error);
        if (errorCode !== "EINVAL") {
          let landing = join(candidate, ...queue, ...parts);
          return {
            links,
            missing: {
              name: candidate,
              landing,
              isUnreadable: errorCode !== "ENOENT" && errorCode !== "ENOTDIR",
            },
          };
        }
        root = candidate;
        continue;
      }
      let exists = resolveExistingPrefix(candidate)?.exists === true;
      if ((!exists && links.some((link) => link.path === candidate)) || links.length >= MAX_HOST_NAME_LENGTH)
        return {
          links,
          missing: null,
        };
      links.push({
        path: candidate,
        isLive: exists,
      });
      let { root: root_2 } = parse(linkTarget);
      root = root_2 === "" ? root : root_2;
      queue.unshift(...linkTarget.slice(root_2.length).split(separatorPattern));
    }
  }
  return {
    links,
    missing: null,
  };
}
//@ chunk-qg41pqt6.js:940134-940433 placement
function normalizeWindowsDirPath(path) {
  if (getPlatform() !== "windows") return path;
  let replaced = path.replace(/[\\/]+$/, "");
  let expanded = replaced;
  if (/^~(?:[\\/]|$)/.test(replaced))
    try {
      expanded = expandPath(replaced.replace(/^~\\/, "~/"));
    } catch {}
  let stripped = stripExtendedPathPrefix(expanded);
  if (replaced.length === 0 || /^[A-Za-z]:$/.test(stripped)) return path;
  if (/^[\\/]{2}/.test(stripped) || isWindowsDevicePath(expanded)) return replaced;
  try {
    if (!statSync(expanded).isDirectory()) return replaced;
  } catch {}
  return replaced + sep;
}
//@ chunk-qg41pqt6.js:940433-940501 placement
function normalizeDirEntryPattern(pattern, path) {
  return /[\\/]$/.test(pattern.trim()) && !containsGlobCharsWin(stripExtendedPathPrefix(path))
    ? normalizeWindowsDirPath(path)
    : path;
}
//@ chunk-qg41pqt6.js:940501-940542 placement (2.1.88 match: isInGlobalClaudeFolder, 1)
function isInGlobalClaudeFolder(filePath) {
  return resolve(filePath, ".claude", ATOMIC_WRITE_DIRNAME);
}
//@ chunk-qg41pqt6.js:940542-940710 placement (2.1.88 match: _temp8, 1)
function getAtomicWriteDirs(a_3 = true) {
  let dirs = new Set();
  dirs.add(isInGlobalClaudeFolder(getOriginalCwd()));
  if (a_3) dirs.add(isInGlobalClaudeFolder(getCwdState()));
  dirs.add(isInGlobalClaudeFolder(getProjectRoot()));
  dirs.add(resolve(getClaudeConfigDir(), ATOMIC_WRITE_DIRNAME));
  let settingsFilePathForSource = getSettingsFilePathForSource("localSettings");
  if (settingsFilePathForSource) dirs.add(join(dirname(settingsFilePathForSource), ATOMIC_WRITE_DIRNAME));
  return [...dirs];
}
//@ chunk-qg41pqt6.js:940710-940780 placement
function scrubBareGitRepoFiles(dir) {
  mkdirSync(dirname(dir), {
    recursive: true,
  });
  mkdirSync(dir, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-qg41pqt6.js:940780-940919 placement
function isParentDirReal(path) {
  try {
    closeSync(openSync(dirname(path), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW));
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "ELOOP" && errnoCode !== "ENOTDIR";
  }
}
//@ chunk-qg41pqt6.js:940919-941066 placement
/**
 * 确保桥接子进程的私有根目录存在，失败只告警。
 */
async function ensureBridgeSpawnRootDir() {
  await ensurePrivateDir().catch((error) =>
    logForDebugging(
      `ensureBridgeSpawnRootDir: could not create the bridge-spawn root: ${getErrnoCode(error) ?? "error"}`,
      {
        level: "warn",
      },
    ),
  );
}
//@ chunk-qg41pqt6.js:941066-942008 placement
/**
 * 确保原子写暂存目录存在且是真实目录（文件或坏目录会被删掉重建），并记录其 dev/ino 身份防止被替换；首次还会把 .claude/<暂存目录>/ 加进全局 gitignore。
 */
function ensureAtomicWriteStagingDirs() {
  for (let dir of getAtomicWriteDirs(!isRemoteSessionAvailable())) {
    if (!isParentDirReal(dir)) continue;
    let created = false;
    try {
      if (!lstatSync(dir).isDirectory()) {
        if (!isParentDirReal(dir)) continue;
        unlinkSync(dir);
        scrubBareGitRepoFiles(dir);
        created = true;
      } else
        try {
          closeSync(openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY));
          created = true;
        } catch {
          try {
            if (!isParentDirReal(dir)) continue;
            rmdirSync(dir);
            scrubBareGitRepoFiles(dir);
            created = true;
          } catch {}
        }
    } catch {
      try {
        if (!isParentDirReal(dir)) continue;
        scrubBareGitRepoFiles(dir);
        created = true;
      } catch (error) {
        logForDebugging(`ensureAtomicWriteStagingDirs: failed to create ${dir}: ${error}`);
        logFeatureSad("sandbox_exec", "atomic_write_staging_dir_create_failed");
      }
    }
    try {
      let fd = openSync(dir, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        let stats = fstatSync(fd);
        recordStagingDirIdentity(dir, stats.dev, stats.ino, fd);
      } catch (error) {
        closeSync(fd);
        throw error;
      }
    } catch (error) {
      if (created)
        throwStagingTampered(
          `Staging dir ${dir} was just established but identity-record open failed (${getErrnoCode(error) ?? error})`,
        );
    }
  }
  let processSandboxState = getProcessSandboxState();
  if (!processSandboxState.stagingDirGitignoreFired) {
    processSandboxState.stagingDirGitignoreFired = true;
    addFileGlobRuleToGitignore(`.claude/${ATOMIC_WRITE_DIRNAME}/`, getOriginalCwd()).then((result) => {
      if (!result.written) return;
      if (result.effective) logFeatureOk("gitignore_global_rule");
      else if (result.reason === "already_tracked") logFeatureSad("gitignore_global_rule", result.reason);
      else logFeatureBad("gitignore_global_rule", result.reason ?? "write_ineffective");
    });
  }
}
//@ chunk-qg41pqt6.js:942008-942066 placement
var TENGU_ENCHANTED_KITE = "tengu_enchanted_kite";
var TENGU_LOVELY_WHISPER = "tengu_lovely_whisper";
//@ chunk-qg41pqt6.js:942066-942288 placement
function classifyHeadEntry(path) {
  try {
    let stats = lstatSync(path);
    if (stats.isDirectory()) return "folder";
    if (!stats.isSymbolicLink()) return "file_or_special";
  } catch {
    return "absent";
  }
  try {
    return /^refs[\\/]/.test(readlinkSync(path)) ? "link_to_refs" : "other_link";
  } catch {
    return "other_link";
  }
}
//@ chunk-qg41pqt6.js:942288-942515 placement
function classifyHeadState(path) {
  let entryKind = classifyHeadEntry(path);
  switch (entryKind) {
    case "file_or_special":
      return "head";
    case "folder":
    case "absent":
      return entryKind;
    case "link_to_refs":
    case "other_link":
      try {
        statSync(path);
        return "head";
      } catch {
        return entryKind === "link_to_refs" ? "dangling_head" : "absent";
      }
  }
}
//@ chunk-qg41pqt6.js:942515-942617 placement
function isHeadPresent(state) {
  switch (state) {
    case "head":
    case "dangling_head":
      return true;
    case "folder":
    case "absent":
      return false;
  }
}
//@ chunk-qg41pqt6.js:942617-942746 placement
function isFileOrRefsLink(entryKind) {
  switch (entryKind) {
    case "file_or_special":
    case "link_to_refs":
      return true;
    case "folder":
    case "other_link":
    case "absent":
      return false;
  }
}
//@ chunk-qg41pqt6.js:942746-996015 placement
/**
 * 把合并设置转成 sandbox-runtime 配置 {network:{allowedDomains,deniedDomains,unix socket/本地绑定/代理端口,tlsTerminate}, filesystem:{denyRead,allowRead,allowWrite,denyWrite,disabled?}, ignoreViolations, credentials, enableWeakerNestedSandbox, allowNestedUserNamespaces, enableWeakerNetworkIsolation, allowAppleEvents, git.safeDirectories, ripgrep, seccomp, bwrapPath, socatPath, windows?}。允许域名来自 sandbox.network.allowedDomains 与 WebFetch(domain:…) allow 规则（管理员强制/strictAllowlist 时只认可信层，allowManagedDomainsOnly 时只认托管层）；读禁止来自 Read(...) deny 规则、sandbox.filesystem.denyRead、credentials.files；写允许含 cwd、额外工作目录、Edit(...) allow 规则、临时目录，写禁止含 settings 文件、.claude 下 skills/agents/commands/hooks、.git/hooks 与 config、.mcp.json 等；relaxed 文件系统策略下置 disabled。构建失败抛 SandboxPathEntryError。
 */
function convertToSandboxRuntimeConfig(settings) {
  let adapterState = getSandboxAdapterState();
  adapterState.scrubParentMemo.clear();
  let permissionsSettings = settings.permissions || {};
  let managedSources = getAllPolicyTierSettings();
  let evalConfinedEnv = env.CLAUDE_CODE_EVAL_CONFINED;
  let isTierUsable = (source) =>
    !evalConfinedEnv || (source === "userSettings" && isSettingSourceEnabled("userSettings"));
  let managedDomainsOnly = managedSources.some(
    (managedSource) => managedSource.sandbox?.network?.allowManagedDomainsOnly === true,
  );
  let managedReadPathsOnly = managedSources.some(
    (managedSource) => managedSource.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
  );
  let adminMandate = isAdminSandboxMandate();
  let strictAllowlist = isStrictNetworkAllowlistConfigured();
  let restrictWidening = adminMandate || strictAllowlist;
  let hasTrustedDenies = adminMandate || hasTrustedReadDenies();
  let trustedDenyRoots = hasTrustedDenies ? getTrustedReadDenyRoots() : undefined;
  let resolvedRoots;
  let resolution;
  let getDenyRoots = () => {
    if (resolvedRoots === undefined)
      if (trustedDenyRoots) {
        let trustedReadDenyRoots = resolveTrustedReadDenyRoots(trustedDenyRoots);
        resolvedRoots = trustedReadDenyRoots.roots;
        resolution = trustedReadDenyRoots.resolution;
      } else resolvedRoots = getBuiltinTrustedDenyRoots();
    return resolvedRoots;
  };
  let allowedDomains = [];
  let deniedDomains = [];
  if (managedDomainsOnly && evalConfinedEnv);
  else if (evalConfinedEnv) {
    if (isSettingSourceEnabled("userSettings"))
      for (let domain of getSettingsForSource("userSettings")?.sandbox?.network?.allowedDomains ?? [])
        allowedDomains.push(domain);
  } else if (managedDomainsOnly)
    for (let managedSource of managedSources) {
      for (let domain of managedSource.sandbox?.network?.allowedDomains || []) allowedDomains.push(domain);
      for (let allowRule of managedSource.permissions?.allow || []) {
        let ruleForSandbox = parseRuleForSandbox(allowRule);
        if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
          allowedDomains.push(ruleForSandbox.ruleContent.substring(7));
      }
    }
  else {
    for (let domain of restrictWidening
      ? collectFromSandboxSettings((settings) => settings.network?.allowedDomains)
      : settings.sandbox?.network?.allowedDomains || [])
      allowedDomains.push(domain);
    for (let allowRule of restrictWidening ? collectAllowRules() : permissionsSettings.allow || []) {
      let ruleForSandbox = parseRuleForSandbox(allowRule);
      if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
        allowedDomains.push(ruleForSandbox.ruleContent.substring(7));
    }
    if (restrictWidening && !adapterState.droppedRepoAllowedDomainsLogged) {
      adapterState.droppedRepoAllowedDomainsLogged = true;
      let reduced = ["projectSettings", "localSettings"]
        .map((sourceName) => (isSettingSourceEnabled(sourceName) ? getSettingsForSource(sourceName) : null))
        .reduce(
          (acc, settings) =>
            acc +
            (settings?.sandbox?.network?.allowedDomains?.length ?? 0) +
            countWhere(settings?.permissions?.allow ?? [], (allowRule) => {
              let ruleForSandbox = parseRuleForSandbox(allowRule);
              return (
                ruleForSandbox.toolName === WEBFETCH &&
                ruleForSandbox.ruleContent?.startsWith("domain:") === true
              );
            }),
          0,
        );
      if (reduced > 0)
        logForDebugging(
          `[sandbox] ${adminMandate ? "admin sandbox mandate" : "network.strictAllowlist"}: ignoring ${reduced} sandbox.network.allowedDomains / WebFetch(domain:\u2026) allow entries from project/local settings`,
        );
    }
    for (let sessionAllowedHost of adapterState.sessionAllowedHosts) allowedDomains.push(sessionAllowedHost);
  }
  for (let domain of settings.sandbox?.network?.deniedDomains || []) deniedDomains.push(domain);
  for (let denyRule of permissionsSettings.deny || []) {
    let ruleForSandbox = parseRuleForSandbox(denyRule);
    if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
      deniedDomains.push(ruleForSandbox.ruleContent.substring(7));
  }
  let reasons = {};
  let gbRules;
  for (let index = deniedDomains.length - 1; index >= 0; index--) {
    let domain = deniedDomains[index];
    if (domain === undefined) continue;
    let expanded = addTrailingDotFreeVariants(expandBareIpv6Hosts([domain]));
    if (expanded.length === 1 && expanded[0] === domain) continue;
    deniedDomains.splice(index, 1, ...expanded);
    let reason = reasons[domain];
    if (reason !== undefined) {
      delete reasons[domain];
      for (let spelling of expanded) reasons[spelling] = reason;
    }
  }
  allowedDomains.splice(0, allowedDomains.length, ...normalizeIpv6HostEntries(allowedDomains));
  let allowWrite = evalConfinedEnv ? [getClaudeTempDirRealpath()] : [".", getClaudeTempDirRealpath()];
  let childProcessTmpDirRealpath = getChildProcessTmpDirRealpath();
  if (childProcessTmpDirRealpath !== getClaudeTempDirRealpath()) allowWrite.push(childProcessTmpDirRealpath);
  let extraAllowWrite = [...allowWrite];
  let denyPaths = [];
  let addDeny = (path, useStrictResolve, normalizeWindows = false) => {
    let spellings = useStrictResolve ? [resolveDenySymlink(path)] : expandDenySymlink(path);
    denyPaths.push(...(normalizeWindows ? spellings.map(normalizeWindowsDirPath) : spellings));
  };
  let denyPaths_2 = [];
  let denyRead = [];
  adapterState.symlinkedDenyScrubPaths.length = 0;
  adapterState.denyLiteralSymlinkCandidates.length = 0;
  let filtered = SETTING_SOURCES.map((sourceName) => getSettingsFilePathForSource(sourceName)).filter(
    (filePath) => filePath !== undefined,
  );
  let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
  if (legacyLocalSettingsFilePath) filtered.push(legacyLocalSettingsFilePath);
  filtered.push(...getFlagAgentsFilePaths());
  filtered.push(...getFlagMcpConfigFilePaths());
  denyPaths.push(...filtered.map(resolveDenySymlink));
  denyPaths.push(normalizeWindowsDirPath(getDropInDir()));
  if (getPlatform() === "wsl") {
    denyPaths.push(join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"));
    denyPaths.push(join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d"));
  }
  let dir = getCwdState();
  let dir_2 = getOriginalCwd();
  let allowExtraPlaces = !isRemoteSessionAvailable();
  if (!allowExtraPlaces) getSandboxAdapterState().builtAsThinClient = true;
  if (dir !== dir_2) {
    denyPaths.push(resolveDenySymlink(resolve(dir, ".claude", "settings.json")));
    denyPaths.push(resolveDenySymlink(resolve(dir, ".claude", "settings.local.json")));
  }
  addDeny(resolve(dir_2, ".claude", "skills"), true, true);
  if (dir !== dir_2) addDeny(resolve(dir, ".claude", "skills"), true, true);
  addDeny(resolve(dir_2, ".claude", "hooks"), true, true);
  if (dir !== dir_2) addDeny(resolve(dir, ".claude", "hooks"), true, true);
  denyPaths.push(normalizeWindowsDirPath(resolve(getClaudeConfigDir(), "local")));
  denyPaths.push(...getAtomicWriteDirs().map(normalizeWindowsDirPath));
  addDeny(resolve(getClaudeConfigDir(), "jobs"), true, true);
  let seedAdminDir = resolve(getClaudeConfigDir(), "seed-admin");
  try {
    mkdirSync(seedAdminDir, {
      recursive: true,
      mode: 448,
    });
  } catch {}
  addDeny(seedAdminDir, false, true);
  denyPaths_2.push(normalizeWindowsDirPath(escapeBracketForGlob(realpathOrParentRealpath(seedAdminDir))));
  addDeny(resolve(getClaudeConfigDir(), "daemon"), true, true);
  addDeny(bridgeSpawnDir(), true, true);
  denyPaths_2.push(normalizeWindowsDirPath(realpathOrParentRealpath(bridgeSpawnDir())));
  let bashEditDiffDir = getBashEditDiffDir();
  try {
    mkdirSync(bashEditDiffDir, {
      recursive: true,
      mode: 448,
    });
  } catch {}
  addDeny(bashEditDiffDir, false, true);
  denyPaths_2.push(normalizeWindowsDirPath(bashEditDiffDir));
  let policyLimitFiles = [
    signatureFileFor("policy-limits.json"),
    signatureIatFileFor("policy-limits.json"),
    stampPathFor("policy-limits.json"),
  ];
  let fileNames = new Set([
    "scheduled_tasks.json",
    "launch.json",
    "CLAUDE.md",
    "daemon.json",
    "policy-limits.json",
    ...policyLimitFiles,
  ]);
  for (let name of [
    "shell-snapshots",
    "session-env",
    "plugins",
    "hooks",
    "skills",
    "workflows",
    "commands",
    "agents",
    "routines",
    "rules",
    "output-styles",
    "scheduled_tasks.json",
    "launch.json",
    "CLAUDE.md",
    "projects",
    "daemon.json",
    "policy-limits.json",
    ...policyLimitFiles,
    "backups",
  ]) {
    let denySymlink = resolveDenySymlink(resolve(getClaudeConfigDir(), name));
    denyPaths.push(fileNames.has(name) ? denySymlink : normalizeWindowsDirPath(denySymlink));
  }
  addDeny(resolve(getClaudeConfigDir(), "loop.md"), false);
  let coworkPluginsDir = resolve(getClaudeConfigDir(), "cowork_plugins");
  addDeny(coworkPluginsDir, false, true);
  let devModsDirPath = resolve(devModsDir());
  let configDir = resolve(getClaudeConfigDir());
  let existingPrefix = resolveExistingPrefix(configDir);
  let configDirReal = existingPrefix?.path ?? realpathOrParentRealpath(configDir);
  let devModsRoot = join(configDirReal, basename(devModsDirPath));
  let record = adapterState.devModsRoots.get(configDir);
  if (record === undefined) {
    record = {
      made: null,
      denied: new Set(),
    };
    adapterState.devModsRoots.set(configDir, record);
  }
  if (
    (record.made === null || record.made === devModsRoot) &&
    ensurePrivateDirChain(configDirReal, devModsRoot, PERSON_ROOT_OPTIONS)
  )
    record.made = devModsRoot;
  else if (record.made === null && existingPrefix?.exists === true)
    logForDebugging(
      `[sandbox] the dev-mods root is not a plain directory under the config home; denied as it stands: ${devModsDirPath}`,
      {
        level: "warn",
      },
    );
  record.denied.add(devModsRoot);
  let hops = traceSymlinkHops(devModsDirPath);
  let filtered_2 = hops.links.filter((link) => !link.isLive);
  for (let path of normalizeCaseForComparison_2([
    ...record.denied,
    devModsDirPath,
    ...filtered_2.map((link) => link.path),
    ...(hops.missing === null ? [] : [hops.missing.name, hops.missing.landing]),
  ]))
    addDeny(path, false, true);
  let taskOutputDir = peekTaskOutputDir();
  if (ensurePrivateDirChain(getClaudeTempDirRealpath(), taskOutputDir)) {
    addDeny(taskOutputDir, false, true);
    taskOutputDirChainRoot = taskOutputDir;
  } else {
    taskOutputDirChainRoot = undefined;
    logForDebugging(
      `[sandbox] task output dir chain is not plain directories; read-only deny skipped: ${taskOutputDir}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_exec", "task_output_deny_skipped");
  }
  let denyPluginToolStaging = isPluginToolStagingDenyEnabled();
  mcpCallTempRoot = undefined;
  if (denyPluginToolStaging && getPlatform() !== "windows") {
    mcpCallTempRoot = resolve(getClaudeTempDirRealpath(), PLUGIN_TOOL_STAGING_DIRNAME);
    if (!verifyStagedMcpCallDir()) {
      logForDebugging(
        `[sandbox] staged mcp_call directory is not a plain directory under the temp root; sandboxed commands may still be able to write there: ${mcpCallTempRoot}`,
        {
          level: "warn",
        },
      );
      logFeatureSad("sandbox_exec", "plugin_tool_staging_dir_not_plain");
    }
    addDeny(mcpCallTempRoot, false, true);
  }
  let projectPlugins = projectPluginsDir();
  if (
    projectPlugins !== resolve(getClaudeConfigDir(), "plugins") &&
    projectPlugins !== coworkPluginsDir &&
    !isWithinOriginalCwd(projectPlugins)
  )
    addDeny(projectPlugins, false, true);
  for (let seedDir of getPluginSeedDirs()) {
    let resolvedSeedDir = resolve(getOriginalCwd(), seedDir);
    if (!isWithinOriginalCwd(resolvedSeedDir)) addDeny(resolvedSeedDir, false, true);
  }
  for (let producerDir of updateDeniedProducerDirs(pluginRootDirs()))
    if (isAbsolute(producerDir) && !isWithinOriginalCwd(resolve(producerDir)))
      addDeny(resolve(producerDir), false, true);
  for (let commandDir of commandProducerDirs())
    if (!isWithinOriginalCwd(commandDir)) addDeny(commandDir, false, true);
  let helperPath = helperConfigPath();
  let helperPaths = new Set(
    [
      ...(isAdminPolicyOrigin(getBasePolicySettingsOrigin())
        ? policyHelperPaths(getBasePolicySettings())
        : []),
      ...(helperPath === null ? [] : [helperPath]),
      ...retiredHelperPaths(),
    ]
      .filter((path) => !isWindowsDevicePath(path) && !isNetworkOrMacSpecialPath(path))
      .map((path) => resolve(path)),
  );
  for (let path of helperPaths) {
    if (isWithinOriginalCwd(path)) continue;
    if (getPlatform() === "windows")
      try {
        lstatSync(path);
      } catch (error) {
        if (isFsInaccessible(error)) continue;
      }
    addDeny(path, false);
  }
  for (let name of ["mcp-skill-archives", "mcp-discovery-cache", "shares"])
    addDeny(resolve(getClaudeConfigDir(), name), false, true);
  for (let category of HOST_FUNCTION_CATEGORIES)
    addDeny(resolve(getClaudeConfigDir(), category), false, true);
  for (let name of ["remote-settings-helper-consent", "remote-settings-consent.json"])
    addDeny(resolve(getClaudeConfigDir(), name), false);
  let mockRemoteSettingsFixturePath = getMockRemoteSettingsFixturePath();
  let fixturePath =
    mockRemoteSettingsFixturePath !== undefined ? resolve(mockRemoteSettingsFixturePath) : undefined;
  for (let path of new Set([
    resolve(getClaudeConfigDir(), "remote-settings.json"),
    resolve(getSettingsPath()),
    ...(fixturePath !== undefined ? [fixturePath] : []),
  ])) {
    let isCharDevice = false;
    let isLinkToCharDevice = false;
    try {
      let stats = lstatSync(path);
      isCharDevice = stats.isCharacterDevice();
      isLinkToCharDevice = stats.isSymbolicLink() && statSync(path).isCharacterDevice();
    } catch {}
    if (isLinkToCharDevice) denyPaths.push(path);
    else if (!isCharDevice) addDeny(path, false);
    if (path !== fixturePath) {
      addDeny(signatureFileFor(path), false);
      addDeny(signatureIatFileFor(path), false);
      addDeny(syncStampPath(path), false);
    }
  }
  addDeny(resolve(getClaudeConfigDir(), "state"), false, true);
  let stateDir = resolve(homedir(), ".claude", "state");
  if (stateDir !== resolve(getClaudeConfigDir(), "state")) addDeny(stateDir, false, true);
  let denySshStore = isSshStoreWriteDenyEnabled();
  if (denySshStore) {
    let sshDir = resolve(homedir(), SHADOWED_SSH_DIR);
    if (getPlatform() !== "windows")
      try {
        mkdirSync(sshDir, {
          recursive: true,
          mode: 448,
        });
      } catch {}
    addDeny(sshDir, false, true);
  }
  for (let stateFile of claudeStateFilePaths()) denyPaths.push(resolveDenySymlink(resolve(stateFile)));
  let wifProfileStoreDenyPaths = getWIFProfileStoreDenyPaths();
  if (wifProfileStoreDenyPaths !== null) {
    for (let dir of wifProfileStoreDenyPaths.dirs) {
      try {
        mkdirSync(dir, {
          recursive: true,
          mode: 448,
        });
      } catch {}
      addDeny(dir, false, true);
    }
    for (let file of wifProfileStoreDenyPaths.files) addDeny(file, false);
  }
  if (env.CLAUDE_CODE_HOST_CREDS_FILE)
    denyPaths.push(
      normalizeDirEntryPattern(
        env.CLAUDE_CODE_HOST_CREDS_FILE,
        normalizeDirectoryPattern(
          resolveDenySymlink(normalizeDirectoryPattern(env.CLAUDE_CODE_HOST_CREDS_FILE)),
        ),
      ),
    );
  {
    let seen = new Set();
    for (let lockfile of getIdeLockfilesPaths()) {
      let resolved = resolve(lockfile);
      try {
        resolved = realpathSync(resolved);
      } catch {}
      if (seen.has(resolved)) continue;
      seen.add(resolved);
      denyPaths_2.push(normalizeWindowsDirPath(resolved));
      denyPaths.push(normalizeWindowsDirPath(resolved));
    }
  }
  let denyProjectFiles = (dir, useStrictResolve = true) => {
    addDeny(resolve(dir, ".claude", "launch.json"), useStrictResolve);
    addDeny(resolve(dir, ".claude", "workflows"), useStrictResolve, true);
    addDeny(resolve(dir, ".claude", "routines"), useStrictResolve, true);
    addDeny(resolve(dir, ".claude", "output-styles"), false, true);
    addDeny(resolve(dir, ".claude", "scheduled_tasks.json"), useStrictResolve);
    addDeny(resolve(dir, ".claude", "loop.md"), false);
    addDeny(resolve(dir, ".mcp.json"), false);
  };
  denyProjectFiles(dir_2);
  {
    let home = resolve(homedir());
    let homeReal = nativeRealpathLong(home) ?? home;
    let homeTarget = homeReal;
    let homeIsPlain =
      normalizePathForCompare(homeReal) === normalizePathForCompare(home) &&
      normalizePathForCompare(homeTarget) === normalizePathForCompare(resolve(homedir()).normalize("NFC"));
    let denyDirFiles = (dir) => {
      denyProjectFiles(dir, false);
      addDeny(resolve(dir, ".claude", "skills"), false, true);
      addDeny(resolve(dir, ".claude", "commands"), false, true);
      addDeny(resolve(dir, ".claude", "agents"), false, true);
      addDeny(resolve(dir, ".claude", "hooks"), false, true);
      addDeny(resolve(dir, ".claude", "settings.json"), false);
      addDeny(resolve(dir, ".claude", "settings.local.json"), false);
    };
    let roots = new Set([getProjectRoot(), dir_2, dir]);
    let projectConfigRoot = getProjectConfigRoot();
    if (projectConfigRoot !== null) roots.add(projectConfigRoot);
    for (let root of roots) {
      let current = root;
      for (;;) {
        denyDirFiles(current);
        if (homeIsPlain && normalizePathForCompare(current) === normalizePathForCompare(homeTarget)) break;
        let parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
    }
    let denyMcpJsonUpwards = (start) => {
      let current = start;
      for (;;) {
        addDeny(resolve(current, ".mcp.json"), false);
        let parent = dirname(current);
        if (parent === current) break;
        current = parent;
      }
    };
    for (let root of roots) denyMcpJsonUpwards(root);
    denyDirFiles(homeTarget);
    denyMcpJsonUpwards(homeTarget);
    for (let root of roots) {
      let gitRoot = findGitRoot(root);
      let dir = findCanonicalGitRoot(root);
      if (gitRoot && dir && dir !== gitRoot) denyDirFiles(dir);
    }
  }
  if (dir !== dir_2) {
    let originalWithSep = dir_2.endsWith(sep) ? dir_2 : dir_2 + sep;
    let current = dir;
    while (current !== dir_2) {
      denyProjectFiles(current);
      let parent = dirname(current);
      if (parent === current || !(parent + sep).startsWith(originalWithSep)) break;
      current = parent;
    }
  }
  denyPaths.push(resolve(dir_2, ".mcp.json"));
  if (dir !== dir_2) {
    let originalWithSep = dir_2.endsWith(sep) ? dir_2 : dir_2 + sep;
    let current = dir;
    while (current !== dir_2) {
      denyPaths.push(resolve(current, ".mcp.json"));
      let parent = dirname(current);
      if (parent === current || !(parent + sep).startsWith(originalWithSep)) break;
      current = parent;
    }
  }
  let worktreeGitCommonDir = detectWorktreeGitCommonDir(dir_2);
  let gitDirs = [join(findGitRoot(dir_2) ?? dir_2, ".git"), worktreeGitCommonDir];
  adapterState.bareGitRepoScrubPaths.clear();
  let vouchedLocally = allowExtraPlaces ? null : new Set();
  adapterState.bareGitRepoScrubPathsVouchedLocally = vouchedLocally;
  let registerScrub = (path, vouched, removal, probeError) => {
    registerBareRepoScrubPath(adapterState, path, removal, probeError);
    if (!vouched) vouchedLocally?.add(path);
  };
  let registerScrubWithRemoval = (path, vouched, removal, probeError) =>
    registerScrub(path, vouched, removal, probeError);
  let cwd = process.cwd();
  let trailingGlobRe = /(?:\/\*\*|\/)+$/;
  let expandAdditionalDir = (dir) => {
    try {
      return [expandPath(dir, cwd).replace(trailingGlobRe, "") || sep];
    } catch (error) {
      warnDroppedPathEntry(error, "additionalDirectories");
      return [];
    }
  };
  let additionalDirectories = new Set(
    [
      ...(evalConfinedEnv ? [] : settings.permissions?.additionalDirectories || []),
      ...getAdditionalDirectoriesForClaudeMd(),
    ].flatMap(expandAdditionalDir),
  );
  let gitObjectsNames = ["objects", "refs"];
  let gitConfigNames = ["hooks", "config"];
  let isMac = getPlatform() === "macos";
  let denyUnlistableWorktrees_2 = denyUnlistableWorktrees();
  let denyRemoteDirs = denyLegacyRemoteDirs();
  let isWindows = getPlatform() === "windows";
  let isLinux = getPlatform() === "linux" || getPlatform() === "wsl";
  let scanLinux =
    isLinux &&
    readFlagWithOverride(TENGU_ENCHANTED_KITE, {
      safe: true,
    });
  let scanWindows =
    getPlatform() === "windows" &&
    readFlagWithOverride(TENGU_LOVELY_WHISPER, {
      safe: true,
    });
  let deferredFiles = [];
  let createFileDeferred = (...parts) => {
    if (!isLinux) return;
    if (isRemoteSessionAvailable()) {
      deferredFiles.push(parts);
      return;
    }
    createFileAtChain(...parts);
  };
  let deferredDirs = [];
  let makeDirLater = (path) => {
    if (isRemoteSessionAvailable()) {
      deferredDirs.push(path);
      return;
    }
    makeDir(path);
  };
  let makeDir = (path) => {
    try {
      if (!lstatSync(dirname(path)).isDirectory()) return;
      mkdirSync(path);
    } catch {}
  };
  let pinGitInfoDirs_2 = pinGitInfoDirs();
  let deferredGitDirs = [];
  let seenGitDirs = new Set();
  let denyGitDir = (gitDir, vouched) => {
    if (seenGitDirs.has(gitDir)) return;
    seenGitDirs.add(gitDir);
    let unlinkable = vouched && !gitDirs.includes(gitDir);
    let denyOrScrubFile = (path) => {
      if (isWindows && path.endsWith(".lock")) {
        registerScrub(path, unlinkable, "all");
        return;
      }
      try {
        statSync(path);
        denyPaths.push(resolveDenySymlink(path));
      } catch (error) {
        registerScrub(path, unlinkable, "all", error);
        if (isMac) denyPaths.push(path);
      }
    };
    addDeny(join(gitDir, "hooks"), true, true);
    denyPaths.push(resolveDenySymlink(join(gitDir, "config")));
    if (isWindows) registerScrub(join(gitDir, "config.lock"), unlinkable, "all");
    else denyPaths.push(resolveDenySymlink(join(gitDir, "config.lock")));
    let worktreeConfig = join(gitDir, "config.worktree");
    createFileDeferred(gitDir, "config.worktree");
    denyPaths.push(resolveDenySymlink(worktreeConfig));
    denyOrScrubFile(join(gitDir, "config.worktree.lock"));
    if (denyRemoteDirs) {
      let remoteMissing = false;
      for (let name of ["remotes", "branches"]) {
        if (isRemoteSessionAvailable()) deferredGitDirs.push([gitDir, name]);
        else if (gitPathExists(gitDir, name)) remoteMissing = true;
        addDeny(join(gitDir, name), true, true);
      }
      if (remoteMissing && getPlatform() === "macos") addDeny(gitDir, false, true);
    }
    denyOrScrubFile(join(gitDir, "commondir"));
    if (pinGitInfoDirs_2 && getPlatform() !== "windows") {
      let newGitDir = !repoDirs.has(gitDir);
      let objectsDir = join(gitDir, "objects");
      let infoDir = join(objectsDir, "info");
      for (let [target, ancestors] of [
        [join(gitDir, "info"), [gitDir]],
        [infoDir, [gitDir, objectsDir]],
        [join(infoDir, "commit-graphs"), [gitDir, objectsDir, infoDir]],
      ]) {
        let blockReason;
        let probeError;
        for (let dirPath of [...ancestors, target]) {
          let stats;
          try {
            stats = lstatSync(dirPath);
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (dirPath === target && errnoCode === "ENOENT") {
              if (newGitDir) makeDirLater(target);
            } else if (errnoCode === "ENOENT" && deferredDirs.includes(dirPath)) continue;
            else if (errnoCode === "ENOENT") blockReason = `${dirPath} is missing`;
            else if (errnoCode === "ENOTDIR")
              blockReason = `${dirPath} has a file where a directory should be on its path`;
            else probeError = `${dirPath} (${errnoCode ?? String(error)})`;
            break;
          }
          if (!stats.isDirectory()) {
            blockReason = stats.isSymbolicLink()
              ? `${dirPath} is a symbolic link, not a directory of its own`
              : `${dirPath} is not a directory`;
            break;
          }
        }
        if (blockReason !== undefined) {
          logForDebugging(
            `[Sandbox] Not pinning ${target} against replacement in the sandbox: ${blockReason}`,
          );
          continue;
        }
        let sentinelPath = join(target, SANDBOX_NOREPLACE_SENTINEL);
        if (probeError !== undefined) {
          logForDebugging(
            `[Sandbox] Could not examine ${probeError}, so nothing was created under it and all of ${target} is read-only in the sandbox; make it readable again outside the sandbox and the next sandbox configuration refresh restores writes there`,
          );
          denyPaths.push(target, sentinelPath);
          continue;
        }
        if (isLinux && newGitDir) makeDirLater(sentinelPath);
        let sentinelProblem;
        try {
          let sentinelStats = lstatSync(sentinelPath);
          if (!sentinelStats.isDirectory() && !sentinelStats.isFile())
            sentinelProblem = `is ${sentinelStats.isSymbolicLink() ? "a symbolic link" : "neither a directory nor a plain file"}, at a name Claude Code reserves for an empty directory of its own, so all of ${target} is read-only in the sandbox to keep it from being replaced; remove that entry outside the sandbox and the next sandbox configuration refresh allows sandboxed writes in ${target} again`;
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode !== "ENOENT")
            sentinelProblem = `cannot be examined (${errnoCode ?? String(error)}), so all of ${target} is read-only in the sandbox to keep it from being replaced; make ${target} readable again outside the sandbox to allow sandboxed writes in it`;
        }
        if (sentinelProblem !== undefined) {
          logForDebugging(`[Sandbox] ${sentinelPath} ${sentinelProblem}`, {
            level: "warn",
          });
          denyPaths.push(target);
          continue;
        }
        denyPaths.push(sentinelPath);
      }
    }
    let infoDirsScannable =
      (scanLinux || scanWindows) &&
      scanDirectory(gitDir) &&
      scanDirectory(join(gitDir, "objects")) &&
      scanDirectory(join(gitDir, "objects", "info"));
    for (let name of ["alternates", "http-alternates"]) {
      let alternatesPath = join(gitDir, "objects", "info", name);
      if (name === "alternates" && infoDirsScannable) {
        createFileDeferred(gitDir, "objects", "info", name);
        denyPaths.push(...expandDenySymlink(alternatesPath));
        continue;
      }
      try {
        lstatSync(alternatesPath);
        denyPaths.push(...expandDenySymlink(alternatesPath));
      } catch (error) {
        if (isMac || getErrnoCode(error) !== "ENOENT") denyPaths.push(...expandDenySymlink(alternatesPath));
      }
    }
    let worktreesDir = join(gitDir, "worktrees");
    try {
      for (let dirent of readdirSync(worktreesDir, {
        withFileTypes: true,
      })) {
        if (!dirent.isDirectory() && !dirent.isSymbolicLink()) continue;
        let worktreeConfig = join(worktreesDir, dirent.name, "config.worktree");
        createFileDeferred(gitDir, "worktrees", dirent.name, "config.worktree");
        denyPaths.push(resolveDenySymlink(worktreeConfig));
        denyOrScrubFile(join(worktreesDir, dirent.name, "config.worktree.lock"));
        denyPaths.push(resolveDenySymlink(join(worktreesDir, dirent.name, "commondir")));
      }
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let missingOk =
        errnoCode === "ENOENT" ||
        errnoCode === "ENOTDIR" ||
        errnoCode === "ELOOP" ||
        errnoCode === "ENAMETOOLONG";
      let shouldDenyDir = !missingOk && denyUnlistableWorktrees_2 && getPlatform() !== "windows";
      if (shouldDenyDir) addDeny(worktreesDir, false, true);
      if (errnoCode === "ELOOP" || errnoCode === "ENAMETOOLONG")
        logForDebugging(
          `[Sandbox] cannot list ${worktreesDir} (${errnoCode}: a link loop or a path too long); treated as no folder, so there are no linked worktrees under it to protect. If it is a link you did not create, remove it.`,
          {
            level: "warn",
          },
        );
      else if (!missingOk)
        logForDebugging(
          `[Sandbox] cannot list ${worktreesDir} (${errnoCode ?? errorMessage(error)}); ${shouldDenyDir ? "sandboxed commands cannot write under it until it can be listed again and the sandbox config is rebuilt (restarting Claude Code does this)" : `not write-denying it ${getPlatform() === "windows" ? "on Windows, where the deny would stay in the folder's permissions after the listing works again" : "because this protection is switched off"}. Until it can be listed again and the sandbox config is rebuilt (restarting Claude Code does this), sandboxed commands can change its linked worktrees' commondir and config.worktree files`}.`,
          {
            level: "warn",
          },
        );
    }
  };
  let noopVisitor = (dir) => {};
  let repoDirs = new Set([dir_2, dir]);
  for (let dir_3 of [dir_2, ...additionalDirectories]) {
    let dirWithSep = dir_3.endsWith(sep) ? dir_3 : dir_3 + sep;
    if ((dir + sep).startsWith(dirWithSep)) {
      let current = dir;
      for (;;) {
        repoDirs.add(current);
        if (current === dir_3) break;
        let parent = dirname(current);
        if (parent === current || !(parent + sep).startsWith(dirWithSep)) break;
        current = parent;
      }
    }
  }
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mighty_thimble", true);
  let denyGitPath = (path, vouched) => {
    let stats;
    try {
      stats = lstatSync(path);
    } catch (error) {
      return {
        present: false,
        probe: error,
      };
    }
    if (stats.isFile()) denyPaths.push(path);
    else if (stats.isDirectory()) denyGitDir(path, vouched);
    else
      try {
        if (statSync(path).isDirectory()) denyGitDir(path, vouched);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && featureValue_CACHED_MAY_BE_STALE)
          denyPaths.push(path);
      }
    return {
      present: true,
    };
  };
  for (let dir of repoDirs) {
    let vouched = dir !== dir_2;
    let headPath = resolve(dir, "HEAD");
    let headState = classifyHeadState(headPath);
    let headPresent = isHeadPresent(headState);
    let headSurvives = headState === "head";
    switch (headState) {
      case "head":
        denyPaths.push(headPath);
        break;
      case "folder":
        registerScrubWithRemoval(headPath, vouched, "file");
        denyPaths.push(headPath);
        break;
      case "dangling_head":
      case "absent":
        registerScrubWithRemoval(headPath, vouched, "file_or_empty_folder", checkPathAbsent(headPath));
        if (isMac) denyPaths.push(headPath);
        break;
      default:
    }
    for (let name of gitObjectsNames) {
      let path = resolve(dir, name);
      try {
        statSync(path);
        denyPaths.push(path);
      } catch (error) {
        headSurvives = false;
        registerScrub(path, vouched, headPresent ? "all" : "all_if_a_head_survives", error);
        if (isMac) denyPaths.push(path);
      }
    }
    if (headSurvives) denyGitDir(dir, vouched);
    for (let name of gitConfigNames) {
      let path = resolve(dir, name);
      try {
        let stats = statSync(path);
        let isConfigFile = name === "config" && stats.isFile();
        if (!headPresent && !isConfigFile) {
          if (!lstatSync(path).isDirectory()) continue;
          let gitPath = join(path, ".git");
          try {
            let gitStats = lstatSync(gitPath);
            if (gitStats.isFile() || gitStats.isDirectory()) {
              denyPaths.push(gitPath);
              continue;
            }
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
          }
        }
        denyPaths.push(path);
        if (isConfigFile)
          if (isWindows) registerScrub(resolve(dir, "config.lock"), vouched, "all");
          else denyPaths.push(resolve(dir, "config.lock"));
      } catch {}
    }
    let gitPath = resolve(dir, ".git");
    let probe = denyGitPath(gitPath, vouched);
    if (!probe.present) {
      registerScrubWithRemoval(gitPath, vouched, "file_or_empty_folder", probe.probe);
      if (isMac) denyPaths.push(gitPath);
    }
    noopVisitor(dir);
  }
  let repoDirsReal = new Set([...repoDirs].map((dir) => identity(resolve(dir))));
  for (let dir_3 of new Set([dir_2, dir])) {
    let gitRoot = findGitRoot(dir_3);
    if (gitRoot !== null && !repoDirsReal.has(gitRoot)) denyGitPath(join(gitRoot, ".git"), dir_3 !== dir_2);
  }
  let grantedWorktrees = new Map();
  let grantWorktreeCommon = (
    dir_2,
    vouched = true,
    worktreeGitCommonDir = detectWorktreeGitCommonDir(dir_2),
  ) => {
    if (worktreeGitCommonDir && worktreeGitCommonDir !== dir && !allowWrite.includes(worktreeGitCommonDir)) {
      if (vouched) {
        allowWrite.push(worktreeGitCommonDir);
        extraAllowWrite.push(worktreeGitCommonDir);
        grantedWorktrees.set(dir_2, worktreeGitCommonDir);
      } else logEvent("tengu_sandbox_remote_cwd_grant_withheld", {});
      denyGitDir(worktreeGitCommonDir, !vouched);
    }
  };
  grantWorktreeCommon(dir_2, true, worktreeGitCommonDir);
  if (dir !== dir_2) grantWorktreeCommon(dir, allowExtraPlaces);
  let denyNestedGitConfigLock;
  if (getPlatform() === "macos") {
    denyNestedGitConfigLock = isNestedGitConfigLockDenyEnabled();
    if (denyNestedGitConfigLock && !/[*?]/.test(cwd)) {
      let gitPattern = join(escapeBracketForGlob(cwd), "**", ".[gG][iI][tT]");
      for (let iVariant of ["[fF][iI]", "\uFB01", "[fF]\u0131"])
        for (let kVariant of ["[kK]", "\u212A"])
          denyPaths.push(join(gitPattern, `[cC][oO][nN]${iVariant}[gG].[lL][oO][cC]${kVariant}`));
    }
  }
  allowWrite.push(...additionalDirectories);
  for (let dir of additionalDirectories) noopVisitor(dir);
  for (let dir of additionalDirectories)
    try {
      let mcpJsonPath = resolve(dir, ".mcp.json");
      if (getPlatform() === "macos") {
        addDeny(mcpJsonPath, false);
        try {
          let realDir = realpathSync(dir);
          if (realDir !== dir) addDeny(resolve(realDir, ".mcp.json"), false);
        } catch {}
        continue;
      }
      if (realpathSync(dir) !== dir) continue;
      let beforeCount = denyPaths.length;
      addDeny(mcpJsonPath, false);
      let found = denyPaths.slice(0, beforeCount).find((rulePath) => posixCovers(rulePath, dir));
      if (found !== undefined && denyPaths.slice(beforeCount).every((newPath) => posixCovers(found, newPath)))
        denyPaths.splice(denyPaths.indexOf(found), 0, ...denyPaths.splice(beforeCount));
    } catch {
      continue;
    }
  let writableCwds = [];
  for (let runtimeAllowWriteDirectory of adapterState.runtimeAllowWriteDirectories.values()) {
    let dir = stripTrailingSlash(runtimeAllowWriteDirectory);
    let exists = isDirectoryNoFollow(dir);
    if (exists) {
      writableCwds.push(dir);
      allowWrite.push(dir);
      extraAllowWrite.push(dir);
    }
    denyPaths.push(resolveDenySymlink(resolve(dir, ".claude", "settings.json")));
    denyPaths.push(resolveDenySymlink(resolve(dir, ".claude", "settings.local.json")));
    for (let name of ["skills", "agents", "commands", "hooks"])
      addDeny(resolve(dir, ".claude", name), true, true);
    denyProjectFiles(dir);
    let gitPath = resolve(dir, ".git");
    if (!exists) {
      denyPaths.push(gitPath);
      continue;
    }
    try {
      let gitStats = lstatSync(gitPath);
      if (gitStats.isFile()) denyPaths.push(gitPath);
      else if (gitStats.isDirectory()) denyGitDir(gitPath, false);
      else
        try {
          if (statSync(gitPath).isDirectory()) denyGitDir(gitPath, false);
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && featureValue_CACHED_MAY_BE_STALE)
            denyPaths.push(gitPath);
        }
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") denyPaths.push(gitPath);
    }
    noopVisitor(dir);
    grantWorktreeCommon(dir);
  }
  let readDenyInRepoSources = new Set();
  let configuredDenySpellings = new Set();
  let blockReadsOutside = false;
  let restrictRepoGrants = false;
  let repoAllowRead = [];
  let repoAllowWrite = [];
  let repoGrants = [];
  let droppedAdminWriteGrants = 0;
  let droppedWriteUnderDeny = 0;
  let droppedReadUnderDeny = 0;
  let widenings = [];
  let additionalDirs = new Set(getAdditionalDirectoriesForClaudeMd().flatMap(expandAdditionalDir));
  let userTierAdditionalDirs = new Set(isNotBackgroundSession() ? additionalDirs : []);
  let adminAdditionalDirs = new Set(additionalDirs);
  let repoSources = repoResidentSettingSources();
  let trustedGrants = [];
  let repoGrantsList = [];
  for (let sourceName of SETTING_SOURCES) {
    let trustedTier = isTrustedTierSource(sourceName);
    if (!isSettingSourceEnabled(sourceName) || (!trustedTier && hasTrustedDenies)) continue;
    let targetList = trustedTier ? trustedGrants : repoGrantsList;
    let settingsForSource = getSettingsForSource(sourceName);
    for (let dir of evalConfinedEnv ? [] : (settingsForSource?.permissions?.additionalDirectories ?? []))
      try {
        targetList.push(expandPath(dir, cwd));
      } catch {}
    for (let path of [
      ...(isTierUsable(sourceName) && !managedReadPathsOnly
        ? (settingsForSource?.sandbox?.filesystem?.allowRead ?? [])
        : []),
      ...(isTierUsable(sourceName) ? (settingsForSource?.sandbox?.filesystem?.allowWrite ?? []) : []),
      ...(sourceName === "policySettings" && managedReadPathsOnly && !evalConfinedEnv
        ? managedSources.flatMap((managedSource) => managedSource.sandbox?.filesystem?.allowRead ?? [])
        : []),
    ])
      try {
        targetList.push(resolveSandboxFilesystemPath(path, sourceName));
      } catch {}
    for (let rule of evalConfinedEnv ? [] : editAllowRuleContents(settingsForSource?.permissions?.allow))
      try {
        targetList.push(resolvePathPatternForSandbox(rule, sourceName));
      } catch {}
  }
  let useGlobVouched = false;
  let globAllowed = new Set();
  let globRefused = new Set();
  let context = {
    sharesReach: getPlatform() === "windows",
    prepared: "no",
    automounter: "none",
    automountPoints: [],
    ownPlaces: [getCwdState(), getOriginalCwd(), homedir(), ...additionalDirs],
    grantedPlaces: trustedGrants,
    repositoryGrantedPlaces: repoGrantsList,
    placesOfVouched: [],
    grantsOfVouched: [],
    trustsWriter: false,
    linkTexts: new Map(),
    fixedFolders: new Map(),
    dropped: new Set(),
    saidBefore: new Set(adapterState.deniesDroppedForAnotherHost),
  };
  for (let sourceName of SETTING_SOURCES) {
    if (!isSettingSourceEnabled(sourceName)) {
      let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(sourceName);
      if (settingsForSourceTightenOnly?.permissions || settingsForSourceTightenOnly?.sandbox?.filesystem)
        logForDebugging(
          `Sandbox: ignoring permission rules and sandbox.filesystem entries from disabled setting source ${sourceName}`,
          {
            level: "info",
          },
        );
      continue;
    }
    let settingsForSource = getSettingsForSource(sourceName);
    let isRepoSettings = isRepoSettingSource(sourceName);
    let included = repoSources.includes(sourceName);
    let mayOverride =
      isRepoSettings || (sourceName === "policySettings" && !isPolicySlotAdminOrParentComposed());
    let adminRepoSettings = adminMandate && mayOverride;
    let grantWidensWrite = included || adminRepoSettings;
    if (settingsForSource?.permissions) {
      if (settingsForSource.permissions.blockReadsOutsideWorkingDirectories === true) {
        blockReadsOutside = true;
        restrictRepoGrants ||= !included;
      }
      if (!included && !evalConfinedEnv)
        for (let dir of settingsForSource.permissions.additionalDirectories || [])
          for (let additionalDir of expandAdditionalDir(dir)) {
            additionalDirs.add(additionalDir);
            if (!mayOverride) adminAdditionalDirs.add(additionalDir);
            if (isUserTierSource(sourceName)) userTierAdditionalDirs.add(additionalDir);
          }
    }
    let filesystem = settingsForSource?.sandbox?.filesystem;
    let editAllowRules = evalConfinedEnv ? [] : editAllowRuleContents(settingsForSource?.permissions?.allow);
    let allowWrite_2 = isTierUsable(sourceName) ? filesystem?.allowWrite : undefined;
    let allowReadPaths =
      managedReadPathsOnly || !isTierUsable(sourceName) ? [] : (filesystem?.allowRead ?? []);
    if (adminRepoSettings)
      droppedAdminWriteGrants += editAllowRules.length + (filesystem?.allowWrite?.length ?? 0);
    else
      for (let entry of [
        ...resolvePathEntries(editAllowRules, sourceName, "widening", resolvePathPatternForSandbox),
        ...resolveSandboxPathPatterns(allowWrite_2, sourceName, "widening"),
      ]) {
        if (mayOverride && pathsCoverPath(getDenyRoots(), entry)) {
          droppedReadUnderDeny++;
          continue;
        }
        (grantWidensWrite ? repoAllowWrite : allowWrite).push(entry);
        if (mayOverride && !grantWidensWrite)
          repoGrants.push({
            literal: entry,
            list: "allowWrite",
          });
        widenings.push(entry);
        if (isUserTierSource(sourceName)) userTierAdditionalDirs.add(entry);
      }
    for (let entry of resolveSandboxPathPatterns(allowReadPaths, sourceName, "widening")) {
      if (mayOverride && pathsCoverPath(getDenyRoots(), entry)) {
        droppedWriteUnderDeny++;
        continue;
      }
      (grantWidensWrite ? repoAllowRead : denyRead).push(entry);
      if (mayOverride && !grantWidensWrite)
        repoGrants.push({
          literal: entry,
          list: "allowRead",
        });
    }
    let denyRulesByTool = groupRuleContentsByTool(settingsForSource?.permissions?.deny, [EDIT, READ]);
    let denyGroups = [
      {
        rawSpellings: denyRulesByTool.get(EDIT) ?? [],
        resolveOne: resolvePathPatternForSandbox,
        access: "write",
        what: `${EDIT} rule`,
      },
      {
        rawSpellings: denyRulesByTool.get(READ) ?? [],
        resolveOne: resolvePathPatternForSandbox,
        access: "read",
        what: `${READ} rule`,
      },
      {
        rawSpellings: filesystem?.denyWrite ?? [],
        resolveOne: resolveSandboxFilesystemPath,
        access: "write",
        what: "write deny",
      },
      {
        rawSpellings: filesystem?.denyRead ?? [],
        resolveOne: resolveSandboxFilesystemPath,
        access: "read",
        what: "read deny",
      },
    ];
    for (let { rawSpellings, resolveOne, access, what } of denyGroups)
      for (let rawSpelling of rawSpellings) {
        let pathEntry = resolvePathEntry(rawSpelling, sourceName, "deny", resolveOne);
        if (pathEntry === undefined) continue;
        if (
          shouldDropRemoteHostEntry(
            what,
            pathEntry,
            sourceName,
            context,
            (useGlobVouched && !globAllowed.has(`${what} ${rawSpelling}`)) ||
              globRefused.has(`${what} ${rawSpelling}`),
          )
        )
          continue;
        let denySpelling = normalizeDirPattern(rawSpelling, pathEntry);
        switch ((configuredDenySpellings.add(denySpelling), access)) {
          case "write":
            denyPaths.push(denySpelling);
            break;
          case "read":
            denyPaths_2.push(denySpelling);
            if (!isRepoSettings) readDenyInRepoSources.add(denySpelling);
            break;
        }
      }
  }
  if (
    (droppedAdminWriteGrants > 0 || droppedWriteUnderDeny > 0 || droppedReadUnderDeny > 0) &&
    !adapterState.droppedRepoFilesystemGrantsLogged
  ) {
    adapterState.droppedRepoFilesystemGrantsLogged = true;
    let denyRootLabel = adminMandate
      ? "admin sandbox mandate"
      : hasTrustedDenies
        ? "managed or --settings read deny"
        : "Claude Code's own read-deny paths";
    let droppedDescriptions = [];
    if (droppedAdminWriteGrants > 0)
      droppedDescriptions.push(
        `${droppedAdminWriteGrants} sandbox.filesystem.allowWrite / Edit allow-rule path(s) (admin sandbox mandate)`,
      );
    if (droppedReadUnderDeny > 0)
      droppedDescriptions.push(
        `${droppedReadUnderDeny} sandbox.filesystem.allowWrite / Edit allow-rule path(s) under a denied read path (${denyRootLabel})`,
      );
    if (droppedWriteUnderDeny > 0)
      droppedDescriptions.push(
        `${droppedWriteUnderDeny} sandbox.filesystem.allowRead path(s) inside a denied read path (${denyRootLabel})`,
      );
    logForDebugging(
      `[sandbox] filesystem grants restricted to trusted settings tiers: ignoring ${droppedDescriptions.join(" and ")} from project/local (or HKCU-backfilled policy) settings`,
    );
  }
  if (managedReadPathsOnly && !evalConfinedEnv)
    for (let managedSource of managedSources)
      denyRead.push(
        ...resolveSandboxPathPatterns(
          managedSource.sandbox?.filesystem?.allowRead,
          "policySettings",
          "widening",
        ),
      );
  let flattened = SETTING_SOURCES.flatMap((sourceName) => {
    let isRepoSettings = isRepoSettingSource(sourceName);
    if (isRepoSettings && !isSettingSourceEnabled(sourceName)) return [];
    return (getSettingsForSourceTightenOnly(sourceName)?.sandbox?.credentials?.files ?? []).flatMap(
      (credentialFile) => {
        if (credentialFile.mode === "mask" && isRepoSettings) return [];
        let pathEntry = resolvePathEntry(
          credentialFile.path,
          sourceName,
          "deny",
          resolveSandboxFilesystemPath,
        );
        if (
          pathEntry === undefined ||
          ((credentialFile.mode !== "mask" || !isTrustedTierSource(sourceName)) &&
            shouldDropRemoteHostEntry("credential file", pathEntry, sourceName, context, false))
        )
          return [];
        let denySpelling = normalizeDirPattern(credentialFile.path, pathEntry);
        return [
          {
            source: sourceName,
            file: credentialFile,
            resolvedCredentialPath: pathEntry,
            denySpelling,
          },
        ];
      },
    );
  });
  let dropped = [...context.dropped];
  if (!import_sortedIndex_2(adapterState.deniesDroppedForAnotherHost, dropped)) {
    adapterState.deniesDroppedForAnotherHost = dropped;
    if (dropped.length > 0)
      logFeatureSad("sandbox_exec", "denies_on_another_host_dropped", {
        dropped: dropped.length,
      });
    try {
      sandboxErrorSignalLazy.emit();
    } catch (error) {
      reportSandboxErrorUnderStandIn(error, "deniesOnAnotherHostNotDescribed");
    }
  }
  let allowWriteRoots = [];
  let readDenySkipReason = getReadDenySkipReason();
  if (blockReadsOutside && readDenySkipReason === null) {
    let readRoots = [dir_2, ...(adminMandate ? adminAdditionalDirs : additionalDirs)];
    let grantRoots = new Set(writableCwds);
    for (let dir of [dir_2, ...writableCwds]) {
      let commonDir = grantedWorktrees.get(dir);
      if (commonDir !== undefined) grantRoots.add(commonDir);
    }
    let filtered = [...readRoots, ...grantRoots].filter(containsGlobChars);
    if (filtered.length > 0)
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: paths with glob characters are not re-opened: ${filtered.join(", ")}`,
      );
    let filtered_2 = readRoots.filter((dir) => !containsGlobChars(dir));
    let mapped = denyPaths_2.map((path) => {
      try {
        return expandPath(path, cwd);
      } catch {
        return path;
      }
    });
    let globCache = new Map();
    let isCoveredByDeny = (path, foldCase = getPlatform() !== "linux", denySpellings = mapped) =>
      denySpellings.some((denySpelling) => {
        let trimmed = removeTrailingGlobSuffix(denySpelling);
        if (!containsGlobChars(trimmed))
          return (
            isPathPrefixOf(trimmed, path, foldCase) ||
            isPathWithin(trimmed, path, {
              foldCase,
            })
          );
        let matcher = getPlatform() === "windows" ? denyEntryCovers : denyEntryCoversPath;
        let pairs = [[denySpelling, path, foldCase]];
        if (foldCase) pairs.push([foldPathCase(denySpelling), foldPathCase(path), false]);
        return pairs.some(([pattern, path, nocase]) => {
          try {
            celModule.default(pattern, {
              dot: true,
              nocase,
            });
          } catch {
            return true;
          }
          return matcher(pattern, path, globCache, nocase);
        });
      });
    for (let root of [
      "~/",
      "/home/",
      "/Users/",
      "/root/",
      "/mnt/",
      "/media/",
      "/run/media/",
      "/Volumes/",
      "/srv/",
    ]) {
      let sandboxFilesystemPath = resolveSandboxFilesystemPath(root, "userSettings");
      if (filtered_2.some((path) => isPathWithin(path, sandboxFilesystemPath))) continue;
      let spelling = normalizeDirectoryPattern(sandboxFilesystemPath);
      denyPaths_2.push(spelling);
      configuredDenySpellings.add(spelling);
      allowWriteRoots.push(sandboxFilesystemPath);
      if (restrictRepoGrants) readDenyInRepoSources.add(spelling);
    }
    let claudeConfigDir = getClaudeConfigDir();
    let xdgConfigHome =
      env.XDG_CONFIG_HOME && isAbsolute(env.XDG_CONFIG_HOME)
        ? env.XDG_CONFIG_HOME
        : resolve(homedir(), ".config");
    let denySpellings = [...mapped, ...flattened.map((credential) => credential.denySpelling)];
    let denyRootsMemo;
    let gitConfigDenyPaths = collectGitConfigDenyPaths(
      xdgConfigHome,
      allowWriteRoots,
      () =>
        (denyRootsMemo ??= flattenWrapWriteRoots(
          splitBindableWriteRoots(
            [...getDefaultWritePaths(), ...allowWrite],
            new Set([getOriginalCwd(), getCwdState()]),
          ),
        )),
      (path) => isCoveredByDeny(path, true, denySpellings),
    );
    for (let path of [
      ...filtered_2,
      ...[...grantRoots].filter((root) => !containsGlobChars(root)),
      ...gitConfigDenyPaths,
      getClaudeTempDirRealpath(),
      childProcessTmpDirRealpath,
      resolve(claudeConfigDir, "shell-snapshots"),
      resolve(claudeConfigDir, "session-env"),
      resolve(claudeConfigDir, "skills"),
      resolve(claudeConfigDir, "plugins"),
      resolve(claudeConfigDir, "rules"),
      resolve(claudeConfigDir, "agents"),
      resolve(claudeConfigDir, "commands"),
    ]) {
      if (isCoveredByDeny(path)) {
        logForDebugging(
          `Sandbox: blockReadsOutsideWorkingDirectories: ${path} stays under an existing denyRead and is not re-opened`,
        );
        continue;
      }
      denyRead.push(path);
    }
    if (getEffectiveFilesystemPolicy() === "relaxed")
      logForDebugging(
        "Sandbox: blockReadsOutsideWorkingDirectories: the relaxed filesystem policy drops every denyRead at wrap time, so the sandbox half of the block does not apply",
      );
  } else if (blockReadsOutside)
    logForDebugging(
      `Sandbox: blockReadsOutsideWorkingDirectories not applied to the sandbox: ${readDenySkipReason}${getPlatform() === "windows" ? " (grants from repository settings are still ignored)" : ""}`,
    );
  let applyRepoFilter = allowWriteRoots.length > 0 || (blockReadsOutside && getPlatform() === "windows");
  for (let path of repoAllowRead) {
    if (applyRepoFilter) {
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: repo-committed allowRead ${path} does not count`,
      );
      continue;
    }
    denyRead.push(path);
    repoGrants.push({
      literal: path,
      list: "allowRead",
    });
  }
  for (let path of repoAllowWrite) {
    if (applyRepoFilter) {
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: repo-committed allowWrite ${path} does not count`,
      );
      continue;
    }
    allowWrite.push(path);
    repoGrants.push({
      literal: path,
      list: "allowWrite",
    });
  }
  for (let path of widenings) for (let dir of expandAdditionalDir(path)) noopVisitor(dir);
  let grantSet = adminMandate ? adminAdditionalDirs : additionalDirs;
  for (let dir of additionalDirectories)
    if (
      ((applyRepoFilter || adminMandate) && !grantSet.has(dir)) ||
      (!adminAdditionalDirs.has(dir) && pathsCoverPath(getDenyRoots(), dir))
    ) {
      let index = allowWrite.indexOf(dir);
      if (index !== -1) allowWrite.splice(index, 1);
    } else if (!adminAdditionalDirs.has(dir))
      repoGrants.push({
        literal: dir,
        list: "allowWrite",
      });
  let acceptedGrants = [];
  let writeGrantsWithoutBase = [];
  let denyRootSpellings;
  let denyRootSpellingsLazy = () =>
    (denyRootSpellings ??= normalizeCaseForComparison_2([
      ...getDenyRoots(),
      ...denyPaths_2.flatMap((path) => canonicalizeSandboxPath(path) ?? []),
    ]));
  let grantLists = {
    allowRead: denyRead,
    allowWrite,
  };
  let withholdGrant = ({ list, literal }, reason, repeat = false) => {
    do {
      let index = grantLists[list].indexOf(literal);
      if (index === -1) break;
      grantLists[list].splice(index, 1);
    } while (repeat);
    logForDebugging(`[sandbox] withheld ${list} ${literal}: ${reason}`);
  };
  if (hasTrustedDenies)
    for (let grant of repoGrants) {
      let canonical = canonicalizeSandboxPath(grant.literal) ?? "";
      if (containsGlobChars(canonical))
        withholdGrant(
          grant,
          "a repository glob grant is expanded anew at every wrap while a trusted tier denies reads (spell the directories instead)",
        );
      else if (isNetworkSpelledGrantRoot(canonical))
        withholdGrant(
          grant,
          "a repository grant spelled as a network (UNC or automount) path cannot be compared with the paths a trusted tier denies reading",
        );
    }
  let bindableRoots = flattenWrapWriteRoots(
    splitBindableWriteRoots([...getDefaultWritePaths(), ...allowWrite], new Set([dir_2, dir])),
  );
  let prefixCache = new Map();
  let onWindows = getPlatform() === "windows";
  let gitHome = onWindows ? getGitHomeInfo(homedir(), userSettingsHomes()) : undefined;
  let nameReadingFlag;
  let readNameReadingFlag = () =>
    (nameReadingFlag ??=
      gitHome !== undefined &&
      readFlagWithOverride(TENGU_CURRIED_WILLOW, {
        safe: true,
      }));
  for (let listName of ["allowRead", "allowWrite"])
    e: for (let literal of normalizeCaseForComparison_2(grantLists[listName])) {
      let normalized = gitHome === undefined ? literal : normalizeUncTildePath(literal);
      if (gitHome !== undefined && isDeviceNamespacePath(normalized.replace(/^[\\/]{3,}/, "\\\\"))) {
        withholdGrant(
          {
            list: listName,
            literal,
          },
          "a device path cannot be compared with the home folder (spell it without the \\\\.\\ prefix)",
          true,
        );
        continue;
      }
      let canonical = canonicalizeSandboxPath(normalized);
      let hasGlob =
        canonical !== undefined &&
        (gitHome === undefined
          ? containsGlobChars(canonical)
          : containsGlobCharsWin(canonical) ||
            (containsGlobCharsWin(normalized) && containsGlobChars(canonical)));
      if (
        gitHome !== undefined &&
        canonical !== undefined &&
        hasGlob &&
        !isForeignUnresolvedMount(canonical)
      ) {
        let globBaseDirectory = getGlobBaseDirectory(canonical);
        let prefix = cachedResolvedPrefix(globBaseDirectory, prefixCache);
        let refusal =
          prefix === null
            ? "has a link chain that cannot be followed safely"
            : isUnderGitHome(prefix.path, gitHome)
              ? "is or contains the home folder, or is a Claude Code config folder, which the Windows sandbox is not given (name the folders instead)"
              : isGrantCoveredByPattern(
                    denyRootSpellingsLazy(),
                    {
                      path: globBaseDirectory,
                      patternBeneath: false,
                    },
                    prefix.path,
                  )
                ? "resolves into a denied read path outside its own spelling"
                : undefined;
        if (refusal !== undefined) {
          if (prefix === null && listName === "allowWrite") writeGrantsWithoutBase.push(literal);
          withholdGrant(
            {
              list: listName,
              literal,
            },
            `the folder that it is confined to (${globBaseDirectory}) ${refusal}`,
            true,
          );
          continue;
        }
      }
      if (canonical === undefined || isForeignUnresolvedMount(canonical)) continue;
      let readings = hasGlob
        ? [
            {
              path: getGlobBaseDirectory(canonical),
              patternBeneath: true,
              nameReading: false,
            },
            ...nameReadingsOfGlobSpelling(
              onWindows
                ? resolveAgainstProcessCwd(normalized).replaceAll("\\", "/")
                : resolveAgainstProcessCwd(normalized),
            )
              .filter(({ name }) => !/[*?]/.test(name))
              .map(({ name, pattern }) => ({
                path: onWindows ? name.replaceAll("/", "\\") : name,
                patternBeneath: pattern !== null,
                nameReading: true,
              })),
          ]
        : [
            {
              path: canonical,
              patternBeneath: false,
              nameReading: false,
            },
          ];
      let keptReadings = [];
      for (let reading of readings) {
        let prefix = cachedResolvedPrefix(reading.path, prefixCache);
        if (prefix === null) {
          if (hasGlob && listName === "allowWrite") writeGrantsWithoutBase.push(literal);
          withholdGrant(
            {
              list: listName,
              literal,
            },
            "its link chain cannot be followed safely (a loop, an unreadable hop); a later config build re-admits it once it resolves",
            true,
          );
          continue e;
        }
        if (
          gitHome !== undefined &&
          (!hasGlob || (reading.nameReading && readNameReadingFlag())) &&
          isUnderGitHome(ensureTrailingBackslashForDriveRoot(reading, prefix.path), gitHome)
        ) {
          withholdGrant(
            {
              list: listName,
              literal,
            },
            reading.nameReading
              ? `the sandbox may also read ${reading.path} as a folder name, and that folder is or leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given (if it is a link, remove it; or name the real folders instead)`
              : "it is or contains the home folder, or is a Claude Code config folder, which the Windows sandbox is not given",
            true,
          );
          continue e;
        }
        let symlinkHopDirectories = collectSymlinkHopDirectories(
          reading.path,
          prefix.exists ? prefix.path : null,
          true,
        );
        if (!isPathPrefixOfAny(symlinkHopDirectories, bindableRoots)) continue;
        if (isGrantCoveredByPattern(denyRootSpellingsLazy(), reading, prefix.path)) {
          withholdGrant(
            {
              list: listName,
              literal,
            },
            reading.patternBeneath
              ? "a directory in its spelling resolves outside that spelling, through a link a sandboxed command could have placed, to one that holds or lies inside a denied read path (spell the directory by its real path)"
              : "it resolves into a denied read path outside its own spelling through a link a sandboxed command could have placed (grant the denied path itself to carve it out)",
            true,
          );
          continue e;
        }
        keptReadings.push(reading);
      }
      if (keptReadings.length > 0)
        acceptedGrants.push({
          literal,
          list: listName,
          roots: keptReadings,
        });
    }
  let credentialFiles = new Map();
  let relaxedPolicy = getEffectiveFilesystemPolicy() === "relaxed";
  let hasMaskEntries =
    (getPlatform() === "linux" || getPlatform() === "wsl" || (getPlatform() === "macos" && relaxedPolicy)) &&
    SETTING_SOURCES.some(
      (sourceName) =>
        sourceName !== "projectSettings" &&
        sourceName !== "localSettings" &&
        (isSettingSourceEnabled(sourceName) || relaxedPolicy) &&
        (getSettingsForSourceTightenOnly(sourceName)?.sandbox?.credentials?.files ?? []).some(
          (credential) => credential.mode === "mask",
        ),
    );
  let maskSweepEntries = [];
  let maskWalkMemo = hasMaskEntries ? createWalkMemo() : undefined;
  let canonicalizeMaskPath = (path, trust) => {
    if (!trust) return canonicalizePathForMaskSweep(path, undefined, maskWalkMemo);
    let maskPath = resolveMaskPath(path, maskWalkMemo);
    if (maskPath.lookAgain !== undefined) maskSweepEntries.push(maskPath);
    return maskPath.spellings[1];
  };
  let maskInert = hasMaskEntries && relaxedPolicy;
  let trailingSeparatorRe = getPlatform() === "windows" ? /(?<=.)[/\\]+$/ : /(?<=.)\/+$/;
  let expandMaskGlob = expandMaskGlob_2;
  let denyReadSweep = hasMaskEntries
    ? denyRead.flatMap((denyPath) => {
        let replaced = removeTrailingGlobSuffix(denyPath).replace(trailingSeparatorRe, "");
        return containsGlobChars(replaced)
          ? [
              canonicalizePathForMaskSweep(replaced),
              ...expandMaskGlob(replaced).map((expansion) => expansion.canonical),
            ]
          : [canonicalizePathForMaskSweep(replaced)];
      })
    : [];
  let posixCoversFn = posixCovers;
  let globCache1 = new Map();
  let globMatches = (path, pattern) => {
    let foldedPath = foldPathCase(path);
    let foldedPattern = foldPathCase(pattern);
    let coverage = "allBeneathItsDirectory";
    return (
      matchesGuardedGlob(path, pattern, globCache1, true) ||
      matchesGuardedGlob(foldedPath, foldedPattern, globCache1) ||
      matchesDenyGlobAtRuntime(path, pattern, "exactly", "allBeneathItsDirectory", globCache1) ||
      matchesDenyGlobAtRuntime(foldedPath, foldedPattern, "exactly", "allBeneathItsDirectory", globCache1) ||
      (containsGlobChars(path) &&
        (nameReadingsOfGlobSpelling(pattern).some(({ name }) => posixCovers(name, path)) ||
          nameReadingsOfGlobSpelling(foldedPattern).some(({ name }) => posixCovers(name, foldedPath))))
    );
  };
  let globAncestorCovered = (denyPath, denySpelling, current) => {
    let ancestor = current;
    for (;;) {
      if (globMatches(ancestor, denyPath) && denyEntryCoversFolded(denySpelling, ancestor, globCache1))
        return true;
      let parent = dirname(ancestor);
      if (parent === ancestor) return false;
      ancestor = parent;
      if (!containsGlobChars(denySpelling) && !isPathPrefixOf(denySpelling, ancestor)) return false;
    }
  };
  let isDenyCovered = (path, target) =>
    denyReadSweep.some((denyPath) =>
      containsGlobChars(denyPath)
        ? globAncestorCovered(denyPath, path, target)
        : denyEntryCoversFolded(path, denyPath, globCache1) && isPathPrefixOf(denyPath, target),
    );
  let isDenyCoveredPath = (denySpelling, path) => denyEntryCoversPath(denySpelling, path, globCache1);
  let downgradedDenies = new Set();
  let sentinelMasks = new Set();
  let denyLexicals = new Map();
  let addDenyLexical = (key, lexical, trusted) => {
    let existingEntry = denyLexicals.get(key);
    if (existingEntry) {
      existingEntry.lexicals.push(lexical);
      existingEntry.trusted ||= trusted;
    } else
      denyLexicals.set(key, {
        lexicals: [lexical],
        trusted,
      });
  };
  let isTrustedDeny = (key) => denyLexicals.get(key)?.trusted === true;
  let denyReachesLiteral = (key, literal) => {
    let entry = denyLexicals.get(key);
    return (
      entry === undefined ||
      entry.lexicals.some(
        (lexical) =>
          lexical === key || (posixCoversFn(lexical, literal) && isOsLinkedRootAlias(lexical, key)),
      )
    );
  };
  let envVars = new Map();
  let hasCredentials = false;
  let allowPlaintextInject;
  let awsPairs = new Map();
  let pairSeq = 0;
  let synthSeq = 0;
  let reservedVarNames = AWS_CREDENTIAL_ENV_NAMES;
  let pairVarNames = (pair) => [
    pair.accessKeyIdVar,
    pair.secretAccessKeyVar,
    ...(pair.sessionTokenVar !== undefined ? [pair.sessionTokenVar] : []),
  ];
  let isSyntheticPair = (pair) =>
    credentialRuleRefine(pair.accessKeyIdVar) || credentialRuleRefine(pair.secretAccessKeyVar);
  let addSuppressorPair = (varNames, rank, messageFor) => {
    let claimedNames = new Set([...awsPairs.values()].flatMap((pairEntry) => pairVarNames(pairEntry.pair)));
    for (let varName of varNames) {
      if (!reservedVarNames.includes(varName) || claimedNames.has(varName)) continue;
      synthSeq += 1;
      logForDebugging(messageFor(varName), {
        level: "warn",
      });
      awsPairs.set(varName, {
        pair: {
          accessKeyIdVar: varName,
          secretAccessKeyVar: `${MERGE_PAIR_SUPPRESSOR_SENTINEL}${synthSeq}_`,
        },
        rank,
        seq: pairSeq++,
        label: varName,
        sessionLabel: undefined,
        synthetic: true,
      });
      claimedNames.add(varName);
    }
  };
  let sigv4;
  for (let sourceName of SETTING_SOURCES) {
    let credentials = getSettingsForSourceTightenOnly(sourceName)?.sandbox?.credentials;
    if (!credentials) continue;
    let isRepoSettings = isRepoSettingSource(sourceName);
    if (isRepoSettings && !isSettingSourceEnabled(sourceName)) {
      logForDebugging(
        `Sandbox: ignoring sandbox.credentials entries from disabled setting source ${sourceName}`,
        {
          level: "info",
        },
      );
      continue;
    }
    hasCredentials = true;
    let plaintextInjectEnabled = sourceName === "userSettings" && !isSettingSourceEnabled("userSettings");
    let evalConfinedForeign = evalConfinedEnv && sourceName !== "userSettings";
    let injectWithheld = plaintextInjectEnabled || evalConfinedForeign;
    let withheldLabel = evalConfinedForeign
      ? `eval-confined foreign tier ${sourceName}`
      : "disabled userSettings";
    for (let { file, resolvedCredentialPath, denySpelling } of flattened.filter(
      (credential) => credential.source === sourceName,
    )) {
      let targetPath = file.mode === "deny" ? denySpelling : resolvedCredentialPath;
      let path = removeTrailingGlobSuffix(denySpelling).replace(trailingSeparatorRe, "");
      let canonical = hasMaskEntries ? canonicalizeMaskPath(path, !isRepoSettings) : path;
      if (file.mode === "deny") addDenyLexical(canonical, path, !isRepoSettings);
      let incumbent = credentialFiles.get(canonical);
      if (incumbent?.mode === "deny") {
        let wasDowngraded = downgradedDenies.has(canonical);
        let isSamePathSpelling = (lexical) =>
          lexical === canonical || isOsLinkedRootAlias(lexical, canonical);
        if (file.mode === "deny" && wasDowngraded && !isSamePathSpelling(path)) {
          logForDebugging(
            `[sandbox] credential file deny for '${targetPath}' supersedes the disabled-userSettings synthetic deny but is symlink-spelled \u2014 installed as a canonical deny on '${canonical}' so enforcement cannot be retargeted`,
          );
          credentialFiles.set(canonical, {
            path: canonical,
            mode: "deny",
          });
          addDenyLexical(canonical, canonical, !isRepoSettings);
          downgradedDenies.delete(canonical);
          continue;
        }
        if (file.mode === "deny" && !wasDowngraded) {
          let incumbentCovers = isSamePathSpelling(
            removeTrailingGlobSuffix(incumbent.path).replace(trailingSeparatorRe, ""),
          );
          if (!isSamePathSpelling(path) || incumbentCovers) {
            if (!isRepoSettings && !isSamePathSpelling(path) && !incumbentCovers) {
              logForDebugging(
                `[sandbox] credential file deny for '${targetPath}' collides with the deny spelled '${incumbent.path}' only through symlink resolution \u2014 installed as a canonical deny on '${canonical}' so the trusted tier's intent cannot be retargeted`,
              );
              credentialFiles.set(canonical, {
                path: canonical,
                mode: "deny",
              });
              addDenyLexical(canonical, canonical, true);
            }
            continue;
          }
          logForDebugging(
            `[sandbox] credential file deny for '${targetPath}' replaces the deny spelled '${incumbent.path}': the incumbent reaches this file only through symlink resolution, the replacement is the canonical spelling`,
          );
        } else if (file.mode === "mask" && !wasDowngraded) {
          let maskInertHere = maskInert || isDenyCovered(canonical, canonical);
          let onlyViaSymlink = !maskInertHere && !denyReachesLiteral(canonical, path);
          if (!maskInertHere && !onlyViaSymlink) {
            logForDebugging(
              `[sandbox] credential file mask for '${targetPath}' dropped: '${incumbent.path}' denies the same file`,
            );
            continue;
          }
          if (onlyViaSymlink) {
            if (isTrustedDeny(canonical)) {
              logForDebugging(
                `[sandbox] credential file mask for '${targetPath}' dropped: a trusted-tier deny ('${incumbent.path}') names the same file through a symlink \u2014 installed as a canonical deny on '${canonical}' so enforcement cannot be retargeted`,
              );
              credentialFiles.set(canonical, {
                path: canonical,
                mode: "deny",
              });
              addDenyLexical(canonical, canonical, true);
              continue;
            }
            logForDebugging(
              `[sandbox] credential file deny '${incumbent.path}' collides with mask '${targetPath}' only after symlink resolution \u2014 a wrap-time re-resolve of the deny's spelling can diverge, so the mask is kept (sentinel bind on the real file) WITHOUT injection`,
            );
          }
          if (!maskInert) sentinelMasks.add(canonical);
        }
      }
      if (file.mode === "mask" && injectWithheld)
        if (relaxedPolicy);
        else {
          logForDebugging(
            `[sandbox] credential file mask for '${targetPath}' from ${withheldLabel} degrades to deny (that source cannot grant proxy injection; its restrictive half still applies)`,
          );
          credentialFiles.set(canonical, {
            path: denySpelling,
            mode: "deny",
          });
          addDenyLexical(canonical, path, !isRepoSettings);
          downgradedDenies.add(canonical);
          continue;
        }
      if (file.mode === "mask" && !maskInert && (getPlatform() === "windows" || getPlatform() === "macos")) {
        logForDebugging(
          `[sandbox] credential file mask for '${targetPath}' degrades to deny on ${getPlatform()} (file masking is not enforced by this platform's sandbox backend yet)`,
        );
        credentialFiles.set(canonical, {
          path: denySpelling,
          mode: "deny",
        });
        addDenyLexical(canonical, path, !isRepoSettings);
        downgradedDenies.delete(canonical);
        continue;
      }
      if (file.mode === "mask") {
        if (containsGlobChars(targetPath)) {
          if (incumbent?.mode === "mask" && (maskInert || isDenyCovered(canonical, canonical))) {
            logForDebugging(
              `[sandbox] glob-spelled credential file mask '${targetPath}' dropped: '${incumbent.path}' already masks this path and the degrade's deny would be runtime-inert here`,
            );
            continue;
          }
          logForDebugging(
            `[sandbox] credential file mask for '${targetPath}' contains glob characters \u2014 degrading to deny (masking applies to a single file; use mode "deny" for glob patterns)`,
          );
          credentialFiles.set(canonical, {
            path: denySpelling,
            mode: "deny",
          });
          addDenyLexical(canonical, path, !isRepoSettings);
          downgradedDenies.delete(canonical);
          continue;
        }
        let unsafePath =
          isOnForeignMount(canonical, getCwdState()) || rawPointerPathIsUnsafe(canonical, getCwdState());
        let refuseReason;
        if (unsafePath)
          refuseReason =
            "is flagged by host-side path vetting (cross-host pointer or non-regular path component) \u2014 the unsandboxed probe will not touch it and SRT cannot mask it";
        else {
          let fd;
          try {
            try {
              fd = openSync(canonical, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode === "ELOOP")
                refuseReason =
                  "became a symlink after canonicalization \u2014 the object was swapped mid-conversion, so the probe fails closed";
              else if (
                errnoCode !== "ENOENT" &&
                errnoCode !== "EACCES" &&
                errnoCode !== "EPERM" &&
                errnoCode !== "ENOTDIR"
              )
                refuseReason = `could not be probed (${errnoCode ?? "unknown error"}) \u2014 an unprobed mask may be silently skipped at wrap time, so the probe fails closed`;
            }
            if (fd !== undefined) {
              let stats = fstatSync(fd);
              if (stats.isDirectory())
                refuseReason =
                  'resolves to a directory \u2014 whole-file masking has no meaning for a directory; use mode "deny" for directories';
              else if (!stats.isFile())
                refuseReason =
                  "resolves to a non-regular file (FIFO/device/socket) \u2014 only regular files can be masked; SRT would hang on or silently skip it at wrap time";
              else if (stats.size > MAX_DENY_SCAN_BYTES)
                refuseReason = `is larger than ${MAX_DENY_SCAN_BYTES} bytes \u2014 a file this size cannot be masked; SRT would skip it fail-open at wrap time`;
              else {
                let size = stats.size;
                let buffer = Buffer.allocUnsafe(size + 1);
                let totalRead = 0;
                let bytes;
                try {
                  for (;;) {
                    let read = readSync(fd, buffer, totalRead, size + 1 - totalRead, null);
                    if (read <= 0) break;
                    totalRead += read;
                    if (totalRead > size) break;
                  }
                  bytes = buffer.subarray(0, totalRead);
                } catch (error) {
                  refuseReason = `failed mid-read (${getErrnoCode(error) ?? "unknown error"}) \u2014 the UTF-8 probe could not complete, so the probe fails closed`;
                }
                if (bytes !== undefined && totalRead > size) {
                  refuseReason =
                    "changed size between fstat and read \u2014 the object is being mutated mid-conversion, so the probe fails closed";
                  bytes = undefined;
                }
                if (bytes !== undefined)
                  try {
                    new TextDecoder("utf-8", {
                      fatal: true,
                    }).decode(bytes);
                  } catch {
                    refuseReason =
                      'has non-UTF-8 content \u2014 binary credential files cannot be masked; use mode "deny"';
                  }
              }
            }
          } finally {
            if (fd !== undefined) closeSync(fd);
          }
        }
        if (refuseReason !== undefined) {
          logForDebugging(
            `[sandbox] credential file mask for '${targetPath}' ${refuseReason} \u2014 degrading to deny`,
          );
          credentialFiles.set(canonical, {
            path: denySpelling,
            mode: "deny",
          });
          addDenyLexical(canonical, path, !isRepoSettings);
          downgradedDenies.delete(canonical);
          continue;
        }
      }
      if (file.mode === "deny" && incumbent?.mode === "mask") {
        if (maskInert || isDenyCovered(canonical, canonical)) {
          logForDebugging(
            `[sandbox] credential file deny for '${targetPath}' not installed over the existing mask: the deny is runtime-inert here (relaxed filesystem policy or an exact allowRead re-opens the path), so the mask's sentinel bind is the effective protection`,
          );
          if (!maskInert) {
            sentinelMasks.add(canonical);
            credentialFiles.set(canonical, {
              path: incumbent.path,
              mode: "mask",
              injectHosts: [],
            });
          }
          continue;
        }
        let replaced = removeTrailingGlobSuffix(incumbent.path).replace(trailingSeparatorRe, "");
        if (!denyReachesLiteral(canonical, replaced)) {
          if (!isRepoSettings) {
            logForDebugging(
              `[sandbox] credential file mask for '${incumbent.path}' dropped: trusted-tier deny '${targetPath}' names the same file through a symlink \u2014 installed as a canonical deny on '${canonical}' so enforcement cannot be retargeted`,
            );
            credentialFiles.set(canonical, {
              path: canonical,
              mode: "deny",
            });
            addDenyLexical(canonical, canonical, true);
            continue;
          }
          logForDebugging(
            `[sandbox] credential file deny for '${targetPath}' collides with mask '${incumbent.path}' only after symlink resolution \u2014 a wrap-time re-resolve of the deny's spelling can diverge, so the mask is kept (whole-file sentinel bind on the real file) WITHOUT injection or extract`,
          );
          sentinelMasks.add(canonical);
          credentialFiles.set(canonical, {
            path: incumbent.path,
            mode: "mask",
            injectHosts: [],
          });
          continue;
        }
        logForDebugging(
          `[sandbox] credential file mask for '${incumbent.path}' dropped: '${targetPath}' denies the same file`,
        );
      }
      let maskInert2 = maskInert || isDenyCovered(canonical, canonical);
      let installed =
        file.mode === "deny"
          ? {
              path: targetPath,
              mode: "deny",
            }
          : maskInert2 && file.onExtractNoMatch === "deny"
            ? {
                ...file,
                path: targetPath,
                onExtractNoMatch: "error",
              }
            : {
                ...file,
                path: targetPath,
              };
      if (file.mode === "mask" && sentinelMasks.has(canonical)) {
        installed = {
          path: targetPath,
          mode: "mask",
          injectHosts: [],
        };
        logForDebugging(
          `[sandbox] credential file mask for '${targetPath}' kept over an allowRead-re-opened trusted deny WITHOUT injection or extract (whole-file sentinel): the sentinel protects the bytes, but the displaced deny's intent bars proxy substitution and fail-open extract semantics`,
        );
      } else if (file.mode === "mask" && injectWithheld) {
        installed = {
          path: targetPath,
          mode: "mask",
          injectHosts: [],
        };
        logForDebugging(
          `[sandbox] credential file mask for '${targetPath}' from ${withheldLabel} forwards sentinel-only (whole-file sentinel: injectHosts forced empty, extract options dropped): a degraded deny would be dropped at wrap time under the relaxed filesystem policy, while the sentinel bind keeps the bytes protected \u2014 injection stays withheld (that source cannot grant it) and the source's fail-open extract semantics do not apply`,
        );
      }
      if (file.mode === "mask" && installed.onExtractNoMatch === "error" && file.onExtractNoMatch === "deny")
        logForDebugging(
          `[sandbox] credential file mask for '${targetPath}': onExtractNoMatch 'deny' rewritten to 'error' \u2014 the runtime's no-match read-deny would be inert here (relaxed filesystem policy or an exact allowRead re-opens the path), so 'deny' would fail open`,
        );
      if (file.mode === "mask") {
        let found = [getCwdState(), ...allowWrite].find((grantRoot) => {
          let replaced = removeTrailingGlobSuffix(resolve(getCwdState(), grantRoot)).replace(
            trailingSeparatorRe,
            "",
          );
          if (containsGlobChars(replaced)) return false;
          let canonicalDenyPath = canonicalizePathForMaskSweep(replaced);
          return (
            posixCoversFn(replaced, canonical) ||
            posixCoversFn(replaced, path) ||
            posixCoversFn(canonicalDenyPath, canonical) ||
            posixCoversFn(canonicalDenyPath, path)
          );
        });
        if (found !== undefined)
          logForDebugging(
            `[sandbox] credential file mask for '${targetPath}' resolves inside the sandbox write grant ('${found}') \u2014 a sandboxed command can replace the object between wraps and steer what the host reads (and injects) as the credential; prefer masking files outside writable roots`,
            {
              level: "warn",
            },
          );
      }
      credentialFiles.set(canonical, installed);
      downgradedDenies.delete(canonical);
    }
    for (let envVar of credentials.envVars ?? []) {
      if (envVar.mode === "mask" && (isRepoSettings || plaintextInjectEnabled)) continue;
      if (envVar.mode === "mask" && evalConfinedForeign) {
        envVars.set(envVar.name, {
          name: envVar.name,
          mode: "deny",
        });
        continue;
      }
      if (envVar.mode === "mask" && credentialRuleRefine(envVar.name)) {
        logForDebugging(
          `[sandbox] credentials.envVars entry '${envVar.name}': its name uses a reserved CC-synthesized placeholder prefix, which must never be a masked env var \u2014 degrading the mask to a deny (the variable is unset in the sandbox instead of sentinel-masked)`,
          {
            level: "warn",
          },
        );
        envVars.set(envVar.name, {
          name: envVar.name,
          mode: "deny",
        });
        continue;
      }
      if (envVars.get(envVar.name)?.mode === "deny") continue;
      envVars.set(
        envVar.name,
        envVar.mode === "deny"
          ? {
              name: envVar.name,
              mode: "deny",
            }
          : envVar,
      );
    }
    if (!isRepoSettings && !injectWithheld && credentials.allowPlaintextInject !== undefined)
      allowPlaintextInject = credentials.allowPlaintextInject;
    if (!isRepoSettings && !injectWithheld) {
      for (let pair of credentials.awsPairs ?? []) {
        let incumbent = awsPairs.get(pair.accessKeyIdVar);
        let synthetic = isSyntheticPair(pair);
        let rank = SETTING_SOURCES.indexOf(sourceName);
        if (incumbent !== undefined) {
          if (synthetic && !incumbent.synthetic && rank <= incumbent.rank) {
            logForDebugging(
              `[sandbox] credentials.awsPairs: ignoring same-or-lower-precedence inert suppressor pair for '${pair.accessKeyIdVar}' \u2014 a real pair already claims that key id, so its suppression is provided by the incumbent and replacing it would disable re-signing`,
            );
            addSuppressorPair(
              pairVarNames(pair),
              rank,
              (varName) =>
                `[sandbox] credentials.awsPairs: the ignored suppressor pair for '${pair.accessKeyIdVar}' held a conventional claim on '${varName}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
            );
            continue;
          }
          if (!synthetic && incumbent.synthetic && rank < incumbent.rank) {
            logForDebugging(
              `[sandbox] credentials.awsPairs: ignoring entry for '${pair.accessKeyIdVar}' \u2014 a higher-precedence source claims that key id with an inert suppressor, deliberately keeping it non-re-signing`,
              {
                level: "warn",
              },
            );
            addSuppressorPair(
              pairVarNames(pair),
              rank,
              (varName) =>
                `[sandbox] credentials.awsPairs: the ignored pair for '${pair.accessKeyIdVar}' held a conventional claim on '${varName}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
            );
            continue;
          }
          logForDebugging(
            `[sandbox] credentials.awsPairs entry for '${pair.accessKeyIdVar}' replaces an earlier pair for the same access key id (later-processed entry wins)`,
            {
              level: "warn",
            },
          );
        }
        awsPairs.set(pair.accessKeyIdVar, {
          pair,
          rank,
          seq: pairSeq++,
          label: pair.accessKeyIdVar,
          sessionLabel: pair.sessionTokenVar,
          synthetic,
        });
        if (incumbent !== undefined)
          addSuppressorPair(
            pairVarNames(incumbent.pair),
            incumbent.rank,
            (varName) =>
              `[sandbox] credentials.awsPairs: replacing the '${pair.accessKeyIdVar}' pair displaced its conventional claim on '${varName}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
          );
      }
      if (credentials.sigv4 !== undefined) sigv4 = credentials.sigv4;
    }
  }
  let getWholeValueMask = (varName) => {
    let entry = envVars.get(varName);
    return entry?.mode === "mask" && entry.extract === undefined && entry.decode === undefined
      ? entry
      : undefined;
  };
  let warnNarrowerInjectHosts = (label, accessKeyIdVar, memberVars) => {
    let injectHosts = envVars.get(accessKeyIdVar)?.injectHosts;
    for (let member of memberVars) {
      let injectHosts_2 = envVars.get(member)?.injectHosts;
      if (!(
        injectHosts_2 === undefined ||
        (injectHosts !== undefined &&
          injectHosts.every((injectHost) => isInjectHostCoveredByAllowedDomains(injectHost, injectHosts_2)))
      ))
        logForDebugging(
          `[sandbox] ${label}: member '${member}' has an injectHosts narrower than the access-key-id entry's \u2014 SigV4 re-signing is scoped by '${accessKeyIdVar}' alone, so the narrower member scope does not limit where re-signed requests carry the real secret`,
          {
            level: "warn",
          },
        );
    }
  };
  let warnUnscopedInjectHosts = (accessKeyIdVar, label = "credentials.awsPairs") => {
    if (envVars.get(accessKeyIdVar)?.injectHosts === undefined)
      logForDebugging(
        `[sandbox] ${label}: '${accessKeyIdVar}' has no injectHosts, so SigV4 re-signing with the real secret is in scope at EVERY host in network.allowedDomains \u2014 a list repo-committed settings can extend; set injectHosts on the '${accessKeyIdVar}' entry to pin the re-signing scope`,
        {
          level: "warn",
        },
      );
  };
  let flattened_2 = [...awsPairs.values()].flatMap((entry) => {
    let { pair } = entry;
    let filtered = [pair.accessKeyIdVar, pair.secretAccessKeyVar].filter(
      (varName) => getWholeValueMask(varName) === undefined,
    );
    if (filtered.length > 0) {
      if (pairVarNames(pair).some((varName) => reservedVarNames.includes(varName))) {
        if (entry.synthetic)
          logForDebugging(
            `[sandbox] credentials.awsPairs entry '${pair.accessKeyIdVar}' is an inert suppressor pair (CC-synthesized placeholder members) \u2014 forwarded so its conventional claim keeps suppressing implicit auto-pairing; nothing can register or re-sign`,
          );
        else
          logForDebugging(
            `[sandbox] credentials.awsPairs entry '${pair.accessKeyIdVar}' references env var(s) ${filtered.join(", ")} that are not forwarded as ` +
              "whole-value mask entries \u2014 the pair is forwarded anyway (the " +
              "runtime skips a spec whose key id or secret is unusable) because it names a conventional AWS variable and must keep suppressing implicit auto-pairing",
            {
              level: "warn",
            },
          );
        return [entry];
      }
      logForDebugging(
        `[sandbox] dropping credentials.awsPairs entry '${pair.accessKeyIdVar}': referenced env var(s) ${filtered.join(", ")} are not forwarded as whole-value mask entries (dropped by trust filtering, deny-overridden, never declared, or using extract/decode)`,
      );
      return [];
    }
    return [entry];
  });
  {
    let isFunctional = (pair) =>
      getWholeValueMask(pair.accessKeyIdVar) !== undefined &&
      getWholeValueMask(pair.secretAccessKeyVar) !== undefined;
    let sorted = flattened_2
      .map((entry) => ({
        entry,
        label: entry.label,
        functional: isFunctional(entry.pair),
      }))
      .sort(
        (a, b) =>
          Number(b.functional) - Number(a.functional) ||
          b.entry.rank - a.entry.rank ||
          b.entry.seq - a.entry.seq,
      );
    let slotOwner = new Map();
    let placeholderSeq = 0;
    let disableSlot = (entry, slot) => {
      placeholderSeq += 1;
      entry.pair = {
        ...entry.pair,
        [slot]: `${SLOT_COLLISION_SENTINEL}${placeholderSeq}_`,
      };
    };
    for (let { entry, label } of sorted) {
      let pair = entry.pair;
      let slots = [
        ["accessKeyIdVar", pair.accessKeyIdVar],
        ["secretAccessKeyVar", pair.secretAccessKeyVar],
        ...(pair.sessionTokenVar !== undefined ? [["sessionTokenVar", pair.sessionTokenVar]] : []),
      ];
      for (let [slot, varName] of slots) {
        let owner = slotOwner.get(varName);
        if (owner === undefined || owner.entry === entry) {
          slotOwner.set(varName, {
            entry,
            slot,
            label,
          });
          continue;
        }
        let incumbentFunctional = isFunctional(owner.entry.pair);
        let entryFunctional = isFunctional(entry.pair);
        let included = reservedVarNames.includes(varName);
        let incumbentSyntheticWins =
          included && owner.entry.synthetic && !entry.synthetic && owner.entry.rank > entry.rank;
        let entrySyntheticWins =
          included && entry.synthetic && !owner.entry.synthetic && entry.rank > owner.entry.rank;
        if (incumbentSyntheticWins) {
          logForDebugging(
            `[sandbox] credentials.awsPairs: '${varName}' is claimed by the higher-precedence inert '${owner.label}' suppressor pair; the '${label}' pair's ${slot} is disabled \u2014 re-signing is unaffected (the pair could not re-sign), and the name stays claimed so implicit auto-pairing stays suppressed`,
          );
          disableSlot(entry, slot);
          continue;
        }
        if (entrySyntheticWins) {
          logForDebugging(
            incumbentFunctional
              ? `[sandbox] credentials.awsPairs: the higher-precedence inert '${label}' suppressor pair takes '${varName}' from the '${owner.label}' pair \u2014 its ${owner.slot} is disabled; SigV4 re-signing with it is deliberately suppressed by policy`
              : `[sandbox] credentials.awsPairs: the higher-precedence inert '${label}' suppressor pair takes '${varName}' from the '${owner.label}' pair; its ${owner.slot} is disabled \u2014 re-signing is unaffected (the pair could not re-sign), and the name stays claimed so implicit auto-pairing stays suppressed`,
            incumbentFunctional
              ? {
                  level: "warn",
                }
              : undefined,
          );
          disableSlot(owner.entry, owner.slot);
          slotOwner.set(varName, {
            entry,
            slot,
            label,
          });
          continue;
        }
        if (entryFunctional && !incumbentFunctional) {
          logForDebugging(
            owner.entry.synthetic
              ? `[sandbox] credentials.awsPairs: '${varName}' also appears in the inert '${owner.label}' suppressor pair; its ${owner.slot} is disabled in favor of the '${label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`
              : `[sandbox] credentials.awsPairs: '${varName}' also appears in the '${owner.label}' pair, which cannot re-sign (unusable member, or disabled earlier in collision resolution); its ${owner.slot} is disabled in favor of the '${label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`,
          );
          disableSlot(owner.entry, owner.slot);
          slotOwner.set(varName, {
            entry,
            slot,
            label,
          });
          continue;
        }
        if (entryFunctional && incumbentFunctional) {
          let detail =
            slot === "sessionTokenVar"
              ? `the '${label}' pair re-signs without a session token`
              : `the '${label}' pair can no longer re-sign, though its other claimed names still suppress implicit auto-pairing`;
          logForDebugging(
            `[sandbox] credentials.awsPairs: '${varName}' fills a slot in both the '${label}' and '${owner.label}' pairs \u2014 each variable can fill exactly one slot, so the '${owner.label}' pair (higher-precedence source, or later entry within one source) keeps it and the '${label}' pair's ${slot} is disabled (${detail}); fix the config`,
            {
              level: "warn",
            },
          );
        } else
          logForDebugging(
            entry.synthetic
              ? `[sandbox] credentials.awsPairs: '${varName}' also appears in the inert '${label}' suppressor pair; its ${slot} is disabled in favor of the '${owner.label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`
              : `[sandbox] credentials.awsPairs: '${varName}' also appears in the '${label}' pair, which cannot re-sign (unusable member, or disabled earlier in collision resolution); its ${slot} is disabled in favor of the '${owner.label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`,
          );
        disableSlot(entry, slot);
      }
    }
    for (let idx = flattened_2.length - 1; idx >= 0; idx--) {
      let entry = flattened_2[idx];
      if (entry === undefined || isFunctional(entry.pair)) continue;
      let pair = entry.pair;
      if (pairVarNames(pair).some((varName) => reservedVarNames.includes(varName))) {
        if (
          (pair.accessKeyIdVar.startsWith(SLOT_COLLISION_SENTINEL) ||
            pair.accessKeyIdVar.startsWith(INVALID_PAIR_SENTINEL)) &&
          getWholeValueMask(pair.secretAccessKeyVar) !== undefined &&
          pairVarNames(pair).some(
            (varName) => varName !== pair.secretAccessKeyVar && reservedVarNames.includes(varName),
          )
        ) {
          logForDebugging(
            `[sandbox] credentials.awsPairs entry '${entry.label}': key-id slot holds a CC-synthesized placeholder but secret '${pair.secretAccessKeyVar}' is still whole-value masked; disabling the pair's secret slot too so sandbox-runtime skips the half-masked re-signing spec silently \u2014 the secret stays masked via its own env entry and the surviving conventional claim keeps implicit auto-pairing suppressed`,
          );
          disableSlot(entry, "secretAccessKeyVar");
        }
        continue;
      }
      logForDebugging(
        `[sandbox] dropping credentials.awsPairs entry '${entry.label}' after slot-collision resolution: its key id or secret slot was disabled and no conventional AWS claim survives, so it can neither re-sign nor suppress implicit auto-pairing`,
      );
      flattened_2.splice(idx, 1);
    }
    for (let entry of flattened_2) {
      let pair = entry.pair;
      if (!isFunctional(pair)) continue;
      let missingSessionToken =
        pair.sessionTokenVar !== undefined && getWholeValueMask(pair.sessionTokenVar) === undefined;
      if (missingSessionToken)
        logForDebugging(
          `[sandbox] credentials.awsPairs entry '${pair.accessKeyIdVar}': session member '${entry.sessionLabel ?? pair.sessionTokenVar}' is not forwarded as a whole-value mask entry (trust-dropped, deny-overridden, never declared, ` +
            "using extract/decode, or disabled by slot-collision resolution) \u2014 " +
            "the pair still re-signs, WITHOUT an x-amz-security-token; temporary-credential requests will fail upstream until the entry is fixed",
          {
            level: "warn",
          },
        );
      warnNarrowerInjectHosts(`credentials.awsPairs entry '${pair.accessKeyIdVar}'`, pair.accessKeyIdVar, [
        pair.secretAccessKeyVar,
        ...(!missingSessionToken && pair.sessionTokenVar !== undefined ? [pair.sessionTokenVar] : []),
      ]);
      warnUnscopedInjectHosts(pair.accessKeyIdVar);
    }
  }
  let mapped = flattened_2.map((entry) => entry.pair);
  {
    let claimedVars = new Set(mapped.flatMap(pairVarNames));
    if (
      !reservedVarNames.some((name) => claimedVars.has(name)) &&
      getWholeValueMask("AWS_ACCESS_KEY_ID") !== undefined &&
      getWholeValueMask("AWS_SECRET_ACCESS_KEY") !== undefined
    ) {
      warnNarrowerInjectHosts("implicit AWS credential pair", "AWS_ACCESS_KEY_ID", [
        "AWS_SECRET_ACCESS_KEY",
        ...(getWholeValueMask("AWS_SESSION_TOKEN") !== undefined ? ["AWS_SESSION_TOKEN"] : []),
      ]);
      warnUnscopedInjectHosts("AWS_ACCESS_KEY_ID", "implicit AWS credential pair");
      if (envVars.has("AWS_SESSION_TOKEN") && getWholeValueMask("AWS_SESSION_TOKEN") === undefined)
        logForDebugging(
          "[sandbox] implicit AWS credential pair: 'AWS_SESSION_TOKEN' is declared but not forwarded as a whole-value mask entry " +
            "(deny-overridden or using extract/decode) \u2014 the auto-paired " +
            "trio still re-signs, WITHOUT an x-amz-security-token; temporary-credential requests will fail upstream until the entry is fixed",
          {
            level: "warn",
          },
        );
    } else if (!reservedVarNames.some((name) => claimedVars.has(name))) {
      let implicitVars = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
      let filtered = implicitVars.filter((name) => getWholeValueMask(name) !== undefined);
      let filtered_2 = implicitVars.filter(
        (name) => getWholeValueMask(name) === undefined && envVars.has(name),
      );
      if (filtered.length === 1 && filtered_2.length === 1)
        logForDebugging(
          `[sandbox] implicit AWS credential pair: '${filtered_2[0]}' is declared but not forwarded as a whole-value mask entry ` +
            "(deny-overridden, trust-dropped, or using extract/decode) \u2014 " +
            "the conventional trio cannot auto-pair, so SigV4 requests using these credentials are not re-signed until the entry is fixed",
          {
            level: "warn",
          },
        );
    }
  }
  let sweepGlob = (path, trusted) =>
    containsGlobChars(path)
      ? [
          path,
          ...expandMaskGlob(path).map((expansion) => {
            addDenyLexical(expansion.canonical, expansion.lexical, trusted);
            return expansion.canonical;
          }),
        ]
      : [path];
  let flattened_3 = [...credentialFiles.entries()]
    .filter(([, entry]) => entry.mode === "deny")
    .flatMap(([path]) => (hasMaskEntries ? sweepGlob(path, isTrustedDeny(path)) : [path]));
  if (relaxedPolicy && flattened_3.length > 0)
    logForDebugging(
      `[sandbox] credential file deny entries (${[...credentialFiles.values()]
        .filter((entry) => entry.mode === "deny")
        .map((entry) => entry.path)
        .join(
          ", ",
        )}) provide no protection under the relaxed filesystem policy \u2014 read-denies are dropped at wrap time; set sandbox.filesystem.disabled: false in user or managed settings (ignored if managed settings pin the filesystem layer) to enforce them`,
      {
        level: "warn",
      },
    );
  let readDenySweep = hasMaskEntries
    ? denyPaths_2.flatMap((denyPath) => {
        let replaced = removeTrailingGlobSuffix(denyPath).replace(trailingSeparatorRe, "");
        let absolute = isAbsolute(replaced)
          ? replaced
          : replaced.startsWith("~")
            ? join(safeProcessCwd(), replaced)
            : resolveAgainstProcessCwd(replaced);
        let trusted = readDenyInRepoSources.has(denyPath);
        if (containsGlobChars(replaced)) {
          let canonical = canonicalizeMaskPath(absolute, trusted);
          addDenyLexical(canonical, canonical, trusted);
          return sweepGlob(canonical, trusted);
        }
        let canonical = canonicalizeMaskPath(absolute, trusted);
        addDenyLexical(canonical, replaced, trusted);
        return [canonical];
      })
    : [];
  if (!maskInert)
    for (let [key, entry] of [...credentialFiles.entries()]) {
      if (entry.mode !== "mask") continue;
      let replaced = removeTrailingGlobSuffix(entry.path).replace(trailingSeparatorRe, "");
      let found = [...flattened_3, ...readDenySweep].find(
        (denyPath) =>
          isDenyCoveredPath(denyPath, key) &&
          !isDenyCovered(denyPath, key) &&
          !denyReachesLiteral(denyPath, replaced) &&
          isTrustedDeny(denyPath),
      );
      if (found !== undefined) {
        logForDebugging(
          `[sandbox] credential file mask for '${entry.path}' dropped: trusted-tier deny '${found}' covers it through a symlink or a relative spelling \u2014 installed as a canonical deny on '${key}' so enforcement cannot be retargeted`,
        );
        credentialFiles.set(key, {
          path: key,
          mode: "deny",
        });
      }
    }
  let findShadowingDeny = (key, literal) =>
    maskInert
      ? undefined
      : (flattened_3.find(
          (denyPath) =>
            !containsGlobChars(denyPath) &&
            isDenyCoveredPath(denyPath, key) &&
            !isDenyCovered(denyPath, key) &&
            denyReachesLiteral(denyPath, literal),
        ) ??
        readDenySweep.find(
          (denyPath) =>
            !containsGlobChars(denyPath) &&
            isDenyCoveredPath(denyPath, key) &&
            !isDenyCovered(denyPath, key) &&
            denyReachesLiteral(denyPath, literal),
        ));
  let credentials = hasCredentials
    ? {
        files: [...credentialFiles.entries()]
          .filter(([key, entry]) => {
            if (entry.mode !== "mask") return true;
            let shadowing = findShadowingDeny(
              key,
              removeTrailingGlobSuffix(entry.path).replace(trailingSeparatorRe, ""),
            );
            if (shadowing === undefined) return true;
            logForDebugging(
              `[sandbox] credential file mask for '${entry.path}' dropped: shadowed by deny on '${shadowing}'`,
            );
            return false;
          })
          .map(([key, entry]) => {
            if (
              entry.mode === "mask" &&
              !maskInert &&
              [...flattened_3, ...readDenySweep].some(
                (denyPath) =>
                  isDenyCoveredPath(denyPath, key) &&
                  (isDenyCovered(denyPath, key) ||
                    containsGlobChars(denyPath) ||
                    !denyReachesLiteral(
                      denyPath,
                      removeTrailingGlobSuffix(entry.path).replace(trailingSeparatorRe, ""),
                    )),
              )
            ) {
              logForDebugging(
                `[sandbox] credential file mask for '${entry.path}' kept over a covering deny it cannot be shadowed by (allowRead-re-opened or symlink-spelled) WITHOUT injection or extract (whole-file sentinel)`,
              );
              return {
                path: entry.path,
                mode: "mask",
                injectHosts: [],
              };
            }
            return entry;
          }),
        envVars: [...envVars.values()],
        ...(allowPlaintextInject !== undefined && {
          allowPlaintextInject,
        }),
        ...(mapped.length > 0 && {
          awsPairs: mapped,
        }),
        ...(sigv4 !== undefined && {
          sigv4,
        }),
      }
    : undefined;
  let lateSymlinkGrantDenyRoots =
    acceptedGrants.length > 0
      ? normalizeCaseForComparison_2([
          ...denyRootSpellingsLazy(),
          ...(credentials?.files ?? [])
            .flatMap((credential) => canonicalizeSandboxPath(credential.path) ?? [])
            .flatMap((spelling) => resolveReadDenyRoot(spelling).spellings),
        ])
      : [];
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  let ripgrep = getSandboxSettingsSources()
    .map((settings) => settings?.sandbox?.ripgrep)
    .find((value) => value !== undefined) ?? {
    command: rgPath,
    args: rgArgs,
    argv0,
  };
  let scrubOnly = isScrubOnlySandboxMode();
  let network = scrubOnly
    ? {
        allowedDomains: undefined,
        deniedDomains: [],
        ...ALLOW_ALL_UNIX_SOCKETS,
      }
    : {
        allowedDomains,
        deniedDomains,
        ...(Object.keys(reasons).length > 0 && {
          deniedDomainReasons: reasons,
        }),
        strictAllowlist: strictAllowlist || undefined,
        ...(evalConfinedEnv ? {} : getNetworkAllowances(settings.sandbox?.network)),
      };
  let tlsTerminateSetting = getTlsTerminateSetting();
  let enforcesAllowlist = false;
  if (!scrubOnly && network.tlsTerminate === undefined && tlsTerminateSetting !== undefined)
    if (getPlatform() === "windows") {
      let caCertPaths = getCaCertPaths(resolveWindowsTlsTerminateCaSource());
      if (caCertPaths !== undefined) network.tlsTerminate = caCertPaths;
      else
        logForDebugging(
          "[sandbox] settings tlsTerminate has no CA paths and the managed sandbox CA is gated off on Windows \u2014 ignoring tlsTerminate (an ephemeral CA cannot pass srt-win user trust-ca)",
          {
            level: "warn",
          },
        );
    } else network.tlsTerminate = tlsTerminateSetting;
  let allWriteRoots = flattenWrapWriteRoots(
    splitBindableWriteRoots([...getDefaultWritePaths(), ...allowWrite], new Set([dir_2, dir])),
  );
  let extraMissingDirs = hops.missing === null ? [] : [dirname(hops.missing.name)];
  let bindableBaseDirs = new Set([dir_2, dir]);
  let userWriteRoots = new Set(
    splitBindableWriteRoots([...userTierAdditionalDirs], bindableBaseDirs).bindable,
  );
  let adminWriteRoots = splitBindableWriteRoots(
    [...getDefaultWritePaths(), ...extraAllowWrite],
    bindableBaseDirs,
  );
  let filtered_3 = [...allowWrite, ...writeGrantsWithoutBase]
    .map((path) => splitBindableWriteRoots([path], bindableBaseDirs))
    .filter((split) => !split.bindable.every((root) => userWriteRoots.has(root)));
  let combined = filtered_3.flatMap(flattenWrapWriteRoots).concat(flattenWrapWriteRoots(adminWriteRoots));
  let any = filtered_3.some((hasUndecidable) => hasUndecidable.hasUndecidableEntry);
  let filtered_4 = hops.links.filter(
    (link) =>
      any ||
      (link.isLive ? combined : allWriteRoots).some((root) =>
        isPathWithin(root, dirname(link.path), {
          foldCase: true,
        }),
      ),
  );
  let lateDenyDirs = normalizeCaseForComparison_2([
    ...filtered_4.map((link) => dirname(link.path)),
    ...(hops.missing?.isUnreadable === true ? extraMissingDirs : []),
  ]);
  let neverDenyRoots = normalizeCaseForComparison_2([
    dir_2,
    dir,
    homedir(),
    resolveExistingPrefix(homedir())?.path ?? homedir(),
    ...adminWriteRoots.bindable,
    ...userWriteRoots,
  ]);
  for (let dir of lateDenyDirs)
    if (!(
      (existingPrefix?.exists === true &&
        isSameDirOrAbove(dir, configDirReal, {
          orAbove: false,
        })) ||
      neverDenyRoots.some((root) =>
        isSameDirOrAbove(dir, root, {
          orAbove: true,
        }),
      )
    ))
      addDeny(dir, false, true);
  adapterState.lateSymlinkGrantCandidates = acceptedGrants;
  adapterState.lateSymlinkGrantDenyRoots = lateSymlinkGrantDenyRoots;
  adapterState.lateSymlinkGrantProfile = gitHome;
  let realPathMemo = new Map();
  let allowGlobBases = isPatternWriteDenyTwinsEnabled();
  let unlistableWorktreesGate = isUnlistableWorktreesDenyEnabled();
  let filesystemConfig = {
    denyRead: normalizeCaseForComparison_2(
      addRealPathDenyTwins(denyPaths_2, "read", realPathMemo, false, false),
    ),
    allowRead: normalizeCaseForComparison_2(denyRead),
    allowWrite: normalizeCaseForComparison_2(allowWrite),
    denyWrite: normalizeCaseForComparison_2(
      addRealPathDenyTwins(denyPaths, "write", realPathMemo, allowGlobBases, unlistableWorktreesGate),
    ),
    ...(getEffectiveFilesystemPolicy() === "relaxed" && {
      disabled: true,
    }),
  };
  let gitRoots = new Set();
  for (let dir_3 of new Set(allowExtraPlaces ? [dir_2, dir] : [dir_2]))
    for (let gitDir of [findGitRoot(dir_3), findCanonicalGitRoot(dir_3)])
      if (gitDir !== null) gitRoots.add(gitDir);
  let safeDirs = new Set();
  for (let gitDir of gitRoots)
    try {
      safeDirs.add(realpathSync(gitDir));
    } catch {}
  let config = {
    network,
    filesystem: filesystemConfig,
    ignoreViolations: adminMandate ? mergeIgnoreViolations() : settings.sandbox?.ignoreViolations,
    credentials,
    enableWeakerNestedSandbox:
      isScrubEnabled() && isScrubSandboxAvailable()
        ? false
        : adminMandate
          ? trustedBooleanUnlessFalse(
              settings.sandbox?.enableWeakerNestedSandbox,
              (settings) => settings.enableWeakerNestedSandbox,
            )
          : settings.sandbox?.enableWeakerNestedSandbox,
    allowNestedUserNamespaces:
      isScrubEnabled() && isScrubSandboxAvailable()
        ? false
        : trustedBooleanUnlessFalse(
            settings.sandbox?.allowNestedUserNamespaces,
            (settings) => settings.allowNestedUserNamespaces,
          ),
    enableWeakerNetworkIsolation: adminMandate
      ? trustedBooleanUnlessFalse(
          settings.sandbox?.enableWeakerNetworkIsolation,
          (settings) => settings.enableWeakerNetworkIsolation,
        )
      : settings.sandbox?.enableWeakerNetworkIsolation,
    allowAppleEvents: booleanOrUndefined(readSandboxSetting(["allowAppleEvents"])),
    ...(safeDirs.size > 0 && {
      git: {
        safeDirectories: [...safeDirs],
      },
    }),
    ripgrep,
    seccomp: seccompExecPlan(),
    bwrapPath: getSandboxBwrapPath(),
    socatPath: getSandboxSocatPath(),
    ...(getPlatform() === "windows" && {
      windows: {
        sandboxUser: CLAUDECODESANDBOX,
        srtWin: {
          path: process.execPath,
        },
      },
    }),
  };
  let judgeMemo = {};
  for (let dirPath of deferredDirs)
    if (!judgeFileActSafe("create", dirPath, true, judgeMemo, config)) makeDir(dirPath);
  for (let parts of deferredFiles)
    if (!judgeFileActSafe("create", join(...parts), true, judgeMemo, config)) createFileAtChain(...parts);
  let gitDirsDenied = false;
  for (let parts of deferredGitDirs) {
    let [gitDir] = parts;
    let dirPath = join(...parts);
    let judgement = judgeFileAct("create", dirPath, true, judgeMemo, config);
    let shouldDeny = true;
    if (judgement === false) shouldDeny = gitPathExists(...parts);
    else if (judgement === "outside_write_roots") {
      let scrubWriteRoots = getScrubWriteRoots(judgeMemo, () => allBindableWriteRoots(config));
      let existingPrefix = resolveExistingPrefix(gitDir);
      shouldDeny =
        scrubWriteRoots === null ||
        existingPrefix === null ||
        scrubWriteRoots.some((scrubWriteRoot) => isPathPrefixOf(scrubWriteRoot, existingPrefix.path));
    }
    if (shouldDeny && getPlatform() === "macos") {
      addDeny(gitDir, false, true);
      gitDirsDenied = true;
    }
  }
  if (gitDirsDenied)
    filesystemConfig.denyWrite = normalizeCaseForComparison_2(
      addRealPathDenyTwins(denyPaths, "write", realPathMemo, allowGlobBases, unlistableWorktreesGate),
    );
  getSandboxAdapterState().builtConfigEnforcesAllowlist.set(config, enforcesAllowlist);
  getSandboxAdapterState().builtConfigConfiguredDenies.set(config, configuredDenySpellings);
  if (gbRules !== undefined) getSandboxAdapterState().builtConfigGbHostRules.set(config, gbRules);
  getSandboxAdapterState().builtConfigSshStoreDenied.set(config, denySshStore);
  getSandboxAdapterState().builtConfigPluginToolStagingDenied.set(config, denyPluginToolStaging);
  getSandboxAdapterState().builtConfigPatternWriteDenyTwins.set(config, allowGlobBases);
  getSandboxAdapterState().builtConfigRelativeWriteDenyTwins.set(config, unlistableWorktreesGate);
  getSandboxAdapterState().builtConfigUnlistableWorktreesDenied.set(config, denyUnlistableWorktrees_2);
  getSandboxAdapterState().builtConfigLegacyRemoteDirsDenied.set(config, denyRemoteDirs);
  if (denyNestedGitConfigLock !== undefined)
    getSandboxAdapterState().builtConfigNestedGitConfigLockDeny.set(config, denyNestedGitConfigLock);
  getSandboxAdapterState().builtConfigGitInfoDirsPinned.set(config, pinGitInfoDirs_2);
  let any_2 = resolution?.resolved.some((entry) => entry.lookAgain !== undefined);
  let maskPaths = new Set(
    (config.credentials?.files ?? []).flatMap((credential) => {
      if (credential.mode !== "mask" || isSentinelOnlyMask(credential)) return [];
      let canonical = canonicalizeSandboxPath(credential.path);
      return canonical === undefined ? [credential.path] : [credential.path, canonical];
    }),
  );
  let isMaskRoot = (entry) =>
    maskPaths.has(entry.root) || maskPaths.has(canonicalizeSandboxPath(entry.root) ?? entry.root);
  let markMasks = (entries) =>
    entries.map((entry) =>
      isMaskRoot(entry)
        ? {
            ...entry,
            isMask: true,
          }
        : entry,
    );
  let markedEntries = markMasks(maskSweepEntries);
  let any_3 = markedEntries.some((entry) => entry.isMask);
  getSandboxAdapterState().builtConfigReadDenyRootResolution.set(
    config,
    any_2 || markedEntries.length > 0
      ? {
          resolution:
            any_2 && resolution
              ? {
                  key: resolution.key,
                  resolved: markMasks(resolution.resolved),
                }
              : undefined,
          forwardedUntrustedGrants: repoGrants,
          maskSweepEntries: markedEntries,
          trustedDenyRoots: any_3
            ? [
                ...(trustedDenyRoots ?? getTrustedReadDenyRoots()).filter((root) => !maskPaths.has(root)),
                ...(resolution?.resolved ?? []).flatMap((entry) =>
                  isMaskRoot(entry) ? [] : entry.spellings,
                ),
              ]
            : [],
        }
      : undefined,
  );
  return config;
}
//@ chunk-qg41pqt6.js:996015-997357 placement
/**
 * 把构建好的配置装入 sandbox-runtime（SandboxManager.updateConfig），同步记录该配置对应的 GrowthBook 规则/deny 开关/读禁止根解析等附加状态。
 */
function installSandboxConfig(config) {
  try {
    SandboxManager_2.updateConfig(config);
  } catch (error) {
    throw describeUnreadableSandboxError(error, "configNotInstalled");
  }
  if (getSandboxAdapterState().builtConfigConfiguredDenies.has(config))
    getSandboxAdapterState().storedDenyListsMayBeShort = false;
  adoptReadDenyRootResolution(config);
  recordWrapWriteRoots(config);
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.gbHostRulesApplied =
    sandboxAdapterState.builtConfigGbHostRules.get(config) ?? sandboxAdapterState.gbHostRulesApplied;
  sandboxAdapterState.sshStoreDenyApplied =
    sandboxAdapterState.builtConfigSshStoreDenied.get(config) ?? sandboxAdapterState.sshStoreDenyApplied;
  sandboxAdapterState.pluginToolStagingDenyApplied =
    sandboxAdapterState.builtConfigPluginToolStagingDenied.get(config) ??
    sandboxAdapterState.pluginToolStagingDenyApplied;
  sandboxAdapterState.patternWriteDenyTwinsApplied =
    sandboxAdapterState.builtConfigPatternWriteDenyTwins.get(config) ??
    sandboxAdapterState.patternWriteDenyTwinsApplied;
  sandboxAdapterState.relativeWriteDenyTwinsApplied =
    sandboxAdapterState.builtConfigRelativeWriteDenyTwins.get(config) ??
    sandboxAdapterState.relativeWriteDenyTwinsApplied;
  sandboxAdapterState.unlistableWorktreesDenyApplied =
    sandboxAdapterState.builtConfigUnlistableWorktreesDenied.get(config) ??
    sandboxAdapterState.unlistableWorktreesDenyApplied;
  sandboxAdapterState.legacyRemoteDirsDenyApplied =
    sandboxAdapterState.builtConfigLegacyRemoteDirsDenied.get(config) ??
    sandboxAdapterState.legacyRemoteDirsDenyApplied;
  sandboxAdapterState.nestedGitConfigLockDenyApplied =
    sandboxAdapterState.builtConfigNestedGitConfigLockDeny.get(config) ??
    sandboxAdapterState.nestedGitConfigLockDenyApplied;
  sandboxAdapterState.gitInfoDirPinApplied =
    sandboxAdapterState.builtConfigGitInfoDirsPinned.get(config) ?? sandboxAdapterState.gitInfoDirPinApplied;
  sandboxAdapterState.installedConfiguredDenies =
    sandboxAdapterState.builtConfigConfiguredDenies.get(config) ??
    sandboxAdapterState.installedConfiguredDenies;
  let enforcesAllowlist = sandboxAdapterState.builtConfigEnforcesAllowlist.get(config) ?? false;
  if (sandboxAdapterState.initializationPromise === undefined)
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist = enforcesAllowlist;
  else sandboxAdapterState.installsSinceInitializeStartedAllEnforce &&= enforcesAllowlist;
}
//@ chunk-qg41pqt6.js:997357-997680 placement
function adoptReadDenyRootResolution(config) {
  let sandboxAdapterState = getSandboxAdapterState();
  if (sandboxAdapterState.builtConfigReadDenyRootResolution.has(config)) {
    sandboxAdapterState.installedReadDenyRootResolution =
      sandboxAdapterState.builtConfigReadDenyRootResolution.get(config);
    sandboxAdapterState.pendingReadDenyFallback = undefined;
    sandboxAdapterState.readDenyRootLookCursor = 0;
    sandboxAdapterState.readDenyRootLookFinishedAt = undefined;
    sandboxAdapterState.readDenyRootLookFailureReported = false;
    sandboxAdapterState.readDenyRootWithinSandboxReach.clear();
  }
}
//@ chunk-qg41pqt6.js:997680-997809 placement
function cloneScrubParent(parent) {
  return {
    real: parent.real,
    literalPhysical: parent.literalPhysical,
    inode:
      parent.inode === null
        ? null
        : {
            dev: parent.inode.dev,
            ino: parent.inode.ino,
          },
  };
}
//@ chunk-qg41pqt6.js:997809-1000640 placement
/**
 * 沙箱适配层的进程级状态（GrowthBook 配置、会话允许主机、deny 真实路径、嵌套 git 配置锁等）。
 */
class SandboxAdapterState {
  tenguSandboxGbConfig = memoizeAlias(getDefaultSandboxGbConfig);
  sessionAllowedHosts = new Set();
  realPathsOfDenies = {
    read: new Map(),
    write: new Map(),
  };
  realPathTwins = "unlisted";
  startsFailed = 0;
  nestedGitConfigLockDenyApplied = undefined;
  builtConfigNestedGitConfigLockDeny = new WeakMap();
  initializationPromise = undefined;
  initializedWithTlsTerminate = false;
  installedFilterRequestEnforcesAllowlist = false;
  installsSinceInitializeStartedAllEnforce = true;
  builtConfigEnforcesAllowlist = new WeakMap();
  settingsSubscriptionCleanup = undefined;
  sandboxDisabledThisSession = false;
  initFailureReason = undefined;
  initFailureCode = "unknown";
  refusedOverWorkingFolder = false;
  startedOnce = false;
  windowsLoopbackAtStart = undefined;
  askCallback = undefined;
  hardLinkedDenyTargets = undefined;
  selfExecGrantAttempt = undefined;
  builtConfigConfiguredDenies = new WeakMap();
  installedConfiguredDenies = undefined;
  nativeDenies = undefined;
  deniesGivenToSrtWinAtStart = undefined;
  lateOwnDeniesLogged = false;
  lateOwnDeniesPassed = new Set();
  nativeDenyRenewals = {};
  storedDenyListsMayBeShort = false;
  droppedRepoExcludedCommandsLogged = false;
  droppedRepoNetworkAllowancesLogged = false;
  droppedRepoFilesystemGrantsLogged = false;
  droppedRepoAllowedDomainsLogged = false;
  deniesDroppedForAnotherHost = [];
  configBuildFailed = false;
  runtimeInitialized = false;
  sandboxRuntimeIsUp = false;
  permissionRemovalAnnounced = false;
  trustedReadDenyRootResolution = undefined;
  builtConfigReadDenyRootResolution = new WeakMap();
  installedReadDenyRootResolution = undefined;
  readDenyRootFirstLookDue = false;
  readDenyRootLookCursor = 0;
  readDenyRootLookFinishedAt = undefined;
  readDenyRootLookFailureReported = false;
  readDenyRootReachSeenAtLook = 0;
  readDenyRootWithinSandboxReach = new Map();
  pendingReadDenyFallback = undefined;
  fsReadConfigMemo = undefined;
  gbHostRulesMemo = undefined;
  gbHostRulesApplied = undefined;
  builtConfigGbHostRules = new WeakMap();
  sshStoreDenyApplied = undefined;
  builtConfigSshStoreDenied = new WeakMap();
  pluginToolStagingDenyApplied = undefined;
  builtConfigPluginToolStagingDenied = new WeakMap();
  patternWriteDenyTwinsApplied = undefined;
  builtConfigPatternWriteDenyTwins = new WeakMap();
  relativeWriteDenyTwinsApplied = undefined;
  builtConfigRelativeWriteDenyTwins = new WeakMap();
  unlistableWorktreesDenyApplied = undefined;
  builtConfigUnlistableWorktreesDenied = new WeakMap();
  legacyRemoteDirsDenyApplied = undefined;
  builtConfigLegacyRemoteDirsDenied = new WeakMap();
  gitInfoDirPinApplied = undefined;
  builtConfigGitInfoDirsPinned = new WeakMap();
  bareGitRepoScrubPaths = new Map();
  scrubParentMemo = new Map();
  scrubParentLastKnown = new Map();
  symlinkedDenyScrubPaths = [];
  wrapCwdsThisSession = new Set();
  wrapBindableWriteRootsThisSession = new Set();
  wrapOutOfTreeTargetsThisSession = new Set();
  undecidableWrapThisSession = false;
  unconfinedWrapThisSession = false;
  builtAsThinClient = false;
  bareGitRepoScrubPathsVouchedLocally = null;
  denyLiteralSymlinkCandidates = [];
  devModsRoots = new Map();
  lateSymlinkGrantCandidates = [];
  lateSymlinkGrantDenyRoots = [];
  lateSymlinkGrantProfile = undefined;
  runtimeAllowWriteDirectories = new Map();
  dependencyProbeGeneration = 0;
  checkDependenciesProbe = memoizeAlias(checkDependencies_2);
  baseIsSupportedPlatform = memoizeAlias(() => SandboxManager_2.isSupportedPlatform());
}
//@ chunk-qg41pqt6.js:1000640-1000650 placement
var sandboxAdapterState;
var sandboxAdapterStatePromise;
//@ chunk-qg41pqt6.js:1000650-1000683 placement
/**
 * 取沙箱适配层的单例状态（初始化 Promise、失败原因、已安装配置的各类附加信息、读禁止复查状态、Windows 原生 deny 等）。
 */
function getSandboxAdapterState() {
  return (sandboxAdapterState ??= new SandboxAdapterState());
}
//@ chunk-qg41pqt6.js:1000683-1000808 placement
function getProcessSandboxState() {
  if (!sandboxAdapterStatePromise)
    sandboxAdapterStatePromise = {
      osLinkedRootRealpaths: new Map(),
      stagingDirGitignoreFired: false,
      windowsStartBeganAtMs: createStore(null),
    };
  return sandboxAdapterStatePromise;
}
//@ chunk-qg41pqt6.js:1000808-1000906 placement
/**
 * 运行时把某目录加入沙箱可写列表（按 key 登记），变化时 refreshConfig。
 */
function addSandboxAllowWriteDirectory(dir, sessionKey) {
  let { runtimeAllowWriteDirectories } = getSandboxAdapterState();
  if (runtimeAllowWriteDirectories.get(sessionKey) === dir) return;
  runtimeAllowWriteDirectories.set(sessionKey, dir);
  refreshConfig();
}
//@ chunk-qg41pqt6.js:1000906-1000974 placement
/**
 * 从运行时可写列表移除某 key 的目录，有变化时 refreshConfig。
 */
function removeSandboxAllowWriteDirectory(sessionKey) {
  if (getSandboxAdapterState().runtimeAllowWriteDirectories.delete(sessionKey)) refreshConfig();
}
//@ chunk-qg41pqt6.js:1000974-1001018 placement
function isEntryNewForSet(path, knownSet) {
  return knownSet !== null && !knownSet.has(path);
}
//@ chunk-qg41pqt6.js:1001018-1001386 placement
/**
 * 把删除策略名映射为具体选项（是否整目录、是否删除空目录、HEAD 残留时是否整目录）。
 */
function getRemovalPolicy(removal) {
  switch (removal) {
    case "file":
      return {
        wholeFolder: false,
        thenEmptyFolder: false,
        wholeIfAHeadSurvives: false,
      };
    case "file_or_empty_folder":
      return {
        wholeFolder: false,
        thenEmptyFolder: true,
        wholeIfAHeadSurvives: false,
      };
    case "all_if_a_head_survives":
      return {
        wholeFolder: false,
        thenEmptyFolder: true,
        wholeIfAHeadSurvives: true,
      };
    case "all":
      return {
        wholeFolder: true,
        thenEmptyFolder: false,
        wholeIfAHeadSurvives: false,
      };
  }
}
//@ chunk-qg41pqt6.js:1001386-1001485 placement
function logSandboxDebug(message, level = "debug") {
  try {
    logForDebugging(`[Sandbox] ${message}`, {
      level,
    });
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "scrubOutcomeNotLogged");
  }
}
//@ chunk-qg41pqt6.js:1001485-1001564 placement
function logSandboxOutcome(outcome) {
  try {
    logFeatureSad("sandbox_exec", outcome);
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "scrubOutcomeNotLogged");
  }
}
//@ chunk-qg41pqt6.js:1001564-1001760 placement
var SCRUB_NAME_LABELS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-qg41pqt6.js:1001564", () => {
  SCRUB_NAME_LABELS = new Map([
    ["HEAD", "head"],
    [".git", "dot_git"],
    ["objects", "objects"],
    ["refs", "refs"],
    ["commondir", "commondir"],
    ["config.lock", "config_lock"],
    ["config.worktree.lock", "config_worktree_lock"],
  ]);
});
//@ chunk-qg41pqt6.js:1001760-1001876 placement
function logBareRepoScrubRemoval(path, kind) {
  let nameLabel = SCRUB_NAME_LABELS.get(basename(path)) ?? "other_name";
  let kindSuffix = kind === "plain" ? "" : `_${kind}`;
  logSandboxOutcome(`bare_repo_scrub_removed_${nameLabel}${kindSuffix}`);
}
//@ chunk-qg41pqt6.js:1001876-1003691 placement
/**
 * 命令执行后清扫被植入的条目（裸 git 仓库路径、deny 路径下新建的文件），按平台移除或置 000。
 */
function scrubPlantedBareRepoIndicators(
  extra = {
    paths: [],
    pathsVouchedLocally: null,
  },
) {
  let isPosix = getPlatform() !== "windows";
  let state = getSandboxAdapterState();
  let bareGitRepoScrubPaths = state.bareGitRepoScrubPaths;
  let entries =
    extra.paths.length > 0
      ? [
          ...bareGitRepoScrubPaths.values(),
          ...extra.paths.filter((entry) => !bareGitRepoScrubPaths.has(entry.path)),
        ]
      : bareGitRepoScrubPaths.values();
  let checked = {};
  let deferred = [];
  for (let entry of entries) {
    let path = entry.path;
    let entryName = path.slice(path.lastIndexOf(sep) + 1);
    let removal = bareGitRepoScrubPaths.get(path)?.removal;
    let vouched =
      (removal === undefined || isEntryNewForSet(path, state.bareGitRepoScrubPathsVouchedLocally)) &&
      (!extra.paths.some((path_2) => path_2.path === path) ||
        isEntryNewForSet(path, extra.pathsVouchedLocally));
    if (judgeFileActSafe("delete", path, vouched, checked)) continue;
    try {
      if (
        lstatSync(path, {
          throwIfNoEntry: false,
        }) === undefined
      )
        continue;
    } catch {}
    let removal_2 = removal ?? "file";
    let policy = getRemovalPolicy(
      (entryName === "HEAD" || entryName === ".git") &&
        (removal_2 === "all" || removal_2 === "all_if_a_head_survives")
        ? "file_or_empty_folder"
        : removal_2,
    );
    let outcome = withVerifiedScrubParent(
      entry,
      `scrub of planted ${entryName}`,
      isPosix,
      (parentBase, canUnlink, label) =>
        scrubBareRepoIndicator(entry, entryName, policy, parentBase, canUnlink, label, isPosix),
    );
    if (typeof outcome === "string")
      deferred.push({
        entry,
        outcome,
      });
  }
  for (let { entry, outcome } of deferred) {
    let path = entry.path;
    let entryName = path.slice(path.lastIndexOf(sep) + 1);
    if (
      withVerifiedScrubParent(
        entry,
        `scrub of planted ${entryName}`,
        isPosix,
        (parentDir, isRecordedParent, label) => {
          let headPath = join(dirname(path), "HEAD");
          if (!isFileOrRefsLink(classifyHeadEntry(join(parentDir, "HEAD")))) {
            logSandboxDebug(outcome);
            return true;
          }
          let headNote = `${headPath} still stands, and with it git could take ${dirname(path)} for a repository`;
          try {
            if (isPosix) restoreOwnerDirMode(parentDir, label);
            let quarantineName;
            let quarantineOutcome = quarantinePlantedEntry(
              parentDir,
              entryName,
              label,
              isRecordedParent,
              (name) => {
                quarantineName = name;
              },
            );
            if (!entry.unlinkable && quarantineOutcome === "quarantined")
              reportUnclassifiedIndicatorMoved(label, entryName, quarantineName);
            logSandboxDebug(
              quarantineOutcome === "quarantined"
                ? `scrub moved ${path} aside whole: ${headNote}`
                : quarantineOutcome === "removed"
                  ? `scrub removed ${path}: ${headNote}`
                  : quarantineOutcome === "gone"
                    ? `scrub found nothing at ${path} to move aside; ${headPath} still stands without it`
                    : `${outcome}. Because ${headPath} still stands and git could take ${dirname(path)} for a repository, the scrub tried to move ${path} aside whole; that failed too, so ${path} ${quarantineOutcome === "neutralized" ? "was made unreadable in place" : "is left as it is"}`,
              quarantineOutcome === "gone" ? "debug" : "warn",
            );
            if (quarantineOutcome === "removed") logBareRepoScrubRemoval(path, "beside_head");
          } catch (error) {
            logSandboxDebug(
              `${outcome}. Because ${headPath} still stands and git could take ${dirname(path)} for a repository, the scrub tried to move ${path} aside whole; that failed too: ${getErrnoCode(error) ?? "no code"}`,
              "warn",
            );
            logSandboxOutcome("bare_repo_scrub_remove_failed");
          }
          return true;
        },
      ) === undefined
    )
      logSandboxDebug(outcome);
  }
}
//@ chunk-qg41pqt6.js:1003691-1004195 placement
/**
 * 上报无法在构建配置时分类的标记文件被移到旁边（而非删除）。
 */
function reportUnclassifiedIndicatorMoved(label, entryName, quarantineName) {
  reportSandboxErrorUnderStandIn(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[Sandbox] ${label}: ${entryName} could not be checked when the sandbox configuration was last built, so it was moved aside as ${quarantineName ?? `${entryName}${QUARANTINE_PREFIX}<hex>`} rather than removed; if it is yours, rename it back after this session ends; while the session runs, anything that reappears at that name is treated as planted.`,
      "sandbox: post-command scrub moved aside an indicator it could not classify at config build",
    ),
    "unclassifiedIndicatorMovedAside",
  );
  logSandboxOutcome("scrub_unclassified_indicator_quarantined");
}
//@ chunk-qg41pqt6.js:1004195-1004656 placement
/**
 * 在已验证的父目录下执行清理回调：非 POSIX 直接用父路径；父目录未解析或验证失败时拒绝并打点；成功后传入可用的基路径与是否可直接删除，结束时关闭目录句柄。
 */
function withVerifiedScrubParent(entry, label, isPosix, runScrub) {
  let { path, parent, unlinkable } = entry;
  if (!isPosix) return runScrub(dirname(path), unlinkable, label);
  if (parent.real === null) {
    logSandboxDebug(`${label}: parent of ${path} did not resolve at config build; refusing`, "error");
    logSandboxOutcome("bare_repo_scrub_refused_unresolved");
    return;
  }
  let opened = openVerifiedScrubParent(
    dirname(path),
    label,
    parent.real,
    parent.literalPhysical ?? undefined,
    parent.inode,
  );
  if (!opened.ok) {
    logSandboxOutcome(
      opened.refusedNonCanonical
        ? "bare_repo_scrub_refused_noncanonical"
        : "bare_repo_scrub_refused_unavailable",
    );
    return;
  }
  try {
    return runScrub(opened.base, opened.recorded && unlinkable, label);
  } finally {
    opened.close();
  }
}
//@ chunk-qg41pqt6.js:1004656-1004767 placement
function classifyRemovalTarget(entryPath) {
  try {
    return lstatSync(entryPath).isDirectory() ? "dir" : "remove";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "skip" : "unknown";
  }
}
//@ chunk-qg41pqt6.js:1004767-1005106 placement
/**
 * 清理位置是目录时：策略允许则删除空目录，否则保留；删除失败按策略返回消息或记录。
 */
function removeEmptyPlantedDir(path, entryPath, policy) {
  if (!policy.thenEmptyFolder) {
    logSandboxDebug(`scrub left ${path}: it is a folder, and only a file or link may be removed there`);
    return false;
  }
  try {
    rmdirSync(entryPath);
    logSandboxDebug(`removed planted empty dir: ${path}`);
    logBareRepoScrubRemoval(path, "empty_folder");
    return false;
  } catch (error) {
    let message = `scrub did not remove ${path}: rmdirSync ${getErrnoCode(error) ?? "no code"}`;
    if (policy.wholeIfAHeadSurvives) return message;
    logSandboxDebug(message);
    return false;
  }
}
//@ chunk-qg41pqt6.js:1005106-1006109 placement
/**
 * 清理命令放置的单个裸仓库标记（HEAD、objects、refs 等）：按删除策略判断是目录、文件还是跳过；能直接删除的删除，否则移到旁边或就地处理，并记录日志与打点。
 */
function scrubBareRepoIndicator(entry, entryName, policy, parentBase, canUnlink, label, isPosix) {
  let path = entry.path;
  let entryPath = join(parentBase, entryName);
  try {
    let targetKind = policy.wholeFolder ? "remove" : classifyRemovalTarget(entryPath);
    if (targetKind === "skip") return false;
    if (targetKind === "dir") return removeEmptyPlantedDir(path, entryPath, policy);
    if (isPosix) {
      restoreOwnerDirMode(parentBase, label);
      if (targetKind === "unknown") {
        targetKind = classifyRemovalTarget(entryPath);
        if (targetKind === "unknown") {
          logSandboxDebug(`${label}: cannot examine ${entryName} through the parent; leaving it`, "error");
          logSandboxOutcome("bare_repo_scrub_indicator_unexamined");
          return false;
        }
        if (targetKind === "skip") return false;
        if (targetKind === "dir") return removeEmptyPlantedDir(path, entryPath, policy);
      }
    }
    if (!policy.wholeFolder && canUnlink)
      try {
        rmSync(entryPath, {
          recursive: false,
        });
      } catch (quarantineName) {
        let outcome = getErrnoCode(quarantineName);
        if (outcome !== "EISDIR" && outcome !== "ERR_FS_EISDIR") throw quarantineName;
        return removeEmptyPlantedDir(path, entryPath, policy);
      }
    else {
      let quarantineName;
      let outcome = quarantinePlantedEntry(
        parentBase,
        entryName,
        label,
        canUnlink,
        (name) => {
          quarantineName = name;
        },
        policy.wholeFolder,
      );
      if (outcome === false || outcome === "gone") return false;
      if (outcome === "left") return removeEmptyPlantedDir(path, entryPath, policy);
      if (!entry.unlinkable && outcome === "quarantined")
        reportUnclassifiedIndicatorMoved(label, entryName, quarantineName);
      if (outcome === "quarantined") {
        logSandboxDebug(`scrub moved planted ${path} aside as ${quarantineName ?? "a quarantine name"}`);
        return false;
      }
      if (outcome === "neutralized") return false;
    }
    logSandboxDebug(`scrub removed planted ${path}`);
    logBareRepoScrubRemoval(path, "plain");
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "EISDIR" && errnoCode !== "ERR_FS_EISDIR") {
      logSandboxDebug(`scrub did not remove ${path}: ${errnoCode ?? "no code"}`);
      logSandboxOutcome("bare_repo_scrub_remove_failed");
    }
  }
  return false;
}
//@ chunk-qg41pqt6.js:1006109-1006530 placement
/**
 * 命令结束后检查被拒绝的符号链接路径：仍指向原处的保留，被替换的删除；用户自己改向且不在任何写根内的放过并更新记录。
 */
function scrubSymlinkedDenyPaths(deferredSnapshot) {
  let { symlinkedDenyScrubPaths } = getSandboxAdapterState();
  let spared = [];
  let memo = {};
  for (let index = 0; index < symlinkedDenyScrubPaths.length; index++) {
    let entry = symlinkedDenyScrubPaths[index];
    let verdict = classifySymlinkedDenyPath(entry, memo);
    switch (verdict.kind) {
      case "keep":
        break;
      case "spare":
        spared.push({
          index,
          stillSymlink: verdict.stillSymlink,
          currentHopDirectories: verdict.currentHopDirectories,
          observedEnd: verdict.observedEnd,
          dangling: verdict.dangling,
        });
        break;
      case "delete":
        scrubReplacedSymlinkDeny(entry, verdict, "scrubbed replaced symlinked-deny path");
        break;
    }
  }
  if (spared.length > 0) spareUserRetargetedLinks(spared);
  if (deferredSnapshot !== undefined && deferredSnapshot.length > 0)
    scrubDeferredSymlinkSnapshot(deferredSnapshot);
}
//@ chunk-qg41pqt6.js:1006530-1006675 placement
function scrubDeferredSymlinkSnapshot(entries) {
  let memo = {};
  for (let entry of entries) {
    let verdict = classifySymlinkedDenyPath(entry, memo);
    if (verdict.kind === "delete")
      scrubReplacedSymlinkDeny(entry, verdict, "scrubbed replaced symlinked-deny path (deferred snapshot)");
  }
}
//@ chunk-qg41pqt6.js:1006675-1006840 placement
function getScrubWriteRoots(memo, derive = deriveScrubWriteRoots) {
  if (memo.roots === undefined)
    try {
      memo.roots = derive();
    } catch (error) {
      logForDebugging(`[Sandbox] scrub write-root derivation failed: ${error}`, {
        level: "warn",
      });
      memo.roots = null;
    }
  return memo.roots;
}
//@ chunk-qg41pqt6.js:1006840-1006889 placement
function judgeFileActSafe(action, path, force, rootsMemo, config) {
  return judgeFileAct(action, path, force, rootsMemo, config) !== false;
}
//@ chunk-qg41pqt6.js:1006889-1007009 layout
function judgeFileAct(action, path, force, rootsMemo, config) {
  try {
    return judgeOwnFileAct(action, path, force, rootsMemo, config);
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "fileActNotJudged");
    return action === "create" ? "not_judged" : false;
  }
}
//@ chunk-qg41pqt6.js:1007009-1007587 placement
/**
 * 判断 Claude Code 自己在瘦客户端/云会话后创建或删除某路径是否应被扣下：路径存在性与操作不符时放行；无配置、未受写根约束、无法解析真实路径或写根未知时按规则判定；最后看是否位于写根内。
 */
function judgeOwnFileAct(action, path, force, rootsMemo, config) {
  if (!(isRemoteSessionAvailable() || force) || !supportsPosixSandbox()) return false;
  let exists = true;
  try {
    lstatSync(path);
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR")
      return logFileActVerdict(action, path, true, "lstat_failed");
    exists = false;
  }
  if (exists === (action === "create")) return false;
  let sandboxConfig = config ?? assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (sandboxConfig === undefined) return logFileActVerdict(action, path, true, "no_config");
  let decide = (withhold, reason) => logFileActVerdict(action, path, withhold, reason, sandboxConfig);
  if (isRemoteSessionAvailable() && isWrapUnconfined(sandboxConfig))
    return decide(false, "not_confined_to_write_roots");
  let parentInfo = resolveExistingPrefix(dirname(path));
  if (parentInfo === null) return decide(action === "create", "realpath_failed");
  let writeRoots = getScrubWriteRoots(rootsMemo, () => allBindableWriteRoots(sandboxConfig));
  if (writeRoots === null) return decide(action === "create", "write_roots_unknown");
  let isInside = isInsideWriteRoots(action, parentInfo.path, writeRoots);
  return decide(!isInside, isInside ? "inside_write_roots" : "outside_write_roots");
}
//@ chunk-qg41pqt6.js:1007587-1008021 placement
/**
 * 记录瘦客户端/云会话后 Claude Code 自己的创建或删除操作被放行或扣下的判定，并打点。
 */
function logFileActVerdict(action, path, withheld, why, sandboxConfig) {
  try {
    logForDebugging(
      `[Sandbox] ${isRemoteSessionAvailable() ? "thin client" : "after a cloud session"}: Claude Code's own ${action} of ${path} ${withheld ? "is withheld" : "goes ahead"} (${why})`,
    );
    logEvent("tengu_sandbox_thin_client_file_act_judged", {
      kind: fromEnum(action),
      withheld,
      why: fromEnum(why),
      after_cloud_session: !isRemoteSessionAvailable(),
      live_list_built_as_thin_client: getSandboxAdapterState().bareGitRepoScrubPathsVouchedLocally !== null,
      ...(sandboxConfig && {
        write_roots_enforced: !isWrapUnconfined(sandboxConfig),
      }),
    });
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "fileActVerdictNotLogged");
  }
  return withheld ? why : false;
}
//@ chunk-qg41pqt6.js:1008021-1008380 layout
function classifyLinkTarget(literal, parentDir, resolved) {
  let linkText = readLinkTextSafe(literal);
  let walk =
    linkText === null || isOnForeignMount(linkText, parentDir)
      ? undefined
      : rawPointerPathWalk(linkText, parentDir);
  if (linkText === null || walk === undefined)
    return {
      verdict: "refuse",
    };
  if (!walk.unsafe)
    return {
      verdict: "follow",
      linkText,
    };
  if (
    linkText === resolved &&
    !walk.throughLink &&
    walk.stoppedAt?.kind === "special" &&
    walk.stoppedAt.path === linkText
  )
    try {
      let stats = lstatSync(linkText);
      if (stats.isCharacterDevice() || stats.isBlockDevice())
        return {
          verdict: "keep",
        };
    } catch {}
  return {
    verdict: "refuse",
  };
}
//@ chunk-qg41pqt6.js:1008380-1009210 placement
/**
 * 判断一个被拒绝的符号链接路径在命令后的状态：仍指向原目标或已消失则 keep；不在任何写根可达范围内则 spare（用户改动）；否则 delete。
 */
function classifySymlinkedDenyPath({ literal, resolved, hopDirectories, danglingBaseline }, memo) {
  let isSymlink;
  let danglingTarget;
  let stat = null;
  try {
    let hops = lstatSync(literal);
    stat = hops;
    isSymlink = hops.isSymbolicLink();
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT")
      return {
        kind: "keep",
      };
    isSymlink = false;
  }
  let refused = false;
  let followedText;
  if (isSymlink && isCozyWillowOn()) {
    let walk = classifyLinkTarget(literal, dirname(literal), resolved);
    if (walk.verdict === "keep")
      return {
        kind: "keep",
      };
    refused = walk.verdict === "refuse";
    followedText = walk.verdict === "follow" ? walk.linkText : undefined;
  }
  let realPath;
  if (isSymlink && !refused)
    try {
      realPath = realpathSync(literal);
      if (
        realPath === resolved &&
        (!danglingBaseline || sameStringSet(collectSymlinkHopDirectories(literal, null), hopDirectories))
      )
        return {
          kind: "keep",
        };
    } catch {
      danglingTarget = null;
      try {
        let nextText = followedText ?? readlinkSync(literal);
        danglingTarget = followDanglingLink(literal, nextText);
      } catch {}
      if (
        danglingBaseline &&
        danglingTarget !== null &&
        danglingTarget === resolved &&
        sameStringSet(collectSymlinkHopDirectories(literal, null), hopDirectories)
      )
        return {
          kind: "keep",
        };
    }
  let writeRoots = getScrubWriteRoots(memo);
  if (!isPathPrefixOfAny(hopDirectories, writeRoots)) {
    if (!isSymlink && stat === null)
      return {
        kind: "keep",
      };
    if (refused)
      return {
        kind: "keep",
      };
    if (danglingTarget !== null) {
      let symlinkHopDirectories = collectSymlinkHopDirectories(
        literal,
        danglingTarget !== undefined ? null : (realPath ?? realpathOrNull(literal)),
      );
      if (symlinkHopDirectories !== null && !isPathPrefixOfAny(symlinkHopDirectories, writeRoots))
        return {
          kind: "spare",
          stillSymlink: isSymlink,
          currentHopDirectories: symlinkHopDirectories,
          observedEnd: danglingTarget ?? realPath,
          dangling: danglingTarget !== undefined,
        };
    }
  }
  return {
    kind: "delete",
    stillSymlink: isSymlink,
    observedStat: stat,
  };
}
//@ chunk-qg41pqt6.js:1009210-1010456 placement
/**
 * 清理被替换的拒绝符号链接：在已验证的父目录下重新检查，仍指向原目标则保留；否则移到旁边或删除，并对非链接条目打点。
 */
function scrubReplacedSymlinkDeny(
  { literal, resolved, parent, hopDirectories, danglingBaseline },
  verdict,
  message,
) {
  let isPosix = getPlatform() !== "windows";
  let { stillSymlink, observedStat } = verdict;
  let entryName = basename(literal);
  let label = `scrub of replaced ${entryName}`;
  let parentBase = dirname(literal);
  let isRecorded = !isPosix;
  let entryPath = literal;
  let close = () => {};
  if (isPosix) {
    if (parent.real === null) {
      logSandboxDebug(`${label}: parent of ${literal} did not resolve at config build; refusing`, "error");
      logSandboxOutcome("symlinked_deny_scrub_refused_unresolved");
      return;
    }
    let opened = openVerifiedScrubParent(
      dirname(literal),
      label,
      parent.real,
      parent.literalPhysical ?? undefined,
      parent.inode,
    );
    if (!opened.ok) {
      logSandboxOutcome(
        opened.refusedNonCanonical
          ? "symlinked_deny_scrub_refused_noncanonical"
          : "symlinked_deny_scrub_refused_unavailable",
      );
      return;
    }
    parentBase = opened.base;
    isRecorded = opened.recorded;
    entryPath = join(parentBase, entryName);
    close = opened.close;
    restoreOwnerDirMode(parentBase, label);
    try {
      let stats = lstatSync(entryPath);
      observedStat = stats;
      stillSymlink = stats.isSymbolicLink();
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        close();
        return;
      }
      stillSymlink = false;
    }
    if (stillSymlink) {
      let refused = false;
      if (isCozyWillowOn()) {
        let walk = classifyLinkTarget(entryPath, dirname(literal), resolved);
        if (walk.verdict === "keep") {
          close();
          return;
        }
        refused = walk.verdict === "refuse";
      }
      let unchanged = false;
      if (!refused)
        try {
          unchanged =
            realpathSync(entryPath) === resolved &&
            (!danglingBaseline || sameStringSet(collectSymlinkHopDirectories(literal, null), hopDirectories));
        } catch {}
      if (unchanged) {
        close();
        return;
      }
    }
  }
  try {
    let outcome = quarantinePlantedEntry(parentBase, entryName, label, isRecorded);
    if (outcome === false || outcome === "gone") return;
    logSandboxDebug(`${message}: ${literal}`);
    if (!stillSymlink && outcome === "removed") {
      let kind =
        observedStat === null
          ? "unknown"
          : observedStat.isDirectory()
            ? "directory"
            : observedStat.isFile()
              ? "file"
              : "other";
      logEvent("tengu_sandbox_scrub_removed_non_symlink", {
        kind: fromEnum(kind),
      });
    }
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    if (errnoCode !== "ENOENT") {
      logSandboxDebug(`${label}: not removed (${errnoCode ?? error})`);
      logSandboxOutcome("symlinked_deny_scrub_remove_failed");
    }
  } finally {
    close();
  }
}
//@ chunk-qg41pqt6.js:1010456-1010747 placement
function deriveScrubWriteRoots() {
  let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  let sandboxAdapterState = getSandboxAdapterState();
  if (!config || isWrapUnconfined(config) || sandboxAdapterState.undecidableWrapThisSession) return null;
  let wrapWriteRoots = getWrapWriteRoots(config);
  let remoteSession = isRemoteSessionAvailable();
  if (wrapWriteRoots.hasUndecidableEntry && !remoteSession) return null;
  return normalizeCaseForComparison_2([
    ...sandboxAdapterState.wrapBindableWriteRootsThisSession,
    ...sandboxAdapterState.wrapOutOfTreeTargetsThisSession,
    ...wrapWriteRoots.bindable,
    ...(remoteSession ? [] : wrapWriteRoots.outOfTreeTargets),
  ]);
}
//@ chunk-qg41pqt6.js:1010747-1010834 placement
function allBindableWriteRoots(config) {
  return normalizeCaseForComparison_2([
    ...getSandboxAdapterState().wrapBindableWriteRootsThisSession,
    ...getWrapWriteRoots(config).bindable,
  ]);
}
//@ chunk-qg41pqt6.js:1010834-1010999 placement
function getWrapWriteRoots(config) {
  let cwds = new Set([
    ...getSandboxAdapterState().wrapCwdsThisSession,
    ...(isRemoteSessionAvailable() ? [] : [getCwdState()]),
    getOriginalCwd(),
  ]);
  try {
    cwds.add(process.cwd());
  } catch {}
  return splitBindableWriteRoots([...getDefaultWritePaths(), ...config.filesystem.allowWrite], cwds);
}
//@ chunk-qg41pqt6.js:1010999-1011092 placement
/**
 * 这次包装是否没有真实隔离：平台不是 linux/wsl/macos、filesystem.disabled、本会话已降为无隔离包装或其他强制条件。strict 策略据此拒绝执行。
 */
function isWrapUnconfined(config) {
  return (
    !supportsPosixSandbox() ||
    config.filesystem.disabled === true ||
    getSandboxAdapterState().unconfinedWrapThisSession ||
    scrubReady()
  );
}
//@ chunk-qg41pqt6.js:1011092-1011124 placement
function scrubReady() {
  return isScrubEnabled() && isScrubSandboxAvailable();
}
//@ chunk-qg41pqt6.js:1011124-1011179 layout
function isCozyWillowOn() {
  return readFlagWithOverride("tengu_cozy_willow", {
    safe: true,
  });
}
//@ chunk-qg41pqt6.js:1011179-1011246 placement
function supportsPosixSandbox() {
  let platform = getPlatform();
  return platform === "linux" || platform === "wsl" || platform === "macos";
}
//@ chunk-qg41pqt6.js:1011246-1011592 placement
/**
 * 把允许写入的路径按每个工作目录解析为绝对路径，区分可直接绑定的写根与真实路径落在树外的目标；无法解析时标记存在不可判定条目。
 */
function splitBindableWriteRoots(allowWrite, cwds) {
  let bindable = new Set();
  let outOfTree = new Set();
  let hasUndecidable = false;
  for (let entry of new Set(allowWrite)) {
    let pattern = removeTrailingGlobSuffix(entry);
    if (containsGlobChars(pattern)) pattern = getGlobBaseDirectory(pattern);
    for (let cwd of cwds) {
      let absolute =
        pattern === "~"
          ? homedir()
          : pattern.startsWith("~/")
            ? join(homedir(), pattern.slice(2))
            : resolve(cwd, pattern);
      bindable.add(absolute);
      let resolved = resolveExistingPrefix(absolute);
      if (resolved === null) hasUndecidable = true;
      else if (isSymlinkOutsideBoundary(absolute, resolved.path)) outOfTree.add(resolved.path);
      else bindable.add(resolved.path);
    }
  }
  return {
    bindable: [...bindable],
    outOfTreeTargets: [...outOfTree],
    hasUndecidableEntry: hasUndecidable,
  };
}
//@ chunk-qg41pqt6.js:1011592-1011655 placement
function flattenWrapWriteRoots({ bindable, outOfTreeTargets }) {
  return [...bindable, ...outOfTreeTargets];
}
//@ chunk-qg41pqt6.js:1011655-1011693 placement
function recordSessionWrapWriteRoots() {
  recordWrapWriteRoots(assertMarkedPathsResolved(SandboxManager_2.getConfig()));
}
//@ chunk-qg41pqt6.js:1011693-1012181 placement
/**
 * 记录本会话沙箱包装命令的工作目录与可绑定写根、树外目标；未受约束或无法确定时打标记。
 */
function recordWrapWriteRoots(config) {
  if (!supportsPosixSandbox()) return;
  let sandboxAdapterState = getSandboxAdapterState();
  if (!config || config.filesystem.disabled || scrubReady()) {
    sandboxAdapterState.unconfinedWrapThisSession = true;
    return;
  }
  let cwd;
  try {
    cwd = process.cwd();
  } catch {
    sandboxAdapterState.unconfinedWrapThisSession = true;
    return;
  }
  sandboxAdapterState.wrapCwdsThisSession.add(cwd);
  let { bindable, outOfTreeTargets, hasUndecidableEntry } = splitBindableWriteRoots(
    [...getDefaultWritePaths(), ...config.filesystem.allowWrite],
    new Set([cwd]),
  );
  for (let root of bindable) sandboxAdapterState.wrapBindableWriteRootsThisSession.add(root);
  if (isRemoteSessionAvailable()) return;
  for (let outOfTreeTarget of outOfTreeTargets)
    sandboxAdapterState.wrapOutOfTreeTargetsThisSession.add(outOfTreeTarget);
  sandboxAdapterState.undecidableWrapThisSession ||= hasUndecidableEntry;
}
//@ chunk-qg41pqt6.js:1012181-1012270 placement
function isPathPrefixOfAny(left, right) {
  if (left === null || right === null) return true;
  return left.some((leftItem) => right.some((rightItem) => isPathPrefixOf(rightItem, leftItem)));
}
//@ chunk-qg41pqt6.js:1012270-1012561 placement
function isInsideWriteRoots(action, path, writeRoots) {
  let filtered = path.split("/").filter(Boolean);
  return writeRoots.some((root) => {
    if (isPathPrefixOf(root, path, false)) return true;
    if (!isPathPrefixOf(root, path)) return false;
    let rootInfo = statInodeInfo(root);
    if (rootInfo === null) return false;
    let rootDepth = countWhere(root.split("/"), Boolean);
    let candidateInfo = statInodeInfo(`/${filtered.slice(0, rootDepth).join("/")}`);
    return (
      candidateInfo !== null &&
      rootInfo.dev === candidateInfo.dev &&
      rootInfo.ino === candidateInfo.ino &&
      (action === "delete" || rootInfo.isTold)
    );
  });
}
//@ chunk-qg41pqt6.js:1012561-1012954 placement
/**
 * 判断目录是否与给定路径相同（可选：或在其上方）：有可靠 inode 时按设备与 inode 比较，否则按规范化路径比较。
 */
function isSameDirOrAbove(dir, ancestor, { orAbove }) {
  let dirInfo = statInodeInfo(dir);
  if (dirInfo?.isTold !== true) {
    let normalized = ancestor.normalize("NFC");
    return [
      dir.normalize("NFC"),
      toComparablePath(dir, {
        foldCase: false,
      }),
    ].some(
      (comparable) =>
        isPathWithin(comparable, normalized, {
          alreadyComparable: true,
        }) &&
        (orAbove ||
          isPathWithin(normalized, comparable, {
            alreadyComparable: true,
          })),
    );
  }
  for (let current = ancestor; ; current = dirname(current)) {
    let currentInfo = statInodeInfo(current);
    if (currentInfo !== null && currentInfo.dev === dirInfo.dev && currentInfo.ino === dirInfo.ino) {
      let top = dirname(current);
      while (dirname(top) !== top && statInodeInfo(top)?.isLink === false) top = dirname(top);
      if (dirname(top) === top) return true;
    }
    if (!orAbove || dirname(current) === current) return false;
  }
}
//@ chunk-qg41pqt6.js:1012954-1013100 placement
function statInodeInfo(path) {
  try {
    let stats = lstatSync(path, {
      bigint: true,
    });
    let { dev, ino } = stats;
    return {
      dev,
      ino,
      isTold: dev !== 0n && !isSentinelInode(ino),
      isLink: stats.isSymbolicLink(),
    };
  } catch {
    return null;
  }
}
//@ chunk-qg41pqt6.js:1013100-1013254 placement
function isPathPrefixOf(prefix, path, foldCase = true) {
  let filtered = prefix.split("/").filter(Boolean);
  let filtered_2 = path.split("/").filter(Boolean);
  return (
    filtered.length <= filtered_2.length &&
    filtered.every((segment, otherSegment) =>
      foldCase
        ? isSamePathCaseFolded(segment, filtered_2[otherSegment])
        : segment === filtered_2[otherSegment],
    )
  );
}
//@ chunk-qg41pqt6.js:1013254-1013356 placement
/**
 * 路径大小写折叠：去掉特定字符后 NFD→小写→大写→NFC，用于在大小写不敏感文件系统上比较。
 */
function foldPathCase(path) {
  return path.replace(regExp, "").normalize("NFD").toLowerCase().toUpperCase().normalize("NFC");
}
//@ chunk-qg41pqt6.js:1013356-1013402 placement
function isSamePathCaseFolded(a, b) {
  return a === b || foldPathCase(a) === foldPathCase(b);
}
//@ chunk-qg41pqt6.js:1013402-1013518 placement
function sameStringSet(symlinkHopDirectories, hopDirectories) {
  if (
    symlinkHopDirectories === null ||
    hopDirectories === null ||
    symlinkHopDirectories.length !== hopDirectories.length
  )
    return false;
  let set = new Set(symlinkHopDirectories);
  return hopDirectories.every((item) => set.has(item));
}
//@ chunk-qg41pqt6.js:1013518-1014645 placement
/**
 * 对用户自己改向（不在写根内）的拒绝符号链接：已不是链接的转为字面拒绝候选并移出清理列表；仍是链接的更新记录，新目标加入写拒绝并重新安装沙箱配置。
 */
function spareUserRetargetedLinks(spared) {
  let state = getSandboxAdapterState();
  let newTargets = [];
  let keptLiterals = [];
  for (let index = spared.length - 1; index >= 0; index--) {
    let { index: index_2, stillSymlink, currentHopDirectories, observedEnd, dangling } = spared[index];
    let entry = state.symlinkedDenyScrubPaths[index_2];
    if (!stillSymlink || observedEnd === undefined) {
      state.symlinkedDenyScrubPaths.splice(index_2, 1);
      state.denyLiteralSymlinkCandidates.push(entry.literal);
      keptLiterals.push(entry.literal);
      logForDebugging(
        `[Sandbox] kept ${entry.literal}: replaced by a real file/directory outside every sandbox write root (a user change, not a sandboxed plant); now denied directly`,
      );
      logEvent("tengu_sandbox_scrub_spared_unreachable", {
        still_symlink: false,
      });
      continue;
    }
    let unchanged = observedEnd === entry.resolved;
    entry.resolved = observedEnd;
    entry.hopDirectories = currentHopDirectories;
    entry.danglingBaseline = dangling;
    if (unchanged) continue;
    newTargets.push(observedEnd);
    keptLiterals.push(entry.literal);
    logForDebugging(
      `[Sandbox] kept user-retargeted ${entry.literal} -> ${observedEnd}: nothing it resolves through is inside a sandbox write root (not a sandboxed plant); new target denied for the next command`,
    );
    logEvent("tengu_sandbox_scrub_spared_unreachable", {
      still_symlink: true,
    });
  }
  let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (!config || keptLiterals.length === 0) return;
  let nextConfig = {
    ...config,
    filesystem: {
      ...config.filesystem,
      denyWrite: normalizeCaseForComparison_2([
        ...newTargets,
        ...config.filesystem.denyWrite,
        ...keptLiterals,
      ]),
    },
  };
  state.builtConfigEnforcesAllowlist.set(nextConfig, state.installedFilterRequestEnforcesAllowlist);
  installSandboxConfig(nextConfig);
}
//@ chunk-qg41pqt6.js:1014645-1015700 placement
/**
 * 复查 denyWrite 中按字面登记、后来变成符号链接的候选：解析其最终目标（最多跟 8 层），把目标加进 denyWrite 并重新安装配置。
 */
function rescreenDenyLiteralSymlinks() {
  let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (!config) return;
  let { denyLiteralSymlinkCandidates } = getSandboxAdapterState();
  let resolved = new Map();
  for (let denyLiteralSymlinkCandidate of denyLiteralSymlinkCandidates) {
    if (resolved.has(denyLiteralSymlinkCandidate)) continue;
    let linkText;
    try {
      linkText = readlinkSync(denyLiteralSymlinkCandidate);
    } catch {
      continue;
    }
    let parentDir = dirname(denyLiteralSymlinkCandidate);
    let checkText = isCozyWillowOn();
    if (checkText) {
      let linkText_2 = readLinkTextSafe(denyLiteralSymlinkCandidate);
      if (
        linkText_2 === null ||
        isOnForeignMount(linkText_2, parentDir) ||
        rawPointerPathIsUnsafe(linkText_2, parentDir)
      ) {
        logForDebugging(
          `[Sandbox] denyWrite symlink ${denyLiteralSymlinkCandidate} points at another host or cannot be checked without following it; not resolved, its own denyWrite entry stands`,
        );
        continue;
      }
      linkText = linkText_2;
    }
    let resolvedTarget;
    try {
      resolvedTarget = realpathSync(denyLiteralSymlinkCandidate);
    } catch {
      resolvedTarget =
        followDanglingLink(denyLiteralSymlinkCandidate, linkText) ?? resolve(parentDir, linkText);
      let offHost = false;
      for (let j = 0; ; j++) {
        if (
          checkText &&
          (isOnForeignMount(resolvedTarget, parentDir) || rawPointerPathIsUnsafe(resolvedTarget, parentDir))
        ) {
          offHost = true;
          break;
        }
        if (j >= 8) break;
        let nextText;
        try {
          nextText = readlinkSync(resolvedTarget);
        } catch {
          break;
        }
        resolvedTarget = resolve(dirname(resolvedTarget), nextText);
      }
      if (offHost) {
        logForDebugging(
          `[Sandbox] denyWrite symlink ${denyLiteralSymlinkCandidate} dangles, and following its chain by path text would reach another host or a path that cannot be checked; not resolved, its own denyWrite entry stands`,
        );
        continue;
      }
    }
    resolved.set(denyLiteralSymlinkCandidate, resolvedTarget);
  }
  if (resolved.size === 0) return;
  for (let j = denyLiteralSymlinkCandidates.length - 1; j >= 0; j--)
    if (resolved.has(denyLiteralSymlinkCandidates[j])) denyLiteralSymlinkCandidates.splice(j, 1);
  let nextConfig = {
    ...config,
    filesystem: {
      ...config.filesystem,
      denyWrite: normalizeCaseForComparison_2([...resolved.values(), ...config.filesystem.denyWrite]),
    },
  };
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.builtConfigEnforcesAllowlist.set(
    nextConfig,
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
  );
  installSandboxConfig(nextConfig);
}
//@ chunk-qg41pqt6.js:1015700-1015787 placement
function ensureTrailingBackslashForDriveRoot({ path, patternBeneath }, path_2) {
  return !patternBeneath && /^(?:[a-z]:)?$/i.test(path) ? `${path}\\` : path_2;
}
//@ chunk-qg41pqt6.js:1015787-1015875 placement
function cachedResolvedPrefix(path, cache) {
  let cached = cache.get(path);
  if (cached !== undefined) return cached;
  let existingPrefix = resolveExistingPrefixSafely(path);
  cache.set(path, existingPrefix);
  return existingPrefix;
}
//@ chunk-qg41pqt6.js:1015875-1015938 placement
function resolveExistingPrefixSafely(path) {
  if (isForeignUnresolvedMount(path) || linkChainIsUnsafeToFollow(path, getCwdState())) return null;
  return resolveExistingPrefix(path);
}
//@ chunk-qg41pqt6.js:1015938-1015974 placement
function isNetworkSpelledGrantRoot(path) {
  return isUntouchableSpelling(path) || isNetDir(path);
}
//@ chunk-qg41pqt6.js:1015974-1016015 placement
function isForeignUnresolvedMount(path) {
  return isOnForeignMount(path, getCwdState()) && !isLocalNetworkPath(path);
}
//@ chunk-qg41pqt6.js:1016015-1016069 placement
function normalizeUncTildePath(path) {
  return stripExtendedPathPrefix(expandWindowsEnvRefs(path)).replace(/^~\\/, "~/");
}
//@ chunk-qg41pqt6.js:1016069-1017347 placement
/**
 * 判断一个路径是否是需要在沙箱内单独处理的网络路径（UNC/自动挂载）：综合主机名形式、是否本机名、受信写入者的授权、各自身位置与已审核位置的主机比较。
 */
function isUnsafeNetworkPath(path, context, vouched) {
  let vouchedGrants = context.trustsWriter ? context.grantsOfVouched : [];
  let places = vouched ? context.placesOfVouched : context.ownPlaces;
  if (context.sharesReach && isWindowsDevicePath(path)) {
    let uncHost = uncHostOf(path);
    let trustsUnc = context.trustsWriter || uncHost?.endsWith(".") !== true;
    let deviceNamespace = isDeviceNamespacePath(path);
    let deviceLike = deviceNamespace || hasWin32DevicePrefixSpelling(path);
    let hasDotPart = hasDotSegment(deviceNamespace ? path.slice(3) : path);
    let straightUnc =
      uncHost === null && deviceLike && !NT_NAMESPACE_PREFIX_RE.test(path.slice(3)) && !hasDotPart;
    let deviceWithDotSegment = deviceLike && hasDotPart;
    let [firstSegment, secondSegment, ...restSegments] = path.replace(/^[\\/]{2}/, "").split(/[\\/]+/);
    let segmentsClean =
      !!firstSegment &&
      !!secondSegment &&
      [firstSegment, secondSegment].every((segment) => segment !== "." && segment !== "..") &&
      [secondSegment, ...restSegments].every(
        (segment) => segment === "." || segment === ".." || !/[. ]$/.test(segment),
      );
    let depth = 0;
    for (let segment of restSegments)
      if (segment === "..") {
        depth--;
        segmentsClean &&= depth >= 0;
      } else if (segment !== "." && segment !== "") depth++;
    let replaced = hostname().replace(/[A-Z]/g, (char) => char.toLowerCase());
    return (
      !straightUnc &&
      !(trustsUnc && isLocalNetworkPath(path)) &&
      !(
        trustsUnc &&
        uncHost !== null &&
        !deviceLike &&
        (vouched || segmentsClean) &&
        (isLocalHostName(uncHost) ||
          isLocalInterfaceAddress(uncHost, context) ||
          isShortNameOfHost(uncHost, replaced, context))
      ) &&
      !(
        uncHost !== null &&
        !deviceNamespace &&
        !hasDotSegment(path) &&
        isShortNameOfHost(uncHost, replaced, context)
      ) &&
      !(uncHost !== null && !deviceWithDotSegment && WILDCARD_ONLY_RE.test(uncHost)) &&
      !(
        !deviceWithDotSegment &&
        vouchedGrants.some((vouchedGrant) => hostPatternsMatch(uncHostOf(vouchedGrant), uncHost, context))
      ) &&
      places.every((place) => {
        let placeHost = uncHostOf(place);
        return (
          isForeignNetworkPath(path, place) &&
          (deviceWithDotSegment ||
            (!hostPatternsMatch(uncHost, placeHost, context) &&
              !(
                uncHost !== null &&
                placeHost !== null &&
                (((vouched || segmentsClean) && hostNamesMatch(uncHost, placeHost, context)) ||
                  isShortNameOfHost(uncHost, placeHost, context))
              )))
        );
      })
    );
  }
  if (!isAutomountPath(path, context)) return false;
  let autoHost = networkMountHost(path);
  let localAutoHost =
    autoHost !== null &&
    !/\.ipv6-literal\.net\.?$/.test(autoHost) &&
    (((context.trustsWriter || !autoHost.endsWith(".")) && isLocalHostName(autoHost)) ||
      isLocalInterfaceAddress(autoHost, context) ||
      isShortNameOfHost(
        autoHost,
        hostname().replace(/[A-Z]/g, (char) => char.toLowerCase()),
        context,
      ));
  return (
    (autoHost !== null
      ? !WILDCARD_ONLY_RE.test(autoHost) && !localAutoHost
      : isMacSpecialPath(path) ||
        countWhere(path.split("/"), (segment) => segment !== "" && segment !== ".") > 2) &&
    !vouchedGrants.some((vouchedGrant) =>
      hostPatternsMatch(networkMountHost(vouchedGrant), autoHost, context),
    ) &&
    places.every((place) => {
      let placeHost = networkMountHost(place);
      return (
        isForeignMountPath(path, place) &&
        !hostPatternsMatch(autoHost, placeHost, context) &&
        !(
          autoHost !== null &&
          placeHost !== null &&
          ((vouched && hostNamesMatch(autoHost, placeHost, context)) ||
            isShortNameOfHost(autoHost, placeHost, context))
        )
      );
    })
  );
}
//@ chunk-qg41pqt6.js:1017347-1017438 placement
function hostNamesMatch(a, b, context) {
  return a === b || (context.trustsWriter && a.replace(/\.$/, "") === b.replace(/\.$/, ""));
}
//@ chunk-qg41pqt6.js:1017438-1017647 placement
var NT_NAMESPACE_PREFIX_RE =
  /^[\\/](?:UNC|Mup|LanmanRedirector|GLOBALROOT|GLOBAL\?\?|Global|DosDevices|Device)(?:[\\/]|$)/i;
var NT_DEVICE_PREFIX_RE =
  /^[\\/](?:[a-z]:|Volume\{[0-9a-f-]+\}|HarddiskVolume\d+|PhysicalDrive\d+|CdRom\d+|pipe)(?:[\\/]|$)/i;
//@ chunk-qg41pqt6.js:1017647-1017736 placement
function isProcPath(path) {
  return (
    (getPlatform() === "linux" || getPlatform() === "wsl") && (path === "/proc" || path.startsWith("/proc/"))
  );
}
//@ chunk-qg41pqt6.js:1017736-1017862 placement
function isAutomountPath(path, context) {
  return context.automounter === "macos"
    ? isNetworkMountPath(path) || neverOtherHostMount(path) || isMacSpecialPath(path)
    : context.automounter === "linux" && networkMountRootCached(path)?.startsWith("/net/") === true;
}
//@ chunk-qg41pqt6.js:1017862-1017879 placement
var WILDCARD_ONLY_RE = /^[*?]+$/;
//@ chunk-qg41pqt6.js:1017879-1018470 placement
/**
 * 比较主机名模式与主机名是否匹配，考虑末尾点、短名与搜索域补全等变体。
 */
function hostPatternsMatch(hostPattern, host, context) {
  if (hostPattern === null || host === null || !containsGlobChars(hostPattern)) return false;
  let patterns = [hostPattern];
  let hosts = [host];
  let domain = getLocalSearchDomain(context);
  let trimmedHost = host.replace(/\.$/, "");
  let dotIndex = trimmedHost.indexOf(".");
  if (context.trustsWriter) {
    patterns.push(hostPattern.replace(/\.$/, ""));
    hosts.push(trimmedHost);
  }
  let searchDomains =
    typeof domain !== "string"
      ? []
      : context.trustsWriter && context.searchDomains?.length
        ? context.searchDomains
        : [domain];
  if (dotIndex !== -1) {
    if (searchDomains.includes(trimmedHost.slice(dotIndex + 1))) hosts.push(trimmedHost.slice(0, dotIndex));
  } else if (trimmedHost === host)
    hosts.push(
      ...searchDomains.flatMap((searchDomain) => [
        `${trimmedHost}.${searchDomain}`,
        `${trimmedHost}.${searchDomain}.`,
      ]),
    );
  if (context.trustsWriter && (domain === null || context.automounter === "macos")) {
    if (dotIndex !== -1) hosts.push(trimmedHost.slice(0, dotIndex));
    else if (hostPattern.includes(".")) patterns.push(hostPattern.slice(0, hostPattern.indexOf(".")));
  }
  return patterns.some((pattern) => hosts.some((host) => matchesGuardedGlob(host, pattern, undefined, true)));
}
//@ chunk-qg41pqt6.js:1018470-1018508 placement
var PROC_PID_PATH_RE = /^\/proc\/\d+(?:\/|$)/;
var MAX_PARENT_DIR_WALK = 40;
//@ chunk-qg41pqt6.js:1018508-1018846 placement
/**
 * 判断目录是否是 root 所有、当前用户不可写的固定目录（带缓存，逐级向上）。
 */
function isRootOwnedFixedFolder(path, context) {
  let cached = context.fixedFolders.get(path);
  if (cached !== undefined) return cached;
  let isProc = isProcPath(path);
  let parent = dirname(path);
  let result = isProc || parent === path || isRootOwnedFixedFolder(parent, context);
  if (result && !isProc) {
    result = false;
    let uid = process.getuid?.();
    try {
      let { uid: uid_2, mode } = statSync(path);
      try {
        accessSync(path, constants.W_OK);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        result =
          uid !== undefined &&
          uid !== 0 &&
          uid_2 === 0 &&
          (mode & 18) === 0 &&
          (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS");
      }
    } catch {}
  }
  context.fixedFolders.set(path, result);
  return result;
}
//@ chunk-qg41pqt6.js:1018846-1019799 placement
/**
 * 逐段展开路径（跟随符号链接，限跳数），找出第一个指向其他计算机（网络/自动挂载路径）的前缀；无法读取的段按信任规则判断；找不到返回 undefined。
 */
function findRemoteMountPrefix(path, context, vouched, strict) {
  let parts = path.split("/");
  let stack = [];
  let hops = 0;
  let automountDepth;
  for (let segment = parts.shift(); segment !== undefined; segment = parts.shift()) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      stack.pop();
      if (automountDepth !== undefined && stack.length <= automountDepth) automountDepth = undefined;
      continue;
    }
    let parentPath = `/${stack.join("/")}`;
    let candidate = stack.length === 0 ? `/${segment}` : `${parentPath}/${segment}`;
    if (isUnsafeNetworkPath(candidate, context, vouched)) return candidate;
    if (isAutomountPath(candidate, context)) {
      if (networkMountHost(parentPath) !== null || isMacSpecialPath(candidate))
        automountDepth ??= stack.length;
      stack.push(segment);
      continue;
    }
    if (
      automountDepth !== undefined ||
      (strict &&
        (context.automounter === "macos"
          ? !["/", "/volumes"].includes(foldCase_2(isSystemVolumePath(parentPath))) &&
            !MACOS_SYSTEM_VOLUME_ROOTS.includes(foldCase_2(candidate))
          : context.automountPoints.includes(parentPath) &&
            !context.ownPlaces.some((ownPlace) => `${ownPlace}/`.startsWith(`${candidate}/`)))) ||
      (context.automounter === "macos" &&
        foldCase_2(isSystemVolumePath(dirname(parentPath))) === "/volumes") ||
      (strict && !(isRootOwnedFixedFolder(parentPath, context) || isProcPath(candidate)))
    ) {
      automountDepth ??= stack.length;
      stack.push(segment);
      continue;
    }
    if (!context.linkTexts.has(candidate)) {
      let linkText;
      try {
        linkText = readlinkSync(candidate);
      } catch (error) {
        if (getErrnoCode(error) !== "EINVAL") {
          let path = [candidate, ...parts].join("/");
          return (!context.trustsWriter && PROC_PID_PATH_RE.test(candidate)) ||
            (hops > 0 && isUnsafeNetworkPath(path, context, vouched))
            ? path
            : undefined;
        }
      }
      context.linkTexts.set(candidate, linkText);
    }
    let linkText = context.linkTexts.get(candidate);
    if (linkText === undefined) {
      stack.push(segment);
      continue;
    }
    if (++hops > MAX_PARENT_DIR_WALK) return;
    if (linkText.startsWith("/")) stack.length = 0;
    parts.unshift(...linkText.split("/"));
  }
  return;
}
//@ chunk-qg41pqt6.js:1019799-1019881 placement
var MACOS_SYSTEM_VOLUME_ROOTS = ["/system/volumes", "/system/volumes/data", "/system/volumes/data/volumes"];
//@ chunk-qg41pqt6.js:1019881-1019966 placement
function resolveSandboxFilesystemPath_2(pattern) {
  return pattern === "~" || pattern.startsWith("~/")
    ? homedir() + pattern.slice(1)
    : isAbsolute(pattern)
      ? pattern
      : resolve(safeProcessCwd(), pattern);
}
//@ chunk-qg41pqt6.js:1019966-1021455 placement
/**
 * 判断某个来源的沙箱路径条目是否指向另一台计算机而应丢弃（否则每条命令前沙箱都会去访问那台机器）：首次调用时准备自动挂载与已授权位置信息；丢弃时每条只警告一次。
 */
function shouldDropRemoteHostEntry(entryKind, entryPath, source, context, isManagedOnly) {
  try {
    let isTrustedSource = isTrustedTierSource(source);
    let trustsWriter =
      isTrustedSource && !(source === "policySettings" && entryKind !== "credential file" && isManagedOnly);
    if (trustsWriter && (entryKind === "write deny" || entryKind === `${EDIT} rule`)) return false;
    if (context.prepared === "no") {
      context.prepared = "failed";
      let isMac = getPlatform() === "macos";
      if (!context.sharesReach && (isMac ? readAutoMaster() : readAutofsMounts())) {
        context.automounter = isMac ? "macos" : "linux";
        if (!isMac) {
          let autofsMountPoints = readAutofsMountPoints();
          if (autofsMountPoints === undefined) return false;
          context.automountPoints = autofsMountPoints;
        }
      }
      if (context.sharesReach || context.automounter !== "none") {
        for (let ownPlace of [...context.ownPlaces])
          try {
            context.ownPlaces.push(realpathSync.native(ownPlace));
          } catch {}
        if (!context.sharesReach)
          for (let grantedPlace of [...context.grantedPlaces]) {
            let remoteMountPrefix = findRemoteMountPrefix(
              resolveSandboxFilesystemPath_2(grantedPlace),
              context,
              false,
              false,
            );
            if (remoteMountPrefix !== undefined) context.grantedPlaces.push(remoteMountPrefix);
          }
        context.ownPlaces.push(...context.grantedPlaces);
        context.placesOfVouched = [...context.ownPlaces, ...context.repositoryGrantedPlaces];
        context.grantsOfVouched = [...context.grantedPlaces, ...context.repositoryGrantedPlaces];
      }
      context.prepared = "yes";
    }
    if (context.prepared === "failed" || (!context.sharesReach && context.automounter === "none"))
      return false;
    let normalized = context.sharesReach ? normalizeUncTildePath(entryPath) : entryPath;
    let candidates = (context.sharesReach ? containsGlobCharsWin(normalized) : containsGlobChars(normalized))
      ? [
          getGlobBaseDirectory(normalized),
          ...nameReadingsOfGlobSpelling(normalized).map((reading) => reading.name),
        ]
      : [normalized];
    let mapped = normalizeCaseForComparison_2(
      candidates.flatMap((candidate) =>
        context.sharesReach ? [candidate] : [candidate.replaceAll("\\", "/"), candidate],
      ),
    ).map(resolveSandboxFilesystemPath_2);
    context.trustsWriter = trustsWriter;
    if (
      !(
        context.sharesReach &&
        !context.trustsWriter &&
        mapped.some(
          (candidate) =>
            (isDeviceNamespacePath(candidate) || hasWin32DevicePrefixSpelling(candidate)) &&
            !NT_DEVICE_PREFIX_RE.test(candidate.slice(3)),
        )
      ) &&
      !mapped.some((candidate) => isUnsafeNetworkPath(candidate, context, isTrustedSource)) &&
      (context.sharesReach ||
        !mapped.some(
          (candidate) => findRemoteMountPrefix(candidate, context, isTrustedSource, true) !== undefined,
        ))
    )
      return false;
    let dropKey = `${entryKind} ${jsonStringify(entryPath)} from ${source}`;
    if (!context.dropped.has(dropKey)) {
      context.dropped.add(dropKey);
      if (!context.saidBefore.has(dropKey))
        logForDebugging(
          `[sandbox] dropped the ${dropKey}: it names another computer, and the sandbox would call out to that computer before each command`,
          {
            level: "warn",
          },
        );
    }
    return true;
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "denyEntryHostNotJudged");
    return false;
  }
}
//@ chunk-qg41pqt6.js:1021455-1021514 placement
function droppedDeniesForHost() {
  return [...getSandboxAdapterState().deniesDroppedForAnotherHost];
}
//@ chunk-qg41pqt6.js:1021514-1021553 placement
function subscribeSandboxEvents(listener) {
  return sandboxErrorSignalLazy.subscribe(listener);
}
//@ chunk-qg41pqt6.js:1021553-1021646 placement
function isLocalNetworkPath(path) {
  if (isWslUncPath(path)) return true;
  if (isDeviceNamespacePath(path) || hasDotSegment(path)) return false;
  let uncHost = uncHostOf(path);
  return uncHost !== null && isLocalHostName(uncHost);
}
//@ chunk-qg41pqt6.js:1021646-1021777 placement
function isLocalHostName(name) {
  let replaced = name.replace(/\.$/, "");
  return (
    isLoopbackHost(replaced) ||
    replaced === "--1.ipv6-literal.net" ||
    replaced === hostname().replace(/[A-Z]/g, (char) => char.toLowerCase())
  );
}
//@ chunk-qg41pqt6.js:1021777-1021804 placement
var IPV6_LITERAL_SUFFIX = ".ipv6-literal.net";
//@ chunk-qg41pqt6.js:1021804-1021964 placement
function isLocalInterfaceAddress(host, context) {
  let dottedIp = host.endsWith(IPV6_LITERAL_SUFFIX)
    ? host.slice(0, -IPV6_LITERAL_SUFFIX.length).replaceAll("-", ":")
    : null;
  return (
    context.trustsWriter &&
    (dottedIp === null ? isIP(host) !== 0 : isIP(dottedIp) === 6) &&
    (getLocalInterfaceAddresses()?.has(host) ?? true)
  );
}
//@ chunk-qg41pqt6.js:1021964-1022267 placement
/**
 * 判断一个主机名是另一个的短名（短名加本机搜索域等于全名）。
 */
function isShortNameOfHost(name, fqdn, context) {
  let [shortName, fullName] = name.includes(".")
    ? [fqdn, name.replace(/\.$/, "")]
    : [name, fqdn.replace(/\.$/, "")];
  if (shortName.includes(".") || !fullName.startsWith(`${shortName}.`)) return false;
  let localSearchDomain = getLocalSearchDomain(context);
  return (
    (typeof localSearchDomain === "string" && fullName === `${shortName}.${localSearchDomain}`) ||
    (context.trustsWriter &&
      (localSearchDomain === null ||
        context.automounter === "macos" ||
        (context.searchDomains ?? []).some((domain) => fullName === `${shortName}.${domain}`)))
  );
}
//@ chunk-qg41pqt6.js:1022267-1022528 placement
function getLocalSearchDomain(context) {
  if (context.sharesReach) return null;
  if (context.searchDomains === undefined) context.searchDomains = readResolvSearchDomains() ?? null;
  if (context.searchDomains === null) return null;
  let replaced = hostname().replace(/[A-Z]/g, (char) => char.toLowerCase());
  let index = replaced.indexOf(".");
  return context.searchDomains[0] ?? (index === -1 ? undefined : replaced.slice(index + 1));
}
//@ chunk-qg41pqt6.js:1022528-1022702 placement
function isGrantCoveredByPattern(denyRoots, { path, patternBeneath }, path_2) {
  let platform = getPlatform();
  let isWindows = platform === "windows";
  return (
    !isPathPrefixOf(
      isWindows ? path.replaceAll("\\", "/") : path,
      isWindows ? path_2.replaceAll("\\", "/") : path_2,
      isWindows || platform === "macos",
    ) && (patternBeneath ? anyGlobPathCovers(denyRoots, [path_2]) : anyDenyEntryCovers(denyRoots, [path_2]))
  );
}
//@ chunk-qg41pqt6.js:1022702-1022732 placement
var TENGU_CURRIED_WILLOW = "tengu_curried_willow";
//@ chunk-qg41pqt6.js:1022732-1024546 placement
/**
 * 复查配置构建后被重新链接的 allowRead/allowWrite 授权：若现在指向家目录、配置目录或读禁止区，就从运行中配置撤下并上报 tengu_sandbox_late_symlink_grant_dropped，下次构建再审。
 */
function rescreenLateSymlinkGrants() {
  let sandboxAdapterState = getSandboxAdapterState();
  let { lateSymlinkGrantCandidates, lateSymlinkGrantDenyRoots, lateSymlinkGrantProfile } =
    sandboxAdapterState;
  if (lateSymlinkGrantCandidates.length === 0) return;
  let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (!config) return;
  let gitHome =
    lateSymlinkGrantProfile !== undefined &&
    readFlagWithOverride(TENGU_CURRIED_WILLOW, {
      safe: true,
    })
      ? lateSymlinkGrantProfile
      : undefined;
  let dropped = {
    allowRead: new Set(),
    allowWrite: new Set(),
  };
  let cache = new Map();
  for (let idx = lateSymlinkGrantCandidates.length - 1; idx >= 0; idx--) {
    let { literal, list, roots } = lateSymlinkGrantCandidates[idx];
    let reason;
    for (let root of roots) {
      let prefix = cachedResolvedPrefix(root.path, cache);
      if (prefix === null) reason = "it no longer resolves safely";
      else if (
        gitHome !== undefined &&
        isUnderGitHome(ensureTrailingBackslashForDriveRoot(root, prefix.path), gitHome)
      )
        reason = root.nameReading
          ? `the sandbox may also read ${root.path} as a folder name, and that folder now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given`
          : root.patternBeneath
            ? `the folder that it is confined to (${root.path}) now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given`
            : "it now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given";
      else if (isGrantCoveredByPattern(lateSymlinkGrantDenyRoots, root, prefix.path))
        reason = root.patternBeneath
          ? "a directory in its spelling now resolves outside that spelling to one that holds or lies inside a denied read path"
          : "it now resolves into a denied read path outside its own spelling";
      if (reason !== undefined) break;
    }
    if (reason === undefined) continue;
    lateSymlinkGrantCandidates.splice(idx, 1);
    dropped[list].add(literal);
    logForDebugging(
      `[Sandbox] dropped ${list} ${literal}: ${reason} (re-linked after the config build); withheld until the next config build re-screens it`,
    );
    logEvent("tengu_sandbox_late_symlink_grant_dropped", {
      list: fromEnum(list),
    });
  }
  if (dropped.allowRead.size === 0 && dropped.allowWrite.size === 0) return;
  let nextConfig = {
    ...config,
    filesystem: {
      ...config.filesystem,
      allowRead: (config.filesystem.allowRead ?? []).filter((path) => !dropped.allowRead.has(path)),
      allowWrite: config.filesystem.allowWrite.filter((path) => !dropped.allowWrite.has(path)),
    },
  };
  sandboxAdapterState.builtConfigEnforcesAllowlist.set(
    nextConfig,
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
  );
  installSandboxConfig(nextConfig);
}
//@ chunk-qg41pqt6.js:1024546-1025068 placement
/**
 * 检测 cwd 是否是 git worktree：读 .git 文件中的 gitdir，校验其位于 <主仓库>.git/worktrees/ 下且反向链接一致，返回主仓库 .git 目录供沙箱放行写入；任何异常返回 null。
 */
function detectWorktreeGitCommonDir(dir) {
  let gitPath = join(dir, ".git");
  try {
    if (pointerFileIsSuspect(gitPath, dir)) return null;
    let match = readFileSync(gitPath, {
      encoding: "utf8",
    }).match(/^gitdir:\s*(.+)$/m);
    if (!match?.[1]) return null;
    let trimmed = match[1].trim();
    if (isOnForeignMount(trimmed, dir)) return null;
    if (rawPointerPathIsUnsafe(trimmed, dir)) return null;
    let worktreeGitDir = resolve(dir, trimmed);
    let worktreesDir = dirname(worktreeGitDir);
    if (basename(worktreesDir) !== "worktrees") return null;
    let commonDir = dirname(worktreesDir);
    if (!basename(commonDir).endsWith(".git")) return null;
    if (pointerFileIsSuspect(join(worktreeGitDir, "gitdir"), worktreeGitDir)) return null;
    let trimmed_2 = readFileSync(join(worktreeGitDir, "gitdir"), {
      encoding: "utf8",
    }).trim();
    if (isOnForeignMount(trimmed_2, dir)) return null;
    if (rawPointerPathIsUnsafe(trimmed_2, worktreeGitDir, dir)) return null;
    if (realpathSync(resolve(worktreeGitDir, trimmed_2)) !== join(realpathSync(dir), ".git")) return null;
    return commonDir;
  } catch {
    return null;
  }
}
//@ chunk-qg41pqt6.js:1025068-1025344 placement
/**
 * 门面 checkDependencies：Windows 未启用、diskless 直接报错；否则取缓存的依赖探测结果（bubblewrap/socat/ripgrep、macOS sandbox-exec、Windows srt-win 等）。
 */
function checkSandboxDependencies() {
  if (getPlatform() === "windows" && !isWindowsSandboxEnabled())
    return {
      errors: ["Windows sandbox is not enabled"],
      warnings: [],
    };
  if (isDiskless())
    return {
      errors: ["The sandbox is unavailable in this session"],
      warnings: [],
    };
  let { checkDependenciesProbe } = getSandboxAdapterState();
  let result = checkDependenciesProbe();
  if (result.errors.includes(SANDBOX_CONFIG_UNAVAILABLE_TEXT)) checkDependenciesProbe.cache.clear?.();
  return result;
}
//@ chunk-qg41pqt6.js:1025344-1025412 placement
function cachedDependencyProbe() {
  return getSandboxAdapterState().checkDependenciesProbe.cache.get(undefined);
}
//@ chunk-qg41pqt6.js:1025412-1025766 placement
/**
 * 检查沙箱依赖：Windows 原生沙箱启用且未缓存时异步探测 ripgrep 等依赖（必要时先用设置补装沙箱运行时配置），结果按探测代次写入缓存；其他情况走同步检查。
 */
async function checkSandboxDependenciesAsync() {
  let sandboxAdapterState = getSandboxAdapterState();
  if (
    isDiskless() ||
    getPlatform() !== "windows" ||
    !isWindowsSandboxEnabled() ||
    sandboxAdapterState.checkDependenciesProbe.cache.has(undefined)
  )
    return checkSandboxDependencies();
  let sandboxRuntimeSeeded = ensureSandboxRuntimeSeeded();
  if (sandboxRuntimeSeeded) return sandboxRuntimeSeeded;
  let dependencyProbeGeneration = sandboxAdapterState.dependencyProbeGeneration;
  let { rgPath, rgArgs } = ripgrepCommand();
  let result = await SandboxManager_2.checkDependenciesAsync({
    command: rgPath,
    args: rgArgs,
  });
  let withRemedy = withWindowsSandboxRemedy(result);
  if (dependencyProbeGeneration === sandboxAdapterState.dependencyProbeGeneration)
    sandboxAdapterState.checkDependenciesProbe.cache.set(undefined, withRemedy);
  return withRemedy;
}
//@ chunk-qg41pqt6.js:1025766-1025809 placement
var SANDBOX_CONFIG_UNAVAILABLE_TEXT = "sandbox configuration unavailable";
//@ chunk-qg41pqt6.js:1025809-1025905 placement
function withWindowsSandboxRemedy(result) {
  return {
    ...result,
    errors: result.errors.map((error) => describeWindowsSandboxRemedy(error)),
    warnings: result.warnings.map((warning) => describeWindowsSandboxRemedy(warning)),
  };
}
//@ chunk-qg41pqt6.js:1025905-1026248 placement
/**
 * 沙箱运行时未初始化时用当前设置（失败则默认设置）补装配置；Windows 下构建失败返回依赖错误。
 */
function ensureSandboxRuntimeSeeded() {
  if (getSandboxAdapterState().runtimeInitialized && SandboxManager_2.getConfig() !== undefined) return;
  try {
    installSandboxConfig(convertToSandboxRuntimeConfig(getSettings_DEPRECATED() ?? {}));
  } catch (error) {
    logForDebugging(`checkDependencies: settings unavailable, re-seeding SRT config from defaults: ${error}`);
    try {
      installSandboxConfig(convertToSandboxRuntimeConfig({}));
    } catch (error) {
      logForDebugging(`checkDependencies: SRT config build failed, skipping seed: ${error}`);
      if (getPlatform() === "windows")
        return {
          errors: [SANDBOX_CONFIG_UNAVAILABLE_TEXT],
          warnings: [],
        };
    }
  }
  return;
}
//@ chunk-qg41pqt6.js:1026248-1026514 fingerprint (2.1.88 match: checkDependencies, 0.632)
/**
 * 检查沙箱依赖（ripgrep 路径交给 sandbox-runtime 的 checkDependencies），Linux/WSL 在运行时未初始化时额外试跑一次 bubblewrap。
 */
function checkDependencies_2() {
  let sandboxRuntimeSeeded = ensureSandboxRuntimeSeeded();
  if (sandboxRuntimeSeeded) return sandboxRuntimeSeeded;
  let { rgPath, rgArgs } = ripgrepCommand();
  let result = SandboxManager_2.checkDependencies({
    command: rgPath,
    args: rgArgs,
  });
  let withRemedy = withWindowsSandboxRemedy(result);
  let platform = getPlatform();
  if (
    (platform === "linux" || platform === "wsl") &&
    withRemedy.errors.length === 0 &&
    !getSandboxAdapterState().runtimeInitialized
  ) {
    let appArmorError = checkAppArmorUserNamespaces(linuxSandboxProbes(sandboxBinaryPath));
    if (appArmorError !== undefined)
      return {
        ...withRemedy,
        errors: [appArmorError],
      };
  }
  return withRemedy;
}
//@ chunk-qg41pqt6.js:1026514-1026643 placement
/**
 * 是否被强制开启沙箱：管理员强制下用户设置 enabled=true，或 GrowthBook disableNoSandbox 且当前不在 scrub/IS_SANDBOX/bubblewrap 环境里。
 */
function shouldForceSandboxOn() {
  if (isUserSandboxEnableMandated()) return true;
  if (!getSandboxGbConfig().disableNoSandbox) return false;
  return !isScrubEnabled() && !isEnvTruthy(env.IS_SANDBOX) && !envDynamicProbe.getIsBubblewrapSandbox();
}
//@ chunk-qg41pqt6.js:1026643-1026785 fingerprint (2.1.88 match: getSandboxEnabledSetting, 1)
/**
 * 沙箱是否在设置里开启（含强制开启）；读设置失败记日志返回 false。
 */
function getSandboxEnabledSetting() {
  try {
    if (shouldForceSandboxOn()) return true;
    return getSettings_DEPRECATED()?.sandbox?.enabled ?? false;
  } catch (error) {
    logForDebugging(`Failed to get settings for sandbox check: ${error}`);
    return false;
  }
}
//@ chunk-qg41pqt6.js:1026785-1026825 placement
/**
 * CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 打开、scrub 沙箱可用、且用户没开沙箱时，强制用 scrub 沙箱。
 */
function isScrubOnlySandboxMode() {
  return isScrubEnabled() && isScrubSandboxAvailable() && !getSandboxEnabledSetting();
}
//@ chunk-qg41pqt6.js:1026825-1026868 placement
function isAutoAllowSupported() {
  return !isScrubEnabled() && getPlatform() !== "windows";
}
//@ chunk-qg41pqt6.js:1026868-1026952 fingerprint (2.1.88 match: isAutoAllowBashIfSandboxedEnabled, 1)
/**
 * sandbox.autoAllowBashIfSandboxed（默认 true）；scrub 模式或 Windows 下不支持。
 */
function isAutoAllowBashIfSandboxedEnabled() {
  if (!isAutoAllowSupported()) return false;
  return getSettings_DEPRECATED()?.sandbox?.autoAllowBashIfSandboxed ?? true;
}
//@ chunk-qg41pqt6.js:1026952-1027067 fingerprint (2.1.88 match: areUnsandboxedCommandsAllowed, 0.749)
/**
 * 是否禁止沙箱外执行：GrowthBook forbidUnsandboxedCommands、可信层 allowUnsandboxedCommands=false 或合并设置 allowUnsandboxedCommands===false。
 */
function isStrictSandboxModeConfigured() {
  if (getSandboxGbConfig().forbidUnsandboxedCommands) return true;
  return (
    isUnsandboxedFallbackClosedByTrustedTier() ||
    getSettings_DEPRECATED()?.sandbox?.allowUnsandboxedCommands === false
  );
}
//@ chunk-qg41pqt6.js:1027067-1027264 layout
/**
 * 管理员沙箱强制：GB 禁止沙箱外命令、托管设置 allowManagedDomainsOnly、托管层 allowUnsandboxedCommands=false 或 --settings/flagSettings 的 allowUnsandboxedCommands=false。强制下 project/local 的放宽项一律忽略。
 */
function isAdminSandboxMandate() {
  if (isUnsandboxedForbiddenByGb() || shouldAllowManagedSandboxDomainsOnly()) return true;
  if (readPolicySandboxSetting(["allowUnsandboxedCommands"]) === false) return true;
  return (
    (getPolicySettingsIfEnabled()?.sandbox?.allowUnsandboxedCommands ??
      getSettingsForSource("flagSettings")?.sandbox?.allowUnsandboxedCommands) === false
  );
}
//@ chunk-qg41pqt6.js:1027264-1027369 layout
/**
 * userSettings 打开了沙箱且该项未被更高层覆盖、同时管理员强制沙箱时为真；此时 getSandboxEnabledSetting 直接视为开启。
 */
function isUserSandboxEnableMandated() {
  return (
    !hasTrustedSandboxSetting("enabled") &&
    isSettingSourceEnabled("userSettings") &&
    getSettingsForSource("userSettings")?.sandbox?.enabled === true &&
    isAdminSandboxMandate()
  );
}
//@ chunk-qg41pqt6.js:1027369-1027494 layout
function isUserFailIfUnavailableUnderMandate() {
  return (
    !hasTrustedSandboxSetting("failIfUnavailable") &&
    isSettingSourceEnabled("userSettings") &&
    getSettingsForSource("userSettings")?.sandbox?.failIfUnavailable === true &&
    isAdminSandboxMandate()
  );
}
//@ chunk-qg41pqt6.js:1027494-1027577 layout (2.1.88 match: _temp9, 0.768)
function hasTrustedSandboxSetting(a_4) {
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (settings) => settings?.sandbox?.[a_4] !== undefined,
  );
}
//@ chunk-qg41pqt6.js:1027577-1027828 callgraph-fingerprint (2.1.88 match: convertToSandboxRuntimeConfig, 0.268)
/**
 * 可信层（托管/--settings）有网络限制：管理员强制、strictAllowlist、deniedDomains 或 WebFetch(domain:) 的 deny 规则。
 */
function hasTrustedNetworkRestrictions() {
  if (isAdminSandboxMandate() || isStrictNetworkAllowlistConfigured()) return true;
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (source) =>
      (source?.sandbox?.network?.deniedDomains?.length ?? 0) > 0 ||
      (source?.permissions?.deny ?? []).some((denyRule) => {
        let sourceSettings = parseRuleForSandbox(denyRule);
        return (
          sourceSettings.toolName === WEBFETCH && sourceSettings.ruleContent?.startsWith("domain:") === true
        );
      }),
  );
}
//@ chunk-qg41pqt6.js:1027828-1028081 layout
/**
 * 可信层（policy、--settings）是否配置了读禁止：sandbox.filesystem.denyRead、credentials.files 或带内容的 Read(...) deny 规则。决定是否需要解析读禁止根。
 */
function hasTrustedReadDenies() {
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (settings) =>
      (settings?.sandbox?.filesystem?.denyRead?.length ?? 0) > 0 ||
      (settings?.sandbox?.credentials?.files?.length ?? 0) > 0 ||
      (settings?.permissions?.deny ?? []).some((denyRule) => {
        let ruleForSandbox = parseRuleForSandbox(denyRule);
        return ruleForSandbox.toolName === READ && ruleForSandbox.ruleContent !== undefined;
      }),
  );
}
//@ chunk-qg41pqt6.js:1028081-1028431 layout
/**
 * 收集非 project/local 层的读禁止根：sandbox.credentials.files、Read(...) deny 规则、sandbox.filesystem.denyRead，解析为规范路径。
 */
function getTrustedReadDenyRoots() {
  let roots = [];
  for (let sourceName of SETTING_SOURCES) {
    if (sourceName === "projectSettings" || sourceName === "localSettings") continue;
    let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(sourceName);
    roots.push(
      ...resolveSandboxPathPatterns(
        settingsForSourceTightenOnly?.sandbox?.credentials?.files?.map((file) => file.path),
        sourceName,
        "deny",
      ),
    );
    if (!isSettingSourceEnabled(sourceName)) continue;
    roots.push(
      ...resolvePathEntries(
        groupRuleContentsByTool(settingsForSourceTightenOnly?.permissions?.deny, [READ]).get(READ),
        sourceName,
        "deny",
        resolvePathPatternForSandbox,
      ),
      ...resolveSandboxPathPatterns(
        settingsForSourceTightenOnly?.sandbox?.filesystem?.denyRead,
        sourceName,
        "deny",
      ),
    );
  }
  return normalizeCaseForComparison_2(roots.flatMap((root) => canonicalizeSandboxPath(root) ?? []));
}
//@ chunk-qg41pqt6.js:1028431-1028636 layout
/**
 * 解析读禁止根：以 (cwd, 条目) 为键缓存一个 tick 内的解析结果，返回内置可信禁止根加上每个条目的各种拼写（原样与经 realpath 的规范路径）。
 */
function resolveTrustedReadDenyRoots(roots) {
  let cacheKey = jsonStringify([getCwdState(), roots]);
  let trustedReadDenyRootResolution = getSandboxAdapterState().trustedReadDenyRootResolution;
  if (trustedReadDenyRootResolution?.key !== cacheKey)
    trustedReadDenyRootResolution = setTrustedReadDenyResolutionForTick({
      key: cacheKey,
      resolved: roots.map((root) => resolveReadDenyRoot(root)),
    });
  return {
    roots: normalizeCaseForComparison_2([
      ...getBuiltinTrustedDenyRoots(),
      ...trustedReadDenyRootResolution.resolved.flatMap((resolved) => resolved.spellings),
    ]),
    resolution: trustedReadDenyRootResolution,
  };
}
//@ chunk-qg41pqt6.js:1028636-1028766 layout
function setTrustedReadDenyResolutionForTick(resolution) {
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.trustedReadDenyRootResolution = resolution;
  queueMicrotask(() => {
    sandboxAdapterState.trustedReadDenyRootResolution = undefined;
  });
  return resolution;
}
//@ chunk-qg41pqt6.js:1028766-1028792 layout
var READ_DENY_LOOK_BUDGET_MS = 15;
var READ_DENY_LOOK_MIN_ENTRIES = 16;
var READ_DENY_LOOK_THROTTLE_MS = 250;
//@ chunk-qg41pqt6.js:1028792-1029221 layout
/**
 * 把凭据遮罩的 glob 展开成具体路径（{lexical, canonical}）；位于禁区、或通配符不在最后一段、或叶子是裸 ** 时不展开只按字面参与，避免 readdir 被引导穿过未审查目录。
 */
function expandMaskGlob_2(globPath) {
  if (isOnForeignMount(globPath, getCwdState()) || rawPointerPathIsUnsafe(globPath, getCwdState())) return [];
  let parts = globPath.split("/");
  let lastIndex = parts.length - 1;
  if (
    parts.some((segment, index) => index !== lastIndex && containsGlobChars(segment)) ||
    parts[lastIndex] === "**"
  ) {
    logForDebugging(
      `[sandbox] glob pattern '${globPath}' not expanded for the mask sweep: wildcards outside the final path component (or a bare '**' leaf) could steer the readdir walk through unvetted directories \u2014 the pattern participates lexically only`,
    );
    return [];
  }
  return expandGlobPattern(globPath).map((path) => ({
    lexical: path,
    canonical: canonicalizePathForMaskSweep(path),
  }));
}
//@ chunk-qg41pqt6.js:1029221-1029289 layout
/**
 * 把路径做大小写折叠并规整成以 / 开头、无空段的绝对形式，用于大小写不敏感比较。
 */
function toFoldedAbsolutePath(path) {
  return "/" + foldPathCase(path).split("/").filter(Boolean).join("/");
}
//@ chunk-qg41pqt6.js:1029289-1030004 layout
function getReadDenyReach() {
  let sandboxAdapterState = getSandboxAdapterState();
  let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (config === undefined || isWrapUnconfined(config))
    return {
      withinReach: () => false,
      bounded: false,
      complete: false,
      writeRootCount: 0,
    };
  let complete = !sandboxAdapterState.undecidableWrapThisSession && !isRemoteSessionAvailable();
  let writeRoots = [
    ...sandboxAdapterState.wrapBindableWriteRootsThisSession,
    ...sandboxAdapterState.wrapOutOfTreeTargetsThisSession,
  ];
  let foldedRoots;
  return {
    withinReach: (entry) => {
      let path = entry.lookAgain?.stoppedAt?.path;
      let joined = [...entry.spellings, path ?? ""].join("\x00");
      let cached = sandboxAdapterState.readDenyRootWithinSandboxReach.get(joined);
      if (cached !== undefined && cached.writeRoots === writeRoots.length) return cached.reachable;
      foldedRoots ??= writeRoots.map(toFoldedAbsolutePath);
      let roots = foldedRoots;
      let any = [
        ...entry.spellings.map((spelling) =>
          containsGlobChars(spelling) ? getGlobBaseDirectory(spelling) : spelling,
        ),
        ...(path === undefined ? [] : [path]),
      ]
        .map(toFoldedAbsolutePath)
        .some((spelling) => roots.some((rule) => posixCovers(rule, spelling)));
      sandboxAdapterState.readDenyRootWithinSandboxReach.set(joined, {
        writeRoots: writeRoots.length,
        reachable: any,
      });
      return any;
    },
    bounded: true,
    complete,
    writeRootCount: writeRoots.length,
  };
}
//@ chunk-qg41pqt6.js:1030004-1030218 layout
function createReadDenyLookSelector(startTime, withinReach) {
  let sandboxAdapterState = getSandboxAdapterState();
  let readDenyRootLookCursor = sandboxAdapterState.readDenyRootLookCursor;
  let lookCount = 0;
  let exhaustedAt;
  return {
    select: (entry, index) => {
      if (index >= readDenyRootLookCursor && exhaustedAt === undefined) {
        if (
          lookCount < READ_DENY_LOOK_MIN_ENTRIES ||
          performance.now() - startTime < READ_DENY_LOOK_BUDGET_MS
        ) {
          lookCount++;
          return true;
        }
        exhaustedAt = index;
      }
      return withinReach(entry);
    },
    finish: () => {
      sandboxAdapterState.readDenyRootLookCursor = exhaustedAt ?? 0;
    },
  };
}
//@ chunk-qg41pqt6.js:1030218-1030378 layout
function markLookAgainEntries(previous, resolved, shouldWatch) {
  return resolved.map((entry, index) => {
    if (entry.lookAgain !== undefined || previous[index]?.lookAgain === undefined) return entry;
    return shouldWatch(entry)
      ? {
          ...entry,
          lookAgain: EMPTY_RESOLVE_STATUS,
        }
      : {
          ...entry,
          settledUnwatched: true,
        };
  });
}
//@ chunk-qg41pqt6.js:1030378-1030437 layout
var EMPTY_RESOLVE_STATUS = {
  stoppedAt: undefined,
  throughLink: false,
  settledInReach: true,
};
//@ chunk-qg41pqt6.js:1030437-1030544 layout
function rewatchSettledEntries(entries, shouldRewatch) {
  return entries.map((entry) =>
    entry.settledUnwatched && shouldRewatch(entry)
      ? {
          ...entry,
          settledUnwatched: undefined,
          lookAgain: EMPTY_RESOLVE_STATUS,
        }
      : entry,
  );
}
//@ chunk-qg41pqt6.js:1030544-1030853 layout
/**
 * 解析一个读禁止条目的根：glob 取基目录，经 canonicalizePathForMaskSweep 求规范路径，返回 {root, spellings:[原样, 规范], lookAgain}；路径未稳定或经过符号链接时 lookAgain 记录停在何处，供运行中复查。
 */
function resolveReadDenyRoot(path, walkMemo) {
  let baseDir = containsGlobChars(path) ? getGlobBaseDirectory(path) : path;
  if (!path.startsWith(baseDir))
    return {
      root: path,
      spellings: [path],
      lookAgain: undefined,
    };
  let status = {
    settled: false,
    stoppedAt: undefined,
    throughLink: false,
  };
  let canonicalBase = canonicalizePathForMaskSweep(baseDir, status, walkMemo);
  return {
    root: path,
    spellings: [path, canonicalBase + path.slice(baseDir.length)],
    lookAgain:
      status.settled && !status.throughLink
        ? undefined
        : {
            stoppedAt: status.stoppedAt,
            throughLink: status.throughLink,
          },
  };
}
//@ chunk-qg41pqt6.js:1030853-1031058 layout
/**
 * 与 resolveReadDenyRoot 相同但用于非 glob 的凭据遮罩路径：返回原样与规范两种拼写及是否需要复查。
 */
function resolveMaskPath(path, walkMemo) {
  let status = {
    settled: false,
    stoppedAt: undefined,
    throughLink: false,
  };
  let canonical = canonicalizePathForMaskSweep(path, status, walkMemo);
  return {
    root: path,
    spellings: [path, canonical],
    lookAgain:
      status.settled && !status.throughLink
        ? undefined
        : {
            stoppedAt: status.stoppedAt,
            throughLink: status.throughLink,
          },
  };
}
//@ chunk-qg41pqt6.js:1031058-1032189 layout
function relookReadDenyRoots(
  resolution,
  writeBack = true,
  walkMemo = createWalkMemo(),
  resolveOne = resolveReadDenyRoot,
  shouldLook = () => true,
) {
  let cwdState = getCwdState();
  let lookedAt = 0;
  let movedCount = 0;
  let movedSpellings = [];
  let movedMaskPaths = [];
  let changedStops = new Set();
  let resolved = resolution.resolved.map((entry, index) => {
    let lookAgain = entry.lookAgain;
    if (lookAgain === undefined || !shouldLook(entry, index)) return entry;
    lookedAt++;
    if (lookAgain.settledInReach) {
      let root = containsGlobChars(entry.root) ? getGlobBaseDirectory(entry.root) : entry.root;
      if (!isOnForeignMount(root, cwdState)) {
        let walk = rawPointerPathWalk(root, cwdState, walkMemo);
        if (!walk.unsafe && !walk.throughLink && walk.stoppedAt === undefined) return entry;
      }
    } else if (
      !lookAgain.throughLink &&
      lookAgain.stoppedAt !== undefined &&
      !isOnForeignMount(lookAgain.stoppedAt.path, cwdState)
    ) {
      let walk = rawPointerPathWalk(lookAgain.stoppedAt.path, cwdState, walkMemo);
      if (
        !walk.throughLink &&
        walk.stoppedAt?.path === lookAgain.stoppedAt.path &&
        walk.stoppedAt.kind === lookAgain.stoppedAt.kind
      )
        return entry;
      changedStops.add(lookAgain.stoppedAt.path);
    }
    let next = resolveOne(entry.root, walkMemo);
    if (
      lookAgain.stoppedAt !== undefined &&
      (next.lookAgain?.stoppedAt?.path !== lookAgain.stoppedAt.path ||
        next.lookAgain?.stoppedAt?.kind !== lookAgain.stoppedAt.kind)
    )
      changedStops.add(lookAgain.stoppedAt.path);
    if (
      next.spellings[1] !== entry.spellings[1] ||
      next.lookAgain?.stoppedAt?.path !== lookAgain.stoppedAt?.path ||
      next.lookAgain?.stoppedAt?.kind !== lookAgain.stoppedAt?.kind ||
      (next.lookAgain?.throughLink ?? false) !== lookAgain.throughLink
    ) {
      movedCount++;
      if (entry.isMask) movedMaskPaths.push(entry.root);
      else movedSpellings.push(...entry.spellings, ...next.spellings);
    }
    return entry.isMask
      ? {
          ...next,
          isMask: true,
        }
      : next;
  });
  if (movedCount > 0 && writeBack)
    setTrustedReadDenyResolutionForTick({
      key: resolution.key,
      resolved,
    });
  return {
    lookedAt,
    moved: movedCount,
    resolved,
    movedSpellings,
    movedMaskPaths,
    changedStops,
  };
}
//@ chunk-qg41pqt6.js:1032189-1032461 layout
function mergeReadDenyLooks(first, second) {
  return {
    lookedAt: first.lookedAt + second.lookedAt,
    moved: first.moved + second.moved,
    resolved: second.resolved,
    movedSpellings: [...first.movedSpellings, ...second.movedSpellings],
    movedMaskPaths: [...first.movedMaskPaths, ...second.movedMaskPaths],
    changedStops: new Set([...first.changedStops, ...second.changedStops]),
  };
}
//@ chunk-qg41pqt6.js:1032461-1032965 layout
/**
 * 每次沙箱包装前（节流 250ms）重新检查当初未解析或经符号链接拼写的可信读禁止/凭据遮罩路径。
 */
function recheckReadDenyRoots() {
  let sandboxAdapterState = getSandboxAdapterState();
  applyPendingReadDenyFallback();
  let readDenyRootFirstLookDue = sandboxAdapterState.readDenyRootFirstLookDue;
  sandboxAdapterState.readDenyRootFirstLookDue = false;
  let installedReadDenyRootResolution = sandboxAdapterState.installedReadDenyRootResolution;
  if (installedReadDenyRootResolution === undefined) return;
  let startTime = performance.now();
  let recentlyLooked =
    sandboxAdapterState.readDenyRootLookFinishedAt !== undefined &&
    startTime - sandboxAdapterState.readDenyRootLookFinishedAt < READ_DENY_LOOK_THROTTLE_MS;
  let nothingToLook =
    installedReadDenyRootResolution.forwardedUntrustedGrants.length === 0 &&
    sandboxAdapterState.lateSymlinkGrantCandidates.length === 0 &&
    !(SandboxManager_2.getConfig()?.credentials?.files ?? []).some(
      (credential) => credential.mode === "mask" && !isSentinelOnlyMask(credential),
    );
  if (!readDenyRootFirstLookDue && (recentlyLooked || nothingToLook)) return;
  try {
    runReadDenyLook(installedReadDenyRootResolution, readDenyRootFirstLookDue);
  } finally {
    sandboxAdapterState.readDenyRootLookFinishedAt = performance.now();
  }
}
//@ chunk-qg41pqt6.js:1032965-1036401 layout
/**
 * 执行一次读禁止根复查：有路径改变落点时，首次则重建配置；会话中途则收窄运行中配置（丢弃落入禁止区的仓库授权、把受影响的凭据遮罩降为占位符），失败时记 pendingReadDenyFallback。
 */
function runReadDenyLook(installedReadDenyRootResolution, readDenyRootFirstLookDue) {
  let sandboxAdapterState = getSandboxAdapterState();
  let refreshed;
  let movedSpellings;
  let masksAtStake = [];
  let masksPaths = [];
  let failed = false;
  try {
    let walkMemo = createWalkMemo();
    let { withinReach, bounded, complete, writeRootCount } = getReadDenyReach();
    let reachBounded = bounded && complete;
    let isWithinReach = reachBounded ? withinReach : () => true;
    if (!reachBounded || writeRootCount > sandboxAdapterState.readDenyRootReachSeenAtLook)
      installedReadDenyRootResolution = {
        resolution: installedReadDenyRootResolution.resolution && {
          key: installedReadDenyRootResolution.resolution.key,
          resolved: rewatchSettledEntries(installedReadDenyRootResolution.resolution.resolved, isWithinReach),
        },
        forwardedUntrustedGrants: installedReadDenyRootResolution.forwardedUntrustedGrants,
        maskSweepEntries: rewatchSettledEntries(
          installedReadDenyRootResolution.maskSweepEntries,
          isWithinReach,
        ),
        trustedDenyRoots: installedReadDenyRootResolution.trustedDenyRoots,
      };
    let selector = readDenyRootFirstLookDue
      ? undefined
      : createReadDenyLookSelector(performance.now(), withinReach);
    let select = selector?.select ?? (() => true);
    let resolutionLook = installedReadDenyRootResolution.resolution
      ? relookReadDenyRoots(
          installedReadDenyRootResolution.resolution,
          readDenyRootFirstLookDue,
          walkMemo,
          resolveReadDenyRoot,
          select,
        )
      : undefined;
    let resolutionCount = installedReadDenyRootResolution.resolution?.resolved.length ?? 0;
    let exclusionRoots = new Set(
      readDenyRootFirstLookDue
        ? installedReadDenyRootResolution.resolution?.resolved
            .filter((entry) => entry.lookAgain !== undefined)
            .map((entry) => entry.root)
        : [],
    );
    let maskLook = relookReadDenyRoots(
      {
        key: "",
        resolved: installedReadDenyRootResolution.maskSweepEntries,
      },
      false,
      walkMemo,
      resolveMaskPath,
      (entry, index) => !exclusionRoots.has(entry.root) && select(entry, resolutionCount + index),
    );
    selector?.finish();
    let changedStops = new Set([...(resolutionLook?.changedStops ?? []), ...maskLook.changedStops]);
    if (selector !== undefined && changedStops.size > 0) {
      let needsRelook = (entry) =>
        entry.lookAgain?.stoppedAt !== undefined && changedStops.has(entry.lookAgain.stoppedAt.path);
      if (resolutionLook !== undefined && installedReadDenyRootResolution.resolution !== undefined)
        resolutionLook = mergeReadDenyLooks(
          resolutionLook,
          relookReadDenyRoots(
            {
              key: installedReadDenyRootResolution.resolution.key,
              resolved: resolutionLook.resolved,
            },
            false,
            walkMemo,
            resolveReadDenyRoot,
            needsRelook,
          ),
        );
      maskLook = mergeReadDenyLooks(
        maskLook,
        relookReadDenyRoots(
          {
            key: "",
            resolved: maskLook.resolved,
          },
          false,
          walkMemo,
          resolveMaskPath,
          needsRelook,
        ),
      );
    }
    sandboxAdapterState.installedReadDenyRootResolution = {
      resolution:
        installedReadDenyRootResolution.resolution && resolutionLook
          ? {
              key: installedReadDenyRootResolution.resolution.key,
              resolved: markLookAgainEntries(
                installedReadDenyRootResolution.resolution.resolved,
                resolutionLook.resolved,
                isWithinReach,
              ),
            }
          : undefined,
      forwardedUntrustedGrants: installedReadDenyRootResolution.forwardedUntrustedGrants,
      maskSweepEntries: markLookAgainEntries(
        installedReadDenyRootResolution.maskSweepEntries,
        maskLook.resolved,
        isWithinReach,
      ),
      trustedDenyRoots: installedReadDenyRootResolution.trustedDenyRoots,
    };
    sandboxAdapterState.readDenyRootLookFailureReported = false;
    sandboxAdapterState.readDenyRootReachSeenAtLook = writeRootCount;
    let lookedAt = (resolutionLook?.lookedAt ?? 0) + maskLook.lookedAt;
    let moved = (resolutionLook?.moved ?? 0) + maskLook.moved;
    if (moved === 0) {
      if (readDenyRootFirstLookDue)
        logForDebugging(
          `[sandbox] Re-checked ${lookedAt} trusted read-deny or credential-mask path(s) that were unresolved or spelled through a symlink when the configuration was built: none changed`,
        );
      return;
    }
    logForDebugging(
      readDenyRootFirstLookDue
        ? `[sandbox] Re-checked ${lookedAt} trusted read-deny or credential-mask path(s) that were unresolved or spelled through a symlink when the configuration was built: ${moved} resolve(s) differently now; rebuilding so repository grants and credential masks are re-checked`
        : `[sandbox] Re-checked ${lookedAt} trusted read-deny or credential-mask path(s) left unresolved or spelled through a symlink: ${moved} resolve(s) differently than at the last look; checking which repository grants now lie inside one and which credential masks it now covers, to narrow the running config without a rebuild (a sandboxed command may still be running against its lists)`,
    );
    refreshed = [...(resolutionLook?.resolved ?? []), ...maskLook.resolved];
    movedSpellings = [...(resolutionLook?.movedSpellings ?? []), ...maskLook.movedSpellings];
    if (!readDenyRootFirstLookDue) {
      let movedMasks = [...(resolutionLook?.movedMaskPaths ?? []), ...maskLook.movedMaskPaths];
      if (movedMasks.length > 0) {
        let roots = normalizeCaseForComparison_2([
          ...installedReadDenyRootResolution.trustedDenyRoots,
          ...refreshed.filter((resolved) => !resolved.isMask).flatMap((resolved) => resolved.spellings),
        ]);
        let flattened = roots.flatMap((root) =>
          containsGlobChars(root) ? expandMaskGlob_2(root).map((expansion) => expansion.canonical) : [],
        );
        masksAtStake = movedMasks.filter((maskPath) => pathsCoverPath([...roots, ...flattened], maskPath));
      }
      masksPaths = normalizeCaseForComparison_2([
        ...normalizeCaseForComparison_2(movedSpellings).flatMap((spelling) =>
          containsGlobChars(spelling)
            ? [spelling, ...expandMaskGlob_2(spelling).map((expansion) => expansion.canonical)]
            : spelling,
        ),
        ...masksAtStake,
      ]);
    }
  } catch (error) {
    failed = true;
    if (!sandboxAdapterState.readDenyRootLookFailureReported) {
      sandboxAdapterState.readDenyRootLookFailureReported = true;
      reportSandboxErrorUnderStandIn(
        error,
        readDenyRootFirstLookDue ? "readDeniesNotRecheckedFirst" : "readDeniesNotRecheckedLater",
      );
    }
  }
  let cause = failed ? "look-failed" : "later-command";
  if (readDenyRootFirstLookDue) {
    let config = tryBuildSandboxConfig();
    if (config !== undefined)
      try {
        installSandboxConfig(config);
        logForDebugging(
          failed
            ? "Sandbox configuration rebuilt because trusted read-deny paths could not be re-checked"
            : "Sandbox configuration updated: a read-deny or credential-mask path now resolves somewhere other than where it did when the configuration was built",
        );
        return;
      } catch (error) {
        reportSandboxErrorUnderStandIn(error, "configNotInstalled");
      }
    if (!failed) cause = "rebuild-failed";
  }
  sandboxAdapterState.pendingReadDenyFallback = {
    look: installedReadDenyRootResolution,
    refreshed,
    cause,
    masksAtStake: cause === "later-command" ? masksPaths : undefined,
  };
  applyPendingReadDenyFallback();
}
//@ chunk-qg41pqt6.js:1036401-1037911 layout
function applyPendingReadDenyFallback() {
  let sandboxAdapterState = getSandboxAdapterState();
  let pendingReadDenyFallback = sandboxAdapterState.pendingReadDenyFallback;
  if (pendingReadDenyFallback === undefined) return;
  sandboxAdapterState.lateSymlinkGrantDenyRoots = normalizeCaseForComparison_2([
    ...sandboxAdapterState.lateSymlinkGrantDenyRoots,
    ...(pendingReadDenyFallback.refreshed ?? []).flatMap((refreshed) => refreshed.spellings),
  ]);
  let dropped = dropForwardedUntrustedGrants(pendingReadDenyFallback.look, pendingReadDenyFallback.refreshed);
  let derived = dropped?.derived;
  let reduced = reduceMasksToPlaceholders(
    derived ?? assertMarkedPathsResolved(SandboxManager_2.getConfig()),
    pendingReadDenyFallback.masksAtStake,
  );
  if (reduced !== undefined) {
    derived = reduced.derived;
    sandboxAdapterState.builtConfigEnforcesAllowlist.set(
      derived,
      sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
    );
  }
  if (derived !== undefined) {
    try {
      installSandboxConfig(derived);
    } catch (error) {
      reportSandboxErrorUnderStandIn(error, "configNotInstalled");
      throw error;
    }
    let installedReadDenyRootResolution = sandboxAdapterState.installedReadDenyRootResolution;
    if (dropped !== undefined && installedReadDenyRootResolution !== undefined) {
      let { allowRead = [], allowWrite } = derived.filesystem;
      sandboxAdapterState.installedReadDenyRootResolution = {
        ...installedReadDenyRootResolution,
        forwardedUntrustedGrants: installedReadDenyRootResolution.forwardedUntrustedGrants.filter(
          (forwardedUntrustedGrant) =>
            (forwardedUntrustedGrant.list === "allowRead" ? allowRead : allowWrite).includes(
              forwardedUntrustedGrant.literal,
            ),
        ),
      };
    }
    let { lead, eventCode } = READ_DENY_FALLBACK_LEADS[pendingReadDenyFallback.cause];
    logFeatureSad("sandbox_exec", eventCode, {
      grants_dropped: dropped?.removed ?? 0,
      masks_reduced: reduced?.reduced ?? 0,
    });
    if (dropped !== undefined)
      logForDebugging(
        pendingReadDenyFallback.refreshed
          ? `[sandbox] ${lead}: ${dropped.removed} repository grant(s) now inside a trusted read-deny path are dropped from the running configuration until the next configuration build (a settings change or restart) decides afresh`
          : `[sandbox] ${lead}: all ${dropped.removed} repository grant(s) are dropped from the running configuration until the next configuration build (a settings change or restart) decides afresh`,
      );
    if (reduced !== undefined)
      logForDebugging(
        `[sandbox] ${lead}: ${reduced.reduced} credential mask(s) a moved path may now cover are reduced to a whole-file placeholder with no credential injection until the next configuration build (a settings change or restart)`,
      );
  }
  sandboxAdapterState.pendingReadDenyFallback = undefined;
}
//@ chunk-qg41pqt6.js:1037911-1038216 layout
function reduceMasksToPlaceholders(config, masksAtStake) {
  let files = config?.credentials?.files;
  if (config === undefined || files === undefined) return;
  let reduced = 0;
  let files_2 = files.map((file) => {
    if (
      file.mode !== "mask" ||
      isSentinelOnlyMask(file) ||
      (masksAtStake !== undefined && !pathsCoverPath(masksAtStake, file.path))
    )
      return file;
    reduced++;
    return {
      path: file.path,
      mode: "mask",
      injectHosts: [],
    };
  });
  if (reduced === 0) return;
  return {
    derived: {
      ...config,
      credentials: {
        ...config.credentials,
        files: files_2,
      },
    },
    reduced,
  };
}
//@ chunk-qg41pqt6.js:1038216-1038813 layout
var READ_DENY_FALLBACK_LEADS = {
  "rebuild-failed": {
    lead: "A trusted read-deny or credential-mask path moved and a rebuilt configuration could not be put in place",
    eventCode: "read_deny_moved_rebuild_failed",
  },
  "look-failed": {
    lead: "Trusted read-deny paths could not be re-checked and no rebuilt configuration was put in place",
    eventCode: "read_deny_look_failed",
  },
  "later-command": {
    lead: "A trusted read-deny or credential-mask path moved after the session's first sandboxed command, so the configuration is narrowed rather than rebuilt (earlier sandboxed commands may still be running)",
    eventCode: "read_deny_moved_mid_session",
  },
};
//@ chunk-qg41pqt6.js:1038813-1038948 layout
/**
 * 凭据遮罩条目是否只是占位：mode 为 mask、injectHosts 为空且没有其他字段。
 */
function isSentinelOnlyMask(credential) {
  return (
    credential.mode === "mask" &&
    credential.injectHosts?.length === 0 &&
    Object.keys(credential).every((key) => key === "path" || key === "mode" || key === "injectHosts")
  );
}
//@ chunk-qg41pqt6.js:1038948-1039612 layout
function dropForwardedUntrustedGrants(look, refreshed) {
  let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (config === undefined) return;
  let denyRoots =
    refreshed &&
    normalizeCaseForComparison_2([
      ...getBuiltinTrustedDenyRoots(),
      ...refreshed.flatMap((entry) => entry.spellings),
    ]);
  let dropped = {
    allowRead: new Set(),
    allowWrite: new Set(),
  };
  for (let { literal, list } of look.forwardedUntrustedGrants)
    if (denyRoots === undefined || pathsCoverPath(denyRoots, literal)) dropped[list].add(literal);
  let filtered = (config.filesystem.allowRead ?? []).filter((path) => !dropped.allowRead.has(path));
  let filtered_2 = config.filesystem.allowWrite.filter((path) => !dropped.allowWrite.has(path));
  let removed =
    (config.filesystem.allowRead ?? []).length -
    filtered.length +
    (config.filesystem.allowWrite.length - filtered_2.length);
  if (removed === 0) return;
  let nextConfig = {
    ...config,
    filesystem: {
      ...config.filesystem,
      allowRead: filtered,
      allowWrite: filtered_2,
    },
  };
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.builtConfigEnforcesAllowlist.set(
    nextConfig,
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
  );
  return {
    derived: nextConfig,
    removed,
  };
}
//@ chunk-qg41pqt6.js:1039612-1039743 layout
/**
 * 内置的可信读禁止根（如 ~/.claude/seed-admin、IDE 锁文件目录等）的规范路径。
 */
function getBuiltinTrustedDenyRoots() {
  let roots = [
    bridgeSpawnDir(),
    resolve(getClaudeConfigDir(), "seed-admin"),
    getBashEditDiffDir(),
    ...getIdeLockfilesPaths(),
    ...[],
  ];
  return normalizeCaseForComparison_2(
    roots
      .flatMap((root) => [root, realpathOrParentRealpath(root)])
      .flatMap((root) => canonicalizeSandboxPath(root) ?? []),
  );
}
//@ chunk-qg41pqt6.js:1039743-1039885 layout
/**
 * 判断一组路径（可含 glob）是否覆盖目标路径：目标先规范化，glob 目标取基目录；同时比较原样与 realpath 拼写。
 */
function pathsCoverPath(denyRoots, path) {
  let canonical = canonicalizeSandboxPath(path);
  if (canonical === undefined || denyRoots.length === 0) return false;
  if (containsGlobChars(canonical)) {
    let globBaseDirectory = getGlobBaseDirectory(canonical);
    return anyGlobPathCovers(
      denyRoots,
      normalizeCaseForComparison_2([globBaseDirectory, canonicalizePathForMaskSweep(globBaseDirectory)]),
    );
  }
  return anyDenyEntryCovers(
    denyRoots,
    normalizeCaseForComparison_2([canonical, canonicalizePathForMaskSweep(canonical)]),
  );
}
//@ chunk-qg41pqt6.js:1039885-1039983 layout
/**
 * pathsCoverPath 的 glob 分支：列表中任一条目（glob 取基目录）与目标任一拼写互相包含即为覆盖（大小写折叠比较）。
 */
function anyGlobPathCovers(roots, paths) {
  return roots.some((root) => {
    let base = containsGlobChars(root) ? getGlobBaseDirectory(root) : root;
    return paths.some((path) => denyEntryCoversFolded(base, path) || denyEntryCoversFolded(path, base));
  });
}
//@ chunk-qg41pqt6.js:1039983-1040042 layout
function anyDenyEntryCovers(roots, paths) {
  return roots.some((root) => paths.some((path) => denyEntryCoversFolded(root, path)));
}
//@ chunk-qg41pqt6.js:1040042-1040148 layout
/**
 * 按进程 cwd 把沙箱路径解析成绝对路径；Windows 去掉尾部 /**，其他平台规整；失败返回 undefined。
 */
function canonicalizeSandboxPath(path) {
  try {
    let againstProcessCwd = resolveAgainstProcessCwd(path);
    return getPlatform() === "windows"
      ? againstProcessCwd.replace(/(?:[/\\]\*\*)+$/, "")
      : removeTrailingGlobSuffix(againstProcessCwd);
  } catch {
    return;
  }
}
//@ chunk-qg41pqt6.js:1040148-1040181 layout
function resolveAgainstProcessCwd(path) {
  return expandPath(path, safeProcessCwd());
}
//@ chunk-qg41pqt6.js:1040181-1040239 layout
function safeProcessCwd() {
  try {
    return process.cwd();
  } catch {
    return getOriginalCwd();
  }
}
//@ chunk-qg41pqt6.js:1040239-1040363 layout
/**
 * 门面 areUnsandboxedCommandsAllowed：沙箱未处于“开着但没在跑”、会话未禁用沙箱外命令、且未配置严格模式时为 true（允许 dangerouslyDisableSandbox 重试）。
 */
function areUnsandboxedCommandsAllowed() {
  return (
    !(getSandboxAdapterState().refusedOverWorkingFolder && isSandboxingEnabled()) &&
    !(hasHardLinkedDenyTargets() && isSandboxingEnabled()) &&
    !sandboxInitFailedUnderRequirement() &&
    !getHostAgentPolicy().unsandboxedCommandsDisabled &&
    !isStrictSandboxModeConfigured()
  );
}
//@ chunk-qg41pqt6.js:1040363-1040420 layout
function isUnsandboxedForbiddenByGb() {
  return getSandboxGbConfig().forbidUnsandboxedCommands === true;
}
//@ chunk-qg41pqt6.js:1040420-1040479 layout
function isUnsandboxedFallbackClosedByTrustedTier() {
  return readSandboxSetting(["allowUnsandboxedCommands"]) === false;
}
//@ chunk-qg41pqt6.js:1040479-1040546 layout
/**
 * 可信来源是否关闭了“沙箱外重跑”的退路：settings 禁止、GrowthBook 禁止或可信层设置禁止任一成立。
 */
function isUnsandboxedFallbackClosedByTrustedSource() {
  return (
    getHostAgentPolicy().unsandboxedCommandsDisabled ||
    isUnsandboxedForbiddenByGb() ||
    isUnsandboxedFallbackClosedByTrustedTier()
  );
}
//@ chunk-qg41pqt6.js:1040546-1040588 layout
// deferred: uses setUserTempRoot (./userTempRoot.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg41pqt6.js:1040546", () => {
  setUserTempRoot(() => getSandboxGbConfig().requireSandboxedAttempt === true);
});
//@ chunk-qg41pqt6.js:1040588-1040677 fingerprint (2.1.88 match: isSandboxRequired, 1)
/**
 * 沙箱是否“必需”：设置开启、平台在 enabledPlatforms 内、且 sandbox.failIfUnavailable（或管理员强制下用户设置的 failIfUnavailable）。
 */
function isSandboxRequired() {
  let settings = getSettings_DEPRECATED();
  return (
    getSandboxEnabledSetting() &&
    isPlatformInEnabledList() &&
    ((settings?.sandbox?.failIfUnavailable ?? false) || isUserFailIfUnavailableUnderMandate())
  );
}
//@ chunk-qg41pqt6.js:1040677-1040760 layout
/**
 * 平台是否支持沙箱：Windows 看 srt-win 是否可用，其他平台用 sandbox-runtime 自带的判断。
 */
function isSupportedPlatform() {
  if (getPlatform() === "windows") return isWindowsSandboxEnabled();
  return getSandboxAdapterState().baseIsSupportedPlatform();
}
//@ chunk-qg41pqt6.js:1040760-1040975 fingerprint (2.1.88 match: isPlatformInEnabledList, 0.881)
/**
 * 托管设置 sandbox.enabledPlatforms 未设为 true；空数组为 false；否则当前平台须在列表里。
 */
function isPlatformInEnabledList() {
  try {
    let enabledPlatforms = getSettingsForSource("policySettings")?.sandbox?.enabledPlatforms;
    if (enabledPlatforms === undefined) return true;
    if (enabledPlatforms.length === 0) return false;
    let currentPlatform = getPlatform();
    return enabledPlatforms.includes(currentPlatform);
  } catch (error) {
    logForDebugging(`Failed to check enabledPlatforms: ${error}`);
    return true;
  }
}
//@ chunk-qg41pqt6.js:1040975-1041145 layout
/**
 * 门面 isSandboxingEnabled：diskless 否；scrub 模式且未开沙箱看 scrub 沙箱可用性；本会话已禁用否；“必需但不可用”时也视为开启（以便拒绝命令）；否则需通过廉价门槛且依赖检查无错误。
 */
function isSandboxingEnabled() {
  if (isDiskless()) return false;
  if (isScrubEnabled() && true && !getSandboxEnabledSetting()) return isScrubSandboxAvailable();
  if (getSandboxAdapterState().sandboxDisabledThisSession) return false;
  if (isRequiredSandboxUnavailable()) return true;
  if (!passesCheapSandboxGates()) return false;
  return checkSandboxDependencies().errors.length === 0;
}
//@ chunk-qg41pqt6.js:1041145-1041189 layout
function isRequiredSandboxStarted() {
  return getSandboxAdapterState().startedOnce && isSandboxRequired();
}
//@ chunk-qg41pqt6.js:1041189-1041252 file-local
/**
 * 沙箱被要求（failIfUnavailable）但当前不可用：平台不支持或依赖检查有错。旧版名 isSandboxingEnabled 错配。
 */
function isRequiredSandboxUnavailable() {
  return (
    isRequiredSandboxStarted() &&
    !isDiskless() &&
    (!isSupportedPlatform() || checkSandboxDependencies().errors.length > 0)
  );
}
//@ chunk-qg41pqt6.js:1041252-1041383 layout
function sandboxInitFailedUnderRequirement() {
  if (isRequiredSandboxUnavailable()) return true;
  let sandboxAdapterState = getSandboxAdapterState();
  return (
    (isSandboxRequired() || sandboxAdapterState.refusedOverWorkingFolder || hasHardLinkedDenyTargets()) &&
    !isDiskless() &&
    sandboxAdapterState.initFailureReason !== undefined &&
    isSandboxingEnabled()
  );
}
//@ chunk-qg41pqt6.js:1041383-1041419 placement
/**
 * 沙箱出口是否受限：沙箱实际生效且不是仅 scrub 模式。
 */
function isSandboxEgressRestricted() {
  return isToolSandboxActive() && !isScrubOnlySandboxMode();
}
//@ chunk-qg41pqt6.js:1041419-1041639 placement
/**
 * 当前会话 Shell 工具是否实际处于沙箱：初始化未失败且（scrub 模式，或依赖探测已缓存时 isSandboxingEnabled，或初始化已开始且未被禁用）。
 */
function isToolSandboxActive() {
  let sandboxAdapterState = getSandboxAdapterState();
  if (sandboxAdapterState.initFailureReason !== undefined) return false;
  if (isScrubOnlySandboxMode()) return true;
  if (sandboxAdapterState.checkDependenciesProbe.cache.has(undefined)) return isSandboxingEnabled();
  return (
    sandboxAdapterState.initializationPromise !== undefined &&
    !sandboxAdapterState.sandboxDisabledThisSession &&
    passesCheapSandboxGates()
  );
}
//@ chunk-qg41pqt6.js:1041639-1041663 placement
function isSandboxHostAllowlistEnforced() {
  return false;
}
//@ chunk-qg41pqt6.js:1041663-1041701 placement
function passesCheapSandboxGates() {
  return getSandboxEnabledSetting() && isPlatformInEnabledList() && isSupportedPlatform();
}
//@ chunk-qg41pqt6.js:1041701-1042025 placement
/**
 * Windows 沙箱需要重新安装时给出 {why, how}：版本过新指向文档，否则提示运行 /sandbox install 或 claude sandbox install。
 */
function describeWindowsSetupAgain(message) {
  let why = describeWindowsSandboxRemedy(message, {
    omitCcRemedy: true,
  }).replace(/\.$/, "");
  if (/set up by a newer release/.test(message))
    return {
      why,
      how: "see https://code.claude.com/docs/en/sandboxing",
    };
  return {
    why,
    how: canRunSandboxInstallHere()
      ? "run /sandbox install (one elevation prompt)"
      : "run `claude sandbox install` in a terminal (one elevation prompt), then start again",
  };
}
//@ chunk-qg41pqt6.js:1042025-1042078 placement
function canRunSandboxInstallHere() {
  return !getIsNonInteractiveSession() && (!isSandboxRequired() || getSandboxAdapterState().startedOnce);
}
//@ chunk-qg41pqt6.js:1042078-1042217 placement
/**
 * 沙箱失败后的两句提示常量：“命令将在无沙箱下运行直到重启”和“沙箱命令将被拒绝直到重启”。
 */
var WITHOUT_SANDBOX_UNTIL_RESTART = "Commands run WITHOUT sandboxing until you restart Claude Code";
var REFUSED_UNTIL_RESTART = "Sandboxed commands are refused until you restart Claude Code";
//@ chunk-qg41pqt6.js:1042217-1042339 placement
function getLocalBindingRestartMode() {
  if (
    getPlatform() !== "windows" ||
    !needsRestartForLocalConnections() ||
    !passesCheapSandboxGates() ||
    checkSandboxDependencies().loopbackMismatch === undefined
  )
    return;
  return isRequiredSandboxStarted() ? "refused" : "unsandboxed";
}
//@ chunk-qg41pqt6.js:1042339-1042742 placement
function getSandboxRestartWarning() {
  let localBindingRestartMode = getLocalBindingRestartMode();
  if (localBindingRestartMode === undefined)
    return isRequiredSandboxUnavailable()
      ? `Sandbox cannot run: ${getSandboxUnavailableReason()?.replace(/^sandbox is enabled but (?:cannot start here: )?/, "")}. Sandboxed commands are refused until it can.`
      : undefined;
  return `Sandbox ${localBindingRestartMode === "refused" ? "cannot run" : "is off"}: sandbox.network.allowLocalBinding changed after this session started, and the sandbox was set up again for the new value. ${localBindingRestartMode === "refused" ? REFUSED_UNTIL_RESTART : WITHOUT_SANDBOX_UNTIL_RESTART}.`;
}
//@ chunk-qg41pqt6.js:1042742-1042970 placement
function getSandboxSetUpAgainWarning() {
  if (getPlatform() !== "windows" || !passesCheapSandboxGates()) return;
  let deps = checkSandboxDependencies();
  let reason = deps.reinstallRequired ?? deps.loopbackMismatch;
  if (reason === undefined) return;
  let { why, how } = describeWindowsSetupAgain(reason);
  return `Sandbox is off: ${why}. Commands run WITHOUT sandboxing until then \xB7 ${how}`;
}
//@ chunk-qg41pqt6.js:1042970-1043498 placement
function getProfileReadSecurityWarnings() {
  if (getPlatform() !== "windows") return [];
  return SandboxManager_2.getWindowsProfileReadWarnings()
    .filter(
      (warning) => warning.code === "profile_exclusion_unprotected" || warning.code === "profile_stale_allow",
    )
    .map(
      (warning) =>
        `Sandboxed commands can read ${warning.paths.length} path(s) in your user profile that sandbox set-up ${warning.code === "profile_stale_allow" ? "no longer means to open" : "excludes as credential stores"} and could not close: ${warning.paths
          .slice(0, 5)
          .map((path) => path.path)
          .join(
            ", ",
          )}${warning.paths.length > 5 ? ", \u2026" : ""}. Only their owner or an administrator can close them.`,
    );
}
//@ chunk-qg41pqt6.js:1043498-1045128 callgraph-witnessed (2.1.88 match: getSandboxUnavailableReason, 0.196)
/**
 * 沙箱开启但无法使用的原因：平台不支持（WSL1、Windows 门控、其他系统）、diskless、Windows allowLocalBinding 变更需重启、需重新安装、依赖缺失（给出 apt install bubblewrap socat 或 /sandbox 提示）。
 */
function getSandboxUnavailableReason() {
  if (!getSandboxEnabledSetting()) return;
  if (!isPlatformInEnabledList()) return;
  if (!isSupportedPlatform()) {
    let platform = getPlatform();
    if (platform === "wsl") return "sandbox is enabled but WSL1 is not supported (requires WSL2)";
    if (platform === "windows")
      return "sandbox is enabled but the Windows sandbox is not active on this session (feature gate off)";
    return `sandbox is enabled but ${platform} is not supported (requires macOS, Linux, or WSL2)`;
  }
  if (isDiskless()) return "sandbox is enabled but unavailable in this session";
  let deps = checkSandboxDependencies();
  let platform = getLocalBindingRestartMode();
  if (platform !== undefined)
    return `sandbox is enabled but sandbox.network.allowLocalBinding changed after this session started, and the sandbox was set up again for the new value \xB7 ${platform === "refused" ? REFUSED_UNTIL_RESTART : WITHOUT_SANDBOX_UNTIL_RESTART}`;
  let reason = deps.reinstallRequired ?? deps.loopbackMismatch;
  if (reason !== undefined) {
    let { why, how } = describeWindowsSetupAgain(reason);
    return `sandbox is enabled but has to be set up again: ${why} \xB7 ${how}`;
  }
  if (deps.errors.length > 0) {
    let platform = getPlatform();
    let hint = getIsNonInteractiveSession()
      ? "see https://code.claude.com/docs/en/sandboxing"
      : "run /sandbox for details";
    let any = deps.errors.some((error) => / not (installed|found)\b/.test(error));
    let remedy;
    if (platform === "macos") remedy = hint;
    else if (platform === "windows")
      remedy =
        canRunSandboxInstallHere() && !deps.errors.some((error) => error.startsWith("srt-win"))
          ? areSandboxSettingsOverriddenByFlagOrPolicy()
            ? "run /sandbox install, more info at https://code.claude.com/docs/en/sandboxing"
            : `run /sandbox install, or ${hint}`
          : "ask your administrator to install the network filters, or see https://code.claude.com/docs/en/sandboxing";
    else remedy = any ? `install missing tools (e.g. apt install bubblewrap socat) or ${hint}` : hint;
    let headline =
      any || platform === "windows"
        ? "sandbox is enabled but dependencies are missing"
        : "sandbox is enabled but cannot start here";
    let joined = deps.errors.map((error) => describeWindowsSandboxRemedy(error)).join(", ");
    return remedy === hint &&
      getIsNonInteractiveSession() &&
      joined.includes("https://code.claude.com/docs/en/sandboxing")
      ? `${headline}: ${joined}`
      : `${headline}: ${joined} \xB7 ${remedy}`;
  }
  return;
}
//@ chunk-qg41pqt6.js:1045128-1047381 layout
function buildMaskCredentialWarning(config) {
  let files = config.credentials?.files ?? [];
  let mapped = files.filter((file) => file.mode === "mask").map((file) => file.path);
  let sentinelPaths = new Set(
    files.filter((file) => file.mode === "mask" && file.injectHosts?.length === 0).map((file) => file.path),
  );
  let degradedPaths = getPlatform() === "macos" && config.filesystem.disabled ? mapped : [];
  let degradedSet = new Set(degradedPaths);
  let sentinelOnly = [
    ...(config.credentials?.envVars ?? [])
      .filter((envVar) => envVar.mode === "mask" && envVar.injectHosts?.length === 0)
      .map((envVar) => envVar.name),
    ...[...sentinelPaths].filter((path) => !degradedSet.has(path)),
  ];
  let needsTls = [
    ...(config.credentials?.envVars ?? [])
      .filter((envVar) => envVar.mode === "mask" && envVar.injectHosts?.length !== 0)
      .map((envVar) => envVar.name),
    ...(degradedPaths.length > 0 ? [] : mapped.filter((path) => !sentinelPaths.has(path))),
  ];
  let warnings = [];
  if (sentinelOnly.length > 0)
    warnings.push(
      `sandbox.credentials mask entries (${sentinelOnly.join(", ")}) have an ` +
        "empty injectHosts \u2014 sandboxed commands see only a sentinel and the " +
        "proxy never substitutes the real credential, so tools needing these will fail to authenticate. If the adapter forced this (a filesystem.allowRead entry re-opened a denied credential path), remove the conflicting allowRead entry or the deny; if a parent/managed settings tier supplied this mask, sentinel-only is its intended posture (that channel cannot grant injection, so an injectHosts set there is stripped on load) and the entry can only be removed in the parent settings; otherwise set injectHosts or remove the entry",
    );
  if (degradedPaths.length > 0)
    warnings.push(
      `sandbox.credentials file mask entries (${degradedPaths.join(", ")}) ` +
        "degrade to deny on macOS \u2014 the files are unreadable inside the " +
        'sandbox (no sentinel, no proxy injection), so tools reading them will fail. Note that switching them to mode "deny" would NOT keep that protection while the relaxed filesystem policy is active (denies ' +
        "are dropped there, exposing the real bytes) \u2014 set " +
        "sandbox.filesystem.disabled: false in user or managed settings (ignored if managed settings pin the filesystem layer), or remove the entries",
    );
  if (
    needsTls.length > 0 &&
    config.network.tlsTerminate === undefined &&
    !config.credentials?.allowPlaintextInject
  )
    warnings.push(
      `sandbox.credentials mask entries (${needsTls.join(", ")}) are configured ` +
        "but TLS termination is unavailable \u2014 sandboxed commands see only a " +
        "sentinel value and the proxy cannot substitute the real credential on egress, so tools needing these will fail to authenticate. Enable sandbox.network.tlsTerminate, or remove the mask entries",
    );
  return warnings.length > 0 ? warnings.join(" \xB7 ") : undefined;
}
//@ chunk-qg41pqt6.js:1047381-1047546 layout
/**
 * 计算凭据遮罩相关的安全警告文本；不满足触发条件或出错时返回 undefined（错误只记日志）。
 */
function getMaskCredentialWarning() {
  try {
    if (!canMaskCredentialWarningFire()) return;
    let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
    if (config === undefined) return;
    return buildMaskCredentialWarning(config);
  } catch (error) {
    logForDebugging(`Failed to compute mask credential warning: ${error}`);
    return;
  }
}
//@ chunk-qg41pqt6.js:1047546-1047603 layout
function canMaskCredentialWarningFire() {
  let scrubAvailable = isScrubEnabled() && true && isScrubSandboxAvailable();
  return (getSandboxEnabledSetting() || scrubAvailable) && isPlatformInEnabledList();
}
//@ chunk-qg41pqt6.js:1047603-1048124 fingerprint (2.1.88 match: getLinuxGlobPatternWarnings, 0.952)
/**
 * Linux/WSL 上 Edit/Read 规则里含 bubblewrap 无法表达的 glob（尾部 /** 之外）时返回这些规则用于告警。
 */
function getLinuxGlobPatternWarnings_2() {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return [];
  try {
    if (!getSandboxEnabledSetting()) return [];
    let permissions = getSettings_DEPRECATED()?.permissions || {};
    let warnings = [];
    let hasGlobInUnguardedPart = (ruleContent, isDeny) => {
      let unescaped = unescapeGlobPattern(ruleContent);
      let isRooted = ruleContent.startsWith("/") && !ruleContent.startsWith("//");
      let replaced = (isDeny || isRooted ? unescaped.replace(/\/+$/, "") : unescaped).replace(/\/\*\*$/, "");
      return containsGlobChars(replaced);
    };
    for (let [ruleString, isDeny] of [
      ...(permissions.allow || []).map((ruleString) => [ruleString, false]),
      ...(permissions.deny || []).map((path) => [path, true]),
    ]) {
      let rule = parseRuleForSandbox(ruleString);
      if (
        (rule.toolName === EDIT || rule.toolName === READ) &&
        rule.ruleContent &&
        (isDeny || !permissionRuleValueFromString(rule)) &&
        hasGlobInUnguardedPart(rule.ruleContent, isDeny)
      )
        warnings.push(ruleString);
    }
    return warnings;
  } catch (error) {
    logForDebugging(`Failed to get Linux glob pattern warnings: ${error}`);
    return [];
  }
}
//@ chunk-qg41pqt6.js:1048124-1048705 placement
/**
 * 找出沙箱网络 allow/deny 设置中写法有问题的 IPv6/主机条目（含 @、裸 IPv6、末尾多个点、方括号格式错误或端口非法），用于提示警告。
 */
function getInvalidIpv6DomainEntries() {
  try {
    let settings_DEPRECATED = getSettings_DEPRECATED();
    let sources = [...(settings_DEPRECATED ? [settings_DEPRECATED] : []), ...getAllPolicyTierSettings()];
    let bad = new Set();
    for (let access of ["allow", "deny"])
      for (let entry of collectNetworkDomainEntries(sources, access))
        if (entry.includes("@")) bad.add(entry);
        else if (isBareIpv6Literal(entry)) bad.add(entry);
        else if (!entry.startsWith("[") && /\.{2,}$/.test(splitDomainPatternPort(entry).hostPattern))
          bad.add(entry);
        else if (entry.startsWith("[")) {
          let closeIndex = entry.indexOf("]");
          let portPart = closeIndex === -1 ? undefined : entry.slice(closeIndex + 1);
          let hostPart = closeIndex === -1 ? undefined : entry.slice(1, closeIndex);
          if (
            portPart === undefined ||
            hostPart === undefined ||
            (portPart !== "" &&
              (!portPart.startsWith(":") ||
                !TCP_PORT_PATTERN.test(portPart.slice(1)) ||
                Number(portPart.slice(1)) > 65535)) ||
            canonicalizeHost(hostPart) === undefined ||
            hostnameCanonicalFormDiffers(hostPart) ||
            hostPart.includes("*")
          )
            bad.add(entry);
        }
    return [...bad];
  } catch (error) {
    logForDebugging(`Failed to get IPv6 domain entry warnings: ${error}`);
    return [];
  }
}
//@ chunk-qg41pqt6.js:1048705-1049101 placement
/**
 * 找出沙箱凭据注入主机（injectHosts）中写法有问题的 IPv6 条目（含多个冒号却不是规范 IPv6），用于提示警告。
 */
function getInvalidInjectHostEntries() {
  try {
    let settings_DEPRECATED = getSettings_DEPRECATED();
    let sources = [...(settings_DEPRECATED ? [settings_DEPRECATED] : []), ...getAllPolicyTierSettings()];
    let bad = new Set();
    for (let settings of sources) {
      let credentials = settings.sandbox?.credentials;
      for (let credential of [...(credentials?.envVars ?? []), ...(credentials?.files ?? [])])
        for (let host of credential.injectHosts ?? []) {
          let index = host.indexOf(":");
          if (index === -1 || host.indexOf(":", index + 1) === -1) continue;
          if (isIP(host) === 6 && canonicalizeHost(host) === host.toLowerCase()) continue;
          bad.add(host);
        }
    }
    return [...bad];
  } catch (error) {
    logForDebugging(`Failed to get injectHosts entry warnings: ${error}`);
    return [];
  }
}
//@ chunk-qg41pqt6.js:1049101-1049197 placement (2.1.88 match: getEnabledSettingSources, 0.863)
/**
 * flagSettings 或 policySettings 是否设置了指定的 sandbox 键。
 */
function isSandboxSettingOverriddenByPolicy(key) {
  return ["flagSettings", "policySettings"].some(
    (sourceName) => getSettingsForSource(sourceName)?.sandbox?.[key] !== undefined,
  );
}
//@ chunk-qg41pqt6.js:1049197-1049299 placement
/**
 * flag/policy 层任一设置了 enabled、autoAllowBashIfSandboxed、allowUnsandboxedCommands 时为真（SandboxManager.areSandboxSettingsLockedByPolicy 实际指向它）。
 */
function areSandboxSettingsOverriddenByFlagOrPolicy() {
  return (
    isSandboxSettingOverriddenByPolicy("enabled") ||
    isSandboxSettingOverriddenByPolicy("autoAllowBashIfSandboxed") ||
    isSandboxSettingOverriddenByPolicy("allowUnsandboxedCommands")
  );
}
//@ chunk-qg41pqt6.js:1049299-1049924 fingerprint (2.1.88 match: setSandboxSettings, 0.671)
/**
 * 把 sandbox.enabled/autoAllowBashIfSandboxed/allowUnsandboxedCommands 写入 localSettings（只写变化项）。
 */
async function setSandboxSettings(options) {
  let { error } = await updateSettingsForSourceWithTransform("localSettings", (settings) => {
    let patch = {
      ...(options.enabled !== undefined &&
        settings?.sandbox?.enabled !== options.enabled && {
          enabled: options.enabled,
        }),
      ...(options.autoAllowBashIfSandboxed !== undefined &&
        settings?.sandbox?.autoAllowBashIfSandboxed !== options.autoAllowBashIfSandboxed && {
          autoAllowBashIfSandboxed: options.autoAllowBashIfSandboxed,
        }),
      ...(options.allowUnsandboxedCommands !== undefined &&
        settings?.sandbox?.allowUnsandboxedCommands !== options.allowUnsandboxedCommands && {
          allowUnsandboxedCommands: options.allowUnsandboxedCommands,
        }),
    };
    if (Object.keys(patch).length === 0) return null;
    return {
      sandbox: patch,
    };
  });
  if (error) logFeatureBad("sandbox_set_settings", "save_failed");
  else logFeatureOk("sandbox_set_settings");
  return {
    error,
  };
}
//@ chunk-qg41pqt6.js:1049924-1050334 placement (2.1.88 match: containsExcludedCommand, 0.15)
/**
 * 门面 getExcludedCommands：合并设置的 sandbox.excludedCommands；管理员强制时只认可信层（托管、--settings、用户设置），并记一次被忽略条数。
 */
function getExcludedCommands() {
  let excludedCommands = getSettings_DEPRECATED()?.sandbox?.excludedCommands ?? [];
  if (!isAdminSandboxMandate()) return excludedCommands;
  let trustedExcludedCommands = getTrustedExcludedCommands();
  let settings = getSandboxAdapterState();
  if (!settings.droppedRepoExcludedCommandsLogged) {
    settings.droppedRepoExcludedCommandsLogged = true;
    let trustedSet = new Set(trustedExcludedCommands);
    let droppedCount = countWhere(excludedCommands, (command) => !trustedSet.has(command));
    if (droppedCount > 0)
      logForDebugging(
        `[sandbox] excludedCommands restricted to trusted settings tiers: ignoring ${droppedCount} sandbox.excludedCommands entr${droppedCount === 1 ? "y" : "ies"} not set by managed, --settings, or user settings`,
      );
  }
  return trustedExcludedCommands;
}
//@ chunk-qg41pqt6.js:1050334-1050445 placement
function getConfiguredNetworkAllowances() {
  if (isScrubOnlySandboxMode())
    return {
      ...ALLOW_ALL_UNIX_SOCKETS,
    };
  if (env.CLAUDE_CODE_EVAL_CONFINED) return {};
  return getNetworkAllowances(getSettings_DEPRECATED()?.sandbox?.network);
}
//@ chunk-qg41pqt6.js:1050445-1050497 placement
function isAllowAllUnixSocketsConfigured() {
  return getConfiguredNetworkAllowances().allowAllUnixSockets === true;
}
//@ chunk-qg41pqt6.js:1050497-1051219 placement
/**
 * 汇总各设置来源的 sandbox.filesystem.allowWrite/allowRead：管理员强制时丢弃不可信来源的写授权；落在可信读禁止区内或含 glob 的不可信授权被过滤；allowManagedReadPathsOnly 时 allowRead 只取托管层。
 */
function getConfiguredFilesystemGrants() {
  let adminMandate = isAdminSandboxMandate();
  let hasTrustedDenies = adminMandate || hasTrustedReadDenies();
  let denyRoots;
  let rootsUnresolved = false;
  if (hasTrustedDenies)
    try {
      denyRoots = getTrustedReadDenyRoots();
    } catch {
      rootsUnresolved = true;
    }
  let resolvedRoots;
  let getDenyRoots = () =>
    (resolvedRoots ??= denyRoots
      ? resolveTrustedReadDenyRoots(denyRoots).roots
      : getBuiltinTrustedDenyRoots());
  let isWidening = (sourceEntry, literal) => {
    if (!sourceEntry.widensUntrusted) return false;
    if (rootsUnresolved) return true;
    let roots = getDenyRoots();
    try {
      let sandboxFilesystemPath = resolveSandboxFilesystemPath(literal, sourceEntry.source);
      let canonical = canonicalizeSandboxPath(sandboxFilesystemPath) ?? "";
      return (
        pathsCoverPath(roots, sandboxFilesystemPath) ||
        (hasTrustedDenies && (containsGlobChars(canonical) || isNetworkSpelledGrantRoot(canonical)))
      );
    } catch {
      return true;
    }
  };
  let mapped = SETTING_SOURCES.filter((sourceName) => isSettingSourceEnabled(sourceName)).map(
    (sourceName) => ({
      source: sourceName,
      widensUntrusted:
        isRepoSettingSource(sourceName) ||
        (sourceName === "policySettings" && !isPolicySlotAdminOrParentComposed()),
      filesystem: getSettingsForSource(sourceName)?.sandbox?.filesystem,
    }),
  );
  let allPolicyTierSettings = getAllPolicyTierSettings();
  let any = allPolicyTierSettings.some(
    (policyTierSetting) => policyTierSetting.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
  );
  return {
    allowWrite: normalizeCaseForComparison_2(
      mapped.flatMap((sourceEntry) =>
        adminMandate && sourceEntry.widensUntrusted
          ? []
          : (sourceEntry.filesystem?.allowWrite ?? []).filter((literal) => !isWidening(sourceEntry, literal)),
      ),
    ),
    allowRead: normalizeCaseForComparison_2(
      any
        ? allPolicyTierSettings.flatMap(
            (policyTierSetting) => policyTierSetting.sandbox?.filesystem?.allowRead ?? [],
          )
        : mapped.flatMap((sourceEntry) =>
            (sourceEntry.filesystem?.allowRead ?? []).filter((literal) => !isWidening(sourceEntry, literal)),
          ),
    ),
  };
}
//@ chunk-qg41pqt6.js:1051219-1051251 layout
var TENGU_OPTIMIZED_CANDY = "tengu_optimized_candy";
//@ chunk-qg41pqt6.js:1051251-1051327 layout
function hasHardLinkedDenyTargets() {
  return (
    getSandboxAdapterState().hardLinkedDenyTargets !== undefined &&
    readFlagWithOverride(TENGU_OPTIMIZED_CANDY, {
      safe: true,
    })
  );
}
//@ chunk-qg41pqt6.js:1051327-1052051 layout
function hardLinkSandboxInitFailureText() {
  let hardLinkedDenyTargets = getSandboxAdapterState().hardLinkedDenyTargets ?? [];
  let targets = normalizeCaseForComparison_2(hardLinkedDenyTargets.map(describeHardLinkLocation));
  let filtered = targets.filter((place) => place !== null);
  return `Sandbox is enabled but failed to initialize: the sandbox cannot protect one or more of the files it guards${filtered.length === 0 ? "" : ` ${filtered.join(" and ")}${filtered.length < targets.length ? " and elsewhere" : ""}`}, because at least one of them has more than one hard link (another name points at the same file). Until someone removes the extra link (from a terminal outside Claude Code), commands that would run in the sandbox are refused, and so is a request to run one outside the sandbox (dangerouslyDisableSandbox): do not retry that way. No restart is needed once the link is gone. If you did not create that link, treat the file as untrusted.`;
}
//@ chunk-qg41pqt6.js:1052051-1052293 layout
function describeHardLinkLocation(path) {
  let replaced = stripExtendedPathPrefix(path).replace(/\\/g, "/");
  let found = [
    ...userSettingsHomes().map((home) => [home, "in Claude Code's configuration folder"]),
    [safeProcessCwd(), "in the working folder"],
    [homedir(), "in your home folder"],
  ].find(([root]) => isPathPrefixOf(root.replace(/\\/g, "/"), replaced));
  return found === undefined ? null : found[1];
}
//@ chunk-qg41pqt6.js:1052293-1054384 placement
/**
 * 包装命令前确保沙箱已初始化：必需但不可用直接抛 SandboxInitFailedError（并禁止 dangerouslyDisableSandbox）；懒初始化；初始化失败时按“工作目录被拒/必需/普通”给出不同错误（普通情况本会话禁用沙箱）；之后刷新 Windows 授权、复查读禁止根等。
 */
async function ensureInitializedForWrap() {
  if (isSandboxingEnabled()) {
    if (isRequiredSandboxUnavailable()) {
      logFeatureBad("sandbox_exec", "sandbox_exec_lost_and_required");
      throw new SandboxInitFailedError(
        `Sandbox is required (sandbox.failIfUnavailable) and stopped being available in this session: ${getSandboxUnavailableReason()}. The command was refused, and so is a request to run it outside the sandbox (dangerouslyDisableSandbox): do not retry it that way. Only commands the user runs themselves with the \`!\` prefix, and commands their settings exclude from the sandbox, still run.`,
      );
    }
    if (!getSandboxAdapterState().initializationPromise) {
      logFeatureSad("sandbox_exec", "sandbox_exec_lazy_init");
      await initializeSandbox();
    }
    let initializationPromise = getSandboxAdapterState().initializationPromise;
    if (initializationPromise) await initializationPromise;
    if (getSandboxAdapterState().startsFailed === 1 && isUnlistableWorktreesDenyEnabled()) {
      if (
        !getSandboxAdapterState().initializationPromise &&
        getSandboxAdapterState().realPathTwins === "listed"
      )
        await initializeSandbox();
      let initializationPromise = getSandboxAdapterState().initializationPromise;
      if (initializationPromise) await initializationPromise;
    }
    let { initializationPromise: initializationPromise_2, realPathTwins } = getSandboxAdapterState();
    if (!initializationPromise_2 && realPathTwins === "listed") {
      getSandboxAdapterState().realPathTwins = "off";
      logForDebugging(
        `[sandbox] real-path twins are off for this try: a start with them listed failed (${getSandboxAdapterState().initFailureCode}). If it works, they stay off until settings change.`,
        {
          level: "warn",
        },
      );
      await initializeSandbox();
    }
    let initializationPromise_3 = getSandboxAdapterState().initializationPromise;
    await initializationPromise_3;
    if (!getSandboxAdapterState().initializationPromise && getSandboxAdapterState().realPathTwins === "off")
      getSandboxAdapterState().realPathTwins = "listed";
    if (
      !initializationPromise_3 ||
      getSandboxAdapterState().initializationPromise !== initializationPromise_3
    ) {
      if (hasHardLinkedDenyTargets()) {
        logFeatureBad("sandbox_exec", "sandbox_exec_hardlinked_deny_target");
        throw new SandboxInitFailedError(hardLinkSandboxInitFailureText());
      }
      logFeatureBad("sandbox_exec", "sandbox_exec_not_initialized");
      let { initFailureReason } = getSandboxAdapterState();
      let reasonSuffix = initFailureReason ? `: ${initFailureReason}` : "";
      if (getSandboxAdapterState().refusedOverWorkingFolder)
        throw new SandboxInitFailedError(
          `Sandbox is enabled but failed to initialize${reasonSuffix}. Until the sandbox can start, commands that would run in it are refused.`,
        );
      if (isSandboxRequired() || (isScrubEnabled() && isScrubSandboxAvailable()))
        throw new SandboxInitFailedError(
          `Sandbox is required but failed to initialize${reasonSuffix}. ${getSandboxAdapterState().configBuildFailed ? "Fix the sandbox settings to retry (a --settings file is pinned for the process: restart)." : "Restart to retry."} Running it outside the sandbox (dangerouslyDisableSandbox) is not allowed either.`,
        );
      getSandboxAdapterState().sandboxDisabledThisSession = true;
      throw new SandboxInitFailedError(
        `Sandbox is enabled but failed to initialize${reasonSuffix}. Sandboxing is disabled for the rest of this session; restart to retry.`,
      );
    }
    await ensureBridgeSpawnRootDir();
    if (getPlatform() === "windows") await ensureSelfExecGrant();
    ensureAtomicWriteStagingDirs();
    recheckReadDenyRoots();
    rescreenDenyLiteralSymlinks();
    rescreenLateSymlinkGrants();
    recordSessionWrapWriteRoots();
  }
}
//@ chunk-qg41pqt6.js:1054384-1054530 placement
/**
 * 把 Windows 沙箱“命令行过长 / CreateProcessW 限制”错误转成友好的 SandboxCommandTooLongError，其他错误原样返回。
 */
function mapWindowsArgvTooLong(error, addedDenies = false) {
  return error instanceof Error && /Windows sandbox argv is|CreateProcessW limit/i.test(error.message)
    ? windowsArgvTooLongError(addedDenies ? "added_denies" : "command")
    : error;
}
//@ chunk-qg41pqt6.js:1054530-1055964 placement
/**
 * 构造 Windows 沙箱命令过长（或环境变量过大）的错误，附处理建议并上报遥测。
 */
function windowsArgvTooLongError(tooLong = "command") {
  if (tooLong === "added_denies") {
    logFeatureBad("sandbox_exec", "windows_argv_too_long_with_added_denies");
    return new SandboxCommandTooLongError(
      "Command is too long to run in the Windows sandbox. Folders added since the sandbox started, such as worktrees or /add-dir folders, each add file rules that are sent with every command, and those rules plus this command reach the Windows command-line limit. If the command is long, write it to a file and run that file (on PowerShell the script is base64-encoded first, ~2.7x). If it is short, splitting it will not help: the worktree rules of a sub-agent are removed when it finishes, so run fewer sub-agents at once, or restart Claude Code.",
    );
  }
  logFeatureBad(
    "sandbox_exec",
    tooLong === "command" ? "windows_argv_too_long" : "windows_child_env_too_long",
  );
  return new SandboxCommandTooLongError(
    tooLong === "command"
      ? "Command is too long to run in the Windows sandbox: the assembled command line is near the OS limit, and the budget also covers the sandbox arguments, so trimming to just under the limit will not help. On PowerShell the script is base64-encoded first (~2.7x), leaving roughly 10,000 characters of script. Write the script to a file and run that file instead, or split the command up."
      : "The environment variables that your settings files or /env set leave no room for this command in the Windows sandbox: the variables and the command together come to more than 30,000 characters. Shorten the env block in your settings, or move long values into files.",
  );
}
//@ chunk-qg41pqt6.js:1055964-1057126 placement
/**
 * 把 Windows 沙箱特定退出码（1 拒绝访问、19 loopback 模式变更、16 映射网络盘 cwd）换成给模型看的说明文字。
 */
function classifyWindowsSandboxLaunchExit(code, stderrText) {
  if (code === 1 && isSeclogonAccessDenied(stderrText)) {
    getSandboxAdapterState().selfExecGrantAttempt = undefined;
    return "Windows refused to start Claude Code as the sandbox account (access denied, 0x80070005), so the command most likely did not run. The Secondary Logon service is not the cause. Claude Code tries to set the permission on its program file again before the next command, so try the command once more. If it fails the same way, stop and tell the user.";
  }
  if (code === 19 && parseWindowsSandboxError(stderrText)?.code === "wfp_loopback_mismatch") {
    logFeatureBad("sandbox_exec", "windows_loopback_mode_changed");
    return "The command did not run: the sandbox on this machine was set up again with the other setting for local connections (sandbox.network.allowLocalBinding) since this session started, and a session keeps the one it started with. Every sandboxed command is refused like this one until Claude Code is restarted: tell the user to restart Claude Code.";
  }
  if (code !== 16) return;
  let windowsSandboxError = parseWindowsSandboxError(stderrText);
  if (windowsSandboxError?.code !== "mapped_drive_cwd") return;
  logFeatureBad("sandbox_exec", "windows_mapped_drive_cwd");
  return `The sandbox can't run commands from a network drive${windowsSandboxError.drive ? ` (${windowsSandboxError.drive})` : ""}: mapped drives don't exist for the sandbox account. Use a workspace on a local drive.`;
}
//@ chunk-qg41pqt6.js:1057126-1057416 placement
function mapLinuxBridgeError(error) {
  if (error instanceof Error && /bridge socket does not exist/i.test(error.message)) {
    logFeatureSad("sandbox_exec", "sandbox_linux_bridge_dead");
    let bridge = /SOCKS/i.test(error.message) ? "SOCKS" : "HTTP";
    return new SandboxBridgeUnavailableError(
      `Linux sandbox ${bridge} bridge socket is missing (socat may have died). Restart to retry.`,
    );
  }
  return error;
}
//@ chunk-qg41pqt6.js:1057416-1057493 layout
/**
 * 把包装失败转成 commandNotWrapped 错误；若是本次 abort 的原因则原样返回。
 */
function toCommandNotWrappedError(error, signal) {
  return signal?.aborted && error === signal.reason
    ? error
    : describeUnreadableSandboxError(error, "commandNotWrapped");
}
//@ chunk-qg41pqt6.js:1057493-1057645 fingerprint (2.1.88 match: wrapWithSandbox, 0.559)
/**
 * 门面 wrapWithSandbox：ensureInitializedForWrap 后调用 sandbox-runtime 把命令串包成沙箱命令（macOS sandbox-exec 配置 / Linux bwrap+seccomp+socat 代理）。
 */
async function wrapWithSandbox_2(command, args, shell, signal, options) {
  await ensureInitializedForWrap();
  assertTaskOutputDirChainPlain();
  verifyStagedMcpCallDir();
  try {
    let result = await SandboxManager_2.wrapWithSandbox(command, args, shell, signal, options);
    logFeatureOk("sandbox_exec");
    return result;
  } catch (error) {
    throw toCommandNotWrappedError(mapLinuxBridgeError(error), signal);
  }
}
//@ chunk-qg41pqt6.js:1057645-1058308 placement
/**
 * 门面 wrapWithSandboxArgv（Windows 唯一方式）：合并原生 deny 列表后调用 sandbox-runtime 得到 {argv, env}，再算出与当前环境的差异 env 与需 unset 的变量（含 credentials.envVars 的 deny 项）。
 */
async function wrapWithSandboxArgv(command, argv, config, signal, options) {
  await ensureInitializedForWrap();
  assertTaskOutputDirChainPlain();
  verifyStagedMcpCallDir();
  let nativeDenies = getSandboxAdapterState().nativeDenies;
  let effectiveConfig =
    nativeDenies === undefined
      ? passLateWindowsDenies(config)
      : await raceAbortSignal(withRenewedNativeDenies(config), signal);
  let deniesRenewed = nativeDenies === undefined && effectiveConfig !== config;
  let wrapped;
  try {
    wrapped = await SandboxManager_2.wrapWithSandboxArgv(
      command,
      argv,
      effectiveConfig,
      signal,
      undefined,
      options,
    );
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "wfp_loopback_mismatch")
      error.message = describeWindowsSandboxRemedy(error.message);
    throw toCommandNotWrappedError(mapWindowsArgvTooLong(mapLinuxBridgeError(error), deniesRenewed), signal);
  }
  let wrappedEnvKeys = new Set(Object.keys(wrapped.env));
  let envPatch = {};
  for (let [key, value] of Object.entries(wrapped.env))
    if (value !== undefined && process.env[key] !== value) envPatch[key] = value;
  let unsetEnv = new Set();
  for (let key of Object.keys(process.env)) if (!wrappedEnvKeys.has(key)) unsetEnv.add(key);
  let credentials = SandboxManager_2.getConfig()?.credentials;
  for (let envVar of credentials?.envVars ?? []) if (envVar.mode === "deny") unsetEnv.add(envVar.name);
  logFeatureOk("sandbox_exec");
  return {
    argv: wrapped.argv,
    env: envPatch,
    unsetEnv: [...unsetEnv],
  };
}
//@ chunk-qg41pqt6.js:1058308-1058315 placement
var taskOutputDirChainRoot;
//@ chunk-qg41pqt6.js:1058315-1058587 placement
function assertTaskOutputDirChainPlain() {
  let dir = taskOutputDirChainRoot;
  if (dir === undefined) return;
  if (!ensurePrivateDirChain(getClaudeTempDirRealpath(), dir))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sandbox: the task output directory chain under the temp root is no longer plain directories (${dir}); refusing to run sandboxed commands until it is restored`,
      "sandbox task output dir chain not plain",
    );
}
//@ chunk-qg41pqt6.js:1058587-1058594 placement
var mcpCallTempRoot;
//@ chunk-qg41pqt6.js:1058594-1058684 placement
/**
 * 包装命令前检查暂存的 mcp_call 目录在 temp 根下仍是普通目录（必要时清掉文件）；不是则沙箱命令被拒。
 */
function verifyStagedMcpCallDir() {
  let dir = mcpCallTempRoot;
  if (dir === undefined) return true;
  if (isParentDirReal(dir))
    try {
      unlinkSync(dir);
    } catch {}
  return ensurePrivateDirChain(getClaudeTempDirRealpath(), dir);
}
//@ chunk-qg41pqt6.js:1058684-1064281 placement
/**
 * 门面 initialize：构建配置 Q0(settings)（Windows 拒绝在家目录/配置目录下作工作目录）→ Windows 先确保自执行授权、原生 deny → SandboxManager.initialize；成功后订阅设置/插件目录/GrowthBook 变化以热更新配置（refreshConfig）；配置构建失败则等待设置变化再试。网络请求询问回调在 allowManagedDomainsOnly 时一律拒绝。
 */
async function initializeSandbox(askCallback) {
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.askCallback =
    askCallback ?? (getPlatform() === "windows" ? sandboxAdapterState.askCallback : undefined);
  if (sandboxAdapterState.initializationPromise) return sandboxAdapterState.initializationPromise;
  if (sandboxAdapterState.configBuildFailed) return;
  if (!isSandboxingEnabled()) return;
  let { askCallback: askCallback_2 } = sandboxAdapterState;
  let guardedAsk = askCallback_2
    ? async (hostPattern) => {
        if (shouldAllowManagedSandboxDomainsOnly()) {
          logForDebugging(
            `[sandbox] Blocked network request to ${hostPattern.host} (allowManagedDomainsOnly)`,
          );
          return false;
        }
        return askCallback_2(hostPattern);
      }
    : undefined;
  let failed = false;
  sandboxAdapterState.initializationPromise = (async () => {
    let config;
    try {
      if (
        getPlatform() === "windows" &&
        isUnderGitHome(safeProcessCwd(), getGitHomeInfo(homedir(), userSettingsHomes()))
      )
        throw new WindowsSandboxError_2(HOME_AS_CWD_NOTE);
      config = convertToSandboxRuntimeConfig(getSettings_DEPRECATED());
    } catch (error) {
      failed = true;
      recordSandboxInitFailure(error);
      if (!(error instanceof SandboxPathEntryError)) return;
      let sandboxAdapterState = getSandboxAdapterState();
      sandboxAdapterState.configBuildFailed = true;
      try {
        sandboxAdapterState.settingsSubscriptionCleanup?.();
        let fired = false;
        let unsubscribe = settingsChangeDetector.subscribe(() => {
          if (fired) return;
          fired = true;
          unsubscribe();
          let sandboxAdapterState = getSandboxAdapterState();
          sandboxAdapterState.configBuildFailed = false;
          sandboxAdapterState.realPathTwins = "unlisted";
          if (sandboxAdapterState.settingsSubscriptionCleanup === unsubscribe)
            sandboxAdapterState.settingsSubscriptionCleanup = undefined;
        });
        sandboxAdapterState.settingsSubscriptionCleanup = unsubscribe;
      } catch (error) {
        sandboxAdapterState.configBuildFailed = false;
        sandboxAdapterState.settingsSubscriptionCleanup = undefined;
        reportSandboxErrorUnderStandIn(error, "settingsWatchNotArmed");
      }
      return;
    }
    try {
      getSandboxAdapterState().initializedWithTlsTerminate = config.network?.tlsTerminate !== undefined;
      getSandboxAdapterState().installsSinceInitializeStartedAllEnforce = true;
      let changed = false;
      let onChange = () => {
        changed = true;
      };
      let unsubscribers = [
        settingsChangeDetector.subscribe(onChange),
        onProducerDirsChanged.subscribe(onChange),
        beginSandboxBringUp(),
        ...[],
      ];
      try {
        if (getPlatform() === "windows") {
          if (!getSandboxAdapterState().sandboxRuntimeIsUp) {
            getProcessSandboxState().windowsStartBeganAtMs.setState(() => Date.now());
            if (getIsNonInteractiveSession()) writeStderrNotice(WINDOWS_START_NOTICE);
          }
          if (!process.listeners("exit").includes(announceWindowsPermissionRemoval)) {
            process.prependListener("exit", announceWindowsPermissionRemoval);
            for (let signalName of EXIT_SIGNALS)
              process.prependListener(signalName, announceWindowsPermissionRemoval);
          }
          ensureAtomicWriteStagingDirs();
          await ensureBridgeSpawnRootDir();
          let getUserStatus = memoizeAlias(checkWindowsSandboxRuntime);
          await ensureSelfExecGrant(getUserStatus);
          await grantParentFoldersToSandboxGroup({
            project: getOriginalCwd(),
            home: homedir(),
            configHomes: userSettingsHomes(),
            getUserStatus,
          });
        }
        let runtimeWasUp = getSandboxAdapterState().nativeDenies !== undefined;
        let standing = getPlatform() === "windows" ? await installWindowsNativeDenies(config) : undefined;
        adoptReadDenyRootResolution(config);
        if (standing === undefined) {
          if (getSandboxAdapterState().storedDenyListsMayBeShort) installSandboxConfig(config);
          let sandboxAdapterState = getSandboxAdapterState();
          await initializeSandboxRuntime(config, guardedAsk);
          if (getPlatform() === "windows" && sandboxAdapterState.nativeDenies === undefined)
            sandboxAdapterState.deniesGivenToSrtWinAtStart ??= {
              denyRead: new Set(config.filesystem.denyRead),
              denyWrite: new Set(config.filesystem.denyWrite),
            };
        } else
          await initializeWithStandingDenies({
            runtimeConfig: config,
            standing,
            callback: guardedAsk,
            runtimeWasUp,
          });
      } finally {
        for (let unsubscribe of unsubscribers) unsubscribe();
        getProcessSandboxState().windowsStartBeganAtMs.setState(() => null);
      }
      let sandboxAdapterState = getSandboxAdapterState();
      sandboxAdapterState.installedFilterRequestEnforcesAllowlist =
        (sandboxAdapterState.builtConfigEnforcesAllowlist.get(config) ?? false) &&
        sandboxAdapterState.installsSinceInitializeStartedAllEnforce;
      sandboxAdapterState.refusedOverWorkingFolder = false;
      sandboxAdapterState.initFailureReason = undefined;
      sandboxAdapterState.hardLinkedDenyTargets = undefined;
      sandboxAdapterState.gbHostRulesApplied =
        sandboxAdapterState.builtConfigGbHostRules.get(config) ?? sandboxAdapterState.gbHostRulesApplied;
      sandboxAdapterState.sshStoreDenyApplied =
        sandboxAdapterState.builtConfigSshStoreDenied.get(config) ?? sandboxAdapterState.sshStoreDenyApplied;
      sandboxAdapterState.pluginToolStagingDenyApplied =
        sandboxAdapterState.builtConfigPluginToolStagingDenied.get(config) ??
        sandboxAdapterState.pluginToolStagingDenyApplied;
      sandboxAdapterState.patternWriteDenyTwinsApplied =
        sandboxAdapterState.builtConfigPatternWriteDenyTwins.get(config) ??
        sandboxAdapterState.patternWriteDenyTwinsApplied;
      sandboxAdapterState.relativeWriteDenyTwinsApplied =
        sandboxAdapterState.builtConfigRelativeWriteDenyTwins.get(config) ??
        sandboxAdapterState.relativeWriteDenyTwinsApplied;
      sandboxAdapterState.unlistableWorktreesDenyApplied =
        sandboxAdapterState.builtConfigUnlistableWorktreesDenied.get(config) ??
        sandboxAdapterState.unlistableWorktreesDenyApplied;
      sandboxAdapterState.legacyRemoteDirsDenyApplied =
        sandboxAdapterState.builtConfigLegacyRemoteDirsDenied.get(config) ??
        sandboxAdapterState.legacyRemoteDirsDenyApplied;
      sandboxAdapterState.nestedGitConfigLockDenyApplied =
        sandboxAdapterState.builtConfigNestedGitConfigLockDeny.get(config) ??
        sandboxAdapterState.nestedGitConfigLockDenyApplied;
      sandboxAdapterState.gitInfoDirPinApplied =
        sandboxAdapterState.builtConfigGitInfoDirsPinned.get(config) ??
        sandboxAdapterState.gitInfoDirPinApplied;
      sandboxAdapterState.startedOnce = true;
      if (getPlatform() === "windows") {
        sandboxAdapterState.windowsLoopbackAtStart = config.network.allowLocalBinding === true;
        logForDebugging(
          `[sandbox] Windows: the user profile is ${SandboxManager_2.getWindowsProfileRead() === "granted" ? "readable to sandboxed commands, minus credential stores (set-up granted it)" : "not readable to sandboxed commands (no profile read grant)"}`,
        );
        for (let warning of SandboxManager_2.getWindowsProfileReadWarnings())
          logForDebugging(`[sandbox] Windows profile read grant: ${warning.message}`, {
            level: "warn",
          });
      }
      if (getPlatform() !== "windows") getSandboxAdapterState().checkDependenciesProbe.cache.clear?.();
      getSandboxAdapterState().settingsSubscriptionCleanup?.();
      let rebuild = (reason) => {
        let config = tryBuildSandboxConfig();
        if (config === undefined) return false;
        installSandboxConfig(config);
        logForDebugging(`Sandbox configuration updated from ${reason}`);
        return true;
      };
      let unsubscribeSettings = settingsChangeDetector.subscribe(() => {
        getSandboxAdapterState().realPathTwins = "unlisted";
        rebuild("settings change");
      });
      let unsubscribeProducers = onProducerDirsChanged.subscribe(() => {
        rebuild("a plugin producer directory");
      });
      let unsubscribeDenyJoined = setDenyJoinedPluginRoot(() => {
        if (getPlatform() === "windows") {
          logFeatureSad("sandbox_exec", "plugin_dir_join_refused_windows");
          return "stamped_at_start";
        }
        let applied = false;
        try {
          applied = rebuild("a plugin folder joining the session");
        } catch (error) {
          reportSandboxErrorUnderStandIn(error, "configNotRebuiltForPluginFolder");
        }
        if (!applied) {
          logFeatureSad("sandbox_exec", "plugin_dir_join_refused");
          return "rebuild_failed";
        }
        return "installed";
      });
      let noop = () => {};
      let unsubscribeSshStore = onGrowthBookRefresh(() => {
        if (isSshStoreWriteDenyEnabled() !== getSandboxAdapterState().sshStoreDenyApplied)
          rebuild("a GrowthBook change to the write block on claude ssh binaries");
      });
      let unsubscribePluginStaging = onGrowthBookRefresh(() => {
        if (isPluginToolStagingDenyEnabled() !== getSandboxAdapterState().pluginToolStagingDenyApplied)
          rebuild("a feature-flag change to the write block on the staged mcp_call directory");
      });
      let unsubscribePatternTwins = onGrowthBookRefresh(() => {
        if (isPatternWriteDenyTwinsEnabled() !== getSandboxAdapterState().patternWriteDenyTwinsApplied)
          rebuild("a GrowthBook change to the switch for write-deny patterns through symlinks");
      });
      let unsubscribeRelativeTwins = onGrowthBookRefresh(() => {
        if (isUnlistableWorktreesDenyEnabled() !== getSandboxAdapterState().relativeWriteDenyTwinsApplied)
          rebuild("a feature-flag change to the switch for relative write denies through symlinks");
      });
      let unsubscribeWorktrees = onGrowthBookRefresh(() => {
        if (denyUnlistableWorktrees() !== getSandboxAdapterState().unlistableWorktreesDenyApplied)
          rebuild("a GrowthBook change to the write block on an unreadable .git/worktrees");
      });
      let unsubscribeRemoteDirs = onGrowthBookRefresh(() => {
        if (denyLegacyRemoteDirs() !== getSandboxAdapterState().legacyRemoteDirsDenyApplied)
          rebuild("a feature-flag change to the write block on .git/remotes and .git/branches");
      });
      let unsubscribeNestedLock = onGrowthBookRefresh(() => {
        let nestedGitConfigLockDenyApplied = getSandboxAdapterState().nestedGitConfigLockDenyApplied;
        if (
          nestedGitConfigLockDenyApplied !== undefined &&
          isNestedGitConfigLockDenyEnabled() !== nestedGitConfigLockDenyApplied
        )
          rebuild("a GrowthBook refresh of the nested .git/config.lock kill switch");
      });
      let unsubscribeGitInfoPin = onGrowthBookRefresh(() => {
        if (pinGitInfoDirs() !== getSandboxAdapterState().gitInfoDirPinApplied)
          rebuild("a feature-flag change to the pin on git info directories");
      });
      getSandboxAdapterState().settingsSubscriptionCleanup = () => {
        unsubscribeSettings();
        unsubscribeProducers();
        unsubscribeDenyJoined();
        noop();
        unsubscribeSshStore();
        unsubscribePluginStaging();
        unsubscribePatternTwins();
        unsubscribeRelativeTwins();
        unsubscribeWorktrees();
        unsubscribeRemoteDirs();
        unsubscribeNestedLock();
        unsubscribeGitInfoPin();
      };
      if (changed)
        try {
          rebuild("a change that arrived during sandbox startup");
        } catch (error) {
          reportSandboxErrorUnderStandIn(error, "configChangeAtStartNotApplied");
        }
      getSandboxAdapterState().runtimeInitialized = true;
      getSandboxAdapterState().readDenyRootFirstLookDue = true;
      logFeatureOk("sandbox_init");
    } catch (error) {
      failed = true;
      recordSandboxInitFailure(error);
    }
  })();
  if (failed) {
    sandboxAdapterState.initializationPromise = undefined;
    return;
  }
  return sandboxAdapterState.initializationPromise;
}
//@ chunk-qg41pqt6.js:1064281-1064506 placement
var WINDOWS_START_NOTICE = "Starting the sandbox\u2026 Setting file permissions can take a few minutes.";
var WINDOWS_PERMISSION_REMOVAL_NOTICE =
  "Removing this session's sandbox file permissions\u2026 This can take a few minutes. Don't close this window.";
var EXIT_SIGNALS = ["SIGINT", "SIGTERM"];
//@ chunk-qg41pqt6.js:1064506-1064555 placement
function windowsSandboxStartStore() {
  return getProcessSandboxState().windowsStartBeganAtMs;
}
//@ chunk-qg41pqt6.js:1064555-1064675 placement
function announceWindowsPermissionRemoval() {
  let sandboxAdapterState = getSandboxAdapterState();
  if (!sandboxAdapterState.permissionRemovalAnnounced && sandboxAdapterState.sandboxRuntimeIsUp) {
    sandboxAdapterState.permissionRemovalAnnounced = true;
    writeStderrNotice(WINDOWS_PERMISSION_REMOVAL_NOTICE);
  }
}
//@ chunk-qg41pqt6.js:1064675-1064741 placement
function writeStderrNotice(message) {
  try {
    if (process.stderr.isTTY)
      writeSync(
        2,
        `${message}
`,
      );
  } catch {}
}
//@ chunk-qg41pqt6.js:1064741-1064781 placement
function checkWindowsSandboxRuntime() {
  return getWindowsSandboxUserStatusAsync({
    srtWin: rgRunner(),
  });
}
//@ chunk-qg41pqt6.js:1064781-1065005 placement
async function ensureSelfExecGrant(getUserStatus = checkWindowsSandboxRuntime) {
  let sandboxAdapterState = getSandboxAdapterState();
  let { selfExecGrantAttempt, dependencyProbeGeneration } = sandboxAdapterState;
  let attempt = await grantExecutableReadToSandboxGroup({
    exePath: process.execPath,
    previous: selfExecGrantAttempt,
    getUserStatus,
  });
  if (
    attempt !== selfExecGrantAttempt &&
    dependencyProbeGeneration === sandboxAdapterState.dependencyProbeGeneration
  )
    sandboxAdapterState.selfExecGrantAttempt = attempt;
}
//@ chunk-qg41pqt6.js:1065005-1065049 placement
function denySinglePath(path) {
  return expandWindowsFsPaths([path], {
    mode: "deny",
  });
}
//@ chunk-qg41pqt6.js:1065049-1065861 placement
async function installWindowsNativeDenies(config) {
  let nativeDenies = getSandboxAdapterState().nativeDenies;
  try {
    let sandboxUserStatus = getSandboxUserStatus();
    let configuredDenies = getSandboxAdapterState().builtConfigConfiguredDenies.get(config);
    if (sandboxUserStatus === undefined || configuredDenies === undefined) return;
    if (env.CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN) {
      logFeatureSad("sandbox_windows_native_denies", "switched_off", {
        at_start: true,
      });
      return;
    }
    let statuses = {
      write: sandboxUserStatus,
      user: await getWindowsSandboxUserStatusAsync({
        srtWin: rgRunner(),
      }),
      grantRoots: expandWindowsFsPaths(
        [...config.filesystem.allowWrite, ...(config.filesystem.allowRead ?? [])],
        {
          mode: "grant",
        },
      ),
    };
    let written = await writeWindowsDenyEntries({
      ...statuses,
      lists: config.filesystem,
      configured: configuredDenies,
      atStart: true,
      expand: denySinglePath,
    });
    if (nativeDenies !== undefined)
      getSandboxAdapterState().nativeDenies = {
        ...nativeDenies,
        now: mergeNativeDenyState(nativeDenies.now, written, config.filesystem),
      };
    else if (hasAnyDeniedPath(written))
      getSandboxAdapterState().nativeDenies = {
        ...statuses,
        atStart: written,
        now: written,
      };
    return hasAnyDeniedPath(written) ? written : undefined;
  } catch (error) {
    logForDebugging(
      `[sandbox] Windows: Bun's sub-command did not write the deny entries (${errorMessage(error)}); srt-win writes them all`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_windows_native_denies", "start_threw", {
      at_start: true,
    });
    return;
  }
}
//@ chunk-qg41pqt6.js:1065861-1066544 placement
async function initializeWithStandingDenies({ runtimeConfig, standing, callback, runtimeWasUp }) {
  let droppedFilesystem = dropAppliedNativeDenies(runtimeConfig.filesystem, standing);
  try {
    installSandboxConfig(runtimeConfig);
    getSandboxAdapterState().storedDenyListsMayBeShort = true;
    let sandboxRuntime = initializeSandboxRuntime(
      {
        ...runtimeConfig,
        filesystem: droppedFilesystem,
      },
      callback,
    );
    try {
      installSandboxConfig(runtimeConfig);
    } catch (error) {
      logForDebugging(
        `[sandbox] Windows: sandbox-runtime did not take Claude Code's full deny lists while it started (${errorMessage(error)}); they are installed again once its start ends`,
        {
          level: "warn",
        },
      );
    }
    await sandboxRuntime;
  } catch (error) {
    if (!runtimeWasUp) getSandboxAdapterState().nativeDenies = undefined;
    try {
      reinstallIfDenyListsShort(runtimeConfig, droppedFilesystem);
    } catch (error) {
      logForDebugging(
        `[sandbox] Windows: sandbox-runtime did not take Claude Code's full deny lists after the sandbox's start failed (${errorMessage(error)}); until it does, permission checks allow no write on account of the sandbox write allowlist`,
        {
          level: "warn",
        },
      );
    }
    throw error;
  }
  reinstallIfDenyListsShort(runtimeConfig, droppedFilesystem);
}
//@ chunk-qg41pqt6.js:1066544-1066619 placement
async function initializeSandboxRuntime(config, callback) {
  await SandboxManager_2.initialize(config, callback);
  getSandboxAdapterState().sandboxRuntimeIsUp = true;
}
//@ chunk-qg41pqt6.js:1066619-1066951 placement
/**
 * Windows 原生拒绝列表可能不完整时（安装失败或已存的列表与新配置不一致）标记并打点，然后重新安装沙箱配置。
 */
function reinstallIfDenyListsShort(runtimeConfig, droppedFilesystem) {
  let filesystem = SandboxManager_2.getConfig()?.filesystem;
  let storedDenyListsMayBeShort = getSandboxAdapterState().storedDenyListsMayBeShort;
  let stillShort =
    import_sortedIndex_2(filesystem?.denyRead, droppedFilesystem.denyRead) &&
    import_sortedIndex_2(filesystem?.denyWrite, droppedFilesystem.denyWrite);
  if (!storedDenyListsMayBeShort && !stillShort) return;
  getSandboxAdapterState().storedDenyListsMayBeShort = true;
  reportSandboxTelemetryError("denyListsMayBeShort");
  logFeatureSad(
    "sandbox_windows_native_denies",
    storedDenyListsMayBeShort ? "full_denies_install_failed" : "short_denies_stored_late",
    {
      at_start: true,
    },
  );
  installSandboxConfig(runtimeConfig);
}
//@ chunk-qg41pqt6.js:1066951-1067148 placement
function raceAbortSignal(promise, signal) {
  return signal === undefined
    ? promise
    : new Promise((resolve, reject) => {
        let onAbort = () => reject(signal.reason);
        signal.addEventListener("abort", onAbort, {
          once: true,
        });
        if (signal.aborted) onAbort();
        promise.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
      });
}
//@ chunk-qg41pqt6.js:1067148-1067573 placement
async function withRenewedNativeDenies(config) {
  let nativeDenyRenewals = getSandboxAdapterState().nativeDenyRenewals;
  let renewed = await (nativeDenyRenewals.queued ??
    (nativeDenyRenewals.running === undefined
      ? renewNativeDeniesTracked()
      : (nativeDenyRenewals.queued = nativeDenyRenewals.running.then(renewNativeDenies, renewNativeDenies))));
  assertTaskOutputDirChainPlain();
  verifyStagedMcpCallDir();
  if (renewed === undefined) return config;
  let pendingReads = pendingDenies(renewed, "denyRead");
  let pendingWrites = pendingDenies(renewed, "denyWrite");
  let filesystem = config?.filesystem;
  if (filesystem === undefined && pendingReads.length + pendingWrites.length === 0) return config;
  let droppedFilesystem = dropAppliedNativeDenies(
    filesystem ?? {
      denyRead: [],
      denyWrite: [],
      allowWrite: [],
    },
    renewed.now,
  );
  return {
    ...config,
    filesystem: {
      ...droppedFilesystem,
      denyRead: normalizeCaseForComparison_2([...droppedFilesystem.denyRead, ...pendingReads]),
      denyWrite: normalizeCaseForComparison_2([...droppedFilesystem.denyWrite, ...pendingWrites]),
    },
  };
}
//@ chunk-qg41pqt6.js:1067573-1067600 layout
var TENGU_SUNNY_MOON = "tengu_sunny_moon";
//@ chunk-qg41pqt6.js:1067600-1069815 layout
function passLateWindowsDenies(config) {
  let sandboxAdapterState = getSandboxAdapterState();
  let deniesGivenToSrtWinAtStart = sandboxAdapterState.deniesGivenToSrtWinAtStart;
  if (
    getPlatform() !== "windows" ||
    deniesGivenToSrtWinAtStart === undefined ||
    !readFlagWithOverride(TENGU_SUNNY_MOON, {
      safe: true,
    })
  )
    return config;
  let filesystem = assertMarkedPathsResolved(SandboxManager_2.getConfig())?.filesystem;
  let installedConfiguredDenies = sandboxAdapterState.installedConfiguredDenies;
  if (filesystem === undefined || installedConfiguredDenies === undefined) {
    logFeatureBad("sandbox_exec", "windows_added_denies_not_known");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      "The sandbox has lost its configuration, or its record of which file rules came from your settings, so Claude Code could not tell which files this command must be kept from, and did not run it. Restarting Claude Code should fix this.",
      "Windows sandbox: the deny entries added since the start could not be worked out for a command, so it was not run",
      "windows_added_denies_not_known",
    );
  }
  let addedDenies = {
    denyRead: filesystem.denyRead.filter((path) => !deniesGivenToSrtWinAtStart.denyRead.has(path)),
    denyWrite: filesystem.denyWrite.filter((path) => !deniesGivenToSrtWinAtStart.denyWrite.has(path)),
  };
  let addedCount = addedDenies.denyRead.length + addedDenies.denyWrite.length;
  let configuredDenies = new Set(
    [...installedConfiguredDenies].filter(
      (installedConfiguredDeny) => !sandboxAdapterState.lateOwnDeniesPassed.has(installedConfiguredDeny),
    ),
  );
  let passable;
  try {
    passable = splitDenyLists(addedDenies, configuredDenies, denySinglePath);
  } catch (error) {
    logFeatureBad("sandbox_exec", "windows_added_deny_not_checked");
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Claude Code did not run this command: it could not look up a path that a file rule names for a folder added in this session, such as a worktree (${errorMessage(error)}). Sandboxed commands will keep failing this way while that folder stays added: check that you can open it, or restart Claude Code without it.`,
      "Windows sandbox: a deny entry added since the start could not be checked before a command, so it was not run",
      "windows_added_deny_not_checked",
    );
  }
  for (let { spelling } of passable) sandboxAdapterState.lateOwnDeniesPassed.add(spelling);
  if (passable.length === 0) return config;
  if (!sandboxAdapterState.lateOwnDeniesLogged) {
    sandboxAdapterState.lateOwnDeniesLogged = true;
    logForDebugging(
      `[sandbox] Windows: srt-win applies deny entries only when the sandbox starts, so Claude Code's own deny entries added since then are passed with each sandboxed command (${passable.length} so far; ${addedCount - passable.length} more, from settings or with wildcards, wait for the next start; logged once)`,
    );
    logFeatureSad("sandbox_windows_native_denies", "entries_added_after_start", {
      at_start: false,
      entries: passable.length,
      left_for_next_start: addedCount - passable.length,
    });
  }
  let baseFilesystem = config?.filesystem ?? {
    denyRead: [],
    denyWrite: [],
    allowWrite: [],
  };
  return {
    ...config,
    filesystem: {
      ...baseFilesystem,
      denyRead: normalizeCaseForComparison_2([
        ...baseFilesystem.denyRead,
        ...passable.filter((entry) => entry.list === "denyRead").map((entry) => entry.spelling),
      ]),
      denyWrite: normalizeCaseForComparison_2([
        ...baseFilesystem.denyWrite,
        ...passable.filter((entry) => entry.list === "denyWrite").map((entry) => entry.spelling),
      ]),
    },
  };
}
//@ chunk-qg41pqt6.js:1069815-1069924 placement
function renewNativeDeniesTracked() {
  let nativeDenyRenewals = getSandboxAdapterState().nativeDenyRenewals;
  nativeDenyRenewals.running = renewNativeDenies_2().finally(() => {
    nativeDenyRenewals.running = undefined;
  });
  return nativeDenyRenewals.running;
}
//@ chunk-qg41pqt6.js:1069924-1069988 placement
function renewNativeDenies() {
  getSandboxAdapterState().nativeDenyRenewals.queued = undefined;
  return renewNativeDeniesTracked();
}
//@ chunk-qg41pqt6.js:1069988-1070075 placement
function pendingDenies(nativeDenies, list) {
  return [...nativeDenies.now[list]]
    .filter(([path, value]) => value !== true && !wasDenyUnregistered(nativeDenies, list, path))
    .map(([path]) => path);
}
//@ chunk-qg41pqt6.js:1070075-1070141 placement
function wasDenyUnregistered({ atStart }, list, path) {
  return atStart[list].has(path) && atStart[list].get(path) !== true;
}
//@ chunk-qg41pqt6.js:1070141-1070350 placement
function mergeDenyChanges(installedConfiguredDenies, atStart) {
  let entries = [...atStart.denyRead, ...atStart.denyWrite];
  let dropped = new Set(entries.filter(([, value]) => value).map(([path]) => path));
  return new Set([
    ...[...installedConfiguredDenies].filter((path) => !dropped.has(path)),
    ...entries.filter(([path, value]) => value === undefined && !dropped.has(path)).map(([path]) => path),
  ]);
}
//@ chunk-qg41pqt6.js:1070350-1070773 placement
async function renewNativeDenies_2() {
  let nativeDenies = getSandboxAdapterState().nativeDenies;
  if (nativeDenies === undefined) return;
  let filesystem = assertMarkedPathsResolved(SandboxManager_2.getConfig())?.filesystem;
  let installedConfiguredDenies = getSandboxAdapterState().installedConfiguredDenies;
  if (
    filesystem === undefined ||
    installedConfiguredDenies === undefined ||
    getSandboxAdapterState().storedDenyListsMayBeShort
  )
    return failWindowsDenyRenewal();
  let request = {
    ...nativeDenies,
    lists: filesystem,
    configured: mergeDenyChanges(installedConfiguredDenies, nativeDenies.atStart),
    atStart: false,
    expand: denySinglePath,
  };
  let written = await writeWindowsDenyEntries(request);
  let retried = areAllNativeDeniesComplete(nativeDenies, written)
    ? written
    : await writeWindowsDenyEntries(request);
  if (!areAllNativeDeniesComplete(nativeDenies, retried)) return failWindowsDenyRenewal();
  let next = {
    ...nativeDenies,
    now: mergeNativeDenyState(nativeDenies.now, retried, filesystem),
  };
  if (getSandboxAdapterState().nativeDenies === nativeDenies) getSandboxAdapterState().nativeDenies = next;
  return next;
}
//@ chunk-qg41pqt6.js:1070773-1070820 placement
function areAllNativeDeniesComplete(nativeDenies, written) {
  return areNativeDeniesComplete(written, (list, path) => wasDenyUnregistered(nativeDenies, list, path));
}
//@ chunk-qg41pqt6.js:1070820-1070894 placement
function failWindowsDenyRenewal() {
  logFeatureBad("sandbox_exec", "windows_denies_not_renewed");
  throw new SandboxProtectionNotRenewedError();
}
//@ chunk-qg41pqt6.js:1070894-1071409 file-local
/**
 * 记录沙箱初始化失败：清空初始化 Promise 与运行时标志，保存错误码与给人看的原因（含自执行授权是否已加），标记是否因工作目录被拒，并上报 sandbox_init_failed。旧版名 initialize 错配。
 */
function recordSandboxInitFailure(sandboxAskCallback) {
  let settings = getSandboxAdapterState();
  settings.initializationPromise = undefined;
  settings.runtimeInitialized = false;
  settings.initializedWithTlsTerminate = false;
  settings.installedFilterRequestEnforcesAllowlist = false;
  settings.startsFailed++;
  logForDebugging(`Failed to initialize sandbox: ${errorMessage(sandboxAskCallback)}`);
  settings.initFailureCode =
    getErrnoCode(sandboxAskCallback) ??
    (sandboxAskCallback instanceof Error ? sandboxAskCallback.name : "unknown");
  getSandboxAdapterState().initFailureReason = describeWindowsSandboxRemedy(
    errorMessage(sandboxAskCallback),
    {
      programPermissionAdded: settings.selfExecGrantAttempt?.added,
    },
  );
  getSandboxAdapterState().hardLinkedDenyTargets = hardLinkedDenyPathsOfError(sandboxAskCallback);
  settings.selfExecGrantAttempt = undefined;
  settings.refusedOverWorkingFolder = sandboxAskCallback instanceof WindowsSandboxError_2;
  logFeatureSad("sandbox_init", "sandbox_init_failed");
}
//@ chunk-qg41pqt6.js:1071409-1071539 layout
var HARDLINK_DENY_MARKERS = [
  " hardlink(s); the deny would be kept or removed through one name only",
  " hardlink(s); ace_holders rows are path-keyed",
];
//@ chunk-qg41pqt6.js:1071539-1071797 layout
function hardLinkedDenyPathsOfError(sandboxAskCallback) {
  if (!(sandboxAskCallback instanceof WindowsSandboxError) || sandboxAskCallback.code !== "acl_grant_failed")
    return;
  let { message } = sandboxAskCallback;
  if (!HARDLINK_DENY_MARKERS.some((marker) => message.includes(marker))) return;
  let paths = [];
  for (let match of message.matchAll(/deny refused: '([\s\S]+?)' has \d+ hardlink\(s\); /g))
    if (match[1] !== undefined) paths.push(match[1]);
  return paths;
}
//@ chunk-qg41pqt6.js:1071797-1071895 placement
function needsRestartForTlsTerminate() {
  let sandboxAdapterState = getSandboxAdapterState();
  return (
    sandboxAdapterState.initializationPromise !== undefined &&
    !sandboxAdapterState.initializedWithTlsTerminate
  );
}
//@ chunk-qg41pqt6.js:1071895-1072032 placement
/**
 * 重建沙箱运行时配置；失败时记录并保留当前运行中的配置（返回 undefined）。
 */
function tryBuildSandboxConfig() {
  try {
    return convertToSandboxRuntimeConfig(getSettings_DEPRECATED());
  } catch (error) {
    reportSandboxPathError(
      error,
      "Sandbox config rebuild skipped, keeping the running config",
      "configNotRebuilt",
    );
    return;
  }
}
//@ chunk-qg41pqt6.js:1072032-1072149 placement
/**
 * 门面 refreshConfig：沙箱启用时重建配置并装入运行时（失败保留旧配置）。
 */
function refreshConfig() {
  if (getSandboxAdapterState().configBuildFailed) return false;
  if (!isSandboxingEnabled()) return true;
  let config = tryBuildSandboxConfig();
  if (config === undefined) return false;
  installSandboxConfig(config);
  return true;
}
//@ chunk-qg41pqt6.js:1072149-1072291 placement
async function resetSandbox() {
  sandboxAdapterState?.settingsSubscriptionCleanup?.();
  sandboxAdapterState = undefined;
  process.off("exit", announceWindowsPermissionRemoval);
  for (let signalName of EXIT_SIGNALS) process.off(signalName, announceWindowsPermissionRemoval);
  return SandboxManager_2.reset();
}
//@ chunk-qg41pqt6.js:1072291-1073000 placement (2.1.88 match: addToExcludedCommands, 0.534)
/**
 * 把命令（优先取建议规则 Bash(prefix:*) 的前缀）加入 sandbox.excludedCommands；管理员强制或 Windows 严格模式写 userSettings，否则 localSettings；强制下用户设置被禁用则拒绝。
 */
function addToExcludedCommands(command, permissionUpdates) {
  let commandPattern = command;
  if (permissionUpdates) {
    let bashSuggestions = permissionUpdates.filter(
      (update) => update.type === "addRules" && update.rules.some((rule) => rule.toolName === BASH_TOOL_NAME),
    );
    if (bashSuggestions.length > 0 && bashSuggestions[0].type === "addRules") {
      let firstBashRule = bashSuggestions[0].rules.find((rule) => rule.toolName === BASH_TOOL_NAME);
      if (firstBashRule?.ruleContent)
        commandPattern = permissionRuleExtractPrefix(firstBashRule.ruleContent) || firstBashRule.ruleContent;
    }
  }
  let adminMandate = isAdminSandboxMandate();
  if (adminMandate && !isSettingSourceEnabled("userSettings")) {
    logFeatureBad("sandbox_exclude_command", "user_settings_disabled");
    return {
      outcome: "refused",
      commandPattern,
    };
  }
  let sourceName =
    (adminMandate || (getPlatform() === "windows" && SandboxManager.isStrictSandboxModeConfigured())) &&
    isSettingSourceEnabled("userSettings")
      ? "userSettings"
      : "localSettings";
  updateSettingsForSourceWithTransform(sourceName, (settings) => {
    let excludedCommands = settings?.sandbox?.excludedCommands || [];
    if (excludedCommands.includes(commandPattern)) return null;
    return {
      sandbox: {
        excludedCommands: [...excludedCommands, commandPattern],
      },
    };
  });
  logFeatureOk("sandbox_exclude_command");
  return {
    outcome: "added",
    commandPattern,
    settingsSource: sourceName,
  };
}
//@ chunk-qg41pqt6.js:1073000-1073611 placement
/**
 * 沙箱命令结束后的清理：执行 scrub、复查标记，并在命令只写了自己的临时目录时决定是否推迟读禁止根复查。
 */
function afterSandboxedCommand(extra, deferredSnapshot, options) {
  let sandboxAdapterState = getSandboxAdapterState();
  let readDenyRootLookFinishedAt = sandboxAdapterState.readDenyRootLookFinishedAt;
  sandboxAdapterState.readDenyRootLookFinishedAt = undefined;
  if (!options?.skipsScrubs) {
    scrubPlantedBareRepoIndicators(extra);
    scrubSymlinkedDenyPaths(deferredSnapshot);
  }
  rescreenLateSymlinkGrants();
  if (options?.wroteOnlyItsOwnScratch) {
    let installedReadDenyRootResolution = sandboxAdapterState.installedReadDenyRootResolution;
    let filtered = [
      ...(installedReadDenyRootResolution?.resolution?.resolved ?? []),
      ...(installedReadDenyRootResolution?.maskSweepEntries ?? []),
    ].filter((entry) => entry.lookAgain !== undefined || entry.settledUnwatched);
    if (filtered.length === 0) {
      sandboxAdapterState.readDenyRootLookFinishedAt = readDenyRootLookFinishedAt;
      return;
    }
    let roots = splitBindableWriteRoots(getDefaultWritePaths(), new Set([getCwdState()]));
    let mapped = flattenWrapWriteRoots(roots).map(toFoldedAbsolutePath);
    if (!(
      roots.hasUndecidableEntry ||
      filtered.some((entry) =>
        [...entry.spellings, entry.lookAgain?.stoppedAt?.path ?? entry.root]
          .map((spelling) =>
            toFoldedAbsolutePath(containsGlobChars(spelling) ? getGlobBaseDirectory(spelling) : spelling),
          )
          .some((spelling) => mapped.some((rule) => posixCovers(rule, spelling))),
      )
    ))
      sandboxAdapterState.readDenyRootLookFinishedAt = readDenyRootLookFinishedAt;
  }
}
//@ chunk-qg41pqt6.js:1073611-1078013 placement (2.1.88 match: SandboxManager, 0.43)
/**
 * Claude Code 侧的 SandboxManager 门面对象：汇总初始化、启用/必需判断、托管锁定、排除命令、网络与文件系统授权、wrapWithSandbox/wrapWithSandboxArgv、依赖检查、refreshConfig/reset 等；getConfig/getFsReadConfig 转发 vendor 的运行中配置并做额外处理。
 */
var SandboxManager; // deferred: uses SandboxManager_2 (../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-qg41pqt6.js:1073611", () => {
  SandboxManager = {
    initialize: initializeSandbox,
    isSandboxingEnabled,
    isSandboxEnabledInSettings: getSandboxEnabledSetting,
    isPlatformInEnabledList,
    passesCheapSandboxGates,
    needsRestartForTlsTerminate,
    getSandboxUnavailableReason,
    getSandboxSetUpAgainWarning,
    needsRestartForLocalConnections,
    getSandboxRestartWarning,
    untilRestart: getLocalBindingRestartMode,
    areSandboxSettingsLockedByManagedSettings: areSandboxSettingsLockedByPolicy,
    getProfileReadSecurityWarnings,
    getMaskCredentialWarning,
    canMaskCredentialWarningFire,
    isAutoAllowBashIfSandboxedEnabled,
    isAutoAllowSupported,
    areUnsandboxedCommandsAllowed,
    isOnButNotRunning: sandboxInitFailedUnderRequirement,
    isStrictSandboxModeConfigured,
    isSandboxRequired,
    areSandboxSettingsLockedByPolicy: areSandboxSettingsOverriddenByFlagOrPolicy,
    areUnsandboxedCommandsForbiddenByPolicy: isUnsandboxedForbiddenByGb,
    isUnsandboxedFallbackClosedByTrustedTier,
    isUnsandboxedFallbackClosedByTrustedSource,
    isSandboxedAttemptGateEnabled: neverTempRoot,
    setSandboxSettings,
    getExcludedCommands,
    getConfiguredNetworkAllowances,
    isAllowAllUnixSocketsConfigured,
    getConfiguredFilesystemGrants,
    wrapWithSandbox: wrapWithSandbox_2,
    wrapWithSandboxArgv,
    invalidateDependencyCache: () => {
      let sandboxAdapterState = getSandboxAdapterState();
      sandboxAdapterState.dependencyProbeGeneration++;
      sandboxAdapterState.checkDependenciesProbe.cache.clear?.();
      sandboxAdapterState.sandboxDisabledThisSession = false;
      sandboxAdapterState.initFailureReason = undefined;
      sandboxAdapterState.configBuildFailed = false;
      sandboxAdapterState.realPathTwins = "unlisted";
      sandboxAdapterState.selfExecGrantAttempt = undefined;
    },
    refreshConfig,
    addSessionAllowedHost: grantSessionHost,
    reset: resetSandbox,
    checkDependencies: checkSandboxDependencies,
    rememberedDependencyCheck: cachedDependencyProbe,
    checkDependenciesAsync: checkSandboxDependenciesAsync,
    getConfig: () => assertMarkedPathsResolved(SandboxManager_2.getConfig()),
    getFsReadConfig: () => {
      let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
      if (config?.filesystem.disabled)
        return {
          denyOnly: config.filesystem.denyRead.map(removeTrailingGlobSuffix),
          allowWithinDeny: (config.filesystem.allowRead ?? []).map(removeTrailingGlobSuffix),
        };
      let sandboxAdapterState = getSandboxAdapterState();
      if (
        sandboxAdapterState.fsReadConfigMemo !== undefined &&
        sandboxAdapterState.fsReadConfigMemo.cfg === config
      )
        return sandboxAdapterState.fsReadConfigMemo.result;
      let platform = getPlatform();
      let files = config?.credentials?.files ?? [];
      let credentialPaths = files.filter((file) => file.mode === "deny").map((file) => file.path);
      if (
        (platform === "linux" || platform === "wsl") &&
        [
          ...(config?.filesystem.denyRead ?? []),
          ...(config?.filesystem.allowRead ?? []),
          ...credentialPaths,
        ].some((path) => containsGlobChars(removeTrailingGlobSuffix(path)))
      ) {
        let readDenyLists = buildReadDenyLists(config, credentialPaths);
        sandboxAdapterState.fsReadConfigMemo = {
          cfg: config,
          result: readDenyLists,
        };
        return readDenyLists;
      }
      try {
        let fsReadConfig = SandboxManager_2.getFsReadConfig();
        sandboxAdapterState.fsReadConfigMemo = {
          cfg: config,
          result: fsReadConfig,
        };
        return fsReadConfig;
      } catch (error) {
        logForDebugging(`[sandbox] getFsReadConfig threw; falling back to raw deny lists: ${error}`);
        let readDenyLists = buildReadDenyLists(
          config,
          files.map((file) => file.path),
        );
        sandboxAdapterState.fsReadConfigMemo = {
          cfg: config,
          result: readDenyLists,
        };
        return readDenyLists;
      }
    },
    storedDenyListsMayBeShort: () => getSandboxAdapterState().storedDenyListsMayBeShort,
    getFsWriteConfig: () => {
      let config = assertMarkedPathsResolved(SandboxManager_2.getConfig());
      if (config?.filesystem.disabled)
        return {
          allowOnly: config.filesystem.allowWrite.map(removeTrailingGlobSuffix),
          denyWithinAllow: config.filesystem.denyWrite.map(removeTrailingGlobSuffix),
        };
      return SandboxManager_2.getFsWriteConfig();
    },
    getNetworkRestrictionConfig: () => {
      if (SandboxManager_2.getConfig()?.network?.allowedDomains === undefined) return {};
      return SandboxManager_2.getNetworkRestrictionConfig();
    },
    getIgnoreViolations: SandboxManager_2.getIgnoreViolations,
    getLinuxGlobPatternWarnings: getLinuxGlobPatternWarnings_2,
    getDeniesDroppedForAnotherHost: droppedDeniesForHost,
    onDeniesDroppedForAnotherHostChanged: subscribeSandboxEvents,
    getUnbracketedIpv6DomainWarnings: getInvalidIpv6DomainEntries,
    getUnbracketedIpv6InjectHostWarnings: getInvalidInjectHostEntries,
    isSupportedPlatform,
    getAllowUnixSockets: SandboxManager_2.getAllowUnixSockets,
    getAllowLocalBinding: SandboxManager_2.getAllowLocalBinding,
    getAllowMachLookup: SandboxManager_2.getAllowMachLookup,
    getEnableWeakerNestedSandbox: SandboxManager_2.getEnableWeakerNestedSandbox,
    getProxyPort: SandboxManager_2.getProxyPort,
    getProxyAuthToken: SandboxManager_2.getProxyAuthToken,
    getSocksProxyPort: SandboxManager_2.getSocksProxyPort,
    getLinuxHttpSocketPath: SandboxManager_2.getLinuxHttpSocketPath,
    getLinuxSocksSocketPath: SandboxManager_2.getLinuxSocksSocketPath,
    waitForNetworkInitialization: SandboxManager_2.waitForNetworkInitialization,
    ensureInitializedForWrap,
    getSandboxViolationStore: SandboxManager_2.getSandboxViolationStore,
    annotateStderrWithSandboxFailures: SandboxManager_2.annotateStderrWithSandboxFailures,
    registerCommandNetworkLists: SandboxManager_2.registerCommandNetworkLists,
    unregisterCommandNetworkLists: SandboxManager_2.unregisterCommandNetworkLists,
    askCallbackDenyReason: SandboxManager_2.askCallbackDenyReason === true,
    denyAllNetworkOption: SandboxManager_2.denyAllNetworkOption === true,
    cleanupAfterCommand: (extra, deferredSnapshot, options) => {
      SandboxManager_2.cleanupAfterCommand();
      afterSandboxedCommand(extra, deferredSnapshot, {
        wroteOnlyItsOwnScratch: options?.wroteOnlyItsOwnScratch,
      });
    },
    scrubAfterCommand: () => {
      afterSandboxedCommand();
    },
    cleanupAfterCommandWithoutScrubs: () => {
      SandboxManager_2.cleanupAfterCommand();
      afterSandboxedCommand(undefined, undefined, {
        skipsScrubs: true,
      });
    },
    snapshotBareGitRepoScrubPaths: () => {
      let sandboxAdapterState = getSandboxAdapterState();
      return {
        paths: [...sandboxAdapterState.bareGitRepoScrubPaths.values()].map((bareGitRepoScrubPath) => ({
          path: bareGitRepoScrubPath.path,
          parent: cloneScrubParent(bareGitRepoScrubPath.parent),
          unlinkable: bareGitRepoScrubPath.unlinkable,
        })),
        pathsVouchedLocally: sandboxAdapterState.bareGitRepoScrubPathsVouchedLocally,
      };
    },
    snapshotSymlinkedDenyScrubPaths: () =>
      getSandboxAdapterState().symlinkedDenyScrubPaths.map((symlinkedDenyScrubPath) => ({
        literal: symlinkedDenyScrubPath.literal,
        resolved: symlinkedDenyScrubPath.resolved,
        parent: cloneScrubParent(symlinkedDenyScrubPath.parent),
        hopDirectories:
          symlinkedDenyScrubPath.hopDirectories === null ? null : [...symlinkedDenyScrubPath.hopDirectories],
        danglingBaseline: symlinkedDenyScrubPath.danglingBaseline,
      })),
  };
});
//@ chunk-qg41pqt6.js:1078013-1078149 placement
function buildReadDenyLists(config, credentialPaths) {
  return {
    denyOnly: normalizeCaseForComparison_2(
      [...(config?.filesystem.denyRead ?? []), ...credentialPaths].map(removeTrailingGlobSuffix),
    ),
    allowWithinDeny: (config?.filesystem.allowRead ?? []).map(removeTrailingGlobSuffix),
  };
}
//@ chunk-qg41pqt6.js:1078149-1078182 placement
function isWithinOriginalCwd(path) {
  return isPathWithin(path, getOriginalCwd());
}
//@ chunk-qg41pqt6.js:1078182-1078220 placement
var PERSON_ROOT_MIN_BYTES = 2097152;
var PERSON_ROOT_OPTIONS = {
  isPersonsRoot: true,
};
//@ chunk-qg41pqt6.js:1078220-1078345 placement
function setDenyJoinedPluginRoot(callback) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.denyJoinedPluginRoot = callback;
  return () => {
    if (pluginRegistry.denyJoinedPluginRoot === callback) pluginRegistry.denyJoinedPluginRoot = undefined;
  };
}
//@ chunk-qg41pqt6.js:1078345-1078501 placement
function beginSandboxBringUp() {
  let pluginRegistry = getPluginRegistry();
  let { promise, resolve } = Promise.withResolvers();
  pluginRegistry.sandboxBringUp = promise;
  return () => {
    if (pluginRegistry.sandboxBringUp === promise) pluginRegistry.sandboxBringUp = undefined;
    resolve();
  };
}
//@ chunk-qg41pqt6.js:1078501-1078699 placement
function createFileAtChain(root, ...parts) {
  let flags = READ_LIMITS | O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  let fds = [];
  try {
    let current = root;
    for (let name of parts) {
      let fd = openSync(current, flags);
      fds.push(fd);
      current = `/proc/self/fd/${fd}/${name}`;
    }
    closeSync(openSync(current, "wx"));
  } catch {
  } finally {
    for (let fd of fds) closeSync(fd);
  }
}
//@ chunk-qg41pqt6.js:1078699-1078917 layout
function gitPathExists(gitDir, name) {
  let dirFd;
  try {
    let viaFdPath;
    dirFd = openSync(gitDir, READ_LIMITS | O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    viaFdPath = `/proc/self/fd/${dirFd}/${name}`;
    mkdirSync(viaFdPath);
    return false;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "EEXIST" && errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR";
  } finally {
    if (dirFd !== undefined) closeSync(dirFd);
  }
}
//@ chunk-qg41pqt6.js:1078917-1080089 placement
/**
 * 在根目录下逐级创建私有目录（权限 700），Linux 通过 /proc/self/fd 逐级打开避免跟随链接；校验所有者、收紧权限，最后确认真实路径等于目标路径。
 */
function ensurePrivateDirChain(
  root,
  target,
  { isPersonsRoot } = {
    isPersonsRoot: false,
  },
) {
  let relativePath = relative(root, target);
  if (relativePath.startsWith("..") || isAbsolute(relativePath)) return false;
  let filtered = relativePath.split(sep).filter(Boolean);
  if (getPlatform() === "linux" || getPlatform() === "wsl") {
    let fd;
    let openRoot = () => openSync(root, PERSON_ROOT_MIN_BYTES | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try {
      try {
        fd = openRoot();
      } catch (childFd) {
        if (getErrnoCode(childFd) !== "ENOENT") return false;
        mkdirSync(root, {
          recursive: true,
          mode: 448,
        });
        fd = openRoot();
      }
      let stats = fstatSync(fd);
      if (!isPersonsRoot && process.getuid !== undefined && stats.uid !== process.getuid()) {
        closeSync(fd);
        return false;
      }
      if (!isPersonsRoot && (stats.mode & 18) !== 0) chmodSync(`/proc/self/fd/${fd}`, 448);
    } catch {
      return false;
    }
    try {
      for (let name of filtered) {
        try {
          mkdirSync(`/proc/self/fd/${fd}/${name}`, {
            mode: 448,
          });
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") return false;
        }
        let nextFd;
        try {
          nextFd = openSync(
            `/proc/self/fd/${fd}/${name}`,
            PERSON_ROOT_MIN_BYTES | constants.O_DIRECTORY | constants.O_NOFOLLOW,
          );
        } catch {
          return false;
        }
        closeSync(fd);
        fd = nextFd;
      }
      return readlinkSync(`/proc/self/fd/${fd}`) === target;
    } catch {
      return false;
    } finally {
      closeSync(fd);
    }
  }
  let replaced = root.replace(/[\\/]+$/, "");
  try {
    mkdirSync(replaced, {
      recursive: true,
      mode: 448,
    });
    let stats = lstatSync(replaced);
    if (
      !stats.isDirectory() ||
      (!isPersonsRoot &&
        getPlatform() !== "windows" &&
        process.getuid !== undefined &&
        stats.uid !== process.getuid())
    )
      return false;
    if (!isPersonsRoot && getPlatform() !== "windows" && (stats.mode & 18) !== 0) chmodSync(replaced, 448);
  } catch {
    return false;
  }
  for (let name of filtered) {
    replaced = join(replaced, name);
    try {
      mkdirSync(replaced, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") return false;
    }
    try {
      let stats = lstatSync(replaced);
      if (!stats.isDirectory() || stats.isSymbolicLink()) return false;
    } catch {
      return false;
    }
  }
  try {
    return realpathSync(target) === target;
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:1987999-1988091 fingerprint (2.1.88 match: shouldAllowManagedReadPathsOnly, 0.819)
/**
 * 任一托管/可信层设置了 sandbox.filesystem.allowManagedReadPathsOnly 时为真：allowRead 只认可信层。
 */
function shouldAllowManagedReadPathsOnly() {
  return getAllPolicyTierSettings().some(
    (settings) => settings.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
  );
}
export {
  permissionRuleValueFromString,
  SandboxManager,
  isToolSandboxActive,
  isMisleadingConsentHost,
  consentHostEntry,
  sandboxHostGrantDestination,
  shouldForceSandboxOn,
  isSandboxSettingOverriddenByPolicy,
  getEffectiveFilesystemPolicy,
  SandboxPolicyRefusalError,
  sandboxExportsChildTmpDir,
  isScrubOnlySandboxMode,
  perCommandNetworkListsForRuntime,
  posixCovers,
  SandboxUnavailableForShellError,
  windowsArgvTooLongError,
  classifyWindowsSandboxLaunchExit,
  addSandboxAllowWriteDirectory,
  removeSandboxAllowWriteDirectory,
  isFilesystemIsolationDisabledBySetting,
  isStrictPortSuffix,
  isSrtHostNameCharset,
  canonicalizationChangesHost,
  perCommandAllowsWithheld,
  sandboxReadBlockApplies,
  getTrustedExcludedCommands,
  shouldAllowManagedSandboxDomainsOnly,
  isHostAllowedBySandboxNetworkPolicy,
  denyEntryCovers,
  matchesGuardedGlob,
  matchesNameReading,
  nameReadingsOfGlobSpelling,
  shouldAllowManagedReadPathsOnly,
  isSandboxFilesystemPathRelative,
  resolveSandboxDenyReadEntry,
  resolveSandboxFilesystemPath,
  sandboxFilesystemPathAsReadEarlier,
  canonicalizePathForMaskSweep,
  isNetworkSpelledGrantRoot,
  denyEntryCoversFolded,
  areWindowsLocalConnectionsOn,
  resolveWindowsTlsTerminateCaSource,
  willSandboxTlsTerminate,
  REFUSED_UNTIL_RESTART,
  WITHOUT_SANDBOX_UNTIL_RESTART,
  resolvePathPatternForSandboxAt,
  parseRuleForSandbox,
  resolveSandboxFilesystemPathAt,
  isSandboxEgressRestricted,
  isSandboxHostAllowlistEnforced,
  windowsSandboxStartStore,
  isInstalledWindowsTlsCaCurrent,
  resolvePathPatternForSandbox,
  detectWorktreeGitCommonDir,
  addToExcludedCommands,
  relatchTenguSandboxGbConfig,
  antSandboxConfig,
  matchesRuntimeGlobBy,
};
