/**
 * @anthropic-ai/sdk/resources/models.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../core/resource.mjs";
import { I } from "../internal/utils/path.mjs";
import { buildHeaders } from "../internal/headers.mjs";
import { Page } from "../core/pagination.mjs";

//@ chunk-hwmsct5x.js:159992-160503 esm-fingerprint
class Models_2 extends APIResource {
  retrieve(modelID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.get(I`/v1/models/${modelID}`, {
      ...options,
      headers: buildHeaders([
        {
          ...(betas?.toString() != null
            ? {
                "anthropic-beta": betas?.toString(),
              }
            : undefined),
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
  list(params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList("/v1/models", Page, {
      query,
      ...options,
      headers: buildHeaders([
        {
          ...(betas?.toString() != null
            ? {
                "anthropic-beta": betas?.toString(),
              }
            : undefined),
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
}
export { Models_2 };
