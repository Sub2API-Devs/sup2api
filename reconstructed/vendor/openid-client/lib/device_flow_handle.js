/**
 * openid-client/lib/device_flow_handle.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: openid-client@5.7.1
 * pieces: chunk-1ny7cxrt.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x, importMetaRequire } from "../../../runtime/bun-runtime.js";
import { require_errors } from "./errors.js";
import { require_unix_timestamp } from "./helpers/unix_timestamp.js";
import { env } from "../../../src/utils/env.js";

//@ chunk-1ny7cxrt.js:38946-40798 cjs-fingerprint
var require_device_flow_handle = x(function (cjsExports, cjsModule) {
  var { inspect } = importMetaRequire("util");
  var { RPError, OPError } = require_errors();
  var now = require_unix_timestamp();
  class DeviceFlowHandle {
    #e;
    #t;
    #r;
    #i;
    #s;
    #a;
    #o;
    #l;
    #n;
    constructor({ client, exchangeBody, clientAssertionPayload, response, maxAge, DPoP }) {
      ["verification_uri", "user_code", "device_code"].forEach((prop) => {
        if (typeof response[prop] !== "string" || !response[prop])
          throw new RPError(
            `expected ${prop} string to be returned by Device Authorization Response, got %j`,
            response[prop],
          );
      });
      if (!Number.isSafeInteger(response.expires_in))
        throw new RPError(
          "expected expires_in number to be returned by Device Authorization Response, got %j",
          response.expires_in,
        );
      this.#a = now() + response.expires_in;
      this.#t = client;
      this.#i = DPoP;
      this.#l = maxAge;
      this.#s = exchangeBody;
      this.#r = clientAssertionPayload;
      this.#n = response;
      this.#o = response.interval * 1000 || 5000;
    }
    abort() {
      this.#e = true;
    }
    async poll({ signal } = {}) {
      if ((signal && signal.aborted) || this.#e) throw new RPError("polling aborted");
      if (this.expired())
        throw new RPError(
          "the device code %j has expired and the device authorization session has concluded",
          this.device_code,
        );
      await new Promise((resolve) => setTimeout(resolve, this.#o));
      let tokenset;
      try {
        tokenset = await this.#t.grant(
          {
            ...this.#s,
            grant_type: "urn:ietf:params:oauth:grant-type:device_code",
            device_code: this.device_code,
          },
          {
            clientAssertionPayload: this.#r,
            DPoP: this.#i,
          },
        );
      } catch (err) {
        switch (err instanceof OPError && err.error) {
          case "slow_down":
            this.#o += 5000;
          case "authorization_pending":
            return this.poll({
              signal,
            });
          default:
            throw err;
        }
      }
      if ("id_token" in tokenset) {
        await this.#t.decryptIdToken(tokenset);
        await this.#t.validateIdToken(tokenset, undefined, "token", this.#l);
      }
      return tokenset;
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
      return Math.max.apply(null, [this.#a - now(), 0]);
    }
    expired() {
      return this.expires_in === 0;
    }
    [inspect.custom]() {
      return `${this.constructor.name} ${inspect(this.#n, {
        depth: 1 / 0,
        colors: process.stdout.isTTY,
        compact: false,
        sorted: true,
      })}`;
    }
  }
  cjsModule.exports = DeviceFlowHandle;
});
export { require_device_flow_handle };
