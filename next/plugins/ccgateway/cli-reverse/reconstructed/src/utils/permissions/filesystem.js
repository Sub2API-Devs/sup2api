/**
 * utils/permissions/filesystem.ts
 *
 * 文件读写权限判定：工作目录与规则模式（gitignore 语义、按规则来源定根）、危险文件/目录与 Claude 设置/配置路径的自动编辑安全检查、内部可读写路径（计划、scratchpad、记忆、配置目录禁区）及权限建议生成。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/permissions/filesystem.ts
 * pieces: chunk-1z3a1qn5.js (1), chunk-5xgkngpb.js (1), chunk-a2q0x549.js (190), chunk-cr1mmxrf.js (1), chunk-czq1j3j2.js (1), chunk-nrv8bm0w.js (1), chunk-qg41pqt6.js (4), chunk-vb7ng9fr.js (3), chunk-xea05003.js (1)
 * attribution: fingerprint 10, facade-majority 88, callgraph-witnessed 2, layout 86, file-local 4, sole-consumer 1, placement 9, affinity 3
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import {
  sep as sep_2,
  posix,
  basename,
  dirname as dirname_2,
  normalize as normalize_2,
  resolve,
  isAbsolute as isAbsolute_2,
  win32,
  join,
} from "path";
import { homedir, hostname } from "os";
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
  posixPathToWindowsPath,
  containsPathTraversal,
  anchorPathUnnormalized,
  expandPathOrNull,
  getDirectoryForPath,
} from "../path.js";
import { isSyncedDirName, isHiddenFoldName } from "../plugins/syncedItems.js";
import {
  foldName,
  foldProtectedDirNameLower,
  isProtectedDirPath,
  regExp as regExp_3,
  isProtectedDirAlwaysFalse,
} from "./protectedDirNames.js";
import { getPlatform } from "../platform.js";
import { SETTING_SOURCES } from "../settings/constants.js";
import {
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  getRuleAnchorRootForSource,
} from "../settings/settings.js";
import { USER_SETTINGS_FILE_NAMES } from "../settings/settingsFileParsing.js";
import { wslInheritsSettings } from "../settings/mdm/settings.js";
import { WSL_MANAGED_SETTINGS_DIR } from "../settings/mdm/wslRegistry.js";
import { getSessionPathsCache, sessionClock } from "../sessionPathsCache.js";
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
import {
  identity,
  normalizeDosDevicePath,
  isUncOrDevicePath,
  hasDotSegment,
  isMacSpecialPath,
  uncHostOf,
} from "../pathClassification.js";
import {
  foldPathSegments,
  isPluginDirReadable,
  scanCommandProducerDirs,
  pluginRootDirs,
  isInCommandProducerDir,
} from "../plugins/pluginCachePaths.js";
import { logError } from "../log.js";
import { getSettingsWatchPaths } from "../../services/remoteManagedSettings/consentRecords.js";
import { getClaudeConfigDir } from "../markdownConfigLoader.js";
import { isManagedSettingsDropInName } from "../settings/managedFileSettings.js";
import {
  getErrnoCode,
  isENOENT,
  TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS,
} from "../errors.js";
import { getDropInDir } from "../fileStateCache.js";
import { workflowScriptsDir } from "../../services/workflow/scriptFile.js";
import { getCwd, launchedCwd, getCwdOrNull } from "../cwd.js";
import { getProjectDir } from "../sessionStorage.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import { getClaudeTempDirRealpath, sessionTempDirRealpath } from "../tempDirRealpaths.js";
import { isSystemVolumePath } from "./protectedDirs.js";
import {
  classifyWindowsPathPrefix,
  findTokenSequenceMatches,
  uncToDrivePath,
  DOS_TILDE_RE,
  TRAILING_DOTS_OR_SPACES_RE,
  RESERVED_NAME_SUFFIX_RE,
} from "../windowsProfileFolders.js";
import {
  normalizeWin32Path,
  describeIgnorePatternSkip,
  warnUnusableIgnorePattern,
} from "../ignorePatterns.js";
import { readFlagWithOverride } from "../../services/analytics/flagOverrides.js";
import { truncatePathForDisplay, unresolvablePathMessage } from "../invisibleChars.js";
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
import {
  hasWin32DevicePrefixSpelling,
  isUncOrDeviceSpelling,
  realpathNativeLongSync,
} from "../fsJunctions.js";
import {
  isWslUncPath,
  isNetworkOrSpecialPath,
  isDifferentNetworkLocation,
  isNetworkMountPath,
  isNetDir,
  neverOtherHostMount,
  classifyHomeMount,
} from "../networkPaths.js";
import { containsVulnerableUncPath } from "../shell/readOnlyCommandValidation.js";
import { encodeControlChars } from "../sanitization.js";
import { workingDirectoriesAsGivenInSettings, isAutoMemPathFromRepoSettings } from "./readBlock.js";
import { getNonProjectAdditionalDirectories } from "../../components/agents/AgentsMenu.js";
import { findCanonicalGitRoot, findGitRootRecheckingNegative } from "../git.js";
import { resolveWslGitDir } from "../wslPaths.js";
import { memoryStoresEnvModule } from "../../services/orgMemory/memoryStores.js";
import { rootAliasMountPoints, pathBelowRootAlias, isWslMountInfoUnreadable } from "../wslMounts.js";
import { escapeRuleContent, unescapeRuleContent_2, parseRuleString } from "./permissionRuleParser.js";
import { getClaudeConfigDirOrNull } from "../envUtils.js";
import { EDIT } from "../../tools/FileEditTool/constants.js";
import { READ } from "../../tools/FileReadTool/constants.js";
import {
  getContentRulesForToolName,
  getDenyRuleForTool,
  deniedBashRules,
  findAskRuleForTool,
  NARROWING_RULE_SOURCES as NARROWING_RULE_SOURCES_2,
  askedBashRules,
} from "./permissions.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit } from "../../services/analytics/safeMetadata.js";
import { hasWildcards, matchWildcardPattern } from "./shellRuleMatching.js";
import { GLOB_TOOL_NAME } from "../../tools/GlobTool/prompt.js";
import { stripNonPrintable } from "../truncateGraphemes.js";
import { matchesToolName } from "../../Tool.js";
import { REPL_TOOL_NAME } from "../../tools/REPLTool/constants.js";
import { codeModeAccepted } from "../codeMode/accepted.js";
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
import { blocksReadsOutsideWorkingDirs, createReadRuleSuggestion } from "./PermissionUpdate.js";
import { isSkillDirGlob } from "../../components/permissions/hooks.js";
import { findAllowRuleForTool } from "./mcpPolicyAsks.js";
import { getPlanFilePath_2 } from "../plans.js";
import { isInsideAgentMemoryDir } from "../../tools/AgentTool/agentMemory.js";
import { toolResultsDir, TOOL_RESULTS_SUBDIR } from "../toolResultStorage.js";
import { isLoopbackHost } from "../localhost.js";
import { isOutsideAllowedRoot } from "../../services/memoryStore/memoryKeys.js";
import { MEMORY_INDEX_FILENAME } from "../../memdir/memdir.js";
import { getAliasSpellings } from "../../services/homeSeed/homeInventory.js";
import { isSensitiveWithGitConfig } from "./sensitivePaths.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-xea05003.js:593-629 callgraph-witnessed (2.1.88 match: normalizeCaseForComparison, 0)
function normalizeCaseForComparison_2(path) {
  return [...new Set(path)];
}
//@ chunk-1z3a1qn5.js:191-788 fingerprint (2.1.88 match: DANGEROUS_FILES, 0.394)
/**
 * 不允许自动编辑的危险文件名（shell 配置、git 配置、包管理器与构建工具配置等）及其小写集合。
 */
var DANGEROUS_FILES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var DANGEROUS_FILES_LOWER;
deferInit("chunk-1z3a1qn5.js:191", () => {
  DANGEROUS_FILES = [
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
  ];
  DANGEROUS_FILES_LOWER = new Set(DANGEROUS_FILES.map((fileName) => fileName.toLowerCase()));
});
//@ chunk-a2q0x549.js:224568-224720 fingerprint (2.1.88 match: allWorkingDirectories, 1)
/**
 * 向权限上下文添加额外工作目录（记录来源），返回新上下文。
 */
function addAdditionalWorkingDirectories(context, directories, source) {
  let dirs = new Map(context.additionalWorkingDirectories);
  for (let directory of directories)
    dirs.set(directory, {
      path: directory,
      source,
    });
  return {
    ...context,
    additionalWorkingDirectories: dirs,
  };
}
//@ chunk-a2q0x549.js:230508-230621 facade-majority (2.1.88 match: DANGEROUS_DIRECTORIES, 0.514)
/**
 * 自动编辑的危险目录名表：.git .vscode .idea .claude .husky .cargo .devcontainer .yarn .mvn（比 2.1.88 多后五个）；同一语句还定义多段危险子路径 DANGEROUS_SUBPATHS = ['.config/git']。checkPathSafetyForAutoEdit 用它判定是否需要人工确认。
 */
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
];
var DANGEROUS_SUBPATHS = [".config/git"];
//@ chunk-a2q0x549.js:230621-230705 facade-majority
/**
 * 路径比较前的大小写归一：toLowerCase，并把土耳其无点 ı 与长 s ſ 折成 i/s，防止 Unicode 大小写绕过。
 */
function normalizeCaseForComparison(path) {
  return path
    .toLowerCase()
    .replace(/\u0131/g, "i")
    .replace(/\u017f/g, "s");
}
//@ chunk-a2q0x549.js:230705-231467 fingerprint (2.1.88 match: getClaudeSkillScope, 1)
/**
 * 判断路径是否落在项目或用户的 .claude/skills/<名>/ 下，是则返回 {skillName, pattern:"/.claude/skills/<名>/**" 或 "~/.claude/skills/<名>/**"}，用于“仅允许编辑这个 skill”建议；名字含通配、..、反斜杠、内置/保留 skill 名或子路径再含 .claude 时返回 null。
 */
function getClaudeSkillScope(filePath) {
  if (isDiskless()) return null;
  let absolutePath = expandPath(filePath);
  let absolutePathLower = normalizeCaseForComparison(absolutePath);
  let bases = [
    {
      dir: expandPath(join(getOriginalCwd(), ".claude", "skills")),
      prefix: "/.claude/skills/",
    },
    {
      dir: expandPath(join(homedir(), ".claude", "skills")),
      prefix: "~/.claude/skills/",
    },
  ];
  for (let { dir, prefix } of bases) {
    let dirLower = normalizeCaseForComparison(dir);
    for (let separator of [sep_2, "/"])
      if (absolutePathLower.startsWith(dirLower + separator.toLowerCase())) {
        let rest = absolutePath.slice(dir.length + separator.length);
        let slash = rest.indexOf("/");
        let bslash = sep_2 === "\\" ? rest.indexOf("\\") : -1;
        let cut = slash === -1 ? bslash : bslash === -1 ? slash : Math.min(slash, bslash);
        if (cut <= 0) return null;
        let skillName = rest.slice(0, cut);
        if (!skillName || skillName === "." || skillName.includes("..")) return null;
        if (/[*?[\]]/.test(skillName) || skillName.includes("\\")) return null;
        if (
          (prefix === "~/.claude/skills/" || getUserSkillsBaseSpellings().includes(dirLower)) &&
          (isSyncedDirName(skillName) || isHiddenFoldName(skillName))
        )
          return null;
        let parts = rest.slice(cut + 1).split(/[/\\]/);
        if (foldName(skillName) === ".claude" || parts.some((part) => foldName(part) === ".claude"))
          return null;
        return {
          skillName,
          pattern: prefix + skillName + "/**",
        };
      }
  }
  return null;
}
//@ chunk-a2q0x549.js:231467-231481 callgraph-witnessed (2.1.88 match: DIR_SEP, 1)
var DIR_SEP = posix.sep;
//@ chunk-a2q0x549.js:231481-231587 facade-majority (2.1.88 match: relativePath, 1)
/**
 * posix 风格的相对路径；Windows 上先把两端转成 posix 形式再算。
 */
function relativePath(from, to) {
  if (getPlatform() === "windows") {
    let posixFrom = windowsPathToPosixPath(from);
    let posixTo = windowsPathToPosixPath(to);
    return posix.relative(posixFrom, posixTo);
  }
  return posix.relative(from, to);
}
//@ chunk-a2q0x549.js:231587-231643 facade-majority
/**
 * Windows 上把路径转成 posix 形式，其他平台原样返回。
 */
function toPosixPath(path) {
  if (getPlatform() === "windows") return windowsPathToPosixPath(path);
  return path;
}
//@ chunk-a2q0x549.js:231643-231841 layout
/**
 * 所有设置文件路径：各 SETTING_SOURCES 的文件、每个配置目录下的用户设置文件名，WSL 下再加 Windows 侧 managed-settings.json。
 */
