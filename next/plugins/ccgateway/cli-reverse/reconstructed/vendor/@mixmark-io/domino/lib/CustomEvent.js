/**
 * @mixmark-io/domino/lib/CustomEvent.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-require-graph 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Event } from "./Event.js";

//@ chunk-w04z664w.js:76243-76397 cjs-require-graph
var require_CustomEvent = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = CustomEvent;
  var EventModule = require_Event();
  function CustomEvent(type, dictionary) {
    EventModule.call(this, type, dictionary);
  }
  CustomEvent.prototype = Object.create(EventModule.prototype, {
    constructor: {
      value: CustomEvent,
    },
  });
});
export { require_CustomEvent };
