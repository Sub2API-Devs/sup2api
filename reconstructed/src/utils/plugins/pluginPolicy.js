/**
 * utils/plugins/pluginPolicy.ts
 *
 * 并入已有模块：插件策略
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginPolicy.ts
 * pieces: chunk-czx62zen.js (5)
 * attribution: callgraph-witnessed 1, placement 4
 */
import { getSettingsForSourceForUpkeep, getSettingsForSource } from "../settings/settings.js";
import { mO, toSyncedDependencyId, qualifyDependency } from "./dependencyResolver.js";
import { canonicalPluginId, parsePluginIdentifier } from "./pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE, BUILTIN } from "../telemetry/pluginTelemetry.js";
import { ibr } from "../../skills/syncedSkills.js";
import { getPolicyEnabledPluginEntries, z, policyEnabledPluginIds } from "./managedPlugins.js";

/**
 * 返回指定设置源（如 policySettings）enabledPlugins 中处于启用状态的插件 ID 集合。
 */
//@ chunk-czx62zen.js:10157-10267 callgraph-witnessed = isPluginBlockedByPolicy (0.576)
function getEnabledPluginIdsInSource(pluginId) {
  return new Set(
    Object.entries(getSettingsForSourceForUpkeep(pluginId)?.enabledPlugins ?? {})
      .filter(([, n]) => mO(n))
      .map(([n]) => n),
  );
}
/**
 * 从根插件开始按 manifest.dependencies 广度遍历：依赖 id 先按声明方市场补全，再在已加载插件中查找 （优先已启用，其次 inline、synced 改写后的同名插件）。返回依赖闭包 closure 与找不到的 missing。
 */
//@ chunk-czx62zen.js:12277-13224 placement
function computeDependencyClosure(rootId, plugins) {
  let bySource = new Map(plugins.map((i) => [i.source, i])),
    byName = new Map();
  for (let i of plugins) {
    let d = byName.get(i.name);
    if (!d || (!d.enabled && i.enabled)) byName.set(i.name, i);
  }
  let resolvePlugin = (i, d) => {
      let g = canonicalPluginId(i),
        { name: p, marketplace: marketplace } = parsePluginIdentifier(g);
      if (!marketplace) {
        let M = bySource.get(g) ?? byName.get(g),
          k = F(g),
          m = k === void 0 ? void 0 : bySource.get(k);
        return M?.enabled || !m?.enabled ? (M ?? m) : m;
      }
      let h = bySource.get(g);
      if (h?.enabled) return h;
      let S = bySource.get(`${p}@${INLINE_PLUGIN_MARKETPLACE}`);
      if (S?.enabled) return S;
      let y = d === void 0 ? void 0 : toSyncedDependencyId(g, d),
        w = y === void 0 ? void 0 : bySource.get(y);
      if (w?.enabled) return w;
      return h ?? S ?? w;
    },
    closure = [],
    missing = [],
    root = resolvePlugin(rootId, void 0),
    seen = new Set([rootId]);
  if (root) seen.add(root.source);
  let queue = root
    ? (root.manifest.dependencies ?? []).map((i) => ({ id: i, declaringId: root.source }))
    : [];
  while (queue.length > 0) {
    let i = queue.shift();
    if (!i) break;
    let d = qualifyDependency(i.id, i.declaringId),
      g = resolvePlugin(d, i.declaringId);
    if (!g) {
      if (!seen.has(d)) (seen.add(d), missing.push(d));
      continue;
    }
    if (seen.has(g.source)) continue;
    (seen.add(g.source), closure.push(g.source));
    for (let p of g.manifest.dependencies ?? []) queue.push({ id: p, declaringId: g.source });
  }
  return { closure: closure, missing: missing };
}
//@ chunk-czx62zen.js:13224-13284 placement
function F(e) {
  let n = ibr(e);
  return n === e ? void 0 : `${n}@${BUILTIN}`;
}
//@ chunk-czx62zen.js:13284-13352 placement
function af() {
  let e = getPolicyEnabledPluginEntries();
  return e ? new Set(e.map((n) => n.name)) : null;
}
/**
 * 取组织策略设置中允许的插件集合：合并 policySettings 与当前生效设置两处的允许列表（都没有则 undefined）。
 */
//@ chunk-czx62zen.js:13352-13462 placement = _temp7 (1)
function getPolicyAllowedSet() {
  let e = getSettingsForSource("policySettings"),
    n = z(),
    o = policyEnabledPluginIds(e),
    s = n === e ? null : policyEnabledPluginIds(n);
  return o && s ? new Set([...o, ...s]) : (o ?? s);
}

export { getPolicyAllowedSet, af, computeDependencyClosure, getEnabledPluginIdsInSource, F };
