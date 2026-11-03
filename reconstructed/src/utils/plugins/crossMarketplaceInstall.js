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
  Ect,
  getInstalledListRefusal,
  readInstalledPluginsFile,
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  PF,
  readInstalledPluginsLenient,
  Bct,
  addInstalledPlugin,
} from "./installedPluginsManager.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { findPluginNameCollision } from "./pluginNameCollision.js";
import { samePluginSource, parseRepoWithRef, pinnedSha, withShaSuffix } from "./pluginSourceUrl.js";
import {
  verifyReviewedCommit,
  getPluginCloneUrl,
  probePluginGitHead,
  Xj,
  calculatePluginVersion,
} from "./pluginVersioning.js";
import { Y_n, seedDirectoryBindings, findBindingKeysFor } from "./pluginDirectoryBindings.js";
import {
  eVe,
  Qj,
  findDataDirConflictingRecord,
  isUnboundOfficialPlugin,
  isDirectoryRepositoryChanged,
} from "./pluginInstallationHelpers.js";
import {
  i5,
  PinnedVersionMismatchError,
  mbs,
  adoptStagedPlugin,
  publishStagedPlugin,
} from "./cachePublish.js";
import { findSettingsArchiveEntry, findUrlMarketplaceHeaders } from "./marketplaceSources.js";
import {
  mE,
  getEntryHelperConsentSubject,
  headersHelperNotRunReason,
  Eie,
  checkHeadersHelperConsent,
  helperRefusalFailureCode,
  diffEntryHelperConsent,
  describeHelperReview,
  HELPER_CONSENT_MISMATCH_CODES,
  resolveArchiveDownloadHeaders,
} from "./headersHelper.js";
import { headersHelperPolicyRefusal } from "./marketplacePolicy.js";
import { YX } from "./pluginDirectoryTelemetry.js";
import { isNpmPluginId } from "./schemas.js";
import { removeDirectoryTreeNoFollow } from "../fsRemove.js";
import { versionSatisfies } from "./dependencyResolver.js";
import { CLAUDE_PLUGINS_OFFICIAL } from "./officialMarketplace.js";
import { wpe, Nee, o1 } from "./commandSource.js";
import { isPluginZipCacheEnabled, publishDirectoryAsZip } from "./zipCache.js";
import { pathExists } from "../fsSafety/atomicWriteStaging.js";
import { logForDebugging } from "../debug.js";
import { Xct, provisionBinaryAssets } from "./pluginBinaryAssets.js";
import { installPluginDependencies } from "./pluginDependencies.js";
import { recordProducerDir } from "./pluginCachePaths.js";
import { Prt } from "./commandSourceErrors.js";
import { isOfficialMarketplaceName_3 } from "./pluginIdentifier.js";
import { plural, capitalize } from "../stringUtils.js";
import { uniq, count } from "../collections.js";

/**
 * 拒绝安装的提示：插件会与另一个来自不同仓库的已安装插件共用数据目录，提示先卸载那个再安装。
 */
