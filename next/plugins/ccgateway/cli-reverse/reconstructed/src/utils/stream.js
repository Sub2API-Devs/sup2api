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

//@ chunk-63641kq7.js:6066-7195 fingerprint (2.1.88 match: Stream, 0.897)
/**
 * Stream：push 式异步迭代器（queue + 挂起的 read promise），done() 结束，error() 抛给消费者，return() 时调用回调。
 */
class Stream {
  returned;
  queue = [];
  readResolve;
  readReject;
  isDone = false;
  hasError;
  started = false;
  constructor(returned) {
    this.returned = returned;
  }
  get ended() {
    return this.isDone;
  }
  [Symbol.asyncIterator]() {
    if (this.started) throw Error("Stream can only be iterated once");
    this.started = true;
    return this;
  }
  next() {
    if (this.queue.length > 0)
      return Promise.resolve({
        done: false,
        value: this.queue.shift(),
      });
    if (this.isDone)
      return Promise.resolve({
        done: true,
        value: undefined,
      });
    if (this.hasError) return Promise.reject(this.hasError);
    return new Promise((resolve, reject) => {
      this.readResolve = resolve;
      this.readReject = reject;
    });
  }
  enqueue(value) {
    if (this.readResolve) {
      let resolve = this.readResolve;
      this.readResolve = undefined;
      this.readReject = undefined;
      resolve({
        done: false,
        value,
      });
    } else this.queue.push(value);
  }
  dropNewestQueued(predicate) {
    let lastIndex = this.queue.findLastIndex(predicate);
    if (lastIndex !== -1) this.queue.splice(lastIndex, 1);
  }
  done() {
    this.isDone = true;
    if (this.readResolve) {
      let resolve = this.readResolve;
      this.readResolve = undefined;
      this.readReject = undefined;
      resolve({
        done: true,
        value: undefined,
      });
    }
  }
  error(error) {
    this.hasError = error;
    if (this.readReject) {
      let reject = this.readReject;
      this.readResolve = undefined;
      this.readReject = undefined;
      reject(error);
    }
  }
  return() {
    this.isDone = true;
    if (this.returned) this.returned();
    return Promise.resolve({
      done: true,
      value: undefined,
    });
  }
}
export { Stream };
