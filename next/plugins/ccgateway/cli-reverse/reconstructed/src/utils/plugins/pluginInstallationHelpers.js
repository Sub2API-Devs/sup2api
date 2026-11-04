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
function registerPluginInstallation(existing, next) {
  return (
    existing.installPath === next.installPath &&
    existing.lastUpdated === next.lastUpdated &&
    (next.auto !== true || existing.auto === true)
  );
}
//@ chunk-e6aww6q8.js:4365510-4366714 callgraph-fingerprint = cacheAndRegisterPlugin (0.165)
/**
 * 把一个 marketplace 插件下载缓存并写入安装记录（拒绝不安全的条目路径）。
 */
async function cacheAndRegisterPlugin(
  pluginId,
  entry,
  source,
  marketplaceInstallLocation,
  knownMarketplaces,
  needsCache,
  storageV5,
) {
  let pluginEntryPath = await resolvePluginEntryPath(
    pluginId,
    marketplaceInstallLocation,
    source,
    knownMarketplaces,
    tryUnwrapTextPayload(),
    storageV5,
  );
  let { entryPath, reason } = needsCache
    ? entryPathOrReason(pluginEntryPath)
    : entryPathOrReasonLenient(pluginEntryPath);
  if (entryPath === undefined) {
    logForDebugging(`Skipping ${jsonStringify(pluginId)}: ${reason} (refused, not probed)`, {
      level: "warn",
    });
    return;
  }
  let manifestVersion = await readManifestVersion(entryPath, pluginId, storageV5);
  let marketplaceDir =
    pluginEntryPath.kind === "ok" ||
    pluginEntryPath.kind === "location-missing" ||
    pluginEntryPath.kind === "location-error"
      ? pluginEntryPath.marketplaceDir
      : entryPath;
  let cacheResult = await probePluginGitHead(entryPath, marketplaceDir);
  let gitSha = cacheResult.repo ? (cacheResult.sha ?? undefined) : undefined;
  let isOfficialPinned =
    !cacheResult.repo && parsePluginIdentifier(pluginId).marketplace === CLAUDE_PLUGINS_OFFICIAL;
  let pinnedShaValue = isOfficialPinned ? await marketplaceCommitSha(entryPath) : null;
  let commitSha = gitSha ?? pinnedShaValue ?? undefined;
  if (manifestVersion === "unknown" && entry.version) manifestVersion = entry.version;
  if (manifestVersion === "unknown" && commitSha) manifestVersion = commitSha.substring(0, 12);
  if (manifestVersion === "unknown") {
    let versionGuess = isOfficialPinned ? (pinnedShaValue ?? null) : await pluginVersionOrNull(entryPath);
    if (versionGuess) manifestVersion = versionGuess.substring(0, 12);
  }
  let tempPath = getVersionedCachePath(pluginId, manifestVersion);
  if (needsCache) {
    try {
      tempPath = await copyPluginToVersionedCache(
        entryPath,
        pluginId,
        manifestVersion,
        entry,
        marketplaceInstallLocation,
        {
          storageV5: isStorageV5Enabled() ? storageV5 : undefined,
        },
      );
    } catch (error) {
      logForDebugging(
        `Cannot materialize versioned cache for ${pluginId} from ${entryPath}: ${errorMessage(error)}, skipping`,
      );
      try {
        let strict = strictCacheAddressable(storageV5);
        if (
          (!strict ||
            ((await versionParentContained(tempPath)) && (await classifyCacheEntry(tempPath)) === "other")) &&
          !(await cacheDirHasPluginContentStrict(tempPath, storageV5)) &&
          !(
            strict &&
            (await isPluginVersionInUse(
              tempPath,
              {
                excludeSelf: true,
              },
              storageV5,
            ).catch(() => true))
          )
        )
          if (strict) await removeVersionDirIfIdle(tempPath);
          else
            await getFsImplementation().rm(tempPath, {
              recursive: true,
              force: true,
            });
      } catch {}
      return;
    }
    if (!(await pluginInstallPathExists(tempPath, storageV5))) {
      logForDebugging(
        `Cannot materialize versioned cache for ${pluginId}: no readable plugin payload at ${tempPath}, skipping`,
      );
      return;
    }
  }
  return {
    installPath: tempPath,
    version: manifestVersion,
    gitCommitSha: commitSha,
    keepStoredCommit:
      (cacheResult.repo && cacheResult.sha === null) || (isOfficialPinned && pinnedShaValue === undefined),
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
function bindingKeysFor(plugins, pluginId) {
  return findBindingKeysFor(Object.keys(plugins), pluginId).map((key) => [key, plugins[key] ?? []]);
}
//@ chunk-e6aww6q8.js:4366842-4366922 placement
/**
 * pluginBindingValues：绑定的插件名列表。
 */
function pluginBindingValues(installationMap, pluginId) {
  let pairs = bindingKeysFor(installationMap, pluginId);
  return pairs.length === 0 ? undefined : pairs.flatMap(([, installations]) => installations);
}
//@ chunk-e6aww6q8.js:4366922-4367185 placement
/**
 * 同目录名插件绑定到不同仓库时返回冲突者。
 */
function findDataDirConflictingRecord(plugins, bindings, pluginId, source) {
  let sourceKey = samePluginSource(source, undefined);
  let isDifferent = (key) => key !== undefined && parseRepoWithRef(key) !== sourceKey;
  let found = uniq([
    ...findBindingKeysFor(Object.keys(plugins), pluginId),
    ...findBindingKeysFor(bindings.keys(), pluginId),
  ]).find(
    (key) =>
      (plugins[key] ?? []).some((installation) => isDifferent(installation.directoryRepositoryKey)) ||
      isDifferent(bindings.get(key)),
  );
  return found === undefined || found === pluginId
    ? undefined
    : {
        id: found,
        installed: (plugins[found]?.length ?? 0) > 0,
      };
}
//@ chunk-e6aww6q8.js:4367185-4367294 placement
/**
 * 官方插件目录插件的仓库与当前来源不同。
 */
function isDirectoryRepositoryChanged(pluginId, values, source, bindings) {
  {
    if (isUnboundOfficialPlugin(pluginId, values, bindings)) return true;
    let sourceKey = samePluginSource(source, undefined);
    return getBoundRepositoryKeys(pluginId, values, bindings).some((key) => key !== sourceKey);
  }
  return false;
}
//@ chunk-e6aww6q8.js:4367294-4367426 placement
/**
 * 官方插件目录插件且尚无仓库绑定。
 */
function isUnboundOfficialPlugin(pluginId, values, bindings, readFailed = false) {
  if (!pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) || !isUnreadableBindings(bindings)) return false;
  return (
    readFailed || (values ?? []).every((installation) => installation.directoryRepositoryKey === undefined)
  );
}
//@ chunk-e6aww6q8.js:4367426-4367596 placement
/**
 * 官方插件目录插件已记录的仓库键。
 */
function getBoundRepositoryKeys(pluginId, values, bindings) {
  if (!pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) return [];
  return [
    ...(values ?? []).flatMap((installation) => installation.directoryRepositoryKey ?? []),
    ...findBindingKeysFor(bindings.keys(), pluginId).flatMap((key) => bindings.get(key) ?? []),
  ].map(parseRepoWithRef);
}
//@ chunk-e6aww6q8.js:4367596-4367739 placement
async function parsePluginIdSafe(pluginId, record, version, loadKnown) {
  try {
    return await parsePluginId(pluginId, record, version, loadKnown);
  } catch (error) {
    logForDebugging(`Cannot judge ${pluginId} managed record: ${errorMessage(error)}, leaving it as is`);
    return true;
  }
}
//@ chunk-e6aww6q8.js:4367739-4368179 placement
async function parsePluginId(pluginId, { installPath, claudeaiPluginId }, version, loadKnown) {
  if (claudeaiPluginId !== undefined) return true;
  let { absolute, suspect } = classifyMarketplacePath(installPath);
  if (suspect) return false;
  if (await pluginInstallPathExists(absolute, version)) return true;
  if (
    getPluginSeedDirs().length > 0 &&
    (await probeSeedForPlugin(pluginId, basename(absolute).replace(/\.zip$/, ""), "always")) !== null
  )
    return true;
  let known = await loadKnown();
  if (isKnownMarketplacesReadFailure(known)) return true;
  let { marketplace } = parsePluginIdentifier(pluginId);
  let source = marketplace ? known[marketplace]?.source : undefined;
  if (source === undefined) return false;
  if (isClaudeAiMarketplaceSource(source)) return true;
  if (!isLocalMarketplaceSource(source)) return false;
  return typeof (await getPluginByIdCacheOnly(pluginId, version))?.entry?.source === "string";
}
//@ chunk-e6aww6q8.js:4368179-4368533 placement
/**
 * 托管记录缺失缓存时从市场重新缓存注册。
 */
async function healManagedRecord(pluginId, known, version) {
  try {
    let pluginByIdCacheOnly = await getPluginByIdCacheOnly(pluginId, version);
    if (!pluginByIdCacheOnly || typeof pluginByIdCacheOnly.entry.source !== "string") return;
    let { marketplace } = parsePluginIdentifier(pluginId);
    let source = marketplace ? known?.[marketplace]?.source : undefined;
    if (
      isPluginBlockedByPolicy(pluginId) ||
      isSourceDisallowedOrUnverifiable(source) ||
      isLocalMarketplaceEntry(pluginByIdCacheOnly.entry.source, source)
    )
      return;
    return await cacheAndRegisterPlugin(
      pluginId,
      pluginByIdCacheOnly.entry,
      pluginByIdCacheOnly.entry.source,
      pluginByIdCacheOnly.marketplaceInstallLocation,
      known,
      true,
      version,
    );
  } catch (error) {
    logForDebugging(`Cannot heal ${pluginId} managed record: ${errorMessage(error)}, leaving it as is`);
    return;
  }
}
//@ chunk-e6aww6q8.js:4368533-4368762 placement
function mergePreviousProducerPaths(record, producerPath) {
  let currentAsPrevious =
    record.sourceProducerPath !== undefined && record.sourceProducerPath !== producerPath
      ? [record.sourceProducerPath]
      : [];
  return [
    ...(record.previousProducerPaths ?? []).filter(
      (path) => path !== record.sourceProducerPath && path !== producerPath,
    ),
    ...currentAsPrevious,
  ]
    .filter((path) => path !== "")
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
      let marketplaceLabel = depMkt ? quoteName(displaySafeName(depMkt, MAX_DISPLAY_NAME_LENGTH)) : undefined;
      let where = marketplaceLabel ? `marketplace ${marketplaceLabel}` : "a different marketplace";
      let hint = marketplaceLabel
        ? ` Add ${marketplaceLabel} to allowCrossMarketplaceDependenciesOn in the ROOT marketplace's marketplace.json (the marketplace of the plugin you're installing \u2014 only its allowlist applies; no transitive trust).`
        : "";
      return `Dependency ${quoteName(displaySafePluginId(r_2.dependency))} (required by ${displaySafePluginId(r_2.requiredBy)}) is in ${where}, which is not in the allowlist \u2014 cross-marketplace dependencies are blocked by default. Install it manually first.${hint}`;
    }
    case "not-found": {
      let { marketplace: depMkt } = parsePluginIdentifier(r_2.missing);
      let dependencyLabel = quoteName(displaySafePluginId(r_2.missing));
      let dependentLabel = displaySafePluginId(r_2.requiredBy);
      return depMkt
        ? `Dependency ${dependencyLabel} (required by ${dependentLabel}) not found. Is the ${quoteName(displaySafeName(depMkt, MAX_DISPLAY_NAME_LENGTH))} marketplace added?`
        : `Dependency ${dependencyLabel} (required by ${dependentLabel}) not found in any configured marketplace`;
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
  let allowed = await checkInstallAllowed(pluginId, entry, storageV5);
  if (!allowed.ok) return allowed.refusal;
  let { knownMarketplaces, failClosedOnUnknownSource } = allowed;
  let [firstOther, ...restOthers] =
    isPluginDirectoryAvailable() && !auto && !requiredByEnabledDependent
      ? await describeOtherMarketplaceInstalls(pluginId, entry, knownMarketplaces, storageV5)
      : [];
  let otherInstalls = firstOther ? [firstOther, ...restOthers] : undefined;
  if (otherInstalls && replaceInstalledCopy && switchWalkNotFresh !== undefined)
    return {
      ok: false,
      reason: "switch-needs-fresh-listing",
      pluginName: entry.name,
      detail: switchWalkNotFresh,
      installedCopies: otherInstalls,
    };
  if (
    replaceInstalledCopy &&
    (await resolveDelistedPluginId(replaceOnlyPluginIds, otherInstalls ?? [], storageV5)).length > 0
  )
    return {
      ok: false,
      reason: "fewer-installed-than-shown",
      pluginName: entry.name,
    };
  let blocker =
    otherInstalls && replaceInstalledCopy
      ? findOtherMarketplaceInstallBlocker(
          pluginId,
          otherInstalls,
          replaceOnlyPluginIds,
          switchTargetMarkedInItsOwnWalk,
        )
      : undefined;
  if (blocker?.reason === "more-installed-than-shown")
    return {
      ok: false,
      reason: "more-installed-than-shown",
      pluginName: entry.name,
    };
  if (otherInstalls && (!replaceInstalledCopy || blocker !== undefined))
    return {
      ok: false,
      reason: "installed-from-other-marketplace",
      pluginName: entry.name,
      installedCopies: otherInstalls,
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
  let projectPath = scope !== "user" ? getCwd() : undefined;
  let plugins = (
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
  ).plugins;
  let alreadyEnabled = new Set();
  for (let id of getEnabledPluginIdsInSource(settingSource))
    if (installationAtTarget(plugins[id], scope, projectPath) !== undefined) alreadyEnabled.add(id);
  let allPluginsCacheOnly = await loadAllPluginsCacheOnly(storageV5);
  let plugins_2 = allPluginsCacheOnly.enabled.concat(allPluginsCacheOnly.disabled);
  let versionsById = new Map();
  for (let plugin of plugins_2)
    versionsById.set(plugin.source, plugin.resolvedVersion ?? plugin.manifest.version);
  let enabledPlugins = getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins;
  let forceInclude = new Set();
  for (let plugin of plugins_2) {
    if (!plugin.depConstraints) continue;
    for (let [rawDependency, constraint] of plugin.depConstraints) {
      if (constraint.version === undefined) continue;
      let dependencyId = qualifyDependency(rawDependency, plugin.source);
      if (Array.isArray(enabledPlugins?.[dependencyId])) continue;
      if (
        isPluginBlockedByPolicy(dependencyId) ||
        findBlockedMarketplace(dependencyId, knownMarketplaces, {
          failClosedOnUnknownSource,
        })
      ) {
        logForDebugging(
          `installResolvedPlugin: ${dependencyId} version-unsatisfied but policy-blocked; not force-including`,
        );
        continue;
      }
      if (!versionSatisfies(versionsById.get(dependencyId), constraint.version)) {
        if (isPluginDirectoryMarketplace(dependencyId, knownMarketplaces)) {
          let info = depInfo.get(dependencyId) ?? (await getPluginById(dependencyId, storageV5, "update"));
          let orgBlockedPlugins = await collectOrgBlockedPlugins(storageV5);
          if (
            info
              ? isListingBlocked(info.entry, orgBlockedPlugins)
              : orgBlockedPlugins !== null || isListingRepositoryBlockedByHostPolicy(undefined)
          ) {
            logForDebugging(
              `installResolvedPlugin: ${dependencyId} version-unsatisfied but a policy-blocked copy, or unlisted while a block stands; not force-including`,
            );
            continue;
          }
          if (info) depInfo.set(dependencyId, info);
        }
        forceInclude.add(dependencyId);
      }
    }
  }
  let dependencyClosure = await resolveDependencyClosure(
    pluginId,
    async (id) => {
      if (depInfo.has(id)) return depInfo.get(id).entry;
      if (id === pluginId) return entry;
      let info = await getPluginById(id, storageV5, forceInclude.has(id) ? "update" : "install");
      if (info) depInfo.set(id, info);
      return info?.entry ?? null;
    },
    alreadyEnabled,
    allowedCrossMarketplaces,
    forceInclude,
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
  for (let id of dependencyClosure.closure) {
    if (id === pluginId || alreadyEnabled.has(id)) continue;
    if (isPluginBlockedByPolicy(id))
      return {
        ok: false,
        reason: "dependency-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: id,
      };
    let info = await pluginDirectoryUnavailableReason(id);
    if (info !== null)
      return {
        ok: false,
        reason: "plugin-directory-unavailable",
        pluginName: entry.name,
        cause: info,
        unavailableDependency: id,
      };
    let blockedMarketplace = findBlockedMarketplace(id, knownMarketplaces, {
      failClosedOnUnknownSource,
    });
    if (blockedMarketplace)
      return {
        ok: false,
        reason: "dependency-marketplace-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: id,
        marketplaceName: blockedMarketplace,
      };
    let entry_2 = depInfo.get(id)?.entry;
    if (
      entry_2 !== undefined &&
      (await isListingUsableForMarketplace(id, entry_2, knownMarketplaces, storageV5))
    )
      return {
        ok: false,
        reason: "dependency-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: id,
      };
  }
  let plugins_3 = (
    isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
  ).plugins;
  let sharedStorageConflict = findSharedStorageConflict(
    dependencyClosure.closure,
    dependencyClosure.closure,
    plugins_3,
  );
  if (sharedStorageConflict !== null)
    return {
      ok: false,
      reason: "plugin-folder-held",
      ...sharedStorageConflict,
      rootKept: false,
    };
  let writeSeed = {
    ...(getSettingsForSourceWriteSeed(settingSource)?.enabledPlugins ?? {}),
  };
  let allEnabled = {};
  for (let settingSource of getEnabledSettingSources())
    Object.assign(allEnabled, getSettingsForSource(settingSource)?.enabledPlugins ?? {});
  let explicitAnywhere = new Set(Object.keys(allEnabled).filter((key) => allEnabled[key] !== undefined));
  let rootRequiredByDependent =
    requiredByEnabledDependent === true ||
    plugins_2.some((plugin) => {
      if (plugin.source === pluginId) return false;
      let value = allEnabled[plugin.source];
      return (
        (value !== undefined
          ? value === true || Array.isArray(value)
          : plugin.manifest.defaultEnabled !== false) &&
        (plugin.manifest.dependencies ?? []).some((rawDependency) =>
          dependencyRefMatches(qualifyDependency(rawDependency, plugin.source), pluginId, plugin.source),
        )
      );
    });
  function entryFor(id) {
    return id === pluginId ? entry : depInfo.get(id)?.entry;
  }
  let defaultsById = new Map();
  let depsById = new Map();
  for (let id of dependencyClosure.closure) {
    let entry = entryFor(id);
    defaultsById.set(id, entry?.defaultEnabled ?? true);
    depsById.set(
      id,
      (entry?.dependencies ?? []).map((rawDependency) => qualifyDependency(rawDependency, id)),
    );
  }
  let dependencyEnablement = computeDependencyEnablement({
    closure: dependencyClosure.closure,
    rootId: pluginId,
    rootRequiredByDependent,
    priorEnabled: writeSeed,
    explicitAnywhere,
    defaultsById,
    dependenciesById: depsById,
  });
  let writtenEnablement = new Map();
  let nextEnabled = {};
  for (let id of dependencyClosure.closure) {
    let current = writeSeed[id];
    nextEnabled[id] = Array.isArray(current) ? current : (dependencyEnablement.get(id) ?? true);
    writtenEnablement.set(id, nextEnabled[id]);
  }
  let { error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (settings) => ({
      enabledPlugins: {
        ...settings?.enabledPlugins,
        ...nextEnabled,
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
  async function entryPathFor(id, info) {
    if (!isRelativeSourcePath(info.entry.source)) return;
    let { entryPath, reason } = entryPathOrReason(
      await resolvePluginEntryPath(
        id,
        info.marketplaceInstallLocation,
        info.entry.source,
        knownMarketplaces,
        tryUnwrapTextPayload(),
        storageV5,
      ),
    );
    if (entryPath === undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot install ${printableName(id, 120)}: ${reason}`,
        "plugin install marketplace entry path refused",
      );
    return entryPath;
  }
  let installedPaths = new Map();
  let priorRecords = new Map();
  let changedIds = new Set();
  let settingsWrittenForRoot = false;
  let closure = dependencyClosure.closure;
  async function revertInstalled() {
    for (let [id, path] of installedPaths) {
      installedPaths.delete(id);
      let { records = [], recordedAt } = priorRecords.get(id) ?? {};
      let currentInstall = installationAtTarget(
        (isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync()
        ).plugins[id],
        scope,
        projectPath,
      );
      let priorRecord = installationAtTarget(records, scope, projectPath);
      let markAuto =
        (auto === true || id !== pluginId) && (priorRecord === undefined || priorRecord.auto === true);
      let record = {
        installPath: path,
        lastUpdated: recordedAt ?? currentInstall?.lastUpdated,
        ...(markAuto && {
          auto: true,
        }),
      };
      if (
        currentInstall !== undefined &&
        (currentInstall.installPath !== path ||
          (recordedAt !== undefined && currentInstall.lastUpdated !== recordedAt) ||
          (markAuto && currentInstall.auto !== true))
      ) {
        changedIds.add(id);
        continue;
      }
      if (priorRecord !== undefined) {
        if (
          currentInstall !== undefined &&
          !(await restoreEarlierInstallRecord(id, priorRecord, record, storageV5))
        )
          changedIds.add(id);
        continue;
      }
      if ((await removePluginInstallation(id, scope, projectPath, storageV5, record)) === false) {
        changedIds.add(id);
        continue;
      }
      settingsWrittenForRoot ||= id === pluginId;
      if (records.length === 0) await markPluginVersionOrphaned(path, storageV5);
    }
  }
  async function restoreSettings() {
    let settingsKey = {};
    for (let settingPluginId of closure) {
      if (changedIds.has(settingPluginId)) continue;
      settingsKey[settingPluginId] =
        settingPluginId === pluginId &&
        installedPaths.has(settingPluginId) &&
        !Array.isArray(writeSeed[settingPluginId])
          ? (dependencyEnablement.get(pluginId) ?? true)
          : writeSeed[settingPluginId];
    }
    let { [pluginId]: removedSetting, ...nextSettings } = settingsKey;
    let { error } = await updateSettingsForSourceWithTransform(
      settingSource,
      (settingsNow) => ({
        enabledPlugins:
          settingsWrittenForRoot &&
          settingsNow?.enabledPlugins?.[pluginId] !== writtenEnablement.get(pluginId)
            ? nextSettings
            : settingsKey,
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
  let declaredDeps;
  let defaultById = new Map();
  let extraDeps = new Map();
  let notFoundDeps = [];
  let officialDeps = new Set();
  let nowLoadingFalse = [];
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
    let closureSet = new Set(closure);
    let { ranges, requirers } = collectDependencyVersionRanges(plugins_2, closureSet);
    let pendingRanges = new Map();
    let rangesByDep = new Map();
    async function reportAndRollback(reason) {
      switch (reason) {
        case "directory-pin-unsatisfied":
          await revertInstalled();
          break;
        case "range-conflict":
        case "no-matching-tag":
        case "plugin-folder-held":
          if (
            auto ||
            requiredByEnabledDependent ||
            writeSeed[pluginId] !== undefined ||
            priorRecords.get(pluginId)?.records.length !== 0
          )
            break;
          try {
            for (let key of installedPaths.keys())
              if (priorRecords.get(key)?.records.length !== 0) installedPaths.delete(key);
            await revertInstalled();
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
      await restoreSettings();
    }
    async function materializeOne(id) {
      let info = depInfo.get(id);
      if (!info)
        return {
          ok: true,
          dependencies: undefined,
        };
      let requiredRanges = [...(pendingRanges.get(id) ?? []), ...(ranges.get(id) ?? [])];
      let pinnedRange;
      let entry = info.entry;
      let pinRange;
      if (requiredRanges.length > 0) {
        let intersected = intersectVersionConstraints(requiredRanges);
        if (!intersected.ok)
          return {
            ok: false,
            reason: "range-conflict",
            dep: id,
            ranges: requiredRanges,
            why: intersected.reason,
          };
        if (id.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
          pinRange = intersected.range === "*" ? undefined : intersected.range;
        else if (intersected.range !== "*") {
          let pluginCloneUrl = getPluginCloneUrl(info.entry.source);
          let source = knownMarketplaces[parsePluginIdentifier(id).marketplace ?? ""]?.source;
          let isRepoRelative = pluginCloneUrl === null && typeof info.entry.source === "string";
          let cloneUrl = isRepoRelative ? getMarketplaceCloneUrl(source) : pluginCloneUrl;
          if (cloneUrl !== null) {
            let versionRange = await resolveVersionRange(
              cloneUrl,
              info.entry.name,
              intersected.range,
              rangesByDep,
            );
            if (versionRange === null && !isRepoRelative)
              return {
                ok: false,
                reason: "no-matching-tag",
                dep: id,
                range: intersected.range,
              };
            if (versionRange === null)
              logForDebugging(
                `materializeOne(${id}): no ${info.entry.name}--v* tag satisfying ${intersected.range} on marketplace repo; falling through to HEAD copy`,
              );
            else {
              pinnedRange = versionRange;
              if (isRepoRelative && typeof info.entry.source === "string") {
                let relativePluginSource = toRelativePluginSource(source, info.entry.source);
                if (relativePluginSource !== null)
                  entry = {
                    ...info.entry,
                    source: relativePluginSource,
                  };
              }
            }
          }
        }
      }
      let installResult = await installPluginWithRecords(
        id,
        entry,
        scope,
        projectPath,
        await entryPathFor(id, {
          ...info,
          entry,
        }),
        pinnedRange,
        auto === true || id !== pluginId,
        info.marketplaceInstallLocation,
        marketplaceSourceOfEntry(id, knownMarketplaces),
        id === pluginId && auto !== true
          ? commandSourceConsent
          : {
              kind: "none",
              pluginId: id,
            },
        storageV5,
        {
          explicitInstall: explicit && id === pluginId,
          consented: id === pluginId ? consentedEntryHelper : undefined,
        },
        undefined,
        pinRange,
        id !== pluginId && alreadyEnabled.has(id) ? undefined : gitHubHttpsFallback,
      ).catch((error) => {
        if (
          error instanceof PinnedVersionMismatchError ||
          error instanceof PluginCachePublishError ||
          error instanceof PluginFolderHeldError
        )
          return error;
        throw error;
      });
      if (installResult instanceof PluginFolderHeldError)
        return {
          ok: false,
          reason: "plugin-folder-held",
          pluginId: id,
          sharedWith: "installed",
          holders: installResult.holders,
        };
      if (installResult instanceof PluginCachePublishError)
        return {
          ok: false,
          reason: installResult.reason,
          dep: id,
          message: installResult.message,
        };
      if (installResult instanceof PinnedVersionMismatchError)
        return {
          ok: false,
          reason: "directory-pin-unsatisfied",
          dep: id,
          message: `"${printableName(info.entry.name, 120)}" from the ${OFFICIAL_MARKETPLACE_DISPLAY} is pinned to its listed commit (${installResult.manifestVersion ? `version ${printableName(installResult.manifestVersion, 120)}` : "no version"}), which does not satisfy ${printableName(requiredRanges.join(", "), 120)} required by ${(requirers.get(id) ?? []).map((requirerId) => `"${printableName(parsePluginIdentifier(requirerId).name, 120)}"`).join(", ")}.`,
        };
      installedPaths.set(id, installResult.path);
      priorRecords.set(id, {
        records: installResult.recordsBefore,
        recordedAt: installResult.recordedAt,
      });
      defaultById.set(id, installResult.defaultEnabled);
      extraDeps.set(id, installResult.dependencies ?? []);
      for (let [rawDependency, constraint] of installResult.depConstraints ?? []) {
        if (constraint.version === undefined) continue;
        let dependencyId = qualifyDependency(rawDependency, id);
        requirers.set(dependencyId, [...(requirers.get(dependencyId) ?? []), id]);
        let ranges = pendingRanges.get(dependencyId);
        if (ranges) ranges.push(constraint.version);
        else pendingRanges.set(dependencyId, [constraint.version]);
      }
      return {
        ok: true,
        dependencies: installResult.dependencies ?? [],
      };
    }
    for (let idx = dependencyClosure.closure.length - 1; idx >= 0; idx--) {
      let id = dependencyClosure.closure[idx];
      if (id === undefined) continue;
      let forceIncluded = id !== pluginId && alreadyEnabled.has(id);
      let result;
      try {
        result = await materializeOne(id);
      } catch (error) {
        if (forceIncluded) {
          logForDebugging(
            `installResolvedPlugin: force-included ${id} fetch threw (${error instanceof Error ? error.message : String(error)}); skipping (pinner stays demoted)`,
          );
          continue;
        }
        throw error;
      }
      if (!result.ok) {
        if (forceIncluded) {
          logForDebugging(
            result.reason === "range-conflict"
              ? `installResolvedPlugin: force-included ${id} has disjoint pinner ranges ${result.ranges.join(", ")}; skipping (pinner stays demoted)`
              : result.reason === "no-matching-tag"
                ? `installResolvedPlugin: force-included ${id} has no tag satisfying ${result.range}; skipping (pinner stays demoted)`
                : result.reason === "directory-binding-unreadable" ||
                    result.reason === "directory-identity-changed" ||
                    result.reason === "plugin-folder-held"
                  ? `installResolvedPlugin: force-included ${id} was refused before any fetch (${result.reason}); skipping (pinner stays demoted)`
                  : `installResolvedPlugin: force-included ${id} is pinned to a listed commit outside the required range; skipping (pinner stays demoted)`,
          );
          continue;
        }
        await reportAndRollback(result.reason);
        return result.reason === "plugin-folder-held"
          ? {
              ...result,
              rootKept: installedPaths.has(pluginId),
            }
          : result;
      }
      for (let rawDependency of result.dependencies ?? [])
        officialDeps.add(qualifyDependency(rawDependency, id));
      if (id === pluginId) declaredDeps = result.dependencies;
    }
    let rootDepIds = new Set(
      (declaredDeps ?? []).map((rawDependency) => qualifyDependency(rawDependency, pluginId)),
    );
    for (let [dependencyId, pendingRangesForDep] of pendingRanges) {
      if (
        closureSet.has(dependencyId) ||
        (forceInclude.has(dependencyId) && rootDepIds.has(dependencyId)) ||
        !alreadyEnabled.has(dependencyId)
      )
        continue;
      let combined = pendingRangesForDep.concat(ranges.get(dependencyId) ?? []);
      let intersected = intersectVersionConstraints(combined);
      if (!intersected.ok) {
        await reportAndRollback("range-conflict");
        return {
          ok: false,
          reason: "range-conflict",
          dep: dependencyId,
          ranges: combined,
          why: intersected.reason,
        };
      }
      let info = versionsById.get(dependencyId);
      if (intersected.range !== "*" && !versionSatisfies(info, intersected.range)) {
        let canSuggestUpdate =
          requirers.get(dependencyId)?.includes(pluginId) === true &&
          !Array.isArray(enabledPlugins?.[dependencyId]) &&
          !isPluginBlockedByPolicy(dependencyId) &&
          !findBlockedMarketplace(dependencyId, knownMarketplaces, {
            failClosedOnUnknownSource,
          });
        if (canSuggestUpdate) await restoreSettings();
        else await reportAndRollback("range-conflict");
        return {
          ok: false,
          reason: "range-conflict",
          dep: dependencyId,
          ranges: combined,
          why: "installed-unsatisfied",
          installed: info,
          suggestDependencyUpdate: canSuggestUpdate,
        };
      }
    }
    let batch = [
      {
        manifestDeps: declaredDeps,
        declaringId: pluginId,
      },
    ];
    while (batch.length > 0) {
      let newIds = [];
      for (let { manifestDeps, declaringId } of batch) {
        for (let rawDependency of manifestDeps ?? [])
          officialDeps.add(qualifyDependency(rawDependency, declaringId));
        let autoResult = await autoInstallPluginDependencies({
          rootManifestDeps: manifestDeps,
          pluginId: declaringId,
          closureSet,
          alreadyEnabled,
          forceInclude,
          rootMarketplace,
          allowedCrossMarketplaces,
          knownMarketplaces,
          failClosedOnUnknownSource,
          depInfo,
          storageV5,
        });
        if (!autoResult.ok) {
          await restoreSettings();
          if (autoResult.blockedMarketplace)
            return {
              ok: false,
              reason: "dependency-marketplace-blocked-by-policy",
              pluginName: entry.name,
              blockedDependency: autoResult.blockedDependency,
              marketplaceName: autoResult.blockedMarketplace,
            };
          return {
            ok: false,
            reason: "dependency-blocked-by-policy",
            pluginName: entry.name,
            blockedDependency: autoResult.blockedDependency,
          };
        }
        notFoundDeps.push(
          ...autoResult.notFound.filter(
            (id) => !allPluginsCacheOnly.enabled.some((plugin) => plugin.source === id),
          ),
        );
        for (let id of autoResult.ids) {
          if (closureSet.has(id)) continue;
          closureSet.add(id);
          closure.push(id);
          newIds.push(id);
        }
      }
      if (newIds.length === 0) break;
      let sharedStorageConflict = findSharedStorageConflict(newIds, closure, plugins_3);
      if (sharedStorageConflict !== null) {
        await reportAndRollback("plugin-folder-held");
        return {
          ok: false,
          reason: "plugin-folder-held",
          ...sharedStorageConflict,
          rootKept: installedPaths.has(pluginId),
        };
      }
      let enableOops = {};
      for (let id of newIds) {
        enableOops[id] = true;
        writtenEnablement.set(id, true);
      }
      let { error } = await updateSettingsForSourceWithTransform(
        settingSource,
        (settings) => ({
          enabledPlugins: {
            ...settings?.enabledPlugins,
            ...enableOops,
          },
        }),
        undefined,
        storageV5,
      );
      if (error) {
        await restoreSettings();
        return {
          ok: false,
          reason: "settings-write-failed",
          message: error.message,
        };
      }
      let nextBatch = [];
      for (let id of newIds) {
        let alreadyOn = alreadyEnabled.has(id);
        let result;
        try {
          result = await materializeOne(id);
        } catch (error) {
          if (alreadyOn) {
            logForDebugging(
              `installResolvedPlugin: force-included ${id} fetch threw (${error instanceof Error ? error.message : String(error)}); skipping (pinner stays demoted)`,
            );
            continue;
          }
          throw error;
        }
        if (!result.ok) {
          if (alreadyOn) {
            logForDebugging(
              `installResolvedPlugin: force-included ${id} ${result.reason}; skipping (pinner stays demoted)`,
            );
            continue;
          }
          await reportAndRollback(result.reason);
          return result.reason === "plugin-folder-held"
            ? {
                ...result,
                rootKept: installedPaths.has(pluginId),
              }
            : result;
        }
        nextBatch.push({
          manifestDeps: result.dependencies,
          declaringId: id,
        });
      }
      batch = nextBatch;
    }
  } catch (error) {
    await restoreSettings();
    throw error;
  }
  if (declaredDeps !== undefined) {
    let rootDepIds = new Set(declaredDeps.map((rawDependency) => qualifyDependency(rawDependency, pluginId)));
    for (let rawDependency of entry.dependencies ?? []) {
      let depId = qualifyDependency(rawDependency, pluginId);
      if (!rootDepIds.has(depId))
        logForDebugging(
          `Marketplace entry for ${pluginId} lists dependency "${rawDependency}" not present in plugin.json \u2014 catalog may be stale`,
        );
    }
  }
  let defaults2 = new Map();
  let deps2 = new Map();
  for (let id of closure) {
    let entry = entryFor(id);
    defaults2.set(id, entry?.defaultEnabled ?? defaultById.get(id) ?? true);
    let mapped = (entry?.dependencies ?? []).map((rawDependency) => qualifyDependency(rawDependency, id));
    for (let rawDependency of extraDeps.get(id) ?? []) mapped.push(qualifyDependency(rawDependency, id));
    deps2.set(id, mapped);
  }
  let dependencyEnablement_2 = computeDependencyEnablement({
    closure,
    rootId: pluginId,
    rootRequiredByDependent,
    priorEnabled: writeSeed,
    explicitAnywhere,
    defaultsById: defaults2,
    dependenciesById: deps2,
  });
  let corrections = {};
  for (let id of closure) {
    let current = writeSeed[id];
    let desired = dependencyEnablement_2.get(id) ?? true;
    if (current !== undefined && current !== desired) continue;
    if (writtenEnablement.get(id) !== desired) corrections[id] = desired;
  }
  let correctionApplied = true;
  if (Object.keys(corrections).length > 0) {
    let { error } = await updateSettingsForSourceWithTransform(
      settingSource,
      (settings) => ({
        enabledPlugins: {
          ...settings?.enabledPlugins,
          ...corrections,
        },
      }),
      undefined,
      storageV5,
    );
    if (error) {
      correctionApplied = false;
      logForDebugging(`Failed to apply defaultEnabled correction for ${pluginId}: ${error.message}`, {
        level: "warn",
      });
    }
  }
  let enabledSettingSources = getEnabledSettingSources();
  let index = enabledSettingSources.indexOf(settingSource);
  function disabledInLaterSource(id) {
    for (let idx = enabledSettingSources.length - 1; idx > index; idx--) {
      let mktLocation = getSettingsForSource(enabledSettingSources[idx])?.enabledPlugins?.[id];
      if (mktLocation !== undefined) return mktLocation === false;
    }
    return false;
  }
  let filtered = closure.filter(
    (id) =>
      dependencyEnablement_2.get(id) === false && (correctionApplied || writtenEnablement.get(id) === false),
  );
  let installedDisabled = closure.filter((id) => filtered.includes(id) || disabledInLaterSource(id));
  refreshPluginCaches(storageV5);
  let marketplace = parsePluginIdentifier_2(pluginId).marketplace;
  let pluginMarketplace = isOfficialMarketplaceName_3(marketplace);
  let logNames = pluginMarketplace || isToolDetailsLoggingEnabled();
  logOTelEvent("plugin_installed", {
    ...(logNames && {
      "plugin.name": entry.name,
    }),
    ...(logNames &&
      entry.version && {
        "plugin.version": entry.version,
      }),
    ...(logNames &&
      marketplace && {
        "marketplace.name": marketplace,
      }),
    "marketplace.is_official": String(pluginMarketplace),
    ...(trigger && {
      "install.trigger": trigger,
    }),
    ...(filtered.includes(pluginId) && {
      "install.disabled_by_default": "true",
    }),
  });
  if (
    isPluginDirectoryAvailable() &&
    [...officialDeps].some((id) => id.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
  ) {
    let bindings = await bindingsWithReadFailure();
    for (let id of officialDeps) {
      let { name, marketplace } = parsePluginIdentifier(id);
      let values = pluginBindingValues(plugins, id);
      if (
        marketplace !== OFFICIAL_MARKETPLACE_NAME ||
        installedPaths.has(id) ||
        (values?.length ?? 0) === 0 ||
        notFoundDeps.includes(id)
      )
        continue;
      let pluginDirectoryMarketplace = await loadPluginDirectoryMarketplace(name, storageV5);
      if (pluginDirectoryMarketplace === null) continue;
      let found = pluginDirectoryMarketplace.plugins.find((plugin) => plugin.name === name);
      if (found === undefined || isDirectoryRepositoryChanged(id, values, found.source, bindings))
        nowLoadingFalse.push(id);
    }
  }
  let depWarning = "";
  if (notFoundDeps.length > 0) {
    let pluginDirectoryState = await getPluginDirectoryState();
    if (pluginDirectoryState !== "unavailable") {
      let suffix = `@${OFFICIAL_MARKETPLACE_NAME}`;
      let stateReason =
        pluginDirectoryState === "off"
          ? `the ${OFFICIAL_MARKETPLACE_DISPLAY} is off`
          : pluginDirectoryState === "blocked"
            ? `the ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization`
            : `the ${OFFICIAL_MARKETPLACE_DISPLAY} could not be read, or does not list it`;
      let ids = uniq(notFoundDeps);
      let sliced = ids.slice(0, 5);
      let moreCount = ids.length - sliced.length;
      depWarning = `. Warning: ${sliced.map((id) => `dependency "${quotedPrintable(id, 120)}" was not installed (${id.endsWith(suffix) ? stateReason : "no marketplace you have added lists it"})`).join("; ")}${moreCount > 0 ? `; and ${moreCount} more` : ""}. "${quotedPrintable(entry.name, 120)}" will not load without ${plural(ids.length, "it", "them")}`;
    }
  }
  let directoryWarning = "";
  if (nowLoadingFalse.length > 0) {
    let depNote = uniq(nowLoadingFalse);
    let isSingle = depNote.length === 1;
    let joined = depNote
      .slice(0, 5)
      .map((id) => `"${quotedPrintable(id, 120)}"`)
      .join(", ");
    let moreText = depNote.length > 5 ? ` and ${depNote.length - 5} more` : "";
    let selfLabel = `"${quotedPrintable(entry.name, 120)}"`;
    directoryWarning = `. Warning: ${isSingle ? "dependency" : "dependencies"} ${joined}${moreText} ${isSingle ? "is" : "are"} installed, but the ${OFFICIAL_MARKETPLACE_DISPLAY}'s current listing will not keep ${isSingle ? "it" : "them"} loading, and ${selfLabel} will not load without ${isSingle ? "it" : "them"}. Once ${isSingle ? "it stops (it may have already)" : "they stop (they may have already)"}, \`claude plugin list\` says why`;
  }
  let depNote = `${formatDependencyCountSuffix([...installedPaths.keys()].filter((key) => key !== pluginId))}${depWarning}${directoryWarning}`;
  return {
    ok: true,
    closure: dependencyClosure.closure,
    depNote,
    installedDisabled,
    installedDisabledByDefault: filtered,
    ...(otherInstalls && {
      replacedCopies: otherInstalls,
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
async function installPluginFromMarketplace(request) {
  let { pluginId, entry, marketplaceName, scope = "user", storageV5 } = request;
  let trigger = request.trigger;
  let surface = request.trigger === "hint" ? undefined : request.surface;
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
      explicit: request.trigger === "user",
      consentedEntryHelper: request.trigger === "user" ? request.consentedEntryHelper : undefined,
      commandSourceConsent: request.commandSourceConsent,
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
          let subject = result.dep === pluginId ? "Plugin" : "Dependency";
          return {
            success: false,
            error: describeConstraintConflict(
              subject,
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
          let subject = result.dep === pluginId ? "Plugin" : "Dependency";
          return {
            success: false,
            error: noMatchingTagMessage(subject, result.dep, result.range),
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
    let enableCommand = claudeCommand("plugin enable", pluginId);
    let enableHint = `enable it in /plugin${enableCommand ? ` or run: ${enableCommand}` : ""}`;
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
    let message = redactUrlsInMessage(err instanceof Error ? err.message : String(err));
    let isRefusal = err instanceof CommandSourceError;
    logForDebugging(
      `installPluginFromMarketplace ${isRefusal ? "refused" : "failed"} for ${pluginId}: ${message}`,
      {
        level: isRefusal ? "info" : "error",
      },
    );
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
      error: isRefusal ? message : `Failed to install: ${message}`,
      refusal: isRefusal ? err : undefined,
      ...(isRefusal && {
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
