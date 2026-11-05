/**
 * utils/plugins/marketplaceSources.ts
 *
 * 2.1.316 新增：市场来源
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-5xgkngpb.js (34)
 * attribution: placement 34
 */
import { isAbsolute, resolve as resolve_2 } from "path";
import { canonicalFetchSourceUrl } from "./marketplacePolicy.js";
import {
  isWorkspaceTrustedForMarketplace,
  settingsSourceOfMarketplace,
  lookalikeReservedMarketplaceName,
  validateReservedMarketplaceEntry,
  getStorageArm,
  normalizeInstallLocation,
  getDeclaredMarketplaces,
  getMarketplaceDeclaringSource,
} from "./marketplaceManager.js";
import {
  getInitialSettings,
  getSettingsForSource,
  getSettingsForSourceWriteSeed,
} from "../settings/settings.js";
import { getEnabledSettingSources, REPO_DIR_SETTING_SOURCES } from "../settings/constants.js";
import { sorted } from "./marketplaceAutoUpdate.js";
import { getAddDirExtraMarketplaces } from "./addDirPluginSettings.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  classifyMarketplacePathOrUndefined,
  DOT_RELATIVE_RE,
  isSuspiciousRelativeMarketplacePath,
  classifyMarketplacePath,
  isWindowsAbsolutePath,
  getLocalSourcePath,
} from "./localMarketplacePaths.js";
import { getOriginalCwd } from "../../bootstrap/state.js";
import { isLocalMarketplaceSource, PLUGIN_DIRECTORY_MARKETPLACE_NAMES } from "./schemas.js";
import { pluginGitUrlError } from "./pluginDirectoryTelemetry.js";
import { jsonStringify } from "../slowOperations.js";
import { isFreshTimestamp as isFreshTimestamp_2 } from "./pluginCachePaths.js";
import {
  isOfficialMarketplaceSpelling,
  OFFICIAL_MARKETPLACE_NAME,
  reservedMarketplaceEntryMessage,
} from "./officialMarketplaceNames.js";
import { logForDebugging } from "../debug.js";
import { MARKETPLACE_SOURCE_FIX_HINTS as MARKETPLACE_SOURCE_FIX_HINTS_2 } from "./marketplaceNames.js";
import { import_sortedIndex_2 } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPluginDirectoryModeOn } from "./pluginGates.js";
import { hasClaudeAiReservedPrefix } from "./pluginDirectories.js";
import { formatSourceForDisplay } from "./marketplaceHelpers.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-5xgkngpb.js:4339650-4340209 placement
/**
 * 对 url 源市场，在各设置层（以及受信时的初始设置）的 extraKnownMarketplaces 中找同一规范 URL 的声明， 返回其 headers、headersHelper 与作者（operator/repo）。
 */
function findUrlMarketplaceHeaders(source, name) {
  if (source?.source !== "url") return;
  let canonicalUrl = canonicalFetchSourceUrl(source.url);
  let entryFor = (entry, tier) =>
    entry !== undefined &&
    entry.source.source === "url" &&
    canonicalFetchSourceUrl(entry.source.url) === canonicalUrl
      ? {
          headers: entry.source.headers,
          headersHelper:
            typeof entry.source.headersHelper === "string" && entry.source.headersHelper !== ""
              ? entry.source.headersHelper
              : undefined,
          operatorAuthored: tier !== "repo",
          authoredBy: tier,
        }
      : undefined;
  let findInRecord = (record, tier) => {
    let named = name !== undefined ? entryFor(ownPropertyOrUndefined(record, name), tier) : undefined;
    if (named !== undefined) return named;
    for (let entry of Object.values(record)) {
      let found = entryFor(entry, tier);
      if (found !== undefined) return found;
    }
    return;
  };
  let inExtraMarketplacesByTier = findInExtraMarketplacesByTier(findInRecord);
  if (inExtraMarketplacesByTier !== undefined) return inExtraMarketplacesByTier;
  return isWorkspaceTrustedForMarketplace()
    ? findInRecord(getInitialSettings().extraKnownMarketplaces ?? {}, "repo")
    : undefined;
}
//@ chunk-5xgkngpb.js:4340209-4340292 placement
/**
 * repoAuthoredMarketplaceHeaders：市场仓库自己声明的 headers。
 */
