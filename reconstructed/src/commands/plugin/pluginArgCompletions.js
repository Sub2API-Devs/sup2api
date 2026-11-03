/**
 * commands/plugin/pluginArgCompletions.ts
 *
 * 2.1.316 新增。/plugin 命令参数补全。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-rkhcn3s2.js (6)
 * attribution: placement 6
 */
import { QE, jF } from "../../utils/plugins/pluginGates.js";
import {
  getInstalledPlugins,
  hasInstallationForCurrentProject,
  findInstallationForCurrentProject,
  formatFirstKnownVersion,
  isPluginInstalled,
} from "../../utils/plugins/installedPluginsManager.js";
import { getPluginEditableScopes } from "../../utils/plugins/pluginStartupCheck.js";
import { getRootSession } from "../../bootstrap/state.js";
import { parsePluginArgs } from "./parseArgs.js";
import {
  loadKnownMarketplacesSafe,
  getMarketplaceCacheOnly,
} from "../../utils/plugins/marketplaceManager.js";
import { getMarketplaceSourceDisplay, formatPluginId } from "../../utils/plugins/marketplaceHelpers.js";
import { HostScoped } from "../../utils/hostScoped.js";
import { jsonStringify } from "../../utils/slowOperations.js";
import { isPluginBlockedByPolicy } from "../../utils/plugins/marketplacePolicy.js";

/**
 * /plugin 参数补全的候选：list 的 --enabled/--disabled 过滤项，以及 marketplace 子命令（add/remove/update/list）。
 */
//@ chunk-rkhcn3s2.js:11904-12316 placement
var LIST_FLAG_COMPLETIONS = [
    { value: "--enabled", description: "Only show enabled plugins", isFinal: !0 },
    { value: "--disabled", description: "Only show disabled plugins", isFinal: !0 },
  ],
  MARKETPLACE_SUBCOMMAND_COMPLETIONS = [
    { value: "add", description: "Add a marketplace from a URL or path" },
    { value: "remove", description: "Remove a known marketplace" },
    { value: "update", description: "Refresh a marketplace from its source" },
    { value: "list", description: "List known marketplaces", isFinal: !0 },
  ];
//@ chunk-rkhcn3s2.js:12316-14075 placement
async function pluginArgCompletions(i, t, r) {
  if (i.length === 0) {
    let n = [
      { value: "list", description: "List installed plugins", isFinal: !0 },
      { value: "enable", description: "Enable an installed plugin" },
      { value: "disable", description: "Disable an installed plugin" },
      { value: "install", description: "Install a plugin from a marketplace" },
      { value: "uninstall", description: "Remove an installed plugin" },
      { value: "marketplace", description: "Manage plugin marketplaces" },
      ...(QE() ? [{ value: "directory", description: "Search the Anthropic Directory in Discover" }] : []),
      ...(jF() ? [{ value: "stats", description: "Show skill usage and context costs", isFinal: !0 }] : []),
    ];
    return filterCompletionsByPrefix(n, t);
  }
  let l = i[0]?.toLowerCase();
  if (i.length === 1)
    switch (l) {
      case "enable":
      case "disable":
      case "uninstall": {
        let n = getInstalledPlugins(),
          filtered = Object.entries(n.plugins).filter(([, a]) => hasInstallationForCurrentProject(a));
        if (l === "enable" || l === "disable") {
          let a = getPluginEditableScopes(),
            o = l === "disable";
          filtered = filtered.filter(([d]) => a.has(d) === o);
        }
        let sorted = filtered
          .map(([a, o]) => {
            let d = (findInstallationForCurrentProject(o) ?? o[0])?.version;
            return { value: a, description: formatFirstKnownVersion(d), isFinal: !0 };
          })
          .sort((a, o) => a.value.localeCompare(o.value));
        return filterCompletionsByPrefix(sorted, t);
      }
      case "install":
      case "i": {
        if (t.includes("/") || t.includes("\\")) return [];
        return filterCompletionsByPrefix(
          await getInstallablePluginCompletions(f.of(getRootSession().host), r),
          t,
        );
      }
      case "list":
      case "ls":
        return filterCompletionsByPrefix(LIST_FLAG_COMPLETIONS, t);
      case "marketplace":
      case "market":
        return filterCompletionsByPrefix(MARKETPLACE_SUBCOMMAND_COMPLETIONS, t);
      default:
        return [];
    }
  let u =
    t !== "" && i.length === 2 && (l === "install" || l === "i") ? parsePluginArgs(i.join(" ")) : void 0;
  if (u?.type === "install" && u.plugin !== void 0 && u.marketplace === void 0)
    return filterCompletionsByPrefix(
      [{ value: "--marketplace", description: "Install from a marketplace source, adding it first" }],
      t,
    );
  if (i.length === 2 && (l === "marketplace" || l === "market")) {
    let n = i[1]?.toLowerCase();
    if (n === "remove" || n === "rm" || n === "update") {
      let e = await loadKnownMarketplacesSafe(r),
        sorted = Object.entries(e)
          .map(([a, o]) => ({ value: a, description: getMarketplaceSourceDisplay(o.source), isFinal: !0 }))
          .sort((a, o) => a.value.localeCompare(o.value));
      return filterCompletionsByPrefix(sorted, t);
    }
  }
  return [];
}
//@ chunk-rkhcn3s2.js:14075-14197 placement
class SingleEntryCache {
  key = null;
  candidates = [];
  get(i) {
    return this.key === i ? this.candidates : void 0;
  }
  store(i, t) {
    ((this.key = i), (this.candidates = t));
  }
}
//@ chunk-rkhcn3s2.js:14197-14220 placement
var f = new HostScoped(() => new SingleEntryCache());
/**
 * 从已知市场的本地缓存汇总可安装插件（按市场状态做缓存键），排除已安装和被策略屏蔽的，返回 /plugin install 的补全候选。
 */
//@ chunk-rkhcn3s2.js:14220-14774 placement
async function getInstallablePluginCompletions(cache, storage) {
  let knownMarketplaces = await loadKnownMarketplacesSafe(storage),
    sorted = Object.keys(knownMarketplaces).sort(),
    u = jsonStringify(
      sorted.map((e) => [e, knownMarketplaces[e]?.installLocation, knownMarketplaces[e]?.lastUpdated]),
    ),
    candidates = cache.get(u);
  if (candidates === void 0) {
    let results = await Promise.all(
      sorted.map(async (s) => ({ name: s, marketplace: await getMarketplaceCacheOnly(s, storage) })),
    );
    candidates = [];
    for (let { name: s, marketplace: marketplace } of results) {
      if (!marketplace) continue;
      for (let plugin of marketplace.plugins)
        candidates.push({ pluginId: formatPluginId(plugin.name, s), description: plugin.description });
    }
    (candidates.sort((s, a) => s.pluginId.localeCompare(a.pluginId)), cache.store(u, candidates));
  }
  return candidates
    .filter((e) => !isPluginInstalled(e.pluginId) && !isPluginBlockedByPolicy(e.pluginId))
    .map((e) => ({ value: e.pluginId, description: e.description, isFinal: !0 }));
}
//@ chunk-rkhcn3s2.js:14774-14961 placement
function filterCompletionsByPrefix(i, t) {
  if (!t) return i;
  let lower = t.toLowerCase(),
    l = [],
    u = [];
  for (let n of i) {
    let lower_2 = n.value.toLowerCase();
    if (lower_2.startsWith(lower)) l.push(n);
    else if (lower_2.includes(lower)) u.push(n);
  }
  return l.concat(u);
}
