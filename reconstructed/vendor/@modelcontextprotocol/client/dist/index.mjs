/**
 * @modelcontextprotocol/client/dist/index.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/client@2.0.0
 * pieces: chunk-1kaj6e83.js (1), chunk-1ny7cxrt.js (1), chunk-n1aavqzh.js (1), chunk-r1g76qsy.js (87)
 * attribution: esm-fingerprint 82, esm-layout 8
 */
import {
  Ie,
  bt,
  OAuthError,
  Sue,
  Yn,
  Xn,
  SdkError,
  Ti,
  Ge,
  la,
  ca,
  ro,
  Be,
  cn,
  ln,
  GAe,
  zAe,
  SdkHttpError,
  freeze_2,
  ki,
  wi,
  fZ,
  Ii,
  qi,
  ProtocolError,
  ma,
  oo,
  fn,
  Ri,
  Gt,
  pa,
  MBt,
  to,
  Rt,
  ha,
  lYn,
  qNr,
  Oi,
} from "./src-D_zzAWoS.mjs";
import {
  OBt,
  Br,
  Mt,
  M_t,
  PBt,
  strip,
  merge_4,
  IO_MODELCONTEXTPROTOCOL_SERVERINFO,
  extend_10,
  IO_MODELCONTEXTPROTOCOL_SUBSCRIPTIONID,
  Ur,
  IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION,
  TokenExchangeResponseSchema,
  TokenExchangeResponseSchema_2,
} from "../../core/dist/auth-CUe6YdwF.mjs";
import { hcn } from "../../../pkce-challenge/dist/index.node.js";
import { Udn } from "./ajvProvider-BIwGVY6G.mjs";
import { hZe } from "../../../eventsource/dist/index.js";
import { gcn } from "../../../eventsource-parser/dist/stream.esm.js";
import {
  defaultXaaFetch,
  TOKEN_EXCHANGE_GRANT,
  ID_JAG_TOKEN_TYPE,
  ID_TOKEN_TYPE,
  redactTokens,
  XaaTokenExchangeError,
  defaultXaaFetch_2,
  TOKEN_EXCHANGE_GRANT_2,
  ID_JAG_TOKEN_TYPE_2,
  ID_TOKEN_TYPE_2,
  redactTokens_2,
  XaaTokenExchangeError_2,
} from "../../../../src/services/mcp/xaa.js";
import { redactUrlSecrets } from "../../../../src/utils/urlRedaction.js";

//@ chunk-r1g76qsy.js:256668-256678 esm-layout
var ec = !1;
//@ chunk-r1g76qsy.js:256678-258898 esm-fingerprint
var no = class extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.OAuthClientFlowError" });
    }
    static [Symbol.hasInstance](e) {
      return Ie(this, e);
    }
    static isInstance(e) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return Ie(this, e);
    }
    constructor(e) {
      super(e);
      ((this.name = new.target.name), bt(this, new.target));
    }
  },
  D_t = class extends no {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.IssuerMismatchError" });
    }
    kind;
    expected;
    received;
    constructor(e, t, r) {
      super(
        `Issuer mismatch in ${e === "metadata" ? "authorization server metadata (RFC 8414 \xA73.3)" : "authorization response (RFC 9207)"}: expected ${JSON.stringify(t)}, received ${JSON.stringify(r)}`,
      );
      ((this.kind = e), (this.expected = t), (this.received = r));
    }
  },
  XNr = class extends no {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.RegistrationRejectedError" });
    }
    status;
    body;
    submittedMetadata;
    constructor(e) {
      super(`Dynamic Client Registration rejected (HTTP ${e.status}): ${e.body}`);
      ((this.status = e.status), (this.body = e.body), (this.submittedMetadata = e.submittedMetadata));
    }
  },
  fc = class extends no {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.InsecureTokenEndpointError" });
    }
    tokenEndpoint;
    constructor(e) {
      super(
        `Refusing to send credentials to non-https token endpoint '${e}'. OAuth token requests MUST use TLS (localhost / 127.0.0.1 / ::1 are exempt).`,
      );
      this.tokenEndpoint = e;
    }
  },
  bn = class extends no {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.AuthorizationServerMismatchError" });
    }
    constructor(e, t) {
      super(
        `Authorization server changed between redirect and callback (redirected to ${JSON.stringify(e)}, callback resolved ${JSON.stringify(t)}); refusing to send authorization_code/code_verifier to a different token endpoint`,
      );
      ((this.recordedIssuer = e), (this.currentIssuer = t));
    }
  },
  tc = class extends no {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.InsufficientScopeError" });
    }
    requiredScope;
    resourceMetadataUrl;
    errorDescription;
    constructor(e) {
      super(`Insufficient scope${e.requiredScope ? `: required "${e.requiredScope}"` : ""}`);
      ((this.requiredScope = e.requiredScope),
        (this.resourceMetadataUrl = e.resourceMetadataUrl),
        (this.errorDescription = e.errorDescription));
    }
  };
//@ chunk-r1g76qsy.js:258898-259270 esm-fingerprint
function rc(e, t, r) {
  if (e === void 0) return;
  if (e.issuer === void 0) {
    if (r?.canPersistStamp !== !1)
      console.warn(
        "[mcp-sdk] SEP-2352: stored OAuth credential has no 'issuer' stamp (pre-upgrade storage or provider not round-tripping the value). SEP-2352 isolation is inactive for this read; ensure your provider round-trips the issuer field.",
      );
    return e;
  }
  return Sc(e.issuer, t) ? e : void 0;
}
//@ chunk-r1g76qsy.js:259270-259372 esm-fingerprint
function Sc(e, t) {
  return e === t || (e.endsWith("/") && e.slice(0, -1) === t) || (t.endsWith("/") && t.slice(0, -1) === e);
}
//@ chunk-r1g76qsy.js:259372-259492 esm-fingerprint
function gc(e) {
  if (e == null) return !1;
  let t = e;
  return typeof t.tokens === "function" && typeof t.clientInformation === "function";
}
//@ chunk-r1g76qsy.js:259492-259689 esm-fingerprint
async function kd(e, t, r) {
  let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = Mze(t.response);
  if (
    (await DBt(e, {
      serverUrl: t.serverUrl,
      resourceMetadataUrl: resourceMetadataUrl,
      scope: scope,
      fetchFn: t.fetchFn,
      ...r,
    })) !== "AUTHORIZED"
  )
    throw new UnauthorizedError();
}
//@ chunk-r1g76qsy.js:259689-259797 esm-fingerprint
function _c(e, t) {
  return { token: async () => (await e.tokens())?.access_token, onUnauthorized: async (r) => kd(e, r, t) };
}
//@ chunk-r1g76qsy.js:259797-260252 esm-fingerprint
var UnauthorizedError = class extends Error {
  static {
    Object.defineProperty(this, "mcpBrand", { value: "mcp.UnauthorizedError" });
  }
  static [Symbol.hasInstance](e) {
    return Ie(this, e);
  }
  static isInstance(e) {
    if (typeof this !== "function")
      throw TypeError(
        "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
      );
    return Ie(this, e);
  }
  constructor(e) {
    super(e ?? "Unauthorized");
    ((this.name = "UnauthorizedError"), bt(this, new.target));
  }
};
//@ chunk-r1g76qsy.js:260252-260329 esm-fingerprint
function wa(e) {
  return e?.authorization_response_iss_parameter_supported === !0;
}
//@ chunk-r1g76qsy.js:260329-260541 esm-fingerprint
function $a({ iss: iss, expectedIssuer: expectedIssuer, issParameterSupported: issParameterSupported }) {
  if (expectedIssuer === void 0) return;
  if (iss === void 0) {
    if (issParameterSupported) throw new D_t("authorization_response", expectedIssuer, void 0);
    return;
  }
  if (iss !== expectedIssuer) throw new D_t("authorization_response", expectedIssuer, iss);
}
//@ chunk-r1g76qsy.js:260541-260686 esm-fingerprint
function Rn(...e) {
  let t = new Set();
  for (let r of e) {
    if (!r) continue;
    for (let s of r.split(/\s+/)) if (s) t.add(s);
  }
  return t.size > 0 ? [...t].join(" ") : void 0;
}
//@ chunk-r1g76qsy.js:260686-260832 esm-fingerprint
function qd(e, t) {
  if (!e) return !1;
  let r = new Set((t ?? "").split(/\s+/).filter(Boolean));
  for (let s of e.split(/\s+/)) if (s && !r.has(s)) return !0;
  return !1;
}
//@ chunk-r1g76qsy.js:260832-261464 esm-fingerprint
async function yc(e, t, r, s, a) {
  if (typeof e === "string") return { authorizationCode: e, iss: t };
  let n = e.get("iss") ?? void 0,
    i = e.get("code");
  if (i) return { authorizationCode: i, iss: n };
  let l = (await r.discoveryState?.())?.authorizationServerMetadata;
  if (!l)
    try {
      l = (await QNr(s, a)).authorizationServerMetadata;
    } catch {
      l = void 0;
    }
  if (!l) throw new UnauthorizedError("Authorization callback failed and the issuer could not be verified");
  $a({ iss: n, expectedIssuer: l.issuer, issParameterSupported: wa(l) });
  let c = e.get("error");
  if (c) throw new OAuthError(c, e.get("error_description") ?? c, e.get("error_uri") ?? void 0);
  throw new UnauthorizedError("Authorization callback contained neither `code` nor `error`");
}
//@ chunk-r1g76qsy.js:261464-261549 esm-fingerprint
function Id(e) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(e);
}
//@ chunk-r1g76qsy.js:261549-261573 esm-fingerprint
var CODE = "code",
  S256 = "S256";
