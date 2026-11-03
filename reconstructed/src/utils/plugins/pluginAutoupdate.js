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
  Eq,
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
import { X5, withClaudeAiMarketplaceLock } from "./claudeAiMarketplaces.js";
import { MVt } from "../../services/plugins/accountSync/syncedPluginHooks.js";
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
import { YX } from "./pluginDirectoryTelemetry.js";
import { HVt, o1, zW, Bd } from "./commandSource.js";
import { J_ } from "./marketplaceNames.js";
import { checkEnabledPlugins } from "./pluginStartupCheck.js";
import { uniq, count } from "../collections.js";
import { claudeCommand } from "../worktreeResumeHint.js";
import { printableName } from "../printableName.js";
import { wt } from "../../remote/remoteMode.js";
import { emitProducerDirsChanged } from "./pluginCachePaths.js";
import { logError } from "../log.js";
import { logEvent } from "../../services/analytics/index.js";
import { lit, fromEnum } from "../../services/analytics/safeMetadata.js";
import { shouldSkipPluginAutoupdate } from "../config.js";
import { sleep } from "../sleep.js";
import { resolveMissingDependencies } from "./dependencyInstall.js";
import { classifyPluginCommandError } from "../telemetry/pluginTelemetry.js";

//@ chunk-0nv5pv9r.js:1498-1511 placement
var O = 600000;
/**
 * 设置插件自动更新监听器；若已有暂存的通知（updated/blocked/reresolved/announce）则立即回调并清空。返回取消注册的函数。
 */
//@ chunk-0nv5pv9r.js:1511-1845 placement
function onPluginsAutoUpdated(n) {
  let o = getPluginRegistry();
  if (((o.autoUpdateListener = n), o.pendingAutoUpdateNotification !== null))
    (n(
      o.pendingAutoUpdateNotification.updated,
      o.pendingAutoUpdateNotification.blocked,
      o.pendingAutoUpdateNotification.reresolved,
      o.pendingAutoUpdateNotification.announce,
    ),
      (o.pendingAutoUpdateNotification = null));
  return () => {
    o.autoUpdateListener = null;
  };
}
/**
 * 收集开启 autoUpdate、来源被策略允许的市场（小写名）；claude.ai 源需功能开启。 官方插件目录市场未注册但有已安装的官方插件时也加入。
 */
