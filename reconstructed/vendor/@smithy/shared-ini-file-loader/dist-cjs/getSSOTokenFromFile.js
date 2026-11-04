/**
 * @smithy/shared-ini-file-loader/dist-cjs/getSSOTokenFromFile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_getSSOTokenFilepath } from "./getSSOTokenFilepath.js";

//@ chunk-a1ttyqdw.js:951-1293 cjs-fingerprint
var require_getSSOTokenFromFile = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSSOTokenFromFile = cjsExports.tokenIntercept = undefined;
  var promises_1 = importMetaRequire("fs/promises");
  var getSSOTokenFilepath_1 = require_getSSOTokenFilepath();
  cjsExports.tokenIntercept = {};
  var getSSOTokenFromFile = async (id) => {
    if (cjsExports.tokenIntercept[id]) return cjsExports.tokenIntercept[id];
    let ssoTokenFilepath = getSSOTokenFilepath_1.getSSOTokenFilepath(id);
    let ssoTokenText = await promises_1.readFile(ssoTokenFilepath, "utf8");
    return JSON.parse(ssoTokenText);
  };
  cjsExports.getSSOTokenFromFile = getSSOTokenFromFile;
});
export { require_getSSOTokenFromFile };
