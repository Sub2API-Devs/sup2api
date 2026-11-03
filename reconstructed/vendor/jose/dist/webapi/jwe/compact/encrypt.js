/**
 * jose/dist/webapi/jwe/compact/encrypt.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { Re } from "../flattened/encrypt.js";

//@ chunk-5h78gfwc.js:45018-45478 esm-fingerprint
class Ue {
  #e;
  constructor(plaintext) {
    this.#e = new Re(plaintext);
  }
  setContentEncryptionKey(cek) {
    this.#e.setContentEncryptionKey(cek);
    return this;
  }
  setInitializationVector(iv) {
    this.#e.setInitializationVector(iv);
    return this;
  }
  setProtectedHeader(protectedHeader) {
    this.#e.setProtectedHeader(protectedHeader);
    return this;
  }
  setKeyManagementParameters(parameters) {
    this.#e.setKeyManagementParameters(parameters);
    return this;
  }
  async encrypt(key, options) {
    let jwe = await this.#e.encrypt(key, options);
    return [jwe.protected, jwe.encrypted_key, jwe.iv, jwe.ciphertext, jwe.tag].join(".");
  }
}
export { Ue };
