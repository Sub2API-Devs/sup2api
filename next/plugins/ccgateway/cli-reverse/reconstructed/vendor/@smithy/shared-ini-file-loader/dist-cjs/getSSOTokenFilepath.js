/**
 * @smithy/shared-ini-file-loader/dist-cjs/getSSOTokenFilepath.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-g8stk5cd.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { require_getHomeDir } from "./getHomeDir.js";

//@ chunk-g8stk5cd.js:666-951 cjs-fingerprint
var require_getSSOTokenFilepath = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.getSSOTokenFilepath = undefined;
  var crypto_1 = importMetaRequire("crypto");
  var path_1 = importMetaRequire("path");
  var getHomeDir_1 = require_getHomeDir();
  var getSSOTokenFilepath = (id) => {
    let cacheName = crypto_1.createHash("sha1").update(id).digest("hex");
    return path_1.join(getHomeDir_1.getHomeDir(), ".aws", "sso", "cache", `${cacheName}.json`);
  };
  cjsExports.getSSOTokenFilepath = getSSOTokenFilepath;
});
export { require_getSSOTokenFilepath };
