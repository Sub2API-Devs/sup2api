/**
 * utils/plugins/dependencyInstall.ts
 *
 * 2.1.316 新增：安装缺失的插件依赖（跨市场、策略阻止时跳过）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-jnt55rm1.js (6)
 * attribution: placement 6
 */
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import {
  ensurePluginDirectoryCatalog,
  loadKnownMarketplacesSafe,
  getMarketplaceCacheOnly,
  getPluginByIdAnySource,
} from "./marketplaceManager.js";
import { getEnabledPluginIdsInSource } from "./pluginPolicy.js";
import { scopeToSettingSource, parsePluginIdentifier } from "./pluginIdentifier.js";
import { ownPropertyOrUndefined, findSettingsArchiveEntry } from "./marketplaceSources.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { logForDebugging } from "../debug.js";
import { hasHeadersHelper } from "../../services/mcp/types.js";
import { headersHelperNotRunReason, marketplaceSourceOfEntry, marketplaceNameOfId } from "./headersHelper.js";
import { installResolvedPlugin } from "./pluginInstallationHelpers.js";
import { errorMessage } from "../errors.js";
import { loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { isDependencyError } from "./marketplaceNames.js";
import { uniq } from "../collections.js";
import { formatDependencyCountSuffix, missingDependenciesHint } from "./dependencyResolver.js";

//@ chunk-jnt55rm1.js:532-617 placement
/**
 * ensureCatalogForOfficialDeps：依赖里有官方市场插件时加载插件目录。
 */
async function ensureCatalogForOfficialDeps(pluginIds, storageV5) {
  return pluginIds.some((pluginId) => pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    ? ensurePluginDirectoryCatalog(storageV5)
    : "not_needed";
}
//@ chunk-jnt55rm1.js:617-650 placement
var INSTALLABLE_SCOPES = ["user", "project", "local"];
//@ chunk-jnt55rm1.js:650-2555 placement
/**
 * 找出缺失的插件依赖并按市场安装（策略阻止、跨市场依赖不在声明市场时跳过）。
 */
async function resolveMissingDependencies(errors, storageV5) {
  let sourcesByDependency = new Map();
  for (let error of errors) {
    if (error.type !== "dependency-unsatisfied" || error.reason !== "not-found") continue;
    let sources = sourcesByDependency.get(error.dependency);
    if (!sources) {
      sources = new Set();
      sourcesByDependency.set(error.dependency, sources);
    }
    sources.add(error.source);
  }
  if (sourcesByDependency.size === 0)
    return {
      installed: [],
      stillUnresolved: [],
      marketplaceMissing: [],
    };
  let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
  let scopePluginIds = INSTALLABLE_SCOPES.map((scope) => [
    scope,
    getEnabledPluginIdsInSource(scopeToSettingSource(scope)),
  ]);
  let installed = [];
  let unresolved = [];
  let marketplaceMissing = [];
  for (let [dependencyId, sources] of sourcesByDependency) {
    let marketplace = parsePluginIdentifier(dependencyId).marketplace;
    let marketplaceEntry = marketplace ? ownPropertyOrUndefined(knownMarketplaces, marketplace) : undefined;
    if (!marketplace || !marketplaceEntry) {
      unresolved.push(dependencyId);
      marketplaceMissing.push(dependencyId);
      continue;
    }
    if (!isSourceAllowedByPolicy(marketplaceEntry.source)) {
      logForDebugging(
        `resolveMissingDependencies: skipping "${dependencyId}" \u2014 marketplace "${marketplace}" is blocked by enterprise policy`,
      );
      unresolved.push(dependencyId);
      continue;
    }
    let allowed = false;
    for (let dependentId of sources) {
      let marketplace_2 = parsePluginIdentifier(dependentId).marketplace;
      if (marketplace_2 === marketplace) {
        allowed = true;
        break;
      }
      if (!marketplace_2) continue;
      if (
        (
          await getMarketplaceCacheOnly(marketplace_2, storageV5)
        )?.allowCrossMarketplaceDependenciesOn?.includes(marketplace)
      ) {
        allowed = true;
        break;
      }
    }
    if (!allowed) {
      logForDebugging(
        `resolveMissingDependencies: skipping "${dependencyId}" \u2014 cross-marketplace dependency not in any declaring marketplace's allowlist`,
      );
      unresolved.push(dependencyId);
      continue;
    }
    try {
      let pluginByIdAnySource = await getPluginByIdAnySource(dependencyId, storageV5, "install");
      if (!pluginByIdAnySource) {
        unresolved.push(dependencyId);
        continue;
      }
      let source = pluginByIdAnySource.entry.source;
      if (
        typeof source === "object" &&
        source.source === "archive" &&
        hasHeadersHelper(
          headersHelperNotRunReason({
            entry: pluginByIdAnySource.entry,
            archiveUrl: source.url,
            marketplaceSource: marketplaceSourceOfEntry(dependencyId, knownMarketplaces),
            trustedSettingsEntryAuth: findSettingsArchiveEntry(
              marketplaceNameOfId(dependencyId),
              pluginByIdAnySource.entry.name,
            ),
          }).entry,
        )
      ) {
        logForDebugging(
          `resolveMissingDependencies: skipping "${dependencyId}" \u2014 it fetches its archive through an entry headersHelper, which only an explicit install from /plugin may run`,
        );
        unresolved.push(dependencyId);
        continue;
      }
      let dependentScope = marketplaceWithDependency(sources, scopePluginIds);
      let installResult = await installResolvedPlugin({
        pluginId: dependencyId,
        entry: pluginByIdAnySource.entry,
        scope: dependentScope ?? "user",
        marketplaceInstallLocation: pluginByIdAnySource.marketplaceInstallLocation,
        trigger: "dependency-resolution",
        explicit: false,
        auto: dependentScope !== undefined,
        requiredByEnabledDependent: true,
        storageV5,
      });
      if (installResult.ok) {
        for (let installedId of installResult.closure)
          if (!installed.includes(installedId)) installed.push(installedId);
      } else {
        logForDebugging(
          `resolveMissingDependencies: install of "${dependencyId}" did not complete (${installResult.reason})`,
          {
            level: "warn",
          },
        );
        unresolved.push(dependencyId);
      }
    } catch (error) {
      logForDebugging(
        `resolveMissingDependencies: install of "${dependencyId}" threw: ${errorMessage(error)}`,
        {
          level: "warn",
        },
      );
      unresolved.push(dependencyId);
    }
  }
  return {
    installed,
    stillUnresolved: unresolved,
    marketplaceMissing,
  };
}
//@ chunk-jnt55rm1.js:2555-2652 placement
/**
 * dependencyErrorsForSource：某来源的依赖加载错误。
 */
async function dependencyErrorsForSource(source, storageV5) {
  let { errors } = await loadAllPluginsCacheOnly(storageV5);
  return errors.filter(isDependencyError).filter((error) => error.source === source);
}
//@ chunk-jnt55rm1.js:2652-2901 placement
/**
 * 安装插件缺失的依赖并生成结果后缀文字。
 */
async function installMissingDependencies(source, storageV5) {
  let depErrors = await dependencyErrorsForSource(source, storageV5);
  if (depErrors.length === 0) return null;
  let { installed, marketplaceMissing } = await resolveMissingDependencies(depErrors, storageV5);
  let installedSet = new Set(installed);
  let dependencyIds = uniq(depErrors.map((error) => error.dependency)).filter(
    (dependencyId) => !installedSet.has(dependencyId),
  );
  return {
    suffix: `${formatDependencyCountSuffix(installed)}${missingDependenciesHint(dependencyIds, marketplaceMissing)}`,
    changed: installed.length > 0,
  };
}
//@ chunk-jnt55rm1.js:2901-2977 placement
function marketplaceWithDependency(dependencyIds, scopePluginIds) {
  for (let [scope, pluginIds] of scopePluginIds)
    for (let dependencyId of dependencyIds) if (pluginIds.has(dependencyId)) return scope;
  return;
}
export {
  resolveMissingDependencies,
  dependencyErrorsForSource,
  installMissingDependencies,
  ensureCatalogForOfficialDeps,
};
