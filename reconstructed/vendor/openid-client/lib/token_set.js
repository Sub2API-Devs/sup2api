/**
 * openid-client/lib/token_set.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { vu } from "./helpers/base64url.js";
import { Ou } from "./helpers/unix_timestamp.js";

//@ chunk-1ny7cxrt.js:10077-10596 cjs-fingerprint
var dy = x(function (Nve, UO) {
  var LO = vu(),
    xO = Ou();
  class NO {
    constructor(e) {
      Object.assign(this, e);
      let { constructor: t, ...n } = Object.getOwnPropertyDescriptors(this.constructor.prototype);
      Object.defineProperties(this, n);
    }
    set expires_in(e) {
      this.expires_at = xO() + Number(e);
    }
    get expires_in() {
      return Math.max.apply(null, [this.expires_at - xO(), 0]);
    }
    expired() {
      return this.expires_in === 0;
    }
    claims() {
      if (!this.id_token) throw TypeError("id_token not present in TokenSet");
      return JSON.parse(LO.decode(this.id_token.split(".")[1]));
    }
  }
  UO.exports = NO;
});

export { dy };
