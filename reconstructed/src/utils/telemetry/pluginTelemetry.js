/**
 * utils/telemetry/pluginTelemetry.ts
 *
 * 插件相关遥测字段（_PROTO_plugin_name 等）与插件事件（重命名、目录遮蔽、命令错误分类）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/telemetry/pluginTelemetry.ts
 * pieces: chunk-aepeg2w5.js (2), chunk-csq9ftr9.js (78), chunk-d4eg9at2.js (1), chunk-dcmhvw5a.js (1)
 * attribution: fingerprint 8, callgraph-fingerprint 2, placement 53, layout 19
 */
import { sep } from "path";
import { createHash } from "crypto";
import { HostScoped } from "../hostScoped.js";
import { getRootSession } from "../../bootstrap/state.js";
import { saveGlobalConfig, saveGlobalConfigSyncForExit, getGlobalConfig } from "../config.js";
import { isStorageV5Enabled } from "../hoverRest.js";
import { registerCleanup, registerPreExitFlush } from "../cleanupRegistry.js";
import {
  legacyPluginIds,
  parsePluginIdentifier_2,
  isOfficialOrCommunityMarketplace,
  isOfficialMarketplaceName_3,
  isKnownOfficialPluginName,
  marketplaceSuffix,
  isOfficialMarketplace,
  parsePluginId,
} from "../plugins/pluginIdentifier.js";
import {
  THIRD_PARTY,
  isToolDetailsLoggingEnabled,
  registerFirstPartyPlugin,
  sanitizeVersion,
} from "../../services/analytics/metadata.js";
import {
  fromSanitizer_SANITIZER_OUTPUT_ONLY,
  lit,
  joinSafe,
  fromEnum,
  fromEnumArr,
  fromEnumOpt,
} from "../../services/analytics/safeMetadata.js";
import { OFFICIAL_MARKETPLACE_NAME } from "../plugins/officialMarketplaceNames.js";
import { getFeatureValue_CACHED_MAY_BE_STALE } from "../../services/analytics/growthbook.js";
import {
  isCatalogEntryName,
  isBuiltinCatalogAccessAllowed,
  isOfficialNameUsableHere,
  COMMAND_SOURCE_ERRORS,
  COMMAND_SOURCE_NETWORK_ERRORS,
} from "../plugins/commandSourceErrors.js";
import { COMMUNITY_MARKETPLACE_NAMES, RESERVED_MARKETPLACE_NAMES } from "../plugins/schemas.js";
import { isOfficialMarketplaceSkill } from "../../tools/SkillTool/SkillTool.js";
import { lastSkillNameForPlugin, ANTHROPIC_SKILLS } from "../../skills/syncedSkills.js";
import { isServerPluginId } from "../plugins/pluginAttribution.js";
import { isValidSkillId } from "./skillAttribution.js";
import { policyEnabledPluginNameSet } from "../plugins/pluginPolicy.js";
import { logEvent } from "../../services/analytics/index.js";
import { uniq } from "../collections.js";
import { logError } from "../log.js";
import { logOTelEvent } from "./events.js";
import { isSafeMode } from "../envUtils.js";
import { getTelemetryMessage, sanitizeErrnoTokenForTelemetry } from "../errors.js";

//@ chunk-csq9ftr9.js:3160-3199 placement
/**
 * 值含插件枚举的设置键（agent、subagentStatusLine）。
 */
