/**
 * jwa/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jwa@2.0.1
 * pieces: chunk-82d8c88w.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../runtime/bun-runtime.js";
import { require_safe_buffer } from "../safe-buffer/index.js";
import { require_ecdsa_sig_formatter } from "../ecdsa-sig-formatter/src/ecdsa-sig-formatter.js";
import { require_buffer_equal_constant_time } from "../buffer-equal-constant-time/index.js";

//@ chunk-82d8c88w.js:4461-7580 cjs-fingerprint
var require_jwa = __commonJS(function (cjsExports, cjsModule) {
  var BufferCtor = require_safe_buffer().Buffer;
  var cryptoModule = importMetaRequire("crypto");
  var formatEcdsa = require_ecdsa_sig_formatter();
  var util = importMetaRequire("util");
  var MSG_INVALID_ALGORITHM = `"%s" is not a valid algorithm.
  Supported algorithms are:
  "HS256", "HS384", "HS512", "RS256", "RS384", "RS512", "PS256", "PS384", "PS512", "ES256", "ES384", "ES512" and "none".`;
  var MSG_INVALID_SECRET = "secret must be a string or buffer";
  var MSG_INVALID_VERIFIER_KEY = "key must be a string or a buffer";
  var MSG_INVALID_SIGNER_KEY = "key must be a string, a buffer or an object";
  var supportsKeyObjects = typeof cryptoModule.createPublicKey === "function";
  if (supportsKeyObjects) {
    MSG_INVALID_VERIFIER_KEY += " or a KeyObject";
    MSG_INVALID_SECRET += "or a KeyObject";
  }
  function checkIsPublicKey(key) {
    if (BufferCtor.isBuffer(key)) return;
    if (typeof key === "string") return;
    if (!supportsKeyObjects) throw typeError(MSG_INVALID_VERIFIER_KEY);
    if (typeof key !== "object") throw typeError(MSG_INVALID_VERIFIER_KEY);
    if (typeof key.type !== "string") throw typeError(MSG_INVALID_VERIFIER_KEY);
    if (typeof key.asymmetricKeyType !== "string") throw typeError(MSG_INVALID_VERIFIER_KEY);
    if (typeof key.export !== "function") throw typeError(MSG_INVALID_VERIFIER_KEY);
  }
  function checkIsPrivateKey(key) {
    if (BufferCtor.isBuffer(key)) return;
    if (typeof key === "string") return;
    if (typeof key === "object") return;
    throw typeError(MSG_INVALID_SIGNER_KEY);
  }
  function checkIsSecretKey(key) {
    if (BufferCtor.isBuffer(key)) return;
    if (typeof key === "string") return key;
    if (!supportsKeyObjects) throw typeError(MSG_INVALID_SECRET);
    if (typeof key !== "object") throw typeError(MSG_INVALID_SECRET);
    if (key.type !== "secret") throw typeError(MSG_INVALID_SECRET);
    if (typeof key.export !== "function") throw typeError(MSG_INVALID_SECRET);
  }
  function fromBase64(base64) {
    return base64.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
  }
  function toBase64(base64url) {
    base64url = base64url.toString();
    var padding = 4 - (base64url.length % 4);
    if (padding !== 4) for (var i = 0; i < padding; ++i) base64url += "=";
    return base64url.replace(/\-/g, "+").replace(/_/g, "/");
  }
  function typeError(template) {
    var args = [].slice.call(arguments, 1);
    var errMsg = util.format.bind(util, template).apply(null, args);
    return TypeError(errMsg);
  }
  function bufferOrString(obj) {
    return BufferCtor.isBuffer(obj) || typeof obj === "string";
  }
  function normalizeInput(thing) {
    if (!bufferOrString(thing)) thing = JSON.stringify(thing);
    return thing;
  }
  function createHmacSigner(bits) {
    return function (thing, secret) {
      checkIsSecretKey(secret);
      thing = normalizeInput(thing);
      var hmac = cryptoModule.createHmac("sha" + bits, secret);
      var sig = (hmac.update(thing), hmac.digest("base64"));
      return fromBase64(sig);
    };
  }
  var bufferEqual;
  var timingSafeEqual =
    "timingSafeEqual" in cryptoModule
      ? function (a, b) {
          if (a.byteLength !== b.byteLength) return false;
          return cryptoModule.timingSafeEqual(a, b);
        }
      : function (a, b) {
          if (!bufferEqual) bufferEqual = require_buffer_equal_constant_time();
          return bufferEqual(a, b);
        };
  function createHmacVerifier(bits) {
    return function (thing, signature, secret) {
      var computedSig = createHmacSigner(bits)(thing, secret);
      return timingSafeEqual(BufferCtor.from(signature), BufferCtor.from(computedSig));
    };
  }
  function createKeySigner(bits) {
    return function (thing, privateKey) {
      checkIsPrivateKey(privateKey);
      thing = normalizeInput(thing);
      var signer = cryptoModule.createSign("RSA-SHA" + bits);
      var sig = (signer.update(thing), signer.sign(privateKey, "base64"));
      return fromBase64(sig);
    };
  }
  function createKeyVerifier(bits) {
    return function (thing, signature, publicKey) {
      checkIsPublicKey(publicKey);
      thing = normalizeInput(thing);
      signature = toBase64(signature);
      var verifier = cryptoModule.createVerify("RSA-SHA" + bits);
      verifier.update(thing);
      return verifier.verify(publicKey, signature, "base64");
    };
  }
  function createPSSKeySigner(bits) {
    return function (thing, privateKey) {
      checkIsPrivateKey(privateKey);
      thing = normalizeInput(thing);
      var signer = cryptoModule.createSign("RSA-SHA" + bits);
      var sig =
        (signer.update(thing),
        signer.sign(
          {
            key: privateKey,
            padding: cryptoModule.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: cryptoModule.constants.RSA_PSS_SALTLEN_DIGEST,
          },
          "base64",
        ));
      return fromBase64(sig);
    };
  }
  function createPSSKeyVerifier(bits) {
    return function (thing, signature, publicKey) {
      checkIsPublicKey(publicKey);
      thing = normalizeInput(thing);
      signature = toBase64(signature);
      var verifier = cryptoModule.createVerify("RSA-SHA" + bits);
      verifier.update(thing);
      return verifier.verify(
        {
          key: publicKey,
          padding: cryptoModule.constants.RSA_PKCS1_PSS_PADDING,
          saltLength: cryptoModule.constants.RSA_PSS_SALTLEN_DIGEST,
        },
        signature,
        "base64",
      );
    };
  }
  function createECDSASigner(bits) {
    var inner = createKeySigner(bits);
    return function () {
      var signature = inner.apply(null, arguments);
      signature = formatEcdsa.derToJose(signature, "ES" + bits);
      return signature;
    };
  }
  function createECDSAVerifer(bits) {
    var inner = createKeyVerifier(bits);
    return function (thing, signature, publicKey) {
      signature = formatEcdsa.joseToDer(signature, "ES" + bits).toString("base64");
      var result = inner(thing, signature, publicKey);
      return result;
    };
  }
  function createNoneSigner() {
    return function () {
      return "";
    };
  }
  function createNoneVerifier() {
    return function (thing, signature) {
      return signature === "";
    };
  }
  cjsModule.exports = function (algorithm) {
    var signerFactories = {
      hs: createHmacSigner,
      rs: createKeySigner,
      ps: createPSSKeySigner,
      es: createECDSASigner,
      none: createNoneSigner,
    };
    var verifierFactories = {
      hs: createHmacVerifier,
      rs: createKeyVerifier,
      ps: createPSSKeyVerifier,
      es: createECDSAVerifer,
      none: createNoneVerifier,
    };
    var match = algorithm.match(/^(RS|PS|ES|HS)(256|384|512)$|^(none)$/);
    if (!match) throw typeError(MSG_INVALID_ALGORITHM, algorithm);
    var algo = (match[1] || match[3]).toLowerCase();
    var bits = match[2];
    return {
      sign: signerFactories[algo](bits),
      verify: verifierFactories[algo](bits),
    };
  };
});
export { require_jwa };
