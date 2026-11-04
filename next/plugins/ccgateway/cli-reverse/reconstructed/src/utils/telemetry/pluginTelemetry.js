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
import { createHash } from "crypto";
import { sep } from "path";
import { ANTHROPIC_SKILLS, lastSkillNameForPlugin } from "../../skills/syncedSkills.js";
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
import { isServerPluginId } from "../plugins/pluginAttribution.js";
import { isValidSkillId } from "./skillAttribution.js";
import { policyEnabledPluginNameSet } from "../plugins/pluginPolicy.js";
import { logEvent } from "../../services/analytics/index.js";
import { uniq } from "../collections.js";
import { logError } from "../log.js";
import { logOTelEvent } from "./events.js";
import { isSafeMode } from "../envUtils.js";
import { getTelemetryMessage, sanitizeErrnoTokenForTelemetry } from "../errors.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-dcmhvw5a.js:137274-137350 callgraph-fingerprint (2.1.88 match: BUILTIN_MARKETPLACE_NAME, 0.364)
/**
 * 插件来源标记常量：inline、skills-dir、synced、builtin，以及 anthropic-skills@inline 组合名，用于插件/技能遥测。
 */
var INLINE_PLUGIN_MARKETPLACE = "inline";
var ANTHROPIC_SKILLS_PLUGIN_ID = `${ANTHROPIC_SKILLS}@${INLINE_PLUGIN_MARKETPLACE}`;
var SKILLS_DIR = "skills-dir";
var SYNCED = "synced";
var BUILTIN = "builtin";
//@ chunk-aepeg2w5.js:758887-758923 fingerprint (2.1.88 match: PLUGIN_ID_HASH_SALT, 1)
var PLUGIN_ID_HASH_SALT = "claude-plugin-telemetry-v1";
//@ chunk-aepeg2w5.js:758923-758998 callgraph-fingerprint (2.1.88 match: hashPluginId, 1)
function hashPluginId(pluginId) {
  return createHash("sha256")
    .update(pluginId + PLUGIN_ID_HASH_SALT)
    .digest("hex")
    .slice(0, 16);
}
//@ chunk-csq9ftr9.js:3160-3199 placement
/**
 * 值含插件枚举的设置键（agent、subagentStatusLine）。
 */
var SETTINGS_KEYS_WITH_PLUGIN_ENUM = ["agent", "subagentStatusLine"];
//@ chunk-csq9ftr9.js:3199-3236 placement
function isEnumSettingsKey(key) {
  return SETTINGS_KEYS_WITH_PLUGIN_ENUM.includes(key);
}
//@ chunk-csq9ftr9.js:3236-3289 placement
function pluginCommandKey(name, marketplace) {
  return marketplace ? `${name}@${marketplace.toLowerCase()}` : name;
}
//@ chunk-csq9ftr9.js:3289-3507 placement
class CommandIdRegistry {
  #e = new Map();
  #n = 0;
  generation() {
    return this.#n;
  }
  register(name, marketplace, commandId, generation) {
    if (generation !== undefined && generation !== this.#n) return;
    this.#e.set(pluginCommandKey(name, marketplace), commandId);
  }
  get(name_2, marketplace_2) {
    if (marketplace_2 === undefined) return;
    return this.#e.get(pluginCommandKey(name_2, marketplace_2));
  }
  clear() {
    this.#e.clear();
    this.#n++;
  }
}
//@ chunk-csq9ftr9.js:3507-3531 placement
var commandIdRegistryByHost; // deferred: uses CommandIdRegistry of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-csq9ftr9.js:3507", () => {
  commandIdRegistryByHost = new HostScoped(() => new CommandIdRegistry());
});
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
function registerCommandId(name, commandId, marketplaceName, generation) {
  commandIdRegistry().register(name, commandId, marketplaceName, generation);
}
//@ chunk-csq9ftr9.js:3650-3686 placement
function lookupCommandId(name, marketplace) {
  return commandIdRegistry().get(name, marketplace);
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
var pluginUsageStateByHost; // deferred: uses PluginUsageState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-csq9ftr9.js:4710", () => {
  pluginUsageStateByHost = new HostScoped(() => new PluginUsageState());
});
//@ chunk-csq9ftr9.js:4734-4780 placement
class PluginUsageFlushState {
  flushers = null;
  exitFlushRegistered = false;
}
//@ chunk-csq9ftr9.js:4780-4793 placement
var pluginUsageFlushState; // deferred: uses PluginUsageFlushState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-csq9ftr9.js:4780", () => {
  pluginUsageFlushState = new PluginUsageFlushState();
});
//@ chunk-csq9ftr9.js:4793-4806 placement
var USAGE_FLUSH_INTERVAL_MS = 60000;
//@ chunk-csq9ftr9.js:4806-4877 placement
function registerUsageFlushers(flushers) {
  pluginUsageFlushState.flushers = flushers;
  let state = pluginUsageState();
  if (state.pendingUsage.size > 0) scheduleUsageFlush(state, flushers);
}
//@ chunk-csq9ftr9.js:4877-4913 placement
function pluginUsageState() {
  return pluginUsageStateByHost.of(getRootSession().host);
}
//@ chunk-csq9ftr9.js:4913-5086 placement
/**
 * 记录插件使用次数（批量延迟写）。
 */