function repoAuthoredMarketplaceHeaders(name, marketplaceName) {
  let urlMarketplaceHeaders = findUrlMarketplaceHeaders(name, marketplaceName);
  return urlMarketplaceHeaders !== undefined && urlMarketplaceHeaders.authoredBy !== "repo"
    ? urlMarketplaceHeaders
    : undefined;
}
//@ chunk-5xgkngpb.js:4340292-4340385 placement
function findInExtraMarketplacesByTier(finder) {
  for (let { tier, record } of getExtraMarketplacesByTier()) {
    let found = finder(record, tier);
    if (found !== undefined) return found;
  }
  return;
}
//@ chunk-5xgkngpb.js:4340385-4340511 placement
function getExtraMarketplacesByTier() {
  let enabledSettingSources = getEnabledSettingSources();
  return sorted
    .filter((tier) => enabledSettingSources.includes(tier))
    .map((tier) => ({
      tier,
      record: getSettingsForSource(tier)?.extraKnownMarketplaces ?? {},
    }));
}
//@ chunk-5xgkngpb.js:4340511-4340800 placement
/**
 * 在设置声明的 settings 源市场中找插件的 archive 条目。
 */
function findSettingsArchiveEntry(name, pluginName) {
  if (name === undefined) return;
  for (let { tier, record } of getExtraMarketplacesByTier()) {
    let entry = ownPropertyOrUndefined(record, name);
    if (entry !== undefined) return toArchiveEntryAuth(entry, pluginName, "settings", tier);
  }
  if (!isWorkspaceTrustedForMarketplace()) return;
  let entry = ownPropertyOrUndefined(getInitialSettings().extraKnownMarketplaces ?? {}, name);
  if (entry !== undefined) return toArchiveEntryAuth(entry, pluginName, "repo");
  let addDirEntry = ownPropertyOrUndefined(getAddDirExtraMarketplaces(), name);
  return addDirEntry === undefined ? undefined : toArchiveEntryAuth(addDirEntry, pluginName, "addDir");
}
//@ chunk-5xgkngpb.js:4340800-4340855 placement
/**
 * ownPropertyOrUndefined：安全读取自有属性。
 */
function ownPropertyOrUndefined(target, key) {
  return Object.hasOwn(target, key) ? target[key] : undefined;
}
//@ chunk-5xgkngpb.js:4340855-4341229 placement
/**
 * settings 源市场中插件的 archive URL、headers 与 helper（--add-dir 不带 helper）。
 */
function toArchiveEntryAuth(entry, pluginName, origin, tier) {
  if (entry.source.source !== "settings") return;
  let found = entry.source.plugins.find((plugin) => plugin.name === pluginName);
  if (!found || typeof found.source !== "object" || found.source.source !== "archive") return;
  return {
    origin,
    ...(tier !== undefined && {
      operatorTier: tier,
    }),
    archiveUrl: found.source.url,
    headers: found.headers,
    headersHelper:
      origin !== "addDir" && typeof found.headersHelper === "string" && found.headersHelper !== ""
        ? found.headersHelper
        : undefined,
  };
}
//@ chunk-5xgkngpb.js:4343163-4343236 placement
/**
 * marketplaceSourceOfPlugin：插件所属市场的设置来源。
 */
function marketplaceSourceOfPlugin(pluginId) {
  let { marketplace } = parsePluginIdentifier(pluginId);
  return marketplace === undefined ? undefined : settingsSourceOfMarketplace(marketplace);
}
//@ chunk-5xgkngpb.js:4343236-4343250 placement
var MARKETPLACE_ADMISSION_CACHE_TTL_MS = 60000;
//@ chunk-5xgkngpb.js:4343250-4343307 placement
/**
 * clearMarketplaceAdmissionVerdicts：清空市场准入判定缓存。
 */
