/**
 * @anthropic-ai/sdk/resources/skills/skills.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { ko } from "./versions.mjs";
import { ut } from "../../internal/uploads.mjs";
import { T } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { ee } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:161297-162129 esm-fingerprint
var xo = (() => {
  class e extends Y {
    constructor() {
      super(...arguments);
      this.versions = new ko(this._client);
    }
    create(n, r) {
      let { workspace_id: workspace_id, ...h } = n;
      return this._client.post(
        "/v1/skills",
        ut(
          {
            body: h,
            ...r,
            headers: T([
              { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
              r?.headers,
            ]),
          },
          this._client,
          !1,
        ),
      );
    }
    retrieve(n, r = {}, s) {
      let { workspace_id: workspace_id } = r ?? {};
      return this._client.get(I`/v1/skills/${n}`, {
        ...s,
        headers: T([
          { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
          s?.headers,
        ]),
      });
    }
    list(n = {}, r) {
      let { workspace_id: workspace_id, ...h } = n ?? {};
      return this._client.getAPIList("/v1/skills", ee, {
        query: h,
        ...r,
        headers: T([
          { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
          r?.headers,
        ]),
      });
    }
    delete(n, r = {}, s) {
      let { workspace_id: workspace_id } = r ?? {};
      return this._client.delete(I`/v1/skills/${n}`, {
        ...s,
        headers: T([
          { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
          s?.headers,
        ]),
      });
    }
  }
  return ((e.Versions = ko), e);
})();

export { xo };
