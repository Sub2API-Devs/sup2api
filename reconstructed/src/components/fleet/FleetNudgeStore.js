/**
 * components/fleet/FleetNudgeStore.ts
 *
 * fleet 提示状态存储（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-5gatfnjn.js (9)
 * attribution: placement 9
 */
import { init_react_production, qt, Se } from "../../../vendor/react/cjs/react.production.js";
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

//@ chunk-5gatfnjn.js:426-430 placement
init_react_production();
//@ chunk-5gatfnjn.js:430-509 placement
/**
 * 函数 requestNudgeOnce（未获批时返回 nudge）；位于「fleet 提示状态存储（2.1.316 新增）」模块。
 */
async function requestNudgeOnce(storageV5) {
  let s = false;
  let i = await listJobs(undefined, storageV5, () => {
    s = true;
  });
  return s ? null : i;
}
//@ chunk-5gatfnjn.js:509-542 placement
var NUDGE_MIN_GAP_MS = 120000;
var NUDGE_MAX_GAP_MS = 1800000;
var NUDGE_POLL_MS = 1e4;
var NUDGE_MAX_COUNT = 3;
//@ chunk-5gatfnjn.js:542-605 placement
function isBlockedNeedingNudge(riskLevel) {
  return !isDoneJob(riskLevel) && riskLevel.tempo === "blocked" && riskLevel.needs !== IDLE_NEEDS;
}
//@ chunk-5gatfnjn.js:605-669 placement = getRiskColor (1)
function isDoneJob(riskLevel) {
  return (
    isSettled(riskLevel) && !(terminalOutcome(riskLevel.state) === "success" && isSelfDriving(riskLevel))
  );
}
//@ chunk-5gatfnjn.js:669-2632 placement
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
  constructor(e) {
    this.#p = e?.sweepMs ?? NUDGE_POLL_MS;
    this.#g = e?.ignoredAfterMs ?? NUDGE_MAX_GAP_MS;
    let storageV5 = e?.storageV5;
    this.#S = () => requestNudgeOnce(storageV5);
  }
  getSnapshot = () => this.#s;
  subscribe = (e) => {
    let s = this.#m.subscribe(e);
    this.#h++;
    if (!this.#n) {
      this.#n = true;
      if (this.#s === undefined) this.#r();
      else this.#f();
    }
    let i = false;
    return () => {
      if (i) return;
      i = true;
      s();
      this.#h--;
      if (this.#h === 0) this.#N();
    };
  };
  refetch = () => this.#r();
  async quiesce() {
    while (this.#e) await this.#e;
  }
  setFocused(e) {
    if (e === this.#u) return;
    this.#u = e;
    if (!this.#n) return;
    if (e) {
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
    let e;
    try {
      e = await this.#S();
    } catch {
      e = [];
    }
    if (!this.#n) return;
    if (e !== null) this.#l = 0;
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
    let s = e ?? [];
    let i = 0;
    let r = 0;
    let u = 0;
    let d = 0;
    let ownJobShortId = getOwnJobShortId();
    for (let n of s) {
      if (n.id === ownJobShortId) continue;
      if (isDoneJob(n.state)) {
        r++;
        if (terminalOutcome(n.state.state) === "success") u++;
        continue;
      }
      d++;
      if (isBlockedNeedingNudge(n.state)) i++;
    }
    if (i === 0) {
      this.#c();
      this.#t = 0;
    }
    let o = this.#s;
    if (o?.needsInput !== i || o?.done !== r || o?.succeeded !== u) {
      let n = o !== undefined && i > o.needsInput;
      this.#s = {
        needsInput: i,
        done: r,
        succeeded: u,
      };
      logEvent("tengu_fleet_nudge_state", {
        needs_input_count: i,
        done_count: r,
        succeeded_count: u,
        increased: n,
      });
      if (n) {
        this.#t = Date.now();
        this.#_();
      }
      this.#m.emit();
    }
    if (d > 0 && this.#u) this.#f();
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
//@ chunk-5gatfnjn.js:2632-2718 placement
function ensureFleetNudgeStore(e, storageV5) {
  e.fleetNudgeStore ??= new FleetNudgeStore({
    storageV5,
  });
  return e.fleetNudgeStore;
}
//@ chunk-5gatfnjn.js:2718-2735 placement
var FleetNudgeStoreContext = qt(null);
//@ chunk-5gatfnjn.js:2735-2918 placement
function useFleetNudgeStore() {
  let e = Se(FleetNudgeStoreContext);
  if (!e)
    throw ReferenceError(
      "useFleetNudgeStore cannot be called outside of a FleetNudgeStoreContext provider (mounted by <AppStateProvider />)",
    );
  return e;
}
export { useFleetNudgeStore, FleetNudgeStore, requestNudgeOnce, isDoneJob, FleetNudgeStoreContext };
