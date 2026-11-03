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
import { Zb, findSettingsArchiveEntry } from "./marketplaceSources.js";
import { isSourceAllowedByPolicy } from "./marketplacePolicy.js";
import { logForDebugging } from "../debug.js";
import { hasHeadersHelper } from "../../services/mcp/types.js";
import { headersHelperNotRunReason, E$e, mE } from "./headersHelper.js";
import { installResolvedPlugin } from "./pluginInstallationHelpers.js";
import { errorMessage } from "../errors.js";
import { loadAllPluginsCacheOnly } from "./pluginLoader.js";
import { isDependencyError } from "./marketplaceNames.js";
import { uniq } from "../collections.js";
import { formatDependencyCountSuffix, missingDependenciesHint } from "./dependencyResolver.js";

//@ chunk-jnt55rm1.js:532-617 placement
async function DFs(l, r) {
  return l.some((n) => n.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    ? ensurePluginDirectoryCatalog(r)
    : "not_needed";
}
//@ chunk-jnt55rm1.js:617-650 placement
var M = ["user", "project", "local"];
/**
 * 找出缺失的插件依赖并按市场安装（策略阻止、跨市场依赖不在声明市场时跳过）。
 */
//@ chunk-jnt55rm1.js:650-2555 placement
async function resolveMissingDependencies(l, r) {
  let n = new Map();
  for (let e of l) {
    if (e.type !== "dependency-unsatisfied" || e.reason !== "not-found") continue;
    let a = n.get(e.dependency);
    if (!a) ((a = new Set()), n.set(e.dependency, a));
    a.add(e.source);
  }
  if (n.size === 0) return { installed: [], stillUnresolved: [], marketplaceMissing: [] };
  let i = await loadKnownMarketplacesSafe(r),
    mapped = M.map((e) => [e, getEnabledPluginIdsInSource(scopeToSettingSource(e))]),
    g = [],
    s = [],
    p = [];
  for (let [e, a] of n) {
    let marketplace = parsePluginIdentifier(e).marketplace,
      k = marketplace ? Zb(i, marketplace) : void 0;
    if (!marketplace || !k) {
      (s.push(e), p.push(e));
      continue;
    }
    if (!isSourceAllowedByPolicy(k.source)) {
      (logForDebugging(
        `resolveMissingDependencies: skipping "${e}" \u2014 marketplace "${marketplace}" is blocked by enterprise policy`,
      ),
        s.push(e));
      continue;
    }
    let y = !1;
    for (let o of a) {
      let marketplace_2 = parsePluginIdentifier(o).marketplace;
      if (marketplace_2 === marketplace) {
        y = !0;
        break;
      }
      if (!marketplace_2) continue;
      if (
        (await getMarketplaceCacheOnly(marketplace_2, r))?.allowCrossMarketplaceDependenciesOn?.includes(
          marketplace,
        )
      ) {
        y = !0;
        break;
      }
    }
    if (!y) {
      (logForDebugging(
        `resolveMissingDependencies: skipping "${e}" \u2014 cross-marketplace dependency not in any declaring marketplace's allowlist`,
      ),
        s.push(e));
      continue;
    }
    try {
      let o = await getPluginByIdAnySource(e, r, "install");
      if (!o) {
        s.push(e);
        continue;
      }
      let source = o.entry.source;
      if (
        typeof source === "object" &&
        source.source === "archive" &&
        hasHeadersHelper(
          headersHelperNotRunReason({
            entry: o.entry,
            archiveUrl: source.url,
            marketplaceSource: E$e(e, i),
            trustedSettingsEntryAuth: findSettingsArchiveEntry(mE(e), o.entry.name),
          }).entry,
        )
      ) {
        (logForDebugging(
          `resolveMissingDependencies: skipping "${e}" \u2014 it fetches its archive through an entry headersHelper, which only an explicit install from /plugin may run`,
        ),
          s.push(e));
        continue;
      }
      let m = D(a, mapped),
        h = await installResolvedPlugin({
          pluginId: e,
          entry: o.entry,
          scope: m ?? "user",
          marketplaceInstallLocation: o.marketplaceInstallLocation,
          trigger: "dependency-resolution",
          explicit: !1,
          auto: m !== void 0,
          requiredByEnabledDependent: !0,
          storageV5: r,
        });
      if (h.ok) {
        for (let S of h.closure) if (!g.includes(S)) g.push(S);
      } else
        (logForDebugging(`resolveMissingDependencies: install of "${e}" did not complete (${h.reason})`, {
          level: "warn",
        }),
          s.push(e));
    } catch (error) {
      (logForDebugging(`resolveMissingDependencies: install of "${e}" threw: ${errorMessage(error)}`, {
        level: "warn",
      }),
        s.push(e));
    }
  }
  return { installed: g, stillUnresolved: s, marketplaceMissing: p };
}
//@ chunk-jnt55rm1.js:2555-2652 placement
async function YCo(l, r) {
  let { errors: errors } = await loadAllPluginsCacheOnly(r);
  return errors.filter(isDependencyError).filter((i) => i.source === l);
}
/**
 * 安装插件缺失的依赖并生成结果后缀文字。
 */
//@ chunk-jnt55rm1.js:2652-2901 placement
async function installMissingDependencies(l, r) {
  let n = await YCo(l, r);
  if (n.length === 0) return null;
  let { installed: installed, marketplaceMissing: marketplaceMissing } = await resolveMissingDependencies(
      n,
      r,
    ),
    g = new Set(installed),
    filtered = uniq(n.map((p) => p.dependency)).filter((p) => !g.has(p));
  return {
    suffix: `${formatDependencyCountSuffix(installed)}${missingDependenciesHint(filtered, marketplaceMissing)}`,
    changed: installed.length > 0,
  };
}
//@ chunk-jnt55rm1.js:2901-2977 placement
function D(l, r) {
  for (let [n, i] of r) for (let f of l) if (i.has(f)) return n;
  return;
}

export { resolveMissingDependencies, YCo, installMissingDependencies, DFs };
