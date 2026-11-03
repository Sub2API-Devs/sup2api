/**
 * @anthropic-ai/sdk/resources/beta/deployment-runs.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { I } from "../../internal/utils/path.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { TokenPage } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:45437-45994 esm-fingerprint
class DeploymentRuns extends APIResource {
  retrieve(deploymentRunID, params = {}, options) {
    let { betas, workspace_id } = params ?? {};
    return this._client.get(I`/v1/deployment_runs/${deploymentRunID}?beta=true`, {
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
    return this._client.getAPIList("/v1/deployment_runs?beta=true", TokenPage, {
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
}
export { DeploymentRuns };
