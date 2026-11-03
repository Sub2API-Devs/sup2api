/**
 * utils/plugins/pluginAutoupdate.ts
 *
 * 并入已有模块：插件自动更新。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/plugins/pluginAutoupdate.ts
 * pieces: chunk-0nv5pv9r.js (10), chunk-9tyqgtn4.js (1), chunk-e6aww6q8.js (1)
 * attribution: placement 9, callgraph-witnessed 1, fingerprint 2
 */
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
import { isClaudeAiMarketplaceSource, withClaudeAiMarketplaceLock } from "./claudeAiMarketplaces.js";
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
import { uniq, count } from "../collections.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { printableName } from "../printableName.js";
import { isRemoteSessionAvailable } from "../../remote/remoteMode.js";
import { emitProducerDirsChanged } from "./pluginCachePaths.js";
import { logError } from "../log.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { shouldSkipPluginAutoupdate } from "../config.js";
import { sleep } from "../sleep.js";
import { resolveMissingDependencies } from "./dependencyInstall.js";
import { classifyPluginCommandError } from "../telemetry/pluginTelemetry.js";

//@ chunk-0nv5pv9r.js:1498-1511 placement
var AUTOUPDATE_NOTIFY_TTL_MS = 600000;
//@ chunk-0nv5pv9r.js:1511-1845 placement
/**
 * 设置插件自动更新监听器；若已有暂存的通知（updated/blocked/reresolved/announce）则立即回调并清空。返回取消注册的函数。
 */
