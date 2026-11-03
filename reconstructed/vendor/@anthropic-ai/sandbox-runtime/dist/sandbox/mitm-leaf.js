/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mitm-leaf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { createSecureContext } from "tls";
import { isIP, isIP as isIP_2, isIP as isIP_3, isIP as isIP_4, isIP as isIP_5 } from "net";
import { No, lE, kf, nE, rE } from "./mitm-ca.js";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:665429-666350 esm-fingerprint
function L5(e, n) {
  let { pki: pki } = No(),
    s = HC(e.leafCerts, n);
  if (s) return s;
  let h = e.leafKeyPair ?? (e.leafKeyPair = pki.rsa.generateKeyPair(2048)),
    certificate = pki.createCertificate();
  ((certificate.publicKey = h.publicKey), (certificate.serialNumber = lE()));
  let b = kf(-1);
  ((certificate.validity.notBefore = b),
    (certificate.validity.notAfter = U5(e.cert, b)),
    certificate.setSubject([{ name: "commonName", value: n }]),
    certificate.setIssuer(e.cert.subject.attributes),
    certificate.setExtensions([
      { name: "basicConstraints", cA: !1, critical: !0 },
      { name: "keyUsage", critical: !0, digitalSignature: !0, keyEncipherment: !0 },
      { name: "extKeyUsage", serverAuth: !0 },
      { name: "subjectAltName", altNames: [B5(n)] },
      { name: "subjectKeyIdentifier" },
      { name: "authorityKeyIdentifier", keyIdentifier: nE(e.cert) },
      ...(e.crlUrl ? [{ name: "cRLDistributionPoints", altNames: [{ type: 6, value: e.crlUrl }] }] : []),
    ]),
    rE(certificate, e.keyPem));
  let S = {
    certPem: pki.certificateToPem(certificate) + e.certPem,
    keyPem: pki.privateKeyToPem(h.privateKey),
  };
  return (KC(e.leafCerts, n, S, e.cacheLimit ?? GC), At(`[mitm-leaf] minted RSA leaf for ${n}`), S);
}
//@ chunk-fq0cr76a.js:666350-666514 esm-fingerprint
function WC(e, n) {
  let r = HC(e.secureContexts, n);
  if (r) return r;
  let { certPem: certPem, keyPem: keyPem } = L5(e, n),
    y = createSecureContext({ cert: certPem, key: keyPem });
  return (KC(e.secureContexts, n, y, e.cacheLimit ?? GC), y);
}
//@ chunk-fq0cr76a.js:666514-666577 esm-fingerprint
function B5(e) {
  return isIP_4(e) !== 0 ? { type: 7, ip: e } : { type: 2, value: e };
}
//@ chunk-fq0cr76a.js:666577-666685 esm-fingerprint
function U5(e, n) {
  let notAfter = e.validity.notAfter,
    date = new Date(n);
  return (date.setDate(date.getDate() + 99), notAfter < date ? new Date(notAfter) : date);
}
//@ chunk-fq0cr76a.js:666685-666696 esm-layout
var GC = 256;
//@ chunk-fq0cr76a.js:666696-666774 esm-fingerprint
function HC(e, n) {
  let r = e.get(n);
  if (r !== void 0) (e.delete(n), e.set(n, r));
  return r;
}
//@ chunk-fq0cr76a.js:666774-666861 esm-fingerprint
function KC(e, n, r, s) {
  e.set(n, r);
  for (let h of e.keys()) {
    if (e.size <= s) break;
    e.delete(h);
  }
}

export { WC };
