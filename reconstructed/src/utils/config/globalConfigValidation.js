/**
 * utils/config/globalConfigValidation.ts
 *
 * 2.1.316 新增：全局配置（~/.claude.json）存储：缓存、mtime、读取许可、经存储后端重载、写入；在缓存记录中找到与入口、模型、组织匹配且未过期的一条等。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-aepeg2w5.js (15)
 * attribution: placement 15
 */
import {
  BI_KEY_PREFIX,
  MAX_TIMESTAMPED_ENTRIES,
  USAGE_SNAPSHOT_FUTURE_SKEW_MS,
  USAGE_SNAPSHOT_LOOKAHEAD_MS,
} from "../plugins/pluginDirectories.js";
import { createSignal } from "../signal.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { HostScoped } from "../hostScoped.js";
import { getSettingsFieldSchema } from "../settings/types.js";
import { onProcessRootHost } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-aepeg2w5.js:64835-64934 placement = pluginDataDirPath (1)
/**
 * 是否为 {data, at:number} 形状的值（名字配错，见 lead 建议）。
 */
function isTimestampedValue(pluginId) {
  return (
    typeof pluginId === "object" &&
    pluginId !== null &&
    "data" in pluginId &&
    "at" in pluginId &&
    typeof pluginId.at === "number"
  );
}
//@ chunk-aepeg2w5.js:64934-65148 placement
/**
 * 在带时间戳的记录集中写入一项，并保留同前缀的最近若干项（按时间倒序，总数有上限）。
 */
function withTimestampedEntry(clientDataCacheSlots, cacheKey, entry) {
  let keptEntries =
    typeof clientDataCacheSlots === "object" && clientDataCacheSlots !== null
      ? Object.entries(clientDataCacheSlots)
          .filter(
            (entry) =>
              entry[0] !== cacheKey && entry[0].startsWith(BI_KEY_PREFIX) && isTimestampedValue(entry[1]),
          )
          .sort(([, leftEntry], [, rightEntry]) => rightEntry.at - leftEntry.at)
          .slice(0, MAX_TIMESTAMPED_ENTRIES - 1)
      : [];
  return Object.fromEntries([[cacheKey, entry], ...keptEntries]);
}
//@ chunk-aepeg2w5.js:65148-65192 placement
/**
 * 读取带时间戳记录里的 data（不是时间戳值时返回 null）。
 */
function readTimestampedData(clientDataCacheSlots, cacheKey) {
  return readTimestampedEntry(clientDataCacheSlots, cacheKey)?.data ?? null;
}
//@ chunk-aepeg2w5.js:65192-65304 placement
/**
 * 读取带时间戳记录集中的一项数据（不是时间戳值时返回 null）。
 */
function readTimestampedEntry(clientDataCacheSlots, cacheKey) {
  if (typeof clientDataCacheSlots !== "object" || clientDataCacheSlots === null) return null;
  let value = clientDataCacheSlots[cacheKey];
  return isTimestampedValue(value)
    ? {
        data: value.data ?? null,
      }
    : null;
}
//@ chunk-aepeg2w5.js:65304-65626 placement
/**
 * 在缓存记录中找到与入口、模型、组织匹配且未过期的一条。
 */
function findMatchingUsageSnapshot(clientDataCacheSlots, query) {
  if (typeof clientDataCacheSlots !== "object" || clientDataCacheSlots === null) return null;
  let now = Date.now();
  let earliestMs = now - USAGE_SNAPSHOT_FUTURE_SKEW_MS;
  let latestMs = now + USAGE_SNAPSHOT_LOOKAHEAD_MS;
  let bestMatch = null;
  for (let entry of Object.values(clientDataCacheSlots)) {
    if (
      !isTimestampedValue(entry) ||
      (entry.entrypoint ?? null) !== query.entrypoint ||
      entry.model !== query.model ||
      entry.org !== query.org
    )
      continue;
    if (!(entry.at >= earliestMs && entry.at <= latestMs)) continue;
    if (bestMatch === null || entry.at > bestMatch.at) bestMatch = entry;
  }
  return bestMatch === null
    ? null
    : {
        data: bestMatch.data ?? null,
      };
}
//@ chunk-aepeg2w5.js:65626-71013 placement
/**
 * 全局配置（~/.claude.json）存储：缓存、mtime、读取许可、经存储后端重载、写入。
 */
