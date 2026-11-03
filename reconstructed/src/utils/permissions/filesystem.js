/**
 * utils/permissions/filesystem.ts
 *
 * 文件读写权限判定：工作目录与规则模式（gitignore 语义、按规则来源定根）、危险文件/目录与 Claude 设置/配置路径的自动编辑安全检查、内部可读写路径（计划、scratchpad、记忆、配置目录禁区）及权限建议生成。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/filesystem.ts
 * pieces: chunk-18hwfzwa.js (1), chunk-82kqcve8.js (185), chunk-8wvtd8sr.js (1), chunk-axmbhcjg.js (3), chunk-bhhkxwra.js (1), chunk-fq0cr76a.js (4), chunk-tb11za84.js (1)
 * attribution: fingerprint 9, facade-majority 87, callgraph-witnessed 1, layout 80, file-local 4, sole-consumer 4, placement 8, affinity 3
 */
import {
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
  join as join_12,
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  posix,
  posix as posix_2,
  posix as posix_3,
  posix as posix_4,
  posix as posix_5,
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  normalize,
  normalize as normalize_2,
  normalize as normalize_3,
  resolve,
  resolve as resolve_2,
  resolve as resolve_3,
  resolve as resolve_4,
  resolve as resolve_5,
  resolve as resolve_6,
  isAbsolute,
  isAbsolute as isAbsolute_2,
  win32,
  win32 as win32_2,
  win32 as win32_3,
  win32 as win32_4,
  win32 as win32_5,
} from "path";
import { homedir, homedir as homedir_2, hostname, hostname as hostname_2 } from "os";
import { randomBytes } from "crypto";
import {
  isDiskless,
  getOriginalCwd,
  getProjectConfigRoot,
  getFlagAgentsFilePaths,
  getFlagMcpConfigFilePaths,
  getSessionId,
  getOriginalCwdOrNull,
  getFlagSettingsPath,
  getRootSession,
  getProjectRoot,
} from "../../bootstrap/state.js";
import {
  expandPath,
  windowsPathToPosixPath,
  B8,
  containsPathTraversal,
  anchorPathUnnormalized,
  expandPathOrNull,
  getDirectoryForPath,
} from "../path.js";
import { f3, MJ } from "../plugins/syncedItems.js";
import { foldName, dbr, isProtectedDirPath, regExp as regExp_3, Yps } from "./protectedDirNames.js";
import { getPlatform } from "../platform.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import {
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  getRuleAnchorRootForSource,
} from "../settings/settings.js";
import { USER_SETTINGS_FILE_NAMES } from "../settings/settingsFileParsing.js";
import { Mne } from "../settings/mdm/settings.js";
import { WSL_MANAGED_SETTINGS_DIR } from "../settings/mdm/wslRegistry.js";
import { uniq } from "../collections.js";
import { getSessionPathsCache, Emi } from "../sessionPathsCache.js";
import {
  walkPermissionCheckPaths,
  getFsImplementation,
  getPathsForPermissionCheck,
  permissionCheckSpellings,
  resolveDeepestExistingAncestorSync,
  hasUntouchableRecordSpellingStrictAsync,
  safeResolvePath,
} from "../fsOperations.js";
import { logForDebugging } from "../debug.js";
import { Mn, normalizeDosDevicePath, Qn, cl, isMacSpecialPath, uncHostOf } from "../pathClassification.js";
import {
  foldPathSegments,
  isPluginDirReadable,
  scanCommandProducerDirs,
  pluginRootDirs,
  isInCommandProducerDir,
} from "../plugins/pluginCachePaths.js";
import { logError } from "../log.js";
import { getSettingsWatchPaths } from "../../services/remoteManagedSettings/consentRecords.js";
import { getClaudeConfigDir, getClaudeConfigDirOrNull } from "../envUtils.js";
import { isManagedSettingsDropInName } from "../settings/managedFileSettings.js";
import { normalizeFilePath } from "../commitAttribution.js";
import { getErrnoCode, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { getDropInDir } from "../fileStateCache.js";
import { OAt } from "../../services/workflow/scriptFile.js";
import { getCwd, oZt, gl } from "../cwd.js";
import { getProjectDir } from "../sessionStorage.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getClaudeTempDirRealpath, Sx } from "../tempDirRealpaths.js";
import { isSystemVolumePath } from "./protectedDirs.js";
import {
  classifyWindowsPathPrefix,
  findTokenSequenceMatches,
  uncToDrivePath,
  VEr,
  zje,
  iks,
} from "../windowsProfileFolders.js";
import {
  normalizeWin32Path,
  describeIgnorePatternSkip,
  warnUnusableIgnorePattern,
} from "../ignorePatterns.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { HD, unresolvablePathMessage } from "../invisibleChars.js";
import { env } from "../env.js";
import { getWIFProfileStoreDenyPaths } from "../wifProfile.js";
import {
  MEMORY_TOGGLED_OFF_REASON,
  NO_CONFIG_HOME_DENY_REASON,
  OUTSIDE_WRITES_BLOCKED_DENY_REASON,
  SETTINGS_WRITES_BLOCKED_DENY_REASON,
  RESTRICTED_MODE_DENY_REASON,
  OUTSIDE_READS_BLOCKED_DENY_REASON,
  OUTSIDE_WORKING_DIRECTORIES_ASK_REASON,
} from "../../types/permissions.js";
import { iM, CL, Rke } from "../fsJunctions.js";
import {
  isWslUncPath,
  n_,
  isDifferentNetworkLocation,
  Ya,
  isNetDir,
  tP,
  classifyHomeMount,
} from "../networkPaths.js";
import { containsVulnerableUncPath } from "../shell/readOnlyCommandValidation.js";
import { encodeControlChars } from "../sanitization.js";
import { getNonProjectAdditionalDirectories } from "../../components/agents/AgentsMenu.js";
import { findCanonicalGitRoot, findGitRootRecheckingNegative } from "../git.js";
import { resolveWslGitDir } from "../wslPaths.js";
import { Kt } from "../../services/orgMemory/memoryStores.js";
import { rootAliasMountPoints, pathBelowRootAlias, isWslMountInfoUnreadable } from "../wslMounts.js";
import {
  escapeRuleContent,
  unescapeRuleContent,
  permissionRuleValueFromString,
} from "./permissionRuleParser.js";
import { FILE_EDIT_TOOL_NAME } from "../../tools/FileEditTool/constants.js";
import { FILE_READ_TOOL_NAME } from "../../tools/FileReadTool/constants.js";
import {
  getContentRulesForToolName,
  getDenyRuleForTool,
  getDenyRules,
  getAskRuleForTool,
  NARROWING_RULE_SOURCES,
  getAskRules,
} from "./permissions.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { hasWildcards, matchWildcardPattern } from "./shellRuleMatching.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { stripNonPrintable } from "../truncateGraphemes.js";
import { toolMatchesName } from "../../Tool.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { HostScoped } from "../hostScoped.js";
import {
  isAutoMemoryHeldForSession,
  getMemoryBaseDirOrNull,
  hasNoAutoMemPath,
  isAutoMemPath,
  mayBeAutoMemPath,
  hasAutoMemPathOverride,
  isAutoMemPathSafeForCarveout,
  isOwnProjectAutoMemPathSafeForCarveout,
  AUTO_MEM_WRITE_ALLOW_REASON,
} from "../../memdir/paths.js";
import { L9r, createReadRuleSuggestion } from "./PermissionUpdate.js";
import { isSkillDirGlob } from "../../components/permissions/hooks.js";
import { requireAllAllowed } from "../../tools/BashTool/bashSecurity.js";
import { getPlanFilePath_2 } from "../plans.js";
import { isInsideAgentMemoryDir } from "../../tools/AgentTool/agentMemory.js";
import { isAutoMemPathFromRepoSettings } from "./readBlock.js";
import { toolResultsDir } from "../toolResultStorage.js";
import { pw } from "../localhost.js";
import { getAliasSpellings } from "../../services/homeSeed/homeInventory.js";
import { hor } from "./sensitivePaths.js";

/**
 * 自动编辑的危险目录名表：.git .vscode .idea .claude .husky .cargo .devcontainer .yarn .mvn（比 2.1.88 多后五个）；同一语句还定义多段危险子路径 DANGEROUS_SUBPATHS = ['.config/git']。checkPathSafetyForAutoEdit 用它判定是否需要人工确认。
 */
//@ chunk-82kqcve8.js:231561-231674 facade-majority = DANGEROUS_DIRECTORIES (0.514)
var DANGEROUS_DIRECTORIES = [
    ".git",
    ".vscode",
    ".idea",
    ".claude",
    ".husky",
    ".cargo",
    ".devcontainer",
    ".yarn",
    ".mvn",
  ],
  DANGEROUS_SUBPATHS = [".config/git"];
/**
 * 路径比较前的大小写归一：toLowerCase，并把土耳其无点 ı 与长 s ſ 折成 i/s，防止 Unicode 大小写绕过。
 */
//@ chunk-82kqcve8.js:231674-231758 facade-majority
function normalizeCaseForComparison(path) {
  return path
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017f/g, "s");
}
/**
 * 判断路径是否落在项目或用户的 .claude/skills/<名>/ 下，是则返回 {skillName, pattern:"/.claude/skills/<名>/**" 或 "~/.claude/skills/<名>/**"}，用于“仅允许编辑这个 skill”建议；名字含通配、..、反斜杠、内置/保留 skill 名或子路径再含 .claude 时返回 null。
 */
//@ chunk-82kqcve8.js:231758-232518 fingerprint = getClaudeSkillScope (1)
function getClaudeSkillScope(filePath) {
  if (isDiskless()) return null;
  let absolutePath = expandPath(filePath),
    absolutePathLower = normalizeCaseForComparison(absolutePath),
    bases = [
      { dir: expandPath(join(getOriginalCwd(), ".claude", "skills")), prefix: "/.claude/skills/" },
      { dir: expandPath(join(homedir(), ".claude", "skills")), prefix: "~/.claude/skills/" },
    ];
  for (let { dir: dir, prefix: prefix } of bases) {
    let dirLower = normalizeCaseForComparison(dir);
    for (let S of [sep, "/"])
      if (absolutePathLower.startsWith(dirLower + S.toLowerCase())) {
        let rest = absolutePath.slice(dir.length + S.length),
          slash = rest.indexOf("/"),
          P = sep === "\\" ? rest.indexOf("\\") : -1,
          L = slash === -1 ? P : P === -1 ? slash : Math.min(slash, P);
        if (L <= 0) return null;
        let skillName = rest.slice(0, L);
        if (!skillName || skillName === "." || skillName.includes("..")) return null;
        if (/[*?[\]]/.test(skillName) || skillName.includes("\\")) return null;
        if (
          (prefix === "~/.claude/skills/" || getUserSkillsBaseSpellings().includes(dirLower)) &&
          (f3(skillName) || MJ(skillName))
        )
          return null;
        let parts = rest.slice(L + 1).split(/[/\\]/);
        if (foldName(skillName) === ".claude" || parts.some((Z) => foldName(Z) === ".claude")) return null;
        return { skillName: skillName, pattern: prefix + skillName + "/**" };
      }
  }
  return null;
}
//@ chunk-82kqcve8.js:232518-232532 callgraph-witnessed = DIR_SEP (1)
var DIR_SEP = posix.sep;
/**
 * posix 风格的相对路径；Windows 上先把两端转成 posix 形式再算。
 */
//@ chunk-82kqcve8.js:232532-232638 facade-majority = relativePath (1)
function relativePath(from, to) {
  if (getPlatform() === "windows") {
    let posixFrom = windowsPathToPosixPath(from),
      posixTo = windowsPathToPosixPath(to);
    return posix.relative(posixFrom, posixTo);
  }
  return posix.relative(from, to);
}
/**
 * Windows 上把路径转成 posix 形式，其他平台原样返回。
 */
//@ chunk-82kqcve8.js:232638-232694 facade-majority
function toPosixPath(path) {
  if (getPlatform() === "windows") return windowsPathToPosixPath(path);
  return path;
}
/**
 * 所有设置文件路径：各 SETTING_SOURCES 的文件、每个配置目录下的用户设置文件名，WSL 下再加 Windows 侧 managed-settings.json。
 */