function getAllSettingsFilePaths() {
  let filtered = SETTING_SOURCES.map((source) => getSettingsFilePathForSource(source)).filter(
    (path) => path !== undefined,
  );
  for (let configDir of getClaudeConfigDirCandidates())
    for (let fileName of Object.values(USER_SETTINGS_FILE_NAMES)) filtered.push(join(configDir, fileName));
  if (getPlatform() === "wsl" && wslInheritsSettings())
    filtered.push(join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.json"));
  return filtered;
}
//@ chunk-a2q0x549.js:231841-231853 layout
var SETTINGS_LINKS_CACHE_MS = 2000;
//@ chunk-a2q0x549.js:231853-232554 layout
/**
 * 遍历每个设置文件的路径链，若末端是符号链接，把链上每种拼写（规范化后）映射回该设置文件；结果按路径集合缓存 2 秒。出错时 2 秒内视为没有链接。
 */
function getSettingsFileLinkSpellings() {
  let empty = new Map();
  try {
    let legacyLocalSettingsFilePath = getLegacyLocalSettingsFilePath();
    let settingsPaths = normalizeCaseForComparison_2(
      legacyLocalSettingsFilePath === undefined
        ? getAllSettingsFilePaths()
        : [...getAllSettingsFilePaths(), legacyLocalSettingsFilePath],
    );
    let fsState = getSessionPathsCache();
    let joined = settingsPaths.join("\x00");
    let now = sessionClock().monotonicNow();
    let settingsFileLinks = fsState.settingsFileLinks;
    if (
      settingsFileLinks !== undefined &&
      settingsFileLinks.key === joined &&
      now - settingsFileLinks.builtAt < SETTINGS_LINKS_CACHE_MS
    )
      return settingsFileLinks.files;
    fsState.settingsFileLinks = {
      key: joined,
      builtAt: now,
      files: empty,
    };
    let linkMap = new Map();
    for (let settingsPath of settingsPaths) {
      let walk = walkPermissionCheckPaths(settingsPath);
      if (walk.unresolved)
        logForDebugging(
          `permissions: the walk of settings file ${settingsPath} did not reach its end; only the links it met are recorded`,
        );
      if (!walk.leafIsSymlink) continue;
      for (let spelling of walk.spellings)
        for (let candidateSpelling of normalizeCaseForComparison_2([spelling, identity(spelling)]))
          if (!isClaudeSettingsPath_2(candidateSpelling))
            linkMap.set(foldPathSegments(candidateSpelling), settingsPath);
    }
    fsState.settingsFileLinks = {
      key: joined,
      builtAt: now,
      files: linkMap,
    };
    return linkMap;
  } catch (error) {
    logError(
      Error("the walk of the settings links threw; for two seconds no settings file counts as a link", {
        cause: error,
      }),
    );
    return empty;
  }
}
//@ chunk-a2q0x549.js:232554-232611 layout
/**
 * 返回 [当前项目根] 或 [项目根, 另一根目录]（第二个来自 lo()，未确认含义），用于 .claude 配置路径判定。
 */
function getProjectRootDirs() {
  let projectConfigRoot = getProjectConfigRoot();
  return projectConfigRoot === null ? [getOriginalCwd()] : [getOriginalCwd(), projectConfigRoot];
}
//@ chunk-a2q0x549.js:232611-232661 facade-majority
/**
 * 路径是否是 Claude 设置文件本身，或是指向设置文件的符号链接的某种拼写。
 */
function isClaudeSettingsPath(filePath) {
  return (
    getSettingsFileLinkSpellings().has(foldPathSegments(expandPath(filePath))) ||
    isClaudeSettingsPath_2(filePath)
  );
}
//@ chunk-a2q0x549.js:232661-233135 layout (2.1.88 match: isClaudeSettingsPath, 0.91)
/**
 * 判断路径是否是 Claude Code 设置文件：任何 .claude/settings(.local).json、SETTING_SOURCES 的各文件、managed-settings drop-in 目录下文件，以及配置目录/项目 .claude 目录 realpath 后的同名文件。
 */
function isClaudeSettingsPath_2(filePath) {
  let expandedPath = expandPath(filePath);
  let normalizedPath = foldPathSegments(expandedPath);
  if (
    normalizedPath.endsWith(`${sep_2}.claude${sep_2}settings.json`) ||
    normalizedPath.endsWith(`${sep_2}.claude${sep_2}settings.local.json`)
  )
    return true;
  if (getAllSettingsFilePaths().some((settingsPath) => foldPathSegments(settingsPath) === normalizedPath))
    return true;
  if (pathInAllowedWorkingPath_2(expandedPath, normalizedPath, managedDropInDirs())) return true;
  let baseName = basename(normalizedPath);
  if (!SETTINGS_FILE_BASENAMES.map(foldName).includes(baseName)) return false;
  let mapped = Object.values(USER_SETTINGS_FILE_NAMES).map(foldName);
  return [
    ...getClaudeConfigDirCandidates().map((dir) => [dir, mapped]),
    ...getProjectRootDirs().map((projectRoot) => [
      join(projectRoot, ".claude"),
      PROJECT_SETTINGS_FILE_BASENAMES,
    ]),
  ].some(([dir, names]) => {
    if (!names.includes(baseName)) return false;
    try {
      let realDir = getFsImplementation().realpathSync(dir);
      return join(foldPathSegments(realDir), baseName) === normalizedPath;
    } catch {
      return false;
    }
  });
}
//@ chunk-a2q0x549.js:233135-233461 layout
/**
 * 路径是否为 Claude 设置/配置文件：设置路径、--agents/--mcp-config 指定的文件、配置目录候选里的主体与凭据文件；同名时再按真实路径比较。
 */
function isProtectedClaudeConfigFile(filePath) {
  if (isClaudeSettingsPath(filePath)) return true;
  let folded = foldPathSegments(expandPath(filePath));
  let settingsWatchPaths = getSettingsWatchPaths(getClaudeConfigDirCandidates());
  let mapped = [
    ...getFlagAgentsFilePaths(),
    ...getFlagMcpConfigFilePaths(),
    ...settingsWatchPaths.bodies,
    ...settingsWatchPaths.vouchers,
  ].map(foldPathSegments);
  if (mapped.includes(folded)) return true;
  let baseName = basename(folded);
  if (!mapped.some((watchPath) => basename(watchPath) === baseName)) return false;
  let settingsWatchPaths_2 = getSettingsWatchPaths(
    getClaudeConfigDirCandidates().flatMap((dir) => {
      try {
        return [getFsImplementation().realpathSync(dir)];
      } catch {
        return [];
      }
    }),
  );
  return [...settingsWatchPaths_2.bodies, ...settingsWatchPaths_2.vouchers].some(
    (watchPath) => foldPathSegments(watchPath) === folded,
  );
}
//@ chunk-a2q0x549.js:233461-233511 layout (2.1.88 match: isInGlobalClaudeFolder, 1)
function getClaudeConfigDirCandidates() {
  return normalizeCaseForComparison_2([getClaudeConfigDir(), join(homedir(), ".claude")]);
}
//@ chunk-a2q0x549.js:233511-233569 facade-majority
function isManagedSettingsDropInPath(filePath, { dirs }) {
  let path = expandPath(filePath);
  return pathInAllowedWorkingPath_2(path, foldPathSegments(path), dirs);
}
//@ chunk-a2q0x549.js:233569-233616 facade-majority
function isJsonSpelling(filePath) {
  let expanded = expandPath(filePath);
  return hasSettingsFileSpelling(expanded, foldPathSegments(expanded));
}
//@ chunk-a2q0x549.js:233616-233693 layout
function hasSettingsFileSpelling(filePath, folded) {
  let baseName = basename(filePath);
  return (
    folded.endsWith(".json") ||
    isManagedSettingsDropInName(foldProtectedDirNameLower(baseName)) ||
    isManagedSettingsDropInName(baseName)
  );
}
//@ chunk-a2q0x549.js:233693-233894 facade-majority
/**
 * 判断一组路径拼写是否指向 Claude 设置文件：命中已知设置路径或托管目录即 certain；没有 .json 拼写为 none；有 .json 但托管 drop-in 目录尚未全部解析时为 possible。写阻断（blockWritesOutsideWorkingDirectories）据此决定是否拒绝。
 */
function settingsFileCertainty(filePaths) {
  if (filePaths.some((filePath) => isProtectedClaudeConfigFile(filePath) || isClaudeSettingsDir(filePath)))
    return "certain";
  let filtered = filePaths.filter(isJsonSpelling);
  if (filtered.length === 0) return "none";
  let managedDropInDirs = resolveManagedDropInDirs();
  if (filtered.some((jsonPath) => isManagedSettingsDropInPath(jsonPath, managedDropInDirs))) return "certain";
  return managedDropInDirs.allResolved ? "none" : "possible";
}
//@ chunk-a2q0x549.js:233894-233968 file-local
function pathInAllowedWorkingPath_2(path, toolPermissionContext, precomputedPathsToCheck) {
  if (!hasSettingsFileSpelling(path, toolPermissionContext)) return false;
  return precomputedPathsToCheck.some((wp) => foldPathSegments(wp) === dirname_2(toolPermissionContext));
}
//@ chunk-a2q0x549.js:233968-234075 layout
function resolveManagedDropInDirs() {
  return summarizeDropInDirResolution(
    managedDropInDirs().map((dir) => {
      try {
        return {
          dir,
          located: normalizeFilePath_2(dir),
        };
      } catch (error) {
        return {
          dir,
          error,
        };
      }
    }),
  );
}
//@ chunk-a2q0x549.js:234075-234219 facade-majority
/**
 * 对每个托管设置 drop-in 目录异步调用定位函数（通常是 realpath），收集 {dir, located} 或 {dir, error}，用于得到 managed-settings.d 的全部真实拼写。
 */
async function managedDropInDirSpellingsAsync(realpathAllowMissing) {
  return summarizeDropInDirResolution(
    await Promise.all(
      managedDropInDirs().map(async (dir) => {
        try {
          return {
            dir,
            located: await realpathAllowMissing(dir),
          };
        } catch (error) {
          return {
            dir,
            error,
          };
        }
      }),
    ),
  );
}
//@ chunk-a2q0x549.js:234219-234446 layout
function summarizeDropInDirResolution(results) {
  let dirs = [];
  let allResolved = true;
  let allLocated = true;
  for (let result of results) {
    dirs.push(result.dir);
    if (!("located" in result)) {
      allLocated = false;
      if (!logDropInResolveFailure(result.error, "a managed drop-in directory")) allResolved = false;
      continue;
    }
    dirs.push(result.located, identity(result.located));
  }
  return {
    dirs: normalizeCaseForComparison_2(dirs),
    allResolved,
    allLocated,
  };
}
//@ chunk-a2q0x549.js:234446-234722 layout
function logDropInResolveFailure(error, label) {
  let errnoCode = getErrnoCode(error);
  if (errnoCode === "EACCES" || errnoCode === "EPERM" || errnoCode === "ENOTDIR") {
    logForDebugging(`permissions: ${label} cannot be entered (${errnoCode}); compared by name`);
    return true;
  }
  logForDebugging(
    `permissions: ${label} did not resolve (${errnoCode ?? "unknown"}); any .json write counts as a possible drop-in`,
    {
      level: "warn",
    },
  );
  return false;
}
//@ chunk-a2q0x549.js:234722-234834 layout (2.1.88 match: normalizeFilePath, 1)
function normalizeFilePath_2(filePath) {
  try {
    return getFsImplementation().realpathSync(filePath);
  } catch (error) {
    if (!isENOENT(error) || dirname_2(filePath) === filePath) throw error;
    return join(normalizeFilePath_2(dirname_2(filePath)), basename(filePath));
  }
}
//@ chunk-a2q0x549.js:234834-234918 facade-majority (2.1.88 match: getManagedSettingsDropInDir, 0.733)
/**
 * 返回托管设置 drop-in 目录列表：平台默认的 managed-settings.d；WSL 且启用 Windows 侧托管设置时再加 Windows 侧目录。
 */
function managedDropInDirs() {
  return [
    getDropInDir(),
    ...(getPlatform() === "wsl" && wslInheritsSettings()
      ? [join(WSL_MANAGED_SETTINGS_DIR, "managed-settings.d")]
      : []),
  ];
}
//@ chunk-a2q0x549.js:234918-235001 facade-majority (2.1.88 match: SETTINGS_FILES, 1)
var PROJECT_SETTINGS_FILE_BASENAMES; // deferred: uses normalizeCaseForComparison_2 of its import cycle while loading; runs once the cycle is complete
var SETTINGS_FILE_BASENAMES;
deferInit("chunk-a2q0x549.js:234918", () => {
  PROJECT_SETTINGS_FILE_BASENAMES = ["settings.json", "settings.local.json"];
  SETTINGS_FILE_BASENAMES = normalizeCaseForComparison_2([
    ...Object.values(USER_SETTINGS_FILE_NAMES),
    ...PROJECT_SETTINGS_FILE_BASENAMES,
  ]);
});
//@ chunk-a2q0x549.js:235001-235199 layout
function isClaudeSettingsDir(dirPath) {
  let replaced = foldPathSegments(expandPath(dirPath)).replace(/[\\/]+$/, "");
  if (basename(replaced) === foldName(".claude")) return true;
  return getClaudeSettingsDirs().some((settingsDir) => {
    if (foldPathSegments(settingsDir) === replaced) return true;
    try {
      let realDir = getFsImplementation().realpathSync(settingsDir);
      return foldPathSegments(realDir) === replaced;
    } catch {
      return false;
    }
  });
}
//@ chunk-a2q0x549.js:235199-235328 layout
function getClaudeSettingsDirs() {
  let settingsFilePathForSource = getSettingsFilePathForSource("policySettings");
  return normalizeCaseForComparison_2([
    ...getClaudeConfigDirCandidates(),
    ...getProjectRootDirs().map((projectRoot) => join(projectRoot, ".claude")),
    ...(settingsFilePathForSource !== undefined ? [dirname_2(settingsFilePathForSource)] : []),
    ...managedDropInDirs(),
  ]);
}
//@ chunk-a2q0x549.js:235328-235431 facade-majority
/**
 * 汇总所有设置文件路径（各层 settings、附加目录里的 settings）和设置目录（含 drop-in 目录的父目录），去重后返回 {files, dirs}，供设置路径保护使用。
 */
function settingsLocationPaths() {
  return {
    files: normalizeCaseForComparison_2([
      ...getAllSettingsFilePaths(),
      ...getFlagAgentsFilePaths(),
      ...getFlagMcpConfigFilePaths(),
    ]),
    dirs: normalizeCaseForComparison_2([
      ...getClaudeSettingsDirs(),
      ...managedDropInDirs().map((dir) => dirname_2(dir)),
    ]),
  };
}
//@ chunk-a2q0x549.js:235431-235714 facade-majority
/**
 * 生成用于在命令/路径文本里粗查“是否提到设置文件”的小写关键串：cowork 设置名、managed-settings.json、managed-settings.d/、策略设置所在目录、drop-in 目录，以及 .claude 和配置目录名下各设置文件名的 / 与 \ 两种拼写。
 */
function settingsTextNeedles() {
  let dirNames = normalizeCaseForComparison_2([".claude", basename(getClaudeConfigDir())]);
  let settingsFilePathForSource = getSettingsFilePathForSource("policySettings");
  return normalizeCaseForComparison_2([
    USER_SETTINGS_FILE_NAMES.cowork,
    "managed-settings.json",
    "managed-settings.d/",
    "managed-settings.d\\",
    ...(settingsFilePathForSource !== undefined ? [dirname_2(settingsFilePathForSource)] : []),
    ...managedDropInDirs(),
    ...dirNames.flatMap((dirName) =>
      SETTINGS_FILE_BASENAMES.flatMap((fileName) => [`${dirName}/${fileName}`, `${dirName}\\${fileName}`]),
    ),
  ]).map((needle) => needle.toLowerCase());
}
//@ chunk-a2q0x549.js:235714-235829 facade-majority (2.1.88 match: isInGlobalClaudeFolder, 1)
/**
 * 返回 .claude 与配置目录基名中以点开头、长度大于 1 的小写目录词，用于文本级判断路径是否落在 Claude 设置目录。旧版名 isInGlobalClaudeFolder 与实际行为不符。
 */
function settingsDirectoryWords() {
  return normalizeCaseForComparison_2(
    [".claude", basename(getClaudeConfigDir())].map((name) => name.toLowerCase()),
  ).filter((word) => word.length > 1 && word.startsWith("."));
}
//@ chunk-a2q0x549.js:235829-236137 facade-majority
/**
 * 拼装 safetyCheck 决策原因里的分类器字段：普通情况透传 classifierApprovable/circuitBreaker/also；restricted 模式下强制 classifierApprovable=false、circuitBreaker='restrictedMode'，原熔断标签并入 also。
 */
function safetyCheckReasonFields(reason, restricted) {
  if (!restricted)
    return {
      classifierApprovable: reason.classifierApprovable,
      ...(reason.circuitBreaker && {
        circuitBreaker: reason.circuitBreaker,
      }),
      ...(reason.also && {
        also: reason.also,
      }),
    };
  let allReasons = [...(reason.circuitBreaker ? [reason.circuitBreaker] : []), ...(reason.also ?? [])];
  return {
    classifierApprovable: false,
    circuitBreaker: "restrictedMode",
    ...(allReasons.length > 0 && {
      also: allReasons,
    }),
  };
}
//@ chunk-a2q0x549.js:236137-236291 fingerprint (2.1.88 match: isClaudeConfigFilePath, 1)
/**
 * 是否是 Claude 配置文件：设置文件（含链接）或项目根下 .claude/commands、.claude/agents、.claude/skills 里的文件。
 */
function isClaudeConfigFilePath(filePath) {
  if (isClaudeSettingsPath(filePath)) return true;
  return getProjectRootDirs().some(
    (root) =>
      pathInWorkingPath(filePath, join(root, ".claude", "commands")) ||
      pathInWorkingPath(filePath, join(root, ".claude", "agents")) ||
      pathInWorkingPath(filePath, join(root, ".claude", "skills")),
  );
}
//@ chunk-a2q0x549.js:236455-236528 sole-consumer
function isWorkflowScriptPath(filePath) {
  let normalized = normalize_2(filePath);
  return normalized.startsWith(workflowScriptsDir()) && normalized.endsWith(".js");
}
//@ chunk-a2q0x549.js:236528-236603 file-local
function isSessionMemoryPath(normalizedPath, cwd = getCwd()) {
  let normalizedPath_2 = getProjectDir(cwd);
  let normalizedInput = normalize_2(normalizedPath);
  return normalizedInput === normalizedPath_2 || normalizedInput.startsWith(normalizedPath_2 + sep_2);
}
//@ chunk-a2q0x549.js:236603-236932 facade-majority (2.1.88 match: isScratchpadGateEnabled, 0.366)
/**
 * scratchpad 是否启用：GrowthBook tengu_scratch 打开，或 Artifact 工具可用（isArtifactToolEligible）。
 */
function isScratchpadEnabled() {
  if (getFeatureValue_CACHED_MAY_BE_STALE("tengu_scratch", false)) return true;
  {
    let {
      claimScratchpadStartForCcrEntry,
      isArtifactToolEligible,
      isArtifactToolReplacedByCcrEntry,
    } = require("../../services/artifacts/artifactToolGates.js");
    if (isArtifactToolEligible()) return true;
    if (!isArtifactToolReplacedByCcrEntry()) return false;
    if (claimScratchpadStartForCcrEntry())
      ensureScratchpadDir().catch((error) =>
        logForDebugging(`isScratchpadEnabled: ensureScratchpadDir failed: ${error}`, {
          level: "error",
        }),
      );
    return true;
  }
  return false;
}
//@ chunk-a2q0x549.js:236932-237614 facade-majority (2.1.88 match: getBundledSkillsRoot, 0.33)
/**
 * 内置 skill 参考文件的解压根目录 <临时目录>/bundled-skills/<版本>/<随机 nonce>，进程内缓存；读权限对其放行。
 */
function getBundledSkillsRoot() {
  let sessionPathsCache = getSessionPathsCache();
  if (sessionPathsCache.bundledSkillsRoot !== undefined && !isDiskless())
    return sessionPathsCache.bundledSkillsRoot;
  let nonce = randomBytes(16).toString("hex");
  sessionPathsCache.bundledSkillsRoot = join(
    getClaudeTempDirRealpath(),
    "bundled-skills",
    {
      ISSUES_EXPLAINER: "report the issue at https://github.com/anthropics/claude-code/issues",
      PACKAGE_URL: "@anthropic-ai/claude-code",
      README_URL: "https://code.claude.com/docs/en/overview",
      VERSION: "2.1.318",
      FEEDBACK_CHANNEL: "https://github.com/anthropics/claude-code/issues",
      BUILD_TIME: "2026-11-03T18:52:53Z",
      GIT_SHA: "ca1fa9dea62c1027756786c841c548788644560d",
      HOOKS_WORKER_URL: import.meta.dir + "/./src/plugins/functionHooks/hooks-worker/hooks-worker.js",
      DD_SOURCEMAP_GROUP: "default",
    }.VERSION,
    nonce,
  );
  return sessionPathsCache.bundledSkillsRoot;
}
//@ chunk-a2q0x549.js:237614-237832 facade-majority (2.1.88 match: getScratchpadDir, 0.762)
/**
 * 会话 scratchpad 目录 <项目临时目录>/<sessionId>/scratchpad，按 sessionId 缓存；无项目临时目录时为 null。
 */
function getScratchpadDir(sessionId = getSessionId()) {
  let sessionPathsCache = getSessionPathsCache();
  let cached = sessionPathsCache.scratchpadDirBySessionId.get(sessionId);
  if (cached !== undefined && (cached === null || !isDiskless())) return cached;
  let scratchpadDir;
  try {
    scratchpadDir =
      getOriginalCwdOrNull() === null ? null : join(sessionTempDirRealpath(), sessionId, "scratchpad");
  } catch {
    scratchpadDir = null;
  }
  sessionPathsCache.scratchpadDirBySessionId.set(sessionId, scratchpadDir);
  return scratchpadDir;
}
//@ chunk-a2q0x549.js:237832-237953 facade-majority
/**
 * scratchpad 功能开启且非远程时创建会话 scratchpad 目录（0700）并返回路径，否则 null。
 */
async function ensureScratchpadDir() {
  if (isDiskless() || !isScratchpadEnabled()) return null;
  let scratchpadDir = getScratchpadDir();
  if (scratchpadDir === null) return null;
  await getFsImplementation().mkdir(scratchpadDir, {
    mode: 448,
  });
  return scratchpadDir;
}
//@ chunk-a2q0x549.js:237953-238095 layout
function getScratchpadComparePaths(path) {
  if (!isScratchpadEnabled()) return null;
  let scratchpadDir = getScratchpadDir();
  if (scratchpadDir === null) return null;
  let comparePath = normalizeCaseForComparison(normalize_2(path));
  let compareDir = normalizeCaseForComparison(scratchpadDir);
  return {
    comparePath,
    compareDir,
    prefix: compareDir + sep_2,
  };
}
//@ chunk-a2q0x549.js:238095-238248 facade-majority
/**
 * 路径是否是当前会话 scratchpad 目录本身或其下（大小写归一比较，并排除 s3 列出的特殊子路径）。
 */
function isScratchpadPath(path) {
  let scratchpadComparePaths = getScratchpadComparePaths(path);
  if (scratchpadComparePaths === null) return false;
  return (
    scratchpadComparePaths.comparePath === scratchpadComparePaths.compareDir ||
    (scratchpadComparePaths.comparePath.startsWith(scratchpadComparePaths.prefix) &&
      !isProtectedDirPath(
        scratchpadComparePaths.comparePath,
        scratchpadComparePaths.prefix,
        DANGEROUS_FILES_LOWER,
      ))
  );
}
//@ chunk-a2q0x549.js:238248-238361 facade-majority
/**
 * 判断路径是否在当前会话的 scratchpad 目录下（按比较前缀，并排除跨越会话边界的拼写），用于把内部路径显示为 scratchpad。
 */
function isScratchpadDisplayPath(path) {
  let scratchpadComparePaths = getScratchpadComparePaths(path);
  return (
    scratchpadComparePaths !== null &&
    scratchpadComparePaths.comparePath.startsWith(scratchpadComparePaths.prefix) &&
    !isProtectedDirPath(
      scratchpadComparePaths.comparePath,
      scratchpadComparePaths.prefix,
      DANGEROUS_FILES_LOWER,
    )
  );
}
//@ chunk-a2q0x549.js:238361-238488 layout
function getSeedAdminPaths(configDir) {
  let paths = [foldPathSegments(join(configDir, "seed-admin"))];
  try {
    let realConfigDir = getFsImplementation().realpathSync(configDir);
    paths.push(foldPathSegments(join(realConfigDir, "seed-admin")));
  } catch {}
  return normalizeCaseForComparison_2(paths);
}
//@ chunk-a2q0x549.js:238488-238568 file-local
function isSeedAdminPath(absolutePath) {
  let projectDir = foldPathSegments(absolutePath);
  return getSeedAdminPaths(getClaudeConfigDir()).some(
    (seedAdminPath) => projectDir === seedAdminPath || projectDir.startsWith(seedAdminPath + sep_2),
  );
}
//@ chunk-a2q0x549.js:238568-239048 layout
/**
 * 在每个配置目录候选路径下查找名为 entryName 的条目（jobs、daemon、shell-snapshots…），与给定路径的各拼写逐段比较（含 Windows 短名），返回每个命中的 {written, folded} 余下路径段。
 */
function findConfigDirEntryMatches(spellings, entryName, spellingMode, pathCache, shortNameRe) {
  let withSystemSpelling = (path) => normalizeCaseForComparison_2([path, isSystemVolumePath(path)]);
  let entryPaths =
    pathCache.get(entryName) ??
    getConfigDirEntryPaths(entryName).map((entryPath) => getPathsForPermissionCheck(entryPath));
  pathCache.set(entryName, entryPaths);
  let mapped = entryPaths
    .flatMap((entryPath) =>
      spellingMode === "exact" ? entryPath : expandWindowsPathSpellings(entryPath, spellingMode).spellings,
    )
    .flatMap(withSystemSpelling)
    .map((spelling) => foldPathSegments(spelling).split(sep_2));
  let flattened = spellings.flatMap((spelling) => withSystemSpelling(normalizeMsysDrivePath(spelling)));
  let isWindows = getPlatform() === "windows";
  return flattened.flatMap((spelling) => {
    let parts = normalize_2(spelling).split(sep_2);
    let pathSegments = foldPathSegments(spelling).split(sep_2);
    let endIndex = pathSegments.at(-1) === "" ? -1 : undefined;
    let prefixKind = isWindows && spellingMode === "widest" ? classifyWindowsPathPrefix(spelling) : "named";
    return mapped.flatMap((entryParts) =>
      findTokenSequenceMatches(pathSegments, entryParts, entryName, shortNameRe, prefixKind).map(
        (matchIndex) => ({
          get written() {
            return parts.slice(matchIndex, endIndex);
          },
          get folded() {
            return pathSegments.slice(matchIndex, endIndex);
          },
        }),
      ),
    );
  });
}
//@ chunk-a2q0x549.js:239048-239130 layout
function getConfigDirEntryPaths(entryName) {
  return normalizeCaseForComparison_2(
    getClaudeConfigDirCandidates().flatMap((configDir) =>
      ["", launchedCwd ?? "", homedir()].map((source) => resolve(source, configDir, entryName)),
    ),
  );
}
//@ chunk-a2q0x549.js:239130-239575 layout
/**
 * Windows 上把路径扩展成它可能打开的所有拼写（短名、尾点/空格、链接目标…，最多查 40 个）；非 Windows 原样。返回 {spellings, notFollowed}（未能解析的第一个拼写）。
 */
function expandWindowsPathSpellings(paths, spellingMode) {
  if (getPlatform() !== "windows")
    return {
      spellings: [...paths],
      notFollowed: undefined,
    };
  if (spellingMode === "exact")
    return {
      spellings: normalizeCaseForComparison_2(paths.flatMap((path) => [path, normalizeDosDevicePath(path)])),
      notFollowed: undefined,
    };
  let pending = new Set(paths);
  let visited = new Set();
  let lookupBudget = MAX_WINDOWS_SPELLING_LOOKUPS;
  let notFollowed;
  for (let spelling of pending)
    for (let candidate of normalizeCaseForComparison_2([spelling, normalizeWin32Path(spelling)])) {
      let drivePath = uncToDrivePath(candidate);
      if (pending.has(drivePath) || visited.has(drivePath)) continue;
      visited.add(drivePath);
      if (isUncOrDevicePath(drivePath)) continue;
      if (lookupBudget-- <= 0) {
        notFollowed ??= drivePath;
        continue;
      }
      let walk = walkPermissionCheckPaths(drivePath);
      if (walk.unresolved) notFollowed ??= drivePath;
      for (let extraSpelling of permissionCheckSpellings(walk)) pending.add(extraSpelling);
    }
  return {
    spellings: normalizeCaseForComparison_2([...pending, ...visited]),
    notFollowed,
  };
}
//@ chunk-a2q0x549.js:239575-239585 layout
var MAX_WINDOWS_SPELLING_LOOKUPS = 40;
//@ chunk-a2q0x549.js:239585-240230 layout
function withWindowsSpellingNote(denial, spellingMode) {
  return spellingMode === "exact"
    ? denial
    : {
        ...denial,
        message: `${denial.message.replace(/\.?$/, ".")} Claude Code may have refused this only because it reads a Windows path that does not start with a drive letter (a share such as \\\\host\\C$\\x, a device path such as \\\\?\\Volume{GUID}\\x, or \\x), or that holds a name which Windows may strip (such as ".. " or "..."), as each path on this computer that it could open, and one of those is in the config directory. This path, the config directory's path, or a link on the way to either one is written that way. If the file is really somewhere else, such as on another computer, a person can edit it there.`,
      };
}
//@ chunk-a2q0x549.js:240230-240305 layout
function isAdoptJsonMatch({ folded }) {
  return folded.length === 2 && folded[1].startsWith("adopt.json");
}
//@ chunk-a2q0x549.js:240305-240352 layout
var ADOPT_SHORT_NAME_RE = /^ad[0-9a-z]{0,4}~\d+(?:\.[^.]{0,3})?$/;
//@ chunk-a2q0x549.js:240352-242245 layout
/**
 * 写入目标若落在配置目录的 jobs/（只放行后台会话的 tmp）、daemon/、daemon.json、shell-snapshots/、session-env/ 或 adopt.json（含 Windows 短名与临时文件替身），返回对应 deny 结果；Windows 上拼写无法确定时也拒绝。tengu_merry_boot 控制新规则是否生效。
 */
function checkConfigDirInternalWrite(paths, spellingMode, pathCache) {
  if (
    spellingMode === "widest" &&
    getPlatform() !== "windows" &&
    readFlagWithOverride("tengu_merry_boot", {
      safe: true,
    })
  )
    return;
  let { spellings, notFollowed } = expandWindowsPathSpellings(paths, spellingMode);
  let configDirEntryMatches = findConfigDirEntryMatches(spellings, "jobs", spellingMode, pathCache);
  if (configDirEntryMatches.some(isAdoptJsonMatch))
    return withWindowsSpellingNote(ADOPT_JSON_WRITE_DENIAL, spellingMode);
  if (
    !readFlagWithOverride("tengu_merry_boot", {
      safe: true,
    })
  )
    return spellingMode === "widest" &&
      configDirEntryMatches.some(({ folded }) => folded.length === 2 && ADOPT_SHORT_NAME_RE.test(folded[1]))
      ? {
          ...ADOPT_JSON_WRITE_DENIAL,
          message: `This file name has the shape of a Windows short name (such as ADOPT~1.JSO), which may open adopt.json. ${ADOPT_JSON_WRITE_DENIAL.message}. A name with no "~" followed by a digit is not refused for this reason.`,
        }
      : undefined;
  if (
    configDirEntryMatches.some(
      ({ written, folded }) =>
        written[1] !== "tmp" || folded.some((part) => /^[. ]*(:|$)/.test(part.replace(regExp_3, ""))),
    )
  )
    return withRelativeConfigDirNote(withWindowsSpellingNote(JOBS_DIR_WRITE_DENIAL, spellingMode));
  for (let [entryName, shortNameRe, denial] of [
    ["daemon", undefined, DAEMON_DIR_WRITE_DENIAL],
    ["daemon.json", DAEMON_JSON_ALIAS_RE, DAEMON_JSON_WRITE_DENIAL],
    ["shell-snapshots", SHELL_SNAPSHOTS_SHORT_NAME_RE, SHELL_SNAPSHOTS_WRITE_DENIAL],
    ["session-env", SESSION_ENV_SHORT_NAME_RE, SESSION_ENV_WRITE_DENIAL],
  ])
    if (findConfigDirEntryMatches(spellings, entryName, spellingMode, pathCache, shortNameRe).length > 0)
      return withRelativeConfigDirNote(withWindowsSpellingNote(denial, spellingMode));
  return notFollowed === undefined
    ? undefined
    : {
        behavior: "deny",
        message: `Refusing to write ${truncatePathForDisplay(paths[0])}: on Windows this path, or a link on the way to it, may also open ${truncatePathForDisplay(notFollowed)}, and Claude Code could not work out where that leads on disk (a link or folder on the way could not be examined, the links do not resolve, or there were more than ${MAX_WINDOWS_SPELLING_LOOKUPS} other spellings to look up). So the write may land in the jobs, daemon, shell-snapshots or session-env folder or in daemon.json of the Claude Code config directory. The file tools do not write those. If the file is on this computer, name it by the plain drive path of the file itself, such as C:\\x, with no link, no share, and no name that ends in a dot or a space. If it is on another computer, a person can edit it there.`,
        decisionReason: {
          type: "other",
          reason: `On Windows, ${truncatePathForDisplay(paths[0])}, or a link on the way to it, may also open ${truncatePathForDisplay(notFollowed)}, and where that leads on disk could not be determined. So this may write to the jobs, daemon, shell-snapshots or session-env folder or to daemon.json of the Claude Code config directory, whose files Claude Code runs or acts on without asking anyone.`,
        },
      };
}
//@ chunk-a2q0x549.js:242245-242610 layout
function withRelativeConfigDirNote(denial) {
  return isAbsolute_2(getClaudeConfigDir())
    ? denial
    : {
        ...denial,
        message: `${denial.message} CLAUDE_CONFIG_DIR is empty or relative here, so the config directory is worked out from each of three folders: the current one, the one where Claude Code was started and the home folder. That may be the only reason this path counts. Unset CLAUDE_CONFIG_DIR or set it to an absolute path to avoid that.`,
      };
}
//@ chunk-a2q0x549.js:242610-242722 layout
var DAEMON_JSON_ALIAS_RE = /^daemon\.json\.tmp\.|^da[0-9a-z]{0,4}~\d+\.jso$/;
var SHELL_SNAPSHOTS_SHORT_NAME_RE = /^sh[0-9a-z-]{0,4}~\d+$/;
var SESSION_ENV_SHORT_NAME_RE = /^se[0-9a-z]{0,4}~\d+$/;
//@ chunk-a2q0x549.js:242722-242894 layout
/**
 * 路径是否是 CLAUDE_CODE_HOST_CREDS_FILE 指向的宿主凭证文件（任一拼写）。
 */
function isHostCredsFilePath(path) {
  let CLAUDE_CODE_HOST_CREDS_FILE = env.CLAUDE_CODE_HOST_CREDS_FILE;
  if (!CLAUDE_CODE_HOST_CREDS_FILE) return false;
  let configuredPath =
    CLAUDE_CODE_HOST_CREDS_FILE.replace(getPlatform() === "windows" ? /[\\/]+$/ : /\/+$/, "") ||
    CLAUDE_CODE_HOST_CREDS_FILE;
  let normalizedPath = normalizeCaseForComparison(normalize_2(path));
  return getPathsForPermissionCheck(configuredPath).some(
    (candidate) => normalizeCaseForComparison(normalize_2(candidate)) === normalizedPath,
  );
}
//@ chunk-a2q0x549.js:242894-243158 layout
function isProfileStorePath(path) {
  let wifProfileStoreDenyPaths = getWIFProfileStoreDenyPaths();
  if (wifProfileStoreDenyPaths === null) return false;
  let normalizedPath = normalizeCaseForComparison(normalize_2(path));
  if (
    wifProfileStoreDenyPaths.dirs.some((dir) =>
      [
        dir,
        getPhysicalTwinPath(dir, {
          liveRoutesOnly: true,
        }),
      ].some((dirSpelling) => {
        if (dirSpelling === null) return false;
        let normalizedDir = normalizeCaseForComparison(normalize_2(dirSpelling));
        return normalizedPath === normalizedDir || normalizedPath.startsWith(normalizedDir + sep_2);
      }),
    )
  )
    return true;
  return wifProfileStoreDenyPaths.files.some((file) =>
    getPathsForPermissionCheck(file).some(
      (fileSpelling) => normalizeCaseForComparison(normalize_2(fileSpelling)) === normalizedPath,
    ),
  );
}
//@ chunk-a2q0x549.js:243158-243319 layout
function getPhysicalTwinPath(path, options) {
  let resolved;
  try {
    resolved = resolveDeepestExistingAncestorSync(getFsImplementation(), path, options);
  } catch (error) {
    logForDebugging(`Could not resolve the physical twin of ${path}: ${error}`);
    return null;
  }
  return resolved === undefined || resolved === path || dirname_2(resolved) === resolved ? null : resolved;
}
//@ chunk-a2q0x549.js:243319-243635 layout
var PROFILE_STORE_WRITE_DENIAL = {
  behavior: "deny",
  message:
    "The Anthropic profile store holds the sign-in that decides which organization policy applies; it cannot be written directly",
  decisionReason: {
    type: "safetyCheck",
    reason: "profile store write substitutes the credential and organization behind managed settings",
    classifierApprovable: false,
  },
};
//@ chunk-a2q0x549.js:243635-243768 layout
function isSettingsReviewStorePath(path) {
  let foldedPath = foldPathSegments(path);
  let stateDir = join(homedir(), ".claude", "state");
  return [stateDir, join(stateDir, "settings-review.json")].some((storePath) =>
    getPathsForPermissionCheck(storePath).some((spelling) => foldPathSegments(spelling) === foldedPath),
  );
}
//@ chunk-a2q0x549.js:243768-244120 layout
var SETTINGS_REVIEW_STORE_WRITE_DENIAL = {
  behavior: "deny",
  message:
    "Staged Claude Code settings changes are the owner\u2019s to review in /settings-review; the review store cannot be written directly",
  decisionReason: {
    type: "safetyCheck",
    reason: "settings review store write substitutes a proposal the owner is about to accept",
    classifierApprovable: false,
    circuitBreaker: "claudeSettingsFile",
  },
};
//@ chunk-a2q0x549.js:244120-244142 layout
function noConfigDirWriteDenialForPlan(inputPath) {
  return;
}
//@ chunk-a2q0x549.js:244142-244164 layout
function noConfigDirWriteDenialForRead(inputPath) {
  return;
}
//@ chunk-a2q0x549.js:244164-244407 layout
var HOST_CREDS_WRITE_DENIAL = {
  behavior: "deny",
  message: "The host credentials file is managed by the host process; it cannot be written directly",
  decisionReason: {
    type: "safetyCheck",
    reason: "host-creds file rewrite redirects the bearer token",
    classifierApprovable: false,
  },
};
//@ chunk-a2q0x549.js:244407-244493 layout
function normalizeMsysDrivePath(path) {
  return getPlatform() === "windows" && /^\/(?:cygdrive\/)?[A-Za-z]\//.test(path)
    ? posixPathToWindowsPath(path)
    : path;
}
//@ chunk-a2q0x549.js:244493-249086 layout
var MEMORY_PAUSED_WRITE_DENIAL; // deferred: uses PERMISSION_REQUEST_TOOL_KINDS (../../types/permissions.js) of its import cycle while loading; runs once the cycle is complete
var MEMORY_PAUSED_READ_DENIAL;
var SEED_ADMIN_WRITE_DENIAL;
var ADOPT_JSON_WRITE_DENIAL;
var JOBS_DIR_WRITE_DENIAL;
var DAEMON_DIR_WRITE_DENIAL;
var DAEMON_JSON_WRITE_DENIAL;
var SHELL_SNAPSHOTS_WRITE_DENIAL;
var SESSION_ENV_WRITE_DENIAL;
var NO_CONFIG_DIR_WRITE_DENIAL;
deferInit("chunk-a2q0x549.js:244493", () => {
  MEMORY_PAUSED_WRITE_DENIAL = {
    behavior: "deny",
    message: "Cannot write to memory while it is paused for this session; only the user can turn it back on.",
    decisionReason: {
      type: "safetyCheck",
      reason: MEMORY_TOGGLED_OFF_REASON,
      classifierApprovable: false,
    },
  };
  MEMORY_PAUSED_READ_DENIAL = {
    behavior: "deny",
    message: "Cannot read memory while it is paused for this session; only the user can turn it back on.",
    decisionReason: {
      type: "safetyCheck",
      reason: MEMORY_TOGGLED_OFF_REASON,
      classifierApprovable: false,
    },
  };
  SEED_ADMIN_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "~/.claude/seed-admin holds the private git directories of cloud-session uploads and is managed by Claude Code; it cannot be written directly",
    decisionReason: {
      type: "safetyCheck",
      reason: "seed-admin git configuration is a code-execution surface for the upload",
      classifierApprovable: false,
    },
  };
  ADOPT_JSON_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "adopt.json is the bg-fork handoff carrier and is managed by the harness; it cannot be written directly",
    decisionReason: {
      type: "safetyCheck",
      reason: "adopt.json is a code-execution surface for the fork",
      classifierApprovable: false,
    },
  };
  JOBS_DIR_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the jobs folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as CLAUDE~1 counts as the folder in its place. Claude Code restarts background sessions from the files there, so they cannot be written directly. Scratch files of a background session go in $CLAUDE_JOB_DIR/tmp. A person can stop, restart or remove a session in `claude agents`, or with `claude stop <id>`, `claude respawn <id>` or `claude rm <id>`.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code jobs folder. A file there can give a background session more permissions or run a command without asking anyone.",
      classifierApprovable: false,
    },
  };
  DAEMON_DIR_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the daemon folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as CLAUDE~1 counts as the folder in its place. The service that runs background sessions acts on the files there, so they cannot be written directly. A person can check the service with `claude daemon status`.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code daemon folder. A file there can start a background session without asking anyone.",
      classifierApprovable: false,
    },
  };
  DAEMON_JSON_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is daemon.json in the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude), or a link, temp file or short name that stands in for it; above it, a Windows short name such as CLAUDE~1 counts as the folder in its place. The service that runs background sessions starts the workers listed there, so it cannot be written directly. A person can change it in an editor.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code daemon.json, or to a file that stands in for it. The service that runs background sessions starts the workers listed there without asking anyone.",
      classifierApprovable: false,
    },
  };
  SHELL_SNAPSHOTS_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the shell-snapshots folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as SHELL-~1 or CLAUDE~1 counts as the folder in its place. Each Bash command first runs a snapshot, kept there, of the shell setup (aliases, functions, options), so the files cannot be written directly. Claude Code takes a new snapshot each time it starts, so a person can change their shell startup file, such as ~/.bashrc or ~/.zshrc, and restart Claude Code.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code shell-snapshots folder. Each Bash command first runs a file from there, without asking anyone.",
      classifierApprovable: false,
    },
  };
  SESSION_ENV_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This path is in, or leads into, the session-env folder of the Claude Code config directory ($CLAUDE_CONFIG_DIR or ~/.claude); a Windows short name such as SESSIO~1 or CLAUDE~1 counts as the folder in its place. Claude Code runs the scripts that hooks leave there ahead of Bash commands, so they cannot be written directly. To set variables for later Bash commands, a person can add a SessionStart hook that appends export lines to the file named in $CLAUDE_ENV_FILE.",
    decisionReason: {
      type: "safetyCheck",
      reason:
        "This writes to the Claude Code session-env folder. Claude Code runs the scripts there ahead of Bash commands, without asking anyone.",
      classifierApprovable: false,
    },
  };
  NO_CONFIG_DIR_WRITE_DENIAL = {
    behavior: "deny",
    message:
      "This session has no config folder to check the path against, so the write is denied. A retry is denied the same way.",
    decisionReason: {
      type: "safetyCheck",
      reason: NO_CONFIG_HOME_DENY_REASON,
      classifierApprovable: false,
    },
  };
});
//@ chunk-a2q0x549.js:249086-249333 layout
/**
 * 后台会话（CLAUDE_CODE_SESSION_KIND=bg）中，路径是否落在 $CLAUDE_JOB_DIR/tmp/ 下（且 CLAUDE_JOB_DIR 在配置目录 jobs/ 内）。
 */
