/**
 * utils/plugins/headlessPluginInstall.ts
 *
 * 已有模块；g2 补充放置声明
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/headlessPluginInstall.ts
 * pieces: chunk-qna1q0cq.js (3)
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

/**
 * 串行化 headless 插件安装（排在上一轮之后）。
 */
//@ chunk-qna1q0cq.js:1505-1665 placement
function installPluginsForHeadlessSerialized(n, e, s) {
  let r = getPluginRegistry(),
    o = (r.headlessInstallPass ?? Promise.resolve()).then(() => installPluginsForHeadless(n, e, s));
  return (
    (r.headlessInstallPass = o.then(
      () => {
        return;
      },
      () => {
        return;
      },
    )),
    o
  );
}
/**
 * headless/SDK 模式下安装插件：同步种子市场、对账声明的市场（zip 缓存模式下同步到 zip 缓存），安装缺失的启用插件，最后刷新插件缓存；记 tengu_headless_plugin_install。
 */
//@ chunk-qna1q0cq.js:1665-3461 fingerprint = installPluginsForHeadless (0.914)
async function installPluginsForHeadless(n, e, s) {
  let zipCacheMode = isPluginZipCacheEnabled();
  logForDebugging(`installPluginsForHeadless: starting${zipCacheMode ? " (zip cache mode)" : ""}`);
  let seedChanged = await syncSeedMarketplaces(),
    i,
    c = () => i !== void 0 && getPluginRegistry().pluginLoadCacheOnly === i;
  if (seedChanged)
    (updateMarketplaceStatus(),
      clearPluginCache("headlessPluginInstall: seed marketplaces registered"),
      (i = refillPluginLoadCacheOnly(e, "headlessPluginInstall")));
  if (zipCacheMode)
    (await getFsImplementation().mkdir(getZipCacheMarketplacesDir()),
      await getFsImplementation().mkdir(getZipCachePluginsDir()));
  let declaredCount = Object.keys(getDeclaredMarketplaces()).length,
    metrics = { marketplaces_installed: 0, delisted_count: 0 },
    pluginsChanged = seedChanged;
  try {
    if (declaredCount === 0) logForDebugging("installPluginsForHeadless: no marketplaces declared");
    else {
      let reconcileResult = await withDiagnosticsTiming(
        "headless_marketplace_reconcile",
        () =>
          reconcileMarketplaces({
            skip: zipCacheMode ? (l, source) => !isMarketplaceSourceSupportedByZipCache(source) : void 0,
            onProgress: (event) => {
              if (event.type === "installed")
                (n?.({ status: "installed", name: event.name }),
                  logForDebugging(`installPluginsForHeadless: installed marketplace ${event.name}`));
              else if (event.type === "failed")
                (n?.({ status: "failed", name: event.name, error: event.error }),
                  logForDebugging(
                    `installPluginsForHeadless: failed to install marketplace ${event.name}: ${event.error}`,
                  ));
            },
            storageV5: e,
          }),
        (l) => ({
          installed_count: l.installed.length,
          updated_count: l.updated.length,
          failed_count: l.failed.length,
          skipped_count: l.skipped.length,
        }),
      );
      if (reconcileResult.skipped.length > 0)
        logForDebugging(
          `installPluginsForHeadless: skipped ${reconcileResult.skipped.length} marketplace(s) unsupported by zip cache: ${reconcileResult.skipped.join(", ")}`,
        );
      let marketplacesChanged = reconcileResult.installed.length + reconcileResult.updated.length;
      if (marketplacesChanged > 0)
        (updateMarketplaceStatus(),
          clearPluginCache("headlessPluginInstall: marketplaces reconciled"),
          (i = refillPluginLoadCacheOnly(e, "headlessPluginInstall")),
          (pluginsChanged = !0));
      metrics.marketplaces_installed = marketplacesChanged;
    }
    if (zipCacheMode) ((i = void 0), await syncMarketplacesToZipCache(e));
    let m = await detectAndUninstallDelistedPlugins(e);
    if (((metrics.delisted_count = m.length), m.length > 0)) ((pluginsChanged = !0), (i = void 0));
    if (pluginsChanged && !c())
      (clearPluginCache("headlessPluginInstall: plugins changed"),
        refillPluginLoadCacheOnly(e, "headlessPluginInstall"));
    return (y(e, s), pluginsChanged);
  } catch (error) {
    if (
      (logForDebugging(`installPluginsForHeadless: failed: ${errorMessage(error)}`, { level: "error" }),
      pluginsChanged && !c())
    ) {
      if (isStorageV5Enabled() && e !== void 0)
        clearPluginCache("headlessPluginInstall: pass failed after a change");
      refillPluginLoadCacheOnly(e, "headlessPluginInstall");
    }
    return (y(e, s), !1);
  } finally {
    logEvent("tengu_headless_plugin_install", metrics);
  }
}
//@ chunk-qna1q0cq.js:3461-3509 sole-consumer
function y(n, e) {
  if (shouldFillPluginLoadWithStore(e)) loadAllPluginsCacheOnly(n, e).catch(() => {});
}

export { installPluginsForHeadlessSerialized };
