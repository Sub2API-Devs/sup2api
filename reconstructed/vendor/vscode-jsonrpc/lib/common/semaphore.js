/**
 * vscode-jsonrpc/lib/common/semaphore.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { de } from "./ral.js";

//@ chunk-t4ksmxzx.js:17959-18920 cjs-fingerprint
var vt = x(function (Jr) {
  Object.defineProperty(Jr, "__esModule", { value: !0 });
  Jr.Semaphore = void 0;
  var Ji = de();
  class Vr {
    constructor(e = 1) {
      if (e <= 0) throw Error("Capacity must be greater than 0");
      ((this._capacity = e), (this._active = 0), (this._waiting = []));
    }
    lock(e) {
      return new Promise((r, n) => {
        (this._waiting.push({ thunk: e, resolve: r, reject: n }), this.runNext());
      });
    }
    get active() {
      return this._active;
    }
    runNext() {
      if (this._waiting.length === 0 || this._active === this._capacity) return;
      (0, Ji.default)().timer.setImmediate(() => this.doRunNext());
    }
    doRunNext() {
      if (this._waiting.length === 0 || this._active === this._capacity) return;
      let e = this._waiting.shift();
      if ((this._active++, this._active > this._capacity)) throw Error("To many thunks active");
      try {
        let thunk = e.thunk();
        if (thunk instanceof Promise)
          thunk.then(
            (n) => {
              (this._active--, e.resolve(n), this.runNext());
            },
            (n) => {
              (this._active--, e.reject(n), this.runNext());
            },
          );
        else (this._active--, e.resolve(thunk), this.runNext());
      } catch (error) {
        (this._active--, e.reject(error), this.runNext());
      }
    }
  }
  Jr.Semaphore = Vr;
});

export { vt };
