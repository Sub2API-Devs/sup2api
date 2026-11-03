/**
 * utils/plugins/pluginDependencies.ts
 *
 * 2.1.316 新增：插件依赖
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (60)
 * attribution: placement 60
 */
import {
  readdir,
  readdir as readdir_2,
  readdir as readdir_3,
  readdir as readdir_4,
  readdir as readdir_5,
  readdir as readdir_6,
  readdir as readdir_7,
  readdir as readdir_8,
  readdir as readdir_9,
  readdir as readdir_10,
  readdir as readdir_11,
  readdir as readdir_12,
  readdir as readdir_13,
  readdir as readdir_14,
  readdir as readdir_15,
  readdir as readdir_16,
  readdir as readdir_17,
  readdir as readdir_18,
  readdir as readdir_19,
  readdir as readdir_20,
  readdir as readdir_21,
  readdir as readdir_22,
  readdir as readdir_23,
  readdir as readdir_24,
  readdir as readdir_25,
  readdir as readdir_26,
  readdir as readdir_27,
  readdir as readdir_28,
  readdir as readdir_29,
  readdir as readdir_30,
  readdir as readdir_31,
  readdir as readdir_32,
  mkdir,
  mkdir as mkdir_2,
  mkdir as mkdir_3,
  mkdir as mkdir_4,
  mkdir as mkdir_5,
  mkdir as mkdir_6,
  mkdir as mkdir_7,
  mkdir as mkdir_8,
  mkdir as mkdir_9,
  mkdir as mkdir_10,
  mkdir as mkdir_11,
  mkdir as mkdir_12,
  mkdir as mkdir_13,
  mkdir as mkdir_14,
  mkdir as mkdir_15,
  mkdir as mkdir_16,
  mkdir as mkdir_17,
  mkdir as mkdir_18,
  mkdir as mkdir_19,
  mkdir as mkdir_20,
  mkdir as mkdir_21,
  mkdir as mkdir_22,
  mkdir as mkdir_23,
  mkdir as mkdir_24,
  mkdir as mkdir_25,
  mkdir as mkdir_26,
  writeFile,
  writeFile as writeFile_2,
  writeFile as writeFile_3,
  writeFile as writeFile_4,
  writeFile as writeFile_5,
  writeFile as writeFile_6,
  writeFile as writeFile_7,
  writeFile as writeFile_8,
  writeFile as writeFile_9,
  writeFile as writeFile_10,
  writeFile as writeFile_11,
  writeFile as writeFile_12,
  writeFile as writeFile_13,
  writeFile as writeFile_14,
  writeFile as writeFile_15,
  writeFile as writeFile_16,
  writeFile as writeFile_17,
  writeFile as writeFile_18,
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
  realpath,
  realpath as realpath_2,
  realpath as realpath_3,
  realpath as realpath_4,
  realpath as realpath_5,
  realpath as realpath_6,
  realpath as realpath_7,
  realpath as realpath_8,
  realpath as realpath_9,
  realpath as realpath_10,
  realpath as realpath_11,
  realpath as realpath_12,
  realpath as realpath_13,
  realpath as realpath_14,
  realpath as realpath_15,
  realpath as realpath_16,
  realpath as realpath_17,
  realpath as realpath_18,
  realpath as realpath_19,
  realpath as realpath_20,
  realpath as realpath_21,
  realpath as realpath_22,
  realpath as realpath_23,
  realpath as realpath_24,
  realpath as realpath_25,
  realpath as realpath_26,
  realpath as realpath_27,
  realpath as realpath_28,
  realpath as realpath_29,
  realpath as realpath_30,
  realpath as realpath_31,
  realpath as realpath_32,
  realpath as realpath_33,
  realpath as realpath_34,
  realpath as realpath_35,
  realpath as realpath_36,
  realpath as realpath_37,
  realpath as realpath_38,
  rename,
  rename as rename_2,
  rename as rename_3,
  rename as rename_4,
  rename as rename_5,
  rename as rename_6,
  rename as rename_7,
  open,
  open as open_2,
  open as open_3,
  open as open_4,
  open as open_5,
  open as open_6,
  open as open_7,
  open as open_8,
  open as open_9,
  open as open_10,
  open as open_11,
  open as open_12,
  open as open_13,
  open as open_14,
  open as open_15,
  open as open_16,
  open as open_17,
  open as open_18,
  open as open_19,
  open as open_20,
  open as open_21,
  open as open_22,
  open as open_23,
  open as open_24,
  open as open_25,
  open as open_26,
  open as open_27,
} from "fs/promises";
import {
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
} from "path";
import {
  constants,
  constants as constants_3,
  constants as constants_4,
  constants as constants_5,
  constants as constants_6,
  constants as constants_7,
  constants as constants_9,
  constants as constants_10,
  constants as constants_12,
  constants as constants_13,
  constants as constants_14,
  constants as constants_15,
  constants as constants_16,
  constants as constants_17,
  constants as constants_18,
  constants as constants_19,
  constants as constants_20,
  constants as constants_21,
  constants as constants_22,
  constants as constants_23,
  constants as constants_24,
  constants as constants_25,
  constants as constants_26,
  constants as constants_27,
} from "fs";
import { b8e } from "../../../vendor/jsonc-parser/lib/esm/main.js";
import { Wo } from "../json.js";
import { quotedPrintable } from "../printableName.js";
import {
  yft,
  bT,
  checkTarballUrl,
  iie,
  lDe,
  aie,
  getDefaultHttpNpmRegistry,
  fdRealPath,
} from "./npmPluginSource.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isFsInaccessible, getErrnoCode, errorMessage, isFsInaccessibleCode } from "../errors.js";
import { foldCase } from "../networkPaths.js";
import { logForDebugging } from "../debug.js";
import { whichAsync } from "../which.js";
import { makeTempSiblingName, fFt, hasLinkedAncestorBelow } from "./pluginCacheMaterialize.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { getPlatform } from "../platform.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { retryFsOpLong } from "../atomicPublishWrite.js";
import { $c } from "../platformTargets.js";
import { redactUrlsInMessage } from "../redaction/urlRedaction.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  removePluginInstallation,
  listInstalledPluginIds,
  QJn,
  isInstallationRelevantToCurrentProject,
  filterInstallationsForCurrentProject,
} from "./installedPluginsManager.js";
import {
  qP,
  findMatchingInstallations,
  qualifyDependency,
  findReverseDependentNames,
} from "./dependencyResolver.js";
import { tVt, persistDirectoryBinding, Rrt, VS } from "./pluginDirectoryBindings.js";
import { eVe } from "./pluginInstallationHelpers.js";
import {
  scopeToSettingSource,
  parsePluginIdentifier,
  isOfficialMarketplaceName_3,
} from "./pluginIdentifier.js";
import { updateSettingsForSourceWithTransform } from "../settings/settings.js";
import {
  enabledPluginKeys,
  planUninstallCleanup,
  describeUnwritableSettingsSource,
} from "../../services/plugins/pluginUninstallSettings.js";
import { ic, markPluginVersionOrphaned } from "./cacheUtils.js";
import { removePluginUsage } from "../telemetry/pluginTelemetry.js";
import { getEnabledPluginIdsInSource } from "./pluginPolicy.js";
import { getCwd } from "../cwd.js";
import { classifyMarketplacePath, getMarketplaceCandidatePaths } from "./localMarketplacePaths.js";
import {
  loadKnownMarketplacesSafe,
  tryUnwrapTextPayload,
  zIe,
  DGn,
  IGn,
  getPluginById,
  isListingBlocked,
  collectOrgBlockedPlugins,
  Eq,
  getPluginByIdCacheOnly,
} from "./marketplaceManager.js";
import { anchoredPluginCachePath, loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { c5t } from "./pluginDirectories.js";
import { toProbeError } from "./cachePublish.js";
import { getFsImplementation } from "../fsOperations.js";
import { NPM } from "./schemas.js";
import {
  OFFICIAL_MARKETPLACE_NAME,
  OFFICIAL_MARKETPLACE_DISPLAY,
  isPluginDirectorySource,
  isOfficialMarketplaceSpelling,
} from "./officialMarketplaceNames.js";
import {
  pluginDirectoryPolicyBlock,
  isSourceDisallowedOrUnverifiable,
  isPluginBlockedByPolicy,
} from "./marketplacePolicy.js";
import { mE } from "./headersHelper.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:4400802-4400826 placement
class Vc extends Error {}
/**
 * package.json 依赖字段、锁文件标记与校验正则等常量。
 */
//@ chunk-e6aww6q8.js:4400826-4401137 placement
var DEPENDENCY_FIELDS = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"],
  LOCK_ENTRY_DEPENDENCY_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies"],
  LOCK_ENTRY_FLAGS = ["dev", "optional", "devOptional", "peer"],
  PLATFORM_FIELDS = ["os", "cpu", "libc"],
  INTEGRITY_RE = /^(sha512|sha384|sha256|sha1)-[A-Za-z0-9+/]+={0,2}$/,
  PLUGIN_DEPENDENCIES = "plugin-dependencies",
  PLACEHOLDER_VERSION = "0.0.0";
//@ chunk-e6aww6q8.js:4401137-4401818 placement
function checkPackageLock(e, n, r, s) {
  let h = parseJsonObject(e, "package.json"),
    y = parseJsonObject(n, r);
  if (y.lockfileVersion !== 2 && y.lockfileVersion !== 3)
    throw new Vc(`its ${r} is in an old format; regenerate it with npm 7 or later`);
  if (h.overrides !== void 0)
    throw new Vc("its package.json sets overrides, which this install does not apply");
  let packages = y.packages;
  if (!sS(packages) || !sS(packages[""]))
    throw new Vc(`its ${r} has no packages section with the plugin in it`);
  let w = assertLockMatchesPackage(packages[""], h, r),
    L = { "": { name: PLUGIN_DEPENDENCIES, version: PLACEHOLDER_VERSION, ...w } };
  for (let [G, q] of Object.entries(packages)) if (G !== "") L[G] = validateLockEntry(G, q, r, s);
  return {
    packageCount: Object.keys(L).length - 1,
    packageJson: { name: PLUGIN_DEPENDENCIES, version: PLACEHOLDER_VERSION, ...w },
    lockfile: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      lockfileVersion: 3,
      requires: !0,
      packages: L,
    },
  };
}
/**
 * 检查插件的 bun.lock 是否可用（JSON 格式、版本、patchedDependencies）。
 */
