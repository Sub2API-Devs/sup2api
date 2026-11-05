/**
 * openid-client/lib/helpers/www_authenticate_parser.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../runtime/bun-runtime.js";

//@ chunk-1hnjmk23.js:8799-8986 cjs-fingerprint
var require_www_authenticate_parser = __commonJS(function (cjsExports, cjsModule) {
  var REGEXP = /(\w+)=("[^"]*")/g;
  cjsModule.exports = (wwwAuthenticate) => {
    let params = {};
    try {
      while (REGEXP.exec(wwwAuthenticate) !== null)
        if (RegExp.$1 && RegExp.$2) params[RegExp.$1] = RegExp.$2.slice(1, -1);
    } catch (err) {}
    return params;
  };
});
export { require_www_authenticate_parser };
