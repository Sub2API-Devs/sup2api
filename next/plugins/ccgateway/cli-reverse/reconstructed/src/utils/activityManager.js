/**
 * utils/activityManager.ts
 *
 * 用户与 CLI 活动时间记录（recordUserActivity/startCLIActivity/endCLIActivity），供活跃时长统计
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/activityManager.ts
 * pieces: chunk-q1n8g25m.js (13)
 * attribution: placement 8, fingerprint 1, layout 3, callgraph-witnessed 1
 */
import { join } from "path";
import { getClaudeConfigDir } from "./markdownConfigLoader.js";
import { STORAGE_SPACES } from "./storage/storageSpaces.js";
import { isStorageV5Enabled } from "./hoverRest.js";
import { logForDebugging } from "./debug.js";
import { formatStorageError } from "./storage/storageErrors.js";
import { getFileReader } from "./fileStore.js";
import { isENOENT, errorMessage } from "./errors.js";
import { jsonParse, jsonStringify } from "./slowOperations.js";
import { resolveSetting } from "./settings/userIntentSettings.js";
import { HostScoped } from "./hostScoped.js";
import { getActiveTimeCounter, getRootSession } from "../bootstrap/state.js";
import { deferInit } from "../../runtime/deferred-init.js";

//@ chunk-q1n8g25m.js:618-643 placement
var ACTIVE_TIME_JSON = "active-time.json";
//@ chunk-q1n8g25m.js:643-666 placement
/**
 * 活跃时长统计的时间窗口回溯（1 年）。
 */
var ACTIVITY_WINDOW_LOOKBACK_MS = 31536000000;
var DEFAULT_BREAK_THRESHOLD_MINUTES = 10;
//@ chunk-q1n8g25m.js:666-708 placement
/**
 * 空账本（版本 1、无时间窗口）。
 */
function emptyLedger() {
  return {
    version: 1,
    windows: [],
  };
}
//@ chunk-q1n8g25m.js:708-738 placement
/**
 * 活跃时长账本文件路径。
 */
function activeTimeFilePath() {
  return join(getClaudeConfigDir(), ACTIVE_TIME_JSON);
}
//@ chunk-q1n8g25m.js:738-789 placement
/**
 * 活跃时长账本在 v5 存储里的位置。
 */
function activeTimeLedgerStore() {
  return STORAGE_SPACES.state("active-time-ledger");
}
//@ chunk-q1n8g25m.js:789-1388 placement
/**
 * 读取活跃时长账本（v5 存储或本地文件），只保留结构正确的时间窗口；不存在或格式不对时返回空账本，读取失败抛出。
 */