function onPluginsAutoUpdated(n) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.autoUpdateListener = n;
  if (pluginRegistry.pendingAutoUpdateNotification !== null) {
    n(
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
//@ chunk-0nv5pv9r.js:1845-2222 placement
/**
 * 收集开启 autoUpdate、来源被策略允许的市场（小写名）；claude.ai 源需功能开启。 官方插件目录市场未注册但有已安装的官方插件时也加入。
 */
async function getAutoUpdateMarketplaces(n) {
  let knownMarketplacesWithDeclared = await loadKnownMarketplacesWithDeclared(n);
  let declaredMarketplaces = getDeclaredMarketplaces();
  let r = new Set();
  for (let [key, value] of Object.entries(knownMarketplacesWithDeclared)) {
    if (!isSourceAllowedByPolicy(value.source)) continue;
    if (isClaudeAiMarketplaceSource(value.source) && !isPluginsSyncOn()) continue;
    if (isMarketplaceAutoUpdate(key, value, getMarketplaceAutoUpdate(key, declaredMarketplaces)))
      r.add(key.toLowerCase());
  }
  if (
    !r.has(OFFICIAL_MARKETPLACE_NAME) &&
    !Object.hasOwn(knownMarketplacesWithDeclared, OFFICIAL_MARKETPLACE_NAME) &&
    isPluginDirectoryAvailable() &&
    isSourceAllowedByPolicy({
      source: "pluginDirectory",
    })
  ) {
    if (
      Object.keys(
        (isStorageV5Enabled() && n !== undefined ? await loadInstalledPlugins(n) : loadInstalledPluginsSync())
          .plugins,
      ).some((key) => key.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    )
      r.add(OFFICIAL_MARKETPLACE_NAME);
  }
  return r;
}
//@ chunk-0nv5pv9r.js:2222-4440 placement
async function updatePlugin(n, o, m, r, storage) {
  let i = false;
  let u = false;
  let commandSourceSkipped = null;
  let h = null;
  let _ = false;
  let k = false;
  let S = false;
  let y = false;
  for (let { scope } of o)
    try {
      let e = await updatePluginOp(n, scope, r ?? {}, storage);
      switch (e.outcome) {
        case "updated":
          i = true;
          logForDebugging(`Plugin autoupdate: updated ${n} from ${e.oldVersion} to ${e.newVersion}`);
          break;
        case "skipped": {
          logForDebugging(`Plugin autoupdate: ${n} ${e.message}`);
          if (e.skipReason === "entry_helper_deferred")
            h = {
              type: "autoupdate-deferred-entry-helper",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              message: e.message,
            };
          else if (e.blockedBy && e.blockedBy.length > 0) {
            let blockedBy = e.blockedBy.map((P) => parsePluginIdentifier(P).name);
            let disabledPinners = e.blockedBy
              .filter((P) => m.has(P))
              .map((P) => parsePluginIdentifier(P).name);
            h = {
              type: "autoupdate-blocked-by-pinner",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              heldAt: e.oldVersion,
              blockedBy,
              disabledPinners,
            };
          }
          break;
        }
        case "failed":
          _ = e.failureCode === "not_found" || e.failureCode === "not_cached";
          k ||= e.failureCode === "directory_identity_changed";
          S ||= e.failureCode === "directory_listing_not_installable";
          y ||=
            e.failureCode === "directory_unavailable" ||
            e.failureCode === "marketplace_policy_blocked" ||
            e.failureCode === "directory_binding_unreadable";
          if (e.failureCode === "command_source_skipped") commandSourceSkipped = n;
          else if (
            e.failureCode === "entry_helper_disabled_by_policy" ||
            e.failureCode === "entry_helper_remote_policy_unconsented" ||
            e.failureCode === "entry_helper_organization_unanswered" ||
            e.failureCode === "plugin_policy_blocked" ||
            (e.failureCode === "command_source_refused" &&
              (areCommandPluginSourcesDisabledByPolicy() || !policyTierCommandsMayRun()))
          )
            h = {
              type: "autoupdate-disabled-by-policy",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              message: e.message,
            };
          else if (e.failureCode === "entry_helper_not_inlined") {
            h = {
              type: "generic-error",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              error: e.message,
            };
            u = true;
          } else if (e.failureCode !== "command_source_inactive") u = true;
          logForDebugging(`Plugin autoupdate: failed to update ${n}: ${e.message}`, {
            level: "warn",
          });
          break;
        case "up_to_date":
          break;
      }
    } catch (error) {
      u = true;
      logForDebugging(`Plugin autoupdate: error updating ${n}: ${errorMessage(error)}`, {
        level: "warn",
      });
    }
  let p = u && !_ && !k && !S && !y && h === null && n.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`);
  if (p)
    h = {
      type: "generic-error",
      source: n,
      plugin: parsePluginIdentifier(n).name,
      error:
        'The Anthropic Directory lists a different commit, but the background update failed, so this plugin is still on the old one. Choose "Update now" in /plugin \u2192 Installed to retry and see the error',
    };
  return {
    updated: i ? n : null,
    blocked: h,
    failed: u,
    directoryStuck: p,
    directoryIdentityChanged: k,
    commandSourceSkipped,
  };
}
//@ chunk-0nv5pv9r.js:4440-5702 placement
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
  let disabledSources = new Set(disabled.map((f) => f.source));
  if (marketplaces.has(OFFICIAL_MARKETPLACE_NAME))
    await seedDirectoryBindings(Object.entries(installed.plugins));
  let settled = await Promise.allSettled(
    keys.map(async (f) => {
      let { marketplace } = parsePluginIdentifier(f);
      if (!marketplace || !marketplaces.has(marketplace.toLowerCase())) return null;
      if (excluded.has(f)) return null;
      let g = installed.plugins[f];
      if (!g || g.length === 0) return null;
      let R = filterInstallationsForCurrentProject(g);
      if (R.length === 0) return null;
      return updatePlugin(
        f,
        R,
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
  let _ = [];
  let k = [];
  let S = [];
  let y = 0;
  let p = {
    updated: 0,
    updateFailed: 0,
    stuck: 0,
    identityChanged: 0,
  };
  for (let [f, e] of settled.entries()) {
    if (e.status !== "fulfilled" || e.value === null) continue;
    let g = isOfficialDirectoryPlugin(keys[f] ?? "");
    if (e.value.updated !== null) {
      _.push(e.value.updated);
      if (g) p.updated++;
    }
    if (e.value.blocked !== null) k.push(e.value.blocked);
    if (e.value.failed) {
      y++;
      if (g) p.updateFailed++;
    }
    if (e.value.directoryStuck) p.stuck++;
    if (e.value.directoryIdentityChanged) p.identityChanged++;
    if (e.value.commandSourceSkipped !== null) S.push(e.value.commandSourceSkipped);
  }
  return {
    updated: _,
    blocked: k,
    updateFailedCount: y,
    commandSourceSkipped: S,
    directory: p,
  };
}
//@ chunk-0nv5pv9r.js:5702-8276 placement
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
    let s =
      isStorageV5Enabled() && storage !== undefined
        ? await loadInstalledPlugins(storage)
        : loadInstalledPluginsSync();
    let i = new Map();
    for (let [key, value] of Object.entries(s.plugins)) {
      let S = filterInstallationsForCurrentProject(value ?? []);
      let { name: y, marketplace } = parsePluginIdentifier(key);
      if (S.length === 0 || !y || !marketplace) continue;
      let f = i.get(marketplace) ?? [];
      f.push({
        pluginId: key,
        name: y,
        installations: S,
      });
      i.set(marketplace, f);
    }
    let u;
    let C = new Set();
    let h = i.size > 0 ? await loadKnownMarketplacesSafe(storage) : {};
    for (let [_, k] of i) {
      let S = h[_];
      if (isSourceDisallowedOrUnverifiable(S?.source)) {
        for (let { pluginId, installations } of k)
          if (installations.some((installation) => installation.sourceCommand !== undefined))
            result.commandSourced.add(pluginId);
        continue;
      }
      let marketplaceCacheOnly = await getMarketplaceCacheOnly(_, storage);
      if (!marketplaceCacheOnly) continue;
      for (let { pluginId, name: f, installations } of k) {
        let found = marketplaceCacheOnly.plugins.find((plugin) => plugin.name === f);
        if (!found || typeof found.source === "string" || found.source.source !== "command") continue;
        result.commandSourced.add(pluginId);
        if (disabledByPolicy || refreshDisabled) continue;
        if (!u) {
          u = new Set(await checkEnabledPlugins());
          C = new Set((await loadAllPluginsCacheOnly(storage)).disabled.map((w) => w.source));
        }
        if (!u.has(pluginId) || isPluginBlockedByPolicy(pluginId)) {
          logForDebugging(`Plugin autoupdate: not re-resolving ${pluginId} (disabled or blocked by policy)`);
          continue;
        }
        let R = describeCommandOutputMode(found.source);
        let filtered = installations.filter((installation) => installation.sourceCommand !== R);
        if (filtered.length > 0) {
          let all = filtered.every((v) => v.sourceCommand === undefined);
          let mapped = uniq(filtered.map((v) => v.scope))
            .map((v) => claudeCommand("plugin update", pluginId, `--scope ${v}`))
            .filter((v) => v !== null)
            .map((v) => `\`${v}\``);
          logForDebugging(
            `Plugin autoupdate: not re-resolving ${pluginId}: marketplace command differs from the accepted one`,
            {
              level: "warn",
            },
          );
          result.blocked.push({
            type: "generic-error",
            source: pluginId,
            plugin: f,
            error:
              (all
                ? `${printableName(f, 200)}'s marketplace entry now installs it by running a command`
                : `${printableName(f, 200)}'s marketplace entry changed the command it runs`) +
              ` (\`${printableName(found.source.command, MAX_CONSENT_COMMAND_LENGTH)}${found.source.mode === "link" ? " [mode: link]" : ""}\`). It was not re-run in the background; ${mapped.length > 0 ? `run ${mapped.join(" and ")}` : "an explicit per-scope plugin update is needed"} to review and accept it.`,
          });
        }
        let filtered_2 = installations.filter((installation) => installation.sourceCommand === R);
        if (filtered_2.length === 0) continue;
        result.attemptedCount++;
        logForDebugging(`Plugin autoupdate: re-resolving command-sourced plugin ${pluginId}`);
        let E = await updatePlugin(
          pluginId,
          filtered_2,
          C,
          {
            skipMarketplaceRefresh: true,
          },
          storage,
        );
        if (E.updated !== null) result.updated.push(E.updated);
        if (E.blocked !== null) result.blocked.push(E.blocked);
        if (E.failed) result.failedCount++;
      }
    }
  } catch (error) {
    logForDebugging(`Plugin autoupdate: command-source refresh failed: ${errorMessage(error)}`, {
      level: "warn",
    });
  }
  return result;
}
//@ chunk-0nv5pv9r.js:8276-8639 placement
/**
 * 通知自动更新结果；无监听器时合并暂存。
 */
