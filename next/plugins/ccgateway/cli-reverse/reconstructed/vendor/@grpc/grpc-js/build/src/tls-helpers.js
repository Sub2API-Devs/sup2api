/**
 * @grpc/grpc-js/build/src/tls-helpers.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @grpc/grpc-js@1.14.4
 * pieces: chunk-3k21nfa0.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";

//@ chunk-3k21nfa0.js:10380-10712 cjs-fingerprint
var require_tls_helpers = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.CIPHER_SUITES = undefined;
  cjsExports.getDefaultRootsData = getDefaultRootsData;
  var fs = importMetaRequire("fs");
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
export { require_tls_helpers };
