/**
 * @anthropic-ai/sdk/resources/beta/agents/versions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { ee } from "../../../core/pagination.mjs";
import { T } from "../../../internal/headers.mjs";

//@ chunk-hwmsct5x.js:53673-53975 esm-fingerprint
class Or extends Y {
  list(e, n = {}, r) {
    let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
    return this._client.getAPIList(I`/v1/agents/${e}/versions?beta=true`, ee, {
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
}

export { Or };
