/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/members.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { Page } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:126331-126969 esm-fingerprint
class Members extends APIResource {
  retrieve(userID, params, options) {
    let { workspace_id } = params;
    return this._client.get(
      I`/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`,
      options,
    );
  }
  update(userID, params, options) {
    let { workspace_id, ...body } = params;
    return this._client.post(I`/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`, {
      body,
      ...options,
    });
  }
  list(workspaceID, query = {}, options) {
    return this._client.getAPIList(I`/v1/organizations/workspaces/${workspaceID}/members?beta=true`, Page, {
      query,
      ...options,
    });
  }
  add(workspaceID, body, options) {
    return this._client.post(I`/v1/organizations/workspaces/${workspaceID}/members?beta=true`, {
      body,
      ...options,
    });
  }
  remove(userID, params, options) {
    let { workspace_id } = params;
    return this._client.delete(
      I`/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`,
      options,
    );
  }
}
export { Members };
