/**
 * @anthropic-ai/sdk/resources/beta/agents/agents.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { Or } from "./versions.mjs";
import { T } from "../../../internal/headers.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:53975-55405 esm-fingerprint
var ds = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      this.versions = new Or(this._client);
    }
    create(n, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n;
      return this._client.post("/v1/agents?beta=true", {
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
      let { betas: betas, workspace_id: workspace_id, ...w } = r ?? {};
      return this._client.get(I`/v1/agents/${n}?beta=true`, {
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
    update(n, r, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r;
      return this._client.post(I`/v1/agents/${n}?beta=true`, {
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
      return this._client.getAPIList("/v1/agents?beta=true", ee, {
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
    archive(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.post(I`/v1/agents/${n}/archive?beta=true`, {
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
  return ((e.Versions = Or), e);
})();

export { ds };
