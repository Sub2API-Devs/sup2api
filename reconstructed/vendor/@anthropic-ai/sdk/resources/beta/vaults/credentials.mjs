/**
 * @anthropic-ai/sdk/resources/beta/vaults/credentials.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { T } from "../../../internal/headers.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:140967-142965 esm-fingerprint
class bo extends Y {
  create(e, n, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n;
    return this._client.post(I`/v1/vaults/${e}/credentials?beta=true`, {
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
  retrieve(e, n, r) {
    let { vault_id: vault_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.get(I`/v1/vaults/${vault_id}/credentials/${e}?beta=true`, {
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
    let { vault_id: vault_id, betas: betas, workspace_id: workspace_id, ...w } = n;
    return this._client.post(I`/v1/vaults/${vault_id}/credentials/${e}?beta=true`, {
      body: w,
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
  list(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
    return this._client.getAPIList(I`/v1/vaults/${e}/credentials?beta=true`, ee, {
      query: y,
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
  delete(e, n, r) {
    let { vault_id: vault_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.delete(I`/v1/vaults/${vault_id}/credentials/${e}?beta=true`, {
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
  archive(e, n, r) {
    let { vault_id: vault_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.post(I`/v1/vaults/${vault_id}/credentials/${e}/archive?beta=true`, {
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
  mcpOAuthValidate(e, n, r) {
    let { vault_id: vault_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.post(I`/v1/vaults/${vault_id}/credentials/${e}/mcp_oauth_validate?beta=true`, {
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

export { bo };
