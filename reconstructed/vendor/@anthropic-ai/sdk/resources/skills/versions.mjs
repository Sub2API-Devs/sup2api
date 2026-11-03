/**
 * @anthropic-ai/sdk/resources/skills/versions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { Y } from "../../core/resource.mjs";
import { I } from "../../internal/utils/path.mjs";
import { ut } from "../../internal/uploads.mjs";
import { T } from "../../internal/headers.mjs";
import { ee } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:160503-161297 esm-fingerprint
class ko extends Y {
  create(e, n, r) {
    let { workspace_id: workspace_id, ...h } = n;
    return this._client.post(
      I`/v1/skills/${e}/versions`,
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
  retrieve(e, n, r) {
    let { skill_id: skill_id, workspace_id: workspace_id } = n;
    return this._client.get(I`/v1/skills/${skill_id}/versions/${e}`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  list(e, n = {}, r) {
    let { workspace_id: workspace_id, ...h } = n ?? {};
    return this._client.getAPIList(I`/v1/skills/${e}/versions`, ee, {
      query: h,
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
  delete(e, n, r) {
    let { skill_id: skill_id, workspace_id: workspace_id } = n;
    return this._client.delete(I`/v1/skills/${skill_id}/versions/${e}`, {
      ...r,
      headers: T([
        { ...(workspace_id != null ? { "anthropic-workspace-id": workspace_id } : void 0) },
        r?.headers,
      ]),
    });
  }
}

export { ko };
