/**
 * google-auth-library/build/src/crypto/node/crypto.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:58830-59826 cjs-fingerprint
var require_crypto_2 = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.NodeCrypto = undefined;
  var cryptoModule = importMetaRequire("crypto");
  class NodeCrypto {
    async sha256DigestBase64(str) {
      return cryptoModule.createHash("sha256").update(str).digest("base64");
    }
    randomBytesBase64(count) {
      return cryptoModule.randomBytes(count).toString("base64");
    }
    async verify(pubkey, data, signature) {
      let verifier = cryptoModule.createVerify("RSA-SHA256");
      verifier.update(data);
      verifier.end();
      return verifier.verify(pubkey, signature, "base64");
    }
    async sign(privateKey, data) {
      let signer = cryptoModule.createSign("RSA-SHA256");
      signer.update(data);
      signer.end();
      return signer.sign(privateKey, "base64");
    }
    decodeBase64StringUtf8(base64) {
      return Buffer.from(base64, "base64").toString("utf-8");
    }
    encodeBase64StringUtf8(text) {
      return Buffer.from(text, "utf-8").toString("base64");
    }
    async sha256DigestHex(str) {
      return cryptoModule.createHash("sha256").update(str).digest("hex");
    }
    async signWithHmacSha256(key, msg) {
      let cryptoKey = typeof key === "string" ? key : toBuffer(key);
      return toArrayBuffer(cryptoModule.createHmac("sha256", cryptoKey).update(msg).digest());
    }
  }
  cjsExports.NodeCrypto = NodeCrypto;
  function toArrayBuffer(buffer) {
    let ab = new ArrayBuffer(buffer.length);
    let view = new Uint8Array(ab);
    for (let i = 0; i < buffer.length; ++i) view[i] = buffer[i];
    return ab;
  }
  function toBuffer(arrayBuffer) {
    return Buffer.from(arrayBuffer);
  }
});
export { require_crypto_2 };
