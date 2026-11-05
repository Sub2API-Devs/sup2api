/**
 * utils/plugins/pluginPolicy.ts
 *
 * 并入已有模块：插件策略
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginPolicy.ts
 * pieces: chunk-r7hswen6.js (5)
 * attribution: callgraph-witnessed 1, placement 4
 */
import { getSettingsForSourceForUpkeep, getSettingsForSource } from "../settings/settings.js";
import {
  isDependencyAutoInstallState,
  toSyncedDependencyId,
  qualifyDependency,
} from "./dependencyResolver.js";
import { canonicalPluginId, parsePluginIdentifier } from "./pluginIdentifier.js";
import { INLINE_PLUGIN_MARKETPLACE, BUILTIN } from "../telemetry/pluginTelemetry.js";
import { externalSkillToPluginName } from "../../skills/syncedSkills.js";
import {
  getPolicyEnabledPluginEntries,
  assuredPolicySettings,
  policyEnabledPluginIds,
} from "./managedPlugins.js";

//@ chunk-r7hswen6.js:10160-10270 callgraph-witnessed (2.1.88 match: isPluginBlockedByPolicy, 0.576)
/**
 * 返回指定设置源（如 policySettings）enabledPlugins 中处于启用状态的插件 ID 集合。
 */
function getEnabledPluginIdsInSource(pluginId) {
  return new Set(
    Object.entries(getSettingsForSourceForUpkeep(pluginId)?.enabledPlugins ?? {})
      .filter(([, value]) => isDependencyAutoInstallState(value))
      .map(([key]) => key),
  );
}
//@ chunk-r7hswen6.js:12280-13227 placement
/**
 * 从根插件开始按 manifest.dependencies 广度遍历：依赖 id 先按声明方市场补全，再在已加载插件中查找 （优先已启用，其次 inline、synced 改写后的同名插件）。返回依赖闭包 closure 与找不到的 missing。
 */
function computeDependencyClosure(rootId, plugins) {
  let bySource = new Map(plugins.map((plugin) => [plugin.source, plugin]));
  let byName = new Map();
  for (let plugin of plugins) {
    let plugin_2 = byName.get(plugin.name);
    if (!plugin_2 || (!plugin_2.enabled && plugin.enabled)) byName.set(plugin.name, plugin);
  }
  let resolvePlugin = (id, declaringId) => {
    let canonical = canonicalPluginId(id);
    let { name, marketplace } = parsePluginIdentifier(canonical);
    if (!marketplace) {
      let byNameHit = bySource.get(canonical) ?? byName.get(canonical);
      let builtinId = builtinQualifiedId(canonical);
      let builtinPlugin = builtinId === undefined ? undefined : bySource.get(builtinId);
      return byNameHit?.enabled || !builtinPlugin?.enabled ? (byNameHit ?? builtinPlugin) : builtinPlugin;
    }
    let bySourceHit = bySource.get(canonical);
    if (bySourceHit?.enabled) return bySourceHit;
    let inlinePlugin = bySource.get(`${name}@${INLINE_PLUGIN_MARKETPLACE}`);
    if (inlinePlugin?.enabled) return inlinePlugin;
    let syncedId = declaringId === undefined ? undefined : toSyncedDependencyId(canonical, declaringId);
    let syncedPlugin = syncedId === undefined ? undefined : bySource.get(syncedId);
    if (syncedPlugin?.enabled) return syncedPlugin;
    return bySourceHit ?? inlinePlugin ?? syncedPlugin;
  };
  let closure = [];
  let missing = [];
  let root = resolvePlugin(rootId, undefined);
  let seen = new Set([rootId]);
  if (root) seen.add(root.source);
  let queue = root
    ? (root.manifest.dependencies ?? []).map((id) => ({
        id,
        declaringId: root.source,
      }))
    : [];
  while (queue.length > 0) {
    let entry = queue.shift();
    if (!entry) break;
    let dependencyId = qualifyDependency(entry.id, entry.declaringId);
    let plugin = resolvePlugin(dependencyId, entry.declaringId);
    if (!plugin) {
      if (!seen.has(dependencyId)) {
        seen.add(dependencyId);
        missing.push(dependencyId);
      }
      continue;
    }
    if (seen.has(plugin.source)) continue;
    seen.add(plugin.source);
    closure.push(plugin.source);
    for (let id of plugin.manifest.dependencies ?? [])
      queue.push({
        id,
        declaringId: plugin.source,
      });
  }
  return {
    closure,
    missing,
  };
}
//@ chunk-r7hswen6.js:13227-13287 placement
/**
 * builtinQualifiedId：内置插件的规范 id。
 */
function builtinQualifiedId(name) {
  let externalName = externalSkillToPluginName(name);
  return externalName === name ? undefined : `${externalName}@${BUILTIN}`;
}
//@ chunk-r7hswen6.js:13287-13355 placement
/**
 * policyEnabledPluginNameSet：策略启用的插件名集合。
 */
function policyEnabledPluginNameSet() {
  let policyEnabledPluginEntries = getPolicyEnabledPluginEntries();
  return policyEnabledPluginEntries
    ? new Set(policyEnabledPluginEntries.map((policyEnabledPluginEntry) => policyEnabledPluginEntry.name))
    : null;
}
//@ chunk-r7hswen6.js:13355-13465 placement (2.1.88 match: _temp7, 1)
/**
 * 取组织策略设置中允许的插件集合：合并 policySettings 与当前生效设置两处的允许列表（都没有则 undefined）。
 */
function getPolicyAllowedSet() {
  let settingsForSource = getSettingsForSource("policySettings");
  let assured = assuredPolicySettings();
  let fromPolicy = policyEnabledPluginIds(settingsForSource);
  let fromAssured = assured === settingsForSource ? null : policyEnabledPluginIds(assured);
  return fromPolicy && fromAssured ? new Set([...fromPolicy, ...fromAssured]) : (fromPolicy ?? fromAssured);
}
export {
  policyEnabledPluginNameSet,
  getPolicyAllowedSet,
  builtinQualifiedId,
  getEnabledPluginIdsInSource,
  computeDependencyClosure,
};
