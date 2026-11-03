/**
 * utils/sandbox/sandbox-adapter.ts
 *
 * Claude Code 侧的沙箱适配层：把 settings（sandbox.*、Read/Edit/WebFetch 权限规则、托管策略）转成 @anthropic-ai/sandbox-runtime 配置，判定沙箱是否开启/必需/可用，初始化与热更新运行时，包装命令（wrapWithSandbox/wrapWithSandboxArgv），管理 excludedCommands、读禁止根复查与 Windows 原生 deny。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/sandbox/sandbox-adapter.ts
 * pieces: chunk-e6aww6q8.js (1), chunk-fq0cr76a.js (370)
 * attribution: fingerprint 12, placement 307, sole-consumer 1, layout 47, callgraph-fingerprint 1, file-local 2, callgraph-witnessed 1
 */
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
  resolve,
  resolve as resolve_2,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
  sep,
  sep as sep_2,
  basename,
  basename as basename_2,
  parse,
  relative,
} from "path";
import {
  homedir,
  homedir as homedir_2,
  homedir as homedir_3,
  homedir as homedir_4,
  homedir as homedir_5,
  hostname,
  hostname as hostname_2,
} from "os";
import {
  statSync,
  statSync as statSync_2,
  lstatSync,
  openSync,
  openSync as openSync_2,
  fstatSync,
  readSync,
  closeSync,
  readlinkSync,
  realpathSync,
  realpathSync as realpathSync_2,
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  chmodSync,
  constants,
  constants as constants_2,
  rmSync,
  rmSync as rmSync_2,
  rmSync as rmSync_3,
  rmSync as rmSync_4,
  renameSync,
  unlinkSync,
  fchmodSync,
  mkdirSync,
  rmdirSync,
  readdirSync,
  accessSync,
  writeSync,
} from "fs";
import { isIP, isIP as isIP_2, isIP as isIP_3, isIP as isIP_4, isIP as isIP_5 } from "net";
import {
  randomBytes,
  randomBytes as randomBytes_2,
  randomBytes as randomBytes_3,
  randomBytes as randomBytes_4,
  randomBytes as randomBytes_5,
} from "crypto";
import {
  collectFromSandboxSettings,
  getSandboxSettingsSources,
  bqt,
  Ev,
  firstFromSandboxSettings,
  readPolicySandboxSetting,
  collectAllowRules,
  uM,
  mergeIgnoreViolations,
  readSandboxSetting,
  getPolicySettingsIfEnabled,
} from "./sandboxSettingsSources.js";
import { gw, ensurePrivateDir, yqt, Q6r } from "./celHostFunctions.js";
import {
  uy,
  Ad,
  yM,
  bM,
  SM,
  Kot,
  Jxe,
  oD,
  BP,
  Pwn,
  usr,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-utils.js";
import { getPlatform } from "../platform.js";
import {
  classifyRuleParens,
  canonicalToolName,
  Dgs,
  Hgs,
  Lgs,
  eMn,
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
  _v,
  describeUnreadableSandboxError,
  SandboxInitFailedError,
  SandboxBridgeUnavailableError,
  pM,
  SandboxProtectionNotRenewedError,
} from "./sandboxErrors.js";
import { DoctorLazy } from "../../cli/handlers/util.js";
import { u, o, U, A } from "../../../vendor/zod/v4/classic/schemas.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { PLUGIN_TOOL_STAGING_GUARD_FLAG, PLUGIN_TOOL_STAGING_DIRNAME } from "../tempDir.js";
import {
  isWindowsSandboxEnabled,
  getGitHomeInfo,
  isUnderGitHome,
  CLAUDECODESANDBOX,
  describeWindowsSandboxRemedy,
  Av,
  O0,
  HOME_AS_CWD_NOTE,
  grantParentFoldersToSandboxGroup,
  tD,
  grantExecutableReadToSandboxGroup,
  getSandboxUserStatus,
  writeWindowsDenyEntries,
  mergeNativeDenyState,
  Nv,
  dropAppliedNativeDenies,
  areNativeDeniesComplete,
} from "./windowsSandbox.js";
import {
  dx,
  px,
  Pot,
  Au,
} from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/windows-sandbox-utils.js";
import { Df } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/mitm-ca.js";
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
import { isScrubEnabled, isScrubSandboxAvailable, dyr, xCi } from "../subprocessEnv.js";
import { JF } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/parent-proxy.js";
import { parseHostPort } from "../../commands/ide/ide.js";
import { Iie, Iqt } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/domain-pattern.js";
import { WEBFETCH } from "../../tools/WebFetchTool/prompt.js";
import { Hai } from "./_new/sandbox-adapter.helpers-czff.js";
import { parseGitConfigSections } from "../git/gitConfigParser.js";
import { uniq, count } from "../collections.js";
import { Mn, isMacSpecialPath, uT, uncHostOf, cl, isForeignNetworkPath } from "../pathClassification.js";
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
  hl,
  isNetDir,
  networkMountHost,
  isForeignMountPath,
  Ya,
  tP,
  networkMountRootCached,
  foldCase,
  readAutoMaster,
  readAutofsMounts,
  readAutofsMountPoints,
  isWslUncPath,
  readResolvSearchDomains,
} from "../networkPaths.js";
import { isWindowsDevicePath, Tm } from "../windowsUncPaths.js";
import { ATOMIC_WRITE_DIRNAME } from "../plugins/safeCopy.js";
import { getClaudeConfigDir, isEnvTruthy } from "../envUtils.js";
import { wt } from "../../remote/remoteMode.js";
import { cMi, YMt } from "../fsSafety/atomicWriteStaging.js";
import { addFileGlobRuleToGitignore } from "../git/gitignore.js";
import { getClaudeTempDirRealpath, getChildProcessTmpDirRealpath } from "../tempDirRealpaths.js";
import { getDropInDir } from "../fileStateCache.js";
import { WSL_MANAGED_SETTINGS_DIR } from "../settings/mdm/wslRegistry.js";
import { getBashEditDiffDir, Ww, Gw } from "./userTempRoot.js";
import { signatureFileFor, signatureIatFileFor } from "../settings/policyCertificates.js";
import { aat } from "../../services/policyLimits/cacheStamp.js";
import { gte } from "../../plugins/functionHooks/devModsName.js";
import { peekTaskOutputDir } from "../task/diskOutput.js";
import {
  projectPluginsDir,
  updateDeniedProducerDirs,
  pluginRootDirs,
  commandProducerDirs,
  onProducerDirsChanged,
} from "../plugins/pluginCachePaths.js";
import { getPluginSeedDirs } from "../plugins/pluginDirectories.js";
import { JRi, policyHelperPaths, QRi } from "../settings/policyHelper/helperRemote.js";
import { fOn } from "../settings/types.js";
import {
  getMockRemoteSettingsFixturePath,
  getSettingsPath,
} from "../../services/remoteManagedSettings/remoteSettingsCache.js";
import { oYe } from "../../services/remoteManagedSettings/consentRecords.js";
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
import { isPathWithin, toComparablePath, iM } from "../fsJunctions.js";
import { userSettingsHomes } from "../settings/settingsFileParsing.js";
import { V3e, wio, Wfs, Sio, $In } from "../settings/settingsSourceTrust.js";
import { ripgrepCommand } from "../ripgrep.js";
import { xor, assertMarkedPathsResolved, checkAppArmorUserNamespaces, A4 } from "./linuxSandboxExec.js";
import { on } from "../../../vendor/@anthropic-ai/sandbox-runtime/dist/sandbox/sandbox-manager.js";
import { io } from "../../../vendor/@mermaid-js/parser/dist/chunks/mermaid-parser.esm.min/chunk-L2OVAXIS.mjs";
import { createStore } from "../../state/store.js";
import { fromEnum } from "../../services/analytics/safeMetadata.js";
import { isSentinelInode, jsonStringify } from "../slowOperations.js";
import { regExp } from "../permissions/protectedDirNames.js";
import { isSystemVolumePath } from "../permissions/protectedDirs.js";
import { pw } from "../localhost.js";
import { NPn } from "../../components/sandbox/SandboxDependenciesTab.js";
import { envDynamicProbe } from "../envDynamic.js";
import { getHostAgentPolicy } from "../hostAgentPolicy.js";
import { settingsChangeDetector } from "../settings/changeDetector.js";
import { BASH_TOOL_NAME } from "../../tools/BashTool/toolName.js";
import { permissionRuleExtractPrefix } from "../permissions/shellRuleMatching.js";
import { getPluginRegistry } from "../plugins/pluginLoadState.js";
import { READ_LIMITS, tz } from "../fsBoundRead.js";

//@ chunk-fq0cr76a.js:853952-854002 fingerprint = getExcludedCommands (0.74)
function getTrustedExcludedCommands() {
  return collectFromSandboxSettings((e) => e.excludedCommands);
}
/**
 * Shell 需要沙箱但沙箱不可用时抛出的错误类型。
 */
//@ chunk-fq0cr76a.js:904355-904448 placement
class SandboxUnavailableForShellError extends Error {
  constructor(e) {
    super(e);
    this.name = "SandboxUnavailableForShellError";
  }
}
//@ chunk-fq0cr76a.js:904448-904535 placement
class SandboxCommandTooLongError extends Error {
  constructor(e) {
    super(e);
    this.name = "SandboxCommandTooLongError";
  }
}
/**
 * 沙箱因策略拒绝执行时的错误，带 reason 字段。
 */
//@ chunk-fq0cr76a.js:904535-904644 placement
class SandboxPolicyRefusalError extends Error {
  reason;
  constructor(e, n) {
    super(e);
    this.reason = n;
    this.name = "SandboxPolicyRefusalError";
  }
}
/**
 * POSIX 路径前缀覆盖：相等、或根目录覆盖一切绝对路径、或以 e/ 开头。
 */
//@ chunk-fq0cr76a.js:904644-904725 placement
function posixCovers(e, n) {
  return n === e || (e === "/" ? n.startsWith("/") : n.startsWith(`${e}/`));
}
/**
 * 用 picomatch 按 dot:true（可选大小写不敏感）匹配 glob，编译结果按模式缓存，编译失败视为不匹配。
 */
//@ chunk-fq0cr76a.js:904725-904873 placement
function matchesGuardedGlob(e, n, r, s = !1) {
  let h = s ? `${n}\x00nocase` : n,
    y = r?.get(h);
  if (!y) {
    try {
      y = gw.default(n, { dot: !0, nocase: s });
    } catch {
      y = () => !1;
    }
    r?.set(h, y);
  }
  return y(e);
}
/**
 * 把含通配段的路径拆成若干“名字读法”：整串作字面名，以及每个通配段前的前缀目录 + 余下 glob，用于判断 glob 可能命中的文件夹名。
 */
//@ chunk-fq0cr76a.js:904873-905134 placement
function nameReadingsOfGlobSpelling(e) {
  let n = uy(e),
    parts = n.split("/"),
    flattened = parts.flatMap((h, y) => (Ad(h) ? [y] : []));
  if (flattened.length === 0) return [];
  return [
    { name: n.replace(/\/+$/, ""), pattern: null },
    ...flattened
      .slice(1)
      .map((h) => ({
        name: parts.slice(0, h).join("/"),
        pattern: `/${parts.slice(h).join("/")}${e.slice(n.length)}`,
      })),
  ];
}
/**
 * 路径是否匹配某个名字读法：字面名相等，或位于前缀目录下且余下部分匹配 glob。
 */
//@ chunk-fq0cr76a.js:905134-905263 placement
function matchesNameReading(e, n, r, s = !1) {
  return n.some(({ name: h, pattern: pattern }) =>
    pattern === null
      ? e === h
      : e.startsWith(`${h}/`) && matchesGuardedGlob(e.slice(h.length), pattern, r, s),
  );
}
//@ chunk-fq0cr76a.js:905263-905425 placement = LayoutMeasureMode (0.654)
function matchesRuntimeGlobBy(e, n, r, s) {
  return (
    s(n, e) ||
    (Ad(e) &&
      nameReadingsOfGlobSpelling(n).some(({ name: h, pattern: pattern }) =>
        pattern === null
          ? r === "exactly"
            ? e === h
            : posixCovers(h, e)
          : e.startsWith(`${h}/`) && s(pattern, e.slice(h.length)),
      ))
  );
}
//@ chunk-fq0cr76a.js:905425-905456 placement
var yce = /[^/]{256}|^[^]{4097}/;
/**
 * 用运行时 glob 判断路径是否命中拒绝条目：按大小写模式（anyCase/ownCase/exactly）编译读、写两种翻译并缓存；无法编译或需要覆盖整个目录时退化为匹配 glob 的基目录。
 */
//@ chunk-fq0cr76a.js:905456-906056 placement
function matchesDenyGlobAtRuntime(path, pattern, caseMode, coverage, cache) {
  if (yce.test(path)) return !1;
  return matchesRuntimeGlobBy(path, uy(pattern), caseMode, (globPattern, candidate) => {
    let cacheKey = (readTranslation) => `${globPattern}\x00runtime ${readTranslation} ${coverage}`,
      matcher = cache?.get(cacheKey(caseMode));
    if (!matcher) {
      let R = yM(globPattern),
        writeTranslation = coverage === "unread" ? void 0 : bM(globPattern),
        translations = (
          coverage === "allBeneathItsDirectory"
            ? R.kind !== "read" || writeTranslation?.kind !== "read"
            : coverage === "allBeneathIfUncompilable" &&
              (R.kind === "unreadable" || writeTranslation?.kind === "unreadable")
        )
          ? [SM(getGlobBaseDirectory_2(globPattern))]
          : [R, writeTranslation].flatMap((K) => (K?.kind === "read" ? [K.translation] : [])),
        buildMatcher = (K) => {
          let [primary, secondary] = translations.map((J) => J[K]);
          if (!primary) return () => !1;
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
/**
 * deny 条目是否覆盖目标路径：非 glob 用前缀覆盖；glob 则对目标及其各级父目录依次尝试 glob 与名字读法匹配。
 */
//@ chunk-fq0cr76a.js:906056-906214 placement
function denyEntryCovers(e, n, r, s = !1) {
  if (!Ad(e)) return posixCovers(e, n);
  let h = Ad(n) ? nameReadingsOfGlobSpelling(e) : [],
    y = n;
  for (;;) {
    if (matchesGuardedGlob(y, e, r, s) || matchesNameReading(y, h, r, s)) return !0;
    let b = dirname_7(y);
    if (b === y) return !1;
    y = b;
  }
}
//@ chunk-fq0cr76a.js:906214-906325 placement
function denyEntryCoversPath(e, n, r, s = !1) {
  if (!Ad(e)) return posixCovers(e, n);
  return (
    matchesDenyGlobAtRuntime(n, e, s ? "anyCase" : "ownCase", "unread", r) || denyEntryCovers(e, n, r, s)
  );
}
/**
 * 判断沙箱路径模式是否覆盖某路径：无 glob 时按路径段前缀比较，有 glob 时大小写两种折叠都试并处理不可编译模式。
 */
//@ chunk-fq0cr76a.js:906325-906578 placement
function denyEntryCoversFolded(e, n, r) {
  let s = getPlatform() === "windows",
    h = s ? e.replaceAll("\\", "/") : e,
    y = s ? n.replaceAll("\\", "/") : n;
  if (!Ad(h)) return isPathPrefixOf(h, y);
  let b = "allBeneathIfUncompilable",
    S = foldPathCase(h),
    w = foldPathCase(y);
  return (
    matchesDenyGlobAtRuntime(y, h, "anyCase", b, r) ||
    matchesDenyGlobAtRuntime(w, S, "ownCase", b, r) ||
    denyEntryCovers(h, y, r, !0) ||
    denyEntryCovers(S, w, r)
  );
}
/**
 * glob 模式第一个通配符之前的目录部分（Windows 用 win32.dirname）。
 */
//@ chunk-fq0cr76a.js:906578-906746 placement
function getGlobBaseDirectory_2(e) {
  let n = e.split(/[*?[\]]/)[0] ?? "";
  if (getPlatform() === "windows") return win32.dirname(n.replace(/[/\\]+$/, "\\_"));
  return n.endsWith("/") ? n.replace(/\/+$/, "") || "/" : dirname_7(n);
}
/**
 * 把规则串（如 `Read(//secret/**)`、`WebFetch(domain:x)`）解析成 {toolName, ruleContent}，Windows 上对反斜杠路径单独处理转义。
 */
//@ chunk-fq0cr76a.js:906746-906971 placement = permissionRuleValueFromString (0.361)
function parseRuleForSandbox(ruleString) {
  let n = classifyRuleParens(ruleString);
  if (n.kind !== "call" || !n.toolName || n.rawContent === "")
    return { toolName: canonicalToolName(ruleString) };
  let r = getPlatform() === "windows" && Dgs(n.rawContent);
  return { toolName: canonicalToolName(n.toolName), ruleContent: r ? Hgs(n.rawContent) : Lgs(n.rawContent) };
}
/**
 * 去掉沙箱路径规则中的 glob 转义（\x→x，单字符类 [x]→x），保留真正的通配与字符类；Windows 上只在特定字符前视反斜杠为转义。
 */
//@ chunk-fq0cr76a.js:906971-907311 placement
function unescapeGlobPattern(e) {
  let n = getPlatform() === "windows",
    r = n && Dgs(e),
    s = "";
  for (let h = 0; h < e.length; h++) {
    let y = e[h],
      b = e[h + 1];
    if (y === "\\" && b !== void 0 && !r && (!n || eMn(b))) ((s += Ad(b) ? y + b : b), h++);
    else if (y === "[" && b !== void 0)
      if (e[h + 2] === "]" && !Ad(b) && !"\\/!^".includes(b)) ((s += b), (h += 2));
      else {
        let index = e.indexOf("]", h + 2),
          w = index === -1 ? e.length : index + 1;
        ((s += e.slice(h, w)), (h = w - 1));
      }
    else s += y;
  }
  return s;
}
/**
 * 解析 sandbox.filesystem 路径：`//x` 为绝对，`/x` 相对该设置来源根目录，`~/` 家目录，其他相对 cwd（./）。
 */
//@ chunk-fq0cr76a.js:907311-907613 placement
function resolvePathPatternForSandboxAt(pattern, sourceRoot) {
  if ((assertPathHasNoNullBytes(pattern), pattern.startsWith("//")))
    return stripTrailingSlash(unescapeGlobPattern(pattern.slice(1)));
  if (pattern.startsWith("/")) {
    let sliced = pattern.slice(1),
      y = !(getPlatform() === "windows" && /^(?:[A-Za-z]:[\\/]|\\\\)/.test(sliced));
    return resolve_2(sourceRoot, (y ? "./" : "") + unescapeGlobPattern(sliced));
  }
  let r = unescapeGlobPattern(pattern),
    s = /^(?:[\\/]|~[\\/]|~$|[A-Za-z]:)/.exec(r)?.[0] ?? "";
  return stripTrailingSlash(pattern.startsWith(s) ? r : `./${r}`);
}
//@ chunk-fq0cr76a.js:907613-907652 placement
function resolvePathPatternForSandbox(e, n) {
  return resolvePathPatternForSandboxAt(e, getRuleAnchorRootForSource(n));
}
/**
 * 解析权限规则里的路径模式（Read/Edit 规则），`//x` 为绝对，其余经 expandPath 相对来源根；Windows 先展开 %USERPROFILE% 等。
 */
//@ chunk-fq0cr76a.js:907652-907762 placement
function resolveSandboxFilesystemPathAt(e, n) {
  if ((assertPathHasNoNullBytes(e), e.startsWith("//"))) return stripTrailingSlash(e.slice(1));
  return stripTrailingSlash(
    expandPath(getPlatform() === "windows" ? expandWindowsProfileVariables(e) : e, n),
  );
}
/**
 * 沙箱文件系统路径是否为相对路径（不是绝对路径也不是 ~/ 开头）；Windows 先展开 %USERPROFILE% 类变量。
 */
//@ chunk-fq0cr76a.js:907762-907853 placement
function isSandboxFilesystemPathRelative(e) {
  let trimmed = (getPlatform() === "windows" ? expandWindowsProfileVariables(e) : e).trim();
  return !isAbsolute_2(trimmed) && !/^~(?:\/|$)/.test(trimmed);
}
/**
 * Windows 上含 profile 变量的路径在旧版本被当相对路径读，返回 ./ 前缀的旧读法用于提示；其他情况 null。
 */
//@ chunk-fq0cr76a.js:907853-907920 placement
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
  let n = homedir_3();
  return Kot(
    e
      .replace(/%APPDATA%/gi, () =>
        env.APPDATA && isAbsolute_2(env.APPDATA) ? env.APPDATA : join_9(n, "AppData", "Roaming"),
      )
      .replace(/%LOCALAPPDATA%/gi, () =>
        env.LOCALAPPDATA && isAbsolute_2(env.LOCALAPPDATA) ? env.LOCALAPPDATA : join_9(n, "AppData", "Local"),
      ),
  ).replace(/^\s*~\\/, "~/");
}
//@ chunk-fq0cr76a.js:908314-908454 placement
function stripTrailingSlash(e, { evenAfterGlob: n = !1 } = {}) {
  if (getPlatform() === "windows" || !e.endsWith("/")) return e;
  if (!n && Ad(e)) return e;
  return e.replace(/\/+$/, "") || "/";
}
//@ chunk-fq0cr76a.js:908454-908564 placement
function normalizeDirectoryPattern(e) {
  if (getPlatform() === "windows") return Jxe(oD(e)) ? e.replace(/[\\/]+$/, "") : e;
  return stripTrailingSlash(e, { evenAfterGlob: !0 });
}
//@ chunk-fq0cr76a.js:908564-908627 placement
function isDirectorySync(e) {
  try {
    return statSync(e).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-fq0cr76a.js:908627-908689 placement
function isDirectoryNoFollow(e) {
  try {
    return lstatSync(e).isDirectory();
  } catch {
    return !1;
  }
}
//@ chunk-fq0cr76a.js:908689-908728 placement
function resolveSandboxFilesystemPath(e, n) {
  return resolveSandboxFilesystemPathAt(e, getRuleAnchorRootForSource(n));
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
function warnDroppedPathEntry(e, n) {
  reportSandboxPathError(e, `Ignoring unresolvable sandbox path entry from ${n}`, "pathEntryDropped");
}
//@ chunk-fq0cr76a.js:909065-909182 placement
function reportSandboxPathError(e, n, r) {
  let s = e instanceof SandboxPathEntryError ? e.cause : e;
  if (s instanceof NullBytePathError) logForDebugging(`${n}: ${errorMessage(s)}`, { level: "warn" });
  else reportSandboxErrorUnderStandIn(s, r);
}
//@ chunk-fq0cr76a.js:909182-909288 placement
class SandboxPathEntryError extends Error {
  cause;
  telemetryMessage = SANDBOX_TELEMETRY_MESSAGES.pathEntryRefused;
  constructor(e, n) {
    super(e);
    this.cause = n;
  }
}
/**
 * 解析一条沙箱路径条目；失败时若沙箱为必需、或是可信层的 deny 条目则抛 SandboxPathEntryError（整个配置构建失败），否则告警丢弃。
 */
//@ chunk-fq0cr76a.js:909288-909466 placement
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
/**
 * 批量解析路径条目（相对于来源根、展开 ~），丢弃解析失败的条目。
 */
//@ chunk-fq0cr76a.js:909466-909560 placement
function resolvePathEntries(e, n, r, s) {
  return (e ?? []).flatMap((h) => {
    let y = resolvePathEntry(h, n, r, s);
    return y === void 0 ? [] : [y];
  });
}
//@ chunk-fq0cr76a.js:909560-909600 placement
function resolveSandboxPathPatterns(e, n, r) {
  return resolvePathEntries(e, n, r, resolveSandboxFilesystemPath);
}
/**
 * 把权限规则列表按工具名分组，只保留有 ruleContent 的（如取出所有 Read(...) 的路径）。
 */
//@ chunk-fq0cr76a.js:909600-909749 placement
function groupRuleContentsByTool(e, n) {
  let r = new Map(n.map((s) => [s, []]));
  for (let s of e ?? []) {
    let h = parseRuleForSandbox(s);
    if (h.ruleContent) r.get(h.toolName)?.push(h.ruleContent);
  }
  return r;
}
//@ chunk-fq0cr76a.js:909749-909789 placement
function resolveSandboxDenyReadEntry(e, n) {
  return tw(e, resolveSandboxFilesystemPath(e, n));
}
//@ chunk-fq0cr76a.js:909789-909825 placement
function tw(e, n) {
  return F$(e, normalizeDirectoryPattern(n));
}
//@ chunk-fq0cr76a.js:909825-909947 placement
var NETWORK_HOST_RULE_SCHEMA = DoctorLazy(() =>
  u({
    host: o().min(1),
    action: U(["allow", "deny"]).optional(),
    methods: A(o()).optional(),
    reason: o().optional(),
  }),
);
//@ chunk-fq0cr76a.js:909947-909974 placement
function antSandboxConfig() {
  return null;
}
//@ chunk-fq0cr76a.js:909974-910031 placement
function isNestedGitConfigLockDenyEnabled() {
  return readFlagWithOverride("tengu_golden_pebble", { safe: !0 });
}
//@ chunk-fq0cr76a.js:910031-910092 placement
function isSshStoreWriteDenyEnabled() {
  return readFlagWithOverride("tengu_resilient_adleman", { safe: !0 });
}
//@ chunk-fq0cr76a.js:910092-910131 placement
function isPluginToolStagingDenyEnabled() {
  return readFlagWithOverride(PLUGIN_TOOL_STAGING_GUARD_FLAG, { safe: !0 });
}
//@ chunk-fq0cr76a.js:910131-910162 placement
var TENGU_HUSHED_CARAWAY = "tengu_hushed_caraway";
//@ chunk-fq0cr76a.js:910162-910201 placement
function isPatternWriteDenyTwinsEnabled() {
  return readFlagWithOverride(TENGU_HUSHED_CARAWAY, { safe: !0 });
}
//@ chunk-fq0cr76a.js:910201-910230 placement
var TENGU_QUIET_MEDLAR = "tengu_quiet_medlar";
//@ chunk-fq0cr76a.js:910230-910269 placement
function isUnlistableWorktreesDenyEnabled() {
  return readFlagWithOverride(TENGU_QUIET_MEDLAR, { safe: !0 });
}
/**
 * 外部构建里沙箱 GrowthBook 配置恒为 {}（forbidUnsandboxedCommands、disableNoSandbox、requireSandboxedAttempt、filesystemPolicy 都未设置）。
 */
//@ chunk-fq0cr76a.js:910269-910293 placement
function getDefaultSandboxGbConfig() {
  return {};
}
//@ chunk-fq0cr76a.js:910293-910342 placement
function getSandboxGbConfig() {
  return getSandboxAdapterState().tenguSandboxGbConfig();
}
/**
 * 清掉沙箱 GrowthBook 配置缓存与主机规则缓存；尚未初始化时同时重置“已安装过滤器强制白名单”标志。
 */
//@ chunk-fq0cr76a.js:910342-910513 placement
function relatchTenguSandboxGbConfig() {
  let e = getSandboxAdapterState();
  if (
    (e.tenguSandboxGbConfig.cache.clear?.(), (e.gbHostRulesMemo = void 0), e.initializationPromise === void 0)
  )
    e.installedFilterRequestEnforcesAllowlist = !1;
}
//@ chunk-fq0cr76a.js:910513-910605 placement
function getTlsTerminateSetting() {
  return getSandboxSettingsSources()
    .map((e) => e?.sandbox?.network?.tlsTerminate)
    .find((e) => e !== void 0);
}
//@ chunk-fq0cr76a.js:910605-910765 placement
var MANDATE_IGNORED_NETWORK_KEYS = [
    "allowUnixSockets",
    "allowAllUnixSockets",
    "allowLocalBinding",
    "allowMachLookup",
    "httpProxyPort",
    "socksProxyPort",
  ],
  PROXY_PORT_KEYS = ["httpProxyPort", "socksProxyPort"];
/**
 * 计算 sandbox.network 的本地放行项（unix socket、本地绑定、mach lookup、代理端口）：无管理员强制且无可信网络限制时直接用合并设置；否则忽略 project/local 设置里的这些键（并记一次日志），代理端口在 allowManagedDomainsOnly 时只认托管设置。
 */
//@ chunk-fq0cr76a.js:910765-912502 placement
function getNetworkAllowances(e) {
  let n = isAdminSandboxMandate();
  if (!n && !hasTrustedNetworkRestrictions())
    return {
      allowUnixSockets: e?.allowUnixSockets,
      allowAllUnixSockets: e?.allowAllUnixSockets,
      allowLocalBinding: getAllowLocalBindingFor(e),
      allowMachLookup: e?.allowMachLookup,
      httpProxyPort: e?.httpProxyPort,
      socksProxyPort: e?.socksProxyPort,
    };
  let r = shouldAllowManagedSandboxDomainsOnly(),
    s = getSandboxAdapterState();
  if (!s.droppedRepoNetworkAllowancesLogged) {
    s.droppedRepoNetworkAllowancesLogged = !0;
    let mapped = ["projectSettings", "localSettings"].map((L) =>
        isSettingSourceEnabled(L) ? getSettingsForSource(L) : null,
      ),
      filtered = (n ? MANDATE_IGNORED_NETWORK_KEYS : PROXY_PORT_KEYS).filter((L) =>
        mapped.some((V) => {
          let K = V?.sandbox?.network?.[L];
          return K !== void 0 && K !== !1;
        }),
      );
    if (filtered.length > 0)
      logForDebugging(
        n
          ? `[sandbox] admin sandbox mandate: ignoring sandbox.network.${filtered.join(", ")} from project/local settings`
          : `[sandbox] trusted network deny list or strict allowlist: ignoring sandbox.network.${filtered.join(", ")} from project/local settings (a project may not replace the filtering proxy)`,
      );
    if (r) {
      let L = bqt(),
        filtered = PROXY_PORT_KEYS.filter((K) => L.some((q) => q?.sandbox?.network?.[K] !== void 0));
      if (filtered.length > 0)
        logForDebugging(
          `[sandbox] network.allowManagedDomainsOnly: ignoring sandbox.network.${filtered.join(", ")} from --settings/user settings; only managed settings may replace the filtering proxy`,
        );
    }
  }
  let h = r ? Ev : firstFromSandboxSettings,
    y = h((R) => R.network?.httpProxyPort),
    b = h((R) => R.network?.socksProxyPort);
  if (!n)
    return {
      allowUnixSockets: e?.allowUnixSockets,
      allowAllUnixSockets: e?.allowAllUnixSockets,
      allowLocalBinding: getAllowLocalBindingFor(e),
      allowMachLookup: e?.allowMachLookup,
      httpProxyPort: y,
      socksProxyPort: b,
    };
  let S = collectFromSandboxSettings((R) => R.network?.allowUnixSockets),
    w = collectFromSandboxSettings((R) => R.network?.allowMachLookup);
  return {
    allowUnixSockets: S.length > 0 ? S : void 0,
    allowAllUnixSockets: trustedBooleanUnlessFalse(
      e?.allowAllUnixSockets,
      (R) => R.network?.allowAllUnixSockets,
    ),
    allowLocalBinding:
      getPlatform() === "windows"
        ? getWindowsLoopbackSetting()
        : trustedBooleanUnlessFalse(e?.allowLocalBinding, (R) => R.network?.allowLocalBinding),
    allowMachLookup: w.length > 0 ? w : void 0,
    httpProxyPort: y,
    socksProxyPort: b,
  };
}
//@ chunk-fq0cr76a.js:912502-912566 placement
function getAllowLocalBindingFor(e) {
  return getPlatform() === "windows" ? getWindowsLoopbackSetting() : e?.allowLocalBinding;
}
/**
 * Windows 沙箱是否允许本地连接：取 sandbox.network.allowLocalBinding（托管锁定时只看可信层）。
 */
//@ chunk-fq0cr76a.js:912566-912640 placement
function areWindowsLocalConnectionsOn() {
  return (
    (areSandboxSettingsLockedByPolicy() ? Ev : firstFromSandboxSettings)(
      (e) => e.network?.allowLocalBinding,
    ) === !0
  );
}
/**
 * 只看 policySettings：托管层设置了 sandbox.enabled / autoAllowBashIfSandboxed / allowUnsandboxedCommands 任一项即视为沙箱设置被托管锁定（SandboxManager.areSandboxSettingsLockedByManagedSettings）。
 */
//@ chunk-fq0cr76a.js:912640-912793 fingerprint = areSandboxSettingsLockedByPolicy (0.861)
function areSandboxSettingsLockedByPolicy() {
  let e = getSettingsForSource("policySettings")?.sandbox;
  return (
    e?.enabled !== void 0 || e?.autoAllowBashIfSandboxed !== void 0 || e?.allowUnsandboxedCommands !== void 0
  );
}
//@ chunk-fq0cr76a.js:912793-912849 placement
function getWindowsLoopbackSetting() {
  return getSandboxAdapterState().windowsLoopbackAtStart ?? areWindowsLocalConnectionsOn();
}
/**
 * 本地连接设置与启动时不同（需要重启才生效）时为真。
 */
//@ chunk-fq0cr76a.js:912849-912926 placement
function needsRestartForLocalConnections() {
  let windowsLoopbackAtStart = getSandboxAdapterState().windowsLoopbackAtStart;
  return windowsLoopbackAtStart !== void 0 && windowsLoopbackAtStart !== areWindowsLocalConnectionsOn();
}
//@ chunk-fq0cr76a.js:912926-912966 placement
function trustedBooleanUnlessFalse(e, n) {
  return e === !1 ? !1 : firstFromSandboxSettings(n);
}
//@ chunk-fq0cr76a.js:912966-912998 placement
var ALLOW_ALL_UNIX_SOCKETS = { allowAllUnixSockets: !0 };
/**
 * Windows 上 tlsTerminate 的 CA 来源：设置给了 caCertPath/caKeyPath 为 trustedPair，srt-win 可用为 managed，否则 unavailable。
 */
//@ chunk-fq0cr76a.js:912998-913221 placement
function resolveWindowsTlsTerminateCaSource() {
  let e = getTlsTerminateSetting();
  if (e?.caCertPath || e?.caKeyPath)
    return {
      source: "trustedPair",
      ...(e.caCertPath && { caCertPath: e.caCertPath }),
      ...(e.caKeyPath && { caKeyPath: e.caKeyPath }),
    };
  return isWindowsSandboxEnabled() ? { source: "managed" } : { source: "unavailable" };
}
//@ chunk-fq0cr76a.js:913221-913412 placement
function getCaCertPaths(e) {
  switch (e.source) {
    case "trustedPair":
      return {
        ...(e.caCertPath && { caCertPath: e.caCertPath }),
        ...(e.caKeyPath && { caKeyPath: e.caKeyPath }),
      };
    case "managed":
      return {};
    case "unavailable":
      return;
  }
}
/**
 * 沙箱是否会做 TLS 终止：设置了 tlsTerminate 且（非 Windows，或 Windows 有可用 CA 来源）。
 */
//@ chunk-fq0cr76a.js:913412-913517 placement
function willSandboxTlsTerminate() {
  if (getTlsTerminateSetting() === void 0) return !1;
  if (getPlatform() !== "windows") return !0;
  return resolveWindowsTlsTerminateCaSource().source !== "unavailable";
}
/**
 * 比较已安装的 Windows TLS CA 证书指纹与期望值；无证书路径、文件异常或读取失败一律视为最新。
 */
//@ chunk-fq0cr76a.js:913517-913857 placement
function isInstalledWindowsTlsCaCurrent(e) {
  let n = resolveWindowsTlsTerminateCaSource();
  try {
    let r =
      n.source === "trustedPair"
        ? (n.caCertPath ?? null)
        : n.source === "managed"
          ? join_9(dx(), "ca", "cert.pem")
          : null;
    if (r === null) return !0;
    let s = openSync(r, "r"),
      h;
    try {
      let y = fstatSync(s);
      if (!y.isFile() || y.size > wce) return !0;
      let alloc = Buffer.alloc(y.size);
      (readSync(s, alloc, 0, alloc.length, 0), (h = alloc.toString("utf8")));
    } finally {
      closeSync(s);
    }
    return Df(h) === e;
  } catch {
    return !0;
  }
}
//@ chunk-fq0cr76a.js:913857-913871 placement
var wce = 65536;
//@ chunk-fq0cr76a.js:913871-914151 placement
function getFilesystemDisabledSetting() {
  let e = getAllPolicyTierSettings(),
    n = N$(readPolicySandboxSetting(["filesystem", "disabled"]));
  if (n !== void 0) return n;
  if (
    e.some(
      (s) =>
        s.sandbox?.filesystem !== void 0 ||
        (s.sandbox?.credentials?.files ?? []).some((h) => h.mode === "deny"),
    )
  )
    return;
  return getSandboxSettingsSources()
    .map((s) => s?.sandbox?.filesystem?.disabled)
    .find((s) => s !== void 0);
}
//@ chunk-fq0cr76a.js:914151-914201 placement
function isFilesystemIsolationDisabledBySetting() {
  return getFilesystemDisabledSetting() === !0 && getEffectiveFilesystemPolicy() === "relaxed";
}
//@ chunk-fq0cr76a.js:914201-914253 placement
function N$(e) {
  return typeof e === "boolean" ? e : void 0;
}
/**
 * 沙箱读禁止是否生效：沙箱启用、文件系统策略不是 relaxed 且没有覆盖原因。
 */
//@ chunk-fq0cr76a.js:914253-914331 placement
function sandboxReadBlockApplies() {
  return (
    SandboxManager.isSandboxingEnabled() &&
    getEffectiveFilesystemPolicy() !== "relaxed" &&
    getReadDenySkipReason() === null
  );
}
/**
 * 返回不添加读取拒绝的原因（只允许托管读取路径、原始工作目录含通配字符、Windows 需要管理员权限），否则 null。
 */
//@ chunk-fq0cr76a.js:914331-914651 placement
function getReadDenySkipReason() {
  if (getAllPolicyTierSettings().some((e) => e.sandbox?.filesystem?.allowManagedReadPathsOnly === !0))
    return "allowManagedReadPathsOnly is set";
  if (Ad(getOriginalCwd())) return "the original working directory has glob characters";
  return getPlatform() === "windows"
    ? "on Windows the read denies are never added, because adding them needs administrator rights"
    : null;
}
/**
 * 有效文件系统策略 strict/relaxed：scrub 模式与 Windows 恒 strict；设置 sandbox.filesystem.disabled 显式指定时按其值；否则看 GrowthBook filesystemPolicy（relaxedIfForced：有设置根路径时 strict）。
 */
//@ chunk-fq0cr76a.js:914651-914879 placement
function getEffectiveFilesystemPolicy() {
  if (isScrubEnabled()) return "strict";
  if (getPlatform() === "windows") return "strict";
  let e = getFilesystemDisabledSetting();
  if (e !== void 0) return e ? "relaxed" : "strict";
  let n = getSandboxGbConfig().filesystemPolicy ?? "strict";
  if (n === "relaxedIfForced") return isSandboxEnabledInSettings() ? "strict" : "relaxed";
  return n;
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
  ].some((e) => e?.sandbox?.enabled === !0);
}
/**
 * 任一托管/可信层设置了 sandbox.network.allowManagedDomainsOnly 时为真：网络白名单只认托管层。
 */
//@ chunk-fq0cr76a.js:915158-915245 placement = shouldAllowManagedSandboxDomainsOnly (0.821)
function shouldAllowManagedSandboxDomainsOnly() {
  return getAllPolicyTierSettings().some((e) => e.sandbox?.network?.allowManagedDomainsOnly === !0);
}
/**
 * 任一可信层设置了 sandbox.network.strictAllowlist 时为真。
 */
//@ chunk-fq0cr76a.js:915245-915324 placement
function isStrictNetworkAllowlistConfigured() {
  return getSandboxSettingsSources().some((e) => e?.sandbox?.network?.strictAllowlist === !0);
}
/**
 * 是否扣下按命令的额外网络放行：托管域名独占、严格白名单或插件评测（CLAUDE_CODE_EVAL_CONFINED）任一成立。
 */
//@ chunk-fq0cr76a.js:915324-915396 placement
function perCommandAllowsWithheld() {
  return (
    shouldAllowManagedSandboxDomainsOnly() ||
    isStrictNetworkAllowlistConfigured() ||
    Boolean(env.CLAUDE_CODE_EVAL_CONFINED)
  );
}
/**
 * 把单条命令批准的 allowed_domains 转成 sandbox-runtime 的逐命令网络列表；托管仅限域名/strictAllowlist/评测模式下逐命令放行被扣留（空列表）。
 */
//@ chunk-fq0cr76a.js:915396-915461 placement
function perCommandNetworkListsForRuntime(e) {
  return { allowedDomains: perCommandAllowsWithheld() ? [] : normalizeIpv6HostEntries([...e.allow]) };
}
/**
 * 沙箱设置写到哪一层：仅允许托管域名时不可写；托管策略锁定时只写 userSettings（若启用），否则 localSettings。
 */
//@ chunk-fq0cr76a.js:915461-915579 placement = supportsPersistence (0.79)
function sandboxHostGrantDestination() {
  if (shouldAllowManagedSandboxDomainsOnly()) return null;
  if (isAdminSandboxMandate() || isStrictNetworkAllowlistConfigured())
    return isSettingSourceEnabled("userSettings") ? "userSettings" : null;
  return "localSettings";
}
//@ chunk-fq0cr76a.js:915579-915606 placement
var Sw = /^[1-9][0-9]{0,4}$/;
/**
 * 主机名规范化（IDNA 等）后与其小写形式不同；IPv6 不算。用于识别易误导的同意弹窗主机名。
 */
//@ chunk-fq0cr76a.js:915606-915694 placement
function hostnameCanonicalFormDiffers(e) {
  if (isIP_5(e) === 6) return !1;
  let n = JF(e);
  return n !== void 0 && n !== e.toLowerCase();
}
//@ chunk-fq0cr76a.js:915694-915815 placement
function isValidSandboxHost(e, n) {
  if (e.length === 0 || e.length > 255) return !1;
  if (n.includes("%")) return !1;
  if (isIP_5(n) !== 0) return !0;
  return isSrtHostNameCharset(n);
}
//@ chunk-fq0cr76a.js:915815-915865 placement
function isSrtHostNameCharset(e) {
  return /^[A-Za-z0-9._-]+$/.test(e);
}
/**
 * 是否是严格端口后缀“:数字”且不超过 65535。
 */
//@ chunk-fq0cr76a.js:915865-915965 placement
function isStrictPortSuffix(e) {
  if (!e.startsWith(":")) return !1;
  let sliced = e.slice(1);
  return Sw.test(sliced) && Number(sliced) <= 65535;
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
function Rce(e) {
  let n = JF(e);
  return n !== void 0 && n.includes("*");
}
/**
 * 规范化会不会改变主机：无法规范化、规范结果与原串不一致、或是特殊形式时为真；IP 直接为假。
 */
//@ chunk-fq0cr76a.js:916178-916324 placement
function canonicalizationChangesHost(e) {
  let n = stripIpv6Brackets(e);
  if (n === void 0) return !0;
  if (!isValidSandboxHost(e, n)) return !0;
  if (isIP_5(n) !== 0) return !1;
  if (Rce(n)) return !0;
  return hostnameCanonicalFormDiffers(n.replace(/\.$/, ""));
}
//@ chunk-fq0cr76a.js:916324-916370 placement
function isMisleadingConsentHost(e) {
  return e.includes("*") || canonicalizationChangesHost(e);
}
/**
 * 是否为不带方括号的 IPv6 字面量（至少两个冒号且不以 [ 开头）。
 */
//@ chunk-fq0cr76a.js:916370-916465 placement
function isBareIpv6Literal(e) {
  let index = e.indexOf(":");
  return index !== -1 && e.indexOf(":", index + 1) !== -1 && !e.startsWith("[");
}
//@ chunk-fq0cr76a.js:916672-916809 sole-consumer
function expandIpv6Spellings(e) {
  let n = [];
  if (isIP_5(e) === 6) n.push(`[${e}]`);
  let r = parseHostPort(e);
  if (r !== void 0) n.push(`[${r.host}]:${r.port}`);
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
    let { hostPattern: hostPattern, port: port } = Iie(n),
      replaced = hostPattern.replace(/\.+$/, "");
    if (replaced === hostPattern) return [n];
    if (replaced === "" || replaced.endsWith("*")) return [n];
    if (JF(replaced) === void 0) return [n];
    return [n, port === void 0 ? replaced : `${replaced}:${port}`];
  });
}
//@ chunk-fq0cr76a.js:917165-917386 placement
function bracketIpv6WithPort(e) {
  let index = e.lastIndexOf(":"),
    sliced = e.slice(0, index),
    sliced_2 = e.slice(index + 1),
    index_2 = sliced.indexOf(":");
  if (
    Sw.test(sliced_2) &&
    Number(sliced_2) <= 65535 &&
    sliced !== "" &&
    !(sliced.endsWith(":") && isIP_5(sliced) !== 6) &&
    index_2 !== -1 &&
    sliced.indexOf(":", index_2 + 1) !== -1
  )
    return `[${sliced}]:${sliced_2}`;
  return e;
}
//@ chunk-fq0cr76a.js:917386-917430 placement
function kce(e) {
  return isIP_5(e) === 6 ? `[${e}]` : e;
}
/**
 * 把主机名转成会话放行条目：去掉末尾点（原样或可规范化时），再做条目编码。
 */
//@ chunk-fq0cr76a.js:917430-917510 placement
function consentHostEntry(e) {
  let replaced = e.replace(/\.$/, "");
  return kce(replaced === e || JF(e) !== void 0 ? replaced : e);
}
/**
 * 规范化网络条目中的 IPv6 主机写法：丢弃含 @、规范形式不一致或无法规范化的条目，为带端口的裸 IPv6 加方括号。
 */
//@ chunk-fq0cr76a.js:917510-917864 placement
function normalizeIpv6HostEntries(e) {
  return e.flatMap((n) => {
    if (n.includes("@")) return [];
    if (n.startsWith("[")) {
      let index = n.indexOf("]"),
        h = index === -1 ? void 0 : n.slice(1, index);
      if (h !== void 0 && hostnameCanonicalFormDiffers(h)) return [];
      if (h !== void 0 && h.includes("*") && JF(h) !== void 0) return [];
      return [n];
    }
    if (!isBareIpv6Literal(n)) return [n];
    if (hostnameCanonicalFormDiffers(n)) return [];
    let r = bracketIpv6WithPort(n);
    if (r !== n) return [r];
    if (isIP_5(n) === 6 && parseHostPort(n) !== void 0) return [];
    return [n];
  });
}
/**
 * 从多层设置收集网络域名条目：sandbox.network.allowedDomains/deniedDomains，加上 WebFetch(domain:…) 的 allow/deny 规则。
 */
//@ chunk-fq0cr76a.js:917864-918156 placement
function collectNetworkDomainEntries(e, n) {
  let r = n === "allow" ? "allowedDomains" : "deniedDomains",
    s = [];
  for (let h of e) {
    for (let y of h.sandbox?.network?.[r] ?? []) s.push(y);
    for (let y of h.permissions?.[n] ?? []) {
      let b = parseRuleForSandbox(y);
      if (b.toolName === WEBFETCH && b.ruleContent?.startsWith("domain:")) s.push(b.ruleContent.substring(7));
    }
  }
  return s;
}
//@ chunk-fq0cr76a.js:918156-918291 placement
function hostEntryMatches(e, n, r, s) {
  let { hostPattern: hostPattern, port: port } = Iie(e);
  if (!Hai(hostPattern, n)) return !1;
  if (port === void 0) return !0;
  return r === void 0 ? s === "match" : port === r;
}
/**
 * 按沙箱网络策略判断主机是否允许：命中 deniedDomains（含 IP 反查名）则拒绝并给原因；allowManagedDomainsOnly 时只放行托管层白名单；否则放行。
 */
//@ chunk-fq0cr76a.js:918291-918777 placement
function isHostAllowedBySandboxNetworkPolicy(e, n) {
  let r = isIP_5(e) !== 0 ? (JF(e) ?? e) : e,
    s = getAllPolicyTierSettings();
  if (
    addTrailingDotFreeVariants(
      expandBareIpv6Hosts([...collectNetworkDomainEntries([getSettings_DEPRECATED(), ...s], "deny"), ...[]]),
    ).some((b) => hostEntryMatches(b, r, n, "match") || hostEntryMatches(b, e, n, "match"))
  )
    return {
      allowed: !1,
      reason:
        r === e
          ? `${e} is in sandbox.network.deniedDomains`
          : `${e} (${r}) is in sandbox.network.deniedDomains`,
    };
  if (!shouldAllowManagedSandboxDomainsOnly()) return { allowed: !0 };
  if (
    normalizeIpv6HostEntries(collectNetworkDomainEntries(s, "allow")).some((b) =>
      hostEntryMatches(b, r, n, "no-match"),
    )
  )
    return { allowed: !0 };
  return {
    allowed: !1,
    reason: `sandbox.network.allowManagedDomainsOnly is set and ${e} is not in the policy allowlist`,
  };
}
//@ chunk-fq0cr76a.js:918777-919011 placement
function grantSessionHost(e) {
  if (isMisleadingConsentHost(e)) {
    logForDebugging(
      `[SandboxManager] Refusing a session grant for a host srt would re-spell as ${JF(e) ?? "(uncanonicalizable)"}`,
      { level: "warn" },
    );
    return;
  }
  let { sessionAllowedHosts: sessionAllowedHosts } = getSandboxAdapterState(),
    r = consentHostEntry(e);
  if (sessionAllowedHosts.has(r)) return;
  (sessionAllowedHosts.add(r), refreshConfig());
}
/**
 * 解析拒绝路径中的符号链接：不是链接时记为字面候选；可解析时记录字面/解析路径/父目录信息供命令后清理；悬空链接时最多跟随 8 跳得到目标。
 */
//@ chunk-fq0cr76a.js:919011-919470 placement
function resolveDenySymlink(e) {
  let linkTarget;
  try {
    linkTarget = readlinkSync(e);
  } catch {
    return (getSandboxAdapterState().denyLiteralSymlinkCandidates.push(e), e);
  }
  let state = getSandboxAdapterState(),
    parentInfo = resolveScrubParent(state, e),
    resolved;
  try {
    return (
      (resolved = realpathSync(e)),
      state.symlinkedDenyScrubPaths.push({
        literal: e,
        resolved: resolved,
        parent: parentInfo,
        hopDirectories: collectSymlinkHopDirectories(e, resolved),
        danglingBaseline: !1,
      }),
      resolved
    );
  } catch {
    let target = followDanglingLink(e, linkTarget) ?? resolve_2(dirname_7(e), linkTarget);
    for (let hop = 0; hop < 8; hop++) {
      let nextTarget;
      try {
        nextTarget = readlinkSync(target);
      } catch {
        break;
      }
      target = resolve_2(dirname_7(target), nextTarget);
    }
    return (
      state.symlinkedDenyScrubPaths.push({
        literal: e,
        resolved: target,
        parent: parentInfo,
        hopDirectories: collectSymlinkHopDirectories(e, null),
        danglingBaseline: !1,
      }),
      target
    );
  }
}
/**
 * 遍历 git 全局配置（~/.gitconfig 与 XDG git 的 config/ignore/attributes），按 include/文件引用继续展开，收集位于允许写目录之内、需要拒绝写入的文件路径。
 */
//@ chunk-fq0cr76a.js:919470-920176 placement
function collectGitConfigDenyPaths(xdgConfigHome, allowWriteRoots, getDenyRoots, isExcluded) {
  let homeDir = homedir_3(),
    queue = [
      { file: resolve_2(homeDir, ".gitconfig"), parse: !0 },
      { file: resolve_2(xdgConfigHome, "git", "config"), parse: !0 },
      { file: resolve_2(xdgConfigHome, "git", "ignore"), parse: !1 },
      { file: resolve_2(xdgConfigHome, "git", "attributes"), parse: !1 },
    ],
    seen = new Set(),
    results = [];
  for (let item = queue.shift(); item !== void 0 && seen.size < Hd; item = queue.shift()) {
    let { file: file, parse: parse } = item;
    if (seen.has(file) || Ad(file)) continue;
    if ((seen.add(file), isDirectorySync(file))) continue;
    let chain = resolveSymlinkChain(file);
    if (chain === null || chain.some(isExcluded)) continue;
    let index = chain.findIndex((paths) => eb([paths], getDenyRoots()));
    results.push(
      ...(index === -1 ? chain : chain.slice(0, index)).filter(
        (Z) =>
          allowWriteRoots.some((parse) => isPathPrefixOf(parse, Z)) &&
          !allowWriteRoots.some((J) => isPathPrefixOf(Z, J)),
      ),
    );
    let contents = parse && index === -1 ? readSmallTextFile(file) : null;
    if (contents === null) continue;
    let { includes: includes, files: files } = parseGitConfigSections(contents);
    for (let [Z, J] of [
      [includes, !0],
      [files, !1],
    ])
      for (let ie of Z) {
        let ae = resolvePathPatternForSandbox_2(ie, file, homeDir);
        if (ae !== null) queue.push({ file: ae, parse: J });
      }
  }
  return uniq(results);
}
//@ chunk-fq0cr76a.js:920176-920300 placement
function resolvePathPatternForSandbox_2(e, n, r) {
  if (e === "~" || e.startsWith("~/")) return resolve_2(r, `./${e.slice(2)}`);
  return e.startsWith("~") ? null : resolve_2(dirname_7(n), e);
}
//@ chunk-fq0cr76a.js:920300-920446 placement
function readSmallTextFile(e) {
  try {
    let n = statSync(e);
    if (!n.isFile() || n.size > 1048576) return null;
    let r = readFileSync_2(e, "utf8");
    return r.includes("\x00") ? null : r;
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:920446-920633 placement
function resolveSymlinkChain(e) {
  if (getPlatform() === "windows") return [e];
  let n = [e],
    r = e;
  for (let s = 0; s < Hd; s++) {
    let h = resolveFirstSymlink(r);
    if (h === null) return null;
    if (h === void 0) return uniq([...n, r]);
    (n.push(h.link), (r = h.next));
  }
  return null;
}
//@ chunk-fq0cr76a.js:920633-920929 placement
function resolveFirstSymlink(e) {
  let filtered = e.split(sep).filter(Boolean);
  for (let r = 1; r <= filtered.length; r++) {
    let s = sep + filtered.slice(0, r).join(sep),
      h;
    try {
      h = readlinkSync(s);
    } catch (error) {
      let S = getErrnoCode(error);
      if (S === "EINVAL") continue;
      return S === "ENOENT" || S === "ENOTDIR" ? void 0 : null;
    }
    let y = resolveLinkTarget(dirname_7(s), h);
    return y === null ? null : { link: s, next: join_9(y, ...filtered.slice(r)) };
  }
  return;
}
/**
 * 解析清理目标的父目录：真实路径、字面物理路径与 inode（带缓存）；与本会话早先构建配置时记录的不一致或无法解析时，沿用早先记录。
 */
//@ chunk-fq0cr76a.js:920929-921931 placement
function resolveScrubParent(state, targetPath) {
  if (getPlatform() === "windows") return { real: null, literalPhysical: null, inode: null };
  let resolveDir = (R) => {
      let D = state.scrubParentMemo.get(R);
      if (D === void 0) {
        try {
          let O = Mn(realpathSync(R)),
            L = null;
          try {
            let V = statSync(R, { bigint: !0 });
            L = { dev: V.dev, ino: V.ino };
          } catch {}
          D = { real: O, inode: L };
        } catch {
          D = { real: null, inode: null };
        }
        state.scrubParentMemo.set(R, D);
      }
      return D;
    },
    parentDir = dirname_7(targetPath),
    { real: realPath, inode: inode } = resolveDir(parentDir),
    real = resolveDir(dirname_7(parentDir)).real,
    S = real === null ? null : Mn(join_9(real, basename_2(parentDir))),
    info = { real: realPath, literalPhysical: S === realPath ? null : S, inode: inode };
  if (realPath === null) {
    let R = state.scrubParentLastKnown.get(parentDir);
    if (R !== void 0)
      return (
        logForDebugging(
          `[Sandbox] scrub parent ${parentDir} did not resolve at this config build; keeping the spelling recorded earlier this session`,
        ),
        D4(R)
      );
  } else {
    let R = state.scrubParentLastKnown.get(parentDir);
    if (R !== void 0 && (R.real !== realPath || R.literalPhysical !== info.literalPhysical))
      return (
        logForDebugging(
          `[Sandbox] scrub parent ${parentDir} resolves elsewhere than at an earlier config build this session; keeping the spelling recorded then`,
          { level: "warn" },
        ),
        logFeatureSad("sandbox_exec", "scrub_parent_rebuild_relocated"),
        D4(R)
      );
    state.scrubParentLastKnown.set(parentDir, info);
  }
  return info;
}
//@ chunk-fq0cr76a.js:921931-922011 placement
function D4(e) {
  return { real: e.real, literalPhysical: e.literalPhysical, inode: null };
}
//@ chunk-fq0cr76a.js:922011-922050 placement
function Fce(e) {
  return getErrnoCode(e) === "ENOENT";
}
/**
 * 登记需在命令后清理的裸仓库标记路径；无法确认其是否存在时警告（将来找到文件会移走而不是删除）。
 */
//@ chunk-fq0cr76a.js:922050-922513 placement
function registerBareRepoScrubPath(e, n, r, s) {
  let h = s === void 0 || Fce(s);
  if (!h) {
    let y = getErrnoCode(s),
      b =
        y === "EEXIST"
          ? `${n} appeared while the sandbox configuration was being built`
          : `could not check whether ${n} exists (${y ?? s})`;
    (logForDebugging(
      `[Sandbox] ${b}; if the cleanup after a sandboxed command finds a file there, it will move the file aside, not delete it`,
      { level: "warn" },
    ),
      logFeatureSad("sandbox_exec", "bare_repo_indicator_unclassified"));
  }
  e.bareGitRepoScrubPaths.set(n, { path: n, parent: resolveScrubParent(e, n), unlinkable: h, removal: r });
}
//@ chunk-fq0cr76a.js:922513-922621 placement
function checkPathAbsent(e) {
  try {
    return (statSync(e), Object.assign(Error("the path exists"), { code: "EEXIST" }));
  } catch (error) {
    return error;
  }
}
//@ chunk-fq0cr76a.js:922621-922636 placement
var Gp = 2097152;
/**
 * 若沙箱命令改掉了目录所有者的 rwx 权限，则恢复并记录。
 */
//@ chunk-fq0cr76a.js:922636-922956 placement
function restoreOwnerDirMode(e, n) {
  try {
    let r = statSync(e);
    if ((r.mode & 448) !== 448 && r.uid === process.getuid?.())
      (chmodSync(e, (r.mode & 4095) | 448),
        Ar(
          `${n}: restored owner rwx on a directory the sandboxed command had chmod'ed ${(r.mode & 4095).toString(8)}`,
        ),
        Xs("scrub_restored_owner_rwx"));
  } catch (error) {
    Ar(`${n}: could not check/restore directory mode (${getErrnoCode(error) ?? error})`);
  }
}
/**
 * 以真实目录方式打开路径（拒绝链接），用于清扫与授权检查。
 */
//@ chunk-fq0cr76a.js:922956-924555 placement
function openVerifiedScrubParent(dirPath, label, expectedPath, altPath, recordedInode) {
  let fd = null;
  try {
    fd = openSync(
      dirPath,
      constants.O_RDONLY | Gp | constants.O_DIRECTORY | (expectedPath === dirPath ? constants.O_NOFOLLOW : 0),
    );
  } catch (error) {
    let errorCode = getErrnoCode(error);
    if (errorCode !== "EACCES" || Gp !== 0)
      return (
        Ar(`${label}: cannot open ${dirPath} as a real directory (${errorCode ?? error}); refusing`, "error"),
        { ok: !1, refusedNonCanonical: errorCode === "ELOOP" || errorCode === "ENOTDIR" }
      );
  }
  let close = () => {
      if (fd !== null) closeSync(fd);
    },
    procPath = `/proc/self/fd/${fd}`,
    resolvedPath,
    hasProcPath = !1,
    sameInode = !1;
  if (recordedInode !== null)
    try {
      let V = fd !== null ? fstatSync(fd, { bigint: !0 }) : statSync(dirPath, { bigint: !0 });
      sameInode = V.dev === recordedInode.dev && V.ino === recordedInode.ino;
    } catch (error) {
      Ar(
        `${label}: could not stat ${dirPath} (${getErrnoCode(error) ?? error}); treating it as not the recorded directory`,
      );
    }
  if (fd !== null && Gp !== 0)
    try {
      ((resolvedPath = readlinkSync(procPath)), (hasProcPath = !0));
    } catch (error) {
      Ar(
        `${label}: /proc/self/fd unavailable (${getErrnoCode(error) ?? error}); falling back to a path-based check for ${dirPath}`,
      );
    }
  if (!hasProcPath)
    try {
      resolvedPath = Mn(realpathSync(dirPath));
    } catch {
      resolvedPath = void 0;
    }
  let acceptedPath =
    resolvedPath === expectedPath
      ? expectedPath
      : altPath !== void 0 && resolvedPath === altPath
        ? altPath
        : void 0;
  if (acceptedPath === void 0 && sameInode) {
    let V = hasProcPath;
    if (!hasProcPath && recordedInode !== null)
      try {
        let K = lstatSync(expectedPath, { bigint: !0 });
        V = K.isDirectory() && K.dev === recordedInode.dev && K.ino === recordedInode.ino;
      } catch {}
    if (V)
      ((acceptedPath = expectedPath),
        Ar(
          `${label}: ${dirPath} is spelled ${resolvedPath ?? "<unresolved>"} but is the directory recorded at the config build (same device and inode); accepting`,
        ));
  }
  if (acceptedPath === void 0) {
    if ((close(), resolvedPath === void 0))
      return (
        Ar(`${label}: cannot resolve ${dirPath} for the path-based check; refusing`, "error"),
        { ok: !1, refusedNonCanonical: !1 }
      );
    return (
      Ar(
        `${label}: ${dirPath} resolves to ${resolvedPath}, not ${altPath === void 0 ? expectedPath : `${expectedPath} or ${altPath}`} (symlinked or moved component since the config build); refusing`,
        "error",
      ),
      { ok: !1, refusedNonCanonical: !0 }
    );
  }
  let isRecorded = acceptedPath === expectedPath && sameInode;
  if (!isRecorded)
    Ar(
      `${label}: ${dirPath} is a real directory at an accepted spelling but not verified as the directory recorded at the config build; planted entries there are moved aside, not unlinked`,
    );
  return { ok: !0, base: hasProcPath ? procPath : acceptedPath, recorded: isRecorded, close: close };
}
//@ chunk-fq0cr76a.js:924555-924592 placement
var U$ = ".claude-sandbox-quarantine-";
/**
 * 处理命令在受保护位置放置的条目：已不存在返回 gone；非目录且允许时直接删除；否则改名移到旁边（隔离），失败多次后退化到就地处理。
 */
//@ chunk-fq0cr76a.js:924592-925459 placement
function quarantinePlantedEntry(
  parentDir,
  entryName,
  label,
  isRecordedParent,
  onQuarantined,
  includeDirectories = !0,
) {
  let entryPath = join_9(parentDir, entryName),
    isDirectory;
  try {
    isDirectory = lstatSync(entryPath).isDirectory();
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return "gone";
    throw error;
  }
  if (isDirectory && !includeDirectories) return "left";
  if (!isDirectory && isRecordedParent)
    try {
      return (rmSync_4(entryPath, { recursive: !1, force: !0 }), "removed");
    } catch (error) {
      let errorCode = getErrnoCode(error);
      if (errorCode !== "EISDIR" && errorCode !== "ERR_FS_EISDIR") throw error;
      if (!includeDirectories) return "left";
      isDirectory = !0;
    }
  for (let w = 0; w < 4; w++) {
    let R = `${entryName}${U$}${randomBytes_5(6).toString("hex")}`;
    try {
      return (
        renameSync(entryPath, join_9(parentDir, R)),
        Ar(
          `${label}: moved the planted ${entryName} aside whole as ${R} rather than deleting it \u2014 it may be a pre-existing ${isDirectory ? "directory" : "file"} the command moved here, so inspect before deleting`,
        ),
        Xs(isDirectory ? "scrub_planted_dir_quarantined" : "scrub_planted_file_quarantined"),
        onQuarantined?.(R),
        "quarantined"
      );
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
      Ar(`${label}: could not move the planted ${entryName} aside (${renameError ?? error})`);
      break;
    }
  }
  return neutralizePlantedEntryInPlace(parentDir, entryName, label, isRecordedParent, includeDirectories);
}
/**
 * 处理一个被植入的条目：挪开、置不可用或删除，失败时记录。
 */
//@ chunk-fq0cr76a.js:925459-927560 placement
function neutralizePlantedEntryInPlace(
  parentDir,
  entryName,
  label,
  isRecordedParent,
  includeDirectories = !0,
) {
  let entryPath = join_9(parentDir, entryName);
  try {
    if (!includeDirectories && lstatSync(entryPath).isDirectory()) return "left";
  } catch {}
  let report = (L, V) => {
      reportSandboxErrorUnderStandIn(L, V);
    },
    leaveInPlace = (L) => (
      report(
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `[Sandbox] ${label}: the planted ${entryName} could not be moved aside or made unreadable (${L}); it stays in place, readable \u2014 remove it by hand`,
          "sandbox: post-command scrub left a planted entry in place",
        ),
        "plantedEntryLeftInPlace",
      ),
      Xs("scrub_planted_entry_unmovable"),
      !1
    );
  if (getPlatform() === "windows") return leaveInPlace("rename failed; no in-place fallback on Windows");
  let parentNote = isRecordedParent
      ? ""
      : " \u2014 the parent is not the directory recorded at startup, so this may be your own entry",
    unlinkInstead = (L) => {
      try {
        unlinkSync(entryPath);
      } catch (error) {
        let q = getErrnoCode(error);
        return q === "ENOENT" ? "gone" : leaveInPlace(`unlink of the ${L} failed: ${q ?? error}`);
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
      return (Xs("scrub_planted_entry_unlinked_after_rename_failure"), "removed");
    },
    fd;
  try {
    fd = openSync(entryPath, constants.O_RDONLY | Gp | constants.O_NOFOLLOW | constants.O_NONBLOCK);
  } catch (error) {
    let V = getErrnoCode(error);
    if (V === "ENOENT") return "gone";
    if (V === "ELOOP") return unlinkInstead("symlink");
    if (V === "ENXIO" || V === "EOPNOTSUPP") return unlinkInstead("socket");
    return leaveInPlace(`open for chmod failed: ${V ?? error}`);
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
    if (Gp !== 0) chmodSync(`/proc/self/fd/${fd}`, 0);
    else fchmodSync(fd, 0);
  } catch (error) {
    return leaveInPlace(`chmod failed: ${getErrnoCode(error) ?? error}`);
  } finally {
    closeSync(fd);
  }
  let message = `[Sandbox] ${label}: could not move the planted ${entryName} aside (the rename failed); set its mode to 000 in place so nothing reads it${parentNote}; chmod it back if so`;
  if (isRecordedParent) logForDebugging(message, { level: "error" });
  else
    report(
      new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        message,
        "sandbox: post-command scrub set a planted entry to mode 000 in place under an unrecorded parent",
      ),
      "plantedEntryMadeUnreadable",
    );
  return (Xs("scrub_planted_entry_neutralized_in_place"), "neutralized");
}
/**
 * 收集路径解析过程中经过的所有目录（含符号链接各跳的父目录与目标），供命令结束后检查是否被替换；解析出错或超出上限时返回 null。
 */
//@ chunk-fq0cr76a.js:927560-928143 placement
function collectSymlinkHopDirectories(startPath, resolvedPath, excludeLeaves = !1) {
  if (getPlatform() === "windows") return null;
  let dirs = new Set();
  if (resolvedPath !== null) {
    if (!excludeLeaves) dirs.add(resolvedPath);
    dirs.add(dirname_7(resolvedPath));
  }
  let visited = new Set(),
    stack = [startPath],
    budget = Hd;
  for (let current = stack.pop(); current !== void 0; current = stack.pop()) {
    if (visited.has(current)) continue;
    if (--budget < 0) return null;
    visited.add(current);
    for (
      let component = current, parent = dirname_7(current);
      component !== parent;
      component = parent, parent = dirname_7(parent)
    ) {
      let linkTarget;
      try {
        linkTarget = readlinkSync(component);
      } catch (info) {
        let errorCode = getErrnoCode(info);
        if (errorCode !== "EINVAL" && errorCode !== "ENOENT" && errorCode !== "ENOTDIR") return null;
      }
      let parentReal;
      if (component === current || linkTarget !== void 0) {
        dirs.add(parent);
        let L = resolveExistingPrefix(parent);
        if (L === null) return null;
        if ((dirs.add(L.path), !excludeLeaves))
          (dirs.add(component), dirs.add(join_9(L.path, basename_2(component))));
        if (L.exists) parentReal = L.path;
      }
      if (linkTarget !== void 0) {
        let L = resolveLinkTarget(parentReal, linkTarget);
        if (L === null) return null;
        stack.push(L);
      }
    }
  }
  return [...dirs];
}
//@ chunk-fq0cr76a.js:928143-928346 placement
function resolveLinkTarget(e, n) {
  let parts = n.split("/"),
    index = parts.findIndex((y) => y !== ".." && y !== "." && y !== ""),
    h = index !== -1 && parts.indexOf("..", index) !== -1;
  if (isAbsolute_2(n)) return parts.includes("..") ? null : resolve_2(n);
  if (h || e === void 0) return null;
  return resolve_2(e, n);
}
//@ chunk-fq0cr76a.js:928346-928577 placement
function followDanglingLink(e, n, r = !1) {
  let s;
  try {
    s = realpathSync(dirname_7(e));
  } catch {
    return null;
  }
  let h = resolveLinkTarget(s, n);
  for (let y = 0; y < 8 && h !== null; y++) {
    if (r && J0(h, s) !== void 0) return null;
    let b;
    try {
      b = readlinkSync(h);
    } catch {
      return h;
    }
    try {
      s = realpathSync(dirname_7(h));
    } catch {
      return null;
    }
    h = resolveLinkTarget(s, b);
  }
  return null;
}
//@ chunk-fq0cr76a.js:928577-928629 placement
function Wce(e) {
  try {
    return realpathSync(e);
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:928629-928693 placement
function O4(e) {
  return getPlatform() === "windows" ? e : e.replaceAll("[", "[[]");
}
/**
 * 取 realpath；目标不存在时用父目录 realpath 拼上文件名；再失败原样返回。
 */
//@ chunk-fq0cr76a.js:928693-928779 placement
function realpathOrParentRealpath(e) {
  try {
    return realpathSync(e);
  } catch {
    try {
      return resolve_2(realpathSync(dirname_7(e)), basename_2(e));
    } catch {
      return e;
    }
  }
}
/**
 * macOS 下为拒绝条目补上真实路径"双胞胎"：展开 ~，对非通配路径（或允许时的通配基目录）解析真实路径与父目录真实路径，生成额外条目追加到列表，并缓存到适配器状态。
 */
//@ chunk-fq0cr76a.js:928779-930116 placement
function addRealPathDenyTwins(denyPaths, kind, realPathMemo, allowGlobBases) {
  if (getPlatform() !== "macos" || getSandboxAdapterState().realPathTwins === "off") return denyPaths;
  let walkMemo = createWalkMemo(),
    previous = getSandboxAdapterState().realPathsOfDenies[kind],
    resolvedByDeny = new Map(),
    reportedCodes = new Set(),
    extraPaths = [],
    scrubLiterals =
      kind === "write" ? getSandboxAdapterState().symlinkedDenyScrubPaths.map((index) => index.literal) : [];
  for (let [D, entry] of [...denyPaths, ...scrubLiterals].entries()) {
    let escaped = kind === "read" ? entry.replaceAll("[[]", "\x00") : entry,
      replaced = (
        escaped === "~" || escaped.startsWith("~/") ? join_9(homedir_3(), escaped.slice(1)) : escaped
      ).replaceAll("\x00", "["),
      matches = /[*?[]/.test(escaped),
      baseDir = matches ? getGlobBaseDirectory_2(replaced) : replaced;
    if ((matches && (!allowGlobBases || D >= denyPaths.length)) || !isAbsolute_2(baseDir)) continue;
    let sliced = replaced.slice(baseDir.length),
      ie = previous.get(replaced),
      twins = ie ?? new Set(),
      parentReal,
      failureCode;
    try {
      let selfReal = D < denyPaths.length ? resolveRealPathForDeny(baseDir, realPathMemo, walkMemo) : baseDir,
        parentResolved =
          selfReal === freeze ? freeze : resolveRealPathForDeny(dirname_7(baseDir), realPathMemo, walkMemo);
      if (selfReal !== freeze && parentResolved !== freeze) {
        let ft = typeof selfReal === "string" || twins.size > 0 ? baseDir : resolveThroughLinks(baseDir);
        if (typeof selfReal !== "string" && ft === void 0) failureCode = selfReal.code;
        if (
          ((parentReal = typeof parentResolved === "string" ? parentResolved : void 0),
          typeof selfReal === "string" || twins.size === 0)
        )
          twins = new Set(
            [
              typeof selfReal === "string" ? selfReal : typeof ft === "string" ? ft : baseDir,
              typeof parentResolved === "string" ? join_9(parentResolved, basename_2(baseDir)) : baseDir,
            ].filter((rt) => rt !== baseDir || D >= denyPaths.length),
          );
      }
    } catch (error) {
      (reportSandboxErrorUnderStandIn(error, "realPathOfDenyNotFound"),
        (failureCode = error instanceof Error ? error.name : "unknown"));
    }
    if (failureCode !== void 0 && !reportedCodes.has(failureCode))
      (reportedCodes.add(failureCode),
        logForDebugging(`[sandbox] a ${kind} deny keeps its spelling (${failureCode})`, { level: "warn" }));
    let me = `${kind} deny ${replaced}`,
      Ne = [dirname_7(baseDir), parentReal ?? dirname_7(baseDir)],
      finalTwins =
        twins === ie && parentReal === void 0
          ? twins
          : new Set([...twins].flatMap((Ie) => toDenyTwinSpelling(Ie, sliced, Ne, me) ?? []));
    if ((resolvedByDeny.set(replaced, finalTwins), finalTwins.size > 0))
      getSandboxAdapterState().realPathTwins = "listed";
    for (let Ie of finalTwins) extraPaths.push(Ie + sliced);
  }
  return (
    (getSandboxAdapterState().realPathsOfDenies[kind] = resolvedByDeny),
    extraPaths.length === 0 ? denyPaths : denyPaths.concat(extraPaths)
  );
}
//@ chunk-fq0cr76a.js:930116-930157 placement
var Gce = /[*?[\]"\\\0-\x1f\x7f]/g,
  Hce = 900;
/**
 * 把拒绝条目的真实路径改写为可用的"双胞胎"写法；会覆盖到拒绝之上、无法拼写或过长时保留原写法并警告。
 */
//@ chunk-fq0cr76a.js:930157-930692 placement
function toDenyTwinSpelling(e, n, r, s) {
  let replaced = e.replace(Gce, "?"),
    fullPattern = replaced + n,
    probe = /[*?[]/.test(fullPattern)
      ? fullPattern
          .replace(/[.^$+{}()|[\]]/g, "...")
          .replace(/[*?]/g, "?????")
          .replace(/["\\\0-\x1f\x7f\ud800-\udfff]/g, "xxxxxx")
      : fullPattern,
    sliced = replaced.slice(0, replaced.lastIndexOf(sep, replaced.indexOf("?")) + 1),
    skipReason = r.some((R) => join_9(R, sep).startsWith(join_9(e, sep)))
      ? "above-the-deny"
      : replaced.includes("?") && !r.some((R) => sliced.startsWith(join_9(R, sep)))
        ? "covered-above-the-deny"
        : /\ufffd|__GLOBSTAR/.test(e)
          ? "unspellable"
          : Buffer.byteLength(probe) > Hce && "too-long";
  if (skipReason) {
    logForDebugging(`[sandbox] ${s} keeps its spelling (${skipReason})`, { level: "warn" });
    return;
  }
  return replaced;
}
//@ chunk-fq0cr76a.js:930692-930737 placement
var freeze = Object.freeze({ code: "not-looked-at" });
/**
 * 解析拒绝路径的真实路径（带缓存与深度限制）：主机共享路径返回特殊标记，不安全或未审核的链接返回错误码，缺失尾部时解析存在的前缀再拼回，悬空链接按链接目标继续解析。
 */
//@ chunk-fq0cr76a.js:930737-931669 placement
function resolveRealPathForDeny(path, memo, walkMemo, depth = 0) {
  let cached = memo.get(path);
  if (cached !== void 0) return cached;
  if (depth > Hd) return { code: "too-deep" };
  let cwd = getCwdState(),
    hostKind = J0(path, cwd);
  if (hostKind !== void 0) {
    let result = hostKind === "host" ? freeze : { code: hostKind };
    return (memo.set(path, result), result);
  }
  let walk = rawPointerPathWalk(path, cwd, walkMemo),
    stopKind = walk.unsafe ? (walk.stoppedAt?.kind ?? "link") : void 0;
  if (stopKind !== void 0 && stopKind !== "special") {
    let O = { code: stopKind === "other" ? "unknown" : "not-vetted" };
    try {
      if (stopKind === "other") lstatSync(walk.stoppedAt?.path ?? path);
    } catch (errorCode) {
      O.code = getErrnoCode(errorCode) ?? O.code;
    }
    return (memo.set(path, O), O);
  }
  let missingCount = walk.missingTail ?? 0;
  if (missingCount > 0) {
    let parts = path.split(sep),
      L = parts.slice(0, -missingCount).join(sep) || sep,
      parent = resolveRealPathForDeny(L, memo, walkMemo, depth + 1),
      K = typeof parent === "string" ? join_9(parent, ...parts.slice(-missingCount)) : parent;
    return (memo.set(path, K), K);
  }
  let resolved;
  try {
    resolved = realpathPlaceable(path);
  } catch (error) {
    let L = getErrnoCode(error) ?? "unknown",
      V = dirname_7(path);
    if (!(L === "ENOENT" || L === "ENOTDIR") || V === path) resolved = { code: L };
    else {
      let linkTarget;
      try {
        linkTarget = followDanglingLink(path, readlinkSync(path), !0);
      } catch (parentResolved) {
        let linkError = getErrnoCode(parentResolved);
        linkTarget =
          linkError === "ENOENT" || linkError === "ENOTDIR" || linkError === "EINVAL" ? void 0 : null;
      }
      if (linkTarget === void 0) {
        let Z = resolveRealPathForDeny(V, memo, walkMemo, depth + 1);
        resolved = typeof Z === "string" ? join_9(Z, basename_2(path)) : Z;
      } else
        resolved =
          linkTarget === null || linkTarget === path
            ? { code: "unknown" }
            : resolveRealPathForDeny(linkTarget, memo, walkMemo, depth + 1);
    }
  }
  return (memo.set(path, resolved), resolved);
}
/**
 * 手工逐段跟随符号链接解析路径（限跳数）；遇到主机共享路径返回特殊标记，无法解析返回 undefined。
 */
//@ chunk-fq0cr76a.js:931669-932276 placement
function resolveThroughLinks(e) {
  let filtered = e.split(sep).filter((h) => h !== "" && h !== "."),
    current = sep,
    sawLink = !1;
  for (let h = 0, y = 0; h < filtered.length;) {
    let b = filtered[h] ?? "";
    if (b === "..") {
      ((current = dirname_7(current)), h++);
      continue;
    }
    let candidate = join_9(current, b),
      linkTarget,
      errorCode;
    try {
      if (J0(candidate, getCwdState()) !== void 0) linkTarget = candidate;
      else linkTarget = readlinkSync(candidate);
    } catch (error) {
      errorCode = getErrnoCode(error) ?? "unknown";
    }
    let D = linkTarget === void 0 ? void 0 : J0(linkTarget, current);
    if (D !== void 0) return D === "host" ? freeze : void 0;
    if (errorCode === "ENOENT" || errorCode === "ENOTDIR")
      return sawLink ? join_9(candidate, ...filtered.slice(h + 1)) : void 0;
    if (errorCode !== void 0 && errorCode !== "EINVAL")
      return sawLink && h === filtered.length - 1 ? candidate : void 0;
    if (linkTarget === void 0) ((current = candidate), h++);
    else if (++y > Hd) return;
    else {
      sawLink = !0;
      let O = isAbsolute_2(linkTarget);
      ((filtered = [...linkTarget.split(sep).filter((L) => L !== "" && L !== "."), ...filtered.slice(h + 1)]),
        (current = O ? sep : current),
        (h = 0));
    }
  }
  return sawLink ? current : void 0;
}
//@ chunk-fq0cr76a.js:932276-932363 placement
function J0(e, n) {
  if (!isOnForeignMount(e, n)) return;
  return isMacSpecialPath(e) || isMacSpecialPath(resolve_2(n, e)) ? "kernel-resolved" : "host";
}
//@ chunk-fq0cr76a.js:932363-932382 placement
var Hd = 32,
  jce = 1024;
//@ chunk-fq0cr76a.js:932382-932594 placement
function resolveExistingPrefix(e) {
  let n = [];
  for (let r = e; ; r = dirname_7(r))
    try {
      let s = realpathPlaceable(r);
      return { path: n.length === 0 ? s : join_9(s, ...n), exists: n.length === 0 };
    } catch (error) {
      let h = getErrnoCode(error);
      if ((h !== "ENOENT" && h !== "ENOTDIR") || dirname_7(r) === r) return null;
      n.unshift(basename_2(r));
    }
}
/**
 * 求路径的真实位置：普通文件/目录直接 realpath；特殊文件解析其父目录；指向特殊文件的链接逐跳跟随，超过上限抛 ELOOP。
 */
//@ chunk-fq0cr76a.js:932594-932929 placement
function realpathPlaceable(e) {
  let n = e;
  for (let r = 0; ; r++) {
    let s = lstatSync(n),
      h = s.isSymbolicLink() ? statSync(n) : s;
    if (h.isFile() || h.isDirectory()) return realpathSync(n);
    let y = dirname_7(n);
    if (!s.isSymbolicLink()) return join_9(realpathPlaceable(y), basename_2(n));
    let b = r < Hd ? resolveLinkTarget(realpathSync(y), readlinkSync(n)) : null;
    if (b === null)
      throw Object.assign(Error("ELOOP: a link chain onto a special file cannot be placed"), {
        code: "ELOOP",
      });
    n = b;
  }
}
//@ chunk-fq0cr76a.js:932929-932944 placement
var L4 = 8388608;
/**
 * 为遮罩/禁止扫描求路径的规范形式：逐级向上找到可 realpath 的祖先再拼回缺失尾段；遇到禁区或不安全链接停止解析并返回原样；可选回填 settled/stoppedAt/throughLink 状态。
 */
//@ chunk-fq0cr76a.js:932944-933598 placement
function canonicalizePathForMaskSweep(e, n, r) {
  if (n) ((n.settled = !1), (n.stoppedAt = void 0), (n.throughLink = !1));
  let s = [],
    h = getCwdState(),
    y = e;
  if (isOnForeignMount(y, h)) return e;
  let b = rawPointerPathWalk(y, h, r);
  if (n) ((n.stoppedAt = b.stoppedAt), (n.throughLink = b.throughLink));
  if (b.unsafe) return e;
  if (b.missingTail !== null) {
    let w = e;
    for (let R = 0; R < b.missingTail; R++) {
      let D = dirname_7(w);
      if (D === w) break;
      if ((s.push(basename_2(w)), (w = D), isOnForeignMount(w, h))) return e;
    }
    try {
      let R = realpathSync(w);
      if (n) n.settled = s.length === 0;
      return s.length === 0 ? R : join_9(R, ...s.reverse());
    } catch {
      if (((s.length = 0), n)) n.stoppedAt = void 0;
    }
  }
  let S = b.missingTail === null;
  for (;;) {
    if (!S && (isOnForeignMount(y, h) || rawPointerPathIsUnsafe(y, h))) break;
    S = !1;
    try {
      y = realpathSync(y);
      break;
    } catch {
      let w = dirname_7(y);
      if (w === y) break;
      (s.push(basename_2(y)), (y = w));
    }
  }
  return s.length === 0 ? y : join_9(y, ...s.reverse());
}
//@ chunk-fq0cr76a.js:933598-933629 placement
var Yce = ["/etc", "/tmp", "/var"];
//@ chunk-fq0cr76a.js:933629-933844 placement
function isOsLinkedRootAlias(e, n) {
  let { osLinkedRootRealpaths: osLinkedRootRealpaths } = getProcessSandboxState();
  return Yce.some((s) => {
    if (e !== s && !e.startsWith(s + sep)) return !1;
    let h = osLinkedRootRealpaths.get(s);
    if (h === void 0) {
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
    return (getSandboxAdapterState().denyLiteralSymlinkCandidates.push(e), [e]);
  }
  let r;
  try {
    r = realpathSync(e);
  } catch {
    r = followDanglingLink(e, n) ?? resolve_2(dirname_7(e), n);
    for (let s = 0; s < 8; s++) {
      let h;
      try {
        h = readlinkSync(r);
      } catch {
        break;
      }
      r = resolve_2(dirname_7(r), h);
    }
  }
  return [r, e];
}
/**
 * 逐段遍历路径，记录途中经过的所有符号链接（是否仍有效），遇到无法读取或不存在的段时返回缺失信息与落点。
 */
//@ chunk-fq0cr76a.js:934061-934679 placement
function traceSymlinkHops(e) {
  let links = [],
    separatorPattern = getPlatform() === "windows" ? /[\\/]/ : "/",
    root = parse(e).root,
    parts = e.slice(root.length).split(sep),
    y = [];
  while (y.length + parts.length > 0) {
    let segment = y.shift() ?? parts.shift() ?? "";
    if (segment === "..") root = dirname_7(root);
    else if (segment !== "" && segment !== ".") {
      let candidate = join_9(root, segment),
        linkTarget;
      try {
        linkTarget = readlinkSync(candidate);
      } catch (error) {
        let errorCode = getErrnoCode(error);
        if (errorCode !== "EINVAL") {
          let K = join_9(candidate, ...y, ...parts);
          return {
            links: links,
            missing: {
              name: candidate,
              landing: K,
              isUnreadable: errorCode !== "ENOENT" && errorCode !== "ENOTDIR",
            },
          };
        }
        root = candidate;
        continue;
      }
      let R = resolveExistingPrefix(candidate)?.exists === !0;
      if ((!R && links.some((L) => L.path === candidate)) || links.length >= jce)
        return { links: links, missing: null };
      links.push({ path: candidate, isLive: R });
      let { root: root_2 } = parse(linkTarget);
      ((root = root_2 === "" ? root : root_2),
        y.unshift(...linkTarget.slice(root_2.length).split(separatorPattern)));
    }
  }
  return { links: links, missing: null };
}
//@ chunk-fq0cr76a.js:934679-934978 placement
function normalizeWindowsDirPath(e) {
  if (getPlatform() !== "windows") return e;
  let replaced = e.replace(/[\\/]+$/, ""),
    r = replaced;
  if (/^~(?:[\\/]|$)/.test(replaced))
    try {
      r = expandPath(replaced.replace(/^~\\/, "~/"));
    } catch {}
  let s = oD(r);
  if (replaced.length === 0 || /^[A-Za-z]:$/.test(s)) return e;
  if (/^[\\/]{2}/.test(s) || isWindowsDevicePath(r)) return replaced;
  try {
    if (!statSync(r).isDirectory()) return replaced;
  } catch {}
  return replaced + sep;
}
//@ chunk-fq0cr76a.js:934978-935046 placement
function F$(e, n) {
  return /[\\/]$/.test(e.trim()) && !Jxe(oD(n)) ? normalizeWindowsDirPath(n) : n;
}
//@ chunk-fq0cr76a.js:935046-935087 placement = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  return resolve_2(filePath, ".claude", ATOMIC_WRITE_DIRNAME);
}
//@ chunk-fq0cr76a.js:935087-935255 placement = _temp8 (1)
function getAtomicWriteDirs(a_3 = !0) {
  let n = new Set();
  if ((n.add(isInGlobalClaudeFolder(getOriginalCwd())), a_3)) n.add(isInGlobalClaudeFolder(getCwdState()));
  (n.add(isInGlobalClaudeFolder(getProjectRoot())),
    n.add(resolve_2(getClaudeConfigDir(), ATOMIC_WRITE_DIRNAME)));
  let r = getSettingsFilePathForSource("localSettings");
  if (r) n.add(join_9(dirname_7(r), ATOMIC_WRITE_DIRNAME));
  return [...n];
}
//@ chunk-fq0cr76a.js:935255-935325 placement
function scrubBareGitRepoFiles(e) {
  (mkdirSync(dirname_7(e), { recursive: !0 }), mkdirSync(e, { recursive: !0, mode: 448 }));
}
//@ chunk-fq0cr76a.js:935325-935464 placement
function isParentDirReal(e) {
  try {
    return (
      closeSync(openSync(dirname_7(e), constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW)),
      !0
    );
  } catch (error) {
    let r = getErrnoCode(error);
    return r !== "ELOOP" && r !== "ENOTDIR";
  }
}
/**
 * 确保桥接子进程的私有根目录存在，失败只告警。
 */
//@ chunk-fq0cr76a.js:935464-935611 placement
async function ensureBridgeSpawnRootDir() {
  await ensurePrivateDir().catch((e) =>
    logForDebugging(
      `ensureBridgeSpawnRootDir: could not create the bridge-spawn root: ${getErrnoCode(e) ?? "error"}`,
      { level: "warn" },
    ),
  );
}
/**
 * 确保原子写暂存目录存在且是真实目录（文件或坏目录会被删掉重建），并记录其 dev/ino 身份防止被替换；首次还会把 .claude/<暂存目录>/ 加进全局 gitignore。
 */
//@ chunk-fq0cr76a.js:935611-936553 placement
function ensureAtomicWriteStagingDirs() {
  for (let n of getAtomicWriteDirs(!wt())) {
    if (!isParentDirReal(n)) continue;
    let r = !1;
    try {
      if (!lstatSync(n).isDirectory()) {
        if (!isParentDirReal(n)) continue;
        (unlinkSync(n), scrubBareGitRepoFiles(n), (r = !0));
      } else
        try {
          (closeSync(openSync(n, constants.O_RDONLY | constants.O_DIRECTORY)), (r = !0));
        } catch {
          try {
            if (!isParentDirReal(n)) continue;
            (rmdirSync(n), scrubBareGitRepoFiles(n), (r = !0));
          } catch {}
        }
    } catch {
      try {
        if (!isParentDirReal(n)) continue;
        (scrubBareGitRepoFiles(n), (r = !0));
      } catch (error) {
        (logForDebugging(`ensureAtomicWriteStagingDirs: failed to create ${n}: ${error}`),
          logFeatureSad("sandbox_exec", "atomic_write_staging_dir_create_failed"));
      }
    }
    try {
      let s = openSync(n, constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW);
      try {
        let h = fstatSync(s);
        cMi(n, h.dev, h.ino, s);
      } catch (error) {
        throw (closeSync(s), error);
      }
    } catch (error) {
      if (r)
        YMt(
          `Staging dir ${n} was just established but identity-record open failed (${getErrnoCode(error) ?? error})`,
        );
    }
  }
  let e = getProcessSandboxState();
  if (!e.stagingDirGitignoreFired)
    ((e.stagingDirGitignoreFired = !0),
      addFileGlobRuleToGitignore(`.claude/${ATOMIC_WRITE_DIRNAME}/`, getOriginalCwd()).then((n) => {
        if (!n.written) return;
        if (n.effective) logFeatureOk("gitignore_global_rule");
        else if (n.reason === "already_tracked") logFeatureSad("gitignore_global_rule", n.reason);
        else logFeatureBad("gitignore_global_rule", n.reason ?? "write_ineffective");
      }));
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
        return (statSync(e), "head");
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
      return !0;
    case "folder":
    case "absent":
      return !1;
  }
}
//@ chunk-fq0cr76a.js:937135-937264 placement
function isFileOrRefsLink(e) {
  switch (e) {
    case "file_or_special":
    case "link_to_refs":
      return !0;
    case "folder":
    case "other_link":
    case "absent":
      return !1;
  }
}
/**
 * 把合并设置转成 sandbox-runtime 配置 {network:{allowedDomains,deniedDomains,unix socket/本地绑定/代理端口,tlsTerminate}, filesystem:{denyRead,allowRead,allowWrite,denyWrite,disabled?}, ignoreViolations, credentials, enableWeakerNestedSandbox, allowNestedUserNamespaces, enableWeakerNetworkIsolation, allowAppleEvents, git.safeDirectories, ripgrep, seccomp, bwrapPath, socatPath, windows?}。允许域名来自 sandbox.network.allowedDomains 与 WebFetch(domain:…) allow 规则（管理员强制/strictAllowlist 时只认可信层，allowManagedDomainsOnly 时只认托管层）；读禁止来自 Read(...) deny 规则、sandbox.filesystem.denyRead、credentials.files；写允许含 cwd、额外工作目录、Edit(...) allow 规则、临时目录，写禁止含 settings 文件、.claude 下 skills/agents/commands/hooks、.git/hooks 与 config、.mcp.json 等；relaxed 文件系统策略下置 disabled。构建失败抛 SandboxPathEntryError。
 */
//@ chunk-fq0cr76a.js:937264-987937 placement
function convertToSandboxRuntimeConfig(settings) {
  let adapterState = getSandboxAdapterState();
  adapterState.scrubParentMemo.clear();
  let permissionsSettings = settings.permissions || {},
    managedSources = getAllPolicyTierSettings(),
    evalConfinedEnv = env.CLAUDE_CODE_EVAL_CONFINED,
    y = (j) => !evalConfinedEnv || (j === "userSettings" && isSettingSourceEnabled("userSettings")),
    managedDomainsOnly = managedSources.some((j) => j.sandbox?.network?.allowManagedDomainsOnly === !0),
    managedReadPathsOnly = managedSources.some(
      (j) => j.sandbox?.filesystem?.allowManagedReadPathsOnly === !0,
    ),
    adminMandate = isAdminSandboxMandate(),
    R = isStrictNetworkAllowlistConfigured(),
    D = adminMandate || R,
    O = adminMandate || hasTrustedReadDenies(),
    L = O ? getTrustedReadDenyRoots() : void 0,
    V,
    K,
    q = () => {
      if (V === void 0)
        if (L) {
          let j = resolveTrustedReadDenyRoots(L);
          ((V = j.roots), (K = j.resolution));
        } else V = getBuiltinTrustedDenyRoots();
      return V;
    },
    allowedDomains = [],
    deniedDomains = [];
  if (managedDomainsOnly && evalConfinedEnv);
  else if (evalConfinedEnv) {
    if (isSettingSourceEnabled("userSettings"))
      for (let j of getSettingsForSource("userSettings")?.sandbox?.network?.allowedDomains ?? [])
        allowedDomains.push(j);
  } else if (managedDomainsOnly)
    for (let j of managedSources) {
      for (let ce of j.sandbox?.network?.allowedDomains || []) allowedDomains.push(ce);
      for (let ce of j.permissions?.allow || []) {
        let Ee = parseRuleForSandbox(ce);
        if (Ee.toolName === WEBFETCH && Ee.ruleContent?.startsWith("domain:"))
          allowedDomains.push(Ee.ruleContent.substring(7));
      }
    }
  else {
    for (let j of D
      ? collectFromSandboxSettings((ce) => ce.network?.allowedDomains)
      : settings.sandbox?.network?.allowedDomains || [])
      allowedDomains.push(j);
    for (let j of D ? collectAllowRules() : permissionsSettings.allow || []) {
      let ce = parseRuleForSandbox(j);
      if (ce.toolName === WEBFETCH && ce.ruleContent?.startsWith("domain:"))
        allowedDomains.push(ce.ruleContent.substring(7));
    }
    if (D && !adapterState.droppedRepoAllowedDomainsLogged) {
      adapterState.droppedRepoAllowedDomainsLogged = !0;
      let reduced = ["projectSettings", "localSettings"]
        .map((ce) => (isSettingSourceEnabled(ce) ? getSettingsForSource(ce) : null))
        .reduce(
          (ce, Ee) =>
            ce +
            (Ee?.sandbox?.network?.allowedDomains?.length ?? 0) +
            count(Ee?.permissions?.allow ?? [], (We) => {
              let tt = parseRuleForSandbox(We);
              return tt.toolName === WEBFETCH && tt.ruleContent?.startsWith("domain:") === !0;
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
    let ce = parseRuleForSandbox(j);
    if (ce.toolName === WEBFETCH && ce.ruleContent?.startsWith("domain:"))
      deniedDomains.push(ce.ruleContent.substring(7));
  }
  let ie = {},
    ae;
  for (let j = deniedDomains.length - 1; j >= 0; j--) {
    let ce = deniedDomains[j];
    if (ce === void 0) continue;
    let Ee = addTrailingDotFreeVariants(expandBareIpv6Hosts([ce]));
    if (Ee.length === 1 && Ee[0] === ce) continue;
    deniedDomains.splice(j, 1, ...Ee);
    let We = ie[ce];
    if (We !== void 0) {
      delete ie[ce];
      for (let tt of Ee) ie[tt] = We;
    }
  }
  allowedDomains.splice(0, allowedDomains.length, ...normalizeIpv6HostEntries(allowedDomains));
  let Se = evalConfinedEnv ? [getClaudeTempDirRealpath()] : [".", getClaudeTempDirRealpath()],
    ue = getChildProcessTmpDirRealpath();
  if (ue !== getClaudeTempDirRealpath()) Se.push(ue);
  let me = [...Se],
    Ne = [],
    Ce = (j, ce, Ee = !1) => {
      let We = ce ? [resolveDenySymlink(j)] : expandDenySymlink(j);
      Ne.push(...(Ee ? We.map(normalizeWindowsDirPath) : We));
    },
    Ie = [],
    he = [];
  ((adapterState.symlinkedDenyScrubPaths.length = 0), (adapterState.denyLiteralSymlinkCandidates.length = 0));
  let filtered = SETTING_SOURCES.map((j) => getSettingsFilePathForSource(j)).filter((j) => j !== void 0),
    rt = getLegacyLocalSettingsFilePath();
  if (rt) filtered.push(rt);
  if (
    (filtered.push(...getFlagAgentsFilePaths()),
    filtered.push(...getFlagMcpConfigFilePaths()),
    Ne.push(...filtered.map(resolveDenySymlink)),
    Ne.push(normalizeWindowsDirPath(getDropInDir())),
    getPlatform() === "wsl")
  )
    (Ne.push(join_9(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json")),
      Ne.push(join_9(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d")));
  let ut = getCwdState(),
    we = getOriginalCwd(),
    Ae = !wt();
  if (!Ae) getSandboxAdapterState().builtAsThinClient = !0;
  if (ut !== we)
    (Ne.push(resolveDenySymlink(resolve_2(ut, ".claude", "settings.json"))),
      Ne.push(resolveDenySymlink(resolve_2(ut, ".claude", "settings.local.json"))));
  if ((Ce(resolve_2(we, ".claude", "skills"), !0, !0), ut !== we))
    Ce(resolve_2(ut, ".claude", "skills"), !0, !0);
  if ((Ce(resolve_2(we, ".claude", "hooks"), !0, !0), ut !== we))
    Ce(resolve_2(ut, ".claude", "hooks"), !0, !0);
  (Ne.push(normalizeWindowsDirPath(resolve_2(getClaudeConfigDir(), "local"))),
    Ne.push(...getAtomicWriteDirs().map(normalizeWindowsDirPath)),
    Ce(resolve_2(getClaudeConfigDir(), "jobs"), !0, !0));
  let dt = resolve_2(getClaudeConfigDir(), "seed-admin");
  try {
    mkdirSync(dt, { recursive: !0, mode: 448 });
  } catch {}
  (Ce(dt, !1, !0),
    Ie.push(normalizeWindowsDirPath(O4(realpathOrParentRealpath(dt)))),
    Ce(resolve_2(getClaudeConfigDir(), "daemon"), !0, !0),
    Ce(yqt(), !0, !0),
    Ie.push(normalizeWindowsDirPath(realpathOrParentRealpath(yqt()))));
  let Me = getBashEditDiffDir();
  try {
    mkdirSync(Me, { recursive: !0, mode: 448 });
  } catch {}
  (Ce(Me, !1, !0), Ie.push(normalizeWindowsDirPath(Me)));
  let Ft = [
      signatureFileFor("policy-limits.json"),
      signatureIatFileFor("policy-limits.json"),
      aat("policy-limits.json"),
    ],
    xn = new Set([
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
    let ce = resolveDenySymlink(resolve_2(getClaudeConfigDir(), j));
    Ne.push(xn.has(j) ? ce : normalizeWindowsDirPath(ce));
  }
  Ce(resolve_2(getClaudeConfigDir(), "loop.md"), !1);
  let mt = resolve_2(getClaudeConfigDir(), "cowork_plugins");
  Ce(mt, !1, !0);
  let Mt = resolve_2(gte()),
    mn = resolve_2(getClaudeConfigDir()),
    Nt = resolveExistingPrefix(mn),
    Wt = Nt?.path ?? realpathOrParentRealpath(mn),
    gt = join_9(Wt, basename_2(Mt)),
    jt = adapterState.devModsRoots.get(mn);
  if (jt === void 0) ((jt = { made: null, denied: new Set() }), adapterState.devModsRoots.set(mn, jt));
  if ((jt.made === null || jt.made === gt) && ensurePrivateDirChain(Wt, gt, pde)) jt.made = gt;
  else if (jt.made === null && Nt?.exists === !0)
    logForDebugging(
      `[sandbox] the dev-mods root is not a plain directory under the config home; denied as it stands: ${Mt}`,
      { level: "warn" },
    );
  jt.denied.add(gt);
  let Xe = traceSymlinkHops(Mt),
    filtered_2 = Xe.links.filter((link) => !link.isLive);
  for (let j of uniq([
    ...jt.denied,
    Mt,
    ...filtered_2.map((ce) => ce.path),
    ...(Xe.missing === null ? [] : [Xe.missing.name, Xe.missing.landing]),
  ]))
    Ce(j, !1, !0);
  let Je = peekTaskOutputDir();
  if (ensurePrivateDirChain(getClaudeTempDirRealpath(), Je)) (Ce(Je, !1, !0), (taskOutputDirChainRoot = Je));
  else
    ((taskOutputDirChainRoot = void 0),
      logForDebugging(
        `[sandbox] task output dir chain is not plain directories; read-only deny skipped: ${Je}`,
        { level: "warn" },
      ),
      logFeatureSad("sandbox_exec", "task_output_deny_skipped"));
  let vt = isPluginToolStagingDenyEnabled();
  if (((Mp = void 0), vt && getPlatform() !== "windows")) {
    if (
      ((Mp = resolve_2(getClaudeTempDirRealpath(), PLUGIN_TOOL_STAGING_DIRNAME)), !verifyStagedMcpCallDir())
    )
      (logForDebugging(
        `[sandbox] staged mcp_call directory is not a plain directory under the temp root; sandboxed commands may still be able to write there: ${Mp}`,
        { level: "warn" },
      ),
        logFeatureSad("sandbox_exec", "plugin_tool_staging_dir_not_plain"));
    Ce(Mp, !1, !0);
  }
  let Lt = projectPluginsDir();
  if (Lt !== resolve_2(getClaudeConfigDir(), "plugins") && Lt !== mt && !Bp(Lt)) Ce(Lt, !1, !0);
  for (let j of getPluginSeedDirs()) {
    let ce = resolve_2(getOriginalCwd(), j);
    if (!Bp(ce)) Ce(ce, !1, !0);
  }
  for (let j of updateDeniedProducerDirs(pluginRootDirs()))
    if (isAbsolute_2(j) && !Bp(resolve_2(j))) Ce(resolve_2(j), !1, !0);
  for (let j of commandProducerDirs()) if (!Bp(j)) Ce(j, !1, !0);
  let ln = JRi(),
    Zt = new Set(
      [
        ...(isAdminPolicyOrigin(getBasePolicySettingsOrigin())
          ? policyHelperPaths(getBasePolicySettings())
          : []),
        ...(ln === null ? [] : [ln]),
        ...QRi(),
      ]
        .filter((j) => !isWindowsDevicePath(j) && !fOn(j))
        .map((j) => resolve_2(j)),
    );
  for (let j of Zt) {
    if (Bp(j)) continue;
    if (getPlatform() === "windows")
      try {
        lstatSync(j);
      } catch (error) {
        if (isFsInaccessible(error)) continue;
      }
    Ce(j, !1);
  }
  for (let j of ["mcp-skill-archives", "mcp-discovery-cache", "shares"])
    Ce(resolve_2(getClaudeConfigDir(), j), !1, !0);
  for (let j of Q6r) Ce(resolve_2(getClaudeConfigDir(), j), !1, !0);
  for (let j of ["remote-settings-helper-consent", "remote-settings-consent.json"])
    Ce(resolve_2(getClaudeConfigDir(), j), !1);
  let kn = getMockRemoteSettingsFixturePath(),
    zr = kn !== void 0 ? resolve_2(kn) : void 0;
  for (let j of new Set([
    resolve_2(getClaudeConfigDir(), "remote-settings.json"),
    resolve_2(getSettingsPath()),
    ...(zr !== void 0 ? [zr] : []),
  ])) {
    let ce = !1,
      Ee = !1;
    try {
      let We = lstatSync(j);
      ((ce = We.isCharacterDevice()), (Ee = We.isSymbolicLink() && statSync(j).isCharacterDevice()));
    } catch {}
    if (Ee) Ne.push(j);
    else if (!ce) Ce(j, !1);
    if (j !== zr) (Ce(signatureFileFor(j), !1), Ce(signatureIatFileFor(j), !1), Ce(oYe(j), !1));
  }
  Ce(resolve_2(getClaudeConfigDir(), "state"), !1, !0);
  let Pa = resolve_2(homedir_3(), ".claude", "state");
  if (Pa !== resolve_2(getClaudeConfigDir(), "state")) Ce(Pa, !1, !0);
  let Uc = isSshStoreWriteDenyEnabled();
  if (Uc) {
    let j = resolve_2(homedir_3(), uM);
    if (getPlatform() !== "windows")
      try {
        mkdirSync(j, { recursive: !0, mode: 448 });
      } catch {}
    Ce(j, !1, !0);
  }
  for (let j of claudeStateFilePaths()) Ne.push(resolveDenySymlink(resolve_2(j)));
  let ta = getWIFProfileStoreDenyPaths();
  if (ta !== null) {
    for (let dir of ta.dirs) {
      try {
        mkdirSync(dir, { recursive: !0, mode: 448 });
      } catch {}
      Ce(dir, !1, !0);
    }
    for (let file of ta.files) Ce(file, !1);
  }
  if (env.CLAUDE_CODE_HOST_CREDS_FILE)
    Ne.push(
      F$(
        env.CLAUDE_CODE_HOST_CREDS_FILE,
        normalizeDirectoryPattern(
          resolveDenySymlink(normalizeDirectoryPattern(env.CLAUDE_CODE_HOST_CREDS_FILE)),
        ),
      ),
    );
  {
    let j = new Set();
    for (let ce of getIdeLockfilesPaths()) {
      let Ee = resolve_2(ce);
      try {
        Ee = realpathSync(Ee);
      } catch {}
      if (j.has(Ee)) continue;
      (j.add(Ee), Ie.push(normalizeWindowsDirPath(Ee)), Ne.push(normalizeWindowsDirPath(Ee)));
    }
  }
  let La = (j, ce = !0) => {
    (Ce(resolve_2(j, ".claude", "launch.json"), ce),
      Ce(resolve_2(j, ".claude", "workflows"), ce, !0),
      Ce(resolve_2(j, ".claude", "routines"), ce, !0),
      Ce(resolve_2(j, ".claude", "output-styles"), !1, !0),
      Ce(resolve_2(j, ".claude", "scheduled_tasks.json"), ce),
      Ce(resolve_2(j, ".claude", "loop.md"), !1),
      Ce(resolve_2(j, ".mcp.json"), !1));
  };
  La(we);
  {
    let j = resolve_2(homedir_3()),
      ce = Tm(j) ?? j,
      Ee = ce,
      We =
        normalizePathForCompare(ce) === normalizePathForCompare(j) &&
        normalizePathForCompare(Ee) === normalizePathForCompare(resolve_2(homedir_3()).normalize("NFC")),
      tt = (Ct) => {
        (La(Ct, !1),
          Ce(resolve_2(Ct, ".claude", "skills"), !1, !0),
          Ce(resolve_2(Ct, ".claude", "commands"), !1, !0),
          Ce(resolve_2(Ct, ".claude", "agents"), !1, !0),
          Ce(resolve_2(Ct, ".claude", "hooks"), !1, !0),
          Ce(resolve_2(Ct, ".claude", "settings.json"), !1),
          Ce(resolve_2(Ct, ".claude", "settings.local.json"), !1));
      },
      bt = [getProjectRoot()],
      xt = getProjectConfigRoot();
    if (xt !== null) bt.push(xt);
    let je = !1;
    for (let Ct of bt) {
      let Qe = Ct;
      for (;;) {
        if ((tt(Qe), normalizePathForCompare(Qe) === normalizePathForCompare(Ee))) {
          if (((je = !0), We)) break;
        }
        let Bt = dirname_7(Qe);
        if (Bt === Qe) break;
        Qe = Bt;
      }
    }
    let kt = (Ct) => {
      let Qe = Ct;
      for (;;) {
        Ce(resolve_2(Qe, ".mcp.json"), !1);
        let Bt = dirname_7(Qe);
        if (Bt === Qe) break;
        Qe = Bt;
      }
    };
    for (let Ct of bt) kt(Ct);
    if (!je) (tt(Ee), kt(Ee));
    let Xt = findGitRoot(getProjectRoot()),
      Dt = findCanonicalGitRoot(getProjectRoot());
    if (Xt && Dt && normalizePathForCompare(Dt) !== normalizePathForCompare(Xt)) tt(Dt);
  }
  if (ut !== we) {
    let j = we.endsWith(sep) ? we : we + sep,
      ce = ut;
    while (ce !== we) {
      La(ce);
      let Ee = dirname_7(ce);
      if (Ee === ce || !(Ee + sep).startsWith(j)) break;
      ce = Ee;
    }
  }
  if ((Ne.push(resolve_2(we, ".mcp.json")), ut !== we)) {
    let j = we.endsWith(sep) ? we : we + sep,
      ce = ut;
    while (ce !== we) {
      Ne.push(resolve_2(ce, ".mcp.json"));
      let Ee = dirname_7(ce);
      if (Ee === ce || !(Ee + sep).startsWith(j)) break;
      ce = Ee;
    }
  }
  let na = detectWorktreeGitCommonDir(we),
    Fc = [join_9(findGitRoot(we) ?? we, ".git"), na];
  adapterState.bareGitRepoScrubPaths.clear();
  let qi = Ae ? null : new Set();
  adapterState.bareGitRepoScrubPathsVouchedLocally = qi;
  let wi = (j, ce, Ee, We) => {
      if ((registerBareRepoScrubPath(adapterState, j, Ee, We), !ce)) qi?.add(j);
    },
    ze = (j, ce, Ee, We) => wi(j, ce, Ee, We),
    cwd = process.cwd(),
    gn = /(?:\/\*\*|\/)+$/,
    vn = (j) => {
      try {
        return [expandPath(j, cwd).replace(gn, "") || sep];
      } catch (error) {
        return (warnDroppedPathEntry(error, "additionalDirectories"), []);
      }
    },
    pr = new Set(
      [
        ...(evalConfinedEnv ? [] : settings.permissions?.additionalDirectories || []),
        ...getAdditionalDirectoriesForClaudeMd(),
      ].flatMap(vn),
    ),
    dr = ["objects", "refs"],
    Ti = ["hooks", "config"],
    $s = getPlatform() === "macos",
    Ba = isUnlistableWorktreesDenyEnabled(),
    po = getPlatform() === "windows",
    jl = getPlatform() === "linux" || getPlatform() === "wsl",
    Mc = jl && readFlagWithOverride(TENGU_ENCHANTED_KITE, { safe: !0 }),
    Ua = [],
    Fa = (...j) => {
      if (!jl) return;
      if (wt()) {
        Ua.push(j);
        return;
      }
      createFileAtChain(...j);
    },
    $c = new Set(),
    ho = (j, ce) => {
      if ($c.has(j)) return;
      $c.add(j);
      let Ee = ce && !Fc.includes(j),
        We = (je) => {
          if (po && je.endsWith(".lock")) {
            wi(je, Ee, "all");
            return;
          }
          try {
            (statSync(je), Ne.push(resolveDenySymlink(je)));
          } catch (error) {
            if ((wi(je, Ee, "all", error), $s)) Ne.push(je);
          }
        };
      if ((Ce(join_9(j, "hooks"), !0, !0), Ne.push(resolveDenySymlink(join_9(j, "config"))), po))
        wi(join_9(j, "config.lock"), Ee, "all");
      else Ne.push(resolveDenySymlink(join_9(j, "config.lock")));
      let tt = join_9(j, "config.worktree");
      (Fa(j, "config.worktree"),
        Ne.push(resolveDenySymlink(tt)),
        We(join_9(j, "config.worktree.lock")),
        We(join_9(j, "commondir")));
      let bt =
        Mc &&
        isDirectoryNoFollow(j) &&
        isDirectoryNoFollow(join_9(j, "objects")) &&
        isDirectoryNoFollow(join_9(j, "objects", "info"));
      for (let je of ["alternates", "http-alternates"]) {
        let kt = join_9(j, "objects", "info", je);
        if (je === "alternates" && bt) {
          (Fa(j, "objects", "info", je), Ne.push(...expandDenySymlink(kt)));
          continue;
        }
        try {
          (lstatSync(kt), Ne.push(...expandDenySymlink(kt)));
        } catch (error) {
          if ($s || getErrnoCode(error) !== "ENOENT") Ne.push(...expandDenySymlink(kt));
        }
      }
      let xt = join_9(j, "worktrees");
      try {
        for (let je of readdirSync(xt, { withFileTypes: !0 })) {
          if (!je.isDirectory() && !je.isSymbolicLink()) continue;
          let kt = join_9(xt, je.name, "config.worktree");
          (Fa(j, "worktrees", je.name, "config.worktree"),
            Ne.push(resolveDenySymlink(kt)),
            We(join_9(xt, je.name, "config.worktree.lock")),
            Ne.push(resolveDenySymlink(join_9(xt, je.name, "commondir"))));
        }
      } catch (error) {
        let kt = getErrnoCode(error),
          Xt = kt === "ENOENT" || kt === "ENOTDIR" || kt === "ELOOP" || kt === "ENAMETOOLONG",
          Dt = !Xt && Ba && getPlatform() !== "windows";
        if (Dt) Ce(xt, !1, !0);
        if (kt === "ELOOP" || kt === "ENAMETOOLONG")
          logForDebugging(
            `[Sandbox] cannot list ${xt} (${kt}: a link loop or a path too long); treated as no folder, so there are no linked worktrees under it to protect. If it is a link you did not create, remove it.`,
            { level: "warn" },
          );
        else if (!Xt)
          logForDebugging(
            `[Sandbox] cannot list ${xt} (${kt ?? errorMessage(error)}); ${Dt ? "sandboxed commands cannot write under it until it can be listed again and the sandbox config is rebuilt (restarting Claude Code does this)" : `not write-denying it ${getPlatform() === "windows" ? "on Windows, where the deny would stay in the folder's permissions after the listing works again" : "because this protection is switched off"}. Until it can be listed again and the sandbox config is rebuilt (restarting Claude Code does this), sandboxed commands can change its linked worktrees' commondir and config.worktree files`}.`,
            { level: "warn" },
          );
      }
    },
    wn = (j) => {},
    In = new Set([we, ut]);
  for (let j of [we, ...pr]) {
    let ce = j.endsWith(sep) ? j : j + sep;
    if ((ut + sep).startsWith(ce)) {
      let Ee = ut;
      for (;;) {
        if ((In.add(Ee), Ee === j)) break;
        let We = dirname_7(Ee);
        if (We === Ee || !(We + sep).startsWith(ce)) break;
        Ee = We;
      }
    }
  }
  let rn = getFeatureValue_CACHED_MAY_BE_STALE("tengu_mighty_thimble", !0),
    sn = (j, ce) => {
      let Ee;
      try {
        Ee = lstatSync(j);
      } catch (error) {
        return { present: !1, probe: error };
      }
      if (Ee.isFile()) Ne.push(j);
      else if (Ee.isDirectory()) ho(j, ce);
      else
        try {
          if (statSync(j).isDirectory()) ho(j, ce);
        } catch (error) {
          let tt = getErrnoCode(error);
          if (tt !== "ENOENT" && tt !== "ENOTDIR" && rn) Ne.push(j);
        }
      return { present: !0 };
    };
  for (let j of In) {
    let ce = j !== we,
      Ee = resolve_2(j, "HEAD"),
      We = classifyHeadState(Ee),
      tt = isHeadPresent(We),
      bt = We === "head";
    switch (We) {
      case "head":
        Ne.push(Ee);
        break;
      case "folder":
        (ze(Ee, ce, "file"), Ne.push(Ee));
        break;
      case "dangling_head":
      case "absent":
        if ((ze(Ee, ce, "file_or_empty_folder", checkPathAbsent(Ee)), $s)) Ne.push(Ee);
        break;
      default:
    }
    for (let kt of dr) {
      let Xt = resolve_2(j, kt);
      try {
        (statSync(Xt), Ne.push(Xt));
      } catch (error) {
        if (((bt = !1), wi(Xt, ce, tt ? "all" : "all_if_a_head_survives", error), $s)) Ne.push(Xt);
      }
    }
    if (bt) ho(j, ce);
    for (let kt of Ti) {
      let Xt = resolve_2(j, kt);
      try {
        let Dt = statSync(Xt),
          Ct = kt === "config" && Dt.isFile();
        if (!tt && !Ct) {
          if (!lstatSync(Xt).isDirectory()) continue;
          let Qe = join_9(Xt, ".git");
          try {
            let Bt = lstatSync(Qe);
            if (Bt.isFile() || Bt.isDirectory()) {
              Ne.push(Qe);
              continue;
            }
          } catch (error) {
            let qr = getErrnoCode(error);
            if (qr === "ENOENT" || qr === "ENOTDIR") continue;
          }
        }
        if ((Ne.push(Xt), Ct))
          if (po) wi(resolve_2(j, "config.lock"), ce, "all");
          else Ne.push(resolve_2(j, "config.lock"));
      } catch {}
    }
    let xt = resolve_2(j, ".git"),
      je = sn(xt, ce);
    if (!je.present) {
      if ((ze(xt, ce, "file_or_empty_folder", je.probe), $s)) Ne.push(xt);
    }
    wn(j);
  }
  let Kn = new Set([...In].map((j) => Mn(resolve_2(j))));
  for (let j of new Set([we, ut])) {
    let ce = findGitRoot(j);
    if (ce !== null && !Kn.has(ce)) sn(join_9(ce, ".git"), j !== we);
  }
  let Cr = new Map(),
    Rs = (j, ce = !0, Ee = detectWorktreeGitCommonDir(j)) => {
      if (Ee && Ee !== ut && !Se.includes(Ee)) {
        if (ce) (Se.push(Ee), me.push(Ee), Cr.set(j, Ee));
        else logEvent("tengu_sandbox_remote_cwd_grant_withheld", {});
        ho(Ee, !ce);
      }
    };
  if ((Rs(we, !0, na), ut !== we)) Rs(ut, Ae);
  let Ma;
  if (getPlatform() === "macos") {
    if (((Ma = isNestedGitConfigLockDenyEnabled()), Ma && !/[*?]/.test(cwd))) {
      let j = join_9(O4(cwd), "**", ".[gG][iI][tT]");
      for (let ce of ["[fF][iI]", "\uFB01", "[fF]\u0131"])
        for (let Ee of ["[kK]", "\u212A"]) Ne.push(join_9(j, `[cC][oO][nN]${ce}[gG].[lL][oO][cC]${Ee}`));
    }
  }
  Se.push(...pr);
  for (let j of pr) wn(j);
  for (let j of pr)
    try {
      let ce = resolve_2(j, ".mcp.json");
      if (getPlatform() === "macos") {
        Ce(ce, !1);
        try {
          let tt = realpathSync(j);
          if (tt !== j) Ce(resolve_2(tt, ".mcp.json"), !1);
        } catch {}
        continue;
      }
      if (realpathSync(j) !== j) continue;
      let Ee = Ne.length;
      Ce(ce, !1);
      let found = Ne.slice(0, Ee).find((tt) => posixCovers(tt, j));
      if (found !== void 0 && Ne.slice(Ee).every((tt) => posixCovers(found, tt)))
        Ne.splice(Ne.indexOf(found), 0, ...Ne.splice(Ee));
    } catch {
      continue;
    }
  let $a = [];
  for (let j of adapterState.runtimeAllowWriteDirectories.values()) {
    let ce = stripTrailingSlash(j),
      Ee = isDirectoryNoFollow(ce);
    if (Ee) ($a.push(ce), Se.push(ce), me.push(ce));
    (Ne.push(resolveDenySymlink(resolve_2(ce, ".claude", "settings.json"))),
      Ne.push(resolveDenySymlink(resolve_2(ce, ".claude", "settings.local.json"))));
    for (let tt of ["skills", "agents", "commands", "hooks"]) Ce(resolve_2(ce, ".claude", tt), !0, !0);
    La(ce);
    let We = resolve_2(ce, ".git");
    if (!Ee) {
      Ne.push(We);
      continue;
    }
    try {
      let tt = lstatSync(We);
      if (tt.isFile()) Ne.push(We);
      else if (tt.isDirectory()) ho(We, !1);
      else
        try {
          if (statSync(We).isDirectory()) ho(We, !1);
        } catch (error) {
          let xt = getErrnoCode(error);
          if (xt !== "ENOENT" && xt !== "ENOTDIR" && rn) Ne.push(We);
        }
    } catch (error) {
      let bt = getErrnoCode(error);
      if (bt !== "ENOENT" && bt !== "ENOTDIR") Ne.push(We);
    }
    (wn(ce), Rs(ce));
  }
  let qd = new Set(),
    jd = new Set(),
    Vc = !1,
    sh = !1,
    Yd = [],
    ih = [],
    ra = [],
    Wc = 0,
    Gc = 0,
    Hc = 0,
    oh = [],
    Va = new Set(getAdditionalDirectoriesForClaudeMd().flatMap(vn)),
    Zd = new Set(isNotBackgroundSession() ? Va : []),
    Yl = new Set(Va),
    hb = repoResidentSettingSources(),
    ah = [],
    lh = [];
  for (let j of SETTING_SOURCES) {
    let ce = isTrustedTierSource(j);
    if (!isSettingSourceEnabled(j) || (!ce && O)) continue;
    let Ee = ce ? ah : lh,
      We = getSettingsForSource(j);
    for (let tt of evalConfinedEnv ? [] : (We?.permissions?.additionalDirectories ?? []))
      try {
        Ee.push(expandPath(tt, cwd));
      } catch {}
    for (let tt of [
      ...(y(j) && !managedReadPathsOnly ? (We?.sandbox?.filesystem?.allowRead ?? []) : []),
      ...(y(j) ? (We?.sandbox?.filesystem?.allowWrite ?? []) : []),
      ...(j === "policySettings" && managedReadPathsOnly && !evalConfinedEnv
        ? managedSources.flatMap((bt) => bt.sandbox?.filesystem?.allowRead ?? [])
        : []),
    ])
      try {
        Ee.push(resolveSandboxFilesystemPath(tt, j));
      } catch {}
    for (let tt of evalConfinedEnv
      ? []
      : (groupRuleContentsByTool(We?.permissions?.allow, [FILE_EDIT_TOOL_NAME]).get(FILE_EDIT_TOOL_NAME) ??
        []))
      try {
        Ee.push(resolvePathPatternForSandbox(tt, j));
      } catch {}
  }
  let mb = !1,
    gb = new Set(),
    yb = new Set(),
    zd = {
      sharesReach: getPlatform() === "windows",
      prepared: "no",
      automounter: "none",
      automountPoints: [],
      ownPlaces: [getCwdState(), getOriginalCwd(), homedir_3(), ...Va],
      grantedPlaces: ah,
      repositoryGrantedPlaces: lh,
      placesOfVouched: [],
      grantsOfVouched: [],
      trustsWriter: !1,
      linkTexts: new Map(),
      fixedFolders: new Map(),
      dropped: new Set(),
      saidBefore: new Set(adapterState.deniesDroppedForAnotherHost),
    };
  for (let j of SETTING_SOURCES) {
    if (!isSettingSourceEnabled(j)) {
      let Bt = getSettingsForSourceTightenOnly(j);
      if (Bt?.permissions || Bt?.sandbox?.filesystem)
        logForDebugging(
          `Sandbox: ignoring permission rules and sandbox.filesystem entries from disabled setting source ${j}`,
          { level: "info" },
        );
      continue;
    }
    let ce = getSettingsForSource(j),
      Ee = isRepoSettingSource(j),
      included = hb.includes(j),
      tt = Ee || (j === "policySettings" && !isPolicySlotAdminOrParentComposed()),
      bt = adminMandate && tt,
      xt = included || bt;
    if (ce?.permissions) {
      if (ce.permissions.blockReadsOutsideWorkingDirectories === !0) ((Vc = !0), (sh ||= !included));
      if (!included && !evalConfinedEnv)
        for (let Bt of ce.permissions.additionalDirectories || [])
          for (let qr of vn(Bt)) {
            if ((Va.add(qr), !tt)) Yl.add(qr);
            if (isUserTierSource(j)) Zd.add(qr);
          }
    }
    let je = ce?.sandbox?.filesystem,
      kt = evalConfinedEnv
        ? []
        : (groupRuleContentsByTool(ce?.permissions?.allow, [FILE_EDIT_TOOL_NAME]).get(FILE_EDIT_TOOL_NAME) ??
          []),
      Xt = y(j) ? je?.allowWrite : void 0,
      Dt = managedReadPathsOnly || !y(j) ? [] : (je?.allowRead ?? []);
    if (bt) Wc += kt.length + (je?.allowWrite?.length ?? 0);
    else
      for (let Bt of [
        ...resolvePathEntries(kt, j, "widening", resolvePathPatternForSandbox),
        ...resolveSandboxPathPatterns(Xt, j, "widening"),
      ]) {
        if (tt && pathsCoverPath(q(), Bt)) {
          Hc++;
          continue;
        }
        if (((xt ? ih : Se).push(Bt), tt && !xt)) ra.push({ literal: Bt, list: "allowWrite" });
        if ((oh.push(Bt), isUserTierSource(j))) Zd.add(Bt);
      }
    for (let Bt of resolveSandboxPathPatterns(Dt, j, "widening")) {
      if (tt && pathsCoverPath(q(), Bt)) {
        Gc++;
        continue;
      }
      if (((xt ? Yd : he).push(Bt), tt && !xt)) ra.push({ literal: Bt, list: "allowRead" });
    }
    let Ct = groupRuleContentsByTool(ce?.permissions?.deny, [FILE_EDIT_TOOL_NAME, FILE_READ_TOOL_NAME]),
      Qe = [
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
          rawSpellings: je?.denyWrite ?? [],
          resolveOne: resolveSandboxFilesystemPath,
          access: "write",
          what: "write deny",
        },
        {
          rawSpellings: je?.denyRead ?? [],
          resolveOne: resolveSandboxFilesystemPath,
          access: "read",
          what: "read deny",
        },
      ];
    for (let { rawSpellings: rawSpellings, resolveOne: resolveOne, access: access, what: what } of Qe)
      for (let nr of rawSpellings) {
        let rr = resolvePathEntry(nr, j, "deny", resolveOne);
        if (rr === void 0) continue;
        if (
          shouldDropRemoteHostEntry(
            what,
            rr,
            j,
            zd,
            (mb && !gb.has(`${what} ${nr}`)) || yb.has(`${what} ${nr}`),
          )
        )
          continue;
        let Hr = tw(nr, rr);
        switch ((jd.add(Hr), access)) {
          case "write":
            Ne.push(Hr);
            break;
          case "read":
            if ((Ie.push(Hr), !Ee)) qd.add(Hr);
            break;
        }
      }
  }
  if ((Wc > 0 || Gc > 0 || Hc > 0) && !adapterState.droppedRepoFilesystemGrantsLogged) {
    adapterState.droppedRepoFilesystemGrantsLogged = !0;
    let j = adminMandate
        ? "admin sandbox mandate"
        : O
          ? "managed or --settings read deny"
          : "Claude Code's own read-deny paths",
      ce = [];
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
    for (let j of managedSources)
      he.push(...resolveSandboxPathPatterns(j.sandbox?.filesystem?.allowRead, "policySettings", "widening"));
  let flattened = SETTING_SOURCES.flatMap((j) => {
      let ce = isRepoSettingSource(j);
      if (ce && !isSettingSourceEnabled(j)) return [];
      return (getSettingsForSourceTightenOnly(j)?.sandbox?.credentials?.files ?? []).flatMap((Ee) => {
        if (Ee.mode === "mask" && ce) return [];
        let We = resolvePathEntry(Ee.path, j, "deny", resolveSandboxFilesystemPath);
        if (
          We === void 0 ||
          ((Ee.mode !== "mask" || !isTrustedTierSource(j)) &&
            shouldDropRemoteHostEntry("credential file", We, j, zd, !1))
        )
          return [];
        let tt = tw(Ee.path, We);
        return [{ source: j, file: Ee, resolvedCredentialPath: We, denySpelling: tt }];
      });
    }),
    Kc = [...zd.dropped];
  if (!En(adapterState.deniesDroppedForAnotherHost, Kc)) {
    if (((adapterState.deniesDroppedForAnotherHost = Kc), Kc.length > 0))
      logFeatureSad("sandbox_exec", "denies_on_another_host_dropped", { dropped: Kc.length });
    try {
      _v.emit();
    } catch (error) {
      reportSandboxErrorUnderStandIn(error, "deniesOnAnotherHostNotDescribed");
    }
  }
  let Xd = [],
    uh = getReadDenySkipReason();
  if (Vc && uh === null) {
    let j = [we, ...(adminMandate ? Yl : Va)],
      ce = new Set($a);
    for (let Qe of [we, ...$a]) {
      let Bt = Cr.get(Qe);
      if (Bt !== void 0) ce.add(Bt);
    }
    let filtered = [...j, ...ce].filter(Ad);
    if (filtered.length > 0)
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: paths with glob characters are not re-opened: ${filtered.join(", ")}`,
      );
    let filtered_2 = j.filter((Qe) => !Ad(Qe)),
      mapped = Ie.map((Qe) => {
        try {
          return expandPath(Qe, cwd);
        } catch {
          return Qe;
        }
      }),
      bt = new Map(),
      xt = (Qe, Bt = getPlatform() !== "linux", qr = mapped) =>
        qr.some((Es) => {
          let Gr = uy(Es);
          if (!Ad(Gr)) return isPathPrefixOf(Gr, Qe, Bt) || isPathWithin(Gr, Qe, { foldCase: Bt });
          let nr = getPlatform() === "windows" ? denyEntryCovers : denyEntryCoversPath,
            rr = [[Es, Qe, Bt]];
          if (Bt) rr.push([foldPathCase(Es), foldPathCase(Qe), !1]);
          return rr.some(([Hr, xs, qa]) => {
            try {
              gw.default(Hr, { dot: !0, nocase: qa });
            } catch {
              return !0;
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
      let Bt = resolveSandboxFilesystemPath(Qe, "userSettings");
      if (filtered_2.some((Es) => isPathWithin(Es, Bt))) continue;
      let qr = normalizeDirectoryPattern(Bt);
      if ((Ie.push(qr), jd.add(qr), Xd.push(Bt), sh)) qd.add(qr);
    }
    let je = getClaudeConfigDir(),
      kt =
        env.XDG_CONFIG_HOME && isAbsolute_2(env.XDG_CONFIG_HOME)
          ? env.XDG_CONFIG_HOME
          : resolve_2(homedir_3(), ".config"),
      Xt = [...mapped, ...flattened.map((Qe) => Qe.denySpelling)],
      Dt,
      Ct = collectGitConfigDenyPaths(
        kt,
        Xd,
        () =>
          (Dt ??= $d(splitBindableWriteRoots([...BP(), ...Se], new Set([getOriginalCwd(), getCwdState()])))),
        (Qe) => xt(Qe, !0, Xt),
      );
    for (let Qe of [
      ...filtered_2,
      ...[...ce].filter((Bt) => !Ad(Bt)),
      ...Ct,
      getClaudeTempDirRealpath(),
      ue,
      resolve_2(je, "shell-snapshots"),
      resolve_2(je, "session-env"),
      resolve_2(je, "skills"),
      resolve_2(je, "plugins"),
      resolve_2(je, "rules"),
      resolve_2(je, "agents"),
      resolve_2(je, "commands"),
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
      `Sandbox: blockReadsOutsideWorkingDirectories not applied to the sandbox: ${uh}${getPlatform() === "windows" ? " (grants from repository settings are still ignored)" : ""}`,
    );
  let Jd = Xd.length > 0 || (Vc && getPlatform() === "windows");
  for (let j of Yd) {
    if (Jd) {
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: repo-committed allowRead ${j} does not count`,
      );
      continue;
    }
    (he.push(j), ra.push({ literal: j, list: "allowRead" }));
  }
  for (let j of ih) {
    if (Jd) {
      logForDebugging(
        `Sandbox: blockReadsOutsideWorkingDirectories: repo-committed allowWrite ${j} does not count`,
      );
      continue;
    }
    (Se.push(j), ra.push({ literal: j, list: "allowWrite" }));
  }
  for (let j of oh) for (let ce of vn(j)) wn(ce);
  let bb = adminMandate ? Yl : Va;
  for (let j of pr)
    if (((Jd || adminMandate) && !bb.has(j)) || (!Yl.has(j) && pathsCoverPath(q(), j))) {
      let index = Se.indexOf(j);
      if (index !== -1) Se.splice(index, 1);
    } else if (!Yl.has(j)) ra.push({ literal: j, list: "allowWrite" });
  let Qd = [],
    Wa = [],
    Sb,
    ef = () => (Sb ??= uniq([...q(), ...Ie.flatMap((j) => canonicalizeSandboxPath(j) ?? [])])),
    tf = { allowRead: he, allowWrite: Se },
    sa = ({ list: list, literal: literal }, Ee, We = !1) => {
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
      if (Ad(ce))
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
  let Eb = $d(splitBindableWriteRoots([...BP(), ...Se], new Set([we, ut]))),
    dh = new Map(),
    nf = getPlatform() === "windows",
    ji = nf ? getGitHomeInfo(homedir_3(), userSettingsHomes()) : void 0,
    xb,
    _b = () => (xb ??= ji !== void 0 && readFlagWithOverride(TENGU_CURRIED_WILLOW, { safe: !0 }));
  for (let j of ["allowRead", "allowWrite"])
    e: for (let ce of uniq(tf[j])) {
      let Ee = ji === void 0 ? ce : eV(ce);
      if (ji !== void 0 && uT(Ee.replace(/^[\\/]{3,}/, "\\\\"))) {
        sa(
          { list: j, literal: ce },
          "a device path cannot be compared with the home folder (spell it without the \\\\.\\ prefix)",
          !0,
        );
        continue;
      }
      let We = canonicalizeSandboxPath(Ee),
        tt = We !== void 0 && (ji === void 0 ? Ad(We) : Jxe(We) || (Jxe(Ee) && Ad(We)));
      if (ji !== void 0 && We !== void 0 && tt && !iw(We)) {
        let je = getGlobBaseDirectory_2(We),
          kt = sw(je, dh),
          Xt =
            kt === null
              ? "has a link chain that cannot be followed safely"
              : isUnderGitHome(kt.path, ji)
                ? "is or contains the home folder, or is a Claude Code config folder, which the Windows sandbox is not given (name the folders instead)"
                : isGrantCoveredByPattern(ef(), { path: je, patternBeneath: !1 }, kt.path)
                  ? "resolves into a denied read path outside its own spelling"
                  : void 0;
        if (Xt !== void 0) {
          if (kt === null && j === "allowWrite") Wa.push(ce);
          sa({ list: j, literal: ce }, `the folder that it is confined to (${je}) ${Xt}`, !0);
          continue;
        }
      }
      if (We === void 0 || iw(We)) continue;
      let bt = tt
          ? [
              { path: getGlobBaseDirectory_2(We), patternBeneath: !0, nameReading: !1 },
              ...nameReadingsOfGlobSpelling(
                nf ? resolveAgainstProcessCwd(Ee).replaceAll("\\", "/") : resolveAgainstProcessCwd(Ee),
              )
                .filter(({ name: je }) => !/[*?]/.test(je))
                .map(({ name: je, pattern: pattern }) => ({
                  path: nf ? je.replaceAll("/", "\\") : je,
                  patternBeneath: pattern !== null,
                  nameReading: !0,
                })),
            ]
          : [{ path: We, patternBeneath: !1, nameReading: !1 }],
        xt = [];
      for (let je of bt) {
        let kt = sw(je.path, dh);
        if (kt === null) {
          if (tt && j === "allowWrite") Wa.push(ce);
          sa(
            { list: j, literal: ce },
            "its link chain cannot be followed safely (a loop, an unreadable hop); a later config build re-admits it once it resolves",
            !0,
          );
          continue e;
        }
        if (ji !== void 0 && (!tt || (je.nameReading && _b())) && isUnderGitHome(Q$(je, kt.path), ji)) {
          sa(
            { list: j, literal: ce },
            je.nameReading
              ? `the sandbox may also read ${je.path} as a folder name, and that folder is or leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given (if it is a link, remove it; or name the real folders instead)`
              : "it is or contains the home folder, or is a Claude Code config folder, which the Windows sandbox is not given",
            !0,
          );
          continue e;
        }
        let Xt = collectSymlinkHopDirectories(je.path, kt.exists ? kt.path : null, !0);
        if (!eb(Xt, Eb)) continue;
        if (isGrantCoveredByPattern(ef(), je, kt.path)) {
          sa(
            { list: j, literal: ce },
            je.patternBeneath
              ? "a directory in its spelling resolves outside that spelling, through a link a sandboxed command could have placed, to one that holds or lies inside a denied read path (spell the directory by its real path)"
              : "it resolves into a denied read path outside its own spelling through a link a sandboxed command could have placed (grant the denied path itself to carve it out)",
            !0,
          );
          continue e;
        }
        xt.push(je);
      }
      if (xt.length > 0) Qd.push({ literal: ce, list: j, roots: xt });
    }
  let is = new Map(),
    Zl = getEffectiveFilesystemPolicy() === "relaxed",
    Ga =
      (getPlatform() === "linux" || getPlatform() === "wsl" || (getPlatform() === "macos" && Zl)) &&
      SETTING_SOURCES.some(
        (j) =>
          j !== "projectSettings" &&
          j !== "localSettings" &&
          (isSettingSourceEnabled(j) || Zl) &&
          (getSettingsForSourceTightenOnly(j)?.sandbox?.credentials?.files ?? []).some(
            (ce) => ce.mode === "mask",
          ),
      ),
    fh = [],
    ph = Ga ? createWalkMemo() : void 0,
    rf = (j, ce) => {
      if (!ce) return canonicalizePathForMaskSweep(j, void 0, ph);
      let Ee = resolveMaskPath(j, ph);
      if (Ee.lookAgain !== void 0) fh.push(Ee);
      return Ee.spellings[1];
    },
    Ai = Ga && Zl,
    Yi = getPlatform() === "windows" ? /(?<=.)[/\\]+$/ : /(?<=.)\/+$/,
    hh = expandMaskGlob,
    vb = Ga
      ? he.flatMap((j) => {
          let replaced = uy(j).replace(Yi, "");
          return Ad(replaced)
            ? [canonicalizePathForMaskSweep(replaced), ...hh(replaced).map((Ee) => Ee.canonical)]
            : [canonicalizePathForMaskSweep(replaced)];
        })
      : [],
    zl = posixCovers,
    oa = new Map(),
    wb = (j, ce) => {
      let Ee = foldPathCase(j),
        We = foldPathCase(ce),
        tt = "allBeneathItsDirectory";
      return (
        matchesGuardedGlob(j, ce, oa, !0) ||
        matchesGuardedGlob(Ee, We, oa) ||
        matchesDenyGlobAtRuntime(j, ce, "exactly", "allBeneathItsDirectory", oa) ||
        matchesDenyGlobAtRuntime(Ee, We, "exactly", "allBeneathItsDirectory", oa) ||
        (Ad(j) &&
          (nameReadingsOfGlobSpelling(ce).some(({ name: bt }) => posixCovers(bt, j)) ||
            nameReadingsOfGlobSpelling(We).some(({ name: bt }) => posixCovers(bt, Ee))))
      );
    },
    Tb = (j, ce, Ee) => {
      let We = Ee;
      for (;;) {
        if (wb(We, j) && denyEntryCoversFolded(ce, We, oa)) return !0;
        let tt = dirname_7(We);
        if (tt === We) return !1;
        if (((We = tt), !Ad(ce) && !isPathPrefixOf(ce, We))) return !1;
      }
    },
    mo = (j, ce) =>
      vb.some((Ee) => (Ad(Ee) ? Tb(Ee, j, ce) : denyEntryCoversFolded(j, Ee, oa) && isPathPrefixOf(Ee, ce))),
    qc = (j, ce) => denyEntryCoversPath(j, ce, oa),
    aa = new Set(),
    jc = new Set(),
    Yc = new Map(),
    Js = (j, ce, Ee) => {
      let We = Yc.get(j);
      if (We) (We.lexicals.push(ce), (We.trusted ||= Ee));
      else Yc.set(j, { lexicals: [ce], trusted: Ee });
    },
    sf = (j) => Yc.get(j)?.trusted === !0,
    Ha = (j, ce) => {
      let Ee = Yc.get(j);
      return (
        Ee === void 0 ||
        Ee.lexicals.some((lexical) => lexical === j || (zl(lexical, ce) && isOsLinkedRootAlias(lexical, j)))
      );
    },
    mi = new Map(),
    mh = !1,
    of,
    Xl = new Map(),
    gh = 0,
    yh = 0,
    la = V3e,
    yo = (j) => [
      j.accessKeyIdVar,
      j.secretAccessKeyVar,
      ...(j.sessionTokenVar !== void 0 ? [j.sessionTokenVar] : []),
    ],
    Ab = (j) => wio(j.accessKeyIdVar) || wio(j.secretAccessKeyVar),
    af = (j, ce, Ee) => {
      let We = new Set([...Xl.values()].flatMap((tt) => yo(tt.pair)));
      for (let tt of j) {
        if (!la.includes(tt) || We.has(tt)) continue;
        ((yh += 1),
          logForDebugging(Ee(tt), { level: "warn" }),
          Xl.set(tt, {
            pair: { accessKeyIdVar: tt, secretAccessKeyVar: `${Wfs}${yh}_` },
            rank: ce,
            seq: gh++,
            label: tt,
            sessionLabel: void 0,
            synthetic: !0,
          }),
          We.add(tt));
      }
    },
    lf;
  for (let j of SETTING_SOURCES) {
    let ce = getSettingsForSourceTightenOnly(j)?.sandbox?.credentials;
    if (!ce) continue;
    let Ee = isRepoSettingSource(j);
    if (Ee && !isSettingSourceEnabled(j)) {
      logForDebugging(`Sandbox: ignoring sandbox.credentials entries from disabled setting source ${j}`, {
        level: "info",
      });
      continue;
    }
    mh = !0;
    let We = j === "userSettings" && !isSettingSourceEnabled("userSettings"),
      tt = evalConfinedEnv && j !== "userSettings",
      bt = We || tt,
      xt = tt ? `eval-confined foreign tier ${j}` : "disabled userSettings";
    for (let {
      file: file,
      resolvedCredentialPath: resolvedCredentialPath,
      denySpelling: denySpelling,
    } of flattened.filter((Dt) => Dt.source === j)) {
      let Dt = file.mode === "deny" ? denySpelling : resolvedCredentialPath,
        replaced = uy(denySpelling).replace(Yi, ""),
        Qe = Ga ? rf(replaced, !Ee) : replaced;
      if (file.mode === "deny") Js(Qe, replaced, !Ee);
      let Bt = is.get(Qe);
      if (Bt?.mode === "deny") {
        let Gr = aa.has(Qe),
          nr = (rr) => rr === Qe || isOsLinkedRootAlias(rr, Qe);
        if (file.mode === "deny" && Gr && !nr(replaced)) {
          (logForDebugging(
            `[sandbox] credential file deny for '${Dt}' supersedes the disabled-userSettings synthetic deny but is symlink-spelled \u2014 installed as a canonical deny on '${Qe}' so enforcement cannot be retargeted`,
          ),
            is.set(Qe, { path: Qe, mode: "deny" }),
            Js(Qe, Qe, !Ee),
            aa.delete(Qe));
          continue;
        }
        if (file.mode === "deny" && !Gr) {
          let rr = nr(uy(Bt.path).replace(Yi, ""));
          if (!nr(replaced) || rr) {
            if (!Ee && !nr(replaced) && !rr)
              (logForDebugging(
                `[sandbox] credential file deny for '${Dt}' collides with the deny spelled '${Bt.path}' only through symlink resolution \u2014 installed as a canonical deny on '${Qe}' so the trusted tier's intent cannot be retargeted`,
              ),
                is.set(Qe, { path: Qe, mode: "deny" }),
                Js(Qe, Qe, !0));
            continue;
          }
          logForDebugging(
            `[sandbox] credential file deny for '${Dt}' replaces the deny spelled '${Bt.path}': the incumbent reaches this file only through symlink resolution, the replacement is the canonical spelling`,
          );
        } else if (file.mode === "mask" && !Gr) {
          let rr = Ai || mo(Qe, Qe),
            Hr = !rr && !Ha(Qe, replaced);
          if (!rr && !Hr) {
            logForDebugging(
              `[sandbox] credential file mask for '${Dt}' dropped: '${Bt.path}' denies the same file`,
            );
            continue;
          }
          if (Hr) {
            if (sf(Qe)) {
              (logForDebugging(
                `[sandbox] credential file mask for '${Dt}' dropped: a trusted-tier deny ('${Bt.path}') names the same file through a symlink \u2014 installed as a canonical deny on '${Qe}' so enforcement cannot be retargeted`,
              ),
                is.set(Qe, { path: Qe, mode: "deny" }),
                Js(Qe, Qe, !0));
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
          (logForDebugging(
            `[sandbox] credential file mask for '${Dt}' from ${xt} degrades to deny (that source cannot grant proxy injection; its restrictive half still applies)`,
          ),
            is.set(Qe, { path: denySpelling, mode: "deny" }),
            Js(Qe, replaced, !Ee),
            aa.add(Qe));
          continue;
        }
      if (file.mode === "mask" && !Ai && (getPlatform() === "windows" || getPlatform() === "macos")) {
        (logForDebugging(
          `[sandbox] credential file mask for '${Dt}' degrades to deny on ${getPlatform()} (file masking is not enforced by this platform's sandbox backend yet)`,
        ),
          is.set(Qe, { path: denySpelling, mode: "deny" }),
          Js(Qe, replaced, !Ee),
          aa.delete(Qe));
        continue;
      }
      if (file.mode === "mask") {
        if (Ad(Dt)) {
          if (Bt?.mode === "mask" && (Ai || mo(Qe, Qe))) {
            logForDebugging(
              `[sandbox] glob-spelled credential file mask '${Dt}' dropped: '${Bt.path}' already masks this path and the degrade's deny would be runtime-inert here`,
            );
            continue;
          }
          (logForDebugging(
            `[sandbox] credential file mask for '${Dt}' contains glob characters \u2014 degrading to deny (masking applies to a single file; use mode "deny" for glob patterns)`,
          ),
            is.set(Qe, { path: denySpelling, mode: "deny" }),
            Js(Qe, replaced, !Ee),
            aa.delete(Qe));
          continue;
        }
        let Gr = isOnForeignMount(Qe, getCwdState()) || rawPointerPathIsUnsafe(Qe, getCwdState()),
          nr;
        if (Gr)
          nr =
            "is flagged by host-side path vetting (cross-host pointer or non-regular path component) \u2014 the unsandboxed probe will not touch it and SRT cannot mask it";
        else {
          let rr;
          try {
            try {
              rr = openSync(Qe, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
            } catch (error) {
              let xs = getErrnoCode(error);
              if (xs === "ELOOP")
                nr =
                  "became a symlink after canonicalization \u2014 the object was swapped mid-conversion, so the probe fails closed";
              else if (xs !== "ENOENT" && xs !== "EACCES" && xs !== "EPERM" && xs !== "ENOTDIR")
                nr = `could not be probed (${xs ?? "unknown error"}) \u2014 an unprobed mask may be silently skipped at wrap time, so the probe fails closed`;
            }
            if (rr !== void 0) {
              let Hr = fstatSync(rr);
              if (Hr.isDirectory())
                nr =
                  'resolves to a directory \u2014 whole-file masking has no meaning for a directory; use mode "deny" for directories';
              else if (!Hr.isFile())
                nr =
                  "resolves to a non-regular file (FIFO/device/socket) \u2014 only regular files can be masked; SRT would hang on or silently skip it at wrap time";
              else if (Hr.size > L4)
                nr = `is larger than ${L4} bytes \u2014 a file this size cannot be masked; SRT would skip it fail-open at wrap time`;
              else {
                let size = Hr.size,
                  allocUnsafe = Buffer.allocUnsafe(size + 1),
                  ca = 0,
                  ec;
                try {
                  for (;;) {
                    let Xc = readSync(rr, allocUnsafe, ca, size + 1 - ca, null);
                    if (Xc <= 0) break;
                    if (((ca += Xc), ca > size)) break;
                  }
                  ec = allocUnsafe.subarray(0, ca);
                } catch (error) {
                  nr = `failed mid-read (${getErrnoCode(error) ?? "unknown error"}) \u2014 the UTF-8 probe could not complete, so the probe fails closed`;
                }
                if (ec !== void 0 && ca > size)
                  ((nr =
                    "changed size between fstat and read \u2014 the object is being mutated mid-conversion, so the probe fails closed"),
                    (ec = void 0));
                if (ec !== void 0)
                  try {
                    new TextDecoder("utf-8", { fatal: !0 }).decode(ec);
                  } catch {
                    nr =
                      'has non-UTF-8 content \u2014 binary credential files cannot be masked; use mode "deny"';
                  }
              }
            }
          } finally {
            if (rr !== void 0) closeSync(rr);
          }
        }
        if (nr !== void 0) {
          (logForDebugging(`[sandbox] credential file mask for '${Dt}' ${nr} \u2014 degrading to deny`),
            is.set(Qe, { path: denySpelling, mode: "deny" }),
            Js(Qe, replaced, !Ee),
            aa.delete(Qe));
          continue;
        }
      }
      if (file.mode === "deny" && Bt?.mode === "mask") {
        if (Ai || mo(Qe, Qe)) {
          if (
            (logForDebugging(
              `[sandbox] credential file deny for '${Dt}' not installed over the existing mask: the deny is runtime-inert here (relaxed filesystem policy or an exact allowRead re-opens the path), so the mask's sentinel bind is the effective protection`,
            ),
            !Ai)
          )
            (jc.add(Qe), is.set(Qe, { path: Bt.path, mode: "mask", injectHosts: [] }));
          continue;
        }
        let replaced = uy(Bt.path).replace(Yi, "");
        if (!Ha(Qe, replaced)) {
          if (!Ee) {
            (logForDebugging(
              `[sandbox] credential file mask for '${Bt.path}' dropped: trusted-tier deny '${Dt}' names the same file through a symlink \u2014 installed as a canonical deny on '${Qe}' so enforcement cannot be retargeted`,
            ),
              is.set(Qe, { path: Qe, mode: "deny" }),
              Js(Qe, Qe, !0));
            continue;
          }
          (logForDebugging(
            `[sandbox] credential file deny for '${Dt}' collides with mask '${Bt.path}' only after symlink resolution \u2014 a wrap-time re-resolve of the deny's spelling can diverge, so the mask is kept (whole-file sentinel bind on the real file) WITHOUT injection or extract`,
          ),
            jc.add(Qe),
            is.set(Qe, { path: Bt.path, mode: "mask", injectHosts: [] }));
          continue;
        }
        logForDebugging(
          `[sandbox] credential file mask for '${Bt.path}' dropped: '${Dt}' denies the same file`,
        );
      }
      let qr = Ai || mo(Qe, Qe),
        Es =
          file.mode === "deny"
            ? { path: Dt, mode: "deny" }
            : qr && file.onExtractNoMatch === "deny"
              ? { ...file, path: Dt, onExtractNoMatch: "error" }
              : { ...file, path: Dt };
      if (file.mode === "mask" && jc.has(Qe))
        ((Es = { path: Dt, mode: "mask", injectHosts: [] }),
          logForDebugging(
            `[sandbox] credential file mask for '${Dt}' kept over an allowRead-re-opened trusted deny WITHOUT injection or extract (whole-file sentinel): the sentinel protects the bytes, but the displaced deny's intent bars proxy substitution and fail-open extract semantics`,
          ));
      else if (file.mode === "mask" && bt)
        ((Es = { path: Dt, mode: "mask", injectHosts: [] }),
          logForDebugging(
            `[sandbox] credential file mask for '${Dt}' from ${xt} forwards sentinel-only (whole-file sentinel: injectHosts forced empty, extract options dropped): a degraded deny would be dropped at wrap time under the relaxed filesystem policy, while the sentinel bind keeps the bytes protected \u2014 injection stays withheld (that source cannot grant it) and the source's fail-open extract semantics do not apply`,
          ));
      if (file.mode === "mask" && Es.onExtractNoMatch === "error" && file.onExtractNoMatch === "deny")
        logForDebugging(
          `[sandbox] credential file mask for '${Dt}': onExtractNoMatch 'deny' rewritten to 'error' \u2014 the runtime's no-match read-deny would be inert here (relaxed filesystem policy or an exact allowRead re-opens the path), so 'deny' would fail open`,
        );
      if (file.mode === "mask") {
        let found = [getCwdState(), ...Se].find((nr) => {
          let replaced_2 = uy(resolve_2(getCwdState(), nr)).replace(Yi, "");
          if (Ad(replaced_2)) return !1;
          let Hr = canonicalizePathForMaskSweep(replaced_2);
          return zl(replaced_2, Qe) || zl(replaced_2, replaced) || zl(Hr, Qe) || zl(Hr, replaced);
        });
        if (found !== void 0)
          logForDebugging(
            `[sandbox] credential file mask for '${Dt}' resolves inside the sandbox write grant ('${found}') \u2014 a sandboxed command can replace the object between wraps and steer what the host reads (and injects) as the credential; prefer masking files outside writable roots`,
            { level: "warn" },
          );
      }
      (is.set(Qe, Es), aa.delete(Qe));
    }
    for (let je of ce.envVars ?? []) {
      if (je.mode === "mask" && (Ee || We)) continue;
      if (je.mode === "mask" && tt) {
        mi.set(je.name, { name: je.name, mode: "deny" });
        continue;
      }
      if (je.mode === "mask" && wio(je.name)) {
        (logForDebugging(
          `[sandbox] credentials.envVars entry '${je.name}': its name uses a reserved CC-synthesized placeholder prefix, which must never be a masked env var \u2014 degrading the mask to a deny (the variable is unset in the sandbox instead of sentinel-masked)`,
          { level: "warn" },
        ),
          mi.set(je.name, { name: je.name, mode: "deny" }));
        continue;
      }
      if (mi.get(je.name)?.mode === "deny") continue;
      mi.set(je.name, je.mode === "deny" ? { name: je.name, mode: "deny" } : je);
    }
    if (!Ee && !bt && ce.allowPlaintextInject !== void 0) of = ce.allowPlaintextInject;
    if (!Ee && !bt) {
      for (let je of ce.awsPairs ?? []) {
        let kt = Xl.get(je.accessKeyIdVar),
          Xt = Ab(je),
          index = SETTING_SOURCES.indexOf(j);
        if (kt !== void 0) {
          if (Xt && !kt.synthetic && index <= kt.rank) {
            (logForDebugging(
              `[sandbox] credentials.awsPairs: ignoring same-or-lower-precedence inert suppressor pair for '${je.accessKeyIdVar}' \u2014 a real pair already claims that key id, so its suppression is provided by the incumbent and replacing it would disable re-signing`,
            ),
              af(
                yo(je),
                index,
                (Ct) =>
                  `[sandbox] credentials.awsPairs: the ignored suppressor pair for '${je.accessKeyIdVar}' held a conventional claim on '${Ct}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
              ));
            continue;
          }
          if (!Xt && kt.synthetic && index < kt.rank) {
            (logForDebugging(
              `[sandbox] credentials.awsPairs: ignoring entry for '${je.accessKeyIdVar}' \u2014 a higher-precedence source claims that key id with an inert suppressor, deliberately keeping it non-re-signing`,
              { level: "warn" },
            ),
              af(
                yo(je),
                index,
                (Ct) =>
                  `[sandbox] credentials.awsPairs: the ignored pair for '${je.accessKeyIdVar}' held a conventional claim on '${Ct}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
              ));
            continue;
          }
          logForDebugging(
            `[sandbox] credentials.awsPairs entry for '${je.accessKeyIdVar}' replaces an earlier pair for the same access key id (later-processed entry wins)`,
            { level: "warn" },
          );
        }
        if (
          (Xl.set(je.accessKeyIdVar, {
            pair: je,
            rank: index,
            seq: gh++,
            label: je.accessKeyIdVar,
            sessionLabel: je.sessionTokenVar,
            synthetic: Xt,
          }),
          kt !== void 0)
        )
          af(
            yo(kt.pair),
            kt.rank,
            (Ct) =>
              `[sandbox] credentials.awsPairs: replacing the '${je.accessKeyIdVar}' pair displaced its conventional claim on '${Ct}', which no remaining pair covers \u2014 forwarding an inert suppressor pair so implicit AWS auto-pairing stays suppressed`,
          );
      }
      if (ce.sigv4 !== void 0) lf = ce.sigv4;
    }
  }
  let gi = (j) => {
      let ce = mi.get(j);
      return ce?.mode === "mask" && ce.extract === void 0 && ce.decode === void 0 ? ce : void 0;
    },
    bh = (j, ce, Ee) => {
      let We = mi.get(ce)?.injectHosts;
      for (let tt of Ee) {
        let bt = mi.get(tt)?.injectHosts;
        if (!(bt === void 0 || (We !== void 0 && We.every((je) => Iqt(je, bt)))))
          logForDebugging(
            `[sandbox] ${j}: member '${tt}' has an injectHosts narrower than the access-key-id entry's \u2014 SigV4 re-signing is scoped by '${ce}' alone, so the narrower member scope does not limit where re-signed requests carry the real secret`,
            { level: "warn" },
          );
      }
    },
    Sh = (j, ce = "credentials.awsPairs") => {
      if (mi.get(j)?.injectHosts === void 0)
        logForDebugging(
          `[sandbox] ${ce}: '${j}' has no injectHosts, so SigV4 re-signing with the real secret is in scope at EVERY host in network.allowedDomains \u2014 a list repo-committed settings can extend; set injectHosts on the '${j}' entry to pin the re-signing scope`,
          { level: "warn" },
        );
    },
    flattened_2 = [...Xl.values()].flatMap((j) => {
      let { pair: pair } = j,
        filtered = [pair.accessKeyIdVar, pair.secretAccessKeyVar].filter((We) => gi(We) === void 0);
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
              { level: "warn" },
            );
          return [j];
        }
        return (
          logForDebugging(
            `[sandbox] dropping credentials.awsPairs entry '${pair.accessKeyIdVar}': referenced env var(s) ${filtered.join(", ")} are not forwarded as whole-value mask entries (dropped by trust filtering, deny-overridden, never declared, or using extract/decode)`,
          ),
          []
        );
      }
      return [j];
    });
  {
    let j = (bt) => gi(bt.accessKeyIdVar) !== void 0 && gi(bt.secretAccessKeyVar) !== void 0,
      sorted = flattened_2
        .map((bt) => ({ entry: bt, label: bt.label, functional: j(bt.pair) }))
        .sort(
          (bt, xt) =>
            Number(xt.functional) - Number(bt.functional) ||
            xt.entry.rank - bt.entry.rank ||
            xt.entry.seq - bt.entry.seq,
        ),
      Ee = new Map(),
      We = 0,
      tt = (bt, xt) => {
        ((We += 1), (bt.pair = { ...bt.pair, [xt]: `${Sio}${We}_` }));
      };
    for (let { entry: entry, label: label } of sorted) {
      let pair = entry.pair,
        kt = [
          ["accessKeyIdVar", pair.accessKeyIdVar],
          ["secretAccessKeyVar", pair.secretAccessKeyVar],
          ...(pair.sessionTokenVar !== void 0 ? [["sessionTokenVar", pair.sessionTokenVar]] : []),
        ];
      for (let [Xt, Dt] of kt) {
        let Ct = Ee.get(Dt);
        if (Ct === void 0 || Ct.entry === entry) {
          Ee.set(Dt, { entry: entry, slot: Xt, label: label });
          continue;
        }
        let Qe = j(Ct.entry.pair),
          Bt = j(entry.pair),
          included = la.includes(Dt),
          Es = included && Ct.entry.synthetic && !entry.synthetic && Ct.entry.rank > entry.rank,
          Gr = included && entry.synthetic && !Ct.entry.synthetic && entry.rank > Ct.entry.rank;
        if (Es) {
          (logForDebugging(
            `[sandbox] credentials.awsPairs: '${Dt}' is claimed by the higher-precedence inert '${Ct.label}' suppressor pair; the '${label}' pair's ${Xt} is disabled \u2014 re-signing is unaffected (the pair could not re-sign), and the name stays claimed so implicit auto-pairing stays suppressed`,
          ),
            tt(entry, Xt));
          continue;
        }
        if (Gr) {
          (logForDebugging(
            Qe
              ? `[sandbox] credentials.awsPairs: the higher-precedence inert '${label}' suppressor pair takes '${Dt}' from the '${Ct.label}' pair \u2014 its ${Ct.slot} is disabled; SigV4 re-signing with it is deliberately suppressed by policy`
              : `[sandbox] credentials.awsPairs: the higher-precedence inert '${label}' suppressor pair takes '${Dt}' from the '${Ct.label}' pair; its ${Ct.slot} is disabled \u2014 re-signing is unaffected (the pair could not re-sign), and the name stays claimed so implicit auto-pairing stays suppressed`,
            Qe ? { level: "warn" } : void 0,
          ),
            tt(Ct.entry, Ct.slot),
            Ee.set(Dt, { entry: entry, slot: Xt, label: label }));
          continue;
        }
        if (Bt && !Qe) {
          (logForDebugging(
            Ct.entry.synthetic
              ? `[sandbox] credentials.awsPairs: '${Dt}' also appears in the inert '${Ct.label}' suppressor pair; its ${Ct.slot} is disabled in favor of the '${label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`
              : `[sandbox] credentials.awsPairs: '${Dt}' also appears in the '${Ct.label}' pair, which cannot re-sign (unusable member, or disabled earlier in collision resolution); its ${Ct.slot} is disabled in favor of the '${label}' pair \u2014 re-signing is unaffected, and the name stays claimed so implicit auto-pairing stays suppressed`,
          ),
            tt(Ct.entry, Ct.slot),
            Ee.set(Dt, { entry: entry, slot: Xt, label: label }));
          continue;
        }
        if (Bt && Qe) {
          let nr =
            Xt === "sessionTokenVar"
              ? `the '${label}' pair re-signs without a session token`
              : `the '${label}' pair can no longer re-sign, though its other claimed names still suppress implicit auto-pairing`;
          logForDebugging(
            `[sandbox] credentials.awsPairs: '${Dt}' fills a slot in both the '${label}' and '${Ct.label}' pairs \u2014 each variable can fill exactly one slot, so the '${Ct.label}' pair (higher-precedence source, or later entry within one source) keeps it and the '${label}' pair's ${Xt} is disabled (${nr}); fix the config`,
            { level: "warn" },
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
    for (let bt = flattened_2.length - 1; bt >= 0; bt--) {
      let xt = flattened_2[bt];
      if (xt === void 0 || j(xt.pair)) continue;
      let pair = xt.pair;
      if (yo(pair).some((kt) => la.includes(kt))) {
        if (
          (pair.accessKeyIdVar.startsWith(Sio) || pair.accessKeyIdVar.startsWith($In)) &&
          gi(pair.secretAccessKeyVar) !== void 0 &&
          yo(pair).some((kt) => kt !== pair.secretAccessKeyVar && la.includes(kt))
        )
          (logForDebugging(
            `[sandbox] credentials.awsPairs entry '${xt.label}': key-id slot holds a CC-synthesized placeholder but secret '${pair.secretAccessKeyVar}' is still whole-value masked; disabling the pair's secret slot too so sandbox-runtime skips the half-masked re-signing spec silently \u2014 the secret stays masked via its own env entry and the surviving conventional claim keeps implicit auto-pairing suppressed`,
          ),
            tt(xt, "secretAccessKeyVar"));
        continue;
      }
      (logForDebugging(
        `[sandbox] dropping credentials.awsPairs entry '${xt.label}' after slot-collision resolution: its key id or secret slot was disabled and no conventional AWS claim survives, so it can neither re-sign nor suppress implicit auto-pairing`,
      ),
        flattened_2.splice(bt, 1));
    }
    for (let bt of flattened_2) {
      let pair = bt.pair;
      if (!j(pair)) continue;
      let je = pair.sessionTokenVar !== void 0 && gi(pair.sessionTokenVar) === void 0;
      if (je)
        logForDebugging(
          `[sandbox] credentials.awsPairs entry '${pair.accessKeyIdVar}': session member '${bt.sessionLabel ?? pair.sessionTokenVar}' is not forwarded as a whole-value mask entry (trust-dropped, deny-overridden, never declared, ` +
            "using extract/decode, or disabled by slot-collision resolution) \u2014 " +
            "the pair still re-signs, WITHOUT an x-amz-security-token; temporary-credential requests will fail upstream until the entry is fixed",
          { level: "warn" },
        );
      (bh(`credentials.awsPairs entry '${pair.accessKeyIdVar}'`, pair.accessKeyIdVar, [
        pair.secretAccessKeyVar,
        ...(!je && pair.sessionTokenVar !== void 0 ? [pair.sessionTokenVar] : []),
      ]),
        Sh(pair.accessKeyIdVar));
    }
  }
  let mapped = flattened_2.map((j) => j.pair);
  {
    let j = new Set(mapped.flatMap(yo));
    if (
      !la.some((ce) => j.has(ce)) &&
      gi("AWS_ACCESS_KEY_ID") !== void 0 &&
      gi("AWS_SECRET_ACCESS_KEY") !== void 0
    ) {
      if (
        (bh("implicit AWS credential pair", "AWS_ACCESS_KEY_ID", [
          "AWS_SECRET_ACCESS_KEY",
          ...(gi("AWS_SESSION_TOKEN") !== void 0 ? ["AWS_SESSION_TOKEN"] : []),
        ]),
        Sh("AWS_ACCESS_KEY_ID", "implicit AWS credential pair"),
        mi.has("AWS_SESSION_TOKEN") && gi("AWS_SESSION_TOKEN") === void 0)
      )
        logForDebugging(
          "[sandbox] implicit AWS credential pair: 'AWS_SESSION_TOKEN' is declared but not forwarded as a whole-value mask entry " +
            "(deny-overridden or using extract/decode) \u2014 the auto-paired " +
            "trio still re-signs, WITHOUT an x-amz-security-token; temporary-credential requests will fail upstream until the entry is fixed",
          { level: "warn" },
        );
    } else if (!la.some((ce) => j.has(ce))) {
      let ce = ["AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY"],
        filtered = ce.filter((tt) => gi(tt) !== void 0),
        filtered_2 = ce.filter((tt) => gi(tt) === void 0 && mi.has(tt));
      if (filtered.length === 1 && filtered_2.length === 1)
        logForDebugging(
          `[sandbox] implicit AWS credential pair: '${filtered_2[0]}' is declared but not forwarded as a whole-value mask entry ` +
            "(deny-overridden, trust-dropped, or using extract/decode) \u2014 " +
            "the conventional trio cannot auto-pair, so SigV4 requests using these credentials are not re-signed until the entry is fixed",
          { level: "warn" },
        );
    }
  }
  let Eh = (j, ce) =>
      Ad(j) ? [j, ...hh(j).map((Ee) => (Js(Ee.canonical, Ee.lexical, ce), Ee.canonical))] : [j],
    flattened_3 = [...is.entries()]
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
      { level: "warn" },
    );
  let Jl = Ga
    ? Ie.flatMap((j) => {
        let replaced = uy(j).replace(Yi, ""),
          Ee = isAbsolute_2(replaced)
            ? replaced
            : replaced.startsWith("~")
              ? join_9(safeProcessCwd(), replaced)
              : resolveAgainstProcessCwd(replaced),
          We = qd.has(j);
        if (Ad(replaced)) {
          let bt = rf(Ee, We);
          return (Js(bt, bt, We), Eh(bt, We));
        }
        let tt = rf(Ee, We);
        return (Js(tt, replaced, We), [tt]);
      })
    : [];
  if (!Ai)
    for (let [j, ce] of [...is.entries()]) {
      if (ce.mode !== "mask") continue;
      let replaced = uy(ce.path).replace(Yi, ""),
        found = [...flattened_3, ...Jl].find((tt) => qc(tt, j) && !mo(tt, j) && !Ha(tt, replaced) && sf(tt));
      if (found !== void 0)
        (logForDebugging(
          `[sandbox] credential file mask for '${ce.path}' dropped: trusted-tier deny '${found}' covers it through a symlink or a relative spelling \u2014 installed as a canonical deny on '${j}' so enforcement cannot be retargeted`,
        ),
          is.set(j, { path: j, mode: "deny" }));
    }
  let Cb = (j, ce) =>
      Ai
        ? void 0
        : (flattened_3.find((Ee) => !Ad(Ee) && qc(Ee, j) && !mo(Ee, j) && Ha(Ee, ce)) ??
          Jl.find((Ee) => !Ad(Ee) && qc(Ee, j) && !mo(Ee, j) && Ha(Ee, ce))),
    xh = mh
      ? {
          files: [...is.entries()]
            .filter(([j, ce]) => {
              if (ce.mode !== "mask") return !0;
              let Ee = Cb(j, uy(ce.path).replace(Yi, ""));
              if (Ee === void 0) return !0;
              return (
                logForDebugging(
                  `[sandbox] credential file mask for '${ce.path}' dropped: shadowed by deny on '${Ee}'`,
                ),
                !1
              );
            })
            .map(([j, ce]) => {
              if (
                ce.mode === "mask" &&
                !Ai &&
                [...flattened_3, ...Jl].some(
                  (Ee) => qc(Ee, j) && (mo(Ee, j) || Ad(Ee) || !Ha(Ee, uy(ce.path).replace(Yi, ""))),
                )
              )
                return (
                  logForDebugging(
                    `[sandbox] credential file mask for '${ce.path}' kept over a covering deny it cannot be shadowed by (allowRead-re-opened or symlink-spelled) WITHOUT injection or extract (whole-file sentinel)`,
                  ),
                  { path: ce.path, mode: "mask", injectHosts: [] }
                );
              return ce;
            }),
          envVars: [...mi.values()],
          ...(of !== void 0 && { allowPlaintextInject: of }),
          ...(mapped.length > 0 && { awsPairs: mapped }),
          ...(lf !== void 0 && { sigv4: lf }),
        }
      : void 0,
    Rb =
      Qd.length > 0
        ? uniq([
            ...ef(),
            ...(xh?.files ?? [])
              .flatMap((j) => canonicalizeSandboxPath(j.path) ?? [])
              .flatMap((j) => resolveReadDenyRoot(j).spellings),
          ])
        : [],
    { rgPath: rgPath, rgArgs: rgArgs, argv0: argv0 } = ripgrepCommand(),
    Ql = getSandboxSettingsSources()
      .map((j) => j?.sandbox?.ripgrep)
      .find((j) => j !== void 0) ?? { command: rgPath, args: rgArgs, argv0: argv0 },
    _h = isScrubOnlySandboxMode(),
    zc = _h
      ? { allowedDomains: void 0, deniedDomains: [], ...ALLOW_ALL_UNIX_SOCKETS }
      : {
          allowedDomains: allowedDomains,
          deniedDomains: deniedDomains,
          ...(Object.keys(ie).length > 0 && { deniedDomainReasons: ie }),
          strictAllowlist: R || void 0,
          ...(evalConfinedEnv ? {} : getNetworkAllowances(settings.sandbox?.network)),
        },
    vh = getTlsTerminateSetting(),
    Db = !1;
  if (!_h && zc.tlsTerminate === void 0 && vh !== void 0)
    if (getPlatform() === "windows") {
      let j = getCaCertPaths(resolveWindowsTlsTerminateCaSource());
      if (j !== void 0) zc.tlsTerminate = j;
      else
        logForDebugging(
          "[sandbox] settings tlsTerminate has no CA paths and the managed sandbox CA is gated off on Windows \u2014 ignoring tlsTerminate (an ephemeral CA cannot pass srt-win user trust-ca)",
          { level: "warn" },
        );
    } else zc.tlsTerminate = vh;
  let Ob = $d(splitBindableWriteRoots([...BP(), ...Se], new Set([we, ut]))),
    Pb = Xe.missing === null ? [] : [dirname_7(Xe.missing.name)],
    uf = new Set([we, ut]),
    wh = new Set(splitBindableWriteRoots([...Zd], uf).bindable),
    Th = splitBindableWriteRoots([...BP(), ...me], uf),
    filtered_3 = [...Se, ...Wa]
      .map((j) => splitBindableWriteRoots([j], uf))
      .filter((j) => !j.bindable.every((ce) => wh.has(ce))),
    combined = filtered_3.flatMap($d).concat($d(Th)),
    any = filtered_3.some((j) => j.hasUndecidableEntry),
    filtered_4 = Xe.links.filter(
      (link) =>
        any ||
        (link.isLive ? combined : Ob).some((ce) => isPathWithin(ce, dirname_7(link.path), { foldCase: !0 })),
    ),
    Fb = uniq([...filtered_4.map((j) => dirname_7(j.path)), ...(Xe.missing?.isUnreadable === !0 ? Pb : [])]),
    Mb = uniq([
      we,
      ut,
      homedir_3(),
      resolveExistingPrefix(homedir_3())?.path ?? homedir_3(),
      ...Th.bindable,
      ...wh,
    ]);
  for (let j of Fb)
    if (!(
      (Nt?.exists === !0 && isSameDirOrAbove(j, Wt, { orAbove: !1 })) ||
      Mb.some((Ee) => isSameDirOrAbove(j, Ee, { orAbove: !0 }))
    ))
      Ce(j, !1, !0);
  ((adapterState.lateSymlinkGrantCandidates = Qd),
    (adapterState.lateSymlinkGrantDenyRoots = Rb),
    (adapterState.lateSymlinkGrantProfile = ji));
  let Ch = new Map(),
    Rh = isPatternWriteDenyTwinsEnabled(),
    $b = {
      denyRead: uniq(addRealPathDenyTwins(Ie, "read", Ch, !1)),
      allowRead: uniq(he),
      allowWrite: uniq(Se),
      denyWrite: uniq(addRealPathDenyTwins(Ne, "write", Ch, Rh)),
      ...(getEffectiveFilesystemPolicy() === "relaxed" && { disabled: !0 }),
    },
    Ih = new Set();
  for (let j of new Set(Ae ? [we, ut] : [we]))
    for (let ce of [findGitRoot(j), findCanonicalGitRoot(j)]) if (ce !== null) Ih.add(ce);
  let df = new Set();
  for (let j of Ih)
    try {
      df.add(realpathSync(j));
    } catch {}
  let Qs = {
      network: zc,
      filesystem: $b,
      ignoreViolations: adminMandate ? mergeIgnoreViolations() : settings.sandbox?.ignoreViolations,
      credentials: xh,
      enableWeakerNestedSandbox:
        isScrubEnabled() && isScrubSandboxAvailable()
          ? !1
          : adminMandate
            ? trustedBooleanUnlessFalse(
                settings.sandbox?.enableWeakerNestedSandbox,
                (j) => j.enableWeakerNestedSandbox,
              )
            : settings.sandbox?.enableWeakerNestedSandbox,
      allowNestedUserNamespaces:
        isScrubEnabled() && isScrubSandboxAvailable()
          ? !1
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
      allowAppleEvents: N$(readSandboxSetting(["allowAppleEvents"])),
      ...(df.size > 0 && { git: { safeDirectories: [...df] } }),
      ripgrep: Ql,
      seccomp: xor(),
      bwrapPath: dyr(),
      socatPath: xCi(),
      ...(getPlatform() === "windows" && {
        windows: { sandboxUser: CLAUDECODESANDBOX, srtWin: { path: process.execPath } },
      }),
    },
    Vb = {};
  for (let j of Ua) if (!judgeFileActSafe("create", join_9(...j), !0, Vb, Qs)) createFileAtChain(...j);
  if (
    (getSandboxAdapterState().builtConfigEnforcesAllowlist.set(Qs, Db),
    getSandboxAdapterState().builtConfigConfiguredDenies.set(Qs, jd),
    ae !== void 0)
  )
    getSandboxAdapterState().builtConfigGbHostRules.set(Qs, ae);
  if (
    (getSandboxAdapterState().builtConfigSshStoreDenied.set(Qs, Uc),
    getSandboxAdapterState().builtConfigPluginToolStagingDenied.set(Qs, vt),
    getSandboxAdapterState().builtConfigPatternWriteDenyTwins.set(Qs, Rh),
    getSandboxAdapterState().builtConfigUnlistableWorktreesDenied.set(Qs, Ba),
    Ma !== void 0)
  )
    getSandboxAdapterState().builtConfigNestedGitConfigLockDeny.set(Qs, Ma);
  let Nh = K?.resolved.some((j) => j.lookAgain !== void 0),
    ff = new Set(
      (Qs.credentials?.files ?? []).flatMap((j) => {
        if (j.mode !== "mask" || isSentinelOnlyMask(j)) return [];
        let ce = canonicalizeSandboxPath(j.path);
        return ce === void 0 ? [j.path] : [j.path, ce];
      }),
    ),
    kh = (j) => ff.has(j.root) || ff.has(canonicalizeSandboxPath(j.root) ?? j.root),
    Dh = (j) => j.map((ce) => (kh(ce) ? { ...ce, isMask: !0 } : ce)),
    pf = Dh(fh),
    any_2 = pf.some((j) => j.isMask);
  return (
    getSandboxAdapterState().builtConfigReadDenyRootResolution.set(
      Qs,
      Nh || pf.length > 0
        ? {
            resolution: Nh && K ? { key: K.key, resolved: Dh(K.resolved) } : void 0,
            forwardedUntrustedGrants: ra,
            maskSweepEntries: pf,
            trustedDenyRoots: any_2
              ? [
                  ...(L ?? getTrustedReadDenyRoots()).filter((j) => !ff.has(j)),
                  ...(K?.resolved ?? []).flatMap((j) => (kh(j) ? [] : j.spellings)),
                ]
              : [],
          }
        : void 0,
    ),
    Qs
  );
}
/**
 * 把构建好的配置装入 sandbox-runtime（SandboxManager.updateConfig），同步记录该配置对应的 GrowthBook 规则/deny 开关/读禁止根解析等附加状态。
 */
//@ chunk-fq0cr76a.js:987937-988982 placement
function installSandboxConfig(e) {
  try {
    on.updateConfig(e);
  } catch (error) {
    throw describeUnreadableSandboxError(error, "configNotInstalled");
  }
  if (getSandboxAdapterState().builtConfigConfiguredDenies.has(e))
    getSandboxAdapterState().storedDenyListsMayBeShort = !1;
  (adoptReadDenyRootResolution(e), recordWrapWriteRoots(e));
  let n = getSandboxAdapterState();
  ((n.gbHostRulesApplied = n.builtConfigGbHostRules.get(e) ?? n.gbHostRulesApplied),
    (n.sshStoreDenyApplied = n.builtConfigSshStoreDenied.get(e) ?? n.sshStoreDenyApplied),
    (n.pluginToolStagingDenyApplied =
      n.builtConfigPluginToolStagingDenied.get(e) ?? n.pluginToolStagingDenyApplied),
    (n.patternWriteDenyTwinsApplied =
      n.builtConfigPatternWriteDenyTwins.get(e) ?? n.patternWriteDenyTwinsApplied),
    (n.unlistableWorktreesDenyApplied =
      n.builtConfigUnlistableWorktreesDenied.get(e) ?? n.unlistableWorktreesDenyApplied),
    (n.nestedGitConfigLockDenyApplied =
      n.builtConfigNestedGitConfigLockDeny.get(e) ?? n.nestedGitConfigLockDenyApplied),
    (n.installedConfiguredDenies = n.builtConfigConfiguredDenies.get(e) ?? n.installedConfiguredDenies));
  let r = n.builtConfigEnforcesAllowlist.get(e) ?? !1;
  if (n.initializationPromise === void 0) n.installedFilterRequestEnforcesAllowlist = r;
  else n.installsSinceInitializeStartedAllEnforce &&= r;
}
//@ chunk-fq0cr76a.js:988982-989305 placement
function adoptReadDenyRootResolution(e) {
  let n = getSandboxAdapterState();
  if (n.builtConfigReadDenyRootResolution.has(e))
    ((n.installedReadDenyRootResolution = n.builtConfigReadDenyRootResolution.get(e)),
      (n.pendingReadDenyFallback = void 0),
      (n.readDenyRootLookCursor = 0),
      (n.readDenyRootLookFinishedAt = void 0),
      (n.readDenyRootLookFailureReported = !1),
      n.readDenyRootWithinSandboxReach.clear());
}
//@ chunk-fq0cr76a.js:989305-989434 placement
function cloneScrubParent(e) {
  return {
    real: e.real,
    literalPhysical: e.literalPhysical,
    inode: e.inode === null ? null : { dev: e.inode.dev, ino: e.inode.ino },
  };
}
/**
 * 沙箱适配层的进程级状态（GrowthBook 配置、会话允许主机、deny 真实路径、嵌套 git 配置锁等）。
 */
//@ chunk-fq0cr76a.js:989434-991903 placement
class SandboxAdapterState {
  tenguSandboxGbConfig = io(getDefaultSandboxGbConfig);
  sessionAllowedHosts = new Set();
  realPathsOfDenies = { read: new Map(), write: new Map() };
  realPathTwins = "unlisted";
  nestedGitConfigLockDenyApplied = void 0;
  builtConfigNestedGitConfigLockDeny = new WeakMap();
  initializationPromise = void 0;
  initializedWithTlsTerminate = !1;
  installedFilterRequestEnforcesAllowlist = !1;
  installsSinceInitializeStartedAllEnforce = !0;
  builtConfigEnforcesAllowlist = new WeakMap();
  settingsSubscriptionCleanup = void 0;
  sandboxDisabledThisSession = !1;
  initFailureReason = void 0;
  initFailureCode = "unknown";
  refusedOverWorkingFolder = !1;
  startedOnce = !1;
  windowsLoopbackAtStart = void 0;
  askCallback = void 0;
  selfExecGrantAttempt = void 0;
  builtConfigConfiguredDenies = new WeakMap();
  installedConfiguredDenies = void 0;
  nativeDenies = void 0;
  nativeDenyRenewals = {};
  storedDenyListsMayBeShort = !1;
  droppedRepoExcludedCommandsLogged = !1;
  droppedRepoNetworkAllowancesLogged = !1;
  droppedRepoFilesystemGrantsLogged = !1;
  droppedRepoAllowedDomainsLogged = !1;
  deniesDroppedForAnotherHost = [];
  configBuildFailed = !1;
  runtimeInitialized = !1;
  sandboxRuntimeIsUp = !1;
  permissionRemovalAnnounced = !1;
  trustedReadDenyRootResolution = void 0;
  builtConfigReadDenyRootResolution = new WeakMap();
  installedReadDenyRootResolution = void 0;
  readDenyRootFirstLookDue = !1;
  readDenyRootLookCursor = 0;
  readDenyRootLookFinishedAt = void 0;
  readDenyRootLookFailureReported = !1;
  readDenyRootReachSeenAtLook = 0;
  readDenyRootWithinSandboxReach = new Map();
  pendingReadDenyFallback = void 0;
  fsReadConfigMemo = void 0;
  gbHostRulesMemo = void 0;
  gbHostRulesApplied = void 0;
  builtConfigGbHostRules = new WeakMap();
  sshStoreDenyApplied = void 0;
  builtConfigSshStoreDenied = new WeakMap();
  pluginToolStagingDenyApplied = void 0;
  builtConfigPluginToolStagingDenied = new WeakMap();
  patternWriteDenyTwinsApplied = void 0;
  builtConfigPatternWriteDenyTwins = new WeakMap();
  unlistableWorktreesDenyApplied = void 0;
  builtConfigUnlistableWorktreesDenied = new WeakMap();
  bareGitRepoScrubPaths = new Map();
  scrubParentMemo = new Map();
  scrubParentLastKnown = new Map();
  symlinkedDenyScrubPaths = [];
  wrapCwdsThisSession = new Set();
  wrapBindableWriteRootsThisSession = new Set();
  wrapOutOfTreeTargetsThisSession = new Set();
  undecidableWrapThisSession = !1;
  unconfinedWrapThisSession = !1;
  builtAsThinClient = !1;
  bareGitRepoScrubPathsVouchedLocally = null;
  denyLiteralSymlinkCandidates = [];
  devModsRoots = new Map();
  lateSymlinkGrantCandidates = [];
  lateSymlinkGrantDenyRoots = [];
  lateSymlinkGrantProfile = void 0;
  runtimeAllowWriteDirectories = new Map();
  dependencyProbeGeneration = 0;
  checkDependenciesProbe = io(checkDependencies);
  baseIsSupportedPlatform = io(() => on.isSupportedPlatform());
}
//@ chunk-fq0cr76a.js:991903-991913 placement
var rw, Yv;
/**
 * 取沙箱适配层的单例状态（初始化 Promise、失败原因、已安装配置的各类附加信息、读禁止复查状态、Windows 原生 deny 等）。
 */
//@ chunk-fq0cr76a.js:991913-991946 placement
function getSandboxAdapterState() {
  return (rw ??= new SandboxAdapterState());
}
//@ chunk-fq0cr76a.js:991946-992071 placement
function getProcessSandboxState() {
  if (!Yv)
    Yv = {
      osLinkedRootRealpaths: new Map(),
      stagingDirGitignoreFired: !1,
      windowsStartBeganAtMs: createStore(null),
    };
  return Yv;
}
/**
 * 运行时把某目录加入沙箱可写列表（按 key 登记），变化时 refreshConfig。
 */
//@ chunk-fq0cr76a.js:992071-992169 placement
function addSandboxAllowWriteDirectory(e, n) {
  let { runtimeAllowWriteDirectories: runtimeAllowWriteDirectories } = getSandboxAdapterState();
  if (runtimeAllowWriteDirectories.get(n) === e) return;
  (runtimeAllowWriteDirectories.set(n, e), refreshConfig());
}
/**
 * 从运行时可写列表移除某 key 的目录，有变化时 refreshConfig。
 */
//@ chunk-fq0cr76a.js:992169-992237 placement
function removeSandboxAllowWriteDirectory(e) {
  if (getSandboxAdapterState().runtimeAllowWriteDirectories.delete(e)) refreshConfig();
}
//@ chunk-fq0cr76a.js:992237-992281 placement
function F4(e, n) {
  return n !== null && !n.has(e);
}
/**
 * 把删除策略名映射为具体选项（是否整目录、是否删除空目录、HEAD 残留时是否整目录）。
 */
//@ chunk-fq0cr76a.js:992281-992649 placement
function getRemovalPolicy(e) {
  switch (e) {
    case "file":
      return { wholeFolder: !1, thenEmptyFolder: !1, wholeIfAHeadSurvives: !1 };
    case "file_or_empty_folder":
      return { wholeFolder: !1, thenEmptyFolder: !0, wholeIfAHeadSurvives: !1 };
    case "all_if_a_head_survives":
      return { wholeFolder: !1, thenEmptyFolder: !0, wholeIfAHeadSurvives: !0 };
    case "all":
      return { wholeFolder: !0, thenEmptyFolder: !1, wholeIfAHeadSurvives: !1 };
  }
}
//@ chunk-fq0cr76a.js:992649-992748 placement
function Ar(e, n = "debug") {
  try {
    logForDebugging(`[Sandbox] ${e}`, { level: n });
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "scrubOutcomeNotLogged");
  }
}
//@ chunk-fq0cr76a.js:992748-992827 placement
function Xs(e) {
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
function logBareRepoScrubRemoval(e, n) {
  let r = SCRUB_NAME_LABELS.get(basename_2(e)) ?? "other_name",
    s = n === "plain" ? "" : `_${n}`;
  Xs(`bare_repo_scrub_removed_${r}${s}`);
}
/**
 * 命令执行后清扫被植入的条目（裸 git 仓库路径、deny 路径下新建的文件），按平台移除或置 000。
 */
//@ chunk-fq0cr76a.js:993139-994940 placement
function scrubPlantedBareRepoIndicators(extra = { paths: [], pathsVouchedLocally: null }) {
  let isPosix = getPlatform() !== "windows",
    state = getSandboxAdapterState(),
    bareGitRepoScrubPaths = state.bareGitRepoScrubPaths,
    entries =
      extra.paths.length > 0
        ? [
            ...bareGitRepoScrubPaths.values(),
            ...extra.paths.filter((entry) => !bareGitRepoScrubPaths.has(entry.path)),
          ]
        : bareGitRepoScrubPaths.values(),
    checked = {},
    deferred = [];
  for (let S of entries) {
    let path = S.path,
      sliced = path.slice(path.lastIndexOf(sep) + 1),
      D = bareGitRepoScrubPaths.get(path)?.removal,
      L =
        (D === void 0 || F4(path, state.bareGitRepoScrubPathsVouchedLocally)) &&
        (!extra.paths.some((path_2) => path_2.path === path) || F4(path, extra.pathsVouchedLocally));
    if (judgeFileActSafe("delete", path, L, checked)) continue;
    try {
      if (lstatSync(path, { throwIfNoEntry: !1 }) === void 0) continue;
    } catch {}
    let removal = D ?? "file",
      policy = getRemovalPolicy(
        (sliced === "HEAD" || sliced === ".git") &&
          (removal === "all" || removal === "all_if_a_head_survives")
          ? "file_or_empty_folder"
          : removal,
      ),
      outcome = withVerifiedScrubParent(S, `scrub of planted ${sliced}`, isPosix, (Z, J, ie) =>
        scrubBareRepoIndicator(S, sliced, policy, Z, J, ie, isPosix),
      );
    if (typeof outcome === "string") deferred.push({ entry: S, outcome: outcome });
  }
  for (let { entry: entry, outcome: outcome } of deferred) {
    let path = entry.path,
      sliced = path.slice(path.lastIndexOf(sep) + 1);
    if (
      withVerifiedScrubParent(entry, `scrub of planted ${sliced}`, isPosix, (L, V, K) => {
        let q = join_9(dirname_7(path), "HEAD");
        if (!isFileOrRefsLink(classifyHeadEntry(join_9(L, "HEAD")))) return (Ar(outcome), !0);
        let Z = `${q} still stands, and with it git could take ${dirname_7(path)} for a repository`;
        try {
          if (isPosix) restoreOwnerDirMode(L, K);
          let J,
            ie = quarantinePlantedEntry(L, sliced, K, V, (ae) => {
              J = ae;
            });
          if (!entry.unlinkable && ie === "quarantined") reportUnclassifiedIndicatorMoved(K, sliced, J);
          if (
            (Ar(
              ie === "quarantined"
                ? `scrub moved ${path} aside whole: ${Z}`
                : ie === "removed"
                  ? `scrub removed ${path}: ${Z}`
                  : ie === "gone"
                    ? `scrub found nothing at ${path} to move aside; ${q} still stands without it`
                    : `${outcome}. Because ${q} still stands and git could take ${dirname_7(path)} for a repository, the scrub tried to move ${path} aside whole; that failed too, so ${path} ${ie === "neutralized" ? "was made unreadable in place" : "is left as it is"}`,
              ie === "gone" ? "debug" : "warn",
            ),
            ie === "removed")
          )
            logBareRepoScrubRemoval(path, "beside_head");
        } catch (error) {
          (Ar(
            `${outcome}. Because ${q} still stands and git could take ${dirname_7(path)} for a repository, the scrub tried to move ${path} aside whole; that failed too: ${getErrnoCode(error) ?? "no code"}`,
            "warn",
          ),
            Xs("bare_repo_scrub_remove_failed"));
        }
        return !0;
      }) === void 0
    )
      Ar(outcome);
  }
}
/**
 * 上报无法在构建配置时分类的标记文件被移到旁边（而非删除）。
 */
//@ chunk-fq0cr76a.js:994940-995444 placement
function reportUnclassifiedIndicatorMoved(e, n, r) {
  (reportSandboxErrorUnderStandIn(
    new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `[Sandbox] ${e}: ${n} could not be checked when the sandbox configuration was last built, so it was moved aside as ${r ?? `${n}${U$}<hex>`} rather than removed; if it is yours, rename it back after this session ends; while the session runs, anything that reappears at that name is treated as planted.`,
      "sandbox: post-command scrub moved aside an indicator it could not classify at config build",
    ),
    "unclassifiedIndicatorMovedAside",
  ),
    Xs("scrub_unclassified_indicator_quarantined"));
}
/**
 * 在已验证的父目录下执行清理回调：非 POSIX 直接用父路径；父目录未解析或验证失败时拒绝并打点；成功后传入可用的基路径与是否可直接删除，结束时关闭目录句柄。
 */
//@ chunk-fq0cr76a.js:995444-995905 placement
function withVerifiedScrubParent(e, n, r, s) {
  let { path: path, parent: parent, unlinkable: unlinkable } = e;
  if (!r) return s(dirname_7(path), unlinkable, n);
  if (parent.real === null) {
    (Ar(`${n}: parent of ${path} did not resolve at config build; refusing`, "error"),
      Xs("bare_repo_scrub_refused_unresolved"));
    return;
  }
  let opened = openVerifiedScrubParent(
    dirname_7(path),
    n,
    parent.real,
    parent.literalPhysical ?? void 0,
    parent.inode,
  );
  if (!opened.ok) {
    Xs(
      opened.refusedNonCanonical
        ? "bare_repo_scrub_refused_noncanonical"
        : "bare_repo_scrub_refused_unavailable",
    );
    return;
  }
  try {
    return s(opened.base, opened.recorded && unlinkable, n);
  } finally {
    opened.close();
  }
}
//@ chunk-fq0cr76a.js:995905-996016 placement
function classifyRemovalTarget(e) {
  try {
    return lstatSync(e).isDirectory() ? "dir" : "remove";
  } catch (error) {
    return getErrnoCode(error) === "ENOENT" ? "skip" : "unknown";
  }
}
/**
 * 清理位置是目录时：策略允许则删除空目录，否则保留；删除失败按策略返回消息或记录。
 */
//@ chunk-fq0cr76a.js:996016-996355 placement
function removeEmptyPlantedDir(e, n, r) {
  if (!r.thenEmptyFolder)
    return (Ar(`scrub left ${e}: it is a folder, and only a file or link may be removed there`), !1);
  try {
    return (
      rmdirSync(n),
      Ar(`removed planted empty dir: ${e}`),
      logBareRepoScrubRemoval(e, "empty_folder"),
      !1
    );
  } catch (error) {
    let h = `scrub did not remove ${e}: rmdirSync ${getErrnoCode(error) ?? "no code"}`;
    if (r.wholeIfAHeadSurvives) return h;
    return (Ar(h), !1);
  }
}
/**
 * 清理命令放置的单个裸仓库标记（HEAD、objects、refs 等）：按删除策略判断是目录、文件还是跳过；能直接删除的删除，否则移到旁边或就地处理，并记录日志与打点。
 */
//@ chunk-fq0cr76a.js:996355-997358 placement
function scrubBareRepoIndicator(entry, entryName, policy, parentBase, canUnlink, label, isPosix) {
  let path = entry.path,
    entryPath = join_9(parentBase, entryName);
  try {
    let targetKind = policy.wholeFolder ? "remove" : classifyRemovalTarget(entryPath);
    if (targetKind === "skip") return !1;
    if (targetKind === "dir") return removeEmptyPlantedDir(path, entryPath, policy);
    if (isPosix) {
      if ((restoreOwnerDirMode(parentBase, label), targetKind === "unknown")) {
        if (((targetKind = classifyRemovalTarget(entryPath)), targetKind === "unknown"))
          return (
            Ar(`${label}: cannot examine ${entryName} through the parent; leaving it`, "error"),
            Xs("bare_repo_scrub_indicator_unexamined"),
            !1
          );
        if (targetKind === "skip") return !1;
        if (targetKind === "dir") return removeEmptyPlantedDir(path, entryPath, policy);
      }
    }
    if (!policy.wholeFolder && canUnlink)
      try {
        rmSync_4(entryPath, { recursive: !1 });
      } catch (quarantineName) {
        let outcome = getErrnoCode(quarantineName);
        if (outcome !== "EISDIR" && outcome !== "ERR_FS_EISDIR") throw quarantineName;
        return removeEmptyPlantedDir(path, entryPath, policy);
      }
    else {
      let D,
        O = quarantinePlantedEntry(
          parentBase,
          entryName,
          label,
          canUnlink,
          (L) => {
            D = L;
          },
          policy.wholeFolder,
        );
      if (O === !1 || O === "gone") return !1;
      if (O === "left") return removeEmptyPlantedDir(path, entryPath, policy);
      if (!entry.unlinkable && O === "quarantined") reportUnclassifiedIndicatorMoved(label, entryName, D);
      if (O === "quarantined")
        return (Ar(`scrub moved planted ${path} aside as ${D ?? "a quarantine name"}`), !1);
      if (O === "neutralized") return !1;
    }
    (Ar(`scrub removed planted ${path}`), logBareRepoScrubRemoval(path, "plain"));
  } catch (error) {
    let D = getErrnoCode(error);
    if (D !== "ENOENT" && D !== "EISDIR" && D !== "ERR_FS_EISDIR")
      (Ar(`scrub did not remove ${path}: ${D ?? "no code"}`), Xs("bare_repo_scrub_remove_failed"));
  }
  return !1;
}
/**
 * 命令结束后检查被拒绝的符号链接路径：仍指向原处的保留，被替换的删除；用户自己改向且不在任何写根内的放过并更新记录。
 */
//@ chunk-fq0cr76a.js:997358-997779 placement
function scrubSymlinkedDenyPaths(e) {
  let { symlinkedDenyScrubPaths: symlinkedDenyScrubPaths } = getSandboxAdapterState(),
    spared = [],
    memo = {};
  for (let index = 0; index < symlinkedDenyScrubPaths.length; index++) {
    let entry = symlinkedDenyScrubPaths[index],
      verdict = classifySymlinkedDenyPath(entry, memo);
    switch (verdict.kind) {
      case "keep":
        break;
      case "spare":
        spared.push({
          index: index,
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
  if (e !== void 0 && e.length > 0) scrubDeferredSymlinkSnapshot(e);
}
//@ chunk-fq0cr76a.js:997779-997924 placement
function scrubDeferredSymlinkSnapshot(e) {
  let n = {};
  for (let r of e) {
    let s = classifySymlinkedDenyPath(r, n);
    if (s.kind === "delete")
      scrubReplacedSymlinkDeny(r, s, "scrubbed replaced symlinked-deny path (deferred snapshot)");
  }
}
//@ chunk-fq0cr76a.js:997924-998089 placement
function getScrubWriteRoots(e, n = deriveScrubWriteRoots) {
  if (e.roots === void 0)
    try {
      e.roots = n();
    } catch (error) {
      (logForDebugging(`[Sandbox] scrub write-root derivation failed: ${error}`, { level: "warn" }),
        (e.roots = null));
    }
  return e.roots;
}
//@ chunk-fq0cr76a.js:998089-998193 placement
function judgeFileActSafe(e, n, r, s, h) {
  try {
    return judgeOwnFileAct(e, n, r, s, h);
  } catch (error) {
    return (reportSandboxErrorUnderStandIn(error, "fileActNotJudged"), e === "create");
  }
}
/**
 * 判断 Claude Code 自己在瘦客户端/云会话后创建或删除某路径是否应被扣下：路径存在性与操作不符时放行；无配置、未受写根约束、无法解析真实路径或写根未知时按规则判定；最后看是否位于写根内。
 */
//@ chunk-fq0cr76a.js:998193-998772 placement
function judgeOwnFileAct(action, path, force, rootsMemo, config) {
  if (!(wt() || force) || !Aw()) return !1;
  let exists = !0;
  try {
    lstatSync(path);
  } catch (error) {
    let L = getErrnoCode(error);
    if (L !== "ENOENT" && L !== "ENOTDIR") return logFileActVerdict(action, path, !0, "lstat_failed");
    exists = !1;
  }
  if (exists === (action === "create")) return !1;
  let sandboxConfig = config ?? assertMarkedPathsResolved(on.getConfig());
  if (sandboxConfig === void 0) return logFileActVerdict(action, path, !0, "no_config");
  let decide = (O, L) => logFileActVerdict(action, path, O, L, sandboxConfig);
  if (wt() && isWrapUnconfined(sandboxConfig)) return decide(!1, "not_confined_to_write_roots");
  let parentInfo = resolveExistingPrefix(dirname_7(path));
  if (parentInfo === null) return decide(action === "create", "realpath_failed");
  let writeRoots = getScrubWriteRoots(rootsMemo, () => lue(sandboxConfig));
  if (writeRoots === null) return decide(action === "create", "write_roots_unknown");
  let isInside = isInsideWriteRoots(action, parentInfo.path, writeRoots);
  return decide(!isInside, isInside ? "inside_write_roots" : "outside_write_roots");
}
/**
 * 记录瘦客户端/云会话后 Claude Code 自己的创建或删除操作被放行或扣下的判定，并打点。
 */
//@ chunk-fq0cr76a.js:998772-999201 placement
function logFileActVerdict(e, n, r, s, h) {
  try {
    (logForDebugging(
      `[Sandbox] ${wt() ? "thin client" : "after a cloud session"}: Claude Code's own ${e} of ${n} ${r ? "is withheld" : "goes ahead"} (${s})`,
    ),
      logEvent("tengu_sandbox_thin_client_file_act_judged", {
        kind: fromEnum(e),
        withheld: r,
        why: fromEnum(s),
        after_cloud_session: !wt(),
        live_list_built_as_thin_client: getSandboxAdapterState().bareGitRepoScrubPathsVouchedLocally !== null,
        ...(h && { write_roots_enforced: !isWrapUnconfined(h) }),
      }));
  } catch (error) {
    reportSandboxErrorUnderStandIn(error, "fileActVerdictNotLogged");
  }
  return r;
}
/**
 * 判断一个被拒绝的符号链接路径在命令后的状态：仍指向原目标或已消失则 keep；不在任何写根可达范围内则 spare（用户改动）；否则 delete。
 */
//@ chunk-fq0cr76a.js:999201-999827 placement
function classifySymlinkedDenyPath(
  {
    literal: literal,
    resolved: resolved,
    hopDirectories: hopDirectories,
    danglingBaseline: danglingBaseline,
  },
  memo,
) {
  let isSymlink,
    danglingTarget,
    stat = null;
  try {
    let hops = lstatSync(literal);
    ((stat = hops), (isSymlink = hops.isSymbolicLink()));
  } catch (error) {
    if (getErrnoCode(error) === "ENOENT") return { kind: "keep" };
    isSymlink = !1;
  }
  let realPath;
  if (isSymlink)
    try {
      if (((realPath = realpathSync(literal)), realPath === resolved)) return { kind: "keep" };
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
        return { kind: "keep" };
    }
  let writeRoots = getScrubWriteRoots(memo);
  if (!eb(hopDirectories, writeRoots)) {
    if (!isSymlink && stat === null) return { kind: "keep" };
    if (danglingTarget !== null) {
      let D = collectSymlinkHopDirectories(
        literal,
        danglingTarget !== void 0 ? null : (realPath ?? Wce(literal)),
      );
      if (D !== null && !eb(D, writeRoots))
        return {
          kind: "spare",
          stillSymlink: isSymlink,
          currentHopDirectories: D,
          observedEnd: danglingTarget ?? realPath,
          dangling: danglingTarget !== void 0,
        };
    }
  }
  return { kind: "delete", stillSymlink: isSymlink, observedStat: stat };
}
/**
 * 清理被替换的拒绝符号链接：在已验证的父目录下重新检查，仍指向原目标则保留；否则移到旁边或删除，并对非链接条目打点。
 */
//@ chunk-fq0cr76a.js:999827-1000880 placement
function scrubReplacedSymlinkDeny(
  { literal: literal, resolved: resolved, parent: parent },
  verdict,
  message,
) {
  let isPosix = getPlatform() !== "windows",
    { stillSymlink: stillSymlink, observedStat: observedStat } = verdict,
    entryName = basename_2(literal),
    label = `scrub of replaced ${entryName}`,
    parentBase = dirname_7(literal),
    isRecorded = !isPosix,
    entryPath = literal,
    close = () => {};
  if (isPosix) {
    if (parent.real === null) {
      (Ar(`${label}: parent of ${literal} did not resolve at config build; refusing`, "error"),
        Xs("symlinked_deny_scrub_refused_unresolved"));
      return;
    }
    let opened = openVerifiedScrubParent(
      dirname_7(literal),
      label,
      parent.real,
      parent.literalPhysical ?? void 0,
      parent.inode,
    );
    if (!opened.ok) {
      Xs(
        opened.refusedNonCanonical
          ? "symlinked_deny_scrub_refused_noncanonical"
          : "symlinked_deny_scrub_refused_unavailable",
      );
      return;
    }
    ((parentBase = opened.base),
      (isRecorded = opened.recorded),
      (entryPath = join_9(parentBase, entryName)),
      (close = opened.close),
      restoreOwnerDirMode(parentBase, label));
    try {
      let q = lstatSync(entryPath);
      ((observedStat = q), (stillSymlink = q.isSymbolicLink()));
    } catch (error) {
      if (getErrnoCode(error) === "ENOENT") {
        close();
        return;
      }
      stillSymlink = !1;
    }
    if (stillSymlink) {
      let q = !1;
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
    if (K === !1 || K === "gone") return;
    if ((Ar(`${message}: ${literal}`), !stillSymlink && K === "removed")) {
      let q =
        observedStat === null
          ? "unknown"
          : observedStat.isDirectory()
            ? "directory"
            : observedStat.isFile()
              ? "file"
              : "other";
      logEvent("tengu_sandbox_scrub_removed_non_symlink", { kind: fromEnum(q) });
    }
  } catch (error) {
    let q = getErrnoCode(error);
    if (q !== "ENOENT")
      (Ar(`${label}: not removed (${q ?? error})`), Xs("symlinked_deny_scrub_remove_failed"));
  } finally {
    close();
  }
}
//@ chunk-fq0cr76a.js:1000880-1001171 placement
function deriveScrubWriteRoots() {
  let e = assertMarkedPathsResolved(on.getConfig()),
    n = getSandboxAdapterState();
  if (!e || isWrapUnconfined(e) || n.undecidableWrapThisSession) return null;
  let r = getWrapWriteRoots(e),
    s = wt();
  if (r.hasUndecidableEntry && !s) return null;
  return uniq([
    ...n.wrapBindableWriteRootsThisSession,
    ...n.wrapOutOfTreeTargetsThisSession,
    ...r.bindable,
    ...(s ? [] : r.outOfTreeTargets),
  ]);
}
//@ chunk-fq0cr76a.js:1001171-1001259 placement
function lue(e) {
  return uniq([
    ...getSandboxAdapterState().wrapBindableWriteRootsThisSession,
    ...getWrapWriteRoots(e).bindable,
  ]);
}
//@ chunk-fq0cr76a.js:1001259-1001424 placement
function getWrapWriteRoots(e) {
  let n = new Set([
    ...getSandboxAdapterState().wrapCwdsThisSession,
    ...(wt() ? [] : [getCwdState()]),
    getOriginalCwd(),
  ]);
  try {
    n.add(process.cwd());
  } catch {}
  return splitBindableWriteRoots([...BP(), ...e.filesystem.allowWrite], n);
}
/**
 * 这次包装是否没有真实隔离：平台不是 linux/wsl/macos、filesystem.disabled、本会话已降为无隔离包装或其他强制条件。strict 策略据此拒绝执行。
 */
//@ chunk-fq0cr76a.js:1001424-1001517 placement
function isWrapUnconfined(e) {
  return !Aw() || e.filesystem.disabled === !0 || getSandboxAdapterState().unconfinedWrapThisSession || X$();
}
//@ chunk-fq0cr76a.js:1001517-1001549 placement
function X$() {
  return isScrubEnabled() && isScrubSandboxAvailable();
}
//@ chunk-fq0cr76a.js:1001549-1001616 placement
function Aw() {
  let e = getPlatform();
  return e === "linux" || e === "wsl" || e === "macos";
}
/**
 * 把允许写入的路径按每个工作目录解析为绝对路径，区分可直接绑定的写根与真实路径落在树外的目标；无法解析时标记存在不可判定条目。
 */
//@ chunk-fq0cr76a.js:1001616-1001962 placement
function splitBindableWriteRoots(allowWrite, cwds) {
  let bindable = new Set(),
    outOfTree = new Set(),
    hasUndecidable = !1;
  for (let entry of new Set(allowWrite)) {
    let pattern = uy(entry);
    if (Ad(pattern)) pattern = getGlobBaseDirectory_2(pattern);
    for (let cwd of cwds) {
      let absolute =
        pattern === "~"
          ? homedir_3()
          : pattern.startsWith("~/")
            ? join_9(homedir_3(), pattern.slice(2))
            : resolve_2(cwd, pattern);
      bindable.add(absolute);
      let resolved = resolveExistingPrefix(absolute);
      if (resolved === null) hasUndecidable = !0;
      else if (Pwn(absolute, resolved.path)) outOfTree.add(resolved.path);
      else bindable.add(resolved.path);
    }
  }
  return { bindable: [...bindable], outOfTreeTargets: [...outOfTree], hasUndecidableEntry: hasUndecidable };
}
//@ chunk-fq0cr76a.js:1001962-1002025 placement
function $d({ bindable: bindable, outOfTreeTargets: outOfTreeTargets }) {
  return [...bindable, ...outOfTreeTargets];
}
//@ chunk-fq0cr76a.js:1002025-1002063 placement
function cue() {
  recordWrapWriteRoots(assertMarkedPathsResolved(on.getConfig()));
}
/**
 * 记录本会话沙箱包装命令的工作目录与可绑定写根、树外目标；未受约束或无法确定时打标记。
 */
//@ chunk-fq0cr76a.js:1002063-1002551 placement
function recordWrapWriteRoots(e) {
  if (!Aw()) return;
  let n = getSandboxAdapterState();
  if (!e || e.filesystem.disabled || X$()) {
    n.unconfinedWrapThisSession = !0;
    return;
  }
  let r;
  try {
    r = process.cwd();
  } catch {
    n.unconfinedWrapThisSession = !0;
    return;
  }
  n.wrapCwdsThisSession.add(r);
  let {
    bindable: bindable,
    outOfTreeTargets: outOfTreeTargets,
    hasUndecidableEntry: hasUndecidableEntry,
  } = splitBindableWriteRoots([...BP(), ...e.filesystem.allowWrite], new Set([r]));
  for (let b of bindable) n.wrapBindableWriteRootsThisSession.add(b);
  if (wt()) return;
  for (let b of outOfTreeTargets) n.wrapOutOfTreeTargetsThisSession.add(b);
  n.undecidableWrapThisSession ||= hasUndecidableEntry;
}
//@ chunk-fq0cr76a.js:1002551-1002640 placement
function eb(e, n) {
  if (e === null || n === null) return !0;
  return e.some((r) => n.some((s) => isPathPrefixOf(s, r)));
}
//@ chunk-fq0cr76a.js:1002640-1002931 placement
function isInsideWriteRoots(e, n, r) {
  let filtered = n.split("/").filter(Boolean);
  return r.some((h) => {
    if (isPathPrefixOf(h, n, !1)) return !0;
    if (!isPathPrefixOf(h, n)) return !1;
    let y = statInodeInfo(h);
    if (y === null) return !1;
    let b = count(h.split("/"), Boolean),
      S = statInodeInfo(`/${filtered.slice(0, b).join("/")}`);
    return S !== null && y.dev === S.dev && y.ino === S.ino && (e === "delete" || y.isTold);
  });
}
/**
 * 判断目录是否与给定路径相同（可选：或在其上方）：有可靠 inode 时按设备与 inode 比较，否则按规范化路径比较。
 */
//@ chunk-fq0cr76a.js:1002931-1003324 placement
function isSameDirOrAbove(e, n, { orAbove: orAbove }) {
  let s = statInodeInfo(e);
  if (s?.isTold !== !0) {
    let normalized = n.normalize("NFC");
    return [e.normalize("NFC"), toComparablePath(e, { foldCase: !1 })].some(
      (y) =>
        isPathWithin(y, normalized, { alreadyComparable: !0 }) &&
        (orAbove || isPathWithin(normalized, y, { alreadyComparable: !0 })),
    );
  }
  for (let h = n; ; h = dirname_7(h)) {
    let y = statInodeInfo(h);
    if (y !== null && y.dev === s.dev && y.ino === s.ino) {
      let b = dirname_7(h);
      while (dirname_7(b) !== b && statInodeInfo(b)?.isLink === !1) b = dirname_7(b);
      if (dirname_7(b) === b) return !0;
    }
    if (!orAbove || dirname_7(h) === h) return !1;
  }
}
//@ chunk-fq0cr76a.js:1003324-1003470 placement
function statInodeInfo(e) {
  try {
    let n = lstatSync(e, { bigint: !0 }),
      { dev: dev, ino: ino } = n;
    return { dev: dev, ino: ino, isTold: dev !== 0n && !isSentinelInode(ino), isLink: n.isSymbolicLink() };
  } catch {
    return null;
  }
}
//@ chunk-fq0cr76a.js:1003470-1003624 placement
function isPathPrefixOf(e, n, r = !0) {
  let filtered = e.split("/").filter(Boolean),
    filtered_2 = n.split("/").filter(Boolean);
  return (
    filtered.length <= filtered_2.length &&
    filtered.every((y, b) => (r ? due(y, filtered_2[b]) : y === filtered_2[b]))
  );
}
/**
 * 路径大小写折叠：去掉特定字符后 NFD→小写→大写→NFC，用于在大小写不敏感文件系统上比较。
 */
//@ chunk-fq0cr76a.js:1003624-1003726 placement
function foldPathCase(e) {
  return e.replace(regExp, "").normalize("NFD").toLowerCase().toUpperCase().normalize("NFC");
}
//@ chunk-fq0cr76a.js:1003726-1003772 placement
function due(e, n) {
  return e === n || foldPathCase(e) === foldPathCase(n);
}
//@ chunk-fq0cr76a.js:1003772-1003889 placement
function sameStringSet(e, n) {
  if (e === null || n === null || e.length !== n.length) return !1;
  let r = new Set(e);
  return n.every((s) => r.has(s));
}
/**
 * 对用户自己改向（不在写根内）的拒绝符号链接：已不是链接的转为字面拒绝候选并移出清理列表；仍是链接的更新记录，新目标加入写拒绝并重新安装沙箱配置。
 */
//@ chunk-fq0cr76a.js:1003889-1005016 placement
function spareUserRetargetedLinks(e) {
  let state = getSandboxAdapterState(),
    newTargets = [],
    keptLiterals = [];
  for (let index = e.length - 1; index >= 0; index--) {
    let {
        index: index_2,
        stillSymlink: stillSymlink,
        currentHopDirectories: currentHopDirectories,
        observedEnd: observedEnd,
        dangling: dangling,
      } = e[index],
      entry = state.symlinkedDenyScrubPaths[index_2];
    if (!stillSymlink || observedEnd === void 0) {
      (state.symlinkedDenyScrubPaths.splice(index_2, 1),
        state.denyLiteralSymlinkCandidates.push(entry.literal),
        keptLiterals.push(entry.literal),
        logForDebugging(
          `[Sandbox] kept ${entry.literal}: replaced by a real file/directory outside every sandbox write root (a user change, not a sandboxed plant); now denied directly`,
        ),
        logEvent("tengu_sandbox_scrub_spared_unreachable", { still_symlink: !1 }));
      continue;
    }
    let unchanged = observedEnd === entry.resolved;
    if (
      ((entry.resolved = observedEnd),
      (entry.hopDirectories = currentHopDirectories),
      (entry.danglingBaseline = dangling),
      unchanged)
    )
      continue;
    (newTargets.push(observedEnd),
      keptLiterals.push(entry.literal),
      logForDebugging(
        `[Sandbox] kept user-retargeted ${entry.literal} -> ${observedEnd}: nothing it resolves through is inside a sandbox write root (not a sandboxed plant); new target denied for the next command`,
      ),
      logEvent("tengu_sandbox_scrub_spared_unreachable", { still_symlink: !0 }));
  }
  let config = assertMarkedPathsResolved(on.getConfig());
  if (!config || keptLiterals.length === 0) return;
  let nextConfig = {
    ...config,
    filesystem: {
      ...config.filesystem,
      denyWrite: uniq([...newTargets, ...config.filesystem.denyWrite, ...keptLiterals]),
    },
  };
  (state.builtConfigEnforcesAllowlist.set(nextConfig, state.installedFilterRequestEnforcesAllowlist),
    installSandboxConfig(nextConfig));
}
/**
 * 复查 denyWrite 中按字面登记、后来变成符号链接的候选：解析其最终目标（最多跟 8 层），把目标加进 denyWrite 并重新安装配置。
 */
//@ chunk-fq0cr76a.js:1005016-1005584 placement
function rescreenDenyLiteralSymlinks() {
  let e = assertMarkedPathsResolved(on.getConfig());
  if (!e) return;
  let { denyLiteralSymlinkCandidates: denyLiteralSymlinkCandidates } = getSandboxAdapterState(),
    r = new Map();
  for (let y of denyLiteralSymlinkCandidates) {
    if (r.has(y)) continue;
    let b;
    try {
      b = readlinkSync(y);
    } catch {
      continue;
    }
    let S;
    try {
      S = realpathSync(y);
    } catch {
      S = followDanglingLink(y, b) ?? resolve_2(dirname_7(y), b);
      for (let w = 0; w < 8; w++) {
        let R;
        try {
          R = readlinkSync(S);
        } catch {
          break;
        }
        S = resolve_2(dirname_7(S), R);
      }
    }
    r.set(y, S);
  }
  if (r.size === 0) return;
  for (let y = denyLiteralSymlinkCandidates.length - 1; y >= 0; y--)
    if (r.has(denyLiteralSymlinkCandidates[y])) denyLiteralSymlinkCandidates.splice(y, 1);
  let s = {
      ...e,
      filesystem: { ...e.filesystem, denyWrite: uniq([...r.values(), ...e.filesystem.denyWrite]) },
    },
    h = getSandboxAdapterState();
  (h.builtConfigEnforcesAllowlist.set(s, h.installedFilterRequestEnforcesAllowlist), installSandboxConfig(s));
}
//@ chunk-fq0cr76a.js:1005584-1005671 placement
function Q$({ path: path, patternBeneath: patternBeneath }, r) {
  return !patternBeneath && /^(?:[a-z]:)?$/i.test(path) ? `${path}\\` : r;
}
//@ chunk-fq0cr76a.js:1005671-1005759 placement
function sw(e, n) {
  let r = n.get(e);
  if (r !== void 0) return r;
  let s = mue(e);
  return (n.set(e, s), s);
}
//@ chunk-fq0cr76a.js:1005759-1005822 placement
function mue(e) {
  if (iw(e) || linkChainIsUnsafeToFollow(e, getCwdState())) return null;
  return resolveExistingPrefix(e);
}
//@ chunk-fq0cr76a.js:1005822-1005858 placement
function isNetworkSpelledGrantRoot(e) {
  return hl(e) || isNetDir(e);
}
//@ chunk-fq0cr76a.js:1005858-1005899 placement
function iw(e) {
  return isOnForeignMount(e, getCwdState()) && !sV(e);
}
//@ chunk-fq0cr76a.js:1005899-1005953 placement
function eV(e) {
  return oD(Kot(e)).replace(/^~\\/, "~/");
}
/**
 * 判断一个路径是否是需要在沙箱内单独处理的网络路径（UNC/自动挂载）：综合主机名形式、是否本机名、受信写入者的授权、各自身位置与已审核位置的主机比较。
 */
//@ chunk-fq0cr76a.js:1005953-1007224 placement
function isUnsafeNetworkPath(path, context, vouched) {
  let vouchedGrants = context.trustsWriter ? context.grantsOfVouched : [],
    places = vouched ? context.placesOfVouched : context.ownPlaces;
  if (context.sharesReach && isWindowsDevicePath(path)) {
    let uncHost = uncHostOf(path),
      R = context.trustsWriter || uncHost?.endsWith(".") !== !0,
      D = uT(path),
      O = D || iM(path),
      L = cl(D ? path.slice(3) : path),
      V = uncHost === null && O && !NT_NAMESPACE_PREFIX_RE.test(path.slice(3)) && !L,
      K = O && L,
      [q, Z, ...J] = path.replace(/^[\\/]{2}/, "").split(/[\\/]+/),
      ie =
        !!q &&
        !!Z &&
        [q, Z].every((ue) => ue !== "." && ue !== "..") &&
        [Z, ...J].every((ue) => ue === "." || ue === ".." || !/[. ]$/.test(ue)),
      ae = 0;
    for (let ue of J)
      if (ue === "..") (ae--, (ie &&= ae >= 0));
      else if (ue !== "." && ue !== "") ae++;
    let replaced = hostname().replace(/[A-Z]/g, (ue) => ue.toLowerCase());
    return (
      !V &&
      !(R && sV(path)) &&
      !(
        R &&
        uncHost !== null &&
        !O &&
        (vouched || ie) &&
        (isLocalHostName(uncHost) ||
          isLocalInterfaceAddress(uncHost, context) ||
          isShortNameOfHost(uncHost, replaced, context))
      ) &&
      !(uncHost !== null && !D && !cl(path) && isShortNameOfHost(uncHost, replaced, context)) &&
      !(uncHost !== null && !K && G4.test(uncHost)) &&
      !(!K && vouchedGrants.some((ue) => hostPatternsMatch(uncHostOf(ue), uncHost, context))) &&
      places.every((ue) => {
        let me = uncHostOf(ue);
        return (
          isForeignNetworkPath(path, ue) &&
          (K ||
            (!hostPatternsMatch(uncHost, me, context) &&
              !(
                uncHost !== null &&
                me !== null &&
                (((vouched || ie) && W4(uncHost, me, context)) || isShortNameOfHost(uncHost, me, context))
              )))
        );
      })
    );
  }
  if (!isAutomountPath(path, context)) return !1;
  let autoHost = networkMountHost(path),
    b =
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
      ? !G4.test(autoHost) && !b
      : isMacSpecialPath(path) || count(path.split("/"), (w) => w !== "" && w !== ".") > 2) &&
    !vouchedGrants.some((w) => hostPatternsMatch(networkMountHost(w), autoHost, context)) &&
    places.every((w) => {
      let R = networkMountHost(w);
      return (
        isForeignMountPath(path, w) &&
        !hostPatternsMatch(autoHost, R, context) &&
        !(
          autoHost !== null &&
          R !== null &&
          ((vouched && W4(autoHost, R, context)) || isShortNameOfHost(autoHost, R, context))
        )
      );
    })
  );
}
//@ chunk-fq0cr76a.js:1007224-1007315 placement
function W4(e, n, r) {
  return e === n || (r.trustsWriter && e.replace(/\.$/, "") === n.replace(/\.$/, ""));
}
//@ chunk-fq0cr76a.js:1007315-1007524 placement
var NT_NAMESPACE_PREFIX_RE =
    /^[\\/](?:UNC|Mup|LanmanRedirector|GLOBALROOT|GLOBAL\?\?|Global|DosDevices|Device)(?:[\\/]|$)/i,
  NT_DEVICE_PREFIX_RE =
    /^[\\/](?:[a-z]:|Volume\{[0-9a-f-]+\}|HarddiskVolume\d+|PhysicalDrive\d+|CdRom\d+|pipe)(?:[\\/]|$)/i;
//@ chunk-fq0cr76a.js:1007524-1007613 placement
function tV(e) {
  return (getPlatform() === "linux" || getPlatform() === "wsl") && (e === "/proc" || e.startsWith("/proc/"));
}
//@ chunk-fq0cr76a.js:1007613-1007739 placement
function isAutomountPath(e, n) {
  return n.automounter === "macos"
    ? Ya(e) || tP(e) || isMacSpecialPath(e)
    : n.automounter === "linux" && networkMountRootCached(e)?.startsWith("/net/") === !0;
}
//@ chunk-fq0cr76a.js:1007739-1007756 placement
var G4 = /^[*?]+$/;
/**
 * 比较主机名模式与主机名是否匹配，考虑末尾点、短名与搜索域补全等变体。
 */
//@ chunk-fq0cr76a.js:1007756-1008347 placement
function hostPatternsMatch(hostPattern, host, context) {
  if (hostPattern === null || host === null || !Ad(hostPattern)) return !1;
  let patterns = [hostPattern],
    hosts = [host],
    domain = getLocalSearchDomain(context),
    trimmedHost = host.replace(/\.$/, ""),
    dotIndex = trimmedHost.indexOf(".");
  if (context.trustsWriter) (patterns.push(hostPattern.replace(/\.$/, "")), hosts.push(trimmedHost));
  let searchDomains =
    typeof domain !== "string"
      ? []
      : context.trustsWriter && context.searchDomains?.length
        ? context.searchDomains
        : [domain];
  if (dotIndex !== -1) {
    if (searchDomains.includes(trimmedHost.slice(dotIndex + 1))) hosts.push(trimmedHost.slice(0, dotIndex));
  } else if (trimmedHost === host)
    hosts.push(...searchDomains.flatMap((R) => [`${trimmedHost}.${R}`, `${trimmedHost}.${R}.`]));
  if (context.trustsWriter && (domain === null || context.automounter === "macos")) {
    if (dotIndex !== -1) hosts.push(trimmedHost.slice(0, dotIndex));
    else if (hostPattern.includes(".")) patterns.push(hostPattern.slice(0, hostPattern.indexOf(".")));
  }
  return patterns.some((R) => hosts.some((D) => matchesGuardedGlob(D, R, void 0, !0)));
}
//@ chunk-fq0cr76a.js:1008347-1008385 placement
var bue = /^\/proc\/\d+(?:\/|$)/,
  Sue = 40;
/**
 * 判断目录是否是 root 所有、当前用户不可写的固定目录（带缓存，逐级向上）。
 */
//@ chunk-fq0cr76a.js:1008385-1008723 placement
function isRootOwnedFixedFolder(e, n) {
  let r = n.fixedFolders.get(e);
  if (r !== void 0) return r;
  let s = tV(e),
    h = dirname_7(e),
    y = s || h === e || isRootOwnedFixedFolder(h, n);
  if (y && !s) {
    y = !1;
    let b = process.getuid?.();
    try {
      let { uid: uid, mode: mode } = statSync(e);
      try {
        accessSync(e, constants.W_OK);
      } catch (error) {
        let D = getErrnoCode(error);
        y =
          b !== void 0 &&
          b !== 0 &&
          uid === 0 &&
          (mode & 18) === 0 &&
          (D === "EACCES" || D === "EPERM" || D === "EROFS");
      }
    } catch {}
  }
  return (n.fixedFolders.set(e, y), y);
}
/**
 * 逐段展开路径（跟随符号链接，限跳数），找出第一个指向其他计算机（网络/自动挂载路径）的前缀；无法读取的段按信任规则判断；找不到返回 undefined。
 */
//@ chunk-fq0cr76a.js:1008723-1009676 placement
function findRemoteMountPrefix(path, context, vouched, strict) {
  let parts = path.split("/"),
    stack = [],
    hops = 0,
    automountDepth;
  for (let segment = parts.shift(); segment !== void 0; segment = parts.shift()) {
    if (segment === "" || segment === ".") continue;
    if (segment === "..") {
      if ((stack.pop(), automountDepth !== void 0 && stack.length <= automountDepth)) automountDepth = void 0;
      continue;
    }
    let parentPath = `/${stack.join("/")}`,
      candidate = stack.length === 0 ? `/${segment}` : `${parentPath}/${segment}`;
    if (isUnsafeNetworkPath(candidate, context, vouched)) return candidate;
    if (isAutomountPath(candidate, context)) {
      if (networkMountHost(parentPath) !== null || isMacSpecialPath(candidate))
        automountDepth ??= stack.length;
      stack.push(segment);
      continue;
    }
    if (
      automountDepth !== void 0 ||
      (strict &&
        (context.automounter === "macos"
          ? !["/", "/volumes"].includes(foldCase(isSystemVolumePath(parentPath))) &&
            !Eue.includes(foldCase(candidate))
          : context.automountPoints.includes(parentPath) &&
            !context.ownPlaces.some((ownPlace) => `${ownPlace}/`.startsWith(`${candidate}/`)))) ||
      (context.automounter === "macos" &&
        foldCase(isSystemVolumePath(dirname_7(parentPath))) === "/volumes") ||
      (strict && !(isRootOwnedFixedFolder(parentPath, context) || tV(candidate)))
    ) {
      ((automountDepth ??= stack.length), stack.push(segment));
      continue;
    }
    if (!context.linkTexts.has(candidate)) {
      let L;
      try {
        L = readlinkSync(candidate);
      } catch (error) {
        if (getErrnoCode(error) !== "EINVAL") {
          let joined = [candidate, ...parts].join("/");
          return (!context.trustsWriter && bue.test(candidate)) ||
            (hops > 0 && isUnsafeNetworkPath(joined, context, vouched))
            ? joined
            : void 0;
        }
      }
      context.linkTexts.set(candidate, L);
    }
    let linkText = context.linkTexts.get(candidate);
    if (linkText === void 0) {
      stack.push(segment);
      continue;
    }
    if (++hops > Sue) return;
    if (linkText.startsWith("/")) stack.length = 0;
    parts.unshift(...linkText.split("/"));
  }
  return;
}
//@ chunk-fq0cr76a.js:1009676-1009758 placement
var Eue = ["/system/volumes", "/system/volumes/data", "/system/volumes/data/volumes"];
//@ chunk-fq0cr76a.js:1009758-1009843 placement
function resolveSandboxFilesystemPath_2(e) {
  return e === "~" || e.startsWith("~/")
    ? homedir_3() + e.slice(1)
    : isAbsolute_2(e)
      ? e
      : resolve_2(safeProcessCwd(), e);
}
/**
 * 判断某个来源的沙箱路径条目是否指向另一台计算机而应丢弃（否则每条命令前沙箱都会去访问那台机器）：首次调用时准备自动挂载与已授权位置信息；丢弃时每条只警告一次。
 */
//@ chunk-fq0cr76a.js:1009843-1011332 placement
function shouldDropRemoteHostEntry(entryKind, entryPath, source, context, isManagedOnly) {
  try {
    let isTrustedSource = isTrustedTierSource(source),
      trustsWriter =
        isTrustedSource && !(source === "policySettings" && entryKind !== "credential file" && isManagedOnly);
    if (trustsWriter && (entryKind === "write deny" || entryKind === `${FILE_EDIT_TOOL_NAME} rule`))
      return !1;
    if (context.prepared === "no") {
      context.prepared = "failed";
      let L = getPlatform() === "macos";
      if (!context.sharesReach && (L ? readAutoMaster() : readAutofsMounts())) {
        if (((context.automounter = L ? "macos" : "linux"), !L)) {
          let V = readAutofsMountPoints();
          if (V === void 0) return !1;
          context.automountPoints = V;
        }
      }
      if (context.sharesReach || context.automounter !== "none") {
        for (let V of [...context.ownPlaces])
          try {
            context.ownPlaces.push(realpathSync.native(V));
          } catch {}
        if (!context.sharesReach)
          for (let V of [...context.grantedPlaces]) {
            let K = findRemoteMountPrefix(resolveSandboxFilesystemPath_2(V), context, !1, !1);
            if (K !== void 0) context.grantedPlaces.push(K);
          }
        (context.ownPlaces.push(...context.grantedPlaces),
          (context.placesOfVouched = [...context.ownPlaces, ...context.repositoryGrantedPlaces]),
          (context.grantsOfVouched = [...context.grantedPlaces, ...context.repositoryGrantedPlaces]));
      }
      context.prepared = "yes";
    }
    if (context.prepared === "failed" || (!context.sharesReach && context.automounter === "none")) return !1;
    let normalized = context.sharesReach ? eV(entryPath) : entryPath,
      candidates = (context.sharesReach ? Jxe(normalized) : Ad(normalized))
        ? [getGlobBaseDirectory_2(normalized), ...nameReadingsOfGlobSpelling(normalized).map((L) => L.name)]
        : [normalized],
      mapped = uniq(
        candidates.flatMap((L) => (context.sharesReach ? [L] : [L.replaceAll("\\", "/"), L])),
      ).map(resolveSandboxFilesystemPath_2);
    if (
      ((context.trustsWriter = trustsWriter),
      !(
        context.sharesReach &&
        !context.trustsWriter &&
        mapped.some((L) => (uT(L) || iM(L)) && !NT_DEVICE_PREFIX_RE.test(L.slice(3)))
      ) &&
        !mapped.some((L) => isUnsafeNetworkPath(L, context, isTrustedSource)) &&
        (context.sharesReach ||
          !mapped.some((L) => findRemoteMountPrefix(L, context, isTrustedSource, !0) !== void 0)))
    )
      return !1;
    let dropKey = `${entryKind} ${jsonStringify(entryPath)} from ${source}`;
    if (!context.dropped.has(dropKey)) {
      if ((context.dropped.add(dropKey), !context.saidBefore.has(dropKey)))
        logForDebugging(
          `[sandbox] dropped the ${dropKey}: it names another computer, and the sandbox would call out to that computer before each command`,
          { level: "warn" },
        );
    }
    return !0;
  } catch (error) {
    return (reportSandboxErrorUnderStandIn(error, "denyEntryHostNotJudged"), !1);
  }
}
//@ chunk-fq0cr76a.js:1011332-1011391 placement
function xue() {
  return [...getSandboxAdapterState().deniesDroppedForAnotherHost];
}
//@ chunk-fq0cr76a.js:1011391-1011430 placement
function _ue(e) {
  return _v.subscribe(e);
}
//@ chunk-fq0cr76a.js:1011430-1011523 placement
function sV(e) {
  if (isWslUncPath(e)) return !0;
  if (uT(e) || cl(e)) return !1;
  let n = uncHostOf(e);
  return n !== null && isLocalHostName(n);
}
//@ chunk-fq0cr76a.js:1011523-1011654 placement
function isLocalHostName(e) {
  let replaced = e.replace(/\.$/, "");
  return (
    pw(replaced) ||
    replaced === "--1.ipv6-literal.net" ||
    replaced === hostname().replace(/[A-Z]/g, (r) => r.toLowerCase())
  );
}
//@ chunk-fq0cr76a.js:1011654-1011681 placement
var j4 = ".ipv6-literal.net";
//@ chunk-fq0cr76a.js:1011681-1011841 placement
function isLocalInterfaceAddress(e, n) {
  let r = e.endsWith(j4) ? e.slice(0, -j4.length).replaceAll("-", ":") : null;
  return (
    n.trustsWriter &&
    (r === null ? isIP_5(e) !== 0 : isIP_5(r) === 6) &&
    (getLocalInterfaceAddresses()?.has(e) ?? !0)
  );
}
/**
 * 判断一个主机名是另一个的短名（短名加本机搜索域等于全名）。
 */
//@ chunk-fq0cr76a.js:1011841-1012144 placement
function isShortNameOfHost(e, n, r) {
  let [s, h] = e.includes(".") ? [n, e.replace(/\.$/, "")] : [e, n.replace(/\.$/, "")];
  if (s.includes(".") || !h.startsWith(`${s}.`)) return !1;
  let y = getLocalSearchDomain(r);
  return (
    (typeof y === "string" && h === `${s}.${y}`) ||
    (r.trustsWriter &&
      (y === null || r.automounter === "macos" || (r.searchDomains ?? []).some((b) => h === `${s}.${b}`)))
  );
}
//@ chunk-fq0cr76a.js:1012144-1012405 placement
function getLocalSearchDomain(e) {
  if (e.sharesReach) return null;
  if (e.searchDomains === void 0) e.searchDomains = readResolvSearchDomains() ?? null;
  if (e.searchDomains === null) return null;
  let replaced = hostname().replace(/[A-Z]/g, (s) => s.toLowerCase()),
    index = replaced.indexOf(".");
  return e.searchDomains[0] ?? (index === -1 ? void 0 : replaced.slice(index + 1));
}
//@ chunk-fq0cr76a.js:1012405-1012579 placement
function isGrantCoveredByPattern(e, { path: path, patternBeneath: patternBeneath }, s) {
  let h = getPlatform(),
    y = h === "windows";
  return (
    !isPathPrefixOf(
      y ? path.replaceAll("\\", "/") : path,
      y ? s.replaceAll("\\", "/") : s,
      y || h === "macos",
    ) && (patternBeneath ? anyGlobPathCovers(e, [s]) : EV(e, [s]))
  );
}
//@ chunk-fq0cr76a.js:1012579-1012609 placement
var TENGU_CURRIED_WILLOW = "tengu_curried_willow";
/**
 * 复查配置构建后被重新链接的 allowRead/allowWrite 授权：若现在指向家目录、配置目录或读禁止区，就从运行中配置撤下并上报 tengu_sandbox_late_symlink_grant_dropped，下次构建再审。
 */
//@ chunk-fq0cr76a.js:1012609-1014423 placement
function rescreenLateSymlinkGrants() {
  let e = getSandboxAdapterState(),
    {
      lateSymlinkGrantCandidates: lateSymlinkGrantCandidates,
      lateSymlinkGrantDenyRoots: lateSymlinkGrantDenyRoots,
      lateSymlinkGrantProfile: lateSymlinkGrantProfile,
    } = e;
  if (lateSymlinkGrantCandidates.length === 0) return;
  let h = assertMarkedPathsResolved(on.getConfig());
  if (!h) return;
  let y =
      lateSymlinkGrantProfile !== void 0 && readFlagWithOverride(TENGU_CURRIED_WILLOW, { safe: !0 })
        ? lateSymlinkGrantProfile
        : void 0,
    b = { allowRead: new Set(), allowWrite: new Set() },
    S = new Map();
  for (let R = lateSymlinkGrantCandidates.length - 1; R >= 0; R--) {
    let { literal: literal, list: list, roots: roots } = lateSymlinkGrantCandidates[R],
      V;
    for (let K of roots) {
      let q = sw(K.path, S);
      if (q === null) V = "it no longer resolves safely";
      else if (y !== void 0 && isUnderGitHome(Q$(K, q.path), y))
        V = K.nameReading
          ? `the sandbox may also read ${K.path} as a folder name, and that folder now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given`
          : K.patternBeneath
            ? `the folder that it is confined to (${K.path}) now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given`
            : "it now leads to the home folder, a folder above the home folder, or a Claude Code config folder, which the Windows sandbox is not given";
      else if (isGrantCoveredByPattern(lateSymlinkGrantDenyRoots, K, q.path))
        V = K.patternBeneath
          ? "a directory in its spelling now resolves outside that spelling to one that holds or lies inside a denied read path"
          : "it now resolves into a denied read path outside its own spelling";
      if (V !== void 0) break;
    }
    if (V === void 0) continue;
    (lateSymlinkGrantCandidates.splice(R, 1),
      b[list].add(literal),
      logForDebugging(
        `[Sandbox] dropped ${list} ${literal}: ${V} (re-linked after the config build); withheld until the next config build re-screens it`,
      ),
      logEvent("tengu_sandbox_late_symlink_grant_dropped", { list: fromEnum(list) }));
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
  (e.builtConfigEnforcesAllowlist.set(w, e.installedFilterRequestEnforcesAllowlist), installSandboxConfig(w));
}
/**
 * 检测 cwd 是否是 git worktree：读 .git 文件中的 gitdir，校验其位于 <主仓库>.git/worktrees/ 下且反向链接一致，返回主仓库 .git 目录供沙箱放行写入；任何异常返回 null。
 */
//@ chunk-fq0cr76a.js:1014423-1014945 placement
function detectWorktreeGitCommonDir(e) {
  let n = join_9(e, ".git");
  try {
    if (pointerFileIsSuspect(n, e)) return null;
    let match = readFileSync_2(n, { encoding: "utf8" }).match(/^gitdir:\s*(.+)$/m);
    if (!match?.[1]) return null;
    let trimmed = match[1].trim();
    if (isOnForeignMount(trimmed, e)) return null;
    if (rawPointerPathIsUnsafe(trimmed, e)) return null;
    let y = resolve_2(e, trimmed),
      b = dirname_7(y);
    if (basename_2(b) !== "worktrees") return null;
    let S = dirname_7(b);
    if (!basename_2(S).endsWith(".git")) return null;
    if (pointerFileIsSuspect(join_9(y, "gitdir"), y)) return null;
    let trimmed_2 = readFileSync_2(join_9(y, "gitdir"), { encoding: "utf8" }).trim();
    if (isOnForeignMount(trimmed_2, e)) return null;
    if (rawPointerPathIsUnsafe(trimmed_2, y, e)) return null;
    if (realpathSync(resolve_2(y, trimmed_2)) !== join_9(realpathSync(e), ".git")) return null;
    return S;
  } catch {
    return null;
  }
}
/**
 * 门面 checkDependencies：Windows 未启用、diskless 直接报错；否则取缓存的依赖探测结果（bubblewrap/socat/ripgrep、macOS sandbox-exec、Windows srt-win 等）。
 */
//@ chunk-fq0cr76a.js:1014945-1015221 placement
function checkSandboxDependencies() {
  if (getPlatform() === "windows" && !isWindowsSandboxEnabled())
    return { errors: ["Windows sandbox is not enabled"], warnings: [] };
  if (isDiskless()) return { errors: ["The sandbox is unavailable in this session"], warnings: [] };
  let { checkDependenciesProbe: checkDependenciesProbe } = getSandboxAdapterState(),
    n = checkDependenciesProbe();
  if (n.errors.includes(lV)) checkDependenciesProbe.cache.clear?.();
  return n;
}
//@ chunk-fq0cr76a.js:1015221-1015289 placement
function vue() {
  return getSandboxAdapterState().checkDependenciesProbe.cache.get(void 0);
}
/**
 * 检查沙箱依赖：Windows 原生沙箱启用且未缓存时异步探测 ripgrep 等依赖（必要时先用设置补装沙箱运行时配置），结果按探测代次写入缓存；其他情况走同步检查。
 */
//@ chunk-fq0cr76a.js:1015289-1015643 placement
async function checkSandboxDependenciesAsync() {
  let e = getSandboxAdapterState();
  if (
    isDiskless() ||
    getPlatform() !== "windows" ||
    !isWindowsSandboxEnabled() ||
    e.checkDependenciesProbe.cache.has(void 0)
  )
    return checkSandboxDependencies();
  let n = ensureSandboxRuntimeSeeded();
  if (n) return n;
  let dependencyProbeGeneration = e.dependencyProbeGeneration,
    { rgPath: rgPath, rgArgs: rgArgs } = ripgrepCommand(),
    checkDependenciesAsync = await on.checkDependenciesAsync({ command: rgPath, args: rgArgs }),
    b = cV(checkDependenciesAsync);
  if (dependencyProbeGeneration === e.dependencyProbeGeneration)
    e.checkDependenciesProbe.cache.set(void 0, b);
  return b;
}
//@ chunk-fq0cr76a.js:1015643-1015686 placement
var lV = "sandbox configuration unavailable";
//@ chunk-fq0cr76a.js:1015686-1015782 placement
function cV(e) {
  return {
    ...e,
    errors: e.errors.map((error) => describeWindowsSandboxRemedy(error)),
    warnings: e.warnings.map((warning) => describeWindowsSandboxRemedy(warning)),
  };
}
/**
 * 沙箱运行时未初始化时用当前设置（失败则默认设置）补装配置；Windows 下构建失败返回依赖错误。
 */
//@ chunk-fq0cr76a.js:1015782-1016125 placement
function ensureSandboxRuntimeSeeded() {
  if (getSandboxAdapterState().runtimeInitialized && on.getConfig() !== void 0) return;
  try {
    installSandboxConfig(convertToSandboxRuntimeConfig(getSettings_DEPRECATED() ?? {}));
  } catch (error) {
    logForDebugging(`checkDependencies: settings unavailable, re-seeding SRT config from defaults: ${error}`);
    try {
      installSandboxConfig(convertToSandboxRuntimeConfig({}));
    } catch (error) {
      if (
        (logForDebugging(`checkDependencies: SRT config build failed, skipping seed: ${error}`),
        getPlatform() === "windows")
      )
        return { errors: [lV], warnings: [] };
    }
  }
  return;
}
/**
 * 检查沙箱依赖（ripgrep 路径交给 sandbox-runtime 的 checkDependencies），Linux/WSL 在运行时未初始化时额外试跑一次 bubblewrap。
 */
//@ chunk-fq0cr76a.js:1016125-1016391 fingerprint = checkDependencies (0.632)
function checkDependencies() {
  let e = ensureSandboxRuntimeSeeded();
  if (e) return e;
  let { rgPath: rgPath, rgArgs: rgArgs } = ripgrepCommand(),
    checkDependencies = on.checkDependencies({ command: rgPath, args: rgArgs }),
    h = cV(checkDependencies),
    y = getPlatform();
  if (
    (y === "linux" || y === "wsl") &&
    h.errors.length === 0 &&
    !getSandboxAdapterState().runtimeInitialized
  ) {
    let b = checkAppArmorUserNamespaces(A4(NPn));
    if (b !== void 0) return { ...h, errors: [b] };
  }
  return h;
}
/**
 * 是否被强制开启沙箱：管理员强制下用户设置 enabled=true，或 GrowthBook disableNoSandbox 且当前不在 scrub/IS_SANDBOX/bubblewrap 环境里。
 */
//@ chunk-fq0cr76a.js:1016391-1016520 placement
function shouldForceSandboxOn() {
  if (isUserSandboxEnableMandated()) return !0;
  if (!getSandboxGbConfig().disableNoSandbox) return !1;
  return !isScrubEnabled() && !isEnvTruthy(env.IS_SANDBOX) && !envDynamicProbe.getIsBubblewrapSandbox();
}
/**
 * 沙箱是否在设置里开启（含强制开启）；读设置失败记日志返回 false。
 */
//@ chunk-fq0cr76a.js:1016520-1016662 fingerprint = getSandboxEnabledSetting (1)
function getSandboxEnabledSetting() {
  try {
    if (shouldForceSandboxOn()) return !0;
    return getSettings_DEPRECATED()?.sandbox?.enabled ?? !1;
  } catch (error) {
    return (logForDebugging(`Failed to get settings for sandbox check: ${error}`), !1);
  }
}
/**
 * CLAUDE_CODE_SUBPROCESS_ENV_SCRUB 打开、scrub 沙箱可用、且用户没开沙箱时，强制用 scrub 沙箱。
 */
//@ chunk-fq0cr76a.js:1016662-1016702 placement
function isScrubOnlySandboxMode() {
  return isScrubEnabled() && isScrubSandboxAvailable() && !getSandboxEnabledSetting();
}
//@ chunk-fq0cr76a.js:1016702-1016745 placement
function isAutoAllowSupported() {
  return !isScrubEnabled() && getPlatform() !== "windows";
}
/**
 * sandbox.autoAllowBashIfSandboxed（默认 true）；scrub 模式或 Windows 下不支持。
 */
//@ chunk-fq0cr76a.js:1016745-1016829 fingerprint = isAutoAllowBashIfSandboxedEnabled (1)
function isAutoAllowBashIfSandboxedEnabled() {
  if (!isAutoAllowSupported()) return !1;
  return getSettings_DEPRECATED()?.sandbox?.autoAllowBashIfSandboxed ?? !0;
}
/**
 * 是否禁止沙箱外执行：GrowthBook forbidUnsandboxedCommands、可信层 allowUnsandboxedCommands=false 或合并设置 allowUnsandboxedCommands===false。
 */
//@ chunk-fq0cr76a.js:1016829-1016944 fingerprint = areUnsandboxedCommandsAllowed (0.749)
function isStrictSandboxModeConfigured() {
  if (getSandboxGbConfig().forbidUnsandboxedCommands) return !0;
  return (
    isUnsandboxedFallbackClosedByTrustedTier() ||
    getSettings_DEPRECATED()?.sandbox?.allowUnsandboxedCommands === !1
  );
}
/**
 * 管理员沙箱强制：GB 禁止沙箱外命令、托管设置 allowManagedDomainsOnly、托管层 allowUnsandboxedCommands=false 或 --settings/flagSettings 的 allowUnsandboxedCommands=false。强制下 project/local 的放宽项一律忽略。
 */
//@ chunk-fq0cr76a.js:1016944-1017141 layout
function isAdminSandboxMandate() {
  if (isUnsandboxedForbiddenByGb() || shouldAllowManagedSandboxDomainsOnly()) return !0;
  if (readPolicySandboxSetting(["allowUnsandboxedCommands"]) === !1) return !0;
  return (
    (getPolicySettingsIfEnabled()?.sandbox?.allowUnsandboxedCommands ??
      getSettingsForSource("flagSettings")?.sandbox?.allowUnsandboxedCommands) === !1
  );
}
/**
 * userSettings 打开了沙箱且该项未被更高层覆盖、同时管理员强制沙箱时为真；此时 getSandboxEnabledSetting 直接视为开启。
 */
//@ chunk-fq0cr76a.js:1017141-1017246 layout
function isUserSandboxEnableMandated() {
  return (
    !pV("enabled") &&
    isSettingSourceEnabled("userSettings") &&
    getSettingsForSource("userSettings")?.sandbox?.enabled === !0 &&
    isAdminSandboxMandate()
  );
}
//@ chunk-fq0cr76a.js:1017246-1017371 layout
function isUserFailIfUnavailableUnderMandate() {
  return (
    !pV("failIfUnavailable") &&
    isSettingSourceEnabled("userSettings") &&
    getSettingsForSource("userSettings")?.sandbox?.failIfUnavailable === !0 &&
    isAdminSandboxMandate()
  );
}
//@ chunk-fq0cr76a.js:1017371-1017454 layout = _temp9 (0.769)
function pV(a_4) {
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (n) => n?.sandbox?.[a_4] !== void 0,
  );
}
/**
 * 可信层（托管/--settings）有网络限制：管理员强制、strictAllowlist、deniedDomains 或 WebFetch(domain:) 的 deny 规则。
 */
//@ chunk-fq0cr76a.js:1017454-1017705 callgraph-fingerprint = convertToSandboxRuntimeConfig (0.269)
function hasTrustedNetworkRestrictions() {
  if (isAdminSandboxMandate() || isStrictNetworkAllowlistConfigured()) return !0;
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (source) =>
      (source?.sandbox?.network?.deniedDomains?.length ?? 0) > 0 ||
      (source?.permissions?.deny ?? []).some((n) => {
        let sourceSettings = parseRuleForSandbox(n);
        return (
          sourceSettings.toolName === WEBFETCH && sourceSettings.ruleContent?.startsWith("domain:") === !0
        );
      }),
  );
}
/**
 * 可信层（policy、--settings）是否配置了读禁止：sandbox.filesystem.denyRead、credentials.files 或带内容的 Read(...) deny 规则。决定是否需要解析读禁止根。
 */
//@ chunk-fq0cr76a.js:1017705-1017958 layout
function hasTrustedReadDenies() {
  return [getPolicySettingsIfEnabled(), getSettingsForSource("flagSettings")].some(
    (e) =>
      (e?.sandbox?.filesystem?.denyRead?.length ?? 0) > 0 ||
      (e?.sandbox?.credentials?.files?.length ?? 0) > 0 ||
      (e?.permissions?.deny ?? []).some((n) => {
        let r = parseRuleForSandbox(n);
        return r.toolName === FILE_READ_TOOL_NAME && r.ruleContent !== void 0;
      }),
  );
}
/**
 * 收集非 project/local 层的读禁止根：sandbox.credentials.files、Read(...) deny 规则、sandbox.filesystem.denyRead，解析为规范路径。
 */
//@ chunk-fq0cr76a.js:1017958-1018308 layout
function getTrustedReadDenyRoots() {
  let e = [];
  for (let n of SETTING_SOURCES) {
    if (n === "projectSettings" || n === "localSettings") continue;
    let r = getSettingsForSourceTightenOnly(n);
    if (
      (e.push(
        ...resolveSandboxPathPatterns(
          r?.sandbox?.credentials?.files?.map((s) => s.path),
          n,
          "deny",
        ),
      ),
      !isSettingSourceEnabled(n))
    )
      continue;
    e.push(
      ...resolvePathEntries(
        groupRuleContentsByTool(r?.permissions?.deny, [FILE_READ_TOOL_NAME]).get(FILE_READ_TOOL_NAME),
        n,
        "deny",
        resolvePathPatternForSandbox,
      ),
      ...resolveSandboxPathPatterns(r?.sandbox?.filesystem?.denyRead, n, "deny"),
    );
  }
  return uniq(e.flatMap((n) => canonicalizeSandboxPath(n) ?? []));
}
/**
 * 解析读禁止根：以 (cwd, 条目) 为键缓存一个 tick 内的解析结果，返回内置可信禁止根加上每个条目的各种拼写（原样与经 realpath 的规范路径）。
 */
//@ chunk-fq0cr76a.js:1018308-1018513 layout
function resolveTrustedReadDenyRoots(e) {
  let n = jsonStringify([getCwdState(), e]),
    trustedReadDenyRootResolution = getSandboxAdapterState().trustedReadDenyRootResolution;
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
  let n = getSandboxAdapterState();
  return (
    (n.trustedReadDenyRootResolution = e),
    queueMicrotask(() => {
      n.trustedReadDenyRootResolution = void 0;
    }),
    e
  );
}
//@ chunk-fq0cr76a.js:1018643-1018669 layout
var READ_DENY_LOOK_BUDGET_MS = 15,
  READ_DENY_LOOK_MIN_ENTRIES = 16,
  READ_DENY_LOOK_THROTTLE_MS = 250;
/**
 * 把凭据遮罩的 glob 展开成具体路径（{lexical, canonical}）；位于禁区、或通配符不在最后一段、或叶子是裸 ** 时不展开只按字面参与，避免 readdir 被引导穿过未审查目录。
 */
//@ chunk-fq0cr76a.js:1018669-1019098 layout
function expandMaskGlob(e) {
  if (isOnForeignMount(e, getCwdState()) || rawPointerPathIsUnsafe(e, getCwdState())) return [];
  let parts = e.split("/"),
    r = parts.length - 1;
  if (parts.some((s, h) => h !== r && Ad(s)) || parts[r] === "**")
    return (
      logForDebugging(
        `[sandbox] glob pattern '${e}' not expanded for the mask sweep: wildcards outside the final path component (or a bare '**' leaf) could steer the readdir walk through unvetted directories \u2014 the pattern participates lexically only`,
      ),
      []
    );
  return usr(e).map((s) => ({ lexical: s, canonical: canonicalizePathForMaskSweep(s) }));
}
/**
 * 把路径做大小写折叠并规整成以 / 开头、无空段的绝对形式，用于大小写不敏感比较。
 */
//@ chunk-fq0cr76a.js:1019098-1019166 layout
function toFoldedAbsolutePath(e) {
  return "/" + foldPathCase(e).split("/").filter(Boolean).join("/");
}
//@ chunk-fq0cr76a.js:1019166-1019881 layout
function getReadDenyReach() {
  let e = getSandboxAdapterState(),
    n = assertMarkedPathsResolved(on.getConfig());
  if (n === void 0 || isWrapUnconfined(n))
    return { withinReach: () => !1, bounded: !1, complete: !1, writeRootCount: 0 };
  let r = !e.undecidableWrapThisSession && !wt(),
    s = [...e.wrapBindableWriteRootsThisSession, ...e.wrapOutOfTreeTargetsThisSession],
    h;
  return {
    withinReach: (b) => {
      let S = b.lookAgain?.stoppedAt?.path,
        joined = [...b.spellings, S ?? ""].join("\x00"),
        R = e.readDenyRootWithinSandboxReach.get(joined);
      if (R !== void 0 && R.writeRoots === s.length) return R.reachable;
      h ??= s.map(toFoldedAbsolutePath);
      let D = h,
        any = [
          ...b.spellings.map((spelling) => (Ad(spelling) ? getGlobBaseDirectory_2(spelling) : spelling)),
          ...(S === void 0 ? [] : [S]),
        ]
          .map(toFoldedAbsolutePath)
          .some((L) => D.some((V) => posixCovers(V, L)));
      return (e.readDenyRootWithinSandboxReach.set(joined, { writeRoots: s.length, reachable: any }), any);
    },
    bounded: !0,
    complete: r,
    writeRootCount: s.length,
  };
}
//@ chunk-fq0cr76a.js:1019881-1020095 layout
function createReadDenyLookSelector(e, n) {
  let r = getSandboxAdapterState(),
    readDenyRootLookCursor = r.readDenyRootLookCursor,
    h = 0,
    y;
  return {
    select: (b, S) => {
      if (S >= readDenyRootLookCursor && y === void 0) {
        if (h < READ_DENY_LOOK_MIN_ENTRIES || performance.now() - e < READ_DENY_LOOK_BUDGET_MS)
          return (h++, !0);
        y = S;
      }
      return n(b);
    },
    finish: () => {
      r.readDenyRootLookCursor = y ?? 0;
    },
  };
}
//@ chunk-fq0cr76a.js:1020095-1020255 layout
function markLookAgainEntries(e, n, r) {
  return n.map((s, h) => {
    if (s.lookAgain !== void 0 || e[h]?.lookAgain === void 0) return s;
    return r(s) ? { ...s, lookAgain: yV } : { ...s, settledUnwatched: !0 };
  });
}
//@ chunk-fq0cr76a.js:1020255-1020314 layout
var yV = { stoppedAt: void 0, throughLink: !1, settledInReach: !0 };
//@ chunk-fq0cr76a.js:1020314-1020421 layout
function rewatchSettledEntries(e, n) {
  return e.map((r) => (r.settledUnwatched && n(r) ? { ...r, settledUnwatched: void 0, lookAgain: yV } : r));
}
/**
 * 解析一个读禁止条目的根：glob 取基目录，经 canonicalizePathForMaskSweep 求规范路径，返回 {root, spellings:[原样, 规范], lookAgain}；路径未稳定或经过符号链接时 lookAgain 记录停在何处，供运行中复查。
 */
//@ chunk-fq0cr76a.js:1020421-1020730 layout
function resolveReadDenyRoot(e, n) {
  let r = Ad(e) ? getGlobBaseDirectory_2(e) : e;
  if (!e.startsWith(r)) return { root: e, spellings: [e], lookAgain: void 0 };
  let s = { settled: !1, stoppedAt: void 0, throughLink: !1 },
    h = canonicalizePathForMaskSweep(r, s, n);
  return {
    root: e,
    spellings: [e, h + e.slice(r.length)],
    lookAgain: s.settled && !s.throughLink ? void 0 : { stoppedAt: s.stoppedAt, throughLink: s.throughLink },
  };
}
/**
 * 与 resolveReadDenyRoot 相同但用于非 glob 的凭据遮罩路径：返回原样与规范两种拼写及是否需要复查。
 */
//@ chunk-fq0cr76a.js:1020730-1020935 layout
function resolveMaskPath(e, n) {
  let r = { settled: !1, stoppedAt: void 0, throughLink: !1 },
    s = canonicalizePathForMaskSweep(e, r, n);
  return {
    root: e,
    spellings: [e, s],
    lookAgain: r.settled && !r.throughLink ? void 0 : { stoppedAt: r.stoppedAt, throughLink: r.throughLink },
  };
}
//@ chunk-fq0cr76a.js:1020935-1022055 layout
function relookReadDenyRoots(e, n = !0, r = createWalkMemo(), s = resolveReadDenyRoot, h = () => !0) {
  let y = getCwdState(),
    b = 0,
    S = 0,
    w = [],
    R = [],
    D = new Set(),
    mapped = e.resolved.map((L, V) => {
      let lookAgain = L.lookAgain;
      if (lookAgain === void 0 || !h(L, V)) return L;
      if ((b++, lookAgain.settledInReach)) {
        let Z = Ad(L.root) ? getGlobBaseDirectory_2(L.root) : L.root;
        if (!isOnForeignMount(Z, y)) {
          let J = rawPointerPathWalk(Z, y, r);
          if (!J.unsafe && !J.throughLink && J.stoppedAt === void 0) return L;
        }
      } else if (
        !lookAgain.throughLink &&
        lookAgain.stoppedAt !== void 0 &&
        !isOnForeignMount(lookAgain.stoppedAt.path, y)
      ) {
        let Z = rawPointerPathWalk(lookAgain.stoppedAt.path, y, r);
        if (
          !Z.throughLink &&
          Z.stoppedAt?.path === lookAgain.stoppedAt.path &&
          Z.stoppedAt.kind === lookAgain.stoppedAt.kind
        )
          return L;
        D.add(lookAgain.stoppedAt.path);
      }
      let q = s(L.root, r);
      if (
        lookAgain.stoppedAt !== void 0 &&
        (q.lookAgain?.stoppedAt?.path !== lookAgain.stoppedAt.path ||
          q.lookAgain?.stoppedAt?.kind !== lookAgain.stoppedAt.kind)
      )
        D.add(lookAgain.stoppedAt.path);
      if (
        q.spellings[1] !== L.spellings[1] ||
        q.lookAgain?.stoppedAt?.path !== lookAgain.stoppedAt?.path ||
        q.lookAgain?.stoppedAt?.kind !== lookAgain.stoppedAt?.kind ||
        (q.lookAgain?.throughLink ?? !1) !== lookAgain.throughLink
      )
        if ((S++, L.isMask)) R.push(L.root);
        else w.push(...L.spellings, ...q.spellings);
      return L.isMask ? { ...q, isMask: !0 } : q;
    });
  if (S > 0 && n) setTrustedReadDenyResolutionForTick({ key: e.key, resolved: mapped });
  return { lookedAt: b, moved: S, resolved: mapped, movedSpellings: w, movedMaskPaths: R, changedStops: D };
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
/**
 * 每次沙箱包装前（节流 250ms）重新检查当初未解析或经符号链接拼写的可信读禁止/凭据遮罩路径。
 */
//@ chunk-fq0cr76a.js:1022327-1022831 layout
function recheckReadDenyRoots() {
  let e = getSandboxAdapterState();
  applyPendingReadDenyFallback();
  let readDenyRootFirstLookDue = e.readDenyRootFirstLookDue;
  e.readDenyRootFirstLookDue = !1;
  let installedReadDenyRootResolution = e.installedReadDenyRootResolution;
  if (installedReadDenyRootResolution === void 0) return;
  let startTime = performance.now(),
    h =
      e.readDenyRootLookFinishedAt !== void 0 &&
      startTime - e.readDenyRootLookFinishedAt < READ_DENY_LOOK_THROTTLE_MS,
    y =
      installedReadDenyRootResolution.forwardedUntrustedGrants.length === 0 &&
      e.lateSymlinkGrantCandidates.length === 0 &&
      !(on.getConfig()?.credentials?.files ?? []).some((b) => b.mode === "mask" && !isSentinelOnlyMask(b));
  if (!readDenyRootFirstLookDue && (h || y)) return;
  try {
    runReadDenyLook(installedReadDenyRootResolution, readDenyRootFirstLookDue);
  } finally {
    e.readDenyRootLookFinishedAt = performance.now();
  }
}
/**
 * 执行一次读禁止根复查：有路径改变落点时，首次则重建配置；会话中途则收窄运行中配置（丢弃落入禁止区的仓库授权、把受影响的凭据遮罩降为占位符），失败时记 pendingReadDenyFallback。
 */
//@ chunk-fq0cr76a.js:1022831-1026260 layout
function runReadDenyLook(e, n) {
  let r = getSandboxAdapterState(),
    s,
    h,
    y = [],
    b = [],
    S = !1;
  try {
    let R = createWalkMemo(),
      {
        withinReach: withinReach,
        bounded: bounded,
        complete: complete,
        writeRootCount: writeRootCount,
      } = getReadDenyReach(),
      K = bounded && complete,
      q = K ? withinReach : () => !0;
    if (!K || writeRootCount > r.readDenyRootReachSeenAtLook)
      e = {
        resolution: e.resolution && {
          key: e.resolution.key,
          resolved: rewatchSettledEntries(e.resolution.resolved, q),
        },
        forwardedUntrustedGrants: e.forwardedUntrustedGrants,
        maskSweepEntries: rewatchSettledEntries(e.maskSweepEntries, q),
        trustedDenyRoots: e.trustedDenyRoots,
      };
    let Z = n ? void 0 : createReadDenyLookSelector(performance.now(), withinReach),
      J = Z?.select ?? (() => !0),
      ie = e.resolution ? relookReadDenyRoots(e.resolution, n, R, resolveReadDenyRoot, J) : void 0,
      ae = e.resolution?.resolved.length ?? 0,
      Se = new Set(
        n ? e.resolution?.resolved.filter((Ie) => Ie.lookAgain !== void 0).map((Ie) => Ie.root) : [],
      ),
      ue = relookReadDenyRoots(
        { key: "", resolved: e.maskSweepEntries },
        !1,
        R,
        resolveMaskPath,
        (Ie, he) => !Se.has(Ie.root) && J(Ie, ae + he),
      );
    Z?.finish();
    let me = new Set([...(ie?.changedStops ?? []), ...ue.changedStops]);
    if (Z !== void 0 && me.size > 0) {
      let Ie = (he) => he.lookAgain?.stoppedAt !== void 0 && me.has(he.lookAgain.stoppedAt.path);
      if (ie !== void 0 && e.resolution !== void 0)
        ie = mergeReadDenyLooks(
          ie,
          relookReadDenyRoots(
            { key: e.resolution.key, resolved: ie.resolved },
            !1,
            R,
            resolveReadDenyRoot,
            Ie,
          ),
        );
      ue = mergeReadDenyLooks(
        ue,
        relookReadDenyRoots({ key: "", resolved: ue.resolved }, !1, R, resolveMaskPath, Ie),
      );
    }
    ((r.installedReadDenyRootResolution = {
      resolution:
        e.resolution && ie
          ? { key: e.resolution.key, resolved: markLookAgainEntries(e.resolution.resolved, ie.resolved, q) }
          : void 0,
      forwardedUntrustedGrants: e.forwardedUntrustedGrants,
      maskSweepEntries: markLookAgainEntries(e.maskSweepEntries, ue.resolved, q),
      trustedDenyRoots: e.trustedDenyRoots,
    }),
      (r.readDenyRootLookFailureReported = !1),
      (r.readDenyRootReachSeenAtLook = writeRootCount));
    let Ne = (ie?.lookedAt ?? 0) + ue.lookedAt,
      Ce = (ie?.moved ?? 0) + ue.moved;
    if (Ce === 0) {
      if (n)
        logForDebugging(
          `[sandbox] Re-checked ${Ne} trusted read-deny or credential-mask path(s) that were unresolved or spelled through a symlink when the configuration was built: none changed`,
        );
      return;
    }
    if (
      (logForDebugging(
        n
          ? `[sandbox] Re-checked ${Ne} trusted read-deny or credential-mask path(s) that were unresolved or spelled through a symlink when the configuration was built: ${Ce} resolve(s) differently now; rebuilding so repository grants and credential masks are re-checked`
          : `[sandbox] Re-checked ${Ne} trusted read-deny or credential-mask path(s) left unresolved or spelled through a symlink: ${Ce} resolve(s) differently than at the last look; checking which repository grants now lie inside one and which credential masks it now covers, to narrow the running config without a rebuild (a sandboxed command may still be running against its lists)`,
      ),
      (s = [...(ie?.resolved ?? []), ...ue.resolved]),
      (h = [...(ie?.movedSpellings ?? []), ...ue.movedSpellings]),
      !n)
    ) {
      let Ie = [...(ie?.movedMaskPaths ?? []), ...ue.movedMaskPaths];
      if (Ie.length > 0) {
        let he = uniq([...e.trustedDenyRoots, ...s.filter((rt) => !rt.isMask).flatMap((rt) => rt.spellings)]),
          flattened = he.flatMap((rt) => (Ad(rt) ? expandMaskGlob(rt).map((ut) => ut.canonical) : []));
        y = Ie.filter((rt) => pathsCoverPath([...he, ...flattened], rt));
      }
      b = uniq([
        ...uniq(h).flatMap((he) => (Ad(he) ? [he, ...expandMaskGlob(he).map((ft) => ft.canonical)] : he)),
        ...y,
      ]);
    }
  } catch (error) {
    if (((S = !0), !r.readDenyRootLookFailureReported))
      ((r.readDenyRootLookFailureReported = !0),
        reportSandboxErrorUnderStandIn(
          error,
          n ? "readDeniesNotRecheckedFirst" : "readDeniesNotRecheckedLater",
        ));
  }
  let w = S ? "look-failed" : "later-command";
  if (n) {
    let R = tryBuildSandboxConfig();
    if (R !== void 0)
      try {
        (installSandboxConfig(R),
          logForDebugging(
            S
              ? "Sandbox configuration rebuilt because trusted read-deny paths could not be re-checked"
              : "Sandbox configuration updated: a read-deny or credential-mask path now resolves somewhere other than where it did when the configuration was built",
          ));
        return;
      } catch (error) {
        reportSandboxErrorUnderStandIn(error, "configNotInstalled");
      }
    if (!S) w = "rebuild-failed";
  }
  ((r.pendingReadDenyFallback = {
    look: e,
    refreshed: s,
    cause: w,
    masksAtStake: w === "later-command" ? b : void 0,
  }),
    applyPendingReadDenyFallback());
}
//@ chunk-fq0cr76a.js:1026260-1027770 layout
function applyPendingReadDenyFallback() {
  let e = getSandboxAdapterState(),
    pendingReadDenyFallback = e.pendingReadDenyFallback;
  if (pendingReadDenyFallback === void 0) return;
  e.lateSymlinkGrantDenyRoots = uniq([
    ...e.lateSymlinkGrantDenyRoots,
    ...(pendingReadDenyFallback.refreshed ?? []).flatMap((y) => y.spellings),
  ]);
  let r = dropForwardedUntrustedGrants(pendingReadDenyFallback.look, pendingReadDenyFallback.refreshed),
    s = r?.derived,
    h = reduceMasksToPlaceholders(
      s ?? assertMarkedPathsResolved(on.getConfig()),
      pendingReadDenyFallback.masksAtStake,
    );
  if (h !== void 0)
    ((s = h.derived), e.builtConfigEnforcesAllowlist.set(s, e.installedFilterRequestEnforcesAllowlist));
  if (s !== void 0) {
    try {
      installSandboxConfig(s);
    } catch (error) {
      throw (reportSandboxErrorUnderStandIn(error, "configNotInstalled"), error);
    }
    let installedReadDenyRootResolution = e.installedReadDenyRootResolution;
    if (r !== void 0 && installedReadDenyRootResolution !== void 0) {
      let { allowRead: allowRead = [], allowWrite: allowWrite } = s.filesystem;
      e.installedReadDenyRootResolution = {
        ...installedReadDenyRootResolution,
        forwardedUntrustedGrants: installedReadDenyRootResolution.forwardedUntrustedGrants.filter(
          (forwardedUntrustedGrant) =>
            (forwardedUntrustedGrant.list === "allowRead" ? allowRead : allowWrite).includes(
              forwardedUntrustedGrant.literal,
            ),
        ),
      };
    }
    let { lead: lead, eventCode: eventCode } = READ_DENY_FALLBACK_LEADS[pendingReadDenyFallback.cause];
    if (
      (logFeatureSad("sandbox_exec", eventCode, {
        grants_dropped: r?.removed ?? 0,
        masks_reduced: h?.reduced ?? 0,
      }),
      r !== void 0)
    )
      logForDebugging(
        pendingReadDenyFallback.refreshed
          ? `[sandbox] ${lead}: ${r.removed} repository grant(s) now inside a trusted read-deny path are dropped from the running configuration until the next configuration build (a settings change or restart) decides afresh`
          : `[sandbox] ${lead}: all ${r.removed} repository grant(s) are dropped from the running configuration until the next configuration build (a settings change or restart) decides afresh`,
      );
    if (h !== void 0)
      logForDebugging(
        `[sandbox] ${lead}: ${h.reduced} credential mask(s) a moved path may now cover are reduced to a whole-file placeholder with no credential injection until the next configuration build (a settings change or restart)`,
      );
  }
  e.pendingReadDenyFallback = void 0;
}
//@ chunk-fq0cr76a.js:1027770-1028075 layout
function reduceMasksToPlaceholders(e, n) {
  let r = e?.credentials?.files;
  if (e === void 0 || r === void 0) return;
  let s = 0,
    mapped = r.map((y) => {
      if (y.mode !== "mask" || isSentinelOnlyMask(y) || (n !== void 0 && !pathsCoverPath(n, y.path)))
        return y;
      return (s++, { path: y.path, mode: "mask", injectHosts: [] });
    });
  if (s === 0) return;
  return { derived: { ...e, credentials: { ...e.credentials, files: mapped } }, reduced: s };
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
/**
 * 凭据遮罩条目是否只是占位：mode 为 mask、injectHosts 为空且没有其他字段。
 */
//@ chunk-fq0cr76a.js:1028672-1028807 layout
function isSentinelOnlyMask(e) {
  return (
    e.mode === "mask" &&
    e.injectHosts?.length === 0 &&
    Object.keys(e).every((n) => n === "path" || n === "mode" || n === "injectHosts")
  );
}
//@ chunk-fq0cr76a.js:1028807-1029471 layout
function dropForwardedUntrustedGrants(e, n) {
  let r = assertMarkedPathsResolved(on.getConfig());
  if (r === void 0) return;
  let s = n && uniq([...getBuiltinTrustedDenyRoots(), ...n.flatMap((D) => D.spellings)]),
    h = { allowRead: new Set(), allowWrite: new Set() };
  for (let { literal: literal, list: list } of e.forwardedUntrustedGrants)
    if (s === void 0 || pathsCoverPath(s, literal)) h[list].add(literal);
  let filtered = (r.filesystem.allowRead ?? []).filter((D) => !h.allowRead.has(D)),
    filtered_2 = r.filesystem.allowWrite.filter((D) => !h.allowWrite.has(D)),
    S =
      (r.filesystem.allowRead ?? []).length -
      filtered.length +
      (r.filesystem.allowWrite.length - filtered_2.length);
  if (S === 0) return;
  let w = { ...r, filesystem: { ...r.filesystem, allowRead: filtered, allowWrite: filtered_2 } },
    R = getSandboxAdapterState();
  return (
    R.builtConfigEnforcesAllowlist.set(w, R.installedFilterRequestEnforcesAllowlist),
    { derived: w, removed: S }
  );
}
/**
 * 内置的可信读禁止根（如 ~/.claude/seed-admin、IDE 锁文件目录等）的规范路径。
 */
//@ chunk-fq0cr76a.js:1029471-1029602 layout
function getBuiltinTrustedDenyRoots() {
  let e = [
    yqt(),
    resolve_2(getClaudeConfigDir(), "seed-admin"),
    getBashEditDiffDir(),
    ...getIdeLockfilesPaths(),
    ...[],
  ];
  return uniq(
    e.flatMap((n) => [n, realpathOrParentRealpath(n)]).flatMap((n) => canonicalizeSandboxPath(n) ?? []),
  );
}
/**
 * 判断一组路径（可含 glob）是否覆盖目标路径：目标先规范化，glob 目标取基目录；同时比较原样与 realpath 拼写。
 */
//@ chunk-fq0cr76a.js:1029602-1029744 layout
function pathsCoverPath(e, n) {
  let r = canonicalizeSandboxPath(n);
  if (r === void 0 || e.length === 0) return !1;
  if (Ad(r)) {
    let s = getGlobBaseDirectory_2(r);
    return anyGlobPathCovers(e, uniq([s, canonicalizePathForMaskSweep(s)]));
  }
  return EV(e, uniq([r, canonicalizePathForMaskSweep(r)]));
}
/**
 * pathsCoverPath 的 glob 分支：列表中任一条目（glob 取基目录）与目标任一拼写互相包含即为覆盖（大小写折叠比较）。
 */
//@ chunk-fq0cr76a.js:1029744-1029842 layout
function anyGlobPathCovers(e, n) {
  return e.some((r) => {
    let s = Ad(r) ? getGlobBaseDirectory_2(r) : r;
    return n.some((h) => denyEntryCoversFolded(s, h) || denyEntryCoversFolded(h, s));
  });
}
//@ chunk-fq0cr76a.js:1029842-1029901 layout
function EV(e, n) {
  return e.some((r) => n.some((s) => denyEntryCoversFolded(r, s)));
}
/**
 * 按进程 cwd 把沙箱路径解析成绝对路径；Windows 去掉尾部 /**，其他平台规整；失败返回 undefined。
 */
//@ chunk-fq0cr76a.js:1029901-1030007 layout
function canonicalizeSandboxPath(e) {
  try {
    let n = resolveAgainstProcessCwd(e);
    return getPlatform() === "windows" ? n.replace(/(?:[/\\]\*\*)+$/, "") : uy(n);
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
/**
 * 门面 areUnsandboxedCommandsAllowed：沙箱未处于“开着但没在跑”、会话未禁用沙箱外命令、且未配置严格模式时为 true（允许 dangerouslyDisableSandbox 重试）。
 */
//@ chunk-fq0cr76a.js:1030098-1030207 layout
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
  return getSandboxGbConfig().forbidUnsandboxedCommands === !0;
}
//@ chunk-fq0cr76a.js:1030264-1030323 layout
function isUnsandboxedFallbackClosedByTrustedTier() {
  return readSandboxSetting(["allowUnsandboxedCommands"]) === !1;
}
/**
 * 可信来源是否关闭了“沙箱外重跑”的退路：settings 禁止、GrowthBook 禁止或可信层设置禁止任一成立。
 */
//@ chunk-fq0cr76a.js:1030323-1030390 layout
function isUnsandboxedFallbackClosedByTrustedSource() {
  return (
    getHostAgentPolicy().unsandboxedCommandsDisabled ||
    isUnsandboxedForbiddenByGb() ||
    isUnsandboxedFallbackClosedByTrustedTier()
  );
}
//@ chunk-fq0cr76a.js:1030390-1030432 layout
Ww(() => getSandboxGbConfig().requireSandboxedAttempt === !0);
/**
 * 沙箱是否“必需”：设置开启、平台在 enabledPlatforms 内、且 sandbox.failIfUnavailable（或管理员强制下用户设置的 failIfUnavailable）。
 */
//@ chunk-fq0cr76a.js:1030432-1030521 fingerprint = isSandboxRequired (1)
function isSandboxRequired() {
  let settings = getSettings_DEPRECATED();
  return (
    getSandboxEnabledSetting() &&
    isPlatformInEnabledList() &&
    ((settings?.sandbox?.failIfUnavailable ?? !1) || isUserFailIfUnavailableUnderMandate())
  );
}
/**
 * 平台是否支持沙箱：Windows 看 srt-win 是否可用，其他平台用 sandbox-runtime 自带的判断。
 */
//@ chunk-fq0cr76a.js:1030521-1030604 layout
function isSupportedPlatform() {
  if (getPlatform() === "windows") return isWindowsSandboxEnabled();
  return getSandboxAdapterState().baseIsSupportedPlatform();
}
/**
 * 托管设置 sandbox.enabledPlatforms 未设为 true；空数组为 false；否则当前平台须在列表里。
 */
//@ chunk-fq0cr76a.js:1030604-1030819 fingerprint = isPlatformInEnabledList (0.881)
function isPlatformInEnabledList() {
  try {
    let enabledPlatforms = getSettingsForSource("policySettings")?.sandbox?.enabledPlatforms;
    if (enabledPlatforms === void 0) return !0;
    if (enabledPlatforms.length === 0) return !1;
    let currentPlatform = getPlatform();
    return enabledPlatforms.includes(currentPlatform);
  } catch (error) {
    return (logForDebugging(`Failed to check enabledPlatforms: ${error}`), !0);
  }
}
/**
 * 门面 isSandboxingEnabled：diskless 否；scrub 模式且未开沙箱看 scrub 沙箱可用性；本会话已禁用否；“必需但不可用”时也视为开启（以便拒绝命令）；否则需通过廉价门槛且依赖检查无错误。
 */
//@ chunk-fq0cr76a.js:1030819-1030989 layout
function isSandboxingEnabled() {
  if (isDiskless()) return !1;
  if (isScrubEnabled() && !0 && !getSandboxEnabledSetting()) return isScrubSandboxAvailable();
  if (getSandboxAdapterState().sandboxDisabledThisSession) return !1;
  if (isRequiredSandboxUnavailable()) return !0;
  if (!passesCheapSandboxGates()) return !1;
  return checkSandboxDependencies().errors.length === 0;
}
//@ chunk-fq0cr76a.js:1030989-1031033 layout
function isRequiredSandboxStarted() {
  return getSandboxAdapterState().startedOnce && isSandboxRequired();
}
/**
 * 沙箱被要求（failIfUnavailable）但当前不可用：平台不支持或依赖检查有错。旧版名 isSandboxingEnabled 错配。
 */
//@ chunk-fq0cr76a.js:1031033-1031096 file-local
function isRequiredSandboxUnavailable() {
  return (
    isRequiredSandboxStarted() &&
    !isDiskless() &&
    (!isSupportedPlatform() || checkSandboxDependencies().errors.length > 0)
  );
}
/**
 * 沙箱“设置开着但没在运行”：必需却不可用，或（必需/工作目录被拒）且初始化失败但 isSandboxingEnabled 仍为真。UI 用来提示命令会被拒绝。
 */
//@ chunk-fq0cr76a.js:1031096-1031221 layout
function isOnButNotRunning() {
  if (isRequiredSandboxUnavailable()) return !0;
  let e = getSandboxAdapterState();
  return (
    (isSandboxRequired() || e.refusedOverWorkingFolder) &&
    !isDiskless() &&
    e.initFailureReason !== void 0 &&
    isSandboxingEnabled()
  );
}
/**
 * 沙箱出口是否受限：沙箱实际生效且不是仅 scrub 模式。
 */
//@ chunk-fq0cr76a.js:1031221-1031257 placement
function isSandboxEgressRestricted() {
  return isToolSandboxActive() && !isScrubOnlySandboxMode();
}
/**
 * 当前会话 Shell 工具是否实际处于沙箱：初始化未失败且（scrub 模式，或依赖探测已缓存时 isSandboxingEnabled，或初始化已开始且未被禁用）。
 */
//@ chunk-fq0cr76a.js:1031257-1031477 placement
function isToolSandboxActive() {
  let e = getSandboxAdapterState();
  if (e.initFailureReason !== void 0) return !1;
  if (isScrubOnlySandboxMode()) return !0;
  if (e.checkDependenciesProbe.cache.has(void 0)) return isSandboxingEnabled();
  return e.initializationPromise !== void 0 && !e.sandboxDisabledThisSession && passesCheapSandboxGates();
}
//@ chunk-fq0cr76a.js:1031477-1031501 placement
function isSandboxHostAllowlistEnforced() {
  return !1;
}
//@ chunk-fq0cr76a.js:1031501-1031539 placement
function passesCheapSandboxGates() {
  return getSandboxEnabledSetting() && isPlatformInEnabledList() && isSupportedPlatform();
}
/**
 * Windows 沙箱需要重新安装时给出 {why, how}：版本过新指向文档，否则提示运行 /sandbox install 或 claude sandbox install。
 */
//@ chunk-fq0cr76a.js:1031539-1031863 placement
function describeWindowsSetupAgain(e) {
  let replaced = describeWindowsSandboxRemedy(e, { omitCcRemedy: !0 }).replace(/\.$/, "");
  if (/set up by a newer release/.test(e))
    return { why: replaced, how: "see https://code.claude.com/docs/en/sandboxing" };
  return {
    why: replaced,
    how: canRunSandboxInstallHere()
      ? "run /sandbox install (one elevation prompt)"
      : "run `claude sandbox install` in a terminal (one elevation prompt), then start again",
  };
}
//@ chunk-fq0cr76a.js:1031863-1031916 placement
function canRunSandboxInstallHere() {
  return !getIsNonInteractiveSession() && (!isSandboxRequired() || getSandboxAdapterState().startedOnce);
}
/**
 * 沙箱失败后的两句提示常量：“命令将在无沙箱下运行直到重启”和“沙箱命令将被拒绝直到重启”。
 */
//@ chunk-fq0cr76a.js:1031916-1032055 placement
var WITHOUT_SANDBOX_UNTIL_RESTART = "Commands run WITHOUT sandboxing until you restart Claude Code",
  REFUSED_UNTIL_RESTART = "Sandboxed commands are refused until you restart Claude Code";
//@ chunk-fq0cr76a.js:1032055-1032177 placement
function getLocalBindingRestartMode() {
  if (
    getPlatform() !== "windows" ||
    !needsRestartForLocalConnections() ||
    !passesCheapSandboxGates() ||
    checkSandboxDependencies().loopbackMismatch === void 0
  )
    return;
  return isRequiredSandboxStarted() ? "refused" : "unsandboxed";
}
//@ chunk-fq0cr76a.js:1032177-1032580 placement
function getSandboxRestartWarning() {
  let e = getLocalBindingRestartMode();
  if (e === void 0)
    return isRequiredSandboxUnavailable()
      ? `Sandbox cannot run: ${getSandboxUnavailableReason()?.replace(/^sandbox is enabled but (?:cannot start here: )?/, "")}. Sandboxed commands are refused until it can.`
      : void 0;
  return `Sandbox ${e === "refused" ? "cannot run" : "is off"}: sandbox.network.allowLocalBinding changed after this session started, and the sandbox was set up again for the new value. ${e === "refused" ? REFUSED_UNTIL_RESTART : WITHOUT_SANDBOX_UNTIL_RESTART}.`;
}
//@ chunk-fq0cr76a.js:1032580-1032808 placement
function getSandboxSetUpAgainWarning() {
  if (getPlatform() !== "windows" || !passesCheapSandboxGates()) return;
  let e = checkSandboxDependencies(),
    n = e.reinstallRequired ?? e.loopbackMismatch;
  if (n === void 0) return;
  let { why: why, how: how } = describeWindowsSetupAgain(n);
  return `Sandbox is off: ${why}. Commands run WITHOUT sandboxing until then \xB7 ${how}`;
}
//@ chunk-fq0cr76a.js:1032808-1033336 placement
function getProfileReadSecurityWarnings() {
  if (getPlatform() !== "windows") return [];
  return on
    .getWindowsProfileReadWarnings()
    .filter((e) => e.code === "profile_exclusion_unprotected" || e.code === "profile_stale_allow")
    .map(
      (e) =>
        `Sandboxed commands can read ${e.paths.length} path(s) in your user profile that sandbox set-up ${e.code === "profile_stale_allow" ? "no longer means to open" : "excludes as credential stores"} and could not close: ${e.paths
          .slice(0, 5)
          .map((n) => n.path)
          .join(
            ", ",
          )}${e.paths.length > 5 ? ", \u2026" : ""}. Only their owner or an administrator can close them.`,
    );
}
/**
 * 沙箱开启但无法使用的原因：平台不支持（WSL1、Windows 门控、其他系统）、diskless、Windows allowLocalBinding 变更需重启、需重新安装、依赖缺失（给出 apt install bubblewrap socat 或 /sandbox 提示）。
 */
//@ chunk-fq0cr76a.js:1033336-1034966 callgraph-witnessed = getSandboxUnavailableReason (0.196)
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
  let deps = checkSandboxDependencies(),
    platform = getLocalBindingRestartMode();
  if (platform !== void 0)
    return `sandbox is enabled but sandbox.network.allowLocalBinding changed after this session started, and the sandbox was set up again for the new value \xB7 ${platform === "refused" ? REFUSED_UNTIL_RESTART : WITHOUT_SANDBOX_UNTIL_RESTART}`;
  let r = deps.reinstallRequired ?? deps.loopbackMismatch;
  if (r !== void 0) {
    let { why: why, how: how } = describeWindowsSetupAgain(r);
    return `sandbox is enabled but has to be set up again: ${why} \xB7 ${how}`;
  }
  if (deps.errors.length > 0) {
    let s = getPlatform(),
      h = getIsNonInteractiveSession()
        ? "see https://code.claude.com/docs/en/sandboxing"
        : "run /sandbox for details",
      any = deps.errors.some((error) => / not (installed|found)\b/.test(error)),
      b;
    if (s === "macos") b = h;
    else if (s === "windows")
      b =
        canRunSandboxInstallHere() && !deps.errors.some((error) => error.startsWith("srt-win"))
          ? areSandboxSettingsOverriddenByFlagOrPolicy()
            ? "run /sandbox install, more info at https://code.claude.com/docs/en/sandboxing"
            : `run /sandbox install, or ${h}`
          : "ask your administrator to install the network filters, or see https://code.claude.com/docs/en/sandboxing";
    else b = any ? `install missing tools (e.g. apt install bubblewrap socat) or ${h}` : h;
    let S =
        any || s === "windows"
          ? "sandbox is enabled but dependencies are missing"
          : "sandbox is enabled but cannot start here",
      joined = deps.errors.map((error) => describeWindowsSandboxRemedy(error)).join(", ");
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
  let n = e.credentials?.files ?? [],
    mapped = n.filter((R) => R.mode === "mask").map((R) => R.path),
    s = new Set(n.filter((R) => R.mode === "mask" && R.injectHosts?.length === 0).map((R) => R.path)),
    h = getPlatform() === "macos" && e.filesystem.disabled ? mapped : [],
    y = new Set(h),
    b = [
      ...(e.credentials?.envVars ?? [])
        .filter((R) => R.mode === "mask" && R.injectHosts?.length === 0)
        .map((R) => R.name),
      ...[...s].filter((R) => !y.has(R)),
    ],
    S = [
      ...(e.credentials?.envVars ?? [])
        .filter((R) => R.mode === "mask" && R.injectHosts?.length !== 0)
        .map((R) => R.name),
      ...(h.length > 0 ? [] : mapped.filter((R) => !s.has(R))),
    ],
    w = [];
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
  if (S.length > 0 && e.network.tlsTerminate === void 0 && !e.credentials?.allowPlaintextInject)
    w.push(
      `sandbox.credentials mask entries (${S.join(", ")}) are configured ` +
        "but TLS termination is unavailable \u2014 sandboxed commands see only a " +
        "sentinel value and the proxy cannot substitute the real credential on egress, so tools needing these will fail to authenticate. Enable sandbox.network.tlsTerminate, or remove the mask entries",
    );
  return w.length > 0 ? w.join(" \xB7 ") : void 0;
}
/**
 * 计算凭据遮罩相关的安全警告文本；不满足触发条件或出错时返回 undefined（错误只记日志）。
 */
//@ chunk-fq0cr76a.js:1037219-1037384 layout
function getMaskCredentialWarning() {
  try {
    if (!canMaskCredentialWarningFire()) return;
    let e = assertMarkedPathsResolved(on.getConfig());
    if (e === void 0) return;
    return buildMaskCredentialWarning(e);
  } catch (error) {
    logForDebugging(`Failed to compute mask credential warning: ${error}`);
    return;
  }
}
//@ chunk-fq0cr76a.js:1037384-1037441 layout
function canMaskCredentialWarningFire() {
  let e = isScrubEnabled() && !0 && isScrubSandboxAvailable();
  return (getSandboxEnabledSetting() || e) && isPlatformInEnabledList();
}
/**
 * Linux/WSL 上 Edit/Read 规则里含 bubblewrap 无法表达的 glob（尾部 /** 之外）时返回这些规则用于告警。
 */
//@ chunk-fq0cr76a.js:1037441-1037949 fingerprint = getLinuxGlobPatternWarnings (0.952)
function getLinuxGlobPatternWarnings() {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") return [];
  try {
    if (!getSandboxEnabledSetting()) return [];
    let r = getSettings_DEPRECATED()?.permissions || {},
      warnings = [],
      h = (y, b) => {
        let S = unescapeGlobPattern(y),
          w = y.startsWith("/") && !y.startsWith("//"),
          replaced = (b || w ? S.replace(/\/+$/, "") : S).replace(/\/\*\*$/, "");
        return Ad(replaced);
      };
    for (let [y, b] of [
      ...(r.allow || []).map((S) => [S, !1]),
      ...(r.deny || []).map((path) => [path, !0]),
    ]) {
      let rule = parseRuleForSandbox(y);
      if (
        (rule.toolName === FILE_EDIT_TOOL_NAME || rule.toolName === FILE_READ_TOOL_NAME) &&
        rule.ruleContent &&
        h(rule.ruleContent, b)
      )
        warnings.push(y);
    }
    return warnings;
  } catch (error) {
    return (logForDebugging(`Failed to get Linux glob pattern warnings: ${error}`), []);
  }
}
/**
 * 找出沙箱网络 allow/deny 设置中写法有问题的 IPv6/主机条目（含 @、裸 IPv6、末尾多个点、方括号格式错误或端口非法），用于提示警告。
 */
//@ chunk-fq0cr76a.js:1037949-1038530 placement
function getInvalidIpv6DomainEntries() {
  try {
    let e = getSettings_DEPRECATED(),
      n = [...(e ? [e] : []), ...getAllPolicyTierSettings()],
      bad = new Set();
    for (let s of ["allow", "deny"])
      for (let entry of collectNetworkDomainEntries(n, s))
        if (entry.includes("@")) bad.add(entry);
        else if (isBareIpv6Literal(entry)) bad.add(entry);
        else if (!entry.startsWith("[") && /\.{2,}$/.test(Iie(entry).hostPattern)) bad.add(entry);
        else if (entry.startsWith("[")) {
          let closeIndex = entry.indexOf("]"),
            portPart = closeIndex === -1 ? void 0 : entry.slice(closeIndex + 1),
            hostPart = closeIndex === -1 ? void 0 : entry.slice(1, closeIndex);
          if (
            portPart === void 0 ||
            hostPart === void 0 ||
            (portPart !== "" &&
              (!portPart.startsWith(":") ||
                !Sw.test(portPart.slice(1)) ||
                Number(portPart.slice(1)) > 65535)) ||
            JF(hostPart) === void 0 ||
            hostnameCanonicalFormDiffers(hostPart) ||
            hostPart.includes("*")
          )
            bad.add(entry);
        }
    return [...bad];
  } catch (error) {
    return (logForDebugging(`Failed to get IPv6 domain entry warnings: ${error}`), []);
  }
}
/**
 * 找出沙箱凭据注入主机（injectHosts）中写法有问题的 IPv6 条目（含多个冒号却不是规范 IPv6），用于提示警告。
 */
//@ chunk-fq0cr76a.js:1038530-1038926 placement
function getInvalidInjectHostEntries() {
  try {
    let e = getSettings_DEPRECATED(),
      n = [...(e ? [e] : []), ...getAllPolicyTierSettings()],
      r = new Set();
    for (let s of n) {
      let h = s.sandbox?.credentials;
      for (let y of [...(h?.envVars ?? []), ...(h?.files ?? [])])
        for (let b of y.injectHosts ?? []) {
          let index = b.indexOf(":");
          if (index === -1 || b.indexOf(":", index + 1) === -1) continue;
          if (isIP_5(b) === 6 && JF(b) === b.toLowerCase()) continue;
          r.add(b);
        }
    }
    return [...r];
  } catch (error) {
    return (logForDebugging(`Failed to get injectHosts entry warnings: ${error}`), []);
  }
}
/**
 * flagSettings 或 policySettings 是否设置了指定的 sandbox 键。
 */
//@ chunk-fq0cr76a.js:1038926-1039022 placement = getEnabledSettingSources (0.863)
function isSandboxSettingOverriddenByPolicy(e) {
  return ["flagSettings", "policySettings"].some((n) => getSettingsForSource(n)?.sandbox?.[e] !== void 0);
}
/**
 * flag/policy 层任一设置了 enabled、autoAllowBashIfSandboxed、allowUnsandboxedCommands 时为真（SandboxManager.areSandboxSettingsLockedByPolicy 实际指向它）。
 */
//@ chunk-fq0cr76a.js:1039022-1039124 placement
function areSandboxSettingsOverriddenByFlagOrPolicy() {
  return (
    isSandboxSettingOverriddenByPolicy("enabled") ||
    isSandboxSettingOverriddenByPolicy("autoAllowBashIfSandboxed") ||
    isSandboxSettingOverriddenByPolicy("allowUnsandboxedCommands")
  );
}
/**
 * 把 sandbox.enabled/autoAllowBashIfSandboxed/allowUnsandboxedCommands 写入 localSettings（只写变化项）。
 */
//@ chunk-fq0cr76a.js:1039124-1039749 fingerprint = setSandboxSettings (0.67)
async function setSandboxSettings(options) {
  let { error: error } = await updateSettingsForSourceWithTransform("localSettings", (r) => {
    let s = {
      ...(options.enabled !== void 0 &&
        r?.sandbox?.enabled !== options.enabled && { enabled: options.enabled }),
      ...(options.autoAllowBashIfSandboxed !== void 0 &&
        r?.sandbox?.autoAllowBashIfSandboxed !== options.autoAllowBashIfSandboxed && {
          autoAllowBashIfSandboxed: options.autoAllowBashIfSandboxed,
        }),
      ...(options.allowUnsandboxedCommands !== void 0 &&
        r?.sandbox?.allowUnsandboxedCommands !== options.allowUnsandboxedCommands && {
          allowUnsandboxedCommands: options.allowUnsandboxedCommands,
        }),
    };
    if (Object.keys(s).length === 0) return null;
    return { sandbox: s };
  });
  if (error) logFeatureBad("sandbox_set_settings", "save_failed");
  else logFeatureOk("sandbox_set_settings");
  return { error: error };
}
/**
 * 门面 getExcludedCommands：合并设置的 sandbox.excludedCommands；管理员强制时只认可信层（托管、--settings、用户设置），并记一次被忽略条数。
 */
//@ chunk-fq0cr76a.js:1039749-1040159 placement
function getExcludedCommands() {
  let e = getSettings_DEPRECATED()?.sandbox?.excludedCommands ?? [];
  if (!isAdminSandboxMandate()) return e;
  let n = getTrustedExcludedCommands(),
    r = getSandboxAdapterState();
  if (!r.droppedRepoExcludedCommandsLogged) {
    r.droppedRepoExcludedCommandsLogged = !0;
    let s = new Set(n),
      h = count(e, (y) => !s.has(y));
    if (h > 0)
      logForDebugging(
        `[sandbox] excludedCommands restricted to trusted settings tiers: ignoring ${h} sandbox.excludedCommands entr${h === 1 ? "y" : "ies"} not set by managed, --settings, or user settings`,
      );
  }
  return n;
}
//@ chunk-fq0cr76a.js:1040159-1040270 placement
function getConfiguredNetworkAllowances() {
  if (isScrubOnlySandboxMode()) return { ...ALLOW_ALL_UNIX_SOCKETS };
  if (env.CLAUDE_CODE_EVAL_CONFINED) return {};
  return getNetworkAllowances(getSettings_DEPRECATED()?.sandbox?.network);
}
//@ chunk-fq0cr76a.js:1040270-1040322 placement
function isAllowAllUnixSocketsConfigured() {
  return getConfiguredNetworkAllowances().allowAllUnixSockets === !0;
}
/**
 * 汇总各设置来源的 sandbox.filesystem.allowWrite/allowRead：管理员强制时丢弃不可信来源的写授权；落在可信读禁止区内或含 glob 的不可信授权被过滤；allowManagedReadPathsOnly 时 allowRead 只取托管层。
 */
//@ chunk-fq0cr76a.js:1040322-1041044 placement
function getConfiguredFilesystemGrants() {
  let e = isAdminSandboxMandate(),
    n = e || hasTrustedReadDenies(),
    r,
    s = !1;
  if (n)
    try {
      r = getTrustedReadDenyRoots();
    } catch {
      s = !0;
    }
  let h,
    y = () => (h ??= r ? resolveTrustedReadDenyRoots(r).roots : getBuiltinTrustedDenyRoots()),
    b = (D, O) => {
      if (!D.widensUntrusted) return !1;
      if (s) return !0;
      let L = y();
      try {
        let V = resolveSandboxFilesystemPath(O, D.source),
          K = canonicalizeSandboxPath(V) ?? "";
        return pathsCoverPath(L, V) || (n && (Ad(K) || isNetworkSpelledGrantRoot(K)));
      } catch {
        return !0;
      }
    },
    mapped = SETTING_SOURCES.filter((D) => isSettingSourceEnabled(D)).map((D) => ({
      source: D,
      widensUntrusted:
        isRepoSettingSource(D) || (D === "policySettings" && !isPolicySlotAdminOrParentComposed()),
      filesystem: getSettingsForSource(D)?.sandbox?.filesystem,
    })),
    w = getAllPolicyTierSettings(),
    any = w.some((D) => D.sandbox?.filesystem?.allowManagedReadPathsOnly === !0);
  return {
    allowWrite: uniq(
      mapped.flatMap((D) =>
        e && D.widensUntrusted ? [] : (D.filesystem?.allowWrite ?? []).filter((O) => !b(D, O)),
      ),
    ),
    allowRead: uniq(
      any
        ? w.flatMap((D) => D.sandbox?.filesystem?.allowRead ?? [])
        : mapped.flatMap((D) => (D.filesystem?.allowRead ?? []).filter((O) => !b(D, O))),
    ),
  };
}
/**
 * 包装命令前确保沙箱已初始化：必需但不可用直接抛 SandboxInitFailedError（并禁止 dangerouslyDisableSandbox）；懒初始化；初始化失败时按“工作目录被拒/必需/普通”给出不同错误（普通情况本会话禁用沙箱）；之后刷新 Windows 授权、复查读禁止根等。
 */
//@ chunk-fq0cr76a.js:1041044-1042843 placement
async function ensureInitializedForWrap() {
  if (isSandboxingEnabled()) {
    if (isRequiredSandboxUnavailable())
      throw (
        logFeatureBad("sandbox_exec", "sandbox_exec_lost_and_required"),
        new SandboxInitFailedError(
          `Sandbox is required (sandbox.failIfUnavailable) and stopped being available in this session: ${getSandboxUnavailableReason()}. The command was refused, and so is a request to run it outside the sandbox (dangerouslyDisableSandbox): do not retry it that way. Only commands the user runs themselves with the \`!\` prefix, and commands their settings exclude from the sandbox, still run.`,
        )
      );
    if (!getSandboxAdapterState().initializationPromise)
      (logFeatureSad("sandbox_exec", "sandbox_exec_lazy_init"), await initializeSandbox());
    let initializationPromise = getSandboxAdapterState().initializationPromise;
    if (initializationPromise) await initializationPromise;
    let { initializationPromise: initializationPromise_2, realPathTwins: realPathTwins } =
      getSandboxAdapterState();
    if (!initializationPromise_2 && realPathTwins === "listed")
      ((getSandboxAdapterState().realPathTwins = "off"),
        logForDebugging(
          `[sandbox] real-path twins are off until settings change: a start failed with them listed (${getSandboxAdapterState().initFailureCode})`,
          { level: "warn" },
        ),
        await initializeSandbox());
    if (
      (await getSandboxAdapterState().initializationPromise,
      !getSandboxAdapterState().initializationPromise && getSandboxAdapterState().realPathTwins === "off")
    )
      getSandboxAdapterState().realPathTwins = "listed";
    if (!getSandboxAdapterState().initializationPromise) {
      logFeatureBad("sandbox_exec", "sandbox_exec_not_initialized");
      let { initFailureReason: initFailureReason } = getSandboxAdapterState(),
        h = initFailureReason ? `: ${initFailureReason}` : "";
      if (getSandboxAdapterState().refusedOverWorkingFolder)
        throw new SandboxInitFailedError(
          `Sandbox is enabled but failed to initialize${h}. Until the sandbox can start, commands that would run in it are refused.`,
        );
      if (isSandboxRequired() || (isScrubEnabled() && isScrubSandboxAvailable()))
        throw new SandboxInitFailedError(
          `Sandbox is required but failed to initialize${h}. ${getSandboxAdapterState().configBuildFailed ? "Fix the sandbox settings to retry (a --settings file is pinned for the process: restart)." : "Restart to retry."} Running it outside the sandbox (dangerouslyDisableSandbox) is not allowed either.`,
        );
      throw (
        (getSandboxAdapterState().sandboxDisabledThisSession = !0),
        new SandboxInitFailedError(
          `Sandbox is enabled but failed to initialize${h}. Sandboxing is disabled for the rest of this session; restart to retry.`,
        )
      );
    }
    if ((await ensureBridgeSpawnRootDir(), getPlatform() === "windows")) await ensureSelfExecGrant();
    (ensureAtomicWriteStagingDirs(),
      recheckReadDenyRoots(),
      rescreenDenyLiteralSymlinks(),
      rescreenLateSymlinkGrants(),
      cue());
  }
}
/**
 * 把 Windows 沙箱“命令行过长 / CreateProcessW 限制”错误转成友好的 SandboxCommandTooLongError，其他错误原样返回。
 */
//@ chunk-fq0cr76a.js:1042843-1042958 placement
function mapWindowsArgvTooLong(e) {
  return e instanceof Error && /Windows sandbox argv is|CreateProcessW limit/i.test(e.message)
    ? windowsArgvTooLongError()
    : e;
}
/**
 * 构造 Windows 沙箱命令过长（或环境变量过大）的错误，附处理建议并上报遥测。
 */
//@ chunk-fq0cr76a.js:1042958-1043751 placement
function windowsArgvTooLongError(e = "command") {
  return (
    logFeatureBad("sandbox_exec", e === "command" ? "windows_argv_too_long" : "windows_child_env_too_long"),
    new SandboxCommandTooLongError(
      e === "command"
        ? "Command is too long to run in the Windows sandbox: the assembled command line is near the OS limit, and the budget also covers the sandbox arguments, so trimming to just under the limit will not help. On PowerShell the script is base64-encoded first (~2.7x), leaving roughly 10,000 characters of script. Write the script to a file and run that file instead, or split the command up."
        : "The environment variables that your settings files or /env set leave no room for this command in the Windows sandbox: the variables and the command together come to more than 30,000 characters. Shorten the env block in your settings, or move long values into files.",
    )
  );
}
/**
 * 把 Windows 沙箱特定退出码（1 拒绝访问、19 loopback 模式变更、16 映射网络盘 cwd）换成给模型看的说明文字。
 */
//@ chunk-fq0cr76a.js:1043751-1044913 placement
function classifyWindowsSandboxLaunchExit(e, n) {
  if (e === 1 && Av(n))
    return (
      (getSandboxAdapterState().selfExecGrantAttempt = void 0),
      "Windows refused to start Claude Code as the sandbox account (access denied, 0x80070005), so the command most likely did not run. The Secondary Logon service is not the cause. Claude Code tries to set the permission on its program file again before the next command, so try the command once more. If it fails the same way, stop and tell the user."
    );
  if (e === 19 && px(n)?.code === "wfp_loopback_mismatch")
    return (
      logFeatureBad("sandbox_exec", "windows_loopback_mode_changed"),
      "The command did not run: the sandbox on this machine was set up again with the other setting for local connections (sandbox.network.allowLocalBinding) since this session started, and a session keeps the one it started with. Every sandboxed command is refused like this one until Claude Code is restarted: tell the user to restart Claude Code."
    );
  if (e !== 16) return;
  let r = px(n);
  if (r?.code !== "mapped_drive_cwd") return;
  return (
    logFeatureBad("sandbox_exec", "windows_mapped_drive_cwd"),
    `The sandbox can't run commands from a network drive${r.drive ? ` (${r.drive})` : ""}: mapped drives don't exist for the sandbox account. Use a workspace on a local drive.`
  );
}
//@ chunk-fq0cr76a.js:1044913-1045203 placement
function mapLinuxBridgeError(e) {
  if (e instanceof Error && /bridge socket does not exist/i.test(e.message)) {
    logFeatureSad("sandbox_exec", "sandbox_linux_bridge_dead");
    let n = /SOCKS/i.test(e.message) ? "SOCKS" : "HTTP";
    return new SandboxBridgeUnavailableError(
      `Linux sandbox ${n} bridge socket is missing (socat may have died). Restart to retry.`,
    );
  }
  return e;
}
/**
 * 把包装失败转成 commandNotWrapped 错误；若是本次 abort 的原因则原样返回。
 */
//@ chunk-fq0cr76a.js:1045203-1045280 layout
function toCommandNotWrappedError(e, n) {
  return n?.aborted && e === n.reason ? e : describeUnreadableSandboxError(e, "commandNotWrapped");
}
/**
 * 门面 wrapWithSandbox：ensureInitializedForWrap 后调用 sandbox-runtime 把命令串包成沙箱命令（macOS sandbox-exec 配置 / Linux bwrap+seccomp+socat 代理）。
 */
//@ chunk-fq0cr76a.js:1045280-1045432 fingerprint = wrapWithSandbox (0.558)
async function wrapWithSandbox(e, n, r, s, h) {
  (await ensureInitializedForWrap(), assertTaskOutputDirChainPlain(), verifyStagedMcpCallDir());
  try {
    let wrapWithSandbox = await on.wrapWithSandbox(e, n, r, s, h);
    return (logFeatureOk("sandbox_exec"), wrapWithSandbox);
  } catch (error) {
    throw toCommandNotWrappedError(mapLinuxBridgeError(error), s);
  }
}
/**
 * 门面 wrapWithSandboxArgv（Windows 唯一方式）：合并原生 deny 列表后调用 sandbox-runtime 得到 {argv, env}，再算出与当前环境的差异 env 与需 unset 的变量（含 credentials.envVars 的 deny 项）。
 */
//@ chunk-fq0cr76a.js:1045432-1046064 placement
async function wrapWithSandboxArgv(e, n, r, s, h) {
  (await ensureInitializedForWrap(), assertTaskOutputDirChainPlain(), verifyStagedMcpCallDir());
  let y =
      getSandboxAdapterState().nativeDenies === void 0
        ? r
        : await raceAbortSignal(withRenewedNativeDenies(r), s),
    b;
  try {
    b = await on.wrapWithSandboxArgv(e, n, y, s, void 0, h);
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "wfp_loopback_mismatch")
      error.message = describeWindowsSandboxRemedy(error.message);
    throw toCommandNotWrappedError(mapWindowsArgvTooLong(mapLinuxBridgeError(error)), s);
  }
  let S = new Set(Object.keys(b.env)),
    w = {};
  for (let [O, L] of Object.entries(b.env)) if (L !== void 0 && process.env[O] !== L) w[O] = L;
  let R = new Set();
  for (let O of Object.keys(process.env)) if (!S.has(O)) R.add(O);
  let D = on.getConfig()?.credentials;
  for (let O of D?.envVars ?? []) if (O.mode === "deny") R.add(O.name);
  return (logFeatureOk("sandbox_exec"), { argv: b.argv, env: w, unsetEnv: [...R] });
}
//@ chunk-fq0cr76a.js:1046064-1046071 placement
var taskOutputDirChainRoot;
//@ chunk-fq0cr76a.js:1046071-1046343 placement
function assertTaskOutputDirChainPlain() {
  let e = taskOutputDirChainRoot;
  if (e === void 0) return;
  if (!ensurePrivateDirChain(getClaudeTempDirRealpath(), e))
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `sandbox: the task output directory chain under the temp root is no longer plain directories (${e}); refusing to run sandboxed commands until it is restored`,
      "sandbox task output dir chain not plain",
    );
}
//@ chunk-fq0cr76a.js:1046343-1046350 placement
var Mp;
/**
 * 包装命令前检查暂存的 mcp_call 目录在 temp 根下仍是普通目录（必要时清掉文件）；不是则沙箱命令被拒。
 */
//@ chunk-fq0cr76a.js:1046350-1046440 placement
function verifyStagedMcpCallDir() {
  let e = Mp;
  if (e === void 0) return !0;
  if (isParentDirReal(e))
    try {
      unlinkSync(e);
    } catch {}
  return ensurePrivateDirChain(getClaudeTempDirRealpath(), e);
}
/**
 * 门面 initialize：构建配置 Q0(settings)（Windows 拒绝在家目录/配置目录下作工作目录）→ Windows 先确保自执行授权、原生 deny → SandboxManager.initialize；成功后订阅设置/插件目录/GrowthBook 变化以热更新配置（refreshConfig）；配置构建失败则等待设置变化再试。网络请求询问回调在 allowManagedDomainsOnly 时一律拒绝。
 */
//@ chunk-fq0cr76a.js:1046440-1051128 placement
async function initializeSandbox(e) {
  let n = getSandboxAdapterState();
  if (
    ((n.askCallback = e ?? (getPlatform() === "windows" ? n.askCallback : void 0)), n.initializationPromise)
  )
    return n.initializationPromise;
  if (n.configBuildFailed) return;
  if (!isSandboxingEnabled()) return;
  let { askCallback: askCallback } = n,
    s = askCallback
      ? async (y) => {
          if (shouldAllowManagedSandboxDomainsOnly())
            return (
              logForDebugging(`[sandbox] Blocked network request to ${y.host} (allowManagedDomainsOnly)`),
              !1
            );
          return askCallback(y);
        }
      : void 0,
    h = !1;
  if (
    ((n.initializationPromise = (async () => {
      let y;
      try {
        if (
          getPlatform() === "windows" &&
          isUnderGitHome(safeProcessCwd(), getGitHomeInfo(homedir_3(), userSettingsHomes()))
        )
          throw new O0(HOME_AS_CWD_NOTE);
        y = convertToSandboxRuntimeConfig(getSettings_DEPRECATED());
      } catch (error) {
        if (((h = !0), recordSandboxInitFailure(error), !(error instanceof SandboxPathEntryError))) return;
        let S = getSandboxAdapterState();
        S.configBuildFailed = !0;
        try {
          S.settingsSubscriptionCleanup?.();
          let w = !1,
            subscribe = settingsChangeDetector.subscribe(() => {
              if (w) return;
              ((w = !0), subscribe());
              let D = getSandboxAdapterState();
              if (
                ((D.configBuildFailed = !1),
                (D.realPathTwins = "unlisted"),
                D.settingsSubscriptionCleanup === subscribe)
              )
                D.settingsSubscriptionCleanup = void 0;
            });
          S.settingsSubscriptionCleanup = subscribe;
        } catch (error) {
          ((S.configBuildFailed = !1),
            (S.settingsSubscriptionCleanup = void 0),
            reportSandboxErrorUnderStandIn(error, "settingsWatchNotArmed"));
        }
        return;
      }
      try {
        ((getSandboxAdapterState().initializedWithTlsTerminate = y.network?.tlsTerminate !== void 0),
          (getSandboxAdapterState().installsSinceInitializeStartedAllEnforce = !0));
        let b = !1,
          S = () => {
            b = !0;
          },
          w = [
            settingsChangeDetector.subscribe(S),
            onProducerDirsChanged.subscribe(S),
            beginSandboxBringUp(),
            ...[],
          ];
        try {
          if (getPlatform() === "windows") {
            if (!getSandboxAdapterState().sandboxRuntimeIsUp) {
              if (
                (getProcessSandboxState().windowsStartBeganAtMs.setState(() => Date.now()),
                getIsNonInteractiveSession())
              )
                writeStderrNotice(WINDOWS_START_NOTICE);
            }
            if (!process.listeners("exit").includes(announceWindowsPermissionRemoval)) {
              process.prependListener("exit", announceWindowsPermissionRemoval);
              for (let Ne of EXIT_SIGNALS) process.prependListener(Ne, announceWindowsPermissionRemoval);
            }
            (ensureAtomicWriteStagingDirs(), await ensureBridgeSpawnRootDir());
            let me = io(DV);
            (await ensureSelfExecGrant(me),
              await grantParentFoldersToSandboxGroup({
                project: getOriginalCwd(),
                home: homedir_3(),
                configHomes: userSettingsHomes(),
                getUserStatus: me,
              }));
          }
          let Se = getSandboxAdapterState().nativeDenies !== void 0,
            ue = getPlatform() === "windows" ? await installWindowsNativeDenies(y) : void 0;
          if ((adoptReadDenyRootResolution(y), ue === void 0)) {
            if (getSandboxAdapterState().storedDenyListsMayBeShort) installSandboxConfig(y);
            await initializeSandboxRuntime(y, s);
          } else
            await initializeWithStandingDenies({
              runtimeConfig: y,
              standing: ue,
              callback: s,
              runtimeWasUp: Se,
            });
        } finally {
          for (let Se of w) Se();
          getProcessSandboxState().windowsStartBeganAtMs.setState(() => null);
        }
        let R = getSandboxAdapterState();
        if (
          ((R.installedFilterRequestEnforcesAllowlist =
            (R.builtConfigEnforcesAllowlist.get(y) ?? !1) && R.installsSinceInitializeStartedAllEnforce),
          (R.refusedOverWorkingFolder = !1),
          (R.initFailureReason = void 0),
          (R.gbHostRulesApplied = R.builtConfigGbHostRules.get(y) ?? R.gbHostRulesApplied),
          (R.sshStoreDenyApplied = R.builtConfigSshStoreDenied.get(y) ?? R.sshStoreDenyApplied),
          (R.pluginToolStagingDenyApplied =
            R.builtConfigPluginToolStagingDenied.get(y) ?? R.pluginToolStagingDenyApplied),
          (R.patternWriteDenyTwinsApplied =
            R.builtConfigPatternWriteDenyTwins.get(y) ?? R.patternWriteDenyTwinsApplied),
          (R.unlistableWorktreesDenyApplied =
            R.builtConfigUnlistableWorktreesDenied.get(y) ?? R.unlistableWorktreesDenyApplied),
          (R.nestedGitConfigLockDenyApplied =
            R.builtConfigNestedGitConfigLockDeny.get(y) ?? R.nestedGitConfigLockDenyApplied),
          (R.startedOnce = !0),
          getPlatform() === "windows")
        ) {
          ((R.windowsLoopbackAtStart = y.network.allowLocalBinding === !0),
            logForDebugging(
              `[sandbox] Windows: the user profile is ${on.getWindowsProfileRead() === "granted" ? "readable to sandboxed commands, minus credential stores (set-up granted it)" : "not readable to sandboxed commands (no profile read grant)"}`,
            ));
          for (let Se of on.getWindowsProfileReadWarnings())
            logForDebugging(`[sandbox] Windows profile read grant: ${Se.message}`, { level: "warn" });
        }
        if (getPlatform() !== "windows") getSandboxAdapterState().checkDependenciesProbe.cache.clear?.();
        getSandboxAdapterState().settingsSubscriptionCleanup?.();
        let D = (Se) => {
            let ue = tryBuildSandboxConfig();
            if (ue === void 0) return !1;
            return (
              installSandboxConfig(ue),
              logForDebugging(`Sandbox configuration updated from ${Se}`),
              !0
            );
          },
          subscribe = settingsChangeDetector.subscribe(() => {
            ((getSandboxAdapterState().realPathTwins = "unlisted"), D("settings change"));
          }),
          subscribe_2 = onProducerDirsChanged.subscribe(() => {
            D("a plugin producer directory");
          }),
          V = setDenyJoinedPluginRoot(() => {
            if (getPlatform() === "windows")
              return (logFeatureSad("sandbox_exec", "plugin_dir_join_refused_windows"), "stamped_at_start");
            let Se = !1;
            try {
              Se = D("a plugin folder joining the session");
            } catch (error) {
              reportSandboxErrorUnderStandIn(error, "configNotRebuiltForPluginFolder");
            }
            if (!Se) return (logFeatureSad("sandbox_exec", "plugin_dir_join_refused"), "rebuild_failed");
            return "installed";
          }),
          K = () => {},
          q = onGrowthBookRefresh(() => {
            if (isSshStoreWriteDenyEnabled() !== getSandboxAdapterState().sshStoreDenyApplied)
              D("a GrowthBook change to the write block on claude ssh binaries");
          }),
          Z = onGrowthBookRefresh(() => {
            if (isPluginToolStagingDenyEnabled() !== getSandboxAdapterState().pluginToolStagingDenyApplied)
              D("a feature-flag change to the write block on the staged mcp_call directory");
          }),
          J = onGrowthBookRefresh(() => {
            if (isPatternWriteDenyTwinsEnabled() !== getSandboxAdapterState().patternWriteDenyTwinsApplied)
              D("a GrowthBook change to the switch for write-deny patterns through symlinks");
          }),
          ie = onGrowthBookRefresh(() => {
            if (
              isUnlistableWorktreesDenyEnabled() !== getSandboxAdapterState().unlistableWorktreesDenyApplied
            )
              D("a GrowthBook change to the write block on an unreadable .git/worktrees");
          }),
          ae = onGrowthBookRefresh(() => {
            let nestedGitConfigLockDenyApplied = getSandboxAdapterState().nestedGitConfigLockDenyApplied;
            if (
              nestedGitConfigLockDenyApplied !== void 0 &&
              isNestedGitConfigLockDenyEnabled() !== nestedGitConfigLockDenyApplied
            )
              D("a GrowthBook refresh of the nested .git/config.lock kill switch");
          });
        if (
          ((getSandboxAdapterState().settingsSubscriptionCleanup = () => {
            (subscribe(), subscribe_2(), V(), K(), q(), Z(), J(), ie(), ae());
          }),
          b)
        )
          try {
            D("a change that arrived during sandbox startup");
          } catch (error) {
            reportSandboxErrorUnderStandIn(error, "configChangeAtStartNotApplied");
          }
        ((getSandboxAdapterState().runtimeInitialized = !0),
          (getSandboxAdapterState().readDenyRootFirstLookDue = !0),
          logFeatureOk("sandbox_init"));
      } catch (error) {
        ((h = !0), recordSandboxInitFailure(error));
      }
    })()),
    h)
  ) {
    n.initializationPromise = void 0;
    return;
  }
  return n.initializationPromise;
}
//@ chunk-fq0cr76a.js:1051128-1051353 placement
var WINDOWS_START_NOTICE = "Starting the sandbox\u2026 Setting file permissions can take a few minutes.",
  WINDOWS_PERMISSION_REMOVAL_NOTICE =
    "Removing this session's sandbox file permissions\u2026 This can take a few minutes. Don't close this window.",
  EXIT_SIGNALS = ["SIGINT", "SIGTERM"];
//@ chunk-fq0cr76a.js:1051353-1051402 placement
function windowsSandboxStartStore() {
  return getProcessSandboxState().windowsStartBeganAtMs;
}
//@ chunk-fq0cr76a.js:1051402-1051522 placement
function announceWindowsPermissionRemoval() {
  let e = getSandboxAdapterState();
  if (!e.permissionRemovalAnnounced && e.sandboxRuntimeIsUp)
    ((e.permissionRemovalAnnounced = !0), writeStderrNotice(WINDOWS_PERMISSION_REMOVAL_NOTICE));
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
function DV() {
  return Pot({ srtWin: tD() });
}
//@ chunk-fq0cr76a.js:1051628-1051852 placement
async function ensureSelfExecGrant(e = DV) {
  let n = getSandboxAdapterState(),
    { selfExecGrantAttempt: selfExecGrantAttempt, dependencyProbeGeneration: dependencyProbeGeneration } = n,
    h = await grantExecutableReadToSandboxGroup({
      exePath: process.execPath,
      previous: selfExecGrantAttempt,
      getUserStatus: e,
    });
  if (h !== selfExecGrantAttempt && dependencyProbeGeneration === n.dependencyProbeGeneration)
    n.selfExecGrantAttempt = h;
}
//@ chunk-fq0cr76a.js:1051852-1051896 placement
function PV(e) {
  return Au([e], { mode: "deny" });
}
//@ chunk-fq0cr76a.js:1051896-1052708 placement
async function installWindowsNativeDenies(e) {
  let nativeDenies = getSandboxAdapterState().nativeDenies;
  try {
    let r = getSandboxUserStatus(),
      s = getSandboxAdapterState().builtConfigConfiguredDenies.get(e);
    if (r === void 0 || s === void 0) return;
    if (env.CLAUDE_CODE_SANDBOX_LEAVE_DENIES_TO_SRT_WIN) {
      logFeatureSad("sandbox_windows_native_denies", "switched_off", { at_start: !0 });
      return;
    }
    let h = {
        write: r,
        user: await Pot({ srtWin: tD() }),
        grantRoots: Au([...e.filesystem.allowWrite, ...(e.filesystem.allowRead ?? [])], { mode: "grant" }),
      },
      y = await writeWindowsDenyEntries({
        ...h,
        lists: e.filesystem,
        configured: s,
        atStart: !0,
        expand: PV,
      });
    if (nativeDenies !== void 0)
      getSandboxAdapterState().nativeDenies = {
        ...nativeDenies,
        now: mergeNativeDenyState(nativeDenies.now, y, e.filesystem),
      };
    else if (Nv(y)) getSandboxAdapterState().nativeDenies = { ...h, atStart: y, now: y };
    return Nv(y) ? y : void 0;
  } catch (error) {
    (logForDebugging(
      `[sandbox] Windows: Bun's sub-command did not write the deny entries (${errorMessage(error)}); srt-win writes them all`,
      { level: "warn" },
    ),
      logFeatureSad("sandbox_windows_native_denies", "start_threw", { at_start: !0 }));
    return;
  }
}
//@ chunk-fq0cr76a.js:1052708-1053391 placement
async function initializeWithStandingDenies({
  runtimeConfig: runtimeConfig,
  standing: standing,
  callback: callback,
  runtimeWasUp: runtimeWasUp,
}) {
  let h = dropAppliedNativeDenies(runtimeConfig.filesystem, standing);
  try {
    (installSandboxConfig(runtimeConfig), (getSandboxAdapterState().storedDenyListsMayBeShort = !0));
    let y = initializeSandboxRuntime({ ...runtimeConfig, filesystem: h }, callback);
    try {
      installSandboxConfig(runtimeConfig);
    } catch (error) {
      logForDebugging(
        `[sandbox] Windows: sandbox-runtime did not take Claude Code's full deny lists while it started (${errorMessage(error)}); they are installed again once its start ends`,
        { level: "warn" },
      );
    }
    await y;
  } catch (error) {
    if (!runtimeWasUp) getSandboxAdapterState().nativeDenies = void 0;
    try {
      reinstallIfDenyListsShort(runtimeConfig, h);
    } catch (error) {
      logForDebugging(
        `[sandbox] Windows: sandbox-runtime did not take Claude Code's full deny lists after the sandbox's start failed (${errorMessage(error)}); until it does, permission checks allow no write on account of the sandbox write allowlist`,
        { level: "warn" },
      );
    }
    throw error;
  }
  reinstallIfDenyListsShort(runtimeConfig, h);
}
//@ chunk-fq0cr76a.js:1053391-1053466 placement
async function initializeSandboxRuntime(e, n) {
  (await on.initialize(e, n), (getSandboxAdapterState().sandboxRuntimeIsUp = !0));
}
/**
 * Windows 原生拒绝列表可能不完整时（安装失败或已存的列表与新配置不一致）标记并打点，然后重新安装沙箱配置。
 */
//@ chunk-fq0cr76a.js:1053466-1053798 placement
function reinstallIfDenyListsShort(e, n) {
  let r = on.getConfig()?.filesystem,
    storedDenyListsMayBeShort = getSandboxAdapterState().storedDenyListsMayBeShort,
    h = En(r?.denyRead, n.denyRead) && En(r?.denyWrite, n.denyWrite);
  if (!storedDenyListsMayBeShort && !h) return;
  ((getSandboxAdapterState().storedDenyListsMayBeShort = !0),
    pM("denyListsMayBeShort"),
    logFeatureSad(
      "sandbox_windows_native_denies",
      storedDenyListsMayBeShort ? "full_denies_install_failed" : "short_denies_stored_late",
      { at_start: !0 },
    ),
    installSandboxConfig(e));
}
//@ chunk-fq0cr76a.js:1053798-1053995 placement
function raceAbortSignal(e, n) {
  return n === void 0
    ? e
    : new Promise((r, s) => {
        let h = () => s(n.reason);
        if ((n.addEventListener("abort", h, { once: !0 }), n.aborted)) h();
        e.then(r, s).finally(() => n.removeEventListener("abort", h));
      });
}
//@ chunk-fq0cr76a.js:1053995-1054420 placement
async function withRenewedNativeDenies(e) {
  let nativeDenyRenewals = getSandboxAdapterState().nativeDenyRenewals,
    r = await (nativeDenyRenewals.queued ??
      (nativeDenyRenewals.running === void 0
        ? renewNativeDeniesTracked()
        : (nativeDenyRenewals.queued = nativeDenyRenewals.running.then(Q4, Q4))));
  if ((assertTaskOutputDirChainPlain(), verifyStagedMcpCallDir(), r === void 0)) return e;
  let s = e$(r, "denyRead"),
    h = e$(r, "denyWrite"),
    y = e?.filesystem;
  if (y === void 0 && s.length + h.length === 0) return e;
  let b = dropAppliedNativeDenies(y ?? { denyRead: [], denyWrite: [], allowWrite: [] }, r.now);
  return {
    ...e,
    filesystem: { ...b, denyRead: uniq([...b.denyRead, ...s]), denyWrite: uniq([...b.denyWrite, ...h]) },
  };
}
//@ chunk-fq0cr76a.js:1054420-1054529 placement
function renewNativeDeniesTracked() {
  let nativeDenyRenewals = getSandboxAdapterState().nativeDenyRenewals;
  return (
    (nativeDenyRenewals.running = renewNativeDenies().finally(() => {
      nativeDenyRenewals.running = void 0;
    })),
    nativeDenyRenewals.running
  );
}
//@ chunk-fq0cr76a.js:1054529-1054593 placement
function Q4() {
  return ((getSandboxAdapterState().nativeDenyRenewals.queued = void 0), renewNativeDeniesTracked());
}
//@ chunk-fq0cr76a.js:1054593-1054680 placement
function e$(e, n) {
  return [...e.now[n]].filter(([r, s]) => s !== !0 && !UV(e, n, r)).map(([r]) => r);
}
//@ chunk-fq0cr76a.js:1054680-1054746 placement
function UV({ atStart: atStart }, n, r) {
  return atStart[n].has(r) && atStart[n].get(r) !== !0;
}
//@ chunk-fq0cr76a.js:1054746-1054955 placement
function mergeDenyChanges(e, n) {
  let r = [...n.denyRead, ...n.denyWrite],
    s = new Set(r.filter(([, h]) => h).map(([h]) => h));
  return new Set([
    ...[...e].filter((h) => !s.has(h)),
    ...r.filter(([h, y]) => y === void 0 && !s.has(h)).map(([h]) => h),
  ]);
}
//@ chunk-fq0cr76a.js:1054955-1055378 placement
async function renewNativeDenies() {
  let nativeDenies = getSandboxAdapterState().nativeDenies;
  if (nativeDenies === void 0) return;
  let n = assertMarkedPathsResolved(on.getConfig())?.filesystem,
    installedConfiguredDenies = getSandboxAdapterState().installedConfiguredDenies;
  if (
    n === void 0 ||
    installedConfiguredDenies === void 0 ||
    getSandboxAdapterState().storedDenyListsMayBeShort
  )
    return n$();
  let s = {
      ...nativeDenies,
      lists: n,
      configured: mergeDenyChanges(installedConfiguredDenies, nativeDenies.atStart),
      atStart: !1,
      expand: PV,
    },
    h = await writeWindowsDenyEntries(s),
    y = t$(nativeDenies, h) ? h : await writeWindowsDenyEntries(s);
  if (!t$(nativeDenies, y)) return n$();
  let b = { ...nativeDenies, now: mergeNativeDenyState(nativeDenies.now, y, n) };
  if (getSandboxAdapterState().nativeDenies === nativeDenies) getSandboxAdapterState().nativeDenies = b;
  return b;
}
//@ chunk-fq0cr76a.js:1055378-1055425 placement
function t$(e, n) {
  return areNativeDeniesComplete(n, (r, s) => UV(e, r, s));
}
//@ chunk-fq0cr76a.js:1055425-1055499 placement
function n$() {
  throw (logFeatureBad("sandbox_exec", "windows_denies_not_renewed"), new SandboxProtectionNotRenewedError());
}
/**
 * 记录沙箱初始化失败：清空初始化 Promise 与运行时标志，保存错误码与给人看的原因（含自执行授权是否已加），标记是否因工作目录被拒，并上报 sandbox_init_failed。旧版名 initialize 错配。
 */
//@ chunk-fq0cr76a.js:1055499-1055963 file-local
function recordSandboxInitFailure(sandboxAskCallback) {
  let settings = getSandboxAdapterState();
  ((settings.initializationPromise = void 0),
    (settings.runtimeInitialized = !1),
    (settings.initializedWithTlsTerminate = !1),
    (settings.installedFilterRequestEnforcesAllowlist = !1),
    logForDebugging(`Failed to initialize sandbox: ${errorMessage(sandboxAskCallback)}`),
    (settings.initFailureCode =
      getErrnoCode(sandboxAskCallback) ??
      (sandboxAskCallback instanceof Error ? sandboxAskCallback.name : "unknown")),
    (getSandboxAdapterState().initFailureReason = describeWindowsSandboxRemedy(
      errorMessage(sandboxAskCallback),
      { programPermissionAdded: settings.selfExecGrantAttempt?.added },
    )),
    (settings.selfExecGrantAttempt = void 0),
    (settings.refusedOverWorkingFolder = sandboxAskCallback instanceof O0),
    logFeatureSad("sandbox_init", "sandbox_init_failed"));
}
//@ chunk-fq0cr76a.js:1055963-1056061 placement
function needsRestartForTlsTerminate() {
  let e = getSandboxAdapterState();
  return e.initializationPromise !== void 0 && !e.initializedWithTlsTerminate;
}
/**
 * 重建沙箱运行时配置；失败时记录并保留当前运行中的配置（返回 undefined）。
 */
//@ chunk-fq0cr76a.js:1056061-1056198 placement
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
/**
 * 门面 refreshConfig：沙箱启用时重建配置并装入运行时（失败保留旧配置）。
 */
//@ chunk-fq0cr76a.js:1056198-1056315 placement
function refreshConfig() {
  if (getSandboxAdapterState().configBuildFailed) return !1;
  if (!isSandboxingEnabled()) return !0;
  let e = tryBuildSandboxConfig();
  if (e === void 0) return !1;
  return (installSandboxConfig(e), !0);
}
//@ chunk-fq0cr76a.js:1056315-1056457 placement
async function resetSandbox() {
  (rw?.settingsSubscriptionCleanup?.(), (rw = void 0), process.off("exit", announceWindowsPermissionRemoval));
  for (let e of EXIT_SIGNALS) process.off(e, announceWindowsPermissionRemoval);
  return on.reset();
}
/**
 * 把命令（优先取建议规则 Bash(prefix:*) 的前缀）加入 sandbox.excludedCommands；管理员强制或 Windows 严格模式写 userSettings，否则 localSettings；强制下用户设置被禁用则拒绝。
 */
//@ chunk-fq0cr76a.js:1056457-1057166 placement = addToExcludedCommands (0.534)
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
  if (s && !isSettingSourceEnabled("userSettings"))
    return (
      logFeatureBad("sandbox_exclude_command", "user_settings_disabled"),
      { outcome: "refused", commandPattern: commandPattern }
    );
  let h =
    (s || (getPlatform() === "windows" && SandboxManager.isStrictSandboxModeConfigured())) &&
    isSettingSourceEnabled("userSettings")
      ? "userSettings"
      : "localSettings";
  return (
    updateSettingsForSourceWithTransform(h, (y) => {
      let b = y?.sandbox?.excludedCommands || [];
      if (b.includes(commandPattern)) return null;
      return { sandbox: { excludedCommands: [...b, commandPattern] } };
    }),
    logFeatureOk("sandbox_exclude_command"),
    { outcome: "added", commandPattern: commandPattern, settingsSource: h }
  );
}
/**
 * 沙箱命令结束后的清理：执行 scrub、复查标记，并在命令只写了自己的临时目录时决定是否推迟读禁止根复查。
 */
//@ chunk-fq0cr76a.js:1057166-1057777 placement
function afterSandboxedCommand(e, n, r) {
  let s = getSandboxAdapterState(),
    readDenyRootLookFinishedAt = s.readDenyRootLookFinishedAt;
  if (((s.readDenyRootLookFinishedAt = void 0), !r?.skipsScrubs))
    (scrubPlantedBareRepoIndicators(e), scrubSymlinkedDenyPaths(n));
  if ((rescreenLateSymlinkGrants(), r?.wroteOnlyItsOwnScratch)) {
    let installedReadDenyRootResolution = s.installedReadDenyRootResolution,
      filtered = [
        ...(installedReadDenyRootResolution?.resolution?.resolved ?? []),
        ...(installedReadDenyRootResolution?.maskSweepEntries ?? []),
      ].filter((D) => D.lookAgain !== void 0 || D.settledUnwatched);
    if (filtered.length === 0) {
      s.readDenyRootLookFinishedAt = readDenyRootLookFinishedAt;
      return;
    }
    let S = splitBindableWriteRoots(BP(), new Set([getCwdState()])),
      mapped = $d(S).map(toFoldedAbsolutePath);
    if (!(
      S.hasUndecidableEntry ||
      filtered.some((D) =>
        [...D.spellings, D.lookAgain?.stoppedAt?.path ?? D.root]
          .map((O) => toFoldedAbsolutePath(Ad(O) ? getGlobBaseDirectory_2(O) : O))
          .some((O) => mapped.some((L) => posixCovers(L, O))),
      )
    ))
      s.readDenyRootLookFinishedAt = readDenyRootLookFinishedAt;
  }
}
/**
 * Claude Code 侧的 SandboxManager 门面对象：汇总初始化、启用/必需判断、托管锁定、排除命令、网络与文件系统授权、wrapWithSandbox/wrapWithSandboxArgv、依赖检查、refreshConfig/reset 等；getConfig/getFsReadConfig 转发 vendor 的运行中配置并做额外处理。
 */
//@ chunk-fq0cr76a.js:1057777-1062179 placement = SandboxManager (0.43)
var SandboxManager = {
  initialize: initializeSandbox,
  isSandboxingEnabled: isSandboxingEnabled,
  isSandboxEnabledInSettings: getSandboxEnabledSetting,
  isPlatformInEnabledList: isPlatformInEnabledList,
  passesCheapSandboxGates: passesCheapSandboxGates,
  needsRestartForTlsTerminate: needsRestartForTlsTerminate,
  getSandboxUnavailableReason: getSandboxUnavailableReason,
  getSandboxSetUpAgainWarning: getSandboxSetUpAgainWarning,
  needsRestartForLocalConnections: needsRestartForLocalConnections,
  getSandboxRestartWarning: getSandboxRestartWarning,
  untilRestart: getLocalBindingRestartMode,
  areSandboxSettingsLockedByManagedSettings: areSandboxSettingsLockedByPolicy,
  getProfileReadSecurityWarnings: getProfileReadSecurityWarnings,
  getMaskCredentialWarning: getMaskCredentialWarning,
  canMaskCredentialWarningFire: canMaskCredentialWarningFire,
  isAutoAllowBashIfSandboxedEnabled: isAutoAllowBashIfSandboxedEnabled,
  isAutoAllowSupported: isAutoAllowSupported,
  areUnsandboxedCommandsAllowed: areUnsandboxedCommandsAllowed,
  isOnButNotRunning: isOnButNotRunning,
  isStrictSandboxModeConfigured: isStrictSandboxModeConfigured,
  isSandboxRequired: isSandboxRequired,
  areSandboxSettingsLockedByPolicy: areSandboxSettingsOverriddenByFlagOrPolicy,
  areUnsandboxedCommandsForbiddenByPolicy: isUnsandboxedForbiddenByGb,
  isUnsandboxedFallbackClosedByTrustedTier: isUnsandboxedFallbackClosedByTrustedTier,
  isUnsandboxedFallbackClosedByTrustedSource: isUnsandboxedFallbackClosedByTrustedSource,
  isSandboxedAttemptGateEnabled: Gw,
  setSandboxSettings: setSandboxSettings,
  getExcludedCommands: getExcludedCommands,
  getConfiguredNetworkAllowances: getConfiguredNetworkAllowances,
  isAllowAllUnixSocketsConfigured: isAllowAllUnixSocketsConfigured,
  getConfiguredFilesystemGrants: getConfiguredFilesystemGrants,
  wrapWithSandbox: wrapWithSandbox,
  wrapWithSandboxArgv: wrapWithSandboxArgv,
  invalidateDependencyCache: () => {
    let e = getSandboxAdapterState();
    (e.dependencyProbeGeneration++,
      e.checkDependenciesProbe.cache.clear?.(),
      (e.sandboxDisabledThisSession = !1),
      (e.initFailureReason = void 0),
      (e.configBuildFailed = !1),
      (e.realPathTwins = "unlisted"),
      (e.selfExecGrantAttempt = void 0));
  },
  refreshConfig: refreshConfig,
  addSessionAllowedHost: grantSessionHost,
  reset: resetSandbox,
  checkDependencies: checkSandboxDependencies,
  rememberedDependencyCheck: vue,
  checkDependenciesAsync: checkSandboxDependenciesAsync,
  getConfig: () => assertMarkedPathsResolved(on.getConfig()),
  getFsReadConfig: () => {
    let e = assertMarkedPathsResolved(on.getConfig());
    if (e?.filesystem.disabled)
      return {
        denyOnly: e.filesystem.denyRead.map(uy),
        allowWithinDeny: (e.filesystem.allowRead ?? []).map(uy),
      };
    let n = getSandboxAdapterState();
    if (n.fsReadConfigMemo !== void 0 && n.fsReadConfigMemo.cfg === e) return n.fsReadConfigMemo.result;
    let r = getPlatform(),
      s = e?.credentials?.files ?? [],
      mapped = s.filter((y) => y.mode === "deny").map((y) => y.path);
    if (
      (r === "linux" || r === "wsl") &&
      [...(e?.filesystem.denyRead ?? []), ...(e?.filesystem.allowRead ?? []), ...mapped].some((y) =>
        Ad(uy(y)),
      )
    ) {
      let y = buildReadDenyLists(e, mapped);
      return ((n.fsReadConfigMemo = { cfg: e, result: y }), y);
    }
    try {
      let fsReadConfig = on.getFsReadConfig();
      return ((n.fsReadConfigMemo = { cfg: e, result: fsReadConfig }), fsReadConfig);
    } catch (error) {
      logForDebugging(`[sandbox] getFsReadConfig threw; falling back to raw deny lists: ${error}`);
      let b = buildReadDenyLists(
        e,
        s.map((S) => S.path),
      );
      return ((n.fsReadConfigMemo = { cfg: e, result: b }), b);
    }
  },
  storedDenyListsMayBeShort: () => getSandboxAdapterState().storedDenyListsMayBeShort,
  getFsWriteConfig: () => {
    let e = assertMarkedPathsResolved(on.getConfig());
    if (e?.filesystem.disabled)
      return { allowOnly: e.filesystem.allowWrite.map(uy), denyWithinAllow: e.filesystem.denyWrite.map(uy) };
    return on.getFsWriteConfig();
  },
  getNetworkRestrictionConfig: () => {
    if (on.getConfig()?.network?.allowedDomains === void 0) return {};
    return on.getNetworkRestrictionConfig();
  },
  getIgnoreViolations: on.getIgnoreViolations,
  getLinuxGlobPatternWarnings: getLinuxGlobPatternWarnings,
  getDeniesDroppedForAnotherHost: xue,
  onDeniesDroppedForAnotherHostChanged: _ue,
  getUnbracketedIpv6DomainWarnings: getInvalidIpv6DomainEntries,
  getUnbracketedIpv6InjectHostWarnings: getInvalidInjectHostEntries,
  isSupportedPlatform: isSupportedPlatform,
  getAllowUnixSockets: on.getAllowUnixSockets,
  getAllowLocalBinding: on.getAllowLocalBinding,
  getAllowMachLookup: on.getAllowMachLookup,
  getEnableWeakerNestedSandbox: on.getEnableWeakerNestedSandbox,
  getProxyPort: on.getProxyPort,
  getProxyAuthToken: on.getProxyAuthToken,
  getSocksProxyPort: on.getSocksProxyPort,
  getLinuxHttpSocketPath: on.getLinuxHttpSocketPath,
  getLinuxSocksSocketPath: on.getLinuxSocksSocketPath,
  waitForNetworkInitialization: on.waitForNetworkInitialization,
  ensureInitializedForWrap: ensureInitializedForWrap,
  getSandboxViolationStore: on.getSandboxViolationStore,
  annotateStderrWithSandboxFailures: on.annotateStderrWithSandboxFailures,
  registerCommandNetworkLists: on.registerCommandNetworkLists,
  unregisterCommandNetworkLists: on.unregisterCommandNetworkLists,
  askCallbackDenyReason: on.askCallbackDenyReason === !0,
  denyAllNetworkOption: on.denyAllNetworkOption === !0,
  cleanupAfterCommand: (e, n, r) => {
    (on.cleanupAfterCommand(),
      afterSandboxedCommand(e, n, { wroteOnlyItsOwnScratch: r?.wroteOnlyItsOwnScratch }));
  },
  scrubAfterCommand: () => {
    afterSandboxedCommand();
  },
  cleanupAfterCommandWithoutScrubs: () => {
    (on.cleanupAfterCommand(), afterSandboxedCommand(void 0, void 0, { skipsScrubs: !0 }));
  },
  snapshotBareGitRepoScrubPaths: () => {
    let e = getSandboxAdapterState();
    return {
      paths: [...e.bareGitRepoScrubPaths.values()].map((n) => ({
        path: n.path,
        parent: cloneScrubParent(n.parent),
        unlinkable: n.unlinkable,
      })),
      pathsVouchedLocally: e.bareGitRepoScrubPathsVouchedLocally,
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
    denyOnly: uniq([...(e?.filesystem.denyRead ?? []), ...n].map(uy)),
    allowWithinDeny: (e?.filesystem.allowRead ?? []).map(uy),
  };
}
//@ chunk-fq0cr76a.js:1062315-1062348 placement
function Bp(e) {
  return isPathWithin(e, getOriginalCwd());
}
//@ chunk-fq0cr76a.js:1062348-1062386 placement
var i$ = 2097152,
  pde = { isPersonsRoot: !0 };
//@ chunk-fq0cr76a.js:1062386-1062511 placement
function setDenyJoinedPluginRoot(e) {
  let n = getPluginRegistry();
  return (
    (n.denyJoinedPluginRoot = e),
    () => {
      if (n.denyJoinedPluginRoot === e) n.denyJoinedPluginRoot = void 0;
    }
  );
}
//@ chunk-fq0cr76a.js:1062511-1062667 placement
function beginSandboxBringUp() {
  let e = getPluginRegistry(),
    { promise: promise, resolve: resolve } = Promise.withResolvers();
  return (
    (e.sandboxBringUp = promise),
    () => {
      if (e.sandboxBringUp === promise) e.sandboxBringUp = void 0;
      resolve();
    }
  );
}
//@ chunk-fq0cr76a.js:1062667-1062865 placement
function createFileAtChain(e, ...n) {
  let r = READ_LIMITS | tz | constants.O_DIRECTORY | constants.O_NOFOLLOW,
    s = [];
  try {
    let h = e;
    for (let y of n) {
      let b = openSync(h, r);
      (s.push(b), (h = `/proc/self/fd/${b}/${y}`));
    }
    closeSync(openSync(h, "wx"));
  } catch {
  } finally {
    for (let h of s) closeSync(h);
  }
}
/**
 * 在根目录下逐级创建私有目录（权限 700），Linux 通过 /proc/self/fd 逐级打开避免跟随链接；校验所有者、收紧权限，最后确认真实路径等于目标路径。
 */
//@ chunk-fq0cr76a.js:1062865-1064037 placement
function ensurePrivateDirChain(root, target, { isPersonsRoot: isPersonsRoot } = { isPersonsRoot: !1 }) {
  let relativePath = relative(root, target);
  if (relativePath.startsWith("..") || isAbsolute_2(relativePath)) return !1;
  let filtered = relativePath.split(sep).filter(Boolean);
  if (getPlatform() === "linux" || getPlatform() === "wsl") {
    let fd,
      openRoot = () => openSync(root, i$ | constants.O_DIRECTORY | constants.O_NOFOLLOW);
    try {
      try {
        fd = openRoot();
      } catch (childFd) {
        if (getErrnoCode(childFd) !== "ENOENT") return !1;
        (mkdirSync(root, { recursive: !0, mode: 448 }), (fd = openRoot()));
      }
      let stats = fstatSync(fd);
      if (!isPersonsRoot && process.getuid !== void 0 && stats.uid !== process.getuid())
        return (closeSync(fd), !1);
      if (!isPersonsRoot && (stats.mode & 18) !== 0) chmodSync(`/proc/self/fd/${fd}`, 448);
    } catch {
      return !1;
    }
    try {
      for (let w of filtered) {
        try {
          mkdirSync(`/proc/self/fd/${fd}/${w}`, { mode: 448 });
        } catch (error) {
          if (getErrnoCode(error) !== "EEXIST") return !1;
        }
        let R;
        try {
          R = openSync(`/proc/self/fd/${fd}/${w}`, i$ | constants.O_DIRECTORY | constants.O_NOFOLLOW);
        } catch {
          return !1;
        }
        (closeSync(fd), (fd = R));
      }
      return readlinkSync(`/proc/self/fd/${fd}`) === target;
    } catch {
      return !1;
    } finally {
      closeSync(fd);
    }
  }
  let replaced = root.replace(/[\\/]+$/, "");
  try {
    mkdirSync(replaced, { recursive: !0, mode: 448 });
    let b = lstatSync(replaced);
    if (
      !b.isDirectory() ||
      (!isPersonsRoot &&
        getPlatform() !== "windows" &&
        process.getuid !== void 0 &&
        b.uid !== process.getuid())
    )
      return !1;
    if (!isPersonsRoot && getPlatform() !== "windows" && (b.mode & 18) !== 0) chmodSync(replaced, 448);
  } catch {
    return !1;
  }
  for (let b of filtered) {
    replaced = join_9(replaced, b);
    try {
      mkdirSync(replaced, { mode: 448 });
    } catch (error) {
      if (getErrnoCode(error) !== "EEXIST") return !1;
    }
    try {
      let S = lstatSync(replaced);
      if (!S.isDirectory() || S.isSymbolicLink()) return !1;
    } catch {
      return !1;
    }
  }
  try {
    return realpathSync(target) === target;
  } catch {
    return !1;
  }
}
/**
 * 任一托管/可信层设置了 sandbox.filesystem.allowManagedReadPathsOnly 时为真：allowRead 只认可信层。
 */
//@ chunk-e6aww6q8.js:1909100-1909192 fingerprint = shouldAllowManagedReadPathsOnly (0.819)
function shouldAllowManagedReadPathsOnly() {
  return getAllPolicyTierSettings().some((e) => e.sandbox?.filesystem?.allowManagedReadPathsOnly === !0);
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
