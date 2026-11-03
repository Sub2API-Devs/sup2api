/**
 * @anthropic-ai/sdk/resources/beta/tunnels/certificates.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { T } from "../../../internal/headers.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:138134-139265 esm-fingerprint
class _o extends Y {
  create(e, n, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n;
    return this._client.post(I`/v1/tunnels/${e}/certificates?beta=true`, {
      body: y,
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  retrieve(e, n, r) {
    let { tunnel_id: tunnel_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.get(I`/v1/tunnels/${tunnel_id}/certificates/${e}?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  list(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
    return this._client.getAPIList(I`/v1/tunnels/${e}/certificates?beta=true`, ee, {
      query: y,
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
  archive(e, n, r) {
    let { tunnel_id: tunnel_id, betas: betas, workspace_id: workspace_id } = n;
    return this._client.post(I`/v1/tunnels/${tunnel_id}/certificates/${e}/archive?beta=true`, {
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
    });
  }
}

export { _o };
