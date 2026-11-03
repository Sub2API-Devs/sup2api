/**
 * utils/sandbox/sandbox-adapter.ts
 *
 * Claude Code 侧的沙箱适配层：把 settings（sandbox.*、Read/Edit/WebFetch 权限规则、托管策略）转成 @anthropic-ai/sandbox-runtime 配置，判定沙箱是否开启/必需/可用，初始化与热更新运行时，包装命令（wrapWithSandbox/wrapWithSandboxArgv），管理 excludedCommands、读禁止根复查与 Windows 原生 deny。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sandbox/sandbox-adapter.ts
 * pieces: chunk-czffketc.js (1), chunk-e6aww6q8.js (1), chunk-fq0cr76a.js (370)
 * attribution: placement 308, fingerprint 12, sole-consumer 1, layout 47, callgraph-fingerprint 1, file-local 2, callgraph-witnessed 1
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
  yM,
  bM,
  SM,
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
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, string, _enum, array } from "../../../vendor/zod/v4/classic/schemas.js";
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
  areNativeDeniesComplete,
} from "./windowsSandbox.js";
import {
  windowsStateDir,
  parseWindowsSandboxError,
  getWindowsSandboxUserStatusAsync,
  expandWindowsFsPaths,
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
import { uniq, count } from "../collections.js";
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
import { getClaudeConfigDir, isEnvTruthy } from "../envUtils.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { recordStagingDirIdentity, throwStagingTampered } from "../fsSafety/atomicWriteStaging.js";
import { addFileGlobRuleToGitignore } from "../git/gitignore.js";
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
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPathWithin, toComparablePath, hasWin32DevicePrefixSpelling } from "../fsJunctions.js";
import { userSettingsHomes } from "../settings/settingsFileParsing.js";
import {
  credentialRuleExtractSchema,
  credentialRuleRefine,
  credentialRuleExtraSchema,
  credentialRuleOnNoMatchSchema,
  credentialRuleDecodeSchema,
} from "../settings/settingsSourceTrust.js";
import { ripgrepCommand } from "../ripgrep.js";
import {
  seccompExecPlan,
  assertMarkedPathsResolved,
  checkAppArmorUserNamespaces,
  linuxSandboxProbes,
} from "./linuxSandboxExec.js";
import { SandboxManager_2 } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { createStore } from "../../state/store.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isSentinelInode, jsonStringify } from "../slowOperations.js";
import { regExp } from "../permissions/protectedDirNames.js";
import { isSystemVolumePath } from "../permissions/protectedDirs.js";
import { isLoopbackHost } from "../localhost.js";
import { sandboxBinaryPath } from "../../components/sandbox/SandboxDependenciesTab.js";
import { envDynamicProbe } from "../envDynamic.js";
import { getHostAgentPolicy } from "../hostAgentPolicy.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { permissionRuleExtractPrefix } from "../permissions/shellRuleMatching.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { READ_LIMITS, O_NOFOLLOW_ANY } from "../fsBoundRead.js";
import { normalizeDomainKey, domainRuleMatches } from "../wildcardMapLookup.js";

//@ chunk-fq0cr76a.js:853952-854002 fingerprint = getExcludedCommands (0.74)
function getTrustedExcludedCommands() {
  return collectFromSandboxSettings((e) => e.excludedCommands);
}
//@ chunk-fq0cr76a.js:904355-904448 placement
/**
 * Shell 需要沙箱但沙箱不可用时抛出的错误类型。
 */
class SandboxUnavailableForShellError extends Error {
  constructor(message) {
    super(message);
    this.name = "SandboxUnavailableForShellError";
  }
}
//@ chunk-fq0cr76a.js:904448-904535 placement
class SandboxCommandTooLongError extends Error {
  constructor(message) {
    super(message);
    this.name = "SandboxCommandTooLongError";
  }
}
//@ chunk-fq0cr76a.js:904535-904644 placement
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
//@ chunk-fq0cr76a.js:904644-904725 placement
/**
 * POSIX 路径前缀覆盖：相等、或根目录覆盖一切绝对路径、或以 e/ 开头。
 */
function posixCovers(e, n) {
  return n === e || (e === "/" ? n.startsWith("/") : n.startsWith(`${e}/`));
}
//@ chunk-fq0cr76a.js:904725-904873 placement
/**
 * 用 picomatch 按 dot:true（可选大小写不敏感）匹配 glob，编译结果按模式缓存，编译失败视为不匹配。
 */
function matchesGuardedGlob(e, n, r, s = false) {
  let h = s ? `${n}\x00nocase` : n;
  let y = r?.get(h);
  if (!y) {
    try {
      y = celModule.default(n, {
        dot: true,
        nocase: s,
      });
    } catch {
      y = () => false;
    }
    r?.set(h, y);
  }
  return y(e);
}
//@ chunk-fq0cr76a.js:904873-905134 placement
/**
 * 把含通配段的路径拆成若干“名字读法”：整串作字面名，以及每个通配段前的前缀目录 + 余下 glob，用于判断 glob 可能命中的文件夹名。
 */
function nameReadingsOfGlobSpelling(e) {
  let n = removeTrailingGlobSuffix(e);
  let parts = n.split("/");
  let flattened = parts.flatMap((h, y) => (containsGlobChars(h) ? [y] : []));
  if (flattened.length === 0) return [];
  return [
    {
      name: n.replace(/\/+$/, ""),
      pattern: null,
    },
    ...flattened.slice(1).map((h) => ({
      name: parts.slice(0, h).join("/"),
      pattern: `/${parts.slice(h).join("/")}${e.slice(n.length)}`,
    })),
  ];
}
//@ chunk-fq0cr76a.js:905134-905263 placement
/**
 * 路径是否匹配某个名字读法：字面名相等，或位于前缀目录下且余下部分匹配 glob。
 */
function matchesNameReading(e, n, r, s = false) {
  return n.some(({ name: h, pattern }) =>
    pattern === null
      ? e === h
      : e.startsWith(`${h}/`) && matchesGuardedGlob(e.slice(h.length), pattern, r, s),
  );
}
//@ chunk-fq0cr76a.js:905263-905425 placement = LayoutMeasureMode (0.654)
function matchesRuntimeGlobBy(path, n, caseMode, s) {
  return (
    s(n, path) ||
    (containsGlobChars(path) &&
      nameReadingsOfGlobSpelling(n).some(({ name: h, pattern }) =>
        pattern === null
          ? caseMode === "exactly"
            ? path === h
            : posixCovers(h, path)
          : path.startsWith(`${h}/`) && s(pattern, path.slice(h.length)),
      ))
  );
}
//@ chunk-fq0cr76a.js:905425-905456 placement
var LONG_PATTERN_OR_PATH_RE = /[^/]{256}|^[^]{4097}/;
//@ chunk-fq0cr76a.js:905456-906056 placement
/**
 * 用运行时 glob 判断路径是否命中拒绝条目：按大小写模式（anyCase/ownCase/exactly）编译读、写两种翻译并缓存；无法编译或需要覆盖整个目录时退化为匹配 glob 的基目录。
 */
function matchesDenyGlobAtRuntime(path, pattern, caseMode, coverage, cache) {
  if (LONG_PATTERN_OR_PATH_RE.test(path)) return false;
  return matchesRuntimeGlobBy(path, removeTrailingGlobSuffix(pattern), caseMode, (globPattern, candidate) => {
    let cacheKey = (readTranslation) => `${globPattern}\x00runtime ${readTranslation} ${coverage}`;
    let matcher = cache?.get(cacheKey(caseMode));
    if (!matcher) {
      let R = yM(globPattern);
      let writeTranslation = coverage === "unread" ? undefined : bM(globPattern);
      let translations = (
        coverage === "allBeneathItsDirectory"
          ? R.kind !== "read" || writeTranslation?.kind !== "read"
          : coverage === "allBeneathIfUncompilable" &&
            (R.kind === "unreadable" || writeTranslation?.kind === "unreadable")
      )
        ? [SM(getGlobBaseDirectory_2(globPattern))]
        : [R, writeTranslation].flatMap((K) => (K?.kind === "read" ? [K.translation] : []));
      let buildMatcher = (K) => {
        let [primary, secondary] = translations.map((translation) => translation[K]);
        if (!primary) return () => false;
        return !secondary || secondary.source === primary.source
          ? (J) => primary.test(J)
          : (J) => primary.test(J) || secondary.test(J);
      };
      for (let K of ["anyCase", "ownCase", "exactly"]) cache?.set(cacheKey(K), buildMatcher(K));
      matcher = buildMatcher(caseMode);
    }
    return matcher(candidate);
  });
}
//@ chunk-fq0cr76a.js:906056-906214 placement
/**
 * deny 条目是否覆盖目标路径：非 glob 用前缀覆盖；glob 则对目标及其各级父目录依次尝试 glob 与名字读法匹配。
 */
function denyEntryCovers(e, n, r, s = false) {
  if (!containsGlobChars(e)) return posixCovers(e, n);
  let h = containsGlobChars(n) ? nameReadingsOfGlobSpelling(e) : [];
  let y = n;
  for (;;) {
    if (matchesGuardedGlob(y, e, r, s) || matchesNameReading(y, h, r, s)) return true;
    let b = dirname(y);
    if (b === y) return false;
    y = b;
  }
}
//@ chunk-fq0cr76a.js:906214-906325 placement
function denyEntryCoversPath(e, n, r, s = false) {
  if (!containsGlobChars(e)) return posixCovers(e, n);
  return (
    matchesDenyGlobAtRuntime(n, e, s ? "anyCase" : "ownCase", "unread", r) || denyEntryCovers(e, n, r, s)
  );
}
//@ chunk-fq0cr76a.js:906325-906578 placement
/**
 * 判断沙箱路径模式是否覆盖某路径：无 glob 时按路径段前缀比较，有 glob 时大小写两种折叠都试并处理不可编译模式。
 */
function denyEntryCoversFolded(e, n, r) {
  let s = getPlatform() === "windows";
  let h = s ? e.replaceAll("\\", "/") : e;
  let y = s ? n.replaceAll("\\", "/") : n;
  if (!containsGlobChars(h)) return isPathPrefixOf(h, y);
  let b = "allBeneathIfUncompilable";
  let S = foldPathCase(h);
  let w = foldPathCase(y);
  return (
    matchesDenyGlobAtRuntime(y, h, "anyCase", b, r) ||
    matchesDenyGlobAtRuntime(w, S, "ownCase", b, r) ||
    denyEntryCovers(h, y, r, true) ||
    denyEntryCovers(S, w, r)
  );
}
//@ chunk-fq0cr76a.js:906578-906746 placement
/**
 * glob 模式第一个通配符之前的目录部分（Windows 用 win32.dirname）。
 */
function getGlobBaseDirectory_2(e) {
  let n = e.split(/[*?[\]]/)[0] ?? "";
  if (getPlatform() === "windows") return win32.dirname(n.replace(/[/\\]+$/, "\\_"));
  return n.endsWith("/") ? n.replace(/\/+$/, "") || "/" : dirname(n);
}
//@ chunk-fq0cr76a.js:906746-906971 placement = permissionRuleValueFromString (0.361)
/**
 * 把规则串（如 `Read(//secret/**)`、`WebFetch(domain:x)`）解析成 {toolName, ruleContent}，Windows 上对反斜杠路径单独处理转义。
 */
function parseRuleForSandbox(ruleString) {
  let n = classifyRuleParens(ruleString);
  if (n.kind !== "call" || !n.toolName || n.rawContent === "")
    return {
      toolName: canonicalToolName(ruleString),
    };
  let r = getPlatform() === "windows" && isWindowsAbsoluteRule(n.rawContent);
  return {
    toolName: canonicalToolName(n.toolName),
    ruleContent: r ? unescapeParens(n.rawContent) : unescapeRuleContent(n.rawContent),
  };
}
//@ chunk-fq0cr76a.js:906971-907311 placement
/**
 * 去掉沙箱路径规则中的 glob 转义（\x→x，单字符类 [x]→x），保留真正的通配与字符类；Windows 上只在特定字符前视反斜杠为转义。
 */
function unescapeGlobPattern(e) {
  let n = getPlatform() === "windows";
  let r = n && isWindowsAbsoluteRule(e);
  let s = "";
  for (let j = 0; j < e.length; j++) {
    let y = e[j];
    let b = e[j + 1];
    if (y === "\\" && b !== undefined && !r && (!n || isEscapableRuleChar(b))) {
      s += containsGlobChars(b) ? y + b : b;
      j++;
    } else if (y === "[" && b !== undefined) {
      if (e[j + 2] === "]" && !containsGlobChars(b) && !"\\/!^".includes(b)) {
        s += b;
        j += 2;
      } else {
        let index = e.indexOf("]", j + 2);
        let w = index === -1 ? e.length : index + 1;
        s += e.slice(j, w);
        j = w - 1;
      }
    } else s += y;
  }
  return s;
}
//@ chunk-fq0cr76a.js:907311-907613 placement
/**
 * 解析 sandbox.filesystem 路径：`//x` 为绝对，`/x` 相对该设置来源根目录，`~/` 家目录，其他相对 cwd（./）。
 */
function resolvePathPatternForSandboxAt(pattern, sourceRoot) {
  assertPathHasNoNullBytes(pattern);
  if (pattern.startsWith("//")) return stripTrailingSlash(unescapeGlobPattern(pattern.slice(1)));
  if (pattern.startsWith("/")) {
    let sliced = pattern.slice(1);
    let y = !(getPlatform() === "windows" && /^(?:[A-Za-z]:[\\/]|\\\\)/.test(sliced));
    return resolve(sourceRoot, (y ? "./" : "") + unescapeGlobPattern(sliced));
  }
  let r = unescapeGlobPattern(pattern);
  let s = /^(?:[\\/]|~[\\/]|~$|[A-Za-z]:)/.exec(r)?.[0] ?? "";
  return stripTrailingSlash(pattern.startsWith(s) ? r : `./${r}`);
}
//@ chunk-fq0cr76a.js:907613-907652 placement
function resolvePathPatternForSandbox(pattern, n) {
  return resolvePathPatternForSandboxAt(pattern, getRuleAnchorRootForSource(n));
}
//@ chunk-fq0cr76a.js:907652-907762 placement
/**
 * 解析权限规则里的路径模式（Read/Edit 规则），`//x` 为绝对，其余经 expandPath 相对来源根；Windows 先展开 %USERPROFILE% 等。
 */
function resolveSandboxFilesystemPathAt(pattern, source) {
  assertPathHasNoNullBytes(pattern);
  if (pattern.startsWith("//")) return stripTrailingSlash(pattern.slice(1));
  return stripTrailingSlash(
    expandPath(getPlatform() === "windows" ? expandWindowsProfileVariables(pattern) : pattern, source),
  );
}
//@ chunk-fq0cr76a.js:907762-907853 placement
/**
 * 沙箱文件系统路径是否为相对路径（不是绝对路径也不是 ~/ 开头）；Windows 先展开 %USERPROFILE% 类变量。
 */
function isSandboxFilesystemPathRelative(e) {
  let trimmed = (getPlatform() === "windows" ? expandWindowsProfileVariables(e) : e).trim();
  return !isAbsolute(trimmed) && !/^~(?:\/|$)/.test(trimmed);
}
//@ chunk-fq0cr76a.js:907853-907920 placement
/**
 * Windows 上含 profile 变量的路径在旧版本被当相对路径读，返回 ./ 前缀的旧读法用于提示；其他情况 null。
 */
function sandboxFilesystemPathAsReadEarlier(e) {
  return getPlatform() === "windows" && hasWindowsProfileVariable(e) ? `./${e.trim()}` : null;
}
//@ chunk-fq0cr76a.js:907920-908037 placement
function hasWindowsProfileVariable(e) {
  return /^\s*(?:~\\|%(?:USERPROFILE|APPDATA|LOCALAPPDATA)%)/i.test(e) && !/%HOME(?:DRIVE|PATH)%/i.test(e);
}
//@ chunk-fq0cr76a.js:908037-908314 placement
function expandWindowsProfileVariables(e) {
  if (!hasWindowsProfileVariable(e)) return e;
  let n = homedir();
  return expandWindowsEnvRefs(
    e
      .replace(/%APPDATA%/gi, () =>
        env.APPDATA && isAbsolute(env.APPDATA) ? env.APPDATA : join(n, "AppData", "Roaming"),
      )
      .replace(/%LOCALAPPDATA%/gi, () =>
        env.LOCALAPPDATA && isAbsolute(env.LOCALAPPDATA) ? env.LOCALAPPDATA : join(n, "AppData", "Local"),
      ),
  ).replace(/^\s*~\\/, "~/");
}
//@ chunk-fq0cr76a.js:908314-908454 placement
function stripTrailingSlash(e, { evenAfterGlob: n = false } = {}) {
  if (getPlatform() === "windows" || !e.endsWith("/")) return e;
  if (!n && containsGlobChars(e)) return e;
  return e.replace(/\/+$/, "") || "/";
}
//@ chunk-fq0cr76a.js:908454-908564 placement
function normalizeDirectoryPattern(e) {
  if (getPlatform() === "windows")
    return containsGlobCharsWin(stripExtendedPathPrefix(e)) ? e.replace(/[\\/]+$/, "") : e;
  return stripTrailingSlash(e, {
    evenAfterGlob: true,
  });
}
//@ chunk-fq0cr76a.js:908564-908627 placement
function isDirectorySync(file) {
  try {
    return statSync(file).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-fq0cr76a.js:908627-908689 placement
function isDirectoryNoFollow(e) {
  try {
    return lstatSync(e).isDirectory();
  } catch {
    return false;
  }
}
//@ chunk-fq0cr76a.js:908689-908728 placement
function resolveSandboxFilesystemPath(pattern, n) {
  return resolveSandboxFilesystemPathAt(pattern, getRuleAnchorRootForSource(n));
}
//@ chunk-fq0cr76a.js:908728-908760 placement
function isRepoSettingSource(e) {
  return REPO_DIR_SETTING_SOURCES.has(e);
}
//@ chunk-fq0cr76a.js:908760-908827 placement
function isUserTierSource(e) {
  return e === "userSettings" || (e === "flagSettings" && isNotBackgroundSession());
}
//@ chunk-fq0cr76a.js:908827-908915 placement
function isTrustedTierSource(e) {
  return e === "policySettings"
    ? isPolicySlotAdminOrParentComposed()
    : e === "userSettings" || e === "flagSettings";
}
//@ chunk-fq0cr76a.js:908915-908970 placement
function isNotBackgroundSession() {
  return env.CLAUDE_CODE_SESSION_KIND !== "bg";
}
//@ chunk-fq0cr76a.js:908970-909065 placement
function warnDroppedPathEntry(error, n) {
  reportSandboxPathError(error, `Ignoring unresolvable sandbox path entry from ${n}`, "pathEntryDropped");
}
//@ chunk-fq0cr76a.js:909065-909182 placement
function reportSandboxPathError(e, n, r) {
  let s = e instanceof SandboxPathEntryError ? e.cause : e;
  if (s instanceof NullBytePathError)
    logForDebugging(`${n}: ${errorMessage(s)}`, {
      level: "warn",
    });
  else reportSandboxErrorUnderStandIn(s, r);
}
//@ chunk-fq0cr76a.js:909182-909288 placement
class SandboxPathEntryError extends Error {
  cause;
  telemetryMessage = SANDBOX_TELEMETRY_MESSAGES.pathEntryRefused;
  constructor(message, cause) {
    super(message);
    this.cause = cause;
  }
}
//@ chunk-fq0cr76a.js:909288-909466 placement
/**
 * 解析一条沙箱路径条目；失败时若沙箱为必需、或是可信层的 deny 条目则抛 SandboxPathEntryError（整个配置构建失败），否则告警丢弃。
 */
function resolvePathEntry(e, n, r, s) {
  try {
    return s(e, n);
  } catch (error) {
    if (
      (isSettingSourceEnabled(n) && isSandboxRequired()) ||
      (!(error instanceof NullBytePathError) && r === "deny" && !isRepoSettingSource(n))
    )
      throw new SandboxPathEntryError(`${errorMessage(error)} (a sandbox path entry from ${n})`, error);
    warnDroppedPathEntry(error, n);
    return;
  }
}
//@ chunk-fq0cr76a.js:909466-909560 placement
/**
 * 批量解析路径条目（相对于来源根、展开 ~），丢弃解析失败的条目。
 */
function resolvePathEntries(e, n, r, s) {
  return (e ?? []).flatMap((h) => {
    let pathEntry = resolvePathEntry(h, n, r, s);
    return pathEntry === undefined ? [] : [pathEntry];
  });
}
//@ chunk-fq0cr76a.js:909560-909600 placement
function resolveSandboxPathPatterns(e, n, r) {
  return resolvePathEntries(e, n, r, resolveSandboxFilesystemPath);
}
//@ chunk-fq0cr76a.js:909600-909749 placement
/**
 * 把权限规则列表按工具名分组，只保留有 ruleContent 的（如取出所有 Read(...) 的路径）。
 */
function groupRuleContentsByTool(e, n) {
  let r = new Map(n.map((s) => [s, []]));
  for (let s of e ?? []) {
    let ruleForSandbox = parseRuleForSandbox(s);
    if (ruleForSandbox.ruleContent) r.get(ruleForSandbox.toolName)?.push(ruleForSandbox.ruleContent);
  }
  return r;
}
//@ chunk-fq0cr76a.js:909749-909789 placement
function resolveSandboxDenyReadEntry(e, source) {
  return normalizeDirPattern(e, resolveSandboxFilesystemPath(e, source));
}
//@ chunk-fq0cr76a.js:909789-909825 placement
function normalizeDirPattern(e, n) {
  return normalizeDirEntryPattern(e, normalizeDirectoryPattern(n));
}
//@ chunk-fq0cr76a.js:909825-909947 placement
var NETWORK_HOST_RULE_SCHEMA = DoctorLazy(() =>
  u({
    host: string().min(1),
    action: _enum(["allow", "deny"]).optional(),
    methods: array(string()).optional(),
    reason: string().optional(),
  }),
);
//@ chunk-fq0cr76a.js:909947-909974 placement
function antSandboxConfig() {
  return null;
}
//@ chunk-fq0cr76a.js:909974-910031 placement
function isNestedGitConfigLockDenyEnabled() {
  return readFlagWithOverride("tengu_golden_pebble", {
    safe: true,
  });
}
//@ chunk-fq0cr76a.js:910031-910092 placement
function isSshStoreWriteDenyEnabled() {
  return readFlagWithOverride("tengu_resilient_adleman", {
    safe: true,
  });
}
//@ chunk-fq0cr76a.js:910092-910131 placement
function isPluginToolStagingDenyEnabled() {
  return readFlagWithOverride(PLUGIN_TOOL_STAGING_GUARD_FLAG, {
    safe: true,
  });
}
//@ chunk-fq0cr76a.js:910131-910162 placement
var TENGU_HUSHED_CARAWAY = "tengu_hushed_caraway";
//@ chunk-fq0cr76a.js:910162-910201 placement
function isPatternWriteDenyTwinsEnabled() {
  return readFlagWithOverride(TENGU_HUSHED_CARAWAY, {
    safe: true,
  });
}
//@ chunk-fq0cr76a.js:910201-910230 placement
var TENGU_QUIET_MEDLAR = "tengu_quiet_medlar";
//@ chunk-fq0cr76a.js:910230-910269 placement
function isUnlistableWorktreesDenyEnabled() {
  return readFlagWithOverride(TENGU_QUIET_MEDLAR, {
    safe: true,
  });
}
//@ chunk-fq0cr76a.js:910269-910293 placement
/**
 * 外部构建里沙箱 GrowthBook 配置恒为 {}（forbidUnsandboxedCommands、disableNoSandbox、requireSandboxedAttempt、filesystemPolicy 都未设置）。
 */
function getDefaultSandboxGbConfig() {
  return {};
}
//@ chunk-fq0cr76a.js:910293-910342 placement
function getSandboxGbConfig() {
  return getSandboxAdapterState().tenguSandboxGbConfig();
}
//@ chunk-fq0cr76a.js:910342-910513 placement
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
//@ chunk-fq0cr76a.js:910513-910605 placement
function getTlsTerminateSetting() {
  return getSandboxSettingsSources()
    .map((e) => e?.sandbox?.network?.tlsTerminate)
    .find((e) => e !== undefined);
}
//@ chunk-fq0cr76a.js:910605-910765 placement
var MANDATE_IGNORED_NETWORK_KEYS = [
  "allowUnixSockets",
  "allowAllUnixSockets",
  "allowLocalBinding",
  "allowMachLookup",
  "httpProxyPort",
  "socksProxyPort",
];
var PROXY_PORT_KEYS = ["httpProxyPort", "socksProxyPort"];
//@ chunk-fq0cr76a.js:910765-912502 placement
/**
 * 计算 sandbox.network 的本地放行项（unix socket、本地绑定、mach lookup、代理端口）：无管理员强制且无可信网络限制时直接用合并设置；否则忽略 project/local 设置里的这些键（并记一次日志），代理端口在 allowManagedDomainsOnly 时只认托管设置。
 */
function getNetworkAllowances(network) {
  let n = isAdminSandboxMandate();
  if (!n && !hasTrustedNetworkRestrictions())
    return {
      allowUnixSockets: network?.allowUnixSockets,
      allowAllUnixSockets: network?.allowAllUnixSockets,
      allowLocalBinding: getAllowLocalBindingFor(network),
      allowMachLookup: network?.allowMachLookup,
      httpProxyPort: network?.httpProxyPort,
      socksProxyPort: network?.socksProxyPort,
    };
  let r = shouldAllowManagedSandboxDomainsOnly();
  let sandboxAdapterState = getSandboxAdapterState();
  if (!sandboxAdapterState.droppedRepoNetworkAllowancesLogged) {
    sandboxAdapterState.droppedRepoNetworkAllowancesLogged = true;
    let mapped = ["projectSettings", "localSettings"].map((L) =>
      isSettingSourceEnabled(L) ? getSettingsForSource(L) : null,
    );
    let filtered = (n ? MANDATE_IGNORED_NETWORK_KEYS : PROXY_PORT_KEYS).filter((L) =>
      mapped.some((V) => {
        let K = V?.sandbox?.network?.[L];
        return K !== undefined && K !== false;
      }),
    );
    if (filtered.length > 0)
      logForDebugging(
        n
          ? `[sandbox] admin sandbox mandate: ignoring sandbox.network.${filtered.join(", ")} from project/local settings`
          : `[sandbox] trusted network deny list or strict allowlist: ignoring sandbox.network.${filtered.join(", ")} from project/local settings (a project may not replace the filtering proxy)`,
      );
    if (r) {
      let L = sandboxSettingsChain();
      let filtered = PROXY_PORT_KEYS.filter((K) => L.some((q) => q?.sandbox?.network?.[K] !== undefined));
      if (filtered.length > 0)
        logForDebugging(
          `[sandbox] network.allowManagedDomainsOnly: ignoring sandbox.network.${filtered.join(", ")} from --settings/user settings; only managed settings may replace the filtering proxy`,
        );
    }
  }
  let h = r ? policySandboxSetting : firstFromSandboxSettings;
  let httpProxyPort = h((R) => R.network?.httpProxyPort);
  let socksProxyPort = h((R) => R.network?.socksProxyPort);
  if (!n)
    return {
      allowUnixSockets: network?.allowUnixSockets,
      allowAllUnixSockets: network?.allowAllUnixSockets,
      allowLocalBinding: getAllowLocalBindingFor(network),
      allowMachLookup: network?.allowMachLookup,
      httpProxyPort,
      socksProxyPort,
    };
  let S = collectFromSandboxSettings((R) => R.network?.allowUnixSockets);
  let w = collectFromSandboxSettings((R) => R.network?.allowMachLookup);
  return {
    allowUnixSockets: S.length > 0 ? S : undefined,
    allowAllUnixSockets: trustedBooleanUnlessFalse(
      network?.allowAllUnixSockets,
      (R) => R.network?.allowAllUnixSockets,
    ),
    allowLocalBinding:
      getPlatform() === "windows"
        ? getWindowsLoopbackSetting()
        : trustedBooleanUnlessFalse(network?.allowLocalBinding, (R) => R.network?.allowLocalBinding),
    allowMachLookup: w.length > 0 ? w : undefined,
    httpProxyPort,
    socksProxyPort,
  };
}
//@ chunk-fq0cr76a.js:912502-912566 placement
function getAllowLocalBindingFor(e) {
  return getPlatform() === "windows" ? getWindowsLoopbackSetting() : e?.allowLocalBinding;
}
//@ chunk-fq0cr76a.js:912566-912640 placement
/**
 * Windows 沙箱是否允许本地连接：取 sandbox.network.allowLocalBinding（托管锁定时只看可信层）。
 */
function areWindowsLocalConnectionsOn() {
  return (
    (areSandboxSettingsLockedByPolicy() ? policySandboxSetting : firstFromSandboxSettings)(
      (e) => e.network?.allowLocalBinding,
    ) === true
  );
}
//@ chunk-fq0cr76a.js:912640-912793 fingerprint = areSandboxSettingsLockedByPolicy (0.861)
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
//@ chunk-fq0cr76a.js:912793-912849 placement
function getWindowsLoopbackSetting() {
  return getSandboxAdapterState().windowsLoopbackAtStart ?? areWindowsLocalConnectionsOn();
}
//@ chunk-fq0cr76a.js:912849-912926 placement
/**
 * 本地连接设置与启动时不同（需要重启才生效）时为真。
 */
function needsRestartForLocalConnections() {
  let windowsLoopbackAtStart = getSandboxAdapterState().windowsLoopbackAtStart;
  return windowsLoopbackAtStart !== undefined && windowsLoopbackAtStart !== areWindowsLocalConnectionsOn();
}
//@ chunk-fq0cr76a.js:912926-912966 placement
function trustedBooleanUnlessFalse(e, n) {
  return e === false ? false : firstFromSandboxSettings(n);
}
//@ chunk-fq0cr76a.js:912966-912998 placement
var ALLOW_ALL_UNIX_SOCKETS = {
  allowAllUnixSockets: true,
};
//@ chunk-fq0cr76a.js:912998-913221 placement
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
//@ chunk-fq0cr76a.js:913221-913412 placement
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
//@ chunk-fq0cr76a.js:913412-913517 placement
/**
 * 沙箱是否会做 TLS 终止：设置了 tlsTerminate 且（非 Windows，或 Windows 有可用 CA 来源）。
 */
function willSandboxTlsTerminate() {
  if (getTlsTerminateSetting() === undefined) return false;
  if (getPlatform() !== "windows") return true;
  return resolveWindowsTlsTerminateCaSource().source !== "unavailable";
}
//@ chunk-fq0cr76a.js:913517-913857 placement
/**
 * 比较已安装的 Windows TLS CA 证书指纹与期望值；无证书路径、文件异常或读取失败一律视为最新。
 */
function isInstalledWindowsTlsCaCurrent(caCertThumb) {
  let windowsTlsTerminateCaSource = resolveWindowsTlsTerminateCaSource();
  try {
    let r =
      windowsTlsTerminateCaSource.source === "trustedPair"
        ? (windowsTlsTerminateCaSource.caCertPath ?? null)
        : windowsTlsTerminateCaSource.source === "managed"
          ? join(windowsStateDir(), "ca", "cert.pem")
          : null;
    if (r === null) return true;
    let s = openSync(r, "r");
    let certPem;
    try {
      let y = fstatSync(s);
      if (!y.isFile() || y.size > MAX_DENY_PATTERN_BYTES) return true;
      let b = Buffer.alloc(y.size);
      readSync(s, b, 0, b.length, 0);
      certPem = b.toString("utf8");
    } finally {
      closeSync(s);
    }
    return certThumbprint(certPem) === caCertThumb;
  } catch {
    return true;
  }
}
//@ chunk-fq0cr76a.js:913857-913871 placement
var MAX_DENY_PATTERN_BYTES = 65536;
//@ chunk-fq0cr76a.js:913871-914151 placement
function getFilesystemDisabledSetting() {
  let allPolicyTierSettings = getAllPolicyTierSettings();
  let n = booleanOrUndefined(readPolicySandboxSetting(["filesystem", "disabled"]));
  if (n !== undefined) return n;
  if (
    allPolicyTierSettings.some(
      (policyTierSetting) =>
        policyTierSetting.sandbox?.filesystem !== undefined ||
        (policyTierSetting.sandbox?.credentials?.files ?? []).some((h) => h.mode === "deny"),
    )
  )
    return;
  return getSandboxSettingsSources()
    .map((s) => s?.sandbox?.filesystem?.disabled)
    .find((s) => s !== undefined);
}
//@ chunk-fq0cr76a.js:914151-914201 placement
function isFilesystemIsolationDisabledBySetting() {
  return getFilesystemDisabledSetting() === true && getEffectiveFilesystemPolicy() === "relaxed";
}
//@ chunk-fq0cr76a.js:914201-914253 placement
function booleanOrUndefined(e) {
  return typeof e === "boolean" ? e : undefined;
}
//@ chunk-fq0cr76a.js:914253-914331 placement
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
//@ chunk-fq0cr76a.js:914331-914651 placement
/**
 * 返回不添加读取拒绝的原因（只允许托管读取路径、原始工作目录含通配字符、Windows 需要管理员权限），否则 null。
 */
function getReadDenySkipReason() {
  if (getAllPolicyTierSettings().some((e) => e.sandbox?.filesystem?.allowManagedReadPathsOnly === true))
    return "allowManagedReadPathsOnly is set";
  if (containsGlobChars(getOriginalCwd())) return "the original working directory has glob characters";
  return getPlatform() === "windows"
    ? "on Windows the read denies are never added, because adding them needs administrator rights"
    : null;
}
//@ chunk-fq0cr76a.js:914651-914879 placement
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
//@ chunk-fq0cr76a.js:914879-914935 placement
function sandboxExportsChildTmpDir() {
  return getPlatform() === "windows" || getEffectiveFilesystemPolicy() !== "relaxed";
}
//@ chunk-fq0cr76a.js:914935-915158 placement = getSettingsRootPathForSource (0.836)
function isSandboxEnabledInSettings() {
  return [
    ...getAllPolicyTierSettings(),
    getSettingsForSource("flagSettings"),
    isSettingSourceEnabled("userSettings") ? getSettingsForSource("userSettings") : null,
    isSettingSourceEnabled("projectSettings") ? getSettingsForSource("projectSettings") : null,
    isSettingSourceEnabled("localSettings") ? getSettingsForSource("localSettings") : null,
  ].some((e) => e?.sandbox?.enabled === true);
}
//@ chunk-fq0cr76a.js:915158-915245 placement = shouldAllowManagedSandboxDomainsOnly (0.821)
/**
 * 任一托管/可信层设置了 sandbox.network.allowManagedDomainsOnly 时为真：网络白名单只认托管层。
 */
function shouldAllowManagedSandboxDomainsOnly() {
  return getAllPolicyTierSettings().some((e) => e.sandbox?.network?.allowManagedDomainsOnly === true);
}
//@ chunk-fq0cr76a.js:915245-915324 placement
/**
 * 任一可信层设置了 sandbox.network.strictAllowlist 时为真。
 */
function isStrictNetworkAllowlistConfigured() {
  return getSandboxSettingsSources().some((e) => e?.sandbox?.network?.strictAllowlist === true);
}
//@ chunk-fq0cr76a.js:915324-915396 placement
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
//@ chunk-fq0cr76a.js:915396-915461 placement
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
//@ chunk-fq0cr76a.js:915461-915579 placement = supportsPersistence (0.79)
/**
 * 沙箱设置写到哪一层：仅允许托管域名时不可写；托管策略锁定时只写 userSettings（若启用），否则 localSettings。
 */
function sandboxHostGrantDestination() {
  if (shouldAllowManagedSandboxDomainsOnly()) return null;
  if (isAdminSandboxMandate() || isStrictNetworkAllowlistConfigured())
    return isSettingSourceEnabled("userSettings") ? "userSettings" : null;
  return "localSettings";
}
//@ chunk-fq0cr76a.js:915579-915606 placement
var TCP_PORT_PATTERN = /^[1-9][0-9]{0,4}$/;
//@ chunk-fq0cr76a.js:915606-915694 placement
/**
 * 主机名规范化（IDNA 等）后与其小写形式不同；IPv6 不算。用于识别易误导的同意弹窗主机名。
 */
function hostnameCanonicalFormDiffers(e) {
  if (isIP(e) === 6) return false;
  let n = canonicalizeHost(e);
  return n !== undefined && n !== e.toLowerCase();
}
//@ chunk-fq0cr76a.js:915694-915815 placement
function isValidSandboxHost(e, n) {
  if (e.length === 0 || e.length > 255) return false;
  if (n.includes("%")) return false;
  if (isIP(n) !== 0) return true;
  return isSrtHostNameCharset(n);
}
//@ chunk-fq0cr76a.js:915815-915865 placement
function isSrtHostNameCharset(e) {
  return /^[A-Za-z0-9._-]+$/.test(e);
}
//@ chunk-fq0cr76a.js:915865-915965 placement
/**
 * 是否是严格端口后缀“:数字”且不超过 65535。
 */
function isStrictPortSuffix(e) {
  if (!e.startsWith(":")) return false;
  let sliced = e.slice(1);
  return TCP_PORT_PATTERN.test(sliced) && Number(sliced) <= 65535;
}
//@ chunk-fq0cr76a.js:915965-916115 placement
function stripIpv6Brackets(e) {
  if (!e.startsWith("[")) return e;
  let index = e.indexOf("]");
  if (index === -1) return;
  let sliced = e.slice(index + 1);
  if (sliced !== "" && !isStrictPortSuffix(sliced)) return;
  return e.slice(1, index);
}
//@ chunk-fq0cr76a.js:916115-916178 placement
function hasWildcardAfterNormalize(e) {
  let n = canonicalizeHost(e);
  return n !== undefined && n.includes("*");
}
//@ chunk-fq0cr76a.js:916178-916324 placement
/**
 * 规范化会不会改变主机：无法规范化、规范结果与原串不一致、或是特殊形式时为真；IP 直接为假。
 */
function canonicalizationChangesHost(e) {
  let n = stripIpv6Brackets(e);
  if (n === undefined) return true;
  if (!isValidSandboxHost(e, n)) return true;
  if (isIP(n) !== 0) return false;
  if (hasWildcardAfterNormalize(n)) return true;
  return hostnameCanonicalFormDiffers(n.replace(/\.$/, ""));
}
//@ chunk-fq0cr76a.js:916324-916370 placement
function isMisleadingConsentHost(e) {
  return e.includes("*") || canonicalizationChangesHost(e);
}
//@ chunk-fq0cr76a.js:916370-916465 placement
/**
 * 是否为不带方括号的 IPv6 字面量（至少两个冒号且不以 [ 开头）。
 */
function isBareIpv6Literal(e) {
  let index = e.indexOf(":");
  return index !== -1 && e.indexOf(":", index + 1) !== -1 && !e.startsWith("[");
}
//@ chunk-fq0cr76a.js:916672-916809 sole-consumer
function expandIpv6Spellings(e) {
  let n = [];
  if (isIP(e) === 6) n.push(`[${e}]`);
  let hostPort = parseHostPort(e);
  if (hostPort !== undefined) n.push(`[${hostPort.host}]:${hostPort.port}`);
  return n.length > 0 ? n : [e];
}
//@ chunk-fq0cr76a.js:916809-916919 placement
function expandBareIpv6Hosts(e) {
  return e.flatMap((n) => {
    if (!isBareIpv6Literal(n)) return [n];
    if (n.includes("@") || hostnameCanonicalFormDiffers(n)) return [n];
    return expandIpv6Spellings(n);
  });
}
//@ chunk-fq0cr76a.js:916919-917165 placement
function addTrailingDotFreeVariants(e) {
  return e.flatMap((n) => {
    if (n.startsWith("[")) return [n];
    let { hostPattern, port } = splitDomainPatternPort(n);
    let replaced = hostPattern.replace(/\.+$/, "");
    if (replaced === hostPattern) return [n];
    if (replaced === "" || replaced.endsWith("*")) return [n];
    if (canonicalizeHost(replaced) === undefined) return [n];
    return [n, port === undefined ? replaced : `${replaced}:${port}`];
  });
}
//@ chunk-fq0cr76a.js:917165-917386 placement
function bracketIpv6WithPort(e) {
  let index = e.lastIndexOf(":");
  let sliced = e.slice(0, index);
  let sliced_2 = e.slice(index + 1);
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
  return e;
}
//@ chunk-fq0cr76a.js:917386-917430 placement
function formatIpLiteralHost(e) {
  return isIP(e) === 6 ? `[${e}]` : e;
}
//@ chunk-fq0cr76a.js:917430-917510 placement
/**
 * 把主机名转成会话放行条目：去掉末尾点（原样或可规范化时），再做条目编码。
 */
function consentHostEntry(host) {
  let replaced = host.replace(/\.$/, "");
  return formatIpLiteralHost(replaced === host || canonicalizeHost(host) !== undefined ? replaced : host);
}
//@ chunk-fq0cr76a.js:917510-917864 placement
/**
 * 规范化网络条目中的 IPv6 主机写法：丢弃含 @、规范形式不一致或无法规范化的条目，为带端口的裸 IPv6 加方括号。
 */
function normalizeIpv6HostEntries(e) {
  return e.flatMap((n) => {
    if (n.includes("@")) return [];
    if (n.startsWith("[")) {
      let index = n.indexOf("]");
      let h = index === -1 ? undefined : n.slice(1, index);
      if (h !== undefined && hostnameCanonicalFormDiffers(h)) return [];
      if (h !== undefined && h.includes("*") && canonicalizeHost(h) !== undefined) return [];
      return [n];
    }
    if (!isBareIpv6Literal(n)) return [n];
    if (hostnameCanonicalFormDiffers(n)) return [];
    let r = bracketIpv6WithPort(n);
    if (r !== n) return [r];
    if (isIP(n) === 6 && parseHostPort(n) !== undefined) return [];
    return [n];
  });
}
//@ chunk-fq0cr76a.js:917864-918156 placement
/**
 * 从多层设置收集网络域名条目：sandbox.network.allowedDomains/deniedDomains，加上 WebFetch(domain:…) 的 allow/deny 规则。
 */
function collectNetworkDomainEntries(e, n) {
  let r = n === "allow" ? "allowedDomains" : "deniedDomains";
  let s = [];
  for (let h of e) {
    for (let y of h.sandbox?.network?.[r] ?? []) s.push(y);
    for (let y of h.permissions?.[n] ?? []) {
      let ruleForSandbox = parseRuleForSandbox(y);
      if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
        s.push(ruleForSandbox.ruleContent.substring(7));
    }
  }
  return s;
}
//@ chunk-fq0cr76a.js:918156-918291 placement
function hostEntryMatches(e, n, r, s) {
  let { hostPattern, port } = splitDomainPatternPort(e);
  if (!hostIdentityMatches(hostPattern, n)) return false;
  if (port === undefined) return true;
  return r === undefined ? s === "match" : port === r;
}
//@ chunk-fq0cr76a.js:918291-918777 placement
/**
 * 按沙箱网络策略判断主机是否允许：命中 deniedDomains（含 IP 反查名）则拒绝并给原因；allowManagedDomainsOnly 时只放行托管层白名单；否则放行。
 */
function isHostAllowedBySandboxNetworkPolicy(e, n) {
  let r = isIP(e) !== 0 ? (canonicalizeHost(e) ?? e) : e;
  let allPolicyTierSettings = getAllPolicyTierSettings();
  if (
    addTrailingDotFreeVariants(
      expandBareIpv6Hosts([
        ...collectNetworkDomainEntries([getSettings_DEPRECATED(), ...allPolicyTierSettings], "deny"),
        ...[],
      ]),
    ).some((b) => hostEntryMatches(b, r, n, "match") || hostEntryMatches(b, e, n, "match"))
  )
    return {
      allowed: false,
      reason:
        r === e
          ? `${e} is in sandbox.network.deniedDomains`
          : `${e} (${r}) is in sandbox.network.deniedDomains`,
    };
  if (!shouldAllowManagedSandboxDomainsOnly())
    return {
      allowed: true,
    };
  if (
    normalizeIpv6HostEntries(collectNetworkDomainEntries(allPolicyTierSettings, "allow")).some((b) =>
      hostEntryMatches(b, r, n, "no-match"),
    )
  )
    return {
      allowed: true,
    };
  return {
    allowed: false,
    reason: `sandbox.network.allowManagedDomainsOnly is set and ${e} is not in the policy allowlist`,
  };
}
//@ chunk-fq0cr76a.js:918777-919011 placement
function grantSessionHost(e) {
  if (isMisleadingConsentHost(e)) {
    logForDebugging(
      `[SandboxManager] Refusing a session grant for a host srt would re-spell as ${canonicalizeHost(e) ?? "(uncanonicalizable)"}`,
      {
        level: "warn",
      },
    );
    return;
  }
  let { sessionAllowedHosts } = getSandboxAdapterState();
  let r = consentHostEntry(e);
  if (sessionAllowedHosts.has(r)) return;
  sessionAllowedHosts.add(r);
  refreshConfig();
}
//@ chunk-fq0cr76a.js:919011-919470 placement
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
    let target = followDanglingLink(targetPath, linkTarget) ?? resolve(dirname(targetPath), linkTarget);
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
      hopDirectories: collectSymlinkHopDirectories(targetPath, null),
      danglingBaseline: false,
    });
    return target;
  }
}
//@ chunk-fq0cr76a.js:919470-920176 placement
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
        (Z) =>
          allowWriteRoots.some((parse) => isPathPrefixOf(parse, Z)) &&
          !allowWriteRoots.some((allowWriteRoot) => isPathPrefixOf(Z, allowWriteRoot)),
      ),
    );
    let contents = parse && index === -1 ? readSmallTextFile(file) : null;
    if (contents === null) continue;
    let { includes, files } = parseGitConfigSections(contents);
    for (let [Z, J] of [
      [includes, true],
      [files, false],
    ])
      for (let ie of Z) {
        let pathPatternForSandbox = resolvePathPatternForSandbox_2(ie, file, homeDir);
        if (pathPatternForSandbox !== null)
          queue.push({
            file: pathPatternForSandbox,
            parse: J,
          });
      }
  }
  return uniq(results);
}
//@ chunk-fq0cr76a.js:920176-920300 placement
function resolvePathPatternForSandbox_2(e, file, homeDir) {
  if (e === "~" || e.startsWith("~/")) return resolve(homeDir, `./${e.slice(2)}`);
  return e.startsWith("~") ? null : resolve(dirname(file), e);
}
//@ chunk-fq0cr76a.js:920300-920446 placement
function readSmallTextFile(file) {
  try {
    let n = statSync(file);
    if (!n.isFile() || n.size > 1048576) return null;
    let file_2 = readFileSync(file, "utf8");
    return file_2.includes("\x00") ? null : file_2;
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:920446-920633 placement
function resolveSymlinkChain(file) {
  if (getPlatform() === "windows") return [file];
  let n = [file];
  let r = file;
  for (let j = 0; j < MAX_HOST_LABEL_COUNT; j++) {
    let firstSymlink = resolveFirstSymlink(r);
    if (firstSymlink === null) return null;
    if (firstSymlink === undefined) return uniq([...n, r]);
    n.push(firstSymlink.link);
    r = firstSymlink.next;
  }
  return null;
}
//@ chunk-fq0cr76a.js:920633-920929 placement
function resolveFirstSymlink(e) {
  let filtered = e.split(sep).filter(Boolean);
  for (let j = 1; j <= filtered.length; j++) {
    let s = sep + filtered.slice(0, j).join(sep);
    let h;
    try {
      h = readlinkSync(s);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode === "EINVAL") continue;
      return errnoCode === "ENOENT" || errnoCode === "ENOTDIR" ? undefined : null;
    }
    let linkTarget = resolveLinkTarget(dirname(s), h);
    return linkTarget === null
      ? null
      : {
          link: s,
          next: join(linkTarget, ...filtered.slice(j)),
        };
  }
  return;
}
//@ chunk-fq0cr76a.js:920929-921931 placement
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
  let resolveDir = (R) => {
    let D = state.scrubParentMemo.get(R);
    if (D === undefined) {
      try {
        let real = identity(realpathSync(R));
        let inode = null;
        try {
          let V = statSync(R, {
            bigint: true,
          });
          inode = {
            dev: V.dev,
            ino: V.ino,
          };
        } catch {}
        D = {
          real,
          inode,
        };
      } catch {
        D = {
          real: null,
          inode: null,
        };
      }
      state.scrubParentMemo.set(R, D);
    }
    return D;
  };
  let parentDir = dirname(targetPath);
  let { real: realPath, inode } = resolveDir(parentDir);
  let real = resolveDir(dirname(parentDir)).real;
  let S = real === null ? null : identity(join(real, basename(parentDir)));
  let info = {
    real: realPath,
    literalPhysical: S === realPath ? null : S,
    inode,
  };
  if (realPath === null) {
    let R = state.scrubParentLastKnown.get(parentDir);
    if (R !== undefined) {
      logForDebugging(
        `[Sandbox] scrub parent ${parentDir} did not resolve at this config build; keeping the spelling recorded earlier this session`,
      );
      return resolveEntryWithoutInode(R);
    }
  } else {
    let R = state.scrubParentLastKnown.get(parentDir);
    if (R !== undefined && (R.real !== realPath || R.literalPhysical !== info.literalPhysical)) {
      logForDebugging(
        `[Sandbox] scrub parent ${parentDir} resolves elsewhere than at an earlier config build this session; keeping the spelling recorded then`,
        {
          level: "warn",
        },
      );
      logFeatureSad("sandbox_exec", "scrub_parent_rebuild_relocated");
      return resolveEntryWithoutInode(R);
    }
    state.scrubParentLastKnown.set(parentDir, info);
  }
  return info;
}
//@ chunk-fq0cr76a.js:921931-922011 placement
function resolveEntryWithoutInode(e) {
  return {
    real: e.real,
    literalPhysical: e.literalPhysical,
    inode: null,
  };
}
//@ chunk-fq0cr76a.js:922011-922050 placement
function isENOENTError(e) {
  return getErrnoCode(e) === "ENOENT";
}
//@ chunk-fq0cr76a.js:922050-922513 placement
/**
 * 登记需在命令后清理的裸仓库标记路径；无法确认其是否存在时警告（将来找到文件会移走而不是删除）。
 */
