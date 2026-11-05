/**
 * node-forge/lib/pbkdf2.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_hmac } from "./hmac.js";
import { require_md } from "./md.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:79783-81527 cjs-fingerprint
var require_pbkdf2 = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_hmac();
  require_md();
  require_util();
  var pkcs5 = (forge.pkcs5 = forge.pkcs5 || {});
  var nodeCrypto;
  if (forge.util.isNodejs && !forge.options.usePureJavaScript) nodeCrypto = importMetaRequire("crypto");
  cjsModule.exports =
    forge.pbkdf2 =
    pkcs5.pbkdf2 =
      function (p, s_2, c, dkLen, md, callback) {
        if (typeof md === "function") {
          callback = md;
          md = null;
        }
        if (
          forge.util.isNodejs &&
          !forge.options.usePureJavaScript &&
          nodeCrypto.pbkdf2 &&
          (md === null || typeof md !== "object") &&
          (nodeCrypto.pbkdf2Sync.length > 4 || !md || md === "sha1")
        ) {
          if (typeof md !== "string") md = "sha1";
          p = Buffer.from(p, "binary");
          s_2 = Buffer.from(s_2, "binary");
          if (!callback) {
            if (nodeCrypto.pbkdf2Sync.length === 4)
              return nodeCrypto.pbkdf2Sync(p, s_2, c, dkLen).toString("binary");
            return nodeCrypto.pbkdf2Sync(p, s_2, c, dkLen, md).toString("binary");
          }
          if (nodeCrypto.pbkdf2Sync.length === 4)
            return nodeCrypto.pbkdf2(p, s_2, c, dkLen, function (err, key) {
              if (err) return callback(err);
              callback(null, key.toString("binary"));
            });
          return nodeCrypto.pbkdf2(p, s_2, c, dkLen, md, function (err, key) {
            if (err) return callback(err);
            callback(null, key.toString("binary"));
          });
        }
        if (typeof md === "undefined" || md === null) md = "sha1";
        if (typeof md === "string") {
          if (!(md in forge.md.algorithms)) throw Error("Unknown hash algorithm: " + md);
          md = forge.md[md].create();
        }
        var hLen = md.digestLength;
        if (dkLen > 4294967295 * hLen) {
          var err = Error("Derived key is too long.");
          if (callback) return callback(err);
          throw err;
        }
        var len = Math.ceil(dkLen / hLen);
        var r = dkLen - (len - 1) * hLen;
        var prf = forge.hmac.create();
        prf.start(md, p);
        var dk = "";
        var xor;
        var u_c;
        var u_c1;
        if (!callback) {
          for (var i = 1; i <= len; ++i) {
            prf.start(null, null);
            prf.update(s_2);
            prf.update(forge.util.int32ToBytes(i));
            xor = u_c1 = prf.digest().getBytes();
            for (var j = 2; j <= c; ++j) {
              prf.start(null, null);
              prf.update(u_c1);
              u_c = prf.digest().getBytes();
              xor = forge.util.xorBytes(xor, u_c, hLen);
              u_c1 = u_c;
            }
            dk += i < len ? xor : xor.substr(0, r);
          }
          return dk;
        }
        var i = 1;
        var j;
        function outer() {
          if (i > len) return callback(null, dk);
          prf.start(null, null);
          prf.update(s_2);
          prf.update(forge.util.int32ToBytes(i));
          xor = u_c1 = prf.digest().getBytes();
          j = 2;
          inner();
        }
        function inner() {
          if (j <= c) {
            prf.start(null, null);
            prf.update(u_c1);
            u_c = prf.digest().getBytes();
            xor = forge.util.xorBytes(xor, u_c, hLen);
            u_c1 = u_c;
            ++j;
            return forge.util.setImmediate(inner);
          }
          dk += i < len ? xor : xor.substr(0, r);
          ++i;
          outer();
        }
        outer();
      };
});
export { require_pbkdf2 };
