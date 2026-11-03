/**
 * @anthropic-ai/sdk/resources/skills/skills.mjs
 * Reconstructed from the official Claude Code 2.1.316 build (linux-x64).
 * third-party: @anthropic-ai/sdk@0.128.0
 * pieces: chunk-hwmsct5x.js (1)
 * attribution: esm-fingerprint 1
 */
import { APIResource } from "../../core/resource.mjs";
import { Versions_3 } from "./versions.mjs";
import { ut } from "../../internal/uploads.mjs";
import { buildHeaders } from "../../internal/headers.mjs";
import { I } from "../../internal/utils/path.mjs";
import { TokenPage } from "../../core/pagination.mjs";

//@ chunk-hwmsct5x.js:161297-162129 esm-fingerprint
var Skills_2 = (() => {
  class Skills extends APIResource {
    constructor() {
      super(...arguments);
      this.versions = new Versions_3(this._client);
    }
    create(params, options) {
      let { workspace_id, ...body } = params;
      return this._client.post(
        "/v1/skills",
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
    retrieve(skillID, params = {}, options) {
      let { workspace_id } = params ?? {};
      return this._client.get(I`/v1/skills/${skillID}`, {
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
    list(params = {}, options) {
      let { workspace_id, ...query } = params ?? {};
      return this._client.getAPIList("/v1/skills", TokenPage, {
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
    delete(skillID, params = {}, options) {
      let { workspace_id } = params ?? {};
      return this._client.delete(I`/v1/skills/${skillID}`, {
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
  Skills.Versions = Versions_3;
  return Skills;
})();
export { Skills_2 };
