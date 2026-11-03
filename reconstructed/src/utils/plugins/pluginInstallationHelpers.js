/**
 * utils/plugins/pluginInstallationHelpers.ts
 *
 * 插件安装主流程：依赖闭包、缓存与注册、command 来源同意、回滚，以及从市场安装的简化入口与错误文案。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginInstallationHelpers.ts
 * pieces: chunk-e6aww6q8.js (18)
 * attribution: fingerprint 4, callgraph-fingerprint 1, placement 11, callgraph-witnessed 1, layout 1
 */
import { basename, resolve as resolve_2, sep } from "path";
import {
  resolvePluginEntryPath,
  entryPathOrReason,
  entryPathOrReasonLenient,
  classifyMarketplacePath,
} from "./localMarketplacePaths.js";
import {
  tryUnwrapTextPayload,
  isKnownMarketplacesReadFailure,
  getPluginByIdCacheOnly,
  isPluginDirectoryAvailable,
  getMarketplaceCacheOnly,
  getPluginById,
  collectOrgBlockedPlugins,
  isListingBlocked,
  loadPluginDirectoryMarketplace,
  getPluginDirectoryState,
  formatSwitchNeedsFreshReadMessage,
} from "./marketplaceManager.js";
import { logForDebugging } from "../debug.js";
import { jsonStringify } from "../slowOperations.js";
import {
  readManifestVersion,
  getInstalledListRefusal,
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  isRecordablePluginId,
  restoreEarlierInstallRecord,
  removePluginInstallation,
  readInstalledPluginsFile,
  formatInvalidPluginIdMessage,
  getInstalledGitCommitSha,
} from "./installedPluginsManager.js";
import {
  probePluginGitHead,
  marketplaceCommitSha,
  pluginVersionOrNull,
  getPluginCloneUrl,
  getMarketplaceCloneUrl,
  resolveVersionRange,
  toRelativePluginSource,
} from "./pluginVersioning.js";
import {
  parsePluginIdentifier,
  scopeToSettingSource,
  parsePluginIdentifier_2,
  isOfficialMarketplaceName_3,
} from "./pluginIdentifier.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import {
  getVersionedCachePath,
  copyPluginToVersionedCache,
  strictCacheAddressable,
  versionParentContained,
  cacheDirHasPluginContentStrict,
  probeSeedForPlugin,
  loadAllPluginsCacheOnly,
} from "./pluginLoader.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { errorMessage, TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS } from "../errors.js";
import { classifyCacheEntry, removeVersionDirIfIdle } from "./pluginCacheMaterialize.js";
import { isPluginVersionInUse } from "./inUseMarkers.js";
import { getFsImplementation } from "../fsOperations.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import {
  findBindingKeysFor,
  isUnreadableBindings,
  bindingsWithReadFailure,
} from "./pluginDirectoryBindings.js";
import { samePluginSource, parseRepoWithRef } from "./pluginSourceUrl.js";
import { uniq } from "../collections.js";
import { OFFICIAL_MARKETPLACE_NAME, OFFICIAL_MARKETPLACE_DISPLAY } from "./officialMarketplaceNames.js";
import { getPluginSeedDirs, isLocalMarketplaceEntry } from "./pluginDirectories.js";
import { isClaudeAiMarketplaceSource } from "./claudeAiMarketplaces.js";
import { isLocalMarketplaceSource } from "./reconciler.js";
import {
  isPluginBlockedByPolicy,
  isSourceDisallowedOrUnverifiable,
  isListingRepositoryBlockedByHostPolicy,
} from "./marketplacePolicy.js";
import { MAX_PREVIOUS_PRODUCER_PATHS, isRelativeSourcePath } from "./schemas.js";
import {
  displaySafePluginId,
  quoteName,
  displaySafeName,
  MAX_DISPLAY_NAME_LENGTH,
  installationAtTarget,
  qualifyDependency,
  versionSatisfies,
  resolveDependencyClosure,
  dependencyRefMatches,
  intersectVersionConstraints,
  formatDependencyCountSuffix,
  describeConstraintConflict,
  noMatchingTagMessage,
} from "./dependencyResolver.js";
import {
  checkInstallAllowed,
  collectDependencyVersionRanges,
  findOtherProjectInstalls,
  describeOtherMarketplaceInstall,
  formatInstalledMessage,
} from "./installResultMessages.js";
import {
  describeOtherMarketplaceInstalls,
  findBlockedMarketplace,
  isPluginDirectoryMarketplace,
  pluginDirectoryUnavailableReason,
  isListingUsableForMarketplace,
  computeDependencyEnablement,
  autoInstallPluginDependencies,
  formatDirectoryUnavailableMessage,
} from "./pluginDependencies.js";
import { resolveDelistedPluginId } from "../../services/plugins/pluginOperations.js";
import {
  findOtherMarketplaceInstallBlocker,
  findSharedStorageConflict,
  installPluginWithRecords,
  PluginFolderHeldError,
  installFromOtherMarketplace,
  formatMoreInstallsThanShownMessage,
  formatSwitchTargetChangedMessage,
} from "./crossMarketplaceInstall.js";
import { getCwd } from "../cwd.js";
import { getEnabledPluginIdsInSource, policyEnabledPluginNameSet } from "./pluginPolicy.js";
import {
  getSettingsForSourceForUpkeep,
  getSettingsForSourceWriteSeed,
  getSettingsForSource,
  updateSettingsForSourceWithTransform,
} from "../settings/settings.js";
import { getEnabledSettingSources } from "../settings/constants.js";
import { printableName, quotedPrintable } from "../printableName.js";
import { markPluginVersionOrphaned, refreshPluginCaches } from "./cacheUtils.js";
import { logError } from "../log.js";
import { marketplaceSourceOfEntry, EntryHelperError } from "./headersHelper.js";
import { PinnedVersionMismatchError, PluginCachePublishError } from "./cachePublish.js";
import { isToolDetailsLoggingEnabled, sanitizeVersion } from "../../services/analytics/metadata.js";
import { logOTelEvent } from "../telemetry/events.js";
import { plural } from "../stringUtils.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { directoryInstallFields } from "./pluginDirectoryTelemetry.js";
import {
  buildPluginEventFields,
  pluginIdForTelemetry,
  buildPluginVersionShaField,
  classifyPluginCommandError,
} from "../telemetry/pluginTelemetry.js";
import { findPluginNameCollision } from "./pluginNameCollision.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { redactUrlsInMessage } from "../redaction/urlRedaction.js";
import { CommandSourceError } from "./commandSource.js";

//@ chunk-e6aww6q8.js:4354776-4354890 fingerprint = registerPluginInstallation (0.567)
/**
 * 两条安装记录是否等价（路径、更新时间相同且 auto 标记不降级）。
 */
function registerPluginInstallation(e, n) {
  return (
    e.installPath === n.installPath && e.lastUpdated === n.lastUpdated && (n.auto !== true || e.auto === true)
  );
}
//@ chunk-e6aww6q8.js:4365510-4366714 callgraph-fingerprint = cacheAndRegisterPlugin (0.165)
/**
 * 把一个 marketplace 插件下载缓存并写入安装记录（拒绝不安全的条目路径）。
 */
