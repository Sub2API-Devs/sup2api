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
import { rFt, BHe } from "../../screens/repl/ReplSessionScope.js";
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
import { getPluginRegistry } from "../../utils/plugins/pluginLoadState.js";
import { uGn, Vj } from "../../utils/plugins/marketplaceSources.js";

//@ chunk-18hwfzwa.js:202646-204071 placement
async function refreshMarketplacesOnMiss(h = new Set(), x) {
  let D = new Set();
  if (shouldSkipPluginAutoupdate()) return D;
  try {
    let L = await checkEnabledPlugins();
    if (L.length === 0) return D;
    let ee = await loadKnownMarketplacesSafe(x),
      ke = getDeclaredMarketplaces(),
      Re = new Map(),
      Be = new Map();
    for (let He of L) {
      let { name: We, marketplace: marketplace } = parsePluginIdentifier(He),
        Xe = marketplace && Object.hasOwn(ee, marketplace) ? ee[marketplace] : void 0;
      if (
        !We ||
        !marketplace ||
        !Xe ||
        isReservedMarketplaceName(marketplace.toLowerCase()) ||
        h.has(marketplace) ||
        Xe.source.source === "settings" ||
        isPluginDirectorySource(Xe.source) ||
        !isSourceAllowedByPolicy(Xe.source) ||
        seedDirFor(Xe.installLocation) !== void 0 ||
        !isMarketplaceAutoUpdate(marketplace, Xe, getMarketplaceAutoUpdate(marketplace, ke))
      )
        continue;
      let rt = Be.get(marketplace);
      if (rt === void 0) ((rt = await getMarketplaceCacheOnly(marketplace, x)), Be.set(marketplace, rt));
      if (rt === null) continue;
      if (!rt.plugins.some((plugin) => plugin.name === We)) {
        let kt = Re.get(marketplace);
        if (kt) kt.push(He);
        else Re.set(marketplace, [He]);
      }
    }
    if (Re.size === 0) return D;
    (logForDebugging(
      `refresh-on-miss: ${Re.size} marketplace(s) have enabled plugins missing from local catalog; refreshing`,
    ),
      await sleep(Math.floor(Math.random() * rFt), void 0, { unref: !0 }));
    for (let [He, We] of Re) {
      let ze;
      try {
        await refreshMarketplaceDeduped(He, x, void 0, { skipIfRecent: !0 });
      } catch (error) {
        ((ze = error),
          logForDebugging(`refresh-on-miss: failed to refresh marketplace '${He}': ${errorMessage(error)}`, {
            level: "warn",
          }));
      }
      let Xe = ze !== void 0 ? null : await getMarketplaceCacheOnly(He, x),
        rt = !1;
      for (let kt of We) {
        let { name: At } = parsePluginIdentifier(kt),
          It = Xe !== null && Xe.plugins.some((plugin) => plugin.name === At);
        rt ||= It;
        let Ot = ze !== void 0 ? "refresh_failed" : It ? "resolved" : "still_missing";
        (logForDebugging(`refresh-on-miss: ${kt} \u2192 ${Ot}`),
          logEvent("tengu_plugin_refresh_on_miss", {
            outcome: fromEnum(Ot),
            ...(ze !== void 0 && { error_kind: fromEnum(classifyPluginCommandError(ze)) }),
            ...buildPluginEventFieldsFromId(kt),
          }));
      }
      if (rt) D.add(He);
    }
  } catch (error) {
    logForDebugging(`refresh-on-miss: unexpected error: ${errorMessage(error)}`, { level: "warn" });
  }
  return D;
}
//@ chunk-18hwfzwa.js:204071-204622 placement
async function marketplaceLoadErrors(h, x = BHe) {
  let D = new Set();
  try {
    let { errors: errors } = await loadAllPluginsCacheOnly(h),
      ee = new Set(
        errors.flatMap((He) =>
          (He.type === "marketplace-load-failed" || He.type === "marketplace-not-found") &&
          pluginErrorSummary(He)
            ? [He.marketplace]
            : [],
        ),
      );
    if (ee.size === 0) return D;
    let ke = await loadKnownMarketplacesSafe(h),
      Re = new Set([...ee].filter((He) => Object.hasOwn(ke, He))),
      Be = [...x];
    while (Re.size > 0) {
      for (let We of [...Re])
        if (
          (await getMarketplaceCacheOnly(We, h, { registryEntry: ke[We], registryEntryIsSaved: !0 })) !== null
        )
          (Re.delete(We), D.add(We));
      let He = Be.shift();
      if (Re.size === 0 || He === void 0) break;
      await sleep(He, void 0, { unref: !0 });
    }
  } catch (error) {
    logError(error);
  }
  return D;
}
/**
 * 后台插件安装：对比 settings 声明的市场与 known_marketplaces，reconcileMarketplaces 安装缺失/变化的市场，更新全局市场安装状态，必要时刷新插件；记 tengu_marketplace_background_install。
 */
