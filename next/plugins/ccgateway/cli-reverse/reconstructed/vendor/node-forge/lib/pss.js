/**
 * node-forge/lib/pss.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_random } from "./random.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:158728-160885 cjs-fingerprint
var require_pss = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_random();
  require_util();
  var pss = (cjsModule.exports = forge.pss = forge.pss || {});
  pss.create = function (options) {
    if (arguments.length === 3)
      options = {
        md: arguments[0],
        mgf: arguments[1],
        saltLength: arguments[2],
      };
    var hash = options.md;
    var mgf = options.mgf;
    var hLen = hash.digestLength;
    var salt_ = options.salt || null;
    if (typeof salt_ === "string") salt_ = forge.util.createBuffer(salt_);
    var sLen;
    if ("saltLength" in options) sLen = options.saltLength;
    else if (salt_ !== null) sLen = salt_.length();
    else throw Error("Salt length not specified or specific salt not given.");
    if (salt_ !== null && salt_.length() !== sLen)
      throw Error("Given salt length does not match length of given salt.");
    var prng = options.prng || forge.random;
    var pssobj = {};
    pssobj.encode = function (md, modBits) {
      var i;
      var emBits = modBits - 1;
      var emLen = Math.ceil(emBits / 8);
      var mHash = md.digest().getBytes();
      if (emLen < hLen + sLen + 2) throw Error("Message is too long to encrypt.");
      var salt;
      if (salt_ === null) salt = prng.getBytesSync(sLen);
      else salt = salt_.bytes();
      var m_ = new forge.util.ByteBuffer();
      m_.fillWithByte(0, 8);
      m_.putBytes(mHash);
      m_.putBytes(salt);
      hash.start();
      hash.update(m_.getBytes());
      var h = hash.digest().getBytes();
      var ps = new forge.util.ByteBuffer();
      ps.fillWithByte(0, emLen - sLen - hLen - 2);
      ps.putByte(1);
      ps.putBytes(salt);
      var db = ps.getBytes();
      var maskLen = emLen - hLen - 1;
      var dbMask = mgf.generate(h, maskLen);
      var maskedDB = "";
      for (i = 0; i < maskLen; i++) maskedDB += String.fromCharCode(db.charCodeAt(i) ^ dbMask.charCodeAt(i));
      var mask = (65280 >> (8 * emLen - emBits)) & 255;
      maskedDB = String.fromCharCode(maskedDB.charCodeAt(0) & ~mask) + maskedDB.substr(1);
      return maskedDB + h + String.fromCharCode(188);
    };
    pssobj.verify = function (mHash, em, modBits) {
      var i;
      var emBits = modBits - 1;
      var emLen = Math.ceil(emBits / 8);
      em = em.substr(-emLen);
      if (emLen < hLen + sLen + 2) throw Error("Inconsistent parameters to PSS signature verification.");
      if (em.charCodeAt(emLen - 1) !== 188) throw Error("Encoded message does not end in 0xBC.");
      var maskLen = emLen - hLen - 1;
      var maskedDB = em.substr(0, maskLen);
      var h = em.substr(maskLen, hLen);
      var mask = (65280 >> (8 * emLen - emBits)) & 255;
      if ((maskedDB.charCodeAt(0) & mask) !== 0) throw Error("Bits beyond keysize not zero as expected.");
      var dbMask = mgf.generate(h, maskLen);
      var db = "";
      for (i = 0; i < maskLen; i++) db += String.fromCharCode(maskedDB.charCodeAt(i) ^ dbMask.charCodeAt(i));
      db = String.fromCharCode(db.charCodeAt(0) & ~mask) + db.substr(1);
      var checkLen = emLen - hLen - sLen - 2;
      for (i = 0; i < checkLen; i++)
        if (db.charCodeAt(i) !== 0) throw Error("Leftmost octets not zero as expected");
      if (db.charCodeAt(checkLen) !== 1) throw Error("Inconsistent PSS signature, 0x01 marker not found");
      var salt = db.substr(-sLen);
      var m_ = new forge.util.ByteBuffer();
      m_.fillWithByte(0, 8);
      m_.putBytes(mHash);
      m_.putBytes(salt);
      hash.start();
      hash.update(m_.getBytes());
      var h_ = hash.digest().getBytes();
      return h === h_;
    };
    return pssobj;
  };
});
export { require_pss };
