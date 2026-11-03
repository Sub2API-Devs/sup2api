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
import {
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
  sep,
  sep as sep_2,
  sep as sep_3,
  sep as sep_4,
  sep as sep_5,
  sep as sep_6,
  sep as sep_7,
  sep as sep_8,
  sep as sep_9,
  sep as sep_10,
  sep as sep_11,
  sep as sep_12,
  sep as sep_13,
  sep as sep_14,
  sep as sep_15,
  sep as sep_16,
  sep as sep_17,
  sep as sep_18,
  sep as sep_19,
  sep as sep_20,
  sep as sep_21,
  sep as sep_22,
  sep as sep_23,
  sep as sep_24,
  sep as sep_25,
  sep as sep_26,
  sep as sep_27,
  sep as sep_28,
  sep as sep_29,
  sep as sep_30,
  sep as sep_31,
  sep as sep_32,
  sep as sep_33,
  sep as sep_34,
  sep as sep_35,
  sep as sep_36,
  sep as sep_37,
  sep as sep_38,
  sep as sep_39,
  sep as sep_40,
  sep as sep_41,
  sep as sep_42,
  sep as sep_43,
  sep as sep_44,
  sep as sep_45,
  sep as sep_46,
  sep as sep_47,
  sep as sep_48,
  sep as sep_49,
  sep as sep_50,
  sep as sep_51,
  sep as sep_52,
  sep as sep_53,
  sep as sep_54,
  sep as sep_55,
  sep as sep_56,
  sep as sep_57,
  sep as sep_58,
  sep as sep_59,
  sep as sep_60,
  sep as sep_61,
  sep as sep_62,
  sep as sep_63,
  sep as sep_64,
  sep as sep_65,
  sep as sep_66,
  sep as sep_67,
  sep as sep_68,
  sep as sep_69,
  sep as sep_70,
  sep as sep_71,
  sep as sep_72,
  sep as sep_73,
} from "path";
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
  Eq,
  getMarketplaceCacheOnly,
  getPluginById,
  collectOrgBlockedPlugins,
  isListingBlocked,
  ugn,
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
  vct,
  restoreEarlierInstallRecord,
  removePluginInstallation,
  readInstalledPluginsFile,
  formatInvalidPluginIdMessage,
  getInstalledGitCommitSha,
} from "./installedPluginsManager.js";
import {
  probePluginGitHead,
  pct,
  Xj,
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
import { findBindingKeysFor, xSe, lpe } from "./pluginDirectoryBindings.js";
import { samePluginSource, parseRepoWithRef } from "./pluginSourceUrl.js";
import { uniq } from "../collections.js";
import { OFFICIAL_MARKETPLACE_NAME, OFFICIAL_MARKETPLACE_DISPLAY } from "./officialMarketplaceNames.js";
import { getPluginSeedDirs, L2e } from "./pluginDirectories.js";
import { X5 } from "./claudeAiMarketplaces.js";
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
  bJr,
  qP,
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
  Qft,
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
import { getEnabledPluginIdsInSource, af } from "./pluginPolicy.js";
import {
  getSettingsForSourceForUpkeep,
  getSettingsForSourceWriteSeed,
  getSettingsForSource,
  updateSettingsForSourceWithTransform,
} from "../settings/settings.js";
import { getEnabledSettingSources } from "../settings/constants.js";
import { printableName, quotedPrintable } from "../printableName.js";
import { markPluginVersionOrphaned, ic } from "./cacheUtils.js";
import { logError } from "../log.js";
import { E$e, Eie } from "./headersHelper.js";
import { PinnedVersionMismatchError, i5 } from "./cachePublish.js";
import { isToolDetailsLoggingEnabled, sanitizeVersion } from "../../services/analytics/metadata.js";
import { logOTelEvent } from "../telemetry/events.js";
import { plural } from "../stringUtils.js";
import { logEvent } from "../../services/analytics/index.js";
import { fromEnum, lit as lit_2 } from "../../services/analytics/safeMetadata.js";
import { directoryInstallFields } from "./pluginDirectoryTelemetry.js";
import {
  buildPluginEventFields,
  dpe,
  buildPluginVersionShaField,
  classifyPluginCommandError,
} from "../telemetry/pluginTelemetry.js";
import { findPluginNameCollision } from "./pluginNameCollision.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { redactUrlsInMessage } from "../redaction/urlRedaction.js";
import { Bd } from "./commandSource.js";

/**
 * 两条安装记录是否等价（路径、更新时间相同且 auto 标记不降级）。
 */
//@ chunk-e6aww6q8.js:4354776-4354890 fingerprint = registerPluginInstallation (0.567)
function registerPluginInstallation(e, n) {
  return (
    e.installPath === n.installPath && e.lastUpdated === n.lastUpdated && (n.auto !== !0 || e.auto === !0)
  );
}
/**
 * 把一个 marketplace 插件下载缓存并写入安装记录（拒绝不安全的条目路径）。
 */
//@ chunk-e6aww6q8.js:4365510-4366714 callgraph-fingerprint = cacheAndRegisterPlugin (0.165)
async function cacheAndRegisterPlugin(e, n, r, s, h, y, S) {
  let w = await resolvePluginEntryPath(e, s, r, h, tryUnwrapTextPayload(), S),
    { entryPath: entryPath, reason: reason } = y ? entryPathOrReason(w) : entryPathOrReasonLenient(w);
  if (entryPath === void 0) {
    logForDebugging(`Skipping ${jsonStringify(e)}: ${reason} (refused, not probed)`, { level: "warn" });
    return;
  }
  let q = await readManifestVersion(entryPath, e, S),
    Z =
      w.kind === "ok" || w.kind === "location-missing" || w.kind === "location-error"
        ? w.marketplaceDir
        : entryPath,
    cacheResult = await probePluginGitHead(entryPath, Z),
    ke = cacheResult.repo ? (cacheResult.sha ?? void 0) : void 0,
    we = !cacheResult.repo && parsePluginIdentifier(e).marketplace === CLAUDE_PLUGINS_OFFICIAL,
    Ee = we ? await pct(entryPath) : null,
    Ae = ke ?? Ee ?? void 0;
  if (q === "unknown" && n.version) q = n.version;
  if (q === "unknown" && Ae) q = Ae.substring(0, 12);
  if (q === "unknown") {
    let Me = we ? (Ee ?? null) : await Xj(entryPath);
    if (Me) q = Me.substring(0, 12);
  }
  let tempPath = getVersionedCachePath(e, q);
  if (y) {
    try {
      tempPath = await copyPluginToVersionedCache(entryPath, e, q, n, s, {
        storageV5: isStorageV5Enabled() ? S : void 0,
      });
    } catch (error) {
      logForDebugging(
        `Cannot materialize versioned cache for ${e} from ${entryPath}: ${errorMessage(error)}, skipping`,
      );
      try {
        let We = strictCacheAddressable(S);
        if (
          (!We ||
            ((await versionParentContained(tempPath)) && (await classifyCacheEntry(tempPath)) === "other")) &&
          !(await cacheDirHasPluginContentStrict(tempPath, S)) &&
          !(We && (await isPluginVersionInUse(tempPath, { excludeSelf: !0 }, S).catch(() => !0)))
        )
          if (We) await removeVersionDirIfIdle(tempPath);
          else await getFsImplementation().rm(tempPath, { recursive: !0, force: !0 });
      } catch {}
      return;
    }
    if (!(await pluginInstallPathExists(tempPath, S))) {
      logForDebugging(
        `Cannot materialize versioned cache for ${e}: no readable plugin payload at ${tempPath}, skipping`,
      );
      return;
    }
  }
  return {
    installPath: tempPath,
    version: q,
    gitCommitSha: Ae,
    keepStoredCommit: (cacheResult.repo && cacheResult.sha === null) || (we && Ee === void 0),
  };
}
/**
 * 安装路径是否存在（zip 查文件，目录查缓存完整）。
 */
//@ chunk-e6aww6q8.js:4366714-4366773 placement = getVersionedZipCachePath (1)
function pluginInstallPathExists(pluginId, version) {
  return pluginId.endsWith(".zip") ? pathExists(pluginId) : cacheDirHasPluginContentStrict(pluginId, version);
}
//@ chunk-e6aww6q8.js:4366773-4366842 placement
function eVe(e, n) {
  return findBindingKeysFor(Object.keys(e), n).map((r) => [r, e[r] ?? []]);
}
//@ chunk-e6aww6q8.js:4366842-4366922 placement
function Qj(e, n) {
  let r = eVe(e, n);
  return r.length === 0 ? void 0 : r.flatMap(([, s]) => s);
}
/**
 * 同目录名插件绑定到不同仓库时返回冲突者。
 */
//@ chunk-e6aww6q8.js:4366922-4367185 placement
function findDataDirConflictingRecord(e, n, r, s) {
  let h = samePluginSource(s, void 0),
    y = (w) => w !== void 0 && parseRepoWithRef(w) !== h,
    found = uniq([...findBindingKeysFor(Object.keys(e), r), ...findBindingKeysFor(n.keys(), r)]).find(
      (w) => (e[w] ?? []).some((L) => y(L.directoryRepositoryKey)) || y(n.get(w)),
    );
  return found === void 0 || found === r ? void 0 : { id: found, installed: (e[found]?.length ?? 0) > 0 };
}
/**
 * 官方插件目录插件的仓库与当前来源不同。
 */
//@ chunk-e6aww6q8.js:4367185-4367294 placement
function isDirectoryRepositoryChanged(e, n, r, s) {
  {
    if (isUnboundOfficialPlugin(e, n, s)) return !0;
    let h = samePluginSource(r, void 0);
    return getBoundRepositoryKeys(e, n, s).some((y) => y !== h);
  }
  return !1;
}
/**
 * 官方插件目录插件且尚无仓库绑定。
 */
//@ chunk-e6aww6q8.js:4367294-4367426 placement
function isUnboundOfficialPlugin(e, n, r, s = !1) {
  if (!e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) || !xSe(r)) return !1;
  return s || (n ?? []).every((h) => h.directoryRepositoryKey === void 0);
}
/**
 * 官方插件目录插件已记录的仓库键。
 */
