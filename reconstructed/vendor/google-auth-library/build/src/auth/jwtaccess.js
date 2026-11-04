/**
 * google-auth-library/build/src/auth/jwtaccess.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-na3pph4p.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS } from "../../../../../runtime/bun-runtime.js";
import { require_jws } from "../../../../jws/index.js";
import { require_util } from "../util.js";

//@ chunk-na3pph4p.js:91348-93504 cjs-fingerprint
var require_jwtaccess = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.JWTAccess = undefined;
  var jws = require_jws();
  var util_1 = require_util();
  var DEFAULT_HEADER = {
    alg: "RS256",
    typ: "JWT",
  };
  class JWTAccess {
    email;
    key;
    keyId;
    projectId;
    eagerRefreshThresholdMillis;
    cache = new util_1.LRUCache({
      capacity: 500,
      maxAge: 3600000,
    });
    constructor(email, key, keyId, eagerRefreshThresholdMillis) {
      this.email = email;
      this.key = key;
      this.keyId = keyId;
      this.eagerRefreshThresholdMillis = eagerRefreshThresholdMillis ?? 300000;
    }
    getCachedKey(url, scopes) {
      let cacheKey = url;
      if (scopes && Array.isArray(scopes) && scopes.length)
        cacheKey = url ? `${url}_${scopes.join("_")}` : `${scopes.join("_")}`;
      else if (typeof scopes === "string") cacheKey = url ? `${url}_${scopes}` : scopes;
      if (!cacheKey) throw Error("Scopes or url must be provided");
      return cacheKey;
    }
    getRequestHeaders(url, additionalClaims, scopes) {
      let key = this.getCachedKey(url, scopes);
      let cachedToken = this.cache.get(key);
      let now = Date.now();
      if (cachedToken && cachedToken.expiration - now > this.eagerRefreshThresholdMillis)
        return new Headers(cachedToken.headers);
      let iat = Math.floor(Date.now() / 1000);
      let exp = JWTAccess.getExpirationTime(iat);
      let defaultClaims;
      if (Array.isArray(scopes)) scopes = scopes.join(" ");
      if (scopes)
        defaultClaims = {
          iss: this.email,
          sub: this.email,
          scope: scopes,
          exp,
          iat,
        };
      else
        defaultClaims = {
          iss: this.email,
          sub: this.email,
          aud: url,
          exp,
          iat,
        };
      if (additionalClaims) {
        for (let claim in defaultClaims)
          if (additionalClaims[claim])
            throw Error(
              `The '${claim}' property is not allowed when passing additionalClaims. This claim is included in the JWT by default.`,
            );
      }
      let header = this.keyId
        ? {
            ...DEFAULT_HEADER,
            kid: this.keyId,
          }
        : DEFAULT_HEADER;
      let payload = Object.assign(defaultClaims, additionalClaims);
      let signedJWT = jws.sign({
        header,
        payload,
        secret: this.key,
      });
      let headers = new Headers({
        authorization: `Bearer ${signedJWT}`,
      });
      this.cache.set(key, {
        expiration: exp * 1000,
        headers,
      });
      return headers;
    }
    static getExpirationTime(iat) {
      return iat + 3600;
    }
    fromJSON(json) {
      if (!json) throw Error("Must pass in a JSON object containing the service account auth settings.");
      if (!json.client_email) throw Error("The incoming JSON object does not contain a client_email field");
      if (!json.private_key) throw Error("The incoming JSON object does not contain a private_key field");
      this.email = json.client_email;
      this.key = json.private_key;
      this.keyId = json.private_key_id;
      this.projectId = json.project_id;
    }
    fromStream(inputStream, callback) {
      if (callback) this.fromStreamAsync(inputStream).then(() => callback(), callback);
      else return this.fromStreamAsync(inputStream);
    }
    fromStreamAsync(inputStream) {
      return new Promise((resolve, reject) => {
        if (!inputStream)
          reject(Error("Must pass in a stream containing the service account auth settings."));
        let settings = "";
        inputStream
          .setEncoding("utf8")
          .on("data", (chunk) => (settings += chunk))
          .on("error", reject)
          .on("end", () => {
            try {
              let data = JSON.parse(settings);
              this.fromJSON(data);
              resolve();
            } catch (err) {
              reject(err);
            }
          });
      });
    }
  }
  cjsExports.JWTAccess = JWTAccess;
});
export { require_jwtaccess };
