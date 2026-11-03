/**
 * @mixmark-io/domino/lib/Window.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { Er } from "./DOMImplementation.js";
import { Ka } from "./EventTarget.js";
import { Cc } from "./Location.js";
import { ee } from "./utils.js";
import { kc } from "./NavigatorID.js";
import { Mc } from "./WindowTimers.js";
import { ni } from "./impl.js";

//@ chunk-vwj6ccer.js:236322-237189 cjs-fingerprint
var ii = x(function (Jd, Ic) {
  var Tf = Er(),
    yf = Ka(),
    Nf = Cc(),
    vr = ee();
  Ic.exports = ya;
  function ya(e) {
    ((this.document = e || new Tf(null).createHTMLDocument("")),
      (this.document._scripting_enabled = !0),
      (this.document.defaultView = this),
      (this.location = new Nf(this, this.document._address || "about:blank")));
  }
  ya.prototype = Object.create(yf.prototype, {
    console: { value: console },
    history: { value: { back: vr.nyi, forward: vr.nyi, go: vr.nyi } },
    navigator: { value: kc() },
    window: {
      get: function () {
        return this;
      },
    },
    self: {
      get: function () {
        return this;
      },
    },
    frames: {
      get: function () {
        return this;
      },
    },
    parent: {
      get: function () {
        return this;
      },
    },
    top: {
      get: function () {
        return this;
      },
    },
    length: { value: 0 },
    frameElement: { value: null },
    opener: { value: null },
    onload: {
      get: function () {
        return this._getEventHandler("load");
      },
      set: function (e) {
        this._setEventHandler("load", e);
      },
    },
    getComputedStyle: {
      value: function (t) {
        return t.style;
      },
    },
  });
  vr.expose(Mc(), ya);
  vr.expose(ni(), ya);
});

export { ii };