function clearMarketplaceAdmissionVerdicts() {
  getPluginRegistry().marketplaceAdmissionVerdicts.clear();
}
//@ chunk-5xgkngpb.js:4343307-4344227 placement
function describeUnusableMarketplaceSource(entry, marketplaceName) {
  let isSafeLocalPath = (path) => {
    if (isAbsolute(path))
      return classifyMarketplacePathOrUndefined(path, entry.source, marketplaceName) !== undefined;
    let replaced = path.replace(DOT_RELATIVE_RE, "");
    return (
      resolve_2(replaced) === resolve_2(getOriginalCwd(), replaced) &&
      !isSuspiciousRelativeMarketplacePath(path) &&
      !classifyMarketplacePath(resolve_2(getOriginalCwd(), replaced)).suspect
    );
  };
  if (!isSafeLocalPath(entry.installLocation))
    return {
      cause: `its location is on a network drive, has "." or ".." in its path, or couldn't be checked`,
      kind: "network-location",
    };
  let source = entry.source;
  if (source === undefined) return;
  if (isLocalMarketplaceSource(source) && !isSafeLocalPath(source.path))
    return {
      cause: `the folder or file it was added from is on a network drive, has "." or ".." in its path, or couldn't be checked`,
      kind: "network-location",
    };
  let urlError = source.source === "git" ? pluginGitUrlError(source.url) : null;
  if (urlError !== null)
    return {
      cause: `its git URL can't be used: ${urlError.message.replace(/\.$/, "")}`,
      kind: "source",
    };
  if (source.source === "url" && !isHttpUrl(source.url))
    return {
      cause: "its URL can't be read as an https:// or http:// address",
      kind: "source",
    };
  if (!isSourceConsistentWith(source, marketplaceName))
    return {
      cause: "its source doesn't match its extraKnownMarketplaces entry in user or managed settings",
      kind: "declaration",
    };
  return;
}
//@ chunk-5xgkngpb.js:4344227-4344669 placement
/**
 * 不可用市场来源的修复建议与对应失败码。
 */
var MARKETPLACE_SOURCE_FIX_HINTS = {
  "network-location":
    "add it from a folder or file on this computer, or, to trust a folder on a network drive, declare it under extraKnownMarketplaces in user or managed settings (a declaration in project or local settings does not count)",
  source: "use a supported source",
  declaration: "add it from the source that entry lists, or change the entry",
};
var MARKETPLACE_SOURCE_FAILURE_CODES = {
  "network-location": "network_location",
  source: "invalid_source",
  declaration: undefined,
};
//@ chunk-5xgkngpb.js:4344669-4344712 placement
function isMarketplaceAdmitted(pluginId, source) {
  return marketplaceAdmissionKind(pluginId, source) === undefined;
}
//@ chunk-5xgkngpb.js:4344712-4344752 placement
function marketplaceAdmissionKind(name, entry) {
  return checkMarketplaceAdmission(name, entry)?.kind;
}
//@ chunk-5xgkngpb.js:4344752-4345541 placement
/**
 * 判断一个已注册市场能否被使用：官方/保留拼写需合法来源；来源不可用（网络位置、无效来源、声明不符）则拒绝。 结果按（名字、位置、来源）缓存一段时间，首次拒绝记 warn。返回 {kind, cause} 或 undefined。
 */
