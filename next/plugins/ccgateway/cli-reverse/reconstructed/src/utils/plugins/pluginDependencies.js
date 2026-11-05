/**
 * utils/plugins/pluginDependencies.ts
 *
 * 2.1.316 新增：插件依赖
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (60)
 * attribution: placement 60
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { readdir, mkdir, writeFile, lstat, realpath, rename, open } from "fs/promises";
import { resolve as resolve_2, join } from "path";
import { constants } from "fs";
import { parseJsonc } from "../../../vendor/jsonc-parser/lib/esm/main.js";
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
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4507419-4507443 placement
class PluginDependencyError extends Error {}
//@ chunk-5xgkngpb.js:4507443-4507754 placement
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
//@ chunk-5xgkngpb.js:4507754-4508435 placement
function checkPackageLock(packageJsonText, lockText, lockfile, registry) {
  let jsonObject = parseJsonObject(packageJsonText, "package.json");
  let jsonObject_2 = parseJsonObject(lockText, lockfile);
  if (jsonObject_2.lockfileVersion !== 2 && jsonObject_2.lockfileVersion !== 3)
    throw new PluginDependencyError(`its ${lockfile} is in an old format; regenerate it with npm 7 or later`);
  if (jsonObject.overrides !== undefined)
    throw new PluginDependencyError("its package.json sets overrides, which this install does not apply");
  let packages = jsonObject_2.packages;
  if (!isPlainObjectLike(packages) || !isPlainObjectLike(packages[""]))
    throw new PluginDependencyError(`its ${lockfile} has no packages section with the plugin in it`);
  let rootDeps = assertLockMatchesPackage(packages[""], jsonObject, lockfile);
  let lockPackages = {
    "": {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      ...rootDeps,
    },
  };
  for (let [key, value] of Object.entries(packages))
    if (key !== "") lockPackages[key] = validateLockEntry(key, value, lockfile, registry);
  return {
    packageCount: Object.keys(lockPackages).length - 1,
    packageJson: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      ...rootDeps,
    },
    lockfile: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      lockfileVersion: 3,
      requires: true,
      packages: lockPackages,
    },
  };
}
//@ chunk-5xgkngpb.js:4508435-4509585 placement
/**
 * 检查插件的 bun.lock 是否可用（JSON 格式、版本、patchedDependencies）。
 */
function checkBunLock(packageJsonText, lockText, registry) {
  let jsonObject = parseJsonObject(packageJsonText, "package.json");
  let errors = [];
  let lock = parseJsonc(stripBom(lockText), errors, {
    allowTrailingComma: true,
    disallowComments: true,
  });
  if (errors.length > 0 || !isPlainObjectLike(lock))
    throw new PluginDependencyError("its bun.lock is not valid JSON");
  if (![0, 1, 2].includes(lock.lockfileVersion))
    throw new PluginDependencyError("its bun.lock is in a format this version of Claude Code does not read");
  if (lock.patchedDependencies !== undefined || jsonObject.patchedDependencies !== undefined)
    throw new PluginDependencyError(
      "it patches its dependencies (patchedDependencies), which this install does not apply",
    );
  let workspaces = lock.workspaces;
  if (
    !isPlainObjectLike(workspaces) ||
    !isPlainObjectLike(workspaces[""]) ||
    Object.keys(workspaces).length !== 1
  )
    throw new PluginDependencyError("its bun.lock does not list the plugin as its only workspace");
  let packages = lock.packages;
  if (!isPlainObjectLike(packages)) throw new PluginDependencyError("its bun.lock lists no packages");
  let rootDeps = assertLockMatchesPackage(workspaces[""], jsonObject, "bun.lock");
  let { peerDependenciesMeta, ...workspaceRoot } = rootDeps;
  if (workspaces[""].optionalPeers !== undefined)
    workspaceRoot.optionalPeers = assertOptionalPeers(workspaces[""].optionalPeers, "its bun.lock");
  let bunPackages = {};
  for (let [key, value] of Object.entries(packages))
    bunPackages[key] = validateBunLockEntry(key, value, registry);
  return {
    packageCount: Object.keys(bunPackages).length,
    packageJson: {
      name: PLUGIN_DEPENDENCIES,
      version: PLACEHOLDER_VERSION,
      ...rootDeps,
    },
    lockfile: {
      lockfileVersion: lock.lockfileVersion,
      ...(typeof lock.configVersion === "number" && {
        configVersion: lock.configVersion,
      }),
      workspaces: {
        "": {
          name: PLUGIN_DEPENDENCIES,
          ...workspaceRoot,
        },
      },
      packages: bunPackages,
    },
  };
}
//@ chunk-5xgkngpb.js:4509585-4509889 placement
/**
 * package.json 与锁文件列出的依赖须一致。
 */
