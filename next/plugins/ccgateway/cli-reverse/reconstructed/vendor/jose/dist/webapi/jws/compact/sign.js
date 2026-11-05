/**
 * jose/dist/webapi/jws/compact/sign.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-0f6azspv.js (1)
 * attribution: esm-fingerprint 1
 */
import { FlattenedSign } from "../flattened/sign.js";

//@ chunk-0f6azspv.js:46644-46950 esm-fingerprint
class CompactSign {
  #e;
  constructor(payload) {
    this.#e = new FlattenedSign(payload);
  }
  setProtectedHeader(protectedHeader) {
    this.#e.setProtectedHeader(protectedHeader);
    return this;
  }
  async sign(key, options) {
    let jws = await this.#e.sign(key, options);
    if (jws.payload === undefined)
      throw TypeError("use the flattened module for creating JWS with b64: false");
    return `${jws.protected}.${jws.payload}.${jws.signature}`;
  }
}
export { CompactSign };
