/**
 * @mixmark-io/domino/lib/UIEvent.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Event } from "./Event.js";

//@ chunk-w04z664w.js:1261-1526 cjs-fingerprint
var require_UIEvent = __commonJS(function (cjsExports, cjsModule) {
  var EventModule = require_Event();
  cjsModule.exports = UIEvent;
  function UIEvent() {
    EventModule.call(this);
    this.view = null;
    this.detail = 0;
  }
  UIEvent.prototype = Object.create(EventModule.prototype, {
    constructor: {
      value: UIEvent,
    },
    initUIEvent: {
      value: function (type, bubbles, cancelable, view, detail) {
        this.initEvent(type, bubbles, cancelable);
        this.view = view;
        this.detail = detail;
      },
    },
  });
});
export { require_UIEvent };