class GlobalConfigStore {
  cache = {
    config: null,
    mtime: 0,
  };
  lastReadFileStats = null;
  installed = createSignal();
  cacheHits = 0;
  cacheMisses = 0;
  readingAllowed = false;
  enableError = null;
  enableSettled = false;
  enablePromise = null;
  reloadThroughStorageOwed = false;
  reloadThroughStoragePromise = null;
  writeQueues = createKeyedQueue();
  pendingWrites = 0;
  pendingExternalRefresh = null;
  freshnessWatcherStarted = false;
  freshnessEventWatch = undefined;
  freshnessBackend = undefined;
  freshnessSubscription = undefined;
  fileWatchFallback = true;
  unhandedWritesInMemory = false;
  loadedVersion = undefined;
  landedWriteCount = 0;
  freshnessResubscribed = false;
  insideParseErrorTelemetry = false;
  parseErrorLogged = false;
  lastGetConfigOutcome = "parsed";
  trustAccepted = false;
  localSettingsGitTracked = undefined;
  projectPathForConfig = null;
  generatedUserID = null;
  generatedMachineID = null;
  generatedSummonSidKey = null;
  remoteControlMachineIdOnce = null;
  gracefulExitStampedProjects = new Set();
  bootPhaseOpen = true;
  bootAnchorMs;
  bootPhaseSignalForTesting = undefined;
  clientDataCacheKeyGetter = null;
  clientDataWindowSeed = null;
  clientDataReadGate = null;
  clientDataStrictReadGate = null;
  clientDataStaleMatchGetter = null;
  clientDataOverride = null;
  useRealPipelineUnderTest = false;
  testGlobalConfig;
  testProjectConfig;
  now;
  constructor({ now, testGlobalConfig, testProjectConfig }) {
    this.now = now;
    this.bootAnchorMs = now();
    this.testGlobalConfig = testGlobalConfig;
    this.testProjectConfig = testProjectConfig;
  }
  readCache() {
    if (this.cache.config) this.cacheHits++;
    else this.cacheMisses++;
    return this.cache.config;
  }
  installDiskRead(config, stats) {
    this.cache = {
      config,
      mtime: stats?.mtimeMs ?? this.now(),
    };
    this.lastReadFileStats = stats
      ? {
          mtime: stats.mtimeMs,
          size: stats.size,
        }
      : null;
    this.installed.emit();
  }
  applyOptimistic(config) {
    this.cache = {
      config,
      mtime: this.now(),
    };
  }
  writeThrough(config) {
    this.cache = {
      config,
      mtime: this.now(),
    };
    this.lastReadFileStats = null;
    this.landedWriteCount++;
    this.installed.emit();
  }
  get writeGeneration() {
    return this.landedWriteCount;
  }
  advanceFreshnessCursor() {
    this.cache = {
      config: this.cache.config,
      mtime: this.now(),
    };
    this.lastReadFileStats = null;
    this.landedWriteCount++;
  }
  clearCache() {
    this.cache = {
      config: null,
      mtime: 0,
    };
  }
  setLastReadFileStats(lastReadFileStats) {
    this.lastReadFileStats = lastReadFileStats;
  }
  takeCacheStats() {
    let counters = {
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
    this.cacheHits = 0;
    this.cacheMisses = 0;
    return counters;
  }
  allowReading() {
    this.readingAllowed = true;
  }
  enable(enableFn) {
    if (this.enableSettled) {
      if (this.enableError !== null) return Promise.reject(this.enableError);
      return Promise.resolve();
    }
    if (!this.enablePromise) this.enablePromise = enableFn();
    return this.enablePromise;
  }
  recordEnableError(enableError) {
    this.enableError = enableError;
  }
  markEnableSettled() {
    this.enableSettled = true;
  }
  oweReloadThroughStorage() {
    this.reloadThroughStorageOwed = true;
  }
  reloadThroughStorageOnce(reloadFn) {
    if (this.reloadThroughStorageOwed) {
      this.reloadThroughStorageOwed = false;
      this.reloadThroughStoragePromise = reloadFn();
    }
    return this.reloadThroughStoragePromise ?? Promise.resolve();
  }
  resetEnableGate() {
    this.readingAllowed = false;
    this.enableError = null;
    this.enableSettled = false;
    this.enablePromise = null;
    this.reloadThroughStorageOwed = false;
    this.reloadThroughStoragePromise = null;
    this.fileWatchFallback = true;
    this.unhandedWritesInMemory = false;
  }
  beginPendingWrite() {
    this.pendingWrites++;
  }
  endPendingWrite() {
    this.pendingWrites = Math.max(0, this.pendingWrites - 1);
    return this.pendingWrites;
  }
  pendingWriteCount() {
    return this.pendingWrites;
  }
  deferExternalRefresh(pendingExternalRefresh) {
    this.pendingExternalRefresh = pendingExternalRefresh;
  }
  takePendingExternalRefresh() {
    let pendingExternalRefresh = this.pendingExternalRefresh;
    this.pendingExternalRefresh = null;
    return pendingExternalRefresh;
  }
  setFreshnessWatcherStarted(freshnessWatcherStarted) {
    this.freshnessWatcherStarted = freshnessWatcherStarted;
  }
  setFreshnessEventWatch(freshnessEventWatch) {
    this.freshnessEventWatch = freshnessEventWatch;
  }
  setFreshnessBackend(freshnessBackend) {
    this.freshnessBackend = freshnessBackend;
    this.freshnessResubscribed = false;
  }
  setFreshnessSubscription(freshnessSubscription) {
    this.freshnessSubscription = freshnessSubscription;
  }
  setFileWatchFallback(fileWatchFallback) {
    this.fileWatchFallback = fileWatchFallback;
  }
  setUnhandedWritesInMemory(unhandedWritesInMemory) {
    this.unhandedWritesInMemory = unhandedWritesInMemory;
  }
  setLoadedVersion(loadedVersion) {
    this.loadedVersion = loadedVersion;
  }
  claimFreshnessResubscribe() {
    if (this.freshnessResubscribed) return false;
    this.freshnessResubscribed = true;
    return true;
  }
  setLastGetConfigOutcome(lastGetConfigOutcome) {
    this.lastGetConfigOutcome = lastGetConfigOutcome;
  }
  claimParseErrorLog() {
    let wasFirst = !this.parseErrorLogged;
    this.parseErrorLogged = true;
    return wasFirst;
  }
  setInsideParseErrorTelemetry(insideParseErrorTelemetry) {
    this.insideParseErrorTelemetry = insideParseErrorTelemetry;
  }
  clearParseErrorDedup() {
    this.parseErrorLogged = false;
  }
  closeBootPhase() {
    this.bootPhaseOpen = false;
  }
  bootPhaseStillOpen(windowMs) {
    if (!this.bootPhaseOpen) return false;
    if (this.now() - this.bootAnchorMs >= windowMs) {
      this.bootPhaseOpen = false;
      return false;
    }
    return true;
  }
  setTrustAccepted(trustAccepted) {
    this.trustAccepted = trustAccepted;
  }
  setLocalSettingsGitTracked(localSettingsGitTracked) {
    this.localSettingsGitTracked = localSettingsGitTracked;
  }
  setProjectPathForConfig(projectPathForConfig) {
    this.projectPathForConfig = projectPathForConfig;
  }
  setGeneratedUserID(generatedUserID) {
    this.generatedUserID = generatedUserID;
  }
  setGeneratedMachineID(generatedMachineID) {
    this.generatedMachineID = generatedMachineID;
  }
  clearGeneratedMachineID() {
    this.generatedMachineID = null;
  }
  clearGeneratedSummonSidKey() {
    this.generatedSummonSidKey = null;
  }
  setGeneratedSummonSidKey(generatedSummonSidKey) {
    this.generatedSummonSidKey = generatedSummonSidKey;
  }
  remoteControlMachineIdOnceFrom(computeId) {
    this.remoteControlMachineIdOnce ??= computeId();
    return this.remoteControlMachineIdOnce;
  }
  clearRemoteControlMachineIdOnce() {
    this.remoteControlMachineIdOnce = null;
  }
  setClientDataCacheKeyGetter(clientDataCacheKeyGetter) {
    this.clientDataCacheKeyGetter = clientDataCacheKeyGetter;
  }
  setClientDataWindowSeed(clientDataWindowSeed) {
    this.clientDataWindowSeed = clientDataWindowSeed;
  }
  setClientDataReadGate(clientDataReadGate) {
    this.clientDataReadGate = clientDataReadGate;
  }
  setClientDataStrictReadGate(clientDataStrictReadGate) {
    this.clientDataStrictReadGate = clientDataStrictReadGate;
  }
  setClientDataStaleMatchGetter(clientDataStaleMatchGetter) {
    this.clientDataStaleMatchGetter = clientDataStaleMatchGetter;
  }
  setClientDataOverride(clientDataOverride) {
    this.clientDataOverride = clientDataOverride;
  }
  setUseRealPipelineUnderTest(useRealPipelineUnderTest) {
    this.useRealPipelineUnderTest = useRealPipelineUnderTest;
  }
  overwriteTestGlobalConfig(patch) {
    Object.assign(this.testGlobalConfig, patch);
  }
  overwriteTestProjectConfig(patch) {
    Object.assign(this.testProjectConfig, patch);
  }
  deleteTestProjectConfigFields(fields) {
    for (let field of fields) delete this.testProjectConfig[field];
  }
}
//@ chunk-aepeg2w5.js:71013-71060 placement
var textDecoder; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:71013", () => {
  textDecoder = new TextDecoder("utf-8", {
    ignoreBOM: true,
  });
});
//@ chunk-aepeg2w5.js:71060-71115 placement
/**
 * 与自动上传相关的开关键（remoteControlAtStartup、autoUploadSessions）。
 */
