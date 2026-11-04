/**
 * @opentelemetry/api/build/src/baggage/context-helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @opentelemetry/api@1.9.0
 * pieces: chunk-bwbq4xvm.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_context_2 } from "../api/context.js";
import { require_context } from "../context/context.js";

//@ chunk-bwbq4xvm.js:47269-47752 cjs-fingerprint
var require_context_helpers = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.deleteBaggage =
    cjsExports.setBaggage =
    cjsExports.getActiveBaggage =
    cjsExports.getBaggage =
      undefined;
  var context_1 = require_context_2();
  var context_2 = require_context();
  var BAGGAGE_KEY = context_2.createContextKey("OpenTelemetry Baggage Key");
  function getBaggage(context) {
    return context.getValue(BAGGAGE_KEY) || undefined;
  }
  cjsExports.getBaggage = getBaggage;
  function getActiveBaggage() {
    return getBaggage(context_1.ContextAPI.getInstance().active());
  }
  cjsExports.getActiveBaggage = getActiveBaggage;
  function setBaggage(context, baggage) {
    return context.setValue(BAGGAGE_KEY, baggage);
  }
  cjsExports.setBaggage = setBaggage;
  function deleteBaggage(context) {
    return context.deleteValue(BAGGAGE_KEY);
  }
  cjsExports.deleteBaggage = deleteBaggage;
});
export { require_context_helpers };
