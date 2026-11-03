/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/service-accounts.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { T } from "../../../../internal/headers.mjs";
import { ee } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:127113-128319 esm-fingerprint
class po extends Y {
  retrieve(e, n, r) {
    let { workspace_id: workspace_id, betas: betas } = n;
    return this._client.get(I`/v1/organizations/workspaces/${workspace_id}/service_accounts/${e}?beta=true`, {
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
  update(e, n, r) {
    let { workspace_id: workspace_id, betas: betas, ...y } = n;
    return this._client.post(
      I`/v1/organizations/workspaces/${workspace_id}/service_accounts/${e}?beta=true`,
      {
        body: y,
        ...r,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          r?.headers,
        ]),
      },
    );
  }
  list(e, n = {}, r) {
    let { betas: betas, ...h } = n ?? {};
    return this._client.getAPIList(I`/v1/organizations/workspaces/${e}/service_accounts?beta=true`, ee, {
      query: h,
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
  add(e, n, r) {
    let { betas: betas, ...h } = n;
    return this._client.post(I`/v1/organizations/workspaces/${e}/service_accounts?beta=true`, {
      body: h,
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
  remove(e, n, r) {
    let { workspace_id: workspace_id, betas: betas } = n;
    return this._client.delete(
      I`/v1/organizations/workspaces/${workspace_id}/service_accounts/${e}?beta=true`,
      {
        ...r,
        headers: T([
          { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
          r?.headers,
        ]),
      },
    );
  }
}

export { po };