//@ chunk-e6aww6q8.js:4431671-4432044 placement
function formatSharedDataFolderMessage(e, n) {
  {
    let r = quotedPrintable(n.id, 200);
    return `"${quotedPrintable(e, 120)}" was not installed. It would use the same data folder as "${r}", which ${n.installed ? "is installed" : "was installed"} from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists. To free the name, ${runCommandHint("plugin uninstall", n.id, { fallback: `uninstall "${r}" from the command line` })}, then install it again.`;
  }
  return "";
}
//@ chunk-e6aww6q8.js:4432044-4432083 placement
function Oqn(e, n) {
  return normalizePathForPlatform(e) === normalizePathForPlatform(n);
}
//@ chunk-e6aww6q8.js:4432083-4432171 placement
function Fqn(e, n) {
  return Oqn(getPluginCacheDirIn("", e), getPluginCacheDirIn("", n))
    ? "folder"
    : Oqn(pluginDataDirPath(e), pluginDataDirPath(n))
      ? "data"
      : null;
}
//@ chunk-e6aww6q8.js:4432171-4432240 placement
function Vft(e, n) {
  return !n.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`) && (e[n]?.length ?? 0) === 0;
}
//@ chunk-e6aww6q8.js:4432240-4432515 placement
function findDataDirHolders(e, n) {
  if (!Vft(e, n)) return [];
  return Object.entries(e).flatMap(([r, s]) => {
    let h = r !== n && s !== void 0 && s.length > 0 ? Fqn(r, n) : null;
    return h === null || s === void 0
      ? []
      : [
          {
            id: r,
            shares: h,
            installations: s.map(({ scope: scope, projectPath: projectPath }) => ({
              scope: scope,
              ...(projectPath !== void 0 && { projectPath: projectPath }),
            })),
          },
        ];
  });
}
//@ chunk-e6aww6q8.js:4432515-4432792 placement
function findSharedStorageConflict(e, n, r) {
  for (let s of e) {
    if (!Vft(r, s)) continue;
    let h = findDataDirHolders(r, s);
    if (h.length > 0) return { pluginId: s, sharedWith: "installed", holders: h };
    for (let y of n) {
      let S = y !== s && Vft(r, y) ? Fqn(y, s) : null;
      if (S !== null) return { pluginId: s, sharedWith: "same-install", twin: y, shares: S };
    }
  }
  return null;
}
//@ chunk-e6aww6q8.js:4432792-4432956 placement
function describeNameCollision(e, n, r) {
  return {
    capitals:
      r === "folder"
        ? getPluginCacheDirIn("", e) !== getPluginCacheDirIn("", n)
        : pluginDataDirPath(e) !== pluginDataDirPath(n),
    punctuation: r === "folder" && e.toLowerCase() !== n.toLowerCase(),
    atSign: r === "data",
  };
}
//@ chunk-e6aww6q8.js:4436041-4436257 placement
class PluginFolderHeldError extends TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS {
  pluginCommandErrorCategory = "validation";
  holders;
  constructor(e, n) {
    super(e, "plugin not installed: another installed plugin has one of its folders");
    ((this.name = "PluginFolderHeldError"), (this.holders = n));
  }
}
/**
 * 安装插件并更新安装记录，记录与实际不符时拒绝。
 */
//@ chunk-e6aww6q8.js:4436257-4443773 placement
async function installPluginWithRecords(
  e,
  n,
  r = "user",
  s,
  h,
  y,
  S,
  w,
  L,
  G,
  q,
  Z = { explicitInstall: !1 },
  Se,
  ke,
  we,
) {
  Ect(e);
  let Ee = await getInstalledListRefusal(q);
  if (Ee !== void 0)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      `Plugin "${quotedPrintable(e)}" was not installed: ${readInstalledPluginsFile(Ee)}`,
      "plugin not installed: the install records hold what this build cannot read",
    );
  let Ae = findDataDirHolders(
    (isStorageV5Enabled() && q !== void 0 ? await loadInstalledPlugins(q) : loadInstalledPluginsSync())
      .plugins,
    e,
  );
  if (Ae.length > 0)
    throw new PluginFolderHeldError(
      findPluginNameCollision({
        refused: e,
        askedFor: e,
        sharedWith: "installed",
        holders: Ae,
        surface: "cli",
      }),
      Ae,
    );
  let endsWith = e.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`),
    Me = endsWith ? samePluginSource(n.source, void 0) : void 0,
    We = verifyReviewedCommit({
      pluginId: e,
      pluginName: n.name,
      source: n.source,
      boundByRecord: !1,
      action: "installed",
    });
  if (!We.ok)
    throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
      We.message,
      "plugin directory listing has no reviewed commit",
    );
  if (endsWith) {
    if (Me === void 0)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `"${printableName(n.name, 120)}" was not installed: its ${OFFICIAL_MARKETPLACE_DISPLAY} listing names no repository.`,
        "plugin directory listing names no repository",
      );
    if (Me.length > Y_n)
      throw new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
        `"${printableName(n.name, 120)}" was not installed: the repository address in its ${OFFICIAL_MARKETPLACE_DISPLAY} listing is too long. Nothing was changed. Only a change to the listing can fix this.`,
        "plugin directory listing repository key too long",
      );
    let Kn =
        isStorageV5Enabled() && q !== void 0 ? await loadInstalledPlugins(q) : loadInstalledPluginsSync(),
      Xn = PF(Kn),
      fo = eVe(Kn.plugins, e),
      To = Qj(Kn.plugins, e),
      bo = await seedDirectoryBindings(fo.length > 0 ? fo : [[e, []]]),
      vn = findDataDirConflictingRecord(Kn.plugins, bo, e, n.source);
    if (isUnboundOfficialPlugin(e, To, bo, Xn))
      throw new i5(
        "directory-binding-unreadable",
        `"${printableName(n.name, 120)}" was not installed: plugin-directory-bindings.json in the plugins folder could not be used (unreadable, a symbolic link or not a file, over 1 MB, damaged, or written by a newer Claude Code), so its ${OFFICIAL_MARKETPLACE_DISPLAY} listing could not be checked against the repository it was installed from. Nothing was changed. Try again; if this repeats, check the file for those causes.`,
        "plugin directory bindings file could not be read",
      );
    if (Xn) {
      let flattened = findBindingKeysFor(bo.keys(), e).flatMap((un) => bo.get(un) ?? []),
        ko = flattened.find((un) => parseRepoWithRef(un) !== Me) ?? flattened[0];
      if (ko === void 0 || parseRepoWithRef(ko) !== Me)
        throw new i5(
          ko === void 0 ? "directory-binding-unreadable" : "directory-identity-changed",
          ko === void 0
            ? `"${printableName(n.name, 120)}" was not installed: installed_plugins.json in the plugins folder could not be read, so Claude Code cannot tell whether it is already installed from another repository. Nothing was changed. Try again once the file can be read.`
            : `"${printableName(n.name, 120)}" was not installed: installed_plugins.json in the plugins folder could not be read, and plugin-directory-bindings.json records it as installed from a different repository than the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists. Nothing was changed. Try again once installed_plugins.json can be read.`,
          "plugin directory install records could not be read",
        );
    }
    let co = Xn ? Qj(await readInstalledPluginsLenient(q), e) : To;
    if (isDirectoryRepositoryChanged(e, co, n.source, bo))
      throw new i5(
        "directory-identity-changed",
        vn !== void 0
          ? formatSharedDataFolderMessage(n.name, vn)
          : (co?.length ?? 0) > 0
            ? `"${quotedPrintable(n.name, 120)}" is already installed from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists under that name. Uninstall it first, then install it again.`
            : `"${quotedPrintable(n.name, 120)}" was not installed. An earlier install under that name came from a different repository than the one the ${OFFICIAL_MARKETPLACE_DISPLAY} now lists, and what it saved (options, secrets, data) may still be here. To delete that, ${runCommandHint("plugin uninstall", e, { fallback: `uninstall "${quotedPrintable(e, 200)}" from the command line` })}, then install it again.`,
        "plugin directory listing now names a different repository",
      );
  }
  let ze = endsWith ? void 0 : y,
    lt = typeof n.source === "string" && h ? h : n.source,
    Je =
      ze &&
      typeof lt === "object" &&
      (lt.source === "github" || lt.source === "url" || lt.source === "git-subdir")
        ? { ...lt, ref: ze.ref, sha: ze.sha }
        : lt,
    nt = findSettingsArchiveEntry(mE(e), n.name);
  if (Z.explicitInstall && typeof Je === "object" && Je.source === "archive") {
    let Kn = getEntryHelperConsentSubject(
        headersHelperNotRunReason({
          entry: n,
          archiveUrl: Je.url,
          marketplaceSource: L,
          trustedSettingsEntryAuth: nt,
        }),
        Je.url,
      ),
      Xn = Kn === null ? null : headersHelperPolicyRefusal(L, mE(e));
    if (Xn !== null) throw new Eie(checkHeadersHelperConsent(n.name, Xn), helperRefusalFailureCode(Xn));
    let fo = diffEntryHelperConsent(Z.consented, Kn);
    if (fo !== null)
      throw new Eie(describeHelperReview(fo, n.name, "install"), HELPER_CONSENT_MISMATCH_CODES[fo]);
  }
  let pt = await cachePlugin(Je, {
      commandSourceConsent: G ?? { kind: "none", pluginId: e },
      manifest: n,
      containmentRoot: typeof n.source === "string" && h ? w : void 0,
      archiveAuth: await resolveArchiveDownloadHeaders({
        pluginSource: Je,
        pluginName: n.name,
        marketplaceName: mE(e),
        marketplaceSource: L,
        trustedMarketplaceAuth: findUrlMarketplaceHeaders(L, mE(e)),
        trustedSettingsEntryAuth: nt,
        entry: n,
        runEntryHelper: Z.explicitInstall,
      }),
      entryDeclaresComponents: entryDeclaresComponents(n),
      declaredComponentPaths: entryDeclaredComponentPaths(n),
      storageV5: q,
      ...(isStorageV5Enabled() && q !== void 0 && { pluginId: e }),
      isDirectoryPlugin: YX(e),
      directoryPin: pinnedSha(e, Je) ?? null,
      credentials: Se,
      ...(isNpmPluginId(e) && { isNpmMarketplaceLane: !0 }),
      gitHubHttpsFallback: we,
    }),
    Et = h || pt.path,
    yt = h && w ? w : Et,
    gt = typeof lt === "string" || getPluginCloneUrl(lt) !== null,
    At;
  {
    let Kn = verifyReviewedCommit({
      pluginId: e,
      pluginName: n.name,
      source: n.source,
      boundByRecord: !1,
      fetched: { gitCommitSha: pt.gitCommitSha },
      action: "installed",
    });
    if (!Kn.ok)
      throw (
        await removeDirectoryTreeNoFollow(pt.path).catch(() => {}),
        new TelemetrySafeError_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS(
          Kn.message,
          "plugin directory fetch is not at the reviewed commit",
        )
      );
    if (ke !== void 0 && !versionSatisfies(pt.manifest.version, ke))
      throw (
        await removeDirectoryTreeNoFollow(pt.path).catch(() => {}),
        new PinnedVersionMismatchError(pt.manifest.version)
      );
    At = Kn.reviewedCommit;
  }
  let It =
      At ??
      ze?.sha ??
      pt.gitCommitSha ??
      (gt ? await Bct(Et, yt) : void 0) ??
      (h && w && mE(e) === CLAUDE_PLUGINS_OFFICIAL && !(await probePluginGitHead(Et, yt)).repo
        ? await Xj(h)
        : void 0) ??
      void 0,
    iso = new Date().toISOString(),
    qt = isNpmPluginId(e) ? pt.npmResolution : void 0,
    Zt =
      qt?.version ??
      (await calculatePluginVersion(
        e,
        n.source,
        pt.manifest,
        Et,
        { kind: "catalog", version: n.version },
        ze?.sha ?? pt.gitCommitSha,
        pt.contentSha256,
        yt,
      )),
    rn = ze && (pt.manifest.version || n.version) ? withShaSuffix(Zt, ze.sha) : Zt,
    pn = getVersionedCachePath(e, rn),
    path = pt.path,
    hn = mbs(pt.stagingScope, pn),
    ho = !0;
  if (pt.path !== pn) {
    let Kn = strictCacheAddressable(q);
    try {
      if (wpe(Je)) {
        let Xn = Kn && (await versionParentState(pn)) === "refused",
          fo = getVersionedZipCachePath(e, rn),
          To =
            !Xn &&
            isPluginZipCacheEnabled() &&
            (Kn
              ? await strictArchivePresent(fo, e, rn, () =>
                  requireVersionParentContained(pn, e, rn, "cache", "before reuse"),
                )
              : await pathExists(fo));
        if (!Xn && !To && (await adoptStagedPlugin(pt.path, pn, Kn, q, hn))) path = pn;
        else
          ((path = await copyPluginToVersionedCache(pt.path, e, rn, n, void 0, {
            storageV5: q,
            credentials: Se,
          })),
            await removeDirectoryTreeNoFollow(pt.path).catch((bo) => {
              logForDebugging(
                `Failed to remove the staging tree ${pt.path} after publishing: ${errorMessage(bo)}`,
                { level: "warn" },
              );
            }),
            (ho = !1));
      } else {
        let entries = Object.entries(pt.manifest.binaries ?? {}),
          fo = await publishStagedPlugin(
            pt.path,
            pn,
            {
              pluginId: e,
              version: rn,
              strictCache: Kn,
              ...(entries.length > 0 &&
                Xct(e) && {
                  binariesHook: { declared: new Map(entries.map(([To, bo]) => [To, bo.sha256])) },
                }),
            },
            q,
            hn,
          );
        if (((path = pn), fo === "kept")) ho = !1;
      }
    } catch (error) {
      throw (await removeDirectoryTreeNoFollow(pt.path).catch(() => {}), error);
    }
  }
  if (ho && !Nee(Je)) {
    try {
      await unvouchBeforeDependencyStep(path, q);
      let Kn = await installPluginDependencies(path);
      if (Kn.error)
        logForDebugging(`Plugin dependency install warning for ${e}: ${Kn.error}`, { level: "warn" });
      (await provisionBinaryAssets(path, e, { storageV5: q, credentials: Se }),
        await rescreenCachedPluginTree(path, q));
    } catch (error) {
      throw (await removeFreshCopyUnlessInUse(path, q), error);
    }
    if (isPluginZipCacheEnabled() && (await unmarkBeforeArchiving(path, q))) {
      let Kn = getVersionedZipCachePath(e, rn);
      (await publishDirectoryAsZip(path, Kn), (path = Kn));
    }
  }
  if (ze && pt.manifest.version && ze.version !== pt.manifest.version)
    logForDebugging(
      `Tag ${ze.ref} resolved to a commit whose plugin.json says version ${pt.manifest.version} \u2014 using tag-derived ${ze.version} for constraint checks`,
      { level: "warn" },
    );
  let yn = await addInstalledPlugin(
    e,
    {
      version: rn,
      installedAt: iso,
      lastUpdated: iso,
      installPath: path,
      gitCommitSha: It,
      ...(ze && { resolvedVersion: ze.version }),
      ...(S && { auto: !0 }),
      ...(Me !== void 0 && { directoryRepositoryKey: Me }),
      ...(typeof Je === "object" &&
        Je.source === "claudeai" && {
          claudeaiPluginId: Je.pluginId,
          ...(pt.contentSha256 !== void 0 && { archiveSha256: pt.contentSha256 }),
        }),
      ...(typeof Je === "object" &&
        Je.source === "command" && {
          sourceCommand: o1(Je),
          ...(pt.producerPath !== void 0 && { sourceProducerPath: pt.producerPath }),
        }),
      ...(qt !== void 0 &&
        typeof Je === "object" &&
        Je.source === "npm" && {
          ...(Je.version !== void 0 && { npmVersionSpec: Je.version }),
          npmResolved: qt.tarballUrl,
          ...(qt.integrity !== void 0 && { npmIntegrity: qt.integrity }),
          ...(Je.registry !== void 0 && { npmRegistry: Je.registry }),
        }),
    },
    r,
    s,
    q,
  );
  if (pt.producerPath !== void 0) recordProducerDir(pt.producerPath);
  return {
    path: path,
    recordedAt: iso,
    recordsBefore: yn,
    manifestVersion: pt.manifest.version,
    depConstraints: pt.depConstraints,
    dependencies: pt.manifest.dependencies,
    defaultEnabled: pt.manifest.defaultEnabled,
  };
}
/**
 * 拆分 名@市场，格式不对返回 null。
 */
