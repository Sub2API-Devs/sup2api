/**
 * vscode-jsonrpc/lib/common/cancellation.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-t4ksmxzx.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_ral } from "./ral.js";
import { require_is } from "./is.js";
import { require_events } from "./events.js";

//@ chunk-t4ksmxzx.js:15429-16783 cjs-fingerprint
var require_cancellation = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CancellationTokenSource = cjsExports.CancellationToken = undefined;
  var ral_1 = require_ral();
  var Is = require_is();
  var events_1 = require_events();
  var CancellationToken;
  (function (CancellationToken) {
    CancellationToken.None = Object.freeze({
      isCancellationRequested: false,
      onCancellationRequested: events_1.Event.None,
    });
    CancellationToken.Cancelled = Object.freeze({
      isCancellationRequested: true,
      onCancellationRequested: events_1.Event.None,
    });
    function is(value) {
      let candidate = value;
      return (
        candidate &&
        (candidate === CancellationToken.None ||
          candidate === CancellationToken.Cancelled ||
          (Is.boolean(candidate.isCancellationRequested) && !!candidate.onCancellationRequested))
      );
    }
    CancellationToken.is = is;
  })(CancellationToken || (cjsExports.CancellationToken = CancellationToken = {}));
  var shortcutEvent = Object.freeze(function (callback, context) {
    let handle = (0, ral_1.default)().timer.setTimeout(callback.bind(context), 0);
    return {
      dispose() {
        handle.dispose();
      },
    };
  });
  class MutableToken {
    constructor() {
      this._isCancelled = false;
    }
    cancel() {
      if (!this._isCancelled) {
        this._isCancelled = true;
        if (this._emitter) {
          this._emitter.fire(undefined);
          this.dispose();
        }
      }
    }
    get isCancellationRequested() {
      return this._isCancelled;
    }
    get onCancellationRequested() {
      if (this._isCancelled) return shortcutEvent;
      if (!this._emitter) this._emitter = new events_1.Emitter();
      return this._emitter.event;
    }
    dispose() {
      if (this._emitter) {
        this._emitter.dispose();
        this._emitter = undefined;
      }
    }
  }
  class CancellationTokenSource {
    get token() {
      if (!this._token) this._token = new MutableToken();
      return this._token;
    }
    cancel() {
      if (!this._token) this._token = CancellationToken.Cancelled;
      else this._token.cancel();
    }
    dispose() {
      if (!this._token) this._token = CancellationToken.None;
      else if (this._token instanceof MutableToken) this._token.dispose();
    }
  }
  cjsExports.CancellationTokenSource = CancellationTokenSource;
});
export { require_cancellation };