//@ chunk-82kqcve8.js:232694-232892 layout
function getAllSettingsFilePaths() {
  let filtered = SETTING_SOURCES.map((n) => getSettingsFilePathForSource(n)).filter((n) => n !== void 0);
  for (let n of getClaudeConfigDirCandidates())
    for (let r of Object.values(USER_SETTINGS_FILE_NAMES)) filtered.push(join(n, r));
  if (getPlatform() === "wsl" && Mne())
    filtered.push(join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"));
  return filtered;
}
//@ chunk-82kqcve8.js:232892-232904 layout
var SETTINGS_LINKS_CACHE_MS = 2000;
/**
 * 遍历每个设置文件的路径链，若末端是符号链接，把链上每种拼写（规范化后）映射回该设置文件；结果按路径集合缓存 2 秒。出错时 2 秒内视为没有链接。
 */
//@ chunk-82kqcve8.js:232904-233605 layout
function getSettingsFileLinkSpellings() {
  let e = new Map();
  try {
    let n = getLegacyLocalSettingsFilePath(),
      settingsPaths = uniq(n === void 0 ? getAllSettingsFilePaths() : [...getAllSettingsFilePaths(), n]),
      fsState = getSessionPathsCache(),
      joined = settingsPaths.join("\x00"),
      monotonicNow = Emi().monotonicNow(),
      settingsFileLinks = fsState.settingsFileLinks;
    if (
      settingsFileLinks !== void 0 &&
      settingsFileLinks.key === joined &&
      monotonicNow - settingsFileLinks.builtAt < SETTINGS_LINKS_CACHE_MS
    )
      return settingsFileLinks.files;
    fsState.settingsFileLinks = { key: joined, builtAt: monotonicNow, files: e };
    let linkMap = new Map();
    for (let R of settingsPaths) {
      let O = walkPermissionCheckPaths(R);
      if (O.unresolved)
        logForDebugging(
          `permissions: the walk of settings file ${R} did not reach its end; only the links it met are recorded`,
        );
      if (!O.leafIsSymlink) continue;
      for (let spelling of O.spellings)
        for (let L of uniq([spelling, Mn(spelling)]))
          if (!isClaudeSettingsPath_2(L)) linkMap.set(foldPathSegments(L), R);
    }
    return ((fsState.settingsFileLinks = { key: joined, builtAt: monotonicNow, files: linkMap }), linkMap);
  } catch (error) {
    return (
      logError(
        Error("the walk of the settings links threw; for two seconds no settings file counts as a link", {
          cause: error,
        }),
      ),
      e
    );
  }
}
/**
 * 返回 [当前项目根] 或 [项目根, 另一根目录]（第二个来自 lo()，未确认含义），用于 .claude 配置路径判定。
 */
//@ chunk-82kqcve8.js:233605-233662 layout
function getProjectRootDirs() {
  let e = getProjectConfigRoot();
  return e === null ? [getOriginalCwd()] : [getOriginalCwd(), e];
}
/**
 * 路径是否是 Claude 设置文件本身，或是指向设置文件的符号链接的某种拼写。
 */
//@ chunk-82kqcve8.js:233662-233712 facade-majority
function isClaudeSettingsPath(filePath) {
  return (
    getSettingsFileLinkSpellings().has(foldPathSegments(expandPath(filePath))) ||
    isClaudeSettingsPath_2(filePath)
  );
}
/**
 * 判断路径是否是 Claude Code 设置文件：任何 .claude/settings(.local).json、SETTING_SOURCES 的各文件、managed-settings drop-in 目录下文件，以及配置目录/项目 .claude 目录 realpath 后的同名文件。
 */
//@ chunk-82kqcve8.js:233712-234186 layout = isClaudeSettingsPath (0.91)
function isClaudeSettingsPath_2(filePath) {
  let expandedPath = expandPath(filePath),
    normalizedPath = foldPathSegments(expandedPath);
  if (
    normalizedPath.endsWith(`${sep}.claude${sep}settings.json`) ||
    normalizedPath.endsWith(`${sep}.claude${sep}settings.local.json`)
  )
    return !0;
  if (getAllSettingsFilePaths().some((settingsPath) => foldPathSegments(settingsPath) === normalizedPath))
    return !0;
  if (pathInAllowedWorkingPath_2(expandedPath, normalizedPath, managedDropInDirs())) return !0;
  let s = basename(normalizedPath);
  if (!SETTINGS_FILE_BASENAMES.map(foldName).includes(s)) return !1;
  let mapped = Object.values(USER_SETTINGS_FILE_NAMES).map(foldName);
  return [
    ...getClaudeConfigDirCandidates().map((w) => [w, mapped]),
    ...getProjectRootDirs().map((w) => [join(w, ".claude"), $c]),
  ].some(([w, S]) => {
    if (!S.includes(s)) return !1;
    try {
      let realpathSync = getFsImplementation().realpathSync(w);
      return join(foldPathSegments(realpathSync), s) === normalizedPath;
    } catch {
      return !1;
    }
  });
}
/**
 * 路径是否为 Claude 设置/配置文件：设置路径、--agents/--mcp-config 指定的文件、配置目录候选里的主体与凭据文件；同名时再按真实路径比较。
 */
//@ chunk-82kqcve8.js:234186-234512 layout
function isProtectedClaudeConfigFile(e) {
  if (isClaudeSettingsPath(e)) return !0;
  let n = foldPathSegments(expandPath(e)),
    r = getSettingsWatchPaths(getClaudeConfigDirCandidates()),
    mapped = [...getFlagAgentsFilePaths(), ...getFlagMcpConfigFilePaths(), ...r.bodies, ...r.vouchers].map(
      foldPathSegments,
    );
  if (mapped.includes(n)) return !0;
  let h = basename(n);
  if (!mapped.some((w) => basename(w) === h)) return !1;
  let y = getSettingsWatchPaths(
    getClaudeConfigDirCandidates().flatMap((w) => {
      try {
        return [getFsImplementation().realpathSync(w)];
      } catch {
        return [];
      }
    }),
  );
  return [...y.bodies, ...y.vouchers].some((w) => foldPathSegments(w) === n);
}
//@ chunk-82kqcve8.js:234512-234562 layout = isInGlobalClaudeFolder (1)
function getClaudeConfigDirCandidates() {
  return uniq([getClaudeConfigDir(), join(homedir(), ".claude")]);
}
//@ chunk-82kqcve8.js:234562-234620 facade-majority
function isManagedSettingsDropInPath(e, { dirs: dirs }) {
  let r = expandPath(e);
  return pathInAllowedWorkingPath_2(r, foldPathSegments(r), dirs);
}
//@ chunk-82kqcve8.js:234620-234667 facade-majority
function isJsonSpelling(e) {
  let n = expandPath(e);
  return Ac(n, foldPathSegments(n));
}
//@ chunk-82kqcve8.js:234667-234744 layout
function Ac(e, n) {
  let r = basename(e);
  return n.endsWith(".json") || isManagedSettingsDropInName(dbr(r)) || isManagedSettingsDropInName(r);
}
/**
 * 判断一组路径拼写是否指向 Claude 设置文件：命中已知设置路径或托管目录即 certain；没有 .json 拼写为 none；有 .json 但托管 drop-in 目录尚未全部解析时为 possible。写阻断（blockWritesOutsideWorkingDirectories）据此决定是否拒绝。
 */
//@ chunk-82kqcve8.js:234744-234945 facade-majority
function settingsFileCertainty(e) {
  if (e.some((s) => isProtectedClaudeConfigFile(s) || isClaudeSettingsDir(s))) return "certain";
  let filtered = e.filter(isJsonSpelling);
  if (filtered.length === 0) return "none";
  let r = resolveManagedDropInDirs();
  if (filtered.some((s) => isManagedSettingsDropInPath(s, r))) return "certain";
  return r.allResolved ? "none" : "possible";
}
//@ chunk-82kqcve8.js:234945-235019 file-local
function pathInAllowedWorkingPath_2(path, toolPermissionContext, precomputedPathsToCheck) {
  if (!Ac(path, toolPermissionContext)) return !1;
  return precomputedPathsToCheck.some((wp) => foldPathSegments(wp) === dirname(toolPermissionContext));
}
//@ chunk-82kqcve8.js:235019-235126 layout
function resolveManagedDropInDirs() {
  return summarizeDropInDirResolution(
    managedDropInDirs().map((e) => {
      try {
        return { dir: e, located: normalizeFilePath(e) };
      } catch (error) {
        return { dir: e, error: error };
      }
    }),
  );
}
/**
 * 对每个托管设置 drop-in 目录异步调用定位函数（通常是 realpath），收集 {dir, located} 或 {dir, error}，用于得到 managed-settings.d 的全部真实拼写。
 */
//@ chunk-82kqcve8.js:235126-235270 facade-majority
async function managedDropInDirSpellingsAsync(e) {
  return summarizeDropInDirResolution(
    await Promise.all(
      managedDropInDirs().map(async (n) => {
        try {
          return { dir: n, located: await e(n) };
        } catch (error) {
          return { dir: n, error: error };
        }
      }),
    ),
  );
}
//@ chunk-82kqcve8.js:235270-235497 sole-consumer
function summarizeDropInDirResolution(e) {
  let n = [],
    r = !0,
    s = !0;
  for (let h of e) {
    if ((n.push(h.dir), !("located" in h))) {
      if (((s = !1), !logDropInResolveFailure(h.error, "a managed drop-in directory"))) r = !1;
      continue;
    }
    n.push(h.located, Mn(h.located));
  }
  return { dirs: uniq(n), allResolved: r, allLocated: s };
}
//@ chunk-82kqcve8.js:235497-235773 sole-consumer
function logDropInResolveFailure(e, n) {
  let r = getErrnoCode(e);
  if (r === "EACCES" || r === "EPERM" || r === "ENOTDIR")
    return (logForDebugging(`permissions: ${n} cannot be entered (${r}); compared by name`), !0);
  return (
    logForDebugging(
      `permissions: ${n} did not resolve (${r ?? "unknown"}); any .json write counts as a possible drop-in`,
      { level: "warn" },
    ),
    !1
  );
}
/**
 * 返回托管设置 drop-in 目录列表：平台默认的 managed-settings.d；WSL 且启用 Windows 侧托管设置时再加 Windows 侧目录。
 */
//@ chunk-82kqcve8.js:235885-235969 facade-majority = getManagedSettingsDropInDir (0.733)
function managedDropInDirs() {
  return [
    getDropInDir(),
    ...(getPlatform() === "wsl" && Mne() ? [join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d")] : []),
  ];
}
//@ chunk-82kqcve8.js:235969-236052 facade-majority = SETTINGS_FILES (1)
var $c = ["settings.json", "settings.local.json"],
  SETTINGS_FILE_BASENAMES = uniq([...Object.values(USER_SETTINGS_FILE_NAMES), ...$c]);
//@ chunk-82kqcve8.js:236052-236250 layout
function isClaudeSettingsDir(e) {
  let replaced = foldPathSegments(expandPath(e)).replace(/[\\/]+$/, "");
  if (basename(replaced) === foldName(".claude")) return !0;
  return getClaudeSettingsDirs().some((r) => {
    if (foldPathSegments(r) === replaced) return !0;
    try {
      let realpathSync = getFsImplementation().realpathSync(r);
      return foldPathSegments(realpathSync) === replaced;
    } catch {
      return !1;
    }
  });
}
//@ chunk-82kqcve8.js:236250-236379 layout
function getClaudeSettingsDirs() {
  let e = getSettingsFilePathForSource("policySettings");
  return uniq([
    ...getClaudeConfigDirCandidates(),
    ...getProjectRootDirs().map((n) => join(n, ".claude")),
    ...(e !== void 0 ? [dirname(e)] : []),
    ...managedDropInDirs(),
  ]);
}
/**
 * 汇总所有设置文件路径（各层 settings、附加目录里的 settings）和设置目录（含 drop-in 目录的父目录），去重后返回 {files, dirs}，供设置路径保护使用。
 */
//@ chunk-82kqcve8.js:236379-236482 facade-majority
function settingsLocationPaths() {
  return {
    files: uniq([...getAllSettingsFilePaths(), ...getFlagAgentsFilePaths(), ...getFlagMcpConfigFilePaths()]),
    dirs: uniq([...getClaudeSettingsDirs(), ...managedDropInDirs().map((e) => dirname(e))]),
  };
}
/**
 * 生成用于在命令/路径文本里粗查“是否提到设置文件”的小写关键串：cowork 设置名、managed-settings.json、managed-settings.d/、策略设置所在目录、drop-in 目录，以及 .claude 和配置目录名下各设置文件名的 / 与 \ 两种拼写。
 */
//@ chunk-82kqcve8.js:236482-236765 facade-majority
function settingsTextNeedles() {
  let e = uniq([".claude", basename(getClaudeConfigDir())]),
    n = getSettingsFilePathForSource("policySettings");
  return uniq([
    USER_SETTINGS_FILE_NAMES.cowork,
    "managed-settings.json",
    "managed-settings.d/",
    "managed-settings.d\\",
    ...(n !== void 0 ? [dirname(n)] : []),
    ...managedDropInDirs(),
    ...e.flatMap((r) => SETTINGS_FILE_BASENAMES.flatMap((s) => [`${r}/${s}`, `${r}\\${s}`])),
  ]).map((r) => r.toLowerCase());
}
/**
 * 返回 .claude 与配置目录基名中以点开头、长度大于 1 的小写目录词，用于文本级判断路径是否落在 Claude 设置目录。旧版名 isInGlobalClaudeFolder 与实际行为不符。
 */
//@ chunk-82kqcve8.js:236765-236880 facade-majority = isInGlobalClaudeFolder (1)
function settingsDirectoryWords() {
  return uniq([".claude", basename(getClaudeConfigDir())].map((e) => e.toLowerCase())).filter(
    (e) => e.length > 1 && e.startsWith("."),
  );
}
/**
 * 拼装 safetyCheck 决策原因里的分类器字段：普通情况透传 classifierApprovable/circuitBreaker/also；restricted 模式下强制 classifierApprovable=false、circuitBreaker='restrictedMode'，原熔断标签并入 also。
 */
//@ chunk-82kqcve8.js:236880-237188 facade-majority
function safetyCheckReasonFields(e, n) {
  if (!n)
    return {
      classifierApprovable: e.classifierApprovable,
      ...(e.circuitBreaker && { circuitBreaker: e.circuitBreaker }),
      ...(e.also && { also: e.also }),
    };
  let r = [...(e.circuitBreaker ? [e.circuitBreaker] : []), ...(e.also ?? [])];
  return { classifierApprovable: !1, circuitBreaker: "restrictedMode", ...(r.length > 0 && { also: r }) };
}
/**
 * 是否是 Claude 配置文件：设置文件（含链接）或项目根下 .claude/commands、.claude/agents、.claude/skills 里的文件。
 */
//@ chunk-82kqcve8.js:237188-237342 fingerprint = isClaudeConfigFilePath (1)
function isClaudeConfigFilePath(filePath) {
  if (isClaudeSettingsPath(filePath)) return !0;
  return getProjectRootDirs().some(
    (n) =>
      pathInWorkingPath(filePath, join(n, ".claude", "commands")) ||
      pathInWorkingPath(filePath, join(n, ".claude", "agents")) ||
      pathInWorkingPath(filePath, join(n, ".claude", "skills")),
  );
}
//@ chunk-82kqcve8.js:237506-237579 sole-consumer
function Ip(e) {
  let n = normalize(e);
  return n.startsWith(OAt()) && n.endsWith(".js");
}
//@ chunk-82kqcve8.js:237579-237654 file-local
function isSessionMemoryPath(e, n = getCwd()) {
  let normalizedPath = getProjectDir(n),
    s = normalize(e);
  return s === normalizedPath || s.startsWith(normalizedPath + sep);
}
/**
 * scratchpad 是否启用：GrowthBook tengu_scratch 打开，或 Artifact 工具可用（isArtifactToolEligible）。
 */
//@ chunk-82kqcve8.js:237654-237784 facade-majority = isScratchpadGateEnabled (0.594)
function isScratchpadEnabled() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_scratch", !1)) return !0;
  {
    let { isArtifactToolEligible: isArtifactToolEligible } = require("./chunk-tbts81qj.js");
    return isArtifactToolEligible();
  }
  return !1;
}
/**
 * 内置 skill 参考文件的解压根目录 <临时目录>/bundled-skills/<版本>/<随机 nonce>，进程内缓存；读权限对其放行。
 */
//@ chunk-82kqcve8.js:237784-238466 facade-majority = getBundledSkillsRoot (0.33)
function getBundledSkillsRoot() {
  let e = getSessionPathsCache();
  if (e.bundledSkillsRoot !== void 0 && !isDiskless()) return e.bundledSkillsRoot;
  let nonce = randomBytes(16).toString("hex");
  return (
    (e.bundledSkillsRoot = join(
      getClaudeTempDirRealpath(),
      "bundled-skills",
      {
        ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
        PACKAGE_URL: "@anthropic-ai/claude-code",
        README_URL: "https://code.claude.com/docs/en/overview",
        VERSION: "2.1.316",
        FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
        BUILD_TIME: "2026-10-30T23:28:13Z",
        GIT_SHA: "cd7ceb459c6864567b16a11f60101b24421475c1",
        HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
        DD_SOURCEMAP_GROUP: "default",
      }.VERSION,
      nonce,
    )),
    e.bundledSkillsRoot
  );
}
/**
 * 会话 scratchpad 目录 <项目临时目录>/<sessionId>/scratchpad，按 sessionId 缓存；无项目临时目录时为 null。
 */
//@ chunk-82kqcve8.js:238466-238684 facade-majority = getScratchpadDir (0.765)
function getScratchpadDir(sessionId = getSessionId()) {
  let n = getSessionPathsCache(),
    r = n.scratchpadDirBySessionId.get(sessionId);
  if (r !== void 0 && (r === null || !isDiskless())) return r;
  let s;
  try {
    s = getOriginalCwdOrNull() === null ? null : join(Sx(), sessionId, "scratchpad");
  } catch {
    s = null;
  }
  return (n.scratchpadDirBySessionId.set(sessionId, s), s);
}
/**
 * scratchpad 功能开启且非远程时创建会话 scratchpad 目录（0700）并返回路径，否则 null。
 */
//@ chunk-82kqcve8.js:238684-238806 facade-majority
async function ensureScratchpadDir() {
  if (isDiskless() || !isScratchpadEnabled()) return null;
  let e = getScratchpadDir();
  if (e === null) return null;
  return (await getFsImplementation().mkdir(e, { mode: 448 }), e);
}
//@ chunk-82kqcve8.js:238806-238948 layout
function getScratchpadComparePaths(path) {
  if (!isScratchpadEnabled()) return null;
  let n = getScratchpadDir();
  if (n === null) return null;
  let r = normalizeCaseForComparison(normalize(path)),
    s = normalizeCaseForComparison(n);
  return { comparePath: r, compareDir: s, prefix: s + sep };
}
/**
 * 路径是否是当前会话 scratchpad 目录本身或其下（大小写归一比较，并排除 s3 列出的特殊子路径）。
 */
//@ chunk-82kqcve8.js:238948-239101 facade-majority
function isScratchpadPath(path) {
  let n = getScratchpadComparePaths(path);
  if (n === null) return !1;
  return (
    n.comparePath === n.compareDir ||
    (n.comparePath.startsWith(n.prefix) &&
      !isProtectedDirPath(n.comparePath, n.prefix, DANGEROUS_FILES_LOWER))
  );
}
/**
 * 判断路径是否在当前会话的 scratchpad 目录下（按比较前缀，并排除跨越会话边界的拼写），用于把内部路径显示为 scratchpad。
 */
//@ chunk-82kqcve8.js:239101-239214 facade-majority
function isScratchpadDisplayPath(path) {
  let n = getScratchpadComparePaths(path);
  return (
    n !== null &&
    n.comparePath.startsWith(n.prefix) &&
    !isProtectedDirPath(n.comparePath, n.prefix, DANGEROUS_FILES_LOWER)
  );
}
//@ chunk-82kqcve8.js:239214-239341 layout
function getSeedAdminPaths(configDir) {
  let n = [foldPathSegments(join(configDir, "seed-admin"))];
  try {
    let realpathSync = getFsImplementation().realpathSync(configDir);
    n.push(foldPathSegments(join(realpathSync, "seed-admin")));
  } catch {}
  return uniq(n);
}
//@ chunk-82kqcve8.js:239341-239421 file-local
function isSeedAdminPath(absolutePath) {
  let projectDir = foldPathSegments(absolutePath);
  return getSeedAdminPaths(getClaudeConfigDir()).some(
    (r) => projectDir === r || projectDir.startsWith(r + sep),
  );
}
/**
 * 在每个配置目录候选路径下查找名为 entryName 的条目（jobs、daemon、shell-snapshots…），与给定路径的各拼写逐段比较（含 Windows 短名），返回每个命中的 {written, folded} 余下路径段。
 */
//@ chunk-82kqcve8.js:239421-239899 layout
function findConfigDirEntryMatches(spellings, entryName, spellingMode, pathCache, shortNameRe) {
  let y = (P) => uniq([P, isSystemVolumePath(P)]),
    w =
      pathCache.get(entryName) ?? getConfigDirEntryPaths(entryName).map((P) => getPathsForPermissionCheck(P));
  pathCache.set(entryName, w);
  let mapped = w
      .flatMap((P) => (spellingMode === "exact" ? P : expandWindowsPathSpellings(P, spellingMode).spellings))
      .flatMap(y)
      .map((P) => foldPathSegments(P).split(sep)),
    flattened = spellings.flatMap((P) => y(normalizeMsysDrivePath(P))),
    O = getPlatform() === "windows";
  return flattened.flatMap((P) => {
    let parts = normalize(P).split(sep),
      parts_2 = foldPathSegments(P).split(sep),
      G = parts_2.at(-1) === "" ? -1 : void 0,
      Z = O && spellingMode === "widest" ? classifyWindowsPathPrefix(P) : "named";
    return mapped.flatMap((ae) =>
      findTokenSequenceMatches(parts_2, ae, entryName, shortNameRe, Z).map((ee) => ({
        get written() {
          return parts.slice(ee, G);
        },
        get folded() {
          return parts_2.slice(ee, G);
        },
      })),
    );
  });
}
//@ chunk-82kqcve8.js:239899-239981 layout
function getConfigDirEntryPaths(entryName) {
  return uniq(
    getClaudeConfigDirCandidates().flatMap((n) =>
      ["", oZt ?? "", homedir()].map((r) => resolve(r, n, entryName)),
    ),
  );
}
/**
 * Windows 上把路径扩展成它可能打开的所有拼写（短名、尾点/空格、链接目标…，最多查 40 个）；非 Windows 原样。返回 {spellings, notFollowed}（未能解析的第一个拼写）。
 */
//@ chunk-82kqcve8.js:239981-240426 layout
function expandWindowsPathSpellings(paths, spellingMode) {
  if (getPlatform() !== "windows") return { spellings: [...paths], notFollowed: void 0 };
  if (spellingMode === "exact")
    return { spellings: uniq(paths.flatMap((w) => [w, normalizeDosDevicePath(w)])), notFollowed: void 0 };
  let pending = new Set(paths),
    visited = new Set(),
    lookupBudget = MAX_WINDOWS_SPELLING_LOOKUPS,
    notFollowed;
  for (let w of pending)
    for (let S of uniq([w, normalizeWin32Path(w)])) {
      let R = uncToDrivePath(S);
      if (pending.has(R) || visited.has(R)) continue;
      if ((visited.add(R), Qn(R))) continue;
      if (lookupBudget-- <= 0) {
        notFollowed ??= R;
        continue;
      }
      let O = walkPermissionCheckPaths(R);
      if (O.unresolved) notFollowed ??= R;
      for (let P of permissionCheckSpellings(O)) pending.add(P);
    }
  return { spellings: uniq([...pending, ...visited]), notFollowed: notFollowed };
}
//@ chunk-82kqcve8.js:240426-240436 layout
var MAX_WINDOWS_SPELLING_LOOKUPS = 40;
//@ chunk-82kqcve8.js:240436-241081 layout
function withWindowsSpellingNote(denial, spellingMode) {
  return spellingMode === "exact"
    ? denial
    : {
        ...denial,
        message: `${denial.message.replace(/\.?$/, ".")} Claude Code may have refused this only because it reads a Windows path that does not start with a drive letter (a share such as \\\\host\\C$\\x, a device path such as \\\\?\\Volume{GUID}\\x, or \\x), or that holds a name which Windows may strip (such as ".. " or "..."), as each path on this computer that it could open, and one of those is in the config directory. This path, the config directory's path, or a link on the way to either one is written that way. If the file is really somewhere else, such as on another computer, a person can edit it there.`,
      };
}
//@ chunk-82kqcve8.js:241081-241156 layout
function isAdoptJsonMatch({ folded: folded }) {
  return folded.length === 2 && folded[1].startsWith("adopt.json");
}
//@ chunk-82kqcve8.js:241156-241203 layout
var ADOPT_SHORT_NAME_RE = /^ad[0-9a-z]{0,4}~\d+(?:\.[^.]{0,3})?$/;
/**
 * 写入目标若落在配置目录的 jobs/（只放行后台会话的 tmp）、daemon/、daemon.json、shell-snapshots/、session-env/ 或 adopt.json（含 Windows 短名与临时文件替身），返回对应 deny 结果；Windows 上拼写无法确定时也拒绝。tengu_merry_boot 控制新规则是否生效。
 */
//@ chunk-82kqcve8.js:241203-243096 layout
function checkConfigDirInternalWrite(paths, spellingMode, pathCache) {
  if (
    spellingMode === "widest" &&
    getPlatform() !== "windows" &&
    readFlagWithOverride("tengu_merry_boot", { safe: !0 })
  )
    return;
  let { spellings: spellings, notFollowed: notFollowed } = expandWindowsPathSpellings(paths, spellingMode),
    y = findConfigDirEntryMatches(spellings, "jobs", spellingMode, pathCache);
  if (y.some(isAdoptJsonMatch)) return withWindowsSpellingNote(ADOPT_JSON_WRITE_DENIAL, spellingMode);
  if (!readFlagWithOverride("tengu_merry_boot", { safe: !0 }))
    return spellingMode === "widest" &&
      y.some(({ folded: folded }) => folded.length === 2 && ADOPT_SHORT_NAME_RE.test(folded[1]))
      ? {
          ...ADOPT_JSON_WRITE_DENIAL,
          message: `This file name has the shape of a Windows short name (such as ADOPT~1.JSO), which may open adopt.json. ${ADOPT_JSON_WRITE_DENIAL.message}. A name with no "~" followed by a digit is not refused for this reason.`,
        }
      : void 0;
  if (
    y.some(
      ({ written: written, folded: folded }) =>
        written[1] !== "tmp" || folded.some((O) => /^[. ]*(:|$)/.test(O.replace(regExp_3, ""))),
    )
  )
    return withRelativeConfigDirNote(withWindowsSpellingNote(JOBS_DIR_WRITE_DENIAL, spellingMode));
  for (let [S, R, O] of [
    ["daemon", void 0, DAEMON_DIR_WRITE_DENIAL],
    ["daemon.json", DAEMON_JSON_ALIAS_RE, DAEMON_JSON_WRITE_DENIAL],
    ["shell-snapshots", SHELL_SNAPSHOTS_SHORT_NAME_RE, SHELL_SNAPSHOTS_WRITE_DENIAL],
    ["session-env", SESSION_ENV_SHORT_NAME_RE, SESSION_ENV_WRITE_DENIAL],
  ])
    if (findConfigDirEntryMatches(spellings, S, spellingMode, pathCache, R).length > 0)
      return withRelativeConfigDirNote(withWindowsSpellingNote(O, spellingMode));
  return notFollowed === void 0
    ? void 0
    : {
        behavior: "deny",
        message: `Refusing to write ${HD(paths[0])}: on Windows this path, or a link on the way to it, may also open ${HD(notFollowed)}, and Claude Code could not work out where that leads on disk (a link or folder on the way could not be examined, the links do not resolve, or there were more than ${MAX_WINDOWS_SPELLING_LOOKUPS} other spellings to look up). So the write may land in the jobs, daemon, shell-snapshots or session-env folder or in daemon.json of the Claude Code config directory. The file tools do not write those. If the file is on this computer, name it by the plain drive path of the file itself, such as C:\\x, with no link, no share, and no name that ends in a dot or a space. If it is on another computer, a person can edit it there.`,
        decisionReason: {
          type: "other",
          reason: `On Windows, ${HD(paths[0])}, or a link on the way to it, may also open ${HD(notFollowed)}, and where that leads on disk could not be determined. So this may write to the jobs, daemon, shell-snapshots or session-env folder or to daemon.json of the Claude Code config directory, whose files Claude Code runs or acts on without asking anyone.`,
        },
      };
}
//@ chunk-82kqcve8.js:243096-243461 layout
function withRelativeConfigDirNote(denial) {
  return isAbsolute(getClaudeConfigDir())
    ? denial
    : {
        ...denial,
        message: `${denial.message} CLAUDE_CONFIG_DIR is empty or relative here, so the config directory is worked out from each of three folders: the current one, the one where Claude Code was started and the home folder. That may be the only reason this path counts. Unset CLAUDE_CONFIG_DIR or set it to an absolute path to avoid that.`,
      };
}
//@ chunk-82kqcve8.js:243461-243573 layout
var DAEMON_JSON_ALIAS_RE = /^daemon\.json\.tmp\.|^da[0-9a-z]{0,4}~\d+\.jso$/,
  SHELL_SNAPSHOTS_SHORT_NAME_RE = /^sh[0-9a-z-]{0,4}~\d+$/,
  SESSION_ENV_SHORT_NAME_RE = /^se[0-9a-z]{0,4}~\d+$/;
/**
 * 路径是否是 CLAUDE_CODE_HOST_CREDS_FILE 指向的宿主凭证文件（任一拼写）。
 */
//@ chunk-82kqcve8.js:243573-243745 layout
function isHostCredsFilePath(path) {
  let CLAUDE_CODE_HOST_CREDS_FILE = env.CLAUDE_CODE_HOST_CREDS_FILE;
  if (!CLAUDE_CODE_HOST_CREDS_FILE) return !1;
  let s =
      CLAUDE_CODE_HOST_CREDS_FILE.replace(getPlatform() === "windows" ? /[\\/]+$/ : /\/+$/, "") ||
      CLAUDE_CODE_HOST_CREDS_FILE,
    h = normalizeCaseForComparison(normalize(path));
  return getPathsForPermissionCheck(s).some((y) => normalizeCaseForComparison(normalize(y)) === h);
}
//@ chunk-82kqcve8.js:243745-244009 layout
function isProfileStorePath(path) {
  let n = getWIFProfileStoreDenyPaths();
  if (n === null) return !1;
  let r = normalizeCaseForComparison(normalize(path));
  if (
    n.dirs.some((dir) =>
      [dir, getPhysicalTwinPath(dir, { liveRoutesOnly: !0 })].some((h) => {
        if (h === null) return !1;
        let y = normalizeCaseForComparison(normalize(h));
        return r === y || r.startsWith(y + sep);
      }),
    )
  )
    return !0;
  return n.files.some((file) =>
    getPathsForPermissionCheck(file).some((h) => normalizeCaseForComparison(normalize(h)) === r),
  );
}
//@ chunk-82kqcve8.js:244009-244170 layout
function getPhysicalTwinPath(path, options) {
  let r;
  try {
    r = resolveDeepestExistingAncestorSync(getFsImplementation(), path, options);
  } catch (error) {
    return (logForDebugging(`Could not resolve the physical twin of ${path}: ${error}`), null);
  }
  return r === void 0 || r === path || dirname(r) === r ? null : r;
}
//@ chunk-82kqcve8.js:244170-244486 layout
var PROFILE_STORE_WRITE_DENIAL = {
  behavior: "deny",
  message:
    "The Anthropic profile store holds the sign-in that decides which organization policy applies; it cannot be written directly",
  decisionReason: {
    type: "safetyCheck",
    reason: "profile store write substitutes the credential and organization behind managed settings",
    classifierApprovable: !1,
  },
};
//@ chunk-82kqcve8.js:244486-244619 layout
function isSettingsReviewStorePath(path) {
  let n = foldPathSegments(path),
    r = join(homedir(), ".claude", "state");
  return [r, join(r, "settings-review.json")].some((s) =>
    getPathsForPermissionCheck(s).some((h) => foldPathSegments(h) === n),
  );
}
//@ chunk-82kqcve8.js:244619-244971 layout
var SETTINGS_REVIEW_STORE_WRITE_DENIAL = {
  behavior: "deny",
  message:
    "Staged Claude Code settings changes are the owner\u2019s to review in /settings-review; the review store cannot be written directly",
  decisionReason: {
    type: "safetyCheck",
    reason: "settings review store write substitutes a proposal the owner is about to accept",
    classifierApprovable: !1,
    circuitBreaker: "claudeSettingsFile",
  },
};
//@ chunk-82kqcve8.js:244971-244993 layout
function Ti(e) {
  return;
}
//@ chunk-82kqcve8.js:244993-245015 layout
function Ii(e) {
  return;
}
//@ chunk-82kqcve8.js:245015-245258 layout
var HOST_CREDS_WRITE_DENIAL = {
  behavior: "deny",
  message: "The host credentials file is managed by the host process; it cannot be written directly",
  decisionReason: {
    type: "safetyCheck",
    reason: "host-creds file rewrite redirects the bearer token",
    classifierApprovable: !1,
  },
};
//@ chunk-82kqcve8.js:245258-245344 layout
function normalizeMsysDrivePath(path) {
  return getPlatform() === "windows" && /^\/(?:cygdrive\/)?[A-Za-z]\//.test(path) ? B8(path) : path;
}
//@ chunk-82kqcve8.js:245344-249937 layout
var MEMORY_PAUSED_WRITE_DENIAL = {
    behavior: "deny",
    message: "Cannot write to memory while it is paused for this session; only the user can turn it back on.",
    decisionReason: { type: "safetyCheck", reason: MEMORY_TOGGLED_OFF_REASON, classifierApprovable: !1 },
  },
  MEMORY_PAUSED_READ_DENIAL = {
    behavior: "deny",
    message: "Cannot read memory while it is paused for this session; only the user can turn it back on.",
    decisionReason: { type: "safetyCheck", reason: MEMORY_TOGGLED_OFF_REASON, classifierApprovable: !1 },
  },
  SEED_ADMIN_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "~/.claude/seed-admin holds the private git directories of cloud-session uploads and is managed by Claude Code; it cannot be written directly",
    decisionReason: {
      type: "safetyCheck",
      reason: "seed-admin git configuration is a code-execution surface for the upload",
      classifierApprovable: !1,
    },
  },
  ADOPT_JSON_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "adopt.json is the bg-fork handoff carrier and is managed by the harness; it cannot be written directly",
    decisionReason: {
      type: "safetyCheck",
      reason: "adopt.json is a code-execution surface for the fork",
      classifierApprovable: !1,
    },
  },
  JOBS_DIR_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the jobs folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as CLAUDE~1 counts as the folder in its place. Claude Code restarts background sessions from the files there, so they cannot be written directly. Scratch files of a background session go in $CLAUDE_JOB_DIR/tmp. A person can stop, restart or remove a session in `claude agents`, or with `claude stop <id>`, `claude respawn <id>` or `claude rm <id>`.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code jobs folder. A file there can give a background session more permissions or run a command without asking anyone.",
      classifierApprovable: !1,
    },
  },
  DAEMON_DIR_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the daemon folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as CLAUDE~1 counts as the folder in its place. The service that runs background sessions acts on the files there, so they cannot be written directly. A person can check the service with `claude daemon status`.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code daemon folder. A file there can start a background session without asking anyone.",
      classifierApprovable: !1,
    },
  },
  DAEMON_JSON_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is daemon.json in the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude), or a link, temp file or short name that stands in for it; above it, a Windows short name such as CLAUDE~1 counts as the folder in its place. The service that runs background sessions starts the workers listed there, so it cannot be written directly. A person can change it in an editor.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code daemon.json, or to a file that stands in for it. The service that runs background sessions starts the workers listed there without asking anyone.",
      classifierApprovable: !1,
    },
  },
  SHELL_SNAPSHOTS_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the shell-snapshots folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as SHELL-~1 or CLAUDE~1 counts as the folder in its place. Each Bash command first runs a snapshot, kept there, of the shell setup (aliases, functions, options), so the files cannot be written directly. Claude Code takes a new snapshot each time it starts, so a person can change their shell startup file, such as ~/.bashrc or ~/.zshrc, and restart Claude Code.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code shell-snapshots folder. Each Bash command first runs a file from there, without asking anyone.",
      classifierApprovable: !1,
    },
  },
  SESSION_ENV_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the session-env folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as SESSIO~1 or CLAUDE~1 counts as the folder in its place. Claude Code runs the scripts that hooks leave there ahead of Bash commands, so they cannot be written directly. To set variables for later Bash commands, a person can add a SessionStart hook that appends export lines to the file named in $CLAUDE_ENV_FILE.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code session-env folder. Claude Code runs the scripts there ahead of Bash commands, without asking anyone.",
      classifierApprovable: !1,
    },
  },
  NO_CONFIG_DIR_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This session has no config folder to check the path against, so the write is denied. A retry is denied the same way.",
    decisionReason: { type: "safetyCheck", reason: NO_CONFIG_HOME_DENY_REASON, classifierApprovable: !1 },
  };
