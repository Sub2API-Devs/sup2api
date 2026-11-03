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
  join as join_13,
  join as join_14,
  join as join_15,
  join as join_16,
  join as join_17,
  join as join_18,
  join as join_19,
  join as join_20,
  join as join_21,
  join as join_22,
  join as join_23,
  join as join_24,
  join as join_25,
  join as join_26,
  join as join_27,
  join as join_28,
  join as join_29,
  join as join_30,
  join as join_31,
  join as join_32,
  join as join_33,
  join as join_34,
  join as join_35,
  join as join_36,
  join as join_37,
  join as join_38,
  join as join_40,
  join as join_41,
  join as join_42,
  join as join_43,
  join as join_44,
  join as join_45,
  join as join_46,
  join as join_47,
  join as join_48,
  join as join_49,
  join as join_50,
  join as join_51,
  join as join_52,
  join as join_53,
  join as join_54,
  join as join_55,
  join as join_56,
  join as join_57,
  join as join_58,
  join as join_59,
  join as join_60,
  join as join_61,
  join as join_62,
  join as join_63,
  join as join_64,
  join as join_65,
  join as join_66,
  join as join_67,
  join as join_68,
  join as join_69,
  join as join_70,
  join as join_71,
  join as join_72,
  join as join_73,
  join as join_74,
  join as join_75,
  join as join_76,
  join as join_77,
  join as join_78,
  join as join_79,
  join as join_80,
  join as join_81,
  join as join_82,
  join as join_84,
  join as join_85,
  join as join_86,
  join as join_87,
  join as join_88,
  join as join_89,
  join as join_90,
  join as join_91,
  join as join_92,
  join as join_93,
  join as join_94,
  join as join_95,
  join as join_96,
  join as join_97,
  join as join_98,
  join as join_99,
  join as join_100,
  join as join_101,
  join as join_102,
  join as join_103,
  join as join_104,
  join as join_105,
  join as join_106,
  join as join_107,
  join as join_108,
  join as join_109,
  join as join_110,
  join as join_111,
  join as join_112,
  join as join_113,
  join as join_114,
  join as join_115,
  join as join_116,
  join as join_117,
  join as join_118,
  join as join_119,
  join as join_120,
  join as join_121,
  join as join_122,
  join as join_123,
  join as join_124,
  join as join_125,
  join as join_126,
  join as join_127,
  join as join_128,
  join as join_129,
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
  basename,
  basename as basename_2,
  basename as basename_3,
  basename as basename_4,
  basename as basename_5,
  basename as basename_6,
  basename as basename_7,
  basename as basename_8,
  basename as basename_9,
  basename as basename_10,
  basename as basename_11,
  basename as basename_12,
  basename as basename_13,
  basename as basename_14,
  basename as basename_15,
  basename as basename_16,
  basename as basename_17,
  basename as basename_18,
  basename as basename_19,
  basename as basename_20,
  basename as basename_21,
  basename as basename_22,
  basename as basename_23,
  basename as basename_24,
  basename as basename_25,
  basename as basename_26,
  basename as basename_27,
  basename as basename_28,
  basename as basename_29,
  basename as basename_30,
  basename as basename_31,
  basename as basename_32,
  basename as basename_33,
  basename as basename_34,
  basename as basename_35,
  basename as basename_36,
  basename as basename_37,
  basename as basename_38,
  basename as basename_39,
  basename as basename_40,
  basename as basename_41,
  basename as basename_42,
  basename as basename_43,
  basename as basename_45,
  basename as basename_46,
  basename as basename_47,
  basename as basename_48,
  basename as basename_49,
  basename as basename_50,
  basename as basename_51,
  basename as basename_52,
  basename as basename_53,
  basename as basename_54,
  basename as basename_55,
  basename as basename_56,
  basename as basename_57,
  basename as basename_58,
  basename as basename_59,
  basename as basename_60,
  basename as basename_61,
  basename as basename_62,
  basename as basename_63,
  basename as basename_64,
  basename as basename_65,
  basename as basename_66,
  basename as basename_67,
  basename as basename_68,
} from "path";
import {
  lstat,
  lstat as lstat_2,
  lstat as lstat_3,
  lstat as lstat_4,
  lstat as lstat_5,
  lstat as lstat_6,
  lstat as lstat_7,
  lstat as lstat_8,
  lstat as lstat_9,
  lstat as lstat_10,
  lstat as lstat_11,
  lstat as lstat_12,
  lstat as lstat_13,
  lstat as lstat_14,
  lstat as lstat_15,
  lstat as lstat_16,
  lstat as lstat_17,
  lstat as lstat_18,
  lstat as lstat_19,
  lstat as lstat_20,
  lstat as lstat_21,
  lstat as lstat_22,
  lstat as lstat_23,
  lstat as lstat_24,
  lstat as lstat_25,
  lstat as lstat_26,
  lstat as lstat_27,
  lstat as lstat_28,
  lstat as lstat_29,
  lstat as lstat_30,
  lstat as lstat_31,
  lstat as lstat_32,
  lstat as lstat_33,
  lstat as lstat_34,
  lstat as lstat_35,
  lstat as lstat_36,
  lstat as lstat_37,
  lstat as lstat_38,
  lstat as lstat_39,
  lstat as lstat_40,
  lstat as lstat_41,
  lstat as lstat_42,
  lstat as lstat_43,
  stat,
  stat as stat_2,
  stat as stat_3,
  stat as stat_4,
  stat as stat_5,
  stat as stat_6,
  stat as stat_7,
  stat as stat_8,
  stat as stat_9,
  stat as stat_10,
  stat as stat_11,
  stat as stat_12,
  stat as stat_13,
  stat as stat_14,
  stat as stat_15,
  stat as stat_16,
  stat as stat_17,
  stat as stat_18,
  stat as stat_19,
  stat as stat_20,
  stat as stat_21,
  stat as stat_22,
} from "fs/promises";
import { K7t, realpathAllowMissing as realpathAllowMissing_2 } from "../../utils/pathResolution.js";
import {
  repoSettingsRefusalReason,
  vetRepoSettingsPathAsync,
  getFsImplementation,
  safeResolvePath,
} from "../../utils/fsOperations.js";
import { isInClaudeConfigHome, parseSettingsContent } from "../../utils/settings/settingsFileParsing.js";
import { isUnderNetworkDirCached, Ya } from "../../utils/networkPaths.js";
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
import { isPlainObject as isPlainObject_4 } from "../../utils/isPlainObject.js";
import { pathPresence } from "../../utils/fsSafety/atomicWriteStaging.js";
import { or } from "../../utils/settings/commandSyncNames.js";
import { findPluginName, pluginNamesEqual } from "../../utils/plugins/pluginIdentifier.js";
import { uniq } from "../../utils/collections.js";
import {
  findBindingKeysFor,
  VS,
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
import { removeDirectoryTreeNoFollow } from "../../utils/fsRemove.js";

//@ chunk-e6aww6q8.js:4206869-4206919 placement
var cIe = ["off", "not-read-here", "unreadable", "on"];
//@ chunk-e6aww6q8.js:4206919-4206991 placement
function zGr(e) {
  let n = join_117(e),
    r = dirname_69(n);
  return K7t(dirname_69(r), join_117(basename_62(r), basename_62(n)));
}
//@ chunk-e6aww6q8.js:4206991-4207101 placement
function vetRefusalKind(e) {
  let n = repoSettingsRefusalReason(e);
  return n === "network" ? "vet-network" : n === "unexamined" ? "vet-unexamined" : "vet-other";
}
/**
 * 安全读取仓库内设置文件的字节：先审查路径（链接、跨越、特殊文件），按审查结果做绑定读取；文件不存在返回 absent（区分是否位于指向空处的链接下），不能安全读取时返回 refused 及原因，成功返回 bytes 与实际路径。
 */
//@ chunk-e6aww6q8.js:4207101-4208563 placement
async function readRepoSettingsBytes(filePath) {
  let vetted;
  if (!isInClaudeConfigHome(filePath))
    try {
      vetted = await vetRepoSettingsPathAsync(getFsImplementation(), filePath, { fileIdentity: !0 });
    } catch (error) {
      return { kind: "refused", why: vetRefusalKind(error) };
    }
  let bound =
      vetted?.resolvedPath === filePath && isUnderNetworkDirCached(filePath) && !Ya(filePath)
        ? vetted
        : void 0,
    linkTarget = bound?.linksResolvedPath;
  if (bound !== void 0 && linkTarget === void 0) {
    let absentAt = bound.absentAt;
    return absentAt === void 0
      ? { kind: "refused", why: "unbound" }
      : {
          kind: "absent",
          belowALinkToNothing: absentAt.fromLinkTarget,
          ...(absentAt.notAFolder && { notAFolder: !0 }),
        };
  }
  if (zGr(filePath)) return { kind: "refused", why: "suspect-link" };
  if (linkTarget !== void 0) {
    if (isSpecialPath(linkTarget)) return { kind: "refused", why: "crossing" };
    let L;
    try {
      L = openBoundRead(linkTarget, !0, MAX_SETTINGS_JSON_BYTES, linkTarget !== filePath, vetted?.identity);
    } catch (error) {
      if (isENOENT(error) || getErrnoCode(error) === "ENOTDIR") return { kind: "refused", why: "unbound" };
      throw error;
    }
    return L === null || vetted?.noFileSeen === !0
      ? { kind: "refused", why: "unbound" }
      : { kind: "bytes", content: L, route: linkTarget };
  }
  let {
    resolvedPath: resolvedPath,
    isSymlink: isSymlink,
    isCanonical: isCanonical,
  } = safeResolvePath(getFsImplementation(), filePath);
  if (isSymlink && (!isCanonical || isSpecialPath(resolvedPath))) return { kind: "refused", why: "crossing" };
  let content;
  try {
    content = openBoundRead(resolvedPath, isCanonical, MAX_SETTINGS_JSON_BYTES, isSymlink, vetted?.identity);
  } catch (error) {
    if (vetted !== void 0 && (isENOENT(error) || getErrnoCode(error) === "ENOTDIR")) {
      if (vetted.linksResolvedPath !== void 0) return { kind: "refused", why: "unbound" };
      let G = isBoundReadError(error),
        q = vetted;
      if (!G && q.absentAt?.fromLinkTarget !== !0)
        try {
          q = await vetRepoSettingsPathAsync(getFsImplementation(), filePath);
        } catch (error) {
          return { kind: "refused", why: vetRefusalKind(error) };
        }
      if (q.absentAt !== void 0)
        return {
          kind: "absent",
          belowALinkToNothing: q.absentAt.fromLinkTarget || G,
          ...(q.absentAt.notAFolder && { notAFolder: !0 }),
        };
      return q.linksResolvedPath !== void 0
        ? { kind: "refused", why: "unbound" }
        : { kind: "absent", belowALinkToNothing: G };
    }
    throw error;
  }
  return content === null || vetted?.noFileSeen === !0
    ? { kind: "refused", why: "unbound" }
    : { kind: "bytes", content: content, ...(isCanonical && { route: resolvedPath }) };
}
//@ chunk-e6aww6q8.js:4208563-4208602 placement
function $wt(e) {
  return isWorkspaceRestricted() && REPO_DIR_SETTING_SOURCES.has(e);
}
//@ chunk-e6aww6q8.js:4208602-4208670 placement
function U3s(e) {
  return REPO_DIR_SETTING_SOURCES.has(e) && !$wt(e) && uut(e).some((n) => zGr(n));
}
//@ chunk-e6aww6q8.js:4208670-4208757 placement = _temp8 (1)
function uut(a_3) {
  return [
    getSettingsFilePathForSource(a_3),
    ...(a_3 === "localSettings" ? [getLegacyLocalSettingsFilePath()] : []),
  ].filter((n) => n !== void 0);
}
//@ chunk-e6aww6q8.js:4208757-4208961 placement = isRealPathWithinTeamDir (0.785)
async function isRealPathWithinTeamDir_3(realCandidate) {
  for (let n = dirname_69(realCandidate); ; n = dirname_69(n))
    try {
      if (!(await lstat_36(n)).isSymbolicLink()) return !1;
      return await stat_22(n).then(
        () => !1,
        () => !0,
      );
    } catch (error) {
      if (!isENOENT(error) && getErrnoCode(error) !== "ENOTDIR") return !0;
      if (dirname_69(n) === n) return !1;
    }
}
/**
 * 读取用户设置文件里某插件的启用状态：缓存解析失败时安全地重新读取文件，返回 on/off/unreadable。
 */
//@ chunk-e6aww6q8.js:4208961-4209347 placement
async function userSettingsEnablement(e, n, r) {
  let settings = parseSettingsFile(e).settings;
  if (settings === null) {
    let h;
    try {
      h = isInClaudeConfigHome(e)
        ? e
        : (await vetRepoSettingsPathAsync(getFsImplementation(), e)).resolvedPath;
    } catch (error) {
      return (
        logForDebugging(
          `Did not read settings file ${e}, so it counts as one that may still switch ${n} on: ${errorMessage(error)}`,
          { level: "error" },
        ),
        "unreadable"
      );
    }
    try {
      let { content: content } = await readFileChecked(h, MAX_SETTINGS_JSON_BYTES);
      settings = safeParseJSON(content, !1);
    } catch (error) {
      return missingFileEnablement(h, error);
    }
  }
  if (!isPlainObject_4(settings)) return "unreadable";
  return enabledPluginsState(settings.enabledPlugins, n, r);
}
//@ chunk-e6aww6q8.js:4209347-4209482 placement
async function settingsFileEnablement(e, n, r, s, h) {
  if (r) return { readsBack: "not-read-here" };
  return e === "userSettings"
    ? { readsBack: await userSettingsEnablement(n, s, h) }
    : repoSettingsEnablement(n, s, h);
}
//@ chunk-e6aww6q8.js:4209482-4209613 placement
async function missingFileEnablement(e, n) {
  if (isENOENT(n) || getErrnoCode(n) === "ENOTDIR")
    return (await pathPresence(e)) === "gone" && !(await isRealPathWithinTeamDir_3(e)) ? "off" : "unreadable";
  return "unreadable";
}
/**
 * 读取仓库内设置文件里某插件的启用状态：路径审查不通过返回 notRead 原因，文件不存在视为 off，并附带实际读取路径。
 */
//@ chunk-e6aww6q8.js:4209613-4210046 placement
async function repoSettingsEnablement(e, n, r) {
  let s, h;
  try {
    let S = await readRepoSettingsBytes(e);
    if (S.kind === "refused")
      return (
        logForDebugging(`Plugin uninstall: settings file ${e} was not read (${S.why})`),
        { notRead: S.why }
      );
    if (S.kind === "absent") return { readsBack: S.belowALinkToNothing ? "unreadable" : "off" };
    ((s = S.content), (h = S.route));
  } catch (error) {
    return { readsBack: await missingFileEnablement(e, error) };
  }
  let y = parseSettingsContent(s, e).settings ?? safeParseJSON(s, !1);
  return {
    readsBack: !isPlainObject_4(y) ? "unreadable" : enabledPluginsState(y.enabledPlugins, n, r),
    ...(h !== void 0 && { route: h }),
  };
}
//@ chunk-e6aww6q8.js:4210046-4210198 placement
function enabledPluginsState(e, n, r) {
  if (e === void 0) return "off";
  if (!isPlainObject_4(e)) return "unreadable";
  return enabledPluginKeys(e, n, r).some((s) => e[s] !== void 0 && e[s] !== null && e[s] !== !1)
    ? "on"
    : "off";
}
//@ chunk-e6aww6q8.js:4210198-4210257 placement
function lut(e, n) {
  return cIe.indexOf(n) > cIe.indexOf(e) ? n : e;
}
//@ chunk-e6aww6q8.js:4210257-4210520 placement
function flagSettingsEnablement(e, n, r) {
  let s = getFlagSettingsExpectedContent(),
    h = getFlagSettingsFilePinnedContent(),
    y = (G) => (isPlainObject_4(G) ? enabledPluginsState(G.enabledPlugins, e, n) : "unreadable"),
    S = s ?? h,
    w =
      S === void 0 ||
      S.trim() === "" ||
      (s === void 0 && (r === void 0 || parseSettingsFile(r, S).settings === null))
        ? "off"
        : y(safeParseJSON(S, !1)),
    L = getFlagSettingsInline();
  return { readsBack: lut(w, L !== null ? y(L) : "off"), isJson: s !== void 0 };
}
/**
 * 在某设置来源的所有文件中找出启用该插件的状态最"强"的文件；有文件未能读取时返回未读文件列表与原因。
 */
//@ chunk-e6aww6q8.js:4210520-4210813 placement
async function findEnablingSettingsFile(e, n, r = []) {
  or();
  let s = { readsBack: "off" },
    h = [],
    y;
  for (let S of uut(e)) {
    let w = await settingsFileEnablement(e, S, $wt(e), n, r);
    if ("notRead" in w) {
      (h.push(S), (y ??= w.notRead));
      continue;
    }
    if (cIe.indexOf(w.readsBack) > cIe.indexOf(s.readsBack)) s = { readsBack: w.readsBack, file: S };
  }
  return y !== void 0 ? { notRead: h, why: y } : s;
}
/**
 * 找出 enabledPlugins 中与插件 id 对应的所有键（含大小写/别名变体），排除属于其他已安装插件的键。
 */
//@ chunk-e6aww6q8.js:4210813-4210957 placement
function enabledPluginKeys(e, n, r = []) {
  let keys = Object.keys(e ?? {}),
    h = findPluginName(keys, n);
  return uniq([...findBindingKeysFor(keys, n), ...(h === void 0 ? [] : [h])]).filter(
    (y) => y === n || !r.some((S) => pluginNamesEqual(S, y)),
  );
}
//@ chunk-e6aww6q8.js:4210957-4211007 placement
async function Ags(e) {
  return (await pathPresence(e)) === "gone";
}
//@ chunk-e6aww6q8.js:4211007-4211066 placement
var Pgs = ["userSettings", "localSettings", "projectSettings"];
/**
 * 描述无法写入的设置来源（托管设置、--settings 传入等）及原因。
 */
//@ chunk-e6aww6q8.js:4211066-4212586 placement
function describeUnwritableSettingsSource({
  source: source,
  file: file,
  readsBack: readsBack,
  notReadBecause: notReadBecause,
  fromMemory: fromMemory,
  onDiskNow: onDiskNow,
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
/**
 * 部分设置文件因位于网络路径而未能读取时，生成补救提示：路径在检查期间变化可以重试；若是指向其他机器的链接，建议换成真实文件或从真实位置启动 Claude Code。
 */
//@ chunk-e6aww6q8.js:4212586-4213599 placement
function networkPathRetryHint(entries, action) {
  let networkEntries = entries.filter((S) => S.notReadBecause === "network-path");
  if (networkEntries.length === 0) return;
  let step =
      networkEntries.length < entries.length
        ? `switch it off in the other settings named here and ${action}`
        : action,
    linkEntries = networkEntries.filter(
      ({ notReadWhy: notReadWhy }) =>
        notReadWhy === void 0 ||
        notReadWhy === "vet-network" ||
        notReadWhy === "suspect-link" ||
        notReadWhy === "crossing",
    );
  if (linkEntries.length === 0)
    return `Try to ${step}: if the path to a file that was not read changed during the check, that will work. If you see this again, that path cannot be checked, and trying again will not help`;
  return `If a file that was not read, its ".claude" folder or a folder above them is a link to another machine, replace the link with a real file or folder, or ${linkEntries.every(({ source: source }) => source === "projectSettings" || source === "localSettings") ? "start Claude Code from the folder's real location" : "use the real location instead of the link when you start Claude Code or add a directory (for example with --add-dir)"}. Then ${step}${linkEntries.length < networkEntries.length ? ". If you see this again with no such link, a path cannot be checked, and trying again will not help" : ""}`;
}
//@ chunk-e6aww6q8.js:4213599-4213777 placement
function isBlockingPolicyLoadError(e) {
  if (e.file === PARENT_MANAGED_SETTINGS_SOURCE_LABEL) return !1;
  return (
    e.severity !== "warning" ||
    (e.userWritable !== !0 &&
      e.wslIgnored !== !0 &&
      (e.path === "enabledPlugins" || e.path.startsWith("enabledPlugins.")))
  );
}
//@ chunk-e6aww6q8.js:4213777-4213910 placement
function projectSettingsIdentity(e) {
  if (basename_62(dirname_69(e)) !== ".claude") return;
  let n = dirname_69(dirname_69(e)),
    r = safeResolvePath(getFsImplementation(), n);
  return `${r.isCanonical ? r.resolvedPath : n}\x00${basename_62(e)}`;
}
/**
 * 计算某设置来源对插件的启用状态条目：合并内存中的设置、flag 设置与磁盘内容，策略设置加载出错时视为不可读；未启用返回 undefined。
 */
//@ chunk-e6aww6q8.js:4213910-4214383 placement
async function sourceEnablementEntry(e, n, r = []) {
  let s = getSettingsForSource(e),
    h = getSettingsFilePathForSource(e),
    y = s !== null && s !== void 0 ? enabledPluginsState(s.enabledPlugins, n, r) : "off",
    S = e === "flagSettings" ? flagSettingsEnablement(n, r, h) : void 0,
    w = S !== void 0 && !S.isJson && h !== void 0 ? await userSettingsEnablement(h, n, r) : "off",
    L =
      y === "off" && e === "policySettings" && getPolicySettingsLoadErrors().some(isBlockingPolicyLoadError)
        ? "unreadable"
        : y,
    G = lut(L, S?.readsBack ?? "off"),
    q = lut(G, w);
  return q === "off"
    ? void 0
    : {
        source: e,
        file: h ?? e,
        readsBack: q,
        ...(q !== G && { onDiskNow: !0 }),
        ...(S?.readsBack === "unreadable" && q === "unreadable" && w !== "unreadable" && { fromMemory: !0 }),
      };
}
/**
 * 列出卸载时需要检查的设置文件（settings.json、settings.local.json、附加目录）。
 */
//@ chunk-e6aww6q8.js:4214383-4215921 placement
async function listUninstallSettingsFiles(e, n = [], r = []) {
  or();
  let s = isWorkspaceRestricted() ? [] : r.filter((ke) => realpathAllowMissing_2(ke)),
    h = [
      ...Pgs.flatMap((ke) => uut(ke).map((we) => [ke, we, $wt(ke)])),
      ...getAdditionalDirectoriesForClaudeMd().flatMap((ke) =>
        ["settings.json", "settings.local.json"].map((we) => ["addDir", join_117(ke, ".claude", we), !1]),
      ),
      ...r
        .filter((ke) => !s.includes(ke))
        .flatMap((ke) =>
          ["settings.json", "settings.local.json"].map((we) => [
            "otherFolder",
            join_117(ke, ".claude", we),
            isWorkspaceRestricted(),
          ]),
        ),
    ],
    y = [],
    S = new Set(),
    w = new Set(),
    L = new Set(),
    G = new Set(),
    q = [],
    Z = [];
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
      (G.add(we),
        y.push({
          source: ke,
          file: we,
          readsBack: "not-read-here",
          notReadBecause: "network-path",
          notReadWhy: Ae.notRead,
        }));
      continue;
    }
    if (ke !== "otherFolder") Z.push(we);
    if (Ae.route !== void 0) {
      if (L.has(Ae.route)) continue;
      L.add(Ae.route);
    }
    if ((G.add(we), Ae.readsBack !== "off")) y.push({ source: ke, file: we, readsBack: Ae.readsBack });
  }
  let Se = q.length > 0 ? new Set(Z.flatMap((ke) => projectSettingsIdentity(ke) ?? [])) : void 0;
  for (let ke of [
    ...s.flatMap((we) => ["settings.json", "settings.local.json"].map((Ee) => join_117(we, ".claude", Ee))),
    ...q.filter((we) => {
      let Ee = projectSettingsIdentity(we);
      return Ee === void 0 || !Se?.has(Ee);
    }),
  ]) {
    if (G.has(ke) || L.has(ke)) continue;
    (G.add(ke),
      y.push({
        source: "otherFolder",
        file: ke,
        readsBack: "not-read-here",
        notReadBecause: "network-path",
      }));
  }
  for (let ke of ["policySettings", "flagSettings"]) {
    let we = await sourceEnablementEntry(ke, e, n);
    if (we !== void 0) y.push(we);
  }
  return y;
}
/**
 * 卸载插件时扫描各设置源（本地、项目、用户、附加目录）中对该插件的启用项。
 */
//@ chunk-e6aww6q8.js:4215921-4218439 placement
async function scanSettingsForPluginUninstall(e, n, r, s) {
  let h = s.theSessions === void 0 ? void 0 : join_117(s.theSessions),
    y = join_117(s.byAFreshWalk),
    S = uniq([...(h === void 0 ? [] : [h]), y]),
    w = uniq([...r, ...S.map((At) => join_117(At, "..", ".."))]),
    L = await listUninstallSettingsFiles(e, n, w),
    G = isWorkspaceRestricted(),
    q = new Map(),
    Z = (At) => {
      let It = q.get(At);
      if (It === void 0) ((It = realpathAllowMissing_2(At)), q.set(At, It));
      return It;
    },
    Se = new Map(),
    ke = (At) => {
      let It = Se.get(At);
      if (It === void 0) {
        let Yt = safeResolvePath(getFsImplementation(), At);
        ((It = Yt.isCanonical ? Yt.resolvedPath : At), Se.set(At, It));
      }
      return It;
    },
    we = new Set(L.filter((At) => At.readsBack === "not-read-here").map((At) => At.file)),
    Ee = new Map(),
    Ae = (At) => {
      if (G) return ke(At);
      if (Z(dirname_69(dirname_69(At)))) return At;
      if (Z(At)) {
        let It = projectSettingsIdentity(At);
        return It === void 0 ? At : (Ee.get(It) ?? It);
      }
      return ke(At);
    };
  if (!G)
    for (let At of [...L.filter((It) => It.source !== "otherFolder").map((It) => It.file), ...S]) {
      if (we.has(At) || Z(dirname_69(dirname_69(At)))) continue;
      let It = projectSettingsIdentity(At);
      if (It !== void 0 && !Ee.has(It)) Ee.set(It, Ae(At));
    }
  let Ie = "\x00not read\x00",
    Me = (At) => (At.readsBack === "not-read-here" ? Ie + At.file : Ae(At.file)),
    We = (At) => (we.has(At) ? Ie + At : Ae(At)),
    ze = new Set(S.map(We)),
    lt = h === void 0 ? void 0 : We(h),
    Je = We(y),
    nt = new Map(),
    pt = new Map();
  for (let At of L) {
    let It = Me(At),
      Yt = {
        said: At,
        ...(ze.has(It)
          ? { alsoThisLaunchs: "localSettings" }
          : At.source === "localSettings"
            ? { alsoThisLaunchs: "legacyLocalSettings" }
            : At.source === "projectSettings"
              ? { alsoThisLaunchs: "projectSettings" }
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
        Yt === void 0 ||
        (Yt.said.notReadBecause === "network-path" &&
          Yt.said.notReadWhy === void 0 &&
          w.some((qt) => qt !== At && Z(qt) && join_117(qt, ".claude", basename_62(It)) === It))
      )
        return nt.get(ke(It));
      return Yt;
    },
    yt = new Map();
  for (let At of r)
    yt.set(
      At,
      ["settings.json", "settings.local.json"].flatMap((It) => {
        let Yt = join_117(At, ".claude", It),
          qt = Et(At, Yt);
        return qt === void 0
          ? []
          : [
              {
                file: Yt,
                readsBack: qt.said.readsBack,
                ...(qt.said.notReadBecause !== void 0 && { notReadBecause: qt.said.notReadBecause }),
                ...(qt.alsoThisLaunchs !== void 0 && { alsoThisLaunchs: qt.alsoThisLaunchs }),
              },
            ];
      }),
    );
  let found = L.find((At) => At.source === "localSettings" && !ze.has(Me(At)));
  return {
    byFolder: yt,
    thisLaunchsLocalFile: lt === void 0 ? void 0 : nt.get(lt)?.said.readsBack,
    thisLaunchsLocalFileByAFreshWalk: Je === lt ? void 0 : nt.get(Je)?.said.readsBack,
    thisLaunchsLegacyLocalFile:
      found === void 0
        ? void 0
        : {
            file: found.file,
            readsBack: found.readsBack,
            ...(found.notReadBecause !== void 0 && { notReadBecause: found.notReadBecause }),
          },
    thisLaunchsProjectFileOn: L.find((At) => At.source === "projectSettings" && At.readsBack === "on")?.file,
  };
}
/**
 * 决定卸载时对插件数据目录与选项的处理方式。
 */
//@ chunk-e6aww6q8.js:4218439-4219767 placement
async function decideUninstallDataAction(
  e,
  {
    deleteDataDir: deleteDataDir,
    installedIds: installedIds,
    storageV5: storageV5,
    credentials: credentials,
  },
  y,
) {
  let S = !1;
  S = VS(e);
  let w = [],
    L = (Se) => deletePluginOptions(Se, storageV5, credentials, w),
    G;
  if (S && installedIds !== "unknown") {
    let Se = new Set(installedIds);
    G = Se.has(e) ? e : [...Se].find((ke) => isSamePluginDirName(ke, e));
  }
  let q = { kind: "options-and-folder" };
  if (
    ((q = decideDirectoryReleasePlan({
      isDirectoryId: S,
      ...y,
      installs:
        installedIds === "unknown"
          ? "unknown"
          : { thisIdHasRecord: G === e, otherInstalledIdNamesFolder: G !== void 0 && G !== e },
    })),
    q.kind === "nothing")
  )
    return {
      optionsGone: !1,
      dataGone: !1,
      optionsNotGoneBecause: w,
      ...(q.reason === "installs-unknown" && { installsUnknown: !0 }),
      ...(q.reason === "record-reappeared" && G !== void 0 && { liveHolder: G }),
      plan: q,
    };
  let Z = await L(e);
  if (q.kind === "own-options-only")
    return {
      optionsGone: Z,
      dataGone: !1,
      optionsNotGoneBecause: w,
      ...(G !== void 0 && { liveHolder: G }),
      plan: q,
    };
  if (q.kind === "everything-of-the-name") {
    let Se = !0,
      ke = await listStoredPluginOptionKeys(credentials);
    if (ke.unreadable.length > 0) {
      Z = !1;
      for (let Ae of ke.unreadable) if (!w.includes(Ae)) w.push(Ae);
    }
    for (let Ae of findBindingKeysFor(ke.ids, e)) if (Ae !== e) Z = (await L(Ae)) && Z;
    let we = await findPluginDataDirs(e),
      Ee = pluginDataDirPath(e);
    for (let Ae of deleteDataDir ? uniq([Ee, ...(we ?? [])]) : [])
      await removeDirectoryTreeNoFollow(Ae).catch((Ie) => {
        logForDebugging(`Failed to delete plugin data dir ${Ae}: ${errorMessage(Ie)}`, { level: "warn" });
      });
    Se = we !== void 0 && (await isMarketplaceGone(e));
    for (let Ae of we ?? []) Se = (await Ags(Ae)) && Se;
    return { optionsGone: Z, dataGone: Se, optionsNotGoneBecause: w, plan: q };
  }
  return {
    optionsGone: Z,
    dataGone: !deleteDataDir || (await deletePluginDataDir(e)) !== "failed",
    optionsNotGoneBecause: w,
    plan: q,
  };
}
//@ chunk-e6aww6q8.js:4219767-4219859 placement
function Ogs(e, n) {
  if (n === "unknown") return e;
  let r = new Set(n);
  return e.filter((s) => r.has(s));
}
/**
 * 规划卸载后的清理：列出仍启用该插件的设置文件与目录名绑定状态，决定选项/数据目录的删除计划，并在需要时释放目录绑定。
 */
//@ chunk-e6aww6q8.js:4219859-4220320 placement
async function planUninstallCleanup(
  e,
  {
    deleteDataDir: deleteDataDir,
    installedIds: installedIds,
    installedOthers: installedOthers = [],
    storageV5: storageV5,
    credentials: credentials,
  },
) {
  let S = [],
    w = "none",
    L = installedIds === "unknown" ? installedIds : [...installedIds];
  if (VS(e)) {
    if (((S = await listUninstallSettingsFiles(e, Ogs(installedOthers, L))), S.length > 0))
      w = await releaseDirectoryBinding(e, !1);
  }
  let G = await decideUninstallDataAction(
      e,
      { deleteDataDir: deleteDataDir, installedIds: L, storageV5: storageV5, credentials: credentials },
      { stillSwitchedOn: S.length > 0, entry: w },
    ),
    q =
      G.plan.kind === "nothing" && G.plan.reason === "still-switched-on"
        ? w
        : await releaseDirectoryBinding(e, G.optionsGone && G.dataGone);
  return { ...G, stillOn: S, entry: q };
}
/**
 * 根据插件安装状态决定卸载时可删除的范围：仅选项与目录、什么都不删（仍启用、安装记录未知或重新出现）、只删自己的选项，或删除该名下的全部内容。
 */
//@ chunk-e6aww6q8.js:4220320-4220767 placement
function decideDirectoryReleasePlan(e) {
  if (!e.isDirectoryId) return { kind: "options-and-folder" };
  if (e.stillSwitchedOn && e.entry !== "none") return { kind: "nothing", reason: "still-switched-on" };
  if (e.installs === "unknown") return { kind: "nothing", reason: "installs-unknown" };
  if (e.installs.thisIdHasRecord) return { kind: "nothing", reason: "record-reappeared" };
  if (e.installs.otherInstalledIdNamesFolder) return { kind: "own-options-only", reason: "live-holder" };
  return { kind: "everything-of-the-name" };
}

export {
  $wt,
  zGr,
  U3s,
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
