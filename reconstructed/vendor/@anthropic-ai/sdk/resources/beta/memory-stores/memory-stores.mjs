/**
 * @anthropic-ai/sdk/resources/beta/memory-stores/memory-stores.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { Memories } from "./memories.mjs";
import { MemoryVersions } from "./memory-versions.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:86357-88120 esm-fingerprint
var MemoryStores = (() => {
  class MemoryStores extends APIResource {
    constructor() {
      super(...arguments);
      this.memories = new Memories(this._client);
      this.memoryVersions = new MemoryVersions(this._client);
    }
    create(params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post("/v1/memory_stores?beta=true", {
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
    retrieve(memoryStoreID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.get(parseUrl_2`/v1/memory_stores/${memoryStoreID}?beta=true`, {
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
    update(memoryStoreID, params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post(parseUrl_2`/v1/memory_stores/${memoryStoreID}?beta=true`, {
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
    list(params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList("/v1/memory_stores?beta=true", TokenPage, {
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
    delete(memoryStoreID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.delete(parseUrl_2`/v1/memory_stores/${memoryStoreID}?beta=true`, {
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
    archive(memoryStoreID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.post(parseUrl_2`/v1/memory_stores/${memoryStoreID}/archive?beta=true`, {
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
  }
  MemoryStores.Memories = Memories;
  MemoryStores.MemoryVersions = MemoryVersions;
  return MemoryStores;
})();
export { MemoryStores };
