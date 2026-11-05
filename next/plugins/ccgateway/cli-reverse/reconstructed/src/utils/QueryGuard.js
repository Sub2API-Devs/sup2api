/**
 * utils/QueryGuard.ts
 *
 * 主循环并发守卫（idle/dispatching/running），保证同一时刻只有一个查询轮次。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/QueryGuard.ts
 * pieces: chunk-czq1j3j2.js (1)
 * attribution: fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { createSignal } from "./signal.js";
import { setMainLoopStatus } from "../bootstrap/state.js";
import { setForegroundTurnBusy } from "./plugins/hooksModulesLoadGate.js";

//@ chunk-czq1j3j2.js:1537122-1538336 fingerprint (2.1.88 match: QueryGuard, 0.807)
/**
 * 查询并发守卫：idle → dispatching → running 状态机，保证同一时刻只有一个主循环轮次。
 */
class QueryGuard {
  _status = "idle";
  _generation = 0;
  _turnKey = null;
  _isDispatchForModel = false;
  _changed = createSignal();
  reserve() {
    if (this._status !== "idle") return false;
    this._status = "dispatching";
    this._isDispatchForModel = false;
    this._notify();
    return true;
  }
  markDispatchForModel(generation) {
    if (this._status === "dispatching" && generation === this._generation) this._isDispatchForModel = true;
  }
  cancelReservation() {
    if (this._status !== "dispatching") return;
    this._status = "idle";
    this._notify();
  }
  tryStart() {
    if (this._status === "running") return null;
    this._status = "running";
    ++this._generation;
    this._notify();
    return this._generation;
  }
  end(generation) {
    if (this._generation !== generation) return false;
    if (this._status !== "running") return false;
    this._status = "idle";
    this._notify();
    return true;
  }
  forceEnd() {
    if (this._status === "idle") return;
    this._status = "idle";
    ++this._generation;
    this._notify();
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
    let busy = this._status !== "idle";
    let turnKey = this._turnKey ?? Symbol("query guard turn");
    this._turnKey = busy ? turnKey : null;
    setForegroundTurnBusy(busy, turnKey);
    this._changed.emit();
  }
}
export { QueryGuard };
