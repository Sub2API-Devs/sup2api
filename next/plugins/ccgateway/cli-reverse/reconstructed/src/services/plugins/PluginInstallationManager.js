/**
 * services/plugins/PluginInstallationManager.ts
 *
 * 并入旧版已有路径：插件安装管理。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/services/plugins/PluginInstallationManager.ts
 * pieces: chunk-18hwfzwa.js (3), chunk-e6aww6q8.js (1)
 * attribution: placement 2, fingerprint 1, callgraph-fingerprint 1
 */
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import {
  clearMarketplaceAdmissionVerdicts,
  hiddenRegistryEntries,
} from "../../utils/plugins/marketplaceSources.js";
import { shouldSkipPluginAutoupdate } from "../../utils/config.js";
import { checkEnabledPlugins } from "../../utils/plugins/pluginStartupCheck.js";
import {
  loadKnownMarketplacesSafe,
  getDeclaredMarketplaces,
  seedDirFor,
  getMarketplaceCacheOnly,
  refreshMarketplaceDeduped,
  loadKnownMarketplacesWithDeclared,
} from "../../utils/plugins/marketplaceManager.js";
import { parsePluginIdentifier } from "../../utils/plugins/pluginIdentifier.js";
import { isReservedMarketplaceName, isMarketplaceAutoUpdate } from "../../utils/plugins/schemas.js";
import { isPluginDirectorySource } from "../../utils/plugins/officialMarketplaceNames.js";
import { isSourceAllowedByPolicy } from "../../utils/plugins/marketplacePolicy.js";
import { getMarketplaceAutoUpdate } from "../../utils/plugins/marketplaceAutoUpdate.js";
import { logForDebugging } from "../../utils/debug.js";
import { sleep } from "../../utils/sleep.js";
import { REMOUNT_SETTLE_MS, BRIDGE_RETRY_DELAYS_MS } from "../../screens/repl/ReplSessionScope.js";
import { errorMessage } from "../../utils/errors.js";
import { logEvent } from "../analytics/index.js";
import { fromEnum } from "../analytics/safeMetadata.js";
import {
  classifyPluginCommandError,
  buildPluginEventFieldsFromId,
} from "../../utils/telemetry/pluginTelemetry.js";
import { loadAllPluginsCacheOnly, clearPluginCache } from "../../utils/plugins/pluginLoader.js";
import { pluginErrorSummary } from "../../utils/plugins/marketplaceNames.js";
import { logError } from "../../utils/log.js";
import { diffMarketplaces, reconcileMarketplaces } from "../../utils/plugins/reconciler.js";
import { logForDiagnosticsNoPII } from "../../utils/diagLogs.js";
import { refreshActivePlugins } from "../../utils/plugins/refresh.js";
import { logFeatureSad, logFeatureOk, logFeatureBad } from "../analytics/featureTelemetry.js";

//@ chunk-e6aww6q8.js:4233013-4233217 callgraph-fingerprint = updateMarketplaceStatus (0.212)
/**
 * 重置全局市场安装状态（marketplaces 状态表与进行中的刷新）。
 */