//@ chunk-e6aww6q8.js:4401818-4402964 placement
function checkBunLock(e, n, r) {
  let s = parseJsonObject(e, "package.json"),
    h = [],
    y = b8e(Wo(n), h, { allowTrailingComma: !0, disallowComments: !0 });
  if (h.length > 0 || !sS(y)) throw new Vc("its bun.lock is not valid JSON");
  if (![0, 1, 2].includes(y.lockfileVersion))
    throw new Vc("its bun.lock is in a format this version of Claude Code does not read");
  if (y.patchedDependencies !== void 0 || s.patchedDependencies !== void 0)
    throw new Vc("it patches its dependencies (patchedDependencies), which this install does not apply");
  let workspaces = y.workspaces;
  if (!sS(workspaces) || !sS(workspaces[""]) || Object.keys(workspaces).length !== 1)
    throw new Vc("its bun.lock does not list the plugin as its only workspace");
  let packages = y.packages;
  if (!sS(packages)) throw new Vc("its bun.lock lists no packages");
  let L = assertLockMatchesPackage(workspaces[""], s, "bun.lock"),
    { peerDependenciesMeta: peerDependenciesMeta, ...q } = L;
  if (workspaces[""].optionalPeers !== void 0)
    q.optionalPeers = assertOptionalPeers(workspaces[""].optionalPeers, "its bun.lock");
  let Z = {};
  for (let [Se, ke] of Object.entries(packages)) Z[Se] = validateBunLockEntry(Se, ke, r);
  return {
    packageCount: Object.keys(Z).length,
    packageJson: { name: PLUGIN_DEPENDENCIES, version: PLACEHOLDER_VERSION, ...L },
    lockfile: {
      lockfileVersion: y.lockfileVersion,
      ...(typeof y.configVersion === "number" && { configVersion: y.configVersion }),
      workspaces: { "": { name: PLUGIN_DEPENDENCIES, ...q } },
      packages: Z,
    },
  };
}
/**
 * package.json 与锁文件列出的依赖须一致。
 */