async function cacheAndRegisterPlugin(e, entry, source, marketplaceInstallLocation, h, y, version) {
  let pluginEntryPath = await resolvePluginEntryPath(
    e,
    marketplaceInstallLocation,
    source,
    h,
    tryUnwrapTextPayload(),
    version,
  );
  let { entryPath, reason } = y
    ? entryPathOrReason(pluginEntryPath)
    : entryPathOrReasonLenient(pluginEntryPath);
  if (entryPath === undefined) {
    logForDebugging(`Skipping ${jsonStringify(e)}: ${reason} (refused, not probed)`, {
      level: "warn",
    });
    return;
  }
  let manifestVersion = await readManifestVersion(entryPath, e, version);
  let Z =
    pluginEntryPath.kind === "ok" ||
    pluginEntryPath.kind === "location-missing" ||
    pluginEntryPath.kind === "location-error"
      ? pluginEntryPath.marketplaceDir
      : entryPath;
  let cacheResult = await probePluginGitHead(entryPath, Z);
  let ke = cacheResult.repo ? (cacheResult.sha ?? undefined) : undefined;
  let we = !cacheResult.repo && parsePluginIdentifier(e).marketplace === CLAUDE_PLUGINS_OFFICIAL;
  let Ee = we ? await marketplaceCommitSha(entryPath) : null;
  let Ae = ke ?? Ee ?? undefined;
  if (manifestVersion === "unknown" && entry.version) manifestVersion = entry.version;
  if (manifestVersion === "unknown" && Ae) manifestVersion = Ae.substring(0, 12);
  if (manifestVersion === "unknown") {
    let Me = we ? (Ee ?? null) : await pluginVersionOrNull(entryPath);
    if (Me) manifestVersion = Me.substring(0, 12);
  }
  let tempPath = getVersionedCachePath(e, manifestVersion);
  if (y) {
    try {
      tempPath = await copyPluginToVersionedCache(
        entryPath,
        e,
        manifestVersion,
        entry,
        marketplaceInstallLocation,
        {
          storageV5: isStorageV5Enabled() ? version : undefined,
        },
      );
    } catch (error) {
      logForDebugging(
        `Cannot materialize versioned cache for ${e} from ${entryPath}: ${errorMessage(error)}, skipping`,
      );
      try {
        let We = strictCacheAddressable(version);
        if (
          (!We ||
            ((await versionParentContained(tempPath)) && (await classifyCacheEntry(tempPath)) === "other")) &&
          !(await cacheDirHasPluginContentStrict(tempPath, version)) &&
          !(
            We &&
            (await isPluginVersionInUse(
              tempPath,
              {
                excludeSelf: true,
              },
              version,
            ).catch(() => true))
          )
        )
          if (We) await removeVersionDirIfIdle(tempPath);
          else
            await getFsImplementation().rm(tempPath, {
              recursive: true,
              force: true,
            });
      } catch {}
      return;
    }
    if (!(await pluginInstallPathExists(tempPath, version))) {
      logForDebugging(
        `Cannot materialize versioned cache for ${e}: no readable plugin payload at ${tempPath}, skipping`,
      );
      return;
    }
  }
  return {
    installPath: tempPath,
    version: manifestVersion,
    gitCommitSha: Ae,
    keepStoredCommit: (cacheResult.repo && cacheResult.sha === null) || (we && Ee === undefined),
  };
}
//@ chunk-e6aww6q8.js:4366714-4366773 placement = getVersionedZipCachePath (1)
/**
 * 安装路径是否存在（zip 查文件，目录查缓存完整）。
 */
function pluginInstallPathExists(pluginId, version) {
  return pluginId.endsWith(".zip") ? pathExists(pluginId) : cacheDirHasPluginContentStrict(pluginId, version);
}
//@ chunk-e6aww6q8.js:4366773-4366842 placement
/**
 * bindingKeysFor：找绑定键与其值。
 */
function bindingKeysFor(plugins, n) {
  return findBindingKeysFor(Object.keys(plugins), n).map((r) => [r, plugins[r] ?? []]);
}
//@ chunk-e6aww6q8.js:4366842-4366922 placement
/**
 * pluginBindingValues：绑定的插件名列表。
 */
function pluginBindingValues(plugins, n) {
  let r = bindingKeysFor(plugins, n);
  return r.length === 0 ? undefined : r.flatMap(([, s]) => s);
}
//@ chunk-e6aww6q8.js:4366922-4367185 placement
/**
 * 同目录名插件绑定到不同仓库时返回冲突者。
 */
function findDataDirConflictingRecord(e, n, r, source) {
  let h = samePluginSource(source, undefined);
  let y = (w) => w !== undefined && parseRepoWithRef(w) !== h;
  let found = uniq([...findBindingKeysFor(Object.keys(e), r), ...findBindingKeysFor(n.keys(), r)]).find(
    (w) => (e[w] ?? []).some((L) => y(L.directoryRepositoryKey)) || y(n.get(w)),
  );
  return found === undefined || found === r
    ? undefined
    : {
        id: found,
        installed: (e[found]?.length ?? 0) > 0,
      };
}
//@ chunk-e6aww6q8.js:4367185-4367294 placement
/**
 * 官方插件目录插件的仓库与当前来源不同。
 */
function isDirectoryRepositoryChanged(e, n, source, s) {
  {
    if (isUnboundOfficialPlugin(e, n, s)) return true;
    let h = samePluginSource(source, undefined);
    return getBoundRepositoryKeys(e, n, s).some((y) => y !== h);
  }
  return false;
}
//@ chunk-e6aww6q8.js:4367294-4367426 placement
/**
 * 官方插件目录插件且尚无仓库绑定。
 */
function isUnboundOfficialPlugin(e, n, r, s = false) {
  if (!e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) || !isUnreadableBindings(r)) return false;
  return s || (n ?? []).every((h) => h.directoryRepositoryKey === undefined);
}
//@ chunk-e6aww6q8.js:4367426-4367596 placement
/**
 * 官方插件目录插件已记录的仓库键。
 */
function getBoundRepositoryKeys(e, n, r) {
  if (!e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) return [];
  return [
    ...(n ?? []).flatMap((s) => s.directoryRepositoryKey ?? []),
    ...findBindingKeysFor(r.keys(), e).flatMap((s) => r.get(s) ?? []),
  ].map(parseRepoWithRef);
}
//@ chunk-e6aww6q8.js:4367596-4367739 placement
async function parsePluginIdSafe(e, n, r, s) {
  try {
    return await parsePluginId(e, n, r, s);
  } catch (error) {
    logForDebugging(`Cannot judge ${e} managed record: ${errorMessage(error)}, leaving it as is`);
    return true;
  }
}
//@ chunk-e6aww6q8.js:4367739-4368179 placement
async function parsePluginId(e, { installPath, claudeaiPluginId }, version, h) {
  if (claudeaiPluginId !== undefined) return true;
  let { absolute, suspect } = classifyMarketplacePath(installPath);
  if (suspect) return false;
  if (await pluginInstallPathExists(absolute, version)) return true;
  if (
    getPluginSeedDirs().length > 0 &&
    (await probeSeedForPlugin(e, basename(absolute).replace(/\.zip$/, ""), "always")) !== null
  )
    return true;
  let w = await h();
  if (isKnownMarketplacesReadFailure(w)) return true;
  let { marketplace } = parsePluginIdentifier(e);
  let source = marketplace ? w[marketplace]?.source : undefined;
  if (source === undefined) return false;
  if (isClaudeAiMarketplaceSource(source)) return true;
  if (!isLocalMarketplaceSource(source)) return false;
  return typeof (await getPluginByIdCacheOnly(e, version))?.entry?.source === "string";
}
//@ chunk-e6aww6q8.js:4368179-4368533 placement
/**
 * 托管记录缺失缓存时从市场重新缓存注册。
 */