//@ chunk-r1g76qsy.js:261573-262075 esm-fingerprint
function Od(e, t) {
  let r = e.client_secret !== void 0;
  if (
    "token_endpoint_auth_method" in e &&
    e.token_endpoint_auth_method &&
    Id(e.token_endpoint_auth_method) &&
    (t.length === 0 || t.includes(e.token_endpoint_auth_method))
  )
    return e.token_endpoint_auth_method;
  if (t.length === 0) return r ? "client_secret_basic" : "none";
  if (r && t.includes("client_secret_basic")) return "client_secret_basic";
  if (r && t.includes("client_secret_post")) return "client_secret_post";
  if (t.includes("none")) return "none";
  return r ? "client_secret_post" : "none";
}
//@ chunk-r1g76qsy.js:262075-262323 esm-fingerprint
function Nd(e, t, r, s) {
  let { client_id: client_id, client_secret: client_secret } = t;
  switch (e) {
    case "client_secret_basic":
      Md(client_id, client_secret, r);
      return;
    case "client_secret_post":
      jd(client_id, client_secret, s);
      return;
    case "none":
      Ad(client_id, s);
      return;
    default:
      throw Error(`Unsupported client authentication method: ${e}`);
  }
}
//@ chunk-r1g76qsy.js:262323-262483 esm-fingerprint
function Md(e, t, r) {
  if (!t) throw Error("client_secret_basic authentication requires a client_secret");
  let s = btoa(`${e}:${t}`);
  r.set("Authorization", `Basic ${s}`);
}
//@ chunk-r1g76qsy.js:262483-262553 esm-fingerprint
function jd(e, t, r) {
  if ((r.set("client_id", e), t)) r.set("client_secret", t);
}
//@ chunk-r1g76qsy.js:262553-262591 esm-fingerprint
function Ad(e, t) {
  t.set("client_id", e);
}
//@ chunk-r1g76qsy.js:262591-262670 esm-fingerprint
function vc(e) {
  return e === "localhost" || e === "127.0.0.1" || e === "[::1]" || e === "::1";
}
//@ chunk-r1g76qsy.js:262670-262782 esm-fingerprint
function Ld(e) {
  let t = new URL(String(e));
  if (t.protocol !== "https:" && !vc(t.hostname)) throw new fc(t.href);
  return t;
}
//@ chunk-r1g76qsy.js:262782-262962 esm-fingerprint
function Ud(e) {
  for (let t of e ?? []) {
    let r;
    try {
      r = new URL(t);
    } catch {
      continue;
    }
    if (r.protocol !== "http:" && r.protocol !== "https:") return "native";
    if (vc(r.hostname)) return "native";
  }
  return "web";
}
//@ chunk-r1g76qsy.js:262962-263168 esm-fingerprint
function Dd(e) {
  let clientMetadata = e.clientMetadata;
  return {
    ...clientMetadata,
    grant_types:
      clientMetadata.grant_types ??
      (e.redirectUrl === void 0 ? void 0 : ["authorization_code", "refresh_token"]),
    application_type: clientMetadata.application_type ?? Ud(clientMetadata.redirect_uris),
  };
}
//@ chunk-r1g76qsy.js:263168-263458 esm-fingerprint
async function oc(e) {
  let t = e instanceof Response ? e.status : void 0,
    r = e instanceof Response ? await e.text() : e;
  try {
    let parse = OBt.parse(JSON.parse(r));
    return OAuthError.fromResponse(parse);
  } catch (error) {
    let a = `${t ? `HTTP ${t}: ` : ""}Invalid OAuth error response: ${error}. Raw body: ${r}`;
    return new OAuthError(Sue.ServerError, a);
  }
}
//@ chunk-r1g76qsy.js:263458-263810 esm-fingerprint
async function DBt(e, t) {
  try {
    return await $n(e, t);
  } catch (error) {
    if (error instanceof OAuthError) {
      if (error.code === Sue.InvalidClient || error.code === Sue.UnauthorizedClient)
        return (
          await e.invalidateCredentials?.("client"),
          await e.invalidateCredentials?.("tokens"),
          await $n(e, t)
        );
      else if (error.code === Sue.InvalidGrant)
        return (await e.invalidateCredentials?.("tokens"), await $n(e, t));
    }
    throw error;
  }
}
//@ chunk-r1g76qsy.js:263810-264122 esm-fingerprint
function Vd(e) {
  let {
      requestedScope: requestedScope,
      resourceMetadata: resourceMetadata,
      authServerMetadata: authServerMetadata,
      clientMetadata: clientMetadata,
    } = e,
    n = requestedScope || resourceMetadata?.scopes_supported?.join(" ") || clientMetadata.scope;
  if (
    n &&
    authServerMetadata?.scopes_supported?.includes("offline_access") &&
    !n.split(" ").includes("offline_access") &&
    clientMetadata.grant_types?.includes("refresh_token")
  )
    n = `${n} offline_access`;
  return n;
}
//@ chunk-r1g76qsy.js:264122-267876 esm-fingerprint
async function $n(
  e,
  {
    serverUrl: serverUrl,
    authorizationCode: authorizationCode,
    iss: iss,
    scope: scope,
    resourceMetadataUrl: resourceMetadataUrl,
    fetchFn: fetchFn,
    skipIssuerMetadataValidation: skipIssuerMetadataValidation,
    forceReauthorization: forceReauthorization,
  },
) {
  let d = Dd(e),
    m = await e.discoveryState?.(),
    _,
    w,
    P,
    y,
    v = resourceMetadataUrl;
  if (!v && m?.resourceMetadataUrl) v = new URL(m.resourceMetadataUrl);
  if (m?.authorizationServerUrl) {
    if (
      ((w = m.authorizationServerUrl),
      (_ = m.resourceMetadata),
      (P =
        m.authorizationServerMetadata ??
        (await LBt(w, { fetchFn: fetchFn, skipIssuerValidation: skipIssuerMetadataValidation }))),
      !_)
    )
      try {
        _ = await JNr(serverUrl, { resourceMetadataUrl: v }, fetchFn);
      } catch (error) {
        if (error instanceof TypeError) throw error;
      }
    if (P !== m.authorizationServerMetadata || _ !== m.resourceMetadata)
      await e.saveDiscoveryState?.({
        authorizationServerUrl: String(w),
        resourceMetadataUrl: v?.toString(),
        resourceMetadata: _,
        authorizationServerMetadata: P,
      });
  } else {
    let N = await QNr(serverUrl, {
      resourceMetadataUrl: v,
      fetchFn: fetchFn,
      skipIssuerMetadataValidation: skipIssuerMetadataValidation,
    });
    ((w = N.authorizationServerUrl),
      (P = N.authorizationServerMetadata),
      (_ = N.resourceMetadata),
      (y = {
        authorizationServerUrl: String(w),
        resourceMetadataUrl: v?.toString(),
        resourceMetadata: _,
        authorizationServerMetadata: P,
      }));
  }
  let p = P?.issuer ?? String(w),
    h = { issuer: p };
  if ((await e.saveAuthorizationServerUrl?.(p), authorizationCode !== void 0)) {
    let N = m?.authorizationServerMetadata?.issuer ?? m?.authorizationServerUrl;
    if (N === void 0) {
      if (e.saveDiscoveryState !== void 0)
        throw new bn(
          "discoveryState was not available on the callback leg; ensure your provider persists discoveryState alongside codeVerifier",
          p,
        );
      console.warn(
        "[mcp-sdk] OAuthClientProvider does not implement saveDiscoveryState()/discoveryState(); the SEP-2352 callback-leg authorization-server binding cannot be checked. Implement discoveryState (persist alongside codeVerifier) \u2014 see docs/migration/upgrade-to-v2.md \xA7SEP-2352.",
      );
    } else if (!Sc(N, p)) throw new bn(N, p);
  }
  if (y) await e.saveDiscoveryState?.(y);
  let S = await Fd(serverUrl, e, _);
  if (S) await e.saveResourceUrl?.(String(S));
  let f = Vd({
      requestedScope: scope,
      resourceMetadata: _,
      authServerMetadata: P,
      clientMetadata: e.clientMetadata,
    }),
    resolved = await Promise.resolve(e.clientInformation(h)),
    C = rc(resolved, p, { canPersistStamp: e.saveClientInformation !== void 0 });
  if (C === void 0 && resolved?.issuer && e.saveClientInformation === void 0)
    throw new bn(resolved.issuer, p);
  if (C && C.issuer === void 0) ((C = { ...C, issuer: p }), await e.saveClientInformation?.(C, h));
  if (!C) {
    if (authorizationCode !== void 0)
      throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let N = P?.client_id_metadata_document_supported === !0,
      clientMetadataUrl = e.clientMetadataUrl;
    if (clientMetadataUrl && !xd(clientMetadataUrl))
      throw new OAuthError(
        Sue.InvalidClientMetadata,
        `clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`,
      );
    if (N && clientMetadataUrl)
      ((C = { client_id: clientMetadataUrl, issuer: p }), await e.saveClientInformation?.(C, h));
    else {
      if (!e.saveClientInformation)
        throw Error("OAuth client information must be saveable for dynamic registration");
      ((C = { ...(await Wd(w, { metadata: P, clientMetadata: d, scope: f, fetchFn: fetchFn })), issuer: p }),
        await e.saveClientInformation(C, h));
    }
  }
  let b = !e.redirectUrl;
  if (authorizationCode !== void 0 || b) {
    if (authorizationCode !== void 0)
      $a({ iss: iss, expectedIssuer: P?.issuer, issParameterSupported: wa(P) });
    let N = await Bd(e, w, {
      metadata: P,
      resource: S,
      authorizationCode: authorizationCode,
      iss: iss,
      scope: f,
      fetchFn: fetchFn,
    });
    return (await e.saveTokens({ ...N, issuer: p }, h), "AUTHORIZED");
  }
  let g = rc(await e.tokens(h), p);
  if (g && g.issuer === void 0) ((g = { ...g, issuer: p }), await e.saveTokens(g, h));
  if (g?.refresh_token && !forceReauthorization)
    try {
      let N = await dLo(w, {
        metadata: P,
        clientInformation: C,
        refreshToken: g.refresh_token,
        resource: S,
        addClientAuthentication: e.addClientAuthentication,
        fetchFn: fetchFn,
      });
      return (await e.saveTokens({ ...N, issuer: p }, h), "AUTHORIZED");
    } catch (error) {
      if (error instanceof fc) throw error;
      if (!(error instanceof OAuthError) || error.code === Sue.ServerError);
      else throw error;
    }
  let k = e.state ? await e.state() : void 0,
    { authorizationUrl: authorizationUrl, codeVerifier: codeVerifier } = await lLo(w, {
      metadata: P,
      clientInformation: C,
      state: k,
      redirectUrl: e.redirectUrl,
      scope: f,
      resource: S,
    });
  return (
    await e.saveCodeVerifier(codeVerifier),
    await e.redirectToAuthorization(authorizationUrl),
    "REDIRECT"
  );
}
//@ chunk-r1g76qsy.js:267876-267990 esm-fingerprint
function xd(e) {
  if (!e) return !1;
  try {
    let t = new URL(e);
    return t.protocol === "https:" && t.pathname !== "/";
  } catch {
    return !1;
  }
}
//@ chunk-r1g76qsy.js:267990-268291 esm-fingerprint
async function Fd(e, t, r) {
  let s = Yn(e);
  if (t.validateResourceURL) return await t.validateResourceURL(s, r?.resource);
  if (!r) return;
  if (!Xn({ requestedResource: s, configuredResource: r.resource }))
    throw Error(`Protected resource ${r.resource} does not match expected ${s} (or origin)`);
  return new URL(r.resource);
}
//@ chunk-r1g76qsy.js:268291-268652 esm-fingerprint
function Mze(e) {
  let t = e.headers.get("WWW-Authenticate");
  if (!t) return {};
  let [r, s] = t.split(" ");
  if (r?.toLowerCase() !== "bearer" || !s) return {};
  let a = ba(e, "resource_metadata") || void 0,
    n;
  if (a)
    try {
      n = new URL(a);
    } catch {}
  let i = ba(e, "scope") || void 0,
    l = ba(e, "error") || void 0,
    c = ba(e, "error_description") || void 0;
  return { resourceMetadataUrl: n, scope: i, error: l, errorDescription: c };
}
//@ chunk-r1g76qsy.js:268652-268848 esm-fingerprint
function ba(e, t) {
  let r = e.headers.get("WWW-Authenticate");
  if (!r) return null;
  let regExp = new RegExp(String.raw`${t}=(?:"([^"]+)"|([^\s,]+))`),
    match = r.match(regExp);
  if (match) {
    let n = match[1] || match[2];
    if (n) return n;
  }
  return null;
}
//@ chunk-r1g76qsy.js:268848-269307 esm-fingerprint
async function JNr(e, t, r = fetch) {
  let s = await Jd(e, "oauth-protected-resource", r, {
    protocolVersion: t?.protocolVersion,
    metadataUrl: t?.resourceMetadataUrl,
  });
  if (!s || s.status === 404)
    throw (
      await s?.text?.().catch(() => {}),
      Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.")
    );
  if (!s.ok)
    throw (
      await s.text?.().catch(() => {}),
      Error(`HTTP ${s.status} trying to load well-known OAuth protected resource metadata.`)
    );
  return Br.parse(await s.json());
}
//@ chunk-r1g76qsy.js:269307-269514 esm-layout
async function bc(e, t, r = fetch) {
  try {
    return await r(e, { headers: t });
  } catch (error) {
    if (!(error instanceof TypeError) || !ec) throw error;
    if (t)
      try {
        return await r(e, {});
      } catch (error) {
        if (!(error instanceof TypeError)) throw error;
        return;
      }
    return;
  }
}
//@ chunk-r1g76qsy.js:269514-269647 esm-fingerprint
function Hd(e, t = "", r = {}) {
  if (t.endsWith("/")) t = t.slice(0, -1);
  return r.prependPathname ? `${t}/.well-known/${e}` : `/.well-known/${e}${t}`;
}
//@ chunk-r1g76qsy.js:269647-269726 esm-fingerprint
async function sc(e, t, r = fetch) {
  return await bc(e, { "MCP-Protocol-Version": t }, r);
}
//@ chunk-r1g76qsy.js:269726-269829 esm-layout
function Kd(e, t) {
  if (!e) return !0;
  if (t === "/") return !1;
  return (e.status >= 400 && e.status < 500) || e.status === 502;
}
//@ chunk-r1g76qsy.js:269829-270141 esm-fingerprint
async function Jd(e, t, r, s) {
  let a = new URL(e),
    n = s?.protocolVersion ?? Mt,
    i;
  if (s?.metadataUrl) i = new URL(s.metadataUrl);
  else {
    let c = Hd(t, a.pathname);
    ((i = new URL(c, s?.metadataServerUrl ?? a)), (i.search = a.search));
  }
  let l = await sc(i, n, r);
  if (!s?.metadataUrl && Kd(l, a.pathname)) l = await sc(new URL(`/.well-known/${t}`, a), n, r);
  return l;
}
//@ chunk-r1g76qsy.js:270141-270697 esm-fingerprint
function Gd(e) {
  let t = typeof e === "string" ? new URL(e) : e,
    r = t.pathname !== "/",
    s = [];
  if (!r)
    return (
      s.push(
        { url: new URL("/.well-known/oauth-authorization-server", t.origin), type: "oauth" },
        { url: new URL("/.well-known/openid-configuration", t.origin), type: "oidc" },
      ),
      s
    );
  let pathname = t.pathname;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return (
    s.push(
      { url: new URL(`/.well-known/oauth-authorization-server${pathname}`, t.origin), type: "oauth" },
      { url: new URL(`/.well-known/openid-configuration${pathname}`, t.origin), type: "oidc" },
      { url: new URL(`${pathname}/.well-known/openid-configuration`, t.origin), type: "oidc" },
    ),
    s
  );
}
//@ chunk-r1g76qsy.js:270697-271343 esm-fingerprint
async function LBt(e, { fetchFn: t = fetch, protocolVersion: r = Mt, skipIssuerValidation: s = !1 } = {}) {
  let a = { "MCP-Protocol-Version": r, Accept: "application/json" },
    n = Gd(e);
  for (let { url: url, type: l } of n) {
    let c = await bc(url, a, t);
    if (!c) continue;
    if (!c.ok) {
      if ((await c.text?.().catch(() => {}), (c.status >= 400 && c.status < 500) || c.status === 502))
        continue;
      throw Error(
        `HTTP ${c.status} trying to load ${l === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${url}`,
      );
    }
    let d = l === "oauth" ? M_t.parse(await c.json()) : PBt.parse(await c.json());
    if (!s) {
      let m = typeof e === "string" ? e : e.href;
      if (!(d.issuer === m || (m.endsWith("/") && d.issuer === m.slice(0, -1))))
        throw new D_t("metadata", m, d.issuer);
    }
    return d;
  }
}
//@ chunk-r1g76qsy.js:271343-271789 esm-fingerprint
async function QNr(e, t) {
  let r, s;
  try {
    if (
      ((r = await JNr(e, { resourceMetadataUrl: t?.resourceMetadataUrl }, t?.fetchFn)),
      r.authorization_servers && r.authorization_servers.length > 0)
    )
      s = r.authorization_servers[0];
  } catch (error) {
    if (error instanceof TypeError) throw error;
  }
  if (!s) s = String(new URL("/", e));
  let a = await LBt(s, { fetchFn: t?.fetchFn, skipIssuerValidation: t?.skipIssuerMetadataValidation });
  return { authorizationServerUrl: s, authorizationServerMetadata: a, resourceMetadata: r };
}
//@ chunk-r1g76qsy.js:271789-272770 esm-fingerprint
async function lLo(
  e,
  {
    metadata: metadata,
    clientInformation: clientInformation,
    redirectUrl: redirectUrl,
    scope: scope,
    state: state,
    resource: resource,
  },
) {
  let l;
  if (metadata) {
    if (((l = new URL(metadata.authorization_endpoint)), !metadata.response_types_supported.includes(CODE)))
      throw Error(`Incompatible auth server: does not support response type ${CODE}`);
    if (
      metadata.code_challenge_methods_supported &&
      !metadata.code_challenge_methods_supported.includes(S256)
    )
      throw Error(`Incompatible auth server: does not support code challenge method ${S256}`);
  } else l = new URL("/authorize", e);
  let c = await hcn(),
    { code_verifier: code_verifier, code_challenge: code_challenge } = c;
  if (
    (l.searchParams.set("response_type", CODE),
    l.searchParams.set("client_id", clientInformation.client_id),
    l.searchParams.set("code_challenge", code_challenge),
    l.searchParams.set("code_challenge_method", S256),
    l.searchParams.set("redirect_uri", String(redirectUrl)),
    state)
  )
    l.searchParams.set("state", state);
  if (scope) l.searchParams.set("scope", scope);
  if (scope?.split(" ").includes("offline_access")) l.searchParams.append("prompt", "consent");
  if (resource) l.searchParams.set("resource", resource.href);
  return { authorizationUrl: l, codeVerifier: code_verifier };
}
//@ chunk-r1g76qsy.js:272770-272897 esm-fingerprint
function Rc(e, t, r) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: e,
    code_verifier: t,
    redirect_uri: String(r),
  });
}
//@ chunk-r1g76qsy.js:272897-273513 esm-fingerprint
async function Cn(
  e,
  {
    metadata: metadata,
    tokenRequestParams: tokenRequestParams,
    clientInformation: clientInformation,
    addClientAuthentication: addClientAuthentication,
    resource: resource,
    fetchFn: fetchFn,
  },
) {
  let l = Ld(metadata?.token_endpoint ?? new URL("/token", e)),
    headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    });
  if (resource) tokenRequestParams.set("resource", resource.href);
  if (addClientAuthentication) await addClientAuthentication(headers, tokenRequestParams, l, metadata);
  else if (clientInformation)
    Nd(
      Od(clientInformation, metadata?.token_endpoint_auth_methods_supported ?? []),
      clientInformation,
      headers,
      tokenRequestParams,
    );
  let d = await (fetchFn ?? fetch)(l, { method: "POST", headers: headers, body: tokenRequestParams });
  if (!d.ok) throw await oc(d);
  let body = await d.json();
  try {
    return strip.parse(body);
  } catch (error) {
    if (typeof body === "object" && body !== null && "error" in body) throw await oc(JSON.stringify(body));
    throw error;
  }
}
//@ chunk-r1g76qsy.js:273513-273857 esm-fingerprint
async function fzs(
  e,
  {
    metadata: metadata,
    clientInformation: clientInformation,
    authorizationCode: authorizationCode,
    iss: iss,
    codeVerifier: codeVerifier,
    redirectUri: redirectUri,
    resource: resource,
    addClientAuthentication: addClientAuthentication,
    fetchFn: fetchFn,
  },
) {
  return (
    $a({ iss: iss, expectedIssuer: metadata?.issuer, issParameterSupported: wa(metadata) }),
    Cn(e, {
      metadata: metadata,
      tokenRequestParams: Rc(authorizationCode, codeVerifier, redirectUri),
      clientInformation: clientInformation,
      addClientAuthentication: addClientAuthentication,
      resource: resource,
      fetchFn: fetchFn,
    })
  );
}
//@ chunk-r1g76qsy.js:273857-274178 esm-fingerprint
async function dLo(
  e,
  {
    metadata: metadata,
    clientInformation: clientInformation,
    refreshToken: refreshToken,
    resource: resource,
    addClientAuthentication: addClientAuthentication,
    fetchFn: fetchFn,
  },
) {
  return {
    refresh_token: refreshToken,
    ...(await Cn(e, {
      metadata: metadata,
      tokenRequestParams: new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
      clientInformation: clientInformation,
      addClientAuthentication: addClientAuthentication,
      resource: resource,
      fetchFn: fetchFn,
    })),
  };
}
//@ chunk-r1g76qsy.js:274178-274881 esm-fingerprint
async function Bd(
  e,
  t,
  { metadata: r, resource: s, authorizationCode: a, iss: n, scope: i, fetchFn: l } = {},
) {
  if (a !== void 0) $a({ iss: n, expectedIssuer: r?.issuer, issParameterSupported: wa(r) });
  let c = i ?? e.clientMetadata.scope,
    d;
  if (e.prepareTokenRequest) d = await e.prepareTokenRequest(c);
  if (!d) {
    if (!a) throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!e.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    d = Rc(a, await e.codeVerifier(), e.redirectUrl);
  }
  let clientInformation = await e.clientInformation({ issuer: r?.issuer ?? String(t) });
  return Cn(t, {
    metadata: r,
    tokenRequestParams: d,
    clientInformation: clientInformation ?? void 0,
    addClientAuthentication: e.addClientAuthentication,
    resource: s,
    fetchFn: l,
  });
}
//@ chunk-r1g76qsy.js:274881-275399 esm-fingerprint
async function Wd(e, { metadata: metadata, clientMetadata: clientMetadata, scope: scope, fetchFn: fetchFn }) {
  let n;
  if (metadata) {
    if (!metadata.registration_endpoint)
      throw Error("Incompatible auth server: does not support dynamic client registration");
    n = new URL(metadata.registration_endpoint);
  } else n = new URL("/register", e);
  let i = { ...clientMetadata, ...(scope === void 0 ? {} : { scope: scope }) },
    l = await (fetchFn ?? fetch)(n, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(i),
    });
  if (!l.ok) throw new XNr({ status: l.status, body: await l.text(), submittedMetadata: i });
  return merge_4.parse(await l.json());
}
/**
 * McpResponseCache：MCP SDK 响应缓存，键为 method\0JSON([partition,params])；列表类方法与 server/discover 不计入上限（默认 512），其他方法超限时淘汰最早一条。归属疑为 SDK（见 lead 建议）。
 */
