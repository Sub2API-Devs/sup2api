/**
 * @grpc/grpc-js/build/src/error.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:5985-6294 cjs-fingerprint
var Qi = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getErrorMessage = getErrorMessage;
  cjsExports.getErrorCode = getErrorCode;
  function getErrorMessage(error) {
    if (error instanceof Error) return error.message;
    else return String(error);
  }
  function getErrorCode(error) {
    if (typeof error === "object" && error !== null && "code" in error && typeof error.code === "number")
      return error.code;
    else return null;
  }
});
export { Qi };
