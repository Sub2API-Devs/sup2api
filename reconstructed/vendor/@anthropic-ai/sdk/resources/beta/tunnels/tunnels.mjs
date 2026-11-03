/**
 * @anthropic-ai/sdk/resources/beta/tunnels/tunnels.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../../core/resource.mjs";
import { _o } from "./certificates.mjs";
import { T } from "../../../internal/headers.mjs";
import { I } from "../../../internal/utils/path.mjs";
import { ee } from "../../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:139265-140967 esm-fingerprint
var ni = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      this.certificates = new _o(this._client);
    }
    create(n, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n;
      return this._client.post("/v1/tunnels?beta=true", {
        body: y,
        ...r,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          r?.headers,
        ]),
      });
    }
    retrieve(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.get(I`/v1/tunnels/${n}?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    list(n = {}, r) {
      let { betas: betas, workspace_id: workspace_id, ...y } = n ?? {};
      return this._client.getAPIList("/v1/tunnels?beta=true", ee, {
        query: y,
        ...r,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          r?.headers,
        ]),
      });
    }
    archive(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.post(I`/v1/tunnels/${n}/archive?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    revealToken(n, r = {}, s) {
      let { betas: betas, workspace_id: workspace_id } = r ?? {};
      return this._client.post(I`/v1/tunnels/${n}/reveal_token?beta=true`, {
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
    rotateToken(n, r, s) {
      let { betas: betas, workspace_id: workspace_id, ...w } = r;
      return this._client.post(I`/v1/tunnels/${n}/rotate_token?beta=true`, {
        body: w,
        ...s,
        headers: T([
          {
            "anthropic-beta": [...(betas ?? []), "mcp-tunnels-2026-06-22"].toString(),
            ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0),
          },
          s?.headers,
        ]),
      });
    }
  }
  return ((e.Certificates = _o), e);
})();

export { ni };
