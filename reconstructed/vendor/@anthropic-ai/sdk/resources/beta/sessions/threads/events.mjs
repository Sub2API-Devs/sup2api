/**
 * @anthropic-ai/sdk/resources/beta/sessions/threads/events.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { ee } from "../../../../core/pagination.mjs";
import { T } from "../../../../internal/headers.mjs";

//@ chunk-hwmsct5x.js:132169-132793 esm-fingerprint
class mo extends Y {
  list(e, n, r) {
    let { session_id: session_id, betas: betas, workspace_id: workspace_id, ...w } = n;
    return this._client.getAPIList(I`/v1/sessions/${session_id}/threads/${e}/events?beta=true`, ee, {
      query: w,
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
  stream(e, n, r) {
    let { session_id: session_id, betas: betas, workspace_id: workspace_id, ...w } = n;
    return this._client.get(I`/v1/sessions/${session_id}/threads/${e}/stream?beta=true`, {
      query: w,
      ...r,
      headers: T([
        {
          "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
          ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
        },
        r?.headers,
      ]),
      stream: !0,
    });
  }
}

export { mo };