var SETTINGS_KEYS_WITH_PLUGIN_ENUM = ["agent", "subagentStatusLine"];
//@ chunk-csq9ftr9.js:3199-3236 placement
function isEnumSettingsKey(e) {
  return SETTINGS_KEYS_WITH_PLUGIN_ENUM.includes(e);
}
//@ chunk-csq9ftr9.js:3236-3289 placement
function pluginCommandKey(e, n) {
  return n ? `${e}@${n.toLowerCase()}` : e;
}
//@ chunk-csq9ftr9.js:3289-3507 placement
class CommandIdRegistry {
  #e = new Map();
  #n = 0;
  generation() {
    return this.#n;
  }
  register(e, n, r, s) {
    if (s !== undefined && s !== this.#n) return;
    this.#e.set(pluginCommandKey(e, n), r);
  }
  get(e, n) {
    if (n === undefined) return;
    return this.#e.get(pluginCommandKey(e, n));
  }
  clear() {
    this.#e.clear();
    this.#n++;
  }
}
//@ chunk-csq9ftr9.js:3507-3531 placement
var commandIdRegistryByHost = new HostScoped(() => new CommandIdRegistry());
//@ chunk-csq9ftr9.js:3531-3567 placement
function commandIdRegistry() {
  return commandIdRegistryByHost.of(getRootSession().host);
}
//@ chunk-csq9ftr9.js:3567-3606 placement
/**
 * 命令 id 注册表的代次。
 */
function commandIdGeneration() {
  return commandIdRegistry().generation();
}
//@ chunk-csq9ftr9.js:3606-3650 placement
/**
 * 注册命令 id。
 */
function registerCommandId(name, n, marketplaceName, s) {
  commandIdRegistry().register(name, n, marketplaceName, s);
}
//@ chunk-csq9ftr9.js:3650-3686 placement
function lookupCommandId(e, n) {
  return commandIdRegistry().get(e, n);
}
//@ chunk-csq9ftr9.js:3686-3713 placement
/**
 * 清空命令 id 注册表。
 */
function clearCommandIds() {
  commandIdRegistry().clear();
}
//@ chunk-csq9ftr9.js:4620-4710 placement
class PluginUsageState {
  pendingUsage = new Map();
  flushTimer = null;
  exitFlushesInFlight = [];
  flushStorageV5 = undefined;
}
//@ chunk-csq9ftr9.js:4710-4734 placement
var pluginUsageStateByHost = new HostScoped(() => new PluginUsageState());
//@ chunk-csq9ftr9.js:4734-4780 placement
class PluginUsageFlushState {
  flushers = null;
  exitFlushRegistered = false;
}
//@ chunk-csq9ftr9.js:4780-4793 placement
var pluginUsageFlushState = new PluginUsageFlushState();
//@ chunk-csq9ftr9.js:4793-4806 placement
var USAGE_FLUSH_INTERVAL_MS = 60000;
//@ chunk-csq9ftr9.js:4806-4877 placement
function registerUsageFlushers(e) {
  pluginUsageFlushState.flushers = e;
  let n = pluginUsageState();
  if (n.pendingUsage.size > 0) scheduleUsageFlush(n, e);
}
//@ chunk-csq9ftr9.js:4877-4913 placement
function pluginUsageState() {
  return pluginUsageStateByHost.of(getRootSession().host);
}
//@ chunk-csq9ftr9.js:4913-5086 placement
/**
 * 记录插件使用次数（批量延迟写）。
 */
function recordPluginUsage(e) {
  let lastUsedAt = Date.now();
  let r = pluginUsageState();
  let s = r.pendingUsage.get(e);
  if (s) {
    s.count++;
    s.lastUsedAt = lastUsedAt;
  } else
    r.pendingUsage.set(e, {
      count: 1,
      lastUsedAt,
    });
  if (pluginUsageFlushState.flushers) scheduleUsageFlush(r, pluginUsageFlushState.flushers);
}
//@ chunk-csq9ftr9.js:5086-5263 placement
function scheduleUsageFlush(e, n) {
  if (!pluginUsageFlushState.exitFlushRegistered) {
    pluginUsageFlushState.exitFlushRegistered = true;
    process.on("exit", n.flushAtExit);
  }
  if (!e.flushTimer) {
    e.flushTimer = setTimeout(n.flush, USAGE_FLUSH_INTERVAL_MS);
    e.flushTimer.unref?.();
  }
}
//@ chunk-csq9ftr9.js:5263-5310 placement
function trackExitFlush(e) {
  pluginUsageState().exitFlushesInFlight.push(e);
}
//@ chunk-csq9ftr9.js:5310-5394 placement
function releaseExitFlush(e) {
  let exitFlushesInFlight = pluginUsageState().exitFlushesInFlight;
  let index = exitFlushesInFlight.indexOf(e);
  if (index !== -1) exitFlushesInFlight.splice(index, 1);
}
//@ chunk-csq9ftr9.js:5394-5499 placement
function takeExitFlushes() {
  let e = pluginUsageState();
  let n = e.exitFlushesInFlight.flat();
  e.exitFlushesInFlight = [];
  return n.length > 0 ? n : null;
}
//@ chunk-csq9ftr9.js:5499-5535 placement
function setUsageFlushStorage(flushStorageV5) {
  pluginUsageState().flushStorageV5 = flushStorageV5;
}
//@ chunk-csq9ftr9.js:5535-5575 placement
function getUsageFlushStorage() {
  return pluginUsageState().flushStorageV5;
}
//@ chunk-csq9ftr9.js:5575-5766 placement
function takePendingUsage() {
  let e = pluginUsageState();
  if (e.flushTimer) {
    clearTimeout(e.flushTimer);
    e.flushTimer = null;
  }
  if (e.pendingUsage.size === 0) return null;
  let n = [...e.pendingUsage.entries()];
  e.pendingUsage.clear();
  return n;
}
//@ chunk-csq9ftr9.js:5766-5813 placement
/**
 * 插件是否有待写入的使用计数。
 */
function hasPendingUsage(e) {
  return pluginUsageState().pendingUsage.has(e);
}
//@ chunk-csq9ftr9.js:5813-5912 placement
function forgetPluginUsage(e) {
  let { pendingUsage } = pluginUsageState();
  for (let key of pendingUsage.keys()) if (e.has(key.toLowerCase())) pendingUsage.delete(key);
}
//@ chunk-csq9ftr9.js:5912-5963 placement
function flushUsageNow() {
  let e = takePendingUsage();
  if (!e) return;
  saveGlobalConfig(mergePluginUsage(e), getUsageFlushStorage());
}
//@ chunk-csq9ftr9.js:5963-6036 placement
async function flushUsageAtExit(e) {
  let n = takePendingUsage();
  if (!n) return;
  trackExitFlush(n);
  await saveGlobalConfig(mergePluginUsage(n), e);
  releaseExitFlush(n);
}
//@ chunk-csq9ftr9.js:6036-6105 placement
/**
 * 启用 v5 存储时安装插件使用量的退出刷新。
 */
function installUsageExitFlush(flushStorageV5) {
  if (isStorageV5Enabled() && flushStorageV5 !== undefined) {
    setUsageFlushStorage(flushStorageV5);
    registerCleanup(() => flushUsageAtExit(flushStorageV5));
    registerPreExitFlush(() => flushUsageAtExit(flushStorageV5));
  }
}
//@ chunk-csq9ftr9.js:6105-6183 placement
function flushUsageSyncOnExit() {
  let e = [...(takeExitFlushes() ?? []), ...(takePendingUsage() ?? [])];
  if (e.length === 0) return;
  saveGlobalConfigSyncForExit(mergePluginUsage(e));
}
//@ chunk-csq9ftr9.js:6183-6213 placement
registerUsageFlushers({
  flush: flushUsageNow,
  flushAtExit: flushUsageSyncOnExit,
});
//@ chunk-csq9ftr9.js:6213-6424 placement
function mergePluginUsage(e) {
  return (n) => {
    let r = {
      ...n.pluginUsage,
    };
    for (let [s, g] of e) {
      let f = r[s];
      r[s] = {
        usageCount: (f?.usageCount ?? 0) + g.count,
        lastUsedAt: g.lastUsedAt,
        lastUsedNumStartups: n.numStartups,
      };
    }
    return {
      ...n,
      pluginUsage: r,
    };
  };
}
//@ chunk-csq9ftr9.js:6424-6672 placement
/**
 * 新启用插件初始化使用记录。
 */
function seedPluginUsage(e, n) {
  let lastUsedAt = Date.now();
  saveGlobalConfig((s) => {
    let filtered = e.filter((m) => !s.pluginUsage?.[m]);
    if (filtered.length === 0) return s;
    let f = {
      ...s.pluginUsage,
    };
    for (let m of filtered)
      f[m] = {
        usageCount: 0,
        lastUsedAt,
        lastUsedNumStartups: s.numStartups,
      };
    return {
      ...s,
      pluginUsage: f,
    };
  }, n);
}
//@ chunk-csq9ftr9.js:6672-6929 placement
/**
 * 删除插件使用记录（大小写不敏感）。
 */
function removePluginUsage(e, storageV5) {
  let r = new Set(e.map((s) => s.toLowerCase()));
  forgetPluginUsage(r);
  saveGlobalConfig((s) => {
    let filtered = Object.keys(s.pluginUsage ?? {}).filter((key) => r.has(key.toLowerCase()));
    if (filtered.length === 0) return s;
    let m = {
      ...s.pluginUsage,
    };
    for (let _ of filtered) delete m[_];
    return {
      ...s,
      pluginUsage: m,
    };
  }, storageV5);
}
//@ chunk-csq9ftr9.js:6929-7026 placement
/**
 * 取插件使用记录（含旧 id 兼容）。
 */
function pluginUsageRecord(repository) {
  let pluginUsage = getGlobalConfig().pluginUsage;
  return [repository, ...legacyPluginIds(repository)]
    .map((r) => pluginUsage?.[r])
    .find((r) => r !== undefined);
}
//@ chunk-csq9ftr9.js:7026-7292 placement
/**
 * 刷新已有插件的最后使用时间。
 */
function touchPluginUsage(e, storageV5) {
  let lastUsedAt = Date.now();
  saveGlobalConfig((s) => {
    let filtered = e.filter((m) => s.pluginUsage?.[m]);
    if (filtered.length === 0) return s;
    let f = {
      ...s.pluginUsage,
    };
    for (let m of filtered) {
      let _ = f[m];
      if (!_) continue;
      f[m] = {
        ..._,
        lastUsedAt,
        lastUsedNumStartups: s.numStartups,
      };
    }
    return {
      ...s,
      pluginUsage: f,
    };
  }, storageV5);
}
//@ chunk-csq9ftr9.js:7292-7729 placement
/**
 * LSP 插件一次性宽限：未用过的刷新最后使用时间。
 */
function applyLspUsageGrace(e, n) {
  let pluginUsageLspGraceAppliedIds = getGlobalConfig().pluginUsageLspGraceAppliedIds;
  if (e.every((g) => pluginUsageLspGraceAppliedIds?.includes(g))) return;
  let lastUsedAt = Date.now();
  saveGlobalConfig((g) => {
    let f = new Set(g.pluginUsageLspGraceAppliedIds);
    let filtered = e.filter((y) => !f.has(y));
    if (filtered.length === 0) return g;
    let _ = {
      ...g.pluginUsage,
    };
    for (let y of filtered) {
      let d = _[y];
      if (!d || d.usageCount > 0) continue;
      _[y] = {
        ...d,
        lastUsedAt,
        lastUsedNumStartups: g.numStartups,
      };
    }
    return {
      ...g,
      pluginUsage: _,
      pluginUsageLspGraceAppliedIds: [...f, ...filtered],
    };
  }, n);
}
//@ chunk-csq9ftr9.js:7729-7881 placement
/**
 * 距最后使用的会话数与天数。
 */
function disuseStats(e, numStartups, r) {
  return {
    sessionsSinceLastUse: Math.max(0, numStartups - e.lastUsedNumStartups),
    daysSinceLastUse: Math.max(0, Math.floor((r - e.lastUsedAt) / 86400000)),
  };
}
//@ chunk-csq9ftr9.js:7881-7964 placement
/**
 * 生成插件名与市场名的遥测字段（第三方脱敏）。
 */
function pluginNameFields(e, marketplace, r) {
  return {
    "plugin.name": r ? e : THIRD_PARTY,
    ...(marketplace && {
      "marketplace.name": r ? marketplace : THIRD_PARTY,
    }),
  };
}
//@ chunk-csq9ftr9.js:7964-8047 placement
/**
 * 插件 id 的哈希（先解析命令 id）。
 */
function pluginIdHash(name, marketplace) {
  let r = lookupCommandId(name, marketplace) ?? marketplace;
  let s = r ? `${name}@${r.toLowerCase()}` : name;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(s));
}
//@ chunk-csq9ftr9.js:8047-8141 placement
/**
 * 插件 id 的遥测形式：官方/已知插件原名，其余记 third-party。
 */
