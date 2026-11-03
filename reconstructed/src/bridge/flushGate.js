/**
 * bridge/flushGate.ts
 *
 * FlushGate：历史回放/重连期间暂存出站消息，结束后按序冲刷，可淘汰最旧项
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/bridge/flushGate.ts
 * pieces: chunk-4cm44bmp.js (1)
 * attribution: fingerprint 1
 */
import { count } from "../utils/collections.js";

/**
 * 刷新闸：start 后 enqueue 的条目被暂存；end 取出全部并关闭；evictOldest 按谓词只保留最新 N 条（计入 evictedCount）；drop 丢弃；deactivate 只关闭。
 */
//@ chunk-4cm44bmp.js:18886-19536 fingerprint = FlushGate (0.774)
class FlushGate {
  _active = !1;
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
    this._active = !0;
  }
  end() {
    return ((this._active = !1), (this._evictedCount = 0), this._pending.splice(0));
  }
  enqueue(...n) {
    if (!this._active) return !1;
    return (this._pending.push(...n), !0);
  }
  evictOldest(n, h) {
    let w = count(this._pending, n) - h;
    if (w <= 0) return;
    ((this._evictedCount += w), (this._pending = this._pending.filter((C) => !n(C) || w-- <= 0)));
  }
  drop() {
    ((this._active = !1), (this._evictedCount = 0));
    let n = this._pending.length;
    return ((this._pending.length = 0), n);
  }
  deactivate() {
    this._active = !1;
  }
}

export { FlushGate };
