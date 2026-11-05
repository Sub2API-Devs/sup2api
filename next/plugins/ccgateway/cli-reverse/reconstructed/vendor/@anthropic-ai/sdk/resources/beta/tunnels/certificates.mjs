/**
 * @anthropic-ai/sdk/resources/beta/tunnels/certificates.mjs
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

//@ chunk-vn3g7zt8.js:138514-139645 esm-fingerprint
class Certificates extends APIResource {
  create(tunnelID, params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post(parseUrl_2`/v1/tunnels/${tunnelID}/certificates?beta=true`, {
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
    return this._client.get(parseUrl_2`/v1/tunnels/${tunnel_id}/certificates/${certificateID}?beta=true`, {
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
    return this._client.getAPIList(parseUrl_2`/v1/tunnels/${tunnelID}/certificates?beta=true`, TokenPage, {
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
    return this._client.post(
      parseUrl_2`/v1/tunnels/${tunnel_id}/certificates/${certificateID}/archive?beta=true`,
      {
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
      },
    );
  }
}
export { Certificates };
