/**
 * @smithy/shared-ini-file-loader/dist-cjs/readFile.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @smithy/shared-ini-file-loader@4.4.0..4.4.3
 * pieces: chunk-a1ttyqdw.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../../runtime/bun-runtime.js";

//@ chunk-a1ttyqdw.js:1293-1663 cjs-fingerprint
var V = x(function (K) {
  Object.defineProperty(K, "__esModule", { value: !0 });
  K.readFile = K.fileIntercept = K.filePromises = void 0;
  var M = importMetaRequire("fs/promises");
  K.filePromises = {};
  K.fileIntercept = {};
  var te = (e, t) => {
    if (K.fileIntercept[e] !== void 0) return K.fileIntercept[e];
    if (!K.filePromises[e] || t?.ignoreCache) K.filePromises[e] = M.readFile(e, "utf8");
    return K.filePromises[e];
  };
  K.readFile = te;
});

export { V };