async function healManagedRecord(e, n, r) {
  try {
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(e, r);
    if (!pluginByIdCacheOnly || typeof pluginByIdCacheOnly.entry.source !== "string") return;
    let { marketplace } = parsePluginIdentifier(e);
    let source = marketplace ? n?.[marketplace]?.source : undefined;
    if (
      isPluginBlockedByPolicy(e) ||
      isSourceDisallowedOrUnverifiable(source) ||
      isLocalMarketplaceEntry(pluginByIdCacheOnly.entry.source, source)
    )
      return;
    return await cacheAndRegisterPlugin(
      e,
      pluginByIdCacheOnly.entry,
      pluginByIdCacheOnly.entry.source,
      pluginByIdCacheOnly.marketplaceInstallLocation,
      n,
      true,
      r,
    );
  } catch (error) {
    logForDebugging(`Cannot heal ${e} managed record: ${errorMessage(error)}, leaving it as is`);
    return;
  }
}
//@ chunk-e6aww6q8.js:4368533-4368762 placement
function mergePreviousProducerPaths(e, n) {
  let r = e.sourceProducerPath !== undefined && e.sourceProducerPath !== n ? [e.sourceProducerPath] : [];
  return [...(e.previousProducerPaths ?? []).filter((s) => s !== e.sourceProducerPath && s !== n), ...r]
    .filter((s) => s !== "")
    .slice(-MAX_PREVIOUS_PRODUCER_PATHS);
}
//@ chunk-e6aww6q8.js:4431505-4431671 fingerprint = validatePathWithinBase (1)
/**
 * 解析 base 下的相对路径，越界抛“Path traversal detected”。
 */
function validatePathWithinBase(basePath, relativePath) {
  let resolvedPath = resolve_2(basePath, relativePath);
  let normalizedBase = resolve_2(basePath) + sep;
  if (!resolvedPath.startsWith(normalizedBase) && resolvedPath !== resolve_2(basePath))
    throw Error(`Path traversal detected: "${relativePath}" would escape the base directory`);
  return resolvedPath;
}
//@ chunk-e6aww6q8.js:4450972-4451911 fingerprint = formatResolutionError (0.713)
/**
 * 依赖解析错误转文本：依赖环、跨市场依赖不被允许（提示 allowCrossMarketplaceDependenciesOn）、依赖找不到等。
 */
function formatResolutionError(r_2) {
  switch (r_2.reason) {
    case "cycle":
      return `Dependency cycle: ${r_2.chain.map(displaySafePluginId).join(" \u2192 ")}`;
    case "cross-marketplace": {
      let depMkt = parsePluginIdentifier(r_2.dependency).marketplace;
      let r = depMkt ? quoteName(displaySafeName(depMkt, MAX_DISPLAY_NAME_LENGTH)) : undefined;
      let where = r ? `marketplace ${r}` : "a different marketplace";
      let hint = r
        ? ` Add ${r} to allowCrossMarketplaceDependenciesOn in the ROOT marketplace's marketplace.json (the marketplace of the plugin you're installing \u2014 only its allowlist applies; no transitive trust).`
        : "";
      return `Dependency ${quoteName(displaySafePluginId(r_2.dependency))} (required by ${displaySafePluginId(r_2.requiredBy)}) is in ${where}, which is not in the allowlist \u2014 cross-marketplace dependencies are blocked by default. Install it manually first.${hint}`;
    }
    case "not-found": {
      let { marketplace: depMkt } = parsePluginIdentifier(r_2.missing);
      let r = quoteName(displaySafePluginId(r_2.missing));
      let s = displaySafePluginId(r_2.requiredBy);
      return depMkt
        ? `Dependency ${r} (required by ${s}) not found. Is the ${quoteName(displaySafeName(depMkt, MAX_DISPLAY_NAME_LENGTH))} marketplace added?`
        : `Dependency ${r} (required by ${s}) not found in any configured marketplace`;
    }
  }
}
//@ chunk-e6aww6q8.js:4462968-4478634 callgraph-witnessed = installResolvedPlugin (0.121)
/**
 * 安装已解析好的插件（核心安装流程）：解析依赖闭包、逐个缓存（cachePlugin+copyPluginToVersionedCache）、写安装记录与 enabledPlugins、处理 command 来源同意、userConfig、失败回滚；返回安装结果与依赖信息。
 */
