/**
 * @anthropic-ai/sdk/lib/credentials/oidc-federation.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-gjbr82c9.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  requireSecureTokenEndpoint,
  WorkloadIdentityError,
  GRANT_TYPE_JWT_BEARER,
  TOKEN_ENDPOINT,
  OAUTH_API_BETA_HEADER,
  FEDERATION_BETA_HEADER,
  redactSensitive,
  parseTokenResponse,
} from "./types.mjs";
import { VERSION } from "../../version.mjs";
import { nowSeconds } from "./token-cache.mjs";

//@ chunk-gjbr82c9.js:8473-10007 esm-fingerprint
function oidcFederationProvider(config) {
  return async () => {
    requireSecureTokenEndpoint(config.baseURL);
    let jwt = await config.identityTokenProvider();
    if (jwt.length > 16384)
      throw new WorkloadIdentityError(
        `Identity token is ${Math.ceil(jwt.length / 1024)} KiB, exceeds the 16 KiB assertion limit`,
      );
    let body = {
      grant_type: GRANT_TYPE_JWT_BEARER,
      assertion: jwt,
      federation_rule_id: config.federationRuleId,
      organization_id: config.organizationId,
    };
    if (config.serviceAccountId) body.service_account_id = config.serviceAccountId;
    if (config.workspaceId) body.workspace_id = config.workspaceId;
    let url = `${config.baseURL}${TOKEN_ENDPOINT}`;
    let resp;
    try {
      resp = await config.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-beta": `${OAUTH_API_BETA_HEADER},${FEDERATION_BETA_HEADER}`,
          "User-Agent": config.userAgent || `anthropic-sdk-typescript/${VERSION} oidcFederationProvider`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new WorkloadIdentityError(`Failed to reach token endpoint ${url}: ${err}`);
    }
    let requestId = resp.headers.get("Request-Id");
    if (!resp.ok) {
      let text = await resp.text().catch(() => "");
      let redacted = redactSensitive(text);
      let hint = "";
      if (resp.status === 401)
        hint = ` Ensure your federation rule matches your identity token. ${config.workspaceId ? "" : "If your federation rule is scoped to multiple workspaces, set the ANTHROPIC_WORKSPACE_ID environment variable, the 'workspace_id' config key, or the `workspaceId` option. "}View your authentication events in the Workload identity page of Claude Console for more details.`;
      throw new WorkloadIdentityError(
        `Token exchange failed with status ${resp.status}${requestId ? ` (request-id ${requestId})` : ""}: ${redacted}${hint}`,
        resp.status,
        redacted,
        requestId,
      );
    }
    let data = await parseTokenResponse(resp, requestId);
    let expiresIn = Number(data.expires_in);
    if (!Number.isFinite(expiresIn))
      throw new WorkloadIdentityError(
        `Token endpoint response missing required fields: ${JSON.stringify(redactSensitive(data))}`,
        resp.status,
        redactSensitive(data),
        requestId,
      );
    return {
      token: data.access_token,
      expiresAt: nowSeconds() + expiresIn,
    };
  };
}
export { oidcFederationProvider };
