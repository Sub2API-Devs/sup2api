/**
 * node-forge/lib/pki.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_asn1 } from "./asn1.js";
import { require_oids } from "./oids.js";
import { require_pbe } from "./pbe.js";
import { require_pem } from "./pem.js";
import { require_pbkdf2 } from "./pbkdf2.js";
import { require_pkcs12 } from "./pkcs12.js";
import { require_pss } from "./pss.js";
import { require_rsa } from "./rsa.js";
import { require_util } from "./util.js";
import { require_x509 } from "./x509.js";

//@ chunk-fq0cr76a.js:210710-211753 cjs-fingerprint
var require_pki = x(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_asn1();
  require_oids();
  require_pbe();
  require_pem();
  require_pbkdf2();
  require_pkcs12();
  require_pss();
  require_rsa();
  require_util();
  require_x509();
  var asn1 = forge.asn1;
  var pki = (cjsModule.exports = forge.pki = forge.pki || {});
  pki.pemToDer = function (pem) {
    var msg = forge.pem.decode(pem)[0];
    if (msg.procType && msg.procType.type === "ENCRYPTED")
      throw Error("Could not convert PEM to DER; PEM is encrypted.");
    return forge.util.createBuffer(msg.body);
  };
  pki.privateKeyFromPem = function (pem) {
    var msg = forge.pem.decode(pem)[0];
    if (msg.type !== "PRIVATE KEY" && msg.type !== "RSA PRIVATE KEY") {
      var error = Error(
        'Could not convert private key from PEM; PEM header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".',
      );
      error.headerType = msg.type;
      throw error;
    }
    if (msg.procType && msg.procType.type === "ENCRYPTED")
      throw Error("Could not convert private key from PEM; PEM is encrypted.");
    var obj = asn1.fromDer(msg.body);
    return pki.privateKeyFromAsn1(obj);
  };
  pki.privateKeyToPem = function (key, maxline) {
    var msg = {
      type: "RSA PRIVATE KEY",
      body: asn1.toDer(pki.privateKeyToAsn1(key)).getBytes(),
    };
    return forge.pem.encode(msg, {
      maxline,
    });
  };
  pki.privateKeyInfoToPem = function (pki, maxline) {
    var msg = {
      type: "PRIVATE KEY",
      body: asn1.toDer(pki).getBytes(),
    };
    return forge.pem.encode(msg, {
      maxline,
    });
  };
});
export { require_pki };
