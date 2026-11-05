/**
 * @grpc/grpc-js/build/src/picker.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_metadata } from "./metadata.js";
import { require_constants } from "./constants.js";

//@ chunk-3k21nfa0.js:30566-31540 cjs-fingerprint
var require_picker = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.QueuePicker = cjsExports.UnavailablePicker = cjsExports.PickResultType = undefined;
  var metadata_1 = require_metadata();
  var constants_1 = require_constants();
  var PickResultType;
  (function (PickResultType) {
    PickResultType[(PickResultType.COMPLETE = 0)] = "COMPLETE";
    PickResultType[(PickResultType.QUEUE = 1)] = "QUEUE";
    PickResultType[(PickResultType.TRANSIENT_FAILURE = 2)] = "TRANSIENT_FAILURE";
    PickResultType[(PickResultType.DROP = 3)] = "DROP";
  })(PickResultType || (cjsExports.PickResultType = PickResultType = {}));
  class UnavailablePicker {
    constructor(status) {
      this.status = Object.assign(
        {
          code: constants_1.Status.UNAVAILABLE,
          details: "No connection established",
          metadata: new metadata_1.Metadata(),
        },
        status,
      );
    }
    pick(pickArgs) {
      return {
        pickResultType: PickResultType.TRANSIENT_FAILURE,
        subchannel: null,
        status: this.status,
        onCallStarted: null,
        onCallEnded: null,
      };
    }
  }
  cjsExports.UnavailablePicker = UnavailablePicker;
  class QueuePicker {
    constructor(loadBalancer, childPicker) {
      this.loadBalancer = loadBalancer;
      this.childPicker = childPicker;
      this.calledExitIdle = false;
    }
    pick(pickArgs) {
      if (!this.calledExitIdle) {
        process.nextTick(() => {
          this.loadBalancer.exitIdle();
        });
        this.calledExitIdle = true;
      }
      if (this.childPicker) return this.childPicker.pick(pickArgs);
      else
        return {
          pickResultType: PickResultType.QUEUE,
          subchannel: null,
          status: null,
          onCallStarted: null,
          onCallEnded: null,
        };
    }
  }
  cjsExports.QueuePicker = QueuePicker;
});
export { require_picker };
