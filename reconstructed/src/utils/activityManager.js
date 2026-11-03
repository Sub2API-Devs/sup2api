/**
 * utils/activityManager.ts
 *
 * 用户与 CLI 活动时间记录（recordUserActivity/startCLIActivity/endCLIActivity），供活跃时长统计
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/activityManager.ts
 * pieces: chunk-3jjz3v21.js (13)
 * attribution: placement 8, fingerprint 1, layout 3, callgraph-witnessed 1
 */
import { join } from "path";
import { getClaudeConfigDir } from "./envUtils.js";
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

//@ chunk-3jjz3v21.js:618-643 placement
var ACTIVE_TIME_JSON = "active-time.json";
//@ chunk-3jjz3v21.js:643-666 placement
/**
 * 活跃时长统计的时间窗口回溯（1 年）。
 */
var ACTIVITY_WINDOW_LOOKBACK_MS = 31536000000;
var DEFAULT_BREAK_THRESHOLD_MINUTES = 10;
//@ chunk-3jjz3v21.js:666-708 placement
/**
 * 空账本（版本 1、无时间窗口）。
 */
function emptyLedger() {
  return {
    version: 1,
    windows: [],
  };
}
//@ chunk-3jjz3v21.js:708-738 placement
/**
 * 活跃时长账本文件路径。
 */
function activeTimeFilePath() {
  return join(getClaudeConfigDir(), ACTIVE_TIME_JSON);
}
//@ chunk-3jjz3v21.js:738-789 placement
/**
 * 活跃时长账本在 v5 存储里的位置。
 */
function activeTimeLedgerStore() {
  return STORAGE_SPACES.state("active-time-ledger");
}
//@ chunk-3jjz3v21.js:789-1388 placement
/**
 * 读取活跃时长账本（v5 存储或本地文件），只保留结构正确的时间窗口；不存在或格式不对时返回空账本，读取失败抛出。
 */
