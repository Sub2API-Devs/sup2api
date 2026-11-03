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
  constructor(e) {
    this.#e = new Re(e);
  }
  setContentEncryptionKey(e) {
    return (this.#e.setContentEncryptionKey(e), this);
  }
  setInitializationVector(e) {
    return (this.#e.setInitializationVector(e), this);
  }
  setProtectedHeader(e) {
    return (this.#e.setProtectedHeader(e), this);
  }
  setKeyManagementParameters(e) {
    return (this.#e.setKeyManagementParameters(e), this);
  }
  async encrypt(e, t) {
    let encrypt = await this.#e.encrypt(e, t);
    return [encrypt.protected, encrypt.encrypted_key, encrypt.iv, encrypt.ciphertext, encrypt.tag].join(".");
  }
}

export { Ue };
