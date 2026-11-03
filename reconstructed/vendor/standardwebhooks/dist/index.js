/**
 * standardwebhooks/dist/index.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: standardwebhooks@1.0.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: cjs-fingerprint 1
 */
import { x } from "../../../runtime/bun-runtime.js";
import { require_timing_safe_equal } from "./timing_safe_equal.js";
import { require_base64 } from "../../@stablelib/base64/lib/base64.js";
import { require_sha256 } from "../../fast-sha256/sha256.js";

//@ chunk-hwmsct5x.js:14156-16042 cjs-fingerprint
var require_standardwebhooks = x(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.Webhook = cjsExports.WebhookVerificationError = undefined;
  var timing_safe_equal_1 = require_timing_safe_equal();
  var base64 = require_base64();
  var sha256 = require_sha256();
  var WEBHOOK_TOLERANCE_IN_SECONDS = 300;
  class ExtendableError extends Error {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, ExtendableError.prototype);
      this.name = "ExtendableError";
      this.stack = Error(message).stack;
    }
  }
  class WebhookVerificationError extends ExtendableError {
    constructor(message) {
      super(message);
      Object.setPrototypeOf(this, WebhookVerificationError.prototype);
      this.name = "WebhookVerificationError";
    }
  }
  cjsExports.WebhookVerificationError = WebhookVerificationError;
  class Webhook {
    constructor(secret, options) {
      if (!secret) throw Error("Secret can't be empty.");
      if ((options === null || options === undefined ? undefined : options.format) === "raw") {
        if (secret instanceof Uint8Array) this.key = secret;
        else this.key = Uint8Array.from(secret, (c) => c.charCodeAt(0));
      } else {
        if (typeof secret !== "string") throw Error("Expected secret to be of type string");
        if (secret.startsWith(Webhook.prefix)) secret = secret.substring(Webhook.prefix.length);
        this.key = base64.decode(secret);
      }
    }
    verify(payload, headers_) {
      let headers = {};
      for (let key of Object.keys(headers_)) headers[key.toLowerCase()] = headers_[key];
      let msgId = headers["webhook-id"];
      let msgSignature = headers["webhook-signature"];
      let msgTimestamp = headers["webhook-timestamp"];
      if (!msgSignature || !msgId || !msgTimestamp)
        throw new WebhookVerificationError("Missing required headers");
      let timestamp = this.verifyTimestamp(msgTimestamp);
      let E = this.sign(msgId, timestamp, payload).split(",")[1];
      let passedSignatures = msgSignature.split(" ");
      let encoder = new globalThis.TextEncoder();
      for (let versionedSignature of passedSignatures) {
        let [version, signature] = versionedSignature.split(",");
        if (version !== "v1") continue;
        if (timing_safe_equal_1.timingSafeEqual(encoder.encode(signature), encoder.encode(E)))
          return JSON.parse(payload.toString());
      }
      throw new WebhookVerificationError("No matching signature found");
    }
    sign(msgId, timestamp, payload) {
      if (typeof payload === "string");
      else if (payload.constructor.name === "Buffer") payload = payload.toString();
      else throw Error("Expected payload to be of type string or Buffer.");
      let encoder = new TextEncoder();
      let timestampNumber = Math.floor(timestamp.getTime() / 1000);
      let y = encoder.encode(`${msgId}.${timestampNumber}.${payload}`);
      return `v1,${base64.encode(sha256.hmac(this.key, y))}`;
    }
    verifyTimestamp(timestampHeader) {
      let now = Math.floor(Date.now() / 1000);
      let timestamp = parseInt(timestampHeader, 10);
      if (isNaN(timestamp)) throw new WebhookVerificationError("Invalid Signature Headers");
      if (now - timestamp > WEBHOOK_TOLERANCE_IN_SECONDS)
        throw new WebhookVerificationError("Message timestamp too old");
      if (timestamp > now + WEBHOOK_TOLERANCE_IN_SECONDS)
        throw new WebhookVerificationError("Message timestamp too new");
      return new Date(timestamp * 1000);
    }
  }
  cjsExports.Webhook = Webhook;
  Webhook.prefix = "whsec_";
});
export { require_standardwebhooks };
