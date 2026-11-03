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
import { readdir, mkdir, writeFile, lstat, realpath, rename, open } from "fs/promises";
import { resolve as resolve_2, join } from "path";
import { constants } from "fs";
import { b8e } from "../../../vendor/jsonc-parser/lib/esm/main.js";
import { stripBom } from "../json.js";
import { quotedPrintable } from "../printableName.js";
import {
  semverCompat,
  isValidNpmPackageNameLoose,
  checkTarballUrl,
  isNpmVersionSpec,
  npmExecEnv,
  runNpm,
  getDefaultHttpNpmRegistry,
  fdRealPath,
} from "./npmPluginSource.js";
import { jsonParse, jsonStringify } from "../slowOperations.js";
import { isFsInaccessible, getErrnoCode, errorMessage, isFsInaccessibleCode } from "../errors.js";
import { foldCase_2 } from "../networkPaths.js";
import { logForDebugging } from "../debug.js";
import { whichAsync } from "../which.js";
import {
  makeTempSiblingName,
  stripTempSiblingSuffix,
  hasLinkedAncestorBelow,
} from "./pluginCacheMaterialize.js";
import { execFileNoThrowWithCwd } from "../execFileNoThrow.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import { getPlatform } from "../platform.js";
import { READ_LIMITS } from "../fsBoundRead.js";
import { retryFsOpLong } from "../atomicPublishWrite.js";
import { readOnlyNoFollowFlags } from "../platformTargets.js";
import { redactUrlsInMessage } from "../redaction/urlRedaction.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  removePluginInstallation,
  listInstalledPluginIds,
  isPluginUnreadableOrShared,
  isInstallationRelevantToCurrentProject,
  filterInstallationsForCurrentProject,
} from "./installedPluginsManager.js";
import {
  installationAtTarget,
  findMatchingInstallations,
  qualifyDependency,
  findReverseDependentNames,
} from "./dependencyResolver.js";
import {
  hasDirectoryRepositoryKey,
  persistDirectoryBinding,
  seedBindingsFromInstall,
  isOfficialPluginDirectoryId,
} from "./pluginDirectoryBindings.js";
import { bindingKeysFor } from "./pluginInstallationHelpers.js";
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
import { refreshPluginCaches, markPluginVersionOrphaned } from "./cacheUtils.js";
import { removePluginUsage } from "../telemetry/pluginTelemetry.js";
import { getEnabledPluginIdsInSource } from "./pluginPolicy.js";
import { getCwd } from "../cwd.js";
import { classifyMarketplacePath, getMarketplaceCandidatePaths } from "./localMarketplacePaths.js";
import {
  loadKnownMarketplacesSafe,
  tryUnwrapTextPayload,
  pluginDirectoryUnavailableKind,
  awaitPluginDirectoryVerdict,
  pluginDirectoryRefusalReason,
  getPluginById,
  isListingBlocked,
  collectOrgBlockedPlugins,
  isPluginDirectoryAvailable,
  getPluginByIdCacheOnly,
} from "./marketplaceManager.js";
import { anchoredPluginCachePath, loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { versionCacheStorageSpace } from "./pluginDirectories.js";
import { toProbeError } from "./cachePublish.js";
import { getFsImplementation } from "../fsOperations.js";
import { pluginManifestPathSchemas } from "./schemas.js";
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
import { marketplaceNameOfId } from "./headersHelper.js";
import { samePluginSource, sourceUrlAndRef } from "./pluginSourceUrl.js";
import { uniq } from "../collections.js";

//@ chunk-e6aww6q8.js:4400802-4400826 placement
class PluginDependencyError extends Error {}
//@ chunk-e6aww6q8.js:4400826-4401137 placement
/**
 * package.json 依赖字段、锁文件标记与校验正则等常量。
 */
var DEPENDENCY_FIELDS_2 = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies"];
var LOCK_ENTRY_DEPENDENCY_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies"];
var LOCK_ENTRY_FLAGS = ["dev", "optional", "devOptional", "peer"];
var PLATFORM_FIELDS = ["os", "cpu", "libc"];
var INTEGRITY_RE = /^(sha512|sha384|sha256|sha1)-[A-Za-z0-9+/]+={0,2}$/;
var PLUGIN_DEPENDENCIES = "plugin-dependencies";
var PLACEHOLDER_VERSION = "0.0.0";
//@ chunk-e6aww6q8.js:4401137-4401818 placement
function checkPackageLock(e, n, lockfileName, registry) {
  let jsonObject = parseJsonObject(e, "package.json");
  let jsonObject_2 = parseJsonObject(n, lockfileName);
  if (jsonObject_2.lockfileVersion !== 2 && jsonObject_2.lockfileVersion !== 3)
    throw new PluginDependencyError(
      `its ${lockfileName} is in an old format; regenerate it with npm 7 or later`,
    );
  if (jsonObject.overrides !== undefined)
    throw new PluginDependencyError("its package.json sets overrides, which this install does not apply");
  let packages = jsonObject_2.packages;
  if (!isPlainObjectLike(packages) || !isPlainObjectLike(packages[""]))
    throw new PluginDependencyError(`its ${lockfileName} has no packages section with the plugin in it`);
  let w = assertLockMatchesPackage(packages[""], jsonObject, lockfileName);
  let L = {
    "": {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      ...w,
    },
  };
  for (let [key, value] of Object.entries(packages))
    if (key !== "") L[key] = validateLockEntry(key, value, lockfileName, registry);
  return {
    packageCount: Object.keys(L).length - 1,
    packageJson: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      ...w,
    },
    lockfile: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      lockfileVersion: 3,
      requires: true,
      packages: L,
    },
  };
}
//@ chunk-e6aww6q8.js:4401818-4402964 placement
/**
 * 检查插件的 bun.lock 是否可用（JSON 格式、版本、patchedDependencies）。
 */
