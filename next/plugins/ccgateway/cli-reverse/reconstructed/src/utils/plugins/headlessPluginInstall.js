/**
 * utils/plugins/headlessPluginInstall.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/headlessPluginInstall.ts
 * pieces: chunk-54b7qs0h.js (3)
 * attribution: placement 1, fingerprint 1, sole-consumer 1
 */
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  isPluginZipCacheEnabled,
  getZipCacheMarketplacesDir,
  getZipCachePluginsDir,
  isMarketplaceSourceSupportedByZipCache,
} from "./zipCache.js";
import { logForDebugging } from "../debug.js";
import { syncSeedMarketplaces, getDeclaredMarketplaces } from "./marketplaceManager.js";
import { updateMarketplaceStatus } from "../../services/plugins/PluginInstallationManager.js";
import {
  clearPluginCache,
  refillPluginLoadCacheOnly,
  shouldFillPluginLoadWithStore,
  loadAllPluginsCacheOnly,
} from "./pluginLoader.js";
import { getFsImplementation } from "../fsOperations.js";
import { withDiagnosticsTiming } from "../diagLogs.js";
import { reconcileMarketplaces } from "./reconciler.js";
import { syncMarketplacesToZipCache } from "./zipCacheAdapters.js";
import { detectAndUninstallDelistedPlugins } from "./pluginBlocklist.js";
import { errorMessage } from "../errors.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { logEvent } from "../../services/analytics/index.js";

//@ chunk-54b7qs0h.js:1506-1666 placement
/**
 * 串行化 headless 插件安装（排在上一轮之后）。
 */
function installPluginsForHeadlessSerialized(pluginIds, storageV5, credentials) {
  let pluginRegistry = getPluginRegistry();
  let pass = (pluginRegistry.headlessInstallPass ?? Promise.resolve()).then(() =>
    installPluginsForHeadless(pluginIds, storageV5, credentials),
  );
  pluginRegistry.headlessInstallPass = pass.then(
    () => {
      return;
    },
    () => {
      return;
    },
  );
  return pass;
}
//@ chunk-54b7qs0h.js:1666-3463 fingerprint (2.1.88 match: installPluginsForHeadless, 0.914)
/**
 * headless/SDK 模式下安装插件：同步种子市场、对账声明的市场（zip 缓存模式下同步到 zip 缓存），安装缺失的启用插件，最后刷新插件缓存；记 tengu_headless_plugin_install。
 */
async function installPluginsForHeadless(onProgress, storageV5, credentials) {
  let zipCacheMode = isPluginZipCacheEnabled();
  logForDebugging(`installPluginsForHeadless: starting${zipCacheMode ? " (zip cache mode)" : ""}`);
  let seedChanged = await syncSeedMarketplaces();
  let loadCache;
  let isCacheStillCurrent = () =>
    loadCache !== undefined && getPluginRegistry().pluginLoadCacheOnly === loadCache;
  if (seedChanged) {
    updateMarketplaceStatus();
    clearPluginCache("headlessPluginInstall: seed marketplaces registered");
    loadCache = refillPluginLoadCacheOnly(storageV5, "headlessPluginInstall");
  }
  if (zipCacheMode) {
    await getFsImplementation().mkdir(getZipCacheMarketplacesDir());
    await getFsImplementation().mkdir(getZipCachePluginsDir());
  }
  let declaredCount = Object.keys(getDeclaredMarketplaces()).length;
  let metrics = {
    marketplaces_installed: 0,
    delisted_count: 0,
  };
  let pluginsChanged = seedChanged;
  try {
    if (declaredCount === 0) logForDebugging("installPluginsForHeadless: no marketplaces declared");
    else {
      let reconcileResult = await withDiagnosticsTiming(
        "headless_marketplace_reconcile",
        () =>
          reconcileMarketplaces({
            skip: zipCacheMode
              ? (_name, source) => !isMarketplaceSourceSupportedByZipCache(source)
              : undefined,
            onProgress: (event) => {
              if (event.type === "installed") {
                onProgress?.({
                  status: "installed",
                  name: event.name,
                });
                logForDebugging(`installPluginsForHeadless: installed marketplace ${event.name}`);
              } else if (event.type === "failed") {
                onProgress?.({
                  status: "failed",
                  name: event.name,
                  error: event.error,
                });
                logForDebugging(
                  `installPluginsForHeadless: failed to install marketplace ${event.name}: ${event.error}`,
                );
              }
            },
            storageV5,
          }),
        (result) => ({
          installed_count: result.installed.length,
          updated_count: result.updated.length,
          failed_count: result.failed.length,
          skipped_count: result.skipped.length,
        }),
      );
      if (reconcileResult.skipped.length > 0)
        logForDebugging(
          `installPluginsForHeadless: skipped ${reconcileResult.skipped.length} marketplace(s) unsupported by zip cache: ${reconcileResult.skipped.join(", ")}`,
        );
      let marketplacesChanged = reconcileResult.installed.length + reconcileResult.updated.length;
      if (marketplacesChanged > 0) {
        updateMarketplaceStatus();
        clearPluginCache("headlessPluginInstall: marketplaces reconciled");
        loadCache = refillPluginLoadCacheOnly(storageV5, "headlessPluginInstall");
        pluginsChanged = true;
      }
      metrics.marketplaces_installed = marketplacesChanged;
    }
    if (zipCacheMode) {
      loadCache = undefined;
      await syncMarketplacesToZipCache(storageV5);
    }
    let newlyDelisted = await detectAndUninstallDelistedPlugins(storageV5);
    metrics.delisted_count = newlyDelisted.length;
    if (newlyDelisted.length > 0) {
      pluginsChanged = true;
      loadCache = undefined;
    }
    if (pluginsChanged && !isCacheStillCurrent()) {
      clearPluginCache("headlessPluginInstall: plugins changed");
      refillPluginLoadCacheOnly(storageV5, "headlessPluginInstall");
    }
    prefetchPluginsIfEnabled(storageV5, credentials);
    return pluginsChanged;
  } catch (error) {
    logForDebugging(`installPluginsForHeadless: failed: ${errorMessage(error)}`, {
      level: "error",
    });
    if (pluginsChanged && !isCacheStillCurrent()) {
      if (isStorageV5Enabled() && storageV5 !== undefined)
        clearPluginCache("headlessPluginInstall: pass failed after a change");
      refillPluginLoadCacheOnly(storageV5, "headlessPluginInstall");
    }
    prefetchPluginsIfEnabled(storageV5, credentials);
    return false;
  } finally {
    logEvent("tengu_headless_plugin_install", metrics);
  }
}
//@ chunk-54b7qs0h.js:3463-3511 sole-consumer
function prefetchPluginsIfEnabled(pluginIds, storageV5) {
  if (shouldFillPluginLoadWithStore(storageV5)) loadAllPluginsCacheOnly(pluginIds, storageV5).catch(() => {});
}
export { installPluginsForHeadlessSerialized };