//@ chunk-e6aww6q8.js:4367426-4367596 placement
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
    return (
      logForDebugging(`Cannot judge ${e} managed record: ${errorMessage(error)}, leaving it as is`),
      !0
    );
  }
}
//@ chunk-e6aww6q8.js:4367739-4368179 placement
async function parsePluginId(e, { installPath: installPath, claudeaiPluginId: claudeaiPluginId }, s, h) {
  if (claudeaiPluginId !== void 0) return !0;
  let { absolute: absolute, suspect: suspect } = classifyMarketplacePath(installPath);
  if (suspect) return !1;
  if (await pluginInstallPathExists(absolute, s)) return !0;
  if (
    getPluginSeedDirs().length > 0 &&
    (await probeSeedForPlugin(e, basename_9(absolute).replace(/\.zip$/, ""), "always")) !== null
  )
    return !0;
  let w = await h();
  if (isKnownMarketplacesReadFailure(w)) return !0;
  let { marketplace: marketplace } = parsePluginIdentifier(e),
    G = marketplace ? w[marketplace]?.source : void 0;
  if (G === void 0) return !1;
  if (X5(G)) return !0;
  if (!isLocalMarketplaceSource(G)) return !1;
  return typeof (await getPluginByIdCacheOnly(e, s))?.entry?.source === "string";
}
/**
 * 托管记录缺失缓存时从市场重新缓存注册。
 */
//@ chunk-e6aww6q8.js:4368179-4368533 placement
async function healManagedRecord(e, n, r) {
  try {
    let s = await getPluginByIdCacheOnly(e, r);
    if (!s || typeof s.entry.source !== "string") return;
    let { marketplace: marketplace } = parsePluginIdentifier(e),
      y = marketplace ? n?.[marketplace]?.source : void 0;
    if (isPluginBlockedByPolicy(e) || isSourceDisallowedOrUnverifiable(y) || L2e(s.entry.source, y)) return;
    return await cacheAndRegisterPlugin(e, s.entry, s.entry.source, s.marketplaceInstallLocation, n, !0, r);
  } catch (error) {
    logForDebugging(`Cannot heal ${e} managed record: ${errorMessage(error)}, leaving it as is`);
    return;
  }
}
//@ chunk-e6aww6q8.js:4368533-4368762 placement
function mergePreviousProducerPaths(e, n) {
  let r = e.sourceProducerPath !== void 0 && e.sourceProducerPath !== n ? [e.sourceProducerPath] : [];
  return [...(e.previousProducerPaths ?? []).filter((s) => s !== e.sourceProducerPath && s !== n), ...r]
    .filter((s) => s !== "")
    .slice(-MAX_PREVIOUS_PRODUCER_PATHS);
}
/**
 * 解析 base 下的相对路径，越界抛“Path traversal detected”。
 */
//@ chunk-e6aww6q8.js:4431505-4431671 fingerprint = validatePathWithinBase (1)
function validatePathWithinBase(basePath, relativePath) {
  let resolvedPath = resolve_58(basePath, relativePath),
    normalizedBase = resolve_58(basePath) + sep_69;
  if (!resolvedPath.startsWith(normalizedBase) && resolvedPath !== resolve_58(basePath))
    throw Error(`Path traversal detected: "${relativePath}" would escape the base directory`);
  return resolvedPath;
}
/**
 * 依赖解析错误转文本：依赖环、跨市场依赖不被允许（提示 allowCrossMarketplaceDependenciesOn）、依赖找不到等。
 */
