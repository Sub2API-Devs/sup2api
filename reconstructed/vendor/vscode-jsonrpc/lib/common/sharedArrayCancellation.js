/**
 * vscode-jsonrpc/lib/common/sharedArrayCancellation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Ve } from "./cancellation.js";

//@ chunk-t4ksmxzx.js:16783-17959 cjs-fingerprint
var Ur = x(function (Fr) {
  Object.defineProperty(Fr, "__esModule", { value: !0 });
  Fr.SharedArrayReceiverStrategy = Fr.SharedArraySenderStrategy = void 0;
  var Dr = Ve(),
    Ie;
  (function (e) {
    ((e.Continue = 0), (e.Cancelled = 1));
  })(Ie || (Ie = {}));
  class Br {
    constructor() {
      this.buffers = new Map();
    }
    enableCancellation(e) {
      if (e.id === null) return;
      let sharedArrayBuffer = new SharedArrayBuffer(4),
        int32Array = new Int32Array(sharedArrayBuffer, 0, 1);
      ((int32Array[0] = Ie.Continue),
        this.buffers.set(e.id, sharedArrayBuffer),
        (e.$cancellationData = sharedArrayBuffer));
    }
    async sendCancellation(e, r) {
      let n = this.buffers.get(r);
      if (n === void 0) return;
      let int32Array = new Int32Array(n, 0, 1);
      Atomics.store(int32Array, 0, Ie.Cancelled);
    }
    cleanup(e) {
      this.buffers.delete(e);
    }
    dispose() {
      this.buffers.clear();
    }
  }
  Fr.SharedArraySenderStrategy = Br;
  class Ar {
    constructor(e) {
      this.data = new Int32Array(e, 0, 1);
    }
    get isCancellationRequested() {
      return Atomics.load(this.data, 0) === Ie.Cancelled;
    }
    get onCancellationRequested() {
      throw Error("Cancellation over SharedArrayBuffer doesn't support cancellation events");
    }
  }
  class zr {
    constructor(e) {
      this.token = new Ar(e);
    }
    cancel() {}
    dispose() {}
  }
  class Wr {
    constructor() {
      this.kind = "request";
    }
    createCancellationTokenSource(e) {
      let $cancellationData = e.$cancellationData;
      if ($cancellationData === void 0) return new Dr.CancellationTokenSource();
      return new zr($cancellationData);
    }
  }
  Fr.SharedArrayReceiverStrategy = Wr;
});

export { Ur };
