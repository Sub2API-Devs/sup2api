/**
 * utils/plugins/pluginAutoupdate.ts
 *
 * 并入已有模块：插件自动更新。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginAutoupdate.ts
 * pieces: chunk-5xgkngpb.js (1), chunk-ads6w2ye.js (10), chunk-b08ck61p.js (1)
 * attribution: fingerprint 2, placement 9, callgraph-witnessed 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { withClaudeAiMarketplaceLock, isClaudeAiMarketplaceSource } from "./claudeAiMarketplaces.js";
import { getPluginRegistry } from "./pluginLoadState.js";
import {
  loadKnownMarketplacesWithDeclared,
  getDeclaredMarketplaces,
  isPluginDirectoryAvailable,
  loadKnownMarketplacesSafe,
  getMarketplaceCacheOnly,
  refreshMarketplaceDeduped,
} from "./marketplaceManager.js";
import {
  isSourceAllowedByPolicy,
  areCommandPluginSourcesDisabledByPolicy,
  policyTierCommandsMayRun,
  isSourceDisallowedOrUnverifiable,
  isPluginBlockedByPolicy,
} from "./marketplacePolicy.js";
import { isPluginsSyncOn } from "../../services/plugins/accountSync/syncedPluginHooks.js";
import { isMarketplaceAutoUpdate, MAX_CONSENT_COMMAND_LENGTH } from "./schemas.js";
import { getMarketplaceAutoUpdate } from "./marketplaceAutoUpdate.js";
import { OFFICIAL_MARKETPLACE_NAME } from "./officialMarketplaceNames.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import {
  loadInstalledPlugins,
  loadInstalledPluginsSync,
  filterInstallationsForCurrentProject,
} from "./installedPluginsManager.js";
import { updatePluginOp } from "../../services/plugins/pluginOperations.js";
import { logForDebugging } from "../debug.js";
import { parsePluginIdentifier } from "./pluginIdentifier.js";
import { errorMessage } from "../errors.js";
import { loadAllPluginsCacheOnly, clearPluginCache, createPluginFromPath } from "./pluginLoader.js";
import { seedDirectoryBindings } from "./pluginDirectoryBindings.js";
import { isOfficialDirectoryPlugin } from "./pluginDirectoryTelemetry.js";
import {
  shouldRefreshCommandPlugins,
  describeCommandOutputMode,
  organizationAnswerState,
  CommandSourceError,
} from "./commandSource.js";
import { marketplaceNameAnswerState } from "./marketplaceNames.js";
import { checkEnabledPlugins } from "./pluginStartupCheck.js";
import { normalizeCaseForComparison_2 } from "../permissions/filesystem.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { printableName } from "../printableName.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { emitProducerDirsChanged } from "./pluginCachePaths.js";
import { logError } from "../log.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { shouldSkipPluginAutoupdate } from "../config.js";
import { sleep } from "../sleep.js";
import { countWhere } from "../collections.js";
import { resolveMissingDependencies } from "./dependencyInstall.js";
import { classifyPluginCommandError } from "../telemetry/pluginTelemetry.js";

//@ chunk-5xgkngpb.js:703659-703792 fingerprint (2.1.88 match: getAutoUpdateEnabledMarketplaces, 1)
/**
 * 设置 known_marketplaces 中某市场的 autoUpdate（名字配错）。
 */
async function setMarketplaceAutoUpdateFlag(name, autoUpdate) {
  await withClaudeAiMarketplaceLock((registry) => {
    let entry = registry[name];
    if (entry === undefined || entry.autoUpdate === autoUpdate) return null;
    return {
      ...registry,
      [name]: {
        ...entry,
        autoUpdate,
      },
    };
  });
}
//@ chunk-ads6w2ye.js:1498-1511 placement
var AUTOUPDATE_NOTIFY_TTL_MS = 600000;
//@ chunk-ads6w2ye.js:1511-1845 placement
/**
 * 设置插件自动更新监听器；若已有暂存的通知（updated/blocked/reresolved/announce）则立即回调并清空。返回取消注册的函数。
 */