async function readActiveTimeLedger(e) {
  let i;
  if (isStorageV5Enabled() && e !== undefined) {
    let text = await e.readText([activeTimeLedgerStore()]);
    if (!text.ok) {
      logForDebugging(`Failed to read active-time ledger: ${formatStorageError(text.error)}`);
      throw Error("active-time ledger read failed");
    }
    let n = text.value.items[0];
    if (!n.found) return emptyLedger();
    i = n.value;
  } else
    try {
      i = await getFileReader().read(activeTimeFilePath());
    } catch (error) {
      if (isENOENT(error)) return emptyLedger();
      logForDebugging(`Failed to read active-time ledger: ${errorMessage(error)}`);
      throw error;
    }
  try {
    let r = jsonParse(i);
    if (r.version !== 1 || !Array.isArray(r.windows)) return emptyLedger();
    return {
      version: 1,
      windows: r.windows.filter(
        (s) =>
          typeof s?.start === "number" &&
          typeof s?.end === "number" &&
          typeof s?.userSeconds === "number" &&
          s.end >= s.start,
      ),
    };
  } catch {
    return emptyLedger();
  }
}
//@ chunk-3jjz3v21.js:1388-3521 placement
class ActiveTimeLedger {
  pendingSeconds = 0;
  activeStretch = null;
  cachedBreakThresholdMs = DEFAULT_BREAK_THRESHOLD_MINUTES * 60000;
  flushTimer = null;
  cleanupHandle = null;
  flushInFlight = null;
  #t = undefined;
  noteUserActivity(e, i) {
    if (e <= 0) return;
    if (this.activeStretch === null || i - this.activeStretch.lastActivityMs >= this.cachedBreakThresholdMs)
      this.activeStretch = {
        windowStartMs: i - e * 1000,
        lastActivityMs: i,
      };
    else this.activeStretch.lastActivityMs = i;
    this.pendingSeconds += e;
    this.ensureFlushTimer();
  }
  getCurrentContinuousUse(e) {
    if (this.activeStretch === null) return null;
    if (e - this.activeStretch.lastActivityMs >= this.cachedBreakThresholdMs) return null;
    return {
      startMs: this.activeStretch.windowStartMs,
      durationMs: Math.max(0, e - this.activeStretch.windowStartMs),
    };
  }
  armStorage(e) {
    this.#t ??= e;
  }
  flush(e, i) {
    if (this.flushInFlight) return this.flushInFlight;
    this.flushInFlight = this.doFlush(e, i).finally(() => {
      this.flushInFlight = null;
    });
    return this.flushInFlight;
  }
  async doFlush(e, i) {
    let r = resolveSetting("breakReminder", {
      enabled: false,
    }).value;
    this.cachedBreakThresholdMs = (r.breakThresholdMinutes ?? DEFAULT_BREAK_THRESHOLD_MINUTES) * 60000;
    if (this.pendingSeconds <= 0) return;
    let pendingSeconds = this.pendingSeconds;
    try {
      let activeTimeLedger = await readActiveTimeLedger(i);
      let last = activeTimeLedger.windows.at(-1);
      if (last && e - last.end < this.cachedBreakThresholdMs) {
        last.end = Math.max(last.end, e);
        last.userSeconds = Math.min(last.userSeconds + pendingSeconds, (last.end - last.start) / 1000);
        if (this.activeStretch) this.activeStretch.windowStartMs = last.start;
      } else {
        let a = this.activeStretch?.windowStartMs ?? e - pendingSeconds * 1000;
        let u = last ? Math.max(a, last.end) : a;
        let max = Math.max(u, e);
        activeTimeLedger.windows.push({
          start: u,
          end: max,
          userSeconds: Math.min(pendingSeconds, (max - u) / 1000),
        });
        if (this.activeStretch) this.activeStretch.windowStartMs = u;
      }
      let S = e - ACTIVITY_WINDOW_LOOKBACK_MS;
      activeTimeLedger.windows = activeTimeLedger.windows.filter((a) => a.end >= S);
      if (isStorageV5Enabled() && i !== undefined) {
        let a = await i.write(activeTimeLedgerStore(), jsonStringify(activeTimeLedger), {
          mode: 384,
        });
        if (!a.ok) {
          logForDebugging(`Failed to flush active-time ledger: ${formatStorageError(a.error)}`);
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
//@ chunk-3jjz3v21.js:3521-3544 placement
/**
 * 按宿主隔离的活跃时长账本（当前无引用）。
 */
var activeTimeLedgerByHost = new HostScoped(() => new ActiveTimeLedger());
//@ chunk-3jjz3v21.js:3544-5126 fingerprint = ActivityManager (0.953)
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
    let i = new ActivityManager(options);
    getActivityState().current = i;
    return i;
  }
  recordUserActivity() {
    if (!this.isCLIActive && this.lastUserActivityTime !== 0) {
      let i = (this.getNow() - this.lastUserActivityTime) / 1000;
      if (i > 0) {
        let r = this.USER_ACTIVITY_TIMEOUT_MS / 1000;
        if (i < r) {
          let activeTimeCounter = this.getActiveTimeCounter();
          if (activeTimeCounter)
            activeTimeCounter.add(i, {
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
  getLastUserActivityTime() {
    return this.lastUserActivityTime;
  }
  getActivityStates() {
    return {
      isUserActive: (this.getNow() - this.lastUserActivityTime) / 1000 < this.USER_ACTIVITY_TIMEOUT_MS / 1000,
      isCLIActive: this.isCLIActive,
      activeOperationCount: this.activeOperations.size,
    };
  }
}
//@ chunk-3jjz3v21.js:5126-5147 layout
class ActivityState {
  current = null;
}
//@ chunk-3jjz3v21.js:5147-5170 layout
/**
 * 按宿主隔离的活动状态。
 */
var activityStateByHost = new HostScoped(() => new ActivityState());
//@ chunk-3jjz3v21.js:5170-5205 layout
function getActivityState() {
  return activityStateByHost.of(getRootSession().host);
}
//@ chunk-3jjz3v21.js:5205-5386 callgraph-witnessed = activityManager (0.357)
var activityManager = {
  recordUserActivity: () => ActivityManager.getInstance().recordUserActivity(),
  startCLIActivity: (e) => ActivityManager.getInstance().startCLIActivity(e),
  endCLIActivity: (e) => ActivityManager.getInstance().endCLIActivity(e),
};
export { activityManager };
