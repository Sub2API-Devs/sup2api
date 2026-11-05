/**
 * vscode-jsonrpc/lib/common/events.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_ral } from "./ral.js";

//@ chunk-mvgr3jmb.js:14005-15793 cjs-fingerprint
var require_events = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Emitter = cjsExports.Event = undefined;
  var ral_1 = require_ral();
  var EventType;
  (function (eventNamespace) {
    let _disposable = {
      dispose() {},
    };
    eventNamespace.None = function () {
      return _disposable;
    };
  })(EventType || (cjsExports.Event = EventType = {}));
  class CallbackList {
    add(callback, context = null, bucket) {
      if (!this._callbacks) {
        this._callbacks = [];
        this._contexts = [];
      }
      this._callbacks.push(callback);
      this._contexts.push(context);
      if (Array.isArray(bucket))
        bucket.push({
          dispose: () => this.remove(callback, context),
        });
    }
    remove(callback, context = null) {
      if (!this._callbacks) return;
      let foundCallbackWithDifferentContext = false;
      for (let i = 0, len = this._callbacks.length; i < len; i++)
        if (this._callbacks[i] === callback)
          if (this._contexts[i] === context) {
            this._callbacks.splice(i, 1);
            this._contexts.splice(i, 1);
            return;
          } else foundCallbackWithDifferentContext = true;
      if (foundCallbackWithDifferentContext)
        throw Error("When adding a listener with a context, you should remove it with the same context");
    }
    invoke(...args) {
      if (!this._callbacks) return [];
      let ret = [];
      let callbacks = this._callbacks.slice(0);
      let contexts = this._contexts.slice(0);
      for (let i = 0, len = callbacks.length; i < len; i++)
        try {
          ret.push(callbacks[i].apply(contexts[i], args));
        } catch (e) {
          (0, ral_1.default)().console.error(e);
        }
      return ret;
    }
    isEmpty() {
      return !this._callbacks || this._callbacks.length === 0;
    }
    dispose() {
      this._callbacks = undefined;
      this._contexts = undefined;
    }
  }
  class Emitter {
    constructor(_options) {
      this._options = _options;
    }
    get event() {
      if (!this._event)
        this._event = (listener, thisArgs, disposables) => {
          if (!this._callbacks) this._callbacks = new CallbackList();
          if (this._options && this._options.onFirstListenerAdd && this._callbacks.isEmpty())
            this._options.onFirstListenerAdd(this);
          this._callbacks.add(listener, thisArgs);
          let result = {
            dispose: () => {
              if (!this._callbacks) return;
              this._callbacks.remove(listener, thisArgs);
              result.dispose = Emitter._noop;
              if (this._options && this._options.onLastListenerRemove && this._callbacks.isEmpty())
                this._options.onLastListenerRemove(this);
            },
          };
          if (Array.isArray(disposables)) disposables.push(result);
          return result;
        };
      return this._event;
    }
    fire(event) {
      if (this._callbacks) this._callbacks.invoke.call(this._callbacks, event);
    }
    dispose() {
      if (this._callbacks) {
        this._callbacks.dispose();
        this._callbacks = undefined;
      }
    }
  }
  cjsExports.Emitter = Emitter;
  Emitter._noop = function () {};
});
export { require_events };