//@ chunk-e6aww6q8.js:4450972-4451911 fingerprint = formatResolutionError (0.713)
function formatResolutionError(r_2) {
  switch (r_2.reason) {
    case "cycle":
      return `Dependency cycle: ${r_2.chain.map(displaySafePluginId).join(" \u2192 ")}`;
    case "cross-marketplace": {
      let depMkt = parsePluginIdentifier(r_2.dependency).marketplace,
        r = depMkt ? quoteName(displaySafeName(depMkt, bJr)) : void 0,
        s = r ? `marketplace ${r}` : "a different marketplace",
        h = r
          ? ` Add ${r} to allowCrossMarketplaceDependenciesOn in the ROOT marketplace's marketplace.json (the marketplace of the plugin you're installing \u2014 only its allowlist applies; no transitive trust).`
          : "";
      return `Dependency ${quoteName(displaySafePluginId(r_2.dependency))} (required by ${displaySafePluginId(r_2.requiredBy)}) is in ${s}, which is not in the allowlist \u2014 cross-marketplace dependencies are blocked by default. Install it manually first.${h}`;
    }
    case "not-found": {
      let { marketplace: depMkt } = parsePluginIdentifier(r_2.missing),
        r = quoteName(displaySafePluginId(r_2.missing)),
        s = displaySafePluginId(r_2.requiredBy);
      return depMkt
        ? `Dependency ${r} (required by ${s}) not found. Is the ${quoteName(displaySafeName(depMkt, bJr))} marketplace added?`
        : `Dependency ${r} (required by ${s}) not found in any configured marketplace`;
    }
  }
}
/**
 * 安装已解析好的插件（核心安装流程）：解析依赖闭包、逐个缓存（cachePlugin+copyPluginToVersionedCache）、写安装记录与 enabledPlugins、处理 command 来源同意、userConfig、失败回滚；返回安装结果与依赖信息。
 */