function checkMarketplaceAdmission(name, entry) {
  let declaringSource = settingsSourceOfMarketplace(name);
  let cacheKey = jsonStringify([
    name,
    entry.installLocation,
    entry.source,
    declaringSource ?? null,
    isAbsolute(entry.installLocation) ? null : resolve_2(entry.installLocation),
    entry.source !== undefined && isLocalMarketplaceSource(entry.source) && !isAbsolute(entry.source.path)
      ? resolve_2(entry.source.path)
      : null,
  ]);
  let now = Date.now();
  let marketplaceAdmissionVerdicts = getPluginRegistry().marketplaceAdmissionVerdicts;
  let cached = marketplaceAdmissionVerdicts.get(cacheKey);
  if (cached !== undefined && isFreshTimestamp_2(cached.at, MARKETPLACE_ADMISSION_CACHE_TTL_MS, now))
    return cached.refusal === undefined
      ? undefined
      : {
          kind: cached.refusal,
          cause: cached.cause,
        };
  let sourceRefusal =
    isOfficialMarketplaceSpelling(name) || lookalikeReservedMarketplaceName(name) !== undefined
      ? validateReservedMarketplaceEntry(name, entry)
      : null;
  if (sourceRefusal !== null) {
    marketplaceAdmissionVerdicts.set(cacheKey, {
      refusal: "source",
      at: now,
    });
    if (cached?.refusal === undefined)
      logForDebugging(sourceRefusal, {
        level: "warn",
      });
    return {
      kind: "source",
      cause: undefined,
    };
  }
  let unusable = describeUnusableMarketplaceSource(entry, declaringSource);
  if (unusable === undefined) {
    marketplaceAdmissionVerdicts.set(cacheKey, {
      refusal: undefined,
      at: now,
    });
    return;
  }
  marketplaceAdmissionVerdicts.set(cacheKey, {
    refusal: unusable.kind,
    cause: unusable.cause,
    at: now,
  });
  if (cached?.refusal === undefined)
    logForDebugging(
      `Marketplace ${jsonStringify(name)} is ignored everywhere: ${unusable.cause} \u2014 ${MARKETPLACE_SOURCE_FIX_HINTS_2[unusable.kind]}.`,
      {
        level: "warn",
      },
    );
  return {
    kind: unusable.kind,
    cause: unusable.cause,
  };
}
//@ chunk-5xgkngpb.js:4345541-4345589 placement
/**
 * hiddenRegistryEntries：隐藏的市场条目。
 */
function hiddenRegistryEntries() {
  return getPluginRegistry().hiddenRegistryEntries;
}
//@ chunk-5xgkngpb.js:4345589-4345640 placement
/**
 * releasedRegistryEntries：已放行的市场条目。
 */
function releasedRegistryEntries() {
  return getPluginRegistry().releasedRegistryEntries;
}
//@ chunk-5xgkngpb.js:4345640-4345683 placement
/**
 * hiddenRegistryEntryFor：取某存储臂下隐藏的市场条目。
 */
function hiddenRegistryEntryFor(name, storageV5) {
  return hiddenRegistryEntries()[getStorageArm(storageV5)].get(name);
}
//@ chunk-5xgkngpb.js:4345683-4345747 placement
/**
 * releaseRegistryEntry：把市场条目从隐藏移到已放行。
 */