function notifyPluginsAutoUpdated(updated, blocked, m = [], { announce: r = true } = {}) {
  if (updated.length === 0 && blocked.length === 0) return;
  let pluginRegistry = getPluginRegistry();
  if (pluginRegistry.autoUpdateListener) pluginRegistry.autoUpdateListener(updated, blocked, m, r);
  else {
    let pendingAutoUpdateNotification = pluginRegistry.pendingAutoUpdateNotification;
    pluginRegistry.pendingAutoUpdateNotification = {
      updated: uniq([...(pendingAutoUpdateNotification?.updated ?? []), ...updated]),
      blocked: [...(pendingAutoUpdateNotification?.blocked ?? []), ...blocked],
      reresolved: uniq([...(pendingAutoUpdateNotification?.reresolved ?? []), ...m]),
      announce: (pendingAutoUpdateNotification?.announce ?? false) || r,
    };
  }
}
//@ chunk-0nv5pv9r.js:8639-8736 placement
function emptyAutoupdateStats() {
  return {
    attemptedCount: 0,
    commandSourced: new Set(),
    updated: [],
    blocked: [],
    failedCount: 0,
  };
}
//@ chunk-0nv5pv9r.js:8736-9182 placement
/**
 * 命令源重解析只并发一次：需要时先等待组织设置；组织未答复且有命令源插件时把重跑登记到 organizationAsk； 有尝试时广播生产目录变化，并发出自动更新通知。
 */