function isBgJobTmpPath(path) {
  if (env.CLAUDE_CODE_SESSION_KIND !== "bg") return false;
  let envClaudeJobDir = process.env.CLAUDE_JOB_DIR;
  if (!envClaudeJobDir) return false;
  let jobsPrefix = join(getClaudeConfigDir(), "jobs") + sep_2;
  let jobDir = normalize_2(envClaudeJobDir);
  if (!jobDir.startsWith(jobsPrefix)) return false;
  let tmpPrefix = jobDir + sep_2 + "tmp" + sep_2;
  if (!normalizeCaseForComparison(path).startsWith(normalizeCaseForComparison(tmpPrefix))) return false;
  return !isProtectedDirPath(path, tmpPrefix, DANGEROUS_FILES_LOWER);
}
//@ chunk-a2q0x549.js:249333-249490 facade-majority
/**
 * 判断 UNC/网络路径是否位于 trustedNetworkDirectories 列出的可信网络根之下（要求同为网络路径形状，且 pathInWorkingPath 成立）；设备命名空间路径一律不可信。
 */
function isPathInTrustedNetworkRoot(path, trustedNetworkDirectories) {
  if (!trustedNetworkDirectories || trustedNetworkDirectories.size === 0) return false;
  if (hasDotSegment(path)) return false;
  for (let roots of trustedNetworkDirectories.values())
    for (let root of roots) {
      if (isUncOrDevicePath(path) !== isUncOrDevicePath(root)) continue;
      if (pathInWorkingPath(path, root)) return true;
    }
  return false;
}
//@ chunk-a2q0x549.js:249490-249557 facade-majority
/**
 * 是否为不可信的 UNC 路径：NT 设备命名空间直接视为不可信；否则是 UNC 形状、不是本地映射且不在可信网络根下。
 */
function isUntrustedUncPath(path, trustedNetworkDirectories) {
  if (hasWin32DevicePrefixSpelling(path)) return true;
  return (
    isUncOrDevicePath(path) &&
    !isWslUncPath(path) &&
    !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories)
  );
}
//@ chunk-a2q0x549.js:249557-249598 facade-majority
function isUntrustedAutomountPath(path, trustedNetworkDirectories) {
  return isNetworkOrSpecialPath(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories);
}
//@ chunk-a2q0x549.js:249598-249962 layout (2.1.88 match: isDangerousFilePathToAutoEdit, 0.9)
function getProjectRootSegmentDepth(pathSegments) {
  let depth = 0;
  for (let workingDirPath of spellingsForWorkingDir(getOriginalCwd())) {
    let pathSegments_2 = expandPath(workingDirPath).split(sep_2);
    if (pathSegments_2.length > 1 && pathSegments_2.at(-1) === "") pathSegments_2.pop();
    let commonLength = 0;
    while (
      commonLength < pathSegments_2.length &&
      commonLength < pathSegments.length &&
      (pathSegments[commonLength] === pathSegments_2[commonLength] ||
        (commonLength === 0 &&
          /^[a-z]:$/i.test(pathSegments[commonLength]) &&
          pathSegments[commonLength].toLowerCase() === pathSegments_2[commonLength].toLowerCase()))
    )
      commonLength++;
    if (commonLength === pathSegments_2.length) {
      let claudeDirIndex = commonLength;
      for (let j = 0; j < commonLength; j++)
        if (
          foldName(pathSegments_2[j]) === ".claude" &&
          foldName(pathSegments_2[j + 1] ?? "") !== "worktrees"
        ) {
          claudeDirIndex = j;
          break;
        }
      if (claudeDirIndex > depth) depth = claudeDirIndex;
    }
  }
  return depth;
}
//@ chunk-a2q0x549.js:249962-250075 layout (2.1.88 match: isInGlobalClaudeFolder, 1)
function isInGlobalClaudeFolder(filePath) {
  let pathSegments = expandPath(filePath).split(sep_2);
  let absolutePath = getProjectRootSegmentDepth(pathSegments);
  let count = 0;
  for (let index = absolutePath; index < pathSegments.length; index++)
    if (foldName(pathSegments[index]) === ".claude") count++;
  return count;
}
//@ chunk-a2q0x549.js:250075-250488 layout
/**
 * 规则以 ~/.claude/ 或 /.claude/ 开头时，判断路径是否在对应根的 .claude 之下、且其后还有名为 .claude 的段。
 */
function hasNestedClaudeDirBelowRuleRoot(spelling, ruleSpelling) {
  let base = ruleSpelling.startsWith("~/.claude/")
    ? homedir()
    : ruleSpelling.startsWith("/.claude/")
      ? getOriginalCwd()
      : null;
  if (base === null) return false;
  let parts = expandPath(join(base, ".claude")).split(sep_2);
  if (parts.length > 1 && parts.at(-1) === "") parts.pop();
  let parts_2 = expandPath(spelling).split(sep_2);
  for (let j = 0; j < parts.length; j++)
    if (
      parts_2[j] !== parts[j] &&
      !(j === 0 && /^[a-z]:$/i.test(parts_2[j] ?? "") && parts_2[j].toLowerCase() === parts[j].toLowerCase())
    )
      return false;
  for (let index = parts.length; index < parts_2.length; index++)
    if (foldName(parts_2[index]) === ".claude") return true;
  return false;
}
//@ chunk-a2q0x549.js:250488-251246 layout
/**
 * 路径是否属于危险位置、不能自动编辑：插件目录、命令产出目录、不可信 UNC/自动挂载路径、危险目录（.claude 下 skills/agents/commands/worktrees 例外处理）、危险子路径、危险文件名。
 */
function isDangerousFilePathToAutoEdit(filePath, allowClaudeSubdirs, options) {
  let absolutePath = expandPath(filePath);
  let pathSegments = absolutePath.split(sep_2);
  let last = pathSegments.at(-1);
  if (isPluginDirReadable(absolutePath)) return true;
  if (
    !isNetworkOrSpecialPath(absolutePath) &&
    (!isUncOrDeviceSpelling(absolutePath) || isWslUncPath(absolutePath)) &&
    (scanCommandProducerDirs(absolutePath, pluginRootDirs(), getClaudeConfigDir(), {
      maxAgeMs: 5000,
    }) ||
      isInCommandProducerDir(absolutePath))
  )
    return true;
  if (isUntrustedUncPath(filePath, options)) return true;
  if (isUntrustedAutomountPath(filePath, options)) return true;
  let sawProjectClaudeDir = false;
  let projectRootDepth = getProjectRootSegmentDepth(pathSegments);
  for (let idx = 0; idx < pathSegments.length; idx++) {
    let segment = pathSegments[idx];
    let foldedSegment = foldName(segment);
    if (isProtectedDirAlwaysFalse(foldedSegment)) return true;
    for (let dangerousDir of DANGEROUS_DIRECTORIES) {
      if (foldedSegment !== normalizeCaseForComparison(dangerousDir)) continue;
      if (dangerousDir === ".claude") {
        let isProjectLevel = idx >= projectRootDepth;
        if (sawProjectClaudeDir) return true;
        let nextSegment = pathSegments[idx + 1];
        let foldedNext = nextSegment ? foldName(nextSegment) : undefined;
        if (allowClaudeSubdirs && foldedNext) {
          if (foldedNext === "skills" || foldedNext === "agents" || foldedNext === "commands") {
            if (isProjectLevel) sawProjectClaudeDir = true;
            break;
          }
          if (foldedNext === "scheduled_tasks.json" && idx + 1 === pathSegments.length - 1) break;
        }
        if (foldedNext === "worktrees") {
          if (isProjectLevel) sawProjectClaudeDir = true;
          break;
        }
      }
      return true;
    }
  }
  for (let subPath of DANGEROUS_SUBPATHS) {
    let parts = subPath.split("/");
    for (let idx = 0; idx + parts.length <= pathSegments.length; idx++)
      if (
        parts.every(
          (part, offset) => foldName(pathSegments[idx + offset]) === normalizeCaseForComparison(part),
        )
      )
        return true;
  }
  if (last) {
    let foldedLast = foldName(last);
    if (DANGEROUS_FILES.some((dangerousFile) => normalizeCaseForComparison(dangerousFile) === foldedLast))
      return true;
  }
  return false;
}
//@ chunk-a2q0x549.js:251246-251288 facade-majority
function hasSuspiciousWindowsPathPattern(inputPath, trustedNetworkDirectories) {
  return classifySuspiciousWindowsPathPattern(inputPath, trustedNetworkDirectories) !== undefined;
}
//@ chunk-a2q0x549.js:251288-251887 facade-majority
/**
 * 给可疑 Windows 路径形状分类并返回原因码：nt_device_namespace、colon_past_drive_position（Windows/WSL 上盘符后再出现冒号，即 ADS）、tilde_digit（8.3 短名）、device_path_prefix（\\?\ 等）、trailing_dot_or_whitespace、dos_device_suffix、dot_run_segment（...）、unc_or_webdav_form（不可信网络根）。无可疑返回 undefined。
 */
function classifySuspiciousWindowsPathPattern(inputPath, trustedNetworkDirectories) {
  if (hasWin32DevicePrefixSpelling(inputPath)) return "nt_device_namespace";
  if (getPlatform() === "windows" || getPlatform() === "wsl") {
    if (inputPath.indexOf(":", 2) !== -1) return "colon_past_drive_position";
  }
  if (DOS_TILDE_RE.test(inputPath)) return "tilde_digit";
  if (
    inputPath.startsWith("\\\\?\\") ||
    inputPath.startsWith("\\\\.\\") ||
    inputPath.startsWith("//?/") ||
    inputPath.startsWith("//./")
  )
    return "device_path_prefix";
  let parts = inputPath.split(/[/\\]/);
  for (let part of parts) {
    if (part === "" || part === "." || part === "..") continue;
    if (TRAILING_DOTS_OR_SPACES_RE.test(part)) return "trailing_dot_or_whitespace";
  }
  if (RESERVED_NAME_SUFFIX_RE.test(inputPath)) return "dos_device_suffix";
  if (/(^|\/|\\)\.{3,}(\/|\\|$)/.test(inputPath)) return "dot_run_segment";
  if (
    containsVulnerableUncPath(inputPath, true) &&
    !isWslUncPath(inputPath) &&
    !isPathInTrustedNetworkRoot(inputPath, trustedNetworkDirectories)
  )
    return "unc_or_webdav_form";
  return;
}
//@ chunk-a2q0x549.js:251887-252072 facade-majority
/**
 * 远程模式下编辑 Claude 配置的豁免是否适用：要求 isRemoteMode、非 restricted、当前与改写前都不是 auto、且不是沿用 auto 分类器的 plan。
 */
function remoteConfigEditExemptionApplies(toolPermissionContext) {
  let inPlanModeFromAuto =
    toolPermissionContext.mode === "plan" &&
    (toolPermissionContext.prePlanMode === "auto" || !!toolPermissionContext.strippedDangerousRules);
  return (
    toolPermissionContext.isRemoteMode === true &&
    !toolPermissionContext.restricted &&
    toolPermissionContext.mode !== "auto" &&
    !inPlanModeFromAuto &&
    toolPermissionContext.modeBeforeRewrite !== "auto"
  );
}
//@ chunk-a2q0x549.js:252072-252198 facade-majority
/**
 * 写权限询问时是否附带“切到 acceptEdits”建议：改写前模式不是 auto 类；default 模式总是附带；plan 模式仅当进入 plan 前的模式不是 auto 类时附带。
 */
