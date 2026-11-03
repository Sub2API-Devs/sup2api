/**
 * @anthropic-ai/sdk/resources/beta/sessions/threads/threads.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../../core/resource.mjs";
import { mo } from "./events.mjs";
import { I } from "../../../../internal/utils/path.mjs";
import { T } from "../../../../internal/headers.mjs";
import { ee } from "../../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:132793-133758 esm-fingerprint
var Qs = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      this.events = new mo(this._client);
    }
    retrieve(n, r, s) {
      let { session_id: session_id, betas: betas, workspace_id: workspace_id } = r;
      return this._client.get(I`/v1/sessions/${session_id}/threads/${n}?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    list(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r ?? {};
      return this._client.getAPIList(I`/v1/sessions/${n}/threads?beta=true`, ee, {
        query: w,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    archive(n, r, s) {
      let { session_id: session_id, betas: betas, workspace_id: workspace_id } = r;
      return this._client.post(I`/v1/sessions/${session_id}/threads/${n}/archive?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
  }
  return ((e.Events = mo), e);
})();

export { Qs };
