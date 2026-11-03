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
function isSuspectLink(e) {
  let n = join(e);
  let r = dirname(n);
  return pathTraversesFromTrustedRoot(dirname(r), join(basename(r), basename(n)));
}
//@ chunk-e6aww6q8.js:4206991-4207101 placement
function vetRefusalKind(error) {
  let n = repoSettingsRefusalReason(error);
  return n === "network" ? "vet-network" : n === "unexamined" ? "vet-unexamined" : "vet-other";
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
    let L;
    try {
      L = openBoundRead(linkTarget, true, MAX_SETTINGS_JSON_BYTES, linkTarget !== filePath, vetted?.identity);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")
        return {
          kind: "refused",
          why: "unbound",
        };
      throw error;
    }
    return L === null || vetted?.noFileSeen === true
      ? {
          kind: "refused",
          why: "unbound",
        }
      : {
          kind: "bytes",
          content: L,
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
      let G = isBoundReadError(error);
      let q = vetted;
      if (!G && q.absentAt?.fromLinkTarget !== true)
        try {
          q = await vetRepoSettingsPathAsync(getFsImplementation(), filePath);
        } catch (error) {
          return {
            kind: "refused",
            why: vetRefusalKind(error),
          };
        }
      if (q.absentAt !== undefined)
        return {
          kind: "absent",
          belowALinkToNothing: q.absentAt.fromLinkTarget || G,
          ...(q.absentAt.notAFolder && {
            notAFolder: true,
          }),
        };
      return q.linksResolvedPath !== undefined
        ? {
            kind: "refused",
            why: "unbound",
          }
        : {
            kind: "absent",
            belowALinkToNothing: G,
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
function isWorkspaceRestrictedSource(e) {
  return isWorkspaceRestricted() && REPO_DIR_SETTING_SOURCES.has(e);
}
//@ chunk-e6aww6q8.js:4208602-4208670 placement
/**
 * 仓库设置里是否有可疑符号链接。
 */
function hasSuspectSettingsLink(e) {
  return (
    REPO_DIR_SETTING_SOURCES.has(e) &&
    !isWorkspaceRestrictedSource(e) &&
    settingsPathsForSource(e).some((n) => isSuspectLink(n))
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
  ].filter((n) => n !== undefined);
}
//@ chunk-e6aww6q8.js:4208757-4208961 placement = isRealPathWithinTeamDir (0.785)
async function isRealPathWithinTeamDir_3(realCandidate) {
  for (let n = dirname(realCandidate); ; n = dirname(n))
    try {
      if (!(await lstat(n)).isSymbolicLink()) return false;
      return await stat(n).then(
        () => false,
        () => true,
      );
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return true;
      if (dirname(n) === n) return false;
    }
}
//@ chunk-e6aww6q8.js:4208961-4209347 placement
/**
 * 读取用户设置文件里某插件的启用状态：缓存解析失败时安全地重新读取文件，返回 on/off/unreadable。
 */
async function userSettingsEnablement(e, n, r) {
  let settings = parseSettingsFile(e).settings;
  if (settings === null) {
    let h;
    try {
      h = isInClaudeConfigHome(e)
        ? e
        : (await vetRepoSettingsPathAsync(getFsImplementation(), e)).resolvedPath;
    } catch (error) {
      logForDebugging(
        `Did not read settings file ${e}, so it counts as one that may still switch ${n} on: ${errorMessage(error)}`,
        {
          level: "error",
        },
      );
      return "unreadable";
    }
    try {
      let { content } = await readFileChecked(h, MAX_SETTINGS_JSON_BYTES);
      settings = safeParseJSON(content, false);
    } catch (error) {
      return missingFileEnablement(h, error);
    }
  }
  if (!isPlainObject_5(settings)) return "unreadable";
  return enabledPluginsState(settings.enabledPlugins, n, r);
}
//@ chunk-e6aww6q8.js:4209347-4209482 placement
async function settingsFileEnablement(e, n, r, s, h) {
  if (r)
    return {
      readsBack: "not-read-here",
    };
  return e === "userSettings"
    ? {
        readsBack: await userSettingsEnablement(n, s, h),
      }
    : repoSettingsEnablement(n, s, h);
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
async function repoSettingsEnablement(filePath, n, r) {
  let s;
  let h;
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
    s = repoSettingsBytes.content;
    h = repoSettingsBytes.route;
  } catch (error) {
    return {
      readsBack: await missingFileEnablement(filePath, error),
    };
  }
  let y = parseSettingsContent(s, filePath).settings ?? safeParseJSON(s, false);
  return {
    readsBack: !isPlainObject_5(y) ? "unreadable" : enabledPluginsState(y.enabledPlugins, n, r),
    ...(h !== undefined && {
      route: h,
    }),
  };
}
//@ chunk-e6aww6q8.js:4210046-4210198 placement
function enabledPluginsState(enabledPlugins, n, r) {
  if (enabledPlugins === undefined) return "off";
  if (!isPlainObject_5(enabledPlugins)) return "unreadable";
  return enabledPluginKeys(enabledPlugins, n, r).some(
    (s) => enabledPlugins[s] !== undefined && enabledPlugins[s] !== null && enabledPlugins[s] !== false,
  )
    ? "on"
    : "off";
}
//@ chunk-e6aww6q8.js:4210198-4210257 placement
/**
 * 取更严重的回读状态。
 */
function maxReadback(e, n) {
  return READBACK_LEVELS.indexOf(n) > READBACK_LEVELS.indexOf(e) ? n : e;
}
//@ chunk-e6aww6q8.js:4210257-4210520 placement
function flagSettingsEnablement(e, n, settingsFilePathForSource) {
  let flagSettingsExpectedContent = getFlagSettingsExpectedContent();
  let flagSettingsFilePinnedContent = getFlagSettingsFilePinnedContent();
  let y = (G) => (isPlainObject_5(G) ? enabledPluginsState(G.enabledPlugins, e, n) : "unreadable");
  let S = flagSettingsExpectedContent ?? flagSettingsFilePinnedContent;
  let w =
    S === undefined ||
    S.trim() === "" ||
    (flagSettingsExpectedContent === undefined &&
      (settingsFilePathForSource === undefined ||
        parseSettingsFile(settingsFilePathForSource, S).settings === null))
      ? "off"
      : y(safeParseJSON(S, false));
  let flagSettingsInline = getFlagSettingsInline();
  return {
    readsBack: maxReadback(w, flagSettingsInline !== null ? y(flagSettingsInline) : "off"),
    isJson: flagSettingsExpectedContent !== undefined,
  };
}
//@ chunk-e6aww6q8.js:4210520-4210813 placement
/**
 * 在某设置来源的所有文件中找出启用该插件的状态最"强"的文件；有文件未能读取时返回未读文件列表与原因。
 */
async function findEnablingSettingsFile(settingSource, n, r = []) {
  invalidateCommandNames();
  let s = {
    readsBack: "off",
  };
  let h = [];
  let y;
  for (let S of settingsPathsForSource(settingSource)) {
    let w = await settingsFileEnablement(settingSource, S, isWorkspaceRestrictedSource(settingSource), n, r);
    if ("notRead" in w) {
      h.push(S);
      y ??= w.notRead;
      continue;
    }
    if (READBACK_LEVELS.indexOf(w.readsBack) > READBACK_LEVELS.indexOf(s.readsBack))
      s = {
        readsBack: w.readsBack,
        file: S,
      };
  }
  return y !== undefined
    ? {
        notRead: h,
        why: y,
      }
    : s;
}
//@ chunk-e6aww6q8.js:4210813-4210957 placement
/**
 * 找出 enabledPlugins 中与插件 id 对应的所有键（含大小写/别名变体），排除属于其他已安装插件的键。
 */
function enabledPluginKeys(e, n, r = []) {
  let keys = Object.keys(e ?? {});
  let pluginName = findPluginName(keys, n);
  return uniq([...findBindingKeysFor(keys, n), ...(pluginName === undefined ? [] : [pluginName])]).filter(
    (y) => y === n || !r.some((S) => pluginNamesEqual(S, y)),
  );
}
//@ chunk-e6aww6q8.js:4210957-4211007 placement
/**
 * 判断路径是否已不存在。
 */
async function isPathGone(e) {
  return (await pathPresence(e)) === "gone";
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
function isBlockingPolicyLoadError(e) {
  if (e.file === PARENT_MANAGED_SETTINGS_SOURCE_LABEL) return false;
  return (
    e.severity !== "warning" ||
    (e.userWritable !== true &&
      e.wslIgnored !== true &&
      (e.path === "enabledPlugins" || e.path.startsWith("enabledPlugins.")))
  );
}
//@ chunk-e6aww6q8.js:4213777-4213910 placement
function projectSettingsIdentity(e) {
  if (basename(dirname(e)) !== ".claude") return;
  let n = dirname(dirname(e));
  let r = safeResolvePath(getFsImplementation(), n);
  return `${r.isCanonical ? r.resolvedPath : n}\x00${basename(e)}`;
}
//@ chunk-e6aww6q8.js:4213910-4214383 placement
/**
 * 计算某设置来源对插件的启用状态条目：合并内存中的设置、flag 设置与磁盘内容，策略设置加载出错时视为不可读；未启用返回 undefined。
 */
async function sourceEnablementEntry(e, n, r = []) {
  let settingsForSource = getSettingsForSource(e);
  let settingsFilePathForSource = getSettingsFilePathForSource(e);
  let y =
    settingsForSource !== null && settingsForSource !== undefined
      ? enabledPluginsState(settingsForSource.enabledPlugins, n, r)
      : "off";
  let S = e === "flagSettings" ? flagSettingsEnablement(n, r, settingsFilePathForSource) : undefined;
  let w =
    S !== undefined && !S.isJson && settingsFilePathForSource !== undefined
      ? await userSettingsEnablement(settingsFilePathForSource, n, r)
      : "off";
  let L =
    y === "off" && e === "policySettings" && getPolicySettingsLoadErrors().some(isBlockingPolicyLoadError)
      ? "unreadable"
      : y;
  let G = maxReadback(L, S?.readsBack ?? "off");
  let q = maxReadback(G, w);
  return q === "off"
    ? undefined
    : {
        source: e,
        file: settingsFilePathForSource ?? e,
        readsBack: q,
        ...(q !== G && {
          onDiskNow: true,
        }),
        ...(S?.readsBack === "unreadable" &&
          q === "unreadable" &&
          w !== "unreadable" && {
            fromMemory: true,
          }),
      };
}
//@ chunk-e6aww6q8.js:4214383-4215921 placement
/**
 * 列出卸载时需要检查的设置文件（settings.json、settings.local.json、附加目录）。
 */
async function listUninstallSettingsFiles(e, n = [], r = []) {
  invalidateCommandNames();
  let s = isWorkspaceRestricted() ? [] : r.filter((ke) => realpathAllowMissing_2(ke));
  let h = [
    ...UNINSTALL_SETTING_SOURCES.flatMap((ke) =>
      settingsPathsForSource(ke).map((we) => [ke, we, isWorkspaceRestrictedSource(ke)]),
    ),
    ...getAdditionalDirectoriesForClaudeMd().flatMap((ke) =>
      ["settings.json", "settings.local.json"].map((we) => ["addDir", join(ke, ".claude", we), false]),
    ),
    ...r
      .filter((ke) => !s.includes(ke))
      .flatMap((ke) =>
        ["settings.json", "settings.local.json"].map((we) => [
          "otherFolder",
          join(ke, ".claude", we),
          isWorkspaceRestricted(),
        ]),
      ),
  ];
  let y = [];
  let S = new Set();
  let w = new Set();
  let L = new Set();
  let G = new Set();
  let q = [];
  let Z = [];
  for (let [ke, we, Ee] of h) {
    if (ke === "otherFolder" && !Ee && realpathAllowMissing_2(we)) {
      q.push(we);
      continue;
    }
    if (S.has(we) || L.has(we) || (Ee && w.has(we))) continue;
    if (Ee) w.add(we);
    else S.add(we);
    if (ke === "userSettings" && r.length > 0) {
      let Ie = safeResolvePath(getFsImplementation(), we);
      if (Ie.isCanonical) L.add(Ie.resolvedPath);
    }
    let Ae = await settingsFileEnablement(ke, we, Ee, e, n);
    if ("notRead" in Ae) {
      G.add(we);
      y.push({
        source: ke,
        file: we,
        readsBack: "not-read-here",
        notReadBecause: "network-path",
        notReadWhy: Ae.notRead,
      });
      continue;
    }
    if (ke !== "otherFolder") Z.push(we);
    if (Ae.route !== undefined) {
      if (L.has(Ae.route)) continue;
      L.add(Ae.route);
    }
    G.add(we);
    if (Ae.readsBack !== "off")
      y.push({
        source: ke,
        file: we,
        readsBack: Ae.readsBack,
      });
  }
  let Se = q.length > 0 ? new Set(Z.flatMap((ke) => projectSettingsIdentity(ke) ?? [])) : undefined;
  for (let ke of [
    ...s.flatMap((we) => ["settings.json", "settings.local.json"].map((Ee) => join(we, ".claude", Ee))),
    ...q.filter((we) => {
      let Ee = projectSettingsIdentity(we);
      return Ee === undefined || !Se?.has(Ee);
    }),
  ]) {
    if (G.has(ke) || L.has(ke)) continue;
    G.add(ke);
    y.push({
      source: "otherFolder",
      file: ke,
      readsBack: "not-read-here",
      notReadBecause: "network-path",
    });
  }
  for (let ke of ["policySettings", "flagSettings"]) {
    let we = await sourceEnablementEntry(ke, e, n);
    if (we !== undefined) y.push(we);
  }
  return y;
}
//@ chunk-e6aww6q8.js:4215921-4218439 placement
/**
 * 卸载插件时扫描各设置源（本地、项目、用户、附加目录）中对该插件的启用项。
 */
async function scanSettingsForPluginUninstall(e, installedOthers, r, s) {
  let h = s.theSessions === undefined ? undefined : join(s.theSessions);
  let y = join(s.byAFreshWalk);
  let S = uniq([...(h === undefined ? [] : [h]), y]);
  let w = uniq([...r, ...S.map((At) => join(At, "..", ".."))]);
  let L = await listUninstallSettingsFiles(e, installedOthers, w);
  let G = isWorkspaceRestricted();
  let q = new Map();
  let Z = (At) => {
    let It = q.get(At);
    if (It === undefined) {
      It = realpathAllowMissing_2(At);
      q.set(At, It);
    }
    return It;
  };
  let Se = new Map();
  let ke = (At) => {
    let It = Se.get(At);
    if (It === undefined) {
      let Yt = safeResolvePath(getFsImplementation(), At);
      It = Yt.isCanonical ? Yt.resolvedPath : At;
      Se.set(At, It);
    }
    return It;
  };
  let we = new Set(L.filter((At) => At.readsBack === "not-read-here").map((At) => At.file));
  let Ee = new Map();
  let Ae = (At) => {
    if (G) return ke(At);
    if (Z(dirname(dirname(At)))) return At;
    if (Z(At)) {
      let It = projectSettingsIdentity(At);
      return It === undefined ? At : (Ee.get(It) ?? It);
    }
    return ke(At);
  };
  if (!G)
    for (let At of [...L.filter((It) => It.source !== "otherFolder").map((It) => It.file), ...S]) {
      if (we.has(At) || Z(dirname(dirname(At)))) continue;
      let It = projectSettingsIdentity(At);
      if (It !== undefined && !Ee.has(It)) Ee.set(It, Ae(At));
    }
  let Ie = "\x00not read\x00";
  let Me = (At) => (At.readsBack === "not-read-here" ? Ie + At.file : Ae(At.file));
  let We = (At) => (we.has(At) ? Ie + At : Ae(At));
  let ze = new Set(S.map(We));
  let lt = h === undefined ? undefined : We(h);
  let Je = We(y);
  let nt = new Map();
  let pt = new Map();
  for (let At of L) {
    let It = Me(At);
    let Yt = {
      said: At,
      ...(ze.has(It)
        ? {
            alsoThisLaunchs: "localSettings",
          }
        : At.source === "localSettings"
          ? {
              alsoThisLaunchs: "legacyLocalSettings",
            }
          : At.source === "projectSettings"
            ? {
                alsoThisLaunchs: "projectSettings",
              }
            : {}),
    };
    if (!nt.has(It)) nt.set(It, Yt);
    if (At.readsBack !== "not-read-here" && !pt.has(At.file)) pt.set(At.file, Yt);
  }
  let Et = (At, It) => {
    let Yt = nt.get(Ie + It);
    if (G) return nt.get(It) ?? pt.get(It) ?? Yt;
    if (Z(At)) return Yt ?? pt.get(It) ?? nt.get(It);
    if (Z(It)) return Yt ?? nt.get(Ae(It));
    if (
      Yt === undefined ||
      (Yt.said.notReadBecause === "network-path" &&
        Yt.said.notReadWhy === undefined &&
        w.some((qt) => qt !== At && Z(qt) && join(qt, ".claude", basename(It)) === It))
    )
      return nt.get(ke(It));
    return Yt;
  };
  let yt = new Map();
  for (let At of r)
    yt.set(
      At,
      ["settings.json", "settings.local.json"].flatMap((It) => {
        let Yt = join(At, ".claude", It);
        let qt = Et(At, Yt);
        return qt === undefined
          ? []
          : [
              {
                file: Yt,
                readsBack: qt.said.readsBack,
                ...(qt.said.notReadBecause !== undefined && {
                  notReadBecause: qt.said.notReadBecause,
                }),
                ...(qt.alsoThisLaunchs !== undefined && {
                  alsoThisLaunchs: qt.alsoThisLaunchs,
                }),
              },
            ];
      }),
    );
  let found = L.find((At) => At.source === "localSettings" && !ze.has(Me(At)));
  return {
    byFolder: yt,
    thisLaunchsLocalFile: lt === undefined ? undefined : nt.get(lt)?.said.readsBack,
    thisLaunchsLocalFileByAFreshWalk: Je === lt ? undefined : nt.get(Je)?.said.readsBack,
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
    thisLaunchsProjectFileOn: L.find((At) => At.source === "projectSettings" && At.readsBack === "on")?.file,
  };
}
//@ chunk-e6aww6q8.js:4218439-4219767 placement
/**
 * 决定卸载时对插件数据目录与选项的处理方式。
 */
async function decideUninstallDataAction(
  pluginId,
  { deleteDataDir, installedIds, storageV5, credentials },
  y,
) {
  let S = false;
  S = isOfficialPluginDirectoryId(pluginId);
  let w = [];
  let L = (Se) => deletePluginOptions(Se, storageV5, credentials, w);
  let G;
  if (S && installedIds !== "unknown") {
    let Se = new Set(installedIds);
    G = Se.has(pluginId) ? pluginId : [...Se].find((ke) => isSamePluginDirName(ke, pluginId));
  }
  let q = {
    kind: "options-and-folder",
  };
  q = decideDirectoryReleasePlan({
    isDirectoryId: S,
    ...y,
    installs:
      installedIds === "unknown"
        ? "unknown"
        : {
            thisIdHasRecord: G === pluginId,
            otherInstalledIdNamesFolder: G !== undefined && G !== pluginId,
          },
  });
  if (q.kind === "nothing")
    return {
      optionsGone: false,
      dataGone: false,
      optionsNotGoneBecause: w,
      ...(q.reason === "installs-unknown" && {
        installsUnknown: true,
      }),
      ...(q.reason === "record-reappeared" &&
        G !== undefined && {
          liveHolder: G,
        }),
      plan: q,
    };
  let Z = await L(pluginId);
  if (q.kind === "own-options-only")
    return {
      optionsGone: Z,
      dataGone: false,
      optionsNotGoneBecause: w,
      ...(G !== undefined && {
        liveHolder: G,
      }),
      plan: q,
    };
  if (q.kind === "everything-of-the-name") {
    let Se = true;
    let ke = await listStoredPluginOptionKeys(credentials);
    if (ke.unreadable.length > 0) {
      Z = false;
      for (let Ae of ke.unreadable) if (!w.includes(Ae)) w.push(Ae);
    }
    for (let Ae of findBindingKeysFor(ke.ids, pluginId)) if (Ae !== pluginId) Z = (await L(Ae)) && Z;
    let pluginDataDirs = await findPluginDataDirs(pluginId);
    let Ee = pluginDataDirPath(pluginId);
    for (let Ae of deleteDataDir ? uniq([Ee, ...(pluginDataDirs ?? [])]) : [])
      await removeDirectoryTreeNoFollow_2(Ae).catch((error) => {
        logForDebugging(`Failed to delete plugin data dir ${Ae}: ${errorMessage(error)}`, {
          level: "warn",
        });
      });
    Se = pluginDataDirs !== undefined && (await isMarketplaceGone(pluginId));
    for (let Ae of pluginDataDirs ?? []) Se = (await isPathGone(Ae)) && Se;
    return {
      optionsGone: Z,
      dataGone: Se,
      optionsNotGoneBecause: w,
      plan: q,
    };
  }
  return {
    optionsGone: Z,
    dataGone: !deleteDataDir || (await deletePluginDataDir(pluginId)) !== "failed",
    optionsNotGoneBecause: w,
    plan: q,
  };
}
//@ chunk-e6aww6q8.js:4219767-4219859 placement
/**
 * 按允许列表过滤（unknown 表示不过滤）。
 */
function filterByList(installedOthers, n) {
  if (n === "unknown") return installedOthers;
  let r = new Set(n);
  return installedOthers.filter((s) => r.has(s));
}
//@ chunk-e6aww6q8.js:4219859-4220320 placement
/**
 * 规划卸载后的清理：列出仍启用该插件的设置文件与目录名绑定状态，决定选项/数据目录的删除计划，并在需要时释放目录绑定。
 */
async function planUninstallCleanup(
  e,
  { deleteDataDir, installedIds, installedOthers = [], storageV5, credentials },
) {
  let S = [];
  let w = "none";
  let L = installedIds === "unknown" ? installedIds : [...installedIds];
  if (isOfficialPluginDirectoryId(e)) {
    S = await listUninstallSettingsFiles(e, filterByList(installedOthers, L));
    if (S.length > 0) w = await releaseDirectoryBinding(e, false);
  }
  let G = await decideUninstallDataAction(
    e,
    {
      deleteDataDir,
      installedIds: L,
      storageV5,
      credentials,
    },
    {
      stillSwitchedOn: S.length > 0,
      entry: w,
    },
  );
  let entry =
    G.plan.kind === "nothing" && G.plan.reason === "still-switched-on"
      ? w
      : await releaseDirectoryBinding(e, G.optionsGone && G.dataGone);
  return {
    ...G,
    stillOn: S,
    entry,
  };
}
//@ chunk-e6aww6q8.js:4220320-4220767 placement
/**
 * 根据插件安装状态决定卸载时可删除的范围：仅选项与目录、什么都不删（仍启用、安装记录未知或重新出现）、只删自己的选项，或删除该名下的全部内容。
 */
function decideDirectoryReleasePlan(e) {
  if (!e.isDirectoryId)
    return {
      kind: "options-and-folder",
    };
  if (e.stillSwitchedOn && e.entry !== "none")
    return {
      kind: "nothing",
      reason: "still-switched-on",
    };
  if (e.installs === "unknown")
    return {
      kind: "nothing",
      reason: "installs-unknown",
    };
  if (e.installs.thisIdHasRecord)
    return {
      kind: "nothing",
      reason: "record-reappeared",
    };
  if (e.installs.otherInstalledIdNamesFolder)
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
