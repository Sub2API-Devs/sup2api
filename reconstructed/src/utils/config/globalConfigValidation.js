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
import { BI1, AI, TI, CI } from "../plugins/pluginDirectories.js";
import { createSignal } from "../signal.js";
import { createKeyedQueue } from "../promiseQueue.js";
import { HostScoped } from "../hostScoped.js";
import { getSettingsFieldSchema } from "../settings/types.js";
import { onProcessRootHost } from "../../bootstrap/state.js";
import { logForDebugging } from "../debug.js";

/**
 * 是否为 {data, at:number} 形状的值（名字配错，见 lead 建议）。
 */
//@ chunk-aepeg2w5.js:64835-64934 placement = pluginDataDirPath (1)
function isTimestampedValue(pluginId) {
  return (
    typeof pluginId === "object" &&
    pluginId !== null &&
    "data" in pluginId &&
    "at" in pluginId &&
    typeof pluginId.at === "number"
  );
}
/**
 * 在带时间戳的记录集中写入一项，并保留同前缀的最近若干项（按时间倒序，总数有上限）。
 */
//@ chunk-aepeg2w5.js:64934-65148 placement
function withTimestampedEntry(e, n, r) {
  let s =
    typeof e === "object" && e !== null
      ? Object.entries(e)
          .filter((h) => h[0] !== n && h[0].startsWith(BI1) && isTimestampedValue(h[1]))
          .sort(([, h], [, y]) => y.at - h.at)
          .slice(0, AI - 1)
      : [];
  return Object.fromEntries([[n, r], ...s]);
}
//@ chunk-aepeg2w5.js:65148-65192 placement
function kh(e, n) {
  return readTimestampedEntry(e, n)?.data ?? null;
}
/**
 * 读取带时间戳记录集中的一项数据（不是时间戳值时返回 null）。
 */
//@ chunk-aepeg2w5.js:65192-65304 placement
function readTimestampedEntry(e, n) {
  if (typeof e !== "object" || e === null) return null;
  let r = e[n];
  return isTimestampedValue(r) ? { data: r.data ?? null } : null;
}
/**
 * 在缓存记录中找到与入口、模型、组织匹配且未过期的一条。
 */