function pluginIdForTelemetry(pluginId) {
  let { name: n, marketplace } = parsePluginIdentifier_2(pluginId);
  return isOfficialOrCommunityMarketplace(marketplace) || isOfficialGatePlugin(n, marketplace)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginId)
    : lit("third-party");
}
//@ chunk-csq9ftr9.js:8141-8195 placement
function isOfficialMarketplaceWithGate(e) {
  return e === OFFICIAL_MARKETPLACE_NAME && getFeatureValue_CACHED_MAY_BE_STALE("tengu_wise_kite", false);
}
//@ chunk-csq9ftr9.js:8195-8231 placement
function isOfficialGatePlugin(e, marketplace) {
  return isOfficialMarketplaceWithGate(marketplace) && isCatalogEntryName(e);
}
//@ chunk-csq9ftr9.js:8231-8326 placement
/**
 * 批量生成插件 id 的遥测形式。
 */
function sanitizedPluginIds(e, isChannelAllowlisted) {
  return e.length > 0
    ? joinSafe(e.map((r) => (isChannelAllowlisted(r) ? pluginIdForTelemetry(r) : lit("third-party"))).sort())
    : undefined;
}
//@ chunk-csq9ftr9.js:8326-8420 placement
/**
 * 市场名的遥测形式：官方限量原名，其余 third-party。
 */
