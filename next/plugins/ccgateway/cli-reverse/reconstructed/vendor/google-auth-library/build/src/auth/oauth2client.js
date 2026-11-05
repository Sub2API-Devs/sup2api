/**
 * google-auth-library/build/src/auth/oauth2client.js
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: google-auth-library@10.6.2
 * pieces: chunk-e8d3a8an.js (1)
 * attribution: cjs-fingerprint 1
 */
import { __commonJS, importMetaRequire } from "../../../../../runtime/bun-runtime.js";
import { require_gaxios_2 } from "../../../../gaxios/build/cjs/src/index.js";
import { require_ecdsa_sig_formatter } from "../../../../ecdsa-sig-formatter/src/ecdsa-sig-formatter.js";
import { require_util } from "../util.js";
import { require_crypto_3 } from "../crypto/crypto.js";
import { require_authclient } from "./authclient.js";
import { require_loginticket } from "./loginticket.js";

//@ chunk-e8d3a8an.js:68215-82127 cjs-fingerprint
var require_oauth2client = __commonJS(function (cjsExports) {
  Object.defineProperty(cjsExports, "__esModule", {
    value: true,
  });
  cjsExports.OAuth2Client =
    cjsExports.ClientAuthentication =
    cjsExports.CertificateFormat =
    cjsExports.CodeChallengeMethod =
      undefined;
  var gaxios_1 = require_gaxios_2();
  var querystring = importMetaRequire("querystring");
  var stream = importMetaRequire("stream");
  var formatEcdsa = require_ecdsa_sig_formatter();
  var util_1 = require_util();
  var crypto_1 = require_crypto_3();
  var authclient_1 = require_authclient();
  var loginticket_1 = require_loginticket();
  var CodeChallengeMethod;
  (function (CodeChallengeMethod) {
    CodeChallengeMethod.Plain = "plain";
    CodeChallengeMethod.S256 = "S256";
  })(CodeChallengeMethod || (cjsExports.CodeChallengeMethod = CodeChallengeMethod = {}));
  var CertificateFormat;
  (function (CertificateFormat) {
    CertificateFormat.PEM = "PEM";
    CertificateFormat.JWK = "JWK";
  })(CertificateFormat || (cjsExports.CertificateFormat = CertificateFormat = {}));
  var ClientAuthentication;
  (function (ClientAuthentication) {
    ClientAuthentication.ClientSecretPost = "ClientSecretPost";
    ClientAuthentication.ClientSecretBasic = "ClientSecretBasic";
    ClientAuthentication.None = "None";
  })(ClientAuthentication || (cjsExports.ClientAuthentication = ClientAuthentication = {}));
  class OAuth2Client extends authclient_1.AuthClient {
    redirectUri;
    certificateCache = {};
    certificateExpiry = null;
    certificateCacheFormat = CertificateFormat.PEM;
    refreshTokenPromises = new Map();
    endpoints;
    issuers;
    clientAuthentication;
    _clientId;
    _clientSecret;
    refreshHandler;
    constructor(options = {}, clientSecret, redirectUri) {
      super(typeof options === "object" ? options : {});
      if (typeof options !== "object")
        options = {
          clientId: options,
          clientSecret,
          redirectUri,
        };
      this._clientId = options.clientId || options.client_id;
      this._clientSecret = options.clientSecret || options.client_secret;
      this.redirectUri = options.redirectUri || options.redirect_uris?.[0];
      this.endpoints = {
        tokenInfoUrl: "https://oauth2.googleapis.com/tokeninfo",
        oauth2AuthBaseUrl: "https://accounts.google.com/o/oauth2/v2/auth",
        oauth2TokenUrl: "https://oauth2.googleapis.com/token",
        oauth2RevokeUrl: "https://oauth2.googleapis.com/revoke",
        oauth2FederatedSignonPemCertsUrl: "https://www.googleapis.com/oauth2/v1/certs",
        oauth2FederatedSignonJwkCertsUrl: "https://www.googleapis.com/oauth2/v3/certs",
        oauth2IapPublicKeyUrl: "https://www.gstatic.com/iap/verify/public_key",
        ...options.endpoints,
      };
      this.clientAuthentication = options.clientAuthentication || ClientAuthentication.ClientSecretPost;
      this.issuers = options.issuers || [
        "accounts.google.com",
        "https://accounts.google.com",
        this.universeDomain,
      ];
    }
    static GOOGLE_TOKEN_INFO_URL = "https://oauth2.googleapis.com/tokeninfo";
    static CLOCK_SKEW_SECS_ = 300;
    static DEFAULT_MAX_TOKEN_LIFETIME_SECS_ = 86400;
    generateAuthUrl(opts = {}) {
      if (opts.code_challenge_method && !opts.code_challenge)
        throw Error("If a code_challenge_method is provided, code_challenge must be included.");
      opts.response_type = opts.response_type || "code";
      opts.client_id = opts.client_id || this._clientId;
      opts.redirect_uri = opts.redirect_uri || this.redirectUri;
      if (Array.isArray(opts.scope)) opts.scope = opts.scope.join(" ");
      return this.endpoints.oauth2AuthBaseUrl.toString() + "?" + querystring.stringify(opts);
    }
    generateCodeVerifier() {
      throw Error("generateCodeVerifier is removed, please use generateCodeVerifierAsync instead.");
    }
    async generateCodeVerifierAsync() {
      let cryptoModule = crypto_1.createCrypto();
      let replaced = cryptoModule
        .randomBytesBase64(96)
        .replace(/\+/g, "~")
        .replace(/=/g, "_")
        .replace(/\//g, "-");
      let codeChallenge = (await cryptoModule.sha256DigestBase64(replaced))
        .split("=")[0]
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
      return {
        codeVerifier: replaced,
        codeChallenge,
      };
    }
    getToken(codeOrOptions, callback) {
      let options =
        typeof codeOrOptions === "string"
          ? {
              code: codeOrOptions,
            }
          : codeOrOptions;
      if (callback)
        this.getTokenAsync(options).then(
          (r) => callback(null, r.tokens, r.res),
          (e) => callback(e, null, e.response),
        );
      else return this.getTokenAsync(options);
    }
    async getTokenAsync(options) {
      let url = this.endpoints.oauth2TokenUrl.toString();
      let headers = new Headers();
      let values = {
        client_id: options.client_id || this._clientId,
        code_verifier: options.codeVerifier,
        code: options.code,
        grant_type: "authorization_code",
        redirect_uri: options.redirect_uri || this.redirectUri,
      };
      if (this.clientAuthentication === ClientAuthentication.ClientSecretBasic) {
        let basic = Buffer.from(`${this._clientId}:${this._clientSecret}`);
        headers.set("authorization", `Basic ${basic.toString("base64")}`);
      }
      if (this.clientAuthentication === ClientAuthentication.ClientSecretPost)
        values.client_secret = this._clientSecret;
      let opts = {
        ...OAuth2Client.RETRY_CONFIG,
        method: "POST",
        url,
        data: new URLSearchParams(util_1.removeUndefinedValuesInObject(values)),
        headers,
      };
      authclient_1.AuthClient.setMethodName(opts, "getTokenAsync");
      let res = await this.transporter.request(opts);
      let tokens = res.data;
      if (res.data && res.data.expires_in) {
        tokens.expiry_date = new Date().getTime() + res.data.expires_in * 1000;
        delete tokens.expires_in;
      }
      this.emit("tokens", tokens);
      return {
        tokens,
        res,
      };
    }
    async refreshToken(refreshToken) {
      if (!refreshToken) return this.refreshTokenNoCache(refreshToken);
      if (this.refreshTokenPromises.has(refreshToken)) return this.refreshTokenPromises.get(refreshToken);
      let p = this.refreshTokenNoCache(refreshToken).then(
        (result) => {
          this.refreshTokenPromises.delete(refreshToken);
          return result;
        },
        (e) => {
          this.refreshTokenPromises.delete(refreshToken);
          throw e;
        },
      );
      this.refreshTokenPromises.set(refreshToken, p);
      return p;
    }
    async refreshTokenNoCache(refreshToken) {
      if (!refreshToken) throw Error("No refresh token is set.");
      let url = this.endpoints.oauth2TokenUrl.toString();
      let data = {
        refresh_token: refreshToken,
        client_id: this._clientId,
        client_secret: this._clientSecret,
        grant_type: "refresh_token",
      };
      let res;
      try {
        let opts = {
          ...OAuth2Client.RETRY_CONFIG,
          method: "POST",
          url,
          data: new URLSearchParams(util_1.removeUndefinedValuesInObject(data)),
        };
        authclient_1.AuthClient.setMethodName(opts, "refreshTokenNoCache");
        res = await this.transporter.request(opts);
      } catch (e) {
        if (
          e instanceof gaxios_1.GaxiosError &&
          e.message === "invalid_grant" &&
          e.response?.data &&
          /ReAuth/i.test(e.response.data.error_description)
        )
          e.message = JSON.stringify(e.response.data);
        throw e;
      }
      let tokens = res.data;
      if (res.data && res.data.expires_in) {
        tokens.expiry_date = new Date().getTime() + res.data.expires_in * 1000;
        delete tokens.expires_in;
      }
      this.emit("tokens", tokens);
      return {
        tokens,
        res,
      };
    }
    refreshAccessToken(callback) {
      if (callback)
        this.refreshAccessTokenAsync().then((r) => callback(null, r.credentials, r.res), callback);
      else return this.refreshAccessTokenAsync();
    }
    async refreshAccessTokenAsync() {
      let r = await this.refreshToken(this.credentials.refresh_token);
      let tokens = r.tokens;
      tokens.refresh_token = this.credentials.refresh_token;
      this.credentials = tokens;
      return {
        credentials: this.credentials,
        res: r.res,
      };
    }
    getAccessToken(callback) {
      if (callback) this.getAccessTokenAsync().then((r) => callback(null, r.token, r.res), callback);
      else return this.getAccessTokenAsync();
    }
    async getAccessTokenAsync() {
      if (!this.credentials.access_token || this.isTokenExpiring()) {
        if (!this.credentials.refresh_token)
          if (this.refreshHandler) {
            let refreshedAccessToken = await this.processAndValidateRefreshHandler();
            if (refreshedAccessToken?.access_token) {
              this.setCredentials(refreshedAccessToken);
              return {
                token: this.credentials.access_token,
              };
            }
          } else throw Error("No refresh token or refresh handler callback is set.");
        let r = await this.refreshAccessTokenAsync();
        if (!r.credentials || (r.credentials && !r.credentials.access_token))
          throw Error("Could not refresh access token.");
        return {
          token: r.credentials.access_token,
          res: r.res,
        };
      } else
        return {
          token: this.credentials.access_token,
        };
    }
    async getRequestHeaders(url) {
      return (await this.getRequestMetadataAsync(url)).headers;
    }
    async getRequestMetadataAsync(url) {
      let thisCreds = this.credentials;
      if (!thisCreds.access_token && !thisCreds.refresh_token && !this.apiKey && !this.refreshHandler)
        throw Error("No access, refresh token, API key or refresh handler callback is set.");
      if (thisCreds.access_token && !this.isTokenExpiring()) {
        thisCreds.token_type = thisCreds.token_type || "Bearer";
        let headers = new Headers({
          authorization: thisCreds.token_type + " " + thisCreds.access_token,
        });
        return {
          headers: this.addSharedMetadataHeaders(headers),
        };
      }
      if (this.refreshHandler) {
        let refreshedAccessToken = await this.processAndValidateRefreshHandler();
        if (refreshedAccessToken?.access_token) {
          this.setCredentials(refreshedAccessToken);
          let headers = new Headers({
            authorization: "Bearer " + this.credentials.access_token,
          });
          return {
            headers: this.addSharedMetadataHeaders(headers),
          };
        }
      }
      if (this.apiKey)
        return {
          headers: new Headers({
            "X-Goog-Api-Key": this.apiKey,
          }),
        };
      let tokensOrNull = null;
      let tokens = null;
      try {
        tokensOrNull = await this.refreshToken(thisCreds.refresh_token);
        tokens = tokensOrNull.tokens;
      } catch (err) {
        let e = err;
        if (e.response && (e.response.status === 403 || e.response.status === 404))
          e.message = `Could not refresh access token: ${e.message}`;
        throw e;
      }
      let credentials = this.credentials;
      credentials.token_type = credentials.token_type || "Bearer";
      tokens.refresh_token = credentials.refresh_token;
      this.credentials = tokens;
      let headers = new Headers({
        authorization: credentials.token_type + " " + tokens.access_token,
      });
      return {
        headers: this.addSharedMetadataHeaders(headers),
        res: tokensOrNull.res,
      };
    }
    static getRevokeTokenUrl(token) {
      return new OAuth2Client().getRevokeTokenURL(token).toString();
    }
    getRevokeTokenURL(token) {
      let url = new URL(this.endpoints.oauth2RevokeUrl);
      url.searchParams.append("token", token);
      return url;
    }
    revokeToken(token, callback) {
      let opts = {
        ...OAuth2Client.RETRY_CONFIG,
        url: this.getRevokeTokenURL(token).toString(),
        method: "POST",
      };
      authclient_1.AuthClient.setMethodName(opts, "revokeToken");
      if (callback) this.transporter.request(opts).then((r) => callback(null, r), callback);
      else return this.transporter.request(opts);
    }
    revokeCredentials(callback) {
      if (callback) this.revokeCredentialsAsync().then((res) => callback(null, res), callback);
      else return this.revokeCredentialsAsync();
    }
    async revokeCredentialsAsync() {
      let token = this.credentials.access_token;
      this.credentials = {};
      if (token) return this.revokeToken(token);
      else throw Error("No access token to revoke.");
    }
    request(opts, callback) {
      if (callback)
        this.requestAsync(opts).then(
          (result) => callback(null, result),
          (e) => callback(e, e.response),
        );
      else return this.requestAsync(opts);
    }
    async requestAsync(opts, reAuthRetried = false) {
      try {
        let metadata = await this.getRequestMetadataAsync();
        opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers);
        this.addUserProjectAndAuthHeaders(opts.headers, metadata.headers);
        if (this.apiKey) opts.headers.set("X-Goog-Api-Key", this.apiKey);
        return await this.transporter.request(opts);
      } catch (e) {
        let res = e.response;
        if (res) {
          let statusCode = res.status;
          let mayRequireRefresh =
            this.credentials &&
            this.credentials.access_token &&
            this.credentials.refresh_token &&
            (!this.credentials.expiry_date || this.forceRefreshOnFailure);
          let mayRequireRefreshWithNoRefreshToken =
            this.credentials &&
            this.credentials.access_token &&
            !this.credentials.refresh_token &&
            (!this.credentials.expiry_date || this.forceRefreshOnFailure) &&
            this.refreshHandler;
          let isReadableStream = res.config.data instanceof stream.Readable;
          let isAuthErr = statusCode === 401 || statusCode === 403;
          if (!reAuthRetried && isAuthErr && !isReadableStream && mayRequireRefresh) {
            await this.refreshAccessTokenAsync();
            return this.requestAsync(opts, true);
          } else if (
            !reAuthRetried &&
            isAuthErr &&
            !isReadableStream &&
            mayRequireRefreshWithNoRefreshToken
          ) {
            let refreshedAccessToken = await this.processAndValidateRefreshHandler();
            if (refreshedAccessToken?.access_token) this.setCredentials(refreshedAccessToken);
            return this.requestAsync(opts, true);
          }
        }
        throw e;
      }
    }
    verifyIdToken(options, callback) {
      if (callback && typeof callback !== "function")
        throw Error(
          "This method accepts an options object as the first parameter, which includes the idToken, audience, and maxExpiry.",
        );
      if (callback)
        this.verifyIdTokenAsync(options).then((loginTicket) => callback(null, loginTicket), callback);
      else return this.verifyIdTokenAsync(options);
    }
    async verifyIdTokenAsync(options) {
      if (!options.idToken) throw Error("The verifyIdToken method requires an ID Token");
      let response = await this.getFederatedSignonCertsAsync();
      return await this.verifySignedJwtWithCertsAsync(
        options.idToken,
        response.certs,
        options.audience,
        this.issuers,
        options.maxExpiry,
      );
    }
    async getTokenInfo(accessToken) {
      let { data } = await this.transporter.request({
        ...OAuth2Client.RETRY_CONFIG,
        method: "POST",
        headers: {
          "content-type": "application/x-www-form-urlencoded;charset=UTF-8",
          authorization: `Bearer ${accessToken}`,
        },
        url: this.endpoints.tokenInfoUrl.toString(),
      });
      let info = Object.assign(
        {
          expiry_date: new Date().getTime() + data.expires_in * 1000,
          scopes: data.scope.split(" "),
        },
        data,
      );
      delete info.expires_in;
      delete info.scope;
      return info;
    }
    getFederatedSignonCerts(callback) {
      if (callback) this.getFederatedSignonCertsAsync().then((r) => callback(null, r.certs, r.res), callback);
      else return this.getFederatedSignonCertsAsync();
    }
    async getFederatedSignonCertsAsync() {
      let nowTime = new Date().getTime();
      let format = crypto_1.hasBrowserCrypto() ? CertificateFormat.JWK : CertificateFormat.PEM;
      if (
        this.certificateExpiry &&
        nowTime < this.certificateExpiry.getTime() &&
        this.certificateCacheFormat === format
      )
        return {
          certs: this.certificateCache,
          format,
        };
      let res;
      let url;
      switch (format) {
        case CertificateFormat.PEM:
          url = this.endpoints.oauth2FederatedSignonPemCertsUrl.toString();
          break;
        case CertificateFormat.JWK:
          url = this.endpoints.oauth2FederatedSignonJwkCertsUrl.toString();
          break;
        default:
          throw Error(`Unsupported certificate format ${format}`);
      }
      try {
        let opts = {
          ...OAuth2Client.RETRY_CONFIG,
          url,
        };
        authclient_1.AuthClient.setMethodName(opts, "getFederatedSignonCertsAsync");
        res = await this.transporter.request(opts);
      } catch (e) {
        if (e instanceof Error) e.message = `Failed to retrieve verification certificates: ${e.message}`;
        throw e;
      }
      let cacheControl = res?.headers.get("cache-control");
      let cacheAge = -1;
      if (cacheControl) {
        let maxAge = /max-age=(?<maxAge>[0-9]+)/.exec(cacheControl)?.groups?.maxAge;
        if (maxAge) cacheAge = Number(maxAge) * 1000;
      }
      let certificates = {};
      switch (format) {
        case CertificateFormat.PEM:
          certificates = res.data;
          break;
        case CertificateFormat.JWK:
          for (let key of res.data.keys) certificates[key.kid] = key;
          break;
        default:
          throw Error(`Unsupported certificate format ${format}`);
      }
      let now = new Date();
      this.certificateExpiry = cacheAge === -1 ? null : new Date(now.getTime() + cacheAge);
      this.certificateCache = certificates;
      this.certificateCacheFormat = format;
      return {
        certs: certificates,
        format,
        res,
      };
    }
    getIapPublicKeys(callback) {
      if (callback) this.getIapPublicKeysAsync().then((r) => callback(null, r.pubkeys, r.res), callback);
      else return this.getIapPublicKeysAsync();
    }
    async getIapPublicKeysAsync() {
      let res;
      let url = this.endpoints.oauth2IapPublicKeyUrl.toString();
      try {
        let opts = {
          ...OAuth2Client.RETRY_CONFIG,
          url,
        };
        authclient_1.AuthClient.setMethodName(opts, "getIapPublicKeysAsync");
        res = await this.transporter.request(opts);
      } catch (e) {
        if (e instanceof Error) e.message = `Failed to retrieve verification certificates: ${e.message}`;
        throw e;
      }
      return {
        pubkeys: res.data,
        res,
      };
    }
    verifySignedJwtWithCerts() {
      throw Error("verifySignedJwtWithCerts is removed, please use verifySignedJwtWithCertsAsync instead.");
    }
    async verifySignedJwtWithCertsAsync(jwt, certs, requiredAudience, issuers, maxExpiry) {
      let cryptoModule = crypto_1.createCrypto();
      if (!maxExpiry) maxExpiry = OAuth2Client.DEFAULT_MAX_TOKEN_LIFETIME_SECS_;
      let segments = jwt.split(".");
      if (segments.length !== 3) throw Error("Wrong number of segments in token: " + jwt);
      let signed = segments[0] + "." + segments[1];
      let signature = segments[2];
      let envelope;
      let payload;
      try {
        envelope = JSON.parse(cryptoModule.decodeBase64StringUtf8(segments[0]));
      } catch (err) {
        if (err instanceof Error) err.message = `Can't parse token envelope: ${segments[0]}': ${err.message}`;
        throw err;
      }
      if (!envelope) throw Error("Can't parse token envelope: " + segments[0]);
      try {
        payload = JSON.parse(cryptoModule.decodeBase64StringUtf8(segments[1]));
      } catch (err) {
        if (err instanceof Error) err.message = `Can't parse token payload '${segments[0]}`;
        throw err;
      }
      if (!payload) throw Error("Can't parse token payload: " + segments[1]);
      if (!Object.prototype.hasOwnProperty.call(certs, envelope.kid))
        throw Error("No pem found for envelope: " + JSON.stringify(envelope));
      let cert = certs[envelope.kid];
      if (envelope.alg === "ES256") signature = formatEcdsa.joseToDer(signature, "ES256").toString("base64");
      if (!(await cryptoModule.verify(cert, signed, signature)))
        throw Error("Invalid token signature: " + jwt);
      if (!payload.iat) throw Error("No issue time in token: " + JSON.stringify(payload));
      if (!payload.exp) throw Error("No expiration time in token: " + JSON.stringify(payload));
      let iat = Number(payload.iat);
      if (isNaN(iat)) throw Error("iat field using invalid format");
      let exp = Number(payload.exp);
      if (isNaN(exp)) throw Error("exp field using invalid format");
      let now = new Date().getTime() / 1000;
      if (exp >= now + maxExpiry)
        throw Error("Expiration time too far in future: " + JSON.stringify(payload));
      let earliest = iat - OAuth2Client.CLOCK_SKEW_SECS_;
      let latest = exp + OAuth2Client.CLOCK_SKEW_SECS_;
      if (now < earliest)
        throw Error("Token used too early, " + now + " < " + earliest + ": " + JSON.stringify(payload));
      if (now > latest)
        throw Error("Token used too late, " + now + " > " + latest + ": " + JSON.stringify(payload));
      if (issuers && issuers.indexOf(payload.iss) < 0)
        throw Error("Invalid issuer, expected one of [" + issuers + "], but got " + payload.iss);
      if (typeof requiredAudience !== "undefined" && requiredAudience !== null) {
        let aud = payload.aud;
        let audVerified = false;
        if (requiredAudience.constructor === Array) audVerified = requiredAudience.indexOf(aud) > -1;
        else audVerified = aud === requiredAudience;
        if (!audVerified) throw Error("Wrong recipient, payload audience != requiredAudience");
      }
      return new loginticket_1.LoginTicket(envelope, payload);
    }
    async processAndValidateRefreshHandler() {
      if (this.refreshHandler) {
        let accessTokenResponse = await this.refreshHandler();
        if (!accessTokenResponse.access_token)
          throw Error("No access token is returned by the refreshHandler callback.");
        return accessTokenResponse;
      }
      return;
    }
    isTokenExpiring() {
      let expiryDate = this.credentials.expiry_date;
      return expiryDate ? expiryDate <= new Date().getTime() + this.eagerRefreshThresholdMillis : false;
    }
  }
  cjsExports.OAuth2Client = OAuth2Client;
});
export { require_oauth2client };
