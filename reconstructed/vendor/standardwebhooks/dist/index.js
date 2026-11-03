/**
 * standardwebhooks/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: standardwebhooks@1.0.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { Mu } from "./timing_safe_equal.js";
import { Cu } from "../../@stablelib/base64/lib/base64.js";
import { Lu } from "../../fast-sha256/sha256.js";

//@ chunk-hwmsct5x.js:14156-16042 cjs-fingerprint
var Hu = x(function (Nu) {
  Object.defineProperty(Nu, "__esModule", { value: !0 });
  Nu.Webhook = Nu.WebhookVerificationError = void 0;
  var Du = Mu(),
    ls = Cu(),
    Uu = Lu(),
    Fu = 300;
  class ExtendableError extends Error {
    constructor(e) {
      super(e);
      (Object.setPrototypeOf(this, ExtendableError.prototype),
        (this.name = "ExtendableError"),
        (this.stack = Error(e).stack));
    }
  }
  class WebhookVerificationError extends ExtendableError {
    constructor(e) {
      super(e);
      (Object.setPrototypeOf(this, WebhookVerificationError.prototype),
        (this.name = "WebhookVerificationError"));
    }
  }
  Nu.WebhookVerificationError = WebhookVerificationError;
  class Tr {
    constructor(e, n) {
      if (!e) throw Error("Secret can't be empty.");
      if ((n === null || n === void 0 ? void 0 : n.format) === "raw")
        if (e instanceof Uint8Array) this.key = e;
        else this.key = Uint8Array.from(e, (r) => r.charCodeAt(0));
      else {
        if (typeof e !== "string") throw Error("Expected secret to be of type string");
        if (e.startsWith(Tr.prefix)) e = e.substring(Tr.prefix.length);
        this.key = ls.decode(e);
      }
    }
    verify(e, n) {
      let r = {};
      for (let O of Object.keys(n)) r[O.toLowerCase()] = n[O];
      let s = r["webhook-id"],
        h = r["webhook-signature"],
        y = r["webhook-timestamp"];
      if (!h || !s || !y) throw new WebhookVerificationError("Missing required headers");
      let verifyTimestamp = this.verifyTimestamp(y),
        E = this.sign(s, verifyTimestamp, e).split(",")[1],
        parts = h.split(" "),
        L = new globalThis.TextEncoder();
      for (let O of parts) {
        let [M, P] = O.split(",");
        if (M !== "v1") continue;
        if (Du.timingSafeEqual(L.encode(P), L.encode(E))) return JSON.parse(e.toString());
      }
      throw new WebhookVerificationError("No matching signature found");
    }
    sign(e, n, r) {
      if (typeof r === "string");
      else if (r.constructor.name === "Buffer") r = r.toString();
      else throw Error("Expected payload to be of type string or Buffer.");
      let textEncoder = new TextEncoder(),
        floored = Math.floor(n.getTime() / 1000),
        encode = textEncoder.encode(`${e}.${floored}.${r}`);
      return `v1,${ls.encode(Uu.hmac(this.key, encode))}`;
    }
    verifyTimestamp(e) {
      let floored = Math.floor(Date.now() / 1000),
        r = parseInt(e, 10);
      if (isNaN(r)) throw new WebhookVerificationError("Invalid Signature Headers");
      if (floored - r > Fu) throw new WebhookVerificationError("Message timestamp too old");
      if (r > floored + Fu) throw new WebhookVerificationError("Message timestamp too new");
      return new Date(r * 1000);
    }
  }
  Nu.Webhook = Tr;
  Tr.prefix = "whsec_";
});

export { Hu };
