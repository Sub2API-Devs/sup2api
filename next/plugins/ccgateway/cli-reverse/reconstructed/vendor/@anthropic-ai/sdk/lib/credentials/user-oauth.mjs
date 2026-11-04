/**
 * @anthropic-ai/sdk/lib/credentials/user-oauth.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (1)
 * attribution: esm-fingerprint 1
 */
import {
  checkCredentialsFileSafety,
  WorkloadIdentityError,
  MAX_FEDERATION_TOKEN_TTL_SECONDS,
  requireSecureTokenEndpoint,
  GRANT_TYPE_REFRESH_TOKEN,
  TOKEN_ENDPOINT,
  OAUTH_API_BETA_HEADER,
  redactSensitive,
  parseTokenResponse,
  writeCredentialsFileAtomic,
} from "./types.mjs";
import { nowSeconds } from "./token-cache.mjs";
import { VERSION } from "../../version.mjs";
import { CREDENTIALS_FILE_VERSION } from "../../core/credentials.mjs";

//@ chunk-3wydcdvj.js:10007-11752 esm-fingerprint
function userOAuthProvider(config) {
  return async (opts) => {
    let { fs } = await import("../../../../../src/child_process.lazy.js");
    await checkCredentialsFileSafety(config.credentialsPath, config.onSafetyWarning);
    let raw;
    try {
      raw = await fs.promises.readFile(config.credentialsPath, "utf-8");
    } catch (err) {
      throw new WorkloadIdentityError(`Credentials file not found at ${config.credentialsPath}: ${err}`);
    }
    let creds;
    try {
      creds = JSON.parse(raw);
    } catch (err) {
      throw new WorkloadIdentityError(
        `Credentials file at ${config.credentialsPath} is not valid JSON: ${err}`,
      );
    }
    let accessToken = creds.access_token;
    if (!accessToken)
      throw new WorkloadIdentityError(
        `Credentials file at ${config.credentialsPath} must include 'access_token'`,
      );
    let expiresAt = creds.expires_at;
    if (
      !opts?.forceRefresh &&
      (expiresAt == null || nowSeconds() < expiresAt - MAX_FEDERATION_TOKEN_TTL_SECONDS)
    )
      return {
        token: accessToken,
        expiresAt: expiresAt ?? null,
      };
    let refreshToken = creds.refresh_token;
    if (!config.clientId || !refreshToken)
      throw new WorkloadIdentityError(
        `Access token at ${config.credentialsPath} has expired and no refresh is available (client_id ${config.clientId ? "set" : "empty"}, refresh_token ${refreshToken ? "set" : "empty"})`,
      );
    requireSecureTokenEndpoint(config.baseURL);
    let body = {
      grant_type: GRANT_TYPE_REFRESH_TOKEN,
      refresh_token: refreshToken,
      client_id: config.clientId,
    };
    let url = `${config.baseURL}${TOKEN_ENDPOINT}`;
    let resp;
    try {
      resp = await config.fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-beta": OAUTH_API_BETA_HEADER,
          "User-Agent": config.userAgent || `anthropic-sdk-typescript/${VERSION} userOAuthProvider`,
        },
        body: JSON.stringify(body),
      });
    } catch (err) {
      throw new WorkloadIdentityError(`User OAuth refresh failed to reach token endpoint: ${err}`);
    }
    let requestId = resp.headers.get("Request-Id");
    if (!resp.ok) {
      let text = await resp.text().catch(() => "");
      throw new WorkloadIdentityError(
        `User OAuth refresh failed (HTTP ${resp.status}): ${redactSensitive(text)}`,
        resp.status,
        redactSensitive(text),
        requestId,
      );
    }
    let data = await parseTokenResponse(resp, requestId);
    let expiresIn = Number(data.expires_in);
    if (!Number.isFinite(expiresIn))
      throw new WorkloadIdentityError(
        `User OAuth refresh response missing or invalid expires_in: ${JSON.stringify(redactSensitive(data))}`,
        resp.status,
        redactSensitive(data),
        requestId,
      );
    let newExpiresAt = nowSeconds() + expiresIn;
    let newRefreshToken = data.refresh_token || refreshToken;
    await writeCredentialsFileAtomic(config.credentialsPath, {
      ...creds,
      version: CREDENTIALS_FILE_VERSION,
      type: "oauth_token",
      access_token: data.access_token,
      expires_at: newExpiresAt,
      refresh_token: newRefreshToken,
    });
    return {
      token: data.access_token,
      expiresAt: newExpiresAt,
    };
  };
}
export { userOAuthProvider };
