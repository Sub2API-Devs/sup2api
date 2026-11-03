/**
 * utils/plugins/marketplaceSources.ts
 *
 * 2.1.316 新增：市场来源
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (34)
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
} from "./marketplaceManager.js";
import {
  getInitialSettings_2,
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
import { isLocalMarketplaceSource } from "./reconciler.js";
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
import { En } from "../../../vendor/lodash-es/_inlinedHelpers.js";
import { isPluginDirectoryModeOn } from "./pluginGates.js";
import { PLUGIN_DIRECTORY_MARKETPLACE_NAMES } from "./schemas.js";
import { hasClaudeAiReservedPrefix } from "./pluginDirectories.js";
import { formatSourceForDisplay } from "./marketplaceHelpers.js";
import { removeExtraMarketplace } from "../../commands/plugin/PluginSettings.js";

//@ chunk-e6aww6q8.js:4233217-4233776 placement
/**
 * 对 url 源市场，在各设置层（以及受信时的初始设置）的 extraKnownMarketplaces 中找同一规范 URL 的声明， 返回其 headers、headersHelper 与作者（operator/repo）。
 */
function findUrlMarketplaceHeaders(source, n) {
  if (source?.source !== "url") return;
  let r = canonicalFetchSourceUrl(source.url);
  let s = (S, w) =>
    S !== undefined && S.source.source === "url" && canonicalFetchSourceUrl(S.source.url) === r
      ? {
          headers: S.source.headers,
          headersHelper:
            typeof S.source.headersHelper === "string" && S.source.headersHelper !== ""
              ? S.source.headersHelper
              : undefined,
          operatorAuthored: w !== "repo",
          authoredBy: w,
        }
      : undefined;
  let h = (S, w) => {
    let L = n !== undefined ? s(ownPropertyOrUndefined(S, n), w) : undefined;
    if (L !== undefined) return L;
    for (let G of Object.values(S)) {
      let q = s(G, w);
      if (q !== undefined) return q;
    }
    return;
  };
  let inExtraMarketplacesByTier = findInExtraMarketplacesByTier(h);
  if (inExtraMarketplacesByTier !== undefined) return inExtraMarketplacesByTier;
  return isWorkspaceTrustedForMarketplace()
    ? h(getInitialSettings_2().extraKnownMarketplaces ?? {}, "repo")
    : undefined;
}
//@ chunk-e6aww6q8.js:4233776-4233859 placement
/**
 * repoAuthoredMarketplaceHeaders：市场仓库自己声明的 headers。
 */
function repoAuthoredMarketplaceHeaders(e, n) {
  let urlMarketplaceHeaders = findUrlMarketplaceHeaders(e, n);
  return urlMarketplaceHeaders !== undefined && urlMarketplaceHeaders.authoredBy !== "repo"
    ? urlMarketplaceHeaders
    : undefined;
}
//@ chunk-e6aww6q8.js:4233859-4233952 placement
function findInExtraMarketplacesByTier(e) {
  for (let { tier, record } of getExtraMarketplacesByTier()) {
    let s = e(record, tier);
    if (s !== undefined) return s;
  }
  return;
}
//@ chunk-e6aww6q8.js:4233952-4234078 placement
function getExtraMarketplacesByTier() {
  let enabledSettingSources = getEnabledSettingSources();
  return sorted
    .filter((n) => enabledSettingSources.includes(n))
    .map((n) => ({
      tier: n,
      record: getSettingsForSource(n)?.extraKnownMarketplaces ?? {},
    }));
}
//@ chunk-e6aww6q8.js:4234078-4234367 placement
/**
 * 在设置声明的 settings 源市场中找插件的 archive 条目。
 */
function findSettingsArchiveEntry(e, name) {
  if (e === undefined) return;
  for (let { tier, record } of getExtraMarketplacesByTier()) {
    let S = ownPropertyOrUndefined(record, e);
    if (S !== undefined) return toArchiveEntryAuth(S, name, "settings", tier);
  }
  if (!isWorkspaceTrustedForMarketplace()) return;
  let r = ownPropertyOrUndefined(getInitialSettings_2().extraKnownMarketplaces ?? {}, e);
  if (r !== undefined) return toArchiveEntryAuth(r, name, "repo");
  let s = ownPropertyOrUndefined(getAddDirExtraMarketplaces(), e);
  return s === undefined ? undefined : toArchiveEntryAuth(s, name, "addDir");
}
//@ chunk-e6aww6q8.js:4234367-4234422 placement
/**
 * ownPropertyOrUndefined：安全读取自有属性。
 */