function marketplaceForTelemetry(name) {
  if (isOfficialMarketplaceWithGate(name) && isBuiltinCatalogAccessAllowed())
    return lit(OFFICIAL_MARKETPLACE_NAME);
  return isOfficialOrCommunityMarketplace(name)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name.toLowerCase())
    : lit("third-party");
}
//@ chunk-csq9ftr9.js:8587-8767 fingerprint = getTelemetryPluginScope (0.882)
function getTelemetryPluginScope(name, marketplace, managedNames) {
  if (marketplace === BUILTIN) return "default-bundle";
  if (isOfficialMarketplaceName_3(marketplace)) return "official";
  if (marketplace !== undefined && COMMUNITY_MARKETPLACE_NAMES.has(marketplace.toLowerCase()))
    return "community";
  if (managedNames?.has(name)) return "org";
  return "user-local";
}
//@ chunk-csq9ftr9.js:8767-8827 placement
function isAnthropicPluginSource(telemetryPluginScope) {
  return telemetryPluginScope === "official" || telemetryPluginScope === "default-bundle";
}
//@ chunk-csq9ftr9.js:8827-8873 placement
function isKnownPluginSource(scope) {
  return isAnthropicPluginSource(scope) || scope === "community";
}
//@ chunk-csq9ftr9.js:8873-8909 placement
function mayLogPluginName(telemetryPluginScope) {
  return isAnthropicPluginSource(telemetryPluginScope) || isToolDetailsLoggingEnabled();
}
//@ chunk-csq9ftr9.js:9976-10157 placement
/**
 * 插件 skill 的遥测字段：官方市场插件上报插件名与仓库，其余记 third-party。
 */
