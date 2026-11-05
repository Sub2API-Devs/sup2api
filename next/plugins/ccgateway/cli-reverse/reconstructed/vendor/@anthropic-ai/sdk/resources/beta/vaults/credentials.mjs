/**
 * @anthropic-ai/sdk/resources/beta/vaults/credentials.mjs
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

//@ chunk-vn3g7zt8.js:141347-143345 esm-fingerprint
class Credentials extends APIResource {
  create(vaultID, params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post(parseUrl_2`/v1/vaults/${vaultID}/credentials?beta=true`, {
      body,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
  retrieve(credentialID, params, options) {
    let { vault_id, betas, workspace_id } = params;
    return this._client.get(parseUrl_2`/v1/vaults/${vault_id}/credentials/${credentialID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
  update(credentialID, params, options) {
    let { vault_id, betas, workspace_id, ...body } = params;
    return this._client.post(parseUrl_2`/v1/vaults/${vault_id}/credentials/${credentialID}?beta=true`, {
      body,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
  list(vaultID, params = {}, options) {
    let { betas, workspace_id, ...query } = params ?? {};
    return this._client.getAPIList(parseUrl_2`/v1/vaults/${vaultID}/credentials?beta=true`, TokenPage, {
      query,
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
  delete(credentialID, params, options) {
    let { vault_id, betas, workspace_id } = params;
    return this._client.delete(parseUrl_2`/v1/vaults/${vault_id}/credentials/${credentialID}?beta=true`, {
      ...options,
      headers: buildHeaders([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
  archive(credentialID, params, options) {
    let { vault_id, betas, workspace_id } = params;
    return this._client.post(
      parseUrl_2`/v1/vaults/${vault_id}/credentials/${credentialID}/archive?beta=true`,
      {
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
  mcpOAuthValidate(credentialID, params, options) {
    let { vault_id, betas, workspace_id } = params;
    return this._client.post(
      parseUrl_2`/v1/vaults/${vault_id}/credentials/${credentialID}/mcp_oauth_validate?beta=true`,
      {
        ...options,
        headers: buildHeaders([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
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
export { Credentials };
