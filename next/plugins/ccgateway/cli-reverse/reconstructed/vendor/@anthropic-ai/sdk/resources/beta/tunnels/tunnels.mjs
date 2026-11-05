/**
 * @anthropic-ai/sdk/resources/beta/tunnels/tunnels.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { Certificates } from "./certificates.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:139645-141347 esm-fingerprint
var Tunnels = (() => {
  class Tunnels extends APIResource {
    constructor() {
      super(...arguments);
      this.certificates = new Certificates(this._client);
    }
    create(params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post("/v1/tunnels?beta=true", {
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
    retrieve(tunnelID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.get(parseUrl_2`/v1/tunnels/${tunnelID}?beta=true`, {
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
    list(params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList("/v1/tunnels?beta=true", TokenPage, {
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
    archive(tunnelID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.post(parseUrl_2`/v1/tunnels/${tunnelID}/archive?beta=true`, {
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
    revealToken(tunnelID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.post(parseUrl_2`/v1/tunnels/${tunnelID}/reveal_token?beta=true`, {
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
    rotateToken(tunnelID, params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post(parseUrl_2`/v1/tunnels/${tunnelID}/rotate_token?beta=true`, {
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
  }
  Tunnels.Certificates = Certificates;
  return Tunnels;
})();
export { Tunnels };