function acceptEditsSuggestionApplies(toolPermissionContext) {
  if (isAutoEditingMode(toolPermissionContext.modeBeforeRewrite)) return false;
  if (toolPermissionContext.mode === "default") return true;
  return toolPermissionContext.mode === "plan" && !isAutoEditingMode(toolPermissionContext.prePlanMode);
}
//@ chunk-a2q0x549.js:252198-252290 layout
function isAutoEditingMode(mode) {
  return mode === "auto" || mode === "bypassPermissions" || mode === "acceptEdits" || mode === "dontAsk";
}
//@ chunk-a2q0x549.js:252290-253474 facade-majority (2.1.88 match: checkPathSafetyForAutoEdit, 0.702)
/**
 * 自动编辑（acceptEdits/自动放行）前的路径安全检查：远程模式一律不安全；可疑 Windows 路径（设备命名空间、短名、尾点、UNC…）；Claude 设置文件（含经链接，classifierApprovable 取决于是否经链接）；Claude 配置文件（commands/agents/skills）；危险文件/目录（Xp）。返回 {safe:true} 或 {safe:false, message, classifierApprovable, circuitBreaker?}。
 */
function checkPathSafetyForAutoEdit(
  path,
  pathsToCheck,
  allowClaudeSubdirs,
  allowProtected,
  trustedNetworkDirectories,
) {
  if (isDiskless())
    return {
      safe: false,
      message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
      classifierApprovable: false,
    };
  let allowClaudeSubdirs_2 = allowClaudeSubdirs || allowProtected;
  let spellings = pathsToCheck ?? getPathsForPermissionCheck(path);
  let touchesSettingsFile = settingsFileCertainty(spellings) !== "none";
  for (let pathToCheck of spellings)
    if (hasSuspiciousWindowsPathPattern(pathToCheck, trustedNetworkDirectories))
      return {
        safe: false,
        message: `Claude requested permissions to write to ${encodeControlChars(path)}, which contains a suspicious Windows path pattern that requires manual approval.`,
        classifierApprovable: false,
        circuitBreaker: "suspiciousWindowsPath",
        ...(touchesSettingsFile && {
          also: ["claudeSettingsFile"],
        }),
      };
  if (touchesSettingsFile) {
    let settingsFileLinkSpellings = getSettingsFileLinkSpellings();
    let mapped = spellings.map((pathToCheck) => foldPathSegments(expandPath(pathToCheck)));
    let found = mapped
      .map((folded) => settingsFileLinkSpellings.get(folded))
      .find((linkSource) => linkSource !== undefined);
    let linkNote =
      found === undefined || mapped.includes(foldPathSegments(found))
        ? ""
        : ` The Claude Code settings file ${truncatePathForDisplay(found)} leads here through a link.`;
    return {
      safe: false,
      message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.${linkNote}`,
      classifierApprovable: found === undefined,
      circuitBreaker: "claudeSettingsFile",
    };
  }
  for (let pathToCheck of spellings)
    if (!allowClaudeSubdirs_2 && isClaudeConfigFilePath(pathToCheck))
      return {
        safe: false,
        message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
        classifierApprovable: true,
      };
  for (let pathToCheck of spellings)
    if (isDangerousFilePathToAutoEdit(pathToCheck, allowClaudeSubdirs_2, trustedNetworkDirectories))
      return {
        safe: false,
        message: `Claude requested permissions to edit ${encodeControlChars(path)} which is a sensitive file.`,
        classifierApprovable: true,
      };
  return {
    safe: true,
  };
}
//@ chunk-a2q0x549.js:253474-253553 facade-majority (2.1.88 match: allWorkingDirectories, 1)
/**
 * 工作目录集合 = 当前原始 cwd + toolPermissionContext.additionalWorkingDirectories 的键（--add-dir、settings additionalDirectories、会话内添加）。
 */
function allWorkingDirectories(toolPermissionContext) {
  return new Set([getOriginalCwd(), ...toolPermissionContext.additionalWorkingDirectories.keys()]);
}
//@ chunk-a2q0x549.js:253553-253590 facade-majority
function spellingsToJudge(filePath) {
  return isDiskless() ? [filePath] : getPathsForPermissionCheck(filePath);
}
//@ chunk-a2q0x549.js:253590-253773 layout
/**
 * 取某工作目录的全部真实拼写（符号链接解析等），结果缓存在权限状态里；CLAUDE_CODE_EVAL_CONFINED 下对 cwd 只用原拼写。
 */
function spellingsForWorkingDir(workingDir) {
  let sessionPathsCache = getSessionPathsCache();
  let cached = sessionPathsCache.resolvedWorkingDirPaths.get(workingDir);
  if (cached !== undefined) return cached;
  let paths =
    env.CLAUDE_CODE_EVAL_CONFINED && workingDir === getOriginalCwd()
      ? [workingDir]
      : spellingsToJudge(workingDir);
  sessionPathsCache.resolvedWorkingDirPaths.set(workingDir, paths);
  return paths;
}
//@ chunk-a2q0x549.js:253773-253873 facade-majority
/**
 * 把某工作目录钉为只按原名比较（解析结果设为自身，并加入“按名持有”集合），用于不允许跟随符号链接的目录。
 */
function pinResolvedWorkingDirPath(workingDir) {
  let sessionPathsCache = getSessionPathsCache();
  sessionPathsCache.resolvedWorkingDirPaths.set(workingDir, [workingDir]);
  sessionPathsCache.workingDirPathsHeldAsNamed.add(workingDir);
}
//@ chunk-a2q0x549.js:253873-253973 facade-majority
/**
 * 若该工作目录尚未解析过，则把它登记为“按名持有”，后续只按字面路径比较。
 */
function holdUnresolvedWorkingDirPathAsNamed(workingDir) {
  let sessionPathsCache = getSessionPathsCache();
  if (!sessionPathsCache.resolvedWorkingDirPaths.has(workingDir))
    sessionPathsCache.workingDirPathsHeldAsNamed.add(workingDir);
}
//@ chunk-a2q0x549.js:253973-254055 facade-majority
function holdWorkingDirectoriesAsGiven() {
  let { workingDirPathsHeldAsNamed } = getSessionPathsCache();
  for (let workingDir of workingDirectoriesAsGivenInSettings()) workingDirPathsHeldAsNamed.add(workingDir);
}
//@ chunk-a2q0x549.js:254055-254117 facade-majority
/**
 * 查询工作目录是否被登记为“按名持有”（只按字面路径比较，不展开真实拼写）。
 */
function isWorkingDirPathHeldAsNamed(namedPath) {
  return getSessionPathsCache().workingDirPathsHeldAsNamed.has(namedPath);
}
//@ chunk-a2q0x549.js:254117-254157 facade-majority
function getCountedWorkingDirPaths(namedPath) {
  return isWorkingDirPathHeldAsNamed(namedPath) ? [namedPath] : spellingsForWorkingDir(namedPath);
}
//@ chunk-a2q0x549.js:254290-254338 facade-majority
function declaredAbsoluteAdditionalDirectories(source) {
  return getNonProjectAdditionalDirectories(source).filter((path) => isAbsolute_2(path));
}
//@ chunk-a2q0x549.js:254338-254386 facade-majority
function blockReadsWorkingDirectories(toolPermissionContext) {
  return new Set([getOriginalCwd(), ...getNonProjectAdditionalDirectories(toolPermissionContext)]);
}
//@ chunk-a2q0x549.js:254386-254451 layout
function readBlockExemptPaths(toolPermissionContext) {
  return toolPermissionContext.restricted ? [] : (toolPermissionContext.readBlockExemptPaths ?? []);
}
//@ chunk-a2q0x549.js:254451-254538 layout
function isReadInsideWorkingPath(
  filePath,
  spellings,
  toolPermissionContext,
  workingDirectories,
  checkInternal,
  exemptPaths = [],
) {
  return (
    spellings.length > 0 &&
    (pathInAllowedWorkingPath(filePath, toolPermissionContext, spellings, workingDirectories, exemptPaths) ||
      checkInternal().behavior === "allow")
  );
}
//@ chunk-a2q0x549.js:254538-254740 facade-majority
/**
 * blockReadsOutsideWorkingDirectories 打开时判断这次读是否被拦：路径不在读允许的工作目录内、且不是内部可读路径（readBlockFence 模式下的 checkReadableInternalPath）即返回 true。
 */
function outsideReadBlocked(filePath, toolPermissionContext, spellings) {
  if (toolPermissionContext.blockReadsOutsideWorkingDirectories !== true) return false;
  let judgedSpellings = spellings ?? spellingsToJudge(filePath);
  return !isReadInsideWorkingPath(
    filePath,
    judgedSpellings,
    toolPermissionContext,
    blockReadsWorkingDirectories(toolPermissionContext),
    () =>
      checkReadableInternalPath(filePath, {}, judgedSpellings, {
        restricted: toolPermissionContext.restricted,
        blockOutsideReads: true,
        readBlockFence: true,
      }),
    readBlockExemptPaths(toolPermissionContext),
  );
}
//@ chunk-a2q0x549.js:254740-254979 facade-majority
/**
 * 判断路径的全部拼写是否都落在某个工作目录（含其真实拼写，按名持有的目录只用原名）或额外根之内；比较时不折叠大小写、要求 UNC 形状一致，非 macOS 的额外根跳过 /private 别名。
 */
function pathInAllowedWorkingPath(
  filePath,
  toolPermissionContext,
  spellings,
  workingDirectories = allWorkingDirectories(toolPermissionContext),
  exemptPaths = [],
) {
  let judgedSpellings = spellings ?? getPathsForPermissionCheck(filePath);
  let flattened = Array.from(workingDirectories).flatMap(getCountedWorkingDirPaths);
  let skipPrivateAlias = getPlatform() !== "macos";
  return judgedSpellings.every(
    (spelling) =>
      flattened.some((workingPath) =>
        pathInWorkingPath(spelling, workingPath, {
          caseFold: false,
          uncShapeParity: true,
        }),
      ) ||
      exemptPaths.some((exemptPath) =>
        pathInWorkingPath(spelling, exemptPath, {
          caseFold: false,
          uncShapeParity: true,
          skipPrivateAlias,
        }),
      ),
  );
}
//@ chunk-a2q0x549.js:254979-255065 layout
function editableInternalPathDecision(filePath, spellings, toolPermissionContext) {
  return checkEditableInternalPath(filePath, {}, spellings, {
    restricted: toolPermissionContext.restricted,
    blockOutsideWrites: true,
  });
}
//@ chunk-a2q0x549.js:255065-255296 facade-majority
/**
 * Shell 写目标的阻断说明：先查内部硬拒绝；blockWritesOutsideWorkingDirectories 打开时，目录外写返回“工作目录外”消息，写到可能是设置文件的路径返回设置文件消息；否则返回 undefined。
 */
function writeBlockRefusal(absolutePath, toolPermissionContext, spellings) {
  let editDenyForSpellings = findEditDenyForSpellings(absolutePath, spellings, toolPermissionContext);
  if (editDenyForSpellings !== undefined) return editDenyForSpellings.message;
  if (toolPermissionContext.blockWritesOutsideWorkingDirectories !== true) return;
  if (
    !isReadInsideWorkingPath(
      absolutePath,
      spellings,
      toolPermissionContext,
      blockReadsWorkingDirectories(toolPermissionContext),
      () => editableInternalPathDecision(absolutePath, spellings, toolPermissionContext),
    )
  )
    return encodeControlChars(`${absolutePath}: ${OUTSIDE_WRITES_BLOCKED_DENY_REASON}`);
  return settingsFileCertainty(spellings) === "none"
    ? undefined
    : encodeControlChars(`${absolutePath}: ${SETTINGS_WRITES_BLOCKED_DENY_REASON}`);
}
//@ chunk-a2q0x549.js:255296-255794 layout
/**
 * --restricted 与 blockReads/WritesOutsideWorkingDirectories 三种工作目录约束的说明文字与拒绝原因。
 */
var RESTRICTED_MODE_CONSTRAINT; // deferred: uses PERMISSION_REQUEST_TOOL_KINDS (../../types/permissions.js) of its import cycle while loading; runs once the cycle is complete
var OUTSIDE_READS_CONSTRAINT;
var OUTSIDE_WRITES_CONSTRAINT;
deferInit("chunk-a2q0x549.js:255296", () => {
  RESTRICTED_MODE_CONSTRAINT = {
    why: "--restricted confines the file tools to the working directory.",
    reason: RESTRICTED_MODE_DENY_REASON,
  };
  OUTSIDE_READS_CONSTRAINT = {
    why: "the permissions.blockReadsOutsideWorkingDirectories setting blocks reads outside the working directories. Ask the user to add the directory with /add-dir, or to remove that setting.",
    reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
  };
  OUTSIDE_WRITES_CONSTRAINT = {
    why: "the permissions.blockWritesOutsideWorkingDirectories setting blocks writes outside the working directories. Ask the user to add the directory with /add-dir, or to remove that setting.",
    reason: OUTSIDE_WRITES_BLOCKED_DENY_REASON,
  };
});
//@ chunk-a2q0x549.js:255794-256246 layout
/**
 * 按工作目录约束检查路径：无法解析直接拒绝；在允许目录内返回 null；否则给出拒绝（含符号链接落点说明与 blockedPath）。
 */
function denyIfOutsideWorkingDirs(
  filePath,
  walk,
  toolPermissionContext,
  checkInternal,
  denyText,
  workingDirectories,
  exemptPaths = [],
) {
  if (walk.unresolved)
    return {
      behavior: "deny",
      message: `${unresolvablePathMessage(filePath)}; ${denyText.why}`,
      decisionReason: {
        type: "other",
        reason: denyText.reason,
      },
    };
  if (
    isReadInsideWorkingPath(
      filePath,
      walk.spellings,
      toolPermissionContext,
      workingDirectories,
      checkInternal,
      exemptPaths,
    )
  )
    return null;
  let joined = Array.from(workingDirectories).join(", ");
  let redirect = symlinkRedirect(walk, toolPermissionContext, workingDirectories);
  return {
    behavior: "deny",
    message: encodeControlChars(
      redirect?.carriedOut
        ? `${formatSymlinkResolution(filePath, redirect.landing)}, which is outside ${joined}; ${denyText.why}`
        : `${filePath} is outside ${joined}; ${denyText.why}`,
    ),
    decisionReason: {
      type: "other",
      reason: denyText.reason,
    },
    blockedPath: redirect?.carriedOut ? redirect.landing : filePath,
  };
}
//@ chunk-a2q0x549.js:256246-256311 facade-majority
/**
 * GrowthBook tengu_auto_mode_worktree_fast_path：auto 模式下是否对已核实的 linked worktree 目录走快路径。
 */
function isLinkedWorktreeFastPathEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_auto_mode_worktree_fast_path", false);
}
//@ chunk-a2q0x549.js:256311-256734 facade-majority
/**
 * 在 worktree 快路径开启时，从每个工作目录找到 git 仓库根，核实其在工作目录内且 realpath 未被重定向后，列出该仓库的 linked worktree 目录（跳过不安全目录），供 auto 模式视作可写工作区。
 */
async function verifiedLinkedWorktreeDirectories(toolPermissionContext) {
  if (!isLinkedWorktreeFastPathEnabled() || isDiskless()) return [];
  let directories = new Set();
  let seenGitRoots = new Set();
  for (let workingDir of allWorkingDirectories(toolPermissionContext)) {
    if (await hasUntouchableRecordSpellingStrictAsync(workingDir)) continue;
    let canonicalGitRoot = findCanonicalGitRoot(workingDir);
    if (canonicalGitRoot === null && findGitRootRecheckingNegative(workingDir))
      canonicalGitRoot = findCanonicalGitRoot(workingDir);
    if (canonicalGitRoot === null || seenGitRoots.has(canonicalGitRoot)) continue;
    seenGitRoots.add(canonicalGitRoot);
    if (
      !pathInAllowedWorkingPath(
        canonicalGitRoot,
        toolPermissionContext,
        spellingsForWorkingDir(canonicalGitRoot),
      )
    )
      continue;
    let realGitRoot;
    try {
      realGitRoot = identity(await getFsImplementation().realpath(canonicalGitRoot));
    } catch {
      continue;
    }
    if (isDifferentNetworkLocation(canonicalGitRoot, realGitRoot, null)) continue;
    if (realGitRoot !== canonicalGitRoot) {
      if (seenGitRoots.has(realGitRoot)) continue;
      seenGitRoots.add(realGitRoot);
    }
    for (let gitDir of await resolveWslGitDir(canonicalGitRoot)) {
      if (await hasUntouchableRecordSpellingStrictAsync(gitDir)) continue;
      directories.add(gitDir);
    }
  }
  return Array.from(directories);
}
//@ chunk-a2q0x549.js:256734-257145 facade-majority (2.1.88 match: pathInWorkingPath, 0.776)
/**
 * path 是否在 workingPath 内：两端展开为绝对路径，macOS /private/var、/private/tmp 归一为 /var、/tmp，可选大小写折叠与 UNC 形状一致性检查，再看 posix 相对路径是否不以 .. 开头且非绝对。
 */
function pathInWorkingPath(
  path,
  workingPath,
  { caseFold, skipPrivateAlias = false, uncShapeParity = false } = {
    caseFold: true,
  },
) {
  let absolutePath = expandPath(path);
  let absoluteWorkingPath = expandPath(workingPath);
  if (
    uncShapeParity &&
    (isUncOrDevicePath(absolutePath) !== isUncOrDevicePath(absoluteWorkingPath) ||
      isUncOrDevicePath(path) !== isUncOrDevicePath(workingPath))
  )
    return false;
  let privateVarPattern = caseFold ? /^\/private\/var\//i : /^\/private\/var\//;
  let privateTmpPattern = caseFold ? /^\/private\/tmp(\/|$)/i : /^\/private\/tmp(\/|$)/;
  let stripPrivateAlias = (inputPath) =>
    skipPrivateAlias
      ? inputPath
      : inputPath.replace(privateVarPattern, "/var/").replace(privateTmpPattern, "/tmp$1");
  let caseNormalizedPath = stripPrivateAlias(absolutePath);
  let caseNormalizedWorkingPath = stripPrivateAlias(absoluteWorkingPath);
  let relativeSubpath = caseFold
    ? relativePath(
        normalizeCaseForComparison(caseNormalizedWorkingPath),
        normalizeCaseForComparison(caseNormalizedPath),
      )
    : relativePath(caseNormalizedWorkingPath, caseNormalizedPath);
  if (relativeSubpath === "") return true;
  if (containsPathTraversal(relativeSubpath)) return false;
  return !posix.isAbsolute(relativeSubpath);
}
//@ chunk-a2q0x549.js:257145-257423 facade-majority (2.1.88 match: rootPathForSource, 0.728)
/**
 * 规则来源对应的根目录：cliArg/command/session 等会话来源用当前工作目录；settings 各层用该设置文件所在目录的根。
 */
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
//@ chunk-a2q0x549.js:257423-257459 file-local
function prependDirSep(path) {
  return posix.join(DIR_SEP, path);
}
//@ chunk-a2q0x549.js:257459-257860 fingerprint (2.1.88 match: normalizePatternToPath, 1)
/**
 * 把带根的规则模式换算成相对 rootPath 的 gitignore 模式列表：同根直接加 /；模式在根下取后缀；根在模式下用 stripPatternPrefixSegments 吃掉前缀段；无关返回 []。
 */
function normalizePatternToPath({ patternRoot, pattern, rootPath }) {
  let fullPattern = posix.join(patternRoot, pattern);
  let normalizedPatternRoot = normalizeCaseForComparison(patternRoot);
  let normalizedRoot = normalizeCaseForComparison(rootPath);
  if (normalizedPatternRoot === normalizedRoot) return [prependDirSep(pattern)];
  else if (normalizeCaseForComparison(fullPattern).startsWith(`${normalizedRoot}${DIR_SEP}`)) {
    let relativePart = fullPattern.slice(rootPath.length);
    return [prependDirSep(relativePart)];
  } else {
    let relativePath = posix.relative(normalizedRoot, normalizedPatternRoot);
    if (!relativePath || relativePath.startsWith(`..${DIR_SEP}`) || relativePath === "..") {
      let relativePath = posix.relative(normalizedPatternRoot, normalizedRoot);
      if (!relativePath || relativePath === ".." || relativePath.startsWith(`..${DIR_SEP}`)) return [];
      return stripPatternPrefixSegments(pattern, relativePath.split(DIR_SEP)).map(prependDirSep);
    } else {
      let relativePattern = posix.join(relativePath, pattern);
      return [prependDirSep(relativePattern)];
    }
  }
}
//@ chunk-a2q0x549.js:257860-258453 layout
/**
 * 用 gitignore 语义让模式逐段匹配并消耗前缀目录段（支持 **），返回剩余模式集合（全部消耗则为 **）。
 */
function stripPatternPrefixSegments(pattern, prefixSegments) {
  let rest = pattern.split(DIR_SEP).filter((segment) => segment !== "" && segment !== ".");
  let trailingSep = pattern.endsWith(DIR_SEP) ? DIR_SEP : "";
  let results = new Set();
  let stack = [
    {
      rest,
      at: 0,
    },
  ];
  let seen = new Set();
  for (let frame = stack.pop(); frame !== undefined; frame = stack.pop()) {
    let { rest, at } = frame;
    let frameKey = `${at}:${rest.join(DIR_SEP)}`;
    if (seen.has(frameKey)) continue;
    seen.add(frameKey);
    if (at === prefixSegments.length) {
      results.add(rest.length === 0 ? "**" : rest.join(DIR_SEP) + trailingSep);
      continue;
    }
    let head = rest[0];
    if (head === undefined) {
      results.add("**");
      continue;
    }
    if (head === "**") {
      stack.push({
        rest,
        at: at + 1,
      });
      stack.push({
        rest: rest.slice(1),
        at,
      });
      continue;
    }
    let replaced = (/^[!#]/.test(head) ? `\\${head}` : head).replace(/ +$/, (trailingSpaces) =>
      trailingSpaces.replace(/ /g, "\\ "),
    );
    if (memoryStoresEnvModule.default().add(replaced).ignores(prefixSegments[at]))
      stack.push({
        rest: rest.slice(1),
        at: at + 1,
      });
  }
  return Array.from(results);
}
//@ chunk-a2q0x549.js:258453-258573 layout
function toComparablePosixPath(path) {
  if (getPlatform() !== "windows") return path;
  let normalized = posix.normalize(toPosixPath(path));
  return normalized.length > 1 && normalized.endsWith("/") ? normalized.slice(0, -1) : normalized;
}
//@ chunk-a2q0x549.js:258573-259027 facade-majority (2.1.88 match: normalizePatternsToPath, 1)
/**
 * 把按根分组的忽略模式统一换算成相对 root 的模式列表（含模式根的 realpath 版本），供 ripgrep 等搜索工具的忽略规则使用。
 */
function normalizePatternsToPath(patternsByRoot, root) {
  let realpathCache = new Map();
  let rootPatterns = patternsByRoot.get(null) ?? [];
  let result = new Set(rootPatterns);
  let rootPath = toComparablePosixPath(root);
  let patternRoot = toComparablePosixPath(getCwd());
  for (let pattern of rootPatterns) {
    if (!pattern.replace(/\/+$/, "").includes(DIR_SEP)) continue;
    for (let resolved of withResolvedPatternRoot(patternRoot, pattern, realpathCache))
      for (let normalized of normalizePatternToPath({
        patternRoot: resolved.patternRoot,
        pattern: resolved.pattern,
        rootPath,
      }))
        result.add(normalized);
  }
  for (let [patternRoot, patterns] of patternsByRoot.entries()) {
    if (patternRoot === null) continue;
    let normalizedPattern = toComparablePosixPath(patternRoot);
    for (let pattern of patterns)
      for (let resolvedPattern of withResolvedPatternRoot(normalizedPattern, pattern, realpathCache))
        for (let normalizedPattern of normalizePatternToPath({
          patternRoot: resolvedPattern.patternRoot,
          pattern: resolvedPattern.pattern,
          rootPath,
        }))
          result.add(normalizedPattern);
  }
  return Array.from(result);
}
//@ chunk-a2q0x549.js:259027-259407 layout
function withResolvedPatternRoot(patternRoot, pattern, realpathCache) {
  let baseEntry = {
    patternRoot,
    pattern,
  };
  let trailingSep = pattern.endsWith(DIR_SEP) ? DIR_SEP : "";
  let filtered = pattern.split(DIR_SEP).filter((segment) => segment !== "" && segment !== ".");
  let index = filtered.findIndex((segment) => /[*?[{]/.test(segment));
  let splitIndex = index === -1 ? Math.max(0, filtered.length - 1) : index;
  let joined = posix.join(patternRoot, ...filtered.slice(0, splitIndex));
  let realRoot = realpathCache.get(joined);
  if (realRoot === undefined) {
    realRoot = toComparablePosixPath(
      safeResolvePath(
        getFsImplementation(),
        getPlatform() === "windows" ? posixPathToWindowsPath(joined) : joined,
      ).resolvedPath,
    );
    realpathCache.set(joined, realRoot);
  }
  if (realRoot === joined) return [baseEntry];
  return [
    baseEntry,
    {
      patternRoot: realRoot,
      pattern: filtered.slice(splitIndex).join(DIR_SEP) + trailingSep,
    },
  ];
}
//@ chunk-a2q0x549.js:259407-259710 facade-majority (2.1.88 match: getFileReadIgnorePatterns, 0.674)
/**
 * Read 的 deny 规则按根分组的模式表（去掉 ! 取反项）；WSL 第二根挂载开启时为每个挂载根复制一份。
 */
function getFileReadIgnorePatterns(toolPermissionContext) {
  let patternsByRoot = getPatternsByRoot(toolPermissionContext, "read", "deny");
  let result = new Map();
  for (let [patternRoot, { patternMap }] of patternsByRoot.entries())
    result.set(
      patternRoot,
      Array.from(patternMap.keys()).filter((key) => !key.startsWith("!")),
    );
  if (result.size === 0 || !isWslSecondRootMountEnabled()) return result;
  let originalEntries = [...result];
  for (let mountPoint of rootAliasMountPoints())
    for (let [root, patterns] of originalEntries) {
      let rootPath = root ?? getCwd();
      let aliasRoot = rootPath === DIR_SEP ? mountPoint : mountPoint + rootPath;
      result.set(aliasRoot, [...(result.get(aliasRoot) ?? []), ...patterns]);
    }
  return result;
}
//@ chunk-a2q0x549.js:259710-259747 facade-majority
function patternWithRootFor(pattern, root) {
  return patternWithRoot_2(pattern, () => root);
}
//@ chunk-a2q0x549.js:259747-260527 fingerprint (2.1.88 match: patternWithRoot, 1)
/**
 * 解析路径规则模式的根：//x 为文件系统根（Windows //c/ 为盘符根）、C:\ 盘符、~/ 为家目录、/x 为规则来源根，其余相对模式 root=null（匹配时用 cwd）。返回 {relativePattern, root}。
 */
function patternWithRoot_2(pattern, source) {
  if (
    getPlatform() === "windows" &&
    (pattern.startsWith("~\\") || (pattern.startsWith("\\") && pattern[1] !== "!" && pattern[1] !== "#"))
  )
    pattern = pattern.replaceAll("\\", "/");
  if (pattern.startsWith(`${DIR_SEP}${DIR_SEP}`)) {
    let patternWithoutDoubleSlash = pattern.slice(1);
    if (getPlatform() === "windows" && patternWithoutDoubleSlash.match(/^\/[a-z]\//i)) {
      let driveLetter = patternWithoutDoubleSlash[1]?.toUpperCase() ?? "C";
      let pathAfterDrive = patternWithoutDoubleSlash.slice(2);
      let driveRoot = `${driveLetter}:\\`;
      return {
        relativePattern: pathAfterDrive.startsWith("/") ? pathAfterDrive : "/" + pathAfterDrive,
        root: driveRoot,
      };
    }
    return {
      relativePattern: patternWithoutDoubleSlash,
      root: DIR_SEP,
    };
  } else if (getPlatform() === "windows" && pattern.match(/^[A-Za-z]:[/\\]/)) {
    let upper = pattern[0].toUpperCase();
    let replaced = pattern.slice(2).replaceAll("\\", "/");
    return {
      relativePattern: replaced.startsWith("/") ? replaced : "/" + replaced,
      root: `${upper}:\\`,
    };
  } else if (pattern.startsWith(`~${DIR_SEP}`))
    return {
      relativePattern: pattern.slice(1),
      root: homedir().normalize("NFC"),
    };
  else if (pattern.startsWith(DIR_SEP))
    return {
      relativePattern: pattern,
      root: source(),
    };
  let normalizedPattern = pattern;
  if (pattern.startsWith(`.${DIR_SEP}`)) normalizedPattern = pattern.slice(2);
  return {
    relativePattern: normalizedPattern,
    root: null,
  };
}
//@ chunk-a2q0x549.js:260527-260696 layout
function normalizeRulePattern(pattern) {
  let replaced = pattern.replace(/\/{2,}/g, "/");
  if (/^\s*(?:\/\*\*)?$/.test(replaced)) return replaced;
  return replaced
    .replace(/^\uFEFF([!#]?)/, (bomMatch, bomMarker) => (bomMarker ? "\\" + bomMarker : ""))
    .replace(/^\uFEFF/, "[\uFEFF]");
}
//@ chunk-a2q0x549.js:260696-260738 facade-majority
function patternWithRoot(pattern, source) {
  return patternWithRoot_2(pattern, () => rootPathForSource(source));
}
//@ chunk-a2q0x549.js:260738-260871 facade-majority
/**
 * 把一条路径规则编译成 {root, pattern}：patternWithRoot 拆根，规范化后转成 gitignore 风格 glob（allow 规则与 deny 规则的规范化方式不同）；无效模式返回 null。
 */
function compiledPathRulePattern(ruleContent, source, behavior) {
  let { relativePattern, root } = patternWithRoot(ruleContent, source);
  let isAllow = behavior === "allow";
  let sanitizedPattern = sanitizeRulePattern(normalizeRulePattern(relativePattern), isAllow);
  return sanitizedPattern === null
    ? null
    : {
        root,
        pattern: normalizeGitignoreGlob(sanitizedPattern, isAllow),
      };
}
//@ chunk-a2q0x549.js:260871-260882 layout
var MAX_RULE_PATTERN_LENGTH = 1e4;
//@ chunk-a2q0x549.js:260882-261022 layout (2.1.88 match: parseSkillPaths, 0.822)
function normalizeGitignoreGlob(glob, allowMode) {
  if (glob.endsWith("/**")) {
    let sliced = glob.slice(0, -3);
    return /[^/]/.test(sliced)
      ? sliced.includes("/") || !allowMode || /^[!#]/.test(sliced)
        ? sliced
        : "/" + sliced
      : "/**";
  }
  return glob;
}
//@ chunk-a2q0x549.js:261022-261362 layout
/**
 * 规整权限规则模式：按 gitignore 语义检查，有问题时记警告，allow（或否定 deny）规则直接丢弃，其余改为匹配字面路径。
 */
function sanitizeRulePattern(pattern, allowMode) {
  let normalized = normalizeGitignoreGlob(pattern, allowMode);
  let skipReason =
    !allowMode && /^!\s*$/.test(normalized)
      ? "a negation of every path"
      : describeIgnorePatternSkip(normalized);
  if (skipReason === null) return pattern;
  let negationPrefix = pattern.startsWith("!") ? "!" : "";
  let shouldSkip = negationPrefix ? !allowMode : allowMode;
  warnUnusableIgnorePattern(
    "permission_rules",
    pattern,
    skipReason,
    shouldSkip ? "dropping it" : "matching the literal path it spells",
  );
  if (shouldSkip) return null;
  let suffix = pattern.endsWith("/**") ? "/**" : "";
  let content = pattern.slice(negationPrefix.length, pattern.length - suffix.length);
  return negationPrefix + escapeRuleContent(unescapeRuleContent_2(content)) + suffix;
}
//@ chunk-a2q0x549.js:261362-261397 layout
var GLOB_METACHAR_IN_SEGMENT_RE = /(?:^|[^\\])(?:\\\\)*[*?[]/;
//@ chunk-a2q0x549.js:261397-261787 layout
/**
 * 非 Windows 下把规则前缀的目录换成物理路径孪生（如符号链接目标），得到等价的绝对规则模式；无法安全转换返回 null。
 */
function getPhysicalTwinPattern(root, relativePattern) {
  if (getPlatform() === "windows" || isDiskless() || !relativePattern.startsWith("/")) return null;
  let parts = relativePattern.slice(1).split("/");
  let literalSegments = 0;
  while (
    literalSegments < parts.length &&
    parts[literalSegments] !== "" &&
    !GLOB_METACHAR_IN_SEGMENT_RE.test(parts[literalSegments])
  )
    literalSegments++;
  if (literalSegments === 0) return null;
  let path = join(root, ...parts.slice(0, literalSegments).map(unescapeRuleContent_2));
  let physicalTwinPath = getPhysicalTwinPath(path);
  if (physicalTwinPath === null) return null;
  let sliced = parts.slice(literalSegments);
  let pattern = normalizeRulePattern(
    escapeRuleContent(physicalTwinPath, {
      escapeGlobs: true,
    }) + (sliced.length > 0 ? "/" + sliced.join("/") : ""),
  );
  let ignorePattern = normalizeGitignoreGlob(pattern, false);
  if (
    describeIgnorePatternSkip(ignorePattern) !== null ||
    (ignorePattern !== pattern && ignorePattern + "/**" !== pattern)
  )
    return null;
  return pattern;
}
//@ chunk-a2q0x549.js:261787-263484 layout
/**
 * 把某类（edit/read）某种行为的内容规则按根目录分桶，生成 gitignore 匹配器；deny/ask 结果按会话缓存（LRU 16），并为带根的规则追加物理孪生路径模式。
 */
function getPatternsByRoot(permissionContext, toolType, behavior) {
  let rules =
    behavior === "deny"
      ? permissionContext.alwaysDenyRules
      : behavior === "ask"
        ? permissionContext.alwaysAskRules
        : null;
  let cacheEntry =
    rules !== null
      ? {
          rules,
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
    let { compiledPatternsByRules } = getSessionPathsCache();
    let byKey = compiledPatternsByRules.get(cacheEntry.rules);
    let cached = byKey?.get(cacheEntry.key);
    if (cached !== undefined && byKey !== undefined) {
      byKey.delete(cacheEntry.key);
      byKey.set(cacheEntry.key, cached);
      return cached;
    }
  }
  let toolName = (() => {
    switch (toolType) {
      case "edit":
        return EDIT;
      case "read":
        return READ;
    }
  })();
  let isAllow = behavior === "allow";
  let contentRules = getContentRulesForToolName(permissionContext, toolName, behavior);
  let uniqueRules = isAllow
    ? Array.from(
        new Map(contentRules.map((contentRule) => [contentRule.ruleValue.ruleContent, contentRule])).values(),
      )
    : contentRules;
  let { physicalTwinsByPattern } = getSessionPathsCache();
  let byRoot = new Map();
  let getBucketMatcher = (root, source) => {
    let bucket = byRoot.get(root);
    if (bucket === undefined) {
      bucket = {
        patternMap: new Map(),
        matchers: [],
      };
      byRoot.set(root, bucket);
    }
    let found = bucket.matchers.find((matcher) => matcher.source === source);
    if (found === undefined) {
      let patternMap = new Map();
      let ignoreInstance;
      let ruleCount = 0;
      found = {
        source,
        patternMap,
        getIg: () => {
          if (ignoreInstance === undefined || ++ruleCount > MAX_RULE_PATTERN_LENGTH) {
            ruleCount = 1;
            ignoreInstance = memoryStoresEnvModule
              .default()
              .add(Array.from(patternMap.keys(), (pattern) => normalizeGitignoreGlob(pattern, isAllow)));
          }
          return ignoreInstance;
        },
      };
      bucket.matchers.push(found);
    }
    return {
      bucket,
      matcher: found,
    };
  };
  for (let uniqueRule of uniqueRules) {
    let ruleContent = uniqueRule.ruleValue.ruleContent;
    if (ruleContent === undefined) continue;
    let { relativePattern, root } = patternWithRoot(ruleContent, uniqueRule.source);
    let normalizedPattern = sanitizeRulePattern(normalizeRulePattern(relativePattern), isAllow);
    if (normalizedPattern === null) continue;
    let source = isAllow ? null : uniqueRule.source;
    let { bucket, matcher } = getBucketMatcher(root, source);
    if (!isAllow) matcher.patternMap.delete(normalizedPattern);
    matcher.patternMap.set(normalizedPattern, uniqueRule);
    bucket.patternMap.set(normalizedPattern, uniqueRule);
    if (isAllow || root === null) continue;
    let twinKey = `${root}\x00${normalizedPattern}`;
    let twins = physicalTwinsByPattern.get(twinKey);
    if (twins === undefined) {
      twins = new Set();
      physicalTwinsByPattern.set(twinKey, twins);
    }
    let physicalTwinPattern = getPhysicalTwinPattern(root, normalizedPattern);
    if (physicalTwinPattern !== null) twins.add(physicalTwinPattern);
    for (let twinPattern of twins) {
      let bucketMatcher = getBucketMatcher(DIR_SEP, source);
      if (!bucketMatcher.matcher.patternMap.has(twinPattern))
        bucketMatcher.matcher.patternMap.set(twinPattern, uniqueRule);
      if (!bucketMatcher.bucket.patternMap.has(twinPattern))
        bucketMatcher.bucket.patternMap.set(twinPattern, uniqueRule);
    }
  }
  if (cacheEntry !== null) {
    let { compiledPatternsByRules } = getSessionPathsCache();
    let cacheMap = compiledPatternsByRules.get(cacheEntry.rules);
    if (cacheMap === undefined) {
      cacheMap = new Map();
      compiledPatternsByRules.set(cacheEntry.rules, cacheMap);
    }
    if (cacheMap.size >= 16) {
      let oldestKey = cacheMap.keys().next().value;
      if (oldestKey !== undefined) cacheMap.delete(oldestKey);
    }
    cacheMap.set(cacheEntry.key, byRoot);
  }
  return byRoot;
}
//@ chunk-a2q0x549.js:263484-263507 layout
var NON_ASCII_RE = /[^\p{ASCII}]/u;
//@ chunk-a2q0x549.js:263507-263532 facade-majority
function mayBeGuardedFileSyncCopy(path) {
  return false;
}
//@ chunk-a2q0x549.js:263532-263574 facade-majority
function mayEscapeExclusionGlobs(path) {
  return NON_ASCII_RE.test(path) || mayBeGuardedFileSyncCopy(path);
}
//@ chunk-a2q0x549.js:263574-263750 facade-majority (2.1.88 match: isFileReadDenied, 1)
/**
 * 找出可能借大小写折叠或排除 glob 逃逸的路径中、其任一拼写命中 Read deny 规则的那些，返回集合；用于搜索类工具补做 deny 过滤。旧版名 isFileReadDenied 不准确。
 */
function denyFoldVariantPaths(paths, toolPermissionContext, extraSpellings = () => [], includeAll = false) {
  let denied = new Set();
  for (let inputPath of paths) {
    if ((!includeAll && !mayEscapeExclusionGlobs(inputPath)) || denied.has(inputPath)) continue;
    if (
      [...getPathsForPermissionCheck(inputPath), ...extraSpellings(inputPath)].some(
        (spelling) => matchingRuleForInput(spelling, toolPermissionContext, "read", "deny") !== null,
      )
    )
      denied.add(inputPath);
  }
  return denied;
}
//@ chunk-a2q0x549.js:263750-263801 facade-majority
function isSearchResultRootRespellEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_fizzy_treasure", true);
}
//@ chunk-a2q0x549.js:263801-264397 facade-majority (2.1.88 match: getPatternsByRoot, 0.607)
/**
 * 对相对或含 .. 的路径，把它的尾部依次拼到每条 Read/Edit deny 规则的根（及根下各前缀）后再匹配，返回第一条命中的 deny 规则（用于 shell 命令里写法不定的路径）。
 */
function denyRuleMatchingAnywhere(path, toolPermissionContext, operation) {
  let expandedPath = expandPath(path);
  if (isAbsolute_2(path) || path.startsWith("~"))
    return matchingRuleForInput(expandedPath, toolPermissionContext, operation, "deny");
  let filtered = path.split(/[\\/]+/).filter((segment) => segment !== "" && segment !== ".");
  while (filtered[0] === "..") filtered.shift();
  if (filtered.length === 0) return null;
  let joined = filtered.join("/");
  let contentRulesForToolName = getContentRulesForToolName(
    toolPermissionContext,
    operation === "read" ? READ : EDIT,
    "deny",
  );
  let patternsByRoot = new Set();
  for (let rule of contentRulesForToolName) {
    let ruleContent = rule.ruleValue.ruleContent;
    if (ruleContent === undefined) continue;
    let { relativePattern, root } = patternWithRoot(ruleContent, rule.source);
    let ruleRoot = root ?? getOriginalCwd();
    let filtered = normalizeRulePattern(relativePattern)
      .split("/")
      .filter((ruleSegment) => ruleSegment !== "");
    for (let idx = 0; idx < Math.max(1, filtered.length); idx++) {
      let joined_2 = [ruleRoot, ...filtered.slice(0, idx), joined].join("/");
      if (patternsByRoot.has(joined_2)) continue;
      patternsByRoot.add(joined_2);
      let match = matchingRuleForInput(joined_2, toolPermissionContext, operation, "deny");
      if (match !== null) return match;
    }
  }
  return null;
}
//@ chunk-a2q0x549.js:264397-264984 facade-majority
/**
 * 搜索根目录下是否有路径被 Read deny 规则覆盖（规则根在搜索根内，或规则段与相对路径前缀匹配），返回第一条这样的规则；用于 Grep/Glob 搜索根的预检。
 */
function readDenyRuleMayMatchBeneath(searchRoot, toolPermissionContext) {
  let contentRulesForToolName = getContentRulesForToolName(toolPermissionContext, READ, "deny");
  if (contentRulesForToolName.length === 0) return null;
  let paths = getPathsForPermissionCheck(searchRoot);
  let rootSpellings =
    isWslSecondRootMountEnabled() &&
    rootAliasMountPoints().some((mountPoint) =>
      paths.some((spelling) => mountPoint.startsWith(`${spelling}${DIR_SEP}`)),
    )
      ? [...paths, DIR_SEP]
      : withSecondRootMountSpellings(paths);
  for (let rule of contentRulesForToolName) {
    let ruleContent = rule.ruleValue.ruleContent;
    if (ruleContent === undefined) continue;
    let { relativePattern, root } = patternWithRoot(ruleContent, rule.source);
    let rulePattern = normalizeRulePattern(relativePattern);
    if (rulePattern.startsWith("!")) continue;
    let ruleSegments = rulePattern.split("/").filter((ruleSegment) => ruleSegment !== "");
    let isBareName = ruleSegments.length <= 1 && !rulePattern.startsWith("/");
    let ruleRoot = root ?? getCwd();
    for (let spelling of rootSpellings) {
      let pathSegments = relativePath(ruleRoot, spelling)
        .split("/")
        .filter((pathSegment) => pathSegment !== "" && pathSegment !== ".");
      if (pathSegments[0] === "..") {
        if (!relativePath(spelling, ruleRoot).split("/").includes("..")) return rule;
        continue;
      }
      if (isBareName || segmentsMatchPattern(ruleSegments, pathSegments)) return rule;
    }
  }
  return null;
}
//@ chunk-a2q0x549.js:264984-265304 layout
function segmentsMatchPattern(ruleSegments, pathSegments) {
  for (let [index, pathSegment] of pathSegments.entries()) {
    let ruleSegment = ruleSegments[index];
    if (ruleSegment === undefined || ruleSegment === "**") return true;
    let foldedPath = normalizeCaseForComparison(pathSegment);
    let foldedRule = normalizeCaseForComparison(ruleSegment);
    if (!/[*?[\]{}\\]/.test(foldedRule)) {
      if (foldedRule !== foldedPath) return false;
      continue;
    }
    if (/[[\]{}\\]/.test(foldedRule)) continue;
    if (
      !new RegExp(
        `^${foldedRule
          .replace(/[.+^$()|]/g, "\\$&")
          .replace(/\*/g, "[^/]*")
          .replace(/\?/g, "[^/]")}$`,
      ).test(foldedPath)
    )
      return false;
  }
  return true;
}
//@ chunk-a2q0x549.js:265304-265562 facade-majority
/**
 * matchingRuleForInput 的外层：先按原路径匹配；deny/ask 未命中时再查（WSL 第二根挂载开启时）路径在另一挂载根下的拼写，命中则上报 tengu_path_rule_matched_through_second_root_mount。
 */
function matchingRuleForInput(path, toolPermissionContext, toolType, behavior, options = {}) {
  let primaryMatch = matchingRuleForInput_2(path, toolPermissionContext, toolType, behavior, options);
  if (primaryMatch !== null || behavior === "allow" || options.asSpelledOnly === true) return primaryMatch;
  let secondRootMatch = matchingRuleForInputSecondRoot(
    path,
    toolPermissionContext,
    toolType,
    behavior,
    options,
  );
  if (secondRootMatch !== null) return secondRootMatch;
  if (
    !isWslSecondRootMountEnabled() ||
    getPatternsByRoot(toolPermissionContext, toolType, behavior).size === 0
  )
    return primaryMatch;
  let path_2 = pathBelowRootAlias(expandPath(path));
  let aliasMatch =
    path_2 === undefined
      ? null
      : matchingRuleForInput_2(path_2, toolPermissionContext, toolType, behavior, options);
  if (aliasMatch !== null) reportSecondRootMountMatch(toolType, behavior);
  return aliasMatch;
}
//@ chunk-a2q0x549.js:265562-265597 layout
function matchingRuleForInputSecondRoot(path, toolPermissionContext, toolType, behavior, options) {
  return null;
}
//@ chunk-a2q0x549.js:265597-265809 layout
function reportSecondRootMountMatch(toolType, behavior) {
  let key = `${toolType} ${behavior}`;
  let { reportedSecondRootMountMatches } = getSessionPathsCache();
  if (!reportedSecondRootMountMatches.has(key)) {
    reportedSecondRootMountMatches.add(key);
    logEvent("tengu_path_rule_matched_through_second_root_mount", {
      behavior: fromEnum(behavior),
      tool_type: fromEnum(toolType),
      mount_table_unreadable: isWslMountInfoUnreadable(),
    });
  }
}
//@ chunk-a2q0x549.js:265809-265877 layout
function withSecondRootMountSpellings(paths) {
  return isWslSecondRootMountEnabled()
    ? normalizeCaseForComparison_2([...paths, ...paths.flatMap((path) => pathBelowRootAlias(path) ?? [])])
    : paths;
}
//@ chunk-a2q0x549.js:265877-266069 layout
function isWslSecondRootMountEnabled() {
  if (getPlatform() !== "wsl") return false;
  try {
    return getFeatureValue_CACHED_MAY_BE_STALE("tengu_zesty_pearl", false) === true;
  } catch (error) {
    let sessionPathsCache = getSessionPathsCache();
    if (!sessionPathsCache.reportedSecondRootMountFlagThrow) {
      sessionPathsCache.reportedSecondRootMountFlagThrow = true;
      logError(error);
    }
    return true;
  }
}
//@ chunk-a2q0x549.js:266069-266849 fingerprint (2.1.88 match: matchingRuleForInput, 0.575)
/**
 * 在按根分组的 gitignore 匹配器里找命中路径的规则：路径换成相对规则根的形式（Windows 与 caseInsensitiveTarget 时大小写折叠，目录加 /），倒序取最后一条命中；处理 x/** 与 /x 的等价写法。返回规则对象或 null。
 */
function matchingRuleForInput_2(path, toolPermissionContext, toolType, behavior, options) {
  let fileAbsolutePath = expandPath(path);
  if (getPlatform() === "windows" && fileAbsolutePath.includes("\\"))
    fileAbsolutePath = windowsPathToPosixPath(fileAbsolutePath);
  let patternsByRoot = getPatternsByRoot(toolPermissionContext, toolType, behavior);
  let caseInsensitive =
    behavior !== "allow" && (getPlatform() === "windows" || options.caseInsensitiveTarget === true);
  let targetPath = fileAbsolutePath ?? getCwd();
  let comparedTarget = caseInsensitive ? normalizeCaseForComparison(targetPath) : targetPath;
  for (let [root, { matchers }] of orderRootEntries(patternsByRoot)) {
    let rootPath = root ?? getCwd();
    let relativePathStr = relativePath(
      caseInsensitive ? normalizeCaseForComparison(rootPath) : rootPath,
      comparedTarget,
    );
    if (!relativePathStr || !memoryStoresEnvModule.default.isPathValid(relativePathStr)) continue;
    let withSlash = `${relativePathStr}/`;
    let testPath =
      options.isDirectory === true && memoryStoresEnvModule.default.isPathValid(withSlash)
        ? withSlash
        : relativePathStr;
    for (let idx = matchers.length - 1; idx >= 0; idx--) {
      let matcher = matchers[idx];
      if (matcher === undefined) continue;
      let { patternMap, getIg } = matcher;
      let igResult = getIg().test(testPath);
      if (!igResult.ignored || !igResult.rule) continue;
      let originalPattern = igResult.rule.pattern;
      let recursivePattern = originalPattern + "/**";
      if (patternMap.has(recursivePattern) && (originalPattern.includes("/") || behavior !== "allow"))
        return patternMap.get(recursivePattern) ?? null;
      if (originalPattern.startsWith("/")) {
        let withWildcard = originalPattern.slice(1) + "/**";
        if (patternMap.has(withWildcard)) return patternMap.get(withWildcard) ?? null;
      }
      let matchedRule = patternMap.get(originalPattern);
      if (matchedRule !== undefined || behavior === "allow") return matchedRule ?? null;
    }
  }
  return null;
}
//@ chunk-a2q0x549.js:266849-267185 facade-majority
/**
 * 若某目录本身就是一条 deny（或指定行为）路径规则的根、且该规则是 /** 或 **（整目录内容），返回该规则；Windows 上按大小写折叠比较，并补 WSL 第二挂载根拼写。用于判断整个目录的内容是否被拒。
 */
function matchingDenyRuleForDirectoryContents(dirPath, toolPermissionContext, toolType, behavior = "deny") {
  let patternsByRoot = getPatternsByRoot(toolPermissionContext, toolType, behavior);
  if (patternsByRoot.size === 0) return null;
  let targetPath = expandPath(dirPath);
  if (getPlatform() === "windows" && targetPath.includes("\\"))
    targetPath = windowsPathToPosixPath(targetPath);
  let isWindows = getPlatform() === "windows";
  let spellings = withSecondRootMountSpellings([
    isWindows ? normalizeCaseForComparison(targetPath) : targetPath,
  ]);
  for (let [root, { patternMap }] of orderRootEntries(patternsByRoot)) {
    let rootPath = root ?? getCwd();
    let comparedRoot = isWindows ? normalizeCaseForComparison(rootPath) : rootPath;
    if (!spellings.some((spelling) => relativePath(comparedRoot, spelling) === "")) continue;
    let catchAllRule = patternMap.get("/**") ?? patternMap.get("**");
    if (catchAllRule !== undefined) return catchAllRule;
  }
  return null;
}
//@ chunk-a2q0x549.js:267185-267582 facade-majority
/**
 * 判断一个路径是否匹配给定规则串：按 session 来源解析根，用 ignore 库做 gitignore 匹配；不匹配时，若规则以 * 开头或不像路径且不是 :* 前缀规则，再退回通配匹配。
 */
function matchesPathRule(pattern, candidatePath) {
  let expandedPath = expandPath(candidatePath);
  if (getPlatform() === "windows" && expandedPath.includes("\\"))
    expandedPath = windowsPathToPosixPath(expandedPath);
  let { relativePattern, root } = patternWithRoot(pattern, "session");
  let sanitizedPattern = sanitizeRulePattern(normalizeRulePattern(relativePattern), true);
  let gitignoreGlob = sanitizedPattern === null ? null : normalizeGitignoreGlob(sanitizedPattern, true);
  let isWindows = getPlatform() === "windows";
  let rootPath = root ?? getCwd();
  let relativePathStr = relativePath(
    isWindows ? normalizeCaseForComparison(rootPath) : rootPath,
    isWindows ? normalizeCaseForComparison(expandedPath) : expandedPath,
  );
  if (
    gitignoreGlob !== null &&
    relativePathStr &&
    memoryStoresEnvModule.default.isPathValid(relativePathStr) &&
    memoryStoresEnvModule.default().add(gitignoreGlob).test(relativePathStr).ignored
  )
    return true;
  let pattern_2 = pattern.trim();
  let isBarePattern = !hasWildcards(pattern_2) && !pattern_2.endsWith(":*");
  if (pattern_2.startsWith("*") || isBarePattern) return matchWildcardPattern(pattern, candidatePath);
  return false;
}
//@ chunk-a2q0x549.js:267582-267947 layout
/**
 * 探测系统级可信符号链接（/tmp→/private/tmp 等），按会话缓存真实路径→别名的映射。
 */
function getTrustedSymlinkEquivalences() {
  let sessionPathsCache = getSessionPathsCache();
  if (sessionPathsCache.trustedSymlinkEquivalences !== undefined)
    return sessionPathsCache.trustedSymlinkEquivalences;
  let pairs = [
    ["/private/tmp", "/tmp"],
    ["/private/var", "/var"],
    ["/private/etc", "/etc"],
    ["/usr/bin", "/bin"],
    ["/usr/lib", "/lib"],
    ["/usr/sbin", "/sbin"],
  ];
  let equivalences = new Map();
  let fsImplementation = getFsImplementation();
  for (let [realPath, aliasPath] of pairs)
    try {
      if (fsImplementation.realpathSync(aliasPath) === realPath) equivalences.set(realPath, aliasPath);
    } catch {}
  sessionPathsCache.trustedSymlinkEquivalences = equivalences;
  return equivalences;
}
//@ chunk-a2q0x549.js:267947-268048 facade-majority
/**
 * 把位于可信符号链接前缀下的路径改写为其目标前缀，用于 allow 规则匹配时补一次拼写。
 */
function normalizeTrustedSymlink(absolutePath) {
  for (let [scratchpadDir, aliasPath] of getTrustedSymlinkEquivalences())
    if (absolutePath === scratchpadDir || absolutePath.startsWith(scratchpadDir + sep_2))
      return aliasPath + absolutePath.slice(scratchpadDir.length);
  return absolutePath;
}
//@ chunk-a2q0x549.js:268048-268201 facade-majority
/**
 * 要求所有路径拼写都命中某条 allow 规则（必要时用可信符号链接改写后的拼写再试），全部命中返回第一条规则，否则 null。
 */
function matchingAllowRuleForAllPaths(spellings, toolPermissionContext, toolType) {
  let firstMatch = null;
  for (let spelling of spellings) {
    let match = matchingRuleForInput(spelling, toolPermissionContext, toolType, "allow");
    if (!match) {
      let normalizedSpelling = normalizeTrustedSymlink(spelling);
      if (normalizedSpelling !== spelling)
        match = matchingRuleForInput(normalizedSpelling, toolPermissionContext, toolType, "allow");
    }
    if (!match) return null;
    firstMatch ??= match;
  }
  return firstMatch;
}
//@ chunk-a2q0x549.js:268201-271876 facade-majority
/**
 * 读权限的网络路径防御：对 /net、/Network 自动挂载、macOS 内核重定向前缀（/.vol 等）和 UNC 路径（含所有解析拼写），若不在可信网络根下则返回 ask，并说明可能触发 DNS 查询或远程挂载。
 */
function checkReadNetworkPathSafety(tool, input, toolPermissionContext, options) {
  if (typeof tool.getPath !== "function") return null;
  let path = tool.getPath(input);
  let trustedNetworkDirectories = toolPermissionContext.trustedNetworkDirectories;
  if (
    (isNetworkMountPath(path) || isNetDir(path)) &&
    !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories)
  )
    return buildSafetyCheckAsk(
      `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
      "Automount -hosts path detected (defense-in-depth check)",
    );
  if (neverOtherHostMount(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories))
    return buildSafetyCheckAsk(
      `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /Network automount browse surface and could trigger a directory-service lookup and mount to a remote host.`,
      "Automount browse surface detected (defense-in-depth check)",
    );
  if (isMacSpecialPath(path) && !isPathInTrustedNetworkRoot(path, trustedNetworkDirectories))
    return buildSafetyCheckAsk(
      `Claude requested permissions to read from ${encodeControlChars(path)}, which is under /.vol, /.file, /.nofollow or /.resolve (paths the macOS kernel redirects) and could reach a network mount, triggering a DNS lookup and mount to a remote host.`,
      "Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)",
    );
  let pathsToCheck = options ?? getPathsForPermissionCheck(path);
  for (let candidatePath of pathsToCheck) {
    if (
      isUncOrDevicePath(candidatePath) &&
      !isWslUncPath(candidatePath) &&
      !isPathInTrustedNetworkRoot(candidatePath, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which appears to be a UNC path that could access network resources.`,
        "UNC path detected (defense-in-depth check)",
      );
    if (
      (isNetworkMountPath(candidatePath) || isNetDir(candidatePath)) &&
      !isPathInTrustedNetworkRoot(candidatePath, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
        "Automount -hosts path detected (defense-in-depth check)",
      );
    if (
      neverOtherHostMount(candidatePath) &&
      !isPathInTrustedNetworkRoot(candidatePath, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which is under the /Network automount browse surface and could trigger a directory-service lookup and mount to a remote host.`,
        "Automount browse surface detected (defense-in-depth check)",
      );
    if (
      isMacSpecialPath(candidatePath) &&
      !isPathInTrustedNetworkRoot(candidatePath, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to read from ${encodeControlChars(path)}, which is under /.vol, /.file, /.nofollow or /.resolve (paths the macOS kernel redirects) and could reach a network mount, triggering a DNS lookup and mount to a remote host.`,
        "Kernel-resolved path prefix (/.vol etc.) detected (defense-in-depth check)",
      );
  }
  if (tool.name === GLOB_TOOL_NAME) {
    let pattern = input.pattern;
    if (
      typeof pattern === "string" &&
      isUncOrDevicePath(pattern) &&
      !isWslUncPath(pattern) &&
      !isPathInTrustedNetworkRoot(pattern, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to glob ${pattern}, which appears to be a UNC pattern that could access network resources.`,
        "UNC glob pattern detected (defense-in-depth check)",
      );
    if (
      typeof pattern === "string" &&
      (isNetworkMountPath(pattern) || isNetDir(pattern)) &&
      !isPathInTrustedNetworkRoot(pattern, trustedNetworkDirectories)
    )
      return buildSafetyCheckAsk(
        `Claude requested permissions to glob ${pattern}, which is under the /net automount map and could trigger a DNS lookup and NFS mount to a remote host.`,
        "Automount -hosts glob pattern detected (defense-in-depth check)",
      );
    if (
      typeof pattern === "string" &&
      neverOtherHostMount(pattern) &&
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
  for (let globPath of pathsToCheck)
    if (hasSuspiciousWindowsPathPattern(globPath, trustedNetworkDirectories))
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
//@ chunk-a2q0x549.js:271876-271930 layout
var NARROWING_RULE_SOURCES; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:271876", () => {
  NARROWING_RULE_SOURCES = new Set(["toolsNarrowing", "cliArg", "command"]);
});
//@ chunk-a2q0x549.js:271930-271973 facade-majority
function hasPermissionAuthoredBareReadDeny(tool, probePath = READ_PATH_PROBE) {
  return denyRuleForReadProbe(tool, probePath) !== null;
}
//@ chunk-a2q0x549.js:271973-272045 layout
function denyRuleForReadProbe(tool, probePath = READ_PATH_PROBE) {
  return getDenyRuleForTool(
    tool,
    probePath,
    deniedBashRules(tool).filter((rule) => !NARROWING_RULE_SOURCES.has(rule.source)),
  );
}
//@ chunk-a2q0x549.js:272045-272103 facade-majority (2.1.88 match: isFileReadDenied, 1)
function hasReadDenyRuleInForce(filePath) {
  return hasPermissionAuthoredBareReadDeny(filePath) || getPatternsByRoot(filePath, "read", "deny").size > 0;
}
//@ chunk-a2q0x549.js:272103-272149 facade-majority
function hasReadDenyRuleForPath(filePath, toolPermissionContext, restriction) {
  return readDenyRuleForPath(filePath, toolPermissionContext, restriction) !== undefined;
}
//@ chunk-a2q0x549.js:272149-272320 facade-majority (2.1.88 match: isFileReadDenied, 1)
/**
 * 返回命中某路径的 Read deny 规则：先查整工具 deny；没有路径级 deny 规则时直接返回；否则逐个拼写用 matchingRuleForInput 查。
 */
function readDenyRuleForPath(inputPath, toolPermissionContext, spellings) {
  let probeRule = denyRuleForReadProbe(toolPermissionContext);
  if (probeRule !== null) return probeRule;
  if (getPatternsByRoot(toolPermissionContext, "read", "deny").size === 0) return;
  for (let spelling of spellings ?? getPathsForPermissionCheck(inputPath)) {
    let denyRule = matchingRuleForInput(spelling, toolPermissionContext, "read", "deny");
    if (denyRule !== null) return denyRule;
  }
  return;
}
//@ chunk-a2q0x549.js:272320-272682 facade-majority
/**
 * 只支持 Read 工具最小属性集（name、getPath 等）的探针对象，用 Proxy 包装，访问其他属性即抛错；供“按路径算读权限”的函数在没有真实工具对象时调用规则检查。
 */
var READ_PATH_PROBE; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-a2q0x549.js:272320", () => {
  READ_PATH_PROBE = new Proxy(
    {
      name: READ,
      mcpInfo: undefined,
      familyParentToolName: undefined,
      aliasSkillToolNames: undefined,
      getPath: (readRequest) => String(readRequest.file_path),
    },
    {
      get(probeTarget, propertyKey) {
        if (typeof propertyKey === "symbol") return;
        if (propertyKey in probeTarget) return probeTarget[propertyKey];
        throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          `readPermissionDecisionForPath probe consulted unsupported tool property: ${propertyKey}`,
          "readPermissionDecisionForPath probe consulted unsupported tool property",
        );
      },
    },
  );
});
//@ chunk-a2q0x549.js:272738-272785 facade-majority
function readPermissionDecisionForPath(filePath, toolPermissionContext) {
  return checkReadPermissionForTool(
    READ_PATH_PROBE,
    {
      file_path: filePath,
    },
    toolPermissionContext,
  );
}
//@ chunk-a2q0x549.js:272785-273027 facade-majority
/**
 * 判断读某路径是否会被自动放行：有整工具 Read deny/ask 规则则否；按分层读判定，allow 层为是，path-mode-ask 仅在 bypassPermissions 下为是，其余（各类 deny/ask）为否。
 */
function readWouldBeAutoAllowedForPath(filePath, toolPermissionContext) {
  if (
    getDenyRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null ||
    findAskRuleForTool(toolPermissionContext, READ_PATH_PROBE) !== null
  )
    return false;
  switch (layeredReadVerdictForPaths([filePath], toolPermissionContext).layer) {
    case "allow":
      return true;
    case "path-mode-ask":
      return toolPermissionContext.mode === "bypassPermissions";
    case "bare-deny":
    case "path-deny":
    case "path-rule-ask":
    case "bare-ask":
      return false;
  }
}
//@ chunk-a2q0x549.js:273027-273117 layout
var AUTOMOUNTER_PATH_REASON =
  "path names a darwin automounter lookup (/Network browse root or auto_home entry)";
//@ chunk-a2q0x549.js:273117-274052 facade-majority
/**
 * 对一组路径做分层读判定，返回最先命中的层：bare-deny（整工具 deny）、path-deny（可选拒绝自动挂载查找路径，或某路径被拒）、path-rule-ask（路径级 ask 规则）、bare-ask（整工具 ask）、path-mode-ask（其他需询问）、allow。toolsNarrowing/command 来源的规则不参与。
 */
function layeredReadVerdictForPaths(paths, toolPermissionContext, options) {
  let denyRuleForTool = getDenyRuleForTool(
    toolPermissionContext,
    READ_PATH_PROBE,
    deniedBashRules(toolPermissionContext).filter((rule) => !NARROWING_RULE_SOURCES_2.includes(rule.source)),
  );
  if (denyRuleForTool !== null)
    return {
      layer: "bare-deny",
      rule: denyRuleForTool,
    };
  if (options?.refuseAutomounterShapes) {
    for (let inputPath of paths)
      if (classifyHomeMount(anchorPathUnnormalized(inputPath)) || classifyHomeMount(expandPath(inputPath)))
        return {
          layer: "path-deny",
          path: inputPath,
          decision: {
            behavior: "deny",
            message: stripNonPrintable(
              `${encodeControlChars(inputPath)} names an automounter lookup path (its lookup is itself a network request); it was not read.`,
            ),
            decisionReason: {
              type: "other",
              reason: AUTOMOUNTER_PATH_REASON,
            },
          },
        };
  }
  let denied = [];
  let asked = [];
  for (let inputPath of paths) {
    let permissionDecisionForPath = readPermissionDecisionForPath(
      anchorPathUnnormalized(inputPath),
      toolPermissionContext,
    );
    if (permissionDecisionForPath.behavior === "deny")
      denied.push({
        path: inputPath,
        decision: permissionDecisionForPath,
      });
    else if (permissionDecisionForPath.behavior === "ask")
      asked.push({
        path: inputPath,
        decision: permissionDecisionForPath,
      });
  }
  let [deniedEntry] = denied;
  if (deniedEntry)
    return {
      layer: "path-deny",
      ...deniedEntry,
    };
  let found = asked.find(
    (askEntry) =>
      askEntry.decision.decisionReason?.type === "rule" &&
      askEntry.decision.decisionReason.rule.ruleBehavior === "ask",
  );
  if (found)
    return {
      layer: "path-rule-ask",
      ...found,
    };
  let bareAskRule = findAskRuleForTool(
    toolPermissionContext,
    READ_PATH_PROBE,
    askedBashRules(toolPermissionContext).filter((rule) => !NARROWING_RULE_SOURCES_2.includes(rule.source)),
  );
  if (bareAskRule !== null)
    return {
      layer: "bare-ask",
      rule: bareAskRule,
    };
  let [askedEntry] = asked;
  if (askedEntry)
    return {
      layer: "path-mode-ask",
      ...askedEntry,
    };
  return {
    layer: "allow",
  };
}
//@ chunk-a2q0x549.js:274052-274112 layout
function toolPoolCannotRead(toolName, callContext) {
  return callContext.tools.some((tool) => matchesToolName(tool, toolName)) && !poolCanRead(callContext);
}
//@ chunk-a2q0x549.js:274112-274266 facade-majority
/**
 * 工具池里是否有能读文件的工具（Read，或另一读类工具）。
 */
function poolCanRead(callContext) {
  let { tools } = callContext;
  return (
    tools.some((tool) => matchesToolName(tool, READ)) ||
    (tools.some((tool) => matchesToolName(tool, REPL_TOOL_NAME)) &&
      !(
        codeModeAccepted() &&
        callContext.primitiveToolGrant !== undefined &&
        !callContext.primitiveToolGrant.has(READ)
      ))
  );
}
//@ chunk-a2q0x549.js:274266-274313 facade-majority
function readAutoAllowedForMutation(toolName, absolutePath, callContext, toolPermissionContext) {
  return (
    !toolPoolCannotRead(toolName, callContext) &&
    readWouldBeAutoAllowedForPath(absolutePath, toolPermissionContext)
  );
}
//@ chunk-a2q0x549.js:274313-274364 layout
function playfulLobsterEnabled() {
  return getFeatureValue_CACHED_MAY_BE_STALE("tengu_playful_lobster", true);
}
//@ chunk-a2q0x549.js:274364-274393 layout
class LoggedPathCache {
  loggedPaths = new Set();
}
//@ chunk-a2q0x549.js:274393-274418 layout
var loggedPathCacheSlot; // deferred: uses LoggedPathCache of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-a2q0x549.js:274393", () => {
  loggedPathCacheSlot = new HostScoped(() => new LoggedPathCache());
});
//@ chunk-a2q0x549.js:274418-274467 layout
function loggedPaths() {
  return loggedPathCacheSlot.of(getRootSession().host).loggedPaths;
}
//@ chunk-a2q0x549.js:274467-274478 layout
var MAX_LOGGED_PATHS = 256;
//@ chunk-a2q0x549.js:274478-274532 layout
function markPathLoggedOnce(key) {
  let logged = loggedPaths();
  return logged.size < MAX_LOGGED_PATHS && !logged.has(key);
}
//@ chunk-a2q0x549.js:274532-274680 layout
function logPlayfulLobsterOnce(absolutePath, step, mode) {
  let key = `${mode}:${absolutePath}`;
  if (!markPathLoggedOnce(key)) return;
  loggedPaths().add(key);
  logEvent("tengu_playful_lobster_fired", {
    step: fromEnum(step),
    mode: lit("shadow"),
    permissionMode: fromEnum(mode),
  });
}
//@ chunk-a2q0x549.js:274680-274767 layout
function hasMultipleHardLinks(absolutePath) {
  try {
    let stats = getFsImplementation().statSync(absolutePath);
    return stats.isFile() && stats.nlink > 1;
  } catch {
    return false;
  }
}
//@ chunk-a2q0x549.js:274767-276932 facade-majority (2.1.88 match: checkReadPermissionForTool, 0.566)
/**
 * 读权限判定：1 Read deny 规则（每种拼写）→ deny；2 记忆暂停时读记忆 → deny；3 restricted / blockReadsOutsideWorkingDirectories 下工作目录外的读 → deny 或 ask；路径无法解析 → deny；4 dYe 额外检查；5 Read ask 规则 → ask；6 若同一路径可编辑（checkWritePermissionForTool 以非 plan 上下文判定为 allow）则读也允许；7 在工作目录内 → allow；8 内部可读路径（checkReadableInternalPath）；9 Read allow 规则；否则 ask 并给出 addRules/addDirectories 建议。
 */