//@ chunk-e6aww6q8.js:4402964-4403268 placement
function assertLockMatchesPackage(e, n, r) {
  let s = validateDependencyLists(e, DEPENDENCY_FIELDS, `its ${r}`),
    h = omitOptionalFromDependencies(
      validateDependencyLists(n, DEPENDENCY_FIELDS, "its package.json"),
      r === "bun.lock" ? ["devDependencies"] : [],
    );
  if (qzn(s) !== qzn(h)) throw new Vc(`its package.json and ${r} list different dependencies`);
  return sS(n.peerDependenciesMeta)
    ? { ...s, peerDependenciesMeta: sanitizePeerDependenciesMeta(n.peerDependenciesMeta) }
    : s;
}
//@ chunk-e6aww6q8.js:4403268-4403504 placement
function omitOptionalFromDependencies(e, n = []) {
  let optionalDependencies = e.optionalDependencies;
  if (optionalDependencies === void 0) return e;
  let s = { ...e };
  for (let h of ["dependencies", ...n]) {
    let y = e[h];
    if (y !== void 0) {
      let S = {};
      for (let [w, L] of Object.entries(y)) if (!Object.hasOwn(optionalDependencies, w)) S[w] = L;
      s[h] = S;
    }
  }
  return s;
}
/**
 * 校验 package-lock 条目：必须是 node_modules 下的包、对象、非链接/捆绑、有精确版本；名字须合法； 有 resolved 时须是合规链接且带 integrity；依赖、标志、平台、bin、peerDependenciesMeta 逐项校验。返回规范化后的条目。
 */
//@ chunk-e6aww6q8.js:4403504-4404560 placement
function validateLockEntry(entryPath, entry, lockfileName, registry) {
  let label = `its ${lockfileName} entry "${quotedPrintable(entryPath, 120)}"`;
  if (!isNodeModulesPath(entryPath)) throw new Vc(`${label} is not a package in node_modules`);
  if (!sS(entry)) throw new Vc(`${label} is not an object`);
  if (entry.link !== void 0 || entry.inBundle !== void 0)
    throw new Vc(`${label} is a folder link or a bundled copy`);
  let version = entry.version;
  if (typeof version !== "string" || yft.parse(version) === null)
    throw new Vc(`${label} has no exact version`);
  let result = { version: version };
  if (entry.name !== void 0) {
    if (typeof entry.name !== "string" || !bT(entry.name))
      throw new Vc(`${label} has a name that is not an npm package name`);
    result.name = entry.name;
  }
  if (entry.resolved !== void 0) {
    if (
      ((result.resolved = assertDownloadLink(entry.resolved, label, registry, "npm")),
      entry.integrity === void 0)
    )
      throw new Vc(`${label} has no integrity hash for its download link`);
  }
  if (entry.integrity !== void 0)
    result.integrity = assertIntegrity(entry.integrity, label, entry.resolved !== void 0);
  Object.assign(result, validateDependencyLists(entry, LOCK_ENTRY_DEPENDENCY_FIELDS, label));
  for (let w of LOCK_ENTRY_FLAGS) if (entry[w] === !0) result[w] = !0;
  for (let w of PLATFORM_FIELDS)
    if (entry[w] !== void 0) {
      if (!_ft(entry[w])) throw new Vc(`${label} has an unreadable ${w} list`);
      result[w] = entry[w];
    }
  if (entry.bin !== void 0) result.bin = validateBinField(entry.bin, label);
  if (sS(entry.peerDependenciesMeta))
    result.peerDependenciesMeta = sanitizePeerDependenciesMeta(entry.peerDependenciesMeta);
  return result;
}
//@ chunk-e6aww6q8.js:4404560-4405476 placement
function validateBunLockEntry(e, n, r) {
  let s = `its bun.lock entry "${quotedPrintable(e, 120)}"`;
  if (!isPackagePath(e)) throw new Vc(`${s} is not a package path`);
  if (!Array.isArray(n) || n.length !== 4) throw new Vc(`${s} is not a registry package`);
  let [h, y, S, w] = n,
    L = typeof h === "string" ? h.lastIndexOf("@") : -1;
  if (typeof h !== "string" || L <= 0 || !bT(h.slice(0, L)) || yft.parse(h.slice(L + 1)) === null)
    throw new Vc(`${s} is not a registry package at an exact version`);
  if (y !== "") assertDownloadLink(y, s, r, "bun");
  if (!sS(S)) throw new Vc(`${s} has unreadable metadata`);
  let G = validateDependencyLists(S, LOCK_ENTRY_DEPENDENCY_FIELDS, s);
  for (let q of PLATFORM_FIELDS) {
    let Z = S[q];
    if (Z !== void 0) {
      if (typeof Z !== "string" && !_ft(Z)) throw new Vc(`${s} has an unreadable ${q} list`);
      G[q] = Z;
    }
  }
  if (S.optionalPeers !== void 0) G.optionalPeers = assertOptionalPeers(S.optionalPeers, s);
  if (S.bin !== void 0) G.bin = validateBinField(S.bin, s);
  if (S.binDir !== void 0) {
    if (typeof S.binDir !== "string" || !gft(S.binDir))
      throw new Vc(`${s} has a bin folder outside its package`);
    G.binDir = S.binDir;
  }
  return [h, y, G, assertIntegrity(w, s, y !== "")];
}
//@ chunk-e6aww6q8.js:4405476-4405638 placement
function assertDownloadLink(e, n, r, s) {
  let h = typeof e === "string" ? checkTarballUrl(e, void 0, r, s)?.reason : "is not text";
  if (h !== void 0) throw new Vc(`${n} has a download link that ${h}`);
  return e;
}
//@ chunk-e6aww6q8.js:4405638-4405861 placement
function assertOptionalPeers(e, n) {
  if (!_ft(e)) throw new Vc(`${n} has an unreadable optionalPeers list`);
  let found = e.find((s) => !bT(s));
  if (found !== void 0)
    throw new Vc(`${n} has an optional peer that is not a registry package: ${quotedPrintable(found, 120)}`);
  return e;
}
//@ chunk-e6aww6q8.js:4405861-4406118 placement
function assertIntegrity(e, n, r) {
  if (e === "")
    throw new Vc(r ? `${n} has no integrity hash for its download link` : `${n} has an empty integrity hash`);
  if (typeof e !== "string" || !e.split(" ").every((s) => INTEGRITY_RE.test(s)))
    throw new Vc(`${n} has an unreadable integrity hash`);
  return e;
}
/**
 * 依赖列表须为“注册表包名 → 版本范围”。
 */