//@ chunk-18hwfzwa.js:204622-206503 fingerprint = performBackgroundPluginInstallations (0.672)
async function performBackgroundPluginInstallations(h, x) {
  logForDebugging("performBackgroundPluginInstallations called");
  try {
    let declared = getDeclaredMarketplaces(),
      materialized = await loadKnownMarketplacesWithDeclared(x).catch(() => ({})),
      diff = diffMarketplaces(declared, materialized),
      pendingNames = [...diff.missing, ...diff.sourceChanged.map((ze) => ze.name)];
    if ((h.setPendingMarketplaces(pendingNames), pendingNames.length > 0))
      logForDebugging(`Installing ${pendingNames.length} marketplace(s) in background`);
    let result = await reconcileMarketplaces({
      storageV5: x,
      onProgress: (event) => {
        switch (event.type) {
          case "installing":
            h.setMarketplaceStatus(event.name, "installing");
            break;
          case "installed":
            h.setMarketplaceStatus(event.name, "installed");
            break;
          case "failed":
            h.setMarketplaceStatus(event.name, "failed", event.error);
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
      (logEvent("tengu_marketplace_background_install", metrics),
        logForDiagnosticsNoPII("info", "tengu_marketplace_background_install", metrics));
    }
    let Be = await refreshMarketplacesOnMiss(new Set([...result.installed, ...result.updated]), x),
      He = result.installed.length > 0 || Be.size > 0,
      We = await marketplaceLoadErrors(x, He ? [] : BHe);
    if (result.installed.length > 0 || Be.size > 0 || We.size > 0) {
      (updateMarketplaceStatus(),
        logForDebugging(
          `Auto-refreshing plugins (installed: ${result.installed.length}, stale-refreshed: ${Be.size}, missed at session start: ${We.size})`,
        ));
      try {
        if ((await refreshActivePlugins(h, x, void 0, { applyStagedInstalls: He }), We.size > 0))
          logEvent("tengu_plugin_load_refresh_window_recovered", { marketplace_count: We.size });
      } catch (refreshError) {
        (logForDebugging(`Auto-refresh failed, falling back to needsRefresh: ${refreshError}`, {
          level: "error",
        }),
          clearPluginCache("performBackgroundPluginInstallations: auto-refresh failed"),
          h.markNeedsRefresh("not-loaded"),
          logFeatureSad("plugin_marketplace_bg_install", "auto_refresh_failed"));
        return;
      }
    } else if (result.updated.length > 0)
      (updateMarketplaceStatus(),
        clearPluginCache("performBackgroundPluginInstallations: marketplaces reconciled"),
        h.markNeedsRefresh());
    if (result.failed.length > 0) logFeatureSad("plugin_marketplace_bg_install", "reconcile_partial_failure");
    else logFeatureOk("plugin_marketplace_bg_install");
  } catch (error) {
    (logError(error), logFeatureBad("plugin_marketplace_bg_install", "reconcile_error"));
  }
}
/**
 * 重置全局市场安装状态（marketplaces 状态表与进行中的刷新）。
 */
//@ chunk-e6aww6q8.js:4233013-4233217 callgraph-fingerprint = updateMarketplaceStatus (0.212)
function updateMarketplaceStatus() {
  let e = getPluginRegistry();
  (e.marketplaces.clear(),
    e.marketplaceRefreshesInFlight.clear(),
    uGn(),
    Vj().raw.clear(),
    Vj().v5.clear(),
    e.marketplaceHelperMemo.clear(),
    e.marketplaceResolutionNoticesLogged.clear());
}

export { updateMarketplaceStatus, performBackgroundPluginInstallations };
