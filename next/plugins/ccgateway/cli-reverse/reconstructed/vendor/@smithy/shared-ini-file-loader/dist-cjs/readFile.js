/**
 * @smithy/shared-ini-file-loader/dist-cjs/readFile.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-g8stk5cd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-g8stk5cd.js:1293-1663 cjs-fingerprint
var require_readFile = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.readFile = cjsExports.fileIntercept = cjsExports.filePromises = undefined;
  var promises_1 = importMetaRequire("fs/promises");
  cjsExports.filePromises = {};
  cjsExports.fileIntercept = {};
  var readFile = (path, options) => {
    if (cjsExports.fileIntercept[path] !== undefined) return cjsExports.fileIntercept[path];
    if (!cjsExports.filePromises[path] || options?.ignoreCache)
      cjsExports.filePromises[path] = promises_1.readFile(path, "utf8");
    return cjsExports.filePromises[path];
  };
  cjsExports.readFile = readFile;
});
export { require_readFile };