function recordPluginUsage(pluginId) {
  let lastUsedAt = Date.now();
  let state = pluginUsageState();
  let record = state.pendingUsage.get(pluginId);
  if (record) {
    record.count++;
    record.lastUsedAt = lastUsedAt;
  } else
    state.pendingUsage.set(pluginId, {
      count: 1,
      lastUsedAt,
    });
  if (pluginUsageFlushState.flushers) scheduleUsageFlush(state, pluginUsageFlushState.flushers);
}
//@ chunk-csq9ftr9.js:5086-5263 placement
function scheduleUsageFlush(state, flushers) {
  if (!pluginUsageFlushState.exitFlushRegistered) {
    pluginUsageFlushState.exitFlushRegistered = true;
    process.on("exit", flushers.flushAtExit);
  }
  if (!state.flushTimer) {
    state.flushTimer = setTimeout(flushers.flush, USAGE_FLUSH_INTERVAL_MS);
    state.flushTimer.unref?.();
  }
}
//@ chunk-csq9ftr9.js:5263-5310 placement
function trackExitFlush(promise) {
  pluginUsageState().exitFlushesInFlight.push(promise);
}
//@ chunk-csq9ftr9.js:5310-5394 placement
function releaseExitFlush(promise) {
  let exitFlushesInFlight = pluginUsageState().exitFlushesInFlight;
  let index = exitFlushesInFlight.indexOf(promise);
  if (index !== -1) exitFlushesInFlight.splice(index, 1);
}
//@ chunk-csq9ftr9.js:5394-5499 placement
function takeExitFlushes() {
  let state = pluginUsageState();
  let flushes = state.exitFlushesInFlight.flat();
  state.exitFlushesInFlight = [];
  return flushes.length > 0 ? flushes : null;
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
  let state = pluginUsageState();
  if (state.flushTimer) {
    clearTimeout(state.flushTimer);
    state.flushTimer = null;
  }
  if (state.pendingUsage.size === 0) return null;
  let entries = [...state.pendingUsage.entries()];
  state.pendingUsage.clear();
  return entries;
}
//@ chunk-csq9ftr9.js:5766-5813 placement
/**
 * 插件是否有待写入的使用计数。
 */
function hasPendingUsage(pluginId) {
  return pluginUsageState().pendingUsage.has(pluginId);
}
//@ chunk-csq9ftr9.js:5813-5912 placement
function forgetPluginUsage(pluginIds) {
  let { pendingUsage } = pluginUsageState();
  for (let key of pendingUsage.keys()) if (pluginIds.has(key.toLowerCase())) pendingUsage.delete(key);
}
//@ chunk-csq9ftr9.js:5912-5963 placement
function flushUsageNow() {
  let entries = takePendingUsage();
  if (!entries) return;
  saveGlobalConfig(mergePluginUsage(entries), getUsageFlushStorage());
}
//@ chunk-csq9ftr9.js:5963-6036 placement
async function flushUsageAtExit(storage) {
  let entries = takePendingUsage();
  if (!entries) return;
  trackExitFlush(entries);
  await saveGlobalConfig(mergePluginUsage(entries), storage);
  releaseExitFlush(entries);
}
//@ chunk-csq9ftr9.js:6036-6105 placement
/**
 * 启用 v5 存储时安装插件使用量的退出刷新。
 */
