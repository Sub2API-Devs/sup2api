/**
 * @mixmark-io/domino/lib/events.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @mixmark-io/domino@2.2.0
 * pieces: chunk-w04z664w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";
import { require_Event } from "./Event.js";
import { require_UIEvent } from "./UIEvent.js";
import { require_MouseEvent } from "./MouseEvent.js";
import { require_CustomEvent } from "./CustomEvent.js";

//@ chunk-w04z664w.js:76397-76494 cjs-fingerprint
var require_events = __commonJS(function (cjsExports, cjsModule) {
  cjsModule.exports = {
    Event: require_Event(),
    UIEvent: require_UIEvent(),
    MouseEvent: require_MouseEvent(),
    CustomEvent: require_CustomEvent(),
  };
});
export { require_events };
