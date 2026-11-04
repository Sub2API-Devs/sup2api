/**
 * utils/plugins/crossMarketplaceInstall.ts
 *
 * 2.1.316 新增：跨市场安装
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-e6aww6q8.js (20)
 * attribution: placement 20
 */
import { quotedPrintable, printableName } from "../printableName.js";
import {
  OFFICIAL_MARKETPLACE_DISPLAY,
  OFFICIAL_MARKETPLACE_NAME,
  marketplaceDisplayName,
} from "./officialMarketplaceNames.js";
import { runCommandHint, claudeCommand, isSafeCliArg } from "../worktreeResumeHint.js";
import { normalizePathForPlatform } from "./localMarketplacePaths.js";
import {
  getPluginCacheDirIn,
  cachePlugin,
  entryDeclaresComponents,
  entryDeclaredComponentPaths,
  getVersionedCachePath,
  strictCacheAddressable,
  versionParentState,
  getVersionedZipCachePath,
  strictArchivePresent,
  requireVersionParentContained,
  copyPluginToVersionedCache,
  unvouchBeforeDependencyStep,
  rescreenCachedPluginTree,
  removeFreshCopyUnlessInUse,
  unmarkBeforeArchiving,
} from "./pluginLoader.js";
import { pluginDataDirPath } from "./pluginDirectories.js";
import { TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS, errorMessage } from "../errors.js";
import {
  assertRecordablePluginId,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  hasFailedInstalledPluginsRead,
  readInstalledPluginsLenient,
  readInstalledPluginsIfAny,
  addInstalledPlugin,
} from "./installedPluginsManager.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { findPluginNameCollision } from "./pluginNameCollision.js";
import { samePluginSource, parseRepoWithRef, pinnedSha, withShaSuffix } from "./pluginSourceUrl.js";
import {
  verifyReviewedCommit,
  getPluginCloneUrl,
  probePluginGitHead,
  pluginVersionOrNull,
  calculatePluginVersion,
} from "./pluginVersioning.js";
import {
  MAX_REPOSITORY_KEY_CHARS,
  seedDirectoryBindings,
  findBindingKeysFor,
} from "./pluginDirectoryBindings.js";
import {
  bindingKeysFor,
  pluginBindingValues,
  findDataDirConflictingRecord,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
} from "./pluginInstallationHelpers.js";
import {
  PluginCachePublishError,
  PinnedVersionMismatchError,
  orphanMarkerMove,
  adoptStagedPlugin,
  publishStagedPlugin,
} from "./cachePublish.js";
import { findSettingsArchiveEntry, findUrlMarketplaceHeaders } from "./marketplaceSources.js";
import {
  marketplaceNameOfId,
  getEntryHelperConsentSubject,
  headersHelperNotRunReason,
  EntryHelperError,
  checkHeadersHelperConsent,
  helperRefusalFailureCode,
  diffEntryHelperConsent,
  describeHelperReview,
  HELPER_CONSENT_MISMATCH_CODES,
  resolveArchiveDownloadHeaders,
} from "./headersHelper.js";
import { headersHelperPolicyRefusal } from "./marketplacePolicy.js";
import { isOfficialDirectoryPlugin } from "./pluginDirectoryTelemetry.js";
import { isNpmPluginId } from "./schemas.js";
import { removeDirectoryTreeNoFollow as removeDirectoryTreeNoFollow_2 } from "../fsRemove.js";
import { versionSatisfies } from "./dependencyResolver.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { commandSourceSpecOf, isLinkModeCommandSource, describeCommandOutputMode } from "./commandSource.js";
import { isPluginZipCacheEnabled, publishDirectoryAsZip } from "./zipCache.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import { logForDebugging } from "../debug.js";
import { shouldInstallBinaryAssets, provisionBinaryAssets } from "./pluginBinaryAssets.js";
import { installPluginDependencies } from "./pluginDependencies.js";
import { recordProducerDir } from "./pluginCachePaths.js";
import { isReviewerMarkedEntry } from "./commandSourceErrors.js";
import { isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { plural, capitalize } from "../stringUtils.js";
import { uniq, count } from "../collections.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-e6aww6q8.js:4431671-4432044 placement
/**
 * 拒绝安装的提示：插件会与另一个来自不同仓库的已安装插件共用数据目录，提示先卸载那个再安装。
 */
function formatSharedDataFolderMessage(name, dataDirConflictingRecord) {
  {
    let conflictRecordId = quotedPrintable(dataDirConflictingRecord.id, 200);
    return `"${quotedPrintable(name, 120)}" was not installed. It would use the same data folder as "${conflictRecordId}", which ${dataDirConflictingRecord.installed ? "is installed" : "was installed"} from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists. To free the name, ${runCommandHint(
      "plugin uninstall",
      dataDirConflictingRecord.id,
      {
        fallback: `uninstall "${conflictRecordId}" from the command line`,
      },
    )}, then install it again.`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4432044-4432083 placement
function isSameNormalizedPath(pathA, pathB) {
  return normalizePathForPlatform(pathA) === normalizePathForPlatform(pathB);
}
//@ chunk-e6aww6q8.js:4432083-4432171 placement
function sharedPluginStorageKind(pluginIdA, pluginIdB) {
  return isSameNormalizedPath(getPluginCacheDirIn("", pluginIdA), getPluginCacheDirIn("", pluginIdB))
    ? "folder"
    : isSameNormalizedPath(pluginDataDirPath(pluginIdA), pluginDataDirPath(pluginIdB))
      ? "data"
      : null;
}
//@ chunk-e6aww6q8.js:4432171-4432240 placement
function hasNoOtherMarketplaceInstalls(plugins, pluginId) {
  return !pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) && (plugins[pluginId]?.length ?? 0) === 0;
}
//@ chunk-e6aww6q8.js:4432240-4432515 placement
function findDataDirHolders(plugins, pluginId) {
  if (!hasNoOtherMarketplaceInstalls(plugins, pluginId)) return [];
  return Object.entries(plugins).flatMap(([key, value]) => {
    let sharedKind =
      key !== pluginId && value !== undefined && value.length > 0
        ? sharedPluginStorageKind(key, pluginId)
        : null;
    return sharedKind === null || value === undefined
      ? []
      : [
          {
            id: key,
            shares: sharedKind,
            installations: value.map(({ scope, projectPath }) => ({
              scope,
              ...(projectPath !== undefined && {
                projectPath,
              }),
            })),
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:4432515-4432792 placement
function findSharedStorageConflict(pluginIds, closure, plugins) {
  for (let pluginId of pluginIds) {
    if (!hasNoOtherMarketplaceInstalls(plugins, pluginId)) continue;
    let dataDirHolders = findDataDirHolders(plugins, pluginId);
    if (dataDirHolders.length > 0)
      return {
        pluginId,
        sharedWith: "installed",
        holders: dataDirHolders,
      };
    for (let twinId of closure) {
      let sharedKind =
        twinId !== pluginId && hasNoOtherMarketplaceInstalls(plugins, twinId)
          ? sharedPluginStorageKind(twinId, pluginId)
          : null;
      if (sharedKind !== null)
        return {
          pluginId,
          sharedWith: "same-install",
          twin: twinId,
          shares: sharedKind,
        };
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:4432792-4432956 placement
function describeNameCollision(id, refused, shares) {
  return {
    capitals:
      shares === "folder"
        ? getPluginCacheDirIn("", id) !== getPluginCacheDirIn("", refused)
        : pluginDataDirPath(id) !== pluginDataDirPath(refused),
    punctuation: shares === "folder" && id.toLowerCase() !== refused.toLowerCase(),
    atSign: shares === "data",
  };
}
//@ chunk-e6aww6q8.js:4436041-4436257 placement
let PluginFolderHeldError; // deferred: uses TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS (../errors.js) of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-e6aww6q8.js:4436041", () => {
  PluginFolderHeldError = class PluginFolderHeldError extends (
    TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS
  ) {
    pluginCommandErrorCategory = "validation";
    holders;
    constructor(pluginNameCollision, holders) {
      super(pluginNameCollision, "plugin not installed: another installed plugin has one of its folders");
      this.name = "PluginFolderHeldError";
      this.holders = holders;
    }
  };
});
//@ chunk-e6aww6q8.js:4436257-4443773 placement
/**
 * 安装插件并更新安装记录，记录与实际不符时拒绝。
 */
async function installPluginWithRecords(
  pluginId,
  entry,
  scope = "user",
  projectPath,
  marketplaceRoot,
  tagInfo,
  auto,
  marketplaceInstallLocation,
  marketplaceSource,
  commandSourceConsent,
  storageV5,
  installOptions = {
    explicitInstall: false,
  },
  credentials,
  pinnedVersion,
  gitHubHttpsFallback,
) {
  assertRecordablePluginId(pluginId);
  let installedListRefusal = await getInstalledListRefusal(storageV5);
  if (installedListRefusal !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(installedListRefusal)}`,
      "plugin not installed: the install records hold what this build cannot read",
    );
  let holders = findDataDirHolders(
    (isStorageV5Enabled() && storageV5 !== undefined
      ? await loadInstalledPlugins(storageV5)
      : loadInstalledPluginsSync()
    ).plugins,
    pluginId,
  );
  if (holders.length > 0)
    throw new PluginFolderHeldError(
      findPluginNameCollision({
        refused: pluginId,
        askedFor: pluginId,
        sharedWith: "installed",
        holders,
        surface: "cli",
      }),
      holders,
    );
  let isOfficial = pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  let directoryRepoKey = isOfficial ? samePluginSource(entry.source, undefined) : undefined;
  let reviewCheck = verifyReviewedCommit({
    pluginId,
    pluginName: entry.name,
    source: entry.source,
    boundByRecord: false,
    action: "installed",
  });
  if (!reviewCheck.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      reviewCheck.message,
      "plugin directory listing has no reviewed commit",
    );
  if (isOfficial) {
    if (directoryRepoKey === undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `"${printableName(entry.name, 120)}" was not installed: its ${OFFICIAL_MARKETPLACE_DISPLAY} listing names no repository.`,
        "plugin directory listing names no repository",
      );
    if (directoryRepoKey.length > MAX_REPOSITORY_KEY_CHARS)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `"${printableName(entry.name, 120)}" was not installed: the repository address in its ${OFFICIAL_MARKETPLACE_DISPLAY} listing is too long. Nothing was changed. Only a change to the listing can fix this.`,
        "plugin directory listing repository key too long",
      );
    let installedPlugins =
      isStorageV5Enabled() && storageV5 !== undefined
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync();
    let recordsUnreadable = hasFailedInstalledPluginsRead(installedPlugins);
    let bindingKeys = bindingKeysFor(installedPlugins.plugins, pluginId);
    let bindingValues = pluginBindingValues(installedPlugins.plugins, pluginId);
    let bindings = await seedDirectoryBindings(bindingKeys.length > 0 ? bindingKeys : [[pluginId, []]]);
    let dataDirConflictingRecord = findDataDirConflictingRecord(
      installedPlugins.plugins,
      bindings,
      pluginId,
      entry.source,
    );
    if (isUnboundOfficialPlugin(pluginId, bindingValues, bindings, recordsUnreadable))
      throw new PluginCachePublishError(
        "directory-binding-unreadable",
        `"${printableName(entry.name, 120)}" was not installed: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
        "plugin directory bindings file could not be read",
      );
    if (recordsUnreadable) {
      let flattened = findBindingKeysFor(bindings.keys(), pluginId).flatMap(
        (bindingKey) => bindings.get(bindingKey) ?? [],
      );
      let bindingValue =
        flattened.find((repoKey) => parseRepoWithRef(repoKey) !== directoryRepoKey) ?? flattened[0];
      if (bindingValue === undefined || parseRepoWithRef(bindingValue) !== directoryRepoKey)
        throw new PluginCachePublishError(
          bindingValue === undefined ? "directory-binding-unreadable" : "directory-identity-changed",
          bindingValue === undefined
            ? `"${printableName(entry.name, 120)}" was not installed: installed_plugins.json in the plugins folder could not be read, so Claude Code cannot tell whether it is already installed from another repository. Nothing was changed. Try again once the file can be read.`
            : `"${printableName(entry.name, 120)}" was not installed: installed_plugins.json in the plugins folder could not be read, and plugin-directory-bindings.json records it as installed from a different repository than the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists. Nothing was changed. Try again once installed_plugins.json can be read.`,
          "plugin directory install records could not be read",
        );
    }
    let currentBindings = recordsUnreadable
      ? pluginBindingValues(await readInstalledPluginsLenient(storageV5), pluginId)
      : bindingValues;
    if (isDirectoryRepositoryChanged(pluginId, currentBindings, entry.source, bindings))
      throw new PluginCachePublishError(
        "directory-identity-changed",
        dataDirConflictingRecord !== undefined
          ? formatSharedDataFolderMessage(entry.name, dataDirConflictingRecord)
          : (currentBindings?.length ?? 0) > 0
            ? `"${quotedPrintable(entry.name, 120)}" is already installed from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists under that name. Uninstall it first, then install it again.`
            : `"${quotedPrintable(entry.name, 120)}" was not installed. An earlier install under that name came from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists, and what it saved (options, secrets, data) may still be here. To delete that, ${runCommandHint(
                "plugin uninstall",
                pluginId,
                {
                  fallback: `uninstall "${quotedPrintable(pluginId, 200)}" from the command line`,
                },
              )}, then install it again.`,
        "plugin directory listing now names a different repository",
      );
  }
  let pinInfo = isOfficial ? undefined : tagInfo;
  let effectiveSource = typeof entry.source === "string" && marketplaceRoot ? marketplaceRoot : entry.source;
  let pluginSource =
    pinInfo &&
    typeof effectiveSource === "object" &&
    (effectiveSource.source === "github" ||
      effectiveSource.source === "url" ||
      effectiveSource.source === "git-subdir")
      ? {
          ...effectiveSource,
          ref: pinInfo.ref,
          sha: pinInfo.sha,
        }
      : effectiveSource;
  let trustedSettingsEntryAuth = findSettingsArchiveEntry(marketplaceNameOfId(pluginId), entry.name);
  if (
    installOptions.explicitInstall &&
    typeof pluginSource === "object" &&
    pluginSource.source === "archive"
  ) {
    let consent = getEntryHelperConsentSubject(
      headersHelperNotRunReason({
        entry,
        archiveUrl: pluginSource.url,
        marketplaceSource,
        trustedSettingsEntryAuth,
      }),
      pluginSource.url,
    );
    let helperRefusal =
      consent === null ? null : headersHelperPolicyRefusal(marketplaceSource, marketplaceNameOfId(pluginId));
    if (helperRefusal !== null)
      throw new EntryHelperError(
        checkHeadersHelperConsent(entry.name, helperRefusal),
        helperRefusalFailureCode(helperRefusal),
      );
    let consentDiff = diffEntryHelperConsent(installOptions.consented, consent);
    if (consentDiff !== null)
      throw new EntryHelperError(
        describeHelperReview(consentDiff, entry.name, "install"),
        HELPER_CONSENT_MISMATCH_CODES[consentDiff],
      );
  }
  let cached = await cachePlugin(pluginSource, {
    commandSourceConsent: commandSourceConsent ?? {
      kind: "none",
      pluginId,
    },
    manifest: entry,
    containmentRoot:
      typeof entry.source === "string" && marketplaceRoot ? marketplaceInstallLocation : undefined,
    archiveAuth: await resolveArchiveDownloadHeaders({
      pluginSource,
      pluginName: entry.name,
      marketplaceName: marketplaceNameOfId(pluginId),
      marketplaceSource,
      trustedMarketplaceAuth: findUrlMarketplaceHeaders(marketplaceSource, marketplaceNameOfId(pluginId)),
      trustedSettingsEntryAuth,
      entry,
      runEntryHelper: installOptions.explicitInstall,
    }),
    entryDeclaresComponents: entryDeclaresComponents(entry),
    declaredComponentPaths: entryDeclaredComponentPaths(entry),
    storageV5,
    ...(isStorageV5Enabled() &&
      storageV5 !== undefined && {
        pluginId,
      }),
    isDirectoryPlugin: isOfficialDirectoryPlugin(pluginId),
    directoryPin: pinnedSha(pluginId, pluginSource) ?? null,
    credentials,
    ...(isNpmPluginId(pluginId) && {
      isNpmMarketplaceLane: true,
    }),
    gitHubHttpsFallback,
  });
  let installPath = marketplaceRoot || cached.path;
  let containmentRoot =
    marketplaceRoot && marketplaceInstallLocation ? marketplaceInstallLocation : installPath;
  let hasCloneUrl = typeof effectiveSource === "string" || getPluginCloneUrl(effectiveSource) !== null;
  let reviewedCommitSha;
  {
    let postFetchReview = verifyReviewedCommit({
      pluginId,
      pluginName: entry.name,
      source: entry.source,
      boundByRecord: false,
      fetched: {
        gitCommitSha: cached.gitCommitSha,
      },
      action: "installed",
    });
    if (!postFetchReview.ok) {
      await removeDirectoryTreeNoFollow_2(cached.path).catch(() => {});
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        postFetchReview.message,
        "plugin directory fetch is not at the reviewed commit",
      );
    }
    if (pinnedVersion !== undefined && !versionSatisfies(cached.manifest.version, pinnedVersion)) {
      await removeDirectoryTreeNoFollow_2(cached.path).catch(() => {});
      throw new PinnedVersionMismatchError(cached.manifest.version);
    }
    reviewedCommitSha = postFetchReview.reviewedCommit;
  }
  let gitCommitSha =
    reviewedCommitSha ??
    pinInfo?.sha ??
    cached.gitCommitSha ??
    (hasCloneUrl ? await readInstalledPluginsIfAny(installPath, containmentRoot) : undefined) ??
    (marketplaceRoot &&
    marketplaceInstallLocation &&
    marketplaceNameOfId(pluginId) === CLAUDE_PLUGINS_OFFICIAL &&
    !(await probePluginGitHead(installPath, containmentRoot)).repo
      ? await pluginVersionOrNull(marketplaceRoot)
      : undefined) ??
    undefined;
  let iso = new Date().toISOString();
  let npmResolution = isNpmPluginId(pluginId) ? cached.npmResolution : undefined;
  let computedVersion =
    npmResolution?.version ??
    (await calculatePluginVersion(
      pluginId,
      entry.source,
      cached.manifest,
      installPath,
      {
        kind: "catalog",
        version: entry.version,
      },
      pinInfo?.sha ?? cached.gitCommitSha,
      cached.contentSha256,
      containmentRoot,
    ));
  let pluginVersion =
    pinInfo && (cached.manifest.version || entry.version)
      ? withShaSuffix(computedVersion, pinInfo.sha)
      : computedVersion;
  let versionedCachePath = getVersionedCachePath(pluginId, pluginVersion);
  let path = cached.path;
  let orphanMove = orphanMarkerMove(cached.stagingScope, versionedCachePath);
  let keepStagingPath = true;
  if (cached.path !== versionedCachePath) {
    let strictCache = strictCacheAddressable(storageV5);
    try {
      if (commandSourceSpecOf(pluginSource)) {
        let parentRefused = strictCache && (await versionParentState(versionedCachePath)) === "refused";
        let archivePath = getVersionedZipCachePath(pluginId, pluginVersion);
        let zipPresent =
          !parentRefused &&
          isPluginZipCacheEnabled() &&
          (strictCache
            ? await strictArchivePresent(archivePath, pluginId, pluginVersion, () =>
                requireVersionParentContained(
                  versionedCachePath,
                  pluginId,
                  pluginVersion,
                  "cache",
                  "before reuse",
                ),
              )
            : await pathExists(archivePath));
        if (
          !parentRefused &&
          !zipPresent &&
          (await adoptStagedPlugin(cached.path, versionedCachePath, strictCache, storageV5, orphanMove))
        )
          path = versionedCachePath;
        else {
          path = await copyPluginToVersionedCache(cached.path, pluginId, pluginVersion, entry, undefined, {
            storageV5,
            credentials,
          });
          await removeDirectoryTreeNoFollow_2(cached.path).catch((error) => {
            logForDebugging(
              `Failed to remove the staging tree ${cached.path} after publishing: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          });
          keepStagingPath = false;
        }
      } else {
        let entries = Object.entries(cached.manifest.binaries ?? {});
        let publishResult = await publishStagedPlugin(
          cached.path,
          versionedCachePath,
          {
            pluginId,
            version: pluginVersion,
            strictCache,
            ...(entries.length > 0 &&
              shouldInstallBinaryAssets(pluginId) && {
                binariesHook: {
                  declared: new Map(
                    entries.map(([binaryName, binarySpec]) => [binaryName, binarySpec.sha256]),
                  ),
                },
              }),
          },
          storageV5,
          orphanMove,
        );
        path = versionedCachePath;
        if (publishResult === "kept") keepStagingPath = false;
      }
    } catch (error) {
      await removeDirectoryTreeNoFollow_2(cached.path).catch(() => {});
      throw error;
    }
  }
  if (keepStagingPath && !isLinkModeCommandSource(pluginSource)) {
    try {
      await unvouchBeforeDependencyStep(path, storageV5);
      let dependencyResult = await installPluginDependencies(path);
      if (dependencyResult.error)
        logForDebugging(`Plugin dependency install warning for ${pluginId}: ${dependencyResult.error}`, {
          level: "warn",
        });
      await provisionBinaryAssets(path, pluginId, {
        storageV5,
        credentials,
      });
      await rescreenCachedPluginTree(path, storageV5);
    } catch (error) {
      await removeFreshCopyUnlessInUse(path, storageV5);
      throw error;
    }
    if (isPluginZipCacheEnabled() && (await unmarkBeforeArchiving(path, storageV5))) {
      let zipPath = getVersionedZipCachePath(pluginId, pluginVersion);
      await publishDirectoryAsZip(path, zipPath);
      path = zipPath;
    }
  }
  if (pinInfo && cached.manifest.version && pinInfo.version !== cached.manifest.version)
    logForDebugging(
      `Tag ${pinInfo.ref} resolved to a commit whose plugin.json says version ${cached.manifest.version} \u2014 using tag-derived ${pinInfo.version} for constraint checks`,
      {
        level: "warn",
      },
    );
  let recordsBefore = await addInstalledPlugin(
    pluginId,
    {
      version: pluginVersion,
      installedAt: iso,
      lastUpdated: iso,
      installPath: path,
      gitCommitSha,
      ...(pinInfo && {
        resolvedVersion: pinInfo.version,
      }),
      ...(auto && {
        auto: true,
      }),
      ...(directoryRepoKey !== undefined && {
        directoryRepositoryKey: directoryRepoKey,
      }),
      ...(typeof pluginSource === "object" &&
        pluginSource.source === "claudeai" && {
          claudeaiPluginId: pluginSource.pluginId,
          ...(cached.contentSha256 !== undefined && {
            archiveSha256: cached.contentSha256,
          }),
        }),
      ...(typeof pluginSource === "object" &&
        pluginSource.source === "command" && {
          sourceCommand: describeCommandOutputMode(pluginSource),
          ...(cached.producerPath !== undefined && {
            sourceProducerPath: cached.producerPath,
          }),
        }),
      ...(npmResolution !== undefined &&
        typeof pluginSource === "object" &&
        pluginSource.source === "npm" && {
          ...(pluginSource.version !== undefined && {
            npmVersionSpec: pluginSource.version,
          }),
          npmResolved: npmResolution.tarballUrl,
          ...(npmResolution.integrity !== undefined && {
            npmIntegrity: npmResolution.integrity,
          }),
          ...(pluginSource.registry !== undefined && {
            npmRegistry: pluginSource.registry,
          }),
        }),
    },
    scope,
    projectPath,
    storageV5,
  );
  if (cached.producerPath !== undefined) recordProducerDir(cached.producerPath);
  return {
    path,
    recordedAt: iso,
    recordsBefore,
    manifestVersion: cached.manifest.version,
    depConstraints: cached.depConstraints,
    dependencies: cached.manifest.dependencies,
    defaultEnabled: cached.manifest.defaultEnabled,
  };
}
//@ chunk-e6aww6q8.js:4443773-4443885 placement
/**
 * 拆分 名@市场，格式不对返回 null。
 */
function parsePluginAtMarketplace(pluginId) {
  let parts = pluginId.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return {
    name: parts[0],
    marketplace: parts[1],
  };
}
//@ chunk-e6aww6q8.js:4443885-4443952 placement
/**
 * qualifiedMarketplaceLabel：市场显示名。
 */
function qualifiedMarketplaceLabel(pluginId, fallbackLabel) {
  {
    let marketplaceName = marketplaceNameOfId(pluginId);
    return marketplaceName === undefined ? fallbackLabel : truncateMarketplaceLabel(marketplaceName);
  }
  return fallbackLabel;
}
//@ chunk-e6aww6q8.js:4443952-4443990 placement
/**
 * truncateMarketplaceLabel：截断市场显示名。
 */
function truncateMarketplaceLabel(marketplace) {
  return quotedPrintable(marketplaceDisplayName(marketplace), 120);
}
//@ chunk-e6aww6q8.js:4443990-4444133 placement
/**
 * 安装数比展示的多、未做更改。
 */
function formatMoreInstallsThanShownMessage(pluginId) {
  return `More installs of "${quotedPrintable(pluginId, 120)}" were found than were shown. Nothing was changed; open the plugin again to see them all`;
}
//@ chunk-e6aww6q8.js:4444133-4444317 placement
/**
 * 切换会替换的内容已变化、未做更改。
 */
function formatSwitchTargetChangedMessage(pluginId) {
  return `What switching "${quotedPrintable(pluginId, 120)}" would replace has changed since it was shown. Nothing was changed; open the plugin again to see whether a switch is still offered`;
}
//@ chunk-e6aww6q8.js:4444531-4444616 placement
function isOfficialFamilyEntry(pluginId) {
  {
    let marketplaceName = marketplaceNameOfId(pluginId);
    return (
      marketplaceName === OFFICIAL_MARKETPLACE_NAME &&
      isReviewerMarkedEntry(pluginId.slice(0, -`@${marketplaceName}`.length))
    );
  }
  return false;
}
//@ chunk-e6aww6q8.js:4444616-4444842 placement
/**
 * 其他市场的安装都在官方市场族内，可直接替换。
 */
function canReplaceOfficialInstalls(pluginId, installs, isOfficialFamily) {
  {
    if (installs.length === 0) return false;
    let marketplaceName = marketplaceNameOfId(pluginId);
    if (installs.some((install) => marketplaceNameOfId(install.pluginId) === undefined)) return false;
    if (marketplaceName !== OFFICIAL_MARKETPLACE_NAME)
      return (
        isOfficialMarketplaceName_3(marketplaceName) &&
        installs.every((install) => marketplaceNameOfId(install.pluginId) === OFFICIAL_MARKETPLACE_NAME)
      );
    return (
      (isOfficialFamily ?? isOfficialFamilyEntry(pluginId)) &&
      installs.every((install) => isOfficialMarketplaceName_3(marketplaceNameOfId(install.pluginId)))
    );
  }
  return false;
}
//@ chunk-e6aww6q8.js:4444842-4445182 placement
/**
 * 已从其他市场安装时的阻止判定：有不可替换的记录（或不能按官方规则替换）返回 installed-from-other-marketplace； 已安装记录多于展示给用户的返回 more-installed-than-shown；否则 undefined。
 */
function findOtherMarketplaceInstallBlocker(pluginId, installs, shownPluginIds, isOfficialFamily) {
  {
    let blocker =
      installs.find((install) => !install.replaceable) ??
      (canReplaceOfficialInstalls(pluginId, installs, isOfficialFamily) ? undefined : installs[0]);
    if (blocker)
      return {
        reason: "installed-from-other-marketplace",
        blocking: blocker,
      };
    if (
      shownPluginIds !== undefined &&
      installs.some((install) => !shownPluginIds.includes(install.pluginId))
    )
      return {
        reason: "more-installed-than-shown",
      };
    return;
  }
  let [firstInstall] = installs;
  return firstInstall === undefined
    ? undefined
    : {
        reason: "installed-from-other-marketplace",
        blocking: firstInstall,
      };
}
//@ chunk-e6aww6q8.js:4445182-4445353 placement
function formatMissingCopiesWarning(count, dependentCount) {
  return `without ${dependentCount === "that" ? "that copy" : `the ${plural(dependentCount, "copy", "copies")} ${plural(count, "it needs", "they need")}`}, turning ${plural(count, "it", "them")} back on may not work`;
}
//@ chunk-e6aww6q8.js:4445353-4450827 placement
/**
 * 插件已从其他市场安装时的处理：提示 --replace 或指定作用域。
 */
function installFromOtherMarketplace(
  pluginId,
  pluginName,
  installs,
  surface,
  scope = "user",
  isOfficialFamily,
) {
  {
    let displayName = quotedPrintable(pluginName, 120);
    let marketplaceLabel = qualifiedMarketplaceLabel(pluginId, "this marketplace");
    let switchCommand =
      surface === "cli"
        ? claudeCommand(
            "plugin install",
            pluginId,
            scope === "user" ? "--replace" : `--replace --scope ${scope}`,
          )
        : null;
    let [firstInstall, ...otherInstalls] = installs;
    if (firstInstall === undefined) return `"${displayName}" is already installed from another marketplace`;
    let formatList = (items) =>
      new Intl.ListFormat("en", {
        type: "conjunction",
      }).format(items);
    let marketplaceNamesOf = (install) =>
      formatList(
        uniq(install.map((install) => qualifiedMarketplaceLabel(install.pluginId, "another marketplace"))),
      );
    let quoteIds = (requiredBy) => requiredBy.map((requiredBy) => `"${quotedPrintable(requiredBy, 120)}"`);
    let isOtherMarketplace = (install) => {
      let marketplaceName = marketplaceNameOfId(install.pluginId);
      return marketplaceName !== OFFICIAL_MARKETPLACE_NAME && !isOfficialMarketplaceName_3(marketplaceName);
    };
    let filtered = installs.filter(isOtherMarketplace);
    let filtered_2 = installs.filter((install) => !isOtherMarketplace(install));
    let isCliSwitchable = (pluginId) => marketplaceNameOfId(pluginId) !== undefined && isSafeCliArg(pluginId);
    let describeFilteredInstalls = (upper) => {
      let idList = filtered.every((install) => isCliSwitchable(install.pluginId))
        ? ` (${filtered.map((install) => `"${quotedPrintable(install.pluginId, 200)}"`).join(", ")})`
        : "";
      let noun = plural(filtered.length, "a plugin", "plugins");
      return `${upper ? capitalize(noun) : noun} installed here from ${marketplaceNamesOf(filtered)}${idList} ${plural(filtered.length, "is", "are")} listed there at the same repository and folder as "${displayName}"`;
    };
    let installedSummary =
      filtered.length === 0
        ? `"${displayName}" is already installed from ${marketplaceNamesOf(filtered_2)}`
        : filtered_2.length === 0
          ? describeFilteredInstalls(true)
          : `"${displayName}" is already installed from ${marketplaceNamesOf(filtered_2)}, and ${describeFilteredInstalls(false)}`;
    if (!canReplaceOfficialInstalls(pluginId, installs, isOfficialFamily)) {
      let keepSettingsFamily = isOfficialFamily ?? isOfficialFamilyEntry(pluginId);
      let switchExplanation =
        !keepSettingsFamily && marketplaceNameOfId(pluginId) === OFFICIAL_MARKETPLACE_NAME
          ? `A switch that keeps plugin settings isn't offered to this ${OFFICIAL_MARKETPLACE_DISPLAY} listing, because Claude Code doesn't count it as Anthropic's or a partner's`
          : `A switch that keeps plugin settings is offered only between ${OFFICIAL_MARKETPLACE_DISPLAY} and Anthropic's official marketplaces`;
      let copyMarketplaceLabel = qualifiedMarketplaceLabel(pluginId, "");
      let copyLabel =
        copyMarketplaceLabel === "" ? "this marketplace's copy" : `the ${copyMarketplaceLabel} copy`;
      let singleOther = otherInstalls.length === 0;
      let describeCopy = (install) => {
        let marketplaceLabel = qualifiedMarketplaceLabel(install.pluginId, "");
        return singleOther
          ? "it"
          : marketplaceLabel === ""
            ? "the one from another marketplace"
            : `the ${marketplaceLabel} one`;
      };
      let filtered = installs.filter((install) => install.scopes.includes("managed"));
      if (filtered.length > 0)
        return `${installedSummary}. ${singleOther ? "That one" : `The ${plural(filtered.length, "copy", "copies")} from ${marketplaceNamesOf(filtered)}`} ${plural(filtered.length, "was", "were")} installed by your organization (managed) and can't be uninstalled here, so ${copyLabel} can't be installed`;
      let switchableInstalls = keepSettingsFamily
        ? filtered_2.filter((install) =>
            install.scopes.some((scope) => scope === "user" || scope === "local"),
          )
        : [];
      let uninstallInstalls =
        switchableInstalls.length > 0
          ? installs.filter((install) => !switchableInstalls.includes(install))
          : installs;
      let mapped = [
        ...uninstallInstalls.flatMap((install) =>
          install.scopes.map((scope) => ({
            pluginId: install.pluginId,
            scope,
          })),
        ),
        ...switchableInstalls.flatMap((install) =>
          install.scopes
            .filter((scope) => scope === "project")
            .map((scope) => ({
              pluginId: install.pluginId,
              scope,
            })),
        ),
      ].map(({ pluginId, scope }) =>
        isCliSwitchable(pluginId)
          ? claudeCommand("plugin uninstall", pluginId, scope === "user" ? undefined : `--scope ${scope}`)
          : null,
      );
      let uninstallCommandChain =
        surface === "cli" && mapped.every((command) => command !== null) ? mapped.join(", then ") : null;
      let scopeNote = uninstallInstalls.some((install) => install.scopes.length > 1)
        ? `at each scope ${plural(uninstallInstalls.length, "it is", "they are")} installed at`
        : "";
      let joined = [
        ...uninstallInstalls,
        ...switchableInstalls.filter((install) => install.scopes.includes("project")),
      ]
        .filter((install) => install.scopes.some((scope) => scope !== "user"))
        .map(
          (install) =>
            ` ${capitalize(describeCopy(install))} is installed at ${formatList(install.scopes)} scope.`,
        )
        .concat(
          installs
            .filter((install) => install.requiredBy.length > 0)
            .map(
              (install) =>
                ` ${formatList(quoteIds(install.requiredBy))} ${plural(install.requiredBy.length, "needs", "need")} ${describeCopy(install)}.`,
            ),
        )
        .join("");
      let disableHint = (allInstalls, exclude = []) => {
        let filtered = uniq(allInstalls.flatMap((install) => install.requiredBy)).filter(
          (id) => !exclude.includes(id),
        );
        let dependentInstallCount = count(installs, (install) =>
          install.requiredBy.some((id) => filtered.includes(id)),
        );
        return filtered.length === 0
          ? ""
          : `disable ${formatList(quoteIds(filtered))} (${formatMissingCopiesWarning(filtered.length, dependentInstallCount)})`;
      };
      let unnamedNote = uninstallInstalls.every(
        (install) => marketplaceNameOfId(install.pluginId) === undefined,
      )
        ? `this message cannot name ${plural(uninstallInstalls.length, "it", "them")}; `
        : "";
      let disableHintText = disableHint(uninstallInstalls);
      if (switchableInstalls.length === 0) {
        let otherCopiesLabel = singleOther
          ? "the other one"
          : otherInstalls.length === 1
            ? "both"
            : "all of them";
        let uninstallInstruction =
          disableHintText === ""
            ? `To use ${copyLabel}, uninstall ${otherCopiesLabel} first`
            : `To use ${copyLabel}, first ${disableHintText}. Then uninstall ${otherCopiesLabel}`;
        let settingsNote = `(${unnamedNote}${singleOther ? "its " : ""}plugin settings are not carried over)`;
        return `${installedSummary}.${joined} ${switchExplanation}. ${uninstallCommandChain !== null ? `${uninstallInstruction}${scopeNote === "" ? "" : `, ${scopeNote}`} ${settingsNote}: ${uninstallCommandChain}` : `${uninstallInstruction} in /plugin \u2192 Installed${scopeNote === "" ? "" : `, ${scopeNote}`} ${settingsNote}`}`;
      }
      let filtered_3 = switchableInstalls.filter((install) => install.scopes.includes("project"));
      let uninstallInstruction = `${disableHintText === "" ? "First" : `First ${disableHintText}. Then`} uninstall the ${plural(uninstallInstalls.length, "copy", "copies")} from ${marketplaceNamesOf(uninstallInstalls)}`;
      let settingsNote = `(${unnamedNote}${plural(uninstallInstalls.length, "its", "their")} plugin settings are not carried over)`;
      let projectScopeNote =
        filtered_3.length > 0
          ? `, and the ${marketplaceNamesOf(filtered_3)} ${plural(filtered_3.length, "one", "ones")} at project scope`
          : "";
      let instructions =
        uninstallCommandChain !== null
          ? `${uninstallInstruction}${scopeNote === "" ? "" : ` ${scopeNote}`} ${settingsNote}${projectScopeNote}: ${uninstallCommandChain}`
          : `${uninstallInstruction} ${settingsNote} in /plugin \u2192 Installed${scopeNote === "" ? "" : `, ${scopeNote}`}${projectScopeNote}`;
      let thenDisableHint = disableHint(
        switchableInstalls,
        uninstallInstalls.flatMap((install) => install.requiredBy),
      );
      let leadIn = disableHintText === "" && thenDisableHint === "" ? "Then" : "After that";
      let switchInstruction =
        switchCommand !== null
          ? switchableInstalls.length === 1
            ? `${leadIn}, to switch and keep the settings of the ${marketplaceNamesOf(switchableInstalls)} copy: ${switchCommand}`
            : `${leadIn}, to switch the ${marketplaceNamesOf(switchableInstalls)} copies (keeps one set of plugin settings): ${switchCommand}`
          : `${leadIn === "Then" ? "Then" : "After that,"} open ${switchableInstalls.length === 1 ? `the ${marketplaceNamesOf(switchableInstalls)} one` : "one of the others"} ${uninstallCommandChain !== null ? "in /plugin \u2192 Installed" : "there"} and choose "Switch to ${marketplaceLabel}"`;
      return `${installedSummary}.${joined} ${switchExplanation}. ${instructions}. ${thenDisableHint === "" ? "" : `Then ${thenDisableHint}. `}${switchInstruction}`;
    }
    if (otherInstalls.length > 0) {
      let filtered = installs.filter((install) => !install.replaceable);
      if (filtered.length > 0)
        return `${installedSummary}, and not all of them can be switched. ${filtered.map((install) => installFromOtherMarketplace(pluginId, pluginName, [install], surface, scope, isOfficialFamily)).join(". ")}`;
      let otherCopiesLabel = otherInstalls.length === 1 ? "both" : "all of them";
      return switchCommand !== null
        ? `${installedSummary}. To switch ${otherCopiesLabel} to ${marketplaceLabel} (keeps one set of plugin settings): ${switchCommand}`
        : `${installedSummary}. To switch ${otherCopiesLabel}, open one in /plugin \u2192 Installed and choose "Switch to ${marketplaceLabel}"`;
    }
    if (firstInstall.scopes.includes("managed"))
      return `${installedSummary} by your organization (managed), so it can't be switched`;
    let dependentCount = firstInstall.requiredBy.length;
    if (dependentCount > 0)
      return `${installedSummary}, and ${quoteIds(firstInstall.requiredBy).join(", ")} ${plural(dependentCount, "needs", "need")} that one. Disable ${plural(dependentCount, "it", "them")} before switching (${formatMissingCopiesWarning(dependentCount, "that")})`;
    if (!firstInstall.replaceable) {
      let found = firstInstall.scopes.find((scope) => scope !== "user" && scope !== "local");
      let uninstallCommand = found
        ? claudeCommand("plugin uninstall", firstInstall.pluginId, `--scope ${found}`)
        : null;
      let joined = firstInstall.scopes.join(" and ");
      return `${installedSummary} at ${joined} scope, which can't be switched from here. Uninstall it first${uninstallCommand ? `: ${uninstallCommand}` : ""}`;
    }
    return switchCommand !== null
      ? `${installedSummary}. To switch to ${marketplaceLabel} (keeps your plugin settings): ${switchCommand}`
      : `${installedSummary}. To switch, open it in /plugin \u2192 Installed and choose "Switch to ${marketplaceLabel}"`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4450827-4450972 placement
/**
 * 去掉 12 位哈希后缀，纯哈希/unknown 返回 undefined。
 */
function displayableGitHeadName(name) {
  let replaced = name?.replace(/-[0-9a-f]{12}$/, "");
  return replaced === undefined ||
    replaced === "" ||
    replaced === "unknown" ||
    /^[0-9a-f]{12}(-[0-9a-f]{8})?$/.test(replaced)
    ? undefined
    : replaced;
}
export {
  PluginFolderHeldError,
  installPluginWithRecords,
  formatSharedDataFolderMessage,
  formatSwitchTargetChangedMessage,
  findOtherMarketplaceInstallBlocker,
  formatMoreInstallsThanShownMessage,
  installFromOtherMarketplace,
  displayableGitHeadName,
  canReplaceOfficialInstalls,
  truncateMarketplaceLabel,
  findSharedStorageConflict,
  describeNameCollision,
  qualifiedMarketplaceLabel,
  parsePluginAtMarketplace,
};