function ownPropertyOrUndefined(e, n) {
  return Object.hasOwn(e, n) ? e[n] : undefined;
}
//@ chunk-e6aww6q8.js:4234422-4234796 placement
/**
 * settings 源市场中插件的 archive URL、headers 与 helper（--add-dir 不带 helper）。
 */
function toArchiveEntryAuth(e, n, r, tier) {
  if (e.source.source !== "settings") return;
  let found = e.source.plugins.find((plugin) => plugin.name === n);
  if (!found || typeof found.source !== "object" || found.source.source !== "archive") return;
  return {
    origin: r,
    ...(tier !== undefined && {
      operatorTier: tier,
    }),
    archiveUrl: found.source.url,
    headers: found.headers,
    headersHelper:
      r !== "addDir" && typeof found.headersHelper === "string" && found.headersHelper !== ""
        ? found.headersHelper
        : undefined,
  };
}
//@ chunk-e6aww6q8.js:4236730-4236803 placement
/**
 * marketplaceSourceOfPlugin：插件所属市场的设置来源。
 */
function marketplaceSourceOfPlugin(e) {
  let { marketplace } = parsePluginIdentifier(e);
  return marketplace === undefined ? undefined : settingsSourceOfMarketplace(marketplace);
}
//@ chunk-e6aww6q8.js:4236803-4236817 placement
var MARKETPLACE_ADMISSION_CACHE_TTL_MS = 60000;
//@ chunk-e6aww6q8.js:4236817-4236874 placement
/**
 * clearMarketplaceAdmissionVerdicts：清空市场准入判定缓存。
 */
function clearMarketplaceAdmissionVerdicts() {
  getPluginRegistry().marketplaceAdmissionVerdicts.clear();
}
//@ chunk-e6aww6q8.js:4236874-4237794 placement
function describeUnusableMarketplaceSource(knownMarketplaceEntry, n) {
  let r = (y) => {
    if (isAbsolute(y))
      return classifyMarketplacePathOrUndefined(y, knownMarketplaceEntry.source, n) !== undefined;
    let replaced = y.replace(DOT_RELATIVE_RE, "");
    return (
      resolve_2(replaced) === resolve_2(getOriginalCwd(), replaced) &&
      !isSuspiciousRelativeMarketplacePath(y) &&
      !classifyMarketplacePath(resolve_2(getOriginalCwd(), replaced)).suspect
    );
  };
  if (!r(knownMarketplaceEntry.installLocation))
    return {
      cause: `its location is on a network drive, has "." or ".." in its path, or couldn't be checked`,
      kind: "network-location",
    };
  let source = knownMarketplaceEntry.source;
  if (source === undefined) return;
  if (isLocalMarketplaceSource(source) && !r(source.path))
    return {
      cause: `the folder or file it was added from is on a network drive, has "." or ".." in its path, or couldn't be checked`,
      kind: "network-location",
    };
  let h = source.source === "git" ? pluginGitUrlError(source.url) : null;
  if (h !== null)
    return {
      cause: `its git URL can't be used: ${h.message.replace(/\.$/, "")}`,
      kind: "source",
    };
  if (source.source === "url" && !isHttpUrl(source.url))
    return {
      cause: "its URL can't be read as an https:// or http:// address",
      kind: "source",
    };
  if (!isSourceConsistentWith(source, n))
    return {
      cause: "its source doesn't match its extraKnownMarketplaces entry in user or managed settings",
      kind: "declaration",
    };
  return;
}
//@ chunk-e6aww6q8.js:4237794-4238236 placement
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
//@ chunk-e6aww6q8.js:4238236-4238279 placement
function isMarketplaceAdmitted(e, n) {
  return marketplaceAdmissionKind(e, n) === undefined;
}
//@ chunk-e6aww6q8.js:4238279-4238319 placement
function marketplaceAdmissionKind(e, n) {
  return checkMarketplaceAdmission(e, n)?.kind;
}
//@ chunk-e6aww6q8.js:4238319-4239108 placement
/**
 * 判断一个已注册市场能否被使用：官方/保留拼写需合法来源；来源不可用（网络位置、无效来源、声明不符）则拒绝。 结果按（名字、位置、来源）缓存一段时间，首次拒绝记 warn。返回 {kind, cause} 或 undefined。
 */