function checkReadPermissionForTool(tool, input, toolPermissionContext, precomputedPathsToCheck) {
  if (typeof tool.getPath !== "function")
    return {
      behavior: "ask",
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    };
  let path = tool.getPath(input);
  let pathsToCheck = precomputedPathsToCheck ?? walkPermissionCheckPaths(path);
  let spellings = pathsToCheck.spellings;
  let absolutePathCache;
  let getAbsolutePath = () => (absolutePathCache ??= expandPath(path));
  let implicitReadCache;
  let shouldRecordImplicitRead = () => {
    if (implicitReadCache === undefined)
      try {
        implicitReadCache =
          playfulLobsterEnabled() &&
          markPathLoggedOnce(`${toolPermissionContext.mode}:${getAbsolutePath()}`) &&
          hasMultipleHardLinks(getAbsolutePath());
      } catch {
        implicitReadCache = false;
      }
    return implicitReadCache;
  };
  for (let pathToCheck of spellings) {
    let denyRule = matchingRuleForInput(pathToCheck, toolPermissionContext, "read", "deny");
    if (denyRule)
      return {
        behavior: "deny",
        message: `Permission to read ${encodeControlChars(path)} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: denyRule,
        },
      };
  }
  if (isAutoMemoryHeldForSession()) {
    let expandedPath = expandPathOrNull(path);
    if (isHeldMemoryPath(expandedPath === null ? spellings : [...spellings, expandedPath]))
      return MEMORY_PAUSED_READ_DENIAL;
  }
  if (toolPermissionContext.restricted || toolPermissionContext.blockReadsOutsideWorkingDirectories) {
    let outsideDecision = denyIfOutsideWorkingDirs(
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
      readBlockExemptPaths(toolPermissionContext),
    );
    if (outsideDecision) {
      if (
        toolPermissionContext.servedCall === true &&
        !toolPermissionContext.restricted &&
        outsideDecision.behavior === "deny" &&
        !blocksReadsOutsideWorkingDirs()
      )
        return {
          behavior: "ask",
          message: outsideDecision.message,
          decisionReason: {
            type: "safetyCheck",
            reason: OUTSIDE_READS_BLOCKED_DENY_REASON,
            classifierApprovable: false,
            circuitBreaker: "outsideReadsBlocked",
          },
        };
      return outsideDecision;
    }
  } else if (pathsToCheck.unresolved) return denyUnresolvablePath("read from", path);
  let denyRule = checkReadNetworkPathSafety(tool, input, toolPermissionContext, spellings);
  if (denyRule) return denyRule;
  for (let pathToCheck of spellings) {
    let askRule = matchingRuleForInput(pathToCheck, toolPermissionContext, "read", "ask");
    if (askRule)
      return {
        behavior: "ask",
        message: `Claude requested permissions to read from ${encodeControlChars(path)}, but you haven't granted it yet.`,
        decisionReason: {
          type: "rule",
          rule: askRule,
        },
      };
  }
  let editCheckContext =
    toolPermissionContext.mode === "plan" || toolPermissionContext.blockWritesOutsideWorkingDirectories
      ? {
          ...toolPermissionContext,
          ...(toolPermissionContext.mode === "plan" && {
            mode: "default",
          }),
          blockWritesOutsideWorkingDirectories: false,
        }
      : toolPermissionContext;
  let editResult = checkWritePermissionForTool(tool, input, editCheckContext, pathsToCheck);
  if (editResult.behavior === "allow") {
    if (editResult.decisionReason?.type === "mode" && shouldRecordImplicitRead())
      logPlayfulLobsterOnce(getAbsolutePath(), "editImpliesRead", toolPermissionContext.mode);
    return editResult;
  }
  if (pathInAllowedWorkingPath(path, toolPermissionContext, spellings)) {
    if (shouldRecordImplicitRead())
      logPlayfulLobsterOnce(getAbsolutePath(), "workingDir", toolPermissionContext.mode);
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "mode",
        mode: "default",
      },
    };
  }
  let absolutePath = getAbsolutePath();
  let internalReadResult = checkReadableInternalPath(absolutePath, input, spellings, {
    restricted: toolPermissionContext.restricted,
    blockOutsideReads: toolPermissionContext.blockReadsOutsideWorkingDirectories,
  });
  if (
    internalReadResult.behavior !== "passthrough" &&
    internalPathDecisionStands(internalReadResult, toolPermissionContext)
  )
    return internalReadResult;
  let allowRule = matchingAllowRuleForAllPaths(spellings, toolPermissionContext, "read");
  if (allowRule)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: allowRule,
      },
    };
  return {
    behavior: "ask",
    suggestions: generateSuggestions(path, "read", toolPermissionContext, spellings),
    ...buildOutsideWorkingDirAsk("read from", path, pathsToCheck, toolPermissionContext),
  };
}
//@ chunk-a2q0x549.js:276932-279035 facade-majority (2.1.88 match: checkWritePermissionForTool, 0.689)
/**
 * 写权限判定：1 j9r 早期判定（deny 规则、受保护路径等）；2 会话里允许的 skill 目录规则；3 Edit ask 规则 → ask；4 内部可编辑路径（计划文件、scratchpad、记忆…）→ allow 或 deny；5 checkPathSafetyForAutoEdit 不安全 → ask（建议限定 skill 规则或 acceptEdits）；6 plan 模式 → ask；7 acceptEdits 且在工作目录内 → allow；8 Edit allow 规则 → allow；9 其他 → ask（工作目录外附 addDirectories 建议，经符号链接落到目录外时说明）。
 */