//@ chunk-0nv5pv9r.js:1845-2222 placement
async function getAutoUpdateMarketplaces(n) {
  let o = await loadKnownMarketplacesWithDeclared(n),
    m = getDeclaredMarketplaces(),
    r = new Set();
  for (let [s, i] of Object.entries(o)) {
    if (!isSourceAllowedByPolicy(i.source)) continue;
    if (X5(i.source) && !MVt()) continue;
    if (isMarketplaceAutoUpdate(s, i, getMarketplaceAutoUpdate(s, m))) r.add(s.toLowerCase());
  }
  if (
    !r.has(OFFICIAL_MARKETPLACE_NAME) &&
    !Object.hasOwn(o, OFFICIAL_MARKETPLACE_NAME) &&
    Eq() &&
    isSourceAllowedByPolicy({ source: "pluginDirectory" })
  ) {
    if (
      Object.keys(
        (isStorageV5Enabled() && n !== void 0 ? await loadInstalledPlugins(n) : loadInstalledPluginsSync())
          .plugins,
      ).some((i) => i.endsWith(`@${OFFICIAL_MARKETPLACE_NAME}`))
    )
      r.add(OFFICIAL_MARKETPLACE_NAME);
  }
  return r;
}
//@ chunk-0nv5pv9r.js:2222-4440 placement
async function updatePlugin(n, o, m, r, s) {
  let i = !1,
    u = !1,
    C = null,
    h = null,
    _ = !1,
    k = !1,
    S = !1,
    y = !1;
  for (let { scope: scope } of o)
    try {
      let e = await updatePluginOp(n, scope, r ?? {}, s);
      switch (e.outcome) {
        case "updated":
          ((i = !0),
            logForDebugging(`Plugin autoupdate: updated ${n} from ${e.oldVersion} to ${e.newVersion}`));
          break;
        case "skipped": {
          if (
            (logForDebugging(`Plugin autoupdate: ${n} ${e.message}`),
            e.skipReason === "entry_helper_deferred")
          )
            h = {
              type: "autoupdate-deferred-entry-helper",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              message: e.message,
            };
          else if (e.blockedBy && e.blockedBy.length > 0) {
            let mapped = e.blockedBy.map((P) => parsePluginIdentifier(P).name),
              mapped_2 = e.blockedBy.filter((P) => m.has(P)).map((P) => parsePluginIdentifier(P).name);
            h = {
              type: "autoupdate-blocked-by-pinner",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              heldAt: e.oldVersion,
              blockedBy: mapped,
              disabledPinners: mapped_2,
            };
          }
          break;
        }
        case "failed":
          if (
            ((_ = e.failureCode === "not_found" || e.failureCode === "not_cached"),
            (k ||= e.failureCode === "directory_identity_changed"),
            (S ||= e.failureCode === "directory_listing_not_installable"),
            (y ||=
              e.failureCode === "directory_unavailable" ||
              e.failureCode === "marketplace_policy_blocked" ||
              e.failureCode === "directory_binding_unreadable"),
            e.failureCode === "command_source_skipped")
          )
            C = n;
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
          else if (e.failureCode === "entry_helper_not_inlined")
            ((h = {
              type: "generic-error",
              source: n,
              plugin: parsePluginIdentifier(n).name,
              error: e.message,
            }),
              (u = !0));
          else if (e.failureCode !== "command_source_inactive") u = !0;
          logForDebugging(`Plugin autoupdate: failed to update ${n}: ${e.message}`, { level: "warn" });
          break;
        case "up_to_date":
          break;
      }
    } catch (error) {
      ((u = !0),
        logForDebugging(`Plugin autoupdate: error updating ${n}: ${errorMessage(error)}`, { level: "warn" }));
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
    commandSourceSkipped: C,
  };
}
/**
 * 对属于给定市场、未在排除集合、在当前项目有安装记录的插件并行调用 updatePlugin； 汇总 updated/blocked/失败数/跳过的命令源插件，以及插件目录插件的更新、失败、卡住、身份变化计数。
 */
//@ chunk-0nv5pv9r.js:4440-5702 placement
async function updatePluginsInMarketplaces(
  marketplaces,
  excluded = new Set(),
  { skipCommandSources: skipCommandSources = !1 } = {},
  storage,
) {
  let installed =
      isStorageV5Enabled() && storage !== void 0
        ? await loadInstalledPlugins(storage)
        : loadInstalledPluginsSync(),
    keys = Object.keys(installed.plugins);
  if (keys.length === 0)
    return {
      updated: [],
      blocked: [],
      updateFailedCount: 0,
      commandSourceSkipped: [],
      directory: { updated: 0, updateFailed: 0, stuck: 0, identityChanged: 0 },
    };
  let { disabled: disabled } = await loadAllPluginsCacheOnly(storage),
    disabledSources = new Set(disabled.map((f) => f.source));
  if (marketplaces.has(OFFICIAL_MARKETPLACE_NAME))
    await seedDirectoryBindings(Object.entries(installed.plugins));
  let settled = await Promise.allSettled(
      keys.map(async (f) => {
        let { marketplace: marketplace } = parsePluginIdentifier(f);
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
          skipCommandSources ? { skipCommandSources: !0 } : void 0,
          storage,
        );
      }),
    ),
    _ = [],
    k = [],
    S = [],
    y = 0,
    p = { updated: 0, updateFailed: 0, stuck: 0, identityChanged: 0 };
  for (let [f, e] of settled.entries()) {
    if (e.status !== "fulfilled" || e.value === null) continue;
    let g = YX(keys[f] ?? "");
    if (e.value.updated !== null) {
      if ((_.push(e.value.updated), g)) p.updated++;
    }
    if (e.value.blocked !== null) k.push(e.value.blocked);
    if (e.value.failed) {
      if ((y++, g)) p.updateFailed++;
    }
    if (e.value.directoryStuck) p.stuck++;
    if (e.value.directoryIdentityChanged) p.identityChanged++;
    if (e.value.commandSourceSkipped !== null) S.push(e.value.commandSourceSkipped);
  }
  return { updated: _, blocked: k, updateFailedCount: y, commandSourceSkipped: S, directory: p };
}
/**
 * 遍历已安装插件，找出市场条目为 command 源的插件并登记；策略禁用或 tengu_plugin_command_source_refresh 关闭时只登记。 否则对已启用且未被策略阻止的插件重新执行命令源并更新，返回尝试数、命令源集合、updated/blocked 与失败数。
 */
