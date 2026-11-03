/**
 * @anthropic-ai/sdk/resources/beta/memory-stores/memory-stores.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { qr } from "./memories.mjs";
import { Wr } from "./memory-versions.mjs";
import { T } from "../../../internal/headers.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:86357-88120 esm-fingerprint
var Os = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      ((this.memories = new qr(this._client)), (this.memoryVersions = new Wr(this._client)));
    }
    create(n, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n;
      return this._client.post("/v1/memory_stores?beta=true", {
        body: y,
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
    retrieve(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.get(I`/v1/memory_stores/${n}?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    update(n, r, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r;
      return this._client.post(I`/v1/memory_stores/${n}?beta=true`, {
        body: w,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    list(n = {}, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
      return this._client.getAPIList("/v1/memory_stores?beta=true", ee, {
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
    delete(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.delete(I`/v1/memory_stores/${n}?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    archive(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.post(I`/v1/memory_stores/${n}/archive?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "agent-memory-2026-07-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
  }
  return ((e.Memories = qr), (e.MemoryVersions = Wr), e);
})();

export { Os };
