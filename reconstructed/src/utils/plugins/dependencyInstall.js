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
async function ensureCatalogForOfficialDeps(l, storageV5) {
  return l.some((n) => n.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    ? ensurePluginDirectoryCatalog(storageV5)
    : "not_needed";
}
//@ chunk-jnt55rm1.js:617-650 placement
var INSTALLABLE_SCOPES = ["user", "project", "local"];
//@ chunk-jnt55rm1.js:650-2555 placement
/**
 * 找出缺失的插件依赖并按市场安装（策略阻止、跨市场依赖不在声明市场时跳过）。
 */
async function resolveMissingDependencies(errors, r) {
  let n = new Map();
  for (let e of errors) {
    if (e.type !== "dependency-unsatisfied" || e.reason !== "not-found") continue;
    let a = n.get(e.dependency);
    if (!a) {
      a = new Set();
      n.set(e.dependency, a);
    }
    a.add(e.source);
  }
  if (n.size === 0)
    return {
      installed: [],
      stillUnresolved: [],
      marketplaceMissing: [],
    };
  let knownMarketplaces = await loadKnownMarketplacesSafe(r);
  let mapped = INSTALLABLE_SCOPES.map((e) => [e, getEnabledPluginIdsInSource(scopeToSettingSource(e))]);
  let g = [];
  let s = [];
  let p = [];
  for (let [e, a] of n) {
    let marketplace = parsePluginIdentifier(e).marketplace;
    let k = marketplace ? ownPropertyOrUndefined(knownMarketplaces, marketplace) : undefined;
    if (!marketplace || !k) {
      s.push(e);
      p.push(e);
      continue;
    }
    if (!isSourceAllowedByPolicy(k.source)) {
      logForDebugging(
        `resolveMissingDependencies: skipping "${e}" \u2014 marketplace "${marketplace}" is blocked by enterprise policy`,
      );
      s.push(e);
      continue;
    }
    let y = false;
    for (let o of a) {
      let marketplace_2 = parsePluginIdentifier(o).marketplace;
      if (marketplace_2 === marketplace) {
        y = true;
        break;
      }
      if (!marketplace_2) continue;
      if (
        (await getMarketplaceCacheOnly(marketplace_2, r))?.allowCrossMarketplaceDependenciesOn?.includes(
          marketplace,
        )
      ) {
        y = true;
        break;
      }
    }
    if (!y) {
      logForDebugging(
        `resolveMissingDependencies: skipping "${e}" \u2014 cross-marketplace dependency not in any declaring marketplace's allowlist`,
      );
      s.push(e);
      continue;
    }
    try {
      let pluginByIdAnySource = await getPluginByIdAnySource(e, r, "install");
      if (!pluginByIdAnySource) {
        s.push(e);
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
            marketplaceSource: marketplaceSourceOfEntry(e, knownMarketplaces),
            trustedSettingsEntryAuth: findSettingsArchiveEntry(
              marketplaceNameOfId(e),
              pluginByIdAnySource.entry.name,
            ),
          }).entry,
        )
      ) {
        logForDebugging(
          `resolveMissingDependencies: skipping "${e}" \u2014 it fetches its archive through an entry headersHelper, which only an explicit install from /plugin may run`,
        );
        s.push(e);
        continue;
      }
      let m = marketplaceWithDependency(a, mapped);
      let h = await installResolvedPlugin({
        pluginId: e,
        entry: pluginByIdAnySource.entry,
        scope: m ?? "user",
        marketplaceInstallLocation: pluginByIdAnySource.marketplaceInstallLocation,
        trigger: "dependency-resolution",
        explicit: false,
        auto: m !== undefined,
        requiredByEnabledDependent: true,
        storageV5: r,
      });
      if (h.ok) {
        for (let S of h.closure) if (!g.includes(S)) g.push(S);
      } else {
        logForDebugging(`resolveMissingDependencies: install of "${e}" did not complete (${h.reason})`, {
          level: "warn",
        });
        s.push(e);
      }
    } catch (error) {
      logForDebugging(`resolveMissingDependencies: install of "${e}" threw: ${errorMessage(error)}`, {
        level: "warn",
      });
      s.push(e);
    }
  }
  return {
    installed: g,
    stillUnresolved: s,
    marketplaceMissing: p,
  };
}
//@ chunk-jnt55rm1.js:2555-2652 placement
/**
 * dependencyErrorsForSource：某来源的依赖加载错误。
 */
async function dependencyErrorsForSource(l, r) {
  let { errors } = await loadAllPluginsCacheOnly(r);
  return errors.filter(isDependencyError).filter((error) => error.source === l);
}
//@ chunk-jnt55rm1.js:2652-2901 placement
/**
 * 安装插件缺失的依赖并生成结果后缀文字。
 */
async function installMissingDependencies(l, storageV5) {
  let n = await dependencyErrorsForSource(l, storageV5);
  if (n.length === 0) return null;
  let { installed, marketplaceMissing } = await resolveMissingDependencies(n, storageV5);
  let g = new Set(installed);
  let filtered = uniq(n.map((p) => p.dependency)).filter((p) => !g.has(p));
  return {
    suffix: `${formatDependencyCountSuffix(installed)}${missingDependenciesHint(filtered, marketplaceMissing)}`,
    changed: installed.length > 0,
  };
}
//@ chunk-jnt55rm1.js:2901-2977 placement
function marketplaceWithDependency(l, r) {
  for (let [n, i] of r) for (let f of l) if (i.has(f)) return n;
  return;
}
export {
  resolveMissingDependencies,
  dependencyErrorsForSource,
  installMissingDependencies,
  ensureCatalogForOfficialDeps,
};
