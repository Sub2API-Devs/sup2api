/**
 * @anthropic-ai/sdk/resources/beta/dreams.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../core/resource.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { parseUrl_2 } from "../../internal/utils/path.mjs";
import { TokenPage } from "../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:48488-49769 esm-fingerprint
class Dreams extends APIResource {
  create(params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post("/v1/dreams?beta=true", {
      body,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
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
  retrieve(dreamID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.get(parseUrl_2`/v1/dreams/${dreamID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
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
    return this._client.getAPIList("/v1/dreams?beta=true", TokenPage, {
      query,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
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
  archive(dreamID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.post(parseUrl_2`/v1/dreams/${dreamID}/archive?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
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
  cancel(dreamID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.post(parseUrl_2`/v1/dreams/${dreamID}/cancel?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
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
export { Dreams };