function checkMarketplaceAdmission(e, n) {
  let r = settingsSourceOfMarketplace(e);
  let s = jsonStringify([
    e,
    n.installLocation,
    n.source,
    r ?? null,
    isAbsolute(n.installLocation) ? null : resolve_2(n.installLocation),
    n.source !== undefined && isLocalMarketplaceSource(n.source) && !isAbsolute(n.source.path)
      ? resolve_2(n.source.path)
      : null,
  ]);
  let now = Date.now();
  let marketplaceAdmissionVerdicts = getPluginRegistry().marketplaceAdmissionVerdicts;
  let S = marketplaceAdmissionVerdicts.get(s);
  if (S !== undefined && isFreshTimestamp_2(S.at, MARKETPLACE_ADMISSION_CACHE_TTL_MS, now))
    return S.refusal === undefined
      ? undefined
      : {
          kind: S.refusal,
          cause: S.cause,
        };
  let w =
    isOfficialMarketplaceSpelling(e) || lookalikeReservedMarketplaceName(e) !== undefined
      ? validateReservedMarketplaceEntry(e, n)
      : null;
  if (w !== null) {
    marketplaceAdmissionVerdicts.set(s, {
      refusal: "source",
      at: now,
    });
    if (S?.refusal === undefined)
      logForDebugging(w, {
        level: "warn",
      });
    return {
      kind: "source",
      cause: undefined,
    };
  }
  let L = describeUnusableMarketplaceSource(n, r);
  if (L === undefined) {
    marketplaceAdmissionVerdicts.set(s, {
      refusal: undefined,
      at: now,
    });
    return;
  }
  marketplaceAdmissionVerdicts.set(s, {
    refusal: L.kind,
    cause: L.cause,
    at: now,
  });
  if (S?.refusal === undefined)
    logForDebugging(
      `Marketplace ${jsonStringify(e)} is ignored everywhere: ${L.cause} \u2014 ${MARKETPLACE_SOURCE_FIX_HINTS_2[L.kind]}.`,
      {
        level: "warn",
      },
    );
  return {
    kind: L.kind,
    cause: L.cause,
  };
}
//@ chunk-e6aww6q8.js:4239108-4239156 placement
/**
 * hiddenRegistryEntries：隐藏的市场条目。
 */
function hiddenRegistryEntries() {
  return getPluginRegistry().hiddenRegistryEntries;
}
//@ chunk-e6aww6q8.js:4239156-4239207 placement
/**
 * releasedRegistryEntries：已放行的市场条目。
 */
function releasedRegistryEntries() {
  return getPluginRegistry().releasedRegistryEntries;
}
//@ chunk-e6aww6q8.js:4239207-4239250 placement
/**
 * hiddenRegistryEntryFor：取某存储臂下隐藏的市场条目。
 */
function hiddenRegistryEntryFor(e, storageV5) {
  return hiddenRegistryEntries()[getStorageArm(storageV5)].get(e);
}
//@ chunk-e6aww6q8.js:4239250-4239314 placement
/**
 * releaseRegistryEntry：把市场条目从隐藏移到已放行。
 */