//@ chunk-e6aww6q8.js:4443773-4443885 placement
function parsePluginAtMarketplace(e) {
  let parts = e.split("@");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return null;
  return { name: parts[0], marketplace: parts[1] };
}
//@ chunk-e6aww6q8.js:4443885-4443952 placement
function cie(e, n) {
  {
    let r = mE(e);
    return r === void 0 ? n : Amn(r);
  }
  return n;
}
//@ chunk-e6aww6q8.js:4443952-4443990 placement
function Amn(e) {
  return quotedPrintable(marketplaceDisplayName(e), 120);
}
/**
 * 安装数比展示的多、未做更改。
 */
//@ chunk-e6aww6q8.js:4443990-4444133 placement
function formatMoreInstallsThanShownMessage(e) {
  return `More installs of "${quotedPrintable(e, 120)}" were found than were shown. Nothing was changed; open the plugin again to see them all`;
}
/**
 * 切换会替换的内容已变化、未做更改。
 */
//@ chunk-e6aww6q8.js:4444133-4444317 placement
function formatSwitchTargetChangedMessage(e) {
  return `What switching "${quotedPrintable(e, 120)}" would replace has changed since it was shown. Nothing was changed; open the plugin again to see whether a switch is still offered`;
}
//@ chunk-e6aww6q8.js:4444531-4444616 placement
function Hqn(e) {
  {
    let n = mE(e);
    return n === OFFICIAL_MARKETPLACE_NAME && Prt(e.slice(0, -`@${n}`.length));
  }
  return !1;
}
/**
 * 其他市场的安装都在官方市场族内，可直接替换。
 */
