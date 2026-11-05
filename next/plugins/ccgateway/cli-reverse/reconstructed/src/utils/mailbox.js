/**
 * utils/mailbox.ts
 *
 * 进程内消息邮箱（队友/后台代理通信）。
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mailbox.ts
 * pieces: chunk-swe0kb5q.js (1)
 * attribution: fingerprint 1
 */
import { createSignal } from "./signal.js";

//@ chunk-swe0kb5q.js:11508-12181 fingerprint (2.1.88 match: Mailbox, 1)
/**
 * 进程内消息邮箱：按条件等待/取出消息，供队友与后台代理通信。
 */
class Mailbox {
  queue = [];
  waiters = [];
  changed = createSignal();
  _revision = 0;
  get length() {
    return this.queue.length;
  }
  get revision() {
    return this._revision;
  }
  send(msg) {
    this._revision++;
    let idx = this.waiters.findIndex((waiter) => waiter.fn(msg));
    if (idx !== -1) {
      let waiter = this.waiters.splice(idx, 1)[0];
      if (waiter) {
        waiter.resolve(msg);
        this.notify();
        return;
      }
    }
    this.queue.push(msg);
    this.notify();
  }
  poll(fn = () => true) {
    let idx = this.queue.findIndex(fn);
    if (idx === -1) return;
    return this.queue.splice(idx, 1)[0];
  }
  receive(fn = () => true) {
    let idx = this.queue.findIndex(fn);
    if (idx !== -1) {
      let msg = this.queue.splice(idx, 1)[0];
      if (msg) {
        this.notify();
        return Promise.resolve(msg);
      }
    }
    return new Promise((resolve) => {
      this.waiters.push({
        fn,
        resolve,
      });
    });
  }
  subscribe = this.changed.subscribe;
  notify() {
    this.changed.emit();
  }
}
export { Mailbox };