function releaseRegistryEntry(e, storageV5) {
  let storageArm = getStorageArm(storageV5);
  hiddenRegistryEntries()[storageArm].delete(e);
  releasedRegistryEntries()[storageArm].add(e);
}
//@ chunk-e6aww6q8.js:4239314-4239410 placement
function isHttpUrl(url) {
  try {
    let { protocol } = new URL(url);
    return protocol === "https:" || protocol === "http:";
  } catch {
    return false;
  }
}
//@ chunk-e6aww6q8.js:4239410-4239649 placement
function isSourceConsistentWith(e, source) {
  if (source === undefined || isLocalMarketplaceSource(e)) return true;
  switch (e.source) {
    case "url":
    case "git":
    case "npm":
      return En(e, source);
    case "github":
      return (
        source.source === "github" &&
        En(
          {
            ...e,
            repo: e.repo.toLowerCase(),
          },
          {
            ...source,
            repo: source.repo.toLowerCase(),
          },
        )
      );
    default:
      return true;
  }
}
//@ chunk-e6aww6q8.js:4239649-4239800 placement
function getAdmittedMarketplaceEntry(marketplaceName, config) {
  let r = Object.hasOwn(config, marketplaceName) ? config[marketplaceName] : undefined;
  if (r === undefined) return;
  r.installLocation = normalizeInstallLocation(r.source, r.installLocation);
  return isMarketplaceAdmitted(marketplaceName, r) ? r : undefined;
}
//@ chunk-e6aww6q8.js:4239800-4240096 placement
function filterAdmittedMarketplaces(knownMarketplacesConfig, storageArm) {
  let r = knownMarketplacesConfig;
  let s = new Map();
  let h = new Map();
  let y = new Map();
  for (let [key, value] of Object.entries(knownMarketplacesConfig)) {
    let L = checkMarketplaceAdmission(key, value);
    if (L !== undefined) {
      if (r === knownMarketplacesConfig)
        r = {
          ...knownMarketplacesConfig,
        };
      delete r[key];
      h.set(key, L.kind);
      if (L.cause !== undefined) y.set(key, L.cause);
      if (!releasedRegistryEntries()[storageArm].has(key)) s.set(key, value);
    }
  }
  hiddenRegistryEntries()[storageArm] = s;
  if (h.size > 0)
    weakMap_11.set(r, {
      kinds: h,
      causes: y,
    });
  return r;
}
//@ chunk-e6aww6q8.js:4240096-4240128 placement
var weakMap_11 = new WeakMap();
var admissionVerdictCache = new Map();
//@ chunk-e6aww6q8.js:4240128-4240173 placement
/**
 * admissionKindsFor：某市场的准入类别表。
 */
function admissionKindsFor(e) {
  return weakMap_11.get(e)?.kinds ?? admissionVerdictCache;
}
//@ chunk-e6aww6q8.js:4240173-4240224 placement
/**
 * admissionCauseFor：某市场被拒的原因。
 */
function admissionCauseFor(knownMarketplaces, n) {
  return weakMap_11.get(knownMarketplaces)?.causes.get(n);
}
//@ chunk-e6aww6q8.js:4240224-4240272 placement
/**
 * isOfficialMarketplaceSourced：官方市场来源可用。
 */
function isOfficialMarketplaceSourced(e) {
  return admissionKindsFor(e).get(OFFICIAL_MARKETPLACE_NAME) === "source";
}
//@ chunk-e6aww6q8.js:4240272-4240378 placement
function reservedMarketplaceNameMessage(e) {
  if (isOfficialMarketplaceSpelling(e)) return reservedMarketplaceEntryMessage(e, isPluginDirectoryModeOn());
  let n = lookalikeReservedMarketplaceName(e);
  return n === undefined
    ? undefined
    : reservedMarketplaceEntryMessage(e, false, n, !PLUGIN_DIRECTORY_MARKETPLACE_NAMES.has(n));
}
//@ chunk-e6aww6q8.js:4240378-4240515 placement
/**
 * 因来源被拒的保留名市场及说明。
 */