function checkWritePermissionForTool(tool, input, toolPermissionContext, precomputedPathsToCheck) {
  if (typeof tool.getPath !== "function")
    return {
      behavior: "ask",
      message: `Claude requested permissions to use ${tool.name}, but you haven't granted it yet.`,
    };
  let path = tool.getPath(input);
  let pathsToCheck = precomputedPathsToCheck ?? walkPermissionCheckPaths(path);
  let spellings = pathsToCheck.spellings;
  let absolutePathForEdit = expandPath(path);
  let earlyDecision = writeDenyPrefix(path, pathsToCheck, absolutePathForEdit, toolPermissionContext);
  if (earlyDecision !== undefined) return earlyDecision;
  let sessionSkillRules = (toolPermissionContext.alwaysAllowRules.session ?? []).filter((ruleString) => {
    let ruleContent = parseRuleString(ruleString).ruleContent;
    return (
      isSkillDirGlob(ruleContent) &&
      !spellings.some((spelling) => hasNestedClaudeDirBelowRuleRoot(spelling, ruleContent ?? ""))
    );
  });
  let sessionSkillRule =
    sessionSkillRules.length > 0
      ? matchingAllowRuleForAllPaths(
          spellings,
          {
            ...toolPermissionContext,
            alwaysAllowRules: {
              session: sessionSkillRules,
            },
          },
          "edit",
        )
      : null;
  if (
    sessionSkillRule &&
    toolPermissionContext.mode !== "plan" &&
    !spellings.some((spelling) =>
      hasSuspiciousWindowsPathPattern(spelling, toolPermissionContext.trustedNetworkDirectories),
    ) &&
    !spellings.some((spelling) => isInGlobalClaudeFolder(spelling) > 1)
  )
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: sessionSkillRule,
      },
    };
  for (let pathToCheck of spellings) {
    let askRule = matchingRuleForInput(pathToCheck, toolPermissionContext, "edit", "ask");
    if (askRule)
      return {
        behavior: "ask",
        message: `Claude requested permissions to write to ${encodeControlChars(path)}, but you haven't granted it yet.`,
        decisionReason: {
          type: "rule",
          rule: askRule,
        },
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
    undefined,
    remoteConfigEditExemptionApplies(toolPermissionContext),
    toolPermissionContext.trustedNetworkDirectories,
  );
  if (!safety.safe) {
    let skillScope =
      toolPermissionContext.restricted ||
      spellings.some(
        (spelling) =>
          isInGlobalClaudeFolder(spelling) > 1 ||
          hasSuspiciousWindowsPathPattern(spelling, toolPermissionContext.trustedNetworkDirectories),
      )
        ? null
        : getClaudeSkillScope(path);
    let safetySuggestions = skillScope
      ? [
          {
            type: "addRules",
            rules: [
              {
                toolName: EDIT,
                ruleContent: skillScope.pattern,
              },
            ],
            behavior: "allow",
            destination: "session",
          },
        ]
      : generateSuggestions(path, "write", toolPermissionContext, spellings);
    let isInWorkingDir = sensitiveWriteRedirect(path, pathsToCheck, toolPermissionContext);
    let askMessage =
      isInWorkingDir === null ? safety.message : `${safety.message} ${isInWorkingDir.sentence}.`;
    return {
      behavior: "ask",
      message: askMessage,
      suggestions: safetySuggestions,
      ...(isInWorkingDir !== null && {
        blockedPath: isInWorkingDir.landing,
      }),
      decisionReason: {
        type: "safetyCheck",
        reason: askMessage,
        ...safetyCheckReasonFields(safety, toolPermissionContext.restricted),
        ...(isInWorkingDir?.personOnly && {
          classifierApprovable: false,
        }),
      },
    };
  }
  if (toolPermissionContext.mode === "plan")
    return {
      behavior: "ask",
      message: `Cannot write to ${encodeControlChars(path)} while in plan mode.`,
      decisionReason: {
        type: "mode",
        mode: "plan",
      },
    };
  let inWorkingDir = pathInAllowedWorkingPath(path, toolPermissionContext, spellings);
  if (toolPermissionContext.mode === "acceptEdits" && inWorkingDir)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "mode",
        mode: toolPermissionContext.mode,
      },
    };
  let allowRule =
    (inWorkingDir ? findAllowRuleForTool(toolPermissionContext, tool.name) : null) ??
    matchingAllowRuleForAllPaths(spellings, toolPermissionContext, "edit");
  if (allowRule)
    return {
      behavior: "allow",
      updatedInput: input,
      decisionReason: {
        type: "rule",
        rule: allowRule,
      },
    };
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
//@ chunk-a2q0x549.js:279035-279403 facade-majority
/**
 * 写入目标本身是符号链接时拒绝，提示改写链接目标路径。
 */
