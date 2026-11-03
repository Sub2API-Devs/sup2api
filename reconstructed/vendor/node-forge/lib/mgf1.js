/**
 * node-forge/lib/mgf1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";

//@ chunk-fq0cr76a.js:158192-158596 cjs-fingerprint
var require_mgf1 = x(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  forge.mgf = forge.mgf || {};
  var mgf1 = (cjsModule.exports = forge.mgf.mgf1 = forge.mgf1 = forge.mgf1 || {});
  mgf1.create = function (md) {
    var mgf = {
      generate: function (seed, maskLen) {
        var t = new forge.util.ByteBuffer();
        var len = Math.ceil(maskLen / md.digestLength);
        for (var i = 0; i < len; i++) {
          var c = new forge.util.ByteBuffer();
          c.putInt32(i);
          md.start();
          md.update(seed + c.getBytes());
          t.putBuffer(md.digest());
        }
        t.truncate(t.length() - maskLen);
        return t.getBytes();
      },
    };
    return mgf;
  };
});
export { require_mgf1 };
