/**
 * node-forge/lib/pki.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xi } from "./asn1.js";
import { Ja } from "./oids.js";
import { wS } from "./pbe.js";
import { sc } from "./pem.js";
import { Xh } from "./pbkdf2.js";
import { IS } from "./pkcs12.js";
import { sm } from "./pss.js";
import { xf } from "./rsa.js";
import { Zn } from "./util.js";
import { am } from "./x509.js";

//@ chunk-fq0cr76a.js:210710-211753 cjs-fingerprint
var kS = x(function (Lfe, IA) {
  var nl = Tn();
  Xi();
  Ja();
  wS();
  sc();
  Xh();
  IS();
  sm();
  xf();
  Zn();
  am();
  var asn1 = nl.asn1,
    pu = (IA.exports = nl.pki = nl.pki || {});
  pu.pemToDer = function (e) {
    var n = nl.pem.decode(e)[0];
    if (n.procType && n.procType.type === "ENCRYPTED")
      throw Error("Could not convert PEM to DER; PEM is encrypted.");
    return nl.util.createBuffer(n.body);
  };
  pu.privateKeyFromPem = function (e) {
    var n = nl.pem.decode(e)[0];
    if (n.type !== "PRIVATE KEY" && n.type !== "RSA PRIVATE KEY") {
      var r = Error(
        'Could not convert private key from PEM; PEM header type is not "PRIVATE KEY" or "RSA PRIVATE KEY".',
      );
      throw ((r.headerType = n.type), r);
    }
    if (n.procType && n.procType.type === "ENCRYPTED")
      throw Error("Could not convert private key from PEM; PEM is encrypted.");
    var fromDer = asn1.fromDer(n.body);
    return pu.privateKeyFromAsn1(fromDer);
  };
  pu.privateKeyToPem = function (e, n) {
    var r = { type: "RSA PRIVATE KEY", body: asn1.toDer(pu.privateKeyToAsn1(e)).getBytes() };
    return nl.pem.encode(r, { maxline: n });
  };
  pu.privateKeyInfoToPem = function (e, n) {
    var r = { type: "PRIVATE KEY", body: asn1.toDer(e).getBytes() };
    return nl.pem.encode(r, { maxline: n });
  };
});

export { kS };
