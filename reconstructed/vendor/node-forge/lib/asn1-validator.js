/**
 * node-forge/lib/asn1-validator.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: node-forge@1.4.0
 * pieces: chunk-fq0cr76a.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_forge } from "./forge.js";
import { require_asn1 } from "./asn1.js";

//@ chunk-fq0cr76a.js:259538-260717 cjs-fingerprint
var require_asn1_validator = x(function (cjsExports) {
  var forge = require_forge();
  require_asn1();
  var asn1 = forge.asn1;
  cjsExports.privateKeyValidator = {
    name: "PrivateKeyInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    value: [
      {
        name: "PrivateKeyInfo.version",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.INTEGER,
        constructed: false,
        capture: "privateKeyVersion",
      },
      {
        name: "PrivateKeyInfo.privateKeyAlgorithm",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "AlgorithmIdentifier.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "privateKeyOid",
          },
        ],
      },
      {
        name: "PrivateKeyInfo",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.OCTETSTRING,
        constructed: false,
        capture: "privateKey",
      },
    ],
  };
  cjsExports.publicKeyValidator = {
    name: "SubjectPublicKeyInfo",
    tagClass: asn1.Class.UNIVERSAL,
    type: asn1.Type.SEQUENCE,
    constructed: true,
    captureAsn1: "subjectPublicKeyInfo",
    value: [
      {
        name: "SubjectPublicKeyInfo.AlgorithmIdentifier",
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.SEQUENCE,
        constructed: true,
        value: [
          {
            name: "AlgorithmIdentifier.algorithm",
            tagClass: asn1.Class.UNIVERSAL,
            type: asn1.Type.OID,
            constructed: false,
            capture: "publicKeyOid",
          },
        ],
      },
      {
        tagClass: asn1.Class.UNIVERSAL,
        type: asn1.Type.BITSTRING,
        constructed: false,
        composed: true,
        captureBitStringValue: "ed25519PublicKey",
      },
    ],
  };
});
export { require_asn1_validator };
