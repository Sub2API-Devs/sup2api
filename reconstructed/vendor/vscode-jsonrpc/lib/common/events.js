/**
 * vscode-jsonrpc/lib/common/events.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { de } from "./ral.js";

//@ chunk-t4ksmxzx.js:13641-15429 cjs-fingerprint
var _e = x(function (Or) {
  Object.defineProperty(Or, "__esModule", { value: !0 });
  Or.Emitter = Or.Event = void 0;
  var zi = de(),
    Lr;
  (function (e) {
    let r = { dispose() {} };
    e.None = function () {
      return r;
    };
  })(Lr || (Or.Event = Lr = {}));
  class Nr {
    add(e, r = null, n) {
      if (!this._callbacks) ((this._callbacks = []), (this._contexts = []));
      if ((this._callbacks.push(e), this._contexts.push(r), Array.isArray(n)))
        n.push({ dispose: () => this.remove(e, r) });
    }
    remove(e, r = null) {
      if (!this._callbacks) return;
      let n = !1;
      for (let s = 0, c = this._callbacks.length; s < c; s++)
        if (this._callbacks[s] === e)
          if (this._contexts[s] === r) {
            (this._callbacks.splice(s, 1), this._contexts.splice(s, 1));
            return;
          } else n = !0;
      if (n) throw Error("When adding a listener with a context, you should remove it with the same context");
    }
    invoke(...e) {
      if (!this._callbacks) return [];
      let r = [],
        sliced = this._callbacks.slice(0),
        sliced_2 = this._contexts.slice(0);
      for (let c = 0, h = sliced.length; c < h; c++)
        try {
          r.push(sliced[c].apply(sliced_2[c], e));
        } catch (error) {
          (0, zi.default)().console.error(error);
        }
      return r;
    }
    isEmpty() {
      return !this._callbacks || this._callbacks.length === 0;
    }
    dispose() {
      ((this._callbacks = void 0), (this._contexts = void 0));
    }
  }
  class He {
    constructor(e) {
      this._options = e;
    }
    get event() {
      if (!this._event)
        this._event = (e, r, n) => {
          if (!this._callbacks) this._callbacks = new Nr();
          if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty())
            this._options.onFirstListenerAdd(this);
          this._callbacks.add(e, r);
          let s = {
            dispose: () => {
              if (!this._callbacks) return;
              if (
                (this._callbacks.remove(e, r),
                (s.dispose = He._noop),
                this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty())
              )
                this._options.onLastListenerRemove(this);
            },
          };
          if (Array.isArray(n)) n.push(s);
          return s;
        };
      return this._event;
    }
    fire(e) {
      if (this._callbacks) this._callbacks.invoke.call(this._callbacks, e);
    }
    dispose() {
      if (this._callbacks) (this._callbacks.dispose(), (this._callbacks = void 0));
    }
  }
  Or.Emitter = He;
  He._noop = function () {};
});

export { _e };