function registerBareRepoScrubPath(state, targetPath, removal, s) {
  let h = s === undefined || isENOENTError(s);
  if (!h) {
    let errnoCode = getErrnoCode(s);
    let b =
      errnoCode === "EEXIST"
        ? `${targetPath} appeared while the sandbox configuration was being built`
        : `could not check whether ${targetPath} exists (${errnoCode ?? s})`;
    logForDebugging(
      `[Sandbox] ${b}; if the cleanup after a sandboxed command finds a file there, it will move the file aside, not delete it`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_exec", "bare_repo_indicator_unclassified");
  }
  state.bareGitRepoScrubPaths.set(targetPath, {
    path: targetPath,
    parent: resolveScrubParent(state, targetPath),
    unlinkable: h,
    removal,
  });
}
//@ chunk-fq0cr76a.js:922513-922621 placement
function checkPathAbsent(e) {
  try {
    statSync(e);
    return Object.assign(Error("the path exists"), {
      code: "EEXIST",
    });
  } catch (error) {
    return error;
  }
}
//@ chunk-fq0cr76a.js:922621-922636 placement
var MAX_OWNER_MODE_RESTORE_BYTES = 2097152;
//@ chunk-fq0cr76a.js:922636-922956 placement
/**
 * 若沙箱命令改掉了目录所有者的 rwx 权限，则恢复并记录。
 */
function restoreOwnerDirMode(parentBase, label) {
  try {
    let r = statSync(parentBase);
    if ((r.mode & 448) !== 448 && r.uid === process.getuid?.()) {
      chmodSync(parentBase, (r.mode & 4095) | 448);
      logSandboxDebug(
        `${label}: restored owner rwx on a directory the sandboxed command had chmod'ed ${(r.mode & 4095).toString(8)}`,
      );
      logSandboxOutcome("scrub_restored_owner_rwx");
    }
  } catch (error) {
    logSandboxDebug(`${label}: could not check/restore directory mode (${getErrnoCode(error) ?? error})`);
  }
}
//@ chunk-fq0cr76a.js:922956-924555 placement
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
      let V =
        fd !== null
          ? fstatSync(fd, {
              bigint: true,
            })
          : statSync(dirPath, {
              bigint: true,
            });
      sameInode = V.dev === recordedInode.dev && V.ino === recordedInode.ino;
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
    let V = hasProcPath;
    if (!hasProcPath && recordedInode !== null)
      try {
        let K = lstatSync(expectedPath, {
          bigint: true,
        });
        V = K.isDirectory() && K.dev === recordedInode.dev && K.ino === recordedInode.ino;
      } catch {}
    if (V) {
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
//@ chunk-fq0cr76a.js:924555-924592 placement
var QUARANTINE_PREFIX = ".claude-sandbox-quarantine-";
//@ chunk-fq0cr76a.js:924592-925459 placement
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
    let R = `${entryName}${QUARANTINE_PREFIX}${randomBytes(6).toString("hex")}`;
    try {
      renameSync(entryPath, join(parentDir, R));
      logSandboxDebug(
        `${label}: moved the planted ${entryName} aside whole as ${R} rather than deleting it \u2014 it may be a pre-existing ${isDirectory ? "directory" : "file"} the command moved here, so inspect before deleting`,
      );
      logSandboxOutcome(isDirectory ? "scrub_planted_dir_quarantined" : "scrub_planted_file_quarantined");
      onQuarantined?.(R);
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
//@ chunk-fq0cr76a.js:925459-927560 placement
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
  let report = (L, V) => {
    reportSandboxErrorUnderStandIn(L, V);
  };
  let leaveInPlace = (L) => {
    report(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `[Sandbox] ${label}: the planted ${entryName} could not be moved aside or made unreadable (${L}); it stays in place, readable \u2014 remove it by hand`,
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
  let unlinkInstead = (L) => {
    try {
      unlinkSync(entryPath);
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      return errnoCode === "ENOENT"
        ? "gone"
        : leaveInPlace(`unlink of the ${L} failed: ${errnoCode ?? error}`);
    }
    let V = `[Sandbox] ${label}: could not move the planted ${entryName} aside (the rename failed); unlinked the ${L} instead${parentNote}; recreate it if so`;
    if (isRecordedParent) logForDebugging(V);
    else
      report(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          V,
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
    let L = fstatSync(fd);
    if (L.isDirectory() && !includeDirectories) return "left";
    if (!L.isFile() && !L.isDirectory())
      return unlinkInstead(L.isSymbolicLink() ? "symlink" : "non-regular entry");
    if (L.isFile() && L.nlink > 1) return unlinkInstead("hard link");
    let V = process.getuid?.();
    if (V === 0) return leaveInPlace("mode bits do not bind root");
    if (L.uid !== V) return leaveInPlace("not owned by this user; chmod would be EPERM");
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
//@ chunk-fq0cr76a.js:927560-928143 placement
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
//@ chunk-fq0cr76a.js:928143-928346 placement
function resolveLinkTarget(e, n) {
  let parts = n.split("/");
  let index = parts.findIndex((y) => y !== ".." && y !== "." && y !== "");
  let h = index !== -1 && parts.indexOf("..", index) !== -1;
  if (isAbsolute(n)) return parts.includes("..") ? null : resolve(n);
  if (h || e === undefined) return null;
  return resolve(e, n);
}
//@ chunk-fq0cr76a.js:928346-928577 placement
function followDanglingLink(e, n, r = false) {
  let s;
  try {
    s = realpathSync(dirname(e));
  } catch {
    return null;
  }
  let linkTarget = resolveLinkTarget(s, n);
  for (let j = 0; j < 8 && linkTarget !== null; j++) {
    if (r && classifyForeignMountKind(linkTarget, s) !== undefined) return null;
    let b;
    try {
      b = readlinkSync(linkTarget);
    } catch {
      return linkTarget;
    }
    try {
      s = realpathSync(dirname(linkTarget));
    } catch {
      return null;
    }
    linkTarget = resolveLinkTarget(s, b);
  }
  return null;
}
//@ chunk-fq0cr76a.js:928577-928629 placement
function realpathOrNull(literal) {
  try {
    return realpathSync(literal);
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:928629-928693 placement
function escapeBracketForGlob(e) {
  return getPlatform() === "windows" ? e : e.replaceAll("[", "[[]");
}
//@ chunk-fq0cr76a.js:928693-928779 placement
/**
 * 取 realpath；目标不存在时用父目录 realpath 拼上文件名；再失败原样返回。
 */
function realpathOrParentRealpath(e) {
  try {
    return realpathSync(e);
  } catch {
    try {
      return resolve(realpathSync(dirname(e)), basename(e));
    } catch {
      return e;
    }
  }
}
//@ chunk-fq0cr76a.js:928779-930116 placement
/**
 * macOS 下为拒绝条目补上真实路径"双胞胎"：展开 ~，对非通配路径（或允许时的通配基目录）解析真实路径与父目录真实路径，生成额外条目追加到列表，并缓存到适配器状态。
 */
function addRealPathDenyTwins(denyPaths, kind, realPathMemo, allowGlobBases) {
  if (getPlatform() !== "macos" || getSandboxAdapterState().realPathTwins === "off") return denyPaths;
  let walkMemo = createWalkMemo();
  let previous = getSandboxAdapterState().realPathsOfDenies[kind];
  let resolvedByDeny = new Map();
  let reportedCodes = new Set();
  let extraPaths = [];
  let scrubLiterals =
    kind === "write" ? getSandboxAdapterState().symlinkedDenyScrubPaths.map((index) => index.literal) : [];
  for (let [D, entry] of [...denyPaths, ...scrubLiterals].entries()) {
    let escaped = kind === "read" ? entry.replaceAll("[[]", "\x00") : entry;
    let replaced = (
      escaped === "~" || escaped.startsWith("~/") ? join(homedir(), escaped.slice(1)) : escaped
    ).replaceAll("\x00", "[");
    let matches = /[*?[]/.test(escaped);
    let baseDir = matches ? getGlobBaseDirectory_2(replaced) : replaced;
    if ((matches && (!allowGlobBases || D >= denyPaths.length)) || !isAbsolute(baseDir)) continue;
    let sliced = replaced.slice(baseDir.length);
    let ie = previous.get(replaced);
    let twins = ie ?? new Set();
    let parentReal;
    let failureCode;
    try {
      let selfReal = D < denyPaths.length ? resolveRealPathForDeny(baseDir, realPathMemo, walkMemo) : baseDir;
      let parentResolved =
        selfReal === Vd ? Vd : resolveRealPathForDeny(dirname(baseDir), realPathMemo, walkMemo);
      if (selfReal !== Vd && parentResolved !== Vd) {
        let ft = typeof selfReal === "string" || twins.size > 0 ? baseDir : resolveThroughLinks(baseDir);
        if (typeof selfReal !== "string" && ft === undefined) failureCode = selfReal.code;
        parentReal = typeof parentResolved === "string" ? parentResolved : undefined;
        if (typeof selfReal === "string" || twins.size === 0)
          twins = new Set(
            [
              typeof selfReal === "string" ? selfReal : typeof ft === "string" ? ft : baseDir,
              typeof parentResolved === "string" ? join(parentResolved, basename(baseDir)) : baseDir,
            ].filter((rt) => rt !== baseDir || D >= denyPaths.length),
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
    let me = `${kind} deny ${replaced}`;
    let Ne = [dirname(baseDir), parentReal ?? dirname(baseDir)];
    let finalTwins =
      twins === ie && parentReal === undefined
        ? twins
        : new Set([...twins].flatMap((twin) => toDenyTwinSpelling(twin, sliced, Ne, me) ?? []));
    resolvedByDeny.set(replaced, finalTwins);
    if (finalTwins.size > 0) getSandboxAdapterState().realPathTwins = "listed";
    for (let finalTwin of finalTwins) extraPaths.push(finalTwin + sliced);
  }
  getSandboxAdapterState().realPathsOfDenies[kind] = resolvedByDeny;
  return extraPaths.length === 0 ? denyPaths : denyPaths.concat(extraPaths);
}
//@ chunk-fq0cr76a.js:930116-930157 placement
var GLOB_UNSAFE_CHARS_RE = /[*?[\]"\\\0-\x1f\x7f]/g;
var MAX_TWIN_SPELLING_LENGTH = 900;
//@ chunk-fq0cr76a.js:930157-930692 placement
/**
 * 把拒绝条目的真实路径改写为可用的"双胞胎"写法；会覆盖到拒绝之上、无法拼写或过长时保留原写法并警告。
 */
function toDenyTwinSpelling(twin, n, r, s) {
  let replaced = twin.replace(GLOB_UNSAFE_CHARS_RE, "?");
  let fullPattern = replaced + n;
  let probe = /[*?[]/.test(fullPattern)
    ? fullPattern
        .replace(/[.^$+{}()|[\]]/g, "...")
        .replace(/[*?]/g, "?????")
        .replace(/["\\\0-\x1f\x7f\ud800-\udfff]/g, "xxxxxx")
    : fullPattern;
  let sliced = replaced.slice(0, replaced.lastIndexOf(sep, replaced.indexOf("?")) + 1);
  let skipReason = r.some((R) => join(R, sep).startsWith(join(twin, sep)))
    ? "above-the-deny"
    : replaced.includes("?") && !r.some((R) => sliced.startsWith(join(R, sep)))
      ? "covered-above-the-deny"
      : /\ufffd|__GLOBSTAR/.test(twin)
        ? "unspellable"
        : Buffer.byteLength(probe) > MAX_TWIN_SPELLING_LENGTH && "too-long";
  if (skipReason) {
    logForDebugging(`[sandbox] ${s} keeps its spelling (${skipReason})`, {
      level: "warn",
    });
    return;
  }
  return replaced;
}
//@ chunk-fq0cr76a.js:930692-930737 placement
var Vd = Object.freeze({
  code: "not-looked-at",
});
//@ chunk-fq0cr76a.js:930737-931669 placement
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
        ? Vd
        : {
            code: hostKind,
          };
    memo.set(path, result);
    return result;
  }
  let walk = rawPointerPathWalk(path, cwd, walkMemo);
  let stopKind = walk.unsafe ? (walk.stoppedAt?.kind ?? "link") : undefined;
  if (stopKind !== undefined && stopKind !== "special") {
    let O = {
      code: stopKind === "other" ? "unknown" : "not-vetted",
    };
    try {
      if (stopKind === "other") lstatSync(walk.stoppedAt?.path ?? path);
    } catch (errorCode) {
      O.code = getErrnoCode(errorCode) ?? O.code;
    }
    memo.set(path, O);
    return O;
  }
  let missingCount = walk.missingTail ?? 0;
  if (missingCount > 0) {
    let parts = path.split(sep);
    let L = parts.slice(0, -missingCount).join(sep) || sep;
    let parent = resolveRealPathForDeny(L, memo, walkMemo, depth + 1);
    let K = typeof parent === "string" ? join(parent, ...parts.slice(-missingCount)) : parent;
    memo.set(path, K);
    return K;
  }
  let resolved;
  try {
    resolved = realpathPlaceable(path);
  } catch (error) {
    let L = getErrnoCode(error) ?? "unknown";
    let V = dirname(path);
    if (!(L === "ENOENT" || L === "ENOTDIR") || V === path)
      resolved = {
        code: L,
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
        let realPathForDeny = resolveRealPathForDeny(V, memo, walkMemo, depth + 1);
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
//@ chunk-fq0cr76a.js:931669-932276 placement
/**
 * 手工逐段跟随符号链接解析路径（限跳数）；遇到主机共享路径返回特殊标记，无法解析返回 undefined。
 */
function resolveThroughLinks(baseDir) {
  let filtered = baseDir.split(sep).filter((h) => h !== "" && h !== ".");
  let current = sep;
  let sawLink = false;
  for (let h = 0, y = 0; h < filtered.length;) {
    let b = filtered[h] ?? "";
    if (b === "..") {
      current = dirname(current);
      h++;
      continue;
    }
    let candidate = join(current, b);
    let linkTarget;
    let errorCode;
    try {
      if (classifyForeignMountKind(candidate, getCwdState()) !== undefined) linkTarget = candidate;
      else linkTarget = readlinkSync(candidate);
    } catch (error) {
      errorCode = getErrnoCode(error) ?? "unknown";
    }
    let D = linkTarget === undefined ? undefined : classifyForeignMountKind(linkTarget, current);
    if (D !== undefined) return D === "host" ? Vd : undefined;
    if (errorCode === "ENOENT" || errorCode === "ENOTDIR")
      return sawLink ? join(candidate, ...filtered.slice(h + 1)) : undefined;
    if (errorCode !== undefined && errorCode !== "EINVAL")
      return sawLink && h === filtered.length - 1 ? candidate : undefined;
    if (linkTarget === undefined) {
      current = candidate;
      h++;
    } else if (++y > MAX_HOST_LABEL_COUNT) return;
    else {
      sawLink = true;
      let O = isAbsolute(linkTarget);
      filtered = [...linkTarget.split(sep).filter((L) => L !== "" && L !== "."), ...filtered.slice(h + 1)];
      current = O ? sep : current;
      h = 0;
    }
  }
  return sawLink ? current : undefined;
}
//@ chunk-fq0cr76a.js:932276-932363 placement
function classifyForeignMountKind(e, n) {
  if (!isOnForeignMount(e, n)) return;
  return isMacSpecialPath(e) || isMacSpecialPath(resolve(n, e)) ? "kernel-resolved" : "host";
}
//@ chunk-fq0cr76a.js:932363-932382 placement
var MAX_HOST_LABEL_COUNT = 32;
var MAX_HOST_NAME_LENGTH = 1024;
//@ chunk-fq0cr76a.js:932382-932594 placement
function resolveExistingPrefix(e) {
  let n = [];
  for (let r = e; ; r = dirname(r))
    try {
      let s = realpathPlaceable(r);
      return {
        path: n.length === 0 ? s : join(s, ...n),
        exists: n.length === 0,
      };
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if ((errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") || dirname(r) === r) return null;
      n.unshift(basename(r));
    }
}
//@ chunk-fq0cr76a.js:932594-932929 placement
/**
 * 求路径的真实位置：普通文件/目录直接 realpath；特殊文件解析其父目录；指向特殊文件的链接逐跳跟随，超过上限抛 ELOOP。
 */
function realpathPlaceable(e) {
  let n = e;
  for (let j = 0; ; j++) {
    let s = lstatSync(n);
    let h = s.isSymbolicLink() ? statSync(n) : s;
    if (h.isFile() || h.isDirectory()) return realpathSync(n);
    let y = dirname(n);
    if (!s.isSymbolicLink()) return join(realpathPlaceable(y), basename(n));
    let b = j < MAX_HOST_LABEL_COUNT ? resolveLinkTarget(realpathSync(y), readlinkSync(n)) : null;
    if (b === null)
      throw Object.assign(Error("ELOOP: a link chain onto a special file cannot be placed"), {
        code: "ELOOP",
      });
    n = b;
  }
}
//@ chunk-fq0cr76a.js:932929-932944 placement
var MAX_DENY_SCAN_BYTES = 8388608;
//@ chunk-fq0cr76a.js:932944-933598 placement
/**
 * 为遮罩/禁止扫描求路径的规范形式：逐级向上找到可 realpath 的祖先再拼回缺失尾段；遇到禁区或不安全链接停止解析并返回原样；可选回填 settled/stoppedAt/throughLink 状态。
 */
function canonicalizePathForMaskSweep(e, n, r) {
  if (n) {
    n.settled = false;
    n.stoppedAt = undefined;
    n.throughLink = false;
  }
  let s = [];
  let cwdState = getCwdState();
  let y = e;
  if (isOnForeignMount(y, cwdState)) return e;
  let b = rawPointerPathWalk(y, cwdState, r);
  if (n) {
    n.stoppedAt = b.stoppedAt;
    n.throughLink = b.throughLink;
  }
  if (b.unsafe) return e;
  if (b.missingTail !== null) {
    let w = e;
    for (let j = 0; j < b.missingTail; j++) {
      let D = dirname(w);
      if (D === w) break;
      s.push(basename(w));
      w = D;
      if (isOnForeignMount(w, cwdState)) return e;
    }
    try {
      let R = realpathSync(w);
      if (n) n.settled = s.length === 0;
      return s.length === 0 ? R : join(R, ...s.reverse());
    } catch {
      s.length = 0;
      if (n) n.stoppedAt = undefined;
    }
  }
  let S = b.missingTail === null;
  for (;;) {
    if (!S && (isOnForeignMount(y, cwdState) || rawPointerPathIsUnsafe(y, cwdState))) break;
    S = false;
    try {
      y = realpathSync(y);
      break;
    } catch {
      let w = dirname(y);
      if (w === y) break;
      s.push(basename(y));
      y = w;
    }
  }
  return s.length === 0 ? y : join(y, ...s.reverse());
}
//@ chunk-fq0cr76a.js:933598-933629 placement
var UNIX_DENY_PREFIX_ROOTS = ["/etc", "/tmp", "/var"];
//@ chunk-fq0cr76a.js:933629-933844 placement
function isOsLinkedRootAlias(e, n) {
  let { osLinkedRootRealpaths } = getProcessSandboxState();
  return UNIX_DENY_PREFIX_ROOTS.some((s) => {
    if (e !== s && !e.startsWith(s + sep)) return false;
    let h = osLinkedRootRealpaths.get(s);
    if (h === undefined) {
      try {
        h = realpathSync(s);
      } catch {
        h = s;
      }
      osLinkedRootRealpaths.set(s, h);
    }
    return h !== s && n === h + e.slice(s.length);
  });
}
//@ chunk-fq0cr76a.js:933844-934061 placement
function expandDenySymlink(e) {
  let n;
  try {
    n = readlinkSync(e);
  } catch {
    getSandboxAdapterState().denyLiteralSymlinkCandidates.push(e);
    return [e];
  }
  let r;
  try {
    r = realpathSync(e);
  } catch {
    r = followDanglingLink(e, n) ?? resolve(dirname(e), n);
    for (let j = 0; j < 8; j++) {
      let h;
      try {
        h = readlinkSync(r);
      } catch {
        break;
      }
      r = resolve(dirname(r), h);
    }
  }
  return [r, e];
}
//@ chunk-fq0cr76a.js:934061-934679 placement
/**
 * 逐段遍历路径，记录途中经过的所有符号链接（是否仍有效），遇到无法读取或不存在的段时返回缺失信息与落点。
 */
function traceSymlinkHops(e) {
  let links = [];
  let separatorPattern = getPlatform() === "windows" ? /[\\/]/ : "/";
  let root = parse(e).root;
  let parts = e.slice(root.length).split(sep);
  let y = [];
  while (y.length + parts.length > 0) {
    let segment = y.shift() ?? parts.shift() ?? "";
    if (segment === "..") root = dirname(root);
    else if (segment !== "" && segment !== ".") {
      let candidate = join(root, segment);
      let linkTarget;
      try {
        linkTarget = readlinkSync(candidate);
      } catch (error) {
        let errorCode = getErrnoCode(error);
        if (errorCode !== "EINVAL") {
          let landing = join(candidate, ...y, ...parts);
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
      let R = resolveExistingPrefix(candidate)?.exists === true;
      if ((!R && links.some((link) => link.path === candidate)) || links.length >= MAX_HOST_NAME_LENGTH)
        return {
          links,
          missing: null,
        };
      links.push({
        path: candidate,
        isLive: R,
      });
      let { root: root_2 } = parse(linkTarget);
      root = root_2 === "" ? root : root_2;
      y.unshift(...linkTarget.slice(root_2.length).split(separatorPattern));
    }
  }
  return {
    links,
    missing: null,
  };
}
//@ chunk-fq0cr76a.js:934679-934978 placement
function normalizeWindowsDirPath(e) {
  if (getPlatform() !== "windows") return e;
  let replaced = e.replace(/[\\/]+$/, "");
  let r = replaced;
  if (/^~(?:[\\/]|$)/.test(replaced))
    try {
      r = expandPath(replaced.replace(/^~\\/, "~/"));
    } catch {}
  let s = stripExtendedPathPrefix(r);
  if (replaced.length === 0 || /^[A-Za-z]:$/.test(s)) return e;
  if (/^[\\/]{2}/.test(s) || isWindowsDevicePath(r)) return replaced;
  try {
    if (!statSync(r).isDirectory()) return replaced;
  } catch {}
  return replaced + sep;
}
//@ chunk-fq0cr76a.js:934978-935046 placement
function normalizeDirEntryPattern(e, n) {
  return /[\\/]$/.test(e.trim()) && !containsGlobCharsWin(stripExtendedPathPrefix(n))
    ? normalizeWindowsDirPath(n)
    : n;
}
//@ chunk-fq0cr76a.js:935046-935087 placement = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  return resolve(filePath, ".claude", ATOMIC_WRITE_DIRNAME);
}
//@ chunk-fq0cr76a.js:935087-935255 placement = _temp8 (1)
function getAtomicWriteDirs(a_3 = true) {
  let n = new Set();
  n.add(isInGlobalClaudeFolder(getOriginalCwd()));
  if (a_3) n.add(isInGlobalClaudeFolder(getCwdState()));
  n.add(isInGlobalClaudeFolder(getProjectRoot()));
  n.add(resolve(getClaudeConfigDir(), ATOMIC_WRITE_DIRNAME));
  let settingsFilePathForSource = getSettingsFilePathForSource("localSettings");
  if (settingsFilePathForSource) n.add(join(dirname(settingsFilePathForSource), ATOMIC_WRITE_DIRNAME));
  return [...n];
}
//@ chunk-fq0cr76a.js:935255-935325 placement
function scrubBareGitRepoFiles(e) {
  mkdirSync(dirname(e), {
    recursive: true,
  });
  mkdirSync(e, {
    recursive: true,
    mode: 448,
  });
}
//@ chunk-fq0cr76a.js:935325-935464 placement
function isParentDirReal(e) {
  try {
    closeSync(openSync(dirname(e), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW));
    return true;
  } catch (error) {
    let errnoCode = getErrnoCode(error);
    return errnoCode !== "ELOOP" && errnoCode !== "ENOTDIR";
  }
}
//@ chunk-fq0cr76a.js:935464-935611 placement
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
//@ chunk-fq0cr76a.js:935611-936553 placement
/**
 * 确保原子写暂存目录存在且是真实目录（文件或坏目录会被删掉重建），并记录其 dev/ino 身份防止被替换；首次还会把 .claude/<暂存目录>/ 加进全局 gitignore。
 */
function ensureAtomicWriteStagingDirs() {
  for (let n of getAtomicWriteDirs(!isRemoteSessionAvailable())) {
    if (!isParentDirReal(n)) continue;
    let r = false;
    try {
      if (!lstatSync(n).isDirectory()) {
        if (!isParentDirReal(n)) continue;
        unlinkSync(n);
        scrubBareGitRepoFiles(n);
        r = true;
      } else
        try {
          closeSync(openSync(n, constants.O_RDONLY | constants.O_DIRECTORY));
          r = true;
        } catch {
          try {
            if (!isParentDirReal(n)) continue;
            rmdirSync(n);
            scrubBareGitRepoFiles(n);
            r = true;
          } catch {}
        }
    } catch {
      try {
        if (!isParentDirReal(n)) continue;
        scrubBareGitRepoFiles(n);
        r = true;
      } catch (error) {
        logForDebugging(`ensureAtomicWriteStagingDirs: failed to create ${n}: ${error}`);
        logFeatureSad("sandbox_exec", "atomic_write_staging_dir_create_failed");
      }
    }
    try {
      let s = openSync(n, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        let h = fstatSync(s);
        recordStagingDirIdentity(n, h.dev, h.ino, s);
      } catch (error) {
        closeSync(s);
        throw error;
      }
    } catch (error) {
      if (r)
        throwStagingTampered(
          `Staging dir ${n} was just established but identity-record open failed (${getErrnoCode(error) ?? error})`,
        );
    }
  }
  let processSandboxState = getProcessSandboxState();
  if (!processSandboxState.stagingDirGitignoreFired) {
    processSandboxState.stagingDirGitignoreFired = true;
    addFileGlobRuleToGitignore(`.claude/${ATOMIC_WRITE_DIRNAME}/`, getOriginalCwd()).then((n) => {
      if (!n.written) return;
      if (n.effective) logFeatureOk("gitignore_global_rule");
      else if (n.reason === "already_tracked") logFeatureSad("gitignore_global_rule", n.reason);
      else logFeatureBad("gitignore_global_rule", n.reason ?? "write_ineffective");
    });
  }
}
//@ chunk-fq0cr76a.js:936553-936584 placement
var TENGU_ENCHANTED_KITE = "tengu_enchanted_kite";
//@ chunk-fq0cr76a.js:936584-936806 placement
function classifyHeadEntry(e) {
  try {
    let n = lstatSync(e);
    if (n.isDirectory()) return "folder";
    if (!n.isSymbolicLink()) return "file_or_special";
  } catch {
    return "absent";
  }
  try {
    return /^refs[\\/]/.test(readlinkSync(e)) ? "link_to_refs" : "other_link";
  } catch {
    return "other_link";
  }
}
//@ chunk-fq0cr76a.js:936806-937033 placement
function classifyHeadState(e) {
  let n = classifyHeadEntry(e);
  switch (n) {
    case "file_or_special":
      return "head";
    case "folder":
    case "absent":
      return n;
    case "link_to_refs":
    case "other_link":
      try {
        statSync(e);
        return "head";
      } catch {
        return n === "link_to_refs" ? "dangling_head" : "absent";
      }
  }
}
//@ chunk-fq0cr76a.js:937033-937135 placement
function isHeadPresent(e) {
  switch (e) {
    case "head":
    case "dangling_head":
      return true;
    case "folder":
    case "absent":
      return false;
  }
}
//@ chunk-fq0cr76a.js:937135-937264 placement
function isFileOrRefsLink(e) {
  switch (e) {
    case "file_or_special":
    case "link_to_refs":
      return true;
    case "folder":
    case "other_link":
    case "absent":
      return false;
  }
}
//@ chunk-fq0cr76a.js:937264-987937 placement
/**
 * 把合并设置转成 sandbox-runtime 配置 {network:{allowedDomains,deniedDomains,unix socket/本地绑定/代理端口,tlsTerminate}, filesystem:{denyRead,allowRead,allowWrite,denyWrite,disabled?}, ignoreViolations, credentials, enableWeakerNestedSandbox, allowNestedUserNamespaces, enableWeakerNetworkIsolation, allowAppleEvents, git.safeDirectories, ripgrep, seccomp, bwrapPath, socatPath, windows?}。允许域名来自 sandbox.network.allowedDomains 与 WebFetch(domain:…) allow 规则（管理员强制/strictAllowlist 时只认可信层，allowManagedDomainsOnly 时只认托管层）；读禁止来自 Read(...) deny 规则、sandbox.filesystem.denyRead、credentials.files；写允许含 cwd、额外工作目录、Edit(...) allow 规则、临时目录，写禁止含 settings 文件、.claude 下 skills/agents/commands/hooks、.git/hooks 与 config、.mcp.json 等；relaxed 文件系统策略下置 disabled。构建失败抛 SandboxPathEntryError。
 */
function convertToSandboxRuntimeConfig(settings) {
  let adapterState = getSandboxAdapterState();
  adapterState.scrubParentMemo.clear();
  let permissionsSettings = settings.permissions || {};
  let managedSources = getAllPolicyTierSettings();
  let evalConfinedEnv = env.CLAUDE_CODE_EVAL_CONFINED;
  let y = (j) => !evalConfinedEnv || (j === "userSettings" && isSettingSourceEnabled("userSettings"));
  let managedDomainsOnly = managedSources.some(
    (managedSource) => managedSource.sandbox?.network?.allowManagedDomainsOnly === true,
  );
  let managedReadPathsOnly = managedSources.some(
    (managedSource) => managedSource.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
  );
  let adminMandate = isAdminSandboxMandate();
  let R = isStrictNetworkAllowlistConfigured();
  let D = adminMandate || R;
  let O = adminMandate || hasTrustedReadDenies();
  let L = O ? getTrustedReadDenyRoots() : undefined;
  let V;
  let K;
  let q = () => {
    if (V === undefined)
      if (L) {
        let trustedReadDenyRoots = resolveTrustedReadDenyRoots(L);
        V = trustedReadDenyRoots.roots;
        K = trustedReadDenyRoots.resolution;
      } else V = getBuiltinTrustedDenyRoots();
    return V;
  };
  let allowedDomains = [];
  let deniedDomains = [];
  if (managedDomainsOnly && evalConfinedEnv);
  else if (evalConfinedEnv) {
    if (isSettingSourceEnabled("userSettings"))
      for (let j of getSettingsForSource("userSettings")?.sandbox?.network?.allowedDomains ?? [])
        allowedDomains.push(j);
  } else if (managedDomainsOnly)
    for (let managedSource of managedSources) {
      for (let ce of managedSource.sandbox?.network?.allowedDomains || []) allowedDomains.push(ce);
      for (let ce of managedSource.permissions?.allow || []) {
        let ruleForSandbox = parseRuleForSandbox(ce);
        if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
          allowedDomains.push(ruleForSandbox.ruleContent.substring(7));
      }
    }
  else {
    for (let j of D
      ? collectFromSandboxSettings((ce) => ce.network?.allowedDomains)
      : settings.sandbox?.network?.allowedDomains || [])
      allowedDomains.push(j);
    for (let j of D ? collectAllowRules() : permissionsSettings.allow || []) {
      let ruleForSandbox = parseRuleForSandbox(j);
      if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
        allowedDomains.push(ruleForSandbox.ruleContent.substring(7));
    }
    if (D && !adapterState.droppedRepoAllowedDomainsLogged) {
      adapterState.droppedRepoAllowedDomainsLogged = true;
      let reduced = ["projectSettings", "localSettings"]
        .map((ce) => (isSettingSourceEnabled(ce) ? getSettingsForSource(ce) : null))
        .reduce(
          (acc, Ee) =>
            acc +
            (Ee?.sandbox?.network?.allowedDomains?.length ?? 0) +
            count(Ee?.permissions?.allow ?? [], (We) => {
              let ruleForSandbox = parseRuleForSandbox(We);
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
  for (let j of settings.sandbox?.network?.deniedDomains || []) deniedDomains.push(j);
  for (let j of permissionsSettings.deny || []) {
    let ruleForSandbox = parseRuleForSandbox(j);
    if (ruleForSandbox.toolName === WEBFETCH && ruleForSandbox.ruleContent?.startsWith("domain:"))
      deniedDomains.push(ruleForSandbox.ruleContent.substring(7));
  }
  let ie = {};
  let ae;
  for (let j = deniedDomains.length - 1; j >= 0; j--) {
    let ce = deniedDomains[j];
    if (ce === undefined) continue;
    let Ee = addTrailingDotFreeVariants(expandBareIpv6Hosts([ce]));
    if (Ee.length === 1 && Ee[0] === ce) continue;
    deniedDomains.splice(j, 1, ...Ee);
    let We = ie[ce];
    if (We !== undefined) {
      delete ie[ce];
      for (let tt of Ee) ie[tt] = We;
    }
  }
  allowedDomains.splice(0, allowedDomains.length, ...normalizeIpv6HostEntries(allowedDomains));
  let Se = evalConfinedEnv ? [getClaudeTempDirRealpath()] : [".", getClaudeTempDirRealpath()];
  let childProcessTmpDirRealpath = getChildProcessTmpDirRealpath();
  if (childProcessTmpDirRealpath !== getClaudeTempDirRealpath()) Se.push(childProcessTmpDirRealpath);
  let me = [...Se];
  let denyPaths = [];
  let Ce = (j, ce, Ee = false) => {
    let We = ce ? [resolveDenySymlink(j)] : expandDenySymlink(j);
    denyPaths.push(...(Ee ? We.map(normalizeWindowsDirPath) : We));
  };
  let denyPaths_2 = [];
  let he = [];
  adapterState.symlinkedDenyScrubPaths.length = 0;
  adapterState.denyLiteralSymlinkCandidates.length = 0;
  let filtered = SETTING_SOURCES.map((j) => getSettingsFilePathForSource(j)).filter((j) => j !== undefined);
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
  let cwdState = getCwdState();
  let originalCwd = getOriginalCwd();
  let Ae = !isRemoteSessionAvailable();
  if (!Ae) getSandboxAdapterState().builtAsThinClient = true;
  if (cwdState !== originalCwd) {
    denyPaths.push(resolveDenySymlink(resolve(cwdState, ".claude", "settings.json")));
    denyPaths.push(resolveDenySymlink(resolve(cwdState, ".claude", "settings.local.json")));
  }
  Ce(resolve(originalCwd, ".claude", "skills"), true, true);
  if (cwdState !== originalCwd) Ce(resolve(cwdState, ".claude", "skills"), true, true);
  Ce(resolve(originalCwd, ".claude", "hooks"), true, true);
  if (cwdState !== originalCwd) Ce(resolve(cwdState, ".claude", "hooks"), true, true);
  denyPaths.push(normalizeWindowsDirPath(resolve(getClaudeConfigDir(), "local")));
  denyPaths.push(...getAtomicWriteDirs().map(normalizeWindowsDirPath));
  Ce(resolve(getClaudeConfigDir(), "jobs"), true, true);
  let dt = resolve(getClaudeConfigDir(), "seed-admin");
  try {
    mkdirSync(dt, {
      recursive: true,
      mode: 448,
    });
  } catch {}
  Ce(dt, false, true);
  denyPaths_2.push(normalizeWindowsDirPath(escapeBracketForGlob(realpathOrParentRealpath(dt))));
  Ce(resolve(getClaudeConfigDir(), "daemon"), true, true);
  Ce(bridgeSpawnDir(), true, true);
  denyPaths_2.push(normalizeWindowsDirPath(realpathOrParentRealpath(bridgeSpawnDir())));
  let bashEditDiffDir = getBashEditDiffDir();
  try {
    mkdirSync(bashEditDiffDir, {
      recursive: true,
      mode: 448,
    });
  } catch {}
  Ce(bashEditDiffDir, false, true);
  denyPaths_2.push(normalizeWindowsDirPath(bashEditDiffDir));
  let Ft = [
    signatureFileFor("policy-limits.json"),
    signatureIatFileFor("policy-limits.json"),
    stampPathFor("policy-limits.json"),
  ];
  let xn = new Set([
    "scheduled_tasks.json",
    "launch.json",
    "CLAUDE.md",
    "daemon.json",
    "policy-limits.json",
    ...Ft,
  ]);
  for (let j of [
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
    ...Ft,
    "backups",
  ]) {
    let denySymlink = resolveDenySymlink(resolve(getClaudeConfigDir(), j));
    denyPaths.push(xn.has(j) ? denySymlink : normalizeWindowsDirPath(denySymlink));
  }
  Ce(resolve(getClaudeConfigDir(), "loop.md"), false);
  let mt = resolve(getClaudeConfigDir(), "cowork_plugins");
  Ce(mt, false, true);
  let Mt = resolve(devModsDir());
  let mn = resolve(getClaudeConfigDir());
  let existingPrefix = resolveExistingPrefix(mn);
  let Wt = existingPrefix?.path ?? realpathOrParentRealpath(mn);
  let gt = join(Wt, basename(Mt));
  let jt = adapterState.devModsRoots.get(mn);
  if (jt === undefined) {
    jt = {
      made: null,
      denied: new Set(),
    };
    adapterState.devModsRoots.set(mn, jt);
  }
  if ((jt.made === null || jt.made === gt) && ensurePrivateDirChain(Wt, gt, PERSON_ROOT_OPTIONS))
    jt.made = gt;
  else if (jt.made === null && existingPrefix?.exists === true)
    logForDebugging(
      `[sandbox] the dev-mods root is not a plain directory under the config home; denied as it stands: ${Mt}`,
      {
        level: "warn",
      },
    );
  jt.denied.add(gt);
  let Xe = traceSymlinkHops(Mt);
  let filtered_2 = Xe.links.filter((link) => !link.isLive);
  for (let j of uniq([
    ...jt.denied,
    Mt,
    ...filtered_2.map((ce) => ce.path),
    ...(Xe.missing === null ? [] : [Xe.missing.name, Xe.missing.landing]),
  ]))
    Ce(j, false, true);
  let Je = peekTaskOutputDir();
  if (ensurePrivateDirChain(getClaudeTempDirRealpath(), Je)) {
    Ce(Je, false, true);
    taskOutputDirChainRoot = Je;
  } else {
    taskOutputDirChainRoot = undefined;
    logForDebugging(
      `[sandbox] task output dir chain is not plain directories; read-only deny skipped: ${Je}`,
      {
        level: "warn",
      },
    );
    logFeatureSad("sandbox_exec", "task_output_deny_skipped");
  }
  let vt = isPluginToolStagingDenyEnabled();
  mcpCallTempRoot = undefined;
  if (vt && getPlatform() !== "windows") {
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
    Ce(mcpCallTempRoot, false, true);
  }
  let Lt = projectPluginsDir();
  if (Lt !== resolve(getClaudeConfigDir(), "plugins") && Lt !== mt && !isWithinOriginalCwd(Lt))
    Ce(Lt, false, true);
  for (let j of getPluginSeedDirs()) {
    let ce = resolve(getOriginalCwd(), j);
    if (!isWithinOriginalCwd(ce)) Ce(ce, false, true);
  }
  for (let j of updateDeniedProducerDirs(pluginRootDirs()))
    if (isAbsolute(j) && !isWithinOriginalCwd(resolve(j))) Ce(resolve(j), false, true);
  for (let j of commandProducerDirs()) if (!isWithinOriginalCwd(j)) Ce(j, false, true);
  let ln = helperConfigPath();
  let Zt = new Set(
    [
      ...(isAdminPolicyOrigin(getBasePolicySettingsOrigin())
        ? policyHelperPaths(getBasePolicySettings())
        : []),
      ...(ln === null ? [] : [ln]),
      ...retiredHelperPaths(),
    ]
      .filter((j) => !isWindowsDevicePath(j) && !isNetworkOrMacSpecialPath(j))
      .map((j) => resolve(j)),
  );
  for (let j of Zt) {
    if (isWithinOriginalCwd(j)) continue;
    if (getPlatform() === "windows")
      try {
        lstatSync(j);
      } catch (error) {
        if (isFsInaccessible(error)) continue;
      }
    Ce(j, false);
  }
  for (let j of ["mcp-skill-archives", "mcp-discovery-cache", "shares"])
    Ce(resolve(getClaudeConfigDir(), j), false, true);
  for (let j of HOST_FUNCTION_CATEGORIES) Ce(resolve(getClaudeConfigDir(), j), false, true);
  for (let j of ["remote-settings-helper-consent", "remote-settings-consent.json"])
    Ce(resolve(getClaudeConfigDir(), j), false);
  let mockRemoteSettingsFixturePath = getMockRemoteSettingsFixturePath();
  let zr = mockRemoteSettingsFixturePath !== undefined ? resolve(mockRemoteSettingsFixturePath) : undefined;
  for (let j of new Set([
    resolve(getClaudeConfigDir(), "remote-settings.json"),
    resolve(getSettingsPath()),
    ...(zr !== undefined ? [zr] : []),
  ])) {
    let ce = false;
    let Ee = false;
    try {
      let We = lstatSync(j);
      ce = We.isCharacterDevice();
      Ee = We.isSymbolicLink() && statSync(j).isCharacterDevice();
    } catch {}
    if (Ee) denyPaths.push(j);
    else if (!ce) Ce(j, false);
    if (j !== zr) {
      Ce(signatureFileFor(j), false);
      Ce(signatureIatFileFor(j), false);
      Ce(syncStampPath(j), false);
    }
  }
  Ce(resolve(getClaudeConfigDir(), "state"), false, true);
  let Pa = resolve(homedir(), ".claude", "state");
  if (Pa !== resolve(getClaudeConfigDir(), "state")) Ce(Pa, false, true);
  let Uc = isSshStoreWriteDenyEnabled();
  if (Uc) {
    let j = resolve(homedir(), SHADOWED_SSH_DIR);
    if (getPlatform() !== "windows")
      try {
        mkdirSync(j, {
          recursive: true,
          mode: 448,
        });
      } catch {}
    Ce(j, false, true);
  }
  for (let j of claudeStateFilePaths()) denyPaths.push(resolveDenySymlink(resolve(j)));
  let wifProfileStoreDenyPaths = getWIFProfileStoreDenyPaths();
  if (wifProfileStoreDenyPaths !== null) {
    for (let dir of wifProfileStoreDenyPaths.dirs) {
      try {
        mkdirSync(dir, {
          recursive: true,
          mode: 448,
        });
      } catch {}
      Ce(dir, false, true);
    }
    for (let file of wifProfileStoreDenyPaths.files) Ce(file, false);
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
    let j = new Set();
    for (let ce of getIdeLockfilesPaths()) {
      let Ee = resolve(ce);
      try {
        Ee = realpathSync(Ee);
      } catch {}
      if (j.has(Ee)) continue;
      j.add(Ee);
      denyPaths_2.push(normalizeWindowsDirPath(Ee));
      denyPaths.push(normalizeWindowsDirPath(Ee));
    }
  }
  let La = (j, ce = true) => {
    Ce(resolve(j, ".claude", "launch.json"), ce);
    Ce(resolve(j, ".claude", "workflows"), ce, true);
    Ce(resolve(j, ".claude", "routines"), ce, true);
    Ce(resolve(j, ".claude", "output-styles"), false, true);
    Ce(resolve(j, ".claude", "scheduled_tasks.json"), ce);
    Ce(resolve(j, ".claude", "loop.md"), false);
    Ce(resolve(j, ".mcp.json"), false);
  };
  La(originalCwd);
  {
    let j = resolve(homedir());
    let ce = nativeRealpathLong(j) ?? j;
    let Ee = ce;
    let We =
      normalizePathForCompare(ce) === normalizePathForCompare(j) &&
      normalizePathForCompare(Ee) === normalizePathForCompare(resolve(homedir()).normalize("NFC"));
    let tt = (Ct) => {
      La(Ct, false);
      Ce(resolve(Ct, ".claude", "skills"), false, true);
      Ce(resolve(Ct, ".claude", "commands"), false, true);
      Ce(resolve(Ct, ".claude", "agents"), false, true);
      Ce(resolve(Ct, ".claude", "hooks"), false, true);
      Ce(resolve(Ct, ".claude", "settings.json"), false);
      Ce(resolve(Ct, ".claude", "settings.local.json"), false);
    };
    let bt = [getProjectRoot()];
    let projectConfigRoot = getProjectConfigRoot();
    if (projectConfigRoot !== null) bt.push(projectConfigRoot);
    let je = false;
    for (let Ct of bt) {
      let Qe = Ct;
      for (;;) {
        tt(Qe);
        if (normalizePathForCompare(Qe) === normalizePathForCompare(Ee)) {
          je = true;
          if (We) break;
        }
        let Bt = dirname(Qe);
        if (Bt === Qe) break;
        Qe = Bt;
      }
    }
    let kt = (Ct) => {
      let Qe = Ct;
      for (;;) {
        Ce(resolve(Qe, ".mcp.json"), false);
        let Bt = dirname(Qe);
        if (Bt === Qe) break;
        Qe = Bt;
      }
    };
    for (let Ct of bt) kt(Ct);
    if (!je) {
      tt(Ee);
      kt(Ee);
    }
    let gitRoot = findGitRoot(getProjectRoot());
    let canonicalGitRoot = findCanonicalGitRoot(getProjectRoot());
    if (
      gitRoot &&
      canonicalGitRoot &&
      normalizePathForCompare(canonicalGitRoot) !== normalizePathForCompare(gitRoot)
    )
      tt(canonicalGitRoot);
  }
  if (cwdState !== originalCwd) {
    let j = originalCwd.endsWith(sep) ? originalCwd : originalCwd + sep;
    let ce = cwdState;
    while (ce !== originalCwd) {
      La(ce);
      let Ee = dirname(ce);
      if (Ee === ce || !(Ee + sep).startsWith(j)) break;
      ce = Ee;
    }
  }
  denyPaths.push(resolve(originalCwd, ".mcp.json"));
  if (cwdState !== originalCwd) {
    let j = originalCwd.endsWith(sep) ? originalCwd : originalCwd + sep;
    let ce = cwdState;
    while (ce !== originalCwd) {
      denyPaths.push(resolve(ce, ".mcp.json"));
      let Ee = dirname(ce);
      if (Ee === ce || !(Ee + sep).startsWith(j)) break;
      ce = Ee;
    }
  }
  let worktreeGitCommonDir = detectWorktreeGitCommonDir(originalCwd);
  let Fc = [join(findGitRoot(originalCwd) ?? originalCwd, ".git"), worktreeGitCommonDir];
  adapterState.bareGitRepoScrubPaths.clear();
  let qi = Ae ? null : new Set();
  adapterState.bareGitRepoScrubPathsVouchedLocally = qi;
  let wi = (j, ce, removal, error) => {
    registerBareRepoScrubPath(adapterState, j, removal, error);
    if (!ce) qi?.add(j);
  };
  let ze = (j, ce, Ee, We) => wi(j, ce, Ee, We);
  let cwd = process.cwd();
  let gn = /(?:\/\*\*|\/)+$/;
  let vn = (j) => {
    try {
      return [expandPath(j, cwd).replace(gn, "") || sep];
    } catch (error) {
      warnDroppedPathEntry(error, "additionalDirectories");
      return [];
    }
  };
  let pr = new Set(
    [
      ...(evalConfinedEnv ? [] : settings.permissions?.additionalDirectories || []),
      ...getAdditionalDirectoriesForClaudeMd(),
    ].flatMap(vn),
  );
  let dr = ["objects", "refs"];
  let Ti = ["hooks", "config"];
  let $s = getPlatform() === "macos";
  let Ba = isUnlistableWorktreesDenyEnabled();
  let po = getPlatform() === "windows";
  let jl = getPlatform() === "linux" || getPlatform() === "wsl";
  let Mc =
    jl &&
    readFlagWithOverride(TENGU_ENCHANTED_KITE, {
      safe: true,
    });
  let Ua = [];
  let Fa = (...j) => {
    if (!jl) return;
    if (isRemoteSessionAvailable()) {
      Ua.push(j);
      return;
    }
    createFileAtChain(...j);
  };
  let $c = new Set();
  let ho = (j, ce) => {
    if ($c.has(j)) return;
    $c.add(j);
    let Ee = ce && !Fc.includes(j);
    let We = (je) => {
      if (po && je.endsWith(".lock")) {
        wi(je, Ee, "all");
        return;
      }
      try {
        statSync(je);
        denyPaths.push(resolveDenySymlink(je));
      } catch (error) {
        wi(je, Ee, "all", error);
        if ($s) denyPaths.push(je);
      }
    };
    Ce(join(j, "hooks"), true, true);
    denyPaths.push(resolveDenySymlink(join(j, "config")));
    if (po) wi(join(j, "config.lock"), Ee, "all");
    else denyPaths.push(resolveDenySymlink(join(j, "config.lock")));
    let tt = join(j, "config.worktree");
    Fa(j, "config.worktree");
    denyPaths.push(resolveDenySymlink(tt));
    We(join(j, "config.worktree.lock"));
    We(join(j, "commondir"));
    let bt =
      Mc &&
      isDirectoryNoFollow(j) &&
      isDirectoryNoFollow(join(j, "objects")) &&
      isDirectoryNoFollow(join(j, "objects", "info"));
    for (let je of ["alternates", "http-alternates"]) {
      let kt = join(j, "objects", "info", je);
      if (je === "alternates" && bt) {
        Fa(j, "objects", "info", je);
        denyPaths.push(...expandDenySymlink(kt));
        continue;
      }
      try {
        lstatSync(kt);
        denyPaths.push(...expandDenySymlink(kt));
      } catch (error) {
        if ($s || getErrnoCode(error) !== "ENOENT") denyPaths.push(...expandDenySymlink(kt));
      }
    }
    let xt = join(j, "worktrees");
    try {
      for (let je of readdirSync(xt, {
        withFileTypes: true,
      })) {
        if (!je.isDirectory() && !je.isSymbolicLink()) continue;
        let kt = join(xt, je.name, "config.worktree");
        Fa(j, "worktrees", je.name, "config.worktree");
        denyPaths.push(resolveDenySymlink(kt));
        We(join(xt, je.name, "config.worktree.lock"));
        denyPaths.push(resolveDenySymlink(join(xt, je.name, "commondir")));
      }
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      let Xt =
        errnoCode === "ENOENT" ||
        errnoCode === "ENOTDIR" ||
        errnoCode === "ELOOP" ||
        errnoCode === "ENAMETOOLONG";
      let Dt = !Xt && Ba && getPlatform() !== "windows";
      if (Dt) Ce(xt, false, true);
      if (errnoCode === "ELOOP" || errnoCode === "ENAMETOOLONG")
        logForDebugging(
          `[Sandbox] cannot list ${xt} (${errnoCode}: a link loop or a path too long); treated as no folder, so there are no linked worktrees under it to protect. If it is a link you did not create, remove it.`,
          {
            level: "warn",
          },
        );
      else if (!Xt)
        logForDebugging(
          `[Sandbox] cannot list ${xt} (${errnoCode ?? errorMessage(error)}); ${Dt ? "sandboxed commands cannot write under it until it can be listed again and the sandbox config is rebuilt (restarting Claude Code does this)" : `not write-denying it ${getPlatform() === "windows" ? "on Windows, where the deny would stay in the folder's permissions after the listing works again" : "because this protection is switched off"}. Until it can be listed again and the sandbox config is rebuilt (restarting Claude Code does this), sandboxed commands can change its linked worktrees' commondir and config.worktree files`}.`,
          {
            level: "warn",
          },
        );
    }
  };
  let wn = (j) => {};
  let In = new Set([originalCwd, cwdState]);
  for (let j of [originalCwd, ...pr]) {
    let ce = j.endsWith(sep) ? j : j + sep;
    if ((cwdState + sep).startsWith(ce)) {
      let Ee = cwdState;
      for (;;) {
        In.add(Ee);
        if (Ee === j) break;
        let We = dirname(Ee);
        if (We === Ee || !(We + sep).startsWith(ce)) break;
        Ee = We;
      }
    }
  }
  let featureValue_CACHED_MAY_BE_STALE = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mighty_thimble", true);
  let sn = (j, ce) => {
    let Ee;
    try {
      Ee = lstatSync(j);
    } catch (error) {
      return {
        present: false,
        probe: error,
      };
    }
    if (Ee.isFile()) denyPaths.push(j);
    else if (Ee.isDirectory()) ho(j, ce);
    else
      try {
        if (statSync(j).isDirectory()) ho(j, ce);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && featureValue_CACHED_MAY_BE_STALE)
          denyPaths.push(j);
      }
    return {
      present: true,
    };
  };
  for (let j of In) {
    let ce = j !== originalCwd;
    let Ee = resolve(j, "HEAD");
    let We = classifyHeadState(Ee);
    let tt = isHeadPresent(We);
    let bt = We === "head";
    switch (We) {
      case "head":
        denyPaths.push(Ee);
        break;
      case "folder":
        ze(Ee, ce, "file");
        denyPaths.push(Ee);
        break;
      case "dangling_head":
      case "absent":
        ze(Ee, ce, "file_or_empty_folder", checkPathAbsent(Ee));
        if ($s) denyPaths.push(Ee);
        break;
      default:
    }
    for (let kt of dr) {
      let Xt = resolve(j, kt);
      try {
        statSync(Xt);
        denyPaths.push(Xt);
      } catch (error) {
        bt = false;
        wi(Xt, ce, tt ? "all" : "all_if_a_head_survives", error);
        if ($s) denyPaths.push(Xt);
      }
    }
    if (bt) ho(j, ce);
    for (let kt of Ti) {
      let Xt = resolve(j, kt);
      try {
        let Dt = statSync(Xt);
        let Ct = kt === "config" && Dt.isFile();
        if (!tt && !Ct) {
          if (!lstatSync(Xt).isDirectory()) continue;
          let Qe = join(Xt, ".git");
          try {
            let Bt = lstatSync(Qe);
            if (Bt.isFile() || Bt.isDirectory()) {
              denyPaths.push(Qe);
              continue;
            }
          } catch (error) {
            let errnoCode = getErrnoCode(error);
            if (errnoCode === "ENOENT" || errnoCode === "ENOTDIR") continue;
          }
        }
        denyPaths.push(Xt);
        if (Ct)
          if (po) wi(resolve(j, "config.lock"), ce, "all");
          else denyPaths.push(resolve(j, "config.lock"));
      } catch {}
    }
    let xt = resolve(j, ".git");
    let je = sn(xt, ce);
    if (!je.present) {
      ze(xt, ce, "file_or_empty_folder", je.probe);
      if ($s) denyPaths.push(xt);
    }
    wn(j);
  }
  let Kn = new Set([...In].map((j) => identity(resolve(j))));
  for (let j of new Set([originalCwd, cwdState])) {
    let gitRoot = findGitRoot(j);
    if (gitRoot !== null && !Kn.has(gitRoot)) sn(join(gitRoot, ".git"), j !== originalCwd);
  }
  let Cr = new Map();
  let Rs = (j, ce = true, worktreeGitCommonDir = detectWorktreeGitCommonDir(j)) => {
    if (worktreeGitCommonDir && worktreeGitCommonDir !== cwdState && !Se.includes(worktreeGitCommonDir)) {
      if (ce) {
        Se.push(worktreeGitCommonDir);
        me.push(worktreeGitCommonDir);
        Cr.set(j, worktreeGitCommonDir);
      } else logEvent("tengu_sandbox_remote_cwd_grant_withheld", {});
      ho(worktreeGitCommonDir, !ce);
    }
  };
  Rs(originalCwd, true, worktreeGitCommonDir);
  if (cwdState !== originalCwd) Rs(cwdState, Ae);
  let Ma;
  if (getPlatform() === "macos") {
    Ma = isNestedGitConfigLockDenyEnabled();
    if (Ma && !/[*?]/.test(cwd)) {
      let j = join(escapeBracketForGlob(cwd), "**", ".[gG][iI][tT]");
      for (let ce of ["[fF][iI]", "\uFB01", "[fF]\u0131"])
        for (let Ee of ["[kK]", "\u212A"]) denyPaths.push(join(j, `[cC][oO][nN]${ce}[gG].[lL][oO][cC]${Ee}`));
    }
  }
  Se.push(...pr);
  for (let j of pr) wn(j);
  for (let j of pr)
    try {
      let ce = resolve(j, ".mcp.json");
      if (getPlatform() === "macos") {
        Ce(ce, false);
        try {
          let tt = realpathSync(j);
          if (tt !== j) Ce(resolve(tt, ".mcp.json"), false);
        } catch {}
        continue;
      }
      if (realpathSync(j) !== j) continue;
      let Ee = denyPaths.length;
      Ce(ce, false);
      let found = denyPaths.slice(0, Ee).find((tt) => posixCovers(tt, j));
      if (found !== undefined && denyPaths.slice(Ee).every((tt) => posixCovers(found, tt)))
        denyPaths.splice(denyPaths.indexOf(found), 0, ...denyPaths.splice(Ee));
    } catch {
      continue;
    }
  let $a = [];
  for (let runtimeAllowWriteDirectory of adapterState.runtimeAllowWriteDirectories.values()) {
    let ce = stripTrailingSlash(runtimeAllowWriteDirectory);
    let Ee = isDirectoryNoFollow(ce);
    if (Ee) {
      $a.push(ce);
      Se.push(ce);
      me.push(ce);
    }
    denyPaths.push(resolveDenySymlink(resolve(ce, ".claude", "settings.json")));
    denyPaths.push(resolveDenySymlink(resolve(ce, ".claude", "settings.local.json")));
    for (let tt of ["skills", "agents", "commands", "hooks"]) Ce(resolve(ce, ".claude", tt), true, true);
    La(ce);
    let We = resolve(ce, ".git");
    if (!Ee) {
      denyPaths.push(We);
      continue;
    }
    try {
      let tt = lstatSync(We);
      if (tt.isFile()) denyPaths.push(We);
      else if (tt.isDirectory()) ho(We, false);
      else
        try {
          if (statSync(We).isDirectory()) ho(We, false);
        } catch (error) {
          let errnoCode = getErrnoCode(error);
          if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR" && featureValue_CACHED_MAY_BE_STALE)
            denyPaths.push(We);
        }
    } catch (error) {
      let errnoCode = getErrnoCode(error);
      if (errnoCode !== "ENOENT" && errnoCode !== "ENOTDIR") denyPaths.push(We);
    }
    wn(ce);
    Rs(ce);
  }
  let qd = new Set();
  let jd = new Set();
  let Vc = false;
  let sh = false;
  let Yd = [];
  let ih = [];
  let ra = [];
  let Wc = 0;
  let Gc = 0;
  let Hc = 0;
  let oh = [];
  let Va = new Set(getAdditionalDirectoriesForClaudeMd().flatMap(vn));
  let Zd = new Set(isNotBackgroundSession() ? Va : []);
  let Yl = new Set(Va);
  let hb = repoResidentSettingSources();
  let ah = [];
  let lh = [];
  for (let j of SETTING_SOURCES) {
    let ce = isTrustedTierSource(j);
    if (!isSettingSourceEnabled(j) || (!ce && O)) continue;
    let Ee = ce ? ah : lh;
    let settingsForSource = getSettingsForSource(j);
    for (let tt of evalConfinedEnv ? [] : (settingsForSource?.permissions?.additionalDirectories ?? []))
      try {
        Ee.push(expandPath(tt, cwd));
      } catch {}
    for (let tt of [
      ...(y(j) && !managedReadPathsOnly ? (settingsForSource?.sandbox?.filesystem?.allowRead ?? []) : []),
      ...(y(j) ? (settingsForSource?.sandbox?.filesystem?.allowWrite ?? []) : []),
      ...(j === "policySettings" && managedReadPathsOnly && !evalConfinedEnv
        ? managedSources.flatMap((managedSource) => managedSource.sandbox?.filesystem?.allowRead ?? [])
        : []),
    ])
      try {
        Ee.push(resolveSandboxFilesystemPath(tt, j));
      } catch {}
    for (let tt of evalConfinedEnv
      ? []
      : (groupRuleContentsByTool(settingsForSource?.permissions?.allow, [FILE_EDIT_TOOL_NAME]).get(
          FILE_EDIT_TOOL_NAME,
        ) ?? []))
      try {
        Ee.push(resolvePathPatternForSandbox(tt, j));
      } catch {}
  }
  let mb = false;
  let gb = new Set();
  let yb = new Set();
  let context = {
    sharesReach: getPlatform() === "windows",
    prepared: "no",
    automounter: "none",
    automountPoints: [],
    ownPlaces: [getCwdState(), getOriginalCwd(), homedir(), ...Va],
    grantedPlaces: ah,
    repositoryGrantedPlaces: lh,
    placesOfVouched: [],
    grantsOfVouched: [],
    trustsWriter: false,
    linkTexts: new Map(),
    fixedFolders: new Map(),
    dropped: new Set(),
    saidBefore: new Set(adapterState.deniesDroppedForAnotherHost),
  };
  for (let j of SETTING_SOURCES) {
    if (!isSettingSourceEnabled(j)) {
      let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(j);
      if (settingsForSourceTightenOnly?.permissions || settingsForSourceTightenOnly?.sandbox?.filesystem)
        logForDebugging(
          `Sandbox: ignoring permission rules and sandbox.filesystem entries from disabled setting source ${j}`,
          {
            level: "info",
          },
        );
      continue;
    }
    let settingsForSource = getSettingsForSource(j);
    let Ee = isRepoSettingSource(j);
    let included = hb.includes(j);
    let tt = Ee || (j === "policySettings" && !isPolicySlotAdminOrParentComposed());
    let bt = adminMandate && tt;
    let xt = included || bt;
    if (settingsForSource?.permissions) {
      if (settingsForSource.permissions.blockReadsOutsideWorkingDirectories === true) {
        Vc = true;
        sh ||= !included;
      }
      if (!included && !evalConfinedEnv)
        for (let Bt of settingsForSource.permissions.additionalDirectories || [])
          for (let qr of vn(Bt)) {
            Va.add(qr);
            if (!tt) Yl.add(qr);
            if (isUserTierSource(j)) Zd.add(qr);
          }
    }
    let filesystem = settingsForSource?.sandbox?.filesystem;
    let kt = evalConfinedEnv
      ? []
      : (groupRuleContentsByTool(settingsForSource?.permissions?.allow, [FILE_EDIT_TOOL_NAME]).get(
          FILE_EDIT_TOOL_NAME,
        ) ?? []);
    let allowWrite = y(j) ? filesystem?.allowWrite : undefined;
    let Dt = managedReadPathsOnly || !y(j) ? [] : (filesystem?.allowRead ?? []);
    if (bt) Wc += kt.length + (filesystem?.allowWrite?.length ?? 0);
    else
      for (let Bt of [
        ...resolvePathEntries(kt, j, "widening", resolvePathPatternForSandbox),
        ...resolveSandboxPathPatterns(allowWrite, j, "widening"),
      ]) {
        if (tt && pathsCoverPath(q(), Bt)) {
          Hc++;
          continue;
        }
        (xt ? ih : Se).push(Bt);
        if (tt && !xt)
          ra.push({
            literal: Bt,
            list: "allowWrite",
          });
        oh.push(Bt);
        if (isUserTierSource(j)) Zd.add(Bt);
      }
    for (let Bt of resolveSandboxPathPatterns(Dt, j, "widening")) {
      if (tt && pathsCoverPath(q(), Bt)) {
        Gc++;
        continue;
      }
      (xt ? Yd : he).push(Bt);
      if (tt && !xt)
        ra.push({
          literal: Bt,
          list: "allowRead",
        });
    }
    let Ct = groupRuleContentsByTool(settingsForSource?.permissions?.deny, [
      FILE_EDIT_TOOL_NAME,
      FILE_READ_TOOL_NAME,
    ]);
    let Qe = [
      {
        rawSpellings: Ct.get(FILE_EDIT_TOOL_NAME) ?? [],
        resolveOne: resolvePathPatternForSandbox,
        access: "write",
        what: `${FILE_EDIT_TOOL_NAME} rule`,
      },
      {
        rawSpellings: Ct.get(FILE_READ_TOOL_NAME) ?? [],
        resolveOne: resolvePathPatternForSandbox,
        access: "read",
        what: `${FILE_READ_TOOL_NAME} rule`,
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
    for (let { rawSpellings, resolveOne, access, what } of Qe)
      for (let rawSpelling of rawSpellings) {
        let entryPath = resolvePathEntry(rawSpelling, j, "deny", resolveOne);
        if (entryPath === undefined) continue;
        if (
          shouldDropRemoteHostEntry(
            what,
            entryPath,
            j,
            context,
            (mb && !gb.has(`${what} ${rawSpelling}`)) || yb.has(`${what} ${rawSpelling}`),
          )
        )
          continue;
        let Hr = normalizeDirPattern(rawSpelling, entryPath);
        switch ((jd.add(Hr), access)) {
          case "write":
            denyPaths.push(Hr);
            break;
          case "read":
            denyPaths_2.push(Hr);
            if (!Ee) qd.add(Hr);
            break;
        }
      }
  }
  if ((Wc > 0 || Gc > 0 || Hc > 0) && !adapterState.droppedRepoFilesystemGrantsLogged) {
    adapterState.droppedRepoFilesystemGrantsLogged = true;
    let j = adminMandate
      ? "admin sandbox mandate"
      : O
        ? "managed or --settings read deny"
        : "Claude Code's own read-deny paths";
    let ce = [];
    if (Wc > 0)
      ce.push(`${Wc} sandbox.filesystem.allowWrite / Edit allow-rule path(s) (admin sandbox mandate)`);
    if (Hc > 0)
      ce.push(
        `${Hc} sandbox.filesystem.allowWrite / Edit allow-rule path(s) under a denied read path (${j})`,
      );
    if (Gc > 0) ce.push(`${Gc} sandbox.filesystem.allowRead path(s) inside a denied read path (${j})`);
    logForDebugging(
      `[sandbox] filesystem grants restricted to trusted settings tiers: ignoring ${ce.join(" and ")} from project/local (or HKCU-backfilled policy) settings`,
    );
  }
  if (managedReadPathsOnly && !evalConfinedEnv)
    for (let managedSource of managedSources)
      he.push(
        ...resolveSandboxPathPatterns(
          managedSource.sandbox?.filesystem?.allowRead,
          "policySettings",
          "widening",
        ),
      );
  let flattened = SETTING_SOURCES.flatMap((j) => {
    let ce = isRepoSettingSource(j);
    if (ce && !isSettingSourceEnabled(j)) return [];
    return (getSettingsForSourceTightenOnly(j)?.sandbox?.credentials?.files ?? []).flatMap((Ee) => {
      if (Ee.mode === "mask" && ce) return [];
      let entryPath = resolvePathEntry(Ee.path, j, "deny", resolveSandboxFilesystemPath);
      if (
        entryPath === undefined ||
        ((Ee.mode !== "mask" || !isTrustedTierSource(j)) &&
          shouldDropRemoteHostEntry("credential file", entryPath, j, context, false))
      )
        return [];
      let denySpelling = normalizeDirPattern(Ee.path, entryPath);
      return [
        {
          source: j,
          file: Ee,
          resolvedCredentialPath: entryPath,
          denySpelling,
        },
      ];
    });
  });
  let Kc = [...context.dropped];
  if (!En(adapterState.deniesDroppedForAnotherHost, Kc)) {
    adapterState.deniesDroppedForAnotherHost = Kc;
    if (Kc.length > 0)
      logFeatureSad("sandbox_exec", "denies_on_another_host_dropped", {
        dropped: Kc.length,
      });
    try {
      sandboxErrorSignalLazy.emit();
    } catch (error) {
      reportSandboxErrorUnderStandIn(error, "deniesOnAnotherHostNotDescribed");
    }
  }
  let allowWriteRoots = [];
  let readDenySkipReason = getReadDenySkipReason();
  if (Vc && readDenySkipReason === null) {
    let j = [originalCwd, ...(adminMandate ? Yl : Va)];
    let ce = new Set($a);
    for (let Qe of [originalCwd, ...$a]) {
      let Bt = Cr.get(Qe);
      if (Bt !== undefined) ce.add(Bt);
    }
    let filtered = [...j, ...ce].filter(containsGlobChars);
    if (filtered.length > 0)
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: paths with glob characters are not re-opened: ${filtered.join(", ")}`,
      );
    let filtered_2 = j.filter((Qe) => !containsGlobChars(Qe));
    let mapped = denyPaths_2.map((Qe) => {
      try {
        return expandPath(Qe, cwd);
      } catch {
        return Qe;
      }
    });
    let bt = new Map();
    let xt = (Qe, Bt = getPlatform() !== "linux", qr = mapped) =>
      qr.some((Es) => {
        let Gr = removeTrailingGlobSuffix(Es);
        if (!containsGlobChars(Gr))
          return (
            isPathPrefixOf(Gr, Qe, Bt) ||
            isPathWithin(Gr, Qe, {
              foldCase: Bt,
            })
          );
        let nr = getPlatform() === "windows" ? denyEntryCovers : denyEntryCoversPath;
        let rr = [[Es, Qe, Bt]];
        if (Bt) rr.push([foldPathCase(Es), foldPathCase(Qe), false]);
        return rr.some(([Hr, xs, qa]) => {
          try {
            celModule.default(Hr, {
              dot: true,
              nocase: qa,
            });
          } catch {
            return true;
          }
          return nr(Hr, xs, bt, qa);
        });
      });
    for (let Qe of [
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
      let sandboxFilesystemPath = resolveSandboxFilesystemPath(Qe, "userSettings");
      if (filtered_2.some((Es) => isPathWithin(Es, sandboxFilesystemPath))) continue;
      let qr = normalizeDirectoryPattern(sandboxFilesystemPath);
      denyPaths_2.push(qr);
      jd.add(qr);
      allowWriteRoots.push(sandboxFilesystemPath);
      if (sh) qd.add(qr);
    }
    let claudeConfigDir = getClaudeConfigDir();
    let xdgConfigHome =
      env.XDG_CONFIG_HOME && isAbsolute(env.XDG_CONFIG_HOME)
        ? env.XDG_CONFIG_HOME
        : resolve(homedir(), ".config");
    let Xt = [...mapped, ...flattened.map((Qe) => Qe.denySpelling)];
    let Dt;
    let gitConfigDenyPaths = collectGitConfigDenyPaths(
      xdgConfigHome,
      allowWriteRoots,
      () =>
        (Dt ??= flattenWrapWriteRoots(
          splitBindableWriteRoots(
            [...getDefaultWritePaths(), ...Se],
            new Set([getOriginalCwd(), getCwdState()]),
          ),
        )),
      (Qe) => xt(Qe, true, Xt),
    );
    for (let Qe of [
      ...filtered_2,
      ...[...ce].filter((Bt) => !containsGlobChars(Bt)),
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
      if (xt(Qe)) {
        logForDebugging(
          `Sandbox: blockReadsOutsideWorkingDirectories: ${Qe} stays under an existing denyRead and is not re-opened`,
        );
        continue;
      }
      he.push(Qe);
    }
    if (getEffectiveFilesystemPolicy() === "relaxed")
      logForDebugging(
        "Sandbox: blockReadsOutsideWorkingDirectories: the relaxed filesystem policy drops every denyRead at wrap time, so the sandbox half of the block does not apply",
      );
  } else if (Vc)
    logForDebugging(
      `Sandbox: blockReadsOutsideWorkingDirectories not applied to the sandbox: ${readDenySkipReason}${getPlatform() === "windows" ? " (grants from repository settings are still ignored)" : ""}`,
    );
  let Jd = allowWriteRoots.length > 0 || (Vc && getPlatform() === "windows");
  for (let j of Yd) {
    if (Jd) {
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: repo-committed allowRead ${j} does not count`,
      );
      continue;
    }
    he.push(j);
    ra.push({
      literal: j,
      list: "allowRead",
    });
  }
  for (let j of ih) {
    if (Jd) {
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: repo-committed allowWrite ${j} does not count`,
      );
      continue;
    }
    Se.push(j);
    ra.push({
      literal: j,
      list: "allowWrite",
    });
  }
  for (let j of oh) for (let ce of vn(j)) wn(ce);
  let bb = adminMandate ? Yl : Va;
  for (let j of pr)
    if (((Jd || adminMandate) && !bb.has(j)) || (!Yl.has(j) && pathsCoverPath(q(), j))) {
      let index = Se.indexOf(j);
      if (index !== -1) Se.splice(index, 1);
    } else if (!Yl.has(j))
      ra.push({
        literal: j,
        list: "allowWrite",
      });
  let Qd = [];
  let Wa = [];
  let Sb;
  let ef = () => (Sb ??= uniq([...q(), ...denyPaths_2.flatMap((j) => canonicalizeSandboxPath(j) ?? [])]));
  let tf = {
    allowRead: he,
    allowWrite: Se,
  };
  let sa = ({ list, literal }, Ee, We = false) => {
    do {
      let index = tf[list].indexOf(literal);
      if (index === -1) break;
      tf[list].splice(index, 1);
    } while (We);
    logForDebugging(`[sandbox] withheld ${list} ${literal}: ${Ee}`);
  };
  if (O)
    for (let j of ra) {
      let ce = canonicalizeSandboxPath(j.literal) ?? "";
      if (containsGlobChars(ce))
        sa(
          j,
          "a repository glob grant is expanded anew at every wrap while a trusted tier denies reads (spell the directories instead)",
        );
      else if (isNetworkSpelledGrantRoot(ce))
        sa(
          j,
          "a repository grant spelled as a network (UNC or automount) path cannot be compared with the paths a trusted tier denies reading",
        );
    }
  let Eb = flattenWrapWriteRoots(
    splitBindableWriteRoots([...getDefaultWritePaths(), ...Se], new Set([originalCwd, cwdState])),
  );
  let dh = new Map();
  let nf = getPlatform() === "windows";
  let ji = nf ? getGitHomeInfo(homedir(), userSettingsHomes()) : undefined;
  let xb;
  let _b = () =>
    (xb ??=
      ji !== undefined &&
      readFlagWithOverride(TENGU_CURRIED_WILLOW, {
        safe: true,
      }));
  for (let j of ["allowRead", "allowWrite"])
    e: for (let ce of uniq(tf[j])) {
      let Ee = ji === undefined ? ce : normalizeUncTildePath(ce);
      if (ji !== undefined && isDeviceNamespacePath(Ee.replace(/^[\\/]{3,}/, "\\\\"))) {
        sa(
          {
            list: j,
            literal: ce,
          },
          "a device path cannot be compared with the home folder (spell it without the \\\\.\\ prefix)",
          true,
        );
        continue;
      }
      let We = canonicalizeSandboxPath(Ee);
      let tt =
        We !== undefined &&
        (ji === undefined
          ? containsGlobChars(We)
          : containsGlobCharsWin(We) || (containsGlobCharsWin(Ee) && containsGlobChars(We)));
      if (ji !== undefined && We !== undefined && tt && !isForeignUnresolvedMount(We)) {
        let globBaseDirectory = getGlobBaseDirectory_2(We);
        let kt = cachedResolvedPrefix(globBaseDirectory, dh);
        let Xt =
          kt === null
            ? "has a link chain that cannot be followed safely"
            : isUnderGitHome(kt.path, ji)
              ? "is or contains the home folder, or is a Claude Code config folder, which the Windows sandbox is not given (name the folders instead)"
              : isGrantCoveredByPattern(
                    ef(),
                    {
                      path: globBaseDirectory,
                      patternBeneath: false,
                    },
                    kt.path,
                  )
                ? "resolves into a denied read path outside its own spelling"
                : undefined;
        if (Xt !== undefined) {
          if (kt === null && j === "allowWrite") Wa.push(ce);
          sa(
            {
              list: j,
              literal: ce,
            },
            `the folder that it is confined to (${globBaseDirectory}) ${Xt}`,
            true,
          );
          continue;
        }
      }
      if (We === undefined || isForeignUnresolvedMount(We)) continue;
      let bt = tt
        ? [
            {
              path: getGlobBaseDirectory_2(We),
              patternBeneath: true,
              nameReading: false,
            },
            ...nameReadingsOfGlobSpelling(
              nf ? resolveAgainstProcessCwd(Ee).replaceAll("\\", "/") : resolveAgainstProcessCwd(Ee),
            )
              .filter(({ name: je }) => !/[*?]/.test(je))
              .map(({ name: je, pattern }) => ({
                path: nf ? je.replaceAll("/", "\\") : je,
                patternBeneath: pattern !== null,
                nameReading: true,
              })),
          ]
        : [
            {
              path: We,
              patternBeneath: false,
              nameReading: false,
            },
          ];
      let xt = [];
      for (let je of bt) {
        let kt = cachedResolvedPrefix(je.path, dh);
        if (kt === null) {
          if (tt && j === "allowWrite") Wa.push(ce);
          sa(
            {
              list: j,
              literal: ce,
            },
            "its link chain cannot be followed safely (a loop, an unreadable hop); a later config build re-admits it once it resolves",
            true,
          );
          continue e;
        }
        if (
          ji !== undefined &&
          (!tt || (je.nameReading && _b())) &&
          isUnderGitHome(ensureTrailingBackslashForDriveRoot(je, kt.path), ji)
        ) {
          sa(
            {
              list: j,
              literal: ce,
            },
            je.nameReading
              ? `the sandbox may also read ${je.path} as a folder name, and that folder is or leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given (if it is a link, remove it; or name the real folders instead)`
              : "it is or contains the home folder, or is a Claude Code config folder, which the Windows sandbox is not given",
            true,
          );
          continue e;
        }
        let symlinkHopDirectories = collectSymlinkHopDirectories(je.path, kt.exists ? kt.path : null, true);
        if (!isPathPrefixOfAny(symlinkHopDirectories, Eb)) continue;
        if (isGrantCoveredByPattern(ef(), je, kt.path)) {
          sa(
            {
              list: j,
              literal: ce,
            },
            je.patternBeneath
              ? "a directory in its spelling resolves outside that spelling, through a link a sandboxed command could have placed, to one that holds or lies inside a denied read path (spell the directory by its real path)"
              : "it resolves into a denied read path outside its own spelling through a link a sandboxed command could have placed (grant the denied path itself to carve it out)",
            true,
          );
          continue e;
        }
        xt.push(je);
      }
      if (xt.length > 0)
        Qd.push({
          literal: ce,
          list: j,
          roots: xt,
        });
    }
  let is = new Map();
  let Zl = getEffectiveFilesystemPolicy() === "relaxed";
  let Ga =
    (getPlatform() === "linux" || getPlatform() === "wsl" || (getPlatform() === "macos" && Zl)) &&
    SETTING_SOURCES.some(
      (j) =>
        j !== "projectSettings" &&
        j !== "localSettings" &&
        (isSettingSourceEnabled(j) || Zl) &&
        (getSettingsForSourceTightenOnly(j)?.sandbox?.credentials?.files ?? []).some(
          (ce) => ce.mode === "mask",
        ),
    );
  let fh = [];
  let ph = Ga ? createWalkMemo() : undefined;
  let rf = (j, ce) => {
    if (!ce) return canonicalizePathForMaskSweep(j, undefined, ph);
    let maskPath = resolveMaskPath(j, ph);
    if (maskPath.lookAgain !== undefined) fh.push(maskPath);
    return maskPath.spellings[1];
  };
  let Ai = Ga && Zl;
  let Yi = getPlatform() === "windows" ? /(?<=.)[/\\]+$/ : /(?<=.)\/+$/;
  let hh = expandMaskGlob;
  let vb = Ga
    ? he.flatMap((j) => {
        let replaced = removeTrailingGlobSuffix(j).replace(Yi, "");
        return containsGlobChars(replaced)
          ? [canonicalizePathForMaskSweep(replaced), ...hh(replaced).map((Ee) => Ee.canonical)]
          : [canonicalizePathForMaskSweep(replaced)];
      })
    : [];
  let zl = posixCovers;
  let oa = new Map();
  let wb = (j, ce) => {
    let Ee = foldPathCase(j);
    let We = foldPathCase(ce);
    let tt = "allBeneathItsDirectory";
    return (
      matchesGuardedGlob(j, ce, oa, true) ||
      matchesGuardedGlob(Ee, We, oa) ||
      matchesDenyGlobAtRuntime(j, ce, "exactly", "allBeneathItsDirectory", oa) ||
      matchesDenyGlobAtRuntime(Ee, We, "exactly", "allBeneathItsDirectory", oa) ||
      (containsGlobChars(j) &&
        (nameReadingsOfGlobSpelling(ce).some(({ name: bt }) => posixCovers(bt, j)) ||
          nameReadingsOfGlobSpelling(We).some(({ name: bt }) => posixCovers(bt, Ee))))
    );
  };
  let Tb = (j, ce, Ee) => {
    let We = Ee;
    for (;;) {
      if (wb(We, j) && denyEntryCoversFolded(ce, We, oa)) return true;
      let tt = dirname(We);
      if (tt === We) return false;
      We = tt;
      if (!containsGlobChars(ce) && !isPathPrefixOf(ce, We)) return false;
    }
  };
  let mo = (j, ce) =>
    vb.some((Ee) =>
      containsGlobChars(Ee) ? Tb(Ee, j, ce) : denyEntryCoversFolded(j, Ee, oa) && isPathPrefixOf(Ee, ce),
    );
  let qc = (j, ce) => denyEntryCoversPath(j, ce, oa);
  let aa = new Set();
  let jc = new Set();
  let Yc = new Map();
  let Js = (j, ce, Ee) => {
    let We = Yc.get(j);
    if (We) {
      We.lexicals.push(ce);
      We.trusted ||= Ee;
    } else
      Yc.set(j, {
        lexicals: [ce],
        trusted: Ee,
      });
  };
  let sf = (j) => Yc.get(j)?.trusted === true;
  let Ha = (j, ce) => {
    let Ee = Yc.get(j);
    return (
      Ee === undefined ||
      Ee.lexicals.some((lexical) => lexical === j || (zl(lexical, ce) && isOsLinkedRootAlias(lexical, j)))
    );
  };
  let mi = new Map();
  let mh = false;
  let of;
  let Xl = new Map();
  let gh = 0;
  let yh = 0;
  let la = credentialRuleExtractSchema;
  let yo = (pair) => [
    pair.accessKeyIdVar,
    pair.secretAccessKeyVar,
    ...(pair.sessionTokenVar !== undefined ? [pair.sessionTokenVar] : []),
  ];
  let Ab = (j) => credentialRuleRefine(j.accessKeyIdVar) || credentialRuleRefine(j.secretAccessKeyVar);
  let af = (j, rank, Ee) => {
    let We = new Set([...Xl.values()].flatMap((tt) => yo(tt.pair)));
    for (let tt of j) {
      if (!la.includes(tt) || We.has(tt)) continue;
      yh += 1;
      logForDebugging(Ee(tt), {
        level: "warn",
      });
      Xl.set(tt, {
        pair: {
          accessKeyIdVar: tt,
          secretAccessKeyVar: `${credentialRuleExtraSchema}${yh}_`,
        },
        rank,
        seq: gh++,
        label: tt,
        sessionLabel: undefined,
        synthetic: true,
      });
      We.add(tt);
    }
  };
  let lf;
  for (let j of SETTING_SOURCES) {
    let credentials = getSettingsForSourceTightenOnly(j)?.sandbox?.credentials;
    if (!credentials) continue;
    let Ee = isRepoSettingSource(j);
    if (Ee && !isSettingSourceEnabled(j)) {
      logForDebugging(`Sandbox: ignoring sandbox.credentials entries from disabled setting source ${j}`, {
        level: "info",
      });
      continue;
    }
    mh = true;
    let We = j === "userSettings" && !isSettingSourceEnabled("userSettings");
    let tt = evalConfinedEnv && j !== "userSettings";
    let bt = We || tt;
    let xt = tt ? `eval-confined foreign tier ${j}` : "disabled userSettings";
    for (let { file, resolvedCredentialPath, denySpelling } of flattened.filter((Dt) => Dt.source === j)) {
      let Dt = file.mode === "deny" ? denySpelling : resolvedCredentialPath;
      let replaced = removeTrailingGlobSuffix(denySpelling).replace(Yi, "");
      let Qe = Ga ? rf(replaced, !Ee) : replaced;
      if (file.mode === "deny") Js(Qe, replaced, !Ee);
      let Bt = is.get(Qe);
      if (Bt?.mode === "deny") {
        let Gr = aa.has(Qe);
        let nr = (rr) => rr === Qe || isOsLinkedRootAlias(rr, Qe);
        if (file.mode === "deny" && Gr && !nr(replaced)) {
          logForDebugging(
            `[sandbox] credential file deny for '${Dt}' supersedes the disabled-userSettings synthetic deny but is symlink-spelled \u2014 installed as a canonical deny on '${Qe}' so enforcement cannot be retargeted`,
          );
          is.set(Qe, {
            path: Qe,
            mode: "deny",
          });
          Js(Qe, Qe, !Ee);
          aa.delete(Qe);
          continue;
        }
        if (file.mode === "deny" && !Gr) {
          let rr = nr(removeTrailingGlobSuffix(Bt.path).replace(Yi, ""));
          if (!nr(replaced) || rr) {
            if (!Ee && !nr(replaced) && !rr) {
              logForDebugging(
                `[sandbox] credential file deny for '${Dt}' collides with the deny spelled '${Bt.path}' only through symlink resolution \u2014 installed as a canonical deny on '${Qe}' so the trusted tier's intent cannot be retargeted`,
              );
              is.set(Qe, {
                path: Qe,
                mode: "deny",
              });
              Js(Qe, Qe, true);
            }
            continue;
          }
          logForDebugging(
            `[sandbox] credential file deny for '${Dt}' replaces the deny spelled '${Bt.path}': the incumbent reaches this file only through symlink resolution, the replacement is the canonical spelling`,
          );
        } else if (file.mode === "mask" && !Gr) {
          let rr = Ai || mo(Qe, Qe);
          let Hr = !rr && !Ha(Qe, replaced);
          if (!rr && !Hr) {
            logForDebugging(
              `[sandbox] credential file mask for '${Dt}' dropped: '${Bt.path}' denies the same file`,
            );
            continue;
          }
          if (Hr) {
            if (sf(Qe)) {
              logForDebugging(
                `[sandbox] credential file mask for '${Dt}' dropped: a trusted-tier deny ('${Bt.path}') names the same file through a symlink \u2014 installed as a canonical deny on '${Qe}' so enforcement cannot be retargeted`,
              );
              is.set(Qe, {
                path: Qe,
                mode: "deny",
              });
              Js(Qe, Qe, true);
              continue;
            }
            logForDebugging(
              `[sandbox] credential file deny '${Bt.path}' collides with mask '${Dt}' only after symlink resolution \u2014 a wrap-time re-resolve of the deny's spelling can diverge, so the mask is kept (sentinel bind on the real file) WITHOUT injection`,
            );
          }
          if (!Ai) jc.add(Qe);
        }
      }
      if (file.mode === "mask" && bt)
        if (Zl);
        else {
          logForDebugging(
            `[sandbox] credential file mask for '${Dt}' from ${xt} degrades to deny (that source cannot grant proxy injection; its restrictive half still applies)`,
          );
          is.set(Qe, {
            path: denySpelling,
            mode: "deny",
          });
          Js(Qe, replaced, !Ee);
          aa.add(Qe);
          continue;
        }
      if (file.mode === "mask" && !Ai && (getPlatform() === "windows" || getPlatform() === "macos")) {
        logForDebugging(
          `[sandbox] credential file mask for '${Dt}' degrades to deny on ${getPlatform()} (file masking is not enforced by this platform's sandbox backend yet)`,
        );
        is.set(Qe, {
          path: denySpelling,
          mode: "deny",
        });
        Js(Qe, replaced, !Ee);
        aa.delete(Qe);
        continue;
      }
      if (file.mode === "mask") {
        if (containsGlobChars(Dt)) {
          if (Bt?.mode === "mask" && (Ai || mo(Qe, Qe))) {
            logForDebugging(
              `[sandbox] glob-spelled credential file mask '${Dt}' dropped: '${Bt.path}' already masks this path and the degrade's deny would be runtime-inert here`,
            );
            continue;
          }
          logForDebugging(
            `[sandbox] credential file mask for '${Dt}' contains glob characters \u2014 degrading to deny (masking applies to a single file; use mode "deny" for glob patterns)`,
          );
          is.set(Qe, {
            path: denySpelling,
            mode: "deny",
          });
          Js(Qe, replaced, !Ee);
          aa.delete(Qe);
          continue;
        }
        let Gr = isOnForeignMount(Qe, getCwdState()) || rawPointerPathIsUnsafe(Qe, getCwdState());
        let nr;
        if (Gr)
          nr =
            "is flagged by host-side path vetting (cross-host pointer or non-regular path component) \u2014 the unsandboxed probe will not touch it and SRT cannot mask it";
        else {
          let rr;
          try {
            try {
              rr = openSync(Qe, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
            } catch (error) {
              let errnoCode = getErrnoCode(error);
              if (errnoCode === "ELOOP")
                nr =
                  "became a symlink after canonicalization \u2014 the object was swapped mid-conversion, so the probe fails closed";
              else if (
                errnoCode !== "ENOENT" &&
                errnoCode !== "EACCES" &&
                errnoCode !== "EPERM" &&
                errnoCode !== "ENOTDIR"
              )
                nr = `could not be probed (${errnoCode ?? "unknown error"}) \u2014 an unprobed mask may be silently skipped at wrap time, so the probe fails closed`;
            }
            if (rr !== undefined) {
              let Hr = fstatSync(rr);
              if (Hr.isDirectory())
                nr =
                  'resolves to a directory \u2014 whole-file masking has no meaning for a directory; use mode "deny" for directories';
              else if (!Hr.isFile())
                nr =
                  "resolves to a non-regular file (FIFO/device/socket) \u2014 only regular files can be masked; SRT would hang on or silently skip it at wrap time";
              else if (Hr.size > MAX_DENY_SCAN_BYTES)
                nr = `is larger than ${MAX_DENY_SCAN_BYTES} bytes \u2014 a file this size cannot be masked; SRT would skip it fail-open at wrap time`;
              else {
                let size = Hr.size;
                let qa = Buffer.allocUnsafe(size + 1);
                let ca = 0;
                let ec;
                try {
                  for (;;) {
                    let Xc = readSync(rr, qa, ca, size + 1 - ca, null);
                    if (Xc <= 0) break;
                    ca += Xc;
                    if (ca > size) break;
                  }
                  ec = qa.subarray(0, ca);
                } catch (error) {
                  nr = `failed mid-read (${getErrnoCode(error) ?? "unknown error"}) \u2014 the UTF-8 probe could not complete, so the probe fails closed`;
                }
                if (ec !== undefined && ca > size) {
                  nr =
                    "changed size between fstat and read \u2014 the object is being mutated mid-conversion, so the probe fails closed";
                  ec = undefined;
                }
                if (ec !== undefined)
                  try {
                    new TextDecoder("utf-8", {
                      fatal: true,
                    }).decode(ec);
                  } catch {
                    nr =
                      'has non-UTF-8 content \u2014 binary credential files cannot be masked; use mode "deny"';
                  }
              }
            }
          } finally {
            if (rr !== undefined) closeSync(rr);
          }
        }
        if (nr !== undefined) {
          logForDebugging(`[sandbox] credential file mask for '${Dt}' ${nr} \u2014 degrading to deny`);
          is.set(Qe, {
            path: denySpelling,
            mode: "deny",
          });
          Js(Qe, replaced, !Ee);
          aa.delete(Qe);
          continue;
        }
      }
      if (file.mode === "deny" && Bt?.mode === "mask") {
        if (Ai || mo(Qe, Qe)) {
          logForDebugging(
            `[sandbox] credential file deny for '${Dt}' not installed over the existing mask: the deny is runtime-inert here (relaxed filesystem policy or an exact allowRead re-opens the path), so the mask's sentinel bind is the effective protection`,
          );
          if (!Ai) {
            jc.add(Qe);
            is.set(Qe, {
              path: Bt.path,
              mode: "mask",
              injectHosts: [],
            });
          }
          continue;
        }
        let replaced = removeTrailingGlobSuffix(Bt.path).replace(Yi, "");
        if (!Ha(Qe, replaced)) {
          if (!Ee) {
            logForDebugging(
              `[sandbox] credential file mask for '${Bt.path}' dropped: trusted-tier deny '${Dt}' names the same file through a symlink \u2014 installed as a canonical deny on '${Qe}' so enforcement cannot be retargeted`,
            );
            is.set(Qe, {
              path: Qe,
              mode: "deny",
            });
            Js(Qe, Qe, true);
            continue;
          }
          logForDebugging(
            `[sandbox] credential file deny for '${Dt}' collides with mask '${Bt.path}' only after symlink resolution \u2014 a wrap-time re-resolve of the deny's spelling can diverge, so the mask is kept (whole-file sentinel bind on the real file) WITHOUT injection or extract`,
          );
          jc.add(Qe);
          is.set(Qe, {
            path: Bt.path,
            mode: "mask",
            injectHosts: [],
          });
          continue;
        }
        logForDebugging(
          `[sandbox] credential file mask for '${Bt.path}' dropped: '${Dt}' denies the same file`,
        );
      }
      let qr = Ai || mo(Qe, Qe);
      let Es =
        file.mode === "deny"
          ? {
              path: Dt,
              mode: "deny",
            }
          : qr && file.onExtractNoMatch === "deny"
            ? {
                ...file,
                path: Dt,
                onExtractNoMatch: "error",
              }
            : {
                ...file,
                path: Dt,
              };
      if (file.mode === "mask" && jc.has(Qe)) {
        Es = {
          path: Dt,
          mode: "mask",
          injectHosts: [],
        };
        logForDebugging(
          `[sandbox] credential file mask for '${Dt}' kept over an allowRead-re-opened trusted deny WITHOUT injection or extract (whole-file sentinel): the sentinel protects the bytes, but the displaced deny's intent bars proxy substitution and fail-open extract semantics`,
        );
      } else if (file.mode === "mask" && bt) {
        Es = {
          path: Dt,
          mode: "mask",
          injectHosts: [],
        };
        logForDebugging(
          `[sandbox] credential file mask for '${Dt}' from ${xt} forwards sentinel-only (whole-file sentinel: injectHosts forced empty, extract options dropped): a degraded deny would be dropped at wrap time under the relaxed filesystem policy, while the sentinel bind keeps the bytes protected \u2014 injection stays withheld (that source cannot grant it) and the source's fail-open extract semantics do not apply`,
        );
      }
      if (file.mode === "mask" && Es.onExtractNoMatch === "error" && file.onExtractNoMatch === "deny")
        logForDebugging(
          `[sandbox] credential file mask for '${Dt}': onExtractNoMatch 'deny' rewritten to 'error' \u2014 the runtime's no-match read-deny would be inert here (relaxed filesystem policy or an exact allowRead re-opens the path), so 'deny' would fail open`,
        );
      if (file.mode === "mask") {
        let found = [getCwdState(), ...Se].find((nr) => {
          let replaced_2 = removeTrailingGlobSuffix(resolve(getCwdState(), nr)).replace(Yi, "");
          if (containsGlobChars(replaced_2)) return false;
          let Hr = canonicalizePathForMaskSweep(replaced_2);
          return zl(replaced_2, Qe) || zl(replaced_2, replaced) || zl(Hr, Qe) || zl(Hr, replaced);
        });
        if (found !== undefined)
          logForDebugging(
            `[sandbox] credential file mask for '${Dt}' resolves inside the sandbox write grant ('${found}') \u2014 a sandboxed command can replace the object between wraps and steer what the host reads (and injects) as the credential; prefer masking files outside writable roots`,
            {
              level: "warn",
            },
          );
      }
      is.set(Qe, Es);
      aa.delete(Qe);
    }
    for (let je of credentials.envVars ?? []) {
      if (je.mode === "mask" && (Ee || We)) continue;
      if (je.mode === "mask" && tt) {
        mi.set(je.name, {
          name: je.name,
          mode: "deny",
        });
        continue;
      }
      if (je.mode === "mask" && credentialRuleRefine(je.name)) {
        logForDebugging(
          `[sandbox] credentials.envVars entry '${je.name}': its name uses a reserved CC-synthesized placeholder prefix, which must never be a masked env var \u2014 degrading the mask to a deny (the variable is unset in the sandbox instead of sentinel-masked)`,
          {
            level: "warn",
          },
        );
        mi.set(je.name, {
          name: je.name,
          mode: "deny",
        });
        continue;
      }
      if (mi.get(je.name)?.mode === "deny") continue;
      mi.set(
        je.name,
        je.mode === "deny"
          ? {
              name: je.name,
              mode: "deny",
            }
          : je,
      );
    }
    if (!Ee && !bt && credentials.allowPlaintextInject !== undefined) of = credentials.allowPlaintextInject;
    if (!Ee && !bt) {
      for (let je of credentials.awsPairs ?? []) {
        let kt = Xl.get(je.accessKeyIdVar);
        let Xt = Ab(je);
        let rank = SETTING_SOURCES.indexOf(j);
        if (kt !== undefined) {
          if (Xt && !kt.synthetic && rank <= kt.rank) {
            logForDebugging(
              `[sandbox] credentials.awsPairs: ignoring same-or-lower-precedence inert suppressor pair for '${je.accessKeyIdVar}' \u2014 a real pair already claims that key id, so its suppression is provided by the incumbent and replacing it would disable re-signing`,
            );
            af(
              yo(je),
              rank,
              (Ct) =>
                `[sandbox] credentials.awsPairs: the ignored suppressor pair for '${je.accessKeyIdVar}' held a conventional claim on '${Ct}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
            );
            continue;
          }
          if (!Xt && kt.synthetic && rank < kt.rank) {
            logForDebugging(
              `[sandbox] credentials.awsPairs: ignoring entry for '${je.accessKeyIdVar}' \u2014 a higher-precedence source claims that key id with an inert suppressor, deliberately keeping it non-re-signing`,
              {
                level: "warn",
              },
            );
            af(
              yo(je),
              rank,
              (Ct) =>
                `[sandbox] credentials.awsPairs: the ignored pair for '${je.accessKeyIdVar}' held a conventional claim on '${Ct}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
            );
            continue;
          }
          logForDebugging(
            `[sandbox] credentials.awsPairs entry for '${je.accessKeyIdVar}' replaces an earlier pair for the same access key id (later-processed entry wins)`,
            {
              level: "warn",
            },
          );
        }
        Xl.set(je.accessKeyIdVar, {
          pair: je,
          rank,
          seq: gh++,
          label: je.accessKeyIdVar,
          sessionLabel: je.sessionTokenVar,
          synthetic: Xt,
        });
        if (kt !== undefined)
          af(
            yo(kt.pair),
            kt.rank,
            (Ct) =>
              `[sandbox] credentials.awsPairs: replacing the '${je.accessKeyIdVar}' pair displaced its conventional claim on '${Ct}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
          );
      }
      if (credentials.sigv4 !== undefined) lf = credentials.sigv4;
    }
  }
  let gi = (j) => {
    let ce = mi.get(j);
    return ce?.mode === "mask" && ce.extract === undefined && ce.decode === undefined ? ce : undefined;
  };
  let bh = (j, accessKeyIdVar, Ee) => {
    let injectHosts = mi.get(accessKeyIdVar)?.injectHosts;
    for (let tt of Ee) {
      let injectHosts_2 = mi.get(tt)?.injectHosts;
      if (!(
        injectHosts_2 === undefined ||
        (injectHosts !== undefined &&
          injectHosts.every((injectHost) => isInjectHostCoveredByAllowedDomains(injectHost, injectHosts_2)))
      ))
        logForDebugging(
          `[sandbox] ${j}: member '${tt}' has an injectHosts narrower than the access-key-id entry's \u2014 SigV4 re-signing is scoped by '${accessKeyIdVar}' alone, so the narrower member scope does not limit where re-signed requests carry the real secret`,
          {
            level: "warn",
          },
        );
    }
  };
  let Sh = (accessKeyIdVar, ce = "credentials.awsPairs") => {
    if (mi.get(accessKeyIdVar)?.injectHosts === undefined)
      logForDebugging(
        `[sandbox] ${ce}: '${accessKeyIdVar}' has no injectHosts, so SigV4 re-signing with the real secret is in scope at EVERY host in network.allowedDomains \u2014 a list repo-committed settings can extend; set injectHosts on the '${accessKeyIdVar}' entry to pin the re-signing scope`,
        {
          level: "warn",
        },
      );
  };
  let flattened_2 = [...Xl.values()].flatMap((j) => {
    let { pair } = j;
    let filtered = [pair.accessKeyIdVar, pair.secretAccessKeyVar].filter((We) => gi(We) === undefined);
    if (filtered.length > 0) {
      if (yo(pair).some((We) => la.includes(We))) {
        if (j.synthetic)
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
        return [j];
      }
      logForDebugging(
        `[sandbox] dropping credentials.awsPairs entry '${pair.accessKeyIdVar}': referenced env var(s) ${filtered.join(", ")} are not forwarded as whole-value mask entries (dropped by trust filtering, deny-overridden, never declared, or using extract/decode)`,
      );
      return [];
    }
    return [j];
  });
  {
    let j = (pair) => gi(pair.accessKeyIdVar) !== undefined && gi(pair.secretAccessKeyVar) !== undefined;
    let sorted = flattened_2
      .map((bt) => ({
        entry: bt,
        label: bt.label,
        functional: j(bt.pair),
      }))
      .sort(
        (bt, xt) =>
          Number(xt.functional) - Number(bt.functional) ||
          xt.entry.rank - bt.entry.rank ||
          xt.entry.seq - bt.entry.seq,
      );
    let Ee = new Map();
    let We = 0;
    let tt = (entry, xt) => {
      We += 1;
      entry.pair = {
        ...entry.pair,
        [xt]: `${credentialRuleOnNoMatchSchema}${We}_`,
      };
    };
    for (let { entry, label } of sorted) {
      let pair = entry.pair;
      let kt = [
        ["accessKeyIdVar", pair.accessKeyIdVar],
        ["secretAccessKeyVar", pair.secretAccessKeyVar],
        ...(pair.sessionTokenVar !== undefined ? [["sessionTokenVar", pair.sessionTokenVar]] : []),
      ];
      for (let [Xt, Dt] of kt) {
        let Ct = Ee.get(Dt);
        if (Ct === undefined || Ct.entry === entry) {
          Ee.set(Dt, {
            entry,
            slot: Xt,
            label,
          });
          continue;
        }
        let Qe = j(Ct.entry.pair);
        let Bt = j(entry.pair);
        let included = la.includes(Dt);
        let Es = included && Ct.entry.synthetic && !entry.synthetic && Ct.entry.rank > entry.rank;
        let Gr = included && entry.synthetic && !Ct.entry.synthetic && entry.rank > Ct.entry.rank;
        if (Es) {
          logForDebugging(
            `[sandbox] credentials.awsPairs: '${Dt}' is claimed by the higher-precedence inert '${Ct.label}' suppressor pair; the '${label}' pair's ${Xt} is disabled \u2014 re-signing is unaffected (the pair could not re-sign), and the name stays claimed so implicit auto-pairing stays suppressed`,
          );
          tt(entry, Xt);
          continue;
        }
        if (Gr) {
          logForDebugging(
            Qe
              ? `[sandbox] credentials.awsPairs: the higher-precedence inert '${label}' suppressor pair takes '${Dt}' from the '${Ct.label}' pair \u2014 its ${Ct.slot} is disabled; SigV4 re-signing with it is deliberately suppressed by policy`
              : `[sandbox] credentials.awsPairs: the higher-precedence inert '${label}' suppressor pair takes '${Dt}' from the '${Ct.label}' pair; its ${Ct.slot} is disabled \u2014 re-signing is unaffected (the pair could not re-sign), and the name stays claimed so implicit auto-pairing stays suppressed`,
            Qe
              ? {
                  level: "warn",
                }
              : undefined,
          );
          tt(Ct.entry, Ct.slot);
          Ee.set(Dt, {
            entry,
            slot: Xt,
            label,
          });
          continue;
        }
        if (Bt && !Qe) {
          logForDebugging(
            Ct.entry.synthetic
              ? `[sandbox] credentials.awsPairs: '${Dt}' also appears in the inert '${Ct.label}' suppressor pair; its ${Ct.slot} is disabled in favor of the '${label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`
              : `[sandbox] credentials.awsPairs: '${Dt}' also appears in the '${Ct.label}' pair, which cannot re-sign (unusable member, or disabled earlier in collision resolution); its ${Ct.slot} is disabled in favor of the '${label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`,
          );
          tt(Ct.entry, Ct.slot);
          Ee.set(Dt, {
            entry,
            slot: Xt,
            label,
          });
          continue;
        }
        if (Bt && Qe) {
          let nr =
            Xt === "sessionTokenVar"
              ? `the '${label}' pair re-signs without a session token`
              : `the '${label}' pair can no longer re-sign, though its other claimed names still suppress implicit auto-pairing`;
          logForDebugging(
            `[sandbox] credentials.awsPairs: '${Dt}' fills a slot in both the '${label}' and '${Ct.label}' pairs \u2014 each variable can fill exactly one slot, so the '${Ct.label}' pair (higher-precedence source, or later entry within one source) keeps it and the '${label}' pair's ${Xt} is disabled (${nr}); fix the config`,
            {
              level: "warn",
            },
          );
        } else
          logForDebugging(
            entry.synthetic
              ? `[sandbox] credentials.awsPairs: '${Dt}' also appears in the inert '${label}' suppressor pair; its ${Xt} is disabled in favor of the '${Ct.label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`
              : `[sandbox] credentials.awsPairs: '${Dt}' also appears in the '${label}' pair, which cannot re-sign (unusable member, or disabled earlier in collision resolution); its ${Xt} is disabled in favor of the '${Ct.label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`,
          );
        tt(entry, Xt);
      }
    }
    for (let idx = flattened_2.length - 1; idx >= 0; idx--) {
      let xt = flattened_2[idx];
      if (xt === undefined || j(xt.pair)) continue;
      let pair = xt.pair;
      if (yo(pair).some((kt) => la.includes(kt))) {
        if (
          (pair.accessKeyIdVar.startsWith(credentialRuleOnNoMatchSchema) ||
            pair.accessKeyIdVar.startsWith(credentialRuleDecodeSchema)) &&
          gi(pair.secretAccessKeyVar) !== undefined &&
          yo(pair).some((kt) => kt !== pair.secretAccessKeyVar && la.includes(kt))
        ) {
          logForDebugging(
            `[sandbox] credentials.awsPairs entry '${xt.label}': key-id slot holds a CC-synthesized placeholder but secret '${pair.secretAccessKeyVar}' is still whole-value masked; disabling the pair's secret slot too so sandbox-runtime skips the half-masked re-signing spec silently \u2014 the secret stays masked via its own env entry and the surviving conventional claim keeps implicit auto-pairing suppressed`,
          );
          tt(xt, "secretAccessKeyVar");
        }
        continue;
      }
      logForDebugging(
        `[sandbox] dropping credentials.awsPairs entry '${xt.label}' after slot-collision resolution: its key id or secret slot was disabled and no conventional AWS claim survives, so it can neither re-sign nor suppress implicit auto-pairing`,
      );
      flattened_2.splice(idx, 1);
    }
    for (let bt of flattened_2) {
      let pair = bt.pair;
      if (!j(pair)) continue;
      let je = pair.sessionTokenVar !== undefined && gi(pair.sessionTokenVar) === undefined;
      if (je)
        logForDebugging(
          `[sandbox] credentials.awsPairs entry '${pair.accessKeyIdVar}': session member '${bt.sessionLabel ?? pair.sessionTokenVar}' is not forwarded as a whole-value mask entry (trust-dropped, deny-overridden, never declared, ` +
            "using extract/decode, or disabled by slot-collision resolution) \u2014 " +
            "the pair still re-signs, WITHOUT an x-amz-security-token; temporary-credential requests will fail upstream until the entry is fixed",
          {
            level: "warn",
          },
        );
      bh(`credentials.awsPairs entry '${pair.accessKeyIdVar}'`, pair.accessKeyIdVar, [
        pair.secretAccessKeyVar,
        ...(!je && pair.sessionTokenVar !== undefined ? [pair.sessionTokenVar] : []),
      ]);
      Sh(pair.accessKeyIdVar);
    }
  }
  let mapped = flattened_2.map((j) => j.pair);
  {
    let j = new Set(mapped.flatMap(yo));
    if (
      !la.some((ce) => j.has(ce)) &&
      gi("AWS_ACCESS_KEY_ID") !== undefined &&
      gi("AWS_SECRET_ACCESS_KEY") !== undefined
    ) {
      bh("implicit AWS credential pair", "AWS_ACCESS_KEY_ID", [
        "AWS_SECRET_ACCESS_KEY",
        ...(gi("AWS_SESSION_TOKEN") !== undefined ? ["AWS_SESSION_TOKEN"] : []),
      ]);
      Sh("AWS_ACCESS_KEY_ID", "implicit AWS credential pair");
      if (mi.has("AWS_SESSION_TOKEN") && gi("AWS_SESSION_TOKEN") === undefined)
        logForDebugging(
          "[sandbox] implicit AWS credential pair: 'AWS_SESSION_TOKEN' is declared but not forwarded as a whole-value mask entry " +
            "(deny-overridden or using extract/decode) \u2014 the auto-paired " +
            "trio still re-signs, WITHOUT an x-amz-security-token; temporary-credential requests will fail upstream until the entry is fixed",
          {
            level: "warn",
          },
        );
    } else if (!la.some((ce) => j.has(ce))) {
      let ce = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"];
      let filtered = ce.filter((tt) => gi(tt) !== undefined);
      let filtered_2 = ce.filter((tt) => gi(tt) === undefined && mi.has(tt));
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
  let Eh = (j, ce) =>
    containsGlobChars(j)
      ? [
          j,
          ...hh(j).map((Ee) => {
            Js(Ee.canonical, Ee.lexical, ce);
            return Ee.canonical;
          }),
        ]
      : [j];
  let flattened_3 = [...is.entries()]
    .filter(([, j]) => j.mode === "deny")
    .flatMap(([j]) => (Ga ? Eh(j, sf(j)) : [j]));
  if (Zl && flattened_3.length > 0)
    logForDebugging(
      `[sandbox] credential file deny entries (${[...is.values()]
        .filter((j) => j.mode === "deny")
        .map((j) => j.path)
        .join(
          ", ",
        )}) provide no protection under the relaxed filesystem policy \u2014 read-denies are dropped at wrap time; set sandbox.filesystem.disabled: false in user or managed settings (ignored if managed settings pin the filesystem layer) to enforce them`,
      {
        level: "warn",
      },
    );
  let Jl = Ga
    ? denyPaths_2.flatMap((j) => {
        let replaced = removeTrailingGlobSuffix(j).replace(Yi, "");
        let Ee = isAbsolute(replaced)
          ? replaced
          : replaced.startsWith("~")
            ? join(safeProcessCwd(), replaced)
            : resolveAgainstProcessCwd(replaced);
        let We = qd.has(j);
        if (containsGlobChars(replaced)) {
          let bt = rf(Ee, We);
          Js(bt, bt, We);
          return Eh(bt, We);
        }
        let tt = rf(Ee, We);
        Js(tt, replaced, We);
        return [tt];
      })
    : [];
  if (!Ai)
    for (let [j, ce] of [...is.entries()]) {
      if (ce.mode !== "mask") continue;
      let replaced = removeTrailingGlobSuffix(ce.path).replace(Yi, "");
      let found = [...flattened_3, ...Jl].find(
        (tt) => qc(tt, j) && !mo(tt, j) && !Ha(tt, replaced) && sf(tt),
      );
      if (found !== undefined) {
        logForDebugging(
          `[sandbox] credential file mask for '${ce.path}' dropped: trusted-tier deny '${found}' covers it through a symlink or a relative spelling \u2014 installed as a canonical deny on '${j}' so enforcement cannot be retargeted`,
        );
        is.set(j, {
          path: j,
          mode: "deny",
        });
      }
    }
  let Cb = (j, ce) =>
    Ai
      ? undefined
      : (flattened_3.find((Ee) => !containsGlobChars(Ee) && qc(Ee, j) && !mo(Ee, j) && Ha(Ee, ce)) ??
        Jl.find((Ee) => !containsGlobChars(Ee) && qc(Ee, j) && !mo(Ee, j) && Ha(Ee, ce)));
  let xh = mh
    ? {
        files: [...is.entries()]
          .filter(([j, ce]) => {
            if (ce.mode !== "mask") return true;
            let Ee = Cb(j, removeTrailingGlobSuffix(ce.path).replace(Yi, ""));
            if (Ee === undefined) return true;
            logForDebugging(
              `[sandbox] credential file mask for '${ce.path}' dropped: shadowed by deny on '${Ee}'`,
            );
            return false;
          })
          .map(([j, ce]) => {
            if (
              ce.mode === "mask" &&
              !Ai &&
              [...flattened_3, ...Jl].some(
                (Ee) =>
                  qc(Ee, j) &&
                  (mo(Ee, j) ||
                    containsGlobChars(Ee) ||
                    !Ha(Ee, removeTrailingGlobSuffix(ce.path).replace(Yi, ""))),
              )
            ) {
              logForDebugging(
                `[sandbox] credential file mask for '${ce.path}' kept over a covering deny it cannot be shadowed by (allowRead-re-opened or symlink-spelled) WITHOUT injection or extract (whole-file sentinel)`,
              );
              return {
                path: ce.path,
                mode: "mask",
                injectHosts: [],
              };
            }
            return ce;
          }),
        envVars: [...mi.values()],
        ...(of !== undefined && {
          allowPlaintextInject: of,
        }),
        ...(mapped.length > 0 && {
          awsPairs: mapped,
        }),
        ...(lf !== undefined && {
          sigv4: lf,
        }),
      }
    : undefined;
  let lateSymlinkGrantDenyRoots =
    Qd.length > 0
      ? uniq([
          ...ef(),
          ...(xh?.files ?? [])
            .flatMap((j) => canonicalizeSandboxPath(j.path) ?? [])
            .flatMap((j) => resolveReadDenyRoot(j).spellings),
        ])
      : [];
  let { rgPath, rgArgs, argv0 } = ripgrepCommand();
  let ripgrep = getSandboxSettingsSources()
    .map((j) => j?.sandbox?.ripgrep)
    .find((j) => j !== undefined) ?? {
    command: rgPath,
    args: rgArgs,
    argv0,
  };
  let _h = isScrubOnlySandboxMode();
  let zc = _h
    ? {
        allowedDomains: undefined,
        deniedDomains: [],
        ...ALLOW_ALL_UNIX_SOCKETS,
      }
    : {
        allowedDomains,
        deniedDomains,
        ...(Object.keys(ie).length > 0 && {
          deniedDomainReasons: ie,
        }),
        strictAllowlist: R || undefined,
        ...(evalConfinedEnv ? {} : getNetworkAllowances(settings.sandbox?.network)),
      };
  let tlsTerminateSetting = getTlsTerminateSetting();
  let Db = false;
  if (!_h && zc.tlsTerminate === undefined && tlsTerminateSetting !== undefined)
    if (getPlatform() === "windows") {
      let caCertPaths = getCaCertPaths(resolveWindowsTlsTerminateCaSource());
      if (caCertPaths !== undefined) zc.tlsTerminate = caCertPaths;
      else
        logForDebugging(
          "[sandbox] settings tlsTerminate has no CA paths and the managed sandbox CA is gated off on Windows \u2014 ignoring tlsTerminate (an ephemeral CA cannot pass srt-win user trust-ca)",
          {
            level: "warn",
          },
        );
    } else zc.tlsTerminate = tlsTerminateSetting;
  let Ob = flattenWrapWriteRoots(
    splitBindableWriteRoots([...getDefaultWritePaths(), ...Se], new Set([originalCwd, cwdState])),
  );
  let Pb = Xe.missing === null ? [] : [dirname(Xe.missing.name)];
  let uf = new Set([originalCwd, cwdState]);
  let wh = new Set(splitBindableWriteRoots([...Zd], uf).bindable);
  let Th = splitBindableWriteRoots([...getDefaultWritePaths(), ...me], uf);
  let filtered_3 = [...Se, ...Wa]
    .map((j) => splitBindableWriteRoots([j], uf))
    .filter((j) => !j.bindable.every((ce) => wh.has(ce)));
  let combined = filtered_3.flatMap(flattenWrapWriteRoots).concat(flattenWrapWriteRoots(Th));
  let any = filtered_3.some((j) => j.hasUndecidableEntry);
  let filtered_4 = Xe.links.filter(
    (link) =>
      any ||
      (link.isLive ? combined : Ob).some((ce) =>
        isPathWithin(ce, dirname(link.path), {
          foldCase: true,
        }),
      ),
  );
  let Fb = uniq([
    ...filtered_4.map((j) => dirname(j.path)),
    ...(Xe.missing?.isUnreadable === true ? Pb : []),
  ]);
  let Mb = uniq([
    originalCwd,
    cwdState,
    homedir(),
    resolveExistingPrefix(homedir())?.path ?? homedir(),
    ...Th.bindable,
    ...wh,
  ]);
  for (let j of Fb)
    if (!(
      (existingPrefix?.exists === true &&
        isSameDirOrAbove(j, Wt, {
          orAbove: false,
        })) ||
      Mb.some((Ee) =>
        isSameDirOrAbove(j, Ee, {
          orAbove: true,
        }),
      )
    ))
      Ce(j, false, true);
  adapterState.lateSymlinkGrantCandidates = Qd;
  adapterState.lateSymlinkGrantDenyRoots = lateSymlinkGrantDenyRoots;
  adapterState.lateSymlinkGrantProfile = ji;
  let realPathMemo = new Map();
  let allowGlobBases = isPatternWriteDenyTwinsEnabled();
  let filesystem = {
    denyRead: uniq(addRealPathDenyTwins(denyPaths_2, "read", realPathMemo, false)),
    allowRead: uniq(he),
    allowWrite: uniq(Se),
    denyWrite: uniq(addRealPathDenyTwins(denyPaths, "write", realPathMemo, allowGlobBases)),
    ...(getEffectiveFilesystemPolicy() === "relaxed" && {
      disabled: true,
    }),
  };
  let Ih = new Set();
  for (let j of new Set(Ae ? [originalCwd, cwdState] : [originalCwd]))
    for (let ce of [findGitRoot(j), findCanonicalGitRoot(j)]) if (ce !== null) Ih.add(ce);
  let df = new Set();
  for (let j of Ih)
    try {
      df.add(realpathSync(j));
    } catch {}
  let Qs = {
    network: zc,
    filesystem,
    ignoreViolations: adminMandate ? mergeIgnoreViolations() : settings.sandbox?.ignoreViolations,
    credentials: xh,
    enableWeakerNestedSandbox:
      isScrubEnabled() && isScrubSandboxAvailable()
        ? false
        : adminMandate
          ? trustedBooleanUnlessFalse(
              settings.sandbox?.enableWeakerNestedSandbox,
              (j) => j.enableWeakerNestedSandbox,
            )
          : settings.sandbox?.enableWeakerNestedSandbox,
    allowNestedUserNamespaces:
      isScrubEnabled() && isScrubSandboxAvailable()
        ? false
        : trustedBooleanUnlessFalse(
            settings.sandbox?.allowNestedUserNamespaces,
            (j) => j.allowNestedUserNamespaces,
          ),
    enableWeakerNetworkIsolation: adminMandate
      ? trustedBooleanUnlessFalse(
          settings.sandbox?.enableWeakerNetworkIsolation,
          (j) => j.enableWeakerNetworkIsolation,
        )
      : settings.sandbox?.enableWeakerNetworkIsolation,
    allowAppleEvents: booleanOrUndefined(readSandboxSetting(["allowAppleEvents"])),
    ...(df.size > 0 && {
      git: {
        safeDirectories: [...df],
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
  let Vb = {};
  for (let j of Ua) if (!judgeFileActSafe("create", join(...j), true, Vb, Qs)) createFileAtChain(...j);
  getSandboxAdapterState().builtConfigEnforcesAllowlist.set(Qs, Db);
  getSandboxAdapterState().builtConfigConfiguredDenies.set(Qs, jd);
  if (ae !== undefined) getSandboxAdapterState().builtConfigGbHostRules.set(Qs, ae);
  getSandboxAdapterState().builtConfigSshStoreDenied.set(Qs, Uc);
  getSandboxAdapterState().builtConfigPluginToolStagingDenied.set(Qs, vt);
  getSandboxAdapterState().builtConfigPatternWriteDenyTwins.set(Qs, allowGlobBases);
  getSandboxAdapterState().builtConfigUnlistableWorktreesDenied.set(Qs, Ba);
  if (Ma !== undefined) getSandboxAdapterState().builtConfigNestedGitConfigLockDeny.set(Qs, Ma);
  let any_2 = K?.resolved.some((j) => j.lookAgain !== undefined);
  let ff = new Set(
    (Qs.credentials?.files ?? []).flatMap((j) => {
      if (j.mode !== "mask" || isSentinelOnlyMask(j)) return [];
      let ce = canonicalizeSandboxPath(j.path);
      return ce === undefined ? [j.path] : [j.path, ce];
    }),
  );
  let kh = (j) => ff.has(j.root) || ff.has(canonicalizeSandboxPath(j.root) ?? j.root);
  let Dh = (j) =>
    j.map((ce) =>
      kh(ce)
        ? {
            ...ce,
            isMask: true,
          }
        : ce,
    );
  let pf = Dh(fh);
  let any_3 = pf.some((j) => j.isMask);
  getSandboxAdapterState().builtConfigReadDenyRootResolution.set(
    Qs,
    any_2 || pf.length > 0
      ? {
          resolution:
            any_2 && K
              ? {
                  key: K.key,
                  resolved: Dh(K.resolved),
                }
              : undefined,
          forwardedUntrustedGrants: ra,
          maskSweepEntries: pf,
          trustedDenyRoots: any_3
            ? [
                ...(L ?? getTrustedReadDenyRoots()).filter((j) => !ff.has(j)),
                ...(K?.resolved ?? []).flatMap((j) => (kh(j) ? [] : j.spellings)),
              ]
            : [],
        }
      : undefined,
  );
  return Qs;
}
//@ chunk-fq0cr76a.js:987937-988982 placement
/**
 * 把构建好的配置装入 sandbox-runtime（SandboxManager.updateConfig），同步记录该配置对应的 GrowthBook 规则/deny 开关/读禁止根解析等附加状态。
 */
function installSandboxConfig(e) {
  try {
    SandboxManager_2.updateConfig(e);
  } catch (error) {
    throw describeUnreadableSandboxError(error, "configNotInstalled");
  }
  if (getSandboxAdapterState().builtConfigConfiguredDenies.has(e))
    getSandboxAdapterState().storedDenyListsMayBeShort = false;
  adoptReadDenyRootResolution(e);
  recordWrapWriteRoots(e);
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.gbHostRulesApplied =
    sandboxAdapterState.builtConfigGbHostRules.get(e) ?? sandboxAdapterState.gbHostRulesApplied;
  sandboxAdapterState.sshStoreDenyApplied =
    sandboxAdapterState.builtConfigSshStoreDenied.get(e) ?? sandboxAdapterState.sshStoreDenyApplied;
  sandboxAdapterState.pluginToolStagingDenyApplied =
    sandboxAdapterState.builtConfigPluginToolStagingDenied.get(e) ??
    sandboxAdapterState.pluginToolStagingDenyApplied;
  sandboxAdapterState.patternWriteDenyTwinsApplied =
    sandboxAdapterState.builtConfigPatternWriteDenyTwins.get(e) ??
    sandboxAdapterState.patternWriteDenyTwinsApplied;
  sandboxAdapterState.unlistableWorktreesDenyApplied =
    sandboxAdapterState.builtConfigUnlistableWorktreesDenied.get(e) ??
    sandboxAdapterState.unlistableWorktreesDenyApplied;
  sandboxAdapterState.nestedGitConfigLockDenyApplied =
    sandboxAdapterState.builtConfigNestedGitConfigLockDeny.get(e) ??
    sandboxAdapterState.nestedGitConfigLockDenyApplied;
  sandboxAdapterState.installedConfiguredDenies =
    sandboxAdapterState.builtConfigConfiguredDenies.get(e) ?? sandboxAdapterState.installedConfiguredDenies;
  let r = sandboxAdapterState.builtConfigEnforcesAllowlist.get(e) ?? false;
  if (sandboxAdapterState.initializationPromise === undefined)
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist = r;
  else sandboxAdapterState.installsSinceInitializeStartedAllEnforce &&= r;
}
//@ chunk-fq0cr76a.js:988982-989305 placement
function adoptReadDenyRootResolution(e) {
  let sandboxAdapterState = getSandboxAdapterState();
  if (sandboxAdapterState.builtConfigReadDenyRootResolution.has(e)) {
    sandboxAdapterState.installedReadDenyRootResolution =
      sandboxAdapterState.builtConfigReadDenyRootResolution.get(e);
    sandboxAdapterState.pendingReadDenyFallback = undefined;
    sandboxAdapterState.readDenyRootLookCursor = 0;
    sandboxAdapterState.readDenyRootLookFinishedAt = undefined;
    sandboxAdapterState.readDenyRootLookFailureReported = false;
    sandboxAdapterState.readDenyRootWithinSandboxReach.clear();
  }
}
//@ chunk-fq0cr76a.js:989305-989434 placement
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
//@ chunk-fq0cr76a.js:989434-991903 placement
/**
 * 沙箱适配层的进程级状态（GrowthBook 配置、会话允许主机、deny 真实路径、嵌套 git 配置锁等）。
 */
class SandboxAdapterState {
  tenguSandboxGbConfig = io(getDefaultSandboxGbConfig);
  sessionAllowedHosts = new Set();
  realPathsOfDenies = {
    read: new Map(),
    write: new Map(),
  };
  realPathTwins = "unlisted";
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
  selfExecGrantAttempt = undefined;
  builtConfigConfiguredDenies = new WeakMap();
  installedConfiguredDenies = undefined;
  nativeDenies = undefined;
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
  unlistableWorktreesDenyApplied = undefined;
  builtConfigUnlistableWorktreesDenied = new WeakMap();
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
  checkDependenciesProbe = io(checkDependencies_2);
  baseIsSupportedPlatform = io(() => SandboxManager_2.isSupportedPlatform());
}
//@ chunk-fq0cr76a.js:991903-991913 placement
var sandboxAdapterState;
var sandboxAdapterStatePromise;
//@ chunk-fq0cr76a.js:991913-991946 placement
/**
 * 取沙箱适配层的单例状态（初始化 Promise、失败原因、已安装配置的各类附加信息、读禁止复查状态、Windows 原生 deny 等）。
 */
function getSandboxAdapterState() {
  return (sandboxAdapterState ??= new SandboxAdapterState());
}
//@ chunk-fq0cr76a.js:991946-992071 placement
function getProcessSandboxState() {
  if (!sandboxAdapterStatePromise)
    sandboxAdapterStatePromise = {
      osLinkedRootRealpaths: new Map(),
      stagingDirGitignoreFired: false,
      windowsStartBeganAtMs: createStore(null),
    };
  return sandboxAdapterStatePromise;
}
//@ chunk-fq0cr76a.js:992071-992169 placement
/**
 * 运行时把某目录加入沙箱可写列表（按 key 登记），变化时 refreshConfig。
 */
function addSandboxAllowWriteDirectory(e, n) {
  let { runtimeAllowWriteDirectories } = getSandboxAdapterState();
  if (runtimeAllowWriteDirectories.get(n) === e) return;
  runtimeAllowWriteDirectories.set(n, e);
  refreshConfig();
}
//@ chunk-fq0cr76a.js:992169-992237 placement
/**
 * 从运行时可写列表移除某 key 的目录，有变化时 refreshConfig。
 */
function removeSandboxAllowWriteDirectory(e) {
  if (getSandboxAdapterState().runtimeAllowWriteDirectories.delete(e)) refreshConfig();
}
//@ chunk-fq0cr76a.js:992237-992281 placement
function isEntryNewForSet(path, n) {
  return n !== null && !n.has(path);
}
//@ chunk-fq0cr76a.js:992281-992649 placement
/**
 * 把删除策略名映射为具体选项（是否整目录、是否删除空目录、HEAD 残留时是否整目录）。
 */
function getRemovalPolicy(e) {
  switch (e) {
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
//@ chunk-fq0cr76a.js:992649-992748 placement
function logSandboxDebug(outcome, level = "debug") {
  try {
    logForDebugging(`[Sandbox] ${outcome}`, {
      level,
    });
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "scrubOutcomeNotLogged");
  }
}
//@ chunk-fq0cr76a.js:992748-992827 placement
function logSandboxOutcome(e) {
  try {
    logFeatureSad("sandbox_exec", e);
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "scrubOutcomeNotLogged");
  }
}
//@ chunk-fq0cr76a.js:992827-993023 placement
var SCRUB_NAME_LABELS = new Map([
  ["HEAD", "head"],
  [".git", "dot_git"],
  ["objects", "objects"],
  ["refs", "refs"],
  ["commondir", "commondir"],
  ["config.lock", "config_lock"],
  ["config.worktree.lock", "config_worktree_lock"],
]);
//@ chunk-fq0cr76a.js:993023-993139 placement
function logBareRepoScrubRemoval(path, n) {
  let r = SCRUB_NAME_LABELS.get(basename(path)) ?? "other_name";
  let s = n === "plain" ? "" : `_${n}`;
  logSandboxOutcome(`bare_repo_scrub_removed_${r}${s}`);
}
//@ chunk-fq0cr76a.js:993139-994940 placement
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
    let L =
      (removal === undefined || isEntryNewForSet(path, state.bareGitRepoScrubPathsVouchedLocally)) &&
      (!extra.paths.some((path_2) => path_2.path === path) ||
        isEntryNewForSet(path, extra.pathsVouchedLocally));
    if (judgeFileActSafe("delete", path, L, checked)) continue;
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
          let q = join(dirname(path), "HEAD");
          if (!isFileOrRefsLink(classifyHeadEntry(join(parentDir, "HEAD")))) {
            logSandboxDebug(outcome);
            return true;
          }
          let Z = `${q} still stands, and with it git could take ${dirname(path)} for a repository`;
          try {
            if (isPosix) restoreOwnerDirMode(parentDir, label);
            let J;
            let ie = quarantinePlantedEntry(parentDir, entryName, label, isRecordedParent, (ae) => {
              J = ae;
            });
            if (!entry.unlinkable && ie === "quarantined")
              reportUnclassifiedIndicatorMoved(label, entryName, J);
            logSandboxDebug(
              ie === "quarantined"
                ? `scrub moved ${path} aside whole: ${Z}`
                : ie === "removed"
                  ? `scrub removed ${path}: ${Z}`
                  : ie === "gone"
                    ? `scrub found nothing at ${path} to move aside; ${q} still stands without it`
                    : `${outcome}. Because ${q} still stands and git could take ${dirname(path)} for a repository, the scrub tried to move ${path} aside whole; that failed too, so ${path} ${ie === "neutralized" ? "was made unreadable in place" : "is left as it is"}`,
              ie === "gone" ? "debug" : "warn",
            );
            if (ie === "removed") logBareRepoScrubRemoval(path, "beside_head");
          } catch (error) {
            logSandboxDebug(
              `${outcome}. Because ${q} still stands and git could take ${dirname(path)} for a repository, the scrub tried to move ${path} aside whole; that failed too: ${getErrnoCode(error) ?? "no code"}`,
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
//@ chunk-fq0cr76a.js:994940-995444 placement
/**
 * 上报无法在构建配置时分类的标记文件被移到旁边（而非删除）。
 */
function reportUnclassifiedIndicatorMoved(e, n, r) {
  reportSandboxErrorUnderStandIn(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[Sandbox] ${e}: ${n} could not be checked when the sandbox configuration was last built, so it was moved aside as ${r ?? `${n}${QUARANTINE_PREFIX}<hex>`} rather than removed; if it is yours, rename it back after this session ends; while the session runs, anything that reappears at that name is treated as planted.`,
      "sandbox: post-command scrub moved aside an indicator it could not classify at config build",
    ),
    "unclassifiedIndicatorMovedAside",
  );
  logSandboxOutcome("scrub_unclassified_indicator_quarantined");
}
//@ chunk-fq0cr76a.js:995444-995905 placement
/**
 * 在已验证的父目录下执行清理回调：非 POSIX 直接用父路径；父目录未解析或验证失败时拒绝并打点；成功后传入可用的基路径与是否可直接删除，结束时关闭目录句柄。
 */
function withVerifiedScrubParent(entry, label, isPosix, s) {
  let { path, parent, unlinkable } = entry;
  if (!isPosix) return s(dirname(path), unlinkable, label);
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
    return s(opened.base, opened.recorded && unlinkable, label);
  } finally {
    opened.close();
  }
}
//@ chunk-fq0cr76a.js:995905-996016 placement
function classifyRemovalTarget(entryPath) {
  try {
    return lstatSync(entryPath).isDirectory() ? "dir" : "remove";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "skip" : "unknown";
  }
}
//@ chunk-fq0cr76a.js:996016-996355 placement
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
    let h = `scrub did not remove ${path}: rmdirSync ${getErrnoCode(error) ?? "no code"}`;
    if (policy.wholeIfAHeadSurvives) return h;
    logSandboxDebug(h);
    return false;
  }
}
//@ chunk-fq0cr76a.js:996355-997358 placement
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
      let D;
      let O = quarantinePlantedEntry(
        parentBase,
        entryName,
        label,
        canUnlink,
        (L) => {
          D = L;
        },
        policy.wholeFolder,
      );
      if (O === false || O === "gone") return false;
      if (O === "left") return removeEmptyPlantedDir(path, entryPath, policy);
      if (!entry.unlinkable && O === "quarantined") reportUnclassifiedIndicatorMoved(label, entryName, D);
      if (O === "quarantined") {
        logSandboxDebug(`scrub moved planted ${path} aside as ${D ?? "a quarantine name"}`);
        return false;
      }
      if (O === "neutralized") return false;
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
//@ chunk-fq0cr76a.js:997358-997779 placement
/**
 * 命令结束后检查被拒绝的符号链接路径：仍指向原处的保留，被替换的删除；用户自己改向且不在任何写根内的放过并更新记录。
 */
function scrubSymlinkedDenyPaths(e) {
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
  if (e !== undefined && e.length > 0) scrubDeferredSymlinkSnapshot(e);
}
//@ chunk-fq0cr76a.js:997779-997924 placement
function scrubDeferredSymlinkSnapshot(e) {
  let memo = {};
  for (let r of e) {
    let verdict = classifySymlinkedDenyPath(r, memo);
    if (verdict.kind === "delete")
      scrubReplacedSymlinkDeny(r, verdict, "scrubbed replaced symlinked-deny path (deferred snapshot)");
  }
}
//@ chunk-fq0cr76a.js:997924-998089 placement
function getScrubWriteRoots(e, n = deriveScrubWriteRoots) {
  if (e.roots === undefined)
    try {
      e.roots = n();
    } catch (error) {
      logForDebugging(`[Sandbox] scrub write-root derivation failed: ${error}`, {
        level: "warn",
      });
      e.roots = null;
    }
  return e.roots;
}
//@ chunk-fq0cr76a.js:998089-998193 placement
function judgeFileActSafe(action, path, force, rootsMemo, config) {
  try {
    return judgeOwnFileAct(action, path, force, rootsMemo, config);
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "fileActNotJudged");
    return action === "create";
  }
}
//@ chunk-fq0cr76a.js:998193-998772 placement
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
  let decide = (O, L) => logFileActVerdict(action, path, O, L, sandboxConfig);
  if (isRemoteSessionAvailable() && isWrapUnconfined(sandboxConfig))
    return decide(false, "not_confined_to_write_roots");
  let parentInfo = resolveExistingPrefix(dirname(path));
  if (parentInfo === null) return decide(action === "create", "realpath_failed");
  let writeRoots = getScrubWriteRoots(rootsMemo, () => allBindableWriteRoots(sandboxConfig));
  if (writeRoots === null) return decide(action === "create", "write_roots_unknown");
  let isInside = isInsideWriteRoots(action, parentInfo.path, writeRoots);
  return decide(!isInside, isInside ? "inside_write_roots" : "outside_write_roots");
}
//@ chunk-fq0cr76a.js:998772-999201 placement
/**
 * 记录瘦客户端/云会话后 Claude Code 自己的创建或删除操作被放行或扣下的判定，并打点。
 */
function logFileActVerdict(action, path, r, s, sandboxConfig) {
  try {
    logForDebugging(
      `[Sandbox] ${isRemoteSessionAvailable() ? "thin client" : "after a cloud session"}: Claude Code's own ${action} of ${path} ${r ? "is withheld" : "goes ahead"} (${s})`,
    );
    logEvent("tengu_sandbox_thin_client_file_act_judged", {
      kind: fromEnum(action),
      withheld: r,
      why: fromEnum(s),
      after_cloud_session: !isRemoteSessionAvailable(),
      live_list_built_as_thin_client: getSandboxAdapterState().bareGitRepoScrubPathsVouchedLocally !== null,
      ...(sandboxConfig && {
        write_roots_enforced: !isWrapUnconfined(sandboxConfig),
      }),
    });
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "fileActVerdictNotLogged");
  }
  return r;
}
//@ chunk-fq0cr76a.js:999201-999827 placement
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
  let realPath;
  if (isSymlink)
    try {
      realPath = realpathSync(literal);
      if (realPath === resolved)
        return {
          kind: "keep",
        };
    } catch {
      danglingTarget = null;
      try {
        let D = readlinkSync(literal);
        danglingTarget = followDanglingLink(literal, D);
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
//@ chunk-fq0cr76a.js:999827-1000880 placement
/**
 * 清理被替换的拒绝符号链接：在已验证的父目录下重新检查，仍指向原目标则保留；否则移到旁边或删除，并对非链接条目打点。
 */
function scrubReplacedSymlinkDeny({ literal, resolved, parent }, verdict, message) {
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
      let q = lstatSync(entryPath);
      observedStat = q;
      stillSymlink = q.isSymbolicLink();
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        close();
        return;
      }
      stillSymlink = false;
    }
    if (stillSymlink) {
      let q = false;
      try {
        q = realpathSync(entryPath) === resolved;
      } catch {}
      if (q) {
        close();
        return;
      }
    }
  }
  try {
    let K = quarantinePlantedEntry(parentBase, entryName, label, isRecorded);
    if (K === false || K === "gone") return;
    logSandboxDebug(`${message}: ${literal}`);
    if (!stillSymlink && K === "removed") {
      let q =
        observedStat === null
          ? "unknown"
          : observedStat.isDirectory()
            ? "directory"
            : observedStat.isFile()
              ? "file"
              : "other";
      logEvent("tengu_sandbox_scrub_removed_non_symlink", {
        kind: fromEnum(q),
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
//@ chunk-fq0cr76a.js:1000880-1001171 placement
function deriveScrubWriteRoots() {
  let e = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  let sandboxAdapterState = getSandboxAdapterState();
  if (!e || isWrapUnconfined(e) || sandboxAdapterState.undecidableWrapThisSession) return null;
  let wrapWriteRoots = getWrapWriteRoots(e);
  let s = isRemoteSessionAvailable();
  if (wrapWriteRoots.hasUndecidableEntry && !s) return null;
  return uniq([
    ...sandboxAdapterState.wrapBindableWriteRootsThisSession,
    ...sandboxAdapterState.wrapOutOfTreeTargetsThisSession,
    ...wrapWriteRoots.bindable,
    ...(s ? [] : wrapWriteRoots.outOfTreeTargets),
  ]);
}
//@ chunk-fq0cr76a.js:1001171-1001259 placement
function allBindableWriteRoots(sandboxConfig) {
  return uniq([
    ...getSandboxAdapterState().wrapBindableWriteRootsThisSession,
    ...getWrapWriteRoots(sandboxConfig).bindable,
  ]);
}
//@ chunk-fq0cr76a.js:1001259-1001424 placement
function getWrapWriteRoots(e) {
  let n = new Set([
    ...getSandboxAdapterState().wrapCwdsThisSession,
    ...(isRemoteSessionAvailable() ? [] : [getCwdState()]),
    getOriginalCwd(),
  ]);
  try {
    n.add(process.cwd());
  } catch {}
  return splitBindableWriteRoots([...getDefaultWritePaths(), ...e.filesystem.allowWrite], n);
}
//@ chunk-fq0cr76a.js:1001424-1001517 placement
/**
 * 这次包装是否没有真实隔离：平台不是 linux/wsl/macos、filesystem.disabled、本会话已降为无隔离包装或其他强制条件。strict 策略据此拒绝执行。
 */
function isWrapUnconfined(e) {
  return (
    !supportsPosixSandbox() ||
    e.filesystem.disabled === true ||
    getSandboxAdapterState().unconfinedWrapThisSession ||
    scrubReady()
  );
}
//@ chunk-fq0cr76a.js:1001517-1001549 placement
function scrubReady() {
  return isScrubEnabled() && isScrubSandboxAvailable();
}
//@ chunk-fq0cr76a.js:1001549-1001616 placement
function supportsPosixSandbox() {
  let platform = getPlatform();
  return platform === "linux" || platform === "wsl" || platform === "macos";
}
//@ chunk-fq0cr76a.js:1001616-1001962 placement
/**
 * 把允许写入的路径按每个工作目录解析为绝对路径，区分可直接绑定的写根与真实路径落在树外的目标；无法解析时标记存在不可判定条目。
 */
function splitBindableWriteRoots(allowWrite, cwds) {
  let bindable = new Set();
  let outOfTree = new Set();
  let hasUndecidable = false;
  for (let entry of new Set(allowWrite)) {
    let pattern = removeTrailingGlobSuffix(entry);
    if (containsGlobChars(pattern)) pattern = getGlobBaseDirectory_2(pattern);
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
//@ chunk-fq0cr76a.js:1001962-1002025 placement
function flattenWrapWriteRoots({ bindable, outOfTreeTargets }) {
  return [...bindable, ...outOfTreeTargets];
}
//@ chunk-fq0cr76a.js:1002025-1002063 placement
function recordSessionWrapWriteRoots() {
  recordWrapWriteRoots(assertMarkedPathsResolved(SandboxManager_2.getConfig()));
}
//@ chunk-fq0cr76a.js:1002063-1002551 placement
/**
 * 记录本会话沙箱包装命令的工作目录与可绑定写根、树外目标；未受约束或无法确定时打标记。
 */
function recordWrapWriteRoots(e) {
  if (!supportsPosixSandbox()) return;
  let sandboxAdapterState = getSandboxAdapterState();
  if (!e || e.filesystem.disabled || scrubReady()) {
    sandboxAdapterState.unconfinedWrapThisSession = true;
    return;
  }
  let r;
  try {
    r = process.cwd();
  } catch {
    sandboxAdapterState.unconfinedWrapThisSession = true;
    return;
  }
  sandboxAdapterState.wrapCwdsThisSession.add(r);
  let { bindable, outOfTreeTargets, hasUndecidableEntry } = splitBindableWriteRoots(
    [...getDefaultWritePaths(), ...e.filesystem.allowWrite],
    new Set([r]),
  );
  for (let b of bindable) sandboxAdapterState.wrapBindableWriteRootsThisSession.add(b);
  if (isRemoteSessionAvailable()) return;
  for (let outOfTreeTarget of outOfTreeTargets)
    sandboxAdapterState.wrapOutOfTreeTargetsThisSession.add(outOfTreeTarget);
  sandboxAdapterState.undecidableWrapThisSession ||= hasUndecidableEntry;
}
//@ chunk-fq0cr76a.js:1002551-1002640 placement
function isPathPrefixOfAny(e, n) {
  if (e === null || n === null) return true;
  return e.some((r) => n.some((s) => isPathPrefixOf(s, r)));
}
//@ chunk-fq0cr76a.js:1002640-1002931 placement
function isInsideWriteRoots(action, path, writeRoots) {
  let filtered = path.split("/").filter(Boolean);
  return writeRoots.some((h) => {
    if (isPathPrefixOf(h, path, false)) return true;
    if (!isPathPrefixOf(h, path)) return false;
    let y = statInodeInfo(h);
    if (y === null) return false;
    let b = count(h.split("/"), Boolean);
    let S = statInodeInfo(`/${filtered.slice(0, b).join("/")}`);
    return S !== null && y.dev === S.dev && y.ino === S.ino && (action === "delete" || y.isTold);
  });
}
//@ chunk-fq0cr76a.js:1002931-1003324 placement
/**
 * 判断目录是否与给定路径相同（可选：或在其上方）：有可靠 inode 时按设备与 inode 比较，否则按规范化路径比较。
 */
function isSameDirOrAbove(e, n, { orAbove }) {
  let s = statInodeInfo(e);
  if (s?.isTold !== true) {
    let normalized = n.normalize("NFC");
    return [
      e.normalize("NFC"),
      toComparablePath(e, {
        foldCase: false,
      }),
    ].some(
      (y) =>
        isPathWithin(y, normalized, {
          alreadyComparable: true,
        }) &&
        (orAbove ||
          isPathWithin(normalized, y, {
            alreadyComparable: true,
          })),
    );
  }
  for (let h = n; ; h = dirname(h)) {
    let y = statInodeInfo(h);
    if (y !== null && y.dev === s.dev && y.ino === s.ino) {
      let b = dirname(h);
      while (dirname(b) !== b && statInodeInfo(b)?.isLink === false) b = dirname(b);
      if (dirname(b) === b) return true;
    }
    if (!orAbove || dirname(h) === h) return false;
  }
}
//@ chunk-fq0cr76a.js:1003324-1003470 placement
function statInodeInfo(e) {
  try {
    let n = lstatSync(e, {
      bigint: true,
    });
    let { dev, ino } = n;
    return {
      dev,
      ino,
      isTold: dev !== 0n && !isSentinelInode(ino),
      isLink: n.isSymbolicLink(),
    };
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:1003470-1003624 placement
function isPathPrefixOf(e, n, r = true) {
  let filtered = e.split("/").filter(Boolean);
  let filtered_2 = n.split("/").filter(Boolean);
  return (
    filtered.length <= filtered_2.length &&
    filtered.every((y, b) => (r ? isSamePathCaseFolded(y, filtered_2[b]) : y === filtered_2[b]))
  );
}
//@ chunk-fq0cr76a.js:1003624-1003726 placement
/**
 * 路径大小写折叠：去掉特定字符后 NFD→小写→大写→NFC，用于在大小写不敏感文件系统上比较。
 */
function foldPathCase(e) {
  return e.replace(regExp, "").normalize("NFD").toLowerCase().toUpperCase().normalize("NFC");
}
//@ chunk-fq0cr76a.js:1003726-1003772 placement
function isSamePathCaseFolded(e, n) {
  return e === n || foldPathCase(e) === foldPathCase(n);
}
//@ chunk-fq0cr76a.js:1003772-1003889 placement
function sameStringSet(symlinkHopDirectories, hopDirectories) {
  if (
    symlinkHopDirectories === null ||
    hopDirectories === null ||
    symlinkHopDirectories.length !== hopDirectories.length
  )
    return false;
  let r = new Set(symlinkHopDirectories);
  return hopDirectories.every((s) => r.has(s));
}
//@ chunk-fq0cr76a.js:1003889-1005016 placement
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
      denyWrite: uniq([...newTargets, ...config.filesystem.denyWrite, ...keptLiterals]),
    },
  };
  state.builtConfigEnforcesAllowlist.set(nextConfig, state.installedFilterRequestEnforcesAllowlist);
  installSandboxConfig(nextConfig);
}
//@ chunk-fq0cr76a.js:1005016-1005584 placement
/**
 * 复查 denyWrite 中按字面登记、后来变成符号链接的候选：解析其最终目标（最多跟 8 层），把目标加进 denyWrite 并重新安装配置。
 */
function rescreenDenyLiteralSymlinks() {
  let e = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (!e) return;
  let { denyLiteralSymlinkCandidates } = getSandboxAdapterState();
  let r = new Map();
  for (let denyLiteralSymlinkCandidate of denyLiteralSymlinkCandidates) {
    if (r.has(denyLiteralSymlinkCandidate)) continue;
    let b;
    try {
      b = readlinkSync(denyLiteralSymlinkCandidate);
    } catch {
      continue;
    }
    let S;
    try {
      S = realpathSync(denyLiteralSymlinkCandidate);
    } catch {
      S =
        followDanglingLink(denyLiteralSymlinkCandidate, b) ??
        resolve(dirname(denyLiteralSymlinkCandidate), b);
      for (let j = 0; j < 8; j++) {
        let R;
        try {
          R = readlinkSync(S);
        } catch {
          break;
        }
        S = resolve(dirname(S), R);
      }
    }
    r.set(denyLiteralSymlinkCandidate, S);
  }
  if (r.size === 0) return;
  for (let j = denyLiteralSymlinkCandidates.length - 1; j >= 0; j--)
    if (r.has(denyLiteralSymlinkCandidates[j])) denyLiteralSymlinkCandidates.splice(j, 1);
  let s = {
    ...e,
    filesystem: {
      ...e.filesystem,
      denyWrite: uniq([...r.values(), ...e.filesystem.denyWrite]),
    },
  };
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.builtConfigEnforcesAllowlist.set(
    s,
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
  );
  installSandboxConfig(s);
}
//@ chunk-fq0cr76a.js:1005584-1005671 placement
function ensureTrailingBackslashForDriveRoot({ path, patternBeneath }, path_2) {
  return !patternBeneath && /^(?:[a-z]:)?$/i.test(path) ? `${path}\\` : path_2;
}
//@ chunk-fq0cr76a.js:1005671-1005759 placement
function cachedResolvedPrefix(path, n) {
  let r = n.get(path);
  if (r !== undefined) return r;
  let existingPrefix = resolveExistingPrefixSafely(path);
  n.set(path, existingPrefix);
  return existingPrefix;
}
//@ chunk-fq0cr76a.js:1005759-1005822 placement
function resolveExistingPrefixSafely(e) {
  if (isForeignUnresolvedMount(e) || linkChainIsUnsafeToFollow(e, getCwdState())) return null;
  return resolveExistingPrefix(e);
}
//@ chunk-fq0cr76a.js:1005822-1005858 placement
function isNetworkSpelledGrantRoot(e) {
  return isUntouchableSpelling(e) || isNetDir(e);
}
//@ chunk-fq0cr76a.js:1005858-1005899 placement
function isForeignUnresolvedMount(e) {
  return isOnForeignMount(e, getCwdState()) && !isLocalNetworkPath(e);
}
//@ chunk-fq0cr76a.js:1005899-1005953 placement
function normalizeUncTildePath(e) {
  return stripExtendedPathPrefix(expandWindowsEnvRefs(e)).replace(/^~\\/, "~/");
}
//@ chunk-fq0cr76a.js:1005953-1007224 placement
/**
 * 判断一个路径是否是需要在沙箱内单独处理的网络路径（UNC/自动挂载）：综合主机名形式、是否本机名、受信写入者的授权、各自身位置与已审核位置的主机比较。
 */
function isUnsafeNetworkPath(path, context, vouched) {
  let vouchedGrants = context.trustsWriter ? context.grantsOfVouched : [];
  let places = vouched ? context.placesOfVouched : context.ownPlaces;
  if (context.sharesReach && isWindowsDevicePath(path)) {
    let uncHost = uncHostOf(path);
    let R = context.trustsWriter || uncHost?.endsWith(".") !== true;
    let D = isDeviceNamespacePath(path);
    let O = D || hasWin32DevicePrefixSpelling(path);
    let L = hasDotSegment(D ? path.slice(3) : path);
    let V = uncHost === null && O && !NT_NAMESPACE_PREFIX_RE.test(path.slice(3)) && !L;
    let K = O && L;
    let [q, Z, ...J] = path.replace(/^[\\/]{2}/, "").split(/[\\/]+/);
    let ie =
      !!q &&
      !!Z &&
      [q, Z].every((ue) => ue !== "." && ue !== "..") &&
      [Z, ...J].every((ue) => ue === "." || ue === ".." || !/[. ]$/.test(ue));
    let ae = 0;
    for (let ue of J)
      if (ue === "..") {
        ae--;
        ie &&= ae >= 0;
      } else if (ue !== "." && ue !== "") ae++;
    let replaced = hostname().replace(/[A-Z]/g, (ue) => ue.toLowerCase());
    return (
      !V &&
      !(R && isLocalNetworkPath(path)) &&
      !(
        R &&
        uncHost !== null &&
        !O &&
        (vouched || ie) &&
        (isLocalHostName(uncHost) ||
          isLocalInterfaceAddress(uncHost, context) ||
          isShortNameOfHost(uncHost, replaced, context))
      ) &&
      !(uncHost !== null && !D && !hasDotSegment(path) && isShortNameOfHost(uncHost, replaced, context)) &&
      !(uncHost !== null && !K && WILDCARD_ONLY_RE.test(uncHost)) &&
      !(
        !K &&
        vouchedGrants.some((vouchedGrant) => hostPatternsMatch(uncHostOf(vouchedGrant), uncHost, context))
      ) &&
      places.every((place) => {
        let me = uncHostOf(place);
        return (
          isForeignNetworkPath(path, place) &&
          (K ||
            (!hostPatternsMatch(uncHost, me, context) &&
              !(
                uncHost !== null &&
                me !== null &&
                (((vouched || ie) && hostNamesMatch(uncHost, me, context)) ||
                  isShortNameOfHost(uncHost, me, context))
              )))
        );
      })
    );
  }
  if (!isAutomountPath(path, context)) return false;
  let autoHost = networkMountHost(path);
  let b =
    autoHost !== null &&
    !/\.ipv6-literal\.net\.?$/.test(autoHost) &&
    (((context.trustsWriter || !autoHost.endsWith(".")) && isLocalHostName(autoHost)) ||
      isLocalInterfaceAddress(autoHost, context) ||
      isShortNameOfHost(
        autoHost,
        hostname().replace(/[A-Z]/g, (w) => w.toLowerCase()),
        context,
      ));
  return (
    (autoHost !== null
      ? !WILDCARD_ONLY_RE.test(autoHost) && !b
      : isMacSpecialPath(path) || count(path.split("/"), (w) => w !== "" && w !== ".") > 2) &&
    !vouchedGrants.some((vouchedGrant) =>
      hostPatternsMatch(networkMountHost(vouchedGrant), autoHost, context),
    ) &&
    places.every((place) => {
      let R = networkMountHost(place);
      return (
        isForeignMountPath(path, place) &&
        !hostPatternsMatch(autoHost, R, context) &&
        !(
          autoHost !== null &&
          R !== null &&
          ((vouched && hostNamesMatch(autoHost, R, context)) || isShortNameOfHost(autoHost, R, context))
        )
      );
    })
  );
}
//@ chunk-fq0cr76a.js:1007224-1007315 placement
function hostNamesMatch(e, n, context) {
  return e === n || (context.trustsWriter && e.replace(/\.$/, "") === n.replace(/\.$/, ""));
}
//@ chunk-fq0cr76a.js:1007315-1007524 placement
var NT_NAMESPACE_PREFIX_RE =
  /^[\\/](?:UNC|Mup|LanmanRedirector|GLOBALROOT|GLOBAL\?\?|Global|DosDevices|Device)(?:[\\/]|$)/i;
var NT_DEVICE_PREFIX_RE =
  /^[\\/](?:[a-z]:|Volume\{[0-9a-f-]+\}|HarddiskVolume\d+|PhysicalDrive\d+|CdRom\d+|pipe)(?:[\\/]|$)/i;
//@ chunk-fq0cr76a.js:1007524-1007613 placement
function isProcPath(e) {
  return (getPlatform() === "linux" || getPlatform() === "wsl") && (e === "/proc" || e.startsWith("/proc/"));
}
//@ chunk-fq0cr76a.js:1007613-1007739 placement
function isAutomountPath(e, context) {
  return context.automounter === "macos"
    ? isNetworkMountPath(e) || neverOtherHostMount(e) || isMacSpecialPath(e)
    : context.automounter === "linux" && networkMountRootCached(e)?.startsWith("/net/") === true;
}
//@ chunk-fq0cr76a.js:1007739-1007756 placement
var WILDCARD_ONLY_RE = /^[*?]+$/;
//@ chunk-fq0cr76a.js:1007756-1008347 placement
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
//@ chunk-fq0cr76a.js:1008347-1008385 placement
var PROC_PID_PATH_RE = /^\/proc\/\d+(?:\/|$)/;
var MAX_PARENT_DIR_WALK = 40;
//@ chunk-fq0cr76a.js:1008385-1008723 placement
/**
 * 判断目录是否是 root 所有、当前用户不可写的固定目录（带缓存，逐级向上）。
 */
function isRootOwnedFixedFolder(e, n) {
  let r = n.fixedFolders.get(e);
  if (r !== undefined) return r;
  let s = isProcPath(e);
  let h = dirname(e);
  let y = s || h === e || isRootOwnedFixedFolder(h, n);
  if (y && !s) {
    y = false;
    let b = process.getuid?.();
    try {
      let { uid, mode } = statSync(e);
      try {
        accessSync(e, constants.W_OK);
      } catch (error) {
        let errnoCode = getErrnoCode(error);
        y =
          b !== undefined &&
          b !== 0 &&
          uid === 0 &&
          (mode & 18) === 0 &&
          (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "EROFS");
      }
    } catch {}
  }
  n.fixedFolders.set(e, y);
  return y;
}
//@ chunk-fq0cr76a.js:1008723-1009676 placement
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
      let L;
      try {
        L = readlinkSync(candidate);
      } catch (error) {
        if (getErrnoCode(error) !== "EINVAL") {
          let path = [candidate, ...parts].join("/");
          return (!context.trustsWriter && PROC_PID_PATH_RE.test(candidate)) ||
            (hops > 0 && isUnsafeNetworkPath(path, context, vouched))
            ? path
            : undefined;
        }
      }
      context.linkTexts.set(candidate, L);
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
//@ chunk-fq0cr76a.js:1009676-1009758 placement
var MACOS_SYSTEM_VOLUME_ROOTS = ["/system/volumes", "/system/volumes/data", "/system/volumes/data/volumes"];
//@ chunk-fq0cr76a.js:1009758-1009843 placement
function resolveSandboxFilesystemPath_2(pattern) {
  return pattern === "~" || pattern.startsWith("~/")
    ? homedir() + pattern.slice(1)
    : isAbsolute(pattern)
      ? pattern
      : resolve(safeProcessCwd(), pattern);
}
//@ chunk-fq0cr76a.js:1009843-1011332 placement
/**
 * 判断某个来源的沙箱路径条目是否指向另一台计算机而应丢弃（否则每条命令前沙箱都会去访问那台机器）：首次调用时准备自动挂载与已授权位置信息；丢弃时每条只警告一次。
 */
function shouldDropRemoteHostEntry(entryKind, entryPath, source, context, isManagedOnly) {
  try {
    let isTrustedSource = isTrustedTierSource(source);
    let trustsWriter =
      isTrustedSource && !(source === "policySettings" && entryKind !== "credential file" && isManagedOnly);
    if (trustsWriter && (entryKind === "write deny" || entryKind === `${FILE_EDIT_TOOL_NAME} rule`))
      return false;
    if (context.prepared === "no") {
      context.prepared = "failed";
      let L = getPlatform() === "macos";
      if (!context.sharesReach && (L ? readAutoMaster() : readAutofsMounts())) {
        context.automounter = L ? "macos" : "linux";
        if (!L) {
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
      ? [getGlobBaseDirectory_2(normalized), ...nameReadingsOfGlobSpelling(normalized).map((L) => L.name)]
      : [normalized];
    let mapped = uniq(
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
          (L) =>
            (isDeviceNamespacePath(L) || hasWin32DevicePrefixSpelling(L)) &&
            !NT_DEVICE_PREFIX_RE.test(L.slice(3)),
        )
      ) &&
      !mapped.some((L) => isUnsafeNetworkPath(L, context, isTrustedSource)) &&
      (context.sharesReach ||
        !mapped.some((L) => findRemoteMountPrefix(L, context, isTrustedSource, true) !== undefined))
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
//@ chunk-fq0cr76a.js:1011332-1011391 placement
function droppedDeniesForHost() {
  return [...getSandboxAdapterState().deniesDroppedForAnotherHost];
}
//@ chunk-fq0cr76a.js:1011391-1011430 placement
function subscribeSandboxEvents(e) {
  return sandboxErrorSignalLazy.subscribe(e);
}
//@ chunk-fq0cr76a.js:1011430-1011523 placement
function isLocalNetworkPath(e) {
  if (isWslUncPath(e)) return true;
  if (isDeviceNamespacePath(e) || hasDotSegment(e)) return false;
  let n = uncHostOf(e);
  return n !== null && isLocalHostName(n);
}
//@ chunk-fq0cr76a.js:1011523-1011654 placement
function isLocalHostName(e) {
  let replaced = e.replace(/\.$/, "");
  return (
    isLoopbackHost(replaced) ||
    replaced === "--1.ipv6-literal.net" ||
    replaced === hostname().replace(/[A-Z]/g, (r) => r.toLowerCase())
  );
}
//@ chunk-fq0cr76a.js:1011654-1011681 placement
var IPV6_LITERAL_SUFFIX = ".ipv6-literal.net";
//@ chunk-fq0cr76a.js:1011681-1011841 placement
function isLocalInterfaceAddress(e, context) {
  let r = e.endsWith(IPV6_LITERAL_SUFFIX)
    ? e.slice(0, -IPV6_LITERAL_SUFFIX.length).replaceAll("-", ":")
    : null;
  return (
    context.trustsWriter &&
    (r === null ? isIP(e) !== 0 : isIP(r) === 6) &&
    (getLocalInterfaceAddresses()?.has(e) ?? true)
  );
}
//@ chunk-fq0cr76a.js:1011841-1012144 placement
/**
 * 判断一个主机名是另一个的短名（短名加本机搜索域等于全名）。
 */
function isShortNameOfHost(e, n, context) {
  let [s, h] = e.includes(".") ? [n, e.replace(/\.$/, "")] : [e, n.replace(/\.$/, "")];
  if (s.includes(".") || !h.startsWith(`${s}.`)) return false;
  let localSearchDomain = getLocalSearchDomain(context);
  return (
    (typeof localSearchDomain === "string" && h === `${s}.${localSearchDomain}`) ||
    (context.trustsWriter &&
      (localSearchDomain === null ||
        context.automounter === "macos" ||
        (context.searchDomains ?? []).some((b) => h === `${s}.${b}`)))
  );
}
//@ chunk-fq0cr76a.js:1012144-1012405 placement
function getLocalSearchDomain(e) {
  if (e.sharesReach) return null;
  if (e.searchDomains === undefined) e.searchDomains = readResolvSearchDomains() ?? null;
  if (e.searchDomains === null) return null;
  let replaced = hostname().replace(/[A-Z]/g, (s) => s.toLowerCase());
  let index = replaced.indexOf(".");
  return e.searchDomains[0] ?? (index === -1 ? undefined : replaced.slice(index + 1));
}
//@ chunk-fq0cr76a.js:1012405-1012579 placement
function isGrantCoveredByPattern(e, { path, patternBeneath }, path_2) {
  let platform = getPlatform();
  let y = platform === "windows";
  return (
    !isPathPrefixOf(
      y ? path.replaceAll("\\", "/") : path,
      y ? path_2.replaceAll("\\", "/") : path_2,
      y || platform === "macos",
    ) && (patternBeneath ? anyGlobPathCovers(e, [path_2]) : anyDenyEntryCovers(e, [path_2]))
  );
}
//@ chunk-fq0cr76a.js:1012579-1012609 placement
var TENGU_CURRIED_WILLOW = "tengu_curried_willow";
//@ chunk-fq0cr76a.js:1012609-1014423 placement
/**
 * 复查配置构建后被重新链接的 allowRead/allowWrite 授权：若现在指向家目录、配置目录或读禁止区，就从运行中配置撤下并上报 tengu_sandbox_late_symlink_grant_dropped，下次构建再审。
 */
function rescreenLateSymlinkGrants() {
  let sandboxAdapterState = getSandboxAdapterState();
  let { lateSymlinkGrantCandidates, lateSymlinkGrantDenyRoots, lateSymlinkGrantProfile } =
    sandboxAdapterState;
  if (lateSymlinkGrantCandidates.length === 0) return;
  let h = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (!h) return;
  let y =
    lateSymlinkGrantProfile !== undefined &&
    readFlagWithOverride(TENGU_CURRIED_WILLOW, {
      safe: true,
    })
      ? lateSymlinkGrantProfile
      : undefined;
  let b = {
    allowRead: new Set(),
    allowWrite: new Set(),
  };
  let S = new Map();
  for (let j = lateSymlinkGrantCandidates.length - 1; j >= 0; j--) {
    let { literal, list, roots } = lateSymlinkGrantCandidates[j];
    let V;
    for (let root of roots) {
      let q = cachedResolvedPrefix(root.path, S);
      if (q === null) V = "it no longer resolves safely";
      else if (y !== undefined && isUnderGitHome(ensureTrailingBackslashForDriveRoot(root, q.path), y))
        V = root.nameReading
          ? `the sandbox may also read ${root.path} as a folder name, and that folder now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given`
          : root.patternBeneath
            ? `the folder that it is confined to (${root.path}) now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given`
            : "it now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given";
      else if (isGrantCoveredByPattern(lateSymlinkGrantDenyRoots, root, q.path))
        V = root.patternBeneath
          ? "a directory in its spelling now resolves outside that spelling to one that holds or lies inside a denied read path"
          : "it now resolves into a denied read path outside its own spelling";
      if (V !== undefined) break;
    }
    if (V === undefined) continue;
    lateSymlinkGrantCandidates.splice(j, 1);
    b[list].add(literal);
    logForDebugging(
      `[Sandbox] dropped ${list} ${literal}: ${V} (re-linked after the config build); withheld until the next config build re-screens it`,
    );
    logEvent("tengu_sandbox_late_symlink_grant_dropped", {
      list: fromEnum(list),
    });
  }
  if (b.allowRead.size === 0 && b.allowWrite.size === 0) return;
  let w = {
    ...h,
    filesystem: {
      ...h.filesystem,
      allowRead: (h.filesystem.allowRead ?? []).filter((R) => !b.allowRead.has(R)),
      allowWrite: h.filesystem.allowWrite.filter((R) => !b.allowWrite.has(R)),
    },
  };
  sandboxAdapterState.builtConfigEnforcesAllowlist.set(
    w,
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
  );
  installSandboxConfig(w);
}
//@ chunk-fq0cr76a.js:1014423-1014945 placement
/**
 * 检测 cwd 是否是 git worktree：读 .git 文件中的 gitdir，校验其位于 <主仓库>.git/worktrees/ 下且反向链接一致，返回主仓库 .git 目录供沙箱放行写入；任何异常返回 null。
 */
function detectWorktreeGitCommonDir(e) {
  let n = join(e, ".git");
  try {
    if (pointerFileIsSuspect(n, e)) return null;
    let match = readFileSync(n, {
      encoding: "utf8",
    }).match(/^gitdir:\s*(.+)$/m);
    if (!match?.[1]) return null;
    let trimmed = match[1].trim();
    if (isOnForeignMount(trimmed, e)) return null;
    if (rawPointerPathIsUnsafe(trimmed, e)) return null;
    let y = resolve(e, trimmed);
    let b = dirname(y);
    if (basename(b) !== "worktrees") return null;
    let S = dirname(b);
    if (!basename(S).endsWith(".git")) return null;
    if (pointerFileIsSuspect(join(y, "gitdir"), y)) return null;
    let trimmed_2 = readFileSync(join(y, "gitdir"), {
      encoding: "utf8",
    }).trim();
    if (isOnForeignMount(trimmed_2, e)) return null;
    if (rawPointerPathIsUnsafe(trimmed_2, y, e)) return null;
    if (realpathSync(resolve(y, trimmed_2)) !== join(realpathSync(e), ".git")) return null;
    return S;
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:1014945-1015221 placement
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
  let n = checkDependenciesProbe();
  if (n.errors.includes(SANDBOX_CONFIG_UNAVAILABLE_TEXT)) checkDependenciesProbe.cache.clear?.();
  return n;
}
//@ chunk-fq0cr76a.js:1015221-1015289 placement
function cachedDependencyProbe() {
  return getSandboxAdapterState().checkDependenciesProbe.cache.get(undefined);
}
//@ chunk-fq0cr76a.js:1015289-1015643 placement
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
  let y = await SandboxManager_2.checkDependenciesAsync({
    command: rgPath,
    args: rgArgs,
  });
  let b = withWindowsSandboxRemedy(y);
  if (dependencyProbeGeneration === sandboxAdapterState.dependencyProbeGeneration)
    sandboxAdapterState.checkDependenciesProbe.cache.set(undefined, b);
  return b;
}
//@ chunk-fq0cr76a.js:1015643-1015686 placement
var SANDBOX_CONFIG_UNAVAILABLE_TEXT = "sandbox configuration unavailable";
//@ chunk-fq0cr76a.js:1015686-1015782 placement
function withWindowsSandboxRemedy(e) {
  return {
    ...e,
    errors: e.errors.map((error) => describeWindowsSandboxRemedy(error)),
    warnings: e.warnings.map((warning) => describeWindowsSandboxRemedy(warning)),
  };
}
//@ chunk-fq0cr76a.js:1015782-1016125 placement
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
//@ chunk-fq0cr76a.js:1016125-1016391 fingerprint = checkDependencies (0.632)
/**
 * 检查沙箱依赖（ripgrep 路径交给 sandbox-runtime 的 checkDependencies），Linux/WSL 在运行时未初始化时额外试跑一次 bubblewrap。
 */
function checkDependencies_2() {
  let sandboxRuntimeSeeded = ensureSandboxRuntimeSeeded();
  if (sandboxRuntimeSeeded) return sandboxRuntimeSeeded;
  let { rgPath, rgArgs } = ripgrepCommand();
  let s = SandboxManager_2.checkDependencies({
    command: rgPath,
    args: rgArgs,
  });
  let h = withWindowsSandboxRemedy(s);
  let platform = getPlatform();
  if (
    (platform === "linux" || platform === "wsl") &&
    h.errors.length === 0 &&
    !getSandboxAdapterState().runtimeInitialized
  ) {
    let b = checkAppArmorUserNamespaces(linuxSandboxProbes(sandboxBinaryPath));
    if (b !== undefined)
      return {
        ...h,
        errors: [b],
      };
  }
  return h;
}
//@ chunk-fq0cr76a.js:1016391-1016520 placement
/**
 * 是否被强制开启沙箱：管理员强制下用户设置 enabled=true，或 GrowthBook disableNoSandbox 且当前不在 scrub/IS_SANDBOX/bubblewrap 环境里。
 */
function shouldForceSandboxOn() {
  if (isUserSandboxEnableMandated()) return true;
  if (!getSandboxGbConfig().disableNoSandbox) return false;
  return !isScrubEnabled() && !isEnvTruthy(env.IS_SANDBOX) && !envDynamicProbe.getIsBubblewrapSandbox();
}
//@ chunk-fq0cr76a.js:1016520-1016662 fingerprint = getSandboxEnabledSetting (1)
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
//@ chunk-fq0cr76a.js:1016662-1016702 placement
/**
 * CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 打开、scrub 沙箱可用、且用户没开沙箱时，强制用 scrub 沙箱。
 */
function isScrubOnlySandboxMode() {
  return isScrubEnabled() && isScrubSandboxAvailable() && !getSandboxEnabledSetting();
}
//@ chunk-fq0cr76a.js:1016702-1016745 placement
function isAutoAllowSupported() {
  return !isScrubEnabled() && getPlatform() !== "windows";
}
//@ chunk-fq0cr76a.js:1016745-1016829 fingerprint = isAutoAllowBashIfSandboxedEnabled (1)
/**
 * sandbox.autoAllowBashIfSandboxed（默认 true）；scrub 模式或 Windows 下不支持。
 */
function isAutoAllowBashIfSandboxedEnabled() {
  if (!isAutoAllowSupported()) return false;
  return getSettings_DEPRECATED()?.sandbox?.autoAllowBashIfSandboxed ?? true;
}
//@ chunk-fq0cr76a.js:1016829-1016944 fingerprint = areUnsandboxedCommandsAllowed (0.749)
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
//@ chunk-fq0cr76a.js:1016944-1017141 layout
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
//@ chunk-fq0cr76a.js:1017141-1017246 layout
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
//@ chunk-fq0cr76a.js:1017246-1017371 layout
function isUserFailIfUnavailableUnderMandate() {
  return (
    !hasTrustedSandboxSetting("failIfUnavailable") &&
    isSettingSourceEnabled("userSettings") &&
    getSettingsForSource("userSettings")?.sandbox?.failIfUnavailable === true &&
    isAdminSandboxMandate()
  );
}
//@ chunk-fq0cr76a.js:1017371-1017454 layout = _temp9 (0.769)
function hasTrustedSandboxSetting(a_4) {
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (n) => n?.sandbox?.[a_4] !== undefined,
  );
}
//@ chunk-fq0cr76a.js:1017454-1017705 callgraph-fingerprint = convertToSandboxRuntimeConfig (0.269)
/**
 * 可信层（托管/--settings）有网络限制：管理员强制、strictAllowlist、deniedDomains 或 WebFetch(domain:) 的 deny 规则。
 */
function hasTrustedNetworkRestrictions() {
  if (isAdminSandboxMandate() || isStrictNetworkAllowlistConfigured()) return true;
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (source) =>
      (source?.sandbox?.network?.deniedDomains?.length ?? 0) > 0 ||
      (source?.permissions?.deny ?? []).some((n) => {
        let sourceSettings = parseRuleForSandbox(n);
        return (
          sourceSettings.toolName === WEBFETCH && sourceSettings.ruleContent?.startsWith("domain:") === true
        );
      }),
  );
}
//@ chunk-fq0cr76a.js:1017705-1017958 layout
/**
 * 可信层（policy、--settings）是否配置了读禁止：sandbox.filesystem.denyRead、credentials.files 或带内容的 Read(...) deny 规则。决定是否需要解析读禁止根。
 */
function hasTrustedReadDenies() {
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (e) =>
      (e?.sandbox?.filesystem?.denyRead?.length ?? 0) > 0 ||
      (e?.sandbox?.credentials?.files?.length ?? 0) > 0 ||
      (e?.permissions?.deny ?? []).some((n) => {
        let ruleForSandbox = parseRuleForSandbox(n);
        return ruleForSandbox.toolName === FILE_READ_TOOL_NAME && ruleForSandbox.ruleContent !== undefined;
      }),
  );
}
//@ chunk-fq0cr76a.js:1017958-1018308 layout
/**
 * 收集非 project/local 层的读禁止根：sandbox.credentials.files、Read(...) deny 规则、sandbox.filesystem.denyRead，解析为规范路径。
 */
function getTrustedReadDenyRoots() {
  let e = [];
  for (let n of SETTING_SOURCES) {
    if (n === "projectSettings" || n === "localSettings") continue;
    let settingsForSourceTightenOnly = getSettingsForSourceTightenOnly(n);
    e.push(
      ...resolveSandboxPathPatterns(
        settingsForSourceTightenOnly?.sandbox?.credentials?.files?.map((file) => file.path),
        n,
        "deny",
      ),
    );
    if (!isSettingSourceEnabled(n)) continue;
    e.push(
      ...resolvePathEntries(
        groupRuleContentsByTool(settingsForSourceTightenOnly?.permissions?.deny, [FILE_READ_TOOL_NAME]).get(
          FILE_READ_TOOL_NAME,
        ),
        n,
        "deny",
        resolvePathPatternForSandbox,
      ),
      ...resolveSandboxPathPatterns(settingsForSourceTightenOnly?.sandbox?.filesystem?.denyRead, n, "deny"),
    );
  }
  return uniq(e.flatMap((n) => canonicalizeSandboxPath(n) ?? []));
}
//@ chunk-fq0cr76a.js:1018308-1018513 layout
/**
 * 解析读禁止根：以 (cwd, 条目) 为键缓存一个 tick 内的解析结果，返回内置可信禁止根加上每个条目的各种拼写（原样与经 realpath 的规范路径）。
 */
function resolveTrustedReadDenyRoots(e) {
  let n = jsonStringify([getCwdState(), e]);
  let trustedReadDenyRootResolution = getSandboxAdapterState().trustedReadDenyRootResolution;
  if (trustedReadDenyRootResolution?.key !== n)
    trustedReadDenyRootResolution = setTrustedReadDenyResolutionForTick({
      key: n,
      resolved: e.map((s) => resolveReadDenyRoot(s)),
    });
  return {
    roots: uniq([
      ...getBuiltinTrustedDenyRoots(),
      ...trustedReadDenyRootResolution.resolved.flatMap((s) => s.spellings),
    ]),
    resolution: trustedReadDenyRootResolution,
  };
}
//@ chunk-fq0cr76a.js:1018513-1018643 layout
function setTrustedReadDenyResolutionForTick(e) {
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.trustedReadDenyRootResolution = e;
  queueMicrotask(() => {
    sandboxAdapterState.trustedReadDenyRootResolution = undefined;
  });
  return e;
}
//@ chunk-fq0cr76a.js:1018643-1018669 layout
var READ_DENY_LOOK_BUDGET_MS = 15;
var READ_DENY_LOOK_MIN_ENTRIES = 16;
var READ_DENY_LOOK_THROTTLE_MS = 250;
//@ chunk-fq0cr76a.js:1018669-1019098 layout
/**
 * 把凭据遮罩的 glob 展开成具体路径（{lexical, canonical}）；位于禁区、或通配符不在最后一段、或叶子是裸 ** 时不展开只按字面参与，避免 readdir 被引导穿过未审查目录。
 */
function expandMaskGlob(globPath) {
  if (isOnForeignMount(globPath, getCwdState()) || rawPointerPathIsUnsafe(globPath, getCwdState())) return [];
  let parts = globPath.split("/");
  let r = parts.length - 1;
  if (parts.some((s, h) => h !== r && containsGlobChars(s)) || parts[r] === "**") {
    logForDebugging(
      `[sandbox] glob pattern '${globPath}' not expanded for the mask sweep: wildcards outside the final path component (or a bare '**' leaf) could steer the readdir walk through unvetted directories \u2014 the pattern participates lexically only`,
    );
    return [];
  }
  return expandGlobPattern(globPath).map((s) => ({
    lexical: s,
    canonical: canonicalizePathForMaskSweep(s),
  }));
}
//@ chunk-fq0cr76a.js:1019098-1019166 layout
/**
 * 把路径做大小写折叠并规整成以 / 开头、无空段的绝对形式，用于大小写不敏感比较。
 */
function toFoldedAbsolutePath(e) {
  return "/" + foldPathCase(e).split("/").filter(Boolean).join("/");
}
//@ chunk-fq0cr76a.js:1019166-1019881 layout
function getReadDenyReach() {
  let sandboxAdapterState = getSandboxAdapterState();
  let n = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (n === undefined || isWrapUnconfined(n))
    return {
      withinReach: () => false,
      bounded: false,
      complete: false,
      writeRootCount: 0,
    };
  let complete = !sandboxAdapterState.undecidableWrapThisSession && !isRemoteSessionAvailable();
  let s = [
    ...sandboxAdapterState.wrapBindableWriteRootsThisSession,
    ...sandboxAdapterState.wrapOutOfTreeTargetsThisSession,
  ];
  let h;
  return {
    withinReach: (b) => {
      let path = b.lookAgain?.stoppedAt?.path;
      let joined = [...b.spellings, path ?? ""].join("\x00");
      let R = sandboxAdapterState.readDenyRootWithinSandboxReach.get(joined);
      if (R !== undefined && R.writeRoots === s.length) return R.reachable;
      h ??= s.map(toFoldedAbsolutePath);
      let D = h;
      let any = [
        ...b.spellings.map((spelling) =>
          containsGlobChars(spelling) ? getGlobBaseDirectory_2(spelling) : spelling,
        ),
        ...(path === undefined ? [] : [path]),
      ]
        .map(toFoldedAbsolutePath)
        .some((L) => D.some((rule) => posixCovers(rule, L)));
      sandboxAdapterState.readDenyRootWithinSandboxReach.set(joined, {
        writeRoots: s.length,
        reachable: any,
      });
      return any;
    },
    bounded: true,
    complete,
    writeRootCount: s.length,
  };
}
//@ chunk-fq0cr76a.js:1019881-1020095 layout
function createReadDenyLookSelector(e, withinReach) {
  let sandboxAdapterState = getSandboxAdapterState();
  let readDenyRootLookCursor = sandboxAdapterState.readDenyRootLookCursor;
  let h = 0;
  let y;
  return {
    select: (b, S) => {
      if (S >= readDenyRootLookCursor && y === undefined) {
        if (h < READ_DENY_LOOK_MIN_ENTRIES || performance.now() - e < READ_DENY_LOOK_BUDGET_MS) {
          h++;
          return true;
        }
        y = S;
      }
      return withinReach(b);
    },
    finish: () => {
      sandboxAdapterState.readDenyRootLookCursor = y ?? 0;
    },
  };
}
//@ chunk-fq0cr76a.js:1020095-1020255 layout
function markLookAgainEntries(e, resolved, r) {
  return resolved.map((s, h) => {
    if (s.lookAgain !== undefined || e[h]?.lookAgain === undefined) return s;
    return r(s)
      ? {
          ...s,
          lookAgain: EMPTY_RESOLVE_STATUS,
        }
      : {
          ...s,
          settledUnwatched: true,
        };
  });
}
//@ chunk-fq0cr76a.js:1020255-1020314 layout
var EMPTY_RESOLVE_STATUS = {
  stoppedAt: undefined,
  throughLink: false,
  settledInReach: true,
};
//@ chunk-fq0cr76a.js:1020314-1020421 layout
function rewatchSettledEntries(e, n) {
  return e.map((r) =>
    r.settledUnwatched && n(r)
      ? {
          ...r,
          settledUnwatched: undefined,
          lookAgain: EMPTY_RESOLVE_STATUS,
        }
      : r,
  );
}
//@ chunk-fq0cr76a.js:1020421-1020730 layout
/**
 * 解析一个读禁止条目的根：glob 取基目录，经 canonicalizePathForMaskSweep 求规范路径，返回 {root, spellings:[原样, 规范], lookAgain}；路径未稳定或经过符号链接时 lookAgain 记录停在何处，供运行中复查。
 */
function resolveReadDenyRoot(e, n) {
  let r = containsGlobChars(e) ? getGlobBaseDirectory_2(e) : e;
  if (!e.startsWith(r))
    return {
      root: e,
      spellings: [e],
      lookAgain: undefined,
    };
  let s = {
    settled: false,
    stoppedAt: undefined,
    throughLink: false,
  };
  let h = canonicalizePathForMaskSweep(r, s, n);
  return {
    root: e,
    spellings: [e, h + e.slice(r.length)],
    lookAgain:
      s.settled && !s.throughLink
        ? undefined
        : {
            stoppedAt: s.stoppedAt,
            throughLink: s.throughLink,
          },
  };
}
//@ chunk-fq0cr76a.js:1020730-1020935 layout
/**
 * 与 resolveReadDenyRoot 相同但用于非 glob 的凭据遮罩路径：返回原样与规范两种拼写及是否需要复查。
 */
function resolveMaskPath(e, n) {
  let r = {
    settled: false,
    stoppedAt: undefined,
    throughLink: false,
  };
  let s = canonicalizePathForMaskSweep(e, r, n);
  return {
    root: e,
    spellings: [e, s],
    lookAgain:
      r.settled && !r.throughLink
        ? undefined
        : {
            stoppedAt: r.stoppedAt,
            throughLink: r.throughLink,
          },
  };
}
//@ chunk-fq0cr76a.js:1020935-1022055 layout
function relookReadDenyRoots(
  e,
  n = true,
  walkMemo = createWalkMemo(),
  s = resolveReadDenyRoot,
  h = () => true,
) {
  let cwdState = getCwdState();
  let b = 0;
  let S = 0;
  let w = [];
  let R = [];
  let D = new Set();
  let resolved = e.resolved.map((L, V) => {
    let lookAgain = L.lookAgain;
    if (lookAgain === undefined || !h(L, V)) return L;
    b++;
    if (lookAgain.settledInReach) {
      let Z = containsGlobChars(L.root) ? getGlobBaseDirectory_2(L.root) : L.root;
      if (!isOnForeignMount(Z, cwdState)) {
        let J = rawPointerPathWalk(Z, cwdState, walkMemo);
        if (!J.unsafe && !J.throughLink && J.stoppedAt === undefined) return L;
      }
    } else if (
      !lookAgain.throughLink &&
      lookAgain.stoppedAt !== undefined &&
      !isOnForeignMount(lookAgain.stoppedAt.path, cwdState)
    ) {
      let Z = rawPointerPathWalk(lookAgain.stoppedAt.path, cwdState, walkMemo);
      if (
        !Z.throughLink &&
        Z.stoppedAt?.path === lookAgain.stoppedAt.path &&
        Z.stoppedAt.kind === lookAgain.stoppedAt.kind
      )
        return L;
      D.add(lookAgain.stoppedAt.path);
    }
    let q = s(L.root, walkMemo);
    if (
      lookAgain.stoppedAt !== undefined &&
      (q.lookAgain?.stoppedAt?.path !== lookAgain.stoppedAt.path ||
        q.lookAgain?.stoppedAt?.kind !== lookAgain.stoppedAt.kind)
    )
      D.add(lookAgain.stoppedAt.path);
    if (
      q.spellings[1] !== L.spellings[1] ||
      q.lookAgain?.stoppedAt?.path !== lookAgain.stoppedAt?.path ||
      q.lookAgain?.stoppedAt?.kind !== lookAgain.stoppedAt?.kind ||
      (q.lookAgain?.throughLink ?? false) !== lookAgain.throughLink
    ) {
      S++;
      if (L.isMask) R.push(L.root);
      else w.push(...L.spellings, ...q.spellings);
    }
    return L.isMask
      ? {
          ...q,
          isMask: true,
        }
      : q;
  });
  if (S > 0 && n)
    setTrustedReadDenyResolutionForTick({
      key: e.key,
      resolved,
    });
  return {
    lookedAt: b,
    moved: S,
    resolved,
    movedSpellings: w,
    movedMaskPaths: R,
    changedStops: D,
  };
}
//@ chunk-fq0cr76a.js:1022055-1022327 layout
function mergeReadDenyLooks(e, n) {
  return {
    lookedAt: e.lookedAt + n.lookedAt,
    moved: e.moved + n.moved,
    resolved: n.resolved,
    movedSpellings: [...e.movedSpellings, ...n.movedSpellings],
    movedMaskPaths: [...e.movedMaskPaths, ...n.movedMaskPaths],
    changedStops: new Set([...e.changedStops, ...n.changedStops]),
  };
}
//@ chunk-fq0cr76a.js:1022327-1022831 layout
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
  let h =
    sandboxAdapterState.readDenyRootLookFinishedAt !== undefined &&
    startTime - sandboxAdapterState.readDenyRootLookFinishedAt < READ_DENY_LOOK_THROTTLE_MS;
  let y =
    installedReadDenyRootResolution.forwardedUntrustedGrants.length === 0 &&
    sandboxAdapterState.lateSymlinkGrantCandidates.length === 0 &&
    !(SandboxManager_2.getConfig()?.credentials?.files ?? []).some(
      (b) => b.mode === "mask" && !isSentinelOnlyMask(b),
    );
  if (!readDenyRootFirstLookDue && (h || y)) return;
  try {
    runReadDenyLook(installedReadDenyRootResolution, readDenyRootFirstLookDue);
  } finally {
    sandboxAdapterState.readDenyRootLookFinishedAt = performance.now();
  }
}
//@ chunk-fq0cr76a.js:1022831-1026260 layout
/**
 * 执行一次读禁止根复查：有路径改变落点时，首次则重建配置；会话中途则收窄运行中配置（丢弃落入禁止区的仓库授权、把受影响的凭据遮罩降为占位符），失败时记 pendingReadDenyFallback。
 */
function runReadDenyLook(installedReadDenyRootResolution, readDenyRootFirstLookDue) {
  let sandboxAdapterState = getSandboxAdapterState();
  let s;
  let h;
  let y = [];
  let b = [];
  let S = false;
  try {
    let walkMemo = createWalkMemo();
    let { withinReach, bounded, complete, writeRootCount } = getReadDenyReach();
    let K = bounded && complete;
    let q = K ? withinReach : () => true;
    if (!K || writeRootCount > sandboxAdapterState.readDenyRootReachSeenAtLook)
      installedReadDenyRootResolution = {
        resolution: installedReadDenyRootResolution.resolution && {
          key: installedReadDenyRootResolution.resolution.key,
          resolved: rewatchSettledEntries(installedReadDenyRootResolution.resolution.resolved, q),
        },
        forwardedUntrustedGrants: installedReadDenyRootResolution.forwardedUntrustedGrants,
        maskSweepEntries: rewatchSettledEntries(installedReadDenyRootResolution.maskSweepEntries, q),
        trustedDenyRoots: installedReadDenyRootResolution.trustedDenyRoots,
      };
    let Z = readDenyRootFirstLookDue ? undefined : createReadDenyLookSelector(performance.now(), withinReach);
    let J = Z?.select ?? (() => true);
    let ie = installedReadDenyRootResolution.resolution
      ? relookReadDenyRoots(
          installedReadDenyRootResolution.resolution,
          readDenyRootFirstLookDue,
          walkMemo,
          resolveReadDenyRoot,
          J,
        )
      : undefined;
    let ae = installedReadDenyRootResolution.resolution?.resolved.length ?? 0;
    let Se = new Set(
      readDenyRootFirstLookDue
        ? installedReadDenyRootResolution.resolution?.resolved
            .filter((Ie) => Ie.lookAgain !== undefined)
            .map((Ie) => Ie.root)
        : [],
    );
    let ue = relookReadDenyRoots(
      {
        key: "",
        resolved: installedReadDenyRootResolution.maskSweepEntries,
      },
      false,
      walkMemo,
      resolveMaskPath,
      (Ie, he) => !Se.has(Ie.root) && J(Ie, ae + he),
    );
    Z?.finish();
    let me = new Set([...(ie?.changedStops ?? []), ...ue.changedStops]);
    if (Z !== undefined && me.size > 0) {
      let Ie = (he) => he.lookAgain?.stoppedAt !== undefined && me.has(he.lookAgain.stoppedAt.path);
      if (ie !== undefined && installedReadDenyRootResolution.resolution !== undefined)
        ie = mergeReadDenyLooks(
          ie,
          relookReadDenyRoots(
            {
              key: installedReadDenyRootResolution.resolution.key,
              resolved: ie.resolved,
            },
            false,
            walkMemo,
            resolveReadDenyRoot,
            Ie,
          ),
        );
      ue = mergeReadDenyLooks(
        ue,
        relookReadDenyRoots(
          {
            key: "",
            resolved: ue.resolved,
          },
          false,
          walkMemo,
          resolveMaskPath,
          Ie,
        ),
      );
    }
    sandboxAdapterState.installedReadDenyRootResolution = {
      resolution:
        installedReadDenyRootResolution.resolution && ie
          ? {
              key: installedReadDenyRootResolution.resolution.key,
              resolved: markLookAgainEntries(
                installedReadDenyRootResolution.resolution.resolved,
                ie.resolved,
                q,
              ),
            }
          : undefined,
      forwardedUntrustedGrants: installedReadDenyRootResolution.forwardedUntrustedGrants,
      maskSweepEntries: markLookAgainEntries(
        installedReadDenyRootResolution.maskSweepEntries,
        ue.resolved,
        q,
      ),
      trustedDenyRoots: installedReadDenyRootResolution.trustedDenyRoots,
    };
    sandboxAdapterState.readDenyRootLookFailureReported = false;
    sandboxAdapterState.readDenyRootReachSeenAtLook = writeRootCount;
    let Ne = (ie?.lookedAt ?? 0) + ue.lookedAt;
    let Ce = (ie?.moved ?? 0) + ue.moved;
    if (Ce === 0) {
      if (readDenyRootFirstLookDue)
        logForDebugging(
          `[sandbox] Re-checked ${Ne} trusted read-deny or credential-mask path(s) that were unresolved or spelled through a symlink when the configuration was built: none changed`,
        );
      return;
    }
    logForDebugging(
      readDenyRootFirstLookDue
        ? `[sandbox] Re-checked ${Ne} trusted read-deny or credential-mask path(s) that were unresolved or spelled through a symlink when the configuration was built: ${Ce} resolve(s) differently now; rebuilding so repository grants and credential masks are re-checked`
        : `[sandbox] Re-checked ${Ne} trusted read-deny or credential-mask path(s) left unresolved or spelled through a symlink: ${Ce} resolve(s) differently than at the last look; checking which repository grants now lie inside one and which credential masks it now covers, to narrow the running config without a rebuild (a sandboxed command may still be running against its lists)`,
    );
    s = [...(ie?.resolved ?? []), ...ue.resolved];
    h = [...(ie?.movedSpellings ?? []), ...ue.movedSpellings];
    if (!readDenyRootFirstLookDue) {
      let Ie = [...(ie?.movedMaskPaths ?? []), ...ue.movedMaskPaths];
      if (Ie.length > 0) {
        let he = uniq([
          ...installedReadDenyRootResolution.trustedDenyRoots,
          ...s.filter((rt) => !rt.isMask).flatMap((rt) => rt.spellings),
        ]);
        let flattened = he.flatMap((rt) =>
          containsGlobChars(rt) ? expandMaskGlob(rt).map((ut) => ut.canonical) : [],
        );
        y = Ie.filter((rt) => pathsCoverPath([...he, ...flattened], rt));
      }
      b = uniq([
        ...uniq(h).flatMap((he) =>
          containsGlobChars(he) ? [he, ...expandMaskGlob(he).map((ft) => ft.canonical)] : he,
        ),
        ...y,
      ]);
    }
  } catch (error) {
    S = true;
    if (!sandboxAdapterState.readDenyRootLookFailureReported) {
      sandboxAdapterState.readDenyRootLookFailureReported = true;
      reportSandboxErrorUnderStandIn(
        error,
        readDenyRootFirstLookDue ? "readDeniesNotRecheckedFirst" : "readDeniesNotRecheckedLater",
      );
    }
  }
  let w = S ? "look-failed" : "later-command";
  if (readDenyRootFirstLookDue) {
    let R = tryBuildSandboxConfig();
    if (R !== undefined)
      try {
        installSandboxConfig(R);
        logForDebugging(
          S
            ? "Sandbox configuration rebuilt because trusted read-deny paths could not be re-checked"
            : "Sandbox configuration updated: a read-deny or credential-mask path now resolves somewhere other than where it did when the configuration was built",
        );
        return;
      } catch (error) {
        reportSandboxErrorUnderStandIn(error, "configNotInstalled");
      }
    if (!S) w = "rebuild-failed";
  }
  sandboxAdapterState.pendingReadDenyFallback = {
    look: installedReadDenyRootResolution,
    refreshed: s,
    cause: w,
    masksAtStake: w === "later-command" ? b : undefined,
  };
  applyPendingReadDenyFallback();
}
//@ chunk-fq0cr76a.js:1026260-1027770 layout
function applyPendingReadDenyFallback() {
  let sandboxAdapterState = getSandboxAdapterState();
  let pendingReadDenyFallback = sandboxAdapterState.pendingReadDenyFallback;
  if (pendingReadDenyFallback === undefined) return;
  sandboxAdapterState.lateSymlinkGrantDenyRoots = uniq([
    ...sandboxAdapterState.lateSymlinkGrantDenyRoots,
    ...(pendingReadDenyFallback.refreshed ?? []).flatMap((y) => y.spellings),
  ]);
  let r = dropForwardedUntrustedGrants(pendingReadDenyFallback.look, pendingReadDenyFallback.refreshed);
  let derived = r?.derived;
  let h = reduceMasksToPlaceholders(
    derived ?? assertMarkedPathsResolved(SandboxManager_2.getConfig()),
    pendingReadDenyFallback.masksAtStake,
  );
  if (h !== undefined) {
    derived = h.derived;
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
    if (r !== undefined && installedReadDenyRootResolution !== undefined) {
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
      grants_dropped: r?.removed ?? 0,
      masks_reduced: h?.reduced ?? 0,
    });
    if (r !== undefined)
      logForDebugging(
        pendingReadDenyFallback.refreshed
          ? `[sandbox] ${lead}: ${r.removed} repository grant(s) now inside a trusted read-deny path are dropped from the running configuration until the next configuration build (a settings change or restart) decides afresh`
          : `[sandbox] ${lead}: all ${r.removed} repository grant(s) are dropped from the running configuration until the next configuration build (a settings change or restart) decides afresh`,
      );
    if (h !== undefined)
      logForDebugging(
        `[sandbox] ${lead}: ${h.reduced} credential mask(s) a moved path may now cover are reduced to a whole-file placeholder with no credential injection until the next configuration build (a settings change or restart)`,
      );
  }
  sandboxAdapterState.pendingReadDenyFallback = undefined;
}
//@ chunk-fq0cr76a.js:1027770-1028075 layout
function reduceMasksToPlaceholders(e, masksAtStake) {
  let files = e?.credentials?.files;
  if (e === undefined || files === undefined) return;
  let s = 0;
  let files_2 = files.map((file) => {
    if (
      file.mode !== "mask" ||
      isSentinelOnlyMask(file) ||
      (masksAtStake !== undefined && !pathsCoverPath(masksAtStake, file.path))
    )
      return file;
    s++;
    return {
      path: file.path,
      mode: "mask",
      injectHosts: [],
    };
  });
  if (s === 0) return;
  return {
    derived: {
      ...e,
      credentials: {
        ...e.credentials,
        files: files_2,
      },
    },
    reduced: s,
  };
}
//@ chunk-fq0cr76a.js:1028075-1028672 layout
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
//@ chunk-fq0cr76a.js:1028672-1028807 layout
/**
 * 凭据遮罩条目是否只是占位：mode 为 mask、injectHosts 为空且没有其他字段。
 */
function isSentinelOnlyMask(e) {
  return (
    e.mode === "mask" &&
    e.injectHosts?.length === 0 &&
    Object.keys(e).every((key) => key === "path" || key === "mode" || key === "injectHosts")
  );
}
//@ chunk-fq0cr76a.js:1028807-1029471 layout
function dropForwardedUntrustedGrants(look, refreshed) {
  let r = assertMarkedPathsResolved(SandboxManager_2.getConfig());
  if (r === undefined) return;
  let s = refreshed && uniq([...getBuiltinTrustedDenyRoots(), ...refreshed.flatMap((D) => D.spellings)]);
  let h = {
    allowRead: new Set(),
    allowWrite: new Set(),
  };
  for (let { literal, list } of look.forwardedUntrustedGrants)
    if (s === undefined || pathsCoverPath(s, literal)) h[list].add(literal);
  let filtered = (r.filesystem.allowRead ?? []).filter((D) => !h.allowRead.has(D));
  let filtered_2 = r.filesystem.allowWrite.filter((D) => !h.allowWrite.has(D));
  let S =
    (r.filesystem.allowRead ?? []).length -
    filtered.length +
    (r.filesystem.allowWrite.length - filtered_2.length);
  if (S === 0) return;
  let w = {
    ...r,
    filesystem: {
      ...r.filesystem,
      allowRead: filtered,
      allowWrite: filtered_2,
    },
  };
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.builtConfigEnforcesAllowlist.set(
    w,
    sandboxAdapterState.installedFilterRequestEnforcesAllowlist,
  );
  return {
    derived: w,
    removed: S,
  };
}
//@ chunk-fq0cr76a.js:1029471-1029602 layout
/**
 * 内置的可信读禁止根（如 ~/.claude/seed-admin、IDE 锁文件目录等）的规范路径。
 */
function getBuiltinTrustedDenyRoots() {
  let e = [
    bridgeSpawnDir(),
    resolve(getClaudeConfigDir(), "seed-admin"),
    getBashEditDiffDir(),
    ...getIdeLockfilesPaths(),
    ...[],
  ];
  return uniq(
    e.flatMap((n) => [n, realpathOrParentRealpath(n)]).flatMap((n) => canonicalizeSandboxPath(n) ?? []),
  );
}
//@ chunk-fq0cr76a.js:1029602-1029744 layout
/**
 * 判断一组路径（可含 glob）是否覆盖目标路径：目标先规范化，glob 目标取基目录；同时比较原样与 realpath 拼写。
 */
function pathsCoverPath(e, n) {
  let r = canonicalizeSandboxPath(n);
  if (r === undefined || e.length === 0) return false;
  if (containsGlobChars(r)) {
    let globBaseDirectory = getGlobBaseDirectory_2(r);
    return anyGlobPathCovers(e, uniq([globBaseDirectory, canonicalizePathForMaskSweep(globBaseDirectory)]));
  }
  return anyDenyEntryCovers(e, uniq([r, canonicalizePathForMaskSweep(r)]));
}
//@ chunk-fq0cr76a.js:1029744-1029842 layout
/**
 * pathsCoverPath 的 glob 分支：列表中任一条目（glob 取基目录）与目标任一拼写互相包含即为覆盖（大小写折叠比较）。
 */
function anyGlobPathCovers(e, n) {
  return e.some((r) => {
    let s = containsGlobChars(r) ? getGlobBaseDirectory_2(r) : r;
    return n.some((h) => denyEntryCoversFolded(s, h) || denyEntryCoversFolded(h, s));
  });
}
//@ chunk-fq0cr76a.js:1029842-1029901 layout
function anyDenyEntryCovers(e, n) {
  return e.some((r) => n.some((s) => denyEntryCoversFolded(r, s)));
}
//@ chunk-fq0cr76a.js:1029901-1030007 layout
/**
 * 按进程 cwd 把沙箱路径解析成绝对路径；Windows 去掉尾部 /**，其他平台规整；失败返回 undefined。
 */
function canonicalizeSandboxPath(e) {
  try {
    let againstProcessCwd = resolveAgainstProcessCwd(e);
    return getPlatform() === "windows"
      ? againstProcessCwd.replace(/(?:[/\\]\*\*)+$/, "")
      : removeTrailingGlobSuffix(againstProcessCwd);
  } catch {
    return;
  }
}
//@ chunk-fq0cr76a.js:1030007-1030040 layout
function resolveAgainstProcessCwd(e) {
  return expandPath(e, safeProcessCwd());
}
//@ chunk-fq0cr76a.js:1030040-1030098 layout
function safeProcessCwd() {
  try {
    return process.cwd();
  } catch {
    return getOriginalCwd();
  }
}
//@ chunk-fq0cr76a.js:1030098-1030207 layout
/**
 * 门面 areUnsandboxedCommandsAllowed：沙箱未处于“开着但没在跑”、会话未禁用沙箱外命令、且未配置严格模式时为 true（允许 dangerouslyDisableSandbox 重试）。
 */
function areUnsandboxedCommandsAllowed() {
  return (
    !(getSandboxAdapterState().refusedOverWorkingFolder && isSandboxingEnabled()) &&
    !isOnButNotRunning() &&
    !getHostAgentPolicy().unsandboxedCommandsDisabled &&
    !isStrictSandboxModeConfigured()
  );
}
//@ chunk-fq0cr76a.js:1030207-1030264 layout
function isUnsandboxedForbiddenByGb() {
  return getSandboxGbConfig().forbidUnsandboxedCommands === true;
}
//@ chunk-fq0cr76a.js:1030264-1030323 layout
function isUnsandboxedFallbackClosedByTrustedTier() {
  return readSandboxSetting(["allowUnsandboxedCommands"]) === false;
}
//@ chunk-fq0cr76a.js:1030323-1030390 layout
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
//@ chunk-fq0cr76a.js:1030390-1030432 layout
setUserTempRoot(() => getSandboxGbConfig().requireSandboxedAttempt === true);
//@ chunk-fq0cr76a.js:1030432-1030521 fingerprint = isSandboxRequired (1)
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
//@ chunk-fq0cr76a.js:1030521-1030604 layout
/**
 * 平台是否支持沙箱：Windows 看 srt-win 是否可用，其他平台用 sandbox-runtime 自带的判断。
 */
function isSupportedPlatform() {
  if (getPlatform() === "windows") return isWindowsSandboxEnabled();
  return getSandboxAdapterState().baseIsSupportedPlatform();
}
//@ chunk-fq0cr76a.js:1030604-1030819 fingerprint = isPlatformInEnabledList (0.881)
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
//@ chunk-fq0cr76a.js:1030819-1030989 layout
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
//@ chunk-fq0cr76a.js:1030989-1031033 layout
function isRequiredSandboxStarted() {
  return getSandboxAdapterState().startedOnce && isSandboxRequired();
}
//@ chunk-fq0cr76a.js:1031033-1031096 file-local
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
//@ chunk-fq0cr76a.js:1031096-1031221 layout
/**
 * 沙箱“设置开着但没在运行”：必需却不可用，或（必需/工作目录被拒）且初始化失败但 isSandboxingEnabled 仍为真。UI 用来提示命令会被拒绝。
 */
function isOnButNotRunning() {
  if (isRequiredSandboxUnavailable()) return true;
  let sandboxAdapterState = getSandboxAdapterState();
  return (
    (isSandboxRequired() || sandboxAdapterState.refusedOverWorkingFolder) &&
    !isDiskless() &&
    sandboxAdapterState.initFailureReason !== undefined &&
    isSandboxingEnabled()
  );
}
//@ chunk-fq0cr76a.js:1031221-1031257 placement
/**
 * 沙箱出口是否受限：沙箱实际生效且不是仅 scrub 模式。
 */
function isSandboxEgressRestricted() {
  return isToolSandboxActive() && !isScrubOnlySandboxMode();
}
//@ chunk-fq0cr76a.js:1031257-1031477 placement
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
//@ chunk-fq0cr76a.js:1031477-1031501 placement
function isSandboxHostAllowlistEnforced() {
  return false;
}
//@ chunk-fq0cr76a.js:1031501-1031539 placement
function passesCheapSandboxGates() {
  return getSandboxEnabledSetting() && isPlatformInEnabledList() && isSupportedPlatform();
}
//@ chunk-fq0cr76a.js:1031539-1031863 placement
/**
 * Windows 沙箱需要重新安装时给出 {why, how}：版本过新指向文档，否则提示运行 /sandbox install 或 claude sandbox install。
 */
function describeWindowsSetupAgain(e) {
  let why = describeWindowsSandboxRemedy(e, {
    omitCcRemedy: true,
  }).replace(/\.$/, "");
  if (/set up by a newer release/.test(e))
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
//@ chunk-fq0cr76a.js:1031863-1031916 placement
function canRunSandboxInstallHere() {
  return !getIsNonInteractiveSession() && (!isSandboxRequired() || getSandboxAdapterState().startedOnce);
}
//@ chunk-fq0cr76a.js:1031916-1032055 placement
/**
 * 沙箱失败后的两句提示常量：“命令将在无沙箱下运行直到重启”和“沙箱命令将被拒绝直到重启”。
 */
var WITHOUT_SANDBOX_UNTIL_RESTART = "Commands run WITHOUT sandboxing until you restart Claude Code";
var REFUSED_UNTIL_RESTART = "Sandboxed commands are refused until you restart Claude Code";
//@ chunk-fq0cr76a.js:1032055-1032177 placement
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
//@ chunk-fq0cr76a.js:1032177-1032580 placement
function getSandboxRestartWarning() {
  let localBindingRestartMode = getLocalBindingRestartMode();
  if (localBindingRestartMode === undefined)
    return isRequiredSandboxUnavailable()
      ? `Sandbox cannot run: ${getSandboxUnavailableReason()?.replace(/^sandbox is enabled but (?:cannot start here: )?/, "")}. Sandboxed commands are refused until it can.`
      : undefined;
  return `Sandbox ${localBindingRestartMode === "refused" ? "cannot run" : "is off"}: sandbox.network.allowLocalBinding changed after this session started, and the sandbox was set up again for the new value. ${localBindingRestartMode === "refused" ? REFUSED_UNTIL_RESTART : WITHOUT_SANDBOX_UNTIL_RESTART}.`;
}
//@ chunk-fq0cr76a.js:1032580-1032808 placement
function getSandboxSetUpAgainWarning() {
  if (getPlatform() !== "windows" || !passesCheapSandboxGates()) return;
  let e = checkSandboxDependencies();
  let n = e.reinstallRequired ?? e.loopbackMismatch;
  if (n === undefined) return;
  let { why, how } = describeWindowsSetupAgain(n);
  return `Sandbox is off: ${why}. Commands run WITHOUT sandboxing until then \xB7 ${how}`;
}
//@ chunk-fq0cr76a.js:1032808-1033336 placement
function getProfileReadSecurityWarnings() {
  if (getPlatform() !== "windows") return [];
  return SandboxManager_2.getWindowsProfileReadWarnings()
    .filter((e) => e.code === "profile_exclusion_unprotected" || e.code === "profile_stale_allow")
    .map(
      (e) =>
        `Sandboxed commands can read ${e.paths.length} path(s) in your user profile that sandbox set-up ${e.code === "profile_stale_allow" ? "no longer means to open" : "excludes as credential stores"} and could not close: ${e.paths
          .slice(0, 5)
          .map((path) => path.path)
          .join(
            ", ",
          )}${e.paths.length > 5 ? ", \u2026" : ""}. Only their owner or an administrator can close them.`,
    );
}
//@ chunk-fq0cr76a.js:1033336-1034966 callgraph-witnessed = getSandboxUnavailableReason (0.196)
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
  let r = deps.reinstallRequired ?? deps.loopbackMismatch;
  if (r !== undefined) {
    let { why, how } = describeWindowsSetupAgain(r);
    return `sandbox is enabled but has to be set up again: ${why} \xB7 ${how}`;
  }
  if (deps.errors.length > 0) {
    let platform = getPlatform();
    let h = getIsNonInteractiveSession()
      ? "see https://code.claude.com/docs/en/sandboxing"
      : "run /sandbox for details";
    let any = deps.errors.some((error) => / not (installed|found)\b/.test(error));
    let b;
    if (platform === "macos") b = h;
    else if (platform === "windows")
      b =
        canRunSandboxInstallHere() && !deps.errors.some((error) => error.startsWith("srt-win"))
          ? areSandboxSettingsOverriddenByFlagOrPolicy()
            ? "run /sandbox install, more info at https://code.claude.com/docs/en/sandboxing"
            : `run /sandbox install, or ${h}`
          : "ask your administrator to install the network filters, or see https://code.claude.com/docs/en/sandboxing";
    else b = any ? `install missing tools (e.g. apt install bubblewrap socat) or ${h}` : h;
    let S =
      any || platform === "windows"
        ? "sandbox is enabled but dependencies are missing"
        : "sandbox is enabled but cannot start here";
    let joined = deps.errors.map((error) => describeWindowsSandboxRemedy(error)).join(", ");
    return b === h &&
      getIsNonInteractiveSession() &&
      joined.includes("https://code.claude.com/docs/en/sandboxing")
      ? `${S}: ${joined}`
      : `${S}: ${joined} \xB7 ${b}`;
  }
  return;
}
//@ chunk-fq0cr76a.js:1034966-1037219 layout
function buildMaskCredentialWarning(e) {
  let files = e.credentials?.files ?? [];
  let mapped = files.filter((file) => file.mode === "mask").map((file) => file.path);
  let s = new Set(
    files.filter((file) => file.mode === "mask" && file.injectHosts?.length === 0).map((file) => file.path),
  );
  let h = getPlatform() === "macos" && e.filesystem.disabled ? mapped : [];
  let y = new Set(h);
  let b = [
    ...(e.credentials?.envVars ?? [])
      .filter((R) => R.mode === "mask" && R.injectHosts?.length === 0)
      .map((R) => R.name),
    ...[...s].filter((R) => !y.has(R)),
  ];
  let S = [
    ...(e.credentials?.envVars ?? [])
      .filter((R) => R.mode === "mask" && R.injectHosts?.length !== 0)
      .map((R) => R.name),
    ...(h.length > 0 ? [] : mapped.filter((R) => !s.has(R))),
  ];
  let w = [];
  if (b.length > 0)
    w.push(
      `sandbox.credentials mask entries (${b.join(", ")}) have an ` +
        "empty injectHosts \u2014 sandboxed commands see only a sentinel and the " +
        "proxy never substitutes the real credential, so tools needing these will fail to authenticate. If the adapter forced this (a filesystem.allowRead entry re-opened a denied credential path), remove the conflicting allowRead entry or the deny; if a parent/managed settings tier supplied this mask, sentinel-only is its intended posture (that channel cannot grant injection, so an injectHosts set there is stripped on load) and the entry can only be removed in the parent settings; otherwise set injectHosts or remove the entry",
    );
  if (h.length > 0)
    w.push(
      `sandbox.credentials file mask entries (${h.join(", ")}) ` +
        "degrade to deny on macOS \u2014 the files are unreadable inside the " +
        'sandbox (no sentinel, no proxy injection), so tools reading them will fail. Note that switching them to mode "deny" would NOT keep that protection while the relaxed filesystem policy is active (denies ' +
        "are dropped there, exposing the real bytes) \u2014 set " +
        "sandbox.filesystem.disabled: false in user or managed settings (ignored if managed settings pin the filesystem layer), or remove the entries",
    );
  if (S.length > 0 && e.network.tlsTerminate === undefined && !e.credentials?.allowPlaintextInject)
    w.push(
      `sandbox.credentials mask entries (${S.join(", ")}) are configured ` +
        "but TLS termination is unavailable \u2014 sandboxed commands see only a " +
        "sentinel value and the proxy cannot substitute the real credential on egress, so tools needing these will fail to authenticate. Enable sandbox.network.tlsTerminate, or remove the mask entries",
    );
  return w.length > 0 ? w.join(" \xB7 ") : undefined;
}
//@ chunk-fq0cr76a.js:1037219-1037384 layout
/**
 * 计算凭据遮罩相关的安全警告文本；不满足触发条件或出错时返回 undefined（错误只记日志）。
 */
function getMaskCredentialWarning() {
  try {
    if (!canMaskCredentialWarningFire()) return;
    let e = assertMarkedPathsResolved(SandboxManager_2.getConfig());
    if (e === undefined) return;
    return buildMaskCredentialWarning(e);
  } catch (error) {
    logForDebugging(`Failed to compute mask credential warning: ${error}`);
    return;
  }
}
//@ chunk-fq0cr76a.js:1037384-1037441 layout
function canMaskCredentialWarningFire() {
  let e = isScrubEnabled() && true && isScrubSandboxAvailable();
  return (getSandboxEnabledSetting() || e) && isPlatformInEnabledList();
}
//@ chunk-fq0cr76a.js:1037441-1037949 fingerprint = getLinuxGlobPatternWarnings (0.952)
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
    let hasGlobs = (ruleContent, b) => {
      let S = unescapeGlobPattern(ruleContent);
      let w = ruleContent.startsWith("/") && !ruleContent.startsWith("//");
      let replaced = (b || w ? S.replace(/\/+$/, "") : S).replace(/\/\*\*$/, "");
      return containsGlobChars(replaced);
    };
    for (let [ruleString, b] of [
      ...(permissions.allow || []).map((S) => [S, false]),
      ...(permissions.deny || []).map((path) => [path, true]),
    ]) {
      let rule = parseRuleForSandbox(ruleString);
      if (
        (rule.toolName === FILE_EDIT_TOOL_NAME || rule.toolName === FILE_READ_TOOL_NAME) &&
        rule.ruleContent &&
        hasGlobs(rule.ruleContent, b)
      )
        warnings.push(ruleString);
    }
    return warnings;
  } catch (error) {
    logForDebugging(`Failed to get Linux glob pattern warnings: ${error}`);
    return [];
  }
}
//@ chunk-fq0cr76a.js:1037949-1038530 placement
/**
 * 找出沙箱网络 allow/deny 设置中写法有问题的 IPv6/主机条目（含 @、裸 IPv6、末尾多个点、方括号格式错误或端口非法），用于提示警告。
 */
function getInvalidIpv6DomainEntries() {
  try {
    let settings_DEPRECATED = getSettings_DEPRECATED();
    let n = [...(settings_DEPRECATED ? [settings_DEPRECATED] : []), ...getAllPolicyTierSettings()];
    let bad = new Set();
    for (let s of ["allow", "deny"])
      for (let entry of collectNetworkDomainEntries(n, s))
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
//@ chunk-fq0cr76a.js:1038530-1038926 placement
/**
 * 找出沙箱凭据注入主机（injectHosts）中写法有问题的 IPv6 条目（含多个冒号却不是规范 IPv6），用于提示警告。
 */
function getInvalidInjectHostEntries() {
  try {
    let settings_DEPRECATED = getSettings_DEPRECATED();
    let n = [...(settings_DEPRECATED ? [settings_DEPRECATED] : []), ...getAllPolicyTierSettings()];
    let r = new Set();
    for (let s of n) {
      let credentials = s.sandbox?.credentials;
      for (let y of [...(credentials?.envVars ?? []), ...(credentials?.files ?? [])])
        for (let b of y.injectHosts ?? []) {
          let index = b.indexOf(":");
          if (index === -1 || b.indexOf(":", index + 1) === -1) continue;
          if (isIP(b) === 6 && canonicalizeHost(b) === b.toLowerCase()) continue;
          r.add(b);
        }
    }
    return [...r];
  } catch (error) {
    logForDebugging(`Failed to get injectHosts entry warnings: ${error}`);
    return [];
  }
}
//@ chunk-fq0cr76a.js:1038926-1039022 placement = getEnabledSettingSources (0.863)
/**
 * flagSettings 或 policySettings 是否设置了指定的 sandbox 键。
 */
function isSandboxSettingOverriddenByPolicy(e) {
  return ["flagSettings", "policySettings"].some((n) => getSettingsForSource(n)?.sandbox?.[e] !== undefined);
}
//@ chunk-fq0cr76a.js:1039022-1039124 placement
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
//@ chunk-fq0cr76a.js:1039124-1039749 fingerprint = setSandboxSettings (0.67)
/**
 * 把 sandbox.enabled/autoAllowBashIfSandboxed/allowUnsandboxedCommands 写入 localSettings（只写变化项）。
 */
async function setSandboxSettings(options) {
  let { error } = await updateSettingsForSourceWithTransform("localSettings", (r) => {
    let s = {
      ...(options.enabled !== undefined &&
        r?.sandbox?.enabled !== options.enabled && {
          enabled: options.enabled,
        }),
      ...(options.autoAllowBashIfSandboxed !== undefined &&
        r?.sandbox?.autoAllowBashIfSandboxed !== options.autoAllowBashIfSandboxed && {
          autoAllowBashIfSandboxed: options.autoAllowBashIfSandboxed,
        }),
      ...(options.allowUnsandboxedCommands !== undefined &&
        r?.sandbox?.allowUnsandboxedCommands !== options.allowUnsandboxedCommands && {
          allowUnsandboxedCommands: options.allowUnsandboxedCommands,
        }),
    };
    if (Object.keys(s).length === 0) return null;
    return {
      sandbox: s,
    };
  });
  if (error) logFeatureBad("sandbox_set_settings", "save_failed");
  else logFeatureOk("sandbox_set_settings");
  return {
    error,
  };
}
//@ chunk-fq0cr76a.js:1039749-1040159 placement
/**
 * 门面 getExcludedCommands：合并设置的 sandbox.excludedCommands；管理员强制时只认可信层（托管、--settings、用户设置），并记一次被忽略条数。
 */
function getExcludedCommands() {
  let excludedCommands = getSettings_DEPRECATED()?.sandbox?.excludedCommands ?? [];
  if (!isAdminSandboxMandate()) return excludedCommands;
  let trustedExcludedCommands = getTrustedExcludedCommands();
  let sandboxAdapterState = getSandboxAdapterState();
  if (!sandboxAdapterState.droppedRepoExcludedCommandsLogged) {
    sandboxAdapterState.droppedRepoExcludedCommandsLogged = true;
    let s = new Set(trustedExcludedCommands);
    let h = count(excludedCommands, (y) => !s.has(y));
    if (h > 0)
      logForDebugging(
        `[sandbox] excludedCommands restricted to trusted settings tiers: ignoring ${h} sandbox.excludedCommands entr${h === 1 ? "y" : "ies"} not set by managed, --settings, or user settings`,
      );
  }
  return trustedExcludedCommands;
}
//@ chunk-fq0cr76a.js:1040159-1040270 placement
function getConfiguredNetworkAllowances() {
  if (isScrubOnlySandboxMode())
    return {
      ...ALLOW_ALL_UNIX_SOCKETS,
    };
  if (env.CLAUDE_CODE_EVAL_CONFINED) return {};
  return getNetworkAllowances(getSettings_DEPRECATED()?.sandbox?.network);
}
//@ chunk-fq0cr76a.js:1040270-1040322 placement
function isAllowAllUnixSocketsConfigured() {
  return getConfiguredNetworkAllowances().allowAllUnixSockets === true;
}
//@ chunk-fq0cr76a.js:1040322-1041044 placement
/**
 * 汇总各设置来源的 sandbox.filesystem.allowWrite/allowRead：管理员强制时丢弃不可信来源的写授权；落在可信读禁止区内或含 glob 的不可信授权被过滤；allowManagedReadPathsOnly 时 allowRead 只取托管层。
 */
function getConfiguredFilesystemGrants() {
  let e = isAdminSandboxMandate();
  let n = e || hasTrustedReadDenies();
  let r;
  let s = false;
  if (n)
    try {
      r = getTrustedReadDenyRoots();
    } catch {
      s = true;
    }
  let h;
  let y = () => (h ??= r ? resolveTrustedReadDenyRoots(r).roots : getBuiltinTrustedDenyRoots());
  let b = (D, O) => {
    if (!D.widensUntrusted) return false;
    if (s) return true;
    let L = y();
    try {
      let sandboxFilesystemPath = resolveSandboxFilesystemPath(O, D.source);
      let K = canonicalizeSandboxPath(sandboxFilesystemPath) ?? "";
      return (
        pathsCoverPath(L, sandboxFilesystemPath) ||
        (n && (containsGlobChars(K) || isNetworkSpelledGrantRoot(K)))
      );
    } catch {
      return true;
    }
  };
  let mapped = SETTING_SOURCES.filter((D) => isSettingSourceEnabled(D)).map((D) => ({
    source: D,
    widensUntrusted:
      isRepoSettingSource(D) || (D === "policySettings" && !isPolicySlotAdminOrParentComposed()),
    filesystem: getSettingsForSource(D)?.sandbox?.filesystem,
  }));
  let allPolicyTierSettings = getAllPolicyTierSettings();
  let any = allPolicyTierSettings.some(
    (policyTierSetting) => policyTierSetting.sandbox?.filesystem?.allowManagedReadPathsOnly === true,
  );
  return {
    allowWrite: uniq(
      mapped.flatMap((D) =>
        e && D.widensUntrusted ? [] : (D.filesystem?.allowWrite ?? []).filter((O) => !b(D, O)),
      ),
    ),
    allowRead: uniq(
      any
        ? allPolicyTierSettings.flatMap(
            (policyTierSetting) => policyTierSetting.sandbox?.filesystem?.allowRead ?? [],
          )
        : mapped.flatMap((D) => (D.filesystem?.allowRead ?? []).filter((O) => !b(D, O))),
    ),
  };
}
//@ chunk-fq0cr76a.js:1041044-1042843 placement
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
    let { initializationPromise: initializationPromise_2, realPathTwins } = getSandboxAdapterState();
    if (!initializationPromise_2 && realPathTwins === "listed") {
      getSandboxAdapterState().realPathTwins = "off";
      logForDebugging(
        `[sandbox] real-path twins are off until settings change: a start failed with them listed (${getSandboxAdapterState().initFailureCode})`,
        {
          level: "warn",
        },
      );
      await initializeSandbox();
    }
    await getSandboxAdapterState().initializationPromise;
    if (!getSandboxAdapterState().initializationPromise && getSandboxAdapterState().realPathTwins === "off")
      getSandboxAdapterState().realPathTwins = "listed";
    if (!getSandboxAdapterState().initializationPromise) {
      logFeatureBad("sandbox_exec", "sandbox_exec_not_initialized");
      let { initFailureReason } = getSandboxAdapterState();
      let h = initFailureReason ? `: ${initFailureReason}` : "";
      if (getSandboxAdapterState().refusedOverWorkingFolder)
        throw new SandboxInitFailedError(
          `Sandbox is enabled but failed to initialize${h}. Until the sandbox can start, commands that would run in it are refused.`,
        );
      if (isSandboxRequired() || (isScrubEnabled() && isScrubSandboxAvailable()))
        throw new SandboxInitFailedError(
          `Sandbox is required but failed to initialize${h}. ${getSandboxAdapterState().configBuildFailed ? "Fix the sandbox settings to retry (a --settings file is pinned for the process: restart)." : "Restart to retry."} Running it outside the sandbox (dangerouslyDisableSandbox) is not allowed either.`,
        );
      getSandboxAdapterState().sandboxDisabledThisSession = true;
      throw new SandboxInitFailedError(
        `Sandbox is enabled but failed to initialize${h}. Sandboxing is disabled for the rest of this session; restart to retry.`,
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
//@ chunk-fq0cr76a.js:1042843-1042958 placement
/**
 * 把 Windows 沙箱“命令行过长 / CreateProcessW 限制”错误转成友好的 SandboxCommandTooLongError，其他错误原样返回。
 */
function mapWindowsArgvTooLong(e) {
  return e instanceof Error && /Windows sandbox argv is|CreateProcessW limit/i.test(e.message)
    ? windowsArgvTooLongError()
    : e;
}
//@ chunk-fq0cr76a.js:1042958-1043751 placement
/**
 * 构造 Windows 沙箱命令过长（或环境变量过大）的错误，附处理建议并上报遥测。
 */
function windowsArgvTooLongError(tooLong = "command") {
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
//@ chunk-fq0cr76a.js:1043751-1044913 placement
/**
 * 把 Windows 沙箱特定退出码（1 拒绝访问、19 loopback 模式变更、16 映射网络盘 cwd）换成给模型看的说明文字。
 */
function classifyWindowsSandboxLaunchExit(code, stderr) {
  if (code === 1 && isSeclogonAccessDenied(stderr)) {
    getSandboxAdapterState().selfExecGrantAttempt = undefined;
    return "Windows refused to start Claude Code as the sandbox account (access denied, 0x80070005), so the command most likely did not run. The Secondary Logon service is not the cause. Claude Code tries to set the permission on its program file again before the next command, so try the command once more. If it fails the same way, stop and tell the user.";
  }
  if (code === 19 && parseWindowsSandboxError(stderr)?.code === "wfp_loopback_mismatch") {
    logFeatureBad("sandbox_exec", "windows_loopback_mode_changed");
    return "The command did not run: the sandbox on this machine was set up again with the other setting for local connections (sandbox.network.allowLocalBinding) since this session started, and a session keeps the one it started with. Every sandboxed command is refused like this one until Claude Code is restarted: tell the user to restart Claude Code.";
  }
  if (code !== 16) return;
  let windowsSandboxError = parseWindowsSandboxError(stderr);
  if (windowsSandboxError?.code !== "mapped_drive_cwd") return;
  logFeatureBad("sandbox_exec", "windows_mapped_drive_cwd");
  return `The sandbox can't run commands from a network drive${windowsSandboxError.drive ? ` (${windowsSandboxError.drive})` : ""}: mapped drives don't exist for the sandbox account. Use a workspace on a local drive.`;
}
//@ chunk-fq0cr76a.js:1044913-1045203 placement
function mapLinuxBridgeError(error) {
  if (error instanceof Error && /bridge socket does not exist/i.test(error.message)) {
    logFeatureSad("sandbox_exec", "sandbox_linux_bridge_dead");
    let n = /SOCKS/i.test(error.message) ? "SOCKS" : "HTTP";
    return new SandboxBridgeUnavailableError(
      `Linux sandbox ${n} bridge socket is missing (socat may have died). Restart to retry.`,
    );
  }
  return error;
}
//@ chunk-fq0cr76a.js:1045203-1045280 layout
/**
 * 把包装失败转成 commandNotWrapped 错误；若是本次 abort 的原因则原样返回。
 */
function toCommandNotWrappedError(e, n) {
  return n?.aborted && e === n.reason ? e : describeUnreadableSandboxError(e, "commandNotWrapped");
}
//@ chunk-fq0cr76a.js:1045280-1045432 fingerprint = wrapWithSandbox (0.558)
/**
 * 门面 wrapWithSandbox：ensureInitializedForWrap 后调用 sandbox-runtime 把命令串包成沙箱命令（macOS sandbox-exec 配置 / Linux bwrap+seccomp+socat 代理）。
 */
async function wrapWithSandbox_2(e, n, r, s, h) {
  await ensureInitializedForWrap();
  assertTaskOutputDirChainPlain();
  verifyStagedMcpCallDir();
  try {
    let y = await SandboxManager_2.wrapWithSandbox(e, n, r, s, h);
    logFeatureOk("sandbox_exec");
    return y;
  } catch (error) {
    throw toCommandNotWrappedError(mapLinuxBridgeError(error), s);
  }
}
//@ chunk-fq0cr76a.js:1045432-1046064 placement
/**
 * 门面 wrapWithSandboxArgv（Windows 唯一方式）：合并原生 deny 列表后调用 sandbox-runtime 得到 {argv, env}，再算出与当前环境的差异 env 与需 unset 的变量（含 credentials.envVars 的 deny 项）。
 */
async function wrapWithSandboxArgv(e, n, r, s, h) {
  await ensureInitializedForWrap();
  assertTaskOutputDirChainPlain();
  verifyStagedMcpCallDir();
  let y =
    getSandboxAdapterState().nativeDenies === undefined
      ? r
      : await raceAbortSignal(withRenewedNativeDenies(r), s);
  let b;
  try {
    b = await SandboxManager_2.wrapWithSandboxArgv(e, n, y, s, undefined, h);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "wfp_loopback_mismatch")
      error.message = describeWindowsSandboxRemedy(error.message);
    throw toCommandNotWrappedError(mapWindowsArgvTooLong(mapLinuxBridgeError(error)), s);
  }
  let S = new Set(Object.keys(b.env));
  let w = {};
  for (let [key, value] of Object.entries(b.env))
    if (value !== undefined && process.env[key] !== value) w[key] = value;
  let R = new Set();
  for (let key of Object.keys(process.env)) if (!S.has(key)) R.add(key);
  let credentials = SandboxManager_2.getConfig()?.credentials;
  for (let O of credentials?.envVars ?? []) if (O.mode === "deny") R.add(O.name);
  logFeatureOk("sandbox_exec");
  return {
    argv: b.argv,
    env: w,
    unsetEnv: [...R],
  };
}
//@ chunk-fq0cr76a.js:1046064-1046071 placement
var taskOutputDirChainRoot;
//@ chunk-fq0cr76a.js:1046071-1046343 placement
function assertTaskOutputDirChainPlain() {
  let e = taskOutputDirChainRoot;
  if (e === undefined) return;
  if (!ensurePrivateDirChain(getClaudeTempDirRealpath(), e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sandbox: the task output directory chain under the temp root is no longer plain directories (${e}); refusing to run sandboxed commands until it is restored`,
      "sandbox task output dir chain not plain",
    );
}
//@ chunk-fq0cr76a.js:1046343-1046350 placement
var mcpCallTempRoot;
//@ chunk-fq0cr76a.js:1046350-1046440 placement
/**
 * 包装命令前检查暂存的 mcp_call 目录在 temp 根下仍是普通目录（必要时清掉文件）；不是则沙箱命令被拒。
 */
function verifyStagedMcpCallDir() {
  let e = mcpCallTempRoot;
  if (e === undefined) return true;
  if (isParentDirReal(e))
    try {
      unlinkSync(e);
    } catch {}
  return ensurePrivateDirChain(getClaudeTempDirRealpath(), e);
}
//@ chunk-fq0cr76a.js:1046440-1051128 placement
/**
 * 门面 initialize：构建配置 Q0(settings)（Windows 拒绝在家目录/配置目录下作工作目录）→ Windows 先确保自执行授权、原生 deny → SandboxManager.initialize；成功后订阅设置/插件目录/GrowthBook 变化以热更新配置（refreshConfig）；配置构建失败则等待设置变化再试。网络请求询问回调在 allowManagedDomainsOnly 时一律拒绝。
 */
async function initializeSandbox(e) {
  let sandboxAdapterState = getSandboxAdapterState();
  sandboxAdapterState.askCallback =
    e ?? (getPlatform() === "windows" ? sandboxAdapterState.askCallback : undefined);
  if (sandboxAdapterState.initializationPromise) return sandboxAdapterState.initializationPromise;
  if (sandboxAdapterState.configBuildFailed) return;
  if (!isSandboxingEnabled()) return;
  let { askCallback } = sandboxAdapterState;
  let s = askCallback
    ? async (hostPattern) => {
        if (shouldAllowManagedSandboxDomainsOnly()) {
          logForDebugging(
            `[sandbox] Blocked network request to ${hostPattern.host} (allowManagedDomainsOnly)`,
          );
          return false;
        }
        return askCallback(hostPattern);
      }
    : undefined;
  let h = false;
  sandboxAdapterState.initializationPromise = (async () => {
    let y;
    try {
      if (
        getPlatform() === "windows" &&
        isUnderGitHome(safeProcessCwd(), getGitHomeInfo(homedir(), userSettingsHomes()))
      )
        throw new WindowsSandboxError_2(HOME_AS_CWD_NOTE);
      y = convertToSandboxRuntimeConfig(getSettings_DEPRECATED());
    } catch (error) {
      h = true;
      recordSandboxInitFailure(error);
      if (!(error instanceof SandboxPathEntryError)) return;
      let sandboxAdapterState = getSandboxAdapterState();
      sandboxAdapterState.configBuildFailed = true;
      try {
        sandboxAdapterState.settingsSubscriptionCleanup?.();
        let w = false;
        let R = settingsChangeDetector.subscribe(() => {
          if (w) return;
          w = true;
          R();
          let sandboxAdapterState = getSandboxAdapterState();
          sandboxAdapterState.configBuildFailed = false;
          sandboxAdapterState.realPathTwins = "unlisted";
          if (sandboxAdapterState.settingsSubscriptionCleanup === R)
            sandboxAdapterState.settingsSubscriptionCleanup = undefined;
        });
        sandboxAdapterState.settingsSubscriptionCleanup = R;
      } catch (error) {
        sandboxAdapterState.configBuildFailed = false;
        sandboxAdapterState.settingsSubscriptionCleanup = undefined;
        reportSandboxErrorUnderStandIn(error, "settingsWatchNotArmed");
      }
      return;
    }
    try {
      getSandboxAdapterState().initializedWithTlsTerminate = y.network?.tlsTerminate !== undefined;
      getSandboxAdapterState().installsSinceInitializeStartedAllEnforce = true;
      let b = false;
      let S = () => {
        b = true;
      };
      let w = [
        settingsChangeDetector.subscribe(S),
        onProducerDirsChanged.subscribe(S),
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
            for (let Ne of EXIT_SIGNALS) process.prependListener(Ne, announceWindowsPermissionRemoval);
          }
          ensureAtomicWriteStagingDirs();
          await ensureBridgeSpawnRootDir();
          let getUserStatus = io(checkWindowsSandboxRuntime);
          await ensureSelfExecGrant(getUserStatus);
          await grantParentFoldersToSandboxGroup({
            project: getOriginalCwd(),
            home: homedir(),
            configHomes: userSettingsHomes(),
            getUserStatus,
          });
        }
        let runtimeWasUp = getSandboxAdapterState().nativeDenies !== undefined;
        let ue = getPlatform() === "windows" ? await installWindowsNativeDenies(y) : undefined;
        adoptReadDenyRootResolution(y);
        if (ue === undefined) {
          if (getSandboxAdapterState().storedDenyListsMayBeShort) installSandboxConfig(y);
          await initializeSandboxRuntime(y, s);
        } else
          await initializeWithStandingDenies({
            runtimeConfig: y,
            standing: ue,
            callback: s,
            runtimeWasUp,
          });
      } finally {
        for (let Se of w) Se();
        getProcessSandboxState().windowsStartBeganAtMs.setState(() => null);
      }
      let sandboxAdapterState = getSandboxAdapterState();
      sandboxAdapterState.installedFilterRequestEnforcesAllowlist =
        (sandboxAdapterState.builtConfigEnforcesAllowlist.get(y) ?? false) &&
        sandboxAdapterState.installsSinceInitializeStartedAllEnforce;
      sandboxAdapterState.refusedOverWorkingFolder = false;
      sandboxAdapterState.initFailureReason = undefined;
      sandboxAdapterState.gbHostRulesApplied =
        sandboxAdapterState.builtConfigGbHostRules.get(y) ?? sandboxAdapterState.gbHostRulesApplied;
      sandboxAdapterState.sshStoreDenyApplied =
        sandboxAdapterState.builtConfigSshStoreDenied.get(y) ?? sandboxAdapterState.sshStoreDenyApplied;
      sandboxAdapterState.pluginToolStagingDenyApplied =
        sandboxAdapterState.builtConfigPluginToolStagingDenied.get(y) ??
        sandboxAdapterState.pluginToolStagingDenyApplied;
      sandboxAdapterState.patternWriteDenyTwinsApplied =
        sandboxAdapterState.builtConfigPatternWriteDenyTwins.get(y) ??
        sandboxAdapterState.patternWriteDenyTwinsApplied;
      sandboxAdapterState.unlistableWorktreesDenyApplied =
        sandboxAdapterState.builtConfigUnlistableWorktreesDenied.get(y) ??
        sandboxAdapterState.unlistableWorktreesDenyApplied;
      sandboxAdapterState.nestedGitConfigLockDenyApplied =
        sandboxAdapterState.builtConfigNestedGitConfigLockDeny.get(y) ??
        sandboxAdapterState.nestedGitConfigLockDenyApplied;
      sandboxAdapterState.startedOnce = true;
      if (getPlatform() === "windows") {
        sandboxAdapterState.windowsLoopbackAtStart = y.network.allowLocalBinding === true;
        logForDebugging(
          `[sandbox] Windows: the user profile is ${SandboxManager_2.getWindowsProfileRead() === "granted" ? "readable to sandboxed commands, minus credential stores (set-up granted it)" : "not readable to sandboxed commands (no profile read grant)"}`,
        );
        for (let Se of SandboxManager_2.getWindowsProfileReadWarnings())
          logForDebugging(`[sandbox] Windows profile read grant: ${Se.message}`, {
            level: "warn",
          });
      }
      if (getPlatform() !== "windows") getSandboxAdapterState().checkDependenciesProbe.cache.clear?.();
      getSandboxAdapterState().settingsSubscriptionCleanup?.();
      let D = (Se) => {
        let ue = tryBuildSandboxConfig();
        if (ue === undefined) return false;
        installSandboxConfig(ue);
        logForDebugging(`Sandbox configuration updated from ${Se}`);
        return true;
      };
      let O = settingsChangeDetector.subscribe(() => {
        getSandboxAdapterState().realPathTwins = "unlisted";
        D("settings change");
      });
      let L = onProducerDirsChanged.subscribe(() => {
        D("a plugin producer directory");
      });
      let V = setDenyJoinedPluginRoot(() => {
        if (getPlatform() === "windows") {
          logFeatureSad("sandbox_exec", "plugin_dir_join_refused_windows");
          return "stamped_at_start";
        }
        let Se = false;
        try {
          Se = D("a plugin folder joining the session");
        } catch (error) {
          reportSandboxErrorUnderStandIn(error, "configNotRebuiltForPluginFolder");
        }
        if (!Se) {
          logFeatureSad("sandbox_exec", "plugin_dir_join_refused");
          return "rebuild_failed";
        }
        return "installed";
      });
      let K = () => {};
      let q = onGrowthBookRefresh(() => {
        if (isSshStoreWriteDenyEnabled() !== getSandboxAdapterState().sshStoreDenyApplied)
          D("a GrowthBook change to the write block on claude ssh binaries");
      });
      let Z = onGrowthBookRefresh(() => {
        if (isPluginToolStagingDenyEnabled() !== getSandboxAdapterState().pluginToolStagingDenyApplied)
          D("a feature-flag change to the write block on the staged mcp_call directory");
      });
      let J = onGrowthBookRefresh(() => {
        if (isPatternWriteDenyTwinsEnabled() !== getSandboxAdapterState().patternWriteDenyTwinsApplied)
          D("a GrowthBook change to the switch for write-deny patterns through symlinks");
      });
      let ie = onGrowthBookRefresh(() => {
        if (isUnlistableWorktreesDenyEnabled() !== getSandboxAdapterState().unlistableWorktreesDenyApplied)
          D("a GrowthBook change to the write block on an unreadable .git/worktrees");
      });
      let ae = onGrowthBookRefresh(() => {
        let nestedGitConfigLockDenyApplied = getSandboxAdapterState().nestedGitConfigLockDenyApplied;
        if (
          nestedGitConfigLockDenyApplied !== undefined &&
          isNestedGitConfigLockDenyEnabled() !== nestedGitConfigLockDenyApplied
        )
          D("a GrowthBook refresh of the nested .git/config.lock kill switch");
      });
      getSandboxAdapterState().settingsSubscriptionCleanup = () => {
        O();
        L();
        V();
        K();
        q();
        Z();
        J();
        ie();
        ae();
      };
      if (b)
        try {
          D("a change that arrived during sandbox startup");
        } catch (error) {
          reportSandboxErrorUnderStandIn(error, "configChangeAtStartNotApplied");
        }
      getSandboxAdapterState().runtimeInitialized = true;
      getSandboxAdapterState().readDenyRootFirstLookDue = true;
      logFeatureOk("sandbox_init");
    } catch (error) {
      h = true;
      recordSandboxInitFailure(error);
    }
  })();
  if (h) {
    sandboxAdapterState.initializationPromise = undefined;
    return;
  }
  return sandboxAdapterState.initializationPromise;
}
//@ chunk-fq0cr76a.js:1051128-1051353 placement
var WINDOWS_START_NOTICE = "Starting the sandbox\u2026 Setting file permissions can take a few minutes.";
var WINDOWS_PERMISSION_REMOVAL_NOTICE =
  "Removing this session's sandbox file permissions\u2026 This can take a few minutes. Don't close this window.";
var EXIT_SIGNALS = ["SIGINT", "SIGTERM"];
//@ chunk-fq0cr76a.js:1051353-1051402 placement
function windowsSandboxStartStore() {
  return getProcessSandboxState().windowsStartBeganAtMs;
}
//@ chunk-fq0cr76a.js:1051402-1051522 placement
function announceWindowsPermissionRemoval() {
  let sandboxAdapterState = getSandboxAdapterState();
  if (!sandboxAdapterState.permissionRemovalAnnounced && sandboxAdapterState.sandboxRuntimeIsUp) {
    sandboxAdapterState.permissionRemovalAnnounced = true;
    writeStderrNotice(WINDOWS_PERMISSION_REMOVAL_NOTICE);
  }
}
//@ chunk-fq0cr76a.js:1051522-1051588 placement
function writeStderrNotice(e) {
  try {
    if (process.stderr.isTTY)
      writeSync(
        2,
        `${e}
`,
      );
  } catch {}
}
//@ chunk-fq0cr76a.js:1051588-1051628 placement
function checkWindowsSandboxRuntime() {
  return getWindowsSandboxUserStatusAsync({
    srtWin: rgRunner(),
  });
}
//@ chunk-fq0cr76a.js:1051628-1051852 placement
async function ensureSelfExecGrant(getUserStatus = checkWindowsSandboxRuntime) {
  let sandboxAdapterState = getSandboxAdapterState();
  let { selfExecGrantAttempt, dependencyProbeGeneration } = sandboxAdapterState;
  let h = await grantExecutableReadToSandboxGroup({
    exePath: process.execPath,
    previous: selfExecGrantAttempt,
    getUserStatus,
  });
  if (
    h !== selfExecGrantAttempt &&
    dependencyProbeGeneration === sandboxAdapterState.dependencyProbeGeneration
  )
    sandboxAdapterState.selfExecGrantAttempt = h;
}
//@ chunk-fq0cr76a.js:1051852-1051896 placement
function denySinglePath(e) {
  return expandWindowsFsPaths([e], {
    mode: "deny",
  });
}
//@ chunk-fq0cr76a.js:1051896-1052708 placement
async function installWindowsNativeDenies(e) {
  let nativeDenies = getSandboxAdapterState().nativeDenies;
  try {
    let sandboxUserStatus = getSandboxUserStatus();
    let s = getSandboxAdapterState().builtConfigConfiguredDenies.get(e);
    if (sandboxUserStatus === undefined || s === undefined) return;
    if (env.CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN) {
      logFeatureSad("sandbox_windows_native_denies", "switched_off", {
        at_start: true,
      });
      return;
    }
    let h = {
      write: sandboxUserStatus,
      user: await getWindowsSandboxUserStatusAsync({
        srtWin: rgRunner(),
      }),
      grantRoots: expandWindowsFsPaths([...e.filesystem.allowWrite, ...(e.filesystem.allowRead ?? [])], {
        mode: "grant",
      }),
    };
    let y = await writeWindowsDenyEntries({
      ...h,
      lists: e.filesystem,
      configured: s,
      atStart: true,
      expand: denySinglePath,
    });
    if (nativeDenies !== undefined)
      getSandboxAdapterState().nativeDenies = {
        ...nativeDenies,
        now: mergeNativeDenyState(nativeDenies.now, y, e.filesystem),
      };
    else if (hasAnyDeniedPath(y))
      getSandboxAdapterState().nativeDenies = {
        ...h,
        atStart: y,
        now: y,
      };
    return hasAnyDeniedPath(y) ? y : undefined;
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
//@ chunk-fq0cr76a.js:1052708-1053391 placement
async function initializeWithStandingDenies({ runtimeConfig, standing, callback, runtimeWasUp }) {
  let h = dropAppliedNativeDenies(runtimeConfig.filesystem, standing);
  try {
    installSandboxConfig(runtimeConfig);
    getSandboxAdapterState().storedDenyListsMayBeShort = true;
    let sandboxRuntime = initializeSandboxRuntime(
      {
        ...runtimeConfig,
        filesystem: h,
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
      reinstallIfDenyListsShort(runtimeConfig, h);
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
  reinstallIfDenyListsShort(runtimeConfig, h);
}
//@ chunk-fq0cr76a.js:1053391-1053466 placement
async function initializeSandboxRuntime(e, n) {
  await SandboxManager_2.initialize(e, n);
  getSandboxAdapterState().sandboxRuntimeIsUp = true;
}
//@ chunk-fq0cr76a.js:1053466-1053798 placement
/**
 * Windows 原生拒绝列表可能不完整时（安装失败或已存的列表与新配置不一致）标记并打点，然后重新安装沙箱配置。
 */
function reinstallIfDenyListsShort(runtimeConfig, n) {
  let filesystem = SandboxManager_2.getConfig()?.filesystem;
  let storedDenyListsMayBeShort = getSandboxAdapterState().storedDenyListsMayBeShort;
  let h = En(filesystem?.denyRead, n.denyRead) && En(filesystem?.denyWrite, n.denyWrite);
  if (!storedDenyListsMayBeShort && !h) return;
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
//@ chunk-fq0cr76a.js:1053798-1053995 placement
function raceAbortSignal(e, n) {
  return n === undefined
    ? e
    : new Promise((resolve, reject) => {
        let h = () => reject(n.reason);
        n.addEventListener("abort", h, {
          once: true,
        });
        if (n.aborted) h();
        e.then(resolve, reject).finally(() => n.removeEventListener("abort", h));
      });
}
//@ chunk-fq0cr76a.js:1053995-1054420 placement
async function withRenewedNativeDenies(e) {
  let nativeDenyRenewals = getSandboxAdapterState().nativeDenyRenewals;
  let r = await (nativeDenyRenewals.queued ??
    (nativeDenyRenewals.running === undefined
      ? renewNativeDeniesTracked()
      : (nativeDenyRenewals.queued = nativeDenyRenewals.running.then(renewNativeDenies, renewNativeDenies))));
  assertTaskOutputDirChainPlain();
  verifyStagedMcpCallDir();
  if (r === undefined) return e;
  let s = pendingDenies(r, "denyRead");
  let h = pendingDenies(r, "denyWrite");
  let filesystem = e?.filesystem;
  if (filesystem === undefined && s.length + h.length === 0) return e;
  let b = dropAppliedNativeDenies(
    filesystem ?? {
      denyRead: [],
      denyWrite: [],
      allowWrite: [],
    },
    r.now,
  );
  return {
    ...e,
    filesystem: {
      ...b,
      denyRead: uniq([...b.denyRead, ...s]),
      denyWrite: uniq([...b.denyWrite, ...h]),
    },
  };
}
//@ chunk-fq0cr76a.js:1054420-1054529 placement
function renewNativeDeniesTracked() {
  let nativeDenyRenewals = getSandboxAdapterState().nativeDenyRenewals;
  nativeDenyRenewals.running = renewNativeDenies_2().finally(() => {
    nativeDenyRenewals.running = undefined;
  });
  return nativeDenyRenewals.running;
}
//@ chunk-fq0cr76a.js:1054529-1054593 placement
function renewNativeDenies() {
  getSandboxAdapterState().nativeDenyRenewals.queued = undefined;
  return renewNativeDeniesTracked();
}
//@ chunk-fq0cr76a.js:1054593-1054680 placement
function pendingDenies(e, n) {
  return [...e.now[n]].filter(([r, s]) => s !== true && !wasDenyUnregistered(e, n, r)).map(([r]) => r);
}
//@ chunk-fq0cr76a.js:1054680-1054746 placement
function wasDenyUnregistered({ atStart }, n, r) {
  return atStart[n].has(r) && atStart[n].get(r) !== true;
}
//@ chunk-fq0cr76a.js:1054746-1054955 placement
function mergeDenyChanges(installedConfiguredDenies, atStart) {
  let r = [...atStart.denyRead, ...atStart.denyWrite];
  let s = new Set(r.filter(([, h]) => h).map(([h]) => h));
  return new Set([
    ...[...installedConfiguredDenies].filter((h) => !s.has(h)),
    ...r.filter(([h, y]) => y === undefined && !s.has(h)).map(([h]) => h),
  ]);
}
//@ chunk-fq0cr76a.js:1054955-1055378 placement
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
  let s = {
    ...nativeDenies,
    lists: filesystem,
    configured: mergeDenyChanges(installedConfiguredDenies, nativeDenies.atStart),
    atStart: false,
    expand: denySinglePath,
  };
  let h = await writeWindowsDenyEntries(s);
  let y = areAllNativeDeniesComplete(nativeDenies, h) ? h : await writeWindowsDenyEntries(s);
  if (!areAllNativeDeniesComplete(nativeDenies, y)) return failWindowsDenyRenewal();
  let b = {
    ...nativeDenies,
    now: mergeNativeDenyState(nativeDenies.now, y, filesystem),
  };
  if (getSandboxAdapterState().nativeDenies === nativeDenies) getSandboxAdapterState().nativeDenies = b;
  return b;
}
//@ chunk-fq0cr76a.js:1055378-1055425 placement
function areAllNativeDeniesComplete(nativeDenies, n) {
  return areNativeDeniesComplete(n, (r, s) => wasDenyUnregistered(nativeDenies, r, s));
}
//@ chunk-fq0cr76a.js:1055425-1055499 placement
function failWindowsDenyRenewal() {
  logFeatureBad("sandbox_exec", "windows_denies_not_renewed");
  throw new SandboxProtectionNotRenewedError();
}
//@ chunk-fq0cr76a.js:1055499-1055963 file-local
/**
 * 记录沙箱初始化失败：清空初始化 Promise 与运行时标志，保存错误码与给人看的原因（含自执行授权是否已加），标记是否因工作目录被拒，并上报 sandbox_init_failed。旧版名 initialize 错配。
 */
function recordSandboxInitFailure(sandboxAskCallback) {
  let settings = getSandboxAdapterState();
  settings.initializationPromise = undefined;
  settings.runtimeInitialized = false;
  settings.initializedWithTlsTerminate = false;
  settings.installedFilterRequestEnforcesAllowlist = false;
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
  settings.selfExecGrantAttempt = undefined;
  settings.refusedOverWorkingFolder = sandboxAskCallback instanceof WindowsSandboxError_2;
  logFeatureSad("sandbox_init", "sandbox_init_failed");
}
//@ chunk-fq0cr76a.js:1055963-1056061 placement
function needsRestartForTlsTerminate() {
  let sandboxAdapterState = getSandboxAdapterState();
  return (
    sandboxAdapterState.initializationPromise !== undefined &&
    !sandboxAdapterState.initializedWithTlsTerminate
  );
}
//@ chunk-fq0cr76a.js:1056061-1056198 placement
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
//@ chunk-fq0cr76a.js:1056198-1056315 placement
/**
 * 门面 refreshConfig：沙箱启用时重建配置并装入运行时（失败保留旧配置）。
 */
function refreshConfig() {
  if (getSandboxAdapterState().configBuildFailed) return false;
  if (!isSandboxingEnabled()) return true;
  let e = tryBuildSandboxConfig();
  if (e === undefined) return false;
  installSandboxConfig(e);
  return true;
}
//@ chunk-fq0cr76a.js:1056315-1056457 placement
async function resetSandbox() {
  sandboxAdapterState?.settingsSubscriptionCleanup?.();
  sandboxAdapterState = undefined;
  process.off("exit", announceWindowsPermissionRemoval);
  for (let e of EXIT_SIGNALS) process.off(e, announceWindowsPermissionRemoval);
  return SandboxManager_2.reset();
}
//@ chunk-fq0cr76a.js:1056457-1057166 placement = addToExcludedCommands (0.534)
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
  let s = isAdminSandboxMandate();
  if (s && !isSettingSourceEnabled("userSettings")) {
    logFeatureBad("sandbox_exclude_command", "user_settings_disabled");
    return {
      outcome: "refused",
      commandPattern,
    };
  }
  let h =
    (s || (getPlatform() === "windows" && SandboxManager.isStrictSandboxModeConfigured())) &&
    isSettingSourceEnabled("userSettings")
      ? "userSettings"
      : "localSettings";
  updateSettingsForSourceWithTransform(h, (y) => {
    let excludedCommands = y?.sandbox?.excludedCommands || [];
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
    settingsSource: h,
  };
}
//@ chunk-fq0cr76a.js:1057166-1057777 placement
/**
 * 沙箱命令结束后的清理：执行 scrub、复查标记，并在命令只写了自己的临时目录时决定是否推迟读禁止根复查。
 */
function afterSandboxedCommand(extra, n, r) {
  let sandboxAdapterState = getSandboxAdapterState();
  let readDenyRootLookFinishedAt = sandboxAdapterState.readDenyRootLookFinishedAt;
  sandboxAdapterState.readDenyRootLookFinishedAt = undefined;
  if (!r?.skipsScrubs) {
    scrubPlantedBareRepoIndicators(extra);
    scrubSymlinkedDenyPaths(n);
  }
  rescreenLateSymlinkGrants();
  if (r?.wroteOnlyItsOwnScratch) {
    let installedReadDenyRootResolution = sandboxAdapterState.installedReadDenyRootResolution;
    let filtered = [
      ...(installedReadDenyRootResolution?.resolution?.resolved ?? []),
      ...(installedReadDenyRootResolution?.maskSweepEntries ?? []),
    ].filter((D) => D.lookAgain !== undefined || D.settledUnwatched);
    if (filtered.length === 0) {
      sandboxAdapterState.readDenyRootLookFinishedAt = readDenyRootLookFinishedAt;
      return;
    }
    let S = splitBindableWriteRoots(getDefaultWritePaths(), new Set([getCwdState()]));
    let mapped = flattenWrapWriteRoots(S).map(toFoldedAbsolutePath);
    if (!(
      S.hasUndecidableEntry ||
      filtered.some((D) =>
        [...D.spellings, D.lookAgain?.stoppedAt?.path ?? D.root]
          .map((O) => toFoldedAbsolutePath(containsGlobChars(O) ? getGlobBaseDirectory_2(O) : O))
          .some((O) => mapped.some((rule) => posixCovers(rule, O))),
      )
    ))
      sandboxAdapterState.readDenyRootLookFinishedAt = readDenyRootLookFinishedAt;
  }
}
//@ chunk-fq0cr76a.js:1057777-1062179 placement = SandboxManager (0.43)
/**
 * Claude Code 侧的 SandboxManager 门面对象：汇总初始化、启用/必需判断、托管锁定、排除命令、网络与文件系统授权、wrapWithSandbox/wrapWithSandboxArgv、依赖检查、refreshConfig/reset 等；getConfig/getFsReadConfig 转发 vendor 的运行中配置并做额外处理。
 */
var SandboxManager = {
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
  isOnButNotRunning,
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
    let e = assertMarkedPathsResolved(SandboxManager_2.getConfig());
    if (e?.filesystem.disabled)
      return {
        denyOnly: e.filesystem.denyRead.map(removeTrailingGlobSuffix),
        allowWithinDeny: (e.filesystem.allowRead ?? []).map(removeTrailingGlobSuffix),
      };
    let sandboxAdapterState = getSandboxAdapterState();
    if (sandboxAdapterState.fsReadConfigMemo !== undefined && sandboxAdapterState.fsReadConfigMemo.cfg === e)
      return sandboxAdapterState.fsReadConfigMemo.result;
    let platform = getPlatform();
    let files = e?.credentials?.files ?? [];
    let mapped = files.filter((file) => file.mode === "deny").map((file) => file.path);
    if (
      (platform === "linux" || platform === "wsl") &&
      [...(e?.filesystem.denyRead ?? []), ...(e?.filesystem.allowRead ?? []), ...mapped].some((y) =>
        containsGlobChars(removeTrailingGlobSuffix(y)),
      )
    ) {
      let readDenyLists = buildReadDenyLists(e, mapped);
      sandboxAdapterState.fsReadConfigMemo = {
        cfg: e,
        result: readDenyLists,
      };
      return readDenyLists;
    }
    try {
      let fsReadConfig = SandboxManager_2.getFsReadConfig();
      sandboxAdapterState.fsReadConfigMemo = {
        cfg: e,
        result: fsReadConfig,
      };
      return fsReadConfig;
    } catch (error) {
      logForDebugging(`[sandbox] getFsReadConfig threw; falling back to raw deny lists: ${error}`);
      let readDenyLists = buildReadDenyLists(
        e,
        files.map((file) => file.path),
      );
      sandboxAdapterState.fsReadConfigMemo = {
        cfg: e,
        result: readDenyLists,
      };
      return readDenyLists;
    }
  },
  storedDenyListsMayBeShort: () => getSandboxAdapterState().storedDenyListsMayBeShort,
  getFsWriteConfig: () => {
    let e = assertMarkedPathsResolved(SandboxManager_2.getConfig());
    if (e?.filesystem.disabled)
      return {
        allowOnly: e.filesystem.allowWrite.map(removeTrailingGlobSuffix),
        denyWithinAllow: e.filesystem.denyWrite.map(removeTrailingGlobSuffix),
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
  cleanupAfterCommand: (e, n, r) => {
    SandboxManager_2.cleanupAfterCommand();
    afterSandboxedCommand(e, n, {
      wroteOnlyItsOwnScratch: r?.wroteOnlyItsOwnScratch,
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
//@ chunk-fq0cr76a.js:1062179-1062315 placement
function buildReadDenyLists(e, n) {
  return {
    denyOnly: uniq([...(e?.filesystem.denyRead ?? []), ...n].map(removeTrailingGlobSuffix)),
    allowWithinDeny: (e?.filesystem.allowRead ?? []).map(removeTrailingGlobSuffix),
  };
}
//@ chunk-fq0cr76a.js:1062315-1062348 placement
function isWithinOriginalCwd(e) {
  return isPathWithin(e, getOriginalCwd());
}
//@ chunk-fq0cr76a.js:1062348-1062386 placement
var PERSON_ROOT_MIN_BYTES = 2097152;
var PERSON_ROOT_OPTIONS = {
  isPersonsRoot: true,
};
//@ chunk-fq0cr76a.js:1062386-1062511 placement
function setDenyJoinedPluginRoot(e) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.denyJoinedPluginRoot = e;
  return () => {
    if (pluginRegistry.denyJoinedPluginRoot === e) pluginRegistry.denyJoinedPluginRoot = undefined;
  };
}
//@ chunk-fq0cr76a.js:1062511-1062667 placement
function beginSandboxBringUp() {
  let pluginRegistry = getPluginRegistry();
  let { promise, resolve } = Promise.withResolvers();
  pluginRegistry.sandboxBringUp = promise;
  return () => {
    if (pluginRegistry.sandboxBringUp === promise) pluginRegistry.sandboxBringUp = undefined;
    resolve();
  };
}
//@ chunk-fq0cr76a.js:1062667-1062865 placement
function createFileAtChain(e, ...n) {
  let r = READ_LIMITS | O_NOFOLLOW_ANY | constants.O_DIRECTORY | constants.O_NOFOLLOW;
  let s = [];
  try {
    let h = e;
    for (let y of n) {
      let b = openSync(h, r);
      s.push(b);
      h = `/proc/self/fd/${b}/${y}`;
    }
    closeSync(openSync(h, "wx"));
  } catch {
  } finally {
    for (let h of s) closeSync(h);
  }
}
//@ chunk-fq0cr76a.js:1062865-1064037 placement
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
      for (let w of filtered) {
        try {
          mkdirSync(`/proc/self/fd/${fd}/${w}`, {
            mode: 448,
          });
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") return false;
        }
        let R;
        try {
          R = openSync(
            `/proc/self/fd/${fd}/${w}`,
            PERSON_ROOT_MIN_BYTES | constants.O_DIRECTORY | constants.O_NOFOLLOW,
          );
        } catch {
          return false;
        }
        closeSync(fd);
        fd = R;
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
    let b = lstatSync(replaced);
    if (
      !b.isDirectory() ||
      (!isPersonsRoot &&
        getPlatform() !== "windows" &&
        process.getuid !== undefined &&
        b.uid !== process.getuid())
    )
      return false;
    if (!isPersonsRoot && getPlatform() !== "windows" && (b.mode & 18) !== 0) chmodSync(replaced, 448);
  } catch {
    return false;
  }
  for (let b of filtered) {
    replaced = join(replaced, b);
    try {
      mkdirSync(replaced, {
        mode: 448,
      });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") return false;
    }
    try {
      let S = lstatSync(replaced);
      if (!S.isDirectory() || S.isSymbolicLink()) return false;
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
//@ chunk-czffketc.js:1080-1176 placement
/**
 * hostIdentityMatches：主机身份是否一致。
 */
function hostIdentityMatches(hostPattern, e) {
  let n = normalizeDomainKey(`domain:${hostPattern}`);
  let i = normalizeDomainKey(`domain:${e}`);
  return n.includes("*") ? domainRuleMatches(n, i) : n === i;
}
//@ chunk-e6aww6q8.js:1909100-1909192 fingerprint = shouldAllowManagedReadPathsOnly (0.819)
/**
 * 任一托管/可信层设置了 sandbox.filesystem.allowManagedReadPathsOnly 时为真：allowRead 只认可信层。
 */
function shouldAllowManagedReadPathsOnly() {
  return getAllPolicyTierSettings().some((e) => e.sandbox?.filesystem?.allowManagedReadPathsOnly === true);
}
export {
  SandboxManager,
  isMisleadingConsentHost,
  windowsSandboxStartStore,
  isToolSandboxActive,
  sandboxHostGrantDestination,
  consentHostEntry,
  sandboxReadBlockApplies,
  isSandboxEgressRestricted,
  isSandboxHostAllowlistEnforced,
  areWindowsLocalConnectionsOn,
  resolveWindowsTlsTerminateCaSource,
  willSandboxTlsTerminate,
  REFUSED_UNTIL_RESTART,
  WITHOUT_SANDBOX_UNTIL_RESTART,
  shouldAllowManagedSandboxDomainsOnly,
  isInstalledWindowsTlsCaCurrent,
  shouldForceSandboxOn,
  addToExcludedCommands,
  SandboxPolicyRefusalError,
  getEffectiveFilesystemPolicy,
  isHostAllowedBySandboxNetworkPolicy,
  isFilesystemIsolationDisabledBySetting,
  isScrubOnlySandboxMode,
  isStrictPortSuffix,
  isSrtHostNameCharset,
  canonicalizationChangesHost,
  perCommandAllowsWithheld,
  getTrustedExcludedCommands,
  sandboxExportsChildTmpDir,
  denyEntryCovers,
  posixCovers,
  matchesGuardedGlob,
  matchesNameReading,
  nameReadingsOfGlobSpelling,
  shouldAllowManagedReadPathsOnly,
  isSandboxFilesystemPathRelative,
  resolveSandboxDenyReadEntry,
  resolveSandboxFilesystemPath,
  sandboxFilesystemPathAsReadEarlier,
  canonicalizePathForMaskSweep,
  perCommandNetworkListsForRuntime,
  SandboxUnavailableForShellError,
  windowsArgvTooLongError,
  classifyWindowsSandboxLaunchExit,
  addSandboxAllowWriteDirectory,
  removeSandboxAllowWriteDirectory,
  isNetworkSpelledGrantRoot,
  denyEntryCoversFolded,
  resolvePathPatternForSandboxAt,
  parseRuleForSandbox,
  resolveSandboxFilesystemPathAt,
  resolvePathPatternForSandbox,
  detectWorktreeGitCommonDir,
  isSandboxSettingOverriddenByPolicy,
  relatchTenguSandboxGbConfig,
};
