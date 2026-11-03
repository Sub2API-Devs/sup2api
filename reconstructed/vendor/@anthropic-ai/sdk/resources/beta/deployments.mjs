/**
 * @anthropic-ai/sdk/resources/beta/deployments.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { T } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { ee } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:45994-48117 esm-fingerprint
class _r extends Y {
  create(e, n) {
    let { betas: betas, workspace_id: workspace_id, ...h } = e;
    return this._client.post("/v1/deployments?beta=true", {
      body: h,
      ...n,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  retrieve(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/deployments/${e}?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  update(e, n, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n;
    return this._client.post(I`/v1/deployments/${e}?beta=true`, {
      body: y,
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  list(e = {}, n) {
    let { betas: betas, workspace_id: workspace_id, ...h } = e ?? {};
    return this._client.getAPIList("/v1/deployments?beta=true", ee, {
      query: h,
      ...n,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        n?.headers,
      ]),
    });
  }
  archive(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/deployments/${e}/archive?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  pause(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/deployments/${e}/pause?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  run(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/deployments/${e}/run?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  unpause(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.post(I`/v1/deployments/${e}/unpause?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
}

export { _r };
