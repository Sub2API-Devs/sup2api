/**
 * components/fleet/FleetNudgeStore.ts
 *
 * fleet 提示状态存储（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-g02g7h43.js (9)
 * attribution: placement 9
 */
import {
  init_react_production,
  createContext,
  useContext,
} from "../../../vendor/react/cjs/react.production.js";
import {
  listJobs,
  IDLE_NEEDS,
  isSettled,
  terminalOutcome,
  isSelfDriving,
  getOwnJobShortId,
} from "../../services/daemon/jobState.js";
import { logFeatureOk, logFeatureSad } from "../../services/analytics/featureTelemetry.js";
import { createSignal } from "../../utils/signal.js";
import { logForDebugging } from "../../utils/debug.js";
import { logEvent } from "../../services/analytics/index.js";
import { deferInit } from "../../../runtime/deferred-init.js";

//@ chunk-g02g7h43.js:426-430 placement
// deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g02g7h43.js:426", () => {
  init_react_production();
});
//@ chunk-g02g7h43.js:430-509 placement
/**
 * 函数 requestNudgeOnce（未获批时返回 nudge）；位于「fleet 提示状态存储（2.1.316 新增）」模块。
 */
async function requestNudgeOnce(storageV5) {
  let failed = false;
  let jobs = await listJobs(undefined, storageV5, () => {
    failed = true;
  });
  return failed ? null : jobs;
}
//@ chunk-g02g7h43.js:509-542 placement
var NUDGE_MIN_GAP_MS = 120000;
var NUDGE_MAX_GAP_MS = 1800000;
var NUDGE_POLL_MS = 1e4;
var NUDGE_MAX_COUNT = 3;
//@ chunk-g02g7h43.js:542-605 placement
function isBlockedNeedingNudge(riskLevel) {
  return !isDoneJob(riskLevel) && riskLevel.tempo === "blocked" && riskLevel.needs !== IDLE_NEEDS;
}
//@ chunk-g02g7h43.js:605-669 placement (2.1.88 match: getRiskColor, 1)
function isDoneJob(riskLevel) {
  return (
    isSettled(riskLevel) && !(terminalOutcome(riskLevel.state) === "success" && isSelfDriving(riskLevel))
  );
}
//@ chunk-g02g7h43.js:669-2632 placement
class FleetNudgeStore {
  #p;
  #g;
  #s = undefined;
  #m = createSignal();
  #h = 0;
  #n = false;
  #u = true;
  #o = null;
  #e = null;
  #d = false;
  #t = 0;
  #i = null;
  #l = 0;
  #S;
  constructor(options) {
    this.#p = options?.sweepMs ?? NUDGE_POLL_MS;
    this.#g = options?.ignoredAfterMs ?? NUDGE_MAX_GAP_MS;
    let storageV5 = options?.storageV5;
    this.#S = () => requestNudgeOnce(storageV5);
  }
  getSnapshot = () => this.#s;
  subscribe = (listener) => {
    let unsubscribe = this.#m.subscribe(listener);
    this.#h++;
    if (!this.#n) {
      this.#n = true;
      if (this.#s === undefined) this.#r();
      else this.#f();
    }
    let cleaned = false;
    return () => {
      if (cleaned) return;
      cleaned = true;
      unsubscribe();
      this.#h--;
      if (this.#h === 0) this.#N();
    };
  };
  refetch = () => this.#r();
  async quiesce() {
    while (this.#e) await this.#e;
  }
  setFocused(focused) {
    if (focused === this.#u) return;
    this.#u = focused;
    if (!this.#n) return;
    if (focused) {
      this.#l = 0;
      this.#r();
    } else this.#a();
  }
  recordOpenViaLeft() {
    this.#c();
    if (this.#t > 0 && Date.now() - this.#t <= NUDGE_MIN_GAP_MS) {
      logFeatureOk("fleet_needs_input_nudge");
      this.#t = 0;
    }
    return this.#s;
  }
  #r() {
    this.#a();
    if (this.#e) {
      this.#d = true;
      return this.#e;
    }
    this.#e = this.#b().finally(() => {
      this.#e = null;
      if (this.#d) {
        this.#d = false;
        this.#r();
      }
    });
    return this.#e;
  }
  async #b() {
    let jobs;
    try {
      jobs = await this.#S();
    } catch {
      jobs = [];
    }
    if (!this.#n) return;
    if (jobs !== null) this.#l = 0;
    else if (++this.#l <= NUDGE_MAX_COUNT) {
      if (this.#l === 1)
        logForDebugging(
          "[fleet nudge] listing sessions failed for a reason that may pass; keeping the counts",
          {
            level: "warn",
          },
        );
      if (this.#u) this.#f();
      return;
    }
    let jobList = jobs ?? [];
    let needsInput = 0;
    let done = 0;
    let succeeded = 0;
    let running = 0;
    let ownJobShortId = getOwnJobShortId();
    for (let job of jobList) {
      if (job.id === ownJobShortId) continue;
      if (isDoneJob(job.state)) {
        done++;
        if (terminalOutcome(job.state.state) === "success") succeeded++;
        continue;
      }
      running++;
      if (isBlockedNeedingNudge(job.state)) needsInput++;
    }
    if (needsInput === 0) {
      this.#c();
      this.#t = 0;
    }
    let previous = this.#s;
    if (previous?.needsInput !== needsInput || previous?.done !== done || previous?.succeeded !== succeeded) {
      let increased = previous !== undefined && needsInput > previous.needsInput;
      this.#s = {
        needsInput,
        done,
        succeeded,
      };
      logEvent("tengu_fleet_nudge_state", {
        needs_input_count: needsInput,
        done_count: done,
        succeeded_count: succeeded,
        increased,
      });
      if (increased) {
        this.#t = Date.now();
        this.#_();
      }
      this.#m.emit();
    }
    if (running > 0 && this.#u) this.#f();
  }
  #f() {
    this.#a();
    this.#o = setTimeout(() => void this.#r(), this.#p);
    this.#o.unref();
  }
  #_() {
    this.#c();
    this.#i = setTimeout(() => {
      this.#i = null;
      logFeatureSad("fleet_needs_input_nudge", "ignored");
      this.#t = 0;
    }, this.#g);
    this.#i.unref();
  }
  #a() {
    if (this.#o) {
      clearTimeout(this.#o);
      this.#o = null;
    }
  }
  #c() {
    if (this.#i) {
      clearTimeout(this.#i);
      this.#i = null;
    }
  }
  #N() {
    this.#a();
    this.#d = false;
    this.#n = false;
  }
}
//@ chunk-g02g7h43.js:2632-2718 placement
function ensureFleetNudgeStore(state, storageV5) {
  state.fleetNudgeStore ??= new FleetNudgeStore({
    storageV5,
  });
  return state.fleetNudgeStore;
}
//@ chunk-g02g7h43.js:2718-2735 placement
var FleetNudgeStoreContext; // deferred: has load-time effects after a deferred statement of its import cycle; keeps the official order
deferInit("chunk-g02g7h43.js:2718", () => {
  FleetNudgeStoreContext = createContext(null);
});
//@ chunk-g02g7h43.js:2735-2918 placement
function useFleetNudgeStore() {
  let store = useContext(FleetNudgeStoreContext);
  if (!store)
    throw ReferenceError(
      "useFleetNudgeStore cannot be called outside of a FleetNudgeStoreContext provider (mounted by <AppStateProvider />)",
    );
  return store;
}
export {
  FleetNudgeStore,
  FleetNudgeStoreContext,
  requestNudgeOnce,
  useFleetNudgeStore,
  isDoneJob,
  ensureFleetNudgeStore,
};
