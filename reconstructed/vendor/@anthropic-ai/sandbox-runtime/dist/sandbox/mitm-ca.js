/**
 * @anthropic-ai/sandbox-runtime/dist/sandbox/mitm-ca.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sandbox-runtime@0.0.81
 * pieces: chunk-fq0cr76a.js (23)
 * attribution: esm-layout 3, esm-fingerprint 20
 */
import { sign, X509Certificate } from "crypto";
import { rm, rm as rm_2 } from "fs/promises";
import {
  rmSync,
  rmSync as rmSync_2,
  rmSync as rmSync_3,
  rmSync as rmSync_4,
  readFileSync,
  readFileSync as readFileSync_2,
  readFileSync as readFileSync_3,
  writeFileSync,
  mkdtempSync,
  mkdtempSync as mkdtempSync_2,
} from "fs";
import {
  dirname,
  dirname as dirname_2,
  dirname as dirname_3,
  dirname as dirname_4,
  dirname as dirname_5,
  dirname as dirname_6,
  dirname as dirname_7,
  dirname as dirname_8,
  join,
  join as join_2,
  join as join_3,
  join as join_4,
  join as join_5,
  join as join_6,
  join as join_7,
  join as join_8,
  join as join_9,
  join as join_10,
  join as join_11,
} from "path";
import { rootCertificates } from "tls";
import { tmpdir, tmpdir as tmpdir_2, tmpdir as tmpdir_3, tmpdir as tmpdir_4, tmpdir as tmpdir_5 } from "os";
import { EC } from "../../../../unresolved-cjs/index.js";
import { At } from "../utils/debug.js";

//@ chunk-fq0cr76a.js:645014-645021 esm-layout
var _C;
//@ chunk-fq0cr76a.js:645021-645056 esm-layout
function No() {
  return _C ?? (_C = EC());
}
//@ chunk-fq0cr76a.js:645056-645141 esm-fingerprint
var r5 = /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
  Sm = "/srt.crl";