//@ chunk-r1g76qsy.js:275399-276316 esm-fingerprint
var UNCAPPED_CACHE_METHODS = new Set([
    "tools/list",
    "prompts/list",
    "resources/list",
    "resources/templates/list",
    "server/discover",
  ]),
  McpResponseCache = class {
    _entries = new Map();
    _maxEntries;
    _stamp = 0;
    _cappedSize = 0;
    constructor(e) {
      this._maxEntries = e?.maxEntries ?? 512;
    }
    get size() {
      return this._entries.size;
    }
    get(e) {
      return this._entries.get(responseCacheKey(e));
    }
    set(e, t) {
      let r = responseCacheKey(e),
        s = UNCAPPED_CACHE_METHODS.has(e.method),
        a = !this._entries.has(r);
      if (!s && a && this._maxEntries > 0 && this._cappedSize >= this._maxEntries) {
        for (let i of this._entries.keys())
          if (!UNCAPPED_CACHE_METHODS.has(i.slice(0, i.indexOf("\x00")))) {
            (this._entries.delete(i), this._cappedSize--);
            break;
          }
      }
      let n = ++this._stamp;
      if ((this._entries.set(r, { ...t, stamp: n }), a && !s)) this._cappedSize++;
      return n;
    }
    delete(e) {
      if (this._entries.delete(responseCacheKey(e)) && !UNCAPPED_CACHE_METHODS.has(e.method))
        this._cappedSize--;
    }
    evict(e) {
      let t = `${e}\x00`,
        r = UNCAPPED_CACHE_METHODS.has(e);
      for (let s of this._entries.keys())
        if (s.startsWith(t)) {
          if ((this._entries.delete(s), !r)) this._cappedSize--;
        }
    }
    clear() {
      (this._entries.clear(), (this._cappedSize = 0));
    }
  };
/**
 * responseCacheKey：缓存键 = method + \0 + JSON([partition, params])。
 */
//@ chunk-r1g76qsy.js:276316-276404 esm-fingerprint
function responseCacheKey(e) {
  return `${e.method}\x00${JSON.stringify([e.partition ?? "", e.params ?? ""])}`;
}
//@ chunk-r1g76qsy.js:276404-276456 esm-layout
function Pn(e, t) {
  return t === void 0 ? e : `${e}\x00${t}`;
}
//@ chunk-r1g76qsy.js:276456-279996 esm-fingerprint
var Zd = 86400000,
  Qd = class {
    _evictionGeneration = new Map();
    _toolIndex;
    _toolOutputValidatorIndex;
    _serverIdentity = "";
    constructor(e, t, r = () => {}, s = "", a = Date.now) {
      ((this._store = e),
        (this._isUserSupplied = t),
        (this._reportError = r),
        (this._cachePartition = s),
        (this._now = a));
    }
    now() {
      return this._now();
    }
    setServerIdentity(e) {
      this._serverIdentity = e;
    }
    _partitionFor(e) {
      return JSON.stringify([this._serverIdentity, e === "public" ? "" : this._cachePartition]);
    }
    async _probe(e, t) {
      let r = { method: e, params: t ?? "" },
        _partitionFor = this._partitionFor("private"),
        a = await this._store.get({ ...r, partition: _partitionFor });
      if (a !== void 0) return a;
      let _partitionFor_2 = this._partitionFor("public");
      if (_partitionFor_2 === _partitionFor) return;
      let i = await this._store.get({ ...r, partition: _partitionFor_2 });
      return i?.scope === "public" ? i : void 0;
    }
    async evict(e) {
      (this._evictionGeneration.set(e, (this._evictionGeneration.get(e) ?? 0) + 1),
        await this._deleteBoth(e, ""));
    }
    async _deleteBoth(e, t) {
      let _partitionFor = this._partitionFor("private"),
        _partitionFor_2 = this._partitionFor("public");
      try {
        await this._store.delete({ method: e, params: t, partition: _partitionFor });
      } catch (error) {
        this._reportError(error);
      }
      if (_partitionFor_2 !== _partitionFor)
        try {
          await this._store.delete({ method: e, params: t, partition: _partitionFor_2 });
        } catch (error) {
          this._reportError(error);
        }
    }
    async evictKey(e, t) {
      let r = Pn(e, t),
        s = this._evictionGeneration.get(r);
      if (s !== void 0) this._evictionGeneration.set(r, s + 1);
      await this._deleteBoth(e, t);
    }
    captureGeneration(e, t) {
      let r = Pn(e, t),
        s = this._evictionGeneration.get(r) ?? 0;
      return (this._evictionGeneration.set(r, s), s);
    }
    async write(e, t, r, s) {
      if ((this._evictionGeneration.get(Pn(e, s?.params)) ?? 0) !== r) return;
      let a = s?.params ?? "",
        _partitionFor = this._partitionFor("private"),
        _partitionFor_2 = this._partitionFor("public"),
        l = (s?.scope ?? "private") === "public" ? _partitionFor_2 : _partitionFor;
      try {
        await this._store.set(
          { method: e, params: a, partition: l },
          { value: eh(t), expiresAt: s?.expiresAt, scope: s?.scope },
        );
      } catch (error) {
        this._reportError(error);
      }
      if (_partitionFor_2 !== _partitionFor)
        try {
          await this._store.delete({
            method: e,
            params: a,
            partition: l === _partitionFor ? _partitionFor_2 : _partitionFor,
          });
        } catch (error) {
          this._reportError(error);
        }
    }
    async read(e, t) {
      let _probe = await this._probe(e, t);
      if (_probe?.expiresAt === void 0 || !(_probe.expiresAt > this.now())) return;
      try {
        let parsed = JSON.parse(_probe.value);
        if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed))
          throw TypeError("cached document is not an object");
        return { value: parsed };
      } catch (error) {
        (this._reportError(error), await this._deleteBoth(e, t ?? ""));
        return;
      }
    }
    resetForReconnect() {
      if (!this._isUserSupplied) this._store.clear();
      (this._evictionGeneration.clear(),
        (this._toolIndex = void 0),
        (this._toolOutputValidatorIndex = void 0),
        (this._serverIdentity = ""));
    }
    async toolDefinition(e) {
      let _probe = await this._probe("tools/list");
      if (_probe === void 0) {
        this._toolIndex = void 0;
        return;
      }
      if (this._toolIndex?.stamp !== _probe.stamp) {
        let _decodeListTools = this._decodeListTools(_probe),
          s = new Map();
        if (_decodeListTools !== void 0) for (let tool of _decodeListTools.tools) s.set(tool.name, tool);
        this._toolIndex = { stamp: _probe.stamp, byName: s };
      }
      return this._toolIndex.byName.get(e);
    }
    async outputValidator(e, t) {
      let _probe = await this._probe("tools/list");
      if (_probe === void 0) {
        this._toolOutputValidatorIndex = void 0;
        return;
      }
      let _toolOutputValidatorIndex = this._toolOutputValidatorIndex,
        a;
      if (_toolOutputValidatorIndex?.stamp !== _probe.stamp) {
        ((a = this._decodeListTools(_probe)),
          (_toolOutputValidatorIndex = {
            stamp: _probe.stamp,
            byName: new Map(),
            pending: new Set(),
            whole: String(_probe.value).includes('"$id"'),
          }));
        for (let n of a?.tools ?? []) if (n.outputSchema) _toolOutputValidatorIndex.pending.add(n.name);
      }
      if (
        _toolOutputValidatorIndex.whole
          ? _toolOutputValidatorIndex.pending.size > 0
          : _toolOutputValidatorIndex.pending.has(e)
      ) {
        a ??= this._decodeListTools(_probe);
        for (let n of a?.tools ?? [])
          if (_toolOutputValidatorIndex.whole || n.name === e) {
            let i = t(n);
            if (i !== void 0) _toolOutputValidatorIndex.byName.set(n.name, i);
          }
        if (_toolOutputValidatorIndex.whole) _toolOutputValidatorIndex.pending.clear();
        else _toolOutputValidatorIndex.pending.delete(e);
      }
      return (
        (this._toolOutputValidatorIndex = _toolOutputValidatorIndex),
        _toolOutputValidatorIndex.byName.get(e)
      );
    }
    _decodeListTools(e) {
      try {
        let parsed = JSON.parse(e.value);
        if (
          !Array.isArray(parsed?.tools) ||
          !parsed.tools.every((tool) => tool !== null && typeof tool === "object")
        )
          throw TypeError("cached tools/list document has a malformed tools array");
        return parsed;
      } catch (error) {
        this._reportError(error);
        return;
      }
    }
  };
