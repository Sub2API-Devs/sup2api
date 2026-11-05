/**
 * @anthropic-ai/sdk/resources/beta/memory-stores/memory-versions.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 * (c) Anthropic PBC. All rights reserved. Use is subject to the Legal Agreements outlined here: https://code.claude.com/docs/en/legal-and-compliance.
 */
import { APIResource } from "../../../core/resource.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:85822-86737 esm-fingerprint
class MemoryVersions extends APIResource {
  retrieve(memoryVersionID, params, options) {
    let { memory_store_id, betas, workspace_id, ...query } = params;
    return this._client.get(
      parseUrl_2`/v1/memory_stores/${memory_store_id}/memory_versions/${memoryVersionID}?beta=true`,
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
  list(memoryStoreID, params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList(
      parseUrl_2`/v1/memory_stores/${memoryStoreID}/memory_versions?beta=true`,
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
  redact(memoryVersionID, params, options) {
    let { memory_store_id, betas, workspace_id } = params;
    return this._client.post(
      parseUrl_2`/v1/memory_stores/${memory_store_id}/memory_versions/${memoryVersionID}/redact?beta=true`,
      {
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
export { MemoryVersions };
