/**
 * @anthropic-ai/sdk/lib/credentials/oidc-federation.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-3wydcdvj.js (1)
 * attribution: esm-fingerprint 1
 */
import { Jao, rp, aIi, Xao, OAUTH_2025_04_20, OIDC_FEDERATION_2026_04_01, _he, Qao } from "./types.mjs";
import { Cx } from "../../version.mjs";
import { y } from "./token-cache.mjs";

//@ chunk-3wydcdvj.js:8473-10007 esm-fingerprint
function j(e) {
  return async () => {
    Jao(e.baseURL);
    let identityTokenProvider = await e.identityTokenProvider();
    if (identityTokenProvider.length > 16384)
      throw new rp(
        `Identity token is ${Math.ceil(identityTokenProvider.length / 1024)} KiB, exceeds the 16 KiB assertion limit`,
      );
    let r = {
      grant_type: aIi,
      assertion: identityTokenProvider,
      federation_rule_id: e.federationRuleId,
      organization_id: e.organizationId,
    };
    if (e.serviceAccountId) r.service_account_id = e.serviceAccountId;
    if (e.workspaceId) r.workspace_id = e.workspaceId;
    let s = `${e.baseURL}${Xao}`,
      o;
    try {
      o = await e.fetch(s, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "anthropic-beta": `${OAUTH_2025_04_20},${OIDC_FEDERATION_2026_04_01}`,
          "User-Agent": e.userAgent || `anthropic-sdk-typescript/${Cx} oidcFederationProvider`,
        },
        body: JSON.stringify(r),
      });
    } catch (error) {
      throw new rp(`Failed to reach token endpoint ${s}: ${error}`);
    }
    let u = o.headers.get("Request-Id");
    if (!o.ok) {
      let _ = await o.text().catch(() => ""),
        p = _he(_),
        w = "";
      if (o.status === 401)
        w = ` Ensure your federation rule matches your identity token. ${e.workspaceId ? "" : "If your federation rule is scoped to multiple workspaces, set the ANTHROPIC_WORKSPACE_ID environment variable, the 'workspace_id' config key, or the `workspaceId` option. "}View your authentication events in the Workload identity page of Claude Console for more details.`;
      throw new rp(
        `Token exchange failed with status ${o.status}${u ? ` (request-id ${u})` : ""}: ${p}${w}`,
        o.status,
        p,
        u,
      );
    }
    let f = await Qao(o, u),
      h = Number(f.expires_in);
    if (!Number.isFinite(h))
      throw new rp(
        `Token endpoint response missing required fields: ${JSON.stringify(_he(f))}`,
        o.status,
        _he(f),
        u,
      );
    return { token: f.access_token, expiresAt: y() + h };
  };
}

export { j };