/**
 * 后台会话（CLAUDE_CODE_SESSION_KIND=bg）中，路径是否落在 $CLAUDE_JOB_DIR/tmp/ 下（且 CLAUDE_JOB_DIR 在配置目录 jobs/ 内）。
 */
//@ chunk-82kqcve8.js:249937-250184 layout
function isBgJobTmpPath(path) {
  if (env.CLAUDE_CODE_SESSION_KIND !== "bg") return !1;
  let envClaudeJobDir = process.env.CLAUDE_JOB_DIR;
  if (!envClaudeJobDir) return !1;
  let r = join(getClaudeConfigDir(), "jobs") + sep,
    s = normalize(envClaudeJobDir);
  if (!s.startsWith(r)) return !1;
  let h = s + sep + "tmp" + sep;
  if (!normalizeCaseForComparison(path).startsWith(normalizeCaseForComparison(h))) return !1;
  return !isProtectedDirPath(path, h, DANGEROUS_FILES_LOWER);
}
/**
 * 判断 UNC/网络路径是否位于 trustedNetworkDirectories 列出的可信网络根之下（要求同为网络路径形状，且 pathInWorkingPath 成立）；设备命名空间路径一律不可信。
 */
//@ chunk-82kqcve8.js:250184-250341 facade-majority
function isPathInTrustedNetworkRoot(path, trustedNetworkDirectories) {
  if (!trustedNetworkDirectories || trustedNetworkDirectories.size === 0) return !1;
  if (cl(path)) return !1;
  for (let r of trustedNetworkDirectories.values())
    for (let s of r) {
      if (Qn(path) !== Qn(s)) continue;
      if (pathInWorkingPath(path, s)) return !0;
    }
  return !1;
}
/**
 * 是否为不可信的 UNC 路径：NT 设备命名空间直接视为不可信；否则是 UNC 形状、不是本地映射且不在可信网络根下。
 */
//@ chunk-82kqcve8.js:250341-250408 facade-majority
function isUntrustedUncPath(path, trustedNetworkDirectories) {
  if (iM(path)) return !0;
  return Qn(path) && !isWslUncPath(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories);
}
//@ chunk-82kqcve8.js:250408-250449 facade-majority
function isUntrustedAutomountPath(path, trustedNetworkDirectories) {
  return n_(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories);
}
//@ chunk-82kqcve8.js:250449-250814 layout = isDangerousFilePathToAutoEdit (0.9)
function getProjectRootSegmentDepth(pathSegments) {
  let n = 0;
  for (let r of getResolvedWorkingDirPaths(getOriginalCwd())) {
    let pathSegments_2 = expandPath(r).split(sep);
    if (pathSegments_2.length > 1 && pathSegments_2.at(-1) === "") pathSegments_2.pop();
    let h = 0;
    while (
      h < pathSegments_2.length &&
      h < pathSegments.length &&
      (pathSegments[h] === pathSegments_2[h] ||
        (h === 0 &&
          /^[a-z]:$/i.test(pathSegments[h]) &&
          pathSegments[h].toLowerCase() === pathSegments_2[h].toLowerCase()))
    )
      h++;
    if (h === pathSegments_2.length) {
      let y = h;
      for (let w = 0; w < h; w++)
        if (
          foldName(pathSegments_2[w]) === ".claude" &&
          foldName(pathSegments_2[w + 1] ?? "") !== "worktrees"
        ) {
          y = w;
          break;
        }
      if (y > n) n = y;
    }
  }
  return n;
}
//@ chunk-82kqcve8.js:250814-250927 layout = isInGlobalClaudeFolder (1)
function isInGlobalClaudeFolder(filePath) {
  let parts = expandPath(filePath).split(sep),
    absolutePath = getProjectRootSegmentDepth(parts),
    s = 0;
  for (let h = absolutePath; h < parts.length; h++) if (foldName(parts[h]) === ".claude") s++;
  return s;
}
/**
 * 规则以 ~/.claude/ 或 /.claude/ 开头时，判断路径是否在对应根的 .claude 之下、且其后还有名为 .claude 的段。
 */
//@ chunk-82kqcve8.js:250927-251340 layout
function hasNestedClaudeDirBelowRuleRoot(e, n) {
  let r = n.startsWith("~/.claude/") ? homedir() : n.startsWith("/.claude/") ? getOriginalCwd() : null;
  if (r === null) return !1;
  let parts = expandPath(join(r, ".claude")).split(sep);
  if (parts.length > 1 && parts.at(-1) === "") parts.pop();
  let parts_2 = expandPath(e).split(sep);
  for (let y = 0; y < parts.length; y++)
    if (
      parts_2[y] !== parts[y] &&
      !(y === 0 && /^[a-z]:$/i.test(parts_2[y] ?? "") && parts_2[y].toLowerCase() === parts[y].toLowerCase())
    )
      return !1;
  for (let y = parts.length; y < parts_2.length; y++) if (foldName(parts_2[y]) === ".claude") return !0;
  return !1;
}
/**
 * 路径是否属于危险位置、不能自动编辑：插件目录、命令产出目录、不可信 UNC/自动挂载路径、危险目录（.claude 下 skills/agents/commands/worktrees 例外处理）、危险子路径、危险文件名。
 */
//@ chunk-82kqcve8.js:251340-252091 layout
function isDangerousFilePathToAutoEdit(filePath, allowClaudeSubdirs, options) {
  let absolutePath = expandPath(filePath),
    parts = absolutePath.split(sep),
    at = parts.at(-1);
  if (isPluginDirReadable(absolutePath)) return !0;
  if (
    !n_(absolutePath) &&
    (!CL(absolutePath) || isWslUncPath(absolutePath)) &&
    (scanCommandProducerDirs(absolutePath, pluginRootDirs(), getClaudeConfigDir(), { maxAgeMs: 5000 }) ||
      isInCommandProducerDir(absolutePath))
  )
    return !0;
  if (isUntrustedUncPath(filePath, options)) return !0;
  if (isUntrustedAutomountPath(filePath, options)) return !0;
  let sawProjectClaudeDir = !1,
    projectRootDepth = getProjectRootSegmentDepth(parts);
  for (let R = 0; R < parts.length; R++) {
    let O = parts[R],
      P = foldName(O);
    if (Yps(P)) return !0;
    for (let L of DANGEROUS_DIRECTORIES) {
      if (P !== normalizeCaseForComparison(L)) continue;
      if (L === ".claude") {
        let j = R >= projectRootDepth;
        if (sawProjectClaudeDir) return !0;
        let G = parts[R + 1],
          Z = G ? foldName(G) : void 0;
        if (allowClaudeSubdirs && Z) {
          if (Z === "skills" || Z === "agents" || Z === "commands") {
            if (j) sawProjectClaudeDir = !0;
            break;
          }
          if (Z === "scheduled_tasks.json" && R + 1 === parts.length - 1) break;
        }
        if (Z === "worktrees") {
          if (j) sawProjectClaudeDir = !0;
          break;
        }
      }
      return !0;
    }
  }
  for (let R of DANGEROUS_SUBPATHS) {
    let parts_2 = R.split("/");
    for (let P = 0; P + parts_2.length <= parts.length; P++)
      if (parts_2.every((L, j) => foldName(parts[P + j]) === normalizeCaseForComparison(L))) return !0;
  }
  if (at) {
    let R = foldName(at);
    if (DANGEROUS_FILES.some((O) => normalizeCaseForComparison(O) === R)) return !0;
  }
  return !1;
}
//@ chunk-82kqcve8.js:252091-252133 facade-majority
function hasSuspiciousWindowsPathPattern(e, n) {
  return classifySuspiciousWindowsPathPattern(e, n) !== void 0;
}
/**
 * 给可疑 Windows 路径形状分类并返回原因码：nt_device_namespace、colon_past_drive_position（Windows/WSL 上盘符后再出现冒号，即 ADS）、tilde_digit（8.3 短名）、device_path_prefix（\\?\ 等）、trailing_dot_or_whitespace、dos_device_suffix、dot_run_segment（...）、unc_or_webdav_form（不可信网络根）。无可疑返回 undefined。
 */
//@ chunk-82kqcve8.js:252133-252732 facade-majority
function classifySuspiciousWindowsPathPattern(e, n) {
  if (iM(e)) return "nt_device_namespace";
  if (getPlatform() === "windows" || getPlatform() === "wsl") {
    if (e.indexOf(":", 2) !== -1) return "colon_past_drive_position";
  }
  if (VEr.test(e)) return "tilde_digit";
  if (e.startsWith("\\\\?\\") || e.startsWith("\\\\.\\") || e.startsWith("//?/") || e.startsWith("//./"))
    return "device_path_prefix";
  let parts = e.split(/[/\\]/);
  for (let s of parts) {
    if (s === "" || s === "." || s === "..") continue;
    if (zje.test(s)) return "trailing_dot_or_whitespace";
  }
  if (iks.test(e)) return "dos_device_suffix";
  if (/(^|\/|\\)\.{3,}(\/|\\|$)/.test(e)) return "dot_run_segment";
  if (containsVulnerableUncPath(e, !0) && !isWslUncPath(e) && !isPathInTrustedNetworkRoot(e, n))
    return "unc_or_webdav_form";
  return;
}
/**
 * 远程模式下编辑 Claude 配置的豁免是否适用：要求 isRemoteMode、非 restricted、当前与改写前都不是 auto、且不是沿用 auto 分类器的 plan。
 */
//@ chunk-82kqcve8.js:252732-252917 facade-majority
function remoteConfigEditExemptionApplies(e) {
  let n = e.mode === "plan" && (e.prePlanMode === "auto" || !!e.strippedDangerousRules);
  return e.isRemoteMode === !0 && !e.restricted && e.mode !== "auto" && !n && e.modeBeforeRewrite !== "auto";
}
/**
 * 写权限询问时是否附带“切到 acceptEdits”建议：改写前模式不是 auto 类；default 模式总是附带；plan 模式仅当进入 plan 前的模式不是 auto 类时附带。
 */
//@ chunk-82kqcve8.js:252917-253043 facade-majority
function acceptEditsSuggestionApplies(e) {
  if (Sc(e.modeBeforeRewrite)) return !1;
  if (e.mode === "default") return !0;
  return e.mode === "plan" && !Sc(e.prePlanMode);
}
//@ chunk-82kqcve8.js:253043-253135 layout
function Sc(e) {
  return e === "auto" || e === "bypassPermissions" || e === "acceptEdits" || e === "dontAsk";
}
/**
 * 自动编辑（acceptEdits/自动放行）前的路径安全检查：远程模式一律不安全；可疑 Windows 路径（设备命名空间、短名、尾点、UNC…）；Claude 设置文件（含经链接，classifierApprovable 取决于是否经链接）；Claude 配置文件（commands/agents/skills）；危险文件/目录（Xp）。返回 {safe:true} 或 {safe:false, message, classifierApprovable, circuitBreaker?}。
 */
