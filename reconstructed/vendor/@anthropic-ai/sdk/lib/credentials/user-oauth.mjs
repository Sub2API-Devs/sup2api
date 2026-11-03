/**
 * @anthropic-ai/sdk/lib/credentials/user-oauth.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (1)
 * attribution: esm-fingerprint 1
 */
import { rMn, rp, hMt, Jao, REFRESH_TOKEN, Xao, OAUTH_2025_04_20, _he, Qao, v8e } from "./types.mjs";
import { y } from "./token-cache.mjs";
import { Cx } from "../../version.mjs";
import { gAn } from "../../core/credentials.mjs";

//@ chunk-3wydcdvj.js:10007-11752 esm-fingerprint
function z(e) {
  return async (n) => {
    let { fs: fs } = await import("./chunk-a60jm9e8.js");
    await rMn(e.credentialsPath, e.onSafetyWarning);
    let s;
    try {
      s = await fs.promises.readFile(e.credentialsPath, "utf-8");
    } catch (error) {
      throw new rp(`Credentials file not found at ${e.credentialsPath}: ${error}`);
    }
    let o;
    try {
      o = JSON.parse(s);
    } catch (error) {
      throw new rp(`Credentials file at ${e.credentialsPath} is not valid JSON: ${error}`);
    }
    let access_token = o.access_token;
    if (!access_token) throw new rp(`Credentials file at ${e.credentialsPath} must include 'access_token'`);
    let expires_at = o.expires_at;
    if (!n?.forceRefresh && (expires_at == null || y() < expires_at - hMt))
      return { token: access_token, expiresAt: expires_at ?? null };
    let refresh_token = o.refresh_token;
    if (!e.clientId || !refresh_token)
      throw new rp(
        `Access token at ${e.credentialsPath} has expired and no refresh is available (client_id ${e.clientId ? "set" : "empty"}, refresh_token ${refresh_token ? "set" : "empty"})`,
      );
    Jao(e.baseURL);
    let _ = { grant_type: REFRESH_TOKEN, refresh_token: refresh_token, client_id: e.clientId },
      p = `${e.baseURL}${Xao}`,
      w;
    try {
      w = await e.fetch(p, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-beta": OAUTH_2025_04_20,
          "User-Agent": e.userAgent || `anthropic-sdk-typescript/${Cx} userOAuthProvider`,
        },
        body: JSON.stringify(_),
      });
    } catch (error) {
      throw new rp(`User OAuth refresh failed to reach token endpoint: ${error}`);
    }
    let E = w.headers.get("Request-Id");
    if (!w.ok) {
      let R = await w.text().catch(() => "");
      throw new rp(`User OAuth refresh failed (HTTP ${w.status}): ${_he(R)}`, w.status, _he(R), E);
    }
    let k = await Qao(w, E),
      T = Number(k.expires_in);
    if (!Number.isFinite(T))
      throw new rp(
        `User OAuth refresh response missing or invalid expires_in: ${JSON.stringify(_he(k))}`,
        w.status,
        _he(k),
        E,
      );
    let D = y() + T,
      ee = k.refresh_token || refresh_token;
    return (
      await v8e(e.credentialsPath, {
        ...o,
        version: gAn,
        type: "oauth_token",
        access_token: k.access_token,
        expires_at: D,
        refresh_token: ee,
      }),
      { token: k.access_token, expiresAt: D }
    );
  };
}

export { z };