async function readActiveTimeLedger(storage) {
  let ledgerText;
  if (isStorageV5Enabled() && storage !== undefined) {
    let text = await storage.readText([activeTimeLedgerStore()]);
    if (!text.ok) {
      logForDebugging(`Failed to read active-time ledger: ${formatStorageError(text.error)}`);
      throw Error("active-time ledger read failed");
    }
    let readResult = text.value.items[0];
    if (!readResult.found) return emptyLedger();
    ledgerText = readResult.value;
  } else
    try {
      ledgerText = await getFileReader().read(activeTimeFilePath());
    } catch (error) {
      if (isENOENT(error)) return emptyLedger();
      logForDebugging(`Failed to read active-time ledger: ${errorMessage(error)}`);
      throw error;
    }
  try {
    let parsedLedger = jsonParse(ledgerText);
    if (parsedLedger.version !== 1 || !Array.isArray(parsedLedger.windows)) return emptyLedger();
    return {
      version: 1,
      windows: parsedLedger.windows.filter(
        (activeWindow) =>
          typeof activeWindow?.start === "number" &&
          typeof activeWindow?.end === "number" &&
          typeof activeWindow?.userSeconds === "number" &&
          activeWindow.end >= activeWindow.start,
      ),
    };
  } catch {
    return emptyLedger();
  }
}
//@ chunk-q1n8g25m.js:1388-3521 placement
class ActiveTimeLedger {
  pendingSeconds = 0;
  activeStretch = null;
  cachedBreakThresholdMs = DEFAULT_BREAK_THRESHOLD_MINUTES * 60000;
  flushTimer = null;
  cleanupHandle = null;
  flushInFlight = null;
  #t = undefined;
  noteUserActivity(seconds, nowMs) {
    if (seconds <= 0) return;
    if (
      this.activeStretch === null ||
      nowMs - this.activeStretch.lastActivityMs >= this.cachedBreakThresholdMs
    )
      this.activeStretch = {
        windowStartMs: nowMs - seconds * 1000,
        lastActivityMs: nowMs,
      };
    else this.activeStretch.lastActivityMs = nowMs;
    this.pendingSeconds += seconds;
    this.ensureFlushTimer();
  }
  getCurrentContinuousUse(nowMs) {
    if (this.activeStretch === null) return null;
    if (nowMs - this.activeStretch.lastActivityMs >= this.cachedBreakThresholdMs) return null;
    return {
      startMs: this.activeStretch.windowStartMs,
      durationMs: Math.max(0, nowMs - this.activeStretch.windowStartMs),
    };
  }
  armStorage(storage) {
    this.#t ??= storage;
  }
  flush(nowMs, storage) {
    if (this.flushInFlight) return this.flushInFlight;
    this.flushInFlight = this.doFlush(nowMs, storage).finally(() => {
      this.flushInFlight = null;
    });
    return this.flushInFlight;
  }
  async doFlush(nowMs, storage) {
    let breakReminderSetting = resolveSetting("breakReminder", {
      enabled: false,
    }).value;
    this.cachedBreakThresholdMs =
      (breakReminderSetting.breakThresholdMinutes ?? DEFAULT_BREAK_THRESHOLD_MINUTES) * 60000;
    if (this.pendingSeconds <= 0) return;
    let pendingSeconds = this.pendingSeconds;
    try {
      let activeTimeLedger = await readActiveTimeLedger(storage);
      let last = activeTimeLedger.windows.at(-1);
      if (last && nowMs - last.end < this.cachedBreakThresholdMs) {
        last.end = Math.max(last.end, nowMs);
        last.userSeconds = Math.min(last.userSeconds + pendingSeconds, (last.end - last.start) / 1000);
        if (this.activeStretch) this.activeStretch.windowStartMs = last.start;
      } else {
        let stretchStartMs = this.activeStretch?.windowStartMs ?? nowMs - pendingSeconds * 1000;
        let windowStartMs = last ? Math.max(stretchStartMs, last.end) : stretchStartMs;
        let max = Math.max(windowStartMs, nowMs);
        activeTimeLedger.windows.push({
          start: windowStartMs,
          end: max,
          userSeconds: Math.min(pendingSeconds, (max - windowStartMs) / 1000),
        });
        if (this.activeStretch) this.activeStretch.windowStartMs = windowStartMs;
      }
      let lookbackStartMs = nowMs - ACTIVITY_WINDOW_LOOKBACK_MS;
      activeTimeLedger.windows = activeTimeLedger.windows.filter(
        (activeWindow) => activeWindow.end >= lookbackStartMs,
      );
      if (isStorageV5Enabled() && storage !== undefined) {
        let writeResult = await storage.write(activeTimeLedgerStore(), jsonStringify(activeTimeLedger), {
          mode: 384,
        });
        if (!writeResult.ok) {
          logForDebugging(`Failed to flush active-time ledger: ${formatStorageError(writeResult.error)}`);
          return;
        }
      } else {
        let claudeConfigDir = getClaudeConfigDir();
        await getFileReader().mkdir(claudeConfigDir);
        await getFileReader().atomicWrite(activeTimeFilePath(), jsonStringify(activeTimeLedger), 384);
      }
      this.pendingSeconds -= pendingSeconds;
    } catch (error) {
      logForDebugging(`Failed to flush active-time ledger: ${errorMessage(error)}`);
    }
  }
  ensureFlushTimer() {
    if (this.flushTimer) return;
  }
  reset() {
    this.pendingSeconds = 0;
    this.activeStretch = null;
    this.cachedBreakThresholdMs = DEFAULT_BREAK_THRESHOLD_MINUTES * 60000;
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    this.cleanupHandle?.();
    this.cleanupHandle = null;
    this.flushInFlight = null;
    this.#t = undefined;
  }
}
//@ chunk-q1n8g25m.js:3521-3544 placement
/**
 * 按宿主隔离的活跃时长账本（当前无引用）。
 */
