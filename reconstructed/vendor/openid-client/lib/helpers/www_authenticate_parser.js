/**
 * openid-client/lib/helpers/www_authenticate_parser.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../../runtime/bun-runtime.js";

//@ chunk-1ny7cxrt.js:8430-8617 cjs-fingerprint
var cy = x(function (Dve, IO) {
  var cF = /(\w+)=("[^"]*")/g;
  IO.exports = (e) => {
    let t = {};
    try {
      while (cF.exec(e) !== null) if (RegExp.$1 && RegExp.$2) t[RegExp.$1] = RegExp.$2.slice(1, -1);
    } catch (error) {}
    return t;
  };
});

export { cy };