function checkBunLock(e, n, r) {
  let jsonObject = parseJsonObject(e, "package.json");
  let h = [];
  let y = b8e(stripBom(n), h, {
    allowTrailingComma: true,
    disallowComments: true,
  });
  if (h.length > 0 || !isPlainObjectLike(y))
    throw new PluginDependencyError("its bun.lock is not valid JSON");
  if (![0, 1, 2].includes(y.lockfileVersion))
    throw new PluginDependencyError("its bun.lock is in a format this version of Claude Code does not read");
  if (y.patchedDependencies !== undefined || jsonObject.patchedDependencies !== undefined)
    throw new PluginDependencyError(
      "it patches its dependencies (patchedDependencies), which this install does not apply",
    );
  let workspaces = y.workspaces;
  if (
    !isPlainObjectLike(workspaces) ||
    !isPlainObjectLike(workspaces[""]) ||
    Object.keys(workspaces).length !== 1
  )
    throw new PluginDependencyError("its bun.lock does not list the plugin as its only workspace");
  let packages = y.packages;
  if (!isPlainObjectLike(packages)) throw new PluginDependencyError("its bun.lock lists no packages");
  let L = assertLockMatchesPackage(workspaces[""], jsonObject, "bun.lock");
  let { peerDependenciesMeta, ...q } = L;
  if (workspaces[""].optionalPeers !== undefined)
    q.optionalPeers = assertOptionalPeers(workspaces[""].optionalPeers, "its bun.lock");
  let Z = {};
  for (let [key, value] of Object.entries(packages)) Z[key] = validateBunLockEntry(key, value, r);
  return {
    packageCount: Object.keys(Z).length,
    packageJson: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      ...L,
    },
    lockfile: {
      lockfileVersion: y.lockfileVersion,
      ...(typeof y.configVersion === "number" && {
        configVersion: y.configVersion,
      }),
      workspaces: {
        "": {
          name: PLUGIN_DEPENDENCIES,
          ...q,
        },
      },
      packages: Z,
    },
  };
}
//@ chunk-e6aww6q8.js:4402964-4403268 placement
/**
 * package.json 与锁文件列出的依赖须一致。
 */
function assertLockMatchesPackage(e, jsonObject, r) {
  let s = validateDependencyLists(e, DEPENDENCY_FIELDS_2, `its ${r}`);
  let h = omitOptionalFromDependencies(
    validateDependencyLists(jsonObject, DEPENDENCY_FIELDS_2, "its package.json"),
    r === "bun.lock" ? ["devDependencies"] : [],
  );
  if (dependencyFingerprint(s) !== dependencyFingerprint(h))
    throw new PluginDependencyError(`its package.json and ${r} list different dependencies`);
  return isPlainObjectLike(jsonObject.peerDependenciesMeta)
    ? {
        ...s,
        peerDependenciesMeta: sanitizePeerDependenciesMeta(jsonObject.peerDependenciesMeta),
      }
    : s;
}
//@ chunk-e6aww6q8.js:4403268-4403504 placement
function omitOptionalFromDependencies(e, n = []) {
  let optionalDependencies = e.optionalDependencies;
  if (optionalDependencies === undefined) return e;
  let s = {
    ...e,
  };
  for (let h of ["dependencies", ...n]) {
    let y = e[h];
    if (y !== undefined) {
      let S = {};
      for (let [key, value] of Object.entries(y))
        if (!Object.hasOwn(optionalDependencies, key)) S[key] = value;
      s[h] = S;
    }
  }
  return s;
}
//@ chunk-e6aww6q8.js:4403504-4404560 placement
/**
 * 校验 package-lock 条目：必须是 node_modules 下的包、对象、非链接/捆绑、有精确版本；名字须合法； 有 resolved 时须是合规链接且带 integrity；依赖、标志、平台、bin、peerDependenciesMeta 逐项校验。返回规范化后的条目。
 */
function validateLockEntry(entryPath, entry, lockfileName, registry) {
  let label = `its ${lockfileName} entry "${quotedPrintable(entryPath, 120)}"`;
  if (!isNodeModulesPath(entryPath))
    throw new PluginDependencyError(`${label} is not a package in node_modules`);
  if (!isPlainObjectLike(entry)) throw new PluginDependencyError(`${label} is not an object`);
  if (entry.link !== undefined || entry.inBundle !== undefined)
    throw new PluginDependencyError(`${label} is a folder link or a bundled copy`);
  let version = entry.version;
  if (typeof version !== "string" || semverCompat.parse(version) === null)
    throw new PluginDependencyError(`${label} has no exact version`);
  let result = {
    version,
  };
  if (entry.name !== undefined) {
    if (typeof entry.name !== "string" || !isValidNpmPackageNameLoose(entry.name))
      throw new PluginDependencyError(`${label} has a name that is not an npm package name`);
    result.name = entry.name;
  }
  if (entry.resolved !== undefined) {
    result.resolved = assertDownloadLink(entry.resolved, label, registry, "npm");
    if (entry.integrity === undefined)
      throw new PluginDependencyError(`${label} has no integrity hash for its download link`);
  }
  if (entry.integrity !== undefined)
    result.integrity = assertIntegrity(entry.integrity, label, entry.resolved !== undefined);
  Object.assign(result, validateDependencyLists(entry, LOCK_ENTRY_DEPENDENCY_FIELDS, label));
  for (let w of LOCK_ENTRY_FLAGS) if (entry[w] === true) result[w] = true;
  for (let w of PLATFORM_FIELDS)
    if (entry[w] !== undefined) {
      if (!isStringArray(entry[w])) throw new PluginDependencyError(`${label} has an unreadable ${w} list`);
      result[w] = entry[w];
    }
  if (entry.bin !== undefined) result.bin = validateBinField(entry.bin, label);
  if (isPlainObjectLike(entry.peerDependenciesMeta))
    result.peerDependenciesMeta = sanitizePeerDependenciesMeta(entry.peerDependenciesMeta);
  return result;
}
//@ chunk-e6aww6q8.js:4404560-4405476 placement
function validateBunLockEntry(e, n, r) {
  let s = `its bun.lock entry "${quotedPrintable(e, 120)}"`;
  if (!isPackagePath(e)) throw new PluginDependencyError(`${s} is not a package path`);
  if (!Array.isArray(n) || n.length !== 4) throw new PluginDependencyError(`${s} is not a registry package`);
  let [h, y, S, w] = n;
  let L = typeof h === "string" ? h.lastIndexOf("@") : -1;
  if (
    typeof h !== "string" ||
    L <= 0 ||
    !isValidNpmPackageNameLoose(h.slice(0, L)) ||
    semverCompat.parse(h.slice(L + 1)) === null
  )
    throw new PluginDependencyError(`${s} is not a registry package at an exact version`);
  if (y !== "") assertDownloadLink(y, s, r, "bun");
  if (!isPlainObjectLike(S)) throw new PluginDependencyError(`${s} has unreadable metadata`);
  let G = validateDependencyLists(S, LOCK_ENTRY_DEPENDENCY_FIELDS, s);
  for (let q of PLATFORM_FIELDS) {
    let Z = S[q];
    if (Z !== undefined) {
      if (typeof Z !== "string" && !isStringArray(Z))
        throw new PluginDependencyError(`${s} has an unreadable ${q} list`);
      G[q] = Z;
    }
  }
  if (S.optionalPeers !== undefined) G.optionalPeers = assertOptionalPeers(S.optionalPeers, s);
  if (S.bin !== undefined) G.bin = validateBinField(S.bin, s);
  if (S.binDir !== undefined) {
    if (typeof S.binDir !== "string" || !isSafePackageSubpath(S.binDir))
      throw new PluginDependencyError(`${s} has a bin folder outside its package`);
    G.binDir = S.binDir;
  }
  return [h, y, G, assertIntegrity(w, s, y !== "")];
}
//@ chunk-e6aww6q8.js:4405476-4405638 placement
function assertDownloadLink(e, n, r, s) {
  let reason = typeof e === "string" ? checkTarballUrl(e, undefined, r, s)?.reason : "is not text";
  if (reason !== undefined) throw new PluginDependencyError(`${n} has a download link that ${reason}`);
  return e;
}
//@ chunk-e6aww6q8.js:4405638-4405861 placement
function assertOptionalPeers(optionalPeers, n) {
  if (!isStringArray(optionalPeers))
    throw new PluginDependencyError(`${n} has an unreadable optionalPeers list`);
  let found = optionalPeers.find((s) => !isValidNpmPackageNameLoose(s));
  if (found !== undefined)
    throw new PluginDependencyError(
      `${n} has an optional peer that is not a registry package: ${quotedPrintable(found, 120)}`,
    );
  return optionalPeers;
}
//@ chunk-e6aww6q8.js:4405861-4406118 placement
function assertIntegrity(e, n, r) {
  if (e === "")
    throw new PluginDependencyError(
      r ? `${n} has no integrity hash for its download link` : `${n} has an empty integrity hash`,
    );
  if (typeof e !== "string" || !e.split(" ").every((s) => INTEGRITY_RE.test(s)))
    throw new PluginDependencyError(`${n} has an unreadable integrity hash`);
  return e;
}
//@ chunk-e6aww6q8.js:4406118-4406425 placement
/**
 * 依赖列表须为“注册表包名 → 版本范围”。
 */
