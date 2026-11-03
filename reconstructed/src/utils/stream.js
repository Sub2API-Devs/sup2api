/**
 * utils/stream.ts
 *
 * 简单的单消费者异步队列 Stream：enqueue/error/done，只能迭代一次。
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * 2.1.88 counterpart: references/claude-code-analysis/src/utils/stream.ts
 * pieces: chunk-63641kq7.js (1)
 * attribution: fingerprint 1
 */

/**
 * Stream：push 式异步迭代器（queue + 挂起的 read promise），done() 结束，error() 抛给消费者，return() 时调用回调。
 */
//@ chunk-63641kq7.js:6066-7195 fingerprint = Stream (0.897)
class Stream {
  returned;
  queue = [];
  readResolve;
  readReject;
  isDone = !1;
  hasError;
  started = !1;
  constructor(e) {
    this.returned = e;
  }
  get ended() {
    return this.isDone;
  }
  [Symbol.asyncIterator]() {
    if (this.started) throw Error("Stream can only be iterated once");
    return ((this.started = !0), this);
  }
  next() {
    if (this.queue.length > 0) return Promise.resolve({ done: !1, value: this.queue.shift() });
    if (this.isDone) return Promise.resolve({ done: !0, value: void 0 });
    if (this.hasError) return Promise.reject(this.hasError);
    return new Promise((e, n) => {
      ((this.readResolve = e), (this.readReject = n));
    });
  }
  enqueue(e) {
    if (this.readResolve) {
      let readResolve = this.readResolve;
      ((this.readResolve = void 0), (this.readReject = void 0), readResolve({ done: !1, value: e }));
    } else this.queue.push(e);
  }
  dropNewestQueued(e) {
    let lastIndex = this.queue.findLastIndex(e);
    if (lastIndex !== -1) this.queue.splice(lastIndex, 1);
  }
  done() {
    if (((this.isDone = !0), this.readResolve)) {
      let readResolve = this.readResolve;
      ((this.readResolve = void 0), (this.readReject = void 0), readResolve({ done: !0, value: void 0 }));
    }
  }
  error(e) {
    if (((this.hasError = e), this.readReject)) {
      let readReject = this.readReject;
      ((this.readResolve = void 0), (this.readReject = void 0), readReject(e));
    }
  }
  return() {
    if (((this.isDone = !0), this.returned)) this.returned();
    return Promise.resolve({ done: !0, value: void 0 });
  }
}

export { Stream };
