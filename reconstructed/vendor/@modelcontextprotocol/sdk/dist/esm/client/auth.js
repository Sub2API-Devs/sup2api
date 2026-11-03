/**
 * @modelcontextprotocol/sdk/dist/esm/client/auth.js
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @modelcontextprotocol/sdk@1.29.0
 * pieces: chunk-9z4e25ww.js (31)
 * attribution: esm-fingerprint 29, esm-layout 2
 */
import { R$r, F, KYn, A$r, strip, merge } from "../shared/auth.js";
import { K, Jze, g, w, J_t, z, TM } from "../server/auth/errors.js";
import { J, Y } from "../shared/auth-utils.js";
import { LATEST_PROTOCOL_VERSION } from "../types.js";
import { hcn } from "../../../../../pkce-challenge/dist/index.node.js";

//@ chunk-9z4e25ww.js:6666-6730 esm-fingerprint
class AM extends Error {
  constructor(e) {
    super(e ?? "Unauthorized");
  }
}
//@ chunk-9z4e25ww.js:6730-6815 esm-fingerprint
function ie(e) {
  return ["client_secret_basic", "client_secret_post", "none"].includes(e);
}
//@ chunk-9z4e25ww.js:6815-6837 esm-fingerprint
var CODE = "code",
  S256 = "S256";
