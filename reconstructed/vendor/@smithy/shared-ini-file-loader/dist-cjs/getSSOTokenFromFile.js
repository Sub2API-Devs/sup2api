/**
 * @smithy/shared-ini-file-loader/dist-cjs/getSSOTokenFromFile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";
import { _ } from "./getSSOTokenFilepath.js";

//@ chunk-a1ttyqdw.js:951-1293 cjs-fingerprint
var q = x(function (k) {
  Object.defineProperty(k, "__esModule", { value: !0 });
  k.getSSOTokenFromFile = k.tokenIntercept = void 0;
  var L = importMetaRequire("fs/promises"),
    N = _();
  k.tokenIntercept = {};
  var ee = async (e) => {
    if (k.tokenIntercept[e]) return k.tokenIntercept[e];
    let sSOTokenFilepath = N.getSSOTokenFilepath(e),
      content = await L.readFile(sSOTokenFilepath, "utf8");
    return JSON.parse(content);
  };
  k.getSSOTokenFromFile = ee;
});

export { q };
