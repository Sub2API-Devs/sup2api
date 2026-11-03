/**
 * @anthropic-ai/sdk/resources/beta/organization/service-accounts/workspaces.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { ee } from "../../../../core/pagination.mjs";
import { T } from "../../../../internal/headers.mjs";

//@ chunk-hwmsct5x.js:124391-125120 esm-fingerprint
class uo extends Y {
  list(e, n = {}, r) {
    let { betas: betas, ...h } = n ?? {};
    return this._client.getAPIList(I`/v1/organizations/service_accounts/${e}/workspaces?beta=true`, ee, {
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
    return this._client.post(I`/v1/organizations/service_accounts/${e}/workspaces?beta=true`, {
      body: h,
      ...r,
      headers: T([
        { ...(betas?.toString() != null ? { "anthropic-beta": betas?.toString() } : void 0) },
        r?.headers,
      ]),
    });
  }
  remove(e, n, r) {
    let { service_account_id: service_account_id, betas: betas } = n;
    return this._client.delete(
      I`/v1/organizations/service_accounts/${service_account_id}/workspaces/${e}?beta=true`,
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

export { uo };