function installUsageExitFlush(storageV5) {
  if (isStorageV5Enabled() && storageV5 !== undefined) {
    setUsageFlushStorage(storageV5);
    registerCleanup(() => flushUsageAtExit(storageV5));
    registerPreExitFlush(() => flushUsageAtExit(storageV5));
  }
}
//@ chunk-csq9ftr9.js:6105-6183 placement
function flushUsageSyncOnExit() {
  let entries = [...(takeExitFlushes() ?? []), ...(takePendingUsage() ?? [])];
  if (entries.length === 0) return;
  saveGlobalConfigSyncForExit(mergePluginUsage(entries));
}
//@ chunk-csq9ftr9.js:6183-6213 placement
// deferred: uses registerUsageFlushers of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-csq9ftr9.js:6183", () => {
  registerUsageFlushers({
    flush: flushUsageNow,
    flushAtExit: flushUsageSyncOnExit,
  });
});
//@ chunk-csq9ftr9.js:6213-6424 placement
function mergePluginUsage(usageEntries) {
  return (config) => {
    let pluginUsage = {
      ...config.pluginUsage,
    };
    for (let [pluginId, pending_2] of usageEntries) {
      let existing = pluginUsage[pluginId];
      pluginUsage[pluginId] = {
        usageCount: (existing?.usageCount ?? 0) + pending_2.count,
        lastUsedAt: pending_2.lastUsedAt,
        lastUsedNumStartups: config.numStartups,
      };
    }
    return {
      ...config,
      pluginUsage,
    };
  };
}
//@ chunk-csq9ftr9.js:6424-6672 placement
/**
 * 新启用插件初始化使用记录。
 */
function seedPluginUsage(pluginIds, storage) {
  let lastUsedAt = Date.now();
  saveGlobalConfig((config) => {
    let filtered = pluginIds.filter((pluginId) => !config.pluginUsage?.[pluginId]);
    if (filtered.length === 0) return config;
    let pluginUsage = {
      ...config.pluginUsage,
    };
    for (let pluginId_2 of filtered)
      pluginUsage[pluginId_2] = {
        usageCount: 0,
        lastUsedAt,
        lastUsedNumStartups: config.numStartups,
      };
    return {
      ...config,
      pluginUsage,
    };
  }, storage);
}
//@ chunk-csq9ftr9.js:6672-6929 placement
/**
 * 删除插件使用记录（大小写不敏感）。
 */
