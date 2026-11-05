/**
 * @anthropic-ai/sdk/resources/beta/organization/workspaces/members.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../../core/resource.mjs";
import { parseUrl_2 } from "../../../../internal/utils/path.mjs";
import { Page } from "../../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:126711-127349 esm-fingerprint
class Members extends APIResource {
  retrieve(userID, params, options) {
    let { workspace_id } = params;
    return this._client.get(
      parseUrl_2`/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`,
      options,
    );
  }
  update(userID, params, options) {
    let { workspace_id, ...body } = params;
    return this._client.post(
      parseUrl_2`/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`,
      {
        body,
        ...options,
      },
    );
  }
  list(workspaceID, query = {}, options) {
    return this._client.getAPIList(
      parseUrl_2`/v1/organizations/workspaces/${workspaceID}/members?beta=true`,
      Page,
      {
        query,
        ...options,
      },
    );
  }
  add(workspaceID, body, options) {
    return this._client.post(parseUrl_2`/v1/organizations/workspaces/${workspaceID}/members?beta=true`, {
      body,
      ...options,
    });
  }
  remove(userID, params, options) {
    let { workspace_id } = params;
    return this._client.delete(
      parseUrl_2`/v1/organizations/workspaces/${workspace_id}/members/${userID}?beta=true`,
      options,
    );
  }
}
export { Members };
