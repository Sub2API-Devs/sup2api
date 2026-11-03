/**
 * @anthropic-ai/sdk/resources/beta/sessions/events.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { ee } from "../../../core/pagination.mjs";
import { T } from "../../../internal/headers.mjs";
import { Br } from "../../../lib/tools/SessionToolRunner.mjs";

//@ chunk-hwmsct5x.js:129788-130754 esm-fingerprint
var Xs = (() => {
  class e extends Y {
    list(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r ?? {};
      return this._client.getAPIList(I`/v1/sessions/${n}/events?beta=true`, ee, {
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
    send(n, r, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r;
      return this._client.post(I`/v1/sessions/${n}/events?beta=true`, {
        body: w,
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
    stream(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r ?? {};
      return this._client.get(I`/v1/sessions/${n}/events/stream?beta=true`, {
        query: w,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "managed-agents-2026-04-01"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
        stream: !0,
      });
    }
    toolRunner(n, r) {
      return new Br(n, { ...r, client: this._client });
    }
  }
  return ((e.SessionToolRunner = Br), e);
})();

export { Xs };
