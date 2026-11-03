/**
 * @mixmark-io/domino/lib/CustomEvent.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-vwj6ccer.js (1)
 * attribution: cjs-require-graph 1
 */
import { x } from "../../../../runtime/bun-runtime.js";
import { require_Event } from "./Event.js";

//@ chunk-vwj6ccer.js:76243-76397 cjs-require-graph
var require_CustomEvent = x(function (cjsExports, cjsModule) {
  cjsModule.exports = CustomEvent;
  var g0 = require_Event();
  function CustomEvent(type, dictionary) {
    g0.call(this, type, dictionary);
  }
  CustomEvent.prototype = Object.create(g0.prototype, {
    constructor: {
      value: CustomEvent,
    },
  });
});
export { require_CustomEvent };
