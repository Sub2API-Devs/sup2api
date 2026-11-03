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
var w = 31536000000,
  m = 10;
//@ chunk-3jjz3v21.js:666-708 placement
function l() {
  return { version: 1, windows: [] };
}
//@ chunk-3jjz3v21.js:708-738 placement
function f() {
  return join(getClaudeConfigDir(), ACTIVE_TIME_JSON);
}
//@ chunk-3jjz3v21.js:738-789 placement
function g() {
  return STORAGE_SPACES.state("active-time-ledger");
}
/**
 * 读取活跃时长账本（v5 存储或本地文件），只保留结构正确的时间窗口；不存在或格式不对时返回空账本，读取失败抛出。
 */
//@ chunk-3jjz3v21.js:789-1388 placement
async function readActiveTimeLedger(e) {
  let i;
  if (isStorageV5Enabled() && e !== void 0) {
    let text = await e.readText([g()]);
    if (!text.ok)
      throw (
        logForDebugging(`Failed to read active-time ledger: ${formatStorageError(text.error)}`),
        Error("active-time ledger read failed")
      );
    let n = text.value.items[0];
    if (!n.found) return l();
    i = n.value;
  } else
    try {
      i = await getFileReader().read(f());
    } catch (error) {
      if (isENOENT(error)) return l();
      throw (logForDebugging(`Failed to read active-time ledger: ${errorMessage(error)}`), error);
    }
  try {
    let r = jsonParse(i);
    if (r.version !== 1 || !Array.isArray(r.windows)) return l();
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
    return l();
  }
}
//@ chunk-3jjz3v21.js:1388-3521 placement
class ActiveTimeLedger {
  pendingSeconds = 0;
  activeStretch = null;
  cachedBreakThresholdMs = m * 60000;
  flushTimer = null;
  cleanupHandle = null;
  flushInFlight = null;
  #t = void 0;
  noteUserActivity(e, i) {
    if (e <= 0) return;
    if (this.activeStretch === null || i - this.activeStretch.lastActivityMs >= this.cachedBreakThresholdMs)
      this.activeStretch = { windowStartMs: i - e * 1000, lastActivityMs: i };
    else this.activeStretch.lastActivityMs = i;
    ((this.pendingSeconds += e), this.ensureFlushTimer());
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
    return (
      (this.flushInFlight = this.doFlush(e, i).finally(() => {
        this.flushInFlight = null;
      })),
      this.flushInFlight
    );
  }
  async doFlush(e, i) {
    let r = resolveSetting("breakReminder", { enabled: !1 }).value;
    if (((this.cachedBreakThresholdMs = (r.breakThresholdMinutes ?? m) * 60000), this.pendingSeconds <= 0))
      return;
    let pendingSeconds = this.pendingSeconds;
    try {
      let s = await readActiveTimeLedger(i),
        at = s.windows.at(-1);
      if (at && e - at.end < this.cachedBreakThresholdMs) {
        if (
          ((at.end = Math.max(at.end, e)),
          (at.userSeconds = Math.min(at.userSeconds + pendingSeconds, (at.end - at.start) / 1000)),
          this.activeStretch)
        )
          this.activeStretch.windowStartMs = at.start;
      } else {
        let a = this.activeStretch?.windowStartMs ?? e - pendingSeconds * 1000,
          u = at ? Math.max(a, at.end) : a,
          max = Math.max(u, e);
        if (
          (s.windows.push({ start: u, end: max, userSeconds: Math.min(pendingSeconds, (max - u) / 1000) }),
          this.activeStretch)
        )
          this.activeStretch.windowStartMs = u;
      }
      let S = e - w;
      if (((s.windows = s.windows.filter((a) => a.end >= S)), isStorageV5Enabled() && i !== void 0)) {
        let write = await i.write(g(), jsonStringify(s), { mode: 384 });
        if (!write.ok) {
          logForDebugging(`Failed to flush active-time ledger: ${formatStorageError(write.error)}`);
          return;
        }
      } else {
        let a = getClaudeConfigDir();
        (await getFileReader().mkdir(a), await getFileReader().atomicWrite(f(), jsonStringify(s), 384));
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
    if (
      ((this.pendingSeconds = 0),
      (this.activeStretch = null),
      (this.cachedBreakThresholdMs = m * 60000),
      this.flushTimer)
    )
      (clearInterval(this.flushTimer), (this.flushTimer = null));
    (this.cleanupHandle?.(), (this.cleanupHandle = null), (this.flushInFlight = null), (this.#t = void 0));
  }
}
//@ chunk-3jjz3v21.js:3521-3544 placement
var j = new HostScoped(() => new ActiveTimeLedger());
//@ chunk-3jjz3v21.js:3544-5126 fingerprint = ActivityManager (0.953)
class ActivityManager {
  activeOperations = new Set();
  lastUserActivityTime = 0;
  lastCLIRecordedTime;
  isCLIActive = !1;
  USER_ACTIVITY_TIMEOUT_MS = 5000;
  getNow;
  getActiveTimeCounter;
  constructor(e) {
    ((this.getNow = e?.getNow ?? (() => Date.now())),
      (this.getActiveTimeCounter = e?.getActiveTimeCounter ?? getActiveTimeCounter),
      (this.lastCLIRecordedTime = this.getNow()));
  }
  static getInstance() {
    let e = getActivityState();
    return ((e.current ??= new ActivityManager()), e.current);
  }
  static resetInstance() {
    getActivityState().current = null;
  }
  static createInstance(e) {
    let i = new ActivityManager(e);
    return ((getActivityState().current = i), i);
  }
  recordUserActivity() {
    if (!this.isCLIActive && this.lastUserActivityTime !== 0) {
      let i = (this.getNow() - this.lastUserActivityTime) / 1000;
      if (i > 0) {
        let r = this.USER_ACTIVITY_TIMEOUT_MS / 1000;
        if (i < r) {
          let activeTimeCounter = this.getActiveTimeCounter();
          if (activeTimeCounter) activeTimeCounter.add(i, { type: "user" });
        }
      }
    }
    this.lastUserActivityTime = this.getNow();
  }
  startCLIActivity(e) {
    if (this.activeOperations.has(e)) this.endCLIActivity(e);
    let i = this.activeOperations.size === 0;
    if ((this.activeOperations.add(e), i))
      ((this.isCLIActive = !0), (this.lastCLIRecordedTime = this.getNow()));
  }
  endCLIActivity(e) {
    if ((this.activeOperations.delete(e), this.activeOperations.size === 0)) {
      let now = this.getNow(),
        r = (now - this.lastCLIRecordedTime) / 1000;
      if (r > 0) {
        let activeTimeCounter = this.getActiveTimeCounter();
        if (activeTimeCounter) activeTimeCounter.add(r, { type: "cli" });
      }
      ((this.lastCLIRecordedTime = now), (this.isCLIActive = !1));
    }
  }
  async trackOperation(e, i) {
    this.startCLIActivity(e);
    try {
      return await i();
    } finally {
      this.endCLIActivity(e);
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
var I = new HostScoped(() => new ActivityState());
//@ chunk-3jjz3v21.js:5170-5205 layout
function getActivityState() {
  return I.of(getRootSession().host);
}
//@ chunk-3jjz3v21.js:5205-5386 callgraph-witnessed = activityManager (0.357)
var activityManager = {
  recordUserActivity: () => ActivityManager.getInstance().recordUserActivity(),
  startCLIActivity: (e) => ActivityManager.getInstance().startCLIActivity(e),
  endCLIActivity: (e) => ActivityManager.getInstance().endCLIActivity(e),
};

export { activityManager };
