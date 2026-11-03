/**
 * @anthropic-ai/sdk/resources/beta/dreams.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { T } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { ee } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:48117-49398 esm-fingerprint
class br extends Y {
  create(e, n) {
    let { betas: betas, workspace_id: workspace_id, ...h } = e;
    return this._client.post("/v1/dreams?beta=true", {
      body: h,
      ...n,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  retrieve(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/dreams/${e}?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  list(e = {}, n) {
    let { betas: betas, workspace_id: workspace_id, ...h } = e ?? {};
    return this._client.getAPIList("/v1/dreams?beta=true", ee, {
      query: h,
      ...n,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  archive(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/dreams/${e}/archive?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  cancel(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/dreams/${e}/cancel?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "dreaming-2026-04-21"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
}

export { br };
