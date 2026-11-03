/**
 * @anthropic-ai/sdk/resources/beta/tunnels/certificates.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:138134-139265 esm-fingerprint
class Certificates extends APIResource {
  create(tunnelID, params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post(I`/v1/tunnels/${tunnelID}/certificates?beta=true`, {
      body,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
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
  retrieve(certificateID, params, options) {
    let { tunnel_id, betas, workspace_id } = params;
    return this._client.get(I`/v1/tunnels/${tunnel_id}/certificates/${certificateID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
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
  list(tunnelID, params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList(I`/v1/tunnels/${tunnelID}/certificates?beta=true`, TokenPage, {
      query,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
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
  archive(certificateID, params, options) {
    let { tunnel_id, betas, workspace_id } = params;
    return this._client.post(I`/v1/tunnels/${tunnel_id}/certificates/${certificateID}/archive?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
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
export { Certificates };