//@ chunk-r1g76qsy.js:279996-280268 esm-fingerprint
function eh(e) {
  let t;
  try {
    t = JSON.stringify(e);
  } catch (error) {
    throw TypeError(
      `cache value is not JSON-serializable: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  if (typeof t !== "string")
    throw TypeError("cache value is not JSON-serializable: it has no JSON representation");
  return t;
}
//@ chunk-r1g76qsy.js:280268-280317 esm-fingerprint
var th = -32022,
  rh = new Set([-32001, -32020, -32021]);
//@ chunk-r1g76qsy.js:280317-280959 esm-fingerprint
function oh(e, t) {
  switch (e.kind) {
    case "result":
      return sh(e.result, t);
    case "rpc-error":
      return zc(e, t);
    case "http-error":
      return ah(e, t);
    case "network-error":
      return ac(e.error, t);
    case "auth-required":
      return { kind: "error", error: e.error };
    case "closed":
      if (t.transportKind === "stdio") return { kind: "legacy" };
      return ac(Error("Connection closed during the version negotiation probe"), t);
    case "timeout":
      if (t.transportKind === "stdio") return { kind: "legacy" };
      return {
        kind: "error",
        error: new SdkError(Ti.RequestTimeout, `Version negotiation probe timed out after ${e.timeoutMs}ms`, {
          timeout: e.timeoutMs,
        }),
      };
    case "id-mismatch":
    case "malformed":
    case "stream-end":
      return { kind: "legacy" };
  }
}
//@ chunk-r1g76qsy.js:280959-281329 esm-fingerprint
function sh(e, t) {
  let validateResult = Ge(la).validateResult("server/discover", e);
  if (!validateResult.ok) return { kind: "legacy" };
  let supportedVersions = validateResult.value.supportedVersions,
    found = t.clientModernVersions.find((clientModernVersion) =>
      supportedVersions.includes(clientModernVersion),
    );
  if (found !== void 0) return { kind: "modern", version: found, discover: validateResult.value };
  if (t.fallbackAvailable) return { kind: "legacy" };
  return {
    kind: "error",
    error: new ca({ supported: [...supportedVersions], requested: t.requestedVersion }),
  };
}
//@ chunk-r1g76qsy.js:281329-281784 esm-fingerprint
function zc(e, t) {
  let { code: code, message: message, data: a } = e;
  if (code === th) {
    let n = wc(a);
    if (n === void 0) return { kind: "legacy" };
    let i = new ca({ supported: n, requested: ch(a) ?? t.requestedVersion }, message),
      l = ro(n),
      found = t.clientModernVersions.find((clientModernVersion) => l.includes(clientModernVersion));
    if (found !== void 0) return { kind: "corrective", version: found, error: i };
    if (l.length > 0) return { kind: "error", error: i };
    return t.fallbackAvailable ? { kind: "legacy" } : { kind: "error", error: i };
  }
  if (rh.has(code)) return { kind: "legacy" };
  return { kind: "legacy" };
}
//@ chunk-r1g76qsy.js:281784-281869 esm-layout
function ah(e, t) {
  let r = lh(e.body);
  if (r !== void 0) return zc(r, t);
  return { kind: "legacy" };
}
//@ chunk-r1g76qsy.js:281869-282058 esm-fingerprint
function ac(e, t) {
  if (t.environment === "browser" && nh(e)) return { kind: "legacy" };
  return {
    kind: "error",
    error: new SdkError(Ti.EraNegotiationFailed, `Version negotiation probe failed: ${ih(e)}`, { cause: e }),
  };
}
//@ chunk-r1g76qsy.js:282058-282145 esm-fingerprint
function nh(e) {
  return e instanceof TypeError || (e instanceof Error && e.name === "TypeError");
}
//@ chunk-r1g76qsy.js:282145-282206 esm-layout
function ih(e) {
  return e instanceof Error ? e.message : String(e);
}
//@ chunk-r1g76qsy.js:282206-282366 esm-fingerprint
function wc(e) {
  if (typeof e !== "object" || e === null) return;
  let supported = e.supported;
  if (!Array.isArray(supported) || supported.length === 0 || !supported.every((r) => typeof r === "string"))
    return;
  return supported;
}
//@ chunk-r1g76qsy.js:282366-282475 esm-fingerprint
function ch(e) {
  if (typeof e !== "object" || e === null) return;
  let requested = e.requested;
  return typeof requested === "string" ? requested : void 0;
}
//@ chunk-r1g76qsy.js:282475-282768 esm-fingerprint
function lh(e) {
  if (e === void 0 || e === "") return;
  let t;
  try {
    t = JSON.parse(e);
  } catch {
    return;
  }
  if (typeof t !== "object" || t === null) return;
  let error = t.error;
  if (typeof error !== "object" || error === null) return;
  let { code: code, message: message, data: n } = error;
  if (typeof code !== "number") return;
  return { code: code, message: typeof message === "string" ? message : "", data: n };
}
//@ chunk-r1g76qsy.js:282768-282784 esm-fingerprint
var LEGACY = "legacy";
//@ chunk-r1g76qsy.js:282784-283281 esm-fingerprint
function dh(e, t) {
  let r = e?.mode ?? LEGACY;
  if (r === "legacy") return { kind: "legacy" };
  let s = e?.probe ?? {};
  if (typeof r === "object") {
    if (!Be(r.pin))
      throw TypeError(
        `versionNegotiation: { pin: '${r.pin}' } is not a modern protocol revision \u2014 pinning is for 2026-07-28 and later; omit versionNegotiation (or use mode: 'legacy') for 2025-era servers.`,
      );
    return { kind: "pin", version: r.pin, probe: s };
  }
  let a = t ? ro(t) : [];
  return {
    kind: "auto",
    modernVersions: a.length > 0 ? a : [...cn],
    fallbackAvailable: t ? ln(t).length > 0 : !0,
    probe: s,
  };
}
//@ chunk-r1g76qsy.js:283281-283375 esm-fingerprint
function nc() {
  let e = globalThis;
  return e.window !== void 0 && e.document !== void 0 ? "browser" : "node";
}
//@ chunk-r1g76qsy.js:283375-283435 esm-fingerprint
function ic(e) {
  return "stderr" in e && "pid" in e ? "stdio" : "http";
}
//@ chunk-r1g76qsy.js:283435-286144 esm-fingerprint
var hh = class e {
    _pending;
    _probeCounter = 0;
    _transportKind;
    _issuedIds = new Set();
    _errorSinceSend;
    _savedOnMessage;
    _savedOnError;
    _savedOnClose;
    _closeDelivered = !1;
    constructor(t) {
      ((this._transport = t),
        (this._savedOnMessage = t.onmessage),
        (this._savedOnError = t.onerror),
        (this._savedOnClose = t.onclose));
    }
    static async open(t, r) {
      let s = new e(t);
      ((s._transportKind = r),
        (t.onmessage = (a) => {
          let _pending = s._pending;
          if (_pending !== void 0 && (GAe(a) || zAe(a)) && a.id === _pending.id) {
            if (((s._pending = void 0), GAe(a))) _pending.resolve({ kind: "response", result: a.result });
            else _pending.resolve({ kind: "response", error: a.error });
            return;
          }
          if (
            _pending !== void 0 &&
            s._transportKind === "http" &&
            (GAe(a) || zAe(a)) &&
            !s._issuedIds.has(a.id)
          ) {
            s._pending = void 0;
            let i = cc(JSON.stringify(a.id)),
              l = Error(
                `server/discover probe reply did not echo the request id (expected ${JSON.stringify(_pending.id)}, got ${i}) \u2014 treating the server as pre-2026-07-28`,
              );
            ((l.name = "McpProbeIdMismatchError"),
              s._savedOnError?.(l),
              _pending.resolve({ kind: "id-mismatch" }));
            return;
          }
        }),
        (t.onerror = (a) => {
          if (s._pending !== void 0 && s._errorSinceSend === void 0) s._errorSinceSend = a;
          let _pending = s._pending;
          if (_pending !== void 0 && s._transportKind === "http" && lc(a))
            setTimeout(() => {
              if (s._pending !== _pending) return;
              s._pending = void 0;
              let i = Error(
                `server/discover probe reply failed JSON-RPC message decoding (${cc(a instanceof Error ? a.message : String(a))}) \u2014 treating the server as pre-2026-07-28`,
              );
              ((i.name = "McpProbeMalformedReplyError"),
                s._savedOnError?.(i),
                _pending.resolve({ kind: "malformed" }));
            }, 0);
          s._savedOnError?.(a);
        }),
        (t.onclose = () => {
          let _pending = s._pending;
          if (_pending !== void 0) ((s._pending = void 0), _pending.resolve({ kind: "closed" }));
          ((s._closeDelivered = !0), s._savedOnClose?.());
        }));
      try {
        await t.start();
      } catch (error) {
        throw (s.detach(), error);
      }
      return s;
    }
    async exchange(t, r) {
      let s = `server-discover-probe-${++this._probeCounter}`;
      return (
        this._issuedIds.add(s),
        (this._errorSinceSend = void 0),
        new Promise((a) => {
          let n = !1,
            i = (c) => {
              if (n) return;
              if (((n = !0), clearTimeout(l), this._pending?.id === s)) this._pending = void 0;
              a(c);
            },
            l = setTimeout(() => i({ kind: "timeout" }), r);
          ((this._pending = { id: s, resolve: i }),
            this._transport
              .send(t(s), {
                onRequestStreamEnd: () => {
                  setTimeout(() => {
                    let _errorSinceSend = this._errorSinceSend;
                    if (_errorSinceSend !== void 0 && !lc(_errorSinceSend)) {
                      i({
                        kind: "send-error",
                        error:
                          _errorSinceSend instanceof Error ? _errorSinceSend : Error(String(_errorSinceSend)),
                      });
                      return;
                    }
                    i({ kind: "stream-end" });
                  }, 0);
                },
              })
              .catch((c) => i({ kind: "send-error", error: c })));
        })
      );
    }
    detach() {
      if (
        ((this._pending = void 0),
        (this._transport.onmessage = this._savedOnMessage),
        (this._transport.onerror = this._savedOnError),
        this._closeDelivered && this._savedOnClose !== void 0)
      ) {
        let _savedOnClose = this._savedOnClose,
          _transport = this._transport,
          s = !1,
          a = () => {
            if (!s) {
              s = !0;
              return;
            }
            _savedOnClose();
          };
        ((_transport.onclose = a),
          weakMap.set(_transport, () => {
            if (_transport.onclose === a) _transport.onclose = _savedOnClose;
          }));
      } else this._transport.onclose = this._savedOnClose;
    }
    release() {
      this.detach();
      let _transport = this._transport,
        start = _transport.start,
        s = !0;
      _transport.start = async function () {
        if (s) {
          ((s = !1), (_transport.start = start));
          return;
        }
        return start.call(_transport);
      };
    }
  },
  weakMap = new WeakMap();
//@ chunk-r1g76qsy.js:286144-286291 esm-layout
function cc(e) {
  let t = String(e);
  if (t.length <= 200) return t;
  let r = (t.charCodeAt(199) & 64512) === 55296 ? 199 : 200;
  return `${t.slice(0, r)}\u2026 [truncated]`;
}
//@ chunk-r1g76qsy.js:286291-286428 esm-layout
function lc(e) {
  if (e instanceof SyntaxError) return !0;
  return typeof e === "object" && e !== null && (e.name === "ZodError" || Array.isArray(e.issues));
}
//@ chunk-r1g76qsy.js:286428-286478 esm-fingerprint
function uc(e) {
  let t = weakMap.get(e);
  (weakMap.delete(e), t?.());
}
//@ chunk-r1g76qsy.js:286478-286644 esm-fingerprint
function mh(e, t, r, s) {
  return {
    jsonrpc: "2.0",
    id: e,
    method: "server/discover",
    params: { _meta: Ge(t).outboundEnvelope({ protocolVersion: t, clientInfo: r, clientCapabilities: s }) },
  };
}
//@ chunk-r1g76qsy.js:286644-287286 esm-fingerprint
function ph(e, t) {
  switch (e.kind) {
    case "response":
      return e.error === void 0 ? { kind: "result", result: e.result } : { kind: "rpc-error", ...e.error };
    case "send-error": {
      let error = e.error;
      if (error instanceof SdkHttpError) {
        let s = error.data?.text;
        return { kind: "http-error", status: error.data.status, body: typeof s === "string" ? s : void 0 };
      }
      if (
        error instanceof UnauthorizedError ||
        (error instanceof Error && error.name === "UnauthorizedError")
      )
        return { kind: "auth-required", error: error };
      return { kind: "network-error", error: error };
    }
    case "closed":
      return { kind: "closed" };
    case "id-mismatch":
      return { kind: "id-mismatch" };
    case "malformed":
      return { kind: "malformed" };
    case "stream-end":
      return { kind: "stream-end" };
    case "timeout":
      return { kind: "timeout", timeoutMs: t };
  }
}
//@ chunk-r1g76qsy.js:287286-289241 esm-fingerprint
async function $c(e, t) {
  let r = e.probe.timeoutMs ?? t.defaultTimeoutMs,
    max = Math.max(0, e.probe.maxRetries ?? 0),
    a = e.kind === "pin" ? [e.version] : e.modernVersions,
    n = e.kind === "auto" && e.fallbackAvailable,
    open = await hh.open(t.transport, t.transportKind),
    l = async () => {
      let d = a[0],
        m = !1,
        _ = max;
      for (;;) {
        let exchange = await open.exchange((v) => mh(v, d, t.clientInfo, t.capabilities), r);
        if (exchange.kind === "timeout" && _ > 0) {
          _--;
          continue;
        }
        let P = ph(exchange, r);
        if (P.kind === "timeout") t.transport._anthropicProbeTimedOut = !0;
        let y = oh(P, {
          clientModernVersions: a,
          requestedVersion: d,
          fallbackAvailable: n,
          environment: t.environment,
          transportKind: t.transportKind,
        });
        switch (y.kind) {
          case "modern":
            return { era: "modern", version: y.version, discover: y.discover };
          case "corrective":
            if (m) throw y.error;
            ((m = !0), (d = y.version));
            continue;
          case "legacy": {
            if (P.kind === "id-mismatch" || P.kind === "malformed" || P.kind === "stream-end")
              t.transport._anthropicProbeLegacyEvidence = P.kind;
            let v = P.kind === "closed" ? "the connection closed during the server/discover probe" : void 0;
            if (e.kind === "pin")
              throw new SdkError(
                Ti.EraNegotiationFailed,
                v === void 0
                  ? `Version negotiation failed: the server did not offer pinned protocol version ${e.version} via server/discover (no fallback in pin mode)`
                  : `Version negotiation failed: ${v} before the server offered pinned protocol version ${e.version} (no fallback in pin mode)`,
              );
            if (!e.fallbackAvailable)
              throw new SdkError(
                Ti.EraNegotiationFailed,
                v === void 0
                  ? "Version negotiation failed: the server gave no modern evidence and this client supports no pre-2026-07-28 protocol version to fall back to"
                  : `Version negotiation failed: ${v} and this client supports no pre-2026-07-28 protocol version to fall back to`,
              );
            if (v !== void 0 && t.disposableProbe !== !0)
              throw new SdkError(
                Ti.EraNegotiationFailed,
                `Version negotiation failed: ${v} (this transport probed in place \u2014 the disposable sibling probe requires the SDK's base StdioClientTransport)`,
              );
            return { era: "legacy" };
          }
          case "error":
            throw y.error;
        }
      }
    },
    c;
  try {
    c = await l();
  } catch (error) {
    throw (open.detach(), error);
  }
  return (open.release(), c);
}
//@ chunk-r1g76qsy.js:289241-289456 esm-fingerprint
function fh(e) {
  let prototypeOf = Object.getPrototypeOf(e);
  if (prototypeOf === null || !Object.prototype.hasOwnProperty.call(prototypeOf, "_dispose")) return;
  let _serverParams = e._serverParams;
  return typeof _serverParams === "object" &&
    _serverParams !== null &&
    typeof _serverParams.command === "string"
    ? _serverParams
    : void 0;
}
//@ chunk-r1g76qsy.js:289456-289821 esm-fingerprint
async function Sh(e, t, r, s) {
  let n = new t.constructor({ ...r, stderr: "ignore" }),
    close = t.close,
    l = !1,
    c,
    promise = new Promise((_, w) => {
      c = () => w(dc());
    });
  t.close = async function () {
    return ((l = !0), c?.(), close.call(t));
  };
  let m;
  try {
    let _ = $c(e, { ...s, transport: n, transportKind: "stdio", disposableProbe: !0 });
    (_.catch(() => {}), (m = await Promise.race([_, promise])));
  } finally {
    (await gh(n), (t.close = close));
  }
  if (l) throw dc();
  return m;
}
//@ chunk-r1g76qsy.js:289821-289962 esm-fingerprint
function dc() {
  return new SdkError(
    Ti.EraNegotiationFailed,
    "Version negotiation failed: the transport was closed during the server/discover probe",
  );
}
//@ chunk-r1g76qsy.js:289962-290061 esm-fingerprint
async function gh(e) {
  try {
    let _dispose = e._dispose;
    await (typeof _dispose === "function" ? _dispose.call(e) : e.close());
  } catch {}
}
//@ chunk-r1g76qsy.js:290061-290133 esm-fingerprint
function hc(e) {
  let t = e._meta?.[IO_MODELCONTEXTPROTOCOL_SERVERINFO];
  return freeze_2.Implementation(t) ? t : void 0;
}
//@ chunk-r1g76qsy.js:290133-290598 esm-fingerprint
function za(e, t) {
  if (!e || t === null || typeof t !== "object") return;
  if (e.type === "object" && e.properties && typeof e.properties === "object") {
    let r = t,
      properties = e.properties;
    for (let a of Object.keys(properties)) {
      let n = properties[a];
      if (r[a] === void 0 && Object.prototype.hasOwnProperty.call(n, "default")) r[a] = n.default;
      if (r[a] !== void 0) za(n, r[a]);
    }
  }
  if (Array.isArray(e.anyOf)) {
    for (let r of e.anyOf) if (typeof r !== "boolean") za(r, t);
  }
  if (Array.isArray(e.oneOf)) {
    for (let r of e.oneOf) if (typeof r !== "boolean") za(r, t);
  }
}
//@ chunk-r1g76qsy.js:290598-290758 esm-fingerprint
function _h(e) {
  if (!e) return { supportsFormMode: !1, supportsUrlMode: !1 };
  let t = e.form !== void 0,
    r = e.url !== void 0;
  return { supportsFormMode: t || (!t && !r), supportsUrlMode: r };
}
//@ chunk-r1g76qsy.js:290758-291095 esm-fingerprint
function yh(e) {
  if (typeof e === "object" && e !== null) {
    if (e.kind === "legacy" && !("supportedVersions" in e) && !("discover" in e)) return e;
    if (e.kind === "modern" && extend_10.safeParse(e.discover).success) return e;
  }
  throw new SdkError(
    Ti.EraNegotiationFailed,
    "connect({ prior }): unrecognized prior \u2014 expected { kind: 'modern', discover } or { kind: 'legacy' }",
  );
}
//@ chunk-r1g76qsy.js:291095-316569 esm-fingerprint
var mc = {
    "notifications/tools/list_changed": ["tools/list"],
    "notifications/prompts/list_changed": ["prompts/list"],
    "notifications/resources/list_changed": ["resources/list", "resources/templates/list"],
  },
  vh = 64,
  cLo = class extends ki {
    _serverCapabilities;
    _serverVersion;
    _capabilities;
    _instructions;
    _jsonSchemaValidator;
    _cache;
    _defaultCacheTtlMs;
    _listMaxPages;
    _listChangedDebounceTimers = new Map();
    _listChangedConfig;
    _enforceStrictCapabilities;
    _versionNegotiation;
    _supportedProtocolVersionsOption;
    _inputRequiredDriverConfig;
    _listenState = new Map();
    _nextListenId = 0;
    _autoOpenedSubscription;
    _discoverResult;
    _resetConnectionState() {
      if (
        ((this._negotiatedProtocolVersion = void 0),
        (this._serverCapabilities = void 0),
        (this._serverVersion = void 0),
        (this._instructions = void 0),
        (this._discoverResult = void 0),
        (this._autoOpenedSubscription = void 0),
        this._listenState.size > 0)
      ) {
        let e = new SdkError(
          Ti.ConnectionClosed,
          "subscriptions/listen: client reconnected or closed; subscription state from the previous connection was reset",
        );
        for (let t of this._listenState.values()) t.settle({ cause: "remote", error: e });
      }
      this._listenState.clear();
      for (let e of this._listChangedDebounceTimers.values()) clearTimeout(e);
      (this._listChangedDebounceTimers.clear(), this._cache.resetForReconnect());
    }
    async close() {
      try {
        await super.close();
      } finally {
        this._resetConnectionState();
      }
    }
    constructor(e, t) {
      super(t);
      if (
        ((this._clientInfo = e),
        (this._capabilities = t?.capabilities ? { ...t.capabilities } : {}),
        (this._jsonSchemaValidator = t?.jsonSchemaValidator ?? new Udn()),
        (this._enforceStrictCapabilities = t?.enforceStrictCapabilities ?? !1),
        (this._versionNegotiation = t?.versionNegotiation),
        (this._supportedProtocolVersionsOption = t?.supportedProtocolVersions),
        (this._inputRequiredDriverConfig = wi(t?.inputRequired)),
        (this._cache = new Qd(
          t?.responseCacheStore ?? new McpResponseCache(),
          t?.responseCacheStore !== void 0,
          (r) => this._reportStoreError(r),
          t?.cachePartition ?? "",
        )),
        (this._defaultCacheTtlMs = t?.defaultCacheTtlMs ?? 0),
        (this._listMaxPages = t?.listMaxPages ?? vh),
        t?.listChanged)
      )
        this._listChangedConfig = t.listChanged;
    }
    buildContext(e, t) {
      return e;
    }
    _shouldDropInbound(e) {
      if (this._negotiatedProtocolVersion !== void 0 && Be(this._negotiatedProtocolVersion) && fZ(e))
        return "drop";
    }
    _outboundMetaEnvelope() {
      let _negotiatedProtocolVersion = this._negotiatedProtocolVersion;
      if (_negotiatedProtocolVersion === void 0) return;
      return this._wireCodec().outboundEnvelope({
        protocolVersion: _negotiatedProtocolVersion,
        clientInfo: this._clientInfo,
        clientCapabilities: this._capabilities,
      });
    }
    _resolveNonCompleteResult(e, t) {
      if (!this._inputRequiredDriverConfig.autoFulfill)
        return Promise.reject(
          new SdkError(
            Ti.UnsupportedResultType,
            `Unsupported result type 'input_required' for ${t.request.method}: multi-round-trip auto-fulfilment is not enabled on this instance \u2014 pass allowInputRequired: true to handle it manually, or enable inputRequired.autoFulfill`,
            { resultType: "input_required", method: t.request.method },
          ),
        );
      return Ii(
        {
          getRequestHandler: (r) => this._getRequestHandler(r),
          buildContext: (r) => this.buildContext(r, void 0),
          sessionId: this.transport?.sessionId,
        },
        this._inputRequiredDriverConfig,
        e,
        t,
      );
    }
    _setupListChangedHandlers(e) {
      if (e.tools && this._serverCapabilities?.tools?.listChanged)
        this._setupListChangedHandler(
          "tools",
          "notifications/tools/list_changed",
          e.tools,
          async () => (await this.listTools(void 0, { cacheMode: "refresh" })).tools,
        );
      if (e.prompts && this._serverCapabilities?.prompts?.listChanged)
        this._setupListChangedHandler(
          "prompts",
          "notifications/prompts/list_changed",
          e.prompts,
          async () => (await this.listPrompts(void 0, { cacheMode: "refresh" })).prompts,
        );
      if (e.resources && this._serverCapabilities?.resources?.listChanged)
        this._setupListChangedHandler(
          "resources",
          "notifications/resources/list_changed",
          e.resources,
          async () => (await this.listResources(void 0, { cacheMode: "refresh" })).resources,
        );
    }
    registerCapabilities(e) {
      if (this.transport) throw Error("Cannot register capabilities after connecting to transport");
      this._capabilities = qi(this._capabilities, e);
    }
    setVersionNegotiation(e) {
      if (this.transport) throw Error("Cannot configure version negotiation after connecting to transport");
      this._versionNegotiation = e;
    }
    _wrapHandler(e, t) {
      if (e === "elicitation/create")
        return async (r, s) => {
          let a = Ge(this._negotiatedProtocolVersion),
            validateRequest = a.validateRequest("elicitation/create", r);
          if (!validateRequest.ok && validateRequest.reason === "not-in-era")
            validateRequest = a.validateInputRequest("elicitation/create", r);
          if (!validateRequest.ok)
            throw new ProtocolError(
              validateRequest.reason === "not-in-era" ? ma.InternalError : ma.InvalidParams,
              validateRequest.reason === "not-in-era"
                ? "No wire schema for elicitation/create in the resolved era"
                : `Invalid elicitation request: ${validateRequest.message}`,
            );
          let { params: params } = validateRequest.value;
          params.mode = params.mode ?? "form";
          let { supportsFormMode: supportsFormMode, supportsUrlMode: supportsUrlMode } = _h(
            this._capabilities.elicitation,
          );
          if (params.mode === "form" && !supportsFormMode)
            throw new ProtocolError(
              ma.InvalidParams,
              "Client does not support form-mode elicitation requests",
            );
          if (params.mode === "url" && !supportsUrlMode)
            throw new ProtocolError(
              ma.InvalidParams,
              "Client does not support URL-mode elicitation requests",
            );
          let d = await t(r, s),
            validateResult = a.validateResult("elicitation/create", d);
          if (!validateResult.ok && validateResult.reason === "not-in-era")
            validateResult = a.validateInputResponse("elicitation/create", d);
          if (!validateResult.ok)
            throw new ProtocolError(
              validateResult.reason === "not-in-era" ? ma.InternalError : ma.InvalidParams,
              validateResult.reason === "not-in-era"
                ? "No wire schema for elicitation/create in the resolved era"
                : `Invalid elicitation result: ${validateResult.message}`,
            );
          let _ = validateResult.value,
            w = params.mode === "form" ? params.requestedSchema : void 0;
          if (
            params.mode === "form" &&
            _.action === "accept" &&
            _.content &&
            w &&
            this._capabilities.elicitation?.form?.applyDefaults
          )
            try {
              za(w, _.content);
            } catch {}
          return _;
        };
      if (e === "sampling/createMessage")
        return async (r, s) => {
          let a = Ge(this._negotiatedProtocolVersion),
            validateRequest = a.validateRequest("sampling/createMessage", r);
          if (!validateRequest.ok && validateRequest.reason === "not-in-era")
            validateRequest = a.validateInputRequest("sampling/createMessage", r);
          if (!validateRequest.ok)
            throw new ProtocolError(
              validateRequest.reason === "not-in-era" ? ma.InternalError : ma.InvalidParams,
              validateRequest.reason === "not-in-era"
                ? "No wire schema for sampling/createMessage in the resolved era"
                : `Invalid sampling request: ${validateRequest.message}`,
            );
          let { params: params } = validateRequest.value,
            l = await t(r, s),
            c = Boolean(params.tools || params.toolChoice),
            samplingResultVariant = a.samplingResultVariant(c, l);
          if (!samplingResultVariant.ok && samplingResultVariant.reason === "not-in-era")
            samplingResultVariant = a.validateInputResponse("sampling/createMessage", l);
          if (!samplingResultVariant.ok)
            throw new ProtocolError(
              samplingResultVariant.reason === "not-in-era" ? ma.InternalError : ma.InvalidParams,
              samplingResultVariant.reason === "not-in-era"
                ? "No result schema for sampling/createMessage in the resolved era"
                : `Invalid sampling result: ${samplingResultVariant.message}`,
            );
          return samplingResultVariant.value;
        };
      return t;
    }
    assertCapability(e, t) {
      if (!this._serverCapabilities?.[e])
        throw new SdkError(Ti.CapabilityNotSupported, `Server does not support ${e} (required for ${t})`);
    }
    async connect(e, t) {
      if (t?.prior != null) return this._connectFromPrior(e, yh(t.prior), t);
      let r = dh(this._versionNegotiation, this._supportedProtocolVersionsOption);
      if (r.kind !== "legacy") return this._connectNegotiated(e, r, t);
      return this._connectPlainLegacy(e, t);
    }
    async _connectPlainLegacy(e, t) {
      if ((await super.connect(e), e.sessionId !== void 0)) {
        let _negotiatedProtocolVersion = this._negotiatedProtocolVersion;
        if (_negotiatedProtocolVersion !== void 0) e.setProtocolVersion?.(_negotiatedProtocolVersion);
        return;
      }
      (this._resetConnectionState(), await this._legacyHandshake(e, t));
    }
    async _legacyHandshake(e, t, r = !0) {
      let s = ln(this._supportedProtocolVersions);
      try {
        let a = s[0];
        if (a === void 0)
          throw new SdkError(
            Ti.EraNegotiationFailed,
            "Cannot run the initialize handshake: supportedProtocolVersions contains no pre-2026-07-28 protocol version",
          );
        let request = await this.request(
          {
            method: "initialize",
            params: { protocolVersion: a, capabilities: this._capabilities, clientInfo: this._clientInfo },
          },
          t,
        );
        if (request === void 0) throw Error(`Server sent invalid initialize result: ${request}`);
        if (!s.includes(request.protocolVersion))
          throw Error(`Server's protocol version is not supported: ${request.protocolVersion}`);
        if (
          ((this._serverCapabilities = request.capabilities),
          (this._serverVersion = request.serverInfo),
          this._cache.setServerIdentity(this._deriveServerIdentity(e)),
          e.setProtocolVersion)
        )
          e.setProtocolVersion(request.protocolVersion);
        if (
          ((this._instructions = request.instructions),
          await this.notification({ method: "notifications/initialized" }),
          (this._negotiatedProtocolVersion = request.protocolVersion),
          this._listChangedConfig)
        )
          this._setupListChangedHandlers(this._listChangedConfig);
      } catch (error) {
        if (r) this.close();
        throw error;
      }
    }
    async _discoverAfterRejectedInitialize(e, t, r, s) {
      let a = r.kind === "auto" && e._anthropicProbeTimedOut === !0 && t instanceof ProtocolError,
        n = a && t.code === ma.UnsupportedProtocolVersion ? wc(t.data) : void 0,
        i = !a
          ? void 0
          : n === void 0
            ? r.modernVersions[0]
            : r.modernVersions.find((modernVersion) => n.includes(modernVersion));
      if (i === void 0) throw (this.close(), t);
      try {
        this._negotiatedProtocolVersion = i;
        let discover = await this.discover({
          ...s,
          timeout: Math.min(3000, r.probe.timeoutMs ?? s?.timeout ?? oo),
        });
        if (!discover.supportedVersions.includes(i))
          throw Error(`the second server/discover does not offer ${i}`);
        return { era: "modern", version: i, discover: discover };
      } catch (error) {
        throw (
          (e._anthropicRediscoverError = error),
          (this._negotiatedProtocolVersion = void 0),
          this.close(),
          t
        );
      }
    }
    async _connectNegotiated(e, t, r) {
      if (e.sessionId !== void 0) {
        await super.connect(e);
        let _negotiatedProtocolVersion = this._negotiatedProtocolVersion;
        if (_negotiatedProtocolVersion !== void 0 && e.setProtocolVersion)
          e.setProtocolVersion(_negotiatedProtocolVersion);
        return;
      }
      this._resetConnectionState();
      let s;
      try {
        let a = ic(e),
          n = {
            clientInfo: this._clientInfo,
            capabilities: this._capabilities,
            environment: nc(),
            defaultTimeoutMs: r?.timeout ?? oo,
          },
          i = a === "stdio" ? fh(e) : void 0;
        s = i === void 0 ? await $c(t, { ...n, transport: e, transportKind: a }) : await Sh(t, e, i, n);
      } catch (error) {
        throw (await e.close().catch(() => {}), uc(e), error);
      }
      if ((uc(e), await super.connect(e), s.era === "legacy"))
        try {
          await this._legacyHandshake(e, r, !1);
          return;
        } catch (error) {
          s = await this._discoverAfterRejectedInitialize(e, error, t, r);
        }
      if (
        ((this._serverCapabilities = s.discover.capabilities),
        (this._serverVersion = hc(s.discover)),
        this._cache.setServerIdentity(this._deriveServerIdentity(e)),
        (this._instructions = s.discover.instructions),
        (this._discoverResult = s.discover),
        (this._negotiatedProtocolVersion = s.version),
        e.setProtocolVersion)
      )
        e.setProtocolVersion(s.version);
      if (this._listChangedConfig) {
        let _listChangedConfig = this._listChangedConfig,
          _serverCapabilities = this._serverCapabilities,
          i = {
            ...(_listChangedConfig.tools &&
              _serverCapabilities?.tools?.listChanged && { tools: _listChangedConfig.tools }),
            ...(_listChangedConfig.prompts &&
              _serverCapabilities?.prompts?.listChanged && { prompts: _listChangedConfig.prompts }),
            ...(_listChangedConfig.resources &&
              _serverCapabilities?.resources?.listChanged && { resources: _listChangedConfig.resources }),
          },
          l = !0;
        try {
          this._setupListChangedHandlers(i);
        } catch (error) {
          ((l = !1), this.onerror?.(error instanceof Error ? error : Error(String(error))));
        }
        let c = l
          ? {
              ...(i.tools && { toolsListChanged: !0 }),
              ...(i.prompts && { promptsListChanged: !0 }),
              ...(i.resources && { resourcesListChanged: !0 }),
            }
          : {};
        if (Object.keys(c).length > 0) {
          let abortController = new AbortController(),
            m = () => abortController.abort(r?.signal?.reason);
          if (r?.signal?.aborted) m();
          r?.signal?.addEventListener("abort", m);
          try {
            this._autoOpenedSubscription = await this.listen(c, {
              timeout: r?.timeout,
              signal: abortController.signal,
            });
          } catch (error) {
            if (r?.signal?.aborted) throw (await this.close().catch(() => {}), error);
            this.onerror?.(error instanceof Error ? error : Error(String(error)));
          } finally {
            r?.signal?.removeEventListener("abort", m);
          }
        }
      }
    }
    async _connectFromPrior(e, t, r) {
      if (t.kind === "legacy") return this._connectPlainLegacy(e, r);
      let discover = t.discover;
      this._resetConnectionState();
      let _supportedProtocolVersionsOption = this._supportedProtocolVersionsOption,
        found = (
          _supportedProtocolVersionsOption && ro(_supportedProtocolVersionsOption).length > 0
            ? ro(_supportedProtocolVersionsOption)
            : cn
        ).find((i) => discover.supportedVersions.includes(i));
      if (found === void 0)
        throw new SdkError(
          Ti.EraNegotiationFailed,
          "connect({ prior }) with a modern verdict requires a 2026-07-28+ mutual protocol version; the supplied DiscoverResult and this client's supportedProtocolVersions have no modern overlap. For a server known to be legacy, pass prior: { kind: 'legacy' } to skip the probe and initialize directly, or use versionNegotiation: { mode: 'auto' } to re-probe with legacy fallback.",
        );
      if (
        (await super.connect(e),
        (this._discoverResult = discover),
        (this._serverCapabilities = discover.capabilities),
        (this._serverVersion = hc(discover)),
        this._cache.setServerIdentity(this._deriveServerIdentity(e)),
        (this._instructions = discover.instructions),
        (this._negotiatedProtocolVersion = found),
        e.setProtocolVersion?.(found),
        this._listChangedConfig)
      )
        try {
          this._setupListChangedHandlers(this._listChangedConfig);
        } catch (error) {
          this.onerror?.(error instanceof Error ? error : Error(String(error)));
        }
    }
    getServerCapabilities() {
      return this._serverCapabilities;
    }
    getServerVersion() {
      return this._serverVersion;
    }
    _deriveServerIdentity(e) {
      let _serverVersion = this._serverVersion;
      if (_serverVersion !== void 0) return `${_serverVersion.name}@${_serverVersion.version}`;
      return e.sessionId ?? `anonymous:${Date.now()}-${Math.random().toString(36).slice(2)}`;
    }
    getNegotiatedProtocolVersion() {
      return this._negotiatedProtocolVersion;
    }
    getProtocolEra() {
      let _negotiatedProtocolVersion = this._negotiatedProtocolVersion;
      if (_negotiatedProtocolVersion === void 0) return;
      return Be(_negotiatedProtocolVersion) ? "modern" : "legacy";
    }
    getInstructions() {
      return this._instructions;
    }
    getDiscoverResult() {
      return this._discoverResult;
    }
    assertCapabilityForMethod(e) {
      switch (e) {
        case "logging/setLevel":
          if (!this._serverCapabilities?.logging)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Server does not support logging (required for ${e})`,
            );
          break;
        case "prompts/get":
        case "prompts/list":
          if (!this._serverCapabilities?.prompts)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Server does not support prompts (required for ${e})`,
            );
          break;
        case "resources/list":
        case "resources/templates/list":
        case "resources/read":
        case "resources/subscribe":
        case "resources/unsubscribe":
          if (!this._serverCapabilities?.resources)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Server does not support resources (required for ${e})`,
            );
          if (e === "resources/subscribe" && !this._serverCapabilities.resources.subscribe)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Server does not support resource subscriptions (required for ${e})`,
            );
          break;
        case "tools/call":
        case "tools/list":
          if (!this._serverCapabilities?.tools)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Server does not support tools (required for ${e})`,
            );
          break;
        case "completion/complete":
          if (!this._serverCapabilities?.completions)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Server does not support completions (required for ${e})`,
            );
          break;
        case "initialize":
          break;
        case "server/discover":
          break;
        case "ping":
          break;
      }
    }
    assertNotificationCapability(e) {
      switch (e) {
        case "notifications/roots/list_changed":
          if (!this._capabilities.roots?.listChanged)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Client does not support roots list changed notifications (required for ${e})`,
            );
          break;
        case "notifications/initialized":
          break;
        case "notifications/cancelled":
          break;
        case "notifications/progress":
          break;
      }
    }
    assertRequestHandlerCapability(e) {
      switch (e) {
        case "sampling/createMessage":
          if (!this._capabilities.sampling)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Client does not support sampling capability (required for ${e})`,
            );
          break;
        case "elicitation/create":
          if (!this._capabilities.elicitation)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Client does not support elicitation capability (required for ${e})`,
            );
          break;
        case "roots/list":
          if (!this._capabilities.roots)
            throw new SdkError(
              Ti.CapabilityNotSupported,
              `Client does not support roots capability (required for ${e})`,
            );
          break;
        case "ping":
          break;
      }
    }
    async ping(e) {
      return this.request({ method: "ping" }, e);
    }
    async discover(e) {
      let _requestWithSchema = await this._requestWithSchema({ method: "server/discover" }, extend_10, e);
      return ((this._discoverResult = _requestWithSchema), _requestWithSchema);
    }
    async complete(e, t) {
      return this.request({ method: "completion/complete", params: e }, t);
    }
    async setLoggingLevel(e, t) {
      return this.request({ method: "logging/setLevel", params: { level: e } }, t);
    }
    async getPrompt(e, t) {
      return this.request({ method: "prompts/get", params: e }, t);
    }
    async listPrompts(e, t) {
      if (!this._serverCapabilities?.prompts && !this._enforceStrictCapabilities)
        return (
          console.debug(
            "Client.listPrompts() called but server does not advertise prompts capability - returning empty list",
          ),
          { prompts: [] }
        );
      if (e?.cursor !== void 0) return this.request({ method: "prompts/list", params: e }, t);
      let _serveFromCache = await this._serveFromCache("prompts/list", void 0, t);
      if (_serveFromCache !== void 0) return _serveFromCache;
      return this._listAllPages("prompts/list", e, t, (s, a) => s.prompts.push(...a.prompts));
    }
    async listResources(e, t) {
      if (!this._serverCapabilities?.resources && !this._enforceStrictCapabilities)
        return (
          console.debug(
            "Client.listResources() called but server does not advertise resources capability - returning empty list",
          ),
          { resources: [] }
        );
      if (e?.cursor !== void 0) return this.request({ method: "resources/list", params: e }, t);
      let _serveFromCache = await this._serveFromCache("resources/list", void 0, t);
      if (_serveFromCache !== void 0) return _serveFromCache;
      return this._listAllPages("resources/list", e, t, (s, a) => s.resources.push(...a.resources));
    }
    async listResourceTemplates(e, t) {
      if (!this._serverCapabilities?.resources && !this._enforceStrictCapabilities)
        return (
          console.debug(
            "Client.listResourceTemplates() called but server does not advertise resources capability - returning empty list",
          ),
          { resourceTemplates: [] }
        );
      if (e?.cursor !== void 0) return this.request({ method: "resources/templates/list", params: e }, t);
      let _serveFromCache = await this._serveFromCache("resources/templates/list", void 0, t);
      if (_serveFromCache !== void 0) return _serveFromCache;
      return this._listAllPages("resources/templates/list", e, t, (s, a) =>
        s.resourceTemplates.push(...a.resourceTemplates),
      );
    }
    async _listAllPages(e, t, r, s, a) {
      let n = r?.cacheMode === "bypass",
        captureGeneration = this._cache.captureGeneration(e),
        request = await this.request({ method: e, ...(t && { params: { ...t } }) }, r),
        nextCursor = request.nextCursor,
        d = new Set(),
        m = 1;
      while (nextCursor !== void 0 && !d.has(nextCursor)) {
        if (this._listMaxPages !== 0 && m >= this._listMaxPages)
          throw new SdkError(
            Ti.ListPaginationExceeded,
            `${e}: exceeded listMaxPages (${this._listMaxPages}); server pagination did not terminate`,
            { method: e, listMaxPages: this._listMaxPages },
          );
        d.add(nextCursor);
        let request_2 = await this.request({ method: e, params: { ...t, cursor: nextCursor } }, r);
        (s(request, request_2), (nextCursor = request_2.nextCursor), m++);
      }
      if ((delete request.nextCursor, a?.(request), n)) return request;
      return (await this._cache.write(e, request, captureGeneration, this._freshness(request)), request);
    }
    _freshness(e, t) {
      let r = e,
        s = typeof r.ttlMs === "number" ? r.ttlMs : this._defaultCacheTtlMs,
        a = r.cacheScope === "public" ? "public" : "private";
      return { expiresAt: this._cache.now() + Math.min(Math.max(0, s), Zd), scope: a, params: t };
    }
    async _serveFromCache(e, t, r) {
      if (r?.cacheMode === "bypass" || r?.cacheMode === "refresh") return;
      let s = await this._cache.read(e, t).catch((a) => void this._reportStoreError(a));
      if (s !== void 0) {
        if (r?.signal?.aborted) {
          let reason = r.signal.reason;
          throw reason instanceof SdkError ? reason : new SdkError(Ti.RequestTimeout, String(reason));
        }
        return s.value;
      }
    }
    _reportStoreError(e) {
      this.onerror?.(e instanceof Error ? e : Error(String(e)));
    }
    _compileOutputValidator(e) {
      if (!e.outputSchema) return;
      try {
        return { ok: !0, validator: this._jsonSchemaValidator.getValidator(e.outputSchema) };
      } catch (error) {
        return { ok: !1, compileError: error };
      }
    }
    async _resolveXMcpHeaderScan(e, t) {
      let r = t ?? (await this._cache.toolDefinition(e));
      return r === void 0 ? void 0 : fn(r.inputSchema);
    }
    async readResource(e, t) {
      let _serveFromCache = await this._serveFromCache("resources/read", e.uri, t);
      if (_serveFromCache !== void 0) return _serveFromCache;
      let captureGeneration = this._cache.captureGeneration("resources/read", e.uri),
        request = await this.request({ method: "resources/read", params: e }, t);
      if (t?.cacheMode !== "bypass") {
        let _freshness = this._freshness(request, e.uri);
        if (_freshness.expiresAt > this._cache.now())
          await this._cache.write("resources/read", request, captureGeneration, _freshness);
        else if (t?.cacheMode === "refresh") await this._cache.evictKey("resources/read", e.uri);
      }
      return request;
    }
    async subscribeResource(e, t) {
      return this.request({ method: "resources/subscribe", params: e }, t);
    }
    async unsubscribeResource(e, t) {
      return this.request({ method: "resources/unsubscribe", params: e }, t);
    }
    async listen(e, t) {
      if (this.transport === void 0) throw new SdkError(Ti.NotConnected, "Not connected");
      let _negotiatedProtocolVersion = this._negotiatedProtocolVersion;
      if (_negotiatedProtocolVersion === void 0 || !Be(_negotiatedProtocolVersion))
        throw new SdkError(
          Ti.MethodNotSupportedByProtocolVersion,
          `subscriptions/listen requires a 2026-07-28-era connection (negotiated: ${_negotiatedProtocolVersion ?? "none"}). On a 2025-era connection, change notifications are delivered unsolicited: use ClientOptions.listChanged and resources/subscribe instead.`,
          { method: "subscriptions/listen", protocolVersion: _negotiatedProtocolVersion },
        );
      if (t?.signal?.aborted) {
        let reason = t.signal.reason;
        throw reason instanceof SdkError ? reason : new SdkError(Ti.RequestTimeout, String(reason));
      }
      let abortController = new AbortController(),
        a = `listen:${this._nextListenId++}`,
        n = "opening",
        i,
        l,
        c,
        d,
        promise = new Promise((S, f) => {
          ((c = S), (d = f));
        });
      promise.catch(() => {});
      let _,
        promise_2 = new Promise((S) => {
          _ = S;
        }),
        P = (S) => {
          if (n === "closed") return;
          let f = n === "opening";
          if (i !== void 0) (clearTimeout(i), (i = void 0));
          if ("ack" in S) {
            ((n = "open"), c(S.ack));
            return;
          }
          if (((n = "closed"), l !== void 0)) t?.signal?.removeEventListener("abort", l);
          if ((this._listenState.delete(a), abortController.abort(), _(S.cause), f))
            d(
              S.error ??
                new SdkError(
                  Ti.ConnectionClosed,
                  "subscriptions/listen closed before the server acknowledged",
                ),
            );
        },
        y = async () => {
          (abortController.abort(),
            await this.notification({ method: "notifications/cancelled", params: { requestId: a } }).catch(
              () => {},
            ));
        },
        v = async () => {
          if (n === "closed") return;
          (P({ cause: "local" }), await y());
        };
      this._listenState.set(a, { settle: P });
      let p = t?.timeout ?? oo;
      if (
        ((i = setTimeout(() => {
          (P({
            cause: "remote",
            error: new SdkError(Ti.RequestTimeout, "subscriptions/listen ack timed out", { timeout: p }),
          }),
            y().catch(() => {}));
        }, p)),
        t?.signal)
      ) {
        let signal = t.signal;
        ((l = () => {
          if (n === "closed") return;
          let reason = signal.reason;
          (P({
            cause: "local",
            error: reason instanceof Error ? reason : Error(String(reason ?? "Aborted")),
          }),
            y().catch(() => {}));
        }),
          signal.addEventListener("abort", l, { once: !0 }));
      }
      let h = {
        jsonrpc: "2.0",
        id: a,
        method: "subscriptions/listen",
        params: { _meta: { ...this._outboundMetaEnvelope() }, notifications: e },
      };
      try {
        await this.transport.send(h, {
          requestSignal: abortController.signal,
          onRequestStreamEnd: () =>
            P({ cause: "remote", error: Error("subscriptions/listen: stream ended") }),
        });
      } catch (error) {
        P({ cause: "remote", error: error instanceof Error ? error : Error(String(error)) });
      }
      return { honoredFilter: await promise, close: v, closed: promise_2 };
    }
    get autoOpenedSubscription() {
      return this._autoOpenedSubscription;
    }
    _onnotification(e, t) {
      let r = Object.hasOwn(mc, e.method) ? mc[e.method] : void 0;
      if (e.method === "notifications/resources/updated") {
        let s = e.params?.uri;
        if (typeof s === "string") this._cache.evictKey("resources/read", s);
      } else if (r !== void 0) for (let s of r) this._cache.evict(s);
      if (e.method === "notifications/subscriptions/acknowledged") {
        let s = e.params?._meta?.[IO_MODELCONTEXTPROTOCOL_SUBSCRIPTIONID],
          a = typeof s === "string" ? this._listenState.get(s) : void 0;
        if (a !== void 0) {
          let validateNotification = this._wireCodec().validateNotification(
            "notifications/subscriptions/acknowledged",
            e,
          );
          a.settle({ ack: validateNotification.ok ? validateNotification.value.params.notifications : {} });
          return;
        }
      }
      if (e.method === "notifications/cancelled") {
        let s = e.params?.requestId,
          a = typeof s === "string" ? this._listenState.get(s) : void 0;
        if (a !== void 0) {
          a.settle({
            cause: "remote",
            error: Error("subscriptions/listen: server cancelled the subscription"),
          });
          return;
        }
      }
      super._onnotification(e, t);
    }
    _onresponse(e) {
      let id = e.id,
        r = typeof id === "string" ? this._listenState.get(id) : void 0;
      if (r !== void 0) {
        if (zAe(e))
          r.settle({
            cause: "remote",
            error: ProtocolError.fromError(e.error.code, e.error.message, e.error.data),
          });
        else
          r.settle({
            cause: "graceful",
            error: new SdkError(
              Ti.ConnectionClosed,
              "subscriptions/listen: server closed the subscription gracefully before acknowledging",
            ),
          });
        return;
      }
      super._onresponse(e);
    }
    _onclose() {
      if (this._listenState.size > 0) {
        let e = new SdkError(Ti.ConnectionClosed, "Connection closed");
        for (let t of this._listenState.values()) t.settle({ cause: "remote", error: e });
        this._listenState.clear();
      }
      super._onclose();
    }
    async callTool(e, t) {
      let r = this.getProtocolEra() === "modern" && nc() !== "browser",
        s = async () => {
          if (!r) return t;
          let c;
          try {
            c = await this._resolveXMcpHeaderScan(e.name, t?.toolDefinition);
          } catch (error) {
            this._reportStoreError(error);
          }
          if (!c?.valid || c.declarations.length === 0) return t;
          let d = Ri(c.declarations, e.arguments);
          return Object.keys(d).length === 0 ? t : { ...t, headers: { ...t?.headers, ...d } };
        },
        a =
          t?.toolDefinition === void 0
            ? await this._cache
                .outputValidator(e.name, (c) => this._compileOutputValidator(c))
                .catch((c) => void this._reportStoreError(c))
            : this._compileOutputValidator(t.toolDefinition),
        n = () => {
          if (a === void 0 || a.ok) return;
          let compileError = a.compileError,
            sliced = (compileError instanceof Error ? compileError.message : String(compileError)).slice(
              0,
              200,
            );
          throw new ProtocolError(
            ma.InvalidParams,
            `Tool '${e.name}' has an invalid outputSchema: ${sliced}`,
          );
        };
      n();
      let i;
      try {
        i = await this.request({ method: "tools/call", params: e }, await s());
      } catch (error) {
        let d = error instanceof ProtocolError && error.code === Gt;
        if (!r || !d || t?.toolDefinition !== void 0) throw error;
        let m = { signal: t?.signal, timeout: t?.timeout, cacheMode: "refresh" };
        (await this._cache.evict("tools/list"),
          await this.listTools(void 0, m).catch((_) => this._reportStoreError(_)),
          (a = await this._cache
            .outputValidator(e.name, (_) => this._compileOutputValidator(_))
            .catch((_) => void this._reportStoreError(_))),
          n(),
          (i = await this.request({ method: "tools/call", params: e }, await s())));
      }
      if (t?.allowTask === !0 && i.resultType === "task") return i;
      let l = a !== void 0 && a.ok ? a.validator : void 0;
      if (l) {
        if (i.structuredContent === void 0 && !i.isError)
          throw new ProtocolError(
            ma.InvalidRequest,
            `Tool ${e.name} has an output schema but did not return structured content`,
          );
        if (i.structuredContent !== void 0 && !i.isError)
          try {
            let c = l(i.structuredContent);
            if (!c.valid)
              throw new ProtocolError(
                ma.InvalidParams,
                `Structured content does not match the tool's output schema: ${c.errorMessage}`,
              );
          } catch (error) {
            if (error instanceof ProtocolError) throw error;
            throw new ProtocolError(
              ma.InvalidParams,
              `Failed to validate structured content: ${error instanceof Error ? error.message : String(error)}`,
            );
          }
      }
      return i;
    }
    async listTools(e, t) {
      if (!this._serverCapabilities?.tools && !this._enforceStrictCapabilities)
        return (
          console.debug(
            "Client.listTools() called but server does not advertise tools capability - returning empty list",
          ),
          { tools: [] }
        );
      if (e?.cursor !== void 0) {
        let request = await this.request({ method: "tools/list", params: e }, t);
        return (this._excludeInvalidXMcpHeaderTools(request), request);
      }
      let _serveFromCache = await this._serveFromCache("tools/list", void 0, t);
      if (_serveFromCache !== void 0) return _serveFromCache;
      return this._listAllPages(
        "tools/list",
        e,
        t,
        (s, a) => s.tools.push(...a.tools),
        (s) => this._excludeInvalidXMcpHeaderTools(s),
      );
    }
    _excludeInvalidXMcpHeaderTools(e) {
      if (this.getProtocolEra() !== "modern" || !this.transport || ic(this.transport) === "stdio") return;
      try {
        if (!JSON.stringify(e.tools).includes("x-mcp-header")) return;
      } catch {}
      let filtered = e.tools.filter((tool) => {
        let s = fn(tool.inputSchema);
        if (!s.valid)
          return (
            console.warn(
              `[mcp-sdk] excluding tool '${tool.name}' from tools/list: invalid x-mcp-header declaration \u2014 ${s.reason}`,
            ),
            !1
          );
        return !0;
      });
      if (filtered.length !== e.tools.length) e.tools = filtered;
    }
    _setupListChangedHandler(e, t, r, s) {
      let a = pa(Ur, r);
      if (!a.success) throw Error(`Invalid ${e} listChanged options: ${a.error.message}`);
      if (typeof r.onChanged !== "function")
        throw TypeError(`Invalid ${e} listChanged options: onChanged must be a function`);
      let { autoRefresh: autoRefresh, debounceMs: debounceMs } = a.data,
        { onChanged: onChanged } = r,
        c = async () => {
          if (!autoRefresh) {
            onChanged(null, null);
            return;
          }
          try {
            onChanged(null, await s());
          } catch (error) {
            onChanged(error instanceof Error ? error : Error(String(error)), null);
          }
        },
        d = () => {
          if (debounceMs) {
            let m = this._listChangedDebounceTimers.get(e);
            if (m) clearTimeout(m);
            let _ = setTimeout(c, debounceMs);
            this._listChangedDebounceTimers.set(e, _);
          } else c();
        };
      this.setNotificationHandler(t, d);
    }
    async sendRootsListChanged() {
      return this.notification({ method: "notifications/roots/list_changed" });
    }
  };
