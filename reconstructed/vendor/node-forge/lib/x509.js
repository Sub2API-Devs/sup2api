/**
 * node-forge/lib/x509.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xa } from "./aes.js";
import { Xi } from "./asn1.js";
import { bf } from "./des.js";
import { bo } from "./md.js";
import { EA } from "./mgf.js";
import { Ja } from "./oids.js";
import { sc } from "./pem.js";
import { sm } from "./pss.js";
import { xf } from "./rsa.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:160833-198140 cjs-fingerprint
var am = x(function (Ofe, AA) {
  var en = Tn();
  Xa();
  Xi();
  bf();
  bo();
  EA();
  Ja();
  sc();
  sm();
  xf();
  Zn();
  var asn1 = en.asn1,
    ht = (AA.exports = en.pki = en.pki || {}),
    oids = ht.oids,
    jr = {};
  jr.CN = oids.commonName;
  jr.commonName = "CN";
  jr.C = oids.countryName;
  jr.countryName = "C";
  jr.L = oids.localityName;
  jr.localityName = "L";
  jr.ST = oids.stateOrProvinceName;
  jr.stateOrProvinceName = "ST";
  jr.O = oids.organizationName;
  jr.organizationName = "O";
  jr.OU = oids.organizationalUnitName;
  jr.organizationalUnitName = "OU";
  jr.E = oids.emailAddress;
  jr.emailAddress = "E";
  var publicKeyValidator = en.pki.rsa.publicKeyValidator,
    LG = {
      name: "Certificate",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "Certificate.TBSCertificate",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          captureAsn1: "tbsCertificate",
          value: [
            {
              name: "Certificate.TBSCertificate.version",
              tagClass: asn1.Class.CONTEXT_SPECIFIC,
              type: 0,
              constructed: !0,
              optional: !0,
              value: [
                {
                  name: "Certificate.TBSCertificate.version.integer",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.INTEGER,
                  constructed: !1,
                  capture: "certVersion",
                },
              ],
            },
            {
              name: "Certificate.TBSCertificate.serialNumber",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.INTEGER,
              constructed: !1,
              capture: "certSerialNumber",
            },
            {
              name: "Certificate.TBSCertificate.signature",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              value: [
                {
                  name: "Certificate.TBSCertificate.signature.algorithm",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.OID,
                  constructed: !1,
                  capture: "certinfoSignatureOid",
                },
                {
                  name: "Certificate.TBSCertificate.signature.parameters",
                  tagClass: asn1.Class.UNIVERSAL,
                  optional: !0,
                  captureAsn1: "certinfoSignatureParams",
                },
              ],
            },
            {
              name: "Certificate.TBSCertificate.issuer",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              captureAsn1: "certIssuer",
            },
            {
              name: "Certificate.TBSCertificate.validity",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              value: [
                {
                  name: "Certificate.TBSCertificate.validity.notBefore (utc)",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.UTCTIME,
                  constructed: !1,
                  optional: !0,
                  capture: "certValidity1UTCTime",
                },
                {
                  name: "Certificate.TBSCertificate.validity.notBefore (generalized)",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.GENERALIZEDTIME,
                  constructed: !1,
                  optional: !0,
                  capture: "certValidity2GeneralizedTime",
                },
                {
                  name: "Certificate.TBSCertificate.validity.notAfter (utc)",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.UTCTIME,
                  constructed: !1,
                  optional: !0,
                  capture: "certValidity3UTCTime",
                },
                {
                  name: "Certificate.TBSCertificate.validity.notAfter (generalized)",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.GENERALIZEDTIME,
                  constructed: !1,
                  optional: !0,
                  capture: "certValidity4GeneralizedTime",
                },
              ],
            },
            {
              name: "Certificate.TBSCertificate.subject",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              captureAsn1: "certSubject",
            },
            publicKeyValidator,
            {
              name: "Certificate.TBSCertificate.issuerUniqueID",
              tagClass: asn1.Class.CONTEXT_SPECIFIC,
              type: 1,
              constructed: !0,
              optional: !0,
              value: [
                {
                  name: "Certificate.TBSCertificate.issuerUniqueID.id",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.BITSTRING,
                  constructed: !1,
                  captureBitStringValue: "certIssuerUniqueId",
                },
              ],
            },
            {
              name: "Certificate.TBSCertificate.subjectUniqueID",
              tagClass: asn1.Class.CONTEXT_SPECIFIC,
              type: 2,
              constructed: !0,
              optional: !0,
              value: [
                {
                  name: "Certificate.TBSCertificate.subjectUniqueID.id",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.BITSTRING,
                  constructed: !1,
                  captureBitStringValue: "certSubjectUniqueId",
                },
              ],
            },
            {
              name: "Certificate.TBSCertificate.extensions",
              tagClass: asn1.Class.CONTEXT_SPECIFIC,
              type: 3,
              constructed: !0,
              captureAsn1: "certExtensions",
              optional: !0,
            },
          ],
        },
        {
          name: "Certificate.signatureAlgorithm",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "Certificate.signatureAlgorithm.algorithm",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "certSignatureOid",
            },
            {
              name: "Certificate.TBSCertificate.signature.parameters",
              tagClass: asn1.Class.UNIVERSAL,
              optional: !0,
              captureAsn1: "certSignatureParams",
            },
          ],
        },
        {
          name: "Certificate.signatureValue",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.BITSTRING,
          constructed: !1,
          captureBitStringValue: "certSignature",
        },
      ],
    },
    BG = {
      name: "rsapss",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      value: [
        {
          name: "rsapss.hashAlgorithm",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          type: 0,
          constructed: !0,
          value: [
            {
              name: "rsapss.hashAlgorithm.AlgorithmIdentifier",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Class.SEQUENCE,
              constructed: !0,
              optional: !0,
              value: [
                {
                  name: "rsapss.hashAlgorithm.AlgorithmIdentifier.algorithm",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.OID,
                  constructed: !1,
                  capture: "hashOid",
                },
              ],
            },
          ],
        },
        {
          name: "rsapss.maskGenAlgorithm",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          type: 1,
          constructed: !0,
          value: [
            {
              name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Class.SEQUENCE,
              constructed: !0,
              optional: !0,
              value: [
                {
                  name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier.algorithm",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.OID,
                  constructed: !1,
                  capture: "maskGenOid",
                },
                {
                  name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier.params",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.SEQUENCE,
                  constructed: !0,
                  value: [
                    {
                      name: "rsapss.maskGenAlgorithm.AlgorithmIdentifier.params.algorithm",
                      tagClass: asn1.Class.UNIVERSAL,
                      type: asn1.Type.OID,
                      constructed: !1,
                      capture: "maskGenHashOid",
                    },
                  ],
                },
              ],
            },
          ],
        },
        {
          name: "rsapss.saltLength",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          type: 2,
          optional: !0,
          value: [
            {
              name: "rsapss.saltLength.saltLength",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Class.INTEGER,
              constructed: !1,
              capture: "saltLength",
            },
          ],
        },
        {
          name: "rsapss.trailerField",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          type: 3,
          optional: !0,
          value: [
            {
              name: "rsapss.trailer.trailer",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Class.INTEGER,
              constructed: !1,
              capture: "trailer",
            },
          ],
        },
      ],
    },
    UG = {
      name: "CertificationRequestInfo",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      captureAsn1: "certificationRequestInfo",
      value: [
        {
          name: "CertificationRequestInfo.integer",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.INTEGER,
          constructed: !1,
          capture: "certificationRequestInfoVersion",
        },
        {
          name: "CertificationRequestInfo.subject",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          captureAsn1: "certificationRequestInfoSubject",
        },
        publicKeyValidator,
        {
          name: "CertificationRequestInfo.attributes",
          tagClass: asn1.Class.CONTEXT_SPECIFIC,
          type: 0,
          constructed: !0,
          optional: !0,
          capture: "certificationRequestInfoAttributes",
          value: [
            {
              name: "CertificationRequestInfo.attributes",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.SEQUENCE,
              constructed: !0,
              value: [
                {
                  name: "CertificationRequestInfo.attributes.type",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.OID,
                  constructed: !1,
                },
                {
                  name: "CertificationRequestInfo.attributes.value",
                  tagClass: asn1.Class.UNIVERSAL,
                  type: asn1.Type.SET,
                  constructed: !0,
                },
              ],
            },
          ],
        },
      ],
    },
    FG = {
      name: "CertificationRequest",
      tagClass: asn1.Class.UNIVERSAL,
      type: asn1.Type.SEQUENCE,
      constructed: !0,
      captureAsn1: "csr",
      value: [
        UG,
        {
          name: "CertificationRequest.signatureAlgorithm",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.SEQUENCE,
          constructed: !0,
          value: [
            {
              name: "CertificationRequest.signatureAlgorithm.algorithm",
              tagClass: asn1.Class.UNIVERSAL,
              type: asn1.Type.OID,
              constructed: !1,
              capture: "csrSignatureOid",
            },
            {
              name: "CertificationRequest.signatureAlgorithm.parameters",
              tagClass: asn1.Class.UNIVERSAL,
              optional: !0,
              captureAsn1: "csrSignatureParams",
            },
          ],
        },
        {
          name: "CertificationRequest.signature",
          tagClass: asn1.Class.UNIVERSAL,
          type: asn1.Type.BITSTRING,
          constructed: !1,
          captureBitStringValue: "csrSignature",
        },
      ],
    };
  ht.RDNAttributesAsArray = function (e, n) {
    var r = [],
      s,
      h,
      y;
    for (var b = 0; b < e.value.length; ++b) {
      s = e.value[b];
      for (var S = 0; S < s.value.length; ++S) {
        if (
          ((y = {}),
          (h = s.value[S]),
          (y.type = asn1.derToOid(h.value[0].value)),
          (y.value = h.value[1].value),
          (y.valueTagClass = h.value[1].type),
          y.type in oids)
        ) {
          if (((y.name = oids[y.type]), y.name in jr)) y.shortName = jr[y.name];
        }
        if (n) (n.update(y.type), n.update(y.value));
        r.push(y);
      }
    }
    return r;
  };
  ht.CRIAttributesAsArray = function (e) {
    var n = [];
    for (var r = 0; r < e.length; ++r) {
      var s = e[r],
        derToOid = asn1.derToOid(s.value[0].value),
        y = s.value[1].value;
      for (var b = 0; b < y.length; ++b) {
        var S = {};
        if (((S.type = derToOid), (S.value = y[b].value), (S.valueTagClass = y[b].type), S.type in oids)) {
          if (((S.name = oids[S.type]), S.name in jr)) S.shortName = jr[S.name];
        }
        if (S.type === oids.extensionRequest) {
          S.extensions = [];
          for (var w = 0; w < S.value.length; ++w)
            S.extensions.push(ht.certificateExtensionFromAsn1(S.value[w]));
        }
        n.push(S);
      }
    }
    return n;
  };
  function tl(e, n) {
    if (typeof n === "string") n = { shortName: n };
    var r = null,
      s;
    for (var h = 0; r === null && h < e.attributes.length; ++h)
      if (((s = e.attributes[h]), n.type && n.type === s.type)) r = s;
      else if (n.name && n.name === s.name) r = s;
      else if (n.shortName && n.shortName === s.shortName) r = s;
    return r;
  }
  var im = function (e, n, r) {
      var s = {};
      if (e !== oids["RSASSA-PSS"]) return s;
      if (r)
        s = {
          hash: { algorithmOid: oids.sha1 },
          mgf: { algorithmOid: oids.mgf1, hash: { algorithmOid: oids.sha1 } },
          saltLength: 20,
        };
      var h = {},
        y = [];
      if (!asn1.validate(n, BG, h, y)) {
        var b = Error("Cannot read RSASSA-PSS parameter block.");
        throw ((b.errors = y), b);
      }
      if (h.hashOid !== void 0) ((s.hash = s.hash || {}), (s.hash.algorithmOid = asn1.derToOid(h.hashOid)));
      if (h.maskGenOid !== void 0)
        ((s.mgf = s.mgf || {}),
          (s.mgf.algorithmOid = asn1.derToOid(h.maskGenOid)),
          (s.mgf.hash = s.mgf.hash || {}),
          (s.mgf.hash.algorithmOid = asn1.derToOid(h.maskGenHashOid)));
      if (h.saltLength !== void 0) s.saltLength = h.saltLength.charCodeAt(0);
      return s;
    },
    om = function (e) {
      switch (oids[e.signatureOid]) {
        case "sha1WithRSAEncryption":
        case "sha1WithRSASignature":
          return en.md.sha1.create();
        case "md5WithRSAEncryption":
          return en.md.md5.create();
        case "sha256WithRSAEncryption":
          return en.md.sha256.create();
        case "sha384WithRSAEncryption":
          return en.md.sha384.create();
        case "sha512WithRSAEncryption":
          return en.md.sha512.create();
        case "RSASSA-PSS":
          return en.md.sha256.create();
        default:
          var n = Error("Could not compute " + e.type + " digest. Unknown signature OID.");
          throw ((n.signatureOid = e.signatureOid), n);
      }
    },
    wA = function (e) {
      var certificate = e.certificate,
        r;
      switch (certificate.signatureOid) {
        case oids.sha1WithRSAEncryption:
        case oids.sha1WithRSASignature:
          break;
        case oids["RSASSA-PSS"]:
          var s, h;
          if (
            ((s = oids[certificate.signatureParameters.mgf.hash.algorithmOid]),
            s === void 0 || en.md[s] === void 0)
          ) {
            var y = Error("Unsupported MGF hash function.");
            throw ((y.oid = certificate.signatureParameters.mgf.hash.algorithmOid), (y.name = s), y);
          }
          if (
            ((h = oids[certificate.signatureParameters.mgf.algorithmOid]),
            h === void 0 || en.mgf[h] === void 0)
          ) {
            var y = Error("Unsupported MGF function.");
            throw ((y.oid = certificate.signatureParameters.mgf.algorithmOid), (y.name = h), y);
          }
          if (
            ((h = en.mgf[h].create(en.md[s].create())),
            (s = oids[certificate.signatureParameters.hash.algorithmOid]),
            s === void 0 || en.md[s] === void 0)
          ) {
            var y = Error("Unsupported RSASSA-PSS hash function.");
            throw ((y.oid = certificate.signatureParameters.hash.algorithmOid), (y.name = s), y);
          }
          r = en.pss.create(en.md[s].create(), h, certificate.signatureParameters.saltLength);
          break;
      }
      return certificate.publicKey.verify(e.md.digest().getBytes(), e.signature, r);
    };
  ht.certificateFromPem = function (e, n, r) {
    var s = en.pem.decode(e)[0];
    if (s.type !== "CERTIFICATE" && s.type !== "X509 CERTIFICATE" && s.type !== "TRUSTED CERTIFICATE") {
      var h = Error(
        'Could not convert certificate from PEM; PEM header type is not "CERTIFICATE", "X509 CERTIFICATE", or "TRUSTED CERTIFICATE".',
      );
      throw ((h.headerType = s.type), h);
    }
    if (s.procType && s.procType.type === "ENCRYPTED")
      throw Error("Could not convert certificate from PEM; PEM is encrypted.");
    var fromDer = asn1.fromDer(s.body, r);
    return ht.certificateFromAsn1(fromDer, n);
  };
  ht.certificateToPem = function (e, n) {
    var r = { type: "CERTIFICATE", body: asn1.toDer(ht.certificateToAsn1(e)).getBytes() };
    return en.pem.encode(r, { maxline: n });
  };
  ht.publicKeyFromPem = function (e) {
    var n = en.pem.decode(e)[0];
    if (n.type !== "PUBLIC KEY" && n.type !== "RSA PUBLIC KEY") {
      var r = Error(
        'Could not convert public key from PEM; PEM header type is not "PUBLIC KEY" or "RSA PUBLIC KEY".',
      );
      throw ((r.headerType = n.type), r);
    }
    if (n.procType && n.procType.type === "ENCRYPTED")
      throw Error("Could not convert public key from PEM; PEM is encrypted.");
    var fromDer = asn1.fromDer(n.body);
    return ht.publicKeyFromAsn1(fromDer);
  };
  ht.publicKeyToPem = function (e, n) {
    var r = { type: "PUBLIC KEY", body: asn1.toDer(ht.publicKeyToAsn1(e)).getBytes() };
    return en.pem.encode(r, { maxline: n });
  };
  ht.publicKeyToRSAPublicKeyPem = function (e, n) {
    var r = { type: "RSA PUBLIC KEY", body: asn1.toDer(ht.publicKeyToRSAPublicKey(e)).getBytes() };
    return en.pem.encode(r, { maxline: n });
  };
  ht.getPublicKeyFingerprint = function (e, n) {
    n = n || {};
    var r = n.md || en.md.sha1.create(),
      s = n.type || "RSAPublicKey",
      h;
    switch (s) {
      case "RSAPublicKey":
        h = asn1.toDer(ht.publicKeyToRSAPublicKey(e)).getBytes();
        break;
      case "SubjectPublicKeyInfo":
        h = asn1.toDer(ht.publicKeyToAsn1(e)).getBytes();
        break;
      default:
        throw Error('Unknown fingerprint type "' + n.type + '".');
    }
    (r.start(), r.update(h));
    var digest = r.digest();
    if (n.encoding === "hex") {
      var toHex = digest.toHex();
      if (n.delimiter) return toHex.match(/.{2}/g).join(n.delimiter);
      return toHex;
    } else if (n.encoding === "binary") return digest.getBytes();
    else if (n.encoding) throw Error('Unknown encoding "' + n.encoding + '".');
    return digest;
  };
  ht.certificationRequestFromPem = function (e, n, r) {
    var s = en.pem.decode(e)[0];
    if (s.type !== "CERTIFICATE REQUEST") {
      var h = Error(
        'Could not convert certification request from PEM; PEM header type is not "CERTIFICATE REQUEST".',
      );
      throw ((h.headerType = s.type), h);
    }
    if (s.procType && s.procType.type === "ENCRYPTED")
      throw Error("Could not convert certification request from PEM; PEM is encrypted.");
    var fromDer = asn1.fromDer(s.body, r);
    return ht.certificationRequestFromAsn1(fromDer, n);
  };
  ht.certificationRequestToPem = function (e, n) {
    var r = { type: "CERTIFICATE REQUEST", body: asn1.toDer(ht.certificationRequestToAsn1(e)).getBytes() };
    return en.pem.encode(r, { maxline: n });
  };
  ht.createCertificate = function () {
    var e = {};
    return (
      (e.version = 2),
      (e.serialNumber = "00"),
      (e.signatureOid = null),
      (e.signature = null),
      (e.siginfo = {}),
      (e.siginfo.algorithmOid = null),
      (e.validity = {}),
      (e.validity.notBefore = new Date()),
      (e.validity.notAfter = new Date()),
      (e.issuer = {}),
      (e.issuer.getField = function (n) {
        return tl(e.issuer, n);
      }),
      (e.issuer.addField = function (n) {
        (Ni([n]), e.issuer.attributes.push(n));
      }),
      (e.issuer.attributes = []),
      (e.issuer.hash = null),
      (e.subject = {}),
      (e.subject.getField = function (n) {
        return tl(e.subject, n);
      }),
      (e.subject.addField = function (n) {
        (Ni([n]), e.subject.attributes.push(n));
      }),
      (e.subject.attributes = []),
      (e.subject.hash = null),
      (e.extensions = []),
      (e.publicKey = null),
      (e.md = null),
      (e.setSubject = function (n, r) {
        if ((Ni(n), (e.subject.attributes = n), delete e.subject.uniqueId, r)) e.subject.uniqueId = r;
        e.subject.hash = null;
      }),
      (e.setIssuer = function (n, r) {
        if ((Ni(n), (e.issuer.attributes = n), delete e.issuer.uniqueId, r)) e.issuer.uniqueId = r;
        e.issuer.hash = null;
      }),
      (e.setExtensions = function (n) {
        for (var r = 0; r < n.length; ++r) TA(n[r], { cert: e });
        e.extensions = n;
      }),
      (e.getExtension = function (n) {
        if (typeof n === "string") n = { name: n };
        var r = null,
          s;
        for (var h = 0; r === null && h < e.extensions.length; ++h)
          if (((s = e.extensions[h]), n.id && s.id === n.id)) r = s;
          else if (n.name && s.name === n.name) r = s;
        return r;
      }),
      (e.sign = function (n, r) {
        e.md = r || en.md.sha1.create();
        var s = oids[e.md.algorithm + "WithRSAEncryption"];
        if (!s) {
          var h = Error("Could not compute certificate digest. Unknown message digest algorithm OID.");
          throw ((h.algorithm = e.md.algorithm), h);
        }
        ((e.signatureOid = e.siginfo.algorithmOid = s), (e.tbsCertificate = ht.getTBSCertificate(e)));
        var toDer = asn1.toDer(e.tbsCertificate);
        (e.md.update(toDer.getBytes()), (e.signature = n.sign(e.md)));
      }),
      (e.verify = function (n) {
        var r = !1;
        if (!e.issued(n)) {
          var issuer = n.issuer,
            subject = e.subject,
            y = Error(
              "The parent certificate did not issue the given child certificate; the child certificate's issuer does not match the parent's subject.",
            );
          throw ((y.expectedIssuer = subject.attributes), (y.actualIssuer = issuer.attributes), y);
        }
        var md = n.md;
        if (md === null) {
          md = om({ signatureOid: n.signatureOid, type: "certificate" });
          var S = n.tbsCertificate || ht.getTBSCertificate(n),
            toDer = asn1.toDer(S);
          md.update(toDer.getBytes());
        }
        if (md !== null) r = wA({ certificate: e, md: md, signature: n.signature });
        return r;
      }),
      (e.isIssuer = function (n) {
        var r = !1,
          issuer = e.issuer,
          subject = n.subject;
        if (issuer.hash && subject.hash) r = issuer.hash === subject.hash;
        else if (issuer.attributes.length === subject.attributes.length) {
          r = !0;
          var y, b;
          for (var S = 0; r && S < issuer.attributes.length; ++S)
            if (
              ((y = issuer.attributes[S]),
              (b = subject.attributes[S]),
              y.type !== b.type || y.value !== b.value)
            )
              r = !1;
        }
        return r;
      }),
      (e.issued = function (n) {
        return n.isIssuer(e);
      }),
      (e.generateSubjectKeyIdentifier = function () {
        return ht.getPublicKeyFingerprint(e.publicKey, { type: "RSAPublicKey" });
      }),
      (e.verifySubjectKeyIdentifier = function () {
        var subjectKeyIdentifier = oids.subjectKeyIdentifier;
        for (var r = 0; r < e.extensions.length; ++r) {
          var s = e.extensions[r];
          if (s.id === subjectKeyIdentifier) {
            var bytes = e.generateSubjectKeyIdentifier().getBytes();
            return en.util.hexToBytes(s.subjectKeyIdentifier) === bytes;
          }
        }
        return !1;
      }),
      e
    );
  };
  ht.certificateFromAsn1 = function (e, n) {
    var r = {},
      s = [];
    if (!asn1.validate(e, LG, r, s)) {
      var h = Error("Cannot read X.509 certificate. ASN.1 object is not an X509v3 Certificate.");
      throw ((h.errors = s), h);
    }
    var derToOid = asn1.derToOid(r.publicKeyOid);
    if (derToOid !== ht.oids.rsaEncryption) throw Error("Cannot read public key. OID is not RSA.");
    var certificate = ht.createCertificate();
    certificate.version = r.certVersion ? r.certVersion.charCodeAt(0) : 0;
    var buffer = en.util.createBuffer(r.certSerialNumber);
    ((certificate.serialNumber = buffer.toHex()),
      (certificate.signatureOid = en.asn1.derToOid(r.certSignatureOid)),
      (certificate.signatureParameters = im(certificate.signatureOid, r.certSignatureParams, !0)),
      (certificate.siginfo.algorithmOid = en.asn1.derToOid(r.certinfoSignatureOid)),
      (certificate.siginfo.parameters = im(certificate.siginfo.algorithmOid, r.certinfoSignatureParams, !1)),
      (certificate.signature = r.certSignature));
    var w = [];
    if (r.certValidity1UTCTime !== void 0) w.push(asn1.utcTimeToDate(r.certValidity1UTCTime));
    if (r.certValidity2GeneralizedTime !== void 0)
      w.push(asn1.generalizedTimeToDate(r.certValidity2GeneralizedTime));
    if (r.certValidity3UTCTime !== void 0) w.push(asn1.utcTimeToDate(r.certValidity3UTCTime));
    if (r.certValidity4GeneralizedTime !== void 0)
      w.push(asn1.generalizedTimeToDate(r.certValidity4GeneralizedTime));
    if (w.length > 2)
      throw Error(
        "Cannot read notBefore/notAfter validity times; more than two times were provided in the certificate.",
      );
    if (w.length < 2)
      throw Error(
        "Cannot read notBefore/notAfter validity times; they were not provided as either UTCTime or GeneralizedTime.",
      );
    if (
      ((certificate.validity.notBefore = w[0]),
      (certificate.validity.notAfter = w[1]),
      (certificate.tbsCertificate = r.tbsCertificate),
      n)
    ) {
      certificate.md = om({ signatureOid: certificate.signatureOid, type: "certificate" });
      var toDer = asn1.toDer(certificate.tbsCertificate);
      certificate.md.update(toDer.getBytes());
    }
    var create = en.md.sha1.create(),
      toDer_2 = asn1.toDer(r.certIssuer);
    if (
      (create.update(toDer_2.getBytes()),
      (certificate.issuer.getField = function (K) {
        return tl(certificate.issuer, K);
      }),
      (certificate.issuer.addField = function (K) {
        (Ni([K]), certificate.issuer.attributes.push(K));
      }),
      (certificate.issuer.attributes = ht.RDNAttributesAsArray(r.certIssuer)),
      r.certIssuerUniqueId)
    )
      certificate.issuer.uniqueId = r.certIssuerUniqueId;
    certificate.issuer.hash = create.digest().toHex();
    var create_2 = en.md.sha1.create(),
      toDer_3 = asn1.toDer(r.certSubject);
    if (
      (create_2.update(toDer_3.getBytes()),
      (certificate.subject.getField = function (K) {
        return tl(certificate.subject, K);
      }),
      (certificate.subject.addField = function (K) {
        (Ni([K]), certificate.subject.attributes.push(K));
      }),
      (certificate.subject.attributes = ht.RDNAttributesAsArray(r.certSubject)),
      r.certSubjectUniqueId)
    )
      certificate.subject.uniqueId = r.certSubjectUniqueId;
    if (((certificate.subject.hash = create_2.digest().toHex()), r.certExtensions))
      certificate.extensions = ht.certificateExtensionsFromAsn1(r.certExtensions);
    else certificate.extensions = [];
    return ((certificate.publicKey = ht.publicKeyFromAsn1(r.subjectPublicKeyInfo)), certificate);
  };
  ht.certificateExtensionsFromAsn1 = function (e) {
    var n = [];
    for (var r = 0; r < e.value.length; ++r) {
      var s = e.value[r];
      for (var h = 0; h < s.value.length; ++h) n.push(ht.certificateExtensionFromAsn1(s.value[h]));
    }
    return n;
  };
  ht.certificateExtensionFromAsn1 = function (e) {
    var n = {};
    if (((n.id = asn1.derToOid(e.value[0].value)), (n.critical = !1), e.value[1].type === asn1.Type.BOOLEAN))
      ((n.critical = e.value[1].value.charCodeAt(0) !== 0), (n.value = e.value[2].value));
    else n.value = e.value[1].value;
    if (n.id in oids) {
      if (((n.name = oids[n.id]), n.name === "keyUsage")) {
        var fromDer = asn1.fromDer(n.value),
          s = 0,
          h = 0;
        if (fromDer.value.length > 1)
          ((s = fromDer.value.charCodeAt(1)),
            (h = fromDer.value.length > 2 ? fromDer.value.charCodeAt(2) : 0));
        ((n.digitalSignature = (s & 128) === 128),
          (n.nonRepudiation = (s & 64) === 64),
          (n.keyEncipherment = (s & 32) === 32),
          (n.dataEncipherment = (s & 16) === 16),
          (n.keyAgreement = (s & 8) === 8),
          (n.keyCertSign = (s & 4) === 4),
          (n.cRLSign = (s & 2) === 2),
          (n.encipherOnly = (s & 1) === 1),
          (n.decipherOnly = (h & 128) === 128));
      } else if (n.name === "basicConstraints") {
        var fromDer = asn1.fromDer(n.value);
        if (fromDer.value.length > 0 && fromDer.value[0].type === asn1.Type.BOOLEAN)
          n.cA = fromDer.value[0].value.charCodeAt(0) !== 0;
        else n.cA = !1;
        var y = null;
        if (fromDer.value.length > 0 && fromDer.value[0].type === asn1.Type.INTEGER)
          y = fromDer.value[0].value;
        else if (fromDer.value.length > 1) y = fromDer.value[1].value;
        if (y !== null) n.pathLenConstraint = asn1.derToInteger(y);
      } else if (n.name === "extKeyUsage") {
        var fromDer = asn1.fromDer(n.value);
        for (var b = 0; b < fromDer.value.length; ++b) {
          var derToOid = asn1.derToOid(fromDer.value[b].value);
          if (derToOid in oids) n[oids[derToOid]] = !0;
          else n[derToOid] = !0;
        }
      } else if (n.name === "nsCertType") {
        var fromDer = asn1.fromDer(n.value),
          s = 0;
        if (fromDer.value.length > 1) s = fromDer.value.charCodeAt(1);
        ((n.client = (s & 128) === 128),
          (n.server = (s & 64) === 64),
          (n.email = (s & 32) === 32),
          (n.objsign = (s & 16) === 16),
          (n.reserved = (s & 8) === 8),
          (n.sslCA = (s & 4) === 4),
          (n.emailCA = (s & 2) === 2),
          (n.objCA = (s & 1) === 1));
      } else if (n.name === "subjectAltName" || n.name === "issuerAltName") {
        n.altNames = [];
        var w,
          fromDer = asn1.fromDer(n.value);
        for (var R = 0; R < fromDer.value.length; ++R) {
          w = fromDer.value[R];
          var D = { type: w.type, value: w.value };
          switch ((n.altNames.push(D), w.type)) {
            case 1:
            case 2:
            case 6:
              break;
            case 7:
              D.ip = en.util.bytesToIP(w.value);
              break;
            case 8:
              D.oid = asn1.derToOid(w.value);
              break;
            default:
          }
        }
      } else if (n.name === "subjectKeyIdentifier") {
        var fromDer = asn1.fromDer(n.value);
        n.subjectKeyIdentifier = en.util.bytesToHex(fromDer.value);
      }
    }
    return n;
  };
  ht.certificationRequestFromAsn1 = function (e, n) {
    var r = {},
      s = [];
    if (!asn1.validate(e, FG, r, s)) {
      var h = Error(
        "Cannot read PKCS#10 certificate request. ASN.1 object is not a PKCS#10 CertificationRequest.",
      );
      throw ((h.errors = s), h);
    }
    var derToOid = asn1.derToOid(r.publicKeyOid);
    if (derToOid !== ht.oids.rsaEncryption) throw Error("Cannot read public key. OID is not RSA.");
    var certificationRequest = ht.createCertificationRequest();
    if (
      ((certificationRequest.version = r.csrVersion ? r.csrVersion.charCodeAt(0) : 0),
      (certificationRequest.signatureOid = en.asn1.derToOid(r.csrSignatureOid)),
      (certificationRequest.signatureParameters = im(
        certificationRequest.signatureOid,
        r.csrSignatureParams,
        !0,
      )),
      (certificationRequest.siginfo.algorithmOid = en.asn1.derToOid(r.csrSignatureOid)),
      (certificationRequest.siginfo.parameters = im(
        certificationRequest.siginfo.algorithmOid,
        r.csrSignatureParams,
        !1,
      )),
      (certificationRequest.signature = r.csrSignature),
      (certificationRequest.certificationRequestInfo = r.certificationRequestInfo),
      n)
    ) {
      certificationRequest.md = om({
        signatureOid: certificationRequest.signatureOid,
        type: "certification request",
      });
      var toDer = asn1.toDer(certificationRequest.certificationRequestInfo);
      certificationRequest.md.update(toDer.getBytes());
    }
    var create = en.md.sha1.create();
    return (
      (certificationRequest.subject.getField = function (R) {
        return tl(certificationRequest.subject, R);
      }),
      (certificationRequest.subject.addField = function (R) {
        (Ni([R]), certificationRequest.subject.attributes.push(R));
      }),
      (certificationRequest.subject.attributes = ht.RDNAttributesAsArray(
        r.certificationRequestInfoSubject,
        create,
      )),
      (certificationRequest.subject.hash = create.digest().toHex()),
      (certificationRequest.publicKey = ht.publicKeyFromAsn1(r.subjectPublicKeyInfo)),
      (certificationRequest.getAttribute = function (R) {
        return tl(certificationRequest, R);
      }),
      (certificationRequest.addAttribute = function (R) {
        (Ni([R]), certificationRequest.attributes.push(R));
      }),
      (certificationRequest.attributes = ht.CRIAttributesAsArray(r.certificationRequestInfoAttributes || [])),
      certificationRequest
    );
  };
  ht.createCertificationRequest = function () {
    var e = {};
    return (
      (e.version = 0),
      (e.signatureOid = null),
      (e.signature = null),
      (e.siginfo = {}),
      (e.siginfo.algorithmOid = null),
      (e.subject = {}),
      (e.subject.getField = function (n) {
        return tl(e.subject, n);
      }),
      (e.subject.addField = function (n) {
        (Ni([n]), e.subject.attributes.push(n));
      }),
      (e.subject.attributes = []),
      (e.subject.hash = null),
      (e.publicKey = null),
      (e.attributes = []),
      (e.getAttribute = function (n) {
        return tl(e, n);
      }),
      (e.addAttribute = function (n) {
        (Ni([n]), e.attributes.push(n));
      }),
      (e.md = null),
      (e.setSubject = function (n) {
        (Ni(n), (e.subject.attributes = n), (e.subject.hash = null));
      }),
      (e.setAttributes = function (n) {
        (Ni(n), (e.attributes = n));
      }),
      (e.sign = function (n, r) {
        e.md = r || en.md.sha1.create();
        var s = oids[e.md.algorithm + "WithRSAEncryption"];
        if (!s) {
          var h = Error(
            "Could not compute certification request digest. Unknown message digest algorithm OID.",
          );
          throw ((h.algorithm = e.md.algorithm), h);
        }
        ((e.signatureOid = e.siginfo.algorithmOid = s),
          (e.certificationRequestInfo = ht.getCertificationRequestInfo(e)));
        var toDer = asn1.toDer(e.certificationRequestInfo);
        (e.md.update(toDer.getBytes()), (e.signature = n.sign(e.md)));
      }),
      (e.verify = function () {
        var n = !1,
          md = e.md;
        if (md === null) {
          md = om({ signatureOid: e.signatureOid, type: "certification request" });
          var s = e.certificationRequestInfo || ht.getCertificationRequestInfo(e),
            toDer = asn1.toDer(s);
          md.update(toDer.getBytes());
        }
        if (md !== null) n = wA({ certificate: e, md: md, signature: e.signature });
        return n;
      }),
      e
    );
  };
  function fu(e) {
    var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []),
      r,
      s,
      attributes = e.attributes;
    for (var y = 0; y < attributes.length; ++y) {
      r = attributes[y];
      var b = r.value,
        PRINTABLESTRING = asn1.Type.PRINTABLESTRING;
      if ("valueTagClass" in r) {
        if (((PRINTABLESTRING = r.valueTagClass), PRINTABLESTRING === asn1.Type.UTF8))
          b = en.util.encodeUtf8(b);
      }
      ((s = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(r.type).getBytes()),
          asn1.create(asn1.Class.UNIVERSAL, PRINTABLESTRING, !1, b),
        ]),
      ])),
        create.value.push(s));
    }
    return create;
  }
  function Ni(e) {
    var n;
    for (var r = 0; r < e.length; ++r) {
      if (((n = e[r]), typeof n.name > "u")) {
        if (n.type && n.type in ht.oids) n.name = ht.oids[n.type];
        else if (n.shortName && n.shortName in jr) n.name = ht.oids[jr[n.shortName]];
      }
      if (typeof n.type > "u")
        if (n.name && n.name in ht.oids) n.type = ht.oids[n.name];
        else {
          var s = Error("Attribute type not specified.");
          throw ((s.attribute = n), s);
        }
      if (typeof n.shortName > "u") {
        if (n.name && n.name in jr) n.shortName = jr[n.name];
      }
      if (n.type === oids.extensionRequest) {
        if (((n.valueConstructed = !0), (n.valueTagClass = asn1.Type.SEQUENCE), !n.value && n.extensions)) {
          n.value = [];
          for (var h = 0; h < n.extensions.length; ++h)
            n.value.push(ht.certificateExtensionToAsn1(TA(n.extensions[h])));
        }
      }
      if (typeof n.value > "u") {
        var s = Error("Attribute value not specified.");
        throw ((s.attribute = n), s);
      }
    }
  }
  function TA(e, n) {
    if (((n = n || {}), typeof e.name > "u")) {
      if (e.id && e.id in ht.oids) e.name = ht.oids[e.id];
    }
    if (typeof e.id > "u")
      if (e.name && e.name in ht.oids) e.id = ht.oids[e.name];
      else {
        var r = Error("Extension ID not specified.");
        throw ((r.extension = e), r);
      }
    if (typeof e.value < "u") return e;
    if (e.name === "keyUsage") {
      var s = 0,
        h = 0,
        y = 0;
      if (e.digitalSignature) ((h |= 128), (s = 7));
      if (e.nonRepudiation) ((h |= 64), (s = 6));
      if (e.keyEncipherment) ((h |= 32), (s = 5));
      if (e.dataEncipherment) ((h |= 16), (s = 4));
      if (e.keyAgreement) ((h |= 8), (s = 3));
      if (e.keyCertSign) ((h |= 4), (s = 2));
      if (e.cRLSign) ((h |= 2), (s = 1));
      if (e.encipherOnly) ((h |= 1), (s = 0));
      if (e.decipherOnly) ((y |= 128), (s = 7));
      var fromCharCode = String.fromCharCode(s);
      if (y !== 0) fromCharCode += String.fromCharCode(h) + String.fromCharCode(y);
      else if (h !== 0) fromCharCode += String.fromCharCode(h);
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, !1, fromCharCode);
    } else if (e.name === "basicConstraints") {
      if (((e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [])), e.cA))
        e.value.value.push(
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, !1, String.fromCharCode(255)),
        );
      if ("pathLenConstraint" in e)
        e.value.value.push(
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.INTEGER,
            !1,
            asn1.integerToDer(e.pathLenConstraint).getBytes(),
          ),
        );
    } else if (e.name === "extKeyUsage") {
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
      var S = e.value.value;
      for (var key in e) {
        if (e[key] !== !0) continue;
        if (key in oids)
          S.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(oids[key]).getBytes()));
        else if (key.indexOf(".") !== -1)
          S.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(key).getBytes()));
      }
    } else if (e.name === "nsCertType") {
      var s = 0,
        h = 0;
      if (e.client) ((h |= 128), (s = 7));
      if (e.server) ((h |= 64), (s = 6));
      if (e.email) ((h |= 32), (s = 5));
      if (e.objsign) ((h |= 16), (s = 4));
      if (e.reserved) ((h |= 8), (s = 3));
      if (e.sslCA) ((h |= 4), (s = 2));
      if (e.emailCA) ((h |= 2), (s = 1));
      if (e.objCA) ((h |= 1), (s = 0));
      var fromCharCode = String.fromCharCode(s);
      if (h !== 0) fromCharCode += String.fromCharCode(h);
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, !1, fromCharCode);
    } else if (e.name === "subjectAltName" || e.name === "issuerAltName") {
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
      var R;
      for (var D = 0; D < e.altNames.length; ++D) {
        R = e.altNames[D];
        var fromCharCode = R.value;
        if (R.type === 7 && R.ip) {
          if (((fromCharCode = en.util.bytesFromIP(R.ip)), fromCharCode === null)) {
            var r = Error('Extension "ip" value is not a valid IPv4 or IPv6 address.');
            throw ((r.extension = e), r);
          }
        } else if (R.type === 8)
          if (R.oid) fromCharCode = asn1.oidToDer(asn1.oidToDer(R.oid));
          else fromCharCode = asn1.oidToDer(fromCharCode);
        e.value.value.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, R.type, !1, fromCharCode));
      }
    } else if (e.name === "nsComment" && n.cert) {
      if (!/^[\x00-\x7F]*$/.test(e.comment) || e.comment.length < 1 || e.comment.length > 128)
        throw Error('Invalid "nsComment" content.');
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.IA5STRING, !1, e.comment);
    } else if (e.name === "subjectKeyIdentifier" && n.cert) {
      var generateSubjectKeyIdentifier = n.cert.generateSubjectKeyIdentifier();
      ((e.subjectKeyIdentifier = generateSubjectKeyIdentifier.toHex()),
        (e.value = asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OCTETSTRING,
          !1,
          generateSubjectKeyIdentifier.getBytes(),
        )));
    } else if (e.name === "authorityKeyIdentifier" && n.cert) {
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
      var S = e.value.value;
      if (e.keyIdentifier) {
        var L = e.keyIdentifier === !0 ? n.cert.generateSubjectKeyIdentifier().getBytes() : e.keyIdentifier;
        S.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !1, L));
      }
      if (e.authorityCertIssuer) {
        var V = [
          asn1.create(asn1.Class.CONTEXT_SPECIFIC, 4, !0, [
            fu(e.authorityCertIssuer === !0 ? n.cert.issuer : e.authorityCertIssuer),
          ]),
        ];
        S.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, !0, V));
      }
      if (e.serialNumber) {
        var hexToBytes = en.util.hexToBytes(e.serialNumber === !0 ? n.cert.serialNumber : e.serialNumber);
        S.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, !1, hexToBytes));
      }
    } else if (e.name === "cRLDistributionPoints") {
      e.value = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
      var S = e.value.value,
        create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []),
        create_2 = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, []),
        R;
      for (var D = 0; D < e.altNames.length; ++D) {
        R = e.altNames[D];
        var fromCharCode = R.value;
        if (R.type === 7 && R.ip) {
          if (((fromCharCode = en.util.bytesFromIP(R.ip)), fromCharCode === null)) {
            var r = Error('Extension "ip" value is not a valid IPv4 or IPv6 address.');
            throw ((r.extension = e), r);
          }
        } else if (R.type === 8)
          if (R.oid) fromCharCode = asn1.oidToDer(asn1.oidToDer(R.oid));
          else fromCharCode = asn1.oidToDer(fromCharCode);
        create_2.value.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, R.type, !1, fromCharCode));
      }
      (create.value.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [create_2])), S.push(create));
    }
    if (typeof e.value > "u") {
      var r = Error("Extension value not specified.");
      throw ((r.extension = e), r);
    }
    return e;
  }
  function CS(e, n) {
    switch (e) {
      case oids["RSASSA-PSS"]:
        var r = [];
        if (n.hash.algorithmOid !== void 0)
          r.push(
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.OID,
                  !1,
                  asn1.oidToDer(n.hash.algorithmOid).getBytes(),
                ),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
              ]),
            ]),
          );
        if (n.mgf.algorithmOid !== void 0)
          r.push(
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, !0, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.OID,
                  !1,
                  asn1.oidToDer(n.mgf.algorithmOid).getBytes(),
                ),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
                  asn1.create(
                    asn1.Class.UNIVERSAL,
                    asn1.Type.OID,
                    !1,
                    asn1.oidToDer(n.mgf.hash.algorithmOid).getBytes(),
                  ),
                  asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
                ]),
              ]),
            ]),
          );
        if (n.saltLength !== void 0)
          r.push(
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, !0, [
              asn1.create(
                asn1.Class.UNIVERSAL,
                asn1.Type.INTEGER,
                !1,
                asn1.integerToDer(n.saltLength).getBytes(),
              ),
            ]),
          );
        return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, r);
      default:
        return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, "");
    }
  }
  function MG(e) {
    var create = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, []);
    if (e.attributes.length === 0) return create;
    var attributes = e.attributes;
    for (var s = 0; s < attributes.length; ++s) {
      var h = attributes[s],
        y = h.value,
        UTF8 = asn1.Type.UTF8;
      if ("valueTagClass" in h) UTF8 = h.valueTagClass;
      if (UTF8 === asn1.Type.UTF8) y = en.util.encodeUtf8(y);
      var S = !1;
      if ("valueConstructed" in h) S = h.valueConstructed;
      var create_2 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(h.type).getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, [asn1.create(asn1.Class.UNIVERSAL, UTF8, S, y)]),
      ]);
      create.value.push(create_2);
    }
    return create;
  }
  var date = new Date("1950-01-01T00:00:00Z"),
    date_2 = new Date("2050-01-01T00:00:00Z");
  function _A(e) {
    if (e >= date && e < date_2)
      return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.UTCTIME, !1, asn1.dateToUtcTime(e));
    else
      return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.GENERALIZEDTIME, !1, asn1.dateToGeneralizedTime(e));
  }
  ht.getTBSCertificate = function (e) {
    var n = _A(e.validity.notBefore),
      r = _A(e.validity.notAfter),
      create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(e.version).getBytes()),
        ]),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, en.util.hexToBytes(e.serialNumber)),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            !1,
            asn1.oidToDer(e.siginfo.algorithmOid).getBytes(),
          ),
          CS(e.siginfo.algorithmOid, e.siginfo.parameters),
        ]),
        fu(e.issuer),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [n, r]),
        fu(e.subject),
        ht.publicKeyToAsn1(e.publicKey),
      ]);
    if (e.issuer.uniqueId)
      create.value.push(
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.BITSTRING,
            !1,
            String.fromCharCode(0) + e.issuer.uniqueId,
          ),
        ]),
      );
    if (e.subject.uniqueId)
      create.value.push(
        asn1.create(asn1.Class.CONTEXT_SPECIFIC, 2, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.BITSTRING,
            !1,
            String.fromCharCode(0) + e.subject.uniqueId,
          ),
        ]),
      );
    if (e.extensions.length > 0) create.value.push(ht.certificateExtensionsToAsn1(e.extensions));
    return create;
  };
  ht.getCertificationRequestInfo = function (e) {
    var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(e.version).getBytes()),
      fu(e.subject),
      ht.publicKeyToAsn1(e.publicKey),
      MG(e),
    ]);
    return create;
  };
  ht.distinguishedNameToAsn1 = function (e) {
    return fu(e);
  };
  ht.certificateToAsn1 = function (e) {
    var n = e.tbsCertificate || ht.getTBSCertificate(e);
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      n,
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.signatureOid).getBytes()),
        CS(e.signatureOid, e.signatureParameters),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, !1, String.fromCharCode(0) + e.signature),
    ]);
  };
  ht.certificateExtensionsToAsn1 = function (e) {
    var create = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 3, !0, []),
      create_2 = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
    create.value.push(create_2);
    for (var s = 0; s < e.length; ++s) create_2.value.push(ht.certificateExtensionToAsn1(e[s]));
    return create;
  };
  ht.certificateExtensionToAsn1 = function (e) {
    var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, []);
    if (
      (create.value.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.id).getBytes()),
      ),
      e.critical)
    )
      create.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BOOLEAN, !1, String.fromCharCode(255)));
    var r = e.value;
    if (typeof e.value !== "string") r = asn1.toDer(r).getBytes();
    return (create.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, r)), create);
  };
  ht.certificationRequestToAsn1 = function (e) {
    var n = e.certificationRequestInfo || ht.getCertificationRequestInfo(e);
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      n,
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.signatureOid).getBytes()),
        CS(e.signatureOid, e.signatureParameters),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.BITSTRING, !1, String.fromCharCode(0) + e.signature),
    ]);
  };
  ht.createCaStore = function (e) {
    var n = { certs: {} };
    ((n.getIssuer = function (b) {
      var S = r(b.issuer);
      return S;
    }),
      (n.addCertificate = function (b) {
        if (typeof b === "string") b = en.pki.certificateFromPem(b);
        if ((s(b.subject), !n.hasCertificate(b)))
          if (b.subject.hash in n.certs) {
            var S = n.certs[b.subject.hash];
            if (!en.util.isArray(S)) S = [S];
            (S.push(b), (n.certs[b.subject.hash] = S));
          } else n.certs[b.subject.hash] = b;
      }),
      (n.hasCertificate = function (b) {
        if (typeof b === "string") b = en.pki.certificateFromPem(b);
        var S = r(b.subject);
        if (!S) return !1;
        if (!en.util.isArray(S)) S = [S];
        var bytes = asn1.toDer(ht.certificateToAsn1(b)).getBytes();
        for (var R = 0; R < S.length; ++R) {
          var bytes_2 = asn1.toDer(ht.certificateToAsn1(S[R])).getBytes();
          if (bytes === bytes_2) return !0;
        }
        return !1;
      }),
      (n.listAllCertificates = function () {
        var b = [];
        for (var key in n.certs)
          if (n.certs.hasOwnProperty(key)) {
            var w = n.certs[key];
            if (!en.util.isArray(w)) b.push(w);
            else for (var R = 0; R < w.length; ++R) b.push(w[R]);
          }
        return b;
      }),
      (n.removeCertificate = function (b) {
        var S;
        if (typeof b === "string") b = en.pki.certificateFromPem(b);
        if ((s(b.subject), !n.hasCertificate(b))) return null;
        var w = r(b.subject);
        if (!en.util.isArray(w)) return ((S = n.certs[b.subject.hash]), delete n.certs[b.subject.hash], S);
        var bytes = asn1.toDer(ht.certificateToAsn1(b)).getBytes();
        for (var D = 0; D < w.length; ++D) {
          var bytes_2 = asn1.toDer(ht.certificateToAsn1(w[D])).getBytes();
          if (bytes === bytes_2) ((S = w[D]), w.splice(D, 1));
        }
        if (w.length === 0) delete n.certs[b.subject.hash];
        return S;
      }));
    function r(b) {
      return (s(b), n.certs[b.hash] || null);
    }
    function s(b) {
      if (!b.hash) {
        var create = en.md.sha1.create();
        ((b.attributes = ht.RDNAttributesAsArray(fu(b), create)), (b.hash = create.digest().toHex()));
      }
    }
    if (e)
      for (var h = 0; h < e.length; ++h) {
        var y = e[h];
        n.addCertificate(y);
      }
    return n;
  };
  ht.certificateError = {
    bad_certificate: "forge.pki.BadCertificate",
    unsupported_certificate: "forge.pki.UnsupportedCertificate",
    certificate_revoked: "forge.pki.CertificateRevoked",
    certificate_expired: "forge.pki.CertificateExpired",
    certificate_unknown: "forge.pki.CertificateUnknown",
    unknown_ca: "forge.pki.UnknownCertificateAuthority",
  };
  ht.verifyCertificateChain = function (e, n, r) {
    if (typeof r === "function") r = { verify: r };
    ((r = r || {}), (n = n.slice(0)));
    var sliced = n.slice(0),
      validityCheckDate = r.validityCheckDate;
    if (typeof validityCheckDate > "u") validityCheckDate = new Date();
    var y = !0,
      b = null,
      S = 0;
    do {
      var w = n.shift(),
        R = null,
        D = !1;
      if (validityCheckDate) {
        if (validityCheckDate < w.validity.notBefore || validityCheckDate > w.validity.notAfter)
          b = {
            message: "Certificate is not valid yet or has expired.",
            error: ht.certificateError.certificate_expired,
            notBefore: w.validity.notBefore,
            notAfter: w.validity.notAfter,
            now: validityCheckDate,
          };
      }
      if (b === null) {
        if (((R = n[0] || e.getIssuer(w)), R === null)) {
          if (w.isIssuer(w)) ((D = !0), (R = w));
        }
        if (R) {
          var O = R;
          if (!en.util.isArray(O)) O = [O];
          var L = !1;
          while (!L && O.length > 0) {
            R = O.shift();
            try {
              L = R.verify(w);
            } catch (error) {}
          }
          if (!L)
            b = { message: "Certificate signature is invalid.", error: ht.certificateError.bad_certificate };
        }
        if (b === null && (!R || D) && !e.hasCertificate(w))
          b = { message: "Certificate is not trusted.", error: ht.certificateError.unknown_ca };
      }
      if (b === null && R && !w.isIssuer(R))
        b = { message: "Certificate issuer is invalid.", error: ht.certificateError.bad_certificate };
      if (b === null) {
        var V = { keyUsage: !0, basicConstraints: !0 };
        for (var K = 0; b === null && K < w.extensions.length; ++K) {
          var q = w.extensions[K];
          if (q.critical && !(q.name in V))
            b = {
              message: "Certificate has an unsupported critical extension.",
              error: ht.certificateError.unsupported_certificate,
            };
        }
      }
      if (b === null && (!y || (n.length === 0 && (!R || D)))) {
        var extension = w.getExtension("basicConstraints"),
          extension_2 = w.getExtension("keyUsage");
        if (extension_2 !== null) {
          if (!extension_2.keyCertSign || extension === null)
            b = {
              message:
                "Certificate keyUsage or basicConstraints conflict or indicate that the certificate is not a CA. If the certificate is the only one in the chain or isn't the first then the certificate must be a valid CA.",
              error: ht.certificateError.bad_certificate,
            };
        }
        if (b === null && extension === null)
          b = {
            message: "Certificate is missing basicConstraints extension and cannot be used as a CA.",
            error: ht.certificateError.bad_certificate,
          };
        if (b === null && extension !== null && !extension.cA)
          b = {
            message: "Certificate basicConstraints indicates the certificate is not a CA.",
            error: ht.certificateError.bad_certificate,
          };
        if (b === null && extension_2 !== null && "pathLenConstraint" in extension) {
          var ie = S - 1;
          if (ie > extension.pathLenConstraint)
            b = {
              message: "Certificate basicConstraints pathLenConstraint violated.",
              error: ht.certificateError.bad_certificate,
            };
        }
      }
      var ae = b === null ? !0 : b.error,
        Se = r.verify ? r.verify(ae, S, sliced) : ae;
      if (Se === !0) b = null;
      else {
        if (ae === !0)
          b = {
            message: "The application rejected the certificate.",
            error: ht.certificateError.bad_certificate,
          };
        if (Se || Se === 0) {
          if (typeof Se === "object" && !en.util.isArray(Se)) {
            if (Se.message) b.message = Se.message;
            if (Se.error) b.error = Se.error;
          } else if (typeof Se === "string") b.error = Se;
        }
        throw b;
      }
      ((y = !1), ++S);
    } while (n.length > 0);
    return !0;
  };
});

export { am };