async function installResolvedPlugin({
  pluginId,
  entry,
  scope,
  marketplaceInstallLocation,
  trigger,
  explicit,
  consentedEntryHelper,
  auto,
  requiredByEnabledDependent,
  commandSourceConsent,
  replaceInstalledCopy,
  replaceOnlyPluginIds,
  switchTargetMarkedInItsOwnWalk,
  switchWalkNotFresh,
  storageV5,
  gitHubHttpsFallback,
}) {
  let settingSource = scopeToSettingSource(scope);
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    return {
      ok: false,
      reason: "installed-list-held",
      held: installedListRefusal,
    };
  let Me = await checkInstallAllowed(pluginId, entry, storageV5);
  if (!Me.ok) return Me.refusal;
  let { knownMarketplaces, failClosedOnUnknownSource } = Me;
  let [lt, ...Je] =
    isPluginDirectoryAvailable() && !auto && !requiredByEnabledDependent
      ? await describeOtherMarketplaceInstalls(pluginId, entry, knownMarketplaces, storageV5)
      : [];
  let nt = lt ? [lt, ...Je] : undefined;
  if (nt && replaceInstalledCopy && switchWalkNotFresh !== undefined)
    return {
      ok: false,
      reason: "switch-needs-fresh-listing",
      pluginName: entry.name,
      detail: switchWalkNotFresh,
      installedCopies: nt,
    };
  if (
    replaceInstalledCopy &&
    (await resolveDelistedPluginId(replaceOnlyPluginIds, nt ?? [], storageV5)).length > 0
  )
    return {
      ok: false,
      reason: "fewer-installed-than-shown",
      pluginName: entry.name,
    };
  let pt =
    nt && replaceInstalledCopy
      ? findOtherMarketplaceInstallBlocker(pluginId, nt, replaceOnlyPluginIds, switchTargetMarkedInItsOwnWalk)
      : undefined;
  if (pt?.reason === "more-installed-than-shown")
    return {
      ok: false,
      reason: "more-installed-than-shown",
      pluginName: entry.name,
    };
  if (nt && (!replaceInstalledCopy || pt !== undefined))
    return {
      ok: false,
      reason: "installed-from-other-marketplace",
      pluginName: entry.name,
      installedCopies: nt,
    };
  let depInfo = new Map();
  if (isRelativeSourcePath(entry.source) && !marketplaceInstallLocation)
    return {
      ok: false,
      reason: "local-source-no-location",
      pluginName: entry.name,
    };
  if (marketplaceInstallLocation)
    depInfo.set(pluginId, {
      entry,
      marketplaceInstallLocation,
    });
  let rootMarketplace = parsePluginIdentifier(pluginId).marketplace;
  let allowedCrossMarketplaces = new Set(
    (rootMarketplace
      ? (await getMarketplaceCacheOnly(rootMarketplace, storageV5))?.allowCrossMarketplaceDependenciesOn
      : undefined) ?? [],
  );
  let At = scope !== "user" ? getCwd() : undefined;
  let plugins = (
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
  ).plugins;
  let alreadyEnabled = new Set();
  for (let nr of getEnabledPluginIdsInSource(settingSource))
    if (installationAtTarget(plugins[nr], scope, At) !== undefined) alreadyEnabled.add(nr);
  let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5);
  let combined = allPluginsCacheOnly.enabled.concat(allPluginsCacheOnly.disabled);
  let rn = new Map();
  for (let nr of combined) rn.set(nr.source, nr.resolvedVersion ?? nr.manifest.version);
  let enabledPlugins = getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins;
  let no = new Set();
  for (let nr of combined) {
    if (!nr.depConstraints) continue;
    for (let [Ti, Vs] of nr.depConstraints) {
      if (Vs.version === undefined) continue;
      let _i = qualifyDependency(Ti, nr.source);
      if (Array.isArray(enabledPlugins?.[_i])) continue;
      if (
        isPluginBlockedByPolicy(_i) ||
        findBlockedMarketplace(_i, knownMarketplaces, {
          failClosedOnUnknownSource,
        })
      ) {
        logForDebugging(
          `installResolvedPlugin: ${_i} version-unsatisfied but policy-blocked; not force-including`,
        );
        continue;
      }
      if (!versionSatisfies(rn.get(_i), Vs.version)) {
        if (isPluginDirectoryMarketplace(_i, knownMarketplaces)) {
          let jo = depInfo.get(_i) ?? (await getPluginById(_i, storageV5, "update"));
          let orgBlockedPlugins = await collectOrgBlockedPlugins(storageV5);
          if (
            jo
              ? isListingBlocked(jo.entry, orgBlockedPlugins)
              : orgBlockedPlugins !== null || isListingRepositoryBlockedByHostPolicy(undefined)
          ) {
            logForDebugging(
              `installResolvedPlugin: ${_i} version-unsatisfied but a policy-blocked copy, or unlisted while a block stands; not force-including`,
            );
            continue;
          }
          if (jo) depInfo.set(_i, jo);
        }
        no.add(_i);
      }
    }
  }
  let dependencyClosure = await resolveDependencyClosure(
    pluginId,
    async (id) => {
      if (depInfo.has(id)) return depInfo.get(id).entry;
      if (id === pluginId) return entry;
      let info = await getPluginById(id, storageV5, no.has(id) ? "update" : "install");
      if (info) depInfo.set(id, info);
      return info?.entry ?? null;
    },
    alreadyEnabled,
    allowedCrossMarketplaces,
    no,
  );
  if (!dependencyClosure.ok)
    return {
      ok: false,
      reason: "resolution-failed",
      resolution: dependencyClosure,
    };
  let found = dependencyClosure.closure.find((id) => !isRecordablePluginId(id));
  if (found !== undefined)
    return {
      ok: false,
      reason: "unrecordable-plugin-id",
      pluginId: found,
    };
  for (let nr of dependencyClosure.closure) {
    if (nr === pluginId || alreadyEnabled.has(nr)) continue;
    if (isPluginBlockedByPolicy(nr))
      return {
        ok: false,
        reason: "dependency-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: nr,
      };
    let info = await pluginDirectoryUnavailableReason(nr);
    if (info !== null)
      return {
        ok: false,
        reason: "plugin-directory-unavailable",
        pluginName: entry.name,
        cause: info,
        unavailableDependency: nr,
      };
    let blockedMarketplace = findBlockedMarketplace(nr, knownMarketplaces, {
      failClosedOnUnknownSource,
    });
    if (blockedMarketplace)
      return {
        ok: false,
        reason: "dependency-marketplace-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: nr,
        marketplaceName: blockedMarketplace,
      };
    let entry_2 = depInfo.get(nr)?.entry;
    if (
      entry_2 !== undefined &&
      (await isListingUsableForMarketplace(nr, entry_2, knownMarketplaces, storageV5))
    )
      return {
        ok: false,
        reason: "dependency-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: nr,
      };
  }
  let plugins_2 = (
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
  ).plugins;
  let sharedStorageConflict = findSharedStorageConflict(
    dependencyClosure.closure,
    dependencyClosure.closure,
    plugins_2,
  );
  if (sharedStorageConflict !== null)
    return {
      ok: false,
      reason: "plugin-folder-held",
      ...sharedStorageConflict,
      rootKept: false,
    };
  let Xn = {
    ...(getSettingsForSourceWriteSeed(settingSource)?.enabledPlugins ?? {}),
  };
  let fo = {};
  for (let nr of getEnabledSettingSources())
    Object.assign(fo, getSettingsForSource(nr)?.enabledPlugins ?? {});
  let explicitAnywhere = new Set(Object.keys(fo).filter((key) => fo[key] !== undefined));
  let rootRequiredByDependent =
    requiredByEnabledDependent === true ||
    combined.some((nr) => {
      if (nr.source === pluginId) return false;
      let Ti = fo[nr.source];
      return (
        (Ti !== undefined ? Ti === true || Array.isArray(Ti) : nr.manifest.defaultEnabled !== false) &&
        (nr.manifest.dependencies ?? []).some((_i) =>
          dependencyRefMatches(qualifyDependency(_i, nr.source), pluginId, nr.source),
        )
      );
    });
  function vn(nr) {
    return nr === pluginId ? entry : depInfo.get(nr)?.entry;
  }
  let co = new Map();
  let So = new Map();
  for (let id of dependencyClosure.closure) {
    let Ti = vn(id);
    co.set(id, Ti?.defaultEnabled ?? true);
    So.set(
      id,
      (Ti?.dependencies ?? []).map((Vs) => qualifyDependency(Vs, id)),
    );
  }
  let dependencyEnablement = computeDependencyEnablement({
    closure: dependencyClosure.closure,
    rootId: pluginId,
    rootRequiredByDependent,
    priorEnabled: Xn,
    explicitAnywhere,
    defaultsById: co,
    dependenciesById: So,
  });
  let un = new Map();
  let ao = {};
  for (let id of dependencyClosure.closure) {
    let Ti = Xn[id];
    ao[id] = Array.isArray(Ti) ? Ti : (dependencyEnablement.get(id) ?? true);
    un.set(id, ao[id]);
  }
  let { error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (nr) => ({
      enabledPlugins: {
        ...nr?.enabledPlugins,
        ...ao,
      },
    }),
    undefined,
    storageV5,
  );
  if (error)
    return {
      ok: false,
      reason: "settings-write-failed",
      message: error.message,
    };
  async function yo(nr, Ti) {
    if (!isRelativeSourcePath(Ti.entry.source)) return;
    let { entryPath, reason } = entryPathOrReason(
      await resolvePluginEntryPath(
        nr,
        Ti.marketplaceInstallLocation,
        Ti.entry.source,
        knownMarketplaces,
        tryUnwrapTextPayload(),
        storageV5,
      ),
    );
    if (entryPath === undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot install ${printableName(nr, 120)}: ${reason}`,
        "plugin install marketplace entry path refused",
      );
    return entryPath;
  }
  let Ho = new Map();
  let rr = new Map();
  let br = new Set();
  let Hr = false;
  let closure = dependencyClosure.closure;
  async function cs() {
    for (let [nr, Ti] of Ho) {
      Ho.delete(nr);
      let { records = [], recordedAt } = rr.get(nr) ?? {};
      let jo = installationAtTarget(
        (isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync()
        ).plugins[nr],
        scope,
        At,
      );
      let Qr = installationAtTarget(records, scope, At);
      let fi = (auto === true || nr !== pluginId) && (Qr === undefined || Qr.auto === true);
      let Ri = {
        installPath: Ti,
        lastUpdated: recordedAt ?? jo?.lastUpdated,
        ...(fi && {
          auto: true,
        }),
      };
      if (
        jo !== undefined &&
        (jo.installPath !== Ti ||
          (recordedAt !== undefined && jo.lastUpdated !== recordedAt) ||
          (fi && jo.auto !== true))
      ) {
        br.add(nr);
        continue;
      }
      if (Qr !== undefined) {
        if (jo !== undefined && !(await restoreEarlierInstallRecord(nr, Qr, Ri, storageV5))) br.add(nr);
        continue;
      }
      if ((await removePluginInstallation(nr, scope, At, storageV5, Ri)) === false) {
        br.add(nr);
        continue;
      }
      Hr ||= nr === pluginId;
      if (records.length === 0) await markPluginVersionOrphaned(Ti, storageV5);
    }
  }
  async function _r() {
    let nr = {};
    for (let jo of closure) {
      if (br.has(jo)) continue;
      nr[jo] =
        jo === pluginId && Ho.has(jo) && !Array.isArray(Xn[jo])
          ? (dependencyEnablement.get(pluginId) ?? true)
          : Xn[jo];
    }
    let { [pluginId]: Ti, ...Vs } = nr;
    let { error } = await updateSettingsForSourceWithTransform(
      settingSource,
      (jo) => ({
        enabledPlugins: Hr && jo?.enabledPlugins?.[pluginId] !== un.get(pluginId) ? Vs : nr,
      }),
      {
        legacyRevocation: "skip",
      },
      storageV5,
    );
    if (error)
      logForDebugging(
        `Failed to roll back enabledPlugins after install failure for ${pluginId}: ${error.message}. Retry may skip un-cached deps; manually disable then reinstall to recover.`,
        {
          level: "error",
        },
      );
  }
  let Cr;
  let Vr = new Map();
  let Oo = new Map();
  let jr = [];
  let Or = new Set();
  let Io = [];
  try {
    if (!depInfo.has(pluginId)) {
      let marketplaceInstallLocation = (await getPluginById(pluginId, storageV5, "install"))
        ?.marketplaceInstallLocation;
      if (marketplaceInstallLocation)
        depInfo.set(pluginId, {
          entry,
          marketplaceInstallLocation,
        });
    }
    let nr = new Set(closure);
    let { ranges, requirers } = collectDependencyVersionRanges(combined, nr);
    let _i = new Map();
    let jo = new Map();
    async function Qr(reason) {
      switch (reason) {
        case "directory-pin-unsatisfied":
          await cs();
          break;
        case "range-conflict":
        case "no-matching-tag":
        case "plugin-folder-held":
          if (
            auto ||
            requiredByEnabledDependent ||
            Xn[pluginId] !== undefined ||
            rr.get(pluginId)?.records.length !== 0
          )
            break;
          try {
            for (let key of Ho.keys()) if (rr.get(key)?.records.length !== 0) Ho.delete(key);
            await cs();
          } catch (error) {
            logError(error);
            logForDebugging(
              `What the failed install of ${pluginId} installed was not all taken out: ${errorMessage(error)}. Run \`claude plugin uninstall\` for it to recover.`,
              {
                level: "warn",
              },
            );
          }
          break;
        case "directory-binding-unreadable":
        case "directory-identity-changed":
          break;
      }
      await _r();
    }
    async function fi(Di) {
      let yr = depInfo.get(Di);
      if (!yr)
        return {
          ok: true,
          dependencies: undefined,
        };
      let Kr = [...(_i.get(Di) ?? []), ...(ranges.get(Di) ?? [])];
      let Li;
      let entry = yr.entry;
      let Hi;
      if (Kr.length > 0) {
        let ta = intersectVersionConstraints(Kr);
        if (!ta.ok)
          return {
            ok: false,
            reason: "range-conflict",
            dep: Di,
            ranges: Kr,
            why: ta.reason,
          };
        if (Di.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) Hi = ta.range === "*" ? undefined : ta.range;
        else if (ta.range !== "*") {
          let pluginCloneUrl = getPluginCloneUrl(yr.entry.source);
          let source = knownMarketplaces[parsePluginIdentifier(Di).marketplace ?? ""]?.source;
          let tu = pluginCloneUrl === null && typeof yr.entry.source === "string";
          let pd = tu ? getMarketplaceCloneUrl(source) : pluginCloneUrl;
          if (pd !== null) {
            let versionRange = await resolveVersionRange(pd, yr.entry.name, ta.range, jo);
            if (versionRange === null && !tu)
              return {
                ok: false,
                reason: "no-matching-tag",
                dep: Di,
                range: ta.range,
              };
            if (versionRange === null)
              logForDebugging(
                `materializeOne(${Di}): no ${yr.entry.name}--v* tag satisfying ${ta.range} on marketplace repo; falling through to HEAD copy`,
              );
            else {
              Li = versionRange;
              if (tu && typeof yr.entry.source === "string") {
                let relativePluginSource = toRelativePluginSource(source, yr.entry.source);
                if (relativePluginSource !== null)
                  entry = {
                    ...yr.entry,
                    source: relativePluginSource,
                  };
              }
            }
          }
        }
      }
      let Xa = await installPluginWithRecords(
        Di,
        entry,
        scope,
        At,
        await yo(Di, {
          ...yr,
          entry,
        }),
        Li,
        auto === true || Di !== pluginId,
        yr.marketplaceInstallLocation,
        marketplaceSourceOfEntry(Di, knownMarketplaces),
        Di === pluginId && auto !== true
          ? commandSourceConsent
          : {
              kind: "none",
              pluginId: Di,
            },
        storageV5,
        {
          explicitInstall: explicit && Di === pluginId,
          consented: Di === pluginId ? consentedEntryHelper : undefined,
        },
        undefined,
        Hi,
        Di !== pluginId && alreadyEnabled.has(Di) ? undefined : gitHubHttpsFallback,
      ).catch((error) => {
        if (
          error instanceof PinnedVersionMismatchError ||
          error instanceof PluginCachePublishError ||
          error instanceof PluginFolderHeldError
        )
          return error;
        throw error;
      });
      if (Xa instanceof PluginFolderHeldError)
        return {
          ok: false,
          reason: "plugin-folder-held",
          pluginId: Di,
          sharedWith: "installed",
          holders: Xa.holders,
        };
      if (Xa instanceof PluginCachePublishError)
        return {
          ok: false,
          reason: Xa.reason,
          dep: Di,
          message: Xa.message,
        };
      if (Xa instanceof PinnedVersionMismatchError)
        return {
          ok: false,
          reason: "directory-pin-unsatisfied",
          dep: Di,
          message: `"${printableName(yr.entry.name, 120)}" from the ${OFFICIAL_MARKETPLACE_DISPLAY} is pinned to its listed commit (${Xa.manifestVersion ? `version ${printableName(Xa.manifestVersion, 120)}` : "no version"}), which does not satisfy ${printableName(Kr.join(", "), 120)} required by ${(requirers.get(Di) ?? []).map((ta) => `"${printableName(parsePluginIdentifier(ta).name, 120)}"`).join(", ")}.`,
        };
      Ho.set(Di, Xa.path);
      rr.set(Di, {
        records: Xa.recordsBefore,
        recordedAt: Xa.recordedAt,
      });
      Vr.set(Di, Xa.defaultEnabled);
      Oo.set(Di, Xa.dependencies ?? []);
      for (let [ta, Bs] of Xa.depConstraints ?? []) {
        if (Bs.version === undefined) continue;
        let Ca = qualifyDependency(ta, Di);
        requirers.set(Ca, [...(requirers.get(Ca) ?? []), Di]);
        let tu = _i.get(Ca);
        if (tu) tu.push(Bs.version);
        else _i.set(Ca, [Bs.version]);
      }
      return {
        ok: true,
        dependencies: Xa.dependencies ?? [],
      };
    }
    for (let idx = dependencyClosure.closure.length - 1; idx >= 0; idx--) {
      let yr = dependencyClosure.closure[idx];
      if (yr === undefined) continue;
      let Kr = yr !== pluginId && alreadyEnabled.has(yr);
      let Li;
      try {
        Li = await fi(yr);
      } catch (error) {
        if (Kr) {
          logForDebugging(
            `installResolvedPlugin: force-included ${yr} fetch threw (${error instanceof Error ? error.message : String(error)}); skipping (pinner stays demoted)`,
          );
          continue;
        }
        throw error;
      }
      if (!Li.ok) {
        if (Kr) {
          logForDebugging(
            Li.reason === "range-conflict"
              ? `installResolvedPlugin: force-included ${yr} has disjoint pinner ranges ${Li.ranges.join(", ")}; skipping (pinner stays demoted)`
              : Li.reason === "no-matching-tag"
                ? `installResolvedPlugin: force-included ${yr} has no tag satisfying ${Li.range}; skipping (pinner stays demoted)`
                : Li.reason === "directory-binding-unreadable" ||
                    Li.reason === "directory-identity-changed" ||
                    Li.reason === "plugin-folder-held"
                  ? `installResolvedPlugin: force-included ${yr} was refused before any fetch (${Li.reason}); skipping (pinner stays demoted)`
                  : `installResolvedPlugin: force-included ${yr} is pinned to a listed commit outside the required range; skipping (pinner stays demoted)`,
          );
          continue;
        }
        await Qr(Li.reason);
        return Li.reason === "plugin-folder-held"
          ? {
              ...Li,
              rootKept: Ho.has(pluginId),
            }
          : Li;
      }
      for (let Qs of Li.dependencies ?? []) Or.add(qualifyDependency(Qs, yr));
      if (yr === pluginId) Cr = Li.dependencies;
    }
    let Ri = new Set((Cr ?? []).map((Di) => qualifyDependency(Di, pluginId)));
    for (let [Di, yr] of _i) {
      if (nr.has(Di) || (no.has(Di) && Ri.has(Di)) || !alreadyEnabled.has(Di)) continue;
      let combined = yr.concat(ranges.get(Di) ?? []);
      let Li = intersectVersionConstraints(combined);
      if (!Li.ok) {
        await Qr("range-conflict");
        return {
          ok: false,
          reason: "range-conflict",
          dep: Di,
          ranges: combined,
          why: Li.reason,
        };
      }
      let info = rn.get(Di);
      if (Li.range !== "*" && !versionSatisfies(info, Li.range)) {
        let Hi =
          requirers.get(Di)?.includes(pluginId) === true &&
          !Array.isArray(enabledPlugins?.[Di]) &&
          !isPluginBlockedByPolicy(Di) &&
          !findBlockedMarketplace(Di, knownMarketplaces, {
            failClosedOnUnknownSource,
          });
        if (Hi) await _r();
        else await Qr("range-conflict");
        return {
          ok: false,
          reason: "range-conflict",
          dep: Di,
          ranges: combined,
          why: "installed-unsatisfied",
          installed: info,
          suggestDependencyUpdate: Hi,
        };
      }
    }
    let Ja = [
      {
        manifestDeps: Cr,
        declaringId: pluginId,
      },
    ];
    while (Ja.length > 0) {
      let Di = [];
      for (let { manifestDeps, declaringId } of Ja) {
        for (let Bs of manifestDeps ?? []) Or.add(qualifyDependency(Bs, declaringId));
        let ta = await autoInstallPluginDependencies({
          rootManifestDeps: manifestDeps,
          pluginId: declaringId,
          closureSet: nr,
          alreadyEnabled,
          forceInclude: no,
          rootMarketplace,
          allowedCrossMarketplaces,
          knownMarketplaces,
          failClosedOnUnknownSource,
          depInfo,
          storageV5,
        });
        if (!ta.ok) {
          await _r();
          if (ta.blockedMarketplace)
            return {
              ok: false,
              reason: "dependency-marketplace-blocked-by-policy",
              pluginName: entry.name,
              blockedDependency: ta.blockedDependency,
              marketplaceName: ta.blockedMarketplace,
            };
          return {
            ok: false,
            reason: "dependency-blocked-by-policy",
            pluginName: entry.name,
            blockedDependency: ta.blockedDependency,
          };
        }
        jr.push(...ta.notFound.filter((Bs) => !allPluginsCacheOnly.enabled.some((Ca) => Ca.source === Bs)));
        for (let id of ta.ids) {
          if (nr.has(id)) continue;
          nr.add(id);
          closure.push(id);
          Di.push(id);
        }
      }
      if (Di.length === 0) break;
      let sharedStorageConflict = findSharedStorageConflict(Di, closure, plugins_2);
      if (sharedStorageConflict !== null) {
        await Qr("plugin-folder-held");
        return {
          ok: false,
          reason: "plugin-folder-held",
          ...sharedStorageConflict,
          rootKept: Ho.has(pluginId),
        };
      }
      let Kr = {};
      for (let Hi of Di) {
        Kr[Hi] = true;
        un.set(Hi, true);
      }
      let { error } = await updateSettingsForSourceWithTransform(
        settingSource,
        (Hi) => ({
          enabledPlugins: {
            ...Hi?.enabledPlugins,
            ...Kr,
          },
        }),
        undefined,
        storageV5,
      );
      if (error) {
        await _r();
        return {
          ok: false,
          reason: "settings-write-failed",
          message: error.message,
        };
      }
      let Qs = [];
      for (let Hi of Di) {
        let Xa = alreadyEnabled.has(Hi);
        let ta;
        try {
          ta = await fi(Hi);
        } catch (error) {
          if (Xa) {
            logForDebugging(
              `installResolvedPlugin: force-included ${Hi} fetch threw (${error instanceof Error ? error.message : String(error)}); skipping (pinner stays demoted)`,
            );
            continue;
          }
          throw error;
        }
        if (!ta.ok) {
          if (Xa) {
            logForDebugging(
              `installResolvedPlugin: force-included ${Hi} ${ta.reason}; skipping (pinner stays demoted)`,
            );
            continue;
          }
          await Qr(ta.reason);
          return ta.reason === "plugin-folder-held"
            ? {
                ...ta,
                rootKept: Ho.has(pluginId),
              }
            : ta;
        }
        Qs.push({
          manifestDeps: ta.dependencies,
          declaringId: Hi,
        });
      }
      Ja = Qs;
    }
  } catch (error) {
    await _r();
    throw error;
  }
  if (Cr !== undefined) {
    let nr = new Set(Cr.map((Ti) => qualifyDependency(Ti, pluginId)));
    for (let Ti of entry.dependencies ?? []) {
      let Vs = qualifyDependency(Ti, pluginId);
      if (!nr.has(Vs))
        logForDebugging(
          `Marketplace entry for ${pluginId} lists dependency "${Ti}" not present in plugin.json \u2014 catalog may be stale`,
        );
    }
  }
  let zo = new Map();
  let rs = new Map();
  for (let nr of closure) {
    let Ti = vn(nr);
    zo.set(nr, Ti?.defaultEnabled ?? Vr.get(nr) ?? true);
    let mapped = (Ti?.dependencies ?? []).map((_i) => qualifyDependency(_i, nr));
    for (let _i of Oo.get(nr) ?? []) mapped.push(qualifyDependency(_i, nr));
    rs.set(nr, mapped);
  }
  let dependencyEnablement_2 = computeDependencyEnablement({
    closure,
    rootId: pluginId,
    rootRequiredByDependent,
    priorEnabled: Xn,
    explicitAnywhere,
    defaultsById: zo,
    dependenciesById: rs,
  });
  let Nr = {};
  for (let nr of closure) {
    let Ti = Xn[nr];
    let Vs = dependencyEnablement_2.get(nr) ?? true;
    if (Ti !== undefined && Ti !== Vs) continue;
    if (un.get(nr) !== Vs) Nr[nr] = Vs;
  }
  let Is = true;
  if (Object.keys(Nr).length > 0) {
    let { error } = await updateSettingsForSourceWithTransform(
      settingSource,
      (Ti) => ({
        enabledPlugins: {
          ...Ti?.enabledPlugins,
          ...Nr,
        },
      }),
      undefined,
      storageV5,
    );
    if (error) {
      Is = false;
      logForDebugging(`Failed to apply defaultEnabled correction for ${pluginId}: ${error.message}`, {
        level: "warn",
      });
    }
  }
  let enabledSettingSources = getEnabledSettingSources();
  let index = enabledSettingSources.indexOf(settingSource);
  function Vi(nr) {
    for (let idx = enabledSettingSources.length - 1; idx > index; idx--) {
      let mktLocation = getSettingsForSource(enabledSettingSources[idx])?.enabledPlugins?.[nr];
      if (mktLocation !== undefined) return mktLocation === false;
    }
    return false;
  }
  let filtered = closure.filter(
    (nr) => dependencyEnablement_2.get(nr) === false && (Is || un.get(nr) === false),
  );
  let installedDisabled = closure.filter((nr) => filtered.includes(nr) || Vi(nr));
  refreshPluginCaches(storageV5);
  let marketplace = parsePluginIdentifier_2(pluginId).marketplace;
  let wa = isOfficialMarketplaceName_3(marketplace);
  let hr = wa || isToolDetailsLoggingEnabled();
  logOTelEvent("plugin_installed", {
    ...(hr && {
      "plugin.name": entry.name,
    }),
    ...(hr &&
      entry.version && {
        "plugin.version": entry.version,
      }),
    ...(hr &&
      marketplace && {
        "marketplace.name": marketplace,
      }),
    "marketplace.is_official": String(wa),
    ...(trigger && {
      "install.trigger": trigger,
    }),
    ...(filtered.includes(pluginId) && {
      "install.disabled_by_default": "true",
    }),
  });
  if (isPluginDirectoryAvailable() && [...Or].some((nr) => nr.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))) {
    let nr = await bindingsWithReadFailure();
    for (let Ti of Or) {
      let { name: Vs, marketplace } = parsePluginIdentifier(Ti);
      let jo = pluginBindingValues(plugins, Ti);
      if (
        marketplace !== OFFICIAL_MARKETPLACE_NAME ||
        Ho.has(Ti) ||
        (jo?.length ?? 0) === 0 ||
        jr.includes(Ti)
      )
        continue;
      let pluginDirectoryMarketplace = await loadPluginDirectoryMarketplace(Vs, storageV5);
      if (pluginDirectoryMarketplace === null) continue;
      let found = pluginDirectoryMarketplace.plugins.find((plugin) => plugin.name === Vs);
      if (found === undefined || isDirectoryRepositoryChanged(Ti, jo, found.source, nr)) Io.push(Ti);
    }
  }
  let mi = "";
  if (jr.length > 0) {
    let pluginDirectoryState = await getPluginDirectoryState();
    if (pluginDirectoryState !== "unavailable") {
      let Ti = `@${OFFICIAL_MARKETPLACE_NAME}`;
      let Vs =
        pluginDirectoryState === "off"
          ? `the ${OFFICIAL_MARKETPLACE_DISPLAY} is off`
          : pluginDirectoryState === "blocked"
            ? `the ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization`
            : `the ${OFFICIAL_MARKETPLACE_DISPLAY} could not be read, or does not list it`;
      let _i = uniq(jr);
      let sliced = _i.slice(0, 5);
      let Qr = _i.length - sliced.length;
      mi = `. Warning: ${sliced.map((fi) => `dependency "${quotedPrintable(fi, 120)}" was not installed (${fi.endsWith(Ti) ? Vs : "no marketplace you have added lists it"})`).join("; ")}${Qr > 0 ? `; and ${Qr} more` : ""}. "${quotedPrintable(entry.name, 120)}" will not load without ${plural(_i.length, "it", "them")}`;
    }
  }
  let Ha = "";
  if (Io.length > 0) {
    let depNote = uniq(Io);
    let Ti = depNote.length === 1;
    let joined = depNote
      .slice(0, 5)
      .map((id) => `"${quotedPrintable(id, 120)}"`)
      .join(", ");
    let _i = depNote.length > 5 ? ` and ${depNote.length - 5} more` : "";
    let jo = `"${quotedPrintable(entry.name, 120)}"`;
    Ha = `. Warning: ${Ti ? "dependency" : "dependencies"} ${joined}${_i} ${Ti ? "is" : "are"} installed, but the ${OFFICIAL_MARKETPLACE_DISPLAY}'s current listing will not keep ${Ti ? "it" : "them"} loading, and ${jo} will not load without ${Ti ? "it" : "them"}. Once ${Ti ? "it stops (it may have already)" : "they stop (they may have already)"}, \`claude plugin list\` says why`;
  }
  let depNote = `${formatDependencyCountSuffix([...Ho.keys()].filter((key) => key !== pluginId))}${mi}${Ha}`;
  return {
    ok: true,
    closure: dependencyClosure.closure,
    depNote,
    installedDisabled,
    installedDisabledByDefault: filtered,
    ...(nt && {
      replacedCopies: nt,
    }),
    copiesInOtherProjects:
      isPluginDirectoryAvailable() && scope === "user" && auto !== true
        ? await findOtherProjectInstalls(pluginId, entry, knownMarketplaces, storageV5)
        : [],
  };
}
//@ chunk-e6aww6q8.js:4478634-4478990 layout
/**
 * 记 tengu_plugin_install_failed。
 */
