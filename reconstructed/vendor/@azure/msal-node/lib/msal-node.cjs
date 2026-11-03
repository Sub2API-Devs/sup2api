/**
 * @azure/msal-node/lib/msal-node.cjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @azure/msal-node@3.8.1
 * pieces: chunk-mrx6y2r5.js (55)
 * attribution: esm-fingerprint 52, esm-layout 3
 */
import http, { default as http_2 } from "http";
import https from "https";
import uy, { default as hy } from "crypto";
import {
  fe,
  yr,
  b,
  AuthError,
  me,
  f,
  K,
  L,
  bn,
  th,
  eh,
  rh,
  nh,
  Ug,
  Mg,
  Lg,
  Dg,
  Xe,
  g,
  INVALID_ASSERTION,
  Q,
  Te,
  ie,
  N,
  Ie,
  Qe,
  Og,
  Ng,
  We,
  Du,
  Xr,
  zt,
  Pe,
  At,
  Et,
  Ct,
  qt,
  Gt,
  at,
  Tr,
  Er,
  _e,
  Cr,
  re,
  Je,
  $t,
  pe,
  Gg,
  Ae,
  wg,
  Le,
  qg,
  Ka,
  mt,
  Ki,
  xn,
  Vi,
  ClientAuthError,
  TOKEN_REFRESH_REQUIRED,
  ye,
  j,
  STATE_MISMATCH,
  jt,
  ue,
  Va,
  ka,
  DEVICE_CODE_POLLING_CANCELLED,
  USER_TIMEOUT_REACHED,
  DEVICE_CODE_EXPIRED,
  xg,
  wa,
  POST_REQUEST_FAILED,
  DEVICE_CODE_UNKNOWN_ERROR,
  vg,
  X_CLIENT_XTRA_SKU,
  ri,
  ServerError,
  oe,
  Vt,
  en,
  MULTIPLE_MATCHING_TOKENS,
  yt,
  bg,
  ON_BEHALF_OF,
  kg,
  INVALID_CLIENT_CREDENTIAL,
  be,
  MISSING_TENANT_ID_ERROR,
  Y,
  NETWORK_ERROR,
  Tn,
  V,
  EMPTY_URL_ERROR,
} from "../../msal-common/lib/index-node-DhUjlPuB.js";
import { Ro } from "../dist/crypto/GuidGenerator.mjs";
import { Jr } from "../dist/cache/serializer/Serializer.mjs";
import { Re } from "../../../../runtime/bun-runtime.js";
import { Uf } from "../../../jsonwebtoken/index.js";
import { bh, Ph } from "../dist/config/Configuration.mjs";
import { Ue } from "../../msal-common/dist/logger/Logger.mjs";
import { xr } from "../dist/retry/ImdsRetryPolicy.mjs";
import { Jt } from "../dist/client/ManagedIdentitySources/AzureArc.mjs";