//@ chunk-82kqcve8.js:253135-254319 facade-majority = checkPathSafetyForAutoEdit (0.702)
function checkPathSafetyForAutoEdit(path, pathsToCheck, r, s, trustedNetworkDirectories) {
  if (isDiskless())
    return {
      safe: !1,
      message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
      classifierApprovable: !1,
    };
  let y = r || s,
    w = pathsToCheck ?? getPathsForPermissionCheck(path),
    touchesSettingsFile = settingsFileCertainty(w) !== "none";
  for (let pathToCheck of w)
    if (hasSuspiciousWindowsPathPattern(pathToCheck, trustedNetworkDirectories))
      return {
        safe: !1,
        message: `Claude requested permissions to write to ${encodeControlChars(path)}, which contains a suspicious Windows path pattern that requires manual approval.`,
        classifierApprovable: !1,
        circuitBreaker: "suspiciousWindowsPath",
        ...(touchesSettingsFile && { also: ["claudeSettingsFile"] }),
      };
  if (touchesSettingsFile) {
    let R = getSettingsFileLinkSpellings(),
      mapped = w.map((j) => foldPathSegments(expandPath(j))),
      found = mapped.map((j) => R.get(j)).find((j) => j !== void 0),
      L =
        found === void 0 || mapped.includes(foldPathSegments(found))
          ? ""
          : ` The Claude Code settings file ${HD(found)} leads here through a link.`;
    return {
      safe: !1,
      message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.${L}`,
      classifierApprovable: found === void 0,
      circuitBreaker: "claudeSettingsFile",
    };
  }
  for (let pathToCheck of w)
    if (!y && isClaudeConfigFilePath(pathToCheck))
      return {
        safe: !1,
        message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
        classifierApprovable: !0,
      };
  for (let pathToCheck of w)
    if (isDangerousFilePathToAutoEdit(pathToCheck, y, trustedNetworkDirectories))
      return {
        safe: !1,
        message: `Claude requested permissions to edit ${encodeControlChars(path)} which is a sensitive file.`,
        classifierApprovable: !0,
      };
  return { safe: !0 };
}
/**
 * 工作目录集合 = 当前原始 cwd + toolPermissionContext.additionalWorkingDirectories 的键（--add-dir、settings additionalDirectories、会话内添加）。
 */
//@ chunk-82kqcve8.js:254319-254398 facade-majority
function allWorkingDirectories(e) {
  return new Set([getOriginalCwd(), ...e.additionalWorkingDirectories.keys()]);
}
//@ chunk-82kqcve8.js:254398-254435 facade-majority
function spellingsToJudge(e) {
  return isDiskless() ? [e] : getPathsForPermissionCheck(e);
}
/**
 * 取某工作目录的全部真实拼写（符号链接解析等），结果缓存在权限状态里；CLAUDE_CODE_EVAL_CONFINED 下对 cwd 只用原拼写。
 */
//@ chunk-82kqcve8.js:254435-254619 facade-majority
function getResolvedWorkingDirPaths(e) {
  let n = getSessionPathsCache(),
    r = n.resolvedWorkingDirPaths.get(e);
  if (r !== void 0) return r;
  let s = env.CLAUDE_CODE_EVAL_CONFINED && e === getOriginalCwd() ? [e] : spellingsToJudge(e);
  return (n.resolvedWorkingDirPaths.set(e, s), s);
}
/**
 * 把某工作目录钉为只按原名比较（解析结果设为自身，并加入“按名持有”集合），用于不允许跟随符号链接的目录。
 */
//@ chunk-82kqcve8.js:254619-254719 facade-majority
function pinResolvedWorkingDirPath(e) {
  let n = getSessionPathsCache();
  (n.resolvedWorkingDirPaths.set(e, [e]), n.workingDirPathsHeldAsNamed.add(e));
}
/**
 * 若该工作目录尚未解析过，则把它登记为“按名持有”，后续只按字面路径比较。
 */
//@ chunk-82kqcve8.js:254719-254819 facade-majority
function holdUnresolvedWorkingDirPathAsNamed(e) {
  let n = getSessionPathsCache();
  if (!n.resolvedWorkingDirPaths.has(e)) n.workingDirPathsHeldAsNamed.add(e);
}
/**
 * 查询工作目录是否被登记为“按名持有”（只按字面路径比较，不展开真实拼写）。
 */
//@ chunk-82kqcve8.js:254819-254881 facade-majority
function isWorkingDirPathHeldAsNamed(e) {
  return getSessionPathsCache().workingDirPathsHeldAsNamed.has(e);
}
//@ chunk-82kqcve8.js:255014-255062 facade-majority
function declaredAbsoluteAdditionalDirectories(e) {
  return getNonProjectAdditionalDirectories(e).filter((source) => isAbsolute(source));
}
//@ chunk-82kqcve8.js:255062-255110 facade-majority
function blockReadsWorkingDirectories(e) {
  return new Set([getOriginalCwd(), ...getNonProjectAdditionalDirectories(e)]);
}
//@ chunk-82kqcve8.js:255110-255175 layout
function Kc(e) {
  return e.restricted ? [] : (e.readBlockExemptPaths ?? []);
}
//@ chunk-82kqcve8.js:255175-255262 layout
function ji(e, n, r, s, h, y = []) {
  return n.length > 0 && (pathInAllowedWorkingPath(e, r, n, s, y) || h().behavior === "allow");
}
/**
 * blockReadsOutsideWorkingDirectories 打开时判断这次读是否被拦：路径不在读允许的工作目录内、且不是内部可读路径（readBlockFence 模式下的 checkReadableInternalPath）即返回 true。
 */
//@ chunk-82kqcve8.js:255262-255464 facade-majority
function outsideReadBlocked(e, n, r) {
  if (n.blockReadsOutsideWorkingDirectories !== !0) return !1;
  let s = r ?? spellingsToJudge(e);
  return !ji(
    e,
    s,
    n,
    blockReadsWorkingDirectories(n),
    () =>
      checkReadableInternalPath(e, {}, s, {
        restricted: n.restricted,
        blockOutsideReads: !0,
        readBlockFence: !0,
      }),
    Kc(n),
  );
}
/**
 * 判断路径的全部拼写是否都落在某个工作目录（含其真实拼写，按名持有的目录只用原名）或额外根之内；比较时不折叠大小写、要求 UNC 形状一致，非 macOS 的额外根跳过 /private 别名。
 */
//@ chunk-82kqcve8.js:255464-255760 facade-majority
function pathInAllowedWorkingPath(e, n, r, s = allWorkingDirectories(n), h = []) {
  let y = r ?? getPathsForPermissionCheck(e),
    { workingDirPathsHeldAsNamed: workingDirPathsHeldAsNamed } = getSessionPathsCache(),
    flattened = Array.from(s).flatMap((O) =>
      workingDirPathsHeldAsNamed.has(O) ? [O] : getResolvedWorkingDirPaths(O),
    ),
    R = getPlatform() !== "macos";
  return y.every(
    (O) =>
      flattened.some((P) => pathInWorkingPath(O, P, { caseFold: !1, uncShapeParity: !0 })) ||
      h.some((P) => pathInWorkingPath(O, P, { caseFold: !1, uncShapeParity: !0, skipPrivateAlias: R })),
  );
}
//@ chunk-82kqcve8.js:255760-255846 layout
function Xc(e, n, r) {
  return checkEditableInternalPath(e, {}, n, { restricted: r.restricted, blockOutsideWrites: !0 });
}
/**
 * Shell 写目标的阻断说明：先查内部硬拒绝；blockWritesOutsideWorkingDirectories 打开时，目录外写返回“工作目录外”消息，写到可能是设置文件的路径返回设置文件消息；否则返回 undefined。
 */
//@ chunk-82kqcve8.js:255846-256077 facade-majority
function writeBlockRefusal(e, n, r) {
  let s = findEditDenyForSpellings(e, r, n);
  if (s !== void 0) return s.message;
  if (n.blockWritesOutsideWorkingDirectories !== !0) return;
  if (!ji(e, r, n, blockReadsWorkingDirectories(n), () => Xc(e, r, n)))
    return encodeControlChars(`${e}: ${OUTSIDE_WRITES_BLOCKED_DENY_REASON}`);
  return settingsFileCertainty(r) === "none"
    ? void 0
    : encodeControlChars(`${e}: ${SETTINGS_WRITES_BLOCKED_DENY_REASON}`);
}
/**
 * --restricted 与 blockReads/WritesOutsideWorkingDirectories 三种工作目录约束的说明文字与拒绝原因。
 */
//@ chunk-82kqcve8.js:256077-256575 layout
var RESTRICTED_MODE_CONSTRAINT = {
    why: "--restricted confines the file tools to the working directory.",
    reason: RESTRICTED_MODE_DENY_REASON,
  },
  OUTSIDE_READS_CONSTRAINT = {
    why: "the permissions.blockReadsOutsideWorkingDirectories setting blocks reads outside the working directories. Ask the user to add the directory with /add-dir, or to remove that setting.",
    reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
  },
  OUTSIDE_WRITES_CONSTRAINT = {
    why: "the permissions.blockWritesOutsideWorkingDirectories setting blocks writes outside the working directories. Ask the user to add the directory with /add-dir, or to remove that setting.",
    reason: OUTSIDE_WRITES_BLOCKED_DENY_REASON,
  };
/**
 * 按工作目录约束检查路径：无法解析直接拒绝；在允许目录内返回 null；否则给出拒绝（含符号链接落点说明与 blockedPath）。
 */
//@ chunk-82kqcve8.js:256575-257027 layout
function denyIfOutsideWorkingDirs(e, n, r, s, h, y, w = []) {
  if (n.unresolved)
    return {
      behavior: "deny",
      message: `${unresolvablePathMessage(e)}; ${h.why}`,
      decisionReason: { type: "other", reason: h.reason },
    };
  if (ji(e, n.spellings, r, y, s, w)) return null;
  let joined = Array.from(y).join(", "),
    R = symlinkRedirect(n, r, y);
  return {
    behavior: "deny",
    message: encodeControlChars(
      R?.carriedOut
        ? `${formatSymlinkResolution(e, R.landing)}, which is outside ${joined}; ${h.why}`
        : `${e} is outside ${joined}; ${h.why}`,
    ),
    decisionReason: { type: "other", reason: h.reason },
    blockedPath: R?.carriedOut ? R.landing : e,
  };
}
/**
 * GrowthBook tengu_auto_mode_worktree_fast_path：auto 模式下是否对已核实的 linked worktree 目录走快路径。
 */
//@ chunk-82kqcve8.js:257027-257092 facade-majority
function isLinkedWorktreeFastPathEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_worktree_fast_path", !1);
}
/**
 * 在 worktree 快路径开启时，从每个工作目录找到 git 仓库根，核实其在工作目录内且 realpath 未被重定向后，列出该仓库的 linked worktree 目录（跳过不安全目录），供 auto 模式视作可写工作区。
 */
//@ chunk-82kqcve8.js:257092-257516 facade-majority
async function verifiedLinkedWorktreeDirectories(e) {
  if (!isLinkedWorktreeFastPathEnabled() || isDiskless()) return [];
  let n = new Set(),
    r = new Set();
  for (let s of allWorkingDirectories(e)) {
    if (await hasUntouchableRecordSpellingStrictAsync(s)) continue;
    let h = findCanonicalGitRoot(s);
    if (h === null && findGitRootRecheckingNegative(s)) h = findCanonicalGitRoot(s);
    if (h === null || r.has(h)) continue;
    if ((r.add(h), !pathInAllowedWorkingPath(h, e, getResolvedWorkingDirPaths(h)))) continue;
    let y;
    try {
      y = Mn(await getFsImplementation().realpath(h));
    } catch {
      continue;
    }
    if (isDifferentNetworkLocation(h, y, null)) continue;
    if (y !== h) {
      if (r.has(y)) continue;
      r.add(y);
    }
    for (let w of await resolveWslGitDir(h)) {
      if (await hasUntouchableRecordSpellingStrictAsync(w)) continue;
      n.add(w);
    }
  }
  return Array.from(n);
}
/**
 * path 是否在 workingPath 内：两端展开为绝对路径，macOS /private/var、/private/tmp 归一为 /var、/tmp，可选大小写折叠与 UNC 形状一致性检查，再看 posix 相对路径是否不以 .. 开头且非绝对。
 */
//@ chunk-82kqcve8.js:257516-257927 facade-majority = pathInWorkingPath (0.775)
function pathInWorkingPath(
  path,
  workingPath,
  { caseFold: r, skipPrivateAlias: s = !1, uncShapeParity: h = !1 } = { caseFold: !0 },
) {
  let absolutePath = expandPath(path),
    absoluteWorkingPath = expandPath(workingPath);
  if (h && (Qn(absolutePath) !== Qn(absoluteWorkingPath) || Qn(path) !== Qn(workingPath))) return !1;
  let S = r ? /^\/private\/var\//i : /^\/private\/var\//,
    R = r ? /^\/private\/tmp(\/|$)/i : /^\/private\/tmp(\/|$)/,
    O = (G) => (s ? G : G.replace(S, "/var/").replace(R, "/tmp$1")),
    caseNormalizedPath = O(absolutePath),
    caseNormalizedWorkingPath = O(absoluteWorkingPath),
    j = r
      ? relativePath(
          normalizeCaseForComparison(caseNormalizedWorkingPath),
          normalizeCaseForComparison(caseNormalizedPath),
        )
      : relativePath(caseNormalizedWorkingPath, caseNormalizedPath);
  if (j === "") return !0;
  if (containsPathTraversal(j)) return !1;
  return !posix.isAbsolute(j);
}
/**
 * 规则来源对应的根目录：cliArg/command/session 等会话来源用当前工作目录；settings 各层用该设置文件所在目录的根。
 */
//@ chunk-82kqcve8.js:257927-258205 facade-majority = rootPathForSource (0.728)
function rootPathForSource(source) {
  switch (source) {
    case "cliArg":
    case "command":
    case "session":
    case "mcpMount":
    case "toolsNarrowing":
    case "mcpServerPolicy":
    case "hostCredential":
      return expandPath(getOriginalCwd());
    case "userSettings":
    case "policySettings":
    case "projectSettings":
    case "localSettings":
    case "flagSettings":
      return getRuleAnchorRootForSource(source);
  }
}
//@ chunk-82kqcve8.js:258205-258241 file-local
function prependDirSep(path) {
  return posix.join(DIR_SEP, path);
}
/**
 * 把带根的规则模式换算成相对 rootPath 的 gitignore 模式列表：同根直接加 /；模式在根下取后缀；根在模式下用 stripPatternPrefixSegments 吃掉前缀段；无关返回 []。
 */
//@ chunk-82kqcve8.js:258241-258642 fingerprint = normalizePatternToPath (1)
function normalizePatternToPath({ patternRoot: patternRoot, pattern: pattern, rootPath: rootPath }) {
  let fullPattern = posix.join(patternRoot, pattern),
    h = normalizeCaseForComparison(patternRoot),
    y = normalizeCaseForComparison(rootPath);
  if (h === y) return [prependDirSep(pattern)];
  else if (normalizeCaseForComparison(fullPattern).startsWith(`${y}${DIR_SEP}`)) {
    let relativePart = fullPattern.slice(rootPath.length);
    return [prependDirSep(relativePart)];
  } else {
    let relativePath = posix.relative(y, h);
    if (!relativePath || relativePath.startsWith(`..${DIR_SEP}`) || relativePath === "..") {
      let relativePath = posix.relative(h, y);
      if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${DIR_SEP}`)) return [];
      return stripPatternPrefixSegments(pattern, relativePath.split(DIR_SEP)).map(prependDirSep);
    } else {
      let relativePattern = posix.join(relativePath, pattern);
      return [prependDirSep(relativePattern)];
    }
  }
}
/**
 * 用 gitignore 语义让模式逐段匹配并消耗前缀目录段（支持 **），返回剩余模式集合（全部消耗则为 **）。
 */
