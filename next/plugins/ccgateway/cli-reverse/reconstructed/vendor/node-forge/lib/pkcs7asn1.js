/**
 * node-forge/lib/pkcs7asn1.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-qg41pqt6.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_asn1 } from "./asn1.js";
import { require_util } from "./util.js";

//@ chunk-qg41pqt6.js:152959-158230 cjs-fingerprint
var require_pkcs7asn1 = __commonJS(function (cjsExports, cjsModule) {
  var forge = require_forge();
  require_asn1();
  require_util();
  var asn1 = forge.asn1;
  var p7v = (cjsModule.exports = forge.pkcs7asn1 = forge.pkcs7asn1 || {});
  forge.pkcs7 = forge.pkcs7 || {};
  forge.pkcs7.asn1 = p7v;
  var contentInfoValidator = {
    name: "ContentInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "ContentInfo.ContentType",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: "contentType",
      },
      {
        name: "ContentInfo.content",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        constructed: true,
        optional: true,
        captureAsn1: "content",
      },
    ],
  };
  p7v.contentInfoValidator = contentInfoValidator;
  var encryptedContentInfoValidator = {
    name: "EncryptedContentInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "EncryptedContentInfo.contentType",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OID,
        constructed: false,
        capture: "contentType",
      },
      {
        name: "EncryptedContentInfo.contentEncryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "EncryptedContentInfo.contentEncryptionAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
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
  p7v.envelopedDataValidator = {
    name: "EnvelopedData",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "EnvelopedData.Version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "version",
      },
      {
        name: "EnvelopedData.RecipientInfos",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: true,
        captureAsn1: "recipientInfos",
      },
    ].concat(encryptedContentInfoValidator),
  };
  p7v.encryptedDataValidator = {
    name: "EncryptedData",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "EncryptedData.Version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "version",
      },
    ].concat(encryptedContentInfoValidator),
  };
  var signerValidator = {
    name: "SignerInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "SignerInfo.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
      },
      {
        name: "SignerInfo.issuerAndSerialNumber",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "SignerInfo.issuerAndSerialNumber.issuer",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: "issuer",
          },
          {
            name: "SignerInfo.issuerAndSerialNumber.serialNumber",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.INTEGER,
            constructed: false,
            capture: "serial",
          },
        ],
      },
      {
        name: "SignerInfo.digestAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "SignerInfo.digestAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "digestAlgorithm",
          },
          {
            name: "SignerInfo.digestAlgorithm.parameter",
            tagClass: asn1.Class.UNIVERSAL,
            constructed: false,
            captureAsn1: "digestParameter",
            optional: true,
          },
        ],
      },
      {
        name: "SignerInfo.authenticatedAttributes",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        constructed: true,
        optional: true,
        capture: "authenticatedAttributes",
      },
      {
        name: "SignerInfo.digestEncryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        capture: "signatureAlgorithm",
      },
      {
        name: "SignerInfo.encryptedDigest",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: false,
        capture: "signature",
      },
      {
        name: "SignerInfo.unauthenticatedAttributes",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 1,
        constructed: true,
        optional: true,
        capture: "unauthenticatedAttributes",
      },
    ],
  };
  p7v.signedDataValidator = {
    name: "SignedData",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "SignedData.Version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "version",
      },
      {
        name: "SignedData.DigestAlgorithms",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        constructed: true,
        captureAsn1: "digestAlgorithms",
      },
      contentInfoValidator,
      {
        name: "SignedData.Certificates",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 0,
        optional: true,
        captureAsn1: "certificates",
      },
      {
        name: "SignedData.CertificateRevocationLists",
        tagClass: asn1.Class.CONTEXT_SPECIFIC,
        type: 1,
        optional: true,
        captureAsn1: "crls",
      },
      {
        name: "SignedData.SignerInfos",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SET,
        capture: "signerInfos",
        optional: true,
        value: [signerValidator],
      },
    ],
  };
  p7v.recipientInfoValidator = {
    name: "RecipientInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "RecipientInfo.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "version",
      },
      {
        name: "RecipientInfo.issuerAndSerial",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "RecipientInfo.issuerAndSerial.issuer",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.SEQUENCE,
            constructed: true,
            captureAsn1: "issuer",
          },
          {
            name: "RecipientInfo.issuerAndSerial.serialNumber",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.INTEGER,
            constructed: false,
            capture: "serial",
          },
        ],
      },
      {
        name: "RecipientInfo.keyEncryptionAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "RecipientInfo.keyEncryptionAlgorithm.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "encAlgorithm",
          },
          {
            name: "RecipientInfo.keyEncryptionAlgorithm.parameter",
            tagClass: asn1.Class.UNIVERSAL,
            constructed: false,
            captureAsn1: "encParameter",
            optional: true,
          },
        ],
      },
      {
        name: "RecipientInfo.encryptedKey",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: false,
        capture: "encKey",
      },
    ],
  };
});
export { require_pkcs7asn1 };