//@ chunk-r1g76qsy.js:316569-321626 esm-fingerprint
var ZNr = class extends Error {
    static {
      Object.defineProperty(this, "mcpBrand", { value: "mcp.SseError" });
    }
    static [Symbol.hasInstance](e) {
      return Ie(this, e);
    }
    static isInstance(e) {
      if (typeof this !== "function")
        throw TypeError(
          "isInstance must be called on the class (e.g. `SdkError.isInstance(value)`); for callbacks use `v => SdkError.isInstance(v)`",
        );
      return Ie(this, e);
    }
    constructor(e, t, r) {
      super(`SSE error: ${t}`);
      ((this.code = e), (this.event = r), bt(this, new.target));
    }
  },
  dYn = class {
    _eventSource;
    _endpoint;
    _abortController;
    _url;
    _resourceMetadataUrl;
    _scope;
    _eventSourceInit;
    _requestInit;
    _authProvider;
    _oauthProvider;
    _skipIssuerMetadataValidation;
    _fetch;
    _fetchWithInit;
    _protocolVersion;
    onclose;
    onerror;
    onmessage;
    constructor(e, t) {
      if (
        ((this._url = e),
        (this._resourceMetadataUrl = void 0),
        (this._scope = void 0),
        (this._eventSourceInit = t?.eventSourceInit),
        (this._requestInit = t?.requestInit),
        (this._skipIssuerMetadataValidation = t?.skipIssuerMetadataValidation),
        gc(t?.authProvider))
      )
        ((this._oauthProvider = t.authProvider),
          (this._authProvider = _c(t.authProvider, {
            skipIssuerMetadataValidation: t.skipIssuerMetadataValidation,
          })));
      else this._authProvider = t?.authProvider;
      ((this._fetch = t?.fetch), (this._fetchWithInit = MBt(t?.fetch, t?.requestInit)));
    }
    _last401Response;
    async _commonHeaders() {
      let e = {},
        t = await this._authProvider?.token();
      if (t) e.Authorization = `Bearer ${t}`;
      if (this._protocolVersion) e["mcp-protocol-version"] = this._protocolVersion;
      let r = to(this._requestInit?.headers);
      return new Headers({ ...e, ...r });
    }
    _startOrAuth() {
      let e = this?._eventSourceInit?.fetch ?? this._fetch ?? fetch;
      return new Promise((t, r) => {
        ((this._eventSource = new hZe(this._url.href, {
          ...this._eventSourceInit,
          fetch: async (s, a) => {
            let _commonHeaders = await this._commonHeaders();
            _commonHeaders.set("Accept", "text/event-stream");
            let i = await e(s, { ...a, headers: _commonHeaders });
            if (i.status === 401) {
              if (((this._last401Response = i), i.headers.has("www-authenticate"))) {
                let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = Mze(i);
                ((this._resourceMetadataUrl = resourceMetadataUrl), (this._scope = scope));
              }
            }
            return i;
          },
        })),
          (this._abortController = new AbortController()),
          (this._eventSource.onerror = (s) => {
            if (s.code === 401 && this._authProvider) {
              if (this._authProvider.onUnauthorized && this._last401Response) {
                let _last401Response = this._last401Response;
                ((this._last401Response = void 0),
                  this._eventSource?.close(),
                  this._authProvider
                    .onUnauthorized({
                      response: _last401Response,
                      serverUrl: this._url,
                      fetchFn: this._fetchWithInit,
                    })
                    .then(
                      () => this._startOrAuth().then(t, r),
                      (l) => {
                        (this.onerror?.(l), r(l));
                      },
                    ));
                return;
              }
              let n = new UnauthorizedError();
              (r(n), this.onerror?.(n));
              return;
            }
            let a = new ZNr(s.code, s.message, s);
            (r(a), this.onerror?.(a));
          }),
          (this._eventSource.onopen = () => {}),
          this._eventSource.addEventListener("endpoint", (s) => {
            let a = s;
            try {
              if (((this._endpoint = new URL(a.data, this._url)), this._endpoint.origin !== this._url.origin))
                throw Error(`Endpoint origin does not match connection origin: ${this._endpoint.origin}`);
            } catch (error) {
              (r(error), this.onerror?.(error), this.close());
              return;
            }
            t();
          }),
          (this._eventSource.onmessage = (s) => {
            let a = s,
              n;
            try {
              n = Rt(JSON.parse(a.data));
            } catch (error) {
              this.onerror?.(error);
              return;
            }
            this.onmessage?.(n);
          }));
      });
    }
    async start() {
      if (this._eventSource)
        throw Error(
          "SSEClientTransport already started! If using Client class, note that connect() calls start() automatically.",
        );
      return await this._startOrAuth();
    }
    async finishAuth(e, t) {
      if (!this._oauthProvider) throw new UnauthorizedError("finishAuth requires an OAuthClientProvider");
      let { authorizationCode: authorizationCode, iss: iss } = await yc(
        e,
        t,
        this._oauthProvider,
        this._url,
        { fetchFn: this._fetchWithInit, resourceMetadataUrl: this._resourceMetadataUrl },
      );
      if (
        (await DBt(this._oauthProvider, {
          serverUrl: this._url,
          authorizationCode: authorizationCode,
          iss: iss,
          resourceMetadataUrl: this._resourceMetadataUrl,
          scope: this._scope,
          fetchFn: this._fetchWithInit,
          skipIssuerMetadataValidation: this._skipIssuerMetadataValidation,
        })) !== "AUTHORIZED"
      )
        throw new UnauthorizedError("Failed to authorize");
    }
    async close() {
      (this._abortController?.abort(), this._eventSource?.close(), this.onclose?.());
    }
    async send(e) {
      return this._send(e, !1);
    }
    async _send(e, t) {
      if (!this._endpoint) throw new SdkError(Ti.NotConnected, "Not connected");
      try {
        let _commonHeaders = await this._commonHeaders();
        _commonHeaders.set("content-type", "application/json");
        let s = {
            ...this._requestInit,
            method: "POST",
            headers: _commonHeaders,
            body: JSON.stringify(e),
            signal: this._abortController?.signal,
          },
          a = await (this._fetch ?? fetch)(this._endpoint, s);
        if (!a.ok) {
          if (a.status === 401 && this._authProvider) {
            if (a.headers.has("www-authenticate")) {
              let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = Mze(a);
              ((this._resourceMetadataUrl = resourceMetadataUrl), (this._scope = scope));
            }
            if (this._authProvider.onUnauthorized && !t)
              return (
                await this._authProvider.onUnauthorized({
                  response: a,
                  serverUrl: this._url,
                  fetchFn: this._fetchWithInit,
                }),
                await a.text?.().catch(() => {}),
                this._send(e, !0)
              );
            if ((await a.text?.().catch(() => {}), t))
              throw new SdkHttpError(
                Ti.ClientHttpAuthentication,
                "Server returned 401 after re-authentication",
                { status: 401, statusText: a.statusText },
              );
            throw new UnauthorizedError();
          }
          let n = await a.text?.().catch(() => null);
          throw Error(`Error POSTing to endpoint (HTTP ${a.status}): ${n}`);
        }
        await a.text?.().catch(() => {});
      } catch (error) {
        throw (this.onerror?.(error), error);
      }
    }
    setProtocolVersion(e) {
      this._protocolVersion = e;
    }
  },
  bh = 1,
  Rh = {
    initialReconnectionDelay: 1000,
    maxReconnectionDelay: 30000,
    reconnectionDelayGrowFactor: 1.5,
    maxRetries: 2,
  },
  zh = new Set([
    "authorization",
    "content-type",
    "mcp-protocol-version",
    "mcp-method",
    "mcp-name",
    "mcp-session-id",
  ]);
