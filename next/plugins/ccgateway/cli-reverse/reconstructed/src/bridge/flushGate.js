/**
 * bridge/flushGate.ts
 *
 * FlushGate：历史回放/重连期间暂存出站消息，结束后按序冲刷，可淘汰最旧项
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/flushGate.ts
 * pieces: chunk-56msakfz.js (1)
 * attribution: fingerprint 1
 */
import { countWhere } from "../utils/collections.js";

//@ chunk-56msakfz.js:19071-19721 fingerprint (2.1.88 match: FlushGate, 0.774)
/**
 * 刷新闸：start 后 enqueue 的条目被暂存；end 取出全部并关闭；evictOldest 按谓词只保留最新 N 条（计入 evictedCount）；drop 丢弃；deactivate 只关闭。
 */
class FlushGate {
  _active = false;
  _pending = [];
  _evictedCount = 0;
  get active() {
    return this._active;
  }
  get pendingCount() {
    return this._pending.length;
  }
  get pending() {
    return this._pending;
  }
  get evictedCount() {
    return this._evictedCount;
  }
  start() {
    this._active = true;
  }
  end() {
    this._active = false;
    this._evictedCount = 0;
    return this._pending.splice(0);
  }
  enqueue(...items) {
    if (!this._active) return false;
    this._pending.push(...items);
    return true;
  }
  evictOldest(shouldEvict, keepCount) {
    let evictCount = countWhere(this._pending, shouldEvict) - keepCount;
    if (evictCount <= 0) return;
    this._evictedCount += evictCount;
    this._pending = this._pending.filter((item) => !shouldEvict(item) || evictCount-- <= 0);
  }
  drop() {
    this._active = false;
    this._evictedCount = 0;
    let count = this._pending.length;
    this._pending.length = 0;
    return count;
  }
  deactivate() {
    this._active = false;
  }
}
export { FlushGate };