//@ chunk-e6aww6q8.js:4462968-4478634 callgraph-witnessed = installResolvedPlugin (0.121)
async function installResolvedPlugin({
  pluginId: pluginId,
  entry: entry,
  scope: scope,
  marketplaceInstallLocation: marketplaceInstallLocation,
  trigger: trigger,
  explicit: explicit,
  consentedEntryHelper: consentedEntryHelper,
  auto: auto,
  requiredByEnabledDependent: requiredByEnabledDependent,
  commandSourceConsent: commandSourceConsent,
  replaceInstalledCopy: replaceInstalledCopy,
  replaceOnlyPluginIds: replaceOnlyPluginIds,
  switchTargetMarkedInItsOwnWalk: switchTargetMarkedInItsOwnWalk,
  switchWalkNotFresh: switchWalkNotFresh,
  storageV5: storageV5,
  gitHubHttpsFallback: gitHubHttpsFallback,
}) {
  let settingSource = scopeToSettingSource(scope),
    Ie = await getInstalledListRefusal(storageV5);
  if (Ie !== void 0) return { ok: !1, reason: "installed-list-held", held: Ie };
  let Me = await checkInstallAllowed(pluginId, entry, storageV5);
  if (!Me.ok) return Me.refusal;
  let { knownMarketplaces: knownMarketplaces, failClosedOnUnknownSource: failClosedOnUnknownSource } = Me,
    [lt, ...Je] =
      Eq() && !auto && !requiredByEnabledDependent
        ? await describeOtherMarketplaceInstalls(pluginId, entry, knownMarketplaces, storageV5)
        : [],
    nt = lt ? [lt, ...Je] : void 0;
  if (nt && replaceInstalledCopy && switchWalkNotFresh !== void 0)
    return {
      ok: !1,
      reason: "switch-needs-fresh-listing",
      pluginName: entry.name,
      detail: switchWalkNotFresh,
      installedCopies: nt,
    };
  if (
    replaceInstalledCopy &&
    (await resolveDelistedPluginId(replaceOnlyPluginIds, nt ?? [], storageV5)).length > 0
  )
    return { ok: !1, reason: "fewer-installed-than-shown", pluginName: entry.name };
  let pt =
    nt && replaceInstalledCopy
      ? findOtherMarketplaceInstallBlocker(pluginId, nt, replaceOnlyPluginIds, switchTargetMarkedInItsOwnWalk)
      : void 0;
  if (pt?.reason === "more-installed-than-shown")
    return { ok: !1, reason: "more-installed-than-shown", pluginName: entry.name };
  if (nt && (!replaceInstalledCopy || pt !== void 0))
    return {
      ok: !1,
      reason: "installed-from-other-marketplace",
      pluginName: entry.name,
      installedCopies: nt,
    };
  let depInfo = new Map();
  if (isRelativeSourcePath(entry.source) && !marketplaceInstallLocation)
    return { ok: !1, reason: "local-source-no-location", pluginName: entry.name };
  if (marketplaceInstallLocation)
    depInfo.set(pluginId, { entry: entry, marketplaceInstallLocation: marketplaceInstallLocation });
  let rootMarketplace = parsePluginIdentifier(pluginId).marketplace,
    allowedCrossMarketplaces = new Set(
      (rootMarketplace
        ? (await getMarketplaceCacheOnly(rootMarketplace, storageV5))?.allowCrossMarketplaceDependenciesOn
        : void 0) ?? [],
    ),
    At = scope !== "user" ? getCwd() : void 0,
    plugins = (
      isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
    ).plugins,
    Yt = new Set();
  for (let nr of getEnabledPluginIdsInSource(settingSource))
    if (qP(plugins[nr], scope, At) !== void 0) Yt.add(nr);
  let qt = await loadAllPluginsCacheOnly(storageV5),
    combined = qt.enabled.concat(qt.disabled),
    rn = new Map();
  for (let nr of combined) rn.set(nr.source, nr.resolvedVersion ?? nr.manifest.version);
  let pn = getSettingsForSourceForUpkeep(settingSource)?.enabledPlugins,
    no = new Set();
  for (let nr of combined) {
    if (!nr.depConstraints) continue;
    for (let [Ti, Vs] of nr.depConstraints) {
      if (Vs.version === void 0) continue;
      let _i = qualifyDependency(Ti, nr.source);
      if (Array.isArray(pn?.[_i])) continue;
      if (
        isPluginBlockedByPolicy(_i) ||
        findBlockedMarketplace(_i, knownMarketplaces, {
          failClosedOnUnknownSource: failClosedOnUnknownSource,
        })
      ) {
        logForDebugging(
          `installResolvedPlugin: ${_i} version-unsatisfied but policy-blocked; not force-including`,
        );
        continue;
      }
      if (!versionSatisfies(rn.get(_i), Vs.version)) {
        if (isPluginDirectoryMarketplace(_i, knownMarketplaces)) {
          let jo = depInfo.get(_i) ?? (await getPluginById(_i, storageV5, "update")),
            Qr = await collectOrgBlockedPlugins(storageV5);
          if (
            jo
              ? isListingBlocked(jo.entry, Qr)
              : Qr !== null || isListingRepositoryBlockedByHostPolicy(void 0)
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
  let hn = await resolveDependencyClosure(
    pluginId,
    async (nr) => {
      if (depInfo.has(nr)) return depInfo.get(nr).entry;
      if (nr === pluginId) return entry;
      let Ti = await getPluginById(nr, storageV5, no.has(nr) ? "update" : "install");
      if (Ti) depInfo.set(nr, Ti);
      return Ti?.entry ?? null;
    },
    Yt,
    allowedCrossMarketplaces,
    no,
  );
  if (!hn.ok) return { ok: !1, reason: "resolution-failed", resolution: hn };
  let found = hn.closure.find((id) => !vct(id));
  if (found !== void 0) return { ok: !1, reason: "unrecordable-plugin-id", pluginId: found };
  for (let nr of hn.closure) {
    if (nr === pluginId || Yt.has(nr)) continue;
    if (isPluginBlockedByPolicy(nr))
      return {
        ok: !1,
        reason: "dependency-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: nr,
      };
    let info = await pluginDirectoryUnavailableReason(nr);
    if (info !== null)
      return {
        ok: !1,
        reason: "plugin-directory-unavailable",
        pluginName: entry.name,
        cause: info,
        unavailableDependency: nr,
      };
    let Vs = findBlockedMarketplace(nr, knownMarketplaces, {
      failClosedOnUnknownSource: failClosedOnUnknownSource,
    });
    if (Vs)
      return {
        ok: !1,
        reason: "dependency-marketplace-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: nr,
        marketplaceName: Vs,
      };
    let _i = depInfo.get(nr)?.entry;
    if (_i !== void 0 && (await Qft(nr, _i, knownMarketplaces, storageV5)))
      return {
        ok: !1,
        reason: "dependency-blocked-by-policy",
        pluginName: entry.name,
        blockedDependency: nr,
      };
  }
  let plugins_2 = (
      isStorageV5Enabled() && storageV5 !== void 0
        ? await loadInstalledPlugins(storageV5)
        : loadInstalledPluginsSync()
    ).plugins,
    Kn = findSharedStorageConflict(hn.closure, hn.closure, plugins_2);
  if (Kn !== null) return { ok: !1, reason: "plugin-folder-held", ...Kn, rootKept: !1 };
  let Xn = { ...(getSettingsForSourceWriteSeed(settingSource)?.enabledPlugins ?? {}) },
    fo = {};
  for (let nr of getEnabledSettingSources())
    Object.assign(fo, getSettingsForSource(nr)?.enabledPlugins ?? {});
  let To = new Set(Object.keys(fo).filter((nr) => fo[nr] !== void 0)),
    bo =
      requiredByEnabledDependent === !0 ||
      combined.some((nr) => {
        if (nr.source === pluginId) return !1;
        let Ti = fo[nr.source];
        return (
          (Ti !== void 0 ? Ti === !0 || Array.isArray(Ti) : nr.manifest.defaultEnabled !== !1) &&
          (nr.manifest.dependencies ?? []).some((_i) =>
            dependencyRefMatches(qualifyDependency(_i, nr.source), pluginId, nr.source),
          )
        );
      });
  function vn(nr) {
    return nr === pluginId ? entry : depInfo.get(nr)?.entry;
  }
  let co = new Map(),
    So = new Map();
  for (let id of hn.closure) {
    let Ti = vn(id);
    (co.set(id, Ti?.defaultEnabled ?? !0),
      So.set(
        id,
        (Ti?.dependencies ?? []).map((Vs) => qualifyDependency(Vs, id)),
      ));
  }
  let ko = computeDependencyEnablement({
      closure: hn.closure,
      rootId: pluginId,
      rootRequiredByDependent: bo,
      priorEnabled: Xn,
      explicitAnywhere: To,
      defaultsById: co,
      dependenciesById: So,
    }),
    un = new Map(),
    ao = {};
  for (let id of hn.closure) {
    let Ti = Xn[id];
    ((ao[id] = Array.isArray(Ti) ? Ti : (ko.get(id) ?? !0)), un.set(id, ao[id]));
  }
  let { error: error } = await updateSettingsForSourceWithTransform(
    settingSource,
    (nr) => ({ enabledPlugins: { ...nr?.enabledPlugins, ...ao } }),
    void 0,
    storageV5,
  );
  if (error) return { ok: !1, reason: "settings-write-failed", message: error.message };
  async function yo(nr, Ti) {
    if (!isRelativeSourcePath(Ti.entry.source)) return;
    let { entryPath: entryPath, reason: reason } = entryPathOrReason(
      await resolvePluginEntryPath(
        nr,
        Ti.marketplaceInstallLocation,
        Ti.entry.source,
        knownMarketplaces,
        tryUnwrapTextPayload(),
        storageV5,
      ),
    );
    if (entryPath === void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `Cannot install ${printableName(nr, 120)}: ${reason}`,
        "plugin install marketplace entry path refused",
      );
    return entryPath;
  }
  let Ho = new Map(),
    rr = new Map(),
    br = new Set(),
    Hr = !1,
    closure = hn.closure;
  async function cs() {
    for (let [nr, Ti] of Ho) {
      Ho.delete(nr);
      let { records: records = [], recordedAt: recordedAt } = rr.get(nr) ?? {},
        jo = qP(
          (isStorageV5Enabled() && storageV5 !== void 0
            ? await loadInstalledPlugins(storageV5)
            : loadInstalledPluginsSync()
          ).plugins[nr],
          scope,
          At,
        ),
        Qr = qP(records, scope, At),
        fi = (auto === !0 || nr !== pluginId) && (Qr === void 0 || Qr.auto === !0),
        Ri = { installPath: Ti, lastUpdated: recordedAt ?? jo?.lastUpdated, ...(fi && { auto: !0 }) };
      if (
        jo !== void 0 &&
        (jo.installPath !== Ti ||
          (recordedAt !== void 0 && jo.lastUpdated !== recordedAt) ||
          (fi && jo.auto !== !0))
      ) {
        br.add(nr);
        continue;
      }
      if (Qr !== void 0) {
        if (jo !== void 0 && !(await restoreEarlierInstallRecord(nr, Qr, Ri, storageV5))) br.add(nr);
        continue;
      }
      if ((await removePluginInstallation(nr, scope, At, storageV5, Ri)) === !1) {
        br.add(nr);
        continue;
      }
      if (((Hr ||= nr === pluginId), records.length === 0)) await markPluginVersionOrphaned(Ti, storageV5);
    }
  }
  async function _r() {
    let nr = {};
    for (let jo of closure) {
      if (br.has(jo)) continue;
      nr[jo] = jo === pluginId && Ho.has(jo) && !Array.isArray(Xn[jo]) ? (ko.get(pluginId) ?? !0) : Xn[jo];
    }
    let { [pluginId]: Ti, ...Vs } = nr,
      { error: error } = await updateSettingsForSourceWithTransform(
        settingSource,
        (jo) => ({ enabledPlugins: Hr && jo?.enabledPlugins?.[pluginId] !== un.get(pluginId) ? Vs : nr }),
        { legacyRevocation: "skip" },
        storageV5,
      );
    if (error)
      logForDebugging(
        `Failed to roll back enabledPlugins after install failure for ${pluginId}: ${error.message}. Retry may skip un-cached deps; manually disable then reinstall to recover.`,
        { level: "error" },
      );
  }
  let Cr,
    Vr = new Map(),
    Oo = new Map(),
    jr = [],
    Or = new Set(),
    Io = [];
  try {
    if (!depInfo.has(pluginId)) {
      let Di = (await getPluginById(pluginId, storageV5, "install"))?.marketplaceInstallLocation;
      if (Di) depInfo.set(pluginId, { entry: entry, marketplaceInstallLocation: Di });
    }
    let nr = new Set(closure),
      { ranges: ranges, requirers: requirers } = collectDependencyVersionRanges(combined, nr),
      _i = new Map(),
      jo = new Map();
    async function Qr(Di) {
      switch (Di) {
        case "directory-pin-unsatisfied":
          await cs();
          break;
        case "range-conflict":
        case "no-matching-tag":
        case "plugin-folder-held":
          if (
            auto ||
            requiredByEnabledDependent ||
            Xn[pluginId] !== void 0 ||
            rr.get(pluginId)?.records.length !== 0
          )
            break;
          try {
            for (let yr of Ho.keys()) if (rr.get(yr)?.records.length !== 0) Ho.delete(yr);
            await cs();
          } catch (error) {
            (logError(error),
              logForDebugging(
                `What the failed install of ${pluginId} installed was not all taken out: ${errorMessage(error)}. Run \`claude plugin uninstall\` for it to recover.`,
                { level: "warn" },
              ));
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
      if (!yr) return { ok: !0, dependencies: void 0 };
      let Kr = [...(_i.get(Di) ?? []), ...(ranges.get(Di) ?? [])],
        Li,
        entry = yr.entry,
        Hi;
      if (Kr.length > 0) {
        let ta = intersectVersionConstraints(Kr);
        if (!ta.ok) return { ok: !1, reason: "range-conflict", dep: Di, ranges: Kr, why: ta.reason };
        if (Di.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)) Hi = ta.range === "*" ? void 0 : ta.range;
        else if (ta.range !== "*") {
          let Bs = getPluginCloneUrl(yr.entry.source),
            Ca = knownMarketplaces[parsePluginIdentifier(Di).marketplace ?? ""]?.source,
            tu = Bs === null && typeof yr.entry.source === "string",
            pd = tu ? getMarketplaceCloneUrl(Ca) : Bs;
          if (pd !== null) {
            let ga = await resolveVersionRange(pd, yr.entry.name, ta.range, jo);
            if (ga === null && !tu) return { ok: !1, reason: "no-matching-tag", dep: Di, range: ta.range };
            if (ga === null)
              logForDebugging(
                `materializeOne(${Di}): no ${yr.entry.name}--v* tag satisfying ${ta.range} on marketplace repo; falling through to HEAD copy`,
              );
            else if (((Li = ga), tu && typeof yr.entry.source === "string")) {
              let Hl = toRelativePluginSource(Ca, yr.entry.source);
              if (Hl !== null) entry = { ...yr.entry, source: Hl };
            }
          }
        }
      }
      let Xa = await installPluginWithRecords(
        Di,
        entry,
        scope,
        At,
        await yo(Di, { ...yr, entry: entry }),
        Li,
        auto === !0 || Di !== pluginId,
        yr.marketplaceInstallLocation,
        E$e(Di, knownMarketplaces),
        Di === pluginId && auto !== !0 ? commandSourceConsent : { kind: "none", pluginId: Di },
        storageV5,
        {
          explicitInstall: explicit && Di === pluginId,
          consented: Di === pluginId ? consentedEntryHelper : void 0,
        },
        void 0,
        Hi,
        Di !== pluginId && Yt.has(Di) ? void 0 : gitHubHttpsFallback,
      ).catch((ta) => {
        if (
          ta instanceof PinnedVersionMismatchError ||
          ta instanceof i5 ||
          ta instanceof PluginFolderHeldError
        )
          return ta;
        throw ta;
      });
      if (Xa instanceof PluginFolderHeldError)
        return {
          ok: !1,
          reason: "plugin-folder-held",
          pluginId: Di,
          sharedWith: "installed",
          holders: Xa.holders,
        };
      if (Xa instanceof i5) return { ok: !1, reason: Xa.reason, dep: Di, message: Xa.message };
      if (Xa instanceof PinnedVersionMismatchError)
        return {
          ok: !1,
          reason: "directory-pin-unsatisfied",
          dep: Di,
          message: `"${printableName(yr.entry.name, 120)}" from the ${OFFICIAL_MARKETPLACE_DISPLAY} is pinned to its listed commit (${Xa.manifestVersion ? `version ${printableName(Xa.manifestVersion, 120)}` : "no version"}), which does not satisfy ${printableName(Kr.join(", "), 120)} required by ${(requirers.get(Di) ?? []).map((ta) => `"${printableName(parsePluginIdentifier(ta).name, 120)}"`).join(", ")}.`,
        };
      (Ho.set(Di, Xa.path),
        rr.set(Di, { records: Xa.recordsBefore, recordedAt: Xa.recordedAt }),
        Vr.set(Di, Xa.defaultEnabled),
        Oo.set(Di, Xa.dependencies ?? []));
      for (let [ta, Bs] of Xa.depConstraints ?? []) {
        if (Bs.version === void 0) continue;
        let Ca = qualifyDependency(ta, Di);
        requirers.set(Ca, [...(requirers.get(Ca) ?? []), Di]);
        let tu = _i.get(Ca);
        if (tu) tu.push(Bs.version);
        else _i.set(Ca, [Bs.version]);
      }
      return { ok: !0, dependencies: Xa.dependencies ?? [] };
    }
    for (let Di = hn.closure.length - 1; Di >= 0; Di--) {
      let yr = hn.closure[Di];
      if (yr === void 0) continue;
      let Kr = yr !== pluginId && Yt.has(yr),
        Li;
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
        return (
          await Qr(Li.reason),
          Li.reason === "plugin-folder-held" ? { ...Li, rootKept: Ho.has(pluginId) } : Li
        );
      }
      for (let Qs of Li.dependencies ?? []) Or.add(qualifyDependency(Qs, yr));
      if (yr === pluginId) Cr = Li.dependencies;
    }
    let Ri = new Set((Cr ?? []).map((Di) => qualifyDependency(Di, pluginId)));
    for (let [Di, yr] of _i) {
      if (nr.has(Di) || (no.has(Di) && Ri.has(Di)) || !Yt.has(Di)) continue;
      let combined = yr.concat(ranges.get(Di) ?? []),
        Li = intersectVersionConstraints(combined);
      if (!Li.ok)
        return (
          await Qr("range-conflict"),
          { ok: !1, reason: "range-conflict", dep: Di, ranges: combined, why: Li.reason }
        );
      let info = rn.get(Di);
      if (Li.range !== "*" && !versionSatisfies(info, Li.range)) {
        let Hi =
          requirers.get(Di)?.includes(pluginId) === !0 &&
          !Array.isArray(pn?.[Di]) &&
          !isPluginBlockedByPolicy(Di) &&
          !findBlockedMarketplace(Di, knownMarketplaces, {
            failClosedOnUnknownSource: failClosedOnUnknownSource,
          });
        if (Hi) await _r();
        else await Qr("range-conflict");
        return {
          ok: !1,
          reason: "range-conflict",
          dep: Di,
          ranges: combined,
          why: "installed-unsatisfied",
          installed: info,
          suggestDependencyUpdate: Hi,
        };
      }
    }
    let Ja = [{ manifestDeps: Cr, declaringId: pluginId }];
    while (Ja.length > 0) {
      let Di = [];
      for (let { manifestDeps: manifestDeps, declaringId: declaringId } of Ja) {
        for (let Bs of manifestDeps ?? []) Or.add(qualifyDependency(Bs, declaringId));
        let ta = await autoInstallPluginDependencies({
          rootManifestDeps: manifestDeps,
          pluginId: declaringId,
          closureSet: nr,
          alreadyEnabled: Yt,
          forceInclude: no,
          rootMarketplace: rootMarketplace,
          allowedCrossMarketplaces: allowedCrossMarketplaces,
          knownMarketplaces: knownMarketplaces,
          failClosedOnUnknownSource: failClosedOnUnknownSource,
          depInfo: depInfo,
          storageV5: storageV5,
        });
        if (!ta.ok) {
          if ((await _r(), ta.blockedMarketplace))
            return {
              ok: !1,
              reason: "dependency-marketplace-blocked-by-policy",
              pluginName: entry.name,
              blockedDependency: ta.blockedDependency,
              marketplaceName: ta.blockedMarketplace,
            };
          return {
            ok: !1,
            reason: "dependency-blocked-by-policy",
            pluginName: entry.name,
            blockedDependency: ta.blockedDependency,
          };
        }
        jr.push(...ta.notFound.filter((Bs) => !qt.enabled.some((Ca) => Ca.source === Bs)));
        for (let id of ta.ids) {
          if (nr.has(id)) continue;
          (nr.add(id), closure.push(id), Di.push(id));
        }
      }
      if (Di.length === 0) break;
      let yr = findSharedStorageConflict(Di, closure, plugins_2);
      if (yr !== null)
        return (
          await Qr("plugin-folder-held"),
          { ok: !1, reason: "plugin-folder-held", ...yr, rootKept: Ho.has(pluginId) }
        );
      let Kr = {};
      for (let Hi of Di) ((Kr[Hi] = !0), un.set(Hi, !0));
      let { error: error } = await updateSettingsForSourceWithTransform(
        settingSource,
        (Hi) => ({ enabledPlugins: { ...Hi?.enabledPlugins, ...Kr } }),
        void 0,
        storageV5,
      );
      if (error) return (await _r(), { ok: !1, reason: "settings-write-failed", message: error.message });
      let Qs = [];
      for (let Hi of Di) {
        let Xa = Yt.has(Hi),
          ta;
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
          return (
            await Qr(ta.reason),
            ta.reason === "plugin-folder-held" ? { ...ta, rootKept: Ho.has(pluginId) } : ta
          );
        }
        Qs.push({ manifestDeps: ta.dependencies, declaringId: Hi });
      }
      Ja = Qs;
    }
  } catch (error) {
    throw (await _r(), error);
  }
  if (Cr !== void 0) {
    let nr = new Set(Cr.map((Ti) => qualifyDependency(Ti, pluginId)));
    for (let Ti of entry.dependencies ?? []) {
      let Vs = qualifyDependency(Ti, pluginId);
      if (!nr.has(Vs))
        logForDebugging(
          `Marketplace entry for ${pluginId} lists dependency "${Ti}" not present in plugin.json \u2014 catalog may be stale`,
        );
    }
  }
  let zo = new Map(),
    rs = new Map();
  for (let nr of closure) {
    let Ti = vn(nr);
    zo.set(nr, Ti?.defaultEnabled ?? Vr.get(nr) ?? !0);
    let mapped = (Ti?.dependencies ?? []).map((_i) => qualifyDependency(_i, nr));
    for (let _i of Oo.get(nr) ?? []) mapped.push(qualifyDependency(_i, nr));
    rs.set(nr, mapped);
  }
  let Es = computeDependencyEnablement({
      closure: closure,
      rootId: pluginId,
      rootRequiredByDependent: bo,
      priorEnabled: Xn,
      explicitAnywhere: To,
      defaultsById: zo,
      dependenciesById: rs,
    }),
    Nr = {};
  for (let nr of closure) {
    let Ti = Xn[nr],
      Vs = Es.get(nr) ?? !0;
    if (Ti !== void 0 && Ti !== Vs) continue;
    if (un.get(nr) !== Vs) Nr[nr] = Vs;
  }
  let Is = !0;
  if (Object.keys(Nr).length > 0) {
    let { error: error } = await updateSettingsForSourceWithTransform(
      settingSource,
      (Ti) => ({ enabledPlugins: { ...Ti?.enabledPlugins, ...Nr } }),
      void 0,
      storageV5,
    );
    if (error)
      ((Is = !1),
        logForDebugging(`Failed to apply defaultEnabled correction for ${pluginId}: ${error.message}`, {
          level: "warn",
        }));
  }
  let fs = getEnabledSettingSources(),
    index = fs.indexOf(settingSource);
  function Vi(nr) {
    for (let Ti = fs.length - 1; Ti > index; Ti--) {
      let mktLocation = getSettingsForSource(fs[Ti])?.enabledPlugins?.[nr];
      if (mktLocation !== void 0) return mktLocation === !1;
    }
    return !1;
  }
  let filtered = closure.filter((nr) => Es.get(nr) === !1 && (Is || un.get(nr) === !1)),
    filtered_2 = closure.filter((nr) => filtered.includes(nr) || Vi(nr));
  ic(storageV5);
  let marketplace = parsePluginIdentifier_2(pluginId).marketplace,
    wa = isOfficialMarketplaceName_3(marketplace),
    hr = wa || isToolDetailsLoggingEnabled();
  if (
    (logOTelEvent("plugin_installed", {
      ...(hr && { "plugin.name": entry.name }),
      ...(hr && entry.version && { "plugin.version": entry.version }),
      ...(hr && marketplace && { "marketplace.name": marketplace }),
      "marketplace.is_official": String(wa),
      ...(trigger && { "install.trigger": trigger }),
      ...(filtered.includes(pluginId) && { "install.disabled_by_default": "true" }),
    }),
    Eq() && [...Or].some((nr) => nr.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`)))
  ) {
    let nr = await lpe();
    for (let Ti of Or) {
      let { name: Vs, marketplace: marketplace } = parsePluginIdentifier(Ti),
        jo = Qj(plugins, Ti);
      if (
        marketplace !== OFFICIAL_MARKETPLACE_NAME ||
        Ho.has(Ti) ||
        (jo?.length ?? 0) === 0 ||
        jr.includes(Ti)
      )
        continue;
      let Qr = await ugn(Vs, storageV5);
      if (Qr === null) continue;
      let found = Qr.plugins.find((plugin) => plugin.name === Vs);
      if (found === void 0 || isDirectoryRepositoryChanged(Ti, jo, found.source, nr)) Io.push(Ti);
    }
  }
  let mi = "";
  if (jr.length > 0) {
    let nr = await getPluginDirectoryState();
    if (nr !== "unavailable") {
      let Ti = `@${OFFICIAL_MARKETPLACE_NAME}`,
        Vs =
          nr === "off"
            ? `the ${OFFICIAL_MARKETPLACE_DISPLAY} is off`
            : nr === "blocked"
              ? `the ${OFFICIAL_MARKETPLACE_DISPLAY} is blocked by your organization`
              : `the ${OFFICIAL_MARKETPLACE_DISPLAY} could not be read, or does not list it`,
        _i = uniq(jr),
        sliced = _i.slice(0, 5),
        Qr = _i.length - sliced.length;
      mi = `. Warning: ${sliced.map((fi) => `dependency "${quotedPrintable(fi, 120)}" was not installed (${fi.endsWith(Ti) ? Vs : "no marketplace you have added lists it"})`).join("; ")}${Qr > 0 ? `; and ${Qr} more` : ""}. "${quotedPrintable(entry.name, 120)}" will not load without ${plural(_i.length, "it", "them")}`;
    }
  }
  let Ha = "";
  if (Io.length > 0) {
    let depNote = uniq(Io),
      Ti = depNote.length === 1,
      joined = depNote
        .slice(0, 5)
        .map((id) => `"${quotedPrintable(id, 120)}"`)
        .join(", "),
      _i = depNote.length > 5 ? ` and ${depNote.length - 5} more` : "",
      jo = `"${quotedPrintable(entry.name, 120)}"`;
    Ha = `. Warning: ${Ti ? "dependency" : "dependencies"} ${joined}${_i} ${Ti ? "is" : "are"} installed, but the ${OFFICIAL_MARKETPLACE_DISPLAY}'s current listing will not keep ${Ti ? "it" : "them"} loading, and ${jo} will not load without ${Ti ? "it" : "them"}. Once ${Ti ? "it stops (it may have already)" : "they stop (they may have already)"}, \`claude plugin list\` says why`;
  }
  let $a = `${formatDependencyCountSuffix([...Ho.keys()].filter((nr) => nr !== pluginId))}${mi}${Ha}`;
  return {
    ok: !0,
    closure: hn.closure,
    depNote: $a,
    installedDisabled: filtered_2,
    installedDisabledByDefault: filtered,
    ...(nt && { replacedCopies: nt }),
    copiesInOtherProjects:
      Eq() && scope === "user" && auto !== !0
        ? await findOtherProjectInstalls(pluginId, entry, knownMarketplaces, storageV5)
        : [],
  };
}
/**
 * 记 tengu_plugin_install_failed。
 */
//@ chunk-e6aww6q8.js:4478634-4478990 layout
function logInstallFailed({
  reason: reason,
  errorKind: errorKind,
  pluginId: pluginId,
  entry: entry,
  marketplaceName: marketplaceName,
  trigger: trigger,
  surface: surface,
}) {
  logEvent("tengu_plugin_install_failed", {
    reason: fromEnum(reason),
    ...(errorKind && { error_kind: fromEnum(errorKind) }),
    ...directoryInstallFields({ pluginId: pluginId, surface: surface, replaced: !1 }),
    ...buildPluginEventFields(entry.name, marketplaceName, af()),
    plugin_id: dpe(pluginId),
    trigger: fromEnum(trigger),
    install_source: lit_2(trigger === "hint" ? "ui-suggestion" : "ui-discover"),
    ...(entry.version && { version: sanitizeVersion(entry.version) }),
  });
}
/**
 * 从市场安装一个插件（界面/推荐用的简化入口）：取条目、调用 installResolvedPlugin，失败记 tengu_plugin_install_failed。
 */
//@ chunk-e6aww6q8.js:4478990-4483311 fingerprint = installPluginFromMarketplace (0.494)
async function installPluginFromMarketplace(e) {
  let {
      pluginId: pluginId,
      entry: entry,
      marketplaceName: marketplaceName,
      scope: scope = "user",
      storageV5: storageV5,
    } = e,
    trigger = e.trigger,
    w = e.trigger === "hint" ? void 0 : e.surface;
  try {
    let pluginInfo = await getInstalledListRefusal(storageV5);
    if (pluginInfo !== void 0)
      return {
        success: !1,
        error: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(pluginInfo)}`,
        errorIsOurs: !0,
      };
    let marketplaceInstallLocation = (await getPluginById(pluginId, storageV5, "install"))
        ?.marketplaceInstallLocation,
      result = await installResolvedPlugin({
        pluginId: pluginId,
        entry: entry,
        scope: scope,
        marketplaceInstallLocation: marketplaceInstallLocation,
        trigger: "ui",
        explicit: e.trigger === "user",
        consentedEntryHelper: e.trigger === "user" ? e.consentedEntryHelper : void 0,
        commandSourceConsent: e.commandSourceConsent,
        storageV5: storageV5,
      });
    if (!result.ok)
      switch (
        (logInstallFailed({
          reason: result.reason,
          pluginId: pluginId,
          entry: entry,
          marketplaceName: marketplaceName,
          trigger: trigger,
          surface: w,
        }),
        result.reason)
      ) {
        case "local-source-no-location":
          return {
            success: !1,
            error: `Cannot install local plugin "${result.pluginName}" without marketplace install location`,
            errorIsOurs: !0,
          };
        case "plugin-folder-held":
          return {
            success: !1,
            error: findPluginNameCollision({
              ...result,
              refused: result.pluginId,
              askedFor: pluginId,
              surface: "ui",
            }),
            errorIsOurs: !0,
          };
        case "unrecordable-plugin-id":
          return {
            success: !1,
            error: formatInvalidPluginIdMessage(
              result.pluginId,
              pluginId,
              result.pluginId === pluginId && marketplaceName !== void 0
                ? { pluginName: entry.name, marketplaceName: marketplaceName }
                : void 0,
            ),
            errorIsOurs: !0,
          };
        case "installed-list-held":
          return {
            success: !1,
            error: `Plugin "${quotedPrintable(pluginId)}" was not installed: ${readInstalledPluginsFile(result.held)}`,
            errorIsOurs: !0,
          };
        case "settings-write-failed":
          return { success: !1, error: `Failed to update settings: ${result.message}`, errorIsOurs: !0 };
        case "resolution-failed":
          return { success: !1, error: formatResolutionError(result.resolution), errorIsOurs: !0 };
        case "installed-from-other-marketplace":
          return {
            success: !1,
            error: installFromOtherMarketplace(pluginId, result.pluginName, result.installedCopies, "ui"),
            errorIsOurs: !0,
          };
        case "more-installed-than-shown":
          return {
            success: !1,
            error: formatMoreInstallsThanShownMessage(result.pluginName),
            errorIsOurs: !0,
          };
        case "fewer-installed-than-shown":
          return { success: !1, error: formatSwitchTargetChangedMessage(result.pluginName), errorIsOurs: !0 };
        case "switch-needs-fresh-listing":
          return {
            success: !1,
            error: `Plugin "${quotedPrintable(result.pluginName, 120)}" was not switched. ${formatSwitchNeedsFreshReadMessage(result.detail)}`,
            errorIsOurs: !0,
          };
        case "blocked-by-policy":
          return {
            success: !1,
            error: `Plugin "${result.pluginName}" is blocked by your organization's policy and cannot be installed`,
            errorIsOurs: !0,
          };
        case "dependency-blocked-by-policy":
          return {
            success: !1,
            error: `Cannot install "${result.pluginName}": dependency "${result.blockedDependency}" is blocked by your organization's policy`,
            errorIsOurs: !0,
          };
        case "marketplace-blocked-by-policy":
          return {
            success: !1,
            error: `Cannot install "${result.pluginName}": marketplace "${result.marketplaceName}" is blocked by your organization's policy`,
            errorIsOurs: !0,
          };
        case "dependency-marketplace-blocked-by-policy":
          return {
            success: !1,
            error: `Cannot install "${result.pluginName}": dependency "${result.blockedDependency}" is from marketplace "${result.marketplaceName}", which is blocked by your organization's policy`,
            errorIsOurs: !0,
          };
        case "plugin-directory-unavailable":
          return {
            success: !1,
            error: formatDirectoryUnavailableMessage(result.pluginName, result.unavailableDependency),
            errorIsOurs: !0,
          };
        case "range-conflict": {
          let Ie = result.dep === pluginId ? "Plugin" : "Dependency";
          return {
            success: !1,
            error: describeConstraintConflict(
              Ie,
              result.dep,
              result.ranges,
              result.why,
              result.installed,
              result.suggestDependencyUpdate,
            ),
            errorIsOurs: !0,
          };
        }
        case "no-matching-tag": {
          let Ie = result.dep === pluginId ? "Plugin" : "Dependency";
          return { success: !1, error: noMatchingTagMessage(Ie, result.dep, result.range), errorIsOurs: !0 };
        }
        case "directory-pin-unsatisfied":
        case "directory-binding-unreadable":
        case "directory-identity-changed":
          return { success: !1, error: result.message, errorIsOurs: !0 };
      }
    logEvent("tengu_plugin_installed", {
      ...buildPluginEventFields(entry.name, marketplaceName, af()),
      plugin_id: dpe(pluginId),
      trigger: fromEnum(trigger),
      install_source: lit_2(trigger === "hint" ? "ui-suggestion" : "ui-discover"),
      ...(entry.version && { version: sanitizeVersion(entry.version) }),
      ...buildPluginVersionShaField(pluginId, getInstalledGitCommitSha(pluginId, { scope: scope })),
      ...directoryInstallFields({ pluginId: pluginId, surface: w, replaced: !1 }),
    });
    let Se = claudeCommand("plugin enable", pluginId),
      ke = `enable it in /plugin${Se ? ` or run: ${Se}` : ""}`,
      included = result.installedDisabled.includes(pluginId),
      included_2 = result.installedDisabledByDefault.includes(pluginId),
      Ae = describeOtherMarketplaceInstall(pluginId, entry.name, result.copiesInOtherProjects);
    return {
      success: !0,
      message: formatInstalledMessage({
        name: entry.name,
        depNote: result.depNote,
        disabled: !included ? void 0 : included_2 ? "by-default" : "in-settings",
        enableHint: ke,
        otherProjectsNote: Ae,
      }),
      depNote: result.depNote,
      installedDisabled: included,
      installedDisabledByDefault: included_2,
    };
  } catch (err) {
    let G = redactUrlsInMessage(err instanceof Error ? err.message : String(err)),
      q = err instanceof Bd;
    return (
      logForDebugging(`installPluginFromMarketplace ${q ? "refused" : "failed"} for ${pluginId}: ${G}`, {
        level: q ? "info" : "error",
      }),
      logInstallFailed({
        reason:
          err instanceof Eie
            ? err.failureCode
            : err instanceof Bd
              ? "command-source-refused"
              : "unexpected-error",
        errorKind: classifyPluginCommandError(err),
        pluginId: pluginId,
        entry: entry,
        marketplaceName: marketplaceName,
        trigger: trigger,
        surface: w,
      }),
      {
        success: !1,
        error: q ? G : `Failed to install: ${G}`,
        refusal: q ? err : void 0,
        ...(q && { errorIsOurs: !0 }),
      }
    );
  }
}

export {
  installPluginFromMarketplace,
  eVe,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
  findDataDirConflictingRecord,
  installResolvedPlugin,
  formatResolutionError,
  getBoundRepositoryKeys,
  validatePathWithinBase,
  Qj,
  registerPluginInstallation,
  mergePreviousProducerPaths,
  parsePluginIdSafe,
  healManagedRecord,
  cacheAndRegisterPlugin,
  pluginInstallPathExists,
};
