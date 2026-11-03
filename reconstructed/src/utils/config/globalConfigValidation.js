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
  BI_KEY_UNAVAILABLE,
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
function withTimestampedEntry(clientDataCacheSlots, n, r) {
  let s =
    typeof clientDataCacheSlots === "object" && clientDataCacheSlots !== null
      ? Object.entries(clientDataCacheSlots)
          .filter((h) => h[0] !== n && h[0].startsWith(BI_KEY_UNAVAILABLE) && isTimestampedValue(h[1]))
          .sort(([, h], [, y]) => y.at - h.at)
          .slice(0, MAX_TIMESTAMPED_ENTRIES - 1)
      : [];
  return Object.fromEntries([[n, r], ...s]);
}
//@ chunk-aepeg2w5.js:65148-65192 placement
/**
 * 读取带时间戳记录里的 data（不是时间戳值时返回 null）。
 */
function readTimestampedData(clientDataCacheSlots, n) {
  return readTimestampedEntry(clientDataCacheSlots, n)?.data ?? null;
}
//@ chunk-aepeg2w5.js:65192-65304 placement
/**
 * 读取带时间戳记录集中的一项数据（不是时间戳值时返回 null）。
 */
function readTimestampedEntry(clientDataCacheSlots, n) {
  if (typeof clientDataCacheSlots !== "object" || clientDataCacheSlots === null) return null;
  let r = clientDataCacheSlots[n];
  return isTimestampedValue(r)
    ? {
        data: r.data ?? null,
      }
    : null;
}
//@ chunk-aepeg2w5.js:65304-65626 placement
/**
 * 在缓存记录中找到与入口、模型、组织匹配且未过期的一条。
 */
function findMatchingUsageSnapshot(clientDataCacheSlots, n) {
  if (typeof clientDataCacheSlots !== "object" || clientDataCacheSlots === null) return null;
  let now = Date.now();
  let s = now - USAGE_SNAPSHOT_FUTURE_SKEW_MS;
  let h = now + USAGE_SNAPSHOT_LOOKAHEAD_MS;
  let y = null;
  for (let S of Object.values(clientDataCacheSlots)) {
    if (
      !isTimestampedValue(S) ||
      (S.entrypoint ?? null) !== n.entrypoint ||
      S.model !== n.model ||
      S.org !== n.org
    )
      continue;
    if (!(S.at >= s && S.at <= h)) continue;
    if (y === null || S.at > y.at) y = S;
  }
  return y === null
    ? null
    : {
        data: y.data ?? null,
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
  installDiskRead(config, n) {
    this.cache = {
      config,
      mtime: n?.mtimeMs ?? this.now(),
    };
    this.lastReadFileStats = n
      ? {
          mtime: n.mtimeMs,
          size: n.size,
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
    let e = {
      hits: this.cacheHits,
      misses: this.cacheMisses,
    };
    this.cacheHits = 0;
    this.cacheMisses = 0;
    return e;
  }
  allowReading() {
    this.readingAllowed = true;
  }
  enable(e) {
    if (this.enableSettled) {
      if (this.enableError !== null) return Promise.reject(this.enableError);
      return Promise.resolve();
    }
    if (!this.enablePromise) this.enablePromise = e();
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
  reloadThroughStorageOnce(e) {
    if (this.reloadThroughStorageOwed) {
      this.reloadThroughStorageOwed = false;
      this.reloadThroughStoragePromise = e();
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
    let e = !this.parseErrorLogged;
    this.parseErrorLogged = true;
    return e;
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
  bootPhaseStillOpen(e) {
    if (!this.bootPhaseOpen) return false;
    if (this.now() - this.bootAnchorMs >= e) {
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
  remoteControlMachineIdOnceFrom(e) {
    this.remoteControlMachineIdOnce ??= e();
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
  overwriteTestGlobalConfig(e) {
    Object.assign(this.testGlobalConfig, e);
  }
  overwriteTestProjectConfig(e) {
    Object.assign(this.testProjectConfig, e);
  }
  deleteTestProjectConfigFields(e) {
    for (let n of e) delete this.testProjectConfig[n];
  }
}
//@ chunk-aepeg2w5.js:71013-71060 placement
var textDecoder = new TextDecoder("utf-8", {
  ignoreBOM: true,
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
function isAutoUploadFlagKey(e) {
  return AUTO_UPLOAD_FLAG_KEYS.includes(e);
}
//@ chunk-aepeg2w5.js:71153-71179 placement
/**
 * 已记录过“忽略无效配置值”的键集合。
 */
var ignoredConfigKeysLogged = new HostScoped(() => new Set());
//@ chunk-aepeg2w5.js:71179-71258 placement
/**
 * 校验全局配置字段值，无效时记录忽略。
 */
function validateConfigValue(e, n) {
  if (n === undefined) return;
  let configField = parseConfigField(e, n);
  noteIgnoredGlobalConfigValue(e, configField !== undefined);
  return configField;
}
//@ chunk-aepeg2w5.js:71258-71341 placement
/**
 * 判断配置值对该字段是否有效（无效时记录一次）。
 */
function isValidGlobalConfigValue(e, n) {
  if (n === undefined) return;
  let configField = parseConfigField(e, n);
  noteIgnoredGlobalConfigValue(e, configField !== undefined);
  return configField ?? false;
}
//@ chunk-aepeg2w5.js:71341-71462 placement
/**
 * 判断 ~/.claude.json 中某个设置的值对该设置是否无效。
 */
function isInvalidGlobalConfigValue(e, n) {
  if (n === undefined) return false;
  let r = getSettingsFieldSchema(e).safeParse(n);
  return !r.success || (r.data === undefined && typeof n !== "string");
}
//@ chunk-aepeg2w5.js:71462-71543 placement
/**
 * 用对应的设置字段 schema 解析配置值。
 */
function parseConfigField(e, n) {
  let r = getSettingsFieldSchema(e).safeParse(n);
  return r.success ? (r.data ?? undefined) : undefined;
}
//@ chunk-aepeg2w5.js:71543-71810 placement
function noteIgnoredGlobalConfigValue(e, n) {
  let r = onProcessRootHost(ignoredConfigKeysLogged);
  if (n) {
    r.delete(e);
    return;
  }
  if (r.has(e)) return;
  r.add(e);
  let s = isAutoUploadFlagKey(e) ? "it counts as off" : "it counts as unset";
  logForDebugging(
    `Ignoring "${e}" in ~/.claude.json: its value is not valid for this setting, so ${s}. Set it with /config or in settings.json.`,
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