function reresolveCommandSourcesOnce(storage) {
  let pluginRegistry = getPluginRegistry();
  pluginRegistry.commandSourceReresolve ??= (async () => {
    if (isRemoteSessionAvailable()) return emptyAutoupdateStats();
    if (marketplaceNameAnswerState() === "unanswered") await organizationAnswerState.wait?.();
    let m = marketplaceNameAnswerState() === "unanswered";
    let r = await reresolveCommandSourcedPlugins(storage);
    if (m) pluginRegistry.commandSourceReresolve = null;
    if (m && r.commandSourced.size > 0) {
      pluginRegistry.organizationAsk.isCommandHeld = true;
      pluginRegistry.organizationAsk.heldReresolve = () =>
        reresolveCommandSourcesOnce(storage).then(() => {});
    }
    if (r.attemptedCount > 0) emitProducerDirsChanged();
    try {
      notifyPluginsAutoUpdated(r.updated, r.blocked, r.updated);
    } catch (error) {
      logError(error);
    }
    return r;
  })();
  return pluginRegistry.commandSourceReresolve;
}
//@ chunk-0nv5pv9r.js:9182-11937 callgraph-witnessed = autoUpdateMarketplacesAndPluginsInBackground (0.183)
/**
 * 后台自动更新：刷新开启 autoUpdate 的市场（refreshMarketplaceDeduped），更新这些市场里已安装的插件、刷新 command 来源与插件目录插件，记 tengu_plugin_autoupdate_pass；自动更新器被禁用时跳过。
 */