//@ chunk-fq0cr76a.js:645141-645326 esm-fingerprint
function nE(e) {
  let { util: util } = No(),
    extension = e.getExtension("subjectKeyIdentifier");
  return extension?.subjectKeyIdentifier
    ? util.hexToBytes(extension.subjectKeyIdentifier)
    : e.generateSubjectKeyIdentifier().getBytes();
}
//@ chunk-fq0cr76a.js:645326-645587 esm-fingerprint
function rE(e, n) {
  let { asn1: asn1, pki: pki, md: md } = No(),
    sha256WithRSAEncryption = pki.oids.sha256WithRSAEncryption;
  ((e.siginfo.algorithmOid = sha256WithRSAEncryption),
    (e.signatureOid = sha256WithRSAEncryption),
    (e.tbsCertificate = pki.getTBSCertificate(e)));
  let bytes = asn1.toDer(e.tbsCertificate).getBytes();
  ((e.signature = CC(bytes, n)), (e.md = md.sha256.create()), e.md.update(bytes));
}
//@ chunk-fq0cr76a.js:645587-645669 esm-fingerprint
function CC(e, n) {
  return sign("sha256", Buffer.from(e, "binary"), n).toString("binary");
}
//@ chunk-fq0cr76a.js:645669-646166 esm-fingerprint
function sE(e) {
  if (e.caCertPem && e.caKeyPem) {
    let n = Em(e.caCertPem, e.caKeyPem);
    if (!n.ok) throw Error(`tlsTerminate: CA PEM pair: ${n.reason}`);
    return oE(e.caCertPem, e.caKeyPem, n.cert, n.key, {
      certPath: e.caCertPath ?? "",
      keyPath: e.caKeyPath ?? "",
      extraCaCertPaths: e.extraCaCertPaths,
    });
  }
  if (e.caCertPath && e.caKeyPath) return o5(e.caCertPath, e.caKeyPath, e.extraCaCertPaths);
  if (e.caCertPath || e.caKeyPath)
    throw Error("tlsTerminate: caCertPath and caKeyPath must be provided together");
  return a5(e.extraCaCertPaths);
}
//@ chunk-fq0cr76a.js:646166-646316 esm-fingerprint
async function RC(e) {
  for (let n of IC(e))
    try {
      await rm_2(n, { recursive: !0, force: !0 });
    } catch (error) {
      At(`[mitm-ca] cleanup failed: ${error.message}`, { level: "warn" });
    }
}
//@ chunk-fq0cr76a.js:646316-646454 esm-fingerprint
function iE(e) {
  for (let n of IC(e))
    try {
      rmSync(n, { recursive: !0, force: !0 });
    } catch (error) {
      At(`[mitm-ca] cleanup failed: ${error.message}`, { level: "warn" });
    }
}
//@ chunk-fq0cr76a.js:646454-646554 esm-fingerprint
function IC(e) {
  let n = new Set([dirname_3(e.trustBundlePath)]);
  if (e.ephemeral) n.add(dirname_3(e.certPath));
  return n;
}
//@ chunk-fq0cr76a.js:646554-647057 esm-fingerprint
function s5(e, n, r) {
  let s = [n.trim(), ...rootCertificates],
    envNodeExtraCaCerts = process.env.NODE_EXTRA_CA_CERTS;
  if (envNodeExtraCaCerts)
    try {
      s.push(readFileSync(envNodeExtraCaCerts, "utf8").trim());
    } catch {}
  for (let b of r ?? []) {
    let S;
    try {
      S = readFileSync(b, "utf8");
    } catch (error) {
      let D = error.code ?? String(error);
      At(`[mitm-ca] extraCaCertPaths: cannot read ${b} (${D}); skipping`, { level: "warn" });
      continue;
    }
    let match = S.match(r5);
    if (!match) {
      At(`[mitm-ca] extraCaCertPaths: ${b} has no PEM CERTIFICATE block; skipping`, { level: "warn" });
      continue;
    }
    s.push(...match);
  }
  let y = join_2(e, "trust-bundle.crt");
  return (
    writeFileSync(
      y,
      s.join(`
`) +
        `
`,
      { mode: 420 },
    ),
    y
  );
}
//@ chunk-fq0cr76a.js:647057-647857 esm-fingerprint
function i5(e, n) {
  let { asn1: asn1, pki: pki } = No(),
    { Class: Class, Type: Type } = asn1,
    sha256WithRSAEncryption = pki.oids.sha256WithRSAEncryption,
    S = () =>
      Su([
        asn1.create(Class.UNIVERSAL, Type.OID, !1, asn1.oidToDer(sha256WithRSAEncryption).getBytes()),
        asn1.create(Class.UNIVERSAL, Type.NULL, !1, ""),
      ]),
    w = (Z, J) =>
      Su([
        asn1.create(Class.UNIVERSAL, Type.OID, !1, asn1.oidToDer(Z).getBytes()),
        asn1.create(Class.UNIVERSAL, Type.OCTETSTRING, !1, asn1.toDer(J).getBytes()),
      ]),
    create = asn1.create(Class.CONTEXT_SPECIFIC, 0, !0, [
      Su([
        w(pki.oids.authorityKeyIdentifier, Su([asn1.create(Class.CONTEXT_SPECIFIC, 0, !1, nE(e))])),
        w("2.5.29.20", asn1.create(Class.UNIVERSAL, Type.INTEGER, !1, "\x01")),
      ]),
    ]),
    date = new Date(),
    notAfter = e.validity.notAfter,
    L = notAfter > date ? notAfter : kf(1),
    V = Su([
      asn1.create(Class.UNIVERSAL, Type.INTEGER, !1, "\x01"),
      S(),
      pki.distinguishedNameToAsn1(e.subject),
      vC(date),
      vC(L),
      create,
    ]),
    K = CC(asn1.toDer(V).getBytes(), n),
    q = Su([V, S(), asn1.create(Class.UNIVERSAL, Type.BITSTRING, !1, "\x00" + K)]);
  return Buffer.from(asn1.toDer(q).getBytes(), "binary");
}
//@ chunk-fq0cr76a.js:647857-647953 esm-layout
function Su(e) {
  let { asn1: asn1 } = No(),
    { Class: Class, Type: Type } = asn1;
  return asn1.create(Class.UNIVERSAL, Type.SEQUENCE, !0, e);
}
//@ chunk-fq0cr76a.js:647953-648159 esm-fingerprint
function vC(e) {
  let { asn1: asn1 } = No(),
    { Class: Class, Type: Type } = asn1;
  return e.getUTCFullYear() < 2050
    ? asn1.create(Class.UNIVERSAL, Type.UTCTIME, !1, asn1.dateToUtcTime(e))
    : asn1.create(Class.UNIVERSAL, Type.GENERALIZEDTIME, !1, asn1.dateToGeneralizedTime(e));
}
//@ chunk-fq0cr76a.js:648159-648455 esm-fingerprint
function o5(e, n, r) {
  let s = wC(e, "CERTIFICATE", "tlsTerminate.caCertPath"),
    h = wC(n, "PRIVATE KEY", "tlsTerminate.caKeyPath"),
    y = Em(s, h);
  if (!y.ok) throw Error(`tlsTerminate: CA at ${e}: ${y.reason}`);
  return (
    At(`[mitm-ca] loaded CA from ${e}`),
    oE(s, h, y.cert, y.key, { certPath: e, keyPath: n, extraCaCertPaths: r })
  );
}
//@ chunk-fq0cr76a.js:648455-648710 esm-fingerprint
function oE(e, n, r, s, h) {
  let y = mkdtempSync(join_2(tmpdir(), "srt-ca-"));
  return {
    certPath: h.certPath,
    keyPath: h.keyPath,
    trustBundlePath: s5(y, e, h.extraCaCertPaths),
    certPem: e,
    keyPem: n,
    cert: r,
    key: s,
    leafCerts: new Map(),
    secureContexts: new Map(),
    crlDer: i5(r, n),
    ephemeral: h.ephemeral ?? !1,
  };
}
//@ chunk-fq0cr76a.js:648710-649353 esm-fingerprint
function aE(e = {}) {
  let { pki: pki } = No(),
    generateKeyPair = pki.rsa.generateKeyPair(2048),
    certificate = pki.createCertificate();
  ((certificate.publicKey = generateKeyPair.publicKey),
    (certificate.serialNumber = lE()),
    (certificate.validity.notBefore = kf(-1)),
    (certificate.validity.notAfter = kf(e.validityDays ?? 825)));
  let h = [
    { name: "commonName", value: e.cn ?? "sandbox-runtime ephemeral CA" },
    { name: "organizationName", value: "sandbox-runtime" },
  ];
  (certificate.setSubject(h),
    certificate.setIssuer(h),
    certificate.setExtensions([
      { name: "basicConstraints", cA: !0, critical: !0 },
      { name: "keyUsage", critical: !0, keyCertSign: !0, cRLSign: !0, digitalSignature: !0 },
      { name: "subjectKeyIdentifier" },
    ]));
  let privateKeyToPem = pki.privateKeyToPem(generateKeyPair.privateKey);
  return (
    rE(certificate, privateKeyToPem),
    {
      certPem: pki.certificateToPem(certificate),
      keyPem: privateKeyToPem,
      cert: certificate,
      key: generateKeyPair.privateKey,
    }
  );
}
//@ chunk-fq0cr76a.js:649353-649428 esm-fingerprint
function Df(e) {
  return new X509Certificate(e).fingerprint.replace(/:/g, "").toUpperCase();
}
//@ chunk-fq0cr76a.js:649428-650044 esm-fingerprint
function Em(e, n) {
  let { pki: pki } = No(),
    s,
    h;
  try {
    ((s = pki.certificateFromPem(e)), (h = pki.privateKeyFromPem(n)));
  } catch (error) {
    return { ok: !1, reason: `parse: ${error.message}` };
  }
  if (!("n" in h) || !("d" in h)) return { ok: !1, reason: "key is not RSA" };
  if (s.validity.notBefore.getTime() > Date.now())
    return {
      ok: !1,
      reason: `notBefore ${s.validity.notBefore.toISOString()} is in the future (clock skew?)`,
    };
  let publicKey = s.publicKey;
  if (!("n" in publicKey) || publicKey.n.compareTo(h.n))
    return { ok: !1, reason: "key does not match certificate public key" };
  let b;
  try {
    b = Df(e);
  } catch (error) {
    return { ok: !1, reason: `thumbprint: ${error.message}` };
  }
  return { ok: !0, thumbprint: b, notAfter: s.validity.notAfter, cert: s, key: h };
}
//@ chunk-fq0cr76a.js:650044-650319 esm-fingerprint
function a5(e) {
  let { certPem: certPem, keyPem: keyPem, cert: cert, key: key } = aE(),
    y = mkdtempSync(join_2(tmpdir(), "srt-ca-")),
    b = join_2(y, "ca.crt"),
    S = join_2(y, "ca.key");
  return (
    writeFileSync(b, certPem, { mode: 420 }),
    writeFileSync(S, keyPem, { mode: 384 }),
    At(`[mitm-ca] generated ephemeral CA at ${b}`),
    oE(certPem, keyPem, cert, key, { certPath: b, keyPath: S, extraCaCertPaths: e, ephemeral: !0 })
  );
}
//@ chunk-fq0cr76a.js:650319-650548 esm-fingerprint
function wC(e, n, r) {
  let s;
  try {
    s = readFileSync(e, "utf8");
  } catch (error) {
    let y = error.code ?? String(error);
    throw Error(`${r}: cannot read ${e} (${y})`);
  }
  if (!new RegExp(`-----BEGIN [A-Z ]*${n}-----`).test(s)) throw Error(`${r}: ${e} is not a PEM ${n}`);
  return s;
}
//@ chunk-fq0cr76a.js:650548-650677 esm-fingerprint
function lE() {
  let { random: random, util: util } = No(),
    bytesToHex = util.bytesToHex(random.getBytesSync(16));
  return ((parseInt(bytesToHex[0], 16) & 3) | 4).toString(16) + bytesToHex.slice(1);
}
//@ chunk-fq0cr76a.js:650677-650741 esm-fingerprint
function kf(e) {
  let date = new Date();
  return (date.setDate(date.getDate() + e), date);
}

export { Df, No, lE, kf, nE, rE, Sm, iE, sE, RC, Em, aE };