//@ chunk-82kqcve8.js:258642-259235 layout
function stripPatternPrefixSegments(pattern, prefixSegments) {
  let filtered = pattern.split(DIR_SEP).filter((S) => S !== "" && S !== "."),
    s = pattern.endsWith(DIR_SEP) ? DIR_SEP : "",
    h = new Set(),
    y = [{ rest: filtered, at: 0 }],
    w = new Set();
  for (let S = y.pop(); S !== void 0; S = y.pop()) {
    let { rest: rest, at: at } = S,
      P = `${at}:${rest.join(DIR_SEP)}`;
    if (w.has(P)) continue;
    if ((w.add(P), at === prefixSegments.length)) {
      h.add(rest.length === 0 ? "**" : rest.join(DIR_SEP) + s);
      continue;
    }
    let L = rest[0];
    if (L === void 0) {
      h.add("**");
      continue;
    }
    if (L === "**") {
      (y.push({ rest: rest, at: at + 1 }), y.push({ rest: rest.slice(1), at: at }));
      continue;
    }
    let replaced = (/^[!#]/.test(L) ? `\\${L}` : L).replace(/ +$/, (G) => G.replace(/ /g, "\\ "));
    if (Kt.default().add(replaced).ignores(prefixSegments[at])) y.push({ rest: rest.slice(1), at: at + 1 });
  }
  return Array.from(h);
}
//@ chunk-82kqcve8.js:259235-259355 layout
function toComparablePosixPath(path) {
  if (getPlatform() !== "windows") return path;
  let normalized = posix.normalize(toPosixPath(path));
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}
/**
 * 把按根分组的忽略模式统一换算成相对 root 的模式列表（含模式根的 realpath 版本），供 ripgrep 等搜索工具的忽略规则使用。
 */
//@ chunk-82kqcve8.js:259355-259809 facade-majority = normalizePatternsToPath (1)
function normalizePatternsToPath(patternsByRoot, root) {
  let r = new Map(),
    s = patternsByRoot.get(null) ?? [],
    result = new Set(s),
    y = toComparablePosixPath(root),
    w = toComparablePosixPath(getCwd());
  for (let pattern of s) {
    if (!pattern.replace(/\/+$/, "").includes(DIR_SEP)) continue;
    for (let R of withResolvedPatternRoot(w, pattern, r))
      for (let O of normalizePatternToPath({ patternRoot: R.patternRoot, pattern: R.pattern, rootPath: y }))
        result.add(O);
  }
  for (let [S, R] of patternsByRoot.entries()) {
    if (S === null) continue;
    let normalizedPattern = toComparablePosixPath(S);
    for (let P of R)
      for (let L of withResolvedPatternRoot(normalizedPattern, P, r))
        for (let j of normalizePatternToPath({ patternRoot: L.patternRoot, pattern: L.pattern, rootPath: y }))
          result.add(j);
  }
  return Array.from(result);
}
//@ chunk-82kqcve8.js:259809-260189 layout
function withResolvedPatternRoot(patternRoot, pattern, realpathCache) {
  let s = { patternRoot: patternRoot, pattern: pattern },
    h = pattern.endsWith(DIR_SEP) ? DIR_SEP : "",
    filtered = pattern.split(DIR_SEP).filter((P) => P !== "" && P !== "."),
    index = filtered.findIndex((P) => /[*?[{]/.test(P)),
    S = index === -1 ? Math.max(0, filtered.length - 1) : index,
    joined = posix.join(patternRoot, ...filtered.slice(0, S)),
    O = realpathCache.get(joined);
  if (O === void 0)
    ((O = toComparablePosixPath(
      safeResolvePath(getFsImplementation(), getPlatform() === "windows" ? B8(joined) : joined).resolvedPath,
    )),
      realpathCache.set(joined, O));
  if (O === joined) return [s];
  return [s, { patternRoot: O, pattern: filtered.slice(S).join(DIR_SEP) + h }];
}
/**
 * Read 的 deny 规则按根分组的模式表（去掉 ! 取反项）；WSL 第二根挂载开启时为每个挂载根复制一份。
 */
//@ chunk-82kqcve8.js:260189-260492 facade-majority = getFileReadIgnorePatterns (0.674)
function getFileReadIgnorePatterns(toolPermissionContext) {
  let patternsByRoot = getPatternsByRoot(toolPermissionContext, "read", "deny"),
    result = new Map();
  for (let [h, { patternMap: y }] of patternsByRoot.entries())
    result.set(
      h,
      Array.from(y.keys()).filter((w) => !w.startsWith("!")),
    );
  if (result.size === 0 || !isWslSecondRootMountEnabled()) return result;
  let s = [...result];
  for (let h of rootAliasMountPoints())
    for (let [y, w] of s) {
      let S = y ?? getCwd(),
        R = S === DIR_SEP ? h : h + S;
      result.set(R, [...(result.get(R) ?? []), ...w]);
    }
  return result;
}
//@ chunk-82kqcve8.js:260492-260529 facade-majority
function patternWithRootFor(pattern, root) {
  return patternWithRoot_2(pattern, () => root);
}
/**
 * 解析路径规则模式的根：//x 为文件系统根（Windows //c/ 为盘符根）、C:\ 盘符、~/ 为家目录、/x 为规则来源根，其余相对模式 root=null（匹配时用 cwd）。返回 {relativePattern, root}。
 */
//@ chunk-82kqcve8.js:260529-261309 fingerprint = patternWithRoot (1)
function patternWithRoot_2(pattern, source) {
  if (
    getPlatform() === "windows" &&
    (pattern.startsWith("~\\") || (pattern.startsWith("\\") && pattern[1] !== "!" && pattern[1] !== "#"))
  )
    pattern = pattern.replaceAll("\\", "/");
  if (pattern.startsWith(`${DIR_SEP}${DIR_SEP}`)) {
    let patternWithoutDoubleSlash = pattern.slice(1);
    if (getPlatform() === "windows" && patternWithoutDoubleSlash.match(/^\/[a-z]\//i)) {
      let driveLetter = patternWithoutDoubleSlash[1]?.toUpperCase() ?? "C",
        pathAfterDrive = patternWithoutDoubleSlash.slice(2),
        driveRoot = `${driveLetter}:\\`;
      return {
        relativePattern: pathAfterDrive.startsWith("/") ? pathAfterDrive : "/" + pathAfterDrive,
        root: driveRoot,
      };
    }
    return { relativePattern: patternWithoutDoubleSlash, root: DIR_SEP };
  } else if (getPlatform() === "windows" && pattern.match(/^[A-Za-z]:[/\\]/)) {
    let upper = pattern[0].toUpperCase(),
      replaced = pattern.slice(2).replaceAll("\\", "/");
    return { relativePattern: replaced.startsWith("/") ? replaced : "/" + replaced, root: `${upper}:\\` };
  } else if (pattern.startsWith(`~${DIR_SEP}`))
    return { relativePattern: pattern.slice(1), root: homedir().normalize("NFC") };
  else if (pattern.startsWith(DIR_SEP)) return { relativePattern: pattern, root: source() };
  let normalizedPattern = pattern;
  if (pattern.startsWith(`.${DIR_SEP}`)) normalizedPattern = pattern.slice(2);
  return { relativePattern: normalizedPattern, root: null };
}
//@ chunk-82kqcve8.js:261309-261478 layout
function normalizeRulePattern(pattern) {
  let replaced = pattern.replace(/\/{2,}/g, "/");
  if (/^\s*(?:\/\*\*)?$/.test(replaced)) return replaced;
  return replaced.replace(/^\uFEFF([!#]?)/, (r, s) => (s ? "\\" + s : "")).replace(/^\uFEFF/, "[\uFEFF]");
}
//@ chunk-82kqcve8.js:261478-261520 facade-majority
function patternWithRoot(pattern, source) {
  return patternWithRoot_2(pattern, () => rootPathForSource(source));
}
/**
 * 把一条路径规则编译成 {root, pattern}：patternWithRoot 拆根，规范化后转成 gitignore 风格 glob（allow 规则与 deny 规则的规范化方式不同）；无效模式返回 null。
 */
//@ chunk-82kqcve8.js:261520-261653 facade-majority
function compiledPathRulePattern(ruleContent, source, behavior) {
  let { relativePattern: relativePattern, root: root } = patternWithRoot(ruleContent, source),
    y = behavior === "allow",
    w = sanitizeRulePattern(normalizeRulePattern(relativePattern), y);
  return w === null ? null : { root: root, pattern: normalizeGitignoreGlob(w, y) };
}
//@ chunk-82kqcve8.js:261653-261664 layout
var eh = 1e4;
//@ chunk-82kqcve8.js:261664-261804 layout = parseSkillPaths (0.822)
function normalizeGitignoreGlob(e, n) {
  if (e.endsWith("/**")) {
    let sliced = e.slice(0, -3);
    return /[^/]/.test(sliced)
      ? sliced.includes("/") || !n || /^[!#]/.test(sliced)
        ? sliced
        : "/" + sliced
      : "/**";
  }
  return e;
}
/**
 * 规整权限规则模式：按 gitignore 语义检查，有问题时记警告，allow（或否定 deny）规则直接丢弃，其余改为匹配字面路径。
 */
//@ chunk-82kqcve8.js:261804-262144 layout
function sanitizeRulePattern(e, n) {
  let r = normalizeGitignoreGlob(e, n),
    s = !n && /^!\s*$/.test(r) ? "a negation of every path" : describeIgnorePatternSkip(r);
  if (s === null) return e;
  let h = e.startsWith("!") ? "!" : "",
    y = h ? !n : n;
  if (
    (warnUnusableIgnorePattern(
      "permission_rules",
      e,
      s,
      y ? "dropping it" : "matching the literal path it spells",
    ),
    y)
  )
    return null;
  let w = e.endsWith("/**") ? "/**" : "",
    sliced = e.slice(h.length, e.length - w.length);
  return h + escapeRuleContent(unescapeRuleContent(sliced)) + w;
}
//@ chunk-82kqcve8.js:262144-262179 layout
var th = /(?:^|[^\\])(?:\\\\)*[*?[]/;
/**
 * 非 Windows 下把规则前缀的目录换成物理路径孪生（如符号链接目标），得到等价的绝对规则模式；无法安全转换返回 null。
 */
//@ chunk-82kqcve8.js:262179-262569 layout
function getPhysicalTwinPattern(e, n) {
  if (getPlatform() === "windows" || isDiskless() || !n.startsWith("/")) return null;
  let parts = n.slice(1).split("/"),
    s = 0;
  while (s < parts.length && parts[s] !== "" && !th.test(parts[s])) s++;
  if (s === 0) return null;
  let h = join(e, ...parts.slice(0, s).map(unescapeRuleContent)),
    y = getPhysicalTwinPath(h);
  if (y === null) return null;
  let sliced = parts.slice(s),
    S = normalizeRulePattern(
      escapeRuleContent(y, { escapeGlobs: !0 }) + (sliced.length > 0 ? "/" + sliced.join("/") : ""),
    ),
    R = normalizeGitignoreGlob(S, !1);
  if (describeIgnorePatternSkip(R) !== null || (R !== S && R + "/**" !== S)) return null;
  return S;
}
/**
 * 把某类（edit/read）某种行为的内容规则按根目录分桶，生成 gitignore 匹配器；deny/ask 结果按会话缓存（LRU 16），并为带根的规则追加物理孪生路径模式。
 */
//@ chunk-82kqcve8.js:262569-264250 layout
function getPatternsByRoot(permissionContext, toolType, behavior) {
  let rules =
      behavior === "deny"
        ? permissionContext.alwaysDenyRules
        : behavior === "ask"
          ? permissionContext.alwaysAskRules
          : null,
    cacheEntry =
      rules !== null
        ? {
            rules: rules,
            key: [
              toolType,
              behavior,
              getPlatform(),
              homedir(),
              getClaudeConfigDirOrNull() ?? "",
              getFlagSettingsPath() ?? "",
              getOriginalCwdOrNull() ?? "",
            ].join("\x00"),
          }
        : null;
  if (cacheEntry !== null) {
    let { compiledPatternsByRules: compiledPatternsByRules } = getSessionPathsCache(),
      G = compiledPatternsByRules.get(cacheEntry.rules),
      Z = G?.get(cacheEntry.key);
    if (Z !== void 0 && G !== void 0) return (G.delete(cacheEntry.key), G.set(cacheEntry.key, Z), Z);
  }
  let toolName = (() => {
      switch (toolType) {
        case "edit":
          return FILE_EDIT_TOOL_NAME;
        case "read":
          return FILE_READ_TOOL_NAME;
      }
    })(),
    isAllow = behavior === "allow",
    contentRules = getContentRulesForToolName(permissionContext, toolName, behavior),
    uniqueRules = isAllow
      ? Array.from(new Map(contentRules.map((j) => [j.ruleValue.ruleContent, j])).values())
      : contentRules,
    { physicalTwinsByPattern: physicalTwinsByPattern } = getSessionPathsCache(),
    byRoot = new Map(),
    getBucketMatcher = (j, G) => {
      let Z = byRoot.get(j);
      if (Z === void 0) ((Z = { patternMap: new Map(), matchers: [] }), byRoot.set(j, Z));
      let found = Z.matchers.find((matcher) => matcher.source === G);
      if (found === void 0) {
        let ee = new Map(),
          re,
          ce = 0;
        ((found = {
          source: G,
          patternMap: ee,
          getIg: () => {
            if (re === void 0 || ++ce > eh)
              ((ce = 1),
                (re = Kt.default().add(Array.from(ee.keys(), (we) => normalizeGitignoreGlob(we, isAllow)))));
            return re;
          },
        }),
          Z.matchers.push(found));
      }
      return { bucket: Z, matcher: found };
    };
  for (let j of uniqueRules) {
    let ruleContent = j.ruleValue.ruleContent;
    if (ruleContent === void 0) continue;
    let { relativePattern: relativePattern, root: root } = patternWithRoot(ruleContent, j.source),
      ee = sanitizeRulePattern(normalizeRulePattern(relativePattern), isAllow);
    if (ee === null) continue;
    let re = isAllow ? null : j.source,
      { bucket: bucket, matcher: matcher } = getBucketMatcher(root, re);
    if (!isAllow) matcher.patternMap.delete(ee);
    if ((matcher.patternMap.set(ee, j), bucket.patternMap.set(ee, j), isAllow || root === null)) continue;
    let me = `${root}\x00${ee}`,
      se = physicalTwinsByPattern.get(me);
    if (se === void 0) ((se = new Set()), physicalTwinsByPattern.set(me, se));
    let ye = getPhysicalTwinPattern(root, ee);
    if (ye !== null) se.add(ye);
    for (let Ee of se) {
      let ie = getBucketMatcher(DIR_SEP, re);
      if (!ie.matcher.patternMap.has(Ee)) ie.matcher.patternMap.set(Ee, j);
      if (!ie.bucket.patternMap.has(Ee)) ie.bucket.patternMap.set(Ee, j);
    }
  }
  if (cacheEntry !== null) {
    let { compiledPatternsByRules: compiledPatternsByRules } = getSessionPathsCache(),
      G = compiledPatternsByRules.get(cacheEntry.rules);
    if (G === void 0) ((G = new Map()), compiledPatternsByRules.set(cacheEntry.rules, G));
    if (G.size >= 16) {
      let Z = G.keys().next().value;
      if (Z !== void 0) G.delete(Z);
    }
    G.set(cacheEntry.key, byRoot);
  }
  return byRoot;
}
//@ chunk-82kqcve8.js:264250-264273 layout
var rh = /[^\p{ASCII}]/u;
//@ chunk-82kqcve8.js:264273-264298 facade-majority
function mayBeGuardedFileSyncCopy(e) {
  return !1;
}
//@ chunk-82kqcve8.js:264298-264340 facade-majority
function mayEscapeExclusionGlobs(e) {
  return rh.test(e) || mayBeGuardedFileSyncCopy(e);
}
/**
 * 找出可能借大小写折叠或排除 glob 逃逸的路径中、其任一拼写命中 Read deny 规则的那些，返回集合；用于搜索类工具补做 deny 过滤。旧版名 isFileReadDenied 不准确。
 */
//@ chunk-82kqcve8.js:264340-264516 facade-majority = isFileReadDenied (1)
function denyFoldVariantPaths(e, n, r = () => [], s = !1) {
  let h = new Set();
  for (let y of e) {
    if ((!s && !mayEscapeExclusionGlobs(y)) || h.has(y)) continue;
    if (
      [...getPathsForPermissionCheck(y), ...r(y)].some(
        (w) => matchingRuleForInput(w, n, "read", "deny") !== null,
      )
    )
      h.add(y);
  }
  return h;
}
//@ chunk-82kqcve8.js:264516-264567 facade-majority
function isSearchResultRootRespellEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_fizzy_treasure", !0);
}
/**
 * 对相对或含 .. 的路径，把它的尾部依次拼到每条 Read/Edit deny 规则的根（及根下各前缀）后再匹配，返回第一条命中的 deny 规则（用于 shell 命令里写法不定的路径）。
 */
//@ chunk-82kqcve8.js:264567-265157 facade-majority = getPatternsByRoot (0.606)
function denyRuleMatchingAnywhere(path, toolPermissionContext, operation) {
  let s = expandPath(path);
  if (isAbsolute(path) || path.startsWith("~"))
    return matchingRuleForInput(s, toolPermissionContext, operation, "deny");
  let filtered = path.split(/[\\/]+/).filter((R) => R !== "" && R !== ".");
  while (filtered[0] === "..") filtered.shift();
  if (filtered.length === 0) return null;
  let joined = filtered.join("/"),
    w = getContentRulesForToolName(
      toolPermissionContext,
      operation === "read" ? FILE_READ_TOOL_NAME : FILE_EDIT_TOOL_NAME,
      "deny",
    ),
    patternsByRoot = new Set();
  for (let R of w) {
    let ruleContent = R.ruleValue.ruleContent;
    if (ruleContent === void 0) continue;
    let { relativePattern: relativePattern, root: root } = patternWithRoot(ruleContent, R.source),
      j = root ?? getOriginalCwd(),
      filtered = normalizeRulePattern(relativePattern)
        .split("/")
        .filter((Z) => Z !== "");
    for (let Z = 0; Z < Math.max(1, filtered.length); Z++) {
      let joined_2 = [j, ...filtered.slice(0, Z), joined].join("/");
      if (patternsByRoot.has(joined_2)) continue;
      patternsByRoot.add(joined_2);
      let ee = matchingRuleForInput(joined_2, toolPermissionContext, operation, "deny");
      if (ee !== null) return ee;
    }
  }
  return null;
}
/**
 * 搜索根目录下是否有路径被 Read deny 规则覆盖（规则根在搜索根内，或规则段与相对路径前缀匹配），返回第一条这样的规则；用于 Grep/Glob 搜索根的预检。
 */
//@ chunk-82kqcve8.js:265157-265739 facade-majority
function readDenyRuleMayMatchBeneath(searchRoot, toolPermissionContext) {
  let r = getContentRulesForToolName(toolPermissionContext, FILE_READ_TOOL_NAME, "deny");
  if (r.length === 0) return null;
  let s = getPathsForPermissionCheck(searchRoot),
    y =
      isWslSecondRootMountEnabled() &&
      rootAliasMountPoints().some((w) => s.some((S) => w.startsWith(`${S}${DIR_SEP}`)))
        ? [...s, DIR_SEP]
        : withSecondRootMountSpellings(s);
  for (let w of r) {
    let ruleContent = w.ruleValue.ruleContent;
    if (ruleContent === void 0) continue;
    let { relativePattern: relativePattern, root: root } = patternWithRoot(ruleContent, w.source),
      P = normalizeRulePattern(relativePattern);
    if (P.startsWith("!")) continue;
    let filtered = P.split("/").filter((Z) => Z !== ""),
      j = filtered.length <= 1 && !P.startsWith("/"),
      G = root ?? getCwd();
    for (let Z of y) {
      let filtered_2 = relativePath(G, Z)
        .split("/")
        .filter((ee) => ee !== "" && ee !== ".");
      if (filtered_2[0] === "..") {
        if (!relativePath(Z, G).split("/").includes("..")) return w;
        continue;
      }
      if (j || segmentsMatchPattern(filtered, filtered_2)) return w;
    }
  }
  return null;
}
//@ chunk-82kqcve8.js:265739-266059 layout
function segmentsMatchPattern(e, n) {
  for (let [r, s] of n.entries()) {
    let h = e[r];
    if (h === void 0 || h === "**") return !0;
    let y = normalizeCaseForComparison(s),
      w = normalizeCaseForComparison(h);
    if (!/[*?[\]{}\\]/.test(w)) {
      if (w !== y) return !1;
      continue;
    }
    if (/[[\]{}\\]/.test(w)) continue;
    if (
      !new RegExp(
        `^${w
          .replace(/[.+^$()|]/g, "\\$&")
          .replace(/\*/g, "[^/]*")
          .replace(/\?/g, "[^/]")}$`,
      ).test(y)
    )
      return !1;
  }
  return !0;
}
/**
 * matchingRuleForInput 的外层：先按原路径匹配；deny/ask 未命中时再查（WSL 第二根挂载开启时）路径在另一挂载根下的拼写，命中则上报 tengu_path_rule_matched_through_second_root_mount。
 */
//@ chunk-82kqcve8.js:266059-266317 facade-majority
function matchingRuleForInput(path, toolPermissionContext, toolType, behavior, options = {}) {
  let y = matchingRuleForInput_2(path, toolPermissionContext, toolType, behavior, options);
  if (y !== null || behavior === "allow" || options.asSpelledOnly === !0) return y;
  let w = ih(path, toolPermissionContext, toolType, behavior, options);
  if (w !== null) return w;
  if (
    !isWslSecondRootMountEnabled() ||
    getPatternsByRoot(toolPermissionContext, toolType, behavior).size === 0
  )
    return y;
  let S = pathBelowRootAlias(expandPath(path)),
    R = S === void 0 ? null : matchingRuleForInput_2(S, toolPermissionContext, toolType, behavior, options);
  if (R !== null) reportSecondRootMountMatch(toolType, behavior);
  return R;
}
//@ chunk-82kqcve8.js:266317-266352 layout
function ih(e, n, r, s, h) {
  return null;
}
//@ chunk-82kqcve8.js:266352-266564 layout
function reportSecondRootMountMatch(e, n) {
  let r = `${e} ${n}`,
    { reportedSecondRootMountMatches: reportedSecondRootMountMatches } = getSessionPathsCache();
  if (!reportedSecondRootMountMatches.has(r))
    (reportedSecondRootMountMatches.add(r),
      logEvent("tengu_path_rule_matched_through_second_root_mount", {
        behavior: fromEnum(n),
        tool_type: fromEnum(e),
        mount_table_unreadable: isWslMountInfoUnreadable(),
      }));
}
//@ chunk-82kqcve8.js:266564-266632 layout
function withSecondRootMountSpellings(paths) {
  return isWslSecondRootMountEnabled()
    ? uniq([...paths, ...paths.flatMap((n) => pathBelowRootAlias(n) ?? [])])
    : paths;
}
//@ chunk-82kqcve8.js:266632-266824 layout
function isWslSecondRootMountEnabled() {
  if (getPlatform() !== "wsl") return !1;
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_zesty_pearl", !1) === !0;
  } catch (error) {
    let n = getSessionPathsCache();
    if (!n.reportedSecondRootMountFlagThrow) ((n.reportedSecondRootMountFlagThrow = !0), logError(error));
    return !0;
  }
}
/**
 * 在按根分组的 gitignore 匹配器里找命中路径的规则：路径换成相对规则根的形式（Windows 与 caseInsensitiveTarget 时大小写折叠，目录加 /），倒序取最后一条命中；处理 x/** 与 /x 的等价写法。返回规则对象或 null。
 */
//@ chunk-82kqcve8.js:266824-267601 fingerprint = matchingRuleForInput (0.576)
function matchingRuleForInput_2(path, toolPermissionContext, toolType, behavior, options) {
  let fileAbsolutePath = expandPath(path);
  if (getPlatform() === "windows" && fileAbsolutePath.includes("\\"))
    fileAbsolutePath = windowsPathToPosixPath(fileAbsolutePath);
  let patternsByRoot = getPatternsByRoot(toolPermissionContext, toolType, behavior),
    S = behavior !== "allow" && (getPlatform() === "windows" || options.caseInsensitiveTarget === !0),
    R = fileAbsolutePath ?? getCwd(),
    O = S ? normalizeCaseForComparison(R) : R;
  for (let [P, { matchers: L }] of orderRootEntries(patternsByRoot)) {
    let j = P ?? getCwd(),
      relativePathStr = relativePath(S ? normalizeCaseForComparison(j) : j, O);
    if (!relativePathStr || !Kt.default.isPathValid(relativePathStr)) continue;
    let Z = `${relativePathStr}/`,
      ae = options.isDirectory === !0 && Kt.default.isPathValid(Z) ? Z : relativePathStr;
    for (let ee = L.length - 1; ee >= 0; ee--) {
      let re = L[ee];
      if (re === void 0) continue;
      let { patternMap: patternMap, getIg: getIg } = re,
        igResult = getIg().test(ae);
      if (!igResult.ignored || !igResult.rule) continue;
      let originalPattern = igResult.rule.pattern,
        Ee = originalPattern + "/**";
      if (patternMap.has(Ee) && (originalPattern.includes("/") || behavior !== "allow"))
        return patternMap.get(Ee) ?? null;
      if (originalPattern.startsWith("/")) {
        let he = originalPattern.slice(1) + "/**";
        if (patternMap.has(he)) return patternMap.get(he) ?? null;
      }
      let ie = patternMap.get(originalPattern);
      if (ie !== void 0 || behavior === "allow") return ie ?? null;
    }
  }
  return null;
}
/**
 * 若某目录本身就是一条 deny（或指定行为）路径规则的根、且该规则是 /** 或 **（整目录内容），返回该规则；Windows 上按大小写折叠比较，并补 WSL 第二挂载根拼写。用于判断整个目录的内容是否被拒。
 */
//@ chunk-82kqcve8.js:267601-267937 facade-majority
function matchingDenyRuleForDirectoryContents(e, n, r, s = "deny") {
  let h = getPatternsByRoot(n, r, s);
  if (h.size === 0) return null;
  let y = expandPath(e);
  if (getPlatform() === "windows" && y.includes("\\")) y = windowsPathToPosixPath(y);
  let w = getPlatform() === "windows",
    S = withSecondRootMountSpellings([w ? normalizeCaseForComparison(y) : y]);
  for (let [R, { patternMap: O }] of orderRootEntries(h)) {
    let P = R ?? getCwd(),
      L = w ? normalizeCaseForComparison(P) : P;
    if (!S.some((G) => relativePath(L, G) === "")) continue;
    let j = O.get("/**") ?? O.get("**");
    if (j !== void 0) return j;
  }
  return null;
}
/**
 * 判断一个路径是否匹配给定规则串：按 session 来源解析根，用 ignore 库做 gitignore 匹配；不匹配时，若规则以 * 开头或不像路径且不是 :* 前缀规则，再退回通配匹配。
 */
//@ chunk-82kqcve8.js:267937-268334 facade-majority
function matchesPathRule(e, n) {
  let r = expandPath(n);
  if (getPlatform() === "windows" && r.includes("\\")) r = windowsPathToPosixPath(r);
  let { relativePattern: relativePattern, root: root } = patternWithRoot(e, "session"),
    y = sanitizeRulePattern(normalizeRulePattern(relativePattern), !0),
    w = y === null ? null : normalizeGitignoreGlob(y, !0),
    S = getPlatform() === "windows",
    R = root ?? getCwd(),
    O = relativePath(S ? normalizeCaseForComparison(R) : R, S ? normalizeCaseForComparison(r) : r);
  if (w !== null && O && Kt.default.isPathValid(O) && Kt.default().add(w).test(O).ignored) return !0;
  let trimmed = e.trim(),
    L = !hasWildcards(trimmed) && !trimmed.endsWith(":*");
  if (trimmed.startsWith("*") || L) return matchWildcardPattern(e, n);
  return !1;
}
/**
 * 探测系统级可信符号链接（/tmp→/private/tmp 等），按会话缓存真实路径→别名的映射。
 */
//@ chunk-82kqcve8.js:268334-268699 layout
function getTrustedSymlinkEquivalences() {
  let e = getSessionPathsCache();
  if (e.trustedSymlinkEquivalences !== void 0) return e.trustedSymlinkEquivalences;
  let n = [
      ["/private/tmp", "/tmp"],
      ["/private/var", "/var"],
      ["/private/etc", "/etc"],
      ["/usr/bin", "/bin"],
      ["/usr/lib", "/lib"],
      ["/usr/sbin", "/sbin"],
    ],
    r = new Map(),
    s = getFsImplementation();
  for (let [h, y] of n)
    try {
      if (s.realpathSync(y) === h) r.set(h, y);
    } catch {}
  return ((e.trustedSymlinkEquivalences = r), r);
}
/**
 * 把位于可信符号链接前缀下的路径改写为其目标前缀，用于 allow 规则匹配时补一次拼写。
 */
//@ chunk-82kqcve8.js:268699-268800 facade-majority
function normalizeTrustedSymlink(absolutePath) {
  for (let [n, r] of getTrustedSymlinkEquivalences())
    if (absolutePath === n || absolutePath.startsWith(n + sep)) return r + absolutePath.slice(n.length);
  return absolutePath;
}
/**
 * 要求所有路径拼写都命中某条 allow 规则（必要时用可信符号链接改写后的拼写再试），全部命中返回第一条规则，否则 null。
 */
//@ chunk-82kqcve8.js:268800-268953 facade-majority
function matchingAllowRuleForAllPaths(e, n, r) {
  let s = null;
  for (let h of e) {
    let y = matchingRuleForInput(h, n, r, "allow");
    if (!y) {
      let w = normalizeTrustedSymlink(h);
      if (w !== h) y = matchingRuleForInput(w, n, r, "allow");
    }
    if (!y) return null;
    s ??= y;
  }
  return s;
}
/**
 * 读权限的网络路径防御：对 /net、/Network 自动挂载、macOS 内核重定向前缀（/.vol 等）和 UNC 路径（含所有解析拼写），若不在可信网络根下则返回 ask，并说明可能触发 DNS 查询或远程挂载。
 */
//@ chunk-82kqcve8.js:268953-272628 facade-majority
function checkReadNetworkPathSafety(e, n, r, s) {
  if (typeof e.getPath !== "function") return null;
  let path = e.getPath(n),
    trustedNetworkDirectories = r.trustedNetworkDirectories;
  if ((Ya(path) || isNetDir(path)) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories))
    return buildSafetyCheckAsk(
      `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
      "Automount -hosts path detected (defense-in-depth check)",
    );
  if (tP(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories))
    return buildSafetyCheckAsk(
      `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /Network automount browse surface and could trigger a directory-service lookup and mount to a remote host.`,
      "Automount browse surface detected (defense-in-depth check)",
    );
  if (isMacSpecialPath(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories))
    return buildSafetyCheckAsk(
      `Claude requested permissions to read from ${encodeControlChars(path)}, which is under /.vol, /.file, /.nofollow or /.resolve (paths the macOS kernel redirects) and could reach a network mount, triggering a DNS lookup and mount to a remote host.`,
      "Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)",
    );
  let w = s ?? getPathsForPermissionCheck(path);
  for (let S of w) {
    if (Qn(S) && !isWslUncPath(S) && !isPathInTrustedNetworkRoot(S, trustedNetworkDirectories))
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which appears to be a UNC path that could access network resources.`,
        "UNC path detected (defense-in-depth check)",
      );
    if ((Ya(S) || isNetDir(S)) && !isPathInTrustedNetworkRoot(S, trustedNetworkDirectories))
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
        "Automount -hosts path detected (defense-in-depth check)",
      );
    if (tP(S) && !isPathInTrustedNetworkRoot(S, trustedNetworkDirectories))
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /Network automount browse surface and could trigger a directory-service lookup and mount to a remote host.`,
        "Automount browse surface detected (defense-in-depth check)",
      );
    if (isMacSpecialPath(S) && !isPathInTrustedNetworkRoot(S, trustedNetworkDirectories))
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which is under /.vol, /.file, /.nofollow or /.resolve (paths the macOS kernel redirects) and could reach a network mount, triggering a DNS lookup and mount to a remote host.`,
        "Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)",
      );
  }
  if (e.name === GLOB_TOOL_NAME) {
    let pattern = n.pattern;
    if (
      typeof pattern === "string" &&
      Qn(pattern) &&
      !isWslUncPath(pattern) &&
      !isPathInTrustedNetworkRoot(pattern, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to glob ${pattern}, which appears to be a UNC pattern that could access network resources.`,
        "UNC glob pattern detected (defense-in-depth check)",
      );
    if (
      typeof pattern === "string" &&
      (Ya(pattern) || isNetDir(pattern)) &&
      !isPathInTrustedNetworkRoot(pattern, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to glob ${pattern}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
        "Automount -hosts glob pattern detected (defense-in-depth check)",
      );
    if (
      typeof pattern === "string" &&
      tP(pattern) &&
      !isPathInTrustedNetworkRoot(pattern, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to glob ${pattern}, which is under the /Network automount browse surface and could trigger a directory-service lookup and mount to a remote host.`,
        "Automount browse surface glob pattern detected (defense-in-depth check)",
      );
    if (
      typeof pattern === "string" &&
      isMacSpecialPath(pattern) &&
      !isPathInTrustedNetworkRoot(pattern, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to glob ${pattern}, which is under /.vol, /.file, /.nofollow or /.resolve (paths the macOS kernel redirects) and could reach a network mount, triggering a DNS lookup and mount to a remote host.`,
        "Kernel-resolved path prefix (/.vol etc.) glob pattern detected (defense-in-depth check)",
      );
  }
  for (let S of w)
    if (hasSuspiciousWindowsPathPattern(S, trustedNetworkDirectories))
      return {
        behavior: "ask",
        message: `Claude requested permissions to read from ${encodeControlChars(path)}, which contains a suspicious Windows path pattern that requires manual approval.`,
        decisionReason: {
          type: "other",
          reason:
            "Path contains suspicious Windows-specific patterns (alternate data streams, short names, long path prefixes, or three or more consecutive dots) that require manual verification",
        },
      };
  return null;
}
//@ chunk-82kqcve8.js:272628-272682 layout
var lh = new Set(["toolsNarrowing", "cliArg", "command"]);
//@ chunk-82kqcve8.js:272682-272725 facade-majority
function hasPermissionAuthoredBareReadDeny(e, n = READ_PATH_PROBE) {
  return nd(e, n) !== null;
}
//@ chunk-82kqcve8.js:272725-272797 layout
function nd(e, n = READ_PATH_PROBE) {
  return getDenyRuleForTool(
    e,
    n,
    getDenyRules(e).filter((r) => !lh.has(r.source)),
  );
}
//@ chunk-82kqcve8.js:272797-272855 facade-majority = isFileReadDenied (1)
function hasReadDenyRuleInForce(e) {
  return hasPermissionAuthoredBareReadDeny(e) || getPatternsByRoot(e, "read", "deny").size > 0;
}
//@ chunk-82kqcve8.js:272855-272901 facade-majority
function hasReadDenyRuleForPath(e, n, r) {
  return readDenyRuleForPath(e, n, r) !== void 0;
}
/**
 * 返回命中某路径的 Read deny 规则：先查整工具 deny；没有路径级 deny 规则时直接返回；否则逐个拼写用 matchingRuleForInput 查。
 */
//@ chunk-82kqcve8.js:272901-273072 facade-majority = isFileReadDenied (1)
function readDenyRuleForPath(e, n, r) {
  let s = nd(n);
  if (s !== null) return s;
  if (getPatternsByRoot(n, "read", "deny").size === 0) return;
  for (let h of r ?? getPathsForPermissionCheck(e)) {
    let denyRule = matchingRuleForInput(h, n, "read", "deny");
    if (denyRule !== null) return denyRule;
  }
  return;
}
/**
 * 只支持 Read 工具最小属性集（name、getPath 等）的探针对象，用 Proxy 包装，访问其他属性即抛错；供“按路径算读权限”的函数在没有真实工具对象时调用规则检查。
 */
//@ chunk-82kqcve8.js:273072-273434 facade-majority
var READ_PATH_PROBE = new Proxy(
  {
    name: FILE_READ_TOOL_NAME,
    mcpInfo: void 0,
    familyParentToolName: void 0,
    aliasSkillToolNames: void 0,
    getPath: (e) => String(e.file_path),
  },
  {
    get(e, n) {
      if (typeof n === "symbol") return;
      if (n in e) return e[n];
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `readPermissionDecisionForPath probe consulted unsupported tool property: ${n}`,
        "readPermissionDecisionForPath probe consulted unsupported tool property",
      );
    },
  },
);
//@ chunk-82kqcve8.js:273434-273481 facade-majority
function readPermissionDecisionForPath(e, n) {
  return checkReadPermissionForTool(READ_PATH_PROBE, { file_path: e }, n);
}
/**
 * 判断读某路径是否会被自动放行：有整工具 Read deny/ask 规则则否；按分层读判定，allow 层为是，path-mode-ask 仅在 bypassPermissions 下为是，其余（各类 deny/ask）为否。
 */
//@ chunk-82kqcve8.js:273481-273723 facade-majority
function readWouldBeAutoAllowedForPath(e, n) {
  if (getDenyRuleForTool(n, READ_PATH_PROBE) !== null || getAskRuleForTool(n, READ_PATH_PROBE) !== null)
    return !1;
  switch (layeredReadVerdictForPaths([e], n).layer) {
    case "allow":
      return !0;
    case "path-mode-ask":
      return n.mode === "bypassPermissions";
    case "bare-deny":
    case "path-deny":
    case "path-rule-ask":
    case "bare-ask":
      return !1;
  }
}
//@ chunk-82kqcve8.js:273723-273813 layout
var ch = "path names a darwin automounter lookup (/Network browse root or auto_home entry)";
/**
 * 对一组路径做分层读判定，返回最先命中的层：bare-deny（整工具 deny）、path-deny（可选拒绝自动挂载查找路径，或某路径被拒）、path-rule-ask（路径级 ask 规则）、bare-ask（整工具 ask）、path-mode-ask（其他需询问）、allow。toolsNarrowing/command 来源的规则不参与。
 */
//@ chunk-82kqcve8.js:273813-274748 facade-majority
function layeredReadVerdictForPaths(e, n, r) {
  let s = getDenyRuleForTool(
    n,
    READ_PATH_PROBE,
    getDenyRules(n).filter((P) => !NARROWING_RULE_SOURCES.includes(P.source)),
  );
  if (s !== null) return { layer: "bare-deny", rule: s };
  if (r?.refuseAutomounterShapes) {
    for (let P of e)
      if (classifyHomeMount(anchorPathUnnormalized(P)) || classifyHomeMount(expandPath(P)))
        return {
          layer: "path-deny",
          path: P,
          decision: {
            behavior: "deny",
            message: stripNonPrintable(
              `${encodeControlChars(P)} names an automounter lookup path (its lookup is itself a network request); it was not read.`,
            ),
            decisionReason: { type: "other", reason: ch },
          },
        };
  }
  let h = [],
    y = [];
  for (let P of e) {
    let L = readPermissionDecisionForPath(anchorPathUnnormalized(P), n);
    if (L.behavior === "deny") h.push({ path: P, decision: L });
    else if (L.behavior === "ask") y.push({ path: P, decision: L });
  }
  let [w] = h;
  if (w) return { layer: "path-deny", ...w };
  let found = y.find(
    (P) =>
      P.decision.decisionReason?.type === "rule" && P.decision.decisionReason.rule.ruleBehavior === "ask",
  );
  if (found) return { layer: "path-rule-ask", ...found };
  let R = getAskRuleForTool(
    n,
    READ_PATH_PROBE,
    getAskRules(n).filter((P) => !NARROWING_RULE_SOURCES.includes(P.source)),
  );
  if (R !== null) return { layer: "bare-ask", rule: R };
  let [O] = y;
  if (O) return { layer: "path-mode-ask", ...O };
  return { layer: "allow" };
}
//@ chunk-82kqcve8.js:274748-274808 layout
function dh(e, n) {
  return n.tools.some((tool) => toolMatchesName(tool, e)) && !poolCanRead(n);
}
/**
 * 工具池里是否有能读文件的工具（Read，或另一读类工具）。
 */
//@ chunk-82kqcve8.js:274808-274895 facade-majority
function poolCanRead(e) {
  let { tools: tools } = e;
  return (
    tools.some((r) => toolMatchesName(r, FILE_READ_TOOL_NAME)) ||
    (tools.some((r) => toolMatchesName(r, REPL_TOOL_NAME)) && !0)
  );
}
//@ chunk-82kqcve8.js:274895-274942 facade-majority
function readAutoAllowedForMutation(e, n, r, s) {
  return !dh(e, r) && readWouldBeAutoAllowedForPath(n, s);
}
//@ chunk-82kqcve8.js:274942-274993 layout
function uh() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_playful_lobster", !0);
}
//@ chunk-82kqcve8.js:274993-275022 layout
class rd {
  loggedPaths = new Set();
}
//@ chunk-82kqcve8.js:275022-275047 layout
var fh = new HostScoped(() => new rd());
//@ chunk-82kqcve8.js:275047-275096 layout
function od() {
  return fh.of(getRootSession().host).loggedPaths;
}
//@ chunk-82kqcve8.js:275096-275107 layout
var gh = 256;
//@ chunk-82kqcve8.js:275107-275161 layout
function id(e) {
  let n = od();
  return n.size < gh && !n.has(e);
}
//@ chunk-82kqcve8.js:275161-275309 layout
function logPlayfulLobsterOnce(e, n, r) {
  let s = `${r}:${e}`;
  if (!id(s)) return;
  (od().add(s),
    logEvent("tengu_playful_lobster_fired", {
      step: fromEnum(n),
      mode: lit("shadow"),
      permissionMode: fromEnum(r),
    }));
}
//@ chunk-82kqcve8.js:275309-275396 layout
function ph(e) {
  try {
    let stats = getFsImplementation().statSync(e);
    return stats.isFile() && stats.nlink > 1;
  } catch {
    return !1;
  }
}
/**
 * 读权限判定：1 Read deny 规则（每种拼写）→ deny；2 记忆暂停时读记忆 → deny；3 restricted / blockReadsOutsideWorkingDirectories 下工作目录外的读 → deny 或 ask；路径无法解析 → deny；4 dYe 额外检查；5 Read ask 规则 → ask；6 若同一路径可编辑（checkWritePermissionForTool 以非 plan 上下文判定为 allow）则读也允许；7 在工作目录内 → allow；8 内部可读路径（checkReadableInternalPath）；9 Read allow 规则；否则 ask 并给出 addRules/addDirectories 建议。
 */
//@ chunk-82kqcve8.js:275396-277561 facade-majority = checkReadPermissionForTool (0.573)
function checkReadPermissionForTool(tool, input, toolPermissionContext, precomputedPathsToCheck) {
  if (typeof tool.getPath !== "function")
    return {
      behavior: "ask",
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    };
  let path = tool.getPath(input),
    pathsToCheck = precomputedPathsToCheck ?? walkPermissionCheckPaths(path),
    spellings = pathsToCheck.spellings,
    S,
    getAbsolutePath = () => (S ??= expandPath(path)),
    O,
    shouldRecordImplicitRead = () => {
      if (O === void 0)
        try {
          O = uh() && id(`${toolPermissionContext.mode}:${getAbsolutePath()}`) && ph(getAbsolutePath());
        } catch {
          O = !1;
        }
      return O;
    };
  for (let pathToCheck of spellings) {
    let denyRule = matchingRuleForInput(pathToCheck, toolPermissionContext, "read", "deny");
    if (denyRule)
      return {
        behavior: "deny",
        message: `Permission to read ${encodeControlChars(path)} has been denied.`,
        decisionReason: { type: "rule", rule: denyRule },
      };
  }
  if (isAutoMemoryHeldForSession()) {
    let ce = expandPathOrNull(path);
    if (md(ce === null ? spellings : [...spellings, ce])) return MEMORY_PAUSED_READ_DENIAL;
  }
  if (toolPermissionContext.restricted || toolPermissionContext.blockReadsOutsideWorkingDirectories) {
    let ce = denyIfOutsideWorkingDirs(
      path,
      pathsToCheck,
      toolPermissionContext,
      () =>
        checkReadableInternalPath(getAbsolutePath(), input, spellings, {
          restricted: toolPermissionContext.restricted,
          blockOutsideReads: toolPermissionContext.blockReadsOutsideWorkingDirectories,
          readBlockFence: toolPermissionContext.blockReadsOutsideWorkingDirectories,
          searchRootFence: toolPermissionContext.blockReadsOutsideWorkingDirectories,
        }),
      toolPermissionContext.restricted ? RESTRICTED_MODE_CONSTRAINT : OUTSIDE_READS_CONSTRAINT,
      toolPermissionContext.blockReadsOutsideWorkingDirectories
        ? blockReadsWorkingDirectories(toolPermissionContext)
        : allWorkingDirectories(toolPermissionContext),
      Kc(toolPermissionContext),
    );
    if (ce) {
      if (
        toolPermissionContext.servedCall === !0 &&
        !toolPermissionContext.restricted &&
        ce.behavior === "deny" &&
        !L9r()
      )
        return {
          behavior: "ask",
          message: ce.message,
          decisionReason: {
            type: "safetyCheck",
            reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
            classifierApprovable: !1,
            circuitBreaker: "outsideReadsBlocked",
          },
        };
      return ce;
    }
  } else if (pathsToCheck.unresolved) return denyUnresolvablePath("read from", path);
  let L = checkReadNetworkPathSafety(tool, input, toolPermissionContext, spellings);
  if (L) return L;
  for (let pathToCheck of spellings) {
    let askRule = matchingRuleForInput(pathToCheck, toolPermissionContext, "read", "ask");
    if (askRule)
      return {
        behavior: "ask",
        message: `Claude requested permissions to read from ${encodeControlChars(path)}, but you haven't granted it yet.`,
        decisionReason: { type: "rule", rule: askRule },
      };
  }
  let editCheckContext =
      toolPermissionContext.mode === "plan" || toolPermissionContext.blockWritesOutsideWorkingDirectories
        ? {
            ...toolPermissionContext,
            ...(toolPermissionContext.mode === "plan" && { mode: "default" }),
            blockWritesOutsideWorkingDirectories: !1,
          }
        : toolPermissionContext,
    editResult = checkWritePermissionForTool(tool, input, editCheckContext, pathsToCheck);
  if (editResult.behavior === "allow") {
    if (editResult.decisionReason?.type === "mode" && shouldRecordImplicitRead())
      logPlayfulLobsterOnce(getAbsolutePath(), "editImpliesRead", toolPermissionContext.mode);
    return editResult;
  }
  if (pathInAllowedWorkingPath(path, toolPermissionContext, spellings)) {
    if (shouldRecordImplicitRead())
      logPlayfulLobsterOnce(getAbsolutePath(), "workingDir", toolPermissionContext.mode);
    return { behavior: "allow", updatedInput: input, decisionReason: { type: "mode", mode: "default" } };
  }
  let ae = getAbsolutePath(),
    ee = checkReadableInternalPath(ae, input, spellings, {
      restricted: toolPermissionContext.restricted,
      blockOutsideReads: toolPermissionContext.blockReadsOutsideWorkingDirectories,
    });
  if (ee.behavior !== "passthrough" && internalPathDecisionStands(ee, toolPermissionContext)) return ee;
  let re = matchingAllowRuleForAllPaths(spellings, toolPermissionContext, "read");
  if (re) return { behavior: "allow", updatedInput: input, decisionReason: { type: "rule", rule: re } };
  return {
    behavior: "ask",
    suggestions: generateSuggestions(path, "read", toolPermissionContext, spellings),
    ...buildOutsideWorkingDirAsk("read from", path, pathsToCheck, toolPermissionContext),
  };
}
/**
 * 写权限判定：1 j9r 早期判定（deny 规则、受保护路径等）；2 会话里允许的 skill 目录规则；3 Edit ask 规则 → ask；4 内部可编辑路径（计划文件、scratchpad、记忆…）→ allow 或 deny；5 checkPathSafetyForAutoEdit 不安全 → ask（建议限定 skill 规则或 acceptEdits）；6 plan 模式 → ask；7 acceptEdits 且在工作目录内 → allow；8 Edit allow 规则 → allow；9 其他 → ask（工作目录外附 addDirectories 建议，经符号链接落到目录外时说明）。
 */
//@ chunk-82kqcve8.js:277561-279637 facade-majority = checkWritePermissionForTool (0.694)
function checkWritePermissionForTool(tool, input, toolPermissionContext, precomputedPathsToCheck) {
  if (typeof tool.getPath !== "function")
    return {
      behavior: "ask",
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    };
  let path = tool.getPath(input),
    pathsToCheck = precomputedPathsToCheck ?? walkPermissionCheckPaths(path),
    spellings = pathsToCheck.spellings,
    absolutePathForEdit = expandPath(path),
    earlyDecision = writeDenyPrefix(path, pathsToCheck, absolutePathForEdit, toolPermissionContext);
  if (earlyDecision !== void 0) return earlyDecision;
  let sessionSkillRules = (toolPermissionContext.alwaysAllowRules.session ?? []).filter((ae) => {
      let ruleContent = permissionRuleValueFromString(ae).ruleContent;
      return (
        isSkillDirGlob(ruleContent) &&
        !spellings.some((re) => hasNestedClaudeDirBelowRuleRoot(re, ruleContent ?? ""))
      );
    }),
    sessionSkillRule =
      sessionSkillRules.length > 0
        ? matchingAllowRuleForAllPaths(
            spellings,
            { ...toolPermissionContext, alwaysAllowRules: { session: sessionSkillRules } },
            "edit",
          )
        : null;
  if (
    sessionSkillRule &&
    toolPermissionContext.mode !== "plan" &&
    !spellings.some((ae) =>
      hasSuspiciousWindowsPathPattern(ae, toolPermissionContext.trustedNetworkDirectories),
    ) &&
    !spellings.some((ae) => isInGlobalClaudeFolder(ae) > 1)
  )
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "rule", rule: sessionSkillRule },
    };
  for (let pathToCheck of spellings) {
    let askRule = matchingRuleForInput(pathToCheck, toolPermissionContext, "edit", "ask");
    if (askRule)
      return {
        behavior: "ask",
        message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
        decisionReason: { type: "rule", rule: askRule },
      };
  }
  let internalEditDecision = checkEditableInternalPath(absolutePathForEdit, input, spellings, {
    restricted: toolPermissionContext.restricted,
  });
  if (
    internalEditDecision.behavior !== "passthrough" &&
    internalPathDecisionStands(internalEditDecision, toolPermissionContext)
  )
    return internalEditDecision;
  let safety = checkPathSafetyForAutoEdit(
    path,
    spellings,
    void 0,
    remoteConfigEditExemptionApplies(toolPermissionContext),
    toolPermissionContext.trustedNetworkDirectories,
  );
  if (!safety.safe) {
    let ae =
        toolPermissionContext.restricted ||
        spellings.some(
          (we) =>
            isInGlobalClaudeFolder(we) > 1 ||
            hasSuspiciousWindowsPathPattern(we, toolPermissionContext.trustedNetworkDirectories),
        )
          ? null
          : getClaudeSkillScope(path),
      ee = ae
        ? [
            {
              type: "addRules",
              rules: [{ toolName: FILE_EDIT_TOOL_NAME, ruleContent: ae.pattern }],
              behavior: "allow",
              destination: "session",
            },
          ]
        : generateSuggestions(path, "write", toolPermissionContext, spellings),
      isInWorkingDir = sensitiveWriteRedirect(path, pathsToCheck, toolPermissionContext),
      ce = isInWorkingDir === null ? safety.message : `${safety.message} ${isInWorkingDir.sentence}.`;
    return {
      behavior: "ask",
      message: ce,
      suggestions: ee,
      ...(isInWorkingDir !== null && { blockedPath: isInWorkingDir.landing }),
      decisionReason: {
        type: "safetyCheck",
        reason: ce,
        ...safetyCheckReasonFields(safety, toolPermissionContext.restricted),
        ...(isInWorkingDir?.personOnly && { classifierApprovable: !1 }),
      },
    };
  }
  if (toolPermissionContext.mode === "plan")
    return {
      behavior: "ask",
      message: `Cannot write to ${encodeControlChars(path)} while in plan mode.`,
      decisionReason: { type: "mode", mode: "plan" },
    };
  let inWorkingDir = pathInAllowedWorkingPath(path, toolPermissionContext, spellings);
  if (toolPermissionContext.mode === "acceptEdits" && inWorkingDir)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: { type: "mode", mode: toolPermissionContext.mode },
    };
  let allowRule = matchingAllowRuleForAllPaths(spellings, toolPermissionContext, "edit");
  if (allowRule)
    return { behavior: "allow", updatedInput: input, decisionReason: { type: "rule", rule: allowRule } };
  if (inWorkingDir)
    return {
      behavior: "ask",
      message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
      suggestions: generateSuggestions(path, "write", toolPermissionContext, spellings),
    };
  return {
    behavior: "ask",
    suggestions: generateSuggestions(path, "write", toolPermissionContext, spellings),
    ...buildOutsideWorkingDirAsk("write to", path, pathsToCheck, toolPermissionContext),
  };
}
/**
 * 写入目标本身是符号链接时拒绝，提示改写链接目标路径。
 */
//@ chunk-82kqcve8.js:279637-280005 facade-majority
function leafSymlinkWriteRefusal(path, pathsToCheck) {
  if (!pathsToCheck.leafIsSymlink) return null;
  let r = pathsToCheck.unresolved ? "a target that could not be determined" : HD(pathsToCheck.landing);
  return {
    behavior: "deny",
    message: `Refusing to write ${HD(path)}: it is a symbolic link. Write to the link's target path instead: ${r}.`,
    decisionReason: { type: "other", reason: "Write target is a symbolic link" },
    ...(!pathsToCheck.unresolved && { blockedPath: pathsToCheck.landing }),
  };
}
/**
 * 请求路径经符号链接后落点与原拼写不同时，返回 {landing, landingOutside, spellingInside, carriedOut}（carriedOut=原拼写在工作目录内而落点在外）。
 */
//@ chunk-82kqcve8.js:280005-280180 facade-majority
function symlinkRedirect(pathsToCheck, toolPermissionContext, extraDirs) {
  let s = symlinkLanding(pathsToCheck);
  if (s === null) return null;
  let h = (S) => pathInAllowedWorkingPath(S, toolPermissionContext, [S], extraDirs),
    y = !h(s),
    w = h(pathsToCheck.requested);
  return { landing: s, landingOutside: y, spellingInside: w, carriedOut: w && y };
}
/**
 * 若路径经符号链接解析后的落点与请求路径不同（按规范键比较），返回落点；未解析或相同返回 null。
 */
//@ chunk-82kqcve8.js:280180-280278 facade-majority
function symlinkLanding(pathsToCheck) {
  if (pathsToCheck.unresolved) return null;
  return canonicalPathKey(pathsToCheck.landing) === canonicalPathKey(pathsToCheck.requested)
    ? null
    : pathsToCheck.landing;
}
//@ chunk-82kqcve8.js:280278-280315 layout
function canonicalPathKey(e) {
  return normalizeTrustedSymlink(Mn(resolve(e)));
}
/**
 * 写目标经符号链接重定向时生成说明：返回 {landing, sentence, personOnly}；请求路径本身安全或已实际落到目录外时 personOnly=true，要求必须由人确认。
 */
//@ chunk-82kqcve8.js:280315-280528 facade-majority
function sensitiveWriteRedirect(path, pathsToCheck, toolPermissionContext) {
  let s = symlinkRedirect(pathsToCheck, toolPermissionContext);
  if (s === null) return null;
  let safe = checkPathSafetyForAutoEdit(
    pathsToCheck.requested,
    [pathsToCheck.requested],
    void 0,
    remoteConfigEditExemptionApplies(toolPermissionContext),
    toolPermissionContext.trustedNetworkDirectories,
  ).safe;
  return { landing: s.landing, sentence: symlinkRedirectSentence(path, s), personOnly: safe || s.carriedOut };
}
/**
 * 路径是否是只能由人改的内部文件（checkEditableInternalPath 精确匹配为 deny），供 Bash/PowerShell 路径校验使用。
 */
//@ chunk-82kqcve8.js:280528-280624 facade-majority
function hardDeniedAsSpelled(path, toolPermissionContext) {
  return (
    checkEditableInternalPath(path, {}, [path], {
      restricted: toolPermissionContext.restricted,
      exactOnly: !0,
    }).behavior === "deny"
  );
}
/**
 * 拼出“X 解析到 Y”的符号链接说明句；落点在工作目录外时追加“which is outside the allowed working directories”。
 */
//@ chunk-82kqcve8.js:280624-280744 facade-majority
function symlinkRedirectSentence(e, n) {
  return `${formatSymlinkResolution(e, n.landing)}${n.landingOutside ? ", which is outside the allowed working directories" : ""}`;
}
//@ chunk-82kqcve8.js:280744-281133 layout
function buildOutsideWorkingDirAsk(verb, path, pathsToCheck, toolPermissionContext) {
  let h = `Claude requested permissions to ${verb} ${encodeControlChars(path)}, but you haven't granted it yet.`,
    y = symlinkRedirect(pathsToCheck, toolPermissionContext);
  if (y === null || !y.carriedOut)
    return {
      message: h,
      decisionReason: { type: "workingDir", reason: OUTSIDE_WORKING_DIRECTORIES_ASK_REASON },
    };
  let w = symlinkRedirectSentence(path, y);
  return {
    message: `${h} ${w}.`,
    blockedPath: y.landing,
    decisionReason:
      verb === "write to"
        ? { type: "safetyCheck", reason: w, classifierApprovable: !1 }
        : { type: "workingDir", reason: w },
  };
}
//@ chunk-82kqcve8.js:281133-281402 layout
function denyUnresolvablePath(verb, path) {
  return {
    behavior: "deny",
    message: `Refusing to ${verb === "write to" ? "write" : "read"} ${HD(path)}: where it leads on disk could not be determined (a link on the way could not be examined, or the links do not resolve).`,
    decisionReason: { type: "other", reason: unresolvablePathMessage(path) },
  };
}
//@ chunk-82kqcve8.js:281402-281475 layout
function formatSymlinkResolution(e, n) {
  return `${HD(e)} resolves through a symlink to ${HD(n)}`;
}
/**
 * 生成权限对话框的建议更新：工作目录外的读 → 对父目录的 Read 会话规则；写/创建 → 可切到 acceptEdits 时建议 setMode，目录外再加 addDirectories；其他只给 setMode 建议。
 */
//@ chunk-82kqcve8.js:281475-281897 facade-majority = generateSuggestions (0.949)
function generateSuggestions(filePath, operationType, toolPermissionContext, precomputedPathsToCheck) {
  let isOutsideWorkingDir = !pathInAllowedWorkingPath(
    filePath,
    toolPermissionContext,
    precomputedPathsToCheck,
  );
  if (operationType === "read" && isOutsideWorkingDir) {
    let dirPath = getDirectoryForPath(filePath);
    return getPathsForPermissionCheck(dirPath)
      .map((dir) => createReadRuleSuggestion(dir, "session"))
      .filter((S) => S !== void 0);
  }
  let y = acceptEditsSuggestionApplies(toolPermissionContext);
  if (operationType === "write" || operationType === "create") {
    let updates = y ? [{ type: "setMode", mode: "acceptEdits", destination: "session" }] : [];
    if (isOutsideWorkingDir) {
      let dirPath = getDirectoryForPath(filePath),
        dirsToAdd = getPathsForPermissionCheck(dirPath);
      updates.push({ type: "addDirectories", directories: dirsToAdd, destination: "session" });
    }
    return updates;
  }
  return y ? [{ type: "setMode", mode: "acceptEdits", destination: "session" }] : [];
}
/**
 * 把内部路径的真实拼写还原成规范根：若路径以 cwd、原始 cwd、配置目录、家目录等根的某个解析拼写开头，就换回原根；否则按可信符号链接改写。
 */
//@ chunk-82kqcve8.js:281897-282090 facade-majority
function normalizeInternalPathRoot(e) {
  for (let n of [
    getCwd(),
    getOriginalCwd(),
    getProjectRoot(),
    getClaudeConfigDirOrNull(),
    getMemoryBaseDirOrNull(),
    homedir(),
  ]) {
    if (n === null) continue;
    for (let r of getResolvedWorkingDirPaths(n)) {
      if (r === n) continue;
      if (e === r || e.startsWith(r + sep)) return n + e.slice(r.length);
    }
  }
  return normalizeTrustedSymlink(e);
}
//@ chunk-82kqcve8.js:282356-282430 sole-consumer
function md(e) {
  return (
    isAutoMemoryHeldForSession() &&
    (hasNoAutoMemPath() ||
      e.some((n) => isAutoMemPath(n + sep) || isAutoMemPath(normalizeInternalPathRoot(n) + sep)))
  );
}
/**
 * 把 safetyCheck 类型的拒绝原因改成 other（保留 reason，标 wasSafetyCheck），让它作为 ask 传播时不再带安全检查的熔断语义。
 */
//@ chunk-82kqcve8.js:282430-282537 facade-majority
function untypeDenyReasonForAskPropagation(e) {
  if (e?.type !== "safetyCheck") return e;
  return { type: "other", reason: e.reason, wasSafetyCheck: !0 };
}
/**
 * 内部路径给出的结论是否成立：服务端代执行（servedCall）的调用不接受内部路径的 allow，其余都成立。
 */
//@ chunk-82kqcve8.js:282537-282604 facade-majority
function internalPathDecisionStands(decision, toolPermissionContext) {
  return !(toolPermissionContext.servedCall === !0 && decision.behavior === "allow");
}
/**
 * 内部路径写判定：拒绝写宿主凭证文件、配置目录 jobs/daemon/shell-snapshots/session-env/adopt.json、seed-admin、profile store、settings-review store、记忆暂停时的记忆文件；放行（返回 allow，denySpeculation 包装）当前会话计划文件、workflow 脚本、scratchpad、后台会话 tmp、agent/auto memory 的 .md、.claude/launch.json；否则 passthrough。
 */
//@ chunk-82kqcve8.js:282604-284134 facade-majority = checkEditableInternalPath (0.569)
function checkEditableInternalPath(absolutePath, input, pathsToCheck, options) {
  if (isDiskless()) return NO_CONFIG_DIR_WRITE_DENIAL;
  if (pathsToCheck && pathsToCheck.length > 0) {
    let mapped = pathsToCheck.map(normalizeMsysDrivePath);
    if (mapped.some(isHostCredsFilePath)) return HOST_CREDS_WRITE_DENIAL;
    let L = new Map(),
      j = checkConfigDirInternalWrite(mapped, "exact", L);
    if (j !== void 0) return j;
    if (mapped.some(isSeedAdminPath)) return SEED_ADMIN_WRITE_DENIAL;
    if (mapped.some(isProfileStorePath)) return PROFILE_STORE_WRITE_DENIAL;
    if (mapped.some(isSettingsReviewStorePath)) return SETTINGS_REVIEW_STORE_WRITE_DENIAL;
    let normalizedPath = Ii(mapped);
    if (normalizedPath !== void 0) return normalizedPath;
    let Z = Ti(mapped);
    if (Z !== void 0) return Z;
    if (options?.exactOnly !== !0) {
      let ae = checkConfigDirInternalWrite(mapped, "widest", L);
      if (ae !== void 0) return ae;
    }
    return requireAllAllowed(
      pathsToCheck,
      (ae, ee) => checkEditableInternalPath(ae, ee, void 0, options),
      input,
    );
  }
  let h = normalize(absolutePath),
    y = normalize(normalizeMsysDrivePath(absolutePath)),
    w = new Map(),
    S =
      checkConfigDirInternalWrite([y], "exact", w) ??
      (options?.exactOnly === !0 ? void 0 : checkConfigDirInternalWrite([y], "widest", w));
  if (S !== void 0) return S;
  if (getPlanFilePath_2(h))
    return allowWithReason(input, "Plan files for current session are allowed for writing");
  if (!options?.restricted && !options?.blockOutsideWrites && Ip(h))
    return allowWithReason(input, "Workflow script files for current session are allowed for writing");
  if (isScratchpadPath(h))
    return allowWithReason(input, "Scratchpad files for current session are allowed for writing");
  if (isBgJobTmpPath(h))
    return allowWithReason(input, "Job tmp/ subtree for current bg session is allowed for writing");
  if (!options?.restricted && !options?.blockOutsideWrites && h.endsWith(".md") && isInsideAgentMemoryDir(h))
    return allowWithReason(input, "Agent memory files are allowed for writing");
  if ((mayBeAutoMemPath(h) || mayBeAutoMemPath(y)) && isAutoMemoryHeldForSession())
    return MEMORY_PAUSED_WRITE_DENIAL;
  if (
    !options?.restricted &&
    (!hasAutoMemPathOverride() || options?.blockOutsideWrites) &&
    h.endsWith(".md") &&
    ((isAutoMemPathSafeForCarveout(h) && !(options?.blockOutsideWrites && isAutoMemPathFromRepoSettings())) ||
      isOwnProjectAutoMemPathSafeForCarveout(h))
  )
    return allowWithReason(input, AUTO_MEM_WRITE_ALLOW_REASON);
  if (!options?.restricted && h === join(getOriginalCwd(), ".claude", "launch.json"))
    return allowWithReason(input, "Preview launch config is allowed for writing");
  if (isSeedAdminPath(y)) return SEED_ADMIN_WRITE_DENIAL;
  if (isHostCredsFilePath(y)) return HOST_CREDS_WRITE_DENIAL;
  if (isProfileStorePath(y)) return PROFILE_STORE_WRITE_DENIAL;
  if (isSettingsReviewStorePath(y)) return SETTINGS_REVIEW_STORE_WRITE_DENIAL;
  let targetForms = Ii([absolutePath, h, y]);
  if (targetForms !== void 0) return targetForms;
  let np = Ti([absolutePath, h, y]);
  if (np !== void 0) return np;
  return { behavior: "passthrough", message: "" };
}
/**
 * 内部路径读判定：放行项目目录、计划文件、工具结果文件、scratchpad、后台会话 tmp、项目临时目录、agent/auto memory、tasks/teams、（readBlockFence 时）用户 CLAUDE.md 与 skills/plugins/rules/agents/commands、内置 skill 参考文件；记忆暂停时拒绝读记忆；否则 passthrough。
 */
//@ chunk-82kqcve8.js:284134-285855 facade-majority = checkReadableInternalPath (0.698)
function checkReadableInternalPath(absolutePath, input, pathsToCheck, options) {
  if (isDiskless())
    return isAutoMemoryHeldForSession()
      ? MEMORY_PAUSED_READ_DENIAL
      : { behavior: "passthrough", message: "" };
  if (pathsToCheck && pathsToCheck.length > 0)
    return requireAllAllowed(pathsToCheck, (L, j) => checkReadableInternalPath(L, j, void 0, options), input);
  let normalizedPath = normalize(absolutePath);
  if (mayBeAutoMemPath(normalizedPath) && isAutoMemoryHeldForSession()) return MEMORY_PAUSED_READ_DENIAL;
  if (
    !options?.restricted &&
    isSessionMemoryPath(normalizedPath, options?.blockOutsideReads ? getOriginalCwd() : void 0)
  )
    return allowWithReason(input, "Project directory files are allowed for reading");
  if (getPlanFilePath_2(normalizedPath))
    return allowWithReason(input, "Plan files for current session are allowed for reading");
  let toolResultsDir_2 = toolResultsDir(),
    toolResultsDirWithSep = toolResultsDir_2.endsWith(sep) ? toolResultsDir_2 : toolResultsDir_2 + sep;
  if (normalizedPath === toolResultsDir_2 || normalizedPath.startsWith(toolResultsDirWithSep))
    return allowWithReason(input, "Tool result files are allowed for reading");
  if (isScratchpadPath(normalizedPath))
    return allowWithReason(input, "Scratchpad files for current session are allowed for reading");
  if (isBgJobTmpPath(normalizedPath))
    return allowWithReason(input, "Job tmp/ subtree for current bg session is allowed for reading");
  if (normalizedPath.startsWith(Sx()))
    return allowWithReason(input, "Project temp directory files are allowed for reading");
  let S = options?.remoteSurface || options?.restricted,
    R = S || options?.blockOutsideReads;
  if (!R && isInsideAgentMemoryDir(normalizedPath))
    return allowWithReason(input, "Agent memory files are allowed for reading");
  if (
    !S &&
    (isAutoMemPathSafeForCarveout(normalizedPath) ||
      (options?.searchRootFence && isAutoMemPathSafeForCarveout(normalizedPath + sep))) &&
    !(options?.blockOutsideReads && isAutoMemPathFromRepoSettings())
  )
    return allowWithReason(input, "auto memory files are allowed for reading");
  let O = join(getClaudeConfigDir(), "tasks") + sep;
  if (!R && (normalizedPath === O.slice(0, -1) || normalizedPath.startsWith(O)))
    return allowWithReason(input, "Task files are allowed for reading");
  let P = join(getClaudeConfigDir(), "teams") + sep;
  if (!R && (normalizedPath === P.slice(0, -1) || normalizedPath.startsWith(P)))
    return allowWithReason(input, "Team files are allowed for reading");
  if (options?.readBlockFence && !options.restricted) {
    if (normalizedPath === join(getClaudeConfigDir(), "CLAUDE.md"))
      return allowWithReason(input, "The user memory file is allowed for reading");
    for (let L of ["skills", "plugins", "rules", "agents", "commands"]) {
      let j = join(getClaudeConfigDir(), L) + sep;
      if (normalizedPath === j.slice(0, -1) || normalizedPath.startsWith(j))
        return allowWithReason(input, `User ${L} files are allowed for reading`);
    }
  }
  if (!options?.remoteSurface && normalizedPath.startsWith(getBundledSkillsRoot() + sep))
    return allowWithReason(input, "Bundled skill reference files are allowed for reading");
  return { behavior: "passthrough", message: "" };
}
/**
 * 权限结果 {behavior:"allow", updatedInput, decisionReason:{type:"other", reason}}。旧版名 denySpeculation 为错配，属于权限文件系统检查。
 */
//@ chunk-82kqcve8.js:285855-285951 placement = denySpeculation (0.639)
function allowWithReason(message, reason) {
  return { behavior: "allow", updatedInput: message, decisionReason: { type: "other", reason: reason } };
}
//@ chunk-82kqcve8.js:285951-286070 layout
function buildSafetyCheckAsk(e, n) {
  return {
    behavior: "ask",
    message: e,
    decisionReason: { type: "safetyCheck", classifierApprovable: !1, reason: n },
  };
}
/**
 * 是否为读闸门产生的安全询问：behavior 为 ask，且原因是 other，或是不可由分类器批准、也没有熔断标签的 safetyCheck。
 */
//@ chunk-82kqcve8.js:286070-286275 facade-majority
function isReadGateSafetyAsk(e) {
  return (
    e?.behavior === "ask" &&
    (e.decisionReason?.type === "other" ||
      (e.decisionReason?.type === "safetyCheck" &&
        e.decisionReason.classifierApprovable === !1 &&
        e.decisionReason.circuitBreaker === void 0))
  );
}
/**
 * 用户 skills 目录（配置目录下 skills，含真实路径）的大小写折叠拼写列表，按会话缓存。
 */
//@ chunk-82kqcve8.js:286275-286619 layout
function getUserSkillsBaseSpellings() {
  let e = getSessionPathsCache();
  if (e.userSkillsBaseSpellingsFolded !== void 0) return e.userSkillsBaseSpellingsFolded;
  let n = getFsImplementation(),
    r = new Set(),
    s = (y) => {
      r.add(normalizeCaseForComparison(y));
      try {
        r.add(normalizeCaseForComparison(n.realpathSync(y)));
      } catch {}
    },
    h = expandPath(getClaudeConfigDir());
  s(join(h, "skills"));
  try {
    s(join(n.realpathSync(h), "skills"));
  } catch {}
  return ((e.userSkillsBaseSpellingsFolded = [...r]), e.userSkillsBaseSpellingsFolded);
}
/**
 * 写判定的前置拒绝：先查内部硬拒绝；restricted 或 blockWritesOutsideWorkingDirectories 下检查工作目录约束；阻写模式下可能是设置文件则直接 deny；最后交给 yh 做剩余前置检查。
 */
//@ chunk-82kqcve8.js:286619-287050 facade-majority
function writeDenyPrefix(e, n, r, s) {
  let h = findEditDenyForSpellings(e, n.spellings, s);
  if (h !== void 0) return h;
  if (s.restricted || s.blockWritesOutsideWorkingDirectories) {
    let y = denyIfOutsideWorkingDirs(
      e,
      n,
      s,
      () => Xc(r, n.spellings, s),
      s.restricted ? RESTRICTED_MODE_CONSTRAINT : OUTSIDE_WRITES_CONSTRAINT,
      s.blockWritesOutsideWorkingDirectories ? blockReadsWorkingDirectories(s) : allWorkingDirectories(s),
    );
    if (y) return y;
  }
  if (s.blockWritesOutsideWorkingDirectories && settingsFileCertainty(n.spellings) !== "none")
    return {
      behavior: "deny",
      message: encodeControlChars(`${e}: ${SETTINGS_WRITES_BLOCKED_DENY_REASON}`),
      decisionReason: { type: "other", reason: SETTINGS_WRITES_BLOCKED_DENY_REASON },
    };
  return getInternalWriteDenial(e, n, r);
}
//@ chunk-82kqcve8.js:287050-287240 affinity
function findEditDenyForSpellings(e, n, r) {
  for (let s of n) {
    let h = matchingRuleForInput(s, r, "edit", "deny");
    if (h)
      return {
        behavior: "deny",
        message: `Permission to edit ${encodeControlChars(e)} has been denied.`,
        decisionReason: { type: "rule", rule: h },
      };
  }
  return;
}
/**
 * 内部写路径的硬拒绝：无磁盘模式、记忆暂停、配置目录内部文件、种子管理/宿主凭据/档案/设置审阅存储，以及其他内部禁区；路径无法解析时拒绝。
 */
//@ chunk-82kqcve8.js:287240-287677 affinity
function getInternalWriteDenial(e, n, r) {
  if (isDiskless()) return NO_CONFIG_DIR_WRITE_DENIAL;
  if (md([...n.spellings, r])) return MEMORY_PAUSED_WRITE_DENIAL;
  let s = new Map(),
    h = checkConfigDirInternalWrite(n.spellings, "exact", s);
  if (h !== void 0) return h;
  if (n.spellings.some(isSeedAdminPath)) return SEED_ADMIN_WRITE_DENIAL;
  if (n.spellings.some(isHostCredsFilePath)) return HOST_CREDS_WRITE_DENIAL;
  if (n.spellings.some(isProfileStorePath)) return PROFILE_STORE_WRITE_DENIAL;
  if (n.spellings.some(isSettingsReviewStorePath)) return SETTINGS_REVIEW_STORE_WRITE_DENIAL;
  let y = Ii(n.spellings);
  if (y !== void 0) return y;
  let w = Ti(n.spellings);
  if (w !== void 0) return w;
  if (n.unresolved) return denyUnresolvablePath("write to", e);
  return checkConfigDirInternalWrite(n.spellings, "widest", s);
}
//@ chunk-82kqcve8.js:287677-287804 affinity
function orderRootEntries(e) {
  return e.has(null) && gl() === null
    ? [...e.entries()].sort(([n], [r]) => Number(n === null) - Number(r === null))
    : e.entries();
}
/**
 * （旧版名不符）Windows 路径规范化：解析真实路径、本机管理共享转盘符，再大写并按 \ 拆段。
 */
//@ chunk-fq0cr76a.js:876912-876997 placement = normalizeGitPathArg (0.677)
function normalizeGitPathArg(arg) {
  return win32_5.normalize(xle(arg)).toUpperCase().split("\\").filter(Boolean);
}
//@ chunk-fq0cr76a.js:876997-877058 placement
function xle(e) {
  let n = realPathOrSelf(adminShareToDrivePath(e)),
    r = adminShareToDrivePath(n);
  return r === n ? n : realPathOrSelf(r);
}
//@ chunk-fq0cr76a.js:877058-877095 placement
function realPathOrSelf(e) {
  return Rke(e).real ?? e;
}
//@ chunk-fq0cr76a.js:877095-877365 placement
function adminShareToDrivePath(e) {
  let n = uncHostOf(e)?.replace(/\.$/, ""),
    match = /^[\\/]{2}(?:[?.][\\/]unc[\\/])?[^\\/]+[\\/]+([a-z])\$(?:[\\/](.*))?$/is.exec(e);
  return match !== null &&
    n !== void 0 &&
    (pw(n) || n === "--1.ipv6-literal.net" || n === hostname_2().replace(/[A-Z]/g, (s) => s.toLowerCase()))
    ? `${match[1]}:\\${match[2] ?? ""}`
    : e;
}
/**
 * 返回 classifySensitivePath 的 reason 或 null。与模型无关（切分错误）。
 */
//@ chunk-axmbhcjg.js:23906-23956 placement
function getSensitivePathReason(e, n, r) {
  return classifySensitivePath(e, n, r)?.reason ?? null;
}
/**
 * 敏感或拒绝读时返回 {path: 别名或原路径, reason}。旧版名 resolveAntModel 为错配。
 */
//@ chunk-axmbhcjg.js:23956-24047 placement = resolveAntModel (0.385)
function resolveSensitivePath(e, n, r, o) {
  let i = classifySensitivePath(e, n, r);
  return i === null ? null : { path: i.alias ?? o, reason: i.reason };
}
/**
 * 把路径（词法/真实/原始相对路径及其别名、配置目录下的对应路径）逐一交给判定函数：sensitive/host_config 归 sensitive，read_denied/rules_unreadable 归 read_denied，否则 null。
 */
//@ chunk-axmbhcjg.js:24047-24585 placement
function classifySensitivePath(e, n, r) {
  let o = uniq([r.lexicalRel, r.rel, ...r.rawRels]),
    filtered = uniq(o.flatMap((d) => getAliasSpellings(e, d))).filter((d) => !o.includes(d)),
    s = [...o, ...filtered];
  if ([...s, ...s.map((d) => join(e.configHome, ...d.split("/"))), r.realPath].some((d) => hor(d)))
    return { reason: "sensitive", alias: null };
  for (let d of s) {
    let f = filtered.includes(d) ? d : null;
    switch (n(d, !1)) {
      case "sensitive":
      case "sensitive_tracked":
      case "host_config":
        return { reason: "sensitive", alias: f };
      case "read_denied":
      case "rules_unreadable":
        return { reason: "read_denied", alias: f };
      case "content_filter":
      case null:
        break;
    }
  }
  return null;
}
/**
 * 从工具上下文取 toolPermissionContext.additionalWorkingDirectories（Map）。与 filesystem 的 allWorkingDirectories 同名但不含 cwd，应归 UI/工具侧代码。
 */
//@ chunk-18hwfzwa.js:63795-63873 fingerprint = allWorkingDirectories (0.708)
function allWorkingDirectories_2(context) {
  return context.toolPermissionContext.additionalWorkingDirectories;
}
/**
 * 在路径中找出 scratchpad 根（形如 .../claude[-N]/<x>/<UUID>/scratchpad），返回到 scratchpad 为止的前缀；找不到返回 undefined。
 */
//@ chunk-8wvtd8sr.js:32501-32736 fingerprint = getScratchpadDir (0.842)
function findScratchpadRootInPath(e) {
  let parts = e.split(sep_2),
    lastIndex = parts.findLastIndex(
      (r, h) =>
        h >= 3 &&
        r.toLowerCase() === "scratchpad" &&
        /^[0-9a-f]{8}(-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(parts[h - 1]) &&
        /^claude(-\d+)?$/i.test(parts[h - 3]),
    );
  return lastIndex === -1 ? void 0 : parts.slice(0, lastIndex + 1).join(sep_2);
}
/**
 * 不允许自动编辑的危险文件名（shell 配置、git 配置、包管理器与构建工具配置等）及其小写集合。
 */
//@ chunk-bhhkxwra.js:191-788 fingerprint = DANGEROUS_FILES (0.395)
var DANGEROUS_FILES = [
    ".gitconfig",
    ".gitmodules",
    ".bashrc",
    ".bash_profile",
    ".zshrc",
    ".zprofile",
    ".profile",
    ".zshenv",
    ".zlogin",
    ".zlogout",
    ".bash_login",
    ".bash_aliases",
    ".bash_logout",
    ".envrc",
    ".ripgreprc",
    ".mcp.json",
    ".claude.json",
    ".npmrc",
    ".yarnrc",
    ".yarnrc.yml",
    ".pnp.cjs",
    ".pnp.loader.mjs",
    ".pnpmfile.cjs",
    "bunfig.toml",
    ".bunfig.toml",
    ".bazelrc",
    ".bazelversion",
    ".bazeliskrc",
    ".pre-commit-config.yaml",
    "lefthook.yml",
    ".lefthook.yml",
    "lefthook.yaml",
    ".lefthook.yaml",
    "gradle-wrapper.properties",
    "maven-wrapper.properties",
    ".devcontainer.json",
    "pyrightconfig.json",
  ],
  DANGEROUS_FILES_LOWER = new Set(DANGEROUS_FILES.map((o) => o.toLowerCase()));
/**
 * 是否 UNC 路径：\\?\UNC\ 前缀，或以 \\ 开头但不是 \\?\、\\.\ 设备前缀。旧版名 hasSuspiciousWindowsPathPattern 误配。
 */
//@ chunk-tb11za84.js:5160-5281 fingerprint = hasSuspiciousWindowsPathPattern (0.569)
function isUncPath(path) {
  return (
    /^\\\\\?\\UNC\\/i.test(path) ||
    (path.startsWith("\\\\") && !path.startsWith("\\\\?\\") && !path.startsWith("\\\\.\\"))
  );
}

export {
  DANGEROUS_FILES_LOWER,
  normalizeTrustedSymlink,
  isLinkedWorktreeFastPathEnabled,
  verifiedLinkedWorktreeDirectories,
  pinResolvedWorkingDirPath,
  pathInWorkingPath,
  normalizeCaseForComparison,
  allWorkingDirectories,
  isScratchpadEnabled,
  getScratchpadDir,
  READ_PATH_PROBE,
  isPathInTrustedNetworkRoot,
  hasSuspiciousWindowsPathPattern,
  readPermissionDecisionForPath,
  isReadGateSafetyAsk,
  checkReadPermissionForTool,
  pathInAllowedWorkingPath,
  symlinkLanding,
  getResolvedWorkingDirPaths,
  isScratchpadPath,
  matchingRuleForInput,
  checkWritePermissionForTool,
  checkPathSafetyForAutoEdit,
  remoteConfigEditExemptionApplies,
  allWorkingDirectories_2,
  toPosixPath,
  generateSuggestions,
  declaredAbsoluteAdditionalDirectories,
  hasReadDenyRuleForPath,
  readWouldBeAutoAllowedForPath,
  holdUnresolvedWorkingDirPathAsNamed,
  patternWithRoot,
  relativePath,
  poolCanRead,
  readAutoAllowedForMutation,
  getBundledSkillsRoot,
  patternWithRootFor,
  ensureScratchpadDir,
  isClaudeSettingsPath,
  isJsonSpelling,
  isManagedSettingsDropInPath,
  managedDropInDirSpellingsAsync,
  safetyCheckReasonFields,
  normalizeInternalPathRoot,
  matchesPathRule,
  findScratchpadRootInPath,
  leafSymlinkWriteRefusal,
  layeredReadVerdictForPaths,
  hasReadDenyRuleInForce,
  checkReadNetworkPathSafety,
  managedDropInDirs,
  settingsLocationPaths,
  normalizePatternsToPath,
  isSearchResultRootRespellEnabled,
  resolveSensitivePath,
  getSensitivePathReason,
  outsideReadBlocked,
  getFileReadIgnorePatterns,
  acceptEditsSuggestionApplies,
  checkEditableInternalPath,
  symlinkRedirect,
  symlinkRedirectSentence,
  hardDeniedAsSpelled,
  denyRuleMatchingAnywhere,
  readDenyRuleMayMatchBeneath,
  matchingDenyRuleForDirectoryContents,
  spellingsToJudge,
  hasPermissionAuthoredBareReadDeny,
  isUntrustedAutomountPath,
  isScratchpadDisplayPath,
  readDenyRuleForPath,
  writeBlockRefusal,
  writeDenyPrefix,
  mayBeGuardedFileSyncCopy,
  mayEscapeExclusionGlobs,
  denyFoldVariantPaths,
  rootPathForSource,
  isUntrustedUncPath,
  isWorkingDirPathHeldAsNamed,
  checkReadableInternalPath,
  normalizeGitPathArg,
  internalPathDecisionStands,
  sensitiveWriteRedirect,
  untypeDenyReasonForAskPropagation,
  matchingAllowRuleForAllPaths,
  classifySuspiciousWindowsPathPattern,
  compiledPathRulePattern,
  blockReadsWorkingDirectories,
  DANGEROUS_DIRECTORIES,
  DANGEROUS_FILES,
  isUncPath,
  SETTINGS_FILE_BASENAMES,
  settingsFileCertainty,
  settingsTextNeedles,
  settingsDirectoryWords,
};
