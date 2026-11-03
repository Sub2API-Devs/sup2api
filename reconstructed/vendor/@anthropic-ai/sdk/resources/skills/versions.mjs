/**
 * @anthropic-ai/sdk/resources/skills/versions.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { I } from "../../internal/utils/path.mjs";
import { ut } from "../../internal/uploads.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { TokenPage } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:160503-161297 esm-fingerprint
class Versions_3 extends APIResource {
  create(skillID, params, options) {
    let { workspace_id, ...body } = params;
    return this._client.post(
      I`/v1/skills/${skillID}/versions`,
      ut(
        {
          body,
          ...options,
          headers: buildHeaders([
            {
              ...(workspace_id != null
                ? {
                    "anthropic-workspace-id": workspace_id,
                  }
                : undefined),
            },
            options?.headers,
          ]),
        },
        this._client,
        false,
      ),
    );
  }
  retrieve(version, params, options) {
    let { skill_id, workspace_id } = params;
    return this._client.get(I`/v1/skills/${skill_id}/versions/${version}`, {
      ...options,
      headers: buildHeaders([
        {
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
  list(skillID, params = {}, options) {
    let { workspace_id, ...query } = params ?? {};
    return this._client.getAPIList(I`/v1/skills/${skillID}/versions`, TokenPage, {
      query,
      ...options,
      headers: buildHeaders([
        {
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
  delete(version, params, options) {
    let { skill_id, workspace_id } = params;
    return this._client.delete(I`/v1/skills/${skill_id}/versions/${version}`, {
      ...options,
      headers: buildHeaders([
        {
          ...(workspace_id != null
            ? {
                "anthropic-workspace-id": workspace_id,
              }
            : undefined),
        },
        options?.headers,
      ]),
    });
  }
}
export { Versions_3 };
