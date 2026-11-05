/**
 * commands/plugin/pluginArgCompletions.ts
 *
 * 2.1.316 新增。/plugin 命令参数补全。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-btxqr26k.js (6)
 * attribution: placement 6
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { isPluginDirectoryModeOn, lanternPrismEnabled } from "../../utils/plugins/pluginGates.js";
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

//@ chunk-btxqr26k.js:13052-13464 placement
/**
 * /plugin 参数补全的候选：list 的 --enabled/--disabled 过滤项，以及 marketplace 子命令（add/remove/update/list）。
 */
var LIST_FLAG_COMPLETIONS = [
  {
    value: "--enabled",
    description: "Only show enabled plugins",
    isFinal: true,
  },
  {
    value: "--disabled",
    description: "Only show disabled plugins",
    isFinal: true,
  },
];
var MARKETPLACE_SUBCOMMAND_COMPLETIONS = [
  {
    value: "add",
    description: "Add a marketplace from a URL or path",
  },
  {
    value: "remove",
    description: "Remove a known marketplace",
  },
  {
    value: "update",
    description: "Refresh a marketplace from its source",
  },
  {
    value: "list",
    description: "List known marketplaces",
    isFinal: true,
  },
];
//@ chunk-btxqr26k.js:13464-15223 placement
async function pluginArgCompletions(arg, context, storage) {
  if (arg.length === 0) {
    let completions = [
      {
        value: "list",
        description: "List installed plugins",
        isFinal: true,
      },
      {
        value: "enable",
        description: "Enable an installed plugin",
      },
      {
        value: "disable",
        description: "Disable an installed plugin",
      },
      {
        value: "install",
        description: "Install a plugin from a marketplace",
      },
      {
        value: "uninstall",
        description: "Remove an installed plugin",
      },
      {
        value: "marketplace",
        description: "Manage plugin marketplaces",
      },
      ...(isPluginDirectoryModeOn()
        ? [
            {
              value: "directory",
              description: "Search the Anthropic Directory in Discover",
            },
          ]
        : []),
      ...(lanternPrismEnabled()
        ? [
            {
              value: "stats",
              description: "Show skill usage and context costs",
              isFinal: true,
            },
          ]
        : []),
    ];
    return filterCompletionsByPrefix(completions, context);
  }
  let lower = arg[0]?.toLowerCase();
  if (arg.length === 1)
    switch (lower) {
      case "enable":
      case "disable":
      case "uninstall": {
        let installedPlugins = getInstalledPlugins();
        let filtered = Object.entries(installedPlugins.plugins).filter(([, value]) =>
          hasInstallationForCurrentProject(value),
        );
        if (lower === "enable" || lower === "disable") {
          let pluginEditableScopes = getPluginEditableScopes();
          let scopeName = lower === "disable";
          filtered = filtered.filter(([scope]) => pluginEditableScopes.has(scope) === scopeName);
        }
        let sorted = filtered
          .map(([scope, value]) => {
            let version = (findInstallationForCurrentProject(value) ?? value[0])?.version;
            return {
              value: scope,
              description: formatFirstKnownVersion(version),
              isFinal: true,
            };
          })
          .sort((left, b) => left.value.localeCompare(b.value));
        return filterCompletionsByPrefix(sorted, context);
      }
      case "install":
      case "i": {
        if (context.includes("/") || context.includes("\\")) return [];
        return filterCompletionsByPrefix(
          await getInstallablePluginCompletions(
            INSTALLABLE_COMPLETIONS_CACHE.of(getRootSession().host),
            storage,
          ),
          context,
        );
      }
      case "list":
      case "ls":
        return filterCompletionsByPrefix(LIST_FLAG_COMPLETIONS, context);
      case "marketplace":
      case "market":
        return filterCompletionsByPrefix(MARKETPLACE_SUBCOMMAND_COMPLETIONS, context);
      default:
        return [];
    }
  let list =
    context !== "" && arg.length === 2 && (lower === "install" || lower === "i")
      ? parsePluginArgs(arg.join(" "))
      : undefined;
  if (list?.type === "install" && list.plugin !== undefined && list.marketplace === undefined)
    return filterCompletionsByPrefix(
      [
        {
          value: "--marketplace",
          description: "Install from a marketplace source, adding it first",
        },
      ],
      context,
    );
  if (arg.length === 2 && (lower === "marketplace" || lower === "market")) {
    let lower = arg[1]?.toLowerCase();
    if (lower === "remove" || lower === "rm" || lower === "update") {
      let knownMarketplaces = await loadKnownMarketplacesSafe(storage);
      let sorted = Object.entries(knownMarketplaces)
        .map(([key, value]) => ({
          value: key,
          description: getMarketplaceSourceDisplay(value.source),
          isFinal: true,
        }))
        .sort((left, b) => left.value.localeCompare(b.value));
      return filterCompletionsByPrefix(sorted, context);
    }
  }
  return [];
}
//@ chunk-btxqr26k.js:15223-15345 placement
class SingleEntryCache {
  key = null;
  candidates = [];
  get(key) {
    return this.key === key ? this.candidates : undefined;
  }
  store(key, candidates) {
    this.key = key;
    this.candidates = candidates;
  }
}
//@ chunk-btxqr26k.js:15345-15368 placement
var INSTALLABLE_COMPLETIONS_CACHE = new HostScoped(() => new SingleEntryCache());
//@ chunk-btxqr26k.js:15368-15922 placement
/**
 * 从已知市场的本地缓存汇总可安装插件（按市场状态做缓存键），排除已安装和被策略屏蔽的，返回 /plugin install 的补全候选。
 */
async function getInstallablePluginCompletions(cache, storage) {
  let knownMarketplaces = await loadKnownMarketplacesSafe(storage);
  let sorted = Object.keys(knownMarketplaces).sort();
  let payload = jsonStringify(
    sorted.map((pair) => [
      pair,
      knownMarketplaces[pair]?.installLocation,
      knownMarketplaces[pair]?.lastUpdated,
    ]),
  );
  let candidates = cache.get(payload);
  if (candidates === undefined) {
    let results = await Promise.all(
      sorted.map(async (entry) => ({
        name: entry,
        marketplace: await getMarketplaceCacheOnly(entry, storage),
      })),
    );
    candidates = [];
    for (let { name, marketplace } of results) {
      if (!marketplace) continue;
      for (let plugin of marketplace.plugins)
        candidates.push({
          pluginId: formatPluginId(plugin.name, name),
          description: plugin.description,
        });
    }
    candidates.sort((left, b) => left.pluginId.localeCompare(b.pluginId));
    cache.store(payload, candidates);
  }
  return candidates
    .filter(
      (candidate) => !isPluginInstalled(candidate.pluginId) && !isPluginBlockedByPolicy(candidate.pluginId),
    )
    .map((candidate) => ({
      value: candidate.pluginId,
      description: candidate.description,
      isFinal: true,
    }));
}
//@ chunk-btxqr26k.js:15922-16109 placement
function filterCompletionsByPrefix(completions, prefix) {
  if (!prefix) return completions;
  let lower = prefix.toLowerCase();
  let matched = [];
  let rest = [];
  for (let completion of completions) {
    let lower_2 = completion.value.toLowerCase();
    if (lower_2.startsWith(lower)) matched.push(completion);
    else if (lower_2.includes(lower)) rest.push(completion);
  }
  return matched.concat(rest);
}
export { pluginArgCompletions };
