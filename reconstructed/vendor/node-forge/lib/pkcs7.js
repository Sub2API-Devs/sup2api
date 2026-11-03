/**
 * node-forge/lib/pkcs7.js
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
import { Ja } from "./oids.js";
import { sc } from "./pem.js";
import { TS } from "./pkcs7asn1.js";
import { Ci } from "./random.js";
import { Zn } from "./util.js";
import { am } from "./x509.js";

//@ chunk-fq0cr76a.js:277801-293009 cjs-fingerprint
var mC = x(function (Hfe, hC) {
  var Et = Tn();
  Xa();
  Xi();
  bf();
  Ja();
  sc();
  TS();
  Ci();
  Zn();
  am();
  var asn1 = Et.asn1,
    Hs = (hC.exports = Et.pkcs7 = Et.pkcs7 || {});
  Hs.messageFromPem = function (e) {
    var n = Et.pem.decode(e)[0];
    if (n.type !== "PKCS7") {
      var r = Error('Could not convert PKCS#7 message from PEM; PEM header type is not "PKCS#7".');
      throw ((r.headerType = n.type), r);
    }
    if (n.procType && n.procType.type === "ENCRYPTED")
      throw Error("Could not convert PKCS#7 message from PEM; PEM is encrypted.");
    var fromDer = asn1.fromDer(n.body);
    return Hs.messageFromAsn1(fromDer);
  };
  Hs.messageToPem = function (e, n) {
    var r = { type: "PKCS7", body: asn1.toDer(e.toAsn1()).getBytes() };
    return Et.pem.encode(r, { maxline: n });
  };
  Hs.messageFromAsn1 = function (e) {
    var n = {},
      r = [];
    if (!asn1.validate(e, Hs.asn1.contentInfoValidator, n, r)) {
      var s = Error("Cannot read PKCS#7 message. ASN.1 object is not an PKCS#7 ContentInfo.");
      throw ((s.errors = r), s);
    }
    var derToOid = asn1.derToOid(n.contentType),
      y;
    switch (derToOid) {
      case Et.pki.oids.envelopedData:
        y = Hs.createEnvelopedData();
        break;
      case Et.pki.oids.encryptedData:
        y = Hs.createEncryptedData();
        break;
      case Et.pki.oids.signedData:
        y = Hs.createSignedData();
        break;
      default:
        throw Error(
          "Cannot read PKCS#7 message. ContentType with OID " + derToOid + " is not (yet) supported.",
        );
    }
    return (y.fromAsn1(n.content.value[0]), y);
  };
  Hs.createSignedData = function () {
    var e = null;
    return (
      (e = {
        type: Et.pki.oids.signedData,
        version: 1,
        certificates: [],
        crls: [],
        signers: [],
        digestAlgorithmIdentifiers: [],
        contentInfo: null,
        signerInfos: [],
        fromAsn1: function (s) {
          if (
            (QS(e, s, Hs.asn1.signedDataValidator),
            (e.certificates = []),
            (e.crls = []),
            (e.digestAlgorithmIdentifiers = []),
            (e.contentInfo = null),
            (e.signerInfos = []),
            e.rawCapture.certificates)
          ) {
            var h = e.rawCapture.certificates.value;
            for (var y = 0; y < h.length; ++y) e.certificates.push(Et.pki.certificateFromAsn1(h[y]));
          }
        },
        toAsn1: function () {
          if (!e.contentInfo) e.sign();
          var s = [];
          for (var h = 0; h < e.certificates.length; ++h) s.push(Et.pki.certificateToAsn1(e.certificates[h]));
          var y = [],
            create = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.INTEGER,
                  !1,
                  asn1.integerToDer(e.version).getBytes(),
                ),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, e.digestAlgorithmIdentifiers),
                e.contentInfo,
              ]),
            ]);
          if (s.length > 0) create.value[0].value.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, s));
          if (y.length > 0) create.value[0].value.push(asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, !0, y));
          return (
            create.value[0].value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, e.signerInfos)),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.type).getBytes()),
              create,
            ])
          );
        },
        addSigner: function (s) {
          var { issuer: issuer, serialNumber: serialNumber } = s;
          if (s.certificate) {
            var certificate = s.certificate;
            if (typeof certificate === "string") certificate = Et.pki.certificateFromPem(certificate);
            ((issuer = certificate.issuer.attributes), (serialNumber = certificate.serialNumber));
          }
          var key = s.key;
          if (!key) throw Error("Could not add PKCS#7 signer; no private key specified.");
          if (typeof key === "string") key = Et.pki.privateKeyFromPem(key);
          var w = s.digestAlgorithm || Et.pki.oids.sha1;
          switch (w) {
            case Et.pki.oids.sha1:
            case Et.pki.oids.sha256:
            case Et.pki.oids.sha384:
            case Et.pki.oids.sha512:
            case Et.pki.oids.md5:
              break;
            default:
              throw Error("Could not add PKCS#7 signer; unknown message digest algorithm: " + w);
          }
          var R = s.authenticatedAttributes || [];
          if (R.length > 0) {
            var D = !1,
              O = !1;
            for (var L = 0; L < R.length; ++L) {
              var V = R[L];
              if (!D && V.type === Et.pki.oids.contentType) {
                if (((D = !0), O)) break;
                continue;
              }
              if (!O && V.type === Et.pki.oids.messageDigest) {
                if (((O = !0), D)) break;
                continue;
              }
            }
            if (!D || !O)
              throw Error(
                "Invalid signer.authenticatedAttributes. If signer.authenticatedAttributes is specified, then it must contain at least two attributes, PKCS #9 content-type and PKCS #9 message-digest.",
              );
          }
          e.signers.push({
            key: key,
            version: 1,
            issuer: issuer,
            serialNumber: serialNumber,
            digestAlgorithm: w,
            signatureAlgorithm: Et.pki.oids.rsaEncryption,
            signature: null,
            authenticatedAttributes: R,
            unauthenticatedAttributes: [],
          });
        },
        sign: function (s) {
          if (((s = s || {}), typeof e.content !== "object" || e.contentInfo === null)) {
            if (
              ((e.contentInfo = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.OID,
                  !1,
                  asn1.oidToDer(Et.pki.oids.data).getBytes(),
                ),
              ])),
              "content" in e)
            ) {
              var h;
              if (e.content instanceof Et.util.ByteBuffer) h = e.content.bytes();
              else if (typeof e.content === "string") h = Et.util.encodeUtf8(e.content);
              if (s.detached)
                e.detachedContent = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, h);
              else
                e.contentInfo.value.push(
                  asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
                    asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, h),
                  ]),
                );
            }
          }
          if (e.signers.length === 0) return;
          var y = n();
          r(y);
        },
        verify: function () {
          throw Error("PKCS#7 signature verification not yet implemented.");
        },
        addCertificate: function (s) {
          if (typeof s === "string") s = Et.pki.certificateFromPem(s);
          e.certificates.push(s);
        },
        addCertificateRevokationList: function (s) {
          throw Error("PKCS#7 CRL support not yet implemented.");
        },
      }),
      e
    );
    function n() {
      var s = {};
      for (var h = 0; h < e.signers.length; ++h) {
        var y = e.signers[h],
          digestAlgorithm = y.digestAlgorithm;
        if (!(digestAlgorithm in s)) s[digestAlgorithm] = Et.md[Et.pki.oids[digestAlgorithm]].create();
        if (y.authenticatedAttributes.length === 0) y.md = s[digestAlgorithm];
        else y.md = Et.md[Et.pki.oids[digestAlgorithm]].create();
      }
      e.digestAlgorithmIdentifiers = [];
      for (var digestAlgorithm in s)
        e.digestAlgorithmIdentifiers.push(
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(digestAlgorithm).getBytes()),
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
          ]),
        );
      return s;
    }
    function r(s) {
      var h;
      if (e.detachedContent) h = e.detachedContent;
      else ((h = e.contentInfo.value[1]), (h = h.value[0]));
      if (!h) throw Error("Could not sign PKCS#7 message; there is no content to sign.");
      var derToOid = asn1.derToOid(e.contentInfo.value[0].value),
        toDer = asn1.toDer(h);
      (toDer.getByte(), asn1.getBerValueLength(toDer), (toDer = toDer.getBytes()));
      for (var key in s) s[key].start().update(toDer);
      var date = new Date();
      for (var R = 0; R < e.signers.length; ++R) {
        var D = e.signers[R];
        if (D.authenticatedAttributes.length === 0) {
          if (derToOid !== Et.pki.oids.data)
            throw Error(
              "Invalid signer; authenticatedAttributes must be present when the ContentInfo content type is not PKCS#7 Data.",
            );
        } else {
          D.authenticatedAttributesAsn1 = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, []);
          var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, []);
          for (var L = 0; L < D.authenticatedAttributes.length; ++L) {
            var V = D.authenticatedAttributes[L];
            if (V.type === Et.pki.oids.messageDigest) V.value = s[D.digestAlgorithm].digest();
            else if (V.type === Et.pki.oids.signingTime) {
              if (!V.value) V.value = date;
            }
            (create.value.push(JS(V)), D.authenticatedAttributesAsn1.value.push(JS(V)));
          }
          ((toDer = asn1.toDer(create).getBytes()), D.md.start().update(toDer));
        }
        D.signature = D.key.sign(D.md, "RSASSA-PKCS1-V1_5");
      }
      e.signerInfos = Z6(e.signers);
    }
  };
  Hs.createEncryptedData = function () {
    var e = null;
    return (
      (e = {
        type: Et.pki.oids.encryptedData,
        version: 0,
        encryptedContent: { algorithm: Et.pki.oids["aes256-CBC"] },
        fromAsn1: function (n) {
          QS(e, n, Hs.asn1.encryptedDataValidator);
        },
        decrypt: function (n) {
          if (n !== void 0) e.encryptedContent.key = n;
          pC(e);
        },
      }),
      e
    );
  };
  Hs.createEnvelopedData = function () {
    var e = null;
    return (
      (e = {
        type: Et.pki.oids.envelopedData,
        version: 0,
        recipients: [],
        encryptedContent: { algorithm: Et.pki.oids["aes256-CBC"] },
        fromAsn1: function (n) {
          var r = QS(e, n, Hs.asn1.envelopedDataValidator);
          e.recipients = q6(r.recipientInfos.value);
        },
        toAsn1: function () {
          return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
            asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.type).getBytes()),
            asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
              asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
                asn1.create(
                  asn1.Class.UNIVERSAL,
                  asn1.Type.INTEGER,
                  !1,
                  asn1.integerToDer(e.version).getBytes(),
                ),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, j6(e.recipients)),
                asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, X6(e.encryptedContent)),
              ]),
            ]),
          ]);
        },
        findRecipient: function (n) {
          var attributes = n.issuer.attributes;
          for (var s = 0; s < e.recipients.length; ++s) {
            var h = e.recipients[s],
              issuer = h.issuer;
            if (h.serialNumber !== n.serialNumber) continue;
            if (issuer.length !== attributes.length) continue;
            var b = !0;
            for (var S = 0; S < attributes.length; ++S)
              if (issuer[S].type !== attributes[S].type || issuer[S].value !== attributes[S].value) {
                b = !1;
                break;
              }
            if (b) return h;
          }
          return null;
        },
        decrypt: function (n, r) {
          if (e.encryptedContent.key === void 0 && n !== void 0 && r !== void 0)
            switch (n.encryptedContent.algorithm) {
              case Et.pki.oids.rsaEncryption:
              case Et.pki.oids.desCBC:
                var decrypt = r.decrypt(n.encryptedContent.content);
                e.encryptedContent.key = Et.util.createBuffer(decrypt);
                break;
              default:
                throw Error("Unsupported asymmetric cipher, OID " + n.encryptedContent.algorithm);
            }
          pC(e);
        },
        addRecipient: function (n) {
          e.recipients.push({
            version: 0,
            issuer: n.issuer.attributes,
            serialNumber: n.serialNumber,
            encryptedContent: { algorithm: Et.pki.oids.rsaEncryption, key: n.publicKey },
          });
        },
        encrypt: function (n, r) {
          if (e.encryptedContent.content === void 0) {
            ((r = r || e.encryptedContent.algorithm), (n = n || e.encryptedContent.key));
            var s, h, y;
            switch (r) {
              case Et.pki.oids["aes128-CBC"]:
                ((s = 16), (h = 16), (y = Et.aes.createEncryptionCipher));
                break;
              case Et.pki.oids["aes192-CBC"]:
                ((s = 24), (h = 16), (y = Et.aes.createEncryptionCipher));
                break;
              case Et.pki.oids["aes256-CBC"]:
                ((s = 32), (h = 16), (y = Et.aes.createEncryptionCipher));
                break;
              case Et.pki.oids["des-EDE3-CBC"]:
                ((s = 24), (h = 8), (y = Et.des.createEncryptionCipher));
                break;
              default:
                throw Error("Unsupported symmetric cipher, OID " + r);
            }
            if (n === void 0) n = Et.util.createBuffer(Et.random.getBytes(s));
            else if (n.length() != s)
              throw Error(
                "Symmetric key has wrong length; got " + n.length() + " bytes, expected " + s + ".",
              );
            ((e.encryptedContent.algorithm = r),
              (e.encryptedContent.key = n),
              (e.encryptedContent.parameter = Et.util.createBuffer(Et.random.getBytes(h))));
            var b = y(n);
            if ((b.start(e.encryptedContent.parameter.copy()), b.update(e.content), !b.finish()))
              throw Error("Symmetric encryption failed.");
            e.encryptedContent.content = b.output;
          }
          for (var S = 0; S < e.recipients.length; ++S) {
            var w = e.recipients[S];
            if (w.encryptedContent.content !== void 0) continue;
            switch (w.encryptedContent.algorithm) {
              case Et.pki.oids.rsaEncryption:
                w.encryptedContent.content = w.encryptedContent.key.encrypt(e.encryptedContent.key.data);
                break;
              default:
                throw Error("Unsupported asymmetric cipher, OID " + w.encryptedContent.algorithm);
            }
          }
        },
      }),
      e
    );
  };
  function H6(e) {
    var n = {},
      r = [];
    if (!asn1.validate(e, Hs.asn1.recipientInfoValidator, n, r)) {
      var s = Error("Cannot read PKCS#7 RecipientInfo. ASN.1 object is not an PKCS#7 RecipientInfo.");
      throw ((s.errors = r), s);
    }
    return {
      version: n.version.charCodeAt(0),
      issuer: Et.pki.RDNAttributesAsArray(n.issuer),
      serialNumber: Et.util.createBuffer(n.serial).toHex(),
      encryptedContent: {
        algorithm: asn1.derToOid(n.encAlgorithm),
        parameter: n.encParameter ? n.encParameter.value : void 0,
        content: n.encKey,
      },
    };
  }
  function K6(e) {
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(e.version).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        Et.pki.distinguishedNameToAsn1({ attributes: e.issuer }),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Et.util.hexToBytes(e.serialNumber)),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(
          asn1.Class.UNIVERSAL,
          asn1.Type.OID,
          !1,
          asn1.oidToDer(e.encryptedContent.algorithm).getBytes(),
        ),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e.encryptedContent.content),
    ]);
  }
  function q6(e) {
    var n = [];
    for (var r = 0; r < e.length; ++r) n.push(H6(e[r]));
    return n;
  }
  function j6(e) {
    var n = [];
    for (var r = 0; r < e.length; ++r) n.push(K6(e[r]));
    return n;
  }
  function Y6(e) {
    var create = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, asn1.integerToDer(e.version).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        Et.pki.distinguishedNameToAsn1({ attributes: e.issuer }),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.INTEGER, !1, Et.util.hexToBytes(e.serialNumber)),
      ]),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.digestAlgorithm).getBytes()),
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
      ]),
    ]);
    if (e.authenticatedAttributesAsn1) create.value.push(e.authenticatedAttributesAsn1);
    if (
      (create.value.push(
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
          asn1.create(
            asn1.Class.UNIVERSAL,
            asn1.Type.OID,
            !1,
            asn1.oidToDer(e.signatureAlgorithm).getBytes(),
          ),
          asn1.create(asn1.Class.UNIVERSAL, asn1.Type.NULL, !1, ""),
        ]),
      ),
      create.value.push(asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e.signature)),
      e.unauthenticatedAttributes.length > 0)
    ) {
      var create_2 = asn1.create(asn1.Class.CONTEXT_SPECIFIC, 1, !0, []);
      for (var s = 0; s < e.unauthenticatedAttributes.length; ++s) {
        var h = e.unauthenticatedAttributes[s];
        create_2.values.push(JS(h));
      }
      create.value.push(create_2);
    }
    return create;
  }
  function Z6(e) {
    var n = [];
    for (var r = 0; r < e.length; ++r) n.push(Y6(e[r]));
    return n;
  }
  function JS(e) {
    var n;
    if (e.type === Et.pki.oids.contentType)
      n = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.value).getBytes());
    else if (e.type === Et.pki.oids.messageDigest)
      n = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e.value.bytes());
    else if (e.type === Et.pki.oids.signingTime) {
      var date = new Date("1950-01-01T00:00:00Z"),
        date_2 = new Date("2050-01-01T00:00:00Z"),
        h = e.value;
      if (typeof h === "string") {
        var parse = Date.parse(h);
        if (!isNaN(parse)) h = new Date(parse);
        else if (h.length === 13) h = asn1.utcTimeToDate(h);
        else h = asn1.generalizedTimeToDate(h);
      }
      if (h >= date && h < date_2)
        n = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.UTCTIME, !1, asn1.dateToUtcTime(h));
      else
        n = asn1.create(asn1.Class.UNIVERSAL, asn1.Type.GENERALIZEDTIME, !1, asn1.dateToGeneralizedTime(h));
    }
    return asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.type).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SET, !0, [n]),
    ]);
  }
  function X6(e) {
    return [
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(Et.pki.oids.data).getBytes()),
      asn1.create(asn1.Class.UNIVERSAL, asn1.Type.SEQUENCE, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OID, !1, asn1.oidToDer(e.algorithm).getBytes()),
        !e.parameter
          ? void 0
          : asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e.parameter.getBytes()),
      ]),
      asn1.create(asn1.Class.CONTEXT_SPECIFIC, 0, !0, [
        asn1.create(asn1.Class.UNIVERSAL, asn1.Type.OCTETSTRING, !1, e.content.getBytes()),
      ]),
    ];
  }
  function QS(e, n, r) {
    var s = {},
      h = [];
    if (!asn1.validate(n, r, s, h)) {
      var y = Error("Cannot read PKCS#7 message. ASN.1 object is not a supported PKCS#7 message.");
      throw ((y.errors = y), y);
    }
    var derToOid = asn1.derToOid(s.contentType);
    if (derToOid !== Et.pki.oids.data)
      throw Error("Unsupported PKCS#7 message. Only wrapped ContentType Data supported.");
    if (s.encryptedContent) {
      var S = "";
      if (Et.util.isArray(s.encryptedContent))
        for (var w = 0; w < s.encryptedContent.length; ++w) {
          if (s.encryptedContent[w].type !== asn1.Type.OCTETSTRING)
            throw Error(
              "Malformed PKCS#7 message, expecting encrypted content constructed of only OCTET STRING objects.",
            );
          S += s.encryptedContent[w].value;
        }
      else S = s.encryptedContent;
      e.encryptedContent = {
        algorithm: asn1.derToOid(s.encAlgorithm),
        parameter: Et.util.createBuffer(s.encParameter.value),
        content: Et.util.createBuffer(S),
      };
    }
    if (s.content) {
      var S = "";
      if (Et.util.isArray(s.content))
        for (var w = 0; w < s.content.length; ++w) {
          if (s.content[w].type !== asn1.Type.OCTETSTRING)
            throw Error(
              "Malformed PKCS#7 message, expecting content constructed of only OCTET STRING objects.",
            );
          S += s.content[w].value;
        }
      else S = s.content;
      e.content = Et.util.createBuffer(S);
    }
    return ((e.version = s.version.charCodeAt(0)), (e.rawCapture = s), s);
  }
  function pC(e) {
    if (e.encryptedContent.key === void 0) throw Error("Symmetric key not available.");
    if (e.content === void 0) {
      var n;
      switch (e.encryptedContent.algorithm) {
        case Et.pki.oids["aes128-CBC"]:
        case Et.pki.oids["aes192-CBC"]:
        case Et.pki.oids["aes256-CBC"]:
          n = Et.aes.createDecryptionCipher(e.encryptedContent.key);
          break;
        case Et.pki.oids.desCBC:
        case Et.pki.oids["des-EDE3-CBC"]:
          n = Et.des.createDecryptionCipher(e.encryptedContent.key);
          break;
        default:
          throw Error("Unsupported symmetric cipher, OID " + e.encryptedContent.algorithm);
      }
      if ((n.start(e.encryptedContent.parameter), n.update(e.encryptedContent.content), !n.finish()))
        throw Error("Symmetric decryption failed.");
      e.content = n.output;
    }
  }
});

export { mC };
