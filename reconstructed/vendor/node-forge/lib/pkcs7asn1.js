/**
 * node-forge/lib/pkcs7asn1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Tn } from "./forge.js";
import { Xi } from "./asn1.js";
import { Zn } from "./util.js";

//@ chunk-fq0cr76a.js:152921-158192 cjs-fingerprint
var TS = x(function (Ife, yA) {
  var uu = Tn();
  Xi();
  Zn();
  var asn1 = uu.asn1,
    du = (yA.exports = uu.pkcs7asn1 = uu.pkcs7asn1 || {});
  uu.pkcs7 = uu.pkcs7 || {};
  uu.pkcs7.asn1 = du;
  var mA = {
    name: "ContentInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "ContentInfo.ContentType",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: !1,
        capture: "contentType",
      },
      {
        name: "ContentInfo.content",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        constructed: !0,
        optional: !0,
        captureAsn1: "content",
      },
    ],
  };
  du.contentInfoValidator = mA;
  var gA = {
    name: "EncryptedContentInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "EncryptedContentInfo.contentType",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: !1,
        capture: "contentType",
      },
      {
        name: "EncryptedContentInfo.contentEncryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: !0,
        value: [
          {
            name: "EncryptedContentInfo.contentEncryptionAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: !1,
            capture: "encAlgorithm",
          },
          {
            name: "EncryptedContentInfo.contentEncryptionAlgorithm.parameter",
            tagClass: asn1.Class.UNIVERSAL,
            captureAsn1: "encParameter",
          },
        ],
      },
      {
        name: "EncryptedContentInfo.encryptedContent",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        capture: "encryptedContent",
        captureAsn1: "encryptedContentAsn1",
      },
    ],
  };
  du.envelopedDataValidator = {
    name: "EnvelopedData",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "EnvelopedData.Version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: !1,
        capture: "version",
      },
      {
        name: "EnvelopedData.RecipientInfos",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: !0,
        captureAsn1: "recipientInfos",
      },
    ].concat(gA),
  };
  du.encryptedDataValidator = {
    name: "EncryptedData",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "EncryptedData.Version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: !1,
        capture: "version",
      },
    ].concat(gA),
  };
  var DG = {
    name: "SignerInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "SignerInfo.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: !1,
      },
      {
        name: "SignerInfo.issuerAndSerialNumber",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: !0,
        value: [
          {
            name: "SignerInfo.issuerAndSerialNumber.issuer",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: !0,
            captureAsn1: "issuer",
          },
          {
            name: "SignerInfo.issuerAndSerialNumber.serialNumber",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.INTEGER,
            constructed: !1,
            capture: "serial",
          },
        ],
      },
      {
        name: "SignerInfo.digestAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: !0,
        value: [
          {
            name: "SignerInfo.digestAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: !1,
            capture: "digestAlgorithm",
          },
          {
            name: "SignerInfo.digestAlgorithm.parameter",
            tagClass: asn1.Class.UNIVERSAL,
            constructed: !1,
            captureAsn1: "digestParameter",
            optional: !0,
          },
        ],
      },
      {
        name: "SignerInfo.authenticatedAttributes",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        constructed: !0,
        optional: !0,
        capture: "authenticatedAttributes",
      },
      {
        name: "SignerInfo.digestEncryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: !0,
        capture: "signatureAlgorithm",
      },
      {
        name: "SignerInfo.encryptedDigest",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: !1,
        capture: "signature",
      },
      {
        name: "SignerInfo.unauthenticatedAttributes",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 1,
        constructed: !0,
        optional: !0,
        capture: "unauthenticatedAttributes",
      },
    ],
  };
  du.signedDataValidator = {
    name: "SignedData",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "SignedData.Version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: !1,
        capture: "version",
      },
      {
        name: "SignedData.DigestAlgorithms",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: !0,
        captureAsn1: "digestAlgorithms",
      },
      mA,
      {
        name: "SignedData.Certificates",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        optional: !0,
        captureAsn1: "certificates",
      },
      {
        name: "SignedData.CertificateRevocationLists",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 1,
        optional: !0,
        captureAsn1: "crls",
      },
      {
        name: "SignedData.SignerInfos",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        capture: "signerInfos",
        optional: !0,
        value: [DG],
      },
    ],
  };
  du.recipientInfoValidator = {
    name: "RecipientInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: !0,
    value: [
      {
        name: "RecipientInfo.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: !1,
        capture: "version",
      },
      {
        name: "RecipientInfo.issuerAndSerial",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: !0,
        value: [
          {
            name: "RecipientInfo.issuerAndSerial.issuer",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: !0,
            captureAsn1: "issuer",
          },
          {
            name: "RecipientInfo.issuerAndSerial.serialNumber",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.INTEGER,
            constructed: !1,
            capture: "serial",
          },
        ],
      },
      {
        name: "RecipientInfo.keyEncryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: !0,
        value: [
          {
            name: "RecipientInfo.keyEncryptionAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: !1,
            capture: "encAlgorithm",
          },
          {
            name: "RecipientInfo.keyEncryptionAlgorithm.parameter",
            tagClass: asn1.Class.UNIVERSAL,
            constructed: !1,
            captureAsn1: "encParameter",
            optional: !0,
          },
        ],
      },
      {
        name: "RecipientInfo.encryptedKey",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: !1,
        capture: "encKey",
      },
    ],
  };
});

export { TS };