//@ chunk-aepeg2w5.js:65304-65626 placement
function findMatchingUsageSnapshot(e, n) {
  if (typeof e !== "object" || e === null) return null;
  let now = Date.now(),
    s = now - TI,
    h = now + CI,
    y = null;
  for (let S of Object.values(e)) {
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
  return y === null ? null : { data: y.data ?? null };
}
/**
 * 全局配置（~/.claude.json）存储：缓存、mtime、读取许可、经存储后端重载、写入。
 */
//@ chunk-aepeg2w5.js:65626-71013 placement
class GlobalConfigStore {
  cache = { config: null, mtime: 0 };
  lastReadFileStats = null;
  installed = createSignal();
  cacheHits = 0;
  cacheMisses = 0;
  readingAllowed = !1;
  enableError = null;
  enableSettled = !1;
  enablePromise = null;
  reloadThroughStorageOwed = !1;
  reloadThroughStoragePromise = null;
  writeQueues = createKeyedQueue();
  pendingWrites = 0;
  pendingExternalRefresh = null;
  freshnessWatcherStarted = !1;
  freshnessEventWatch = void 0;
  freshnessBackend = void 0;
  freshnessSubscription = void 0;
  fileWatchFallback = !0;
  unhandedWritesInMemory = !1;
  loadedVersion = void 0;
  landedWriteCount = 0;
  freshnessResubscribed = !1;
  insideParseErrorTelemetry = !1;
  parseErrorLogged = !1;
  lastGetConfigOutcome = "parsed";
  trustAccepted = !1;
  localSettingsGitTracked = void 0;
  projectPathForConfig = null;
  generatedUserID = null;
  generatedMachineID = null;
  generatedSummonSidKey = null;
  remoteControlMachineIdOnce = null;
  gracefulExitStampedProjects = new Set();
  bootPhaseOpen = !0;
  bootAnchorMs;
  bootPhaseSignalForTesting = void 0;
  clientDataCacheKeyGetter = null;
  clientDataWindowSeed = null;
  clientDataReadGate = null;
  clientDataStrictReadGate = null;
  clientDataStaleMatchGetter = null;
  clientDataOverride = null;
  useRealPipelineUnderTest = !1;
  testGlobalConfig;
  testProjectConfig;
  now;
  constructor({ now: e, testGlobalConfig: n, testProjectConfig: r }) {
    ((this.now = e), (this.bootAnchorMs = e()), (this.testGlobalConfig = n), (this.testProjectConfig = r));
  }
  readCache() {
    if (this.cache.config) this.cacheHits++;
    else this.cacheMisses++;
    return this.cache.config;
  }
  installDiskRead(e, n) {
    ((this.cache = { config: e, mtime: n?.mtimeMs ?? this.now() }),
      (this.lastReadFileStats = n ? { mtime: n.mtimeMs, size: n.size } : null),
      this.installed.emit());
  }
  applyOptimistic(e) {
    this.cache = { config: e, mtime: this.now() };
  }
  writeThrough(e) {
    ((this.cache = { config: e, mtime: this.now() }),
      (this.lastReadFileStats = null),
      this.landedWriteCount++,
      this.installed.emit());
  }
  get writeGeneration() {
    return this.landedWriteCount;
  }
  advanceFreshnessCursor() {
    ((this.cache = { config: this.cache.config, mtime: this.now() }),
      (this.lastReadFileStats = null),
      this.landedWriteCount++);
  }
  clearCache() {
    this.cache = { config: null, mtime: 0 };
  }
  setLastReadFileStats(e) {
    this.lastReadFileStats = e;
  }
  takeCacheStats() {
    let e = { hits: this.cacheHits, misses: this.cacheMisses };
    return ((this.cacheHits = 0), (this.cacheMisses = 0), e);
  }
  allowReading() {
    this.readingAllowed = !0;
  }
  enable(e) {
    if (this.enableSettled) {
      if (this.enableError !== null) return Promise.reject(this.enableError);
      return Promise.resolve();
    }
    if (!this.enablePromise) this.enablePromise = e();
    return this.enablePromise;
  }
  recordEnableError(e) {
    this.enableError = e;
  }
  markEnableSettled() {
    this.enableSettled = !0;
  }
  oweReloadThroughStorage() {
    this.reloadThroughStorageOwed = !0;
  }
  reloadThroughStorageOnce(e) {
    if (this.reloadThroughStorageOwed)
      ((this.reloadThroughStorageOwed = !1), (this.reloadThroughStoragePromise = e()));
    return this.reloadThroughStoragePromise ?? Promise.resolve();
  }
  resetEnableGate() {
    ((this.readingAllowed = !1),
      (this.enableError = null),
      (this.enableSettled = !1),
      (this.enablePromise = null),
      (this.reloadThroughStorageOwed = !1),
      (this.reloadThroughStoragePromise = null),
      (this.fileWatchFallback = !0),
      (this.unhandedWritesInMemory = !1));
  }
  beginPendingWrite() {
    this.pendingWrites++;
  }
  endPendingWrite() {
    return ((this.pendingWrites = Math.max(0, this.pendingWrites - 1)), this.pendingWrites);
  }
  pendingWriteCount() {
    return this.pendingWrites;
  }
  deferExternalRefresh(e) {
    this.pendingExternalRefresh = e;
  }
  takePendingExternalRefresh() {
    let pendingExternalRefresh = this.pendingExternalRefresh;
    return ((this.pendingExternalRefresh = null), pendingExternalRefresh);
  }
  setFreshnessWatcherStarted(e) {
    this.freshnessWatcherStarted = e;
  }
  setFreshnessEventWatch(e) {
    this.freshnessEventWatch = e;
  }
  setFreshnessBackend(e) {
    ((this.freshnessBackend = e), (this.freshnessResubscribed = !1));
  }
  setFreshnessSubscription(e) {
    this.freshnessSubscription = e;
  }
  setFileWatchFallback(e) {
    this.fileWatchFallback = e;
  }
  setUnhandedWritesInMemory(e) {
    this.unhandedWritesInMemory = e;
  }
  setLoadedVersion(e) {
    this.loadedVersion = e;
  }
  claimFreshnessResubscribe() {
    if (this.freshnessResubscribed) return !1;
    return ((this.freshnessResubscribed = !0), !0);
  }
  setLastGetConfigOutcome(e) {
    this.lastGetConfigOutcome = e;
  }
  claimParseErrorLog() {
    let e = !this.parseErrorLogged;
    return ((this.parseErrorLogged = !0), e);
  }
  setInsideParseErrorTelemetry(e) {
    this.insideParseErrorTelemetry = e;
  }
  clearParseErrorDedup() {
    this.parseErrorLogged = !1;
  }
  closeBootPhase() {
    this.bootPhaseOpen = !1;
  }
  bootPhaseStillOpen(e) {
    if (!this.bootPhaseOpen) return !1;
    if (this.now() - this.bootAnchorMs >= e) return ((this.bootPhaseOpen = !1), !1);
    return !0;
  }
  setTrustAccepted(e) {
    this.trustAccepted = e;
  }
  setLocalSettingsGitTracked(e) {
    this.localSettingsGitTracked = e;
  }
  setProjectPathForConfig(e) {
    this.projectPathForConfig = e;
  }
  setGeneratedUserID(e) {
    this.generatedUserID = e;
  }
  setGeneratedMachineID(e) {
    this.generatedMachineID = e;
  }
  clearGeneratedMachineID() {
    this.generatedMachineID = null;
  }
  clearGeneratedSummonSidKey() {
    this.generatedSummonSidKey = null;
  }
  setGeneratedSummonSidKey(e) {
    this.generatedSummonSidKey = e;
  }
  remoteControlMachineIdOnceFrom(e) {
    return ((this.remoteControlMachineIdOnce ??= e()), this.remoteControlMachineIdOnce);
  }
  clearRemoteControlMachineIdOnce() {
    this.remoteControlMachineIdOnce = null;
  }
  setClientDataCacheKeyGetter(e) {
    this.clientDataCacheKeyGetter = e;
  }
  setClientDataWindowSeed(e) {
    this.clientDataWindowSeed = e;
  }
  setClientDataReadGate(e) {
    this.clientDataReadGate = e;
  }
  setClientDataStrictReadGate(e) {
    this.clientDataStrictReadGate = e;
  }
  setClientDataStaleMatchGetter(e) {
    this.clientDataStaleMatchGetter = e;
  }
  setClientDataOverride(e) {
    this.clientDataOverride = e;
  }
  setUseRealPipelineUnderTest(e) {
    this.useRealPipelineUnderTest = e;
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
var textDecoder = new TextDecoder("utf-8", { ignoreBOM: !0 });
//@ chunk-aepeg2w5.js:71060-71115 placement
var RI = ["remoteControlAtStartup", "autoUploadSessions"];
//@ chunk-aepeg2w5.js:71115-71153 placement
function gxn(e) {
  return RI.includes(e);
}
//@ chunk-aepeg2w5.js:71153-71179 placement
var xI = new HostScoped(() => new Set());
/**
 * 校验全局配置字段值，无效时记录忽略。
 */
//@ chunk-aepeg2w5.js:71179-71258 placement
function validateConfigValue(e, n) {
  if (n === void 0) return;
  let r = Ah(e, n);
  return (noteIgnoredGlobalConfigValue(e, r !== void 0), r);
}
//@ chunk-aepeg2w5.js:71258-71341 placement
function n9t(e, n) {
  if (n === void 0) return;
  let r = Ah(e, n);
  return (noteIgnoredGlobalConfigValue(e, r !== void 0), r ?? !1);
}
/**
 * 判断 ~/.claude.json 中某个设置的值对该设置是否无效。
 */
//@ chunk-aepeg2w5.js:71341-71462 placement
function isInvalidGlobalConfigValue(e, n) {
  if (n === void 0) return !1;
  let safeParse = getSettingsFieldSchema(e).safeParse(n);
  return !safeParse.success || (safeParse.data === void 0 && typeof n !== "string");
}
//@ chunk-aepeg2w5.js:71462-71543 placement
function Ah(e, n) {
  let safeParse = getSettingsFieldSchema(e).safeParse(n);
  return safeParse.success ? (safeParse.data ?? void 0) : void 0;
}
//@ chunk-aepeg2w5.js:71543-71810 placement
function noteIgnoredGlobalConfigValue(e, n) {
  let r = onProcessRootHost(xI);
  if (n) {
    r.delete(e);
    return;
  }
  if (r.has(e)) return;
  r.add(e);
  let s = gxn(e) ? "it counts as off" : "it counts as unset";
  logForDebugging(
    `Ignoring "${e}" in ~/.claude.json: its value is not valid for this setting, so ${s}. Set it with /config or in settings.json.`,
  );
}

export {
  GlobalConfigStore,
  n9t,
  textDecoder,
  isTimestampedValue,
  kh,
  readTimestampedEntry,
  findMatchingUsageSnapshot,
  withTimestampedEntry,
  validateConfigValue,
  isInvalidGlobalConfigValue,
  gxn,
};
