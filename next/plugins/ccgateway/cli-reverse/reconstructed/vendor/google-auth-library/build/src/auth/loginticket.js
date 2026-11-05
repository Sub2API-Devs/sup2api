/**
 * google-auth-library/build/src/auth/loginticket.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";

//@ chunk-e8d3a8an.js:67807-68215 cjs-fingerprint
var require_loginticket = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.LoginTicket = undefined;
  class LoginTicket {
    envelope;
    payload;
    constructor(env, pay) {
      this.envelope = env;
      this.payload = pay;
    }
    getEnvelope() {
      return this.envelope;
    }
    getPayload() {
      return this.payload;
    }
    getUserId() {
      let payload = this.getPayload();
      if (payload && payload.sub) return payload.sub;
      return null;
    }
    getAttributes() {
      return {
        envelope: this.getEnvelope(),
        payload: this.getPayload(),
      };
    }
  }
  cjsExports.LoginTicket = LoginTicket;
});
export { require_loginticket };
