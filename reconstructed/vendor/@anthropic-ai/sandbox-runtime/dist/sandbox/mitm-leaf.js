/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mitm-leaf.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (7)
 * attribution: esm-fingerprint 6, esm-layout 1
 */
import { createSecureContext } from "tls";
import { isIP } from "net";
import { No, randomSerial, daysFromNow, caSubjectKeyId, signCertificateNative } from "./mitm-ca.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:665429-666350 esm-fingerprint
function mintLeafCert(ca, hostname) {
  let { pki } = No();
  let cached = cacheGet(ca.leafCerts, hostname);
  if (cached) return cached;
  let keys = ca.leafKeyPair ?? (ca.leafKeyPair = pki.rsa.generateKeyPair(2048));
  let cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerial();
  let notBefore = daysFromNow(-1);
  cert.validity.notBefore = notBefore;
  cert.validity.notAfter = clampValidity(ca.cert, notBefore);
  cert.setSubject([
    {
      name: "commonName",
      value: hostname,
    },
  ]);
  cert.setIssuer(ca.cert.subject.attributes);
  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: false,
      critical: true,
    },
    {
      name: "keyUsage",
      critical: true,
      digitalSignature: true,
      keyEncipherment: true,
    },
    {
      name: "extKeyUsage",
      serverAuth: true,
    },
    {
      name: "subjectAltName",
      altNames: [sanFor(hostname)],
    },
    {
      name: "subjectKeyIdentifier",
    },
    {
      name: "authorityKeyIdentifier",
      keyIdentifier: caSubjectKeyId(ca.cert),
    },
    ...(ca.crlUrl
      ? [
          {
            name: "cRLDistributionPoints",
            altNames: [
              {
                type: 6,
                value: ca.crlUrl,
              },
            ],
          },
        ]
      : []),
  ]);
  signCertificateNative(cert, ca.keyPem);
  let leaf = {
    certPem: pki.certificateToPem(cert) + ca.certPem,
    keyPem: pki.privateKeyToPem(keys.privateKey),
  };
  cacheSet(ca.leafCerts, hostname, leaf, ca.cacheLimit ?? LEAF_CACHE_LIMIT);
  logForDebugging_2(`[mitm-leaf] minted RSA leaf for ${hostname}`);
  return leaf;
}
//@ chunk-fq0cr76a.js:666350-666514 esm-fingerprint
function secureContextFor(ca, hostname) {
  let cached = cacheGet(ca.secureContexts, hostname);
  if (cached) return cached;
  let { certPem, keyPem } = mintLeafCert(ca, hostname);
  let ctx = createSecureContext({
    cert: certPem,
    key: keyPem,
  });
  cacheSet(ca.secureContexts, hostname, ctx, ca.cacheLimit ?? LEAF_CACHE_LIMIT);
  return ctx;
}
//@ chunk-fq0cr76a.js:666514-666577 esm-fingerprint
function sanFor(hostname) {
  return isIP(hostname) !== 0
    ? {
        type: 7,
        ip: hostname,
      }
    : {
        type: 2,
        value: hostname,
      };
}
//@ chunk-fq0cr76a.js:666577-666685 esm-fingerprint
function clampValidity(caCert, notBefore) {
  let caEnd = caCert.validity.notAfter;
  let max = new Date(notBefore);
  max.setDate(max.getDate() + 99);
  return caEnd < max ? new Date(caEnd) : max;
}
//@ chunk-fq0cr76a.js:666685-666696 esm-layout
var LEAF_CACHE_LIMIT = 256;
//@ chunk-fq0cr76a.js:666696-666774 esm-fingerprint
function cacheGet(cache, key) {
  let value = cache.get(key);
  if (value !== undefined) {
    cache.delete(key);
    cache.set(key, value);
  }
  return value;
}
//@ chunk-fq0cr76a.js:666774-666861 esm-fingerprint
function cacheSet(cache, key, value, limit) {
  cache.set(key, value);
  for (let oldest of cache.keys()) {
    if (cache.size <= limit) break;
    cache.delete(oldest);
  }
}
export { secureContextFor };