//@ chunk-r1g76qsy.js:321626-322076 esm-fingerprint
function pc(e, t) {
  if (typeof AbortSignal.any === "function") return AbortSignal.any([e, t]);
  let abortController = new AbortController();
  if (e.aborted) return (abortController.abort(e.reason), abortController.signal);
  if (t.aborted) return (abortController.abort(t.reason), abortController.signal);
  let s = () => {
    (e.removeEventListener("abort", a), t.removeEventListener("abort", n));
  };
  function a() {
    (s(), abortController.abort(e.reason));
  }
  function n() {
    (s(), abortController.abort(t.reason));
  }
  return (
    e.addEventListener("abort", a, { once: !0 }),
    t.addEventListener("abort", n, { once: !0 }),
    abortController.signal
  );
}
//@ chunk-r1g76qsy.js:322076-333766 esm-fingerprint
var Bdn = class {
  _abortController;
  _url;
  _resourceMetadataUrl;
  _scope;
  _requestInit;
  _authProvider;
  _oauthProvider;
  _skipIssuerMetadataValidation;
  _fetch;
  _fetchWithInit;
  _sessionId;
  _reconnectionOptions;
  _protocolVersion;
  _onInsufficientScope;
  _maxStepUpRetries;
  _serverRetryMs;
  _reconnectionScheduler;
  _cancelReconnection;
  onclose;
  onerror;
  onmessage;
  hasPerRequestStream = !0;
  constructor(e, t) {
    if (
      ((this._url = e),
      (this._resourceMetadataUrl = void 0),
      (this._scope = void 0),
      (this._requestInit = t?.requestInit),
      (this._skipIssuerMetadataValidation = t?.skipIssuerMetadataValidation),
      gc(t?.authProvider))
    )
      ((this._oauthProvider = t.authProvider),
        (this._authProvider = _c(t.authProvider, {
          skipIssuerMetadataValidation: t.skipIssuerMetadataValidation,
        })));
    else this._authProvider = t?.authProvider;
    ((this._fetch = t?.fetch),
      (this._fetchWithInit = MBt(t?.fetch, t?.requestInit)),
      (this._sessionId = t?.sessionId),
      (this._protocolVersion = t?.protocolVersion),
      (this._reconnectionOptions = t?.reconnectionOptions ?? Rh),
      (this._reconnectionScheduler = t?.reconnectionScheduler),
      (this._onInsufficientScope = t?.onInsufficientScope ?? "reauthorize"),
      (this._maxStepUpRetries = Math.max(0, t?.maxStepUpRetries ?? bh)));
  }
  async _stepUpAuthorize(e, t) {
    if (this._onInsufficientScope === "throw")
      throw new tc({
        requiredScope: e.scope,
        resourceMetadataUrl: e.resourceMetadataUrl,
        errorDescription: e.errorDescription,
      });
    if (!this._oauthProvider)
      throw new tc({
        requiredScope: e.scope,
        resourceMetadataUrl: e.resourceMetadataUrl,
        errorDescription: e.errorDescription,
      });
    if (t >= this._maxStepUpRetries)
      throw new SdkHttpError(
        Ti.ClientHttpForbidden,
        `Server returned 403 insufficient_scope after step-up re-authorization (retry limit ${this._maxStepUpRetries} reached)`,
        { status: 403, statusText: e.statusText ?? "Forbidden", text: e.text },
      );
    if (e.resourceMetadataUrl) this._resourceMetadataUrl = e.resourceMetadataUrl;
    let tokens = await this._oauthProvider.tokens(),
      s = Rn(this._scope, tokens?.scope, e.scope);
    this._scope = s;
    let a = qd(s, tokens?.scope);
    return DBt(this._oauthProvider, {
      serverUrl: this._url,
      resourceMetadataUrl: this._resourceMetadataUrl,
      scope: s,
      forceReauthorization: a,
      fetchFn: this._fetchWithInit,
      skipIssuerMetadataValidation: this._skipIssuerMetadataValidation,
    });
  }
  async _commonHeaders() {
    let e = {},
      t = await this._authProvider?.token();
    if (t) e.Authorization = `Bearer ${t}`;
    if (this._sessionId) e["mcp-session-id"] = this._sessionId;
    if (this._protocolVersion) e["mcp-protocol-version"] = this._protocolVersion;
    let r = to(this._requestInit?.headers);
    return new Headers({ ...e, ...r });
  }
  _applyBodyDerivedHeaders(e, t) {
    if (Array.isArray(t) || !fZ(t)) return;
    let r = t.params?._meta?.[IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION];
    if (typeof r !== "string") return;
    (e.set("mcp-protocol-version", r), e.set("mcp-method", t.method));
    let params = t.params,
      a =
        t.method === "resources/read"
          ? typeof params?.uri === "string"
            ? params.uri
            : void 0
          : typeof params?.name === "string"
            ? params.name
            : void 0;
    if (a !== void 0) e.set("mcp-name", ha(a));
    let n = t.method.startsWith("tasks/") && typeof params?.taskId === "string" ? params.taskId : void 0;
    if (n !== void 0) e.set("mcp-name", ha(n));
  }
  _isModernEnvelopedRequest(e) {
    if (Array.isArray(e) || !fZ(e)) return !1;
    let t = e.params?._meta?.[IO_MODELCONTEXTPROTOCOL_PROTOCOLVERSION];
    return typeof t === "string" && Be(t);
  }
  async _startOrAuthSse(e, t = !1, r = 0) {
    let { resumptionToken: resumptionToken, requestSignal: requestSignal } = e,
      n = () => this._abortController?.signal.aborted === !0 || requestSignal?.aborted === !0;
    try {
      let _commonHeaders = await this._commonHeaders(),
        l = [
          ...(_commonHeaders
            .get("accept")
            ?.split(",")
            .map((_) => _.trim().toLowerCase()) ?? []),
          "text/event-stream",
        ];
      if ((_commonHeaders.set("accept", [...new Set(l)].join(", ")), resumptionToken))
        _commonHeaders.set("last-event-id", resumptionToken);
      let c = this._abortController?.signal,
        d = requestSignal !== void 0 && c !== void 0 ? pc(c, requestSignal) : (requestSignal ?? c),
        m = await (this._fetch ?? fetch)(this._url, {
          ...this._requestInit,
          method: "GET",
          headers: _commonHeaders,
          signal: d,
        });
      if (!m.ok) {
        if (m.status === 401 && this._authProvider) {
          if (m.headers.has("www-authenticate")) {
            let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = Mze(m);
            ((this._resourceMetadataUrl = resourceMetadataUrl), (this._scope = Rn(this._scope, scope)));
          }
          if (this._authProvider.onUnauthorized && !t)
            return (
              await this._authProvider.onUnauthorized({
                response: m,
                serverUrl: this._url,
                fetchFn: this._fetchWithInit,
              }),
              await m.text?.().catch(() => {}),
              this._startOrAuthSse(e, !0, r)
            );
          if ((await m.text?.().catch(() => {}), t))
            throw new SdkHttpError(
              Ti.ClientHttpAuthentication,
              "Server returned 401 after re-authentication",
              { status: 401, statusText: m.statusText },
            );
          throw new UnauthorizedError();
        }
        if (m.status === 403) {
          let {
            resourceMetadataUrl: resourceMetadataUrl,
            scope: scope,
            error: error,
            errorDescription: errorDescription,
          } = Mze(m);
          if (error === "insufficient_scope") {
            let v = await m.text?.().catch(() => null);
            if (
              (await this._stepUpAuthorize(
                {
                  scope: scope,
                  resourceMetadataUrl: resourceMetadataUrl,
                  errorDescription: errorDescription,
                  statusText: m.statusText,
                  text: v,
                },
                r,
              )) !== "AUTHORIZED"
            )
              throw new UnauthorizedError();
            return this._startOrAuthSse(e, t, r + 1);
          }
        }
        if ((await m.text?.().catch(() => {}), m.status === 405)) {
          e.onRequestStreamEnd?.();
          return;
        }
        throw new SdkHttpError(
          Ti.ClientHttpFailedToOpenStream,
          `Failed to open SSE stream: ${m.statusText}`,
          { status: m.status, statusText: m.statusText },
        );
      }
      this._handleSseStream(m.body, e, !0);
    } catch (error) {
      if (!n()) this.onerror?.(error);
      throw error;
    }
  }
  _getNextReconnectionDelay(e) {
    if (this._serverRetryMs !== void 0) return this._serverRetryMs;
    let initialReconnectionDelay = this._reconnectionOptions.initialReconnectionDelay,
      reconnectionDelayGrowFactor = this._reconnectionOptions.reconnectionDelayGrowFactor,
      maxReconnectionDelay = this._reconnectionOptions.maxReconnectionDelay;
    return Math.min(
      initialReconnectionDelay * Math.pow(reconnectionDelayGrowFactor, e),
      maxReconnectionDelay,
    );
  }
  _scheduleReconnection(e, t = 0) {
    let maxRetries = this._reconnectionOptions.maxRetries;
    if (t >= maxRetries) {
      (this.onerror?.(Error(`Maximum reconnection attempts (${maxRetries}) exceeded.`)),
        e.onRequestStreamEnd?.());
      return;
    }
    let _getNextReconnectionDelay = this._getNextReconnectionDelay(t),
      a = () => {
        if (
          ((this._cancelReconnection = void 0),
          this._abortController?.signal.aborted || e.requestSignal?.aborted)
        )
          return;
        this._startOrAuthSse(e).catch((n) => {
          if (this._abortController?.signal.aborted || e.requestSignal?.aborted) return;
          this.onerror?.(
            Error(`Failed to reconnect SSE stream: ${n instanceof Error ? n.message : String(n)}`),
          );
          try {
            this._scheduleReconnection(e, t + 1);
          } catch (error) {
            this.onerror?.(error instanceof Error ? error : Error(String(error)));
          }
        });
      };
    if (this._reconnectionScheduler) {
      let _reconnectionScheduler = this._reconnectionScheduler(a, _getNextReconnectionDelay, t);
      this._cancelReconnection =
        typeof _reconnectionScheduler === "function" ? _reconnectionScheduler : void 0;
    } else {
      let n = setTimeout(a, _getNextReconnectionDelay);
      this._cancelReconnection = () => clearTimeout(n);
    }
  }
  _handleSseStream(e, t, r) {
    if (!e) {
      t.onRequestStreamEnd?.();
      return;
    }
    let {
        onresumptiontoken: onresumptiontoken,
        replayMessageId: replayMessageId,
        requestSignal: requestSignal,
        onRequestStreamEnd: onRequestStreamEnd,
      } = t,
      l = () => this._abortController?.signal.aborted === !0 || requestSignal?.aborted === !0,
      c,
      d = !1,
      m = !1;
    (async () => {
      try {
        let reader = e
          .pipeThrough(new TextDecoderStream())
          .pipeThrough(
            new gcn({
              onRetry: (P) => {
                this._serverRetryMs = P;
              },
            }),
          )
          .getReader();
        while (!0) {
          let { value: P, done: y } = await reader.read();
          if (y) break;
          if (P.id) ((c = P.id), (d = !0), onresumptiontoken?.(P.id));
          if (!P.data) continue;
          if (!P.event || P.event === "message")
            try {
              let v = Rt(JSON.parse(P.data));
              if (GAe(v) || zAe(v)) {
                if (((m = !0), replayMessageId !== void 0)) v.id = replayMessageId;
              }
              this.onmessage?.(v);
            } catch (error) {
              this.onerror?.(error);
            }
        }
        if ((r || d) && !m && this._abortController && !l())
          this._scheduleReconnection(
            {
              resumptionToken: c,
              onresumptiontoken: onresumptiontoken,
              replayMessageId: replayMessageId,
              requestSignal: requestSignal,
              onRequestStreamEnd: onRequestStreamEnd,
            },
            0,
          );
        else if (!l()) onRequestStreamEnd?.();
      } catch (error) {
        if (l()) return;
        if (
          (this.onerror?.(Error(`SSE stream disconnected: ${error}`)),
          (r || d) && !m && this._abortController && !l())
        )
          try {
            this._scheduleReconnection(
              {
                resumptionToken: c,
                onresumptiontoken: onresumptiontoken,
                replayMessageId: replayMessageId,
                requestSignal: requestSignal,
                onRequestStreamEnd: onRequestStreamEnd,
              },
              0,
            );
          } catch (error) {
            (this.onerror?.(
              Error(`Failed to reconnect: ${error instanceof Error ? error.message : String(error)}`),
            ),
              onRequestStreamEnd?.());
          }
        else onRequestStreamEnd?.();
      }
    })();
  }
  async start() {
    if (this._abortController)
      throw Error(
        "StreamableHTTPClientTransport already started! If using Client class, note that connect() calls start() automatically.",
      );
    this._abortController = new AbortController();
  }
  async finishAuth(e, t) {
    if (!this._oauthProvider) throw new UnauthorizedError("finishAuth requires an OAuthClientProvider");
    let { authorizationCode: authorizationCode, iss: iss } = await yc(e, t, this._oauthProvider, this._url, {
      fetchFn: this._fetchWithInit,
      resourceMetadataUrl: this._resourceMetadataUrl,
    });
    if (
      (await DBt(this._oauthProvider, {
        serverUrl: this._url,
        authorizationCode: authorizationCode,
        iss: iss,
        resourceMetadataUrl: this._resourceMetadataUrl,
        scope: this._scope,
        fetchFn: this._fetchWithInit,
        skipIssuerMetadataValidation: this._skipIssuerMetadataValidation,
      })) !== "AUTHORIZED"
    )
      throw new UnauthorizedError("Failed to authorize");
  }
  async close() {
    try {
      this._cancelReconnection?.();
    } finally {
      ((this._cancelReconnection = void 0), this._abortController?.abort(), this.onclose?.());
    }
  }
  async send(e, t) {
    return this._send(e, t, !1);
  }
  async _send(e, t, r, s = 0) {
    try {
      let { resumptionToken: resumptionToken, onresumptiontoken: onresumptiontoken } = t || {};
      if (resumptionToken) {
        this._startOrAuthSse({
          resumptionToken: resumptionToken,
          replayMessageId: fZ(e) ? e.id : void 0,
          requestSignal: t?.requestSignal,
        }).catch((p) => this.onerror?.(p));
        return;
      }
      let _commonHeaders = await this._commonHeaders();
      this._applyBodyDerivedHeaders(_commonHeaders, e);
      let l = Array.isArray(e) ? e.some((p) => lYn(p)) : lYn(e);
      if (l) _commonHeaders.delete("mcp-session-id");
      if (t?.headers !== void 0)
        for (let [p, h] of Object.entries(t.headers)) {
          if (zh.has(p.toLowerCase())) continue;
          _commonHeaders.set(p, h);
        }
      _commonHeaders.set("content-type", "application/json");
      let c = [
        ...(_commonHeaders
          .get("accept")
          ?.split(",")
          .map((p) => p.trim().toLowerCase()) ?? []),
        "application/json",
        "text/event-stream",
      ];
      _commonHeaders.set("accept", [...new Set(c)].join(", "));
      let d = this._abortController?.signal,
        m = t?.requestSignal !== void 0 && d !== void 0 ? pc(d, t.requestSignal) : (t?.requestSignal ?? d),
        _ = {
          ...this._requestInit,
          method: "POST",
          headers: _commonHeaders,
          body: JSON.stringify(e),
          signal: m,
        },
        w = await (this._fetch ?? fetch)(this._url, _);
      if (l && w.ok) this._sessionId = w.headers.get("mcp-session-id") || void 0;
      if (!w.ok) {
        if (w.status === 401 && this._authProvider) {
          if (w.headers.has("www-authenticate")) {
            let { resourceMetadataUrl: resourceMetadataUrl, scope: scope } = Mze(w);
            ((this._resourceMetadataUrl = resourceMetadataUrl), (this._scope = Rn(this._scope, scope)));
          }
          if (this._authProvider.onUnauthorized && !r)
            return (
              await this._authProvider.onUnauthorized({
                response: w,
                serverUrl: this._url,
                fetchFn: this._fetchWithInit,
              }),
              await w.text?.().catch(() => {}),
              this._send(e, t, !0, s)
            );
          if ((await w.text?.().catch(() => {}), r))
            throw new SdkHttpError(
              Ti.ClientHttpAuthentication,
              "Server returned 401 after re-authentication",
              { status: 401, statusText: w.statusText },
            );
          throw new UnauthorizedError();
        }
        let p = await w.text?.().catch(() => null);
        if (w.status === 403) {
          let {
            resourceMetadataUrl: resourceMetadataUrl,
            scope: scope,
            error: error,
            errorDescription: errorDescription,
          } = Mze(w);
          if (error === "insufficient_scope") {
            if (
              (await this._stepUpAuthorize(
                {
                  scope: scope,
                  resourceMetadataUrl: resourceMetadataUrl,
                  errorDescription: errorDescription,
                  statusText: w.statusText,
                  text: p,
                },
                s,
              )) !== "AUTHORIZED"
            )
              throw new UnauthorizedError();
            return this._send(e, t, r, s + 1);
          }
        }
        if (w.status === 400 && typeof p === "string" && this._isModernEnvelopedRequest(e))
          try {
            let h = Rt(JSON.parse(p)),
              filtered = (Array.isArray(e) ? e : [e]).filter((f) => fZ(f));
            if (zAe(h) && filtered.some((f) => f.id === h.id)) {
              this.onmessage?.(h);
              return;
            }
          } catch {}
        throw new SdkHttpError(Ti.ClientHttpNotImplemented, `Error POSTing to endpoint: ${p}`, {
          status: w.status,
          statusText: w.statusText,
          text: p,
        });
      }
      if (w.status === 202) {
        if ((await w.text?.().catch(() => {}), qNr(e)))
          this._startOrAuthSse({ resumptionToken: void 0 }).catch((p) => this.onerror?.(p));
        return;
      }
      let any = (Array.isArray(e) ? e : [e]).some((p) => "method" in p && "id" in p && p.id !== void 0),
        y = w.headers.get("content-type"),
        v = Oi(y);
      if (any)
        if (v === "text/event-stream")
          this._handleSseStream(
            w.body,
            {
              onresumptiontoken: onresumptiontoken,
              requestSignal: t?.requestSignal,
              onRequestStreamEnd: t?.onRequestStreamEnd,
            },
            !1,
          );
        else if (v === "application/json") {
          let body = await w.json(),
            h = Array.isArray(body) ? body.map((S) => Rt(S)) : [Rt(body)];
          for (let S of h) this.onmessage?.(S);
        } else
          throw (
            await w.text?.().catch(() => {}),
            new SdkError(Ti.ClientHttpUnexpectedContent, `Unexpected content type: ${y}`, { contentType: y })
          );
      else await w.text?.().catch(() => {});
    } catch (error) {
      if (t?.requestSignal?.aborted !== !0) this.onerror?.(error);
      throw error;
    }
  }
  get sessionId() {
    return this._sessionId;
  }
  async terminateSession() {
    if (!this._sessionId) return;
    try {
      let _commonHeaders = await this._commonHeaders(),
        t = {
          ...this._requestInit,
          method: "DELETE",
          headers: _commonHeaders,
          signal: this._abortController?.signal,
        },
        r = await (this._fetch ?? fetch)(this._url, t);
      if ((await r.text?.().catch(() => {}), !r.ok && r.status !== 405))
        throw new SdkHttpError(
          Ti.ClientHttpFailedToTerminateSession,
          `Failed to terminate session: ${r.statusText}`,
          { status: r.status, statusText: r.statusText },
        );
      this._sessionId = void 0;
    } catch (error) {
      throw (this.onerror?.(error), error);
    }
  }
  setProtocolVersion(e) {
    this._protocolVersion = e;
  }
  get protocolVersion() {
    return this._protocolVersion;
  }
  async resumeStream(e, t) {
    await this._startOrAuthSse({ resumptionToken: e, onresumptiontoken: t?.onresumptiontoken });
  }
};
/**
 * requestJwtAuthorizationGrant：RFC 8693 token exchange（subject_token=id_token，requested_token_type=id-jag），失败抛 XaaTokenExchangeError（4xx 时 shouldClearIdToken）。
 */