function removePluginUsage(pluginIds, storageV5) {
  let lowerIds = new Set(pluginIds.map((pluginId) => pluginId.toLowerCase()));
  forgetPluginUsage(lowerIds);
  saveGlobalConfig((config) => {
    let filtered = Object.keys(config.pluginUsage ?? {}).filter((key) => lowerIds.has(key.toLowerCase()));
    if (filtered.length === 0) return config;
    let pluginUsage = {
      ...config.pluginUsage,
    };
    for (let pluginId_2 of filtered) delete pluginUsage[pluginId_2];
    return {
      ...config,
      pluginUsage,
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
    .map((repositoryId) => pluginUsage?.[repositoryId])
    .find((record) => record !== undefined);
}
//@ chunk-csq9ftr9.js:7026-7292 placement
/**
 * 刷新已有插件的最后使用时间。
 */
function touchPluginUsage(pluginIds, storageV5) {
  let lastUsedAt = Date.now();
  saveGlobalConfig((config) => {
    let filtered = pluginIds.filter((pluginId) => config.pluginUsage?.[pluginId]);
    if (filtered.length === 0) return config;
    let pluginUsage = {
      ...config.pluginUsage,
    };
    for (let pluginId_2 of filtered) {
      let existing = pluginUsage[pluginId_2];
      if (!existing) continue;
      pluginUsage[pluginId_2] = {
        ...existing,
        lastUsedAt,
        lastUsedNumStartups: config.numStartups,
      };
    }
    return {
      ...config,
      pluginUsage,
    };
  }, storageV5);
}
//@ chunk-csq9ftr9.js:7292-7729 placement
/**
 * LSP 插件一次性宽限：未用过的刷新最后使用时间。
 */
function applyLspUsageGrace(pluginIds, storage) {
  let pluginUsageLspGraceAppliedIds = getGlobalConfig().pluginUsageLspGraceAppliedIds;
  if (pluginIds.every((appliedIds) => pluginUsageLspGraceAppliedIds?.includes(appliedIds))) return;
  let lastUsedAt = Date.now();
  saveGlobalConfig((config) => {
    let appliedSet = new Set(config.pluginUsageLspGraceAppliedIds);
    let filtered = pluginIds.filter((pluginId) => !appliedSet.has(pluginId));
    if (filtered.length === 0) return config;
    let pluginUsage = {
      ...config.pluginUsage,
    };
    for (let pluginId_2 of filtered) {
      let record = pluginUsage[pluginId_2];
      if (!record || record.usageCount > 0) continue;
      pluginUsage[pluginId_2] = {
        ...record,
        lastUsedAt,
        lastUsedNumStartups: config.numStartups,
      };
    }
    return {
      ...config,
      pluginUsage,
      pluginUsageLspGraceAppliedIds: [...appliedSet, ...filtered],
    };
  }, storage);
}
//@ chunk-csq9ftr9.js:7729-7881 placement
/**
 * 距最后使用的会话数与天数。
 */
function disuseStats(usage, numStartups, now) {
  return {
    sessionsSinceLastUse: Math.max(0, numStartups - usage.lastUsedNumStartups),
    daysSinceLastUse: Math.max(0, Math.floor((now - usage.lastUsedAt) / 86400000)),
  };
}
//@ chunk-csq9ftr9.js:7881-7964 placement
/**
 * 生成插件名与市场名的遥测字段（第三方脱敏）。
 */
function pluginNameFields(name, marketplace, mayLogName) {
  return {
    "plugin.name": mayLogName ? name : THIRD_PARTY,
    ...(marketplace && {
      "marketplace.name": mayLogName ? marketplace : THIRD_PARTY,
    }),
  };
}
//@ chunk-csq9ftr9.js:7964-8047 placement
/**
 * 插件 id 的哈希（先解析命令 id）。
 */
function pluginIdHash(name, marketplace) {
  let marketplaceName = lookupCommandId(name, marketplace) ?? marketplace;
  let pluginId = marketplaceName ? `${name}@${marketplaceName.toLowerCase()}` : name;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(hashPluginId(pluginId));
}
//@ chunk-csq9ftr9.js:8047-8141 placement
/**
 * 插件 id 的遥测形式：官方/已知插件原名，其余记 third-party。
 */
function pluginIdForTelemetry(pluginId) {
  let { name: pluginName, marketplace } = parsePluginIdentifier_2(pluginId);
  return isOfficialOrCommunityMarketplace(marketplace) || isOfficialGatePlugin(pluginName, marketplace)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(pluginId)
    : lit("third-party");
}
//@ chunk-csq9ftr9.js:8141-8195 placement
function isOfficialMarketplaceWithGate(marketplace) {
  return (
    marketplace === OFFICIAL_MARKETPLACE_NAME && getFeatureValue_CACHED_MAY_BE_STALE("tengu_wise_kite", false)
  );
}
//@ chunk-csq9ftr9.js:8195-8231 placement
function isOfficialGatePlugin(name, marketplace) {
  return isOfficialMarketplaceWithGate(marketplace) && isCatalogEntryName(name);
}
//@ chunk-csq9ftr9.js:8231-8326 placement
/**
 * 批量生成插件 id 的遥测形式。
 */
function sanitizedPluginIds(pluginIds, isChannelAllowlisted) {
  return pluginIds.length > 0
    ? joinSafe(
        pluginIds
          .map((pluginId) =>
            isChannelAllowlisted(pluginId) ? pluginIdForTelemetry(pluginId) : lit("third-party"),
          )
          .sort(),
      )
    : undefined;
}
//@ chunk-csq9ftr9.js:8326-8420 placement
/**
 * 市场名的遥测形式：官方限量原名，其余 third-party。
 */
function marketplaceForTelemetry(marketplace) {
  if (isOfficialMarketplaceWithGate(marketplace) && isBuiltinCatalogAccessAllowed())
    return lit(OFFICIAL_MARKETPLACE_NAME);
  return isOfficialOrCommunityMarketplace(marketplace)
    ? fromSanitizer_SANITIZER_OUTPUT_ONLY(marketplace.toLowerCase())
    : lit("third-party");
}
//@ chunk-csq9ftr9.js:8587-8767 fingerprint (2.1.88 match: getTelemetryPluginScope, 0.882)
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
//@ chunk-csq9ftr9.js:10157-10455 fingerprint (2.1.88 match: getEnabledVia, 0.748)
function getEnabledVia(plugin, managedNames, seedDirs) {
  if (plugin.isBuiltin) return "default-enable";
  if (managedNames?.has(plugin.name)) return "org-policy";
  if (plugin.installationPreference === "required" || plugin.installationPreference === "auto_install")
    return "admin-install";
  if (seedDirs.some((dir) => plugin.path.startsWith(dir.endsWith(sep) ? dir : dir + sep)))
    return "seed-mount";
  return "user-install";
}
//@ chunk-csq9ftr9.js:10455-10797 fingerprint (2.1.88 match: buildPluginTelemetryFields, 0.53)
function buildPluginTelemetryFields(name, marketplace, managedNames = null) {
  let scope = getTelemetryPluginScope(name, marketplace, managedNames);
  let isAnthropicControlled =
    isKnownPluginSource(scope) ||
    isKnownOfficialPluginName(name, marketplace) ||
    isOfficialGatePlugin(name, marketplace);
  let lastSkillName = marketplace === BUILTIN ? lastSkillNameForPlugin(name) : undefined;
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
    ...(lastSkillName !== undefined && {
      plugin_name_previous: fromSanitizer_SANITIZER_OUTPUT_ONLY(lastSkillName),
      plugin_id_hash_previous: pluginIdHash(lastSkillName, marketplace),
    }),
  };
}
//@ chunk-csq9ftr9.js:10797-10914 layout
/**
 * 插件事件字段：_PROTO_plugin_name、_PROTO_marketplace_name（特权列）与可公开的插件归属字段。
 */
function buildPluginEventFields(name, marketplace, managedNames = null) {
  let marketplaceName = lookupCommandId(name, marketplace) ?? marketplace;
  return {
    _PROTO_plugin_name: name,
    ...(marketplaceName && {
      _PROTO_marketplace_name: marketplaceName,
    }),
    ...buildPluginTelemetryFields(name, marketplace, managedNames),
  };
}
//@ chunk-csq9ftr9.js:10914-10971 layout
function sanitizePluginIdForAnalytics(serverPluginId) {
  if (serverPluginId === undefined || !isServerPluginId(serverPluginId)) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(serverPluginId);
}
//@ chunk-csq9ftr9.js:10971-11027 layout
function sanitizeSkillIdForAnalytics(skillId) {
  if (skillId === undefined || !isValidSkillId(skillId)) return;
  return fromSanitizer_SANITIZER_OUTPUT_ONLY(skillId);
}
//@ chunk-csq9ftr9.js:11027-11051 layout
var GIT_SHA_PATTERN = /^[0-9a-f]{40}$/;
//@ chunk-csq9ftr9.js:11051-11151 layout
function getPluginVersionSha(versionSha, marketplace) {
  if (versionSha === undefined || !isOfficialOrCommunityMarketplace(marketplace)) return;
  let lower = versionSha.toLowerCase();
  return GIT_SHA_PATTERN.test(lower) ? fromSanitizer_SANITIZER_OUTPUT_ONLY(lower) : undefined;
}
//@ chunk-csq9ftr9.js:11151-11243 layout
function buildPluginVersionShaField(pluginId, versionSha) {
  let pluginVersionSha = getPluginVersionSha(versionSha, parsePluginIdentifier_2(pluginId).marketplace);
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
function logPluginFolderShadowed(name, marketplace, component) {
  logEvent("tengu_plugin_folder_shadowed", {
    component: fromEnum(component),
    ...buildPluginEventFields(name, marketplace),
  });
}
//@ chunk-csq9ftr9.js:11399-11578 layout
function logPluginRenamed(pluginName, marketplace, pluginRename) {
  logEvent("tengu_plugin_renamed", {
    outcome: fromEnum(pluginRename.kind),
    chain_depth: pluginRename.kind === "unresolved" ? undefined : pluginRename.chainDepth,
    reason: pluginRename.kind === "unresolved" ? fromEnum(pluginRename.reason) : undefined,
    ...buildPluginEventFields(pluginName, marketplace),
  });
}
//@ chunk-csq9ftr9.js:11578-11923 layout
function groupPluginSourcesByName(itemType, items, options) {
  let sourcesByName = new Map();
  for (let { name, source } of items) {
    let sources = sourcesByName.get(name);
    if (sources === undefined) sourcesByName.set(name, [source]);
    else sources.push(source);
  }
  for (let [name_2, sourceList] of sourcesByName) {
    let uniqueSources = uniq(sourceList);
    if (uniqueSources.length < 2) continue;
    logEvent("tengu_plugin_name_collision", {
      item_type: fromEnum(itemType),
      _PROTO_skill_name: name_2,
      item_name_hash: pluginIdHash(name_2),
      source_count: uniqueSources.length,
      sources: fromEnumArr(uniqueSources),
      ...(options.resolves && {
        winner_source: fromEnumOpt(sourceList.at(-1)),
      }),
    });
  }
}
//@ chunk-csq9ftr9.js:11923-11994 layout
function buildPluginEventFieldsFromId(pluginInfo, managedNames = null) {
  let { name: pluginName, marketplace } = parsePluginIdentifier_2(pluginInfo);
  return buildPluginEventFields(pluginName, marketplace, managedNames);
}
//@ chunk-csq9ftr9.js:11994-12151 layout
function buildPluginInfoFields(pluginInfo, managedNames = policyEnabledPluginNameSet()) {
  let { marketplace } = parsePluginIdentifier_2(pluginInfo.repository);
  let serverPluginId = sanitizePluginIdForAnalytics(pluginInfo.serverPluginId);
  return {
    ...buildPluginEventFields(pluginInfo.pluginManifest.name, marketplace, managedNames),
    ...(serverPluginId !== undefined && {
      server_plugin_id: serverPluginId,
    }),
  };
}
//@ chunk-csq9ftr9.js:12151-12351 layout
function buildServerAttributionFields(part, managedNames) {
  let skillId = sanitizeSkillIdForAnalytics(part.serverAttribution?.skillId);
  let serverPluginId = sanitizePluginIdForAnalytics(part.serverAttribution?.pluginId);
  return {
    ...(part.pluginInfo && buildPluginInfoFields(part.pluginInfo, managedNames)),
    ...(skillId !== undefined && {
      skill_id: skillId,
    }),
    ...(serverPluginId !== undefined && {
      server_plugin_id: serverPluginId,
    }),
  };
}
//@ chunk-csq9ftr9.js:12351-12476 fingerprint (2.1.88 match: buildPluginCommandTelemetryFields, 0.754)
function buildPluginCommandTelemetryFields(pluginInfo, managedNames) {
  for (let pluginInfo_2 of pluginInfo)
    try {
      let { marketplace } = parsePluginIdentifier_2(pluginInfo_2.repository);
      if (isAnthropicPluginSource(getTelemetryPluginScope(pluginInfo_2.name, marketplace, managedNames)))
        registerFirstPartyPlugin(pluginInfo_2.name, marketplace);
    } catch (error) {
      logError(error);
    }
}
//@ chunk-csq9ftr9.js:12476-12528 layout
function isOfficialPluginRepo(repository) {
  let marketplaceName = marketplaceSuffix(repository);
  return marketplaceName === undefined || isOfficialMarketplace(marketplaceName);
}
//@ chunk-csq9ftr9.js:12528-12585 layout
function isBuiltinOrOfficialPlugin(plugin) {
  return plugin.isBuiltin === true || isOfficialPluginRepo(plugin.repository);
}
//@ chunk-csq9ftr9.js:12585-12704 layout (2.1.88 match: getCommandId, 0.912)
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
  let commandsByRepository = new Map();
  for (let command of commands) {
    if (!getCommandId(command)) continue;
    let commandNames = commandsByRepository.get(command.pluginInfo.repository);
    if (commandNames) commandNames.push(command.name);
    else commandsByRepository.set(command.pluginInfo.repository, [command.name]);
  }
  return commandsByRepository;
}
//@ chunk-csq9ftr9.js:12881-13052 layout
function buildPluginErrorFields(commandsByRepository, repository) {
  if (commandsByRepository === null) return {};
  let commandNames = commandsByRepository.get(repository) ?? [];
  return {
    skill_name_hash_count: commandNames.length,
    ...(commandNames.length > 0 && {
      skill_name_hashes: fromSanitizer_SANITIZER_OUTPUT_ONLY(
        commandNames
          .map((commandName) => hashPluginId(commandName))
          .sort()
          .join(","),
      ),
    }),
  };
}
//@ chunk-csq9ftr9.js:13052-14747 fingerprint (2.1.88 match: logPluginsEnabledForSession, 0.483)
function logPluginsEnabledForSession(enabled, managedNames, seedDirs, storageV5, managedNameSet) {
  let numStartups = getGlobalConfig().numStartups;
  let now = Date.now();
  let unusedIds = [];
  let pluginIds = enabled
    .filter((plugin) => plugin.lspServers && Object.keys(plugin.lspServers).length > 0)
    .map((plugin_2) => plugin_2.repository);
  if (pluginIds.length > 0) applyLspUsageGrace(pluginIds, managedNameSet);
  for (let plugin of enabled) {
    let { marketplace } = parsePluginIdentifier_2(plugin.repository);
    let usageRecord = pluginUsageRecord(plugin.repository);
    if (!usageRecord) unusedIds.push(plugin.repository);
    let { sessionsSinceLastUse, daysSinceLastUse } = usageRecord
      ? disuseStats(usageRecord, numStartups, now)
      : {
          sessionsSinceLastUse: 0,
          daysSinceLastUse: 0,
        };
    let telemetryPluginScope = getTelemetryPluginScope(plugin.name, marketplace, managedNames);
    let enabledVia = getEnabledVia(plugin, managedNames, seedDirs);
    let skillPathCount = (plugin.skillsPath ? 1 : 0) + (plugin.skillsPaths?.length ?? 0);
    let commandPathCount = (plugin.commandsPath ? 1 : 0) + (plugin.commandsPaths?.length ?? 0);
    let agentPathCount = (plugin.agentsPath ? 1 : 0) + (plugin.agentsPaths?.length ?? 0);
    let serverPluginId = sanitizePluginIdForAnalytics(plugin.serverPluginId);
    let hasHooks = plugin.hooksConfig !== undefined || plugin.modulePath !== undefined;
    let mayLogName = mayLogPluginName(telemetryPluginScope);
    logOTelEvent("plugin_loaded", {
      ...pluginNameFields(plugin.name, marketplace, mayLogName),
      ...(mayLogName &&
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
      ...(serverPluginId !== undefined && {
        server_plugin_id: serverPluginId,
      }),
      enabled_via: fromEnum(enabledVia),
      ...(plugin.installationPreference !== undefined && {
        installation_preference: fromEnum(plugin.installationPreference),
      }),
      skill_path_count: skillPathCount,
      command_path_count: commandPathCount,
      agent_path_count: agentPathCount,
      ...buildPluginErrorFields(isBuiltinOrOfficialPlugin(plugin) ? null : storageV5, plugin.repository),
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
  if (unusedIds.length > 0) seedPluginUsage(unusedIds, managedNameSet);
}
//@ chunk-csq9ftr9.js:14747-14847 fingerprint (2.1.88 match: classifyPluginCommandError, 0.783)
var PLUGIN_COMMAND_ERROR_KINDS; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
var PLUGIN_COMMAND_ERROR_KIND_SET;
deferInit("chunk-csq9ftr9.js:14747", () => {
  PLUGIN_COMMAND_ERROR_KINDS = [
    "network",
    "not-found",
    "permission",
    "policy",
    "validation",
    "in-use",
    "unknown",
  ];
  PLUGIN_COMMAND_ERROR_KIND_SET = new Set(PLUGIN_COMMAND_ERROR_KINDS);
});
//@ chunk-csq9ftr9.js:14847-14900 layout
function isPluginCommandErrorKind(pluginCommandErrorCategory) {
  return (
    typeof pluginCommandErrorCategory === "string" &&
    PLUGIN_COMMAND_ERROR_KIND_SET.has(pluginCommandErrorCategory)
  );
}
//@ chunk-csq9ftr9.js:14900-15886 placement
function classifyPluginCommandError(error) {
  if (
    typeof error === "object" &&
    error !== null &&
    "pluginCommandErrorCategory" in error &&
    isPluginCommandErrorKind(error.pluginCommandErrorCategory)
  )
    return error.pluginCommandErrorCategory;
  let message = String(error?.message ?? error);
  let telemetryMessage = getTelemetryMessage(error);
  if (
    typeof telemetryMessage === "string" &&
    (COMMAND_SOURCE_ERRORS.has(telemetryMessage) ||
      telemetryMessage.startsWith(COMMAND_SOURCE_NETWORK_ERRORS))
  )
    return "policy";
  if (
    /ENOTFOUND|ECONNREFUSED|EAI_AGAIN|ETIMEDOUT|ECONNRESET|network|Could not resolve|Connection refused|timed out/i.test(
      message,
    )
  )
    return "network";
  if (/\b404\b|not found|does not exist|no such plugin/i.test(message)) return "not-found";
  if (/\b40[13]\b|EACCES|EPERM|permission denied|unauthorized/i.test(message)) return "permission";
  if (/blocked by your organization'?s policy|required by your organization/i.test(message)) return "policy";
  if (
    /(?:the command|it|nothing) was not run|nothing was run|command that installs it was not run|is ignored inside a Claude Code session|Command-sourced plugins are disabled|not supported on Windows yet/i.test(
      message,
    )
  )
    return "policy";
  if (/invalid|malformed|schema|validation|parse error/i.test(message)) return "validation";
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
function logPluginLoadFailed(errors, managedNames, options) {
  for (let error of errors) {
    let { name, marketplace } = parsePluginIdentifier_2(error.source);
    let pluginName = "plugin" in error && error.plugin ? error.plugin : name;
    logEvent("tengu_plugin_load_failed", {
      error_category: fromEnum(error.type),
      cache_only: options?.cacheOnly ?? false,
      ...("component" in error && {
        component: fromEnum(error.component),
      }),
      ...("errno" in error && {
        errno: sanitizeErrnoTokenForTelemetry(error.errno),
      }),
      ...{
        is_directory: isOfficialNameUsableHere(marketplace),
        removed_from_directory: "removedFromDirectory" in error && error.removedFromDirectory === true,
      },
      ...buildPluginEventFields(pluginName, marketplace, managedNames),
      ...(error.type === "marketplace-load-failed" &&
        error.untrustedReservedName === true && {
          plugin_name_redacted: lit(THIRD_PARTY),
          marketplace_name_redacted: redactedMarketplaceName(error.marketplace),
          plugin_scope: fromEnum("user-local"),
          is_official_plugin: false,
        }),
    });
  }
}
//@ chunk-d4eg9at2.js:34003-34142 fingerprint (2.1.88 match: logPluginLoadErrors, 0.546)
function logPluginLoadErrors(eventName, pluginId, scope) {
  let { name, marketplace } = parsePluginId(pluginId);
  logEvent(eventName, {
    _PROTO_plugin_name: name,
    ...(marketplace && {
      _PROTO_marketplace_name: marketplace,
    }),
    ...(scope !== undefined && {
      scope,
    }),
  });
}
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
