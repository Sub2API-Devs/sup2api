/**
 * jose/dist/webapi/jws/compact/sign.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: jose@6.2.2
 * pieces: chunk-5h78gfwc.js (1)
 * attribution: esm-fingerprint 1
 */
import { Oe } from "../flattened/sign.js";

//@ chunk-5h78gfwc.js:46644-46950 esm-fingerprint
class Me {
  #e;
  constructor(e) {
    this.#e = new Oe(e);
  }
  setProtectedHeader(e) {
    return (this.#e.setProtectedHeader(e), this);
  }
  async sign(e, t) {
    let sign = await this.#e.sign(e, t);
    if (sign.payload === void 0) throw TypeError("use the flattened module for creating JWS with b64: false");
    return `${sign.protected}.${sign.payload}.${sign.signature}`;
  }
}

export { Me };
