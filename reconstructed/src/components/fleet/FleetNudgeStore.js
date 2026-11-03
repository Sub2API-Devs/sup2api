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
import { j, qt, Se } from "../../../vendor/react/cjs/react.production.js";
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
j();
//@ chunk-5gatfnjn.js:430-509 placement
async function lRr(e) {
  let s = !1,
    i = await listJobs(void 0, e, () => {
      s = !0;
    });
  return s ? null : i;
}
//@ chunk-5gatfnjn.js:509-542 placement
var h = 120000,
  c = 1800000,
  p = 1e4,
  m = 3;
//@ chunk-5gatfnjn.js:542-605 placement
function S(e) {
  return !isDoneJob(e) && e.tempo === "blocked" && e.needs !== IDLE_NEEDS;
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
  #s = void 0;
  #m = createSignal();
  #h = 0;
  #n = !1;
  #u = !0;
  #o = null;
  #e = null;
  #d = !1;
  #t = 0;
  #i = null;
  #l = 0;
  #S;
  constructor(e) {
    ((this.#p = e?.sweepMs ?? p), (this.#g = e?.ignoredAfterMs ?? c));
    let s = e?.storageV5;
    this.#S = () => lRr(s);
  }
  getSnapshot = () => this.#s;
  subscribe = (e) => {
    let subscribe = this.#m.subscribe(e);
    if ((this.#h++, !this.#n))
      if (((this.#n = !0), this.#s === void 0)) this.#r();
      else this.#f();
    let i = !1;
    return () => {
      if (i) return;
      if (((i = !0), subscribe(), this.#h--, this.#h === 0)) this.#N();
    };
  };
  refetch = () => this.#r();
  async quiesce() {
    while (this.#e) await this.#e;
  }
  setFocused(e) {
    if (e === this.#u) return;
    if (((this.#u = e), !this.#n)) return;
    if (e) ((this.#l = 0), this.#r());
    else this.#a();
  }
  recordOpenViaLeft() {
    if ((this.#c(), this.#t > 0 && Date.now() - this.#t <= h))
      (logFeatureOk("fleet_needs_input_nudge"), (this.#t = 0));
    return this.#s;
  }
  #r() {
    if ((this.#a(), this.#e)) return ((this.#d = !0), this.#e);
    return (
      (this.#e = this.#b().finally(() => {
        if (((this.#e = null), this.#d)) ((this.#d = !1), this.#r());
      })),
      this.#e
    );
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
    else if (++this.#l <= m) {
      if (this.#l === 1)
        logForDebugging(
          "[fleet nudge] listing sessions failed for a reason that may pass; keeping the counts",
          { level: "warn" },
        );
      if (this.#u) this.#f();
      return;
    }
    let s = e ?? [],
      i = 0,
      r = 0,
      u = 0,
      d = 0,
      l = getOwnJobShortId();
    for (let n of s) {
      if (n.id === l) continue;
      if (isDoneJob(n.state)) {
        if ((r++, terminalOutcome(n.state.state) === "success")) u++;
        continue;
      }
      if ((d++, S(n.state))) i++;
    }
    if (i === 0) (this.#c(), (this.#t = 0));
    let o = this.#s;
    if (o?.needsInput !== i || o?.done !== r || o?.succeeded !== u) {
      let n = o !== void 0 && i > o.needsInput;
      if (
        ((this.#s = { needsInput: i, done: r, succeeded: u }),
        logEvent("tengu_fleet_nudge_state", {
          needs_input_count: i,
          done_count: r,
          succeeded_count: u,
          increased: n,
        }),
        n)
      )
        ((this.#t = Date.now()), this.#_());
      this.#m.emit();
    }
    if (d > 0 && this.#u) this.#f();
  }
  #f() {
    (this.#a(), (this.#o = setTimeout(() => void this.#r(), this.#p)), this.#o.unref());
  }
  #_() {
    (this.#c(),
      (this.#i = setTimeout(() => {
        ((this.#i = null), logFeatureSad("fleet_needs_input_nudge", "ignored"), (this.#t = 0));
      }, this.#g)),
      this.#i.unref());
  }
  #a() {
    if (this.#o) (clearTimeout(this.#o), (this.#o = null));
  }
  #c() {
    if (this.#i) (clearTimeout(this.#i), (this.#i = null));
  }
  #N() {
    (this.#a(), (this.#d = !1), (this.#n = !1));
  }
}
//@ chunk-5gatfnjn.js:2632-2718 placement
function ensureFleetNudgeStore(e, s) {
  return ((e.fleetNudgeStore ??= new FleetNudgeStore({ storageV5: s })), e.fleetNudgeStore);
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

export { useFleetNudgeStore, FleetNudgeStore, lRr, isDoneJob, FleetNudgeStoreContext };