function onPluginsAutoUpdated(listener) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.autoUpdateListener = listener;
  if (pluginRegistry.pendingAutoUpdateNotification !== null) {
    listener(
      pluginRegistry.pendingAutoUpdateNotification.updated,
      pluginRegistry.pendingAutoUpdateNotification.blocked,
      pluginRegistry.pendingAutoUpdateNotification.reresolved,
      pluginRegistry.pendingAutoUpdateNotification.announce,
    );
    pluginRegistry.pendingAutoUpdateNotification = null;
  }
  return () => {
    pluginRegistry.autoUpdateListener = null;
  };
}
//@ chunk-ads6w2ye.js:1845-2222 placement
/**
 * 收集开启 autoUpdate、来源被策略允许的市场（小写名）；claude.ai 源需功能开启。 官方插件目录市场未注册但有已安装的官方插件时也加入。
 */
async function getAutoUpdateMarketplaces(storageV5) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(storageV5);
  let declaredMarketplaces = getDeclaredMarketplaces();
  let names = new Set();
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (!isSourceAllowedByPolicy(value.source)) continue;
    if (isClaudeAiMarketplaceSource(value.source) && !isPluginsSyncOn()) continue;
    if (isMarketplaceAutoUpdate(key, value, getMarketplaceAutoUpdate(key, declaredMarketplaces)))
      names.add(key.toLowerCase());
  }
  if (
    !names.has(OFFICIAL_MARKETPLACE_NAME) &&
    !Object.hasOwn(knownMarketplacesWithDeclared, OFFICIAL_MARKETPLACE_NAME) &&
    isPluginDirectoryAvailable() &&
    isSourceAllowedByPolicy({
      source: "pluginDirectory",
    })
  ) {
    if (
      Object.keys(
        (isStorageV5Enabled() && storageV5 !== undefined
          ? await loadInstalledPlugins(storageV5)
          : loadInstalledPluginsSync()
        ).plugins,
      ).some((key) => key.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    )
      names.add(OFFICIAL_MARKETPLACE_NAME);
  }
  return names;
}
//@ chunk-ads6w2ye.js:2222-4440 placement
async function updatePlugin(pluginId, installations, disabledSources, skipOptions, storage) {
  let updated = false;
  let failed = false;
  let commandSourceSkipped = null;
  let blocked = null;
  let notFound = false;
  let identityChanged = false;
  let notInstallable = false;
  let directoryUnavailable = false;
  for (let { scope } of installations)
    try {
      let outcome = await updatePluginOp(pluginId, scope, skipOptions ?? {}, storage);
      switch (outcome.outcome) {
        case "updated":
          updated = true;
          logForDebugging(
            `Plugin autoupdate: updated ${pluginId} from ${outcome.oldVersion} to ${outcome.newVersion}`,
          );
          break;
        case "skipped": {
          logForDebugging(`Plugin autoupdate: ${pluginId} ${outcome.message}`);
          if (outcome.skipReason === "entry_helper_deferred")
            blocked = {
              type: "autoupdate-deferred-entry-helper",
              source: pluginId,
              plugin: parsePluginIdentifier(pluginId).name,
              message: outcome.message,
            };
          else if (outcome.blockedBy && outcome.blockedBy.length > 0) {
            let blockedBy = outcome.blockedBy.map((pinnerId) => parsePluginIdentifier(pinnerId).name);
            let disabledPinners = outcome.blockedBy
              .filter((pinnerId) => disabledSources.has(pinnerId))
              .map((pinnerId) => parsePluginIdentifier(pinnerId).name);
            blocked = {
              type: "autoupdate-blocked-by-pinner",
              source: pluginId,
              plugin: parsePluginIdentifier(pluginId).name,
              heldAt: outcome.oldVersion,
              blockedBy,
              disabledPinners,
            };
          }
          break;
        }
        case "failed":
          notFound = outcome.failureCode === "not_found" || outcome.failureCode === "not_cached";
          identityChanged ||= outcome.failureCode === "directory_identity_changed";
          notInstallable ||= outcome.failureCode === "directory_listing_not_installable";
          directoryUnavailable ||=
            outcome.failureCode === "directory_unavailable" ||
            outcome.failureCode === "marketplace_policy_blocked" ||
            outcome.failureCode === "directory_binding_unreadable";
          if (outcome.failureCode === "command_source_skipped") commandSourceSkipped = pluginId;
          else if (
            outcome.failureCode === "entry_helper_disabled_by_policy" ||
            outcome.failureCode === "entry_helper_remote_policy_unconsented" ||
            outcome.failureCode === "entry_helper_organization_unanswered" ||
            outcome.failureCode === "plugin_policy_blocked" ||
            (outcome.failureCode === "command_source_refused" &&
              (areCommandPluginSourcesDisabledByPolicy() || !policyTierCommandsMayRun()))
          )
            blocked = {
              type: "autoupdate-disabled-by-policy",
              source: pluginId,
              plugin: parsePluginIdentifier(pluginId).name,
              message: outcome.message,
            };
          else if (outcome.failureCode === "entry_helper_not_inlined") {
            blocked = {
              type: "generic-error",
              source: pluginId,
              plugin: parsePluginIdentifier(pluginId).name,
              error: outcome.message,
            };
            failed = true;
          } else if (outcome.failureCode !== "command_source_inactive") failed = true;
          logForDebugging(`Plugin autoupdate: failed to update ${pluginId}: ${outcome.message}`, {
            level: "warn",
          });
          break;
        case "up_to_date":
          break;
      }
    } catch (error) {
      failed = true;
      logForDebugging(`Plugin autoupdate: error updating ${pluginId}: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  let stuck =
    failed &&
    !notFound &&
    !identityChanged &&
    !notInstallable &&
    !directoryUnavailable &&
    blocked === null &&
    pluginId.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  if (stuck)
    blocked = {
      type: "generic-error",
      source: pluginId,
      plugin: parsePluginIdentifier(pluginId).name,
      error:
        'The Anthropic Directory lists a different commit, but the background update failed, so this plugin is still on the old one. Choose "Update now" in /plugin \u2192 Installed to retry and see the error',
    };
  return {
    updated: updated ? pluginId : null,
    blocked,
    failed,
    directoryStuck: stuck,
    directoryIdentityChanged: identityChanged,
    commandSourceSkipped,
  };
}
//@ chunk-ads6w2ye.js:4440-5702 placement
/**
 * 对属于给定市场、未在排除集合、在当前项目有安装记录的插件并行调用 updatePlugin； 汇总 updated/blocked/失败数/跳过的命令源插件，以及插件目录插件的更新、失败、卡住、身份变化计数。
 */
async function updatePluginsInMarketplaces(
  marketplaces,
  excluded = new Set(),
  { skipCommandSources = false } = {},
  storage,
) {
  let installed =
    isStorageV5Enabled() && storage !== undefined
      ? await loadInstalledPlugins(storage)
      : loadInstalledPluginsSync();
  let keys = Object.keys(installed.plugins);
  if (keys.length === 0)
    return {
      updated: [],
      blocked: [],
      updateFailedCount: 0,
      commandSourceSkipped: [],
      directory: {
        updated: 0,
        updateFailed: 0,
        stuck: 0,
        identityChanged: 0,
      },
    };
  let { disabled } = await loadAllPluginsCacheOnly(storage);
  let disabledSources = new Set(disabled.map((plugin) => plugin.source));
  if (marketplaces.has(OFFICIAL_MARKETPLACE_NAME))
    await seedDirectoryBindings(Object.entries(installed.plugins));
  let settled = await Promise.allSettled(
    keys.map(async (pluginId) => {
      let { marketplace } = parsePluginIdentifier(pluginId);
      if (!marketplace || !marketplaces.has(marketplace.toLowerCase())) return null;
      if (excluded.has(pluginId)) return null;
      let installations = installed.plugins[pluginId];
      if (!installations || installations.length === 0) return null;
      let relevant = filterInstallationsForCurrentProject(installations);
      if (relevant.length === 0) return null;
      return updatePlugin(
        pluginId,
        relevant,
        disabledSources,
        skipCommandSources
          ? {
              skipCommandSources: true,
            }
          : undefined,
        storage,
      );
    }),
  );
  let updated = [];
  let blocked = [];
  let commandSourceSkipped = [];
  let failedCount = 0;
  let directoryStats = {
    updated: 0,
    updateFailed: 0,
    stuck: 0,
    identityChanged: 0,
  };
  for (let [index, settledResult] of settled.entries()) {
    if (settledResult.status !== "fulfilled" || settledResult.value === null) continue;
    let isDirectoryPlugin = isOfficialDirectoryPlugin(keys[index] ?? "");
    if (settledResult.value.updated !== null) {
      updated.push(settledResult.value.updated);
      if (isDirectoryPlugin) directoryStats.updated++;
    }
    if (settledResult.value.blocked !== null) blocked.push(settledResult.value.blocked);
    if (settledResult.value.failed) {
      failedCount++;
      if (isDirectoryPlugin) directoryStats.updateFailed++;
    }
    if (settledResult.value.directoryStuck) directoryStats.stuck++;
    if (settledResult.value.directoryIdentityChanged) directoryStats.identityChanged++;
    if (settledResult.value.commandSourceSkipped !== null)
      commandSourceSkipped.push(settledResult.value.commandSourceSkipped);
  }
  return {
    updated,
    blocked,
    updateFailedCount: failedCount,
    commandSourceSkipped,
    directory: directoryStats,
  };
}
//@ chunk-ads6w2ye.js:5702-8276 placement
/**
 * 遍历已安装插件，找出市场条目为 command 源的插件并登记；策略禁用或 tengu_plugin_command_source_refresh 关闭时只登记。 否则对已启用且未被策略阻止的插件重新执行命令源并更新，返回尝试数、命令源集合、updated/blocked 与失败数。
 */
async function reresolveCommandSourcedPlugins(storage) {
  let result = {
    attemptedCount: 0,
    commandSourced: new Set(),
    updated: [],
    blocked: [],
    failedCount: 0,
  };
  let disabledByPolicy = areCommandPluginSourcesDisabledByPolicy();
  let refreshDisabled = !shouldRefreshCommandPlugins();
  if (disabledByPolicy || refreshDisabled)
    logForDebugging(
      disabledByPolicy
        ? `Plugin autoupdate: command-source refresh ${marketplaceNameAnswerState() === "unanswered" ? "held for the organization's settings, not yet read" : "disabled by managed settings"} (still excluding command-sourced plugins from the regular pass)`
        : "Plugin autoupdate: command-source refresh disabled by tengu_plugin_command_source_refresh (still excluding command-sourced plugins from the regular pass)",
    );
  try {
    let installed =
      isStorageV5Enabled() && storage !== undefined
        ? await loadInstalledPlugins(storage)
        : loadInstalledPluginsSync();
    let byMarketplace = new Map();
    for (let [key, value] of Object.entries(installed.plugins)) {
      let relevant = filterInstallationsForCurrentProject(value ?? []);
      let { name, marketplace } = parsePluginIdentifier(key);
      if (relevant.length === 0 || !name || !marketplace) continue;
      let list = byMarketplace.get(marketplace) ?? [];
      list.push({
        pluginId: key,
        name,
        installations: relevant,
      });
      byMarketplace.set(marketplace, list);
    }
    let enabledIds;
    let disabledSources = new Set();
    let knownMarketplaces = byMarketplace.size > 0 ? await loadKnownMarketplacesSafe(storage) : {};
    for (let [marketplace, entries] of byMarketplace) {
      let entry = knownMarketplaces[marketplace];
      if (isSourceDisallowedOrUnverifiable(entry?.source)) {
        for (let { pluginId, installations } of entries)
          if (installations.some((installation) => installation.sourceCommand !== undefined))
            result.commandSourced.add(pluginId);
        continue;
      }
      let marketplaceCacheOnly = await getMarketplaceCacheOnly(marketplace, storage);
      if (!marketplaceCacheOnly) continue;
      for (let { pluginId, name: pluginName, installations } of entries) {
        let found = marketplaceCacheOnly.plugins.find((plugin) => plugin.name === pluginName);
        if (!found || typeof found.source === "string" || found.source.source !== "command") continue;
        result.commandSourced.add(pluginId);
        if (disabledByPolicy || refreshDisabled) continue;
        if (!enabledIds) {
          enabledIds = new Set(await checkEnabledPlugins());
          disabledSources = new Set(
            (await loadAllPluginsCacheOnly(storage)).disabled.map((plugin) => plugin.source),
          );
        }
        if (!enabledIds.has(pluginId) || isPluginBlockedByPolicy(pluginId)) {
          logForDebugging(`Plugin autoupdate: not re-resolving ${pluginId} (disabled or blocked by policy)`);
          continue;
        }
        let acceptedCommand = describeCommandOutputMode(found.source);
        let filtered = installations.filter((installation) => installation.sourceCommand !== acceptedCommand);
        if (filtered.length > 0) {
          let all = filtered.every((installation) => installation.sourceCommand === undefined);
          let mapped = normalizeCaseForComparison_2(filtered.map((installation) => installation.scope))
            .map((scope) => claudeCommand("plugin update", pluginId, `--scope ${scope}`))
            .filter((command) => command !== null)
            .map((command) => `\`${command}\``);
          logForDebugging(
            `Plugin autoupdate: not re-resolving ${pluginId}: marketplace command differs from the accepted one`,
            {
              level: "warn",
            },
          );
          result.blocked.push({
            type: "generic-error",
            source: pluginId,
            plugin: pluginName,
            error:
              (all
                ? `${printableName(pluginName, 200)}'s marketplace entry now installs it by running a command`
                : `${printableName(pluginName, 200)}'s marketplace entry changed the command it runs`) +
              ` (\`${printableName(found.source.command, MAX_CONSENT_COMMAND_LENGTH)}${found.source.mode === "link" ? " [mode: link]" : ""}\`). It was not re-run in the background; ${mapped.length > 0 ? `run ${mapped.join(" and ")}` : "an explicit per-scope plugin update is needed"} to review and accept it.`,
          });
        }
        let installations_2 = installations.filter(
          (installation) => installation.sourceCommand === acceptedCommand,
        );
        if (installations_2.length === 0) continue;
        result.attemptedCount++;
        logForDebugging(`Plugin autoupdate: re-resolving command-sourced plugin ${pluginId}`);
        let updateResult = await updatePlugin(
          pluginId,
          installations_2,
          disabledSources,
          {
            skipMarketplaceRefresh: true,
          },
          storage,
        );
        if (updateResult.updated !== null) result.updated.push(updateResult.updated);
        if (updateResult.blocked !== null) result.blocked.push(updateResult.blocked);
        if (updateResult.failed) result.failedCount++;
      }
    }
  } catch (error) {
    logForDebugging(`Plugin autoupdate: command-source refresh failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  return result;
}
//@ chunk-ads6w2ye.js:8276-8639 placement
/**
 * 通知自动更新结果；无监听器时合并暂存。
 */
function notifyPluginsAutoUpdated(updated, blocked, reresolved = [], { announce = true } = {}) {
  if (updated.length === 0 && blocked.length === 0) return;
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.autoUpdateListener)
    pluginRegistry.autoUpdateListener(updated, blocked, reresolved, announce);
  else {
    let pendingAutoUpdateNotification = pluginRegistry.pendingAutoUpdateNotification;
    pluginRegistry.pendingAutoUpdateNotification = {
      updated: normalizeCaseForComparison_2([...(pendingAutoUpdateNotification?.updated ?? []), ...updated]),
      blocked: [...(pendingAutoUpdateNotification?.blocked ?? []), ...blocked],
      reresolved: normalizeCaseForComparison_2([
        ...(pendingAutoUpdateNotification?.reresolved ?? []),
        ...reresolved,
      ]),
      announce: (pendingAutoUpdateNotification?.announce ?? false) || announce,
    };
  }
}
//@ chunk-ads6w2ye.js:8639-8736 placement
function emptyAutoupdateStats() {
  return {
    attemptedCount: 0,
    commandSourced: new Set(),
    updated: [],
    blocked: [],
    failedCount: 0,
  };
}
//@ chunk-ads6w2ye.js:8736-9182 placement
/**
 * 命令源重解析只并发一次：需要时先等待组织设置；组织未答复且有命令源插件时把重跑登记到 organizationAsk； 有尝试时广播生产目录变化，并发出自动更新通知。
 */
function reresolveCommandSourcesOnce(storage) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.commandSourceReresolve ??= (async () => {
    if (isRemoteSessionAvailable()) return emptyAutoupdateStats();
    if (marketplaceNameAnswerState() === "unanswered") await organizationAnswerState.wait?.();
    let heldForAnswer = marketplaceNameAnswerState() === "unanswered";
    let stats = await reresolveCommandSourcedPlugins(storage);
    if (heldForAnswer) pluginRegistry.commandSourceReresolve = null;
    if (heldForAnswer && stats.commandSourced.size > 0) {
      pluginRegistry.organizationAsk.isCommandHeld = true;
      pluginRegistry.organizationAsk.heldReresolve = () =>
        reresolveCommandSourcesOnce(storage).then(() => {});
    }
    if (stats.attemptedCount > 0) emitProducerDirsChanged();
    try {
      notifyPluginsAutoUpdated(stats.updated, stats.blocked, stats.updated);
    } catch (error) {
      logError(error);
    }
    return stats;
  })();
  return pluginRegistry.commandSourceReresolve;
}
//@ chunk-ads6w2ye.js:9182-11937 callgraph-witnessed (2.1.88 match: autoUpdateMarketplacesAndPluginsInBackground, 0.182)
/**
 * 后台自动更新：刷新开启 autoUpdate 的市场（refreshMarketplaceDeduped），更新这些市场里已安装的插件、刷新 command 来源与插件目录插件，记 tengu_plugin_autoupdate_pass；自动更新器被禁用时跳过。
 */
function autoUpdateMarketplacesAndPluginsInBackground(storageV5) {
  return (async () => {
    let commandStats = await reresolveCommandSourcesOnce(storageV5);
    let now = Date.now();
    let pluginStats = {
      marketplaces_refreshed: 0,
      marketplace_refresh_failed: 0,
      marketplace_refresh_policy_skipped: 0,
      plugins_updated: 0,
      plugin_update_failed: 0,
      plugins_blocked_by_pin: 0,
      plugins_helper_deferred: 0,
      plugins_policy_blocked: 0,
      command_plugins_refreshed: commandStats.attemptedCount,
      command_plugin_refresh_failed: commandStats.failedCount,
    };
    let directoryStats = {};
    directoryStats = {
      directory_updated: 0,
      directory_update_failed: 0,
      directory_update_stuck: 0,
      directory_identity_changed: 0,
    };
    let logSkipped = () => {
      if (commandStats.attemptedCount > 0 || commandStats.failedCount > 0)
        logEvent("tengu_plugin_autoupdate_pass", {
          outcome: lit("skipped"),
          ...pluginStats,
          ...directoryStats,
          duration_ms: Date.now() - now,
        });
    };
    if (shouldSkipPluginAutoupdate()) {
      logForDebugging("Plugin autoupdate: skipped (auto-updater disabled)");
      logSkipped();
      return;
    }
    try {
      let marketplaces = await getAutoUpdateMarketplaces(storageV5);
      if (marketplaces.size === 0) {
        logSkipped();
        return;
      }
      let floored = Math.floor(Math.random() * AUTOUPDATE_NOTIFY_TTL_MS);
      await sleep(floored, undefined, {
        unref: true,
      });
      now = Date.now();
      let refreshResults = await Promise.allSettled(
        Array.from(marketplaces).map(async (name) => {
          try {
            await refreshMarketplaceDeduped(name, storageV5, undefined, {
              isBackground: true,
            });
            return "refreshed";
          } catch (error) {
            if (error instanceof CommandSourceError) {
              logForDebugging(
                `Plugin autoupdate: marketplace ${name} not refreshed (managed policy): ${errorMessage(error)}`,
              );
              return "policy";
            }
            logForDebugging(
              `Plugin autoupdate: failed to refresh marketplace ${name}: ${errorMessage(error)}`,
              {
                level: "warn",
              },
            );
            return "failed";
          }
        }),
      );
      pluginStats.marketplace_refresh_failed = countWhere(
        refreshResults,
        (result) => result.status === "fulfilled" && result.value === "failed",
      );
      pluginStats.marketplace_refresh_policy_skipped = countWhere(
        refreshResults,
        (result) => result.status === "fulfilled" && result.value === "policy",
      );
      pluginStats.marketplaces_refreshed =
        marketplaces.size -
        pluginStats.marketplace_refresh_failed -
        pluginStats.marketplace_refresh_policy_skipped;
      logForDebugging("Plugin autoupdate: checking installed plugins");
      let { updated, blocked, updateFailedCount, directory } = await updatePluginsInMarketplaces(
        marketplaces,
        commandStats.commandSourced,
        {
          skipCommandSources: true,
        },
        storageV5,
      );
      pluginStats.plugins_updated = updated.length;
      pluginStats.plugin_update_failed = updateFailedCount;
      directoryStats = {
        directory_updated: directory.updated,
        directory_update_failed: directory.updateFailed,
        directory_update_stuck: directory.stuck,
        directory_identity_changed: directory.identityChanged,
      };
      pluginStats.plugins_blocked_by_pin = countWhere(
        blocked,
        (entry) => entry.type === "autoupdate-blocked-by-pinner",
      );
      pluginStats.plugins_helper_deferred = countWhere(
        blocked,
        (entry) => entry.type === "autoupdate-deferred-entry-helper",
      );
      pluginStats.plugins_policy_blocked = countWhere(
        blocked,
        (entry) => entry.type === "autoupdate-disabled-by-policy",
      );
      if (updated.length > 0) clearPluginCache("autoupdate dep-resolution");
      let { errors } = await loadAllPluginsCacheOnly(storageV5);
      let missingDependencies = await resolveMissingDependencies(
        errors.filter((error) => {
          if (error.type !== "dependency-unsatisfied") return false;
          let marketplace = parsePluginIdentifier(error.source).marketplace;
          return marketplace !== undefined && marketplaces.has(marketplace.toLowerCase());
        }),
        storageV5,
      );
      if (missingDependencies.installed.length > 0) {
        logForDebugging(
          `Plugin autoupdate: resolved ${missingDependencies.installed.length} missing plugin dependencies: ${missingDependencies.installed.join(", ")}`,
        );
        updated.push(...missingDependencies.installed);
      }
      notifyPluginsAutoUpdated(updated, blocked);
      logEvent("tengu_plugin_autoupdate_pass", {
        outcome:
          pluginStats.marketplace_refresh_failed > 0 || pluginStats.plugin_update_failed > 0
            ? lit("partial")
            : lit("ok"),
        ...pluginStats,
        ...directoryStats,
        duration_ms: Date.now() - now,
      });
    } catch (error) {
      logForDebugging(`Plugin autoupdate: failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logEvent("tengu_plugin_autoupdate_pass", {
        outcome: lit("failed"),
        error_kind: fromEnum(classifyPluginCommandError(error)),
        ...pluginStats,
        ...directoryStats,
        duration_ms: Date.now() - now,
      });
    }
  })();
}
//@ chunk-b08ck61p.js:19426-19698 fingerprint (2.1.88 match: updatePluginsForMarketplaces, 0.673)
/**
 * 把一组插件目录批量构造成插件对象（不记遥测），汇总成功与错误。
 */
async function updatePluginsForMarketplaces(entries, storageV5) {
  let results = await Promise.allSettled(
    entries.map(({ path, source, name }) =>
      createPluginFromPath(path, source, true, name, true, storageV5, undefined, {
        noTelemetry: true,
      }),
    ),
  );
  return {
    enabled: results.flatMap((pluginId) => (pluginId.status === "fulfilled" ? [pluginId.value.plugin] : [])),
    errors: results.flatMap((result) => (result.status === "fulfilled" ? result.value.errors : [])),
  };
}
export {
  setMarketplaceAutoUpdateFlag,
  autoUpdateMarketplacesAndPluginsInBackground,
  updatePluginsForMarketplaces,
  reresolveCommandSourcesOnce,
  onPluginsAutoUpdated,
  updatePluginsInMarketplaces,
  notifyPluginsAutoUpdated,
};