function getSkillPluginTelemetryFields(command) {
  let pluginInfo = command.pluginInfo;
  if (!pluginInfo || !isOfficialMarketplaceSkill(command))
    return {
      plugin_name: lit(THIRD_PARTY),
      plugin_repository: lit(THIRD_PARTY),
    };
  return {
    plugin_name: fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginInfo.pluginManifest.name),
    plugin_repository: fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginInfo.repository),
  };
}
//@ chunk-csq9ftr9.js:10157-10455 fingerprint = getEnabledVia (0.748)
function getEnabledVia(plugin, managedNames, seedDirs) {
  if (plugin.isBuiltin) return "default-enable";
  if (managedNames?.has(plugin.name)) return "org-policy";
  if (plugin.installationPreference === "required" || plugin.installationPreference === "auto_install")
    return "admin-install";
  if (seedDirs.some((dir) => plugin.path.startsWith(dir.endsWith(sep) ? dir : dir + sep)))
    return "seed-mount";
  return "user-install";
}
//@ chunk-csq9ftr9.js:10455-10797 fingerprint = buildPluginTelemetryFields (0.53)
function buildPluginTelemetryFields(name, marketplace, managedNames = null) {
  let scope = getTelemetryPluginScope(name, marketplace, managedNames);
  let isAnthropicControlled =
    isKnownPluginSource(scope) ||
    isKnownOfficialPluginName(name, marketplace) ||
    isOfficialGatePlugin(name, marketplace);
  let f = marketplace === BUILTIN ? lastSkillNameForPlugin(name) : undefined;
  return {
    plugin_id_hash: pluginIdHash(name, marketplace),
    plugin_scope: isOfficialNameUsableHere(marketplace) ? fromEnum("directory") : fromEnum(scope),
    plugin_name_redacted: isAnthropicControlled
      ? fromSanitizer_SANITIZER_OUTPUT_ONLY(name)
      : lit(THIRD_PARTY),
    marketplace_name_redacted:
      isAnthropicControlled && marketplace
        ? fromSanitizer_SANITIZER_OUTPUT_ONLY(marketplace)
        : lit(THIRD_PARTY),
    is_official_plugin: isAnthropicPluginSource(scope),
    ...(f !== undefined && {
      plugin_name_previous: fromSanitizer_SANITIZER_OUTPUT_ONLY(f),
      plugin_id_hash_previous: pluginIdHash(f, marketplace),
    }),
  };
}
//@ chunk-csq9ftr9.js:10797-10914 layout
/**
 * 插件事件字段：_PROTO_plugin_name、_PROTO_marketplace_name（特权列）与可公开的插件归属字段。
 */