function validateDependencyLists(e, n, r) {
  let s = {};
  for (let h of n) {
    let y = e[h];
    if (y === undefined) continue;
    if (!isPlainObjectLike(y)) throw new PluginDependencyError(`${r} has an unreadable ${h} list`);
    for (let [key, value] of Object.entries(y))
      if (!isValidNpmPackageNameLoose(key) || !isRegistryVersionRange(value))
        throw new PluginDependencyError(
          `${r} has a dependency that is not a registry package and version range: ${quotedPrintable(key, 120)}`,
        );
    s[h] = y;
  }
  return s;
}
//@ chunk-e6aww6q8.js:4406425-4406551 placement
function isRegistryVersionRange(e) {
  if (typeof e !== "string") return false;
  let match = /^npm:(.+)@([^@]*)$/.exec(e);
  return match === null
    ? isNpmVersionSpec(e)
    : isValidNpmPackageNameLoose(match[1]) && isNpmVersionSpec(match[2]);
}
//@ chunk-e6aww6q8.js:4406551-4406659 placement
function isNodeModulesPath(entryPath) {
  return (
    entryPath.startsWith("node_modules/") &&
    entryPath
      .slice(13)
      .split("/node_modules/")
      .every((r) => isValidNpmPackageNameLoose(r))
  );
}
//@ chunk-e6aww6q8.js:4406659-4406828 placement
function isPackagePath(e) {
  let parts = e.split("/");
  let r = [];
  for (let idx = 0; idx < parts.length; idx++) {
    let h = parts[idx];
    let y = h.startsWith("@") && idx + 1 < parts.length;
    r.push(y ? `${h}/${parts[++idx]}` : h);
  }
  return r.every((s) => isValidNpmPackageNameLoose(s));
}
//@ chunk-e6aww6q8.js:4406828-4406926 placement
function isSafePackageSubpath(e) {
  return e !== "" && !e.startsWith("/") && !/[\\:]/.test(e) && !e.split("/").includes("..");
}
//@ chunk-e6aww6q8.js:4406926-4406994 placement
function isSafePackageFileSegment(e) {
  return e !== "" && e !== "." && e !== ".." && !/[\\/:]/.test(e);
}
//@ chunk-e6aww6q8.js:4406994-4407227 placement
function validateBinField(e, n) {
  if (
    typeof e === "string"
      ? isSafePackageSubpath(e)
      : isPlainObjectLike(e) &&
        Object.entries(e).every(
          ([key, value]) =>
            isSafePackageFileSegment(key) && typeof value === "string" && isSafePackageSubpath(value),
        )
  )
    return e;
  throw new PluginDependencyError(
    `${n} has a bin link that points outside its package or has an invalid command name`,
  );
}
//@ chunk-e6aww6q8.js:4407227-4407342 placement
function sanitizePeerDependenciesMeta(peerDependenciesMeta) {
  let n = {};
  for (let [key, value] of Object.entries(peerDependenciesMeta))
    if (isValidNpmPackageNameLoose(key) && isPlainObjectLike(value))
      n[key] = {
        optional: value.optional === true,
      };
  return n;
}
//@ chunk-e6aww6q8.js:4407342-4407496 placement
function parseJsonObject(e, n) {
  let r;
  try {
    r = jsonParse(stripBom(e));
  } catch {
    throw new PluginDependencyError(`its ${n} is not valid JSON`);
  }
  if (!isPlainObjectLike(r)) throw new PluginDependencyError(`its ${n} is not a JSON object`);
  return r;
}
//@ chunk-e6aww6q8.js:4407496-4407593 placement
function dependencyFingerprint(e) {
  return jsonStringify(
    DEPENDENCY_FIELDS_2.map((n) =>
      Object.entries(e[n] ?? {}).sort(([r], [s]) => (r < s ? -1 : r > s ? 1 : 0)),
    ),
  );
}
//@ chunk-e6aww6q8.js:4407593-4407664 placement
function isPlainObjectLike(e) {
  return typeof e === "object" && e !== null && !Array.isArray(e);
}
//@ chunk-e6aww6q8.js:4407664-4407739 placement
function isStringArray(e) {
  return Array.isArray(e) && e.every((n) => typeof n === "string");
}
//@ chunk-e6aww6q8.js:4407739-4408464 placement
/**
 * 安装插件依赖（npm 或 bun，禁用脚本）。
 */
