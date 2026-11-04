/**
 * @anthropic-ai/sdk/lib/credentials/credential-chain.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (5)
 * attribution: esm-fingerprint 5
 */
import {
  loadConfigWithSource,
  getRootConfigPath,
  CREDENTIALS_FILE_VERSION,
} from "../../core/credentials.mjs";
import {
  WorkloadIdentityError,
  checkCredentialsFileSafety,
  MAX_FEDERATION_TOKEN_TTL_SECONDS,
  writeCredentialsFileAtomic,
} from "./types.mjs";
import { oidcFederationProvider } from "./oidc-federation.mjs";
import { userOAuthProvider } from "./user-oauth.mjs";
import { identityTokenFromFile, identityTokenFromValue } from "./identity-token.mjs";
import { readEnv } from "../../internal/utils/env.mjs";
import { nowSeconds } from "./token-cache.mjs";

//@ chunk-3wydcdvj.js:11752-12040 esm-fingerprint
function resolveCredentialsFromConfig(config, options) {
  let credentialsPath = config.authentication.credentials_path ?? null;
  let effectiveBaseURL = (config.base_url || options.baseURL).replace(/\/+$/, "");
  let provider = buildProvider(config, credentialsPath, effectiveBaseURL, options);
  let extraHeaders = {};
  if (config.workspace_id && config.authentication.type === "user_oauth")
    extraHeaders["anthropic-workspace-id"] = config.workspace_id;
  return {
    provider,
    extraHeaders,
    baseURL: config.base_url || undefined,
  };
}
//@ chunk-3wydcdvj.js:12040-12266 esm-fingerprint
async function defaultCredentials(options, profile) {
  let loaded = await loadConfigWithSource(profile);
  if (!loaded) return null;
  let { config, fromFile } = loaded;
  let withPath =
    config.authentication.credentials_path || !fromFile
      ? config
      : {
          ...config,
          authentication: {
            ...config.authentication,
            credentials_path: (await getRootConfigPath(config, profile)) ?? undefined,
          },
        };
  return resolveCredentialsFromConfig(withPath, options);
}
//@ chunk-3wydcdvj.js:12266-13631 esm-fingerprint
function buildProvider(config, credentialsPath, baseURL, options) {
  switch (config.authentication.type) {
    case "oidc_federation": {
      let auth = config.authentication;
      let identityProvider = resolveIdentityTokenProvider(auth);
      if (!identityProvider)
        throw new WorkloadIdentityError(
          "oidc_federation config requires an identity token (set authentication.identity_token, ANTHROPIC_IDENTITY_TOKEN_FILE, or ANTHROPIC_IDENTITY_TOKEN)",
        );
      if (!auth.federation_rule_id)
        throw new WorkloadIdentityError(
          "oidc_federation config requires 'federation_rule_id'. Set it in authentication.federation_rule_id in your profile, or via ANTHROPIC_FEDERATION_RULE_ID (profile takes precedence).",
        );
      if (!config.organization_id)
        throw new WorkloadIdentityError(
          "oidc_federation config requires organization_id (set ANTHROPIC_ORGANIZATION_ID or config.organization_id)",
        );
      let exchange = oidcFederationProvider({
        identityTokenProvider: identityProvider,
        federationRuleId: auth.federation_rule_id,
        organizationId: config.organization_id,
        serviceAccountId: auth.service_account_id,
        workspaceId: config.workspace_id,
        baseURL,
        fetch: options.fetch,
        userAgent: options.userAgent,
      });
      if (credentialsPath)
        return cachedExchangeProvider(
          exchange,
          credentialsPath,
          options.onCacheWriteError,
          options.onSafetyWarning,
        );
      return exchange;
    }
    case "user_oauth": {
      if (!credentialsPath)
        throw new WorkloadIdentityError(
          "user_oauth config requires authentication.credentials_path (or load via a profile so it defaults to <config_dir>/credentials/<profile>.json)",
        );
      return userOAuthProvider({
        credentialsPath,
        clientId: config.authentication.client_id,
        baseURL,
        fetch: options.fetch,
        userAgent: options.userAgent,
        onSafetyWarning: options.onSafetyWarning,
      });
    }
    default: {
      let t = config.authentication.type;
      throw new WorkloadIdentityError(`authentication.type "${t}" is not a known authentication type`);
    }
  }
}
//@ chunk-3wydcdvj.js:13631-14061 esm-fingerprint
function resolveIdentityTokenProvider(auth) {
  if (auth.identity_token) {
    let source = auth.identity_token.source;
    if (source !== "file")
      throw new WorkloadIdentityError(
        `identity_token.source "${source}" is not supported by this SDK version (only "file")`,
      );
    if (!auth.identity_token.path)
      throw new WorkloadIdentityError('identity_token.source "file" requires a non-empty path');
    return identityTokenFromFile(auth.identity_token.path);
  }
  let tokenFile = readEnv("ANTHROPIC_IDENTITY_TOKEN_FILE");
  if (tokenFile) return identityTokenFromFile(tokenFile);
  let tokenValue = readEnv("ANTHROPIC_IDENTITY_TOKEN");
  if (tokenValue) return identityTokenFromValue(tokenValue);
  return null;
}
//@ chunk-3wydcdvj.js:14061-14566 esm-fingerprint
function cachedExchangeProvider(exchange, credentialsPath, onCacheWriteError, onSafetyWarning) {
  return async (opts) => {
    let { fs } = await import("../../../../../src/child_process.lazy.js");
    await checkCredentialsFileSafety(credentialsPath, onSafetyWarning);
    let existing;
    try {
      let raw = await fs.promises.readFile(credentialsPath, "utf-8");
      existing = JSON.parse(raw);
      let token = existing?.access_token;
      if (token && !opts?.forceRefresh) {
        let expiresAt = existing?.expires_at;
        if (expiresAt == null || nowSeconds() < expiresAt - MAX_FEDERATION_TOKEN_TTL_SECONDS)
          return {
            token,
            expiresAt: expiresAt ?? null,
          };
      }
    } catch (err) {
      if (err?.code !== "ENOENT" && !(err instanceof SyntaxError)) onCacheWriteError?.(err);
    }
    let result = await exchange(opts);
    try {
      await writeCredentialsFileAtomic(credentialsPath, {
        ...(existing ?? {}),
        version: CREDENTIALS_FILE_VERSION,
        type: "oauth_token",
        access_token: result.token,
        expires_at: result.expiresAt,
      });
    } catch (err) {
      onCacheWriteError?.(err);
    }
    return result;
  };
}
export { resolveCredentialsFromConfig, defaultCredentials };