var AUTO_UPLOAD_FLAG_KEYS = ["remoteControlAtStartup", "autoUploadSessions"];
//@ chunk-aepeg2w5.js:71115-71153 placement
/**
 * 判断键是否为自动上传相关开关。
 */
function isAutoUploadFlagKey(key) {
  return AUTO_UPLOAD_FLAG_KEYS.includes(key);
}
//@ chunk-aepeg2w5.js:71153-71179 placement
/**
 * 已记录过“忽略无效配置值”的键集合。
 */
var ignoredConfigKeysLogged; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-aepeg2w5.js:71153", () => {
  ignoredConfigKeysLogged = new HostScoped(() => new Set());
});
//@ chunk-aepeg2w5.js:71179-71258 placement
/**
 * 校验全局配置字段值，无效时记录忽略。
 */
function validateConfigValue(key, value) {
  if (value === undefined) return;
  let configField = parseConfigField(key, value);
  noteIgnoredGlobalConfigValue(key, configField !== undefined);
  return configField;
}
//@ chunk-aepeg2w5.js:71258-71341 placement
/**
 * 判断配置值对该字段是否有效（无效时记录一次）。
 */
function isValidGlobalConfigValue(key, value) {
  if (value === undefined) return;
  let configField = parseConfigField(key, value);
  noteIgnoredGlobalConfigValue(key, configField !== undefined);
  return configField ?? false;
}
//@ chunk-aepeg2w5.js:71341-71462 placement
/**
 * 判断 ~/.claude.json 中某个设置的值对该设置是否无效。
 */