function assertLockMatchesPackage(rootPackage, jsonObject, lockfileName) {
  let lockDeps = validateDependencyLists(rootPackage, DEPENDENCY_FIELDS_2, `its ${lockfileName}`);
  let packageDeps = omitOptionalFromDependencies(
    validateDependencyLists(jsonObject, DEPENDENCY_FIELDS_2, "its package.json"),
    lockfileName === "bun.lock" ? ["devDependencies"] : [],
  );
  if (dependencyFingerprint(lockDeps) !== dependencyFingerprint(packageDeps))
    throw new PluginDependencyError(`its package.json and ${lockfileName} list different dependencies`);
  return isPlainObjectLike(jsonObject.peerDependenciesMeta)
    ? {
        ...lockDeps,
        peerDependenciesMeta: sanitizePeerDependenciesMeta(jsonObject.peerDependenciesMeta),
      }
    : lockDeps;
}
//@ chunk-5xgkngpb.js:4509889-4510125 placement
function omitOptionalFromDependencies(lists, extraFields = []) {
  let optionalDependencies = lists.optionalDependencies;
  if (optionalDependencies === undefined) return lists;
  let result = {
    ...lists,
  };
  for (let field of ["dependencies", ...extraFields]) {
    let deps = lists[field];
    if (deps !== undefined) {
      let kept = {};
      for (let [key, value] of Object.entries(deps))
        if (!Object.hasOwn(optionalDependencies, key)) kept[key] = value;
      result[field] = kept;
    }
  }
  return result;
}
//@ chunk-5xgkngpb.js:4510125-4511181 placement
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
  for (let flag of LOCK_ENTRY_FLAGS) if (entry[flag] === true) result[flag] = true;
  for (let field of PLATFORM_FIELDS)
    if (entry[field] !== undefined) {
      if (!isStringArray(entry[field]))
        throw new PluginDependencyError(`${label} has an unreadable ${field} list`);
      result[field] = entry[field];
    }
  if (entry.bin !== undefined) result.bin = validateBinField(entry.bin, label);
  if (isPlainObjectLike(entry.peerDependenciesMeta))
    result.peerDependenciesMeta = sanitizePeerDependenciesMeta(entry.peerDependenciesMeta);
  return result;
}
//@ chunk-5xgkngpb.js:4511181-4512102 placement
function validateBunLockEntry(entryPath, entry, registry) {
  let label = `its bun.lock entry "${quotedPrintable(entryPath, 120)}"`;
  if (!isPackagePath(entryPath)) throw new PluginDependencyError(`${label} is not a package path`);
  if (!Array.isArray(entry) || entry.length !== 4)
    throw new PluginDependencyError(`${label} is not a registry package`);
  let [nameAndVersion, resolved, meta, integrity] = entry;
  let atIndex = typeof nameAndVersion === "string" ? nameAndVersion.lastIndexOf("@") : -1;
  if (
    typeof nameAndVersion !== "string" ||
    atIndex <= 0 ||
    !isValidNpmPackageNameLoose(nameAndVersion.slice(0, atIndex)) ||
    semverCompat.parse(nameAndVersion.slice(atIndex + 1)) === null
  )
    throw new PluginDependencyError(`${label} is not a registry package at an exact version`);
  if (resolved !== "") assertDownloadLink(resolved, label, registry, "bun");
  if (!isPlainObjectLike(meta)) throw new PluginDependencyError(`${label} has unreadable metadata`);
  let result = validateDependencyLists(meta, LOCK_ENTRY_DEPENDENCY_FIELDS, label);
  for (let field of PLATFORM_FIELDS) {
    let value = meta[field];
    if (value !== undefined) {
      if (typeof value !== "string" && !isStringArray(value))
        throw new PluginDependencyError(`${label} has an unreadable ${field} list`);
      result[field] = value;
    }
  }
  if (meta.optionalPeers !== undefined) result.optionalPeers = assertOptionalPeers(meta.optionalPeers, label);
  if (meta.bin !== undefined) result.bin = validateBinField(meta.bin, label);
  if (meta.binDir !== undefined) {
    if (typeof meta.binDir !== "string" || !isSafePackageSubpath(meta.binDir))
      throw new PluginDependencyError(`${label} has a bin folder outside its package`);
    result.binDir = meta.binDir;
  }
  return [nameAndVersion, resolved, result, assertIntegrity(integrity, label, resolved !== "")];
}
//@ chunk-5xgkngpb.js:4512102-4512264 placement
function assertDownloadLink(resolved, label, registry, kind) {
  let reason =
    typeof resolved === "string"
      ? checkTarballUrl(resolved, undefined, registry, kind)?.reason
      : "is not text";
  if (reason !== undefined) throw new PluginDependencyError(`${label} has a download link that ${reason}`);
  return resolved;
}
//@ chunk-5xgkngpb.js:4512264-4512487 placement
function assertOptionalPeers(optionalPeers, label) {
  if (!isStringArray(optionalPeers))
    throw new PluginDependencyError(`${label} has an unreadable optionalPeers list`);
  let found = optionalPeers.find((name) => !isValidNpmPackageNameLoose(name));
  if (found !== undefined)
    throw new PluginDependencyError(
      `${label} has an optional peer that is not a registry package: ${quotedPrintable(found, 120)}`,
    );
  return optionalPeers;
}
//@ chunk-5xgkngpb.js:4512487-4512744 placement
function assertIntegrity(integrity, label, hasResolved) {
  if (integrity === "")
    throw new PluginDependencyError(
      hasResolved
        ? `${label} has no integrity hash for its download link`
        : `${label} has an empty integrity hash`,
    );
  if (typeof integrity !== "string" || !integrity.split(" ").every((part) => INTEGRITY_RE.test(part)))
    throw new PluginDependencyError(`${label} has an unreadable integrity hash`);
  return integrity;
}
//@ chunk-5xgkngpb.js:4512744-4513051 placement
/**
 * 依赖列表须为“注册表包名 → 版本范围”。
 */
