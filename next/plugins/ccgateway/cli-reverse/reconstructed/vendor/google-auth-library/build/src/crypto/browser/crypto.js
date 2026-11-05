/**
 * google-auth-library/build/src/crypto/browser/crypto.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { __commonJS } from "../../../../../../runtime/bun-runtime.js";
import { require_base64_js } from "../../../../../base64-js/index.js";
import { require_shared } from "../shared.js";

//@ chunk-e8d3a8an.js:57080-58830 cjs-fingerprint
var require_crypto = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.BrowserCrypto = undefined;
  var base64js = require_base64_js();
  var shared_1 = require_shared();
  class BrowserCrypto {
    constructor() {
      if (typeof window === "undefined" || window.crypto === undefined || window.crypto.subtle === undefined)
        throw Error("SubtleCrypto not found. Make sure it's an https:// website.");
    }
    async sha256DigestBase64(str) {
      let inputBuffer = new TextEncoder().encode(str);
      let outputBuffer = await window.crypto.subtle.digest("SHA-256", inputBuffer);
      return base64js.fromByteArray(new Uint8Array(outputBuffer));
    }
    randomBytesBase64(count) {
      let array = new Uint8Array(count);
      window.crypto.getRandomValues(array);
      return base64js.fromByteArray(array);
    }
    static padBase64(base64) {
      while (base64.length % 4 !== 0) base64 += "=";
      return base64;
    }
    async verify(pubkey, data, signature) {
      let algo = {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-256",
        },
      };
      let cryptoAlgo = new TextEncoder().encode(data);
      let signatureArray = base64js.toByteArray(BrowserCrypto.padBase64(signature));
      let cryptoKey = await window.crypto.subtle.importKey("jwk", pubkey, algo, true, ["verify"]);
      return await window.crypto.subtle.verify(algo, cryptoKey, Buffer.from(signatureArray), cryptoAlgo);
    }
    async sign(privateKey, data) {
      let algo = {
        name: "RSASSA-PKCS1-v1_5",
        hash: {
          name: "SHA-256",
        },
      };
      let dataArray = new TextEncoder().encode(data);
      let cryptoKey = await window.crypto.subtle.importKey("jwk", privateKey, algo, true, ["sign"]);
      let result = await window.crypto.subtle.sign(algo, cryptoKey, dataArray);
      return base64js.fromByteArray(new Uint8Array(result));
    }
    decodeBase64StringUtf8(base64) {
      let dataArray = base64js.toByteArray(BrowserCrypto.padBase64(base64));
      return new TextDecoder().decode(dataArray);
    }
    encodeBase64StringUtf8(text) {
      let signatureArray = new TextEncoder().encode(text);
      return base64js.fromByteArray(signatureArray);
    }
    async sha256DigestHex(str) {
      let inputBuffer = new TextEncoder().encode(str);
      let outputBuffer = await window.crypto.subtle.digest("SHA-256", inputBuffer);
      return shared_1.fromArrayBufferToHex(outputBuffer);
    }
    async signWithHmacSha256(key, msg) {
      let rawKey = typeof key === "string" ? key : String.fromCharCode(...new Uint16Array(key));
      let enc = new TextEncoder();
      let cryptoKey = await window.crypto.subtle.importKey(
        "raw",
        enc.encode(rawKey),
        {
          name: "HMAC",
          hash: {
            name: "SHA-256",
          },
        },
        false,
        ["sign"],
      );
      return window.crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg));
    }
  }
  cjsExports.BrowserCrypto = BrowserCrypto;
});
export { require_crypto };
