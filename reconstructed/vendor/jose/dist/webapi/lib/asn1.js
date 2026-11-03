/**
 * jose/dist/webapi/lib/asn1.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (4)
 * attribution: esm-fingerprint 4
 */
import { JOSENotSupported } from "../../node/esm/util/errors.js";
import { decodeBase64 } from "./base64.js";

//@ chunk-5h78gfwc.js:20113-20373 esm-fingerprint
var bytesEqual = (a, b) => {
  if (a.byteLength !== b.length) return false;
  for (let i = 0; i < a.byteLength; i++) if (a[i] !== b[i]) return false;
  return true;
};
var createASN1State = (data) => ({
  data,
  pos: 0,
});
var parseLength = (state) => {
  let first = state.data[state.pos++];
  if (first & 128) {
    let lengthOfLen = first & 127;
    let length = 0;
    for (let i = 0; i < lengthOfLen; i++) length = (length << 8) | state.data[state.pos++];
    return length;
  }
  return first;
};
//@ chunk-5h78gfwc.js:20373-20566 esm-fingerprint
var expectTag = (state, t, errorMessage) => {
  if (state.data[state.pos++] !== t) throw Error(errorMessage);
};
var getSubarray = (state, length) => {
  let result = state.data.subarray(state.pos, state.pos + length);
  state.pos += length;
  return result;
};
var parseAlgorithmOID = (state) => {
  expectTag(state, 6, "Expected algorithm OID");
  let oidLen = parseLength(state);
  return getSubarray(state, oidLen);
};
//@ chunk-5h78gfwc.js:20566-20769 esm-fingerprint
function parsePKCS8Header(state) {
  expectTag(state, 48, "Invalid PKCS#8 structure");
  parseLength(state);
  expectTag(state, 2, "Expected version field");
  let verLen = parseLength(state);
  state.pos += verLen;
  expectTag(state, 48, "Expected algorithm identifier");
  let algIdLen = parseLength(state);
  return {
    algIdStart: state.pos,
    algIdLength: algIdLen,
  };
}
//@ chunk-5h78gfwc.js:20769-22492 esm-fingerprint
var parseECAlgorithmIdentifier = (state) => {
  let algOid = parseAlgorithmOID(state);
  if (bytesEqual(algOid, [43, 101, 110])) return "X25519";
  if (!bytesEqual(algOid, [42, 134, 72, 206, 61, 2, 1])) throw Error("Unsupported key algorithm");
  expectTag(state, 6, "Expected curve OID");
  let curveOidLen = parseLength(state);
  let curveOid = getSubarray(state, curveOidLen);
  for (let { name, oid } of [
    {
      name: "P-256",
      oid: [42, 134, 72, 206, 61, 3, 1, 7],
    },
    {
      name: "P-384",
      oid: [43, 129, 4, 0, 34],
    },
    {
      name: "P-521",
      oid: [43, 129, 4, 0, 35],
    },
  ])
    if (bytesEqual(curveOid, oid)) return name;
  throw Error("Unsupported named curve");
};
var genericImport = async (keyFormat, keyData, alg, options) => {
  let algorithm;
  let keyUsages;
  let isPublic = keyFormat === "spki";
  let getSigUsages = () => (isPublic ? ["verify"] : ["sign"]);
  let getEncUsages = () => (isPublic ? ["encrypt", "wrapKey"] : ["decrypt", "unwrapKey"]);
  switch (alg) {
    case "PS256":
    case "PS384":
    case "PS512":
      algorithm = {
        name: "RSA-PSS",
        hash: `SHA-${alg.slice(-3)}`,
      };
      keyUsages = getSigUsages();
      break;
    case "RS256":
    case "RS384":
    case "RS512":
      algorithm = {
        name: "RSASSA-PKCS1-v1_5",
        hash: `SHA-${alg.slice(-3)}`,
      };
      keyUsages = getSigUsages();
      break;
    case "RSA-OAEP":
    case "RSA-OAEP-256":
    case "RSA-OAEP-384":
    case "RSA-OAEP-512":
      algorithm = {
        name: "RSA-OAEP",
        hash: `SHA-${parseInt(alg.slice(-3), 10) || 1}`,
      };
      keyUsages = getEncUsages();
      break;
    case "ES256":
    case "ES384":
    case "ES512": {
      algorithm = {
        name: "ECDSA",
        namedCurve: {
          ES256: "P-256",
          ES384: "P-384",
          ES512: "P-521",
        }[alg],
      };
      keyUsages = getSigUsages();
      break;
    }
    case "ECDH-ES":
    case "ECDH-ES+A128KW":
    case "ECDH-ES+A192KW":
    case "ECDH-ES+A256KW": {
      try {
        let namedCurve = options.getNamedCurve(keyData);
        algorithm =
          namedCurve === "X25519"
            ? {
                name: "X25519",
              }
            : {
                name: "ECDH",
                namedCurve,
              };
      } catch (cause) {
        throw new JOSENotSupported("Invalid or unsupported key format");
      }
      keyUsages = isPublic ? [] : ["deriveBits"];
      break;
    }
    case "Ed25519":
    case "EdDSA":
      algorithm = {
        name: "Ed25519",
      };
      keyUsages = getSigUsages();
      break;
    case "ML-DSA-44":
    case "ML-DSA-65":
    case "ML-DSA-87":
      algorithm = {
        name: alg,
      };
      keyUsages = getSigUsages();
      break;
    default:
      throw new JOSENotSupported('Invalid or unsupported "alg" (Algorithm) value');
  }
  return crypto.subtle.importKey(
    keyFormat,
    keyData,
    algorithm,
    options?.extractable ?? (isPublic ? true : false),
    keyUsages,
  );
};
var processPEMData = (pem, pattern) => decodeBase64(pem.replace(pattern, ""));
var fromPKCS8 = (pem, alg, options) => {
  let keyData = processPEMData(pem, /(?:-----(?:BEGIN|END) PRIVATE KEY-----|\s)/g);
  let opts = options;
  if (alg?.startsWith?.("ECDH-ES")) {
    opts ||= {};
    opts.getNamedCurve = (keyData) => {
      let state = createASN1State(keyData);
      parsePKCS8Header(state);
      return parseECAlgorithmIdentifier(state);
    };
  }
  return genericImport("pkcs8", keyData, alg, opts);
};
export { fromPKCS8 };
