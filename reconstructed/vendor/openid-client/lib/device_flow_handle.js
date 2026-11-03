/**
 * openid-client/lib/device_flow_handle.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { Ki } from "./errors.js";
import { Ou } from "./helpers/unix_timestamp.js";
import { env } from "../../../src/utils/env.js";

//@ chunk-1ny7cxrt.js:38946-40798 cjs-fingerprint
var NS = x(function (Yve, LS) {
  var { inspect: inspect } = importMetaRequire("util"),
    { RPError: RPError, OPError: OPError } = Ki(),
    jS = Ou();
  class xS {
    #e;
    #t;
    #r;
    #i;
    #s;
    #a;
    #o;
    #l;
    #n;
    constructor({ client: e, exchangeBody: t, clientAssertionPayload: n, response: o, maxAge: r, DPoP: s }) {
      if (
        (["verification_uri", "user_code", "device_code"].forEach((a) => {
          if (typeof o[a] !== "string" || !o[a])
            throw new RPError(
              `expected ${a} string to be returned by Device Authorization Response, got %j`,
              o[a],
            );
        }),
        !Number.isSafeInteger(o.expires_in))
      )
        throw new RPError(
          "expected expires_in number to be returned by Device Authorization Response, got %j",
          o.expires_in,
        );
      ((this.#a = jS() + o.expires_in),
        (this.#t = e),
        (this.#i = s),
        (this.#l = r),
        (this.#s = t),
        (this.#r = n),
        (this.#n = o),
        (this.#o = o.interval * 1000 || 5000));
    }
    abort() {
      this.#e = !0;
    }
    async poll({ signal: e } = {}) {
      if ((e && e.aborted) || this.#e) throw new RPError("polling aborted");
      if (this.expired())
        throw new RPError(
          "the device code %j has expired and the device authorization session has concluded",
          this.device_code,
        );
      await new Promise((n) => setTimeout(n, this.#o));
      let t;
      try {
        t = await this.#t.grant(
          {
            ...this.#s,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            device_code: this.device_code,
          },
          { clientAssertionPayload: this.#r, DPoP: this.#i },
        );
      } catch (error) {
        switch (error instanceof OPError && error.error) {
          case "slow_down":
            this.#o += 5000;
          case "authorization_pending":
            return this.poll({ signal: e });
          default:
            throw error;
        }
      }
      if ("id_token" in t)
        (await this.#t.decryptIdToken(t), await this.#t.validateIdToken(t, void 0, "token", this.#l));
      return t;
    }
    get device_code() {
      return this.#n.device_code;
    }
    get user_code() {
      return this.#n.user_code;
    }
    get verification_uri() {
      return this.#n.verification_uri;
    }
    get verification_uri_complete() {
      return this.#n.verification_uri_complete;
    }
    get expires_in() {
      return Math.max.apply(null, [this.#a - jS(), 0]);
    }
    expired() {
      return this.expires_in === 0;
    }
    [inspect.custom]() {
      return `${this.constructor.name} ${inspect(this.#n, { depth: 1 / 0, colors: process.stdout.isTTY, compact: !1, sorted: !0 })}`;
    }
  }
  LS.exports = xS;
});

export { NS };
