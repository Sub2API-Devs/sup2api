/**
 * utils/countedAsk.ts
 *
 * 计数请求（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * new in 2.1.318 (2.1.88 has no file at this path)
 * pieces: chunk-9ay0r00c.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "./debug.js";
import { createSignal } from "./signal.js";

//@ chunk-9ay0r00c.js:262-586 placement
class CountedAsk {
  #e = false;
  #t = createSignal();
  get settled() {
    return this.#e;
  }
  settle() {
    if (this.#e) return;
    this.#e = true;
    try {
      this.#t.emit();
    } catch (error) {
      logForDebugging(`CountedAsk: a listener threw while the request settled: ${String(error)}`, {
        level: "error",
      });
    }
    this.#t.clear();
  }
  settleWhen(settled) {
    settled.then(
      () => this.settle(),
      () => this.settle(),
    );
  }
  onSettle(listener) {
    return this.#t.subscribe(listener);
  }
}
//@ chunk-9ay0r00c.js:586-994 placement
/**
 * 计数请求队列：登记未完成的请求，结束时移除；为请求生成"第 N 个，共 M 个"的位置标签并通知订阅者。
 */
class CountedAskQueue {
  #e = new Map();
  #t = 0;
  #i = createSignal();
  subscribe = (listener) => this.#i.subscribe(listener);
  join(ask) {
    if (ask.settled || this.#e.has(ask)) return;
    this.#e.set(
      ask,
      ask.onSettle(() => this.#s(ask)),
    );
    this.#i.emit();
  }
  positionLabel(ask) {
    if (!this.#e.has(ask)) return null;
    let total = this.#t + this.#e.size;
    return total < 2 ? null : `${this.#t + 1} of ${total}`;
  }
  #s(ask) {
    let finish = this.#e.get(ask);
    if (finish === undefined) return;
    finish();
    this.#e.delete(ask);
    this.#t = this.#e.size === 0 ? 0 : this.#t + 1;
    this.#i.emit();
  }
}
export { CountedAsk, CountedAskQueue };
