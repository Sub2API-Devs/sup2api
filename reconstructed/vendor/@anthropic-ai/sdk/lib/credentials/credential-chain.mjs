/**
 * @anthropic-ai/sdk/lib/credentials/credential-chain.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (5)
 * attribution: esm-fingerprint 5
 */
import { O, S, gAn } from "../../core/credentials.mjs";
import { rp, rMn, hMt, v8e } from "./types.mjs";
import { j } from "./oidc-federation.mjs";
import { z } from "./user-oauth.mjs";
import { P, V } from "./identity-token.mjs";
import { cS } from "../../internal/utils/env.mjs";
import { y } from "./token-cache.mjs";

//@ chunk-3wydcdvj.js:11752-12040 esm-fingerprint
function resolveCredentialsFromConfig(e, n) {
  let r = e.authentication.credentials_path ?? null,
    replaced = (e.base_url || n.baseURL).replace(/\/+$/, ""),
    o = se(e, r, replaced, n),
    u = {};
  if (e.workspace_id && e.authentication.type === "user_oauth") u["anthropic-workspace-id"] = e.workspace_id;
  return { provider: o, extraHeaders: u, baseURL: e.base_url || void 0 };
}
//@ chunk-3wydcdvj.js:12040-12266 esm-fingerprint
async function wbi(e, n) {
  let r = await O(n);
  if (!r) return null;
  let { config: config, fromFile: fromFile } = r,
    u =
      config.authentication.credentials_path || !fromFile
        ? config
        : {
            ...config,
            authentication: { ...config.authentication, credentials_path: (await S(config, n)) ?? void 0 },
          };
  return resolveCredentialsFromConfig(u, e);
}
//@ chunk-3wydcdvj.js:12266-13631 esm-fingerprint
function se(e, n, r, s) {
  switch (e.authentication.type) {
    case "oidc_federation": {
      let authentication = e.authentication,
        u = ae(authentication);
      if (!u)
        throw new rp(
          "oidc_federation config requires an identity token (set authentication.identity_token, ANTHROPIC_IDENTITY_TOKEN_FILE, or ANTHROPIC_IDENTITY_TOKEN)",
        );
      if (!authentication.federation_rule_id)
        throw new rp(
          "oidc_federation config requires 'federation_rule_id'. Set it in authentication.federation_rule_id in your profile, or via ANTHROPIC_FEDERATION_RULE_ID (profile takes precedence).",
        );
      if (!e.organization_id)
        throw new rp(
          "oidc_federation config requires organization_id (set ANTHROPIC_ORGANIZATION_ID or config.organization_id)",
        );
      let f = j({
        identityTokenProvider: u,
        federationRuleId: authentication.federation_rule_id,
        organizationId: e.organization_id,
        serviceAccountId: authentication.service_account_id,
        workspaceId: e.workspace_id,
        baseURL: r,
        fetch: s.fetch,
        userAgent: s.userAgent,
      });
      if (n) return ce(f, n, s.onCacheWriteError, s.onSafetyWarning);
      return f;
    }
    case "user_oauth": {
      if (!n)
        throw new rp(
          "user_oauth config requires authentication.credentials_path (or load via a profile so it defaults to <config_dir>/credentials/<profile>.json)",
        );
      return z({
        credentialsPath: n,
        clientId: e.authentication.client_id,
        baseURL: r,
        fetch: s.fetch,
        userAgent: s.userAgent,
        onSafetyWarning: s.onSafetyWarning,
      });
    }
    default: {
      let o = e.authentication.type;
      throw new rp(`authentication.type "${o}" is not a known authentication type`);
    }
  }
}
//@ chunk-3wydcdvj.js:13631-14061 esm-fingerprint
function ae(e) {
  if (e.identity_token) {
    let source = e.identity_token.source;
    if (source !== "file")
      throw new rp(`identity_token.source "${source}" is not supported by this SDK version (only "file")`);
    if (!e.identity_token.path) throw new rp('identity_token.source "file" requires a non-empty path');
    return P(e.identity_token.path);
  }
  let n = cS("ANTHROPIC_IDENTITY_TOKEN_FILE");
  if (n) return P(n);
  let r = cS("ANTHROPIC_IDENTITY_TOKEN");
  if (r) return V(r);
  return null;
}
//@ chunk-3wydcdvj.js:14061-14566 esm-fingerprint
function ce(e, n, r, s) {
  return async (o) => {
    let { fs: fs } = await import("./chunk-a60jm9e8.js");
    await rMn(n, s);
    let f;
    try {
      let content = await fs.promises.readFile(n, "utf-8");
      f = JSON.parse(content);
      let p = f?.access_token;
      if (p && !o?.forceRefresh) {
        let w = f?.expires_at;
        if (w == null || y() < w - hMt) return { token: p, expiresAt: w ?? null };
      }
    } catch (error) {
      if (error?.code !== "ENOENT" && !(error instanceof SyntaxError)) r?.(error);
    }
    let h = await e(o);
    try {
      await v8e(n, {
        ...(f ?? {}),
        version: gAn,
        type: "oauth_token",
        access_token: h.token,
        expires_at: h.expiresAt,
      });
    } catch (error) {
      r?.(error);
    }
    return h;
  };
}

export { resolveCredentialsFromConfig, wbi };
