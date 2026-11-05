/**
 * @grpc/grpc-js/build/src/connectivity-state.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:30265-30566 cjs-fingerprint
var require_connectivity_state = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.ConnectivityState = undefined;
  var ConnectivityState;
  (function (ConnectivityState) {
    ConnectivityState[(ConnectivityState.IDLE = 0)] = "IDLE";
    ConnectivityState[(ConnectivityState.CONNECTING = 1)] = "CONNECTING";
    ConnectivityState[(ConnectivityState.READY = 2)] = "READY";
    ConnectivityState[(ConnectivityState.TRANSIENT_FAILURE = 3)] = "TRANSIENT_FAILURE";
    ConnectivityState[(ConnectivityState.SHUTDOWN = 4)] = "SHUTDOWN";
  })(ConnectivityState || (cjsExports.ConnectivityState = ConnectivityState = {}));
});
export { require_connectivity_state };