var activeTimeLedgerByHost; // deferred: uses ActiveTimeLedger of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q1n8g25m.js:3521", () => {
  activeTimeLedgerByHost = new HostScoped(() => new ActiveTimeLedger());
});
//@ chunk-q1n8g25m.js:3544-5067 fingerprint (2.1.88 match: ActivityManager, 0.98)
class ActivityManager {
  activeOperations = new Set();
  lastUserActivityTime = 0;
  lastCLIRecordedTime;
  isCLIActive = false;
  USER_ACTIVITY_TIMEOUT_MS = 5000;
  getNow;
  getActiveTimeCounter;
  constructor(options) {
    this.getNow = options?.getNow ?? (() => Date.now());
    this.getActiveTimeCounter = options?.getActiveTimeCounter ?? getActiveTimeCounter;
    this.lastCLIRecordedTime = this.getNow();
  }
  static getInstance() {
    let activityState = getActivityState();
    activityState.current ??= new ActivityManager();
    return activityState.current;
  }
  static resetInstance() {
    getActivityState().current = null;
  }
  static createInstance(options) {
    let instance = new ActivityManager(options);
    getActivityState().current = instance;
    return instance;
  }
  recordUserActivity() {
    if (!this.isCLIActive && this.lastUserActivityTime !== 0) {
      let elapsedSeconds = (this.getNow() - this.lastUserActivityTime) / 1000;
      if (elapsedSeconds > 0) {
        let timeoutSeconds = this.USER_ACTIVITY_TIMEOUT_MS / 1000;
        if (elapsedSeconds < timeoutSeconds) {
          let activeTimeCounter = this.getActiveTimeCounter();
          if (activeTimeCounter)
            activeTimeCounter.add(elapsedSeconds, {
              type: "user",
            });
        }
      }
    }
    this.lastUserActivityTime = this.getNow();
  }
  startCLIActivity(operationId) {
    if (this.activeOperations.has(operationId)) this.endCLIActivity(operationId);
    let wasEmpty = this.activeOperations.size === 0;
    this.activeOperations.add(operationId);
    if (wasEmpty) {
      this.isCLIActive = true;
      this.lastCLIRecordedTime = this.getNow();
    }
  }
  endCLIActivity(operationId) {
    this.activeOperations.delete(operationId);
    if (this.activeOperations.size === 0) {
      let now = this.getNow();
      let timeSinceLastRecord = (now - this.lastCLIRecordedTime) / 1000;
      if (timeSinceLastRecord > 0) {
        let activeTimeCounter = this.getActiveTimeCounter();
        if (activeTimeCounter)
          activeTimeCounter.add(timeSinceLastRecord, {
            type: "cli",
          });
      }
      this.lastCLIRecordedTime = now;
      this.isCLIActive = false;
    }
  }
  async trackOperation(operationId, fn) {
    this.startCLIActivity(operationId);
    try {
      return await fn();
    } finally {
      this.endCLIActivity(operationId);
    }
  }
  getActivityStates() {
    return {
      isUserActive: (this.getNow() - this.lastUserActivityTime) / 1000 < this.USER_ACTIVITY_TIMEOUT_MS / 1000,
      isCLIActive: this.isCLIActive,
      activeOperationCount: this.activeOperations.size,
    };
  }
}
//@ chunk-q1n8g25m.js:5067-5088 layout
class ActivityState {
  current = null;
}
//@ chunk-q1n8g25m.js:5088-5111 layout
/**
 * 按宿主隔离的活动状态。
 */
var activityStateByHost; // deferred: uses ActivityState of its import cycle while loading; runs once the cycle is complete
deferInit("chunk-q1n8g25m.js:5088", () => {
  activityStateByHost = new HostScoped(() => new ActivityState());
});
//@ chunk-q1n8g25m.js:5111-5146 layout
function getActivityState() {
  return activityStateByHost.of(getRootSession().host);
}
//@ chunk-q1n8g25m.js:5146-5327 callgraph-witnessed (2.1.88 match: activityManager, 0.357)
var activityManager = {
  recordUserActivity: () => ActivityManager.getInstance().recordUserActivity(),
  startCLIActivity: (operationId) => ActivityManager.getInstance().startCLIActivity(operationId),
  endCLIActivity: (operationId) => ActivityManager.getInstance().endCLIActivity(operationId),
};
export { activityManager };