//@ chunk-9z4e25ww.js:6837-7339 esm-fingerprint
function ce(e, t) {
  let r = e.client_secret !== void 0;
  if (
    "token_endpoint_auth_method" in e &&
    e.token_endpoint_auth_method &&
    ie(e.token_endpoint_auth_method) &&
    (t.length === 0 || t.includes(e.token_endpoint_auth_method))
  )
    return e.token_endpoint_auth_method;
  if (t.length === 0) return r ? "client_secret_basic" : "none";
  if (r && t.includes("client_secret_basic")) return "client_secret_basic";
  if (r && t.includes("client_secret_post")) return "client_secret_post";
  if (t.includes("none")) return "none";
  return r ? "client_secret_post" : "none";
}
//@ chunk-9z4e25ww.js:7339-7587 esm-fingerprint
function ue(e, t, r, n) {
  let { client_id: client_id, client_secret: client_secret } = t;
  switch (e) {
    case "client_secret_basic":
      le(client_id, client_secret, r);
      return;
    case "client_secret_post":
      pe(client_id, client_secret, n);
      return;
    case "none":
      de(client_id, n);
      return;
    default:
      throw Error(`Unsupported client authentication method: ${e}`);
  }
}
//@ chunk-9z4e25ww.js:7587-7747 esm-fingerprint
function le(e, t, r) {
  if (!t) throw Error("client_secret_basic authentication requires a client_secret");
  let n = btoa(`${e}:${t}`);
  r.set("Authorization", `Basic ${n}`);
}
//@ chunk-9z4e25ww.js:7747-7817 esm-fingerprint
function pe(e, t, r) {
  if ((r.set("client_id", e), t)) r.set("client_secret", t);
}
//@ chunk-9z4e25ww.js:7817-7855 esm-fingerprint
function de(e, t) {
  t.set("client_id", e);
}
//@ chunk-9z4e25ww.js:7855-8178 esm-fingerprint
async function X(e) {
  let t = e instanceof Response ? e.status : void 0,
    r = e instanceof Response ? await e.text() : e;
  try {
    let parse = R$r.parse(JSON.parse(r)),
      { error: error, error_description: error_description, error_uri: error_uri } = parse;
    return new (K[error] || Jze)(error_description || "", error_uri);
  } catch (error) {
    let a = `${t ? `HTTP ${t}: ` : ""}Invalid OAuth error response: ${error}. Raw body: ${r}`;
    return new Jze(a);
  }
}
//@ chunk-9z4e25ww.js:8178-8424 esm-fingerprint
async function Aue(e, t) {
  try {
    return await W(e, t);
  } catch (error) {
    if (error instanceof g || error instanceof w)
      return (await e.invalidateCredentials?.("all"), await W(e, t));
    else if (error instanceof J_t) return (await e.invalidateCredentials?.("tokens"), await W(e, t));
    throw error;
  }
}
//@ chunk-9z4e25ww.js:8424-10757 esm-fingerprint
async function W(
  e,
  {
    serverUrl: serverUrl,
    authorizationCode: authorizationCode,
    scope: scope,
    resourceMetadataUrl: resourceMetadataUrl,
    fetchFn: fetchFn,
  },
) {
  let c = await e.discoveryState?.(),
    s,
    l,
    p,
    h = resourceMetadataUrl;
  if (!h && c?.resourceMetadataUrl) h = new URL(c.resourceMetadataUrl);
  if (c?.authorizationServerUrl) {
    if (
      ((l = c.authorizationServerUrl),
      (s = c.resourceMetadata),
      (p = c.authorizationServerMetadata ?? (await s1t(l, { fetchFn: fetchFn }))),
      !s)
    )
      try {
        s = await x$r(serverUrl, { resourceMetadataUrl: h }, fetchFn);
      } catch {}
    if (p !== c.authorizationServerMetadata || s !== c.resourceMetadata)
      await e.saveDiscoveryState?.({
        authorizationServerUrl: String(l),
        resourceMetadataUrl: h?.toString(),
        resourceMetadata: s,
        authorizationServerMetadata: p,
      });
  } else {
    let _ = await QLo(serverUrl, { resourceMetadataUrl: h, fetchFn: fetchFn });
    ((l = _.authorizationServerUrl),
      (p = _.authorizationServerMetadata),
      (s = _.resourceMetadata),
      await e.saveDiscoveryState?.({
        authorizationServerUrl: String(l),
        resourceMetadataUrl: h?.toString(),
        resourceMetadata: s,
        authorizationServerMetadata: p,
      }));
  }
  let m = await he(serverUrl, e, s),
    D = scope || s?.scopes_supported?.join(" ") || e.clientMetadata.scope,
    resolved = await Promise.resolve(e.clientInformation());
  if (!resolved) {
    if (authorizationCode !== void 0)
      throw Error("Existing OAuth client information is required when exchanging an authorization code");
    let _ = p?.client_id_metadata_document_supported === !0,
      clientMetadataUrl = e.clientMetadataUrl;
    if (clientMetadataUrl && !_e(clientMetadataUrl))
      throw new z(
        `clientMetadataUrl must be a valid HTTPS URL with a non-root pathname, got: ${clientMetadataUrl}`,
      );
    if (_ && clientMetadataUrl)
      ((resolved = { client_id: clientMetadataUrl }), await e.saveClientInformation?.(resolved));
    else {
      if (!e.saveClientInformation)
        throw Error("OAuth client information must be saveable for dynamic registration");
      let N = await ye(l, { metadata: p, clientMetadata: e.clientMetadata, scope: D, fetchFn: fetchFn });
      (await e.saveClientInformation(N), (resolved = N));
    }
  }
  let ee = !e.redirectUrl;
  if (authorizationCode !== void 0 || ee) {
    let _ = await me(e, l, {
      metadata: p,
      resource: m,
      authorizationCode: authorizationCode,
      fetchFn: fetchFn,
    });
    return (await e.saveTokens(_), "AUTHORIZED");
  }
  let tokens = await e.tokens();
  if (tokens?.refresh_token)
    try {
      let _ = await eHo(l, {
        metadata: p,
        clientInformation: resolved,
        refreshToken: tokens.refresh_token,
        resource: m,
        addClientAuthentication: e.addClientAuthentication,
        fetchFn: fetchFn,
      });
      return (await e.saveTokens(_), "AUTHORIZED");
    } catch (error) {
      if (!(error instanceof TM) || error instanceof Jze);
      else throw error;
    }
  let te = e.state ? await e.state() : void 0,
    { authorizationUrl: authorizationUrl, codeVerifier: codeVerifier } = await ZLo(l, {
      metadata: p,
      clientInformation: resolved,
      state: te,
      redirectUrl: e.redirectUrl,
      scope: D,
      resource: m,
    });
  return (
    await e.saveCodeVerifier(codeVerifier),
    await e.redirectToAuthorization(authorizationUrl),
    "REDIRECT"
  );
}
//@ chunk-9z4e25ww.js:10757-10871 esm-fingerprint
function _e(e) {
  if (!e) return !1;
  try {
    let t = new URL(e);
    return t.protocol === "https:" && t.pathname !== "/";
  } catch {
    return !1;
  }
}
//@ chunk-9z4e25ww.js:10871-11170 esm-fingerprint
async function he(e, t, r) {
  let n = J(e);
  if (t.validateResourceURL) return await t.validateResourceURL(n, r?.resource);
  if (!r) return;
  if (!Y({ requestedResource: n, configuredResource: r.resource }))
    throw Error(`Protected resource ${r.resource} does not match expected ${n} (or origin)`);
  return new URL(r.resource);
}
//@ chunk-9z4e25ww.js:11170-11472 esm-fingerprint
function NHe(e) {
  let t = e.headers.get("WWW-Authenticate");
  if (!t) return {};
  let [r, n] = t.split(" ");
  if (r.toLowerCase() !== "bearer" || !n) return {};
  let a = H(e, "resource_metadata") || void 0,
    i;
  if (a)
    try {
      i = new URL(a);
    } catch {}
  let c = H(e, "scope") || void 0,
    s = H(e, "error") || void 0;
  return { resourceMetadataUrl: i, scope: c, error: s };
}
//@ chunk-9z4e25ww.js:11472-11644 esm-fingerprint
function H(e, t) {
  let r = e.headers.get("WWW-Authenticate");
  if (!r) return null;
  let regExp = new RegExp(`${t}=(?:"([^"]+)"|([^\\s,]+))`),
    match = r.match(regExp);
  if (match) return match[1] || match[2];
  return null;
}
//@ chunk-9z4e25ww.js:11644-12086 esm-fingerprint
async function x$r(e, t, r = fetch) {
  let n = await we(e, "oauth-protected-resource", r, {
    protocolVersion: t?.protocolVersion,
    metadataUrl: t?.resourceMetadataUrl,
  });
  if (!n || n.status === 404)
    throw (
      await n?.body?.cancel(),
      Error("Resource server does not implement OAuth 2.0 Protected Resource Metadata.")
    );
  if (!n.ok)
    throw (
      await n.body?.cancel(),
      Error(`HTTP ${n.status} trying to load well-known OAuth protected resource metadata.`)
    );
  return F.parse(await n.json());
}
//@ chunk-9z4e25ww.js:12086-12232 esm-layout
async function q(e, t, r = fetch) {
  try {
    return await r(e, { headers: t });
  } catch (error) {
    if (error instanceof TypeError)
      if (t) return q(e, void 0, r);
      else return;
    throw error;
  }
}
//@ chunk-9z4e25ww.js:12232-12365 esm-fingerprint
function fe(e, t = "", r = {}) {
  if (t.endsWith("/")) t = t.slice(0, -1);
  return r.prependPathname ? `${t}/.well-known/${e}` : `/.well-known/${e}${t}`;
}
//@ chunk-9z4e25ww.js:12365-12442 esm-fingerprint
async function Q(e, t, r = fetch) {
  return await q(e, { "MCP-Protocol-Version": t }, r);
}
//@ chunk-9z4e25ww.js:12442-12506 esm-layout
function ge(e, t) {
  return !e || (e.status >= 400 && e.status < 500 && t !== "/");
}
//@ chunk-9z4e25ww.js:12506-12826 esm-fingerprint
async function we(e, t, r, n) {
  let a = new URL(e),
    i = n?.protocolVersion ?? LATEST_PROTOCOL_VERSION,
    c;
  if (n?.metadataUrl) c = new URL(n.metadataUrl);
  else {
    let l = fe(t, a.pathname);
    ((c = new URL(l, n?.metadataServerUrl ?? a)), (c.search = a.search));
  }
  let s = await Q(c, i, r);
  if (!n?.metadataUrl && ge(s, a.pathname)) {
    let l = new URL(`/.well-known/${t}`, a);
    s = await Q(l, i, r);
  }
  return s;
}
//@ chunk-9z4e25ww.js:12826-13406 esm-fingerprint
function ze(e) {
  let t = typeof e === "string" ? new URL(e) : e,
    r = t.pathname !== "/",
    n = [];
  if (!r)
    return (
      n.push({ url: new URL("/.well-known/oauth-authorization-server", t.origin), type: "oauth" }),
      n.push({ url: new URL("/.well-known/openid-configuration", t.origin), type: "oidc" }),
      n
    );
  let pathname = t.pathname;
  if (pathname.endsWith("/")) pathname = pathname.slice(0, -1);
  return (
    n.push({ url: new URL(`/.well-known/oauth-authorization-server${pathname}`, t.origin), type: "oauth" }),
    n.push({ url: new URL(`/.well-known/openid-configuration${pathname}`, t.origin), type: "oidc" }),
    n.push({ url: new URL(`${pathname}/.well-known/openid-configuration`, t.origin), type: "oidc" }),
    n
  );
}
//@ chunk-9z4e25ww.js:13406-13874 esm-fingerprint
async function s1t(e, { fetchFn: t = fetch, protocolVersion: r = LATEST_PROTOCOL_VERSION } = {}) {
  let n = { "MCP-Protocol-Version": r, Accept: "application/json" },
    a = ze(e);
  for (let { url: url, type: c } of a) {
    let s = await q(url, n, t);
    if (!s) continue;
    if (!s.ok) {
      if ((await s.body?.cancel(), s.status >= 400 && s.status < 500)) continue;
      throw Error(
        `HTTP ${s.status} trying to load ${c === "oauth" ? "OAuth" : "OpenID provider"} metadata from ${url}`,
      );
    }
    if (c === "oauth") return KYn.parse(await s.json());
    else return A$r.parse(await s.json());
  }
  return;
}
//@ chunk-9z4e25ww.js:13874-14231 esm-fingerprint
async function QLo(e, t) {
  let r, n;
  try {
    if (
      ((r = await x$r(e, { resourceMetadataUrl: t?.resourceMetadataUrl }, t?.fetchFn)),
      r.authorization_servers && r.authorization_servers.length > 0)
    )
      n = r.authorization_servers[0];
  } catch {}
  if (!n) n = String(new URL("/", e));
  let a = await s1t(n, { fetchFn: t?.fetchFn });
  return { authorizationServerUrl: n, authorizationServerMetadata: a, resourceMetadata: r };
}
//@ chunk-9z4e25ww.js:14231-15195 esm-fingerprint
async function ZLo(
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
  let s;
  if (metadata) {
    if (((s = new URL(metadata.authorization_endpoint)), !metadata.response_types_supported.includes(CODE)))
      throw Error(`Incompatible auth server: does not support response type ${CODE}`);
    if (
      metadata.code_challenge_methods_supported &&
      !metadata.code_challenge_methods_supported.includes(S256)
    )
      throw Error(`Incompatible auth server: does not support code challenge method ${S256}`);
  } else s = new URL("/authorize", e);
  let l = await hcn(),
    { code_verifier: code_verifier, code_challenge: code_challenge } = l;
  if (
    (s.searchParams.set("response_type", CODE),
    s.searchParams.set("client_id", clientInformation.client_id),
    s.searchParams.set("code_challenge", code_challenge),
    s.searchParams.set("code_challenge_method", S256),
    s.searchParams.set("redirect_uri", String(redirectUrl)),
    state)
  )
    s.searchParams.set("state", state);
  if (scope) s.searchParams.set("scope", scope);
  if (scope?.includes("offline_access")) s.searchParams.append("prompt", "consent");
  if (resource) s.searchParams.set("resource", resource.href);
  return { authorizationUrl: s, codeVerifier: code_verifier };
}
//@ chunk-9z4e25ww.js:15195-15321 esm-fingerprint
function G(e, t, r) {
  return new URLSearchParams({
    grant_type: "authorization_code",
    code: e,
    code_verifier: t,
    redirect_uri: String(r),
  });
}
//@ chunk-9z4e25ww.js:15321-15859 esm-fingerprint
async function I(
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
  let s = metadata?.token_endpoint ? new URL(metadata.token_endpoint) : new URL("/token", e),
    headers = new Headers({
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    });
  if (resource) tokenRequestParams.set("resource", resource.href);
  if (addClientAuthentication) await addClientAuthentication(headers, tokenRequestParams, s, metadata);
  else if (clientInformation) {
    let h = metadata?.token_endpoint_auth_methods_supported ?? [],
      m = ce(clientInformation, h);
    ue(m, clientInformation, headers, tokenRequestParams);
  }
  let p = await (fetchFn ?? fetch)(s, { method: "POST", headers: headers, body: tokenRequestParams });
  if (!p.ok) throw await X(p);
  return strip.parse(await p.json());
}
//@ chunk-9z4e25ww.js:15859-16138 esm-fingerprint
async function r2s(
  e,
  {
    metadata: metadata,
    clientInformation: clientInformation,
    authorizationCode: authorizationCode,
    codeVerifier: codeVerifier,
    redirectUri: redirectUri,
    resource: resource,
    addClientAuthentication: addClientAuthentication,
    fetchFn: fetchFn,
  },
) {
  let p = G(authorizationCode, codeVerifier, redirectUri);
  return I(e, {
    metadata: metadata,
    tokenRequestParams: p,
    clientInformation: clientInformation,
    addClientAuthentication: addClientAuthentication,
    resource: resource,
    fetchFn: fetchFn,
  });
}
//@ chunk-9z4e25ww.js:16138-16470 esm-fingerprint
async function eHo(
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
  let uRLSearchParams = new URLSearchParams({ grant_type: "refresh_token", refresh_token: refreshToken }),
    l = await I(e, {
      metadata: metadata,
      tokenRequestParams: uRLSearchParams,
      clientInformation: clientInformation,
      addClientAuthentication: addClientAuthentication,
      resource: resource,
      fetchFn: fetchFn,
    });
  return { refresh_token: refreshToken, ...l };
}
//@ chunk-9z4e25ww.js:16470-17054 esm-fingerprint
async function me(e, t, { metadata: r, resource: n, authorizationCode: a, fetchFn: i } = {}) {
  let scope = e.clientMetadata.scope,
    s;
  if (e.prepareTokenRequest) s = await e.prepareTokenRequest(scope);
  if (!s) {
    if (!a) throw Error("Either provider.prepareTokenRequest() or authorizationCode is required");
    if (!e.redirectUrl) throw Error("redirectUrl is required for authorization_code flow");
    let codeVerifier = await e.codeVerifier();
    s = G(a, codeVerifier, e.redirectUrl);
  }
  let clientInformation = await e.clientInformation();
  return I(t, {
    metadata: r,
    tokenRequestParams: s,
    clientInformation: clientInformation ?? void 0,
    addClientAuthentication: e.addClientAuthentication,
    resource: n,
    fetchFn: i,
  });
}
//@ chunk-9z4e25ww.js:17054-17511 esm-fingerprint
async function ye(e, { metadata: metadata, clientMetadata: clientMetadata, scope: scope, fetchFn: fetchFn }) {
  let i;
  if (metadata) {
    if (!metadata.registration_endpoint)
      throw Error("Incompatible auth server: does not support dynamic client registration");
    i = new URL(metadata.registration_endpoint);
  } else i = new URL("/register", e);
  let c = await (fetchFn ?? fetch)(i, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...clientMetadata, ...(scope !== void 0 ? { scope: scope } : {}) }),
  });
  if (!c.ok) throw await X(c);
  return merge.parse(await c.json());
}

export { AM, x$r, s1t, QLo, Aue, NHe, eHo, ZLo, r2s };