function buildPluginEventFields(name, marketplace, r = null) {
  let s = lookupCommandId(name, marketplace) ?? marketplace;
  return {
    _PROTO_plugin_name: name,
    ...(s && {
      _PROTO_marketplace_name: s,
    }),
    ...buildPluginTelemetryFields(name, marketplace, r),
  };
}
//@ chunk-csq9ftr9.js:10914-10971 layout
function sanitizePluginIdForAnalytics(e) {
  if (e === undefined || !isServerPluginId(e)) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(e);
}
//@ chunk-csq9ftr9.js:10971-11027 layout
function sanitizeSkillIdForAnalytics(skillId) {
  if (skillId === undefined || !isValidSkillId(skillId)) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(skillId);
}
//@ chunk-csq9ftr9.js:11027-11051 layout
var GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
//@ chunk-csq9ftr9.js:11051-11151 layout
function getPluginVersionSha(e, marketplace) {
  if (e === undefined || !isOfficialOrCommunityMarketplace(marketplace)) return;
  let lower = e.toLowerCase();
  return GIT_SHA_PATTERN.test(lower) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(lower) : undefined;
}
//@ chunk-csq9ftr9.js:11151-11243 layout
function buildPluginVersionShaField(e, n) {
  let pluginVersionSha = getPluginVersionSha(n, parsePluginIdentifier_2(e).marketplace);
  return pluginVersionSha !== undefined
    ? {
        plugin_version_sha: pluginVersionSha,
      }
    : {};
}
//@ chunk-csq9ftr9.js:11243-11317 layout
function buildPluginSourceFields(serverRef) {
  return serverRef.pluginSource !== undefined
    ? buildPluginEventFieldsFromId(serverRef.pluginSource, policyEnabledPluginNameSet())
    : {};
}
//@ chunk-csq9ftr9.js:11317-11399 layout
function logPluginFolderShadowed(name, marketplace, r) {
  logEvent("tengu_plugin_folder_shadowed", {
    component: fromEnum(r),
    ...buildPluginEventFields(name, marketplace),
  });
}
//@ chunk-csq9ftr9.js:11399-11578 layout
function logPluginRenamed(e, marketplace, pluginRename) {
  logEvent("tengu_plugin_renamed", {
    outcome: fromEnum(pluginRename.kind),
    chain_depth: pluginRename.kind === "unresolved" ? undefined : pluginRename.chainDepth,
    reason: pluginRename.kind === "unresolved" ? fromEnum(pluginRename.reason) : undefined,
    ...buildPluginEventFields(e, marketplace),
  });
}
//@ chunk-csq9ftr9.js:11578-11923 layout
function groupPluginSourcesByName(e, n, r) {
  let s = new Map();
  for (let { name: g, source } of n) {
    let m = s.get(g);
    if (m === undefined) s.set(g, [source]);
    else m.push(source);
  }
  for (let [g, f] of s) {
    let m = uniq(f);
    if (m.length < 2) continue;
    logEvent("tengu_plugin_name_collision", {
      item_type: fromEnum(e),
      _PROTO_skill_name: g,
      item_name_hash: pluginIdHash(g),
      source_count: m.length,
      sources: fromEnumArr(m),
      ...(r.resolves && {
        winner_source: fromEnumOpt(f.at(-1)),
      }),
    });
  }
}
//@ chunk-csq9ftr9.js:11923-11994 layout
function buildPluginEventFieldsFromId(pluginInfo, managedNames = null) {
  let { name: r, marketplace } = parsePluginIdentifier_2(pluginInfo);
  return buildPluginEventFields(r, marketplace, managedNames);
}
//@ chunk-csq9ftr9.js:11994-12151 layout
function buildPluginInfoFields(pluginInfo, managedNames = policyEnabledPluginNameSet()) {
  let { marketplace } = parsePluginIdentifier_2(pluginInfo.repository);
  let s = sanitizePluginIdForAnalytics(pluginInfo.serverPluginId);
  return {
    ...buildPluginEventFields(pluginInfo.pluginManifest.name, marketplace, managedNames),
    ...(s !== undefined && {
      server_plugin_id: s,
    }),
  };
}
//@ chunk-csq9ftr9.js:12151-12351 layout
function buildServerAttributionFields(command, managedNames) {
  let r = sanitizeSkillIdForAnalytics(command.serverAttribution?.skillId);
  let s = sanitizePluginIdForAnalytics(command.serverAttribution?.pluginId);
  return {
    ...(command.pluginInfo && buildPluginInfoFields(command.pluginInfo, managedNames)),
    ...(r !== undefined && {
      skill_id: r,
    }),
    ...(s !== undefined && {
      server_plugin_id: s,
    }),
  };
}
//@ chunk-csq9ftr9.js:12351-12476 fingerprint = buildPluginCommandTelemetryFields (0.754)
function buildPluginCommandTelemetryFields(pluginInfo, managedNames) {
  for (let r of pluginInfo)
    try {
      let { marketplace } = parsePluginIdentifier_2(r.repository);
      if (isAnthropicPluginSource(getTelemetryPluginScope(r.name, marketplace, managedNames)))
        registerFirstPartyPlugin(r.name, marketplace);
    } catch (error) {
      logError(error);
    }
}
//@ chunk-csq9ftr9.js:12476-12528 layout
function isOfficialPluginRepo(repository) {
  let n = marketplaceSuffix(repository);
  return n === undefined || isOfficialMarketplace(n);
}
//@ chunk-csq9ftr9.js:12528-12585 layout
function isBuiltinOrOfficialPlugin(plugin) {
  return plugin.isBuiltin === true || isOfficialPluginRepo(plugin.repository);
}
//@ chunk-csq9ftr9.js:12585-12704 layout = getCommandId (0.912)
function getCommandId(cmd) {
  return (
    cmd.type === "prompt" &&
    cmd.loadedFrom === "plugin" &&
    cmd.pluginInfo !== undefined &&
    !isOfficialPluginRepo(cmd.pluginInfo.repository)
  );
}
//@ chunk-csq9ftr9.js:12704-12881 layout
/**
 * 按插件仓库分组命令名。
 */
