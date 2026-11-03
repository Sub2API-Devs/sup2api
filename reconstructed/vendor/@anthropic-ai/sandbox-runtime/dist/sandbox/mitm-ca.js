/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mitm-ca.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (23)
 * attribution: esm-layout 3, esm-fingerprint 20
 */
import { sign, X509Certificate } from "crypto";
import { rm } from "fs/promises";
import { rmSync, readFileSync, writeFileSync, mkdtempSync } from "fs";
import { dirname, join } from "path";
import { rootCertificates } from "tls";
import { tmpdir } from "os";
import { EC } from "../../../../unresolved-cjs/index.js";
import { logForDebugging as logForDebugging_2 } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:645014-645021 esm-layout
var _C;
//@ chunk-fq0cr76a.js:645021-645056 esm-layout
function No() {
  return _C ?? (_C = EC());
}
//@ chunk-fq0cr76a.js:645056-645141 esm-fingerprint
var PEM_CERT_BLOCK = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g;
var CRL_PATH = "/srt.crl";
//@ chunk-fq0cr76a.js:645141-645326 esm-fingerprint
function caSubjectKeyId(caCert) {
  let { util } = No();
  let extension = caCert.getExtension("subjectKeyIdentifier");
  return extension?.subjectKeyIdentifier
    ? util.hexToBytes(extension.subjectKeyIdentifier)
    : caCert.generateSubjectKeyIdentifier().getBytes();
}
//@ chunk-fq0cr76a.js:645326-645587 esm-fingerprint
function signCertificateNative(cert, keyPem) {
  let { asn1, pki, md } = No();
  let oid = pki.oids.sha256WithRSAEncryption;
  cert.siginfo.algorithmOid = oid;
  cert.signatureOid = oid;
  cert.tbsCertificate = pki.getTBSCertificate(cert);
  let tbsDer = asn1.toDer(cert.tbsCertificate).getBytes();
  cert.signature = rsaSha256SignNative(tbsDer, keyPem);
  cert.md = md.sha256.create();
  cert.md.update(tbsDer);
}
//@ chunk-fq0cr76a.js:645587-645669 esm-fingerprint
function rsaSha256SignNative(der, keyPem) {
  return sign("sha256", Buffer.from(der, "binary"), keyPem).toString("binary");
}
//@ chunk-fq0cr76a.js:645669-646166 esm-fingerprint
function createMitmCA(opts) {
  if (opts.caCertPem && opts.caKeyPem) {
    let v = validateCaPair(opts.caCertPem, opts.caKeyPem);
    if (!v.ok) throw Error(`tlsTerminate: CA PEM pair: ${v.reason}`);
    return buildMitmCA(opts.caCertPem, opts.caKeyPem, v.cert, v.key, {
      certPath: opts.caCertPath ?? "",
      keyPath: opts.caKeyPath ?? "",
      extraCaCertPaths: opts.extraCaCertPaths,
    });
  }
  if (opts.caCertPath && opts.caKeyPath)
    return loadCA(opts.caCertPath, opts.caKeyPath, opts.extraCaCertPaths);
  if (opts.caCertPath || opts.caKeyPath)
    throw Error("tlsTerminate: caCertPath and caKeyPath must be provided together");
  return generateEphemeralCA(opts.extraCaCertPaths);
}
//@ chunk-fq0cr76a.js:646166-646316 esm-fingerprint
async function disposeMitmCA(ca) {
  for (let dir of ownedDirs(ca))
    try {
      await rm(dir, {
        recursive: true,
        force: true,
      });
    } catch (err) {
      logForDebugging_2(`[mitm-ca] cleanup failed: ${err.message}`, {
        level: "warn",
      });
    }
}
//@ chunk-fq0cr76a.js:646316-646454 esm-fingerprint
function disposeMitmCASync(ca) {
  for (let dir of ownedDirs(ca))
    try {
      rmSync(dir, {
        recursive: true,
        force: true,
      });
    } catch (err) {
      logForDebugging_2(`[mitm-ca] cleanup failed: ${err.message}`, {
        level: "warn",
      });
    }
}
//@ chunk-fq0cr76a.js:646454-646554 esm-fingerprint
function ownedDirs(ca) {
  let dirs = new Set([dirname(ca.trustBundlePath)]);
  if (ca.ephemeral) dirs.add(dirname(ca.certPath));
  return dirs;
}
//@ chunk-fq0cr76a.js:646554-647057 esm-fingerprint
function writeTrustBundle(dir, caCertPem, extraCaCertPaths) {
  let parts = [caCertPem.trim(), ...rootCertificates];
  let extra = process.env.NODE_EXTRA_CA_CERTS;
  if (extra)
    try {
      parts.push(readFileSync(extra, "utf8").trim());
    } catch {}
  for (let extraPath of extraCaCertPaths ?? []) {
    let raw;
    try {
      raw = readFileSync(extraPath, "utf8");
    } catch (err) {
      let code = err.code ?? String(err);
      logForDebugging_2(`[mitm-ca] extraCaCertPaths: cannot read ${extraPath} (${code}); skipping`, {
        level: "warn",
      });
      continue;
    }
    let certs = raw.match(PEM_CERT_BLOCK);
    if (!certs) {
      logForDebugging_2(`[mitm-ca] extraCaCertPaths: ${extraPath} has no PEM CERTIFICATE block; skipping`, {
        level: "warn",
      });
      continue;
    }
    parts.push(...certs);
  }
  let path = join(dir, "trust-bundle.crt");
  writeFileSync(
    path,
    parts.join(`
`) +
      `
`,
    {
      mode: 420,
    },
  );
  return path;
}
//@ chunk-fq0cr76a.js:647057-647857 esm-fingerprint
function generateEmptyCrl(cert, keyPem) {
  let { asn1, pki } = No();
  let { Class: C, Type: T } = asn1;
  let sha256WithRSAEncryption = pki.oids.sha256WithRSAEncryption;
  let sigAlg = () =>
    seq([
      asn1.create(C.UNIVERSAL, T.OID, false, asn1.oidToDer(sha256WithRSAEncryption).getBytes()),
      asn1.create(C.UNIVERSAL, T.NULL, false, ""),
    ]);
  let ext = (oid, value) =>
    seq([
      asn1.create(C.UNIVERSAL, T.OID, false, asn1.oidToDer(oid).getBytes()),
      asn1.create(C.UNIVERSAL, T.OCTETSTRING, false, asn1.toDer(value).getBytes()),
    ]);
  let crlExtensions = asn1.create(C.CONTEXT_SPECIFIC, 0, true, [
    seq([
      ext(
        pki.oids.authorityKeyIdentifier,
        seq([asn1.create(C.CONTEXT_SPECIFIC, 0, false, caSubjectKeyId(cert))]),
      ),
      ext("2.5.29.20", asn1.create(C.UNIVERSAL, T.INTEGER, false, "\x01")),
    ]),
  ]);
  let now = new Date();
  let caEnd = cert.validity.notAfter;
  let nextUpdate = caEnd > now ? caEnd : daysFromNow(1);
  let tbsCertList = seq([
    asn1.create(C.UNIVERSAL, T.INTEGER, false, "\x01"),
    sigAlg(),
    pki.distinguishedNameToAsn1(cert.subject),
    asn1Time(now),
    asn1Time(nextUpdate),
    crlExtensions,
  ]);
  let sig = rsaSha256SignNative(asn1.toDer(tbsCertList).getBytes(), keyPem);
  let crl = seq([tbsCertList, sigAlg(), asn1.create(C.UNIVERSAL, T.BITSTRING, false, "\x00" + sig)]);
  return Buffer.from(asn1.toDer(crl).getBytes(), "binary");
}
//@ chunk-fq0cr76a.js:647857-647953 esm-layout
function seq(e) {
  let { asn1 } = No();
  let { Class, Type } = asn1;
  return asn1.create(Class.UNIVERSAL, Type.SEQUENCE, true, e);
}
//@ chunk-fq0cr76a.js:647953-648159 esm-fingerprint
function asn1Time(d) {
  let { asn1 } = No();
  let { Class, Type } = asn1;
  return d.getUTCFullYear() < 2050
    ? asn1.create(Class.UNIVERSAL, Type.UTCTIME, false, asn1.dateToUtcTime(d))
    : asn1.create(Class.UNIVERSAL, Type.GENERALIZEDTIME, false, asn1.dateToGeneralizedTime(d));
}
//@ chunk-fq0cr76a.js:648159-648455 esm-fingerprint
function loadCA(certPath, keyPath, extraCaCertPaths) {
  let certPem = readPem(certPath, "CERTIFICATE", "tlsTerminate.caCertPath");
  let keyPem = readPem(keyPath, "PRIVATE KEY", "tlsTerminate.caKeyPath");
  let v = validateCaPair(certPem, keyPem);
  if (!v.ok) throw Error(`tlsTerminate: CA at ${certPath}: ${v.reason}`);
  logForDebugging_2(`[mitm-ca] loaded CA from ${certPath}`);
  return buildMitmCA(certPem, keyPem, v.cert, v.key, {
    certPath,
    keyPath,
    extraCaCertPaths,
  });
}
//@ chunk-fq0cr76a.js:648455-648710 esm-fingerprint
function buildMitmCA(certPem, keyPem, cert, key, opts) {
  let bundleDir = mkdtempSync(join(tmpdir(), "srt-ca-"));
  return {
    certPath: opts.certPath,
    keyPath: opts.keyPath,
    trustBundlePath: writeTrustBundle(bundleDir, certPem, opts.extraCaCertPaths),
    certPem,
    keyPem,
    cert,
    key,
    leafCerts: new Map(),
    secureContexts: new Map(),
    crlDer: generateEmptyCrl(cert, keyPem),
    ephemeral: opts.ephemeral ?? false,
  };
}
//@ chunk-fq0cr76a.js:648710-649353 esm-fingerprint
function generateCa(opts = {}) {
  let { pki } = No();
  let keys = pki.rsa.generateKeyPair(2048);
  let cert = pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = randomSerial();
  cert.validity.notBefore = daysFromNow(-1);
  cert.validity.notAfter = daysFromNow(opts.validityDays ?? 825);
  let subject = [
    {
      name: "commonName",
      value: opts.cn ?? "sandbox-runtime ephemeral CA",
    },
    {
      name: "organizationName",
      value: "sandbox-runtime",
    },
  ];
  cert.setSubject(subject);
  cert.setIssuer(subject);
  cert.setExtensions([
    {
      name: "basicConstraints",
      cA: true,
      critical: true,
    },
    {
      name: "keyUsage",
      critical: true,
      keyCertSign: true,
      cRLSign: true,
      digitalSignature: true,
    },
    {
      name: "subjectKeyIdentifier",
    },
  ]);
  let keyPem = pki.privateKeyToPem(keys.privateKey);
  signCertificateNative(cert, keyPem);
  return {
    certPem: pki.certificateToPem(cert),
    keyPem,
    cert,
    key: keys.privateKey,
  };
}
//@ chunk-fq0cr76a.js:649353-649428 esm-fingerprint
function certThumbprint(certPem) {
  return new X509Certificate(certPem).fingerprint.replace(/:/g, "").toUpperCase();
}
//@ chunk-fq0cr76a.js:649428-650044 esm-fingerprint
function validateCaPair(certPem, keyPem) {
  let { pki } = No();
  let cert;
  let key;
  try {
    cert = pki.certificateFromPem(certPem);
    key = pki.privateKeyFromPem(keyPem);
  } catch (err) {
    return {
      ok: false,
      reason: `parse: ${err.message}`,
    };
  }
  if (!("n" in key) || !("d" in key))
    return {
      ok: false,
      reason: "key is not RSA",
    };
  if (cert.validity.notBefore.getTime() > Date.now())
    return {
      ok: false,
      reason: `notBefore ${cert.validity.notBefore.toISOString()} is in the future (clock skew?)`,
    };
  let pub = cert.publicKey;
  if (!("n" in pub) || pub.n.compareTo(key.n))
    return {
      ok: false,
      reason: "key does not match certificate public key",
    };
  let thumbprint;
  try {
    thumbprint = certThumbprint(certPem);
  } catch (err) {
    return {
      ok: false,
      reason: `thumbprint: ${err.message}`,
    };
  }
  return {
    ok: true,
    thumbprint,
    notAfter: cert.validity.notAfter,
    cert,
    key,
  };
}
//@ chunk-fq0cr76a.js:650044-650319 esm-fingerprint
function generateEphemeralCA(extraCaCertPaths) {
  let { certPem, keyPem, cert, key } = generateCa();
  let dir = mkdtempSync(join(tmpdir(), "srt-ca-"));
  let certPath = join(dir, "ca.crt");
  let keyPath = join(dir, "ca.key");
  writeFileSync(certPath, certPem, {
    mode: 420,
  });
  writeFileSync(keyPath, keyPem, {
    mode: 384,
  });
  logForDebugging_2(`[mitm-ca] generated ephemeral CA at ${certPath}`);
  return buildMitmCA(certPem, keyPem, cert, key, {
    certPath,
    keyPath,
    extraCaCertPaths,
    ephemeral: true,
  });
}
//@ chunk-fq0cr76a.js:650319-650548 esm-fingerprint
function readPem(path, label, field) {
  let pem;
  try {
    pem = readFileSync(path, "utf8");
  } catch (err) {
    let code = err.code ?? String(err);
    throw Error(`${field}: cannot read ${path} (${code})`);
  }
  if (!new RegExp(`-----BEGIN [A-Z ]*${label}-----`).test(pem))
    throw Error(`${field}: ${path} is not a PEM ${label}`);
  return pem;
}
//@ chunk-fq0cr76a.js:650548-650677 esm-fingerprint
function randomSerial() {
  let { random, util } = No();
  let hex = util.bytesToHex(random.getBytesSync(16));
  return ((parseInt(hex[0], 16) & 3) | 4).toString(16) + hex.slice(1);
}
//@ chunk-fq0cr76a.js:650677-650741 esm-fingerprint
function daysFromNow(days) {
  let d = new Date();
  d.setDate(d.getDate() + days);
  return d;
}
export {
  certThumbprint,
  No,
  randomSerial,
  daysFromNow,
  caSubjectKeyId,
  signCertificateNative,
  CRL_PATH,
  disposeMitmCASync,
  createMitmCA,
  disposeMitmCA,
  validateCaPair,
  generateCa,
};