function listReservedNameRefusals(e) {
  let n = [];
  for (let [r, s] of admissionKindsFor(e)) {
    if (s !== "source") continue;
    {
      let h = reservedMarketplaceNameMessage(r);
      if (h !== undefined)
        n.push({
          name: r,
          message: h,
        });
    }
  }
  return n;
}
//@ chunk-e6aww6q8.js:4240515-4240630 placement
function logMarketplaceNoticeOnce(e, n, level = "warn") {
  let marketplaceResolutionNoticesLogged = getPluginRegistry().marketplaceResolutionNoticesLogged;
  if (marketplaceResolutionNoticesLogged.has(e)) return;
  marketplaceResolutionNoticesLogged.add(e);
  logForDebugging(n, {
    level,
  });
}
//@ chunk-e6aww6q8.js:4240630-4241629 placement
function validateDeclaredMarketplaceSource(e, knownMarketplaces) {
  let r = admissionKindsFor(knownMarketplaces);
  let s;
  let h = {};
  let y = new Map();
  for (let S of e) {
    if (Object.hasOwn(knownMarketplaces, S) || r.has(S) || hasClaudeAiReservedPrefix(S)) continue;
    s ??= getDeclaredMarketplaces();
    let w = ownPropertyOrUndefined(s, S);
    if (w === undefined) continue;
    let { source } = w;
    if (!isLocalMarketplaceSource(source)) {
      y.set(S, "its declared source is not a directory or file source");
      continue;
    }
    if (!isWindowsAbsolutePath(source.path)) {
      y.set(
        S,
        "its declared path is not fully anchored (relative, or drive-less on Windows); the background reconcile anchors and records it",
      );
      continue;
    }
    let localSourcePath = getLocalSourcePath(source);
    if (localSourcePath === undefined) {
      y.set(S, "its declared file source is not a manifest under a .claude-plugin folder");
      continue;
    }
    let q = {
      source,
      installLocation: localSourcePath,
      lastUpdated: new Date().toISOString(),
    };
    if (!isMarketplaceAdmitted(S, q)) {
      y.set(S, "the registry admission rule refuses its declared location (see the line above)");
      continue;
    }
    h[S] = q;
    logMarketplaceNoticeOnce(
      `declared-only:${S}:${localSourcePath}`,
      `Marketplace ${jsonStringify(S)} is declared in settings (${formatSourceForDisplay(source)}) but not recorded in known_marketplaces.json yet: its plugins load in place from the declared path, and the background reconcile records it`,
      "debug",
    );
  }
  return {
    additions: h,
    skipped: y,
  };
}
//@ chunk-e6aww6q8.js:4241629-4241740 placement
function getNonRepoExtraMarketplaces() {
  return getEnabledSettingSources()
    .filter((e) => !REPO_DIR_SETTING_SOURCES.has(e))
    .map((e) => ({
      source: e,
      extras: getSettingsForSource(e)?.extraKnownMarketplaces,
    }));
}
//@ chunk-e6aww6q8.js:4241740-4242123 placement
/**
 * autoUpdate 被托管设置/--settings/--add-dir 固定时返回来源说明。
 */
function findAutoUpdateOverrideSource(name) {
  let n = removeExtraMarketplace(getSettingsForSource("policySettings"), name);
  if (n !== undefined) return n.autoUpdate !== undefined ? "managed settings (managed-settings.json)" : null;
  let r = removeExtraMarketplace(getSettingsForSource("flagSettings"), name);
  if (r !== undefined) return r.autoUpdate !== undefined ? "the --settings flag" : null;
  if (name === OFFICIAL_MARKETPLACE_NAME && isPluginDirectoryModeOn()) return null;
  if (
    ownPropertyOrUndefined(getAddDirExtraMarketplaces(), name)?.autoUpdate !== undefined &&
    removeExtraMarketplace(getInitialSettings_2(), name) === undefined
  )
    return "an --add-dir directory's settings";
  return null;
}
//@ chunk-e6aww6q8.js:4242123-4242257 placement = supportsPersistence (1)
function supportsPersistence(destination) {
  let n = ["localSettings", "projectSettings", "userSettings"];
  for (let r of n) {
    let settingsForSourceWriteSeed = getSettingsForSourceWriteSeed(r);
    if (removeExtraMarketplace(settingsForSourceWriteSeed, destination)) return r;
  }
  return null;
}
export {
  repoAuthoredMarketplaceHeaders,
  ownPropertyOrUndefined,
  clearMarketplaceAdmissionVerdicts,
  hiddenRegistryEntries,
  listReservedNameRefusals,
  findSettingsArchiveEntry,
  findUrlMarketplaceHeaders,
  admissionKindsFor,
  admissionCauseFor,
  validateDeclaredMarketplaceSource,
  logMarketplaceNoticeOnce,
  isOfficialMarketplaceSourced,
  marketplaceSourceOfPlugin,
  getNonRepoExtraMarketplaces,
  filterAdmittedMarketplaces,
  weakMap_11,
  releasedRegistryEntries,
  isSourceConsistentWith,
  describeUnusableMarketplaceSource,
  MARKETPLACE_SOURCE_FIX_HINTS,
  MARKETPLACE_SOURCE_FAILURE_CODES,
  hiddenRegistryEntryFor,
  releaseRegistryEntry,
  reservedMarketplaceNameMessage,
  getAdmittedMarketplaceEntry,
  findAutoUpdateOverrideSource,
  supportsPersistence,
};
