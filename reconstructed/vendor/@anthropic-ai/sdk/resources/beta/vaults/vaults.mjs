/**
 * @anthropic-ai/sdk/resources/beta/vaults/vaults.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { Credentials } from "./credentials.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:142965-144643 esm-fingerprint
var Vaults = (() => {
  class Vaults extends APIResource {
    constructor() {
      super(...arguments);
      this.credentials = new Credentials(this._client);
    }
    create(params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post("/v1/vaults?beta=true", {
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
    retrieve(vaultID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.get(parseUrl_2`/v1/vaults/${vaultID}?beta=true`, {
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
    update(vaultID, params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post(parseUrl_2`/v1/vaults/${vaultID}?beta=true`, {
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
    list(params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList("/v1/vaults?beta=true", TokenPage, {
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
    delete(vaultID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.delete(parseUrl_2`/v1/vaults/${vaultID}?beta=true`, {
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
    archive(vaultID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.post(parseUrl_2`/v1/vaults/${vaultID}/archive?beta=true`, {
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
  }
  Vaults.Credentials = Credentials;
  return Vaults;
})();
export { Vaults };