function leafSymlinkWriteRefusal(path, pathsToCheck) {
  if (!pathsToCheck.leafIsSymlink) return null;
  let linkTarget = pathsToCheck.unresolved
    ? "a target that could not be determined"
    : truncatePathForDisplay(pathsToCheck.landing);
  return {
    behavior: "deny",
    message: `Refusing to write ${truncatePathForDisplay(path)}: it is a symbolic link. Write to the link's target path instead: ${linkTarget}.`,
    decisionReason: {
      type: "other",
      reason: "Write target is a symbolic link",
    },
    ...(!pathsToCheck.unresolved && {
      blockedPath: pathsToCheck.landing,
    }),
  };
}
//@ chunk-a2q0x549.js:279403-279578 facade-majority
/**
 * 请求路径经符号链接后落点与原拼写不同时，返回 {landing, landingOutside, spellingInside, carriedOut}（carriedOut=原拼写在工作目录内而落点在外）。
 */
function symlinkRedirect(pathsToCheck, toolPermissionContext, extraDirs) {
  let landing = symlinkLanding(pathsToCheck);
  if (landing === null) return null;
  let isInsideWorkingPath = (candidate) =>
    pathInAllowedWorkingPath(candidate, toolPermissionContext, [candidate], extraDirs);
  let landingOutside = !isInsideWorkingPath(landing);
  let spellingInside = isInsideWorkingPath(pathsToCheck.requested);
  return {
    landing,
    landingOutside,
    spellingInside,
    carriedOut: spellingInside && landingOutside,
  };
}
//@ chunk-a2q0x549.js:279578-279676 facade-majority
/**
 * 若路径经符号链接解析后的落点与请求路径不同（按规范键比较），返回落点；未解析或相同返回 null。
 */
function symlinkLanding(pathsToCheck) {
  if (pathsToCheck.unresolved) return null;
  return canonicalPathKey(pathsToCheck.landing) === canonicalPathKey(pathsToCheck.requested)
    ? null
    : pathsToCheck.landing;
}
//@ chunk-a2q0x549.js:279676-279713 layout
function canonicalPathKey(spelling) {
  return normalizeTrustedSymlink(identity(resolve(spelling)));
}
//@ chunk-a2q0x549.js:279713-279926 facade-majority
/**
 * 写目标经符号链接重定向时生成说明：返回 {landing, sentence, personOnly}；请求路径本身安全或已实际落到目录外时 personOnly=true，要求必须由人确认。
 */
function sensitiveWriteRedirect(path, pathsToCheck, toolPermissionContext) {
  let redirect = symlinkRedirect(pathsToCheck, toolPermissionContext);
  if (redirect === null) return null;
  let safe = checkPathSafetyForAutoEdit(
    pathsToCheck.requested,
    [pathsToCheck.requested],
    undefined,
    remoteConfigEditExemptionApplies(toolPermissionContext),
    toolPermissionContext.trustedNetworkDirectories,
  ).safe;
  return {
    landing: redirect.landing,
    sentence: symlinkRedirectSentence(path, redirect),
    personOnly: safe || redirect.carriedOut,
  };
}
//@ chunk-a2q0x549.js:279926-280022 facade-majority
/**
 * 路径是否是只能由人改的内部文件（checkEditableInternalPath 精确匹配为 deny），供 Bash/PowerShell 路径校验使用。
 */
function hardDeniedAsSpelled(path, toolPermissionContext) {
  return (
    checkEditableInternalPath(path, {}, [path], {
      restricted: toolPermissionContext.restricted,
      exactOnly: true,
    }).behavior === "deny"
  );
}
//@ chunk-a2q0x549.js:280022-280142 facade-majority
/**
 * 拼出“X 解析到 Y”的符号链接说明句；落点在工作目录外时追加“which is outside the allowed working directories”。
 */
function symlinkRedirectSentence(path, redirect) {
  return `${formatSymlinkResolution(path, redirect.landing)}${redirect.landingOutside ? ", which is outside the allowed working directories" : ""}`;
}
//@ chunk-a2q0x549.js:280142-280531 layout
function buildOutsideWorkingDirAsk(verb, path, pathsToCheck, toolPermissionContext) {
  let askMessage = `Claude requested permissions to ${verb} ${encodeControlChars(path)}, but you haven't granted it yet.`;
  let redirect = symlinkRedirect(pathsToCheck, toolPermissionContext);
  if (redirect === null || !redirect.carriedOut)
    return {
      message: askMessage,
      decisionReason: {
        type: "workingDir",
        reason: OUTSIDE_WORKING_DIRECTORIES_ASK_REASON,
      },
    };
  let redirectSentence = symlinkRedirectSentence(path, redirect);
  return {
    message: `${askMessage} ${redirectSentence}.`,
    blockedPath: redirect.landing,
    decisionReason:
      verb === "write to"
        ? {
            type: "safetyCheck",
            reason: redirectSentence,
            classifierApprovable: false,
          }
        : {
            type: "workingDir",
            reason: redirectSentence,
          },
  };
}
//@ chunk-a2q0x549.js:280531-280800 layout
function denyUnresolvablePath(verb, path) {
  return {
    behavior: "deny",
    message: `Refusing to ${verb === "write to" ? "write" : "read"} ${truncatePathForDisplay(path)}: where it leads on disk could not be determined (a link on the way could not be examined, or the links do not resolve).`,
    decisionReason: {
      type: "other",
      reason: unresolvablePathMessage(path),
    },
  };
}
//@ chunk-a2q0x549.js:280800-280873 layout
function formatSymlinkResolution(path, landing) {
  return `${truncatePathForDisplay(path)} resolves through a symlink to ${truncatePathForDisplay(landing)}`;
}
//@ chunk-a2q0x549.js:280873-281295 facade-majority (2.1.88 match: generateSuggestions, 0.949)
/**
 * 生成权限对话框的建议更新：工作目录外的读 → 对父目录的 Read 会话规则；写/创建 → 可切到 acceptEdits 时建议 setMode，目录外再加 addDirectories；其他只给 setMode 建议。
 */
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
      .filter((suggestion) => suggestion !== undefined);
  }
  let shouldSuggestAcceptEdits = acceptEditsSuggestionApplies(toolPermissionContext);
  if (operationType === "write" || operationType === "create") {
    let updates = shouldSuggestAcceptEdits
      ? [
          {
            type: "setMode",
            mode: "acceptEdits",
            destination: "session",
          },
        ]
      : [];
    if (isOutsideWorkingDir) {
      let dirPath = getDirectoryForPath(filePath);
      let dirsToAdd = getPathsForPermissionCheck(dirPath);
      updates.push({
        type: "addDirectories",
        directories: dirsToAdd,
        destination: "session",
      });
    }
    return updates;
  }
  return shouldSuggestAcceptEdits
    ? [
        {
          type: "setMode",
          mode: "acceptEdits",
          destination: "session",
        },
      ]
    : [];
}
//@ chunk-a2q0x549.js:281295-281487 facade-majority
/**
 * 把内部路径的真实拼写还原成规范根：若路径以 cwd、原始 cwd、配置目录、家目录等根的某个解析拼写开头，就换回原根；否则按可信符号链接改写。
 */
function normalizeInternalPathRoot(absolutePath) {
  for (let root of [
    getCwd(),
    getOriginalCwd(),
    getProjectRoot(),
    getClaudeConfigDirOrNull(),
    getMemoryBaseDirOrNull(),
    homedir(),
  ]) {
    if (root === null) continue;
    for (let resolvedRoot of spellingsForWorkingDir(root)) {
      if (resolvedRoot === root) continue;
      if (absolutePath === resolvedRoot || absolutePath.startsWith(resolvedRoot + sep_2))
        return root + absolutePath.slice(resolvedRoot.length);
    }
  }
  return normalizeTrustedSymlink(absolutePath);
}
//@ chunk-a2q0x549.js:281487-281753 layout (2.1.88 match: validateShellMetacharacters, 1)
/**
 * 对一组路径/项逐个调用检查函数（passthrough 时再试替代形式）：任一 deny 返回 deny，有非 allow 返回 passthrough，全部 allow 返回第一个 allow。
 */
function requireAllAllowed(pathsToCheck, checkPath, context) {
  let firstAllow;
  for (let path of pathsToCheck) {
    let result = checkPath(path, context);
    if (result.behavior === "passthrough") {
      let normalizedPath = normalizeInternalPathRoot(path);
      if (normalizedPath !== path) result = checkPath(normalizedPath, context);
    }
    if (result.behavior === "deny") return result;
    if (result.behavior !== "allow")
      return {
        behavior: "passthrough",
        message: "",
      };
    firstAllow ??= result;
  }
  return (
    firstAllow ?? {
      behavior: "passthrough",
      message: "",
    }
  );
}
//@ chunk-a2q0x549.js:281753-281827 layout
function isHeldMemoryPath(paths) {
  return (
    isAutoMemoryHeldForSession() &&
    (hasNoAutoMemPath() ||
      paths.some(
        (inputPath) =>
          isAutoMemPath(inputPath + sep_2) || isAutoMemPath(normalizeInternalPathRoot(inputPath) + sep_2),
      ))
  );
}
//@ chunk-a2q0x549.js:281827-281934 facade-majority
/**
 * 把 safetyCheck 类型的拒绝原因改成 other（保留 reason，标 wasSafetyCheck），让它作为 ask 传播时不再带安全检查的熔断语义。
 */
function untypeDenyReasonForAskPropagation(decisionReason) {
  if (decisionReason?.type !== "safetyCheck") return decisionReason;
  return {
    type: "other",
    reason: decisionReason.reason,
    wasSafetyCheck: true,
  };
}
//@ chunk-a2q0x549.js:281934-282001 facade-majority
/**
 * 内部路径给出的结论是否成立：服务端代执行（servedCall）的调用不接受内部路径的 allow，其余都成立。
 */
function internalPathDecisionStands(decision, toolPermissionContext) {
  return !(toolPermissionContext.servedCall === true && decision.behavior === "allow");
}
//@ chunk-a2q0x549.js:282001-283535 facade-majority (2.1.88 match: checkEditableInternalPath, 0.576)
/**
 * 内部路径写判定：拒绝写宿主凭证文件、配置目录 jobs/daemon/shell-snapshots/session-env/adopt.json、seed-admin、profile store、settings-review store、记忆暂停时的记忆文件；放行（返回 allow，denySpeculation 包装）当前会话计划文件、workflow 脚本、scratchpad、后台会话 tmp、agent/auto memory 的 .md、.claude/launch.json；否则 passthrough。
 */
