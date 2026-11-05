/**
 * @mixmark-io/domino/lib/Window.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_DOMImplementation } from "./DOMImplementation.js";
import { require_EventTarget } from "./EventTarget.js";
import { require_Location } from "./Location.js";
import { require_utils } from "./utils.js";
import { require_NavigatorID } from "./NavigatorID.js";
import { require_WindowTimers } from "./WindowTimers.js";
import { require_impl } from "./impl.js";

//@ chunk-w04z664w.js:236322-237189 cjs-fingerprint
var require_Window = __commonJS(function (cjsExports, cjsModule) {
  var DOMImplementation = require_DOMImplementation();
  var EventTargetModule = require_EventTarget();
  var Location = require_Location();
  var utils = require_utils();
  cjsModule.exports = Window;
  function Window(doc) {
    this.document = doc || new DOMImplementation(null).createHTMLDocument("");
    this.document._scripting_enabled = true;
    this.document.defaultView = this;
    this.location = new Location(this, this.document._address || "about:blank");
  }
  Window.prototype = Object.create(EventTargetModule.prototype, {
    console: {
      value: console,
    },
    history: {
      value: {
        back: utils.nyi,
        forward: utils.nyi,
        go: utils.nyi,
      },
    },
    navigator: {
      value: require_NavigatorID(),
    },
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
    length: {
      value: 0,
    },
    frameElement: {
      value: null,
    },
    opener: {
      value: null,
    },
    onload: {
      get: function () {
        return this._getEventHandler("load");
      },
      set: function (v) {
        this._setEventHandler("load", v);
      },
    },
    getComputedStyle: {
      value: function (elt) {
        return elt.style;
      },
    },
  });
  utils.expose(require_WindowTimers(), Window);
  utils.expose(require_impl(), Window);
});
export { require_Window };
