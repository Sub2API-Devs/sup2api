/**
 * vscode-jsonrpc/lib/common/semaphore.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: vscode-jsonrpc@8.2.0..8.2.1
 * pieces: chunk-mvgr3jmb.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_ral } from "./ral.js";

//@ chunk-mvgr3jmb.js:18323-19284 cjs-fingerprint
var require_semaphore = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Semaphore = undefined;
  var ral_1 = require_ral();
  class Semaphore {
    constructor(capacity = 1) {
      if (capacity <= 0) throw Error("Capacity must be greater than 0");
      this._capacity = capacity;
      this._active = 0;
      this._waiting = [];
    }
    lock(thunk) {
      return new Promise((resolve, reject) => {
        this._waiting.push({
          thunk,
          resolve,
          reject,
        });
        this.runNext();
      });
    }
    get active() {
      return this._active;
    }
    runNext() {
      if (this._waiting.length === 0 || this._active === this._capacity) return;
      (0, ral_1.default)().timer.setImmediate(() => this.doRunNext());
    }
    doRunNext() {
      if (this._waiting.length === 0 || this._active === this._capacity) return;
      let next = this._waiting.shift();
      this._active++;
      if (this._active > this._capacity) throw Error("To many thunks active");
      try {
        let result = next.thunk();
        if (result instanceof Promise)
          result.then(
            (value) => {
              this._active--;
              next.resolve(value);
              this.runNext();
            },
            (err) => {
              this._active--;
              next.reject(err);
              this.runNext();
            },
          );
        else {
          this._active--;
          next.resolve(result);
          this.runNext();
        }
      } catch (err) {
        this._active--;
        next.reject(err);
        this.runNext();
      }
    }
  }
  cjsExports.Semaphore = Semaphore;
});
export { require_semaphore };
