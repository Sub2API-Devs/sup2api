/**
 * @anthropic-ai/sdk/resources/beta/memory-stores/memory-versions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { T } from "../../../internal/headers.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:85442-86357 esm-fingerprint
class Wr extends Y {
  retrieve(e, n, r) {
    let { memory_store_id: memory_store_id, betas: betas, workspace_id: workspace_id, ...w } = n;
    return this._client.get(I`/v1/memory_stores/${memory_store_id}/memory_versions/${e}?beta=true`, {
      query: w,
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  list(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
    return this._client.getAPIList(I`/v1/memory_stores/${e}/memory_versions?beta=true`, ee, {
      query: y,
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  redact(e, n, r) {
    let { memory_store_id: memory_store_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.post(I`/v1/memory_stores/${memory_store_id}/memory_versions/${e}/redact?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
}

export { Wr };