function isInvalidGlobalConfigValue(key, value) {
  if (value === undefined) return false;
  let parseResult = getSettingsFieldSchema(key).safeParse(value);
  return !parseResult.success || (parseResult.data === undefined && typeof value !== "string");
}
//@ chunk-aepeg2w5.js:71462-71543 placement
/**
 * 用对应的设置字段 schema 解析配置值。
 */
function parseConfigField(key, value) {
  let parseResult = getSettingsFieldSchema(key).safeParse(value);
  return parseResult.success ? (parseResult.data ?? undefined) : undefined;
}
//@ chunk-aepeg2w5.js:71543-71810 placement
function noteIgnoredGlobalConfigValue(key, value) {
  let seenKeys = onProcessRootHost(ignoredConfigKeysLogged);
  if (value) {
    seenKeys.delete(key);
    return;
  }
  if (seenKeys.has(key)) return;
  seenKeys.add(key);
  let effect = isAutoUploadFlagKey(key) ? "it counts as off" : "it counts as unset";
  logForDebugging(
    `Ignoring "${key}" in ~/.claude.json: its value is not valid for this setting, so ${effect}. Set it with /config or in settings.json.`,
  );
}
export {
  GlobalConfigStore,
  isValidGlobalConfigValue,
  textDecoder,
  isTimestampedValue,
  readTimestampedData,
  readTimestampedEntry,
  findMatchingUsageSnapshot,
  withTimestampedEntry,
  validateConfigValue,
  isInvalidGlobalConfigValue,
  isAutoUploadFlagKey,
};