//@ chunk-e6aww6q8.js:4444616-4444842 placement
function canReplaceOfficialInstalls(e, n, r) {
  {
    if (n.length === 0) return !1;
    let s = mE(e);
    if (n.some((h) => mE(h.pluginId) === void 0)) return !1;
    if (s !== OFFICIAL_MARKETPLACE_NAME)
      return isOfficialMarketplaceName_3(s) && n.every((h) => mE(h.pluginId) === OFFICIAL_MARKETPLACE_NAME);
    return (r ?? Hqn(e)) && n.every((h) => isOfficialMarketplaceName_3(mE(h.pluginId)));
  }
  return !1;
}
/**
 * 已从其他市场安装时的阻止判定：有不可替换的记录（或不能按官方规则替换）返回 installed-from-other-marketplace； 已安装记录多于展示给用户的返回 more-installed-than-shown；否则 undefined。
 */
//@ chunk-e6aww6q8.js:4444842-4445182 placement
function findOtherMarketplaceInstallBlocker(e, n, r, s) {
  {
    let y = n.find((S) => !S.replaceable) ?? (canReplaceOfficialInstalls(e, n, s) ? void 0 : n[0]);
    if (y) return { reason: "installed-from-other-marketplace", blocking: y };
    if (r !== void 0 && n.some((S) => !r.includes(S.pluginId)))
      return { reason: "more-installed-than-shown" };
    return;
  }
  let [h] = n;
  return h === void 0 ? void 0 : { reason: "installed-from-other-marketplace", blocking: h };
}
//@ chunk-e6aww6q8.js:4445182-4445353 placement
function formatMissingCopiesWarning(e, n) {
  return `without ${n === "that" ? "that copy" : `the ${plural(n, "copy", "copies")} ${plural(e, "it needs", "they need")}`}, turning ${plural(e, "it", "them")} back on may not work`;
}
/**
 * 插件已从其他市场安装时的处理：提示 --replace 或指定作用域。
 */
