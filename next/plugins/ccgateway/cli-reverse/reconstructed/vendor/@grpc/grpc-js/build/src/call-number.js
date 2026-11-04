/**
 * @grpc/grpc-js/build/src/call-number.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:185435-185569 cjs-fingerprint
var require_call_number = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getNextCallNumber = getNextCallNumber;
  var nextCallNumber = 0;
  function getNextCallNumber() {
    return nextCallNumber++;
  }
});
export { require_call_number };