var installPluginDependencies_2 = 60000;
var MAX_DEPENDENCY_INSTALL_TIMEOUT_MS = 33554432;
var MAX_DEPENDENCY_INSTALL_BYTES = [
  "ci",
  "--ignore-scripts",
  "--workspaces=false",
  "--no-audit",
  "--no-fund",
];
var NPM_CI_ARGS = [
  {
    lockfile: "bun.lock",
    command: "bun",
    args: ["install", "--frozen-lockfile", "--ignore-scripts"],
  },
  {
    lockfile: "npm-shrinkwrap.json",
    command: "npm",
    args: MAX_DEPENDENCY_INSTALL_BYTES,
    completionRecord: "node_modules/.package-lock.json",
  },
  {
    lockfile: "package-lock.json",
    command: "npm",
    args: MAX_DEPENDENCY_INSTALL_BYTES,
    completionRecord: "node_modules/.package-lock.json",
  },
  {
    lockfile: "bun.lockb",
    command: "bun",
    args: ["install", "--frozen-lockfile", "--ignore-scripts"],
  },
];
var LOCKFILE_INSTALL_PLANS =
  "its bun.lockb is a binary lockfile that cannot be checked; ship a text bun.lock instead";
var mapped_4 = NPM_CI_ARGS.map((e) => e.lockfile);
var BINARY_LOCKFILE_UNSUPPORTED_TEXT = new Map(
  NPM_CI_ARGS.flatMap((e) => (e.completionRecord === undefined ? [] : [[e.lockfile, e.completionRecord]])),
);
//@ chunk-e6aww6q8.js:4408464-4408939 placement
/**
 * 插件目录有 package.json 时按锁文件选择包管理器安装依赖；yarn/pnpm 锁文件不支持（会绕过 --ignore-scripts）； 返回 {ran, error?}。
 */
