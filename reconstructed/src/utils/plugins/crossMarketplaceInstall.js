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
  MAX_BINDINGS_FILE_BYTES,
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

//@ chunk-e6aww6q8.js:4431671-4432044 placement
/**
 * 拒绝安装的提示：插件会与另一个来自不同仓库的已安装插件共用数据目录，提示先卸载那个再安装。
 */
function formatSharedDataFolderMessage(name, dataDirConflictingRecord) {
  {
    let r = quotedPrintable(dataDirConflictingRecord.id, 200);
    return `"${quotedPrintable(name, 120)}" was not installed. It would use the same data folder as "${r}", which ${dataDirConflictingRecord.installed ? "is installed" : "was installed"} from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists. To free the name, ${runCommandHint(
      "plugin uninstall",
      dataDirConflictingRecord.id,
      {
        fallback: `uninstall "${r}" from the command line`,
      },
    )}, then install it again.`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4432044-4432083 placement
function isSameNormalizedPath(e, n) {
  return normalizePathForPlatform(e) === normalizePathForPlatform(n);
}
//@ chunk-e6aww6q8.js:4432083-4432171 placement
function sharedPluginStorageKind(e, n) {
  return isSameNormalizedPath(getPluginCacheDirIn("", e), getPluginCacheDirIn("", n))
    ? "folder"
    : isSameNormalizedPath(pluginDataDirPath(e), pluginDataDirPath(n))
      ? "data"
      : null;
}
//@ chunk-e6aww6q8.js:4432171-4432240 placement
function hasNoOtherMarketplaceInstalls(e, n) {
  return !n.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) && (e[n]?.length ?? 0) === 0;
}
//@ chunk-e6aww6q8.js:4432240-4432515 placement
function findDataDirHolders(e, n) {
  if (!hasNoOtherMarketplaceInstalls(e, n)) return [];
  return Object.entries(e).flatMap(([key, value]) => {
    let h = key !== n && value !== undefined && value.length > 0 ? sharedPluginStorageKind(key, n) : null;
    return h === null || value === undefined
      ? []
      : [
          {
            id: key,
            shares: h,
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
function findSharedStorageConflict(e, closure, plugins) {
  for (let s of e) {
    if (!hasNoOtherMarketplaceInstalls(plugins, s)) continue;
    let dataDirHolders = findDataDirHolders(plugins, s);
    if (dataDirHolders.length > 0)
      return {
        pluginId: s,
        sharedWith: "installed",
        holders: dataDirHolders,
      };
    for (let y of closure) {
      let S = y !== s && hasNoOtherMarketplaceInstalls(plugins, y) ? sharedPluginStorageKind(y, s) : null;
      if (S !== null)
        return {
          pluginId: s,
          sharedWith: "same-install",
          twin: y,
          shares: S,
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
class PluginFolderHeldError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  pluginCommandErrorCategory = "validation";
  holders;
  constructor(pluginNameCollision, holders) {
    super(pluginNameCollision, "plugin not installed: another installed plugin has one of its folders");
    this.name = "PluginFolderHeldError";
    this.holders = holders;
  }
}
//@ chunk-e6aww6q8.js:4436257-4443773 placement
/**
 * 安装插件并更新安装记录，记录与实际不符时拒绝。
 */
async function installPluginWithRecords(
  e,
  entry,
  r = "user",
  s,
  h,
  y,
  S,
  marketplaceInstallLocation,
  L,
  G,
  q,
  Z = {
    explicitInstall: false,
  },
  credentials,
  ke,
  gitHubHttpsFallback,
) {
  assertRecordablePluginId(e);
  let installedListRefusal = await getInstalledListRefusal(q);
  if (installedListRefusal !== undefined)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin "${quotedPrintable(e)}" was not installed: ${readInstalledPluginsFile(installedListRefusal)}`,
      "plugin not installed: the install records hold what this build cannot read",
    );
  let holders = findDataDirHolders(
    (isStorageV5Enabled() && q !== undefined ? await loadInstalledPlugins(q) : loadInstalledPluginsSync())
      .plugins,
    e,
  );
  if (holders.length > 0)
    throw new PluginFolderHeldError(
      findPluginNameCollision({
        refused: e,
        askedFor: e,
        sharedWith: "installed",
        holders,
        surface: "cli",
      }),
      holders,
    );
  let Ie = e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  let Me = Ie ? samePluginSource(entry.source, undefined) : undefined;
  let We = verifyReviewedCommit({
    pluginId: e,
    pluginName: entry.name,
    source: entry.source,
    boundByRecord: false,
    action: "installed",
  });
  if (!We.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      We.message,
      "plugin directory listing has no reviewed commit",
    );
  if (Ie) {
    if (Me === undefined)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `"${printableName(entry.name, 120)}" was not installed: its ${OFFICIAL_MARKETPLACE_DISPLAY} listing names no repository.`,
        "plugin directory listing names no repository",
      );
    if (Me.length > MAX_BINDINGS_FILE_BYTES)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `"${printableName(entry.name, 120)}" was not installed: the repository address in its ${OFFICIAL_MARKETPLACE_DISPLAY} listing is too long. Nothing was changed. Only a change to the listing can fix this.`,
        "plugin directory listing repository key too long",
      );
    let Kn =
      isStorageV5Enabled() && q !== undefined ? await loadInstalledPlugins(q) : loadInstalledPluginsSync();
    let Xn = hasFailedInstalledPluginsRead(Kn);
    let fo = bindingKeysFor(Kn.plugins, e);
    let To = pluginBindingValues(Kn.plugins, e);
    let bo = await seedDirectoryBindings(fo.length > 0 ? fo : [[e, []]]);
    let dataDirConflictingRecord = findDataDirConflictingRecord(Kn.plugins, bo, e, entry.source);
    if (isUnboundOfficialPlugin(e, To, bo, Xn))
      throw new PluginCachePublishError(
        "directory-binding-unreadable",
        `"${printableName(entry.name, 120)}" was not installed: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
        "plugin directory bindings file could not be read",
      );
    if (Xn) {
      let flattened = findBindingKeysFor(bo.keys(), e).flatMap((un) => bo.get(un) ?? []);
      let ko = flattened.find((un) => parseRepoWithRef(un) !== Me) ?? flattened[0];
      if (ko === undefined || parseRepoWithRef(ko) !== Me)
        throw new PluginCachePublishError(
          ko === undefined ? "directory-binding-unreadable" : "directory-identity-changed",
          ko === undefined
            ? `"${printableName(entry.name, 120)}" was not installed: installed_plugins.json in the plugins folder could not be read, so Claude Code cannot tell whether it is already installed from another repository. Nothing was changed. Try again once the file can be read.`
            : `"${printableName(entry.name, 120)}" was not installed: installed_plugins.json in the plugins folder could not be read, and plugin-directory-bindings.json records it as installed from a different repository than the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists. Nothing was changed. Try again once installed_plugins.json can be read.`,
          "plugin directory install records could not be read",
        );
    }
    let co = Xn ? pluginBindingValues(await readInstalledPluginsLenient(q), e) : To;
    if (isDirectoryRepositoryChanged(e, co, entry.source, bo))
      throw new PluginCachePublishError(
        "directory-identity-changed",
        dataDirConflictingRecord !== undefined
          ? formatSharedDataFolderMessage(entry.name, dataDirConflictingRecord)
          : (co?.length ?? 0) > 0
            ? `"${quotedPrintable(entry.name, 120)}" is already installed from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists under that name. Uninstall it first, then install it again.`
            : `"${quotedPrintable(entry.name, 120)}" was not installed. An earlier install under that name came from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists, and what it saved (options, secrets, data) may still be here. To delete that, ${runCommandHint(
                "plugin uninstall",
                e,
                {
                  fallback: `uninstall "${quotedPrintable(e, 200)}" from the command line`,
                },
              )}, then install it again.`,
        "plugin directory listing now names a different repository",
      );
  }
  let ze = Ie ? undefined : y;
  let lt = typeof entry.source === "string" && h ? h : entry.source;
  let Je =
    ze &&
    typeof lt === "object" &&
    (lt.source === "github" || lt.source === "url" || lt.source === "git-subdir")
      ? {
          ...lt,
          ref: ze.ref,
          sha: ze.sha,
        }
      : lt;
  let trustedSettingsEntryAuth = findSettingsArchiveEntry(marketplaceNameOfId(e), entry.name);
  if (Z.explicitInstall && typeof Je === "object" && Je.source === "archive") {
    let entryHelperConsentSubject = getEntryHelperConsentSubject(
      headersHelperNotRunReason({
        entry,
        archiveUrl: Je.url,
        marketplaceSource: L,
        trustedSettingsEntryAuth,
      }),
      Je.url,
    );
    let Xn =
      entryHelperConsentSubject === null ? null : headersHelperPolicyRefusal(L, marketplaceNameOfId(e));
    if (Xn !== null)
      throw new EntryHelperError(checkHeadersHelperConsent(entry.name, Xn), helperRefusalFailureCode(Xn));
    let fo = diffEntryHelperConsent(Z.consented, entryHelperConsentSubject);
    if (fo !== null)
      throw new EntryHelperError(
        describeHelperReview(fo, entry.name, "install"),
        HELPER_CONSENT_MISMATCH_CODES[fo],
      );
  }
  let pt = await cachePlugin(Je, {
    commandSourceConsent: G ?? {
      kind: "none",
      pluginId: e,
    },
    manifest: entry,
    containmentRoot: typeof entry.source === "string" && h ? marketplaceInstallLocation : undefined,
    archiveAuth: await resolveArchiveDownloadHeaders({
      pluginSource: Je,
      pluginName: entry.name,
      marketplaceName: marketplaceNameOfId(e),
      marketplaceSource: L,
      trustedMarketplaceAuth: findUrlMarketplaceHeaders(L, marketplaceNameOfId(e)),
      trustedSettingsEntryAuth,
      entry,
      runEntryHelper: Z.explicitInstall,
    }),
    entryDeclaresComponents: entryDeclaresComponents(entry),
    declaredComponentPaths: entryDeclaredComponentPaths(entry),
    storageV5: q,
    ...(isStorageV5Enabled() &&
      q !== undefined && {
        pluginId: e,
      }),
    isDirectoryPlugin: isOfficialDirectoryPlugin(e),
    directoryPin: pinnedSha(e, Je) ?? null,
    credentials,
    ...(isNpmPluginId(e) && {
      isNpmMarketplaceLane: true,
    }),
    gitHubHttpsFallback,
  });
  let Et = h || pt.path;
  let yt = h && marketplaceInstallLocation ? marketplaceInstallLocation : Et;
  let gt = typeof lt === "string" || getPluginCloneUrl(lt) !== null;
  let At;
  {
    let Kn = verifyReviewedCommit({
      pluginId: e,
      pluginName: entry.name,
      source: entry.source,
      boundByRecord: false,
      fetched: {
        gitCommitSha: pt.gitCommitSha,
      },
      action: "installed",
    });
    if (!Kn.ok) {
      await removeDirectoryTreeNoFollow_2(pt.path).catch(() => {});
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        Kn.message,
        "plugin directory fetch is not at the reviewed commit",
      );
    }
    if (ke !== undefined && !versionSatisfies(pt.manifest.version, ke)) {
      await removeDirectoryTreeNoFollow_2(pt.path).catch(() => {});
      throw new PinnedVersionMismatchError(pt.manifest.version);
    }
    At = Kn.reviewedCommit;
  }
  let gitCommitSha =
    At ??
    ze?.sha ??
    pt.gitCommitSha ??
    (gt ? await readInstalledPluginsIfAny(Et, yt) : undefined) ??
    (h &&
    marketplaceInstallLocation &&
    marketplaceNameOfId(e) === CLAUDE_PLUGINS_OFFICIAL &&
    !(await probePluginGitHead(Et, yt)).repo
      ? await pluginVersionOrNull(h)
      : undefined) ??
    undefined;
  let iso = new Date().toISOString();
  let npmResolution = isNpmPluginId(e) ? pt.npmResolution : undefined;
  let Zt =
    npmResolution?.version ??
    (await calculatePluginVersion(
      e,
      entry.source,
      pt.manifest,
      Et,
      {
        kind: "catalog",
        version: entry.version,
      },
      ze?.sha ?? pt.gitCommitSha,
      pt.contentSha256,
      yt,
    ));
  let rn = ze && (pt.manifest.version || entry.version) ? withShaSuffix(Zt, ze.sha) : Zt;
  let versionedCachePath = getVersionedCachePath(e, rn);
  let path = pt.path;
  let hn = orphanMarkerMove(pt.stagingScope, versionedCachePath);
  let ho = true;
  if (pt.path !== versionedCachePath) {
    let Kn = strictCacheAddressable(q);
    try {
      if (commandSourceSpecOf(Je)) {
        let Xn = Kn && (await versionParentState(versionedCachePath)) === "refused";
        let versionedZipCachePath = getVersionedZipCachePath(e, rn);
        let To =
          !Xn &&
          isPluginZipCacheEnabled() &&
          (Kn
            ? await strictArchivePresent(versionedZipCachePath, e, rn, () =>
                requireVersionParentContained(versionedCachePath, e, rn, "cache", "before reuse"),
              )
            : await pathExists(versionedZipCachePath));
        if (!Xn && !To && (await adoptStagedPlugin(pt.path, versionedCachePath, Kn, q, hn)))
          path = versionedCachePath;
        else {
          path = await copyPluginToVersionedCache(pt.path, e, rn, entry, undefined, {
            storageV5: q,
            credentials,
          });
          await removeDirectoryTreeNoFollow_2(pt.path).catch((error) => {
            logForDebugging(
              `Failed to remove the staging tree ${pt.path} after publishing: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
          });
          ho = false;
        }
      } else {
        let entries = Object.entries(pt.manifest.binaries ?? {});
        let fo = await publishStagedPlugin(
          pt.path,
          versionedCachePath,
          {
            pluginId: e,
            version: rn,
            strictCache: Kn,
            ...(entries.length > 0 &&
              shouldInstallBinaryAssets(e) && {
                binariesHook: {
                  declared: new Map(entries.map(([To, bo]) => [To, bo.sha256])),
                },
              }),
          },
          q,
          hn,
        );
        path = versionedCachePath;
        if (fo === "kept") ho = false;
      }
    } catch (error) {
      await removeDirectoryTreeNoFollow_2(pt.path).catch(() => {});
      throw error;
    }
  }
  if (ho && !isLinkModeCommandSource(Je)) {
    try {
      await unvouchBeforeDependencyStep(path, q);
      let Kn = await installPluginDependencies(path);
      if (Kn.error)
        logForDebugging(`Plugin dependency install warning for ${e}: ${Kn.error}`, {
          level: "warn",
        });
      await provisionBinaryAssets(path, e, {
        storageV5: q,
        credentials,
      });
      await rescreenCachedPluginTree(path, q);
    } catch (error) {
      await removeFreshCopyUnlessInUse(path, q);
      throw error;
    }
    if (isPluginZipCacheEnabled() && (await unmarkBeforeArchiving(path, q))) {
      let versionedZipCachePath = getVersionedZipCachePath(e, rn);
      await publishDirectoryAsZip(path, versionedZipCachePath);
      path = versionedZipCachePath;
    }
  }
  if (ze && pt.manifest.version && ze.version !== pt.manifest.version)
    logForDebugging(
      `Tag ${ze.ref} resolved to a commit whose plugin.json says version ${pt.manifest.version} \u2014 using tag-derived ${ze.version} for constraint checks`,
      {
        level: "warn",
      },
    );
  let recordsBefore = await addInstalledPlugin(
    e,
    {
      version: rn,
      installedAt: iso,
      lastUpdated: iso,
      installPath: path,
      gitCommitSha,
      ...(ze && {
        resolvedVersion: ze.version,
      }),
      ...(S && {
        auto: true,
      }),
      ...(Me !== undefined && {
        directoryRepositoryKey: Me,
      }),
      ...(typeof Je === "object" &&
        Je.source === "claudeai" && {
          claudeaiPluginId: Je.pluginId,
          ...(pt.contentSha256 !== undefined && {
            archiveSha256: pt.contentSha256,
          }),
        }),
      ...(typeof Je === "object" &&
        Je.source === "command" && {
          sourceCommand: describeCommandOutputMode(Je),
          ...(pt.producerPath !== undefined && {
            sourceProducerPath: pt.producerPath,
          }),
        }),
      ...(npmResolution !== undefined &&
        typeof Je === "object" &&
        Je.source === "npm" && {
          ...(Je.version !== undefined && {
            npmVersionSpec: Je.version,
          }),
          npmResolved: npmResolution.tarballUrl,
          ...(npmResolution.integrity !== undefined && {
            npmIntegrity: npmResolution.integrity,
          }),
          ...(Je.registry !== undefined && {
            npmRegistry: Je.registry,
          }),
        }),
    },
    r,
    s,
    q,
  );
  if (pt.producerPath !== undefined) recordProducerDir(pt.producerPath);
  return {
    path,
    recordedAt: iso,
    recordsBefore,
    manifestVersion: pt.manifest.version,
    depConstraints: pt.depConstraints,
    dependencies: pt.manifest.dependencies,
    defaultEnabled: pt.manifest.defaultEnabled,
  };
}
//@ chunk-e6aww6q8.js:4443773-4443885 placement
/**
 * 拆分 名@市场，格式不对返回 null。
 */
function parsePluginAtMarketplace(e) {
  let parts = e.split("@");
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
function qualifiedMarketplaceLabel(pluginId, n) {
  {
    let r = marketplaceNameOfId(pluginId);
    return r === undefined ? n : truncateMarketplaceLabel(r);
  }
  return n;
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
function formatMoreInstallsThanShownMessage(e) {
  return `More installs of "${quotedPrintable(e, 120)}" were found than were shown. Nothing was changed; open the plugin again to see them all`;
}
//@ chunk-e6aww6q8.js:4444133-4444317 placement
/**
 * 切换会替换的内容已变化、未做更改。
 */
function formatSwitchTargetChangedMessage(e) {
  return `What switching "${quotedPrintable(e, 120)}" would replace has changed since it was shown. Nothing was changed; open the plugin again to see whether a switch is still offered`;
}
//@ chunk-e6aww6q8.js:4444531-4444616 placement
function isOfficialFamilyEntry(e) {
  {
    let n = marketplaceNameOfId(e);
    return n === OFFICIAL_MARKETPLACE_NAME && isReviewerMarkedEntry(e.slice(0, -`@${n}`.length));
  }
  return false;
}
//@ chunk-e6aww6q8.js:4444616-4444842 placement
/**
 * 其他市场的安装都在官方市场族内，可直接替换。
 */
function canReplaceOfficialInstalls(e, n, r) {
  {
    if (n.length === 0) return false;
    let s = marketplaceNameOfId(e);
    if (n.some((h) => marketplaceNameOfId(h.pluginId) === undefined)) return false;
    if (s !== OFFICIAL_MARKETPLACE_NAME)
      return (
        isOfficialMarketplaceName_3(s) &&
        n.every((h) => marketplaceNameOfId(h.pluginId) === OFFICIAL_MARKETPLACE_NAME)
      );
    return (
      (r ?? isOfficialFamilyEntry(e)) &&
      n.every((h) => isOfficialMarketplaceName_3(marketplaceNameOfId(h.pluginId)))
    );
  }
  return false;
}
//@ chunk-e6aww6q8.js:4444842-4445182 placement
/**
 * 已从其他市场安装时的阻止判定：有不可替换的记录（或不能按官方规则替换）返回 installed-from-other-marketplace； 已安装记录多于展示给用户的返回 more-installed-than-shown；否则 undefined。
 */
function findOtherMarketplaceInstallBlocker(e, n, r, s) {
  {
    let y = n.find((S) => !S.replaceable) ?? (canReplaceOfficialInstalls(e, n, s) ? undefined : n[0]);
    if (y)
      return {
        reason: "installed-from-other-marketplace",
        blocking: y,
      };
    if (r !== undefined && n.some((S) => !r.includes(S.pluginId)))
      return {
        reason: "more-installed-than-shown",
      };
    return;
  }
  let [h] = n;
  return h === undefined
    ? undefined
    : {
        reason: "installed-from-other-marketplace",
        blocking: h,
      };
}
//@ chunk-e6aww6q8.js:4445182-4445353 placement
function formatMissingCopiesWarning(e, n) {
  return `without ${n === "that" ? "that copy" : `the ${plural(n, "copy", "copies")} ${plural(e, "it needs", "they need")}`}, turning ${plural(e, "it", "them")} back on may not work`;
}
//@ chunk-e6aww6q8.js:4445353-4450827 placement
/**
 * 插件已从其他市场安装时的处理：提示 --replace 或指定作用域。
 */
function installFromOtherMarketplace(e, n, r, s, scope = "user", y) {
  {
    let S = quotedPrintable(n, 120);
    let w = qualifiedMarketplaceLabel(e, "this marketplace");
    let L =
      s === "cli"
        ? claudeCommand("plugin install", e, scope === "user" ? "--replace" : `--replace --scope ${scope}`)
        : null;
    let [G, ...q] = r;
    if (G === undefined) return `"${S}" is already installed from another marketplace`;
    let Z = (lt) =>
      new Intl.ListFormat("en", {
        type: "conjunction",
      }).format(lt);
    let Se = (lt) => Z(uniq(lt.map((Je) => qualifiedMarketplaceLabel(Je.pluginId, "another marketplace"))));
    let ke = (requiredBy) => requiredBy.map((Je) => `"${quotedPrintable(Je, 120)}"`);
    let we = (lt) => {
      let Je = marketplaceNameOfId(lt.pluginId);
      return Je !== OFFICIAL_MARKETPLACE_NAME && !isOfficialMarketplaceName_3(Je);
    };
    let filtered = r.filter(we);
    let filtered_2 = r.filter((lt) => !we(lt));
    let Ie = (pluginId) => marketplaceNameOfId(pluginId) !== undefined && isSafeCliArg(pluginId);
    let Me = (lt) => {
      let Je = filtered.every((pt) => Ie(pt.pluginId))
        ? ` (${filtered.map((pt) => `"${quotedPrintable(pt.pluginId, 200)}"`).join(", ")})`
        : "";
      let nt = plural(filtered.length, "a plugin", "plugins");
      return `${lt ? capitalize(nt) : nt} installed here from ${Se(filtered)}${Je} ${plural(filtered.length, "is", "are")} listed there at the same repository and folder as "${S}"`;
    };
    let We =
      filtered.length === 0
        ? `"${S}" is already installed from ${Se(filtered_2)}`
        : filtered_2.length === 0
          ? Me(true)
          : `"${S}" is already installed from ${Se(filtered_2)}, and ${Me(false)}`;
    if (!canReplaceOfficialInstalls(e, r, y)) {
      let lt = y ?? isOfficialFamilyEntry(e);
      let Je =
        !lt && marketplaceNameOfId(e) === OFFICIAL_MARKETPLACE_NAME
          ? `A switch that keeps plugin settings isn't offered to this ${OFFICIAL_MARKETPLACE_DISPLAY} listing, because Claude Code doesn't count it as Anthropic's or a partner's`
          : `A switch that keeps plugin settings is offered only between ${OFFICIAL_MARKETPLACE_DISPLAY} and Anthropic's official marketplaces`;
      let nt = qualifiedMarketplaceLabel(e, "");
      let pt = nt === "" ? "this marketplace's copy" : `the ${nt} copy`;
      let Et = q.length === 0;
      let yt = (So) => {
        let ko = qualifiedMarketplaceLabel(So.pluginId, "");
        return Et ? "it" : ko === "" ? "the one from another marketplace" : `the ${ko} one`;
      };
      let filtered = r.filter((So) => So.scopes.includes("managed"));
      if (filtered.length > 0)
        return `${We}. ${Et ? "That one" : `The ${plural(filtered.length, "copy", "copies")} from ${Se(filtered)}`} ${plural(filtered.length, "was", "were")} installed by your organization (managed) and can't be uninstalled here, so ${pt} can't be installed`;
      let At = lt
        ? filtered_2.filter((So) => So.scopes.some((scope) => scope === "user" || scope === "local"))
        : [];
      let It = At.length > 0 ? r.filter((So) => !At.includes(So)) : r;
      let mapped = [
        ...It.flatMap((So) =>
          So.scopes.map((scope) => ({
            pluginId: So.pluginId,
            scope,
          })),
        ),
        ...At.flatMap((So) =>
          So.scopes
            .filter((scope) => scope === "project")
            .map((scope) => ({
              pluginId: So.pluginId,
              scope,
            })),
        ),
      ].map(({ pluginId, scope }) =>
        Ie(pluginId)
          ? claudeCommand("plugin uninstall", pluginId, scope === "user" ? undefined : `--scope ${scope}`)
          : null,
      );
      let Zt = s === "cli" && mapped.every((So) => So !== null) ? mapped.join(", then ") : null;
      let rn = It.some((So) => So.scopes.length > 1)
        ? `at each scope ${plural(It.length, "it is", "they are")} installed at`
        : "";
      let joined = [...It, ...At.filter((So) => So.scopes.includes("project"))]
        .filter((So) => So.scopes.some((scope) => scope !== "user"))
        .map((So) => ` ${capitalize(yt(So))} is installed at ${Z(So.scopes)} scope.`)
        .concat(
          r
            .filter((So) => So.requiredBy.length > 0)
            .map(
              (So) => ` ${Z(ke(So.requiredBy))} ${plural(So.requiredBy.length, "needs", "need")} ${yt(So)}.`,
            ),
        )
        .join("");
      let no = (So, ko = []) => {
        let filtered = uniq(So.flatMap(($o) => $o.requiredBy)).filter(($o) => !ko.includes($o));
        let ao = count(r, ($o) => $o.requiredBy.some((yo) => filtered.includes(yo)));
        return filtered.length === 0
          ? ""
          : `disable ${Z(ke(filtered))} (${formatMissingCopiesWarning(filtered.length, ao)})`;
      };
      let hn = It.every((So) => marketplaceNameOfId(So.pluginId) === undefined)
        ? `this message cannot name ${plural(It.length, "it", "them")}; `
        : "";
      let ho = no(It);
      if (At.length === 0) {
        let So = Et ? "the other one" : q.length === 1 ? "both" : "all of them";
        let ko =
          ho === ""
            ? `To use ${pt}, uninstall ${So} first`
            : `To use ${pt}, first ${ho}. Then uninstall ${So}`;
        let un = `(${hn}${Et ? "its " : ""}plugin settings are not carried over)`;
        return `${We}.${joined} ${Je}. ${Zt !== null ? `${ko}${rn === "" ? "" : `, ${rn}`} ${un}: ${Zt}` : `${ko} in /plugin \u2192 Installed${rn === "" ? "" : `, ${rn}`} ${un}`}`;
      }
      let filtered_3 = At.filter((So) => So.scopes.includes("project"));
      let Kn = `${ho === "" ? "First" : `First ${ho}. Then`} uninstall the ${plural(It.length, "copy", "copies")} from ${Se(It)}`;
      let Xn = `(${hn}${plural(It.length, "its", "their")} plugin settings are not carried over)`;
      let fo =
        filtered_3.length > 0
          ? `, and the ${Se(filtered_3)} ${plural(filtered_3.length, "one", "ones")} at project scope`
          : "";
      let To =
        Zt !== null
          ? `${Kn}${rn === "" ? "" : ` ${rn}`} ${Xn}${fo}: ${Zt}`
          : `${Kn} ${Xn} in /plugin \u2192 Installed${rn === "" ? "" : `, ${rn}`}${fo}`;
      let bo = no(
        At,
        It.flatMap((So) => So.requiredBy),
      );
      let vn = ho === "" && bo === "" ? "Then" : "After that";
      let co =
        L !== null
          ? At.length === 1
            ? `${vn}, to switch and keep the settings of the ${Se(At)} copy: ${L}`
            : `${vn}, to switch the ${Se(At)} copies (keeps one set of plugin settings): ${L}`
          : `${vn === "Then" ? "Then" : "After that,"} open ${At.length === 1 ? `the ${Se(At)} one` : "one of the others"} ${Zt !== null ? "in /plugin \u2192 Installed" : "there"} and choose "Switch to ${w}"`;
      return `${We}.${joined} ${Je}. ${To}. ${bo === "" ? "" : `Then ${bo}. `}${co}`;
    }
    if (q.length > 0) {
      let filtered = r.filter((nt) => !nt.replaceable);
      if (filtered.length > 0)
        return `${We}, and not all of them can be switched. ${filtered.map((nt) => installFromOtherMarketplace(e, n, [nt], s, scope, y)).join(". ")}`;
      let Je = q.length === 1 ? "both" : "all of them";
      return L !== null
        ? `${We}. To switch ${Je} to ${w} (keeps one set of plugin settings): ${L}`
        : `${We}. To switch ${Je}, open one in /plugin \u2192 Installed and choose "Switch to ${w}"`;
    }
    if (G.scopes.includes("managed")) return `${We} by your organization (managed), so it can't be switched`;
    let ze = G.requiredBy.length;
    if (ze > 0)
      return `${We}, and ${ke(G.requiredBy).join(", ")} ${plural(ze, "needs", "need")} that one. Disable ${plural(ze, "it", "them")} before switching (${formatMissingCopiesWarning(ze, "that")})`;
    if (!G.replaceable) {
      let found = G.scopes.find((scope) => scope !== "user" && scope !== "local");
      let Je = found ? claudeCommand("plugin uninstall", G.pluginId, `--scope ${found}`) : null;
      let joined = G.scopes.join(" and ");
      return `${We} at ${joined} scope, which can't be switched from here. Uninstall it first${Je ? `: ${Je}` : ""}`;
    }
    return L !== null
      ? `${We}. To switch to ${w} (keeps your plugin settings): ${L}`
      : `${We}. To switch, open it in /plugin \u2192 Installed and choose "Switch to ${w}"`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4450827-4450972 placement
/**
 * 去掉 12 位哈希后缀，纯哈希/unknown 返回 undefined。
 */
function displayableGitHeadName(e) {
  let replaced = e?.replace(/-[0-9a-f]{12}$/, "");
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
