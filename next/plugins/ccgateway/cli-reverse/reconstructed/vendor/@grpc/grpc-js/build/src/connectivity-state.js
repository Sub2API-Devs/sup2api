/**
 * @grpc/grpc-js/build/src/connectivity-state.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:30265-30566 cjs-fingerprint
var Ae = x(function (cjsExports) {
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
export { Ae };
