/**
 * vscode-jsonrpc/lib/common/cancellation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { de } from "./ral.js";
import { we } from "./is.js";
import { _e } from "./events.js";

//@ chunk-t4ksmxzx.js:15429-16783 cjs-fingerprint
var Ve = x(function (qr) {
  Object.defineProperty(qr, "__esModule", { value: !0 });
  qr.CancellationTokenSource = qr.CancellationToken = void 0;
  var Fi = de(),
    jr = we(),
    Se = _e(),
    Ue;
  (function (e) {
    ((e.None = Object.freeze({ isCancellationRequested: !1, onCancellationRequested: Se.Event.None })),
      (e.Cancelled = Object.freeze({ isCancellationRequested: !0, onCancellationRequested: Se.Event.None })));
    function r(n) {
      let s = n;
      return (
        s &&
        (s === e.None ||
          s === e.Cancelled ||
          (jr.boolean(s.isCancellationRequested) && !!s.onCancellationRequested))
      );
    }
    e.is = r;
  })(Ue || (qr.CancellationToken = Ue = {}));
  var freeze = Object.freeze(function (e, r) {
    let n = (0, Fi.default)().timer.setTimeout(e.bind(r), 0);
    return {
      dispose() {
        n.dispose();
      },
    };
  });
  class bt {
    constructor() {
      this._isCancelled = !1;
    }
    cancel() {
      if (!this._isCancelled) {
        if (((this._isCancelled = !0), this._emitter)) (this._emitter.fire(void 0), this.dispose());
      }
    }
    get isCancellationRequested() {
      return this._isCancelled;
    }
    get onCancellationRequested() {
      if (this._isCancelled) return freeze;
      if (!this._emitter) this._emitter = new Se.Emitter();
      return this._emitter.event;
    }
    dispose() {
      if (this._emitter) (this._emitter.dispose(), (this._emitter = void 0));
    }
  }
  class $r {
    get token() {
      if (!this._token) this._token = new bt();
      return this._token;
    }
    cancel() {
      if (!this._token) this._token = Ue.Cancelled;
      else this._token.cancel();
    }
    dispose() {
      if (!this._token) this._token = Ue.None;
      else if (this._token instanceof bt) this._token.dispose();
    }
  }
  qr.CancellationTokenSource = $r;
});

export { Ve };