function releaseRegistryEntry(name, storageV5) {
  let storageArm = getStorageArm(storageV5);
  hiddenRegistryEntries()[storageArm].delete(name);
  releasedRegistryEntries()[storageArm].add(name);
}
//@ chunk-5xgkngpb.js:4345747-4345843 placement
function isHttpUrl(url) {
  try {
    let { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
//@ chunk-5xgkngpb.js:4345843-4346082 placement
function isSourceConsistentWith(candidate, declaredSource) {
  if (declaredSource === undefined || isLocalMarketplaceSource(candidate)) return true;
  switch (candidate.source) {
    case "url":
    case "git":
    case "npm":
      return import_sortedIndex_2(candidate, declaredSource);
    case "github":
      return (
        declaredSource.source === "github" &&
        import_sortedIndex_2(
          {
            ...candidate,
            repo: candidate.repo.toLowerCase(),
          },
          {
            ...declaredSource,
            repo: declaredSource.repo.toLowerCase(),
          },
        )
      );
    default:
      return true;
  }
}
//@ chunk-5xgkngpb.js:4346082-4346233 placement
function getAdmittedMarketplaceEntry(marketplaceName, config) {
  let entry = Object.hasOwn(config, marketplaceName) ? config[marketplaceName] : undefined;
  if (entry === undefined) return;
  entry.installLocation = normalizeInstallLocation(entry.source, entry.installLocation);
  return isMarketplaceAdmitted(marketplaceName, entry) ? entry : undefined;
}
//@ chunk-5xgkngpb.js:4346233-4346529 placement
function filterAdmittedMarketplaces(knownMarketplacesConfig, storageArm) {
  let admitted = knownMarketplacesConfig;
  let hidden = new Map();
  let kinds = new Map();
  let causes = new Map();
  for (let [key, value] of Object.entries(knownMarketplacesConfig)) {
    let verdict = checkMarketplaceAdmission(key, value);
    if (verdict !== undefined) {
      if (admitted === knownMarketplacesConfig)
        admitted = {
          ...knownMarketplacesConfig,
        };
      delete admitted[key];
      kinds.set(key, verdict.kind);
      if (verdict.cause !== undefined) causes.set(key, verdict.cause);
      if (!releasedRegistryEntries()[storageArm].has(key)) hidden.set(key, value);
    }
  }
  hiddenRegistryEntries()[storageArm] = hidden;
  if (kinds.size > 0)
    weakMap_16.set(admitted, {
      kinds,
      causes,
    });
  return admitted;
}
//@ chunk-5xgkngpb.js:4346529-4346561 placement
var weakMap_16; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var admissionVerdictCache;
deferInit("chunk-5xgkngpb.js:4346529", () => {
  weakMap_16 = new WeakMap();
  admissionVerdictCache = new Map();
});
//@ chunk-5xgkngpb.js:4346561-4346606 placement
/**
 * admissionKindsFor：某市场的准入类别表。
 */
function admissionKindsFor(config) {
  return weakMap_16.get(config)?.kinds ?? admissionVerdictCache;
}
//@ chunk-5xgkngpb.js:4346606-4346657 placement
/**
 * admissionCauseFor：某市场被拒的原因。
 */
function admissionCauseFor(config, name) {
  return weakMap_16.get(config)?.causes.get(name);
}
//@ chunk-5xgkngpb.js:4346657-4346705 placement
/**
 * isOfficialMarketplaceSourced：官方市场来源可用。
 */
function isOfficialMarketplaceSourced(config) {
  return admissionKindsFor(config).get(OFFICIAL_MARKETPLACE_NAME) === "source";
}
//@ chunk-5xgkngpb.js:4346705-4346811 placement
function reservedMarketplaceNameMessage(name) {
  if (isOfficialMarketplaceSpelling(name))
    return reservedMarketplaceEntryMessage(name, isPluginDirectoryModeOn());
  let lookalike = lookalikeReservedMarketplaceName(name);
  return lookalike === undefined
    ? undefined
    : reservedMarketplaceEntryMessage(
        name,
        false,
        lookalike,
        !PLUGIN_DIRECTORY_MARKETPLACE_NAMES.has(lookalike),
      );
}
//@ chunk-5xgkngpb.js:4346811-4346948 placement
/**
 * 因来源被拒的保留名市场及说明。
 */
function listReservedNameRefusals(config) {
  let refusals = [];
  for (let [name, kind] of admissionKindsFor(config)) {
    if (kind !== "source") continue;
    {
      let message = reservedMarketplaceNameMessage(name);
      if (message !== undefined)
        refusals.push({
          name,
          message,
        });
    }
  }
  return refusals;
}
//@ chunk-5xgkngpb.js:4346948-4347063 placement
function logMarketplaceNoticeOnce(key, message, level = "warn") {
  let marketplaceResolutionNoticesLogged = getPluginRegistry().marketplaceResolutionNoticesLogged;
  if (marketplaceResolutionNoticesLogged.has(key)) return;
  marketplaceResolutionNoticesLogged.add(key);
  logForDebugging(message, {
    level,
  });
}
//@ chunk-5xgkngpb.js:4347063-4348062 placement
function validateDeclaredMarketplaceSource(names, config) {
  let kinds = admissionKindsFor(config);
  let declared;
  let additions = {};
  let skipped = new Map();
  for (let name of names) {
    if (Object.hasOwn(config, name) || kinds.has(name) || hasClaudeAiReservedPrefix(name)) continue;
    declared ??= getDeclaredMarketplaces();
    let entry = ownPropertyOrUndefined(declared, name);
    if (entry === undefined) continue;
    let { source } = entry;
    if (!isLocalMarketplaceSource(source)) {
      skipped.set(name, "its declared source is not a directory or file source");
      continue;
    }
    if (!isWindowsAbsolutePath(source.path)) {
      skipped.set(
        name,
        "its declared path is not fully anchored (relative, or drive-less on Windows); the background reconcile anchors and records it",
      );
      continue;
    }
    let localSourcePath = getLocalSourcePath(source);
    if (localSourcePath === undefined) {
      skipped.set(name, "its declared file source is not a manifest under a .claude-plugin folder");
      continue;
    }
    let record = {
      source,
      installLocation: localSourcePath,
      lastUpdated: new Date().toISOString(),
    };
    if (!isMarketplaceAdmitted(name, record)) {
      skipped.set(name, "the registry admission rule refuses its declared location (see the line above)");
      continue;
    }
    additions[name] = record;
    logMarketplaceNoticeOnce(
      `declared-only:${name}:${localSourcePath}`,
      `Marketplace ${jsonStringify(name)} is declared in settings (${formatSourceForDisplay(source)}) but not recorded in known_marketplaces.json yet: its plugins load in place from the declared path, and the background reconcile records it`,
      "debug",
    );
  }
  return {
    additions,
    skipped,
  };
}
//@ chunk-5xgkngpb.js:4348062-4348173 placement
function getNonRepoExtraMarketplaces() {
  return getEnabledSettingSources()
    .filter((source) => !REPO_DIR_SETTING_SOURCES.has(source))
    .map((source) => ({
      source,
      extras: getSettingsForSource(source)?.extraKnownMarketplaces,
    }));
}
//@ chunk-5xgkngpb.js:4348173-4348556 placement
/**
 * autoUpdate 被托管设置/--settings/--add-dir 固定时返回来源说明。
 */
function findAutoUpdateOverrideSource(name) {
  let entry = getMarketplaceDeclaringSource(getSettingsForSource("policySettings"), name);
  if (entry !== undefined)
    return entry.autoUpdate !== undefined ? "managed settings (managed-settings.json)" : null;
  let flagEntry = getMarketplaceDeclaringSource(getSettingsForSource("flagSettings"), name);
  if (flagEntry !== undefined) return flagEntry.autoUpdate !== undefined ? "the --settings flag" : null;
  if (name === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryModeOn()) return null;
  if (
    ownPropertyOrUndefined(getAddDirExtraMarketplaces(), name)?.autoUpdate !== undefined &&
    getMarketplaceDeclaringSource(getInitialSettings(), name) === undefined
  )
    return "an --add-dir directory's settings";
  return null;
}
//@ chunk-5xgkngpb.js:4348556-4348690 placement (2.1.88 match: supportsPersistence, 1)
function supportsPersistence(destination) {
  let sources = ["localSettings", "projectSettings", "userSettings"];
  for (let source of sources) {
    let settingsForSourceWriteSeed = getSettingsForSourceWriteSeed(source);
    if (getMarketplaceDeclaringSource(settingsForSourceWriteSeed, destination)) return source;
  }
  return null;
}
export {
  admissionKindsFor,
  admissionCauseFor,
  validateDeclaredMarketplaceSource,
  logMarketplaceNoticeOnce,
  isOfficialMarketplaceSourced,
  marketplaceSourceOfPlugin,
  findUrlMarketplaceHeaders,
  findSettingsArchiveEntry,
  repoAuthoredMarketplaceHeaders,
  getNonRepoExtraMarketplaces,
  ownPropertyOrUndefined,
  filterAdmittedMarketplaces,
  weakMap_16,
  releasedRegistryEntries,
  hiddenRegistryEntries,
  isSourceConsistentWith,
  describeUnusableMarketplaceSource,
  MARKETPLACE_SOURCE_FIX_HINTS,
  MARKETPLACE_SOURCE_FAILURE_CODES,
  hiddenRegistryEntryFor,
  listReservedNameRefusals,
  releaseRegistryEntry,
  clearMarketplaceAdmissionVerdicts,
  reservedMarketplaceNameMessage,
  getAdmittedMarketplaceEntry,
  findAutoUpdateOverrideSource,
  supportsPersistence,
};