function checkEditableInternalPath(absolutePath, input, pathsToCheck, options) {
  if (isDiskless()) return NO_CONFIG_DIR_WRITE_DENIAL;
  if (pathsToCheck && pathsToCheck.length > 0) {
    let inputPath = pathsToCheck.map(normalizeMsysDrivePath);
    if (inputPath.some(isHostCredsFilePath)) return HOST_CREDS_WRITE_DENIAL;
    let pathCache = new Map();
    let denial = checkConfigDirInternalWrite(inputPath, "exact", pathCache);
    if (denial !== undefined) return denial;
    if (inputPath.some(isSeedAdminPath)) return SEED_ADMIN_WRITE_DENIAL;
    if (inputPath.some(isProfileStorePath)) return PROFILE_STORE_WRITE_DENIAL;
    if (inputPath.some(isSettingsReviewStorePath)) return SETTINGS_REVIEW_STORE_WRITE_DENIAL;
    let normalizedPath = noConfigDirWriteDenialForRead(inputPath);
    if (normalizedPath !== undefined) return normalizedPath;
    let planDenial = noConfigDirWriteDenialForPlan(inputPath);
    if (planDenial !== undefined) return planDenial;
    if (options?.exactOnly !== true) {
      let widestDenial = checkConfigDirInternalWrite(inputPath, "widest", pathCache);
      if (widestDenial !== undefined) return widestDenial;
    }
    return requireAllAllowed(
      pathsToCheck,
      (spelling, spellingInput) => checkEditableInternalPath(spelling, spellingInput, undefined, options),
      input,
    );
  }
  let normalizedPath = normalize_2(absolutePath);
  let normalizedMsysPath = normalize_2(normalizeMsysDrivePath(absolutePath));
  let pathCache = new Map();
  let configDirDenial =
    checkConfigDirInternalWrite([normalizedMsysPath], "exact", pathCache) ??
    (options?.exactOnly === true
      ? undefined
      : checkConfigDirInternalWrite([normalizedMsysPath], "widest", pathCache));
  if (configDirDenial !== undefined) return configDirDenial;
  if (getPlanFilePath_2(normalizedPath))
    return allowWithReason(input, "Plan files for current session are allowed for writing");
  if (!options?.restricted && !options?.blockOutsideWrites && isWorkflowScriptPath(normalizedPath))
    return allowWithReason(input, "Workflow script files for current session are allowed for writing");
  if (isScratchpadPath(normalizedPath))
    return allowWithReason(input, "Scratchpad files for current session are allowed for writing");
  if (isBgJobTmpPath(normalizedPath))
    return allowWithReason(input, "Job tmp/ subtree for current bg session is allowed for writing");
  if (
    !options?.restricted &&
    !options?.blockOutsideWrites &&
    normalizedPath.endsWith(".md") &&
    isInsideAgentMemoryDir(normalizedPath)
  )
    return allowWithReason(input, "Agent memory files are allowed for writing");
  if (
    (mayBeAutoMemPath(normalizedPath) || mayBeAutoMemPath(normalizedMsysPath)) &&
    isAutoMemoryHeldForSession()
  )
    return MEMORY_PAUSED_WRITE_DENIAL;
  if (
    !options?.restricted &&
    (!hasAutoMemPathOverride() || options?.blockOutsideWrites) &&
    normalizedPath.endsWith(".md") &&
    ((isAutoMemPathSafeForCarveout(normalizedPath) &&
      !(options?.blockOutsideWrites && isAutoMemPathFromRepoSettings())) ||
      isOwnProjectAutoMemPathSafeForCarveout(normalizedPath))
  )
    return allowWithReason(input, AUTO_MEM_WRITE_ALLOW_REASON);
  if (!options?.restricted && normalizedPath === join(getOriginalCwd(), ".claude", "launch.json"))
    return allowWithReason(input, "Preview launch config is allowed for writing");
  if (isSeedAdminPath(normalizedMsysPath)) return SEED_ADMIN_WRITE_DENIAL;
  if (isHostCredsFilePath(normalizedMsysPath)) return HOST_CREDS_WRITE_DENIAL;
  if (isProfileStorePath(normalizedMsysPath)) return PROFILE_STORE_WRITE_DENIAL;
  if (isSettingsReviewStorePath(normalizedMsysPath)) return SETTINGS_REVIEW_STORE_WRITE_DENIAL;
  let targetForms = noConfigDirWriteDenialForRead([absolutePath, normalizedPath, normalizedMsysPath]);
  if (targetForms !== undefined) return targetForms;
  let np = noConfigDirWriteDenialForPlan([absolutePath, normalizedPath, normalizedMsysPath]);
  if (np !== undefined) return np;
  return {
    behavior: "passthrough",
    message: "",
  };
}
//@ chunk-a2q0x549.js:283535-285258 facade-majority (2.1.88 match: checkReadableInternalPath, 0.704)
/**
 * 内部路径读判定：放行项目目录、计划文件、工具结果文件、scratchpad、后台会话 tmp、项目临时目录、agent/auto memory、tasks/teams、（readBlockFence 时）用户 CLAUDE.md 与 skills/plugins/rules/agents/commands、内置 skill 参考文件；记忆暂停时拒绝读记忆；否则 passthrough。
 */
function checkReadableInternalPath(absolutePath, input, pathsToCheck, options) {
  if (isDiskless())
    return isAutoMemoryHeldForSession()
      ? MEMORY_PAUSED_READ_DENIAL
      : {
          behavior: "passthrough",
          message: "",
        };
  if (pathsToCheck && pathsToCheck.length > 0)
    return requireAllAllowed(
      pathsToCheck,
      (spelling, spellingInput) => checkReadableInternalPath(spelling, spellingInput, undefined, options),
      input,
    );
  let normalizedPath = normalize_2(absolutePath);
  if (mayBeAutoMemPath(normalizedPath) && isAutoMemoryHeldForSession()) return MEMORY_PAUSED_READ_DENIAL;
  if (
    !options?.restricted &&
    isSessionMemoryPath(normalizedPath, options?.blockOutsideReads ? getOriginalCwd() : undefined)
  )
    return allowWithReason(input, "Project directory files are allowed for reading");
  if (getPlanFilePath_2(normalizedPath))
    return allowWithReason(input, "Plan files for current session are allowed for reading");
  let toolResultsDir_2 = toolResultsDir();
  let toolResultsDirWithSep = toolResultsDir_2.endsWith(sep_2) ? toolResultsDir_2 : toolResultsDir_2 + sep_2;
  if (normalizedPath === toolResultsDir_2 || normalizedPath.startsWith(toolResultsDirWithSep))
    return allowWithReason(input, "Tool result files are allowed for reading");
  if (isScratchpadPath(normalizedPath))
    return allowWithReason(input, "Scratchpad files for current session are allowed for reading");
  if (isBgJobTmpPath(normalizedPath))
    return allowWithReason(input, "Job tmp/ subtree for current bg session is allowed for reading");
  if (normalizedPath.startsWith(sessionTempDirRealpath()))
    return allowWithReason(input, "Project temp directory files are allowed for reading");
  let isRestricted = options?.remoteSurface || options?.restricted;
  let blocksOutside = isRestricted || options?.blockOutsideReads;
  if (!blocksOutside && isInsideAgentMemoryDir(normalizedPath))
    return allowWithReason(input, "Agent memory files are allowed for reading");
  if (
    !isRestricted &&
    (isAutoMemPathSafeForCarveout(normalizedPath) ||
      (options?.searchRootFence && isAutoMemPathSafeForCarveout(normalizedPath + sep_2))) &&
    !(options?.blockOutsideReads && isAutoMemPathFromRepoSettings())
  )
    return allowWithReason(input, "auto memory files are allowed for reading");
  let tasksPrefix = join(getClaudeConfigDir(), "tasks") + sep_2;
  if (
    !blocksOutside &&
    (normalizedPath === tasksPrefix.slice(0, -1) || normalizedPath.startsWith(tasksPrefix))
  )
    return allowWithReason(input, "Task files are allowed for reading");
  let teamsPrefix = join(getClaudeConfigDir(), "teams") + sep_2;
  if (
    !blocksOutside &&
    (normalizedPath === teamsPrefix.slice(0, -1) || normalizedPath.startsWith(teamsPrefix))
  )
    return allowWithReason(input, "Team files are allowed for reading");
  if (options?.readBlockFence && !options.restricted) {
    if (normalizedPath === join(getClaudeConfigDir(), "CLAUDE.md"))
      return allowWithReason(input, "The user memory file is allowed for reading");
    for (let subdir of ["skills", "plugins", "rules", "agents", "commands"]) {
      let prefix = join(getClaudeConfigDir(), subdir) + sep_2;
      if (normalizedPath === prefix.slice(0, -1) || normalizedPath.startsWith(prefix))
        return allowWithReason(input, `User ${subdir} files are allowed for reading`);
    }
  }
  if (!options?.remoteSurface && normalizedPath.startsWith(getBundledSkillsRoot() + sep_2))
    return allowWithReason(input, "Bundled skill reference files are allowed for reading");
  return {
    behavior: "passthrough",
    message: "",
  };
}
//@ chunk-a2q0x549.js:285258-285354 placement
/**
 * 权限结果 {behavior:"allow", updatedInput, decisionReason:{type:"other", reason}}。旧版名 denySpeculation 为错配，属于权限文件系统检查。
 */
function allowWithReason(updatedInput, reason) {
  return {
    behavior: "allow",
    updatedInput,
    decisionReason: {
      type: "other",
      reason,
    },
  };
}
//@ chunk-a2q0x549.js:285354-285473 layout
function buildSafetyCheckAsk(message, reason) {
  return {
    behavior: "ask",
    message,
    decisionReason: {
      type: "safetyCheck",
      classifierApprovable: false,
      reason,
    },
  };
}
//@ chunk-a2q0x549.js:285473-285678 facade-majority
/**
 * 是否为读闸门产生的安全询问：behavior 为 ask，且原因是 other，或是不可由分类器批准、也没有熔断标签的 safetyCheck。
 */
function isReadGateSafetyAsk(decision) {
  return (
    decision?.behavior === "ask" &&
    (decision.decisionReason?.type === "other" ||
      (decision.decisionReason?.type === "safetyCheck" &&
        decision.decisionReason.classifierApprovable === false &&
        decision.decisionReason.circuitBreaker === undefined))
  );
}
//@ chunk-a2q0x549.js:285678-286022 layout
/**
 * 用户 skills 目录（配置目录下 skills，含真实路径）的大小写折叠拼写列表，按会话缓存。
 */
function getUserSkillsBaseSpellings() {
  let sessionPathsCache = getSessionPathsCache();
  if (sessionPathsCache.userSkillsBaseSpellingsFolded !== undefined)
    return sessionPathsCache.userSkillsBaseSpellingsFolded;
  let fsImplementation = getFsImplementation();
  let spellings = new Set();
  let addSpellings = (path) => {
    spellings.add(normalizeCaseForComparison(path));
    try {
      spellings.add(normalizeCaseForComparison(fsImplementation.realpathSync(path)));
    } catch {}
  };
  let expandedConfigDir = expandPath(getClaudeConfigDir());
  addSpellings(join(expandedConfigDir, "skills"));
  try {
    addSpellings(join(fsImplementation.realpathSync(expandedConfigDir), "skills"));
  } catch {}
  sessionPathsCache.userSkillsBaseSpellingsFolded = [...spellings];
  return sessionPathsCache.userSkillsBaseSpellingsFolded;
}
//@ chunk-a2q0x549.js:286022-286453 facade-majority
/**
 * 写判定的前置拒绝：先查内部硬拒绝；restricted 或 blockWritesOutsideWorkingDirectories 下检查工作目录约束；阻写模式下可能是设置文件则直接 deny；最后交给 yh 做剩余前置检查。
 */
function writeDenyPrefix(path, pathsToCheck, absolutePath, toolPermissionContext) {
  let editDenyForSpellings = findEditDenyForSpellings(path, pathsToCheck.spellings, toolPermissionContext);
  if (editDenyForSpellings !== undefined) return editDenyForSpellings;
  if (toolPermissionContext.restricted || toolPermissionContext.blockWritesOutsideWorkingDirectories) {
    let outsideDecision = denyIfOutsideWorkingDirs(
      path,
      pathsToCheck,
      toolPermissionContext,
      () => editableInternalPathDecision(absolutePath, pathsToCheck.spellings, toolPermissionContext),
      toolPermissionContext.restricted ? RESTRICTED_MODE_CONSTRAINT : OUTSIDE_WRITES_CONSTRAINT,
      toolPermissionContext.blockWritesOutsideWorkingDirectories
        ? blockReadsWorkingDirectories(toolPermissionContext)
        : allWorkingDirectories(toolPermissionContext),
    );
    if (outsideDecision) return outsideDecision;
  }
  if (
    toolPermissionContext.blockWritesOutsideWorkingDirectories &&
    settingsFileCertainty(pathsToCheck.spellings) !== "none"
  )
    return {
      behavior: "deny",
      message: encodeControlChars(`${path}: ${SETTINGS_WRITES_BLOCKED_DENY_REASON}`),
      decisionReason: {
        type: "other",
        reason: SETTINGS_WRITES_BLOCKED_DENY_REASON,
      },
    };
  return getInternalWriteDenial(path, pathsToCheck, absolutePath);
}
//@ chunk-a2q0x549.js:286453-286643 affinity
function findEditDenyForSpellings(path, spellings, toolPermissionContext) {
  for (let spelling of spellings) {
    let denyRule = matchingRuleForInput(spelling, toolPermissionContext, "edit", "deny");
    if (denyRule)
      return {
        behavior: "deny",
        message: `Permission to edit ${encodeControlChars(path)} has been denied.`,
        decisionReason: {
          type: "rule",
          rule: denyRule,
        },
      };
  }
  return;
}
//@ chunk-a2q0x549.js:286643-287080 affinity
/**
 * 内部写路径的硬拒绝：无磁盘模式、记忆暂停、配置目录内部文件、种子管理/宿主凭据/档案/设置审阅存储，以及其他内部禁区；路径无法解析时拒绝。
 */
function getInternalWriteDenial(path, pathsToCheck, absolutePath) {
  if (isDiskless()) return NO_CONFIG_DIR_WRITE_DENIAL;
  if (isHeldMemoryPath([...pathsToCheck.spellings, absolutePath])) return MEMORY_PAUSED_WRITE_DENIAL;
  let pathCache = new Map();
  let denial = checkConfigDirInternalWrite(pathsToCheck.spellings, "exact", pathCache);
  if (denial !== undefined) return denial;
  if (pathsToCheck.spellings.some(isSeedAdminPath)) return SEED_ADMIN_WRITE_DENIAL;
  if (pathsToCheck.spellings.some(isHostCredsFilePath)) return HOST_CREDS_WRITE_DENIAL;
  if (pathsToCheck.spellings.some(isProfileStorePath)) return PROFILE_STORE_WRITE_DENIAL;
  if (pathsToCheck.spellings.some(isSettingsReviewStorePath)) return SETTINGS_REVIEW_STORE_WRITE_DENIAL;
  let configDirDenial = noConfigDirWriteDenialForRead(pathsToCheck.spellings);
  if (configDirDenial !== undefined) return configDirDenial;
  let planDenial = noConfigDirWriteDenialForPlan(pathsToCheck.spellings);
  if (planDenial !== undefined) return planDenial;
  if (pathsToCheck.unresolved) return denyUnresolvablePath("write to", path);
  return checkConfigDirInternalWrite(pathsToCheck.spellings, "widest", pathCache);
}
//@ chunk-a2q0x549.js:287080-287207 affinity
function orderRootEntries(patternsByRoot) {
  return patternsByRoot.has(null) && getCwdOrNull() === null
    ? [...patternsByRoot.entries()].sort(
        ([entryA], [entryB]) => Number(entryA === null) - Number(entryB === null),
      )
    : patternsByRoot.entries();
}
//@ chunk-qg41pqt6.js:878622-878707 placement (2.1.88 match: normalizeGitPathArg, 0.677)
/**
 * （旧版名不符）Windows 路径规范化：解析真实路径、本机管理共享转盘符，再大写并按 \ 拆段。
 */
function normalizeGitPathArg(arg) {
  return win32.normalize(realPathOfAdminShare(arg)).toUpperCase().split("\\").filter(Boolean);
}
//@ chunk-qg41pqt6.js:878707-878768 placement
function realPathOfAdminShare(sharePath) {
  let drivePath = realPathOrSelf(adminShareToDrivePath(sharePath));
  let roundTripPath = adminShareToDrivePath(drivePath);
  return roundTripPath === drivePath ? drivePath : realPathOrSelf(roundTripPath);
}
//@ chunk-qg41pqt6.js:878768-878805 placement
function realPathOrSelf(path) {
  return realpathNativeLongSync(path).real ?? path;
}
//@ chunk-qg41pqt6.js:878805-879075 placement
function adminShareToDrivePath(inputPath) {
  let replaced = uncHostOf(inputPath)?.replace(/\.$/, "");
  let match = /^[\\/]{2}(?:[?.][\\/]unc[\\/])?[^\\/]+[\\/]+([a-z])\$(?:[\\/](.*))?$/is.exec(inputPath);
  return match !== null &&
    replaced !== undefined &&
    (isLoopbackHost(replaced) ||
      replaced === "--1.ipv6-literal.net" ||
      replaced === hostname().replace(/[A-Z]/g, (letter) => letter.toLowerCase()))
    ? `${match[1]}:\\${match[2] ?? ""}`
    : inputPath;
}
//@ chunk-5xgkngpb.js:1466819-1466881 fingerprint (2.1.88 match: isSessionPlanFile, 1)
function isMemoryTopicFile(absolutePath) {
  return (
    absolutePath.endsWith(".md") &&
    isOutsideAllowedRoot(absolutePath) &&
    basename(absolutePath) !== MEMORY_INDEX_FILENAME
  );
}
//@ chunk-nrv8bm0w.js:3878-3970 fingerprint (2.1.88 match: getScratchpadDir, 1)
var ARTIFACT_FILE_NAME_RE = /^artifact-[^-]+-.+-.*-[0-9a-f]{32}\.[^.]+$/;
var SESSION_FILE_PREFIX_RE = /^(session|cse)_/;
var SESSION_SUBDIRS = [TOOL_RESULTS_SUBDIR, "scratchpad"];
//@ chunk-vb7ng9fr.js:23941-23991 placement
/**
 * 返回 classifySensitivePath 的 reason 或 null。与模型无关（切分错误）。
 */
function getSensitivePathReason(cwd, classifier, location) {
  return classifySensitivePath(cwd, classifier, location)?.reason ?? null;
}
//@ chunk-vb7ng9fr.js:23991-24082 placement (2.1.88 match: resolveAntModel, 0.385)
/**
 * 敏感或拒绝读时返回 {path: 别名或原路径, reason}。旧版名 resolveAntModel 为错配。
 */
function resolveSensitivePath(cwd, classifier, location, lexicalRel) {
  let match = classifySensitivePath(cwd, classifier, location);
  return match === null
    ? null
    : {
        path: match.alias ?? lexicalRel,
        reason: match.reason,
      };
}
//@ chunk-vb7ng9fr.js:24082-24620 placement
/**
 * 把路径（词法/真实/原始相对路径及其别名、配置目录下的对应路径）逐一交给判定函数：sensitive/host_config 归 sensitive，read_denied/rules_unreadable 归 read_denied，否则 null。
 */
function classifySensitivePath(cwd, classifyRelative, location) {
  let rawRels = normalizeCaseForComparison_2([location.lexicalRel, location.rel, ...location.rawRels]);
  let filtered = normalizeCaseForComparison_2(rawRels.flatMap((rel) => getAliasSpellings(cwd, rel))).filter(
    (alias) => !rawRels.includes(alias),
  );
  let candidates = [...rawRels, ...filtered];
  if (
    [
      ...candidates,
      ...candidates.map((candidate) => join(cwd.configHome, ...candidate.split("/"))),
      location.realPath,
    ].some((candidatePath) => isSensitiveWithGitConfig(candidatePath))
  )
    return {
      reason: "sensitive",
      alias: null,
    };
  for (let candidate of candidates) {
    let alias = filtered.includes(candidate) ? candidate : null;
    switch (classifyRelative(candidate, false)) {
      case "sensitive":
      case "sensitive_tracked":
      case "host_config":
        return {
          reason: "sensitive",
          alias,
        };
      case "read_denied":
      case "rules_unreadable":
        return {
          reason: "read_denied",
          alias,
        };
      case "content_filter":
      case null:
        break;
    }
  }
  return null;
}
//@ chunk-czq1j3j2.js:64339-64417 placement
/**
 * 从工具上下文取 toolPermissionContext.additionalWorkingDirectories（Map）。与 filesystem 的 allWorkingDirectories 同名但不含 cwd，应归 UI/工具侧代码。
 */
function additionalWorkingDirectoriesOf(context) {
  return context.toolPermissionContext.additionalWorkingDirectories;
}
//@ chunk-cr1mmxrf.js:5277-5398 fingerprint (2.1.88 match: hasSuspiciousWindowsPathPattern, 0.569)
/**
 * 是否 UNC 路径：\\?\UNC\ 前缀，或以 \\ 开头但不是 \\?\、\\.\ 设备前缀。旧版名 hasSuspiciousWindowsPathPattern 误配。
 */
function isUncPath(path) {
  return (
    /^\\\\\?\\UNC\\/i.test(path) ||
    (path.startsWith("\\\\") && !path.startsWith("\\\\?\\") && !path.startsWith("\\\\.\\"))
  );
}
export {
  holdWorkingDirectoriesAsGiven,
  addAdditionalWorkingDirectories,
  isLinkedWorktreeFastPathEnabled,
  verifiedLinkedWorktreeDirectories,
  normalizeCaseForComparison_2,
  ensureScratchpadDir,
  pinResolvedWorkingDirPath,
  matchingRuleForInput,
  leafSymlinkWriteRefusal,
  checkWritePermissionForTool,
  checkReadPermissionForTool,
  isScratchpadDisplayPath,
  matchesPathRule,
  normalizeCaseForComparison,
  isScratchpadEnabled,
  getScratchpadDir,
  declaredAbsoluteAdditionalDirectories,
  pathInWorkingPath,
  allWorkingDirectories,
  READ_PATH_PROBE,
  isPathInTrustedNetworkRoot,
  hasSuspiciousWindowsPathPattern,
  readPermissionDecisionForPath,
  isReadGateSafetyAsk,
  pathInAllowedWorkingPath,
  symlinkLanding,
  getCountedWorkingDirPaths,
  isScratchpadPath,
  checkPathSafetyForAutoEdit,
  remoteConfigEditExemptionApplies,
  outsideReadBlocked,
  checkEditableInternalPath,
  internalPathDecisionStands,
  sensitiveWriteRedirect,
  hardDeniedAsSpelled,
  symlinkRedirect,
  symlinkRedirectSentence,
  checkReadableInternalPath,
  untypeDenyReasonForAskPropagation,
  matchingAllowRuleForAllPaths,
  isUntrustedAutomountPath,
  readWouldBeAutoAllowedForPath,
  blockReadsWorkingDirectories,
  DANGEROUS_FILES_LOWER,
  generateSuggestions,
  hasReadDenyRuleForPath,
  holdUnresolvedWorkingDirPathAsNamed,
  normalizePatternsToPath,
  getFileReadIgnorePatterns,
  acceptEditsSuggestionApplies,
  safetyCheckReasonFields,
  denyRuleMatchingAnywhere,
  readDenyRuleMayMatchBeneath,
  matchingDenyRuleForDirectoryContents,
  spellingsToJudge,
  hasPermissionAuthoredBareReadDeny,
  hasReadDenyRuleInForce,
  readDenyRuleForPath,
  readAutoAllowedForMutation,
  writeBlockRefusal,
  writeDenyPrefix,
  mayBeGuardedFileSyncCopy,
  mayEscapeExclusionGlobs,
  denyFoldVariantPaths,
  isMemoryTopicFile,
  patternWithRoot,
  rootPathForSource,
  getBundledSkillsRoot,
  isUntrustedUncPath,
  isClaudeSettingsPath,
  checkReadNetworkPathSafety,
  settingsLocationPaths,
  SETTINGS_FILE_BASENAMES,
  settingsFileCertainty,
  layeredReadVerdictForPaths,
  classifySuspiciousWindowsPathPattern,
  toPosixPath,
  settingsTextNeedles,
  settingsDirectoryWords,
  poolCanRead,
  isWorkingDirPathHeldAsNamed,
  DANGEROUS_DIRECTORIES,
  DANGEROUS_FILES,
  patternWithRootFor,
  normalizeInternalPathRoot,
  isUncPath,
  additionalWorkingDirectoriesOf,
  normalizeTrustedSymlink,
  relativePath,
  isJsonSpelling,
  isManagedSettingsDropInPath,
  managedDropInDirSpellingsAsync,
  ARTIFACT_FILE_NAME_RE,
  SESSION_SUBDIRS,
  SESSION_FILE_PREFIX_RE,
  managedDropInDirs,
  normalizeGitPathArg,
  isSearchResultRootRespellEnabled,
  resolveSensitivePath,
  getSensitivePathReason,
  compiledPathRulePattern,
};
