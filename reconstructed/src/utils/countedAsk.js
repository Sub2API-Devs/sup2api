/**
 * utils/countedAsk.ts
 *
 * 计数请求（2.1.316 新增）
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-c8400jaf.js (2)
 * attribution: placement 2
 */
import { logForDebugging } from "./debug.js";
import { createSignal } from "./signal.js";

//@ chunk-c8400jaf.js:262-586 placement
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
  settleWhen(e) {
    e.then(
      () => this.settle(),
      () => this.settle(),
    );
  }
  onSettle(e) {
    return this.#t.subscribe(e);
  }
}
//@ chunk-c8400jaf.js:586-994 placement
/**
 * 计数请求队列：登记未完成的请求，结束时移除；为请求生成"第 N 个，共 M 个"的位置标签并通知订阅者。
 */
class CountedAskQueue {
  #e = new Map();
  #t = 0;
  #i = createSignal();
  subscribe = (e) => this.#i.subscribe(e);
  join(e) {
    if (e.settled || this.#e.has(e)) return;
    this.#e.set(
      e,
      e.onSettle(() => this.#s(e)),
    );
    this.#i.emit();
  }
  positionLabel(e) {
    if (!this.#e.has(e)) return null;
    let i = this.#t + this.#e.size;
    return i < 2 ? null : `${this.#t + 1} of ${i}`;
  }
  #s(e) {
    let i = this.#e.get(e);
    if (i === undefined) return;
    i();
    this.#e.delete(e);
    this.#t = this.#e.size === 0 ? 0 : this.#t + 1;
    this.#i.emit();
  }
}
export { CountedAsk, CountedAskQueue };
