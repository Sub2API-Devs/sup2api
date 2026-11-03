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
  #e = void 0;
  #n = !1;
  provide(e) {
    this.#e = e;
  }
  canAsk() {
    return this.#e !== void 0;
  }
  askOnce({ workerEpoch: e, deadlineMs: n }) {
    if (this.#e === void 0 || this.#n) return !1;
    return (
      (this.#n = !0),
      this.#e(
        { subtype: "remote_tools_reannounce", worker_epoch: e, deadline_ms: n },
        AbortSignal.timeout(n),
      ),
      !0
    );
  }
}

export { ReannounceRequester };