//@ chunk-e6aww6q8.js:4445353-4450827 placement
function installFromOtherMarketplace(e, n, r, s, h = "user", y) {
  {
    let S = quotedPrintable(n, 120),
      w = cie(e, "this marketplace"),
      L =
        s === "cli"
          ? claudeCommand("plugin install", e, h === "user" ? "--replace" : `--replace --scope ${h}`)
          : null,
      [G, ...q] = r;
    if (G === void 0) return `"${S}" is already installed from another marketplace`;
    let Z = (lt) => new Intl.ListFormat("en", { type: "conjunction" }).format(lt),
      Se = (lt) => Z(uniq(lt.map((Je) => cie(Je.pluginId, "another marketplace")))),
      ke = (lt) => lt.map((Je) => `"${quotedPrintable(Je, 120)}"`),
      we = (lt) => {
        let Je = mE(lt.pluginId);
        return Je !== OFFICIAL_MARKETPLACE_NAME && !isOfficialMarketplaceName_3(Je);
      },
      filtered = r.filter(we),
      filtered_2 = r.filter((lt) => !we(lt)),
      Ie = (lt) => mE(lt) !== void 0 && isSafeCliArg(lt),
      Me = (lt) => {
        let Je = filtered.every((pt) => Ie(pt.pluginId))
            ? ` (${filtered.map((pt) => `"${quotedPrintable(pt.pluginId, 200)}"`).join(", ")})`
            : "",
          nt = plural(filtered.length, "a plugin", "plugins");
        return `${lt ? capitalize(nt) : nt} installed here from ${Se(filtered)}${Je} ${plural(filtered.length, "is", "are")} listed there at the same repository and folder as "${S}"`;
      },
      We =
        filtered.length === 0
          ? `"${S}" is already installed from ${Se(filtered_2)}`
          : filtered_2.length === 0
            ? Me(!0)
            : `"${S}" is already installed from ${Se(filtered_2)}, and ${Me(!1)}`;
    if (!canReplaceOfficialInstalls(e, r, y)) {
      let lt = y ?? Hqn(e),
        Je =
          !lt && mE(e) === OFFICIAL_MARKETPLACE_NAME
            ? `A switch that keeps plugin settings isn't offered to this ${OFFICIAL_MARKETPLACE_DISPLAY} listing, because Claude Code doesn't count it as Anthropic's or a partner's`
            : `A switch that keeps plugin settings is offered only between ${OFFICIAL_MARKETPLACE_DISPLAY} and Anthropic's official marketplaces`,
        nt = cie(e, ""),
        pt = nt === "" ? "this marketplace's copy" : `the ${nt} copy`,
        Et = q.length === 0,
        yt = (So) => {
          let ko = cie(So.pluginId, "");
          return Et ? "it" : ko === "" ? "the one from another marketplace" : `the ${ko} one`;
        },
        filtered = r.filter((So) => So.scopes.includes("managed"));
      if (filtered.length > 0)
        return `${We}. ${Et ? "That one" : `The ${plural(filtered.length, "copy", "copies")} from ${Se(filtered)}`} ${plural(filtered.length, "was", "were")} installed by your organization (managed) and can't be uninstalled here, so ${pt} can't be installed`;
      let At = lt
          ? filtered_2.filter((So) => So.scopes.some((scope) => scope === "user" || scope === "local"))
          : [],
        It = At.length > 0 ? r.filter((So) => !At.includes(So)) : r,
        mapped = [
          ...It.flatMap((So) => So.scopes.map((scope) => ({ pluginId: So.pluginId, scope: scope }))),
          ...At.flatMap((So) =>
            So.scopes
              .filter((scope) => scope === "project")
              .map((ko) => ({ pluginId: So.pluginId, scope: ko })),
          ),
        ].map(({ pluginId: pluginId, scope: scope }) =>
          Ie(pluginId)
            ? claudeCommand("plugin uninstall", pluginId, scope === "user" ? void 0 : `--scope ${scope}`)
            : null,
        ),
        Zt = s === "cli" && mapped.every((So) => So !== null) ? mapped.join(", then ") : null,
        rn = It.some((So) => So.scopes.length > 1)
          ? `at each scope ${plural(It.length, "it is", "they are")} installed at`
          : "",
        joined = [...It, ...At.filter((So) => So.scopes.includes("project"))]
          .filter((So) => So.scopes.some((scope) => scope !== "user"))
          .map((So) => ` ${capitalize(yt(So))} is installed at ${Z(So.scopes)} scope.`)
          .concat(
            r
              .filter((So) => So.requiredBy.length > 0)
              .map(
                (So) =>
                  ` ${Z(ke(So.requiredBy))} ${plural(So.requiredBy.length, "needs", "need")} ${yt(So)}.`,
              ),
          )
          .join(""),
        no = (So, ko = []) => {
          let filtered = uniq(So.flatMap(($o) => $o.requiredBy)).filter(($o) => !ko.includes($o)),
            ao = count(r, ($o) => $o.requiredBy.some((yo) => filtered.includes(yo)));
          return filtered.length === 0
            ? ""
            : `disable ${Z(ke(filtered))} (${formatMissingCopiesWarning(filtered.length, ao)})`;
        },
        hn = It.every((So) => mE(So.pluginId) === void 0)
          ? `this message cannot name ${plural(It.length, "it", "them")}; `
          : "",
        ho = no(It);
      if (At.length === 0) {
        let So = Et ? "the other one" : q.length === 1 ? "both" : "all of them",
          ko =
            ho === ""
              ? `To use ${pt}, uninstall ${So} first`
              : `To use ${pt}, first ${ho}. Then uninstall ${So}`,
          un = `(${hn}${Et ? "its " : ""}plugin settings are not carried over)`;
        return `${We}.${joined} ${Je}. ${Zt !== null ? `${ko}${rn === "" ? "" : `, ${rn}`} ${un}: ${Zt}` : `${ko} in /plugin \u2192 Installed${rn === "" ? "" : `, ${rn}`} ${un}`}`;
      }
      let filtered_3 = At.filter((So) => So.scopes.includes("project")),
        Kn = `${ho === "" ? "First" : `First ${ho}. Then`} uninstall the ${plural(It.length, "copy", "copies")} from ${Se(It)}`,
        Xn = `(${hn}${plural(It.length, "its", "their")} plugin settings are not carried over)`,
        fo =
          filtered_3.length > 0
            ? `, and the ${Se(filtered_3)} ${plural(filtered_3.length, "one", "ones")} at project scope`
            : "",
        To =
          Zt !== null
            ? `${Kn}${rn === "" ? "" : ` ${rn}`} ${Xn}${fo}: ${Zt}`
            : `${Kn} ${Xn} in /plugin \u2192 Installed${rn === "" ? "" : `, ${rn}`}${fo}`,
        bo = no(
          At,
          It.flatMap((So) => So.requiredBy),
        ),
        vn = ho === "" && bo === "" ? "Then" : "After that",
        co =
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
        return `${We}, and not all of them can be switched. ${filtered.map((nt) => installFromOtherMarketplace(e, n, [nt], s, h, y)).join(". ")}`;
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
      let found = G.scopes.find((scope) => scope !== "user" && scope !== "local"),
        Je = found ? claudeCommand("plugin uninstall", G.pluginId, `--scope ${found}`) : null,
        joined = G.scopes.join(" and ");
      return `${We} at ${joined} scope, which can't be switched from here. Uninstall it first${Je ? `: ${Je}` : ""}`;
    }
    return L !== null
      ? `${We}. To switch to ${w} (keeps your plugin settings): ${L}`
      : `${We}. To switch, open it in /plugin \u2192 Installed and choose "Switch to ${w}"`;
  }
  return "";
}
/**
 * 去掉 12 位哈希后缀，纯哈希/unknown 返回 undefined。
 */
//@ chunk-e6aww6q8.js:4450827-4450972 placement
function displayableGitHeadName(e) {
  let n = e?.replace(/-[0-9a-f]{12}$/, "");
  return n === void 0 || n === "" || n === "unknown" || /^[0-9a-f]{12}(-[0-9a-f]{8})?$/.test(n) ? void 0 : n;
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
  Amn,
  findSharedStorageConflict,
  describeNameCollision,
  cie,
  parsePluginAtMarketplace,
};