function autoUpdateMarketplacesAndPluginsInBackground(storage) {
  return (async () => {
    let o = await reresolveCommandSourcesOnce(storage);
    let now = Date.now();
    let r = {
      marketplaces_refreshed: 0,
      marketplace_refresh_failed: 0,
      marketplace_refresh_policy_skipped: 0,
      plugins_updated: 0,
      plugin_update_failed: 0,
      plugins_blocked_by_pin: 0,
      plugins_helper_deferred: 0,
      plugins_policy_blocked: 0,
      command_plugins_refreshed: o.attemptedCount,
      command_plugin_refresh_failed: o.failedCount,
    };
    let s = {};
    s = {
      directory_updated: 0,
      directory_update_failed: 0,
      directory_update_stuck: 0,
      directory_identity_changed: 0,
    };
    let i = () => {
      if (o.attemptedCount > 0 || o.failedCount > 0)
        logEvent("tengu_plugin_autoupdate_pass", {
          outcome: lit("skipped"),
          ...r,
          ...s,
          duration_ms: Date.now() - now,
        });
    };
    if (shouldSkipPluginAutoupdate()) {
      logForDebugging("Plugin autoupdate: skipped (auto-updater disabled)");
      i();
      return;
    }
    try {
      let marketplaces = await getAutoUpdateMarketplaces(storage);
      if (marketplaces.size === 0) {
        i();
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
            await refreshMarketplaceDeduped(name, storage, undefined, {
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
      r.marketplace_refresh_failed = count(
        refreshResults,
        (e) => e.status === "fulfilled" && e.value === "failed",
      );
      r.marketplace_refresh_policy_skipped = count(
        refreshResults,
        (e) => e.status === "fulfilled" && e.value === "policy",
      );
      r.marketplaces_refreshed =
        marketplaces.size - r.marketplace_refresh_failed - r.marketplace_refresh_policy_skipped;
      logForDebugging("Plugin autoupdate: checking installed plugins");
      let { updated, blocked, updateFailedCount, directory } = await updatePluginsInMarketplaces(
        marketplaces,
        o.commandSourced,
        {
          skipCommandSources: true,
        },
        storage,
      );
      r.plugins_updated = updated.length;
      r.plugin_update_failed = updateFailedCount;
      s = {
        directory_updated: directory.updated,
        directory_update_failed: directory.updateFailed,
        directory_update_stuck: directory.stuck,
        directory_identity_changed: directory.identityChanged,
      };
      r.plugins_blocked_by_pin = count(blocked, (e) => e.type === "autoupdate-blocked-by-pinner");
      r.plugins_helper_deferred = count(blocked, (e) => e.type === "autoupdate-deferred-entry-helper");
      r.plugins_policy_blocked = count(blocked, (e) => e.type === "autoupdate-disabled-by-policy");
      if (updated.length > 0) clearPluginCache("autoupdate dep-resolution");
      let { errors } = await loadAllPluginsCacheOnly(storage);
      let missingDependencies = await resolveMissingDependencies(
        errors.filter((error) => {
          if (error.type !== "dependency-unsatisfied") return false;
          let marketplace = parsePluginIdentifier(error.source).marketplace;
          return marketplace !== undefined && marketplaces.has(marketplace.toLowerCase());
        }),
        storage,
      );
      if (missingDependencies.installed.length > 0) {
        logForDebugging(
          `Plugin autoupdate: resolved ${missingDependencies.installed.length} missing plugin dependencies: ${missingDependencies.installed.join(", ")}`,
        );
        updated.push(...missingDependencies.installed);
      }
      notifyPluginsAutoUpdated(updated, blocked);
      logEvent("tengu_plugin_autoupdate_pass", {
        outcome: r.marketplace_refresh_failed > 0 || r.plugin_update_failed > 0 ? lit("partial") : lit("ok"),
        ...r,
        ...s,
        duration_ms: Date.now() - now,
      });
    } catch (error) {
      logForDebugging(`Plugin autoupdate: failed: ${errorMessage(error)}`, {
        level: "error",
      });
      logEvent("tengu_plugin_autoupdate_pass", {
        outcome: lit("failed"),
        error_kind: fromEnum(classifyPluginCommandError(error)),
        ...r,
        ...s,
        duration_ms: Date.now() - now,
      });
    }
  })();
}
//@ chunk-9tyqgtn4.js:19012-19284 fingerprint = updatePluginsForMarketplaces (0.673)
/**
 * 把一组插件目录批量构造成插件对象（不记遥测），汇总成功与错误。
 */
async function updatePluginsForMarketplaces(e, storageV5) {
  let results = await Promise.allSettled(
    e.map(({ path, source, name: c }) =>
      createPluginFromPath(path, source, true, c, true, storageV5, undefined, {
        noTelemetry: true,
      }),
    ),
  );
  return {
    enabled: results.flatMap((pluginId) => (pluginId.status === "fulfilled" ? [pluginId.value.plugin] : [])),
    errors: results.flatMap((result) => (result.status === "fulfilled" ? result.value.errors : [])),
  };
}
//@ chunk-e6aww6q8.js:693187-693320 fingerprint = getAutoUpdateEnabledMarketplaces (1)
/**
 * 设置 known_marketplaces 中某市场的 autoUpdate（名字配错）。
 */
async function setMarketplaceAutoUpdateFlag(name, autoUpdate) {
  await withClaudeAiMarketplaceLock((r) => {
    let s = r[name];
    if (s === undefined || s.autoUpdate === autoUpdate) return null;
    return {
      ...r,
      [name]: {
        ...s,
        autoUpdate,
      },
    };
  });
}
export {
  autoUpdateMarketplacesAndPluginsInBackground,
  reresolveCommandSourcesOnce,
  onPluginsAutoUpdated,
  updatePluginsForMarketplaces,
  setMarketplaceAutoUpdateFlag,
  updatePluginsInMarketplaces,
  notifyPluginsAutoUpdated,
};
