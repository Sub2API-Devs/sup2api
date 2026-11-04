/**
 * @mixmark-io/domino/lib/Location.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_URL } from "./URL.js";
import { require_URLUtils } from "./URLUtils.js";

//@ chunk-vwj6ccer.js:234995-235461 cjs-fingerprint
var require_Location = __commonJS(function (cjsExports, cjsModule) {
  var URLModule = require_URL();
  var URLUtils = require_URLUtils();
  cjsModule.exports = Location;
  function Location(_window, href) {
    this._window = _window;
    this._href = href;
  }
  Location.prototype = Object.create(URLUtils.prototype, {
    constructor: {
      value: Location,
    },
    href: {
      get: function () {
        return this._href;
      },
      set: function (v) {
        this.assign(v);
      },
    },
    assign: {
      value: function (url) {
        var current = new URLModule(this._href);
        var newurl = current.resolve(url);
        this._href = newurl;
      },
    },
    replace: {
      value: function (url) {
        this.assign(url);
      },
    },
    reload: {
      value: function () {
        this.assign(this.href);
      },
    },
    toString: {
      value: function () {
        return this.href;
      },
    },
  });
});
export { require_Location };