//@ chunk-1kaj6e83.js:4349-5464 esm-fingerprint
async function qe(e) {
  let t = e.fetchFn ?? defaultXaaFetch,
    uRLSearchParams = new URLSearchParams({
      grant_type: TOKEN_EXCHANGE_GRANT,
      requested_token_type: ID_JAG_TOKEN_TYPE,
      audience: e.audience,
      resource: e.resource,
      subject_token: e.idToken,
      subject_token_type: ID_TOKEN_TYPE,
      client_id: e.clientId,
    });
  if (e.clientSecret) uRLSearchParams.set("client_secret", e.clientSecret);
  if (e.scope) uRLSearchParams.set("scope", e.scope);
  let n = await t(e.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: uRLSearchParams,
  });
  if (!n.ok) {
    let sliced = redactTokens(await n.text()).slice(0, 200),
      v = n.status < 500;
    throw new XaaTokenExchangeError(`XAA: token exchange failed: HTTP ${n.status}: ${sliced}`, v);
  }
  let s;
  try {
    s = await n.json();
  } catch {
    throw new XaaTokenExchangeError(
      `XAA: token exchange returned non-JSON (captive portal?) at ${redactUrlSecrets(e.tokenEndpoint)}`,
      !1,
    );
  }
  let safeParse = TokenExchangeResponseSchema().safeParse(s);
  if (!safeParse.success)
    throw new XaaTokenExchangeError(
      `XAA: token exchange response did not match expected shape: ${redactTokens(s)}`,
      !0,
    );
  let l = safeParse.data;
  if (!l.access_token)
    throw new XaaTokenExchangeError(
      `XAA: token exchange response missing access_token: ${redactTokens(l)}`,
      !0,
    );
  if (l.issued_token_type !== ID_JAG_TOKEN_TYPE)
    throw new XaaTokenExchangeError(
      `XAA: token exchange returned unexpected issued_token_type: ${l.issued_token_type}`,
      !0,
    );
  return { jwtAuthGrant: l.access_token, expiresIn: l.expires_in, scope: l.scope };
}
//@ chunk-1ny7cxrt.js:1387514-1387570 esm-fingerprint
var Wz = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
/**
 * requestJwtAuthorizationGrant（v2 副本）。
 */
