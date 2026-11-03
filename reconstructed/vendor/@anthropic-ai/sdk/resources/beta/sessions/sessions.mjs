/**
 * @anthropic-ai/sdk/resources/beta/sessions/sessions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { Xs } from "./events.mjs";
import { ho } from "./resources.mjs";
import { Qs } from "./threads/threads.mjs";
import { T } from "../../../internal/headers.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { Qi } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:133758-135536 esm-fingerprint
var Zs = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      ((this.events = new Xs(this._client)),
        (this.resources = new ho(this._client)),
        (this.threads = new Qs(this._client)));
    }
    create(n, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n;
      return this._client.post("/v1/sessions?beta=true", {
        body: y,
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
    retrieve(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.get(I`/v1/sessions/${n}?beta=true`, {
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
    update(n, r, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r;
      return this._client.post(I`/v1/sessions/${n}?beta=true`, {
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
    list(n = {}, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
      return this._client.getAPIList("/v1/sessions?beta=true", Qi, {
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
    delete(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.delete(I`/v1/sessions/${n}?beta=true`, {
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
    archive(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.post(I`/v1/sessions/${n}/archive?beta=true`, {
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
  return ((e.Events = Xs), (e.Resources = ho), (e.Threads = Qs), e);
})();

export { Zs };
