/**
 * services/plugins/pluginUninstallSettings.ts
 *
 * 2.1.316 新增：卸载插件时扫描各设置源中的启用项与数据目录，决定能改什么
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (30)
 * attribution: placement 30
 */
import { join, dirname, basename } from "path";
import { lstat, stat } from "fs/promises";
import {
  pathTraversesFromTrustedRoot,
  realpathAllowMissing as realpathAllowMissing_2,
} from "../../utils/pathResolution.js";
import {
  repoSettingsRefusalReason,
  vetRepoSettingsPathAsync,
  getFsImplementation,
  safeResolvePath,
} from "../../utils/fsOperations.js";
import { isInClaudeConfigHome, parseSettingsContent } from "../../utils/settings/settingsFileParsing.js";
import { isUnderNetworkDirCached, isNetworkMountPath } from "../../utils/networkPaths.js";
import { isSpecialPath, openBoundRead, isBoundReadError } from "../../utils/fsBoundRead.js";
import {
  MAX_SETTINGS_JSON_BYTES,
  getSettingsFilePathForSource,
  getLegacyLocalSettingsFilePath,
  parseSettingsFile,
  getSettingsForSource,
  getPolicySettingsLoadErrors,
} from "../../utils/settings/settings.js";
import { isENOENT, getErrnoCode, errorMessage } from "../../utils/errors.js";
import {
  isWorkspaceRestricted,
  getFlagSettingsExpectedContent,
  getFlagSettingsFilePinnedContent,
  getFlagSettingsInline,
  getAdditionalDirectoriesForClaudeMd,
} from "../../bootstrap/state.js";
import { REPO_DIR_SETTING_SOURCES } from "../../utils/settings/constants.js";
import { logForDebugging } from "../../utils/debug.js";
import { readFileChecked } from "../../utils/fileRead.js";
import { safeParseJSON } from "../../utils/json.js";
import { isPlainObject as isPlainObject_5 } from "../../utils/isPlainObject.js";
import { pathPresence } from "../../utils/fsSafety/atomicWriteStaging.js";
import { invalidateCommandNames } from "../../utils/settings/commandSyncNames.js";
import { findPluginName, pluginNamesEqual } from "../../utils/plugins/pluginIdentifier.js";
import { uniq } from "../../utils/collections.js";
import {
  findBindingKeysFor,
  isOfficialPluginDirectoryId,
  releaseDirectoryBinding,
} from "../../utils/plugins/pluginDirectoryBindings.js";
import { PARENT_MANAGED_SETTINGS_SOURCE_LABEL } from "../../utils/settings/managedFileSettings.js";
import { deletePluginOptions, listStoredPluginOptionKeys } from "../../utils/plugins/pluginOptionsStorage.js";
import {
  isSamePluginDirName,
  pluginDataDirPath,
  deletePluginDataDir,
} from "../../utils/plugins/pluginDirectories.js";
import { findPluginDataDirs, isMarketplaceGone } from "../../utils/plugins/marketplaceNames.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../../utils/fsRemove.js";

//@ chunk-e6aww6q8.js:4206869-4206919 placement
/**
 * 设置回读状态的严重程度顺序。
 */
var READBACK_LEVELS = ["off", "not-read-here", "unreadable", "on"];
//@ chunk-e6aww6q8.js:4206919-4206991 placement
/**
 * 判断路径是否像可疑的符号链接（父目录链异常）。
 */
function isSuspectLink(filePath) {
  let normalized = join(filePath);
  let parent = dirname(normalized);
  return pathTraversesFromTrustedRoot(dirname(parent), join(basename(parent), basename(normalized)));
}
//@ chunk-e6aww6q8.js:4206991-4207101 placement
function vetRefusalKind(error) {
  let reason = repoSettingsRefusalReason(error);
  return reason === "network" ? "vet-network" : reason === "unexamined" ? "vet-unexamined" : "vet-other";
}
//@ chunk-e6aww6q8.js:4207101-4208563 placement
/**
 * 安全读取仓库内设置文件的字节：先审查路径（链接、跨越、特殊文件），按审查结果做绑定读取；文件不存在返回 absent（区分是否位于指向空处的链接下），不能安全读取时返回 refused 及原因，成功返回 bytes 与实际路径。
 */
