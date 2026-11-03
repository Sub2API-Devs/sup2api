/**
 * utils/mailbox.ts
 *
 * 进程内消息邮箱（队友/后台代理通信）。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/mailbox.ts
 * pieces: chunk-xe7zq1p4.js (1)
 * attribution: fingerprint 1
 */
import { createSignal } from "./signal.js";

/**
 * 进程内消息邮箱：按条件等待/取出消息，供队友与后台代理通信。
 */
//@ chunk-xe7zq1p4.js:11488-12161 fingerprint = Mailbox (1)
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
  send(n) {
    this._revision++;
    let index = this.waiters.findIndex((waiter) => waiter.fn(n));
    if (index !== -1) {
      let i = this.waiters.splice(index, 1)[0];
      if (i) {
        (i.resolve(n), this.notify());
        return;
      }
    }
    (this.queue.push(n), this.notify());
  }
  poll(n = () => !0) {
    let index = this.queue.findIndex(n);
    if (index === -1) return;
    return this.queue.splice(index, 1)[0];
  }
  receive(n = () => !0) {
    let index = this.queue.findIndex(n);
    if (index !== -1) {
      let i = this.queue.splice(index, 1)[0];
      if (i) return (this.notify(), Promise.resolve(i));
    }
    return new Promise((i) => {
      this.waiters.push({ fn: n, resolve: i });
    });
  }
  subscribe = this.changed.subscribe;
  notify() {
    this.changed.emit();
  }
}

export { Mailbox };