function logInstallFailed({ reason, errorKind, pluginId, entry, marketplaceName, trigger, surface }) {
  logEvent("tengu_plugin_install_failed", {
    reason: fromEnum(reason),
    ...(errorKind && {
      error_kind: fromEnum(errorKind),
    }),
    ...directoryInstallFields({
      pluginId,
      surface,
      replaced: false,
    }),
    ...buildPluginEventFields(entry.name, marketplaceName, policyEnabledPluginNameSet()),
    plugin_id: pluginIdForTelemetry(pluginId),
    trigger: fromEnum(trigger),
    install_source: lit_2(trigger === "hint" ? "ui-suggestion" : "ui-discover"),
    ...(entry.version && {
      version: sanitizeVersion(entry.version),
    }),
  });
}
//@ chunk-e6aww6q8.js:4478990-4483311 fingerprint = installPluginFromMarketplace (0.494)
/**
 * 从市场安装一个插件（界面/推荐用的简化入口）：取条目、调用 installResolvedPlugin，失败记 tengu_plugin_install_failed。
 */
async function installPluginFromMarketplace(e) {
  let { pluginId, entry, marketplaceName, scope = "user", storageV5 } = e;
  let trigger = e.trigger;
  let surface = e.trigger === "hint" ? undefined : e.surface;
  try {
    let pluginInfo = await getInstalledListRefusal(storageV5);
    if (pluginInfo !== undefined)
      return {
        success: false,
        error: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(pluginInfo)}`,
        errorIsOurs: true,
      };
    let marketplaceInstallLocation = (await getPluginById(pluginId, storageV5, "install"))
      ?.marketplaceInstallLocation;
    let result = await installResolvedPlugin({
      pluginId,
      entry,
      scope,
      marketplaceInstallLocation,
      trigger: "ui",
      explicit: e.trigger === "user",
      consentedEntryHelper: e.trigger === "user" ? e.consentedEntryHelper : undefined,
      commandSourceConsent: e.commandSourceConsent,
      storageV5,
    });
    if (!result.ok)
      switch (
        (logInstallFailed({
          reason: result.reason,
          pluginId,
          entry,
          marketplaceName,
          trigger,
          surface,
        }),
        result.reason)
      ) {
        case "local-source-no-location":
          return {
            success: false,
            error: `Cannot install local plugin "${result.pluginName}" without marketplace install location`,
            errorIsOurs: true,
          };
        case "plugin-folder-held":
          return {
            success: false,
            error: findPluginNameCollision({
              ...result,
              refused: result.pluginId,
              askedFor: pluginId,
              surface: "ui",
            }),
            errorIsOurs: true,
          };
        case "unrecordable-plugin-id":
          return {
            success: false,
            error: formatInvalidPluginIdMessage(
              result.pluginId,
              pluginId,
              result.pluginId === pluginId && marketplaceName !== undefined
                ? {
                    pluginName: entry.name,
                    marketplaceName,
                  }
                : undefined,
            ),
            errorIsOurs: true,
          };
        case "installed-list-held":
          return {
            success: false,
            error: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(result.held)}`,
            errorIsOurs: true,
          };
        case "settings-write-failed":
          return {
            success: false,
            error: `Failed to update settings: ${result.message}`,
            errorIsOurs: true,
          };
        case "resolution-failed":
          return {
            success: false,
            error: formatResolutionError(result.resolution),
            errorIsOurs: true,
          };
        case "installed-from-other-marketplace":
          return {
            success: false,
            error: installFromOtherMarketplace(pluginId, result.pluginName, result.installedCopies, "ui"),
            errorIsOurs: true,
          };
        case "more-installed-than-shown":
          return {
            success: false,
            error: formatMoreInstallsThanShownMessage(result.pluginName),
            errorIsOurs: true,
          };
        case "fewer-installed-than-shown":
          return {
            success: false,
            error: formatSwitchTargetChangedMessage(result.pluginName),
            errorIsOurs: true,
          };
        case "switch-needs-fresh-listing":
          return {
            success: false,
            error: `Plugin "${quotedPrintable(result.pluginName, 120)}" was not switched. ${formatSwitchNeedsFreshReadMessage(result.detail)}`,
            errorIsOurs: true,
          };
        case "blocked-by-policy":
          return {
            success: false,
            error: `Plugin "${result.pluginName}" is blocked by your organization's policy and cannot be installed`,
            errorIsOurs: true,
          };
        case "dependency-blocked-by-policy":
          return {
            success: false,
            error: `Cannot install "${result.pluginName}": dependency "${result.blockedDependency}" is blocked by your organization's policy`,
            errorIsOurs: true,
          };
        case "marketplace-blocked-by-policy":
          return {
            success: false,
            error: `Cannot install "${result.pluginName}": marketplace "${result.marketplaceName}" is blocked by your organization's policy`,
            errorIsOurs: true,
          };
        case "dependency-marketplace-blocked-by-policy":
          return {
            success: false,
            error: `Cannot install "${result.pluginName}": dependency "${result.blockedDependency}" is from marketplace "${result.marketplaceName}", which is blocked by your organization's policy`,
            errorIsOurs: true,
          };
        case "plugin-directory-unavailable":
          return {
            success: false,
            error: formatDirectoryUnavailableMessage(result.pluginName, result.unavailableDependency),
            errorIsOurs: true,
          };
        case "range-conflict": {
          let Ie = result.dep === pluginId ? "Plugin" : "Dependency";
          return {
            success: false,
            error: describeConstraintConflict(
              Ie,
              result.dep,
              result.ranges,
              result.why,
              result.installed,
              result.suggestDependencyUpdate,
            ),
            errorIsOurs: true,
          };
        }
        case "no-matching-tag": {
          let Ie = result.dep === pluginId ? "Plugin" : "Dependency";
          return {
            success: false,
            error: noMatchingTagMessage(Ie, result.dep, result.range),
            errorIsOurs: true,
          };
        }
        case "directory-pin-unsatisfied":
        case "directory-binding-unreadable":
        case "directory-identity-changed":
          return {
            success: false,
            error: result.message,
            errorIsOurs: true,
          };
      }
    logEvent("tengu_plugin_installed", {
      ...buildPluginEventFields(entry.name, marketplaceName, policyEnabledPluginNameSet()),
      plugin_id: pluginIdForTelemetry(pluginId),
      trigger: fromEnum(trigger),
      install_source: lit_2(trigger === "hint" ? "ui-suggestion" : "ui-discover"),
      ...(entry.version && {
        version: sanitizeVersion(entry.version),
      }),
      ...buildPluginVersionShaField(
        pluginId,
        getInstalledGitCommitSha(pluginId, {
          scope,
        }),
      ),
      ...directoryInstallFields({
        pluginId,
        surface,
        replaced: false,
      }),
    });
    let Se = claudeCommand("plugin enable", pluginId);
    let enableHint = `enable it in /plugin${Se ? ` or run: ${Se}` : ""}`;
    let included = result.installedDisabled.includes(pluginId);
    let included_2 = result.installedDisabledByDefault.includes(pluginId);
    let otherProjectsNote = describeOtherMarketplaceInstall(
      pluginId,
      entry.name,
      result.copiesInOtherProjects,
    );
    return {
      success: true,
      message: formatInstalledMessage({
        name: entry.name,
        depNote: result.depNote,
        disabled: !included ? undefined : included_2 ? "by-default" : "in-settings",
        enableHint,
        otherProjectsNote,
      }),
      depNote: result.depNote,
      installedDisabled: included,
      installedDisabledByDefault: included_2,
    };
  } catch (err) {
    let G = redactUrlsInMessage(err instanceof Error ? err.message : String(err));
    let q = err instanceof CommandSourceError;
    logForDebugging(`installPluginFromMarketplace ${q ? "refused" : "failed"} for ${pluginId}: ${G}`, {
      level: q ? "info" : "error",
    });
    logInstallFailed({
      reason:
        err instanceof EntryHelperError
          ? err.failureCode
          : err instanceof CommandSourceError
            ? "command-source-refused"
            : "unexpected-error",
      errorKind: classifyPluginCommandError(err),
      pluginId,
      entry,
      marketplaceName,
      trigger,
      surface,
    });
    return {
      success: false,
      error: q ? G : `Failed to install: ${G}`,
      refusal: q ? err : undefined,
      ...(q && {
        errorIsOurs: true,
      }),
    };
  }
}
export {
  installPluginFromMarketplace,
  bindingKeysFor,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
  findDataDirConflictingRecord,
  installResolvedPlugin,
  formatResolutionError,
  getBoundRepositoryKeys,
  validatePathWithinBase,
  pluginBindingValues,
  registerPluginInstallation,
  mergePreviousProducerPaths,
  parsePluginIdSafe,
  healManagedRecord,
  cacheAndRegisterPlugin,
  pluginInstallPathExists,
};
