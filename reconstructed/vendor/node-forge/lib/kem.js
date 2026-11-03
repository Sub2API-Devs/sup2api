/**
 * node-forge/lib/kem.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_util } from "./util.js";
import { require_random } from "./random.js";
import { require_jsbn } from "./jsbn.js";

//@ chunk-fq0cr76a.js:274277-275290 cjs-fingerprint
var require_kem = x(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_util();
  require_random();
  require_jsbn();
  cjsModule.exports = forge.kem = forge.kem || {};
  var BigInteger = forge.jsbn.BigInteger;
  forge.kem.rsa = {};
  forge.kem.rsa.create = function (kdf, options) {
    options = options || {};
    var prng = options.prng || forge.random;
    var kem = {};
    kem.encrypt = function (publicKey, keyLength) {
      var byteLength = Math.ceil(publicKey.n.bitLength() / 8);
      var r;
      do r = new BigInteger(forge.util.bytesToHex(prng.getBytesSync(byteLength)), 16).mod(publicKey.n);
      while (r.compareTo(BigInteger.ONE) <= 0);
      r = forge.util.hexToBytes(r.toString(16));
      var zeros = byteLength - r.length;
      if (zeros > 0) r = forge.util.fillString(String.fromCharCode(0), zeros) + r;
      var encapsulation = publicKey.encrypt(r, "NONE");
      var key = kdf.generate(r, keyLength);
      return {
        encapsulation,
        key,
      };
    };
    kem.decrypt = function (privateKey, encapsulation, keyLength) {
      var r = privateKey.decrypt(encapsulation, "NONE");
      return kdf.generate(r, keyLength);
    };
    return kem;
  };
  forge.kem.kdf1 = function (md, digestLength) {
    _createKDF(this, md, 0, digestLength || md.digestLength);
  };
  forge.kem.kdf2 = function (md, digestLength) {
    _createKDF(this, md, 1, digestLength || md.digestLength);
  };
  function _createKDF(kdf, md, counterStart, digestLength) {
    kdf.generate = function (x, length) {
      var key = new forge.util.ByteBuffer();
      var k = Math.ceil(length / digestLength) + counterStart;
      var c = new forge.util.ByteBuffer();
      for (var i = counterStart; i < k; ++i) {
        c.putInt32(i);
        md.start();
        md.update(x + c.getBytes());
        var hash = md.digest();
        key.putBytes(hash.getBytes(digestLength));
      }
      key.truncate(key.length() - length);
      return key.getBytes();
    };
  }
});
export { require_kem };