function groupCommandsByRepository(commands) {
  let n = new Map();
  for (let r of commands) {
    if (!getCommandId(r)) continue;
    let s = n.get(r.pluginInfo.repository);
    if (s) s.push(r.name);
    else n.set(r.pluginInfo.repository, [r.name]);
  }
  return n;
}
//@ chunk-csq9ftr9.js:12881-13052 layout
function buildPluginErrorFields(e, repository) {
  if (e === null) return {};
  let r = e.get(repository) ?? [];
  return {
    skill_name_hash_count: r.length,
    ...(r.length > 0 && {
      skill_name_hashes: fromSanitizer_SANITIZER_OUTPUT_ONLY(
        r
          .map((s) => hashPluginId(s))
          .sort()
          .join(","),
      ),
    }),
  };
}
//@ chunk-csq9ftr9.js:13052-14747 fingerprint = logPluginsEnabledForSession (0.483)
function logPluginsEnabledForSession(enabled, managedNames, seedDirs, s, g) {
  let numStartups = getGlobalConfig().numStartups;
  let now = Date.now();
  let _ = [];
  let mapped = enabled
    .filter((d) => d.lspServers && Object.keys(d.lspServers).length > 0)
    .map((d) => d.repository);
  if (mapped.length > 0) applyLspUsageGrace(mapped, g);
  for (let plugin of enabled) {
    let { marketplace } = parsePluginIdentifier_2(plugin.repository);
    let I = pluginUsageRecord(plugin.repository);
    if (!I) _.push(plugin.repository);
    let { sessionsSinceLastUse, daysSinceLastUse } = I
      ? disuseStats(I, numStartups, now)
      : {
          sessionsSinceLastUse: 0,
          daysSinceLastUse: 0,
        };
    let telemetryPluginScope = getTelemetryPluginScope(plugin.name, marketplace, managedNames);
    let enabledVia = getEnabledVia(plugin, managedNames, seedDirs);
    let skillPathCount = (plugin.skillsPath ? 1 : 0) + (plugin.skillsPaths?.length ?? 0);
    let commandPathCount = (plugin.commandsPath ? 1 : 0) + (plugin.commandsPaths?.length ?? 0);
    let agentPathCount = (plugin.agentsPath ? 1 : 0) + (plugin.agentsPaths?.length ?? 0);
    let w = sanitizePluginIdForAnalytics(plugin.serverPluginId);
    let hasHooks = plugin.hooksConfig !== undefined || plugin.modulePath !== undefined;
    let V = mayLogPluginName(telemetryPluginScope);
    logOTelEvent("plugin_loaded", {
      ...pluginNameFields(plugin.name, marketplace, V),
      ...(V &&
        plugin.manifest.version && {
          "plugin.version": plugin.manifest.version,
        }),
      "plugin.scope": telemetryPluginScope,
      enabled_via: enabledVia,
      plugin_id_hash: pluginIdHash(plugin.name, marketplace),
      has_hooks: hasHooks,
      has_mcp: !plugin.skipMcpDiscovery && plugin.mcpServers !== undefined,
      host_owned_mcp: plugin.skipMcpDiscovery === true,
      skill_path_count: skillPathCount,
      command_path_count: commandPathCount,
      agent_path_count: agentPathCount,
      safe_mode: String(isSafeMode()),
    });
    logEvent("tengu_plugin_enabled_for_session", {
      ...buildPluginEventFields(plugin.name, marketplace, managedNames),
      ...(w !== undefined && {
        server_plugin_id: w,
      }),
      enabled_via: fromEnum(enabledVia),
      ...(plugin.installationPreference !== undefined && {
        installation_preference: fromEnum(plugin.installationPreference),
      }),
      skill_path_count: skillPathCount,
      command_path_count: commandPathCount,
      agent_path_count: agentPathCount,
      ...buildPluginErrorFields(isBuiltinOrOfficialPlugin(plugin) ? null : s, plugin.repository),
      has_mcp: !plugin.skipMcpDiscovery && plugin.mcpServers !== undefined,
      host_owned_mcp: plugin.skipMcpDiscovery === true,
      has_lsp: plugin.lspServers !== undefined,
      has_hooks: hasHooks,
      has_settings: plugin.settings !== undefined,
      sessions_since_last_use: sessionsSinceLastUse,
      days_since_last_use: daysSinceLastUse,
      safe_mode: isSafeMode(),
      ...(plugin.settings && {
        settings_keys: fromEnumArr(Object.keys(plugin.settings).filter(isEnumSettingsKey)),
      }),
      ...(plugin.manifest.version && {
        version: sanitizeVersion(plugin.manifest.version),
      }),
      ...buildPluginVersionShaField(plugin.repository, plugin.gitCommitSha),
    });
  }
  if (_.length > 0) seedPluginUsage(_, g);
}
//@ chunk-csq9ftr9.js:14747-14847 fingerprint = classifyPluginCommandError (0.783)
var PLUGIN_COMMAND_ERROR_KINDS = [
  "network",
  "not-found",
  "permission",
  "policy",
  "validation",
  "in-use",
  "unknown",
];
var PLUGIN_COMMAND_ERROR_KIND_SET = new Set(PLUGIN_COMMAND_ERROR_KINDS);
//@ chunk-csq9ftr9.js:14847-14900 layout
function isPluginCommandErrorKind(pluginCommandErrorCategory) {
  return (
    typeof pluginCommandErrorCategory === "string" &&
    PLUGIN_COMMAND_ERROR_KIND_SET.has(pluginCommandErrorCategory)
  );
}
//@ chunk-csq9ftr9.js:14900-15886 placement
function classifyPluginCommandError(e) {
  if (
    typeof e === "object" &&
    e !== null &&
    "pluginCommandErrorCategory" in e &&
    isPluginCommandErrorKind(e.pluginCommandErrorCategory)
  )
    return e.pluginCommandErrorCategory;
  let n = String(e?.message ?? e);
  let telemetryMessage = getTelemetryMessage(e);
  if (
    typeof telemetryMessage === "string" &&
    (COMMAND_SOURCE_ERRORS.has(telemetryMessage) ||
      telemetryMessage.startsWith(COMMAND_SOURCE_NETWORK_ERRORS))
  )
    return "policy";
  if (
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|ECONNRESET|network|Could not resolve|Connection refused|timed out/i.test(
      n,
    )
  )
    return "network";
  if (/\b404\b|not found|does not exist|no such plugin/i.test(n)) return "not-found";
  if (/\b40[13]\b|EACCES|EPERM|permission denied|unauthorized/i.test(n)) return "permission";
  if (/blocked by your organization'?s policy|required by your organization/i.test(n)) return "policy";
  if (
    /(?:the command|it|nothing) was not run|nothing was run|command that installs it was not run|is ignored inside a Claude Code session|Command-sourced plugins are disabled|not supported on Windows yet/i.test(
      n,
    )
  )
    return "policy";
  if (/invalid|malformed|schema|validation|parse error/i.test(n)) return "validation";
  return "unknown";
}
//@ chunk-csq9ftr9.js:15886-15954 placement
/**
 * 市场名脱敏：保留已知保留名，其余记 third-party。
 */
function redactedMarketplaceName(marketplace) {
  let lower = marketplace.toLowerCase();
  return RESERVED_MARKETPLACE_NAMES.has(lower)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(lower)
    : lit(THIRD_PARTY);
}
//@ chunk-csq9ftr9.js:15954-16545 placement
function logPluginLoadFailed(errors, n, r) {
  for (let s of errors) {
    let { name: g, marketplace } = parsePluginIdentifier_2(s.source);
    let m = "plugin" in s && s.plugin ? s.plugin : g;
    logEvent("tengu_plugin_load_failed", {
      error_category: fromEnum(s.type),
      cache_only: r?.cacheOnly ?? false,
      ...("component" in s && {
        component: fromEnum(s.component),
      }),
      ...("errno" in s && {
        errno: sanitizeErrnoTokenForTelemetry(s.errno),
      }),
      ...{
        is_directory: isOfficialNameUsableHere(marketplace),
        removed_from_directory: "removedFromDirectory" in s && s.removedFromDirectory === true,
      },
      ...buildPluginEventFields(m, marketplace, n),
      ...(s.type === "marketplace-load-failed" &&
        s.untrustedReservedName === true && {
          plugin_name_redacted: lit(THIRD_PARTY),
          marketplace_name_redacted: redactedMarketplaceName(s.marketplace),
          plugin_scope: fromEnum("user-local"),
          is_official_plugin: false,
        }),
    });
  }
}
//@ chunk-aepeg2w5.js:758887-758923 fingerprint = PLUGIN_ID_HASH_SALT (1)
var PLUGIN_ID_HASH_SALT = "claude-plugin-telemetry-v1";
//@ chunk-aepeg2w5.js:758923-758998 callgraph-fingerprint = hashPluginId (1)
function hashPluginId(e) {
  return createHash("sha256")
    .update(e + PLUGIN_ID_HASH_SALT)
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-d4eg9at2.js:34003-34142 fingerprint = logPluginLoadErrors (0.546)
function logPluginLoadErrors(s, o, i) {
  let { name, marketplace } = parsePluginId(o);
  logEvent(s, {
    _PROTO_plugin_name: name,
    ...(marketplace && {
      _PROTO_marketplace_name: marketplace,
    }),
    ...(i !== undefined && {
      scope: i,
    }),
  });
}
//@ chunk-dcmhvw5a.js:137274-137350 callgraph-fingerprint = BUILTIN_MARKETPLACE_NAME (0.364)
/**
 * 插件来源标记常量：inline、skills-dir、synced、builtin，以及 anthropic-skills@inline 组合名，用于插件/技能遥测。
 */
var INLINE_PLUGIN_MARKETPLACE = "inline";
var ANTHROPIC_SKILLS_PLUGIN_ID = `${ANTHROPIC_SKILLS}@${INLINE_PLUGIN_MARKETPLACE}`;
var SKILLS_DIR = "skills-dir";
var SYNCED = "synced";
var BUILTIN = "builtin";
export {
  pluginIdHash,
  BUILTIN,
  SYNCED,
  buildServerAttributionFields,
  classifyPluginCommandError,
  groupPluginSourcesByName,
  recordPluginUsage,
  buildPluginEventFields,
  INLINE_PLUGIN_MARKETPLACE,
  pluginIdForTelemetry,
  buildPluginVersionShaField,
  buildPluginEventFieldsFromId,
  isAnthropicPluginSource,
  getTelemetryPluginScope,
  buildPluginSourceFields,
  hashPluginId,
  buildPluginCommandTelemetryFields,
  logPluginLoadFailed,
  logPluginsEnabledForSession,
  sanitizedPluginIds,
  SKILLS_DIR,
  removePluginUsage,
  seedPluginUsage,
  touchPluginUsage,
  getSkillPluginTelemetryFields,
  logPluginFolderShadowed,
  SETTINGS_KEYS_WITH_PLUGIN_ENUM,
  logPluginRenamed,
  commandIdGeneration,
  registerCommandId,
  clearCommandIds,
  getCommandId,
  groupCommandsByRepository,
  getEnabledVia,
  pluginUsageRecord,
  hasPendingUsage,
  disuseStats,
  marketplaceForTelemetry,
  buildPluginTelemetryFields,
  installUsageExitFlush,
  ANTHROPIC_SKILLS_PLUGIN_ID,
  logPluginLoadErrors,
  pluginNameFields,
  mayLogPluginName,
  redactedMarketplaceName,
};
