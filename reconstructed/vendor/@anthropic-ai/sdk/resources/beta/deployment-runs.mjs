/**
 * @anthropic-ai/sdk/resources/beta/deployment-runs.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { I } from "../../internal/utils/path.mjs";
import { T } from "../../internal/headers.mjs";
import { ee } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:45437-45994 esm-fingerprint
class hr extends Y {
  retrieve(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id } = n ?? {};
    return this._client.get(I`/v1/deployment_runs/${e}?beta=true`, {
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
    return this._client.getAPIList("/v1/deployment_runs?beta=true", ee, {
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
}

export { hr };