async function readRepoSettingsBytes(filePath) {
  let vetted;
  if (!isInClaudeConfigHome(filePath))
    try {
      vetted = await vetRepoSettingsPathAsync(getFsImplementation(), filePath, {
        fileIdentity: true,
      });
    } catch (error) {
      return {
        kind: "refused",
        why: vetRefusalKind(error),
      };
    }
  let bound =
    vetted?.resolvedPath === filePath && isUnderNetworkDirCached(filePath) && !isNetworkMountPath(filePath)
      ? vetted
      : undefined;
  let linkTarget = bound?.linksResolvedPath;
  if (bound !== undefined && linkTarget === undefined) {
    let absentAt = bound.absentAt;
    return absentAt === undefined
      ? {
          kind: "refused",
          why: "unbound",
        }
      : {
          kind: "absent",
          belowALinkToNothing: absentAt.fromLinkTarget,
          ...(absentAt.notAFolder && {
            notAFolder: true,
          }),
        };
  }
  if (isSuspectLink(filePath))
    return {
      kind: "refused",
      why: "suspect-link",
    };
  if (linkTarget !== undefined) {
    if (isSpecialPath(linkTarget))
      return {
        kind: "refused",
        why: "crossing",
      };
    let content;
    try {
      content = openBoundRead(
        linkTarget,
        true,
        MAX_SETTINGS_JSON_BYTES,
        linkTarget !== filePath,
        vetted?.identity,
      );
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
        return {
          kind: "refused",
          why: "unbound",
        };
      throw error;
    }
    return content === null || vetted?.noFileSeen === true
      ? {
          kind: "refused",
          why: "unbound",
        }
      : {
          kind: "bytes",
          content,
          route: linkTarget,
        };
  }
  let { resolvedPath, isSymlink, isCanonical } = safeResolvePath(getFsImplementation(), filePath);
  if (isSymlink && (!isCanonical || isSpecialPath(resolvedPath)))
    return {
      kind: "refused",
      why: "crossing",
    };
  let content;
  try {
    content = openBoundRead(resolvedPath, isCanonical, MAX_SETTINGS_JSON_BYTES, isSymlink, vetted?.identity);
  } catch (error) {
    if (vetted !== undefined && (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")) {
      if (vetted.linksResolvedPath !== undefined)
        return {
          kind: "refused",
          why: "unbound",
        };
      let isBoundError = isBoundReadError(error);
      let vetting = vetted;
      if (!isBoundError && vetting.absentAt?.fromLinkTarget !== true)
        try {
          vetting = await vetRepoSettingsPathAsync(getFsImplementation(), filePath);
        } catch (error) {
          return {
            kind: "refused",
            why: vetRefusalKind(error),
          };
        }
      if (vetting.absentAt !== undefined)
        return {
          kind: "absent",
          belowALinkToNothing: vetting.absentAt.fromLinkTarget || isBoundError,
          ...(vetting.absentAt.notAFolder && {
            notAFolder: true,
          }),
        };
      return vetting.linksResolvedPath !== undefined
        ? {
            kind: "refused",
            why: "unbound",
          }
        : {
            kind: "absent",
            belowALinkToNothing: isBoundError,
          };
    }
    throw error;
  }
  return content === null || vetted?.noFileSeen === true
    ? {
        kind: "refused",
        why: "unbound",
      }
    : {
        kind: "bytes",
        content,
        ...(isCanonical && {
          route: resolvedPath,
        }),
      };
}
//@ chunk-e6aww6q8.js:4208563-4208602 placement
/**
 * 该设置来源是否受工作区限制。
 */
function isWorkspaceRestrictedSource(source) {
  return isWorkspaceRestricted() && REPO_DIR_SETTING_SOURCES.has(source);
}
//@ chunk-e6aww6q8.js:4208602-4208670 placement
/**
 * 仓库设置里是否有可疑符号链接。
 */
function hasSuspectSettingsLink(source) {
  return (
    REPO_DIR_SETTING_SOURCES.has(source) &&
    !isWorkspaceRestrictedSource(source) &&
    settingsPathsForSource(source).some((path) => isSuspectLink(path))
  );
}
//@ chunk-e6aww6q8.js:4208670-4208757 placement = _temp8 (1)
/**
 * 某设置来源对应的设置文件路径列表。
 */
function settingsPathsForSource(a_3) {
  return [
    getSettingsFilePathForSource(a_3),
    ...(a_3 === "localSettings" ? [getLegacyLocalSettingsFilePath()] : []),
  ].filter((path) => path !== undefined);
}
//@ chunk-e6aww6q8.js:4208757-4208961 placement = isRealPathWithinTeamDir (0.785)
async function isRealPathWithinTeamDir_3(realCandidate) {
  for (let dir = dirname(realCandidate); ; dir = dirname(dir))
    try {
      if (!(await lstat(dir)).isSymbolicLink()) return false;
      return await stat(dir).then(
        () => false,
        () => true,
      );
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return true;
      if (dirname(dir) === dir) return false;
    }
}
//@ chunk-e6aww6q8.js:4208961-4209347 placement
/**
 * 读取用户设置文件里某插件的启用状态：缓存解析失败时安全地重新读取文件，返回 on/off/unreadable。
 */
async function userSettingsEnablement(filePath, pluginId, exclude) {
  let settings = parseSettingsFile(filePath).settings;
  if (settings === null) {
    let readablePath;
    try {
      readablePath = isInClaudeConfigHome(filePath)
        ? filePath
        : (await vetRepoSettingsPathAsync(getFsImplementation(), filePath)).resolvedPath;
    } catch (error) {
      logForDebugging(
        `Did not read settings file ${filePath}, so it counts as one that may still switch ${pluginId} on: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      return "unreadable";
    }
    try {
      let { content } = await readFileChecked(readablePath, MAX_SETTINGS_JSON_BYTES);
      settings = safeParseJSON(content, false);
    } catch (error) {
      return missingFileEnablement(readablePath, error);
    }
  }
  if (!isPlainObject_5(settings)) return "unreadable";
  return enabledPluginsState(settings.enabledPlugins, pluginId, exclude);
}
//@ chunk-e6aww6q8.js:4209347-4209482 placement
async function settingsFileEnablement(source, filePath, notReadHere, pluginId, exclude) {
  if (notReadHere)
    return {
      readsBack: "not-read-here",
    };
  return source === "userSettings"
    ? {
        readsBack: await userSettingsEnablement(filePath, pluginId, exclude),
      }
    : repoSettingsEnablement(filePath, pluginId, exclude);
}
//@ chunk-e6aww6q8.js:4209482-4209613 placement
async function missingFileEnablement(realCandidate, error) {
  if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
    return (await pathPresence(realCandidate)) === "gone" && !(await isRealPathWithinTeamDir_3(realCandidate))
      ? "off"
      : "unreadable";
  return "unreadable";
}
//@ chunk-e6aww6q8.js:4209613-4210046 placement
/**
 * 读取仓库内设置文件里某插件的启用状态：路径审查不通过返回 notRead 原因，文件不存在视为 off，并附带实际读取路径。
 */
async function repoSettingsEnablement(filePath, pluginId, exclude) {
  let content;
  let route;
  try {
    let repoSettingsBytes = await readRepoSettingsBytes(filePath);
    if (repoSettingsBytes.kind === "refused") {
      logForDebugging(`Plugin uninstall: settings file ${filePath} was not read (${repoSettingsBytes.why})`);
      return {
        notRead: repoSettingsBytes.why,
      };
    }
    if (repoSettingsBytes.kind === "absent")
      return {
        readsBack: repoSettingsBytes.belowALinkToNothing ? "unreadable" : "off",
      };
    content = repoSettingsBytes.content;
    route = repoSettingsBytes.route;
  } catch (error) {
    return {
      readsBack: await missingFileEnablement(filePath, error),
    };
  }
  let settings = parseSettingsContent(content, filePath).settings ?? safeParseJSON(content, false);
  return {
    readsBack: !isPlainObject_5(settings)
      ? "unreadable"
      : enabledPluginsState(settings.enabledPlugins, pluginId, exclude),
    ...(route !== undefined && {
      route,
    }),
  };
}
//@ chunk-e6aww6q8.js:4210046-4210198 placement
function enabledPluginsState(enabledPlugins, pluginId, exclude) {
  if (enabledPlugins === undefined) return "off";
  if (!isPlainObject_5(enabledPlugins)) return "unreadable";
  return enabledPluginKeys(enabledPlugins, pluginId, exclude).some(
    (key) =>
      enabledPlugins[key] !== undefined && enabledPlugins[key] !== null && enabledPlugins[key] !== false,
  )
    ? "on"
    : "off";
}
//@ chunk-e6aww6q8.js:4210198-4210257 placement
/**
 * 取更严重的回读状态。
 */
function maxReadback(left, right) {
  return READBACK_LEVELS.indexOf(right) > READBACK_LEVELS.indexOf(left) ? right : left;
}
//@ chunk-e6aww6q8.js:4210257-4210520 placement
function flagSettingsEnablement(pluginId, exclude, filePath) {
  let flagSettingsExpectedContent = getFlagSettingsExpectedContent();
  let flagSettingsFilePinnedContent = getFlagSettingsFilePinnedContent();
  let stateOf = (content) =>
    isPlainObject_5(content) ? enabledPluginsState(content.enabledPlugins, pluginId, exclude) : "unreadable";
  let expectedContent = flagSettingsExpectedContent ?? flagSettingsFilePinnedContent;
  let fileState =
    expectedContent === undefined ||
    expectedContent.trim() === "" ||
    (flagSettingsExpectedContent === undefined &&
      (filePath === undefined || parseSettingsFile(filePath, expectedContent).settings === null))
      ? "off"
      : stateOf(safeParseJSON(expectedContent, false));
  let content = getFlagSettingsInline();
  return {
    readsBack: maxReadback(fileState, content !== null ? stateOf(content) : "off"),
    isJson: flagSettingsExpectedContent !== undefined,
  };
}
//@ chunk-e6aww6q8.js:4210520-4210813 placement
/**
 * 在某设置来源的所有文件中找出启用该插件的状态最"强"的文件；有文件未能读取时返回未读文件列表与原因。
 */
async function findEnablingSettingsFile(source, pluginId, exclude = []) {
  invalidateCommandNames();
  let worst = {
    readsBack: "off",
  };
  let notReadPaths = [];
  let notReadWhy;
  for (let path of settingsPathsForSource(source)) {
    let result = await settingsFileEnablement(
      source,
      path,
      isWorkspaceRestrictedSource(source),
      pluginId,
      exclude,
    );
    if ("notRead" in result) {
      notReadPaths.push(path);
      notReadWhy ??= result.notRead;
      continue;
    }
    if (READBACK_LEVELS.indexOf(result.readsBack) > READBACK_LEVELS.indexOf(worst.readsBack))
      worst = {
        readsBack: result.readsBack,
        file: path,
      };
  }
  return notReadWhy !== undefined
    ? {
        notRead: notReadPaths,
        why: notReadWhy,
      }
    : worst;
}
//@ chunk-e6aww6q8.js:4210813-4210957 placement
/**
 * 找出 enabledPlugins 中与插件 id 对应的所有键（含大小写/别名变体），排除属于其他已安装插件的键。
 */
function enabledPluginKeys(enabledPlugins, pluginId, exclude = []) {
  let keys = Object.keys(enabledPlugins ?? {});
  let pluginName = findPluginName(keys, pluginId);
  return uniq([
    ...findBindingKeysFor(keys, pluginId),
    ...(pluginName === undefined ? [] : [pluginName]),
  ]).filter((key) => key === pluginId || !exclude.some((excludedId) => pluginNamesEqual(excludedId, key)));
}
//@ chunk-e6aww6q8.js:4210957-4211007 placement
/**
 * 判断路径是否已不存在。
 */
async function isPathGone(path) {
  return (await pathPresence(path)) === "gone";
}
//@ chunk-e6aww6q8.js:4211007-4211066 placement
/**
 * 卸载时会检查的设置来源。
 */
var UNINSTALL_SETTING_SOURCES = ["userSettings", "localSettings", "projectSettings"];
//@ chunk-e6aww6q8.js:4211066-4212586 placement
/**
 * 描述无法写入的设置来源（托管设置、--settings 传入等）及原因。
 */
function describeUnwritableSettingsSource({
  source,
  file,
  readsBack,
  notReadBecause,
  fromMemory,
  onDiskNow,
}) {
  return source === "policySettings" && readsBack === "unreadable"
    ? "this computer's managed settings (a part of them could not be read: only whoever manages them can fix that, usually an administrator)"
    : readsBack === "unreadable"
      ? fromMemory
        ? "the settings given to this session with --settings or by the application that started it (they could not be read as settings: correct them where they are given and, if they were given at start-up, start Claude Code again; or start it without them)"
        : `${file} (it is there and could not be read)`
      : notReadBecause === "network-path"
        ? `${file} (not read: it is on a network path or is a link to one, or could not be checked)`
        : readsBack === "not-read-here"
          ? `${file} (not read: this workspace is not yet trusted)`
          : source === "addDir"
            ? `${file} (of a directory added to this session, for example with --add-dir: no uninstall edits it)`
            : source === "otherFolder"
              ? `${file} (the settings of another folder: uninstalling from here does not edit it)`
              : source === "policySettings"
                ? "this computer's managed settings (uninstalling cannot change them: only whoever manages them can, usually an administrator)"
                : source === "flagSettings" && onDiskNow
                  ? `${file} (the --settings file as it is now, which a later session started with it would read: switch it off there)`
                  : source === "flagSettings"
                    ? "the settings given to this session with --settings or by the application that started it (uninstalling cannot change them: switch it off where they are given and, if they were given at start-up, start Claude Code again; or start it without them)"
                    : file;
}
//@ chunk-e6aww6q8.js:4212586-4213599 placement
/**
 * 部分设置文件因位于网络路径而未能读取时，生成补救提示：路径在检查期间变化可以重试；若是指向其他机器的链接，建议换成真实文件或从真实位置启动 Claude Code。
 */
function networkPathRetryHint(entries, action) {
  let networkEntries = entries.filter((entry) => entry.notReadBecause === "network-path");
  if (networkEntries.length === 0) return;
  let step =
    networkEntries.length < entries.length
      ? `switch it off in the other settings named here and ${action}`
      : action;
  let linkEntries = networkEntries.filter(
    ({ notReadWhy }) =>
      notReadWhy === undefined ||
      notReadWhy === "vet-network" ||
      notReadWhy === "suspect-link" ||
      notReadWhy === "crossing",
  );
  if (linkEntries.length === 0)
    return `Try to ${step}: if the path to a file that was not read changed during the check, that will work. If you see this again, that path cannot be checked, and trying again will not help`;
  return `If a file that was not read, its ".claude" folder or a folder above them is a link to another machine, replace the link with a real file or folder, or ${
    linkEntries.every(({ source }) => source === "projectSettings" || source === "localSettings")
      ? "start Claude Code from the folder's real location"
      : "use the real location instead of the link when you start Claude Code or add a directory (for example with --add-dir)"
  }. Then ${step}${linkEntries.length < networkEntries.length ? ". If you see this again with no such link, a path cannot be checked, and trying again will not help" : ""}`;
}
//@ chunk-e6aww6q8.js:4213599-4213777 placement
function isBlockingPolicyLoadError(loadError) {
  if (loadError.file === PARENT_MANAGED_SETTINGS_SOURCE_LABEL) return false;
  return (
    loadError.severity !== "warning" ||
    (loadError.userWritable !== true &&
      loadError.wslIgnored !== true &&
      (loadError.path === "enabledPlugins" || loadError.path.startsWith("enabledPlugins.")))
  );
}
//@ chunk-e6aww6q8.js:4213777-4213910 placement
function projectSettingsIdentity(filePath) {
  if (basename(dirname(filePath)) !== ".claude") return;
  let projectDir = dirname(dirname(filePath));
  let resolved = safeResolvePath(getFsImplementation(), projectDir);
  return `${resolved.isCanonical ? resolved.resolvedPath : projectDir}\x00${basename(filePath)}`;
}
//@ chunk-e6aww6q8.js:4213910-4214383 placement
/**
 * 计算某设置来源对插件的启用状态条目：合并内存中的设置、flag 设置与磁盘内容，策略设置加载出错时视为不可读；未启用返回 undefined。
 */
async function sourceEnablementEntry(source, pluginId, exclude = []) {
  let settingsForSource = getSettingsForSource(source);
  let filePath = getSettingsFilePathForSource(source);
  let memoryState =
    settingsForSource !== null && settingsForSource !== undefined
      ? enabledPluginsState(settingsForSource.enabledPlugins, pluginId, exclude)
      : "off";
  let flagState = source === "flagSettings" ? flagSettingsEnablement(pluginId, exclude, filePath) : undefined;
  let pinnedFileState =
    flagState !== undefined && !flagState.isJson && filePath !== undefined
      ? await userSettingsEnablement(filePath, pluginId, exclude)
      : "off";
  let adjustedMemoryState =
    memoryState === "off" &&
    source === "policySettings" &&
    getPolicySettingsLoadErrors().some(isBlockingPolicyLoadError)
      ? "unreadable"
      : memoryState;
  let withFlag = maxReadback(adjustedMemoryState, flagState?.readsBack ?? "off");
  let worst = maxReadback(withFlag, pinnedFileState);
  return worst === "off"
    ? undefined
    : {
        source,
        file: filePath ?? source,
        readsBack: worst,
        ...(worst !== withFlag && {
          onDiskNow: true,
        }),
        ...(flagState?.readsBack === "unreadable" &&
          worst === "unreadable" &&
          pinnedFileState !== "unreadable" && {
            fromMemory: true,
          }),
      };
}
//@ chunk-e6aww6q8.js:4214383-4215921 placement
/**
 * 列出卸载时需要检查的设置文件（settings.json、settings.local.json、附加目录）。
 */
async function listUninstallSettingsFiles(pluginId, exclude = [], otherFolders = []) {
  invalidateCommandNames();
  let launchFolders = isWorkspaceRestricted()
    ? []
    : otherFolders.filter((folder) => realpathAllowMissing_2(folder));
  let candidates = [
    ...UNINSTALL_SETTING_SOURCES.flatMap((source) =>
      settingsPathsForSource(source).map((path) => [source, path, isWorkspaceRestrictedSource(source)]),
    ),
    ...getAdditionalDirectoriesForClaudeMd().flatMap((dir) =>
      ["settings.json", "settings.local.json"].map((fileName) => [
        "addDir",
        join(dir, ".claude", fileName),
        false,
      ]),
    ),
    ...otherFolders
      .filter((folder) => !launchFolders.includes(folder))
      .flatMap((folder) =>
        ["settings.json", "settings.local.json"].map((fileName) => [
          "otherFolder",
          join(folder, ".claude", fileName),
          isWorkspaceRestricted(),
        ]),
      ),
  ];
  let entries = [];
  let seenNormal = new Set();
  let seenRestricted = new Set();
  let seenRoutes = new Set();
  let seenFiles = new Set();
  let extraFolders = [];
  let normalFiles = [];
  for (let [source, path, restricted] of candidates) {
    if (source === "otherFolder" && !restricted && realpathAllowMissing_2(path)) {
      extraFolders.push(path);
      continue;
    }
    if (seenNormal.has(path) || seenRoutes.has(path) || (restricted && seenRestricted.has(path))) continue;
    if (restricted) seenRestricted.add(path);
    else seenNormal.add(path);
    if (source === "userSettings" && otherFolders.length > 0) {
      let resolved = safeResolvePath(getFsImplementation(), path);
      if (resolved.isCanonical) seenRoutes.add(resolved.resolvedPath);
    }
    let state = await settingsFileEnablement(source, path, restricted, pluginId, exclude);
    if ("notRead" in state) {
      seenFiles.add(path);
      entries.push({
        source,
        file: path,
        readsBack: "not-read-here",
        notReadBecause: "network-path",
        notReadWhy: state.notRead,
      });
      continue;
    }
    if (source !== "otherFolder") normalFiles.push(path);
    if (state.route !== undefined) {
      if (seenRoutes.has(state.route)) continue;
      seenRoutes.add(state.route);
    }
    seenFiles.add(path);
    if (state.readsBack !== "off")
      entries.push({
        source,
        file: path,
        readsBack: state.readsBack,
      });
  }
  let excludedIdentities =
    extraFolders.length > 0
      ? new Set(normalFiles.flatMap((path) => projectSettingsIdentity(path) ?? []))
      : undefined;
  for (let path of [
    ...launchFolders.flatMap((folder) =>
      ["settings.json", "settings.local.json"].map((fileName) => join(folder, ".claude", fileName)),
    ),
    ...extraFolders.filter((folder) => {
      let identity = projectSettingsIdentity(folder);
      return identity === undefined || !excludedIdentities?.has(identity);
    }),
  ]) {
    if (seenFiles.has(path) || seenRoutes.has(path)) continue;
    seenFiles.add(path);
    entries.push({
      source: "otherFolder",
      file: path,
      readsBack: "not-read-here",
      notReadBecause: "network-path",
    });
  }
  for (let source of ["policySettings", "flagSettings"]) {
    let entry = await sourceEnablementEntry(source, pluginId, exclude);
    if (entry !== undefined) entries.push(entry);
  }
  return entries;
}
//@ chunk-e6aww6q8.js:4215921-4218439 placement
/**
 * 卸载插件时扫描各设置源（本地、项目、用户、附加目录）中对该插件的启用项。
 */
async function scanSettingsForPluginUninstall(pluginId, exclude, folders, walk) {
  let sessionFolder = walk.theSessions === undefined ? undefined : join(walk.theSessions);
  let walkFolder = join(walk.byAFreshWalk);
  let launchFolders = uniq([...(sessionFolder === undefined ? [] : [sessionFolder]), walkFolder]);
  let candidateFolders = uniq([
    ...folders,
    ...launchFolders.map((launchFolder) => join(launchFolder, "..", "..")),
  ]);
  let settingsFiles = await listUninstallSettingsFiles(pluginId, exclude, candidateFolders);
  let workspaceRestricted = isWorkspaceRestricted();
  let realpathCache = new Map();
  let realpathOf = (path) => {
    let real = realpathCache.get(path);
    if (real === undefined) {
      real = realpathAllowMissing_2(path);
      realpathCache.set(path, real);
    }
    return real;
  };
  let resolveCache = new Map();
  let resolvedPathOf = (path) => {
    let resolved = resolveCache.get(path);
    if (resolved === undefined) {
      let resolution = safeResolvePath(getFsImplementation(), path);
      resolved = resolution.isCanonical ? resolution.resolvedPath : path;
      resolveCache.set(path, resolved);
    }
    return resolved;
  };
  let notReadFiles = new Set(
    settingsFiles
      .filter((settingsFile) => settingsFile.readsBack === "not-read-here")
      .map((settingsFile) => settingsFile.file),
  );
  let identityCache = new Map();
  let canonicalOf = (path) => {
    if (workspaceRestricted) return resolvedPathOf(path);
    if (realpathOf(dirname(dirname(path)))) return path;
    if (realpathOf(path)) {
      let identity = projectSettingsIdentity(path);
      return identity === undefined ? path : (identityCache.get(identity) ?? identity);
    }
    return resolvedPathOf(path);
  };
  if (!workspaceRestricted)
    for (let path of [
      ...settingsFiles
        .filter((settingsFile) => settingsFile.source !== "otherFolder")
        .map((settingsFile) => settingsFile.file),
      ...launchFolders,
    ]) {
      if (notReadFiles.has(path) || realpathOf(dirname(dirname(path)))) continue;
      let identity = projectSettingsIdentity(path);
      if (identity !== undefined && !identityCache.has(identity))
        identityCache.set(identity, canonicalOf(path));
    }
  let NOT_READ_PREFIX = "\x00not read\x00";
  let keyOf = (settingsFile) =>
    settingsFile.readsBack === "not-read-here"
      ? NOT_READ_PREFIX + settingsFile.file
      : canonicalOf(settingsFile.file);
  let keyOfPath = (path) => (notReadFiles.has(path) ? NOT_READ_PREFIX + path : canonicalOf(path));
  let launchKeys = new Set(launchFolders.map(keyOfPath));
  let sessionKey = sessionFolder === undefined ? undefined : keyOfPath(sessionFolder);
  let walkKey = keyOfPath(walkFolder);
  let byKey = new Map();
  let byFile = new Map();
  for (let settingsFile of settingsFiles) {
    let key = keyOf(settingsFile);
    let record = {
      said: settingsFile,
      ...(launchKeys.has(key)
        ? {
            alsoThisLaunchs: "localSettings",
          }
        : settingsFile.source === "localSettings"
          ? {
              alsoThisLaunchs: "legacyLocalSettings",
            }
          : settingsFile.source === "projectSettings"
            ? {
                alsoThisLaunchs: "projectSettings",
              }
            : {}),
    };
    if (!byKey.has(key)) byKey.set(key, record);
    if (settingsFile.readsBack !== "not-read-here" && !byFile.has(settingsFile.file))
      byFile.set(settingsFile.file, record);
  }
  let lookup = (folder, file) => {
    let byPath = byKey.get(NOT_READ_PREFIX + file);
    if (workspaceRestricted) return byKey.get(file) ?? byFile.get(file) ?? byPath;
    if (realpathOf(folder)) return byPath ?? byFile.get(file) ?? byKey.get(file);
    if (realpathOf(file)) return byPath ?? byKey.get(canonicalOf(file));
    if (
      byPath === undefined ||
      (byPath.said.notReadBecause === "network-path" &&
        byPath.said.notReadWhy === undefined &&
        candidateFolders.some(
          (candidate) =>
            candidate !== folder &&
            realpathOf(candidate) &&
            join(candidate, ".claude", basename(file)) === file,
        ))
    )
      return byKey.get(resolvedPathOf(file));
    return byPath;
  };
  let byFolder = new Map();
  for (let folder of folders)
    byFolder.set(
      folder,
      ["settings.json", "settings.local.json"].flatMap((fileName) => {
        let filePath = join(folder, ".claude", fileName);
        let resolved = lookup(folder, filePath);
        return resolved === undefined
          ? []
          : [
              {
                file: filePath,
                readsBack: resolved.said.readsBack,
                ...(resolved.said.notReadBecause !== undefined && {
                  notReadBecause: resolved.said.notReadBecause,
                }),
                ...(resolved.alsoThisLaunchs !== undefined && {
                  alsoThisLaunchs: resolved.alsoThisLaunchs,
                }),
              },
            ];
      }),
    );
  let found = settingsFiles.find(
    (settingsFile) => settingsFile.source === "localSettings" && !launchKeys.has(keyOf(settingsFile)),
  );
  return {
    byFolder,
    thisLaunchsLocalFile: sessionKey === undefined ? undefined : byKey.get(sessionKey)?.said.readsBack,
    thisLaunchsLocalFileByAFreshWalk: walkKey === sessionKey ? undefined : byKey.get(walkKey)?.said.readsBack,
    thisLaunchsLegacyLocalFile:
      found === undefined
        ? undefined
        : {
            file: found.file,
            readsBack: found.readsBack,
            ...(found.notReadBecause !== undefined && {
              notReadBecause: found.notReadBecause,
            }),
          },
    thisLaunchsProjectFileOn: settingsFiles.find(
      (settingsFile) => settingsFile.source === "projectSettings" && settingsFile.readsBack === "on",
    )?.file,
  };
}
//@ chunk-e6aww6q8.js:4218439-4219767 placement
/**
 * 决定卸载时对插件数据目录与选项的处理方式。
 */
async function decideUninstallDataAction(
  pluginId,
  { deleteDataDir, installedIds, storageV5, credentials },
  options,
) {
  let isDirectoryId = false;
  isDirectoryId = isOfficialPluginDirectoryId(pluginId);
  let failedOptionKeys = [];
  let deleteOptions = (key) => deletePluginOptions(key, storageV5, credentials, failedOptionKeys);
  let liveHolder;
  if (isDirectoryId && installedIds !== "unknown") {
    let installedSet = new Set(installedIds);
    liveHolder = installedSet.has(pluginId)
      ? pluginId
      : [...installedSet].find((installedId) => isSamePluginDirName(installedId, pluginId));
  }
  let plan = {
    kind: "options-and-folder",
  };
  plan = decideDirectoryReleasePlan({
    isDirectoryId,
    ...options,
    installs:
      installedIds === "unknown"
        ? "unknown"
        : {
            thisIdHasRecord: liveHolder === pluginId,
            otherInstalledIdNamesFolder: liveHolder !== undefined && liveHolder !== pluginId,
          },
  });
  if (plan.kind === "nothing")
    return {
      optionsGone: false,
      dataGone: false,
      optionsNotGoneBecause: failedOptionKeys,
      ...(plan.reason === "installs-unknown" && {
        installsUnknown: true,
      }),
      ...(plan.reason === "record-reappeared" &&
        liveHolder !== undefined && {
          liveHolder,
        }),
      plan,
    };
  let optionsGone = await deleteOptions(pluginId);
  if (plan.kind === "own-options-only")
    return {
      optionsGone,
      dataGone: false,
      optionsNotGoneBecause: failedOptionKeys,
      ...(liveHolder !== undefined && {
        liveHolder,
      }),
      plan,
    };
  if (plan.kind === "everything-of-the-name") {
    let dataGone = true;
    let stored = await listStoredPluginOptionKeys(credentials);
    if (stored.unreadable.length > 0) {
      optionsGone = false;
      for (let key of stored.unreadable) if (!failedOptionKeys.includes(key)) failedOptionKeys.push(key);
    }
    for (let key of findBindingKeysFor(stored.ids, pluginId))
      if (key !== pluginId) optionsGone = (await deleteOptions(key)) && optionsGone;
    let pluginDataDirs = await findPluginDataDirs(pluginId);
    let dataDir = pluginDataDirPath(pluginId);
    for (let dir of deleteDataDir ? uniq([dataDir, ...(pluginDataDirs ?? [])]) : [])
      await removeDirectoryTreeNoFollow_2(dir).catch((error) => {
        logForDebugging(`Failed to delete plugin data dir ${dir}: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    dataGone = pluginDataDirs !== undefined && (await isMarketplaceGone(pluginId));
    for (let dir of pluginDataDirs ?? []) dataGone = (await isPathGone(dir)) && dataGone;
    return {
      optionsGone,
      dataGone,
      optionsNotGoneBecause: failedOptionKeys,
      plan,
    };
  }
  return {
    optionsGone,
    dataGone: !deleteDataDir || (await deletePluginDataDir(pluginId)) !== "failed",
    optionsNotGoneBecause: failedOptionKeys,
    plan,
  };
}
//@ chunk-e6aww6q8.js:4219767-4219859 placement
/**
 * 按允许列表过滤（unknown 表示不过滤）。
 */
function filterByList(installedOthers, ids) {
  if (ids === "unknown") return installedOthers;
  let idSet = new Set(ids);
  return installedOthers.filter((id) => idSet.has(id));
}
//@ chunk-e6aww6q8.js:4219859-4220320 placement
/**
 * 规划卸载后的清理：列出仍启用该插件的设置文件与目录名绑定状态，决定选项/数据目录的删除计划，并在需要时释放目录绑定。
 */
async function planUninstallCleanup(
  pluginId,
  { deleteDataDir, installedIds, installedOthers = [], storageV5, credentials },
) {
  let stillOn = [];
  let entry = "none";
  let ids = installedIds === "unknown" ? installedIds : [...installedIds];
  if (isOfficialPluginDirectoryId(pluginId)) {
    stillOn = await listUninstallSettingsFiles(pluginId, filterByList(installedOthers, ids));
    if (stillOn.length > 0) entry = await releaseDirectoryBinding(pluginId, false);
  }
  let decision = await decideUninstallDataAction(
    pluginId,
    {
      deleteDataDir,
      installedIds: ids,
      storageV5,
      credentials,
    },
    {
      stillSwitchedOn: stillOn.length > 0,
      entry,
    },
  );
  let entry_2 =
    decision.plan.kind === "nothing" && decision.plan.reason === "still-switched-on"
      ? entry
      : await releaseDirectoryBinding(pluginId, decision.optionsGone && decision.dataGone);
  return {
    ...decision,
    stillOn,
    entry: entry_2,
  };
}
//@ chunk-e6aww6q8.js:4220320-4220767 placement
/**
 * 根据插件安装状态决定卸载时可删除的范围：仅选项与目录、什么都不删（仍启用、安装记录未知或重新出现）、只删自己的选项，或删除该名下的全部内容。
 */
function decideDirectoryReleasePlan(input) {
  if (!input.isDirectoryId)
    return {
      kind: "options-and-folder",
    };
  if (input.stillSwitchedOn && input.entry !== "none")
    return {
      kind: "nothing",
      reason: "still-switched-on",
    };
  if (input.installs === "unknown")
    return {
      kind: "nothing",
      reason: "installs-unknown",
    };
  if (input.installs.thisIdHasRecord)
    return {
      kind: "nothing",
      reason: "record-reappeared",
    };
  if (input.installs.otherInstalledIdNamesFolder)
    return {
      kind: "own-options-only",
      reason: "live-holder",
    };
  return {
    kind: "everything-of-the-name",
  };
}
export {
  isWorkspaceRestrictedSource,
  isSuspectLink,
  hasSuspectSettingsLink,
  enabledPluginKeys,
  describeUnwritableSettingsSource,
  scanSettingsForPluginUninstall,
  findEnablingSettingsFile,
  readRepoSettingsBytes,
  planUninstallCleanup,
  listUninstallSettingsFiles,
  networkPathRetryHint,
  isBlockingPolicyLoadError,
  sourceEnablementEntry,
};