//@ chunk-n1aavqzh.js:4420-5535 esm-fingerprint
async function et_2(e) {
  let t = e.fetchFn ?? defaultXaaFetch_2,
    uRLSearchParams = new URLSearchParams({
      grant_type: TOKEN_EXCHANGE_GRANT_2,
      requested_token_type: ID_JAG_TOKEN_TYPE_2,
      audience: e.audience,
      resource: e.resource,
      subject_token: e.idToken,
      subject_token_type: ID_TOKEN_TYPE_2,
      client_id: e.clientId,
    });
  if (e.clientSecret) uRLSearchParams.set("client_secret", e.clientSecret);
  if (e.scope) uRLSearchParams.set("scope", e.scope);
  let r = await t(e.tokenEndpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: uRLSearchParams,
  });
  if (!r.ok) {
    let sliced = redactTokens_2(await r.text()).slice(0, 200),
      l = r.status < 500;
    throw new XaaTokenExchangeError_2(`XAA: token exchange failed: HTTP ${r.status}: ${sliced}`, l);
  }
  let s;
  try {
    s = await r.json();
  } catch {
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange returned non-JSON (captive portal?) at ${redactUrlSecrets(e.tokenEndpoint)}`,
      !1,
    );
  }
  let safeParse = TokenExchangeResponseSchema_2().safeParse(s);
  if (!safeParse.success)
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange response did not match expected shape: ${redactTokens_2(s)}`,
      !0,
    );
  let h = safeParse.data;
  if (!h.access_token)
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange response missing access_token: ${redactTokens_2(h)}`,
      !0,
    );
  if (h.issued_token_type !== ID_JAG_TOKEN_TYPE_2)
    throw new XaaTokenExchangeError_2(
      `XAA: token exchange returned unexpected issued_token_type: ${h.issued_token_type}`,
      !0,
    );
  return { jwtAuthGrant: h.access_token, expiresIn: h.expires_in, scope: h.scope };
}

export {
  UnauthorizedError,
  Bdn,
  dYn,
  cLo,
  ZNr,
  qe,
  et_2,
  D_t,
  XNr,
  QNr,
  LBt,
  DBt,
  Mze,
  dLo,
  Wz,
  lLo,
  fzs,
  JNr,
};