//@ chunk-mrx6y2r5.js:209425-211734 esm-fingerprint
class wr {
  static deserializeJSONBlob(e) {
    return !e ? {} : JSON.parse(e);
  }
  static deserializeAccounts(e) {
    let t = {};
    if (e)
      Object.keys(e).map(function (r) {
        let n = e[r],
          o = {
            homeAccountId: n.home_account_id,
            environment: n.environment,
            realm: n.realm,
            localAccountId: n.local_account_id,
            username: n.username,
            authorityType: n.authority_type,
            name: n.name,
            clientInfo: n.client_info,
            lastModificationTime: n.last_modification_time,
            lastModificationApp: n.last_modification_app,
            tenantProfiles: n.tenantProfiles?.map((s) => JSON.parse(s)),
            lastUpdatedAt: Date.now().toString(),
          },
          i = new fe();
        (yr.toObject(i, o), (t[r] = i));
      });
    return t;
  }
  static deserializeIdTokens(e) {
    let t = {};
    if (e)
      Object.keys(e).map(function (r) {
        let n = e[r],
          o = {
            homeAccountId: n.home_account_id,
            environment: n.environment,
            credentialType: n.credential_type,
            clientId: n.client_id,
            secret: n.secret,
            realm: n.realm,
            lastUpdatedAt: Date.now().toString(),
          };
        t[r] = o;
      });
    return t;
  }
  static deserializeAccessTokens(e) {
    let t = {};
    if (e)
      Object.keys(e).map(function (r) {
        let n = e[r],
          o = {
            homeAccountId: n.home_account_id,
            environment: n.environment,
            credentialType: n.credential_type,
            clientId: n.client_id,
            secret: n.secret,
            realm: n.realm,
            target: n.target,
            cachedAt: n.cached_at,
            expiresOn: n.expires_on,
            extendedExpiresOn: n.extended_expires_on,
            refreshOn: n.refresh_on,
            keyId: n.key_id,
            tokenType: n.token_type,
            requestedClaims: n.requestedClaims,
            requestedClaimsHash: n.requestedClaimsHash,
            userAssertionHash: n.userAssertionHash,
            lastUpdatedAt: Date.now().toString(),
          };
        t[r] = o;
      });
    return t;
  }
  static deserializeRefreshTokens(e) {
    let t = {};
    if (e)
      Object.keys(e).map(function (r) {
        let n = e[r],
          o = {
            homeAccountId: n.home_account_id,
            environment: n.environment,
            credentialType: n.credential_type,
            clientId: n.client_id,
            secret: n.secret,
            familyId: n.family_id,
            target: n.target,
            realm: n.realm,
            lastUpdatedAt: Date.now().toString(),
          };
        t[r] = o;
      });
    return t;
  }
  static deserializeAppMetadata(e) {
    let t = {};
    if (e)
      Object.keys(e).map(function (r) {
        let n = e[r];
        t[r] = { clientId: n.client_id, environment: n.environment, familyId: n.family_id };
      });
    return t;
  }
  static deserializeAllCache(e) {
    return {
      accounts: e.Account ? this.deserializeAccounts(e.Account) : {},
      idTokens: e.IdToken ? this.deserializeIdTokens(e.IdToken) : {},
      accessTokens: e.AccessToken ? this.deserializeAccessTokens(e.AccessToken) : {},
      refreshTokens: e.RefreshToken ? this.deserializeRefreshTokens(e.RefreshToken) : {},
      appMetadata: e.AppMetadata ? this.deserializeAppMetadata(e.AppMetadata) : {},
    };
  }
}
//@ chunk-mrx6y2r5.js:211816-213842 esm-fingerprint
var SYSTEM_ASSIGNED_MANAGED_IDENTITY = "system_assigned_managed_identity",
  MANAGED_IDENTITY = "managed_identity",
  Wa = `https://login.microsoftonline.com/${MANAGED_IDENTITY}/`,
  Ne = {
    AUTHORIZATION_HEADER_NAME: "Authorization",
    METADATA_HEADER_NAME: "Metadata",
    APP_SERVICE_SECRET_HEADER_NAME: "X-IDENTITY-HEADER",
    ML_AND_SF_SECRET_HEADER_NAME: "secret",
  },
  ce = {
    API_VERSION: "api-version",
    RESOURCE: "resource",
    SHA256_TOKEN_TO_REFRESH: "token_sha256_to_refresh",
    XMS_CC: "xms_cc",
  },
  w = {
    AZURE_POD_IDENTITY_AUTHORITY_HOST: "AZURE_POD_IDENTITY_AUTHORITY_HOST",
    DEFAULT_IDENTITY_CLIENT_ID: "DEFAULT_IDENTITY_CLIENT_ID",
    IDENTITY_ENDPOINT: "IDENTITY_ENDPOINT",
    IDENTITY_HEADER: "IDENTITY_HEADER",
    IDENTITY_SERVER_THUMBPRINT: "IDENTITY_SERVER_THUMBPRINT",
    IMDS_ENDPOINT: "IMDS_ENDPOINT",
    MSI_ENDPOINT: "MSI_ENDPOINT",
    MSI_SECRET: "MSI_SECRET",
  },
  k = {
    APP_SERVICE: "AppService",
    AZURE_ARC: "AzureArc",
    CLOUD_SHELL: "CloudShell",
    DEFAULT_TO_IMDS: "DefaultToImds",
    IMDS: "Imds",
    MACHINE_LEARNING: "MachineLearning",
    SERVICE_FABRIC: "ServiceFabric",
  },
  ne = {
    SYSTEM_ASSIGNED: "system-assigned",
    USER_ASSIGNED_CLIENT_ID: "user-assigned-client-id",
    USER_ASSIGNED_RESOURCE_ID: "user-assigned-resource-id",
    USER_ASSIGNED_OBJECT_ID: "user-assigned-object-id",
  },
  J = { GET: "get", POST: "post" },
  ji = {
    SUCCESS_RANGE_START: b.SUCCESS_RANGE_START,
    SUCCESS_RANGE_END: b.SUCCESS_RANGE_END,
    SERVER_ERROR: b.SERVER_ERROR,
  },
  REGION_NAME = "REGION_NAME",
  MSAL_FORCE_REGION = "MSAL_FORCE_REGION",
  Eh = 32,
  Ch = { SHA256: "sha256" },
  Yi = { CV_CHARSET: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~" },
  Qa = { KEY_SEPARATOR: "-" },
  Se = {
    MSAL_SKU: "msal.js.node",
    JWT_BEARER_ASSERTION_TYPE: "urn:ietf:params:oauth:client-assertion-type:jwt-bearer",
    AUTHORIZATION_PENDING: "authorization_pending",
    HTTP_PROTOCOL: "http://",
    LOCALHOST: "localhost",
  },
  St = {
    acquireTokenSilent: 62,
    acquireTokenByUsernamePassword: 371,
    acquireTokenByDeviceCode: 671,
    acquireTokenByClientCredential: 771,
    acquireTokenByCode: 871,
    acquireTokenByRefreshToken: 872,
  },
  Ke = {
    RSA_256: "RS256",
    PSS_256: "PS256",
    X5T_256: "x5t#S256",
    X5T: "x5t",
    X5C: "x5c",
    AUDIENCE: "aud",
    EXPIRATION_TIME: "exp",
    ISSUER: "iss",
    SUBJECT: "sub",
    NOT_BEFORE: "nbf",
    JWT_ID: "jti",
  },
  Wi = { INTERVAL_MS: 100, TIMEOUT_MS: 5000 },
  Ah = 4096;
//@ chunk-mrx6y2r5.js:213883-214346 esm-fingerprint
class Io {
  static getNetworkResponse(e, t, r) {
    return { headers: e, body: t, status: r };
  }
  static urlToHttpOptions(e) {
    let t = {
      protocol: e.protocol,
      hostname: e.hostname && e.hostname.startsWith("[") ? e.hostname.slice(1, -1) : e.hostname,
      hash: e.hash,
      search: e.search,
      pathname: e.pathname,
      path: `${e.pathname || ""}${e.search || ""}`,
      href: e.href,
    };
    if (e.port !== "") t.port = Number(e.port);
    if (e.username || e.password)
      t.auth = `${decodeURIComponent(e.username)}:${decodeURIComponent(e.password)}`;
    return t;
  }
}
//@ chunk-mrx6y2r5.js:214430-214830 esm-fingerprint
class _o {
  constructor(e, t) {
    ((this.proxyUrl = e || ""), (this.customAgentOptions = t || {}));
  }
  async sendGetRequestAsync(e, t, r) {
    if (this.proxyUrl) return _h(e, this.proxyUrl, J.GET, t, this.customAgentOptions, r);
    else return Sh(e, J.GET, t, this.customAgentOptions, r);
  }
  async sendPostRequestAsync(e, t) {
    if (this.proxyUrl) return _h(e, this.proxyUrl, J.POST, t, this.customAgentOptions);
    else return Sh(e, J.POST, t, this.customAgentOptions);
  }
}
//@ chunk-mrx6y2r5.js:214830-217629 esm-fingerprint
var _h = (e, t, r, n, o, i) => {
    let s = new URL(e),
      a = new URL(t),
      c = n?.headers || {},
      l = { host: a.hostname, port: a.port, method: "CONNECT", path: s.hostname, headers: c };
    if (o && Object.keys(o).length) l.agent = new http.Agent(o);
    let d = "";
    if (r === J.POST) {
      let m = n?.body || "";
      d = `Content-Type: application/x-www-form-urlencoded\r
Content-Length: ${m.length}\r
\r
${m}`;
    } else if (i) l.timeout = i;
    let u =
      `${r.toUpperCase()} ${s.href} HTTP/1.1\r
Host: ${s.host}\r
Connection: close\r
` +
      d +
      `\r
`;
    return new Promise((m, p) => {
      let request = http.request(l);
      if (i)
        request.on("timeout", () => {
          (request.destroy(), p(Error("Request time out")));
        });
      (request.end(),
        request.on("connect", (T, I) => {
          let v = T?.statusCode || ji.SERVER_ERROR;
          if (v < ji.SUCCESS_RANGE_START || v > ji.SUCCESS_RANGE_END)
            (request.destroy(),
              I.destroy(),
              p(
                Error(
                  `Error connecting to proxy. Http status code: ${T.statusCode}. Http status message: ${T?.statusMessage || "Unknown"}`,
                ),
              ));
          I.write(u);
          let U = [];
          (I.on("data", (B) => {
            U.push(B);
          }),
            I.on("end", () => {
              let parts = Buffer.concat([...U]).toString().split(`\r
`),
                A = parseInt(parts[0].split(" ")[1]),
                joined = parts[0].split(" ").slice(2).join(" "),
                E = parts[parts.length - 1],
                sliced = parts.slice(1, parts.length - 2),
                H = new Map();
              sliced.forEach((er) => {
                let parts = er.split(new RegExp(/:\s(.*)/s)),
                  um = parts[0],
                  ks = parts[1];
                try {
                  let parsed = JSON.parse(ks);
                  if (parsed && typeof parsed === "object") ks = parsed;
                } catch (error) {}
                H.set(um, ks);
              });
              let fromEntries = Object.fromEntries(H),
                networkResponse = Io.getNetworkResponse(fromEntries, Rh(A, joined, fromEntries, E), A);
              if (
                (A < b.SUCCESS_RANGE_START || A > b.SUCCESS_RANGE_END) &&
                networkResponse.body.error !== Se.AUTHORIZATION_PENDING
              )
                request.destroy();
              m(networkResponse);
            }),
            I.on("error", (B) => {
              (request.destroy(), I.destroy(), p(Error(B.toString())));
            }));
        }),
        request.on("error", (T) => {
          (request.destroy(), p(Error(T.toString())));
        }));
    });
  },
  Sh = (e, t, r, n, o) => {
    let i = t === J.POST,
      s = r?.body || "",
      a = new URL(e),
      c = r?.headers || {},
      l = { method: t, headers: c, ...Io.urlToHttpOptions(a) };
    if (n && Object.keys(n).length) l.agent = new https.Agent(n);
    if (i) l.headers = { ...l.headers, "Content-Length": s.length };
    else if (o) l.timeout = o;
    return new Promise((d, u) => {
      let m;
      if (l.protocol === "http:") m = http.request(l);
      else m = https.request(l);
      if (i) m.write(s);
      if (o)
        m.on("timeout", () => {
          (m.destroy(), u(Error("Request time out")));
        });
      (m.end(),
        m.on("response", (p) => {
          let { headers: headers, statusCode: statusCode, statusMessage: statusMessage } = p,
            v = [];
          (p.on("data", (U) => {
            v.push(U);
          }),
            p.on("end", () => {
              let str = Buffer.concat([...v]).toString(),
                B = headers,
                networkResponse = Io.getNetworkResponse(B, Rh(statusCode, statusMessage, B, str), statusCode);
              if (
                (statusCode < b.SUCCESS_RANGE_START || statusCode > b.SUCCESS_RANGE_END) &&
                networkResponse.body.error !== Se.AUTHORIZATION_PENDING
              )
                m.destroy();
              d(networkResponse);
            }));
        }),
        m.on("error", (p) => {
          (m.destroy(), u(Error(p.toString())));
        }));
    });
  },
  Rh = (e, t, r, n) => {
    let o;
    try {
      o = JSON.parse(n);
    } catch (error) {
      let s, a;
      if (e >= b.CLIENT_ERROR_RANGE_START && e <= b.CLIENT_ERROR_RANGE_END)
        ((s = "client_error"), (a = "A client"));
      else if (e >= b.SERVER_ERROR_RANGE_START && e <= b.SERVER_ERROR_RANGE_END)
        ((s = "server_error"), (a = "A server"));
      else ((s = "unknown_error"), (a = "An unknown"));
      o = {
        error: s,
        error_description: `${a} error occured.
Http status code: ${e}
Http status message: ${t || "Unknown"}
Headers: ${JSON.stringify(r)}`,
      };
    }
    return o;
  };
//@ chunk-mrx6y2r5.js:217670-218358 esm-fingerprint
var INVALID_FILE_EXTENSION = "invalid_file_extension",
  INVALID_FILE_PATH = "invalid_file_path",
  INVALID_MANAGED_IDENTITY_ID_TYPE = "invalid_managed_identity_id_type",
  INVALID_SECRET = "invalid_secret",
  MISSING_CLIENT_ID = "missing_client_id",
  NETWORK_UNAVAILABLE = "network_unavailable",
  PLATFORM_NOT_SUPPORTED = "platform_not_supported",
  UNABLE_TO_CREATE_AZURE_ARC = "unable_to_create_azure_arc",
  UNABLE_TO_CREATE_CLOUD_SHELL = "unable_to_create_cloud_shell",
  UNABLE_TO_CREATE_SOURCE = "unable_to_create_source",
  UNABLE_TO_READ_SECRET_FILE = "unable_to_read_secret_file",
  USER_ASSIGNED_NOT_AVAILABLE_AT_RUNTIME = "user_assigned_not_available_at_runtime",
  WWW_AUTHENTICATE_HEADER_MISSING = "www_authenticate_header_missing",
  os = "www_authenticate_header_unsupported_format",
  vr = {
    [w.AZURE_POD_IDENTITY_AUTHORITY_HOST]: "azure_pod_identity_authority_host_url_malformed",
    [w.IDENTITY_ENDPOINT]: "identity_endpoint_url_malformed",
    [w.IMDS_ENDPOINT]: "imds_endpoint_url_malformed",
    [w.MSI_ENDPOINT]: "msi_endpoint_url_malformed",
  };
//@ chunk-mrx6y2r5.js:218399-220037 esm-fingerprint
var ny = {
  [INVALID_FILE_EXTENSION]: "The file path in the WWW-Authenticate header does not contain a .key file.",
  [INVALID_FILE_PATH]:
    "The file path in the WWW-Authenticate header is not in a valid Windows or Linux Format.",
  [INVALID_MANAGED_IDENTITY_ID_TYPE]: "More than one ManagedIdentityIdType was provided.",
  [INVALID_SECRET]:
    "The secret in the file on the file path in the WWW-Authenticate header is greater than 4096 bytes.",
  [PLATFORM_NOT_SUPPORTED]:
    "The platform is not supported by Azure Arc. Azure Arc only supports Windows and Linux.",
  [MISSING_CLIENT_ID]: "A ManagedIdentityId id was not provided.",
  [vr.AZURE_POD_IDENTITY_AUTHORITY_HOST]: `The Managed Identity's '${w.AZURE_POD_IDENTITY_AUTHORITY_HOST}' environment variable is malformed.`,
  [vr.IDENTITY_ENDPOINT]: `The Managed Identity's '${w.IDENTITY_ENDPOINT}' environment variable is malformed.`,
  [vr.IMDS_ENDPOINT]: `The Managed Identity's '${w.IMDS_ENDPOINT}' environment variable is malformed.`,
  [vr.MSI_ENDPOINT]: `The Managed Identity's '${w.MSI_ENDPOINT}' environment variable is malformed.`,
  [NETWORK_UNAVAILABLE]:
    "Authentication unavailable. The request to the managed identity endpoint timed out.",
  [UNABLE_TO_CREATE_AZURE_ARC]: "Azure Arc Managed Identities can only be system assigned.",
  [UNABLE_TO_CREATE_CLOUD_SHELL]: "Cloud Shell Managed Identities can only be system assigned.",
  [UNABLE_TO_CREATE_SOURCE]: "Unable to create a Managed Identity source based on environment variables.",
  [UNABLE_TO_READ_SECRET_FILE]: "Unable to read the secret file.",
  [USER_ASSIGNED_NOT_AVAILABLE_AT_RUNTIME]:
    "Service Fabric user assigned managed identity ClientId or ResourceId is not configurable at runtime.",
  [WWW_AUTHENTICATE_HEADER_MISSING]:
    "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is missing.",
  [os]: "A 401 response was received form the Azure Arc Managed Identity, but the www-authenticate header is in an unsupported format.",
};
//@ chunk-mrx6y2r5.js:220037-220161 esm-fingerprint
class ManagedIdentityError extends AuthError {
  constructor(e) {
    super(e, ny[e]);
    ((this.name = "ManagedIdentityError"), Object.setPrototypeOf(this, ManagedIdentityError.prototype));
  }
}
//@ chunk-mrx6y2r5.js:220161-220193 esm-layout
function ae(e) {
  return new ManagedIdentityError(e);
}
//@ chunk-mrx6y2r5.js:220234-220738 esm-fingerprint
class Za {
  get id() {
    return this._id;
  }
  set id(e) {
    this._id = e;
  }
  get idType() {
    return this._idType;
  }
  set idType(e) {
    this._idType = e;
  }
  constructor(e) {
    let t = e?.userAssignedClientId,
      r = e?.userAssignedResourceId,
      n = e?.userAssignedObjectId;
    if (t) {
      if (r || n) throw ae(INVALID_MANAGED_IDENTITY_ID_TYPE);
      ((this.id = t), (this.idType = ne.USER_ASSIGNED_CLIENT_ID));
    } else if (r) {
      if (t || n) throw ae(INVALID_MANAGED_IDENTITY_ID_TYPE);
      ((this.id = r), (this.idType = ne.USER_ASSIGNED_RESOURCE_ID));
    } else if (n) {
      if (t || r) throw ae(INVALID_MANAGED_IDENTITY_ID_TYPE);
      ((this.id = n), (this.idType = ne.USER_ASSIGNED_OBJECT_ID));
    } else ((this.id = SYSTEM_ASSIGNED_MANAGED_IDENTITY), (this.idType = ne.SYSTEM_ASSIGNED));
  }
}
//@ chunk-mrx6y2r5.js:220779-222006 esm-fingerprint
var le = {
  invalidLoopbackAddressType: {
    code: "invalid_loopback_server_address_type",
    desc: "Loopback server address is not type string. This is unexpected.",
  },
  unableToLoadRedirectUri: {
    code: "unable_to_load_redirectUrl",
    desc: "Loopback server callback was invoked without a url. This is unexpected.",
  },
  noAuthCodeInResponse: {
    code: "no_auth_code_in_response",
    desc: "No auth code found in the server response. Please check your network trace to determine what happened.",
  },
  noLoopbackServerExists: { code: "no_loopback_server_exists", desc: "No loopback server exists yet." },
  loopbackServerAlreadyExists: {
    code: "loopback_server_already_exists",
    desc: "Loopback server already exists. Cannot create another.",
  },
  loopbackServerTimeout: {
    code: "loopback_server_timeout",
    desc: "Timed out waiting for auth code listener to be registered.",
  },
  stateNotFoundError: {
    code: "state_not_found",
    desc: "State not found. Please verify that the request originated from msal.",
  },
  thumbprintMissing: {
    code: "thumbprint_missing_from_client_certificate",
    desc: "Client certificate does not contain a SHA-1 or SHA-256 thumbprint.",
  },
  redirectUriNotSupported: {
    code: "redirect_uri_not_supported",
    desc: "RedirectUri is not supported in this scenario. Please remove redirectUri from the request.",
  },
};
//@ chunk-mrx6y2r5.js:222006-223182 esm-fingerprint
class NodeAuthError extends AuthError {
  constructor(e, t) {
    super(e, t);
    this.name = "NodeAuthError";
  }
  static createInvalidLoopbackAddressTypeError() {
    return new NodeAuthError(le.invalidLoopbackAddressType.code, `${le.invalidLoopbackAddressType.desc}`);
  }
  static createUnableToLoadRedirectUrlError() {
    return new NodeAuthError(le.unableToLoadRedirectUri.code, `${le.unableToLoadRedirectUri.desc}`);
  }
  static createNoAuthCodeInResponseError() {
    return new NodeAuthError(le.noAuthCodeInResponse.code, `${le.noAuthCodeInResponse.desc}`);
  }
  static createNoLoopbackServerExistsError() {
    return new NodeAuthError(le.noLoopbackServerExists.code, `${le.noLoopbackServerExists.desc}`);
  }
  static createLoopbackServerAlreadyExistsError() {
    return new NodeAuthError(le.loopbackServerAlreadyExists.code, `${le.loopbackServerAlreadyExists.desc}`);
  }
  static createLoopbackServerTimeoutError() {
    return new NodeAuthError(le.loopbackServerTimeout.code, `${le.loopbackServerTimeout.desc}`);
  }
  static createStateNotFoundError() {
    return new NodeAuthError(le.stateNotFoundError.code, le.stateNotFoundError.desc);
  }
  static createThumbprintMissingError() {
    return new NodeAuthError(le.thumbprintMissing.code, le.thumbprintMissing.desc);
  }
  static createRedirectUriNotSupportedError() {
    return new NodeAuthError(le.redirectUriNotSupported.code, le.redirectUriNotSupported.desc);
  }
}
//@ chunk-mrx6y2r5.js:225925-226319 esm-fingerprint
class xe {
  static base64Encode(e, t) {
    return Buffer.from(e, t).toString(me.BASE64);
  }
  static base64EncodeUrl(e, t) {
    return xe.base64Encode(e, t).replace(/=/g, f.EMPTY_STRING).replace(/\+/g, "-").replace(/\//g, "_");
  }
  static base64Decode(e) {
    return Buffer.from(e, me.BASE64).toString("utf8");
  }
  static base64DecodeUrl(e) {
    let replaced = e.replace(/-/g, "+").replace(/_/g, "/");
    while (replaced.length % 4) replaced += "=";
    return xe.base64Decode(replaced);
  }
}
//@ chunk-mrx6y2r5.js:226383-226454 esm-fingerprint
class kr {
  sha256(e) {
    return uy.createHash(Ch.SHA256).update(e).digest();
  }
}
//@ chunk-mrx6y2r5.js:226518-227057 esm-fingerprint
class oc {
  constructor() {
    this.hashUtils = new kr();
  }
  async generatePkceCodes() {
    let generateCodeVerifier = this.generateCodeVerifier(),
      generateCodeChallengeFromVerifier = this.generateCodeChallengeFromVerifier(generateCodeVerifier);
    return { verifier: generateCodeVerifier, challenge: generateCodeChallengeFromVerifier };
  }
  generateCodeVerifier() {
    let e = [],
      t = 256 - (256 % Yi.CV_CHARSET.length);
    while (e.length <= Eh) {
      let n = hy.randomBytes(1)[0];
      if (n >= t) continue;
      let o = n % Yi.CV_CHARSET.length;
      e.push(Yi.CV_CHARSET[o]);
    }
    let joined = e.join(f.EMPTY_STRING);
    return xe.base64EncodeUrl(joined);
  }
  generateCodeChallengeFromVerifier(e) {
    return xe.base64EncodeUrl(this.hashUtils.sha256(e).toString(me.BASE64), me.BASE64);
  }
}
//@ chunk-mrx6y2r5.js:227098-227844 esm-fingerprint
class Wt {
  constructor() {
    ((this.pkceGenerator = new oc()), (this.guidGenerator = new Ro()), (this.hashUtils = new kr()));
  }
  base64UrlEncode() {
    throw Error("Method not implemented.");
  }
  encodeKid() {
    throw Error("Method not implemented.");
  }
  createNewGuid() {
    return this.guidGenerator.generateGuid();
  }
  base64Encode(e) {
    return xe.base64Encode(e);
  }
  base64Decode(e) {
    return xe.base64Decode(e);
  }
  generatePkceCodes() {
    return this.pkceGenerator.generatePkceCodes();
  }
  getPublicKeyThumbprint() {
    throw Error("Method not implemented.");
  }
  removeTokenBindingKey() {
    throw Error("Method not implemented.");
  }
  clearKeystore() {
    throw Error("Method not implemented.");
  }
  signJwt() {
    throw Error("Method not implemented.");
  }
  async hashString(e) {
    return xe.base64EncodeUrl(this.hashUtils.sha256(e).toString(me.BASE64), me.BASE64);
  }
}
//@ chunk-mrx6y2r5.js:227930-228252 esm-fingerprint
function Nh(e) {
  let t = (e.credentialType === K.REFRESH_TOKEN && e.familyId) || e.clientId,
    r = e.tokenType && e.tokenType.toLowerCase() !== L.BEARER.toLowerCase() ? e.tokenType.toLowerCase() : "";
  return [
    e.homeAccountId,
    e.environment,
    e.credentialType,
    t,
    e.realm || "",
    e.target || "",
    e.requestedClaimsHash || "",
    r,
  ]
    .join(Qa.KEY_SEPARATOR)
    .toLowerCase();
}
//@ chunk-mrx6y2r5.js:228252-228396 esm-fingerprint
function xh(e) {
  let t = e.homeAccountId.split(".")[1];
  return [e.homeAccountId, e.environment, t || e.tenantId || ""].join(Qa.KEY_SEPARATOR).toLowerCase();
}
//@ chunk-mrx6y2r5.js:228437-232340 esm-fingerprint
class br extends yr {
  constructor(e, t, r, n) {
    super(t, r, e, new bn(), n);
    ((this.cache = {}), (this.changeEmitters = []), (this.logger = e));
  }
  registerChangeEmitter(e) {
    this.changeEmitters.push(e);
  }
  emitChange() {
    this.changeEmitters.forEach((changeEmitter) => changeEmitter.call(null));
  }
  cacheToInMemoryCache(e) {
    let t = { accounts: {}, idTokens: {}, accessTokens: {}, refreshTokens: {}, appMetadata: {} };
    for (let key in e) {
      let n = e[key];
      if (typeof n !== "object") continue;
      if (n instanceof fe) t.accounts[key] = n;
      else if (th(n)) t.idTokens[key] = n;
      else if (eh(n)) t.accessTokens[key] = n;
      else if (rh(n)) t.refreshTokens[key] = n;
      else if (nh(key, n)) t.appMetadata[key] = n;
      else continue;
    }
    return t;
  }
  inMemoryCacheToCache(e) {
    let cache = this.getCache();
    return (
      (cache = {
        ...cache,
        ...e.accounts,
        ...e.idTokens,
        ...e.accessTokens,
        ...e.refreshTokens,
        ...e.appMetadata,
      }),
      cache
    );
  }
  getInMemoryCache() {
    return (this.logger.trace("Getting in-memory cache"), this.cacheToInMemoryCache(this.getCache()));
  }
  setInMemoryCache(e) {
    this.logger.trace("Setting in-memory cache");
    let inMemoryCacheToCache = this.inMemoryCacheToCache(e);
    (this.setCache(inMemoryCacheToCache), this.emitChange());
  }
  getCache() {
    return (this.logger.trace("Getting cache key-value store"), this.cache);
  }
  setCache(e) {
    (this.logger.trace("Setting cache key value store"), (this.cache = e), this.emitChange());
  }
  getItem(e) {
    return (this.logger.tracePii(`Item key: ${e}`), this.getCache()[e]);
  }
  setItem(e, t) {
    this.logger.tracePii(`Item key: ${e}`);
    let cache = this.getCache();
    ((cache[e] = t), this.setCache(cache));
  }
  generateCredentialKey(e) {
    return Nh(e);
  }
  generateAccountKey(e) {
    return xh(e);
  }
  getAccountKeys() {
    let inMemoryCache = this.getInMemoryCache();
    return Object.keys(inMemoryCache.accounts);
  }
  getTokenKeys() {
    let inMemoryCache = this.getInMemoryCache();
    return {
      idToken: Object.keys(inMemoryCache.idTokens),
      accessToken: Object.keys(inMemoryCache.accessTokens),
      refreshToken: Object.keys(inMemoryCache.refreshTokens),
    };
  }
  getAccount(e) {
    return this.getItem(e) ? Object.assign(new fe(), this.getItem(e)) : null;
  }
  async setAccount(e) {
    let generateAccountKey = this.generateAccountKey(fe.getAccountInfo(e));
    this.setItem(generateAccountKey, e);
  }
  getIdTokenCredential(e) {
    let item = this.getItem(e);
    if (th(item)) return item;
    return null;
  }
  async setIdTokenCredential(e) {
    let generateCredentialKey = this.generateCredentialKey(e);
    this.setItem(generateCredentialKey, e);
  }
  getAccessTokenCredential(e) {
    let item = this.getItem(e);
    if (eh(item)) return item;
    return null;
  }
  async setAccessTokenCredential(e) {
    let generateCredentialKey = this.generateCredentialKey(e);
    this.setItem(generateCredentialKey, e);
  }
  getRefreshTokenCredential(e) {
    let item = this.getItem(e);
    if (rh(item)) return item;
    return null;
  }
  async setRefreshTokenCredential(e) {
    let generateCredentialKey = this.generateCredentialKey(e);
    this.setItem(generateCredentialKey, e);
  }
  getAppMetadata(e) {
    let item = this.getItem(e);
    if (nh(e, item)) return item;
    return null;
  }
  setAppMetadata(e) {
    let t = Ug(e);
    this.setItem(t, e);
  }
  getServerTelemetry(e) {
    let item = this.getItem(e);
    if (item && Mg(e, item)) return item;
    return null;
  }
  setServerTelemetry(e, t) {
    this.setItem(e, t);
  }
  getAuthorityMetadata(e) {
    let item = this.getItem(e);
    if (item && Lg(e, item)) return item;
    return null;
  }
  getAuthorityMetadataKeys() {
    return this.getKeys().filter((e) => this.isAuthorityMetadata(e));
  }
  setAuthorityMetadata(e, t) {
    this.setItem(e, t);
  }
  getThrottlingCache(e) {
    let item = this.getItem(e);
    if (item && Dg(e, item)) return item;
    return null;
  }
  setThrottlingCache(e, t) {
    this.setItem(e, t);
  }
  removeItem(e) {
    this.logger.tracePii(`Item key: ${e}`);
    let t = !1,
      cache = this.getCache();
    if (cache[e]) (delete cache[e], (t = !0));
    if (t) (this.setCache(cache), this.emitChange());
    return t;
  }
  removeOutdatedAccount(e) {
    this.removeItem(e);
  }
  containsKey(e) {
    return this.getKeys().includes(e);
  }
  getKeys() {
    this.logger.trace("Retrieving all cache keys");
    let cache = this.getCache();
    return [...Object.keys(cache)];
  }
  clear() {
    (this.logger.trace("Clearing cache entries created by MSAL"),
      this.getKeys().forEach((t) => {
        this.removeItem(t);
      }),
      this.emitChange());
  }
  static generateInMemoryCache(e) {
    return wr.deserializeAllCache(wr.deserializeJSONBlob(e));
  }
  static generateJsonCache(e) {
    return Jr.serializeAllCache(e);
  }
  updateCredentialCacheKey(e, t) {
    let generateCredentialKey = this.generateCredentialKey(t);
    if (e !== generateCredentialKey) {
      let item = this.getItem(e);
      if (item)
        return (
          this.removeItem(e),
          this.setItem(generateCredentialKey, item),
          this.logger.verbose(`Updated an outdated ${t.credentialType} cache key`),
          generateCredentialKey
        );
      else
        this.logger.error(
          `Attempted to update an outdated ${t.credentialType} cache key but no item matching the outdated key was found in storage`,
        );
    }
    return e;
  }
}
//@ chunk-mrx6y2r5.js:232381-232458 esm-fingerprint
var wo = { Account: {}, IdToken: {}, AccessToken: {}, RefreshToken: {}, AppMetadata: {} };
//@ chunk-mrx6y2r5.js:232458-236220 esm-fingerprint
class as {
  constructor(e, t, r) {
    if (
      ((this.cacheHasChanged = !1),
      (this.storage = e),
      this.storage.registerChangeEmitter(this.handleChangeEvent.bind(this)),
      r)
    )
      this.persistence = r;
    this.logger = t;
  }
  hasChanged() {
    return this.cacheHasChanged;
  }
  serialize() {
    this.logger.trace("Serializing in-memory cache");
    let serializeAllCache = Jr.serializeAllCache(this.storage.getInMemoryCache());
    if (this.cacheSnapshot)
      (this.logger.trace("Reading cache snapshot from disk"),
        (serializeAllCache = this.mergeState(JSON.parse(this.cacheSnapshot), serializeAllCache)));
    else this.logger.trace("No cache snapshot to merge");
    return ((this.cacheHasChanged = !1), JSON.stringify(serializeAllCache));
  }
  deserialize(e) {
    if (
      (this.logger.trace("Deserializing JSON to in-memory cache"),
      (this.cacheSnapshot = e),
      this.cacheSnapshot)
    ) {
      this.logger.trace("Reading cache snapshot from disk");
      let deserializeAllCache = wr.deserializeAllCache(this.overlayDefaults(JSON.parse(this.cacheSnapshot)));
      this.storage.setInMemoryCache(deserializeAllCache);
    } else this.logger.trace("No cache snapshot to deserialize");
  }
  getKVStore() {
    return this.storage.getCache();
  }
  getCacheSnapshot() {
    let generateInMemoryCache = br.generateInMemoryCache(this.cacheSnapshot);
    return this.storage.inMemoryCacheToCache(generateInMemoryCache);
  }
  async getAllAccounts(e = new Wt().createNewGuid()) {
    this.logger.trace("getAllAccounts called");
    let t;
    try {
      if (this.persistence) ((t = new Xe(this, !1)), await this.persistence.beforeCacheAccess(t));
      return this.storage.getAllAccounts({}, e);
    } finally {
      if (this.persistence && t) await this.persistence.afterCacheAccess(t);
    }
  }
  async getAccountByHomeId(e) {
    let allAccounts = await this.getAllAccounts();
    if (e && allAccounts && allAccounts.length)
      return allAccounts.filter((r) => r.homeAccountId === e)[0] || null;
    else return null;
  }
  async getAccountByLocalId(e) {
    let allAccounts = await this.getAllAccounts();
    if (e && allAccounts && allAccounts.length)
      return allAccounts.filter((r) => r.localAccountId === e)[0] || null;
    else return null;
  }
  async removeAccount(e, t) {
    this.logger.trace("removeAccount called");
    let r;
    try {
      if (this.persistence) ((r = new Xe(this, !0)), await this.persistence.beforeCacheAccess(r));
      this.storage.removeAccount(e, t || new Ro().generateGuid());
    } finally {
      if (this.persistence && r) await this.persistence.afterCacheAccess(r);
    }
  }
  async overwriteCache() {
    if (!this.persistence) {
      this.logger.info("No persistence layer specified, cache cannot be overwritten");
      return;
    }
    (this.logger.info("Overwriting in-memory cache with persistent cache"), this.storage.clear());
    let e = new Xe(this, !1);
    await this.persistence.beforeCacheAccess(e);
    let cacheSnapshot = this.getCacheSnapshot();
    (this.storage.setCache(cacheSnapshot), await this.persistence.afterCacheAccess(e));
  }
  handleChangeEvent() {
    this.cacheHasChanged = !0;
  }
  mergeState(e, t) {
    this.logger.trace("Merging in-memory cache with cache snapshot");
    let mergeRemovals = this.mergeRemovals(e, t);
    return this.mergeUpdates(mergeRemovals, t);
  }
  mergeUpdates(e, t) {
    return (
      Object.keys(t).forEach((r) => {
        let n = t[r];
        if (!e.hasOwnProperty(r)) {
          if (n !== null) e[r] = n;
        } else {
          let o = n !== null,
            i = typeof n === "object",
            s = !Array.isArray(n),
            a = typeof e[r] < "u" && e[r] !== null;
          if (o && i && s && a) this.mergeUpdates(e[r], n);
          else e[r] = n;
        }
      }),
      e
    );
  }
  mergeRemovals(e, t) {
    this.logger.trace("Remove updated entries in cache");
    let r = e.Account ? this.mergeRemovalsDict(e.Account, t.Account) : e.Account,
      n = e.AccessToken ? this.mergeRemovalsDict(e.AccessToken, t.AccessToken) : e.AccessToken,
      o = e.RefreshToken ? this.mergeRemovalsDict(e.RefreshToken, t.RefreshToken) : e.RefreshToken,
      i = e.IdToken ? this.mergeRemovalsDict(e.IdToken, t.IdToken) : e.IdToken,
      s = e.AppMetadata ? this.mergeRemovalsDict(e.AppMetadata, t.AppMetadata) : e.AppMetadata;
    return { ...e, Account: r, AccessToken: n, RefreshToken: o, IdToken: i, AppMetadata: s };
  }
  mergeRemovalsDict(e, t) {
    let r = { ...e };
    return (
      Object.keys(e).forEach((n) => {
        if (!t || !t.hasOwnProperty(n)) delete r[n];
      }),
      r
    );
  }
  overlayDefaults(e) {
    return (
      this.logger.trace("Overlaying input cache with the default cache"),
      {
        Account: { ...wo.Account, ...e.Account },
        IdToken: { ...wo.IdToken, ...e.IdToken },
        AccessToken: { ...wo.AccessToken, ...e.AccessToken },
        RefreshToken: { ...wo.RefreshToken, ...e.RefreshToken },
        AppMetadata: { ...wo.AppMetadata, ...e.AppMetadata },
      }
    );
  }
}
//@ chunk-mrx6y2r5.js:236220-236238 esm-layout
var Lf = Re(Uf(), 1);
//@ chunk-mrx6y2r5.js:236279-237661 esm-fingerprint
class ct {
  static fromAssertion(e) {
    let t = new ct();
    return ((t.jwt = e), t);
  }
  static fromCertificate(e, t, r) {
    let n = new ct();
    if (((n.privateKey = t), (n.thumbprint = e), (n.useSha256 = !1), r))
      n.publicCertificate = this.parseCertificate(r);
    return n;
  }
  static fromCertificateWithSha256Thumbprint(e, t, r) {
    let n = new ct();
    if (((n.privateKey = t), (n.thumbprint = e), (n.useSha256 = !0), r))
      n.publicCertificate = this.parseCertificate(r);
    return n;
  }
  getJwt(e, t, r) {
    if (this.privateKey && this.thumbprint) {
      if (this.jwt && !this.isExpired() && t === this.issuer && r === this.jwtAudience) return this.jwt;
      return this.createJwt(e, t, r);
    }
    if (this.jwt) return this.jwt;
    throw g(INVALID_ASSERTION);
  }
  createJwt(e, t, r) {
    ((this.issuer = t), (this.jwtAudience = r));
    let n = Q();
    this.expirationTime = n + 600;
    let i = { alg: this.useSha256 ? Ke.PSS_256 : Ke.RSA_256 },
      s = this.useSha256 ? Ke.X5T_256 : Ke.X5T;
    if ((Object.assign(i, { [s]: xe.base64EncodeUrl(this.thumbprint, me.HEX) }), this.publicCertificate))
      Object.assign(i, { [Ke.X5C]: this.publicCertificate });
    let a = {
      [Ke.AUDIENCE]: this.jwtAudience,
      [Ke.EXPIRATION_TIME]: this.expirationTime,
      [Ke.ISSUER]: this.issuer,
      [Ke.SUBJECT]: this.issuer,
      [Ke.NOT_BEFORE]: n,
      [Ke.JWT_ID]: e.createNewGuid(),
    };
    return ((this.jwt = Lf.default.sign(a, this.privateKey, { header: i })), this.jwt);
  }
  isExpired() {
    return this.expirationTime < Q();
  }
  static parseCertificate(e) {
    let t = /-----BEGIN CERTIFICATE-----\r*\n(.+?)\r*\n-----END CERTIFICATE-----/gs,
      r = [],
      n;
    while ((n = t.exec(e)) !== null) r.push(n[1].replace(/\r*\n/g, f.EMPTY_STRING));
    return r;
  }
}
//@ chunk-mrx6y2r5.js:237702-237739 esm-fingerprint
var ps = "@azure/msal-node",
  lt = "3.8.1";
//@ chunk-mrx6y2r5.js:237780-239733 esm-fingerprint
class gs extends Te {
  constructor(e) {
    super(e);
  }
  async acquireToken(e) {
    this.logger.info("in acquireToken call in username-password client");
    let t = Q(),
      executeTokenRequest = await this.executeTokenRequest(this.authority, e),
      n = new ie(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
    return (
      n.validateTokenResponse(executeTokenRequest.body),
      n.handleServerTokenResponse(executeTokenRequest.body, this.authority, t, e)
    );
  }
  async executeTokenRequest(e, t) {
    let tokenQueryParameters = this.createTokenQueryParameters(t),
      appendQueryString = N.appendQueryString(e.tokenEndpoint, tokenQueryParameters),
      tokenRequestBody = await this.createTokenRequestBody(t),
      tokenRequestHeaders = this.createTokenRequestHeaders({ credential: t.username, type: Ie.UPN }),
      s = {
        clientId: this.config.authOptions.clientId,
        authority: e.canonicalAuthority,
        scopes: t.scopes,
        claims: t.claims,
        authenticationScheme: t.authenticationScheme,
        resourceRequestMethod: t.resourceRequestMethod,
        resourceRequestUri: t.resourceRequestUri,
        shrClaims: t.shrClaims,
        sshKid: t.sshKid,
      };
    return this.executePostToTokenEndpoint(
      appendQueryString,
      tokenRequestBody,
      tokenRequestHeaders,
      s,
      t.correlationId,
    );
  }
  async createTokenRequestBody(e) {
    let t = new Map();
    if (
      (Qe(t, this.config.authOptions.clientId),
      Og(t, e.username),
      Ng(t, e.password),
      We(t, e.scopes),
      Du(t, Xr.IDTOKEN_TOKEN),
      zt(t, Pe.RESOURCE_OWNER_PASSWORD_GRANT),
      At(t),
      Et(t, this.config.libraryInfo),
      Ct(t, this.config.telemetry.application),
      qt(t),
      this.serverTelemetryManager)
    )
      Gt(t, this.serverTelemetryManager);
    let r = e.correlationId || this.config.cryptoInterface.createNewGuid();
    if ((at(t, r), this.config.clientCredentials.clientSecret))
      Tr(t, this.config.clientCredentials.clientSecret);
    let clientAssertion = this.config.clientCredentials.clientAssertion;
    if (clientAssertion)
      (Er(t, await _e(clientAssertion.assertion, this.config.authOptions.clientId, e.resourceRequestUri)),
        Cr(t, clientAssertion.assertionType));
    if (
      !re.isEmptyObj(e.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(t, e.claims, this.config.authOptions.clientCapabilities);
    if (this.config.systemOptions.preventCorsPreflight && e.username) $t(t, e.username);
    return pe(t);
  }
}
//@ chunk-mrx6y2r5.js:239774-240183 esm-fingerprint
function Hf(e, t, r, n) {
  let o = Gg({ ...e.auth, authority: t, redirectUri: r.redirectUri || "" }, r, n);
  if ((Et(o, { sku: Se.MSAL_SKU, version: lt, cpu: "x64", os: "linux" }), e.auth.protocolMode !== Ae.OIDC))
    Ct(o, e.telemetry.application);
  if ((Du(o, Xr.CODE), r.codeChallenge && r.codeChallengeMethod))
    wg(o, r.codeChallenge, r.codeChallengeMethod);
  return (
    Le(o, r.extraQueryParameters || {}),
    qg(t, o, e.auth.encodeExtraQueryParams, r.extraQueryParameters)
  );
}
//@ chunk-mrx6y2r5.js:240224-247170 esm-fingerprint
class Mn {
  constructor(e) {
    ((this.config = bh(e)),
      (this.cryptoProvider = new Wt()),
      (this.logger = new Ue(this.config.system.loggerOptions, ps, lt)),
      (this.storage = new br(
        this.logger,
        this.config.auth.clientId,
        this.cryptoProvider,
        Ka(this.config.auth),
      )),
      (this.tokenCache = new as(this.storage, this.logger, this.config.cache.cachePlugin)));
  }
  async getAuthCodeUrl(e) {
    this.logger.info("getAuthCodeUrl called", e.correlationId);
    let t = {
        ...e,
        ...(await this.initializeBaseRequest(e)),
        responseMode: e.responseMode || mt.QUERY,
        authenticationScheme: L.BEARER,
        state: e.state || "",
        nonce: e.nonce || "",
      },
      authority = await this.createAuthority(t.authority, t.correlationId, void 0, e.azureCloudOptions);
    return Hf(this.config, authority, t, this.logger);
  }
  async acquireTokenByCode(e, t) {
    if ((this.logger.info("acquireTokenByCode called"), e.state && t))
      (this.logger.info("acquireTokenByCode - validating state"),
        this.validateState(e.state, t.state || ""),
        (t = { ...t, state: "" }));
    let r = { ...e, ...(await this.initializeBaseRequest(e)), authenticationScheme: L.BEARER },
      initializeServerTelemetryManager = this.initializeServerTelemetryManager(
        St.acquireTokenByCode,
        r.correlationId,
      );
    try {
      let authority = await this.createAuthority(r.authority, r.correlationId, void 0, e.azureCloudOptions),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          r.correlationId,
          r.redirectUri,
          initializeServerTelemetryManager,
        ),
        s = new Ki(oauthClientConfiguration);
      return (this.logger.verbose("Auth code client created", r.correlationId), await s.acquireToken(r, t));
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(r.correlationId);
      throw (initializeServerTelemetryManager.cacheFailedRequest(error), error);
    }
  }
  async acquireTokenByRefreshToken(e) {
    this.logger.info("acquireTokenByRefreshToken called", e.correlationId);
    let t = { ...e, ...(await this.initializeBaseRequest(e)), authenticationScheme: L.BEARER },
      initializeServerTelemetryManager = this.initializeServerTelemetryManager(
        St.acquireTokenByRefreshToken,
        t.correlationId,
      );
    try {
      let authority = await this.createAuthority(t.authority, t.correlationId, void 0, e.azureCloudOptions),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          t.correlationId,
          t.redirectUri || "",
          initializeServerTelemetryManager,
        ),
        i = new xn(oauthClientConfiguration);
      return (this.logger.verbose("Refresh token client created", t.correlationId), await i.acquireToken(t));
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(t.correlationId);
      throw (initializeServerTelemetryManager.cacheFailedRequest(error), error);
    }
  }
  async acquireTokenSilent(e) {
    let t = { ...e, ...(await this.initializeBaseRequest(e)), forceRefresh: e.forceRefresh || !1 },
      initializeServerTelemetryManager = this.initializeServerTelemetryManager(
        St.acquireTokenSilent,
        t.correlationId,
        t.forceRefresh,
      );
    try {
      let authority = await this.createAuthority(t.authority, t.correlationId, void 0, e.azureCloudOptions),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          t.correlationId,
          t.redirectUri || "",
          initializeServerTelemetryManager,
        ),
        i = new Vi(oauthClientConfiguration);
      this.logger.verbose("Silent flow client created", t.correlationId);
      try {
        return (
          await this.tokenCache.overwriteCache(),
          await this.acquireCachedTokenSilent(t, i, oauthClientConfiguration)
        );
      } catch (error) {
        if (error instanceof ClientAuthError && error.errorCode === TOKEN_REFRESH_REQUIRED)
          return new xn(oauthClientConfiguration).acquireTokenByRefreshToken(t);
        throw error;
      }
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(t.correlationId);
      throw (initializeServerTelemetryManager.cacheFailedRequest(error), error);
    }
  }
  async acquireCachedTokenSilent(e, t, r) {
    let [n, o] = await t.acquireCachedToken({ ...e, scopes: e.scopes?.length ? e.scopes : [...ye] });
    if (o === j.PROACTIVELY_REFRESHED) {
      this.logger.info(
        "ClientApplication:acquireCachedTokenSilent - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.",
      );
      let i = new xn(r);
      try {
        await i.acquireTokenByRefreshToken(e);
      } catch {}
    }
    return n;
  }
  async acquireTokenByUsernamePassword(e) {
    this.logger.info("acquireTokenByUsernamePassword called", e.correlationId);
    let t = { ...e, ...(await this.initializeBaseRequest(e)) },
      initializeServerTelemetryManager = this.initializeServerTelemetryManager(
        St.acquireTokenByUsernamePassword,
        t.correlationId,
      );
    try {
      let authority = await this.createAuthority(t.authority, t.correlationId, void 0, e.azureCloudOptions),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          t.correlationId,
          "",
          initializeServerTelemetryManager,
        ),
        i = new gs(oauthClientConfiguration);
      return (
        this.logger.verbose("Username password client created", t.correlationId),
        await i.acquireToken(t)
      );
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(t.correlationId);
      throw (initializeServerTelemetryManager.cacheFailedRequest(error), error);
    }
  }
  getTokenCache() {
    return (this.logger.info("getTokenCache called"), this.tokenCache);
  }
  validateState(e, t) {
    if (!e) throw NodeAuthError.createStateNotFoundError();
    if (e !== t) throw g(STATE_MISMATCH);
  }
  getLogger() {
    return this.logger;
  }
  setLogger(e) {
    this.logger = e;
  }
  async buildOauthClientConfiguration(e, t, r, n) {
    return (
      this.logger.verbose("buildOauthClientConfiguration called", t),
      this.logger.info(
        `Building oauth client configuration with the following authority: ${e.tokenEndpoint}.`,
        t,
      ),
      n?.updateRegionDiscoveryMetadata(e.regionDiscoveryMetadata),
      {
        authOptions: {
          clientId: this.config.auth.clientId,
          authority: e,
          clientCapabilities: this.config.auth.clientCapabilities,
          redirectUri: r,
        },
        loggerOptions: {
          logLevel: this.config.system.loggerOptions.logLevel,
          loggerCallback: this.config.system.loggerOptions.loggerCallback,
          piiLoggingEnabled: this.config.system.loggerOptions.piiLoggingEnabled,
          correlationId: t,
        },
        cacheOptions: { claimsBasedCachingEnabled: this.config.cache.claimsBasedCachingEnabled },
        cryptoInterface: this.cryptoProvider,
        networkInterface: this.config.system.networkClient,
        storageInterface: this.storage,
        serverTelemetryManager: n,
        clientCredentials: {
          clientSecret: this.clientSecret,
          clientAssertion: await this.getClientAssertion(e),
        },
        libraryInfo: { sku: Se.MSAL_SKU, version: lt, cpu: "x64", os: "linux" },
        telemetry: this.config.telemetry,
        persistencePlugin: this.config.cache.cachePlugin,
        serializableCache: this.tokenCache,
      }
    );
  }
  async getClientAssertion(e) {
    if (this.developerProvidedClientAssertion)
      this.clientAssertion = ct.fromAssertion(
        await _e(this.developerProvidedClientAssertion, this.config.auth.clientId, e.tokenEndpoint),
      );
    return (
      this.clientAssertion && {
        assertion: this.clientAssertion.getJwt(
          this.cryptoProvider,
          this.config.auth.clientId,
          e.tokenEndpoint,
        ),
        assertionType: Se.JWT_BEARER_ASSERTION_TYPE,
      }
    );
  }
  async initializeBaseRequest(e) {
    if (
      (this.logger.verbose("initializeRequestScopes called", e.correlationId),
      e.authenticationScheme && e.authenticationScheme === L.POP)
    )
      this.logger.verbose(
        "Authentication Scheme 'pop' is not supported yet, setting Authentication Scheme to 'Bearer' for request",
        e.correlationId,
      );
    if (
      ((e.authenticationScheme = L.BEARER),
      this.config.cache.claimsBasedCachingEnabled && e.claims && !re.isEmptyObj(e.claims))
    )
      e.requestedClaimsHash = await this.cryptoProvider.hashString(e.claims);
    return {
      ...e,
      scopes: [...((e && e.scopes) || []), ...ye],
      correlationId: (e && e.correlationId) || this.cryptoProvider.createNewGuid(),
      authority: e.authority || this.config.auth.authority,
    };
  }
  initializeServerTelemetryManager(e, t, r) {
    let n = { clientId: this.config.auth.clientId, correlationId: t, apiId: e, forceRefresh: r || !1 };
    return new jt(n, this.storage);
  }
  async createAuthority(e, t, r, n) {
    this.logger.verbose("createAuthority called", t);
    let generateAuthority = ue.generateAuthority(e, n || this.config.auth.azureCloudOptions),
      i = {
        protocolMode: this.config.auth.protocolMode,
        knownAuthorities: this.config.auth.knownAuthorities,
        cloudDiscoveryMetadata: this.config.auth.cloudDiscoveryMetadata,
        authorityMetadata: this.config.auth.authorityMetadata,
        azureRegionConfiguration: r,
        skipAuthorityMetadataCache: this.config.auth.skipAuthorityMetadataCache,
      };
    return Va(generateAuthority, this.config.system.networkClient, this.storage, i, this.logger, t);
  }
  clearCache() {
    this.storage.clear();
  }
}
//@ chunk-mrx6y2r5.js:247232-248318 esm-fingerprint
class Tc {
  async listenForAuthCode(e, t) {
    if (this.server) throw NodeAuthError.createLoopbackServerAlreadyExistsError();
    return new Promise((r, n) => {
      ((this.server = http_2.createServer((o, i) => {
        let url = o.url;
        if (!url) {
          (i.end(t || "Error occurred loading redirectUrl"),
            n(NodeAuthError.createUnableToLoadRedirectUrlError()));
          return;
        } else if (url === f.FORWARD_SLASH) {
          i.end(e || "Auth code was successfully acquired. You can close this window now.");
          return;
        }
        let redirectUri = this.getRedirectUri(),
          c = new URL(url, redirectUri),
          l = ka(c.search) || {};
        if (l.code) (i.writeHead(b.REDIRECT, { location: redirectUri }), i.end());
        if (l.error) i.end(t || `Error occurred: ${l.error}`);
        r(l);
      })),
        this.server.listen(0, "127.0.0.1"));
    });
  }
  getRedirectUri() {
    if (!this.server || !this.server.listening) throw NodeAuthError.createNoLoopbackServerExistsError();
    let address = this.server.address();
    if (!address || typeof address === "string" || !address.port)
      throw (this.closeServer(), NodeAuthError.createInvalidLoopbackAddressTypeError());
    let t = address && address.port;
    return `${Se.HTTP_PROTOCOL}${Se.LOCALHOST}:${t}`;
  }
  closeServer() {
    if (this.server) {
      if ((this.server.close(), typeof this.server.closeAllConnections === "function"))
        this.server.closeAllConnections();
      (this.server.unref(), (this.server = void 0));
    }
  }
}
//@ chunk-mrx6y2r5.js:248359-252180 esm-fingerprint
class ys extends Te {
  constructor(e) {
    super(e);
  }
  async acquireToken(e) {
    let deviceCode = await this.getDeviceCode(e);
    e.deviceCodeCallback(deviceCode);
    let r = Q(),
      acquireTokenWithDeviceCode = await this.acquireTokenWithDeviceCode(e, deviceCode),
      o = new ie(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
    return (
      o.validateTokenResponse(acquireTokenWithDeviceCode),
      o.handleServerTokenResponse(acquireTokenWithDeviceCode, this.authority, r, e)
    );
  }
  async getDeviceCode(e) {
    let extraQueryParameters = this.createExtraQueryParameters(e),
      appendQueryString = N.appendQueryString(this.authority.deviceCodeEndpoint, extraQueryParameters),
      queryString = this.createQueryString(e),
      tokenRequestHeaders = this.createTokenRequestHeaders(),
      i = {
        clientId: this.config.authOptions.clientId,
        authority: e.authority,
        scopes: e.scopes,
        claims: e.claims,
        authenticationScheme: e.authenticationScheme,
        resourceRequestMethod: e.resourceRequestMethod,
        resourceRequestUri: e.resourceRequestUri,
        shrClaims: e.shrClaims,
        sshKid: e.sshKid,
      };
    return this.executePostRequestToDeviceCodeEndpoint(
      appendQueryString,
      queryString,
      tokenRequestHeaders,
      i,
      e.correlationId,
    );
  }
  createExtraQueryParameters(e) {
    let t = new Map();
    if (e.extraQueryParameters) Le(t, e.extraQueryParameters);
    return pe(t);
  }
  async executePostRequestToDeviceCodeEndpoint(e, t, r, n, o) {
    let {
      body: { user_code: i, device_code: s, verification_uri: a, expires_in: c, interval: l, message: d },
    } = await this.sendPostRequest(n, e, { body: t, headers: r }, o);
    return { userCode: i, deviceCode: s, verificationUri: a, expiresIn: c, interval: l, message: d };
  }
  createQueryString(e) {
    let t = new Map();
    if ((We(t, e.scopes), Qe(t, this.config.authOptions.clientId), e.extraQueryParameters))
      Le(t, e.extraQueryParameters);
    if (
      e.claims ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(t, e.claims, this.config.authOptions.clientCapabilities);
    return pe(t);
  }
  continuePolling(e, t, r) {
    if (r)
      throw (
        this.logger.error("Token request cancelled by setting DeviceCodeRequest.cancel = true"),
        g(DEVICE_CODE_POLLING_CANCELLED)
      );
    else if (t && t < e && Q() > t)
      throw (
        this.logger.error(
          `User defined timeout for device code polling reached. The timeout was set for ${t}`,
        ),
        g(USER_TIMEOUT_REACHED)
      );
    else if (Q() > e) {
      if (t)
        this.logger.verbose(
          `User specified timeout ignored as the device code has expired before the timeout elapsed. The user specified timeout was set for ${t}`,
        );
      throw (
        this.logger.error(`Device code expired. Expiration time of device code was ${e}`),
        g(DEVICE_CODE_EXPIRED)
      );
    }
    return !0;
  }
  async acquireTokenWithDeviceCode(e, t) {
    let tokenQueryParameters = this.createTokenQueryParameters(e),
      appendQueryString = N.appendQueryString(this.authority.tokenEndpoint, tokenQueryParameters),
      tokenRequestBody = this.createTokenRequestBody(e, t),
      tokenRequestHeaders = this.createTokenRequestHeaders(),
      s = e.timeout ? Q() + e.timeout : void 0,
      a = Q() + t.expiresIn,
      c = t.interval * 1000;
    while (this.continuePolling(a, s, e.cancel)) {
      let l = {
          clientId: this.config.authOptions.clientId,
          authority: e.authority,
          scopes: e.scopes,
          claims: e.claims,
          authenticationScheme: e.authenticationScheme,
          resourceRequestMethod: e.resourceRequestMethod,
          resourceRequestUri: e.resourceRequestUri,
          shrClaims: e.shrClaims,
          sshKid: e.sshKid,
        },
        executePostToTokenEndpoint = await this.executePostToTokenEndpoint(
          appendQueryString,
          tokenRequestBody,
          tokenRequestHeaders,
          l,
          e.correlationId,
        );
      if (executePostToTokenEndpoint.body && executePostToTokenEndpoint.body.error)
        if (executePostToTokenEndpoint.body.error === f.AUTHORIZATION_PENDING)
          (this.logger.info("Authorization pending. Continue polling."), await xg(c));
        else
          throw (
            this.logger.info("Unexpected error in polling from the server"),
            wa(POST_REQUEST_FAILED, executePostToTokenEndpoint.body.error)
          );
      else
        return (
          this.logger.verbose("Authorization completed successfully. Polling stopped."),
          executePostToTokenEndpoint.body
        );
    }
    throw (this.logger.error("Polling stopped for unknown reasons."), g(DEVICE_CODE_UNKNOWN_ERROR));
  }
  createTokenRequestBody(e, t) {
    let r = new Map();
    (We(r, e.scopes),
      Qe(r, this.config.authOptions.clientId),
      zt(r, Pe.DEVICE_CODE_GRANT),
      vg(r, t.deviceCode));
    let n = e.correlationId || this.config.cryptoInterface.createNewGuid();
    if (
      (at(r, n),
      At(r),
      Et(r, this.config.libraryInfo),
      Ct(r, this.config.telemetry.application),
      qt(r),
      this.serverTelemetryManager)
    )
      Gt(r, this.serverTelemetryManager);
    if (
      !re.isEmptyObj(e.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(r, e.claims, this.config.authOptions.clientCapabilities);
    return pe(r);
  }
}
//@ chunk-mrx6y2r5.js:252221-256263 esm-fingerprint
class Ts extends Mn {
  constructor(e) {
    super(e);
    if (this.config.broker.nativeBrokerPlugin)
      if (this.config.broker.nativeBrokerPlugin.isBrokerAvailable)
        ((this.nativeBrokerPlugin = this.config.broker.nativeBrokerPlugin),
          this.nativeBrokerPlugin.setLogger(this.config.system.loggerOptions));
      else this.logger.warning("NativeBroker implementation was provided but the broker is unavailable.");
    this.skus = jt.makeExtraSkuString({ libraryName: Se.MSAL_SKU, libraryVersion: lt });
  }
  async acquireTokenByDeviceCode(e) {
    this.logger.info("acquireTokenByDeviceCode called", e.correlationId);
    let merged = Object.assign(e, await this.initializeBaseRequest(e)),
      initializeServerTelemetryManager = this.initializeServerTelemetryManager(
        St.acquireTokenByDeviceCode,
        merged.correlationId,
      );
    try {
      let authority = await this.createAuthority(
          merged.authority,
          merged.correlationId,
          void 0,
          e.azureCloudOptions,
        ),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          merged.correlationId,
          "",
          initializeServerTelemetryManager,
        ),
        i = new ys(oauthClientConfiguration);
      return (
        this.logger.verbose("Device code client created", merged.correlationId),
        await i.acquireToken(merged)
      );
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(merged.correlationId);
      throw (initializeServerTelemetryManager.cacheFailedRequest(error), error);
    }
  }
  async acquireTokenInteractive(e) {
    let t = e.correlationId || this.cryptoProvider.createNewGuid();
    this.logger.trace("acquireTokenInteractive called", t);
    let {
      openBrowser: openBrowser,
      successTemplate: successTemplate,
      errorTemplate: errorTemplate,
      windowHandle: windowHandle,
      loopbackClient: loopbackClient,
      ...a
    } = e;
    if (this.nativeBrokerPlugin) {
      let p = {
        ...a,
        clientId: this.config.auth.clientId,
        scopes: e.scopes || ye,
        redirectUri: e.redirectUri || "",
        authority: e.authority || this.config.auth.authority,
        correlationId: t,
        extraParameters: {
          ...a.extraQueryParameters,
          ...a.tokenQueryParameters,
          [X_CLIENT_XTRA_SKU]: this.skus,
        },
        accountId: a.account?.nativeAccountId,
      };
      return this.nativeBrokerPlugin.acquireTokenInteractive(p, windowHandle);
    }
    if (e.redirectUri) {
      if (!this.config.broker.nativeBrokerPlugin) throw NodeAuthError.createRedirectUriNotSupportedError();
      e.redirectUri = "";
    }
    let { verifier: verifier, challenge: challenge } = await this.cryptoProvider.generatePkceCodes(),
      d = loopbackClient || new Tc(),
      u = {},
      m = null;
    try {
      let p = d
          .listenForAuthCode(successTemplate, errorTemplate)
          .then((B) => {
            u = B;
          })
          .catch((B) => {
            m = B;
          }),
        waitForRedirectUri = await this.waitForRedirectUri(d),
        T = {
          ...a,
          correlationId: t,
          scopes: e.scopes || ye,
          redirectUri: waitForRedirectUri,
          responseMode: mt.QUERY,
          codeChallenge: challenge,
          codeChallengeMethod: ri.S256,
        },
        authCodeUrl = await this.getAuthCodeUrl(T);
      if ((await openBrowser(authCodeUrl), await p, m)) throw m;
      if (u.error) throw new ServerError(u.error, u.error_description, u.suberror);
      else if (!u.code) throw NodeAuthError.createNoAuthCodeInResponseError();
      let client_info = u.client_info,
        U = { code: u.code, codeVerifier: verifier, clientInfo: client_info || f.EMPTY_STRING, ...T };
      return await this.acquireTokenByCode(U);
    } finally {
      d.closeServer();
    }
  }
  async acquireTokenSilent(e) {
    let t = e.correlationId || this.cryptoProvider.createNewGuid();
    if ((this.logger.trace("acquireTokenSilent called", t), this.nativeBrokerPlugin)) {
      let r = {
        ...e,
        clientId: this.config.auth.clientId,
        scopes: e.scopes || ye,
        redirectUri: e.redirectUri || "",
        authority: e.authority || this.config.auth.authority,
        correlationId: t,
        extraParameters: { ...e.tokenQueryParameters, [X_CLIENT_XTRA_SKU]: this.skus },
        accountId: e.account.nativeAccountId,
        forceRefresh: e.forceRefresh || !1,
      };
      return this.nativeBrokerPlugin.acquireTokenSilent(r);
    }
    if (e.redirectUri) {
      if (!this.config.broker.nativeBrokerPlugin) throw NodeAuthError.createRedirectUriNotSupportedError();
      e.redirectUri = "";
    }
    return super.acquireTokenSilent(e);
  }
  async signOut(e) {
    if (this.nativeBrokerPlugin && e.account.nativeAccountId) {
      let t = {
        clientId: this.config.auth.clientId,
        accountId: e.account.nativeAccountId,
        correlationId: e.correlationId || this.cryptoProvider.createNewGuid(),
      };
      await this.nativeBrokerPlugin.signOut(t);
    }
    await this.getTokenCache().removeAccount(e.account, e.correlationId);
  }
  async getAllAccounts() {
    if (this.nativeBrokerPlugin) {
      let newGuid = this.cryptoProvider.createNewGuid();
      return this.nativeBrokerPlugin.getAllAccounts(this.config.auth.clientId, newGuid);
    }
    return this.getTokenCache().getAllAccounts();
  }
  async waitForRedirectUri(e) {
    return new Promise((t, r) => {
      let n = 0,
        o = setInterval(() => {
          if (Wi.TIMEOUT_MS / Wi.INTERVAL_MS < n) {
            (clearInterval(o), r(NodeAuthError.createLoopbackServerTimeoutError()));
            return;
          }
          try {
            let redirectUri = e.getRedirectUri();
            (clearInterval(o), t(redirectUri));
            return;
          } catch (error) {
            if (error instanceof AuthError && error.errorCode === le.noLoopbackServerExists.code) {
              n++;
              return;
            }
            (clearInterval(o), r(error));
            return;
          }
        }, Wi.INTERVAL_MS);
    });
  }
}
//@ chunk-mrx6y2r5.js:256304-260286 esm-fingerprint
class Dn extends Te {
  constructor(e, t) {
    super(e);
    this.appTokenProvider = t;
  }
  async acquireToken(e) {
    if (e.skipCache || e.claims) return this.executeTokenRequest(e, this.authority);
    let [t, r] = await this.getCachedAuthenticationResult(
      e,
      this.config,
      this.cryptoUtils,
      this.authority,
      this.cacheManager,
      this.serverTelemetryManager,
    );
    if (t) {
      if (r === j.PROACTIVELY_REFRESHED) {
        this.logger.info(
          "ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.",
        );
        let n = !0;
        await this.executeTokenRequest(e, this.authority, n);
      }
      return t;
    } else return this.executeTokenRequest(e, this.authority);
  }
  async getCachedAuthenticationResult(e, t, r, n, o, i) {
    let s = t,
      a = t,
      NOT_APPLICABLE = j.NOT_APPLICABLE,
      l;
    if (s.serializableCache && s.persistencePlugin)
      ((l = new Xe(s.serializableCache, !1)), await s.persistencePlugin.beforeCacheAccess(l));
    let accessTokenFromCache = this.readAccessTokenFromCache(
      n,
      a.managedIdentityId?.id || s.authOptions.clientId,
      new oe(e.scopes || []),
      o,
      e.correlationId,
    );
    if (s.serializableCache && s.persistencePlugin && l) await s.persistencePlugin.afterCacheAccess(l);
    if (!accessTokenFromCache)
      return (i?.setCacheOutcome(j.NO_CACHED_ACCESS_TOKEN), [null, j.NO_CACHED_ACCESS_TOKEN]);
    if (Vt(accessTokenFromCache.expiresOn, s.systemOptions?.tokenRenewalOffsetSeconds || en))
      return (i?.setCacheOutcome(j.CACHED_ACCESS_TOKEN_EXPIRED), [null, j.CACHED_ACCESS_TOKEN_EXPIRED]);
    if (accessTokenFromCache.refreshOn && Vt(accessTokenFromCache.refreshOn.toString(), 0))
      ((NOT_APPLICABLE = j.PROACTIVELY_REFRESHED), i?.setCacheOutcome(j.PROACTIVELY_REFRESHED));
    return [
      await ie.generateAuthenticationResult(
        r,
        n,
        {
          account: null,
          idToken: null,
          accessToken: accessTokenFromCache,
          refreshToken: null,
          appMetadata: null,
        },
        !0,
        e,
      ),
      NOT_APPLICABLE,
    ];
  }
  readAccessTokenFromCache(e, t, r, n, o) {
    let i = {
        homeAccountId: f.EMPTY_STRING,
        environment: e.canonicalAuthorityUrlComponents.HostNameAndPort,
        credentialType: K.ACCESS_TOKEN,
        clientId: t,
        realm: e.tenant,
        target: oe.createSearchScopes(r.asArray()),
      },
      accessTokensByFilter = n.getAccessTokensByFilter(i, o);
    if (accessTokensByFilter.length < 1) return null;
    else if (accessTokensByFilter.length > 1) throw g(MULTIPLE_MATCHING_TOKENS);
    return accessTokensByFilter[0];
  }
  async executeTokenRequest(e, t, r) {
    let n, o;
    if (this.appTokenProvider) {
      this.logger.info("Using appTokenProvider extensibility.");
      let a = {
        correlationId: e.correlationId,
        tenantId: this.config.authOptions.authority.tenant,
        scopes: e.scopes,
        claims: e.claims,
      };
      o = Q();
      let appTokenProvider = await this.appTokenProvider(a);
      n = {
        access_token: appTokenProvider.accessToken,
        expires_in: appTokenProvider.expiresInSeconds,
        refresh_in: appTokenProvider.refreshInSeconds,
        token_type: L.BEARER,
      };
    } else {
      let tokenQueryParameters = this.createTokenQueryParameters(e),
        appendQueryString = N.appendQueryString(t.tokenEndpoint, tokenQueryParameters),
        tokenRequestBody = await this.createTokenRequestBody(e),
        tokenRequestHeaders = this.createTokenRequestHeaders(),
        u = {
          clientId: this.config.authOptions.clientId,
          authority: e.authority,
          scopes: e.scopes,
          claims: e.claims,
          authenticationScheme: e.authenticationScheme,
          resourceRequestMethod: e.resourceRequestMethod,
          resourceRequestUri: e.resourceRequestUri,
          shrClaims: e.shrClaims,
          sshKid: e.sshKid,
        };
      (this.logger.info("Sending token request to endpoint: " + t.tokenEndpoint), (o = Q()));
      let executePostToTokenEndpoint = await this.executePostToTokenEndpoint(
        appendQueryString,
        tokenRequestBody,
        tokenRequestHeaders,
        u,
        e.correlationId,
      );
      ((n = executePostToTokenEndpoint.body), (n.status = executePostToTokenEndpoint.status));
    }
    let i = new ie(
      this.config.authOptions.clientId,
      this.cacheManager,
      this.cryptoUtils,
      this.logger,
      this.config.serializableCache,
      this.config.persistencePlugin,
    );
    return (i.validateTokenResponse(n, r), await i.handleServerTokenResponse(n, this.authority, o, e));
  }
  async createTokenRequestBody(e) {
    let t = new Map();
    if (
      (Qe(t, this.config.authOptions.clientId),
      We(t, e.scopes, !1),
      zt(t, Pe.CLIENT_CREDENTIALS_GRANT),
      Et(t, this.config.libraryInfo),
      Ct(t, this.config.telemetry.application),
      qt(t),
      this.serverTelemetryManager)
    )
      Gt(t, this.serverTelemetryManager);
    let r = e.correlationId || this.config.cryptoInterface.createNewGuid();
    if ((at(t, r), this.config.clientCredentials.clientSecret))
      Tr(t, this.config.clientCredentials.clientSecret);
    let n = e.clientAssertion || this.config.clientCredentials.clientAssertion;
    if (n)
      (Er(t, await _e(n.assertion, this.config.authOptions.clientId, e.resourceRequestUri)),
        Cr(t, n.assertionType));
    if (
      !re.isEmptyObj(e.claims) ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(t, e.claims, this.config.authOptions.clientCapabilities);
    return pe(t);
  }
}
//@ chunk-mrx6y2r5.js:260327-264439 esm-fingerprint
class Es extends Te {
  constructor(e) {
    super(e);
  }
  async acquireToken(e) {
    if (
      ((this.scopeSet = new oe(e.scopes || [])),
      (this.userAssertionHash = await this.cryptoUtils.hashString(e.oboAssertion)),
      e.skipCache || e.claims)
    )
      return this.executeTokenRequest(e, this.authority, this.userAssertionHash);
    try {
      return await this.getCachedAuthenticationResult(e);
    } catch (error) {
      return await this.executeTokenRequest(e, this.authority, this.userAssertionHash);
    }
  }
  async getCachedAuthenticationResult(e) {
    let accessTokenFromCacheForOBO = this.readAccessTokenFromCacheForOBO(this.config.authOptions.clientId, e);
    if (!accessTokenFromCacheForOBO)
      throw (
        this.serverTelemetryManager?.setCacheOutcome(j.NO_CACHED_ACCESS_TOKEN),
        this.logger.info(
          "SilentFlowClient:acquireCachedToken - No access token found in cache for the given properties.",
        ),
        g(TOKEN_REFRESH_REQUIRED)
      );
    else if (Vt(accessTokenFromCacheForOBO.expiresOn, this.config.systemOptions.tokenRenewalOffsetSeconds))
      throw (
        this.serverTelemetryManager?.setCacheOutcome(j.CACHED_ACCESS_TOKEN_EXPIRED),
        this.logger.info(
          `OnbehalfofFlow:getCachedAuthenticationResult - Cached access token is expired or will expire within ${this.config.systemOptions.tokenRenewalOffsetSeconds} seconds.`,
        ),
        g(TOKEN_REFRESH_REQUIRED)
      );
    let idTokenFromCacheForOBO = this.readIdTokenFromCacheForOBO(
        accessTokenFromCacheForOBO.homeAccountId,
        e.correlationId,
      ),
      n,
      o = null;
    if (idTokenFromCacheForOBO) {
      n = yt(idTokenFromCacheForOBO.secret, xe.base64Decode);
      let i = n.oid || n.sub,
        s = {
          homeAccountId: idTokenFromCacheForOBO.homeAccountId,
          environment: idTokenFromCacheForOBO.environment,
          tenantId: idTokenFromCacheForOBO.realm,
          username: f.EMPTY_STRING,
          localAccountId: i || f.EMPTY_STRING,
        };
      o = this.cacheManager.getAccount(this.cacheManager.generateAccountKey(s), e.correlationId);
    }
    if (this.config.serverTelemetryManager) this.config.serverTelemetryManager.incrementCacheHits();
    return ie.generateAuthenticationResult(
      this.cryptoUtils,
      this.authority,
      {
        account: o,
        accessToken: accessTokenFromCacheForOBO,
        idToken: idTokenFromCacheForOBO,
        refreshToken: null,
        appMetadata: null,
      },
      !0,
      e,
      n,
    );
  }
  readIdTokenFromCacheForOBO(e, t) {
    let r = {
        homeAccountId: e,
        environment: this.authority.canonicalAuthorityUrlComponents.HostNameAndPort,
        credentialType: K.ID_TOKEN,
        clientId: this.config.authOptions.clientId,
        realm: this.authority.tenant,
      },
      idTokensByFilter = this.cacheManager.getIdTokensByFilter(r, t);
    if (Object.values(idTokensByFilter).length < 1) return null;
    return Object.values(idTokensByFilter)[0];
  }
  readAccessTokenFromCacheForOBO(e, t) {
    let r = t.authenticationScheme || L.BEARER,
      o = {
        credentialType:
          r && r.toLowerCase() !== L.BEARER.toLowerCase() ? K.ACCESS_TOKEN_WITH_AUTH_SCHEME : K.ACCESS_TOKEN,
        clientId: e,
        target: oe.createSearchScopes(this.scopeSet.asArray()),
        tokenType: r,
        keyId: t.sshKid,
        requestedClaimsHash: t.requestedClaimsHash,
        userAssertionHash: this.userAssertionHash,
      },
      accessTokensByFilter = this.cacheManager.getAccessTokensByFilter(o, t.correlationId),
      s = accessTokensByFilter.length;
    if (s < 1) return null;
    else if (s > 1) throw g(MULTIPLE_MATCHING_TOKENS);
    return accessTokensByFilter[0];
  }
  async executeTokenRequest(e, t, r) {
    let tokenQueryParameters = this.createTokenQueryParameters(e),
      appendQueryString = N.appendQueryString(t.tokenEndpoint, tokenQueryParameters),
      tokenRequestBody = await this.createTokenRequestBody(e),
      tokenRequestHeaders = this.createTokenRequestHeaders(),
      a = {
        clientId: this.config.authOptions.clientId,
        authority: e.authority,
        scopes: e.scopes,
        claims: e.claims,
        authenticationScheme: e.authenticationScheme,
        resourceRequestMethod: e.resourceRequestMethod,
        resourceRequestUri: e.resourceRequestUri,
        shrClaims: e.shrClaims,
        sshKid: e.sshKid,
      },
      c = Q(),
      executePostToTokenEndpoint = await this.executePostToTokenEndpoint(
        appendQueryString,
        tokenRequestBody,
        tokenRequestHeaders,
        a,
        e.correlationId,
      ),
      d = new ie(
        this.config.authOptions.clientId,
        this.cacheManager,
        this.cryptoUtils,
        this.logger,
        this.config.serializableCache,
        this.config.persistencePlugin,
      );
    return (
      d.validateTokenResponse(executePostToTokenEndpoint.body),
      await d.handleServerTokenResponse(executePostToTokenEndpoint.body, this.authority, c, e, void 0, r)
    );
  }
  async createTokenRequestBody(e) {
    let t = new Map();
    if (
      (Qe(t, this.config.authOptions.clientId),
      We(t, e.scopes),
      zt(t, Pe.JWT_BEARER),
      At(t),
      Et(t, this.config.libraryInfo),
      Ct(t, this.config.telemetry.application),
      qt(t),
      this.serverTelemetryManager)
    )
      Gt(t, this.serverTelemetryManager);
    let r = e.correlationId || this.config.cryptoInterface.createNewGuid();
    if ((at(t, r), bg(t, ON_BEHALF_OF), kg(t, e.oboAssertion), this.config.clientCredentials.clientSecret))
      Tr(t, this.config.clientCredentials.clientSecret);
    let clientAssertion = this.config.clientCredentials.clientAssertion;
    if (clientAssertion)
      (Er(t, await _e(clientAssertion.assertion, this.config.authOptions.clientId, e.resourceRequestUri)),
        Cr(t, clientAssertion.assertionType));
    if (
      e.claims ||
      (this.config.authOptions.clientCapabilities && this.config.authOptions.clientCapabilities.length > 0)
    )
      Je(t, e.claims, this.config.authOptions.clientCapabilities);
    return pe(t);
  }
}
//@ chunk-mrx6y2r5.js:264480-267166 esm-fingerprint
class Cs extends Mn {
  constructor(e) {
    super(e);
    let t = !!this.config.auth.clientSecret,
      r = !!this.config.auth.clientAssertion,
      n =
        (!!this.config.auth.clientCertificate?.thumbprint ||
          !!this.config.auth.clientCertificate?.thumbprintSha256) &&
        !!this.config.auth.clientCertificate?.privateKey;
    if (this.appTokenProvider) return;
    if ((t && r) || (r && n) || (t && n)) throw g(INVALID_CLIENT_CREDENTIAL);
    if (this.config.auth.clientSecret) {
      this.clientSecret = this.config.auth.clientSecret;
      return;
    }
    if (this.config.auth.clientAssertion) {
      this.developerProvidedClientAssertion = this.config.auth.clientAssertion;
      return;
    }
    if (!n) throw g(INVALID_CLIENT_CREDENTIAL);
    else
      this.clientAssertion = this.config.auth.clientCertificate.thumbprintSha256
        ? ct.fromCertificateWithSha256Thumbprint(
            this.config.auth.clientCertificate.thumbprintSha256,
            this.config.auth.clientCertificate.privateKey,
            this.config.auth.clientCertificate.x5c,
          )
        : ct.fromCertificate(
            this.config.auth.clientCertificate.thumbprint,
            this.config.auth.clientCertificate.privateKey,
            this.config.auth.clientCertificate.x5c,
          );
    this.appTokenProvider = void 0;
  }
  SetAppTokenProvider(e) {
    this.appTokenProvider = e;
  }
  async acquireTokenByClientCredential(e) {
    this.logger.info("acquireTokenByClientCredential called", e.correlationId);
    let t;
    if (e.clientAssertion)
      t = {
        assertion: await _e(e.clientAssertion, this.config.auth.clientId),
        assertionType: Se.JWT_BEARER_ASSERTION_TYPE,
      };
    let initializeBaseRequest = await this.initializeBaseRequest(e),
      n = {
        ...initializeBaseRequest,
        scopes: initializeBaseRequest.scopes.filter((scope) => !ye.includes(scope)),
      },
      o = { ...e, ...n, clientAssertion: t },
      s = new N(o.authority).getUrlComponents().PathSegments[0];
    if (Object.values(be).includes(s)) throw g(MISSING_TENANT_ID_ERROR);
    let a = process.env[MSAL_FORCE_REGION],
      c;
    if (o.azureRegion !== "DisableMsalForceRegion")
      if (!o.azureRegion && a) c = a;
      else c = o.azureRegion;
    let l = { azureRegion: c, environmentRegion: process.env[REGION_NAME] },
      initializeServerTelemetryManager = this.initializeServerTelemetryManager(
        St.acquireTokenByClientCredential,
        o.correlationId,
        o.skipCache,
      );
    try {
      let authority = await this.createAuthority(o.authority, o.correlationId, l, e.azureCloudOptions),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          o.correlationId,
          "",
          initializeServerTelemetryManager,
        ),
        p = new Dn(oauthClientConfiguration, this.appTokenProvider);
      return (
        this.logger.verbose("Client credential client created", o.correlationId),
        await p.acquireToken(o)
      );
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(o.correlationId);
      throw (initializeServerTelemetryManager.cacheFailedRequest(error), error);
    }
  }
  async acquireTokenOnBehalfOf(e) {
    this.logger.info("acquireTokenOnBehalfOf called", e.correlationId);
    let t = { ...e, ...(await this.initializeBaseRequest(e)) };
    try {
      let authority = await this.createAuthority(t.authority, t.correlationId, void 0, e.azureCloudOptions),
        oauthClientConfiguration = await this.buildOauthClientConfiguration(
          authority,
          t.correlationId,
          "",
          void 0,
        ),
        o = new Es(oauthClientConfiguration);
      return (this.logger.verbose("On behalf of client created", t.correlationId), await o.acquireToken(t));
    } catch (error) {
      if (error instanceof AuthError) error.setCorrelationId(t.correlationId);
      throw error;
    }
  }
}
//@ chunk-mrx6y2r5.js:267207-267319 esm-fingerprint
function Ff(e) {
  if (typeof e !== "string") return !1;
  let date = new Date(e);
  return !isNaN(date.getTime()) && date.toISOString() === e;
}
//@ chunk-mrx6y2r5.js:267360-268107 esm-fingerprint
class Ec {
  constructor(e, t, r) {
    ((this.httpClientNoRetries = e), (this.retryPolicy = t), (this.logger = r));
  }
  async sendNetworkRequestAsyncHelper(e, t, r) {
    if (e === J.GET) return this.httpClientNoRetries.sendGetRequestAsync(t, r);
    else return this.httpClientNoRetries.sendPostRequestAsync(t, r);
  }
  async sendNetworkRequestAsync(e, t, r) {
    let sendNetworkRequestAsyncHelper = await this.sendNetworkRequestAsyncHelper(e, t, r);
    if ("isNewRequest" in this.retryPolicy) this.retryPolicy.isNewRequest = !0;
    let o = 0;
    while (
      await this.retryPolicy.pauseForRetry(
        sendNetworkRequestAsyncHelper.status,
        o,
        this.logger,
        sendNetworkRequestAsyncHelper.headers[Y.RETRY_AFTER],
      )
    )
      ((sendNetworkRequestAsyncHelper = await this.sendNetworkRequestAsyncHelper(e, t, r)), o++);
    return sendNetworkRequestAsyncHelper;
  }
  async sendGetRequestAsync(e, t) {
    return this.sendNetworkRequestAsync(J.GET, e, t);
  }
  async sendPostRequestAsync(e, t) {
    return this.sendNetworkRequestAsync(J.POST, e, t);
  }
}
//@ chunk-mrx6y2r5.js:268148-268375 esm-fingerprint
var Pr = {
  MANAGED_IDENTITY_CLIENT_ID_2017: "clientid",
  MANAGED_IDENTITY_CLIENT_ID: "client_id",
  MANAGED_IDENTITY_OBJECT_ID: "object_id",
  MANAGED_IDENTITY_RESOURCE_ID_IMDS: "msi_res_id",
  MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS: "mi_res_id",
};
//@ chunk-mrx6y2r5.js:268375-271062 esm-fingerprint
class Me {
  constructor(e, t, r, n, o) {
    ((this.logger = e),
      (this.nodeStorage = t),
      (this.networkClient = r),
      (this.cryptoProvider = n),
      (this.disableInternalRetries = o));
  }
  async getServerTokenResponseAsync(e, t, r, n) {
    return this.getServerTokenResponse(e);
  }
  getServerTokenResponse(e) {
    let t, r;
    if (e.body.expires_on) {
      if (Ff(e.body.expires_on)) e.body.expires_on = new Date(e.body.expires_on).getTime() / 1000;
      if (((r = e.body.expires_on - Q()), r > 7200)) t = r / 2;
    }
    return {
      status: e.status,
      access_token: e.body.access_token,
      expires_in: r,
      scope: e.body.resource,
      token_type: e.body.token_type,
      refresh_in: t,
      correlation_id: e.body.correlation_id || e.body.correlationId,
      error: typeof e.body.error === "string" ? e.body.error : e.body.error?.code,
      error_description:
        e.body.message ||
        (typeof e.body.error === "string" ? e.body.error_description : e.body.error?.message),
      error_codes: e.body.error_codes,
      timestamp: e.body.timestamp,
      trace_id: e.body.trace_id,
    };
  }
  async acquireTokenWithManagedIdentity(e, t, r, n) {
    let request = this.createRequest(e.resource, t);
    if (e.revokedTokenSha256Hash)
      (this.logger.info(`[Managed Identity] The following claims are present in the request: ${e.claims}`),
        (request.queryParameters[ce.SHA256_TOKEN_TO_REFRESH] = e.revokedTokenSha256Hash));
    if (e.clientCapabilities?.length) {
      let str = e.clientCapabilities.toString();
      (this.logger.info(
        `[Managed Identity] The following client capabilities are present in the request: ${str}`,
      ),
        (request.queryParameters[ce.XMS_CC] = str));
    }
    let headers = request.headers;
    headers[Y.CONTENT_TYPE] = f.URL_FORM_CONTENT_TYPE;
    let s = { headers: headers };
    if (Object.keys(request.bodyParameters).length) s.body = request.computeParametersBodyString();
    let a = this.disableInternalRetries
        ? this.networkClient
        : new Ec(this.networkClient, request.retryPolicy, this.logger),
      c = Q(),
      l;
    try {
      if (request.httpMethod === J.POST) l = await a.sendPostRequestAsync(request.computeUri(), s);
      else l = await a.sendGetRequestAsync(request.computeUri(), s);
    } catch (error) {
      if (error instanceof AuthError) throw error;
      else throw g(NETWORK_ERROR);
    }
    let d = new ie(t.id, this.nodeStorage, this.cryptoProvider, this.logger, null, null),
      serverTokenResponseAsync = await this.getServerTokenResponseAsync(l, a, request, s);
    return (
      d.validateTokenResponse(serverTokenResponseAsync, n),
      d.handleServerTokenResponse(serverTokenResponseAsync, r, c, e)
    );
  }
  getManagedIdentityUserAssignedIdQueryParameterKey(e, t, r) {
    switch (e) {
      case ne.USER_ASSIGNED_CLIENT_ID:
        return (
          this.logger.info(
            `[Managed Identity] [API version ${r ? "2017+" : "2019+"}] Adding user assigned client id to the request.`,
          ),
          r ? Pr.MANAGED_IDENTITY_CLIENT_ID_2017 : Pr.MANAGED_IDENTITY_CLIENT_ID
        );
      case ne.USER_ASSIGNED_RESOURCE_ID:
        return (
          this.logger.info("[Managed Identity] Adding user assigned resource id to the request."),
          t ? Pr.MANAGED_IDENTITY_RESOURCE_ID_IMDS : Pr.MANAGED_IDENTITY_RESOURCE_ID_NON_IMDS
        );
      case ne.USER_ASSIGNED_OBJECT_ID:
        return (
          this.logger.info("[Managed Identity] Adding user assigned object id to the request."),
          Pr.MANAGED_IDENTITY_OBJECT_ID
        );
      default:
        throw ae(INVALID_MANAGED_IDENTITY_ID_TYPE);
    }
  }
}
//@ chunk-mrx6y2r5.js:271062-271287 esm-fingerprint
Me.getValidatedEnvVariableUrlString = (e, t, r, n) => {
  try {
    return new N(t).urlString;
  } catch (error) {
    throw (
      n.info(
        `[Managed Identity] ${r} managed identity is unavailable because the '${e}' environment variable is malformed.`,
      ),
      ae(vr[e])
    );
  }
};
//@ chunk-mrx6y2r5.js:271328-271488 esm-fingerprint
class Cc {
  calculateDelay(e, t) {
    if (!e) return t;
    let rounded = Math.round(parseFloat(e) * 1000);
    if (isNaN(rounded)) rounded = new Date(e).valueOf() - new Date().valueOf();
    return Math.max(t, rounded);
  }
}
//@ chunk-mrx6y2r5.js:271529-271656 esm-layout
var OE = 3,
  NE = 1000,
  xE = [
    b.NOT_FOUND,
    b.REQUEST_TIMEOUT,
    b.TOO_MANY_REQUESTS,
    b.SERVER_ERROR,
    b.SERVICE_UNAVAILABLE,
    b.GATEWAY_TIMEOUT,
  ];
//@ chunk-mrx6y2r5.js:271656-272044 esm-fingerprint
class As {
  constructor() {
    this.linearRetryStrategy = new Cc();
  }
  static get DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS() {
    return NE;
  }
  async pauseForRetry(e, t, r, n) {
    if (xE.includes(e) && t < OE) {
      let calculateDelay = this.linearRetryStrategy.calculateDelay(
        n,
        As.DEFAULT_MANAGED_IDENTITY_RETRY_DELAY_MS,
      );
      return (
        r.verbose(`Retrying request in ${calculateDelay}ms (retry attempt: ${t + 1})`),
        await new Promise((i) => setTimeout(i, calculateDelay)),
        !0
      );
    }
    return !1;
  }
}
//@ chunk-mrx6y2r5.js:272085-272488 esm-fingerprint
class He {
  constructor(e, t, r) {
    ((this.httpMethod = e),
      (this._baseEndpoint = t),
      (this.headers = {}),
      (this.bodyParameters = {}),
      (this.queryParameters = {}),
      (this.retryPolicy = r || new As()));
  }
  computeUri() {
    let e = new Map();
    if (this.queryParameters) Le(e, this.queryParameters);
    let t = pe(e);
    return N.appendQueryString(this._baseEndpoint, t);
  }
  computeParametersBodyString() {
    let e = new Map();
    if (this.bodyParameters) Le(e, this.bodyParameters);
    return pe(e);
  }
}
//@ chunk-mrx6y2r5.js:272529-272549 esm-fingerprint
var ME = "2019-08-01";
//@ chunk-mrx6y2r5.js:272549-273670 esm-fingerprint
class Or extends Me {
  constructor(e, t, r, n, o, i, s) {
    super(e, t, r, n, o);
    ((this.identityEndpoint = i), (this.identityHeader = s));
  }
  static getEnvironmentVariables() {
    let e = process.env[w.IDENTITY_ENDPOINT],
      t = process.env[w.IDENTITY_HEADER];
    return [e, t];
  }
  static tryCreate(e, t, r, n, o) {
    let [i, s] = Or.getEnvironmentVariables();
    if (!i || !s)
      return (
        e.info(
          `[Managed Identity] ${k.APP_SERVICE} managed identity is unavailable because one or both of the '${w.IDENTITY_HEADER}' and '${w.IDENTITY_ENDPOINT}' environment variables are not defined.`,
        ),
        null
      );
    let validatedEnvVariableUrlString = Or.getValidatedEnvVariableUrlString(
      w.IDENTITY_ENDPOINT,
      i,
      k.APP_SERVICE,
      e,
    );
    return (
      e.info(
        `[Managed Identity] Environment variables validation passed for ${k.APP_SERVICE} managed identity. Endpoint URI: ${validatedEnvVariableUrlString}. Creating ${k.APP_SERVICE} managed identity.`,
      ),
      new Or(e, t, r, n, o, i, s)
    );
  }
  createRequest(e, t) {
    let r = new He(J.GET, this.identityEndpoint);
    if (
      ((r.headers[Ne.APP_SERVICE_SECRET_HEADER_NAME] = this.identityHeader),
      (r.queryParameters[ce.API_VERSION] = ME),
      (r.queryParameters[ce.RESOURCE] = e),
      t.idType !== ne.SYSTEM_ASSIGNED)
    )
      r.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(t.idType)] = t.id;
    return r;
  }
}
//@ chunk-mrx6y2r5.js:276429-277268 esm-fingerprint
class Nr extends Me {
  constructor(e, t, r, n, o, i) {
    super(e, t, r, n, o);
    this.msiEndpoint = i;
  }
  static getEnvironmentVariables() {
    return [process.env[w.MSI_ENDPOINT]];
  }
  static tryCreate(e, t, r, n, o, i) {
    let [s] = Nr.getEnvironmentVariables();
    if (!s)
      return (
        e.info(
          `[Managed Identity] ${k.CLOUD_SHELL} managed identity is unavailable because the '${w.MSI_ENDPOINT} environment variable is not defined.`,
        ),
        null
      );
    let validatedEnvVariableUrlString = Nr.getValidatedEnvVariableUrlString(
      w.MSI_ENDPOINT,
      s,
      k.CLOUD_SHELL,
      e,
    );
    if (
      (e.info(
        `[Managed Identity] Environment variable validation passed for ${k.CLOUD_SHELL} managed identity. Endpoint URI: ${validatedEnvVariableUrlString}. Creating ${k.CLOUD_SHELL} managed identity.`,
      ),
      i.idType !== ne.SYSTEM_ASSIGNED)
    )
      throw ae(UNABLE_TO_CREATE_CLOUD_SHELL);
    return new Nr(e, t, r, n, o, s);
  }
  createRequest(e) {
    let t = new He(J.POST, this.msiEndpoint);
    return ((t.headers[Ne.METADATA_HEADER_NAME] = "true"), (t.bodyParameters[ce.RESOURCE] = e), t);
  }
}
//@ chunk-mrx6y2r5.js:277309-277577 esm-fingerprint
class Ac {
  constructor(e, t, r) {
    ((this.minExponentialBackoff = e), (this.maxExponentialBackoff = t), (this.exponentialDeltaBackoff = r));
  }
  calculateDelay(e) {
    if (e === 0) return this.minExponentialBackoff;
    return Math.min(Math.pow(2, e - 1) * this.exponentialDeltaBackoff, this.maxExponentialBackoff);
  }
}
//@ chunk-mrx6y2r5.js:278614-278704 esm-fingerprint
var qf = "/metadata/identity/oauth2/token",
  YE = `http://169.254.169.254${qf}`,
  WE = "2018-02-01";
//@ chunk-mrx6y2r5.js:278704-279706 esm-fingerprint
class ko extends Me {
  constructor(e, t, r, n, o, i) {
    super(e, t, r, n, o);
    this.identityEndpoint = i;
  }
  static tryCreate(e, t, r, n, o) {
    let i;
    if (process.env[w.AZURE_POD_IDENTITY_AUTHORITY_HOST])
      (e.info(
        `[Managed Identity] Environment variable ${w.AZURE_POD_IDENTITY_AUTHORITY_HOST} for ${k.IMDS} returned endpoint: ${process.env[w.AZURE_POD_IDENTITY_AUTHORITY_HOST]}`,
      ),
        (i = ko.getValidatedEnvVariableUrlString(
          w.AZURE_POD_IDENTITY_AUTHORITY_HOST,
          `${process.env[w.AZURE_POD_IDENTITY_AUTHORITY_HOST]}${qf}`,
          k.IMDS,
          e,
        )));
    else
      (e.info(
        `[Managed Identity] Unable to find ${w.AZURE_POD_IDENTITY_AUTHORITY_HOST} environment variable for ${k.IMDS}, using the default endpoint.`,
      ),
        (i = YE));
    return new ko(e, t, r, n, o, i);
  }
  createRequest(e, t) {
    let r = new He(J.GET, this.identityEndpoint);
    if (
      ((r.headers[Ne.METADATA_HEADER_NAME] = "true"),
      (r.queryParameters[ce.API_VERSION] = WE),
      (r.queryParameters[ce.RESOURCE] = e),
      t.idType !== ne.SYSTEM_ASSIGNED)
    )
      r.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(t.idType, !0)] = t.id;
    return ((r.retryPolicy = new xr()), r);
  }
}
//@ chunk-mrx6y2r5.js:279747-279775 esm-fingerprint
var QE = "2019-07-01-preview";
//@ chunk-mrx6y2r5.js:279775-281290 esm-fingerprint
class Mr extends Me {
  constructor(e, t, r, n, o, i, s) {
    super(e, t, r, n, o);
    ((this.identityEndpoint = i), (this.identityHeader = s));
  }
  static getEnvironmentVariables() {
    let e = process.env[w.IDENTITY_ENDPOINT],
      t = process.env[w.IDENTITY_HEADER],
      r = process.env[w.IDENTITY_SERVER_THUMBPRINT];
    return [e, t, r];
  }
  static tryCreate(e, t, r, n, o, i) {
    let [s, a, c] = Mr.getEnvironmentVariables();
    if (!s || !a || !c)
      return (
        e.info(
          `[Managed Identity] ${k.SERVICE_FABRIC} managed identity is unavailable because one or all of the '${w.IDENTITY_HEADER}', '${w.IDENTITY_ENDPOINT}' or '${w.IDENTITY_SERVER_THUMBPRINT}' environment variables are not defined.`,
        ),
        null
      );
    let validatedEnvVariableUrlString = Mr.getValidatedEnvVariableUrlString(
      w.IDENTITY_ENDPOINT,
      s,
      k.SERVICE_FABRIC,
      e,
    );
    if (
      (e.info(
        `[Managed Identity] Environment variables validation passed for ${k.SERVICE_FABRIC} managed identity. Endpoint URI: ${validatedEnvVariableUrlString}. Creating ${k.SERVICE_FABRIC} managed identity.`,
      ),
      i.idType !== ne.SYSTEM_ASSIGNED)
    )
      e.warning(
        `[Managed Identity] ${k.SERVICE_FABRIC} user assigned managed identity is configured in the cluster, not during runtime. See also: https://learn.microsoft.com/en-us/azure/service-fabric/configure-existing-cluster-enable-managed-identity-token-service.`,
      );
    return new Mr(e, t, r, n, o, s, a);
  }
  createRequest(e, t) {
    let r = new He(J.GET, this.identityEndpoint);
    if (
      ((r.headers[Ne.ML_AND_SF_SECRET_HEADER_NAME] = this.identityHeader),
      (r.queryParameters[ce.API_VERSION] = QE),
      (r.queryParameters[ce.RESOURCE] = e),
      t.idType !== ne.SYSTEM_ASSIGNED)
    )
      r.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(t.idType)] = t.id;
    return r;
  }
}
//@ chunk-mrx6y2r5.js:281331-281445 esm-fingerprint
var JE = "2017-09-01",
  XE = `Only client id is supported for user-assigned managed identity in ${k.MACHINE_LEARNING}.`;
//@ chunk-mrx6y2r5.js:281445-282744 esm-fingerprint
class Dr extends Me {
  constructor(e, t, r, n, o, i, s) {
    super(e, t, r, n, o);
    ((this.msiEndpoint = i), (this.secret = s));
  }
  static getEnvironmentVariables() {
    let e = process.env[w.MSI_ENDPOINT],
      t = process.env[w.MSI_SECRET];
    return [e, t];
  }
  static tryCreate(e, t, r, n, o) {
    let [i, s] = Dr.getEnvironmentVariables();
    if (!i || !s)
      return (
        e.info(
          `[Managed Identity] ${k.MACHINE_LEARNING} managed identity is unavailable because one or both of the '${w.MSI_ENDPOINT}' and '${w.MSI_SECRET}' environment variables are not defined.`,
        ),
        null
      );
    let validatedEnvVariableUrlString = Dr.getValidatedEnvVariableUrlString(
      w.MSI_ENDPOINT,
      i,
      k.MACHINE_LEARNING,
      e,
    );
    return (
      e.info(
        `[Managed Identity] Environment variables validation passed for ${k.MACHINE_LEARNING} managed identity. Endpoint URI: ${validatedEnvVariableUrlString}. Creating ${k.MACHINE_LEARNING} managed identity.`,
      ),
      new Dr(e, t, r, n, o, i, s)
    );
  }
  createRequest(e, t) {
    let r = new He(J.GET, this.msiEndpoint);
    if (
      ((r.headers[Ne.METADATA_HEADER_NAME] = "true"),
      (r.headers[Ne.ML_AND_SF_SECRET_HEADER_NAME] = this.secret),
      (r.queryParameters[ce.API_VERSION] = JE),
      (r.queryParameters[ce.RESOURCE] = e),
      t.idType === ne.SYSTEM_ASSIGNED)
    )
      r.queryParameters[Pr.MANAGED_IDENTITY_CLIENT_ID_2017] = process.env[w.DEFAULT_IDENTITY_CLIENT_ID];
    else if (t.idType === ne.USER_ASSIGNED_CLIENT_ID)
      r.queryParameters[this.getManagedIdentityUserAssignedIdQueryParameterKey(t.idType, !1, !0)] = t.id;
    else throw Error(XE);
    return r;
  }
}
//@ chunk-mrx6y2r5.js:282785-284024 esm-fingerprint
class Rt {
  constructor(e, t, r, n, o) {
    ((this.logger = e),
      (this.nodeStorage = t),
      (this.networkClient = r),
      (this.cryptoProvider = n),
      (this.disableInternalRetries = o));
  }
  async sendManagedIdentityTokenRequest(e, t, r, n) {
    if (!Rt.identitySource)
      Rt.identitySource = this.selectManagedIdentitySource(
        this.logger,
        this.nodeStorage,
        this.networkClient,
        this.cryptoProvider,
        this.disableInternalRetries,
        t,
      );
    return Rt.identitySource.acquireTokenWithManagedIdentity(e, t, r, n);
  }
  allEnvironmentVariablesAreDefined(e) {
    return Object.values(e).every((t) => t !== void 0);
  }
  getManagedIdentitySource() {
    return (
      (Rt.sourceName = this.allEnvironmentVariablesAreDefined(Mr.getEnvironmentVariables())
        ? k.SERVICE_FABRIC
        : this.allEnvironmentVariablesAreDefined(Or.getEnvironmentVariables())
          ? k.APP_SERVICE
          : this.allEnvironmentVariablesAreDefined(Dr.getEnvironmentVariables())
            ? k.MACHINE_LEARNING
            : this.allEnvironmentVariablesAreDefined(Nr.getEnvironmentVariables())
              ? k.CLOUD_SHELL
              : this.allEnvironmentVariablesAreDefined(Jt.getEnvironmentVariables())
                ? k.AZURE_ARC
                : k.DEFAULT_TO_IMDS),
      Rt.sourceName
    );
  }
  selectManagedIdentitySource(e, t, r, n, o, i) {
    let s =
      Mr.tryCreate(e, t, r, n, o, i) ||
      Or.tryCreate(e, t, r, n, o) ||
      Dr.tryCreate(e, t, r, n, o) ||
      Nr.tryCreate(e, t, r, n, o, i) ||
      Jt.tryCreate(e, t, r, n, o, i) ||
      ko.tryCreate(e, t, r, n, o);
    if (!s) throw ae(UNABLE_TO_CREATE_SOURCE);
    return s;
  }
}
//@ chunk-mrx6y2r5.js:284065-284091 esm-fingerprint
var ZE = [k.SERVICE_FABRIC];
//@ chunk-mrx6y2r5.js:284091-286452 esm-fingerprint
class wt {
  constructor(e) {
    ((this.config = Ph(e || {})), (this.logger = new Ue(this.config.system.loggerOptions, ps, lt)));
    let t = { canonicalAuthority: f.DEFAULT_AUTHORITY };
    if (!wt.nodeStorage) wt.nodeStorage = new br(this.logger, this.config.managedIdentityId.id, Tn, t);
    ((this.networkClient = this.config.system.networkClient), (this.cryptoProvider = new Wt()));
    let r = {
      protocolMode: Ae.AAD,
      knownAuthorities: [Wa],
      cloudDiscoveryMetadata: "",
      authorityMetadata: "",
    };
    ((this.fakeAuthority = new ue(
      Wa,
      this.networkClient,
      wt.nodeStorage,
      r,
      this.logger,
      this.cryptoProvider.createNewGuid(),
      void 0,
      !0,
    )),
      (this.fakeClientCredentialClient = new Dn({
        authOptions: { clientId: this.config.managedIdentityId.id, authority: this.fakeAuthority },
      })),
      (this.managedIdentityClient = new Rt(
        this.logger,
        wt.nodeStorage,
        this.networkClient,
        this.cryptoProvider,
        this.config.disableInternalRetries,
      )),
      (this.hashUtils = new kr()));
  }
  async acquireToken(e) {
    if (!e.resource) throw V(EMPTY_URL_ERROR);
    let t = {
      forceRefresh: e.forceRefresh,
      resource: e.resource.replace("/.default", ""),
      scopes: [e.resource.replace("/.default", "")],
      authority: this.fakeAuthority.canonicalAuthority,
      correlationId: this.cryptoProvider.createNewGuid(),
      claims: e.claims,
      clientCapabilities: this.config.clientCapabilities,
    };
    if (t.forceRefresh)
      return this.acquireTokenFromManagedIdentity(t, this.config.managedIdentityId, this.fakeAuthority);
    let [r, n] = await this.fakeClientCredentialClient.getCachedAuthenticationResult(
      t,
      this.config,
      this.cryptoProvider,
      this.fakeAuthority,
      wt.nodeStorage,
    );
    if (t.claims) {
      let managedIdentitySource = this.managedIdentityClient.getManagedIdentitySource();
      if (r && ZE.includes(managedIdentitySource)) {
        let str = this.hashUtils.sha256(r.accessToken).toString(me.HEX);
        t.revokedTokenSha256Hash = str;
      }
      return this.acquireTokenFromManagedIdentity(t, this.config.managedIdentityId, this.fakeAuthority);
    }
    if (r) {
      if (n === j.PROACTIVELY_REFRESHED) {
        this.logger.info(
          "ClientCredentialClient:getCachedAuthenticationResult - Cached access token's refreshOn property has been exceeded'. It's not expired, but must be refreshed.",
        );
        let o = !0;
        await this.acquireTokenFromManagedIdentity(t, this.config.managedIdentityId, this.fakeAuthority, o);
      }
      return r;
    } else return this.acquireTokenFromManagedIdentity(t, this.config.managedIdentityId, this.fakeAuthority);
  }
  async acquireTokenFromManagedIdentity(e, t, r, n) {
    return this.managedIdentityClient.sendManagedIdentityTokenRequest(e, t, r, n);
  }
  getManagedIdentitySource() {
    return Rt.sourceName || this.managedIdentityClient.getManagedIdentitySource();
  }
}

export {
  _o,
  NodeAuthError,
  Za,
  Me,
  w,
  k,
  ne,
  ae,
  UNABLE_TO_CREATE_AZURE_ARC,
  He,
  J,
  Ne,
  ce,
  WWW_AUTHENTICATE_HEADER_MISSING,
  os,
  PLATFORM_NOT_SUPPORTED,
  INVALID_FILE_EXTENSION,
  INVALID_FILE_PATH,
  UNABLE_TO_READ_SECRET_FILE,
  Ah,
  INVALID_SECRET,
  Ac,
  Ts,
  Cs,
  wt,
};