function updateMarketplaceStatus() {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.marketplaces.clear();
  pluginRegistry.marketplaceRefreshesInFlight.clear();
  clearMarketplaceAdmissionVerdicts();
  hiddenRegistryEntries().raw.clear();
  hiddenRegistryEntries().v5.clear();
  pluginRegistry.marketplaceHelperMemo.clear();
  pluginRegistry.marketplaceResolutionNoticesLogged.clear();
}
//@ chunk-18hwfzwa.js:202646-204071 placement
async function refreshMarketplacesOnMiss(attempted = new Set(), storageV5) {
  let refreshed = new Set();
  if (shouldSkipPluginAutoupdate()) return refreshed;
  try {
    let enabledPlugins = await checkEnabledPlugins();
    if (enabledPlugins.length === 0) return refreshed;
    let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
    let declaredMarketplaces = getDeclaredMarketplaces();
    let missingByMarketplace = new Map();
    let cacheByMarketplace = new Map();
    for (let pluginId of enabledPlugins) {
      let { name: pluginName, marketplace } = parsePluginIdentifier(pluginId);
      let marketplaceEntry =
        marketplace && Object.hasOwn(knownMarketplaces, marketplace)
          ? knownMarketplaces[marketplace]
          : undefined;
      if (
        !pluginName ||
        !marketplace ||
        !marketplaceEntry ||
        isReservedMarketplaceName(marketplace.toLowerCase()) ||
        attempted.has(marketplace) ||
        marketplaceEntry.source.source === "settings" ||
        isPluginDirectorySource(marketplaceEntry.source) ||
        !isSourceAllowedByPolicy(marketplaceEntry.source) ||
        seedDirFor(marketplaceEntry.installLocation) !== undefined ||
        !isMarketplaceAutoUpdate(
          marketplace,
          marketplaceEntry,
          getMarketplaceAutoUpdate(marketplace, declaredMarketplaces),
        )
      )
        continue;
      let catalog = cacheByMarketplace.get(marketplace);
      if (catalog === undefined) {
        catalog = await getMarketplaceCacheOnly(marketplace, storageV5);
        cacheByMarketplace.set(marketplace, catalog);
      }
      if (catalog === null) continue;
      if (!catalog.plugins.some((plugin) => plugin.name === pluginName)) {
        let missingPlugins = missingByMarketplace.get(marketplace);
        if (missingPlugins) missingPlugins.push(pluginId);
        else missingByMarketplace.set(marketplace, [pluginId]);
      }
    }
    if (missingByMarketplace.size === 0) return refreshed;
    logForDebugging(
      `refresh-on-miss: ${missingByMarketplace.size} marketplace(s) have enabled plugins missing from local catalog; refreshing`,
    );
    await sleep(Math.floor(Math.random() * REMOUNT_SETTLE_MS), undefined, {
      unref: true,
    });
    for (let [marketplaceName, missingPlugins] of missingByMarketplace) {
      let refreshError;
      try {
        await refreshMarketplaceDeduped(marketplaceName, storageV5, undefined, {
          skipIfRecent: true,
        });
      } catch (error) {
        refreshError = error;
        logForDebugging(
          `refresh-on-miss: failed to refresh marketplace '${marketplaceName}': ${errorMessage(error)}`,
          {
            level: "warn",
          },
        );
      }
      let refreshedCatalog =
        refreshError !== undefined ? null : await getMarketplaceCacheOnly(marketplaceName, storageV5);
      let anyResolved = false;
      for (let pluginId of missingPlugins) {
        let { name: pluginName } = parsePluginIdentifier(pluginId);
        let resolved =
          refreshedCatalog !== null && refreshedCatalog.plugins.some((plugin) => plugin.name === pluginName);
        anyResolved ||= resolved;
        let outcome = refreshError !== undefined ? "refresh_failed" : resolved ? "resolved" : "still_missing";
        logForDebugging(`refresh-on-miss: ${pluginId} \u2192 ${outcome}`);
        logEvent("tengu_plugin_refresh_on_miss", {
          outcome: fromEnum(outcome),
          ...(refreshError !== undefined && {
            error_kind: fromEnum(classifyPluginCommandError(refreshError)),
          }),
          ...buildPluginEventFieldsFromId(pluginId),
        });
      }
      if (anyResolved) refreshed.add(marketplaceName);
    }
  } catch (error) {
    logForDebugging(`refresh-on-miss: unexpected error: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  return refreshed;
}
//@ chunk-18hwfzwa.js:204071-204622 placement
async function marketplaceLoadErrors(storageV5, retryDelays = BRIDGE_RETRY_DELAYS_MS) {
  let recovered = new Set();
  try {
    let { errors } = await loadAllPluginsCacheOnly(storageV5);
    let failedMarketplaces = new Set(
      errors.flatMap((error) =>
        (error.type === "marketplace-load-failed" || error.type === "marketplace-not-found") &&
        pluginErrorSummary(error)
          ? [error.marketplace]
          : [],
      ),
    );
    if (failedMarketplaces.size === 0) return recovered;
    let knownMarketplaces = await loadKnownMarketplacesSafe(storageV5);
    let stillMissing = new Set(
      [...failedMarketplaces].filter((marketplaceName) => Object.hasOwn(knownMarketplaces, marketplaceName)),
    );
    let delays = [...retryDelays];
    while (stillMissing.size > 0) {
      for (let marketplaceName of [...stillMissing])
        if (
          (await getMarketplaceCacheOnly(marketplaceName, storageV5, {
            registryEntry: knownMarketplaces[marketplaceName],
            registryEntryIsSaved: true,
          })) !== null
        ) {
          stillMissing.delete(marketplaceName);
          recovered.add(marketplaceName);
        }
      let delayMs = delays.shift();
      if (stillMissing.size === 0 || delayMs === undefined) break;
      await sleep(delayMs, undefined, {
        unref: true,
      });
    }
  } catch (error) {
    logError(error);
  }
  return recovered;
}
//@ chunk-18hwfzwa.js:204622-206503 fingerprint = performBackgroundPluginInstallations (0.672)
/**
 * 后台插件安装：对比 settings 声明的市场与 known_marketplaces，reconcileMarketplaces 安装缺失/变化的市场，更新全局市场安装状态，必要时刷新插件；记 tengu_marketplace_background_install。
 */
async function performBackgroundPluginInstallations(setAppState, storageV5) {
  logForDebugging("performBackgroundPluginInstallations called");
  try {
    let declared = getDeclaredMarketplaces();
    let materialized = await loadKnownMarketplacesWithDeclared(storageV5).catch(() => ({}));
    let diff = diffMarketplaces(declared, materialized);
    let pendingNames = [...diff.missing, ...diff.sourceChanged.map((change) => change.name)];
    setAppState.setPendingMarketplaces(pendingNames);
    if (pendingNames.length > 0)
      logForDebugging(`Installing ${pendingNames.length} marketplace(s) in background`);
    let result = await reconcileMarketplaces({
      storageV5,
      onProgress: (event) => {
        switch (event.type) {
          case "installing":
            setAppState.setMarketplaceStatus(event.name, "installing");
            break;
          case "installed":
            setAppState.setMarketplaceStatus(event.name, "installed");
            break;
          case "failed":
            setAppState.setMarketplaceStatus(event.name, "failed", event.error);
            break;
        }
      },
    });
    if (result.installed.length > 0 || result.updated.length > 0 || result.failed.length > 0) {
      let metrics = {
        installed_count: result.installed.length,
        updated_count: result.updated.length,
        failed_count: result.failed.length,
        up_to_date_count: result.upToDate.length,
      };
      logEvent("tengu_marketplace_background_install", metrics);
      logForDiagnosticsNoPII("info", "tengu_marketplace_background_install", metrics);
    }
    let refreshedMarketplaces = await refreshMarketplacesOnMiss(
      new Set([...result.installed, ...result.updated]),
      storageV5,
    );
    let appliedStagedInstalls = result.installed.length > 0 || refreshedMarketplaces.size > 0;
    let recoveredMarketplaces = await marketplaceLoadErrors(
      storageV5,
      appliedStagedInstalls ? [] : BRIDGE_RETRY_DELAYS_MS,
    );
    if (result.installed.length > 0 || refreshedMarketplaces.size > 0 || recoveredMarketplaces.size > 0) {
      updateMarketplaceStatus();
      logForDebugging(
        `Auto-refreshing plugins (installed: ${result.installed.length}, stale-refreshed: ${refreshedMarketplaces.size}, missed at session start: ${recoveredMarketplaces.size})`,
      );
      try {
        await refreshActivePlugins(setAppState, storageV5, undefined, {
          applyStagedInstalls: appliedStagedInstalls,
        });
        if (recoveredMarketplaces.size > 0)
          logEvent("tengu_plugin_load_refresh_window_recovered", {
            marketplace_count: recoveredMarketplaces.size,
          });
      } catch (refreshError) {
        logForDebugging(`Auto-refresh failed, falling back to needsRefresh: ${refreshError}`, {
          level: "error",
        });
        clearPluginCache("performBackgroundPluginInstallations: auto-refresh failed");
        setAppState.markNeedsRefresh("not-loaded");
        logFeatureSad("plugin_marketplace_bg_install", "auto_refresh_failed");
        return;
      }
    } else if (result.updated.length > 0) {
      updateMarketplaceStatus();
      clearPluginCache("performBackgroundPluginInstallations: marketplaces reconciled");
      setAppState.markNeedsRefresh();
    }
    if (result.failed.length > 0) logFeatureSad("plugin_marketplace_bg_install", "reconcile_partial_failure");
    else logFeatureOk("plugin_marketplace_bg_install");
  } catch (error) {
    logError(error);
    logFeatureBad("plugin_marketplace_bg_install", "reconcile_error");
  }
}
export { updateMarketplaceStatus, performBackgroundPluginInstallations };