//@ chunk-e6aww6q8.js:4406118-4406425 placement
function validateDependencyLists(e, n, r) {
  let s = {};
  for (let h of n) {
    let y = e[h];
    if (y === void 0) continue;
    if (!sS(y)) throw new Vc(`${r} has an unreadable ${h} list`);
    for (let [S, w] of Object.entries(y))
      if (!bT(S) || !isRegistryVersionRange(w))
        throw new Vc(
          `${r} has a dependency that is not a registry package and version range: ${quotedPrintable(S, 120)}`,
        );
    s[h] = y;
  }
  return s;
}
//@ chunk-e6aww6q8.js:4406425-4406551 placement
function isRegistryVersionRange(e) {
  if (typeof e !== "string") return !1;
  let match = /^npm:(.+)@([^@]*)$/.exec(e);
  return match === null ? iie(e) : bT(match[1]) && iie(match[2]);
}
//@ chunk-e6aww6q8.js:4406551-4406659 placement
function isNodeModulesPath(e) {
  return (
    e.startsWith("node_modules/") &&
    e
      .slice(13)
      .split("/node_modules/")
      .every((r) => bT(r))
  );
}
//@ chunk-e6aww6q8.js:4406659-4406828 placement
function isPackagePath(e) {
  let parts = e.split("/"),
    r = [];
  for (let s = 0; s < parts.length; s++) {
    let h = parts[s],
      y = h.startsWith("@") && s + 1 < parts.length;
    r.push(y ? `${h}/${parts[++s]}` : h);
  }
  return r.every((s) => bT(s));
}
//@ chunk-e6aww6q8.js:4406828-4406926 placement
function gft(e) {
  return e !== "" && !e.startsWith("/") && !/[\\:]/.test(e) && !e.split("/").includes("..");
}
//@ chunk-e6aww6q8.js:4406926-4406994 placement
function wks(e) {
  return e !== "" && e !== "." && e !== ".." && !/[\\/:]/.test(e);
}
//@ chunk-e6aww6q8.js:4406994-4407227 placement
function validateBinField(e, n) {
  if (
    typeof e === "string"
      ? gft(e)
      : sS(e) && Object.entries(e).every(([r, s]) => wks(r) && typeof s === "string" && gft(s))
  )
    return e;
  throw new Vc(`${n} has a bin link that points outside its package or has an invalid command name`);
}
//@ chunk-e6aww6q8.js:4407227-4407342 placement
function sanitizePeerDependenciesMeta(e) {
  let n = {};
  for (let [r, s] of Object.entries(e)) if (bT(r) && sS(s)) n[r] = { optional: s.optional === !0 };
  return n;
}
//@ chunk-e6aww6q8.js:4407342-4407496 placement
function parseJsonObject(e, n) {
  let r;
  try {
    r = jsonParse(Wo(e));
  } catch {
    throw new Vc(`its ${n} is not valid JSON`);
  }
  if (!sS(r)) throw new Vc(`its ${n} is not a JSON object`);
  return r;
}
//@ chunk-e6aww6q8.js:4407496-4407593 placement
function qzn(e) {
  return jsonStringify(
    DEPENDENCY_FIELDS.map((n) => Object.entries(e[n] ?? {}).sort(([r], [s]) => (r < s ? -1 : r > s ? 1 : 0))),
  );
}
//@ chunk-e6aww6q8.js:4407593-4407664 placement
function sS(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:4407664-4407739 placement
function _ft(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
/**
 * 安装插件依赖（npm 或 bun，禁用脚本）。
 */
//@ chunk-e6aww6q8.js:4407739-4408464 placement
var installPluginDependencies_2 = 60000,
  Rks = 33554432,
  sqn = ["ci", "--ignore-scripts", "--workspaces=false", "--no-audit", "--no-fund"],
  Eft = [
    { lockfile: "bun.lock", command: "bun", args: ["install", "--frozen-lockfile", "--ignore-scripts"] },
    {
      lockfile: "npm-shrinkwrap.json",
      command: "npm",
      args: sqn,
      completionRecord: "node_modules/.package-lock.json",
    },
    {
      lockfile: "package-lock.json",
      command: "npm",
      args: sqn,
      completionRecord: "node_modules/.package-lock.json",
    },
    { lockfile: "bun.lockb", command: "bun", args: ["install", "--frozen-lockfile", "--ignore-scripts"] },
  ],
  uqn = "its bun.lockb is a binary lockfile that cannot be checked; ship a text bun.lock instead",
  mapped_4 = Eft.map((e) => e.lockfile),
  fqn = new Map(
    Eft.flatMap((e) => (e.completionRecord === void 0 ? [] : [[e.lockfile, e.completionRecord]])),
  );
/**
 * 插件目录有 package.json 时按锁文件选择包管理器安装依赖；yarn/pnpm 锁文件不支持（会绕过 --ignore-scripts）； 返回 {ran, error?}。
 */
//@ chunk-e6aww6q8.js:4408464-4408939 placement
async function installPluginDependencies(e, { inPlaceAt: n } = {}) {
  let r;
  try {
    r = await readdir_28(e);
  } catch (error) {
    if (isFsInaccessible(error)) return { ran: !1 };
    throw error;
  }
  let s = new Set(r.map((y) => foldCase(y)));
  if (!s.has("package.json")) return { ran: !1 };
  let h = detectLockfile(s);
  if (h === "yarn-or-pnpm")
    return {
      ran: !1,
      error:
        "Skipped: yarn/pnpm lockfiles are not supported (resolution-time hooks bypass --ignore-scripts). Use bun or npm.",
    };
  if (h === void 0) return { ran: !1 };
  return (
    logForDebugging(`Installing plugin dependencies: ${h.command} ${h.args.join(" ")} for ${e}`),
    choosePackageManager(e, h, n)
  );
}
//@ chunk-e6aww6q8.js:4408939-4409090 placement
function detectLockfile(e) {
  let found = Eft.find((r) => e.has(r.lockfile));
  if (found !== void 0) return found;
  return e.has("yarn.lock") || e.has("pnpm-lock.yaml") ? "yarn-or-pnpm" : void 0;
}
//@ chunk-e6aww6q8.js:4409090-4409926 placement
async function checkLockfileSupported(e) {
  let n;
  try {
    n = await readdir_28(e);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  let r = new Set(n.map((h) => foldCase(h)));
  if (!r.has("package.json") || r.has("node_modules")) return;
  let s = detectLockfile(r);
  if (s === void 0) return;
  try {
    let h = await readPackageFile(e, "package.json");
    if (!hasLifecycleScripts(h)) return;
    if (s === "yarn-or-pnpm")
      return {
        kind: "refused",
        reason: "it uses a yarn or pnpm lockfile, which plugin installs do not support",
      };
    if (s.lockfile === "bun.lockb") return { kind: "refused", reason: uqn };
    let y = await readPackageFile(e, s.lockfile),
      S;
    try {
      S = gqn(s, h, y, void 0);
    } catch (error) {
      if (error instanceof Vc && y.includes('"http://')) return;
      throw error;
    }
    if (S.packageCount === 0) return;
    return (await whichAsync(s.command)) === null
      ? { kind: "refused", reason: `it needs ${s.command}, which is not installed on this computer` }
      : { kind: "not-installed" };
  } catch (error) {
    if (error instanceof Vc) return { kind: "refused", reason: error.message };
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4409926-4410006 placement
var Cks = ["dependencies", "optionalDependencies", "peerDependencies", "workspaces"];
//@ chunk-e6aww6q8.js:4410006-4410110 placement
function hasLifecycleScripts(e) {
  let n;
  try {
    n = jsonParse(Wo(e));
  } catch {
    return !0;
  }
  if (!sS(n)) return !0;
  return Cks.some((r) => xks(n[r]));
}
//@ chunk-e6aww6q8.js:4410110-4410192 placement
function xks(e) {
  return sS(e) ? Object.keys(e).length > 0 : Array.isArray(e) && e.length > 0;
}
//@ chunk-e6aww6q8.js:4410192-4410967 placement
async function choosePackageManager(e, n, r) {
  let s = makeTempSiblingName(fFt(resolve_57(e)));
  try {
    await mkdir_24(s);
  } catch (error) {
    return dependencyInstallError(n.command, error);
  }
  try {
    let h = await preparePackageManagerInputs(e, n, s);
    if (h.packageCount === 0) return { ran: !1 };
    (await writeFile_15(join_121(s, "package.json"), jsonStringify(h.packageJson)),
      await writeFile_15(
        join_121(s, n.command === "npm" ? "package-lock.json" : "bun.lock"),
        jsonStringify(h.lockfile),
        { flag: "wx" },
      ));
    let y = lDe(),
      S =
        n.command === "npm"
          ? await aie(n.args, { workDir: s, toolCgroupClass: "plugin" }, installPluginDependencies_2)
          : await execFileNoThrowWithCwd(n.command, n.args, {
              cwd: s,
              timeout: installPluginDependencies_2,
              toolCgroupClass: "plugin",
              ...y,
              env: { ...y.env, BUN_INSTALL_CACHE_DIR: join_121(s, "bun-cache") },
            });
    if (S.code === 0) await (r !== void 0 ? placeNodeModules(s, e, r) : swapNodeModules(s, e));
    return dependencyInstallResult(n.command, S, e);
  } catch (error) {
    if (error instanceof Vc)
      return { ran: !1, error: `Skipped installing this plugin's dependencies: ${error.message}.` };
    return dependencyInstallError(n.command, error);
  } finally {
    await removeDirectoryTreeNoFollow(s).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:4410967-4411227 placement
async function preparePackageManagerInputs(e, n, r) {
  if (n.lockfile === "bun.lockb") throw new Vc(uqn);
  let s = await readPackageFile(e, "package.json"),
    h = await readPackageFile(e, n.lockfile);
  await writeFile_15(join_121(r, "package.json"), "{}", { flag: "wx" });
  let y = h.includes('"http://') ? await getDefaultHttpNpmRegistry({ workDir: r }) : void 0;
  return gqn(n, s, h, y);
}
//@ chunk-e6aww6q8.js:4411227-4411307 placement
function gqn(e, n, r, s) {
  return e.command === "npm" ? checkPackageLock(n, r, e.lockfile, s) : checkBunLock(n, r, s);
}
//@ chunk-e6aww6q8.js:4411307-4411331 placement
class Jj extends Error {}
//@ chunk-e6aww6q8.js:4411331-4411356 placement
class mDe extends Error {}
//@ chunk-e6aww6q8.js:4411356-4411469 placement
var FOLDER_REPLACED_MESSAGE =
  "the plugin's folder was moved or replaced by a link during the install, so the packages were not added";
//@ chunk-e6aww6q8.js:4411469-4411626 placement
async function assertFolderUnchanged(e, n) {
  let [r, s] = await Promise.all([
    lstat_38(e).catch(() => {
      return;
    }),
    realpath_37(e).catch(() => {
      return;
    }),
  ]);
  if (r?.isDirectory() !== !0 || s !== n) throw new Jj(FOLDER_REPLACED_MESSAGE);
}
/**
 * Linux 上经目录 fd 把 node_modules 移入插件目录。
 */
//@ chunk-e6aww6q8.js:4411626-4412093 placement
async function moveNodeModulesSafely(e, n, r) {
  let s = getPlatform();
  if (s !== "linux" && s !== "wsl") {
    await rename_6(e, r);
    return;
  }
  let h = await open_24(
    n,
    constants_25.O_RDONLY | constants_25.O_DIRECTORY | constants_25.O_NOFOLLOW | READ_LIMITS,
  ).catch((y) => {
    throw ["ENOTDIR", "ELOOP", "ENOENT"].includes(getErrnoCode(y) ?? "")
      ? new Jj(FOLDER_REPLACED_MESSAGE)
      : y;
  });
  try {
    let y = await fdRealPath(h.fd);
    if (y === null)
      throw new Jj("could not confirm where the plugin's folder is, so the packages were not added");
    if (y !== n) throw new Jj(FOLDER_REPLACED_MESSAGE);
    await rename_6(e, `/proc/self/fd/${h.fd}/node_modules`);
  } finally {
    await h.close();
  }
}
//@ chunk-e6aww6q8.js:4412093-4412181 placement
async function F3s(e) {
  return lstat_38(join_121(e, "node_modules")).then(
    (n) => n.isDirectory(),
    () => !1,
  );
}
/**
 * 把安装好的 node_modules 放进插件目录并处理失败。
 */
//@ chunk-e6aww6q8.js:4412181-4412726 placement
async function placeNodeModules(e, n, r) {
  let s = join_121(n, "node_modules");
  try {
    await retryFsOpLong(join_121(e, "node_modules"), s, async (h, y) => {
      (await assertFolderUnchanged(n, r),
        await moveNodeModulesSafely(h, r, y).catch(async (S) => {
          if (
            !(S instanceof Jj) &&
            (await lstat_38(y).then(
              () => !0,
              () => !1,
            ))
          )
            throw new mDe(errorMessage(S), { cause: S });
          throw S;
        }));
    });
  } catch (error) {
    if (error instanceof Jj) throw error;
    let y = error instanceof mDe ? error.cause : error;
    if (
      error instanceof mDe ||
      (await lstat_38(s).then(
        () => !0,
        () => !1,
      ))
    ) {
      await assertFolderUnchanged(n, r);
      return;
    }
    if (
      getErrnoCode(y) === "ENOENT" &&
      !(await lstat_38(join_121(e, "node_modules")).then(
        () => !0,
        () => !1,
      ))
    )
      throw Error("the package manager finished but wrote no node_modules");
    throw y;
  }
}
/**
 * 读插件目录里的 package.json/锁文件（须普通文件且 ≤32 MB）。
 */
//@ chunk-e6aww6q8.js:4412726-4413150 placement
async function readPackageFile(e, n) {
  let r = join_121(e, n);
  if (
    !(
      await lstat_38(r).catch((y) => {
        if (getErrnoCode(y) === "ENOENT") throw new Vc(`its ${n} is missing, or not named in lowercase`);
        throw y;
      })
    ).isFile()
  )
    throw new Vc(`its ${n} is not a regular file`);
  let h = await open_24(r, $c());
  try {
    let stats = await h.stat();
    if (!stats.isFile() || stats.size > Rks) throw new Vc(`its ${n} is not a regular file of at most 32 MB`);
    return await h.readFile({ encoding: "utf8" });
  } finally {
    await h.close();
  }
}
//@ chunk-e6aww6q8.js:4413150-4413415 placement
async function swapNodeModules(e, n) {
  let r = join_121(n, "node_modules"),
    s = join_121(e, "previous-node_modules"),
    h = await retryFsOpLong(r, s).then(
      () => !0,
      (y) => {
        if (getErrnoCode(y) === "ENOENT") return !1;
        throw y;
      },
    );
  try {
    await retryFsOpLong(join_121(e, "node_modules"), r);
  } catch (error) {
    if (h) await retryFsOpLong(s, r).catch(() => {});
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-e6aww6q8.js:4413415-4413522 placement
function dependencyInstallError(e, n) {
  return {
    ran: !0,
    error: `Plugin dependency install failed (${e}): ${redactUrlsInMessage(errorMessage(n))}`.slice(0, 500),
  };
}
//@ chunk-e6aww6q8.js:4413522-4413753 placement
function dependencyInstallResult(e, n, r) {
  if (n.code !== 0)
    return {
      ran: !0,
      error:
        `Plugin dependency install failed (${e}): ${redactUrlsInMessage(n.stderr || n.stdout || n.error || "no output")}`.slice(
          0,
          500,
        ),
    };
  return (logForDebugging(`Plugin dependency install succeeded (${e}) in ${r}`), { ran: !0 });
}
//@ chunk-e6aww6q8.js:4413753-4413764 placement
var Nks = !1;
/**
 * 清理不再被依赖的自动安装插件，设置写入失败时保留。
 */
//@ chunk-e6aww6q8.js:4451911-4454381 placement
async function pruneOrphanedAutoDeps(e, n, r, { deleteDataDir: s = !0 } = {}, h) {
  if (e.size === 0) return [];
  let y = isStorageV5Enabled() && h !== void 0 ? await loadInstalledPlugins(h) : loadInstalledPluginsSync(),
    plugins = y.plugins,
    w = [],
    L = [];
  for (let we of e) {
    let Ee = plugins[we],
      Ae = qP(Ee, n, r);
    if (!Ae) continue;
    {
      let Ie = findMatchingInstallations(Ee, n, r);
      if (!(Ee ?? []).filter((We) => !Ie.includes(We)).some(tVt)) {
        if ((await persistDirectoryBinding(we, Ee)) === "not-persisted") {
          logForDebugging(
            `pruneOrphanedAutoDeps: ${we} is kept: plugin-directory-bindings.json could not be used or written, so nothing would hold its name once this install record is gone`,
            { level: "warn" },
          );
          continue;
        }
      } else await Rrt(we, Ee);
    }
    if ((await removePluginInstallation(we, n, r, h), L.push(we), (Ee?.length ?? 0) <= 1))
      w.push({ id: we, installPath: Ae.installPath });
  }
  if (L.length === 0) return [];
  let G = (we) =>
      eVe(plugins, we).flatMap(([Ee, Ae]) => (Ee !== we && Ae.length > 0 && !L.includes(Ee) ? [Ee] : [])),
    q = scopeToSettingSource(n),
    { error: error } = await updateSettingsForSourceWithTransform(
      q,
      (we) => {
        let Ee = { ...we?.enabledPlugins };
        for (let Ae of L) {
          Ee[Ae] = void 0;
          for (let Ie of enabledPluginKeys(Ee, Ae, G(Ae))) Ee[Ie] = void 0;
        }
        return { enabledPlugins: Ee };
      },
      void 0,
      h,
    );
  if (error) logForDebugging(`pruneOrphanedAutoDeps: settings write failed at ${n}: ${error.message}`);
  ic(h);
  let Se = w.some(({ id: id }) => VS(id))
      ? listInstalledPluginIds(
          isStorageV5Enabled() && h !== void 0 ? await loadInstalledPlugins(h) : loadInstalledPluginsSync(),
        )
      : [],
    ke = new Set(w.map((we) => we.id));
  for (let { id: id, installPath: installPath } of w) {
    await markPluginVersionOrphaned(installPath, h);
    let Ae = [];
    Ae = G(id);
    let {
      plan: plan,
      stillOn: stillOn,
      entry: entry,
    } = await planUninstallCleanup(id, {
      deleteDataDir: s && !QJn(id, y, ke),
      installedIds: Se,
      installedOthers: Ae,
      storageV5: h,
    });
    if (plan.kind === "nothing" && plan.reason === "still-switched-on") {
      let joined = stillOn.map(describeUnwritableSettingsSource).join(" and "),
        lt =
          entry === "held"
            ? "plugin-directory-bindings.json still holds its name"
            : "plugin-directory-bindings.json could not be used, so its name counts as held",
        Je = [
          ...(stillOn.some(({ readsBack: readsBack }) => readsBack === "unreadable")
            ? ["a file that could not be read must be mended first"]
            : []),
          ...(stillOn.some(
            ({ readsBack: readsBack, notReadBecause: notReadBecause }) =>
              readsBack === "not-read-here" && notReadBecause === void 0,
          )
            ? ["a file that was not read: after this workspace is trusted and Claude Code is started again"]
            : []),
          ...(stillOn.some(({ notReadBecause: notReadBecause }) => notReadBecause === "network-path")
            ? [
                "a file that was not read because of its path: after any link to another machine on that path is replaced with a real file or folder",
              ]
            : []),
        ],
        nt = Je.length > 0 ? ` (${Je.join("; ")})` : "",
        pt =
          entry === "held"
            ? `switch it off there${nt}, then uninstall ${id}`
            : `once plugin-directory-bindings.json can be used, switch it off there${nt}, then uninstall ${id}`;
      logForDebugging(
        `pruneOrphanedAutoDeps: ${id} was pruned, but a settings file still switches it on, could not be read, or is not read in this launch (${joined}), so nothing it saved was removed, and ${lt}; ${pt}`,
        { level: "warn" },
      );
    }
  }
  return (
    removePluginUsage(
      w.map((we) => we.id),
      h,
    ),
    L
  );
}
/**
 * 插件在该作用域的设置中被启用且对应安装路径（缓存）存在。
 */
//@ chunk-e6aww6q8.js:4454381-4454578 placement = hasPendingUpdates (0.783)
async function isPluginEnabledAndCachedAtScope(e, n, r) {
  let s = scopeToSettingSource(n);
  if (!getEnabledPluginIdsInSource(s).has(e)) return !1;
  let h = n !== "user" ? getCwd() : void 0,
    S = isStorageV5Enabled() && r !== void 0 ? await loadInstalledPlugins(r) : loadInstalledPluginsSync(),
    w = qP(S.plugins[e], n, h);
  if (!w) return !1;
  return installPathExists(e, w.installPath, r);
}
//@ chunk-e6aww6q8.js:4454578-4455009 placement
async function installPathExists(e, n, r) {
  let s = isStorageV5Enabled() && r !== void 0,
    { absolute: absolute, suspect: suspect } = classifyMarketplacePath(n, {
      trustedRoots: getMarketplaceCandidatePaths(
        e,
        await loadKnownMarketplacesSafe(r),
        tryUnwrapTextPayload(),
      ),
    });
  if (suspect) return !1;
  let S = anchoredPluginCachePath(),
    w = s ? c5t(absolute, S) : null;
  if (isStorageV5Enabled() && r !== void 0 && w !== null && !(await hasLinkedAncestorBelow(absolute, S))) {
    let scopeKind = await r.scopeKind(w, { resolveLink: !0 });
    if (!scopeKind.ok) {
      let { error: error } = scopeKind;
      if ("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)) return !1;
      throw toProbeError(error, n);
    }
    let G = scopeKind.value;
    return G.kind === "link" ? G.linkResolves === !0 : G.kind !== "absent";
  }
  return cbs(absolute);
}
/**
 * 插件在该作用域是否有缓存仍存在的安装记录（优先当前项目的记录）。
 */
//@ chunk-e6aww6q8.js:4455009-4455288 placement = hasPendingUpdates (0.783)
async function hasCachedInstallationAtScope(e, n, r) {
  let filtered = (
      (isStorageV5Enabled() && r !== void 0 ? await loadInstalledPlugins(r) : loadInstalledPluginsSync())
        .plugins[e] ?? []
    ).filter((S) => S.scope === n),
    y = !1;
  for (let diskEntry of filtered) {
    if (!isInstallationRelevantToCurrentProject(diskEntry)) continue;
    if (((y = !0), await installPathExists(e, diskEntry.installPath, r))) return !0;
  }
  if (y) return !1;
  for (let S of filterInstallationsForCurrentProject(filtered))
    if (await installPathExists(e, S.installPath, r)) return !0;
  return !1;
}
//@ chunk-e6aww6q8.js:4455288-4455379 placement
async function cbs(e) {
  try {
    return (await getFsImplementation().stat(e), !0);
  } catch (error) {
    if (isFsInaccessible(error)) return !1;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4455379-4455577 placement
function findBlockedMarketplace(e, n, r) {
  let marketplace = parsePluginIdentifier(e).marketplace;
  if (!marketplace) return;
  if (marketplace === NPM) return;
  if (marketplace === OFFICIAL_MARKETPLACE_NAME && pluginDirectoryPolicyBlock() !== null) return marketplace;
  let h = n[marketplace]?.source;
  if (h === void 0 && !r?.failClosedOnUnknownSource) return;
  return isSourceDisallowedOrUnverifiable(h) ? marketplace : void 0;
}
//@ chunk-e6aww6q8.js:4455577-4455732 placement
async function pluginDirectoryUnavailableReason(e) {
  {
    if (parsePluginIdentifier(e).marketplace !== OFFICIAL_MARKETPLACE_NAME) return null;
    if (zIe() === "policy-not-known") await DGn();
    let n = zIe();
    return n === "blocked" ? null : n;
  }
  return null;
}
/**
 * 插件（或依赖）来自不可用的插件目录时的安装失败提示。
 */
//@ chunk-e6aww6q8.js:4455732-4455940 placement
function formatDirectoryUnavailableMessage(e, n) {
  {
    let r = `is unavailable: ${IGn()}`;
    return n === void 0
      ? `Cannot install "${quotedPrintable(e)}": the ${OFFICIAL_MARKETPLACE_DISPLAY} ${r}`
      : `Cannot install "${quotedPrintable(e)}": its dependency "${quotedPrintable(n)}" is from the ${OFFICIAL_MARKETPLACE_DISPLAY}, which ${r}`;
  }
  return "";
}
/**
 * 自动安装插件声明的依赖，跨市场或找不到时不安装。
 */
//@ chunk-e6aww6q8.js:4455940-4456927 placement
async function autoInstallPluginDependencies(e) {
  let n = [],
    r = [];
  for (let s of e.rootManifestDeps ?? []) {
    let h = qualifyDependency(s, e.pluginId);
    if (e.closureSet.has(h) || (e.alreadyEnabled.has(h) && !e.forceInclude.has(h))) continue;
    let marketplace = parsePluginIdentifier(h).marketplace;
    if (
      marketplace !== e.rootMarketplace &&
      !(marketplace && e.allowedCrossMarketplaces.has(marketplace)) &&
      !e.alreadyEnabled.has(h)
    ) {
      logForDebugging(
        `${e.pluginId} plugin.json declares dependency "${h}" in a different marketplace; not auto-installing \u2014 install it manually`,
        { level: "warn" },
      );
      continue;
    }
    if (isPluginBlockedByPolicy(h)) return { ok: !1, blockedDependency: h };
    let S = findBlockedMarketplace(h, e.knownMarketplaces, {
      failClosedOnUnknownSource: e.failClosedOnUnknownSource,
    });
    if (S) return { ok: !1, blockedDependency: h, blockedMarketplace: S };
    let w = await getPluginById(h, e.storageV5, "install");
    if (!w) {
      (logForDebugging(
        `${e.pluginId} plugin.json declares dependency "${h}" not found in any known marketplace; not auto-installing`,
        { level: "warn" },
      ),
        r.push(h));
      continue;
    }
    if (await Qft(h, w.entry, e.knownMarketplaces, e.storageV5)) return { ok: !1, blockedDependency: h };
    (e.depInfo.set(h, w), n.push(h));
  }
  return { ok: !0, ids: n, notFound: r };
}
/**
 * 依赖闭包中，先确定直接应启用的插件（已有启用记录、显式启用、默认启用或根被依赖），再沿依赖关系传播启用；返回 id→是否启用。
 */
//@ chunk-e6aww6q8.js:4456927-4457382 placement
function computeDependencyEnablement({
  closure: closure,
  rootId: rootId,
  rootRequiredByDependent: rootRequiredByDependent,
  priorEnabled: priorEnabled,
  explicitAnywhere: explicitAnywhere,
  defaultsById: defaultsById,
  dependenciesById: dependenciesById,
}) {
  let w = new Set(closure),
    L = new Set();
  for (let q of closure) {
    let Z = priorEnabled[q],
      Se = defaultsById.get(q) ?? !0;
    if (Z !== void 0) {
      if (Z !== !1 || Se) L.add(q);
      continue;
    }
    if (explicitAnywhere.has(q) || Se || (q === rootId && rootRequiredByDependent)) L.add(q);
  }
  let G = [...L];
  while (G.length > 0) {
    let q = G.pop();
    if (q === void 0) break;
    for (let Z of dependenciesById.get(q) ?? []) if (w.has(Z) && !L.has(Z)) (L.add(Z), G.push(Z));
  }
  return new Map(closure.map((q) => [q, L.has(q)]));
}
//@ chunk-e6aww6q8.js:4457382-4457458 placement
async function Qft(e, n, r, s) {
  if (!isPluginDirectoryMarketplace(e, r)) return !1;
  return isListingBlocked(n, await collectOrgBlockedPlugins(s));
}
//@ chunk-e6aww6q8.js:4457458-4457634 placement
function isPluginDirectoryMarketplace(e, n) {
  let { marketplace: marketplace } = parsePluginIdentifier(e);
  if (marketplace === void 0) return !1;
  let s = Object.hasOwn(n, marketplace) ? n[marketplace] : void 0;
  return s !== void 0 && s.source !== void 0 && s.source !== null
    ? isPluginDirectorySource(s.source)
    : isOfficialMarketplaceSpelling(marketplace);
}
//@ chunk-e6aww6q8.js:4457634-4457686 placement
function jqn(e, n) {
  return e === OFFICIAL_MARKETPLACE_NAME
    ? isOfficialMarketplaceName_3(n)
    : n === OFFICIAL_MARKETPLACE_NAME && isOfficialMarketplaceName_3(e);
}
/**
 * 来自同一来源的其他官方市场族安装。
 */
//@ chunk-e6aww6q8.js:4457686-4458115 placement
async function findOtherMarketplaceInstalls(e, n, r, s, h) {
  if (Eq()) {
    let y = mE(e);
    if (!y) return [];
    let S = samePluginSource(n.source, sourceUrlAndRef(r[y]?.source));
    if (S === void 0) return [];
    let plugins = (
        isStorageV5Enabled() && h !== void 0 ? await loadInstalledPlugins(h) : loadInstalledPluginsSync()
      ).plugins,
      L = [];
    for (let [G, q] of Object.entries(plugins)) {
      let Z = mE(G);
      if (!Z || Z === y || !jqn(y, Z)) continue;
      let filtered = q.filter(s);
      if (filtered.length === 0) continue;
      let ke = await getPluginByIdCacheOnly(G, h);
      if (ke && samePluginSource(ke.entry.source, sourceUrlAndRef(r[Z]?.source)) === S)
        L.push({ otherId: G, installations: filtered });
    }
    return L;
  }
  return [];
}
/**
 * 其他市场安装的说明（作用域、版本、被谁依赖、是否可替换）。
 */
//@ chunk-e6aww6q8.js:4458115-4458476 placement
async function describeOtherMarketplaceInstalls(e, n, r, s) {
  let h = await findOtherMarketplaceInstalls(e, n, r, isInstallationRelevantToCurrentProject, s);
  if (h.length === 0) return [];
  let y = await loadAllPluginsCacheOnly(s);
  return h.map(({ otherId: otherId, installations: installations }) => {
    let L = findReverseDependentNames(otherId, y.enabled);
    return {
      pluginId: otherId,
      scopes: uniq(installations.map((G) => G.scope)),
      version: installations[0]?.version,
      gitCommitSha: installations[0]?.gitCommitSha,
      requiredBy: L,
      replaceable: L.length === 0 && installations.every((G) => G.scope === "user" || G.scope === "local"),
    };
  });
}

export {
  isPluginEnabledAndCachedAtScope,
  pruneOrphanedAutoDeps,
  describeOtherMarketplaceInstalls,
  formatDirectoryUnavailableMessage,
  hasCachedInstallationAtScope,
  installPluginDependencies,
  F3s,
  checkLockfileSupported,
  jqn,
  findBlockedMarketplace,
  isPluginDirectoryMarketplace,
  pluginDirectoryUnavailableReason,
  Qft,
  computeDependencyEnablement,
  autoInstallPluginDependencies,
  Nks,
  mapped_4,
  fqn,
  findOtherMarketplaceInstalls,
};
