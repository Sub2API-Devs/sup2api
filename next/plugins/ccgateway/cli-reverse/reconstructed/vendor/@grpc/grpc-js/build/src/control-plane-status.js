/**
 * @grpc/grpc-js/build/src/control-plane-status.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_constants } from "./constants.js";

//@ chunk-3k21nfa0.js:190993-191465 cjs-fingerprint
var require_control_plane_status = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.restrictControlPlaneStatusCode = restrictControlPlaneStatusCode;
  var constants_1 = require_constants();
  var INAPPROPRIATE_CONTROL_PLANE_CODES = [
    constants_1.Status.OK,
    constants_1.Status.INVALID_ARGUMENT,
    constants_1.Status.NOT_FOUND,
    constants_1.Status.ALREADY_EXISTS,
    constants_1.Status.FAILED_PRECONDITION,
    constants_1.Status.ABORTED,
    constants_1.Status.OUT_OF_RANGE,
    constants_1.Status.DATA_LOSS,
  ];
  function restrictControlPlaneStatusCode(code, details) {
    if (INAPPROPRIATE_CONTROL_PLANE_CODES.includes(code))
      return {
        code: constants_1.Status.INTERNAL,
        details: `Invalid status from control plane: ${code} ${constants_1.Status[code]} ${details}`,
      };
    else
      return {
        code,
        details,
      };
  }
});
export { require_control_plane_status };
