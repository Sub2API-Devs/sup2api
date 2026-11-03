/**
 * @anthropic-ai/sdk/resources/beta/deployments.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { TokenPage } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:45994-48117 esm-fingerprint
class Deployments extends APIResource {
  create(params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post("/v1/deployments?beta=true", {
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
  retrieve(deploymentID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.get(I`/v1/deployments/${deploymentID}?beta=true`, {
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
  update(deploymentID, params, options) {
    let { betas, workspace_id, ...body } = params;
    return this._client.post(I`/v1/deployments/${deploymentID}?beta=true`, {
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
    return this._client.getAPIList("/v1/deployments?beta=true", TokenPage, {
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
  archive(deploymentID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.post(I`/v1/deployments/${deploymentID}/archive?beta=true`, {
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
  pause(deploymentID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.post(I`/v1/deployments/${deploymentID}/pause?beta=true`, {
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
  run(deploymentID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.post(I`/v1/deployments/${deploymentID}/run?beta=true`, {
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
  unpause(deploymentID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.post(I`/v1/deployments/${deploymentID}/unpause?beta=true`, {
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
export { Deployments };
