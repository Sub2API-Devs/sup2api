/**
 * utils/QueryGuard.ts
 *
 * 主循环并发守卫（idle/dispatching/running），保证同一时刻只有一个查询轮次。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/QueryGuard.ts
 * pieces: chunk-18hwfzwa.js (1)
 * attribution: fingerprint 1
 */
import { createSignal } from "./signal.js";
import { setMainLoopStatus } from "../bootstrap/state.js";
import { setForegroundTurnBusy } from "./plugins/hooksModulesLoadGate.js";

/**
 * 查询并发守卫：idle → dispatching → running 状态机，保证同一时刻只有一个主循环轮次。
 */
//@ chunk-18hwfzwa.js:1495627-1496841 fingerprint = QueryGuard (0.807)
class QueryGuard {
  _status = "idle";
  _generation = 0;
  _turnKey = null;
  _isDispatchForModel = !1;
  _changed = createSignal();
  reserve() {
    if (this._status !== "idle") return !1;
    return ((this._status = "dispatching"), (this._isDispatchForModel = !1), this._notify(), !0);
  }
  markDispatchForModel(h) {
    if (this._status === "dispatching" && h === this._generation) this._isDispatchForModel = !0;
  }
  cancelReservation() {
    if (this._status !== "dispatching") return;
    ((this._status = "idle"), this._notify());
  }
  tryStart() {
    if (this._status === "running") return null;
    return ((this._status = "running"), ++this._generation, this._notify(), this._generation);
  }
  end(h) {
    if (this._generation !== h) return !1;
    if (this._status !== "running") return !1;
    return ((this._status = "idle"), this._notify(), !0);
  }
  forceEnd() {
    if (this._status === "idle") return;
    ((this._status = "idle"), ++this._generation, this._notify());
  }
  get isActive() {
    return this._status !== "idle";
  }
  get isRunning() {
    return this._status === "running";
  }
  get isDispatchingForModel() {
    return this._status === "dispatching" && this._isDispatchForModel;
  }
  get generation() {
    return this._generation;
  }
  subscribe = this._changed.subscribe;
  getSnapshot = () => this._status !== "idle";
  _notify() {
    setMainLoopStatus(this._status);
    let h = this._status !== "idle",
      x = this._turnKey ?? Symbol("query guard turn");
    ((this._turnKey = h ? x : null), setForegroundTurnBusy(h, x), this._changed.emit());
  }
}

export { QueryGuard };