//@ chunk-0nv5pv9r.js:5702-8276 placement
async function reresolveCommandSourcedPlugins(storage) {
  let result = { attemptedCount: 0, commandSourced: new Set(), updated: [], blocked: [], failedCount: 0 },
    disabledByPolicy = areCommandPluginSourcesDisabledByPolicy(),
    refreshDisabled = !HVt();
  if (disabledByPolicy || refreshDisabled)
    logForDebugging(
      disabledByPolicy
        ? `Plugin autoupdate: command-source refresh ${J_() === "unanswered" ? "held for the organization's settings, not yet read" : "disabled by managed settings"} (still excluding command-sourced plugins from the regular pass)`
        : "Plugin autoupdate: command-source refresh disabled by tengu_plugin_command_source_refresh (still excluding command-sourced plugins from the regular pass)",
    );
  try {
    let s =
        isStorageV5Enabled() && storage !== void 0
          ? await loadInstalledPlugins(storage)
          : loadInstalledPluginsSync(),
      i = new Map();
    for (let [_, k] of Object.entries(s.plugins)) {
      let S = filterInstallationsForCurrentProject(k ?? []),
        { name: y, marketplace: marketplace } = parsePluginIdentifier(_);
      if (S.length === 0 || !y || !marketplace) continue;
      let f = i.get(marketplace) ?? [];
      (f.push({ pluginId: _, name: y, installations: S }), i.set(marketplace, f));
    }
    let u,
      C = new Set(),
      h = i.size > 0 ? await loadKnownMarketplacesSafe(storage) : {};
    for (let [_, k] of i) {
      let S = h[_];
      if (isSourceDisallowedOrUnverifiable(S?.source)) {
        for (let { pluginId: pluginId, installations: installations } of k)
          if (installations.some((e) => e.sourceCommand !== void 0)) result.commandSourced.add(pluginId);
        continue;
      }
      let y = await getMarketplaceCacheOnly(_, storage);
      if (!y) continue;
      for (let { pluginId: pluginId, name: f, installations: installations } of k) {
        let found = y.plugins.find((plugin) => plugin.name === f);
        if (!found || typeof found.source === "string" || found.source.source !== "command") continue;
        if ((result.commandSourced.add(pluginId), disabledByPolicy || refreshDisabled)) continue;
        if (!u)
          ((u = new Set(await checkEnabledPlugins())),
            (C = new Set((await loadAllPluginsCacheOnly(storage)).disabled.map((w) => w.source))));
        if (!u.has(pluginId) || isPluginBlockedByPolicy(pluginId)) {
          logForDebugging(`Plugin autoupdate: not re-resolving ${pluginId} (disabled or blocked by policy)`);
          continue;
        }
        let R = o1(found.source),
          filtered = installations.filter((w) => w.sourceCommand !== R);
        if (filtered.length > 0) {
          let all = filtered.every((v) => v.sourceCommand === void 0),
            mapped = uniq(filtered.map((v) => v.scope))
              .map((v) => claudeCommand("plugin update", pluginId, `--scope ${v}`))
              .filter((v) => v !== null)
              .map((v) => `\`${v}\``);
          (logForDebugging(
            `Plugin autoupdate: not re-resolving ${pluginId}: marketplace command differs from the accepted one`,
            { level: "warn" },
          ),
            result.blocked.push({
              type: "generic-error",
              source: pluginId,
              plugin: f,
              error:
                (all
                  ? `${printableName(f, 200)}'s marketplace entry now installs it by running a command`
                  : `${printableName(f, 200)}'s marketplace entry changed the command it runs`) +
                ` (\`${printableName(found.source.command, MAX_CONSENT_COMMAND_LENGTH)}${found.source.mode === "link" ? " [mode: link]" : ""}\`). It was not re-run in the background; ${mapped.length > 0 ? `run ${mapped.join(" and ")}` : "an explicit per-scope plugin update is needed"} to review and accept it.`,
            }));
        }
        let filtered_2 = installations.filter((w) => w.sourceCommand === R);
        if (filtered_2.length === 0) continue;
        (result.attemptedCount++,
          logForDebugging(`Plugin autoupdate: re-resolving command-sourced plugin ${pluginId}`));
        let E = await updatePlugin(pluginId, filtered_2, C, { skipMarketplaceRefresh: !0 }, storage);
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
/**
 * 通知自动更新结果；无监听器时合并暂存。
 */
//@ chunk-0nv5pv9r.js:8276-8639 placement
function notifyPluginsAutoUpdated(n, o, m = [], { announce: r = !0 } = {}) {
  if (n.length === 0 && o.length === 0) return;
  let s = getPluginRegistry();
  if (s.autoUpdateListener) s.autoUpdateListener(n, o, m, r);
  else {
    let pendingAutoUpdateNotification = s.pendingAutoUpdateNotification;
    s.pendingAutoUpdateNotification = {
      updated: uniq([...(pendingAutoUpdateNotification?.updated ?? []), ...n]),
      blocked: [...(pendingAutoUpdateNotification?.blocked ?? []), ...o],
      reresolved: uniq([...(pendingAutoUpdateNotification?.reresolved ?? []), ...m]),
      announce: (pendingAutoUpdateNotification?.announce ?? !1) || r,
    };
  }
}
//@ chunk-0nv5pv9r.js:8639-8736 placement
function x() {
  return { attemptedCount: 0, commandSourced: new Set(), updated: [], blocked: [], failedCount: 0 };
}
/**
 * 命令源重解析只并发一次：需要时先等待组织设置；组织未答复且有命令源插件时把重跑登记到 organizationAsk； 有尝试时广播生产目录变化，并发出自动更新通知。
 */
//@ chunk-0nv5pv9r.js:8736-9182 placement
function reresolveCommandSourcesOnce(n) {
  let o = getPluginRegistry();
  return (
    (o.commandSourceReresolve ??= (async () => {
      if (wt()) return x();
      if (J_() === "unanswered") await zW.wait?.();
      let m = J_() === "unanswered",
        r = await reresolveCommandSourcedPlugins(n);
      if (m) o.commandSourceReresolve = null;
      if (m && r.commandSourced.size > 0)
        ((o.organizationAsk.isCommandHeld = !0),
          (o.organizationAsk.heldReresolve = () => reresolveCommandSourcesOnce(n).then(() => {})));
      if (r.attemptedCount > 0) emitProducerDirsChanged();
      try {
        notifyPluginsAutoUpdated(r.updated, r.blocked, r.updated);
      } catch (error) {
        logError(error);
      }
      return r;
    })()),
    o.commandSourceReresolve
  );
}
/**
 * 后台自动更新：刷新开启 autoUpdate 的市场（refreshMarketplaceDeduped），更新这些市场里已安装的插件、刷新 command 来源与插件目录插件，记 tengu_plugin_autoupdate_pass；自动更新器被禁用时跳过。
 */
//@ chunk-0nv5pv9r.js:9182-11937 callgraph-witnessed = autoUpdateMarketplacesAndPluginsInBackground (0.183)
function autoUpdateMarketplacesAndPluginsInBackground(n) {
  return (async () => {
    let o = await reresolveCommandSourcesOnce(n),
      now = Date.now(),
      r = {
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
      },
      s = {};
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
      (logForDebugging("Plugin autoupdate: skipped (auto-updater disabled)"), i());
      return;
    }
    try {
      let u = await getAutoUpdateMarketplaces(n);
      if (u.size === 0) {
        i();
        return;
      }
      let floored = Math.floor(Math.random() * O);
      (await sleep(floored, void 0, { unref: !0 }), (now = Date.now()));
      let refreshResults = await Promise.allSettled(
        Array.from(u).map(async (name) => {
          try {
            return (await refreshMarketplaceDeduped(name, n, void 0, { isBackground: !0 }), "refreshed");
          } catch (error) {
            if (error instanceof Bd)
              return (
                logForDebugging(
                  `Plugin autoupdate: marketplace ${name} not refreshed (managed policy): ${errorMessage(error)}`,
                ),
                "policy"
              );
            return (
              logForDebugging(
                `Plugin autoupdate: failed to refresh marketplace ${name}: ${errorMessage(error)}`,
                { level: "warn" },
              ),
              "failed"
            );
          }
        }),
      );
      ((r.marketplace_refresh_failed = count(
        refreshResults,
        (e) => e.status === "fulfilled" && e.value === "failed",
      )),
        (r.marketplace_refresh_policy_skipped = count(
          refreshResults,
          (e) => e.status === "fulfilled" && e.value === "policy",
        )),
        (r.marketplaces_refreshed =
          u.size - r.marketplace_refresh_failed - r.marketplace_refresh_policy_skipped),
        logForDebugging("Plugin autoupdate: checking installed plugins"));
      let {
        updated: updated,
        blocked: blocked,
        updateFailedCount: updateFailedCount,
        directory: directory,
      } = await updatePluginsInMarketplaces(u, o.commandSourced, { skipCommandSources: !0 }, n);
      if (
        ((r.plugins_updated = updated.length),
        (r.plugin_update_failed = updateFailedCount),
        (s = {
          directory_updated: directory.updated,
          directory_update_failed: directory.updateFailed,
          directory_update_stuck: directory.stuck,
          directory_identity_changed: directory.identityChanged,
        }),
        (r.plugins_blocked_by_pin = count(blocked, (e) => e.type === "autoupdate-blocked-by-pinner")),
        (r.plugins_helper_deferred = count(blocked, (e) => e.type === "autoupdate-deferred-entry-helper")),
        (r.plugins_policy_blocked = count(blocked, (e) => e.type === "autoupdate-disabled-by-policy")),
        updated.length > 0)
      )
        clearPluginCache("autoupdate dep-resolution");
      let { errors: errors } = await loadAllPluginsCacheOnly(n),
        f = await resolveMissingDependencies(
          errors.filter((e) => {
            if (e.type !== "dependency-unsatisfied") return !1;
            let marketplace = parsePluginIdentifier(e.source).marketplace;
            return marketplace !== void 0 && u.has(marketplace.toLowerCase());
          }),
          n,
        );
      if (f.installed.length > 0)
        (logForDebugging(
          `Plugin autoupdate: resolved ${f.installed.length} missing plugin dependencies: ${f.installed.join(", ")}`,
        ),
          updated.push(...f.installed));
      (notifyPluginsAutoUpdated(updated, blocked),
        logEvent("tengu_plugin_autoupdate_pass", {
          outcome:
            r.marketplace_refresh_failed > 0 || r.plugin_update_failed > 0 ? lit("partial") : lit("ok"),
          ...r,
          ...s,
          duration_ms: Date.now() - now,
        }));
    } catch (error) {
      (logForDebugging(`Plugin autoupdate: failed: ${errorMessage(error)}`, { level: "error" }),
        logEvent("tengu_plugin_autoupdate_pass", {
          outcome: lit("failed"),
          error_kind: fromEnum(classifyPluginCommandError(error)),
          ...r,
          ...s,
          duration_ms: Date.now() - now,
        }));
    }
  })();
}
/**
 * 把一组插件目录批量构造成插件对象（不记遥测），汇总成功与错误。
 */
//@ chunk-9tyqgtn4.js:19012-19284 fingerprint = updatePluginsForMarketplaces (0.673)
async function updatePluginsForMarketplaces(e, n) {
  let results = await Promise.allSettled(
    e.map(({ path: path, source: source, name: c }) =>
      createPluginFromPath(path, source, !0, c, !0, n, void 0, { noTelemetry: !0 }),
    ),
  );
  return {
    enabled: results.flatMap((pluginId) => (pluginId.status === "fulfilled" ? [pluginId.value.plugin] : [])),
    errors: results.flatMap((r) => (r.status === "fulfilled" ? r.value.errors : [])),
  };
}
/**
 * 设置 known_marketplaces 中某市场的 autoUpdate（名字配错）。
 */
//@ chunk-e6aww6q8.js:693187-693320 fingerprint = getAutoUpdateEnabledMarketplaces (1)
async function setMarketplaceAutoUpdateFlag(e, n) {
  await withClaudeAiMarketplaceLock((r) => {
    let s = r[e];
    if (s === void 0 || s.autoUpdate === n) return null;
    return { ...r, [e]: { ...s, autoUpdate: n } };
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