function validateDependencyLists(source, fields, label) {
  let result = {};
  for (let field of fields) {
    let deps = source[field];
    if (deps === undefined) continue;
    if (!isPlainObjectLike(deps)) throw new PluginDependencyError(`${label} has an unreadable ${field} list`);
    for (let [key, value] of Object.entries(deps))
      if (!isValidNpmPackageNameLoose(key) || !isRegistryVersionRange(value))
        throw new PluginDependencyError(
          `${label} has a dependency that is not a registry package and version range: ${quotedPrintable(key, 120)}`,
        );
    result[field] = deps;
  }
  return result;
}
//@ chunk-5xgkngpb.js:4513051-4513177 placement
function isRegistryVersionRange(spec) {
  if (typeof spec !== "string") return false;
  let match = /^npm:(.+)@([^@]*)$/.exec(spec);
  return match === null
    ? isNpmVersionSpec(spec)
    : isValidNpmPackageNameLoose(match[1]) && isNpmVersionSpec(match[2]);
}
//@ chunk-5xgkngpb.js:4513177-4513285 placement
function isNodeModulesPath(entryPath) {
  return (
    entryPath.startsWith("node_modules/") &&
    entryPath
      .slice(13)
      .split("/node_modules/")
      .every((segment) => isValidNpmPackageNameLoose(segment))
  );
}
//@ chunk-5xgkngpb.js:4513285-4513454 placement
function isPackagePath(path) {
  let parts = path.split("/");
  let packages = [];
  for (let idx = 0; idx < parts.length; idx++) {
    let segment = parts[idx];
    let isScope = segment.startsWith("@") && idx + 1 < parts.length;
    packages.push(isScope ? `${segment}/${parts[++idx]}` : segment);
  }
  return packages.every((pkg) => isValidNpmPackageNameLoose(pkg));
}
//@ chunk-5xgkngpb.js:4513454-4513552 placement
function isSafePackageSubpath(subpath) {
  return (
    subpath !== "" && !subpath.startsWith("/") && !/[\\:]/.test(subpath) && !subpath.split("/").includes("..")
  );
}
//@ chunk-5xgkngpb.js:4513552-4513620 placement
function isSafePackageFileSegment(segment) {
  return segment !== "" && segment !== "." && segment !== ".." && !/[\\/:]/.test(segment);
}
//@ chunk-5xgkngpb.js:4513620-4513853 placement
function validateBinField(bin, label) {
  if (
    typeof bin === "string"
      ? isSafePackageSubpath(bin)
      : isPlainObjectLike(bin) &&
        Object.entries(bin).every(
          ([key, value]) =>
            isSafePackageFileSegment(key) && typeof value === "string" && isSafePackageSubpath(value),
        )
  )
    return bin;
  throw new PluginDependencyError(
    `${label} has a bin link that points outside its package or has an invalid command name`,
  );
}
//@ chunk-5xgkngpb.js:4513853-4513968 placement
function sanitizePeerDependenciesMeta(peerDependenciesMeta) {
  let result = {};
  for (let [key, value] of Object.entries(peerDependenciesMeta))
    if (isValidNpmPackageNameLoose(key) && isPlainObjectLike(value))
      result[key] = {
        optional: value.optional === true,
      };
  return result;
}
//@ chunk-5xgkngpb.js:4513968-4514122 placement
function parseJsonObject(text, label) {
  let parsed;
  try {
    parsed = jsonParse(stripBom(text));
  } catch {
    throw new PluginDependencyError(`its ${label} is not valid JSON`);
  }
  if (!isPlainObjectLike(parsed)) throw new PluginDependencyError(`its ${label} is not a JSON object`);
  return parsed;
}
//@ chunk-5xgkngpb.js:4514122-4514219 placement
function dependencyFingerprint(lists) {
  return jsonStringify(
    DEPENDENCY_FIELDS_2.map((field) =>
      Object.entries(lists[field] ?? {}).sort(([left], [right]) =>
        left < right ? -1 : left > right ? 1 : 0,
      ),
    ),
  );
}
//@ chunk-5xgkngpb.js:4514219-4514290 placement
function isPlainObjectLike(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
//@ chunk-5xgkngpb.js:4514290-4514365 placement
function isStringArray(value) {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}
//@ chunk-5xgkngpb.js:4514365-4515090 placement
/**
 * 安装插件依赖的常量组：rqn 安装命令超时 60 s；Rks 安装输出上限 32 MiB；sqn npm ci 参数；Eft 各 lockfile 对应的安装计划；uqn bun.lockb 不受支持的说明；cqn 各计划的 lockfile 名；fqn lockfile → 完成标记文件的映射。
 */
var MAX_DEPENDENCY_INSTALL_TIMEOUT_MS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var MAX_DEPENDENCY_INSTALL_BYTES;
var NPM_CI_ARGS;
var LOCKFILE_INSTALL_PLANS;
var BINARY_LOCKFILE_UNSUPPORTED_TEXT;
var mapped_4;
var BINARY_LOCKFILE_MESSAGES;
deferInit("chunk-5xgkngpb.js:4514365", () => {
  MAX_DEPENDENCY_INSTALL_TIMEOUT_MS = 60000;
  MAX_DEPENDENCY_INSTALL_BYTES = 33554432;
  NPM_CI_ARGS = ["ci", "--ignore-scripts", "--workspaces=false", "--no-audit", "--no-fund"];
  LOCKFILE_INSTALL_PLANS = [
    {
      lockfile: "bun.lock",
      command: "bun",
      args: ["install", "--frozen-lockfile", "--ignore-scripts"],
    },
    {
      lockfile: "npm-shrinkwrap.json",
      command: "npm",
      args: NPM_CI_ARGS,
      completionRecord: "node_modules/.package-lock.json",
    },
    {
      lockfile: "package-lock.json",
      command: "npm",
      args: NPM_CI_ARGS,
      completionRecord: "node_modules/.package-lock.json",
    },
    {
      lockfile: "bun.lockb",
      command: "bun",
      args: ["install", "--frozen-lockfile", "--ignore-scripts"],
    },
  ];
  BINARY_LOCKFILE_UNSUPPORTED_TEXT =
    "its bun.lockb is a binary lockfile that cannot be checked; ship a text bun.lock instead";
  mapped_4 = LOCKFILE_INSTALL_PLANS.map((plan) => plan.lockfile);
  BINARY_LOCKFILE_MESSAGES = new Map(
    LOCKFILE_INSTALL_PLANS.flatMap((plan) =>
      plan.completionRecord === undefined ? [] : [[plan.lockfile, plan.completionRecord]],
    ),
  );
});
//@ chunk-5xgkngpb.js:4515090-4515565 placement
/**
 * 插件目录有 package.json 时按锁文件选择包管理器安装依赖；yarn/pnpm 锁文件不支持（会绕过 --ignore-scripts）； 返回 {ran, error?}。
 */
async function installPluginDependencies(pluginPath, { inPlaceAt } = {}) {
  let entries;
  try {
    entries = await readdir(pluginPath);
  } catch (error) {
    if (isFsInaccessible(error))
      return {
        ran: false,
      };
    throw error;
  }
  let names = new Set(entries.map((name) => foldCase_2(name)));
  if (!names.has("package.json"))
    return {
      ran: false,
    };
  let lockfile = detectLockfile(names);
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
  logForDebugging(
    `Installing plugin dependencies: ${lockfile.command} ${lockfile.args.join(" ")} for ${pluginPath}`,
  );
  return choosePackageManager(pluginPath, lockfile, inPlaceAt);
}
//@ chunk-5xgkngpb.js:4515565-4515716 placement
function detectLockfile(names) {
  let found = LOCKFILE_INSTALL_PLANS.find((plan) => names.has(plan.lockfile));
  if (found !== undefined) return found;
  return names.has("yarn.lock") || names.has("pnpm-lock.yaml") ? "yarn-or-pnpm" : undefined;
}
//@ chunk-5xgkngpb.js:4515716-4516552 placement
async function checkLockfileSupported(pluginPath) {
  let entries;
  try {
    entries = await readdir(pluginPath);
  } catch (error) {
    if (isFsInaccessible(error)) return;
    throw error;
  }
  let names = new Set(entries.map((name) => foldCase_2(name)));
  if (!names.has("package.json") || names.has("node_modules")) return;
  let plan = detectLockfile(names);
  if (plan === undefined) return;
  try {
    let packageFile = await readPackageFile(pluginPath, "package.json");
    if (!hasLifecycleScripts(packageFile)) return;
    if (plan === "yarn-or-pnpm")
      return {
        kind: "refused",
        reason: "it uses a yarn or pnpm lockfile, which plugin installs do not support",
      };
    if (plan.lockfile === "bun.lockb")
      return {
        kind: "refused",
        reason: BINARY_LOCKFILE_UNSUPPORTED_TEXT,
      };
    let packageFile_2 = await readPackageFile(pluginPath, plan.lockfile);
    let match;
    try {
      match = lockfileCompletionMatches(plan, packageFile, packageFile_2, undefined);
    } catch (error) {
      if (error instanceof PluginDependencyError && packageFile_2.includes('"http://')) return;
      throw error;
    }
    if (match.packageCount === 0) return;
    return (await whichAsync(plan.command)) === null
      ? {
          kind: "refused",
          reason: `it needs ${plan.command}, which is not installed on this computer`,
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
//@ chunk-5xgkngpb.js:4516552-4516632 placement
var DEPENDENCY_FIELDS = ["dependencies", "optionalDependencies", "peerDependencies", "workspaces"];
//@ chunk-5xgkngpb.js:4516632-4516736 placement
function hasLifecycleScripts(packageFile) {
  let parsed;
  try {
    parsed = jsonParse(stripBom(packageFile));
  } catch {
    return true;
  }
  if (!isPlainObjectLike(parsed)) return true;
  return DEPENDENCY_FIELDS.some((field) => hasAnyDependencyEntry(parsed[field]));
}
//@ chunk-5xgkngpb.js:4516736-4516818 placement
function hasAnyDependencyEntry(value) {
  return isPlainObjectLike(value) ? Object.keys(value).length > 0 : Array.isArray(value) && value.length > 0;
}
//@ chunk-5xgkngpb.js:4516818-4517593 placement
async function choosePackageManager(pluginPath, plan, inPlaceAt) {
  let tempSiblingName = makeTempSiblingName(stripTempSiblingSuffix(resolve_2(pluginPath)));
  try {
    await mkdir(tempSiblingName);
  } catch (error) {
    return dependencyInstallError(plan.command, error);
  }
  try {
    let packageManagerInputs = await preparePackageManagerInputs(pluginPath, plan, tempSiblingName);
    if (packageManagerInputs.packageCount === 0)
      return {
        ran: false,
      };
    await writeFile(join(tempSiblingName, "package.json"), jsonStringify(packageManagerInputs.packageJson));
    await writeFile(
      join(tempSiblingName, plan.command === "npm" ? "package-lock.json" : "bun.lock"),
      jsonStringify(packageManagerInputs.lockfile),
      {
        flag: "wx",
      },
    );
    let env = npmExecEnv();
    let result =
      plan.command === "npm"
        ? await runNpm(
            plan.args,
            {
              workDir: tempSiblingName,
              toolCgroupClass: "plugin",
            },
            MAX_DEPENDENCY_INSTALL_TIMEOUT_MS,
          )
        : await execFileNoThrowWithCwd(plan.command, plan.args, {
            cwd: tempSiblingName,
            timeout: MAX_DEPENDENCY_INSTALL_TIMEOUT_MS,
            toolCgroupClass: "plugin",
            ...env,
            env: {
              ...env.env,
              BUN_INSTALL_CACHE_DIR: join(tempSiblingName, "bun-cache"),
            },
          });
    if (result.code === 0)
      await (inPlaceAt !== undefined
        ? placeNodeModules(tempSiblingName, pluginPath, inPlaceAt)
        : swapNodeModules(tempSiblingName, pluginPath));
    return dependencyInstallResult(plan.command, result, pluginPath);
  } catch (error) {
    if (error instanceof PluginDependencyError)
      return {
        ran: false,
        error: `Skipped installing this plugin's dependencies: ${error.message}.`,
      };
    return dependencyInstallError(plan.command, error);
  } finally {
    await removeDirectoryTreeNoFollow_2(tempSiblingName).catch(() => {});
  }
}
//@ chunk-5xgkngpb.js:4517593-4517853 placement
async function preparePackageManagerInputs(pluginPath, plan, tempSiblingName) {
  if (plan.lockfile === "bun.lockb") throw new PluginDependencyError(BINARY_LOCKFILE_UNSUPPORTED_TEXT);
  let packageFile = await readPackageFile(pluginPath, "package.json");
  let packageFile_2 = await readPackageFile(pluginPath, plan.lockfile);
  await writeFile(join(tempSiblingName, "package.json"), "{}", {
    flag: "wx",
  });
  let registry = packageFile_2.includes('"http://')
    ? await getDefaultHttpNpmRegistry({
        workDir: tempSiblingName,
      })
    : undefined;
  return lockfileCompletionMatches(plan, packageFile, packageFile_2, registry);
}
//@ chunk-5xgkngpb.js:4517853-4517933 placement
function lockfileCompletionMatches(plan, packageJsonText, lockText, registry) {
  return plan.command === "npm"
    ? checkPackageLock(packageJsonText, lockText, plan.lockfile, registry)
    : checkBunLock(packageJsonText, lockText, registry);
}
//@ chunk-5xgkngpb.js:4517933-4517957 placement
class PluginDependencyCheckError extends Error {}
//@ chunk-5xgkngpb.js:4517957-4517982 placement
class PluginDependencyInstallError extends Error {}
//@ chunk-5xgkngpb.js:4517982-4518095 placement
var FOLDER_REPLACED_MESSAGE =
  "the plugin's folder was moved or replaced by a link during the install, so the packages were not added";
//@ chunk-5xgkngpb.js:4518095-4518252 placement
async function assertFolderUnchanged(pluginPath, expectedReal) {
  let [stat, real] = await Promise.all([
    lstat(pluginPath).catch(() => {
      return;
    }),
    realpath(pluginPath).catch(() => {
      return;
    }),
  ]);
  if (stat?.isDirectory() !== true || real !== expectedReal)
    throw new PluginDependencyCheckError(FOLDER_REPLACED_MESSAGE);
}
//@ chunk-5xgkngpb.js:4518252-4518719 placement
/**
 * Linux 上经目录 fd 把 node_modules 移入插件目录。
 */
async function moveNodeModulesSafely(sourcePath, pluginReal, targetPath) {
  let platform = getPlatform();
  if (platform !== "linux" && platform !== "wsl") {
    await rename(sourcePath, targetPath);
    return;
  }
  let handle = await open(
    pluginReal,
    constants.O_RDONLY | constants.O_DIRECTORY | constants.O_NOFOLLOW | READ_LIMITS,
  ).catch((error) => {
    throw ["ENOTDIR", "ELOOP", "ENOENT"].includes(getErrnoCode(error) ?? "")
      ? new PluginDependencyCheckError(FOLDER_REPLACED_MESSAGE)
      : error;
  });
  try {
    let realPath = await fdRealPath(handle.fd);
    if (realPath === null)
      throw new PluginDependencyCheckError(
        "could not confirm where the plugin's folder is, so the packages were not added",
      );
    if (realPath !== pluginReal) throw new PluginDependencyCheckError(FOLDER_REPLACED_MESSAGE);
    await rename(sourcePath, `/proc/self/fd/${handle.fd}/node_modules`);
  } finally {
    await handle.close();
  }
}
//@ chunk-5xgkngpb.js:4518719-4518807 placement
/**
 * hasNodeModulesDir：是否存在 node_modules 目录。
 */
async function hasNodeModulesDir(absolute) {
  return lstat(join(absolute, "node_modules")).then(
    (stat) => stat.isDirectory(),
    () => false,
  );
}
//@ chunk-5xgkngpb.js:4518807-4519352 placement
/**
 * 把安装好的 node_modules 放进插件目录并处理失败。
 */
async function placeNodeModules(tempSiblingName, pluginPath, pluginReal) {
  let targetPath = join(pluginPath, "node_modules");
  try {
    await retryFsOpLong(join(tempSiblingName, "node_modules"), targetPath, async (sourcePath, targetPath) => {
      await assertFolderUnchanged(pluginPath, pluginReal);
      await moveNodeModulesSafely(sourcePath, pluginReal, targetPath).catch(async (error) => {
        if (
          !(error instanceof PluginDependencyCheckError) &&
          (await lstat(targetPath).then(
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
    let cause = error instanceof PluginDependencyInstallError ? error.cause : error;
    if (
      error instanceof PluginDependencyInstallError ||
      (await lstat(targetPath).then(
        () => true,
        () => false,
      ))
    ) {
      await assertFolderUnchanged(pluginPath, pluginReal);
      return;
    }
    if (
      getErrnoCode(cause) === "ENOENT" &&
      !(await lstat(join(tempSiblingName, "node_modules")).then(
        () => true,
        () => false,
      ))
    )
      throw Error("the package manager finished but wrote no node_modules");
    throw cause;
  }
}
//@ chunk-5xgkngpb.js:4519352-4519776 placement
/**
 * 读插件目录里的 package.json/锁文件（须普通文件且 ≤32 MB）。
 */
async function readPackageFile(pluginPath, lockfile) {
  let filePath = join(pluginPath, lockfile);
  if (
    !(
      await lstat(filePath).catch((error) => {
        if (getErrnoCode(error) === "ENOENT")
          throw new PluginDependencyError(`its ${lockfile} is missing, or not named in lowercase`);
        throw error;
      })
    ).isFile()
  )
    throw new PluginDependencyError(`its ${lockfile} is not a regular file`);
  let handle = await open(filePath, readOnlyNoFollowFlags());
  try {
    let stats = await handle.stat();
    if (!stats.isFile() || stats.size > MAX_DEPENDENCY_INSTALL_BYTES)
      throw new PluginDependencyError(`its ${lockfile} is not a regular file of at most 32 MB`);
    return await handle.readFile({
      encoding: "utf8",
    });
  } finally {
    await handle.close();
  }
}
//@ chunk-5xgkngpb.js:4519776-4520041 placement
async function swapNodeModules(tempSiblingName, pluginPath) {
  let targetPath = join(pluginPath, "node_modules");
  let previousPath = join(tempSiblingName, "previous-node_modules");
  let movedAside = await retryFsOpLong(targetPath, previousPath).then(
    () => true,
    (error) => {
      if (getErrnoCode(error) === "ENOENT") return false;
      throw error;
    },
  );
  try {
    await retryFsOpLong(join(tempSiblingName, "node_modules"), targetPath);
  } catch (error) {
    if (movedAside) await retryFsOpLong(previousPath, targetPath).catch(() => {});
    if (getErrnoCode(error) !== "ENOENT") throw error;
  }
}
//@ chunk-5xgkngpb.js:4520041-4520148 placement
function dependencyInstallError(command, error) {
  return {
    ran: true,
    error: `Plugin dependency install failed (${command}): ${redactUrlsInMessage(errorMessage(error))}`.slice(
      0,
      500,
    ),
  };
}
//@ chunk-5xgkngpb.js:4520148-4520379 placement
function dependencyInstallResult(command, result, pluginPath) {
  if (result.code !== 0)
    return {
      ran: true,
      error:
        `Plugin dependency install failed (${command}): ${redactUrlsInMessage(result.stderr || result.stdout || result.error || "no output")}`.slice(
          0,
          500,
        ),
    };
  logForDebugging(`Plugin dependency install succeeded (${command}) in ${pluginPath}`);
  return {
    ran: true,
  };
}
//@ chunk-5xgkngpb.js:4520379-4520390 placement
/**
 * npmMarketplaceDefaultOff：npm 市场默认关闭。
 */
var npmMarketplaceDefaultOff = false;
//@ chunk-5xgkngpb.js:4558575-4561048 placement
/**
 * 清理不再被依赖的自动安装插件，设置写入失败时保留。
 */
async function pruneOrphanedAutoDeps(orphans, scope, projectPath, { deleteDataDir = true } = {}, storageV5) {
  if (orphans.size === 0) return [];
  let installed =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  let plugins = installed.plugins;
  let removedRecords = [];
  let removedIds = [];
  for (let id of orphans) {
    let installations = plugins[id];
    let target = installationAtTarget(installations, scope, projectPath);
    if (!target) continue;
    {
      let matchingInstallations = findMatchingInstallations(installations, scope, projectPath);
      if (
        !(installations ?? [])
          .filter((installation) => !matchingInstallations.includes(installation))
          .some(hasDirectoryRepositoryKey)
      ) {
        if ((await persistDirectoryBinding(id, installations)) === "not-persisted") {
          logForDebugging(
            `pruneOrphanedAutoDeps: ${id} is kept: plugin-directory-bindings.json could not be used or written, so nothing would hold its name once this install record is gone`,
            {
              level: "warn",
            },
          );
          continue;
        }
      } else await seedBindingsFromInstall(id, installations);
    }
    await removePluginInstallation(id, scope, projectPath, storageV5);
    removedIds.push(id);
    if ((installations?.length ?? 0) <= 1)
      removedRecords.push({
        id,
        installPath: target.installPath,
      });
  }
  if (removedIds.length === 0) return [];
  let relatedIds = (id) =>
    bindingKeysFor(plugins, id).flatMap(([otherId, otherInstallations]) =>
      otherId !== id && otherInstallations.length > 0 && !removedIds.includes(otherId) ? [otherId] : [],
    );
  let settingSource = scopeToSettingSource(scope);
  let { error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (settings) => {
      let enabledPlugins = {
        ...settings?.enabledPlugins,
      };
      for (let id of removedIds) {
        enabledPlugins[id] = undefined;
        for (let key of enabledPluginKeys(enabledPlugins, id, relatedIds(id)))
          enabledPlugins[key] = undefined;
      }
      return {
        enabledPlugins,
      };
    },
    undefined,
    storageV5,
  );
  if (error) logForDebugging(`pruneOrphanedAutoDeps: settings write failed at ${scope}: ${error.message}`);
  refreshPluginCaches(storageV5);
  let installedIds = removedRecords.some(({ id }) => isOfficialPluginDirectoryId(id))
    ? listInstalledPluginIds(
        isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync(),
      )
    : [];
  let removedSet = new Set(removedRecords.map((record) => record.id));
  for (let { id, installPath } of removedRecords) {
    await markPluginVersionOrphaned(installPath, storageV5);
    let installedOthers = [];
    installedOthers = relatedIds(id);
    let { plan, stillOn, entry } = await planUninstallCleanup(id, {
      deleteDataDir: deleteDataDir && !isPluginUnreadableOrShared(id, installed, removedSet),
      installedIds,
      installedOthers,
      storageV5,
    });
    if (plan.kind === "nothing" && plan.reason === "still-switched-on") {
      let joined = stillOn.map(describeUnwritableSettingsSource).join(" and ");
      let heldNote =
        entry === "held"
          ? "plugin-directory-bindings.json still holds its name"
          : "plugin-directory-bindings.json could not be used, so its name counts as held";
      let mendSteps = [
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
      let mendSuffix = mendSteps.length > 0 ? ` (${mendSteps.join("; ")})` : "";
      let instruction =
        entry === "held"
          ? `switch it off there${mendSuffix}, then uninstall ${id}`
          : `once plugin-directory-bindings.json can be used, switch it off there${mendSuffix}, then uninstall ${id}`;
      logForDebugging(
        `pruneOrphanedAutoDeps: ${id} was pruned, but a settings file still switches it on, could not be read, or is not read in this launch (${joined}), so nothing it saved was removed, and ${heldNote}; ${instruction}`,
        {
          level: "warn",
        },
      );
    }
  }
  removePluginUsage(
    removedRecords.map((record) => record.id),
    storageV5,
  );
  return removedIds;
}
//@ chunk-5xgkngpb.js:4561048-4561245 placement (2.1.88 match: hasPendingUpdates, 0.783)
/**
 * 插件在该作用域的设置中被启用且对应安装路径（缓存）存在。
 */
async function isPluginEnabledAndCachedAtScope(pluginId, scope, storageV5) {
  let source = scopeToSettingSource(scope);
  if (!getEnabledPluginIdsInSource(source).has(pluginId)) return false;
  let projectPath = scope !== "user" ? getCwd() : undefined;
  let installed =
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync();
  let target = installationAtTarget(installed.plugins[pluginId], scope, projectPath);
  if (!target) return false;
  return installPathExists(pluginId, target.installPath, storageV5);
}
//@ chunk-5xgkngpb.js:4561245-4561676 placement
async function installPathExists(pluginId, installPath, storageV5) {
  let useStorage = isStorageV5Enabled() && storageV5 !== undefined;
  let { absolute, suspect } = classifyMarketplacePath(installPath, {
    trustedRoots: getMarketplaceCandidatePaths(
      pluginId,
      await loadKnownMarketplacesSafe(storageV5),
      tryUnwrapTextPayload(),
    ),
  });
  if (suspect) return false;
  let cacheRoot = anchoredPluginCachePath();
  let space = useStorage ? versionCacheStorageSpace(absolute, cacheRoot) : null;
  if (
    isStorageV5Enabled() &&
    storageV5 !== undefined &&
    space !== null &&
    !(await hasLinkedAncestorBelow(absolute, cacheRoot))
  ) {
    let kindResult = await storageV5.scopeKind(space, {
      resolveLink: true,
    });
    if (!kindResult.ok) {
      let { error } = kindResult;
      if ("telemetryCode" in error && isFsInaccessibleCode(error.telemetryCode)) return false;
      throw toProbeError(error, installPath);
    }
    let kind = kindResult.value;
    return kind.kind === "link" ? kind.linkResolves === true : kind.kind !== "absent";
  }
  return pathStatOk(absolute);
}
//@ chunk-5xgkngpb.js:4561676-4561955 placement (2.1.88 match: hasPendingUpdates, 0.783)
/**
 * 插件在该作用域是否有缓存仍存在的安装记录（优先当前项目的记录）。
 */
async function hasCachedInstallationAtScope(pluginId, scope, storageV5) {
  let filtered = (
    (isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    ).plugins[pluginId] ?? []
  ).filter((entry) => entry.scope === scope);
  let sawEntry = false;
  for (let diskEntry of filtered) {
    if (!isInstallationRelevantToCurrentProject(diskEntry)) continue;
    sawEntry = true;
    if (await installPathExists(pluginId, diskEntry.installPath, storageV5)) return true;
  }
  if (sawEntry) return false;
  for (let entry of filterInstallationsForCurrentProject(filtered))
    if (await installPathExists(pluginId, entry.installPath, storageV5)) return true;
  return false;
}
//@ chunk-5xgkngpb.js:4561955-4562046 placement
async function pathStatOk(absolute) {
  try {
    await getFsImplementation().stat(absolute);
    return true;
  } catch (error) {
    if (isFsInaccessible(error)) return false;
    throw error;
  }
}
//@ chunk-5xgkngpb.js:4562046-4562244 placement
function findBlockedMarketplace(pluginId, knownMarketplaces, options) {
  let marketplace = parsePluginIdentifier(pluginId).marketplace;
  if (!marketplace) return;
  if (marketplace === pluginManifestPathSchemas) return;
  if (marketplace === OFFICIAL_MARKETPLACE_NAME && pluginDirectoryPolicyBlock() !== null) return marketplace;
  let source = knownMarketplaces[marketplace]?.source;
  if (source === undefined && !options?.failClosedOnUnknownSource) return;
  return isSourceDisallowedOrUnverifiable(source) ? marketplace : undefined;
}
//@ chunk-5xgkngpb.js:4562244-4562399 placement
async function pluginDirectoryUnavailableReason(pluginId) {
  {
    if (parsePluginIdentifier(pluginId).marketplace !== OFFICIAL_MARKETPLACE_NAME) return null;
    if (pluginDirectoryUnavailableKind() === "policy-not-known") await awaitPluginDirectoryVerdict();
    let kind = pluginDirectoryUnavailableKind();
    return kind === "blocked" ? null : kind;
  }
  return null;
}
//@ chunk-5xgkngpb.js:4562399-4562607 placement
/**
 * 插件（或依赖）来自不可用的插件目录时的安装失败提示。
 */
function formatDirectoryUnavailableMessage(pluginName, unavailableDependency) {
  {
    let reason = `is unavailable: ${pluginDirectoryRefusalReason()}`;
    return unavailableDependency === undefined
      ? `Cannot install "${quotedPrintable(pluginName)}": the ${OFFICIAL_MARKETPLACE_DISPLAY} ${reason}`
      : `Cannot install "${quotedPrintable(pluginName)}": its dependency "${quotedPrintable(unavailableDependency)}" is from the ${OFFICIAL_MARKETPLACE_DISPLAY}, which ${reason}`;
  }
  return "";
}
//@ chunk-5xgkngpb.js:4562607-4563594 placement
/**
 * 自动安装插件声明的依赖，跨市场或找不到时不安装。
 */
async function autoInstallPluginDependencies(context) {
  let ids = [];
  let notFound = [];
  for (let rawDep of context.rootManifestDeps ?? []) {
    let dependencyId = qualifyDependency(rawDep, context.pluginId);
    if (
      context.closureSet.has(dependencyId) ||
      (context.alreadyEnabled.has(dependencyId) && !context.forceInclude.has(dependencyId))
    )
      continue;
    let marketplace = parsePluginIdentifier(dependencyId).marketplace;
    if (
      marketplace !== context.rootMarketplace &&
      !(marketplace && context.allowedCrossMarketplaces.has(marketplace)) &&
      !context.alreadyEnabled.has(dependencyId)
    ) {
      logForDebugging(
        `${context.pluginId} plugin.json declares dependency "${dependencyId}" in a different marketplace; not auto-installing \u2014 install it manually`,
        {
          level: "warn",
        },
      );
      continue;
    }
    if (isPluginBlockedByPolicy(dependencyId))
      return {
        ok: false,
        blockedDependency: dependencyId,
      };
    let blockedMarketplace = findBlockedMarketplace(dependencyId, context.knownMarketplaces, {
      failClosedOnUnknownSource: context.failClosedOnUnknownSource,
    });
    if (blockedMarketplace)
      return {
        ok: false,
        blockedDependency: dependencyId,
        blockedMarketplace,
      };
    let pluginById = await getPluginById(dependencyId, context.storageV5, "install");
    if (!pluginById) {
      logForDebugging(
        `${context.pluginId} plugin.json declares dependency "${dependencyId}" not found in any known marketplace; not auto-installing`,
        {
          level: "warn",
        },
      );
      notFound.push(dependencyId);
      continue;
    }
    if (
      await isListingUsableForMarketplace(
        dependencyId,
        pluginById.entry,
        context.knownMarketplaces,
        context.storageV5,
      )
    )
      return {
        ok: false,
        blockedDependency: dependencyId,
      };
    context.depInfo.set(dependencyId, pluginById);
    ids.push(dependencyId);
  }
  return {
    ok: true,
    ids,
    notFound,
  };
}
//@ chunk-5xgkngpb.js:4563594-4564057 placement
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
  let closureSet = new Set(closure);
  let enabled = new Set();
  for (let id of closure) {
    let prior = priorEnabled[id];
    let defaultOn = defaultsById.get(id) ?? true;
    if (prior !== undefined) {
      if (prior !== false || defaultOn) enabled.add(id);
      continue;
    }
    if (explicitAnywhere.has(id) || defaultOn || (id === rootId && rootRequiredByDependent)) enabled.add(id);
  }
  let pending = [...enabled];
  while (pending.length > 0) {
    let id = pending.pop();
    if (id === undefined) break;
    for (let dependencyId of dependenciesById.get(id) ?? [])
      if (closureSet.has(dependencyId) && !enabled.has(dependencyId)) {
        enabled.add(dependencyId);
        pending.push(dependencyId);
      }
  }
  return new Map(closure.map((id) => [id, enabled.has(id)]));
}
//@ chunk-5xgkngpb.js:4564057-4564133 placement
/**
 * isListingUsableForMarketplace：目录列表可用于该市场。
 */
async function isListingUsableForMarketplace(pluginId, entry, knownMarketplaces, storageV5) {
  if (!isPluginDirectoryMarketplace(pluginId, knownMarketplaces)) return false;
  return isListingBlocked(entry, await collectOrgBlockedPlugins(storageV5));
}
//@ chunk-5xgkngpb.js:4564133-4564309 placement
function isPluginDirectoryMarketplace(pluginId, knownMarketplaces) {
  let { marketplace } = parsePluginIdentifier(pluginId);
  if (marketplace === undefined) return false;
  let entry = Object.hasOwn(knownMarketplaces, marketplace) ? knownMarketplaces[marketplace] : undefined;
  return entry !== undefined && entry.source !== undefined && entry.source !== null
    ? isPluginDirectorySource(entry.source)
    : isOfficialMarketplaceSpelling(marketplace);
}
//@ chunk-5xgkngpb.js:4564309-4564361 placement
/**
 * isMarketplaceNamed：市场名是否匹配（官方名按族匹配）。
 */
function isMarketplaceNamed(marketplace, candidate) {
  return marketplace === OFFICIAL_MARKETPLACE_NAME
    ? isOfficialMarketplaceName_3(candidate)
    : candidate === OFFICIAL_MARKETPLACE_NAME && isOfficialMarketplaceName_3(marketplace);
}
//@ chunk-5xgkngpb.js:4564361-4564795 placement
/**
 * 来自同一来源的其他官方市场族安装。
 */
async function findOtherMarketplaceInstalls(pluginId, entry, knownMarketplaces, predicate, storageV5) {
  if (isPluginDirectoryAvailable()) {
    let marketplaceName = marketplaceNameOfId(pluginId);
    if (!marketplaceName) return [];
    let sourceKey = samePluginSource(
      entry.source,
      sourceUrlAndRef(knownMarketplaces[marketplaceName]?.source),
    );
    if (sourceKey === undefined) return [];
    let plugins = (
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
    ).plugins;
    let results = [];
    for (let [key, value] of Object.entries(plugins)) {
      let otherMarketplace = marketplaceNameOfId(key);
      if (
        !otherMarketplace ||
        otherMarketplace === marketplaceName ||
        !isMarketplaceNamed(marketplaceName, otherMarketplace)
      )
        continue;
      let filtered = value.filter(predicate);
      if (filtered.length === 0) continue;
      let pluginByIdCacheOnly = await getPluginByIdCacheOnly(key, storageV5);
      if (
        pluginByIdCacheOnly &&
        samePluginSource(
          pluginByIdCacheOnly.entry.source,
          sourceUrlAndRef(knownMarketplaces[otherMarketplace]?.source),
        ) === sourceKey
      )
        results.push({
          otherId: key,
          installations: filtered,
        });
    }
    return results;
  }
  return [];
}
//@ chunk-5xgkngpb.js:4564795-4565156 placement
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
      scopes: normalizeCaseForComparison_2(installations.map((installation) => installation.scope)),
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
  installPluginDependencies,
  checkLockfileSupported,
  describeOtherMarketplaceInstalls,
  findBlockedMarketplace,
  isPluginDirectoryMarketplace,
  pluginDirectoryUnavailableReason,
  isListingUsableForMarketplace,
  computeDependencyEnablement,
  autoInstallPluginDependencies,
  formatDirectoryUnavailableMessage,
  npmMarketplaceDefaultOff,
  mapped_4,
  BINARY_LOCKFILE_MESSAGES,
  isPluginEnabledAndCachedAtScope,
  hasCachedInstallationAtScope,
  hasNodeModulesDir,
  isMarketplaceNamed,
  findOtherMarketplaceInstalls,
  pruneOrphanedAutoDeps,
};
