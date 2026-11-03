/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/members.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { Be } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:126331-126969 esm-fingerprint
class co extends Y {
  retrieve(e, n, r) {
    let { workspace_id: workspace_id } = n;
    return this._client.get(I`/v1/organizations/workspaces/${workspace_id}/members/${e}?beta=true`, r);
  }
  update(e, n, r) {
    let { workspace_id: workspace_id, ...h } = n;
    return this._client.post(I`/v1/organizations/workspaces/${workspace_id}/members/${e}?beta=true`, {
      body: h,
      ...r,
    });
  }
  list(e, n = {}, r) {
    return this._client.getAPIList(I`/v1/organizations/workspaces/${e}/members?beta=true`, Be, {
      query: n,
      ...r,
    });
  }
  add(e, n, r) {
    return this._client.post(I`/v1/organizations/workspaces/${e}/members?beta=true`, { body: n, ...r });
  }
  remove(e, n, r) {
    let { workspace_id: workspace_id } = n;
    return this._client.delete(I`/v1/organizations/workspaces/${workspace_id}/members/${e}?beta=true`, r);
  }
}

export { co };