async function installPluginDependencies(e, { inPlaceAt: n } = {}) {
  let r;
  try {
    r = await readdir(e);
  } catch (error) {
    if (isFsInaccessible(error))
      return {
        ran: false,
      };
    throw error;
  }
  let s = new Set(r.map((y) => foldCase_2(y)));
  if (!s.has("package.json"))
    return {
      ran: false,
    };
  let lockfile = detectLockfile(s);
  if (lockfile === "yarn-or-pnpm")
    return {
      ran: false,
      error:
        "Skipped: yarn/pnpm lockfiles are not supported (resolution-time hooks bypass --ignore-scripts). Use bun or npm.",
    };
  if (lockfile === undefined)
    return {
      ran: false,
    };
  logForDebugging(`Installing plugin dependencies: ${lockfile.command} ${lockfile.args.join(" ")} for ${e}`);
  return choosePackageManager(e, lockfile, n);
}
//@ chunk-e6aww6q8.js:4408939-4409090 placement
function detectLockfile(e) {
  let found = NPM_CI_ARGS.find((r) => e.has(r.lockfile));
  if (found !== undefined) return found;
  return e.has("yarn.lock") || e.has("pnpm-lock.yaml") ? "yarn-or-pnpm" : undefined;
}
//@ chunk-e6aww6q8.js:4409090-4409926 placement
async function checkLockfileSupported(e) {
  let n;
  try {
    n = await readdir(e);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  let r = new Set(n.map((h) => foldCase_2(h)));
  if (!r.has("package.json") || r.has("node_modules")) return;
  let lockfile = detectLockfile(r);
  if (lockfile === undefined) return;
  try {
    let packageFile = await readPackageFile(e, "package.json");
    if (!hasLifecycleScripts(packageFile)) return;
    if (lockfile === "yarn-or-pnpm")
      return {
        kind: "refused",
        reason: "it uses a yarn or pnpm lockfile, which plugin installs do not support",
      };
    if (lockfile.lockfile === "bun.lockb")
      return {
        kind: "refused",
        reason: LOCKFILE_INSTALL_PLANS,
      };
    let packageFile_2 = await readPackageFile(e, lockfile.lockfile);
    let S;
    try {
      S = lockfileCompletionMatches(lockfile, packageFile, packageFile_2, undefined);
    } catch (error) {
      if (error instanceof PluginDependencyError && packageFile_2.includes('"http://')) return;
      throw error;
    }
    if (S.packageCount === 0) return;
    return (await whichAsync(lockfile.command)) === null
      ? {
          kind: "refused",
          reason: `it needs ${lockfile.command}, which is not installed on this computer`,
        }
      : {
          kind: "not-installed",
        };
  } catch (error) {
    if (error instanceof PluginDependencyError)
      return {
        kind: "refused",
        reason: error.message,
      };
    if (isFsInaccessible(error)) return;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4409926-4410006 placement
var DEPENDENCY_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies", "workspaces"];
//@ chunk-e6aww6q8.js:4410006-4410110 placement
function hasLifecycleScripts(packageFile) {
  let n;
  try {
    n = jsonParse(stripBom(packageFile));
  } catch {
    return true;
  }
  if (!isPlainObjectLike(n)) return true;
  return DEPENDENCY_FIELDS.some((r) => hasAnyDependencyEntry(n[r]));
}
//@ chunk-e6aww6q8.js:4410110-4410192 placement
function hasAnyDependencyEntry(e) {
  return isPlainObjectLike(e) ? Object.keys(e).length > 0 : Array.isArray(e) && e.length > 0;
}
//@ chunk-e6aww6q8.js:4410192-4410967 placement
async function choosePackageManager(e, lockfile, r) {
  let tempSiblingName = makeTempSiblingName(stripTempSiblingSuffix(resolve_2(e)));
  try {
    await mkdir(tempSiblingName);
  } catch (error) {
    return dependencyInstallError(lockfile.command, error);
  }
  try {
    let packageManagerInputs = await preparePackageManagerInputs(e, lockfile, tempSiblingName);
    if (packageManagerInputs.packageCount === 0)
      return {
        ran: false,
      };
    await writeFile(join(tempSiblingName, "package.json"), jsonStringify(packageManagerInputs.packageJson));
    await writeFile(
      join(tempSiblingName, lockfile.command === "npm" ? "package-lock.json" : "bun.lock"),
      jsonStringify(packageManagerInputs.lockfile),
      {
        flag: "wx",
      },
    );
    let y = npmExecEnv();
    let S =
      lockfile.command === "npm"
        ? await runNpm(
            lockfile.args,
            {
              workDir: tempSiblingName,
              toolCgroupClass: "plugin",
            },
            installPluginDependencies_2,
          )
        : await execFileNoThrowWithCwd(lockfile.command, lockfile.args, {
            cwd: tempSiblingName,
            timeout: installPluginDependencies_2,
            toolCgroupClass: "plugin",
            ...y,
            env: {
              ...y.env,
              BUN_INSTALL_CACHE_DIR: join(tempSiblingName, "bun-cache"),
            },
          });
    if (S.code === 0)
      await (r !== undefined ? placeNodeModules(tempSiblingName, e, r) : swapNodeModules(tempSiblingName, e));
    return dependencyInstallResult(lockfile.command, S, e);
  } catch (error) {
    if (error instanceof PluginDependencyError)
      return {
        ran: false,
        error: `Skipped installing this plugin's dependencies: ${error.message}.`,
      };
    return dependencyInstallError(lockfile.command, error);
  } finally {
    await removeDirectoryTreeNoFollow_2(tempSiblingName).catch(() => {});
  }
}
//@ chunk-e6aww6q8.js:4410967-4411227 placement
async function preparePackageManagerInputs(e, n, tempSiblingName) {
  if (n.lockfile === "bun.lockb") throw new PluginDependencyError(LOCKFILE_INSTALL_PLANS);
  let packageFile = await readPackageFile(e, "package.json");
  let packageFile_2 = await readPackageFile(e, n.lockfile);
  await writeFile(join(tempSiblingName, "package.json"), "{}", {
    flag: "wx",
  });
  let y = packageFile_2.includes('"http://')
    ? await getDefaultHttpNpmRegistry({
        workDir: tempSiblingName,
      })
    : undefined;
  return lockfileCompletionMatches(n, packageFile, packageFile_2, y);
}
//@ chunk-e6aww6q8.js:4411227-4411307 placement
function lockfileCompletionMatches(e, packageFile, packageFile_2, s) {
  return e.command === "npm"
    ? checkPackageLock(packageFile, packageFile_2, e.lockfile, s)
    : checkBunLock(packageFile, packageFile_2, s);
}
//@ chunk-e6aww6q8.js:4411307-4411331 placement
class PluginDependencyCheckError extends Error {}
//@ chunk-e6aww6q8.js:4411331-4411356 placement
class PluginDependencyInstallError extends Error {}
//@ chunk-e6aww6q8.js:4411356-4411469 placement
var FOLDER_REPLACED_MESSAGE =
  "the plugin's folder was moved or replaced by a link during the install, so the packages were not added";
//@ chunk-e6aww6q8.js:4411469-4411626 placement
async function assertFolderUnchanged(e, n) {
  let [r, s] = await Promise.all([
    lstat(e).catch(() => {
      return;
    }),
    realpath(e).catch(() => {
      return;
    }),
  ]);
  if (r?.isDirectory() !== true || s !== n) throw new PluginDependencyCheckError(FOLDER_REPLACED_MESSAGE);
}
//@ chunk-e6aww6q8.js:4411626-4412093 placement
/**
 * Linux 上经目录 fd 把 node_modules 移入插件目录。
 */
async function moveNodeModulesSafely(e, n, r) {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") {
    await rename(e, r);
    return;
  }
  let h = await open(
    n,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
  ).catch((error) => {
    throw ["ENOTDIR", "ELOOP", "ENOENT"].includes(getErrnoCode(error) ?? "")
      ? new PluginDependencyCheckError(FOLDER_REPLACED_MESSAGE)
      : error;
  });
  try {
    let y = await fdRealPath(h.fd);
    if (y === null)
      throw new PluginDependencyCheckError(
        "could not confirm where the plugin's folder is, so the packages were not added",
      );
    if (y !== n) throw new PluginDependencyCheckError(FOLDER_REPLACED_MESSAGE);
    await rename(e, `/proc/self/fd/${h.fd}/node_modules`);
  } finally {
    await h.close();
  }
}
//@ chunk-e6aww6q8.js:4412093-4412181 placement
/**
 * hasNodeModulesDir：是否存在 node_modules 目录。
 */
async function hasNodeModulesDir(absolute) {
  return lstat(join(absolute, "node_modules")).then(
    (n) => n.isDirectory(),
    () => false,
  );
}
//@ chunk-e6aww6q8.js:4412181-4412726 placement
/**
 * 把安装好的 node_modules 放进插件目录并处理失败。
 */
async function placeNodeModules(tempSiblingName, n, r) {
  let s = join(n, "node_modules");
  try {
    await retryFsOpLong(join(tempSiblingName, "node_modules"), s, async (h, y) => {
      await assertFolderUnchanged(n, r);
      await moveNodeModulesSafely(h, r, y).catch(async (error) => {
        if (
          !(error instanceof PluginDependencyCheckError) &&
          (await lstat(y).then(
            () => true,
            () => false,
          ))
        )
          throw new PluginDependencyInstallError(errorMessage(error), {
            cause: error,
          });
        throw error;
      });
    });
  } catch (error) {
    if (error instanceof PluginDependencyCheckError) throw error;
    let y = error instanceof PluginDependencyInstallError ? error.cause : error;
    if (
      error instanceof PluginDependencyInstallError ||
      (await lstat(s).then(
        () => true,
        () => false,
      ))
    ) {
      await assertFolderUnchanged(n, r);
      return;
    }
    if (
      getErrnoCode(y) === "ENOENT" &&
      !(await lstat(join(tempSiblingName, "node_modules")).then(
        () => true,
        () => false,
      ))
    )
      throw Error("the package manager finished but wrote no node_modules");
    throw y;
  }
}
//@ chunk-e6aww6q8.js:4412726-4413150 placement
/**
 * 读插件目录里的 package.json/锁文件（须普通文件且 ≤32 MB）。
 */
async function readPackageFile(e, lockfile) {
  let r = join(e, lockfile);
  if (
    !(
      await lstat(r).catch((error) => {
        if (getErrnoCode(error) === "ENOENT")
          throw new PluginDependencyError(`its ${lockfile} is missing, or not named in lowercase`);
        throw error;
      })
    ).isFile()
  )
    throw new PluginDependencyError(`its ${lockfile} is not a regular file`);
  let h = await open(r, readOnlyNoFollowFlags());
  try {
    let stats = await h.stat();
    if (!stats.isFile() || stats.size > MAX_DEPENDENCY_INSTALL_TIMEOUT_MS)
      throw new PluginDependencyError(`its ${lockfile} is not a regular file of at most 32 MB`);
    return await h.readFile({
      encoding: "utf8",
    });
  } finally {
    await h.close();
  }
}
//@ chunk-e6aww6q8.js:4413150-4413415 placement
async function swapNodeModules(tempSiblingName, n) {
  let r = join(n, "node_modules");
  let s = join(tempSiblingName, "previous-node_modules");
  let h = await retryFsOpLong(r, s).then(
    () => true,
    (error) => {
      if (getErrnoCode(error) === "ENOENT") return false;
      throw error;
    },
  );
  try {
    await retryFsOpLong(join(tempSiblingName, "node_modules"), r);
  } catch (error) {
    if (h) await retryFsOpLong(s, r).catch(() => {});
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-e6aww6q8.js:4413415-4413522 placement
function dependencyInstallError(command, error) {
  return {
    ran: true,
    error: `Plugin dependency install failed (${command}): ${redactUrlsInMessage(errorMessage(error))}`.slice(
      0,
      500,
    ),
  };
}
//@ chunk-e6aww6q8.js:4413522-4413753 placement
function dependencyInstallResult(command, n, r) {
  if (n.code !== 0)
    return {
      ran: true,
      error:
        `Plugin dependency install failed (${command}): ${redactUrlsInMessage(n.stderr || n.stdout || n.error || "no output")}`.slice(
          0,
          500,
        ),
    };
  logForDebugging(`Plugin dependency install succeeded (${command}) in ${r}`);
  return {
    ran: true,
  };
}
//@ chunk-e6aww6q8.js:4413753-4413764 placement
/**
 * npmMarketplaceDefaultOff：npm 市场默认关闭。
 */
var npmMarketplaceDefaultOff = false;
//@ chunk-e6aww6q8.js:4451911-4454381 placement
/**
 * 清理不再被依赖的自动安装插件，设置写入失败时保留。
 */
async function pruneOrphanedAutoDeps(orphans, n, projectPathForScope, { deleteDataDir: s = true } = {}, h) {
  if (orphans.size === 0) return [];
  let y =
    isStorageV5Enabled() && h !== undefined ? await loadInstalledPlugins(h) : loadInstalledPluginsSync();
  let plugins = y.plugins;
  let w = [];
  let L = [];
  for (let we of orphans) {
    let Ee = plugins[we];
    let Ae = installationAtTarget(Ee, n, projectPathForScope);
    if (!Ae) continue;
    {
      let matchingInstallations = findMatchingInstallations(Ee, n, projectPathForScope);
      if (!(Ee ?? []).filter((We) => !matchingInstallations.includes(We)).some(hasDirectoryRepositoryKey)) {
        if ((await persistDirectoryBinding(we, Ee)) === "not-persisted") {
          logForDebugging(
            `pruneOrphanedAutoDeps: ${we} is kept: plugin-directory-bindings.json could not be used or written, so nothing would hold its name once this install record is gone`,
            {
              level: "warn",
            },
          );
          continue;
        }
      } else await seedBindingsFromInstall(we, Ee);
    }
    await removePluginInstallation(we, n, projectPathForScope, h);
    L.push(we);
    if ((Ee?.length ?? 0) <= 1)
      w.push({
        id: we,
        installPath: Ae.installPath,
      });
  }
  if (L.length === 0) return [];
  let G = (we) =>
    bindingKeysFor(plugins, we).flatMap(([Ee, Ae]) =>
      Ee !== we && Ae.length > 0 && !L.includes(Ee) ? [Ee] : [],
    );
  let q = scopeToSettingSource(n);
  let { error } = await updateSettingsForSourceWithTransform(
    q,
    (we) => {
      let Ee = {
        ...we?.enabledPlugins,
      };
      for (let Ae of L) {
        Ee[Ae] = undefined;
        for (let Ie of enabledPluginKeys(Ee, Ae, G(Ae))) Ee[Ie] = undefined;
      }
      return {
        enabledPlugins: Ee,
      };
    },
    undefined,
    h,
  );
  if (error) logForDebugging(`pruneOrphanedAutoDeps: settings write failed at ${n}: ${error.message}`);
  refreshPluginCaches(h);
  let installedIds = w.some(({ id }) => isOfficialPluginDirectoryId(id))
    ? listInstalledPluginIds(
        isStorageV5Enabled() && h !== undefined ? await loadInstalledPlugins(h) : loadInstalledPluginsSync(),
      )
    : [];
  let ke = new Set(w.map((we) => we.id));
  for (let { id, installPath } of w) {
    await markPluginVersionOrphaned(installPath, h);
    let installedOthers = [];
    installedOthers = G(id);
    let { plan, stillOn, entry } = await planUninstallCleanup(id, {
      deleteDataDir: s && !isPluginUnreadableOrShared(id, y, ke),
      installedIds,
      installedOthers,
      storageV5: h,
    });
    if (plan.kind === "nothing" && plan.reason === "still-switched-on") {
      let joined = stillOn.map(describeUnwritableSettingsSource).join(" and ");
      let lt =
        entry === "held"
          ? "plugin-directory-bindings.json still holds its name"
          : "plugin-directory-bindings.json could not be used, so its name counts as held";
      let Je = [
        ...(stillOn.some(({ readsBack }) => readsBack === "unreadable")
          ? ["a file that could not be read must be mended first"]
          : []),
        ...(stillOn.some(
          ({ readsBack, notReadBecause }) => readsBack === "not-read-here" && notReadBecause === undefined,
        )
          ? ["a file that was not read: after this workspace is trusted and Claude Code is started again"]
          : []),
        ...(stillOn.some(({ notReadBecause }) => notReadBecause === "network-path")
          ? [
              "a file that was not read because of its path: after any link to another machine on that path is replaced with a real file or folder",
            ]
          : []),
      ];
      let nt = Je.length > 0 ? ` (${Je.join("; ")})` : "";
      let pt =
        entry === "held"
          ? `switch it off there${nt}, then uninstall ${id}`
          : `once plugin-directory-bindings.json can be used, switch it off there${nt}, then uninstall ${id}`;
      logForDebugging(
        `pruneOrphanedAutoDeps: ${id} was pruned, but a settings file still switches it on, could not be read, or is not read in this launch (${joined}), so nothing it saved was removed, and ${lt}; ${pt}`,
        {
          level: "warn",
        },
      );
    }
  }
  removePluginUsage(
    w.map((we) => we.id),
    h,
  );
  return L;
}
//@ chunk-e6aww6q8.js:4454381-4454578 placement = hasPendingUpdates (0.783)
/**
 * 插件在该作用域的设置中被启用且对应安装路径（缓存）存在。
 */
async function isPluginEnabledAndCachedAtScope(e, n, r) {
  let s = scopeToSettingSource(n);
  if (!getEnabledPluginIdsInSource(s).has(e)) return false;
  let h = n !== "user" ? getCwd() : undefined;
  let S =
    isStorageV5Enabled() && r !== undefined ? await loadInstalledPlugins(r) : loadInstalledPluginsSync();
  let w = installationAtTarget(S.plugins[e], n, h);
  if (!w) return false;
  return installPathExists(e, w.installPath, r);
}
//@ chunk-e6aww6q8.js:4454578-4455009 placement
async function installPathExists(e, installPath, r) {
  let s = isStorageV5Enabled() && r !== undefined;
  let { absolute, suspect } = classifyMarketplacePath(installPath, {
    trustedRoots: getMarketplaceCandidatePaths(e, await loadKnownMarketplacesSafe(r), tryUnwrapTextPayload()),
  });
  if (suspect) return false;
  let S = anchoredPluginCachePath();
  let w = s ? versionCacheStorageSpace(absolute, S) : null;
  if (isStorageV5Enabled() && r !== undefined && w !== null && !(await hasLinkedAncestorBelow(absolute, S))) {
    let L = await r.scopeKind(w, {
      resolveLink: true,
    });
    if (!L.ok) {
      let { error } = L;
      if ("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)) return false;
      throw toProbeError(error, installPath);
    }
    let G = L.value;
    return G.kind === "link" ? G.linkResolves === true : G.kind !== "absent";
  }
  return pathStatOk(absolute);
}
//@ chunk-e6aww6q8.js:4455009-4455288 placement = hasPendingUpdates (0.783)
/**
 * 插件在该作用域是否有缓存仍存在的安装记录（优先当前项目的记录）。
 */
async function hasCachedInstallationAtScope(pluginId, n, storageV5) {
  let filtered = (
    (isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    ).plugins[pluginId] ?? []
  ).filter((S) => S.scope === n);
  let y = false;
  for (let diskEntry of filtered) {
    if (!isInstallationRelevantToCurrentProject(diskEntry)) continue;
    y = true;
    if (await installPathExists(pluginId, diskEntry.installPath, storageV5)) return true;
  }
  if (y) return false;
  for (let S of filterInstallationsForCurrentProject(filtered))
    if (await installPathExists(pluginId, S.installPath, storageV5)) return true;
  return false;
}
//@ chunk-e6aww6q8.js:4455288-4455379 placement
async function pathStatOk(absolute) {
  try {
    await getFsImplementation().stat(absolute);
    return true;
  } catch (error) {
    if (isFsInaccessible(error)) return false;
    throw error;
  }
}
//@ chunk-e6aww6q8.js:4455379-4455577 placement
function findBlockedMarketplace(e, knownMarketplaces, r) {
  let marketplace = parsePluginIdentifier(e).marketplace;
  if (!marketplace) return;
  if (marketplace === pluginManifestPathSchemas) return;
  if (marketplace === OFFICIAL_MARKETPLACE_NAME && pluginDirectoryPolicyBlock() !== null) return marketplace;
  let source = knownMarketplaces[marketplace]?.source;
  if (source === undefined && !r?.failClosedOnUnknownSource) return;
  return isSourceDisallowedOrUnverifiable(source) ? marketplace : undefined;
}
//@ chunk-e6aww6q8.js:4455577-4455732 placement
async function pluginDirectoryUnavailableReason(e) {
  {
    if (parsePluginIdentifier(e).marketplace !== OFFICIAL_MARKETPLACE_NAME) return null;
    if (pluginDirectoryUnavailableKind() === "policy-not-known") await awaitPluginDirectoryVerdict();
    let n = pluginDirectoryUnavailableKind();
    return n === "blocked" ? null : n;
  }
  return null;
}
//@ chunk-e6aww6q8.js:4455732-4455940 placement
/**
 * 插件（或依赖）来自不可用的插件目录时的安装失败提示。
 */
function formatDirectoryUnavailableMessage(pluginName, unavailableDependency) {
  {
    let r = `is unavailable: ${pluginDirectoryRefusalReason()}`;
    return unavailableDependency === undefined
      ? `Cannot install "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY} ${r}`
      : `Cannot install "${quotedPrintable(pluginName)}": its dependency "${quotedPrintable(unavailableDependency)}" is from the ${OFFICIAL_MARKETPLACE_DISPLAY}, which ${r}`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4455940-4456927 placement
/**
 * 自动安装插件声明的依赖，跨市场或找不到时不安装。
 */
async function autoInstallPluginDependencies(e) {
  let n = [];
  let r = [];
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
        {
          level: "warn",
        },
      );
      continue;
    }
    if (isPluginBlockedByPolicy(h))
      return {
        ok: false,
        blockedDependency: h,
      };
    let blockedMarketplace = findBlockedMarketplace(h, e.knownMarketplaces, {
      failClosedOnUnknownSource: e.failClosedOnUnknownSource,
    });
    if (blockedMarketplace)
      return {
        ok: false,
        blockedDependency: h,
        blockedMarketplace,
      };
    let pluginById = await getPluginById(h, e.storageV5, "install");
    if (!pluginById) {
      logForDebugging(
        `${e.pluginId} plugin.json declares dependency "${h}" not found in any known marketplace; not auto-installing`,
        {
          level: "warn",
        },
      );
      r.push(h);
      continue;
    }
    if (await isListingUsableForMarketplace(h, pluginById.entry, e.knownMarketplaces, e.storageV5))
      return {
        ok: false,
        blockedDependency: h,
      };
    e.depInfo.set(h, pluginById);
    n.push(h);
  }
  return {
    ok: true,
    ids: n,
    notFound: r,
  };
}
//@ chunk-e6aww6q8.js:4456927-4457382 placement
/**
 * 依赖闭包中，先确定直接应启用的插件（已有启用记录、显式启用、默认启用或根被依赖），再沿依赖关系传播启用；返回 id→是否启用。
 */
function computeDependencyEnablement({
  closure,
  rootId,
  rootRequiredByDependent,
  priorEnabled,
  explicitAnywhere,
  defaultsById,
  dependenciesById,
}) {
  let w = new Set(closure);
  let L = new Set();
  for (let q of closure) {
    let Z = priorEnabled[q];
    let Se = defaultsById.get(q) ?? true;
    if (Z !== undefined) {
      if (Z !== false || Se) L.add(q);
      continue;
    }
    if (explicitAnywhere.has(q) || Se || (q === rootId && rootRequiredByDependent)) L.add(q);
  }
  let G = [...L];
  while (G.length > 0) {
    let q = G.pop();
    if (q === undefined) break;
    for (let Z of dependenciesById.get(q) ?? [])
      if (w.has(Z) && !L.has(Z)) {
        L.add(Z);
        G.push(Z);
      }
  }
  return new Map(closure.map((q) => [q, L.has(q)]));
}
//@ chunk-e6aww6q8.js:4457382-4457458 placement
/**
 * isListingUsableForMarketplace：目录列表可用于该市场。
 */
async function isListingUsableForMarketplace(e, entry, knownMarketplaces, storageV5) {
  if (!isPluginDirectoryMarketplace(e, knownMarketplaces)) return false;
  return isListingBlocked(entry, await collectOrgBlockedPlugins(storageV5));
}
//@ chunk-e6aww6q8.js:4457458-4457634 placement
function isPluginDirectoryMarketplace(e, n) {
  let { marketplace } = parsePluginIdentifier(e);
  if (marketplace === undefined) return false;
  let s = Object.hasOwn(n, marketplace) ? n[marketplace] : undefined;
  return s !== undefined && s.source !== undefined && s.source !== null
    ? isPluginDirectorySource(s.source)
    : isOfficialMarketplaceSpelling(marketplace);
}
//@ chunk-e6aww6q8.js:4457634-4457686 placement
/**
 * isMarketplaceNamed：市场名是否匹配（官方名按族匹配）。
 */
function isMarketplaceNamed(e, n) {
  return e === OFFICIAL_MARKETPLACE_NAME
    ? isOfficialMarketplaceName_3(n)
    : n === OFFICIAL_MARKETPLACE_NAME && isOfficialMarketplaceName_3(e);
}
//@ chunk-e6aww6q8.js:4457686-4458115 placement
/**
 * 来自同一来源的其他官方市场族安装。
 */
async function findOtherMarketplaceInstalls(e, n, r, s, h) {
  if (isPluginDirectoryAvailable()) {
    let y = marketplaceNameOfId(e);
    if (!y) return [];
    let S = samePluginSource(n.source, sourceUrlAndRef(r[y]?.source));
    if (S === undefined) return [];
    let plugins = (
      isStorageV5Enabled() && h !== undefined ? await loadInstalledPlugins(h) : loadInstalledPluginsSync()
    ).plugins;
    let L = [];
    for (let [key, value] of Object.entries(plugins)) {
      let Z = marketplaceNameOfId(key);
      if (!Z || Z === y || !isMarketplaceNamed(y, Z)) continue;
      let filtered = value.filter(s);
      if (filtered.length === 0) continue;
      let pluginByIdCacheOnly = await getPluginByIdCacheOnly(key, h);
      if (
        pluginByIdCacheOnly &&
        samePluginSource(pluginByIdCacheOnly.entry.source, sourceUrlAndRef(r[Z]?.source)) === S
      )
        L.push({
          otherId: key,
          installations: filtered,
        });
    }
    return L;
  }
  return [];
}
//@ chunk-e6aww6q8.js:4458115-4458476 placement
/**
 * 其他市场安装的说明（作用域、版本、被谁依赖、是否可替换）。
 */
async function describeOtherMarketplaceInstalls(pluginId, entry, knownMarketplaces, storageV5) {
  let otherMarketplaceInstalls = await findOtherMarketplaceInstalls(
    pluginId,
    entry,
    knownMarketplaces,
    isInstallationRelevantToCurrentProject,
    storageV5,
  );
  if (otherMarketplaceInstalls.length === 0) return [];
  let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5);
  return otherMarketplaceInstalls.map(({ otherId, installations }) => {
    let reverseDependentNames = findReverseDependentNames(otherId, allPluginsCacheOnly.enabled);
    return {
      pluginId: otherId,
      scopes: uniq(installations.map((installation) => installation.scope)),
      version: installations[0]?.version,
      gitCommitSha: installations[0]?.gitCommitSha,
      requiredBy: reverseDependentNames,
      replaceable:
        reverseDependentNames.length === 0 &&
        installations.every(
          (installation) => installation.scope === "user" || installation.scope === "local",
        ),
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
  hasNodeModulesDir,
  checkLockfileSupported,
  isMarketplaceNamed,
  findBlockedMarketplace,
  isPluginDirectoryMarketplace,
  pluginDirectoryUnavailableReason,
  isListingUsableForMarketplace,
  computeDependencyEnablement,
  autoInstallPluginDependencies,
  npmMarketplaceDefaultOff,
  mapped_4,
  BINARY_LOCKFILE_UNSUPPORTED_TEXT,
  findOtherMarketplaceInstalls,
};
