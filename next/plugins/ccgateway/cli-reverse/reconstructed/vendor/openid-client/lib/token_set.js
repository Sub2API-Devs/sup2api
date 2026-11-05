/**
 * openid-client/lib/token_set.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1hnjmk23.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../runtime/bun-runtime.js";
import { require_base64url } from "./helpers/base64url.js";
import { require_unix_timestamp } from "./helpers/unix_timestamp.js";

//@ chunk-1hnjmk23.js:10446-10965 cjs-fingerprint
var require_token_set = __commonJS(function (cjsExports, cjsModule) {
  var base64url = require_base64url();
  var now = require_unix_timestamp();
  class TokenSet {
    constructor(values) {
      Object.assign(this, values);
      let { constructor, ...properties } = Object.getOwnPropertyDescriptors(this.constructor.prototype);
      Object.defineProperties(this, properties);
    }
    set expires_in(value) {
      this.expires_at = now() + Number(value);
    }
    get expires_in() {
      return Math.max.apply(null, [this.expires_at - now(), 0]);
    }
    expired() {
      return this.expires_in === 0;
    }
    claims() {
      if (!this.id_token) throw TypeError("id_token not present in TokenSet");
      return JSON.parse(base64url.decode(this.id_token.split(".")[1]));
    }
  }
  cjsModule.exports = TokenSet;
});
export { require_token_set };
