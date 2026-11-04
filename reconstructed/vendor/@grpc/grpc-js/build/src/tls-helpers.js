/**
 * @grpc/grpc-js/build/src/tls-helpers.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-pwh5dx3n.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS as x, importMetaRequire as Be } from "../../../../../runtime/bun-runtime.js";

//@ chunk-pwh5dx3n.js:10380-10712 cjs-fingerprint
var fa = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CIPHER_SUITES = undefined;
  cjsExports.getDefaultRootsData = getDefaultRootsData;
  var fs = Be("fs");
  cjsExports.CIPHER_SUITES = process.env.GRPC_SSL_CIPHER_SUITES;
  var DEFAULT_ROOTS_FILE_PATH = process.env.GRPC_DEFAULT_SSL_ROOTS_FILE_PATH;
  var defaultRootsData = null;
  function getDefaultRootsData() {
    if (DEFAULT_ROOTS_FILE_PATH) {
      if (defaultRootsData === null) defaultRootsData = fs.readFileSync(DEFAULT_ROOTS_FILE_PATH);
      return defaultRootsData;
    }
    return null;
  }
});
export { fa };
