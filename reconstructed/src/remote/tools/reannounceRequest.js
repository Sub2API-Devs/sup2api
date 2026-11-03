/**
 * remote/tools/reannounceRequest.ts
 *
 * 2.1.316 新增：请求重新通告远程工具
 *
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * new in 2.1.316 (2.1.88 has no file at this path)
 * pieces: chunk-g3pbeen0.js (1)
 * attribution: placement 1
 */

//@ chunk-g3pbeen0.js:191-466 placement
class ReannounceRequester {
  #e = undefined;
  #n = false;
  provide(e) {
    this.#e = e;
  }
  canAsk() {
    return this.#e !== undefined;
  }
  askOnce({ workerEpoch, deadlineMs }) {
    if (this.#e === undefined || this.#n) return false;
    this.#n = true;
    this.#e(
      {
        subtype: "remote_tools_reannounce",
        worker_epoch: workerEpoch,
        deadline_ms: deadlineMs,
      },
      AbortSignal.timeout(deadlineMs),
    );
    return true;
  }
}
export { ReannounceRequester };
