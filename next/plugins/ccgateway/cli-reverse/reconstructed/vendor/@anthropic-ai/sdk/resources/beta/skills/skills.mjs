/**
 * @anthropic-ai/sdk/resources/beta/skills/skills.mjs
 * Reconstructed from the official Claude Code 2.1.318 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-vn3g7zt8.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../../core/resource.mjs";
import { Versions_2 } from "./versions.mjs";
import { withUploadBody } from "../../../internal/uploads.mjs";
import { buildHeaders } from "../../../internal/headers.mjs";
import { parseUrl_2 } from "../../../internal/utils/path.mjs";
import { TokenPage } from "../../../core/pagination.mjs";

//@ chunk-vn3g7zt8.js:137358-138514 esm-fingerprint
var Skills = (() => {
  class Skills extends APIResource {
    constructor() {
      super(...arguments);
      this.versions = new Versions_2(this._client);
    }
    create(params, options) {
      let { betas, workspace_id, ...body } = params;
      return this._client.post(
        "/v1/skills?beta=true",
        withUploadBody(
          {
            body,
            ...options,
            headers: buildHeaders([
              {
                ...(betas?.toString() != null
                  ? {
                      "anthropic-beta": betas?.toString(),
                    }
                  : undefined),
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
    retrieve(skillID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.get(parseUrl_2`/v1/skills/${skillID}?beta=true`, {
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
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
    list(params = {}, options) {
      let { betas, workspace_id, ...query } = params ?? {};
      return this._client.getAPIList("/v1/skills?beta=true", TokenPage, {
        query,
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
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
    delete(skillID, params = {}, options) {
      let { betas, workspace_id } = params ?? {};
      return this._client.delete(parseUrl_2`/v1/skills/${skillID}?beta=true`, {
        ...options,
        headers: buildHeaders([
          {
            ...(betas?.toString() != null
              ? {
                  "anthropic-beta": betas?.toString(),
                }
              : undefined),
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
  Skills.Versions = Versions_2;
  return Skills;
})();
export { Skills };
