/**
 * @anthropic-ai/sdk/resources/beta/memory-stores/memories.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:84262-85822 esm-fingerprint
class Memories extends APIResource {
  create(memoryStoreID, params, options) {
    let { view, betas, workspace_id, ...body } = params;
    return this._client.post(parseUrl_2`/v1/memory_stores/${memoryStoreID}/memories?beta=true`, {
      query: {
        view,
      },
      body,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
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
  retrieve(memoryID, params, options) {
    let { memory_store_id, betas, workspace_id, ...query } = params;
    return this._client.get(parseUrl_2`/v1/memory_stores/${memory_store_id}/memories/${memoryID}?beta=true`, {
      query,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
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
  update(memoryID, params, options) {
    let { memory_store_id, view, betas, workspace_id, ...body } = params;
    return this._client.post(
      parseUrl_2`/v1/memory_stores/${memory_store_id}/memories/${memoryID}?beta=true`,
      {
        query: {
          view,
        },
        body,
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  list(memoryStoreID, params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList(
      parseUrl_2`/v1/memory_stores/${memoryStoreID}/memories?beta=true`,
      TokenPage,
      {
        query,
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
  delete(memoryID, params, options) {
    let { memory_store_id, expected_content_sha256, betas, workspace_id } = params;
    return this._client.delete(
      parseUrl_2`/v1/memory_stores/${memory_store_id}/memories/${memoryID}?beta=true`,
      {
        query: {
          expected_content_sha256,
        },
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null
              ? {
                  "anthropic-workspace-id": workspace_id,
                }
              : undefined),
          },
          options?.headers,
        ]),
      },
    );
  }
}
export { Memories };
